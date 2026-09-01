/* vs-instalar.js — botão "Instalar app" fixo no card de entrada (embaixo do Google), que se ADAPTA:
 *  • Android/Chrome → dispara o instalador nativo (beforeinstallprompt).
 *  • iPhone/iOS → abre o aviso "Adicionar à Tela de Início" (VSiOSHint).
 *  • Já instalado (TWA/standalone) → não aparece.
 * Só na landing (/, index, ir-para). */
(function (root) {
  var deferido = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferido = e; atualizarRotulo(); });
  window.addEventListener("appinstalled", function () { esconder(); });

  function isIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent || "") || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); }
  function jaInstalado() { return navigator.standalone === true || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches); }
  function naLanding() { return location.pathname === "/" || /index\.html|ir-para/.test(location.pathname); }
  function esconder() { var w = document.getElementById("install-block"); if (w) w.style.display = "none"; }

  function atualizarRotulo() {
    var b = document.getElementById("btn-install"); if (b) b.textContent = rotulo();
  }
  function rotulo() { return isIOS() ? "📲 Instalar no iPhone" : "📱 Instalar o app"; }

  async function clicar() {
    if (isIOS()) { if (root.VSiOSHint) root.VSiOSHint.abrir(); return; }
    if (deferido) {
      deferido.prompt();
      try { await deferido.userChoice; } catch (e) {}
      deferido = null;
      esconder();
      return;
    }
    // Android sem prompt (já instalado ou navegador que não suporta) — dica curta
    alert("Pra instalar: abra o menu do navegador (⋮) e toque em \"Instalar app\" ou \"Adicionar à tela inicial\".");
  }

  function montar() {
    if (!naLanding() || jaInstalado()) return;
    var wrap = document.getElementById("install-block");
    var b = document.getElementById("btn-install");
    if (!wrap || !b) return;
    b.removeAttribute("data-tr");
    b.textContent = rotulo();
    b.onclick = clicar;
    wrap.style.display = "block";
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(montar, 1500); });
  else setTimeout(montar, 1500);
})(window);
