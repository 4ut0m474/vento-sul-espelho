/* vs-video-explica.js — DIRETRIZ DO DJ (02/08/2026):
 * TODO vídeo explicativo de página vive no PRIMEIRO ícone do cabeçalho (#ph-mute, o 📻).
 * Regra de comportamento:
 *   1ª vez que a pessoa abre a página  → balão aparece apontando pro ícone
 *   depois                             → o ícone fica piscando, e é por ali que se assiste
 *
 * Registrar um vídeo novo: só acrescentar em VIDEOS abaixo, OU pôr no <body>:
 *   data-vs-video="/videos/x.mp4" data-vs-video-titulo="..." data-vs-video-texto="..."
 *
 * O mute (função antiga do botão) não some: vira um toggle dentro do painel do vídeo.
 */
(function () {
  if (window.VSVideoExplica) return;

  // ── registro: caminho da página → vídeo explicativo ───────────────────────
  const VIDEOS = {
    /* 19/08/2026 — pedido do DJ: o video que explica o sistema entra na LANDING,
       no mesmo botao que ja tem o explicativo. Nao tirei nada: os que ja
       estavam continuam, este entra pra quem abre a pagina de entrada. */
    /* O COMPLETO, de 20 minutos -- e este que o DJ queria na entrada. */
    '/': {
      src: '/videos/VENTOSUL-COMPLETO-PT.mp4',
      titulo: 'Vento Sul — o app inteiro explicado',
      texto: 'O passeio completo pelo aplicativo: o que ele faz, pra que serve e como a comunidade entra. 20 minutos, com a tela real.'
    },
    '/index.html': {
      src: '/videos/VENTOSUL-COMPLETO-PT.mp4',
      titulo: 'Vento Sul — o app inteiro explicado',
      texto: 'O passeio completo pelo aplicativo: o que ele faz, pra que serve e como a comunidade entra. 20 minutos, com a tela real.'
    },
    '/sobre.html': {
      src: '/videos/COMO-FUNCIONA-O-SISTEMA.mp4',
      titulo: 'Como funciona o Vento Sul',
      texto: 'Em 4 minutos: as maquinas que trabalham sozinhas, como a noticia vira voz na radio e o que custa (quase nada).'
    },
    '/radio.html': {
      src: '/videos/O-MAPA-COMPLETO.mp4',
      titulo: 'O mapa completo do sistema',
      texto: 'O que cada peca faz agora: as duas maquinas nossas, os servicos que guardam, e a que ainda estamos caçando.'
    },
    /* 13/08/2026 — VÍDEO NOVO, gravado com a tela real do app.
       Mostra o passo a passo: onda que fala num toque e mostra em dois, câmera
       ao vivo por cima da página, rádio no cabeçalho, o mapa e como o comércio
       entra. O antigo (video-barra-da-lagoa.mp4) continua no servidor. */
    '/barra-da-lagoa.html': {
      src: '/videos/video-explica-barra-web.mp4',
      titulo: 'Como funciona esta página',
      texto: 'Passo a passo, com a tela do app: a onda que fala o mar, a câmera ao vivo da praia, a rádio da comunidade e o mapa onde o comércio já está.'
    },
    /* Lagoa da Conceição, Campeche e as demais entram por aqui (localidade.html?slug=).
       ⚠️ O vídeo foi gravado NA BARRA — o texto diz isso, pra ninguém achar que
       está vendo a própria praia. O que ele ensina vale igual em qualquer uma. */
    '/localidade.html': {
      src: '/videos/video-explica-barra-web.mp4',
      titulo: 'Como funciona esta página',
      texto: 'O mesmo passo a passo vale aqui: a onda que fala o mar, a câmera ao vivo, a rádio e o mapa. O vídeo foi gravado na Barra da Lagoa, mas a página é igual em toda localidade.'
    },
    /* 18/08/2026 — CINCO EXPLICADORES NOVOS. O DJ pediu explicação pras páginas
       que ainda não tinham, no mesmo ícone do rodapé onde já moram os outros.
       Gravados com a tela REAL de cada página (playwright, 390x844 @2x),
       narrados com edge-tts e montados em 720x1280 pra caber no painel. */
    '/jornal.html': {
      src: '/videos/video-explica-jornal.mp4',
      poster: '/videos/video-explica-jornal.jpg',
      titulo: 'O Jornal do Sul',
      texto: 'O que a ilha e o Sul amanheceram falando, lido em voz alta e traduzido em três idiomas — sem você precisar caçar em dez sites.'
    },
    '/caca-tesouro.html': {
      src: '/videos/video-explica-caca.mp4',
      poster: '/videos/video-explica-caca.jpg',
      titulo: 'A caça ao tesouro da Barra',
      texto: 'Três provas encadeadas pela vila. A resposta de cada uma fica cifrada — nem lendo o código do site dá pra colar.'
    },
    '/perto.html': {
      src: '/videos/video-explica-perto.mp4',
      poster: '/videos/video-explica-perto.jpg',
      titulo: 'Perto de você',
      texto: 'O que existe ao seu redor agora, ordenado por distância real — comércio, praia, ponto do mapa e o que a comunidade marcou.'
    },
    '/compras-coletivas.html': {
      src: '/videos/video-explica-coletivas.mp4',
      poster: '/videos/video-explica-coletivas.jpg',
      titulo: 'Compra coletiva',
      texto: 'Quando muita gente quer a mesma coisa, o preço cai. Você entra, espera encher e paga o preço de atacado.'
    },
    '/manuais.html': {
      src: '/videos/video-explica-biblioteca.mp4',
      poster: '/videos/video-explica-biblioteca.jpg',
      titulo: 'A Biblioteca',
      texto: 'Os manuais do Vento Sul: o do app pra qualquer pessoa, o do lojista pra quem vende, e o do sistema — esse é particular.'
    },
    '/comunidade.html': {
      src: '/videos/video-comunidade.mp4',
      titulo: 'A roda da comunidade',
      texto: 'Onde o bairro levanta o que precisa mudar, escreve o porquê e vota. O que sai daqui vira ponto no mapa, pauta da associação e assunto na rádio.'
    },
    '/radio.html': {
      src: '/videos/video-radio.mp4',
      titulo: 'A rádio da ilha',
      texto: 'Mar e maré de vinte em vinte minutos, estações por cidade, despertador que acorda sem susto — e a tua voz podendo entrar no ar.'
    },
    '/comercio.html': {
      src: '/videos/video-comercio.mp4',
      titulo: 'O comércio do teu lado',
      texto: 'Produto e lugar na mesma busca, com preço e distância. E a compra coletiva, que faz o preço cair quando junta gente.'
    },
    '/mapa.html': {
      src: '/videos/video-mapa.mp4',
      titulo: 'O mapa vivo',
      texto: 'Não é mapa de rua: é mapa de dúvida. Cada pino é algo que alguém quis saber daquele lugar — sempre em espaço público.'
    },
    '/carteira.html': {
      src: '/videos/video-carteira.mp4',
      titulo: 'A carteira SulCoin',
      texto: 'O que o SulCoin NÃO é (nem cripto, nem investimento), o que ele é (voucher de desconto) e por que a conta fica aberta pra qualquer um conferir.'
    },
    '/despertador.html': {
      src: '/videos/video-notificacao-alarme.mp4',
      titulo: 'Notificação e Alarme',
      texto: 'Dois jeitos de o app te avisar, e não são a mesma coisa. A notificação chega QUANDO a ' +
             'oportunidade acontece; o alarme chega na hora que TU escolheu. Em 2 minutos fica claro ' +
             'por que um não substitui o outro.'
    },
    '/associacao.html': {
      src: '/videos/video-associacao-processo.mp4',
      titulo: 'Como funciona a parceria',
      texto: 'A separação de poderes, quem audita a verba e por que a conta fica aberta. ' +
             'Se preferir ler, está tudo escrito abaixo nesta mesma página.'
    },
    '/associacao-visao.html': {
      src: '/videos/video-associacao-galpao.mp4',
      poster: '/videos/poster-galpao.jpg',
      titulo: 'Do galpão ao mundo',
      texto: 'Em 1 minuto e 15: o mesmo galpão, degrau por degrau, do salão parado até a rede ' +
             'que atravessa fronteira.'
    },
    '/ecossistema.html': {
      src: '/videos/video-associacao-galpao.mp4',
      poster: '/videos/poster-galpao.jpg',
      titulo: 'Pra que serve tudo isso junto',
      texto: 'A transformação que as peças do app existem pra sustentar. Depois do vídeo, a página ' +
             'explica peça por peça.'
    },
    '/barqueiros.html': {
      src: '/videos/video-barqueiros.mp4',
      poster: '/videos/poster-barqueiros.jpg',
      titulo: 'Sozinho ou em rede',
      texto: 'Da guerra de preço na beira até o roteiro de ilha inteira, com um barqueiro ' +
             'entregando pro outro.'
    },
    '/associacao-projetos.html': {
      src: '/videos/video-projetos.mp4',
      poster: '/videos/poster-projetos.jpg',
      titulo: 'De onde sai o dinheiro',
      texto: 'Os editais que já passaram, o que está aberto agora e o que dá pra começar hoje ' +
             'sem depender de edital nenhum.'
    },
    '/associacao-modelo-economico.html': {
      src: '/videos/video-modelo.mp4',
      poster: '/videos/poster-modelo.jpg',
      titulo: 'Pra onde vai o dinheiro',
      texto: 'As duas fases, a ordem travada do compute, o que o SulCoin não é — e como tudo ' +
             'isso é auditado.'
    }
  };

  // ── IDIOMA (09/08/2026) ───────────────────────────────────────────────────
  // Os vídeos antigos tinham o TEXTO QUEIMADO na imagem, em português — por isso
  // dublar não resolvia: o gringo ouviria inglês olhando pra um slide em PT.
  // Foram refeitos com screenshot real (imagem neutra) e narração por idioma,
  // então agora existe /videos/<nome>-pt|en|es.mp4 e a bandeira escolhe qual toca.
  const LANGS = ['pt', 'en', 'es'];
  function lang() {
    try {
      if (window.VSIdioma && window.VSIdioma.get) return window.VSIdioma.get();
      const p = JSON.parse(localStorage.getItem('ventosul_pwa_v1') || '{}');
      return LANGS[p.idiomaIdx] || 'pt';
    } catch (e) { return 'pt'; }
  }
  function fonteIdioma(src) {
    return src.replace(/\.mp4$/, '-' + lang() + '.mp4');
  }

  // Título e chamada do painel, na língua da pessoa. Chave = nome do arquivo,
  // então páginas que dividem o mesmo vídeo dividem a mesma tradução.
  const TRAD = {
    'video-barra-da-lagoa': {
      en: ['The Barra in your pocket', 'The sea right now spoken out loud, the boats in the channel, the neighbourhood shops and the circle where the community decides.'],
      es: ['La Barra en tu bolsillo', 'El mar de ahora hablado en voz alta, los barcos del canal, el comercio del barrio y la rueda donde la comunidad decide.'] },
    'video-comunidade': {
      en: ['The community circle', 'Where the neighbourhood raises what needs to change, writes down why, and votes. What comes out of here becomes a pin on the map and a subject on the radio.'],
      es: ['La rueda de la comunidad', 'Donde el barrio plantea lo que hay que cambiar, escribe el porqué y vota. Lo que sale de aquí se vuelve punto en el mapa y asunto en la radio.'] },
    'video-radio': {
      en: ['The island radio', 'Sea and tide every twenty minutes, one button to start, and your own voice able to go on air.'],
      es: ['La radio de la isla', 'Mar y marea cada veinte minutos, un botón para empezar, y tu voz pudiendo entrar al aire.'] },
    'video-comercio': {
      en: ['The shops beside you', 'Shops and services near you, and the group purchase that drops the price when enough people join.'],
      es: ['El comercio a tu lado', 'Tiendas y servicios cerca de ti, y la compra colectiva que baja el precio cuando se junta gente.'] },
    'video-mapa': {
      en: ['The living map', 'It is not a street map: each pin is something somebody wanted to know about that place — always in a public space.'],
      es: ['El mapa vivo', 'No es un mapa de calles: cada punto es algo que alguien quiso saber de ese lugar — siempre en espacio público.'] },
    'video-carteira': {
      en: ['The SulCoin wallet', 'What SulCoin is NOT (not crypto, not an investment), what it is (a discount voucher) and why the books stay open for anyone to check.'],
      es: ['La cartera SulCoin', 'Lo que el SulCoin NO es (ni cripto, ni inversión), lo que sí es (un vale de descuento) y por qué las cuentas quedan abiertas para que cualquiera verifique.'] },
    'video-notificacao-alarme': {
      en: ['Notification and alarm', 'Two ways the app warns you, and they are not the same. The notification arrives WHEN it happens; the alarm arrives at the time YOU chose.'],
      es: ['Notificación y alarma', 'Dos formas en que la aplicación te avisa, y no son lo mismo. La notificación llega CUANDO pasa; la alarma llega a la hora que TÚ elegiste.'] },
    'video-associacao-processo': {
      en: ['How the partnership works', 'The separation of powers, who audits the money and why the books stay open.'],
      es: ['Cómo funciona la alianza', 'La separación de poderes, quién audita el dinero y por qué las cuentas quedan abiertas.'] },
    'video-associacao-galpao': {
      en: ['From the hall to the world', 'The same hall, step by step, from an idle room to a network that crosses borders.'],
      es: ['Del galpón al mundo', 'El mismo galpón, paso a paso, de un salón parado a una red que cruza fronteras.'] },
    'video-barqueiros': {
      en: ['Alone or in a network', 'From the price war on the sand to a route around the whole island, with one boatman handing over to the next.'],
      es: ['Solo o en red', 'De la guerra de precios en la arena a una ruta por toda la isla, con un barquero entregando al otro.'] },
    'video-projetos': {
      en: ['Where the money comes from', 'The calls that have closed, what is open right now, and what can be started today without depending on any call at all.'],
      es: ['De dónde sale el dinero', 'Las convocatorias que ya pasaron, lo que está abierto ahora y lo que se puede empezar hoy sin depender de ninguna convocatoria.'] },
    'video-modelo': {
      en: ['Where the money goes', 'The two phases, the locked order of the running costs, what SulCoin is not — and how all of it is audited.'],
      es: ['A dónde va el dinero', 'Las dos fases, el orden trabado del costo de operación, lo que el SulCoin no es — y cómo todo eso se audita.'] }
  };
  function tradDe(V, i) {
    const l = lang();
    if (l === 'pt') return null;
    const base = (V.src || '').split('/').pop().replace(/\.mp4$/, '');
    const t = TRAD[base];
    return (t && t[l] && t[l][i]) ? t[l][i] : null;
  }
  const tituloDe = (V) => tradDe(V, 0) || V.titulo;
  const textoDe  = (V) => tradDe(V, 1) || V.texto;

  function daPagina() {
    const b = document.body;
    if (b && b.dataset.vsVideo) {
      return { src: b.dataset.vsVideo,
               poster: b.dataset.vsVideoPoster || '',
               titulo: b.dataset.vsVideoTitulo || 'Vídeo desta página',
               texto: b.dataset.vsVideoTexto || '' };
    }
    let p = location.pathname;
    if (p === '/' || p === '') p = '/index.html';
    return VIDEOS[p] || null;
  }

  const V = daPagina();
  if (!V) return;                       // página sem vídeo: o botão segue sendo o mute de sempre

  const CHAVE = 'vs.explica.visto.' + location.pathname;

  /* ── estilo ── */
  const s = document.createElement('style');
  s.id = 'vs-vex-style';
  s.textContent = `
    #ph-mute.vex-tem, #ph-video.vex-tem { animation: vexPisca 2.4s ease-in-out infinite; }
    @keyframes vexPisca {
      0%,100% { filter:none; transform:scale(1); }
      50%     { filter: drop-shadow(0 0 7px #ffd54f); transform:scale(1.14); }
    }
    #ph-mute.vex-tem::before, #ph-video.vex-tem::before {
      content:''; position:absolute; top:2px; right:1px; width:7px; height:7px;
      border-radius:50%; background:#ffd54f; box-shadow:0 0 6px #ffd54f;
    }
    /* balão da 1ª vez */
    #vex-balao {
      position:fixed; z-index:99998; max-width:250px;
      background:linear-gradient(150deg,#1c3346,#111f2c); color:#eaf3fa;
      border:1px solid rgba(255,213,79,.55); border-radius:14px; padding:12px 13px;
      box-shadow:0 12px 38px rgba(0,0,0,.6); font:500 13px/1.45 system-ui,sans-serif;
      animation: vexEntra .35s cubic-bezier(.2,1.2,.4,1);
    }
    #vex-balao b { color:#ffd54f; display:block; margin-bottom:3px; font-size:13.5px; }
    #vex-balao .vex-acoes { display:flex; gap:8px; margin-top:10px; }
    #vex-balao button {
      flex:1; padding:7px 10px; border-radius:9px; font:700 12px system-ui; cursor:pointer;
      border:1px solid rgba(255,213,79,.5); background:rgba(255,213,79,.16); color:#ffd54f;
    }
    #vex-balao button.sec { border-color:rgba(143,166,189,.4); background:transparent; color:#8fa6bd; }
    #vex-balao::after {
      content:''; position:absolute; top:-7px; left:20px; width:13px; height:13px;
      background:#1c3346; border-left:1px solid rgba(255,213,79,.55);
      border-top:1px solid rgba(255,213,79,.55); transform:rotate(45deg);
    }
    @keyframes vexEntra { from{opacity:0;transform:translateY(-8px) scale(.96)} to{opacity:1;transform:none} }

    /* painel do vídeo */
    #vex-fundo { position:fixed; inset:0; z-index:99999; display:none;
      align-items:center; justify-content:center; padding:16px;
      background:rgba(0,0,0,.82); backdrop-filter:blur(4px); }
    #vex-fundo.on { display:flex; }
    #vex-cx { background:#0f1c2a; border:1px solid #22384f; border-radius:18px;
      max-width:660px; width:100%; max-height:92vh; overflow-y:auto; padding:16px;
      box-shadow:0 22px 64px rgba(0,0,0,.65); animation: vexSobe .3s cubic-bezier(.2,1.1,.4,1); }
    @keyframes vexSobe { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
    #vex-cx h3 { color:#ffd54f; font:800 17px/1.25 system-ui; margin-bottom:5px; }
    #vex-cx p  { color:#c2d3e2; font:400 13.5px/1.55 system-ui; margin-bottom:11px; }
    /* 18/08/2026 - o video saia FORA DA TELA. Os explicadores sao verticais
       (720x1280); com width:100% numa caixa de 660px o video renderizava
       ~1173px de altura e nao cabia em tela de notebook. Agora quem manda e a
       ALTURA: o video se limita a 74vh e a largura vem por consequencia. */
    #vex-cx video { width:auto; max-width:100%; max-height:74vh; display:block;
      margin:0 auto; border-radius:13px; border:1px solid #22384f;
      background:#060d16; display:block; }
    #vex-rod { display:flex; gap:9px; align-items:center; margin-top:12px; }
    #vex-rod button { padding:9px 13px; border-radius:10px; font:700 13px system-ui; cursor:pointer;
      border:1px solid #22384f; background:#16283c; color:#cbd9e6; }
    #vex-rod .fechar { margin-left:auto; border-color:rgba(255,213,79,.5);
      background:rgba(255,213,79,.15); color:#ffd54f; }
    @media (prefers-reduced-motion:reduce){
      #ph-mute.vex-tem{animation:none} #vex-balao,#vex-cx{animation:none} }
  `;
  document.head.appendChild(s);

  /* ── painel ── */
  let fundo, video;
  function montarPainel() {
    if (fundo) return;
    fundo = document.createElement('div');
    fundo.id = 'vex-fundo';
    fundo.innerHTML =
      '<div id="vex-cx" role="dialog" aria-modal="true">' +
        '<h3></h3><p></p>' +
        '<video controls playsinline preload="metadata"></video>' +
        '<div id="vex-rod">' +
          '<button type="button" id="vex-mudo">🔇 Silenciar a página</button>' +
          '<button type="button" class="fechar" id="vex-fecha">Fechar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(fundo);

    fundo.querySelector('h3').textContent = tituloDe(V);
    const p = fundo.querySelector('p');
    const txt = textoDe(V);
    if (txt) p.textContent = txt; else p.remove();

    video = fundo.querySelector('video');
    video.src = fonteIdioma(V.src);
    // Se por algum motivo não existir a versão naquela língua, cai na original
    // em vez de deixar a pessoa olhando pra um quadro preto.
    video.addEventListener('error', () => {
      if (video.getAttribute('src') !== V.src) video.src = V.src;
    });
    if (V.poster) video.poster = V.poster;

    // trocou a bandeira com o painel aberto? troca o vídeo e o texto junto
    window.addEventListener('vs:idioma', () => {
      const aberto = fundo.classList.contains('on');
      fundo.querySelector('h3').textContent = tituloDe(V);
      const pp = fundo.querySelector('p');
      if (pp) pp.textContent = textoDe(V) || '';
      video.src = fonteIdioma(V.src);
      if (aberto) video.play().catch(() => {});
    });

    fundo.addEventListener('click', (e) => { if (e.target === fundo) fechar(); });
    fundo.querySelector('#vex-fecha').addEventListener('click', fechar);
    // o mute antigo do botão não se perde — mora aqui dentro
    fundo.querySelector('#vex-mudo').addEventListener('click', () => {
      if (window.VSFalar && window.VSFalar.mutar) { window.VSFalar.mutar(); return; }
      document.querySelectorAll('audio,video').forEach(m => { if (m !== video) m.muted = true; });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && fundo.classList.contains('on')) fechar();
    });
  }

  function abrir() {
    montarPainel();
    esconderBalao();
    try { localStorage.setItem(CHAVE, '1'); } catch (_) {}
    fundo.classList.add('on');
  }
  function fechar() {
    if (!fundo) return;
    fundo.classList.remove('on');
    try { video.pause(); } catch (_) {}
  }

  /* ── balão da primeira vez ── */
  let balao;
  function esconderBalao() { if (balao) { balao.remove(); balao = null; } }
  function mostrarBalao(btn) {
    const r = btn.getBoundingClientRect();
    balao = document.createElement('div');
    balao.id = 'vex-balao';
    balao.innerHTML =
      '<b>🎬 Tem vídeo explicando esta página</b>' +
      '<span>É rápido. Depois, é sempre por este ícone aqui de cima.</span>' +
      '<div class="vex-acoes">' +
        '<button type="button" id="vex-ver">Assistir</button>' +
        '<button type="button" class="sec" id="vex-agora-nao">Agora não</button>' +
      '</div>';
    document.body.appendChild(balao);
    balao.style.top  = (r.bottom + 10) + 'px';
    balao.style.left = Math.max(10, r.left - 12) + 'px';
    balao.querySelector('#vex-ver').addEventListener('click', abrir);
    balao.querySelector('#vex-agora-nao').addEventListener('click', () => {
      try { localStorage.setItem(CHAVE, '1'); } catch (_) {}
      esconderBalao();
    });
    setTimeout(() => { if (balao) esconderBalao(); }, 14000);
  }

  /* ── liga no botão do cabeçalho (o primeiro de todos) ── */
  function ligar() {
    // 11/08/2026 — O VIDEO SAIU DO 📻 E GANHOU ICONE PROPRIO (🎬).
    //
    // Antes esta funcao CLONAVA o #ph-mute e trocava o original pelo clone.
    // Clonar apaga TODOS os handlers do botao — inclusive o que liga a radio.
    // Resultado: o DJ tocava no 📻 e abria video, nunca a radio, por mais que
    // o cabecalho registrasse o clique certo. O vídeo chegava depois e tomava.
    //
    // Agora o 📻 fica so pra RADIO (ligar/parar) e o video mora no 🎬 ao lado.
    // Ninguem pisa no pe de ninguem.
    // 12/08/2026 — O CABECALHO NAO LEVA MAIS O 🎬.
    // Pedido do DJ: o cabecalho tem que ficar EQUILIBRADO, mesmo numero de
    // icones dos dois lados, e nada solto por cima. O video NAO foi apagado —
    // continua inteiro aqui e abre por VSVideoExplica.abrir(), que e o que o
    // FAB chama. Se sobrou um 🎬 de versao anterior no ar, tiramos.
    const velho = document.getElementById('ph-video');
    if (velho && velho.dataset.vsManual !== '1') velho.remove();
    return true;
  }

  // o cabeçalho é injetado por script defer — espera ele existir
  let tentativas = 0;
  (function esperar() {
    if (ligar()) return;
    if (++tentativas > 40) return;
    setTimeout(esperar, 120);
  })();

  window.VSVideoExplica = { abrir, fechar, video: V };
})();
