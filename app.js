// Vento Sul — PWA standalone (paridade com Android nativo)
// Lógica IA, intenção, praias, wallet e i18n vêm dos módulos shared/.
// Ver shared/README.md pro mapeamento Kotlin → JS.

// 🔇 Logger condicional — só ativa com ?debug=1 ou localStorage.vs_debug=1
// Por padrão silencioso em produção (não vaza email/uid no console pra qualquer um abrir DevTools).
const VS_DEBUG = (() => {
  try {
    if (new URLSearchParams(location.search).get("debug") === "1") return true;
    return localStorage.getItem("vs_debug") === "1";
  } catch { return false; }
})();
const vslog = VS_DEBUG ? console.log.bind(console, "[VS]") : () => {};
const vswarn = console.warn.bind(console, "[VS]");
const vserr = console.error.bind(console, "[VS]");

const { SUPABASE_URL, SUPABASE_ANON, BOT_API_URL } = window.VENTOSUL_CONFIG;

// Inicializa shared modules
VSSupabase.init(SUPABASE_URL, SUPABASE_ANON);
VSPraias.init(VSSupabase);
VSWallet.init({ supabase: VSSupabase, botApi: BOT_API_URL ? botApi : null });

const tg = window.Telegram?.WebApp;
if (tg) { try { tg.expand(); tg.ready(); } catch {} }

const state = {
  estado: "",
  cidade: "",
  barraca: null,
  idiomas: ["🇧🇷","🇺🇸","🇪🇸"],
  idiomaIdx: 0,
  ultimaTela: "landing",
};

const LS_KEY = "ventosul_pwa_v1";
function _idiomaAuto() {
  const lang = String((navigator.languages?.[0]) || navigator.language || "pt").toLowerCase();
  if (lang.startsWith("en")) return 1;
  if (lang.startsWith("es")) return 2;
  return 0; // pt e fallback
}
function loadPrefs() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      // primeira visita: detecta idioma do browser
      state.idiomaIdx = _idiomaAuto();
      return;
    }
    const p = JSON.parse(raw);
    state.estado = p.estado || "";
    state.cidade = p.cidade || "";
    state.idiomaIdx = (typeof p.idiomaIdx === "number") ? p.idiomaIdx : _idiomaAuto();
    state.ultimaTela = p.ultimaTela || "landing";
  } catch {
    state.idiomaIdx = _idiomaAuto();
  }
}
function savePrefs() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      estado: state.estado, cidade: state.cidade,
      idiomaIdx: state.idiomaIdx, ultimaTela: state.ultimaTela
    }));
  } catch {}
}

const langCode = () => ["pt","en","es"][state.idiomaIdx];
const tr = (k, ...a) => { VSI18n.setLang(langCode()); return VSI18n.tr(k, ...a); };

// ─────────────────────────────────────────────────────────────
// 🏛️ MODO INSTITUCIONAL — toggle pra apresentar pra prefeitura
// Mesmo app, outros nomes/visual sóbrio. Salva no localStorage.
// ─────────────────────────────────────────────────────────────
window._modoInst = (() => {
  try { return localStorage.getItem("vs_modo_inst") === "1"; } catch { return false; }
})();
const REBRAND_INST = {
  // user-facing → institucional
  "Quests Vivas":          "Mapa Colaborativo de Cidadania",
  "Quest Viva":            "Ação Cívica",
  "quests vivas":          "ações cívicas",
  "quests cívicas":        "ações cívicas",
  "Vitrine Inteligente":   "Vitrine Comunitária Inteligente",
  "SmartView":             "Vitrine Comunitária Inteligente",
  "SulCoins":              "Selo de Cidadania",
  "SulCoin":               "Selo de Cidadania",
  "sulcoins":              "selos",
  "sulis":                 "pontos",
  "Aurora":                "Trilha Aurora",
  "Aurora RPG":            "Trilha Aurora · Educação Cultural",
  "Caça ao Tesouro":       "Roteiro Cultural Geolocalizado",
  "monstro":               "desafio",
  "monstros":              "desafios",
  "derrotar":              "resolver",
  "HP":                    "progresso"
};
function tInst(s) {
  if (!window._modoInst || !s) return s;
  let out = String(s);
  for (const [k, v] of Object.entries(REBRAND_INST)) {
    out = out.replaceAll(k, v);
  }
  return out;
}
window.tInst = tInst;
window.toggleModoInstitucional = function() {
  window._modoInst = !window._modoInst;
  try { localStorage.setItem("vs_modo_inst", window._modoInst ? "1" : "0"); } catch {}
  document.body.classList.toggle("modo-inst", window._modoInst);
  // Reaplica em todos elementos data-tr-inst
  aplicarRebrandDOM();
  // Refresca telas chave
  if (typeof atualizarQuests === "function" && document.getElementById("screen-quests")?.classList.contains("active")) atualizarQuests();
};
function aplicarRebrandDOM() {
  document.querySelectorAll("[data-rebrand]").forEach(el => {
    const orig = el.getAttribute("data-rebrand-orig") || el.textContent;
    if (!el.getAttribute("data-rebrand-orig")) el.setAttribute("data-rebrand-orig", orig);
    el.textContent = tInst(orig);
  });
}
// Aplica no boot
document.addEventListener("DOMContentLoaded", () => {
  if (window._modoInst) document.body.classList.add("modo-inst");
  setTimeout(aplicarRebrandDOM, 200);
});

// Estende strings i18n com chaves das features adicionadas (Quests/DOOH/Saques/Admin)
// — mantém shared/i18n.js como base mínima e cresce daqui sem mexer.
(function () {
  const NOVAS = {
    pt: {
      // Quests Vivas
      quests_vivas:        "Quests Vivas",
      quests_subtitulo:    "Problemas reais da sua cidade viram monstros no mapa. Mobilize, fotografe antes/depois, derrote o monstro, ganhe SulCoin.",
      quests_criar_nova:   "🌳 Criar nova quest",
      quests_nenhuma:      "Nenhuma quest aberta. Seja o primeiro a marcar um problema na sua cidade.",
      quests_entrar:       "🌳 Entrar",
      quests_sair:         "🚪 Sair",
      quests_foto_antes:   "📷 ANTES",
      quests_foto_depois:  "📷 DEPOIS",
      quests_evidencias:   "Evidências",
      quests_sem_evid:     "Nenhuma foto ainda. Seja o primeiro.",
      // DOOH
      vitrine_inteligente: "Vitrine Inteligente",
      vitrine_sub:         "Mostre suas vibes pras lojas perto por 5 minutos. Você decide quando.",
      vitrine_marque:      "Marque suas vibes (opcional):",
      vitrine_ativar:      "📡 Ativar agora — 5 min",
      vitrine_cancelar:    "🛑 Cancelar agora (apaga registro)",
      vitrine_sem_lojas:   "Nenhuma loja DOOH ativa nas redondezas. Sua presença foi registrada por 5 min mesmo assim.",
      vitrine_ativa_qty:   "⏱️ Vitrine ativa por 5 min · {0} loja(s) perto",
      // Saques Pix
      saques_pix:          "Saques Pix",
      saques_sub:          "Receba em R$ o que vendeu nas suas barracas.",
      saques_disponivel:   "Disponível pra sacar",
      saques_solicitar:    "➕ Solicitar saque (mín. R$ 10,00)",
      saques_historico:    "Histórico",
      saques_nenhum:       "Nenhum saque ainda.",
      saques_novo:         "➕ Novo saque Pix",
      saques_chave:        "Chave Pix",
      saques_valor:        "Valor (R$)",
      // Validar recibo
      validar_recibo:      "🧾 Validar recibo da feira",
      validar_codigo:      "Código do recibo",
      validar_btn:         "✅ Validar",
      // Aurora classes/Carteira
      aurora_classes_btn:  "🎭 Ver papel real de cada classe (Fase 2)",
      aurora_inventario:   "🛡️ Inventário de Equipamentos",
      // Periodo filtros
      filtro_tudo:         "Tudo",
      filtro_hoje:         "Hoje",
      filtro_semana:       "7d",
      filtro_mes:          "30d",
      filtro_sempre:       "Sempre"
    },
    en: {
      quests_vivas:        "Living Quests",
      quests_subtitulo:    "Real problems in your city become monsters on the map. Mobilize, photograph before/after, defeat the monster, earn SulCoin.",
      quests_criar_nova:   "🌳 New quest",
      quests_nenhuma:      "No open quests. Be the first to flag a problem in your city.",
      quests_entrar:       "🌳 Join",
      quests_sair:         "🚪 Leave",
      quests_foto_antes:   "📷 BEFORE",
      quests_foto_depois:  "📷 AFTER",
      quests_evidencias:   "Evidence",
      quests_sem_evid:     "No photos yet. Be the first.",
      vitrine_inteligente: "Smart Showcase",
      vitrine_sub:         "Show your vibes to nearby stores for 5 minutes. You decide when.",
      vitrine_marque:      "Pick your vibes (optional):",
      vitrine_ativar:      "📡 Activate now — 5 min",
      vitrine_cancelar:    "🛑 Cancel now (deletes record)",
      vitrine_sem_lojas:   "No active DOOH stores nearby. Your presence was still recorded for 5 min.",
      vitrine_ativa_qty:   "⏱️ Showcase active for 5 min · {0} store(s) nearby",
      saques_pix:          "Pix Withdrawals",
      saques_sub:          "Withdraw in R$ what you sold at your stalls.",
      saques_disponivel:   "Available to withdraw",
      saques_solicitar:    "➕ Request withdrawal (min. R$ 10.00)",
      saques_historico:    "History",
      saques_nenhum:       "No withdrawals yet.",
      saques_novo:         "➕ New Pix withdrawal",
      saques_chave:        "Pix key",
      saques_valor:        "Amount (R$)",
      validar_recibo:      "🧾 Validate market receipt",
      validar_codigo:      "Receipt code",
      validar_btn:         "✅ Validate",
      aurora_classes_btn:  "🎭 See each class's real role (Phase 2)",
      aurora_inventario:   "🛡️ Equipment Inventory",
      filtro_tudo:         "All",
      filtro_hoje:         "Today",
      filtro_semana:       "7d",
      filtro_mes:          "30d",
      filtro_sempre:       "Always"
    },
    es: {
      quests_vivas:        "Misiones Vivas",
      quests_subtitulo:    "Problemas reales de tu ciudad se convierten en monstruos del mapa. Movilízate, fotografía antes/después, derrota al monstruo, gana SulCoin.",
      quests_criar_nova:   "🌳 Nueva misión",
      quests_nenhuma:      "Ninguna misión abierta. Sé el primero en marcar un problema en tu ciudad.",
      quests_entrar:       "🌳 Unirse",
      quests_sair:         "🚪 Salir",
      quests_foto_antes:   "📷 ANTES",
      quests_foto_depois:  "📷 DESPUÉS",
      quests_evidencias:   "Evidencias",
      quests_sem_evid:     "Aún sin fotos. Sé el primero.",
      vitrine_inteligente: "Vitrina Inteligente",
      vitrine_sub:         "Muestra tus vibes a las tiendas cercanas por 5 minutos. Tú decides cuándo.",
      vitrine_marque:      "Marca tus vibes (opcional):",
      vitrine_ativar:      "📡 Activar ahora — 5 min",
      vitrine_cancelar:    "🛑 Cancelar ahora (borra registro)",
      vitrine_sem_lojas:   "Ninguna tienda DOOH activa cerca. Tu presencia se registró igual por 5 min.",
      vitrine_ativa_qty:   "⏱️ Vitrina activa 5 min · {0} tienda(s) cerca",
      saques_pix:          "Retiros Pix",
      saques_sub:          "Recibe en R$ lo que vendiste en tus puestos.",
      saques_disponivel:   "Disponible para retirar",
      saques_solicitar:    "➕ Solicitar retiro (mín. R$ 10,00)",
      saques_historico:    "Historial",
      saques_nenhum:       "Aún sin retiros.",
      saques_novo:         "➕ Nuevo retiro Pix",
      saques_chave:        "Clave Pix",
      saques_valor:        "Valor (R$)",
      validar_recibo:      "🧾 Validar recibo de feria",
      validar_codigo:      "Código del recibo",
      validar_btn:         "✅ Validar",
      aurora_classes_btn:  "🎭 Ver el rol real de cada clase (Fase 2)",
      aurora_inventario:   "🛡️ Inventario de Equipos",
      filtro_tudo:         "Todo",
      filtro_hoje:         "Hoy",
      filtro_semana:       "7d",
      filtro_mes:          "30d",
      filtro_sempre:       "Siempre"
    }
  };
  if (window.VSI18n && VSI18n.STRINGS) {
    Object.assign(VSI18n.STRINGS.pt, NOVAS.pt);
    Object.assign(VSI18n.STRINGS.en, NOVAS.en);
    Object.assign(VSI18n.STRINGS.es, NOVAS.es);
  }
})();

// REST helpers (legados — usam VSSupabase agora)
async function sb(path, opts = {}) {
  // Compat com chamadas livres (URL crua) — repassa via VSSupabase.request
  return VSSupabase.request(path, opts);
}
const rpc = (fn, body) => VSSupabase.rpc(fn, body);

async function botApi(path, body = {}) {
  if (!BOT_API_URL) throw new Error("BOT_API_URL não configurado");
  const res = await fetch(`${BOT_API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, initData: tg?.initData || "" })
  });
  return res.json();
}

// Inicializa Edge Function da Litorânea (Llama via Supabase)
if (window.VSLitoraneaAI) {
  VSLitoraneaAI.init({
    supabaseUrl: window.VENTOSUL_CONFIG.SUPABASE_URL,
    anonJwt: window.VENTOSUL_CONFIG.SUPABASE_ANON_JWT
  });
}

// Inicializa Litorânea com nav handler local
VSLitoranea.init({
  supabase: VSSupabase,
  intencao: VSIntencao,
  i18n: VSI18n,
  praias: VSPraias,
  ai: window.VSLitoraneaAI || null,
  onNavegar: (acao) => {
    if (acao === "promocoes") abrirPromos();
    else if (acao === "barracas") abrirFeira();
    else if (acao === "mais_votados") abrirVotados();
    else if (acao === "caca") abrirCaca();
    else if (acao === "compras_coletiva") abrirColetiva();
    else if (acao === "praias") abrirPraias();
    else if (acao === "wallet") abrirWallet();
  }
});

// ─────────────────────────────────────────────────────────────
// Navegação
// ─────────────────────────────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(`screen-${name}`)?.classList.add("active");
  // Sempre começa no topo ao trocar de tela
  try { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); } catch { window.scrollTo(0, 0); }
  try { document.getElementById("main")?.scrollTo?.({ top: 0, behavior: "instant" }); } catch {}
  try { document.getElementById(`screen-${name}`)?.scrollTo?.({ top: 0, behavior: "instant" }); } catch {}
  document.querySelectorAll("#bottom-bar button").forEach(b =>
    b.classList.toggle("active", b.dataset.screen === name));
  // Troca o fundo da página conforme a tela (mesma lógica do MainScaffold.kt).
  // Preserva tema-claro se estiver ativo.
  const fundoPorTela = {
    landing: "tela-landing",
    city: "tela-city", praias: "tela-praia",
    litoranea: "tela-litoranea", chat: "tela-litoranea"
  };
  const erClaro = document.body.classList.contains("tema-claro");
  document.body.className = "";
  if (erClaro) document.body.classList.add("tema-claro");
  if (fundoPorTela[name]) document.body.classList.add(fundoPorTela[name]);
  // Persistência: lembra última tela pra o próximo boot abrir nela
  state.ultimaTela = name;
  savePrefs();
  // Histórico do header (back/forward)
  if (typeof navIr === "function") navIr(name);
  // Malha animada: opt-in (era principal causadora de trava em mobile médio).
  // Pra ativar, user precisa setar localStorage.vs_malha = "1". Caso contrário, fica off.
  const malhaOn = (() => { try { return localStorage.getItem("vs_malha") === "1"; } catch { return false; } })();
  if (malhaOn) {
    if (name === "litoranea") { try { _malhaTema = "litoranea"; malhaStart(); } catch {} }
    else if (name === "landing") { try { _malhaTema = "landing"; malhaStart(); } catch {} }
    else if (name === "aurora")  { try { _malhaTema = "litoranea"; malhaStart(); } catch {} }
    else { try { malhaStop(); } catch {} }
  } else {
    try { malhaStop(); } catch {}
  }
  if (location.hash !== `#${name}`) history.pushState({ name }, "", `#${name}`);
  if (tg) {
    if (name === "landing") tg.BackButton.hide();
    else { tg.BackButton.show(); tg.BackButton.onClick(() => showScreen("landing")); }
  }
  // Auto-hidrata carrossel de cidade se for o caso e ainda não tem fotos
  // Só re-hidrata se o carousel está COMPLETAMENTE vazio (sem nenhum filho)
  // para evitar loop infinito quando o fallback #222 está presente
  if (name === "city" && state.cidade) {
    const c = document.getElementById("carousel-city");
    const vazio = !c || c.children.length === 0;
    if (vazio && typeof abrirCidade === "function") {
      // Re-hidrata sem trocar tela (já estamos em city)
      setTimeout(() => abrirCidade().catch(()=>{}), 50);
    }
  }
}
window.addEventListener("popstate", e => {
  const n = e.state?.name || "landing";
  // Se voltando pra city e temos cidade salva, re-hidrata os dados
  if (n === "city" && state.cidade && typeof abrirCidade === "function") {
    abrirCidade().catch(() => showScreen("landing"));
    return;
  }
  // Volta/avanca precisa RE-RENDERIZAR a tela, nao so trocar a classe:
  // telas montadas por JS (comercio, wallet, perto...) voltavam vazias.
  try { Promise.resolve(abrirTela(n)).catch(() => showScreen(n)); }
  catch { showScreen(n); }
});

// ─────────────────────────────────────────────────────────────
// 🏛️ ADESÃO MUNICIPAL (#adesao)
// ─────────────────────────────────────────────────────────────
const SECRETARIAS_OPCS = [
  "Meio Ambiente","Saúde","Educação","Cultura","Turismo","Inovação",
  "Assistência Social","Esporte","Trabalho","Planejamento Urbano"
];
window.abrirAdesao = function() {
  showScreen("adesao");
  const div = document.getElementById("ad-secretarias");
  if (div && !div.children.length) {
    div.innerHTML = SECRETARIAS_OPCS.map(s => `
      <label style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.10);border-radius:6px;cursor:pointer">
        <input type="checkbox" name="ad-sec" value="${escapeHtml(s)}">${escapeHtml(s)}
      </label>`).join("");
  }
  const titulo = tr("adesao_municipal_titulo");
  document.title = titulo;
  _setOG("og:title", titulo);
  _setOG("og:description", "Sua cidade pode integrar o Vento Sul como ferramenta cívica de impacto social. Contrato pré-redigido com cláusulas LGPD.");
};

window.enviarAdesao = async function() {
  const get = id => document.getElementById(id)?.value?.trim() || "";
  const dados = {
    p_municipio: get("ad-mun"),
    p_estado: get("ad-est"),
    p_cnpj: get("ad-cnpj") || null,
    p_populacao: parseInt(get("ad-pop"), 10) || null,
    p_rep_nome: get("ad-rep-nome"),
    p_rep_email: get("ad-rep-email"),
    p_rep_tel: get("ad-rep-tel") || null,
    p_rep_cargo: get("ad-rep-cargo") || null,
    p_secretarias: Array.from(document.querySelectorAll('input[name="ad-sec"]:checked')).map(i => i.value),
    p_interesses: [],
    p_observacoes: get("ad-obs") || null
  };
  if (!dados.p_municipio || !dados.p_estado || !dados.p_rep_nome || !dados.p_rep_email) {
    alert(tr("adesao_campos_obrig"));
    return;
  }
  await VSSupabase.ensureSession?.();
  try {
    const id = await VSSupabase.rpc("criar_adesao", dados);
    const idStr = typeof id === "string" ? id : (Array.isArray(id) ? id[0] : id);
    document.getElementById("adesao-resultado").innerHTML = `
      <div class="card-info" style="padding:18px;border-left:4px solid #4caf50">
        <strong style="font-size:16px;color:#4caf50">✓ Adesão recebida</strong>
        <p style="font-size:13px;line-height:1.5;margin:8px 0">
          Protocolo: <code style="font-family:monospace">${escapeHtml(String(idStr).slice(0, 8))}</code><br>
          Em breve enviaremos o <strong>contrato pré-redigido em PDF</strong> pro email <strong>${escapeHtml(dados.p_rep_email)}</strong>.
        </p>
        <button class="btn-primary" style="background:rgba(13,114,62,0.55)" onclick="gerarContratoAdesao('${escapeHtml(String(idStr))}')">📄 Baixar contrato preview agora</button>
      </div>`;
    document.getElementById("adesao-form").reset();
  } catch (e) {
    document.getElementById("adesao-resultado").innerHTML = `
      <div class="card-info" style="padding:14px;border-left:4px solid #f44">
        <strong style="color:#f44">Erro</strong>
        <p style="font-size:13px;margin:6px 0 0">${escapeHtml(e.message || String(e))}</p>
      </div>`;
  }
};

window.gerarContratoAdesao = function(id) {
  // Geração de PDF pelo cliente (jsPDF) — vai pra próxima task. Por enquanto, gera um TXT/HTML printable.
  const w = window.open("", "_blank");
  if (!w) { alert(tr("contrato_habilite_popup")); return; }
  const mun = document.getElementById("ad-mun")?.value || "(município)";
  const rep = document.getElementById("ad-rep-nome")?.value || "(representante)";
  const data = new Date().toLocaleDateString("pt-BR");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Contrato Adesão · ${mun}</title>
    <style>body{font-family:Georgia,serif;max-width:760px;margin:40px auto;padding:30px;line-height:1.6;color:#222}
    h1{text-align:center;border-bottom:2px solid #333;padding-bottom:10px}
    h2{margin-top:24px;color:#0a3a5a}
    .footer{margin-top:60px;border-top:1px solid #999;padding-top:20px;font-size:12px;color:#666;text-align:center}
    @media print{button{display:none}}
    </style></head><body>
    <button onclick="window.print()" style="float:right;padding:10px 18px;background:#0d723e;color:#fff;border:none;border-radius:6px;cursor:pointer">🖨️ Imprimir / Salvar PDF</button>
    <h1>TERMO DE COOPERAÇÃO TÉCNICA</h1>
    <p style="text-align:center"><em>Vento Sul · Programa Municipal de Cidadania Digital</em></p>
    <h2>Partes</h2>
    <p><strong>Vento Sul</strong>, doravante "PROVEDORA", desenvolvedora da plataforma cívica
    digital sediada em www.vento-sul.tech.</p>
    <p><strong>${escapeHtml(mun)}</strong>, doravante "MUNICÍPIO", representado por
    <strong>${escapeHtml(rep)}</strong>, na presente data ${data}.</p>
    <h2>Cláusula 1 — Objeto</h2>
    <p>O presente termo tem por objeto a integração da plataforma Vento Sul ao
    município, fornecendo ferramentas cívicas digitais (Mapa Colaborativo de Cidadania,
    Selo de Cidadania, Roteiro Cultural Geolocalizado, Trilha Aurora, Vitrines
    Comunitárias Inteligentes) sem ônus financeiro pra prefeitura.</p>
    <h2>Cláusula 2 — Base Legal</h2>
    <p>Cooperação fundamentada em: Lei 13.019/2014 (parcerias com OSC), Lei 13.709/2018
    (LGPD), Resolução BCB 4.122/2012 (moedas sociais comunitárias), Marco Legal Startups (LC 182/2021)
    (solidariedade mútua) e ODS 11 (Cidades Sustentáveis) e 17 (Parcerias).</p>
    <h2>Cláusula 3 — LGPD</h2>
    <p>Dados pessoais coletados são minimizados, anonimizados quando possível,
    armazenados em infraestrutura ISO 27001, com canal explícito de exclusão e DPO
    responsável (privacy@vento-sul.tech).</p>
    <h2>Cláusula 4 — Indicadores de Impacto</h2>
    <p>O município receberá relatório mensal automatizado com KPIs cívicos:
    cidadãos engajados, ações resolvidas, impacto agregado por ODS, fotos antes/depois
    de intervenções públicas.</p>
    <h2>Cláusula 5 — Responsabilidade do Cidadão Usuário</h2>
    <p>Toda pessoa que publica conteúdo (textos, fotos, vídeos, ações cívicas,
    avaliações de comércio, comentários) na plataforma Vento Sul é <strong>civil e
    criminalmente responsável</strong> por seus atos, nos termos do Marco Civil da
    Internet (Lei 12.965/2014, art. 19) e Código Civil (Lei 10.406/2002, art. 186 e
    187). A PROVEDORA mantém moderação ativa e remove conteúdo ilícito mediante
    notificação fundamentada, mas não responde objetivamente por atos de terceiros.
    O cidadão usuário aceita estes termos ao se cadastrar.</p>
    <h2>Cláusula 6 — Vigência</h2>
    <p>Renovação automática anual, rescindível por qualquer das partes com 30 dias
    de aviso prévio, sem multa.</p>
    <div class="footer">
      Protocolo de adesão: ${escapeHtml(id)}<br>
      ${data} · Florianópolis · Vento Sul
    </div>
    </body></html>`);
  w.document.close();
};

// Roteador de hash pra URLs públicas (#painel/<cidade>, #cidade/<slug>, #bairro/<cidade>/<slug>)
function _hashRouter() {
  const h = location.hash || "";
  // Rotas sem parâmetro
  if (h === "#adesao" && typeof abrirAdesao === "function") { abrirAdesao(); return true; }
  const m = h.match(/^#(painel|cidade|bairro)\/(.+)$/);
  if (!m) return false;
  const tipo = m[1];
  const partes = m[2].split("/").map(decodeURIComponent);
  if (tipo === "painel" && typeof abrirPainelCidade === "function") {
    abrirPainelCidade(partes[0]);
    return true;
  }
  if (tipo === "cidade" && typeof abrirCidadePublica === "function") {
    abrirCidadePublica(partes[0]);
    return true;
  }
  if (tipo === "bairro" && typeof abrirBairroPublico === "function") {
    abrirBairroPublico(partes[0], partes[1]);
    return true;
  }
  return false;
}

// Telas do app pelo hash (#comercio, #wallet, #perto...) — link direto e
// hashchange manual. Nao reabre a tela que ja esta ativa (evita render duplo).
function _hashRouterTela() {
  const t = _telaDoHash();
  if (!t) return false;
  const sec = document.getElementById(`screen-${t}`);
  if (!sec || sec.classList.contains("active")) return false;
  try { Promise.resolve(abrirTela(t)).catch(() => showScreen(t)); } catch { showScreen(t); }
  return true;
}
// Nome de tela valido embutido no hash, ou "" se o hash nao for de tela.
function _telaDoHash() {
  const t = (location.hash || "").slice(1);
  if (!/^[a-z][a-z0-9-]*$/.test(t)) return "";
  return document.getElementById(`screen-${t}`) ? t : "";
}
window.addEventListener("hashchange", () => { _hashRouter() || _hashRouterTela(); });
// Dispara no boot se URL já vem com hash dessas rotas
setTimeout(_hashRouter, 50);

// ─────────────────────────────────────────────────────────────
// Carrossel auto-rotativo (todos os carrosseis ganham movimento)
// Usa VSCarousel.criar() do shared/. Cada elemento tem seu controller.
// ─────────────────────────────────────────────────────────────
const _carousels = new Map();

function renderCarousel(el, fotos, opts = {}) {
  if (!el) return;
  // Para o anterior se existir
  const old = _carousels.get(el);
  if (old) old.parar();
  if (!fotos?.length) {
    el.innerHTML = `<div class="carousel-item" style="background:#222"></div>`;
    _carousels.delete(el);
    return;
  }
  const c = VSCarousel.criar(el, {
    fotos,
    intervaloMs: opts.intervaloMs || 9000,
    modo: opts.modo || "fade",
    shuffle: opts.shuffle !== false
  });
  c.iniciar();
  _carousels.set(el, c);
}

// ─────────────────────────────────────────────────────────────
// Tela 1 — Landing
// ─────────────────────────────────────────────────────────────
async function initLanding() {
  // Landing: pega 20 fotos do escopo geral pra rodar com fade
  const fotos = await sb("v_carrossel_landing_geral?select=foto_url,titulo,subtitulo&order=ordem&limit=20")
    .catch(() => []);
  renderCarousel(document.getElementById("carousel-landing"), fotos, { intervaloMs: 10000 });

  const selEstado = document.getElementById("select-estado");
  const selCidade = document.getElementById("select-cidade");
  const cidBlock  = document.getElementById("cidade-block");
  const btnEntrar = document.getElementById("btn-entrar");

  // Popula estados via VSCidades
  selEstado.innerHTML = `<option value="">— ${tr("escolha_estado")} —</option>` +
    VSCidades.ESTADOS.map(e => `<option ${e===state.estado?"selected":""}>${e}</option>`).join("");

  if (state.estado) {
    cidBlock.style.display = "block";
    selCidade.innerHTML = `<option value="">— ${tr("escolha_cidade")} —</option>` +
      VSCidades.cidadesDe(state.estado).map(c => `<option ${c===state.cidade?"selected":""}>${c}</option>`).join("");
    if (state.cidade) btnEntrar.disabled = false;
  }

  const locBlock  = document.getElementById("localidade-block");
  const selLoc    = document.getElementById("select-localidade");

  function _esconderLocalidade() {
    if (locBlock) locBlock.style.display = "none";
    if (selLoc)   selLoc.innerHTML = '<option value="">— toda a cidade —</option>';
    state.sublocal = null;
  }

  async function _popularLocalidades(cidade, estado) {
    if (!locBlock || !selLoc) return;
    selLoc.innerHTML = '<option value="">— toda a cidade —</option>';
    try {
      const _anon = (window.VENTOSUL_CONFIG && (window.VENTOSUL_CONFIG.SUPABASE_ANON_JWT || SUPABASE_ANON));
      const subs = await fetch(`${SUPABASE_URL}/rest/v1/localidades?select=tipo,sublocal&cidade=eq.${enc(cidade)}&estado=eq.${enc(estado)}&sublocal=not.is.null&order=tipo,sublocal&limit=200`, { headers: { apikey: _anon, Authorization: "Bearer " + _anon } }).then(r => r.ok ? r.json() : []).catch(() => []);
      if (!subs || !subs.length) { locBlock.style.display = "none"; return; }
      const grupos = { praia: [], bairro: [], atração: [], histórico: [], outros: [] };
      for (const s of subs) {
        const t = (s.tipo || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu,"");
        const k = ["praia","bairro","atracao","historico"].find(x => t.startsWith(x)) || "outros";
        (grupos[k] || grupos.outros).push(s.sublocal);
      }
      const LABELS = { praia:"🏖️ Praias", bairro:"🏘️ Bairros", atracao:"⭐ Atrações", historico:"🏛️ Históricos", outros:"📌 Outros" };
      for (const [k, arr] of Object.entries(grupos)) {
        if (!arr.length) continue;
        const og = document.createElement("optgroup");
        og.label = LABELS[k];
        [...new Set(arr)].forEach(n => { const o = document.createElement("option"); o.textContent = n; og.appendChild(o); });
        selLoc.appendChild(og);
      }
      locBlock.style.display = "block";
    } catch { locBlock.style.display = "none"; }
  }

  selEstado.addEventListener("change", () => {
    state.estado = selEstado.value;
    _esconderLocalidade();
    if (!state.estado) { cidBlock.style.display = "none"; btnEntrar.disabled = true; return; }
    cidBlock.style.display = "block";
    selCidade.innerHTML = `<option value="">— ${tr("escolha_cidade")} —</option>` +
      VSCidades.cidadesDe(state.estado).map(c => `<option>${c}</option>`).join("");
    btnEntrar.disabled = true;
  });
  selCidade.addEventListener("change", async () => {
    state.cidade = selCidade.value;
    _esconderLocalidade();
    btnEntrar.disabled = !state.cidade;
    if (state.cidade) await _popularLocalidades(state.cidade, state.estado);
    if (typeof atualizarEstrelaCidade === "function") atualizarEstrelaCidade();
  });
  if (selLoc) selLoc.addEventListener("change", () => { state.sublocal = selLoc.value || null; });
  btnEntrar.addEventListener("click", () => {
    if (state.estado && state.cidade) {
      state.sublocal = selLoc?.value || null;
      savePrefs(); VSPraias.limparCache(); abrirCidade(state.sublocal || null);
    }
  });

  // FIX mobile: se estado+cidade já vêm salvos, popula as praias JÁ na entrada
  // (antes só carregava ao TROCAR a cidade — dropdown de praia não aparecia)
  if (state.cidade && state.estado) { try { _popularLocalidades(state.cidade, state.estado); } catch (e) {} }
}

// ─────────────────────────────────────────────────────────────
// Tela 2 — CityHome
// ─────────────────────────────────────────────────────────────
// Sublocais com PÁGINA DEDICADA → abre ela direto (em vez da visão genérica).
// Fonte única: usada tanto pelo dropdown (abrirCidade) quanto pelos favoritos.
function paginaDedicadaDe(nome) {
  const PAGINAS_DEDICADAS = { "barra da lagoa": "/barra-da-lagoa.html" };
  const chave = (nome || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
  return PAGINAS_DEDICADAS[chave] || null;
}
async function abrirCidade(sublocal = null) {
  if (sublocal) {
    const pag = paginaDedicadaDe(sublocal);
    if (pag) { location.href = pag; return; }
  }
  showScreen("city");
  state.sublocal = sublocal;
  const tituloBase = `${state.cidade} · ${state.estado}`;
  document.getElementById("city-title").textContent = sublocal ? `${sublocal} · ${state.cidade}` : tituloBase;
  if (typeof atualizarEstrelaCidade === "function") atualizarEstrelaCidade();
  // Placeholder imediato no carrossel — aparece enquanto fotos carregam
  const _carEl = document.getElementById("carousel-city");
  if (_carEl && !_carEl.children.length) {
    _carEl.innerHTML = `<div class="carousel-item" style="background:linear-gradient(135deg,#0c2638,#1a5472);display:flex;align-items:center;justify-content:center"><span style="color:rgba(255,255,255,0.55);font-size:17px;font-weight:500">🌊 ${escapeHtml(state.cidade)}</span></div>`;
  }
  // Dropdown não bloqueia o carregamento principal
  _popularDropdownSublocais();

  // === REPLICA o nativo CityHomeScreen.kt ===
  // 1 carrossel cidade (5s) → ActionGrid 6 → Carrossel mais votados → ResumoLugar
  // FONTE PRIMÁRIA: fotos_locais (todas as fotos REAIS daquela cidade — atrações,
  // bairros, praias, históricos, produtoras). Antes usava só v_praias_cidade,
  // o que dava em fallback de praia genérica pra cidades de interior (Morretes etc).
  const [fotosCidade, votados, parceiros] = await Promise.all([
    // Usa RPC rotativa: prioriza likes + foto menos vista = curadoria distribuída
    VSSupabase.rpc("fotos_lugar_rotativas", {
      p_estado: state.estado, p_cidade: state.cidade, p_n: 20
    }).catch(() => []),
    sb(`v_mais_votados_cidade?select=alvo_nome,alvo_categoria,alvo_emoji,alvo_foto_url,votos&estado=eq.${enc(state.estado)}&cidade=eq.${enc(state.cidade)}&order=votos.desc&limit=10`).catch(() => []),
    sb(`feira_barracas?select=nome,categoria,telhado_url,plano&estado=eq.${enc(state.estado)}&cidade=eq.${enc(state.cidade)}&dono_uuid=not.is.null&ativa=eq.true&telhado_url=not.is.null&limit=10`).catch(() => [])
  ]);

  // === Carrossel topo: parceiros + fotos REAIS da cidade (sem fallback de praia genérica) ===
  const fotosParceiros = (parceiros || []).map(b => ({
    foto_url: b.telhado_url,
    titulo: `🏪 ${b.nome}`,
    subtitulo: b.categoria || "Parceiro Vento Sul"
  }));
  const fotosLocais = (fotosCidade || []).map(f => ({
    id: f.foto_id,                      // ⭐ habilita botão ❤️ no carrossel
    foto_url: f.foto_url,
    titulo: f.sublocal ? `📍 ${f.sublocal}` : `📍 ${state.cidade}`,
    subtitulo: f.atribuicao ? f.atribuicao.slice(0, 70) : state.cidade,
    likes: f.likes,
    eu_curti: f.eu_curti
  }));
  let fotosTopo = [...fotosParceiros, ...fotosLocais];
  // Só cai no carrossel "Sul do Brasil" se a cidade não tem NADA — e ainda assim,
  // marca como "vitrine do Sul" pra não confundir o usuário achando que é foto da cidade.
  if (fotosTopo.length === 0) {
    const geral = await sb("v_carrossel_landing_geral?select=foto_url,titulo,subtitulo&order=ordem&limit=12").catch(() => []);
    fotosTopo = (geral || []).map(g => ({
      foto_url: g.foto_url,
      titulo: `🌎 ${g.titulo || ""}`,
      subtitulo: `Vitrine do Sul · ${g.subtitulo || ""}`
    }));
  }
  renderCarousel(document.getElementById("carousel-city"), fotosTopo,
    { intervaloMs: 5000, modo: "fade" });

  // === Carrossel Mais Votados (banner single, igual CarrosselMaisVotadosBanner) ===
  let fotosVot = (votados || []).filter(v => v.alvo_foto_url).map(v => ({
    foto_url: v.alvo_foto_url,
    titulo: `${v.alvo_emoji || "⭐"} ${v.alvo_nome}`,
    subtitulo: `${v.alvo_categoria || ""} • ⭐ ${v.votos} votos`
  }));
  if (fotosVot.length === 0 && fotosLocais.length) {
    fotosVot = fotosLocais.slice(0, 6).map(p => ({
      foto_url: p.foto_url, titulo: p.titulo, subtitulo: tr("votos_vote_curtir")
    }));
  }
  if (fotosVot.length === 0) {
    fotosVot = [{ foto_url: "bg/bg_praia_crystal.webp",
                  titulo: "⭐ " + tr("votos_sem_votos"), subtitulo: tr("votos_vote_curtir") }];
  }
  renderCarousel(document.getElementById("carousel-votados"), fotosVot,
    { modo: "single", intervaloMs: 5000 });

  // === ResumoLugar — descrição + telefones úteis (igual ResumoLugar.kt) ===
  renderResumoLugar(state.cidade, state.estado);
}

function renderResumoLugar(cidade, estado) {
  const div = document.getElementById("resumo-lugar");
  if (!div) return;
  div.innerHTML = `
    <h3 style="margin-top:0">📍 Sobre ${escapeHtml(cidade)}</h3>
    <p style="font-size:13px;line-height:1.5">
      ${escapeHtml(cidade)} é uma das cidades do Sul do Brasil em ${escapeHtml(estado)}.
      Conheça as praias, comércio local, eventos e atrações na sua tela inicial.
    </p>
    <h4 style="margin:14px 0 6px;font-size:13px;color:var(--primary)">📞 ${tr("resumo_telefones_uteis")}</h4>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
      <div>🚒 ${tr("tel_bombeiros")}: <strong>193</strong></div>
      <div>🚑 Samu: <strong>192</strong></div>
      <div>🚓 ${tr("tel_policia")}: <strong>190</strong></div>
      <div>🆘 ${tr("tel_defesa_civil")}: <strong>199</strong></div>
    </div>`;
  // Tenta carregar dados extras de cidades_info
  sb(`cidades_info?cidade=eq.${enc(cidade)}&estado=eq.${enc(estado)}&select=descricao,gastronomia,festas,tel_prefeitura,tel_turismo`)
    .then(arr => {
      const info = arr?.[0]; if (!info) return;
      let extras = "";
      if (info.descricao) extras += `<p style="font-size:13px;line-height:1.5;margin-top:8px">${escapeHtml(info.descricao)}</p>`;
      if (info.gastronomia) extras += `<p style="font-size:12px;margin-top:6px"><strong>🍽️ ${tr("resumo_gastronomia")}:</strong> ${escapeHtml(info.gastronomia)}</p>`;
      if (info.festas) extras += `<p style="font-size:12px"><strong>🎉 ${tr("resumo_festas")}:</strong> ${escapeHtml(info.festas)}</p>`;
      const tels = [];
      if (info.tel_prefeitura) tels.push(`<div>🏛️ ${tr("tel_prefeitura")}: <strong>${escapeHtml(info.tel_prefeitura)}</strong></div>`);
      if (info.tel_turismo)    tels.push(`<div>🧳 ${tr("tel_turismo")}: <strong>${escapeHtml(info.tel_turismo)}</strong></div>`);
      const grid = div.querySelector("div[style*='grid']");
      if (grid && tels.length) grid.insertAdjacentHTML("afterbegin", tels.join(""));
      // Insere a descrição rica antes dos telefones
      const h3 = div.querySelector("h3");
      const p = div.querySelector("p");
      if (extras && p) p.outerHTML = extras;
    }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────
// Tela 3 — Feira
// ─────────────────────────────────────────────────────────────
async function abrirFeira() {
  showScreen("feira");
  const grid = document.getElementById("grid-barracas");
  grid.innerHTML = `<div class="loading">…</div>`;
  const barracas = await sb("v_feira_barracas_ativas?select=id,nome,categoria,descricao,telhado_url,dono_uuid,qtd_produtos,lat,lng,cidade,estado&order=ordem").catch(() => []);
  if (!barracas.length) { grid.innerHTML = `<div class="loading">${tr("sem_barraca")}</div>`; return; }
  grid.innerHTML = barracas.map(b => `
    <div class="barraca-card" data-id="${b.id}">
      ${b.telhado_url
        ? `<div class="telhado" style="background-image:url('${b.telhado_url}')"></div>`
        : `<div class="telhado placeholder"></div>`}
      ${!b.dono_uuid ? `<span class="livre">${tr("livre")}</span>` : ""}
      <div class="info">
        <div class="nome">${escapeHtml(b.nome)}</div>
        <div class="cat">${escapeHtml(b.categoria || "—")}</div>
        ${b.qtd_produtos > 0 ? `<div class="cat" style="color:#4caf50">${b.qtd_produtos}</div>` : ""}
      </div>
    </div>`).join("");
  grid.querySelectorAll(".barraca-card").forEach(c => c.addEventListener("click", () =>
    abrirBarraca(barracas.find(x => x.id === c.dataset.id))));
}

async function abrirBarraca(b) {
  state.barraca = b;
  showScreen("barraca");
  // Registra view (não bloqueia abertura se falhar)
  try { VSSupabase.rpc("registrar_evento_barraca", { p_barraca_id: b.id, p_tipo: "view", p_origem: "feira" }); } catch {}
  document.getElementById("barraca-telhado").style.backgroundImage =
    b.telhado_url ? `url('${b.telhado_url}')` : "";
  document.getElementById("barraca-nome").textContent = b.nome;
  document.getElementById("barraca-descricao").textContent = b.descricao || "";
  document.getElementById("barraca-livre").style.display = b.dono_uuid ? "none" : "block";

  // Botão "Como chegar" — só mostra se a barraca tem coordenadas
  let btnRota = document.getElementById("barraca-rota");
  if (b.lat != null && b.lng != null) {
    if (!btnRota) {
      btnRota = document.createElement("button");
      btnRota.id = "barraca-rota";
      btnRota.className = "btn-primary";
      btnRota.style.cssText = "margin:8px 0;background:rgba(13,114,62,0.55)";
      const desc = document.getElementById("barraca-descricao");
      desc?.parentElement?.insertBefore(btnRota, desc.nextSibling);
    }
    btnRota.textContent = "🧭 " + tr("como_chegar");
    btnRota.onclick = () => comoChegar({ lat: b.lat, lng: b.lng, nome: b.nome, categoria: b.categoria });
    btnRota.style.display = "block";
  } else if (btnRota) {
    btnRota.style.display = "none";
  }

  const produtos = await sb(`feira_produtos?select=id,nome,descricao,foto_url,preco_centavos,sulcoins&barraca_id=eq.${b.id}&disponivel=eq.true&order=ordem`).catch(() => []);
  const cont = document.getElementById("barraca-produtos");
  if (!produtos.length) { cont.innerHTML = `<p style="color:var(--hint)">—</p>`; return; }
  cont.innerHTML = produtos.map(p => `
    <div class="produto">
      ${p.foto_url
        ? `<img src="${p.foto_url}" alt="" loading="lazy">`
        : `<div style="width:56px;height:56px;background:#444;border-radius:6px;display:flex;align-items:center;justify-content:center">🛍️</div>`}
      <div class="info">
        <strong>${escapeHtml(p.nome)}</strong>
        <small>${escapeHtml(p.descricao || "")}</small>
      </div>
      <div class="preco">
        ${p.preco_centavos ? `R$ ${(p.preco_centavos/100).toFixed(2)}` : ""}
        ${p.sulcoins ? `<br><span style="color:#ffb300">${p.sulcoins} SC</span>` : ""}
        ${p.preco_centavos ? `<br><button class="btn-pix" data-id="${p.id}" data-nome="${escapeHtml(p.nome)}" data-preco="${p.preco_centavos}" style="margin-top:4px;padding:4px 8px;font-size:11px;background:#0d723e;color:#fff;border:none;border-radius:4px">${tr("receber_pix")}</button>` : ""}
      </div>
    </div>`).join("");
  cont.querySelectorAll(".btn-pix").forEach(btn => btn.addEventListener("click", () => gerarPix(btn.dataset)));
}

// ─────────────────────────────────────────────────────────────
// Tela 5 — Mais Votados
// ─────────────────────────────────────────────────────────────
async function abrirVotados() {
  showScreen("votados");
  const cont = document.getElementById("lista-votados");
  if (!state.cidade) { cont.innerHTML = `<p style="color:var(--hint)">${tr("escolha_cidade")}</p>`; return; }
  const itens = await sb(`v_mais_votados_cidade?select=alvo_nome,alvo_categoria,alvo_emoji,alvo_lat,alvo_lng,votos&estado=eq.${enc(state.estado)}&cidade=eq.${enc(state.cidade)}&order=votos.desc&limit=20`).catch(() => []);
  // 🗺️ Comércios da região (dados públicos OpenStreetMap) — rótulo honesto,
  // NUNCA votos inventados. Vitrine do que existe + convite pro dono assumir.
  let osmRegiao = [];
  try {
    const offAle = Math.floor(Math.random() * 400);
    osmRegiao = await sb(`comercios_osm?select=id,nome,categoria&nome=not.is.null&order=id&limit=6&offset=${offAle}`);
  } catch (e) { osmRegiao = []; }
  const htmlRegiao = (osmRegiao && osmRegiao.length) ? (
    `<div style="margin:18px 0 8px;font-weight:800;color:var(--hint);font-size:12px">🗺️ Comércios da região — estão no mapa (dados públicos), ainda sem votos</div>` +
    osmRegiao.map(c => `
    <div class="list-card" onclick="location.href='/comercio.html?osm=${c.id}'" style="cursor:pointer">
      <div class="emoji">🏪</div>
      <div class="info">
        <strong>${escapeHtml(c.nome)}</strong>
        <small>${escapeHtml(c.categoria || "comércio")} · toque pra ver a página</small>
      </div>
      <div class="votos"><span style="font-size:11px;color:var(--hint)">no mapa</span></div>
    </div>`).join("") +
    `<a class="list-card" href="/comerciante-planos.html" style="text-decoration:none;justify-content:center;background:rgba(13,114,62,.35)"><strong>🙋 É seu? Vitrine grátis + planos a partir de R$1</strong></a>`
  ) : "";
  if (!itens.length) { cont.innerHTML = `<p style="color:var(--hint)">${tr("sem_voto")}</p>` + htmlRegiao; return; }
  cont.innerHTML = htmlRegiao_prefix_votados(itens) + htmlRegiao;
  function htmlRegiao_prefix_votados(itens) { return itens.map((v, i) => {
    const temCoord = v.alvo_lat != null && v.alvo_lng != null;
    return `
    <div class="list-card" data-idx="${i}">
      <div class="emoji">${v.alvo_emoji || "⭐"}</div>
      <div class="info">
        <strong>${escapeHtml(v.alvo_nome)}</strong>
        <small>${escapeHtml(v.alvo_categoria || "—")}</small>
      </div>
      <div class="votos" style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span>⭐ ${v.votos}</span>
        ${temCoord ? `<button class="btn-rota" data-idx="${i}" style="padding:4px 8px;font-size:11px;background:rgba(13,114,62,0.65);color:#fff;border:none;border-radius:5px;cursor:pointer">🧭 Como chegar</button>` : ""}
      </div>
    </div>`;
  }).join(""); }
  cont.querySelectorAll(".btn-rota").forEach(btn => btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const idx = parseInt(btn.dataset.idx, 10);
    const it = itens[idx];
    comoChegar({ lat: it.alvo_lat, lng: it.alvo_lng, nome: it.alvo_nome, categoria: it.alvo_categoria });
  }));
}

// ─────────────────────────────────────────────────────────────
// Tela 6 — Promoções
// ─────────────────────────────────────────────────────────────
async function abrirPromos() {
  showScreen("promos");
  const cont = document.getElementById("lista-promos");
  if (!state.cidade) { cont.innerHTML = `<p style="color:var(--hint)">${tr("escolha_cidade")}</p>`; return; }
  const itens = await sb(`v_propagandas_cidade_hoje?select=titulo,subtitulo,foto_url&estado=eq.${enc(state.estado)}&cidade=eq.${enc(state.cidade)}&limit=20`).catch(() => []);
  if (!itens.length) { cont.innerHTML = `<p style="color:var(--hint)">${tr("sem_promo")}</p>`; return; }
  cont.innerHTML = itens.map(p => `
    <div class="list-card" style="flex-direction:column;align-items:stretch">
      ${p.foto_url ? `<img src="${p.foto_url}" loading="lazy" style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:6px">` : ""}
      <div>
        <strong style="font-size:14px">${escapeHtml(p.titulo || tr("promos_anuncio"))}</strong>
        <small style="display:block;color:var(--hint)">${escapeHtml(p.subtitulo || "")}</small>
      </div>
    </div>`).join("");
}

// ─────────────────────────────────────────────────────────────
// Tela 7 — Caça ao Tesouro (geo)
// ─────────────────────────────────────────────────────────────
// ─── Rosinha estado da caça ───────────────────────────────────────────────
let _cacaWatchId = null;
let _cacaWaypoints = [];
let _cacaPos = null;
let _cacaAlvoIdx = 0;

function _rosinhaCorDist(d) {
  if (d == null) return { cor: '#06b6d4', ring: 'rgba(6,182,212,0.5)', fala: tr("rosinha_calculando") };
  if (d <= 30)   return { cor: '#10b981', ring: 'rgba(16,185,129,0.8)', fala: tr("rosinha_achou") };
  if (d <= 80)   return { cor: '#ffd54f', ring: 'rgba(255,213,79,0.9)',  fala: `Quente! Só ${Math.round(d)}m!` };
  if (d <= 200)  return { cor: '#f59e0b', ring: 'rgba(245,158,11,0.7)',  fala: `Esquentando… ${Math.round(d)}m` };
  if (d <= 500)  return { cor: '#ef4444', ring: 'rgba(239,68,68,0.6)',   fala: `${Math.round(d)}m — continua navegando!` };
  return { cor: '#a855f7', ring: 'rgba(168,85,247,0.4)', fala: `${d >= 1000 ? (d/1000).toFixed(1)+'km' : Math.round(d)+'m'} — a aventura chama!` };
}

function _bearingTo(lat1, lng1, lat2, lng2) {
  const toRad = x => x * Math.PI / 180;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

function _atualizarRosinhaCaca(pos) {
  _cacaPos = pos;
  const alvo = _cacaWaypoints[_cacaAlvoIdx];
  if (!alvo) return;
  const d = VSPraias.distanceMetros(pos.latitude, pos.longitude, alvo.lat, alvo.lng);
  const dentro = d <= (alvo.raio_m || 50);
  const { cor, ring, fala } = _rosinhaCorDist(d);
  const bearing = _bearingTo(pos.latitude, pos.longitude, alvo.lat, alvo.lng);

  // Atualiza agulha da bússola
  const ponteiro = document.getElementById('rc-ponteiro');
  if (ponteiro) ponteiro.style.transform = `rotate(${bearing}deg)`;

  // Cor do anel pulsante
  const glow = document.getElementById('rc-glow');
  if (glow) { glow.style.background = `radial-gradient(circle at 50% 45%, ${cor} 0%, transparent 65%)`; }
  const ringEl = document.getElementById('rc-ring');
  if (ringEl) ringEl.style.borderColor = ring;

  // Fala da Rosinha
  const falaEl = document.getElementById('rc-fala');
  if (falaEl) falaEl.textContent = fala;

  // Distância na parada ativa
  const distEl = document.getElementById(`rc-dist-${_cacaAlvoIdx}`);
  if (distEl) {
    distEl.textContent = `📍 ${d < 1000 ? Math.round(d)+'m' : (d/1000).toFixed(1)+'km'}`;
    distEl.style.color = cor;
  }

  // Botão "Cheguei!" aparece quando dentro do raio
  const chegBtn = document.getElementById(`rc-cheg-${_cacaAlvoIdx}`);
  if (chegBtn) chegBtn.style.display = dentro ? 'block' : 'none';
}

function _renderRosinhaCaca(waypoints, pos) {
  const alvo = waypoints[_cacaAlvoIdx] || waypoints[0];
  const d = pos && alvo ? VSPraias.distanceMetros(pos.latitude, pos.longitude, alvo.lat, alvo.lng) : null;
  const { cor, fala } = _rosinhaCorDist(d);
  const bearing = (pos && alvo) ? _bearingTo(pos.latitude, pos.longitude, alvo.lat, alvo.lng) : 0;

  return `
<div id="rosinha-caca" style="background:linear-gradient(160deg,#0a1628,#0e1a2e);border:1px solid rgba(6,182,212,0.25);
  border-radius:18px;padding:16px;margin-bottom:14px;position:relative;overflow:hidden">
  <!-- glow animado -->
  <div id="rc-glow" style="position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,${cor} 0%,transparent 65%);
    opacity:0.15;pointer-events:none;transition:background 0.8s ease"></div>

  <div style="display:flex;align-items:center;gap:14px;position:relative">
    <!-- Bússola SVG animada -->
    <div style="flex-shrink:0;position:relative">
      <div id="rc-ring" style="width:80px;height:80px;border-radius:50%;border:2px solid ${cor};
        display:flex;align-items:center;justify-content:center;transition:border-color 0.5s;
        animation:rc-pulse 2s ease-in-out infinite;box-shadow:0 0 20px ${cor}55">
        <svg viewBox="0 0 80 80" width="72" height="72">
          <defs>
            <linearGradient id="rcg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#06b6d4"/>
              <stop offset="100%" stop-color="#a855f7"/>
            </linearGradient>
          </defs>
          <!-- fundo -->
          <circle cx="40" cy="40" r="38" fill="#0a0e14" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
          <!-- marcações dos pontos cardeais -->
          <text x="40" y="10" text-anchor="middle" fill="#ffd54f" font-size="8" font-weight="800" font-family="system-ui">N</text>
          <text x="40" y="75" text-anchor="middle" fill="#64748b" font-size="7" font-family="system-ui">S</text>
          <text x="73" y="43" text-anchor="middle" fill="#64748b" font-size="7" font-family="system-ui">L</text>
          <text x="8" y="43" text-anchor="middle" fill="#64748b" font-size="7" font-family="system-ui">O</text>
          <!-- agulha que gira (ponta N aponta pro alvo) -->
          <g id="rc-ponteiro" style="transform-origin:40px 40px;transform:rotate(${bearing}deg);transition:transform 1s ease">
            <path d="M40 12 L44 38 L40 42 L36 38 Z" fill="#ffd54f"/>
            <path d="M40 68 L44 42 L40 38 L36 42 Z" fill="#64748b"/>
          </g>
          <!-- centro -->
          <circle cx="40" cy="40" r="4" fill="#0e1620" stroke="url(#rcg)" stroke-width="1.5"/>
          <circle cx="40" cy="40" r="2" fill="#ffd54f"/>
        </svg>
      </div>
    </div>

    <!-- Fala + info -->
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="font-size:15px">🏴‍☠️</span>
        <strong style="font-size:14px;color:#ffd54f">Rosinha</strong>
        <span style="font-size:10px;color:#64748b;padding:2px 8px;background:rgba(255,213,79,0.1);
          border-radius:10px;border:1px solid rgba(255,213,79,0.2)">${tr("caca_bussola_pirata")}</span>
      </div>
      <p id="rc-fala" style="margin:0;font-size:13px;color:#e5e7eb;line-height:1.45;
        font-style:italic">${fala}</p>
      ${alvo ? `<div style="font-size:11px;color:#64748b;margin-top:4px">→ ${tr("caca_proxima")}: <strong style="color:#94a3b8">${alvo.nome}</strong></div>` : ''}
    </div>
  </div>

  <!-- Progresso das paradas -->
  <div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap">
    ${waypoints.map((w, i) => `
      <div style="flex:1;min-width:60px;background:rgba(255,255,255,0.04);border:1px solid ${i < _cacaAlvoIdx ? '#10b981' : i === _cacaAlvoIdx ? cor : '#1f2937'};
        border-radius:8px;padding:6px 8px;text-align:center;font-size:11px;transition:all 0.5s">
        ${i < _cacaAlvoIdx ? '<span style="color:#10b981">✓</span>' : `<span>${i+1}.</span>`}<br>
        <span style="color:${i < _cacaAlvoIdx ? '#10b981' : i === _cacaAlvoIdx ? '#ffd54f' : '#64748b'};font-weight:${i === _cacaAlvoIdx ? '700' : '400'}">${w.nome.slice(0,10)}${w.nome.length > 10 ? '…' : ''}</span>
      </div>`).join('')}
  </div>
</div>

<style>
@keyframes rc-pulse {
  0%,100% { box-shadow: 0 0 10px ${cor}55; }
  50%      { box-shadow: 0 0 26px ${cor}99, 0 0 50px ${cor}33; }
}
</style>`;
}

async function abrirCaca() {
  showScreen("caca");
  const cont = document.getElementById("lista-caca");
  if (!state.cidade) { cont.innerHTML = `<p style="color:var(--hint)">${tr("escolha_cidade")}</p>`; return; }
  cont.innerHTML = `<div class="loading">…</div>`;

  const wp = await sb(`caca_waypoints?select=id,nome,ordem,lat,lng,raio_m,instrucao_rosinha,desconto_pct,desconto_produto,share_prompt,missao_tipo,premio_sulis&estado=eq.${enc(state.estado)}&cidade=eq.${enc(state.cidade)}&ativo=eq.true&order=ordem`).catch(() => []);
  if (!wp.length) {
    cont.innerHTML = `<div style="text-align:center;padding:20px">
      <div style="font-size:48px;margin-bottom:8px">🏴‍☠️</div>
      <p style="color:var(--hint)">${tr("caca_sem_tesouro")}<br>${tr("caca_explora")}</p>
    </div>`;
    return;
  }

  _cacaWaypoints = wp;
  _cacaAlvoIdx = 0;

  let pos = null;
  try {
    pos = await new Promise((ok, err) =>
      navigator.geolocation.getCurrentPosition(p => ok(p.coords), err, { timeout: 8000 }));
  } catch {}

  cont.innerHTML = _renderRosinhaCaca(wp, pos)
    + wp.map((w, i) => {
        const d = pos ? VSPraias.distanceMetros(pos.latitude, pos.longitude, w.lat, w.lng) : null;
        const dentro = d != null && d <= (w.raio_m || 50);
        const j = JSON.stringify({ id: w.id, lat: w.lat, lng: w.lng, nome: w.nome, ordem: w.ordem || i+1, dentro, instrucao_rosinha: w.instrucao_rosinha||'', desconto_pct: w.desconto_pct||0, desconto_produto: w.desconto_produto||'', share_prompt: w.share_prompt||'', premio_sulis: w.premio_sulis||15 }).replace(/'/g, "&#39;");
        return `
        <div class="list-card" style="flex-direction:column;align-items:stretch;
          border-left:3px solid ${i < _cacaAlvoIdx ? '#10b981' : i === _cacaAlvoIdx ? '#ffd54f' : '#1f2937'}">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:18px">${i < _cacaAlvoIdx ? '✅' : i === _cacaAlvoIdx ? '🏴‍☠️' : '🔒'}</span>
            <div>
              <strong>${tr("caca_parada")} ${w.ordem || i+1}: ${escapeHtml(w.nome)}</strong>
              <div style="font-size:11px;color:var(--hint)">${tr("caca_raio")} ${w.raio_m || 50}m</div>
            </div>
          </div>
          <div id="rc-dist-${i}" style="font-size:13px;margin-top:6px;color:#ffb300">
            ${d != null ? `📍 ${d < 1000 ? Math.round(d)+'m' : (d/1000).toFixed(1)+'km'} de distância` : ''}
          </div>
          <div style="display:flex;gap:6px;margin-top:8px">
            <button class="btn-primary" style="flex:1;background:rgba(38,124,180,0.55);font-size:12px;padding:6px"
                    onclick='comoChegar(${j})'>🧭 Como chegar</button>
            <button id="rc-cheg-${i}" class="btn-primary"
              style="flex:1;background:linear-gradient(135deg,#10b981,#059669);font-size:12px;padding:6px;display:${dentro ? 'block' : 'none'}"
              onclick='caca_chegouWaypoint(${j})'>✅ ${tr("caca_cheguei")}</button>
          </div>
        </div>`;
      }).join("");

  // Inicia watchPosition pra atualizar bússola ao vivo
  if (_cacaWatchId) navigator.geolocation.clearWatch(_cacaWatchId);
  if (navigator.geolocation) {
    _cacaWatchId = navigator.geolocation.watchPosition(
      p => _atualizarRosinhaCaca(p.coords),
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }
  if (pos) _atualizarRosinhaCaca(pos);
}

// User chegou num waypoint — registra + SulCoins + avança bússola + card
window.caca_chegouWaypoint = async function(w) {
  // Mostra modal de missão com instrução da Rosinha + câmera
  const overlay = document.createElement('div');
  overlay.id = 'caca-missao-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;flex-direction:column;overflow-y:auto;padding:16px;';
  overlay.innerHTML = `
    <div style="max-width:420px;margin:0 auto;width:100%">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <span style="font-size:22px;font-weight:700">🏴‍☠️ ${tr("caca_missao_rosinha")}</span>
        <button onclick="document.getElementById('caca-missao-overlay').remove()"
          style="background:transparent;border:none;color:#94a3b8;font-size:22px;cursor:pointer">✕</button>
      </div>

      <!-- Instrução da Rosinha -->
      <div style="background:rgba(6,182,212,0.12);border:1px solid rgba(6,182,212,0.3);border-radius:12px;padding:14px;margin-bottom:16px">
        <div style="display:flex;gap:10px;align-items:flex-start">
          <span style="font-size:28px">🧭</span>
          <div>
            <div style="font-size:12px;color:#67e8f9;margin-bottom:4px">${tr("caca_rosinha_diz")}</div>
            <div style="font-size:14px;line-height:1.5;color:#e2e8f0">${w.instrucao_rosinha || ('🏴‍☠️ Ahoy! Tire uma foto em frente a <strong>' + escapeHtml(w.nome) + '</strong> pra revelar o próximo tesouro!')}</div>
          </div>
        </div>
      </div>

      <!-- Local -->
      <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:12px;margin-bottom:16px;display:flex;align-items:center;gap:10px">
        <span style="font-size:24px">📍</span>
        <div>
          <div style="font-weight:700">${escapeHtml(w.nome)}</div>
          <div style="font-size:12px;color:#94a3b8">Parada ${w.ordem} · raio 80m</div>
        </div>
      </div>

      <!-- 12/08/2026 — BÚSSOLA DA CAÇA. A pista dizia ONDE, mas ninguém via pra
           que lado andar. Agora a bússola grandona aponta pro waypoint e mostra
           a distância, igual à do mapa — é a mesma VSBussola. -->
      <button onclick="cacaGuiar(${w.lat},${w.lng},'${String(w.nome||'').replace(/'/g,"\\'")}')"
              style="width:100%;margin-bottom:16px;background:linear-gradient(135deg,#f59e0b,#d97706);
                     color:#1a1000;border:0;border-radius:12px;padding:14px;font-weight:800;
                     font-size:14px;cursor:pointer;box-shadow:0 4px 14px rgba(245,158,11,.35)">
        🧭 Me guiar até aqui
      </button>

      <!-- Câmera -->
      <div id="caca-foto-area" style="margin-bottom:16px">
        <div style="background:rgba(255,255,255,0.04);border:2px dashed rgba(99,102,241,0.5);border-radius:12px;padding:24px;text-align:center;cursor:pointer"
             onclick="document.getElementById('caca-file-input').click()">
          <div style="font-size:48px">📸</div>
          <div style="margin-top:8px;color:#94a3b8;font-size:13px">${tr("caca_tirar_foto")}</div>
          <input type="file" id="caca-file-input" accept="image/*" capture="environment"
                 style="display:none" onchange="cacaMostrarPreview(event)">
        </div>
        <img id="caca-foto-preview" src="" alt="preview"
             style="display:none;width:100%;border-radius:12px;margin-top:8px;max-height:240px;object-fit:cover">
      </div>

      <!-- Recompensas -->
      <div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.2);border-radius:10px;padding:12px;margin-bottom:16px">
        <div style="font-size:12px;color:#fbbf24;margin-bottom:6px">🎁 ${tr("caca_recompensas_parada")}</div>
        <div style="display:flex;gap:16px">
          <div style="text-align:center">
            <div style="font-size:20px">🌊</div>
            <div style="font-size:16px;font-weight:700;color:#ffd54f">+${w.premio_sulis || 15}</div>
            <div style="font-size:11px;color:#94a3b8">SulCoins</div>
          </div>
          ${w.desconto_pct > 0 ? `<div style="text-align:center">
            <div style="font-size:20px">🎫</div>
            <div style="font-size:16px;font-weight:700;color:#10b981">${w.desconto_pct}% off</div>
            <div style="font-size:11px;color:#94a3b8">${escapeHtml(w.desconto_produto || tr("caca_nesta_loja"))}</div>
          </div>` : ''}
        </div>
      </div>

      <!-- Botão completar -->
      <button id="caca-completar-btn" onclick="cacaCompletarMissao()"
        style="width:100%;padding:14px;background:linear-gradient(135deg,#10b981,#059669);border:none;border-radius:12px;color:white;font-size:16px;font-weight:700;cursor:pointer;margin-bottom:8px">
        ✅ ${tr("caca_completar_missao")}
      </button>
      <button onclick="document.getElementById('caca-missao-overlay').remove()"
        style="width:100%;padding:10px;background:transparent;border:1px solid #374151;border-radius:12px;color:#94a3b8;font-size:14px;cursor:pointer">
        ${tr("caca_cancelar")}
      </button>
    </div>
  `;
  document.body.appendChild(overlay);

  // Store mission context for cacaCompletarMissao
  window._cacaMissaoAtual = { w, fotoPath: null };
};

window.cacaMostrarPreview = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const prev = document.getElementById('caca-foto-preview');
  const area = document.querySelector('#caca-foto-area > div');
  const reader = new FileReader();
  reader.onload = e => {
    prev.src = e.target.result;
    prev.style.display = 'block';
    if (area) area.style.display = 'none';
  };
  reader.readAsDataURL(file);
  window._cacaMissaoAtual.fotoFile = file;
};

window.cacaCompletarMissao = async function() {
  const { w } = window._cacaMissaoAtual || {};
  if (!w) return;

  const btn = document.getElementById('caca-completar-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ ' + tr("caca_verificando"); }

  // GPS check
  let lat = null, lng = null;
  try {
    const pos = await new Promise((ok, err) =>
      navigator.geolocation.getCurrentPosition(p => ok(p.coords), err, { timeout: 8000 }));
    lat = pos.latitude; lng = pos.longitude;
  } catch {}

  // Upload foto se tiver (simples: usar URL base64 como path simbólico)
  let fotoPath = null;
  if (window._cacaMissaoAtual.fotoFile) {
    fotoPath = `user_caca/${Date.now()}.jpg`; // path simbólico — futuro upload R2
  }

  // Chamar RPC
  let resultado = null;
  try {
    const { data, error } = await VSSupabase.rpc('submeter_missao_caca', {
      p_waypoint_id: w.id,
      p_lat: lat || w.lat,
      p_lng: lng || w.lng,
      p_foto_path: fotoPath
    });
    if (error) throw error;
    resultado = data;
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = '✅ Completar Missão'; }
    if (e?.message?.includes('longe') || resultado?.erro === 'longe') {
      toast && toast('📍 ' + tr("caca_longe_loja"));
    } else if (resultado?.erro === 'cooldown') {
      toast && toast('⏳ ' + tr("caca_parada_hoje"));
    } else {
      toast && toast(tr("caca_erro_missao"));
    }
    return;
  }

  if (resultado?.erro) {
    if (btn) { btn.disabled = false; btn.textContent = '✅ Completar Missão'; }
    const msgs = { longe: `📍 Muito longe! (${resultado.dist_m}m). Chegue mais perto.`, cooldown: '⏳ ' + tr("caca_missao_feita_hoje"), login: '🔐 ' + tr("caca_faca_login") };
    toast && toast(msgs[resultado.erro] || 'Erro: ' + resultado.erro);
    return;
  }

  // Sucesso! Fecha overlay e mostra resultado
  document.getElementById('caca-missao-overlay')?.remove();

  // Avança bússola
  _cacaAlvoIdx = Math.min(_cacaAlvoIdx + 1, _cacaWaypoints.length - 1);
  if (_cacaPos) _atualizarRosinhaCaca(_cacaPos);

  // Modal de resultado
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  const voucher = resultado.voucher;
  const sulis = resultado.sulis || w.premio_sulis || 15;
  const sharePrompt = resultado.share_prompt || w.share_prompt || `Encontrei um tesouro em ${w.nome}! 🧭 #VentoSul`;
  modal.innerHTML = `
    <div style="max-width:380px;width:100%;background:linear-gradient(135deg,#0f2027,#203a43,#2c5364);border-radius:20px;padding:24px;text-align:center;border:1px solid rgba(16,185,129,0.4)">
      <div style="font-size:48px;margin-bottom:8px">🎉</div>
      <div style="font-size:22px;font-weight:700;margin-bottom:4px">${tr("caca_missao_completa")}</div>
      <div style="color:#94a3b8;margin-bottom:20px">Parada ${w.ordem}: ${escapeHtml(w.nome)}</div>

      <div style="background:rgba(255,215,0,0.1);border-radius:12px;padding:16px;margin-bottom:16px">
        <div style="font-size:32px;font-weight:800;color:#ffd54f">+${sulis} 🌊</div>
        <div style="font-size:13px;color:#94a3b8">SulCoins ${tr("caca_no_bau")}</div>
      </div>

      ${voucher ? `
      <div style="background:rgba(16,185,129,0.1);border:1px dashed rgba(16,185,129,0.4);border-radius:12px;padding:14px;margin-bottom:16px">
        <div style="font-size:12px;color:#10b981;margin-bottom:6px">🎫 ${tr("caca_seu_voucher")}</div>
        <div style="font-size:24px;font-weight:800;letter-spacing:4px;color:white">${voucher}</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:4px">${resultado.desconto_pct}% de desconto${resultado.desconto_produto ? ' em ' + escapeHtml(resultado.desconto_produto) : ''}</div>
        <div style="font-size:11px;color:#64748b;margin-top:4px">${tr("caca_voucher_validade")}</div>
      </div>` : ''}

      ${resultado.proxima_dica ? `
      <div style="background:rgba(6,182,212,0.1);border-radius:10px;padding:12px;margin-bottom:16px;text-align:left">
        <div style="font-size:12px;color:#67e8f9;margin-bottom:4px">🧭 ${tr("caca_proxima_pista")}</div>
        <div style="font-size:13px;color:#e2e8f0">${escapeHtml(resultado.proxima_dica)}</div>
      </div>` : ''}

      <button onclick="cacaCompartilharConquista('${encodeURIComponent(sharePrompt)}')"
        style="width:100%;padding:12px;background:linear-gradient(135deg,#667eea,#764ba2);border:none;border-radius:10px;color:white;font-weight:700;cursor:pointer;margin-bottom:8px;font-size:14px">
        📣 ${tr("caca_compartilhar_ganhar")}
      </button>
      <button onclick="this.parentElement.parentElement.remove()"
        style="width:100%;padding:10px;background:transparent;border:1px solid #374151;border-radius:10px;color:#94a3b8;font-size:14px;cursor:pointer">
        ${tr("caca_fechar")}
      </button>
    </div>
  `;
  document.body.appendChild(modal);
};

window.cacaCompartilharConquista = function(promptEncoded) {
  const txt = decodeURIComponent(promptEncoded);
  if (navigator.share) {
    navigator.share({ text: txt, url: window.location.origin }).catch(() => {});
  } else {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(txt + ' ' + window.location.origin)}`;
    window.open(waUrl, '_blank');
  }
};


// ─────────────────────────────────────────────────────────────
// Tela 8 — Compra Coletiva
// ─────────────────────────────────────────────────────────────
async function abrirColetiva() {
  showScreen("coletiva");
  const cont = document.getElementById("lista-coletivas");
  cont.innerHTML = `<div class="loading">…</div>`;
  // Busca em paralelo: meus pools (do que eu falei pra Litorânea) + pools quentes globais + coletivas oficiais
  const [meusR, quentesR, oficiais] = await Promise.all([
    VSSupabase.rpc("meus_pools_compras").catch(() => null),
    VSSupabase.rpc("pools_quentes", { p_estado: state?.estado || null }).catch(() => null),
    sb("compras_coletivas?select=id,titulo,descricao,cidade,estado,participantes_atual,minimo_participantes,preco_unitario_centavos,origem_pool_item,criada_automaticamente&order=created_at.desc&limit=20").catch(() => [])
  ]);
  const meus = (Array.isArray(meusR) ? meusR[0] : meusR)?.pools || [];
  const quentes = (Array.isArray(quentesR) ? quentesR[0] : quentesR)?.pools || [];

  let html = "";

  // 🔥 Meus pools (intenções minhas + quantos mais querem)
  if (meus.length) {
    html += `<h3 style="margin-top:10px;font-size:14px">🔥 ${tr("coletiva_voce_quer")}</h3>`;
    html += meus.map(p => {
      const pode = p.pool_estado >= 5;
      return `
      <div class="list-card" style="flex-direction:column;align-items:stretch;border-left:3px solid #ffd54f">
        <strong>🛒 ${escapeHtml(p.item)}</strong>
        <small style="color:var(--hint)">você quer em ${p.prazo_meses} meses</small>
        <div style="display:flex;gap:14px;margin-top:6px;font-size:13px">
          <span>📍 ${p.estado || "?"}: <strong style="color:#4caf50">${p.pool_estado}</strong> pessoa${p.pool_estado===1?"":"s"}</span>
          <span>🇧🇷 nacional: <strong>${p.pool_nacional}</strong></span>
        </div>
        ${pode ? `
          <button class="btn-primary" style="margin-top:10px;background:rgba(13,114,62,0.65);font-size:13px;padding:8px"
                  onclick="abrirColetivaPool('${escapeHtml(p.item).replace(/'/g,"&#39;")}', '${escapeHtml(p.estado||'').replace(/'/g,"&#39;")}')">
            🚀 Já dá pra abrir coletiva (${p.pool_estado} pessoas)
          </button>` : `
          <small style="color:var(--hint);margin-top:6px">Faltam ${5 - p.pool_estado} pessoa${5 - p.pool_estado===1?"":"s"} no estado pra abrir coletiva.</small>`}
      </div>`;
    }).join("");
  }

  // 🌟 Pools quentes (do que mais gente quer no estado)
  if (quentes.length) {
    html += `<h3 style="margin-top:18px;font-size:14px">🌟 ${tr("coletiva_mais_quentes")}</h3>`;
    html += quentes.slice(0, 10).map(p => `
      <div class="list-card" style="flex-direction:column;align-items:stretch">
        <div style="display:flex;justify-content:space-between">
          <strong>${escapeHtml(p.item)}</strong>
          <span style="color:#ff7043;font-weight:700">🔥 ${p.calor}</span>
        </div>
        <small style="color:var(--hint)">${p.estado || ""} ${p.cidade ? "· " + escapeHtml(p.cidade) : ""}</small>
        <div style="font-size:13px;margin-top:6px">
          👥 <strong>${p.qtd_pessoas}</strong> pessoa${p.qtd_pessoas===1?"":"s"} querem · prazo médio ${p.prazo_medio} meses
        </div>
      </div>`).join("");
  }

  // 🛒 Coletivas oficiais já abertas
  if (oficiais.length) {
    html += `<h3 style="margin-top:18px;font-size:14px">🛒 ${tr("coletiva_oficiais")}</h3>`;
    html += oficiais.map(c => `
      <div class="list-card" style="flex-direction:column;align-items:stretch;border-left:3px solid ${c.criada_automaticamente ? '#7af0ff' : '#888'}">
        <strong>${escapeHtml(c.titulo || c.descricao || "Coletiva")} ${c.criada_automaticamente ? '<small style="color:#7af0ff">🤖 auto</small>' : ''}</strong>
        <small style="color:var(--hint)">${c.cidade || ""} ${c.estado ? "· " + c.estado : ""} · ${c.participantes_atual || 0}/${c.minimo_participantes || "?"} pessoas</small>
        ${c.preco_unitario_centavos ? `<small style="color:#4caf50;margin-top:4px">R$ ${(c.preco_unitario_centavos/100).toFixed(2)} por pessoa</small>` : ""}
      </div>`).join("");
  }

  if (!html) {
    html = `<p style="color:var(--hint)">${tr("coletiva_vazia")}</p>`;
  }
  cont.innerHTML = html;
}

window.abrirColetivaPool = async function(item, estado) {
  if (!confirm(`Criar compra coletiva oficial pra "${item}" em ${estado}?\n\nVai juntar todo mundo que falou que quer e abrir negociação com fornecedor.`)) return;
  try {
    const r = await VSSupabase.rpc("coletiva_a_partir_pool", { p_item: item, p_estado: estado });
    const d = Array.isArray(r) ? r[0] : r;
    if (d?.ok) {
      alert(`✓ Coletiva criada!\n${d.titulo}\nPool inicial: ${d.pool} pessoas`);
      abrirColetiva();
    } else if (d?.erro === "pool_insuficiente") {
      alert(`Faltam ${d.minimo - d.qtd} pessoa(s) pro pool. Hoje tem ${d.qtd}, mínimo é ${d.minimo}.`);
    } else if (d?.erro === "ja_existe_ativa") {
      alert(tr("coletiva_ja_ativa"));
      abrirColetiva();
    } else alert("Erro: " + (d?.erro || "?"));
  } catch (e) { alert("Erro: " + (e.message || e)); }
};

// ─────────────────────────────────────────────────────────────
// Tela 9 — Praias (NOVO, paridade nativo)
// ─────────────────────────────────────────────────────────────

// Duplo-clique / toque longo num card de praia = favoritar (dourado + aviso curto).
function _wirePraiaFav(el, praia) {
  if (!el || !praia) return;
  const item = { tipo: "praia", id: praia.id, nome: praia.nome, cidade: praia.cidade || state.cidade,
                 estado: praia.estado || state.estado, foto: praia.foto_url, _raw: praia };
  const marca = () => { try { el.classList.toggle("praia-favorita", isFav(item)); } catch(e){} };
  marca();
  el.addEventListener("dblclick", (e) => {
    e.preventDefault(); e.stopPropagation();
    const add = toggleFav(item); marca();
    if (typeof toast === "function") toast(add ? "\u2b50 Praia favoritada!" : "Removida dos favoritos");
    else if (typeof mostrarToast === "function") mostrarToast(add ? "\u2b50 Praia favoritada!" : "Removida dos favoritos");
  });
  // celular: toque longo (500ms) favorita
  let t = null;
  el.addEventListener("touchstart", () => { t = setTimeout(() => { const add = toggleFav(item); marca();
    if (typeof toast === "function") toast(add ? "\u2b50 Favoritada!" : "Removida"); }, 500); }, {passive:true});
  ["touchend","touchmove","touchcancel"].forEach(ev => el.addEventListener(ev, () => { if (t) { clearTimeout(t); t = null; } }, {passive:true}));
}

async function abrirPraias() {
  showScreen("praias");
  const cont = document.getElementById("lista-praias");
  const sub = document.getElementById("praias-sub");
  if (!state.cidade) { cont.innerHTML = `<p style="color:var(--hint)">${tr("escolha_cidade")}</p>`; return; }
  sub.textContent = `${tr("praias_da_cidade")} — ${state.cidade}`;
  cont.innerHTML = `<div class="loading">…</div>`;
  const ps = await VSPraias.praiasDaCidade(state.cidade, state.estado, 20);
  if (!ps.length) { cont.innerHTML = `<p style="color:var(--hint)">${tr("sem_praia")}</p>`; return; }
  cont.innerHTML = ps.map(p => `
    <div class="list-card praia-item" data-id="${p.id}" style="flex-direction:column;align-items:stretch;cursor:pointer">
      ${p.foto_url ? `<img src="${p.foto_url}" loading="lazy" style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:6px">` : ""}
      <strong>🏖️ ${escapeHtml(p.nome)}</strong>
      <small style="color:var(--hint)">${escapeHtml((p.tags || []).join(" • "))}</small>
    </div>`).join("");
  cont.querySelectorAll(".praia-item").forEach(el => {
    const p = ps.find(x => x.id === el.dataset.id);
    el.addEventListener("click", () => { if (p) abrirDetalhePraia(p); });
    _wirePraiaFav(el, p);
  });
}

async function abrirDetalhePraia(p) {
  state.praia = p;
  showScreen("praia-detalhe");

  // Banner: carrossel auto-rotativo só com fotos NATUREZA/PRAIA
  // Tenta v_carrossel_por_escopo (escopo=praia, sublocal=p.nome) → fallback foto da localidade
  const fotosPraia = await sb(
    `v_carrossel_por_escopo?select=foto_url,titulo,subtitulo&escopo=eq.praia&cidade=eq.${enc(p.cidade)}&sublocal=eq.${enc(p.nome)}&limit=10`
  ).catch(() => []);
  const lista = fotosPraia.length
    ? fotosPraia
    : (p.foto_url ? [{ foto_url: p.foto_url, titulo: p.nome }] : []);
  renderCarousel(document.getElementById("praia-foto"), lista, { intervaloMs: 8000 });
  document.getElementById("praia-nome").textContent = `🏖️ ${p.nome}`;
  document.getElementById("praia-desc").textContent = p.sublocal ? `${p.sublocal}` : "";
  document.getElementById("praia-tags").innerHTML = (p.tags || []).map(t =>
    `<span style="background:var(--section);padding:4px 10px;border-radius:12px;font-size:12px">${escapeHtml(t)}</span>`
  ).join("");
  const meta = [];
  if (p.cidade) meta.push(`${p.cidade} · ${p.estado || ""}`);
  if (p.lat != null && p.lng != null) meta.push(`${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`);
  document.getElementById("praia-meta").textContent = meta.join(" • ");

  const btn = document.getElementById("btn-praia-mapa");
  btn.onclick = () => {
    if (p.lat == null || p.lng == null) { alert(tr("praia_sem_coord")); return; }
    window.open(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`, "_blank");
  };

  // Outras praias da mesma cidade
  const outras = (await VSPraias.praiasDaCidade(p.cidade, p.estado, 99))
    .filter(x => x.id !== p.id).slice(0, 5);
  const cont = document.getElementById("praia-outras");
  cont.innerHTML = outras.length
    ? outras.map(o => `
      <div class="list-card praia-item" data-id="${o.id}" style="cursor:pointer">
        <div class="emoji">🏖️</div>
        <div class="info">
          <strong>${escapeHtml(o.nome)}</strong>
          <small style="color:var(--hint)">${escapeHtml((o.tags || []).join(" • "))}</small>
        </div>
      </div>`).join("")
    : `<p style="color:var(--hint)">—</p>`;
  cont.querySelectorAll(".praia-item").forEach(el => { el.addEventListener("click", () => {
    const sel = outras.find(x => x.id === el.dataset.id);
    if (sel) abrirDetalhePraia(sel);
  }); const _pp = (typeof outras!=='undefined'?outras:[]).find(x=>String(x.id)===el.dataset.id); if(_pp) _wirePraiaFav(el,_pp); });
}

document.getElementById("btn-gps-praia")?.addEventListener("click", async () => {
  const cont = document.getElementById("lista-praias");
  cont.innerHTML = `<div class="loading">📍 ${tr("praia_obtendo_loc")}</div>`;
  try {
    const pos = await new Promise((ok, err) =>
      navigator.geolocation.getCurrentPosition(p => ok(p.coords), err, { timeout: 10000 }));
    const p = await VSPraias.praiaMaisProxima(pos.latitude, pos.longitude);
    if (!p) { cont.innerHTML = `<p style="color:var(--hint)">${tr("sem_praia")}</p>`; return; }
    cont.innerHTML = `
      <div class="list-card" style="flex-direction:column;align-items:stretch">
        ${p.foto_url ? `<img src="${p.foto_url}" loading="lazy" style="width:100%;height:140px;object-fit:cover;border-radius:6px;margin-bottom:6px">` : ""}
        <strong>🏖️ ${escapeHtml(p.nome)}</strong>
        <small style="color:#4caf50">${p.distancia_m < 1000 ? `${Math.round(p.distancia_m)}m` : `${(p.distancia_m/1000).toFixed(1)}km`} de distância</small>
        <small style="color:var(--hint)">${escapeHtml(p.cidade)} · ${escapeHtml(p.estado)}</small>
      </div>`;
  } catch {
    cont.innerHTML = `<p style="color:#e53935">${tr("praia_sem_loc")}</p>`;
  }
});

// ─────────────────────────────────────────────────────────────
// Tela 10 — Carteira SulCoin (NOVO, read-only)
// ─────────────────────────────────────────────────────────────
async function abrirWallet() {
  showScreen("wallet");
  const saldo = document.getElementById("wallet-saldo");
  const hist  = document.getElementById("wallet-historico");
  const como  = document.getElementById("wallet-comoganhar");
  saldo.innerHTML = `<div style="color:var(--hint)">${tr("carregando")}</div>`;
  hist.innerHTML = "";
  if (como) como.innerHTML = "";

  // Garante sessão (cria anônima se não tiver)
  await VSSupabase.ensureSession?.();
  VSWallet.heartbeat().catch(() => {});

  const w = await VSWallet.myWallet();
  const email  = VSSupabase.userEmail?.() || null;
  const userId = VSSupabase.userId?.() || null;
  const isAnon = !email;

  if (!w) {
    saldo.innerHTML = `
      <div style="text-align:center;padding:14px">
        <div style="display:flex;justify-content:center;color:var(--zc-hint, #9aa7b3);margin-bottom:8px">${VSIcons.svg("wallet", 38)}</div>
        <div style="font-size:16px;font-weight:600;margin:8px 0">SulCoins · ${tr("wallet_saldo_zero")}</div>
        <small style="color:var(--hint)">${tr("wallet_sem_movimento")}</small>
        <div style="margin-top:14px;display:flex;gap:8px;justify-content:center">
          <button class="btn-primary" style="flex:1;padding:10px;display:inline-flex;align-items:center;justify-content:center;gap:8px" onclick="abrirWallet()">${VSIcons.svg("refresh", 16)} ${tr("atualizar")}</button>
        </div>
      </div>`;
    if (como) como.innerHTML = renderCardComoGanhar();
    return;
  }
  const livre = w.saldo_livre_sulis || 0;
  const streak = window.VSMagia?.calcularStreak?.() || 0;
  const horasStreak = window.VSMagia?.streakHoras?.() || 0;
  const nomeUser = email ? email.split("@")[0].replace(/[._-]/g, " ").split(" ")[0] : null;
  const saud = window.VSMagia?.saudacao(nomeUser ? nomeUser.charAt(0).toUpperCase() + nomeUser.slice(1) : "viajante") || "";
  saldo.innerHTML = `
    <div class="wallet-saldo-grande">
      ${saud ? `<div style="text-align:center;font-size:13px;color:var(--zc-hint, var(--hint));margin-bottom:6px">${escapeHtml(saud)}</div>` : ""}
      <div class="ws-label">${tr("wallet_saldo_livre")}</div>
      <div class="ws-valor" id="ws-valor">${VSWallet.formatarSulis(livre)}</div>
      <div class="ws-conta" style="display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap">
        ${isAnon
          ? `<span style="display:inline-flex;align-items:center;gap:5px">${VSIcons.svg("user", 14)} ${tr("wallet_anonima")}</span>`
          : `<span style="display:inline-flex;align-items:center;gap:5px">${VSIcons.svg("mail", 14)} ${escapeHtml(email)}</span>`}
        ${streak > 1 ? `<span class="vs-streak" title="${horasStreak}h pra zerar" style="display:inline-flex;align-items:center;gap:4px;color:var(--zc-warn,#b8860b)">${VSIcons.svg("flame", 14)} ${streak}d</span>` : ""}
      </div>
    </div>
    <div class="wallet-saldo-extras">
      <div><span>${tr("wallet_bloqueado")}</span><strong>${VSWallet.formatarSulis(w.saldo_bloqueado_sulis)}</strong></div>
      <div><span>Total</span><strong>${VSWallet.formatarSulis(w.saldo_total_sulis)}</strong></div>
    </div>
    <div class="wallet-actions">
      <button class="wa-btn wa-receber" onclick="abrirReceber()">${VSIcons.svg("arrow-down", 22)}<span>${tr("wallet_btn_receber")}</span></button>
      <button class="wa-btn wa-enviar"  onclick="abrirTransferir()">${VSIcons.svg("send", 22)}<span>${tr("wallet_btn_enviar")}</span></button>
      <button class="wa-btn wa-scan" onclick="abrirScanner()">${VSIcons.svg("qr", 22)}<span>${tr("wallet_btn_lerqr")}</span></button>
      <button class="wa-btn wa-convite" onclick="abrirConvite()">${VSIcons.svg("gift", 22)}<span>${tr("wallet_btn_convidar")}</span></button>
      <button class="wa-btn wa-hub" onclick="abrirMeuHub()">${VSIcons.svg("home", 22)}<span>${tr("wallet_btn_meuhub")}</span></button>
      <button class="wa-btn wa-msg" onclick="abrirMensagemSulis()">${VSIcons.svg("message", 22)}<span>${tr("wallet_btn_recado")}</span></button>
      <button class="wa-btn wa-recarga" onclick="abrirRecargaSulcoin()">${VSIcons.svg("coins", 22)}<span>${tr("wallet_btn_recarregar")}</span></button>
      ${isAnon
        ? `<button class="wa-btn wa-link" onclick="abrirComercio()">${VSIcons.svg("mail", 22)}<span>${tr("wallet_btn_vincular")}</span></button>`
        : `<button class="wa-btn wa-sair" onclick="VSSupabase.signOut().then(()=>abrirWallet())">${VSIcons.svg("logout", 22)}<span>${tr("wallet_btn_sair")}</span></button>`}
    </div>
    <div id="wallet-bonus" class="wallet-bonus-card"></div>
    <p style="text-align:center;margin-top:10px;font-size:11px;color:var(--zc-hint,var(--hint));line-height:1.8">
      <a href="javascript:abrirAuditSC()" class="wa-link-flat">${VSIcons.svg("list", 13)} ${tr("wallet_link_auditoria")}</a>
      · <a href="javascript:abrirHonestidade()" class="wa-link-flat">${VSIcons.svg("shield", 13)} Score</a>
      · <a href="javascript:abrirDoohPulso()" class="wa-link-flat">${VSIcons.svg("broadcast", 13)} ${tr("wallet_link_vitrine")}</a>
      · <a href="javascript:abrirMeuPerfilRico()" class="wa-link-flat">${VSIcons.svg("user", 13)} ${tr("wallet_link_perfil")}</a>
      · <a href="javascript:abrirPoolDaComunidade()" class="wa-link-flat">${VSIcons.svg("trending", 13)} Pool</a>
      · <a href="javascript:abrirOrigemDosMeusSulis()" class="wa-link-flat">${VSIcons.svg("info", 13)} ${tr("wallet_link_origem")}</a>
    </p>
    <div style="text-align:center;margin-top:8px">
      <button class="btn-modo-inst" onclick="toggleModoInstitucional()">
        <span id="modo-inst-label">${window._modoInst ? tr("modo_inst_ativo") : tr("modo_cidadao")}</span>
      </button>
    </div>`;
  renderBonusDiario();

  if (como) como.innerHTML = (livre === 0) ? renderCardComoGanhar() : "";

  // Guarda email/uuid pro modal Receber
  window._walletReceberAlvo = email || userId || "";

  const items = await VSWallet.myHistory(80);
  // Calcula stats: total recebido, enviado, bônus, qtd transferências
  window._walletItems = items;
  renderWalletStats(items);

  if (!items.length) {
    hist.innerHTML = `<p style="color:var(--hint)">${tr("sem_historico")}</p>`;
    return;
  }
  window._walletFiltroTipo    = "todos";
  window._walletFiltroPeriodo = "tudo";
  renderHistoricoFiltrado();
}

// Stats da carteira (acima do histórico)
function renderWalletStats(items) {
  let host = document.getElementById("wallet-stats");
  if (!host) {
    host = document.createElement("div");
    host.id = "wallet-stats";
    host.className = "wallet-stats";
    const h3 = document.querySelector("#screen-wallet > h3");
    if (h3) h3.parentNode.insertBefore(host, h3);
  }
  const totalRecebido = items.filter(t => t.sulis > 0 && ["RECEBIDO","MISSAO","CACA_WP","ENTRADA"].includes(String(t.tipo||"").toUpperCase())).reduce((a,t)=>a+t.sulis,0);
  const totalEnviado  = items.filter(t => t.sulis < 0 && String(t.tipo||"").toUpperCase()==="ENVIADO").reduce((a,t)=>a-t.sulis,0);
  const totalBonus    = items.filter(t => String(t.ref_tipo||"")==="daily_bonus").reduce((a,t)=>a+t.sulis,0);
  const numTx         = items.filter(t => ["ENVIADO","RECEBIDO"].includes(String(t.tipo||"").toUpperCase())).length;
  host.innerHTML = `
    <div class="ws-item"><div class="ws-l">${tr("wallet_stat_recebido")}</div><strong>${VSWallet.formatarSulis(totalRecebido)}</strong></div>
    <div class="ws-item"><div class="ws-l">${tr("wallet_stat_enviado")}</div><strong>${VSWallet.formatarSulis(totalEnviado)}</strong></div>
    <div class="ws-item"><div class="ws-l">${tr("wallet_stat_bonus")}</div><strong>${VSWallet.formatarSulis(totalBonus)}</strong></div>
    <div class="ws-item"><div class="ws-l">${tr("wallet_stat_transacoes")}</div><strong>${numTx}</strong></div>`;

  // Adiciona barra de filtros (só uma vez)
  let filtros = document.getElementById("wallet-filtros");
  if (!filtros) {
    filtros = document.createElement("div");
    filtros.id = "wallet-filtros";
    filtros.className = "wallet-filtros";
    filtros.innerHTML = `
      <div class="wf-linha">
        <button class="wf-btn wf-ativo" data-f="todos" onclick="filtrarHistorico('todos')">${tr("wf_tudo")}</button>
        <button class="wf-btn" data-f="recebidos" onclick="filtrarHistorico('recebidos')">📥 ${tr("wf_recebidos")}</button>
        <button class="wf-btn" data-f="enviados"  onclick="filtrarHistorico('enviados')">📤 ${tr("wf_enviados")}</button>
        <button class="wf-btn" data-f="bonus"     onclick="filtrarHistorico('bonus')">🎁 ${tr("wf_bonus")}</button>
        <button class="wf-btn" data-f="feira"     onclick="filtrarHistorico('feira')">🛒 ${tr("wf_feira")}</button>
        <button class="wf-btn" data-f="expirado"  onclick="filtrarHistorico('expirado')">⌛ ${tr("wf_expirado")}</button>
      </div>
      <div class="wf-linha wf-linha-periodo">
        <button class="wf-btn wf-pb wf-pb-ativo" data-p="tudo"   onclick="filtrarPeriodo('tudo')">${tr("wf_sempre")}</button>
        <button class="wf-btn wf-pb"             data-p="hoje"   onclick="filtrarPeriodo('hoje')">${tr("wf_hoje")}</button>
        <button class="wf-btn wf-pb"             data-p="semana" onclick="filtrarPeriodo('semana')">7d</button>
        <button class="wf-btn wf-pb"             data-p="mes"    onclick="filtrarPeriodo('mes')">30d</button>
      </div>`;
    const histDiv = document.getElementById("wallet-historico");
    if (histDiv) histDiv.parentNode.insertBefore(filtros, histDiv);
  }
}

window._walletFiltroTipo    = "todos";
window._walletFiltroPeriodo = "tudo";

window.filtrarHistorico = function(f) {
  window._walletFiltroTipo = f;
  document.querySelectorAll("#wallet-filtros .wf-btn[data-f]").forEach(b =>
    b.classList.toggle("wf-ativo", b.dataset.f === f));
  renderHistoricoFiltrado();
};
window.filtrarPeriodo = function(p) {
  window._walletFiltroPeriodo = p;
  document.querySelectorAll("#wallet-filtros .wf-pb").forEach(b =>
    b.classList.toggle("wf-pb-ativo", b.dataset.p === p));
  renderHistoricoFiltrado();
};

function _periodoCutoff(p) {
  if (p === "tudo") return 0;
  const dias = p === "hoje" ? 1 : p === "semana" ? 7 : p === "mes" ? 30 : 0;
  if (!dias) return 0;
  const c = new Date(); c.setHours(0,0,0,0);
  c.setDate(c.getDate() - (dias - 1));
  return c.getTime();
}

function renderHistoricoFiltrado() {
  const f = window._walletFiltroTipo || "todos";
  const p = window._walletFiltroPeriodo || "tudo";
  const hist = document.getElementById("wallet-historico");
  const all = window._walletItems || [];
  let items = all;

  // Filtro por tipo
  if (f === "recebidos") items = items.filter(t => t.sulis > 0 && String(t.tipo||"").toUpperCase()!=="ENTRADA" && String(t.ref_tipo||"")!=="daily_bonus");
  else if (f === "enviados") items = items.filter(t => t.sulis < 0 && String(t.tipo||"").toUpperCase()!=="EXPIRACAO");
  else if (f === "bonus")    items = items.filter(t => String(t.ref_tipo||"")==="daily_bonus");
  else if (f === "feira")    items = items.filter(t => /feira|barraca/i.test(String(t.ref_tipo||"") + " " + String(t.mensagem||"")));
  else if (f === "expirado") items = items.filter(t => String(t.tipo||"").toUpperCase()==="EXPIRACAO" || /expir/i.test(String(t.ref_tipo||"")));

  // Filtro por período
  const cutoff = _periodoCutoff(p);
  if (cutoff) items = items.filter(t => new Date(t.created_at).getTime() >= cutoff);

  if (!items.length) {
    hist.innerHTML = `<p style="color:var(--hint)">${tr("wf_nada_filtro")}</p>`;
    return;
  }
  hist.innerHTML = renderHistoricoAgrupado(items);
}

function renderCardComoGanhar() {
  return `
    <div class="card-info wallet-comoganhar">
      <h3 style="margin-top:0">✨ ${tr("wallet_como_ganhar")}</h3>
      <ul class="cg-lista">
        <li><span>⭐</span><div>${tr("cg_vote")}</div></li>
        <li><span>🗺️</span><div>${tr("cg_caca")}</div></li>
        <li><span>🛒</span><div>${tr("cg_coletiva")}</div></li>
        <li><span>📥</span><div>${tr("cg_amigos")}</div></li>
      </ul>
    </div>`;
}

// Agrupa histórico por dia + ícone por tipo + cor por sinal
function renderHistoricoAgrupado(items) {
  const grupos = {};
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  for (const t of items) {
    const d = new Date(t.created_at); d.setHours(0,0,0,0);
    let label;
    if (d.getTime() === hoje.getTime())  label = tr("hist_hoje");
    else if (d.getTime() === ontem.getTime()) label = tr("hist_ontem");
    else label = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
    (grupos[label] ||= []).push(t);
  }
  const ICO = {
    ENTRADA: "🎁", RECEBIDO: "📥", ENVIADO: "📤",
    MISSAO: "🎯", CACA_WP: "🗺️",
    BLOQUEIO: "🔒", DESBLOQUEIO: "🔓",
    PACOTE: "📦", SERVICO: "🛒",
    REATIVACAO: "🔁"
  };
  return Object.entries(grupos).map(([label, txs]) => `
    <div class="hist-grupo">
      <div class="hist-data">${escapeHtml(label)}</div>
      ${txs.map(t => {
        const ico = ICO[String(t.tipo || "").toUpperCase()] || "💠";
        const sinal = t.sulis >= 0 ? "+" : "";
        const cor = t.sulis >= 0 ? "#4caf50" : "#e53935";
        const hora = new Date(t.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        return `
          <div class="hist-linha">
            <div class="hist-ico">${ico}</div>
            <div class="hist-info">
              <strong>${VSWallet.tipoTxLabel(t.tipo)}</strong>
              <small>${escapeHtml(t.mensagem || t.ref_tipo || "")} · ${hora}</small>
            </div>
            <div class="hist-valor" style="color:${cor}">${sinal}${VSWallet.formatarSulis(t.sulis)}</div>
          </div>`;
      }).join("")}
    </div>`).join("");
}

// Abre modal "Receber" com QR-code
window.abrirReceber = function() {
  const alvo = window._walletReceberAlvo || "";
  if (!alvo) return alert(tr("wallet_nao_pronta"));
  document.getElementById("rcv-alvo").textContent = alvo;
  const tit = document.getElementById("rcv-titulo");
  if (tit) tit.innerHTML = `<span style="display:inline-flex;align-items:center;justify-content:center;gap:8px">${VSIcons.svg("arrow-down", 20)}<span>${tr("rcv_receber_sulcoins")}</span></span>`;
  const btnG = document.getElementById("rcv-gerar-btn");
  if (btnG) btnG.innerHTML = `${VSIcons.svg("refresh", 14)} ${tr("rcv_gerar_qr")}`;
  const inpV = document.getElementById("rcv-valor");
  const inpD = document.getElementById("rcv-desc");
  if (inpV) inpV.value = "";
  if (inpD) inpD.value = "";
  atualizarQRReceber();
  document.getElementById("modal-receber").style.display = "flex";
};
// Regenera o QR levando em conta valor + descrição (campos opcionais)
window.atualizarQRReceber = function() {
  const alvo = window._walletReceberAlvo || "";
  if (!alvo) return;
  const valorRaw = (document.getElementById("rcv-valor")?.value || "").trim();
  const descRaw  = (document.getElementById("rcv-desc")?.value || "").trim();
  const v = parseInt(valorRaw, 10);
  let payload = `vento-sul:tx?to=${encodeURIComponent(alvo)}`;
  const cobInfo = document.getElementById("rcv-cobranca-info");
  if (Number.isFinite(v) && v > 0) {
    payload += `&valor=${v}`;
    if (descRaw) payload += `&desc=${encodeURIComponent(descRaw.slice(0, 80))}`;
    if (cobInfo) {
      cobInfo.style.display = "block";
      cobInfo.innerHTML = `🧾 <strong>Cobrança de ${VSWallet.formatarSulis(v)}</strong>${descRaw ? ` · ${escapeHtml(descRaw)}` : ""}<br><small>${tr("rcv_escanear_paga")}</small>`;
    }
  } else if (cobInfo) {
    cobInfo.style.display = "none";
  }
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(payload)}`;
  document.getElementById("rcv-qr").src = qrUrl;
};
window.copiarReceberAlvo = function() {
  const alvo = window._walletReceberAlvo || "";
  if (!alvo) return;
  navigator.clipboard?.writeText(alvo).then(() => {
    const b = document.getElementById("rcv-copy");
    if (b) { const old = b.textContent; b.textContent = "✓ " + tr("rcv_copiado"); setTimeout(() => b.textContent = old, 1400); }
  });
};

// ─────────────────────────────────────────────────────────────
// 🎁 Bônus diário de check-in
// ─────────────────────────────────────────────────────────────
async function renderBonusDiario() {
  const div = document.getElementById("wallet-bonus");
  if (!div) return;
  const st = await VSWallet.dailyBonusStatus();
  if (!st) { div.innerHTML = ""; return; }
  const streak = st.streak || 0;
  const proxBonus = st.proximo_bonus || 0;
  const fogo = streak >= 7 ? "🔥" : (streak >= 3 ? "✨" : "🎁");
  const streakBadge = streak > 0
    ? `<span class="wb-streak">${fogo} ${streak} dia${streak>1?"s":""} seguido${streak>1?"s":""}</span>` : "";
  if (st.disponivel) {
    div.innerHTML = `
      <div class="wb-titulo">${fogo} ${tr("wb_bonus_hoje")} ${streakBadge}</div>
      <div class="wb-corpo">
        <div>
          <div class="wb-valor">+${st.sulis} sulis</div>
          ${proxBonus && proxBonus > st.sulis ? `<small style="color:var(--hint)">amanhã: +${proxBonus} sulis</small>` : ""}
        </div>
        <button class="btn-primary wb-btn" onclick="resgatarBonusDiario()">${tr("wb_resgatar")}</button>
      </div>`;
  } else {
    const segs = st.proximo_em_seg || 0;
    const h = Math.floor(segs / 3600);
    const m = Math.floor((segs % 3600) / 60);
    div.innerHTML = `
      <div class="wb-titulo">✓ ${tr("wb_bonus_resgatado")} ${streakBadge}</div>
      <div class="wb-corpo">
        <div>
          <div class="wb-valor wb-valor-pago">+${st.sulis} sulis · feito</div>
          <small style="color:var(--hint)">próximo em ${h}h ${m}min · +${proxBonus} sulis</small>
        </div>
      </div>`;
  }
}
window.resgatarBonusDiario = async function() {
  try {
    const r = await VSWallet.claimDailyBonus();
    const data = Array.isArray(r) ? r[0] : r;
    if (data?.ok) {
      const div = document.getElementById("wallet-bonus");
      if (div) div.innerHTML = `<div class="wb-titulo">🎉 +${data.sulis} sulis recebidos!</div>
        <div class="wb-corpo"><small style="color:var(--hint)">${escapeHtml(data.mensagem || "")}</small></div>`;
      // Atualiza saldo + histórico
      setTimeout(() => abrirWallet(), 1500);
    } else {
      alert(tr("wb_falha_resgate") + (data?.erro || tr("tenta_de_novo")));
    }
  } catch (e) {
    alert("Erro: " + (e.message || e));
  }
};

// ─────────────────────────────────────────────────────────────
// 📷 Scanner QR — usa BarcodeDetector, fallback pra digitar
// ─────────────────────────────────────────────────────────────
let _scanStream = null;
let _scanRaf = null;
window.abrirScanner = async function() {
  const modal = document.getElementById("modal-scanner");
  modal.style.display = "flex";
  const status = document.getElementById("scan-status");
  const video  = document.getElementById("scan-video");
  const tit = document.getElementById("scan-titulo");
  if (tit) tit.innerHTML = `<span style="display:inline-flex;align-items:center;justify-content:center;gap:8px">${VSIcons.svg("qr", 20)}<span>${tr("scan_ler_amigo")}</span></span>`;

  if (!("BarcodeDetector" in window)) {
    status.innerHTML = `${tr("scan_sem_suporte")}<br>
      ${tr("scan_digite_email")}
      <input id="scan-email-manual" type="email" placeholder="amigo@exemplo.com" style="margin-top:8px">
      <button class="btn-primary mc-btn" style="margin-top:8px;width:100%" onclick="usarEmailManual()">${tr("scan_usar_email")}</button>`;
    return;
  }
  status.textContent = tr("scan_aponte");
  try {
    _scanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }, audio: false
    });
    video.srcObject = _scanStream;
    await video.play();
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    const tick = async () => {
      if (!_scanStream) return;
      try {
        const codes = await detector.detect(video);
        if (codes && codes.length) {
          const raw = codes[0].rawValue || "";
          const parsed = _parseVentoSulQR(raw);
          fecharScanner();
          abrirTransferir(parsed);
          return;
        }
      } catch (e) { /* ignora */ }
      _scanRaf = requestAnimationFrame(tick);
    };
    _scanRaf = requestAnimationFrame(tick);
  } catch (e) {
    status.textContent = tr("scan_camera_bloqueada");
  }
};
window.fecharScanner = function() {
  if (_scanRaf) cancelAnimationFrame(_scanRaf);
  _scanRaf = null;
  if (_scanStream) {
    _scanStream.getTracks().forEach(t => t.stop());
    _scanStream = null;
  }
  document.getElementById("modal-scanner").style.display = "none";
};
window.usarEmailManual = function() {
  const v = document.getElementById("scan-email-manual")?.value?.trim();
  if (!v || !v.includes("@")) return alert(tr("scan_email_invalido"));
  fecharScanner();
  abrirTransferir({ alvo: v });
};

// Parse de QR vento-sul: aceita só email (legado) ou querystring com valor+desc
function _parseVentoSulQR(raw) {
  if (!raw) return null;
  const m = raw.match(/^vento-sul:tx\?(.+)$/);
  if (!m) return { alvo: raw };  // legado: o conteúdo TODO é o email
  const params = new URLSearchParams(m[1]);
  const alvo = params.get("to") ? decodeURIComponent(params.get("to")) : "";
  const valor = parseInt(params.get("valor") || "0", 10);
  const desc = params.get("desc") ? decodeURIComponent(params.get("desc")) : "";
  return { alvo, valor: Number.isFinite(valor) && valor > 0 ? valor : null, desc };
}

// ─────────────────────────────────────────────────────────────
// Tela 11 — Litorânea (texto livre + STT + TTS via shared)
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// Malha viva de pontos + linhas (canvas) — só roda na Litorânea
// ─────────────────────────────────────────────────────────────
const _malha = { canvas: null, ctx: null, particles: [], raf: null, dpr: 1 };
let _malhaTema = "litoranea"; // "litoranea" (azul-claro) | "landing" (verde intenso)
function _malhaInit() {
  if (_malha.canvas) return;
  _malha.canvas = document.getElementById("lit-malha");
  if (!_malha.canvas) return;
  _malha.ctx = _malha.canvas.getContext("2d");
  _malha.dpr = window.devicePixelRatio || 1;
  const resize = () => {
    if (!_malha.canvas) return;
    _malha.canvas.width  = window.innerWidth  * _malha.dpr;
    _malha.canvas.height = window.innerHeight * _malha.dpr;
    _malha.canvas.style.width  = window.innerWidth  + "px";
    _malha.canvas.style.height = window.innerHeight + "px";
    _malha.ctx.setTransform(_malha.dpr, 0, 0, _malha.dpr, 0, 0);
    // Densidade adaptativa — REDUZIDA pra performance mobile
    // (loop O(N²) calcula linhas pra cada par; menos partículas = scroll fluido)
    const area = window.innerWidth * window.innerHeight;
    const ehMobile = window.innerWidth < 768;
    const alvo = ehMobile
      ? Math.max(20, Math.min(40, Math.round(area / 28000)))   // mobile: 20-40
      : Math.max(35, Math.min(80, Math.round(area / 18000)));  // desktop: 35-80
    while (_malha.particles.length < alvo) _malha.particles.push(_novaParticula());
    while (_malha.particles.length > alvo) _malha.particles.pop();
  };
  resize();
  window.addEventListener("resize", resize);
}
// Paleta NEON vibrante (multicolorida saturada) — atribuída fixa por partícula
const _PALETA = [
  [80, 255, 160],  // verde neon
  [255, 220, 60],  // amarelo neon
  [255, 110, 80],  // laranja vivo
  [200, 100, 255], // roxo neon
  [80, 200, 255],  // ciano elétrico
  [255, 80, 160],  // magenta vivo
  [255, 250, 100], // limão neon
  [80, 255, 230],  // turquesa neon
  [255, 170, 60],  // âmbar
  [180, 255, 80],  // verde-limão
];
function _novaParticula() {
  const cor = _PALETA[Math.floor(Math.random() * _PALETA.length)];
  return {
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 0.30,
    vy: (Math.random() - 0.5) * 0.30,
    r:  1.4 + Math.random() * 1.8,
    cor // [r, g, b]
  };
}
function _malhaTick() {
  if (!_malha.ctx) return;
  const w = window.innerWidth, h = window.innerHeight;
  const ctx = _malha.ctx;
  ctx.clearRect(0, 0, w, h);
  const ps = _malha.particles;
  // Move partículas
  for (const p of ps) {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > w) p.vx *= -1;
    if (p.y < 0 || p.y > h) p.vy *= -1;
  }
  // Tema landing = mesmo efeito da Litorânea (linhas por distância, simples)
  // mas em verde. Litorânea = original azul.
  const isLanding = _malhaTema === "landing";

  if (isLanding) {
    const DIST = Math.min(180, Math.max(120, Math.sqrt(w * h) / 9));
    ctx.lineWidth = 1.2;
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const dx = ps[i].x - ps[j].x, dy = ps[i].y - ps[j].y;
        const d2 = dx*dx + dy*dy;
        if (d2 < DIST*DIST) {
          // 12/08/2026: era 0.95 (quase opaco) e as linhas tapavam o fundo.
          const a = (1 - Math.sqrt(d2)/DIST) * 0.34;
          ctx.strokeStyle = `rgba(140, 250, 180, ${a})`;
          ctx.beginPath();
          ctx.moveTo(ps[i].x, ps[i].y);
          ctx.lineTo(ps[j].x, ps[j].y);
          ctx.stroke();
        }
      }
    }
    // Pontos NEON — 12/08/2026: suavizados. Estavam em alpha 1.0 com glow 16 e
    // núcleo branco .85; junto com as linhas em .95 tapavam a foto de fundo.
    for (const p of ps) {
      const [r, g, b] = p.cor;
      // Glow externo grande
      ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.55)`;
      ctx.shadowBlur = 10;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 1.5, 0, Math.PI * 2);
      ctx.fill();
      // Núcleo branco-quente menor (efeito LED)
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255, 255, 255, 0.4)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  } else {
    // Litorânea original — não mexe
    const DIST = Math.min(140, Math.max(90, Math.sqrt(w * h) / 12));
    ctx.lineWidth = 1;
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const dx = ps[i].x - ps[j].x, dy = ps[i].y - ps[j].y;
        const d2 = dx*dx + dy*dy;
        if (d2 < DIST*DIST) {
          const a = (1 - Math.sqrt(d2)/DIST) * 0.55;
          ctx.strokeStyle = `rgba(180, 220, 255, ${a})`;
          ctx.beginPath();
          ctx.moveTo(ps[i].x, ps[i].y);
          ctx.lineTo(ps[j].x, ps[j].y);
          ctx.stroke();
        }
      }
    }
    ctx.fillStyle = "rgba(220, 240, 255, 0.85)";
    for (const p of ps) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  _malha.raf = requestAnimationFrame(_malhaTick);
}
function malhaStart() {
  _malhaInit();
  if (_malha.raf == null && _malha.ctx) _malha.raf = requestAnimationFrame(_malhaTick);
}
function malhaStop() {
  if (_malha.raf != null) cancelAnimationFrame(_malha.raf);
  _malha.raf = null;
  if (_malha.ctx) _malha.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
}

// 🎯 Performance: pausa animação canvas durante scroll/aba escondida
// (sem isso, RAF 60fps com O(N²) trava o scroll em mobile)
(function () {
  let scrollPauseTimer = null;
  let estavaRodando = false;
  function pausarTemporario() {
    if (_malha.raf != null) {
      estavaRodando = true;
      cancelAnimationFrame(_malha.raf);
      _malha.raf = null;
    }
    clearTimeout(scrollPauseTimer);
    scrollPauseTimer = setTimeout(() => {
      if (estavaRodando && _malha.ctx && _malha.raf == null) {
        _malha.raf = requestAnimationFrame(_malhaTick);
      }
      estavaRodando = false;
    }, 220);
  }
  // pausa durante scroll
  window.addEventListener("scroll", pausarTemporario, { passive: true, capture: true });
  // pausa quando aba fica em segundo plano
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (_malha.raf != null) { cancelAnimationFrame(_malha.raf); _malha.raf = null; estavaRodando = true; }
    } else {
      if (estavaRodando && _malha.ctx && _malha.raf == null) {
        _malha.raf = requestAnimationFrame(_malhaTick);
      }
      estavaRodando = false;
    }
  });
})();

function _addChatMsg(autor, texto, extra = "") {
  const chat = document.getElementById("lit-chat");
  if (!chat) return;
  const div = document.createElement("div");
  div.className = `chat-msg ${autor}`;
  div.innerHTML = `<div class="balao">${escapeHtml(texto)}${extra}</div>`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}
// Histórico de chat por bot (alimenta multi-turn da Edge Function)
window._chatHistorico = { litoranea: [], automata: [], aurora: [] };

async function perguntarLitoranea(textoOpcional) {
  const inp = document.getElementById("input-pergunta");
  const txt = (textoOpcional || inp?.value || "").trim();
  if (!txt) return;
  if (inp && !textoOpcional) inp.value = "";

  const bot = window._botAtivo || _botAtivo || "litoranea";
  const visualBot = (typeof _BOT_VISUAL !== "undefined" && _BOT_VISUAL[bot]) || { emoji: "🌊", cor: "#7af0ff" };

  // Comandos pra reabrir o funil ("muda cidade", "outro estado", "outra zona")
  // Só pra Litorânea — Automata/Aurora ignoram, vão direto pra IA.
  if (bot === "litoranea") {
    const t = txt.toLowerCase();
    if (/(muda|mudar|trocar|outro|outra)\s*(estado|uf)/.test(t)) {
      _addChatMsg("user", txt);
      window.litFunilResetar?.("estado"); return;
    }
    if (/(muda|mudar|trocar|outra)\s*cidade/.test(t)) {
      _addChatMsg("user", txt);
      window.litFunilResetar?.("cidade"); return;
    }
    if (/(muda|mudar|trocar|outra)\s*(zona|tópico|topico|assunto)/.test(t)) {
      _addChatMsg("user", txt);
      window.litFunilResetar?.("zona"); return;
    }
    // Funil ativo? Tenta casar a fala/digitação com um dos chips antes de mandar pra IA.
    // Ex: user fala "Curitiba" → mesmo efeito que clicar no chip Curitiba.
    if (window._litFunilHandler?.tryMatch?.(txt)) return;

    // Knowledge base LOCAL — tenta achar resposta sem bater em API.
    // Cobre 15 tópicos do app (carteira/sulcoin/pool/forja/comerciante/etc).
    const respLocal = window.VSKnowledge?.responder?.(txt);
    if (respLocal) {
      _addChatMsg("user", txt);
      _addChatMsg("lit", respLocal);
      try { window.VSLitoranea?.falarTTS?.(respLocal); } catch {}
      return;
    }
  }

  _addChatMsg("user", txt);
  _addChatMsg("lit", `${visualBot.emoji} …`);
  const chat = document.getElementById("lit-chat");
  const ultimaBolha = chat?.lastElementChild?.querySelector(".balao");

  // Adiciona ao histórico (com TTL — cliente trim faz sozinho na Edge Function)
  const histBot = window._chatHistorico[bot] || (window._chatHistorico[bot] = []);
  histBot.push({ role: "user", content: txt, ts: Date.now() });

  // ROTA 1 — Automata/Aurora: vão DIRETO pra Edge Function (sem parser de intenção)
  if (bot === "automata" || bot === "aurora") {
    try {
      const r = await window.VSLitoraneaAI?.ask({
        mensagem: txt,
        cidade: state.cidade,
        estado: state.estado,
        history: histBot,
        bot
      });
      const reply = r?.reply;
      if (reply && ultimaBolha) {
        ultimaBolha.textContent = `${visualBot.emoji} ${reply}`;
        const marca = document.createElement("span");
        marca.style.cssText = "display:block;margin-top:4px;font-size:10px;color:rgba(255,255,255,0.45)";
        marca.textContent = `${bot === "aurora" ? "✨" : "🤖"} ${r.source || ""}`;
        ultimaBolha.appendChild(marca);
        histBot.push({ role: "assistant", content: reply, ts: Date.now() });
        chat.scrollTop = chat.scrollHeight;
        try { window.VSLitoranea?.falarTTS?.(reply); } catch {}
        return;
      }
      if (ultimaBolha) ultimaBolha.textContent = `${visualBot.emoji} ${tr("lit_nao_entendi")}`;
      return;
    } catch (e) {
      console.warn("[Trio]", e.message);
      if (ultimaBolha) ultimaBolha.textContent = `${visualBot.emoji} ${tr("erro")}: ${e.message || ""}`;
      return;
    }
  }

  // ROTA 2 — Litorânea: parser local (intenções) + fallback IA, igual antes
  try {
    if (window.VSOllama) {
      if (!VSOllama.isReady()) await VSOllama.init();
      if (VSOllama.isReady()) {
        const out = await VSOllama.perguntar(txt, { estado: state.estado, cidade: state.cidade });
        const textoResp = out?.text;
        if (textoResp && ultimaBolha) {
          ultimaBolha.textContent = textoResp;
          const marca = document.createElement("span");
          marca.style.cssText = "display:block;margin-top:4px;font-size:10px;color:rgba(255,255,255,0.55)";
          marca.textContent = `🧠 Llama (${out.durMs}ms)`;
          ultimaBolha.appendChild(marca);
          chat.scrollTop = chat.scrollHeight;
          histBot.push({ role: "assistant", content: textoResp, ts: Date.now() });
          try { window.VSLitoranea?.falarTTS?.(textoResp); } catch {}
          return;
        }
      }
    }
  } catch (e) { console.warn("[Ollama]", e.message); }

  const r = await VSLitoranea.processar(txt, { estado: state.estado, cidade: state.cidade });
  if (!r) {
    // Fallback final pra Litorânea: chama a Edge Function com bot=litoranea
    try {
      const _sufixoIdioma = langCode() === "en" ? " [answer in English]" : langCode() === "es" ? " [responde en español]" : "";
      const ai = await window.VSLitoraneaAI?.ask({
        mensagem: txt + _sufixoIdioma, cidade: state.cidade, estado: state.estado,
        history: histBot, bot: "litoranea", idioma: langCode()
      });
      if (ai?.reply && ultimaBolha) {
        ultimaBolha.textContent = ai.reply;
        histBot.push({ role: "assistant", content: ai.reply, ts: Date.now() });
        chat.scrollTop = chat.scrollHeight;
        return;
      }
    } catch {}
    if (ultimaBolha) ultimaBolha.textContent = tr("lit_nao_entendi");
    return;
  }
  if (ultimaBolha) {
    ultimaBolha.textContent = r.texto;
    histBot.push({ role: "assistant", content: r.texto, ts: Date.now() });
    if (r.acao_navegar?.acao) {
      const btn = document.createElement("button");
      btn.className = "btn-primary";
      btn.style.cssText = "margin-top:8px;padding:8px 14px;font-size:12px;width:auto";
      btn.textContent = "→ " + tr("lit_abrir");
      btn.onclick = () => executarAcao(r.acao_navegar.acao);
      ultimaBolha.appendChild(document.createElement("br"));
      ultimaBolha.appendChild(btn);
    }
  }
  chat.scrollTop = chat.scrollHeight;
}

// Quick chips
document.querySelectorAll(".chip").forEach(c => c.addEventListener("click", () => {
  const acao = c.dataset.chip;
  const perguntas = {
    praias: "me sugere uma praia legal",
    feira: "o que tem na feira digital?",
    promocoes: "tem promoções por aqui?",
    caca: "como funciona a caça ao tesouro?",
    historia: "me conta uma história do litoral"
  };
  perguntarLitoranea(perguntas[acao] || acao);
}));

window.executarAcao = function(codigo) {
  if (codigo === "promocoes") abrirPromos();
  else if (codigo === "barracas") abrirFeira();
  else if (codigo === "mais_votados") abrirVotados();
  else if (codigo === "caca") abrirCaca();
  else if (codigo === "compras_coletiva") abrirColetiva();
  else if (codigo === "praias") abrirPraias();
  else if (codigo === "wallet") abrirWallet();
};

async function iniciarMic() {
  const btn = document.getElementById("btn-mic");
  const micIconSvg = '📻';
  if (btn) { btn.dataset.original = btn.innerHTML; btn.innerHTML = `${micIconSvg} ouvindo…`; btn.disabled = true; }
  const r = await VSLitoranea.ouvir();
  if (btn) { btn.innerHTML = btn.dataset.original || micIconSvg; btn.disabled = false; }
  if (!r.texto) {
    alert(r.dica || tr("mic_falhou"));
    return;
  }
  document.getElementById("input-pergunta").value = r.texto;
  perguntarLitoranea();
}

// Conversa multi-turn: Litorânea sugere praia (sossego/badalada/onda)
let _conversaPraia = null;
async function iniciarConversaPraia() {
  if (!state.cidade) {
    alert(tr("escolha_cidade_praias"));
    return;
  }
  const resp = document.getElementById("resposta-litoranea");
  resp.style.display = "block";
  resp.innerHTML = `<p>🌊 …</p>`;

  _conversaPraia = VSLitoranea.conversaPraia({
    cidade: state.cidade,
    estado: state.estado,
    onFalar: (texto, escutarDepois) => {
      resp.innerHTML = `<p>🌊 ${escapeHtml(texto)}</p>`;
      if (escutarDepois) setTimeout(escutarRespostaConversa, 1200);
    },
    onNavegarPraia: (praia) => {
      _conversaPraia = null;
      abrirDetalhePraia(praia);
    },
    onEncerrar: () => { _conversaPraia = null; }
  });
  _conversaPraia.iniciar();
}

async function escutarRespostaConversa() {
  if (!_conversaPraia) return;
  const r = await VSLitoranea.ouvir();
  const t = r?.texto || null;
  if (!t) {
    const resp = document.getElementById("resposta-litoranea");
    resp.innerHTML += `<p style="color:var(--hint);font-size:12px">${tr("nao_te_ouvi")}</p>` +
      `<input id="input-conversa" type="text" placeholder="sossego / badalada / surfe / sim / não" style="width:100%;padding:10px;background:var(--section);color:var(--text);border:1px solid var(--separator);border-radius:8px">`;
    document.getElementById("input-conversa")?.addEventListener("keypress", async e => {
      if (e.key === "Enter" && _conversaPraia) {
        const v = e.target.value.trim();
        e.target.disabled = true;
        await _conversaPraia.receberFala(v);
      }
    });
    return;
  }
  await _conversaPraia.receberFala(t);
}

// ─────────────────────────────────────────────────────────────
// Voto / comprar barraca / Pix (precisam de bot)
// ─────────────────────────────────────────────────────────────
async function abrirVotacaoModal() {
  if (!state.cidade) { alert(tr("escolha_cidade")); return; }
  const nome = prompt(tr("nome_votar")); if (!nome) return;
  const cat  = prompt(tr("categoria")) || "";
  const emoji = prompt("Emoji:", "⭐") || "⭐";
  try {
    const r = await botApi("/api/voto", {
      alvo_nome: nome, alvo_categoria: cat, alvo_emoji: emoji,
      estado: state.estado, cidade: state.cidade
    });
    alert(r.ok ? tr("voto_ok") : `Erro: ${r.erro}`);
  } catch {
    alert("Sem conexão com bot — escritas autenticadas exigem BOT_API_URL configurado.");
  }
}

async function comprarBarracaAutenticado() {
  const b = state.barraca; if (!b) return;
  const novoNome = prompt(tr("nome_negocio")); if (!novoNome) return;
  const cat = prompt(tr("categoria_negocio")) || "";
  try {
    const r = await botApi("/api/comprar-barraca", {
      barraca_id: b.id, novo_nome: novoNome, categoria: cat
    });
    if (r.ok) { alert(tr("barraca_comprada")); abrirFeira(); }
    else alert(`Erro: ${r.erro}`);
  } catch {
    alert("Sem conexão com bot.");
  }
}

async function gerarPix(data) {
  try {
    const r = await botApi("/api/pix", {
      produto_id: data.id, nome: data.nome, preco_centavos: parseInt(data.preco)
    });
    if (r.pix_url && tg?.openInvoice) {
      tg.openInvoice(r.pix_url, (status) =>
        alert(status === "paid" ? "✅ Pago!" : `Status: ${status}`));
    } else if (r.pix_copia_cola) {
      navigator.clipboard.writeText(r.pix_copia_cola);
      alert(tr("pix_copiado") + "\n\n" + r.pix_copia_cola);
    } else {
      alert(tr("pix_indisponivel"));
    }
  } catch {
    alert("Pix em modo dev — bot precisa estar configurado");
  }
}

// ─────────────────────────────────────────────────────────────
// Bottom bar + ações
// ─────────────────────────────────────────────────────────────
// Abre uma tela pelo NOME chamando o inicializador certo, nao so showScreen().
// Ponto unico usado pelo bottom-bar, pelo boot, pelo voltar e pelo hash — antes
// cada caminho fazia o seu, e quem so chamava showScreen() abria a tela vazia.
function abrirTela(s) {
  if (s === "comercio")  return abrirComercio();
  if (s === "feira")     return abrirFeira();
  if (s === "votados")   return abrirVotados();
  if (s === "caca")      return abrirCaca();
  if (s === "praias")    return abrirPraias();
  if (s === "wallet")    return abrirWallet();
  if (s === "perto")     return abrirPerto();
  if (s === "praiashub") return abrirPraiasHub();
  if (s === "quests")    return abrirQuestsVivas();
  if (s === "litoranea") { showScreen("litoranea"); return mostrarSaudacaoLit(); }
  return showScreen(s || "landing");
}
window.abrirTela = abrirTela;

document.querySelectorAll("#bottom-bar button").forEach(b => b.addEventListener("click", () => {
  if (b.dataset.suppressClick) { delete b.dataset.suppressClick; return; }
  abrirTela(b.dataset.screen);
}));

// ─────────────────────────────────────────────────────────────
// Long-press no ícone Litorânea → fluxo guiado estado → cidade
// (toque curto continua abrindo a tela; segurar ~600ms ativa a guia falada)
// ─────────────────────────────────────────────────────────────
(function () {
  const btn = document.getElementById("bb-litoranea");
  if (!btn) return;
  let timer = null;
  let trig = false;
  const HOLD_MS = 600;
  const start = () => {
    trig = false;
    clearTimeout(timer);
    timer = setTimeout(() => {
      trig = true;
      btn.dataset.suppressClick = "1";
      iniciarLocalizacaoGuiada();
    }, HOLD_MS);
  };
  const cancel = () => { clearTimeout(timer); };
  btn.addEventListener("touchstart", start, { passive: true });
  btn.addEventListener("touchend", cancel);
  btn.addEventListener("touchcancel", cancel);
  btn.addEventListener("touchmove", cancel);
  btn.addEventListener("mousedown", start);
  btn.addEventListener("mouseup", cancel);
  btn.addEventListener("mouseleave", cancel);
})();

// ─────────────────────────────────────────────────────────────
// Modo cinema — 5s sem interação na Litorânea/Landing → UI some,
// rola slideshow das melhores fotos do lugar. Toque traz de volta.
// ─────────────────────────────────────────────────────────────
(function () {
  const IDLE_MS = 180000;  // 3min parado antes de entrar no cinema
  const SLIDE_MS = 4000;   // dentro do cinema, foto troca de 4 em 4s
  let idleTimer = null;
  let slideTimer = null;
  let fotosCache = null;     // { chave, fotos: [...] }
  let cacheCidade = null;
  let layerVis = "a";
  let idx = 0;

  function _stage() {
    let s = document.getElementById("cinema-stage");
    if (s) return s;
    s = document.createElement("div");
    s.id = "cinema-stage";
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = `
      <div class="cs-layer cs-a"></div>
      <div class="cs-layer cs-b"></div>
      <div class="cs-caption"></div>
      <div class="cs-toque">${tr("toque_continuar")}</div>
      <button class="cs-coracao" aria-label="Curtir foto" type="button">♥</button>
    `;
    document.body.appendChild(s);
    // Click no coração = like; bloqueia propagação pra não acordar e sair do cinema
    s.querySelector(".cs-coracao").addEventListener("click", async (ev) => {
      ev.stopPropagation(); ev.preventDefault();
      const f = window._csFotoAtual;
      if (!f || !f.id) return;
      const el = ev.currentTarget;
      el.classList.add("bump");
      setTimeout(() => el.classList.remove("bump"), 420);
      try {
        const sess = JSON.parse(localStorage.getItem("vs.sb.session") || "null");
        if (!sess?.access_token) return;
        await fetch(`${window.VENTOSUL_CONFIG.SUPABASE_URL}/rest/v1/rpc/toggle_like_foto`, {
          method: "POST",
          headers: {
            "apikey": window.VENTOSUL_CONFIG.SUPABASE_ANON_JWT,
            "Authorization": "Bearer " + sess.access_token,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ p_foto_id: f.id })
        });
        el.classList.toggle("liked");
      } catch {}
    }, true);
    return s;
  }

  // Fotos épicas locais pra Landing — versão portrait (mobile, 810x1440)
  const FOTOS_LANDING_PORTRAIT = [
    { url: "bg/bg_hero.webp",          sublocal: "Vento Sul" },
    { url: "bg/bg_aurora.webp",        sublocal: "Aurora" },
    { url: "bg/bg_florianopolis.webp", sublocal: "Florianópolis", cidade: "" },
    { url: "bg/bg_praia_crystal.webp", sublocal: "Praia" },
    { url: "bg/bg_ponte_floripa.webp", sublocal: "Ponte Hercílio Luz", cidade: "Florianópolis" },
    { url: "bg/bg_florianopolis_v4.webp", sublocal: "Florianópolis ao pôr do sol" },
    { url: "bg/bg_praia_crystal_v4.webp", sublocal: "Praia cristalina" },
    { url: "bg/bg_hero_v3.webp",       sublocal: "Vento Sul" },
  ];
  // Versão landscape (web, 1920x1080) — mesmas cenas, formato horizontal.
  // Adicionar arquivos em bg/wide/ com mesmo nome → entram automático nos PCs.
  const FOTOS_LANDING_LANDSCAPE = FOTOS_LANDING_PORTRAIT.map(f => ({
    ...f, url: f.url.replace("bg/", "bg/wide/")
  }));
  // Por enquanto sempre portrait — bg/wide/ ainda vazia.
  // Quando usuário gerar landscapes 1920x1080, reativar o switching wide:
  //   const wide = window.innerWidth > window.innerHeight + 80;
  //   return wide ? FOTOS_LANDING_LANDSCAPE : FOTOS_LANDING_PORTRAIT;
  function _fotosLanding() {
    return FOTOS_LANDING_PORTRAIT;
  }

  async function _carregarFotos() {
    const naLanding = document.body.classList.contains("tela-landing");
    const chave = naLanding ? "_landing_" :
      (state?.cidade && state?.estado) ? `${state.estado}|${state.cidade}` : "_geral_";
    if (fotosCache && fotosCache.chave === chave) return fotosCache.fotos;
    let lista = [];
    if (naLanding) {
      lista = _fotosLanding();
    } else {
      try {
        if (state?.cidade && state?.estado) {
          // RPC ordena: mais votadas (likes desc) → menos exibidas → random.
          // Filtra ESTRITO por cidade/estado — sem fallback geral pra não vazar foto de outro lugar.
          const r = await fetch(`${window.VENTOSUL_CONFIG.SUPABASE_URL}/rest/v1/rpc/fotos_locais_ordenadas`, {
            method: "POST",
            headers: {
              "apikey": window.VENTOSUL_CONFIG.SUPABASE_ANON_JWT,
              "Authorization": "Bearer " + window.VENTOSUL_CONFIG.SUPABASE_ANON_JWT,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ p_cidade: state.cidade, p_uf: state.estado, p_limit: 30 })
          });
          if (r.ok) lista = await r.json();
        }
      } catch {}
      // FALLBACK regional se local vazia
      if (lista.length < 5) {
        try {
          const res = await fetch("/img/acervo-sul/fotos-sul.json");
          const regional = await res.json();
          lista = [...lista, ...regional];
        } catch {}
      }
      // SEM fallback pra qualquer foto — preserva integridade local.
    }
    // Mais votadas primeiro (sem shuffle pras top 5); depois mistura o restante
    if (lista.length > 5) {
      const top = lista.slice(0, 5);
      const resto = lista.slice(5);
      for (let i = resto.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [resto[i], resto[j]] = [resto[j], resto[i]];
      }
      lista = [...top, ...resto];
    }
    fotosCache = { chave, fotos: lista };
    return lista;
  }

  function _aplicarSlide(fotos) {
    if (!fotos || !fotos.length) return;
    const stage = _stage();
    const a = stage.querySelector(".cs-a");
    const b = stage.querySelector(".cs-b");
    const cap = stage.querySelector(".cs-caption");
    const f = fotos[idx % fotos.length];
    const layerProx = layerVis === "a" ? b : a;
    const layerAtual = layerVis === "a" ? a : b;
    // Pré-carrega a foto e só troca os layers depois que ela carregou (evita tela preta)
    const preload = new Image();
    preload.onload = () => {
      layerProx.style.backgroundImage = `url('${f.url}')`;
      requestAnimationFrame(() => {
        layerProx.style.opacity = "1";
        layerAtual.style.opacity = "0";
      });
      layerVis = layerVis === "a" ? "b" : "a";
    };
    preload.onerror = () => {
      // Foto quebrada — pula pra próxima
      console.warn("[cinema] 404", f.url);
      idx++;
      _aplicarSlide(fotos);
    };
    preload.src = f.url;
    const lugar = f.sublocal ? `${f.sublocal} · ${f.cidade || ""}` : (f.cidade || "");
    cap.textContent = lugar;
    // Expõe foto atual pro botão de coração saber qual curtir
    window._csFotoAtual = f;
    // Reseta estado "liked" do coração quando troca foto
    const cor = stage.querySelector(".cs-coracao");
    if (cor) cor.classList.remove("liked");
    // preload próxima
    const nx = fotos[(idx + 1) % fotos.length];
    if (nx) { const im = new Image(); im.src = nx.url; }
  }

  async function entrarCinema() {
    const fotos = await _carregarFotos();
    // Aborta se user já saiu do idle enquanto buscávamos fotos
    if (!document.body.classList.contains("cinema-idle")) return;
    if (!fotos.length) return;
    idx = 0;
    _aplicarSlide(fotos);
    clearInterval(slideTimer);
    slideTimer = setInterval(() => {
      if (document.hidden) return;
      if (!document.body.classList.contains("cinema-idle")) {
        clearInterval(slideTimer); slideTimer = null;
        return;
      }
      idx++;
      _aplicarSlide(fotos);
    }, SLIDE_MS);
  }

  function sairCinema() {
    clearInterval(slideTimer);
    slideTimer = null;
    const s = document.getElementById("cinema-stage");
    if (s) s.querySelectorAll(".cs-layer").forEach(l => l.style.opacity = "0");
  }

  function despertar() {
    const era = document.body.classList.contains("cinema-idle");
    if (era) {
      document.body.classList.remove("cinema-idle");
      sairCinema();
    }
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      // Cinema só na landing — em outras telas o conteúdo não pode sumir
      if (!document.body.classList.contains("tela-landing")) return;
      document.body.classList.add("cinema-idle");
      entrarCinema();
    }, IDLE_MS);
  }

  // pointerdown/click cobrem standalone PWA; touchstart pra mobile;
  // mousemove/wheel/keydown pra desktop
  ["pointerdown","touchstart","click","mousedown","mousemove","scroll","keydown","wheel"].forEach(ev =>
    window.addEventListener(ev, despertar, { passive: true, capture: true })
  );
  // Invalida cache de fotos quando cidade muda
  window.addEventListener("vs:cidade-mudou", () => { fotosCache = null; });
  despertar();
})();

// ─────────────────────────────────────────────────────────────
// Tour falado da Landing — Litorânea explica o app pra gente simples
// ─────────────────────────────────────────────────────────────
const TOUR_APP_ROTEIRO = [
  "Oi, tudo bom? Eu sou a Litorânea.",
  "Deixa eu te explicar como esse app funciona, bem devagarinho.",
  "Esse aqui é o Vento Sul. É um guia do Sul do Brasil pra você descobrir cidades, praias, comércio e fazer amizades.",
  "Olha aí no rodapé da tela. Você vê cinco botões.",
  "O primeiro, com a casinha, é o Início. Sempre que você quiser voltar pra cá, é só apertar nele.",
  "O segundo, com a casinha de loja, é o Comércio. Lá você vê as barracas de gente que vende coisas perto de você.",
  "No meio tem o meu ícone, com chapéu de palha. Sou eu. Toca rápido pra abrir nosso chat e me perguntar qualquer coisa.",
  "Se você segurar apertado em mim por uns segundos, eu te pergunto o estado e a cidade onde você está, e te levo direto pra lá.",
  "O quarto botão, com cifrão, é a Carteira. Lá você guarda os SulCoins, que são as moedinhas do nosso app. Você ganha algumas por dia, só por entrar.",
  "O quinto, com guarda-sol, é Praias. Eu te ajudo a achar a praia certa pro seu humor: sossego, badalada, ou onda pra surfar.",
  "Uma coisa legal: se você ficar parado uns segundos sem mexer, o app fica só com fotos bonitas do lugar, rodando devagar. Toca em qualquer lugar e a tela volta.",
  "Pronto. Bom passeio! Se precisar, é só apertar em mim aqui em baixo."
];

let _tourFalando = false;
let _tourCancelado = false;
function pararTour() {
  _tourCancelado = true;
  try { window.speechSynthesis.cancel(); } catch {}
  try { window.VSFalar?.parar?.(); } catch {}
  document.getElementById("btn-tour-app")?.classList.remove("falando");
  _tourFalando = false;
}
async function iniciarTourApp() {
  const btn = document.getElementById("btn-tour-app");
  if (_tourFalando) { pararTour(); return; }
  _tourFalando = true;
  _tourCancelado = false;
  btn?.classList.add("falando");
  try {
    for (const frase of TOUR_APP_ROTEIRO) {
      if (_tourCancelado) break;
      // Voz fluida via VSFalar (radio-tts → XTTS → web). Fallback Web Speech se VSFalar não existir.
      if (window.VSFalar?.falar) {
        try { await window.VSFalar.falar(frase); } catch {}
      } else {
        await new Promise(resolve => {
          if (!("speechSynthesis" in window)) { resolve(); return; }
          try {
            const u = new SpeechSynthesisUtterance(frase);
            u.lang = "pt-BR"; u.rate = 0.95; u.pitch = 1.05; u.volume = 1.0;
            let done = false;
            const fim = () => { if (!done) { done = true; resolve(); } };
            u.onend = fim; u.onerror = fim;
            window.speechSynthesis.speak(u);
            setTimeout(fim, Math.max(4000, frase.length * 90));
          } catch { resolve(); }
        });
      }
      // pausa curta entre frases
      if (!_tourCancelado) await new Promise(r => setTimeout(r, 380));
    }
  } finally {
    btn?.classList.remove("falando");
    _tourFalando = false;
  }
}
document.getElementById("btn-tour-app")?.addEventListener("click", iniciarTourApp);

// ─────────────────────────────────────────────────────────────
// 🔐 Persistência da conta — login / cadastro / recovery / LGPD delete
// ─────────────────────────────────────────────────────────────
window.persTab = function(tab) {
  document.querySelectorAll(".pers-tab").forEach(b =>
    b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".pers-pane").forEach(p =>
    p.style.display = p.id === `pers-pane-${tab}` ? "block" : "none");
  // Mostra "Excluir conta" apenas quando estiver logado E na aba "conta"
  const exc = document.getElementById("pers-excluir-wrap");
  if (exc) exc.style.display = (tab === "conta") ? "block" : "none";
};

window.abrirPersistencia = async function() {
  const modal = document.getElementById("modal-persistencia");
  if (!modal) return;
  // Atualiza UI baseado em logado/anônimo
  const sess = VSSupabase.getSession?.();
  const email = sess?.user?.email || null;
  const isAnon = !email;  // anônimo não tem email
  document.querySelector('.pers-tab[data-tab="conta"]').style.display = email ? "" : "none";
  if (email) {
    document.getElementById("pers-conta-email").textContent = email;
    document.getElementById("pers-titulo").textContent = tr("sua_conta");
    persTab("conta");
  } else {
    document.getElementById("pers-titulo").textContent = tr("persistencia_conta");
    persTab("entrar");
  }
  modal.style.display = "flex";
};

window.persEntrar = async function() {
  const email = document.getElementById("pers-entrar-email").value.trim();
  const senha = document.getElementById("pers-entrar-senha").value;
  if (!email.includes("@")) return alert(tr("email_invalido"));
  if (!senha) return alert(tr("senha_obrigatoria"));
  try {
    await VSSupabase.signIn(email, senha);
    alert(tr("logado_sincronizado"));
    document.getElementById("modal-persistencia").style.display = "none";
    location.reload();
  } catch (e) {
    alert("Erro: " + (e.message || e));
  }
};

// 🪪 Adapta botão Google quando user já tá logado
function _atualizarBotaoGoogle() {
  const btn = document.getElementById("btn-google-login");
  if (!btn) return;
  let sess = null;
  try { sess = JSON.parse(localStorage.getItem("vs.sb.session") || "null"); } catch {}
  const user = sess?.user;
  if (user?.email) {
    const provider = user.app_metadata?.provider === "google" ? "🪪 Google" : "✉️";
    const inicial = (user.email[0] || "?").toUpperCase();
    const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
    // Botão redondo — G colorido no centro, fundo glass azulado
    btn.title = `${user.email} · toque pra sair`;
    btn.style.cssText = `
  width:44px;height:44px;border-radius:50%;
  background:rgba(10,14,20,0.75);
  border:1.5px solid rgba(66,133,244,0.5);
  box-shadow:0 0 0 2px rgba(66,133,244,0.25), 0 0 14px rgba(66,133,244,0.3);
  display:flex;align-items:center;justify-content:center;cursor:pointer;
  backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  transition:box-shadow 0.2s;padding:0;margin:0 auto;
`;
    btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>`;
    btn.onclick = function() {
      if (!confirm(tr("sair_conta"))) return;
      try { localStorage.removeItem("vs.sb.session"); } catch {}
      try { document.cookie = "vs.refresh=; Path=/; Max-Age=0; Domain=.vento-sul.tech; SameSite=Lax"; } catch {}
      try { document.cookie = "vs.refresh=; Path=/; Max-Age=0"; } catch {}
      location.reload();
    };
  } else {
    // Restaura look "Continuar com Google"
    btn.title = tr("continuar_google");
    btn.style.borderColor = "#e2e8f0";
    btn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.10)";
    btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>`;
    btn.onclick = window.persGoogle;
  }
}
window._atualizarBotaoGoogle = _atualizarBotaoGoogle;
// Roda ao carregar e depois de qualquer mudança de auth
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", _atualizarBotaoGoogle);
} else {
  _atualizarBotaoGoogle();
}
// Reage a logout/login em outras abas
window.addEventListener("storage", e => { if (e.key === "vs.sb.session") _atualizarBotaoGoogle(); });

// 🪪 Login com Google
// 1. Limpa cache/SW velhos antes (evita aba normal travar)
// 2. Força select_account no Google (evita conta velha cacheada)
// 3. redirect_to=/auth-callback.html (página fora do SW)
window.persGoogle = async function() {
  const SUPA = window.VENTOSUL_CONFIG?.SUPABASE_URL || "https://vdrzndgkwdpibexjkyxi.supabase.co";
  const params = new URLSearchParams(location.search);
  const ref = params.get("ref");
  // Sempre devolve pro MESMO host onde o user clicou (apex ou www).
  // Antes a gente forçava apex; daí Cloudflare 301-ava pra www e
  // alguns navegadores dropavam o hash com o token, fazendo o login não completar.
  const base = location.origin;

  // 🧹 Pre-flight: limpa caches do SW e localStorage de sessão velha (preserva user prefs)
  try {
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    // Sessão velha pode estar corrompida — limpa antes de novo login
    localStorage.removeItem("vs.sb.session");
  } catch {}

  // Página dedicada que NUNCA passa pelo SW
  const adminRedir = params.get("admin_redirect");
  const cbParams = new URLSearchParams();
  if (ref) cbParams.set("ref", ref);
  if (adminRedir) cbParams.set("admin_redirect", adminRedir);
  const cbQuery = cbParams.toString() ? "?" + cbParams.toString() : "";
  const redirectTo = base + "/auth-callback.html" + cbQuery;
  // prompt=select_account força Google mostrar seletor (evita conta velha cacheada na aba)
  const url = `${SUPA}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}&prompt=select_account`;
  location.href = url;
};

// Captura callback OAuth do Google: Supabase volta com #access_token=...&refresh_token=...
// IMPORTANTE: roda SÍNCRONO antes do VSSupabase.init() pra garantir que ele leia a sessão
(function captarOAuthCallback() {
  if (!location.hash || !location.hash.includes("access_token")) return;
  try {
    const hashParams = new URLSearchParams(location.hash.slice(1));
    const access_token = hashParams.get("access_token");
    const refresh_token = hashParams.get("refresh_token");
    const expires_in = parseInt(hashParams.get("expires_in") || "3600");
    if (!access_token) return;

    // Decodifica payload JWT pra pegar user info
    const payload = JSON.parse(atob(access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));

    const session = {
      access_token,
      refresh_token: refresh_token || "",
      expires_at: Math.floor(Date.now()/1000) + expires_in,
      expires_in,
      token_type: "bearer",
      provider_token: hashParams.get("provider_token") || null,
      provider_refresh_token: hashParams.get("provider_refresh_token") || null,
      user: {
        id: payload.sub,
        aud: payload.aud || "authenticated",
        role: payload.role || "authenticated",
        email: payload.email,
        email_confirmed_at: new Date().toISOString(),
        phone: payload.phone || "",
        user_metadata: payload.user_metadata || {},
        app_metadata: payload.app_metadata || { provider: "google" },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    // Salva no localStorage (chave que VSSupabase usa)
    localStorage.setItem("vs.sb.session", JSON.stringify(session));

    // Salva cookie do refresh_token pra sobreviver apex↔www e PWA reinstall
    if (refresh_token) {
      try {
        const dom = /vento-sul\.tech$/i.test(location.hostname) ? "; Domain=.vento-sul.tech" : "";
        const sec = location.protocol === "https:" ? "; Secure" : "";
        document.cookie = `vs.refresh=${encodeURIComponent(refresh_token)}; Path=/; Max-Age=${60*60*24*30}; SameSite=Lax${sec}${dom}`;
      } catch {}
    }

    vslog("oauth-callback ✅ login Google salvo");

    // Limpa o hash da URL (mantém a query, ex: ?ref=...)
    history.replaceState({}, "", location.pathname + location.search);

    // NÃO recarrega — VSSupabase.init() vai ler localStorage e popular sessão
    // Mas damos 1 sinalizador pra o app reagir
    sessionStorage.setItem("vs.acabou_de_logar", "google");
  } catch (e) {
    console.error("[oauth-callback] erro:", e);
  }
})();

window.persCriar = async function() {
  const email = document.getElementById("pers-criar-email").value.trim();
  const senha = document.getElementById("pers-criar-senha").value;
  const aceito = document.getElementById("pers-aceito-termos").checked;
  if (!email.includes("@")) return alert("Email inválido");
  if (senha.length < 8) return alert(tr("senha_min_8"));
  if (!aceito) return alert(tr("aceitar_termos_lgpd"));
  try {
    await VSSupabase.signUp(email, senha, { lgpd_aceito_em: new Date().toISOString() });
    // Se entrou via link de indicação, usa o código agora
    let bonus = "";
    try {
      const ref = localStorage.getItem("vs_ref_pending");
      if (ref) {
        const r = await VSSupabase.rpc("usar_codigo_indicacao", { p_codigo: ref });
        const d = Array.isArray(r) ? r[0] : r;
        if (d?.ok) {
          bonus = `\n🎁 +${d.creditou_novo} sulis e ${d["dias_grátis"]} dias grátis (bônus indicação).`;
          localStorage.removeItem("vs_ref_pending");
        }
      }
    } catch {}
    alert(`✓ Conta criada!${bonus}`);
    document.getElementById("modal-persistencia").style.display = "none";
    location.reload();
  } catch (e) {
    alert("Erro: " + (e.message || e));
  }
};

// ─────────────────────────────────────────────────────────────
// 🎁 Tela de convite — meu link + QR + estatísticas
// ─────────────────────────────────────────────────────────────
window.abrirConvite = async function() {
  let modal = document.getElementById("modal-convite");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-convite";
    modal.className = "modal-bg zone-comercial";
    modal.innerHTML = `
      <div class="modal" style="text-align:center;max-width:480px">
        <h3 style="display:inline-flex;align-items:center;gap:8px">${VSIcons.svg("gift", 20)} ${tr("convide_amigos")}</h3>
        <p style="font-size:13px;color:var(--zc-hint);margin:6px 0 14px">
          Cada amigo que entra pelo seu link: <strong>+100 sulis pra você</strong>, +50 pro amigo, e <strong>7 dias grátis pros dois</strong>.
        </p>
        <div id="convite-stats" style="display:flex;gap:14px;justify-content:center;margin-bottom:14px">
          <div><div style="font-size:22px;font-weight:600;color:var(--zc-warn)" id="cv-total">—</div><small>${tr("amigos")}</small></div>
          <div><div style="font-size:22px;font-weight:600;color:var(--zc-positivo)" id="cv-sc">—</div><small>${tr("sulis_ganhos")}</small></div>
        </div>
        <img id="cv-qr" alt="QR" style="width:240px;height:240px;background:#fff;border-radius:4px;padding:8px;display:inline-block">
        <div id="cv-codigo" style="font-size:18px;font-weight:700;letter-spacing:2px;margin:12px 0;color:var(--zc-accent);font-family:monospace"></div>
        <div id="cv-link" style="font-size:12px;color:var(--zc-hint);word-break:break-all;margin-bottom:12px"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn-primary mc-btn" style="flex:1" onclick="conviteCompartilhar()">${VSIcons.svg("send", 14)} ${tr("compartilhar")}</button>
          <button class="btn-primary mc-btn" style="flex:1" onclick="conviteCopiar()">${VSIcons.svg("list", 14)} ${tr("copiar_link")}</button>
        </div>
        <button class="btn-primary mc-btn" style="width:100%;margin-top:8px"
                onclick="cardCidadeAtual()">
          ${VSIcons.svg("download", 14)} ${tr("gerar_card")}
        </button>
        <button class="btn-primary mc-btn" style="width:100%;margin-top:10px" onclick="document.getElementById('modal-convite').style.display='none'">${tr("fechar")}</button>
      </div>`;
    document.body.appendChild(modal);
  }
  modal.style.display = "flex";
  try {
    const r = await VSSupabase.rpc("meu_codigo_indicacao");
    const d = Array.isArray(r) ? r[0] : r;
    if (!d?.ok) { alert("Erro: " + (d?.erro || "?")); return; }
    window._meuConvite = d;
    document.getElementById("cv-codigo").textContent = d.codigo;
    document.getElementById("cv-link").textContent = d.url;
    document.getElementById("cv-total").textContent = d.total_convites;
    document.getElementById("cv-sc").textContent = d.total_sulis_ganhos;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(d.url)}`;
    document.getElementById("cv-qr").src = qrUrl;
  } catch (e) { alert("Erro: " + (e.message || e)); }
};
window.conviteCompartilhar = async function() {
  const c = window._meuConvite;
  if (!c) return;
  const texto = `Vem pro Vento Sul! Guia do Sul do Brasil. Usa meu código ${c.codigo} pra ganhar 50 sulis e 7 dias grátis: ${c.url}`;
  if (navigator.share) {
    try { await navigator.share({ title: "Vento Sul", text: texto, url: c.url }); } catch {}
  } else {
    navigator.clipboard?.writeText(texto);
    alert("Link copiado!");
  }
};
window.conviteCopiar = function() {
  const c = window._meuConvite;
  if (!c) return;
  navigator.clipboard?.writeText(c.url);
  alert(`✓ Copiado: ${c.url}`);
};

// ─────────────────────────────────────────────────────────────
// 👁️ SmartView · Visão Inteligente — UI do comerciante (cadastrar tela + propagandas)
// ─────────────────────────────────────────────────────────────
window.abrirTVInteligente = async function(barracaId, barracaNome) {
  let modal = document.getElementById("modal-tv-inteligente");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-tv-inteligente";
    modal.className = "modal-bg";
    modal.innerHTML = `
      <div class="modal" style="max-width:640px;max-height:92vh;overflow-y:auto">
        <h3 id="tv-titulo">👁️ SmartView · Visão Inteligente</h3>
        <div style="background:linear-gradient(135deg,rgba(13,114,62,0.12),rgba(38,124,180,0.12));border:1px solid rgba(255,255,255,0.10);border-radius:10px;padding:12px;margin:8px 0 14px">
          <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
            <div style="font-size:42px;line-height:1;flex-shrink:0">📺<span style="font-size:32px;margin-left:4px">📱</span></div>
            <div style="flex:1;min-width:200px">
              <strong style="font-size:13px;display:block;margin-bottom:4px">${tr("smartview_use_tv")}</strong>
              <p style="font-size:12px;color:var(--hint);line-height:1.5;margin:0">
                Aponta a tela pra quem passa na frente da loja, abre o link da sua SmartView e pronto: ela exibe propaganda personalizada quando um cliente do Vento Sul aparece perto. <strong>Vitrine que reage.</strong>
              </p>
            </div>
          </div>
        </div>
        <p style="font-size:12px;color:var(--hint);margin:0 0 12px;line-height:1.45">
          ✨ Funciona com qualquer tela que abre internet. Quando users com <strong>opt-in</strong> passarem perto, mostra propaganda personalizada pelos interesses agregados.
          <strong style="color:#ffd54f">1 suli por impressão</strong> (R$ 0,01).
        </p>
        <div id="tv-lista" style="margin-top:12px"></div>
        <h4 style="margin-top:18px">📺 ${tr("adicionar_tv")}</h4>
        <div style="background:rgba(255,255,255,0.05);padding:10px;border-radius:8px;margin-top:6px">
          <label>${tr("tv_nome_label")}</label>
          <input id="tv-nome" type="text" placeholder="TV da vitrine">
          <label>${tr("tv_raio_label")}</label>
          <input id="tv-raio" type="number" min="10" max="200" value="30">
          <button class="btn-primary" style="margin-top:10px;width:100%;background:rgba(13,114,62,0.65)" onclick="cadastrarTV()">📺 ${tr("cadastrar_tv")}</button>
        </div>
        <h4 style="margin-top:18px">🎨 ${tr("propagandas")}</h4>
        <div id="tv-propagandas" style="margin-top:6px"></div>
        <h4 style="margin-top:14px">➕ ${tr("nova_propaganda")}</h4>
        <div style="background:rgba(255,255,255,0.05);padding:10px;border-radius:8px;margin-top:6px">
          <label>${tr("prop_titulo_label")}</label>
          <input id="prop-titulo" type="text" placeholder="🍕 Pizza fresca · agora">
          <label>${tr("subtitulo")}</label>
          <input id="prop-sub" type="text" placeholder="Forno a lenha. Vem cá!">
          <label>${tr("url_foto")}</label>
          <input id="prop-img" type="text" placeholder="https://...">
          <label>${tr("cor_fundo")}</label>
          <input id="prop-cor" type="text" value="#0d723e" placeholder="#0d723e">
          <label>${tr("cats_alvo")}</label>
          <input id="prop-cats" type="text" placeholder="comida, lanche, pizza">
          <label>${tr("classes_alvo")}</label>
          <input id="prop-classes" type="text" placeholder="desbravador, bardo">
          <label>${tr("prioridade")}</label>
          <input id="prop-prio" type="number" min="0" max="100" value="50">
          <button class="btn-primary" style="margin-top:10px;width:100%;background:rgba(255,193,7,0.55)" onclick="cadastrarPropaganda()">➕ ${tr("adicionar_propaganda")}</button>
        </div>
        <button class="btn-primary" style="width:100%;margin-top:14px;background:rgba(120,120,120,0.4)" onclick="document.getElementById('modal-tv-inteligente').style.display='none'">Fechar</button>
      </div>`;
    document.body.appendChild(modal);
  }
  document.getElementById("tv-titulo").textContent = `👁️ SmartView — ${barracaNome || ""}`;
  window._tvBarracaAtual = barracaId;
  modal.style.display = "flex";
  await _recarregarTVs(barracaId);
  await _recarregarPropagandas(barracaId);
};

async function _recarregarTVs(barracaId) {
  const div = document.getElementById("tv-lista");
  try {
    const tvs = await sb(`tv_dispositivos?select=*&barraca_id=eq.${barracaId}&order=criado_em.desc`).catch(() => []);
    if (!tvs.length) { div.innerHTML = "<p class='subtitle'>" + tr("nenhuma_tv") + "</p>"; return; }
    const baseUrl = `${location.origin}/tv.html?token=`;
    div.innerHTML = tvs.map(t => {
      const url = baseUrl + t.token;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=2&data=${encodeURIComponent(url)}`;
      const ativaTxt = t.ultimo_ping ? `🟢 último ping: ${new Date(t.ultimo_ping).toLocaleString("pt-BR")}` : "⚪ ainda não conectou";
      return `
        <div class="card-info" style="margin:6px 0;padding:10px">
          <div style="display:flex;gap:10px;align-items:flex-start">
            <img src="${qrUrl}" width="100" height="100" style="background:#fff;padding:4px;border-radius:6px">
            <div style="flex:1;min-width:0">
              <strong>${escapeHtml(t.nome_descritivo || "TV")}</strong>
              <div style="font-size:11px;color:var(--hint);margin-top:4px">Raio ${t.raio_m}m</div>
              <div style="font-size:11px;color:var(--hint);margin-top:2px">${ativaTxt}</div>
              <input type="text" readonly value="${url}" style="width:100%;font-size:10px;padding:4px;margin-top:6px" onclick="this.select()">
              <button class="btn-primary" style="margin-top:6px;background:rgba(229,57,53,0.45);font-size:11px;padding:5px 10px"
                      onclick="removerTV('${t.id}')">🗑️ Remover</button>
            </div>
          </div>
          <p style="font-size:11px;color:var(--hint);margin-top:8px">
            👉 Abre essa URL na TV em modo fullscreen (F11) ou escaneia o QR pra setup rápido.
          </p>
        </div>`;
    }).join("");
  } catch (e) { div.innerHTML = `<p style="color:#f44">Erro: ${e.message}</p>`; }
}

async function _recarregarPropagandas(barracaId) {
  const div = document.getElementById("tv-propagandas");
  try {
    const ps = await sb(`propagandas_segmentadas?select=*&barraca_id=eq.${barracaId}&order=prioridade.desc`).catch(() => []);
    if (!ps.length) { div.innerHTML = "<p class='subtitle'>" + tr("nenhuma_propaganda") + "</p>"; return; }
    div.innerHTML = ps.map(p => {
      const ativaIco = p.ativa ? "🟢" : "⚪";
      const dispBadge = p.disponivel === false
        ? `<span style="background:rgba(229,57,53,0.30);color:#ff9090;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;margin-left:6px">${tr("badge_esgotado")}</span>`
        : `<span style="background:rgba(76,175,80,0.30);color:#a5e6a7;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;margin-left:6px">${tr("badge_disponivel")}</span>`;
      const dispBtn = p.disponivel === false
        ? `<button class="btn-primary" style="background:rgba(76,175,80,0.55);font-size:11px;padding:4px 10px" onclick="toggleEsgotado('${p.id}', true, 'segmentada')">✅ ${tr("voltou")}</button>`
        : `<button class="btn-primary" style="background:rgba(229,57,53,0.45);font-size:11px;padding:4px 10px" onclick="toggleEsgotado('${p.id}', false, 'segmentada')">📦 ${tr("esgotou")}</button>`;
      return `
        <div class="card-info" style="margin:6px 0;padding:10px;background:${p.cor_fundo || 'rgba(255,255,255,0.04)'};border-left:4px solid ${p.disponivel === false ? '#e53935' : '#ffd54f'};${p.disponivel === false ? 'opacity:0.6' : ''}">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap">
            <div><strong>${ativaIco} ${escapeHtml(p.titulo)}</strong>${dispBadge}</div>
            <small>👁️ ${p.total_impressoes} imp.</small>
          </div>
          ${p.subtitulo ? `<div style="font-size:12px;opacity:0.85;margin-top:2px">${escapeHtml(p.subtitulo)}</div>` : ""}
          <div style="font-size:11px;margin-top:6px;opacity:0.75">
            🎯 cat: ${(p.target_categorias || []).join(", ") || "—"} ·
            classes: ${(p.target_classes || []).join(", ") || "—"} ·
            prio ${p.prioridade}
          </div>
          <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
            ${dispBtn}
            <button class="btn-primary" style="background:${p.ativa?'rgba(120,120,120,0.4)':'rgba(13,114,62,0.65)'};font-size:11px;padding:4px 10px"
                    onclick="togglePropaganda('${p.id}', ${!p.ativa})">${p.ativa ? '⏸️ ' + tr("pausar") : '▶️ ' + tr("ativar")}</button>
            <button class="btn-primary" style="background:rgba(229,57,53,0.45);font-size:11px;padding:4px 10px"
                    onclick="removerPropaganda('${p.id}')">🗑️</button>
          </div>
        </div>`;
    }).join("");
  } catch (e) { div.innerHTML = `<p style="color:#f44">Erro: ${e.message}</p>`; }
}

window.cadastrarTV = async function() {
  const nome = document.getElementById("tv-nome").value.trim() || "TV";
  const raio = parseInt(document.getElementById("tv-raio").value, 10) || 30;
  if (!navigator.geolocation) return alert(tr("gps_indisponivel"));
  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      const token = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 16);
      const sess = VSSupabase.getSession?.();
      const userId = (sess?.session || sess)?.user?.id;
      if (!userId) return alert(tr("faca_login"));
      const r = await fetch(`${VENTOSUL_CONFIG.SUPABASE_URL}/rest/v1/tv_dispositivos`, {
        method: "POST",
        headers: {
          apikey: VENTOSUL_CONFIG.SUPABASE_ANON,
          Authorization: `Bearer ${(sess?.session || sess)?.access_token}`,
          "Content-Type": "application/json", Prefer: "return=representation"
        },
        body: JSON.stringify({
          barraca_id: window._tvBarracaAtual, token, nome_descritivo: nome,
          lat: pos.coords.latitude, lng: pos.coords.longitude, raio_m: raio
        })
      });
      if (!r.ok) throw new Error(await r.text());
      alert(`✓ TV cadastrada! Token: ${token}\n\nAbra essa URL na TV: ${location.origin}/tv.html?token=${token}`);
      _recarregarTVs(window._tvBarracaAtual);
    } catch (e) { alert("Erro: " + (e.message || e)); }
  }, (err) => alert(tr("gps_bloqueado") + err.message));
};

window.cadastrarPropaganda = async function() {
  const titulo = document.getElementById("prop-titulo").value.trim();
  const sub    = document.getElementById("prop-sub").value.trim();
  const img    = document.getElementById("prop-img").value.trim();
  const cor    = document.getElementById("prop-cor").value.trim() || "#0d723e";
  const cats   = document.getElementById("prop-cats").value.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const classes = document.getElementById("prop-classes").value.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const prio   = parseInt(document.getElementById("prop-prio").value, 10) || 50;
  if (!titulo) return alert(tr("titulo_obrigatorio"));
  try {
    const sess = VSSupabase.getSession?.();
    const r = await fetch(`${VENTOSUL_CONFIG.SUPABASE_URL}/rest/v1/propagandas_segmentadas`, {
      method: "POST",
      headers: {
        apikey: VENTOSUL_CONFIG.SUPABASE_ANON,
        Authorization: `Bearer ${(sess?.session || sess)?.access_token}`,
        "Content-Type": "application/json", Prefer: "return=representation"
      },
      body: JSON.stringify({
        barraca_id: window._tvBarracaAtual,
        titulo, subtitulo: sub, imagem_url: img || null, cor_fundo: cor,
        target_categorias: cats, target_classes: classes, prioridade: prio
      })
    });
    if (!r.ok) throw new Error(await r.text());
    alert(tr("propaganda_criada"));
    ["prop-titulo","prop-sub","prop-img","prop-cats","prop-classes"].forEach(id => document.getElementById(id).value = "");
    _recarregarPropagandas(window._tvBarracaAtual);
  } catch (e) { alert("Erro: " + (e.message || e)); }
};

window.removerTV = async function(id) {
  if (!confirm(tr("remover_tv"))) return;
  await sb(`tv_dispositivos?id=eq.${id}`, { method: "DELETE" }).catch(()=>{});
  _recarregarTVs(window._tvBarracaAtual);
};
window.removerPropaganda = async function(id) {
  if (!confirm(tr("remover_propaganda"))) return;
  await sb(`propagandas_segmentadas?id=eq.${id}`, { method: "DELETE" }).catch(()=>{});
  _recarregarPropagandas(window._tvBarracaAtual);
};
window.togglePropaganda = async function(id, ativa) {
  const sess = VSSupabase.getSession?.();
  await fetch(`${VENTOSUL_CONFIG.SUPABASE_URL}/rest/v1/propagandas_segmentadas?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: VENTOSUL_CONFIG.SUPABASE_ANON,
      Authorization: `Bearer ${(sess?.session || sess)?.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ ativa })
  });
  _recarregarPropagandas(window._tvBarracaAtual);
};

// 🌅 Comerciante reseta dia: marca todos os produtos da barraca como disponíveis
window.comerciantesResetarDia = async function(barracaId) {
  if (!confirm("🌅 " + tr("resetar_dia_confirm"))) return;
  try {
    const r = await VSSupabase.rpc("comerciante_resetar_dia", { p_barraca_id: barracaId });
    const d = Array.isArray(r) ? r[0] : r;
    if (d?.ok) {
      vsToast({ tipo: "ok", titulo: "🌅 " + tr("bom_dia"), corpo: d.mensagem || tr("tudo_disponivel") });
      // Se SmartView aberto na mesma barraca, recarrega lista
      if (window._tvBarracaAtual === barracaId) await _recarregarPropagandas(barracaId);
    } else {
      vsToast({ tipo: "error", titulo: "Erro", corpo: d?.erro || "tenta de novo" });
    }
  } catch (e) {
    vsToast({ tipo: "error", titulo: "Erro", corpo: e.message });
  }
};

// 📦 Toggle 1 produto: esgotou ou voltou a ter
window.toggleEsgotado = async function(criativoId, novoDisponivel, origem) {
  try {
    const r = await VSSupabase.rpc("comerciante_toggle_esgotado", {
      p_criativo_id: criativoId,
      p_disponivel: novoDisponivel,
      p_origem: origem || "dooh"
    });
    const d = Array.isArray(r) ? r[0] : r;
    if (d?.ok) {
      vsToast({
        tipo: novoDisponivel ? "ok" : "warn",
        titulo: novoDisponivel ? "✅ Voltou" : "📦 Esgotado",
        corpo: novoDisponivel ? tr("produto_volta_vitrine") : tr("produto_some_vitrine")
      });
      if (window._tvBarracaAtual) await _recarregarPropagandas(window._tvBarracaAtual);
    } else {
      vsToast({ tipo: "error", titulo: "Erro", corpo: d?.erro || "tenta de novo" });
    }
  } catch (e) {
    vsToast({ tipo: "error", titulo: "Erro", corpo: e.message });
  }
};

// ─────────────────────────────────────────────────────────────
// 📍 Menu flutuante: toque no nome da cidade abre lista de
//    bairros/praias/atrações + outras cidades do estado.
//    Substitui o dropdown <select> antigo (que duplicava o nome).
// ─────────────────────────────────────────────────────────────
async function _popularDropdownSublocais() {
  const menu = document.getElementById("city-sublocais-menu");
  const btn = document.getElementById("city-title-btn");
  if (!menu || !btn || !state.cidade) return;

  // Sublocais (praias/bairros/atrações/históricos)
  let subs = [];
  try {
    subs = await sb(`localidades?select=tipo,sublocal&cidade=eq.${enc(state.cidade)}&estado=eq.${enc(state.estado)}&sublocal=not.is.null&order=tipo,sublocal&limit=200`).catch(() => []);
  } catch {}

  const grupos = {
    "praia":      { label: "🏖️ " + tr("praias"),          items: [] },
    "bairro":     { label: "🏘️ " + tr("bairros"),          items: [] },
    "atração":    { label: "⭐ Atrações",         items: [] },
    "atracao":    { label: "⭐ Atrações",         items: [] },
    "histórico":  { label: "🏛️ Pontos históricos", items: [] },
    "historico":  { label: "🏛️ Pontos históricos", items: [] },
  };
  const outros = [];
  for (const s of (subs || [])) {
    const t = (s.tipo || "").toLowerCase();
    if (grupos[t]) grupos[t].items.push({ nome: s.sublocal, tipo: t });
    else outros.push({ nome: s.sublocal, tipo: t });
  }

  const _esc = escapeHtml;
  const _itemSub = (item) => `<button class="cm-item ${item.nome === state.sublocal ? "cm-active" : ""}" data-sub="${_esc(item.nome)}" data-tipo="${_esc(item.tipo)}">${_esc(item.nome)}</button>`;
  const _itemCid = (n) => `<button class="cm-item cm-item-cid ${n === state.cidade ? "cm-active" : ""}" data-cid="${_esc(n)}">${_esc(n)}</button>`;

  let html = "";
  // Header: cidade atual com link "voltar pra visão geral"
  if (state.sublocal) {
    html += `<button class="cm-item cm-item-back" data-sub="">↺ Voltar a ${_esc(state.cidade)} (visão geral)</button>`;
  }
  // Sublocais agrupados
  for (const [, g] of Object.entries(grupos)) {
    if (!g.items.length) continue;
    html += `<div class="cm-group">${g.label}</div>`;
    [...new Set(g.items.map(i => i.nome))].forEach(nome => {
      const it = g.items.find(i => i.nome === nome);
      html += _itemSub(it);
    });
  }
  if (outros.length) {
    html += `<div class="cm-group">📌 ${tr("outros_locais")}</div>`;
    [...new Set(outros.map(i => i.nome))].forEach(nome => {
      const it = outros.find(i => i.nome === nome);
      html += _itemSub(it);
    });
  }
  // Outras cidades do mesmo estado (até 30)
  const cidadesEstado = (window.VSCidades?.cidadesDe?.(state.estado) || []).filter(c => c !== state.cidade).slice(0, 30);
  if (cidadesEstado.length) {
    html += `<div class="cm-group">🌎 Outras cidades · ${_esc(state.estado)}</div>`;
    cidadesEstado.forEach(c => { html += _itemCid(c); });
  }

  menu.innerHTML = html;

  // Delega clique nos items
  menu.onclick = (e) => {
    const it = e.target.closest(".cm-item");
    if (!it) return;
    const sub = it.dataset.sub;
    const cid = it.dataset.cid;
    if (cid) {
      // Trocar cidade
      state.cidade = cid;
      state.sublocal = null;
      try { savePrefs(); } catch {}
      abrirCidade();
    } else if (sub === "") {
      // Voltar pra visão geral da cidade
      state.sublocal = null;
      abrirCidade();
    } else if (sub) {
      const tipo = it.dataset.tipo || "";
      if (tipo === "bairro") {
        const slug = sub.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
        abrirBairroPublico(_slugCidade(state.cidade), slug);
      } else if (tipo === "praia") {
        VSPraias.praiasDaCidade(state.cidade, state.estado, 100)
          .then(ps => {
            const p = ps.find(x => x.nome === sub);
            if (p) abrirDetalhePraia(p);
            else abrirPraias();
          })
          .catch(() => abrirPraias());
      } else {
        abrirSublocal(sub);
      }
    }
    _fecharMenuCidade();
  };
}

function _abrirMenuCidade() {
  const menu = document.getElementById("city-sublocais-menu");
  const btn = document.getElementById("city-title-btn");
  if (!menu || !btn) return;
  menu.hidden = false;
  btn.setAttribute("aria-expanded", "true");
  btn.classList.add("cm-aberto");
  // Fecha ao tocar fora
  setTimeout(() => {
    document.addEventListener("click", _outsideMenuCidade, { once: true });
  }, 0);
}
function _fecharMenuCidade() {
  const menu = document.getElementById("city-sublocais-menu");
  const btn = document.getElementById("city-title-btn");
  if (!menu || !btn) return;
  menu.hidden = true;
  btn.setAttribute("aria-expanded", "false");
  btn.classList.remove("cm-aberto");
}
function _outsideMenuCidade(e) {
  const menu = document.getElementById("city-sublocais-menu");
  const btn = document.getElementById("city-title-btn");
  if (!menu || !btn) return;
  if (menu.contains(e.target) || btn.contains(e.target)) return;
  _fecharMenuCidade();
}
// Hook do clique no título — só registra 1x
(function _hookCityTitleClick() {
  const btn = document.getElementById("city-title-btn");
  if (!btn || btn.dataset.hookok) return;
  btn.dataset.hookok = "1";
  // 1 clique = abre o dropdown de bairros (instantâneo)
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const menu = document.getElementById("city-sublocais-menu");
    if (!menu) return;
    if (menu.hidden) _abrirMenuCidade();
    else _fecharMenuCidade();
  });
  // duplo-clique no nome = favorita / desfavorita (nome fica dourado)
  btn.addEventListener("dblclick", (e) => {
    e.stopPropagation(); e.preventDefault();
    if (state.cidade) {
      toggleFav({ tipo: "cidade", nome: state.cidade, estado: state.estado, cidade: state.cidade });
      _fecharMenuCidade();
    }
  });
})();

window.abrirSublocal = async function(nomeSublocal) {
  state.sublocal = nomeSublocal;
  showScreen("city");
  document.getElementById("city-title").textContent = `${nomeSublocal} · ${state.cidade}`;
  await _popularDropdownSublocais();
  // Carrossel só com fotos do sublocal
  try {
    const fotos = await sb(`fotos_locais?select=url,sublocal,atribuicao&cidade=eq.${enc(state.cidade)}&estado=eq.${enc(state.estado)}&sublocal=eq.${enc(nomeSublocal)}&ativo=eq.true&order=ordem.asc&limit=20`).catch(() => []);
    const el = document.getElementById("carousel-city");
    if (el && window.VSCarousel) {
      if (fotos?.length) {
        const lista = fotos.map(f => ({ foto_url: f.url, titulo: f.sublocal, subtitulo: f.atribuicao }));
        const c = VSCarousel.criar(el, { fotos: lista, intervaloMs: 8000, modo: "fade" });
        c.iniciar();
      } else {
        el.innerHTML = `<div class="carousel-item" style="background:linear-gradient(135deg,#0d4f76,#1ea7e8);display:flex;align-items:center;justify-content:center;height:180px;border-radius:12px"><strong>${escapeHtml(nomeSublocal)}</strong></div>`;
      }
    }
  } catch {}
  // Resumo do lugar
  try {
    const loc = await sb(`localidades?select=*&cidade=eq.${enc(state.cidade)}&estado=eq.${enc(state.estado)}&sublocal=eq.${enc(nomeSublocal)}&limit=1`).catch(() => []);
    const div = document.getElementById("resumo-lugar");
    if (div && loc?.[0]) {
      const l = loc[0];
      div.innerHTML = `
        <h3>${escapeHtml(l.sublocal)} <small style="color:var(--hint)">${escapeHtml(l.tipo || "")}</small></h3>
        ${l.descricao ? `<p>${escapeHtml(l.descricao)}</p>` : ""}
        ${l.lat && l.lng ? `<button class="btn-primary" style="margin-top:8px;background:rgba(38,124,180,0.55);font-size:13px" onclick='comoChegar(${JSON.stringify({lat:l.lat,lng:l.lng,nome:l.sublocal,categoria:l.tipo}).replace(/'/g,"&#39;")})'>🧭 Como chegar</button>` : ""}
      `;
    }
  } catch {}
};

// ─────────────────────────────────────────────────────────────
// 🔔 Toasts in-app genéricos — feedback imediato pra qualquer evento
// vsToast({ tipo: 'success'|'info'|'warn'|'error', titulo, corpo, dur, acao })
// ─────────────────────────────────────────────────────────────
window.vsToast = function(alvo) {
  // 23/08/2026 — aceita string (metade do site chama vsToast('texto')); antes
  // string virava balão azul VAZIO no topo (era o "balão azul" da landing).
  const _o = (typeof alvo === "string") ? { corpo: alvo } : (alvo || {});
  const { tipo = "info", titulo, corpo, dur = 4500, acao = null } = _o;
  const cores = {
    success: "linear-gradient(135deg,rgba(13,114,62,0.95),rgba(76,175,80,0.95))",
    info:    "linear-gradient(135deg,rgba(38,124,180,0.95),rgba(110,200,255,0.85))",
    warn:    "linear-gradient(135deg,rgba(255,143,0,0.95),rgba(255,193,7,0.85))",
    error:   "linear-gradient(135deg,rgba(229,57,53,0.95),rgba(255,87,34,0.85))"
  };
  const id = "vs-toast-" + Date.now();
  const el = document.createElement("div");
  el.id = id;
  el.style.cssText = `position:fixed;top:24px;left:50%;transform:translateX(-50%) translateY(-220%);
    background:${cores[tipo] || cores.info};color:#fff;padding:14px 18px;border-radius:14px;
    box-shadow:0 8px 24px rgba(0,0,0,0.5);z-index:9700;max-width:90%;width:380px;
    transition:transform .55s cubic-bezier(.4,1.5,.6,1);
    backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
    border:1px solid rgba(255,255,255,0.20);font-size:14px;line-height:1.4`;
  el.innerHTML = `
    <div style="display:flex;gap:10px;align-items:flex-start">
      <div style="flex:1">
        ${titulo ? `<strong style="display:block;margin-bottom:4px">${escapeHtml(titulo)}</strong>` : ""}
        ${corpo ? `<div style="font-size:13px;opacity:0.92">${escapeHtml(corpo)}</div>` : ""}
      </div>
      <button onclick="document.getElementById('${id}').style.transform='translateX(-50%) translateY(-220%)';setTimeout(()=>document.getElementById('${id}')?.remove(),600)"
              style="background:transparent;border:none;color:#fff;cursor:pointer;font-size:18px;padding:0 4px">×</button>
    </div>
    ${acao ? `<button onclick="${acao.onclick};document.getElementById('${id}').style.transform='translateX(-50%) translateY(-220%)';setTimeout(()=>document.getElementById('${id}')?.remove(),600)"
              style="margin-top:10px;width:100%;background:rgba(255,255,255,0.22);color:#fff;border:none;padding:8px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700">${escapeHtml(acao.label)}</button>` : ""}`;
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.transform = "translateX(-50%) translateY(0)"; });
  setTimeout(() => {
    if (el.parentElement) {
      el.style.transform = "translateX(-50%) translateY(-220%)";
      setTimeout(() => el.remove(), 600);
    }
  }, dur);
};

// ─────────────────────────────────────────────────────────────
// 🚀 Onboarding 5 passos — fluxo de primeiro uso
// ─────────────────────────────────────────────────────────────
const ONBOARDING_FLAG = "vs_onboarding_done";
window.iniciarOnboarding = function() {
  if (localStorage.getItem(ONBOARDING_FLAG) === "1") return;
  let modal = document.getElementById("modal-onboarding");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-onboarding";
    modal.className = "modal-bg";
    modal.style.zIndex = "9800";
    modal.innerHTML = `
      <div class="modal" style="max-width:480px;text-align:center;position:relative">
        <button onclick="_pularOnb()" aria-label="Fechar tutorial"
                style="position:absolute;top:8px;right:8px;width:32px;height:32px;border-radius:50%;border:0;background:rgba(255,255,255,0.10);color:#fff;cursor:pointer;font-size:18px;line-height:1">×</button>
        <div id="onb-passo-conteudo"></div>
        <div style="margin-top:14px;display:flex;justify-content:center;gap:6px" id="onb-pontos"></div>
      </div>`;
    document.body.appendChild(modal);
    // Click no fundo (fora do conteúdo) também seta flag e fecha
    modal.addEventListener("click", (e) => { if (e.target === modal) _pularOnb(); });
    // ESC fecha + seta flag
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.style.display !== "none") _pularOnb();
    });
  }
  _renderOnbPasso(0);
  modal.style.display = "flex";
};
const PASSOS_ONB = [
  { titulo: "🌊 Bão te ver no Vento Sul!", txt: "Sou a Litorânea. Vou te mostrar o app em 5 toques curtos. Topa?", btn: "Bora!" },
  { titulo: "📍 Onde você tá?", txt: "Escolhe teu estado pra começar — depois eu te conecto com tudo do Sul.", btn: "Ok, vou escolher" },
  { titulo: "🎁 Primeiro bônus", txt: "Toda hora que tu abre o app, ganha sulis pelo bônus diário. Hoje é o teu primeiro!", btn: "Quero meu bônus" },
  { titulo: "📡 Modo Descobrir", txt: "Quando tu liga, app te avisa de lojas perto que combinam contigo. 100% anônimo, lat/lng arredondado, opt-out a qualquer hora.", btn: "Ativar (opcional)" },
  { titulo: "🪶 Litorânea sempre contigo", txt: "Conta pra mim do que tu gosta, da família, dos teus planos — quanto mais eu sei, melhor eu te conecto. Bom passeio, vivente!", btn: "Vamos lá!" }
];
function _renderOnbPasso(idx) {
  const p = PASSOS_ONB[idx];
  if (!p) { _fimOnboarding(); return; }
  const emoji = p.titulo.match(/^[^\s]+/)?.[0] || "🌊";
  // Passo 0 ou qualquer passo com 🌊: foto da Litorânea no lugar do emoji
  const cabecalho = (idx === 0 || emoji === "🌊")
    ? `<div style="margin:0 auto 8px;width:96px;height:96px;border-radius:50%;overflow:hidden;border:3px solid rgba(110,200,255,0.7);box-shadow:0 0 24px rgba(110,200,255,0.45);background:radial-gradient(circle,rgba(110,200,255,0.55),rgba(110,200,255,0.12))">
         <img src="/img/aurora-classes/alquimista-feminino-futuro.jpg" alt="Litorânea" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.innerHTML='🌊';this.parentElement.style.fontSize='48px';this.parentElement.style.display='flex';this.parentElement.style.alignItems='center';this.parentElement.style.justifyContent='center'">
       </div>`
    : `<div style="font-size:48px;margin-bottom:8px">${emoji}</div>`;
  document.getElementById("onb-passo-conteudo").innerHTML = `
    ${cabecalho}
    <h3 style="margin:6px 0 8px">${escapeHtml(p.titulo.replace(/^[^\s]+\s/, ""))}</h3>
    <p style="font-size:14px;color:var(--hint);line-height:1.5">${escapeHtml(p.txt)}</p>
    <button class="btn-primary" style="margin-top:16px;width:100%" onclick="_proximoOnb(${idx})">${p.btn} →</button>
    ${idx > 0 ? `<button class="btn-primary" style="margin-top:6px;width:100%;background:rgba(120,120,120,0.4);font-size:12px" onclick="_pularOnb()">Pular tutorial</button>` : ""}`;
  document.getElementById("onb-pontos").innerHTML = PASSOS_ONB.map((_, i) =>
    `<div style="width:8px;height:8px;border-radius:50%;background:${i === idx ? '#7af0ff' : 'rgba(255,255,255,0.20)'}"></div>`
  ).join("");
}
window._proximoOnb = function(idx) {
  // Ações específicas em cada passo
  if (idx === 2) { try { resgatarBonusDiario?.(); } catch {} }
  if (idx === 3) {
    if (confirm(tr("onb_descobrir_confirm"))) {
      localStorage.setItem("vs_modo_descobrir", "1");
      try { iniciarHeartbeatPresenca?.(); } catch {}
    }
  }
  _renderOnbPasso(idx + 1);
};
window._pularOnb = function() {
  localStorage.setItem(ONBOARDING_FLAG, "1");
  document.getElementById("modal-onboarding").style.display = "none";
};
function _fimOnboarding() {
  localStorage.setItem(ONBOARDING_FLAG, "1");
  document.getElementById("modal-onboarding").style.display = "none";
}
// Banner de boas-vindas (5 telinhas com a Litorânea) DESLIGADO.
// O código continua acima caso queira reativar manualmente chamando iniciarOnboarding().

// ─────────────────────────────────────────────────────────────
// 📲 Push notifications — registra token (precisa VAPID key configurada)
// ─────────────────────────────────────────────────────────────
// 06/08/2026 — estado do sino GUARDADO no aparelho. Ele voltava sempre 🔕
// porque o único sinal consultado era a inscrição do service worker, que some
// a cada sw.js novo / limpeza de dados / PWA reinstalado.
const PUSH_FLAG_KEY = "vs.push.ativo";
const PUSH_SYNC_KEY = "vs.push.sync";

window.ativarPush = async function(silencioso = false) {
  // reacao imediata ao toque — sem isto o botao fica inerte enquanto a rede responde
  try {
    const _b = document.getElementById("btn-push-ativar");
    if (_b && !silencioso) { _b.style.transition = "transform .12s"; _b.style.transform = "scale(.86)";
      setTimeout(() => { _b.style.transform = "scale(1)"; }, 130); }
  } catch (e) {}
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    if (!silencioso) alert(tr("push_nao_suporta"));
    return false;
  }
  const reg = await navigator.serviceWorker.ready;
  // NÃO faz curto-circuito se já houver inscrição: sempre pega/atualiza o token FCM
  // e garante que ele está salvo no banco (senão "parece ativo" mas não recebe nada).
  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    // 04/08/2026: "denied" NAO abre janela nenhuma — o navegador ja decidiu antes.
    // Sem explicar isso, a pessoa clica, nada acontece e parece que o app quebrou.
    _atualizarBotaoPush(false);
    if (!silencioso) {
      alert(perm === "denied"
        ? "As notificações estão BLOQUEADAS neste navegador.\n\n" +
          "Toque no cadeado 🔒 ao lado do endereço → Notificações → Permitir.\n" +
          "Depois volte aqui e ligue de novo.\n\n" +
          "(O navegador não me deixa desbloquear por você — tem que ser você mesmo.)"
        : tr("push_permissao_negada"));
    }
    return false;
  }
  try {
    // Tenta FCM primeiro; fallback para Web Push raw
    let fcmToken = null, platform = "web_push", tokenPayload;
    if (window.fbGetToken) {
      fcmToken = await window.fbGetToken().catch(() => null);
    }
    if (fcmToken) {
      tokenPayload = fcmToken;
      platform = "fcm_web";
    } else {
      const vapid = (window.VENTOSUL_CONFIG || {}).VAPID_PUBLIC_KEY;
      if (!vapid) return false;
      // Inscrição antiga (chave diferente) trava o subscribe com
      // "different applicationServerKey" — limpa SEMPRE antes de assinar.
      try {
        const velha = await reg.pushManager.getSubscription();
        if (velha) await velha.unsubscribe();
      } catch {}
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey: vapid
      });
      tokenPayload = JSON.stringify(sub);
    }
    // 06/08/2026 — AQUI ESTAVA O BURACO. Lia-se o vs.sb.session CRU do
    // localStorage e mandava-se o access_token como estivesse. Access token do
    // Supabase vence em 1 HORA: vencido, auth.uid() vira null dentro da RPC,
    // que levanta 'sem sessao'. Resultado: o aparelho NUNCA era gravado
    // (device_tokens estava vazia, zero linhas) e no reload o sino voltava 🔕.
    // VSSupabase.ensureSession() renova antes; VSSupabase.rpc() ainda faz
    // refresh + retry sozinho se levar 401.
    let userId = null;
    try {
      await VSSupabase.ensureSession?.();
      userId = VSSupabase.userId?.() || null;
    } catch (e) {}
    if (!userId) {
      let sess = window._vsSession || window.VSESSION;
      try { if (!sess) sess = JSON.parse(localStorage.getItem("vs.sb.session") || "null"); } catch {}
      userId = sess?.user?.id || null;
    }
    if (!userId) {
      if (!silencioso) alert(tr("push_login_primeiro"));
      return false;
    }
    // RPC segura (SECURITY DEFINER) — a tabela device_tokens não aceita INSERT
    // direto de usuário (403); a mesma porta que o app nativo Android usa.
    try {
      await VSSupabase.rpc("upsert_device_token", {
        p_token: tokenPayload,
        p_platform: platform,
        p_cidade: window._vsCidade || null,
        p_estado: window._vsEstado || null
      });
    } catch (e) {
      if (!silencioso) alert("Não consegui salvar a notificação (" + (e.status || "rede") + "). Tenta de novo.");
      return false;
    }
    try { localStorage.setItem(PUSH_SYNC_KEY, String(Date.now())); } catch (e) {}
    _atualizarBotaoPush(true);
    if (!silencioso) {
      const t = document.createElement("div");
      t.textContent = tr("push_ativadas");
      Object.assign(t.style, { position:"fixed", bottom:"80px", left:"50%", transform:"translateX(-50%)",
        background:"#22c55e", color:"#fff", padding:"10px 20px", borderRadius:"20px",
        fontWeight:"600", zIndex:"9999", fontSize:"14px" });
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 2500);
    }
    return true;
  } catch (e) {
    if (!silencioso) alert("[pushv3] " + tr("push_erro_ativar") + (e.message || e));
    return false;
  }
};

function _atualizarBotaoPush(ativo) {
  // grava o estado ANTES de mexer no desenho — funciona mesmo nas páginas que
  // não têm o botão no cabeçalho (o estado é do aparelho, não da tela).
  try {
    if (ativo) localStorage.setItem(PUSH_FLAG_KEY, "1");
    else localStorage.removeItem(PUSH_FLAG_KEY);
  } catch (e) {}
  const btn = document.getElementById("btn-push-ativar");
  if (!btn) return;
  // 04/08/2026: antes eram SO dois estados (🔔 / 🔕) e o navegador tem TRES.
  // "desligado" e "BLOQUEADO pelo navegador" mostravam o mesmo 🔕 — a pessoa
  // clicava, nada acontecia e nao dava pra saber por que. Agora o bloqueio tem
  // cara propria e diz como resolver.
  const perm = (typeof Notification !== "undefined") ? Notification.permission : "default";
  btn.classList.remove("push-on", "push-off", "push-bloqueado");
  if (perm === "denied") {
    btn.innerHTML = "🚫";
    btn.title = "Notificações BLOQUEADAS neste navegador. Toque no cadeado 🔒 ao lado do endereço → Notificações → Permitir. Depois volte e ligue aqui.";
    btn.style.opacity = "1";
    btn.style.color = "#ef4444";
    btn.classList.add("push-bloqueado");
  } else if (ativo) {
    btn.innerHTML = "🔔";
    btn.title = tr("push_btn_ativas");
    btn.style.opacity = "1";
    btn.style.color = "#22c55e";
    btn.classList.add("push-on");
  } else {
    btn.innerHTML = "🔕";
    btn.title = tr("push_btn_ativar");
    btn.style.opacity = "0.7";
    btn.style.color = "";
    btn.classList.add("push-off");
  }
}

// Verifica estado de push ao iniciar
(async function _initPushState() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    const perm = Notification.permission;
    if (perm !== "granted") { _atualizarBotaoPush(false); return; }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    let marcado = false;
    try { marcado = localStorage.getItem(PUSH_FLAG_KEY) === "1"; } catch (e) {}
    // permissão dada + (inscrito OU já marcado antes) = ligado. Não some mais.
    _atualizarBotaoPush(!!sub || marcado);
    // Autocura silenciosa: quem já tinha ligado mas perdeu a inscrição (sw novo,
    // dados limpos) ou não regrava há mais de um dia, reassina e regrava agora.
    let ultima = 0;
    try { ultima = parseInt(localStorage.getItem(PUSH_SYNC_KEY) || "0", 10) || 0; } catch (e) {}
    if (marcado && (!sub || Date.now() - ultima > 86400000)) {
      setTimeout(() => { try { ativarPush(true); } catch (e) {} }, 3000);
    }
  } catch {}
})();

// Trocou de conta (entrou de verdade depois de andar anônimo)? O aparelho tem
// que seguir o dono novo — a RPC apaga o token antigo e regrava no uid certo.
window.addEventListener("vs:auth-changed", () => {
  let marcado = false;
  try { marcado = localStorage.getItem(PUSH_FLAG_KEY) === "1"; } catch (e) {}
  if (marcado && typeof Notification !== "undefined" && Notification.permission === "granted") {
    setTimeout(() => { try { ativarPush(true); } catch (e) {} }, 1500);
  }
});

// Notificações FCM em foreground (app aberto) — mostra banner no topo
if (window.fbOnMessage) {
  window.fbOnMessage(({ titulo, corpo, url }) => {
    const banner = document.createElement("div");
    banner.innerHTML = `<strong>${titulo}</strong>${corpo ? "<br><small>" + corpo + "</small>" : ""}`;
    Object.assign(banner.style, {
      position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)",
      background: "#1e293b", color: "#fff", padding: "12px 20px", borderRadius: "12px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)", zIndex: "99999", cursor: "pointer",
      maxWidth: "90vw", fontSize: "14px", lineHeight: "1.4", textAlign: "center"
    });
    banner.onclick = () => { banner.remove(); if (url && url !== "/") location.href = url; };
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 6000);
  });
}

// ─────────────────────────────────────────────────────────────
// 🤖✨🌊 Trio de IAs — switch entre Litorânea / Automata / Aurora
// ─────────────────────────────────────────────────────────────
let _botAtivo = "litoranea";
// Imagens IA (Pollinations) — mesmas seeds do trio em index.html, pra cara consistente
const _BOT_VISUAL = {
  litoranea: {
    emoji: "🌊", nome: "Litorânea",
    sub: tr("bot_sub_litoranea"),
    cor: "#7af0ff", bg: "rgba(110,200,255,0.10)",
    img: "/img/aurora-classes/alquimista-feminino-futuro.jpg"
  },
  automata: {
    emoji: "🤖", nome: "Automata",
    sub: tr("bot_sub_automata"),
    cor: "#ffb74d", bg: "rgba(255,193,7,0.10)",
    img: "/img/aurora-classes/alquimista-feminino-futuro.jpg"
  },
  aurora: {
    emoji: "✨", nome: "Aurora",
    sub: tr("bot_sub_aurora"),
    cor: "#ff60d0", bg: "rgba(255,80,200,0.10)",
    img: "/img/aurora-classes/alquimista-feminino-futuro.jpg"
  },
};
// Aurora não tem chat — clicar nela abre o JOGO direto (tela unificada /aurora-jogo.html).
window.abrirAuroraDoTrio = function() {
  location.href = "/aurora-jogo.html";
};
window.trocarBot = async function(bot) {
  if (!_BOT_VISUAL[bot]) return;
  // Aurora redireciona pro jogo — não fica no chat
  if (bot === "aurora") { window.abrirAuroraDoTrio(); return; }
  // Fallback defensivo: se algo redirecionou pro jogo, traz de volta pro chat
  try { showScreen("litoranea"); } catch {}
  _botAtivo = bot;
  const v = _BOT_VISUAL[bot];
  // Atualiza visual: avatar + nome + cor + tabs ativas
  // Avatar com imagem IA (Pollinations) por cima do emoji fallback
  const avDyn = document.getElementById("lit-avatar-dyn");
  if (avDyn) {
    if (v.img) {
      avDyn.innerHTML = `<img loading="lazy" alt="${v.nome}" src="${v.img}" onerror="this.style.display='none';this.parentNode.innerHTML='${v.emoji}'">`;
    } else {
      avDyn.textContent = v.emoji;
    }
  }
  document.getElementById("lit-nome-dyn").textContent = v.nome;
  document.getElementById("lit-sub-dyn").textContent = v.sub;
  const hero = document.getElementById("lit-hero-dyn");
  if (hero) hero.style.background = `linear-gradient(135deg, ${v.bg}, transparent)`;
  document.querySelectorAll(".trio-bot").forEach(b => {
    const ativo = b.dataset.bot === bot;
    b.classList.toggle("trio-ativo", ativo);
    b.style.borderColor = ativo ? v.cor : "rgba(255,255,255,0.15)";
    b.style.transform = ativo ? "scale(1.06)" : "scale(1)";
    b.style.background = ativo ? v.bg : "rgba(255,255,255,0.04)";
  });
  // Botão dedicado pra abrir o mapa Aurora (só quando ela tá ativa)
  let mapaBtn = document.getElementById("aurora-mapa-btn-chat");
  if (bot === "aurora") {
    if (!mapaBtn) {
      mapaBtn = document.createElement("button");
      mapaBtn.id = "aurora-mapa-btn-chat";
      mapaBtn.type = "button";
      mapaBtn.textContent = "✨ Abrir o Mapa do Espelho da Alma";
      mapaBtn.style.cssText = "display:block;width:100%;margin:10px 0;padding:11px;background:linear-gradient(135deg,rgba(255,80,200,0.30),rgba(255,80,200,0.08));border:1.5px solid rgba(255,80,200,0.55);color:#ff60d0;font-weight:700;border-radius:10px;cursor:pointer;font-size:14px;box-shadow:0 0 14px rgba(255,80,200,0.25)";
      mapaBtn.onclick = () => { showScreen("aurora"); abrirAurora(); };
      const hero = document.getElementById("lit-hero-dyn");
      if (hero?.parentNode) hero.parentNode.insertBefore(mapaBtn, hero.nextSibling);
    }
    mapaBtn.style.display = "block";
  } else if (mapaBtn) {
    mapaBtn.style.display = "none";
  }
  // Saudação contextual da IA escolhida
  try {
    const r = await VSSupabase.rpc("assistente_contexto", { p_bot: bot });
    const c = Array.isArray(r) ? r[0] : r;
    if (c?.ok) {
      let frase = "";
      if (c.qtd_aberturas <= 1) frase = c.saudacao_inicial;
      else if (c.dias_desde_ultima > 7) frase = `Bão te ver, faz ${c.dias_desde_ultima} dia${c.dias_desde_ultima === 1 ? "" : "s"} que tu não falava comigo!`;
      else if (c.top_memoria) frase = `Lembra que tu falou que ${c.top_memoria}? E aí, novidade?`;
      else frase = `Bão te ver! ${c.qtd_memorias_total ? `Já sei ${c.qtd_memorias_total} coisinhas tuas.` : "Conta uma novidade."}`;
      _adicionarMsgChat(frase, v);
      try { window.VSLitoranea?.falarTTS?.(frase); } catch {}
    }
  } catch {}
};
function _adicionarMsgChat(texto, vis) {
  const chat = document.getElementById("lit-chat");
  if (!chat) return;
  const div = document.createElement("div");
  div.style.cssText = `background:${vis.bg};border-left:3px solid ${vis.cor};padding:10px 14px;border-radius:10px;margin:8px 0;font-size:14px;line-height:1.5`;
  div.textContent = `${vis.emoji} ${texto}`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// Quando user manda mensagem, sugere troca de bot se outra é mais relevante
async function _sugerirTrocaBot(texto) {
  try {
    const r = await VSSupabase.rpc("assistente_rotear", { p_texto: texto });
    const d = Array.isArray(r) ? r[0] : r;
    if (d?.ok && d.score >= 1 && d.sugerido !== _botAtivo) {
      const v = _BOT_VISUAL[d.sugerido];
      if (!v) return;
      const sug = `Acho que a ${v.nome} ${v.emoji} resolve melhor isso. Quer que eu chame ela?`;
      const visAtual = _BOT_VISUAL[_botAtivo];
      _adicionarMsgChat(sug + ` <button onclick="trocarBot('${d.sugerido}')" style="margin-left:8px;background:${v.cor};color:#000;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-weight:700">Sim, chama ${v.nome}</button>`, visAtual);
      const chat = document.getElementById("lit-chat");
      const ultima = chat?.lastElementChild;
      if (ultima) ultima.innerHTML = `${visAtual.emoji} ${sug} <button onclick="trocarBot('${d.sugerido}')" style="margin-left:8px;background:${v.cor};color:#000;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-weight:700">Chama ${v.nome}</button>`;
    }
  } catch {}
}

// Hook no input da Litorânea pra sugerir troca
document.addEventListener("DOMContentLoaded", () => {
  const inp = document.getElementById("input-pergunta");
  inp?.addEventListener("change", () => {
    const t = inp.value;
    if (t && t.length > 5) _sugerirTrocaBot(t);
  });
});

// ─────────────────────────────────────────────────────────────
// 🧠 Aprendiz de perfil — Litorânea extrai categorias da fala
// ─────────────────────────────────────────────────────────────
const _CATEGORIAS_CONHECIDAS = [
  // Comida
  "café", "cafe", "pizza", "hambúrguer", "hamburguer", "lanche", "sorvete", "sushi",
  "churrasco", "vinho", "cerveja", "padaria", "doce", "chocolate", "açaí", "acai",
  "camarão", "camarao", "peixe", "marisco", "comida japonesa", "comida italiana", "vegano",
  "vegetariano", "natural", "fast food", "salgado", "torta",
  // Hospedagem
  "pousada", "hotel", "hostel", "camping", "resort", "estadia",
  // Saúde/serviços
  "farmácia", "farmacia", "mercado", "supermercado", "padaria", "açougue", "acougue",
  // Lazer
  "praia", "trilha", "cachoeira", "surfe", "surf", "mergulho", "kayak", "stand up",
  "trekking", "escalada", "ciclismo", "bicicleta", "passeio", "tour",
  // Cultura
  "museu", "história", "historia", "teatro", "show", "música", "musica", "festa", "balada",
  // Compras
  "artesanato", "roupas", "presente", "souvenir", "loja",
  // Bem-estar
  "spa", "massagem", "yoga", "academia", "fitness",
];
function _detectarCategoriasNaFala(texto) {
  const t = String(texto || "").toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "");
  const sinaisInteresse = [
    /\bgost(o|ei|amos)\s+de\b/, /\bam(o|ei|amos)\b/, /\bcurt(o|i|imos)\b/,
    /\bquer(o|emos)\b/, /\bprocur(o|amos|ando)\b/, /\bbusc(o|ando|amos)\b/,
    /\bvou\s+(comprar|comer|tomar|num|numa)\b/, /\btom(o|ando)\b/,
    /\bsou\s+(de|fan)\b/, /\btenho\s+vontade\s+de\b/, /\bme\s+(traz|interessa)\b/,
    /\b(adoro|amo)\b/
  ];
  const temIntencao = sinaisInteresse.some(re => re.test(t));
  if (!temIntencao) return [];
  // Pega categorias mencionadas
  const found = new Set();
  _CATEGORIAS_CONHECIDAS.forEach(cat => {
    const catN = cat.normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (t.includes(catN)) found.add(cat);
  });
  return Array.from(found);
}

// Parser RICO: extrai família, idades, intenções, hábitos, consumo
function _extrairPerfilRico(texto) {
  const t = String(texto || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const out = { categorias_declaradas: [], familia: null, intencoes_compra: [], consumo_proxy: [], extras: [] };
  // 1) Categorias (já tinha)
  out.categorias_declaradas = _detectarCategoriasNaFala(texto);
  // 2) Família — quantos são, idades, papéis
  const mFilhos = t.match(/(\d+)\s+filhos?/);
  const mFamilia = t.match(/somos\s+(\d+)/) || t.match(/em\s+casa\s+somos\s+(\d+)/);
  const idades = [...t.matchAll(/(?:filh[ao]|criança|guri|menino|menina)[\sa-z]*?de\s+(\d{1,2})\s+anos?/g)].map(m => parseInt(m[1]));
  const tem = (re) => re.test(t);
  if (mFilhos || mFamilia || idades.length || tem(/\b(esposa|marido|companheir[ao]|namorad[ao])\b/)) {
    out.familia = {
      qtd_filhos: mFilhos ? parseInt(mFilhos[1]) : null,
      qtd_total: mFamilia ? parseInt(mFamilia[1]) : null,
      idades_filhos: idades,
      tem_conjuge: tem(/\b(esposa|marido|companheir[ao]|namorad[ao])\b/),
      tem_pais_morando: tem(/\bpai|m[aã]e\b/) && tem(/\bcomigo|em casa\b/),
    };
  }
  // 3) Intenções de compra futura — palavras-âncora
  const itensCompra = [
    "bicicleta", "laptop", "notebook", "celular", "smartphone",
    "máquina de lavar", "geladeira", "fogão", "tv", "televisão",
    "carro", "moto", "scooter",
    "ar condicionado", "fritadeira", "ferramenta", "móvel",
    "passagem", "viagem", "bilhete",
    "tênis", "bota", "mochila",
    "instrumento musical", "violão", "guitarra",
  ];
  const sinalFuturo = /\b(vou|preciso|quero|pretend|planejo|algum dia|ano que vem|próximo|proxim|em breve|futuro|trocar|comprar|adquirir)\b/.test(t);
  if (sinalFuturo) {
    itensCompra.forEach(item => {
      const i = item.normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (t.includes(i)) {
        // tenta extrair prazo (em N meses/ano)
        let prazo = 6;
        const mPrazo = t.match(/em\s+(\d+)\s+(mes|meses|ano|anos)/);
        if (mPrazo) prazo = parseInt(mPrazo[1]) * (mPrazo[2].startsWith("ano") ? 12 : 1);
        else if (/\bano que vem|ano que vai vir|próximo ano\b/.test(t)) prazo = 12;
        else if (/\bem breve|logo|próxim[oa]\b/.test(t)) prazo = 3;
        out.intencoes_compra.push({ item, prazo_meses: prazo });
      }
    });
  }
  // 4) Consumo proxy de renda
  if (/\bvinho.*car[oa]|reserva|importado|premium\b/.test(t)) out.consumo_proxy.push("vinho_premium");
  if (/\b(restaurante|jant[ae]r|gastronomia)\b.*\b(fino|chic|sofisticado|caro)\b/.test(t)) out.consumo_proxy.push("gastronomia_alta");
  if (/\bvi[ae]gem|f[ée]rias|exterior|europa|estados unidos\b/.test(t)) out.consumo_proxy.push("viagens");
  if (/\bcarro novo|importado|s[ae]da|suv\b/.test(t)) out.consumo_proxy.push("carro_premium");
  if (/\bfaculdade|universidade|p[oó]s|mestrado|doutorado|m[bb]a\b/.test(t)) out.extras.push("formacao_superior");
  if (/\bcrian[çc]a\b.*\bcol[ée]gio|escola particular\b/.test(t)) out.extras.push("filhos_escola_particular");

  // 5) Profissão / trabalho
  const profissoes = [
    "engenheir", "advogad", "médic", "medico", "dentist", "professor", "professora",
    "designer", "programador", "dev", "desenvolvedor", "arquitet",
    "vendedor", "vendedora", "comerciante", "empresário", "empresaria",
    "motorista", "uber", "taxista", "garçon", "garcon", "cozinheir",
    "estudante", "aposentad", "autônom", "autonom",
    "fotógraf", "fotograf", "artista", "músic", "musico",
    "enfermeir", "psicólog", "psicolog", "fisioterapeut", "veterinári",
    "pescador", "agricultor", "pedreiro", "eletricista", "encanador"
  ];
  for (const p of profissoes) {
    if (t.includes(p)) {
      const m = t.match(new RegExp(`\\b(sou|trabalho como|trabalho de|atuo como|virei)\\b[^\\.]*?${p}\\w*`, "i"));
      if (m || /\beu\s+sou\b/.test(t)) {
        out.profissao = (t.match(new RegExp(`${p}\\w*`)) || [p])[0];
        break;
      }
    }
  }

  // 6) Hobbies / esporte / pet
  const hobbies = ["corrida","corro","run","ciclismo","pedal","futebol","futbol","pilates","yoga","jiu-jitsu","jiu jitsu","crossfit","artesanato","pintar","pintura","violão","violao","cantar","cantor","musical","leitura","leio","cozinhar","jardinagem","fotografia","camping"];
  for (const h of hobbies) if (t.includes(h)) out.hobbies = (out.hobbies || []).concat(h);

  // 7) Pet
  const pets = [
    { palavra: "cachorr", tipo: "cachorro" },
    { palavra: "gat[oa]", tipo: "gato" },
    { palavra: "passari", tipo: "passarinho" },
    { palavra: "peix", tipo: "peixe" },
    { palavra: "cavalo", tipo: "cavalo" },
  ];
  for (const p of pets) if (new RegExp(`\\b${p.palavra}\\w*\\b`).test(t) && /\bmeu|tenho|cria|adotei\b/.test(t)) {
    out.pet = (out.pet || []).concat(p.tipo);
  }

  return out;
}

// ── 🌉 PONTE DOS DOIS COLETORES (Litorânea ↔ sininho) ────────────────────────
// O que a Litorânea aprende no chat liga o interesse correspondente nas
// notificações (promoção certeira via salvar_notif_prefs/demanda agregada), e o
// gosto marcado no sininho vira memória dela (litoranea_lembrar). Um perfil só.
const _MAPA_FALA_INTERESSE = {
  pizza: "pizza", "hambúrguer": "hamburger", hamburguer: "hamburger", lanche: "hamburger",
  sushi: "sushi", "comida japonesa": "sushi", pastel: "pastel", salgado: "pastel",
  "camarão": "frutos_mar", camarao: "frutos_mar", peixe: "frutos_mar", marisco: "frutos_mar",
  churrasco: "churrasco", "açaí": "acai", acai: "acai", sorvete: "acai",
  "café": "cafe", cafe: "cafe", padaria: "cafe", doce: "cafe", torta: "cafe", chocolate: "cafe",
  vegano: "vegano", vegetariano: "vegano", natural: "vegano",
  cerveja: "cerveja", vinho: "cerveja", vinho_premium: "cerveja",
  mercado: "mercado", hortifruti: "hortifruti", "farmácia": "farmacia", farmacia: "farmacia",
  moda: "moda", roupa: "moda", "tênis": "moda", tenis: "moda",
  pet: "pet", cachorro: "pet", gato: "pet",
  "construção": "construcao", construcao: "construcao", ferramenta: "construcao",
  pousada: "pousada", hotel: "pousada", hostel: "pousada", camping: "pousada",
  barco: "barco", pesca: "pesca", surf: "surf", trilha: "trilha", trilhas: "trilha",
  artesanato: "artesanato", pintura: "artesanato", pintar: "artesanato",
  beleza: "beleza", "salão": "beleza", salao: "beleza",
  carro: "auto", moto: "auto", oficina: "auto",
  ciclismo: "auto", pedal: "auto"
};
function _interessesDoPerfil(perfil) {
  const sinais = []
    .concat(perfil.categorias_declaradas || [])
    .concat(perfil.consumo_proxy || [])
    .concat(perfil.hobbies || [])
    .concat(perfil.pet ? ["pet"] : [])
    .concat((perfil.intencoes_compra || []).map(ic => ic.item));
  const ids = new Set();
  sinais.forEach(s => {
    const k = String(s).toLowerCase().trim();
    if (_MAPA_FALA_INTERESSE[k]) ids.add(_MAPA_FALA_INTERESSE[k]);
  });
  return [...ids];
}
function _ponteInteressesNotif(perfil) {
  const meus = getInteressesNotif();
  const novos = _interessesDoPerfil(perfil).filter(id => !meus.includes(id));
  if (!novos.length) return;
  saveInteressesNotif([...meus, ...novos]); // já sincroniza pro servidor (debounce)
  try { renderInteressesNotif(); } catch (e) {}
  try { toast(`🎯 Anotei teu gosto e liguei nas notificações: ${novos.join(", ")}`); } catch (e) {}
}

async function _salvarMemoriasDoPerfil(perfil) {
  // Salva fatos importantes extraídos como memórias permanentes
  try { _ponteInteressesNotif(perfil); } catch (e) {}
  const promises = [];
  if (perfil.familia) {
    const f = perfil.familia;
    if (f.qtd_filhos)
      promises.push(VSSupabase.rpc("litoranea_lembrar", {
        p_fato: `tem ${f.qtd_filhos} filho${f.qtd_filhos > 1 ? "s" : ""}${f.idades_filhos?.length ? ` (idades ${f.idades_filhos.join(",")})` : ""}`,
        p_tipo: "familia", p_importancia: 80
      }));
    if (f.qtd_total)
      promises.push(VSSupabase.rpc("litoranea_lembrar", {
        p_fato: `família com ${f.qtd_total} pessoas em casa`,
        p_tipo: "familia", p_importancia: 70
      }));
    if (f.tem_conjuge)
      promises.push(VSSupabase.rpc("litoranea_lembrar", {
        p_fato: "tem cônjuge", p_tipo: "familia", p_importancia: 50
      }));
  }
  (perfil.intencoes_compra || []).forEach(ic => {
    promises.push(VSSupabase.rpc("litoranea_lembrar", {
      p_fato: `quer comprar ${ic.item} em ${ic.prazo_meses} meses`,
      p_tipo: "compra_futura", p_importancia: 90
    }));
  });
  (perfil.consumo_proxy || []).forEach(c => {
    promises.push(VSSupabase.rpc("litoranea_lembrar", {
      p_fato: `consumo: ${c.replace(/_/g, " ")}`, p_tipo: "consumo", p_importancia: 60
    }));
  });
  if (perfil.profissao) {
    promises.push(VSSupabase.rpc("litoranea_lembrar", {
      p_fato: `profissão: ${perfil.profissao}`, p_tipo: "trabalho", p_importancia: 75
    }));
  }
  (perfil.hobbies || []).forEach(h => {
    promises.push(VSSupabase.rpc("litoranea_lembrar", {
      p_fato: `hobby: ${h}`, p_tipo: "hobby", p_importancia: 65
    }));
  });
  (perfil.pet || []).forEach(p => {
    promises.push(VSSupabase.rpc("litoranea_lembrar", {
      p_fato: `tem ${p}`, p_tipo: "pet", p_importancia: 55
    }));
  });
  await Promise.all(promises.map(p => p.catch(() => {})));
}

async function _aprenderPreferenciasDaFala(texto) {
  // Só salva se user consentiu explicitamente
  if (localStorage.getItem("vs.lit.consent.gostos") !== "sim") return null;
  const perfil = _extrairPerfilRico(texto);
  const algoNovo = perfil.categorias_declaradas.length || perfil.familia ||
                   perfil.intencoes_compra.length || perfil.consumo_proxy.length || perfil.extras.length;
  if (!algoNovo) return null;
  // Salva categorias declaradas
  for (const c of perfil.categorias_declaradas) {
    try { await VSSupabase.rpc("adicionar_preferencia_categoria", { p_cat: c }); } catch {}
  }
  // Salva perfil rico (família + consumo + extras)
  const payload = {};
  if (perfil.familia) payload.familia = perfil.familia;
  if (perfil.consumo_proxy.length) payload.consumo_proxy = perfil.consumo_proxy;
  if (perfil.extras.length) payload.extras_perfil = perfil.extras;
  if (Object.keys(payload).length) {
    try { await VSSupabase.rpc("aprender_perfil_rico", { p_payload: payload }); } catch {}
  }
  // Salva intenções de compra (alimenta pool de coletivas)
  for (const ic of perfil.intencoes_compra) {
    try {
      await VSSupabase.rpc("registrar_intencao_compra", {
        p_item: ic.item, p_prazo_meses: ic.prazo_meses,
        p_cidade: state?.cidade || null, p_estado: state?.estado || null
      });
    } catch {}
  }
  // Salva memórias permanentes do que ela aprendeu
  await _salvarMemoriasDoPerfil(perfil);
  return perfil;
}

// ─────────────────────────────────────────────────────────────
// 👋 Saudação contextual da Litorânea — usa memórias + tempo desde última visita
// ─────────────────────────────────────────────────────────────
async function _saudacaoLitoraneaContextual() {
  try {
    const r = await VSSupabase.rpc("litoranea_contexto_saudacao");
    const c = Array.isArray(r) ? r[0] : r;
    if (!c?.ok) return null;
    const sot = sotaqueDe(state?.estado);
    let frase = "";
    // Primeira visita
    if (c.qtd_aberturas <= 1) {
      frase = `${sot.saudacao} Sou a Litorânea. Quanto mais tu me contar dos teus gostos, melhor eu te conecto com o pessoal certo do Sul.`;
    }
    // Voltou depois de >7 dias
    else if (c.dias_desde_ultima > 7) {
      frase = `${sot.saudacao} Faz ${c.dias_desde_ultima} dia${c.dias_desde_ultima === 1 ? "" : "s"} que tu não aparecia, vivente! Senti tua falta.`;
    }
    // Tem memória pendente — usa pra puxar conversa
    else if (c.top_memoria) {
      const mem = c.top_memoria;
      frase = `${sot.saudacao} Lembra que tu falou que ${mem}? Como tá isso? Conta novidade.`;
      // Marca essa memória como "mencionada" pra não repetir
      try { await VSSupabase.rpc("litoranea_memoria_mencionada", { p_fato: mem }); } catch {}
    }
    // Visita recente — saudação curta
    else if (c.qtd_aberturas <= 5) {
      frase = `Bão te ver de novo! ${c.qtd_memorias_total ? `Já sei ${c.qtd_memorias_total} coisinhas tuas, vou aprendendo mais.` : ""}`;
    } else {
      frase = `${sot.saudacao} ${c.qtd_memorias_total ? `Já tenho ${c.qtd_memorias_total} coisas anotadas no teu perfil.` : ""}`;
    }
    return frase.trim();
  } catch { return null; }
}

// Plugar saudação contextual quando user abre o chat da Litorânea.
// SEMPRE roda a saudação base (intro completa na 1ª vez, curta nas próximas).
// Saudação contextual (RPC) entra como complemento — não substitui a base.
const _origMostrarSaudacaoLit = window.mostrarSaudacaoLit;
window.mostrarSaudacaoLit = async function() {
  // 1) Saudação base SEMPRE — é o "olá, sou a Litorânea, posso te ajudar com..."
  if (typeof _origMostrarSaudacaoLit === "function") {
    try { _origMostrarSaudacaoLit.call(this); } catch (e) { console.warn("[saudacao base]", e); }
  }
  // 2) Saudação contextual em cima — só se RPC retornar algo útil
  const fala = await _saudacaoLitoraneaContextual();
  if (!fala) return;
  const chat = document.getElementById("lit-chat");
  if (chat) {
    const div = document.createElement("div");
    div.className = "lit-msg lit-msg-bot";
    div.style.cssText = "background:rgba(110,200,255,0.10);border-left:3px solid #7af0ff;padding:10px 14px;border-radius:10px;margin:8px 0;font-size:14px;line-height:1.5";
    div.textContent = "🌊 " + fala;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }
  // Fala contextual via TTS só se mute global off
  try {
    if (localStorage.getItem("vs.muted") !== "1") {
      window.VSLitoranea?.falarTTS?.(fala);
    }
  } catch {}
};

// 🗺️ Litorânea conhece as localidades — quando user menciona cidade, ela injeta info
async function _litoraneaSabeLocais(texto) {
  const t = String(texto || "").toLowerCase();
  // Detecta menção a cidade conhecida do banco
  try {
    const cidades = await sb("v_litoranea_cidades_resumo?select=cidade,estado,qtd_praias,qtd_bairros,qtd_atracoes,qtd_historicos&order=qtd_atracoes.desc&limit=50");
    if (!cidades?.length) return null;
    let cidadeFound = null;
    for (const c of cidades) {
      const cn = c.cidade.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      const tn = t.normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (tn.includes(cn) && cn.length > 4) { cidadeFound = c; break; }
    }
    if (!cidadeFound) return null;
    // Detecta intenção: praia / atração / bairro / o que tem
    let tipo = null;
    if (/\bpraia|praias\b/.test(t)) tipo = "praia";
    else if (/\batra[çc][ãa]o|atra[çc][õo]es|pra fazer\b/.test(t)) tipo = "atração";
    else if (/\bbairro|bairros|onde fica\b/.test(t)) tipo = "bairro";
    else if (/\bhist[óo]ric|historico|patrim[ôo]nio\b/.test(t)) tipo = "histórico";
    // Busca localidades específicas
    const r = await VSSupabase.rpc("litoranea_localidades_cidade", {
      p_cidade: cidadeFound.cidade, p_estado: cidadeFound.estado
    });
    const dados = Array.isArray(r) ? r[0] : r;
    if (!dados || typeof dados !== "object") return null;
    let resposta = "";
    if (tipo && dados[tipo]) {
      const items = (dados[tipo] || []).slice(0, 7);
      resposta = `Em ${cidadeFound.cidade} tem ${items.length} ${tipo}${items.length===1?"":"s"} no meu mapa: ${items.map(i=>i.nome).join(", ")}.`;
    } else {
      resposta = `${cidadeFound.cidade} tem ${cidadeFound.qtd_praias} praias, ${cidadeFound.qtd_atracoes} atrações, ${cidadeFound.qtd_bairros} bairros e ${cidadeFound.qtd_historicos} pontos históricos no meu mapa. Pergunta sobre algum se quiser.`;
    }
    return resposta;
  } catch { return null; }
}

// Lábia sulista: depois que aprende algo, faz pergunta carinhosa pra extrair MAIS
const PERGUNTAS_LITORANEA = [
  "Bah tchê, e a gurizada? Quantos cês são em casa?",
  "Vivente, me conta mais — o que cê tá pensando em comprar nesse ano?",
  "Tchê, e o que cês mais consomem em casa? Café, pão, fruta? Curto saber.",
  "E a guriza estuda onde? Conta um pouco que eu posso indicar promoção.",
  "Tu trabalha com o quê? Quanto mais eu sei, mais eu te conecto com o pessoal certo do Sul.",
  "E os pais, vivem contigo ou já tão na deles? Tem promoção pros mais velhos também.",
  "Tu já planejou trocar a bicicleta, laptop, alguma coisa grande pro próximo ano? A gente junta gente que quer a mesma coisa e barateia tudo.",
  "Bah, e nas viagens, vai pra onde? Praia, serra, Europa? Tem desconto pros que avisam cedo.",
  "E os finais de semana? Trilha, balada, jantar fora, ficar em casa? Cada um tem promo certa.",
  "Tem bicho em casa? Cachorro, gato? Tem ofertas de pet shop bem da hora.",
  "E pra te mover, é carro, moto, bike, a pé? Conta as rotinas que eu otimizo tuas idas.",
  "Tu joga algum esporte ou faz academia? Curto saber pra te indicar parceiros do Sul.",
  "Curto saber de tudo, vivente. Quanto mais cê me conta, melhor eu te entendo e te conecto."
];
function _proximaPerguntaLitoranea() {
  const idx = parseInt(localStorage.getItem("vs_pergunta_idx") || "0", 10) % PERGUNTAS_LITORANEA.length;
  localStorage.setItem("vs_pergunta_idx", String(idx + 1));
  return PERGUNTAS_LITORANEA[idx];
}

// Hook: intercepta o processar() da Litorânea pra aprender E usar lábia sulista
if (window.VSLitoranea && window.VSLitoranea.processar) {
  const _origProcessar = window.VSLitoranea.processar;
  window.VSLitoranea.processar = async function(texto, opts) {
    try {
      // Litorânea sabe das localidades — fala delas se user perguntar
      const sobreLocal = await _litoraneaSabeLocais(texto);
      if (sobreLocal) {
        try { window.VSLitoranea.falarTTS?.(sobreLocal); } catch {}
        // Adiciona no chat também
        const chat = document.getElementById("lit-chat");
        if (chat) {
          const div = document.createElement("div");
          div.style.cssText = "background:rgba(110,200,255,0.10);border-left:3px solid #7af0ff;padding:10px 14px;border-radius:10px;margin:8px 0;font-size:14px;line-height:1.5";
          div.textContent = "🌊 " + sobreLocal;
          chat.appendChild(div);
          chat.scrollTop = chat.scrollHeight;
        }
      }
      const perfil = await _aprenderPreferenciasDaFala(texto);
      if (perfil) {
        const partes = [];
        if (perfil.categorias_declaradas?.length)
          partes.push(`gosta de ${perfil.categorias_declaradas.slice(0,3).join(", ")}`);
        if (perfil.familia)
          partes.push("família anotada");
        if (perfil.intencoes_compra?.length)
          partes.push(`quer comprar ${perfil.intencoes_compra.map(i=>i.item).slice(0,2).join(", ")} no futuro`);
        if (perfil.consumo_proxy?.length) partes.push("hábitos anotados");
        if (partes.length) {
          // Lábia sulista: confirma + faz pergunta puxando próxima informação
          const conf = `Anotei aqui — ${partes.join(", ")}.`;
          const proxima = _proximaPerguntaLitoranea();
          const fala = `${conf} ${proxima}`;
          try { window.VSLitoranea.falarTTS?.(fala); } catch {}
        }
      }
    } catch {}
    return _origProcessar.call(this, texto, opts);
  };
}

// ─────────────────────────────────────────────────────────────
// 👤 Tela "Meu Perfil rico" — transparência LGPD do que ela aprendeu
// ─────────────────────────────────────────────────────────────
window.abrirMeuPerfilRico = async function() {
  let modal = document.getElementById("modal-perfil-rico");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-perfil-rico";
    modal.className = "modal-bg";
    modal.innerHTML = `
      <div class="modal" style="max-width:560px;max-height:92vh;overflow-y:auto">
        <h3>👤 ${tr("perfil_titulo")}</h3>
        <p style="font-size:13px;color:var(--hint);margin:6px 0 12px">
          ${tr("perfil_intro")}
          <strong>${tr("perfil_lgpd")}</strong>
        </p>
        <div id="perfil-rico-conteudo"></div>
        <button class="btn-primary" style="width:100%;margin-top:14px;background:rgba(120,120,120,0.4)" onclick="document.getElementById('modal-perfil-rico').style.display='none'">Fechar</button>
      </div>`;
    document.body.appendChild(modal);
  }
  modal.style.display = "flex";
  const cont = document.getElementById("perfil-rico-conteudo");
  cont.innerHTML = "<div class='loading'>…</div>";
  try {
    const r = await VSSupabase.rpc("meu_perfil_rico");
    const d = Array.isArray(r) ? r[0] : r;
    if (!d?.ok) { cont.innerHTML = "<p>Erro</p>"; return; }
    const p = d.preferences || {};
    const i = d.intencoes_compra || [];
    const cats = p.categorias_declaradas || [];
    const fam = p.familia || null;
    const cons = p.consumo_proxy || [];
    const extras = p.extras_perfil || [];
    cont.innerHTML = `
      <div class="card-info">
        <strong>🎯 ${tr("perfil_curte")}</strong>
        <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px">
          ${cats.length ? cats.map(c => `<span style="background:rgba(13,114,62,0.45);padding:4px 10px;border-radius:12px;font-size:12px">${escapeHtml(c)}</span>`).join("") : `<small style='color:var(--hint)'>${tr("perfil_nada")}</small>`}
        </div>
      </div>
      ${fam ? `
        <div class="card-info" style="margin-top:8px">
          <strong>👨‍👩‍👧 ${tr("perfil_familia")}</strong>
          <div style="font-size:13px;margin-top:4px">
            ${fam.qtd_total ? `Total em casa: <strong>${fam.qtd_total}</strong><br>` : ""}
            ${fam.qtd_filhos ? `Filhos: <strong>${fam.qtd_filhos}</strong>${fam.idades_filhos?.length ? ` (idades: ${fam.idades_filhos.join(", ")})` : ""}<br>` : ""}
            ${fam.tem_conjuge ? `${tr("perfil_conjuge")}<br>` : ""}
            ${fam.tem_pais_morando ? `${tr("perfil_pais_junto")}<br>` : ""}
          </div>
        </div>` : ""}
      ${cons.length || extras.length ? `
        <div class="card-info" style="margin-top:8px">
          <strong>📊 ${tr("perfil_habitos")}</strong>
          <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px">
            ${[...cons, ...extras].map(c => `<span style="background:rgba(255,193,7,0.30);padding:4px 10px;border-radius:12px;font-size:12px">${escapeHtml(c.replace(/_/g," "))}</span>`).join("")}
          </div>
        </div>` : ""}
      ${(p.profissao || (p.hobbies && p.hobbies.length) || (p.pet && p.pet.length)) ? `
        <div class="card-info" style="margin-top:8px">
          <strong>🧑‍💼 ${tr("perfil_vida")}</strong>
          <div style="font-size:13px;margin-top:4px;line-height:1.6">
            ${p.profissao ? `Profissão: <strong>${escapeHtml(p.profissao)}</strong><br>` : ""}
            ${(p.hobbies||[]).length ? `Hobbies: ${p.hobbies.map(h=>escapeHtml(h)).join(", ")}<br>` : ""}
            ${(p.pet||[]).length ? `Pet: ${p.pet.map(x=>escapeHtml(x)).join(", ")}` : ""}
          </div>
        </div>` : ""}
      ${i.length ? `
        <div class="card-info" style="margin-top:8px">
          <strong>🛒 ${tr("perfil_comprar")}</strong>
          <p style="font-size:11px;color:var(--hint);margin:4px 0 8px">${tr("perfil_coletiva")}</p>
          ${i.map(it => `
            <div style="display:flex;justify-content:space-between;padding:6px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px">
              <span><strong>${escapeHtml(it.item)}</strong></span>
              <span style="color:var(--hint)">em ${it.prazo_meses} meses</span>
            </div>
          `).join("")}
        </div>` : ""}
      <div style="margin-top:14px;padding:10px;background:rgba(38,124,180,0.10);border:1px solid rgba(110,200,255,0.30);border-radius:8px;font-size:12px;line-height:1.5">
        💡 <strong>${tr("perfil_como_aumentar")}</strong> abre o chat da Litorânea (🪶 botão central) e fala dos seus gostos, família, planos. Tipo: <em>"Adoro vinho e tomo café todo dia. Vou comprar uma bicicleta ano que vem. Tenho 2 filhos, 7 e 12."</em> Ela aprende tudo automaticamente.
      </div>`;
  } catch (e) { cont.innerHTML = `<p style="color:#f44">Erro: ${e.message}</p>`; }
};

// ─────────────────────────────────────────────────────────────
// 📡 DOOH — heartbeat de presença pra publicidade inteligente
// Só roda se user opt-in EXPLÍCITO em vs_modo_descobrir
// ─────────────────────────────────────────────────────────────
let _heartbeatTimer = null;
async function _heartbeatPresenca() {
  if (localStorage.getItem("vs_modo_descobrir") !== "1") return;
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      await VSSupabase.rpc("registrar_presenca", {
        p_lat: pos.coords.latitude, p_lng: pos.coords.longitude,
        p_cidade: state?.cidade || null, p_estado: state?.estado || null
      });
      // Matching: vê se algum comerciante próximo combina com interesse do user
      await _verificarMatches(pos.coords.latitude, pos.coords.longitude);
    } catch {}
  }, () => {}, { timeout: 8000, maximumAge: 60000, enableHighAccuracy: false });
}

async function _verificarMatches(lat, lng) {
  try {
    const r = await VSSupabase.rpc("matches_proximos", { p_lat: lat, p_lng: lng });
    const d = Array.isArray(r) ? r[0] : r;
    if (!d?.ok) return;
    const matches = d.matches || [];
    if (!matches.length) return;
    // Anti-spam: cooldown 4h por barraca + max 1 toast por sessão de 30min
    const seen = JSON.parse(localStorage.getItem("vs_match_seen") || "{}");
    const ultimoToast = parseInt(localStorage.getItem("vs_match_ultimo_toast") || "0", 10);
    const agora = Date.now();
    if (agora - ultimoToast < 30 * 60 * 1000) return;  // 30min entre toasts
    const candidato = matches.find(m => {
      const ult = seen[m.id] || 0;
      return agora - ult > 4 * 60 * 60 * 1000;  // 4h cooldown por barraca
    });
    if (!candidato) return;
    seen[candidato.id] = agora;
    // Limpa entries antigas (>24h)
    Object.keys(seen).forEach(k => { if (agora - seen[k] > 86400000) delete seen[k]; });
    localStorage.setItem("vs_match_seen", JSON.stringify(seen));
    localStorage.setItem("vs_match_ultimo_toast", String(agora));
    // _mostrarToastMatch(candidato); // Desativado: balão azul que incomodava no topo
  } catch (e) { console.warn("[match]", e?.message || e); }
}

function _mostrarToastMatch(m) {
  let toast = document.getElementById("vs-match-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "vs-match-toast";
    toast.style.cssText = `position:fixed;top:20px;left:50%;transform:translateX(-50%) translateY(-200%);
      background:linear-gradient(135deg,rgba(13,114,62,0.95),rgba(38,124,180,0.95));
      color:#fff;padding:14px 20px;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,0.5);
      z-index:9500;max-width:90%;width:380px;transition:transform .55s cubic-bezier(.4,1.5,.6,1);
      backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
      border:1px solid rgba(255,255,255,0.20)`;
    document.body.appendChild(toast);
  }
  const distTxt = m.dist_m < 1000 ? `${m.dist_m}m` : `${(m.dist_m/1000).toFixed(1)}km`;
  toast.innerHTML = `
    <div style="display:flex;gap:10px;align-items:flex-start">
      <div style="font-size:28px">📍</div>
      <div style="flex:1">
        <strong style="display:block;font-size:14px">${escapeHtml(m.nome)} ${m.geoloc_paga ? '<small style="color:#ffd54f">⭐</small>' : ''}</strong>
        <div style="font-size:12px;opacity:0.9;margin-top:2px">${escapeHtml(m.categoria || '')} · a <strong>${distTxt}</strong> de você</div>
        ${m.descricao ? `<div style="font-size:11px;opacity:0.8;margin-top:4px">${escapeHtml(m.descricao)}</div>` : ""}
        <small style="display:block;font-size:10px;opacity:0.7;margin-top:6px">🎯 ${tr("match_combina")}</small>
      </div>
      <button onclick="document.getElementById('vs-match-toast').style.transform='translateX(-50%) translateY(-200%)'"
              style="background:transparent;border:none;color:#fff;cursor:pointer;font-size:18px;padding:0 4px">×</button>
    </div>
    <div style="display:flex;gap:6px;margin-top:10px">
      <button onclick="comoChegar({lat:0,lng:0,nome:'${escapeHtml(m.nome)}',categoria:'${escapeHtml(m.categoria||'')}',id:'${m.id}'})"
              style="flex:1;background:rgba(255,255,255,0.18);color:#fff;border:none;padding:8px;border-radius:6px;cursor:pointer;font-size:12px">
        🧭 Como chegar
      </button>
      <button onclick="document.getElementById('vs-match-toast').style.transform='translateX(-50%) translateY(-200%)'"
              style="flex:1;background:rgba(0,0,0,0.30);color:#fff;border:none;padding:8px;border-radius:6px;cursor:pointer;font-size:12px">
        ${tr("agora_nao")}
      </button>
    </div>`;
  // Anima entrada
  requestAnimationFrame(() => {
    toast.style.transform = "translateX(-50%) translateY(0)";
  });
  // Auto-some em 12s
  setTimeout(() => {
    if (toast) toast.style.transform = "translateX(-50%) translateY(-200%)";
  }, 12000);
}
function iniciarHeartbeatPresenca() {
  if (_heartbeatTimer) clearInterval(_heartbeatTimer);
  if (localStorage.getItem("vs_modo_descobrir") !== "1") return;
  _heartbeatPresenca();  // primeira chamada
  _heartbeatTimer = setInterval(_heartbeatPresenca, 30000);
}
function pararHeartbeatPresenca() {
  if (_heartbeatTimer) clearInterval(_heartbeatTimer);
  _heartbeatTimer = null;
}
window.toggleModoDescobrir = function() {
  const ativo = localStorage.getItem("vs_modo_descobrir") === "1";
  if (ativo) {
    localStorage.removeItem("vs_modo_descobrir");
    pararHeartbeatPresenca();
    alert(tr("descobrir_desativado"));
  } else {
    if (!confirm(tr("descobrir_confirm"))) return;
    localStorage.setItem("vs_modo_descobrir", "1");
    iniciarHeartbeatPresenca();
    alert(tr("descobrir_ativo"));
  }
};
// Inicia heartbeat ao boot se já era opt-in
setTimeout(() => iniciarHeartbeatPresenca(), 4000);

// ─────────────────────────────────────────────────────────────
// 🛡️ Sistema de honestidade — score, aviso, banimento, reabilitação
// ─────────────────────────────────────────────────────────────
let _scoreCache = null;
async function carregarScoreHonestidade(forcar = false) {
  if (_scoreCache && !forcar) return _scoreCache;
  try {
    const r = await VSSupabase.rpc("meu_score_honestidade");
    _scoreCache = Array.isArray(r) ? r[0] : r;
  } catch { _scoreCache = null; }
  return _scoreCache;
}
async function checarStatusHonestidade() {
  const d = await carregarScoreHonestidade(true);
  if (!d?.ok) return;
  const s = d.status;
  if (s === "banido_perma" || s === "banido_temp") {
    alertaBanimento(d);
  } else if (s === "aviso") {
    alertaAviso(d);
  }
  // 'observado' e 'ok' não interrompem
}
function alertaAviso(d) {
  if (sessionStorage.getItem("vs_aviso_visto")) return;
  sessionStorage.setItem("vs_aviso_visto", "1");
  alert(`⚠️ AVISO IMPORTANTE\n\nSeu score de honestidade caiu pra ${d.score}/100. Detectamos comportamento suspeito.\n\nO app NUNCA esquece. Continua de olho.\n\nUm próximo erro = banimento de 7 dias.\n\nAvisos recebidos: ${d.avisos_recebidos}`);
}
function alertaBanimento(d) {
  const perma = d.banido_permanente;
  const ate = d.banido_ate ? new Date(d.banido_ate).toLocaleString("pt-BR") : "—";
  alert(`🚫 CONTA SUSPENSA\n\n${perma ? "Banimento PERMANENTE — sem volta." : `Banido até ${ate}.\n\nPra voltar: complete 5 missões legítimas após o fim do prazo.`}\n\nScore: ${d.score}/100`);
  if (!perma) showScreen("honestidade");
}
window.abrirHonestidade = async function() {
  showScreen("honestidade");
  const cont = document.getElementById("honestidade-conteudo");
  cont.innerHTML = "<div class='loading' style='padding:30px;text-align:center'>Carregando…</div>";
  const d = await carregarScoreHonestidade(true);
  if (!d?.ok) { cont.innerHTML = `<p style='color:#f44'>Erro: ${d?.erro || "?"}</p>`; return; }
  const corScore = d.score >= 70 ? "#4caf50" : d.score >= 40 ? "#ffb300" : "#f44336";
  const statusTxt = {
    ok: tr("hon_status_ok"),
    observado: tr("hon_status_observado"),
    aviso: tr("hon_status_aviso"),
    banido_temp: tr("hon_status_ban_temp"),
    banido_perma: tr("hon_status_ban_perma")
  }[d.status] || d.status;
  const eventos = (d.ultimos_eventos || []).map(e => `
    <div style="font-size:12px;padding:6px;border-bottom:1px solid rgba(255,255,255,0.06)">
      <strong>${escapeHtml(e.tipo)}</strong>
      <small style="display:block;color:var(--hint)">${escapeHtml(e.detalhe || "")} · ${new Date(e.created_at).toLocaleString("pt-BR")}</small>
    </div>`).join("") || "<small>nenhum evento registrado</small>";

  const isBan = d.status === "banido_temp" || d.status === "banido_perma";
  const tier = d.tier || {};
  const tierEmoji = tier.emoji || "";
  const tierName = (tier.tier || "").toUpperCase();
  const mult = tier.multiplicador || 1;
  const beneficios = tier.beneficios || [];
  const corTier = mult >= 1.3 ? "#7af0ff" : mult >= 1.2 ? "#ffd54f" : mult >= 1.1 ? "#cccccc" : "#888";

  cont.innerHTML = `
    <div class="card-info" style="text-align:center;padding:20px;background:linear-gradient(135deg,${corTier}22,transparent);border:1px solid ${corTier}55">
      <div style="font-size:42px;margin-bottom:6px">${tierEmoji}</div>
      <div style="font-size:18px;font-weight:700;color:${corTier};letter-spacing:2px">${tierName}</div>
      <div style="font-size:48px;font-weight:800;color:${corScore};text-shadow:0 0 16px ${corScore}66;margin-top:6px">${d.score}/100</div>
      <div style="margin-top:6px;font-size:14px">${statusTxt}</div>
      ${mult > 1 ? `<div style="margin-top:10px;font-size:18px;font-weight:800;color:${corTier};text-shadow:0 0 10px ${corTier}66">🎁 ${(mult*100-100).toFixed(0)}% BÔNUS EM TUDO</div>` : ""}
    </div>
    ${beneficios.length ? `
    <div class="card-info" style="margin-top:10px;background:${mult>=1.2?'rgba(255,193,7,0.10)':'rgba(255,255,255,0.04)'};border:1px solid ${corTier}40">
      <strong>${tierEmoji} Benefícios ativos</strong>
      <ul style="margin:8px 0 0 14px;padding:0;font-size:13px;line-height:1.6">
        ${beneficios.map(b => `<li>${escapeHtml(b)}</li>`).join("")}
      </ul>
    </div>` : ""}
    <div class="card-info" style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
      <div><small>Avisos</small><div style="font-size:18px;font-weight:700">${d.avisos_recebidos}</div></div>
      <div><small>Bans</small><div style="font-size:18px;font-weight:700">${d.bans_historico}</div></div>
      <div><small>Status</small><div style="font-size:14px;font-weight:700;color:${corScore}">${d.status}</div></div>
    </div>
    <div class="card-info" style="margin-top:10px;background:rgba(38,124,180,0.10);border:1px solid rgba(110,200,255,0.30)">
      <strong>🪜 Tiers de honestidade</strong>
      <div style="font-size:12px;line-height:1.7;margin-top:6px">
        💎 <strong>Diamante</strong> (95-100): +30% bônus, missões exclusivas, suporte prioritário<br>
        🥇 <strong>Ouro</strong> (85-94): +20% bônus, limite transferência 5×<br>
        🥈 <strong>Prata</strong> (70-84): +10% bônus<br>
        🥉 <strong>Bronze</strong> (40-69): observado, sem multiplicador<br>
        ⚠️ <strong>Restrito</strong> (&lt;40): aviso forte / banimento iminente
      </div>
    </div>
    <h3 style="margin-top:18px;font-size:14px">📋 ${tr("hon_ultimos_eventos")}</h3>
    <div class="card-info" style="padding:8px">${eventos}</div>
    ${isBan && !d.banido_permanente ? `
      <div class="card-info" style="margin-top:14px;background:rgba(244,67,54,0.10);border:1px solid rgba(244,67,54,0.40)">
        <strong>🔓 ${tr("hon_como_voltar")}</strong>
        <p style="font-size:13px;margin-top:6px;line-height:1.5">
          1. Aguarda fim do prazo (${d.banido_ate ? new Date(d.banido_ate).toLocaleString("pt-BR") : "—"})<br>
          2. Após o prazo, completa <strong>5 missões legítimas</strong> (postar nas redes, indicar amigo, etc)<br>
          3. Toca em "Tentar reabilitar" — score volta pra 70 sob observação
        </p>
        <button class="btn-primary" style="width:100%;margin-top:10px;background:rgba(255,193,7,0.55)" onclick="tentarReabilitar()">🔓 ${tr("hon_tentar_reabilitar")}</button>
      </div>` : ""}
    ${d.banido_permanente ? `
      <div class="card-info" style="margin-top:14px;background:rgba(244,67,54,0.20);border:1px solid rgba(244,67,54,0.60)">
        <strong>${tr("hon_ban_perma_titulo")}</strong>
        <p style="font-size:13px;margin-top:6px">Sem retorno. Ações repetidas mesmo após primeiro banimento = perma.</p>
      </div>` : ""}
    <div class="card-info" style="margin-top:14px;background:rgba(38,124,180,0.10);border:1px solid rgba(110,200,255,0.30)">
      <strong>📖 ${tr("hon_como_sistema_funciona")}</strong>
      <ul style="margin:8px 0 0 14px;padding:0;font-size:13px;line-height:1.55">
        <li>Score começa em <strong>100/100</strong></li>
        <li>Comportamento suspeito leve (-30): "Observado", virou alerta interno</li>
        <li>Suspeita média (-60): "Aviso forte" — modal vermelho</li>
        <li>Score &le; 0: <strong>banimento de 7 dias</strong></li>
        <li>Segundo banimento = <strong>permanente</strong>, sem retorno</li>
        <li>Pra voltar do primeiro: 5 missões legítimas + 7 dias de quarentena</li>
      </ul>
      <strong style="display:block;margin-top:10px">${tr("hon_detectamos")}</strong>
      <ul style="margin:6px 0 0 14px;padding:0;font-size:13px;line-height:1.55">
        <li>Transferência loop A→B→A em menos de 60s (lavagem)</li>
        <li>Tentativa de reivindicar bônus 2× no mesmo dia</li>
        <li>Múltiplos signups do mesmo IP em curto prazo (sybil)</li>
        <li>Saldo negativo tentado (forçando overflow)</li>
        <li>Reuso de código de indicação</li>
      </ul>
    </div>`;
};
window.tentarReabilitar = async function() {
  if (!confirm("Tentar reabilitar conta agora? Vamos verificar se você completou 5 missões legítimas.")) return;
  try {
    const r = await VSSupabase.rpc("tentar_reabilitar");
    const d = Array.isArray(r) ? r[0] : r;
    if (d?.ok) {
      alert(d.msg || "✓ Reabilitado!");
      _scoreCache = null;
      abrirHonestidade();
    } else if (d?.erro === "precisa_5_missoes") {
      alert(`Você completou ${d.completadas} missões. Faltam ${d.falta} pra reabilitar. Vai nas missões sociais e completa.`);
      abrirMissoesSociais();
    } else if (d?.erro === "ainda_banido") {
      alert("Ainda em quarentena. Liberado em: " + new Date(d.ate).toLocaleString("pt-BR"));
    } else {
      alert("Erro: " + (d?.erro || "?"));
    }
  } catch (e) { alert("Erro: " + (e.message || e)); }
};
// Ao carregar app, checa silenciosamente
setTimeout(() => { checarStatusHonestidade().catch(() => {}); }, 3000);

// ─────────────────────────────────────────────────────────────
// 🪙 Auditoria SulCoin — pública + detalhada (admin)
// ─────────────────────────────────────────────────────────────
async function _carregarAuditSC() {
  const r = await sb("v_sulcoin_audit?select=*");
  return r?.[0] || null;
}
function _renderAuditSC(d, modoAdmin = false) {
  if (!d) return `<p class="subtitle">${tr("audit_sem_dados")}</p>`;
  const fmt = n => Number(n || 0).toLocaleString("pt-BR");
  const reais = n => `R$ ${(Number(n||0)/100).toLocaleString("pt-BR", {minimumFractionDigits:2, maximumFractionDigits:2})}`;
  const movs = d.movimentos_por_tipo || {};
  const movsHtml = Object.entries(movs).map(([k,v]) => `<div>· ${escapeHtml(k)}: <strong>${v}</strong></div>`).join("");

  const explicacao = modoAdmin ? `
    <div class="card-info" style="background:rgba(255,193,7,0.10);border:1px solid rgba(255,193,7,0.35);margin-top:14px">
      <h4 style="margin:0 0 8px">📖 Glossário pra você (e seu sucessor)</h4>
      <div style="font-size:13px;line-height:1.6">
        <p><strong>Paridade:</strong> 1 SulCoin (SC) = 100 sulis = R$ 1,00. "Sulis" é a fração mínima (centavo do SC).</p>
        <p><strong>Total creditado in:</strong> tudo que a "casa" emitiu pra galera (bônus diários, missões sociais, indicações, ganhos de jogo). Aumenta com engajamento.</p>
        <p><strong>Total queimado:</strong> tudo que foi destruído pagando serviço (geoloc, carrossel, banner). NÃO volta pra ninguém — é a "renda" do app, sai de circulação.</p>
        <p><strong>Balanço transferências:</strong> deve ser SEMPRE 0. Cada SC enviado tem uma cópia recebida. Se ficar diferente de 0, é bug grave.</p>
        <p><strong>Em carteiras:</strong> soma de todo SC que ainda está com algum user (passivo do app).</p>
        <p><strong>Em hubs:</strong> 8% automático que vai pro caixa coletivo do bairro a cada SC ganho.</p>
        <p><strong>Equação contábil:</strong><br>
          <code>Em circulação = Creditado in + Transferências (=0) - Queimado</code></p>
        <p><strong>Tipos de movimento:</strong></p>
        <ul style="margin:0 0 0 14px;padding:0">
          <li><code>credito_missao</code> — bônus de missão/jogo/diário</li>
          <li><code>transferencia_in / out</code> — pagamento entre users (sempre par)</li>
          <li><code>queima_servico</code> — comerciante pagou plano (queima)</li>
          <li><code>debito_gasto</code> — saída diversa</li>
          <li><code>bloqueio / desbloqueio</code> — reserva temporária</li>
          <li><code>expiracao</code> — SC venceu sem uso (queima)</li>
          <li><code>entrada_paga</code> — user pagou R$1/mês ou R$10/ano</li>
          <li><code>reativacao</code> — promo</li>
          <li><code>compra_pacote</code> — comprou SC (futuro)</li>
        </ul>
        <p><strong>Anti-duplicação ativa:</strong></p>
        <ul style="margin:0 0 0 14px;padding:0">
          <li>UNIQUE (user, ref_tipo, ref_id) em entrada/indicação/plano</li>
          <li>CHECK saldo_livre &gt;= 0 (impede negativo)</li>
          <li>RPC SECURITY DEFINER (cliente nunca toca tabela direto)</li>
          <li>Append-only: sem UPDATE/DELETE em sc_transactions</li>
          <li>Cooldown por missão; 1 código de indicação por user; 1 bônus diário por dia</li>
        </ul>
        <p><strong>Pra virar dindin real precisa:</strong> conta empresa + PSP (Stripe/Asaas) recebendo Pix, KYC mínimo (CPF), reserva legal, cashout SC→Pix.</p>
      </div>
    </div>` : "";

  const equacaoOk = (d.balanco_transferencias === "0" || d.balanco_transferencias === 0);
  const equacaoCor = equacaoOk ? "#4caf50" : "#f44336";

  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:10px;margin-top:14px">
      <div class="card-info">
        <small>💚 Em circulação</small>
        <strong style="font-size:22px;color:#7af0ff">${fmt(d.em_carteiras)}</strong>
        <small style="color:var(--hint)">${reais(d.em_carteiras)}</small>
      </div>
      <div class="card-info">
        <small>📥 Creditado total</small>
        <strong style="font-size:22px;color:#ffd54f">${fmt(d.total_creditos_in)}</strong>
        <small style="color:var(--hint)">emitido pela "casa"</small>
      </div>
      <div class="card-info">
        <small>🔥 Queimado</small>
        <strong style="font-size:22px;color:#ff7043">${fmt(d.total_queimado)}</strong>
        <small style="color:var(--hint)">pagamento serviços</small>
      </div>
      <div class="card-info">
        <small>🏘️ Em hubs</small>
        <strong style="font-size:22px;color:#4caf50">${fmt(d.em_hubs)}</strong>
        <small style="color:var(--hint)">caixa coletivo</small>
      </div>
    </div>
    <div class="card-info" style="margin-top:14px;background:${equacaoOk?'rgba(76,175,80,0.10)':'rgba(244,67,54,0.10)'};border:1px solid ${equacaoCor}">
      <strong>${equacaoOk ? '✅' : '⚠️'} Conservação de massa</strong>
      <div style="margin-top:6px;font-family:monospace;font-size:13px">
        Σ transferências (in+out) = <strong style="color:${equacaoCor}">${d.balanco_transferencias}</strong>
        ${equacaoOk ? '(perfeito — cada envio tem recebimento espelhado)' : '(BUG — investigar imediatamente)'}
      </div>
    </div>
    <div class="card-info" style="margin-top:10px">
      <strong>📊 Movimentos por tipo (${d.total_movimentos} total)</strong>
      <div style="margin-top:8px;font-size:13px">${movsHtml || '<small>nenhum</small>'}</div>
    </div>
    <div class="card-info" style="margin-top:10px">
      <strong>👥 Usuários</strong>
      <div style="margin-top:6px;font-size:13px">
        Com saldo &gt; 0: <strong>${d.users_com_saldo}</strong>
      </div>
    </div>
    <small style="display:block;text-align:center;color:var(--hint);margin-top:14px">
      Calculado em ${new Date(d.calculado_em).toLocaleString("pt-BR")} ·
      <a href="javascript:abrirAuditSC()" style="color:var(--primary)">↻ recarregar</a>
    </small>
    ${explicacao}`;
}
window.abrirAuditSC = async function() {
  showScreen("audit-sc");
  const cont = document.getElementById("audit-sc-conteudo");
  cont.innerHTML = "<div class='loading' style='padding:30px;text-align:center'>Carregando…</div>";
  try {
    const d = await _carregarAuditSC();
    cont.innerHTML = _renderAuditSC(d, false);
  } catch (e) { cont.innerHTML = `<p style="color:#f44">Erro: ${e.message}</p>`; }
};
// ─────────────────────────────────────────────────────────────
// 🧪 Teste Pix — gera QR de verdade no Asaas Sandbox
// ─────────────────────────────────────────────────────────────
window.testarPixAsaas = async function() {
  const valor = parseInt(prompt("Valor em centavos pra testar (ex: 100 = R$ 1,00):", "100"), 10);
  if (!Number.isFinite(valor) || valor < 1) return alert("Valor inválido");
  const cpf = prompt("CPF de teste (qualquer válido — sandbox aceita 12345678909):", "12345678909");
  if (!cpf) return;
  try {
    // 1. Cria order no Supabase
    const r1 = await VSSupabase.rpc("criar_pedido_pagamento", {
      p_ref_tipo: "teste", p_ref_id: "teste_admin",
      p_valor_centavos: valor, p_metodo: "pix"
    });
    const d1 = Array.isArray(r1) ? r1[0] : r1;
    if (!d1?.ok) return alert("Erro criar order: " + (d1?.erro || "?"));
    // 2. Chama Edge Function pra gerar QR Pix
    const sess = VSSupabase.getSession?.();
    const tok = (sess?.session || sess)?.access_token;
    const resp = await fetch(`${VENTOSUL_CONFIG.SUPABASE_URL}/functions/v1/criar-pix-asaas`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tok || VENTOSUL_CONFIG.SUPABASE_ANON_JWT}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        order_id: d1.order_id, cpf, email: "teste@vento-sul.tech",
        nome: "Teste Vento Sul"
      })
    });
    const d2 = await resp.json();
    if (!d2?.ok) return alert("Erro Asaas: " + JSON.stringify(d2, null, 2).slice(0, 400));
    // 3. Mostra modal com QR
    let modal = document.getElementById("modal-teste-pix");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "modal-teste-pix";
      modal.className = "modal-bg";
      modal.innerHTML = `<div class="modal" style="text-align:center;max-width:480px"></div>`;
      document.body.appendChild(modal);
    }
    modal.querySelector(".modal").innerHTML = `
      <h3>🧪 Pix de teste gerado!</h3>
      <p style="font-size:13px;color:var(--hint);margin:6px 0 12px">
        QR Pix REAL do Asaas Sandbox. R$ ${(valor/100).toFixed(2)}<br>
        ID Asaas: <code>${escapeHtml(d2.asaas_payment_id || "?")}</code>
      </p>
      ${d2.qrcode_pix ? `<img src="${d2.qrcode_pix}" alt="QR" style="width:240px;height:240px;background:#fff;border-radius:14px;padding:8px;display:inline-block">` : "<p>Sem QR retornado</p>"}
      ${d2.copy_paste ? `<div style="margin-top:12px"><strong>Copia-e-cola:</strong></div><textarea readonly style="width:100%;height:80px;font-size:11px;padding:8px;background:rgba(255,255,255,0.05);color:var(--text);border:1px solid rgba(255,255,255,0.20);border-radius:6px;margin-top:6px" onclick="this.select()">${escapeHtml(d2.copy_paste)}</textarea>` : ""}
      <p style="font-size:11px;color:var(--hint);margin-top:10px">
        💡 Em sandbox, simula pagamento clicando em "marcar como pago" no painel sandbox.asaas.com → Cobranças.
      </p>
      <button class="btn-primary" style="width:100%;margin-top:14px;background:rgba(120,120,120,0.4)" onclick="document.getElementById('modal-teste-pix').style.display='none'">Fechar</button>`;
    modal.style.display = "flex";
  } catch (e) { alert("Erro: " + (e.message || e)); }
};

async function renderAdminMetricas() {
  const cont = document.getElementById("admin-painel-metricas");
  if (!cont) return;
  cont.innerHTML = "<div class='loading' style='padding:30px;text-align:center'>Calculando…</div>";
  try {
    const r = await sb("v_metricas_admin?select=*");
    const m = r?.[0] || {};
    const fmt = n => Number(n||0).toLocaleString("pt-BR");
    const card = (emoji, label, val, cor="#7af0ff") => `
      <div class="card-info" style="border-left:3px solid ${cor}">
        <div style="font-size:11px;color:var(--hint)">${emoji} ${escapeHtml(label)}</div>
        <strong style="font-size:22px;color:${cor}">${fmt(val)}</strong>
      </div>`;
    cont.innerHTML = `
      <h4 style="margin-top:6px">👥 ${tr("adm_usuarios")}</h4>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px">
        ${card("🌐","Total geral", m.users_total, "#7af0ff")}
        ${card("🟢","DAU 7d", m.dau_7d, "#4caf50")}
        ${card("📊","MAU 30d", m.mau_30d, "#03a9f4")}
        ${card("✨","Novos 7d", m.novos_users_7d, "#ffd54f")}
      </div>
      <h4 style="margin-top:14px">🪙 ${tr("adm_economia")}</h4>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px">
        ${card("💚","Em circulação", m.sulis_em_circulacao, "#7af0ff")}
        ${card("📥","Emitidos 30d", m.sulis_emitidos_30d, "#ffd54f")}
        ${card("🔥","Queimados 30d", m.sulis_queimados_30d, "#ff7043")}
        ${card("⚡","Movimentos 24h", m.movimentos_24h, "#9575cd")}
      </div>
      <h4 style="margin-top:14px">🏪 ${tr("adm_comercio")}</h4>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px">
        ${card("🏪","Barracas ativas", m.barracas_ativas, "#4caf50")}
        ${card("👤","Comerciantes reais", m.comerciantes_reais, "#03a9f4")}
        ${card("📍","Geoloc paga", m.barracas_geoloc_paga, "#ffd54f")}
        ${card("📺","TVs ativas", m.tvs_ativas, "#9575cd")}
        ${card("👁️","Impressões 24h", m.impressoes_24h, "#ff60d0")}
      </div>
      <h4 style="margin-top:14px">🏘️ ${tr("adm_hubs")}</h4>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px">
        ${card("🏘️","Hubs ativos", m.hubs_ativos, "#4caf50")}
        ${card("💰","Caixa hubs total", m.total_caixas_hubs, "#ffd54f")}
        ${card("🗳️","Propostas abertas", m.propostas_abertas, "#03a9f4")}
        ${card("🎯","Missões 30d", m.missoes_30d, "#9575cd")}
        ${card("🤝","Indicações 30d", m.indicacoes_30d, "#ff60d0")}
        ${card("🛒","Pool intenções", m.intencoes_pool_total, "#ff7043")}
      </div>
      <small style="display:block;text-align:center;color:var(--hint);margin-top:14px">
        Calculado em ${new Date(m.calculado_em).toLocaleString("pt-BR")} ·
        <a href="javascript:renderAdminMetricas()" style="color:var(--primary)">↻ recarregar</a>
      </small>
      <h4 style="margin-top:18px">🛠️ ${tr("adm_ferramentas")}</h4>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
        <button class="btn-primary" style="background:rgba(13,114,62,0.65)" onclick="testarPixAsaas()">🧪 ${tr("adm_testar_pix")}</button>
        <button class="btn-primary" style="background:rgba(140,90,200,0.55)" onclick="ativarPush()">🔔 ${tr("adm_ativar_push")}</button>
      </div>`;
  } catch (e) { cont.innerHTML = `<p style="color:#f44">Erro: ${e.message}</p>`; }
}

async function renderAdminEconomia() {
  const cont = document.getElementById("admin-painel-economia");
  if (!cont) return;
  cont.innerHTML = "<div class='loading'>…</div>";
  try {
    const d = await _carregarAuditSC();
    // Top 10 carteiras
    const top = await sb("sc_wallets?select=user_id,saldo_livre_sulis&order=saldo_livre_sulis.desc&limit=10").catch(() => []);
    const topHtml = top.length ? `
      <h4 style="margin-top:14px">💰 Top 10 carteiras</h4>
      ${top.map((t, i) => `<div style="display:flex;justify-content:space-between;padding:6px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px">
        <span>#${i+1} <code>${(t.user_id||"").slice(0,8)}…</code></span>
        <strong style="color:#7af0ff">${VSWallet.formatarSulis(t.saldo_livre_sulis)}</strong>
      </div>`).join("")}` : "";
    // Últimas 10 transações
    const ult = await sb("sc_transactions?select=user_id,tipo,sulis,ref_tipo,mensagem,created_at&order=created_at.desc&limit=10").catch(() => []);
    const ultHtml = ult.length ? `
      <h4 style="margin-top:14px">⏱️ Últimas 10 transações</h4>
      ${ult.map(t => `<div style="font-size:12px;padding:6px;border-bottom:1px solid rgba(255,255,255,0.06)">
        <strong>${escapeHtml(t.tipo)}</strong> · <span style="color:${t.sulis>0?'#4caf50':'#ff7043'}">${t.sulis>0?'+':''}${t.sulis}</span> · <code>${(t.user_id||"").slice(0,8)}</code>
        <small style="display:block;color:var(--hint)">${escapeHtml(t.mensagem||t.ref_tipo||"")} · ${new Date(t.created_at).toLocaleString("pt-BR")}</small>
      </div>`).join("")}` : "";
    cont.innerHTML = _renderAuditSC(d, true) + topHtml + ultHtml;
  } catch (e) { cont.innerHTML = `<p style="color:#f44">Erro: ${e.message}</p>`; }
}

// ─────────────────────────────────────────────────────────────
// 🏘️ Meu Hub — caixa coletivo do bairro (Fase 1: read-only + entrar)
// ─────────────────────────────────────────────────────────────
window.abrirMeuHub = async function() {
  showScreen("hub");
  const sub = document.getElementById("hub-subtitle");
  const cont = document.getElementById("hub-conteudo");
  cont.innerHTML = "<div class='loading' style='padding:30px;text-align:center'>Carregando seu hub…</div>";
  try {
    const r = await VSSupabase.rpc("meu_hub");
    const d = Array.isArray(r) ? r[0] : r;
    if (!d?.ok) { sub.textContent = "Erro: " + (d?.erro || "?"); cont.innerHTML = ""; return; }
    if (!d.tem_hub) {
      sub.textContent = tr("hub_nenhum");
      cont.innerHTML = `
        <p style="margin:14px 0">${tr("hub_explica")}</p>
        <button class="btn-primary" style="width:100%" onclick="abrirEscolherHub()">🏘️ ${tr("hub_escolher")} →</button>`;
      return;
    }
    sub.textContent = `${d.nome} · ${d.bairro || ""} · ${d.cidade}/${d.estado}`;
    const tierEmoji = { sementinha: "🌱", crescendo: "🌿", robusto: "🌳", massa: "🏔️" }[d.tier] || "🏘️";
    const top = (d.top_contribuidores || []).slice(0, 10);
    const movs = (d.movimentos || []).slice(0, 15);
    cont.innerHTML = `
      <div class="card-info" style="background:linear-gradient(135deg,rgba(38,124,180,0.20),rgba(13,114,62,0.20));border:1px solid rgba(110,200,255,0.30)">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            <div style="font-size:13px;color:var(--hint)">${tierEmoji} Tier ${d.tier} · ${d.membros_total} membros</div>
            <div style="font-size:32px;font-weight:800;color:#7af0ff;text-shadow:0 0 12px rgba(110,200,255,0.5)">
              ${VSWallet.formatarSulis(d.caixa_sulis)}
            </div>
            <div style="font-size:12px;color:var(--hint)">${tr("hub_caixa_coletivo")}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;color:var(--hint)">${tr("hub_sua_contrib")}</div>
            <div style="font-size:18px;font-weight:700;color:#4caf50">${VSWallet.formatarSulis(d.minha_contribuicao_sulis)}</div>
          </div>
        </div>
        <div style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="background:rgba(0,0,0,0.18);padding:10px;border-radius:8px;border-left:3px solid #ff7043">
            <div style="font-size:11px;color:var(--hint)">💰 Custos fixos (${d.pct_bucket_custos}%)</div>
            <strong>${VSWallet.formatarSulis(d.bucket_custos_sulis)}</strong>
            <div style="font-size:10px;color:var(--hint);margin-top:2px">${tr("hub_custos_labels")}</div>
          </div>
          <div style="background:rgba(0,0,0,0.18);padding:10px;border-radius:8px;border-left:3px solid #ffd54f">
            <div style="font-size:11px;color:var(--hint)">🗳️ Projetos (${100 - d.pct_bucket_custos}%)</div>
            <strong>${VSWallet.formatarSulis(d.bucket_projetos_sulis)}</strong>
            <div style="font-size:10px;color:var(--hint);margin-top:2px">${tr("hub_votado_galera")}</div>
          </div>
        </div>
      </div>
      ${top.length ? `
        <h3 style="margin-top:18px;font-size:14px">🏆 ${tr("hub_top_contrib")}</h3>
        <div style="margin-top:8px">
          ${top.map((t, i) => `
            <div class="card-info" style="margin:4px 0;padding:8px;display:flex;align-items:center;gap:10px">
              <div style="width:24px;text-align:center;font-weight:800;color:${i===0?'#ffd54f':i===1?'#ccc':i===2?'#cd7f32':'var(--hint)'}">${i+1}</div>
              <div style="flex:1;font-size:13px">${escapeHtml(t.email || "anônimo")}</div>
              <div style="font-size:13px;color:#4caf50;font-weight:700">${VSWallet.formatarSulis(t.total_sulis)}</div>
            </div>`).join("")}
        </div>` : ""}
      ${movs.length ? `
        <h3 style="margin-top:18px;font-size:14px">📋 ${tr("hub_movimentos")}</h3>
        <div style="margin-top:8px">
          ${movs.map(m => {
            const sinal = m.sulis >= 0 ? "+" : "";
            const cor = m.sulis >= 0 ? "#4caf50" : "#ff7043";
            const data = new Date(m.criado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
            return `<div style="display:flex;justify-content:space-between;padding:6px 10px;font-size:12px;border-bottom:1px solid rgba(255,255,255,0.06)">
              <span><strong>${escapeHtml(m.tipo)}</strong> · ${escapeHtml(m.descricao || "")}</span>
              <span style="color:${cor};font-weight:700">${sinal}${m.sulis}</span>
              <small style="color:var(--hint)">${data}</small>
            </div>`;
          }).join("")}
        </div>` : ""}
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="btn-primary" style="flex:1;background:rgba(255,193,7,0.55);font-size:13px;padding:10px"
                onclick="abrirPropostasHub()">🗳️ ${tr("hub_propostas")}</button>
        <button class="btn-primary" style="flex:1;background:rgba(38,124,180,0.55);font-size:13px;padding:10px"
                onclick="abrirCopaHubs()">🏆 ${tr("hub_copa")}</button>
      </div>
      <div style="margin-top:14px;padding:12px;background:rgba(38,124,180,0.10);border:1px solid rgba(110,200,255,0.30);border-radius:8px;font-size:12px;line-height:1.45">
        💡 <strong>${tr("hub_como_funciona")}</strong> qualquer membro propõe uso do bucket de projetos. Quórum 50%+1 aprova. Aprovada com caixa = executada na hora (debita do bucket). Custos fixos (link/energia) saem do bucket de custos automaticamente todo mês.
      </div>
      <button class="btn-primary" style="width:100%;margin-top:14px;background:rgba(120,120,120,0.4);font-size:13px" onclick="abrirEscolherHub()">🏘️ ${tr("hub_trocar")}</button>`;
  } catch (e) {
    sub.textContent = "Erro: " + (e.message || e);
    cont.innerHTML = "";
  }
};

window.abrirEscolherHub = async function() {
  showScreen("hub-escolher");
  const lista = document.getElementById("hub-escolher-lista");
  lista.innerHTML = "<div class='loading' style='padding:30px;text-align:center'>Buscando hubs…</div>";
  try {
    const r = await VSSupabase.rpc("listar_hubs_perto", {
      p_cidade: state?.cidade || null,
      p_estado: state?.estado || null
    });
    const hubs = Array.isArray(r) ? r : (r ? [r] : []);
    if (!hubs.length) {
      lista.innerHTML = "<p class='subtitle'>" + tr("hub_nenhum_disp") + "</p>";
      return;
    }
    const tierEmoji = { sementinha: "🌱", crescendo: "🌿", robusto: "🌳", massa: "🏔️" };
    lista.innerHTML = hubs.map(h => `
      <div class="card-info" style="margin:8px 0;padding:14px">
        <div style="display:flex;align-items:flex-start;gap:8px">
          <div style="font-size:26px">${tierEmoji[h.tier] || "🏘️"}</div>
          <div style="flex:1">
            <strong>${escapeHtml(h.nome)}</strong>
            <div style="font-size:12px;color:var(--hint)">${escapeHtml(h.bairro || "")} · ${escapeHtml(h.cidade || "")}/${escapeHtml(h.estado || "")}</div>
            <div style="font-size:13px;color:#4caf50;margin-top:6px">👥 ${h.membros} membros · 💰 ${VSWallet.formatarSulis(h.caixa_sulis)} no caixa</div>
            <button class="btn-primary" style="margin-top:10px;background:rgba(13,114,62,0.65);font-size:13px;padding:8px 14px"
                    onclick="entrarHub('${h.id}')">
              ${tr("hub_entrar_nesse")}
            </button>
          </div>
        </div>
      </div>`).join("");
  } catch (e) {
    lista.innerHTML = `<p style="color:#f44">Erro: ${e.message || e}</p>`;
  }
};

// Pollinations: gera URL determinística pra avatar de classe × era × gênero.
// Estética por era:
//   passado  → humano antigo c/ armadura steampunk fortificada (engrenagens, latão, couro)
//   presente → humano c/ roupa tática moderna estilizada (proteções, fibra, urbano BR)
//   futuro   → humanoide c/ armadura robótica bem definida (mecânica, exoesqueleto, neon)
function avatarPollinations(classe, era, genero = "m") {
  const eraDesc = {
    passado:
      "medieval steampunk warrior, intricate fortified plate armor with brass gears " +
      "and leather straps, baroque fantasy oil painting, dramatic candlelight, weathered look",
    presente:
      "modern tactical outfit, stylized protective gear (knee/elbow pads, light kevlar vest, " +
      "utility belt), photorealistic portrait, contemporary Brazil aesthetic, urban sunlight",
    futuro:
      "fully mechanical android robot, sleek metal chassis with visible servos and joints, " +
      "polished plating, glowing eye sensors, sci-fi concept art, cinematic neon backlight, " +
      "hyper detailed mechanical character, NOT human"
  }[era] || "photorealistic portrait";
  // Cada classe carrega um INSTRUMENTO DE CONHECIMENTO. Nunca arma.
  const promptByClasse = {
    desbravador: "explorer carrying open map and brass compass, field journal, alert pose",
    guerreiro:   "community guardian protector with a wooden shield and a megaphone, calm leader stance",
    mago:        "knowledge keeper holding a glowing open book of wisdom",
    alquimista:  "alchemist mixing colorful potions and dried herbs in a workbench",
    sabio:       "elder sage holding a long paper scroll, calm wise gaze",
    forjador:    "builder smith holding crafting hammer and pliers, sleeves rolled up at a workbench",
    watcher:     "silent observer holding a camera with telephoto lens, scribbling notes"
  };
  const promptClasse = promptByClasse[String(classe||"").toLowerCase()] || "south Brazilian person carrying a notebook";
  const generoTxt = genero === "f" ? "female human" : "male human";
  // Negative prompt no fim (Pollinations entende dicas em prosa)
  const noWeapons = "no weapons, no sword, no firearm, no gun, no rifle, no spear, no axe";
  const prompt = `${generoTxt}, ${promptClasse}, ${eraDesc}, full upper body portrait centered, hyper detailed, sharp focus, ${noWeapons}`;
  const seed = (String(classe||"") + "_" + era + "_" + genero).split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  return "/icons/icon-192.png";
}

// Preferência do user: m | f | both (default both — mostra os 2 lado a lado)
window._auroraGenero = (() => {
  try { return localStorage.getItem("vs_aurora_genero") || "both"; } catch { return "both"; }
})();
window.toggleGeneroAurora = function(g) {
  window._auroraGenero = g;
  try { localStorage.setItem("vs_aurora_genero", g); } catch {}
  if (typeof abrirClassesPapeis === "function") abrirClassesPapeis();
};

window.abrirClassesPapeis = async function() {
  showScreen("classes-papeis");
  const cont = document.getElementById("classes-papeis-conteudo");
  cont.innerHTML = "<div class='loading' style='padding:30px;text-align:center'>Carregando…</div>";
  try {
    const r = await VSSupabase.rpc("listar_classes_papeis");
    const classes = Array.isArray(r) ? r : [];
    if (!classes.length) { cont.innerHTML = "<p>Sem classes."; return; }
    const gen = window._auroraGenero || "both";
    cont.innerHTML = `
      <div class="card-info" style="background:linear-gradient(135deg,rgba(140,90,200,0.18),rgba(38,124,180,0.14));border:1px solid rgba(140,90,200,0.40)">
        <strong>🎭 ${tr("classes_como_funciona")}</strong>
        <div style="font-size:13px;line-height:1.55;margin-top:6px">
          Cada classe Aurora é um <strong>papel real</strong> na economia do app. Na Fase 2, hubs vão financiar membros que cumprem seu papel:<br>
          • Hub vota proposta de financiamento ("vamos pagar 2.000 sulis/mês pra um Desbravador trazer 10 clientes")<br>
          • Desbravador cumpre KPI mensal pra continuar recebendo<br>
          • Watcher filma a missão pra confirmar — vídeo vai pras redes (galera de outros estados confirma)
        </div>
        <div style="margin-top:8px;padding:8px;background:rgba(255,255,255,0.05);border-radius:6px;font-size:12px">
          🕰️ <strong>3 linhas do tempo</strong>: Passado (medieval) · Presente (atual) · Futuro (cyber). Mesma classe, visual diferente em cada era.
        </div>
        <div style="display:flex;gap:6px;justify-content:center;margin-top:10px">
          <button class="btn-primary" style="padding:6px 12px;font-size:11px;background:${gen==='m'?'rgba(38,124,180,0.65)':'rgba(255,255,255,0.06)'}" onclick="toggleGeneroAurora('m')">♂ ${tr("genero_homem")}</button>
          <button class="btn-primary" style="padding:6px 12px;font-size:11px;background:${gen==='f'?'rgba(255,80,200,0.65)':'rgba(255,255,255,0.06)'}" onclick="toggleGeneroAurora('f')">♀ ${tr("genero_mulher")}</button>
          <button class="btn-primary" style="padding:6px 12px;font-size:11px;background:${gen==='both'?'rgba(140,90,200,0.65)':'rgba(255,255,255,0.06)'}" onclick="toggleGeneroAurora('both')">⚥ ${tr("genero_ambos")}</button>
        </div>
      </div>
      ${classes.map(c => {
        const especial = c.tipo === "especial";
        const cor = especial ? "#ffd54f" : c.ordem_financiamento === 1 ? "#7af0ff" : "#cccccc";
        const ck = String(c.classe || c.nome || "").toLowerCase();
        const renderEra = (era, fundo, label, descricao) => {
          if (gen === "both") {
            const m = avatarPollinations(ck, era, "m");
            const f = avatarPollinations(ck, era, "f");
            return `
              <div style="padding:6px;background:${fundo};border-radius:4px;text-align:center">
                <div style="display:flex;gap:3px;margin-bottom:4px">
                  <img src="${m}" loading="lazy" alt="${label} ♂" style="width:50%;aspect-ratio:1;border-radius:6px;object-fit:cover;background:rgba(0,0,0,0.30)">
                  <img src="${f}" loading="lazy" alt="${label} ♀" style="width:50%;aspect-ratio:1;border-radius:6px;object-fit:cover;background:rgba(0,0,0,0.30)">
                </div>
                <strong>${label}</strong><br><span style="font-size:10px">${escapeHtml(descricao || "")}</span>
              </div>`;
          }
          const av = avatarPollinations(ck, era, gen);
          return `
            <div style="padding:6px;background:${fundo};border-radius:4px;text-align:center">
              <img src="${av}" loading="lazy" alt="${label}" style="width:100%;aspect-ratio:1;border-radius:6px;object-fit:cover;margin-bottom:4px;background:rgba(0,0,0,0.30)">
              <strong>${label}</strong><br><span style="font-size:10px">${escapeHtml(descricao || "")}</span>
            </div>`;
        };
        return `
        <div class="card-info" style="margin:8px 0;padding:14px;border-left:4px solid ${cor};${especial ? "background:rgba(255,193,7,0.08);" : ""}">
          <div style="display:flex;align-items:flex-start;gap:10px">
            <div style="font-size:32px">${c.emoji}</div>
            <div style="flex:1">
              <strong style="font-size:15px">${escapeHtml(c.nome)}${c.ordem_financiamento === 1 ? " ⭐ <small style='color:#7af0ff'>1ª a financiar</small>" : ""}${especial ? " <small style='color:#ffd54f'>ESPECIAL · PoW</small>" : ""}</strong>
              <div style="font-size:13px;color:#4caf50;margin-top:2px">${escapeHtml(c.papel_real)}</div>
              <p style="font-size:12px;color:var(--hint);margin-top:6px;line-height:1.5">${escapeHtml(c.descricao)}</p>
              <div style="font-size:11px;color:var(--hint);margin-top:6px"><strong>KPI:</strong> ${escapeHtml(c.kpi_principal || "—")}</div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:8px;font-size:11px">
                ${renderEra("passado",  "rgba(140,90,200,0.10)", "🏰 Passado",  c.visual_passado)}
                ${renderEra("presente", "rgba(13,114,62,0.10)",  "🌍 Presente", c.visual_presente)}
                ${renderEra("futuro",   "rgba(38,124,180,0.10)", "🚀 Futuro",   c.visual_futuro)}
              </div>
              <button class="btn-primary" style="margin-top:10px;background:rgba(13,114,62,0.55);font-size:12px;padding:6px 12px"
                      onclick="assumirClasse('${c.classe}', '${escapeHtml(c.nome).replace(/'/g, "&#39;")}')">
                ⚡ ${tr("classes_assumir")}
              </button>
            </div>
          </div>
        </div>`;
      }).join("")}`;
  } catch (e) { cont.innerHTML = `<p style="color:#f44">Erro: ${e.message}</p>`; }
};
window.assumirClasse = async function(classe, nome) {
  if (!confirm(`Você quer assumir a classe ${nome}?\n\nVai aparecer no seu perfil e te qualifica pra ser financiado pelo hub na Fase 2.`)) return;
  try {
    const r = await VSSupabase.rpc("assumir_classe", { p_classe: classe });
    const d = Array.isArray(r) ? r[0] : r;
    if (d?.ok) alert(`✓ Você é ${nome} agora!`);
    else alert("Erro: " + (d?.erro || "?"));
  } catch (e) { alert("Erro: " + (e.message || e)); }
};

window.abrirCopaHubs = async function() {
  showScreen("copa-hubs");
  const cont = document.getElementById("copa-hubs-conteudo");
  cont.innerHTML = "<div class='loading' style='padding:30px;text-align:center'>Calculando ranking…</div>";
  try {
    const lista = await sb("v_copa_hubs?select=*&limit=30");
    if (!lista?.length) { cont.innerHTML = "<p class='subtitle'>" + tr("copa_sem_hub") + "</p>"; return; }
    const tierEmoji = { sementinha: "🌱", crescendo: "🌿", robusto: "🌳", massa: "🏔️" };
    cont.innerHTML = `
      <div class="card-info" style="background:rgba(255,193,7,0.10);border:1px solid rgba(255,193,7,0.40);font-size:13px;line-height:1.5">
        <strong>📊 ${tr("copa_como_pontua")}</strong>
        <div style="margin-top:6px">
          🏃 <strong>Atividade</strong> (50%) — movimentos do caixa últimos 30d<br>
          🛡️ <strong>Sustentabilidade</strong> (40%) — caixa cobre quantos meses de custos<br>
          🚀 <strong>Garra</strong> (10%×5) — propostas executadas em 30d, peso ALTO
        </div>
      </div>
      <div id="copa-embaixadores"></div>
      ${lista.map((h, i) => {
        const medalha = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}º`;
        const cor = i === 0 ? "#ffd54f" : i === 1 ? "#cccccc" : i === 2 ? "#cd7f32" : "#888";
        return `
        <div class="card-info" style="margin:8px 0;padding:14px;border-left:4px solid ${cor}">
          <div style="display:flex;align-items:flex-start;gap:10px">
            <div style="font-size:32px;width:48px;text-align:center">${medalha}</div>
            <div style="flex:1">
              <strong>${escapeHtml(h.nome)}</strong>
              <div style="font-size:12px;color:var(--hint);margin-top:2px">
                ${tierEmoji[h.tier] || "🏘️"} ${escapeHtml(h.cidade || "")}/${escapeHtml(h.estado || "")} · ${h.membros} membros
              </div>
              <div style="display:flex;gap:12px;margin-top:8px;font-size:12px">
                <span>🏃 <strong>${h.atividade_30d}</strong> mov</span>
                <span>🛡️ <strong>${h.sustentabilidade}</strong>/100</span>
                <span>🚀 <strong>${h.projetos_executados_30d}</strong> projetos</span>
              </div>
            </div>
            <div style="text-align:right">
              <div style="font-size:11px;color:var(--hint)">SCORE</div>
              <strong style="font-size:24px;color:${cor};text-shadow:0 0 8px ${cor}66">${h.score_copa}</strong>
            </div>
          </div>
        </div>`;
      }).join("")}`;
    // Top embaixadores
    try {
      const emb = await sb("v_top_embaixadores?select=*&total_convites=gt.0&limit=10");
      const div = document.getElementById("copa-embaixadores");
      if (emb?.length && div) {
        div.innerHTML = `
          <h3 style="margin-top:18px;font-size:14px">🌟 ${tr("copa_top_emb")}</h3>
          ${emb.map((e, i) => {
            const cor = i === 0 ? "#ffd54f" : i === 1 ? "#cccccc" : i === 2 ? "#cd7f32" : "#888";
            const med = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}º`;
            return `
            <div class="card-info" style="margin:6px 0;padding:10px;display:flex;align-items:center;gap:10px;border-left:3px solid ${cor}">
              <div style="width:36px;text-align:center;font-weight:800;color:${cor}">${med}</div>
              <div style="font-size:24px">${e.rank_emoji}</div>
              <div style="flex:1">
                <strong style="font-size:13px">${escapeHtml(e.email || "anônimo")}</strong>
                <div style="font-size:11px;color:var(--hint)">${escapeHtml(e.rank_titulo)} · código <code>${e.codigo}</code></div>
              </div>
              <div style="text-align:right">
                <div style="font-size:18px;font-weight:800;color:#4caf50">${e.total_convites}</div>
                <small style="color:var(--hint)">convites</small>
              </div>
            </div>`;
          }).join("")}
          <div class="card-info" style="margin-top:10px;background:rgba(255,193,7,0.08);font-size:12px">
            <strong>Títulos:</strong> 🌱 Iniciante (1+) · ⭐ Influenciador (5+) · 👑 Embaixador (20+) · 🏆 Lendário (50+)
          </div>`;
      }
    } catch {}
  } catch (e) { cont.innerHTML = `<p style="color:#f44">Erro: ${e.message}</p>`; }
};

window.abrirPropostasHub = async function() {
  showScreen("hub-propostas");
  const sub = document.getElementById("hub-prop-subtitle");
  const cont = document.getElementById("hub-prop-conteudo");
  cont.innerHTML = "<div class='loading' style='padding:30px;text-align:center'>…</div>";
  try {
    const [hubR, propR] = await Promise.all([
      VSSupabase.rpc("meu_hub"),
      VSSupabase.rpc("propostas_meu_hub"),
    ]);
    const h = Array.isArray(hubR) ? hubR[0] : hubR;
    const p = Array.isArray(propR) ? propR[0] : propR;
    if (!h?.tem_hub) { sub.textContent = tr("prop_precisa_hub"); cont.innerHTML = ""; return; }
    sub.textContent = `${h.nome} · ${h.membros_total} membros · 💰 ${VSWallet.formatarSulis(h.caixa_sulis)} no caixa`;
    const reserva = h.reserva_seguranca_sulis || 0;
    const disp = h.projetos_disponivel_sulis || 0;
    const props = p?.propostas || [];
    const emVotacao = props.filter(x => x.status === 'em_votacao');
    const fechadas = props.filter(x => x.status !== 'em_votacao').slice(0, 10);

    cont.innerHTML = `
      <div class="card-info" style="background:rgba(38,124,180,0.12);border:1px solid rgba(110,200,255,0.30)">
        <div style="font-size:13px">🗳️ <strong>${tr("prop_disponivel")}</strong> <span style="color:#4caf50;font-weight:700">${VSWallet.formatarSulis(disp)}</span></div>
        <div style="font-size:11px;color:var(--hint);margin-top:4px">
          🛡️ Reservado pra 1 mês de custos (link/energia): <strong>${VSWallet.formatarSulis(reserva)}</strong>. Não pode ser usado em projetos.
        </div>
      </div>
      <button class="btn-primary" style="width:100%;margin-top:12px;background:rgba(13,114,62,0.65)" onclick="abrirCriarProposta()">➕ ${tr("prop_nova")}</button>

      <h3 style="margin-top:18px;font-size:14px">📋 ${tr("prop_em_votacao")} (${emVotacao.length})</h3>
      ${emVotacao.length ? emVotacao.map(p => _renderPropostaCard(p, h)).join("") :
        "<p class='subtitle'>" + tr("prop_nenhuma") + "</p>"}

      ${fechadas.length ? `<h3 style="margin-top:18px;font-size:14px">📜 ${tr("prop_historico")}</h3>${fechadas.map(p => _renderPropostaCard(p, h)).join("")}` : ""}
      <button class="btn-primary" style="width:100%;margin-top:14px;background:rgba(120,120,120,0.4)" onclick="abrirMeuHub()">↩ ${tr("prop_voltar_hub")}</button>`;
  } catch (e) { cont.innerHTML = `<p style="color:#f44">Erro: ${e.message}</p>`; }
};

function _renderPropostaCard(p, h) {
  const corStatus = {
    em_votacao: "#ffd54f", aprovada: "#4caf50", executada: "#7af0ff",
    rejeitada: "#ff7043", expirada: "#888"
  }[p.status] || "#ccc";
  const total = (p.votos_sim || 0) + (p.votos_nao || 0);
  const pctSim = total ? Math.round(100 * p.votos_sim / total) : 0;
  const minimoSim = Math.max(1, Math.ceil((h.membros_total || 1) * 0.5) + 1);
  const ehVotacao = p.status === "em_votacao";
  const meuVotoTxt = p.meu_voto === true ? "✅ você votou SIM" :
                    p.meu_voto === false ? "❌ você votou NÃO" : "";
  return `
    <div class="card-info" style="margin:8px 0;border-left:3px solid ${corStatus}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <strong>${escapeHtml(p.titulo)}</strong>
        <span style="font-size:11px;color:${corStatus};font-weight:700;text-transform:uppercase">${p.status.replace("_"," ")}</span>
      </div>
      ${p.descricao ? `<p style="font-size:13px;margin-top:4px;color:var(--hint)">${escapeHtml(p.descricao)}</p>` : ""}
      <div style="font-size:13px;color:#ffd54f;margin-top:6px">💰 ${tr("prop_custo")}: ${VSWallet.formatarSulis(p.custo_sulis)}</div>
      <div style="margin-top:8px;display:flex;gap:10px;font-size:13px">
        <span>👍 <strong>${p.votos_sim}</strong></span>
        <span>👎 <strong>${p.votos_nao}</strong></span>
        <span style="color:var(--hint);flex:1;text-align:right;font-size:11px">precisa ${minimoSim} sim · prazo ${new Date(p.prazo_em).toLocaleDateString("pt-BR")}</span>
      </div>
      ${total ? `<div style="margin-top:6px;height:4px;background:rgba(255,255,255,0.10);border-radius:2px;overflow:hidden"><div style="width:${pctSim}%;height:100%;background:#4caf50;transition:width .4s"></div></div>` : ""}
      ${meuVotoTxt ? `<div style="margin-top:6px;font-size:11px;color:var(--hint)">${meuVotoTxt}</div>` : ""}
      ${ehVotacao && !p.sou_autor ? `
        <div style="display:flex;gap:6px;margin-top:10px">
          <button class="btn-primary" style="flex:1;background:rgba(13,114,62,0.65);font-size:12px;padding:6px" onclick="votarProposta('${p.id}', true)">👍 ${tr("voto_sim")}</button>
          <button class="btn-primary" style="flex:1;background:rgba(229,57,53,0.50);font-size:12px;padding:6px" onclick="votarProposta('${p.id}', false)">👎 ${tr("voto_nao")}</button>
        </div>` : ""}
      ${ehVotacao && p.sou_autor ? `<div style="margin-top:8px;font-size:11px;color:var(--hint)">${tr("prop_sou_autor")}</div>` : ""}
    </div>`;
}

window.votarProposta = async function(id, voto) {
  try {
    const r = await VSSupabase.rpc("votar_proposta_hub", { p_id: id, p_voto: voto });
    const d = Array.isArray(r) ? r[0] : r;
    if (d?.ok) abrirPropostasHub();
    else alert("Erro: " + (d?.erro || "?"));
  } catch (e) { alert("Erro: " + (e.message || e)); }
};

window.abrirCriarProposta = function() {
  const titulo = prompt(tr("prop_prompt_titulo"));
  if (!titulo || titulo.trim().length < 5) return alert("Título muito curto.");
  const descricao = prompt(tr("prop_prompt_desc")) || "";
  const custoTxt = prompt(tr("prop_prompt_custo"));
  const custo = parseInt(custoTxt, 10);
  if (!Number.isFinite(custo) || custo < 1) return alert(tr("prop_custo_invalido"));
  const prazo = parseInt(prompt(tr("prop_prompt_prazo")) || "7", 10);
  (async () => {
    try {
      const r = await VSSupabase.rpc("criar_proposta_hub", {
        p_titulo: titulo.trim(), p_descricao: descricao.trim(),
        p_custo_sulis: custo, p_prazo_dias: prazo
      });
      const d = Array.isArray(r) ? r[0] : r;
      if (d?.ok) { alert(tr("prop_criada")); abrirPropostasHub(); }
      else if (d?.erro === "excede_disponivel_com_reserva") {
        alert(`Custo (${custo}) excede o disponível (${d.disponivel}). Reserva de segurança: ${d.reserva_seguranca}.`);
      } else alert("Erro: " + (d?.erro || "?"));
    } catch (e) { alert("Erro: " + (e.message || e)); }
  })();
};

window.entrarHub = async function(hubId) {
  if (!confirm(tr("hub_entrar_confirm"))) return;
  try {
    const r = await VSSupabase.rpc("entrar_hub", { p_hub_id: hubId });
    const d = Array.isArray(r) ? r[0] : r;
    if (d?.ok) {
      alert(tr("hub_bemvindo"));
      abrirMeuHub();
    } else {
      alert("Erro: " + (d?.erro || "?"));
    }
  } catch (e) { alert("Erro: " + (e.message || e)); }
};

// ─────────────────────────────────────────────────────────────
// 🎴 Card visual de conquista — gera PNG 1080×1080 pra postar no Insta/feed
// ─────────────────────────────────────────────────────────────
function _loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
function _drawCover(ctx, img, w, h) {
  const ir = img.width / img.height, cr = w / h;
  let sx, sy, sw, sh;
  if (ir > cr) {
    sh = img.height; sw = sh * cr;
    sx = (img.width - sw) / 2; sy = 0;
  } else {
    sw = img.width; sh = sw / cr;
    sx = 0; sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}
function _wrapText(ctx, text, x, y, maxW, lineH) {
  const words = String(text).split(" ");
  let line = "";
  let curY = y;
  const lines = [];
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line); line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  // Desenha de baixo pra cima
  const start = curY - (lines.length - 1) * lineH;
  lines.forEach((l, i) => ctx.fillText(l, x, start + i * lineH));
  return lines.length;
}

/**
 * Gera card de conquista 1080x1080.
 * @param {object} opts { titulo, subtitulo, fotoUrl, refCode, refUrl }
 * @returns {Promise<Blob>} PNG
 */
async function gerarCardConquista({ titulo, subtitulo, fotoUrl, refUrl }) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1080;
  const ctx = canvas.getContext("2d");

  // Fundo: foto do lugar OU degradê azul-marinho
  if (fotoUrl) {
    try {
      const img = await _loadImg(fotoUrl);
      _drawCover(ctx, img, 1080, 1080);
    } catch {
      ctx.fillStyle = "#0d4f76"; ctx.fillRect(0, 0, 1080, 1080);
    }
  } else {
    const g = ctx.createLinearGradient(0, 0, 1080, 1080);
    g.addColorStop(0, "#1ea7e8"); g.addColorStop(1, "#0a3a5a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1080);
  }

  // Overlay escuro no rodapé (legibilidade)
  const grad = ctx.createLinearGradient(0, 0, 0, 1080);
  grad.addColorStop(0, "rgba(0,0,0,0.15)");
  grad.addColorStop(0.5, "rgba(0,0,0,0.35)");
  grad.addColorStop(1, "rgba(0,0,0,0.92)");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 1080, 1080);

  // Logo no topo
  ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 12;
  ctx.font = "bold 56px -apple-system, system-ui, sans-serif";
  ctx.fillStyle = "#7af0ff";
  ctx.fillText("✦ Vento Sul", 60, 110);
  ctx.font = "30px -apple-system, system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(tr("card_descubra"), 60, 158);

  // Título principal
  ctx.font = "bold 90px -apple-system, system-ui, sans-serif";
  ctx.fillStyle = "#fff";
  ctx.shadowBlur = 14;
  _wrapText(ctx, titulo || "Vento Sul", 60, 820, 720, 100);

  // Subtítulo
  if (subtitulo) {
    ctx.font = "44px -apple-system, system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.shadowBlur = 8;
    ctx.fillText(subtitulo, 60, 900);
  }

  // Faixa de URL no rodapé
  ctx.font = "bold 36px -apple-system, system-ui, sans-serif";
  ctx.fillStyle = "#ffd54f";
  ctx.shadowBlur = 8;
  ctx.fillText("vento-sul.tech", 60, 1010);

  // Selo de tier no canto superior direito (Diamante/Ouro/Prata)
  try {
    const sd = await carregarScoreHonestidade(false);
    const tier = sd?.tier;
    if (tier && tier.multiplicador > 1) {
      const corTier = tier.multiplicador >= 1.3 ? "#7af0ff" : tier.multiplicador >= 1.2 ? "#ffd54f" : "#cccccc";
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath(); ctx.arc(990, 90, 60, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = corTier;
      ctx.font = "bold 64px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(tier.emoji || "💎", 990, 90);
      ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";
    }
  } catch {}

  // QR no canto direito inferior (fundo branco)
  if (refUrl) {
    try {
      const qr = await _loadImg(`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=2&data=${encodeURIComponent(refUrl)}`);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff";
      ctx.fillRect(810, 810, 230, 230);
      ctx.drawImage(qr, 815, 815, 220, 220);
    } catch {}
  }

  return await new Promise(res => canvas.toBlob(res, "image/png", 0.95));
}

window.compartilharCardConquista = async function(opts) {
  // opts: { titulo, subtitulo, fotoUrl }
  const c = window._meuConvite;
  let refUrl = c?.url;
  if (!refUrl) {
    try {
      const r = await VSSupabase.rpc("meu_codigo_indicacao");
      const d = Array.isArray(r) ? r[0] : r;
      if (d?.ok) { window._meuConvite = d; refUrl = d.url; }
    } catch {}
  }
  const blob = await gerarCardConquista({ ...opts, refUrl });
  if (!blob) return alert(tr("card_falha"));
  const file = new File([blob], "vento-sul-conquista.png", { type: "image/png" });
  // Tenta share nativo com arquivo
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "Vento Sul", text: `${opts.titulo} · vento-sul.tech` }); return; } catch {}
  }
  // Fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "vento-sul-conquista.png";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  alert(tr("card_baixado"));
};

// ─────────────────────────────────────────────────────────────
// 💬 Mensageria via sulis — 1 sulis = 1 recado curto pro amigo
// ─────────────────────────────────────────────────────────────
window.abrirMensagemSulis = function() {
  let modal = document.getElementById("modal-msg-sulis");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-msg-sulis";
    modal.className = "modal-bg zone-comercial";
    modal.innerHTML = `
      <div class="modal" style="max-width:480px">
        <h3 style="display:inline-flex;align-items:center;gap:8px">${VSIcons.svg("message", 20)} ${tr("msg_recado_titulo")}</h3>
        <p style="font-size:13px;color:var(--zc-hint);margin:6px 0 12px;line-height:1.45">
          Manda <strong>1 sulis + uma mensagem</strong> pro seu amigo. Custa quase nada e a mensagem fica registrada no histórico dele. Tipo Pix de carinho.
        </p>
        <label>${tr("msg_email_amigo")}</label>
        <input id="msg-email" type="email" placeholder="amigo@exemplo.com">
        <label>${tr("msg_label_mensagem")}</label>
        <textarea id="msg-texto" maxlength="200" rows="3" placeholder="${tr("msg_placeholder")}" style="font-family:inherit;resize:vertical"></textarea>
        <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
          <label style="font-size:12px;color:var(--zc-hint);flex:1">Custo: <strong style="color:var(--zc-accent);font-variant-numeric:tabular-nums" id="msg-custo">1 sulis</strong></label>
          <input id="msg-sulis" type="number" min="1" value="1" style="width:80px;padding:6px">
        </div>
        <small style="display:block;font-size:11px;color:var(--zc-hint);margin-top:4px">${tr("msg_aumenta")}</small>
        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn-primary mc-btn" style="flex:1" onclick="document.getElementById('modal-msg-sulis').style.display='none'">Cancelar</button>
          <button class="btn-primary" style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px" onclick="enviarRecadoSulis()">${VSIcons.svg("send", 14)} ${tr("msg_mandar")}</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById("msg-sulis")?.addEventListener("input", (e) => {
      const v = parseInt(e.target.value, 10) || 1;
      const el = document.getElementById("msg-custo");
      if (el) el.textContent = `${v} sulis (R$ ${(v/100).toFixed(2)})`;
    });
  }
  modal.style.display = "flex";
};

window.enviarRecadoSulis = async function() {
  const email = document.getElementById("msg-email").value.trim();
  const texto = document.getElementById("msg-texto").value.trim();
  const sulis = Math.max(1, parseInt(document.getElementById("msg-sulis").value, 10) || 1);
  if (!email.includes("@")) return alert("Email inválido");
  if (!texto) return alert(tr("msg_vazia"));
  if (texto.length > 200) return alert(tr("msg_longa"));

  const w = await VSWallet.myWallet();
  if ((w?.saldo_livre_sulis || 0) < sulis) {
    return alert(`Saldo insuficiente. Precisa de ${sulis} sulis, você tem ${w?.saldo_livre_sulis || 0}.`);
  }
  if (!confirm(`Enviar ${sulis} sulis + mensagem pra ${email}?\n\n"${texto}"`)) return;
  try {
    await VSWallet.transferirPorEmail({ email, sulis, mensagem: texto });
    alert(`✓ Recado enviado pra ${email}!`);
    document.getElementById("modal-msg-sulis").style.display = "none";
    document.getElementById("msg-texto").value = "";
    abrirWallet();
  } catch (e) {
    alert("Erro: " + (e.message || e));
  }
};

// Botão: gera card da CIDADE atual
window.cardCidadeAtual = async function() {
  if (!state?.cidade) return alert(tr("card_escolhe_cidade"));
  // Pega foto principal da cidade
  let fotoUrl = null;
  try {
    const fotos = await sb(`fotos_locais?select=url&cidade=eq.${enc(state.cidade)}&estado=eq.${enc(state.estado)}&ativo=eq.true&order=ordem.asc&limit=1`);
    fotoUrl = fotos?.[0]?.url;
  } catch {}
  await compartilharCardConquista({
    titulo: state.cidade,
    subtitulo: state.estado,
    fotoUrl
  });
};

window.persRecuperar = async function() {
  const email = document.getElementById("pers-recuperar-email").value.trim();
  if (!email.includes("@")) return alert("Email inválido");
  try {
    await VSSupabase.recoverPassword(email);
    // Avança pra etapa 2 (entrada de código)
    document.getElementById("pers-rec-step1").style.display = "none";
    document.getElementById("pers-rec-step2").style.display = "block";
    document.getElementById("pers-rec-email-mostra").textContent = email;
    document.getElementById("pers-rec-codigo").focus();
  } catch (e) {
    alert("Erro: " + (e.message || e));
  }
};

window.persConfirmarOtp = async function() {
  const email = document.getElementById("pers-recuperar-email").value.trim();
  const codigo = document.getElementById("pers-rec-codigo").value.trim().replace(/\s/g, "");
  const novaSenha = document.getElementById("pers-rec-nova-senha").value;
  if (!/^\d{6}$/.test(codigo)) return alert(tr("pers_digite_codigo"));
  if (novaSenha.length < 6) return alert(tr("pers_senha_min"));
  try {
    // 1. Verifica OTP (recovery type)
    const sb = window.VSSupabaseClient || window._supa;
    if (!sb) throw new Error("Supabase não pronto");
    const { error: e1 } = await sb.auth.verifyOtp({ email, token: codigo, type: "recovery" });
    if (e1) throw e1;
    // 2. Define nova senha
    const { error: e2 } = await sb.auth.updateUser({ password: novaSenha });
    if (e2) throw e2;
    alert(tr("pers_senha_trocada"));
    document.getElementById("modal-persistencia").style.display = "none";
    location.reload();
  } catch (e) {
    alert(tr("pers_codigo_invalido") + (e.message || e));
  }
};

window.persSair = async function() {
  if (!confirm(tr("pers_sair_confirma"))) return;
  await VSSupabase.signOut();
  document.getElementById("modal-persistencia").style.display = "none";
  location.reload();
};

window.persExcluirConta = async function() {
  if (!confirm(tr("pers_excluir_confirma1"))) return;
  if (!confirm(tr("pers_excluir_confirma2"))) return;
  try {
    await VSSupabase.excluirContaLGPD();
    alert(tr("pers_conta_excluida"));
    document.getElementById("modal-persistencia").style.display = "none";
    location.reload();
  } catch (e) {
    alert(tr("pers_erro_excluir") + (e.message || e));
  }
};

// Wire-up
document.getElementById("btn-persistencia")?.addEventListener("click", abrirPersistencia);
document.querySelectorAll(".pers-tab").forEach(b =>
  b.addEventListener("click", () => persTab(b.dataset.tab)));

// ─────────────────────────────────────────────────────────────
// 🎫 Assinatura do user (R$1/mês, R$10/ano OU missões sociais)
// ─────────────────────────────────────────────────────────────
async function atualizarStatusAssinatura() {
  const div = document.getElementById("assin-status");
  if (!div) return;
  try {
    const r = await VSSupabase.rpc("minha_assinatura");
    const d = Array.isArray(r) ? r[0] : r;
    if (!d?.ok) { div.textContent = tr("assin_acesso_gratuito"); return; }
    if (d.ativa) {
      const dias = d.dias_restante;
      const modoTxt = d.modo === "missao_social" ? "via missões 🎯"
                    : d.modo === "anual_pago" ? "anual 🌟"
                    : d.modo === "mensal_pago" ? "mensal 🪙" : "";
      div.innerHTML = `✓ <strong style="color:#4caf50">Assinatura ativa</strong> ${modoTxt} · ${dias} dia${dias===1?"":"s"} restante${dias===1?"":"s"}`;
    } else {
      div.textContent = "Acesso gratuito hoje. Em breve, escolha um plano:";
    }
  } catch {}
}
// ── Sliders de alocação: usuário direciona onde seu dinheiro vai
window._alocEntrada = {
  prop_radio: 33, prop_jogo: 33, prop_redes: 34,
  prem_missoes: 40, prem_quests: 40, prem_video: 20
};

window._alocAjustar = function(grupo, campo, val) {
  const g = window._alocEntrada;
  const outros = grupo === 'prop'
    ? ['prop_radio','prop_jogo','prop_redes'].filter(k => k !== campo)
    : ['prem_missoes','prem_quests','prem_video'].filter(k => k !== campo);
  g[campo] = Math.max(15, Math.min(70, val));
  const resta = 100 - g[campo];
  const somaOutros = g[outros[0]] + g[outros[1]];
  if (somaOutros > 0) {
    g[outros[0]] = Math.max(15, Math.round(resta * g[outros[0]] / somaOutros));
    g[outros[1]] = 100 - g[campo] - g[outros[0]];
    if (g[outros[1]] < 15) { g[outros[1]] = 15; g[outros[0]] = 100 - g[campo] - 15; }
    if (g[outros[0]] < 15) { g[outros[0]] = 15; g[outros[1]] = 100 - g[campo] - 15; }
  }
  // Atualiza todos os sliders do grupo na tela
  document.querySelectorAll('[data-aloc-grupo="' + grupo + '"]').forEach(el => {
    const k = el.dataset.alocCampo;
    if (!k) return;
    el.value = g[k];
    const lbl = el.closest('.aloc-row')?.querySelector('.aloc-pct');
    if (lbl) lbl.textContent = g[k] + '%';
  });
};

window.pagarEntrada = async function(modo) {
  // Carrega preferências salvas
  try {
    const ar = await VSSupabase.rpc('minha_alocacao');
    const ad = Array.isArray(ar) ? ar[0] : ar;
    if (ad?.ok) {
      window._alocEntrada = {
        prop_radio: ad.propaganda.radio, prop_jogo: ad.propaganda.jogo, prop_redes: ad.propaganda.redes,
        prem_missoes: ad.premios.missoes, prem_quests: ad.premios.quests, prem_video: ad.premios.video
      };
    }
  } catch {}

  const g = window._alocEntrada;
  const txt = modo === 'anual' ? 'R$ 10 (1 ano)' : 'R$ 1 (1 mês)';

  let m = document.getElementById('modal-alocacao-entrada');
  if (!m) {
    m = document.createElement('div');
    m.id = 'modal-alocacao-entrada';
    m.className = 'modal-bg';
    document.body.appendChild(m);
  }

  const blocos = [
    { grupo: 'prop', titulo: '📣 Propaganda', campos: [
      { key: 'prop_radio',  label: '📻 Rádio Vento Sul' },
      { key: 'prop_jogo',   label: '✨ Jogo Aurora' },
      { key: 'prop_redes',  label: '📱 Redes sociais' },
    ]},
    { grupo: 'prem', titulo: '🎯 Prêmios pra usuários', campos: [
      { key: 'prem_missoes', label: '🗺️ Missões sociais' },
      { key: 'prem_quests',  label: '⚔️ Quests Aurora' },
      { key: 'prem_video',   label: '🎬 Assistir vídeo' },
    ]},
  ];

  m.innerHTML = '<div class="modal" style="max-width:460px;max-height:92vh;overflow-y:auto">'
    + '<h3 style="margin:0 0 4px">🌊 ' + tr("assin_assinar") + ' ' + txt + '</h3>'
    + '<p style="font-size:12px;color:var(--hint);margin:0 0 14px">' + tr("assin_direcione") + '</p>'
    + blocos.map(b =>
        '<div style="margin-bottom:14px;padding:10px;background:rgba(255,255,255,0.05);border-radius:10px">'
        + '<div style="font-size:12px;font-weight:600;color:var(--hint);margin-bottom:8px">' + b.titulo + '</div>'
        + b.campos.map(c =>
            '<div class="aloc-row" style="display:flex;align-items:center;gap:6px;margin-bottom:7px">'
            + '<div style="width:140px;font-size:12px">' + c.label + '</div>'
            + '<span class="aloc-pct" style="width:34px;text-align:right;font-weight:bold;color:#ffd54f;font-size:13px">' + g[c.key] + '%</span>'
            + '<input type="range" data-aloc-grupo="' + b.grupo + '" data-aloc-campo="' + c.key + '"'
            + ' min="15" max="70" value="' + g[c.key] + '"'
            + ' style="flex:1;accent-color:#ffd54f"'
            + ' oninput="window._alocAjustar(\'' + b.grupo + '\',\'' + c.key + '\',+this.value)">'
            + '</div>'
          ).join('')
        + '</div>'
      ).join('')
    + '<div style="display:flex;gap:8px;margin-top:16px">'
    + '<button class="btn-secondary" style="flex:1" onclick="document.getElementById(\'modal-alocacao-entrada\').style.display=\'none\'">' + tr("cancelar") + '</button>'
    + '<button class="btn-primary" style="flex:2;background:rgba(76,175,80,0.6)" id="btn-confirmar-entrada">✓ ' + tr("confirmar_pagar") + '</button>'
    + '</div>'
    + '<p style="font-size:11px;color:var(--hint);text-align:center;margin-top:8px">' + tr("assin_simulado") + '</p>'
    + '</div>';

  document.getElementById('btn-confirmar-entrada').onclick = async () => {
    const g2 = window._alocEntrada;
    const btn = document.getElementById('btn-confirmar-entrada');
    btn.textContent = tr("salvando_btn"); btn.disabled = true;
    try {
      await VSSupabase.rpc('setar_alocacao_preferencias', {
        p_propaganda_radio: g2.prop_radio,
        p_propaganda_jogo: g2.prop_jogo,
        p_propaganda_redes_sociais: g2.prop_redes,
        p_premios_missoes_sociais: g2.prem_missoes,
        p_premios_quests_jogo: g2.prem_quests,
        p_premios_assistir_video: g2.prem_video,
      });
      const r = await VSSupabase.rpc('pagar_entrada_user', { p_modo: modo });
      const d = Array.isArray(r) ? r[0] : r;
      document.getElementById('modal-alocacao-entrada').style.display = 'none';
      if (d?.ok) {
        alert('✓ Assinatura ativa por ' + d.dias_creditados + ' dias!\nPreferências salvas 🌊');
        atualizarStatusAssinatura();
      } else {
        alert('Erro: ' + (d?.erro || 'tente de novo'));
      }
    } catch (e) {
      alert('Erro: ' + (e.message || e));
    } finally {
      if (btn) { btn.textContent = '✓ Confirmar & Pagar'; btn.disabled = false; }
    }
  };

  m.style.display = 'flex';
};

window.abrirMissoesSociais = async function() {
  const modal = document.getElementById("modal-missoes");
  const lista = document.getElementById("missoes-lista");
  lista.innerHTML = "<div class='loading'>" + tr("carregando_missoes") + "</div>";
  modal.style.display = "flex";
  const ehFds = _ehFimDeSemana();
  try {
    // Usa RPC que filtra por tier do user (Diamante vê tudo + missões secretas)
    let missoes = [];
    let tierUser = "bronze";
    try {
      const rr = await VSSupabase.rpc("listar_missoes_disponiveis");
      const dd = Array.isArray(rr) ? rr[0] : rr;
      if (dd?.ok) { missoes = dd.missoes || []; tierUser = dd.tier; }
    } catch {}
    if (!missoes.length) {
      // fallback: lista plain
      missoes = await sb("missoes_sociais?select=*&ativa=eq.true&order=ordem.asc");
    }
    if (!missoes.length) { lista.innerHTML = "<p>" + tr("missoes_sem_ativas") + "</p>"; return; }
    // Agrupa por rede
    const grupos = {
      whatsapp: { nome: "📱 WhatsApp & Telegram", redes: ["whatsapp", "telegram"] },
      sociais:  { nome: "🌐 " + tr("missoes_grupo_sociais"),       redes: ["facebook", "instagram", "tiktok", "kwai", "twitter", "threads", "bluesky", "youtube", "snapchat", "linkedin"] },
      forum:    { nome: "💬 " + tr("missoes_grupo_forum"), redes: ["reddit", "pinterest", "discord", "email"] },
      app:      { nome: "🎮 " + tr("missoes_grupo_app"), redes: ["aurora", "caca", "indicacao", "review"] },
    };
    let html = `<p style="font-size:12px;color:var(--hint);margin:-4px 0 14px;line-height:1.45">
      ${tr("missoes_intro")}
    </p>`;
    if (ehFds) {
      html += `<div style="margin:0 0 12px;padding:10px 12px;background:linear-gradient(135deg,rgba(255,87,34,0.20),rgba(255,193,7,0.15));border:1px solid rgba(255,87,34,0.55);border-radius:8px;font-size:13px;font-weight:700;color:#ffd54f">${tr("missoes_fds_banner")}</div>`;
    }
    for (const [key, grupo] of Object.entries(grupos)) {
      const itens = missoes.filter(m => grupo.redes.includes(m.rede));
      if (!itens.length) continue;
      html += `<h4 style="margin:14px 0 6px;font-size:13px;opacity:0.85">${grupo.nome}</h4>`;
      html += itens.map(m => `
        <div class="card-info" style="margin:6px 0;padding:10px">
          <div style="display:flex;align-items:flex-start;gap:10px">
            <div style="font-size:22px">${m.emoji}</div>
            <div style="flex:1">
              <strong style="font-size:13px">${escapeHtml(m.titulo)}</strong>
              <div style="font-size:11px;color:var(--hint);margin-top:2px;line-height:1.35">${escapeHtml(m.descricao || "")}</div>
              <div style="font-size:12px;color:#4caf50;margin-top:4px">+ ${m.dias_recompensa} dia${m.dias_recompensa===1?"":"s"} grátis</div>
            </div>
            <button class="btn-primary" style="background:rgba(38,124,180,0.65);font-size:11px;padding:6px 10px;height:fit-content"
                    onclick='cumprirMissao(${JSON.stringify(m).replace(/'/g, "&#39;")})'>
              ${tr("missoes_fazer")} →
            </button>
          </div>
        </div>`).join("");
    }
    lista.innerHTML = html;
  } catch (e) { lista.innerHTML = `<p style="color:#f44">Erro: ${e.message}</p>`; }
};

window.cumprirMissao = async function(missao) {
  // missao: { codigo, titulo, link_template, rede, ... }
  const link = "https://www.vento-sul.tech";
  const texto = tr("missoes_share_texto");
  const titulo = tr("missoes_share_titulo");
  // Se há template de link, abre direto na rede certa
  if (missao.link_template) {
    const url = missao.link_template
      .replace("{url}",   encodeURIComponent(link))
      .replace("{text}",  encodeURIComponent(`${texto} ${link}`))
      .replace("{title}", encodeURIComponent(titulo));
    window.open(url, "_blank");
  } else if (navigator.share) {
    // Sem template (Instagram/TikTok/etc): tenta share nativo
    try { await navigator.share({ title: titulo, text: texto, url: link }); }
    catch { /* cancelou */ }
  } else {
    // Fallback: copia o link
    navigator.clipboard?.writeText(link);
    alert(tr("missoes_link_copiado"));
  }
  if (!confirm(`Você completou "${missao.titulo}"? Confirma com sinceridade — vamos creditar ${missao.dias_recompensa} dias grátis.`)) return;
  try {
    const r = await VSSupabase.rpc("completar_missao_social", { p_codigo: missao.codigo });
    const d = Array.isArray(r) ? r[0] : r;
    if (d?.ok) {
      alert(`✓ + ${d.dias_creditados} dias grátis adicionados! Combinando 2-3 missões/semana = acesso grátis pra sempre.`);
      atualizarStatusAssinatura();
      abrirMissoesSociais();  // refresh
    } else if (d?.erro === "em_cooldown") {
      const lib = new Date(d.liberado_em).toLocaleString("pt-BR");
      alert(`Você já fez essa missão recentemente. Liberado novamente em: ${lib}`);
    } else {
      alert("Erro: " + (d?.erro || "tente de novo"));
    }
  } catch (e) { alert("Erro: " + (e.message || e)); }
};

// ─────────────────────────────────────────────────────────────
// 🏆 Propaganda anual rotativa na Landing — vantagens dos planos pagos
// ─────────────────────────────────────────────────────────────
const PROPAGANDAS_ANUAL = [
  "Banner Fixo Landing por R$ 5.000/ano = sai a R$ 13/dia. Todo mundo que abre o app vê primeiro.",
  "Carrossel Tela Inicial anual: 10 mil visualizações estimadas/mês × 12 meses, fixo R$ 2.500.",
  "Trilha Caça ao Tesouro: clientes vêm até você fisicamente pra ganhar SulCoins. R$ 1.000/ano.",
  "Carrossel Cidade anual R$ 800: aparece todo dia pra quem está naquela cidade.",
  "Geolocalização anual R$ 50 (sai R$ 4,17/mês): sua barraca SEMPRE no mapa.",
  "Plano anual = 2 meses grátis. Pagamento misto: dinheiro + até 50% em sulis.",
  "🎁 PROMO da semana: indique 3 amigos = R$ 100 de desconto no plano anual.",
  "🔥 FIM DE SEMANA 2× sulis: cada missão social rende DOBRO de dias grátis sex/sab/dom.",
  "📊 Comerciante: você vê quantas pessoas pediram rota até sua barraca em tempo real."
];

// Multiplicador de fim de semana — visual na propaganda
function _ehFimDeSemana() {
  const d = new Date().getDay();
  return d === 5 || d === 6 || d === 0;  // sexta, sábado, domingo
}
let _propIdx = 0;
function rotarPropaganda() {
  const div = document.getElementById("prop-anual-rot");
  if (!div) return;
  div.style.opacity = 0;
  setTimeout(() => {
    div.textContent = PROPAGANDAS_ANUAL[_propIdx % PROPAGANDAS_ANUAL.length];
    _propIdx++;
    div.style.transition = "opacity .6s";
    div.style.opacity = 1;
  }, 350);
}
function iniciarPropagandaAnual() {
  const div = document.getElementById("propaganda-anual");
  if (!div) return;
  div.style.display = "block";
  rotarPropaganda();
  setInterval(rotarPropaganda, 6500);
}

// Carrossel Landing — puxa comerciantes com plano carrossel ativo
async function popularCarrosselLanding() {
  const el = document.getElementById("carousel-landing");
  if (!el) return;
  try {
    const agoraISO = new Date().toISOString();
    const compras = await sb(`v_minhas_compras_servicos?select=barraca_id,plano_codigo,termina_em,barraca_nome,cidade,estado&plano_codigo=in.(carrossel_landing,carrossel_landing_anual,banner_landing,banner_landing_anual)&termina_em=gt.${agoraISO}&ativo=eq.true&limit=20`).catch(() => []);
    if (!compras.length) {
      // Fallback: simulações + atrações épicas pra a Landing não ficar vazia
      return;
    }
    const fotos = [];
    for (const c of compras) {
      const b = await sb(`feira_barracas?id=eq.${c.barraca_id}&select=nome,categoria,telhado_url,cidade`).catch(() => []);
      if (b?.[0]?.telhado_url) {
        fotos.push({
          foto_url: b[0].telhado_url,
          titulo: b[0].nome,
          subtitulo: `${b[0].categoria || ""} · ${b[0].cidade || ""}`
        });
      }
    }
    if (fotos.length && window.VSCarousel) {
      const c = VSCarousel.criar(el, { fotos, intervaloMs: 7000, modo: "fade" });
      c.iniciar();
    }
  } catch (e) { console.warn("[carrossel landing pago]", e); }
}

// ─────────────────────────────────────────────────────────────
// 🏆 Banner Topo — carrossel rotativo de anunciantes
// Cada anunciante tem tempo_exibicao_seg próprio do plano dele:
//   5s = entrada · 7s = intermediário · 10s = premium
// Rotação ordena por tempo (premium primeiro) e respeita duração de cada slide.
// ─────────────────────────────────────────────────────────────
let _bannerTopoTimer = null;
let _bannerTopoIdx = 0;
let _bannerTopoSlides = [];

async function carregarBannerTopo() {
  try {
    const arr = await sb("v_banner_topo_ativos?select=*&limit=20").catch(() => []);
    _bannerTopoSlides = (arr || []).filter(s => s.foto_url || s.barraca_nome);
    if (!_bannerTopoSlides.length) {
      const div = document.getElementById("banner-topo");
      if (div) div.style.display = "none";
      return;
    }
    document.getElementById("banner-topo").style.display = "block";
    _bannerTopoIdx = 0;
    rotarBannerTopo();
  } catch (e) {
    console.warn("[banner topo]", e.message);
  }
}

function rotarBannerTopo() {
  if (!_bannerTopoSlides.length) return;
  const slide = _bannerTopoSlides[_bannerTopoIdx % _bannerTopoSlides.length];
  const bg = document.getElementById("banner-topo-slide");
  const titulo = document.getElementById("banner-topo-titulo");
  if (!bg || !titulo) return;
  if (slide.foto_url) bg.style.backgroundImage = `url('${escapeHtml(slide.foto_url)}')`;
  else bg.style.backgroundImage = "linear-gradient(135deg,#1a4f76,#0a1828)";
  bg.style.opacity = "0.85";
  titulo.innerHTML = `
    <strong style="font-size:14px;display:block">${escapeHtml(slide.barraca_nome || "")}</strong>
    <small style="opacity:0.85">${escapeHtml(slide.cidade || "")}/${escapeHtml(slide.estado || "")}</small>
  `;
  // Tempo deste slide específico (default 5s)
  const seg = Math.max(3, Math.min(15, slide.tempo_exibicao_seg || 5));
  if (_bannerTopoTimer) clearTimeout(_bannerTopoTimer);
  _bannerTopoTimer = setTimeout(() => {
    _bannerTopoIdx++;
    rotarBannerTopo();
  }, seg * 1000);
}

// Bootstrap quando Landing aparecer
function bootLanding() {
  iniciarPropagandaAnual();
  atualizarStatusAssinatura();
  popularCarrosselLanding();
  carregarBannerTopo();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => setTimeout(bootLanding, 800));
} else {
  setTimeout(bootLanding, 800);
}

// ─────────────────────────────────────────────────────────────
// 📻 Sotaque regional — Litorânea fala como gente da terra
// ─────────────────────────────────────────────────────────────
const SOTAQUES = {
  "Rio Grande do Sul": {
    saudacao:        "Bah, tchê! Tudo redondo?",
    estadoQ:         "Bah, fala teu estado: Paraná, Santa Catarina ou Rio Grande do Sul?",
    estadoRepete:    "Não captei, vivente. Repete o estado: Paraná, Santa Catarina ou Rio Grande do Sul?",
    cidadeQ:         (e) => `Bem boa, ${e}! Agora me diz a cidade ou o local, tchê.`,
    cidadeRepete:    (e) => `Não peguei, vivente. Fala de novo, é uma cidade do ${e}.`,
    confirmar:       (c, e) => `Então é ${c}, no ${e}. Fechou, tchê?`,
    indo:            (c) => `Bah, indo pra ${c}. Já pega o chimarrão!`,
    semCidade:       (e) => `Não consegui pegar a cidade no ${e}, vivente. Tenta de novo daqui a pouco.`,
    despedir:        "Tchau, tchê. Fica na paz, vivente.",
  },
  "Santa Catarina": {
    saudacao:        "Oi, barriga-verde! Bão demais!",
    estadoQ:         "Fala o estado, parça: Paraná, Santa Catarina ou Rio Grande do Sul?",
    estadoRepete:    "Não peguei. Fala de novo: Paraná, Santa Catarina ou Rio Grande do Sul?",
    cidadeQ:         (e) => `Massa, ${e}! Agora me fala a cidade ou o lugar.`,
    cidadeRepete:    (e) => `Não captei a cidade. Fala de novo, é uma cidade do ${e}.`,
    confirmar:       (c, e) => `Então é ${c}, no ${e}, fechou?`,
    indo:            (c) => `Bem boa! Indo pra ${c}, vamo nessa!`,
    semCidade:       (e) => `Não achei a cidade no ${e}. A gente tenta de novo depois.`,
    despedir:        "Valeu, fica gente boa!",
  },
  "Paraná": {
    saudacao:        "E aí, parça! Tri legal te ver por aqui!",
    estadoQ:         "Fala o estado, mano: Paraná, Santa Catarina ou Rio Grande do Sul?",
    estadoRepete:    "Mó loco, não peguei. Repete: Paraná, Santa Catarina ou Rio Grande do Sul?",
    cidadeQ:         (e) => `Tri massa, ${e}! Agora me fala a cidade ou o local.`,
    cidadeRepete:    (e) => `Não captei a cidade. Fala de novo, é uma cidade do ${e}.`,
    confirmar:       (c, e) => `Então é ${c}, no ${e}, mó tri, fechou?`,
    indo:            (c) => `Tri legal, indo pra ${c}, prepara o pinhão!`,
    semCidade:       (e) => `Não achei a cidade no ${e}, mano. A gente vê de novo depois.`,
    despedir:        "Vlw, fica de boa!",
  },
};
function sotaqueDe(estado) {
  return SOTAQUES[estado] || SOTAQUES["Rio Grande do Sul"];
}

// Resolve estado a partir de fala livre. Cobre apelidos/erros do STT.
function resolverEstadoFalado(texto) {
  const t = String(texto || "").toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return null;
  // Paraná
  if (/\b(parana|paranaense|paran|pr)\b/.test(t)) return "Paraná";
  // Santa Catarina
  if (/\b(santa catarina|catarina|catarinense|barriga verde|sc)\b/.test(t)) return "Santa Catarina";
  // Rio Grande do Sul
  if (/\b(rio grande do sul|rio grande|gaucho|gaucha|rs|sul)\b/.test(t)) return "Rio Grande do Sul";
  return null;
}

// resolverCidade restrito a um estado (usa shared/cidades.js mas filtra)
function resolverCidadeNoEstado(texto, estado) {
  if (!texto || !estado) return null;
  const r = VSCidades.resolverCidade(texto);
  if (r && r.estado === estado) return r;
  // Fuzzy curto contra cidades do estado quando o resolver global não acertou
  const t = String(texto).toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return null;
  const cidades = VSCidades.cidadesDe(estado);
  for (const c of cidades) {
    const n = c.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (t.includes(n)) return { cidade: c, estado };
  }
  return null;
}

// Fala uma frase via TTS e resolve quando termina (ou após timeout de segurança)
async function falarEEsperar(texto, fallbackMs = 6000) {
  // Voz fluida via VSFalar (radio-tts → XTTS → web). Fallback Web Speech direto.
  if (window.VSFalar?.falar) {
    try { await window.VSFalar.falar(texto); return; } catch {}
  }
  return new Promise(resolve => {
    if (!("speechSynthesis" in window)) { resolve(); return; }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = "pt-BR";
      u.rate = 1.0; u.pitch = 1.05; u.volume = 1.0;
      let done = false;
      const fim = () => { if (!done) { done = true; resolve(); } };
      u.onend = fim;
      u.onerror = fim;
      window.speechSynthesis.speak(u);
      setTimeout(fim, Math.max(fallbackMs, texto.length * 70));
    } catch { resolve(); }
  });
}

// Onboarding TTS — só na 1ª vez que ela é "acordada" pelo long-press
async function _intoFalarOnboarding() {
  const FLAG = "vs_lit_intro_falada";
  if (localStorage.getItem(FLAG) === "1") return;
  await falarEEsperar(
    "Oi! Meu nome é Litorânea. Eu moro aqui no app Vento Sul. Sou como uma ajudante no seu bolso. Quando quiser falar comigo, é só apertar no meu ícone aqui embaixo."
  );
  try { localStorage.setItem(FLAG, "1"); } catch {}
}

// Fluxo guiado: estado → cidade → confirma → navega
let _localizacaoGuiadaAtiva = false;
async function iniciarLocalizacaoGuiada() {
  if (_localizacaoGuiadaAtiva) return;
  _localizacaoGuiadaAtiva = true;
  const btn = document.getElementById("bb-litoranea");
  const setListening = (on) => btn?.classList.toggle("lit-listen", !!on);
  try {
    await _intoFalarOnboarding();

    // Passo 1 — estado (até 2 tentativas) — usa o sotaque do estado atual ou padrão
    let estado = null;
    let sot = sotaqueDe(state?.estado);  // padrão
    for (let i = 0; i < 2 && !estado; i++) {
      await falarEEsperar(i === 0 ? sot.estadoQ : sot.estadoRepete);
      setListening(true);
      const r = await VSLitoranea.ouvir();
      setListening(false);
      if (r.texto) estado = resolverEstadoFalado(r.texto);
    }
    if (!estado) {
      await falarEEsperar(sot.despedir);
      _localizacaoGuiadaAtiva = false;
      return;
    }
    // Atualiza sotaque pro estado descoberto
    sot = sotaqueDe(estado);

    // Passo 2 — cidade dentro do estado (até 2 tentativas)
    let cidade = null;
    for (let i = 0; i < 2 && !cidade; i++) {
      await falarEEsperar(i === 0 ? sot.cidadeQ(estado) : sot.cidadeRepete(estado));
      setListening(true);
      const r = await VSLitoranea.ouvir();
      setListening(false);
      if (r.texto) {
        const m = resolverCidadeNoEstado(r.texto, estado);
        if (m) cidade = m.cidade;
      }
    }
    if (!cidade) {
      await falarEEsperar(sot.semCidade(estado));
      _localizacaoGuiadaAtiva = false;
      return;
    }

    // Passo 3 — confirma
    await falarEEsperar(sot.confirmar(cidade, estado));
    setListening(true);
    const conf = await VSLitoranea.ouvir();
    setListening(false);
    if (conf.texto && VSLitoranea.disseNao && VSLitoranea.disseNao(conf.texto)) {
      await falarEEsperar("Beleza, deixa eu tentar de novo.");
      _localizacaoGuiadaAtiva = false;
      return iniciarLocalizacaoGuiada();
    }

    // Aceita: navega pra cidade
    state.estado = estado;
    state.cidade = cidade;
    try { savePrefs(); } catch {}
    try { VSPraias?.limparCache?.(); } catch {}
    await falarEEsperar(sot.indo(cidade));
    if (typeof abrirCidade === "function") abrirCidade();
  } catch (e) {
    console.warn("[Litorânea guiada]", e?.message || e);
  } finally {
    _localizacaoGuiadaAtiva = false;
  }
}

document.querySelectorAll(".action-btn").forEach(b => b.addEventListener("click", () => {
  const a = b.dataset.acao;
  if (a === "feira") abrirFeira();
  else if (a === "mais_votados") abrirVotados();
  else if (a === "promocoes") abrirPromos();
  else if (a === "caca") abrirCaca();
  else if (a === "trilhas") abrirCaca();
  else if (a === "comercio_pro") window.location.href = "/comerciante-templates.html";
  else if (a === "coletiva") abrirColetiva();
  else if (a === "praias") abrirPraias();
  else if (a === "wallet") abrirWallet();
  else if (a === "aurora") abrirAurora();
}));

// ─────────────────────────────────────────────────────────────
// AURORA — aventura RPG (passado/presente/futuro + classes)
// ─────────────────────────────────────────────────────────────
const AURORA_TITULOS = {
  passado:  "📜 Era Medieval-Steampunk — caminhos antigos do Sul",
  presente: "🌳 Era Atual — Sul vivo, diverso e conectado",
  futuro:   "🌌 Era Cyber — cidades flutuantes e neon"
};
const AURORA_CLASSE_EMOJI = {
  desbravador: "🗺️", guerreiro: "💪", mago: "🔮", alquimista: "⚗️",
  sabio: "📜", forjador: "⚒️", watcher: "👁️"
};
const AURORA_NARRATIVAS = {
  passado: {
    guerreiro:  "Em 1750, no caminho dos tropeiros, uma emboscada te cerca em Lapa. Você saca a espada…",
    mago:       "A bruma da Serra do Mar te chama. Em Antonina, um livro tropeiro guarda runas perdidas.",
    alquimista: "Em Morretes, o cataio amarga uma poção que cura febre amarela — você redescobre a fórmula.",
    bardo:      "Você canta numa estalagem em Paranaguá. Marinheiros pagam em pratas e segredos do mar.",
    arqueiro:   "Numa caçada na Mata Atlântica, você rastreia uma anta que só os Carijós conhecem.",
    destemido:  "Vento Sul te leva pra batalha contra invasores. Sua coragem vira lenda em Laguna.",
    forjador:   "Numa forja gaúcha, você martela o aço da resistência farroupilha.",
    ciber:      "Algo errado: como um ciber chegou em 1750? O paradoxo te lança a próxima era…"
  },
  presente: {
    guerreiro:  "Sua missão hoje: defender uma comunidade de pescadores em Pântano do Sul de uma construtora gananciosa.",
    mago:       "A Aurora te guia ao Mirante do Morro da Cruz — leia a cidade pelas luzes da noite.",
    alquimista: "Em Pomerode, ajude o cervejeiro a aperfeiçoar a fórmula do chope artesanal.",
    bardo:      "O carnaval de Antonina te chama. Toque na rua e ganhe SulCoins por cada música nova.",
    arqueiro:   "Curitiba abre o concurso de tiro com arco no Parque Barigui — mire alto.",
    destemido:  "Surfe na Joaquina exige coragem. As ondas hoje estão a 3 metros.",
    forjador:   "Em Garibaldi, vinhedos novos pedem ferramentas customizadas. Forje uma poda perfeita.",
    ciber:      "Você programa um app que ajuda turistas — exatamente isso! Esse aqui."
  },
  futuro: {
    guerreiro:  "Ano 2099. Você defende Floripa-Flutuante contra drones invasores. SulCoin = munição.",
    mago:       "A Litorânea Quântica conjura ondas que carregam cidades. Você é o feiticeiro do mar.",
    alquimista: "Em Curitiba-Nuvem você sintetiza energia do vento sul em compostos curativos.",
    bardo:      "Música holográfica em Pomerode-Vertical. Sua voz vira vibração que reconecta o povo.",
    arqueiro:   "Em arcos plasmáticos, você caça poluição visual — neon que escapou da regulação.",
    destemido:  "Salto livre da Cataratas-Suspensa: 800m no rio futurista do Iguaçu.",
    forjador:   "Você forja chips de SulCoin direto na lava do Vulcão de Urubici reativado.",
    ciber:      "Você É o futuro. Conecta-se ao OS Litorânea e roda missões em paralelo."
  }
};

let _aurora = { era: "passado", classe: null, passos: 0, fasesCompletas: 0 };
// Restaura progresso salvo
try {
  const saved = JSON.parse(localStorage.getItem("vs_aurora_progresso") || "{}");
  _aurora.fasesCompletas = saved.fasesCompletas || 0;
} catch {}
function _salvarAurora() {
  try { localStorage.setItem("vs_aurora_progresso", JSON.stringify({ fasesCompletas: _aurora.fasesCompletas })); } catch {}
}

// ─────────────────────────────────────────────────────────────
// 🗺️ Mapa do Espelho da Alma (3 estados + malha de hubs nas 3 eras)
// ─────────────────────────────────────────────────────────────
const MAPA_HUBS = [
  // {nome, lat, lng, estado}
  { n: "Foz do Iguaçu",    lat: -25.55, lng: -54.59, e: "PR" },
  { n: "São Miguel Missões", lat: -28.55, lng: -54.55, e: "RS" },
  { n: "Curitiba",         lat: -25.43, lng: -49.27, e: "PR" },
  { n: "Antonina",         lat: -25.43, lng: -48.71, e: "PR" },
  { n: "Lapa",             lat: -25.77, lng: -49.72, e: "PR" },
  { n: "Joinville",        lat: -26.30, lng: -48.85, e: "SC" },
  { n: "Blumenau",         lat: -26.92, lng: -49.07, e: "SC" },
  { n: "BC",               lat: -26.99, lng: -48.63, e: "SC" },
  { n: "Bombinhas",        lat: -27.15, lng: -48.48, e: "SC" },
  { n: "Florianópolis",    lat: -27.59, lng: -48.55, e: "SC" },
  { n: "Urubici",          lat: -28.01, lng: -49.59, e: "SC" },
  { n: "São Joaquim",      lat: -28.30, lng: -49.93, e: "SC" },
  { n: "Cambará Sul",      lat: -29.05, lng: -50.15, e: "RS" },
  { n: "Torres",           lat: -29.34, lng: -49.73, e: "RS" },
  { n: "Gramado",          lat: -29.38, lng: -50.88, e: "RS" },
  { n: "Bento Gonçalves",  lat: -29.17, lng: -51.52, e: "RS" },
  { n: "Porto Alegre",     lat: -30.03, lng: -51.23, e: "RS" },
  { n: "Pelotas",          lat: -31.77, lng: -52.34, e: "RS" },
];
function _projetar(lat, lng) {
  // Bounding box: lat [-22, -33.5], lng [-57, -48]
  const x = ((lng + 57) / 9) * 700 + 50;
  const y = ((lat + 22) / -11.5) * 440 + 30;
  return { x, y };
}
function _temasMapa(era) {
  return ({
    passado: { fundo: "#1a1208", costa: "#5a3a1a", terra: "#3a2a14", linha: "rgba(220,170,90,0.55)",
               hub: "#ffd54f", brilho: "#ff9800", titulo: "#ffd54f", gota: "🏰", vinheta: "rgba(60,30,10,0.6)",
               areiaBase: "#c9a062", areiaClara: "#f0d099", areiaEscura: "#7a4a18", labelEstado: "#fff5d0" },
    presente: { fundo: "#0a1828", costa: "#1a4f76", terra: "#1f3a4f", linha: "rgba(110,200,255,0.55)",
               hub: "#7af0ff", brilho: "#1ea7e8", titulo: "#7af0ff", gota: "📍", vinheta: "rgba(0,20,40,0.55)",
               areiaBase: "#c9a062", areiaClara: "#f0d099", areiaEscura: "#7a4a18", labelEstado: "#e8f9ff" },
    futuro:   { fundo: "#080018", costa: "#3a2050", terra: "#1a0a30", linha: "rgba(255,80,200,0.55)",
               hub: "#ff60d0", brilho: "#aa00ff", titulo: "#ff60d0", gota: "🛸", vinheta: "rgba(20,0,40,0.65)",
               areiaBase: "#c9a062", areiaClara: "#f0d099", areiaEscura: "#7a4a18", labelEstado: "#ffe0ff" }
  })[era] || ({});
}
function renderMapaEspelho(era) {
  const div = document.getElementById("aurora-mapa-fundo");
  if (!div) return;
  const t = _temasMapa(era);
  // Malha: liga cada hub aos 3 mais próximos
  const projetados = MAPA_HUBS.map(h => ({ ...h, ..._projetar(h.lat, h.lng) }));
  const linhas = [];
  for (let i = 0; i < projetados.length; i++) {
    const a = projetados[i];
    const dists = projetados.map((b, j) => ({ j, d: i === j ? Infinity : Math.hypot(a.x - b.x, a.y - b.y) }))
      .sort((x, y) => x.d - y.d).slice(0, 3);
    dists.forEach(d => {
      if (d.j > i) linhas.push({ a: i, b: d.j });
    });
  }
  // Costa litorânea (curva ondulada do nordeste do PR ao sul do RS)
  const costaPath = `M 720 30 Q 730 100 715 180 Q 705 250 700 320 Q 690 390 660 470`;
  // Estados borders simplificados (apenas pra dar volume)
  const prPath  = `M 50 30 L 720 30 L 700 110 L 720 180 L 580 220 L 50 200 Z`;
  const scPath  = `M 580 220 L 720 180 L 700 320 L 470 320 L 50 200 Z M 50 200 L 470 320 L 50 320 Z`;
  const rsPath  = `M 50 320 L 470 320 L 700 320 L 690 390 L 660 470 L 50 470 Z`;

  div.innerHTML = `
    <svg viewBox="0 0 800 500" width="100%" height="240" preserveAspectRatio="xMidYMid meet" style="display:block;border-radius:12px;background:${t.fundo}">
      <defs>
        <radialGradient id="m-vinheta" cx="50%" cy="50%" r="80%">
          <stop offset="60%" stop-color="rgba(0,0,0,0)"/>
          <stop offset="100%" stop-color="${t.vinheta}"/>
        </radialGradient>
        <linearGradient id="m-mar" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="${t.costa}" stop-opacity="0.10"/>
          <stop offset="100%" stop-color="${t.costa}" stop-opacity="0.50"/>
        </linearGradient>
        <filter id="m-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <!-- Textura de deserto (areia, dunas, grãos) -->
        <pattern id="m-deserto" x="0" y="0" width="64" height="64" patternUnits="userSpaceOnUse">
          <rect width="64" height="64" fill="${t.areiaBase}"/>
          <path d="M 0 28 Q 16 20 32 28 T 64 28" stroke="${t.areiaEscura}" stroke-width="1.2" fill="none" opacity="0.55"/>
          <path d="M 0 50 Q 16 42 32 50 T 64 50" stroke="${t.areiaEscura}" stroke-width="0.9" fill="none" opacity="0.45"/>
          <path d="M 0 12 Q 16 6 32 12 T 64 12" stroke="${t.areiaClara}" stroke-width="0.8" fill="none" opacity="0.55"/>
          <circle cx="8"  cy="10" r="0.9" fill="${t.areiaEscura}" opacity="0.7"/>
          <circle cx="22" cy="6"  r="0.7" fill="${t.areiaClara}"  opacity="0.8"/>
          <circle cx="40" cy="14" r="0.8" fill="${t.areiaEscura}" opacity="0.6"/>
          <circle cx="55" cy="8"  r="0.6" fill="${t.areiaClara}"  opacity="0.7"/>
          <circle cx="14" cy="34" r="0.9" fill="${t.areiaEscura}" opacity="0.65"/>
          <circle cx="28" cy="40" r="0.7" fill="${t.areiaClara}"  opacity="0.75"/>
          <circle cx="46" cy="36" r="0.8" fill="${t.areiaEscura}" opacity="0.6"/>
          <circle cx="58" cy="44" r="0.6" fill="${t.areiaClara}"  opacity="0.7"/>
          <circle cx="6"  cy="58" r="0.8" fill="${t.areiaEscura}" opacity="0.6"/>
          <circle cx="20" cy="56" r="0.6" fill="${t.areiaClara}"  opacity="0.7"/>
          <circle cx="36" cy="60" r="0.7" fill="${t.areiaEscura}" opacity="0.65"/>
          <circle cx="52" cy="58" r="0.9" fill="${t.areiaClara}"  opacity="0.7"/>
        </pattern>
      </defs>
      <!-- TEXTURA DE DESERTO cobrindo o mapa inteiro (camada base) -->
      <rect x="0" y="0" width="800" height="500" fill="url(#m-deserto)"/>
      <!-- Mar por cima da textura no lado direito -->
      <rect x="0" y="0" width="800" height="500" fill="url(#m-mar)"/>
      <!-- Estados em silhueta POR CIMA da textura -->
      <path d="${prPath}" fill="${t.terra}" stroke="${t.costa}" stroke-width="1.2" opacity="0.55"/>
      <path d="${scPath}" fill="${t.terra}" stroke="${t.costa}" stroke-width="1.2" opacity="0.60"/>
      <path d="${rsPath}" fill="${t.terra}" stroke="${t.costa}" stroke-width="1.2" opacity="0.55"/>
      <!-- Costa marítima (linha mais grossa onde toca o oceano) -->
      <path d="${costaPath}" stroke="${t.costa}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.85"/>
      <!-- Ondas suaves do mar -->
      <g opacity="0.35" stroke="${t.costa}" stroke-width="1" fill="none">
        ${[60, 120, 200, 280, 360, 440].map(y =>
          `<path d="M 720 ${y} q 10 6 20 0 t 20 0 t 20 0 t 20 0"/>`
        ).join("")}
      </g>
      <!-- Malha de conexões -->
      <g stroke="${t.linha}" stroke-width="0.9" opacity="0.7">
        ${linhas.map(({a, b}) => {
          const A = projetados[a], B = projetados[b];
          return `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`;
        }).join("")}
      </g>
      <!-- Hubs (todos clicáveis pra drill-down via Leaflet) -->
      <g filter="url(#m-glow)">
        ${projetados.map(p => {
          const slug = String(p.n).toLowerCase()
            .normalize("NFD").replace(/[̀-ͯ]/g,"")
            .replace(/[^a-z0-9]/g,"");
          return `
          <g class="hub-clic" data-hub-id="${slug}" style="cursor:zoom-in">
            <circle cx="${p.x}" cy="${p.y}" r="11" fill="${t.hub}" opacity="0.001"/>
            <circle cx="${p.x}" cy="${p.y}" r="5" fill="${t.hub}" stroke="${t.brilho}" stroke-width="1.5"/>
            <circle cx="${p.x}" cy="${p.y}" r="9" fill="${t.hub}" opacity="0.18"/>
          </g>`;
        }).join("")}
      </g>
      <!-- Nome dos hubs principais -->
      <g font-size="9" font-family="sans-serif" fill="${t.titulo}" opacity="0.85">
        ${projetados.filter((_, i) => i % 2 === 0).map(p =>
          `<text x="${p.x + 8}" y="${p.y + 3}">${p.n}</text>`).join("")}
      </g>
      <!-- Marcas dos estados POR CIMA da textura (no centro de cada um) -->
      <g font-family="sans-serif" font-weight="900" text-anchor="middle" pointer-events="none" style="letter-spacing:4px">
        <text x="320" y="135" font-size="56" fill="${t.labelEstado}" opacity="0.30"
              stroke="${t.areiaEscura}" stroke-width="2" paint-order="stroke">PR</text>
        <text x="300" y="285" font-size="46" fill="${t.labelEstado}" opacity="0.30"
              stroke="${t.areiaEscura}" stroke-width="2" paint-order="stroke">SC</text>
        <text x="320" y="420" font-size="60" fill="${t.labelEstado}" opacity="0.30"
              stroke="${t.areiaEscura}" stroke-width="2" paint-order="stroke">RS</text>
      </g>
      <!-- Vinheta cinematográfica -->
      <rect x="0" y="0" width="800" height="500" fill="url(#m-vinheta)" pointer-events="none"/>
      <!-- Selo da era -->
      <text x="780" y="495" text-anchor="end" font-size="10" fill="${t.titulo}" opacity="0.6" font-family="sans-serif">
        ${({passado: "🏰 era do passado", presente: "🌍 era do presente", futuro: "🚀 era do futuro"})[era] || ""}
      </text>
    </svg>`;
}

async function abrirAurora() {
  // Tela do jogo Aurora unificada em /aurora-jogo.html — qualquer chamada redireciona.
  location.href = "/aurora-jogo.html";
}

// ─────────────────────────────────────────────────────────────
// 🌍 CIDADE PÚBLICA (#cidade/<slug>)
// ─────────────────────────────────────────────────────────────
let _cpLeaflet = null;

function _slugCidade(s) {
  return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");
}
function _deslugCidade(slug) {
  // Tenta achar a cidade real no cache, fallback usa slug
  try {
    const all = (window.VENTOSUL_CONFIG?.CIDADES) || {};
    for (const est of Object.values(all)) {
      for (const c of est) if (_slugCidade(c) === slug) return c;
    }
  } catch {}
  return slug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

// Busca a melhor foto REAL (hospedada, não-pollinations) do banco pra usar como hero.
// Sólido: foto Wikimedia hospedada, sem geração on-demand que morre. Retorna URL ou null.
async function heroFotoReal(cidade, sublocal) {
  if (!cidade) return null;
  const base = `fotos_locais?select=url&ativo=eq.true&url=not.like.*pollinations*&cidade=eq.${enc(cidade)}`;
  try {
    if (sublocal) {
      const r = await sb(`${base}&sublocal=eq.${enc(sublocal)}&order=likes.desc&limit=1`).catch(() => []);
      if (r && r[0] && r[0].url) return r[0].url;
    }
    const r2 = await sb(`${base}&order=likes.desc,vezes_exibida.asc&limit=1`).catch(() => []);
    return (r2 && r2[0] && r2[0].url) ? r2[0].url : null;
  } catch { return null; }
}

window.abrirCidadePublica = async function(slugOuNome) {
  showScreen("cidade-publica");
  const cidadeNome = _deslugCidade(slugOuNome);
  // Reset
  document.getElementById("cp-titulo").textContent = cidadeNome;
  document.getElementById("cp-descricao").textContent = tr("carregando");
  document.getElementById("cp-info-blocks").innerHTML = "";
  document.getElementById("cp-ofertas").innerHTML = "";
  document.getElementById("cp-quests").innerHTML = "";
  document.getElementById("cp-npcs").innerHTML = "";
  document.getElementById("cp-link-painel").href = `#painel/${encodeURIComponent(cidadeNome)}`;
  // Hero bg — foto REAL do banco (sólido), gradiente CSS fica de fallback se não houver
  heroFotoReal(cidadeNome).then(u => {
    if (u) document.getElementById("cp-hero-bg").style.backgroundImage = `url('${u}')`;
  });
  _setMetaCidade(cidadeNome);

  // Info da cidade
  let info = null;
  try {
    const arr = await sb(`cidades_info?cidade=eq.${encodeURIComponent(cidadeNome)}&select=*&limit=1`).catch(() => []);
    info = Array.isArray(arr) ? arr[0] : null;
  } catch {}

  if (info) {
    document.getElementById("cp-descricao").textContent = info.descricao || "—";
    const blocks = [];
    if (info.comida_nativa) blocks.push(["🍴 Comida típica", info.comida_nativa]);
    if (info.gastronomia?.length) blocks.push(["🥘 Gastronomia", info.gastronomia.join(", ")]);
    if (info.festas?.length) blocks.push(["🎉 Festas", info.festas.join(", ")]);
    if (info.aniversario) blocks.push(["📅 Aniversário", info.aniversario]);
    if (info.populacao) blocks.push(["👥 População", info.populacao.toLocaleString("pt-BR")]);
    if (info.tel_turismo) blocks.push(["☎️ Turismo", info.tel_turismo]);
    document.getElementById("cp-info-blocks").innerHTML = blocks.map(([l, v]) => `
      <div class="card-info" style="padding:10px">
        <small style="color:var(--hint);font-size:11px">${l}</small>
        <div style="font-size:13px;font-weight:600;margin-top:2px">${escapeHtml(String(v))}</div>
      </div>`).join("");
  } else {
    document.getElementById("cp-descricao").textContent = `${cidadeNome} faz parte do Sul. Ainda não temos descrição rica — em breve a Litorânea preenche.`;
  }

  // Mapa
  if (typeof L !== "undefined" && info?.lat && info?.lng) {
    if (_cpLeaflet) { try { _cpLeaflet.remove(); } catch {} }
    _cpLeaflet = L.map("cp-mapa-leaflet", { zoomControl: true, attributionControl: false });
    _cpLeaflet.setView([info.lat, info.lng], 12);
    L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", { maxZoom: 17, subdomains: "abc" }).addTo(_cpLeaflet);
    L.marker([info.lat, info.lng]).addTo(_cpLeaflet).bindPopup(`<strong>${escapeHtml(cidadeNome)}</strong>`);
  }

  // Ofertas
  try {
    const ofs = await sb(`ofertas?cidade=eq.${encodeURIComponent(cidadeNome)}&ativo=eq.true&select=produto,preco,preco_normal,categoria&limit=8`).catch(() => []);
    document.getElementById("cp-ofertas").innerHTML = (ofs || []).length === 0
      ? `<p style="color:var(--hint);font-size:12px;grid-column:1/-1;padding:10px">${tr("cp_sem_ofertas")}</p>`
      : ofs.map(o => `
          <div class="card-info" style="padding:10px">
            <small style="color:var(--hint)">${escapeHtml(o.categoria||"")}</small>
            <div style="font-weight:700;font-size:13px;margin:2px 0">${escapeHtml(o.produto)}</div>
            <strong style="color:#4caf50">R$ ${Number(o.preco).toFixed(2)}</strong>
            ${o.preco_normal ? `<small style="text-decoration:line-through;color:var(--hint);margin-left:6px">R$ ${Number(o.preco_normal).toFixed(2)}</small>` : ""}
          </div>`).join("");
  } catch {}

  // Quests
  try {
    const qs = await sb(`v_quests_mapa?cidade=eq.${encodeURIComponent(cidadeNome)}&select=*&limit=6`).catch(() => []);
    document.getElementById("cp-quests").innerHTML = (qs || []).length === 0
      ? `<p style="color:var(--hint);font-size:12px;grid-column:1/-1;padding:10px">${tr("cp_sem_quests")} <a href="#quests" style="color:#7af0ff">Crie a primeira</a>.</p>`
      : qs.map(q => `
          <div class="card-info" style="padding:10px;cursor:pointer" onclick="abrirDetalheQuest('${q.id}')">
            <div style="display:flex;align-items:center;gap:8px"><span style="font-size:22px">${q.icon||"🌳"}</span><strong>${escapeHtml(q.titulo)}</strong></div>
            <small style="color:var(--hint)">HP ${q.hp_atual}/${q.hp_inicial} · ${q.participantes} part.</small>
          </div>`).join("");
  } catch {}

  // NPCs locais
  try {
    const ns = await sb(`v_mapa_npcs_publicos?cidade=eq.${encodeURIComponent(cidadeNome)}&select=*&limit=12`).catch(() => []);
    document.getElementById("cp-npcs").innerHTML = (ns || []).length === 0 ? "" : ns.map(n => {
      const ico = ({sabio:"📜",desbravador:"🗺️",mago:"📖",alquimista:"⚗️",guerreiro:"🛡️",forjador:"🔨",watcher:"📷",automata:"🤖",litoranea:"🌊",aurora:"✨"})[n.tipo]||"🧑";
      return `
        <div class="card-info" style="padding:10px;text-align:center">
          <div style="font-size:24px">${ico}</div>
          <strong style="font-size:12px">${escapeHtml(n.nome)}</strong>
          <p style="font-size:10px;color:var(--hint);line-height:1.35;margin:4px 0 0">${escapeHtml(n.dica)}</p>
        </div>`;
    }).join("");
  } catch {}

  // Share button
  document.getElementById("cp-share-btn").onclick = async () => {
    const url = `${location.origin}/#cidade/${_slugCidade(cidadeNome)}`;
    const titulo = `${cidadeNome} no Vento Sul`;
    if (navigator.share) {
      try { await navigator.share({ title: titulo, url }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(url); alert("Link copiado!"); } catch { prompt(tr("copie_link"), url); }
  };
};

function _setMetaCidade(cidade) {
  const titulo = `${cidade} · Vento Sul — guia turístico, ofertas, quests cívicas`;
  const desc = `Tudo sobre ${cidade}: gastronomia, praias, festas, ofertas locais, quests cívicas e personagens da cidade. Vento Sul.`;
  document.title = titulo;
  _setOG("og:title", titulo);
  _setOG("og:description", desc);
  _setOG("og:type", "website");
}

// ─────────────────────────────────────────────────────────────
// 🏘️ BAIRRO PÚBLICO (#bairro/<cidade>/<slug>)
// ─────────────────────────────────────────────────────────────
let _bpLeaflet = null;

window.abrirBairroPublico = async function(cidadeSlug, bairroSlug) {
  showScreen("bairro-publico");
  const cidadeNome = _deslugCidade(cidadeSlug);
  document.getElementById("bp-breadcrumb").innerHTML = `<a href="#cidade/${encodeURIComponent(cidadeSlug)}" style="color:rgba(255,255,255,0.85)">${escapeHtml(cidadeNome)}</a>`;
  document.getElementById("bp-titulo").textContent = bairroSlug;
  document.getElementById("bp-descricao").textContent = "Carregando…";
  document.getElementById("bp-quests").innerHTML = "";
  document.getElementById("bp-comerciantes").innerHTML = "";
  document.getElementById("bp-link-cidade").href = `#cidade/${encodeURIComponent(cidadeSlug)}`;

  // Pega bairro
  let b = null;
  try {
    const arr = await sb(`v_bairros_publicos?cidade=eq.${encodeURIComponent(cidadeNome)}&slug=eq.${encodeURIComponent(bairroSlug)}&limit=1`).catch(() => []);
    b = Array.isArray(arr) ? arr[0] : null;
  } catch {}
  if (!b) {
    document.getElementById("bp-descricao").textContent = `Bairro "${bairroSlug}" não cadastrado.`;
    return;
  }
  document.getElementById("bp-titulo").textContent = b.nome;
  document.getElementById("bp-descricao").textContent = b.descricao || "—";
  heroFotoReal(cidadeNome, b.nome).then(u => {
    if (u) document.getElementById("bp-hero-bg").style.backgroundImage = `url('${u}')`;
  });
  _setMetaBairro(cidadeNome, b.nome);

  // Mapa do bairro
  if (typeof L !== "undefined" && b.lat && b.lng) {
    if (_bpLeaflet) { try { _bpLeaflet.remove(); } catch {} }
    _bpLeaflet = L.map("bp-mapa-leaflet", { zoomControl: true, attributionControl: false });
    _bpLeaflet.setView([b.lat, b.lng], 14);
    L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", { maxZoom: 17, subdomains: "abc" }).addTo(_bpLeaflet);
    L.marker([b.lat, b.lng]).addTo(_bpLeaflet).bindPopup(`<strong>${escapeHtml(b.nome)}</strong>`);
    // Quests dentro do bounding box ~3km
    try {
      const qs = await sb(`v_quests_mapa?select=*&cidade=eq.${encodeURIComponent(cidadeNome)}&limit=80`).catch(() => []);
      const dist = (la1, lo1, la2, lo2) => {
        const R = 6371, toR = x => x*Math.PI/180;
        const dLa = toR(la2-la1), dLo = toR(lo2-lo1);
        const x = Math.sin(dLa/2)**2 + Math.cos(toR(la1))*Math.cos(toR(la2))*Math.sin(dLo/2)**2;
        return 2*R*Math.asin(Math.sqrt(x));
      };
      const perto = (qs || []).filter(q => q.lat && q.lng && dist(b.lat, b.lng, q.lat, q.lng) <= 3);
      for (const q of perto) {
        const cor = q.hp_atual / q.hp_inicial > 0.6 ? "#e53935" : q.hp_atual / q.hp_inicial > 0.3 ? "#ff9800" : "#4caf50";
        L.marker([q.lat, q.lng], {
          icon: L.divIcon({
            html: `<div style="background:${cor};border:2px solid #fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px">${q.icon||"🌳"}</div>`,
            iconSize: [28,28], iconAnchor: [14,14], className: ""
          })
        }).addTo(_bpLeaflet).bindPopup(`<strong>${escapeHtml(q.titulo)}</strong>`);
      }
      document.getElementById("bp-quests").innerHTML = perto.length === 0
        ? `<p style="color:var(--hint);font-size:12px;grid-column:1/-1;padding:10px">${tr("bp_sem_quests")} <a href="#quests" style="color:#7af0ff">Crie a primeira</a>.</p>`
        : perto.slice(0, 4).map(q => `
            <div class="card-info" style="padding:10px;cursor:pointer" onclick="abrirDetalheQuest('${q.id}')">
              <div style="display:flex;align-items:center;gap:8px"><span style="font-size:22px">${q.icon||"🌳"}</span><strong>${escapeHtml(q.titulo)}</strong></div>
              <small style="color:var(--hint)">HP ${q.hp_atual}/${q.hp_inicial}</small>
            </div>`).join("");
    } catch {}
  }

  // Comerciantes — aproveita feira_barracas com cidade
  try {
    const cs = await sb(`feira_barracas?cidade=eq.${encodeURIComponent(cidadeNome)}&select=id,nome,categoria,telhado_url&limit=6`).catch(() => []);
    document.getElementById("bp-comerciantes").innerHTML = (cs || []).length === 0
      ? `<p style="color:var(--hint);font-size:12px;grid-column:1/-1;padding:10px">${tr("bp_sem_barracas")}</p>`
      : cs.map(c => `
          <div class="card-info" style="padding:10px;display:flex;align-items:center;gap:8px">
            <div style="width:40px;height:40px;border-radius:8px;background:${c.telhado_url ? `url('${c.telhado_url}') center/cover` : "rgba(255,255,255,0.06)"};flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
              <strong style="font-size:12px;display:block">${escapeHtml(c.nome)}</strong>
              <small style="color:var(--hint);font-size:10px">${escapeHtml(c.categoria || "")}</small>
            </div>
          </div>`).join("");
  } catch {}
};

function _setMetaBairro(cidade, bairro) {
  const titulo = `${bairro} · ${cidade} · Vento Sul`;
  const desc = `Tudo sobre o bairro ${bairro} de ${cidade}: comércio, ações cívicas, dicas locais.`;
  document.title = titulo;
  _setOG("og:title", titulo);
  _setOG("og:description", desc);
  _setOG("og:type", "website");
}

// ─────────────────────────────────────────────────────────────
// 🏛️ PAINEL MUNICIPAL PÚBLICO (#painel/<cidade>)
// ─────────────────────────────────────────────────────────────
let _pcLeaflet = null;

window.abrirPainelCidade = async function(cidade) {
  showScreen("painel-cidade");
  // Reset
  document.getElementById("pc-titulo").textContent = decodeURIComponent(cidade || "");
  document.getElementById("pc-breadcrumb").textContent = tr("pc_breadcrumb");
  document.getElementById("pc-descricao").textContent = tr("carregando_dados");
  document.getElementById("pc-kpis").innerHTML = `<div class="loading" style="grid-column:1/-1;text-align:center;padding:14px;color:var(--hint)">Carregando…</div>`;
  document.getElementById("pc-quests").innerHTML = "";
  document.getElementById("pc-colab").innerHTML = "";
  // Atualiza meta tags
  _setMetaPainel(cidade);

  let dados = null;
  try {
    const r = await VSSupabase.rpc("painel_municipal", { p_cidade: cidade });
    dados = r && typeof r === "object" ? r : null;
  } catch (e) {
    document.getElementById("pc-descricao").textContent = tr("pc_erro_painel") + (e.message || e);
    return;
  }
  if (!dados) return;

  // HERO
  document.getElementById("pc-titulo").textContent = dados.cidade || cidade;
  document.getElementById("pc-descricao").textContent = tInst(dados.descricao || tr("pc_descricao_fallback"));
  document.getElementById("pc-atualizado").textContent = `${tr("atualizado")}: ${new Date(dados.gerado_em).toLocaleString("pt-BR")}`;
  // Foto hero — foto REAL do banco (sólido), gradiente CSS de fallback
  heroFotoReal(dados.cidade || cidade).then(u => {
    if (u) document.getElementById("pc-hero-bg").style.backgroundImage = `url('${u}')`;
  });

  // KPIs
  const k = dados.cidadaos || {}, q = dados.quests || {}, ev = dados.evidencias || {};
  const kpi = (label, val, sub, cor) => `
    <div class="card-info" style="padding:12px;text-align:center;border-top:3px solid ${cor||"#7af0ff"}">
      <div style="font-size:24px;font-weight:900;color:${cor||"#7af0ff"}">${val ?? 0}</div>
      <div style="font-size:11px;color:var(--hint);margin-top:2px">${label}</div>
      ${sub ? `<small style="font-size:10px;color:var(--hint);display:block;margin-top:3px">${sub}</small>` : ""}
    </div>`;
  document.getElementById("pc-kpis").innerHTML = `
    ${kpi(tInst("Cidadãos cadastrados"), k.total, "do município", "#7af0ff")}
    ${kpi(tInst("Ativos 30 dias"),       k.ativos_30d, "engajamento real", "#4caf50")}
    ${kpi(tInst("Quests cívicas"),       q.total, `${q.derrotadas||0} resolvidas`, "#ffd54f")}
    ${kpi("kg de lixo retirado",  q.kg_lixo_retirado_estim, "estimado", "#9c27b0")}
    ${kpi("Focos dengue eliminados", q.focos_dengue_eliminados, "comunidade", "#e53935")}
    ${kpi("Riachos recuperados",  q.riachos_recuperados, "ações coletivas", "#26c6da")}
    ${kpi("Evidências aprovadas", ev.aprovadas, `${ev.pendentes||0} pendentes`, "#ff9800")}
    ${kpi("Em andamento",         q.andamento, "agora mesmo", "#42a5f5")}
  `;

  // MAPA Leaflet centrado na cidade
  if (typeof L !== "undefined" && dados.lat && dados.lng) {
    if (_pcLeaflet) { try { _pcLeaflet.remove(); } catch {} }
    _pcLeaflet = L.map("pc-mapa-leaflet", { zoomControl: true, attributionControl: false });
    _pcLeaflet.setView([dados.lat, dados.lng], 12);
    L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      maxZoom: 17, subdomains: "abc"
    }).addTo(_pcLeaflet);
    // Quests no mapa
    let qs = [];
    try { qs = await sb(`v_quests_mapa?select=*&limit=120`).catch(() => []); } catch {}
    for (const q of (qs || [])) {
      if (q.lat == null || q.lng == null) continue;
      const pct = q.hp_inicial ? Math.max(0, Math.min(1, q.hp_atual / q.hp_inicial)) : 1;
      const cor = pct > 0.6 ? "#e53935" : pct > 0.3 ? "#ff9800" : "#4caf50";
      L.marker([q.lat, q.lng], {
        icon: L.divIcon({
          html: `<div style="background:${cor};border:2px solid #fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 0 12px ${cor}">${q.icon||"🌳"}</div>`,
          iconSize: [30, 30], iconAnchor: [15, 15], className: ""
        })
      }).addTo(_pcLeaflet).bindPopup(`<strong>${escapeHtml(q.titulo)}</strong><br>HP ${q.hp_atual}/${q.hp_inicial}`);
    }
    // Equipamentos públicos (Open Data)
    try {
      const opd = await sb(`v_open_data_publicos?cidade=eq.${encodeURIComponent(dados.cidade)}&select=*&limit=80`).catch(() => []);
      const tipoIco = { ubs:"🏥", cras:"🤝", hospital:"🏨", escola:"🏫", creche:"👶", parque:"🌳", biblioteca:"📚", centro_cultural:"🎭", defesa_civil:"🚨", ouvidoria:"📢" };
      for (const p of (opd || [])) {
        if (p.lat == null || p.lng == null) continue;
        const ico = tipoIco[p.tipo] || "📍";
        L.marker([p.lat, p.lng], {
          icon: L.divIcon({
            html: `<div style="background:rgba(255,255,255,0.92);border:2px solid #1976d2;border-radius:8px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 0 8px rgba(25,118,210,0.4)">${ico}</div>`,
            iconSize: [28,28], iconAnchor: [14,14], className: ""
          })
        }).addTo(_pcLeaflet).bindPopup(
          `<strong>${escapeHtml(p.nome)}</strong><br>` +
          `<small>${escapeHtml(p.tipo)} · ${escapeHtml(p.bairro || "")}</small><br>` +
          (p.endereco ? `${escapeHtml(p.endereco)}<br>` : "") +
          (p.telefone ? `📞 ${escapeHtml(p.telefone)}<br>` : "") +
          (p.horario ? `🕐 ${escapeHtml(p.horario)}` : "")
        );
      }
    } catch {}
    // NPCs locais
    for (const n of (dados.npcs || [])) {
      const ico = ({sabio:"📜",desbravador:"🗺️",mago:"📖",alquimista:"⚗️",guerreiro:"🛡️",forjador:"🔨",watcher:"📷",automata:"🤖",litoranea:"🌊",aurora:"✨"})[n.tipo]||"🧑";
      L.marker([n.lat, n.lng], {
        icon: L.divIcon({
          html: `<div style="background:rgba(255,255,255,0.95);border:2px solid #ffd54f;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 0 10px rgba(255,213,79,0.5)">${ico}</div>`,
          iconSize: [30, 30], iconAnchor: [15, 15], className: ""
        })
      }).addTo(_pcLeaflet).bindPopup(`<strong>${escapeHtml(n.nome)}</strong><br><em>${escapeHtml(n.dica)}</em>`);
    }
  }

  // QUESTS RECENTES com fotos
  const qr = dados.quests_recentes || [];
  document.getElementById("pc-quests").innerHTML = qr.length === 0
    ? `<p style="color:var(--hint);font-size:12px;grid-column:1/-1;text-align:center;padding:14px">${tr("cc_sem_quests_resolvidas")} <a href="#quests" style="color:#7af0ff">${tr("cc_crie_primeira")}</a>.</p>`
    : qr.map(q => `
        <div class="card-info" style="padding:8px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <div style="font-size:20px">${q.icon || "🌳"}</div>
            <strong style="font-size:13px;flex:1">${escapeHtml(q.titulo)}</strong>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
            <div style="aspect-ratio:1;background:${q.foto_antes ? `url('${escapeHtml(q.foto_antes)}') center/cover` : "rgba(255,255,255,0.05)"};border-radius:6px;display:flex;align-items:flex-end;padding:4px"><span style="background:rgba(0,0,0,0.6);padding:1px 5px;border-radius:3px;font-size:9px;color:#fff">${tr("cc_antes")}</span></div>
            <div style="aspect-ratio:1;background:${q.foto_depois ? `url('${escapeHtml(q.foto_depois)}') center/cover` : "rgba(76,175,80,0.10)"};border-radius:6px;display:flex;align-items:flex-end;padding:4px"><span style="background:rgba(76,175,80,0.85);padding:1px 5px;border-radius:3px;font-size:9px;color:#fff">${tr("cc_depois")} ✓</span></div>
          </div>
          ${q.derrotada_em ? `<small style="color:var(--hint);font-size:10px;display:block;margin-top:4px">Resolvida em ${new Date(q.derrotada_em).toLocaleDateString("pt-BR")}</small>` : ""}
        </div>`).join("");

  // TOP COLABORADORES anonimizados
  const tc = dados.top_colaboradores || [];
  document.getElementById("pc-colab").innerHTML = tc.length === 0
    ? `<p style="color:var(--hint);font-size:12px;grid-column:1/-1;text-align:center;padding:14px">${tr("cc_aguardando_colab")}</p>`
    : tc.map((c, i) => {
        const ico = ({sabio:"📜",desbravador:"🗺️",mago:"📖",alquimista:"⚗️",guerreiro:"🛡️",forjador:"🔨",watcher:"📷",cidadao:"🧑"})[c.classe]||"🧑";
        return `
          <div class="card-info" style="padding:10px;text-align:center">
            <div style="font-size:24px">${ico}</div>
            <strong style="font-size:11px;text-transform:capitalize">#${i+1} ${escapeHtml(c.classe)}</strong>
            <div style="font-size:10px;color:var(--hint)">${c.contrib} contribuição${c.contrib===1?"":"s"} · ${c.sulis} sulis</div>
          </div>`;
      }).join("");
};

function _setMetaPainel(cidade) {
  const titulo = `Painel Cidadão de ${cidade} · Vento Sul`;
  const desc = `Acompanhe em tempo real o impacto cívico em ${cidade}: quests resolvidas, lixo retirado, focos eliminados.`;
  document.title = titulo;
  _setOG("og:title", titulo);
  _setOG("og:description", desc);
  _setOG("og:type", "website");
}
function _setOG(prop, content) {
  let el = document.querySelector(`meta[property="${prop}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("property", prop); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

// ─────────────────────────────────────────────────────────────
// 🛰️ MAPA REAL (Leaflet OpenTopoMap + hubs + rotas + quests + NPCs)
// ─────────────────────────────────────────────────────────────
window._mapaModo = "estilizado"; // sempre começa no estilizado pra evitar mapa em branco
window._mapaRealLeaflet = null;

window.trocarMapaModo = function(modo) {
  window._mapaModo = modo;
  try { localStorage.setItem("vs_aurora_mapa_modo", modo); } catch {}
  document.getElementById("btn-mapa-estil")?.classList.toggle("aurora-mapa-toggle-on", modo === "estilizado");
  document.getElementById("btn-mapa-real")?.classList.toggle("aurora-mapa-toggle-on", modo === "real");
  const real = document.getElementById("aurora-mapa-real");
  const estil = document.getElementById("aurora-mapa");
  if (modo === "real") {
    if (real) real.style.display = "block";
    if (estil) estil.style.display = "none";
    setTimeout(() => {
      initMapaRealAurora(_aurora?.era || "presente");
      iniciarMalhaReal();
    }, 60);
  } else {
    if (real) real.style.display = "none";
    if (estil) estil.style.display = "";
    pararMalhaReal();
  }
};

// ─────────────────────────────────────────────────────────────
// 🌐 Malha plexus animada sobre o mapa real (chão se mexendo)
// ─────────────────────────────────────────────────────────────
const _malhaReal = { canvas: null, ctx: null, particles: [], raf: null, dpr: 1, alive: false };

function iniciarMalhaReal() {
  const canvas = document.getElementById("aurora-malha-real-canvas");
  if (!canvas) return;
  _malhaReal.canvas = canvas;
  _malhaReal.ctx = canvas.getContext("2d");
  _malhaReal.dpr = window.devicePixelRatio || 1;
  _malhaReal.alive = true;
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    canvas.width  = rect.width  * _malhaReal.dpr;
    canvas.height = rect.height * _malhaReal.dpr;
    _malhaReal.ctx.setTransform(_malhaReal.dpr, 0, 0, _malhaReal.dpr, 0, 0);
    // Densidade alta — quer cobrir bem com pontos finos
    const alvo = Math.max(80, Math.min(180, Math.round((rect.width * rect.height) / 5500)));
    while (_malhaReal.particles.length < alvo) {
      _malhaReal.particles.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        r: 0.7 + Math.random() * 1.1
      });
    }
    while (_malhaReal.particles.length > alvo) _malhaReal.particles.pop();
  };
  _malhaReal._resize = resize;
  resize();
  window.addEventListener("resize", resize);
  if (!_malhaReal.raf) tickMalhaReal();
}

function pararMalhaReal() {
  _malhaReal.alive = false;
  if (_malhaReal.raf) cancelAnimationFrame(_malhaReal.raf);
  _malhaReal.raf = null;
  if (_malhaReal.ctx && _malhaReal.canvas) {
    _malhaReal.ctx.clearRect(0, 0, _malhaReal.canvas.width, _malhaReal.canvas.height);
  }
}

function tickMalhaReal() {
  if (!_malhaReal.alive || !_malhaReal.ctx) {
    _malhaReal.raf = null;
    return;
  }
  const c = _malhaReal.canvas;
  const rect = c.getBoundingClientRect();
  const w = rect.width, h = rect.height;
  if (!w) { _malhaReal.raf = requestAnimationFrame(tickMalhaReal); return; }

  const ctx = _malhaReal.ctx;
  ctx.clearRect(0, 0, w, h);
  const ps = _malhaReal.particles;
  const era = _aurora?.era || "presente";
  const [r, g, b] = _MALHA_PALETA_AURORA[era] || _MALHA_PALETA_AURORA.presente;

  // Movimento suave
  for (const p of ps) {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > w) p.vx *= -1;
    if (p.y < 0 || p.y > h) p.vy *= -1;
  }
  // Linhas conectando próximos — finas pra dar sensação de teia
  const DIST = Math.min(110, Math.max(70, Math.sqrt(w * h) / 13));
  ctx.lineWidth = 0.5;
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const dx = ps[i].x - ps[j].x, dy = ps[i].y - ps[j].y;
      const d2 = dx*dx + dy*dy;
      if (d2 < DIST*DIST) {
        const a = (1 - Math.sqrt(d2)/DIST) * 0.45;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
        ctx.beginPath();
        ctx.moveTo(ps[i].x, ps[i].y);
        ctx.lineTo(ps[j].x, ps[j].y);
        ctx.stroke();
      }
    }
  }
  // Pontos sutis com glow leve
  ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
  ctx.shadowBlur = 6;
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.85)`;
  for (const p of ps) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  _malhaReal.raf = requestAnimationFrame(tickMalhaReal);
}

function _filtroPorEra(era) {
  // CSS filter aplicado no container do tile pra dar clima da era
  return ({
    passado:  "sepia(0.55) saturate(0.85) brightness(0.92) contrast(1.05)",
    presente: "saturate(1.05) contrast(1.05)",
    futuro:   "hue-rotate(220deg) saturate(1.4) contrast(1.15) brightness(0.95)"
  })[era] || "";
}

async function initMapaRealAurora(era) {
  const cont = document.getElementById("aurora-mapa-real-leaflet");
  if (!cont) return;
  if (typeof L === "undefined") {
    document.getElementById("aurora-mapa-real-info").innerHTML =
      tr("mapa_leaflet_falhou");
    setTimeout(() => trocarMapaModo("estilizado"), 800);
    return;
  }
  // Aplica filter por era no container do leaflet (afeta tiles)
  cont.style.filter = _filtroPorEra(era);
  if (window._mapaRealLeaflet) {
    try { window._mapaRealLeaflet.remove(); } catch {}
    window._mapaRealLeaflet = null;
  }
  // Centraliza no Sul (média dos 3 estados): ~-28, -51
  const map = L.map(cont, { zoomControl: true, attributionControl: false });
  map.setView([-28.4, -51.5], 6);
  // Tile com relevo público (OpenTopoMap)
  L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    maxZoom: 17, subdomains: "abc",
    attribution: "© OpenStreetMap, SRTM | © OpenTopoMap"
  }).addTo(map);
  window._mapaRealLeaflet = map;

  // Layer: hubs principais + linhas de rota
  const hubsLL = MAPA_HUBS.map(h => [h.lat, h.lng]);
  L.polyline(hubsLL, { color: "#7af0ff", weight: 2, opacity: 0.45, dashArray: "6 5" }).addTo(map);
  for (const h of MAPA_HUBS) {
    L.marker([h.lat, h.lng], {
      icon: L.divIcon({
        className: "hub-marker",
        html: `<div style="background:rgba(0,0,0,0.65);border:2px solid #ffd54f;border-radius:6px;padding:2px 6px;color:#ffd54f;font-size:11px;font-weight:700;white-space:nowrap;text-shadow:0 1px 2px #000;box-shadow:0 0 10px rgba(255,213,79,0.30)">⭐ ${h.n}</div>`,
        iconSize: null, iconAnchor: [0, 0]
      })
    }).addTo(map).on("click", () => abrirMapaCidade(h.n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "")));
  }

  // Layer: quests vivas
  let quests = [];
  try { quests = await sb("v_quests_mapa?select=id,titulo,tipo,icon,lat,lng,hp_atual,hp_inicial,participantes&limit=200").catch(() => []); } catch {}
  let questsValidas = 0;
  for (const q of (quests || [])) {
    if (q.lat == null || q.lng == null) continue;
    questsValidas++;
    const pct = q.hp_inicial ? Math.max(0, Math.min(1, q.hp_atual / q.hp_inicial)) : 1;
    const cor = pct > 0.6 ? "#e53935" : pct > 0.3 ? "#ff9800" : "#4caf50";
    const ico = q.icon || "🌳";
    L.marker([q.lat, q.lng], {
      icon: L.divIcon({
        className: "quest-marker-real",
        html: `<div style="background:${cor};border:2px solid #fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 14px ${cor}">${ico}</div>`,
        iconSize: [32, 32], iconAnchor: [16, 16]
      })
    }).addTo(map).bindPopup(
      `<strong>${escapeHtml(q.titulo)}</strong><br>` +
      `HP ${q.hp_atual}/${q.hp_inicial} · ${q.participantes} participante${q.participantes === 1 ? "" : "s"}<br>` +
      `<a href="javascript:abrirDetalheQuest('${q.id}')">Ver quest →</a>`
    );
  }

  // Layer: NPCs
  let npcs = [];
  try { npcs = await sb("v_mapa_npcs_publicos?select=*&limit=80").catch(() => []); } catch {}
  for (const n of (npcs || [])) {
    if (n.lat == null || n.lng == null) continue;
    const tipoEmoji = ({
      desbravador:"🗺️", guerreiro:"🛡️", mago:"📖", alquimista:"⚗️",
      sabio:"📜", forjador:"🔨", watcher:"📷",
      automata:"🤖", litoranea:"🌊", aurora:"✨"
    })[n.tipo] || "🧑";
    const av = avatarPollinations(n.tipo, era || "presente", "m");
    L.marker([n.lat, n.lng], {
      icon: L.divIcon({
        className: "npc-marker",
        html: `<div style="position:relative;width:46px;height:46px">
          <img src="${av}" loading="lazy" style="width:46px;height:46px;border-radius:50%;border:3px solid #fff;object-fit:cover;background:#222;box-shadow:0 0 12px rgba(255,255,255,0.45)">
          <div style="position:absolute;bottom:-4px;right:-4px;background:#000;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:11px;border:1px solid #fff">${tipoEmoji}</div>
        </div>`,
        iconSize: [46, 46], iconAnchor: [23, 23]
      })
    }).addTo(map).bindPopup(
      `<div style="min-width:200px;max-width:260px">` +
      `<strong>${tipoEmoji} ${escapeHtml(n.nome)}</strong>` +
      `<div style="font-size:11px;color:#666;margin-bottom:6px">${escapeHtml(n.cidade || "")}/${escapeHtml(n.estado || "")}</div>` +
      `<p style="margin:0 0 6px;line-height:1.4">${escapeHtml(n.dica)}</p>` +
      (n.link_acao ? `<a href="${escapeHtml(n.link_acao)}" style="color:#0d723e;font-weight:700">→ ${tr("mapa_seguir_dica")}</a>` : "") +
      `</div>`
    );
  }

  // Info bar
  document.getElementById("aurora-mapa-real-info").innerHTML =
    `🛰️ <strong>Mapa Real · ${era}</strong> · ${MAPA_HUBS.length} hubs · ${questsValidas} quests · ${(npcs||[]).length} NPCs`;
}

// ─────────────────────────────────────────────────────────────
// 🎯 Pinos de QUESTS sobrepostos no mapa Espelho da Alma
// ─────────────────────────────────────────────────────────────
async function sobrepoQuestsNoMapa() {
  const hostId = "aurora-mapa-fundo";
  const div = document.getElementById(hostId);
  if (!div) return;
  let svg = div.querySelector("svg");
  if (!svg) return;
  // Limpa pinos antigos
  svg.querySelectorAll(".quest-pin").forEach(n => n.remove());
  let qs = [];
  try {
    qs = await sb("v_quests_mapa?select=id,titulo,tipo,icon,lat,lng,hp_atual,hp_inicial,participantes&limit=80").catch(() => []);
  } catch { return; }
  if (!Array.isArray(qs) || !qs.length) return;
  // Projeção compatível com renderMapaEspelho (lat -22..-33.5, lng -57..-48 → 0..800 × 0..500)
  const projetar = (lat, lng) => {
    const x = ((lng + 57) / 9) * 700 + 50;
    const y = ((lat + 22) / -11.5) * 440 + 30;
    return { x, y };
  };
  const ns = "http://www.w3.org/2000/svg";
  const g = document.createElementNS(ns, "g");
  g.setAttribute("class", "quest-pin");
  for (const q of qs) {
    if (q.lat == null || q.lng == null) continue;
    const { x, y } = projetar(q.lat, q.lng);
    if (x < 0 || x > 800 || y < 0 || y > 500) continue;
    const pct = q.hp_inicial ? Math.max(0, Math.min(1, q.hp_atual / q.hp_inicial)) : 1;
    const cor = pct > 0.6 ? "#e53935" : pct > 0.3 ? "#ff9800" : "#4caf50";
    // Halo pulsante
    const halo = document.createElementNS(ns, "circle");
    halo.setAttribute("cx", x); halo.setAttribute("cy", y);
    halo.setAttribute("r", "8"); halo.setAttribute("fill", cor); halo.setAttribute("opacity", "0.20");
    halo.innerHTML = `<animate attributeName="r" values="6;14;6" dur="2.6s" repeatCount="indefinite"/>`;
    g.appendChild(halo);
    // Pin
    const pin = document.createElementNS(ns, "circle");
    pin.setAttribute("cx", x); pin.setAttribute("cy", y);
    pin.setAttribute("r", "5"); pin.setAttribute("fill", cor); pin.setAttribute("stroke", "#fff");
    pin.setAttribute("stroke-width", "1.2");
    pin.style.cursor = "pointer";
    pin.addEventListener("click", () => abrirDetalheQuest(q.id));
    g.appendChild(pin);
    // Emoji do tipo
    const txt = document.createElementNS(ns, "text");
    txt.setAttribute("x", x); txt.setAttribute("y", y - 9);
    txt.setAttribute("text-anchor", "middle");
    txt.setAttribute("font-size", "12");
    txt.style.cursor = "pointer";
    txt.addEventListener("click", () => abrirDetalheQuest(q.id));
    txt.textContent = q.icon || "🌳";
    g.appendChild(txt);
  }
  svg.appendChild(g);
}

// 🔭 Drill-down: click no hub abre mapa da cidade (Nível 1)
const MAPAS_CIDADE = {
  florianopolis: {
    nome: "Floripa · SC",
    fundo: "bg/aurora-presente.webp",
    bairros: [
      { nome: "Centro",     x: 200, y: 120, hub: true,  cor: "#7af0ff" },
      { nome: "Lagoa",      x: 270, y: 100, hub: true,  cor: "#ffd54f" },
      { nome: "Trindade",   x: 180, y: 90,  hub: false, cor: "#fff" },
      { nome: "Ingleses",   x: 230, y: 30,  hub: true,  cor: "#fc8eb0" },
      { nome: "Canasvieiras", x: 200, y: 50, hub: false, cor: "#fff" },
      { nome: "Campeche",   x: 230, y: 170, hub: true,  cor: "#a8ff7f" },
      { nome: "Ribeirão",   x: 180, y: 200, hub: false, cor: "#fff" },
      { nome: "Pântano Sul", x: 220, y: 215, hub: false, cor: "#fff" }
    ]
  },
  antonina: {
    nome: "Antonina · PR",
    fundo: "bg/aurora-passado.webp",
    bairros: [
      { nome: "Centro Histórico", x: 200, y: 120, hub: true, cor: "#ffd54f" },
      { nome: "Porto",            x: 260, y: 110, hub: true, cor: "#7af0ff" },
      { nome: "Estação",          x: 170, y: 130, hub: false, cor: "#fff" },
      { nome: "Capela",           x: 130, y: 90,  hub: false, cor: "#fff" }
    ]
  },
  torres: {
    nome: "Torres · RS",
    fundo: "bg/aurora-passado.webp",
    bairros: [
      { nome: "Centro",      x: 180, y: 120, hub: true, cor: "#fc8eb0" },
      { nome: "Praia Grande", x: 250, y: 100, hub: true, cor: "#7af0ff" },
      { nome: "Itapeva",     x: 210, y: 60,  hub: false, cor: "#fff" },
      { nome: "Guarita",     x: 270, y: 165, hub: true, cor: "#ffd54f" }
    ]
  }
};

// Coordenadas dos hubs (espelha MAPA_HUBS) + nome amigável pra busca
const HUB_COORDS = {
  florianopolis:    { nome: "Florianópolis · SC",  lat: -27.59, lng: -48.55 },
  antonina:         { nome: "Antonina · PR",       lat: -25.43, lng: -48.71 },
  torres:           { nome: "Torres · RS",         lat: -29.34, lng: -49.73 },
  curitiba:         { nome: "Curitiba · PR",       lat: -25.43, lng: -49.27 },
  fozdoiguacu:      { nome: "Foz do Iguaçu · PR",  lat: -25.55, lng: -54.59 },
  saomiguelmissoes: { nome: "São Miguel das Missões · RS", lat: -28.55, lng: -54.55 },
  lapa:             { nome: "Lapa · PR",           lat: -25.77, lng: -49.72 },
  joinville:        { nome: "Joinville · SC",      lat: -26.30, lng: -48.85 },
  blumenau:         { nome: "Blumenau · SC",       lat: -26.92, lng: -49.07 },
  bc:               { nome: "Balneário Camboriú · SC", lat: -26.99, lng: -48.63 },
  bombinhas:        { nome: "Bombinhas · SC",      lat: -27.15, lng: -48.48 },
  urubici:          { nome: "Urubici · SC",        lat: -28.01, lng: -49.59 },
  saojoaquim:       { nome: "São Joaquim · SC",    lat: -28.30, lng: -49.93 },
  cambarasul:       { nome: "Cambará do Sul · RS", lat: -29.05, lng: -50.15 },
  gramado:          { nome: "Gramado · RS",        lat: -29.38, lng: -50.88 },
  bentogoncalves:   { nome: "Bento Gonçalves · RS", lat: -29.17, lng: -51.52 },
  portoalegre:      { nome: "Porto Alegre · RS",   lat: -30.03, lng: -51.23 },
  pelotas:          { nome: "Pelotas · RS",        lat: -31.77, lng: -52.34 }
};
let _mapaCidadeLeaflet = null;
let _mapaCidadeUserMarker = null;
let _mapaCidadeQuestLayer = null;
let _mapaCidadeRotaLayer = null;

window.abrirMapaCidade = async function(hubKey) {
  const cfg = MAPAS_CIDADE[hubKey] || HUB_COORDS[hubKey];
  if (!cfg) return;
  let modal = document.getElementById("modal-mapa-cidade");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-mapa-cidade";
    modal.className = "modal-bg";
    modal.style.zIndex = "9700";
    modal.innerHTML = `<div class="modal" style="max-width:720px;width:96%;max-height:92vh;overflow:hidden;padding:10px"></div>`;
    document.body.appendChild(modal);
  }
  const inner = modal.querySelector(".modal");
  inner.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <h3 style="margin:0">🔍 ${escapeHtml(cfg.nome)}</h3>
      <button onclick="fecharMapaCidade()" style="background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.20);color:#fff;border-radius:50%;width:34px;height:34px;font-size:18px;cursor:pointer">✕</button>
    </div>
    <div id="mc-leaflet" style="width:100%;height:60vh;min-height:380px;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.20);background:#14283a"></div>
    <div id="mc-info" style="font-size:12px;color:var(--hint);margin:8px 0 0;line-height:1.5"></div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn-primary" style="flex:1;background:rgba(13,114,62,0.55)" onclick="centralizarMapaCidadeNoUser()">📍 ${tr("mapa_minha_posicao")}</button>
      <button class="btn-primary" style="flex:1;background:rgba(229,57,53,0.55)" onclick="seguirProximaQuest()">🎯 ${tr("mapa_proxima_quest")}</button>
      <button class="btn-primary" style="flex:1;background:rgba(120,120,120,0.4)" onclick="fecharMapaCidade()">↑ ${tr("mapa_voltar")}</button>
    </div>
  `;
  modal.style.display = "flex";
  // Espera o modal aparecer antes de inicializar o Leaflet
  setTimeout(() => initMapaCidadeLeaflet(cfg), 50);
};

window.fecharMapaCidade = function() {
  if (_mapaCidadeLeaflet) {
    try { _mapaCidadeLeaflet.remove(); } catch {}
    _mapaCidadeLeaflet = null;
    _mapaCidadeUserMarker = null;
    _mapaCidadeQuestLayer = null;
    _mapaCidadeRotaLayer = null;
  }
  document.getElementById("modal-mapa-cidade").style.display = "none";
};

async function initMapaCidadeLeaflet(cfg) {
  if (typeof L === "undefined") {
    document.getElementById("mc-info").textContent = tr("mapa_leaflet_nao_carregado");
    return;
  }
  if (_mapaCidadeLeaflet) {
    try { _mapaCidadeLeaflet.remove(); } catch {}
  }
  _mapaCidadeLeaflet = L.map("mc-leaflet", { zoomControl: true });
  _mapaCidadeLeaflet.setView([cfg.lat, cfg.lng], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18, attribution: ""
  }).addTo(_mapaCidadeLeaflet);

  // Pin do hub principal (centro)
  L.marker([cfg.lat, cfg.lng])
    .addTo(_mapaCidadeLeaflet)
    .bindPopup(`<strong>${escapeHtml(cfg.nome)}</strong>`);

  // Pinos de quests dessa cidade (raio ~25km do hub)
  _mapaCidadeQuestLayer = L.layerGroup().addTo(_mapaCidadeLeaflet);
  let qs = [];
  try {
    qs = await sb("v_quests_mapa?select=*&limit=200").catch(() => []);
  } catch {}
  const dist = (a, b, c, d) => {
    const R = 6371, toR = x => x*Math.PI/180;
    const dLat = toR(c-a), dLng = toR(d-b);
    const x = Math.sin(dLat/2)**2 + Math.cos(toR(a))*Math.cos(toR(c))*Math.sin(dLng/2)**2;
    return 2*R*Math.asin(Math.sqrt(x));
  };
  const proximas = (qs || []).filter(q => q.lat != null && q.lng != null
    && dist(cfg.lat, cfg.lng, q.lat, q.lng) <= 25);
  window._mapaCidadeQuests = proximas;
  for (const q of proximas) {
    const pct = q.hp_inicial ? Math.max(0, Math.min(1, q.hp_atual / q.hp_inicial)) : 1;
    const cor = pct > 0.6 ? "#e53935" : pct > 0.3 ? "#ff9800" : "#4caf50";
    const ico = q.icon || "🌳";
    const m = L.marker([q.lat, q.lng], {
      icon: L.divIcon({
        className: "quest-marker",
        html: `<div style="background:${cor};border:2px solid #fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 14px ${cor}">${ico}</div>`,
        iconSize: [34, 34], iconAnchor: [17, 17]
      })
    });
    m.bindPopup(
      `<strong>${escapeHtml(q.titulo)}</strong><br>` +
      `HP ${q.hp_atual}/${q.hp_inicial} · ${q.participantes} ${q.participantes === 1 ? "participante" : "participantes"}<br>` +
      `<a href="javascript:abrirDetalheQuest('${q.id}')">Ver quest →</a>`
    );
    m.addTo(_mapaCidadeQuestLayer);
  }

  document.getElementById("mc-info").innerHTML = proximas.length
    ? `🎯 ${proximas.length} quest${proximas.length === 1 ? "" : "s"} viva${proximas.length === 1 ? "" : "s"} num raio de 25km. Clique nos pinos pra detalhes ou no botão "Próxima quest" pra seguir a flecha.`
    : `${tr("mapa_sem_quests_regiao")}`;

  // Mostra user direto se já tem geolocalização cacheada
  centralizarMapaCidadeNoUser({ silencioso: true });
}

window.centralizarMapaCidadeNoUser = function(opts = {}) {
  if (!_mapaCidadeLeaflet) return;
  navigator.geolocation.getCurrentPosition(
    pos => {
      const ll = [pos.coords.latitude, pos.coords.longitude];
      if (_mapaCidadeUserMarker) {
        _mapaCidadeUserMarker.setLatLng(ll);
      } else {
        _mapaCidadeUserMarker = L.marker(ll, {
          icon: L.divIcon({
            className: "user-marker",
            html: `<div style="background:#1976d2;border:3px solid #fff;border-radius:50%;width:20px;height:20px;box-shadow:0 0 16px #1976d2;animation:pulse-user 2s infinite"></div>`,
            iconSize: [20, 20], iconAnchor: [10, 10]
          })
        }).addTo(_mapaCidadeLeaflet);
      }
      if (!opts.silencioso) _mapaCidadeLeaflet.setView(ll, 14);
    },
    err => {
      if (!opts.silencioso) alert(tr("mapa_sem_geo"));
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
};

window.seguirProximaQuest = function() {
  if (!_mapaCidadeLeaflet || !_mapaCidadeUserMarker) {
    alert(tr("mapa_ative_localizacao"));
    return;
  }
  const qs = window._mapaCidadeQuests || [];
  if (!qs.length) { alert(tr("mapa_sem_quests_seguir")); return; }
  const userLL = _mapaCidadeUserMarker.getLatLng();
  const dist = (a, b, c, d) => {
    const R = 6371, toR = x => x*Math.PI/180;
    const dLat = toR(c-a), dLng = toR(d-b);
    const x = Math.sin(dLat/2)**2 + Math.cos(toR(a))*Math.cos(toR(c))*Math.sin(dLng/2)**2;
    return 2*R*Math.asin(Math.sqrt(x));
  };
  let mais = null, menorD = Infinity;
  for (const q of qs) {
    const d = dist(userLL.lat, userLL.lng, q.lat, q.lng);
    if (d < menorD) { menorD = d; mais = q; }
  }
  if (!mais) return;
  // Limpa rota anterior
  if (_mapaCidadeRotaLayer) { _mapaCidadeRotaLayer.remove(); _mapaCidadeRotaLayer = null; }
  // Desenha linha tracejada user → quest
  _mapaCidadeRotaLayer = L.polyline(
    [[userLL.lat, userLL.lng], [mais.lat, mais.lng]],
    { color: "#ffd54f", weight: 4, opacity: 0.9, dashArray: "8 6" }
  ).addTo(_mapaCidadeLeaflet);
  // Bearing user → quest
  const bearing = (function(a, b, c, d) {
    const toR = x => x*Math.PI/180, toD = x => x*180/Math.PI;
    const y = Math.sin(toR(d-b)) * Math.cos(toR(c));
    const x = Math.cos(toR(a))*Math.sin(toR(c)) - Math.sin(toR(a))*Math.cos(toR(c))*Math.cos(toR(d-b));
    return (toD(Math.atan2(y, x)) + 360) % 360;
  })(userLL.lat, userLL.lng, mais.lat, mais.lng);
  // Seta sobreposta no user, apontando pro alvo
  if (window._mapaCidadeSeta) { window._mapaCidadeSeta.remove(); }
  window._mapaCidadeSeta = L.marker([userLL.lat, userLL.lng], {
    icon: L.divIcon({
      className: "user-arrow",
      html: `<div style="transform:rotate(${bearing}deg);font-size:34px;text-shadow:0 0 12px #ffd54f;color:#ffd54f">➤</div>`,
      iconSize: [40, 40], iconAnchor: [20, 20]
    }),
    interactive: false
  }).addTo(_mapaCidadeLeaflet);
  // Ajusta viewport pra mostrar os 2 pontos
  _mapaCidadeLeaflet.fitBounds([[userLL.lat, userLL.lng], [mais.lat, mais.lng]], { padding: [40, 40] });
  document.getElementById("mc-info").innerHTML =
    `🎯 Próxima: <strong>${escapeHtml(mais.titulo)}</strong> · ${menorD.toFixed(2)} km daqui · siga a seta amarela. ` +
    `<a href="javascript:abrirDetalheQuest('${mais.id}')">Ver detalhes</a>`;
};

// 🌐 Malha de relevo (montanhas/vales) sobre o mapa Aurora
const _malhaAurora = { canvas: null, ctx: null, particles: [], raf: null, dpr: 1 };
const _MALHA_PALETA_AURORA = {
  passado:  [200, 170, 100],   // sépia dourado
  presente: [80, 220, 140],    // verde natural
  futuro:   [120, 240, 255]    // ciano cyber
};
function iniciarMalhaAurora() {
  if (_malhaAurora.canvas) {
    if (!_malhaAurora.raf) tickMalhaAurora();
    return;
  }
  const canvas = document.getElementById("aurora-malha-canvas");
  if (!canvas) return;
  _malhaAurora.canvas = canvas;
  _malhaAurora.ctx = canvas.getContext("2d");
  _malhaAurora.dpr = window.devicePixelRatio || 1;
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    canvas.width  = rect.width  * _malhaAurora.dpr;
    canvas.height = rect.height * _malhaAurora.dpr;
    _malhaAurora.ctx.setTransform(_malhaAurora.dpr, 0, 0, _malhaAurora.dpr, 0, 0);
    // Densidade adaptativa
    const alvo = Math.max(40, Math.min(110, Math.round((rect.width * rect.height) / 8000)));
    while (_malhaAurora.particles.length < alvo) {
      _malhaAurora.particles.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: 1 + Math.random() * 1.5
      });
    }
    while (_malhaAurora.particles.length > alvo) _malhaAurora.particles.pop();
  };
  resize();
  window.addEventListener("resize", resize);
  // Re-mede quando entrar/sair de fullscreen
  document.addEventListener("fullscreenchange", () => setTimeout(resize, 100));
  tickMalhaAurora();
}
function tickMalhaAurora() {
  if (!_malhaAurora.ctx) return;
  // Pausa quando tela Aurora não tá visível
  const screen = document.getElementById("screen-aurora");
  if (!screen?.classList.contains("active")) {
    _malhaAurora.raf = null;
    return;
  }
  const c = _malhaAurora.canvas;
  const rect = c.getBoundingClientRect();
  const w = rect.width, h = rect.height;
  if (!w) { _malhaAurora.raf = requestAnimationFrame(tickMalhaAurora); return; }

  const ctx = _malhaAurora.ctx;
  ctx.clearRect(0, 0, w, h);
  const ps = _malhaAurora.particles;

  // Cor da malha por era
  const era = _aurora?.era || "presente";
  const [r, g, b] = _MALHA_PALETA_AURORA[era] || _MALHA_PALETA_AURORA.presente;

  // Move
  for (const p of ps) {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > w) p.vx *= -1;
    if (p.y < 0 || p.y > h) p.vy *= -1;
  }
  // Linhas conectando próximos
  const DIST = Math.min(140, Math.max(80, Math.sqrt(w * h) / 10));
  ctx.lineWidth = 0.8;
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const dx = ps[i].x - ps[j].x, dy = ps[i].y - ps[j].y;
      const d2 = dx*dx + dy*dy;
      if (d2 < DIST*DIST) {
        const a = (1 - Math.sqrt(d2)/DIST) * 0.55;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
        ctx.beginPath();
        ctx.moveTo(ps[i].x, ps[i].y);
        ctx.lineTo(ps[j].x, ps[j].y);
        ctx.stroke();
      }
    }
  }
  // Pontos com glow
  ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.85)`;
  ctx.shadowBlur = 8;
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.95)`;
  for (const p of ps) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  _malhaAurora.raf = requestAnimationFrame(tickMalhaAurora);
}

document.querySelectorAll(".aurora-tab").forEach(t => t.addEventListener("click", () => {
  _aurora.era = t.dataset.era;
  document.querySelectorAll(".aurora-tab").forEach(x => x.classList.toggle("active", x === t));
  renderMapaEspelho(_aurora.era);
  const mapa = document.getElementById("aurora-mapa");
  mapa.dataset.era = _aurora.era;
  document.getElementById("aurora-mapa-titulo").textContent = AURORA_TITULOS[_aurora.era];
  // Esconde narrativa anterior se houver
  document.getElementById("aurora-narrativa").style.display = "none";
}));
// Botão de tela cheia do mapa Aurora
document.getElementById("btn-aurora-fullscreen")?.addEventListener("click", async () => {
  const mapa = document.getElementById("aurora-mapa");
  if (!mapa) return;
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (mapa.requestFullscreen) {
      await mapa.requestFullscreen();
    } else if (mapa.webkitRequestFullscreen) {
      await mapa.webkitRequestFullscreen();
    }
  } catch (e) {
    vsToast?.({ tipo: "warn", titulo: tr("fs_titulo"), corpo: tr("fs_corpo") });
  }
});

document.querySelectorAll(".aurora-classe").forEach(c => c.addEventListener("click", () => {
  _aurora.classe = c.dataset.classe;
  document.querySelectorAll(".aurora-classe").forEach(x => x.classList.toggle("selecionada", x === c));
  document.getElementById("aurora-stats").style.display = "flex";
  // Atualiza emoji do avatar no mapa
  const emoji = AURORA_CLASSE_EMOJI[_aurora.classe] || "✨";
  const avEmojiEl = document.getElementById("aurora-avatar-emoji");
  if (avEmojiEl) avEmojiEl.textContent = emoji;
  // Pequena celebração
  window.VSMagia?.celebrar?.({ tipo: "missao", mensagem: `${emoji} Classe ${_aurora.classe} escolhida!` });
}));

// 🛡️ Inventário de Equipamentos Aurora
const RARIDADE_CORES = {
  comum: { bg: "rgba(120,120,120,0.4)", border: "#999" },
  rara: { bg: "rgba(38,124,180,0.45)", border: "#3aa1d6" },
  epica: { bg: "rgba(186,104,200,0.45)", border: "#ba68c8" },
  lendaria: { bg: "rgba(255,193,7,0.45)", border: "#ffd54f" },
  mitica: { bg: "rgba(229,57,53,0.45)", border: "#ff5252" }
};
const ERA_CABECALHOS = {
  passado: "📜 Era Medieval-Steampunk",
  presente: "🌳 Era Atual",
  futuro: "🌌 Era Cyber"
};

window.abrirInventarioAurora = async function() {
  await VSSupabase.ensureSession?.();
  const userId = VSSupabase.userId?.();

  let modal = document.getElementById("modal-inventario-aurora");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-inventario-aurora";
    modal.className = "modal-bg";
    modal.innerHTML = `<div class="modal" style="max-width:640px;max-height:90vh;overflow-y:auto"></div>`;
    document.body.appendChild(modal);
  }
  const inner = modal.querySelector(".modal");
  inner.innerHTML = `<div class="loading" style="padding:40px;text-align:center">🛡️ ${tr("inv_carregando")}</div>`;
  modal.style.display = "flex";

  try {
    // Busca catálogo + inventário do user em paralelo
    const [equipamentos, inventario] = await Promise.all([
      sb("equipamentos?select=*&ativo=eq.true&order=era,raridade").catch(() => []),
      userId ? sb(`inventario_user?user_id=eq.${userId}&select=equipamento_id,equipado`).catch(() => []) : []
    ]);

    const possuiSet = new Set(inventario.map(i => i.equipamento_id));
    const equipadoSet = new Set(inventario.filter(i => i.equipado).map(i => i.equipamento_id));

    const grupos = { passado: [], presente: [], futuro: [] };
    equipamentos.forEach(e => grupos[e.era]?.push(e));

    let html = `
      <h3 style="margin:0 0 4px">🛡️ ${tr("inv_titulo")}</h3>
      <p style="font-size:12px;color:var(--hint);margin:0 0 14px">
        ${equipamentos.length} peças no catálogo · você tem ${possuiSet.size} desbloqueadas
      </p>
    `;

    for (const era of ["passado","presente","futuro"]) {
      const pecas = grupos[era] || [];
      if (!pecas.length) continue;
      html += `<h4 style="margin:14px 0 8px;color:#7af0ff;border-bottom:1px solid rgba(255,255,255,0.10);padding-bottom:4px">${ERA_CABECALHOS[era]}</h4>`;
      html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">`;
      for (const p of pecas) {
        const tem = possuiSet.has(p.id);
        const eq = equipadoSet.has(p.id);
        const cor = RARIDADE_CORES[p.raridade] || RARIDADE_CORES.comum;
        const bonusTxt = Object.entries(p.bonus || {}).map(([k,v]) =>
          `${k.replace("buff_","").replace(/_/g," ")}: +${v}${k.includes("pct")?'%':''}`
        ).join(" · ");
        html += `
          <div style="background:${tem?cor.bg:"rgba(20,40,58,0.30)"};border:1.5px solid ${tem?cor.border:"rgba(255,255,255,0.10)"};${eq?"box-shadow:0 0 12px "+cor.border:""};border-radius:10px;padding:10px;text-align:center;${tem?"":"opacity:0.55"}">
            <div style="font-size:34px;line-height:1.1;margin-bottom:4px;${tem?"":"filter:grayscale(0.8)"}">${p.emoji}</div>
            <div style="font-size:11px;font-weight:700;line-height:1.2">${escapeHtml(p.nome)}</div>
            <div style="font-size:9px;color:${cor.border};text-transform:uppercase;margin-top:2px">${p.raridade}</div>
            ${bonusTxt ? `<div style="font-size:9px;color:var(--hint);margin-top:4px;line-height:1.3">${escapeHtml(bonusTxt)}</div>` : ""}
            ${tem
              ? `<button onclick="_toggleEquipar('${p.id}', ${eq})" style="width:100%;margin-top:6px;padding:5px;font-size:11px;background:${eq?"rgba(255,80,200,0.55)":"rgba(13,114,62,0.45)"};border:none;color:#fff;border-radius:5px;cursor:pointer;font-weight:600">${eq?"✓ "+tr("inv_equipado"):tr("inv_equipar")}</button>`
              : `<div style="font-size:9px;color:var(--hint);margin-top:6px">🔒 ${p.drop_chance}% drop</div>`}
          </div>`;
      }
      html += `</div>`;
    }

    html += `
      <div style="background:rgba(255,193,7,0.10);border:1px solid rgba(255,193,7,0.30);border-radius:8px;padding:10px;margin-top:14px;font-size:12px;line-height:1.5">
        💎 <strong>${tr("inv_como_ganhar")}</strong><br>
        Complete <strong>Caça ao Tesouro</strong>, <strong>missões</strong> e <strong>quests</strong> — cada vitória tem chance de drop conforme a raridade da peça. Set completo de uma era = bônus massivo.
      </div>
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="btn-primary" style="flex:1;background:rgba(255,193,7,0.45)" onclick="_simularDrop()">🎁 ${tr("inv_simular_drop")}</button>
        <button class="btn-primary" style="flex:1;background:rgba(120,120,120,0.4)" onclick="document.getElementById('modal-inventario-aurora').style.display='none'">Fechar</button>
      </div>`;
    inner.innerHTML = html;
  } catch (e) {
    inner.innerHTML = `<p style="color:#f44">❌ ${e.message}</p>
      <button class="btn-primary" style="width:100%;margin-top:14px;background:rgba(120,120,120,0.4)" onclick="document.getElementById('modal-inventario-aurora').style.display='none'">Fechar</button>`;
  }
};

window._toggleEquipar = async function(eqId, eraEquipado) {
  try {
    await VSSupabase.request(`inventario_user?equipamento_id=eq.${eqId}`, {
      method: "PATCH", body: JSON.stringify({ equipado: !eraEquipado })
    });
    abrirInventarioAurora();
    window.VSMagia?.celebrar?.({ tipo: "missao", mensagem: eraEquipado ? tr("inv_desequipado") : tr("inv_equipado_msg") });
  } catch (e) {
    vsToast({ tipo: "error", titulo: "Falha", corpo: e.message?.slice(0,200) });
  }
};

window._simularDrop = async function() {
  // Pega 1 peça aleatória que o user ainda não tem
  const userId = VSSupabase.userId?.();
  if (!userId) return vsToast({ tipo: "warn", titulo: tr("inv_login_necessario"), corpo: tr("inv_faca_login") });
  try {
    const equipamentos = await sb("equipamentos?select=*&ativo=eq.true").catch(() => []);
    const meu = await sb(`inventario_user?user_id=eq.${userId}&select=equipamento_id`).catch(() => []);
    const tenho = new Set(meu.map(i => i.equipamento_id));
    const disponiveis = equipamentos.filter(e => !tenho.has(e.id));
    if (!disponiveis.length) return vsToast({ tipo: "info", titulo: tr("inv_catalogo_completo"), corpo: tr("inv_todas_pecas") });

    // Sorteio ponderado por drop_chance
    const total = disponiveis.reduce((s,e) => s + e.drop_chance, 0);
    let r = Math.random() * total;
    let escolhida = disponiveis[0];
    for (const e of disponiveis) { r -= e.drop_chance; if (r <= 0) { escolhida = e; break; } }

    await VSSupabase.request("inventario_user", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, equipamento_id: escolhida.id, desbloqueado_por: "simulacao" })
    });
    window.VSMagia?.celebrar?.({ tipo: "plano", mensagem: `${escolhida.emoji} ${escolhida.nome}!\n🎉 ${escolhida.raridade.toUpperCase()}` });
    setTimeout(() => abrirInventarioAurora(), 1500);
  } catch (e) {
    vsToast({ tipo: "error", titulo: "Falha", corpo: e.message?.slice(0,200) });
  }
};
document.getElementById("btn-iniciar-aventura")?.addEventListener("click", () => {
  if (!_aurora.classe) {
    alert(tr("aurora_escolhe_classe"));
    return;
  }
  const narrativa = AURORA_NARRATIVAS[_aurora.era]?.[_aurora.classe] ||
    tr("aurora_conjurando");
  const div = document.getElementById("aurora-narrativa");
  div.style.display = "block";
  div.innerHTML = `
    <div class="card-info">
      <h3 style="margin-top:0">${_emojiClasse(_aurora.classe)} Aventura — ${_aurora.era}</h3>
      <p style="margin:8px 0">${escapeHtml(narrativa)}</p>
      <div style="display:flex;gap:6px;margin-top:10px">
        <button class="chip" onclick="aurorAvancar()">⚡ ${tr("aurora_proximo")}</button>
        <button class="chip" onclick="aurorRecomeçar()">↻ ${tr("aurora_recomecar")}</button>
      </div>
    </div>`;
  // Aurora também fala
  try { window.VSLitoranea?.falarTTS?.(narrativa); } catch {}
});

function _emojiClasse(c) {
  return ({ guerreiro:"🌳", mago:"🔮", alquimista:"⚗️", bardo:"🎵",
            arqueiro:"🏹", destemido:"🛡️", forjador:"⚒️", ciber:"🤖" })[c] || "✨";
}
const AURORA_PASSOS_POR_FASE = 5;
window.aurorAvancar = async () => {
  // Stats sobem/descem
  document.querySelectorAll("#aurora-stats .stat").forEach(s => {
    const fill = s.querySelector(".fill");
    const pct = s.querySelector(".pct");
    let cur = parseInt(fill.style.width) || 50;
    cur = Math.max(10, Math.min(100, cur + (Math.random()*20 - 10) | 0));
    fill.style.width = cur + "%";
    pct.textContent = cur + "%";
  });
  _aurora.passos = (_aurora.passos || 0) + 1;
  // Indicador de progresso da fase atual
  const div = document.getElementById("aurora-narrativa");
  let prog = div?.querySelector(".aurora-progresso");
  if (!prog && div) {
    prog = document.createElement("div");
    prog.className = "aurora-progresso";
    prog.style.cssText = "margin-top:10px;height:6px;background:rgba(255,255,255,0.10);border-radius:3px;overflow:hidden";
    prog.innerHTML = `<div style="height:100%;background:linear-gradient(90deg,#7af0ff,#ffd54f);width:0;transition:width .4s"></div>`;
    div.querySelector(".card-info")?.appendChild(prog);
  }
  if (prog) prog.firstElementChild.style.width = `${(_aurora.passos / AURORA_PASSOS_POR_FASE) * 100}%`;

  // Fase completa
  if (_aurora.passos >= AURORA_PASSOS_POR_FASE) {
    _aurora.passos = 0;
    _aurora.fasesCompletas++;
    _salvarAurora();
    await aurorFaseCompleta();
  }
};

async function aurorFaseCompleta() {
  let dias = 0, sulis = 0, msg = "";
  // Aurora aprende sobre o user via gameplay (classe escolhida + era preferida)
  try {
    await VSSupabase.rpc("assistente_lembrar", {
      p_bot: "aurora",
      p_fato: `joga como ${_aurora.classe} na era ${_aurora.era}`,
      p_tipo: "gameplay",
      p_importancia: 65
    });
  } catch {}
  try {
    const r = await VSSupabase.rpc("completar_missao_social", { p_codigo: "aurora_fase_completa" });
    const d = Array.isArray(r) ? r[0] : r;
    if (d?.ok) { dias = d.dias_creditados; }
  } catch {}
  // Bônus extra a cada capítulo (5 fases)
  if (_aurora.fasesCompletas % 5 === 0) {
    try {
      const r2 = await VSSupabase.rpc("completar_missao_social", { p_codigo: "aurora_capitulo" });
      const d2 = Array.isArray(r2) ? r2[0] : r2;
      if (d2?.ok) dias += d2.dias_creditados;
      msg = `🏆 Capítulo inteiro completo! +${d2?.dias_creditados || 30} dias bônus.\n\n`;
    } catch {}
  }

  const eraNome = AURORA_TITULOS?.[_aurora.era] || _aurora.era;
  alert(
    `${msg}✨ Fase ${_aurora.fasesCompletas} completa em ${eraNome}!\n` +
    `+ ${dias || 7} dias grátis no Vento Sul.\n\n` +
    `Quer postar essa conquista? Vamos gerar um card pra Insta/feed.`
  );
  if (confirm(tr("aurora_gerar_card"))) {
    compartilharCardConquista({
      titulo: `Fase ${_aurora.fasesCompletas} · ${_emojiClasse(_aurora.classe)} ${_aurora.classe}`,
      subtitulo: `Aurora — ${eraNome}`,
      fotoUrl: "bg/bg_aurora.webp"
    });
  }
  atualizarStatusAssinatura?.();
}

window.aurorRecomeçar = () => {
  _aurora.passos = 0;
  document.getElementById("aurora-narrativa").style.display = "none";
  _aurora.classe = null;
  document.querySelectorAll(".aurora-classe").forEach(x => x.classList.remove("selecionada"));
  document.getElementById("aurora-stats").style.display = "none";
};

document.getElementById("btn-votar")?.addEventListener("click", abrirVotacaoModal);
document.getElementById("btn-comprar-barraca")?.addEventListener("click", comprarBarracaAutenticado);
document.getElementById("btn-perguntar")?.addEventListener("click", perguntarLitoranea);
document.getElementById("btn-mic")?.addEventListener("click", iniciarMic);
document.getElementById("btn-conversa-praia")?.addEventListener("click", iniciarConversaPraia);
document.getElementById("input-pergunta")?.addEventListener("keypress", e => {
  if (e.key === "Enter") perguntarLitoranea();
});
document.getElementById("lang-flag")?.addEventListener("click", () => {
  state.idiomaIdx = (state.idiomaIdx + 1) % state.idiomas.length;
  const flag = document.getElementById("lang-flag");
  if (flag) flag.textContent = state.idiomas[state.idiomaIdx];
  VSI18n.setLang(langCode());
  savePrefs();
  aplicarI18n();
  _radioSegueIdioma();
});

// ─────────────────────────────────────────────────────────────
// Tema claro/escuro + tamanho de fonte (persistido em localStorage)
// ─────────────────────────────────────────────────────────────
// Fonte: cicla por 4 níveis via CSS zoom — afeta TUDO proporcional
// (texto, ícones, botões, cards) em uma única regra.
const ZOOM_NIVEIS = [1, 1.15, 1.30, 1.50];
function aplicarTema(tema) {
  document.body.classList.toggle("tema-claro", tema === "claro");
  const btn = document.getElementById("btn-tema");
  if (btn) btn.textContent = tema === "claro" ? "🌙" : "☀️";
  localStorage.setItem("vs.tema", tema);
}
function aplicarFonteIdx(idx) {
  idx = ((idx % ZOOM_NIVEIS.length) + ZOOM_NIVEIS.length) % ZOOM_NIVEIS.length;
  // Aplica zoom no #app (não na body) pra não afetar fundo/posicionamentos fixed
  const app = document.getElementById("app");
  if (app) app.style.zoom = ZOOM_NIVEIS[idx];
  localStorage.setItem("vs.fonte_idx", String(idx));
}
// Restaura preferências
aplicarTema(localStorage.getItem("vs.tema") || "escuro");
aplicarFonteIdx(parseInt(localStorage.getItem("vs.fonte_idx") || "0", 10));

document.getElementById("btn-tema")?.addEventListener("click", () => {
  const atual = document.body.classList.contains("tema-claro") ? "claro" : "escuro";
  aplicarTema(atual === "claro" ? "escuro" : "claro");
});
document.getElementById("btn-fonte")?.addEventListener("click", () => {
  const atual = parseInt(localStorage.getItem("vs.fonte_idx") || "0", 10);
  aplicarFonteIdx(atual + 1);
});

// ─────────────────────────────────────────────────────────────
// Header: Voltar/Avançar (histórico próprio), Mute, Notif, Idioma
// ─────────────────────────────────────────────────────────────
const navHist = { stack: ["landing"], idx: 0 };
function navIr(tela) {
  // se chegou aqui via showScreen, anota no histórico
  if (navHist.stack[navHist.idx] === tela) return;
  navHist.stack = navHist.stack.slice(0, navHist.idx + 1);
  navHist.stack.push(tela);
  navHist.idx = navHist.stack.length - 1;
  atualizarBotoesNav();
}
function atualizarBotoesNav() {
  const v = document.getElementById("btn-voltar");
  const a = document.getElementById("btn-avancar");
  if (v) v.style.opacity = (navHist.idx > 0) ? "1" : "0.35";
  if (a) a.style.opacity = (navHist.idx < navHist.stack.length - 1) ? "1" : "0.35";
}
document.getElementById("btn-voltar")?.addEventListener("click", () => {
  if (navHist.idx > 0) {
    navHist.idx--;
    const t = navHist.stack[navHist.idx];
    showScreen(t);
    atualizarBotoesNav();
  }
});
document.getElementById("btn-avancar")?.addEventListener("click", () => {
  if (navHist.idx < navHist.stack.length - 1) {
    navHist.idx++;
    const t = navHist.stack[navHist.idx];
    showScreen(t);
    atualizarBotoesNav();
  }
});

// Mute global (sincroniza com TTS da Litorânea)
let _muted = localStorage.getItem("vs.muted") === "1";
function aplicarMute(m) {
  _muted = m;
  localStorage.setItem("vs.muted", m ? "1" : "0");
  // 12/08/2026: o emoji NAO troca mais pra 🔇. O 📻 fica sempre 📻 — ligado ou
  // desligado — pro usuario entender que aquele lugar e a radio, que ele liga e
  // desliga ali. Quem mostra o estado e a classe .muted (apagado + riscado).
  const btn = document.getElementById("btn-mute");
  if (btn) { btn.innerHTML = '📻'; btn.classList.toggle("muted", m); }
  if (m) {
    try { window.speechSynthesis?.cancel(); } catch {}
    try { window.VSFalar?.parar?.(); } catch {}
    // Para todos os <audio> rolando (Pollinations TTS fallback)
    try { document.querySelectorAll("audio").forEach(a => { a.pause(); a.src = ""; }); } catch {}
  }
  try { window.VSLitoranea?.setTTS?.(!m); } catch {}
  try { window.VSLitoraneaAI?.setTTS?.(!m); } catch {}
}
aplicarMute(_muted);
// 12/08/2026 — O 📻 do cabeçalho LIGA E DESLIGA A RÁDIO (era só mute global).
// Um toque toca; outro toque desliga. A rádio acompanha a navegação: o
// vs-radio-global grava em vs.radio.on e retoma sozinho na página seguinte,
// e o parar derruba o stream em todo lugar (não fica baixando no silêncio).
// Mesmo comportamento do #ph-mute nas demais páginas.
// Sem o VSRadio carregado, cai no mute global de antes.
// Há DOIS motores de rádio no app e cada um tem nome diferente pro mesmo botão:
//   radio-fab.js (rodapé/index) -> VSRadio.toggle() / .tocando()
//   vs-radio-global.js (demais)  -> VSRadio.alternar() / .estado().tocando
// O vs-radio-global desiste se já existe um VSRadio, então na index quem manda
// é o radio-fab. Aceitamos os dois nomes pra não depender de qual carregou.
function vsRadioAlterna() {
  var R = window.VSRadio;
  if (!R) return false;
  if (typeof R.alternar === "function") { R.alternar(); return true; }
  if (typeof R.toggle === "function")   { R.toggle();   return true; }
  return false;
}
function vsRadioTocando() {
  var R = window.VSRadio;
  if (!R) return null;
  try {
    if (typeof R.tocando === "function") return !!R.tocando();
    if (typeof R.estado === "function")  return !!R.estado().tocando;
  } catch (e) {}
  return null;
}
function pintarRadioCabecalho() {
  var b = document.getElementById("btn-mute");
  if (!b) return;
  var t = vsRadioTocando();
  if (t === null) return;                 // sem motor: quem pinta é o aplicarMute
  b.innerHTML = "📻";                     // o emoji nunca muda
  b.classList.toggle("muted", !t);
  b.title = t ? "Rádio tocando — toque para parar" : "Tocar a rádio";
  b.setAttribute("aria-label", b.title);
}
document.getElementById("btn-mute")?.addEventListener("click", () => {
  if (vsRadioAlterna()) { setTimeout(pintarRadioCabecalho, 400); setTimeout(pintarRadioCabecalho, 1800); return; }
  aplicarMute(!_muted);
});
setTimeout(pintarRadioCabecalho, 800);
setTimeout(pintarRadioCabecalho, 2500);

// ─────────────────────────────────────────────────────────────
// 🔔 Notificações — preferências, permissão, histórico
// ─────────────────────────────────────────────────────────────
const NOTIF_CATEGORIAS = [
  { id: "promocoes", icone: "📅", titulo: "Promoções", desc: "Quando aparecer descontos e ofertas perto de você." },
  { id: "tempo",     icone: "🌦️", titulo: "Previsão do tempo", desc: "Tempo nos seus lugares: sol, chuva, alerta de ressaca e dia bom de praia." },
  { id: "eventos",   icone: "🎉", titulo: "Festas & acontecimentos", desc: "Festa, show e evento nos seus lugares preferidos." },
  { id: "jornal",    icone: "📰", titulo: "Notícias do Jornal", desc: "O que saiu no Jornal do Sul sobre seus lugares." },
  { id: "radio",     icone: "📻", titulo: "Rádio da Ilha", desc: "Programas, spots e novidades da rádio." },
  { id: "ingles",    icone: "🇬🇧", titulo: "Inglês na rádio", desc: "Aviso quando o bloco de aprendizado de inglês for ao ar." },
  { id: "jogo",      icone: "🎖️", titulo: "Jogo & títulos", desc: "Quando você ganhar título de bem-feitor ou subir no jogo." },
  { id: "votados",   icone: "⭐", titulo: "Mais Votados", desc: "Quando um lugar perto vira destaque do dia." },
  { id: "tesouro",   icone: "🗺️", titulo: "Caça ao Tesouro", desc: "Quando passar perto de um waypoint ativo." },
  { id: "coletiva",  icone: "🛒", titulo: "Compras Coletivas", desc: "Quando fechar grupo ou faltar pouco pra fechar." },
  { id: "carteira",  icone: "💰", titulo: "Carteira", desc: "Quando receber SulCoin ou alguém te transferir." },
  { id: "litoranea", icone: "🌊", titulo: "Litorânea", desc: "Quando a Litorânea tiver dica nova pra você." }
];
// 🎯 Gostos do usuário — vira dado agregado honesto pro comerciante (demanda_notif)
const NOTIF_INTERESSES = [
  { grupo: "🍽️ Comida", itens: [
    ["pizza","🍕 Pizza"],["hamburger","🍔 Hambúrguer"],["sushi","🍣 Japonês"],["pastel","🥟 Pastel"],
    ["frutos_mar","🦐 Frutos do mar"],["churrasco","🥩 Churrasco"],["acai","🍦 Açaí & sorvete"],
    ["cafe","☕ Café & padaria"],["vegano","🌱 Vegano & natural"],["cerveja","🍺 Bar & cerveja"] ]},
  { grupo: "🛒 Compras", itens: [
    ["mercado","🛒 Mercado"],["hortifruti","🥬 Hortifrúti"],["farmacia","💊 Farmácia"],
    ["moda","👕 Moda"],["pet","🐾 Pet"],["construcao","🔨 Construção"] ]},
  { grupo: "🌊 Vida na ilha", itens: [
    ["pousada","🛏️ Pousadas"],["barco","🚤 Passeios de barco"],["surf","🏄 Surf"],["pesca","🎣 Pesca"],
    ["trilha","🥾 Trilhas"],["artesanato","🎨 Artesanato"],["beleza","💇 Beleza"],["auto","🚗 Automotivo"] ]}
];
const NOTIF_INT_KEY   = "vs.notif.interesses";
const NOTIF_QUOTA_KEY = "vs.notif.quota";
const NOTIF_PREFS_KEY = "vs.notif.prefs";
const NOTIF_HIST_KEY  = "vs.notif.historico";

function getPrefsNotif() {
  try { return JSON.parse(localStorage.getItem("vs.notif.prefs") || "{}"); }
  catch { return {}; }
}
function savePrefsNotif(p) { localStorage.setItem("vs.notif.prefs", JSON.stringify(p)); sincronizarNotifPrefs(); }

// ── 🎯 Interesses (gostos) ──
function getInteressesNotif() {
  try { return JSON.parse(localStorage.getItem("vs.notif.interesses") || "[]"); }
  catch { return []; }
}
function saveInteressesNotif(arr) { localStorage.setItem("vs.notif.interesses", JSON.stringify(arr)); sincronizarNotifPrefs(); }

// ── 📊 Cota diária + silêncio noturno ──
function getQuotaNotif() {
  try { return { max: 3, so_dia: true, ...JSON.parse(localStorage.getItem("vs.notif.quota") || "{}") }; }
  catch { return { max: 3, so_dia: true }; }
}
function saveQuotaNotif(q) { localStorage.setItem("vs.notif.quota", JSON.stringify(q)); sincronizarNotifPrefs(); }

// ── ☁️ Sincroniza tudo pro servidor (RPC salvar_notif_prefs) — debounce 2s ──
// É isso que faz as preferências virarem dado real: o vigia de push filtra por
// elas e o comerciante enxerga a DEMANDA agregada (demanda_notif), nunca a pessoa.
let _syncNotifTimer = null;
function sincronizarNotifPrefs() {
  clearTimeout(_syncNotifTimer);
  _syncNotifTimer = setTimeout(async () => {
    try {
      await VSSupabase.ensureSession?.();
      const q = getQuotaNotif();
      await VSSupabase.rpc("salvar_notif_prefs", {
        p_prefs: {
          interesses: getInteressesNotif(),
          categorias: Object.fromEntries(NOTIF_CATEGORIAS.map(c => [c.id, getPrefsNotif()[c.id] !== false])),
          max_dia: q.max, so_dia: q.so_dia
        },
        p_lugares: getLocaisNotif(),
        p_estado: state.estado || null,
        p_cidade: state.cidade || null
      });
    } catch (e) { console.warn("[notif] sync:", e?.message || e); }
  }, 2000);
}

/* 12/08/2026 — AS PREFERÊNCIAS DE NOTIFICAÇÃO VOLTAM DA CONTA.
 * O sincronizarNotifPrefs() acima só MANDAVA pro servidor — não existia nada que
 * lesse de volta. Era mão única: a pessoa escolhia tudo no celular, ia pro banco,
 * e no computador o app lia o localStorage vazio e perguntava tudo de novo.
 * Agora, ao entrar logado, lê user_notif_prefs e reaplica aqui. (A PERMISSÃO do
 * navegador continua sendo por aparelho — isso é regra do navegador, não nossa.) */
async function vsNotifPuxarDaConta() {
  const h = _vsAuthHeaders(), uid = _vsUserId();
  if (!h || !uid) return;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/user_notif_prefs?user_id=eq.${uid}&select=prefs,lugares,estado,cidade&limit=1`,
      { headers: h });
    if (!r.ok) return;
    const linhas = await r.json();
    const row = Array.isArray(linhas) && linhas[0];
    if (!row) return;                               // conta nova: nada a restaurar
    const p = row.prefs || {};
    // só preenche o que este aparelho ainda não tem — nunca apaga escolha local
    if (Array.isArray(p.interesses) && !localStorage.getItem("vs.notif.interesses"))
      localStorage.setItem("vs.notif.interesses", JSON.stringify(p.interesses));
    if (p.categorias && !localStorage.getItem("vs.notif.prefs"))
      localStorage.setItem("vs.notif.prefs", JSON.stringify(p.categorias));
    if ((p.max_dia != null || p.so_dia != null) && !localStorage.getItem("vs.notif.quota"))
      localStorage.setItem("vs.notif.quota", JSON.stringify({ max: p.max_dia, so_dia: p.so_dia }));
    // strings literais de propósito: estas consts são declaradas mais abaixo no
    // arquivo, e ler a const aqui dependeria da ordem de execução.
    if (Array.isArray(row.lugares) && row.lugares.length && !localStorage.getItem("vs.notif.locais"))
      localStorage.setItem("vs.notif.locais", JSON.stringify(row.lugares));
    /* 17/08/2026 — REDESENHA TUDO, NAO SO OS INTERESSES.
     * Bug relatado pelo DJ: "as configuracoes de notificacao nao aparecem quando
     * eu entro, dai quando vou criar uma aparecem as que eu ja tinha".
     * Causa: a tela #notif e montada no boot, lendo o localStorage AINDA VAZIO;
     * a sessao chega 1,5s a 18s depois (o setInterval de baixo), esta funcao
     * grava as preferencias da conta no localStorage — e redesenhava so os
     * interesses. Categorias, cota e "Meus Lugares" continuavam mostrando o
     * estado de antes, ate que qualquer outra acao forcasse um redesenho.
     * Agora tudo que le esses dados e redesenhado junto. Cada um no seu try:
     * uma tela ausente nao pode derrubar as outras. */
    [ "renderInteressesNotif", "renderNotifCategorias", "renderQuotaNotif",
      "renderLocaisNotif", "renderNotifStatus" ].forEach(function (fn) {
      try { if (typeof window[fn] === "function") window[fn](); } catch (e) {}
    });
  } catch (e) {}
}
window.vsNotifPuxarDaConta = vsNotifPuxarDaConta;

/* Chamado quando a sessão existe: traz favoritos e preferências da conta. */
async function vsRestaurarDaConta() {
  if (!_vsUserId()) return;
  await vsFavsPuxarDaConta();
  await vsNotifPuxarDaConta();
}
window.vsRestaurarDaConta = vsRestaurarDaConta;
// a sessão pode chegar depois do boot (token renovando): tenta algumas vezes
(function () {
  let n = 0;
  const iv = setInterval(() => {
    if (_vsUserId()) { vsRestaurarDaConta(); clearInterval(iv); }
    if (++n > 12) clearInterval(iv);
  }, 1500);
  window.addEventListener("vs:login", vsRestaurarDaConta);
})();

function renderInteressesNotif() {
  const div = document.getElementById("notif-interesses");
  if (!div) return;
  const meus = getInteressesNotif();
  div.innerHTML = NOTIF_INTERESSES.map(g => `
    <div style="margin-top:10px">
      <div style="font-size:12px;color:var(--hint);font-weight:700;margin-bottom:6px">${g.grupo}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${g.itens.map(([id, rotulo]) => {
          const on = meus.includes(id);
          return `<span onclick="toggleInteresseNotif('${id}')" style="cursor:pointer;padding:7px 12px;border-radius:16px;font-size:12px;font-weight:600;background:${on?'rgba(6,182,212,0.25)':'rgba(255,255,255,0.06)'};color:${on?'var(--accent)':'var(--hint)'};border:1px solid ${on?'var(--accent)':'rgba(255,255,255,0.12)'}">${rotulo}</span>`;
        }).join("")}
      </div>
    </div>`).join("");
}
window.toggleInteresseNotif = function(id) {
  let meus = getInteressesNotif();
  const adicionou = !meus.includes(id);
  meus = adicionou ? [...meus, id] : meus.filter(x => x !== id);
  saveInteressesNotif(meus);
  renderInteressesNotif();
  // 🌉 Ponte: gosto marcado no sininho também vira memória da Litorânea,
  // pra ela usar no papo e nos matches de compra coletiva
  if (adicionou) {
    try {
      VSSupabase.rpc("litoranea_lembrar", { p_fato: "gosto: " + id, p_tipo: "gosto", p_importancia: 55 }).catch(() => {});
    } catch (e) {}
  }
};

function renderQuotaNotif() {
  const div = document.getElementById("notif-quota");
  if (!div) return;
  const q = getQuotaNotif();
  const OPCOES = [[1,"1 por dia"],[3,"3 por dia"],[5,"5 por dia"],[10,"10 por dia"],[999,"sem limite"]];
  div.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:6px">
      ${OPCOES.map(([n, rotulo]) => `<span onclick="setQuotaNotif(${n})" style="cursor:pointer;padding:7px 12px;border-radius:16px;font-size:12px;font-weight:600;background:${q.max===n?'rgba(6,182,212,0.25)':'rgba(255,255,255,0.06)'};color:${q.max===n?'var(--accent)':'var(--hint)'};border:1px solid ${q.max===n?'var(--accent)':'rgba(255,255,255,0.12)'}">${rotulo}</span>`).join("")}
    </div>
    <div onclick="toggleSoDiaNotif()" style="cursor:pointer;margin-top:10px;padding:9px 12px;border-radius:10px;font-size:12px;background:${q.so_dia?'rgba(6,182,212,0.15)':'rgba(255,255,255,0.05)'};border:1px solid ${q.so_dia?'var(--accent)':'rgba(255,255,255,0.12)'}">
      ${q.so_dia ? "🌙 <strong>Silêncio à noite ligado</strong> — nada entre 21h e 8h" : "🔔 Silêncio à noite desligado — pode chegar a qualquer hora"}
    </div>`;
}
window.setQuotaNotif = function(n) { const q = getQuotaNotif(); q.max = n; saveQuotaNotif(q); renderQuotaNotif(); };
window.toggleSoDiaNotif = function() { const q = getQuotaNotif(); q.so_dia = !q.so_dia; saveQuotaNotif(q); renderQuotaNotif(); };
function getHistoricoNotif() {
  try { return JSON.parse(localStorage.getItem(NOTIF_HIST_KEY) || "[]"); }
  catch { return []; }
}
function pushHistoricoNotif(item) {
  const h = getHistoricoNotif();
  h.unshift({ ...item, em: new Date().toISOString() });
  localStorage.setItem(NOTIF_HIST_KEY, JSON.stringify(h.slice(0, 30)));
}

async function renderNotifStatus() {
  const div = document.getElementById("notif-status");
  if (!div) return;
  if (!("Notification" in window)) {
    div.innerHTML = "❌ " + tr("notif_sem_suporte");
    return;
  }
  const perm = Notification.permission;

  // 04/08/2026 — ANTES esta tela olhava SO a permissao do navegador. Com ela ja
  // concedida, mostrava "✅" e um botao "testar" que disparava uma notificacao
  // LOCAL. Parecia funcionar e nao inscrevia nada: o aparelho nunca era
  // registrado no servidor, entao push de verdade jamais chegava.
  // Agora perguntamos as DUAS coisas: ha permissao? e este aparelho esta inscrito?
  let inscrito = false;
  try {
    const reg = await navigator.serviceWorker.ready;
    inscrito = !!(await reg.pushManager.getSubscription());
  } catch (e) {}

  // 06/08/2026 — inscrito no navegador ainda NÃO é "guardado no meu perfil".
  // A terceira pergunta: o aparelho chegou mesmo na device_tokens? (o RLS deixa
  // cada um ler os próprios tokens). Sem isso a tela dizia ✅ com a tabela vazia.
  let noPerfil = false;
  try {
    await VSSupabase.ensureSession?.();
    const uid = VSSupabase.userId?.();
    if (uid) {
      const r = await VSSupabase.request(
        "device_tokens?select=id&user_id=eq." + encodeURIComponent(uid) + "&limit=1");
      noPerfil = Array.isArray(r) && r.length > 0;
    }
  } catch (e) {}

  let ico, txt, btn, acao;
  if (perm === "denied") {
    ico = "🚫";
    txt = "Notificações BLOQUEADAS neste aparelho. Abra o cadeado 🔒 ao lado do endereço (ou Configurações do app) → Notificações → Permitir. Depois volte aqui.";
    btn = null; acao = null;
  } else if (perm !== "granted") {
    ico = "🟡"; txt = tr("notif_perm_default");
    btn = "🔔 " + tr("notif_btn_liberar"); acao = "ativar";
  } else if (!inscrito) {
    ico = "⚠️";
    txt = "Permissão liberada, mas este aparelho ainda NÃO está inscrito — por isso nada chega. Toque abaixo para concluir.";
    btn = "🔔 Concluir inscrição"; acao = "ativar";
  } else if (!noPerfil) {
    ico = "⚠️";
    txt = "Este aparelho está inscrito no navegador, mas ainda não aparece guardado no seu perfil — sem isso o servidor não sabe pra onde mandar. Toque abaixo pra gravar.";
    btn = "🔔 Guardar no meu perfil"; acao = "ativar";
  } else {
    ico = "✅"; txt = tr("notif_perm_granted") + " Aparelho guardado no seu perfil.";
    btn = "🧪 " + tr("notif_btn_testar"); acao = "testar";
  }

  div.innerHTML = `
    <div style="font-size:14px"><span style="font-size:24px">${ico}</span> ${escapeHtml(txt)}</div>
    ${btn ? `<button class="btn-primary" id="btn-notif-acao" style="margin-top:10px">${btn}</button>` : ""}`;

  document.getElementById("btn-notif-acao")?.addEventListener("click", async (ev) => {
    const b = ev.currentTarget;
    if (acao === "ativar") {
      b.disabled = true; const antes = b.textContent; b.textContent = "⏳ inscrevendo…";
      // NAO silencioso: se falhar, a pessoa precisa VER o motivo.
      let ok = false;
      try { ok = await window.ativarPush(false); } catch (e) {}
      b.disabled = false; b.textContent = antes;
      renderNotifStatus();
      if (ok) notificar({ titulo: "🌊 Vento Sul", corpo: tr("notif_boasvindas_corpo"), tag: "boas-vindas" });
    } else if (acao === "testar") {
      // urgente: o teste PRECISA aparecer sempre. Sem isto, a partir do 4o toque
      // no dia (cota=3) ou depois das 21h ele sumia sem dizer nada.
      notificar({ titulo: "🧪 Teste Vento Sul", corpo: tr("notif_teste_corpo"),
                  tag: "teste-" + Date.now(), categoria: "litoranea", urgente: true });
    }
  });
}

function renderNotifCategorias() {
  const div = document.getElementById("notif-categorias");
  if (!div) return;
  const prefs = getPrefsNotif();
  div.innerHTML = NOTIF_CATEGORIAS.map(c => `
    <div class="notif-cat ${prefs[c.id] !== false ? "ativa" : ""}" onclick="toggleNotifCat('${c.id}')">
      <span class="nc-ico">${c.icone}</span>
      <div class="nc-text"><strong>${c.titulo}</strong><small>${escapeHtml(c.desc)}</small></div>
      <div class="notif-toggle"></div>
    </div>
  `).join("");
}

window.toggleNotifCat = function(id) {
  const prefs = getPrefsNotif();
  prefs[id] = prefs[id] === false ? true : false;
  savePrefsNotif(prefs);
  renderNotifCategorias();
};

function renderHistoricoNotif() {
  const div = document.getElementById("notif-historico");
  if (!div) return;
  const hist = getHistoricoNotif();
  if (hist.length === 0) {
    div.innerHTML = "<p class='subtitle'>" + tr("notif_nenhuma") + "</p>";
    return;
  }
  div.innerHTML = hist.map(h => {
    const dt = new Date(h.em).toLocaleString("pt-BR");
    return `
      <div class="card-info" style="margin:6px 0">
        <strong>${escapeHtml(h.titulo)}</strong>
        <div style="font-size:12px;margin-top:4px">${escapeHtml(h.corpo || "")}</div>
        <small style="color:var(--hint)">${dt}${h.categoria ? " · " + h.categoria : ""}</small>
      </div>`;
  }).join("");
}

// Função pra disparar notificação respeitando categoria + permissão
window.notificar = function({ titulo, corpo, tag, categoria, icone, urgente }) {
  const prefs = getPrefsNotif();
  if (categoria && prefs[categoria] === false) return; // user desligou essa categoria
  // 📊 respeita a cota diária e o silêncio noturno (urgente fura os dois)
  if (!urgente) {
    const q = getQuotaNotif();
    const hora = new Date().getHours();
    if (q.so_dia && (hora >= 21 || hora < 8)) return;
    const hoje = new Date().toISOString().slice(0, 10);
    const enviadasHoje = getHistoricoNotif().filter(h => (h.em || "").slice(0, 10) === hoje).length;
    if (enviadasHoje >= (q.max || 3)) return;
  }
  pushHistoricoNotif({ titulo, corpo, categoria });
  renderHistoricoNotif();
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  // 04/08/2026: era `new Notification(...)`, que o Chrome do ANDROID PROIBE
  // ("Illegal constructor") — o teste morria calado no celular e funcionava no PC.
  // No Android so vale showNotification() da registration do service worker.
  const _op = {
    body: corpo,
    icon: icone || "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: tag || "vento-sul",
    silent: false
  };
  (async () => {
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) { await reg.showNotification(titulo, _op); return; }
      }
      new Notification(titulo, _op);            // desktop sem SW
    } catch (e) {
      try { new Notification(titulo, _op); } catch (e2) { console.warn("notif:", e2.message); }
    }
  })();
};

// ─── 📍 NOTIFICAÇÕES POR LOCALIDADE (multi-select) ───────────────
const NOTIF_LOCAIS_KEY = "vs.notif.locais";
function getLocaisNotif() {
  try { return JSON.parse(localStorage.getItem(NOTIF_LOCAIS_KEY) || "[]"); }
  catch { return []; }
}
function saveLocaisNotif(arr) { localStorage.setItem(NOTIF_LOCAIS_KEY, JSON.stringify(arr)); sincronizarNotifPrefs(); }

function renderLocaisNotif() {
  const div = document.getElementById("notif-locais");
  if (!div) return;
  const locais = getLocaisNotif();
  if (!locais.length) {
    div.innerHTML = `<div class="card-info" style="text-align:center;color:var(--hint)">
      Nenhuma localidade ainda. Toca em <strong>➕ Adicionar localidade</strong> pra escolher uma cidade ou bairro e que tipo de notificação quer dali.
    </div>`;
    return;
  }
  div.innerHTML = locais.map((l, idx) => {
    const cats = l.categorias || [];
    const titulo = [l.localidade, l.cidade, l.estado].filter(Boolean).join(" · ");
    const chips = NOTIF_CATEGORIAS.map(c => {
      const ativa = cats.includes(c.id);
      return `<span onclick="toggleCatLocal(${idx},'${c.id}')" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;margin:2px;border-radius:12px;cursor:pointer;font-size:11px;background:${ativa?'rgba(6,182,212,0.25)':'rgba(255,255,255,0.06)'};color:${ativa?'var(--accent)':'var(--hint)'};border:1px solid ${ativa?'var(--accent)':'rgba(255,255,255,0.1)'}">${c.icone} ${c.titulo}</span>`;
    }).join("");
    return `<div class="card-info" style="position:relative">
      <button onclick="removerLocalNotif(${idx})" style="position:absolute;top:6px;right:6px;background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.4);width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:14px">×</button>
      <strong>📍 ${escapeHtml(titulo)}</strong>
      <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:2px">${chips}</div>
    </div>`;
  }).join("");
}

window.toggleCatLocal = function(idx, catId) {
  const locais = getLocaisNotif();
  const l = locais[idx]; if (!l) return;
  l.categorias = l.categorias || [];
  if (l.categorias.includes(catId)) l.categorias = l.categorias.filter(x => x !== catId);
  else l.categorias.push(catId);
  saveLocaisNotif(locais);
  renderLocaisNotif();
};

window.removerLocalNotif = function(idx) {
  if (!confirm(tr("notif_remover_local_confirma"))) return;
  const locais = getLocaisNotif();
  locais.splice(idx, 1);
  saveLocaisNotif(locais);
  renderLocaisNotif();
};

window.abrirAddLocalNotif = function() {
  const ESTADOS = window.VSCidades?.ESTADOS || ["Paraná","Santa Catarina","Rio Grande do Sul"];
  const SUPA=(window.VENTOSUL_CONFIG?.SUPABASE_URL)||"https://vdrzndgkwdpibexjkyxi.supabase.co";
  const ANON=(window.VENTOSUL_CONFIG?.SUPABASE_ANON_JWT)||"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkcnpuZGdrd2RwaWJleGpreXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyODA0MTAsImV4cCI6MjA4Njg1NjQxMH0.pE1cUYQ-gL6iJfpeZREvTnG1R1sG2DGEnA_pB0tKx60";
  let fonte = parseInt(localStorage.getItem("vs.addl.fonte")||"16",10);
  let claro = localStorage.getItem("vs.addl.claro")==="1";
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:14px";
  overlay.innerHTML = ''
    + '<div id="addl-box" style="border-radius:16px;max-width:460px;width:100%;max-height:92vh;overflow:auto;box-shadow:0 12px 48px rgba(0,0,0,.6)">'
    + '<div id="addl-head" style="position:sticky;top:0;display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid rgba(128,128,128,.25)">'
    + '<strong style="flex:1;font-size:1.05em">📍 Adicionar lugar</strong>'
    + '<button id="addl-tema" title="tema claro/escuro" style="background:none;border:1px solid rgba(128,128,128,.4);border-radius:8px;padding:5px 9px;cursor:pointer;font-size:15px">🌓</button>'
    + '<button id="addl-menos" title="fonte menor" style="background:none;border:1px solid rgba(128,128,128,.4);border-radius:8px;padding:5px 10px;cursor:pointer;font-weight:800">A-</button>'
    + '<button id="addl-mais" title="fonte maior" style="background:none;border:1px solid rgba(128,128,128,.4);border-radius:8px;padding:5px 10px;cursor:pointer;font-weight:800">A+</button>'
    + '<button id="addl-x" title="fechar" style="background:none;border:1px solid rgba(128,128,128,.4);border-radius:8px;padding:5px 10px;cursor:pointer;font-weight:800">X</button>'
    + '</div>'
    + '<div id="addl-corpo" style="padding:16px">'
    + '<label style="font-size:.8em;opacity:.7;display:block;margin-bottom:3px">Estado *</label>'
    + '<select id="addl-estado" style="width:100%;padding:11px;border-radius:9px;margin-bottom:10px;border:1px solid rgba(128,128,128,.4)"><option value="">-- escolhe o estado --</option>' + ESTADOS.map(e => '<option value="'+e+'">'+e+'</option>').join("") + '</select>'
    + '<label style="font-size:.8em;opacity:.7;display:block;margin-bottom:3px">Cidade</label>'
    + '<select id="addl-cidade" style="width:100%;padding:11px;border-radius:9px;margin-bottom:10px;border:1px solid rgba(128,128,128,.4)"><option value="">-- toda a cidade --</option></select>'
    + '<label style="font-size:.8em;opacity:.7;display:block;margin-bottom:3px">Bairro ou praia</label>'
    + '<select id="addl-loc" style="width:100%;padding:11px;border-radius:9px;margin-bottom:4px;border:1px solid rgba(128,128,128,.4)"><option value="">-- toda a cidade --</option></select>'
    + '<input id="addl-loc-txt" placeholder="digite o nome" style="width:100%;padding:11px;border-radius:9px;margin-bottom:12px;border:1px solid rgba(128,128,128,.4);display:none">'
    + '<div style="display:flex;gap:8px">'
    + '<button id="addl-cancel" style="flex:1;background:rgba(128,128,128,0.3);border:0;padding:12px;border-radius:9px;cursor:pointer">Cancelar</button>'
    + '<button id="addl-ok" style="flex:2;background:var(--accent,#00d4ff);color:#012;border:0;padding:12px;border-radius:9px;cursor:pointer;font-weight:800">Adicionar</button>'
    + '</div></div></div>';
  document.body.appendChild(overlay);
  const box=overlay.querySelector("#addl-box");
  const selE=overlay.querySelector("#addl-estado");
  const selC=overlay.querySelector("#addl-cidade");
  const selL=overlay.querySelector("#addl-loc");
  const txtL=overlay.querySelector("#addl-loc-txt");
  function aplicar(){
    box.style.background = claro ? "#ffffff" : "var(--card,#131a23)";
    box.style.color = claro ? "#111" : "#fff";
    box.style.fontSize = fonte+"px";
    overlay.querySelectorAll("select,input").forEach(el=>{ el.style.background=claro?"#f2f4f7":"#0a0e14"; el.style.color=claro?"#111":"#fff"; el.style.fontSize=fonte+"px"; });
  }
  aplicar();
  overlay.querySelector("#addl-tema").onclick=()=>{ claro=!claro; localStorage.setItem("vs.addl.claro",claro?"1":"0"); aplicar(); };
  overlay.querySelector("#addl-mais").onclick=()=>{ fonte=Math.min(26,fonte+2); localStorage.setItem("vs.addl.fonte",fonte); aplicar(); };
  overlay.querySelector("#addl-menos").onclick=()=>{ fonte=Math.max(12,fonte-2); localStorage.setItem("vs.addl.fonte",fonte); aplicar(); };
  const fechar=()=>overlay.remove();
  overlay.querySelector("#addl-x").onclick=fechar;
  overlay.querySelector("#addl-cancel").onclick=fechar;
  overlay.addEventListener("click",e=>{ if(e.target===overlay) fechar(); });
  selE.onchange=()=>{
    const cidades=window.VSCidades?.cidadesDe?.(selE.value)||[];
    selC.innerHTML='<option value="">-- toda a cidade --</option>'+cidades.map(c=>'<option value="'+c+'">'+c+'</option>').join("");
    selL.innerHTML='<option value="">-- toda a cidade --</option>'; txtL.style.display="none"; aplicar();
  };
  selC.onchange=async()=>{
    selL.innerHTML='<option value="">-- toda a cidade --</option><option disabled>carregando...</option>';
    txtL.style.display="none";
    if(!selC.value){ selL.innerHTML='<option value="">-- toda a cidade --</option>'; return; }
    try{
      const url=SUPA+'/rest/v1/localidades?select=tipo,sublocal&cidade=eq.'+encodeURIComponent(selC.value)+'&estado=eq.'+encodeURIComponent(selE.value)+'&sublocal=not.is.null&order=tipo,sublocal&limit=300';
      const r=await fetch(url,{headers:{apikey:ANON,Authorization:"Bearer "+ANON}});
      const subs=r.ok?await r.json():[];
      const grupos={praia:[],bairro:[],atracao:[],outros:[]};
      for(const s2 of subs){ const t=(s2.tipo||"").toLowerCase(); const k=t.startsWith("praia")?"praia":t.startsWith("bairro")?"bairro":t.startsWith("atra")?"atracao":"outros"; (grupos[k]||grupos.outros).push(s2.sublocal); }
      const LAB={praia:"Praias",bairro:"Bairros",atracao:"Atracoes",outros:"Outros"};
      let html='<option value="">-- toda a cidade --</option>';
      for(const k of Object.keys(grupos)){ const arr=grupos[k]; if(!arr.length)continue; html+='<optgroup label="'+LAB[k]+'">'+[...new Set(arr)].map(n=>'<option value="'+n+'">'+n+'</option>').join("")+'</optgroup>'; }
      html+='<option value="__outro__">+ outro (digitar)</option>';
      selL.innerHTML=html; aplicar();
    }catch(_){ selL.innerHTML='<option value="">-- toda a cidade --</option><option value="__outro__">+ digitar o nome</option>'; }
  };
  selL.onchange=()=>{ txtL.style.display = selL.value==="__outro__" ? "block" : "none"; if(selL.value==="__outro__") txtL.focus(); };
  overlay.querySelector("#addl-ok").onclick=()=>{
    const estado=selE.value;
    if(!estado){ alert("Escolhe o estado primeiro"); return; }
    const cidade=selC.value||null;
    let localidade = selL.value==="__outro__" ? (txtL.value.trim()||null) : (selL.value||null);
    const locais=getLocaisNotif();
    locais.push({ estado, cidade, localidade, categorias: NOTIF_CATEGORIAS.map(c=>c.id) });
    saveLocaisNotif(locais); overlay.remove(); renderLocaisNotif();
  };
};

document.getElementById("btn-add-local-notif")?.addEventListener("click", abrirAddLocalNotif);

// Adapta notificar() pra checar locais (qualquer local que matche cidade/estado da notif passa)
const _notificarOriginal = window.notificar;
window.notificar = function(opts) {
  const locais = getLocaisNotif();
  // 04/08: faltavam parenteses — `a && b || c || d` amarra o && primeiro.
  if (locais.length && (opts.estado || opts.cidade || opts.localidade)) {
    const passa = locais.some(l => {
      if (l.estado && opts.estado && l.estado !== opts.estado) return false;
      if (l.cidade && opts.cidade && l.cidade !== opts.cidade) return false;
      if (l.localidade && opts.localidade && !opts.localidade.toLowerCase().includes(l.localidade.toLowerCase())) return false;
      if (opts.categoria && l.categorias && !l.categorias.includes(opts.categoria)) return false;
      return true;
    });
    if (!passa) return;
  }
  return _notificarOriginal?.(opts);
};

window.abrirNotif = function() {
  // abre a tela PRIMEIRO — nenhum render pode impedir a aba de aparecer
  try { showScreen("notif"); } catch (e) { console.warn("[notif] showScreen:", e); }
  try { renderNotifStatus(); }    catch (e) { console.warn("[notif] status:", e); }
  try { renderInteressesNotif(); } catch (e) { console.warn("[notif] interesses:", e); }
  try { renderNotifCategorias(); } catch (e) { console.warn("[notif] categorias:", e); }
  try { renderQuotaNotif(); }      catch (e) { console.warn("[notif] quota:", e); }
  try { renderLocaisNotif(); }     catch (e) { console.warn("[notif] locais:", e); }
  try { renderHistoricoNotif(); }  catch (e) { console.warn("[notif] historico:", e); }
};

document.getElementById("btn-notif")?.addEventListener("click", abrirNotif);

// ─────────────────────────────────────────────────────────────
// 🛠️ Painel Admin (only owner/admin) — long-press no logo "Vento Sul"
// ─────────────────────────────────────────────────────────────
async function _ehAdmin() {
  try {
    await VSSupabase.ensureSession?.();
    // Sem argumento — usa auth.uid() interno da RPC (mais confiável)
    const r = await VSSupabase.rpc("is_admin", {});
    return !!r;
  } catch (e) { console.warn("[Admin] is_admin:", e?.message || e); return false; }
}
window.abrirAdmin = async function() {
  await VSSupabase.ensureSession?.();
  const email = VSSupabase.userEmail?.();
  const uid = VSSupabase.userId?.();
  vslog("Admin: tentativa de abrir");
  showScreen("admin");
  // Injeta ícone flat no título Admin
  const tit = document.getElementById("admin-titulo");
  if (tit && !tit.dataset.flatok) {
    tit.dataset.flatok = "1";
    tit.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px;color:var(--zc-text)">${VSIcons.svg("settings", 22)}<span>Painel Admin</span></span>`;
  }
  if (!email) {
    _admMostraFormLogin();
    return;
  }
  if (!await _ehAdmin()) {
    document.getElementById("admin-saudacao").innerHTML =
      `<span style="display:inline-flex;align-items:center;gap:6px;color:var(--zc-negativo,#c0392b)">${VSIcons.svg("lock", 14)} ${escapeHtml(email)} não tem role admin/owner</span><br>
       <small>UID: ${escapeHtml((uid||"").slice(0,8))}…</small><br>
       <button class="btn-primary" style="margin-top:10px;display:inline-flex;align-items:center;gap:6px" onclick="VSSupabase.signOut().then(()=>abrirAdmin())">${VSIcons.svg("logout", 14)} Sair e logar com outra conta</button>`;
    document.querySelectorAll(".admin-painel").forEach(p => p.style.display = "none");
    document.querySelector(".admin-tabs").style.display = "none";
    return;
  }
  // É admin — mostra normal
  document.querySelector(".admin-tabs").style.display = "flex";
  document.getElementById("admin-saudacao").textContent =
    `Logado como ${email} · ${new Date().toLocaleString("pt-BR")}`;
  // Tabs
  document.querySelectorAll(".adm-tab").forEach(b =>
    b.onclick = () => admMostrarAba(b.dataset.aba));
  admMostrarAba("dashboard");
};

// Form de login inline na tela admin (quando user não tá logado)
function _admMostraFormLogin() {
  document.querySelector(".admin-tabs").style.display = "none";
  document.querySelectorAll(".admin-painel").forEach(p => p.style.display = "none");
  document.getElementById("admin-saudacao").innerHTML = `
    <div class="card-info" style="margin-top:10px">
      <h3 style="margin-top:0;display:flex;align-items:center;gap:8px">${VSIcons.svg("lock", 18)} ${tr("admin_login_titulo")}</h3>
      <p style="font-size:12px;color:var(--zc-hint,var(--hint))">Entra com a conta que tem role admin/owner.</p>
      <input id="adm-login-email" type="email" placeholder="email" autocomplete="email" style="margin:6px 0">
      <input id="adm-login-senha" type="password" placeholder="senha" autocomplete="current-password" style="margin:6px 0">
      <button class="btn-primary" style="width:100%;margin-top:8px;display:inline-flex;align-items:center;justify-content:center;gap:6px" onclick="admFazerLogin()">Entrar ${VSIcons.svg("arrow-up", 14)}</button>
      <small style="color:var(--zc-hint,var(--hint));display:block;margin-top:8px">
        Esquecu a senha? Vai em Sou comerciante → Recuperar.
      </small>
    </div>`;
}
window.admFazerLogin = async function() {
  const email = document.getElementById("adm-login-email")?.value?.trim();
  const senha = document.getElementById("adm-login-senha")?.value;
  if (!email || !senha) return alert("Email e senha");
  try {
    await VSSupabase.signIn(email, senha);
    abrirAdmin(); // re-roda agora logado — vai validar role e abrir painel
  } catch (e) {
    alert("Login falhou: " + (e.message || e));
  }
};

function admMostrarAba(aba) {
  document.querySelectorAll(".adm-tab").forEach(b =>
    b.classList.toggle("adm-ativo", b.dataset.aba === aba));
  document.querySelectorAll(".admin-painel").forEach(p => p.style.display = "none");
  const el = document.getElementById(`admin-painel-${aba}`);
  if (el) el.style.display = "block";
  if (aba === "dashboard") admDashboard();
  else if (aba === "usuarios") admUsuarios();
  else if (aba === "compras") admCompras();
  else if (aba === "audit") admAudit();
  else if (aba === "economia") renderAdminEconomia();
  else if (aba === "metricas") renderAdminMetricas();
  else if (aba === "saude") admSaude();
  else if (aba === "saques") admSaques();
  else if (aba === "carrosseis") admCarrosseis();
  else if (aba === "palavras") admPalavras();
  else if (aba === "mapa") admMapaBD();
}

// ─────────────────────────────────────────────────────────────
// 🗺️ ADMIN MAPA DO BD — diagrama visual das tabelas pra leigo
// Renderiza /mapa-dados.html dentro de iframe (mesmo origin, OK pelo CSP)
// ─────────────────────────────────────────────────────────────
function admMapaBD() {
  const div = document.getElementById("admin-painel-mapa");
  if (!div) return;
  if (div.dataset.carregado === "1") return;
  div.dataset.carregado = "1";
  div.innerHTML = `
    <p style="font-size:13px;color:var(--zc-hint);margin-bottom:10px">
      Mapa do banco de dados em linguagem leiga. Mostra tabelas, ligações, fluxo do dinheiro.
      <a href="/mapa-dados.html" target="_blank" style="color:var(--zc-accent);margin-left:8px">Abrir em nova aba ↗</a>
    </p>
    <iframe src="/mapa-dados.html" style="width:100%;height:calc(100vh - 220px);min-height:520px;border:1px solid rgba(255,255,255,0.10);border-radius:6px;background:#0a1722" title="Mapa do banco de dados"></iframe>
  `;
}

// ─────────────────────────────────────────────────────────────
// 🎠 ADMIN CARROSSEIS — CRUD visual dos 9 escopos
// ─────────────────────────────────────────────────────────────
const ADM_CARROSSEL_ESCOPOS = [
  { id: "geral",              nome: "Geral / Hero",              emoji: "🌟" },
  { id: "feira_digital",      nome: "Feira Digital",             emoji: "🛒" },
  { id: "mais_votados",       nome: "Mais Votados",              emoji: "⭐" },
  { id: "promocoes",          nome: "Promoções",                 emoji: "🔥" },
  { id: "compras_coletivas",  nome: "Compras Coletivas",         emoji: "🤝" },
  { id: "caca_tesouro",       nome: "Caça ao Tesouro",           emoji: "🗺️" },
  { id: "praias",             nome: "Praias",                    emoji: "🏖️" },
  { id: "aurora",             nome: "Aurora (jogo)",             emoji: "✨" },
  { id: "quests",             nome: "Quests Vivas",              emoji: "🌳" }
];
window._admCarrosselEscopo = "geral";

async function admCarrosseis() {
  const div = document.getElementById("admin-painel-carrosseis");
  const escopo = window._admCarrosselEscopo;
  div.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
      <label style="font-size:12px">Escopo:</label>
      <select id="adm-carr-escopo" onchange="admCarrosselTrocaEscopo(this.value)" style="flex:1;min-width:200px;padding:9px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.20);border-radius:8px;color:var(--text)">
        ${ADM_CARROSSEL_ESCOPOS.map(e => `
          <option value="${e.id}" ${e.id === escopo ? "selected" : ""}>${e.emoji} ${escapeHtml(e.nome)}</option>
        `).join("")}
      </select>
      <button class="btn-primary" style="background:rgba(13,114,62,0.55);font-size:12px;padding:9px 14px" onclick="admCarrosselNovo()">+ Novo item</button>
    </div>
    <p style="font-size:11px;color:var(--hint);margin:0 0 8px">Use ↑↓ pra reordenar. Toque na foto pra trocar. Toggle pra ativar/desativar sem deletar.</p>
    <div id="adm-carr-lista">
      <div class="loading" style="padding:30px;text-align:center;color:var(--hint)">Carregando…</div>
    </div>
  `;
  await admCarrosselRender();
}

window.admCarrosselTrocaEscopo = function(novo) {
  window._admCarrosselEscopo = novo;
  admCarrosselRender();
};

async function admCarrosselRender() {
  const lista = document.getElementById("adm-carr-lista");
  if (!lista) return;
  const escopo = window._admCarrosselEscopo;
  lista.innerHTML = `<div class="loading" style="padding:30px;text-align:center;color:var(--hint)">Carregando…</div>`;
  try {
    const items = await sb(`carrossel_landing?select=*&escopo=eq.${encodeURIComponent(escopo)}&order=ordem.asc&limit=200`).catch(() => []);
    if (!items.length) {
      lista.innerHTML = `<div class="card-info" style="padding:24px;text-align:center;color:var(--hint)">Nenhum item nesse escopo. Clique em <strong>"+ Novo item"</strong> pra começar.</div>`;
      return;
    }
    lista.innerHTML = items.map((it, i) => `
      <div class="card-info" style="margin:6px 0;padding:0;display:flex;gap:0;overflow:hidden;border-left:3px solid ${it.ativo ? "#4caf50" : "#9e9e9e"}">
        <div style="width:96px;height:96px;flex-shrink:0;background:${it.foto_url ? `url('${escapeHtml(it.foto_url)}') center/cover` : "rgba(255,255,255,0.06)"};display:flex;align-items:center;justify-content:center;font-size:28px;color:var(--hint)">${it.foto_url ? "" : "📷"}</div>
        <div style="flex:1;min-width:0;padding:8px 10px">
          <strong style="display:block;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(it.titulo || "(sem título)")}</strong>
          <small style="color:var(--hint);display:block;font-size:11px;line-height:1.3">${escapeHtml(it.subtitulo || "")}</small>
          <small style="color:var(--hint);display:block;font-size:10px;margin-top:2px">
            #${it.ordem ?? "-"} · ${escapeHtml(it.cidade || it.estado || "todas")}${it.sublocal ? " · " + escapeHtml(it.sublocal) : ""}
          </small>
        </div>
        <div style="display:flex;flex-direction:column;justify-content:space-between;padding:6px;gap:3px">
          <button class="btn-primary" style="padding:3px 8px;font-size:14px;background:rgba(255,255,255,0.10);min-width:32px" ${i === 0 ? "disabled style='opacity:0.3;padding:3px 8px;font-size:14px;background:rgba(255,255,255,0.10);min-width:32px'" : ""} onclick="admCarrosselMover('${it.id}', -1)">↑</button>
          <button class="btn-primary" style="padding:3px 8px;font-size:14px;background:rgba(255,255,255,0.10);min-width:32px" ${i === items.length - 1 ? "disabled style='opacity:0.3;padding:3px 8px;font-size:14px;background:rgba(255,255,255,0.10);min-width:32px'" : ""} onclick="admCarrosselMover('${it.id}', 1)">↓</button>
        </div>
        <div style="display:flex;flex-direction:column;justify-content:space-between;padding:6px;gap:3px">
          <button class="btn-primary" style="padding:5px 8px;font-size:11px;background:${it.ativo ? "rgba(76,175,80,0.55)" : "rgba(120,120,120,0.45)"}" onclick="admCarrosselToggle('${it.id}', ${!it.ativo})">${it.ativo ? "✓ ON" : "○ OFF"}</button>
          <button class="btn-primary" style="padding:5px 8px;font-size:11px;background:rgba(66,165,245,0.45)" onclick='admCarrosselEditar(${JSON.stringify(it).replace(/'/g, "&#39;").replace(/"/g, "&quot;")})'>✏️</button>
          <button class="btn-primary" style="padding:5px 8px;font-size:11px;background:rgba(229,57,53,0.45)" onclick="admCarrosselDeletar('${it.id}')">🗑</button>
        </div>
      </div>
    `).join("");
  } catch (e) {
    lista.innerHTML = `<p style="color:#f44">Erro: ${escapeHtml(e.message || e)}</p>`;
  }
}

window.admCarrosselToggle = async function(id, novoAtivo) {
  try {
    await VSSupabase.request(`carrossel_landing?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify({ ativo: novoAtivo, updated_at: new Date().toISOString() })
    });
    admCarrosselRender();
  } catch (e) { alert("Erro: " + (e.message || e)); }
};

window.admCarrosselDeletar = async function(id) {
  if (!confirm(tr("carr_confirma_deletar"))) return;
  try {
    await VSSupabase.request(`carrossel_landing?id=eq.${id}`, { method: "DELETE" });
    admCarrosselRender();
  } catch (e) { alert("Erro: " + (e.message || e)); }
};

window.admCarrosselMover = async function(id, delta) {
  // Pega lista atual ordenada
  const escopo = window._admCarrosselEscopo;
  const items = await sb(`carrossel_landing?select=id,ordem&escopo=eq.${encodeURIComponent(escopo)}&order=ordem.asc&limit=200`).catch(() => []);
  const idx = items.findIndex(x => x.id === id);
  if (idx < 0) return;
  const novoIdx = idx + delta;
  if (novoIdx < 0 || novoIdx >= items.length) return;
  const a = items[idx], b = items[novoIdx];
  // Troca ordens
  try {
    await VSSupabase.request(`carrossel_landing?id=eq.${a.id}`, {
      method: "PATCH", body: JSON.stringify({ ordem: b.ordem })
    });
    await VSSupabase.request(`carrossel_landing?id=eq.${b.id}`, {
      method: "PATCH", body: JSON.stringify({ ordem: a.ordem })
    });
    admCarrosselRender();
  } catch (e) { alert("Erro: " + (e.message || e)); }
};

window.admCarrosselNovo = function() {
  admCarrosselFormulario(null);
};

window.admCarrosselEditar = function(item) {
  admCarrosselFormulario(item);
};

function admCarrosselFormulario(item) {
  const escopo = window._admCarrosselEscopo;
  let modal = document.getElementById("modal-adm-carr");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-adm-carr";
    modal.className = "modal-bg";
    modal.style.zIndex = "9750";
    modal.innerHTML = `<div class="modal" style="max-width:560px;width:96%;max-height:92vh;overflow-y:auto"></div>`;
    document.body.appendChild(modal);
  }
  const it = item || { escopo, ordem: 100, ativo: true };
  modal.querySelector(".modal").innerHTML = `
    <h3>${item ? "✏️ Editar" : "➕ Novo"} item · escopo <code>${escapeHtml(escopo)}</code></h3>
    <p style="font-size:11px;color:var(--hint);margin:6px 0 14px">Foto vai pra <code>feira-fotos/carrossel/</code>. Estado/cidade vazios = aparece pra todo mundo.</p>
    <label style="display:block;font-size:12px;margin-bottom:4px">📷 Foto</label>
    <div id="ac-foto-prev" style="height:140px;border-radius:10px;background:${it.foto_url ? `url('${escapeHtml(it.foto_url)}') center/cover` : "rgba(255,255,255,0.06)"};margin-bottom:6px;display:flex;align-items:center;justify-content:center;font-size:32px;color:var(--hint)">${it.foto_url ? "" : "📷"}</div>
    <input type="file" id="ac-foto-input" accept="image/*" style="display:none">
    <button class="btn-primary" style="width:100%;font-size:12px;padding:8px;background:rgba(255,255,255,0.10);margin-bottom:10px" onclick="document.getElementById('ac-foto-input').click()">📸 ${it.foto_url ? "Trocar foto" : "Escolher foto"}</button>
    <div id="ac-foto-status" style="font-size:11px;color:var(--hint);margin-bottom:8px"></div>

    <label style="display:block;font-size:12px;margin-bottom:4px">Título</label>
    <input id="ac-titulo" type="text" maxlength="80" value="${escapeHtml(it.titulo || "")}" style="width:100%;padding:9px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.20);border-radius:8px;color:var(--text);margin-bottom:8px">

    <label style="display:block;font-size:12px;margin-bottom:4px">Subtítulo (opcional)</label>
    <input id="ac-sub" type="text" maxlength="120" value="${escapeHtml(it.subtitulo || "")}" style="width:100%;padding:9px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.20);border-radius:8px;color:var(--text);margin-bottom:8px">

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div>
        <label style="display:block;font-size:12px;margin-bottom:4px">Estado (opcional)</label>
        <input id="ac-estado" type="text" placeholder="ex: Paraná" value="${escapeHtml(it.estado || "")}" style="width:100%;padding:9px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.20);border-radius:8px;color:var(--text)">
      </div>
      <div>
        <label style="display:block;font-size:12px;margin-bottom:4px">Cidade (opcional)</label>
        <input id="ac-cidade" type="text" placeholder="ex: Antonina" value="${escapeHtml(it.cidade || "")}" style="width:100%;padding:9px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.20);border-radius:8px;color:var(--text)">
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div>
        <label style="display:block;font-size:12px;margin-bottom:4px">Sublocal (opcional)</label>
        <input id="ac-sublocal" type="text" placeholder="ex: Centro Histórico" value="${escapeHtml(it.sublocal || "")}" style="width:100%;padding:9px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.20);border-radius:8px;color:var(--text)">
      </div>
      <div>
        <label style="display:block;font-size:12px;margin-bottom:4px">Ordem</label>
        <input id="ac-ordem" type="number" value="${it.ordem ?? 100}" style="width:100%;padding:9px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.20);border-radius:8px;color:var(--text)">
      </div>
    </div>

    <label style="display:block;font-size:12px;margin-bottom:4px">Atribuição (opcional, ex: foto via Unsplash)</label>
    <input id="ac-atrib" type="text" maxlength="200" value="${escapeHtml(it.atribuicao || "")}" style="width:100%;padding:9px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.20);border-radius:8px;color:var(--text);margin-bottom:8px">

    <label style="display:flex;align-items:center;gap:8px;margin:10px 0;cursor:pointer">
      <input id="ac-ativo" type="checkbox" ${it.ativo === false ? "" : "checked"}>
      <span style="font-size:13px">Ativo (aparece no carrossel)</span>
    </label>

    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn-primary" style="flex:1;background:rgba(120,120,120,0.4)" onclick="document.getElementById('modal-adm-carr').style.display='none'">Cancelar</button>
      <button class="btn-primary" id="ac-salvar" style="flex:2;background:rgba(13,114,62,0.65)" onclick="admCarrosselSalvar('${item ? item.id : ""}')">💾 Salvar</button>
    </div>
  `;
  modal.style.display = "flex";
  // Wire upload
  let novaFoto = null;
  document.getElementById("ac-foto-input").addEventListener("change", async ev => {
    const f = ev.target.files?.[0];
    if (!f) return;
    const stEl = document.getElementById("ac-foto-status");
    stEl.textContent = "Processando…";
    try {
      const blob = await comprimirImagem(f, 1400, 0.85);
      const path = `carrossel/${escopo}/${Date.now()}.webp`;
      const url = await VSSupabase.uploadFile("feira-fotos", path, blob);
      novaFoto = url;
      document.getElementById("ac-foto-prev").style.background = `url('${url}') center/cover`;
      document.getElementById("ac-foto-prev").textContent = "";
      stEl.textContent = "✓ Foto carregada";
      stEl.style.color = "#4caf50";
      window._acNovaFoto = url;
    } catch (e) {
      stEl.textContent = "Erro: " + (e.message || e);
      stEl.style.color = "#f44";
    }
  });
  window._acNovaFoto = null;
}

window.admCarrosselSalvar = async function(id) {
  const escopo = window._admCarrosselEscopo;
  const dados = {
    escopo,
    titulo:    document.getElementById("ac-titulo").value.trim() || null,
    subtitulo: document.getElementById("ac-sub").value.trim() || null,
    estado:    document.getElementById("ac-estado").value.trim() || null,
    cidade:    document.getElementById("ac-cidade").value.trim() || null,
    sublocal:  document.getElementById("ac-sublocal").value.trim() || null,
    ordem:     parseInt(document.getElementById("ac-ordem").value, 10) || 100,
    atribuicao: document.getElementById("ac-atrib").value.trim() || null,
    ativo:     document.getElementById("ac-ativo").checked,
    updated_at: new Date().toISOString()
  };
  if (window._acNovaFoto) dados.foto_url = window._acNovaFoto;
  if (!dados.titulo) { alert("Título obrigatório."); return; }

  const btn = document.getElementById("ac-salvar");
  btn.disabled = true; btn.textContent = "Salvando…";
  try {
    if (id) {
      await VSSupabase.request(`carrossel_landing?id=eq.${id}`, {
        method: "PATCH", body: JSON.stringify(dados)
      });
    } else {
      // Cria
      if (!dados.foto_url) { alert("Foto obrigatória pra novo item."); btn.disabled = false; btn.textContent = "💾 Salvar"; return; }
      dados.created_at = new Date().toISOString();
      await VSSupabase.request("carrossel_landing", {
        method: "POST", body: JSON.stringify(dados)
      });
    }
    document.getElementById("modal-adm-carr").style.display = "none";
    admCarrosselRender();
  } catch (e) {
    alert("Erro: " + (e.message || e));
  } finally {
    btn.disabled = false; btn.textContent = "💾 Salvar";
  }
};

async function admSaques() {
  const div = document.getElementById("admin-painel-saques");
  div.innerHTML = `<p class="subtitle">Carregando…</p>`;
  try {
    const lista = await sb("v_saques_admin?select=*&limit=80").catch(() => []);
    if (!lista.length) { div.innerHTML = `<p class='subtitle'>Sem saques.</p>`; return; }
    const fmt = c => "R$ " + ((c || 0) / 100).toFixed(2);
    const corStatus = { pendente:"#ff9800", aprovado:"#42a5f5", pago:"#4caf50", rejeitado:"#e53935", cancelado:"#9e9e9e" };
    const counts = lista.reduce((a,s) => ((a[s.status] = (a[s.status]||0)+1), a), {});
    div.innerHTML = `
      <div class="adm-grid" style="grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:6px;margin-bottom:14px">
        <div class="adm-stat"><div class="adm-stat-val" style="color:#ff9800">${counts.pendente||0}</div><div class="adm-stat-l">${tr("status_pendentes")}</div></div>
        <div class="adm-stat"><div class="adm-stat-val" style="color:#42a5f5">${counts.aprovado||0}</div><div class="adm-stat-l">${tr("status_aprovados")}</div></div>
        <div class="adm-stat"><div class="adm-stat-val" style="color:#4caf50">${counts.pago||0}</div><div class="adm-stat-l">${tr("status_pagos")}</div></div>
        <div class="adm-stat"><div class="adm-stat-val" style="color:#e53935">${counts.rejeitado||0}</div><div class="adm-stat-l">${tr("status_rejeitados")}</div></div>
      </div>
      ${lista.map(s => `
        <div class="adm-compra" style="border-left:3px solid ${corStatus[s.status] || "#666"}">
          <div style="flex:1;min-width:0">
            <strong>${fmt(s.valor_centavos)}</strong> · ${escapeHtml(s.user_email || s.user_id?.slice(0,8) || "?")}
            <br><small style="color:var(--hint)">${escapeHtml(s.tipo_chave)} · <code style="font-family:monospace">${escapeHtml(s.chave_pix)}</code></small>
            <br><small style="color:var(--hint)">${new Date(s.criado_em).toLocaleString("pt-BR")} · status: <strong style="color:${corStatus[s.status]}">${s.status}</strong></small>
            ${s.motivo ? `<br><small style="color:#ff7043">⚠️ ${escapeHtml(s.motivo)}</small>` : ""}
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${s.status === "pendente" ? `
              <button class="btn-primary" style="padding:6px 12px;font-size:11px;background:rgba(66,165,245,0.55)" onclick="admSaqueAcao('${s.id}','aprovado')">${tr("btn_aprovar")}</button>
              <button class="btn-primary" style="padding:6px 12px;font-size:11px;background:rgba(229,57,53,0.55)" onclick="admSaqueAcao('${s.id}','rejeitado')">Rejeitar</button>
            ` : ""}
            ${s.status === "aprovado" ? `
              <button class="btn-primary" style="padding:6px 12px;font-size:11px;background:rgba(76,175,80,0.65)" onclick="admSaqueAcao('${s.id}','pago')">${tr("btn_marcar_pago")}</button>
              <button class="btn-primary" style="padding:6px 12px;font-size:11px;background:rgba(229,57,53,0.55)" onclick="admSaqueAcao('${s.id}','rejeitado')">Rejeitar</button>
            ` : ""}
          </div>
        </div>
      `).join("")}`;
  } catch (e) {
    div.innerHTML = `<p style="color:#f44">Erro: ${escapeHtml(e.message || e)}</p>`;
  }
}

window.admSaqueAcao = async function(id, novoStatus) {
  let motivo = null;
  if (novoStatus === "rejeitado") {
    motivo = prompt("Motivo da rejeição (vai pro comerciante):");
    if (!motivo) return;
  } else if (novoStatus === "pago") {
    if (!confirm("Confirma que o Pix JÁ FOI feito? Marca como pago.")) return;
  } else if (novoStatus === "aprovado") {
    if (!confirm("Aprovar este saque? (você vai precisar fazer o Pix manualmente em seguida)")) return;
  }
  try {
    await VSSupabase.rpc("admin_processar_saque", {
      p_saque_id: id, p_novo_status: novoStatus, p_motivo: motivo
    });
    admSaques();
  } catch (e) { alert("Erro: " + (e.message || e)); }
};

async function admSaude() {
  const div = document.getElementById("admin-painel-saude");
  div.innerHTML = `<p class="subtitle">Carregando…</p>`;
  try {
    const r = await VSSupabase.rpc("admin_saude_dashboard");
    const d = r && typeof r === "object" ? r : {};
    const banco    = d.banco || {};
    const top      = d.top_tabelas || [];
    const litor    = d.litoranea_hoje || {};
    const cnt      = d.contagens || {};
    const dicas    = d.dicas || [];
    const pctBanco = Math.min(100, Number(banco.pct_uso || 0));
    const corBanco = pctBanco > 80 ? "#e53935" : pctBanco > 60 ? "#ff9800" : "#4caf50";
    const litorPct = litor.limite ? Math.round((litor.chamadas || 0) / litor.limite * 100) : 0;
    const corLitor = litorPct > 80 ? "#e53935" : litorPct > 60 ? "#ff9800" : "#4caf50";

    const card = (label, val, sub) => `
      <div class="adm-stat" style="text-align:center">
        <div class="adm-stat-val" style="font-size:18px;font-weight:700">${escapeHtml(String(val ?? "—"))}</div>
        <div class="adm-stat-l">${escapeHtml(label)}</div>
        ${sub ? `<small style="color:var(--hint);font-size:10px;display:block;margin-top:2px">${escapeHtml(sub)}</small>` : ""}
      </div>`;

    div.innerHTML = `
      <h3 style="margin:8px 0">🗄️ Banco Postgres</h3>
      <div class="card-info" style="padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
          <strong style="font-size:18px">${banco.mb ?? 0} MB</strong>
          <span style="color:${corBanco};font-weight:700">${pctBanco}% de ${banco.limite_free_mb || 500} MB free</span>
        </div>
        <div style="height:14px;background:rgba(255,255,255,0.10);border-radius:7px;overflow:hidden">
          <div style="width:${pctBanco}%;height:100%;background:${corBanco};transition:width 0.4s"></div>
        </div>
        <small style="color:var(--hint);display:block;margin-top:6px">Plano free Supabase: 500 MB. Acima disso → Pro ($25/mês) ou limpeza de tabelas grandes.</small>
      </div>

      <h3 style="margin:14px 0 8px">📦 Top 10 tabelas por tamanho</h3>
      <div class="card-info" style="padding:8px;font-size:12px">
        ${top.length === 0 ? "<p class='subtitle'>Sem dados.</p>" : top.map((t, i) => `
          <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
            <div style="width:24px;text-align:right;color:var(--hint)">${i+1}</div>
            <div style="flex:1;min-width:0;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(t.nome)}</div>
            <div style="text-align:right;min-width:80px"><strong>${t.mb} MB</strong></div>
            <div style="text-align:right;min-width:90px;color:var(--hint)">${(t.linhas || 0).toLocaleString("pt-BR")} linhas</div>
          </div>
        `).join("")}
      </div>

      <h3 style="margin:14px 0 8px">🌊 Litorânea AI hoje</h3>
      <div class="card-info" style="padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
          <strong style="font-size:18px">${litor.chamadas ?? 0} / ${litor.limite ?? 9000}</strong>
          <span style="color:${corLitor};font-weight:700">${litorPct}% da cota Llama</span>
        </div>
        <div style="height:10px;background:rgba(255,255,255,0.10);border-radius:5px;overflow:hidden;margin-bottom:8px">
          <div style="width:${Math.min(100, litorPct)}%;height:100%;background:${corLitor};transition:width 0.4s"></div>
        </div>
        <div class="adm-grid" style="grid-template-columns:repeat(4,1fr);gap:6px">
          ${card("Cache hits", litor.bypassed ?? 0, "respostas grátis")}
          ${card("Fallback", litor.fallbacks ?? 0, "Pollinations")}
          ${card("Erros", litor.erros ?? 0, "Llama+Pollin falharam")}
          ${card("Limite", litor.limite ?? 9000, "neurons/dia")}
        </div>
      </div>

      <h3 style="margin:14px 0 8px">🧮 Contagens vivas</h3>
      <div class="adm-grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
        ${card("Users total", cnt.users_total ?? 0, "auth.users")}
        ${card("Ativos 24h", cnt.users_24h ?? 0, "last_sign_in")}
        ${card("Ativos 30d", cnt.users_30d ?? 0, "last_sign_in")}
        ${card("Comerciantes", cnt.comerciantes ?? 0, "")}
        ${card("Barracas", cnt.barracas ?? 0, "")}
        ${card("Ofertas ativas", cnt.ofertas_ativas ?? 0, "")}
        ${card("Coletivas abertas", cnt.coletivas_abertas ?? 0, "")}
        ${card("Pool SC (R$)", "R$ " + ((cnt.sc_pool_centavos || 0) / 100).toFixed(2), "lastro")}
        ${card("Cidades seedadas", cnt.cidades_seedadas ?? 0, "cidades_info")}
        ${cnt.quests_abertas != null ? card("Quests abertas", cnt.quests_abertas, "") : ""}
        ${cnt.quests_andamento != null ? card("Quests em ação", cnt.quests_andamento, "") : ""}
        ${cnt.quests_derrotadas != null ? card("Quests derrotadas", cnt.quests_derrotadas, "") : ""}
        ${cnt.quests_evidencias_pendentes != null ? card("Evidências pendentes", cnt.quests_evidencias_pendentes, "aprovar") : ""}
        ${cnt.dooh_lojas_ativas != null ? card("Lojas DOOH", cnt.dooh_lojas_ativas, "") : ""}
        ${cnt.dooh_pulsos_vivos != null ? card("DOOH ativos", cnt.dooh_pulsos_vivos, "TTL 5min") : ""}
        ${cnt.litoranea_cache_total != null ? card("Cache Litorânea", cnt.litoranea_cache_total, cnt.litoranea_cache_hits + " hits totais") : ""}
      </div>

      <h3 style="margin:14px 0 8px">💡 Dicas</h3>
      <div class="card-info" style="padding:12px;font-size:12px;line-height:1.6">
        ${dicas.map(d => `<div>• ${escapeHtml(d)}</div>`).join("")}
        <div>• <strong>Egress real do Storage</strong>: <a href="https://supabase.com/dashboard/project/vdrzndgkwdpibexjkyxi/settings/usage" target="_blank" style="color:var(--primary)">Supabase Dashboard → Settings → Usage</a></div>
      </div>

      <p style="font-size:11px;color:var(--hint);text-align:center;margin-top:14px">Snapshot ${new Date(d.gerado_em || Date.now()).toLocaleString("pt-BR")}</p>
    `;
  } catch (e) {
    div.innerHTML = `<p style="color:#f44">Erro: ${escapeHtml(e.message || String(e))}</p>`;
  }
}

async function admDashboard() {
  const div = document.getElementById("admin-painel-dashboard");
  div.innerHTML = `<p class="subtitle">Carregando…</p>`;

  // Busca em paralelo: view legada + métricas rádio/plataforma
  const [arr, nowplayingArr, totalPerfis, totalComerciantes, spotsAtivos, acontecimentosHoje] = await Promise.all([
    sb("v_admin_dashboard?select=*").catch(() => []),
    sb("radio_nowplaying?select=estacao,titulo&limit=1&order=atualizado_em.desc").catch(() => []),
    sb("perfis?select=id&limit=1&head=true").catch(() => null),
    sb("comerciante_negocio?select=id&limit=1&head=true").catch(() => null),
    sb("radio_spots?ativo=eq.true&select=id&limit=1&head=true").catch(() => null),
    sb("radio_acontecimentos?select=id&foi_ao_ar_em=gt." + new Date(Date.now() - 86400000).toISOString() + "&limit=1&head=true").catch(() => null),
  ]);

  const d = arr?.[0] || {};

  // HEAD requests retornam objeto com Content-Range header — VSSupabase.request retorna array vazio + header
  // Fallback: tenta count via select com prefer=count=exact
  const [cntPerfis, cntComerciantes, cntSpots, cntAcontecimentos] = await Promise.all([
    sb("perfis?select=id").catch(() => []),
    sb("comerciante_negocio?select=id").catch(() => []),
    sb("radio_spots?ativo=eq.true&select=id").catch(() => []),
    sb("radio_acontecimentos?select=id&foi_ao_ar_em=gt." + new Date(Date.now() - 86400000).toISOString()).catch(() => []),
  ]);

  const nowplaying = nowplayingArr?.[0] || null;
  const estacaoAtual = nowplaying ? `${nowplaying.estacao}${nowplaying.titulo ? " · " + nowplaying.titulo.slice(0, 28) : ""}` : "—";

  const card = (ico, label, val, cor = "#ffb300") =>
    `<div class="adm-stat"><div class="adm-stat-ico" style="color:${cor}">${ico}</div>
      <div><div class="adm-stat-val">${val ?? 0}</div><div class="adm-stat-l">${label}</div></div></div>`;

  const cardLink = (ico, label, href, cor = "#7af0ff") =>
    `<a href="${href}" target="_blank" rel="noopener" class="adm-stat" style="text-decoration:none;cursor:pointer">
      <div class="adm-stat-ico" style="color:${cor}">${ico}</div>
      <div><div class="adm-stat-val" style="font-size:11px;word-break:break-all">${label}</div></div></a>`;

  div.innerHTML = `
    <div style="margin-bottom:10px;padding:8px 10px;background:rgba(6,182,212,0.10);border:1px solid rgba(6,182,212,0.28);border-radius:10px;font-size:12px;color:#7af0ff">
      📻 <strong>${tr("dash_no_ar")}</strong> ${escapeHtml(estacaoAtual)}
    </div>
    <div class="adm-grid">
      ${card("🚫", tr("dash_moderacao_pendente"), d.moderacao_pendente, "#e53935")}
      ${card("📷", tr("dash_fotos_bloqueadas"), d.fotos_bloqueadas, "#e53935")}
      ${card("👥", tr("dash_users_cadastrados"), cntPerfis.length, "#9c27b0")}
      ${card("🛒", "Comerciantes", cntComerciantes.length || d.total_comerciantes, "#4caf50")}
      ${card("💰", tr("dash_spots_ativos"), cntSpots.length, "#ffb300")}
      ${card("📊", tr("dash_acontecimentos_24h"), cntAcontecimentos.length, "#42a5f5")}
      ${card("👁️", "Views 24h", d.views_24h, "#42a5f5")}
      ${card("📈", "Views 30d", d.views_30d, "#42a5f5")}
      ${card("👥", "Users ativos 30d", d.users_ativos_30d, "#9c27b0")}
      ${card("💰", "Receita ads 30d", "R$ " + (Number(d.receita_ads_30d || 0)).toFixed(2), "#ffb300")}
      ${card("📢", tr("dash_anuncios_ativos"), d.anuncios_ativos, "#ff9800")}
    </div>
    <div style="margin-top:10px">
      ${cardLink("🌐", "@ventosultech.bsky.social", "https://bsky.app/profile/ventosultech.bsky.social", "#1d9bf0")}
    </div>`;
}

async function admUsuarios() {
  const div = document.getElementById("admin-painel-usuarios");
  div.innerHTML = `<p class="subtitle">Carregando…</p>`;
  const us = await sb("v_users_roles_admin?select=*&order=created_at.desc&limit=80").catch(() => []);
  if (!us.length) { div.innerHTML = "<p class='subtitle'>Nada.</p>"; return; }
  div.innerHTML = us.map(u => `
    <div class="adm-user">
      <div style="flex:1;min-width:0">
        <strong style="display:block;font-size:13px;word-break:break-all">${escapeHtml(u.email || "(sem email)")}</strong>
        <small style="color:var(--hint)">${(u.user_uuid||"").slice(0,8)}… · criado ${new Date(u.created_at).toLocaleDateString("pt-BR")}</small>
        ${u.last_sign_in_at ? `<small style="color:var(--hint);display:block">Últ login: ${new Date(u.last_sign_in_at).toLocaleString("pt-BR")}</small>` : ""}
      </div>
      <select class="adm-role-sel" data-uid="${u.user_uuid}" onchange="admMudarRole(this)">
        ${["user","comerciante","moderator","admin","owner"].map(r =>
          `<option value="${r}"${r===u.role?" selected":""}>${r}</option>`).join("")}
      </select>
    </div>`).join("");
}
window.admMudarRole = async function(sel) {
  const uid = sel.dataset.uid;
  const role = sel.value;
  if (!confirm(`Promover ${uid.slice(0,8)}… pra '${role}'?`)) {
    admUsuarios(); // recarrega pra reverter dropdown
    return;
  }
  try {
    await VSSupabase.rpc("admin_set_role", { p_user_uuid: uid, p_role: role });
    alert("✓ Role alterada");
  } catch (e) { alert("Erro: " + (e.message || e)); admUsuarios(); }
};

async function admCompras() {
  const div = document.getElementById("admin-painel-compras");
  div.innerHTML = `<p class="subtitle">Carregando…</p>`;
  // Compras de barraca aguardando confirmação (dono_uuid IS NULL = pendente)
  const cs = await sb("feira_compras?select=*&order=created_at.desc&limit=40").catch(() => []);
  if (!cs.length) { div.innerHTML = "<p class='subtitle'>Sem compras pendentes.</p>"; return; }
  div.innerHTML = cs.map(c => `
    <div class="adm-compra">
      <div style="flex:1">
        <strong>${escapeHtml(c.codigo_recibo || c.id?.slice(0,8))}</strong> · ${escapeHtml(c.cidade||"-")}/${escapeHtml(c.estado||"-")}
        <br><small style="color:var(--hint)">${escapeHtml(c.barraca_nome||"")} · ${(c.valor_centavos/100).toFixed(2)} R$ · ${new Date(c.created_at).toLocaleDateString("pt-BR")}</small>
        ${c.dono_uuid ? '<br><small style="color:#4caf50">✓ confirmada</small>' : ''}
      </div>
      ${!c.dono_uuid ? `<button class="btn-primary" style="padding:6px 14px;font-size:12px" onclick="admConfirmarCompra('${c.id}')">Confirmar</button>` : ''}
    </div>`).join("");
}
window.admConfirmarCompra = async function(id) {
  if (!confirm("Confirmar compra " + id.slice(0,8) + "…?")) return;
  try {
    await VSSupabase.rpc("admin_confirmar_compra", { p_compra_id: id });
    alert("✓ Compra confirmada");
    admCompras();
  } catch (e) { alert("Erro: " + (e.message || e)); }
};

async function admAudit() {
  const div = document.getElementById("admin-painel-audit");
  div.innerHTML = `<p class="subtitle">Carregando…</p>`;
  const logs = await sb("admin_audit_log?select=*&order=created_at.desc&limit=40").catch(() => []);
  if (!logs.length) { div.innerHTML = "<p class='subtitle'>Sem ações registradas.</p>"; return; }
  div.innerHTML = logs.map(l => `
    <div class="adm-log">
      <div class="adm-log-head">
        <strong>${escapeHtml(l.acao)}</strong>
        <small>${new Date(l.created_at).toLocaleString("pt-BR")}</small>
      </div>
      <small style="color:var(--hint)">${escapeHtml(l.alvo_tabela||"")} · ${escapeHtml((l.alvo_id||"").slice(0,16))} · uid ${(l.user_uuid||"").slice(0,8)}…</small>
      ${l.detalhes ? `<pre class="adm-log-det">${escapeHtml(JSON.stringify(l.detalhes).slice(0,180))}</pre>` : ''}
    </div>`).join("");
}

async function admPalavras() {
  const div = document.getElementById("admin-painel-palavras");
  div.innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:12px">
      <input id="adm-palavra-in" type="text" placeholder="palavra a bloquear"
        style="flex:1;padding:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.20);border-radius:8px;color:var(--text)">
      <button class="btn-primary" onclick="admAddPalavra()">+ Add</button>
    </div>
    <div id="adm-palavras-lista"><p class="subtitle">Carregando…</p></div>`;
  const ps = await sb("palavras_proibidas?select=padrao&order=padrao.asc&limit=200").catch(() => []);
  document.getElementById("adm-palavras-lista").innerHTML = ps.length
    ? ps.map(p => `<div class="adm-palavra">
        <span>${escapeHtml(p.padrao)}</span>
        <button onclick="admDelPalavra('${p.padrao.replace(/'/g, "\\'")}')">✕</button></div>`).join("")
    : "<p class='subtitle'>Nenhuma palavra bloqueada.</p>";
}
window.admAddPalavra = async function() {
  const p = document.getElementById("adm-palavra-in").value.trim();
  if (!p) return;
  try { await VSSupabase.rpc("admin_palavra_add", { p_palavra: p }); admPalavras(); }
  catch (e) { alert("Erro: " + (e.message || e)); }
};
window.admDelPalavra = async function(palavra) {
  if (!confirm("Remover '" + palavra + "' da blacklist?")) return;
  try { await VSSupabase.rpc("admin_palavra_del", { p_palavra: palavra }); admPalavras(); }
  catch (e) { alert("Erro: " + (e.message || e)); }
};

// Long-press no logo "Vento Sul" da landing → abre admin (se for owner/admin)
function _setupLongPressAdmin() {
  const h1 = document.querySelector("#screen-landing .landing-titulo h1");
  if (!h1) return;
  let timer = null;
  const start = (e) => {
    timer = setTimeout(() => { abrirAdmin(); timer = null; }, 800);
  };
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  h1.addEventListener("touchstart", start, { passive: true });
  h1.addEventListener("touchend", cancel);
  h1.addEventListener("touchcancel", cancel);
  h1.addEventListener("mousedown", start);
  h1.addEventListener("mouseup", cancel);
  h1.addEventListener("mouseleave", cancel);
  h1.style.cursor = "pointer";
  h1.title = "Long-press pra admin";
}
_setupLongPressAdmin();

// Atalho alternativo: ?admin na URL → tenta abrir painel direto
if (location.search.includes("admin") || location.hash === "#admin") {
  setTimeout(() => abrirAdmin(), 500);
}
// Atalho via teclado (PC): Ctrl+Shift+A
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === "A") { e.preventDefault(); abrirAdmin(); }
});

// Idioma (PT 🇧🇷 → EN 🇺🇸 → ES 🇪🇸 → PT)
const FLAGS = ["🇧🇷","🇺🇸","🇪🇸"];
function aplicarLang() {
  const btn = document.getElementById("btn-lang");
  if (btn) btn.textContent = FLAGS[state.idiomaIdx];
  VSI18n.setLang(langCode());
  savePrefs();
  aplicarI18n();
}
// (chamada movida pro Boot, DEPOIS do loadPrefs — aqui ela rodava cedo demais e salvava os padrões por cima das prefs do usuário)
function _radioSegueIdioma() {
  // trocou o idioma do app → a rádio troca pra estação daquele idioma
  try { localStorage.setItem("vs.radio.estacao", ({pt:"vida-boa",en:"ingles",es:"espanhol"})[langCode()] || "vida-boa"); } catch {}
  // avisa o FAB da rádio (troca o stream AO VIVO se estiver tocando)
  try { window.dispatchEvent(new CustomEvent("vs:idioma", { detail: { lang: langCode() } })); } catch {}
}
document.getElementById("btn-lang")?.addEventListener("click", () => {
  state.idiomaIdx = (state.idiomaIdx + 1) % FLAGS.length;
  aplicarLang();
  _radioSegueIdioma();
});

function aplicarI18n() {
  // Reativo: percorre TODOS os [data-tr] e atualiza textContent / placeholder.
  // Quem quiser "se traduzir" só precisa ter atributo data-tr="chave".
  document.querySelectorAll("[data-tr]").forEach(el => {
    const k = el.getAttribute("data-tr");
    const txt = tr(k);
    if (txt && txt !== k) el.textContent = txt;
  });
  document.querySelectorAll("[data-tr-placeholder]").forEach(el => {
    const k = el.getAttribute("data-tr-placeholder");
    const txt = tr(k);
    if (txt && txt !== k) el.placeholder = txt;
  });
  // Keys que ainda não migraram pra data-tr (compat)
  const set = (id, prop, val) => { const el = document.getElementById(id); if (el) el[prop] = val; };
  set("input-pergunta",     "placeholder", tr("placeholder_input"));
}

// ── Consent LGPD Litorânea — aparece 1x, salva em localStorage ──────────────
function _verificarConsentLitoranea() {
  const CHAVE = "vs.lit.consent.gostos";
  if (localStorage.getItem(CHAVE)) return; // já consentiu ou recusou

  // Só mostra se user está logado
  let sess = null;
  try { sess = JSON.parse(localStorage.getItem("vs.sb.session") || "null"); } catch {}
  if (!sess?.user) return; // sem login: skip (aprende nada mesmo)

  // Não exibe mais de 1x por sessão mesmo se ainda não decidiu
  if (sessionStorage.getItem(CHAVE + ".visto")) return;
  sessionStorage.setItem(CHAVE + ".visto", "1");

  const modal = document.createElement("div");
  modal.id = "modal-lit-consent";
  modal.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.72);display:flex;align-items:flex-end;justify-content:center;padding:0 0 env(safe-area-inset-bottom)";
  modal.innerHTML = `
    <div style="background:#0d1a12;border-radius:20px 20px 0 0;padding:24px 20px 28px;max-width:480px;width:100%;border-top:2px solid rgba(13,114,62,0.6)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <span style="font-size:28px">🌊</span>
        <div>
          <div style="font-weight:700;font-size:16px;color:#e2faea">Litorânea ${tr("consent_lit_aprende")}</div>
          <div style="font-size:12px;color:#7af0ff;margin-top:2px">${tr("consent_dados_regras")}</div>
        </div>
      </div>
      <p style="font-size:13px;color:#b0c8bc;line-height:1.6;margin-bottom:14px">
        Enquanto você conversa, a Litorânea aprende seus <strong style="color:#e2faea">gostos, família e planos de compra</strong> 
        pra te conectar com promoções e negócios que fazem sentido de verdade.<br><br>
        <strong style="color:#7af0ff">Você pode ver e apagar tudo isso a qualquer momento</strong> 
        no menu <em>Meu Perfil</em>. Seus dados ficam no Vento Sul — nunca vendemos pra terceiros.
      </p>
      <div style="display:flex;gap:10px">
        <button id="lit-consent-nao" style="flex:1;padding:13px;border-radius:12px;background:rgba(255,255,255,0.06);color:#94a3b8;border:none;font-size:14px;cursor:pointer">${tr("consent_so_conversar")}</button>
        <button id="lit-consent-sim" style="flex:2;padding:13px;border-radius:12px;background:#0d6132;color:#e2faea;border:none;font-size:15px;font-weight:700;cursor:pointer">✓ ${tr("consent_autorizo")}</button>
      </div>
      <p style="text-align:center;font-size:11px;color:#4a6a5a;margin-top:10px">
        <a href="/privacidade.html" target="_blank" style="color:#4a6a5a">${tr("link_privacidade")}</a> · <a href="/termos.html" target="_blank" style="color:#4a6a5a">${tr("link_termos")}</a>
      </p>
    </div>`;

  document.body.appendChild(modal);

  document.getElementById("lit-consent-sim").onclick = function() {
    localStorage.setItem(CHAVE, "sim");
    modal.remove();
    // Adiciona mensagem de boas-vindas contextual no chat
    const chat = document.getElementById("lit-chat");
    if (chat) {
      const div = document.createElement("div");
      div.className = "lit-msg lit-msg-bot";
      div.style.cssText = "background:rgba(13,114,62,0.15);border-left:3px solid #0d6132;padding:10px 14px;border-radius:10px;margin:8px 0;font-size:14px;line-height:1.5";
      div.textContent = "🌊 " + tr("consent_boasvindas_chat");
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }
  };
  document.getElementById("lit-consent-nao").onclick = function() {
    localStorage.setItem(CHAVE, "nao");
    modal.remove();
  };
}

// Guarda de consent: _aprenderPreferenciasDaFala só salva se user consentiu
const _origAprenderPref = window._aprenderPreferenciasDaFala || (() => null);

function mostrarSaudacaoLit() {
  _verificarConsentLitoranea();
  const chat = document.getElementById("lit-chat");
  if (chat && !chat.dataset.saudou) {
    chat.dataset.saudou = "1";
    // 🎬 vídeo de boas-vindas (1ª visita): ensina que quanto mais conta, melhor — e a garantia de dados
    try {
      if (!localStorage.getItem("vs.lit.video.visto")) {
        const bolhaV = document.createElement("div");
        bolhaV.style.cssText = "margin:8px 0;max-width:92%";
        const vid = document.createElement("video");
        vid.src = "/videos/litoranea-oi-" + langCode() + ".mp4";
        vid.controls = true; vid.playsInline = true; vid.preload = "metadata";
        vid.style.cssText = "width:100%;border-radius:14px;border:1px solid rgba(103,232,249,.35)";
        vid.addEventListener("play", () => { try { localStorage.setItem("vs.lit.video.visto", "1"); } catch {} }, { once: true });
        bolhaV.appendChild(vid);
        chat.appendChild(bolhaV);
      }
    } catch {}
    const _saud = VSLitoranea.saudacao();   // 1 chamada só (antes chamava 2× e incrementava o contador errado)
    _addChatMsg("lit", _saud);
    // FALA só na primeiríssima vez de todas (cookie persistente). Depois é silenciosa —
    // só volta a falar quando o usuário apertar o botão de mic. (acessibilidade sem incomodar)
    try {
      const jaFalou = localStorage.getItem("vs_litoranea_falou_intro") === "1";
      if (!jaFalou && localStorage.getItem("vs.muted") !== "1") {
        VSLitoranea.falarTTS?.(_saud);
        localStorage.setItem("vs_litoranea_falou_intro", "1");
      }
    } catch {}
  }
  // Compat: caixa antiga
  const resp = document.getElementById("resposta-litoranea");
  if (resp && !resp.dataset.saudou) {
    resp.dataset.saudou = "1";
    resp.style.display = "block";
    resp.innerHTML = `<p>${escapeHtml(VSLitoranea.saudacao())}</p>`;
  }
  // Dispara funil progressivo se ainda falta estado/cidade/zona
  setTimeout(() => { try { window.litFunilIniciar?.(); } catch {} }, 700);
}

// Saudação automática 1x na entrada do app
function saudarLitoraneaAutomatico() {
  if (sessionStorage.getItem("vs.lit.saudou_sessao") === "1") return;
  sessionStorage.setItem("vs.lit.saudou_sessao", "1");
  // Adiciona ao chat invisivelmente — vai aparecer quando user abrir Litorânea
  const chat = document.getElementById("lit-chat");
  if (chat) {
    chat.dataset.saudou = "1";
    _addChatMsg("lit", VSLitoranea.saudacao());
  }
  // Fala discreta após 1.5s (depois do app montar)
  setTimeout(() => {
    if (localStorage.getItem("vs.muted") !== "1") {
      try { VSLitoranea.falarTTS?.(VSLitoranea.saudacao()); } catch {}
    }
  }, 1500);
}

// ─────────────────────────────────────────────────────────────
// 🌊 Funil Litorânea — pergunta-resposta dirigida (estado→cidade→zona→livre)
// Reduz contexto que a IA carrega: em vez de saber 215 cidades de uma vez,
// fica focada só na zona escolhida. Faz a conversa parecer humana e impede
// que ela confunda nomes ("Antonina" vs "Antonio Carlos" etc).
// ─────────────────────────────────────────────────────────────
window._litFunil = window._litFunil || { fase: null, zona: null, topico: null };

function _litChat() { return document.getElementById("lit-chat"); }

// Tira acentos + lowercase pra match fuzzy de fala/digitação
function _normalizar(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

// Tenta casar texto livre com uma das opções do chip atual.
// Retorna o índice da opção que bate, ou -1.
function _matchOpcao(texto, opcoes) {
  const t = _normalizar(texto);
  if (!t) return -1;
  // Match exato primeiro, depois prefixo, depois substring
  let exato = -1, pref = -1, sub = -1;
  opcoes.forEach((o, i) => {
    const label = _normalizar(typeof o === "string" ? o : o.label);
    if (!label) return;
    if (t === label) exato = i;
    else if (label.startsWith(t) || t.startsWith(label)) { if (pref === -1) pref = i; }
    else if (label.includes(t) || t.includes(label)) { if (sub === -1) sub = i; }
  });
  if (exato !== -1) return exato;
  if (pref !== -1) return pref;
  if (sub !== -1) return sub;
  return -1;
}

function _litChips(pergunta, opcoes, onPick) {
  const chat = _litChat();
  if (!chat) return;
  const div = document.createElement("div");
  div.className = "lit-msg lit-msg-bot lit-funil-bloco";
  const chipsHtml = opcoes.map((o, i) =>
    `<button class="lit-chip" data-i="${i}">${escapeHtml(typeof o === "string" ? o : o.label)}</button>`
  ).join("");
  div.innerHTML = `<div class="lit-funil-pergunta">🌊 ${escapeHtml(pergunta)}</div><div class="lit-funil-chips">${chipsHtml}</div>`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;

  const _commit = (i, b) => {
    const escolha = opcoes[i];
    div.querySelectorAll(".lit-chip").forEach(x => { x.disabled = true; x.classList.toggle("lit-chip-pick", x === b); });
    _addChatMsg("user", typeof escolha === "string" ? escolha : escolha.label);
    // Marca esse funil como "consumido" pra que digitar/falar depois não casem mais
    div.dataset.consumido = "1";
    onPick(typeof escolha === "string" ? escolha : escolha.value);
  };

  div.querySelectorAll(".lit-chip").forEach(b => {
    b.addEventListener("click", () => _commit(parseInt(b.dataset.i, 10), b));
  });

  // Registra o handler ativo do funil — perguntarLitoranea consulta isso
  // pra avançar o funil quando user fala/digita uma das opções.
  window._litFunilHandler = {
    div, opcoes,
    tryMatch(texto) {
      if (div.dataset.consumido === "1") return false;
      const i = _matchOpcao(texto, opcoes);
      if (i === -1) return false;
      const btn = div.querySelector(`.lit-chip[data-i="${i}"]`);
      if (btn) _commit(i, btn);
      return true;
    }
  };

  // TTS curto da pergunta
  try {
    if (localStorage.getItem("vs.muted") !== "1") {
      VSLitoranea.falarTTS?.(pergunta);
    }
  } catch {}
}

function _litFunilSeguir() {
  // Estado já escolhido?
  if (!state.estado) {
    return _litChips(
      "Vai me ajudar a te ajudar — tu é de qual estado, vivente?",
      VSCidades.ESTADOS,
      (v) => { state.estado = v; try { savePrefs(); } catch {}; _litFunilSeguir(); }
    );
  }
  // Cidade?
  if (!state.cidade) {
    const cidades = (VSCidades.cidadesDe(state.estado) || []).slice(0, 16);
    return _litChips(
      `Bão, ${state.estado}. Em qual cidade tu tá agora?`,
      cidades,
      (v) => { state.cidade = v; try { savePrefs(); } catch {}; _litFunilSeguir(); }
    );
  }
  // Zona?
  if (!window._litFunil.zona) {
    return _litChips(
      `Em ${state.cidade}. Sobre o que tu quer falar?`,
      ["Praias", "Bairros", "Atrações", "Histórico", "Comércio local", "Geral"],
      (v) => { window._litFunil.zona = v; _litFunilSeguir(); }
    );
  }
  // Pronto — conversa livre, contexto enxuto
  _addChatMsg(
    "lit",
    `Beleza! Tô focada em ${state.cidade}/${state.estado} → ${window._litFunil.zona}. Pergunta o que quiser sobre isso. Pra mudar, é só falar "muda cidade" ou "outra zona".`
  );
  try { if (localStorage.getItem("vs.muted") !== "1") VSLitoranea.falarTTS?.(`Foco em ${state.cidade}, ${window._litFunil.zona}. Pergunta.`); } catch {}
}

window.litFunilIniciar = function() {
  // Se já completou tudo, não repete (a menos que limpe via "muda cidade")
  if (state.estado && state.cidade && window._litFunil.zona) return;
  _litFunilSeguir();
};

window.litFunilResetar = function(quem) {
  // quem: "estado" | "cidade" | "zona" | "tudo"
  if (quem === "tudo" || quem === "estado") { state.estado = ""; state.cidade = ""; window._litFunil.zona = null; }
  else if (quem === "cidade") { state.cidade = ""; window._litFunil.zona = null; }
  else if (quem === "zona") { window._litFunil.zona = null; }
  try { savePrefs(); } catch {}
  _litFunilSeguir();
};

// ─────────────────────────────────────────────────────────────
// PWA install prompt
// ─────────────────────────────────────────────────────────────
let deferredInstall = null;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredInstall = e;
  document.getElementById("install-block").style.display = "block";
});
document.getElementById("btn-install")?.addEventListener("click", async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  const { outcome } = await deferredInstall.userChoice;
  vslog("install:", outcome);
  deferredInstall = null;
  document.getElementById("install-block").style.display = "none";
});
window.addEventListener("appinstalled", () => {
  document.getElementById("install-block").style.display = "none";
});

// Utils
function enc(s) { return encodeURIComponent(s); }
function escapeHtml(s) {
  if (!s) return "";
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function handleDeeplink() {
  const params = new URLSearchParams(location.search);
  const go = params.get("go");
  if (!go) return;
  if (go === "notif") { abrirNotif(); return; } // preferências não precisam de cidade
  if (!state.cidade) return;
  if (go === "feira") abrirFeira();
  else if (go === "votados") abrirVotados();
  else if (go === "promos") abrirPromos();
  else if (go === "coletiva") abrirColetiva();
  else if (go === "caca") abrirCaca();
  else if (go === "praias") abrirPraias();
  else if (go === "wallet") abrirWallet();
  else if (go === "litoranea") { showScreen("litoranea"); mostrarSaudacaoLit(); }
}

// ─────────────────────────────────────────────────────────────
// Tela COMÉRCIO — login/cadastro merchant + barracas livres
// ─────────────────────────────────────────────────────────────
async function abrirComercio() {
  showScreen("comercio");
  const el = document.getElementById("comercio-store");
  if (!el) return;

  const sessWrap = VSSupabase.getSession?.();
  const sess = sessWrap?.session || sessWrap;
  const userId = sess?.user?.id;

  function _pUrl(txt, w, h, seed) {
    return "/icons/icon-192.png";
  }

  const DEMO_COVER = _pUrl("modern brazilian supermarket bright clean aisles fresh produce checkout counter warm welcoming", 1600, 900, 161);
  const DEMO_CATS = [
    {id:"all",        ico:"🛒", label:"Tudo"},
    {id:"hortifruti", ico:"🥬", label:"Hortifrúti"},
    {id:"acougue",    ico:"🥩", label:"Açougue"},
    {id:"padaria",    ico:"🍞", label:"Padaria"},
    {id:"frios",      ico:"🥛", label:"Frios"},
    {id:"congelados", ico:"❄️", label:"Congelados"},
    {id:"bebidas",    ico:"🍷", label:"Bebidas"},
    {id:"limpeza",    ico:"🧴", label:"Limpeza"},
  ];
  const DEMO_PROD = [
    {n:"Banana caturra (kg)",   p:"R$ 5,90/kg",  c:"hortifruti", img:_pUrl("ripe yellow bananas bunch wooden box market",400,300,1701)},
    {n:"Tomate italiano (kg)",  p:"R$ 8,50/kg",  c:"hortifruti", img:_pUrl("organic italian tomatoes wooden basket market",400,300,1702)},
    {n:"Alface crespa",         p:"R$ 3,50",     c:"hortifruti", img:_pUrl("fresh curly green lettuce wooden crate market",400,300,1703)},
    {n:"Picanha (kg)",          p:"R$ 79,90/kg", c:"acougue",    img:_pUrl("brazilian picanha steak prime cut beef counter close up",400,300,1704)},
    {n:"Patinho (kg)",          p:"R$ 39,90/kg", c:"acougue",    img:_pUrl("brazilian beef butcher patinho cut meat counter market",400,300,162)},
    {n:"Frango inteiro (kg)",   p:"R$ 14,90/kg", c:"acougue",    img:_pUrl("whole raw chicken supermarket package brazil",400,300,163)},
    {n:"Pao frances (kg)",      p:"R$ 16/kg",    c:"padaria",    img:_pUrl("brazilian french bread basket bakery supermarket",400,300,164)},
    {n:"Sonho recheado",        p:"R$ 7,00",     c:"padaria",    img:_pUrl("brazilian sonho cream filled donut bakery",400,300,1706)},
    {n:"Leite UHT 1L",          p:"R$ 5,50",     c:"frios",      img:_pUrl("uht milk box carton brazilian supermarket shelf",400,300,165)},
    {n:"Queijo mussarela (kg)", p:"R$ 44,90/kg", c:"frios",      img:_pUrl("brazilian mozzarella cheese sliced supermarket close up",400,300,1708)},
    {n:"Pizza mussarela",       p:"R$ 22,00",    c:"congelados", img:_pUrl("frozen pizza box brazilian supermarket freezer aisle",400,300,169)},
    {n:"Sorvete 2L",            p:"R$ 38,00",    c:"congelados", img:_pUrl("ice cream tub 2 liter chocolate brazilian frozen freezer",400,300,1710)},
    {n:"Refrigerante 2L",       p:"R$ 9,90",     c:"bebidas",    img:_pUrl("cold cola 2 liter bottle brazilian supermarket",400,300,167)},
    {n:"Cerveja lata 350ml",    p:"R$ 3,50",     c:"bebidas",    img:_pUrl("cold brazilian pilsen beer can 350ml supermarket cooler",400,300,168)},
    {n:"Vinho da Serra 750ml",  p:"R$ 59,00",    c:"bebidas",    img:_pUrl("rio grande do sul wine bottle vineyard valley elegant",400,300,1712)},
    {n:"Detergente 500ml",      p:"R$ 3,90",     c:"limpeza",    img:_pUrl("brazilian dish soap bottle yellow supermarket cleaning",400,300,166)},
    {n:"Sabao em po 1kg",       p:"R$ 12,90",    c:"limpeza",    img:_pUrl("laundry detergent powder box brazilian supermarket close up",400,300,1713)},
    {n:"Papel higienico 12un",  p:"R$ 16,90",    c:"limpeza",    img:_pUrl("toilet paper rolls package supermarket brazilian",400,300,1714)},
  ];

  window._csCatFilter = function(cat) {
    DEMO_CATS.forEach(c => {
      const b = document.getElementById("csc-" + c.id);
      if (!b) return;
      const a = c.id === cat;
      b.style.borderColor = a ? "rgba(79,142,201,0.8)" : "rgba(255,255,255,0.15)";
      b.style.background  = a ? "rgba(79,142,201,0.2)" : "rgba(255,255,255,0.05)";
      b.style.color       = a ? "#4f8ec9" : "var(--hint)";
    });
    const lista = cat === "all" ? DEMO_PROD : DEMO_PROD.filter(p => p.c === cat);
    const g = document.getElementById("cs-grid");
    if (g) g.innerHTML = lista.map(p => `
      <div class="card-info" style="padding:0;overflow:hidden;border-radius:14px">
        <img src="${p.img}" alt="${escapeHtml(p.n)}" loading="lazy"
             style="width:100%;height:120px;object-fit:cover;display:block;background:#1a1f2e">
        <div style="padding:10px">
          <div style="font-size:13px;font-weight:600;line-height:1.3">${escapeHtml(p.n)}</div>
          <div style="font-size:13px;color:#4caf50;font-weight:700;margin-top:3px">${escapeHtml(p.p)}</div>
        </div>
      </div>`).join("");
  };

  const guiaHtml = `
    <details class="card-info mc-guia" style="margin-top:20px">
      <summary style="cursor:pointer;font-weight:600;font-size:14px">${tr("cc_como_aparecer")}</summary>
      <div style="margin-top:12px;font-size:13px;line-height:1.6">
        <div class="mc-aviso-sulcoin"><strong>${tr("cc_sulcoin_abate")}</strong><br>
        <small>Paridade: 100 sulis = R$ 1. Voce ganha SulCoin de clientes, Caca ao Tesouro, votos, indicacoes.</small></div>
        <h4 class="mc-h4">${tr("cc_h4_perto")}</h4><div id="explica-perto"></div>
        <h4 class="mc-h4">${tr("cc_h4_carrosseis")}</h4><div id="explica-carrosseis"></div>
        <h4 class="mc-h4">${tr("cc_h4_banner")}</h4><div id="explica-banner"></div>
        <h4 class="mc-h4">Caca ao Tesouro</h4><div id="explica-caca"></div>
        <h4 class="mc-h4">Destaque Feira</h4><div id="explica-feira"></div>
      </div>
    </details>`;

  function _demoBanner() {
    return `
      <div style="position:relative;margin:-14px -14px 0;overflow:hidden">
        <img src="${DEMO_COVER}" alt="Supermercado Central" loading="lazy"
             style="width:100%;height:180px;object-fit:cover;display:block;background:#0a0e14">
        <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(10,14,20,0) 30%,rgba(10,14,20,0.92) 100%)"></div>
        <div style="position:absolute;bottom:0;left:0;right:0;padding:12px 14px">
          <span style="background:rgba(255,193,7,0.2);border:1px solid rgba(255,193,7,0.5);border-radius:6px;font-size:10px;font-weight:700;padding:2px 8px;color:#ffc107;letter-spacing:.6px">${tr("cc_modelo_demo")}</span>
          <h2 style="margin:6px 0 0;font-size:20px;font-weight:800">Supermercado Central</h2>
          <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:2px">Caxias do Sul, RS -- Aberto 7h-22h</div>
        </div>
      </div>`;
  }

  function _demoCats() {
    return `<div style="display:flex;gap:6px;overflow-x:auto;padding:12px 0 8px;scrollbar-width:none">
      ${DEMO_CATS.map((c, i) => `<button onclick="window._csCatFilter('${c.id}')" id="csc-${c.id}"
          style="flex-shrink:0;padding:6px 12px;border-radius:20px;cursor:pointer;white-space:nowrap;font-size:12px;font-weight:600;border:1px solid ${i===0?'rgba(79,142,201,0.8)':'rgba(255,255,255,0.15)'};background:${i===0?'rgba(79,142,201,0.2)':'rgba(255,255,255,0.05)'};color:${i===0?'#4f8ec9':'var(--hint)'}">
        ${c.ico} ${c.label}</button>`).join("")}
    </div>`;
  }

  // -- Nao logado --
  if (!userId) {
    el.innerHTML = `
      ${_demoBanner()}
      ${_demoCats()}
      <div id="cs-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px"></div>
      <div style="background:rgba(79,142,201,0.10);border:1px solid rgba(79,142,201,0.25);border-radius:16px;padding:18px;margin-top:16px">
        <div style="font-weight:700;font-size:15px;text-align:center;margin-bottom:12px">${tr("cc_quer_loja")}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;font-size:12px;text-align:center">
          <div style="padding:8px;background:rgba(255,255,255,0.06);border-radius:8px">${tr("cc_sem_mensalidade")}<br><small>R$ 1,95 fixo/TX</small></div>
          <div style="padding:8px;background:rgba(255,255,255,0.06);border-radius:8px">SulCoin<br><small>${tr("cc_cashback")}</small></div>
          <div style="padding:8px;background:rgba(255,255,255,0.06);border-radius:8px">Litora nea IA<br><small>${tr("cc_atende24")}</small></div>
        </div>
        <div style="display:grid;gap:8px">
          <div class="dropdown-block"><label>Email</label>
            <input id="merch-email" type="email" placeholder="seu@email.com"
              style="width:100%;padding:12px;background:rgba(20,40,58,0.55);color:var(--text);border:1px solid rgba(255,255,255,0.12);border-radius:8px"></div>
          <div class="dropdown-block"><label>${tr("cc_label_senha")}</label>
            <input id="merch-senha" type="password" placeholder="${tr("cc_ph_senha")}"
              style="width:100%;padding:12px;background:rgba(20,40,58,0.55);color:var(--text);border:1px solid rgba(255,255,255,0.12);border-radius:8px"></div>
          <button class="btn-primary" id="btn-merch-login" style="padding:12px">${tr("cc_btn_login")}</button>
          <button class="btn-primary" id="btn-merch-cadastrar" style="background:#2e7d32;padding:12px">${tr("cc_btn_cadastrar")}</button>
        </div>
      </div>
      ${guiaHtml}`;
    window._csCatFilter("all");
    document.getElementById("btn-merch-login")?.addEventListener("click", () => {
      const e = document.getElementById("merch-email")?.value?.trim();
      const s = document.getElementById("merch-senha")?.value;
      if (!e || !s) return;
      VSSupabase.signIn?.(e, s).then(() => abrirComercio()).catch(err => vsToast?.({tipo:"error",titulo:"Erro",corpo:err.message}));
    });
    document.getElementById("btn-merch-cadastrar")?.addEventListener("click", () => {
      const e = document.getElementById("merch-email")?.value?.trim();
      const s = document.getElementById("merch-senha")?.value;
      if (!e || !s) return;
      VSSupabase.signUp?.(e, s).then(() => vsToast?.({tipo:"sucesso",titulo:tr("toast_confirme_email_t"),corpo:tr("toast_confirme_email_c")})).catch(err => vsToast?.({tipo:"error",titulo:"Erro",corpo:err.message}));
    });
    _renderExplicaPlanos();
    return;
  }

  // -- Logado, carrega barracas --
  el.innerHTML = `<div class="loading" style="padding:48px;text-align:center;color:var(--hint)">Carregando...</div>`;
  const minhas = await sb(`feira_barracas?select=id,nome,categoria,cidade,estado,ordem,lat,lng,geoloc_pago_ate&dono_uuid=eq.${userId}&order=ordem.asc`).catch(() => []);

  if (!minhas.length) {
    // Logado mas ainda sem barraca: mostra o PAINEL DE VERDADE em prévia, pra
    // pessoa ver o que ela recebe. Nenhum botão altera nada enquanto não tiver
    // comprado — cada um cai em _previewBloqueado() e aponta pro caminho de compra.
    window._previewBloqueado = function (oQue) {
      const msg = `${oQue} faz parte do painel do comerciante. Você está vendo uma prévia — nada aqui é alterado ainda. Pra liberar, abra sua loja na Feira ou assine o Comércio Pro.`;
      if (window.vsToast) vsToast({ tipo: "info", titulo: "Prévia do painel", corpo: msg });
      else alert(msg);
    };

    const btnPreview = (ico, texto) =>
      `<button class="btn-primary mc-btn" onclick='window._previewBloqueado("${texto.replace(/"/g, "&quot;")}")'
         style="padding:12px;opacity:.55;cursor:not-allowed" aria-disabled="true">${VSIcons.svg(ico, 16)} ${texto}</button>`;

    el.innerHTML = `
      <div style="background:rgba(255,193,7,.10);border:1px solid rgba(255,193,7,.35);border-radius:14px;padding:12px 14px;margin-bottom:14px">
        <div style="font-weight:800;font-size:14px;color:#ffc107">👀 Prévia do painel do comerciante</div>
        <div style="font-size:12.5px;color:var(--hint);margin-top:4px;line-height:1.5">
          É assim que fica quando a loja for sua. Nada aqui altera nada ainda — os botões só ligam depois que você abrir a loja ou assinar o Comércio Pro.
        </div>
      </div>

      <div style="display:flex;align-items:center;gap:12px;padding-bottom:14px;border-bottom:1px solid var(--line)">
        <div style="width:52px;height:52px;border-radius:14px;background:rgba(79,142,201,0.15);border:1px solid rgba(79,142,201,0.3);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">🏪</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:17px;font-weight:800">Sua loja aqui</div>
          <div style="font-size:12px;color:var(--hint)">o nome e a categoria você escolhe na hora de abrir</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:14px 0 4px">
        ${[[tr("roi_views"), "128"], [tr("roi_unicos"), "94"], [tr("roi_rotas"), "31"], [tr("roi_compras"), "12"]].map(([lbl, v]) =>
          `<div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:10px;text-align:center">
            <div style="font-size:18px;font-weight:800;opacity:.6">${v}</div>
            <div style="font-size:10px;color:var(--hint)">${lbl}</div>
          </div>`).join("")}
      </div>
      <div style="font-size:11px;color:var(--hint);text-align:center;margin-bottom:14px">números de exemplo — os seus aparecem aqui depois de abrir</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px">
        ${btnPreview("settings", tr("cc_btn_gerenciar"))}
        ${btnPreview("coins",    tr("cc_btn_planos"))}
        ${btnPreview("eye",      "SmartView")}
        ${btnPreview("check",    tr("cc_btn_recibo"))}
      </div>

      <div style="background:rgba(79,142,201,0.10);border:1px solid rgba(79,142,201,0.25);border-radius:16px;padding:20px;margin-top:18px;text-align:center">
        <div style="font-weight:700;font-size:15px;margin-bottom:6px">${tr("cc_abre_loja_30s")}</div>
        <p class="subtitle" style="margin:0 0 14px">R$ 1,95 fixo/TX -- sem mensalidade -- SulCoin cashback</p>
        <button class="btn-primary" style="width:100%;padding:13px;font-size:15px;font-weight:700" onclick="abrirFeira()">
          ${tr("cc_quero_loja")}
        </button>
        <a href="/comerciante-templates.html" style="display:block;margin-top:9px;padding:12px;border-radius:12px;background:rgba(255,193,7,.12);border:1px solid rgba(255,193,7,.3);color:#fbbf24;font-weight:700;text-decoration:none;font-size:14px">🏢 Ver o Comércio Pro →</a>
      </div>

      <h3 style="margin:22px 0 8px;font-size:14px">Exemplo de loja montada</h3>
      ${_demoBanner()}
      ${_demoCats()}
      <div id="cs-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px"></div>
      ${guiaHtml}`;
    window._csCatFilter("all");
    _renderExplicaPlanos();
    return;
  }

  // -- Tem barraca --
  const b = minhas[0];
  const pagaAte = b.geoloc_pago_ate ? new Date(b.geoloc_pago_ate) : null;
  const geoAtiva = pagaAte && pagaAte > new Date();
  const diasRest = geoAtiva ? Math.ceil((pagaAte - new Date()) / 86400000) : 0;

  let roi = null;
  try {
    const rr = await VSSupabase.rpc("roi_minha_barraca", {p_barraca_id: b.id, p_dias: 30});
    roi = Array.isArray(rr) ? rr[0] : rr;
  } catch {}

  const geoTag = geoAtiva
    ? `<div style="display:flex;align-items:center;gap:5px;font-size:12px;color:#4caf50;margin-top:5px">${VSIcons.svg("check",13)} Geo ativa - ${diasRest} dia${diasRest === 1 ? "" : "s"}</div>`
    : `<div style="display:flex;align-items:center;gap:5px;font-size:12px;color:#ff9800;margin-top:5px">${VSIcons.svg("info",13)} Sem geo -- ative pra aparecer no mapa</div>`;

  const roiHtml = roi?.ok
    ? `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:14px 0 4px">
        ${[[tr("roi_views"),roi.views,"views"],[tr("roi_unicos"),roi.visitantes_unicos,"unicos"],[tr("roi_rotas"),roi.cliques_rota,"rotas"],[tr("roi_compras"),roi.compras,"compras"]].map(([ico,v,l]) =>
          `<div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:10px;text-align:center">
            <div style="font-size:18px;font-weight:800">${v}</div>
            <div style="font-size:10px;color:var(--hint)">${ico}</div>
          </div>`).join("")}
       </div>
       <div style="font-size:11px;color:var(--hint);text-align:center;margin-bottom:14px">Ultimos 30 dias -- ${VSWallet.formatarSulis(roi.sulis_recebidos)} recebidos</div>`
    : `<div style="font-size:12px;color:var(--hint);margin:10px 0">${tr("roi_sem_dados")}</div>`;

  const nj = JSON.stringify(b.nome).replace(/'/g, "&#39;");

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding-bottom:14px;border-bottom:1px solid var(--line)">
      <div style="width:52px;height:52px;border-radius:14px;background:rgba(79,142,201,0.15);border:1px solid rgba(79,142,201,0.3);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">🏪</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:17px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(b.nome)}</div>
        <div style="font-size:12px;color:var(--hint)">${escapeHtml(b.categoria || "--")} - ${escapeHtml(b.cidade || "")}/${escapeHtml(b.estado || "")}</div>
        ${geoTag}
      </div>
    </div>
    ${roiHtml}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px">
      <button class="btn-primary mc-btn" onclick='abrirGerirBarraca?.("${b.id}")' style="padding:12px">${VSIcons.svg("settings",16)} ${tr("cc_btn_gerenciar")}</button>
      <button class="btn-primary mc-btn" onclick='abrirPlanosBarraca?.("${b.id}",${nj})' style="padding:12px">${VSIcons.svg("coins",16)} ${tr("cc_btn_planos")}</button>
      <button class="btn-primary mc-btn" onclick='abrirTVInteligente?.("${b.id}",${nj})' style="padding:12px">${VSIcons.svg("eye",16)} SmartView</button>
      <button class="btn-primary mc-btn" onclick='abrirValidarRecibo?.("${b.id}",${nj})' style="padding:12px">${VSIcons.svg("check",16)} ${tr("cc_btn_recibo")}</button>
      <button class="btn-primary mc-btn" style="grid-column:1/-1;padding:12px" onclick='window.VSCadastroVoz?.abrir("${b.id}",${nj})'>${VSIcons.svg("plus",16)} ${tr("cc_btn_produto_voz")}</button>
      <button class="btn-primary" style="grid-column:1/-1;padding:12px" onclick='window.comerciantesResetarDia?.("${b.id}")'>${VSIcons.svg("refresh",16)} ${tr("cc_btn_comecar_dia")}</button>
    </div>
    <button class="btn-primary" onclick="abrirSaquesPix?.()" style="width:100%;padding:11px;margin-top:10px;display:flex;align-items:center;justify-content:center;gap:8px">${VSIcons.svg("bank",16)} ${tr("cc_btn_saques")}</button>
    ${minhas.length > 1 ? `<p style="font-size:12px;color:var(--hint);margin-top:14px;text-align:center">Voce tem ${minhas.length} barracas. Mostrando <strong>#${b.ordem}</strong>.</p>` : ""}
    <button onclick='try{VSSupabase.signOut?.().then(()=>abrirComercio())}catch(err){}'
            style="width:100%;margin-top:12px;padding:10px;font-size:13px;background:rgba(100,100,100,0.2);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:var(--hint);cursor:pointer">
      ${tr("cc_trocar_conta")}
    </button>
    ${guiaHtml}
  `;
  _renderExplicaPlanos();
}

// ─────────────────────────────────────────────────────────────
// 📡 DOOH — Vitrine Inteligente (pulso por demanda)
// User aperta botão → app envia geo + categorias dele → lojas DOOH perto
// que tem TV exibem criativos pra perfis presentes (anônimo, TTL 5min).
// ─────────────────────────────────────────────────────────────
window._doohCategorias = null;     // cache do catálogo
window._doohSelecionadas = [];     // categorias que o user marcou na sessão

async function _carregarDoohCategorias() {
  if (window._doohCategorias) return window._doohCategorias;
  const cs = await sb("dooh_categorias?select=*&ativo=eq.true&order=ordem.asc").catch(() => []);
  window._doohCategorias = cs;
  // Restaura escolha salva
  try {
    const saved = JSON.parse(localStorage.getItem("vs_dooh_cats") || "[]");
    if (Array.isArray(saved)) window._doohSelecionadas = saved;
  } catch {}
  return cs;
}

window.abrirDoohPulso = async function() {
  let modal = document.getElementById("modal-dooh-pulso");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-dooh-pulso";
    modal.className = "modal-bg";
    modal.style.zIndex = "9700";
    modal.innerHTML = `<div class="modal" style="max-width:560px;width:96%;max-height:92vh;overflow-y:auto"></div>`;
    document.body.appendChild(modal);
  }
  const inner = modal.querySelector(".modal");
  inner.innerHTML = `<div class="loading" style="padding:30px;text-align:center;color:var(--hint)">Carregando…</div>`;
  modal.style.display = "flex";

  const cats = await _carregarDoohCategorias();
  const selecionadas = new Set(window._doohSelecionadas);

  inner.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <div style="font-size:28px">📡</div>
      <div style="flex:1">
        <h3 style="margin:0">${tr("vitrine_inteligente")}</h3>
        <small style="color:var(--hint)">${tr("vitrine_sub")}</small>
      </div>
    </div>
    <div style="background:rgba(255,193,7,0.10);border:1px solid rgba(255,193,7,0.30);border-radius:8px;padding:8px;font-size:11px;color:var(--hint);margin-bottom:10px;line-height:1.45">
      🛡️ <strong style="color:#ffd54f">${tr("dooh_priv_t")}</strong>: ${tr("dooh_priv_txt")}
    </div>

    <strong style="font-size:13px;display:block;margin-bottom:6px">${tr("vitrine_marque")}</strong>
    <div id="dooh-cats-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px;margin-bottom:12px">
      ${cats.map(c => `
        <button class="dooh-cat ${selecionadas.has(c.id) ? "dooh-cat-on" : ""}" data-id="${c.id}" onclick="toggleDoohCat('${c.id}')"
                style="padding:8px 10px;background:${selecionadas.has(c.id) ? "rgba(255,193,7,0.30)" : "rgba(255,255,255,0.06)"};border:1px solid ${selecionadas.has(c.id) ? "rgba(255,193,7,0.55)" : "rgba(255,255,255,0.15)"};border-radius:8px;color:var(--text);font-size:11px;cursor:pointer;text-align:left;line-height:1.3">
          <div style="font-size:18px">${c.emoji}</div>
          <div>${escapeHtml(c.nome)}</div>
        </button>
      `).join("")}
    </div>

    <button class="btn-primary" id="dooh-btn-disparar" style="width:100%;background:linear-gradient(135deg,rgba(13,114,62,0.65),rgba(76,175,80,0.55));font-size:14px;padding:12px" onclick="dispararDoohPulso()">
      ${tr("vitrine_ativar")}
    </button>
    <button class="btn-primary" style="width:100%;margin-top:6px;background:rgba(120,120,120,0.30);font-size:12px" onclick="document.getElementById('modal-dooh-pulso').style.display='none'">
      Cancelar
    </button>

    <div id="dooh-resultado" style="margin-top:12px"></div>`;
};

window.toggleDoohCat = function(id) {
  const i = window._doohSelecionadas.indexOf(id);
  if (i >= 0) window._doohSelecionadas.splice(i, 1);
  else window._doohSelecionadas.push(id);
  try { localStorage.setItem("vs_dooh_cats", JSON.stringify(window._doohSelecionadas)); } catch {}
  // Re-renderiza grid sem fechar modal
  const btn = document.querySelector(`.dooh-cat[data-id="${id}"]`);
  if (!btn) return;
  const on = window._doohSelecionadas.includes(id);
  btn.style.background = on ? "rgba(255,193,7,0.30)" : "rgba(255,255,255,0.06)";
  btn.style.borderColor = on ? "rgba(255,193,7,0.55)" : "rgba(255,255,255,0.15)";
  btn.classList.toggle("dooh-cat-on", on);
};

window.dispararDoohPulso = async function() {
  const btn = document.getElementById("dooh-btn-disparar");
  const out = document.getElementById("dooh-resultado");
  btn.disabled = true; btn.textContent = tr("dooh_btn_pegando");
  out.innerHTML = "";
  try {
    const pos = await new Promise((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 })
    );
    btn.textContent = tr("dooh_btn_ativando");
    const cats = window._doohSelecionadas.slice();
    const r = await VSSupabase.rpc("dooh_pulso", {
      p_lat: pos.coords.latitude,
      p_lng: pos.coords.longitude,
      p_categorias: cats,
      p_raio_max_m: 200
    });
    const lojas = Array.isArray(r) ? r : [];
    btn.disabled = false;
    btn.textContent = tr("dooh_btn_disparar_novo");
    if (!lojas.length) {
      out.innerHTML = `
        <div style="background:rgba(255,255,255,0.05);border:1px dashed rgba(255,255,255,0.20);border-radius:10px;padding:16px;text-align:center;color:var(--hint);font-size:13px">
          ${tr("dooh_nenhuma_loja")}
        </div>`;
      return;
    }
    out.innerHTML = `
      <strong style="font-size:13px;display:block;margin-bottom:6px">${tr("vitrine_ativa_qty", lojas.length)}</strong>
      ${lojas.map(l => {
        const matchPct = l.match_count > 0 && cats.length > 0 ? Math.round((l.match_count / cats.length) * 100) : 0;
        const cor = matchPct >= 50 ? "#4caf50" : matchPct > 0 ? "#ff9800" : "#7af0ff";
        return `
        <div class="card-info" style="margin:6px 0;padding:10px;border-left:3px solid ${cor}">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;min-width:0">
              <strong style="font-size:13px;display:block">${escapeHtml(l.nome)}</strong>
              <small style="color:var(--hint)">${l.distancia_m}m daqui · ${l.match_count} vibe${l.match_count === 1 ? "" : "s"} em comum</small>
            </div>
            ${matchPct > 0 ? `<div style="color:${cor};font-weight:700;font-size:12px">${matchPct}% match</div>` : ""}
          </div>
        </div>`;
      }).join("")}
      <p style="font-size:11px;color:var(--hint);margin-top:8px;text-align:center">${tr("dooh_olha_tv")}</p>
      <button class="btn-primary" style="width:100%;margin-top:8px;background:rgba(244,67,54,0.45);font-size:12px" onclick="cancelarDoohPulso()">
        ${tr("dooh_cancelar_agora")}
      </button>`;
  } catch (e) {
    btn.disabled = false;
    btn.textContent = "📡 Tentar de novo";
    out.innerHTML = `<div style="color:#f44;padding:12px">${escapeHtml(e.message || "Erro inesperado")}</div>`;
  }
};

window.cancelarDoohPulso = async function() {
  try {
    const userId = VSSupabase.userId?.();
    if (userId) {
      await VSSupabase.request(`dooh_presenca?user_id=eq.${userId}`, { method: "DELETE" });
    }
  } catch {}
  document.getElementById("modal-dooh-pulso").style.display = "none";
};

// ─────────────────────────────────────────────────────────────
// 🌳 QUESTS VIVAS — civic engagement gameificado
// ─────────────────────────────────────────────────────────────
window._questsCache = [];
window._questAtualGeo = null;
window._odsCatalogoCache = null;
async function _odsCatalogo() {
  if (window._odsCatalogoCache) return window._odsCatalogoCache;
  const arr = await sb("ods_catalogo?select=*&order=numero.asc").catch(() => []);
  window._odsCatalogoCache = Array.isArray(arr) ? arr : [];
  return window._odsCatalogoCache;
}
function _renderTagsOds(odsArr, catalogo) {
  if (!Array.isArray(odsArr) || !odsArr.length) return "";
  return `<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:6px">` +
    odsArr.slice(0, 4).map(c => {
      const o = catalogo.find(x => x.codigo === c);
      if (!o) return "";
      return `<span title="ODS ${o.numero} — ${escapeHtml(o.nome)}" style="background:${o.cor}33;border:1px solid ${o.cor};color:${o.cor};font-size:9px;padding:2px 6px;border-radius:999px;font-weight:700">ODS ${o.numero}</span>`;
    }).join("") +
    `</div>`;
}

async function abrirQuestsVivas() {
  showScreen("quests");
  await VSSupabase.ensureSession?.();
  await atualizarQuests();
}

window.abrirQuestsVivas = abrirQuestsVivas;

window.atualizarQuests = async function() {
  const lista = document.getElementById("quests-lista");
  const stats = document.getElementById("quests-stats");
  lista.innerHTML = `<div class="loading" style="padding:20px;text-align:center;color:var(--hint)">Carregando…</div>`;
  try {
    const [qs, catalogo] = await Promise.all([
      sb("v_quests_mapa?select=*&order=created_at.desc&limit=80").catch(() => []),
      _odsCatalogo()
    ]);
    window._questsCache = qs;
    if (!qs.length) {
      lista.innerHTML = `<p style="color:var(--hint);text-align:center;padding:30px">
        ${tr("quests_nenhuma")}
      </p>`;
      stats.style.display = "none";
      return;
    }
    const abertas = qs.filter(q => q.status === "aberta").length;
    const ativas  = qs.filter(q => q.status === "em_andamento").length;
    stats.style.display = "block";
    stats.textContent = `${qs.length} quests vivas · ${abertas} abertas · ${ativas} em andamento`;
    lista.innerHTML = qs.map(q => {
      const pct = Math.max(0, Math.min(100, Math.round((q.hp_atual / q.hp_inicial) * 100)));
      const corHp = pct > 60 ? "#e53935" : pct > 30 ? "#ff9800" : "#4caf50";
      return `
        <div class="card-info" style="margin:8px 0;padding:12px;border-left:4px solid ${corHp};cursor:pointer" onclick="abrirDetalheQuest('${q.id}')">
          <div style="display:flex;align-items:flex-start;gap:10px">
            <div style="font-size:32px">${q.icon || "🌳"}</div>
            <div style="flex:1;min-width:0">
              <strong style="font-size:14px;display:block">${escapeHtml(q.titulo)}</strong>
              <small style="color:var(--hint)">${escapeHtml(q.cidade || "")}/${escapeHtml(q.estado || "")} · ${q.participantes} participantes · ${q.evidencias_ok} evidências</small>
              <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
                <div style="flex:1;height:8px;background:rgba(255,255,255,0.10);border-radius:4px;overflow:hidden">
                  <div style="width:${pct}%;height:100%;background:${corHp};transition:width 0.3s"></div>
                </div>
                <small style="color:${corHp};font-weight:700;min-width:60px;text-align:right">HP ${q.hp_atual}/${q.hp_inicial}</small>
              </div>
              <small style="color:#ffd54f;display:block;margin-top:4px">🪙 ${q.recompensa_sulis} ${tInst("sulis")} pra quem ajudar</small>
              ${_renderTagsOds(q.ods, catalogo)}
            </div>
          </div>
        </div>`;
    }).join("");
  } catch (e) {
    lista.innerHTML = `<p style="color:#f44">Erro: ${e.message || e}</p>`;
  }
};

window.abrirCriarQuest = async function() {
  document.getElementById("cq-titulo").value = "";
  document.getElementById("cq-descricao").value = "";
  document.getElementById("cq-tipo").value = "lixo";
  document.getElementById("cq-hp").value = "100";
  document.getElementById("cq-recomp").value = "200";
  const geoStatus = document.getElementById("cq-geo-status");
  geoStatus.textContent = "📍 Pegando sua localização…";
  document.getElementById("modal-criar-quest").style.display = "flex";
  window._questAtualGeo = null;
  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
    });
    window._questAtualGeo = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    geoStatus.innerHTML = `✓ Localização: <code>${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}</code>`;
    geoStatus.style.color = "#4caf50";
  } catch (e) {
    geoStatus.textContent = tr("quest_geo_sem");
    geoStatus.style.color = "#ff9800";
  }
};

window.confirmarCriarQuest = async function() {
  const titulo = document.getElementById("cq-titulo").value.trim();
  const tipo = document.getElementById("cq-tipo").value;
  const desc = document.getElementById("cq-descricao").value.trim();
  const hp = parseInt(document.getElementById("cq-hp").value, 10) || 100;
  const recomp = parseInt(document.getElementById("cq-recomp").value, 10) || 0;
  if (titulo.length < 4) { alert("Título muito curto."); return; }
  let lat = window._questAtualGeo?.lat;
  let lng = window._questAtualGeo?.lng;
  if (lat == null || lng == null) {
    // fallback: cidade do user
    const cidade = VSSupabase.userCidade?.() || "Curitiba";
    const fallback = ({ Curitiba: [-25.43, -49.27], Florianópolis: [-27.59, -48.55], "Porto Alegre": [-30.03, -51.23] })[cidade] || [-25.43, -49.27];
    lat = fallback[0]; lng = fallback[1];
  }
  const cidade = VSSupabase.userCidade?.() || null;
  const estado = VSSupabase.userEstado?.() || null;
  const btn = document.getElementById("cq-confirmar");
  btn.disabled = true; btn.textContent = "Criando…";
  try {
    const id = await VSSupabase.rpc("criar_quest", {
      p_titulo: titulo, p_tipo: tipo, p_lat: lat, p_lng: lng,
      p_cidade: cidade, p_estado: estado, p_descricao: desc,
      p_recompensa_sulis: recomp, p_hp_inicial: hp
    });
    document.getElementById("modal-criar-quest").style.display = "none";
    await atualizarQuests();
    if (id) abrirDetalheQuest(typeof id === "string" ? id : id?.[0] || id);
  } catch (e) {
    alert("Erro: " + (e.message || e));
  } finally {
    btn.disabled = false; btn.textContent = "🌳 Criar";
  }
};

window.abrirDetalheQuest = async function(qid) {
  const corpo = document.getElementById("qd-corpo");
  corpo.innerHTML = `<div class="loading" style="padding:30px;text-align:center;color:var(--hint)">Carregando…</div>`;
  document.getElementById("modal-quest-detalhe").style.display = "flex";
  try {
    const [qsArr, evids, parts] = await Promise.all([
      sb(`v_quests_mapa?select=*&id=eq.${qid}&limit=1`),
      sb(`quest_evidencias?select=*&quest_id=eq.${qid}&order=created_at.desc&limit=40`),
      sb(`quest_participantes?select=*&quest_id=eq.${qid}`)
    ]);
    const q = qsArr?.[0];
    if (!q) { corpo.innerHTML = `<p style="color:#f44">${tr("quest_nao_encontrada")}</p>`; return; }
    const session = VSSupabase.getSession?.()?.session || VSSupabase.getSession?.();
    const userId = session?.user?.id;
    const souParticipante = parts?.some(p => p.user_id === userId);
    const pct = Math.max(0, Math.min(100, Math.round((q.hp_atual / q.hp_inicial) * 100)));
    const corHp = pct > 60 ? "#e53935" : pct > 30 ? "#ff9800" : "#4caf50";
    corpo.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="font-size:36px">${q.icon || "🌳"}</div>
        <div style="flex:1">
          <h3 style="margin:0">${escapeHtml(q.titulo)}</h3>
          <small style="color:var(--hint)">${escapeHtml(q.cidade || "")}/${escapeHtml(q.estado || "")} · status: ${escapeHtml(q.status)}</small>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin:8px 0">
        <div style="flex:1;height:14px;background:rgba(255,255,255,0.10);border-radius:6px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${corHp};transition:width 0.4s"></div>
        </div>
        <strong style="color:${corHp};min-width:80px;text-align:right">HP ${q.hp_atual}/${q.hp_inicial}</strong>
      </div>
      <p style="font-size:13px;color:var(--hint);margin:8px 0">🪙 ${q.recompensa_sulis} sulis · 👥 ${q.participantes} participantes · 📷 ${q.evidencias_ok} evidências aprovadas</p>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin:10px 0">
        ${souParticipante
          ? `<button class="btn-primary" style="background:rgba(120,120,120,0.4);padding:8px;font-size:11px" onclick="sairDaQuest('${q.id}')">🚪 ${tr("quest_btn_sair")}</button>`
          : `<button class="btn-primary" style="background:rgba(229,57,53,0.55);padding:8px;font-size:11px" onclick="entrarNaQuest('${q.id}')">🌳 ${tr("quest_btn_entrar")}</button>`
        }
        <button class="btn-primary" style="background:rgba(255,140,0,0.55);padding:8px;font-size:11px" onclick="enviarEvidenciaQuest('${q.id}','ANTES')">📷 ${tr("quest_btn_antes")}</button>
        <button class="btn-primary" style="background:rgba(76,175,80,0.55);padding:8px;font-size:11px" onclick="enviarEvidenciaQuest('${q.id}','DEPOIS')">📷 ${tr("quest_btn_depois")}</button>
      </div>

      <h4 style="margin:14px 0 6px;font-size:13px">${tr("quest_evidencias_h")}</h4>
      ${(evids || []).length === 0
        ? `<p style="font-size:12px;color:var(--hint)">${tr("quest_nenhuma_foto")}</p>`
        : `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:300px;overflow-y:auto">
            ${(evids || []).map(e => `
              <div style="position:relative">
                <img src="${escapeHtml(e.foto_url)}" loading="lazy" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;${e.aprovada ? "border:2px solid #4caf50" : "border:1px dashed rgba(255,255,255,0.30)"}">
                <div style="position:absolute;top:4px;left:4px;background:rgba(0,0,0,0.70);padding:2px 6px;border-radius:4px;font-size:10px;color:#fff">
                  ${e.momento}${e.aprovada ? ` · ✓ -${e.dano_aplicado}HP` : " · pendente"}
                </div>
              </div>`).join("")}
          </div>`
      }`;
  } catch (e) {
    corpo.innerHTML = `<p style="color:#f44">Erro: ${e.message || e}</p>`;
  }
};

window.entrarNaQuest = async function(qid) {
  try {
    await VSSupabase.rpc("entrar_quest", { p_quest_id: qid });
    abrirDetalheQuest(qid);
    atualizarQuests();
  } catch (e) { alert("Erro: " + (e.message || e)); }
};

window.sairDaQuest = async function(qid) {
  if (!confirm("Sair dessa quest?")) return;
  try {
    await VSSupabase.rpc("sair_quest", { p_quest_id: qid });
    abrirDetalheQuest(qid);
    atualizarQuests();
  } catch (e) { alert("Erro: " + (e.message || e)); }
};

window.enviarEvidenciaQuest = function(qid, momento) {
  const inp = document.getElementById("qd-file-input");
  inp.onchange = async (ev) => {
    const file = ev.target.files?.[0];
    inp.value = "";
    if (!file) return;
    try {
      const blob = await comprimirImagem(file, 1400, 0.82);
      const path = `quests/${qid}/${momento.toLowerCase()}-${Date.now()}.webp`;
      const url = await VSSupabase.uploadFile("feira-fotos", path, blob);
      let lat = null, lng = null;
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
        lat = pos.coords.latitude; lng = pos.coords.longitude;
      } catch {}
      await VSSupabase.rpc("enviar_evidencia", {
        p_quest_id: qid, p_foto_url: url, p_momento: momento,
        p_lat: lat, p_lng: lng
      });
      vsToast?.({ tipo: "success", titulo: tr("toast_evid_t"), corpo: tr("toast_evid_c"), dur: 4000 });
      abrirDetalheQuest(qid);
    } catch (e) {
      vsToast?.({ tipo: "error", titulo: "Erro ao enviar", corpo: e.message || String(e), dur: 6000 });
    }
  };
  inp.click();
};

// ─────────────────────────────────────────────────────────────
// 💰 Saques Pix do comerciante
// ─────────────────────────────────────────────────────────────
window.abrirSaquesPix = async function() {
  let modal = document.getElementById("modal-saques-pix");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-saques-pix";
    modal.className = "modal-bg zone-comercial";
    modal.style.zIndex = "9700";
    modal.innerHTML = `<div class="modal" style="max-width:560px;width:96%;max-height:92vh;overflow-y:auto"></div>`;
    document.body.appendChild(modal);
  }
  const inner = modal.querySelector(".modal");
  inner.innerHTML = `<div class="loading" style="padding:30px;text-align:center;color:var(--zc-hint)">Carregando…</div>`;
  modal.style.display = "flex";

  try {
    const [saldo, lista] = await Promise.all([
      VSSupabase.rpc("meu_saldo_pix"),
      sb("saques?select=*&order=criado_em.desc&limit=20").catch(() => [])
    ]);
    const s = (saldo && typeof saldo === "object") ? saldo : {};
    const fmt = c => "R$ " + ((c || 0) / 100).toFixed(2);
    const corStatus = {
      pendente:  "var(--zc-warn)",
      aprovado:  "var(--zc-accent)",
      pago:      "var(--zc-positivo)",
      rejeitado: "var(--zc-negativo)",
      cancelado: "var(--zc-hint)"
    };
    inner.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="color:var(--zc-positivo)">${VSIcons.svg("bank", 28)}</span>
        <div style="flex:1">
          <h3 style="margin:0">${tr("saques_pix")}</h3>
          <small style="color:var(--zc-hint)">${tr("saques_sub")}</small>
        </div>
      </div>
      <div class="card-info" style="padding:14px;margin:10px 0">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;font-variant-numeric:tabular-nums">
          <div><div style="color:var(--zc-hint)">${tr("saque_total_recebido")}</div><strong style="font-size:16px">${fmt(s.recebido_centavos)}</strong></div>
          <div style="text-align:right"><div style="color:var(--zc-hint)">${tr("saque_disponivel_sacar")}</div><strong style="font-size:18px;color:var(--zc-positivo)">${fmt(s.disponivel_centavos)}</strong></div>
          <div><div style="color:var(--zc-hint)">${tr("saque_pendentes")}</div>${fmt(s.pendente_centavos)}</div>
          <div style="text-align:right"><div style="color:var(--zc-hint)">${tr("saque_aprovados")}</div>${fmt(s.aprovado_centavos)}</div>
          <div><div style="color:var(--zc-hint)">${tr("saque_ja_pago")}</div>${fmt(s.pago_centavos)}</div>
        </div>
      </div>
      <button class="btn-primary mc-btn-saques" id="btn-novo-saque" style="width:100%;font-size:14px;padding:12px;display:inline-flex;align-items:center;justify-content:center;gap:8px;${(s.disponivel_centavos || 0) < 1000 ? "opacity:0.4;pointer-events:none" : ""}" onclick="abrirNovoSaque(${s.disponivel_centavos || 0})">
        ${VSIcons.svg("download", 16)} ${tr("saques_solicitar")}
      </button>

      <h4 style="margin:14px 0 6px;font-size:13px;color:var(--zc-hint);letter-spacing:0.5px;text-transform:uppercase">${tr("saques_historico")}</h4>
      ${(lista || []).length === 0
        ? `<p style="color:var(--zc-hint);font-size:12px;text-align:center;padding:14px">${tr("saques_nenhum")}</p>`
        : (lista || []).map(s => `
          <div class="card-info" style="margin:6px 0;padding:10px;border-left:3px solid ${corStatus[s.status] || "var(--zc-hint)"}">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px">
              <strong style="font-variant-numeric:tabular-nums">${fmt(s.valor_centavos)}</strong>
              <span style="text-transform:uppercase;color:${corStatus[s.status] || "var(--zc-hint)"};font-weight:700;font-size:11px;letter-spacing:0.5px">${s.status}</span>
            </div>
            <small style="color:var(--zc-hint);display:block;margin-top:2px">
              ${escapeHtml(s.tipo_chave)} · ${escapeHtml(maskPix(s.chave_pix))} · ${new Date(s.criado_em).toLocaleString("pt-BR")}
            </small>
            ${s.motivo ? `<small style="color:var(--zc-negativo);display:block">${escapeHtml(s.motivo)}</small>` : ""}
            ${s.status === "pendente" ? `<button class="btn-primary mc-btn" style="margin-top:6px;font-size:11px;padding:5px 10px" onclick="cancelarSaque('${s.id}')">Cancelar</button>` : ""}
          </div>`).join("")
      }

      <button class="btn-primary mc-btn" style="width:100%;margin-top:14px" onclick="document.getElementById('modal-saques-pix').style.display='none'">${tr("saque_fechar")}</button>
    `;
  } catch (e) {
    inner.innerHTML = `<p style="color:var(--zc-negativo)">Erro: ${escapeHtml(e.message || String(e))}</p>`;
  }
};

function maskPix(chave) {
  if (!chave) return "";
  if (chave.length > 8) return chave.slice(0, 3) + "***" + chave.slice(-3);
  return chave;
}

window.abrirNovoSaque = function(disponivelCentavos) {
  let modal = document.getElementById("modal-novo-saque");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-novo-saque";
    modal.className = "modal-bg zone-comercial";
    modal.style.zIndex = "9710";
    modal.innerHTML = `<div class="modal" style="max-width:480px;width:96%"></div>`;
    document.body.appendChild(modal);
  }
  const max = (disponivelCentavos / 100).toFixed(2);
  modal.querySelector(".modal").innerHTML = `
    <h3 style="display:inline-flex;align-items:center;gap:8px">${VSIcons.svg("download", 18)} ${tr("saques_novo")}</h3>
    <p style="font-size:12px;color:var(--zc-hint);margin:6px 0 10px">
      Disponível: <strong style="color:var(--zc-positivo);font-variant-numeric:tabular-nums">R$ ${max}</strong>. Mínimo R$ 10,00.
    </p>
    <label style="display:block;margin-bottom:4px">${tr("saque_tipo_chave")}</label>
    <select id="ns-tipo" style="margin-bottom:10px">
      <option value="cpf">CPF</option>
      <option value="cnpj">CNPJ</option>
      <option value="email">Email</option>
      <option value="celular">${tr("saque_opt_celular")}</option>
      <option value="aleatoria">Chave aleatória</option>
    </select>
    <label style="display:block;margin-bottom:4px">${tr("saque_label_chave")}</label>
    <input id="ns-chave" type="text" placeholder="${tr("saque_ph_chave")}" style="margin-bottom:10px;font-family:monospace">
    <label style="display:block;margin-bottom:4px">${tr("saque_label_valor")}</label>
    <input id="ns-valor" type="number" min="10" max="${max}" step="0.01" placeholder="ex: 50.00" style="margin-bottom:14px">
    <div style="display:flex;gap:8px">
      <button class="btn-primary mc-btn" style="flex:1" onclick="document.getElementById('modal-novo-saque').style.display='none'">Cancelar</button>
      <button class="btn-primary mc-btn-saques" id="ns-confirmar" style="flex:2;display:inline-flex;align-items:center;justify-content:center;gap:6px" onclick="confirmarNovoSaque()">${VSIcons.svg("send", 14)} ${tr("saque_btn_solicitar")}</button>
    </div>
    <p style="font-size:11px;color:var(--zc-hint);margin-top:10px;text-align:center">${tr("saque_rodape")}</p>
  `;
  modal.style.display = "flex";
};

window.confirmarNovoSaque = async function() {
  const tipo = document.getElementById("ns-tipo").value;
  const chave = document.getElementById("ns-chave").value.trim();
  const valorRaw = parseFloat(document.getElementById("ns-valor").value);
  if (!chave || chave.length < 4) { alert("Chave Pix inválida."); return; }
  if (!Number.isFinite(valorRaw) || valorRaw < 10) { alert("Mínimo R$ 10,00."); return; }
  const valorCentavos = Math.round(valorRaw * 100);
  const btn = document.getElementById("ns-confirmar");
  btn.disabled = true; btn.textContent = "Enviando…";
  try {
    await VSSupabase.rpc("solicitar_saque", {
      p_valor_centavos: valorCentavos,
      p_chave_pix: chave,
      p_tipo_chave: tipo
    });
    document.getElementById("modal-novo-saque").style.display = "none";
    abrirSaquesPix(); // recarrega lista
    vsToast?.({ tipo: "success", titulo: tr("toast_saque_t"), corpo: tr("toast_saque_c"), dur: 5000 });
  } catch (e) {
    const msg = (e?.message || "").toUpperCase();
    let texto = e?.message || "Erro";
    if (msg.includes("VALOR_MINIMO_10_REAIS"))   texto = "Mínimo R$ 10,00";
    else if (msg.includes("SALDO_INSUFICIENTE")) texto = "Saldo insuficiente";
    else if (msg.includes("CHAVE_PIX_OBRIGATORIA")) texto = "Chave inválida";
    alert("Erro: " + texto);
  } finally {
    btn.disabled = false; btn.textContent = "💰 Solicitar";
  }
};

window.cancelarSaque = async function(id) {
  if (!confirm("Cancelar este saque?")) return;
  try {
    await VSSupabase.rpc("cancelar_saque", { p_saque_id: id });
    abrirSaquesPix();
  } catch (e) { alert("Erro: " + (e.message || e)); }
};

// ─────────────────────────────────────────────────────────────
// 🧾 Validar recibo da feira (comerciante)
// ─────────────────────────────────────────────────────────────
window._barracaValidando = null;
window.abrirValidarRecibo = function(barracaId, barracaNome) {
  window._barracaValidando = barracaId;
  const tit = document.getElementById("vr-titulo");
  if (tit) tit.innerHTML = `<span style="display:inline-flex;align-items:center;justify-content:center;gap:8px">${VSIcons.svg("check", 18)}<span>${tr("vr_titulo")}</span></span>`;
  const colar = document.getElementById("vr-colar-btn");
  if (colar) colar.innerHTML = `${VSIcons.svg("list", 12)} ${tr("vr_btn_colar")}`;
  const validar = document.getElementById("vr-validar-btn");
  if (validar) validar.innerHTML = `${VSIcons.svg("check", 14)} ${tr("vr_btn_validar")}`;
  document.getElementById("vr-barraca-nome").textContent = barracaNome ? `Barraca: ${barracaNome}` : "";
  document.getElementById("vr-codigo").value = "";
  document.getElementById("vr-resultado").innerHTML = "";
  document.getElementById("modal-validar-recibo").style.display = "flex";
  setTimeout(() => document.getElementById("vr-codigo").focus(), 80);
};

window.colarCodigoRecibo = async function() {
  try {
    const txt = await navigator.clipboard.readText();
    if (txt) document.getElementById("vr-codigo").value = txt.trim();
  } catch {
    alert(tr("vr_alert_clipboard"));
  }
};

window.validarReciboFeira = async function() {
  const inp = document.getElementById("vr-codigo");
  const out = document.getElementById("vr-resultado");
  const codigo = (inp.value || "").trim();
  if (!codigo) { out.innerHTML = `<div style="color:#ff7043">${tr("vr_digita_codigo")}</div>`; return; }
  out.innerHTML = `<div style="color:var(--hint)">Validando…</div>`;
  try {
    const r = await VSSupabase.rpc("validar_recibo_feira", { p_codigo: codigo });
    const d = Array.isArray(r) ? r[0] : r;
    if (!d) { out.innerHTML = `<div style="color:#ff7043">${tr("vr_sem_resposta")}</div>`; return; }
    const valor = "R$ " + ((d.valor_centavos || 0) / 100).toFixed(2);
    const dataCompra = new Date(d.created_at).toLocaleString("pt-BR");
    const conf = d.conferido_em
      ? `<div style="color:#ffd54f;margin-top:6px">⚠️ Já tinha sido conferida em ${new Date(d.conferido_em).toLocaleString("pt-BR")}</div>`
      : `<div style="color:#4caf50;margin-top:6px">${tr("vr_conferido")}</div>`;
    const corBorda = d.status === "ja_conferida" ? "#ffd54f" : (d.status === "ok" ? "#4caf50" : "#ff7043");
    out.innerHTML = `
      <div style="background:rgba(76,175,80,0.10);border:1px solid ${corBorda};border-radius:10px;padding:12px;margin-top:8px">
        <div style="font-size:18px;font-weight:700">${valor}</div>
        <div style="font-size:12px;color:var(--hint);margin-top:4px">${escapeHtml(d.barraca_nome || "")} · ${escapeHtml(d.cidade || "")}/${escapeHtml(d.estado || "")}</div>
        <div style="font-size:12px;color:var(--hint);margin-top:4px">📅 ${dataCompra}</div>
        ${d.comprador_email ? `<div style="font-size:12px;margin-top:4px">👤 ${escapeHtml(d.comprador_email)}</div>` : ""}
        <div style="font-size:11px;color:var(--hint);margin-top:6px;font-family:monospace">Código: ${escapeHtml(d.codigo_recibo)}</div>
        ${conf}
      </div>`;
  } catch (e) {
    const msg = (e?.message || "").toUpperCase();
    let texto = e?.message || "Erro desconhecido";
    if (msg.includes("AUTH_REQUIRED"))         texto = "Você precisa estar logado.";
    else if (msg.includes("CODIGO_NAO_ENCONTRADO")) texto = "Código não existe. Verifica se digitou certo.";
    else if (msg.includes("NAO_E_DONO_BARRACA"))    texto = "Esse recibo não é de uma barraca sua.";
    out.innerHTML = `<div style="color:#ff7043;background:rgba(244,67,54,0.10);border:1px solid rgba(244,67,54,0.40);border-radius:10px;padding:12px;margin-top:8px">❌ ${escapeHtml(texto)}</div>`;
  }
};

// ─────────────────────────────────────────────────────────────
// 📚 Explica os planos de destaque agrupados por categoria
// ─────────────────────────────────────────────────────────────
async function _renderExplicaPlanos() {
  const planos = await carregarPlanos();
  if (!planos.length) return;
  const grupos = {
    perto:       ["geoloc", "geoloc_anual", "destaque_perto", "destaque_perto_anual"],
    carrosseis:  ["carrossel_cidade", "carrossel_cidade_anual", "carrossel_landing", "carrossel_landing_anual"],
    banner:      ["banner_landing", "banner_landing_anual"],
    caca:        ["caca_trilha", "caca_trilha_anual"],
    feira:       ["destaque_feira", "destaque_feira_anual"]
  };
  const card = (p) => {
    const reais = (p.preco_centavos / 100).toFixed(2).replace(/\.00$/, "");
    const anual = p.codigo.includes("anual");
    const cor = anual ? "rgba(255,193,7,0.12)" : "rgba(38,124,180,0.10)";
    const borda = anual ? "rgba(255,193,7,0.45)" : "rgba(38,124,180,0.40)";
    return `
      <div style="background:${cor};border:1px solid ${borda};border-radius:8px;padding:9px;margin:6px 0">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
          <strong style="font-size:13px">${escapeHtml(p.nome)}</strong>
          <strong style="color:#7af0ff;font-size:13px;white-space:nowrap">R$ ${reais}<small style="color:var(--hint);font-weight:400">/${p.duracao_dias===365?"ano":"mês"}</small></strong>
        </div>
        <div style="font-size:12px;color:var(--hint);margin-top:4px;line-height:1.4">${escapeHtml(p.descricao || "")}</div>
      </div>`;
  };
  const renderGrupo = (idEl, codigos) => {
    const el = document.getElementById(idEl);
    if (!el) return;
    const lista = codigos.map(c => planos.find(p => p.codigo === c)).filter(Boolean);
    el.innerHTML = lista.length ? lista.map(card).join("") : "<small style='color:var(--hint)'>(em breve)</small>";
  };
  renderGrupo("explica-perto", grupos.perto);
  renderGrupo("explica-carrosseis", grupos.carrosseis);
  renderGrupo("explica-banner", grupos.banner);
  renderGrupo("explica-caca", grupos.caca);
  renderGrupo("explica-feira", grupos.feira);
}

// ─────────────────────────────────────────────────────────────
// 🏪 Gerenciar barraca — comerciante edita telhado + produtos
// ─────────────────────────────────────────────────────────────
async function comprimirImagem(file, maxLado = 1200, qualidade = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result; };
    reader.onerror = reject;
    img.onload = () => {
      let { width: w, height: h } = img;
      if (w > maxLado || h > maxLado) {
        const r = w > h ? maxLado / w : maxLado / h;
        w = Math.round(w * r); h = Math.round(h * r);
      }
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      c.toBlob(b => b ? resolve(b) : reject(new Error("toBlob falhou")), "image/webp", qualidade);
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

window.abrirGerirBarraca = async function(barracaId) {
  location.href = `/comerciante-painel.html?barraca_id=${barracaId}`;
};

async function _renderGerirBarraca(inner, b) {
  const produtos = await sb(`feira_produtos?barraca_id=eq.${b.id}&select=id,nome,descricao,foto_url,preco_centavos,sulcoins,disponivel,ordem&order=ordem.asc`).catch(() => []);
  inner.innerHTML = `
    <h3 style="margin:0 0 4px">⚙️ ${escapeHtml(b.nome)}</h3>
    <p style="font-size:12px;color:var(--hint);margin:0 0 14px">${escapeHtml(b.categoria || "—")} · ${escapeHtml(b.cidade || "")}/${escapeHtml(b.estado || "")}</p>

    <div class="card-info" style="margin:6px 0">
      <strong>🏠 ${tr("gerir_foto_telhado")}</strong>
      <div id="gerir-telhado-preview" style="margin:10px 0;height:140px;border-radius:10px;background:${b.telhado_url ? `url('${b.telhado_url}') center/cover` : "rgba(255,255,255,0.05)"};display:flex;align-items:center;justify-content:center;color:var(--hint);font-size:13px">
        ${b.telhado_url ? "" : "(sem foto ainda)"}
      </div>
      <input type="file" id="gerir-telhado-input" accept="image/*" style="display:none">
      <button class="btn-primary" style="width:100%;font-size:13px" onclick="document.getElementById('gerir-telhado-input').click()">📸 ${tr("gerir_trocar_telhado")}</button>
      <div id="gerir-telhado-status" style="font-size:12px;color:var(--hint);margin-top:6px;text-align:center"></div>
    </div>

    <div class="card-info" style="margin:14px 0">
      <strong>📝 ${tr("gerir_desc_titulo")}</strong>
      <textarea id="gerir-desc" rows="3" placeholder="${tr("gerir_desc_placeholder")}"
                style="width:100%;margin-top:8px;padding:10px;background:rgba(255,255,255,0.05);color:var(--text);border:1px solid rgba(255,255,255,0.20);border-radius:8px;font-size:13px;line-height:1.4">${escapeHtml(b.descricao || "")}</textarea>
      <button class="btn-primary" style="width:100%;margin-top:8px;font-size:13px;background:rgba(13,114,62,0.55)" onclick="_salvarDescBarraca('${b.id}')">💾 ${tr("gerir_salvar_desc")}</button>
    </div>

    <div class="card-info" style="margin:14px 0">
      <strong>💳 ${tr("gerir_chave_pix_titulo")}</strong>
      ${b.chave_pix
        ? `<div style="margin:8px 0;padding:8px 12px;background:rgba(34,197,94,0.15);border-radius:8px;border:1px solid rgba(34,197,94,0.3);font-size:12px">
             ✅ ${tr("gerir_pix_configurado")}: <strong>${escapeHtml(b.chave_pix)}</strong>
             ${b.pix_nome_titular ? `· ${escapeHtml(b.pix_nome_titular)}` : ""}
           </div>`
        : `<div style="margin:8px 0;padding:8px 12px;background:rgba(239,68,68,0.12);border-radius:8px;border:1px solid rgba(239,68,68,0.3);font-size:12px">
             ⚠️ ${tr("gerir_sem_pix")}
           </div>`}
      <div style="display:grid;gap:8px;margin-top:10px">
        <select id="gerir-pix-tipo" style="padding:10px;background:rgba(255,255,255,0.06);color:var(--text);border:1px solid rgba(255,255,255,0.18);border-radius:8px;font-size:13px">
          <option value="cpf">CPF</option>
          <option value="cnpj">CNPJ</option>
          <option value="email">E-mail</option>
          <option value="telefone">Telefone (+55...)</option>
          <option value="aleatoria">Chave aleatória</option>
        </select>
        <input id="gerir-pix-chave" type="text" placeholder="${tr("gerir_pix_chave_ph")}"
               value="${escapeHtml(b.chave_pix || "")}"
               style="padding:10px;background:rgba(255,255,255,0.06);color:var(--text);border:1px solid rgba(255,255,255,0.18);border-radius:8px;font-size:13px">
        <input id="gerir-pix-nome" type="text" placeholder="${tr("gerir_pix_nome_ph")}"
               value="${escapeHtml(b.pix_nome_titular || "")}"
               style="padding:10px;background:rgba(255,255,255,0.06);color:var(--text);border:1px solid rgba(255,255,255,0.18);border-radius:8px;font-size:13px">
        <button class="btn-primary" style="background:rgba(13,114,62,0.55);font-size:13px"
                onclick="_salvarPixBarraca('${b.id}')">💾 ${tr("gerir_salvar_pix")}</button>
        <div id="gerir-pix-status" style="font-size:12px;color:var(--hint);text-align:center;min-height:16px"></div>
      </div>
    </div>

    <div class="card-info" style="margin:14px 0">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>🛒 Produtos (${produtos.length})</strong>
        <button class="btn-primary" style="padding:6px 12px;font-size:12px;background:rgba(38,124,180,0.55)" onclick="_novoProduto('${b.id}')">+ ${tr("gerir_novo")}</button>
      </div>
      <div id="gerir-produtos" style="margin-top:10px"></div>
    </div>

    <button class="btn-primary" style="width:100%;margin-top:10px;background:rgba(120,120,120,0.4)" onclick="document.getElementById('modal-gerir-barraca').style.display='none'">Fechar</button>`;

  _renderProdutos(produtos, b.id);

  document.getElementById("gerir-telhado-input").addEventListener("change", async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const status = document.getElementById("gerir-telhado-status");
    status.textContent = "📤 Enviando…";
    try {
      const blob = await comprimirImagem(file, 1400, 0.85);
      const path = `barracas/${b.id}/telhado-${Date.now()}.webp`;
      const url = await VSSupabase.uploadFile("feira-fotos", path, blob);
      await VSSupabase.request(`feira_barracas?id=eq.${b.id}`, {
        method: "PATCH", body: JSON.stringify({ telhado_url: url })
      });
      document.getElementById("gerir-telhado-preview").style.background = `url('${url}') center/cover`;
      document.getElementById("gerir-telhado-preview").textContent = "";
      status.textContent = "✅ Telhado atualizado";
      window.VSMagia?.celebrar({ tipo: "missao", mensagem: "🏠 Cara nova na barraca!" });
    } catch (err) {
      status.textContent = `❌ ${err.message}`;
      vsToast({ tipo: "error", titulo: "Falha no upload", corpo: err.message?.slice(0, 200), dur: 9000 });
    }
  });
}

function _renderProdutos(produtos, barracaId) {
  const cont = document.getElementById("gerir-produtos");
  if (!cont) return;
  if (!produtos.length) {
    cont.innerHTML = `<p style="color:var(--hint);font-size:12px;text-align:center;padding:14px">${tr("gerir_sem_produtos")}</p>`;
    return;
  }
  cont.innerHTML = produtos.map(p => `
    <div class="card-info" style="margin:6px 0;display:flex;gap:10px;align-items:center">
      <div style="width:60px;height:60px;border-radius:8px;background:${p.foto_url ? `url('${p.foto_url}') center/cover` : "rgba(255,255,255,0.06)"};flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:24px">${p.foto_url ? "" : "📷"}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:14px">${escapeHtml(p.nome)}</div>
        <div style="font-size:11px;color:var(--hint);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(p.descricao || "—")}</div>
        <div style="font-size:13px;color:#7af0ff;margin-top:2px">R$ ${(p.preco_centavos/100).toFixed(2)} ${p.disponivel ? "" : `<span style='color:#f48fb1'>· ${tr("gerir_indisponivel")}</span>`}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">
        <button onclick="_editarProduto('${p.id}','${barracaId}')" style="background:rgba(38,124,180,0.55);border:none;color:#fff;padding:5px 10px;border-radius:6px;font-size:11px;cursor:pointer">✏️</button>
        <button onclick="_deletarProduto('${p.id}','${barracaId}')" style="background:rgba(229,57,53,0.55);border:none;color:#fff;padding:5px 10px;border-radius:6px;font-size:11px;cursor:pointer">🗑️</button>
      </div>
    </div>`).join("");
}

window._salvarPixBarraca = async function(barracaId) {
  const chave = document.getElementById("gerir-pix-chave")?.value?.trim();
  const tipo  = document.getElementById("gerir-pix-tipo")?.value || "cpf";
  const nome  = document.getElementById("gerir-pix-nome")?.value?.trim();
  const status = document.getElementById("gerir-pix-status");
  if (!chave) { vsToast({ tipo: "warn", titulo: "Informe a chave Pix" }); return; }
  if (status) status.textContent = "Salvando…";
  try {
    const r = await VSSupabase.rpc("dono_set_pix_barraca", {
      p_barraca_id: barracaId,
      p_chave_pix: chave,
      p_tipo_pix: tipo,
      p_nome_titular: nome || null
    });
    const res = Array.isArray(r) ? r[0] : r;
    if (res?.ok === false) throw new Error(res.erro || "Erro desconhecido");
    if (status) status.textContent = "✅ Pix salvo!";
    vsToast({ tipo: "success", titulo: "✓ Chave Pix salva", corpo: "Clientes já podem gerar QR de pagamento." });
  } catch (e) {
    if (status) status.textContent = "❌ " + (e.message || e);
    vsToast({ tipo: "error", titulo: "Falha ao salvar Pix", corpo: e.message?.slice(0, 200) });
  }
};

window._salvarDescBarraca = async function(barracaId) {
  const desc = document.getElementById("gerir-desc").value.trim();
  try {
    await VSSupabase.request(`feira_barracas?id=eq.${barracaId}`, {
      method: "PATCH", body: JSON.stringify({ descricao: desc })
    });
    vsToast({ tipo: "success", titulo: "✓ Descrição salva" });
  } catch (e) {
    vsToast({ tipo: "error", titulo: "Falha", corpo: e.message?.slice(0, 200) });
  }
};

window._novoProduto = function(barracaId) { _abrirFormProduto({ barraca_id: barracaId }); };
window._editarProduto = async function(produtoId, barracaId) {
  const arr = await sb(`feira_produtos?id=eq.${produtoId}&select=*`);
  const p = arr?.[0];
  if (p) _abrirFormProduto(p);
};
window._deletarProduto = async function(produtoId, barracaId) {
  if (!confirm("Deletar este produto?")) return;
  try {
    await VSSupabase.request(`feira_produtos?id=eq.${produtoId}`, { method: "DELETE" });
    const novos = await sb(`feira_produtos?barraca_id=eq.${barracaId}&select=id,nome,descricao,foto_url,preco_centavos,sulcoins,disponivel,ordem&order=ordem.asc`).catch(() => []);
    _renderProdutos(novos, barracaId);
    vsToast({ tipo: "success", titulo: "✓ Removido" });
  } catch (e) {
    vsToast({ tipo: "error", titulo: "Falha", corpo: e.message?.slice(0, 200) });
  }
};

function _abrirFormProduto(p = {}) {
  const ehNovo = !p.id;
  let modal = document.getElementById("modal-produto");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-produto";
    modal.className = "modal-bg";
    modal.style.zIndex = "9750";
    modal.innerHTML = `<div class="modal" style="max-width:480px"></div>`;
    document.body.appendChild(modal);
  }
  const inner = modal.querySelector(".modal");
  inner.innerHTML = `
    <h3>${ehNovo ? "+ Novo" : "✏️ Editar"} produto</h3>
    <div style="margin:10px 0">
      <label style="font-size:12px;color:var(--hint)">${tr("gerir_foto")}</label>
      <div id="prod-foto-preview" style="height:110px;border-radius:10px;background:${p.foto_url ? `url('${p.foto_url}') center/cover` : "rgba(255,255,255,0.06)"};margin:6px 0;display:flex;align-items:center;justify-content:center;font-size:32px;color:var(--hint)">${p.foto_url ? "" : "📷"}</div>
      <input type="file" id="prod-foto-input" accept="image/*" style="display:none">
      <button class="btn-primary" style="width:100%;font-size:12px;padding:7px;background:rgba(255,255,255,0.10)" onclick="document.getElementById('prod-foto-input').click()">📸 ${p.foto_url ? "Trocar" : "Adicionar"} foto</button>
      <div id="prod-foto-status" style="font-size:11px;color:var(--hint);margin-top:4px"></div>
    </div>
    <label style="font-size:12px;color:var(--hint)">${tr("gerir_nome")}</label>
    <input id="prod-nome" type="text" maxlength="60" value="${escapeHtml(p.nome || "")}"
           style="width:100%;padding:9px;background:rgba(255,255,255,0.05);color:var(--text);border:1px solid rgba(255,255,255,0.20);border-radius:6px;margin:4px 0 10px">
    <label style="font-size:12px;color:var(--hint)">${tr("gerir_descricao")}</label>
    <textarea id="prod-desc" rows="3" maxlength="280"
              style="width:100%;padding:9px;background:rgba(255,255,255,0.05);color:var(--text);border:1px solid rgba(255,255,255,0.20);border-radius:6px;margin:4px 0 10px;font-size:13px">${escapeHtml(p.descricao || "")}</textarea>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      <div>
        <label style="font-size:12px;color:var(--hint)">${tr("gerir_preco")}</label>
        <input id="prod-preco" type="number" min="0" step="0.01" value="${p.preco_centavos ? (p.preco_centavos/100).toFixed(2) : ""}"
               style="width:100%;padding:9px;background:rgba(255,255,255,0.05);color:var(--text);border:1px solid rgba(255,255,255,0.20);border-radius:6px">
      </div>
      <div>
        <label style="font-size:12px;color:var(--hint)">${tr("gerir_sulcoin_extra")}</label>
        <input id="prod-sulcoins" type="number" min="0" step="1" value="${p.sulcoins || 0}"
               style="width:100%;padding:9px;background:rgba(255,255,255,0.05);color:var(--text);border:1px solid rgba(255,255,255,0.20);border-radius:6px">
      </div>
    </div>
    <label style="display:flex;gap:6px;align-items:center;font-size:13px;margin:6px 0">
      <input id="prod-disp" type="checkbox" ${p.disponivel === false ? "" : "checked"}> ${tr("gerir_disponivel")}
    </label>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn-primary" style="flex:1;background:rgba(120,120,120,0.4)" onclick="document.getElementById('modal-produto').style.display='none'">Cancelar</button>
      <button class="btn-primary" style="flex:2" id="btn-salvar-prod">${ehNovo ? "Adicionar" : "Salvar"}</button>
    </div>`;
  modal.style.display = "flex";

  let novaFotoUrl = p.foto_url || null;
  document.getElementById("prod-foto-input").addEventListener("change", async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const status = document.getElementById("prod-foto-status");
    status.textContent = "📤 Enviando…";
    try {
      const blob = await comprimirImagem(file, 800, 0.82);
      const path = `barracas/${p.barraca_id}/produtos/${p.id || "novo-" + Date.now()}.webp`;
      novaFotoUrl = await VSSupabase.uploadFile("feira-fotos", path, blob);
      document.getElementById("prod-foto-preview").style.background = `url('${novaFotoUrl}') center/cover`;
      document.getElementById("prod-foto-preview").textContent = "";
      status.textContent = "✅ Foto pronta";
    } catch (err) {
      status.textContent = `❌ ${err.message?.slice(0, 80)}`;
    }
  });

  document.getElementById("btn-salvar-prod").addEventListener("click", async () => {
    const dados = {
      barraca_id: p.barraca_id,
      nome: document.getElementById("prod-nome").value.trim(),
      descricao: document.getElementById("prod-desc").value.trim(),
      preco_centavos: Math.round(parseFloat(document.getElementById("prod-preco").value || 0) * 100),
      sulcoins: parseInt(document.getElementById("prod-sulcoins").value || 0, 10),
      disponivel: document.getElementById("prod-disp").checked,
      foto_url: novaFotoUrl
    };
    if (!dados.nome) return vsToast({ tipo: "warn", titulo: tr("gerir_nome_obrigatorio") });
    if (dados.preco_centavos <= 0) return vsToast({ tipo: "warn", titulo: tr("gerir_preco_maior_zero") });
    try {
      if (ehNovo) {
        await VSSupabase.request("feira_produtos", { method: "POST", body: JSON.stringify(dados) });
      } else {
        await VSSupabase.request(`feira_produtos?id=eq.${p.id}`, { method: "PATCH", body: JSON.stringify(dados) });
      }
      modal.style.display = "none";
      const novos = await sb(`feira_produtos?barraca_id=eq.${p.barraca_id}&select=id,nome,descricao,foto_url,preco_centavos,sulcoins,disponivel,ordem&order=ordem.asc`).catch(() => []);
      _renderProdutos(novos, p.barraca_id);
      window.VSMagia?.celebrar({ tipo: "missao", mensagem: ehNovo ? "🛒 Produto adicionado!" : "✓ Produto atualizado" });
    } catch (e) {
      vsToast({ tipo: "error", titulo: "Falha", corpo: e.message?.slice(0, 200), dur: 9000 });
    }
  });
}

// Catálogo de planos extras — buscado do Supabase
let _planosCache = null;
async function carregarPlanos() {
  if (_planosCache) return _planosCache;
  _planosCache = await sb("servicos_planos?select=*&ativo=eq.true&order=ordem.asc").catch(() => []);
  return _planosCache;
}

// Lista os planos disponíveis pra uma barraca + status de cada
window.abrirPlanosBarraca = async function(barracaId, barracaNome) {
  const planos = await carregarPlanos();
  if (!planos.length) return alert("Nenhum plano disponível.");
  // Compras ativas dessa barraca
  const ativas = await sb(`v_minhas_compras_servicos?select=plano_codigo,termina_em,valida_agora&barraca_id=eq.${barracaId}`).catch(() => []);
  const ativasPorPlano = {};
  ativas.forEach(a => {
    if (a.valida_agora) {
      const ja = ativasPorPlano[a.plano_codigo];
      if (!ja || new Date(a.termina_em) > new Date(ja)) ativasPorPlano[a.plano_codigo] = a.termina_em;
    }
  });

  let modal = document.getElementById("modal-planos");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-planos";
    modal.className = "modal-bg";
    modal.innerHTML = `
      <div class="modal" style="max-width:560px;max-height:90vh;overflow-y:auto">
        <h3 id="planos-titulo">💎 Planos extras</h3>
        <p style="font-size:13px;color:var(--hint);margin:6px 0 12px">
          Pague em <strong>dinheiro</strong> ou misture com <strong>sulis até 50%</strong> do valor. Paridade: 100 sulis = R$ 1.
        </p>
        <div id="planos-lista"></div>
        <button class="btn-primary" style="width:100%;margin-top:14px;background:rgba(120,120,120,0.4)" onclick="document.getElementById('modal-planos').style.display='none'">Fechar</button>
      </div>`;
    document.body.appendChild(modal);
  }
  document.getElementById("planos-titulo").textContent = `💎 Planos extras — ${barracaNome || ""}`;
  const lista = document.getElementById("planos-lista");
  lista.innerHTML = planos.map(p => {
    const ativaAte = ativasPorPlano[p.codigo];
    const ativo = !!ativaAte;
    const dias = ativo ? Math.ceil((new Date(ativaAte) - new Date()) / 86400000) : 0;
    const reais = (p.preco_centavos / 100).toFixed(2);
    const maxSulis = Math.floor(p.preco_centavos * (p.max_sulis_pct || 50) / 100);
    return `
      <div class="card-info" style="margin:8px 0;padding:12px">
        <div style="display:flex;align-items:flex-start;gap:8px">
          <div style="font-size:24px">${p.emoji}</div>
          <div style="flex:1">
            <strong>${escapeHtml(p.nome)}</strong>
            <div style="font-size:12px;color:var(--hint);margin-top:2px">${escapeHtml(p.descricao || "")}</div>
            <div style="font-size:13px;margin-top:6px">
              <strong style="color:#ffd54f">R$ ${reais}</strong>
              <span style="color:var(--hint)">/ ${p.duracao_dias} dias</span>
              <span style="color:var(--hint);font-size:11px">· até ${maxSulis} sulis pode entrar (${p.max_sulis_pct || 50}%)</span>
            </div>
            ${ativo
              ? `<div style="color:#4caf50;font-size:12px;margin-top:6px">✓ Ativo · ${dias} dia${dias===1?"":"s"} restante${dias===1?"":"s"}</div>`
              : `<div style="color:var(--hint);font-size:12px;margin-top:6px">${tr("plano_nao_ativo")}</div>`}
            <button class="btn-primary" style="margin-top:10px;background:rgba(255,193,7,0.55);font-size:13px;padding:8px 14px"
                    onclick="abrirCheckoutMisto('${barracaId}','${p.codigo}','${escapeHtml(barracaNome).replace(/'/g,"&#39;")}')">
              ${ativo ? "🔄 Renovar" : "💎 Ativar"}
            </button>
          </div>
        </div>
      </div>`;
  }).join("");
  modal.style.display = "flex";
};

// Checkout misto: dinheiro + sulis (até 50% do valor)
window.abrirCheckoutMisto = async function(barracaId, planoCodigo, barracaNome) {
  const planos = await carregarPlanos();
  const p = planos.find(x => x.codigo === planoCodigo);
  if (!p) return alert("Plano não encontrado");
  const w = await VSWallet.myWallet();
  const saldo = w?.saldo_livre_sulis || 0;
  const maxSulis = Math.floor(p.preco_centavos * (p.max_sulis_pct || 50) / 100);
  const sulisDisp = Math.min(maxSulis, saldo);
  const reais = (p.preco_centavos / 100).toFixed(2);

  let modal = document.getElementById("modal-checkout");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-checkout";
    modal.className = "modal-bg";
    modal.innerHTML = `<div class="modal" style="max-width:520px"></div>`;
    document.body.appendChild(modal);
  }
  const inner = modal.querySelector(".modal");
  const renderEtapa1 = () => {
    inner.innerHTML = `
      <h3 style="margin:0 0 4px">${p.emoji || "🎯"} ${escapeHtml(p.nome)}</h3>
      <p style="font-size:13px;color:var(--hint);margin:0 0 12px">${escapeHtml(barracaNome || "")} · R$ ${reais}</p>
      <div class="card-info" style="margin:8px 0">
        <strong>💰 ${tr("ck_sua_carteira")}</strong>
        <div style="font-size:13px;margin-top:4px">${saldo} sulis livres · pode usar até <strong>${sulisDisp}</strong> neste plano (${p.max_sulis_pct || 50}% do preço)</div>
      </div>
      <label style="display:block;margin:14px 0 6px;font-size:13px;font-weight:600">SulCoins a abater (0 a ${sulisDisp})</label>
      <input id="ck-sulis" type="number" min="0" max="${sulisDisp}" value="0" step="1"
             style="width:100%;padding:10px;font-size:16px;background:rgba(255,255,255,0.05);color:var(--text);border:1px solid rgba(255,255,255,0.20);border-radius:8px">
      <div style="display:flex;gap:6px;margin-top:6px">
        <button class="btn-primary" style="flex:1;padding:6px;font-size:12px;background:rgba(255,255,255,0.10)" onclick="document.getElementById('ck-sulis').value=0;_atualizarResumoCk(${p.preco_centavos})">0%</button>
        <button class="btn-primary" style="flex:1;padding:6px;font-size:12px;background:rgba(255,255,255,0.10)" onclick="document.getElementById('ck-sulis').value=${Math.floor(sulisDisp/2)};_atualizarResumoCk(${p.preco_centavos})">${tr("ck_50_do_max")}</button>
        <button class="btn-primary" style="flex:1;padding:6px;font-size:12px;background:rgba(255,255,255,0.10)" onclick="document.getElementById('ck-sulis').value=${sulisDisp};_atualizarResumoCk(${p.preco_centavos})">${tr("ck_tudo")}</button>
      </div>
      <div id="ck-resumo" class="card-info" style="margin-top:14px;background:rgba(38,124,180,0.18)"></div>
      <div style="margin-top:14px">
        <div style="font-size:11px;color:var(--hint);margin-bottom:6px;text-align:center">${tr("ck_pagar_pix_via")}</div>
        <div style="display:flex;gap:6px">
          <button type="button" class="ck-psp-btn" data-psp="mercadopago" style="flex:1;padding:9px;border-radius:8px;border:2px solid var(--primary);background:rgba(38,124,180,0.25);color:#fff;font-size:13px;cursor:pointer;font-weight:700">💙 Mercado Pago</button>
          <button type="button" class="ck-psp-btn" data-psp="asaas" style="flex:1;padding:9px;border-radius:8px;border:2px solid transparent;background:rgba(255,255,255,0.05);color:#fff;font-size:13px;cursor:pointer">🟦 Asaas</button>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="btn-primary" style="flex:1;padding:11px;background:rgba(120,120,120,0.4)" onclick="document.getElementById('modal-checkout').style.display='none'">Cancelar</button>
        <button id="ck-pagar" class="btn-primary" style="flex:2;padding:11px">💳 Pagar →</button>
      </div>`;
    window._ckPsp = "mercadopago";
    inner.querySelectorAll(".ck-psp-btn").forEach(b => b.addEventListener("click", () => {
      window._ckPsp = b.dataset.psp;
      inner.querySelectorAll(".ck-psp-btn").forEach(x => {
        const ativo = x.dataset.psp === window._ckPsp;
        x.style.borderColor = ativo ? "var(--primary)" : "transparent";
        x.style.background = ativo ? "rgba(38,124,180,0.25)" : "rgba(255,255,255,0.05)";
        x.style.fontWeight = ativo ? "700" : "400";
      });
    }));
    document.getElementById("ck-sulis").addEventListener("input", () => _atualizarResumoCk(p.preco_centavos));
    document.getElementById("ck-pagar").addEventListener("click", processarPagamento);
    _atualizarResumoCk(p.preco_centavos);
  };
  window._atualizarResumoCk = function(precoCentavos) {
    const usar = Math.max(0, Math.min(sulisDisp, parseInt(document.getElementById("ck-sulis").value, 10) || 0));
    const resto = precoCentavos - usar;
    const r = document.getElementById("ck-resumo");
    if (!r) return;
    r.innerHTML = `
      <div style="font-size:13px;line-height:1.7">
        🪙 SulCoins: <strong>${usar}</strong><br>
        💵 Pix: <strong>R$ ${(resto/100).toFixed(2)}</strong> ${resto === 0 ? "<em style='color:#7c7'>(grátis em Pix)</em>" : ""}<br>
        Total: R$ ${(precoCentavos/100).toFixed(2)}
      </div>`;
  };
  async function processarPagamento() {
    const usarSulis = Math.max(0, Math.min(sulisDisp, parseInt(document.getElementById("ck-sulis").value, 10) || 0));
    const restoCentavos = p.preco_centavos - usarSulis;
    const btn = document.getElementById("ck-pagar");
    btn.disabled = true; btn.textContent = tr("ck_processando");
    try {
      // 100% em SC → debita direto
      if (restoCentavos === 0) {
        const r = await VSSupabase.rpc("pagar_servico_misto", {
          p_barraca_id: barracaId, p_plano_codigo: planoCodigo,
          p_centavos: 0, p_sulis: usarSulis
        });
        const data = Array.isArray(r) ? r[0] : r;
        if (data?.ok) {
          const ate = new Date(data.termina_em).toLocaleDateString("pt-BR");
          modal.style.display = "none";
          window.VSMagia?.celebrar({ tipo: "plano", mensagem: `✓ Plano ativo até ${ate}!` });
          _planosCache = null;
          abrirPlanosBarraca(barracaId, barracaNome);
        } else {
          vsToast({ tipo: "error", titulo: "Erro", corpo: data?.erro || "tenta de novo" });
          btn.disabled = false; btn.textContent = "💳 Pagar →";
        }
        return;
      }
      // Tem parte Pix → cria order + Edge Function Asaas
      const r1 = await VSSupabase.rpc("criar_pedido_pagamento", {
        p_ref_tipo: "plano_servico", p_ref_id: planoCodigo,
        p_valor_centavos: restoCentavos, p_metodo: "pix"
      });
      const d1 = Array.isArray(r1) ? r1[0] : r1;
      if (!d1?.ok) throw new Error(d1?.erro || "criar_order_falhou");
      const dadosPagador = await pedirDadosPagador();
      if (!dadosPagador) {
        btn.disabled = false; btn.textContent = "💳 Pagar →";
        return;
      }
      const psp = window._ckPsp || "mercadopago";
      const fnName = psp === "asaas" ? "criar-pix-asaas" : "criar-pix-mercadopago";
      const sess = VSSupabase.getSession?.();
      const tok = (sess?.session || sess)?.access_token;
      const resp = await fetch(`${VENTOSUL_CONFIG.SUPABASE_URL}/functions/v1/${fnName}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tok || VENTOSUL_CONFIG.SUPABASE_ANON_JWT}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ order_id: d1.order_id, ...dadosPagador })
      });
      const d2 = await resp.json();
      if (!d2?.ok) {
        console.error("[PSP] resposta:", d2);
        const det = d2?.detalhes ? JSON.stringify(d2.detalhes).slice(0, 500) : "";
        throw new Error(`${d2?.erro || psp+"_falhou"}${det ? " · " + det : ""}`);
      }
      renderEtapaPix(d1.order_id, d2, usarSulis, restoCentavos);
    } catch (e) {
      vsToast({ tipo: "error", titulo: "Erro no pagamento", corpo: (e.message || String(e)).slice(0, 280), dur: 12000 });
      btn.disabled = false; btn.textContent = "💳 Pagar →";
    }
  }
  function renderEtapaPix(orderId, dados, usarSulis, restoCentavos) {
    inner.innerHTML = `
      <h3 style="margin:0 0 4px">📲 ${tr("pix_pague_com")}</h3>
      <p style="font-size:13px;color:var(--hint);margin:0 0 12px">
        ${p.emoji} ${escapeHtml(p.nome)} · R$ ${(restoCentavos/100).toFixed(2)} ${usarSulis ? `+ ${usarSulis} sulis` : ""}
      </p>
      <div style="text-align:center">
        ${dados.qrcode_pix ? `<img src="${dados.qrcode_pix}" alt="QR Pix" style="width:240px;height:240px;background:#fff;border-radius:14px;padding:8px;display:inline-block">` : `<div style="padding:24px;color:var(--hint);font-size:13px">⏳ QR sendo gerado…</div>`}
      </div>
      ${dados.copy_paste ? `
        <div style="margin-top:12px"><strong style="font-size:13px">📋 Pix copia-e-cola:</strong></div>
        <textarea readonly onclick="this.select()" style="width:100%;height:78px;font-size:11px;padding:8px;background:rgba(255,255,255,0.05);color:var(--text);border:1px solid rgba(255,255,255,0.20);border-radius:6px;margin-top:6px">${escapeHtml(dados.copy_paste)}</textarea>
        <button class="btn-primary" style="width:100%;margin-top:6px;padding:8px;font-size:12px;background:rgba(255,255,255,0.12)" onclick="navigator.clipboard.writeText('${dados.copy_paste.replace(/'/g,"\\'")}');vsToast({tipo:'success',titulo:'Copiado',corpo:'Cole no app do seu banco'})">📋 Copiar Pix</button>
      ` : ""}
      ${dados.invoice_url ? `<a href="${dados.invoice_url}" target="_blank" rel="noopener" style="display:block;text-align:center;margin-top:10px;padding:8px;color:var(--primary);font-size:12px">🔗 Abrir página de pagamento</a>` : ""}
      <p style="font-size:12px;color:var(--hint);margin-top:12px;line-height:1.5">
        ${tr("pix_apos_pagamento_plano")}
        ${usarSulis ? `Os ${usarSulis} sulis já foram reservados.` : ""}
      </p>
      <button class="btn-primary" style="width:100%;margin-top:14px" onclick="document.getElementById('modal-checkout').style.display='none';abrirPlanosBarraca('${barracaId}','${escapeHtml(barracaNome).replace(/'/g,"\\'")}')">Fechar</button>`;
    iniciarPollingOrder(orderId, () => {
      modal.style.display = "none";
      window.VSMagia?.celebrar({ tipo: "plano", mensagem: "💎 Pagamento confirmado!" });
      _planosCache = null;
      abrirPlanosBarraca(barracaId, barracaNome);
    });
  }
  renderEtapa1();
  modal.style.display = "flex";
};

async function pedirDadosPagador() {
  const cached = JSON.parse(localStorage.getItem("vs_pagador") || "null");
  if (cached?.cpf && cached?.email) return cached;
  const cpf = prompt(tr("pagador_cpf"), cached?.cpf || "");
  if (!cpf) return null;
  const email = prompt(tr("pagador_email"), cached?.email || VSSupabase.userEmail?.() || "");
  if (!email) return null;
  const nome = prompt(tr("pagador_nome"), cached?.nome || "Cliente Vento Sul") || "Cliente Vento Sul";
  const dados = { cpf: cpf.replace(/\D/g, ""), email: email.trim(), nome: nome.trim() };
  localStorage.setItem("vs_pagador", JSON.stringify(dados));
  return dados;
}

function iniciarPollingOrder(orderId, onPago, maxTentativas = 60) {
  let n = 0;
  const tick = async () => {
    if (n++ >= maxTentativas) return;
    try {
      const arr = await sb(`pagamentos_orders?id=eq.${orderId}&select=status`);
      if (arr?.[0]?.status === "pago") return onPago();
    } catch {}
    setTimeout(tick, 5000);
  };
  setTimeout(tick, 5000);
}

// ─────────────────────────────────────────────────────────────
// 💎 Recarregar SulCoins via Pix — flow único e testado vive em carteira.html
// (removida a implementação duplicada com opção Asaas quebrada/abandonada e
// cálculo de paridade errado — sempre 1 fonte de verdade pro Pix de sulis)
// ─────────────────────────────────────────────────────────────
window.abrirRecargaSulcoin = function() {
  location.href = "/carteira.html#converter";
};

// Mantém compat com botão antigo de geoloc
window.pagarGeoloc = async function(barracaId, meses) {
  return abrirPlanosBarraca(barracaId, "");
};

document.getElementById("btn-merch-login")?.addEventListener("click", async () => {
  const email = document.getElementById("merch-email").value.trim();
  const senha = document.getElementById("merch-senha").value;
  if (!email.includes("@") || senha.length < 6) return alert("Email/senha inválidos");
  try {
    const r = await VSSupabase.signIn?.(email, senha);
    if (!r?.session) throw new Error("Login falhou");
    abrirComercio();
  } catch (e) { alert("Erro: " + e.message); }
});
document.getElementById("btn-merch-cadastrar")?.addEventListener("click", async () => {
  const email = document.getElementById("merch-email").value.trim();
  const senha = document.getElementById("merch-senha").value;
  if (!email.includes("@") || senha.length < 6) return alert("Email/senha inválidos");
  try {
    const r = await VSSupabase.signUp?.(email, senha);
    alert(tr("merch_conta_criada"));
  } catch (e) { alert("Erro: " + e.message); }
});
document.getElementById("btn-merch-sair")?.addEventListener("click", async () => {
  await VSSupabase.signOut?.();
  abrirComercio();
});

// ─────────────────────────────────────────────────────────────
// Tela PERTO — geolocalização + lugares próximos
// ─────────────────────────────────────────────────────────────
async function abrirPerto() {
  showScreen("perto");
  const status = document.getElementById("perto-status");
  const lista = document.getElementById("lista-perto");
  status.textContent = tr("perto_toque_loc");
  lista.innerHTML = "";
}
async function _carregarPerto({ force = false } = {}) {
  const status = document.getElementById("perto-status");
  const lista = document.getElementById("lista-perto");
  status.textContent = force ? `📡 ${tr("perto_atualizando_loc")}` : `📡 ${tr("perto_procurando_loc")}`;
  try {
    const c = await VSEnergy.coords({ force });
    const { latitude, longitude } = c;
    const idade = VSEnergy.lastCoords()?.idadeMs || 0;
    const fresca = idade < 30000 ? "agora" : `há ${Math.round(idade/60000)}min`;
    status.innerHTML = `📍 ${latitude.toFixed(4)}, ${longitude.toFixed(4)} <small style="color:var(--hint)">(${fresca})</small>`;
    lista.innerHTML = `<div class='loading'>${tr("perto_buscando_lugares")}</div>`;
    const lugares = await sb(`v_praias_cidade?select=id,nome,cidade,estado,lat,lng&limit=200`).catch(() => []);
    const comDist = lugares.map(p => ({
      ...p,
      dist: distKm(latitude, longitude, p.lat, p.lng)
    })).filter(x => x.dist != null).sort((a,b) => a.dist - b.dist).slice(0, 20);
    lista.innerHTML = comDist.length === 0
      ? `<p class='subtitle'>${tr("perto_nenhum_lugar")}</p>`
      : comDist.map(p => `
        <div class="card-info" style="margin:8px 0;cursor:pointer" onclick='abrirDetalhePraia(${JSON.stringify(p)})'>
          <strong>${escapeHtml(p.nome)}</strong>
          <div style="font-size:12px;color:var(--hint)">${escapeHtml(p.cidade||'')} · ${p.dist.toFixed(1)} km</div>
        </div>`).join("");
  } catch (e) {
    status.textContent = "❌ " + (e.message || tr("perto_gps_off"));
  }
}
document.getElementById("btn-gps-perto")?.addEventListener("click", () => _carregarPerto({ force: false }));
document.getElementById("btn-perto-refresh")?.addEventListener("click", () => _carregarPerto({ force: true }));

function distKm(lat1, lon1, lat2, lon2) {
  if (lat1==null||lat2==null||lon1==null||lon2==null) return null;
  const R = 6371;
  const dLat = (lat2-lat1) * Math.PI/180;
  const dLon = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ─────────────────────────────────────────────────────────────
// Tela PRAIAS HUB — praias em destaque + categorias de comércio
// ─────────────────────────────────────────────────────────────
let _minhaPos = null;

// ─────────────────────────────────────────────────────────────
// 🧭 "Perto de mim" — mapa + raio + algoritmo de relevância
// ─────────────────────────────────────────────────────────────
let _pertoState = {
  raio: 5,
  tipo: "todos",
  itens: [],            // [{tipo, nome, cidade, lat, lng, dist, score, ...}]
  mapa: null,
  marcadoresLayer: null,
  raioLayer: null,
  meuMarker: null,
};

const _PERTO_EMOJI = {
  praia: "🏖️", comercio: "🏪", atracao: "⭐",
  trilha: "🌲", historico: "🏛️", produtora: "🍇"
};

async function _pertoCarregarPreferencias() {
  // Tenta extrair categorias favoritas do user (votos + favoritos local)
  const prefs = new Set();
  try {
    const favs = JSON.parse(localStorage.getItem("vs_favoritos") || "[]");
    favs.forEach(f => { if (f?.cat) prefs.add(f.cat); if (f?.tipo) prefs.add(f.tipo); });
  } catch {}
  // Categorias dos lugares mais votados na cidade do user (heurística leve)
  if (state?.cidade && state?.estado) {
    try {
      const vot = await sb(`v_mais_votados_cidade?select=alvo_categoria&estado=eq.${enc(state.estado)}&cidade=eq.${enc(state.cidade)}&limit=10`);
      vot?.forEach(v => v.alvo_categoria && prefs.add(v.alvo_categoria.toLowerCase()));
    } catch {}
  }
  return prefs;
}

async function _pertoBuscarItens(meu, raioKm) {
  // Bbox aproximado pra reduzir payload (~0.009° = 1km)
  const dLat = raioKm * 0.012;
  const dLng = raioKm * 0.012;
  const minLat = meu.lat - dLat, maxLat = meu.lat + dLat;
  const minLng = meu.lng - dLng, maxLng = meu.lng + dLng;
  const bbox = `&lat=gte.${minLat}&lat=lte.${maxLat}&lng=gte.${minLng}&lng=lte.${maxLng}`;

  // Comércio só entra se: (a) é simulação OU (b) dono pagou geolocalização (geoloc_pago_ate > agora)
  const agoraISO = new Date().toISOString();
  const [praias, barracas, locs] = await Promise.all([
    sb(`v_praias_cidade?select=id,nome,cidade,estado,lat,lng,foto_url,descricao${bbox}&limit=200`).catch(() => []),
    sb(`feira_barracas?select=id,dono_uuid,nome,categoria,descricao,cidade,estado,lat,lng,telhado_url,geoloc_pago_ate,eh_simulacao,plano${bbox}&ativa=eq.true&or=(geoloc_pago_ate.gt.${agoraISO},eh_simulacao.eq.true)&limit=200`).catch(() => []),
    sb(`localidades?select=tipo,estado,cidade,sublocal,descricao,lat,lng${bbox}&limit=200`).catch(() => [])
  ]);

  const itens = [];
  praias?.forEach(p => itens.push({
    tipo: "praia", nome: p.nome, cidade: p.cidade, estado: p.estado,
    lat: p.lat, lng: p.lng, foto: p.foto_url, descricao: p.descricao, raw: p
  }));
  barracas?.forEach(b => itens.push({
    tipo: "comercio", nome: b.nome, cidade: b.cidade, estado: b.estado,
    lat: b.lat, lng: b.lng, foto: b.telhado_url, categoria: b.categoria,
    descricao: b.descricao,
    geoloc_paga: !!b.geoloc_pago_ate && new Date(b.geoloc_pago_ate) > new Date(),
    simulacao: !!b.eh_simulacao,
    plano: b.plano,
    dono_uuid: b.dono_uuid,
    raw: b
  }));

  // Enriquece com tipo_negocio (pousada → botão Reservar)
  const donos = [...new Set(barracas?.map(b => b.dono_uuid).filter(Boolean))];
  if (donos.length) {
    try {
      const negs = await sb(`comerciante_negocio?dono_uuid=in.(${donos.join(",")})&select=dono_uuid,tipo_negocio,plano`);
      const byDono = Object.fromEntries((negs || []).map(n => [n.dono_uuid, n]));
      itens.forEach(it => {
        if (it.tipo === "comercio" && it.dono_uuid && byDono[it.dono_uuid]) {
          it.tipo_negocio = byDono[it.dono_uuid].tipo_negocio;
          if (!it.plano || it.plano === "basico") it.plano = byDono[it.dono_uuid].plano || it.plano;
        }
      });
    } catch {}
  }
  locs?.forEach(l => {
    let tipoNorm = "atracao";
    const t = (l.tipo || "").toLowerCase();
    if (t.includes("trilha") || t.includes("cachoeira") || t.includes("cânion") ||
        t.includes("canion") || t.includes("mirante") || t.includes("salto") ||
        t.includes("parque") || t.includes("morro")) tipoNorm = "trilha";
    else if (t.includes("histórico") || t.includes("historico")) tipoNorm = "historico";
    else if (t.includes("produtora")) tipoNorm = "produtora";
    else if (t === "cidade" || t === "bairro") return;  // pula cidades-cabeça/bairros
    itens.push({
      tipo: tipoNorm, nome: l.sublocal || `${l.cidade} centro`,
      cidade: l.cidade, estado: l.estado,
      lat: l.lat, lng: l.lng, descricao: l.descricao,
      categoria: l.tipo, raw: l
    });
  });
  return itens;
}

function _pertoScore(item, prefs) {
  let s = 100 - Math.min(60, item.dist * 4);
  const catLow = (item.categoria || item.tipo || "").toLowerCase();
  if (prefs.has(catLow) || [...prefs].some(p => catLow.includes(p))) s += 30;
  if (item.foto) s += 8;
  if (item.tipo === "praia" || item.tipo === "atracao") s += 6;
  // Boost pra comércio com geolocalização PAGA (real) vs simulação
  if (item.tipo === "comercio") {
    const p = (item.plano || "").toLowerCase();
    if (p === "premium" || p === "ouro") s += 35;
    else if (p === "vip" || p === "plus" || p === "prata") s += 22;
    if (item.geoloc_paga) s += 15;       // pagou pra aparecer → premium
    else if (item.simulacao) s -= 5;     // simulação fica abaixo de comércio real
    if (item.tipo_negocio === "pousada") s += 5; // leve nudge: pousadas tem reserva
  }
  return s;
}

async function abrirPraiasHub({ force = false } = {}) {
  showScreen("praiashub");
  const status = document.getElementById("praiashub-status");
  const lista = document.getElementById("perto-lista");
  const resumo = document.getElementById("perto-resumo");
  status.innerHTML = `📡 ${force ? "Atualizando" : "Localizando"} você…`;
  lista.innerHTML = "";

  try {
    const c = await VSEnergy.coords({ force });
    _minhaPos = { lat: c.latitude, lng: c.longitude };
    const idade = VSEnergy.lastCoords()?.idadeMs || 0;
    const fresca = idade < 30000 ? "agora" : `há ${Math.round(idade/60000)}min`;
    status.innerHTML = `📍 ${_minhaPos.lat.toFixed(3)}, ${_minhaPos.lng.toFixed(3)} <small style="color:var(--hint)">· ${fresca}</small> <button id="praiashub-refresh" title="Atualizar localização" style="background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.22);color:#fff;border-radius:50%;width:28px;height:28px;font-size:13px;cursor:pointer;margin-left:6px;vertical-align:middle">↻</button>`;
    document.getElementById("praiashub-refresh")?.addEventListener("click", () => abrirPraiasHub({ force: true }));
    await _pertoRender();
  } catch (e) {
    status.textContent = `❌ ${tr("praiashub_gps_off")}: ` + (e.message || e);
  }
}

async function _pertoRender() {
  if (!_minhaPos) return;
  const lista = document.getElementById("perto-lista");
  const resumo = document.getElementById("perto-resumo");
  const raioKm = _pertoState.raio;
  const tipoFiltro = _pertoState.tipo;

  lista.innerHTML = `<div class='loading' style='padding:20px;text-align:center'>${tr("perto_buscando")}</div>`;
  const prefs = await _pertoCarregarPreferencias();
  const brutos = await _pertoBuscarItens(_minhaPos, raioKm);
  const itens = brutos
    .filter(x => x.lat != null && x.lng != null)
    .map(x => ({ ...x, dist: distKm(_minhaPos.lat, _minhaPos.lng, x.lat, x.lng) }))
    .filter(x => x.dist != null && x.dist <= raioKm)
    .map(x => ({ ...x, score: _pertoScore(x, prefs) }))
    .sort((a, b) => b.score - a.score);

  _pertoState.itens = itens;

  // Mapa Leaflet
  _pertoDesenharMapa(itens);

  // Lista filtrada por tipo
  const visiveis = tipoFiltro === "todos" ? itens : itens.filter(i => i.tipo === tipoFiltro);
  const top = visiveis.slice(0, 50);
  resumo.textContent = `${visiveis.length} lugar${visiveis.length === 1 ? "" : "es"} num raio de ${raioKm} km · ordenados pelo seu interesse`;
  if (!top.length) {
    lista.innerHTML = `<p class="subtitle">Nada por aqui em ${raioKm} km. Tenta aumentar o raio.</p>`;
    return;
  }
  lista.innerHTML = top.map((it, i) => {
    const relevante = i < 3 && it.score > 100;
    const distTxt = it.dist < 1 ? `${Math.round(it.dist * 1000)}m` : `${it.dist.toFixed(1)} km`;
    const emoji = _PERTO_EMOJI[it.tipo] || "📍";
    const planoLow = (it.plano || "").toLowerCase();
    const vipBadge = (planoLow === "premium" || planoLow === "ouro")
      ? `<span style="font-size:10px;color:#ffd54f;margin-left:4px;font-weight:700">⭐ VIP Premium</span>`
      : (planoLow === "vip" || planoLow === "plus" || planoLow === "prata")
        ? `<span style="font-size:10px;color:#c0c0c0;margin-left:4px;font-weight:700">⭐ VIP</span>`
        : "";
    const badge = it.geoloc_paga
      ? `<span style="font-size:10px;color:#ffd54f;margin-left:4px">📍 Geoloc paga</span>`
      : (it.simulacao ? `<span style="font-size:10px;color:var(--hint);margin-left:4px">🎯 Simulação</span>` : "");
    const isPousada = it.tipo_negocio === "pousada";
    const reservarBtn = isPousada
      ? `<button class="pc-reservar" data-dono="${it.dono_uuid}" title="Reservar" style="background:#10b981;color:#fff;border:0;border-radius:50%;width:30px;height:30px;font-size:14px;cursor:pointer;margin-left:4px">🛏️</button>`
      : "";
    return `
      <div class="perto-card ${relevante ? "perto-relevante" : ""}" data-idx="${i}">
        <div class="pc-emoji">${emoji}</div>
        <div class="pc-info">
          <strong>${escapeHtml(it.nome)}${vipBadge}${badge}</strong>
          <small>${escapeHtml(it.cidade || "")}${it.categoria ? ` · ${escapeHtml(it.categoria)}` : ""}</small>
        </div>
        <div class="pc-dist">${distTxt}</div>
        ${reservarBtn}
        <button class="pc-rota" data-idx="${i}">🧭</button>
      </div>`;
  }).join("");
  lista.querySelectorAll(".pc-reservar").forEach(b => b.addEventListener("click", (ev) => {
    ev.stopPropagation();
    location.href = `/reservar.html?dono=${b.dataset.dono}`;
  }));
  lista.querySelectorAll(".pc-rota").forEach(b => b.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const i = parseInt(b.dataset.idx, 10);
    const it = top[i];
    comoChegar({ lat: it.lat, lng: it.lng, nome: it.nome, categoria: it.categoria || it.tipo });
  }));
}

function _pertoDesenharMapa(itens) {
  if (typeof L === "undefined") return;
  const div = document.getElementById("perto-mapa");
  if (!div) return;
  if (!_pertoState.mapa) {
    _pertoState.mapa = L.map("perto-mapa", { zoomControl: true, attributionControl: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(_pertoState.mapa);
    _pertoState.marcadoresLayer = L.layerGroup().addTo(_pertoState.mapa);
  }
  _pertoState.mapa.setView([_minhaPos.lat, _minhaPos.lng], _pertoState.raio <= 5 ? 13 : (_pertoState.raio <= 10 ? 12 : 10));

  // Limpa
  _pertoState.marcadoresLayer.clearLayers();
  if (_pertoState.raioLayer) { _pertoState.raioLayer.remove(); _pertoState.raioLayer = null; }
  if (_pertoState.meuMarker) { _pertoState.meuMarker.remove(); _pertoState.meuMarker = null; }

  // Eu (azul)
  _pertoState.meuMarker = L.circleMarker([_minhaPos.lat, _minhaPos.lng], {
    radius: 10, color: "#03a9f4", fillColor: "#03a9f4", fillOpacity: 0.9, weight: 2
  }).addTo(_pertoState.mapa).bindPopup("Você");

  // Círculo do raio
  _pertoState.raioLayer = L.circle([_minhaPos.lat, _minhaPos.lng], {
    radius: _pertoState.raio * 1000,
    color: "#4caf50", weight: 1.5, fillOpacity: 0.06
  }).addTo(_pertoState.mapa);

  const cores = { praia: "#03a9f4", comercio: "#4caf50", atracao: "#ffc107", trilha: "#ff7043", historico: "#9575cd", produtora: "#e91e63" };
  itens.forEach(it => {
    if (_pertoState.tipo !== "todos" && it.tipo !== _pertoState.tipo) return;
    const cor = cores[it.tipo] || "#bbb";
    // Simulação: pontilhado, opacidade menor; geoloc paga: cheio com aro dourado
    const opts = {
      radius: it.geoloc_paga ? 8 : 7,
      color: it.geoloc_paga ? "#ffd54f" : "#fff",
      weight: it.geoloc_paga ? 2.5 : 1.5,
      fillColor: cor,
      fillOpacity: it.simulacao ? 0.55 : 0.9,
      dashArray: it.simulacao ? "3,3" : null,
    };
    const tagPopup = it.geoloc_paga ? "<br><small>📍 Geolocalização paga</small>"
                  : (it.simulacao   ? "<br><small>🎯 Simulação</small>" : "");
    const m = L.circleMarker([it.lat, it.lng], opts)
      .bindPopup(`<strong>${it.nome}</strong>${tagPopup}<br><small>${it.cidade || ""} · ${it.dist.toFixed(1)}km</small>`);
    m.on("click", () => comoChegar({ lat: it.lat, lng: it.lng, nome: it.nome, categoria: it.categoria || it.tipo }));
    m.addTo(_pertoState.marcadoresLayer);
  });
}

// Wire-up dos controles raio + tabs
document.querySelectorAll(".raio-btn").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll(".raio-btn").forEach(x => x.classList.toggle("ativo", x === b));
  _pertoState.raio = parseInt(b.dataset.raio, 10);
  _pertoRender();
}));
document.querySelectorAll(".cat-tab").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll(".cat-tab").forEach(x => x.classList.toggle("ativo", x === b));
  _pertoState.tipo = b.dataset.tipo;
  _pertoRender();
}));

async function carregarPraiasCidade(cidade) {
  const grid = document.getElementById("praiashub-praias");
  try {
    const praias = await sb(`praias?cidade=eq.${encodeURIComponent(cidade)}&select=id,nome,cidade,estado,foto_url,descricao&limit=10`);
    grid.innerHTML = praias.map(p => `
      <div class="praia-card-grande" style="background-image:url('${p.foto_url||''}')" onclick='abrirDetalhePraia(${JSON.stringify(p).replace(/'/g,"&#39;")})'>
        <strong>${escapeHtml(p.nome)}</strong>
        <small>${escapeHtml(p.cidade||"")}</small>
      </div>`).join("");
  } catch {}
}

document.querySelectorAll(".cat-btn").forEach(b => b.addEventListener("click", async () => {
  document.querySelectorAll(".cat-btn").forEach(x => x.classList.toggle("ativa", x === b));
  const cat = b.dataset.cat;
  const div = document.getElementById("praiashub-cat-resultado");
  div.innerHTML = "<div class='loading'>Buscando…</div>";
  const palavras = {
    comida:   ["restaurante","pizza","comida","bar","churrasc","grill"],
    estadia:  ["pousada","hotel","hostel","camping","resort"],
    mercado:  ["mercado","supermercado","empório","emporio","atacad"],
    lanche:   ["lanche","lanchonete","cafe","café","sorvete","açai","acai","padaria"],
    farmacia: ["farmácia","farmacia","drogaria"]
  }[cat] || [];
  try {
    const lista = await sb("feira_barracas?select=id,dono_uuid,nome,categoria,descricao,cidade,estado,lat,lng,plano&limit=200").catch(() => []);
    let filtrados = lista.filter(b => {
      const blob = `${b.nome||""} ${b.categoria||""} ${b.descricao||""}`.toLowerCase();
      return palavras.some(p => blob.includes(p));
    });

    // Enriquece com tipo_negocio (pra mostrar Reservar em pousadas)
    const donos = [...new Set(filtrados.map(b => b.dono_uuid).filter(Boolean))];
    let byDono = {};
    if (donos.length) {
      try {
        const negs = await sb(`comerciante_negocio?dono_uuid=in.(${donos.join(",")})&select=dono_uuid,tipo_negocio,plano`);
        byDono = Object.fromEntries((negs || []).map(n => [n.dono_uuid, n]));
      } catch {}
    }
    // Score: VIPs primeiro
    const planoScore = p => {
      const x = (p || "").toLowerCase();
      if (x === "premium" || x === "ouro") return 3;
      if (x === "vip" || x === "plus" || x === "prata") return 2;
      return 0;
    };
    filtrados = filtrados.map(b => {
      const neg = byDono[b.dono_uuid] || {};
      const planoFinal = b.plano && b.plano !== "basico" ? b.plano : (neg.plano || b.plano);
      return { ...b, tipo_negocio: neg.tipo_negocio, planoFinal, _s: planoScore(planoFinal) };
    }).sort((a,b) => b._s - a._s).slice(0, 20);

    div.innerHTML = filtrados.length === 0
      ? `<p class='subtitle'>Nenhum lugar de "${cat}" cadastrado ainda na sua região.</p>`
      : filtrados.map(b => {
          const j = JSON.stringify({lat:b.lat||null,lng:b.lng||null,nome:b.nome,cat}).replace(/"/g,'&quot;');
          const planoLow = (b.planoFinal || "").toLowerCase();
          const vipBadge = (planoLow === "premium" || planoLow === "ouro")
            ? `<span style="font-size:10px;color:#ffd54f;margin-left:6px;font-weight:700">⭐ VIP Premium</span>`
            : (planoLow === "vip" || planoLow === "plus" || planoLow === "prata")
              ? `<span style="font-size:10px;color:#c0c0c0;margin-left:6px;font-weight:700">⭐ VIP</span>`
              : "";
          const reservarBtn = b.tipo_negocio === "pousada" && b.dono_uuid
            ? `<button onclick="event.stopPropagation();location.href='/reservar.html?dono=${b.dono_uuid}'" style="background:#10b981;color:#fff;border:0;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;margin-top:6px">🛏️ Reservar</button>`
            : "";
          return `
        <div class="card-info" style="margin:6px 0;cursor:pointer" onclick='abrirCardLugar(${j})'>
          <strong>${escapeHtml(b.nome)}${vipBadge}</strong>
          <div style="font-size:12px;color:var(--hint)">${escapeHtml(b.categoria||"—")}</div>
          ${b.descricao ? `<div style="font-size:12px;margin-top:4px">${escapeHtml(b.descricao)}</div>` : ""}
          <div style="font-size:11px;color:#4caf50;margin-top:6px">🧭 ${tr("perto_toca_mapa")}</div>
          ${reservarBtn}
        </div>`; }).join("");
  } catch (e) {
    div.innerHTML = `<p class='subtitle'>Erro: ${e.message}</p>`;
  }
}));

window.abrirCardLugar = function(item) {
  if (item.lat && item.lng) {
    abrirMapa(item.lat, item.lng, item.nome, item.cat);
  } else {
    // Sem coordenadas — usa centro da cidade selecionada como fallback
    const fallback = {
      "Florianópolis": [-27.5954, -48.5480],
      "Curitiba": [-25.4284, -49.2733],
      "Porto Alegre": [-30.0346, -51.2177],
      "Balneário Camboriú": [-26.9906, -48.6347],
      "Foz do Iguaçu": [-25.5163, -54.5854]
    };
    const c = fallback[state.cidade] || fallback["Florianópolis"];
    alert(tr("lugar_sem_coord_precisa"));
    abrirMapa(c[0], c[1], item.nome, item.cat);
  }
};

// ─────────────────────────────────────────────────────────────
// ⭐ FAVORITOS — cidades + praias + lugares (persistido em localStorage)
// ─────────────────────────────────────────────────────────────
const FAV_KEY = "vs.favoritos";
function getFavs() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); }
  catch { return []; }
}
function saveFavs(arr) {
  localStorage.setItem(FAV_KEY, JSON.stringify(arr.slice(0, 50)));
  vsFavsSincronizar();          // manda pra conta, se estiver logado
}

/* ─────────────────────────────────────────────────────────────
 * 12/08/2026 — FAVORITOS NA CONTA, não no aparelho.
 * O DJ viu favorito diferente no celular e no PC: eles viviam SÓ no
 * localStorage, então cada aparelho tinha a sua lista e nunca se falavam.
 * A tela de conta já prometia "favoritos te seguem em qualquer celular".
 *
 * Como funciona agora:
 *   - o localStorage continua sendo a resposta imediata (rápido e funciona sem
 *     internet). Nada foi tirado dele.
 *   - quem está logado ganha a tabela vs_favoritos como fonte de verdade.
 *   - ao entrar, JUNTA as duas listas (união, nunca troca uma pela outra), pra
 *     que o favorito feito no celular apareça no PC — e o contrário também.
 *     Ninguém perde favorito nessa conta.
 *   - RLS no banco: cada pessoa só lê e escreve o que é dela.
 * ───────────────────────────────────────────────────────────── */
function _vsSessao() {
  try { return (window.VSSupabase && VSSupabase.getSession && VSSupabase.getSession()) || null; }
  catch (e) { return null; }
}
function _vsAuthHeaders() {
  const sess = _vsSessao();
  // ⚠️ o getSession() daqui devolve { session: {...}, user: {...} } — o
  // access_token mora DENTRO de .session, não na raiz. Procurar na raiz dava
  // undefined e esta função voltava null, então nada era enviado pro servidor.
  const tok = sess && ((sess.session && sess.session.access_token) || sess.access_token);
  if (!tok) return null;
  const anon = (window.VENTOSUL_CONFIG && (window.VENTOSUL_CONFIG.SUPABASE_ANON_JWT || SUPABASE_ANON)) || SUPABASE_ANON;
  return { apikey: anon, Authorization: "Bearer " + tok, "Content-Type": "application/json" };
}
function _vsUserId() {
  const s = _vsSessao();
  // idem: o user pode vir na raiz OU dentro de .session
  return (s && ((s.user && s.user.id) || (s.session && s.session.user && s.session.user.id))) || null;
}
/* manda a lista local inteira pra conta (idempotente: unique(user,tipo,nome)) */
let _vsFavTimer = null;
function vsFavsSincronizar() {
  const h = _vsAuthHeaders(), uid = _vsUserId();
  if (!h || !uid) return;                      // deslogado: fica só local, como antes
  clearTimeout(_vsFavTimer);
  _vsFavTimer = setTimeout(async () => {
    try {
      const locais = getFavs();
      // apaga o que a pessoa tirou aqui e regrava o conjunto atual
      await fetch(`${SUPABASE_URL}/rest/v1/vs_favoritos?user_id=eq.${uid}`, { method: "DELETE", headers: h });
      if (!locais.length) return;
      const linhas = locais.map(f => ({
        user_id: uid, tipo: f.tipo || "lugar", nome: f.nome,
        cidade: f.cidade || null, estado: f.estado || null,
        slug: f.slug || (f._raw && f._raw.slug) || null, foto: f.foto || null
      }));
      await fetch(`${SUPABASE_URL}/rest/v1/vs_favoritos`, {
        method: "POST",
        headers: { ...h, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify(linhas)
      });
    } catch (e) {}
  }, 800);
}
/* ao entrar: junta o que está na conta com o que está neste aparelho */
async function vsFavsPuxarDaConta() {
  const h = _vsAuthHeaders(), uid = _vsUserId();
  if (!h || !uid) return;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/vs_favoritos?user_id=eq.${uid}&select=tipo,nome,cidade,estado,slug,foto,criado_em&order=criado_em.desc`,
      { headers: h });
    if (!r.ok) return;
    const doServidor = await r.json();
    if (!Array.isArray(doServidor)) return;
    const locais = getFavs();
    const juntos = locais.slice();
    doServidor.forEach(s => {
      const item = { tipo: s.tipo, nome: s.nome, cidade: s.cidade, estado: s.estado,
                     slug: s.slug, foto: s.foto, _fav_em: s.criado_em };
      if (!juntos.some(f => favKey(f) === favKey(item))) juntos.push(item);
    });
    localStorage.setItem(FAV_KEY, JSON.stringify(juntos.slice(0, 50)));
    if (typeof renderFavoritos === "function") renderFavoritos();
    // o aparelho pode ter favorito que a conta ainda não tem: devolve a união
    if (juntos.length !== doServidor.length) vsFavsSincronizar();
  } catch (e) {}
}
window.vsFavsPuxarDaConta = vsFavsPuxarDaConta;
function favKey(item) {
  return `${item.tipo}:${item.id || (item.cidade + "|" + item.estado + "|" + item.nome)}`;
}
function isFav(item) {
  const k = favKey(item);
  return getFavs().some(f => favKey(f) === k);
}
function toggleFav(item) {
  const k = favKey(item);
  const lista = getFavs();
  const idx = lista.findIndex(f => favKey(f) === k);
  if (idx >= 0) lista.splice(idx, 1);
  else lista.unshift({ ...item, _fav_em: new Date().toISOString() });
  saveFavs(lista);
  renderFavoritos();
  atualizarEstrelaCidade();
  return idx < 0; // true se foi adicionado
}
function renderFavoritos() {
  const bloco = document.getElementById("favoritos-bloco");
  const lista = document.getElementById("favoritos-lista");
  if (!bloco || !lista) return;
  const favs = getFavs();
  if (favs.length === 0) {
    bloco.style.display = "none";
    return;
  }
  bloco.style.display = "block";
  lista.innerHTML = favs.map((f, i) => {
    const ico = f.tipo === "cidade" ? "🏙️" : f.tipo === "praia" ? "🏖️" : "📍";
    const sub = f.tipo === "cidade" ? (f.estado || "") : (f.cidade || "");
    return `
      <div class="fav-item" onclick="abrirFavorito(${i})">
        <div class="fav-thumb" style="background-image:url('${f.foto || ''}')"></div>
        <div class="fav-text">
          <strong>${ico} ${escapeHtml(f.nome)}</strong>
          <small>${escapeHtml(sub)}</small>
        </div>
        <button class="fav-rm" title="Remover" onclick="event.stopPropagation();removerFavorito(${i})">✕</button>
      </div>`;
  }).join("");
}
/* 12/08/2026 — FAVORITO AGORA ABRE A PÁGINA DO LUGAR.
 * Antes só a Barra da Lagoa tinha destino (PAGINAS_DEDICADAS só conhece ela);
 * qualquer outro favorito — Lagoa da Conceição, Joaquina — caía na tela genérica
 * e parecia "não linkado". A página existe (/localidade.html?slug=...), o que
 * faltava era o SLUG REAL: no banco eles não seguem o nome, e nem entre si
 * ("sc-floripa-lagoa", mas "florianopolis-barra-da-lagoa"). Por isso montar o
 * slug a partir do nome nunca ia acertar — tem que vir do banco. */
async function slugDoLugar(f) {
  if (f.slug) return f.slug;
  if (f._raw && f._raw.slug) return f._raw.slug;
  try {
    const nome = f.nome || "";
    let q = `localidades?sublocal=eq.${encodeURIComponent(nome)}&select=slug&limit=1`;
    if (f.cidade) q += `&cidade=eq.${encodeURIComponent(f.cidade)}`;
    // mesmas credenciais que o resto do arquivo usa (linha ~604)
    const _anon = (window.VENTOSUL_CONFIG && (window.VENTOSUL_CONFIG.SUPABASE_ANON_JWT || SUPABASE_ANON)) || SUPABASE_ANON;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, {
      headers: { apikey: _anon, Authorization: "Bearer " + _anon }
    });
    const d = await r.json();
    return (Array.isArray(d) && d[0] && d[0].slug) ? d[0].slug : null;
  } catch (e) { return null; }
}
/* 12/08/2026 — guia da caça ao tesouro: usa a MESMA bússola do mapa
   (shared/vs-bussola.js). Nada foi reescrito — a API já era genérica de
   propósito: VSBussola.guiar({lat,lng,nome}). */
window.cacaGuiar = function (lat, lng, nome) {
  if (!window.VSBussola) {
    if (typeof toast === "function") toast("Bússola ainda carregando…");
    return;
  }
  VSBussola.guiar({
    lat: lat, lng: lng, nome: nome || "o tesouro",
    onChegou: function () {
      try { if (typeof toast === "function") toast("🏴‍☠️ Chegou! Agora a foto."); } catch (e) {}
    }
  });
};

window.abrirFavorito = async function(idx) {
  const f = getFavs()[idx];
  if (!f) return;
  if (f.tipo === "cidade") {
    state.estado = f.estado;
    state.cidade = f.cidade;
    savePrefs();
    abrirCidade();
    return;
  }
  // Praia/bairro com página dedicada (ex.: Barra da Lagoa) → vai direto nela
  const pag = paginaDedicadaDe(f.nome);
  if (pag) { location.href = pag; return; }
  // senão: a página de localidade, com o slug que o BANCO diz ser o certo
  const slug = await slugDoLugar(f);
  if (slug) { location.href = "/localidade.html?slug=" + encodeURIComponent(slug); return; }
  // sem slug em lugar nenhum: cai na tela de detalhe, como era antes
  abrirDetalhePraia(f._raw || { nome: f.nome, foto_url: f.foto, cidade: f.cidade, estado: f.estado });
};
window.removerFavorito = function(idx) {
  const lista = getFavs();
  lista.splice(idx, 1);
  saveFavs(lista);
  renderFavoritos();
  atualizarEstrelaCidade();
};
function atualizarEstrelaCidade() {
  const ativo = state.cidade ? isFav({ tipo: "cidade", nome: state.cidade, estado: state.estado, cidade: state.cidade }) : false;
  // nome da cidade fica DOURADO quando favorita (duplo-clique). Sem botão extra.
  const titulo = document.getElementById("city-title");
  if (titulo) titulo.classList.toggle("cidade-favorita", ativo);
}
document.getElementById("fav-cidade-btn")?.addEventListener("click", () => {
  if (!state.cidade) return;
  const item = { tipo: "cidade", nome: state.cidade, estado: state.estado, cidade: state.cidade };
  toggleFav(item);
});

// ─────────────────────────────────────────────────────────────
// 💸 Transferir SulCoins
// ─────────────────────────────────────────────────────────────
window.abrirTransferir = function(prefill) {
  // prefill: { alvo?, valor?, desc? }  — vem do scanner (cobrança QR)
  const inpEmail = document.getElementById("trf-email");
  const inpSulis = document.getElementById("trf-sulis");
  const inpMsg   = document.getElementById("trf-msg");
  const banner   = document.getElementById("trf-cobranca-banner");
  const btnEnv   = document.getElementById("trf-enviar-btn");
  const titulo   = document.getElementById("trf-titulo");

  const _setTitulo = (svgName, txt) => {
    if (!titulo) return;
    titulo.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px">${VSIcons.svg(svgName, 20)}<span>${txt}</span></span>`;
  };
  const _setBtn = (txt) => {
    if (!btnEnv) return;
    btnEnv.innerHTML = `${VSIcons.svg("send", 14)} <span>${txt}</span>`;
  };

  if (prefill && typeof prefill === "object") {
    if (prefill.alvo) inpEmail.value = prefill.alvo;
    if (prefill.valor && prefill.valor > 0) {
      inpSulis.value = prefill.valor;
      inpSulis.readOnly = true;
      inpSulis.style.background = "var(--zc-card-2, rgba(255,193,7,0.08))";
    } else {
      inpSulis.readOnly = false;
      inpSulis.style.background = "";
    }
    if (prefill.desc) inpMsg.value = prefill.desc;
    if (prefill.valor && prefill.valor > 0 && banner) {
      const valFmt = VSWallet.formatarSulis(prefill.valor);
      banner.style.display = "block";
      banner.innerHTML = `<strong>Cobrança de ${valFmt}</strong>${prefill.desc ? `<br><span style="color:var(--zc-hint);font-size:13px">${escapeHtml(prefill.desc)}</span>` : ""}`;
      _setTitulo("send", tr("trf_pagar_cobranca"));
      _setBtn(`Pagar ${valFmt}`);
    } else {
      if (banner) banner.style.display = "none";
      _setTitulo("send", "Transferir SulCoins");
      _setBtn("Enviar");
    }
  } else {
    // Sem prefill: limpa modo cobrança
    if (banner) banner.style.display = "none";
    if (inpSulis) { inpSulis.readOnly = false; inpSulis.style.background = ""; }
    _setTitulo("send", "Transferir SulCoins");
    _setBtn("Enviar");
  }

  document.getElementById("modal-transferir").style.display = "flex";
};
window.fecharTransferir = function() {
  document.getElementById("modal-transferir").style.display = "none";
  // Limpa banner de cobrança e desbloqueia campo de valor
  const banner = document.getElementById("trf-cobranca-banner");
  const inpS   = document.getElementById("trf-sulis");
  if (banner) banner.style.display = "none";
  if (inpS) { inpS.readOnly = false; inpS.style.background = ""; }
};
window.executarTransferir = async function() {
  const email = document.getElementById("trf-email").value.trim();
  const sulis = parseInt(document.getElementById("trf-sulis").value, 10);
  const msg   = document.getElementById("trf-msg").value.trim() || null;
  if (!email.includes("@")) return alert("Email inválido");
  if (!sulis || sulis < 1) return alert(tr("trf_qtd_invalida"));

  // Verifica saldo
  const w = await VSWallet.myWallet();
  const livre = w?.saldo_livre_sulis || 0;
  if (sulis > livre) {
    return alert(`Saldo insuficiente. Você tem ${VSWallet.formatarSulis(livre)} livres.`);
  }
  // Confirmação
  const valorFmt = VSWallet.formatarSulis(sulis);
  const eCobranca = !!document.getElementById("trf-cobranca-banner")?.offsetParent;
  const titulo = eCobranca ? tr("trf_pagar_cobranca") : tr("trf_confirmar_envio");
  if (!confirm(`${titulo}: ${valorFmt} (${sulis} sulis) pra ${email}?\n\nEssa operação não pode ser desfeita.`)) return;

  const btn = event?.target;
  if (btn) { btn.disabled = true; btn.textContent = tr("enviando"); }
  try {
    await VSWallet.transferirPorEmail({ email, sulis, mensagem: msg });
    fecharTransferir();
    document.getElementById("trf-email").value = "";
    document.getElementById("trf-sulis").value = "";
    document.getElementById("trf-msg").value = "";
    mostrarComprovante({ email, sulis, msg });
    abrirWallet();
  } catch (e) {
    alert("Erro: " + (e.message || e));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = eCobranca ? `Pagar ${valorFmt} →` : "Enviar →"; }
  }
};

// Comprovante após enviar — mostra modal com texto compartilhável
function mostrarComprovante({ email, sulis, msg }) {
  const data = new Date().toLocaleString("pt-BR");
  const valorFmt = VSWallet.formatarSulis(sulis);
  const texto = `✓ Vento Sul · transferência\n${valorFmt} (${sulis} sulis)\nPra: ${email}${msg ? `\nMsg: ${msg}` : ""}\nData: ${data}\nhttps://www.vento-sul.tech`;
  const m = document.getElementById("modal-comprovante");
  if (!m) { alert(`✓ ${valorFmt} enviados pra ${email}`); return; }
  document.getElementById("comp-valor").textContent = valorFmt;
  document.getElementById("comp-para").textContent = email;
  document.getElementById("comp-data").textContent = data;
  document.getElementById("comp-msg").textContent = msg || "—";
  document.getElementById("comp-btn-share").onclick = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Vento Sul", text: texto }); } catch {}
    } else {
      navigator.clipboard?.writeText(texto);
      const b = document.getElementById("comp-btn-share");
      const old = b.textContent; b.textContent = "✓ " + tr("copiado"); setTimeout(()=>b.textContent=old, 1400);
    }
  };
  m.style.display = "flex";
}

// ─────────────────────────────────────────────────────────────
// 🗺️ Mapa + 🧭 Bússola — abre lugar com flecha apontando pro destino
// ─────────────────────────────────────────────────────────────
let _leafletMap = null;
let _leafletMarker = null;
let _bussolaInfo = null; // { destLat, destLng, meuLat, meuLng }
let _orientHandler = null;

// Categorias de lugar isolado/natureza onde vale alertar segurança
const _CAT_ISOLADAS = /trilha|cachoeira|c[âa]nion|mirante|cascata|salto|gruta|caverna|parque\s+nacional|mata|floresta|costa\s+selvagem|morro|pico|serra/i;

// Helper universal — leva o usuário até qualquer lugar via mapa+bússola
window.comoChegar = function(item) {
  if (!item || item.lat == null || item.lng == null) {
    return alert(tr("lugar_sem_coord"));
  }
  // Registra clique de rota se for barraca (ROI comerciante)
  if (item.barraca_id || item.id) {
    try { VSSupabase.rpc("registrar_evento_barraca", { p_barraca_id: item.barraca_id || item.id, p_tipo: "rota", p_origem: "perto" }); } catch {}
  }
  abrirMapa(parseFloat(item.lat), parseFloat(item.lng),
            item.nome || item.titulo || "Destino",
            item.categoria || item.cat || item.tipo || "");
};

window.abrirMapa = function(lat, lng, nome, categoria = "") {
  if (typeof L === "undefined") {
    setTimeout(() => abrirMapa(lat, lng, nome, categoria), 600);
    return;
  }
  showScreen("mapa");
  const titulo = document.getElementById("mapa-titulo");
  if (titulo) titulo.textContent = `📍 ${categoria ? categoria + " · " : ""}${nome}`;
  // Aviso de segurança pra trilhas / natureza isolada
  let aviso = document.getElementById("mapa-aviso-seguranca");
  if (!aviso) {
    const tela = document.getElementById("screen-mapa") || document.getElementById("leaflet-mapa")?.parentElement;
    if (tela) {
      aviso = document.createElement("div");
      aviso.id = "mapa-aviso-seguranca";
      aviso.style.cssText = "display:none;margin:8px 12px;padding:10px 12px;background:rgba(255,193,7,0.18);border:1px solid rgba(255,193,7,0.55);border-radius:8px;font-size:13px;line-height:1.4;color:#fff8e1";
      tela.insertBefore(aviso, tela.firstChild?.nextSibling || null);
    }
  }
  if (aviso) {
    if (_CAT_ISOLADAS.test(categoria) || _CAT_ISOLADAS.test(nome)) {
      aviso.style.display = "block";
      aviso.innerHTML = `⚠️ ${tr("mapa_aviso_trilha")}`;
    } else {
      aviso.style.display = "none";
    }
  }

  // Inicializa mapa se não foi
  if (!_leafletMap) {
    _leafletMap = L.map("leaflet-mapa", { zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OSM", maxZoom: 19
    }).addTo(_leafletMap);
  }
  if (_leafletMarker) _leafletMarker.remove();
  _leafletMap.setView([lat, lng], 14);
  _leafletMarker = L.marker([lat, lng]).addTo(_leafletMap).bindPopup(nome).openPopup();

  // Botões "Abrir no Google Maps / Waze" — utilidade real durante viagem
  const tela = document.getElementById("screen-mapa") || document.getElementById("leaflet-mapa")?.parentElement;
  if (tela) {
    let extBtns = document.getElementById("mapa-ext-btns");
    if (!extBtns) {
      extBtns = document.createElement("div");
      extBtns.id = "mapa-ext-btns";
      extBtns.style.cssText = "display:flex;gap:6px;margin:8px 12px;flex-wrap:wrap";
      tela.insertBefore(extBtns, tela.firstChild?.nextSibling || null);
    }
    extBtns.innerHTML = `
      <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" rel="noopener" style="flex:1;min-width:130px;text-align:center;background:#4285f4;color:#fff;text-decoration:none;padding:10px;border-radius:8px;font-weight:600;font-size:13px">🗺️ Google Maps</a>
      <a href="https://waze.com/ul?ll=${lat},${lng}&navigate=yes" target="_blank" rel="noopener" style="flex:1;min-width:130px;text-align:center;background:#33ccff;color:#000;text-decoration:none;padding:10px;border-radius:8px;font-weight:700;font-size:13px">🚗 Waze</a>
    `;
  }

  // Pega minha localização e desenha "eu"
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const meu = [pos.coords.latitude, pos.coords.longitude];
      L.circleMarker(meu, { radius: 8, color: "#03a9f4", fillColor: "#03a9f4", fillOpacity: 0.7 })
        .addTo(_leafletMap).bindPopup(tr("mapa_voce"));
      // Linha entre você e o destino
      L.polyline([meu, [lat, lng]], { color: "#4caf50", weight: 3, opacity: 0.6, dashArray: "6,8" })
        .addTo(_leafletMap);
      _leafletMap.fitBounds([meu, [lat, lng]], { padding: [40, 40] });
      _bussolaInfo = { destLat: lat, destLng: lng, meuLat: meu[0], meuLng: meu[1] };
      atualizarBussola();
      ligarOrientacao();
    });
  }
};

function _bearing(lat1, lon1, lat2, lon2) {
  const φ1 = lat1 * Math.PI/180, φ2 = lat2 * Math.PI/180;
  const Δλ = (lon2 - lon1) * Math.PI/180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180/Math.PI + 360) % 360;
}
function atualizarBussola(headingDispositivo = 0) {
  if (!_bussolaInfo) return;
  const flecha = document.getElementById("bussola-flecha");
  const distEl = document.getElementById("bussola-distancia");
  const dirEl  = document.getElementById("bussola-direcao");
  const km = distKm(_bussolaInfo.meuLat, _bussolaInfo.meuLng, _bussolaInfo.destLat, _bussolaInfo.destLng);
  const txtKm = km != null
    ? (km < 1 ? Math.round(km * 1000) + " m" : km.toFixed(1) + " km")
    : "— km";
  if (distEl) distEl.textContent = txtKm;
  const bearing = _bearing(_bussolaInfo.meuLat, _bussolaInfo.meuLng, _bussolaInfo.destLat, _bussolaInfo.destLng);
  const ang = (bearing - headingDispositivo + 360) % 360;
  if (flecha) flecha.style.transform = `rotate(${ang}deg)`;
  const cardeais = ["N","NE","L","SE","S","SO","O","NO"];
  const idx = Math.round(bearing / 45) % 8;
  if (dirEl) dirEl.textContent = `Direção: ${cardeais[idx]} (${bearing.toFixed(0)}°)`;

  // Sincroniza versão FULLSCREEN se aberta
  const wrap = document.getElementById("bf-flecha-wrap");
  if (wrap) wrap.style.transform = `rotate(${ang}deg)`;
  const distBig = document.getElementById("bf-distancia");
  if (distBig) distBig.textContent = txtKm;
  const dirBig = document.getElementById("bf-direcao");
  if (dirBig) dirBig.textContent = `Direção ${cardeais[idx]} · ${bearing.toFixed(0)}°`;
}

// Abre/fecha modo bússola gigante fullscreen
window.abrirBussolaFullscreen = function() {
  const ov = document.getElementById("bussola-fullscreen");
  if (!ov) return;
  // Pega nome do destino do título do mapa
  const tit = document.getElementById("mapa-titulo");
  const dest = document.getElementById("bf-destino");
  if (dest && tit) dest.textContent = tit.textContent || tr("mapa_destino");
  ov.style.display = "flex";
  // Atualização imediata
  atualizarBussola(0);
};
window.fecharBussolaFullscreen = function() {
  const ov = document.getElementById("bussola-fullscreen");
  if (ov) ov.style.display = "none";
};
document.addEventListener("DOMContentLoaded", () => {
  // Click na flecha pequena abre a gigante
  document.getElementById("bussola-flecha")?.addEventListener("click", abrirBussolaFullscreen);
  document.getElementById("bussola-fullscreen")?.addEventListener("click", fecharBussolaFullscreen);
});
// Fallback se DOM já carregado
setTimeout(() => {
  const f = document.getElementById("bussola-flecha");
  if (f && !f._wired) {
    f.addEventListener("click", abrirBussolaFullscreen);
    f._wired = true;
  }
  const ov = document.getElementById("bussola-fullscreen");
  if (ov && !ov._wired) {
    ov.addEventListener("click", fecharBussolaFullscreen);
    ov._wired = true;
  }
}, 1500);
function ligarOrientacao() {
  // iOS pede permissão explícita
  const start = () => {
    _orientHandler = (e) => {
      const heading = e.webkitCompassHeading || (e.alpha != null ? 360 - e.alpha : 0);
      atualizarBussola(heading);
    };
    window.addEventListener("deviceorientation", _orientHandler);
  };
  if (typeof DeviceOrientationEvent?.requestPermission === "function") {
    DeviceOrientationEvent.requestPermission().then(s => { if (s === "granted") start(); }).catch(() => {});
  } else {
    start();
  }
}

// ─────────────────────────────────────────────────────────────
// 🌅 Carrossel decorativo em TODAS as telas — praias da cidade +
// café/restaurante beira-mar steampunk + paisagens do Sul.
// Mantém o app vivo em qualquer página.
// ─────────────────────────────────────────────────────────────
const STEAMPUNK_DECOR = [
  { foto_url: "bg/bg_cafe_steampunk.webp",
    titulo: "☕ " + tr("decor_cafe_t"),
    subtitulo: tr("decor_cafe_s") },
  { foto_url: "bg/bg_cafe_praia.webp",
    titulo: "🍷 " + tr("decor_rest_t"),
    subtitulo: tr("decor_rest_s") },
  { foto_url: "bg/bg_cafe_steampunk_v1.webp",
    titulo: "🍻 " + tr("decor_bar_t"),
    subtitulo: tr("decor_bar_s") },
  { foto_url: "bg/bg_cafe_praia_v3.webp",
    titulo: "🌅 " + tr("decor_resto_t"),
    subtitulo: tr("decor_resto_s") }
];
let _decorCache = null;
async function _carregarFotosDecor() {
  if (_decorCache) return _decorCache;
  const [praiasCidade, geral] = await Promise.all([
    state.cidade
      ? sb(`v_praias_cidade?select=nome,foto_url,descricao&cidade=eq.${enc(state.cidade)}&estado=eq.${enc(state.estado)}&foto_url=not.is.null&limit=15`).catch(() => [])
      : Promise.resolve([]),
    sb("v_carrossel_landing_geral?select=foto_url,titulo,subtitulo&order=ordem&limit=15").catch(() => [])
  ]);
  const praias = (praiasCidade || []).map(p => ({
    foto_url: p.foto_url,
    titulo: `🏖️ ${p.nome}`,
    subtitulo: p.descricao ? p.descricao.slice(0, 60) : "Praia da região"
  }));
  // Mistura intercalada: praia, steampunk, praia, steampunk, geral, geral...
  const mix = [];
  const max = Math.max(praias.length, STEAMPUNK_DECOR.length, (geral || []).length);
  for (let i = 0; i < max; i++) {
    if (praias[i])              mix.push(praias[i]);
    if (STEAMPUNK_DECOR[i % 4]) mix.push(STEAMPUNK_DECOR[i % 4]);
    if (geral && geral[i])      mix.push(geral[i]);
  }
  _decorCache = mix.length ? mix : STEAMPUNK_DECOR;
  return _decorCache;
}
async function decorarTela(screenId) {
  const screen = document.getElementById(`screen-${screenId}`);
  if (!screen) return;
  // Skip telas que não fazem sentido (landing já tem carrossel próprio,
  // litorânea tem malha viva, mapa fullscreen, notif ficaria pesado, city tem os 2 dela)
  const SEM_DECOR = new Set(["landing", "litoranea", "mapa", "notif", "city", "comercio"]);
  if (SEM_DECOR.has(screenId)) return;

  // CARROSSEL DE CIMA — depois do h2 (parceiros + steampunk em destaque)
  let topWrap = screen.querySelector(":scope > .carousel-decor-top-wrap");
  if (!topWrap) {
    topWrap = document.createElement("div");
    topWrap.className = "carousel-decor-top-wrap carousel-primary-wrap";
    topWrap.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
        <h3 style="margin:0">🏪 <span data-tr="parceiros_destaque">Parceiros em destaque</span></h3>
        <small style="color:var(--hint);font-size:11px">${tr("comerciantes")}</small>
      </div>
      <div class="carousel carousel-decor-top"></div>`;
    const titulo = screen.querySelector("h2");
    if (titulo && titulo.parentNode === screen) titulo.after(topWrap);
    else screen.prepend(topWrap);
  }
  const decTop = topWrap.querySelector(".carousel-decor-top");
  // CARROSSEL DE BAIXO — no fim da tela (praias + geral, "favoritos da galera")
  let decBottom = screen.querySelector(":scope > .carousel-decor-bottom");
  if (!decBottom) {
    decBottom = document.createElement("div");
    decBottom.className = "carousel carousel-decor-bottom";
    // Bloco com label "Favoritos da galera"
    const wrap = document.createElement("div");
    wrap.className = "carousel-decor-bottom-wrap";
    wrap.innerHTML = '<h3 style="margin:18px 0 6px">⭐ <span data-tr="favoritos_galera">Favoritos da galera</span></h3>';
    wrap.appendChild(decBottom);
    screen.appendChild(wrap);
  }

  // Carrega dados (cache) e separa: top = parceiros+steampunk, bottom = praias+geral
  const [parceiros, praiasCidade, geral] = await Promise.all([
    state.cidade
      ? sb(`feira_barracas?select=nome,categoria,telhado_url,plano&estado=eq.${enc(state.estado)}&cidade=eq.${enc(state.cidade)}&dono_uuid=not.is.null&ativa=eq.true&telhado_url=not.is.null&limit=20`).catch(() => [])
      : Promise.resolve([]),
    state.cidade
      ? sb(`v_praias_cidade?select=nome,foto_url,descricao&cidade=eq.${enc(state.cidade)}&estado=eq.${enc(state.estado)}&foto_url=not.is.null&limit=15`).catch(() => [])
      : Promise.resolve([]),
    sb("v_carrossel_landing_geral?select=foto_url,titulo,subtitulo&order=ordem&limit=15").catch(() => [])
  ]);

  const fotosParceiros = (parceiros || []).map(b => ({
    foto_url: b.telhado_url,
    titulo: `🏪 ${b.nome}`,
    subtitulo: b.categoria || "Parceiro Vento Sul"
  }));
  const fotosPraias = (praiasCidade || []).map(p => ({
    foto_url: p.foto_url,
    titulo: `🏖️ ${p.nome}`,
    subtitulo: p.descricao ? p.descricao.slice(0, 60) : "Praia da região"
  }));

  // CIMA: parceiros se houver, senão steampunk + praias
  const fotosTop = fotosParceiros.length
    ? [...fotosParceiros, ...STEAMPUNK_DECOR]
    : [...STEAMPUNK_DECOR, ...fotosPraias.slice(0, 4)];
  // BAIXO: praias + geral
  const fotosBottom = [...fotosPraias, ...(geral || [])];

  renderCarousel(decTop, fotosTop, { intervaloMs: 9000, modo: "fade" });
  renderCarousel(decBottom, fotosBottom.length ? fotosBottom : STEAMPUNK_DECOR, {
    intervaloMs: 10000, modo: "single"
  });
}
// Plug-in: dispara depois de showScreen
const _origShowScreen = showScreen;
showScreen = function(name) {
  _origShowScreen(name);
  decorarTela(name).catch(() => {});
};

// ─────────────────────────────────────────────────────────────
// 👁️ Olhinho mostrar/esconder senha
// Toda <input type="password"> do app ganha um botão à direita.
// Aplica automático no boot + observa novos modais (MutationObserver).
// ─────────────────────────────────────────────────────────────
function _envolverSenhaComOlho(input) {
  if (!input || input.dataset.olhoOk === "1") return;
  if (input.type !== "password") return;
  const pai = input.parentElement;
  if (!pai) return;
  // Envolve o input num <span class="senha-com-olho">
  const wrap = document.createElement("span");
  wrap.className = "senha-com-olho";
  // Mantém width:100% se input tinha
  wrap.style.cssText = "display:block;width:100%";
  pai.insertBefore(wrap, input);
  wrap.appendChild(input);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "olho-btn";
  btn.setAttribute("aria-label", "Mostrar senha");
  btn.innerHTML = window.VSIcons?.svg?.("eye", 18) || "👁";
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (input.type === "password") {
      input.type = "text";
      btn.innerHTML = window.VSIcons?.svg?.("eye-off", 18) || "🙈";
      btn.setAttribute("aria-label", "Esconder senha");
    } else {
      input.type = "password";
      btn.innerHTML = window.VSIcons?.svg?.("eye", 18) || "👁";
      btn.setAttribute("aria-label", "Mostrar senha");
    }
  });
  wrap.appendChild(btn);
  input.dataset.olhoOk = "1";
}
function _aplicarOlhinhoEmTodos() {
  document.querySelectorAll('input[type="password"]').forEach(_envolverSenhaComOlho);
}
// Roda no boot e quando DOM mudar (modais que abrem dinamicamente)
if (typeof MutationObserver !== "undefined") {
  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const n of m.addedNodes) {
        if (!(n instanceof HTMLElement)) continue;
        if (n.tagName === "INPUT" && n.type === "password") _envolverSenhaComOlho(n);
        n.querySelectorAll?.('input[type="password"]').forEach(_envolverSenhaComOlho);
      }
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}
window.addEventListener("DOMContentLoaded", _aplicarOlhinhoEmTodos);

// ─────────────────────────────────────────────────────────────
// 📻 Botão "escute" sutil — narra explicação de qualquer tópico via TTS
// Sem API: usa knowledge_base.js local. Litorânea fala com voz natural pt-BR.
// ─────────────────────────────────────────────────────────────
window._escuteAtual = null;  // botão atualmente falando (pra desativar visual)

window.explicarTopico = function(topico, btnRef) {
  // Cancela qualquer fala anterior
  try { window.speechSynthesis?.cancel(); } catch {}
  if (window._escuteAtual) {
    window._escuteAtual.classList.remove("escute-falando");
    if (window._escuteAtual === btnRef) {
      window._escuteAtual = null;
      return;  // toggle: 2º toque para a fala
    }
    window._escuteAtual = null;
  }

  const texto = window.VSKnowledge?.explicar?.(topico);
  if (!texto) {
    console.warn("[escute] tópico não conhecido:", topico);
    return;
  }

  // Marca botão visualmente
  if (btnRef) {
    btnRef.classList.add("escute-falando");
    window._escuteAtual = btnRef;
  }

  // Fala com voz da Litorânea (pt-BR feminino + pausas naturais — shared/litoranea.js)
  try {
    window.VSLitoranea?.falarTTS?.(texto);
  } catch (e) { console.warn("[escute] TTS falhou", e); }

  // Quando termina, tira o highlight (estima por duração)
  const segundos = Math.min(120, Math.max(10, texto.length / 14));
  setTimeout(() => {
    if (window._escuteAtual === btnRef && btnRef) {
      btnRef.classList.remove("escute-falando");
      window._escuteAtual = null;
    }
  }, segundos * 1000);
};

// Helper pra criar HTML do botão. Uso: ${escuteBtn("carteira", "Ouvir como funciona a carteira")}
window.escuteBtn = function(topico, label) {
  const aria = label || ("Ouvir explicação: " + topico);
  return `<button class="escute-btn" type="button" aria-label="${escapeHtml(aria)}" title="${escapeHtml(aria)}" onclick="event.stopPropagation();explicarTopico('${topico}', this)">${VSIcons.svg("broadcast", 14)}</button>`;
};

// Plugar botões nas telas que têm título conhecido — chamado em showScreen
function _plugarEscuteBotoes() {
  // 05/08/2026 — DESLIGADO a pedido do DJ.
  // Este trecho grudava um botao de audio no FIM de cada titulo de tela
  // (o "escute-btn"). A explicacao agora mora no icone de radio do CABECALHO,
  // que e a diretriz: video/explicacao sempre no 1o icone do header.
  // Dois lugares pra mesma coisa confunde, e o botao colado no titulo ainda
  // desalinhava o texto — o titulo nao ficava centralizado por causa dele.
  // Deixado aqui, e nao apagado, pra ficar obvio o que foi tirado e por que.
  return;

  const mapa = {
    "screen-landing":   { selector: ".landing-titulo h1",       topico: "landing" },
    "screen-wallet":    { selector: "#screen-wallet > h2",      topico: "carteira" },
    "screen-comercio":  { selector: "#comercio-titulo",         topico: "comercio" },
    "screen-feira":     { selector: "#screen-feira > h2",       topico: "feira" },
    "screen-caca":      { selector: "#screen-caca > h2",        topico: "caca" },
    "screen-coletiva":  { selector: "#screen-coletiva > h2",    topico: "coletiva" },
    "screen-aurora":    { selector: ".aurora-titulo h2",        topico: "aurora" },
    "screen-litoranea": { selector: "#lit-nome-dyn",            topico: "landing" },
    "screen-admin":     { selector: "#admin-titulo",            topico: "default" },
    "screen-votados":   { selector: "#screen-votados > h2",     topico: "votados" },
    "screen-promos":    { selector: "#screen-promos > h2",      topico: "coletiva" },
    "screen-praias":    { selector: "#screen-praias > h2",      topico: "praias" },
    "screen-perto":     { selector: "#screen-perto > h2",       topico: "mapa" },
    "screen-notif":     { selector: "#screen-notif > h2",       topico: "default" },
    "screen-hub":       { selector: "#screen-hub > h2",         topico: "hub" },
    "screen-quests":    { selector: "#screen-quests > h2",      topico: "quests" }
  };
  for (const [id, cfg] of Object.entries(mapa)) {
    const sec = document.getElementById(id);
    if (!sec) continue;
    const tit = sec.querySelector(cfg.selector);
    if (!tit || tit.dataset.escuteOk === "1") continue;
    tit.dataset.escuteOk = "1";
    // Adiciona botão inline ao final do título
    const btn = document.createElement("button");
    btn.className = "escute-btn";
    btn.type = "button";
    btn.setAttribute("aria-label", "Ouvir explicação");
    btn.title = "Ouvir explicação";
    btn.innerHTML = window.VSIcons?.svg?.("broadcast", 14) || '📻';
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (window.VSBrief?.falar) window.VSBrief.falar(cfg.topico, btn);
      else window.explicarTopico(cfg.topico, btn);
    });
    tit.appendChild(btn);
  }
}
// Hook em showScreen pra plugar quando trocar de tela
const _origShowScreenEscute = window.showScreen;
if (typeof _origShowScreenEscute === "function") {
  window.showScreen = function(name) {
    _origShowScreenEscute(name);
    setTimeout(_plugarEscuteBotoes, 30);
  };
}
// Plugar logo no boot
window.addEventListener("DOMContentLoaded", () => setTimeout(_plugarEscuteBotoes, 200));

// ─────────────────────────────────────────────────────────────
// 🏦 Pool da Comunidade — transparência em tempo real
// Mostra quanto R$ está depositado, emitido, reservado e livre.
// Auditoria pública: qualquer um pode somar e bater.
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// 🏢 Área do LOJISTA (loja grande premium — não cabe em barraca)
// ─────────────────────────────────────────────────────────────
window.abrirAreaLojista = async function() {
  let modal = document.getElementById("modal-lojista");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-lojista";
    modal.className = "modal-bg zone-comercial";
    modal.style.zIndex = "9750";
    modal.innerHTML = `<div class="modal" style="max-width:600px;width:96%;max-height:92vh;overflow-y:auto"></div>`;
    document.body.appendChild(modal);
  }
  const inner = modal.querySelector(".modal");
  inner.innerHTML = `
    <h3 style="display:inline-flex;align-items:center;gap:8px;margin-top:0">🏢 ${tr("lojista_titulo")}</h3>
    <p style="font-size:13px;color:var(--zc-hint);margin:6px 0 14px;line-height:1.5">
      A barraca é pra comerciante pequeno (uma mesa, um quiosque). Pra <strong>loja maior</strong>
      — magazine, supermercado, marca local, marca grande, escritório, prestador de serviço com
      espaço físico — temos a página <strong>Loja Premium</strong>.
    </p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
      <div class="card-info" style="padding:12px">
        <strong style="font-size:13px;color:var(--zc-hint)">🏪 BARRACA</strong>
        <ul style="margin:8px 0 0;padding-left:18px;font-size:11px;line-height:1.5;color:var(--zc-text)">
          <li>${tr("lojista_li_categoria")}</li>
          <li>${tr("lojista_li_telhado")}</li>
          <li>${tr("lojista_li_produtos")}</li>
          <li>${tr("lojista_li_gratis")}</li>
          <li>${tr("lojista_li_destaque")}</li>
        </ul>
      </div>
      <div class="card-info" style="padding:12px;border-left:3px solid var(--zc-accent)">
        <strong style="font-size:13px;color:var(--zc-accent)">🏢 LOJA PREMIUM</strong>
        <ul style="margin:8px 0 0;padding-left:18px;font-size:11px;line-height:1.5;color:var(--zc-text)">
          <li>${tr("lojista_li_multicat")}</li>
          <li>Banner + logo + galeria</li>
          <li>${tr("lojista_li_pagina")}</li>
          <li>CNPJ, razão social, horário</li>
          <li>Mago personaliza visual</li>
          <li>WhatsApp + Insta + site direto</li>
          <li>Plano mensal R$ 99 ou anual R$ 990</li>
        </ul>
      </div>
    </div>

    <div style="background:var(--zc-card);border-left:3px solid var(--zc-warn);padding:12px;border-radius:0 4px 4px 0;margin-bottom:14px">
      <strong style="font-size:13px">⚠️ ${tr("em_desenvolvimento")}</strong>
      <p style="font-size:12px;color:var(--zc-hint);margin-top:4px;line-height:1.5">
        A área de Loja Premium está sendo finalizada. Se você é lojista interessado, manda email
        pra <strong>contato@vento-sul.tech</strong> com nome da loja, CNPJ, cidade e categorias.
        Você entra na lista de fundadores com benefícios exclusivos.
      </p>
    </div>

    <button class="btn-primary mc-btn" style="width:100%" onclick="document.getElementById('modal-lojista').style.display='none'">${tr("lojista_aviso_btn")}</button>
  `;
  modal.style.display = "flex";
};

// ─────────────────────────────────────────────────────────────
// 🧙 Área do MAGO (dev jogador personaliza barracas/lojas pra ganhar SC)
// ─────────────────────────────────────────────────────────────
window.abrirAreaMago = async function() {
  let modal = document.getElementById("modal-mago");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-mago";
    modal.className = "modal-bg zone-comercial";
    modal.style.zIndex = "9750";
    modal.innerHTML = `<div class="modal" style="max-width:620px;width:96%;max-height:92vh;overflow-y:auto"></div>`;
    document.body.appendChild(modal);
  }
  const inner = modal.querySelector(".modal");
  // Carrega meus jobs (se for mago)
  let jobs = [];
  try {
    if (window.VSSupabase?.isLoggedIn?.()) {
      jobs = await VSSupabase.from("v_meus_mago_jobs").select("*").get() || [];
    }
  } catch {}
  inner.innerHTML = `
    <h3 style="display:inline-flex;align-items:center;gap:8px;margin-top:0">🧙 ${tr("mago_titulo")}</h3>
    <p style="font-size:13px;color:var(--zc-hint);margin:6px 0 14px;line-height:1.55">
      Magos são <strong>desenvolvedores e designers jogadores</strong> da Aurora. Vocês personalizam barracas,
      lojas premium e telas DOOH dos comerciantes em troca de SulCoin. É a economia descentralizada do app:
      cada job aceito vira reserva na pool, cada job aprovado vira forja com hash no seu nome.
    </p>

    <h4 style="font-size:13px;color:var(--zc-accent);letter-spacing:0.5px;text-transform:uppercase;margin:14px 0 8px">${tr("mago_tipos_job")}</h4>
    <ul style="margin:0;padding-left:20px;font-size:13px;line-height:1.7;color:var(--zc-text)">
      <li><strong>Personalização</strong> — HTML/CSS extra na página de uma barraca/loja (sandbox seguro)</li>
      <li><strong>SmartView</strong> — configura TV de vitrine de comerciante</li>
      <li><strong>Migração</strong> — ajuda comerciante a colocar fotos, produtos, descrição</li>
      <li><strong>Suporte</strong> — atende dúvida técnica, ensina a usar</li>
    </ul>

    <h4 style="font-size:13px;color:var(--zc-accent);letter-spacing:0.5px;text-transform:uppercase;margin:18px 0 8px">${tr("mago_como_funciona")}</h4>
    <ol style="margin:0;padding-left:20px;font-size:12px;line-height:1.7;color:var(--zc-text)">
      <li>Admin cria um job com descrição + sulis acordados</li>
      <li>Mago aceita, status vira <em>em_andamento</em></li>
      <li>Mago entrega trabalho, status vira <em>revisao</em></li>
      <li>Admin aprova → reserva na pool → forja → SC cai na carteira do mago</li>
      <li>Tudo verificável em <a href="/transparencia" target="_blank" style="color:var(--zc-accent)">/transparencia</a></li>
    </ol>

    ${jobs.length > 0 ? `
      <h4 style="font-size:13px;color:var(--zc-accent);letter-spacing:0.5px;text-transform:uppercase;margin:18px 0 8px">📋 Meus jobs (${jobs.length})</h4>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
        ${jobs.slice(0, 10).map(j => `
          <div class="card-info" style="padding:10px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
              <div style="flex:1;min-width:0">
                <strong style="font-size:13px">${escapeHtml(j.tipo)}</strong>
                <div style="font-size:12px;color:var(--zc-hint);margin-top:2px">${escapeHtml(j.descricao)}</div>
              </div>
              <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;background:rgba(255,255,255,0.08);padding:3px 8px;border-radius:3px;flex-shrink:0">${j.status}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px">
              <span style="color:var(--zc-hint)">${j.sulis_acordados} sulis</span>
              ${j.status === 'pago' ? `<span style="color:var(--zc-positivo)">✓ ${j.sulis_pagos} sulis pagos</span>` : ''}
            </div>
          </div>
        `).join("")}
      </div>
    ` : `
      <div style="background:var(--zc-card-2);padding:12px;border-radius:4px;margin:14px 0;font-size:12px;color:var(--zc-hint)">
        ${window.VSSupabase?.isLoggedIn?.() ? "Você ainda não tem jobs. Quando admin abrir um pra ti, aparece aqui." : "Faça login pra ver seus jobs e ganhar SulCoin como mago."}
      </div>
    `}

    <div style="background:var(--zc-card);border-left:3px solid var(--zc-positivo);padding:12px;border-radius:0 4px 4px 0;margin-top:14px">
      <strong style="font-size:13px">🎮 ${tr("quer_virar_mago")}</strong>
      <p style="font-size:12px;color:var(--zc-hint);margin-top:4px;line-height:1.5">
        Manda email pra <strong>contato@vento-sul.tech</strong> com:
        teu UUID (na carteira), tuas habilidades (HTML/CSS/UI/dev), portfolio se tiver.
        Vamos te dar role <code>mago</code> e abrir o primeiro job.
      </p>
    </div>

    <button class="btn-primary mc-btn" style="width:100%;margin-top:14px" onclick="document.getElementById('modal-mago').style.display='none'">Fechar</button>
  `;
  modal.style.display = "flex";
};

// Atalho público — abre dashboard com gráficos
window.abrirTransparenciaPublica = function() {
  window.open("/transparencia", "_blank", "noopener");
};

// Modal "Patrocinar Pool" — instruções pra comerciante/prefeitura abastecer
window.abrirPatrocinarPool = function() {
  let modal = document.getElementById("modal-patrocinar");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-patrocinar";
    modal.className = "modal-bg zone-comercial";
    modal.style.zIndex = "9750";
    modal.innerHTML = `<div class="modal" style="max-width:560px;width:96%;max-height:92vh;overflow-y:auto"></div>`;
    document.body.appendChild(modal);
  }
  const inner = modal.querySelector(".modal");
  inner.innerHTML = `
    <h3 style="display:inline-flex;align-items:center;gap:8px;margin-top:0">${VSIcons.svg("bank", 22)} ${tr("patrocinar_pool_titulo")}</h3>
    <p style="font-size:13px;color:var(--zc-hint);margin:6px 0 14px;line-height:1.5">
      Cada R$ depositado vira lastro pra 1000 sulis em missões cidadãs, bônus, caça ao tesouro e indicações. Seu nome (ou empresa) aparece publicamente na lista de patrocinadores em <a href="/transparencia" target="_blank" style="color:var(--zc-accent)">vento-sul.tech/transparencia</a>.
    </p>

    <div style="background:var(--zc-card);border-left:3px solid var(--zc-positivo);padding:12px;border-radius:0 4px 4px 0;margin-bottom:14px">
      <strong style="font-size:13px">${tr("quem_pode_patrocinar")}</strong>
      <ul style="margin:6px 0 0;padding-left:20px;font-size:12px;color:var(--zc-hint);line-height:1.6">
        <li>${tr("patro_li_cashback")}</li>
        <li>${tr("patro_li_prefeitura")}</li>
        <li>${tr("patro_li_pessoa")}</li>
        <li>${tr("patro_li_ong")}</li>
      </ul>
    </div>

    <h4 style="font-size:13px;color:var(--zc-accent);letter-spacing:0.5px;text-transform:uppercase;margin:14px 0 8px">${tr("como_fazer")}</h4>
    <ol style="margin:0;padding-left:20px;font-size:13px;line-height:1.8;color:var(--zc-text)">
      <li>Faz Pix da quantia que quer patrocinar pra <strong>contato@vento-sul.tech</strong></li>
      <li>Manda email pra mesma chave com <strong>nome do patrocinador</strong>, <strong>cidade/estado</strong> e <strong>comprovante Pix</strong></li>
      <li>Em até 24h o admin confirma e teu patrocínio aparece na lista pública com hash criptográfico</li>
      <li>Notamos o impacto: tu vê quanto SulCoin foi cunhado em cima do teu lastro</li>
    </ol>

    <div style="margin-top:18px;padding:12px;background:var(--zc-card-2);border-radius:4px;font-size:12px;line-height:1.5;color:var(--zc-hint)">
      <strong style="color:var(--zc-text)">Pixe direto:</strong>
      <div style="font-family:monospace;color:var(--zc-accent);margin-top:4px;word-break:break-all">contato@vento-sul.tech</div>
      <div style="margin-top:8px"><strong style="color:var(--zc-text)">Em breve</strong>: link Pix Mercado Pago direto no app, com confirmação automática e patrocínio publicado em segundos.</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:18px">
      <button class="btn-primary" onclick="abrirTransparenciaPublica()">${tr("ver_lista_publica")}</button>
      <button class="btn-primary mc-btn" onclick="document.getElementById('modal-patrocinar').style.display='none'">Fechar</button>
    </div>
  `;
  modal.style.display = "flex";
};

// Detecta ?patrocinar=1 na URL e abre modal
(function _detectarPatrocinar() {
  try {
    const params = new URLSearchParams(location.search);
    if (params.get("patrocinar") === "1") {
      setTimeout(() => window.abrirPatrocinarPool(), 800);
    }
  } catch {}
})();

window.abrirPoolDaComunidade = async function() {
  let modal = document.getElementById("modal-pool-comunidade");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-pool-comunidade";
    modal.className = "modal-bg zone-comercial";
    modal.style.zIndex = "9750";
    modal.innerHTML = `<div class="modal" style="max-width:520px;width:96%"></div>`;
    document.body.appendChild(modal);
  }
  const inner = modal.querySelector(".modal");
  inner.innerHTML = `<div class="loading" style="padding:30px;text-align:center;color:var(--zc-hint)">Lendo pool…</div>`;
  modal.style.display = "flex";

  const p = await VSWallet.poolStatus().catch(() => null);
  if (!p) {
    inner.innerHTML = `<p>Não consegui ler a pool agora. Tenta de novo.</p><button class="btn-primary mc-btn" style="width:100%;margin-top:14px" onclick="document.getElementById('modal-pool-comunidade').style.display='none'">Fechar</button>`;
    return;
  }

  const fmtR = (centavos) => "R$ " + (centavos / 100).toFixed(2).replace(".", ",");
  const fmtN = (n) => Number(n || 0).toLocaleString("pt-BR");
  const pct = parseFloat(p.percentual_uso || 0);

  inner.innerHTML = `
    <h3 style="display:inline-flex;align-items:center;gap:8px;margin-top:0">${VSIcons.svg("trending", 20)} ${tr("pool_comunidade_titulo")}</h3>
    <p style="font-size:12px;color:var(--zc-hint);margin:4px 0 14px">
      Lastro real em R$ depositado por comerciantes/prefeituras. Toda emissão de SulCoin sai daqui — auditável por qualquer pessoa.
    </p>

    <div class="card-info" style="padding:14px;margin-bottom:10px">
      <div style="font-size:11px;color:var(--zc-hint);letter-spacing:1px;text-transform:uppercase">${tr("pool_total_depositado")}</div>
      <div style="font-size:28px;font-weight:600;color:var(--zc-text);font-variant-numeric:tabular-nums">${fmtR(p.total_centavos)}</div>
      <div style="font-size:12px;color:var(--zc-hint);font-variant-numeric:tabular-nums">${fmtN(p.total_sulis)} sulis lastrados</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div class="card-info" style="padding:12px;border-left:3px solid var(--zc-positivo)">
        <div style="font-size:10px;color:var(--zc-hint);letter-spacing:0.5px;text-transform:uppercase">${tr("pool_emitido")}</div>
        <strong style="font-size:18px;color:var(--zc-positivo);font-variant-numeric:tabular-nums">${fmtN(p.emitido_sulis)}</strong>
        <div style="font-size:11px;color:var(--zc-hint)">${tr("pool_emitido_sub")}</div>
      </div>
      <div class="card-info" style="padding:12px;border-left:3px solid var(--zc-warn)">
        <div style="font-size:10px;color:var(--zc-hint);letter-spacing:0.5px;text-transform:uppercase">${tr("pool_reservado")}</div>
        <strong style="font-size:18px;color:var(--zc-warn);font-variant-numeric:tabular-nums">${fmtN(p.reservado_sulis)}</strong>
        <div style="font-size:11px;color:var(--zc-hint)">${tr("pool_reservado_sub")}</div>
      </div>
      <div class="card-info" style="padding:12px;border-left:3px solid var(--zc-accent);grid-column:1/-1">
        <div style="font-size:10px;color:var(--zc-hint);letter-spacing:0.5px;text-transform:uppercase">${tr("pool_disponivel")}</div>
        <strong style="font-size:22px;color:var(--zc-accent);font-variant-numeric:tabular-nums">${fmtN(p.livre_sulis)} sulis</strong>
        <div style="font-size:11px;color:var(--zc-hint)">${pct}% da pool em uso</div>
      </div>
    </div>

    <div style="margin-top:12px;padding:10px;background:var(--zc-card-2);border-radius:4px;font-size:12px;line-height:1.5;color:var(--zc-hint)">
      <strong style="color:var(--zc-text)">Como funciona:</strong> Comerciantes e prefeituras depositam R$ via Pix → vira lastro. Usuários ganham SC em missões e gastam com comerciantes (que convertem em R$ de volta). Saldo nunca passa do lastro — sustentável de verdade.
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">
      <button class="btn-primary" style="background:var(--zc-positivo) !important;display:inline-flex;align-items:center;justify-content:center;gap:6px" onclick="document.getElementById('modal-pool-comunidade').style.display='none';abrirPatrocinarPool()">
        ${VSIcons.svg("bank", 14)} ${tr("patrocinar_btn")}
      </button>
      <button class="btn-primary" style="display:inline-flex;align-items:center;justify-content:center;gap:6px" onclick="abrirTransparenciaPublica()">
        ${VSIcons.svg("trending", 14)} ${tr("dashboard_publico")}
      </button>
    </div>
    <button class="btn-primary mc-btn" style="width:100%;margin-top:8px" onclick="document.getElementById('modal-pool-comunidade').style.display='none'">Fechar</button>
  `;
};

// ─────────────────────────────────────────────────────────────
// 📜 Origem dos meus sulis — lista de forjas verificáveis
// ─────────────────────────────────────────────────────────────
window.abrirOrigemDosMeusSulis = async function() {
  let modal = document.getElementById("modal-origem-sulis");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-origem-sulis";
    modal.className = "modal-bg zone-comercial";
    modal.style.zIndex = "9750";
    modal.innerHTML = `<div class="modal" style="max-width:540px;width:96%;max-height:92vh;overflow-y:auto"></div>`;
    document.body.appendChild(modal);
  }
  const inner = modal.querySelector(".modal");
  inner.innerHTML = `<div class="loading" style="padding:30px;text-align:center;color:var(--zc-hint)">Buscando forjas…</div>`;
  modal.style.display = "flex";

  const forjas = await VSWallet.minhasForjas(50).catch(() => []);

  if (!forjas || forjas.length === 0) {
    inner.innerHTML = `
      <h3 style="display:inline-flex;align-items:center;gap:8px;margin-top:0">${VSIcons.svg("info", 20)} Origem dos seus sulis</h3>
      <p style="color:var(--zc-hint);font-size:13px">Nenhuma forja registrada ainda. Quando você completar uma missão, indicação ou bonus diário, cada cunhagem vai aparecer aqui com hash verificável.</p>
      <button class="btn-primary mc-btn" style="width:100%;margin-top:14px" onclick="document.getElementById('modal-origem-sulis').style.display='none'">Fechar</button>
    `;
    return;
  }

  inner.innerHTML = `
    <h3 style="display:inline-flex;align-items:center;gap:8px;margin-top:0">${VSIcons.svg("info", 20)} Origem dos seus sulis</h3>
    <p style="font-size:12px;color:var(--zc-hint);margin:4px 0 14px">${forjas.length} forja${forjas.length === 1 ? "" : "s"} registrada${forjas.length === 1 ? "" : "s"} no seu nome. Toque numa pra verificar autenticidade.</p>
    <div id="lista-forjas">
      ${forjas.map(f => `
        <div class="card-info" style="margin-bottom:8px;padding:10px;cursor:pointer" onclick="verificarMinhaForja('${f.id}')">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <div style="flex:1;min-width:0">
              <strong style="color:var(--zc-positivo);font-variant-numeric:tabular-nums">+${f.qtd_sulis} sulis</strong>
              <div style="font-size:12px;color:var(--zc-text);margin-top:2px">${escapeHtml(f.motivo)}</div>
              <div style="font-size:11px;color:var(--zc-hint);margin-top:2px">${escapeHtml(f.forjador)}</div>
              <div style="font-size:10px;color:var(--zc-hint);font-family:monospace;margin-top:4px;word-break:break-all">${f.hash.slice(0, 16)}…</div>
            </div>
            <div style="text-align:right;font-size:10px;color:var(--zc-hint);flex-shrink:0">
              ${new Date(f.criado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>
      `).join("")}
    </div>
    <button class="btn-primary mc-btn" style="width:100%;margin-top:14px" onclick="document.getElementById('modal-origem-sulis').style.display='none'">Fechar</button>
  `;
};

window.verificarMinhaForja = async function(forjaId) {
  const r = await VSWallet.verificarForja(forjaId).catch(() => null);
  const v = Array.isArray(r) ? r[0] : r;
  if (!v?.ok) { alert("Não consegui verificar essa forja."); return; }
  const status = v.autentica ? "✓ AUTÊNTICA" : "✗ ADULTERADA";
  const cor = v.autentica ? "👍" : "⚠️";
  alert(`${cor} ${status}\n\nQtd: ${v.qtd_sulis} sulis\nMotivo: ${v.motivo}\nForjador: ${v.forjador}\nQuando: ${new Date(v.criado_em).toLocaleString("pt-BR")}\n\nHash: ${v.hash_armazenado.slice(0,32)}…\nRecalculado: ${v.hash_recalculado.slice(0,32)}…`);
};

// ─────────────────────────────────────────────────────────────
// 🪙 Tokenomics — explicação clara em modal acessível da Landing
// ─────────────────────────────────────────────────────────────
window.abrirTokenomics = function() {
  let modal = document.getElementById("modal-tokenomics");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-tokenomics";
    modal.className = "modal-bg zone-comercial";
    modal.style.zIndex = "9800";
    modal.innerHTML = `<div class="modal" style="max-width:560px;width:96%;max-height:92vh;overflow-y:auto"></div>`;
    document.body.appendChild(modal);
  }
  const inner = modal.querySelector(".modal");
  inner.innerHTML = `
    <h3 style="display:inline-flex;align-items:center;gap:8px;margin-top:0">${VSIcons.svg("coins", 22)} SulCoin — ${tr("tok_guia_rapido")}</h3>
    <p style="font-size:12px;color:var(--zc-hint);margin:4px 0 14px">${tr("tok_subtitulo")}</p>

    <div style="background:var(--zc-card);border-left:3px solid var(--zc-accent);padding:10px 12px;border-radius:0 4px 4px 0;margin-bottom:12px">
      <strong>${tr("tok_taxa_fixa")}</strong>
      <div style="font-size:12px;color:var(--zc-hint);margin-top:4px">${tr("tok_taxa_desc")}</div>
    </div>

    <h4 style="color:var(--zc-accent);font-size:13px;letter-spacing:0.5px;text-transform:uppercase;margin:14px 0 6px">${tr("tok_como_ganha")}</h4>
    <ul style="margin:0;padding-left:20px;font-size:13px;line-height:1.6">
      <li>${tr("tok_ganho_bonus")}</li>
      <li>${tr("tok_ganho_caca")}</li>
      <li>${tr("tok_ganho_missoes")}</li>
      <li>${tr("tok_ganho_convite")}</li>
      <li>${tr("tok_ganho_receber")}</li>
    </ul>

    <h4 style="color:var(--zc-accent);font-size:13px;letter-spacing:0.5px;text-transform:uppercase;margin:14px 0 6px">${tr("tok_como_gasta")}</h4>
    <p style="margin:0;font-size:13px;line-height:1.5">
      No <strong>comerciante do bairro</strong> pelo app. Café, almoço, ingresso. Comerciante recebe sulis e converte em dinheiro real via Pix com nota fiscal — direitinho com a Receita.
    </p>

    <h4 style="color:var(--zc-accent);font-size:13px;letter-spacing:0.5px;text-transform:uppercase;margin:14px 0 6px">${tr("tok_garante")}</h4>
    <p style="margin:0;font-size:13px;line-height:1.5">
      <strong>A matemática.</strong> Toda vez que SulCoin é cunhado, o app gera uma <strong>assinatura única</strong> com qtd, motivo, autor, destinatário, lugar e <strong>data/hora ao milissegundo</strong>. Qualquer um pode pegar e refazer a conta — se bater, é genuína. Se não bater, é fraude. Admin não consegue criar SC "no escuro".
    </p>

    <h4 style="color:var(--zc-accent);font-size:13px;letter-spacing:0.5px;text-transform:uppercase;margin:14px 0 6px">${tr("tok_o_que_nao")}</h4>
    <ul style="margin:0;padding-left:20px;font-size:13px;line-height:1.6">
      <li>${tr("tok_nao_cripto")}</li>
      <li>${tr("tok_nao_juros")}</li>
      <li>${tr("tok_nao_circula")}</li>
    </ul>

    <h4 style="color:var(--zc-accent);font-size:13px;letter-spacing:0.5px;text-transform:uppercase;margin:14px 0 6px">${tr("tok_se_fechar")}</h4>
    <p style="margin:0;font-size:13px;line-height:1.5">
      Saldo bloqueado em compra coletiva volta automático via Pix. Saldo livre vira nota promissória sob regulamento de rede de impacto (Marco Legal Startups (LC 182/2021)).
    </p>

    <button class="btn-primary mc-btn" style="width:100%;margin-top:18px" onclick="document.getElementById('modal-tokenomics').style.display='none'">${tr("entendi")}</button>
  `;
  modal.style.display = "flex";
};

// Boot
loadPrefs();
aplicarLang(); // aplica idioma salvo/detectado NA TELA (setLang + bandeira + data-tr) — antes só setava pro futuro
// Garante sessão Supabase (anônima ou restaurada) — saldo SulCoin funcionar
VSSupabase.ensureSession?.().catch(() => {});
// Detecta Ollama local (Llama como cérebro da Litorânea)
function atualizarBadgeCerebro() {
  const b = document.getElementById("lit-cerebro-badge");
  if (!b) return;
  if (window.VSOllama?.isReady?.()) {
    b.classList.add("llama");
    b.textContent = "🧠 Llama (local)";
    b.title = "Cérebro: Llama rodando em " + (VSOllama.endpoint?.() || "");
  } else {
    b.classList.remove("llama");
    b.textContent = "☁️ Cloud (Supabase)";
    b.title = "Cérebro: Supabase RPC (sem Llama detectado)";
  }
}
window.VSOllama?.init().then(ok => {
  if (ok) vslog("Litorânea Llama conectado:", VSOllama.endpoint());
  atualizarBadgeCerebro();
}).catch(() => atualizarBadgeCerebro());

// Indicador visual de "falando" enquanto TTS roda
if ("speechSynthesis" in window) {
  const orig = window.speechSynthesis.speak.bind(window.speechSynthesis);
  window.speechSynthesis.speak = function(u) {
    const b = document.getElementById("lit-cerebro-badge");
    u.addEventListener?.("start", () => b?.classList.add("falando"));
    u.addEventListener?.("end",   () => b?.classList.remove("falando"));
    u.addEventListener?.("error", () => b?.classList.remove("falando"));
    return orig(u);
  };
}
initLanding();
// Persistência da tela inicial: se o user já tinha estado+cidade e estava
// numa tela diferente da landing, abre direto naquela tela. Senão, landing.
const telasQueExigemCidade = new Set(["city","feira","barraca","votados","promos","caca","coletiva","praias"]);
const podeRetornar = state.estado && state.cidade
  && state.ultimaTela && state.ultimaTela !== "landing"
  && document.getElementById(`screen-${state.ultimaTela}`);
// Link direto (#comercio, #wallet...) manda sobre a tela lembrada.
const telaBoot = _telaDoHash() || (podeRetornar ? state.ultimaTela : "landing");
if (telaBoot === "landing") {
  showScreen("landing");
} else if (telasQueExigemCidade.has(telaBoot)) {
  // Essas telas so fazem sentido com cidade escolhida; abrirCidade() reidrata
  // carrossel/dados e ja chama showScreen("city") internamente.
  if (state.estado && state.cidade) abrirCidade().catch(() => showScreen("landing"));
  else showScreen("landing");
} else {
  // abrirTela() monta o conteudo — showScreen() sozinho abria a tela vazia.
  try { Promise.resolve(abrirTela(telaBoot)).catch(() => showScreen("landing")); }
  catch { showScreen("landing"); }
}
aplicarI18n();
handleDeeplink();
renderFavoritos();
atualizarEstrelaCidade();
// Saudação automática da Litorânea — DESLIGADA (não fala sozinha na landing; voz será revista)
// setTimeout(() => { try { saudarLitoraneaAutomatico(); } catch {} }, 800);

// ─────────────────────────────────────────────────────────────
// 🛡️ Atalho admin na landing — substitui bandeira por escudo se user é dono
// ─────────────────────────────────────────────────────────────
let _admBtnAplicado = false;
async function atualizarBtnLangAdmin() {
  if (_admBtnAplicado) return;
  try {
    await VSSupabase.ensureSession?.();
    // ⚠️ 26/08: ANTES aqui exigia e-mail na sessao e desistia sem ele. Mas
    //    quem decide se alguem e admin e a RPC is_admin, no SERVIDOR, pelo
    //    auth.uid(). O e-mail era so um atalho — e um atalho que ESCONDIA o
    //    escudo do dono quando a sessao nao trazia e-mail (conta anonima,
    //    sessao recem-convertida, ou userEmail() indefinido). Resultado: o
    //    servidor dizia "e o dono" e a tela nao perguntava.
    //    Agora pergunta sempre. Nao afrouxa nada: o gate continua sendo a RPC.
    const eh = await _ehAdmin();
    if (!eh) return;
    // 05/08/2026 — ANTES: este bloco TROCAVA a bandeira pelo escudo e clonava o
    // botão, o que matava o handler de idioma. Resultado: o dono do app não
    // conseguia mais trocar de língua — justamente quem mais precisa conferir
    // se as traduções ficaram certas.
    // AGORA: a bandeira fica em paz. O acesso admin vai pro FAB, que é o lugar
    // combinado pra tudo (diretriz "zero botão solto").
    document.body.classList.add("admin-logado");
    window.VS_EH_ADMIN = true;
    try { window.dispatchEvent(new CustomEvent("vs:admin-detectado")); } catch (_) {}
    _admBtnAplicado = true;
    vslog("Admin shortcut aplicado");
  } catch (e) { console.warn("[Admin shortcut] falhou:", e?.message || e); }
}
function _tentaAdminBtn() {
  atualizarBtnLangAdmin();
  if (!_admBtnAplicado) setTimeout(_tentaAdminBtn, 3000);
}
setTimeout(_tentaAdminBtn, 1000);
window.addEventListener("vs:auth-changed", () => { _admBtnAplicado = false; setTimeout(atualizarBtnLangAdmin, 500); });
window.addEventListener("focus", () => atualizarBtnLangAdmin());
document.addEventListener("visibilitychange", () => { if (!document.hidden) atualizarBtnLangAdmin(); });

// ─────────────────────────────────────────────────────────────
// 👤 Botão Minha Área — aparece quando usuário está logado
// ─────────────────────────────────────────────────────────────
function _atualizarBtnMinhaArea() {
  const btn = document.getElementById("btn-minha-area");
  if (!btn) return;
  const email = VSSupabase.userEmail?.();
  btn.style.display = email ? "" : "none";
}
window.addEventListener("vs:auth-changed", () => setTimeout(_atualizarBtnMinhaArea, 400));
window.addEventListener("focus", _atualizarBtnMinhaArea);
document.addEventListener("visibilitychange", () => { if (!document.hidden) _atualizarBtnMinhaArea(); });
setTimeout(_atualizarBtnMinhaArea, 1200);

// ─────────────────────────────────────────────────────────────
// 📢 Avisos oficiais — banner na home pros moradores
// ─────────────────────────────────────────────────────────────
async function carregarAvisosOficiais() {
  try {
    const cidade = state?.cidade || localStorage.getItem("vs.cidade") || "Florianópolis";
    const estado = state?.estado || localStorage.getItem("vs.estado") || "Santa Catarina";
    const r = await fetch(`${VENTOSUL_CONFIG.SUPABASE_URL}/rest/v1/rpc/listar_avisos_cidade`, {
      method: "POST",
      headers: {
        "apikey": VENTOSUL_CONFIG.SUPABASE_ANON_JWT,
        "Authorization": "Bearer " + VENTOSUL_CONFIG.SUPABASE_ANON_JWT,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_cidade: cidade, p_estado: estado, p_limit: 3 }),
    });
    const avisos = await r.json();
    const cont = document.getElementById("avisos-banner");
    if (!cont) return;
    if (!Array.isArray(avisos) || !avisos.length) { cont.style.display = "none"; return; }
    const corPorUrg = { normal:"#10b981", importante:"#f59e0b", urgente:"#ef4444", emergencia:"#dc2626" };
    cont.innerHTML = avisos.map(a => `
      <div class="aviso-banner urg-${a.urgencia}" style="border-left:4px solid ${corPorUrg[a.urgencia]||'#10b981'};${a.urgencia==='emergencia'?'animation:pulse 1s ease-in-out infinite':''}">
        <div class="aviso-titulo"><b>📢 ${a.titulo}</b> <small style="opacity:.7">— ${a.postado_por_nome}</small></div>
        <div class="aviso-msg">${a.mensagem}</div>
        ${a.link_oficial ? `<a href="${a.link_oficial}" target="_blank" style="font-size:12px">↗ link oficial</a>` : ''}
      </div>
    `).join("");
    cont.style.display = "block";
  } catch (e) { /* silencioso */ }
}
setTimeout(carregarAvisosOficiais, 2500);
window.addEventListener("vs:cidade-mudou", () => setTimeout(carregarAvisosOficiais, 200));


// ── Deeplink ?go=<tela> (FAB/ícones de outras páginas: /?go=litoranea etc.) ──
try {
  const _go = new URLSearchParams(location.search).get("go");
  if (_go === "litoranea") { showScreen("litoranea"); mostrarSaudacaoLit(); }
  else if (_go) { try { showScreen(_go); } catch (e) {} }
} catch (e) {}

// ─────────────────────────────────────────────────────────────
// 🎬 Introdução do app — 1ª entrada: escolhe o idioma → vídeo na língua certa
// ─────────────────────────────────────────────────────────────
window.mostrarIntroApp = function(manual) {
  document.getElementById("modal-intro-app")?.remove();
  const m = document.createElement("div");
  m.id = "modal-intro-app";
  m.style.cssText = "position:fixed;inset:0;background:rgba(3,8,16,.94);display:flex;align-items:center;justify-content:center;z-index:100000;padding:16px;overflow:auto";
  const BTN_OK = { pt: "✅ Começar a usar", en: "✅ Start using", es: "✅ Empezar a usar" };
  const video = (lang) => {
    try { localStorage.setItem("vs.intro.visto", "1"); } catch (e) {}
    m.innerHTML = `<div style="max-width:430px;width:100%;text-align:center">
      <video src="/videos/intro-app-${lang}.mp4" controls autoplay playsinline style="width:100%;max-height:72vh;border-radius:14px;background:#000"></video>
      <button onclick="document.getElementById('modal-intro-app').remove()" style="margin-top:14px;width:100%;padding:13px;border:0;border-radius:12px;background:#0d723e;color:#fff;font-weight:800;font-size:1em;cursor:pointer">${BTN_OK[lang] || BTN_OK.pt}</button>
    </div>`;
  };
  if (manual) { document.body.appendChild(m); video(langCode()); return; }
  m.innerHTML = `<div style="background:#0e1620;border:1px solid #1f2937;border-radius:18px;max-width:380px;width:100%;padding:26px;text-align:center;color:#e5e7eb">
    <div style="font-size:2.2em">🌊</div>
    <h2 style="margin:6px 0 4px;font-size:19px">Bem-vindo · Welcome · Bienvenido</h2>
    <p style="font-size:13px;color:#94a3b8;margin:0 0 16px">Escolhe teu idioma · Choose your language · Elige tu idioma</p>
    <button data-l="0" style="width:100%;padding:13px;margin-bottom:8px;border:1px solid rgba(52,211,153,.5);border-radius:12px;background:rgba(52,211,153,.12);color:#e5e7eb;font-weight:700;font-size:1em;cursor:pointer">🇧🇷 Português</button>
    <button data-l="1" style="width:100%;padding:13px;margin-bottom:8px;border:1px solid rgba(59,130,246,.5);border-radius:12px;background:rgba(59,130,246,.12);color:#e5e7eb;font-weight:700;font-size:1em;cursor:pointer">🇺🇸 English</button>
    <button data-l="2" style="width:100%;padding:13px;border:1px solid rgba(251,191,36,.5);border-radius:12px;background:rgba(251,191,36,.12);color:#e5e7eb;font-weight:700;font-size:1em;cursor:pointer">🇪🇸 Español</button>
    <button id="intro-pular" style="margin-top:12px;width:100%;padding:9px;border:0;border-radius:10px;background:rgba(120,120,120,.3);color:#9ca3af;cursor:pointer;font-size:.9em">Pular · Skip · Saltar</button>
  </div>`;
  m.querySelectorAll("button[data-l]").forEach(b => b.onclick = () => {
    state.idiomaIdx = parseInt(b.dataset.l, 10);
    savePrefs();
    try { aplicarLang(); } catch (e) { try { aplicarI18n(); } catch (e2) {} }
    video(langCode());
  });
  m.querySelector("#intro-pular").onclick = () => {
    try { localStorage.setItem("vs.intro.visto", "1"); } catch (e) {}
    m.remove();
  };
  document.body.appendChild(m);
};
// 1ª entrada de verdade: espera o app assentar e apresenta
setTimeout(() => {
  try { if (!localStorage.getItem("vs.intro.visto")) mostrarIntroApp(); } catch (e) {}
}, 1800);

// ── ActionGrid Recolhível (Atalhos) ──
setTimeout(() => {
  const ag = document.querySelector('.action-grid');
  if (ag && !document.getElementById('vs-grid-toggle-bar')) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'margin:12px 16px 8px;background:rgba(15,26,48,0.7);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:10px 14px;backdrop-filter:blur(6px);';
    
    function renderGridToggle() {
      const isRec = localStorage.getItem('vs-grid-recolhido') === '1';
      ag.style.display = isRec ? 'none' : 'grid';
      wrapper.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;" id="vs-grid-toggle-bar">
          <h4 style="margin:0;font-size:0.95em;color:var(--gold,#ffd24d);display:flex;align-items:center;gap:6px;">
            <span>⚡ Atalhos (${ag.children.length})</span>
            <span style="font-size:0.8em;color:var(--dim,#91a3c2);">${isRec ? '▸' : '▾'}</span>
          </h4>
          ${isRec ? `<div style="display:flex;gap:6px;font-size:14px;" title="Atalhos rápidos">${Array.from(ag.querySelectorAll('.action-btn')).map(b => b.textContent.trim().split('\n')[0]).join(' ')}</div>` : ''}
        </div>
      `;
      wrapper.querySelector('#vs-grid-toggle-bar').onclick = () => {
        const cur = localStorage.getItem('vs-grid-recolhido') === '1';
        localStorage.setItem('vs-grid-recolhido', cur ? '0' : '1');
        renderGridToggle();
      };
    }
    ag.parentNode.insertBefore(wrapper, ag);
    renderGridToggle();
  }
}, 800);
