// 🌊 Vento Sul — TTS universal com voz clonada do desenvolvedor
// Cadeia: 1) XTTS Feiosão (voz do desenvolvedor) → 2) Web Speech (Chrome/FF) → 3) Pollinations (server-side)
// Mantém API pública: VSFalar.falar / criarBotao / parar
// Bumpado 2026-05-07: agora prioriza XTTS clonado do XTTS-v2 server :8765 via Tailscale

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VSFalar = factory();
})(typeof self !== "undefined" ? self : this, function () {

  const XTTS_URL = "https://ventosul-feiosao.tailb37c3d.ts.net/tts/falar";
  const XTTS_TIMEOUT = 25000;
  const MUTE_KEY = "vs.muted";

  let _audioAtual = null;
  let _ssvUtterance = null;

  function pararFala() {
    try { window.speechSynthesis?.cancel(); } catch {}
    if (_audioAtual) {
      try { _audioAtual.pause(); _audioAtual.src = ""; } catch {}
      _audioAtual = null;
    }
  }

  // 1) XTTS Feiosão — voz clonada (Tailscale-only, mas PC do desenvolvedor + outros nós da malha pegam)
  async function viaXTTS(texto, opts = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs || XTTS_TIMEOUT);
    let r;
    try {
      r = await fetch(XTTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: texto.slice(0, 1500), lang: opts.lang || "pt" }),
        signal: ctrl.signal,
      });
    } finally { clearTimeout(timer); }
    if (!r.ok) throw new Error("xtts " + r.status);
    const blob = await r.blob();
    return new Promise((resolve, reject) => {
      pararFala();
      const audio = new Audio(URL.createObjectURL(blob));
      _audioAtual = audio;
      audio.onended = () => resolve();
      audio.onerror = (e) => reject(new Error("audio play falhou"));
      audio.play().catch(reject);
    });
  }

  // 2) Web Speech API — fallback navegador (voz robotizada)
  async function viaWebSpeech(texto) {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        return reject(new Error("sem web speech"));
      }
      let vozes = speechSynthesis.getVoices();
      const tentar = () => {
        vozes = speechSynthesis.getVoices();
        const ptbr = vozes.find(v => v.lang?.startsWith("pt")) || vozes[0];
        if (!ptbr) return reject(new Error("sem voz pt-BR"));
        const u = new SpeechSynthesisUtterance(texto);
        u.lang = "pt-BR"; u.rate = 1.0; u.pitch = 1.0; u.voice = ptbr;
        u.onend = () => resolve();
        u.onerror = (e) => reject(e);
        _ssvUtterance = u;
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
        setTimeout(() => {
          if (!speechSynthesis.speaking && !speechSynthesis.pending) {
            reject(new Error("brave bloqueou speech"));
          }
        }, 800);
      };
      if (vozes.length > 0) tentar();
      else {
        speechSynthesis.onvoiceschanged = tentar;
        setTimeout(() => speechSynthesis.getVoices().length > 0 && tentar(), 300);
      }
    });
  }

  // 3) Pollinations — último fallback server-side
  // Voz fluida PÚBLICA via edge radio-tts (Google TTS pt-BR, mesma da rádio).
  // Sólida e sem Tailscale → TODOS os usuários pegam voz fluida (não robótica).
  async function viaRadioTTS(texto) {
    const cfg = (typeof window !== "undefined" && window.VENTOSUL_CONFIG) || {};
    const base = cfg.SUPABASE_URL || "https://vdrzndgkwdpibexjkyxi.supabase.co";
    const anon = cfg.SUPABASE_ANON_JWT || cfg.SUPABASE_ANON || "";
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    let r;
    try {
      r = await fetch(`${base}/functions/v1/radio-tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": anon, "Authorization": "Bearer " + anon },
        body: JSON.stringify({ texto: texto.slice(0, 1500) }),
        signal: ctrl.signal,
      });
    } finally { clearTimeout(timer); }
    if (!r.ok) throw new Error("radio-tts " + r.status);
    const blob = await r.blob();
    return new Promise((resolve, reject) => {
      pararFala();
      const audio = new Audio(URL.createObjectURL(blob));
      _audioAtual = audio;
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error("audio play falhou"));
      audio.play().catch(reject);
    });
  }

  // API pública: voz fluida radio-tts (público) → XTTS (voz do dev, Tailscale) → Web Speech (robótico)
  async function falar(texto, opts = {}) {
    if (!texto || !texto.trim()) return;
    pararFala();
    if (opts.forceWeb) return viaWebSpeech(texto);
    // Dev quer a própria voz clonada? força XTTS primeiro
    if (opts.forceDev) { try { await viaXTTS(texto, opts); return "xtts"; } catch (e) {} }

    // 1ª: radio-tts — voz fluida pública (Google TTS pt-BR), sólida pra TODOS
    try { await viaRadioTTS(texto); return "radio-tts"; }
    catch (e) { console.debug("[VSFalar] radio-tts falhou:", e.message); }

    // 2ª: XTTS Feiosão (voz clonada do dev, só na malha Tailscale) — timeout curto pra não travar
    try { await viaXTTS(texto, { ...opts, timeoutMs: 4000 }); return "xtts"; }
    catch (e) { console.debug("[VSFalar] XTTS falhou:", e.message); }

    // 3ª: Web Speech (robótico) — último recurso
    try { await viaWebSpeech(texto); return "web"; }
    catch (e) { console.error("[VSFalar] tudo falhou:", e.message); }
  }

  // CSS botão pulsante
  function _injetarCSS() {
    if (document.getElementById("vs-falar-css")) return;
    const s = document.createElement("style");
    s.id = "vs-falar-css";
    s.textContent = `
      @keyframes vs-mic-pulse {
        0%   { transform: scale(1);    box-shadow: 0 0 0 0 rgba(252,211,77,0.55); opacity: 0.65; }
        50%  { transform: scale(1.10); box-shadow: 0 0 0 7px rgba(252,211,77,0);  opacity: 1;    }
        100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(252,211,77,0);    opacity: 0.65; }
      }
      .vs-falar-btn {
        background: transparent; color: #fcd34d;
        border: 1px solid rgba(252,211,77,0.45);
        border-radius: 50%; width: 28px; height: 28px; padding: 0;
        font-size: 13px; cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center;
        vertical-align: middle;
        animation: vs-mic-pulse 2.4s ease-in-out infinite;
        margin: 0 4px;
      }
      .vs-falar-btn:hover { background: rgba(252,211,77,0.18); }
      .vs-falar-btn.falando {
        animation: none;
        background: rgba(239,68,68,0.18); color: #ef4444;
        border-color: rgba(239,68,68,0.6);
      }
    `;
    document.head.appendChild(s);
  }

  function _muted() { return localStorage.getItem(MUTE_KEY) === "1"; }

  function criarBotao(texto, opts = {}) {
    _injetarCSS();
    const btn = document.createElement("button");
    btn.className = "vs-falar-btn";
    btn.title = opts.titulo || "Escutar (voz do desenvolvedor)";
    btn.setAttribute("aria-label", btn.title);
    btn.textContent = "🔊";
    let falando = false;
    btn.onclick = async () => {
      if (falando) { pararFala(); falando = false; btn.classList.remove("falando"); btn.textContent = "🔊"; return; }
      if (_muted()) { btn.title = "Mute ligado"; return; }
      falando = true;
      btn.classList.add("falando");
      btn.textContent = "⏹️";
      try { await falar(texto, opts); } finally {
        falando = false; btn.classList.remove("falando"); btn.textContent = "🔊";
      }
    };
    return btn;
  }

  return { falar, parar: pararFala, criarBotao, _xttsURL: XTTS_URL };
});
