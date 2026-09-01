/* vs-busca-ia.js — a lupa com as 3 IAs e com voz.
 *
 * 05/08/2026. A lupa já buscava lugar e produto (vs-busca.js). Aqui ela ganha
 * três abas de conversa e um microfone.
 *
 *   🔎 Buscar     — a busca normal, que já existia
 *   🌊 Litorânea  — comércio, produtos, lugares da Ilha
 *   🤖 Automata   — os números do app
 *   🎮 Aurora     — o jogo
 *
 * A VOZ: a pessoa aperta o microfone, fala, e a IA responde falando. Usa o
 * reconhecimento do próprio navegador (nada sai pra serviço pago) e a voz que o
 * app já tem (vs-falar.js). Em navegador sem reconhecimento, o microfone some e
 * a caixa de digitar continua — nunca trava a pessoa de fora.
 *
 * Quando não sabe, ela DIZ que não sabe. Resposta inventada num app de bairro
 * custa mais caro que resposta faltando: quem mora aqui percebe na hora.
 */
(function (root) {
  if (root.VSBuscaIA) return;

  var C = root.VENTOSUL_CONFIG || {};
  var SUPA = C.SUPABASE_URL || 'https://vdrzndgkwdpibexjkyxi.supabase.co';
  var ANON = C.SUPABASE_ANON_JWT || C.SUPABASE_ANON || 'sb_publishable_UuXuHUDxe7nmhE-Z9qu-0w_1tv2IrvC';

  // A dica de cada aba diz o que DIGITAR, com exemplo. Sem isso a pessoa escreve
  // uma frase longa e a busca acha menos — nome do produto sozinho acha mais.
  var IAS = [
    { id: 'litoranea', emoji: '🌊', nome: 'Litorânea', diz: 'comércio, produtos e lugares da Ilha',
      dica: 'Fala só o <b>nome do produto</b> — “cerveja”, “café”, “peixe”, “mel”. Ela acha quem vende, com preço.' },
    { id: 'automata',  emoji: '🤖', nome: 'Automata',  diz: 'os números do app',
      dica: 'Pergunta o <b>número</b> que tu quer: quantas pessoas, quantos comércios, quantos lugares no mapa.' },
    { id: 'aurora',    emoji: '🎮', nome: 'Aurora',    diz: 'o jogo',
      dica: 'Pergunta sobre <b>classes, missões, títulos</b> e como o jogo funciona.' }
  ];

  var CSS = "\
/* 05/08/2026 — o painel cobria a tela inteira e escondia o cabecalho e o rodape.\
   Agora ele mora ENTRE os dois, como toda pagina do app: as alturas sao medidas\
   no aparelho (o entalhe do celular muda o cabecalho de tamanho). */\
#vsia{position:fixed;left:0;right:0;z-index:9980;display:none;flex-direction:column;\
 top:var(--vsia-topo,44px);bottom:var(--vsia-pe,66px);\
 background:#050b16;font-family:system-ui,sans-serif;color:#e8edf5}\
/* o fundo que aparece na quietude: some assim que a pessoa toca em algo */\
#vsia-fundo{position:absolute;inset:0;background-size:cover;background-position:center;\
 opacity:0;transition:opacity 1.6s ease;pointer-events:none;z-index:0}\
#vsia.quieto #vsia-fundo{opacity:.30}\
#vsia > *:not(#vsia-fundo){position:relative;z-index:1}\
#vsia.quieto .vsia-corpo{background:linear-gradient(180deg,rgba(5,11,22,.55),rgba(5,11,22,.75))}\
#vsia.on{display:flex}\
.vsia-topo{padding:14px 14px 0;border-bottom:1px solid #1f2937;background:#0a1120}\
.vsia-abas{display:flex;gap:6px;overflow-x:auto;padding-bottom:10px;-webkit-overflow-scrolling:touch}\
.vsia-aba{flex:0 0 auto;padding:9px 14px;border-radius:99px;border:1px solid #1f2937;\
 background:rgba(255,255,255,.04);color:#9fb3c8;font-size:13.5px;cursor:pointer;white-space:nowrap;font-family:inherit}\
.vsia-aba.on{background:rgba(6,182,212,.18);border-color:#06b6d4;color:#67e8f9;font-weight:700}\
.vsia-dica{font-size:12px;color:#64748b;padding:0 0 10px;line-height:1.4}\
.vsia-corpo{flex:1;overflow-y:auto;padding:14px;-webkit-overflow-scrolling:touch}\
.vsia-bolha{max-width:88%;padding:11px 14px;border-radius:15px;margin-bottom:9px;font-size:14.5px;line-height:1.55}\
.vsia-eu{margin-left:auto;background:rgba(6,182,212,.16);border:1px solid rgba(6,182,212,.35);border-bottom-right-radius:5px}\
.vsia-ela{background:rgba(255,255,255,.05);border:1px solid #1f2937;border-bottom-left-radius:5px}\
.vsia-fonte{font-size:10.5px;color:#64748b;margin-top:6px}\
.vsia-links{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}\
.vsia-link{display:inline-flex;align-items:center;gap:5px;background:rgba(6,214,160,.14);\
 border:1px solid rgba(6,214,160,.4);color:#06d6a0;text-decoration:none;font-size:12.5px;\
 padding:7px 12px;border-radius:99px;font-weight:600}\
.vsia-link:hover{background:rgba(6,214,160,.26)}\
.vsia-vazio{color:#9fb3c8;font-size:14px;line-height:1.65;padding:22px 4px;text-align:center}\
.vsia-exemplos{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin:14px 0 4px}\
.vsia-ex{background:rgba(6,182,212,.14);border:1px solid rgba(6,182,212,.4);color:#67e8f9;\
 border-radius:99px;padding:8px 15px;font-size:13.5px;cursor:pointer;font-family:inherit}\
.vsia-ex:hover{background:rgba(6,182,212,.26)}\
.vsia-vazio b{color:#67e8f9}\
.vsia-pe{padding:11px 14px calc(14px + env(safe-area-inset-bottom,0px));border-top:1px solid #1f2937;\
 background:#0a1120;display:flex;gap:8px;align-items:center}\
.vsia-in{flex:1;background:#050b16;border:1px solid #1f2937;border-radius:12px;color:#e8edf5;\
 padding:12px 14px;font-size:15px;font-family:inherit}\
.vsia-in:focus{outline:none;border-color:#06b6d4}\
.vsia-b{border:0;border-radius:12px;padding:12px 14px;font-size:17px;cursor:pointer;font-family:inherit}\
.vsia-mic{background:rgba(168,85,247,.18);border:1px solid rgba(168,85,247,.45);color:#d8b4fe}\
.vsia-mic.ouvindo{background:#ef4444;border-color:#ef4444;color:#fff;animation:vsiaPulso 1.1s infinite}\
@keyframes vsiaPulso{0%,100%{transform:scale(1)}50%{transform:scale(1.09)}}\
.vsia-ok{background:linear-gradient(135deg,#06b6d4,#a855f7);color:#fff;font-weight:800}\
.vsia-cabeca{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:10px}\
.vsia-tit{font-size:15px;font-weight:800;color:#ffd166}\
.vsia-x{background:rgba(120,120,120,.25);border:0;color:#e8edf5;flex-shrink:0;\
 border-radius:10px;padding:8px 14px;font-size:14px;cursor:pointer;font-family:inherit}\
.vsia-pensando{color:#9fb3c8;font-size:13.5px;padding:4px 2px}";

  var aba = 'busca', ouvindo = false, rec = null;

  function estilo() {
    if (document.getElementById('vsia-css')) return;
    var s = document.createElement('style'); s.id = 'vsia-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }
  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(id) { return document.getElementById(id); }

  function temMic() {
    return !!(root.SpeechRecognition || root.webkitSpeechRecognition);
  }

  function bolha(txt, minha, fonte, links) {
    var c = $('vsia-corpo'); if (!c) return;
    var d = document.createElement('div');
    d.className = 'vsia-bolha ' + (minha ? 'vsia-eu' : 'vsia-ela');
    // Os links vem PRONTOS do servidor — a IA nao escreve endereco, porque
    // inventaria caminho e mandaria a pessoa pro 404 com toda a confianca.
    var botoes = '';
    if (links && links.length) {
      botoes = '<div class="vsia-links">' + links.map(function (l) {
        var fora = /^https?:/.test(l.url);
        return '<a class="vsia-link" href="' + esc(l.url) + '"' +
               (fora ? ' target="_blank" rel="noopener"' : '') + '>' +
               esc(l.ico || '→') + ' ' + esc(l.rotulo) + '</a>';
      }).join('') + '</div>';
    }
    d.innerHTML = esc(txt) + botoes + (fonte ? '<div class="vsia-fonte">' + esc(fonte) + '</div>' : '');
    c.appendChild(d);
    c.scrollTop = c.scrollHeight;
    return d;
  }

  function falar(txt) {
    try {
      if (root.VSFalar && root.VSFalar.falar) return root.VSFalar.falar(txt);
      if (root.speechSynthesis) {
        var u = new SpeechSynthesisUtterance(txt);
        u.lang = 'pt-BR';
        speechSynthesis.speak(u);
      }
    } catch (e) {}
  }

  function perguntar(texto, comVoz) {
    if (!texto || !texto.trim()) return;
    bolha(texto, true);
    var pensando = bolha('…', false);
    pensando.className = 'vsia-pensando';
    pensando.textContent = (IAS.filter(function (i) { return i.id === aba; })[0] || {}).nome + ' está pensando…';

    fetch(SUPA + '/functions/v1/litoranea-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ANON, apikey: ANON },
      body: JSON.stringify({ pergunta: texto, persona: aba, cidade: 'Florianópolis' })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        pensando.remove();
        var resp = (d && d.resposta) || 'Não tenho essa informação.';
        var de = { base_de_perguntas: 'do banco de perguntas do bairro',
                   cache: 'já respondida antes',
                   ia: d && d.com_dados ? 'com dado do banco' : 'sem fonte no banco',
                   recusado: '' }[d && d.origem] || '';
        bolha(resp, false, de, d && d.links);
        if (comVoz) falar(resp);
      })
      .catch(function () {
        pensando.remove();
        bolha('Não consegui responder agora. Tenta de novo daqui a pouco.', false);
      });
  }

  function ligarMic() {
    var Rec = root.SpeechRecognition || root.webkitSpeechRecognition;
    if (!Rec) return;
    var b = $('vsia-mic');
    if (ouvindo) { try { rec && rec.stop(); } catch (e) {} return; }

    rec = new Rec();
    rec.lang = 'pt-BR';
    rec.interimResults = true;
    rec.continuous = false;

    rec.onstart = function () { ouvindo = true; b.classList.add('ouvindo'); $('vsia-in').placeholder = 'Ouvindo… pode falar'; };
    rec.onresult = function (e) {
      var t = '';
      for (var i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
      $('vsia-in').value = t;
      if (e.results[e.results.length - 1].isFinal) {
        rec.stop();
        perguntar(t, true);          // respondeu por voz → responde falando
        $('vsia-in').value = '';
      }
    };
    rec.onerror = function (e) {
      ouvindo = false; b.classList.remove('ouvindo');
      $('vsia-in').placeholder = e.error === 'not-allowed'
        ? 'Precisa liberar o microfone no navegador' : 'Escreve aqui…';
    };
    rec.onend = function () { ouvindo = false; b.classList.remove('ouvindo'); $('vsia-in').placeholder = 'Escreve aqui…'; };
    try { rec.start(); } catch (e) {}
  }

  function trocarAba(id) {
    aba = id;
    document.querySelectorAll('.vsia-aba').forEach(function (b) {
      b.classList.toggle('on', b.dataset.aba === id);
    });
    var ia = IAS.filter(function (i) { return i.id === id; })[0];
    $('vsia-dica').innerHTML = ia
      ? ia.emoji + ' ' + ia.dica
      : '🔎 Busca por nome de lugar ou de produto.';
    $('vsia-corpo').innerHTML = '';
    if (!ia) {
      // aba de busca: quem responde e o componente que ja existia (vs-busca.js).
      // Aqui so explicamos o que ela faz — o resultado aparece na propria caixa dele.
      $('vsia-corpo').innerHTML = '<div class="vsia-vazio">Escreve o nome de um <b>lugar</b> ou de um <b>produto</b>' +
        ' e aperta <b>Ir</b>.<br><br>Produto vem com <b>preço</b> e <b>onde encontrar</b>.' +
        '<br>Lugar vem com a <b>distância</b> de onde tu está.</div>';
    } else {
      var exemplos = { litoranea: ['cerveja', 'café', 'peixe', 'mel'],
                       automata:  ['quantas pessoas', 'quantos comércios'],
                       aurora:    ['classes', 'missões', 'títulos'] }[ia.id] || [];
      $('vsia-corpo').innerHTML = '<div class="vsia-vazio">' + ia.dica +
        (exemplos.length ? '<div class="vsia-exemplos">' + exemplos.map(function (e) {
          return '<button class="vsia-ex" data-ex="' + esc(e) + '">' + esc(e) + '</button>';
        }).join('') + '</div>' : '') +
        (temMic() ? '<br>Pode escrever, tocar num exemplo, ou <b>apertar o microfone</b> e falar.' : '') +
        '</div>';
      $('vsia-corpo').querySelectorAll('[data-ex]').forEach(function (b) {
        b.onclick = function () { perguntar(b.dataset.ex, false); };
      });
    }
  }

  // As barras mudam de altura conforme o aparelho (entalhe, fonte grande).
  // Medir de verdade e mais confiavel que chutar um numero.
  function medirBarras() {
    var h = document.getElementById('vs-ph') || document.getElementById('header');
    var f = document.getElementById('vs-pf') || document.getElementById('bottom-bar');
    var r = document.documentElement.style;
    if (h && h.offsetHeight) r.setProperty('--vsia-topo', h.offsetHeight + 'px');
    if (f && f.offsetHeight) r.setProperty('--vsia-pe', f.offsetHeight + 'px');
  }

  // Fundo da quietude: se a pessoa parar de mexer, a foto da Ilha aparece por
  // tras. Qualquer toque, tecla ou rolagem faz ela sumir na hora — a foto nunca
  // atrapalha quem esta usando, so preenche o silencio.
  var FUNDOS = ['/bg/bg_florianopolis.webp', '/bg/bg_praia_crystal.webp',
                '/bg/bg_hero.webp', '/bg/bg_barco_golfinhos.webp',
                '/bg/bg_ponte_floripa.webp'];
  var relogio = null;
  function acordar() {
    var el = $('vsia'); if (!el) return;
    el.classList.remove('quieto');
    clearTimeout(relogio);
    relogio = setTimeout(function () {
      var f = $('vsia-fundo');
      if (f && !f.style.backgroundImage) {
        f.style.backgroundImage = 'url(' + FUNDOS[Math.floor(Math.random() * FUNDOS.length)] + ')';
      }
      el.classList.add('quieto');
    }, 12000);   // 12 segundos parado
  }
  function armarQuietude() {
    ['click', 'keydown', 'input', 'touchstart', 'scroll', 'pointermove']
      .forEach(function (ev) { $('vsia').addEventListener(ev, acordar, { passive: true }); });
    acordar();
  }

  function montar() {
    estilo();
    if ($('vsia')) return $('vsia');
    var el = document.createElement('div');
    el.id = 'vsia';
    el.innerHTML =
      '<div class="vsia-topo">' +
        '<div class="vsia-cabeca"><span class="vsia-tit">🔎 Buscar e perguntar</span>' +
          '<button class="vsia-x" id="vsia-x">Fechar</button></div>' +
        '<div class="vsia-abas">' +
          '<button class="vsia-aba on" data-aba="busca">🔎 Buscar</button>' +
          IAS.map(function (i) {
            return '<button class="vsia-aba" data-aba="' + i.id + '">' + i.emoji + ' ' + i.nome + '</button>';
          }).join('') +
        '</div>' +
        '<div class="vsia-dica" id="vsia-dica">🔎 Busca por nome de lugar ou de produto.</div>' +
      '</div>' +
      '<div class="vsia-corpo" id="vsia-corpo"></div>' +
      '<div class="vsia-pe">' +
        '<input class="vsia-in" id="vsia-in" placeholder="Só o nome do produto…" autocomplete="off">' +
        (temMic() ? '<button class="vsia-b vsia-mic" id="vsia-mic" title="Falar">🎤</button>' : '') +
        '<button class="vsia-b vsia-ok" id="vsia-ok">Ir</button>' +
      '</div>';
    el.insertAdjacentHTML('afterbegin', '<div id="vsia-fundo"></div>');
    document.body.appendChild(el);
    medirBarras();
    armarQuietude();

    el.querySelectorAll('.vsia-aba').forEach(function (b) {
      b.onclick = function () { trocarAba(b.dataset.aba); };
    });
    $('vsia-x').onclick = fechar;
    if ($('vsia-mic')) $('vsia-mic').onclick = ligarMic;
    $('vsia-ok').onclick = enviar;
    $('vsia-in').addEventListener('keydown', function (e) { if (e.key === 'Enter') enviar(); });
    return el;
  }

  function enviar() {
    var t = $('vsia-in').value.trim();
    if (!t) return;
    $('vsia-in').value = '';
    if (aba === 'busca') {
      // a busca normal continua sendo do componente antigo
      if (root.VSBusca && root.VSBusca.abrir) { fechar(); return root.VSBusca.abrir(t); }
      bolha('A busca de lugares e produtos está na lupa do rodapé.', false);
      return;
    }
    perguntar(t, false);
  }

  function abrir(qual) {
    montar();
    medirBarras();
    acordar();
    $('vsia').classList.add('on');
    if (qual) trocarAba(qual);
    setTimeout(function () { try { $('vsia-in').focus(); } catch (e) {} }, 120);
  }
  function fechar() {
    try { rec && rec.stop(); } catch (e) {}
    var el = $('vsia'); if (el) el.classList.remove('on');
  }

  root.VSBuscaIA = { abrir: abrir, fechar: fechar, perguntar: perguntar, IAS: IAS };
})(window);
