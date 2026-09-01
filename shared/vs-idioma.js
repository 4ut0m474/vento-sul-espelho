// vs-idioma.js — idioma PT/EN/ES em páginas internas (fora do SPA).
// Como usar na página:
//   1. Anota os elementos: data-tr="chave" (textContent) ou data-tr-html="chave" (innerHTML).
//   2. Define window.VS_PAGE_STRINGS = { en:{chave:"..."}, es:{chave:"..."} } ANTES deste script.
//      (PT não precisa de dicionário: o texto original da página É o PT — guardado no 1º apply.)
//   3. <script src="/shared/vs-idioma.js" defer></script>
// O idioma escolhido é o MESMO do app (ventosul_pwa_v1.idiomaIdx) — trocar aqui troca lá
// e vice-versa. Troca também a estação da rádio (evento vs:idioma, o radio-fab escuta).
(function () {
  var LANGS = ["pt", "en", "es"];
  var FLAGS = { pt: "🇧🇷", en: "🇺🇸", es: "🇪🇸" };
  var PREFS_KEY = "ventosul_pwa_v1";

  function getLang() {
    try {
      var p = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      return LANGS[p.idiomaIdx] || "pt";
    } catch (e) { return "pt"; }
  }
  function saveLang(lang) {
    try {
      var p = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      p.idiomaIdx = Math.max(0, LANGS.indexOf(lang));
      localStorage.setItem(PREFS_KEY, JSON.stringify(p));
    } catch (e) {}
    // 19/08/2026 -- era "vida-boa", que deixou de existir quando as estacoes
    // foram unificadas em 9. Ficava gravando uma estacao inexistente.
    try { localStorage.setItem("vs.radio.estacao", ({ pt: "floripa", en: "ingles", es: "espanhol" })[lang]); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("vs:idioma", { detail: { lang: lang } })); } catch (e) {}
  }

  function aplicar(lang) {
    var dict = (window.VS_PAGE_STRINGS || {})[lang] || {};
    document.querySelectorAll("[data-tr]").forEach(function (el) {
      var k = el.getAttribute("data-tr");
      if (el.dataset.trOrig === undefined) el.dataset.trOrig = el.textContent;
      el.textContent = (lang === "pt") ? el.dataset.trOrig : (dict[k] || el.dataset.trOrig);
    });
    document.querySelectorAll("[data-tr-html]").forEach(function (el) {
      var k = el.getAttribute("data-tr-html");
      if (el.dataset.trOrigHtml === undefined) el.dataset.trOrigHtml = el.innerHTML;
      el.innerHTML = (lang === "pt") ? el.dataset.trOrigHtml : (dict[k] || el.dataset.trOrigHtml);
    });
    document.documentElement.lang = { pt: "pt-BR", en: "en-US", es: "es-ES" }[lang];
    var btn = document.getElementById("vs-idioma-btn");
    if (btn) btn.textContent = FLAGS[lang];
  }

  function trocar() {
    var atual = getLang();
    var prox = LANGS[(LANGS.indexOf(atual) + 1) % LANGS.length];
    saveLang(prox);
    aplicar(prox);
  }

  // 06/08/2026 — A BANDEIRA SAIU DAS PÁGINAS INTERNAS.
  // Cada página interna já mostra o NOME dela no cabeçalho ("Carteira", "Mais
  // Votados") e a bandeira brigava com esse título no espaço apertado do topo.
  // Escolher idioma agora é só na landing (#btn-lang); aqui a página apenas
  // OBEDECE o idioma já escolhido — a preferência é a mesma (ventosul_pwa_v1
  // .idiomaIdx), então trocar na landing troca aqui e em todas as outras.
  // Se um dia precisar da bandeira de volta em alguma página interna, chame
  // VSIdioma.botao() manualmente.
  function botao(forcar) {
    if (!forcar) return;
    if (document.getElementById("vs-idioma-btn")) return;
    var b = document.createElement("button");
    b.id = "vs-idioma-btn";
    b.type = "button";
    b.title = "Idioma / Language / Idioma";
    b.textContent = FLAGS[getLang()];
    b.addEventListener("click", function (ev) {
      trocar.call(this, ev);
      // liga a radio no MESMO clique -- e o gesto que o navegador exige.
      // Nao liga pra quem desligou de proposito.
      try {
        if (localStorage.getItem("vs.radio.on") !== "0" &&
            window.VSRadio && typeof VSRadio.tocar === "function" &&
            !(VSRadio.tocando && VSRadio.tocando())) {
          VSRadio.tocar();
        }
      } catch (e) {}
    });
    var header = document.querySelector("#vs-ph .header-right");
    if (header) {
      b.className = "hbtn";
      header.insertBefore(b, header.firstChild);
    } else {
      b.style.cssText = "position:fixed;top:calc(10px + env(safe-area-inset-top,0px));right:10px;z-index:10001;" +
        "width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.25);" +
        "background:rgba(10,20,30,.55);backdrop-filter:blur(8px);font-size:17px;cursor:pointer;padding:0";
      document.body.appendChild(b);
    }
  }

  function init() {
    // espera o vs-page-header injetar (ele roda em defer também)
    setTimeout(function () { aplicar(getLang()); }, 150);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.VSIdioma = { get: getLang, set: function (l) { if (LANGS.indexOf(l) >= 0) { saveLang(l); aplicar(l); } },
                      aplicar: aplicar, botao: function () { botao(true); } };
})();
