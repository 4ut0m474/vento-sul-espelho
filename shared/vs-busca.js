/* vs-busca.js — a busca unificada do app.
 * Uma caixa só: nome de praia OU nome de produto.
 * Produto vem com PREÇO e ONDE. Lugar vem com DISTÂNCIA.
 * Botões: comparar preço (mesmo produto em vários comerciantes) e ver no mapa.
 */
(function () {
  if (window.VSBusca) return;

  // mesma fonte de config que o resto do app usa (config.js)
  var C  = window.VENTOSUL_CONFIG || {};
  var SB = C.SUPABASE_URL || 'https://vdrzndgkwdpibexjkyxi.supabase.co';
  var AK = C.SUPABASE_ANON_JWT || C.SUPABASE_ANON || '';

  /* ── estilo ── */
  var s = document.createElement('style');
  s.id = 'vs-busca-style';
  s.textContent = `
  #vsb-fundo{position:fixed;inset:0;z-index:99997;display:none;flex-direction:column;
    background:#0a1420}
  #vsb-fundo.on{display:flex}
  #vsb-topo{display:flex;gap:8px;align-items:center;padding:12px 12px 10px;
    background:#101f30;border-bottom:1px solid #22384f;
    padding-top:calc(12px + env(safe-area-inset-top,0px))}
  #vsb-input{flex:1;padding:12px 14px;border-radius:12px;border:1px solid #22384f;
    background:#0a1420;color:#eaf3fa;font:600 15px system-ui;outline:none}
  #vsb-input:focus{border-color:#22d3ee}
  #vsb-input::placeholder{color:#5d7a94}
  #vsb-fechar{background:transparent;border:0;color:#8fa6bd;font:700 22px system-ui;
    cursor:pointer;padding:6px 10px}
  #vsb-filtros{display:flex;gap:6px;padding:0 12px 10px;background:#101f30;overflow-x:auto}
  .vsb-f{padding:6px 12px;border-radius:99px;font:700 12px system-ui;cursor:pointer;
    border:1px solid #22384f;background:#14273a;color:#8fa6bd;white-space:nowrap}
  .vsb-f.on{border-color:#ffd54f;background:rgba(255,213,79,.15);color:#ffd54f}
  #vsb-lista{flex:1;overflow-y:auto;padding:12px;padding-bottom:80px}
  .vsb-i{background:#14273a;border:1px solid #22384f;border-radius:14px;padding:12px 13px;
    margin-bottom:9px;display:flex;gap:11px;align-items:flex-start;
    border-left:3px solid var(--c,#22d3ee)}
  .vsb-i .e{font-size:22px;flex:none;line-height:1.2}
  .vsb-i .m{flex:1;min-width:0}
  .vsb-i b{display:block;font:800 14.5px system-ui;color:#eaf3fa;line-height:1.25}
  .vsb-i .onde{display:block;font:500 12.5px system-ui;color:#8fa6bd;margin-top:2px}
  .vsb-i .preco{font:900 17px system-ui;color:#34d399;white-space:nowrap;text-align:right}
  .vsb-i .de{display:block;font:600 11px system-ui;color:#8fa6bd;
    text-decoration:line-through;text-align:right}
  .vsb-i .dist{display:inline-block;font:700 11px system-ui;color:#22d3ee;
    background:rgba(34,211,238,.12);border-radius:99px;padding:2px 8px;margin-top:6px}
  .vsb-acoes{display:flex;gap:7px;margin-top:9px;flex-wrap:wrap}
  .vsb-b{padding:6px 11px;border-radius:9px;font:700 11.5px system-ui;cursor:pointer;
    border:1px solid #22384f;background:#0f1c2a;color:#cbd9e6}
  .vsb-b.pri{border-color:rgba(255,213,79,.5);background:rgba(255,213,79,.13);color:#ffd54f}
  #vsb-vazio{text-align:center;color:#8fa6bd;font:500 14px system-ui;padding:40px 20px;line-height:1.6}
  #vsb-vazio b{color:#eaf3fa;display:block;margin-bottom:6px;font-size:15px}
  .vsb-cmp{background:#101f30;border:1px solid rgba(255,213,79,.4);border-radius:14px;
    padding:13px;margin-bottom:10px}
  .vsb-cmp h4{font:800 13px system-ui;color:#ffd54f;margin-bottom:9px}
  .vsb-cmp .l{display:flex;justify-content:space-between;align-items:center;gap:10px;
    padding:8px 0;border-bottom:1px solid #22384f;font:500 12.5px system-ui;color:#c2d3e2}
  .vsb-cmp .l:last-child{border-bottom:0}
  .vsb-cmp .l b{color:#eaf3fa;font-weight:700}
  .vsb-cmp .l .p{font:900 15px system-ui;color:#34d399;white-space:nowrap}
  .vsb-cmp .l.melhor .p{color:#ffd54f}
  .vsb-cmp .l.melhor::after{content:'melhor preço';font:800 9.5px system-ui;color:#ffd54f;
    background:rgba(255,213,79,.15);border-radius:99px;padding:2px 7px}
  `;
  document.head.appendChild(s);

  var fundo, input, lista, filtro = 'tudo', ultimo = [], timer;

  function esc(x){ return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
  function brl(v){ return 'R$ ' + Number(v).toFixed(2).replace('.', ','); }

  function montar() {
    if (fundo) return;
    fundo = document.createElement('div');
    fundo.id = 'vsb-fundo';
    fundo.innerHTML =
      '<div id="vsb-topo">' +
        '<input id="vsb-input" placeholder="praia, praça, produto…" autocomplete="off">' +
        '<button id="vsb-fechar" aria-label="Fechar">✕</button>' +
      '</div>' +
      '<div id="vsb-filtros">' +
        '<button class="vsb-f on" data-f="tudo">Tudo</button>' +
        '<button class="vsb-f" data-f="produto">🏷️ Produtos</button>' +
        '<button class="vsb-f" data-f="lugar">📍 Lugares</button>' +
      '</div>' +
      '<div id="vsb-lista"></div>';
    document.body.appendChild(fundo);

    input = fundo.querySelector('#vsb-input');
    lista = fundo.querySelector('#vsb-lista');
    fundo.querySelector('#vsb-fechar').addEventListener('click', fechar);
    fundo.querySelectorAll('.vsb-f').forEach(function (b) {
      b.addEventListener('click', function () {
        fundo.querySelectorAll('.vsb-f').forEach(function(x){ x.classList.remove('on'); });
        b.classList.add('on'); filtro = b.dataset.f; render();
      });
    });
    input.addEventListener('input', function () {
      clearTimeout(timer); timer = setTimeout(buscar, 320);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && fundo.classList.contains('on')) fechar();
    });
    vazio('Digite pra procurar', 'Nome de praia, praça, trilha — ou um produto. ' +
          'Produto vem com preço e onde está.');
  }

  function vazio(t, sub) {
    lista.innerHTML = '<div id="vsb-vazio"><b>' + esc(t) + '</b>' + esc(sub||'') + '</div>';
  }

  function posicao() {
    try {
      var p = JSON.parse(localStorage.getItem('vs.ultima_pos') || 'null');
      if (p && p.lat) return p;
    } catch (_) {}
    return { lat: -27.574, lng: -48.426 };   // Barra da Lagoa como padrão
  }

  function buscar() {
    var q = input.value.trim();
    if (q.length < 2) { vazio('Digite pra procurar', 'Pelo menos 2 letras.'); return; }
    var p = posicao();
    vazio('Procurando…', '');
    fetch(SB + '/rest/v1/rpc/busca_unificada', {
      method: 'POST',
      headers: { 'apikey': AK, 'Authorization': 'Bearer ' + AK,
                 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_termo: q, p_lat: p.lat, p_lng: p.lng, p_limite: 60 })
    })
    .then(function (r) { return r.json(); })
    .then(function (d) { ultimo = Array.isArray(d) ? d : []; render(); })
    .catch(function () { vazio('Não deu pra procurar agora', 'Tenta de novo em instantes.'); });
  }

  function render() {
    var itens = ultimo.filter(function (i) {
      return filtro === 'tudo' || i.tipo === filtro;
    });
    if (!itens.length) {
      vazio('Nada encontrado', 'Tenta outra palavra — ou parte do nome.');
      return;
    }
    // agrupa produto de mesmo nome pra oferecer a comparação
    var porNome = {};
    itens.forEach(function (i) {
      if (i.tipo !== 'produto') return;
      var k = i.nome.toLowerCase();
      (porNome[k] = porNome[k] || []).push(i);
    });

    lista.innerHTML = itens.map(function (i, idx) {
      var prod = i.tipo === 'produto';
      var cor = prod ? '#34d399' : '#22d3ee';
      var iguais = prod ? (porNome[i.nome.toLowerCase()] || []).length : 0;
      var h = '<div class="vsb-i" style="--c:' + cor + '">'
        + '<span class="e">' + (prod ? '🏷️' : '📍') + '</span>'
        + '<div class="m"><b>' + esc(i.nome) + '</b>'
        + '<span class="onde">' + (prod ? 'em ' : '') + esc(i.onde || '')
        + (i.cidade ? ' · ' + esc(i.cidade) : '') + '</span>';
      if (i.distancia_km != null)
        h += '<span class="dist">a ' + Number(i.distancia_km).toFixed(1) + ' km</span>';
      h += '<div class="vsb-acoes">';
      if (i.lat && i.lng)
        h += '<button class="vsb-b pri" data-acao="mapa" data-i="' + idx + '">🗺️ Ver no mapa</button>';
      if (iguais > 1)
        h += '<button class="vsb-b" data-acao="comparar" data-i="' + idx + '">⚖️ Comparar preço ('
          + iguais + ')</button>';
      h += '</div></div>';
      if (prod && i.preco != null) {
        h += '<div><div class="preco">' + brl(i.preco) + '</div>'
          + (i.preco_de ? '<span class="de">' + brl(i.preco_de) + '</span>' : '') + '</div>';
      }
      return h + '</div>';
    }).join('');

    lista.querySelectorAll('[data-acao]').forEach(function (b) {
      b.addEventListener('click', function () {
        var it = itens[parseInt(b.dataset.i, 10)];
        if (b.dataset.acao === 'mapa') verNoMapa(it);
        else comparar(it, porNome[it.nome.toLowerCase()]);
      });
    });
  }

  /* compara o mesmo produto entre comerciantes */
  function comparar(item, grupo) {
    var ord = grupo.slice().sort(function (a, b) { return a.preco - b.preco; });
    var h = '<div class="vsb-cmp"><h4>⚖️ ' + esc(item.nome) + ' — onde está mais barato</h4>';
    ord.forEach(function (g, k) {
      h += '<div class="l' + (k === 0 ? ' melhor' : '') + '">'
        + '<span><b>' + esc(g.onde || 'comércio parceiro') + '</b>'
        + (g.distancia_km != null ? ' · ' + Number(g.distancia_km).toFixed(1) + ' km' : '')
        + '</span><span class="p">' + brl(g.preco) + '</span></div>';
    });
    var eco = ord.length > 1 ? (ord[ord.length-1].preco - ord[0].preco) : 0;
    if (eco > 0) h += '<div class="l"><span>Economia entre o maior e o menor</span>'
      + '<span class="p">' + brl(eco) + '</span></div>';
    h += '</div>';
    lista.insertAdjacentHTML('afterbegin', h);
    lista.scrollTop = 0;
  }

  /* manda pro mapa, centrado no que a pessoa escolheu */
  function verNoMapa(i) {
    try { localStorage.setItem('vs.mapa_foco', JSON.stringify({
      lat: i.lat, lng: i.lng, nome: i.nome, onde: i.onde,
      preco: i.preco, tipo: i.tipo })); } catch (_) {}
    location.href = '/mapa.html?foco=' + encodeURIComponent(i.lat + ',' + i.lng)
                  + '&nome=' + encodeURIComponent(i.nome);
  }

  function abrir() {
    montar();
    fundo.classList.add('on');
    setTimeout(function () { input && input.focus(); }, 60);
  }
  function fechar() { if (fundo) fundo.classList.remove('on'); }

  window.VSBusca = { abrir: abrir, fechar: fechar };
})();
