// shared/dooh-cliente.js
// Cliente DOOH Vivo — envia geo ping leve pra edge `dooh-cliente-vivo` (Feiosão).
// Só dispara se o user tiver opt-in ativo e tiver sessão Supabase.
// Anti-bateria: 1 ping a cada 30s quando a página tá visível, pause no background.
(function () {
  const CFG = window.VENTOSUL_CONFIG || {};
  const SUPA = (CFG.SUPABASE_URL || "").replace(/\/+$/, "");
  const ANON = CFG.SUPABASE_ANON || CFG.SUPABASE_ANON_JWT;
  if (!SUPA || !ANON) return;

  const PING_MS = 30000;
  const STORAGE_KEY = "vs_dooh_optin";
  let timer = null;
  let lastSentTs = 0;

  function lerOptIn() {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
  }
  function jwt() {
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.includes("auth-token") || k.endsWith("-auth-token")) {
          const raw = localStorage.getItem(k);
          if (!raw) continue;
          const s = JSON.parse(raw);
          if (s?.access_token) return s.access_token;
          if (s?.currentSession?.access_token) return s.currentSession.access_token;
        }
      }
    } catch {}
    return null;
  }

  async function ping() {
    if (!lerOptIn()) return;
    if (Date.now() - lastSentTs < PING_MS - 2000) return;
    if (document.visibilityState === "hidden") return;
    const token = jwt();
    if (!token) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const body = {
        lat: Math.round(pos.coords.latitude * 1e4) / 1e4,   // ~11m precisão
        lng: Math.round(pos.coords.longitude * 1e4) / 1e4,
        velocidade: pos.coords.speed || 0
      };
      try {
        await fetch(`${SUPA}/functions/v1/dooh-cliente-vivo`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "apikey": ANON,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body),
          keepalive: true
        });
        lastSentTs = Date.now();
      } catch {}
    }, () => {}, { maximumAge: 20000, timeout: 8000, enableHighAccuracy: false });
  }

  function start() {
    stop();
    if (!lerOptIn()) return;
    ping();
    timer = setInterval(ping, PING_MS);
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") start();
    else stop();
  });
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) (lerOptIn() ? start : stop)();
  });

  window.VS_DOOH = {
    setOptIn(v) { try { localStorage.setItem(STORAGE_KEY, v ? "1" : "0"); } catch {} (v ? start : stop)(); },
    getOptIn() { return lerOptIn(); },
    pingNow() { lastSentTs = 0; ping(); }
  };

  if (lerOptIn()) start();
})();
