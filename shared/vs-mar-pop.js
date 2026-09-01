/* vs-mar-pop.js — BALÃO DO MAR: dado real, explicado simples, e falado (18/08/2026)
 *
 * TRÊS GESTOS NO BOTÃO 🌊 (pedido do DJ, 18/08 — nada fica fixo na página):
 *   1 toque  → fala e mostra o resumo; QUANDO A FALA ACABA, FECHA SOZINHO.
 *   2 toques → janela com os dados + A CÂMERA AO VIVO da praia.
 *   segurar  → tudo detalhado: viradas da maré e hora a hora.
 * Qualquer um sai no X, no toque fora ou no Esc.
 *
 * Pedido do DJ: "muitos não sabem os nomes da onda, mares ou luas" — então aqui
 * nada é jargão. Em vez de "período 7s SE", diz "onda pequena, boa pra nadar".
 * Aperta e ele FALA, no idioma da pessoa (voz do próprio navegador, custo zero).
 * Tudo vem de /data/previsao-mar.json (Open-Meteo, atualizado de 20 em 20 min).
 * Sem dado, ele diz que não tem — nunca inventa número.
 */
(function () {
  if (window.__vsMarPop) return; window.__vsMarPop = 1;

  /* ── idioma: segue a página; se não souber, segue o aparelho ───────────── */
  function idioma() {
    var l = (document.documentElement.lang || '').toLowerCase();
    if (!l) { try { l = (localStorage.getItem('vs-idioma') || '').toLowerCase(); } catch (e) {} }
    if (!l) l = (navigator.language || 'pt').toLowerCase();
    if (l.indexOf('en') === 0) return 'en';
    if (l.indexOf('es') === 0) return 'es';
    return 'pt';
  }
  var L = idioma();
  var VOZ = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' }[L];

  var T = {
    pt: { tit:'O mar agora', ouvir:'Ouvir', parar:'Parar', fechar:'Fechar',
          agora:'Agora', dias:'Próximos dias', pra:'Pra quem vai',
          pesc:'Pescador', surf:'Surfista', praia:'Banhista', mora:'Morador',
          semdado:'Sem informação do mar agora. Preferimos não mostrar nada a mostrar número errado.',
          sobe:'a água está subindo', desce:'a água está baixando',
          ate:'até as', vento:'Vento', graus:'graus', chuva:'chance de chuva',
          sensa:'sensação de', lua:'Lua', ilum:'iluminada',
          camera:'Câmera ao vivo', camcarrega:'ligando a câmera…',
          camoff:'nenhuma câmera transmitindo agora', camyt:'esta câmera só abre no',
          viradas:'Viradas da maré', horas:'Hora a hora', thonda:'onda', thmare:'maré' },
    en: { tit:'The sea right now', ouvir:'Listen', parar:'Stop', fechar:'Close',
          agora:'Right now', dias:'Next days', pra:'For you',
          pesc:'Fishing', surf:'Surfing', praia:'Beach', mora:'Living here',
          semdado:'No sea data right now. We would rather show nothing than show a wrong number.',
          sobe:'the water is rising', desce:'the water is going down',
          ate:'until', vento:'Wind', graus:'degrees', chuva:'chance of rain',
          sensa:'feels like', lua:'Moon', ilum:'lit',
          camera:'Live camera', camcarrega:'starting camera…',
          camoff:'no camera streaming right now', camyt:'this camera only opens on',
          viradas:'Tide turns', horas:'Hour by hour', thonda:'wave', thmare:'tide' },
    es: { tit:'El mar ahora', ouvir:'Escuchar', parar:'Parar', fechar:'Cerrar',
          agora:'Ahora', dias:'Próximos días', pra:'Para quien va',
          pesc:'Pescador', surf:'Surfista', praia:'Bañista', mora:'Vecino',
          semdado:'Sin información del mar ahora. Preferimos no mostrar nada antes que un número equivocado.',
          sobe:'el agua está subiendo', desce:'el agua está bajando',
          ate:'hasta las', vento:'Viento', graus:'grados', chuva:'probabilidad de lluvia',
          sensa:'sensación de', lua:'Luna', ilum:'iluminada',
          camera:'Cámara en vivo', camcarrega:'encendiendo la cámara…',
          camoff:'ninguna cámara transmitiendo ahora', camyt:'esta cámara solo abre en',
          viradas:'Cambios de marea', horas:'Hora a hora', thonda:'ola', thmare:'marea' }
  }[L];

  /* ── céu: código WMO vira desenho + palavra simples ────────────────────── */
  function ceu(c) {
    var m = {
      0:  ['☀️', {pt:'sol aberto',      en:'clear sky',      es:'sol abierto'}],
      1:  ['🌤️', {pt:'quase sem nuvem', en:'mostly clear',   es:'casi sin nubes'}],
      2:  ['⛅', {pt:'sol entre nuvens',en:'partly cloudy',  es:'sol entre nubes'}],
      3:  ['☁️', {pt:'nublado',         en:'cloudy',         es:'nublado'}],
      45: ['🌫️', {pt:'neblina',         en:'fog',            es:'niebla'}],
      48: ['🌫️', {pt:'neblina',         en:'fog',            es:'niebla'}],
      51: ['🌦️', {pt:'garoa',           en:'drizzle',        es:'llovizna'}],
      53: ['🌦️', {pt:'garoa',           en:'drizzle',        es:'llovizna'}],
      55: ['🌦️', {pt:'garoa forte',     en:'heavy drizzle',  es:'llovizna fuerte'}],
      61: ['🌧️', {pt:'chuva fraca',     en:'light rain',     es:'lluvia ligera'}],
      63: ['🌧️', {pt:'chuva',           en:'rain',           es:'lluvia'}],
      65: ['🌧️', {pt:'chuva forte',     en:'heavy rain',     es:'lluvia fuerte'}],
      80: ['🌦️', {pt:'pancadas',        en:'showers',        es:'chubascos'}],
      81: ['🌦️', {pt:'pancadas',        en:'showers',        es:'chubascos'}],
      82: ['⛈️', {pt:'pancada forte',   en:'heavy showers',  es:'chubasco fuerte'}],
      95: ['⛈️', {pt:'tempestade',      en:'thunderstorm',   es:'tormenta'}],
      96: ['⛈️', {pt:'tempestade',      en:'thunderstorm',   es:'tormenta'}],
      99: ['⛈️', {pt:'tempestade',      en:'thunderstorm',   es:'tormenta'}]
    };
    var e = m[c] || ['🌤️', {pt:'tempo variado', en:'mixed', es:'tiempo variado'}];
    return { i: e[0], txt: e[1][L] };
  }

  /* ── onda em português de gente ────────────────────────────────────────── */
  function ondaSimples(h) {
    if (h == null) return {i:'🌊', t:'—'};
    if (h < 0.5) return {i:'😌', t:{pt:'mar quase parado',en:'sea almost flat',es:'mar casi plano'}[L]};
    if (h < 1.0) return {i:'🌊', t:{pt:'onda pequena',en:'small waves',es:'olas pequeñas'}[L]};
    if (h < 1.8) return {i:'🌊', t:{pt:'onda média',en:'medium waves',es:'olas medianas'}[L]};
    if (h < 2.8) return {i:'⚠️', t:{pt:'onda grande',en:'big waves',es:'olas grandes'}[L]};
    return {i:'🚫', t:{pt:'mar bravo — perigoso',en:'rough sea — dangerous',es:'mar bravo — peligroso'}[L]};
  }
  function ventoSimples(v) {
    if (v == null) return '—';
    if (v < 12) return {pt:'vento fraco',en:'light wind',es:'viento flojo'}[L];
    if (v < 25) return {pt:'vento médio',en:'moderate wind',es:'viento moderado'}[L];
    if (v < 40) return {pt:'vento forte',en:'strong wind',es:'viento fuerte'}[L];
    return {pt:'ventania',en:'gale',es:'vendaval'}[L];
  }
  /* lua: o que interessa é o efeito na maré, não o nome bonito */
  function luaSimples(l) {
    if (!l) return '';
    var forte = (l.iluminacao >= 88 || l.iluminacao <= 12);
    return forte ? {pt:'maré mais forte nestes dias',en:'stronger tides these days',
                    es:'mareas más fuertes estos días'}[L]
                 : {pt:'maré mais fraca nestes dias',en:'weaker tides these days',
                    es:'mareas más suaves estos días'}[L];
  }
  function dia(d) {
    var x = new Date(d + 'T12:00:00');
    return x.toLocaleDateString(VOZ, { weekday: 'short' }).replace('.', '');
  }
  function n(v, c) { return (v == null) ? '—' : Number(v).toFixed(c == null ? 0 : c); }

  /* ── visual ────────────────────────────────────────────────────────────── */
  var css = document.createElement('style');
  css.textContent =
    '#vsmpop-b{position:fixed;right:14px;bottom:96px;z-index:99990;width:56px;height:56px;border-radius:50%;' +
      'background:linear-gradient(145deg,#0ea5e9,#0369a1);color:#fff;border:2px solid rgba(255,255,255,.75);' +
      'font-size:25px;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.45)}' +
    '#vsmpop-ov{position:fixed;inset:0;z-index:99991;display:none;align-items:flex-end;justify-content:center;' +
      'background:rgba(3,10,18,.72);backdrop-filter:blur(4px)}' +
    '#vsmpop-ov.on{display:flex}' +
    '#vsmpop{width:100%;max-width:520px;max-height:88vh;overflow-y:auto;background:linear-gradient(165deg,#07243a,#08182a);' +
      'border:1px solid rgba(56,189,248,.3);border-radius:20px 20px 0 0;padding:16px 16px 22px;color:#eaf2fb}' +
    '@media(min-width:560px){#vsmpop{border-radius:20px;margin-bottom:24px}}' +
    '#vsmpop h4{margin:0 0 12px;font:800 19px system-ui;display:flex;align-items:center;gap:9px}' +
    '#vsmpop .grande{display:flex;align-items:center;gap:14px;background:rgba(8,32,52,.8);border-radius:16px;padding:14px;margin-bottom:10px}' +
    '#vsmpop .grande .ico{font-size:46px;line-height:1}' +
    '#vsmpop .grande .t{font:800 30px system-ui}' +
    '#vsmpop .grande .d{font:600 13px system-ui;color:#a9d4ec}' +
    '#vsmpop .fr{background:rgba(8,32,52,.62);border-left:4px solid #38bdf8;border-radius:12px;' +
      'padding:12px 13px;margin-bottom:9px;font:600 16px system-ui;line-height:1.55;display:flex;align-items:center;gap:11px}' +
    '#vsmpop .fr b{color:#7dd3fc}' +
    '#vsmpop .tit{font:800 11.5px system-ui;color:#8fbdd8;text-transform:uppercase;letter-spacing:.5px;margin:14px 0 7px}' +
    '#vsmpop .dias{display:flex;gap:7px;overflow-x:auto;padding-bottom:4px}' +
    '#vsmpop .d1{flex:0 0 84px;background:rgba(8,32,52,.8);border-radius:12px;padding:9px 6px;text-align:center}' +
    '#vsmpop .d1 .dd{font:700 11px system-ui;color:#8fbdd8;text-transform:uppercase}' +
    '#vsmpop .d1 .ii{font-size:34px;margin:4px 0;line-height:1}' +
    '#vsmpop .d1 .tt{font:800 17px system-ui}' +
    '#vsmpop .d1 .mm{font:600 11px system-ui;color:#8fbdd8}' +
    '#vsmpop .d1 .ch{font:700 10.5px system-ui;color:#67c9f5;margin-top:2px}' +
    '#vsmpop .quem{display:grid;grid-template-columns:1fr 1fr;gap:7px}' +
    '#vsmpop .q{background:rgba(8,32,52,.8);border-radius:11px;padding:10px 11px;font:600 14px system-ui;line-height:1.45}' +
    '#vsmpop .q b{display:block;color:#7dd3fc;font-size:11.5px;text-transform:uppercase;margin-bottom:2px}' +
    '#vsmpop .acoes{display:flex;gap:8px;margin-top:15px}' +
    '#vsmpop .acoes button{flex:1;border:0;border-radius:12px;padding:13px;font:800 14px system-ui;cursor:pointer}' +
    '#vsmpop-falar{background:linear-gradient(145deg,#0ea5e9,#0369a1);color:#fff}' +
    '#vsmpop-x{background:#1e3a52;color:#cfe6f5}' +
    '#vsmpop .mares{display:flex;gap:7px;flex-wrap:wrap}' +
    '#vsmpop .mchip{background:rgba(14,116,144,.22);border:1px solid rgba(56,189,248,.3);border-radius:10px;padding:6px 10px;font:700 12.5px system-ui}' +
    '#vsmpop .mchip small{display:block;font:600 10.5px system-ui;color:#9fd0e8}' +
    '#vsmpop .tb{width:100%;border-collapse:collapse;font:600 12.5px system-ui}' +
    '#vsmpop .tb th{text-align:left;color:#8fbdd8;font:700 10.5px system-ui;text-transform:uppercase;padding:4px 6px}' +
    '#vsmpop .tb td{padding:5px 6px;border-top:1px solid rgba(255,255,255,.06)}' +
    '#vsmpop .camcx{border-radius:12px;overflow:hidden;background:#000;aspect-ratio:16/9}' +
    '#vsmpop .camcx iframe{width:100%;height:100%;border:0;display:block}' +
    '#vsmpop .camaviso{display:flex;align-items:center;justify-content:center;height:100%;color:#9fd0e8;font:600 13px system-ui;text-align:center;padding:10px}' +
    '#vsmpop .fonte{font:600 10.5px system-ui;color:#6f95ae;margin-top:12px;text-align:center}';
  document.head.appendChild(css);

  var btn = document.createElement('button');
  btn.id = 'vsmpop-b'; btn.textContent = '🌊';
  btn.setAttribute('aria-label', T.tit);
  var ov = document.createElement('div'); ov.id = 'vsmpop-ov';
  var pop = document.createElement('div'); pop.id = 'vsmpop';
  ov.appendChild(pop);

  var DADO = null, FALA = null, MODO = 'fala';   // fala | completo | detalhe

  /* A câmera vem do mesmo lugar que o mapa usa — o resolvedor conserta o
     endereço sozinho quando a live troca de id (ver cameras-resolve.py). */
  function cameraDaBarra(cb) {
    fetch('/data/cameras.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var lista = (d && d.cameras) || [];
        var c = lista.filter(function (x) { return x.live && x.embed; })[0] ||
                lista.filter(function (x) { return x.live; })[0] || null;
        cb(c);
      })
      .catch(function () { cb(null); });
  }

  /* ÍCONE PRA TUDO (pedido do DJ, 18/08): o app é pra todas as idades —
     idoso e criança entendem seta e desenho antes de entender número. */
  function setaMare(subindo) { return subindo ? '⬆️' : '⬇️'; }
  function bussola(g) {
    // seta que aponta pra onde o vento vai, girando de verdade
    if (g == null) return '💨';
    return '<span style="display:inline-block;transform:rotate(' + ((g + 180) % 360) +
           'deg);font-size:19px">⬆️</span>';
  }
  function forcaVento(v) {
    if (v == null) return '';
    if (v < 12) return '🍃';
    if (v < 25) return '💨';
    if (v < 40) return '🌬️';
    return '🌪️';
  }
  function termometro(t) {
    if (t == null) return '🌡️';
    if (t <= 12) return '🥶';
    if (t <= 18) return '🧥';
    if (t <= 26) return '🌡️';
    if (t <= 32) return '☀️';
    return '🥵';
  }

  function frases(d) {
    var a = d.agora || {}, t = d.tempo || {}, l = d.lua || {}, ms = d.mares || [];
    var o = ondaSimples(a.onda_m), c = ceu(t.codigo);
    var virada = ms.length ? ms[0] : null;
    var subindo = /enchendo|subindo|rising/i.test(a.tendencia || '');
    var f = [];
    f.push({ i: c.i + termometro(t.temp_c), txt: '<b>' + n(t.temp_c) + '°C</b>, ' + c.txt +
             (t.sensacao_c != null ? ' · ' + T.sensa + ' ' + n(t.sensacao_c) + '°C' : '') });
    f.push({ i: o.i, txt: '<b>' + o.t + '</b> — ' + n(a.onda_m, 1) + ' m' });
    f.push({ i: setaMare(subindo) + '🌊',
             txt: '<b>' + (subindo ? T.sobe : T.desce) + '</b>' +
                  (virada ? ' · ' + T.ate + ' <b>' + virada.hora + '</b>' : '') +
                  (a.mare_m != null ? ' (' + n(a.mare_m, 2) + ' m)' : '') });
    f.push({ i: forcaVento(t.vento_kmh), txt: '<b>' + ventoSimples(t.vento_kmh) + '</b> — ' +
             n(t.vento_kmh) + ' km/h ' + bussola(t.vento_graus) + ' ' + (t.vento_dir || '') });
    f.push({ i: l.emoji || '🌙', txt: '<b>' + (l.nome || '') + '</b>, ' +
             (l.iluminacao != null ? l.iluminacao + '% ' + T.ilum : '') + ' · ' + luaSimples(l) });
    return f;
  }

  function paraQuem(d) {
    var a = d.agora || {}, t = d.tempo || {}, ms = d.mares || [];
    var subindo = /enchendo|subindo|rising/i.test(a.tendencia || '');
    var v = t.vento_kmh || 0, h = a.onda_m || 0;
    var q = [];
    q.push(['🎣 ' + T.pesc, (subindo
      ? {pt:'maré enchendo costuma render mais',en:'rising tide usually bites better',es:'marea subiendo suele rendir más'}[L]
      : {pt:'maré vazando — peixe se afasta da beira',en:'falling tide — fish move out',es:'marea bajando — el pez se aleja'}[L]) +
      (v > 25 ? ' · ' + {pt:'vento atrapalha hoje',en:'wind is a problem today',es:'el viento molesta hoy'}[L] : '')]);
    q.push(['🏄 ' + T.surf, h < 0.5
      ? {pt:'sem onda pra surfar',en:'no surf today',es:'sin olas para surfear'}[L]
      : (h < 1.0 ? {pt:'onda pequena, boa pra aprender',en:'small, good for learning',es:'ola pequeña, buena para aprender'}[L]
                 : {pt:'tem onda — vale ir ver',en:'there are waves — worth a look',es:'hay olas — vale la pena'}[L])]);
    q.push(['🏖️ ' + T.praia, h < 1.0 && v < 25
      ? {pt:'dia tranquilo pra praia',en:'good calm beach day',es:'día tranquilo de playa'}[L]
      : {pt:'mar mexido — cuidado com criança',en:'choppy sea — mind the kids',es:'mar movido — cuidado con niños'}[L]]);
    q.push(['🏠 ' + T.mora, (t.dias && t.dias[0] && t.dias[0].chuva_pct >= 50)
      ? {pt:'leva guarda-chuva hoje',en:'take an umbrella today',es:'lleva paraguas hoy'}[L]
      : {pt:'sem chuva à vista hoje',en:'no rain expected today',es:'sin lluvia hoy'}[L]]);
    return q;
  }

  function textoFalado(d) {
    var a = d.agora || {}, t = d.tempo || {}, l = d.lua || {}, ms = d.mares || [];
    var o = ondaSimples(a.onda_m), c = ceu(t.codigo);
    var subindo = /enchendo|subindo|rising/i.test(a.tendencia || '');
    var p = [];
    if (L === 'en') {
      p.push('Right now in Barra da Lagoa: ' + n(t.temp_c) + ' degrees, ' + c.txt + '.');
      p.push(o.t + ', ' + n(a.onda_m,1) + ' meters.');
      p.push(subindo ? 'The water is rising' : 'The water is going down');
      if (ms.length) p.push('until ' + ms[0].hora + '.');
      p.push(ventoSimples(t.vento_kmh) + ', ' + n(t.vento_kmh) + ' kilometers per hour.');
      p.push('Moon: ' + (l.nome||'') + ', ' + luaSimples(l) + '.');
    } else if (L === 'es') {
      p.push('Ahora en Barra da Lagoa: ' + n(t.temp_c) + ' grados, ' + c.txt + '.');
      p.push(o.t + ', ' + n(a.onda_m,1) + ' metros.');
      p.push(subindo ? 'El agua está subiendo' : 'El agua está bajando');
      if (ms.length) p.push('hasta las ' + ms[0].hora + '.');
      p.push(ventoSimples(t.vento_kmh) + ', ' + n(t.vento_kmh) + ' kilómetros por hora.');
      p.push('Luna: ' + (l.nome||'') + ', ' + luaSimples(l) + '.');
    } else {
      p.push('Agora na Barra da Lagoa: ' + n(t.temp_c) + ' graus, ' + c.txt + '.');
      p.push(o.t + ', ' + n(a.onda_m,1) + ' metros.');
      p.push(subindo ? 'A água está subindo' : 'A água está baixando');
      if (ms.length) p.push('até as ' + ms[0].hora + '.');
      p.push(ventoSimples(t.vento_kmh) + ', ' + n(t.vento_kmh) + ' quilômetros por hora.');
      p.push('Lua ' + (l.nome||'') + ', ' + luaSimples(l) + '.');
    }
    return p.join(' ');
  }

  function falar(fecharNoFim) {
    try {
      if (!('speechSynthesis' in window) || !DADO) return;
      if (speechSynthesis.speaking) { speechSynthesis.cancel(); if (!fecharNoFim) return; }
      FALA = new SpeechSynthesisUtterance(textoFalado(DADO));
      FALA.lang = VOZ; FALA.rate = 0.98;
      if (fecharNoFim) {
        // fecha só quando ACABAR de falar. Se o aparelho não tiver voz, o balão
        // FICA aberto pra pessoa ler — antes ele sumia em 1,8s e quem lê devagar
        // (idoso, criança) perdia a informação.
        FALA.onend = function () { if (MODO === 'fala') fechar(); };
        FALA.onerror = function () { /* sem voz: deixa aberto */ };
      }
      speechSynthesis.speak(FALA);
    } catch (e) { if (fecharNoFim) fechar(); }
  }

  function montar(d) {
    if (!d || d.sem_dado) {
      pop.innerHTML = '<h4>🌊 ' + T.tit + '</h4><div class="fr">' + T.semdado + '</div>' +
        '<div class="acoes"><button id="vsmpop-x">' + T.fechar + '</button></div>';
    } else {
      DADO = d;
      var fr = frases(d).map(function (x) {
        return '<div class="fr"><span style="font-size:26px;flex:0 0 auto">' + x.i + '</span><span>' + x.txt + '</span></div>';
      }).join('');
      var dias = ((d.tempo && d.tempo.dias) || []).map(function (x) {
        var c = ceu(x.codigo);
        return '<div class="d1"><div class="dd">' + dia(x.data) + '</div><div class="ii">' + c.i + '</div>' +
               '<div class="tt">' + n(x.max_c) + '°</div><div class="mm">' + n(x.min_c) + '°</div>' +
               '<div class="ch">💧' + n(x.chuva_pct) + '%</div></div>';
      }).join('');
      var quem = paraQuem(d).map(function (q) {
        return '<div class="q"><b>' + q[0] + '</b>' + q[1] + '</div>';
      }).join('');
      var t = d.tempo || {}, c0 = ceu(t.codigo);
      var horas = (MODO === 'detalhe') ? tabelaHoras(d) : '';
      var mares = (MODO === 'detalhe') ? chipsMare(d) : '';
      var cam = (MODO === 'completo' || MODO === 'detalhe')
        ? '<div class="tit">' + T.camera + '</div><div id="vsmpop-cam" class="camcx">' +
          '<div class="camaviso">' + T.camcarrega + '</div></div>' : '';
      pop.innerHTML =
        '<h4>🌊 ' + T.tit + ' · ' + (d.local || '') + '</h4>' +
        '<div class="grande"><div class="ico">' + c0.i + '</div><div>' +
          '<div class="t">' + n(t.temp_c) + '°C</div>' +
          '<div class="d">' + c0.txt + '</div></div>' +
          '<div style="margin-left:auto;text-align:center">' +
            '<div style="font-size:34px;line-height:1">' + ((d.lua||{}).emoji || '') + '</div>' +
            '<div class="d">' + ((d.lua||{}).iluminacao != null ? (d.lua.iluminacao + '%') : '') + '</div>' +
          '</div></div>' +
        fr +
        (dias ? '<div class="tit">' + T.dias + '</div><div class="dias">' + dias + '</div>' : '') +
        (MODO !== 'fala' ? '<div class="tit">' + T.pra + '</div><div class="quem">' + quem + '</div>' : '') +
        mares + horas + cam +
        '<div class="acoes"><button id="vsmpop-falar">🔊 ' + T.ouvir + '</button>' +
        '<button id="vsmpop-x">' + T.fechar + '</button></div>' +
        '<div class="fonte">' + (d.fonte || '') + ' · ' + (d.atualizado || '').slice(11, 16) + '</div>';
      var bf = document.getElementById('vsmpop-falar');
      if (bf) bf.addEventListener('click', falar);
    }
    var bx = document.getElementById('vsmpop-x');
    if (bx) bx.addEventListener('click', fechar);
  }

  function chipsMare(d) {
    var ms = d.mares || [];
    if (!ms.length) return '';
    return '<div class="tit">' + T.viradas + '</div><div class="mares">' + ms.map(function (m) {
      return '<div class="mchip">' + (m.tipo === 'Preamar' ? '🔺' : '🔻') + ' ' + m.hora +
             '<small>' + m.tipo + ' · ' + n(m.nivel_m, 2) + ' m</small></div>';
    }).join('') + '</div>';
  }

  function tabelaHoras(d) {
    var hs = (d.horas || []).slice(0, 9);
    if (!hs.length) return '';
    return '<div class="tit">' + T.horas + '</div><table class="tb"><tr><th>h</th><th>' +
      T.thonda + '</th><th>' + T.thmare + '</th></tr>' + hs.map(function (h) {
        return '<tr><td>' + (h.t || '').slice(11, 16) + '</td><td>' + n(h.onda_m, 1) + ' m · ' +
               n(h.periodo_s, 0) + 's ' + (h.dir || '') + '</td><td>' + n(h.mare_m, 2) + ' m</td></tr>';
      }).join('') + '</table>';
  }

  function porCamera() {
    var alvo = document.getElementById('vsmpop-cam');
    if (!alvo) return;
    cameraDaBarra(function (c) {
      if (!c) { alvo.innerHTML = '<div class="camaviso">' + T.camoff + '</div>'; return; }
      if (!c.embed) {
        alvo.innerHTML = '<div class="camaviso">' + T.camyt +
          ' <a href="https://youtu.be/' + c.yt + '" target="_blank" rel="noopener">YouTube ↗</a></div>';
        return;
      }
      alvo.innerHTML = '<iframe src="https://www.youtube.com/embed/' + c.yt +
        '?autoplay=1&mute=1&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture" ' +
        'allowfullscreen title="' + (c.nome || '') + '"></iframe>';
    });
  }

  function abrir(modo) {
    MODO = modo || 'fala';
    ov.classList.add('on');
    /* 19/08/2026 — TROCA DE FONTE (pedido do DJ). O mar continua vindo da
       Open-Meteo Marine (onda/maré não têm equivalente brasileiro aberto), mas os
       PRÓXIMOS DIAS passam a vir do previsao-dias.json, que mistura:
         INMET      → temperatura oficial + resumo em português (livre pra uso comercial)
         Open-Meteo → chance de chuva em % e vento em km/h (o INMET não dá)
       Se o arquivo misturado faltar, segue com o antigo — a tela não quebra. */
    Promise.all([
      fetch('/data/previsao-mar.json?t=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch('/data/previsao-dias.json?t=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ])
      .then(function (par) {
        var d = par[0], mix = par[1];
        if (d && d.tempo && mix && mix.dias && mix.dias.length) {
          d.tempo.dias = mix.dias.map(function (x) {
            return { data:x.data, codigo:x.codigo, max_c:x.max_c, min_c:x.min_c,
                     chuva_pct:x.chuva_pct, vento_max_kmh:x.vento_max_kmh,
                     resumo:x.resumo };
          });
          d.credito_dias = mix.credito;
        }
        montar(d);
        if (MODO === 'completo' || MODO === 'detalhe') porCamera();
        // 1 toque: fala e sai sozinho quando termina — não fica ocupando a tela
        if (MODO === 'fala' && d && !d.sem_dado) falar(true);
      })
      .catch(function () { montar(null); });
  }
  function fechar() {
    ov.classList.remove('on');
    try { speechSynthesis.cancel(); } catch (e) {}
  }

  /* 1 toque = fala · 2 toques = dados + câmera · segurar = detalhado */
  var _t = null, _long = false, _timer = null;
  function segurarComeca() {
    _long = false;
    _timer = setTimeout(function () { _long = true; if (_t) { clearTimeout(_t); _t = null; }
                                      abrir('detalhe'); }, 550);
  }
  function segurarTermina() { clearTimeout(_timer); }
  btn.addEventListener('mousedown', segurarComeca);
  btn.addEventListener('touchstart', segurarComeca, { passive: true });
  ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(function (ev) {
    btn.addEventListener(ev, segurarTermina);
  });
  btn.addEventListener('click', function (e) {
    e.preventDefault();
    if (_long) { _long = false; return; }          // já abriu no segurar
    if (_t) { clearTimeout(_t); _t = null; abrir('completo'); return; }   // 2º toque
    _t = setTimeout(function () { _t = null; abrir('fala'); }, 260);      // 1 toque
  });
  ov.addEventListener('click', function (e) { if (e.target === ov) fechar(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechar(); });

  /* 18/08/2026 — o DJ pediu pra TIRAR o ícone de onda solto da página. O botão
     não entra mais no DOM; só o balão entra, pra quem abrir por código. O mar
     continua a um toque na onda dourada ao lado do nome do lugar
     (vs-mar-agora.js), que é ancorada no título e não fica solta. */
  function por() { document.body.appendChild(ov); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', por); else por();
})();
