// Firebase — Analytics + FCM (Firebase Cloud Messaging)
// Depende dos scripts CDN carregados antes no index.html
// Projeto: sulista-2d200

(function () {
  const _CONFIG = {
    apiKey: "AIzaSyBEd0Z7pkx8-9BktDvVVcQ8J0058z2KGBc",
    authDomain: "sulista-2d200.firebaseapp.com",
    projectId: "sulista-2d200",
    storageBucket: "sulista-2d200.firebasestorage.app",
    messagingSenderId: "918872843382",
    appId: "1:918872843382:web:87d0fdf0de3e095f7e6b57",
    measurementId: "G-TC85QR90GV"
  };

  // Chave pública VAPID gerada no Firebase Console → Cloud Messaging
  const _VAPID = "BGiObWUhXp9OP_b5MJTWSHeBwNXdGp3VcAcCcsPGrWutBTTdshAwvUyIXIv3PL3C5sd3XRNXIp5aPmxaoEv8enY";

  let _app, _analytics, _messaging, _ready = false;

  function _init() {
    if (_ready) return true;
    if (typeof firebase === "undefined") return false;
    try {
      // Firebase pode já ter sido inicializado (evita duplicate-app)
      _app = firebase.apps?.length ? firebase.app() : firebase.initializeApp(_CONFIG);
      _analytics = firebase.analytics(_app);
      _messaging = firebase.messaging(_app);
      _ready = true;
      return true;
    } catch (e) {
      console.warn("[Firebase] init:", e.message);
      return false;
    }
  }

  // ── Analytics ──────────────────────────────────────────────────
  window.fbLogEvent = function (name, params) {
    try {
      if (_init()) _analytics.logEvent(name, params || {});
    } catch {}
  };

  // Limpa QUALQUER inscrição push antiga (qualquer SW, qualquer chave) —
  // senão o navegador recusa a nova com "different applicationServerKey already exists".
  async function _limparInscricoesAntigas() {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) {
        const s = await r.pushManager.getSubscription();
        if (s) await s.unsubscribe();
      }
    } catch {}
    try { if (_messaging) await _messaging.deleteToken(); } catch {}
  }

  // ── FCM — pega token e salva no Supabase ───────────────────────
  window.fbGetToken = async function () {
    if (!_init()) return null;
    // Registra o SW do Firebase explicitamente para não conflitar com sw.js
    const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    // PROATIVO: limpa inscrições velhas ANTES de pedir o token (evita o conflito de chave)
    await _limparInscricoesAntigas();
    try {
      return await _messaging.getToken({ vapidKey: _VAPID, serviceWorkerRegistration: swReg });
    } catch (e) {
      // Se ainda assim conflitar, limpa de novo e tenta 1x
      if (/different|applicationServerKey|gcm_sender|already exist/i.test(e.message || "")) {
        try {
          await _limparInscricoesAntigas();
          return await _messaging.getToken({ vapidKey: _VAPID, serviceWorkerRegistration: swReg });
        } catch (e2) {
          console.warn("[Firebase FCM] getToken retry:", e2.message);
          return null;
        }
      }
      console.warn("[Firebase FCM] getToken:", e.message);
      return null;
    }
  };

  // ── FCM — notificações em foreground (app aberto) ──────────────
  window.fbOnMessage = function (callback) {
    if (!_init()) return;
    _messaging.onMessage(payload => {
      const data   = payload.data || {};
      const notif  = payload.notification || {};
      callback({
        titulo: data.titulo || notif.title || "Vento Sul",
        corpo:  data.corpo  || notif.body  || "",
        url:    data.url    || "/",
        icon:   data.icon   || "/icons/icon-192.png"
      });
    });
  };

  // Inicia assim que o DOM estiver pronto
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _init);
  } else {
    _init();
  }
})();
