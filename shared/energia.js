// shared/energia.js — economia de bateria + dados.
// Centraliza geoloc (cache 2 min), pausa intervalos com tab oculto,
// detecta conexão lenta pra não puxar dados pesados.
window.VSEnergy = (() => {
  const TTL_GEO = 120000; // 2 min
  let _coords = null;
  let _coordsAt = 0;
  let _inflight = null;

  // Detecta conexão lenta/data saver
  const conexao = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  function modoEconomia() {
    if (!conexao) return false;
    return conexao.saveData === true || /^(slow-2g|2g)$/.test(conexao.effectiveType || "");
  }

  // Retorna coords do cache se < maxAge, senão pede nova leitura
  // opts: { maxAge?: ms, force?: bool, timeout?: ms }
  async function coords({ maxAge = TTL_GEO, force = false, timeout = 8000 } = {}) {
    if (!force && _coords && (Date.now() - _coordsAt) < maxAge) {
      return _coords;
    }
    if (_inflight) return _inflight;
    _inflight = new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("GPS indisponível"));
      navigator.geolocation.getCurrentPosition(
        p => {
          _coords = { latitude: p.coords.latitude, longitude: p.coords.longitude,
                      accuracy: p.coords.accuracy };
          _coordsAt = Date.now();
          _inflight = null;
          resolve(_coords);
        },
        e => { _inflight = null; reject(e); },
        { timeout, enableHighAccuracy: false, maximumAge: maxAge }
      );
    });
    return _inflight;
  }

  function lastCoords() { return _coords ? { ..._coords, idadeMs: Date.now() - _coordsAt } : null; }
  function limparCache() { _coords = null; _coordsAt = 0; }

  // ─── Page Visibility: pausa intervalos quando tab/app oculto ─────────
  const _intervalos = new Set();
  function intervalo(fn, ms, opts = {}) {
    let id = null;
    const wrap = () => { if (document.visibilityState === "visible") fn(); };
    const start = () => { if (id == null) id = setInterval(wrap, ms); };
    const stop  = () => { if (id != null) { clearInterval(id); id = null; } };
    if (document.visibilityState === "visible" || opts.alwaysOn) start();
    _intervalos.add({ start, stop });
    return { stop, start };
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") _intervalos.forEach(i => i.start());
    else _intervalos.forEach(i => i.stop());
  });

  // ─── Botão "↻ Atualizar" reutilizável ────────────────────────────────
  function botaoRefresh(handler, label = "↻") {
    const b = document.createElement("button");
    b.type = "button";
    b.style.cssText = "background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.22);color:#fff;border-radius:50%;width:34px;height:34px;font-size:16px;cursor:pointer;transition:transform .25s";
    b.textContent = label;
    b.title = "Atualizar agora";
    b.onclick = async () => {
      b.style.transform = "rotate(360deg)";
      try { await handler(); } finally { setTimeout(() => b.style.transform = "rotate(0)", 350); }
    };
    return b;
  }

  return { coords, lastCoords, limparCache, intervalo, modoEconomia, botaoRefresh, TTL_GEO };
})();
