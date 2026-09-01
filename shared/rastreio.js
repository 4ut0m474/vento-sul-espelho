// rastreio.js — rastreio leve de comportamento do usuário no app
// Registra page views + cliques em categorias → user_eventos (Supabase, RLS)
// Uso: incluir na página. Auto-inicia. Não depende de nenhuma lib.

(function () {
  const SUPA = (window.VENTOSUL_CONFIG || {}).SUPABASE_URL || "https://vdrzndgkwdpibexjkyxi.supabase.co";
  const JWT_ANON = (window.VENTOSUL_CONFIG || {}).SUPABASE_ANON_JWT || "";
  const DEBOUNCE_MS = 300000; // 5 min mínimo entre eventos iguais na mesma página

  // Categoria inferida pela URL
  const CAT_MAP = {
    "radio": "radio", "comerciante": "comerciante", "comercio": "comerciante",
    "aurora": "jogo", "missao": "missao", "quest": "missao",
    "carteira": "sulcoin", "economia": "sulcoin", "sulcoin": "sulcoin",
    "feira": "feira", "barrac": "feira",
    "perto": "social", "encontro": "social", "perfil": "social",
    "rosinha": "gps", "bussola": "gps", "mapa": "gps",
    "noticias": "noticias", "jornal": "noticias",
  };

  function inferCat(url) {
    const p = url.toLowerCase();
    for (const [k, v] of Object.entries(CAT_MAP)) { if (p.includes(k)) return v; }
    return "geral";
  }

  function getPagina() {
    return location.pathname.replace(/^\//, "").replace(".html", "") || "home";
  }

  function dedupeKey(acao, pagina) {
    return `vs_evt_${acao}_${pagina}`;
  }

  async function getJwt() {
    try {
      const raw = localStorage.getItem("sb-" + SUPA.split("//")[1].split(".")[0] + "-auth-token")
        || localStorage.getItem("supabase.auth.token");
      if (!raw) return JWT_ANON;
      const s = JSON.parse(raw);
      return s?.access_token || JWT_ANON;
    } catch { return JWT_ANON; }
  }

  async function send(acao, categoria, meta = {}) {
    const pagina = getPagina();
    const key = dedupeKey(acao, pagina);
    const last = parseInt(localStorage.getItem(key) || "0");
    if (Date.now() - last < DEBOUNCE_MS) return;
    localStorage.setItem(key, Date.now());

    const jwt = await getJwt();
    if (jwt === JWT_ANON) return; // só rastreia usuários logados

    fetch(SUPA + "/rest/v1/user_eventos", {
      method: "POST",
      headers: {
        "apikey": JWT_ANON,
        "Authorization": "Bearer " + jwt,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({ pagina, acao, categoria, meta })
    }).catch(() => {});
  }

  // ── Track tempo na página (em saída) ──────────────────────────
  const _inicio = Date.now();
  window.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      const s = Math.round((Date.now() - _inicio) / 1000);
      if (s > 5) send("tempo", inferCat(location.href), { segundos: s });
    }
  });

  // ── Track cliques em elementos marcados ──────────────────────
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-track]");
    if (!el) return;
    const acao = el.dataset.track;
    const cat = el.dataset.cat || inferCat(el.href || el.dataset.href || location.href);
    send("click", cat, { elemento: acao });
  }, true);

  // ── Page visit (ao carregar) ──────────────────────────────────
  function trackVisit() {
    const cat = inferCat(location.href);
    send("visit", cat, { ref: document.referrer ? new URL(document.referrer).pathname : "" });
  }

  // Aguarda DOM + config estarem prontos
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(trackVisit, 1500));
  } else {
    setTimeout(trackVisit, 1500);
  }

  // API pública
  window.VSRastreio = {
    track: send,
    trackClique: (acao, cat, meta) => send("click", cat || inferCat(location.href), { elemento: acao, ...meta }),
  };
})();
