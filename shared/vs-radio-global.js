/* vs-radio-global.js — a rádio acompanha o usuário pelo app inteiro.
 *
 * 11/08/2026 — pedido do DJ: "a rádio pode ficar ligada em todas as páginas
 * pra que possa haver a navegação com a rádio por trás".
 *
 * A VERDADE TÉCNICA, pra ninguém se enganar depois:
 * num site de várias páginas o áudio MORRE a cada navegação — a página
 * descarrega e leva o som junto. Não existe cache nem service worker que
 * segure áudio tocando. O que dá pra fazer é o que este arquivo faz:
 * lembrar que estava tocando e RETOMAR na página seguinte, sozinho.
 * Dá um vão de 1 a 2 segundos por navegação. É o preço, e é honesto dizer.
 *
 * ECONOMIA (o DJ pediu explicitamente):
 *   PARAR é parar de verdade — pause + tira o src + load(). Isso DERRUBA a
 *   conexão com o Icecast. Só mutar deixaria o stream baixando 120 kbps no
 *   silêncio, torrando bateria e dados do usuário. Aqui não se faz isso.
 *   Também não retomamos em conexão medida (save-data / 2g) sem o usuário pedir.
 *
 * API:  VSRadio.tocar() .parar() .alternar() .estado() .estacao(id)
 * Estado em localStorage: vs.radio.on · vs.radio.estacao
 */
(function (root) {
  'use strict';
  if (root.VSRadio) return;

  var CHAVE_ON = 'vs.radio.on';
  var CHAVE_EST = 'vs.radio.estacao';
  /* 27/08/2026 — a estacao de socorro TEM que existir em STREAMS. O vigia
     abaixo caia pra 'vida-boa', que sumiu na unificacao de 19/08: o teste
     "ja tentei a principal, desisto" nunca batia e ele religava a radio a
     cada 7 segundos, para sempre. */
  var PADRAO = 'floripa';

  /* 13/08/2026 — SÓ AS QUE EXISTEM. O nginx deste host mandava cultura,
     comercio, ilha-hoje, plantao, economia e sincronia TODAS pro mesmo mount:
     a pessoa trocava de estação e ouvia exatamente a mesma coisa. Agora a lista
     tem só o que o liquidsoap publica de fato. */
  // 19/08/2026 -- AS 9 ESTACOES DEFINITIVAS, iguais nos dois motores.
  // Antes cada motor tinha sua lista e a maioria apontava pra mount
  // inexistente -- o nginx mandava tudo pro /radio e todas tocavam o
  // MESMO audio. Agora cada uma tem mount proprio (conferido pelo
  // contador de ouvintes do Icecast).
  // 'legendada' usa o audio da floripa: legenda nao e estacao, e tela.
  // 'she' nao entra aqui -- toca do YouTube no aparelho de quem ouve.
  /* 27/08/2026 — A ORDEM E OS NOMES SÃO ORDEM DO DJ, nesta sequência:
     Floripa (a mais completa) · Floripa com música · Inglês · Inglês com
     música · Espanhol · Espanhol com música · Só música · SHE · Com legendas.
     A ordem daqui é a ordem que aparece na lista — não mexer sem pedido.
     ⚠️ 'poliglota' saiu da lista (não estava no pedido). O mount continua no
     ar no Icecast; só não é mais oferecido. Devolver é uma linha.
     ⚠️ 'musica' = mount vento-sul.mp3 (música 24/7), que ganhou porta própria
     no nginx em 27/08 — antes pedir "só música" devolvia notícia.
     ⚠️ 'legendada' usa o áudio da Floripa: legenda não é estação, é tela.
     ⚠️ 'she' NÃO é stream nosso — toca do YouTube no aparelho de quem ouve. */
  var STREAMS = {
    'floripa':         'https://webui.vento-sul.tech/stream-floripa',
    'ventosul':        'https://webui.vento-sul.tech/stream-sul',
    'floripa-musica':  'https://webui.vento-sul.tech/stream',
    'ingles':          'https://webui.vento-sul.tech/stream-en',
    'ingles-musica':   'https://webui.vento-sul.tech/stream-en-musica',
    'espanhol':        'https://webui.vento-sul.tech/stream-es',
    'espanhol-musica': 'https://webui.vento-sul.tech/stream-es-musica',
    'musica':          'https://webui.vento-sul.tech/stream-musica',
    'legendada':       'https://webui.vento-sul.tech/stream-floripa',
  };
  var NOMES = {
    'floripa':         '🌊 Floripa — a mais completa',
    'ventosul':        '🌪️ Vento Sul — PR, SC e RS',
    'floripa-musica':  '🎵 Floripa com música',
    'ingles':          '🇺🇸 English',
    'ingles-musica':   '🎵 English with music',
    'espanhol':        '🇪🇸 Español',
    'espanhol-musica': '🎵 Español con música',
    'musica':          '🎶 Só música',
    'legendada':       '💬 Com legendas',
  };

  var audio = null;
  var tocando = false;

  function estacaoAtual() {
    var e = null;
    try { e = localStorage.getItem(CHAVE_EST); } catch (x) {}
    // 19/08: era 'vida-boa', que sumiu na unificacao das 9 -> o endereco
    // virava undefined e NADA tocava. O padrao agora existe de verdade.
    return (e && STREAMS[e]) ? e : 'floripa';
  }
  function gravar(on) { try { localStorage.setItem(CHAVE_ON, on ? '1' : '0'); } catch (x) {} }
  function queria()   { try { return localStorage.getItem(CHAVE_ON) === '1'; } catch (x) { return false; } }
  /* 19/08/2026 — pedido do DJ: "a radio toca mesmo sem o user clicar nela,
     ja comeca escutando". Antes so ligava pra quem JA tinha ligado antes
     (`queria()`), entao quem chegava pela primeira vez nunca ouvia nada.
     Agora comeca sozinha pra todo mundo -- MENOS pra quem desligou de
     proposito ('0'). Nao atropela a escolha de ninguem. */
  function podeSozinha() { try { return localStorage.getItem(CHAVE_ON) !== '0'; } catch (x) { return true; } }

  /* Conexão medida? Não gastar o dado do usuário sem ele mandar. */
  function conexaoCara() {
    try {
      var c = navigator.connection;
      if (!c) return false;
      if (c.saveData) return true;
      return /(^|-)2g$/.test(c.effectiveType || '');
    } catch (x) { return false; }
  }

  function criarAudio() {
    if (audio) return audio;
    audio = new Audio();
    audio.preload = 'none';
    // 11/08/2026 — NAO usar crossOrigin aqui. O Icecast responde com DOIS
    // cabecalhos "Access-Control-Allow-Origin: *", e pela especificacao dois
    // ACAO fazem a checagem de CORS FALHAR. Com crossOrigin='anonymous' o
    // navegador faz essa checagem e o audio nunca carrega — foi isso que
    // segurou a radio. Pra tocar som simples nao precisa de CORS nenhum.
    audio.addEventListener('playing', function () { tocando = true; pintar(); });
    audio.addEventListener('pause',   function () { tocando = false; pintar(); });
    audio.addEventListener('error',   function () { tocando = false; pintar(); });
    return audio;
  }

  /* 13/08/2026 — ESTAÇÃO MUDA NÃO PODE DEIXAR A RÁDIO EM SILÊNCIO.
     Medido hoje: alguns mounts entregam ZERO byte (joinville e camboriu no host
     do fab). Quando a estação salva é uma dessas, o play() não dá erro — ele
     simplesmente nunca começa. Pra quem está olhando, o botão do cabeçalho
     "não funciona", e não havia nada na tela dizendo o contrário.
     Se em 7 segundos não entrou áudio, cai pra estação principal e avisa. */
  var _vigia = 0;
  function pararVigia() { clearTimeout(_vigia); _vigia = 0; }
  function vigiarInicio(idTentado) {
    pararVigia();
    _vigia = setTimeout(function () {
      _vigia = 0;
      if (somReal()) return;                       // entrou som de verdade: nada a fazer
      /* 27/08/2026 — DESLIGOU É DESLIGOU. Era ESTE vigia que fazia a rádio
         "voltar sozinha" uns 7s depois de a pessoa apertar o 📻: ele não
         ficava sabendo do desligamento, chamava tocar() de novo, e o tocar()
         regravava vs.radio.on='1' — ressuscitando a rádio ali e na próxima
         página. O parar() agora cancela o vigia; esta é a segunda tranca. */
      if (!podeSozinha()) return;
      if (idTentado === PADRAO) {                  // a principal também mudou: avisa e para
        console.warn('[rádio] não respondeu — sem toast (balão azul removido 23/08)');
        return;
      }
      try { localStorage.setItem(CHAVE_EST, PADRAO); } catch (e) {}
      console.warn('[rádio] estação muda sem áudio — caiu pra ' + PADRAO + ' (sem toast)');
      tocar();
    }, 7000);
  }

  function tocar() {
    var id = estacaoAtual();
    var a = criarAudio();
    // ?t= porque cache nunca pode barrar o ao vivo
    a.src = STREAMS[id] + '?t=' + Date.now();
    var p = a.play();
    gravar(true);
    vigiarInicio(id);
    if (p && p.then) {
      p.then(function () {
        tocando = true; pintar(); mediaSession(id);
      }).catch(function () {
        // navegador exigiu gesto — fica armado e toca no primeiro toque
        tocando = false; pintar(); armarPrimeiroToque();
      });
    }
    return p;
  }

  /* PARAR DE VERDADE — derruba a conexão. Não é mute. */
  function parar() {
    gravar(false);
    pararVigia();      // 27/08: senão o vigia religa a rádio 7 segundos depois
    desarmar();        // 27/08: e o gatilho do "primeiro toque" religa no toque seguinte
    tocando = false;
    if (audio) {
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();          // é isto que corta o download do stream
      } catch (x) {}
    }
    pintar();
  }

  function alternar() { return tocando ? (parar(), false) : (tocar(), true); }

  function estacao(id) {
    if (!STREAMS[id]) return;
    try { localStorage.setItem(CHAVE_EST, id); } catch (x) {}
    if (tocando) { tocar(); }   // troca na hora
  }

  function mediaSession(id) {
    try {
      if (!('mediaSession' in navigator)) return;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Rádio Vento Sul — ' + (NOMES[id] || id),
        artist: 'Barra da Lagoa · Florianópolis',
        album: 'Vento Sul'
      });
      navigator.mediaSession.setActionHandler('play',  function(){ tocar(); });
      navigator.mediaSession.setActionHandler('pause', function(){ parar(); });
      navigator.mediaSession.setActionHandler('stop',  function(){ parar(); });
    } catch (x) {}
  }

  var armado = false;
  /* 27/08/2026 — O TOQUE NO PRÓPRIO 📻 NÃO É O "PRIMEIRO TOQUE".
     Era isto que fazia o botão parecer morto: este gatilho roda na CAPTURA,
     ligava a rádio, e só depois o clique chegava no botão — que, com o play()
     ainda pendente, via tudo parado e ligava também. Apertar pra desligar
     acabava ligando. Agora, toque em controle de rádio só desarma o gatilho
     e deixa o botão decidir. */
  var CONTROLES = '#ph-mute,#btn-mute,#fab-megafone,#bb-radio,#vs-station-picker,#vsre-fundo';
  function ehControleRadio(e) {
    try {
      var t = e && e.target;
      if (t && t.nodeType !== 1) t = t.parentElement;
      return !!(t && t.closest && t.closest(CONTROLES));
    } catch (x) { return false; }
  }
  function desarmar() {
    document.removeEventListener('click', go, true);
    document.removeEventListener('touchstart', go, true);
    armado = false;
  }
  function go(e) {
    if (ehControleRadio(e)) { desarmar(); return; }   // quem manda ali é o botão
    desarmar();
    if (podeSozinha() && !tocando) tocar();
  }
  function armarPrimeiroToque() {
    if (armado) return; armado = true;
    document.addEventListener('click', go, true);
    document.addEventListener('touchstart', go, true);
  }

  /* Pinta o 📻 do cabeçalho: aceso quando toca, riscado quando parado.
   * O EMOJI NUNCA MUDA — é sempre 📻, ligado ou desligado, pro usuário
   * reconhecer que ali é a rádio que ele liga e desliga (pedido do DJ, 12/08).
   * Dois cabeçalhos no app: #ph-mute (vs-page-header, demais páginas) e
   * #btn-mute (index.html, que tem cabeçalho próprio). Pinta os dois. */
  function pintar() {
    var bs = [document.getElementById('ph-mute'), document.getElementById('btn-mute')];
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i];
      if (!b) continue;
      b.classList.toggle('muted', !tocando);
      b.setAttribute('title', tocando ? 'Rádio tocando — toque para parar' : 'Tocar a rádio');
      b.setAttribute('aria-label', b.getAttribute('title'));
    }
  }

  /* Retoma sozinho na página nova, se estava tocando quando saiu. */
  function retomar() {
    pintar();
    if (!podeSozinha()) return;        // desligou de proposito: respeita
    if (conexaoCara()) return;         // não queima o dado do usuário
    // tenta tocar ja; se o navegador exigir gesto, o proprio tocar() arma o
    // primeiro toque -- e ai qualquer toque na pagina liga a radio, sem
    // precisar procurar o botao. O icone piscando mostra onde desligar.
    tocar();
    if (!queria()) armarPrimeiroToque();
  }

  /* ═══════════════════════════════════════════════════════════════════════
     13/08/2026 — NÃO ATROPELA O OUTRO MOTOR.
     O app tem DOIS motores de rádio, cada um com seu próprio objeto Audio:
     este (páginas em geral) e o radio-fab.js (index/rodapé). Os dois publicavam
     em window.VSRadio, e quem carregasse por último apagava o outro.
     Resultado: o 📻 do cabeçalho chama VSRadio.alternar(), que no objeto do fab
     NÃO EXISTE — o clique estourava TypeError e a rádio não desligava, ainda mais
     porque o som podia estar saindo justamente do motor apagado.
     Agora quem chega depois preserva quem estava, e parar() para OS DOIS.
     ⚠️ O certo mesmo é ter um motor só; isto faz os dois conviverem sem mentir. */
  var _outro = root.VSRadio || null;
  if (_outro) root.VSRadioFab = _outro;

  function _outroTocando() {
    try {
      if (!_outro) return false;
      if (typeof _outro.tocando === 'function') return !!_outro.tocando();
      if (typeof _outro.estado === 'function') return !!_outro.estado().tocando;
    } catch (e) {}
    return false;
  }
  function pararTudo() {
    try { parar(); } catch (e) {}
    try { if (_outro && _outro.parar) _outro.parar(); } catch (e) {}
  }

  /* 13/08/2026 — PERGUNTA AO ÁUDIO, NÃO À FLAG.
     A variável `tocando` só vira true no evento 'playing' e volta a false no
     'pause'/'error' — mas ela pode ficar presa em true se o elemento morrer sem
     emitir evento (aba suspensa, rede caindo, retomada que não vingou). Quando
     isso acontece, TODO clique no 📻 do cabeçalho é interpretado como "desligar"
     e a rádio nunca começa — foi o que o DJ relatou em 13/08 e o que eu não
     conseguia reproduzir, justamente porque num navegador recém-aberto a flag
     nasce limpa. O elemento <audio> sabe a verdade: `paused` não mente. */
  function tocandoDeVerdade() {
    try { return !!(audio && !audio.paused && !audio.ended); } catch (e) { return false; }
  }
  /* ⚠️ "não pausado" NÃO quer dizer "saindo som": um mount mudo fica carregando
     para sempre, sem pausar nunca. Só o relógio andando prova que entrou áudio. */
  function somReal() {
    try { return !!(audio && !audio.paused && !audio.ended && audio.currentTime > 0.4); }
    catch (e) { return false; }
  }

  /* o botão do cabeçalho passa por aqui: se QUALQUER motor estiver tocando,
     desligar tem que desligar tudo — senão o usuário aperta e o som continua */
  function alternarTudo() {
    if (tocandoDeVerdade() || _outroTocando()) { pararTudo(); return false; }
    // nada tocando de fato: zera qualquer estado preso antes de ligar
    if (tocando) { try { parar(); } catch (e) {} }
    tocar();
    return true;
  }

  /* 18/08/2026 - garante o popout de legendas carregado em qualquer pagina
     que tenha o radio do cabecalho. */
  if (!root.VSLegendas && !document.getElementById('vsleg-src')) {
    var _lg = document.createElement('script');
    _lg.id = 'vsleg-src'; _lg.src = '/shared/vs-legendas-pop.js?v=1'; _lg.defer = true;
    document.head.appendChild(_lg);
  }

  root.VSRadio = {
    tocar: tocar, parar: pararTudo, alternar: alternarTudo,
    estacao: estacao, estacoes: STREAMS, nomes: NOMES,
    estado: function () { return { tocando: tocandoDeVerdade() || _outroTocando(), estacao: estacaoAtual() }; },
    pintar: pintar,
    // nomes que o radio-fab.js publica — mantidos pra não quebrar quem os chama
    toggle: alternarTudo,
    tocando: function () { return tocandoDeVerdade() || _outroTocando(); },
    abrir: (_outro && _outro.abrir) || function () { location.href = '/radio.html'; }
  };

  /* ═══════════════════════════════════════════════════════════════════════
     13/08/2026 — SEGURAR O 📻 ABRE AS ESTAÇÕES (pedido do DJ).
     Toque curto continua ligando/desligando. Segurar 500ms abre a lista.
     Só entram estações que ESTÃO NO AR: as 9 daqui foram medidas em 13/08 e
     todas entregam áudio. Se alguma emudecer depois, quem segura a barra é o
     vigiarInicio(): 7s sem som e ele devolve pra Vida Boa avisando.
     ⚠️ Não dá pra testar as estações pelo navegador: o Icecast responde com
     DOIS cabeçalhos Access-Control-Allow-Origin, o que faz a checagem de CORS
     falhar — um fetch de teste diria "quebrada" para TODAS. Por isso a régua é
     a medição no servidor + o socorro dos 7s, não um teste no cliente. */
  var CSS_EST = 'vs-radio-estacoes';
  function estilos() {
    if (document.getElementById(CSS_EST)) return;
    var s = document.createElement('style');
    s.id = CSS_EST;
    s.textContent =
      '#vsre-fundo{position:fixed;inset:0;z-index:99996;background:rgba(0,0,0,.62);backdrop-filter:blur(4px);' +
        'display:flex;align-items:flex-start;justify-content:center;padding-top:64px}' +
      '#vsre-cx{background:#131a23;border:1px solid #1f2937;border-radius:16px;padding:12px;' +
        'width:min(94vw,380px);max-height:76vh;overflow:auto;box-shadow:0 12px 40px rgba(0,0,0,.6)}' +
      '#vsre-cx h4{font:800 12px system-ui;color:#94a3b8;letter-spacing:.06em;text-transform:uppercase;' +
        'padding:2px 6px 10px;margin:0}' +
      '.vsre-i{display:flex;align-items:center;gap:11px;width:100%;padding:12px;margin-bottom:6px;' +
        'border-radius:12px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);' +
        'color:#e5e7eb;font:600 15px system-ui;cursor:pointer;text-align:left}' +
      '.vsre-i.on{background:rgba(6,182,212,.18);border-color:rgba(6,182,212,.55);color:#67e8f9}' +
      '.vsre-i:active{transform:scale(.985)}' +
      '#vsre-x{width:100%;margin-top:4px;padding:11px;border-radius:12px;cursor:pointer;background:transparent;' +
        'border:1px solid #1f2937;color:#94a3b8;font:600 13px system-ui}';
    document.head.appendChild(s);
  }
  function fecharEstacoes() {
    var d = document.getElementById('vsre-fundo');
    if (d) d.remove();
  }
  function abrirEstacoes() {
    if (document.getElementById('vsre-fundo')) return fecharEstacoes();
    estilos();
    var atual = estacaoAtual();
    var d = document.createElement('div');
    d.id = 'vsre-fundo';
    var cx = document.createElement('div');
    cx.id = 'vsre-cx';
    cx.innerHTML = '<h4>📻 Escolha a estação</h4>';
    /* 27/08/2026 — A ORDEM DA LISTA É ORDEM DO DJ e está escrita aqui, à mão.
       Antes vinha de Object.keys(STREAMS), e aí a SHE (que não é stream) só
       podia entrar no fim — saía depois das legendas, fora da ordem pedida. */
    var ORDEM = ['floripa','ventosul','floripa-musica','ingles','ingles-musica',
                 'espanhol','espanhol-musica','musica','she','legendada'];
    ORDEM.forEach(function (id) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'vsre-i' + (id === atual ? ' on' : '');
      var nome = (id === 'she') ? '💫 SHE — todos ouvindo junto' : (NOMES[id] || id);
      b.textContent = (id === atual ? '🔊 ' : (id === 'she' ? '💫 ' : '📻 ')) + nome;
      b.addEventListener('click', function () {
        fecharEstacoes();
        /* a SHE não é stream nosso: quem toca é o YouTube no aparelho de quem
           ouve. Para a rádio e abre o player dela. */
        if (id === 'she') {
          pararTudo();
          if (root.sheAbrir) root.sheAbrir(); else location.href = '/radio.html#she';
          return;
        }
        try { localStorage.setItem(CHAVE_EST, id); } catch (e) {}
        pararTudo();
        tocar();
        /* 27/08/2026 — "Com legendas" é estação E tela: escolher ela já abre o
           painel dos 3 idiomas. Antes eram duas portas pra mesma coisa (a
           estação numa linha e um botão 🌎 noutra), e o DJ tinha que descobrir
           que precisava apertar as duas. Uma linha, uma coisa. */
        if (id === 'legendada') {
          setTimeout(function () { if (root.VSLegendas) root.VSLegendas.abrir(); }, 300);
        }
      });
      cx.appendChild(b);
    });

    var x = document.createElement('button');
    x.id = 'vsre-x'; x.type = 'button'; x.textContent = 'fechar';
    x.addEventListener('click', fecharEstacoes);
    cx.appendChild(x);
    d.appendChild(cx);
    d.addEventListener('click', function (e) { if (e.target === d) fecharEstacoes(); });
    document.body.appendChild(d);
  }

  /* liga o toque longo nos dois botões de rádio do app */
  function armarToqueLongo() {
    ['ph-mute', 'btn-mute'].forEach(function (id) {
      var b = document.getElementById(id);
      if (!b || b._vsreArmado) return;
      b._vsreArmado = true;
      var t = 0, disparou = false;
      var comecar = function () {
        disparou = false;
        clearTimeout(t);
        t = setTimeout(function () { disparou = true; t = 0; abrirEstacoes(); }, 500);
      };
      var cancelar = function () { clearTimeout(t); t = 0; };
      b.addEventListener('mousedown', comecar);
      b.addEventListener('touchstart', comecar, { passive: true });
      ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(function (n) {
        b.addEventListener(n, cancelar);
      });
      // se o toque longo abriu a lista, o clique que vem atrás não pode ligar a rádio
      b.addEventListener('click', function (e) {
        if (disparou) { disparou = false; e.preventDefault(); e.stopImmediatePropagation(); }
      }, true);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', retomar);
  } else {
    retomar();
  }
  // o cabeçalho entra em defer: tenta armar algumas vezes até ele existir
  setTimeout(armarToqueLongo, 300);
  setTimeout(armarToqueLongo, 1200);
  setTimeout(armarToqueLongo, 2500);
  // o cabeçalho carrega em defer e pode chegar depois: repinta quando chegar
  setTimeout(pintar, 300);
  setTimeout(pintar, 1200);
})(window);
