// shared/encontro-vivo.js
// 🤝 Encontro Vivo — comerciante↔user em tempo real (cliente).
//
// API:
//   VSEncontroVivo.iniciarComoUser({ onEncontro, onErro })
//   VSEncontroVivo.iniciarComoDono({ onEncontro, onErro })
//   VSEncontroVivo.dispararPulsoDono()        // pega geo + chama edge comerciante-pulso
//   VSEncontroVivo.parar()
//   VSEncontroVivo.marcarVisto(id, lado)      // lado: 'user' | 'dono'
//
// Lazy-loads supabase-js só quando precisa de realtime.

(function (root) {
  const CFG  = root.VENTOSUL_CONFIG || {};
  const SUPA = (CFG.SUPABASE_URL || "").replace(/\/+$/, "");
  const ANON = CFG.SUPABASE_ANON_JWT || CFG.SUPABASE_ANON || "";
  const SDK_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.7/+esm";

  let _client = null;
  let _channel = null;
  let _modo = null;          // 'user' | 'dono'
  let _userId = null;
  let _onEnc = null;
  let _onErr = null;
  let _pulsoTimer = null;

  function _jwt() {
    try {
      const raw = localStorage.getItem("vs.sb.session");
      if (raw) {
        const s = JSON.parse(raw);
        if (s?.access_token) return s.access_token;
      }
    } catch {}
    return null;
  }
  function _uid() {
    try {
      const raw = localStorage.getItem("vs.sb.session");
      if (raw) {
        const s = JSON.parse(raw);
        return s?.user?.id || null;
      }
    } catch {}
    return null;
  }

  async function _carregarSdk() {
    if (root.__VS_SB_SDK) return root.__VS_SB_SDK;
    const mod = await import(SDK_URL);
    root.__VS_SB_SDK = mod;
    return mod;
  }

  async function _conectar() {
    if (_client) return _client;
    const { createClient } = await _carregarSdk();
    _client = createClient(SUPA, ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 4 } },
    });
    const tok = _jwt();
    if (tok) _client.realtime.setAuth(tok);
    return _client;
  }

  async function _assinar() {
    await _conectar();
    if (_channel) return;
    const uid = _uid();
    if (!uid) { _onErr?.("SEM_LOGIN"); return; }
    _userId = uid;

    const filtro = _modo === "dono"
      ? `dono_uuid=eq.${uid}`
      : `user_id=eq.${uid}`;

    _channel = _client
      .channel(`encontro-vivo:${_modo}:${uid}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "encontros_vivos", filter: filtro },
        (payload) => {
          try { _onEnc?.(payload.new); } catch (e) { console.warn(e); }
        })
      .subscribe();
  }

  async function iniciarComoUser({ onEncontro, onErro } = {}) {
    _modo = "user"; _onEnc = onEncontro; _onErr = onErro;
    await _assinar();
    // Backfill: pendentes que chegaram antes do realtime
    try {
      const r = await fetch(`${SUPA}/rest/v1/rpc/encontros_pendentes_user`, {
        method: "POST",
        headers: {
          "apikey": ANON, "Authorization": "Bearer " + (_jwt() || ANON),
          "Content-Type": "application/json"
        },
        body: "{}"
      });
      if (r.ok) {
        const arr = await r.json();
        if (Array.isArray(arr)) arr.forEach(e => { try { _onEnc?.(e); } catch {} });
      }
    } catch {}
  }

  async function iniciarComoDono({ onEncontro, onErro } = {}) {
    _modo = "dono"; _onEnc = onEncontro; _onErr = onErro;
    await _assinar();
    try {
      const r = await fetch(`${SUPA}/rest/v1/rpc/encontros_pendentes_dono`, {
        method: "POST",
        headers: {
          "apikey": ANON, "Authorization": "Bearer " + (_jwt() || ANON),
          "Content-Type": "application/json"
        },
        body: "{}"
      });
      if (r.ok) {
        const arr = await r.json();
        if (Array.isArray(arr)) arr.forEach(e => { try { _onEnc?.(e); } catch {} });
      }
    } catch {}
  }

  async function dispararPulsoDono() {
    const tok = _jwt();
    if (!tok) { _onErr?.("SEM_LOGIN"); return false; }
    if (!navigator.geolocation) { _onErr?.("SEM_GPS"); return false; }
    const pos = await new Promise((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 })
    ).catch(e => { _onErr?.("GPS_NEGADO"); return null; });
    if (!pos) return false;

    const r = await fetch(`${SUPA}/functions/v1/comerciante-pulso`, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + tok,
        "apikey": ANON,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      _onErr?.(txt || "PULSO_FALHOU");
      return false;
    }
    return true;
  }

  function pulsoAuto({ intervalMin = 10 } = {}) {
    if (_pulsoTimer) clearInterval(_pulsoTimer);
    dispararPulsoDono();
    _pulsoTimer = setInterval(dispararPulsoDono, intervalMin * 60 * 1000);
  }
  function pulsoAutoParar() {
    if (_pulsoTimer) { clearInterval(_pulsoTimer); _pulsoTimer = null; }
  }

  async function marcarVisto(id, lado) {
    const tok = _jwt();
    if (!tok || !id) return;
    const col = lado === "dono" ? "visto_dono" : "visto_user";
    await fetch(`${SUPA}/rest/v1/encontros_vivos?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        "apikey": ANON, "Authorization": "Bearer " + tok,
        "Content-Type": "application/json", "Prefer": "return=minimal"
      },
      body: JSON.stringify({ [col]: true })
    }).catch(() => {});
  }

  function parar() {
    pulsoAutoParar();
    try { _channel?.unsubscribe(); } catch {}
    _channel = null;
  }

  root.VSEncontroVivo = {
    iniciarComoUser, iniciarComoDono,
    dispararPulsoDono, pulsoAuto, pulsoAutoParar,
    marcarVisto, parar
  };

  // ── Auto-boot lado USER ──
  // Liga sozinho quando: tem login + opt-in DOOH ativo (vs_dooh_optin=1).
  // Mostra toast a cada novo encontro vivo via vsToast (se existir).
  function _autoBootUser() {
    try {
      if (localStorage.getItem("vs_dooh_optin") !== "1") return;
    } catch { return; }
    if (!_uid()) return;

    iniciarComoUser({
      onEncontro: (e) => {
        if (!e || _autoBootSeen.has(e.id)) return;
        _autoBootSeen.add(e.id);
        const dist = e.distancia_m;
        const txt = dist == null
          ? "Tem comércio da tua vibe ali pertinho 👀"
          : (dist < 50 ? `🟢 Comércio do app a poucos passos` :
             dist < 200 ? `🟢 Comércio do app a ${dist}m daqui` :
                          `⚪ Comércio do app na área (${dist}m)`);
        try { root.vsToast?.({ tipo: "info", titulo: "Encontro vivo", corpo: txt }); } catch {}
        try { navigator.vibrate?.([40, 30, 40]); } catch {}
        // Marca como visto no banco — toast já avisou; evita ressurgir no próximo backfill
        marcarVisto(e.id, "user");
      },
      onErro: () => {} // silencioso
    });
  }
  const _autoBootSeen = new Set();

  // Roda quando dom estiver pronto
  if (typeof document !== "undefined") {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      setTimeout(_autoBootUser, 1500);
    } else {
      document.addEventListener("DOMContentLoaded", () => setTimeout(_autoBootUser, 1500));
    }
    // Reage a mudança no opt-in DOOH (ligar/desligar dispara restart)
    window.addEventListener("storage", (e) => {
      if (e.key === "vs_dooh_optin") {
        if (e.newValue === "1") _autoBootUser();
        else parar();
      }
    });
  }
})(typeof self !== "undefined" ? self : this);
