/* vs-lugar-padrao.js — deixa TODA praia/bairro com o padrão da Barra — 12/08/2026
 *
 * Pedido do DJ: "todas as praias e bairros de Florianópolis devem estar com este
 * padrão igual à página da Barra da Lagoa... a feira digital, o comércio todo,
 * com a opção de encolher pra não ocupar tanto espaço".
 *
 * O que a Barra tinha e o template (localidade.html) não tinha:
 *   - seções com TÍTULO próprio (.sec-tag)
 *   - seções ENCOLHÍVEIS (<details>), pra lista grande não comer a tela
 *   - a HISTÓRIA do lugar
 * O resto (cabeçalho, carrossel, 6 ícones, mais votados, contato, QR, rodapé,
 * dropdown de lugares e a onda do tempo) o template já tinha.
 *
 * Roda só na localidade.html — a Barra tem página própria e já está no padrão.
 */
(function () {
  if (window.VSLugarPadrao) return;
  if (!/localidade\.html/i.test(location.pathname)) return;

  var SUPA = (window.VENTOSUL_CONFIG && window.VENTOSUL_CONFIG.SUPABASE_URL) ||
             'https://vdrzndgkwdpibexjkyxi.supabase.co';
  var ANON = 'sb_publishable_UuXuHUDxe7nmhE-Z9qu-0w_1tv2IrvC';

  var css = document.createElement('style');
  css.textContent =
    '.vslp-sec{margin:16px 10px}' +
    '.vslp-sec>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;' +
      'font:800 13px system-ui;letter-spacing:.05em;text-transform:uppercase;color:#67e8f9;' +
      'padding:11px 13px;background:rgba(12,20,30,.62);border:1px solid rgba(255,255,255,.10);' +
      'border-radius:12px;backdrop-filter:blur(5px)}' +
    '.vslp-sec>summary::-webkit-details-marker{display:none}' +
    '.vslp-sec>summary::after{content:"▾";margin-left:auto;transition:transform .2s;font-size:15px}' +
    '.vslp-sec[open]>summary::after{transform:rotate(180deg)}' +
    '.vslp-sec>summary:hover{border-color:rgba(103,232,249,.4)}' +
    '.vslp-corpo{padding:12px 13px;background:rgba(12,20,30,.45);border:1px solid rgba(255,255,255,.08);' +
      'border-top:none;border-radius:0 0 12px 12px;font:600 14px system-ui;color:#cfdcea;line-height:1.65}' +
    'body.tema-claro .vslp-sec>summary{background:rgba(255,255,255,.72);color:#0e7490}' +
    'body.tema-claro .vslp-corpo{background:rgba(255,255,255,.6);color:#41505f}';
  document.head.appendChild(css);

  function secao(titulo, aberta) {
    var d = document.createElement('details');
    d.className = 'vslp-sec';
    if (aberta) d.open = true;
    d.innerHTML = '<summary>' + titulo + '</summary><div class="vslp-corpo"></div>';
    return d;
  }

  /* ── encolhe o que já existe na página (comércio, feira…) ─────────────── */
  function encolherOqueJaTem() {
    // blocos grandes que hoje ficam soltos e comem a tela
    // ids REAIS do template (conferidos na página da Mole): o comércio tinha
    // 37 itens e 1.527px de altura, a feira 15 itens e 818px — era isso que
    // comia a tela inteira. Agora abrem e fecham.
    [['#gridComercio', '🛒 Comércio do lugar'],
     ['#gridBarracas', '🛍️ Feira digital'],
     ['#sobre-lugar',  'ℹ️ Sobre o lugar'],
     ['#lojas', '🛒 Comércio do lugar']].forEach(function (par) {
      var alvo = document.querySelector(par[0]);
      if (!alvo || alvo._vslp || !alvo.children.length) return;
      alvo._vslp = true;
      var d = secao(par[1], true);
      alvo.parentNode.insertBefore(d, alvo);
      d.querySelector('.vslp-corpo').appendChild(alvo);
    });
  }

  /* ── história do lugar, da coluna `descricao` ─────────────────────────── */
  function historia() {
    var slug = new URLSearchParams(location.search).get('slug');
    if (!slug || document.getElementById('vslp-historia')) return;
    fetch(SUPA + '/rest/v1/localidades?slug=eq.' + encodeURIComponent(slug) +
          '&select=sublocal,descricao,tags&limit=1',
          { headers: { apikey: ANON, Authorization: 'Bearer ' + ANON } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (d) {
        var loc = Array.isArray(d) && d[0];
        if (!loc) return;
        var texto = (loc.descricao || '').trim();
        // sem descrição no banco não se inventa história — some a seção
        if (!texto) return;
        var d2 = secao('📖 A história ' + (loc.sublocal ? 'da ' + loc.sublocal : 'do lugar'), false);
        d2.id = 'vslp-historia';
        d2.querySelector('.vslp-corpo').textContent = texto;
        var ancora = document.getElementById('vs-contato-footer') ||
                     document.querySelector('main') || document.body;
        if (ancora.id === 'vs-contato-footer') ancora.parentNode.insertBefore(d2, ancora);
        else ancora.appendChild(d2);
      })
      .catch(function () {});
  }

  /* 12/08/2026 — OS VÍDEOS VÃO PRA BAIXO DOS MAIS VOTADOS.
     Na Barra isso já tinha sido feito (a vitrine saiu do topo e foi pra junto
     dos barcos), mas a mudança não chegou ao template — nas outras praias a
     vitrine continuava lá em cima, empurrando o lugar pra baixo. Aqui ela é
     reancorada depois do carrossel de Mais Votados da galera. */
  function vitrineDepoisDosVotados() {
    var v = document.getElementById('vsvm');
    if (!v || v._vslpMoveu) return;
    var votados = document.getElementById('carousel-votados') ||
                  document.getElementById('secVotados');
    if (!votados) return;
    var ancora = document.getElementById('secVotados') || votados;
    if (!ancora.parentNode) return;
    ancora.parentNode.insertBefore(v, ancora.nextSibling);
    v._vslpMoveu = true;
  }

  function montar() { encolherOqueJaTem(); historia(); vitrineDepoisDosVotados(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
  else montar();
  // a página carrega comércio por fetch: tenta de novo quando chegar
  setTimeout(montar, 1800);
  setTimeout(montar, 4500);

  window.VSLugarPadrao = { montar: montar };
})();
