// vs-page-footer.js — Rodapé FIXO padrão Vento Sul (barra de baixo sempre visível + QR/compartilhar).
// Uso: <script src="/shared/vs-page-footer.js" defer></script>
// Expõe window.VSFooterQR() pra abrir o QR desta página de qualquer lugar (ex: FAB do mapa).
(function () {
  if (window.VSFooterQR) return; // já carregado

  /* 17/08/2026 — MESMO RODAPÉ FORA DO DOMÍNIO DO APP (fluxia.tec.br).
   * Lá '/carteira.html' cairia em fluxia.tec.br/carteira.html, que não existe.
   * A página de lá declara window.VS_APP_ORIGIN='https://vento-sul.tech'.
   * Dentro do vento-sul.tech a variável não existe e nada muda. */
  const _ORI = window.VS_APP_ORIGIN || '';
  const _abs = (h) => (_ORI && h.charAt(0) === '/') ? _ORI + h : h;

  // Bottom-bar: Início · Comércio · Rádio · Carteira · Buscar (🔎 produto e lugar)
  const LINKS = [
    ['🏠', 'Início',    '/'],
    ['🛍️', 'Comércio',  '/#comercio'],
    ['🎙️', 'Falar',     '#vs-voz'],   // 11/08/2026 — virou o ponto de VOZ da comunidade
    ['💼', 'Carteira',  '/carteira.html'],
    ['🔎', 'Buscar',    '#vs-busca'],   // era 📍 Perto — virou a busca de produto e lugar
  ];

  const s = document.createElement('style');
  s.id = 'vs-pf-style';
  s.textContent = `
    body { padding-bottom: calc(66px + env(safe-area-inset-bottom,0px)) !important; }
    /* TRANSPARENTE — experimento 03/08. Pra voltar: shared/vs-page-footer.js.bak-opaco */
    #vs-pf { position: fixed; left: 0; right: 0; bottom: 0; z-index: 45;
      display: flex; align-items: flex-end; justify-content: space-around; gap: 2px;
      padding: 4px 0 calc(4px + env(safe-area-inset-bottom,0px));
      background: transparent; border-top: none; }
    body.tema-claro #vs-pf { background: transparent; }
    /* mesmas medidas do rodapé da landing (#bottom-bar), e em em: escala com o zoom do app */
    #vs-pf a, #vs-pf .pf-qr { display:flex; flex-direction:column; align-items:center; gap:3px;
      text-decoration:none; color:rgba(255,255,255,.85);
      font:700 clamp(10px, calc(var(--fonte-base,14px) - 2px), 16px) system-ui,sans-serif;
      line-height:1.2; text-shadow:0 1px 2px rgba(0,0,0,1),0 2px 6px rgba(0,0,0,.95),0 0 16px rgba(0,0,0,.8);
      padding:6px 2px; border-radius:9px; border:none; background:transparent; cursor:pointer;
      flex:1 1 0; min-width:0; max-width:100px; overflow:hidden; }
    #vs-pf a .ic, #vs-pf .pf-qr .ic { font-size:2.1em; line-height:1;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,1)) drop-shadow(0 2px 6px rgba(0,0,0,.9)) drop-shadow(0 0 12px rgba(0,0,0,.75)); }
    #vs-pf a .lb, #vs-pf .pf-qr .lb { font-size:1em; white-space:nowrap; overflow:hidden;
      text-overflow:ellipsis; max-width:100%; }
    body.tema-claro #vs-pf a, body.tema-claro #vs-pf .pf-qr { color:#1e293b;
      text-shadow:0 1px 2px rgba(255,255,255,1),0 2px 6px rgba(255,255,255,.95),0 0 16px rgba(255,255,255,.85); }
    body.tema-claro #vs-pf a .ic, body.tema-claro #vs-pf .pf-qr .ic {
      filter: drop-shadow(0 1px 2px rgba(255,255,255,1)) drop-shadow(0 2px 6px rgba(255,255,255,.9)) drop-shadow(0 0 12px rgba(255,255,255,.8)); }
    #vs-pf a:active, #vs-pf .pf-qr:active { transform:scale(.94); }
    #vs-pf .pf-qr .ic { background:linear-gradient(135deg,#06b6d4,#10b981); -webkit-background-clip:text;
      -webkit-text-fill-color:transparent; background-clip:text; }
    #vs-pf .pf-qr { color:#10b981; }
    /* Overlay QR */
    #vs-qr-ov { position:fixed; inset:0; z-index:100000; display:none; align-items:center; justify-content:center;
      background:rgba(0,0,0,.82); backdrop-filter:blur(4px); padding:20px; }
    #vs-qr-ov.on { display:flex; }
    #vs-qr-box { background:#fff; border-radius:20px; padding:22px; max-width:340px; width:100%; text-align:center;
      box-shadow:0 20px 60px rgba(0,0,0,.5); animation:vsqrpop .3s cubic-bezier(.2,1.3,.4,1); }
    @keyframes vsqrpop { from{transform:scale(.8);opacity:0} to{transform:scale(1);opacity:1} }
    #vs-qr-box img { width:248px; height:248px; display:block; margin:0 auto 12px; border-radius:10px; background:#f0f3f6; }
    #vs-qr-box .qt { font:800 16px system-ui; color:#14202b; margin-bottom:4px; }
    #vs-qr-box .qu { font:600 11px system-ui; color:#5b6b7a; margin-bottom:14px; word-break:break-all; line-height:1.4; }
    #vs-qr-box button { border:none; border-radius:10px; padding:12px 16px; font:800 13px system-ui; cursor:pointer; margin:3px; }
    #vs-qr-box .qshare { background:#10b981; color:#fff; }
    #vs-qr-box .qclose { background:#e3e9ef; color:#14202b; }
  `;
  document.head.appendChild(s);

  const ov = document.createElement('div');
  ov.id = 'vs-qr-ov';
  ov.innerHTML = '<div id="vs-qr-box">' +
    '<img id="vs-qr-img" alt="QR desta página">' +
    '<div class="qt" id="vs-qr-tit"></div>' +
    '<div class="qu" id="vs-qr-url"></div>' +
    '<div><button class="qshare" id="vs-qr-share">🔗 Compartilhar link</button>' +
    '<button class="qclose" id="vs-qr-close">Fechar</button></div></div>';
  document.body.appendChild(ov);

  function tituloLimpo() {
    return (document.body.dataset.vsTitle || document.title || 'Vento Sul')
      .replace(/\s*[—·\-|]\s*Vento Sul.*/i, '').trim() || 'Vento Sul';
  }
  function abrirQR() {
    const url = location.href, tit = tituloLimpo();
    document.getElementById('vs-qr-img').src =
      'https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=12&data=' + encodeURIComponent(url);
    document.getElementById('vs-qr-tit').textContent = '📲 ' + tit;
    document.getElementById('vs-qr-url').textContent = url;
    document.getElementById('vs-qr-share').textContent = '🔗 Compartilhar link';
    ov.classList.add('on');
  }
  window.VSFooterQR = abrirQR;

  ov.onclick = (e) => { if (e.target === ov) ov.classList.remove('on'); };
  document.getElementById('vs-qr-close').onclick = () => ov.classList.remove('on');
  document.getElementById('vs-qr-share').onclick = async () => {
    const url = location.href, tit = tituloLimpo();
    try {
      if (navigator.share) await navigator.share({ title: tit, url });
      else { await navigator.clipboard.writeText(url); document.getElementById('vs-qr-share').textContent = '✅ Link copiado!'; }
    } catch (e) {}
  };

  /* ── 12/08/2026 — CONTATO + QR PRÓPRIO DESTA PÁGINA, no fim de toda página ──
   * Pedido do DJ: "cada página tem que ter um QR code pra mostrar pras pessoas".
   * A pessoa está na Barra, abre a página do lugar, mostra o celular pra outra —
   * e a outra vai direto NAQUELA página. Vale pra barraca, promoção, mais votados.
   * O QR já existia aqui dentro (VSFooterQR) mas NADA o chamava: não havia botão
   * em lugar nenhum, então era um recurso invisível. Agora ele fica visível no
   * fim da página, embaixo do contato, e ampliável no toque.
   * Entra por aqui pra valer em TODAS as páginas de uma vez — este rodapé é
   * carregado por todas elas. */
  function montarContatoQR() {
    if (document.getElementById('vs-rodape-contato')) return;
    var url = location.href;
    var bloco = document.createElement('section');
    bloco.id = 'vs-rodape-contato';
    bloco.setAttribute('aria-label', 'Contato e QR desta página');
    bloco.innerHTML =
      '<div class="vsrc-in">' +
        '<div class="vsrc-qr">' +
          '<img id="vs-rodape-qr-img" alt="QR code desta página" loading="lazy" ' +
               'src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=' +
               encodeURIComponent(url) + '">' +
          '<div class="vsrc-qrtxt"><b>QR desta página</b><br>' +
            '<span>Mostre pra alguém e a pessoa cai aqui mesmo</span></div>' +
        '</div>' +
      '</div>';
    var css = document.createElement('style');
    css.textContent =
      '#vs-rodape-contato{margin:0 10px 86px;padding:14px 14px 18px;border-radius:0 0 14px 14px;' +
        'background:rgba(12,20,30,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);' +
        'border:1px solid rgba(255,255,255,.10);border-top:none;text-align:center}' +
      'body.tema-claro #vs-rodape-contato{background:rgba(255,255,255,.72);border-color:rgba(0,0,0,.10)}' +
      '#vs-rodape-contato .vsrc-fala{font-weight:700;font-size:14px;opacity:.9;margin-bottom:8px}' +
      '#vs-rodape-contato .vsrc-links{display:flex;flex-wrap:wrap;gap:8px 14px;justify-content:center;margin-bottom:14px}' +
      '#vs-rodape-contato .vsrc-links a{font-size:13px;color:#7fd4ff;text-decoration:none}' +
      '#vs-rodape-contato .vsrc-links a:hover{text-decoration:underline}' +
      '#vs-rodape-contato .vsrc-qr{display:flex;flex-direction:column;align-items:center;gap:10px;' +
        'cursor:pointer;padding-top:12px;border-top:1px solid rgba(255,255,255,.08)}' +
      '#vs-rodape-qr-img{width:132px;height:132px;border-radius:10px;background:#fff;padding:6px;display:block}' +
      '#vs-rodape-contato .vsrc-qrtxt{font-size:12.5px;line-height:1.45;text-align:center;max-width:260px}' +
      '#vs-rodape-contato .vsrc-qrtxt span{opacity:.7}';
    document.head.appendChild(css);
    // toque no QR = versão grande, pra mostrar de longe
    bloco.querySelector('.vsrc-qr').addEventListener('click', function () { abrirQR(); });
    // EMBAIXO do contato que já existe (vs-contato-footer.js: telefones, e-mail,
    // YouTube, Instagram). Se ele ainda não chegou, espera — não duplica contato.
    var contato = document.getElementById('vs-contato-footer');
    if (contato && contato.parentNode) contato.parentNode.insertBefore(bloco, contato.nextSibling);
    else (document.querySelector('main') || document.body).appendChild(bloco);
  }
  function reposicionar() {
    var b = document.getElementById('vs-rodape-contato');
    var c = document.getElementById('vs-contato-footer');
    if (b && c && c.nextSibling !== b) c.parentNode.insertBefore(b, c.nextSibling);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', montarContatoQR);
  } else { montarContatoQR(); }
  // o contato carrega em defer e pode chegar depois: reencaixa embaixo dele
  setTimeout(function(){ montarContatoQR(); reposicionar(); }, 900);
  setTimeout(reposicionar, 2500);

  // Barra fixa (só se a página não tiver footer próprio)
  if (!document.getElementById('vs-pf') && !document.querySelector('body>footer')) {
    const f = document.createElement('footer');
    f.id = 'vs-pf';
    f.innerHTML =
      LINKS.map(([i, l, h]) => `<a href="${_abs(h)}"><span class="ic">${i}</span><span class="lb">${l}</span></a>`).join('')
      // 20/08/2026 — o QR desta pagina, pra mostrar na tela e a pessoa do lado
      // apontar a camera. E botao, nao link: nao navega, abre o #vs-qr-ov por cima.
      + '<button type="button" class="pf-qr" aria-label="Mostrar o QR desta pagina">'
      +   '<span class="ic">\u25a3</span><span class="lb">QR</span></button>';

    const bQr = f.querySelector('.pf-qr');
    if (bQr) bQr.addEventListener('click', (e) => { e.preventDefault(); abrirQR(); });

    // 🔎 abre a busca por cima, sem sair da página
    const aBusca = f.querySelector('a[href="#vs-busca"]');
    if (aBusca) aBusca.addEventListener('click', (e) => {
      e.preventDefault();
      // 05/08/2026 — a lupa agora abre a busca COM as 3 IAs (Litoranea, Automata,
// Aurora) e com microfone. A aba "Buscar" continua entregando pro VSBusca
// de sempre, entao nada do que ja existia se perdeu.
if (window.VSBuscaIA) return VSBuscaIA.abrir();
['/shared/vs-busca.js?v=2', '/shared/vs-busca-ia.js?v=1'].forEach((src, i) => {
  const el = document.createElement('script');
  el.src = src;
  if (i === 1) el.onload = () => window.VSBuscaIA && VSBuscaIA.abrir();
  document.head.appendChild(el);
});
    });
    document.body.appendChild(f);
  }
})();

/* ── 🎙️ PONTO DE VOZ ─────────────────────────────────────────────────────
   13/08/2026 — O MENU SAIU DAQUI e virou /shared/vs-voz-pop.js.
   Motivo: a LANDING nao carrega este rodape (ela tem o dela), entao la o menu
   nao existia e o microfone acabava ligando a radio em vez de abrir as opcoes.
   Morando em arquivo proprio, ele vale em TODA pagina — inclusive na landing.
   Aqui so garantimos que ele seja carregado; o guard dele evita carregar 2x. */
(function () {
  if (window.VSVozPop || document.getElementById('vs-voz-pop-js')) return;
  var s = document.createElement('script');
  s.id = 'vs-voz-pop-js';
  s.src = '/shared/vs-voz-pop.js';
  s.defer = true;
  document.head.appendChild(s);
})();
