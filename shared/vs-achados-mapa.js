/* vs-achados-mapa.js — ACHADOS ESCONDIDOS (18/08/2026)
 *
 * Coisas que só existem quando você está EM CIMA do lugar. Não é o app
 * escondendo por educação: o texto vem cifrado com a célula de mapa (~55 m) e a
 * chave nasce do seu GPS. Sem ir lá, o aparelho não tem como abrir — nem quem
 * mexe no código, porque o texto não está escrito no arquivo.
 *
 * O GPS erra alguns metros, então tentamos as 9 células ao redor. O texto certo
 * começa com o selo "VS1|" — é assim que se sabe que acertou.
 */
(function () {
  if (window.__vsAchados) return; window.__vsAchados = 1;
  var CH = 'vs.achados.barra', CFG = null, VIGIA = null, ABERTO = null;
  var feitos = {}; try { feitos = JSON.parse(localStorage.getItem(CH) || '{}'); } catch (e) {}
  var salva = function () { localStorage.setItem(CH, JSON.stringify(feitos)); };

  async function sha(b) { return new Uint8Array(await crypto.subtle.digest('SHA-256', b)); }
  function bytes(s) { return new TextEncoder().encode(s); }
  async function decifra(b64, chaveTxt) {
    var chave = await sha(bytes(chaveTxt));
    var dados = Uint8Array.from(atob(b64), function (c) { return c.charCodeAt(0); });
    var ks = [];
    for (var i = 0; ks.length < dados.length; i++) {
      var c = new Uint8Array(4); new DataView(c.buffer).setUint32(0, i);
      var j = new Uint8Array(chave.length + 4); j.set(chave); j.set(c, chave.length);
      var d = await sha(j); for (var k = 0; k < d.length; k++) ks.push(d[k]);
    }
    var out = new Uint8Array(dados.length);
    for (var m = 0; m < dados.length; m++) out[m] = dados[m] ^ ks[m];
    var txt = new TextDecoder().decode(out);
    return txt.indexOf('VS1|') === 0 ? txt.slice(4) : null;   // selo: acertou a célula
  }
  function dist(a, b, c, d) {
    var R = 6371000, r = Math.PI / 180;
    var x = (c - a) * r, y = (d - b) * r * Math.cos((a + c) / 2 * r);
    return Math.round(Math.sqrt(x * x + y * y) * R);
  }
  /* tenta a célula da pessoa e as 8 vizinhas — GPS nunca é exato */
  async function abrirCom(ach, lat, lng, g) {
    for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
      var cel = (Math.round(lat / g) + dx) + ':' + (Math.round(lng / g) + dy);
      var t = await decifra(ach.conteudo_cifrado, cel);
      if (t) return t;
    }
    return null;
  }

  var css = document.createElement('style');
  css.textContent =
    '#vsach-ov{position:fixed;inset:0;z-index:100002;display:none;align-items:center;justify-content:center;' +
      'background:rgba(2,8,14,.86);backdrop-filter:blur(5px);padding:14px}' +
    '#vsach-ov.on{display:flex}' +
    '#vsach{width:100%;max-width:520px;max-height:86vh;overflow-y:auto;color:#eaf2fb;' +
      'background:linear-gradient(165deg,#2a1e05,#0a1a2b);border:2px solid #fbbf24;border-radius:20px;padding:18px}' +
    '#vsach h3{margin:0 0 4px;font:800 22px system-ui;display:flex;gap:10px;align-items:center}' +
    '#vsach .cnt{font:600 16px system-ui;line-height:1.65;white-space:pre-wrap;margin:10px 0}' +
    '#vsach .tar{background:rgba(251,191,36,.14);border:1px solid rgba(251,191,36,.5);border-radius:12px;' +
      'padding:12px;font:700 15px system-ui;margin:10px 0}' +
    '#vsach .pat{background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.4);border-radius:12px;' +
      'padding:12px;font:600 14px system-ui;margin:10px 0}' +
    '#vsach button{width:100%;border:0;border-radius:12px;padding:14px;font:800 15px system-ui;margin-top:8px;cursor:pointer}' +
    '#vsach .ok{background:linear-gradient(145deg,#f59e0b,#b45309);color:#fff}' +
    '#vsach .fe{background:#1e3a52;color:#cfe6f5}' +
    '#vsach-radar{position:fixed;left:14px;bottom:96px;z-index:99989;background:rgba(6,26,43,.94);' +
      'border:1px solid rgba(251,191,36,.5);border-radius:14px;padding:9px 12px;color:#fde68a;' +
      'font:700 12.5px system-ui;max-width:60vw;display:none;box-shadow:0 8px 22px rgba(0,0,0,.5)}' +
    '#vsach-radar.on{display:block}';
  document.head.appendChild(css);

  var ov = document.createElement('div'); ov.id = 'vsach-ov';
  var cx = document.createElement('div'); cx.id = 'vsach'; ov.appendChild(cx);
  var radar = document.createElement('div'); radar.id = 'vsach-radar';

  function fechar() { ov.classList.remove('on'); ABERTO = null; }

  function mostrar(ach, texto) {
    ABERTO = ach.id;
    var t = ach.tarefa || {}, p = ach.patrocinio;
    cx.innerHTML =
      '<h3>' + (ach.icone || '📍') + ' ' + ach.nome + '</h3>' +
      '<div class="cnt">' + texto + '</div>' +
      (t.texto ? '<div class="tar">📸 ' + t.texto + '</div>' : '') +
      (p ? '<div class="pat">🏪 <b>' + p.nome + '</b>' + (p.oferta ? '<br>' + p.oferta : '') + '</div>' : '') +
      ((t.foto || t.video)
        ? '<input type="file" accept="' + (t.video ? 'video/*' : 'image/*') + '" capture="environment" ' +
          'id="vsach-arq" style="width:100%;font-size:15px;margin-top:6px">' : '') +
      '<button class="ok" id="vsach-guardar">Guardar este achado</button>' +
      '<button class="fe" id="vsach-x">Fechar</button>';
    ov.classList.add('on');
    document.getElementById('vsach-x').onclick = fechar;
    document.getElementById('vsach-guardar').onclick = function () {
      feitos[ach.id] = { quando: new Date().toISOString(), texto: texto };
      salva(); fechar(); pintaRadar(null);
    };
  }

  function pintaRadar(pos) {
    if (!CFG) return;
    var falta = CFG.achados.filter(function (a) { return !feitos[a.id]; });
    if (!falta.length) {
      radar.className = 'on';
      radar.innerHTML = '🏆 você achou todos os ' + CFG.achados.length + ' escondidos';
      return;
    }
    if (!pos) { radar.className = 'on'; radar.innerHTML = '🔎 ' + falta.length + ' escondido(s) por perto'; return; }
    var perto = falta.map(function (a) {
      return { a: a, m: dist(pos.coords.latitude, pos.coords.longitude, a.lat, a.lng) };
    }).sort(function (x, y) { return x.m - y.m; })[0];
    radar.className = 'on';
    var m = perto.m;
    var quente = m < 120 ? '🔥 quase em cima' : m < 400 ? '🌡️ tá perto' : m < 1500 ? '❄️ ainda longe' : '🧊 muito longe';
    radar.innerHTML = quente + '<br><span style="font-weight:600;opacity:.85">' +
      (m > 999 ? (m / 1000).toFixed(1) + ' km' : m + ' m') + ' · faltam ' + falta.length + '</span>';
  }

  async function olhar(pos) {
    pintaRadar(pos);
    if (ABERTO) return;
    var la = pos.coords.latitude, lo = pos.coords.longitude;
    for (var i = 0; i < CFG.achados.length; i++) {
      var a = CFG.achados[i];
      if (feitos[a.id]) continue;
      if (dist(la, lo, a.lat, a.lng) > (a.raio_m || 50)) continue;
      var txt = await abrirCom(a, la, lo, CFG.grade || 0.0005);
      if (txt) { mostrar(a, txt); return; }
    }
  }

  fetch('/data/achados-mapa.json?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (c) {
      if (!c || !c.achados) return;
      CFG = c;
      document.body.appendChild(ov); document.body.appendChild(radar);
      pintaRadar(null);
      if (navigator.geolocation) {
        VIGIA = navigator.geolocation.watchPosition(olhar, function () {
          radar.className = 'on'; radar.innerHTML = '📍 ligue o GPS pra caçar';
        }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
      }
      radar.onclick = function () {
        var falta = CFG.achados.filter(function (x) { return !feitos[x.id]; });
        if (!falta.length) return;
        ABERTO = 'pista';
        cx.innerHTML = '<h3>🔎 O que falta achar</h3>' +
          falta.map(function (x) {
            return '<div class="cnt" style="border-left:3px solid #fbbf24;padding-left:10px">' +
                   (x.icone || '📍') + ' <b>' + x.nome + '</b>\n' + (x.pista || 'sem pista — ande pela vila.') + '</div>';
          }).join('') +
          '<button class="fe" id="vsach-x">Fechar</button>';
        ov.classList.add('on');
        document.getElementById('vsach-x').onclick = fechar;
      };
    })
    .catch(function () {});

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechar(); });
  ov.addEventListener('click', function (e) { if (e.target === ov) fechar(); });
})();
