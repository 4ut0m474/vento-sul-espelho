// bg-slideshow.js — plano de fundo temático com crossfade suave + renovação semanal
// Uso: <script src="/shared/bg-slideshow.js" data-bg-theme="rosinha"></script>
// Seeds giram toda semana automaticamente → imagens novas sem deploy
(function () {
  'use strict';

  // Rotação semanal: a cada 7 dias os seeds avançam, produzindo novas imagens
  var WEEK = Math.floor(Date.now() / 604800000);
  function s(base) { return base + WEEK * 41; }  // 41 é primo, espalha bem os seeds

  // Sem imagem externa: fundos LOCAIS (bg/*.webp) — zero Pollinations, nunca quebra.
  var LOCAIS = ['/bg/bg_florianopolis.webp','/bg/bg_praia_crystal.webp','/bg/bg_hero.webp',
                '/bg/bg_aurora.webp','/bg/bg_ponte_floripa.webp','/bg/bg_cafe_praia.webp',
                '/bg/bg_barco_golfinhos.webp','/bg/bg_cafe_steampunk.webp'];
  function img(prompt, seed, w, h) {
    return LOCAIS[Math.abs((seed || 0) + WEEK) % LOCAIS.length];
  }

  var THEMES = {
    rosinha: {
      opacity:1, interval:11000, trans:3000,
      imgs: [
        img('antique brass nautical compass rose, old parchment map background, vintage cartography 1700s, dark moody cinematic', 11),
        img('old pirate treasure map aged parchment, compass rose hand drawn, nautical chart details, sepia dark cinematic', 22),
        img('vintage world map 1600s exploration era, cartography detail, old sailing routes, dark atmospheric cinematic', 33),
        img('antique navigation instruments sextant astrolabe compass, wooden ship deck, dark ocean background cinematic', 44),
        img('historical nautical chart coastline map handdrawn ink, compass rose medieval cartography, dark parchment cinematic', 55),
        img('old Portuguese navigation map, caravel ship sailing routes, ancient world chart, warm sepia dark cinematic', 66),
      ]
    },
    radio: {
      opacity:1, interval:12000, trans:3000,
      imgs: [
        img('vintage 1940s radio broadcasting studio, large analog console, old microphones, warm amber glow, dark cinematic', 11),
        img('antique vacuum tube radio receiver, glowing orange tubes, wooden cabinet, vintage dials, dark atmospheric cinematic', 22),
        img('old shortwave radio station room, many knobs dials meters, retro electronics 1950s, warm ambient cinematic', 33),
        img('classic radio announcer at large vintage microphone, old broadcasting booth, warm amber studio lighting cinematic', 44),
        img('vintage radio transmitter equipment rack, large tube amplifiers, broadcasting station interior, dark retro cinematic', 55),
        img('antique crystal radio set, old radio shop, vintage electronics store, many radios on shelves, warm nostalgic cinematic', 66),
      ]
    },
    'radio-admin': {
      opacity:1, interval:12000, trans:3000,
      imgs: [
        img('epic vintage 1970s radio DJ studio, large mixing console, neon vu meters glowing, dark cinematic masterpiece', 11),
        img('old BBC broadcasting control room 1960s, many analog controls dials, operators headphones, warm amber cinematic', 22),
        img('antique reel to reel tape machines vintage recording studio, warm professional amber glow, dark cinematic', 33),
        img('classic mixing board infinite sliders knobs glowing, vintage sound studio dramatic lighting, dark cinematic epic', 44),
        img('retro radio station transmitter room large equipment, warm amber tubes glowing, 1950s broadcasting cinematic', 55),
        img('vintage vinyl record studio, stacks of records, retro turntables glowing needles, warm dark cinematic', 66),
      ]
    },
    'sala-admin': {
      opacity:1, interval:14000, trans:4000,
      imgs: [
        img('magnificent vintage library, spiraling bookshelves dark wood, warm candlelight, scholars working, epic cinematic', 11),
        img('epic Victorian era study room, globe instruments maps, warm firelight, dark atmospheric masterpiece', 22),
        img('antique university library grand hall, arched ceiling, warm golden light, knowledge atmosphere cinematic', 33),
        img('old scholar observatory room, telescopes instruments, candlelit, dark mystical cinematic masterpiece', 44),
        img('vintage intellectual office many books maps, warm lamp, dark wood paneling, cinematic professional', 55),
      ]
    },
    aurora: {
      opacity:1, interval:14000, trans:3500,
      imgs: [
        img('fantasy RPG map southern Brazil coast mountains, mystical parchment, stars, cinematic dark atmospheric', 99),
        img('medieval fantasy city map illustration, parchment aged, magical glowing lines, dark cinematic', 88),
        img('ancient fantasy quest map, mythical creatures borders, old cartography style, dark mystical cinematic', 77),
        img('RPG adventure map hand drawn ink, mountains forests coast, magical compass rose, dark cinematic', 66),
        img('fantasy game world map glowing runes coastal cliffs, night sky, mystical dark cinematic epic', 55),
      ]
    },
    mapa: {
      opacity:1, interval:12000, trans:3000,
      imgs: [
        img('vintage city map aerial view, old urban planning map, sepia tones, dark cinematic atmospheric', 11),
        img('antique topographic map mountains rivers, hand drawn contour lines, vintage cartography, dark cinematic', 22),
        img('old street map ink on parchment, vintage urban cartography, compass rose, dark sepia cinematic', 33),
        img('historical map southern Brazil Florianopolis coastline, vintage nautical chart, dark atmospheric cinematic', 44),
        img('vintage Floripa island map, Santa Catarina coast, beaches bays detailed old cartography, dark cinematic', 55),
      ]
    },
    comerciante: {
      opacity:1, interval:12000, trans:3000,
      imgs: [
        img('vintage market bazaar, old merchant shop, antique products shelves, warm amber lighting cinematic', 11),
        img('historic market square, old trading post, vintage commerce, warm nostalgic cinematic photography', 22),
        img('antique general store interior, wooden shelves merchandise, old cash register, warm cinematic', 33),
        img('vintage market stalls outdoor, old merchants trade, warm afternoon light, cinematic documentary', 44),
        img('classic Brazilian market fair colorful stalls artisans, warm afternoon golden hour, vintage cinematic', 55),
      ]
    },
    admin: {
      opacity:1, interval:13000, trans:3500,
      imgs: [
        img('epic vintage NASA mission control room, rows of operators, many screens glowing, 1960s retro cinematic masterpiece', 11),
        img('stunning vintage command center Cold War era, analog panels blinking lights, dark dramatic cinematic', 22),
        img('antique telegraph office many operators, Victorian era technology, warm amber light, epic historical cinematic', 33),
        img('old film production control room 1970s, many screens monitors, director chair, dark atmospheric masterpiece cinematic', 44),
        img('vintage air traffic control tower, retro radar screens, dark professional dramatic cinematic', 55),
        img('epic retro computer room IBM mainframe 1960s, operators in suits, blinking lights, warm cinematic masterpiece', 66),
        img('old radio observatory control room, vintage electronics panels, night sky visible, dark cinematic epic', 77),
      ]
    },
    quiz: {
      opacity:1, interval:12000, trans:3000,
      imgs: [
        img('vintage library books shelves, old knowledge, warm amber lamp light, dark cozy cinematic', 11),
        img('antique books old manuscripts, candlelit study room, vintage academic atmosphere, dark cinematic', 22),
        img('old university lecture hall, vintage wooden desks, warm lighting, academic atmosphere cinematic', 33),
        img('ancient scrolls manuscripts books, vintage scholar study, candlelight, dark atmospheric cinematic', 44),
      ]
    },
    // ── Temas novos adicionados 2026-05-19 ────────────────────────────────────
    carteira: {
      opacity:1, interval:12000, trans:3000,
      imgs: [
        img('vintage golden coins treasure chest, antique gold bars wealth, dark atmospheric cinematic masterpiece', 10),
        img('old Victorian bank vault interior, golden coins stacks, ornate iron doors, warm amber cinematic', 20),
        img('antique stock exchange trading floor 1920s, ticker tape machine, dark dramatic financial cinematic', 30),
        img('vintage bank note currency collection, gold coins ancient, wealth prosperity dark cinematic', 40),
        img('old merchant counting house gold coins scales, candlelit, dark wealthy atmospheric cinematic', 50),
      ]
    },
    social: {
      opacity:1, interval:13000, trans:3500,
      imgs: [
        img('vintage Brazilian community gathering, warm evening street celebration, people together, cinematic documentary', 10),
        img('old town square community meeting, vintage architecture, warm afternoon golden light, cinematic', 20),
        img('classic neighborhood block party street festival, warm nostalgia, people celebrating, cinematic', 30),
        img('antique cooperative meeting hall, people united community, warm lamp light, dark cinematic', 40),
        img('vintage Floripa community harbor gathering, fishermen families, warm sunset, dark cinematic', 50),
      ]
    },
    perfil: {
      opacity:1, interval:14000, trans:3500,
      imgs: [
        img('elegant vintage portrait studio photography, warm amber light, ornate Victorian frame, dark cinematic', 10),
        img('antique daguerreotype portrait, Victorian era, warm sepia, dramatic studio lighting cinematic', 20),
        img('classic painter studio portrait sitting, warm amber, vintage frame, old master cinematic', 30),
        img('vintage character study portrait, warm light, detailed face, old photography style, dark cinematic', 40),
      ]
    },
    manifesto: {
      opacity:1, interval:12000, trans:3000,
      imgs: [
        img('vintage revolutionary poster art, bold typography, dark dramatic background, social movement cinematic', 10),
        img('antique political pamphlet printing press, workers solidarity, vintage typography, dark cinematic', 20),
        img('classic manifesto document typewriter old paper, candlelit, vintage revolutionary atmosphere', 30),
        img('old protest movement crowd vintage photography, solidarity unity, dark atmospheric cinematic', 40),
        img('vintage cooperative movement poster art, community workers, bold retro design, dark cinematic', 50),
      ]
    },
    termos: {
      opacity:1, interval:13000, trans:3500,
      imgs: [
        img('antique legal scrolls parchment seals, wax stamps, old law documents, dark atmospheric cinematic', 10),
        img('vintage lawyer office, old legal books, scales of justice, warm amber light, dark cinematic', 20),
        img('classic notary office ancient documents, quill ink, parchment, dark vintage cinematic', 30),
        img('old courthouse interior, vintage law library, leather bound books, warm dramatic cinematic', 40),
      ]
    },
    libras: {
      opacity:1, interval:12000, trans:3000,
      imgs: [
        img('elegant vintage hands signing language, warm amber light, soft focus, dark cinematic portrait', 10),
        img('antique school for the deaf, vintage photography, warm, educational atmosphere, dark cinematic', 20),
        img('classic communication hands gesture art, warm dramatic lighting, vintage illustration style', 30),
        img('vintage education inclusion classroom, warm light, chalk drawings, dark nostalgic cinematic', 40),
      ]
    },
    pitch: {
      opacity:1, interval:12000, trans:3000,
      imgs: [
        img('vintage theater stage spotlight empty, dramatic dark atmosphere, curtains, cinematic masterpiece', 10),
        img('antique concert hall stage, empty auditorium, warm spotlights, elegant dark cinematic', 20),
        img('classic presentation podium vintage, dramatic lighting, empty stage, dark atmospheric cinematic', 30),
        img('old opera house stage interior, warm ornate golden light, dark dramatic cinematic', 40),
        img('vintage startup pitch gathering, old projector light, audience silhouette, warm cinematic', 50),
      ]
    },
    default: {
      opacity:1, interval:13000, trans:3500,
      imgs: [
        img('Florianopolis island aerial view vintage, Santa Catarina coast, warm cinematic photography', 10),
        img('southern Brazil coast dramatic cliffs ocean, warm sunset, vintage cinematic landscape', 20),
        img('Floripa old town historic center, warm afternoon light, vintage architecture, cinematic', 30),
        img('Santa Catarina coast fishing village vintage, boats harbor, warm golden light, cinematic', 40),
        img('South Brazil landscapes mountains ocean sunset, dramatic warm cinematic photography masterpiece', 50),
      ]
    },
  };

  function start() {
    var sc = document.currentScript || document.querySelector('script[data-bg-theme]');
    var name = (sc && sc.getAttribute('data-bg-theme')) || 'default';
    var theme = THEMES[name] || THEMES['default'];

    var css = document.createElement('style');
    css.textContent = [
      'html{background:#04060e}',
      '#bgs-wrap{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}',
      '.bgs-layer{position:absolute;inset:0;background-size:cover;background-position:center center;',
      'opacity:0;transition:opacity ' + theme.trans + 'ms ease-in-out}',
      '.bgs-layer.bgs-on{opacity:' + theme.opacity + '}',
    ].join('');
    document.head.appendChild(css);

    var wrap = document.createElement('div');
    wrap.id = 'bgs-wrap';
    var LA = document.createElement('div'); LA.className = 'bgs-layer';
    var LB = document.createElement('div'); LB.className = 'bgs-layer';
    wrap.appendChild(LA); wrap.appendChild(LB);
    document.body.prepend(wrap);

    var urls = theme.imgs.slice();
    for (var i = urls.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = urls[i]; urls[i] = urls[j]; urls[j] = tmp;
    }

    var ready = [];
    var idx = 0;
    var useA = true;

    function preload(url) {
      var im = new Image();
      im.onload = function() { ready.push(url); };
      im.src = url;
    }

    function showNext() {
      if (!ready.length) return;
      var url = ready[idx % ready.length];
      idx++;
      var next = useA ? LA : LB;
      var prev = useA ? LB : LA;
      next.style.backgroundImage = 'url(' + url + ')';
      next.classList.add('bgs-on');
      setTimeout(function() { prev.classList.remove('bgs-on'); }, theme.trans + 400);
      useA = !useA;
    }

    urls.forEach(preload);

    // Fotos dinâmicas (ex.: imagens do jornal na rádio) entram na rotação do fundo
    window.BgSlideshow = window.BgSlideshow || {};
    window.BgSlideshow.addImages = function(list) {
      (list || []).forEach(function(u) {
        if (u && urls.indexOf(u) === -1) { urls.push(u); preload(u); }
      });
    };

    var initTimer = setInterval(function() {
      if (ready.length > 0) {
        clearInterval(initTimer);
        showNext();
        setInterval(showNext, theme.interval);
      }
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.BgSlideshow = Object.assign(window.BgSlideshow || {}, { themes: Object.keys(THEMES) });
})();
