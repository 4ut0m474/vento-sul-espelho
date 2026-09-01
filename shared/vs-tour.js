/* vs-tour.js — "Como tudo funciona" (09/08/2026)
 *
 * DIRETRIZ DO DJ: o explicador mora no PRIMEIRO ícone do cabeçalho, o 📻.
 * O vs-video-explica.js já faz isso por PÁGINA (um vídeo por tela, #ph-mute).
 * Este aqui é a explicação do APP INTEIRO, e mora no 📻 da landing (#btn-mute).
 *
 * REGRA (09/08/2026, o DJ foi direto ao ponto): "clico no rádio já começa a
 * falar, não vai pra lugar nenhum, ali mesmo, e desliga e sai sozinho."
 * Então: um toque → o vídeo abre por cima da tela, com som, sem passo nenhum
 * pra pessoa dar. Acabou o vídeo, o painel fecha sozinho e a pessoa está
 * exatamente onde estava. Nada de "Avançar", nada de navegar pra outra página.
 *
 * Por que o som toca (e não é bloqueado): o play() sai de dentro do clique da
 * pessoa no 📻 — pros navegadores isso é gesto do usuário, e gesto libera áudio.
 * Se ainda assim algum aparelho recusar, o vídeo segue mudo e aparece um botão
 * "🔊 Ligar o som" — nunca fica a tela parada sem explicação.
 *
 * Os vídeos: /videos/como-funciona-{pt,en,es}.mp4 — 16 cenas, ~4min, narração
 * na língua da pessoa (a bandeira troca o vídeo junto com o resto do app).
 * Feito de screenshot REAL do app com a área explicada ampliada e o resto
 * escurecido; cada cena dura o tempo exato da fala dela.
 * Regerar: scratchpad/fazer_video.py (edge-tts + ffmpeg) lê as cenas daqui
 * mesmo, de CENAS abaixo — uma fonte de verdade só.
 */
(function () {
  if (window.VSTour) return;

  var VISTO = 'vs.tour.visto';

  /* Um vídeo por idioma — mesma figura, narração e legenda na língua da pessoa.
   * A escolha sai da MESMA preferência do resto do app (ventosul_pwa_v1
   * .idiomaIdx, que a bandeira grava), então trocar a bandeira troca o vídeo.
   * Se o vídeo já estiver aberto na hora da troca, ele recarrega na língua nova. */
  var LANGS = ['pt', 'en', 'es'];
  function lang() {
    try {
      if (window.VSIdioma && window.VSIdioma.get) return window.VSIdioma.get();
      var p = JSON.parse(localStorage.getItem('ventosul_pwa_v1') || '{}');
      return LANGS[p.idiomaIdx] || 'pt';
    } catch (e) { return 'pt'; }
  }
  function urlVideo() { return '/videos/como-funciona-' + lang() + '.mp4?v=1'; }

  /* As 16 cenas do vídeo. Ficam aqui por dois motivos: é daqui que o
   * fazer_video.py tira a narração, e é daqui que sai a legenda de texto pra
   * quem não pode ouvir (surdo, ou celular no silencioso no meio da rua). */
  var CENAS = [
    { img: '01-app.webp', t: 'É o aplicativo do seu lugar',
      p: 'O Vento Sul mostra o que está acontecendo pertinho de você: o tempo, o mar, ' +
         'as festas, as lojas do bairro e a rádio da ilha. Não precisa pagar nada pra usar.' },

    { img: '02-barra.webp', t: 'A barrinha lá embaixo',
      p: 'São cinco lugares. Toque no desenho pra ir até ele. Se você se perder em alguma ' +
         'tela, toque na casinha do Início — ela sempre traz você de volta pro começo.' },

    { img: '03-cabecalho.webp', t: 'A faixa lá em cima',
      p: 'Os botõezinhos de cima não mudam a página: eles mudam o JEITO do app. Deixam a ' +
         'letra maior, trocam a cor, trocam a língua, ligam e desligam os avisos. ' +
         'Vamos ver um por um, com calma.' },

    { img: '04-radio-btn.webp', t: 'O rádiozinho — este aqui',
      p: 'É o botão que você acabou de tocar pra abrir esta explicação. Ele fica sempre no ' +
         'mesmo canto, em toda tela. Se em algum momento você não entender o que está vendo, ' +
         'toque nele: ele explica aquela tela.' },

    { img: '05-fonte.webp', t: 'O A+ deixa a letra maior',
      p: 'Está pequeno demais pra ler? Toque no A+. A letra cresce na hora. Toque de novo e ' +
         'cresce mais um pouco. O app lembra do tamanho que você escolheu — não precisa ' +
         'fazer de novo toda vez.' },

    { img: '07-bandeira.webp', t: 'A bandeirinha troca a língua',
      p: 'Toque na bandeira e o app inteiro muda de idioma: português, inglês ou espanhol. ' +
         'A rádio muda junto.' },

    { img: '06-sino.webp', t: 'O sino é o aviso',
      p: 'É por aqui que o app te avisa das coisas. E quem manda é VOCÊ: escolhe o assunto, ' +
         'o lugar e quantas mensagens por dia. Se não quiser nenhuma, não chega nenhuma. ' +
         'E pra desligar depois, é o mesmo sino.' },

    { img: '08-fab.webp', t: 'A estrelinha guarda tudo',
      p: 'Tudo que dá pra fazer no app mora dentro dela. Toque e abre a lista inteira. ' +
         'É o único botão solto da tela — o resto está tudo lá dentro, pra não bagunçar ' +
         'a vista.' },

    { img: '09-roda.webp', t: 'A roda é a comunidade',
      p: 'É onde o bairro conversa e decide junto. Alguém levanta uma coisa que precisa ' +
         'melhorar, escreve o porquê, e todo mundo vota. O que ganha vira assunto de verdade ' +
         'e aparece no mapa e na rádio.' },

    { img: '10-comercio.webp', t: 'Comércio: as lojas do seu lado',
      p: 'Aqui aparecem as lojas e os serviços perto de você, com preço e distância. Tem ' +
         'também a compra coletiva: quando junta bastante gente querendo a mesma coisa, o ' +
         'preço cai pra todo mundo que entrou.' },

    { img: '11-radio.webp', t: 'Rádio: a voz da ilha',
      p: 'Rádio local tocando o dia inteiro. De vinte em vinte minutos ela conta como está o ' +
         'mar. E dá pra programar o despertador: em vez de apitar, ele acorda você com a ' +
         'rádio e o resumo da manhã.' },

    { img: '12-carteira.webp', t: 'Carteira: o SulCoin',
      p: 'O SulCoin não é dinheiro e não é investimento — ninguém compra e ninguém saca. ' +
         'É um vale de desconto que você ganha usando o app: votando, visitando lugares, ' +
         'participando. Depois troca por desconto no comércio daqui.' },

    { img: '13-mapa.webp', t: 'A lupa acha, o mapa responde',
      p: 'A lupa procura lugar, produto e serviço. E o mapa não é mapa de rua: cada pino é ' +
         'uma dúvida que alguém teve sobre aquele canto — e alguém que mora ali respondeu.' },

    { img: '15-ia.webp', t: 'Tem uma inteligência artificial ajudando',
      p: 'A Litorânea é a guia do app. Ela fala em voz alta, responde pergunta, lê a notícia, ' +
         'monta a rádio e ajuda a achar as coisas. Pode perguntar com as suas palavras mesmo, ' +
         'do jeito que você fala — não precisa saber escrever bonito.' },

    { img: '14-notif.webp', t: 'O que o app NÃO faz',
      p: 'Pra te avisar, o app usa só a permissão normal de notificação do aparelho. Ele nunca ' +
         'pede o seu microfone, a sua câmera nem o controle do telefone. E tudo que você ligou ' +
         'aqui, você desliga aqui, na hora que quiser.' },

    { img: '01-app.webp', t: 'Pronto, é isso',
      p: 'Não precisa decorar nada. Se esquecer, toque no rádiozinho lá em cima outra vez — ' +
         'esta explicação não vai embora. Bom proveito.' }
  ];

  /* Só os títulos: é o que aparece na legenda. A fala inteira em EN/ES está
   * gravada no áudio de cada vídeo (scratchpad/traducoes.json gerou os dois). */
  var LEGENDAS = {
    en: ["It's the app for your own place", 'The little bar down below', 'The strip up at the top',
         'The little radio — this one here', 'The A plus makes the letters bigger',
         'The little flag changes the language', 'The bell is the alert',
         'The little star holds everything', 'The circle is the community',
         'Commerce: the shops right beside you', 'Radio: the voice of the island',
         'Wallet: the SulCoin', 'The magnifier finds, the map answers',
         'There is an artificial intelligence helping', 'What the app does NOT do', "That's it"],
    es: ['Es la aplicación de tu lugar', 'La barrita de abajo', 'La franja de arriba',
         'La radiecita — esta de aquí', 'La A más agranda la letra',
         'La banderita cambia el idioma', 'La campana es el aviso',
         'La estrellita guarda todo', 'La rueda es la comunidad',
         'Comercio: las tiendas a tu lado', 'Radio: la voz de la isla',
         'Cartera: el SulCoin', 'La lupa encuentra, el mapa responde',
         'Hay una inteligencia artificial ayudando', 'Lo que la aplicación NO hace',
         'Listo, es eso']
  };
  function titulo(i) {
    var l = lang();
    if (l !== 'pt' && LEGENDAS[l] && LEGENDAS[l][i]) return LEGENDAS[l][i];
    return CENAS[i].t;
  }

  var fundo = null, video = null;

  /* O app tem um mute próprio (vs.muted) que cala a voz da Litorânea. Ele era a
   * função antiga do 📻 — mostra o estado com todas as letras, porque só o ícone
   * ninguém entendia. */
  function pintarMudo() {
    var b = document.getElementById('vs-tour-mudo');
    if (!b) return;
    var mudo = false;
    try { mudo = localStorage.getItem('vs.muted') === '1'; } catch (e) {}
    b.textContent = mudo ? '🔇 App mudo' : '🔈 App fala';
    b.title = mudo ? 'O app está mudo. Toque pra ele voltar a falar.'
                   : 'O app pode falar em voz alta. Toque pra deixar mudo.';
  }

  /* ── estilo ── */
  var s = document.createElement('style');
  s.textContent =
    '#vs-tour{position:fixed;inset:0;z-index:100001;display:none;background:#050b14;' +
      'align-items:center;justify-content:center;padding:0}' +
    '#vs-tour.on{display:flex}' +
    '#vs-tour video{width:100%;height:100%;object-fit:contain;background:#050b14;display:block}' +
    '#vs-tour .x{position:fixed;top:calc(12px + env(safe-area-inset-top,0px));right:12px;' +
      'width:52px;height:52px;border-radius:50%;border:1px solid rgba(255,255,255,.28);' +
      'background:rgba(6,14,24,.82);color:#eaf3fa;font-size:24px;cursor:pointer;z-index:2;' +
      'backdrop-filter:blur(6px);line-height:1}' +
    /* o 📻 era o mute do app; ao virar o botão da explicação, o mute não podia
       simplesmente sumir — o FAB não tem um. Mora aqui, com nome. */
    '#vs-tour .mudo{position:fixed;top:calc(12px + env(safe-area-inset-top,0px));right:74px;' +
      'height:52px;padding:0 16px;border-radius:26px;border:1px solid rgba(255,255,255,.28);' +
      'background:rgba(6,14,24,.82);color:#cbd9e6;font:700 14px system-ui;cursor:pointer;' +
      'z-index:2;backdrop-filter:blur(6px);white-space:nowrap}' +
    '#vs-tour .som{position:fixed;left:50%;transform:translateX(-50%);' +
      'bottom:calc(26px + env(safe-area-inset-bottom,0px));display:none;z-index:2;' +
      'padding:15px 26px;border-radius:30px;border:0;background:#ffd54f;color:#20160a;' +
      'font:800 18px system-ui;cursor:pointer;box-shadow:0 10px 34px rgba(0,0,0,.55)}' +
    '#vs-tour .som.on{display:block}' +
    '#vs-tour .cc{position:fixed;left:0;right:0;z-index:2;' +
      'bottom:calc(92px + env(safe-area-inset-bottom,0px));padding:0 18px;text-align:center;' +
      'pointer-events:none}' +
    '#vs-tour .cc span{display:inline-block;background:rgba(4,10,18,.82);color:#eaf3fa;' +
      'font:600 17px/1.45 system-ui;padding:9px 14px;border-radius:12px;max-width:640px;' +
      'backdrop-filter:blur(4px)}';
  document.head.appendChild(s);

  /* ── painel ── */
  function montar() {
    if (fundo) return;
    fundo = document.createElement('div');
    fundo.id = 'vs-tour';
    fundo.innerHTML =
      '<button class="mudo" type="button" id="vs-tour-mudo"></button>' +
      '<button class="x" type="button" id="vs-tour-x" aria-label="Fechar">✕</button>' +
      '<video id="vs-tour-v" playsinline preload="auto"></video>' +
      '<div class="cc"><span id="vs-tour-cc"></span></div>' +
      '<button class="som" type="button" id="vs-tour-som">🔊 Ligar o som</button>';
    document.body.appendChild(fundo);

    video = fundo.querySelector('#vs-tour-v');

    // acabou → some sozinho, como o DJ pediu
    video.addEventListener('ended', fechar);
    fundo.querySelector('#vs-tour-x').addEventListener('click', fechar);

    fundo.querySelector('#vs-tour-mudo').addEventListener('click', function () {
      var mudo = false;
      try { mudo = localStorage.getItem('vs.muted') === '1'; } catch (e) {}
      if (typeof window.aplicarMute === 'function') window.aplicarMute(!mudo);
      else {
        try { localStorage.setItem('vs.muted', mudo ? '0' : '1'); } catch (e) {}
        if (!mudo) {
          try { window.speechSynthesis.cancel(); } catch (e) {}
          try { window.VSFalar && window.VSFalar.parar && window.VSFalar.parar(); } catch (e) {}
        }
      }
      pintarMudo();
    });
    pintarMudo();

    // legenda pra quem não pode ouvir — acompanha o tempo do vídeo
    video.addEventListener('timeupdate', legenda);

    // plano B se o aparelho recusar o som mesmo com o gesto
    fundo.querySelector('#vs-tour-som').addEventListener('click', function () {
      video.muted = false;
      video.play();
      this.classList.remove('on');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && fundo.classList.contains('on')) fechar();
    });
  }

  /* Onde cada cena começa: a legenda não depende de arquivo de fora, sai da
   * mesma lista que gerou a narração. Recalculado na 1ª vez que roda. */
  var marcos = null;
  function calcularMarcos() {
    if (marcos || !video || !video.duration || !isFinite(video.duration)) return;
    // as cenas duram na proporção do tamanho do texto falado — é o que o
    // edge-tts faz na prática, e erra por pouco
    var pesos = CENAS.map(function (c) { return (c.t + '. ' + c.p).length; });
    var soma = pesos.reduce(function (a, b) { return a + b; }, 0);
    var t = 0;
    marcos = pesos.map(function (p) { var ini = t; t += video.duration * p / soma; return ini; });
  }
  function legenda() {
    calcularMarcos();
    if (!marcos) return;
    var i = 0;
    for (var k = 0; k < marcos.length; k++) if (video.currentTime >= marcos[k]) i = k;
    var el = document.getElementById('vs-tour-cc');
    if (el && el._i !== i) { el._i = i; el.textContent = titulo(i); }
  }

  function abrir() {
    montar();
    try { localStorage.setItem(VISTO, '1'); } catch (e) {}
    esconderBalao();
    fundo.classList.add('on');
    document.body.style.overflow = 'hidden';
    // a língua pode ter mudado desde a última vez — troca a fonte se precisar
    var url = urlVideo();
    if (video.getAttribute('src') !== url) { video.setAttribute('src', url); marcos = null; }
    video.currentTime = 0;
    video.muted = false;
    var p = video.play();
    if (p && p.catch) {
      p.catch(function () {
        // navegador recusou som: toca mudo e oferece o som num toque
        video.muted = true;
        video.play();
        var b = document.getElementById('vs-tour-som');
        if (b) b.classList.add('on');
      });
    }
  }

  function fechar() {
    if (!fundo) return;
    fundo.classList.remove('on');
    document.body.style.overflow = '';
    try { video.pause(); video.currentTime = 0; } catch (e) {}
    var b = document.getElementById('vs-tour-som');
    if (b) b.classList.remove('on');
  }

  /* ── balão da primeira visita ── */
  var balao = null;
  function esconderBalao() { if (balao) { balao.remove(); balao = null; } }
  function mostrarBalao(btn) {
    var r = btn.getBoundingClientRect();
    balao = document.createElement('div');
    balao.style.cssText =
      'position:fixed;z-index:100000;max-width:262px;background:linear-gradient(150deg,#1c3346,#111f2c);' +
      'color:#eaf3fa;border:1px solid rgba(255,213,79,.55);border-radius:14px;padding:13px;' +
      'box-shadow:0 12px 38px rgba(0,0,0,.6);font:500 14px/1.45 system-ui';
    balao.innerHTML =
      '<b style="color:#ffd54f;display:block;margin-bottom:4px">👋 Primeira vez por aqui?</b>' +
      '<span>Toque aqui e um vídeo explica o app inteiro. Ele começa e termina sozinho.</span>' +
      '<div style="display:flex;gap:8px;margin-top:11px">' +
        '<button type="button" id="vs-tour-ver" style="flex:1;padding:10px;border-radius:10px;' +
          'border:1px solid rgba(255,213,79,.5);background:rgba(255,213,79,.18);color:#ffd54f;' +
          'font:700 13px system-ui;cursor:pointer">Quero ver</button>' +
        '<button type="button" id="vs-tour-nao" style="flex:1;padding:10px;border-radius:10px;' +
          'border:1px solid rgba(143,166,189,.4);background:transparent;color:#8fa6bd;' +
          'font:700 13px system-ui;cursor:pointer">Agora não</button>' +
      '</div>';
    document.body.appendChild(balao);
    balao.style.top = (r.bottom + 10) + 'px';
    balao.style.left = Math.max(10, Math.min(r.left - 8, innerWidth - 276)) + 'px';
    // o "Quero ver" também é toque de gente: o som sai liberado igual
    balao.querySelector('#vs-tour-ver').addEventListener('click', abrir);
    balao.querySelector('#vs-tour-nao').addEventListener('click', function () {
      try { localStorage.setItem(VISTO, '1'); } catch (e) {}
      esconderBalao();
    });
    setTimeout(esconderBalao, 15000);
  }

  /* ── liga num 🎬 PRÓPRIO, ao lado do 📻 ──
   * 12/08/2026: ANTES este tour tomava o 📻 da landing (#btn-mute) — clonava o
   * botão e substituía, o que apagava TODOS os listeners dele, inclusive o da
   * rádio. Era isso que fazia o vídeo explicativo "voltar" pro ícone da rádio
   * depois de tirado: nas outras páginas o 🎬 já era separado (#ph-video), mas
   * na index o tour continuava sequestrando o 📻.
   * O 📻 é da RÁDIO e só dela. O vídeo mora no 🎬 do lado. */
  /* 12/08/2026 — O TOUR NAO POE MAIS BOTAO NO CABECALHO.
   * Ele ja tinha tomado o 📻 da landing (clonava o botao e matava os listeners
   * da radio); depois passou a criar um 🎬 proprio. Agora nao poe nada: o
   * cabecalho fica equilibrado e limpo. O tour continua vivo e abre por
   * VSTour.abrir() — e ai que o FAB chama. Nada solto na pagina. */
  function ligar() {
    var velho = document.getElementById('vs-tour-btn');
    if (velho) velho.remove();
    return true;
  }


  var tentativas = 0;
  (function esperar() {
    if (ligar()) return;
    if (++tentativas > 40) return;
    setTimeout(esperar, 120);
  })();

  window.VSTour = { abrir: abrir, fechar: fechar, cenas: CENAS };
})();
