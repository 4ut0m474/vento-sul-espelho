/* vs-mapa-3d.js — o relevo da ilha, de verdade. 27/08/2026, pedido do DJ:
 * "coloca o lance 3d pra nóis, vamo começar a deixar o mapa mais interativo".
 *
 * POR QUE UM SEGUNDO MOTOR DE MAPA, E NÃO 3D DENTRO DO LEAFLET:
 * o mapa.html é Leaflet, que desenha IMAGENS planas — ele não tem inclinação,
 * nem giro, nem altura. Não é limitação de configuração, é o desenho dele.
 * Quem faz relevo é o MapLibre, com dado de altitude (terrain-rgb). Então o 3D
 * é uma TELA SEPARADA que abre por cima, e o mapa de sempre continua intocado.
 *
 * ⚠️ CARREGAMENTO PREGUIÇOSO, DE PROPÓSITO. O MapLibre tem ~800 KB. Se ele
 *    entrasse junto com a página, TODO MUNDO pagaria — inclusive quem só quer
 *    ver o comércio da esquina. Ele só é baixado quando a pessoa toca no 🏔️.
 *    Mesma razão do 3D não ficar rodando atrás: laço de animação em celular
 *    esquenta e come bateria de quem não pediu nada disso.
 *
 * ⚠️ A CHAVE DO MAPTILER JÁ É PÚBLICA (está no mapa.html, roda no navegador de
 *    todo mundo). Não é segredo vazando aqui — é o mesmo dado, reaproveitado.
 *    Conferido em 27/08: a chave responde 200 em terrain-rgb, hybrid e streets.
 */
(function () {
  'use strict';
  if (window.VSMapa3D) return;

  var MAPLIBRE_JS  = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
  var MAPLIBRE_CSS = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';

  var mapa3d = null, caixa = null, carregando = false;

  function chave() {
    try { return window.MT_KEY || 'e6KNrY7JKTt0ynHM39N6'; } catch (e) { return 'e6KNrY7JKTt0ynHM39N6'; }
  }

  /* onde o mapa de baixo está agora — abrir o 3D em outro lugar desorienta */
  /* ⚠️ 27/08 — `const mapa` e `const _cluster` no mapa.html sao globais de
     ESCOPO, mas const NAO vira propriedade de window. `window.mapa` e
     `window._cluster` davam undefined: o 3D abria no centro padrao e com ZERO
     pontos. Tem que ler o identificador solto. */
  function daPagina(nome) {
    try { return (0, eval)(nome); } catch (e) { return null; }
  }

  function ondeEstamos() {
    try {
      var m = window.mapa || daPagina('mapa');
      var c = m.getCenter();
      return { lng: c.lng, lat: c.lat, zoom: Math.min(m.getZoom(), 17) };
    } catch (e) {
      return { lng: -48.5480, lat: -27.5954, zoom: 13 };   // ilha inteira
    }
  }

  /* os comércios que o mapa 2D JÁ carregou — não busca nada de novo, só
     reaproveita o que está na memória. Se estiver vazio, o 3D abre limpo. */
  function pontosCarregados() {
    var saida = [];
    try {
      var cl = window._cluster || daPagina('_cluster');
      var camadas = (cl && cl.getLayers) ? cl.getLayers() : [];
      for (var i = 0; i < camadas.length && saida.length < 400; i++) {
        var m = camadas[i];
        if (!m || !m.getLatLng) continue;
        var p = m.getLatLng();
        var nome = '';
        try {
          nome = (m.options && (m.options.title || m.options.alt)) || '';
          if (!nome && m.getPopup && m.getPopup()) {
            var h = m.getPopup().getContent();
            nome = String(typeof h === 'string' ? h : (h.textContent || ''))
                     .replace(/<[^>]*>/g, ' ').trim().slice(0, 60);
          }
        } catch (e) {}
        saida.push({ lat: p.lat, lng: p.lng, nome: nome || 'ponto' });
      }
    } catch (e) {}
    return saida;
  }

  function carregarMapLibre() {
    return new Promise(function (ok, falhou) {
      if (window.maplibregl) return ok();
      if (!document.getElementById('mlgl-css')) {
        var l = document.createElement('link');
        l.id = 'mlgl-css'; l.rel = 'stylesheet'; l.href = MAPLIBRE_CSS;
        document.head.appendChild(l);
      }
      var s = document.createElement('script');
      s.src = MAPLIBRE_JS;
      s.onload = function () { ok(); };
      s.onerror = function () { falhou(new Error('não baixou')); };
      document.head.appendChild(s);
    });
  }

  function estilos() {
    if (document.getElementById('vs3d-css')) return;
    var s = document.createElement('style');
    s.id = 'vs3d-css';
    s.textContent =
      '#vs3d{position:fixed;inset:0;z-index:99990;background:#03080f;display:none}' +
      '#vs3d.on{display:block}' +
      '#vs3d-mapa{position:absolute;inset:0}' +
      '#vs3d-x{position:absolute;top:calc(12px + env(safe-area-inset-top,0px));right:12px;z-index:5;' +
        'width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.18);' +
        'background:rgba(3,8,16,.72);color:#e5e7eb;font-size:20px;cursor:pointer;backdrop-filter:blur(6px)}' +
      '#vs3d-dica{position:absolute;left:50%;transform:translateX(-50%);' +
        'bottom:calc(22px + env(safe-area-inset-bottom,0px));z-index:5;pointer-events:none;' +
        'background:rgba(3,8,16,.72);color:#94a3b8;border:1px solid rgba(255,255,255,.12);' +
        'border-radius:12px;padding:8px 14px;font:600 12px system-ui;backdrop-filter:blur(6px);' +
        'transition:opacity .6s;white-space:nowrap}' +
      '#vs3d-carga{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
        'color:#67e8f9;font:700 14px system-ui;z-index:6;text-align:center;padding:20px}' +
      '.vs3d-pino{width:12px;height:12px;border-radius:50%;background:#67e8f9;' +
        'border:2px solid rgba(3,8,16,.9);box-shadow:0 0 10px rgba(103,232,249,.8);cursor:pointer}';
    document.head.appendChild(s);
  }

  function montarCaixa() {
    if (caixa) return caixa;
    estilos();
    caixa = document.createElement('div');
    caixa.id = 'vs3d';
    caixa.innerHTML =
      '<div id="vs3d-mapa"></div>' +
      '<div id="vs3d-carga">🏔️ montando o relevo da ilha…</div>' +
      '<button id="vs3d-x" type="button" aria-label="Fechar o 3D">✕</button>' +
      '<div id="vs3d-dica">arrasta pra girar · dois dedos pra inclinar</div>';
    document.body.appendChild(caixa);
    caixa.querySelector('#vs3d-x').addEventListener('click', fechar);
    return caixa;
  }

  function criarMapa() {
    var onde = ondeEstamos();
    var k = chave();

    mapa3d = new maplibregl.Map({
      container: 'vs3d-mapa',
      style: 'https://api.maptiler.com/maps/hybrid/style.json?key=' + k,
      center: [onde.lng, onde.lat],
      zoom: Math.max(onde.zoom, 12.5),
      pitch: 62,              // inclinação: é isto que faz o morro aparecer
      bearing: -18,
      maxPitch: 80,
      attributionControl: { compact: true }
    });

    mapa3d.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left');

    mapa3d.on('load', function () {
      /* ALTITUDE DE VERDADE — o terrain-rgb guarda a altura do chão dentro da
         cor de cada imagem. Sem isto o mapa fica inclinado mas PLANO, que é o
         erro comum: parece 3D e não é. */
      try {
        mapa3d.addSource('relevo', {
          type: 'raster-dem',
          url: 'https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=' + k,
          tileSize: 256
        });
        // 1.4: os morros da ilha são baixos (Morro da Lagoa ~500 m). No exagero
        // 1.0 quase não se vê; acima de 2 vira desenho animado.
        mapa3d.setTerrain({ source: 'relevo', exaggeration: 1.4 });
        /* ⚠️ `type: 'sky'` NAO existe no MapLibre 4 (e do Mapbox) — dava
           'missing required property source' no console e nenhum ceu. O
           MapLibre tem setSky proprio, e so em versao nova; por isso o teste. */
        if (typeof mapa3d.setSky === 'function') {
          mapa3d.setSky({ 'sky-color': '#0b2545', 'horizon-color': '#89b4d8', 'fog-color': '#cfe3f2' });
        }
      } catch (e) {
        console.warn('[mapa 3d] relevo não entrou:', e);
      }

      /* os comércios que já estavam no mapa de baixo */
      var pts = pontosCarregados();
      pts.forEach(function (p) {
        var el = document.createElement('div');
        el.className = 'vs3d-pino';
        new maplibregl.Marker({ element: el })
          .setLngLat([p.lng, p.lat])
          .setPopup(new maplibregl.Popup({ offset: 14, closeButton: false })
            .setText(p.nome))
          .addTo(mapa3d);
      });

      var carga = document.getElementById('vs3d-carga');
      if (carga) carga.remove();
      var dica = document.getElementById('vs3d-dica');
      if (dica) setTimeout(function () { dica.style.opacity = '0'; }, 4500);
      console.log('[mapa 3d] no ar com ' + pts.length + ' pontos');
    });

    mapa3d.on('error', function (e) {
      var carga = document.getElementById('vs3d-carga');
      if (carga) carga.textContent = 'o relevo não respondeu agora. Tenta de novo daqui a pouco.';
      console.warn('[mapa 3d]', e && e.error);
    });
  }

  function abrir() {
    if (carregando) return;
    carregando = true;
    montarCaixa().classList.add('on');
    carregarMapLibre().then(function () {
      carregando = false;
      if (!mapa3d) criarMapa();
      else { mapa3d.resize(); var o = ondeEstamos(); mapa3d.setCenter([o.lng, o.lat]); }
    }).catch(function () {
      carregando = false;
      var carga = document.getElementById('vs3d-carga');
      if (carga) carga.textContent = 'não consegui baixar o 3D — conexão ruim? O mapa normal continua ali.';
    });
  }

  function fechar() {
    if (!caixa) return;
    caixa.classList.remove('on');
    /* leva o mapa 2D pro lugar onde a pessoa parou no 3D — sair e se perder
       é o jeito mais rápido de a pessoa não voltar a usar */
    try {
      var m2 = window.mapa || daPagina('mapa');
      if (mapa3d && m2) {
        var c = mapa3d.getCenter();
        m2.setView([c.lat, c.lng], Math.round(mapa3d.getZoom()));
      }
    } catch (e) {}
  }

  window.VSMapa3D = { abrir: abrir, fechar: fechar };
  // nome curto pro botão do painel de skins
  window.abrir3D = abrir;
  /* guias3d: suporte a glb com three.js e golem.glb */
})();
