/* vs-cameras-mapa.js — CÂMERAS AO VIVO de Florianópolis no mapa (12/08/2026)
 *
 * Pedido do DJ: as câmeras viram ícones no mapa; tocar abre o ao vivo NA FRENTE
 * do mapa; fechar e ir pra outra.
 *
 * ⚠️ A VERDADE SOBRE O EMBED, pra ninguém se enganar depois:
 * das 6 câmeras, só a "Barra da Lagoa Online" (1k0c7CxKU5g) autoriza ser
 * exibida em outro site. As outras 5 responderam **HTTP 401** no oEmbed do
 * YouTube — o dono do canal desativou a exibição fora do YouTube. Não é vídeo
 * inexistente: é permissão negada. Se fossem embutidas assim, quem tocasse veria
 * "Vídeo indisponível" — vergonha na frente do usuário.
 * Então: quem autoriza abre AQUI DENTRO; quem não autoriza abre no YouTube, e o
 * card avisa antes, sem enganar ninguém. Se algum dono liberar depois, é só
 * virar o `embed` pra true.
 */
(function () {
  if (window.VSCameras) return;

  var CAMERAS = [
    { id: 'cam-barra-1',    nome: 'Barra da Lagoa',        lat: -27.5745, lng: -48.4265,
      // 20/08/2026 — o ID fixo apontava para UMA transmissao, que terminou:
      // o YouTube devolvia UNPLAYABLE "a gravacao dessa transmissao nao esta
      // disponivel". O canal continuava ao vivo, com ID novo. Este endereco
      // segue a live atual do canal e nao quebra a cada transmissao nova.
      yt: '1k0c7CxKU5g', ytCanal: 'UCt5YT3gOz4HXJcPTC_tce-A',
      embed: true,  fonte: 'Barra da Lagoa Online' },
    { id: 'cam-barra-2',    nome: 'Barra da Lagoa · canal', lat: -27.5768, lng: -48.4287,
      yt: 'd4KShpjWoSQ', embed: false, fonte: 'Câmera ao Vivo Florianópolis' },
    { id: 'cam-ponte',      nome: 'Ponte Hercílio Luz',     lat: -27.5947, lng: -48.5653,
      yt: 'qlgxM5bSuEo', embed: false, fonte: 'Porto 1922' },
    { id: 'cam-campeche',   nome: 'Campeche',               lat: -27.6775, lng: -48.4890,
      yt: 'm1wtZJ2aBFs', embed: false, fonte: 'Graffi Hostel' },
    { id: 'cam-lagoinha',   nome: 'Lagoinha do Norte',      lat: -27.3830, lng: -48.4270,
      yt: 'FCWoQ0z-2no', embed: false, fonte: 'Canto da Lagoinha' },
    { id: 'cam-jurere',     nome: 'Jurerê Internacional',   lat: -27.4370, lng: -48.4970,
      yt: 'LEZ4-VkvNKg', embed: false, fonte: 'Caravela' }
  ];

  function esc(s) { return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* ── estilo ─────────────────────────────────────────────────────────── */
  var css = document.createElement('style');
  css.textContent =
    '.vscam-pin{background:none!important;border:0!important}' +
    '.vscam-pin .b{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;' +
      'justify-content:center;font-size:20px;background:linear-gradient(135deg,#e11d48,#f43f5e);' +
      'box-shadow:0 3px 12px rgba(0,0,0,.5);border:2px solid #fff;position:relative}' +
    '.vscam-pin .b::after{content:"";position:absolute;top:-3px;right:-3px;width:10px;height:10px;' +
      'border-radius:50%;background:#22c55e;border:2px solid #fff;animation:vscamPisca 1.6s infinite}' +
    '@keyframes vscamPisca{0%,100%{opacity:1}50%{opacity:.25}}' +
    '#vscam-ov{position:fixed;inset:0;z-index:100001;display:none;align-items:center;' +
      'justify-content:center;background:rgba(4,8,14,.88);backdrop-filter:blur(5px);padding:14px}' +
    '#vscam-ov.on{display:flex}' +
    '#vscam-cx{width:100%;max-width:820px;background:#0d1622;border:1px solid rgba(255,255,255,.14);' +
      'border-radius:16px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.6)}' +
    '#vscam-cab{display:flex;align-items:center;gap:10px;padding:12px 14px;' +
      'border-bottom:1px solid rgba(255,255,255,.10)}' +
    '#vscam-tit{font:800 15px system-ui;color:#eaf2fb;flex:1;line-height:1.3}' +
    '#vscam-tit small{display:block;font:600 11.5px system-ui;color:#8fa6bd;margin-top:2px}' +
    '#vscam-x{background:#22303f;color:#eaf2fb;border:0;border-radius:9px;padding:9px 14px;' +
      'font:800 13px system-ui;cursor:pointer}' +
    '#vscam-corpo{aspect-ratio:16/9;background:#000;display:flex;align-items:center;justify-content:center}' +
    '#vscam-corpo iframe{width:100%;height:100%;border:0;display:block}' +
    '#vscam-aviso{padding:26px 22px;text-align:center;color:#cfe0f0;font:600 14px system-ui;line-height:1.6}' +
    '#vscam-aviso a{display:inline-block;margin-top:14px;background:#e11d48;color:#fff;' +
      'text-decoration:none;padding:12px 20px;border-radius:11px;font-weight:800}' +
    '#vscam-outras{display:flex;gap:8px;overflow-x:auto;padding:11px 12px;' +
      'border-top:1px solid rgba(255,255,255,.10)}' +
    '#vscam-outras button{flex:0 0 auto;background:#1b2836;color:#cfe0f0;border:1px solid rgba(255,255,255,.12);' +
      'border-radius:9px;padding:8px 12px;font:700 12.5px system-ui;cursor:pointer;white-space:nowrap}' +
    '#vscam-outras button.atual{background:#e11d48;color:#fff;border-color:#e11d48}';
  document.head.appendChild(css);

  /* ── janela do ao vivo, por cima do mapa ────────────────────────────── */
  var ov = document.createElement('div');
  ov.id = 'vscam-ov';
  ov.innerHTML =
    '<div id="vscam-cx">' +
      '<div id="vscam-cab"><div id="vscam-tit"></div>' +
      '<button id="vscam-x" type="button">Fechar</button></div>' +
      '<div id="vscam-corpo"></div>' +
      '<div id="vscam-outras"></div>' +
    '</div>';
  document.body.appendChild(ov);
  ov.addEventListener('click', function (e) { if (e.target === ov) fechar(); });
  ov.querySelector('#vscam-x').addEventListener('click', fechar);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechar(); });

  function fechar() {
    ov.classList.remove('on');
    document.getElementById('vscam-corpo').innerHTML = '';   // corta o stream
  }

  function abrir(cam) {
    var tit = document.getElementById('vscam-tit');
    var corpo = document.getElementById('vscam-corpo');
    tit.innerHTML = '🔴 ' + esc(cam.nome) + '<small>ao vivo · ' + esc(cam.fonte) + '</small>';
    if (cam.live === false) {
      tit.innerHTML = '\u26AB ' + esc(cam.nome) +
        '<small>fora do ar agora \u00b7 ' + esc(cam.fonte) + '</small>';
    }
    if (cam.embed && cam.live !== false) {
      // 20/08/2026 — quando a camera tem canal, seguimos a live ATUAL dele.
      // Apontar para um videoId fixo quebra toda vez que a transmissao reinicia:
      // o video antigo vira UNPLAYABLE e o usuario ve "camera indisponivel".
      var fonteYt = cam.ytCanal
        ? 'live_stream?channel=' + esc(cam.ytCanal) + '&'
        : esc(cam.yt) + '?';
      corpo.innerHTML = '<iframe src="https://www.youtube.com/embed/' + fonteYt +
        'autoplay=1&mute=1&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture" ' +
        'allowfullscreen title="' + esc(cam.nome) + ' ao vivo"></iframe>';
    } else {
      // honestidade: o dono desta câmera não deixa exibir fora do YouTube
      corpo.innerHTML =
        '<div id="vscam-aviso">Esta câmera só toca dentro do YouTube —<br>' +
        'quem publica não liberou a exibição em outros sites.' +
        '<br><a href="https://www.youtube.com/watch?v=' + esc(cam.yt) + '" target="_blank" ' +
        'rel="noopener">▶ Ver no YouTube</a></div>';
    }
    // atalho pras outras câmeras, sem fechar
    var outras = document.getElementById('vscam-outras');
    outras.innerHTML = '';
    CAMERAS.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = (c.embed ? '📹 ' : '↗ ') + c.nome;
      if (c.id === cam.id) b.className = 'atual';
      b.addEventListener('click', function () { abrir(c); });
      outras.appendChild(b);
    });
    ov.classList.add('on');
  }

  /* ── põe os pinos no mapa ───────────────────────────────────────────── */
  function pinar() {
    if (typeof L === 'undefined' || typeof mapa === 'undefined' || !mapa) return false;
    var icone = L.divIcon({ className: 'vscam-pin', html: '<div class="b">📹</div>',
                            iconSize: [38, 38], iconAnchor: [19, 19] });
    CAMERAS.forEach(function (cam) {
      var m = L.marker([cam.lat, cam.lng], { icon: icone, riseOnHover: true, zIndexOffset: 1500 });
      m._vc = 'cameras';                       // participa do liga/desliga de camadas
      m._vs = cam; m._vt = 'camera';
      m.on('click', function (e) {
        L.DomEvent.stopPropagation(e);
        // 12/08/2026: no MODO EDIÇÃO o toque é pra editar o ponto, não pra
        // assistir — senão a câmera abria por cima do editor.
        if (window.VSModoEdicao && VSModoEdicao.ligado()) return;
        abrir(cam);
      });
      try { if (typeof ST !== 'undefined' && ST.pins) ST.pins[cam.id] = m; } catch (x) {}
      try {
        var ligada = (typeof ST !== 'undefined' && ST.camadas && ST.camadas.cameras !== false);
        if (ligada) m.addTo(mapa);
      } catch (x) { m.addTo(mapa); }
    });
    try { if (typeof ST !== 'undefined' && ST.camadas && ST.camadas.cameras === undefined)
            ST.camadas.cameras = true; } catch (x) {}
    return true;
  }

  /* 17/08/2026 — POR QUE AS CÂMERAS "PERDIAM O ENDEREÇO":
     o videoId de uma live do YouTube MUDA toda vez que a transmissão reinicia.
     Com id fixo no código, um dia o player mostrava "vídeo indisponível".
     Agora o endereço vem de /data/cameras.json, que o cameras-resolve.py
     atualiza de hora em hora — ele valida canal + ao vivo + embed ANTES de
     publicar (sem essa trava, a página de um canal sem live devolve vídeo
     recomendado de terceiros e a Barra virava praia de outra cidade).
     A lista lá de cima fica como RESERVA: sem JSON, o mapa segue funcionando. */
  function despinar() {
    try {
      CAMERAS.forEach(function (c) {
        var m = (typeof ST !== 'undefined' && ST.pins) ? ST.pins[c.id] : null;
        if (m && typeof mapa !== 'undefined' && mapa) { try { mapa.removeLayer(m); } catch (x) {} }
      });
    } catch (x) {}
  }

  function atualizarDoJson() {
    if (typeof fetch !== 'function') return;
    fetch('/data/cameras.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !Array.isArray(d.cameras) || !d.cameras.length) return;
        despinar();
        CAMERAS.length = 0;
        d.cameras.forEach(function (c) { CAMERAS.push(c); });
        pinar();
      })
      .catch(function () { /* sem JSON: segue com a lista de reserva */ });
  }

  var tentativas = 0;
  (function esperarMapa() {
    if (pinar()) { atualizarDoJson(); return; }
    if (++tentativas > 40) return;
    setTimeout(esperarMapa, 300);
  })();

  window.VSCameras = { lista: CAMERAS, abrir: abrir, fechar: fechar };
})();
