/* vs-mar-painel.js — PAINEL DO MAR com previsão real (18/08/2026).
 *
 * Nasceu porque o boletim antigo repetia sempre o mesmo: a maré era uma senoide
 * calculada só com a HORA do dia, sem data e sem fonte. O DJ pediu dado real —
 * e que, faltando dado, o painel DIGA que falta, em vez de inventar número.
 *
 * Lê /data/previsao-mar.json (Open-Meteo Marine, atualizado de 20 em 20 min).
 * Uso: <div id="vs-mar-painel"></div> na página + este script.
 */
(function () {
  if (window.__vsMarPainel) return; window.__vsMarPainel = 1;

  var css = document.createElement('style');
  css.textContent =
    '#vsmp{margin:18px 0;background:linear-gradient(160deg,#07243a,#0a1a2b);' +
      'border:1px solid rgba(56,189,248,.28);border-radius:16px;padding:14px 14px 10px;color:#eaf2fb}' +
    '#vsmp h3{margin:0 0 2px;font:800 16px system-ui;display:flex;align-items:center;gap:8px}' +
    '#vsmp .fonte{font:600 11px system-ui;color:#7fa8c4;margin-bottom:12px}' +
    '#vsmp .agora{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}' +
    '#vsmp .bloco{flex:1 1 92px;background:rgba(8,32,52,.75);border:1px solid rgba(56,189,248,.18);' +
      'border-radius:12px;padding:9px 10px}' +
    '#vsmp .bloco .r{font:700 10.5px system-ui;color:#8fbdd8;text-transform:uppercase;letter-spacing:.4px}' +
    '#vsmp .bloco .v{font:800 20px system-ui;margin-top:2px;color:#fff}' +
    '#vsmp .bloco .s{font:600 11px system-ui;color:#9fd0e8}' +
    '#vsmp .tit{font:800 12px system-ui;color:#8fbdd8;text-transform:uppercase;margin:4px 0 6px}' +
    '#vsmp .mares{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}' +
    '#vsmp .mare{background:rgba(14,116,144,.22);border:1px solid rgba(56,189,248,.30);' +
      'border-radius:10px;padding:6px 10px;font:700 12.5px system-ui}' +
    '#vsmp .mare small{display:block;font:600 10.5px system-ui;color:#9fd0e8}' +
    '#vsmp table{width:100%;border-collapse:collapse;font:600 12.5px system-ui}' +
    '#vsmp th{text-align:left;color:#8fbdd8;font:700 10.5px system-ui;text-transform:uppercase;padding:4px 6px}' +
    '#vsmp td{padding:5px 6px;border-top:1px solid rgba(255,255,255,.06)}' +
    '#vsmp .barra{display:inline-block;height:7px;border-radius:4px;background:linear-gradient(90deg,#38bdf8,#0ea5e9);vertical-align:middle}' +
    '#vsmp .aviso{background:rgba(180,83,9,.18);border:1px solid rgba(251,146,60,.4);' +
      'border-radius:12px;padding:12px;font:600 13px system-ui;line-height:1.5}';
  document.head.appendChild(css);

  var box = document.createElement('div');
  box.id = 'vsmp';
  box.innerHTML = '<h3>🌊 O mar agora</h3><div class="fonte">buscando…</div>';

  function hhmm(t) { return (t || '').slice(11, 16); }
  function num(v, c) { return (v === null || v === undefined) ? '—' : Number(v).toFixed(c === undefined ? 1 : c); }

  function semDado(motivo) {
    box.innerHTML = '<h3>🌊 O mar agora</h3>' +
      '<div class="aviso">Sem informação do mar neste momento.<br>' +
      '<span style="font-weight:600;font-size:12px;opacity:.85">' + (motivo || 'a fonte não respondeu') +
      '. Assim que voltar, o painel se atualiza sozinho — preferimos não mostrar número do que mostrar número errado.</span></div>';
  }

  function montar(d) {
    if (!d || d.sem_dado) return semDado(d && d.motivo);
    var a = d.agora || {}, l = d.lua || {};
    var seta = /enchendo|subindo/i.test(a.tendencia || '') ? '↑ enchendo' : '↓ vazando';

    var mares = (d.mares || []).map(function (m) {
      return '<div class="mare">' + (m.tipo === 'Preamar' ? '🔺 ' : '🔻 ') + m.hora +
             '<small>' + m.tipo + ' · ' + num(m.nivel_m, 2) + ' m</small></div>';
    }).join('') || '<div class="mare">sem virada prevista<small>nas próximas horas</small></div>';

    var maxOnda = Math.max.apply(null, (d.horas || []).map(function (h) { return h.onda_m || 0; }).concat([1]));
    var linhas = (d.horas || []).slice(0, 9).map(function (h) {
      var larg = Math.round(((h.onda_m || 0) / maxOnda) * 74) + 6;
      return '<tr><td>' + hhmm(h.t) + '</td>' +
             '<td><span class="barra" style="width:' + larg + 'px"></span> ' + num(h.onda_m) + ' m</td>' +
             '<td>' + num(h.periodo_s, 0) + ' s ' + (h.dir || '') + '</td>' +
             '<td>' + num(h.mare_m, 2) + ' m</td></tr>';
    }).join('');

    box.innerHTML =
      '<h3>🌊 O mar agora · ' + (d.local || 'Barra da Lagoa') + '</h3>' +
      '<div class="fonte">' + (d.fonte || 'previsão') + ' · atualizado ' + 
        (d.atualizado ? d.atualizado.slice(11,16) : ) + '</div>' +
      '<div class="agora">' +
        '<div class="bloco"><div class="r">Onda</div><div class="v">' + num(a.onda_m) + ' m</div>' +
          '<div class="s">' + num(a.periodo_s, 0) + ' s · ' + (a.dir || '') + '</div></div>' +
        '<div class="bloco"><div class="r">Maré</div><div class="v">' + num(a.mare_m, 2) + ' m</div>' +
          '<div class="s">' + seta + '</div></div>' +
        '<div class="bloco"><div class="r">Mar</div><div class="v" style="font-size:15px;padding-top:5px">' +
          (a.classe || '—') + '</div><div class="s">&nbsp;</div></div>' +
        '<div class="bloco"><div class="r">Lua</div><div class="v" style="font-size:17px;padding-top:3px">' +
          (l.emoji || '') + ' ' + (l.iluminacao != null ? l.iluminacao + '%' : '') + '</div>' +
          '<div class="s">' + (l.nome || '') + '</div></div>' +
      '</div>' +
      '<div class="tit">Próximas viradas da maré</div><div class="mares">' + mares + '</div>' +
      '<div class="tit">Próximas horas</div>' +
      '<table><tr><th>hora</th><th>onda</th><th>período</th><th>maré</th></tr>' + linhas + '</table>';
  }

  fetch('/data/previsao-mar.json?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(montar)
    .catch(function () { semDado('não consegui falar com o servidor'); });

  function por() {
    var alvo = document.getElementById('vs-mar-painel');
    if (alvo) { alvo.appendChild(box); return; }
    var ref = document.querySelector('.city-header') || document.querySelector('main h1') || document.querySelector('h1');
    if (ref && ref.parentNode) ref.parentNode.insertBefore(box, ref.nextSibling);
    else document.body.appendChild(box);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', por); else por();
})();
