/* vs-modo-edicao.js — MODO EDIÇÃO do mapa: você decide o que está onde — 12/08/2026
 *
 * Pedido do DJ: "o primeiro botão do FAB é pra isso; quando eu apertar modo
 * edição posso mudar o ícone, o lugar e a descrição do ponto. Eu que decido
 * onde e o que está onde e faz o que."
 *
 * Como funciona:
 *   liga o modo  -> os pinos editáveis ficam ARRASTÁVEIS e com contorno piscando
 *   arrasta       -> muda o lugar
 *   toca no pino  -> abre o editor: ícone, nome e descrição
 *   desliga       -> volta ao normal
 *
 * ONDE SALVA (2ª volta, 12/08): agora PUBLICA PRA TODOS.
 * Tabela mapa_pontos: qualquer um LÊ, só ADMIN escreve (RLS eh_role), e o DONO
 * edita o ponto dele — é isso que permite o comerciante marcar a própria porta.
 * O localStorage virou rascunho; "🌎 Publicar" manda pro banco e vale pra ilha.
 * Os NPCs continuam com o editor próprio deles, que já grava no banco.
 */
(function () {
  if (window.VSModoEdicao) return;

  var CHAVE = 'vs.mapa.edicoes';
  var ligado = false;

  /* 12/08/2026 — AGORA PUBLICA PRA TODOS.
     O DJ apontou o furo: "se eu, que sou administrador, não consigo fazer a
     mudança valer, como é que o comerciante vai marcar a porta da loja dele?".
     Tinha razão — salvar só no aparelho não é funcionalidade, é ilusão.
     Os pontos passaram a viver na tabela mapa_pontos: qualquer um LÊ, só o
     ADMIN escreve (RLS com eh_role('admin')), e o DONO edita o ponto dele.
     O localStorage vira só rascunho até apertar Publicar. */
  var SUPA = (window.VENTOSUL_CONFIG && window.VENTOSUL_CONFIG.SUPABASE_URL) ||
             'https://vdrzndgkwdpibexjkyxi.supabase.co';
  var ANON = 'sb_publishable_UuXuHUDxe7nmhE-Z9qu-0w_1tv2IrvC';

  function _sessao() {
    try { return (window.VSSupabase && VSSupabase.getSession && VSSupabase.getSession()) || null; }
    catch (e) { return null; }
  }
  function _token() {
    var s = _sessao();
    // ⚠️ o token mora DENTRO de .session, não na raiz (mesma pegadinha dos favoritos)
    return s && ((s.session && s.session.access_token) || s.access_token) || null;
  }
  function _cabecalho() {
    var t = _token();
    return { apikey: ANON, Authorization: 'Bearer ' + (t || ANON), 'Content-Type': 'application/json' };
  }

  /* manda TODAS as edições pro banco de uma vez */
  function publicarPraTodos() {
    var todas = carregar();
    var ids = Object.keys(todas);
    if (!ids.length) { try { vsToast('Nada editado ainda'); } catch (e) {} return; }
    if (!_token()) { try { vsToast('Entre na sua conta de admin pra publicar'); } catch (e) {} return; }
    var linhas = ids.map(function (id) {
      var e = todas[id];
      return { id: id, tipo: 'camera', nome: e.nome || null, descricao: e.desc || null,
               ico: e.ico || null, lat: e.lat, lng: e.lng, publicado: true,
               extra: { fx: e.fx || '' },
               atualizado_em: new Date().toISOString() };
    });
    fetch(SUPA + '/rest/v1/mapa_pontos', {
      method: 'POST',
      headers: Object.assign({}, _cabecalho(), { Prefer: 'resolution=merge-duplicates' }),
      body: JSON.stringify(linhas)
    }).then(function (r) {
      if (r.ok) {
        try { vsToast('🌎 Publicado! ' + linhas.length + ' ponto(s) valem pra todo mundo'); } catch (e) {}
        window.VSMEUltimoErro = null;
        return;
      }
      /* 13/08/2026 — DIZ O QUE DEU ERRADO, não "não deu".
         O DJ publicou e a tabela continuou vazia; o toast antigo só mostrava o
         número do status, então não dava pra saber se era sessão vencida, RLS ou
         payload. Agora o motivo aparece na tela e fica em VSMEUltimoErro. */
      return r.text().then(function (txt) {
        var motivo = '';
        try { motivo = (JSON.parse(txt).message || '').slice(0, 90); } catch (e) { motivo = (txt || '').slice(0, 90); }
        window.VSMEUltimoErro = { status: r.status, corpo: txt };
        var msg;
        if (r.status === 401 || r.status === 403) {
          msg = '🔒 O banco recusou (' + r.status + '). Sua sessão pode ter vencido — saia e entre de novo. ' + motivo;
        } else {
          msg = '❌ Não publicou (' + r.status + '): ' + motivo;
        }
        try { vsToast(msg); } catch (e) { alert(msg); }
      });
    }).catch(function (e) {
      window.VSMEUltimoErro = { status: 'rede', corpo: String(e && e.message) };
      try { vsToast('📡 Não chegou no servidor: ' + (e && e.message ? e.message : 'sem internet')); } catch (x) {}
    });
  }

  /* traz do banco o que já está publicado — é o que faz a mudança aparecer
     pra quem NÃO editou, inclusive deslogado */
  function puxarDoBanco() {
    return fetch(SUPA + '/rest/v1/mapa_pontos?select=id,nome,descricao,ico,lat,lng,extra&publicado=is.true',
                 { headers: { apikey: ANON, Authorization: 'Bearer ' + ANON } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (d) {
        if (!Array.isArray(d) || !d.length) return;
        var todas = carregar();
        d.forEach(function (p) {
          // o que veio do banco é a verdade pra todo mundo
          todas[p.id] = { ico: p.ico, nome: p.nome, desc: p.descricao, lat: p.lat, lng: p.lng,
                          fx: (p.extra && p.extra.fx) || '' };
        });
        gravar(todas);
      }).catch(function () {});
  }

  function carregar() {
    try { return JSON.parse(localStorage.getItem(CHAVE) || '{}'); } catch (e) { return {}; }
  }
  function gravar(o) {
    try { localStorage.setItem(CHAVE, JSON.stringify(o)); } catch (e) {}
  }

  /* 12/08/2026 — ÍCONES PRONTOS E EFEITOS, pedido do DJ: "faz aparecer os
     ícones que podem ser usados e efeitos que podem ser colocados". Em vez de
     digitar emoji na mão, toca e escolhe. */
  /* 12/08/2026 — biblioteca grande, por família. O DJ pediu bicho da região,
     barco pra pôr no mar e o que mais desse. São emoji: vêm da fonte do sistema,
     então funcionam offline, escalam sem borrar e não pesam nada. */
  var FAMILIAS = [
    { nome: 'Bichos daqui', itens: ['🐬','🐋','🐳','🐢','🦭','🦦','🐧','🦆','🦢','🐦','🕊️','🦜','🦩',
                                    '🦉','🦅','🐊','🦈','🐟','🐠','🐡','🦐','🦀','🦞','🦑','🐙','🐚',
                                    '🐴','🐄','🐖','🐑','🐕','🐈','🦌','🐒','🦥','🐀'] },
    { nome: 'Barcos e mar', itens: ['⛵','🚤','🛥️','🛶','⛴️','🚢','⚓','🪝','🎣','🏄','🏊','🤿','🚣',
                                    '🌊','🏝️','🏖️','🗿','⛱️','🩴','🐚'] },
    { nome: 'Comer e beber', itens: ['🍽️','🍔','🍕','🍣','🍤','🦪','🥘','🍲','🥗','🍞','🥖','🧀',
                                     '☕','🍺','🍻','🍷','🧉','🍹','🍦','🍰','🧁','🍫'] },
    { nome: 'Lugares', itens: ['🏪','🏬','🏨','🛏️','🏥','💊','⛽','🏦','🏫','⛪','🏛️','🏟️','🎪',
                               '🏭','🏗️','🗼','⛲','🎡','🎢','🎠'] },
    { nome: 'Natureza', itens: ['🌳','🌴','🌵','🌲','🍃','🌺','🌻','🌸','🌾','🍄','⛰️','🌋','🏔️',
                                '☀️','🌙','⭐','🌈','⚡','🔥','💧','❄️','🌀'] },
    { nome: 'Cultura e festa', itens: ['🎸','🎺','🥁','🎻','🪕','🎷','🎤','🎧','📻','🎬','🎭','🎨',
                                       '🎪','🎊','🎉','🪅','💃','🕺','🎯','🎲'] },
    { nome: 'Marcações', itens: ['📹','📍','⭐','❤️','🔴','🟢','🔵','🟡','🟣','⚠️','❗','❓','✅',
                                 '🏴‍☠️','🗺️','🧭','🚩','🔔','💡','🛠️'] }
  ];
  var ICONES = FAMILIAS.reduce(function (a, f) { return a.concat(f.itens); }, []);
  var EFEITOS = [
    { id: '',        nome: 'sem efeito' },
    { id: 'pulsa',   nome: '💓 pulsar' },
    { id: 'coloras', nome: '🌈 pulsar colorido' },
    { id: 'ouro',    nome: '✨ brilho dourado' },
    { id: 'salta',   nome: '⬆️ saltitando' },
    { id: 'gira',    nome: '🔄 girando' },
    { id: 'balanca', nome: '🎐 balançando' },
    { id: 'flutua',  nome: '🎈 flutuando' },
    { id: 'nada',    nome: '🌊 nadando (vai e volta)' },
    { id: 'treme',   nome: '📳 tremendo' },
    { id: 'sonar',   nome: '📡 onda de sonar' },
    { id: 'neon',    nome: '💡 neon piscando' },
    { id: 'arco',    nome: '🌈 arco-íris' },
    { id: 'sombra',  nome: '🌑 sombra funda' }
  ];
  var efeitoAtual = '';

  var css = document.createElement('style');
  css.textContent =
    '.vsme-on .vscam-pin .b{outline:3px dashed #fbbf24;outline-offset:3px;' +
      'animation:vsmePisca 1.1s ease-in-out infinite}' +
    '@keyframes vsmePisca{0%,100%{outline-color:#fbbf24}50%{outline-color:#f97316}}' +
    '#vsme-barra{position:fixed;left:50%;transform:translateX(-50%);bottom:82px;z-index:99993;' +
      'background:rgba(120,53,15,.95);color:#fff;border:1px solid #f59e0b;border-radius:12px;' +
      'padding:9px 15px;font:800 12.5px system-ui;display:none;align-items:center;gap:10px;' +
      'box-shadow:0 8px 24px rgba(0,0,0,.5)}' +
    '#vsme-barra.on{display:flex}' +
    '#vsme-barra button{background:#f59e0b;color:#1a1000;border:0;border-radius:8px;' +
      'padding:7px 11px;font:800 12px system-ui;cursor:pointer}' +
    '#vsme-ed{position:fixed;inset:0;z-index:99994;display:none;align-items:center;' +
      'justify-content:center;background:rgba(3,7,12,.8);padding:16px}' +
    '#vsme-ed.on{display:flex}' +
    '#vsme-cx{width:100%;max-width:400px;background:#0e1926;border:1px solid rgba(255,255,255,.14);' +
      'border-radius:16px;padding:18px}' +
    '#vsme-cx h3{font:800 16px system-ui;color:#eaf2fb;margin:0 0 14px}' +
    '#vsme-cx label{display:block;font:700 11.5px system-ui;color:#8fa6bd;margin:11px 0 5px;' +
      'text-transform:uppercase;letter-spacing:.05em}' +
    '#vsme-cx input,#vsme-cx textarea{width:100%;box-sizing:border-box;background:#16232f;' +
      'color:#eaf2fb;border:1px solid rgba(255,255,255,.14);border-radius:9px;padding:10px;' +
      'font:600 14px system-ui}' +
    '#vsme-cx textarea{min-height:66px;resize:vertical}' +
    '#vsme-cx .lin{display:flex;gap:8px;margin-top:16px}' +
    '#vsme-cx .lin button{flex:1;border:0;border-radius:10px;padding:12px;font:800 13px system-ui;cursor:pointer}' +
    '#vsme-salvar{background:#10b981;color:#04231a}' +
    '#vsme-copiar,#vsme-publicar{background:#3b82f6;color:#fff}' +
    '#vsme-fechar{background:#22303f;color:#eaf2fb}' +
    '#vsme-icones{display:flex;flex-wrap:wrap;gap:6px;max-height:132px;overflow-y:auto;' +
      'background:#0b141f;border:1px solid rgba(255,255,255,.10);border-radius:9px;padding:8px}' +
    '#vsme-icones button{background:#16232f;border:1px solid transparent;border-radius:8px;' +
      'font-size:19px;line-height:1;padding:6px 7px;cursor:pointer}' +
    '#vsme-icones button.sel{border-color:#34d399;background:#0d3d33}' +
    '#vsme-icones .vsme-fam{flex:0 0 100%;font:800 10.5px system-ui;letter-spacing:.06em;' +
      'text-transform:uppercase;color:#7f9ab4;margin:6px 0 2px}' +
    '#vsme-icones{max-height:190px}' +
    '#vsme-efeitos{display:flex;flex-wrap:wrap;gap:6px}' +
    '#vsme-efeitos button{background:#16232f;color:#b9cbdb;border:1px solid rgba(255,255,255,.10);' +
      'border-radius:8px;font:700 12px system-ui;padding:8px 10px;cursor:pointer}' +
    '#vsme-efeitos button.sel{background:#7c3aed;color:#fff;border-color:#c4b5fd}' +
    /* os efeitos, aplicados no pino do mapa */
    '.vsfx-pulsa .b{animation:vsfxPulsa 1.2s ease-in-out infinite}' +
    '@keyframes vsfxPulsa{0%,100%{transform:scale(1)}50%{transform:scale(1.22)}}' +
    '.vsfx-coloras .b{animation:vsfxCor 2.4s linear infinite,vsfxPulsa 1.2s ease-in-out infinite}' +
    '@keyframes vsfxCor{0%{filter:hue-rotate(0deg) saturate(1.4)}100%{filter:hue-rotate(360deg) saturate(1.4)}}' +
    '.vsfx-ouro .b{box-shadow:0 0 10px #ffd54f,0 0 24px #ffa000!important;' +
      'animation:vsfxOuro 1.6s ease-in-out infinite}' +
    '@keyframes vsfxOuro{0%,100%{box-shadow:0 0 8px #ffd54f,0 0 18px #ffa000}' +
      '50%{box-shadow:0 0 16px #ffd54f,0 0 36px #ff8f00}}' +
    '.vsfx-salta .b{animation:vsfxSalta 1s ease-in-out infinite}' +
    '@keyframes vsfxSalta{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}' +
    '.vsfx-gira .b{animation:vsfxGira 3s linear infinite}' +
    '@keyframes vsfxGira{to{transform:rotate(360deg)}}' +
    '.vsfx-balanca .b{animation:vsfxBal 2s ease-in-out infinite;transform-origin:50% 0}' +
    '@keyframes vsfxBal{0%,100%{transform:rotate(-11deg)}50%{transform:rotate(11deg)}}' +
    '.vsfx-flutua .b{animation:vsfxFlu 3.2s ease-in-out infinite}' +
    '@keyframes vsfxFlu{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-13px) rotate(3deg)}}' +
    '.vsfx-nada .b{animation:vsfxNada 4s ease-in-out infinite}' +
    '@keyframes vsfxNada{0%,100%{transform:translateX(-13px) scaleX(1)}' +
      '49%{transform:translateX(13px) scaleX(1)}50%{transform:translateX(13px) scaleX(-1)}' +
      '99%{transform:translateX(-13px) scaleX(-1)}}' +
    '.vsfx-treme .b{animation:vsfxTre .35s linear infinite}' +
    '@keyframes vsfxTre{0%,100%{transform:translate(0,0)}25%{transform:translate(-2px,1px)}' +
      '50%{transform:translate(2px,-1px)}75%{transform:translate(-1px,-2px)}}' +
    '.vsfx-sonar .b{position:relative}' +
    '.vsfx-sonar .b::before{content:"";position:absolute;inset:-6px;border-radius:14px;' +
      'border:2px solid currentColor;opacity:.8;animation:vsfxSonar 1.8s ease-out infinite}' +
    '@keyframes vsfxSonar{0%{transform:scale(.7);opacity:.9}100%{transform:scale(2.1);opacity:0}}' +
    '.vsfx-neon .b{animation:vsfxNeon 1.1s ease-in-out infinite}' +
    '@keyframes vsfxNeon{0%,100%{box-shadow:0 0 6px #22d3ee,0 0 14px #06b6d4;filter:brightness(1)}' +
      '50%{box-shadow:0 0 18px #22d3ee,0 0 40px #06b6d4;filter:brightness(1.35)}}' +
    '.vsfx-arco .b{animation:vsfxArco 3s linear infinite}' +
    '@keyframes vsfxArco{0%{box-shadow:0 0 14px #ef4444}20%{box-shadow:0 0 14px #f59e0b}' +
      '40%{box-shadow:0 0 14px #22c55e}60%{box-shadow:0 0 14px #06b6d4}' +
      '80%{box-shadow:0 0 14px #a855f7}100%{box-shadow:0 0 14px #ef4444}}' +
    '.vsfx-sombra .b{filter:drop-shadow(0 8px 10px rgba(0,0,0,.85))}';
  document.head.appendChild(css);

  var barra = document.createElement('div');
  barra.id = 'vsme-barra';
  barra.innerHTML = '<span>✏️ Modo edição — arraste os pinos ou toque pra editar</span>' +
                    '<button type="button" id="vsme-sair">Sair</button>';
  var ed = document.createElement('div');
  ed.id = 'vsme-ed';
  ed.innerHTML =
    '<div id="vsme-cx"><h3>✏️ Editar ponto</h3>' +
    '<label>Ícone — toque pra escolher</label><input id="vsme-ico" maxlength="4">' +
    '<div id="vsme-icones"></div>' +
    '<label>Efeito no mapa</label><div id="vsme-efeitos"></div>' +
    '<label>Nome</label><input id="vsme-nome">' +
    '<label>Descrição</label><textarea id="vsme-desc"></textarea>' +
    '<label>Lugar</label><input id="vsme-pos" readonly>' +
    '<div class="lin"><button type="button" id="vsme-mover">📍 Arrastar no mapa</button></div>' +
    '<div class="lin"><button id="vsme-salvar">Salvar</button>' +
    '<button id="vsme-publicar">🌎 Publicar</button>' +
    '<button id="vsme-fechar">Fechar</button></div></div>';

  function encaixar() {
    if (!document.body) return setTimeout(encaixar, 40);
    if (!barra.parentNode) { document.body.appendChild(barra); document.body.appendChild(ed); }
  }
  encaixar();

  var editando = null;

  /* 13/08/2026 — CONSTRÓI UMA VEZ SÓ.
     Isto recriava os 142 ícones + 14 efeitos (156 botões, cada um com seu
     listener) A CADA TOQUE em qualquer ícone ou efeito — era a "lentidão quando
     estou configurando" que o DJ sentiu. Agora a grade nasce uma vez e trocar de
     escolha só move a classe .sel de um botão pro outro. */
  var gradePronta = false, botoesIco = [], botoesFx = [];

  function montarGrade() {
    if (gradePronta) return;
    var gi = document.getElementById('vsme-icones');
    var ge = document.getElementById('vsme-efeitos');
    if (!gi || !ge) return;
    var fragI = document.createDocumentFragment();
    FAMILIAS.forEach(function (fam) {
      var t = document.createElement('div');
      t.className = 'vsme-fam';
      t.textContent = fam.nome;
      fragI.appendChild(t);
      fam.itens.forEach(function (ic) {
        var b = document.createElement('button');
        b.type = 'button'; b.textContent = ic; b._ico = ic;
        b.addEventListener('click', function () {
          document.getElementById('vsme-ico').value = ic;
          marcarIco(ic);
        });
        botoesIco.push(b);
        fragI.appendChild(b);
      });
    });
    gi.appendChild(fragI);

    var fragE = document.createDocumentFragment();
    EFEITOS.forEach(function (ef) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = ef.nome; b._fx = ef.id;
      b.addEventListener('click', function () {
        efeitoAtual = ef.id;
        marcarFx(ef.id);
        // mostra o efeito NA HORA no pino, pra decidir vendo
        if (editando) aplicarEfeito(editando.m, ef.id);
      });
      botoesFx.push(b);
      fragE.appendChild(b);
    });
    ge.appendChild(fragE);
    gradePronta = true;
  }

  function marcarIco(ic) {
    botoesIco.forEach(function (b) { b.className = (b._ico === ic) ? 'sel' : ''; });
  }
  function marcarFx(fx) {
    botoesFx.forEach(function (b) { b.className = (b._fx === fx) ? 'sel' : ''; });
  }

  function pintarEscolhas(icoAtual) {
    montarGrade();
    marcarIco(icoAtual);
    marcarFx(efeitoAtual);
  }
  function aplicarEfeito(m, id) {
    var el = m && (m._icon || (m.getElement && m.getElement()));
    if (!el) return;
    EFEITOS.forEach(function (x) { if (x.id) el.classList.remove('vsfx-' + x.id); });
    if (id) el.classList.add('vsfx-' + id);
  }

  function abrirEditor(cam, marcador) {
    editando = { cam: cam, m: marcador };
    var e = carregar()[cam.id] || {};
    efeitoAtual = e.fx || '';
    document.getElementById('vsme-ico').value  = e.ico  || '📹';
    pintarEscolhas(e.ico || '📹');
    document.getElementById('vsme-nome').value = e.nome || cam.nome || '';
    document.getElementById('vsme-desc').value = e.desc || cam.fonte || '';
    var ll = marcador.getLatLng();
    document.getElementById('vsme-pos').value = ll.lat.toFixed(5) + ', ' + ll.lng.toFixed(5);
    // o botão diz a verdade sobre o que vai acontecer, em vez de deixar a dúvida
    try {
      var bs = document.getElementById('vsme-salvar');
      var bp = document.getElementById('vsme-publicar');
      if (bs) bs.textContent = ehAdmin ? 'Salvar e publicar' : 'Salvar aqui';
      if (bp) bp.style.display = ehAdmin ? 'none' : '';   // virou redundante pro admin
    } catch (e) {}
    ed.classList.add('on');
  }

  /* 13/08/2026 — PRA ADMIN, SALVAR JÁ PUBLICA.
     O DJ editou os ícones pelo celular e no PC não tinha mudado nada. A tabela
     mapa_pontos estava VAZIA: ele apertou "Salvar" (que gravava só no aparelho)
     e nunca o "🌎 Publicar" ao lado. Não é distração dele — é errado exigir dois
     botões pra fazer valer o que a pessoa acabou de editar. Quem é admin salva e
     publica no mesmo toque; quem não é continua guardando no próprio aparelho,
     que é tudo que a RLS deixaria fazer de qualquer jeito. */
  function salvar() {
    if (!editando) return;
    var todas = carregar();
    var ll = editando.m.getLatLng();
    todas[editando.cam.id] = {
      ico:  document.getElementById('vsme-ico').value.trim() || '📹',
      nome: document.getElementById('vsme-nome').value.trim(),
      desc: document.getElementById('vsme-desc').value.trim(),
      lat: +ll.lat.toFixed(6), lng: +ll.lng.toFixed(6),
      fx: efeitoAtual || ''
    };
    gravar(todas);
    aplicar(editando.cam, editando.m);
    ed.classList.remove('on');
    if (ehAdmin) { publicarPraTodos(); return; }   // o toast vem de lá, com o resultado real
    try { vsToast('✅ Ponto salvo neste aparelho'); } catch (e) {}
  }

  /* devolve o trecho pronto pra colar no vs-cameras-mapa.js — é assim que a
     mudança passa a valer pra todo mundo, não só pra quem editou */
  function copiarProCodigo() {
    var todas = carregar();
    var linhas = Object.keys(todas).map(function (id) {
      var e = todas[id];
      return "    { id: '" + id + "', nome: '" + (e.nome || '').replace(/'/g, "\\'") +
             "', lat: " + e.lat + ", lng: " + e.lng +
             ", ico: '" + (e.ico || '📹') + "', fonte: '" + (e.desc || '').replace(/'/g, "\\'") + "' },";
    }).join('\n');
    var txt = linhas || '(nada editado ainda)';
    try {
      navigator.clipboard.writeText(txt);
      vsToast('📋 Copiado — cole no vs-cameras-mapa.js');
    } catch (e) { alert(txt); }
  }

  function aplicar(cam, m) {
    var e = carregar()[cam.id];
    if (!e) return;
    if (e.lat && e.lng) m.setLatLng([e.lat, e.lng]);
    if (e.ico) {
      try {
        m.setIcon(L.divIcon({ className: 'vscam-pin',
          html: '<div class="b">' + e.ico + '</div>', iconSize: [38, 38], iconAnchor: [19, 19] }));
      } catch (x) {}
    }
    if (e.nome) cam.nome = e.nome;
    if (e.desc) cam.fonte = e.desc;
    if (e.fx !== undefined) setTimeout(function () { aplicarEfeito(m, e.fx); }, 60);
  }

  /* 12/08/2026 — AGORA VALE PRA TODO PONTO DO MAPA.
     O DJ pôs um 🎸 pra representar a rádio e viu que "a aba dele é antiga e não
     tem as opções de efeito como a câmera": a edição só enxergava as câmeras.
     Agora pega TODOS os pinos (câmeras, comércio, turismo, guias, o que houver),
     cada um com o mesmo editor de ícone, efeito, nome e lugar. */
  /* 13/08/2026 — SÓ O QUE ESTÁ NA TELA.
     A versão de ontem devolvia ST.pins INTEIRO. Como ST.pins acumula comércio,
     NPCs, histórico, trilhas e as ÁRVORES, isso virava milhares de marcadores:
     ligar o modo desmontava o cluster marcador a marcador (trava de segundos,
     FAB junto), o fitBounds abria SC inteira e o CSS punha animação infinita em
     tudo. Continua valendo pra TODO tipo de pino — só que um de cada vez, o que
     você está olhando. Pra editar outro, navegue até ele: a lista se refaz. */
  var TETO = 200;   // teto duro, mesmo dentro da vista
  function pinosEditaveis() {
    var lista = [], vistos = {};
    try {
      if (typeof ST === 'undefined' || !ST.pins) return lista;
      if (typeof mapa === 'undefined') return lista;
      var vista = mapa.getBounds();
      var centro = mapa.getCenter();
      function naTela(m) {
        try { return !!(m && m.getLatLng && vista.contains(m.getLatLng())); }
        catch (e) { return false; }
      }
      // câmeras primeiro (têm objeto próprio com nome/fonte)
      if (window.VSCameras) {
        VSCameras.lista.forEach(function (cam) {
          var m = ST.pins[cam.id];
          if (m && naTela(m)) { lista.push({ cam: cam, m: m }); vistos[cam.id] = 1; }
        });
      }
      // e todo o resto que o mapa tiver desenhado DENTRO DA VISTA
      var resto = [];
      Object.keys(ST.pins).forEach(function (id) {
        if (vistos[id]) return;
        var m = ST.pins[id];
        if (!m || typeof m.getLatLng !== 'function') return;
        if (!naTela(m)) return;
        var it = m._vs || {};
        resto.push({
          cam: { id: id, nome: it.nome || it.sublocal || 'ponto',
                 fonte: it.categoria || it.grupo || m._vt || '', _generico: true },
          m: m
        });
      });
      // se ainda vier gente demais (zoom aberto), fica com os mais perto do centro
      if (lista.length + resto.length > TETO) {
        resto.sort(function (a, b) {
          return centro.distanceTo(a.m.getLatLng()) - centro.distanceTo(b.m.getLatLng());
        });
        resto = resto.slice(0, Math.max(0, TETO - lista.length));
      }
      lista = lista.concat(resto);
    } catch (e) {}
    return lista;
  }

  /* Um pino agrupado no cluster não dá pra arrastar, então ele sai do cluster
     enquanto está sendo editado. O que faltava era ANOTAR de onde ele saiu:
     antes nada voltava — os pinos ficavam soltos pra sempre e as árvores (que
     vivem em _arvoreLayer, não no cluster) acabavam desenhadas duas vezes. */
  var soltos = [], armados = [];
  function camadaDe(m) {
    var cands = [];
    try { if (typeof _cluster     !== 'undefined') cands.push(_cluster); }     catch (e) {}
    try { if (typeof _arvoreLayer !== 'undefined') cands.push(_arvoreLayer); } catch (e) {}
    try { if (typeof _npcLayer    !== 'undefined') cands.push(_npcLayer); }    catch (e) {}
    for (var i = 0; i < cands.length; i++) {
      try { if (cands[i].hasLayer(m)) return cands[i]; } catch (e) {}
    }
    return null;
  }
  function soltar(m) {
    if (m._vsmeSolto) return;
    var c = camadaDe(m);
    if (c) { try { c.removeLayer(m); } catch (e) {} }
    try { if (!mapa.hasLayer(m)) m.addTo(mapa); } catch (e) {}
    m._vsmeSolto = 1; soltos.push({ m: m, c: c });
  }
  function recolher(s) {
    try { if (s.c && mapa.hasLayer(s.m)) mapa.removeLayer(s.m); } catch (e) {}
    try { if (s.c && !s.c.hasLayer(s.m)) s.c.addLayer(s.m); } catch (e) {}
    s.m._vsmeSolto = 0;
  }
  function devolverTudo() {
    soltos.forEach(recolher); soltos = [];
    armados.forEach(function (m) { try { if (m.dragging) m.dragging.disable(); } catch (e) {} });
    armados = [];
  }
  // ao navegar, devolve pro cluster o que já saiu da vista
  function podar() {
    var vista; try { vista = mapa.getBounds(); } catch (e) { return; }
    soltos = soltos.filter(function (s) {
      var fora = false;
      try { fora = !vista.contains(s.m.getLatLng()); } catch (e) {}
      if (!fora) return true;
      recolher(s); return false;
    });
  }

  function armar(par) {
    try {
      if (par.m.dragging) { par.m.dragging.enable(); armados.push(par.m); }
      if (!par.m._vsmeLig) {
        par.m._vsmeLig = true;
        par.m.on('dragend', function () { if (ligado) abrirEditor(par.cam, par.m); });
        par.m.on('click', function (e) {
          if (!ligado) return;
          try { L.DomEvent.stopPropagation(e); } catch (x) {}
          abrirEditor(par.cam, par.m);
        });
      }
      soltar(par.m);
    } catch (e) {}
  }

  /* prepara só os pinos da vista atual; roda de novo a cada movimento do mapa,
     que é o que mantém "vale pra todo ponto" sem varrer o mapa inteiro */
  function preparar() {
    var l = pinosEditaveis();
    l.forEach(armar);
    podar();
    return l.length;
  }
  var tMove = 0;
  function aoMover() {
    clearTimeout(tMove);
    tMove = setTimeout(function () { if (ligado) preparar(); }, 250);
  }

  function ligar() {
    ligado = !ligado;
    document.body.classList.toggle('vsme-on', ligado);
    barra.classList.toggle('on', ligado);

    if (!ligado) {
      try { mapa.off('moveend', aoMover); mapa.off('zoomend', aoMover); } catch (e) {}
      clearTimeout(tMove);
      devolverTudo();
      try { vsToast('Modo edição desligado'); } catch (e) {}
      return;
    }

    /* 13/08/2026 — NÃO MEXE MAIS NO ENQUADRAMENTO.
       O fitBounds de ontem abria a caixa de TODOS os pinos: bastava um ponto
       fora da ilha pra jogar a vista em SC inteira, e aí não havia o que
       arrastar mesmo. Quem vai editar já está olhando pro pino. Se não tem
       nada na tela, o certo é avisar — não sequestrar o mapa. */
    var n = preparar();
    try { mapa.on('moveend', aoMover); mapa.on('zoomend', aoMover); } catch (e) {}
    try {
      vsToast(n ? '✏️ Modo edição — ' + n + ' pontos nesta vista'
                : '✏️ Modo edição — nenhum ponto aqui; chegue mais perto de um');
    } catch (e) {}
  }

  /* ═══════════════════════════════════════════════════════════════════════
     13/08/2026 — APLICAR O PUBLICADO VALE NO MAPA INTEIRO.
     Isto usava pinosEditaveis(), que de manhã passou a devolver só os pinos da
     VISTA — e aí a edição publicada só aparecia no pedaço que estava na tela.
     Foi o que o DJ viu: editou pelo celular e no PC os ícones não trocaram.
     Além disso rodava UMA VEZ só, no carregamento: como o mapa agora traz pinos
     conforme se navega, os que chegam depois nunca eram pintados.
     Agora percorre as EDIÇÕES (que são poucas) e acha cada marcador por id
     direto em ST.pins — custo O(edições), não O(pinos) — e repete quando chega
     gente nova no mapa.
     ⚠️ Isto pinta o que está PUBLICADO. "Salvar" grava só neste aparelho;
     quem faz valer pros outros é o botão 🌎 Publicar. */
  function camPorId(id, m) {
    try {
      if (window.VSCameras) {
        for (var i = 0; i < VSCameras.lista.length; i++)
          if (VSCameras.lista[i].id === id) return VSCameras.lista[i];
      }
    } catch (e) {}
    var it = (m && m._vs) || {};
    return { id: id, nome: it.nome || it.sublocal || 'ponto',
             fonte: it.categoria || it.grupo || (m && m._vt) || '', _generico: true };
  }

  function aplicarPublicados() {
    try {
      if (typeof ST === 'undefined' || !ST.pins) return;
      var edicoes = carregar();
      Object.keys(edicoes).forEach(function (id) {
        var m = ST.pins[id];
        if (!m) return;                       // esse pino ainda não está no mapa
        aplicar(camPorId(id, m), m);
      });
    } catch (e) {}
  }

  var tAplica = 0;
  function reaplicarDepois() {
    clearTimeout(tAplica);
    tAplica = setTimeout(aplicarPublicados, 300);
  }

  var t = 0;
  (function esperar() {
    var temPino = false;
    try { temPino = !!(typeof ST !== 'undefined' && ST.pins && Object.keys(ST.pins).length); } catch (e) {}
    if (temPino) {
      puxarDoBanco().then(aplicarPublicados);
      // o mapa carrega por vista: pino novo a cada navegação, então repinta
      try { mapa.on('moveend', reaplicarDepois); mapa.on('zoomend', reaplicarDepois); } catch (e) {}
      return;
    }
    if (++t < 40) setTimeout(esperar, 300);
  })();

  document.addEventListener('click', function (ev) {
    var id = ev.target && ev.target.id;
    if (id === 'vsme-sair') ligar();
    else if (id === 'vsme-salvar') salvar();
    else if (id === 'vsme-publicar') { salvar(); publicarPraTodos(); }
    else if (id === 'vsme-copiar') copiarProCodigo();
    else if (id === 'vsme-mover') moverEsse();
    else if (id === 'vsme-fechar') ed.classList.remove('on');
  });

  /* ═══════════════════════════════════════════════════════════════════════
     13/08/2026 — TOQUE LONGO NO PINO (ideia do DJ), SÓ PRA ADMIN LOGADO.

     Por que isto é melhor que o modo edição ligado: o modo tinha que "preparar"
     todos os pinos porque não sabia qual seria mexido. O dedo sabe. Aqui o app
     só descobre o pino no instante do toque — um pino, um editor. Sem varrer
     camada, sem fitBounds, sem desmontar cluster. O "sai do foco e mostra o sul
     inteiro" não é corrigido: deixa de ter como acontecer.

     ⚠️ ISTO NÃO É SEGURANÇA — é conveniência. Esconder o editor no navegador não
     protege nada: quem souber abrir o console vê tudo. Quem de fato barra a
     escrita é a RLS de mapa_pontos com eh_role('admin'), no servidor. Esta
     checagem existe pra que o mapa do usuário comum fique limpo, não pra trancar.
     ═══════════════════════════════════════════════════════════════════════ */
  var ehAdmin = false;

  function conferirAdmin() {
    var tk = _token();
    if (!tk) return Promise.resolve(false);   // sem login não há admin
    return fetch(SUPA + '/rest/v1/rpc/eh_role', {
      method: 'POST',
      headers: { 'apikey': ANON, 'Authorization': 'Bearer ' + tk,
                 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_role: 'admin' })
    }).then(function (r) { return r.ok ? r.json() : false; })
      .then(function (eh) { return eh === true; })
      .catch(function () { return false; });
  }

  /* acha o marcador pelo elemento que o dedo tocou.
     É uma varredura de ST.pins, mas só comparação de referência e só no toque:
     custa ~1ms. O que travava o app antes não era percorrer a lista — era
     chamar removeLayer/addTo em cada item dela. */
  function marcadorDoElemento(el) {
    try {
      if (typeof ST === 'undefined' || !ST.pins || !el) return null;
      var ks = Object.keys(ST.pins);
      for (var i = 0; i < ks.length; i++) {
        var m = ST.pins[ks[i]];
        if (!m) continue;
        var ic = m._icon || (m.getElement && m.getElement());
        if (ic && (ic === el || ic === el.parentNode || ic.contains(el))) {
          var it = m._vs || {};
          return { cam: { id: ks[i], nome: it.nome || it.sublocal || 'ponto',
                          fonte: it.categoria || it.grupo || m._vt || '', _generico: true },
                   m: m };
        }
      }
    } catch (e) {}
    return null;
  }

  var TOQUE_LONGO = 550;   // ms de dedo parado
  var FOLGA = 12;          // px: passou disso é arrasto do mapa, não toque longo
  var relogio = 0, ox = 0, oy = 0, elAlvo = null;

  function pontoDe(ev) {
    return (ev.touches && ev.touches[0]) || (ev.changedTouches && ev.changedTouches[0]) || ev;
  }
  function abortar() { clearTimeout(relogio); relogio = 0; elAlvo = null; }

  function aoPressionar(ev) {
    if (!ehAdmin || !ligadoToque()) return;
    var alvo = ev.target;
    if (!alvo || !alvo.closest) return;
    var el = alvo.closest('.leaflet-marker-icon');
    if (!el) return;
    var p = pontoDe(ev);
    ox = p.clientX; oy = p.clientY; elAlvo = el;
    clearTimeout(relogio);
    relogio = setTimeout(function () {
      relogio = 0;
      var achado = marcadorDoElemento(elAlvo);
      if (!achado) return;
      try { if (navigator.vibrate) navigator.vibrate(18); } catch (e) {}
      abrirEditor(achado.cam, achado.m);
    }, TOQUE_LONGO);
  }
  function aoArrastarDedo(ev) {
    if (!relogio) return;
    var p = pontoDe(ev);
    if (Math.abs(p.clientX - ox) > FOLGA || Math.abs(p.clientY - oy) > FOLGA) abortar();
  }

  /* interruptor: o DJ pode desligar se o toque longo atrapalhar o uso normal.
     Vem ligado — sem isso a ideia não serve pra nada. */
  var CHAVE_TOQUE = 'vs.mapa.toqueEdita';
  function ligadoToque() {
    try { return localStorage.getItem(CHAVE_TOQUE) !== '0'; } catch (e) { return true; }
  }
  function alternarToque() {
    var novo = ligadoToque() ? '0' : '1';
    try { localStorage.setItem(CHAVE_TOQUE, novo); } catch (e) {}
    try { vsToast(novo === '0' ? '✏️ Toque longo desligado'
                               : '✏️ Toque longo ligado — segure num pino pra editar'); } catch (e) {}
    return novo !== '0';
  }

  /* a sessão costuma chegar depois deste arquivo: sem esperar por ela, o admin
     abriria o mapa como usuário comum e o toque longo não valeria até recarregar */
  function esperarSessao(tentativa) {
    if (_token()) return conferirAdmin();
    if ((tentativa || 0) >= 20) return Promise.resolve(false);
    return new Promise(function (ok) {
      setTimeout(function () { ok(esperarSessao((tentativa || 0) + 1)); }, 400);
    });
  }

  esperarSessao(0).then(function (eh) {
    ehAdmin = eh;
    if (!eh) return;   // usuário comum: nem os listeners existem
    ['touchstart', 'mousedown'].forEach(function (n) {
      document.addEventListener(n, aoPressionar, { passive: true, capture: true });
    });
    ['touchmove', 'mousemove'].forEach(function (n) {
      document.addEventListener(n, aoArrastarDedo, { passive: true, capture: true });
    });
    ['touchend', 'touchcancel', 'mouseup', 'contextmenu'].forEach(function (n) {
      document.addEventListener(n, abortar, { capture: true });
    });
    // o mapa saindo do lugar cancela: é arrasto, não intenção de editar
    try { mapa.on('movestart zoomstart', abortar); } catch (e) {}
  });

  /* reposicionar um pino sozinho, sem ligar modo nenhum: solta só ele,
     deixa arrastar, e ao largar reabre o editor já com a posição nova */
  function moverEsse() {
    if (!editando) return;
    var alvo = editando;
    ed.classList.remove('on');
    try {
      soltar(alvo.m);
      if (alvo.m.dragging) alvo.m.dragging.enable();
      if (!alvo.m._vsmeMov) {
        alvo.m._vsmeMov = true;
        alvo.m.on('dragend', function () {
          try { if (alvo.m.dragging) alvo.m.dragging.disable(); } catch (e) {}
          abrirEditor(alvo.cam, alvo.m);
        });
      }
      vsToast('📍 Arraste o pino e solte onde ele fica');
    } catch (e) {}
  }

  window.VSModoEdicao = { alternar: ligar, ligado: function () { return ligado; },
    publicar: publicarPraTodos, puxar: puxarDoBanco,
    toque: alternarToque, toqueLigado: ligadoToque,
    souAdmin: function () { return ehAdmin; } };

  /* 12/08/2026 — ATALHO DIRETO: /mapa.html?editar=1 liga o modo sozinho.
     Serve pra duas coisas: (1) o DJ abrir já editando, sem caçar o ícone no meio
     de 34 itens do FAB; (2) separar o problema — se por aqui funciona e pelo
     botão não, o defeito está no FAB, não neste arquivo. */
  try {
    if (/[?&]editar=1/.test(location.search)) {
      var n = 0;
      var tentar = setInterval(function () {
        if (pinosEditaveis().length) { clearInterval(tentar); if (!ligado) ligar(); }
        if (++n > 40) clearInterval(tentar);
      }, 300);
    }
  } catch (e) {}

  /* diagnóstico honesto: se algo estourar aqui dentro, o botão fica mudo e
     ninguém descobre. Este aviso aparece na tela em vez de sumir no console. */
  window.VSModoEdicaoDiag = function () {
    var p = pinosEditaveis();
    var msg = 'modo:' + (ligado ? 'ON' : 'off') +
              ' | pinos:' + p.length +
              ' | cameras:' + (window.VSCameras ? VSCameras.lista.length : 'sem VSCameras') +
              ' | ST:' + (typeof ST !== 'undefined' ? 'ok' : 'ausente') +
              ' | mapa:' + (typeof mapa !== 'undefined' ? 'ok' : 'ausente');
    try { vsToast(msg); } catch (e) { alert(msg); }
    return msg;
  };
})();
