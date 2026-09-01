/* vs-assinar-pix.js — botão "Assinar com Pix" nas telas do comerciante.
 * Canto inferior ESQUERDO (o FAB unificado mora à direita). Some na própria página de planos. */
(function () {
  if (/comerciante-planos/.test(location.pathname)) return;
  function montar() {
    if (document.getElementById("vs-assinar-pix")) return;
    const w = document.createElement("div");
    w.id = "vs-assinar-pix";
    w.style.cssText = "position:fixed;left:14px;bottom:16px;z-index:99940;display:flex;gap:8px;align-items:center";
    const a = document.createElement("a");
    a.href = "/comerciante-planos.html";
    a.textContent = "💠 Assinar com Pix";
    a.style.cssText = "padding:12px 18px;border-radius:999px;background:linear-gradient(135deg,#0d723e,#059669);color:#fff;font:700 14px system-ui;text-decoration:none;box-shadow:0 8px 24px rgba(5,150,105,.45);border:1px solid rgba(255,255,255,.25)";
    w.appendChild(a);
    const falar = document.createElement("button");
    falar.type = "button"; falar.textContent = "🔊";
    falar.title = "Me explica como funciona";
    falar.style.cssText = "width:42px;height:42px;border-radius:50%;border:1px solid rgba(59,130,246,.5);background:rgba(8,15,30,.9);color:#93c5fd;font-size:17px;cursor:pointer";
    falar.onclick = () => window.VSExplica && VSExplica.tocar("assinar-pix",
      "Assinar com Pix é simples e rápido. Você escolhe um plano, aparece um código Pix na tela. Abre o aplicativo do seu banco, escolhe Pix copia e cola, cola o código e confirma. Quando o pagamento cai, o seu plano liga sozinho, na hora, sem precisar falar com ninguém. E se quiser, você ainda pode mandar a foto do comprovante pelo próprio aplicativo, que a gente confere e guarda com segurança pra você.");
    w.appendChild(falar);
    document.body.appendChild(w);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar);
  else montar();
})();
