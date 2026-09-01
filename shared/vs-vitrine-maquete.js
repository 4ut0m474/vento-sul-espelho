/* vs-vitrine-maquete.js — vitrine de vídeos da Barra (maquete/drone).
 * Carrega o vídeo só no clique (poster antes). Some sozinho se os arquivos faltarem.
 * Uso: <div id="vs-vitrine-maquete"></div> na página + este script.
 * Sem alvo na página, encaixa depois do primeiro .city-header ou <h1>. */
(function () {
  /* 12/08/2026 (2ª volta) — A VITRINE APARECE EM TODO LUGAR, DE PROPÓSITO.
     O DJ quer que cada praia mostre esses vídeos como AMOSTRA do que o Vento Sul
     vai ser ali — "como já está na Barra". Então não se restringe mais à Barra.
     ⚠️ Mas o rótulo muda conforme o lugar: na Barra é "A Barra em movimento";
     fora dela fica claro que o exemplo FOI FEITO NA BARRA, pra ninguém achar que
     são imagens daquela praia. Mostrar vídeo da Barra dizendo que é da Mole seria
     enganar o usuário. */
  var VIDS = [
    /* 13/08/2026 — clipe novo, montado só com os trechos LIMPOS dos 3 vídeos que o
       DJ baixou. Os originais tinham PINGUIM na passarela, CAPIVARA na praia e
       lontras no canal — bicho que não existe aqui. Dos 30s baixados, 8 prestavam:
       a praia aérea, a vila com golfinhos (esses sim ocorrem na ilha) e a placa.
       Ver [[short_barra_12_08_e_erros_da_ia_2026_08_12]]: é o 2º lote com o mesmo erro. */
    /* 13/08/2026 (2ª leva) — os vídeos que o DJ fez. Eu tinha SUBIDO os arquivos
       pro servidor e esquecido de acrescentá-los AQUI, que é o que faz aparecer
       na página. Por isso ele disse "os vídeos não foram pras páginas".
       Os três passaram por conferência frame a frame. */
    { v: "/videos/barra-feira-canal.mp4",     p: "/videos/barra-feira-canal.jpg",     t: "A feira e o canal" },
    { v: "/videos/ilha-tour-ponte.mp4",       p: "/videos/ilha-tour-ponte.jpg",       t: "A ilha e a Hercílio Luz" },
    { v: "/videos/barra-vila-ponte.mp4",      p: "/videos/barra-vila-ponte.jpg",      t: "A vila e a ponte pênsil" },
    { v: "/videos/barra-barco-canal.mp4",     p: "/videos/barra-barco-canal.jpg",     t: "O barco no canal" },
    { v: "/videos/barra-costa-golfinhos.mp4", p: "/videos/barra-costa-golfinhos.jpg", t: "O farol e os golfinhos" },
    { v: "/videos/barra-maquete-vitrine-2026-08-13.mp4", p: "/videos/barra-maquete-vitrine-2026-08-13.jpg", t: "A Barra em miniatura" },
    { v: "/videos/barra-maquete-drone.mp4",  p: "/videos/barra-maquete-drone.jpg",  t: "A vila vista de cima" },
    { v: "/videos/barra-canal-barcos.mp4",   p: "/videos/barra-canal-barcos.jpg",   t: "O canal e os barcos" },
    { v: "/videos/barra-maquete-canal.mp4",  p: "/videos/barra-maquete-canal.jpg",  t: "A Barra em miniatura" },
    { v: "/videos/barra-maquete-praia.mp4",  p: "/videos/barra-maquete-praia.jpg",  t: "Da ponte à praia" },
    { v: "/videos/video-barqueiros.mp4",     p: "/videos/poster-barqueiros.jpg",    t: "Os barqueiros da Barra" }
  ];
  /* ═══════════════════════════════════════════════════════════════════════
     13/08/2026 — VÍDEOS QUE O DESENVOLVEDOR PÕE NUMA PASTA DO PC (ideia dele).
     Ele roda ~/scripts/publicar-videos.sh e o conteúdo de ~/VentoSul-Videos vai
     pra VPS, ganha capa automática e vira /videos/comunidade/indice.json.
     Aqui a gente lê esse índice e junta com a lista fixa — os novos entram na
     FRENTE. Tirou o arquivo da pasta e rodou de novo, sai do ar.
     Se o índice não existir, nada quebra: segue só com a lista fixa. */
  function puxarDaPasta(cb) {
    try {
      fetch('/videos/comunidade/indice.json?t=' + Date.now())
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (lista) {
          if (!Array.isArray(lista) || !lista.length) return cb([]);
          /* o nome do arquivo pode dizer o lugar: "Lagoa - passeio.mp4" só
             aparece na Lagoa. Sem lugar no nome, aparece em toda página. */
          var aqui = (location.pathname + ' ' + (document.querySelector('h1') || {}).textContent)
                     .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          cb(lista.filter(function (it) {
            if (!it.lugar) return true;
            var l = it.lugar.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return aqui.indexOf(l) >= 0;
          }));
        })
        .catch(function () { cb([]); });
    } catch (e) { cb([]); }
  }

  if (document.getElementById("vs-vitrine-css")) return;

  var css = document.createElement("style");
  css.id = "vs-vitrine-css";
  css.textContent =
    "#vsvm{margin:18px 0}"
  + "#vsvm .vsvm-h{font-weight:700;font-size:17px;margin:0 4px 10px;color:var(--txt,#e8eef4);display:flex;align-items:center;gap:8px}"
  + "#vsvm .vsvm-row{display:flex;gap:12px;overflow-x:auto;padding:2px 4px 10px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}"
  + "#vsvm .vsvm-card{position:relative;flex:0 0 82%;max-width:420px;aspect-ratio:16/9;border-radius:14px;overflow:hidden;scroll-snap-align:center;background:#0b1420;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.35)}"
  + "#vsvm .vsvm-card img,#vsvm .vsvm-card video{width:100%;height:100%;object-fit:cover;display:block}"
  + "#vsvm .vsvm-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}"
  + "#vsvm .vsvm-play span{width:56px;height:56px;border-radius:50%;background:rgba(10,20,32,.62);display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff;backdrop-filter:blur(3px)}"
  + "#vsvm .vsvm-cap{position:absolute;left:0;right:0;bottom:0;padding:18px 12px 8px;font-size:13px;color:#fff;background:linear-gradient(transparent,rgba(4,10,18,.82))}"
  + "@media(min-width:760px){#vsvm .vsvm-card{flex-basis:46%}}";
  document.head.appendChild(css);

  var wrap = document.createElement("div");
  wrap.id = "vsvm";
  var _naBarra = /barra-da-lagoa|barqueiros/.test(location.pathname.toLowerCase());
  var _tituloVitrine = _naBarra
    ? '🎬 A Barra em movimento'
    : '🎬 Como vai ficar aqui <small style="display:block;font-weight:600;font-size:12px;opacity:.75;margin-top:2px">amostra feita na Barra da Lagoa — o seu lugar entra assim</small>';
  wrap.innerHTML = '<div class="vsvm-h">' + _tituloVitrine + '</div><div class="vsvm-row"></div>';
  var row = wrap.querySelector(".vsvm-row");

  /* 13/08/2026 — ACABOU UM, VAI PRO PRÓXIMO SOZINHO (pedido do DJ).
     Antes cada vídeo tinha `loop = true` e repetia pra sempre: pra ver o
     seguinte, a pessoa tinha que arrastar a fileira e tocar de novo — e assim
     quase ninguém via além do primeiro. Agora, ao terminar, o próximo card abre,
     entra em cena sozinho (scroll suave) e começa a tocar. Vira uma sessão.
     ⚠️ O <video> continua nascendo só no clique — a página não pesa por isso.
     ⚠️ Só encadeia depois do PRIMEIRO toque da pessoa: o navegador exige um
     gesto pra liberar som, e esse gesto vale pros próximos vídeos da sequência. */
  var cards = [];

  function tocarCard(i, auto) {
    var c = cards[i];
    if (!c) return;                               // acabou a fileira: para
    var o = c._vs;
    if (c.querySelector("video")) return;
    var vd = document.createElement("video");
    vd.src = o.v; vd.controls = true; vd.playsInline = true; vd.autoplay = true;
    vd.preload = "auto";
    c.innerHTML = ""; c.appendChild(vd);
    c.insertAdjacentHTML("beforeend", '<div class="vsvm-cap">' + o.t + "</div>");
    vd.addEventListener("ended", function () {
      // devolve este card ao estado de capa, pra dar pra rever depois
      restaurar(c);
      tocarCard(i + 1, true);
    });
    // se der erro no arquivo, não trava a sessão: pula pro seguinte
    vd.addEventListener("error", function () { restaurar(c); tocarCard(i + 1, true); });
    if (auto) {
      try { c.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); } catch (e) {}
    }
    vd.play().catch(function () {});
  }

  function restaurar(c) {
    var o = c._vs;
    c.innerHTML = "";
    var img = new Image();
    img.src = o.p; img.alt = o.t; img.loading = "lazy";
    c.appendChild(img);
    c.insertAdjacentHTML("beforeend",
      '<div class="vsvm-play"><span>▶</span></div><div class="vsvm-cap">' + o.t + "</div>");
  }

  /* 18/08/2026 (DJ) — A PASTA DO PC É A ÚNICA VERDADE.
     Era `daPasta.concat(VIDS)`: o mesmo vídeo entrava DUAS vezes — uma pelo índice
     de ~/VentoSul-Videos e outra pela lista fixa aqui de cima — e o carrossel
     duplicava. Agora, se a pasta respondeu, só ela vale; a lista fixa fica de
     reserva pro caso do índice sumir. Tirou da pasta e publicou = sai do app.

     ORDEM (pedido do DJ): a cidade vem PRIMEIRO. Propaganda de barco/casa
     (Magia da Ilha e afins) vem depois — o lugar é o que importa na página. */
  function ehAnuncio(it) {
    var s = ((it.t || '') + ' ' + (it.v || '')).toLowerCase();
    return /magia da ilha|escuna|veleiro|titan/.test(s);
  }
  function ordenarCidadeAntes(lista) {
    var cidade = [], anuncio = [];
    lista.forEach(function (it) { (ehAnuncio(it) ? anuncio : cidade).push(it); });
    return cidade.concat(anuncio);
  }

  puxarDaPasta(function (daPasta) {
    VIDS = ordenarCidadeAntes(daPasta.length ? daPasta : VIDS);
    montarCards();
  });

  function montarCards() {
  VIDS.forEach(function (o, i) {
    var c = document.createElement("div");
    c.className = "vsvm-card";
    c._vs = o;
    var img = new Image();
    img.src = o.p; img.alt = o.t; img.loading = "lazy";
    img.onerror = function () { c.remove(); if (!row.children.length) wrap.remove(); };
    c.appendChild(img);
    c.insertAdjacentHTML("beforeend",
      '<div class="vsvm-play"><span>▶</span></div><div class="vsvm-cap">' + o.t + "</div>");
    c.addEventListener("click", function () { tocarCard(cards.indexOf(c), false); });
    cards.push(c);
    row.appendChild(c);
  });
  }

  function montar() {
    var alvo = document.getElementById("vs-vitrine-maquete");
    if (alvo) { alvo.appendChild(wrap); return; }
    var ref = document.querySelector(".city-header") || document.querySelector("main h1") || document.querySelector("h1");
    if (ref && ref.parentNode) ref.parentNode.insertBefore(wrap, ref.nextSibling);
    else document.body.appendChild(wrap);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar);
  else montar();
})();
