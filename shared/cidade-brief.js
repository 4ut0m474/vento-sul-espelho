// shared/cidade-brief.js v2 — Brief sonoro da cidade
// Usa o MESMO escute-btn que já existe no SPA.
// Em sub-páginas (radio, aurora, etc.) auto-injeta o botão no <h1>.
// Comportamento: toca áudio + scroll suave revelando o conteúdo da página.
(function (root) {
  "use strict";

  const SUPA = (root.VENTOSUL_CONFIG?.SUPABASE_URL) ||
               "https://vdrzndgkwdpibexjkyxi.supabase.co";
  const ANON = (root.VENTOSUL_CONFIG?.SUPABASE_ANON_JWT) ||
               "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkcnpuZGdrd2RwaWJleGpreXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyODA0MTAsImV4cCI6MjA4Njg1NjQxMH0.pE1cUYQ-gL6iJfpeZREvTnG1R1sG2DGEnA_pB0tKx60";

  const COORDS = {
    "Florianópolis":   [-27.59, -48.55], "Joinville":        [-26.30, -48.85],
    "Blumenau":        [-26.92, -49.07], "Curitiba":         [-25.43, -49.27],
    "Porto Alegre":    [-30.03, -51.23], "Gramado":          [-29.38, -50.88],
    "Balneário Camboriú": [-26.99, -48.63], "Torres":        [-29.34, -49.73],
    "Antonina":        [-25.43, -48.71], "Lapa":             [-25.77, -49.72],
    "Bombinhas":       [-27.15, -48.48], "Urubici":          [-28.01, -49.59],
    "São Joaquim":     [-28.30, -49.93], "Pelotas":          [-31.77, -52.34],
    "Bento Gonçalves": [-29.17, -51.52], "Cambará do Sul":   [-29.05, -50.15],
    "São Miguel das Missões": [-28.55, -54.55],
    "Foz do Iguaçu":   [-25.54, -54.59], "Morretes":         [-25.47, -48.84],
  };

  function _cond(c) {
    if (c == null) return "tempo variável";
    if (c === 0)  return "céu aberto";
    if (c <= 3)   return "parcialmente nublado";
    if (c <= 48)  return "neblina";
    if (c <= 57)  return "garoa";
    if (c <= 67)  return "chuva";
    if (c <= 77)  return "neve";
    if (c <= 82)  return "pancadas de chuva";
    return "tempestade";
  }

  const TELA = {
    landing:        "Oi! Seja bem-vindo ao Vento Sul. Aqui você escolhe sua cidade e descobre tudo que a gente preparou pra você, aqui pertinho.",
    radio:          "Essa aqui é a Rádio Vento Sul, ao vivo, vinte e quatro horas, com notícias fresquinhas da tua região. Escolhe a estação que tu quiser e fica na sintonia.",
    aurora:         "Esse é o Aurora, nosso jogo de impacto real no Sul. Missões de verdade no mapa, XP e SulCoin que valem a pena.",
    aurora_classes: "Aqui tu escolhe tua classe no Aurora: Desbravador, Guerreiro, Mago, Alquimista, Sábio, Forjador ou Watcher. Escolhe a que combina contigo.",
    carteira:       "Essa é a tua carteira SulCoin. Teu saldo, o histórico completo e as transferências, tudo aqui.",
    feira:          "Essa é a Feira Digital, as barracas dos comerciantes locais, sem comissão nenhuma, e com GPS pra tu achar fácil.",
    caca:           "Essa é a Caça ao Tesouro. Explora os locais especiais no mapa e ganha SulCoin de verdade.",
    comercio:       "Aqui fica o comércio local. O que tu precisar, tem perto de ti.",
    hub:            "Esse é o Hub da comunidade. Votação, proposta, projeto do bairro, tudo junto aqui.",
    quests:         "Aqui ficam as Quests Vivas, missões reais que melhoram o bairro e ainda rendem SulCoin.",
    praias:         "Explora as praias e os pontos turísticos do Sul do Brasil, tudo por aqui.",
    coletiva:       "Compra coletiva: chama os vizinhos, junta a galera e consegue um desconto bem melhor.",
    votados:        "Esses são os mais votados da cidade, os comerciantes que a galera mais recomenda.",
    mapa:           "Esse é o mapa do Vento Sul. Dá uma olhada nos lugares, nas barracas e nos eventos ao redor de ti.",
    radio_admin:    "Essa é a Sala DJ. Aqui tu controla a rádio ao vivo, os alertas e o conteúdo.",
    default:        "Tu tá no Vento Sul, o app de impacto digital do Sul do Brasil.",
  };

  // Intros pré-gravadas na voz clonada do DJ (XTTS), pt/en/es por tela.
  const _TELAS_VOZ_DJ = [
    "landing", "radio", "aurora", "aurora_classes", "carteira", "feira",
    "caca", "comercio", "hub", "quests", "praias", "coletiva", "votados",
    "mapa", "radio_admin", "default",
  ];
  const _VOZ_DJ_V = "spd1"; // versão dos áudios (fura cache quando regrava)
  const TELA_VOZ_DJ = {};
  for (const t of _TELAS_VOZ_DJ) {
    TELA_VOZ_DJ[t] = {
      pt: `/voz-dj-brief/${t}-pt.mp3?v=${_VOZ_DJ_V}`,
      en: `/voz-dj-brief/${t}-en.mp3?v=${_VOZ_DJ_V}`,
      es: `/voz-dj-brief/${t}-es.mp3?v=${_VOZ_DJ_V}`,
    };
  }

  // Idioma atual: usa o mesmo estado do app (SPA) quando disponível;
  // em sub-página isolada, cai pro que foi salvo no localStorage; por
  // último, detecta pelo navegador. Sempre pt/en/es.
  function _idiomaAtual() {
    try {
      if (typeof langCode === "function") return langCode();
    } catch {}
    try {
      const raw = localStorage.getItem("ventosul_pwa_v1");
      if (raw) {
        const idx = JSON.parse(raw)?.idiomaIdx;
        if (typeof idx === "number") return ["pt", "en", "es"][idx] || "pt";
      }
    } catch {}
    const lang = String((navigator.languages?.[0]) || navigator.language || "pt").toLowerCase();
    if (lang.startsWith("en")) return "en";
    if (lang.startsWith("es")) return "es";
    return "pt";
  }

  const _cache = {};
  const CACHE_1H = 60 * 60 * 1000;

  async function _tempo(lat, lng) {
    try {
      const r = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        `&current=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode` +
        `&forecast_days=2&timezone=America%2FSao_Paulo`,
        { signal: AbortSignal.timeout(5000) }
      );
      return r.ok ? r.json() : null;
    } catch { return null; }
  }

  async function _parceiro(cidade, estado) {
    try {
      const r = await fetch(
        `${SUPA}/rest/v1/feira_barracas?select=nome,categoria,descricao` +
        `&ativa=eq.true&cidade=eq.${encodeURIComponent(cidade)}` +
        `&estado=eq.${encodeURIComponent(estado)}&limit=10`,
        { headers: { apikey: ANON } }
      );
      if (!r.ok) return null;
      const lista = await r.json();
      const com = lista.filter(b => b.descricao && b.descricao.length > 15);
      const pool = com.length ? com : lista;
      return pool.length ? pool[Math.floor(Math.random() * Math.min(5, pool.length))] : null;
    } catch { return null; }
  }

  function _coords(cidade) {
    for (const [k, v] of Object.entries(COORDS))
      if (k.toLowerCase() === cidade.toLowerCase()) return v;
    for (const [k, v] of Object.entries(COORDS))
      if (cidade.toLowerCase().includes(k.toLowerCase().split(" ")[0])) return v;
    return [-27.59, -48.55];
  }

  async function _gerar(tela, cidade, estado, pularIntro) {
    const ch = `${tela}||${cidade}||${pularIntro ? "semintro" : "full"}`;
    const cached = _cache[ch];
    if (cached && Date.now() - cached.ts < CACHE_1H) return cached.texto;

    const [lat, lng] = _coords(cidade);
    const [meteo, parc] = await Promise.all([_tempo(lat, lng), _parceiro(cidade, estado)]);

    let txt = pularIntro ? "" : (TELA[tela] || TELA.default) + "\n\n";
    txt += `Você está em ${cidade}`;
    if (estado && estado !== cidade) txt += `, ${estado}`;
    txt += ". ";
    if (meteo?.current) {
      const t = Math.round(meteo.current.temperature_2m);
      txt += `Agora ${t} graus, ${_cond(meteo.current.weathercode)}. `;
    }
    if (meteo?.daily?.temperature_2m_max?.[1] != null) {
      const mx = Math.round(meteo.daily.temperature_2m_max[1]);
      const mn = Math.round(meteo.daily.temperature_2m_min[1]);
      txt += `Amanhã: máxima ${mx}, mínima ${mn} graus, ${_cond(meteo.daily.weathercode?.[1])}. `;
    }
    if (parc?.nome) {
      txt += `\n\nDica de parceiro do Vento Sul em ${cidade}: ${parc.nome}`;
      if (parc.categoria) txt += `, ${parc.categoria}`;
      if (parc.descricao) {
        const fim = parc.descricao.indexOf(".", 40);
        txt += ". " + (fim > 0 ? parc.descricao.slice(0, fim + 1) : parc.descricao.slice(0, 90));
      }
      txt += " Vale a visita!";
    }
    _cache[ch] = { texto: txt, ts: Date.now() };
    return txt;
  }

  // Scroll suave revelando o conteúdo enquanto o áudio toca
  function _scrollEnquanteFala(duracaoMs) {
    const el = document.querySelector("#main") ||
               document.querySelector("main") ||
               document.scrollingElement ||
               document.documentElement;
    if (!el) return () => {};

    const scrollInicio = el.scrollTop;
    const scrollMax = Math.max(0, el.scrollHeight - el.clientHeight - scrollInicio);
    if (scrollMax <= 20) return () => {};

    // Scroll suave até ~70% do conteúdo (para o user ainda ver o final)
    const scrollAlvo = scrollInicio + scrollMax * 0.7;
    const inicio = Date.now();
    let raf;

    function tick() {
      const t = Math.min(1, (Date.now() - inicio) / duracaoMs);
      // easeInOutSine
      const ease = -(Math.cos(Math.PI * t) - 1) / 2;
      el.scrollTop = scrollInicio + ease * (scrollAlvo - scrollInicio);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }

  let _ativo = null;
  let _cancelScroll = null;
  let _audioDj = null;   // mp3 da voz clonada em curso
  let _sessao = 0;       // invalida callbacks de uma fala antiga

  function _pararTudo() {
    _sessao++;
    try { speechSynthesis?.cancel(); } catch {}
    try { window.VSFalar?.parar?.(); } catch {}
    if (_audioDj) { try { _audioDj.pause(); } catch {} _audioDj = null; }
    if (_cancelScroll) { _cancelScroll(); _cancelScroll = null; }
  }

  async function falar(tela, btnRef) {
    // Toggle: 2º toque para tudo
    if (_ativo === btnRef) {
      _pararTudo();
      btnRef?.classList.remove("escute-falando");
      _ativo = null;
      return;
    }
    // Para anterior
    _pararTudo();
    if (_ativo) _ativo.classList.remove("escute-falando");
    _ativo = btnRef || null;
    if (btnRef) btnRef.classList.add("escute-falando");

    const cidade = (typeof state !== "undefined" && state?.cidade) ||
                   localStorage.getItem("vs.cidade") || "Florianópolis";
    const estado = (typeof state !== "undefined" && state?.estado) ||
                   localStorage.getItem("vs.estado") || "Santa Catarina";

    const sessao = _sessao;
    try {
      const idioma = _idiomaAtual();
      // Tail dinâmico (clima/parceiro) só existe em PT hoje; em en/es toca só a intro na voz do DJ.
      const vozDjUrl = TELA_VOZ_DJ[tela]?.[idioma] || (idioma === "pt" ? null : TELA_VOZ_DJ[tela]?.pt);
      const pularTail = !!vozDjUrl && idioma !== "pt";
      const texto = pularTail ? "" : await _gerar(tela, cidade, estado, !!vozDjUrl);
      if (sessao !== _sessao) return; // user parou/trocou enquanto buscava clima
      const duracaoMs = Math.max(8000, (texto.length / 14) * 1000) + (vozDjUrl ? 14000 : 0);

      // Inicia scroll revelador
      _cancelScroll = _scrollEnquanteFala(duracaoMs);

      const _fim = () => {
        if (_ativo === btnRef) { btnRef?.classList.remove("escute-falando"); _ativo = null; }
        if (_cancelScroll) { _cancelScroll(); _cancelScroll = null; }
      };

      const _falarResto = () => {
        if (sessao !== _sessao) return; // fala antiga: não emendar por cima de nada
        _audioDj = null;
        if (pularTail) { _fim(); return; }
        if (window.VSFalar?.falar) {
          window.VSFalar.falar(texto).then(_fim);
        } else {
          _fim();
        }
      };

      if (vozDjUrl) {
        // Intro pré-gravada na voz clonada do DJ, depois emenda com o resto (clima/parceiro) na voz de sempre (só em pt).
        const audioDj = new Audio(vozDjUrl);
        _audioDj = audioDj;
        audioDj.onended = _falarResto;
        audioDj.onerror = _falarResto;
        audioDj.play().catch(_falarResto);
      } else if (window.VSFalar?.falar) {
        // voz fluida da rádio (edge-tts) — prioridade
        window.VSFalar.falar(texto).then(_fim);
      } else if (window.VSLitoranea?.falarTTS) {
        window.VSLitoranea.falarTTS(texto);
        setTimeout(_fim, duracaoMs);
      } else {
        const u = new SpeechSynthesisUtterance(texto);
        u.lang = "pt-BR"; u.rate = 0.92;
        const v = speechSynthesis.getVoices().find(x => x.lang.startsWith("pt"));
        if (v) u.voice = v;
        u.onend = _fim;
        u.onerror = _fim;
        speechSynthesis.speak(u);
        setTimeout(_fim, duracaoMs + 3000); // fallback
      }
    } catch (e) {
      console.warn("[brief]", e);
      btnRef?.classList.remove("escute-falando");
      _ativo = null;
    }
  }

  // CSS para sub-páginas que não têm styles.css
  function _injetarCSS() {
    if (document.getElementById("brief-compat-css")) return;
    if (document.querySelector('.escute-btn') && getComputedStyle(document.querySelector('.escute-btn')).display !== '') return;
    const s = document.createElement("style");
    s.id = "brief-compat-css";
    s.textContent = `
      .escute-btn {
        display:inline-flex;align-items:center;justify-content:center;
        width:28px;height:28px;border-radius:50%;
        background:transparent;border:1px solid rgba(255,255,255,0.22);
        color:rgba(255,255,255,0.55);cursor:pointer;vertical-align:middle;
        margin-left:6px;padding:0;font-size:13px;line-height:1;
        transition:color .18s,border-color .18s,background .18s,transform .1s;
        flex-shrink:0;
      }
      .escute-btn:hover{color:#7af0ff;border-color:#7af0ff;background:rgba(110,200,255,.08);}
      .escute-btn:active{transform:scale(.88);}
      .escute-btn.escute-falando{
        color:#7af0ff;border-color:#7af0ff;background:rgba(110,200,255,.18);
        animation:escute-pulse 1.5s ease-in-out infinite;
      }
      @keyframes escute-pulse{
        0%,100%{box-shadow:0 0 0 0 rgba(110,200,255,.55);}
        50%{box-shadow:0 0 0 7px rgba(110,200,255,0);}
      }
    `;
    (document.head || document.body).appendChild(s);
  }

  // Auto-injeção em sub-páginas (fora do SPA)
  function _injetarEmSubPagina() {
    if (typeof window.showScreen === "function") return; // SPA trata via _plugarEscuteBotoes
    if (document.querySelector('[data-cidade-brief]')) return; // já injetado

    const h1 = document.querySelector("header h1") || document.querySelector("h1");
    if (!h1) return;

    const btn = document.createElement("button");
    btn.className = "escute-btn";
    btn.dataset.cidadeBrief = "1";
    btn.type = "button";
    btn.setAttribute("aria-label", "Ouvir sobre esta página e a cidade");
    btn.title = "Ouvir sobre esta página e a cidade";
    btn.innerHTML = window.VSIcons?.svg?.("broadcast", 13) || "📡";

    const path = location.pathname;
    const tela = path.includes("radio-admin") ? "radio_admin"
               : path.includes("radio")        ? "radio"
               : path.includes("aurora-jogo")  ? "aurora"
               : path.includes("aurora-classes") ? "aurora_classes"
               : path.includes("carteira")     ? "carteira"
               : "default";

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      VSBrief.falar(tela, btn);
    });

    h1.appendChild(btn);
  }

  // Se qualquer outro áudio do app começar (rádio, música…), o brief se cala:
  // a rádio sempre ganha. Ignora os áudios do próprio brief (voz DJ e /fala/).
  document.addEventListener("play", (e) => {
    const el = e.target;
    if (!(el instanceof HTMLMediaElement)) return;
    const src = el.currentSrc || el.src || "";
    if (src.includes("/voz-dj-brief/") || src.includes("/fala/")) return;
    if (_ativo || _audioDj) {
      _pararTudo();
      if (_ativo) { _ativo.classList.remove("escute-falando"); _ativo = null; }
    }
  }, true);

  root.VSBrief = { falar, TELA };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { _injetarCSS(); _injetarEmSubPagina(); });
  } else {
    _injetarCSS();
    _injetarEmSubPagina();
  }

})(typeof self !== "undefined" ? self : this);
