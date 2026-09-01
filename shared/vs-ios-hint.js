/* vs-ios-hint.js — aviso amigável pro iPhone (iOS).
 * Detecta iOS (e que NÃO está já instalado na tela) → mostra como "instalar"
 * (Compartilhar → Adicionar à Tela de Início) SEM travar: fecha e segue no Safari.
 * Também expõe VSiOSHint.abrir() pra chamar do FAB. Mostra 1x por dia.
 */
(function (root) {
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent || "") ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }
  function jaInstalado() {
    return navigator.standalone === true || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
  }
  function abrir(forcar) {
    if (document.getElementById("vs-ios-hint")) return;
    var m = document.createElement("div");
    m.id = "vs-ios-hint";
    m.style.cssText = "position:fixed;left:12px;right:12px;bottom:74px;z-index:100020;background:rgba(8,15,30,.98);border:1px solid rgba(103,232,249,.5);border-radius:16px;padding:16px 16px 14px;box-shadow:0 12px 40px rgba(0,0,0,.6);color:#e8edf5;font:14px/1.5 system-ui;max-width:460px;margin:0 auto;animation:iosHintUp .3s ease";
    m.innerHTML =
      '<div style="font:800 15px system-ui;color:#67e8f9;margin-bottom:6px">📲 No iPhone? Instala o Vento Sul!</div>' +
      '<div style="color:#cbd5e1">Toque no botão <b>Compartilhar</b> <span style="display:inline-block;border:1px solid #67e8f9;border-radius:5px;padding:0 5px;color:#67e8f9">⬆️</span> aqui embaixo no Safari, e escolha <b>"Adicionar à Tela de Início"</b>. Vira um app na sua tela! 🌊</div>' +
      '<div style="color:#9fb0c4;font-size:12px;margin-top:6px">Pode usar tudo aqui no Safari mesmo sem instalar.</div>' +
      '<button id="vs-ios-ok" style="margin-top:12px;width:100%;padding:12px;border:0;border-radius:10px;background:linear-gradient(135deg,#a5f3fc,#7c3aed);color:#04121f;font-weight:800;cursor:pointer">Entendi, continuar 🌊</button>' +
      '<style>@keyframes iosHintUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}</style>';
    document.body.appendChild(m);
    document.getElementById("vs-ios-ok").onclick = function () {
      try { localStorage.setItem("vs-ios-hint-dia", new Date().toDateString()); } catch (e) {}
      m.remove();
    };
  }
  root.VSiOSHint = { abrir: function () { abrir(true); }, isIOS: isIOS };

  function auto() {
    if (!isIOS() || jaInstalado()) return;
    var hoje = new Date().toDateString();
    try { if (localStorage.getItem("vs-ios-hint-dia") === hoje) return; } catch (e) {}
    setTimeout(function () { abrir(false); }, 2500);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", auto);
  else auto();
})(window);
