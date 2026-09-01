// v9 / 2026-05-19
// Vento Sul — FAB Rádio — 📣 megafone flutuante, sem círculo, glow radiante
// Clique → liga/pausa · Long-press (500ms) → troca estação
(function () {
  if (window.__VS_RADIO_FAB__) return;
  window.__VS_RADIO_FAB__ = true;

  /* ═══════════════════════════════════════════════════════════════════════
     27/08/2026 — UM MOTOR SO (ordem do DJ: "fica com as paginas de dentro").
     Este arquivo TINHA motor proprio: seu <audio>, sua lista de estacoes, seu
     vigia, seu "primeiro toque". Eram DOIS motores no mesmo app, e nao eram
     iguais — a lista daqui apontava pra radio.vento-sul.tech, onde tres
     estacoes caiam na musica generica, e faltavam aqui o controle da tela de
     bloqueio e a lista no toque longo. Todo botao tinha que perguntar "quem
     esta tocando?" antes de agir, e era dessa pergunta que nasciam os
     fantasmas. Agora o megafone e SO A CARA: quem toca e o vs-radio-global.js.
     ⚠️ Nao publicar window.VSRadio daqui — o dono do nome e o outro arquivo. */
  if (!window.VSRadio && !document.getElementById('vs-radio-global-js')) {
    var _rg = document.createElement('script');
    _rg.id = 'vs-radio-global-js';
    _rg.src = '/shared/vs-radio-global.js?v=20260827d';
    _rg.defer = true;
    document.head.appendChild(_rg);
  }
  /* o motor pode chegar depois (defer): faz a tarefa assim que ele existir */
  function comMotor(tarefa, tentativa) {
    if (window.VSRadio) { try { tarefa(window.VSRadio); } catch (e) {} return; }
    tentativa = (tentativa || 0) + 1;
    if (tentativa > 60) return;            // ~15s: desiste calado, sem travar a pagina
    setTimeout(function () { comMotor(tarefa, tentativa); }, 250);
  }
  function motorTocando() {
    try { return !!(window.VSRadio && window.VSRadio.tocando()); } catch (e) { return false; }
  }

  // Megafone como SVG fixo (não emoji) — fica IGUAL em todo aparelho/navegador.
  const MEGA_SVG = '<svg viewBox="0 0 24 24" width="38" height="38" aria-hidden="true"><defs><linearGradient id="vsMega" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6ec8ff"/><stop offset=".55" stop-color="#a855f7"/><stop offset="1" stop-color="#ffd54f"/></linearGradient></defs><path d="M4 9.3h3l11-5v15l-11-5H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z" fill="url(#vsMega)"/><path d="M7.2 14.4l1.2 4.7a1.3 1.3 0 0 0 2.5-.6l-.55-2.9" fill="url(#vsMega)"/><path d="M20 8.4a5 5 0 0 1 0 7.2" fill="none" stroke="#ffd54f" stroke-width="1.8" stroke-linecap="round"/></svg>';

  /* 18/08/2026 - carrega o popout de legendas (PT/EN/ES em tela cheia).
     Sem isso o botao Legendas da lista nao teria o que abrir. */
  if (!window.VSLegendas && !document.getElementById('vsleg-src')) {
    var _lg = document.createElement('script');
    _lg.id = 'vsleg-src'; _lg.src = '/shared/vs-legendas-pop.js?v=1'; _lg.defer = true;
    document.head.appendChild(_lg);
  }
  // 19/08/2026 -- AS 9 ESTACOES DEFINITIVAS, iguais nos dois motores.
  // Antes cada motor tinha sua lista e a maioria apontava pra mount
  // inexistente -- o nginx mandava tudo pro /radio e todas tocavam o
  // MESMO audio. Agora cada uma tem mount proprio (conferido pelo
  // contador de ouvintes do Icecast).
  // 'legendada' usa o audio da floripa: legenda nao e estacao, e tela.
  // 'she' nao entra aqui -- toca do YouTube no aparelho de quem ouve.
  /* ⚠️ 27/08/2026 — ESTA LISTA NAO TOCA MAIS NADA. Ficou so pra dizer quais
     nomes de estacao sao validos (getEstacao valida o que veio do aparelho).
     Os ENDERECOS foram embora de proposito: eram os de radio.vento-sul.tech e
     NAO batiam com os do outro motor (webui.vento-sul.tech). Foi essa lista
     dupla que fez "espanhol com musica", "ingles com musica" e "misturada"
     tocarem a musica generica na pagina inicial enquanto tocavam certo nas
     outras paginas — descoberto medindo estacao por estacao em 27/08.
     ⚠️ Endereco de estacao agora existe num lugar SO: vs-radio-global.js. */
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
  /* ⚠️ Aqui só valem os NOMES (validação do que veio guardado no aparelho).
     Endereço de estação existe num lugar SÓ: vs-radio-global.js. */
  const STREAMS = {
    'floripa': true, 'ventosul': true, 'floripa-musica': true,
    'ingles': true, 'ingles-musica': true,
    'espanhol': true, 'espanhol-musica': true,
    'musica': true, 'legendada': true,
  };
  const STATION_LABELS = {
    'floripa': '🌊 Floripa — a mais completa',
    'ventosul': '🌪️ Vento Sul — PR, SC e RS',
    'floripa-musica': '🎵 Floripa com música',
    'ingles': '🇺🇸 English',
    'ingles-musica': '🎵 English with music',
    'espanhol': '🇪🇸 Español',
    'espanhol-musica': '🎵 Español con música',
    'musica': '🎶 Só música',
    'she': '💫 SHE — todos ouvindo junto',
    'legendada': '💬 Com legendas',
  };

  /* 19/08/2026 — nome seguro: aparelho com estacao ANTIGA (vida-boa, cultura,
     poliglota...) devolvia undefined e o balao saia vazio na tela. Nunca mais.
     ⚠️ 27/08: esta funcao quase se perdeu num recorte meu — `node --check` NAO
     pega funcao que sumiu, so erro de sintaxe. Conferir por uso, nao por parse. */
  function rotulo(id) {
    return (id && STATION_LABELS[id]) || STATION_LABELS['floripa'] || 'Vento Sul';
  }

  const MAIN_STATIONS = ['floripa','ventosul','floripa-musica','ingles','ingles-musica','espanhol','espanhol-musica','musica','she','legendada'];
  const CULTURA_SUBS = [];
  const LS_KEY = 'vs.radio.estacao';

  function getEstacao() {
    const s = localStorage.getItem(LS_KEY);
    // 19/08: aceitar QUALQUER coisa guardada era o bug — aparelho com estacao
    // antiga ('vida-boa', 'cultura'...) devolvia endereco undefined e a radio
    // ficava muda. So vale se a estacao existir de verdade em STREAMS.
    if (s && STREAMS[s]) return s;
    // sem escolha salva: acompanha o idioma do app (EN/ES têm estação própria)
    try {
      const p = JSON.parse(localStorage.getItem('ventosul_pwa_v1') || '{}');
      const porIdioma = { 1: 'ingles', 2: 'espanhol' };
      if (porIdioma[p.idiomaIdx]) return porIdioma[p.idiomaIdx];
    } catch (e) {}
    return 'floripa';
  }
  function setEstacao(slug) { localStorage.setItem(LS_KEY, slug); }

  function garantirStyles() {
    if (document.getElementById('vs-fab-styles')) return;
    const s = document.createElement('style');
    s.id = 'vs-fab-styles';
    s.textContent = `
      @keyframes vs-mega-glow {
        0%,100% {
          filter: drop-shadow(0 0 7px rgba(6,182,212,.9))
                  drop-shadow(0 0 16px rgba(168,85,247,.65));
          transform: scale(1);
        }
        50% {
          filter: drop-shadow(0 0 22px rgba(6,182,212,1))
                  drop-shadow(0 0 38px rgba(168,85,247,.95))
                  drop-shadow(0 0 58px rgba(255,213,79,.6));
          transform: scale(1.14);
        }
      }
/* 19/08/2026 — pedido do DJ: "faz o botao que ja existe piscar".
   Quando a radio esta TOCANDO, o botao do rodape pisca. E como a pessoa
   descobre onde desligar sem procurar. Nada novo foi criado: e o mesmo
   #btn-mute / #ph-mute de sempre, so ganhou o piscar.
   Parado = sem piscar. Tocando = piscando. */
@keyframes vs-pisca-desliga {
  0%,100% { opacity: 1;   transform: scale(1);    filter: none; }
  50%     { opacity: .35; transform: scale(1.14); filter: drop-shadow(0 0 8px #38bdf8); }
}
#btn-mute:not(.muted), #ph-mute:not(.muted) {
  animation: vs-pisca-desliga 1.15s ease-in-out infinite;
}
/* quem prefere menos movimento na tela nao ve o piscar */
@media (prefers-reduced-motion: reduce) {
  #btn-mute:not(.muted), #ph-mute:not(.muted) { animation: none; opacity: 1; }
}
      @keyframes vs-mega-play {
        0%,100% {
          filter: drop-shadow(0 0 8px rgba(239,68,68,.95))
                  drop-shadow(0 0 22px rgba(239,68,68,.6));
          transform: scale(1);
        }
        50% {
          filter: drop-shadow(0 0 24px rgba(239,68,68,1))
                  drop-shadow(0 0 44px rgba(255,100,50,.8));
          transform: scale(1.1);
        }
      }
      @keyframes vs-badge-blink { 0%,100%{opacity:1} 50%{opacity:.6} }
      #vs-station-picker { display:none }
      #vs-station-picker.on { display:flex }
    `;
    document.head.appendChild(s);
  }

  // Posiciona megafone/badge/picker SEMPRE acima do #bottom-bar real
  // (altura do rodapé varia com A+/safe-area — valor fixo cobria os botões de navegação)
  let _posObservado = false;
  function ajustarPosicoes() {
    const bar = document.getElementById('bottom-bar');
    // altura medida do rodapé já inclui o padding com env(safe-area); sem rodapé, mantém o antigo
    const baseCss = bar
      ? (Math.ceil(bar.getBoundingClientRect().height) + 72) + 'px'
      : 'calc(155px + env(safe-area-inset-bottom, 0px))';
    const fab = document.getElementById('fab-megafone');
    const badge = document.getElementById('fab-radio-badge');
    const picker = document.getElementById('vs-station-picker');
    if (fab) fab.style.bottom = baseCss;
    const acimaCss = 'calc(' + baseCss + ' + 56px)';
    if (badge) badge.style.bottom = acimaCss;
    /* 13/08/2026 — NÃO REANCORAR A LISTA quando ela está presa ao cabeçalho.
       Esta função roda no resize e pelo ResizeObserver do rodapé, e reescrevia o
       `bottom` do picker — desfazendo o posicionamento do botão do cabeçalho.
       No navegador do computador (janela alta) o resultado era a lista crescer
       PRA CIMA e as primeiras estações ficarem fora da tela, sem alcance. */
    if (picker && picker.dataset.ancora !== 'cabecalho') picker.style.bottom = acimaCss;
    if (!_posObservado) {
      _posObservado = true;
      if (bar && window.ResizeObserver) new ResizeObserver(ajustarPosicoes).observe(bar);
      window.addEventListener('resize', ajustarPosicoes);
    }
  }

  function criarBadge(estacao) {
    if (document.getElementById('fab-radio-badge')) return document.getElementById('fab-radio-badge');
    const b = document.createElement('div');
    b.id = 'fab-radio-badge';
    b.style.cssText = `
      display:none;position:fixed;bottom:calc(211px + env(safe-area-inset-bottom, 0px));right:14px;z-index:999;
      background:#ef4444;color:#fff;font-size:11px;font-weight:700;
      padding:3px 9px;border-radius:20px;white-space:nowrap;pointer-events:none;
      box-shadow:0 2px 8px rgba(239,68,68,.5);
      animation:vs-badge-blink 1.2s ease infinite;
    `;
    b.textContent = '🔴 ' + rotulo(estacao) + ' AO VIVO';
    document.body.appendChild(b);
    ajustarPosicoes();
    return b;
  }

  function criarStationPicker(onSelect) {
    if (document.getElementById('vs-station-picker')) return document.getElementById('vs-station-picker');
    const picker = document.createElement('div');
    picker.id = 'vs-station-picker';
    /* 13/08/2026 — z-index alto e gap maior: a lista precisa passar POR CIMA do
       botão que a abriu e do balão do círculo da comunidade, senão ela nasce
       atrás deles justo na hora de escolher. Fonte também subiu (12px -> 15px):
       nome de estação em 12px, com o dedo em cima, ninguém lê. */
    picker.style.cssText = 'position:fixed;bottom:calc(211px + env(safe-area-inset-bottom, 0px));right:14px;z-index:2147483000;flex-direction:column;gap:6px;align-items:flex-end;';

    function buildMain() {
      picker.innerHTML = '';
      MAIN_STATIONS.forEach(function(slug) {
        const btn = document.createElement('button');
        const isActive = getEstacao() === slug;
        btn.textContent = rotulo(slug);
        btn.style.cssText = `
          background:${isActive ? 'rgba(168,85,247,.4)' : 'rgba(10,14,20,.9)'};
          border:1px solid ${isActive ? '#a855f7' : 'rgba(255,255,255,.15)'};
          border-radius:22px;color:#fff;padding:11px 18px;font-size:15px;
          white-space:nowrap;cursor:pointer;
        `;
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          picker.classList.remove('on');
          /* 19/08/2026 — a SHE nao e stream nosso: quem toca e o YouTube no
             aparelho de quem ouve (por isso ela nao gasta CPU nem banda
             nossa). Nao pode passar pelo <audio> comum -- abre o player dela. */
          if (slug === 'she') {
            comMotor(function (R) { try { R.parar(); } catch (x) {} });
            if (window.sheAbrir) { window.sheAbrir(); }
            else { location.href = '/radio.html#she'; }
            return;
          }
          onSelect(slug);
          /* 27/08/2026 — "Com legendas" é estação E tela: abre o painel dos 3
             idiomas junto, pra não ter duas portas pra mesma coisa. */
          if (slug === 'legendada') {
            setTimeout(function () { if (window.VSLegendas) window.VSLegendas.abrir(); }, 300);
          }
        });
        picker.appendChild(btn);
      });

      /* 18/08/2026 - o DJ nao achava as legendas: viviam escondidas numa aba
         dentro da radio.html, em fonte miuda, e o espanhol nunca aparecia
         (quem preenchia so mandava pt e en). Agora sai daqui, por cima de
         qualquer pagina, ocupando quase a tela toda. */
      var legBtn = document.createElement('button');
      legBtn.textContent = '\u{1F30E} Legendas PT\u00B7EN\u00B7ES';
      legBtn.style.cssText = 'background:rgba(6,182,212,.22);border:1px solid rgba(6,182,212,.6);'
        + 'border-radius:22px;color:#e0f2fe;padding:11px 18px;font-size:15px;'
        + 'white-space:nowrap;cursor:pointer;font-weight:600;';
      legBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        picker.classList.remove('on');
        if (window.VSLegendas) window.VSLegendas.abrir();
        else location.href = '/radio.html';
      });
      picker.appendChild(legBtn);
    }

    function buildCulturaSub() {
      picker.innerHTML = '';
      const back = document.createElement('button');
      back.textContent = '← Voltar';
      back.style.cssText = 'background:rgba(10,14,20,.9);border:1px solid rgba(255,255,255,.15);border-radius:22px;color:#bbb;padding:9px 15px;font-size:13.5px;cursor:pointer;';
      back.addEventListener('click', function(e) { e.stopPropagation(); buildMain(); });
      picker.appendChild(back);
      CULTURA_SUBS.forEach(function(opt) {
        const btn = document.createElement('button');
        const isActive = getEstacao() === opt.slug;
        btn.title = opt.desc;
        btn.innerHTML = opt.label + (isActive ? ' ✓' : '');
        btn.style.cssText = `
          background:${isActive ? 'rgba(168,85,247,.4)' : 'rgba(10,14,20,.9)'};
          border:1px solid ${isActive ? '#a855f7' : 'rgba(255,255,255,.15)'};
          border-radius:22px;color:#fff;padding:11px 18px;font-size:15px;
          white-space:nowrap;cursor:pointer;
        `;
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          onSelect(opt.slug);
          picker.classList.remove('on');
        });
        picker.appendChild(btn);
      });
    }

    buildMain();
    document.body.appendChild(picker);
    ajustarPosicoes();
    return picker;
  }

  function instalarComportamento(fab) {
    garantirStyles();
    let estacao = getEstacao();
    const badge = criarBadge(estacao);
    // 27/08: nao existe mais <audio> aqui. `playing` e so o espelho do motor.
    let playing = false;
    let longPressTimer = null;
    let longPressFired = false;
    let pickerOpen = false;

    const picker = criarStationPicker(function(slug) {
      setEstacao(slug);
      estacao = slug;
      badge.textContent = '🔴 ' + STATION_LABELS[slug] + ' AO VIVO';
      // 27/08: quem troca de estacao (e derruba a conexao antiga) e o motor
      comMotor(function (R) { try { R.estacao(slug); } catch (e) {} });
      pickerOpen = false;
    });

    document.addEventListener('click', function(e) {
      if (pickerOpen && e.target !== fab && !picker.contains(e.target)) {
        picker.classList.remove('on');
        pickerOpen = false;
      }
    });

    function startLongPress() {
      longPressFired = false;
      longPressTimer = setTimeout(function() {
        longPressFired = true;
        longPressTimer = null;
        pickerOpen = !pickerOpen;
        if (pickerOpen) {
          // aberto pelo FAB: volta a ancorar embaixo à direita, como sempre foi
          delete picker.dataset.ancora;
          picker.style.top = 'auto'; picker.style.left = 'auto';
          picker.style.maxHeight = ''; picker.style.alignItems = 'flex-end';
          picker.style.right = '14px';
          picker.classList.add('on');
          ajustarPosicoes();
        } else picker.classList.remove('on');
      }, 500);
    }
    function cancelLongPress() {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    }

    /* ═══════════════════════════════════════════════════════════════════════
       13/08/2026 — SEGURAR O 📻 DO CABEÇALHO ABRE AS ESTAÇÕES (pedido do DJ:
       "fico clicando sem soltar e aparecem as estações que podem ser tocadas").

       Este seletor já existia, mas só no FAB megafone. Eu tinha escrito outro
       dentro do vs-radio-global.js e ele NUNCA rodava: aquele arquivo começa com
       `if (root.VSRadio) return;` e o radio-fab.js costuma carregar primeiro —
       ou seja, o global saía inteiro na primeira linha. Reaproveitar o seletor
       daqui resolve, e ainda vale em TODA página, porque este arquivo é o único
       dos dois que carrega em todas.

       Toque curto continua ligando/desligando; segurar 500ms abre a lista. */
    function ligarToqueLongoCabecalho() {
      ['ph-mute', 'btn-mute'].forEach(function (id) {
        var b = document.getElementById(id);
        if (!b || b._vsEstArmado) return;
        b._vsEstArmado = true;
        var t = null, abriu = false;
        var segurar = function () {
          abriu = false;
          clearTimeout(t);
          t = setTimeout(function () {
            abriu = true; t = null;
            pickerOpen = true;
            picker.classList.add('on');
            /* 13/08/2026 — A LISTA ABRE JUNTO DO BOTÃO QUE A CHAMOU.
               O picker nasceu preso ao FAB (canto de baixo à direita). Quando o
               DJ passou a abri-lo segurando o 📻 do CABEÇALHO — que fica em cima
               à ESQUERDA — a lista aparecia lá embaixo, atrás do FAB: longe do
               dedo e escondida. Agora ela se ancora no próprio botão. */
            try {
              var r = b.getBoundingClientRect();
              var esquerda = r.left < window.innerWidth / 2;
              picker.dataset.ancora = 'cabecalho';
              picker.style.bottom = 'auto';
              picker.style.top = Math.round(r.bottom + 10) + 'px';
              picker.style.maxHeight = (window.innerHeight - Math.round(r.bottom) - 24) + 'px';
              picker.style.overflowY = 'auto';
              picker.style.overscrollBehavior = 'contain';
              if (esquerda) {
                picker.style.left = Math.max(8, Math.round(r.left - 6)) + 'px';
                picker.style.right = 'auto';
                picker.style.alignItems = 'flex-start';
              } else {
                picker.style.right = Math.max(8, Math.round(window.innerWidth - r.right - 6)) + 'px';
                picker.style.left = 'auto';
                picker.style.alignItems = 'flex-end';
              }
            } catch (x) {}
          }, 500);
        };
        var soltar = function () { if (t) { clearTimeout(t); t = null; } };
        b.addEventListener('mousedown', segurar);
        b.addEventListener('touchstart', segurar, { passive: true });
        ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(function (n) {
          b.addEventListener(n, soltar);
        });
        // o clique que vem depois do toque longo não pode ligar a rádio junto
        b.addEventListener('click', function (e) {
          if (abriu) { abriu = false; e.preventDefault(); e.stopImmediatePropagation(); }
        }, true);
      });
    }
    // o cabeçalho entra por script defer: tenta até ele existir
    ligarToqueLongoCabecalho();
    setTimeout(ligarToqueLongoCabecalho, 600);
    setTimeout(ligarToqueLongoCabecalho, 1800);
    setTimeout(ligarToqueLongoCabecalho, 3200);

    fab.addEventListener('mousedown', startLongPress);
    fab.addEventListener('touchstart', startLongPress, { passive:true });
    fab.addEventListener('mouseup', cancelLongPress);
    fab.addEventListener('mouseleave', cancelLongPress);
    fab.addEventListener('touchend', cancelLongPress);
    fab.addEventListener('touchcancel', cancelLongPress);

    /* 13/08/2026 — ESTAÇÃO MUDA NÃO PODE DEIXAR A RÁDIO EM SILÊNCIO.
       Medido hoje: os mounts radio-joinville e radio-camboriu entregam ZERO byte.
       Com uma dessas salva em vs.radio.estacao, o play() resolve sem erro e o som
       nunca entra: pra quem olha, o 📻 do cabeçalho simplesmente não funciona.
       Foi assim que o bug do DJ (13/08) foi finalmente reproduzido — na landing,
       que é onde ESTE motor toca. Se em 7s não entrou áudio, volta pra principal. */
    /* 27/08/2026 — O VIGIA MORA NO MOTOR AGORA.
       O socorro de estacao muda (7s sem som -> cai pra principal) era repetido
       aqui e la, cada um com seu relogio. Ficou so no vs-radio-global.js. */

    function pintarFab() {
      const tocando = motorTocando();
      if (tocando === playing) return;      // nada mudou: nao repinta a toa
      playing = tocando;
      if (tocando) {
        fab.textContent = '📻';
        fab.style.animation = 'vs-mega-play 1.8s ease-in-out infinite';
        badge.textContent = '🔴 ' + rotulo(getEstacao()) + ' AO VIVO';
        badge.style.display = 'block';
      } else {
        fab.innerHTML = MEGA_SVG;
        fab.style.animation = 'vs-mega-glow 2.2s ease-in-out infinite';
        badge.style.display = 'none';
      }
    }
    // o motor nao avisa por evento; olhar de 1 em 1 segundo custa nada e
    // mantem o megafone honesto mesmo quando quem liga foi o 📻 do cabecalho
    setInterval(pintarFab, 1000);
    comMotor(function () { pintarFab(); });

    function toggleRadio() {
      // 12/08/2026: o botao SO liga e desliga — nunca leva pra outra pagina.
      // 27/08/2026: e quem liga e desliga e o motor unico, que ja sabe pedir
      // gesto ao navegador quando precisa e ja derruba a conexao ao parar.
      comMotor(function (R) { try { R.alternar(); } catch (e) {} });
      setTimeout(pintarFab, 400);
      setTimeout(pintarFab, 1500);
    }

    fab.addEventListener('click', function() {
      if (longPressFired) { longPressFired = false; return; }
      toggleRadio();
    });

    /* 🌐 Trocou o idioma do app → a rádio acompanha NA HORA (mesmo tocando).
       27/08/2026: o padrao era 'vida-boa', que NAO existe em STREAMS desde
       19/08 — trocar pra portugues nao fazia nada. Agora e 'floripa', e quem
       troca (derrubando a conexao antiga) e o motor unico. */
    window.addEventListener('vs:idioma', function (e) {
      var slug = ({ en: 'ingles', es: 'espanhol', pt: 'floripa' })[e.detail && e.detail.lang];
      if (!slug || slug === estacao) return;
      setEstacao(slug);
      estacao = slug;
      badge.textContent = '🔴 ' + STATION_LABELS[slug] + ' AO VIVO';
      comMotor(function (R) { try { R.estacao(slug); } catch (x) {} });
    });

    /* 27/08/2026 — A RETOMADA E O "PRIMEIRO TOQUE" SAIRAM DAQUI.
       Os dois motores retomavam a navegacao por conta propria, cada um com sua
       flag e seu gatilho: davam dois audios tocando e um roubava o clique do
       outro. Ficou so no vs-radio-global.js, que faz exatamente isso —
       inclusive respeitar quem desligou e nao queimar dado em conexao medida.

       E o megafone NAO publica mais window.VSRadio. O objeto daqui tinha
       nomes proprios (toggle/tocando) e o do outro tinha outros
       (alternar/estado); quem carregasse por ultimo apagava o primeiro, e por
       isso existia todo aquele remendo de "preserva o outro motor". Um dono
       so, um nome so. Ver [[radio_fantasma_dois_dominios_2026_08_27]]. */

    // Liga o botão Rádio do rodapé (#bb-radio), se existir: tap = toggle, segurar = radio.html
    var bbRadio = document.getElementById('bb-radio');
    if (bbRadio && !bbRadio._vsWired) {
      bbRadio._vsWired = true;
      var bbTimer = null, bbFired = false;
      var bbStart = function () { bbFired = false; bbTimer = setTimeout(function () { bbFired = true; bbTimer = null; location.href = '/radio.html'; }, 500); };
      var bbCancel = function () { if (bbTimer) { clearTimeout(bbTimer); bbTimer = null; } };
      bbRadio.addEventListener('mousedown', bbStart);
      bbRadio.addEventListener('touchstart', bbStart, { passive: true });
      bbRadio.addEventListener('mouseup', bbCancel);
      bbRadio.addEventListener('mouseleave', bbCancel);
      bbRadio.addEventListener('touchend', bbCancel);
      bbRadio.addEventListener('touchcancel', bbCancel);
      /* 13/08/2026 — O MICROFONE DO RODAPÉ NÃO LIGA MAIS A RÁDIO.
         Pedido do DJ: "a rádio tem que começar no ícone de rádio do cabeçalho;
         o mic do rodapé mostra as opções". Era isto que fazia a landing sair
         tocando rádio em vez de abrir o menu — e lá o menu nem existia, porque
         morava no vs-page-footer.js, que a landing não carrega (agora ele é o
         /shared/vs-voz-pop.js e vale em toda página).
         Segurar continua abrindo a página da rádio, que já era o costume. */
      bbRadio.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        if (bbFired) { bbFired = false; return; }
        if (window.VSVozPop && VSVozPop.abrir) { VSVozPop.abrir(); return; }
        location.href = '/radio.html';   // sem o menu carregado, ao menos leva pra rádio
      });
    }

    // 🔮 QR mágica: ?ouvir=1 → cai na página com a rádio JÁ tocando
    // 27/08: pelo motor. Se o navegador exigir gesto, o proprio motor arma o
    // primeiro toque — aqui so fazemos o megafone pulsar pra mostrar onde e.
    if (new URLSearchParams(location.search).get('ouvir') === '1') {
      fab.style.animation = 'vs-mega-glow 1s ease-in-out infinite';
      comMotor(function (R) { try { R.tocar(); } catch (e) {} });
      setTimeout(pintarFab, 1200);
    }

    /* 27/08: os ouvintes de 'error' e 'ended' do <audio> sairam junto com o
       <audio>. Quem cuida de stream que cai e o motor unico. */
  }

  function montar() {
    const p = location.pathname;
    if (p === '/radio.html' || p === '/radio' || p === '/radio-admin' ||
        p.endsWith('radio-v2.html') || p.endsWith('radio.html') || p.endsWith('radio-admin.html')) return;

    const existente = document.getElementById('fab-megafone');
    if (existente) { instalarComportamento(existente); return; }

    garantirStyles();
    const fab = document.createElement('button');
    fab.id = 'fab-megafone';
    fab.type = 'button';
    fab.title = '📻 Rádio Vento Sul — clica pra ouvir · segura pra trocar estação';
    fab.setAttribute('aria-label', 'Tocar rádio ao vivo');
    fab.style.cssText = `
      display:none;
      position:fixed;bottom:calc(155px + env(safe-area-inset-bottom, 0px));right:16px;z-index:998;
      background:none;border:none;outline:none;padding:0;
      font-size:38px;line-height:1;cursor:pointer;
      animation:vs-mega-glow 2.2s ease-in-out infinite;
    `;
    fab.innerHTML = MEGA_SVG;
    document.body.appendChild(fab);
    ajustarPosicoes();
    instalarComportamento(fab);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', montar);
  } else {
    montar();
  }
})();
