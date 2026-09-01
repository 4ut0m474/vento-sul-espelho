// vs-contato-footer.js — Rodapé de CONTATO no fim do CONTEÚDO de cada página
// (diferente do vs-page-footer.js, que é a barra fixa de navegação embaixo)
// Uso: <script src="/shared/vs-contato-footer.js" defer></script>
(function () {
  if (document.getElementById("vs-contato-footer")) return;

  var s = document.createElement("style");
  s.id = "vs-cf-style";
  s.textContent =
    "#vs-contato-footer{margin:36px 10px 0;padding:20px 16px 18px;text-align:center;" +
    "background:rgba(12,20,30,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);" +
    "border:1px solid rgba(255,255,255,.10);border-radius:14px 14px 0 0;" +
    "font:600 13px system-ui,sans-serif;color:#cfdcea}" +
    "body.tema-claro #vs-contato-footer{background:rgba(255,255,255,.72);border-color:rgba(0,0,0,.10);color:#41505f}" +
    "#vs-contato-footer .cf-tit{font-weight:800;font-size:15px;color:#e8edf5;margin-bottom:12px}" +
    "body.tema-claro #vs-contato-footer .cf-tit{color:#14202b}" +
    "#vs-contato-footer .cf-row{display:flex;flex-wrap:wrap;gap:8px 14px;justify-content:center;margin-bottom:10px}" +
    "#vs-contato-footer a{text-decoration:none;color:#67e8f9;white-space:nowrap}" +
    "#vs-contato-footer a.cf-wa{color:#25d366}" +
    "#vs-contato-footer .cf-sub{margin-top:10px;font-size:11px;color:#8fa2b6}" +
    "body.tema-claro #vs-contato-footer .cf-sub{color:#5b6b7a}" +
    "#vs-contato-footer .cf-prog{margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.10)}" +
    "body.tema-claro #vs-contato-footer .cf-prog{border-top-color:rgba(0,0,0,.10)}" +
    "#vs-contato-footer a.cf-aprenda{display:inline-block;padding:9px 18px;border-radius:999px;" +
    "background:linear-gradient(135deg,#1b6ea8,#0f4f7a);color:#eaf6ff;font-weight:800;font-size:13px;" +
    "border:1px solid rgba(103,232,249,.35);white-space:normal}" +
    "#vs-contato-footer a.cf-aprenda:hover{background:linear-gradient(135deg,#2384c4,#13618f)}" +
    "#vs-contato-footer .cf-gratis{color:#3ddc97}";
  document.head.appendChild(s);

  function montar() {
    if (document.getElementById("vs-contato-footer")) return;
    var f = document.createElement("footer");
    f.id = "vs-contato-footer";
    f.innerHTML =
      '<div class="cf-tit">🌊 Vento Sul</div>' +
      '<div class="cf-row">' +
        '<a class="cf-wa" href="https://wa.me/5548992467821?text=ajuda" target="_blank" rel="noopener">💬 (48) 99246-7821</a>' +
        '<a href="tel:+5548992467821">📞 (48) 99246-7821</a>' +
        '<a href="mailto:contato@vento-sul.tech">✉️ contato@vento-sul.tech</a>' +
      "</div>" +
      '<div class="cf-row">' +
        '<a href="https://www.youtube.com/@vento-sul_tech" target="_blank" rel="noopener">▶️ YouTube</a>' +
        '<a href="https://instagram.com/oraculodesilicio" target="_blank" rel="noopener">📷 Instagram</a>' +
      "</div>" +
      '<div class="cf-sub">vento-sul.tech · Florianópolis, SC</div>' +
      '<div class="cf-prog">' +
        '<a class="cf-aprenda" href="https://claude.ai/referral/t2cqGlwxdQ?s=cowork&amp;v=apps" target="_blank" rel="noopener">' +
          'aprenda a ser um programador <span class="cf-gratis">(grátis)</span>' +
        '</a>' +
      '</div>';
    document.body.appendChild(f);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar);
  else montar();
})();
