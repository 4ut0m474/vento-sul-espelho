/* vs-bussola-destino.js — a bússola do mapa vira "pra onde você quer ir" — 12/08/2026
 *
 * Pedido do DJ: "clicar na bússola do mapa abre a bússola grande, que mostra o
 * norte e o lugar que você pedir; com lupa de procura que leva pra qualquer
 * lugar — supermercados, lanchonetes, é só pedir que ela aponta e leva".
 *
 * Antes o toque na rosa dos ventos só pedia permissão de orientação e pronto.
 * Agora abre um seletor: categorias rápidas + busca por nome. Escolheu, a
 * VSBussola (a mesma do comércio e da caça) aponta e mostra a distância.
 *
 * De onde saem os lugares: dos pinos JÁ carregados no mapa (ST.pins), então não
 * há requisição nova — e a lista sai ordenada do mais perto pro mais longe.
 */
(function () {
  if (window.VSBussolaDestino) return;

  var CATS = [
    { re: 'restaurant',  ico: '🍽️', nome: 'Restaurantes' },
    { re: 'fast_food',   ico: '🍔', nome: 'Lanchonetes' },
    { re: 'supermarket|convenience', ico: '🛒', nome: 'Mercados' },
    { re: 'bakery',      ico: '🥖', nome: 'Padarias' },
    { re: 'cafe',        ico: '☕', nome: 'Cafés' },
    { re: 'bar|pub',     ico: '🍺', nome: 'Bares' },
    { re: 'pharmacy',    ico: '💊', nome: 'Farmácias' },
    { re: 'hotel|hostel|guest_house', ico: '🏨', nome: 'Dormir' },
    { re: 'fuel',        ico: '⛽', nome: 'Postos' },
    { re: 'bank|atm',    ico: '🏦', nome: 'Banco' }
  ];

  var css = document.createElement('style');
  css.textContent =
    '#vsbd{position:fixed;inset:0;z-index:99995;display:none;align-items:flex-end;justify-content:center}' +
    '#vsbd.on{display:flex}' +
    '#vsbd .bd-fundo{position:absolute;inset:0;background:rgba(3,7,12,.74);backdrop-filter:blur(5px)}' +
    '#vsbd .bd-cx{position:relative;width:100%;max-width:520px;max-height:84vh;overflow-y:auto;' +
      'background:#0e1926;border:1px solid rgba(255,255,255,.13);border-radius:18px 18px 0 0;padding:16px 14px 22px}' +
    '@media(min-width:560px){#vsbd{align-items:center}#vsbd .bd-cx{border-radius:18px}}' +
    '#vsbd h3{font:800 17px system-ui;color:#eaf2fb;margin:0 0 3px}' +
    '#vsbd .bd-sub{font:600 12.5px system-ui;color:#8fa6bd;margin-bottom:13px}' +
    '#vsbd input{width:100%;box-sizing:border-box;background:#16232f;color:#eaf2fb;' +
      'border:1px solid rgba(255,255,255,.14);border-radius:11px;padding:12px 13px;font:600 14px system-ui}' +
    '#vsbd .bd-cats{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0}' +
    '#vsbd .bd-cats button{background:#16232f;color:#b9cbdb;border:1px solid rgba(255,255,255,.10);' +
      'border-radius:10px;padding:9px 11px;font:700 12.5px system-ui;cursor:pointer}' +
    '#vsbd .bd-cats button.sel{background:#0d9488;color:#fff;border-color:#34d399}' +
    '#vsbd .bd-lista{display:flex;flex-direction:column;gap:6px;margin-top:6px}' +
    '#vsbd .bd-item{display:flex;align-items:center;gap:10px;background:#16232f;border:0;' +
      'border-radius:11px;padding:11px 12px;cursor:pointer;text-align:left;width:100%}' +
    '#vsbd .bd-item .ic{font-size:19px}' +
    '#vsbd .bd-item .tx{flex:1;min-width:0}' +
    '#vsbd .bd-item b{display:block;font:700 13.5px system-ui;color:#eaf2fb;' +
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#vsbd .bd-item small{font:600 11.5px system-ui;color:#8fa6bd}' +
    '#vsbd .bd-item .d{font:800 12.5px system-ui;color:#fbbf24;white-space:nowrap}' +
    '#vsbd .bd-x{width:100%;margin-top:14px;background:#22303f;color:#eaf2fb;border:0;' +
      'border-radius:11px;padding:12px;font:800 13px system-ui;cursor:pointer}' +
    '.vs-rosa{cursor:pointer}';
  document.head.appendChild(css);

  var pnl = document.createElement('div');
  pnl.id = 'vsbd';
  pnl.innerHTML = '<div class="bd-fundo"></div><div class="bd-cx">' +
    '<h3>🧭 Pra onde te levo?</h3>' +
    '<div class="bd-sub">Escolha um tipo ou procure pelo nome. A bússola aponta e mostra a distância.</div>' +
    '<input id="bd-busca" placeholder="🔎 procurar lugar, loja, praia…" autocomplete="off">' +
    '<div class="bd-cats"></div><div class="bd-lista"></div>' +
    '<button class="bd-x" type="button">Fechar</button></div>';
  function encaixar() {
    if (!document.body) return setTimeout(encaixar, 40);
    if (!pnl.parentNode) document.body.appendChild(pnl);
  }
  encaixar();
  pnl.querySelector('.bd-fundo').addEventListener('click', fechar);
  pnl.querySelector('.bd-x').addEventListener('click', fechar);

  var D = Math.PI / 180;
  function dist(a1, o1, a2, o2) {
    var dLat = (a2 - a1) * D, dLng = (o2 - o1) * D;
    var s = Math.sin(dLat/2)*Math.sin(dLat/2) +
            Math.cos(a1*D)*Math.cos(a2*D)*Math.sin(dLng/2)*Math.sin(dLng/2);
    return 6371000 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
  }
  function fmt(m) { return m >= 1000 ? (m/1000).toFixed(1) + ' km' : Math.round(m) + ' m'; }

  function meuLugar() {
    try { if (ST && ST.lat && ST.lng) return { lat: ST.lat, lng: ST.lng }; } catch (e) {}
    try { var c = mapa.getCenter(); return { lat: c.lat, lng: c.lng }; } catch (e) {}
    return null;
  }

  /* pino sem _vs ainda tem nome: está no tooltip ou no popup que o mapa desenhou */
  function rotulo(m) {
    function limpo(c) {
      if (!c) return '';
      if (typeof c !== 'string') { try { c = c.innerHTML || c.textContent || ''; } catch (e) { return ''; } }
      return c.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
    }
    try { var t = m.getTooltip && m.getTooltip(); if (t) { var a = limpo(t.getContent()); if (a) return a; } } catch (e) {}
    try { var p = m.getPopup && m.getPopup();   if (p) { var b = limpo(p.getContent()); if (b) return b; } } catch (e) {}
    return '';
  }

  /* varre os pinos que o mapa já tem — sem pedir nada de novo pro servidor */
  function candidatos(filtro, texto) {
    var eu = meuLugar(), saida = [];
    if (!eu) return saida;
    var rx = filtro ? new RegExp('^(' + filtro + ')$', 'i') : null;
    var alvo = (texto || '').trim().toLowerCase();
    try {
      Object.keys(ST.pins).forEach(function (id) {
        /* 13/08/2026 — a busca não achava quase nada porque exigia m._vs.lat/lng,
           e só o comércio tem esse objeto: NPCs, árvores, histórico e câmeras
           entram no mapa sem _vs e ficavam invisíveis pra lupa. A posição de
           verdade é o getLatLng() do marcador, que TODO pino tem. */
        var m = ST.pins[id];
        if (!m || typeof m.getLatLng !== 'function') return;
        var ll; try { ll = m.getLatLng(); } catch (e) { return; }
        if (!ll || ll.lat == null || ll.lng == null) return;
        var it = m._vs || {};
        var cat = (it.categoria || it.grupo || m._vt || '') + '';
        var nome = (it.nome || it.sublocal || rotulo(m) || '') + '';
        if (rx && !rx.test(cat)) return;
        if (alvo && nome.toLowerCase().indexOf(alvo) < 0) return;
        if (!rx && !alvo) return;
        saida.push({ nome: nome || 'sem nome', cat: cat, lat: ll.lat, lng: ll.lng,
                     d: dist(eu.lat, eu.lng, ll.lat, ll.lng) });
      });
    } catch (e) {}
    saida.sort(function (a, b) { return a.d - b.d; });
    return saida.slice(0, 25);
  }

  var filtroSel = null;

  function pintar() {
    var cx = pnl.querySelector('.bd-cats');
    cx.innerHTML = '';
    CATS.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = c.ico + ' ' + c.nome;
      if (filtroSel === c.re) b.className = 'sel';
      b.addEventListener('click', function () {
        filtroSel = (filtroSel === c.re) ? null : c.re;
        pintar();
      });
      cx.appendChild(b);
    });
    var lista = pnl.querySelector('.bd-lista');
    var txt = pnl.querySelector('#bd-busca').value;
    var itens = candidatos(filtroSel, txt);
    lista.innerHTML = '';
    if (!itens.length) {
      lista.innerHTML = '<div style="color:#8fa6bd;font:600 13px system-ui;padding:10px 2px">' +
        (filtroSel || txt ? 'Nada por perto com isso. Tente outro tipo.'
                          : 'Escolha um tipo acima ou digite o nome.') + '</div>';
      return;
    }
    itens.forEach(function (it) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'bd-item';
      b.innerHTML = '<span class="ic">📍</span><span class="tx"><b></b><small></small></span>' +
                    '<span class="d"></span>';
      b.querySelector('b').textContent = it.nome;
      b.querySelector('small').textContent = it.cat || '';
      b.querySelector('.d').textContent = fmt(it.d);
      b.addEventListener('click', function () {
        fechar();
        try { if (window.VSBussola) VSBussola.guiar({ lat: it.lat, lng: it.lng, nome: it.nome }); } catch (e) {}
        try { mapa.setView([it.lat, it.lng], 16, { animate: true }); } catch (e) {}
      });
      lista.appendChild(b);
    });
  }

  function abrir() { pintar(); pnl.classList.add('on'); setTimeout(function(){
    try { pnl.querySelector('#bd-busca').focus(); } catch (e) {} }, 120); }
  function fechar() { pnl.classList.remove('on'); }

  pnl.querySelector('#bd-busca').addEventListener('input', pintar);

  /* liga no toque da rosa dos ventos, sem perder o pedido de permissão */
  var t = 0;
  (function ligar() {
    var rosa = document.querySelector('.vs-rosa');
    if (rosa && !rosa._vsbd) {
      rosa._vsbd = true;
      rosa.title = 'Bússola — toque pra escolher o destino';
      rosa.addEventListener('click', function (e) {
        try { e.stopPropagation(); } catch (x) {}
        abrir();
      });
      return;
    }
    if (++t < 40) setTimeout(ligar, 300);
  })();

  window.VSBussolaDestino = { abrir: abrir, fechar: fechar };
})();
