// cinema-mode.js — modo cinema após inatividade: fotos do tema preenchem a tela
// Uso: <script src="/shared/cinema-mode.js" data-idle="30000"></script>
// Elementos com class "controles" somem no modo cinema
// Se houver #bgs-wrap (bg-slideshow) ele sobe pro primeiro plano
(function () {
  'use strict';
  if (window.__VS_CINEMA__) return;
  window.__VS_CINEMA__ = true;

  var sc = document.currentScript || document.querySelector('script[data-idle]');
  var delay = parseInt((sc && sc.getAttribute('data-idle')) || '30000', 10);

  var CSS = [
    '.controles{transition:opacity .5s ease;}',
    'body.cinema-on .controles{opacity:0!important;pointer-events:none!important;transition:opacity 1.8s ease!important;}',
    'body.cinema-on #bgs-wrap{z-index:7900!important;}',
    '#cinema-hint{',
    '  position:fixed;bottom:22px;left:50%;transform:translateX(-50%);z-index:8000;',
    '  background:rgba(0,0,0,.62);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);',
    '  border:1px solid rgba(255,255,255,.13);border-radius:24px;',
    '  padding:8px 22px;font-size:12px;color:rgba(255,255,255,.88);',
    '  pointer-events:none;letter-spacing:.3px;white-space:nowrap;',
    '  opacity:0;transition:opacity 1.2s;',
    '}',
    'body.cinema-on #cinema-hint{opacity:1;}',
  ].join('');

  function injectCSS() {
    if (document.getElementById('vs-cinema-css')) return;
    var s = document.createElement('style');
    s.id = 'vs-cinema-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function injectHint() {
    if (document.getElementById('cinema-hint')) return;
    var d = document.createElement('div');
    d.id = 'cinema-hint';
    d.textContent = '🎬 modo cinema · toque para voltar';
    document.body.appendChild(d);
  }

  var timer = null;

  function activateCinema() {
    document.body.classList.add('cinema-on');
    var bgs = document.getElementById('bgs-wrap');
    if (bgs) {
      bgs.style.zIndex = '7900';
      bgs.querySelectorAll('.bgs-layer').forEach(function(l) {
        if (l.classList.contains('bgs-on')) l.style.opacity = '1';
      });
    }
  }

  function arm() {
    clearTimeout(timer);
    timer = setTimeout(activateCinema, delay);
  }

  function wake() {
    document.body.classList.remove('cinema-on');
    var bgs = document.getElementById('bgs-wrap');
    if (bgs) bgs.style.zIndex = '';
    arm();
  }

  function init() {
    injectCSS();
    injectHint();
    ['touchstart','mousemove','mousedown','keydown','scroll','click'].forEach(function(ev) {
      document.addEventListener(ev, wake, { passive:true });
    });
    arm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.CinemaMode = { arm:arm, wake:wake, activate:activateCinema };
})();
