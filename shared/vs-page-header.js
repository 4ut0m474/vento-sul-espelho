(function(){
  // 11/08/2026 — o cabecalho puxa a radio global sozinho. Assim TODA pagina que
  // tem cabecalho ganha a radio de fundo, sem precisar editar dezenas de HTML.
  if (window.VSRadio || document.getElementById('vs-radio-global-js')) return;
  var s = document.createElement('script');
  s.id = 'vs-radio-global-js';
  s.src = '/shared/vs-radio-global.js?v=20260827d';
  s.async = false;
  document.head.appendChild(s);
})();
// vs-page-header.js — Cabeçalho padrão Vento Sul para páginas internas
// Estrutura IDÊNTICA à landing (styles.css #header):
//   esquerda: 🔊 tema ←   |   centro: título da página   |   direita: → 👤 A+
//
// Uso:
//   <script src="/shared/vs-page-header.js" defer></script>
//   Atributos opcionais no <body>:
//     data-vs-title="🗺️ Mapa Vivo"   → título central
//     data-vs-back="/"                → destino do ← (default: /)
//     data-vs-no-pad="1"              → não adiciona padding-top
(function () {
  if (window.VSPageHeader) return;

  const ZOOM = [1, 1.15, 1.30, 1.50];

  function aplicarTema(t) {
    document.body.classList.toggle('tema-claro', t === 'claro');
    const btn = document.getElementById('ph-tema');
    if (btn) btn.textContent = t === 'claro' ? '🌙' : '☀️';
    localStorage.setItem('vs.tema', t);
  }
  function aplicarFonte(idx) {
    idx = ((idx % ZOOM.length) + ZOOM.length) % ZOOM.length;
    document.body.style.zoom = ZOOM[idx];
    localStorage.setItem('vs.fonte_idx', String(idx));
  }

  // ── SEMPRE: restaura preferências (tema/fonte) ──────────────────
  aplicarTema(localStorage.getItem('vs.tema') || 'escuro');
  aplicarFonte(parseInt(localStorage.getItem('vs.fonte_idx') || '0', 10));

  // ── GUARD: não injeta DOM se já existe header ───────────────────
  // Detecta qualquer <header> direto filho do body (inclui landing e páginas próprias)
  const jaTemHeader = document.getElementById('header') ||
                      document.getElementById('vs-ph') ||
                      document.querySelector('body>header');
  if (jaTemHeader) {
    window.VSPageHeader = { setTitle(t) {
      if (t) document.title = String(t).replace(/\s+/g, ' ').trim() + ' — Vento Sul';
    }};
    return;
  }

  window.VSPageHeader = true; // marca antes de qualquer assíncrono

  // 09/08/2026 — extrairTitulo() saiu junto com o titulo central: o unico
  // consumidor era o <span id="vs-ph-title">, hoje ocupado pela bandeira.
  // data-vs-title continua valendo pro <title> da aba, escrito na propria pagina.
  const backHref = document.body.dataset.vsBack || '/';
  const noPad    = !!document.body.dataset.vsNoPad;

  /* ── CSS — espelho exato de styles.css ── */
  const s = document.createElement('style');
  s.id = 'vs-ph-style';
  s.textContent = `
    :root { --text: #e5e7eb; }
    body.tema-claro { --text: #1a2530; }

    #vs-ph {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      padding: 8px 6px;
      gap: 4px;
      /* TRANSPARENTE — experimento 03/08. Pra voltar: shared/vs-page-header.js.bak-opaco */
      background: transparent;
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 10000;
      border-bottom: none;
      padding-top: max(8px, env(safe-area-inset-top));
    }
    body.tema-claro #vs-ph { background: transparent; }
    /* sem fundo, o ícone precisa da própria sombra pra não sumir no conteúdo claro */
    #vs-ph .hbtn { filter: drop-shadow(0 1px 3px rgba(0,0,0,.85)); }
    body.tema-claro #vs-ph .hbtn { filter: drop-shadow(0 1px 3px rgba(255,255,255,.95)); }

    #vs-ph .header-side { display:flex; gap:1px; align-items:center; flex-shrink:0; }
    #vs-ph .header-left  { justify-content: flex-start; }
    #vs-ph .header-right { justify-content: flex-end; }

    #vs-ph .hbtn {
      background: transparent; color: var(--text);
      border: none; border-radius: 8px;
      width: 36px; height: 36px; padding: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 700; cursor: pointer;
      text-shadow:0 1px 2px rgba(0,0,0,1),0 2px 6px rgba(0,0,0,.95),0 0 16px rgba(0,0,0,.8); filter: drop-shadow(0 1px 2px rgba(0,0,0,1)) drop-shadow(0 2px 6px rgba(0,0,0,.9)) drop-shadow(0 0 12px rgba(0,0,0,.75));
      flex-shrink: 0; line-height: 1; transition: background .15s, transform .1s;
    }
    @media (min-width: 560px) { #vs-ph .hbtn { width:38px; height:38px; font-size:19px; } }
    #vs-ph .hbtn:hover  { background: rgba(255,255,255,.10); }
    #vs-ph .hbtn:active { transform: scale(.92); }
    /* setas sao glifo de texto, nao emoji: mais corpo, menos peso */
    #vs-ph .hbtn-nav { font-size: 26px; font-weight: 600; }
    body.tema-claro #vs-ph .hbtn { color: var(--text); text-shadow:0 1px 2px rgba(255,255,255,1),0 2px 6px rgba(255,255,255,.95),0 0 16px rgba(255,255,255,.85); filter: drop-shadow(0 1px 2px rgba(255,255,255,1)) drop-shadow(0 2px 6px rgba(255,255,255,.9)) drop-shadow(0 0 12px rgba(255,255,255,.8)); }
    body.tema-claro #vs-ph .hbtn:hover { background: rgba(0,0,0,.06); }

    /* 09/08/2026 — o titulo azul do meio saiu; quem mora aqui agora e a BANDEIRA.
     * O nome do lugar ja aparece grande no H1 da propria pagina (e e nele que se
     * clica pra abrir praias & bairros / favoritar), entao o titulo do cabecalho
     * so repetia a mesma palavra. A bandeira estava fora das paginas internas
     * desde 06/08 exatamente por brigar com esse titulo — agora tem o lugar dela,
     * o mesmo lugar central que ela ja ocupa na landing (#btn-lang). */
    #vs-idioma-btn {
      justify-self: center;
      font-size: 20px; line-height: 1;
    }

    #ph-fonte { font-size: 14px !important; font-weight: 900 !important; }
    #ph-mute { position:relative; }
    #ph-mute.muted svg { opacity:.35; }
    #ph-mute.muted::after { content:''; position:absolute; top:4px; left:14px; width:2px; height:18px; background:currentColor; transform:rotate(45deg); border-radius:1px; opacity:.8; }

    ${noPad ? '' : `body { padding-top: calc(62px + env(safe-area-inset-top,0px)) !important; }`}
  `;
  document.head.appendChild(s);

  /* ── HTML ── */
  const ph = document.createElement('header');
  ph.id = 'vs-ph';
  ph.innerHTML = `
    <div class="header-side header-left">
      <button class="hbtn" id="ph-mute"    title="Mute">📻</button>
      <button class="hbtn" id="ph-tema"    title="Tema claro/escuro">🌙</button>
      <button class="hbtn hbtn-nav" id="ph-back" title="Voltar">←</button>
    </div>
    <button class="hbtn" id="vs-idioma-btn" type="button"
            title="Idioma / Language / Idioma" aria-label="Trocar idioma">🇧🇷</button>
    <div class="header-side header-right">
      <button class="hbtn hbtn-nav" id="ph-forward" title="Avançar">→</button>
      <button class="hbtn" id="ph-push" title="Notificações do seu jeito" aria-label="Notificações">🔕</button>
      <button class="hbtn" id="ph-fonte"   title="Aumentar fonte">A+</button>
    </div>
  `;
  document.body.prepend(ph);

  // ── IDIOMA (04/08/2026) ───────────────────────────────────────────────────
  // O app tinha dicionario PT/EN/ES mas so o index.html usava, e so ele tinha
  // botao de bandeira: nas outras 106 paginas nao dava nem pra trocar de lingua.
  // Como TODA pagina ja carrega este cabecalho, e daqui que os dois entram:
  //   vs-idioma.js       -> desenha a bandeira aqui no header-right e avisa a troca
  //   vs-traduz-pagina.js-> ouve o aviso e traduz a pagina inteira, frase por frase
  // Assim pagina nova nasce traduzida sem ninguem marcar nada no HTML.
  (function carregarModulosExtra() {
    const isLugar = document.getElementById('carousel-votados') ||
                    document.querySelector('.carousel-votados') ||
                    document.querySelector('meta[name="vs-lugar"][content="sim"]');
    const isHome = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');

    const modulos = ['/shared/vs-idioma.js', '/shared/vs-traduz-pagina.js'];
    if (isHome || isLugar) {
      modulos.push('/shared/vs-compra-coletiva.js');
    }

    modulos.forEach(function (src) {
      if (document.querySelector('script[src^="' + src + '"]')) return;
      var sc = document.createElement('script');
      sc.src = src + '?v=20260829';
      sc.defer = true;
      document.head.appendChild(sc);
    });
  })();

  // ── SINO (09/08/2026) ─────────────────────────────────────────────────────
  // Aqui era o 👤 azul (Minha Área), que so aparecia pra quem estava logado —
  // ou seja, na maioria das visitas o lugar ficava VAZIO. Minha Área continua
  // no FAB (👤 Minha Área), entao nada ficou orfao. Agora o lugar e do sino,
  // que aparece SEMPRE: sem ele, nas 102 paginas com este cabecalho nao havia
  // nenhum caminho pras notificacoes — so o index.html tinha botao.
  // Este arquivo nao carrega o app.js, entao o estado se le sozinho:
  //   vs.push.ativo -> gravado por _atualizarBotaoPush() no app.js
  (function sinoPush() {
    const btn = document.getElementById('ph-push');
    if (!btn) return;
    const perm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
    let ativo = false;
    try { ativo = localStorage.getItem('vs.push.ativo') === '1'; } catch (e) {}
    if (perm === 'denied') {
      btn.textContent = '🚫';
      btn.style.color = '#ef4444';
      btn.title = 'Notificações BLOQUEADAS neste navegador. Toque no cadeado 🔒 ao lado do endereço → Notificações → Permitir. Depois volte e ligue aqui.';
    } else if (ativo && perm === 'granted') {
      btn.textContent = '🔔';
      btn.title = 'Notificações ligadas — toque pra escolher o que chega';
    } else {
      btn.textContent = '🔕';
      btn.style.opacity = '0.7';
      btn.title = 'Notificações do seu jeito — toque pra ligar';
    }
    btn.addEventListener('click', () => {
      /* 13/08/2026 — o sino agora REGISTRA o aparelho na conta, não só abre o
         painel. Antes ele pedia a permissão e a inscrição morria no navegador:
         resetou o aparelho, perdeu tudo. O VSPush grava em device_tokens com o
         user_id, e é isso que faz a notificação voltar sozinha depois. */
      try {
        if (window.VSPush && VSPush.registrar) {
          VSPush.registrar().then(function (r) {
            if (r && r.ok) {
              btn.textContent = '🔔'; btn.style.opacity = '1';
              try { localStorage.setItem('vs.push.ativo', '1'); } catch (e) {}
              try { vsToast('🔔 Este aparelho ficou ligado à sua conta'); } catch (e) {}
            } else if (r && /sem conta/.test(r.motivo || '')) {
              try { vsToast('Entre na sua conta pra as notificações te acompanharem'); } catch (e) {}
            }
          });
        }
      } catch (e) {}
      if (typeof window.abrirNotif === 'function') { window.abrirNotif(); return; }
      // 17/08/2026 — fora do domínio do app (fluxia.tec.br) o painel de
      // notificações mora no vento-sul.tech; a página de lá declara
      // window.VS_APP_ORIGIN. Dentro do app a variável não existe e nada muda.
      location.href = (window.VS_APP_ORIGIN || '') + '/#notif';
    });
  })();

  document.getElementById('ph-tema').addEventListener('click', () => {
    aplicarTema(document.body.classList.contains('tema-claro') ? 'escuro' : 'claro');
  });
  document.getElementById('ph-fonte').addEventListener('click', () => {
    aplicarFonte(parseInt(localStorage.getItem('vs.fonte_idx') || '0', 10) + 1);
  });
  document.getElementById('ph-back').addEventListener('click', () => {
    if (history.length > 1) history.back(); else location.href = backHref;
  });
  document.getElementById('ph-forward').addEventListener('click', () => {
    history.forward();
  });
  // 11/08/2026 — o 📻 do cabecalho virou LIGA/DESLIGA DA RADIO.
  // Antes ele so mutava. Mutar e ruim: o stream continua baixando 120 kbps no
  // silencio, torrando bateria e dado do usuario. Agora PARA de verdade —
  // o VSRadio derruba a conexao. E a radio acompanha a navegacao: cada pagina
  // retoma sozinha se estava tocando.
  document.getElementById('ph-mute').addEventListener('click', () => {
    // 13/08/2026 — aceita qualquer um dos dois nomes. Chamar `alternar` direto
    // deixava o botao MUDO quando o radio-fab.js carregava por ultimo: o objeto
    // dele nao tinha esse metodo, o clique estourava e nem caia no plano B
    // abaixo, porque o `if (window.VSRadio)` passava do mesmo jeito.
    const R = window.VSRadio;
    const acionar = R && (R.alternar || R.toggle);
    if (typeof acionar === 'function') {
      try { acionar.call(R); return; } catch (e) {}
    }
    // sem o modulo (pagina antiga): comportamento antigo, pra nada quebrar
    if (window.VSFalar?.mutar) { window.VSFalar.mutar(); return; }
    document.querySelectorAll('audio,video').forEach(v => { v.muted = !v.muted; });
    const btn = document.getElementById('ph-mute');
    if (btn) btn.classList.toggle('muted');
  });
  // deixa o botao no estado certo assim que o cabecalho existe
  setTimeout(() => { try { window.VSRadio && window.VSRadio.pintar(); } catch(e){} }, 0);

  // ── BANDEIRA no centro (09/08/2026) ───────────────────────────────────────
  // O vs-idioma.js pinta a bandeira certa e traduz; aqui so ligamos o clique,
  // que roda o ciclo pt → en → es. Ele carrega em defer logo acima, entao pode
  // ainda nao ter chegado na hora do clique: por isso a checagem na hora.
  document.getElementById('vs-idioma-btn').addEventListener('click', () => {
    const LANGS = ['pt', 'en', 'es'];
    const I = window.VSIdioma;
    if (!I) return;
    I.set(LANGS[(LANGS.indexOf(I.get()) + 1) % LANGS.length]);
  });

  window.VSPageHeader = {
    // O titulo saiu do cabecalho (o lugar agora e da bandeira). Quem chamava
    // setTitle continua funcionando: o nome vai pra aba do navegador, que e
    // onde ele ainda serve pra alguma coisa — e ninguem quebra.
    setTitle(t) {
      if (t) document.title = String(t).replace(/\s+/g, ' ').trim() + ' — Vento Sul';
    }
  };

  /* 13/08/2026 — PEDE PRO NAVEGADOR NAO DESCARTAR OS DADOS DESTE APP.
     Sem isto o Chrome trata o armazenamento como "best effort": quando o disco
     aperta, ou o site fica dias sem abrir, ele limpa localStorage/IndexedDB — e
     ajuste, favorito e alarme "somem de um dia pro outro".
     ⚠️ NAO tem efeito sobre a permissao de NOTIFICACAO. Aquilo e do navegador,
     nenhum site consegue guardar ou restaurar. Se o 🔔 volta bloqueado, a causa
     esta fora do codigo (aba anonima, ou o Chrome revogando permissao de site
     pouco usado) — ver a nota no /permissoes.html. */
  /* 13/08/2026 — CARREGA O REGISTRO DE PUSH EM TODA PÁGINA.
     Antes só o index.html carregava o firebase.js, então o sininho 🔔 do
     cabeçalho não tinha como registrar nada nas outras 103 páginas. Como este
     cabeçalho está em todas, puxar daqui resolve de uma vez — e no app do
     celular e no navegador do PC igualmente, cada um gravando o seu aparelho. */
  try {
    if (!document.getElementById('vs-push-js')) {
      var _sp = document.createElement('script');
      _sp.id = 'vs-push-js';
      _sp.src = '/shared/vs-push.js?v=1';
      _sp.defer = true;
      document.head.appendChild(_sp);
    }
  } catch (e) {}

  try {
    if (navigator.storage && navigator.storage.persist && navigator.storage.persisted) {
      navigator.storage.persisted()
        .then(function (ja) { if (!ja) return navigator.storage.persist(); })
        .catch(function () {});
    }
  } catch (e) {}
})();
