/* vs-previsao-dias.js — PREVISÃO DOS PRÓXIMOS DIAS (19/08/2026).
 *
 * Nasceu porque o dado JÁ ERA COLETADO e jogado fora: o previsao-mar.json trazia
 * 5 dias de previsão desde 18/08 e nenhuma página mostrava — o vs-mar-painel.js
 * lê o mesmo arquivo mas só usa a parte do mar.
 *
 * FONTE MISTURADA (previsao-mix.py na VPS, de hora em hora):
 *   INMET      → temperatura oficial, resumo em português por período, umidade,
 *                nascer/pôr do sol. É livre pra uso comercial.
 *   Open-Meteo → chance de chuva em %, vento em km/h. (dado CC BY 4.0: o crédito
 *                na tela é OBRIGATÓRIO, não é enfeite)
 *
 * Forma: uma BARRA DE FAIXA por dia (mínima → máxima) numa MESMA régua de
 * temperatura — é o que deixa os dias comparáveis de relance e responde a
 * pergunta real ("esfria quando?"). Os números vão escritos dentro da barra,
 * então a cor é reforço, nunca a única informação.
 *
 * Uso: <div id="vs-previsao-dias"></div> na página + este script.
 */
(function () {
  if (window.__vsPrevisaoDias) return; window.__vsPrevisaoDias = 1;

  var SEM = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  /* Emoji: se veio código WMO da Open-Meteo usa ele; senão lê o texto do INMET. */
  var WMO = {
    0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌦️',53:'🌦️',55:'🌦️',
    56:'🌧️',57:'🌧️',61:'🌧️',63:'🌧️',65:'🌧️',66:'🌧️',67:'🌧️',71:'🌨️',73:'🌨️',
    75:'🌨️',77:'🌨️',80:'🌦️',81:'🌧️',82:'⛈️',85:'🌨️',86:'🌨️',95:'⛈️',96:'⛈️',99:'⛈️'
  };
  function emoji(cod, resumo) {
    /* O resumo do INMET manda: é o texto que aparece na tela. Antes eu usava o
       código WMO da Open-Meteo primeiro e as duas fontes discordavam — saía
       "🌦️ Claro" e "🌦️ Encoberto", que lê como defeito. O código WMO só entra
       quando o INMET não mandou descrição nenhuma. */
    var r = (resumo || '').toLowerCase();
    if (!r) return (cod != null && WMO[cod]) ? WMO[cod] : '🌡️';
    if (/trovoada|tempestade/.test(r)) return '⛈️';
    if (/chuva|pancada|garoa|chuvisco/.test(r)) return /isolada|fraca/.test(r) ? '🌦️' : '🌧️';
    if (/nevoeiro|nevoa|névoa/.test(r))  return '🌫️';
    if (/encoberto|muitas nuvens/.test(r)) return '☁️';
    if (/nuvens|nublado|parcial/.test(r)) return '⛅';
    if (/claro|limpo|sol/.test(r))        return '☀️';
    return '🌡️';
  }

  var css = document.createElement('style');
  css.textContent =
    '#vspd{margin:18px 0;background:linear-gradient(160deg,#07243a,#0a1a2b);' +
      'border:1px solid rgba(56,189,248,.28);border-radius:16px;padding:14px 14px 12px;color:#eaf2fb}' +
    '#vspd h3{margin:0 0 2px;font:800 16px system-ui;display:flex;align-items:center;gap:8px}' +
    '#vspd .fonte{font:600 11px system-ui;color:#7fa8c4;margin-bottom:12px}' +
    '#vspd .esc{display:flex;justify-content:space-between;font:700 10px system-ui;color:#6f97b3;' +
      'letter-spacing:.4px;padding:0 0 5px 74px;border-bottom:1px solid rgba(255,255,255,.07);margin-bottom:2px}' +
    '#vspd .dia{display:flex;align-items:center;gap:8px;padding:7px 0;' +
      'border-bottom:1px solid rgba(255,255,255,.06);position:relative}' +
    '#vspd .dia:last-child{border-bottom:0}' +
    '#vspd .rot{flex:0 0 66px;font:700 12.5px system-ui;color:#eaf2fb;line-height:1.15}' +
    '#vspd .rot small{display:block;font:600 10.5px system-ui;color:#8fbdd8}' +
    '#vspd .cal{flex:1 1 auto;position:relative;height:22px}' +
    '#vspd .trilho{position:absolute;inset:7px 0;background:rgba(255,255,255,.055);border-radius:4px}' +
    '#vspd .faixa{position:absolute;top:4px;height:14px;border-radius:4px;' +
      'display:flex;align-items:center;justify-content:space-between;gap:6px;padding:0 6px;' +
      'box-shadow:0 0 0 2px #0a1a2b}' +
    '#vspd .faixa b{font:800 10.5px system-ui;color:#04121e;white-space:nowrap}' +
    '#vspd .chuva{flex:0 0 52px;text-align:right;font:700 11.5px system-ui;color:#9fd0e8;white-space:nowrap}' +
    '#vspd .chuva i{font-style:normal;opacity:.55}' +
    '#vspd .dica{position:absolute;left:8px;right:8px;bottom:100%;z-index:5;background:#04121e;' +
      'border:1px solid rgba(56,189,248,.45);border-radius:10px;padding:8px 11px;' +
      'font:600 11.5px system-ui;color:#eaf2fb;line-height:1.6;' +
      'opacity:0;pointer-events:none;transition:opacity .12s;box-shadow:0 6px 20px rgba(0,0,0,.5)}' +
    '#vspd .dica b{color:#9fd0e8}' +
    '#vspd .dia:hover .dica,#vspd .dia:focus-within .dica{opacity:1}' +
    '#vspd .dia.baixo .dica{top:100%;bottom:auto}' +
    '#vspd .rod{font:600 10.5px system-ui;color:#6f97b3;margin-top:9px;line-height:1.5}' +
    '#vspd .aviso{background:rgba(180,83,9,.18);border:1px solid rgba(251,146,60,.4);' +
      'border-radius:12px;padding:12px;font:600 13px system-ui;line-height:1.5}' +
    '@media(max-width:420px){#vspd .rot{flex:0 0 54px;font-size:11.5px}' +
      '#vspd .chuva{flex:0 0 44px;font-size:10.5px}#vspd .esc{padding-left:62px}}';
  document.head.appendChild(css);

  var box = document.createElement('div');
  box.id = 'vspd';
  box.innerHTML = '<h3>📅 Próximos dias</h3><div class="fonte">buscando…</div>';

  /* mesma regra do painel do mar: faltando dado, DIZ que falta — não inventa */
  function semDado(motivo) {
    box.innerHTML = '<h3>📅 Próximos dias</h3>' +
      '<div class="aviso">Sem previsão para os próximos dias neste momento.<br>' +
      '<span style="font-weight:600;font-size:12px;opacity:.85">' + (motivo || 'a fonte não respondeu') +
      '. Assim que voltar, o painel se atualiza sozinho — preferimos não mostrar número do que mostrar número errado.</span></div>';
  }

  /* Cor por temperatura — escala DIVERGENTE, não arco-íris: frio azul, cinza
     neutro em 19°C, quente âmbar. Passar por verde/amarelo lia como "bom/ruim",
     que não é o que temperatura quer dizer. É REFORÇO: o número vai escrito
     dentro da barra, então quem não distingue cor lê a mesma coisa. */
  var FRIO = [56,189,248], NEUTRO = [203,213,225], QUENTE = [251,191,36];
  function mix(a, b, p) {
    return 'rgb(' + a.map(function (v, i) { return Math.round(v + (b[i] - v) * p); }).join(',') + ')';
  }
  function cor(t) {
    var p = Math.max(-1, Math.min(1, (t - 19) / 10));
    return p < 0 ? mix(NEUTRO, FRIO, -p) : mix(NEUTRO, QUENTE, p);
  }

  /* Aceita o formato novo (previsao-dias.json, misturado) e o antigo
     (previsao-mar.json), pra página não quebrar se o mix ainda não rodou. */
  function normaliza(d) {
    if (!d) return null;
    if (d.dias && d.dias.length) return d;
    var v = d.tempo && d.tempo.dias;
    if (!v || !v.length) return null;
    return { local: d.local, credito: d.fonte || 'Open-Meteo', atualizado: d.atualizado,
             dias: v.map(function (x) {
               return { data:x.data, min_c:x.min_c, max_c:x.max_c, codigo:x.codigo,
                        chuva_pct:x.chuva_pct, vento_max_kmh:x.vento_max_kmh,
                        resumo:'', periodos:{}, fonte_temp:'Open-Meteo' };
             }) };
  }

  function montar(bruto) {
    var d = normaliza(bruto);
    if (!d) return semDado(bruto && bruto.sem_dado ? (bruto.motivo || 'as fontes não responderam')
                                                   : 'a previsão veio vazia');
    var dias = d.dias;

    /* uma régua só pra todos os dias — é isso que deixa comparar */
    var lo = Math.floor(Math.min.apply(null, dias.map(function (x) { return x.min_c; })) - 1),
        hi = Math.ceil (Math.max.apply(null, dias.map(function (x) { return x.max_c; })) + 1);
    var amp = Math.max(1, hi - lo);
    var pos = function (t) { return ((t - lo) / amp) * 100; };

    /* comparar por TEXTO da data, não por milissegundos: o dia nasce às 12:00 no
       objeto Date e meio dia de diferença arredondava pra 1 = "Amanhã" em HOJE. */
    var ag = new Date();
    var iso = function (dd) {
      return dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') +
             '-' + String(dd.getDate()).padStart(2, '0');
    };
    var HOJE = iso(ag), AMA = iso(new Date(ag.getTime() + 86400000));

    var linhas = dias.map(function (x, i) {
      var dt   = new Date(x.data + 'T12:00:00');
      var nome = x.data === HOJE ? 'Hoje' : x.data === AMA ? 'Amanhã' : SEM[dt.getDay()];
      var ico  = emoji(x.codigo, x.resumo);
      var e = pos(x.min_c), l = Math.max(pos(x.max_c) - e, 17);  // 17% = os dois números cabem sem grudar
      var chuva = (x.chuva_pct == null) ? '<i>—</i>'
                : x.chuva_pct > 0 ? '💧 ' + x.chuva_pct + '%' : '<i>—</i>';

      var p = x.periodos || {};
      var linhaPer = ['manha','tarde','noite'].filter(function (k) { return p[k]; })
        .map(function (k) {
          return '<b>' + (k === 'manha' ? 'manhã' : k) + ':</b> ' + p[k];
        }).join('<br>');

      var det = [];
      if (x.vento_max_kmh != null) det.push('vento até ' + Math.round(x.vento_max_kmh) + ' km/h');
      else if (x.vento_desc) det.push('vento ' + x.vento_desc.toLowerCase() + ' de ' + x.vento_dir);
      if (x.chuva_pct != null) det.push('chuva ' + x.chuva_pct + '%');
      if (x.umidade_max != null) det.push('umidade ' + x.umidade_min + '–' + x.umidade_max + '%');

      /* nos primeiros dias a dica abre pra baixo, senão tapa o topo do painel */
      return '<div class="dia' + (i < 2 ? ' baixo' : '') + '" tabindex="0">' +
          '<div class="rot">' + nome + '<small>' + x.data.slice(8,10) + '/' + x.data.slice(5,7) +
            ' ' + ico + '</small></div>' +
          '<div class="cal"><div class="trilho"></div>' +
            '<div class="faixa" style="left:' + e.toFixed(1) + '%;width:' + l.toFixed(1) + '%;' +
              'background:linear-gradient(90deg,' + cor(x.min_c) + ',' + cor(x.max_c) + ')">' +
              '<b>' + Math.round(x.min_c) + '°</b><b>' + Math.round(x.max_c) + '°</b></div>' +
          '</div>' +
          '<div class="chuva">' + chuva + '</div>' +
          '<div class="dica">' + ico + ' <b>' + nome + '</b> · ' + (x.resumo || 'sem descrição') +
            (linhaPer ? '<br>' + linhaPer : '') +
            '<br>mínima ' + x.min_c + '° · máxima ' + x.max_c + '°' +
            (det.length ? '<br>' + det.join(' · ') : '') +
            (x.nascer ? '<br>🌅 ' + x.nascer + ' · 🌇 ' + x.ocaso : '') +
          '</div>' +
        '</div>';
    }).join('');

    box.innerHTML =
      '<h3>📅 Próximos dias · ' + (d.local || 'Barra da Lagoa') + '</h3>' +
      '<div class="fonte">' + (d.credito || 'previsão') + ' · atualizado ' +
        (d.atualizado ? d.atualizado.slice(11,16) : '—') + '</div>' +
      '<div class="esc"><span>' + lo + '°</span><span>' + Math.round((lo+hi)/2) + '°</span><span>' + hi + '°</span></div>' +
      linhas +
      '<div class="rod">A barra vai da mínima à máxima do dia, todas na mesma régua — ' +
        'quanto mais pra esquerda, mais frio. 💧 é a chance de chuva. ' +
        'Toque num dia pra ver manhã, tarde e noite.</div>';
  }

  /* tenta o arquivo misturado; se ainda não existir, cai no antigo */
  fetch('/data/previsao-dias.json?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (d) return montar(d);
      return fetch('/data/previsao-mar.json?t=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; }).then(montar);
    })
    .catch(function () { semDado('não consegui falar com o servidor'); });

  function por() {
    var alvo = document.getElementById('vs-previsao-dias');
    if (alvo) { alvo.appendChild(box); return; }
    var mar = document.getElementById('vsmp');           // logo abaixo do painel do mar
    if (mar && mar.parentNode) { mar.parentNode.insertBefore(box, mar.nextSibling); return; }
    var ref = document.querySelector('main h1') || document.querySelector('h1');
    if (ref && ref.parentNode) ref.parentNode.insertBefore(box, ref.nextSibling);
    else document.body.appendChild(box);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', por); else por();
})();
