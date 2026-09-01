/* vs-voz-pop.js — 🎙️ O PONTO DE VOZ, agora num arquivo só (13/08/2026)
 *
 * POR QUE ISTO VIROU ARQUIVO PROPRIO:
 * este menu morava dentro do vs-page-footer.js. So que a LANDING nao carrega o
 * rodape compartilhado (ela tem o dela), entao la o menu simplesmente nao
 * existia: o microfone do rodape caia no #bb-radio do radio-fab.js e LIGAVA A
 * RADIO em vez de abrir as opcoes. O DJ apontou isso em 13/08.
 * Separando, existe UM menu so, igual em toda pagina — inclusive na landing.
 *
 * A radio agora se liga SO pelo 📻 do cabecalho (pedido do DJ, 13/08).
 * Aqui e voz: quem fala, e o que explica.
 */
/* ── 🎙️ PONTO DE VOZ — 11/08/2026 ────────────────────────────────────────
   Pedido do DJ: o microfone do rodape e onde "a galera mete a boca no
   trombone". Antes ele ia direto pra pagina da radio. Agora abre um pop-out
   com tudo que e lugar de gente falar.

   O controle da radio (tocar/parar) mudou de lugar: virou o 📻 do cabecalho.
   Aqui e so VOZ — quem fala, nao quem ouve.
   ──────────────────────────────────────────────────────────────────────── */
(function () {
  if (window.VSVozPop) return;

  var ITENS = [
    ['🗣️', 'Roda da comunidade', '/comunidade.html'],
    ['📻', 'Página da rádio',    '/radio.html'],
    ['💬', 'Chat da rádio',      '/radio.html?painel=chat'],
    ['⏰', 'Despertador',        '/despertador.html'],
    // 13/08/2026 — o video explicativo DESTA pagina entra aqui (pedido do DJ).
    // Nao e link: chama o VSVideoExplica, que ja sabe qual video e o da pagina.
    ['🎬', 'Ver o vídeo desta página', '#vs-video-explica']
  ];

  function abrir() {
    if (document.getElementById('vs-voz-pop')) return fechar();
    var d = document.createElement('div');
    d.id = 'vs-voz-pop';
    d.innerHTML =
      '<div class="vz-fundo"></div>' +
      '<div class="vz-caixa">' +
        '<div class="vz-topo">🎙️ Onde a gente fala</div>' +
        ITENS.map(function (i) {
          return '<a class="vz-item" href="' + i[2] + '"><span class="vz-ic">' + i[0] +
                 '</span><span>' + i[1] + '</span></a>';
        }).join('') +
        '<button class="vz-x" type="button">fechar</button>' +
      '</div>';
    document.body.appendChild(d);
    d.querySelector('.vz-fundo').addEventListener('click', fechar);
    d.querySelector('.vz-x').addEventListener('click', fechar);
  }
  function fechar() {
    var d = document.getElementById('vs-voz-pop');
    if (d) d.remove();
  }

  var st = document.createElement('style');
  st.textContent =
    '#vs-voz-pop{position:fixed;inset:0;z-index:99998;display:flex;align-items:flex-end;justify-content:center}' +
    '#vs-voz-pop .vz-fundo{position:absolute;inset:0;background:rgba(0,0,0,.62);backdrop-filter:blur(4px)}' +
    '#vs-voz-pop .vz-caixa{position:relative;width:100%;max-width:460px;margin:0 10px calc(78px + env(safe-area-inset-bottom,0px));' +
      'background:#131a23;border:1px solid #1f2937;border-radius:16px;padding:12px;' +
      'box-shadow:0 -6px 40px rgba(0,0,0,.6);animation:vzsobe .22s ease-out}' +
    '@keyframes vzsobe{from{transform:translateY(18px);opacity:0}to{transform:none;opacity:1}}' +
    '#vs-voz-pop .vz-topo{font:800 13px system-ui,sans-serif;color:#94a3b8;letter-spacing:.06em;' +
      'text-transform:uppercase;padding:4px 6px 10px}' +
    '#vs-voz-pop .vz-item{display:flex;align-items:center;gap:12px;padding:13px 12px;margin-bottom:7px;' +
      'border-radius:12px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);' +
      'text-decoration:none;color:#e5e7eb;font:600 15px system-ui,sans-serif}' +
    '#vs-voz-pop .vz-item:active{transform:scale(.985);background:rgba(6,182,212,.16)}' +
    '#vs-voz-pop .vz-ic{font-size:23px;line-height:1}' +
    '#vs-voz-pop .vz-x{width:100%;margin-top:4px;padding:11px;border-radius:12px;cursor:pointer;' +
      'background:transparent;border:1px solid #1f2937;color:#94a3b8;font:600 13px system-ui,sans-serif}';
  document.head.appendChild(st);

  // liga no item central do rodape (href "#vs-voz")
  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    var a = e.target.closest('a[href="#vs-voz"]');
    if (a) { e.preventDefault(); abrir(); return; }
    /* 13/08/2026 — o item do video nao e navegacao: chama o explicador da pagina.
       Se esta pagina nao tiver video, avisa em vez de nao fazer nada. */
    var v = e.target.closest('a[href="#vs-video-explica"]');
    if (v) {
      e.preventDefault();
      fechar();
      try {
        if (window.VSVideoExplica && VSVideoExplica.abrir) VSVideoExplica.abrir();
        else if (window.vsToast) vsToast('Esta página ainda não tem vídeo explicativo');
      } catch (x) {}
    }
  }, true);

  window.VSVozPop = { abrir: abrir, fechar: fechar, itens: ITENS };
})();
