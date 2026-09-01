/* vs-despertador.js — Despertador do Vento Sul, em UM lugar só.
 *
 * 04/08/2026 — FASE 2. Antes era UM alarme só. Agora:
 *   · VÁRIOS alarmes no mesmo dia (lista)
 *   · repetição por dia da SEMANA e por dia do MÊS
 *   · cada alarme com a SUA língua (pt/en/es) — a previsão vem no idioma escolhido
 *   · cada alarme com os SEUS assuntos, iguais aos das notificações
 *
 * A diferença que dá sentido ao todo (pedido do DJ):
 *   NOTIFICAÇÃO chega QUANDO a coisa acontece (compra coletiva abrindo agora).
 *   ALARME chega NA HORA QUE TU MARCOU e traz o que tu gosta (rádio, tempo, promoções).
 *   Uma é o mundo te chamando; a outra é tu marcando encontro com o mundo.
 *
 * O DISPARO continua na rádio (precisa do player pra tocar o stream). Aqui é o ajuste.
 * Guarda em localStorage 'vs.alarms' (lista). O 'vs.alarm' antigo continua sendo
 * escrito com o PRÓXIMO alarme a tocar, pra nada que já existia quebrar.
 *
 * API:  VSDespertador.montarPagina(el) / .montarModal() / .abrir() / .fechar()
 *       .lerLista() .gravarLista(l) .proximoDe(a) .proximoGeral()
 *       Quando algo muda, chama window.VSDespertadorMudou() se existir
 *       (a rádio usa pra rearmar a vigia).
 */
(function (root) {
  if (root.VSDespertador) return;

  var CHAVE_LISTA = 'vs.alarms';
  var CHAVE_VELHA = 'vs.alarm';

  var IDIOMAS = [
    { id: 'pt', bandeira: '🇧🇷', nome: 'Português' },
    { id: 'en', bandeira: '🇺🇸', nome: 'English' },
    { id: 'es', bandeira: '🇪🇸', nome: 'Español' }
  ];

  // AS MESMAS 12 categorias das notificações (app.js NOTIF_CATEGORIAS) — pedido do DJ:
  // tudo o que a notificação oferece, o alarme também oferece. A diferença não é o
  // ASSUNTO, é a HORA: notificação chega quando acontece, alarme na hora que tu marcou.
  // As 3 últimas são extras que só fazem sentido no alarme (o resumão sabe buscar).
  var ASSUNTOS = [
    { id: 'promocoes', emoji: '📅', nome: 'Promoções' },
    { id: 'tempo',     emoji: '🌦️', nome: 'Previsão do tempo' },
    { id: 'eventos',   emoji: '🎉', nome: 'Festas & acontecimentos' },
    { id: 'jornal',    emoji: '📰', nome: 'Notícias do Jornal' },
    { id: 'radio',     emoji: '📻', nome: 'Rádio da Ilha' },
    { id: 'ingles',    emoji: '🇬🇧', nome: 'Inglês na rádio' },
    { id: 'jogo',      emoji: '🎖️', nome: 'Jogo & títulos' },
    { id: 'votados',   emoji: '⭐', nome: 'Mais Votados' },
    { id: 'tesouro',   emoji: '🗺️', nome: 'Caça ao Tesouro' },
    { id: 'coletiva',  emoji: '🛒', nome: 'Compras Coletivas' },
    { id: 'carteira',  emoji: '💰', nome: 'Carteira' },
    { id: 'litoranea', emoji: '🌊', nome: 'Litorânea' },
    { id: 'ondas',     emoji: '🏄', nome: 'Ondas & mar' },
    { id: 'cotacoes',  emoji: '💹', nome: 'Cotações' },
    { id: 'lua',       emoji: '🌙', nome: 'Lua' },

    /* 13/08/2026 — COMIDA POR ÍCONE, sem ter que digitar (pedido do DJ).
       Ele apontou que pra receber aviso de pizza, hambúrguer, japonesa ou
       churrasco a pessoa tinha que ESCREVER o nome no campo livre — e quem não
       escreve, não recebe. Agora é toque, igual ao resto: cada um destes vira
       um assunto do alarme e da notificação, e casa com a categoria do comércio
       que já está no banco. O campo de texto livre continua ali pra quem quiser
       pedir algo que não está na lista. */
    { id: 'com_pizza',     emoji: '🍕', nome: 'Pizza' },
    { id: 'com_lanche',    emoji: '🍔', nome: 'Lanche & hambúrguer' },
    { id: 'com_churrasco', emoji: '🥩', nome: 'Churrasco' },
    { id: 'com_peixe',     emoji: '🐟', nome: 'Peixe & frutos do mar' },
    { id: 'com_japonesa',  emoji: '🍣', nome: 'Japonesa' },
    { id: 'com_chinesa',   emoji: '🥡', nome: 'Chinesa' },
    { id: 'com_arabe',     emoji: '🥙', nome: 'Árabe' },
    { id: 'com_italiana',  emoji: '🍝', nome: 'Italiana & massas' },
    { id: 'com_padaria',   emoji: '🥐', nome: 'Padaria & café' },
    { id: 'com_doce',      emoji: '🍰', nome: 'Doces & sobremesa' },
    { id: 'com_acai',      emoji: '🍧', nome: 'Açaí & sorvete' },
    { id: 'com_veg',       emoji: '🥗', nome: 'Vegetariana & natural' },
    { id: 'com_bebida',    emoji: '🍺', nome: 'Bar & bebidas' },
    { id: 'com_marmita',   emoji: '🍱', nome: 'Marmita & self-service' }
  ];


  var ESTACOES = [
    { id: 'vida-boa',  nome: '🌊 Vida Boa' },
    { id: 'cultura',   nome: '🤖 Cultura' },
    { id: 'comercio',  nome: '🛒 Comércio' },
    { id: 'ilha-hoje', nome: '📰 Ilha Hoje' },
    { id: 'plantao',   nome: '📡 Plantão' },
    { id: 'economia',  nome: '💹 Economia' }
  ];

  var DIAS_SEMANA = [
    { d: 1, r: 'Seg' }, { d: 2, r: 'Ter' }, { d: 3, r: 'Qua' }, { d: 4, r: 'Qui' },
    { d: 5, r: 'Sex' }, { d: 6, r: 'Sáb' }, { d: 0, r: 'Dom' }
  ];

  function novoAlarme(base) {
    var a = {
      id: 'a' + Date.now() + Math.floor(Math.random() * 999),
      nome: '',
      ativo: true,
      hora: '07:00',
      repete: { tipo: 'semana', dias: [], diasMes: [] },
      idioma: 'pt',
      modo: 'resumao_radio',
      estacao: 'vida-boa',
      fadeMins: 5,
      sonecaMins: 10,
      assuntos: ['tempo', 'promocoes', 'coletiva'],
      texto_livre: ''
    };
    if (base) for (var k in base) if (base[k] !== undefined) a[k] = base[k];
    return a;
  }

  // ── guardar e ler ──────────────────────────────────────────────────────────
  function normalizar(a) {
    var n = novoAlarme(a);
    if (!n.repete || typeof n.repete !== 'object') n.repete = { tipo: 'semana', dias: [], diasMes: [] };
    if (!Array.isArray(n.repete.dias)) n.repete.dias = [];
    if (!Array.isArray(n.repete.diasMes)) n.repete.diasMes = [];
    if (['semana', 'mes', 'unico'].indexOf(n.repete.tipo) < 0) n.repete.tipo = 'semana';
    if (!Array.isArray(n.assuntos)) n.assuntos = ['tempo'];
    return n;
  }

  function lerLista() {
    var l = null;
    try { l = JSON.parse(localStorage.getItem(CHAVE_LISTA)); } catch (e) {}
    if (Array.isArray(l) && l.length) return l.map(normalizar);
    // primeira vez: traz o alarme único antigo pra não perder o que ele já tinha
    var velho = null;
    try { velho = JSON.parse(localStorage.getItem(CHAVE_VELHA)); } catch (e) {}
    if (velho && velho.hora) {
      var m = normalizar({
        nome: 'Meu despertador',
        ativo: !!velho.ativo, hora: velho.hora,
        repete: { tipo: 'semana', dias: Array.isArray(velho.dias) ? velho.dias : [], diasMes: [] },
        modo: velho.modo, estacao: velho.estacao,
        fadeMins: velho.fadeMins, sonecaMins: velho.sonecaMins,
        assuntos: (velho.resumao && velho.resumao.topicos) || ['tempo'],
        texto_livre: (velho.resumao && velho.resumao.texto_livre) || ''
      });
      gravarLista([m]);
      return [m];
    }
    return [];
  }

  function gravarLista(lista) {
    try { localStorage.setItem(CHAVE_LISTA, JSON.stringify(lista)); } catch (e) {}
    espelharProximo(lista);
    try { if (typeof root.VSDespertadorMudou === 'function') root.VSDespertadorMudou(); } catch (e) {}
  }

  // Escreve no 'vs.alarm' antigo o PRÓXIMO a tocar — assim o que já lia essa
  // chave continua funcionando sem saber que agora existe uma lista.
  function espelharProximo(lista) {
    var alvo = null, quando = Infinity;
    (lista || []).forEach(function (a) {
      if (!a.ativo) return;
      var q = proximoDe(a);
      if (q && q.getTime() < quando) { quando = q.getTime(); alvo = a; }
    });
    try {
      if (!alvo) { localStorage.setItem(CHAVE_VELHA, JSON.stringify({ ativo: false })); return; }
      localStorage.setItem(CHAVE_VELHA, JSON.stringify({
        ativo: true, hora: alvo.hora,
        dias: alvo.repete.tipo === 'semana' ? alvo.repete.dias : [],
        estacao: alvo.estacao, fadeMins: alvo.fadeMins, sonecaMins: alvo.sonecaMins,
        modo: alvo.modo, idioma: alvo.idioma,
        resumao: { topicos: alvo.assuntos, texto_livre: alvo.texto_livre }
      }));
    } catch (e) {}
  }

  // ── quando toca ────────────────────────────────────────────────────────────
  function cabeNoDia(a, d) {
    var r = a.repete;
    if (r.tipo === 'unico') return true;                       // o primeiro que vier
    if (r.tipo === 'mes') return r.diasMes.length ? r.diasMes.indexOf(d.getDate()) > -1 : true;
    return r.dias.length ? r.dias.indexOf(d.getDay()) > -1 : true;
  }

  /* 12/08/2026 — VÁRIOS HORÁRIOS NO MESMO ALARME, CADA UM DO SEU JEITO.
     Pedido do DJ: "meu alarme toca todo dia; quero que toque 3x por dia e que
     de manhã me dê a rádio, no almoço notícias e à noite pizza e lanche".
     Antes cada alarme tinha UMA hora e UMA configuração: pra isso era preciso
     criar 3 alarmes repetindo dias e idioma em cada um.
     Agora `horarios` é uma lista de { hora, modo, estacao, assuntos, texto_livre }.
     O que o horário não definir, ele herda do alarme — assim quem só quer 3
     horários iguais não precisa preencher nada três vezes.
     `hora` (singular) continua sendo lido, pra não quebrar alarme já salvo. */
  function horariosDe(a) {
    var lista = [];
    if (a && Array.isArray(a.horarios) && a.horarios.length) {
      lista = a.horarios.map(function (h) {
        return (typeof h === 'string') ? { hora: h } : (h || {});
      });
    } else if (a && a.hora) {
      lista = [{ hora: a.hora }];
    } else { lista = [{ hora: '07:00' }]; }

    var vistos = {}, saida = [];
    lista.forEach(function (h) {
      var t = String(h.hora || '').trim();
      if (!/^\d{1,2}:\d{2}$/.test(t)) return;
      var p = t.split(':');
      var k = ('0' + Math.min(23, +p[0])).slice(-2) + ':' + ('0' + Math.min(59, +p[1])).slice(-2);
      if (vistos[k]) return; vistos[k] = 1;
      // herda do alarme o que este horário não disser
      saida.push({
        hora: k,
        modo:        h.modo        !== undefined ? h.modo        : a.modo,
        estacao:     h.estacao     !== undefined ? h.estacao     : a.estacao,
        assuntos:    h.assuntos    !== undefined ? h.assuntos    : a.assuntos,
        texto_livre: h.texto_livre !== undefined ? h.texto_livre : a.texto_livre,
        idioma:      h.idioma      !== undefined ? h.idioma      : a.idioma,
        rotulo:      h.rotulo || ''
      });
    });
    saida.sort(function (x, y) { return x.hora < y.hora ? -1 : 1; });
    return saida.length ? saida : [{ hora: '07:00', modo: a && a.modo, estacao: a && a.estacao,
                                     assuntos: a && a.assuntos, texto_livre: a && a.texto_livre }];
  }

  /* devolve a data do próximo toque E a configuração daquele horário */
  function proximoDetalhe(a) {
    if (!a || !a.ativo) return null;
    var hs = horariosDe(a), agora = new Date(), melhor = null;
    for (var i = 0; i < 400 && !melhor; i++) {
      for (var j = 0; j < hs.length; j++) {
        var p = hs[j].hora.split(':');
        var d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + i,
                         +p[0], +p[1], 0, 0);
        if (d <= agora) continue;
        if (!cabeNoDia(a, d)) continue;
        if (!melhor || d < melhor.quando) melhor = { quando: d, cfg: hs[j] };
      }
    }
    return melhor;
  }

  function proximoDe(a) {
    var m = proximoDetalhe(a);
    return m ? m.quando : null;
  }

  function proximoGeral() {
    var melhor = null;
    lerLista().forEach(function (a) {
      var q = proximoDe(a);
      if (q && (!melhor || q < melhor)) melhor = q;
    });
    return melhor;
  }

  function emPalavras(a) {
    if (!a.ativo) return 'desligado';
    var d = proximoDe(a);
    if (!d) return 'sem dia marcado';
    var dif = Math.round((d - new Date()) / 60000);
    if (dif < 60) return 'toca em ' + dif + ' min';
    if (dif < 1440) return 'toca em ' + Math.floor(dif / 60) + 'h' + (dif % 60 ? (dif % 60) + 'min' : '');
    var nomes = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    return 'toca ' + nomes[d.getDay()] + ' dia ' + d.getDate() + ' às ' + a.hora;
  }

  function repeteEmPalavras(a) {
    var r = a.repete;
    if (r.tipo === 'unico') return 'uma vez só';
    if (r.tipo === 'mes') {
      if (!r.diasMes.length) return 'todo dia do mês';
      return 'dia ' + r.diasMes.slice().sort(function (x, y) { return x - y; }).join(', ') + ' de cada mês';
    }
    if (!r.dias.length) return 'todos os dias';
    if (r.dias.length === 7) return 'todos os dias';
    var ordem = [1, 2, 3, 4, 5, 6, 0];
    var uteis = [1, 2, 3, 4, 5];
    if (r.dias.length === 5 && uteis.every(function (d) { return r.dias.indexOf(d) > -1; })) return 'de segunda a sexta';
    return ordem.filter(function (d) { return r.dias.indexOf(d) > -1; })
      .map(function (d) { return DIAS_SEMANA.filter(function (x) { return x.d === d; })[0].r; }).join(', ');
  }

  function resumoConteudo(a) {
    var lang = IDIOMAS.filter(function (i) { return i.id === a.idioma; })[0] || IDIOMAS[0];
    var oque = a.modo === 'radio' ? '📻 rádio'
             : a.modo === 'resumao' ? '☀️ resumão'
             : '☀️ resumão + 📻 rádio';
    return lang.bandeira + ' ' + oque;
  }

  // ── estilo ─────────────────────────────────────────────────────────────────
  var CSS = "\
.dsp-wrap{max-width:560px;margin:0 auto;padding:20px 16px 110px;color:#e5e7eb;font-family:system-ui,sans-serif}\
.dsp-topo{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:4px}\
.dsp-topo h2{margin:0;font-size:20px;font-weight:800}\
.dsp-sub{font-size:13px;color:#94a3b8;margin:0 0 16px;line-height:1.5}\
.dsp-explica{background:rgba(6,182,212,.08);border:1px solid rgba(6,182,212,.28);border-radius:12px;\
 padding:11px 13px;font-size:12.5px;line-height:1.55;color:#cbd5e1;margin-bottom:18px}\
.dsp-explica b{color:#67e8f9}\
.dsp-card{background:rgba(255,255,255,.04);border:1px solid #1f2937;border-radius:14px;\
 padding:14px;margin-bottom:10px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:border-color .15s}\
.dsp-card:hover{border-color:#334155}\
.dsp-card.off{opacity:.5}\
.dsp-card-info{flex:1;min-width:0}\
.dsp-hora{font-size:30px;font-weight:900;line-height:1;font-variant-numeric:tabular-nums;color:#ffd54f}\
.dsp-card.off .dsp-hora{color:#94a3b8}\
.dsp-nome{font-size:14px;font-weight:700;margin-top:3px}\
.dsp-meta{font-size:11.5px;color:#94a3b8;margin-top:2px;line-height:1.45}\
.dsp-sw{width:50px;height:28px;background:#374151;border-radius:14px;position:relative;flex-shrink:0;\
 transition:background .25s;cursor:pointer}\
.dsp-sw::after{content:'';position:absolute;top:3px;left:3px;width:22px;height:22px;background:#fff;\
 border-radius:50%;transition:transform .25s;box-shadow:0 1px 4px rgba(0,0,0,.4)}\
.dsp-sw.on{background:#06b6d4}\
.dsp-sw.on::after{transform:translateX(22px)}\
.dsp-novo{width:100%;padding:14px;border:1px dashed #334155;background:transparent;color:#67e8f9;\
 border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;margin-top:4px}\
.dsp-novo:hover{background:rgba(6,182,212,.07)}\
.dsp-vazio{text-align:center;color:#94a3b8;font-size:13px;padding:18px 0 6px;line-height:1.6}\
/* 25/08/2026 — era position:fixed;inset:0, ou seja, uma janela do tamanho\
   da tela. No celular o rodape fixo do app comia o fundo dela e o botao de\
   salvar ficava inalcancavel. O DJ: 'as configuracoes devem ser na pagina,\
   nao pop out'. Agora e uma secao normal, e quem rola e a PAGINA. */\
.dsp-ed{position:static;z-index:auto;background:transparent;display:block;\
 overflow:visible;padding:0;margin:14px 0 120px;box-sizing:border-box}\
.dsp-ed-box *{box-sizing:border-box}\
.dsp-ed-box{background:#0e1620;border:1px solid #1f2937;border-radius:20px;\
 width:100%;max-width:560px;margin:0 auto;padding:22px 18px 26px;\
 max-height:none;overflow:visible}\
.dsp-linha{margin-bottom:18px}\
.dsp-lbl{display:block;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;\
 letter-spacing:.5px;margin-bottom:7px}\
.dsp-hora-wrap{position:relative;display:flex;align-items:center;justify-content:center;gap:12px;\
 background:rgba(255,213,79,.07);border:1px solid rgba(255,213,79,.45);border-radius:14px;\
 padding:10px 8px;width:100%;box-sizing:border-box;cursor:pointer}\
.dsp-hora-wrap:focus-within{border-color:#ffd54f;background:rgba(255,213,79,.13)}\
.dsp-hh{display:flex;flex-direction:column;gap:8px}\
.dsp-hh-item{display:flex;gap:7px;align-items:center;background:rgba(255,255,255,.05);\
  border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:8px}\
.dsp-hh-item input[type=time]{background:#16232f;color:#ffd54f;border:1px solid rgba(255,255,255,.14);\
  border-radius:8px;padding:8px;font:800 15px system-ui;font-variant-numeric:tabular-nums}\
.dsp-hh-item input[type=text]{flex:1;min-width:0;background:#16232f;color:#e8eef4;\
  border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:8px;font:600 13px system-ui}\
.dsp-hh-item button{background:#7f1d1d;color:#fecaca;border:0;border-radius:8px;\
  padding:8px 10px;font:800 12px system-ui;cursor:pointer}\
.dsp-hh-add{margin-top:8px;width:100%;background:rgba(255,213,79,.15);color:#ffd54f;\
  border:1px dashed rgba(255,213,79,.5);border-radius:10px;padding:10px;\
  font:800 13px system-ui;cursor:pointer}\
.dsp-hh-dica{margin-top:7px;font:600 11.5px system-ui;color:#94a3b8;line-height:1.5}\
.dsp-hora-vis{font-size:clamp(34px,12vw,52px);font-weight:900;line-height:1.15;color:#ffd54f;\
 font-variant-numeric:tabular-nums;letter-spacing:2px}\
.dsp-hora-ico{width:clamp(26px,8vw,36px);height:clamp(26px,8vw,36px);flex:0 0 auto;opacity:.9}\
.dsp-hora-in{position:absolute;inset:0;width:100%;height:100%;opacity:0;border:0;margin:0;padding:0;\
 background:transparent;cursor:pointer;-webkit-appearance:none;appearance:none;font-size:16px}\
.dsp-nome-in,.dsp-livre{width:100%;background:#0a0e14;border:1px solid #1f2937;border-radius:10px;\
 color:#e5e7eb;padding:11px;font-size:14px;font-family:inherit}\
.dsp-livre{min-height:70px;resize:vertical;line-height:1.5}\
.dsp-nome-in:focus,.dsp-livre:focus{outline:none;border-color:#06b6d4}\
.dsp-chips{display:flex;flex-wrap:wrap;gap:7px}\
.dsp-chip{padding:9px 14px;border-radius:100px;border:1px solid #1f2937;background:rgba(255,255,255,.04);\
 color:#e5e7eb;font-size:13px;cursor:pointer;transition:all .15s}\
.dsp-chip.sel{background:rgba(6,182,212,.2);border-color:#06b6d4;color:#67e8f9;font-weight:700}\
.dsp-dia{width:40px;height:40px;border-radius:50%;border:1px solid #1f2937;background:rgba(255,255,255,.04);\
 color:#94a3b8;font-size:12px;cursor:pointer;transition:all .15s;padding:0}\
.dsp-dia.sel{background:rgba(6,182,212,.2);border-color:#06b6d4;color:#67e8f9;font-weight:700}\
.dsp-mes{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}\
.dsp-tudo{display:flex;gap:7px;margin-bottom:8px}\
.dsp-tudo button{flex:1;background:rgba(6,182,212,.16);color:#67e8f9;border:1px solid rgba(6,182,212,.45);\
  border-radius:9px;padding:9px;font:800 12.5px system-ui;cursor:pointer}\
.dsp-tudo button.dsp-mes-nada,.dsp-tudo button.dsp-sem-nada{background:rgba(255,255,255,.05);\
  color:#94a3b8;border-color:rgba(255,255,255,.14);flex:0 0 90px}\
.dsp-mes button{aspect-ratio:1;border-radius:8px;border:1px solid #1f2937;background:rgba(255,255,255,.04);\
 color:#94a3b8;font-size:12px;cursor:pointer;padding:0}\
.dsp-mes button.sel{background:rgba(168,85,247,.22);border-color:#a855f7;color:#d8b4fe;font-weight:700}\
.dsp-assuntos{display:grid;grid-template-columns:1fr 1fr;gap:7px}\
.dsp-assunto{padding:10px 11px;border-radius:10px;border:1px solid #1f2937;background:rgba(255,255,255,.04);\
 color:#e5e7eb;font-size:12.5px;cursor:pointer;text-align:left;transition:all .15s;\
 display:flex;align-items:center;gap:7px;line-height:1.3}\
.dsp-assunto.sel{background:rgba(168,85,247,.16);border-color:#a855f7;color:#d8b4fe;font-weight:600}\
.dsp-acoes{display:flex;gap:9px;margin-top:22px}\
.dsp-salvar{flex:1;padding:15px;background:linear-gradient(135deg,#06b6d4,#a855f7);color:#fff;\
 font-size:16px;font-weight:800;border:0;border-radius:13px;cursor:pointer}\
.dsp-apagar{padding:15px 18px;background:rgba(239,68,68,.14);border:1px solid rgba(239,68,68,.5);\
 color:#f87171;border-radius:13px;font-size:15px;font-weight:700;cursor:pointer}\
.dsp-fechar{padding:15px 18px;background:rgba(120,120,120,.2);border:0;color:#e5e7eb;border-radius:13px;\
 font-size:15px;cursor:pointer}\
/* 25/08: idem — deixa de ser modal e vira secao da pagina */\
.alarm-modal{position:static;z-index:auto;display:block;\
 padding:0;margin:14px 0 120px;box-sizing:border-box;overflow:visible;\
 background:transparent;backdrop-filter:none}\
.alarm-modal .dsp-wrap{background:#0e1620;border-radius:20px;border:1px solid #1f2937;\
 width:100%;max-width:520px;margin:0 auto;max-height:none;overflow:visible}";

  function estilo() {
    if (document.getElementById('vs-desp-css')) return;
    var st = document.createElement('style');
    st.id = 'vs-desp-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  // ── a lista ────────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function pintarLista(raiz) {
    var lista = lerLista();
    var html = '<div class="dsp-topo"><h2>⏰ Meus alarmes</h2></div>' +
      '<p class="dsp-sub">Quantos tu quiser, no mesmo dia ou espalhados pela semana e pelo mês.</p>' +
      '<div class="dsp-explica"><b>Alarme</b> chega na hora que tu marcou e traz o que tu gosta — ' +
      'rádio, tempo, promoções. <b>Notificação</b> é o contrário: chega quando a coisa está ' +
      'acontecendo, tipo uma compra coletiva abrindo agora. Uma é o mundo te chamando; ' +
      'a outra é tu marcando encontro com o mundo.</div>';

    if (!lista.length) {
      html += '<div class="dsp-vazio">Nenhum alarme ainda.<br>Cria o primeiro aqui embaixo.</div>';
    }
    lista.forEach(function (a) {
      html += '<div class="dsp-card' + (a.ativo ? '' : ' off') + '" data-abrir="' + a.id + '">' +
        '<div class="dsp-card-info">' +
          '<div class="dsp-hora">' + esc(a.hora) + '</div>' +
          (a.nome ? '<div class="dsp-nome">' + esc(a.nome) + '</div>' : '') +
          '<div class="dsp-meta">' + esc(repeteEmPalavras(a)) + ' · ' + resumoConteudo(a) + '</div>' +
          '<div class="dsp-meta">' + esc(emPalavras(a)) + '</div>' +
        '</div>' +
        '<div class="dsp-sw' + (a.ativo ? ' on' : '') + '" data-liga="' + a.id + '"></div>' +
      '</div>';
    });
    html += '<button class="dsp-novo" data-novo="1">+ novo alarme</button>';

    raiz.innerHTML = '<div class="dsp-wrap">' + html + '</div>';

    raiz.querySelectorAll('[data-liga]').forEach(function (sw) {
      sw.onclick = function (e) {
        e.stopPropagation();
        var l = lerLista();
        l.forEach(function (a) { if (a.id === sw.dataset.liga) a.ativo = !a.ativo; });
        gravarLista(l); pintarLista(raiz);
      };
    });
    raiz.querySelectorAll('[data-abrir]').forEach(function (c) {
      c.onclick = function () {
        var l = lerLista(), alvo = null;
        l.forEach(function (a) { if (a.id === c.dataset.abrir) alvo = a; });
        if (alvo) abrirEditor(alvo, raiz);
      };
    });
    var bn = raiz.querySelector('[data-novo]');
    if (bn) bn.onclick = function () { abrirEditor(novoAlarme(), raiz, true); };
  }

  // ── o editor de um alarme ──────────────────────────────────────────────────
  function abrirEditor(a, raiz, ehNovo) {
    var ov = document.createElement('div');
    ov.className = 'dsp-ed';

    var diasSemana = DIAS_SEMANA.map(function (d) {
      return '<button class="dsp-dia' + (a.repete.dias.indexOf(d.d) > -1 ? ' sel' : '') +
        '" data-dia="' + d.d + '">' + d.r + '</button>';
    }).join('');

    var diasMes = '';
    for (var i = 1; i <= 31; i++) {
      diasMes += '<button class="' + (a.repete.diasMes.indexOf(i) > -1 ? 'sel' : '') +
        '" data-diames="' + i + '">' + i + '</button>';
    }

    ov.innerHTML = '<div class="dsp-ed-box">' +
      '<div class="dsp-linha"><label class="dsp-lbl">Horário — toque para mudar</label>' +
        '<div class="dsp-hora-wrap">' +
          '<span class="dsp-hora-vis">' + esc(a.hora || '--:--') + '</span>' +
          '<svg class="dsp-hora-ico" viewBox="0 0 24 24" fill="none" stroke="#ffd54f" stroke-width="2" ' +
            'stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>' +
          '<input type="time" class="dsp-hora-in" value="' + esc(a.hora) + '" aria-label="Horario do alarme">' +
        '</div></div>' +

      /* 12/08/2026 — mais horários no MESMO alarme, cada um do seu jeito */
      '<div class="dsp-linha"><label class="dsp-lbl">Tocar também nestes horários</label>' +
        '<div class="dsp-hh"></div>' +
        '<button type="button" class="dsp-hh-add">+ mais um horário</button>' +
        '<div class="dsp-hh-dica">Cada horário pode falar de um assunto diferente. ' +
        'Ex.: 7h a rádio · 12h notícias · 20h pizza e lanches. ' +
        'Deixando em branco, ele repete o que está escolhido acima.</div></div>' +

      '<div class="dsp-linha"><label class="dsp-lbl">Nome (opcional)</label>' +
        '<input class="dsp-nome-in" maxlength="40" placeholder="Ex: acordar, almoço, fechar a loja" value="' + esc(a.nome) + '"></div>' +

      '<div class="dsp-linha"><label class="dsp-lbl">Quando repete</label>' +
        '<div class="dsp-chips" data-grupo="tipo">' +
          '<button class="dsp-chip' + (a.repete.tipo === 'semana' ? ' sel' : '') + '" data-tipo="semana">Toda semana</button>' +
          '<button class="dsp-chip' + (a.repete.tipo === 'mes' ? ' sel' : '') + '" data-tipo="mes">Todo mês</button>' +
          '<button class="dsp-chip' + (a.repete.tipo === 'unico' ? ' sel' : '') + '" data-tipo="unico">Uma vez só</button>' +
        '</div></div>' +

      '<div class="dsp-linha" data-bloco="semana"><label class="dsp-lbl">Dias da semana</label>' +
        '<div class="dsp-chips">' + diasSemana + '</div>' +
        '<div class="dsp-meta" style="margin-top:6px;color:#64748b;font-size:11px">nenhum marcado = todos os dias</div></div>' +

      '<div class="dsp-linha" data-bloco="mes"><label class="dsp-lbl">Dias do mês</label>' +
        /* 12/08/2026 — marcar o mês inteiro de uma vez, em vez de tocar
           31 dias um por um (pedido do DJ). O mesmo pros dias da semana. */
        '<div class="dsp-tudo"><button type="button" class="dsp-mes-todos">✓ marcar todos os dias</button>' +
        '<button type="button" class="dsp-mes-nada">limpar</button></div>' +
        '<div class="dsp-mes">' + diasMes + '</div></div>' +

      '<div class="dsp-linha"><label class="dsp-lbl">Língua deste alarme</label>' +
        '<div class="dsp-chips">' + IDIOMAS.map(function (l) {
          return '<button class="dsp-chip' + (a.idioma === l.id ? ' sel' : '') + '" data-idioma="' + l.id + '">' +
            l.bandeira + ' ' + l.nome + '</button>';
        }).join('') + '</div>' +
        '<div class="dsp-meta" style="margin-top:6px;color:#64748b;font-size:11px">a previsão e o resumão vêm nesta língua</div></div>' +

      '<div class="dsp-linha"><label class="dsp-lbl">O que toca ao despertar</label>' +
        '<div class="dsp-chips">' +
          '<button class="dsp-chip' + (a.modo === 'radio' ? ' sel' : '') + '" data-modo="radio">📻 Só rádio</button>' +
          '<button class="dsp-chip' + (a.modo === 'resumao' ? ' sel' : '') + '" data-modo="resumao">☀️ Só resumão</button>' +
          '<button class="dsp-chip' + (a.modo === 'resumao_radio' ? ' sel' : '') + '" data-modo="resumao_radio">☀️+📻 Os dois</button>' +
        '</div></div>' +

      '<div class="dsp-linha" data-bloco="estacao"><label class="dsp-lbl">Estação</label>' +
        '<div class="dsp-chips">' + ESTACOES.map(function (e) {
          return '<button class="dsp-chip' + (a.estacao === e.id ? ' sel' : '') + '" data-estacao="' + e.id + '">' + e.nome + '</button>';
        }).join('') + '</div></div>' +

      '<div class="dsp-linha" data-bloco="assuntos"><label class="dsp-lbl">Assuntos que tu quer ouvir</label>' +
        '<div class="dsp-assuntos">' + ASSUNTOS.map(function (t) {
          return '<button class="dsp-assunto' + (a.assuntos.indexOf(t.id) > -1 ? ' sel' : '') + '" data-assunto="' + t.id + '">' +
            '<span>' + t.emoji + '</span><span>' + t.nome + '</span></button>';
        }).join('') + '</div></div>' +

      '<div class="dsp-linha" data-bloco="livre"><label class="dsp-lbl">Do teu jeito (o que mais tu quer saber)</label>' +
        '<textarea class="dsp-livre" maxlength="400" placeholder="Ex: sou pescador, me fala da maré primeiro; avisa de promoção de peixe">' + esc(a.texto_livre) + '</textarea></div>' +

      '<div class="dsp-linha"><label class="dsp-lbl">Volume sobe em</label>' +
        '<div class="dsp-chips">' + [3, 5, 10, 15].map(function (m) {
          return '<button class="dsp-chip' + (a.fadeMins === m ? ' sel' : '') + '" data-fade="' + m + '">' + m + ' min</button>';
        }).join('') + '</div></div>' +

      '<div class="dsp-linha"><label class="dsp-lbl">Soneca</label>' +
        '<div class="dsp-chips">' + [0, 5, 10, 15].map(function (m) {
          return '<button class="dsp-chip' + (a.sonecaMins === m ? ' sel' : '') + '" data-snz="' + m + '">' +
            (m ? m + ' min' : 'sem soneca') + '</button>';
        }).join('') + '</div></div>' +

      '<div class="dsp-acoes">' +
        '<button class="dsp-salvar">💾 Salvar</button>' +
        (ehNovo ? '' : '<button class="dsp-apagar">🗑️</button>') +
        '<button class="dsp-fechar">Voltar</button>' +
      '</div>' +
    '</div>';

    document.body.appendChild(ov);
    var box = ov.querySelector('.dsp-ed-box');

    // 07/08/2026 — no celular o <input type=time> desenhava hora e minuto UM EM CIMA DO
    // OUTRO com a fonte de 52px: o Android monta os campos internos do jeito dele e nao
    // cabia, entao nao dava pra ler nem pra mudar. No PC o Chrome desenha diferente, por
    // isso la funcionava. Agora o numero grande e um <span> nosso (que sempre cabe) e o
    // input fica invisivel por cima: o toque abre o relogio nativo do aparelho e o span
    // so espelha o valor. Mesmo comportamento no PC e no celular.
    var horaIn  = box.querySelector('.dsp-hora-in');

    /* 12/08/2026 — lista de horários extras. O primeiro horário continua sendo o
       de cima; estes são os outros toques do mesmo alarme, cada um com seu tema. */
    var caixaHH = box.querySelector('.dsp-hh');
    var extras = (horariosDe(a) || []).slice(1).map(function (h) {
      return { hora: h.hora, texto_livre: h.texto_livre || '' };
    });
    function pintarHH() {
      if (!caixaHH) return;
      caixaHH.innerHTML = '';
      extras.forEach(function (h, i) {
        var l = document.createElement('div');
        l.className = 'dsp-hh-item';
        l.innerHTML = '<input type="time" value="' + esc(h.hora || '') + '" aria-label="Outro horário">' +
                      '<input type="text" maxlength="60" placeholder="do que falar nessa hora (ex: pizza e lanches)" ' +
                      'value="' + esc(h.texto_livre || '') + '">' +
                      '<button type="button" aria-label="tirar">✕</button>';
        var ins = l.querySelectorAll('input');
        ins[0].onchange = function () { extras[i].hora = this.value; };
        ins[1].oninput  = function () { extras[i].texto_livre = this.value; };
        l.querySelector('button').onclick = function () { extras.splice(i, 1); pintarHH(); };
        caixaHH.appendChild(l);
      });
    }
    pintarHH();
    var btAdd = box.querySelector('.dsp-hh-add');
    if (btAdd) btAdd.onclick = function () {
      extras.push({ hora: '12:00', texto_livre: '' });
      pintarHH();
    };
    var horaVis = box.querySelector('.dsp-hora-vis');
    function pintarHora() { horaVis.textContent = horaIn.value || '--:--'; }
    horaIn.addEventListener('input', pintarHora);
    horaIn.addEventListener('change', pintarHora);
    // no PC clicar num input invisivel so da foco; showPicker abre o seletor de verdade
    horaIn.addEventListener('click', function () {
      try { if (horaIn.showPicker) horaIn.showPicker(); } catch (e) { /* sem suporte: o input resolve sozinho */ }
    });
    pintarHora();

    function mostrarBlocos() {
      var t = a.repete.tipo;
      box.querySelector('[data-bloco="semana"]').style.display = (t === 'semana') ? '' : 'none';
      box.querySelector('[data-bloco="mes"]').style.display    = (t === 'mes') ? '' : 'none';
      var soRadio = a.modo === 'radio';
      box.querySelector('[data-bloco="assuntos"]').style.display = soRadio ? 'none' : '';
      box.querySelector('[data-bloco="livre"]').style.display    = soRadio ? 'none' : '';
      box.querySelector('[data-bloco="estacao"]').style.display  = (a.modo === 'resumao') ? 'none' : '';
    }
    mostrarBlocos();

    function marcarUnico(sel, attr, valor) {
      box.querySelectorAll(sel).forEach(function (b) {
        b.classList.toggle('sel', b.dataset[attr] === String(valor));
      });
    }

    box.querySelectorAll('[data-tipo]').forEach(function (b) {
      b.onclick = function () { a.repete.tipo = b.dataset.tipo; marcarUnico('[data-tipo]', 'tipo', a.repete.tipo); mostrarBlocos(); };
    });
    box.querySelectorAll('[data-dia]').forEach(function (b) {
      b.onclick = function () {
        var d = +b.dataset.dia, i = a.repete.dias.indexOf(d);
        if (i > -1) a.repete.dias.splice(i, 1); else a.repete.dias.push(d);
        b.classList.toggle('sel', a.repete.dias.indexOf(d) > -1);
      };
    });
    box.querySelectorAll('[data-diames]').forEach(function (b) {
      b.onclick = function () {
        var d = +b.dataset.diames, i = a.repete.diasMes.indexOf(d);
        if (i > -1) a.repete.diasMes.splice(i, 1); else a.repete.diasMes.push(d);
        b.classList.toggle('sel', a.repete.diasMes.indexOf(d) > -1);
      };
    });
    /* 12/08/2026 — marcar/limpar o mês inteiro de uma vez */
    var btTodos = box.querySelector('.dsp-mes-todos');
    var btNada  = box.querySelector('.dsp-mes-nada');
    function repintarMes() {
      box.querySelectorAll('[data-diames]').forEach(function (b) {
        b.classList.toggle('sel', a.repete.diasMes.indexOf(+b.dataset.diames) > -1);
      });
    }
    if (btTodos) btTodos.onclick = function () {
      a.repete.diasMes = [];
      for (var i = 1; i <= 31; i++) a.repete.diasMes.push(i);
      repintarMes();
    };
    if (btNada) btNada.onclick = function () { a.repete.diasMes = []; repintarMes(); };

    box.querySelectorAll('[data-idioma]').forEach(function (b) {
      b.onclick = function () { a.idioma = b.dataset.idioma; marcarUnico('[data-idioma]', 'idioma', a.idioma); };
    });
    box.querySelectorAll('[data-modo]').forEach(function (b) {
      b.onclick = function () { a.modo = b.dataset.modo; marcarUnico('[data-modo]', 'modo', a.modo); mostrarBlocos(); };
    });
    box.querySelectorAll('[data-estacao]').forEach(function (b) {
      b.onclick = function () { a.estacao = b.dataset.estacao; marcarUnico('[data-estacao]', 'estacao', a.estacao); };
    });
    box.querySelectorAll('[data-assunto]').forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.assunto, i = a.assuntos.indexOf(k);
        if (i > -1) a.assuntos.splice(i, 1); else a.assuntos.push(k);
        b.classList.toggle('sel', a.assuntos.indexOf(k) > -1);
      };
    });
    box.querySelectorAll('[data-fade]').forEach(function (b) {
      b.onclick = function () { a.fadeMins = +b.dataset.fade; marcarUnico('[data-fade]', 'fade', a.fadeMins); };
    });
    box.querySelectorAll('[data-snz]').forEach(function (b) {
      b.onclick = function () { a.sonecaMins = +b.dataset.snz; marcarUnico('[data-snz]', 'snz', a.sonecaMins); };
    });

    function fechar() { ov.remove(); pintarLista(raiz); }

    box.querySelector('.dsp-salvar').onclick = function () {
      a.hora = box.querySelector('.dsp-hora-in').value || '07:00';
      // horários: o de cima + os extras, cada um com o seu tema
      a.horarios = [{ hora: a.hora }].concat(
        extras.filter(function (h) { return /^\d{1,2}:\d{2}$/.test(h.hora || ''); })
              .map(function (h) {
                var o = { hora: h.hora };
                if ((h.texto_livre || '').trim()) o.texto_livre = h.texto_livre.trim();
                return o;
              })
      );
      a.nome = box.querySelector('.dsp-nome-in').value.slice(0, 40);
      a.texto_livre = box.querySelector('.dsp-livre').value.slice(0, 400);
      a.ativo = true;
      var l = lerLista(), achou = false;
      l = l.map(function (x) { if (x.id === a.id) { achou = true; return a; } return x; });
      if (!achou) l.push(a);
      gravarLista(l);
      fechar();
    };
    var bap = box.querySelector('.dsp-apagar');
    if (bap) bap.onclick = function () {
      gravarLista(lerLista().filter(function (x) { return x.id !== a.id; }));
      fechar();
    };
    box.querySelector('.dsp-fechar').onclick = fechar;
    ov.addEventListener('click', function (e) { if (e.target === ov) fechar(); });
  }

  // ── encaixes ───────────────────────────────────────────────────────────────
  function montarPagina(el) { estilo(); pintarLista(el); return el; }

  function montarModal() {
    estilo();
    var ex = document.getElementById('alarm-modal');
    if (ex) return ex;
    var ov = document.createElement('div');
    ov.id = 'alarm-modal';
    ov.className = 'alarm-modal';
    ov.style.display = 'none';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) {
      if (e.target !== ov) return;
      if (typeof root.fecharDespertador === 'function') root.fecharDespertador(); else fechar();
    });
    pintarLista(ov);
    return ov;
  }

  function abrir() {
    var m = document.getElementById('alarm-modal') || montarModal();
    pintarLista(m);
    m.style.display = 'flex';
  }
  function fechar() {
    var m = document.getElementById('alarm-modal');
    if (m) m.style.display = 'none';
  }

  root.VSDespertador = {
    montarPagina: montarPagina, montarModal: montarModal, abrir: abrir, fechar: fechar,
    horariosDe: horariosDe, proximoDetalhe: proximoDetalhe,
    lerLista: lerLista, gravarLista: gravarLista, novoAlarme: novoAlarme,
    proximoDe: proximoDe, proximoGeral: proximoGeral, cabeNoDia: cabeNoDia,
    ASSUNTOS: ASSUNTOS, IDIOMAS: IDIOMAS,
    CHAVE: CHAVE_LISTA
  };
})(window);
