// vento-sul-shared/litoranea.js
// Orquestrador da Litorânea — port de:
//   ui/voice/inteligencia/RespostaEngine.kt
//   ui/screens/chat/LitoraneaViewModel.kt
//   ui/components/LitoraneaOverlay.kt
//
// Estratégia: a IA pesada (templates, queries) está na RPC `responder_intencao`
// do Supabase — fonte ÚNICA da verdade pras 3 versões web e o nativo.
// Aqui no JS apenas:
//   1) detecta intenção (intencao.js, espelha IntencaoDetector.kt)
//   2) chama a RPC com a intenção + estado/cidade
//   3) executa ação navegacional retornada
//   4) toca TTS no idioma corrente
//
// Quando ajustar prompts/templates: editar a RPC SQL — propaga sozinho.
// Quando adicionar nova intenção: editar IntencaoDetector.kt + intencao.js + a RPC.

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VSLitoranea = factory();
})(typeof self !== "undefined" ? self : this, function () {

  let _supabase = null, _intencao = null, _i18n = null, _praias = null, _ai = null;
  let _navHandler = null;     // function(acaoCodigo) — abre tela
  let _ttsEnabled = true;
  let _vezesAbriu = 0;        // pra saudação intro grande na 1ª vez
  let _historico = [];        // últimos turnos { role, content }

  function init({ supabase, intencao, i18n, praias = null, ai = null, onNavegar = null, tts = true } = {}) {
    _supabase = supabase;
    _intencao = intencao;
    _i18n = i18n;
    _praias = praias;
    _ai = ai;                  // VSLitoraneaAI (Edge Function)
    _navHandler = onNavegar;
    _ttsEnabled = tts;
    try {
      _vezesAbriu = parseInt(localStorage.getItem("vs_litoranea_aberto") || "0", 10);
    } catch {}
  }

  /**
   * Saudação contextual — espelha LitoraneaOverlay/ViewModel.
   * 1ª vez: intro longa com privacidade. Subsequentes: curta.
   */
  function saudacao() {
    _vezesAbriu++;
    try { localStorage.setItem("vs_litoranea_aberto", String(_vezesAbriu)); } catch {}
    return _vezesAbriu <= 1
      ? _i18n.tr("lit_saudacao_intro_grande")
      : _i18n.tr("lit_saudacao_curta");
  }

  /**
   * Recebe texto livre (digitado ou via STT) → resposta + ação.
   * Retorna: { texto, acao_navegar?, intencao }
   */
  async function processar(texto, { estado = null, cidade = null } = {}) {
    if (!texto || !texto.trim()) return null;

    // /ondetem <produto> — busca PRIVADA de onde tem o produto (mais barato). Não spamma ninguém.
    var _mOnde = texto.trim().match(/^\/?onde\s*tem\s+(.+)/i) || texto.trim().match(/^\/ondetem\s+(.+)/i);
    if (_mOnde) {
      var termo = _mOnde[1].replace(/[?!.]+$/, "").trim();
      var CFG = (window.VENTOSUL_CONFIG || {});
      var _u = CFG.SUPABASE_URL, _a = CFG.SUPABASE_ANON_JWT;
      try {
        var r = await fetch(_u + "/rest/v1/rpc/buscar_onde_tem", { method: "POST", headers: { apikey: _a, Authorization: "Bearer " + _a, "Content-Type": "application/json" }, body: JSON.stringify({ p_termo: termo, p_cidade: cidade || null }) });
        var rows = await r.json();
        if (Array.isArray(rows) && rows.length) {
          var linhas = rows.map(function (x) { return "\u2022 " + x.produto + " \u2014 R$ " + Number(x.preco_reais).toFixed(2).replace(".", ",") + " em " + x.onde; }).join("\n");
          return { texto: "\ud83d\udd0e Onde tem \"" + termo + "\" (do mais barato):\n" + linhas, intencao: { tipo: "ondetem" } };
        }
        return { texto: "Ainda n\u00e3o achei \"" + termo + "\" cadastrado por aqui \ud83d\ude45. Quando um comerciante colocar, aparece na hora pra ti. \ud83c\udf0a", intencao: { tipo: "ondetem" } };
      } catch (e) { return { texto: "Deu ruim na busca, tenta de novo.", intencao: { tipo: "ondetem" } }; }
    }

    // Alimenta o perfil de gostos em paralelo (não bloqueia a resposta).
    // É isto que personaliza o matching: a conversa vira sinal em user_gostos.
    _coletarGostos(texto, { cidade, estado });

    const intent = _intencao.detectar(texto, cidade);

    // Atalho local: sugerir_proximas + nenhum dado server → usar praias.js
    if (intent.tipo === "sugerir_proximas" && _praias && cidade) {
      const ps = await _praias.praiasDaCidade(cidade, estado, 5);
      if (ps.length) {
        const nomes = ps.map(p => p.nome).join(", ");
        return {
          texto: `Praias em ${cidade}: ${nomes}. Fala o nome pra eu te levar.`,
          acao_navegar: { acao: "praias" },
          intencao: intent
        };
      }
    }

    // Atalho local: descrever_lugar enriquecido com praias da cidade
    let praiasHint = "";
    if (intent.tipo === "descrever_lugar" && _praias && cidade) {
      const ps = await _praias.praiasDaCidade(cidade, estado, 3);
      if (ps.length) praiasHint = ` Praias: ${ps.map(p => p.nome).join(", ")}.`;
    }

    let rpcTexto = null, rpcAcao = null;
    try {
      const r = await _supabase.rpc("responder_intencao", {
        p_intencao: intent.tipo,
        p_estado:   estado || null,
        p_cidade:   cidade || null,
        p_termo:    intent.termo || intent.acao || null
      });
      rpcTexto = r?.texto || null;
      rpcAcao  = r?.acao_navegar || null;
    } catch (e) { console.warn("[Litorânea RPC]", e?.message || e); }

    // Estratégia: se RPC já tem ação navegacional clara (abrir tela), respeita.
    // Caso contrário, prioriza AI (Cloudflare Llama com RAG / fallback Pollinations).
    const temAcao = !!(rpcAcao && rpcAcao.acao);
    if (!temAcao && _ai && _ai.isReady && _ai.isReady()) {
      _historico.push({ role: "user", content: texto });
      try {
        const aiResp = await _ai.ask({
          mensagem: texto, cidade, estado,
          history: _historico.slice(-6)
        });
        const reply = aiResp?.reply;
        console.log("[Litorânea AI]", aiResp?.source || "?", "→", (reply || "").slice(0, 80));
        if (reply) {
          _historico.push({ role: "assistant", content: reply });
          const out = { texto: reply + praiasHint, acao_navegar: null, intencao: intent, source: aiResp.source || "ai" };
          if (_ttsEnabled) falarTTS(out.texto);
          return out;
        }
      } catch (e) { console.warn("[Litorânea AI]", e?.message || e); }
    }

    const out = {
      texto: (rpcTexto || _i18n.tr("lit_nao_entendi")) + praiasHint,
      acao_navegar: rpcAcao,
      intencao: intent,
      source: rpcTexto ? "rpc" : "fallback"
    };
    if (_ttsEnabled) falarTTS(out.texto);
    if (out.acao_navegar?.acao && _navHandler) _navHandler(out.acao_navegar.acao);
    return out;
  }

  // Limpa historico conversacional
  function limparHistorico() { _historico = []; }

  // ── Coletar gostos: alimenta user_gostos → matching personalizado ──────
  // Honesto: a saudação-intro avisa que a Litorânea grava a fala do usuário
  // pra servir melhor. Só roda pra usuário LOGADO (sem conta = sem perfil) e
  // respeita opt-out gravado em localStorage 'vs_gostos_off'. Fire-and-forget:
  // nunca bloqueia nem quebra a resposta da Litorânea.
  const _SUPA_FN = "https://vdrzndgkwdpibexjkyxi.supabase.co/functions/v1";
  async function _coletarGostos(texto, { cidade = null, estado = null, lat = null, lng = null } = {}) {
    try {
      if (!texto || !texto.trim() || !_supabase) return;
      if (typeof localStorage !== "undefined" && localStorage.getItem("vs_gostos_off") === "1") return;
      const sess = await _supabase.auth.getSession();
      const token = sess?.data?.session?.access_token;
      if (!token) return; // anônimo: não coleta
      const body = { mensagem: texto };
      if (cidade) { body.cidade = cidade; body.estado = estado; }
      if (lat != null && lng != null) { body.lat = lat; body.lng = lng; }
      fetch(`${_SUPA_FN}/coletar-gostos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      }).then(r => (r.ok ? r.json() : null)).then(d => {
        if (d && d.ok) console.log("[Litorânea gostos]", (d.completude || 0) + "%",
          (d.intencoes_salvas || []).length, "intenções");
      }).catch(() => {});
    } catch { /* silencioso — nunca atrapalha o chat */ }
  }

  function _localeCompleto(code) {
    return ({ pt: "pt-BR", en: "en-US", es: "es-ES" })[code] || code || "pt-BR";
  }

  // Score de voz pra escolher a melhor disponível (pt-BR, sempre a voz do
  // Antônio — voz única do app, sem exceção). Só entra em jogo no fallback do
  // navegador (quando VSFalar/edge-tts não está disponível).
  // Critérios (em ordem de peso):
  //   1) lang exato (pt-BR > pt > pt-PT) — pt-PT soa europeu, evita
  //   2) name contém "antonio"/"daniel"/"felipe"/"male"/"homem" → +
  //   3) localService=true (offline) é mais consistente que online
  //   4) name contém "google" tem boa qualidade
  function _scoreVoz(v, langAlvo) {
    let s = 0;
    const lang = (v.lang || "").toLowerCase();
    const nome = (v.name || "").toLowerCase();
    const alvo = langAlvo.toLowerCase();
    // Lang
    if (lang === alvo) s += 100;
    else if (lang.startsWith(alvo.split("-")[0]) && !lang.startsWith("pt-pt")) s += 60;
    else if (lang.startsWith(alvo.split("-")[0])) s += 20; // pt-PT última opção
    // Penaliza pt-PT explicitamente quando alvo é pt-BR
    if (alvo === "pt-br" && lang === "pt-pt") s -= 40;
    // Voz do Antônio — a única voz do app
    if (/ant[oô]nio|daniel|felipe|male|homem/.test(nome)) s += 30;
    // Marcas de qualidade
    if (/google/.test(nome)) s += 15;
    if (/microsoft/.test(nome)) s += 10;
    if (/natural|neural|wavenet|premium/.test(nome)) s += 25;
    // Local é mais previsível
    if (v.localService) s += 5;
    return s;
  }
  function _vozPraLang(lang) {
    try {
      const vozes = window.speechSynthesis.getVoices() || [];
      if (!vozes.length) return null;
      const ranked = vozes
        .map(v => ({ v, score: _scoreVoz(v, lang) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score);
      return ranked[0]?.v || null;
    } catch { return null; }
  }

  // Limpa texto pra TTS: tira emojis, asteriscos, marcadores, URLs.
  // Também troca abreviações comuns por forma falada.
  function _prepararPraFalar(texto) {
    let t = String(texto || "");
    // Remove emojis (Unicode ranges principais) e símbolos decorativos
    t = t.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{1FA00}-\u{1FAFF}]/gu, " ");
    // Remove **bold**, _italic_, `code`, * marcadores
    t = t.replace(/[*_`#]+/g, " ");
    // URL longa — tira (não fala)
    t = t.replace(/https?:\/\/\S+/g, "");
    // Marcadores tipo "•", "→", "·"
    t = t.replace(/[•→←↔↑↓·▪▫►▼▲]/g, ", ");
    // R$ e SC pra forma falada
    t = t.replace(/\bR\$\s*(\d+)/gi, "$1 reais");
    t = t.replace(/\b(\d+)\s*sulis?\b/gi, "$1 sulis");
    t = t.replace(/\bSulCoin(s)?\b/g, "Sul Coin$1");
    // Abreviações comuns
    t = t.replace(/\bvc\b/gi, "você");
    t = t.replace(/\btb\b/gi, "também");
    t = t.replace(/\bpq\b/gi, "porque");
    t = t.replace(/\bpra\b/gi, "pra");
    // Estados (PR, SC, RS) por extenso
    t = t.replace(/\bPR\b/g, "Paraná");
    t = t.replace(/\bSC\b/g, "Santa Catarina");
    t = t.replace(/\bRS\b/g, "Rio Grande do Sul");
    // Espaços múltiplos
    t = t.replace(/\s{2,}/g, " ").trim();
    return t;
  }

  // Divide texto em frases pra falar com pausas naturais.
  // SpeechSynthesis chamada várias vezes (em fila) tem pausa natural entre.
  function _dividirEmFrases(texto) {
    return texto
      .split(/(?<=[.!?…])\s+(?=[A-ZÀ-Ÿ])|\.{3,}|;\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  function falarTTS(texto) {
    if (typeof window === "undefined") return;
    if (!texto) return;
    // Voz FLUIDA pública (radio-tts → XTTS → robótico) quando o VSFalar existe.
    // Cai pro Web Speech do navegador só se VSFalar não estiver carregado.
    if (window.VSFalar && typeof window.VSFalar.falar === "function") {
      try { window.VSFalar.falar(_prepararPraFalar(texto).slice(0, 800)); return; }
      catch (e) { /* cai pro fallback abaixo */ }
    }
    if (!("speechSynthesis" in window)) return;
    try {
      const synth = window.speechSynthesis;
      synth.cancel(); // evita empilhar fala anterior

      const limpo = _prepararPraFalar(texto).slice(0, 800);
      if (!limpo) return;

      const lang = _localeCompleto(_i18n.langCode());
      const voz = _vozPraLang(lang);
      const frases = _dividirEmFrases(limpo);

      // Falar frase por frase com cadência mais natural (pausa via fila do synth)
      for (const frase of frases) {
        const u = new SpeechSynthesisUtterance(frase);
        u.lang = lang;
        if (voz) u.voice = voz;
        u.rate = 0.98;   // levemente mais lento — soa mais humano que 1.0
        u.pitch = 1.0;   // neutro — voz única do Antônio
        u.volume = 1.0;
        synth.speak(u);
      }
    } catch (e) {
      try { console.warn("[Litorânea TTS]", e); } catch {}
    }
  }
  // Pre-carrega vozes (alguns browsers só carregam após chamada inicial)
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try { window.speechSynthesis.getVoices(); } catch {}
    window.speechSynthesis.onvoiceschanged = () => {
      try { window.speechSynthesis.getVoices(); } catch {}
    };
  }

  /**
   * STT — Web Speech API. Retorna Promise<{ texto, erro, dica }>.
   * Se sucesso: { texto: "...", erro: null }
   * Se falha:   { texto: null, erro: "permission|no-speech|network|..." }
   * Antes de tentar STT, pede permissão via getUserMedia pra disparar
   * o prompt do mic — alguns navegadores não pedem só com SpeechRecognition.
   */
  function ouvir() {
    return new Promise(async (resolve) => {
      const SR = (typeof window !== "undefined") &&
                 (window.SpeechRecognition || window.webkitSpeechRecognition);
      if (!SR) {
        return resolve({
          texto: null, erro: "sem-suporte",
          dica: "Esse navegador não suporta voz. Usa Chrome ou Edge — Firefox/Safari móvel não tem reconhecimento."
        });
      }

      // Garante prompt de permissão do mic ANTES (alguns browsers não disparam só com SR)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop()); // libera mic, SR vai abrir de novo
      } catch (e) {
        return resolve({
          texto: null, erro: "permission",
          dica: "Permissão do microfone negada. Toque no cadeado da barra de endereço → libera o microfone → recarrega."
        });
      }

      const r = new SR();
      r.lang = _i18n.langCode();
      r.continuous = false;
      r.interimResults = false;
      let resolvido = false;
      const fim = (v) => { if (!resolvido) { resolvido = true; resolve(v); } };

      r.onresult = e => fim({ texto: e.results[0][0].transcript, erro: null });
      r.onerror = e => {
        const map = {
          "not-allowed":   "Permissão do microfone negada no browser.",
          "no-speech":     "Não escutei nada. Fala mais perto do mic.",
          "audio-capture": "Microfone não disponível ou em uso por outro app.",
          "network":       "Sem internet — Web Speech precisa de internet.",
          "aborted":       "Reconhecimento cancelado.",
          "service-not-allowed": "Brave bloqueou o Google Speech. Em brave://settings/privacy ativa 'Web Speech API' OU usa Chrome.",
        };
        fim({ texto: null, erro: e.error || "desconhecido", dica: map[e.error] || `Erro: ${e.error}` });
      };
      r.onend = () => fim({ texto: null, erro: "vazio", dica: "Não captou áudio. Tenta de novo." });

      try { r.start(); }
      catch (e) { fim({ texto: null, erro: "start-fail", dica: e.message || "Falhou ao iniciar mic." }); }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Conversa multi-turn — espelha LitoraneaConversaInterativa.kt
  //
  // A Litorânea pergunta, escuta, decide, fala de novo até navegar/encerrar.
  // Cada turno: { fala?, ouvir?, navegar?, encerrar? }.
  //
  // Estados típicos:
  //   "inicio"         → pergunta tipo de praia (sossego/badalada/onda…)
  //   "esperar_tag"    → recebeu fala, mapeou tag, propõe uma praia
  //   "esperar_sim"    → user ouviu sugestão, espera "sim/não/outra"
  //   "fim"            → encerra
  // ─────────────────────────────────────────────────────────────

  const RESPOSTAS_SIM = [
    "sim","claro","vamo","vamos","quero","pode ir","pode","bora",
    "manda","manda ver","vai","vai la","pode sim","uhum","com certeza",
    "claro que sim","beleza","legal","ok","ta bom","positivo","ta","isso"
  ];
  const RESPOSTAS_NAO = [
    "nao","não","depois","outra","outro","nem","nao quero","agora nao",
    "cancelar","cancela","deixa","sai","sair","esquece","negativo","mudei de ideia"
  ];

  function disseSim(t) {
    const s = String(t || "").toLowerCase().trim();
    return RESPOSTAS_SIM.some(r => s === r || s.startsWith(r + " ") || s.endsWith(" " + r) || s.includes(" " + r + " "));
  }
  function disseNao(t) {
    const s = String(t || "").toLowerCase().trim();
    return RESPOSTAS_NAO.some(r => s === r || s.startsWith(r + " ") || s.endsWith(" " + r) || s.includes(" " + r + " "));
  }

  /**
   * Inicia uma conversa interativa de sugestão de praia.
   *
   * @param {object} opts
   *   - cidade, estado: contexto
   *   - onFalar(texto): callback pra mostrar/falar (TTS interno opcional)
   *   - onNavegarPraia(praia): callback quando user aceita ir
   *   - onEncerrar(): callback quando termina
   * @returns {object} { receberFala(textoOuvido), proxima(), cancelar() }
   */
  function conversaPraia({ cidade, estado, onFalar, onNavegarPraia, onEncerrar }) {
    let estado_ = "inicio";
    let praiaCandidata = null;
    let sugeridas = []; // pra não repetir

    const fala = (t, escutarDepois = true) => {
      if (_ttsEnabled) falarTTS(t);
      if (onFalar) onFalar(t, escutarDepois);
    };

    const proximaPraia = (texto) => {
      if (!_praias) return null;
      return _praias.sugerirPorTag(texto, cidade, estado).then(lista => {
        const novas = lista.filter(p => !sugeridas.find(s => s.id === p.id));
        return novas[0] || lista[0] || null;
      });
    };

    return {
      iniciar() {
        estado_ = "esperar_tag";
        fala(`Em ${cidade} tem várias praias. Você quer mais sossego, mais badalada, ou onda pra surfar?`);
      },

      async receberFala(texto) {
        if (!texto) return;
        if (estado_ === "esperar_tag") {
          praiaCandidata = await proximaPraia(texto);
          if (!praiaCandidata) {
            fala(`Não tenho praia que case com isso em ${cidade}. Quer abrir a lista completa?`, false);
            estado_ = "fim";
            return;
          }
          sugeridas.push(praiaCandidata);
          estado_ = "esperar_sim";
          const tagsTxt = (praiaCandidata.tags || []).slice(0, 2).join(" e ");
          fala(`Que tal a ${praiaCandidata.nome}? ${tagsTxt ? `É ${tagsTxt}.` : ""} Quer que eu te leve?`);
          return;
        }
        if (estado_ === "esperar_sim") {
          if (disseSim(texto)) {
            estado_ = "fim";
            fala(`Beleza, indo pra ${praiaCandidata.nome}.`, false);
            if (onNavegarPraia) onNavegarPraia(praiaCandidata);
            if (onEncerrar) onEncerrar();
            return;
          }
          if (disseNao(texto)) {
            // tenta outra com mesma intenção, não pede tag de novo
            estado_ = "esperar_tag";
            fala("Ok, te mostro outra. Sossego, badalada, ou onda?");
            return;
          }
          // texto livre = nova tag
          estado_ = "esperar_tag";
          praiaCandidata = await proximaPraia(texto);
          if (!praiaCandidata) {
            fala("Não achei outra. Quer abrir a lista completa?", false);
            estado_ = "fim";
            return;
          }
          sugeridas.push(praiaCandidata);
          estado_ = "esperar_sim";
          fala(`Que tal a ${praiaCandidata.nome}? Quer ir?`);
        }
      },

      cancelar() {
        estado_ = "fim";
        if (onEncerrar) onEncerrar();
      },

      get estado() { return estado_; }
    };
  }

  // Controle global de TTS (chamado por aplicarMute do app.js)
  function setTTS(ativo) {
    _ttsEnabled = !!ativo;
    if (!ativo) {
      try { window.speechSynthesis?.cancel(); } catch {}
    }
  }
  return { init, saudacao, processar, falarTTS, setTTS, ouvir, conversaPraia, disseSim, disseNao, limparHistorico };
});
