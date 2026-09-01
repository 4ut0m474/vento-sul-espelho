/* vs-bussola.js — BÚSSOLA GRANDONA que aponta pro destino — 12/08/2026
 *
 * Pedido do DJ: "uma bússola grandona fica na tela apontando pra onde tem que
 * ir" — no mapa, no jogo e na caça ao tesouro.
 *
 * POR QUE ISTO EXISTE: o gps-acompanhante.js já seguia a pessoa e já sabia a
 * direção (tem bearing() e pontoCardeal()), mas ele NÃO DESENHAVA NADA na tela —
 * só falava. Quem tocava em "🧭 Me leva" no comércio não via nada acontecer e
 * concluía, com razão, que o botão estava quebrado.
 *
 * Uso:  VSBussola.guiar({lat, lng, nome})   ·   VSBussola.parar()
 * Serve pra qualquer alvo: comércio, ponto do jogo, tesouro da caça.
 */
(function () {
  if (window.VSBussola) return;

  var alvo = null, watchId = null, headingAparelho = 0, elo = null;

  var css = document.createElement('style');
  css.textContent =
    '#vsbu{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:99990;' +
      'width:210px;padding:14px 14px 12px;border-radius:20px;text-align:center;' +
      'background:rgba(8,14,22,.90);backdrop-filter:blur(8px);' +
      'border:1px solid rgba(255,213,79,.45);box-shadow:0 12px 40px rgba(0,0,0,.55);display:none}' +
    '#vsbu.on{display:block;animation:vsbuEntra .32s cubic-bezier(.2,1.3,.4,1)}' +
    '@keyframes vsbuEntra{from{opacity:0;transform:translateX(-50%) scale(.82)}' +
      'to{opacity:1;transform:translateX(-50%) scale(1)}}' +
    '#vsbu .ros{position:relative;width:132px;height:132px;margin:0 auto 8px;border-radius:50%;' +
      'background:radial-gradient(circle at 50% 45%,rgba(255,213,79,.16),rgba(0,0,0,.35));' +
      'border:2px solid rgba(255,213,79,.55);' +
      'box-shadow:inset 0 0 22px rgba(255,179,0,.28),0 0 22px rgba(255,179,0,.30)}' +
    '#vsbu .seta{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
      'font-size:66px;line-height:1;transition:transform .28s cubic-bezier(.2,.9,.3,1);' +
      'filter:drop-shadow(0 0 8px #ffd54f) drop-shadow(0 0 18px #ffa000)}' +
    '#vsbu .n{position:absolute;top:5px;left:50%;transform:translateX(-50%);font:800 11px system-ui;' +
      'color:#ffd54f;opacity:.85}' +
    '#vsbu .dist{font:900 25px system-ui;color:#ffd54f;line-height:1;' +
      'text-shadow:0 0 12px rgba(255,179,0,.55);font-variant-numeric:tabular-nums}' +
    '#vsbu .nome{font:700 13px system-ui;color:#eaf2fb;margin-top:3px;line-height:1.3;' +
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#vsbu .card{font:600 11.5px system-ui;color:#9fb3c8;margin-top:2px}' +
    '#vsbu .x{margin-top:9px;width:100%;background:#22303f;color:#eaf2fb;border:0;border-radius:10px;' +
      'padding:9px;font:800 12.5px system-ui;cursor:pointer}' +
    '#vsbu.perto .ros{border-color:#34d399;box-shadow:inset 0 0 22px rgba(16,185,129,.3),0 0 26px rgba(16,185,129,.5);' +
      'animation:vsbuPulsa 1s ease-in-out infinite}' +
    '#vsbu.perto .dist,#vsbu.perto .n{color:#34d399}' +
    '@keyframes vsbuPulsa{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}';
  document.head.appendChild(css);

  var el = document.createElement('div');
  el.id = 'vsbu';
  el.innerHTML =
    '<div class="ros"><div class="n">N</div><div class="seta">⬆️</div></div>' +
    '<div class="dist">—</div><div class="nome"></div><div class="card"></div>' +
    '<button class="x" type="button">Parar de guiar</button>';
  // este arquivo é carregado no <head>: o body ainda não existe aqui.
  function encaixar() {
    if (!document.body) return setTimeout(encaixar, 30);
    if (!el.parentNode) document.body.appendChild(el);
  }
  encaixar();
  el.querySelector('.x').addEventListener('click', parar);

  var D = Math.PI / 180;
  function distancia(a1, o1, a2, o2) {
    var dLat = (a2 - a1) * D, dLng = (o2 - o1) * D;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a1 * D) * Math.cos(a2 * D) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 6371000 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }
  function rumo(a1, o1, a2, o2) {
    var y = Math.sin((o2 - o1) * D) * Math.cos(a2 * D);
    var x = Math.cos(a1 * D) * Math.sin(a2 * D) -
            Math.sin(a1 * D) * Math.cos(a2 * D) * Math.cos((o2 - o1) * D);
    return (Math.atan2(y, x) / D + 360) % 360;
  }
  function cardeal(g) {
    return ['norte','nordeste','leste','sudeste','sul','sudoeste','oeste','noroeste'][Math.round(g / 45) % 8];
  }
  function formatar(m) {
    return m >= 1000 ? (m / 1000).toFixed(m < 10000 ? 1 : 0) + ' km' : Math.round(m) + ' m';
  }

  function pintar(lat, lng) {
    if (!alvo) return;
    var d = distancia(lat, lng, alvo.lat, alvo.lng);
    var b = rumo(lat, lng, alvo.lat, alvo.lng);
    // gira a seta pro alvo, descontando pra onde o aparelho está virado
    el.querySelector('.seta').style.transform = 'rotate(' + (b - headingAparelho) + 'deg)';
    el.querySelector('.dist').textContent = formatar(d);
    el.querySelector('.card').textContent = 'a ' + cardeal(b);
    el.classList.toggle('perto', d < 60);
    if (d < 25 && alvo.onChegou) { try { alvo.onChegou(); } catch (e) {} alvo.onChegou = null; }
  }

  function guiar(o) {
    if (!o || o.lat == null || o.lng == null) return false;
    alvo = { lat: +o.lat, lng: +o.lng, nome: o.nome || 'o destino', onChegou: o.onChegou };
    el.querySelector('.nome').textContent = alvo.nome;
    el.querySelector('.dist').textContent = '…';
    encaixar();
    el.classList.add('on');
    // bússola do aparelho (quando houver): faz a seta valer no mundo real
    if (!elo) {
      elo = function (e) {
        var h = (e.webkitCompassHeading != null) ? e.webkitCompassHeading
              : (e.alpha != null ? 360 - e.alpha : null);
        if (h != null) headingAparelho = h;
      };
      window.addEventListener('deviceorientationabsolute', elo, true);
      window.addEventListener('deviceorientation', elo, true);
    }
    if (!navigator.geolocation) {
      el.querySelector('.dist').textContent = '?';
      el.querySelector('.card').textContent = 'sem GPS neste aparelho';
      return true;
    }
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
    watchId = navigator.geolocation.watchPosition(
      function (p) { pintar(p.coords.latitude, p.coords.longitude); },
      function () { el.querySelector('.card').textContent = 'ligue a localização'; },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 12000 }
    );
    return true;
  }

  function parar() {
    el.classList.remove('on');
    alvo = null;
    if (watchId != null) { try { navigator.geolocation.clearWatch(watchId); } catch (e) {} watchId = null; }
  }

  window.VSBussola = { guiar: guiar, parar: parar, ativa: function () { return !!alvo; } };
})();
