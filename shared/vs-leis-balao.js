/* vs-leis-balao.js — 09/08/2026
 *
 * PEDIDO DO DJ: "as coisas que a associação pode participar têm que ser mais
 * fáceis de ver. Já tem isso, mas não tá fácil. Põe bem no começo da página,
 * um botão ou balão, ícone fácil pequeno; quando clicar ou passar em cima já
 * diz lei de incentivo."
 *
 * O conteúdo existia — /onde-concorrer.html tem os editais, o que está aberto
 * e o que dá pra fazer sem edital nenhum — mas só se chegava lá por link solto
 * no meio do texto. Quem entrava na página da associação não descobria.
 *
 * Então: uma pílula pequena, dourada, logo abaixo do título. Fechada ela diz o
 * essencial ("Lei de incentivo, editais e programas"); passando o dedo/mouse ou
 * tocando uma vez, ela abre e conta em uma frase o que tem lá dentro. Um
 * segundo toque leva pra página. No celular não existe "passar em cima", por
 * isso o 1º toque abre e o 2º navega — nunca leva a pessoa embora de surpresa.
 */
(function () {
  if (window.VSLeisBalao) return;

  var DESTINO = '/onde-concorrer.html';

  function montar() {
    if (document.getElementById('vs-leis-balao')) return;

    // Onde encaixar: logo depois do título da página. Cada página tem um
    // cabeçalho diferente, então tenta na ordem e para no primeiro que existir.
    var apos = document.querySelector('.head') ||
               document.querySelector('h1') ||
               document.querySelector('.intro');
    if (!apos) return;

    var st = document.createElement('style');
    st.textContent =
      '#vs-leis-balao{display:block;margin:12px 0 16px;padding:11px 14px;border-radius:14px;' +
        'background:linear-gradient(140deg,rgba(255,213,79,.16),rgba(255,213,79,.06));' +
        'border:1px solid rgba(255,213,79,.5);color:#ffe9a8;text-decoration:none;' +
        'font:700 14px/1.35 system-ui,sans-serif;cursor:pointer;' +
        'transition:background .18s,transform .12s;max-width:640px}' +
      '#vs-leis-balao:hover{background:rgba(255,213,79,.22)}' +
      '#vs-leis-balao:active{transform:scale(.99)}' +
      '#vs-leis-balao .lb-topo{display:flex;align-items:center;gap:9px}' +
      '#vs-leis-balao .lb-ico{font-size:19px;flex:0 0 auto}' +
      '#vs-leis-balao .lb-seta{margin-left:auto;color:#ffd54f;flex:0 0 auto}' +
      '#vs-leis-balao .lb-mais{max-height:0;overflow:hidden;transition:max-height .28s ease;' +
        'color:#e6d2a0;font:500 13px/1.5 system-ui}' +
      '#vs-leis-balao.aberto .lb-mais{max-height:140px}' +
      '#vs-leis-balao .lb-mais span{display:block;padding-top:8px}';
    document.head.appendChild(st);

    var a = document.createElement('a');
    a.id = 'vs-leis-balao';
    a.href = DESTINO;
    a.title = 'Lei de incentivo, editais e programas que a associação pode disputar';
    a.innerHTML =
      '<div class="lb-topo">' +
        '<span class="lb-ico">💰</span>' +
        '<span>Lei de incentivo, editais e programas</span>' +
        '<span class="lb-seta">›</span>' +
      '</div>' +
      '<div class="lb-mais"><span>O que a associação pode disputar: o que está aberto ' +
        'agora, o que já passou, o que dá pra começar hoje sem depender de edital — ' +
        'e o que precisa estar pronto antes de se inscrever. Toque pra ver.</span></div>';

    // mouse: abre ao passar em cima
    a.addEventListener('mouseenter', function () { a.classList.add('aberto'); });
    a.addEventListener('mouseleave', function () { a.classList.remove('aberto'); });

    // dedo: 1º toque abre, 2º vai — sem susto
    a.addEventListener('click', function (e) {
      var temMouse = window.matchMedia && window.matchMedia('(hover:hover)').matches;
      if (!temMouse && !a.classList.contains('aberto')) {
        e.preventDefault();
        a.classList.add('aberto');
      }
    });

    apos.parentNode.insertBefore(a, apos.nextSibling);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
  else montar();

  window.VSLeisBalao = { montar: montar };
})();
