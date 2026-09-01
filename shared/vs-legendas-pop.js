/* ── LEGENDAS EM TELA CHEIA — PT · EN · ES ─────────────────────────────────
 * 18/08/2026 — pedido do DJ: "tá muito difícil de achar as legendas; elas têm
 * que ser nas 3 línguas e usar quase a tela toda pra ser bem grandes".
 *
 * Antes: as legendas viviam escondidas numa aba lá dentro da radio.html, junto
 * de Imagens e Chat, em fonte de 1rem. E o ESPANHOL nunca aparecia: o HTML
 * tinha o #leg-es-txt, mas quem preenchia só mandava {pt, en} — o es morria no
 * caminho, mesmo existindo no playlist.json (campo texto_es).
 *
 * Agora: window.VSLegendas.abrir() põe um painel por cima de tudo, 92% da tela,
 * três linhas gigantes que se ajustam sozinhas ao tamanho do aparelho.
 *
 * De onde vem o texto, na ordem de preferência:
 *   1. VSLegendas.setTextos({pt,en,es})  — quem sabe o que toca empurra pra cá
 *   2. window.STATE._legTxt              — a radio.html já monta esse objeto
 *   3. /radio-mp3/<estacao>/playlist.json — sozinho, funciona em qualquer página
 */
(function () {
  'use strict';
  if (window.VSLegendas) return;

  var EST_PADRAO = 'central';
  var overlay = null, timer = null, _txt = { pt: '', en: '', es: '' }, _idx = 0;

  function estacaoAtual() {
    try {
      var e = localStorage.getItem('vs.radio.estacao') || localStorage.getItem('vs.estacao');
      if (e) return e;
    } catch (x) {}
    return EST_PADRAO;
  }

  function css() {
    if (document.getElementById('vsleg-css')) return;
    var s = document.createElement('style');
    s.id = 'vsleg-css';
    s.textContent = [
      '#vsleg-ov{position:fixed;inset:0;z-index:100000;display:none;',
      '  background:rgba(4,9,17,.97);backdrop-filter:blur(6px);',
      '  align-items:center;justify-content:center;padding:2vh 2vw}',
      '#vsleg-ov.on{display:flex}',
      '#vsleg-cx{width:96vw;max-width:1400px;height:92vh;display:flex;flex-direction:column;gap:1.4vh}',
      '#vsleg-topo{display:flex;align-items:center;justify-content:space-between;gap:10px;flex:0 0 auto}',
      '#vsleg-topo b{font-size:clamp(15px,2.2vh,22px);color:#7dd3fc;letter-spacing:.5px}',
      '#vsleg-x{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);color:#e5e7eb;',
      '  border-radius:999px;width:44px;height:44px;font-size:22px;cursor:pointer;line-height:1}',
      '.vsleg-l{flex:1 1 0;min-height:0;display:flex;gap:1.6vw;align-items:flex-start;overflow:auto;',
      '  background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.10);',
      '  border-radius:16px;padding:2.2vh 2vw}',
      '.vsleg-f{flex:0 0 auto;font-size:clamp(26px,5.2vh,64px);line-height:1}',
      '.vsleg-t{flex:1 1 auto;color:#f1f5f9;font-weight:650;',
      '  font-size:clamp(19px,3.5vh,44px);line-height:1.35;overflow-wrap:anywhere}',
      '.vsleg-l.pt{border-left:5px solid #22c55e}',
      '.vsleg-l.en{border-left:5px solid #38bdf8}',
      '.vsleg-l.es{border-left:5px solid #fbbf24}',
      '.vsleg-vazio{color:#64748b;font-weight:400;font-style:italic}',
      '@media(orientation:landscape) and (max-height:520px){.vsleg-t{font-size:clamp(15px,5.4vh,30px)}}'
    ].join('');
    document.head.appendChild(s);
  }

  function monta() {
    css();
    overlay = document.createElement('div');
    overlay.id = 'vsleg-ov';
    overlay.innerHTML =
      '<div id=vsleg-cx>' +
        '<div id=vsleg-topo><b>🌎 LEGENDAS AO VIVO — PT · EN · ES</b>' +
        '<button id=vsleg-x aria-label=Fechar legendas>✕</button></div>' +
        '<div class=vsleg-l pt><span class=vsleg-f>🇧🇷</span><span class=vsleg-t id=vsleg-pt></span></div>' +
        '<div class=vsleg-l en><span class=vsleg-f>🇺🇸</span><span class=vsleg-t id=vsleg-en></span></div>' +
        '<div class=vsleg-l es><span class=vsleg-f>🇪🇸</span><span class=vsleg-t id=vsleg-es></span></div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#vsleg-x').addEventListener('click', fechar);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) fechar(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechar(); });
  }

  function pinta() {
    if (!overlay) return;
    [['pt', _txt.pt], ['en', _txt.en], ['es', _txt.es]].forEach(function (p) {
      var el = overlay.querySelector('#vsleg-' + p[0]);
      if (!el) return;
      if (p[1]) { el.textContent = p[1]; el.classList.remove('vsleg-vazio'); }
      else { el.textContent = 'aguardando o próximo bloco…'; el.classList.add('vsleg-vazio'); }
    });
  }

  function daPagina() {
    try {
      var s = window.STATE && window.STATE._legTxt;
      if (s && (s.pt || s.en || s.es)) { _txt = { pt: s.pt || '', en: s.en || '', es: s.es || '' }; return true; }
    } catch (x) {}
    return false;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     27/08/2026 — LEGENDA VIVA, GRUDADA NO QUE ESTÁ TOCANDO.
     Queixa do DJ: "as legendas nunca funcionaram". Achei o porquê, medindo:
     este arquivo lia /radio-mp3/<pasta>/playlist.json e escolhia o item por um
     CONTADOR LOCAL (_idx++), sem nenhuma relação com o áudio. E esse playlist
     estava parado em **22/07/2026**, com `mp3s` vazio. Ou seja: a legenda
     mostrava notícia de mais de um mês atrás, sorteada por um contador.
     Nunca teve chance de bater com o que estava no ar.

     Agora a fonte é a que o liquidsoap escreve A CADA FAIXA:
       /data/tocando-<idioma>.json -> { arquivo: ".../central/xxx.mp3", inicio }
     e ao lado de cada mp3 mora o .json com o texto daquele bloco (823 deles na
     fila hoje). Cada idioma mostra o que a estação DAQUELE idioma está dizendo
     neste segundo — que é exatamente o que a tela "Com legendas" promete.
     ⚠️ Não é tradução do mesmo bloco: são as três estações, ao vivo, lado a
     lado. Traduzir o mesmo bloco exigiria o cache de 4,5 MB do servidor. */
  var _cacheTexto = {};
  function textoDoQueToca(idioma) {
    return fetch('/data/tocando-' + idioma + '.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.arquivo) return '';
        var m = String(d.arquivo).match(/radio-queue\/(.+)\.mp3$/);
        if (!m) return '';
        var alvo = '/radio-mp3/' + m[1] + '.json';
        var c = _cacheTexto[idioma];
        if (c && c.url === alvo) return c.txt;      // mesma faixa: não repete busca
        return fetch(alvo, { cache: 'no-store' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (j) {
            var txt = (j && (j.texto || j.titulo)) || '';
            _cacheTexto[idioma] = { url: alvo, txt: txt };
            return txt;
          })
          .catch(function () { return ''; });
      })
      .catch(function () { return ''; });
  }
  function doServidor() {
    Promise.all([textoDoQueToca('pt'), textoDoQueToca('en'), textoDoQueToca('es')])
      .then(function (r) {
        if (!r[0] && !r[1] && !r[2]) return;        // nada vivo: mantém o que está na tela
        _txt = { pt: r[0] || '', en: r[1] || '', es: r[2] || '' };
        pinta();
      })
      .catch(function () {});
  }

  function tick() { if (!daPagina()) doServidor(); else pinta(); }

  function abrir() {
    if (!overlay) monta();
    overlay.classList.add('on');
    tick();
    clearInterval(timer);
    timer = setInterval(tick, 4000);
  }
  function fechar() {
    if (overlay) overlay.classList.remove('on');
    clearInterval(timer); timer = null;
  }

  window.VSLegendas = {
    abrir: abrir,
    fechar: fechar,
    alterna: function () { (overlay && overlay.classList.contains('on')) ? fechar() : abrir(); },
    setTextos: function (t) {
      if (!t) return;
      _txt = { pt: t.pt || '', en: t.en || '', es: t.es || '' };
      pinta();
    }
  };
})();
