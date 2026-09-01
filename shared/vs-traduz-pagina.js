/* vs-traduz-pagina.js — traduz a PÁGINA INTEIRA pra inglês e espanhol.
 *
 * 04/08/2026. O problema que isto resolve: o app tinha o dicionário
 * (shared/i18n.js, ~745 frases em 3 línguas) mas SÓ o index.html usava. Nas outras
 * 100+ páginas trocar a bandeira não mudava quase nada — e na maioria nem existia
 * botão de idioma. O jeito antigo (vs-idioma.js) exigia marcar cada elemento com
 * data-tr e escrever um dicionário por página: nunca ia acontecer em 100 páginas.
 *
 * Aqui é o contrário: o dicionário é um só, por FRASE INTEIRA em português, e o
 * motor varre o texto da tela e troca o que reconhece. Página nova entra traduzida
 * sem ninguém marcar nada.
 *
 * Só troca quando bate a frase inteira (depois de tirar espaços sobrando). Nunca
 * chuta, nunca traduz pela metade: o que não estiver no dicionário fica em português,
 * que é melhor do que sair errado.
 *
 * O dicionário vem de /data/traducoes-en.json e /data/traducoes-es.json, baixado
 * só quando a pessoa escolhe outra língua — quem fica no português não baixa nada.
 */
(function (root) {
  if (root.VSTraduz) return;

  var LANGS = ['pt', 'en', 'es'];
  var PREFS = 'ventosul_pwa_v1';
  var dicionarios = {};      // { en: {pt: traduzido}, es: {...} }
  var baixando = {};
  var observador = null;
  var langAtual = 'pt';

  // atributos que a pessoa lê na tela
  var ATRIBUTOS = ['placeholder', 'title', 'alt', 'aria-label'];

  // nunca mexer aqui dentro
  var PROIBIDO = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, CODE: 1, PRE: 1, TEXTAREA: 1, SVG: 1 };

  function idioma() {
    try {
      var p = JSON.parse(localStorage.getItem(PREFS) || '{}');
      return LANGS[p.idiomaIdx] || 'pt';
    } catch (e) { return 'pt'; }
  }

  function baixar(lang) {
    if (lang === 'pt') return Promise.resolve({});
    if (dicionarios[lang]) return Promise.resolve(dicionarios[lang]);
    if (baixando[lang]) return baixando[lang];
    baixando[lang] = fetch('/data/traducoes-' + lang + '.json', { cache: 'default' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (d) { dicionarios[lang] = d || {}; return dicionarios[lang]; })
      .catch(function () { dicionarios[lang] = {}; return dicionarios[lang]; });
    return baixando[lang];
  }

  function podeMexer(no) {
    var p = no.parentElement;
    while (p) {
      if (PROIBIDO[p.tagName]) return false;
      if (p.hasAttribute && p.hasAttribute('data-nao-traduzir')) return false;
      p = p.parentElement;
    }
    return true;
  }

  // guarda o português de origem uma vez só, pra poder voltar
  function original(no) {
    if (no.__vsPt === undefined) no.__vsPt = no.nodeValue;
    return no.__vsPt;
  }

  function trocaTexto(no, dic) {
    if (!podeMexer(no)) return;
    var pt = original(no);
    if (!pt) return;
    var limpo = pt.replace(/\s+/g, ' ').trim();
    if (limpo.length < 2) return;
    if (langAtual === 'pt') { if (no.nodeValue !== pt) no.nodeValue = pt; return; }
    var t = dic[limpo];
    if (!t) { if (no.nodeValue !== pt) no.nodeValue = pt; return; }
    // mantém o espaçamento das pontas (indentação do HTML)
    var antes = pt.match(/^\s*/)[0], depois = pt.match(/\s*$/)[0];
    var novo = antes + t + depois;
    if (no.nodeValue !== novo) no.nodeValue = novo;
  }

  function trocaAtributos(el, dic) {
    for (var i = 0; i < ATRIBUTOS.length; i++) {
      var a = ATRIBUTOS[i];
      if (!el.hasAttribute(a)) continue;
      var guarda = '__vsPt_' + a;
      if (el[guarda] === undefined) el[guarda] = el.getAttribute(a);
      var pt = el[guarda];
      if (!pt) continue;
      if (langAtual === 'pt') { el.setAttribute(a, pt); continue; }
      var t = dic[pt.replace(/\s+/g, ' ').trim()];
      el.setAttribute(a, t || pt);
    }
  }

  function varrer(raiz, dic) {
    if (!raiz) return;
    // textos
    var it = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, null);
    var n, lista = [];
    while ((n = it.nextNode())) lista.push(n);
    for (var i = 0; i < lista.length; i++) trocaTexto(lista[i], dic);
    // atributos
    var els = raiz.querySelectorAll ? raiz.querySelectorAll('[' + ATRIBUTOS.join('],[') + ']') : [];
    for (var j = 0; j < els.length; j++) trocaAtributos(els[j], dic);
    if (raiz.nodeType === 1 && raiz.hasAttribute) trocaAtributos(raiz, dic);
  }

  function olharMudancas(dic) {
    if (observador) observador.disconnect();
    observador = new MutationObserver(function (muts) {
      var d = dicionarios[langAtual] || {};
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        for (var j = 0; j < m.addedNodes.length; j++) {
          var no = m.addedNodes[j];
          if (no.nodeType === 3) trocaTexto(no, d);
          else if (no.nodeType === 1) varrer(no, d);
        }
      }
    });
    observador.observe(document.body, { childList: true, subtree: true });
  }

  function aplicar(lang) {
    langAtual = LANGS.indexOf(lang) >= 0 ? lang : 'pt';
    document.documentElement.lang = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' }[langAtual];
    return baixar(langAtual).then(function (dic) {
      varrer(document.body, dic || {});
      olharMudancas(dic || {});
      try {
        root.dispatchEvent(new CustomEvent('vs:pagina-traduzida', { detail: { lang: langAtual } }));
      } catch (e) {}
      return langAtual;
    });
  }

  function iniciar() {
    aplicar(idioma());
    // a bandeira do cabeçalho dispara este evento
    root.addEventListener('vs:idioma', function (e) {
      aplicar((e.detail && e.detail.lang) || idioma());
    });
  }

  root.VSTraduz = { aplicar: aplicar, idioma: idioma, dicionario: function (l) { return dicionarios[l]; } };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})(window);
