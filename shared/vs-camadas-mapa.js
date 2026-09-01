/* vs-camadas-mapa.js — PAINEL ÚNICO DE CAMADAS ("Skins") do mapa — 12/08/2026
 *
 * Pedido do DJ: tudo que põe ou tira ponto do mapa fica num BOTÃO SÓ, perto do
 * topo do FAB. O que está ligado fica de outra cor. E dá pra pedir só um tipo
 * de coisa — restaurantes, mercados, pousadas, lanchonetes — pra não encher o
 * mapa de pino. O JOGO entra aqui dentro também.
 *
 * Antes isso estava espalhado em 7 itens soltos do FAB (Skin do Jogo, Guias,
 * Comércio, Comércio da região, Coletivas, Pontos do mapa, Turismo), e não dava
 * pra ver de relance o que estava ligado.
 *
 * Os números vêm da tabela comercios_osm (conferidos no banco em 12/08):
 * restaurante 441 · lanchonete 145 · mercado 97 · hotel 74 · farmácia 122...
 */
(function () {
  if (window.VSCamadas) return;

  // camada -> rótulo. A chave é a mesma de ST.camadas / toggleCamada().
  var CAMADAS = [
    { k: 'cameras',    ico: '📹', nome: 'Câmeras ao vivo' },
    { k: 'comercios',  ico: '🏪', nome: 'Comércio parceiro' },
    { k: 'osm',        ico: '📍', nome: 'Comércio da região' },
    { k: 'coletivas',  ico: '🛒', nome: 'Compras coletivas' },
    { k: 'turisticos', ico: '📸', nome: 'Turismo' },
    { k: 'favoritos',  ico: '❤️', nome: 'Meus favoritos' },
    { k: 'historico',  ico: '🕐', nome: 'Por onde andei' }
  ];

  // filtros por tipo — mostram SÓ o escolhido dentro do "Comércio da região"
  var TIPOS = [
    { c: 'restaurant',  ico: '🍽️', nome: 'Restaurantes' },
    { c: 'fast_food',   ico: '🍔', nome: 'Lanchonetes' },
    { c: 'cafe',        ico: '☕', nome: 'Cafés' },
    { c: 'bar|pub',     ico: '🍺', nome: 'Bares' },
    { c: 'supermarket', ico: '🛒', nome: 'Supermercados' },
    { c: 'convenience', ico: '🏬', nome: 'Mercadinhos' },
    { c: 'bakery',      ico: '🥖', nome: 'Padarias' },
    { c: 'hotel',       ico: '🏨', nome: 'Hotéis' },
    { c: 'hostel|guest_house|apartment', ico: '🛏️', nome: 'Pousadas e hostels' },
    { c: 'pharmacy',    ico: '💊', nome: 'Farmácias' },
    { c: 'fuel',        ico: '⛽', nome: 'Postos' },
    { c: 'bank',        ico: '🏦', nome: 'Bancos' }
  ];

  var filtroAtual = null;   // null = mostra tudo
  var trilhasAcesas = false;

  /* 12/08 — LIMPAR O MAPA: nenhum ponto, mapa limpo pra olhar o lugar. */
  function limparTudo() {
    try {
      Object.keys(ST.camadas).forEach(function (k) {
        if (ST.camadas[k]) { try { toggleCamada(k); } catch (e) {} }
      });
    } catch (e) {}
    filtroAtual = null;
    if (trilhasAcesas) acenderTrilhas(false);
  }

  /* 12/08 — ILUMINAR AS TRILHAS. Por aqui as trilhas e caminhos entram como
   * pontos turísticos, então acender = ligar essa camada e deixar os pinos (e
   * qualquer linha de caminho) num dourado pulsante bem forte, de achar de longe. */
  function acenderTrilhas(ligar) {
    trilhasAcesas = (ligar === undefined) ? !trilhasAcesas : !!ligar;
    try { if (trilhasAcesas && !ST.camadas.turisticos) toggleCamada('turisticos'); } catch (e) {}
    try {
      Object.keys(ST.pins).forEach(function (id) {
        var m = ST.pins[id];
        if (!m || m._vt !== 'turistico') return;
        var el = m._icon || (m.getElement && m.getElement());
        if (el) el.classList.toggle('trilha-acesa', trilhasAcesas);
      });
    } catch (e) {}
    // linhas de caminho desenhadas no mapa (polyline/path)
    try {
      document.querySelectorAll('.leaflet-overlay-pane path').forEach(function (p) {
        p.classList.toggle('trilha-acesa', trilhasAcesas);
      });
    } catch (e) {}
  }

  var css = document.createElement('style');
  css.textContent =
    '#vscam-panel{position:fixed;inset:0;z-index:100002;display:none;align-items:flex-end;justify-content:center}' +
    '#vscam-panel.on{display:flex}' +
    '#vscam-panel .cp-fundo{position:absolute;inset:0;background:rgba(3,7,12,.72);backdrop-filter:blur(5px)}' +
    '#vscam-panel .cp-cx{position:relative;width:100%;max-width:520px;max-height:86vh;overflow-y:auto;' +
      'background:#0e1926;border:1px solid rgba(255,255,255,.13);border-radius:18px 18px 0 0;padding:16px 14px 22px}' +
    '@media(min-width:560px){#vscam-panel{align-items:center}#vscam-panel .cp-cx{border-radius:18px}}' +
    '#vscam-panel h3{font:800 17px system-ui;color:#eaf2fb;margin:0 0 3px}' +
    '#vscam-panel .cp-sub{font:600 12.5px system-ui;color:#8fa6bd;margin-bottom:14px}' +
    '#vscam-panel .cp-tit{font:800 12px system-ui;letter-spacing:.06em;text-transform:uppercase;' +
      'color:#7f9ab4;margin:16px 0 8px}' +
    '#vscam-panel .cp-grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}' +
    '#vscam-panel .cp-b{display:flex;align-items:center;gap:8px;background:#16232f;color:#b9cbdb;' +
      'border:1.5px solid rgba(255,255,255,.10);border-radius:11px;padding:11px 10px;cursor:pointer;' +
      'font:700 13px system-ui;text-align:left;transition:.15s}' +
    '#vscam-panel .cp-b .ic{font-size:17px;line-height:1}' +
    /* LIGADO = cor diferente, dá pra ver de relance o que está no mapa */
    '#vscam-panel .cp-b.on{background:linear-gradient(135deg,#0d9488,#059669);color:#fff;' +
      'border-color:#34d399;box-shadow:0 3px 12px rgba(5,150,105,.35)}' +
    '#vscam-panel .cp-b.on::after{content:"✓";margin-left:auto;font-weight:900}' +
    '#vscam-panel .cp-b.jogo.on{background:linear-gradient(135deg,#7c3aed,#a855f7);border-color:#c4b5fd;' +
      'box-shadow:0 3px 12px rgba(124,58,237,.4)}' +
    '#vscam-panel .cp-x{width:100%;margin-top:18px;background:#22303f;color:#eaf2fb;border:0;' +
      'border-radius:11px;padding:13px;font:800 14px system-ui;cursor:pointer}' +
    '#vscam-panel .cp-limpa{background:#3a2230;border-color:#7f1d3a;color:#fecdd3}' +
    '#vscam-panel .cp-largo{grid-column:1/-1}' +
    /* 12/08 — TRILHAS ACESAS: brilho dourado forte e pulsante, pra achar de longe */
    '.trilha-acesa .vspin,.trilha-acesa img{filter:drop-shadow(0 0 6px #ffd54f) drop-shadow(0 0 16px #ffb300)' +
      ' drop-shadow(0 0 30px rgba(255,179,0,.75));animation:vsTrilhaPulsa 1.5s ease-in-out infinite}' +
    '@keyframes vsTrilhaPulsa{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.18);opacity:.85}}' +
    '.leaflet-overlay-pane path.trilha-acesa{stroke:#ffc107!important;stroke-width:7!important;' +
      'filter:drop-shadow(0 0 8px #ffd54f) drop-shadow(0 0 20px #ffa000);animation:vsTrilhaLinha 1.6s ease-in-out infinite}' +
    '@keyframes vsTrilhaLinha{0%,100%{stroke-opacity:.85;stroke-width:6}50%{stroke-opacity:1;stroke-width:9}}';
  document.head.appendChild(css);

  var pnl = document.createElement('div');
  pnl.id = 'vscam-panel';
  pnl.innerHTML = '<div class="cp-fundo"></div><div class="cp-cx"></div>';
  document.body.appendChild(pnl);
  pnl.querySelector('.cp-fundo').addEventListener('click', fechar);

  function ligada(k) {
    try { return !!(ST && ST.camadas && ST.camadas[k]); } catch (e) { return false; }
  }
  function jogoLigado() {
    try { return document.body.classList.contains('skin-jogo') ||
                 (typeof MODO_JOGO !== 'undefined' && MODO_JOGO) ||
                 !!(ST && ST.camadas && ST.camadas.npcs); } catch (e) { return false; }
  }

  /* mostra só o tipo pedido dentro do "Comércio da região" */
  function aplicarFiltro(regex) {
    filtroAtual = regex;
    try {
      Object.keys(ST.pins).forEach(function (id) {
        var m = ST.pins[id];
        if (!m || m._vt !== 'osm') return;
        var cat = (m._vs && (m._vs.categoria || m._vs.grupo)) || '';
        var mostra = !regex || new RegExp('^(' + regex + ')$', 'i').test(cat);
        if (mostra && ST.camadas.osm) { try { _cluster.addLayer(m); } catch (e) {} }
        else { try { _cluster.removeLayer(m); } catch (e) {} }
      });
    } catch (e) {}
  }

  function desenhar() {
    var cx = pnl.querySelector('.cp-cx');
    var h = '<h3>🎨 Skins do mapa</h3>' +
            '<div class="cp-sub">Escolha o que aparece. O que está aceso está no mapa agora.</div>' +
            '<div class="cp-tit">Camadas</div><div class="cp-grade">';
    // o jogo primeiro, com cor própria
    h += '<button class="cp-b jogo' + (jogoLigado() ? ' on' : '') + '" data-jogo="1">' +
         '<span class="ic">🎮</span><span>Jogo</span></button>';
    h += '<button class="cp-b' + (ligada('npcs') ? ' on' : '') + '" data-npc="1">' +
         '<span class="ic">🧙</span><span>Guias do lugar</span></button>';
    CAMADAS.forEach(function (c) {
      h += '<button class="cp-b' + (ligada(c.k) ? ' on' : '') + '" data-k="' + c.k + '">' +
           '<span class="ic">' + c.ico + '</span><span>' + c.nome + '</span></button>';
    });
    h += '<button class="cp-b cp-largo' + (trilhasAcesas ? ' on' : '') + '" data-trilha="1">' +
         '<span class="ic">✨</span><span>Iluminar as trilhas</span></button>';
    h += '<button class="cp-b cp-largo" data-nada="1">' +
         '<span class="ic">🚫</span><span>Não mostrar ponto nenhum</span></button>';
    h += '</div><div class="cp-tit">Mostrar só um tipo</div><div class="cp-grade">';
    TIPOS.forEach(function (t) {
      h += '<button class="cp-b' + (filtroAtual === t.c ? ' on' : '') + '" data-c="' + t.c + '">' +
           '<span class="ic">' + t.ico + '</span><span>' + t.nome + '</span></button>';
    });
    h += '</div>';
    if (filtroAtual) h += '<button class="cp-x cp-limpa" data-limpa="1">✕ Mostrar todos de novo</button>';
    h += '<button class="cp-x" data-fechar="1">Pronto</button>';
    cx.innerHTML = h;

    cx.querySelectorAll('.cp-b').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.jogo) { try { toggleModoJogo(); } catch (e) {} }
        else if (b.dataset.npc) { try { toggleNpcs(); } catch (e) {} }
        else if (b.dataset.k) { try { toggleCamada(b.dataset.k); } catch (e) {} }
        else if (b.dataset.trilha) { acenderTrilhas(); }
        else if (b.dataset.nada) { limparTudo(); }
        else if (b.dataset.c) {
          aplicarFiltro(filtroAtual === b.dataset.c ? null : b.dataset.c);
          try { if (!ST.camadas.osm) toggleCamada('osm'); } catch (e) {}
        }
        setTimeout(desenhar, 60);
      });
    });
    var lim = cx.querySelector('[data-limpa]');
    if (lim) lim.addEventListener('click', function () { aplicarFiltro(null); desenhar(); });
    cx.querySelector('[data-fechar]').addEventListener('click', fechar);
  }

  function abrir() { desenhar(); pnl.classList.add('on'); }
  function fechar() { pnl.classList.remove('on'); }

  window.VSCamadas = { abrir: abrir, fechar: fechar, filtro: aplicarFiltro, tipos: TIPOS,
    limpar: limparTudo, trilhas: acenderTrilhas };
})();
