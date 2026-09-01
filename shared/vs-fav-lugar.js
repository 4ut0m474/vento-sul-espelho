/* vs-fav-lugar.js v2 — nas páginas de lugar (localidade.html, barra-da-lagoa.html…):
 *   • 1 clique no nome  → dropdown com as praias e bairros da cidade (navega sem voltar pra landing)
 *   • 2 toques no nome/carrossel → favorita (mesmo storage do app: localStorage "vs.favoritos", nome dourado)
 * A página pode definir window.VS_LUGAR = { tipo:"praia"|"cidade", nome, cidade, estado, foto }.
 * Sem VS_LUGAR, monta cidade a partir de ?cidade=&estado= da URL.
 * Genérico: funciona pra QUALQUER cidade que tenha sublocais na tabela `localidades`. */
(function () {
  const FAV_KEY = "vs.favoritos";
  const SUPA = "https://vdrzndgkwdpibexjkyxi.supabase.co";
  const ANON = "sb_publishable_UuXuHUDxe7nmhE-Z9qu-0w_1tv2IrvC";
  const UF = { SC: "Santa Catarina", PR: "Paraná", RS: "Rio Grande do Sul" };
  // páginas ricas próprias (fora do localidade.html genérico)
  const PAGINA_PROPRIA = { "barra da lagoa": "/barra-da-lagoa.html" };

  async function lugar() {
    if (window.VS_LUGAR && window.VS_LUGAR.nome) return window.VS_LUGAR;
    const q = new URLSearchParams(location.search);
    const cidade = (q.get("cidade") || "").trim();
    const estado = (q.get("estado") || "").trim();
    const sublocal = (q.get("sublocal") || "").trim();
    if (cidade) return { tipo: sublocal ? "praia" : "cidade", nome: sublocal || cidade, cidade: cidade, estado: estado };
    // páginas via ?slug= (links do próprio dropdown) não trazem cidade na URL:
    // resolve pelo banco e guarda na sessão
    const slug = (q.get("slug") || "").trim();
    if (!slug) return null;
    const chave = "vs.lugar." + slug;
    try { const c = JSON.parse(sessionStorage.getItem(chave) || "null"); if (c && c.cidade) return c; } catch (_) {}
    try {
      const r = await fetch(SUPA + "/rest/v1/localidades?slug=eq." + encodeURIComponent(slug) + "&select=cidade,estado,sublocal,tipo&limit=1",
        { headers: { apikey: ANON, Authorization: "Bearer " + ANON } });
      const l = r.ok ? (await r.json())[0] : null;
      if (l && l.cidade) {
        const item = { tipo: l.tipo || (l.sublocal ? "praia" : "cidade"), nome: l.sublocal || l.cidade, cidade: l.cidade, estado: l.estado || "" };
        try { sessionStorage.setItem(chave, JSON.stringify(item)); } catch (_) {}
        return item;
      }
    } catch (_) {}
    return null;
  }

  const getFavs = () => { try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch (_) { return []; } };
  const saveFavs = (arr) => localStorage.setItem(FAV_KEY, JSON.stringify(arr.slice(0, 50)));
  const favKey = (i) => `${i.tipo}:${i.id || (i.cidade + "|" + i.estado + "|" + i.nome)}`;
  const isFav = (i) => getFavs().some((f) => favKey(f) === favKey(i));

  function toggleFav(i) {
    const lista = getFavs();
    const idx = lista.findIndex((f) => favKey(f) === favKey(i));
    if (idx >= 0) lista.splice(idx, 1);
    else lista.unshift({ ...i, _fav_em: new Date().toISOString() });
    saveFavs(lista);
    return idx < 0;
  }

  function toast(msg) {
    let t = document.getElementById("vs-fav-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "vs-fav-toast";
      t.style.cssText = "position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:rgba(10,20,38,.95);color:#ffe9a8;border:1px solid rgba(251,191,36,.5);border-radius:12px;padding:10px 18px;font:600 14px system-ui;z-index:99999;opacity:0;transition:opacity .25s;pointer-events:none;max-width:86vw;text-align:center";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = "1";
    clearTimeout(t._h);
    t._h = setTimeout(() => { t.style.opacity = "0"; }, 2200);
  }

  function pinta(el, fav) {
    if (!el) return;
    el.style.color = fav ? "#fbbf24" : "";
    el.style.textShadow = fav ? "0 0 14px rgba(251,191,36,.45)" : "";
  }

  // ── Dropdown de sublocais da cidade ────────────────────────────────────────
  // 09/08/2026 — a ordem era "tipo.desc, sublocal.asc", que na prática dava uma
  // lista alfabética embaralhada por tipo: quem abria na Barra da Lagoa via
  // "Armação" e "Balneário" primeiro, do outro lado da ilha. Agora manda a
  // DISTÂNCIA — o que está ao redor vem antes — e os pontos turísticos descem
  // pro fim, depois de todas as praias e bairros. Por isso o lat/lng entrou no
  // select (a tabela já os tinha; ninguém pedia).
  // ⚠️ a chave do cache mudou de "vs.sublocais." pra "vs.sublocais2." de
  // propósito: o cache velho de 1h não tem coordenada nenhuma.
  async function sublocais(cidade, estado) {
    const chave = "vs.sublocais2." + cidade;
    try {
      const c = JSON.parse(sessionStorage.getItem(chave) || "null");
      if (c && Date.now() - c.t < 3600e3) return c.lista;
    } catch (_) {}
    const estadoFull = UF[estado] || estado;
    async function busca(filtroEstado) {
      const url = SUPA + "/rest/v1/localidades?cidade=eq." + encodeURIComponent(cidade) +
        (filtroEstado ? "&estado=eq." + encodeURIComponent(filtroEstado) : "") +
        "&sublocal=not.is.null&select=sublocal,tipo,slug,estado,lat,lng&order=sublocal.asc&limit=500";
      const r = await fetch(url, { headers: { apikey: ANON, Authorization: "Bearer " + ANON } });
      return r.ok ? r.json() : [];
    }
    let lista = await busca(estadoFull);
    if (!lista.length && estadoFull) lista = await busca(null);
    try { sessionStorage.setItem(chave, JSON.stringify({ t: Date.now(), lista })); } catch (_) {}
    return lista;
  }

  // Praia e bairro são "lugar onde se mora/vai"; atração, histórico e produtora
  // são ponto turístico. A ordem dos grupos é essa, e não muda.
  const GRUPOS = [
    { chave: "lugar",    titulo: "🏖️ Praias e bairros — do mais perto ao mais longe",
      tipos: ["praia", "bairro"] },
    { chave: "turistico", titulo: "📸 Pontos turísticos",
      tipos: ["atração", "atracao", "histórico", "historico", "produtora"] },
  ];

  function grupoDe(tipo) {
    const t = (tipo || "").toLowerCase();
    for (const g of GRUPOS) if (g.tipos.indexOf(t) >= 0) return g.chave;
    return "lugar";   // tipo novo/desconhecido entra como lugar, nunca some da lista
  }

  // Distância em km — fórmula de haversine, boa o bastante numa ilha.
  function km(a, b) {
    if (!a || !b || a.lat == null || b.lat == null) return null;
    const R = 6371, rad = (x) => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 +
              Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  function ordenar(lista, item) {
    // origem = o próprio lugar da página, achado na lista pelo nome
    const alvo = (item.nome || "").toLowerCase();
    const aqui = lista.find((s) => (s.sublocal || "").toLowerCase() === alvo) || null;
    const dist = (s) => (aqui ? km(aqui, s) : null);
    const saida = [];
    for (const g of GRUPOS) {
      const doGrupo = lista.filter((s) => grupoDe(s.tipo) === g.chave);
      doGrupo.forEach((s) => { s._km = dist(s); });
      doGrupo.sort((x, y) => {
        // sem coordenada não some: cai no fim do próprio grupo, em ordem alfabética
        if (x._km == null && y._km == null) return (x.sublocal || "").localeCompare(y.sublocal || "", "pt");
        if (x._km == null) return 1;
        if (y._km == null) return -1;
        return x._km - y._km;
      });
      if (doGrupo.length) saida.push({ titulo: g.titulo, itens: doGrupo });
    }
    return saida;
  }

  function hrefDe(s, cidade) {
    const propria = PAGINA_PROPRIA[(s.sublocal || "").toLowerCase()];
    if (propria) return propria;
    if (s.slug) return "/localidade.html?slug=" + encodeURIComponent(s.slug);
    return "/localidade.html?cidade=" + encodeURIComponent(cidade) +
      "&estado=" + encodeURIComponent(s.estado || "") +
      "&sublocal=" + encodeURIComponent(s.sublocal);
  }

  function fechaMenu() {
    const m = document.getElementById("vs-lugar-menu");
    if (m) m.remove();
  }

  async function abreMenu(ancora, item) {
    if (document.getElementById("vs-lugar-menu")) { fechaMenu(); return; }
    const lista = await sublocais(item.cidade, item.estado);
    if (!lista.length) { toast("Ainda não tem praias/bairros cadastrados de " + item.cidade); return; }
    const m = document.createElement("div");
    m.id = "vs-lugar-menu";
    m.style.cssText = "position:fixed;z-index:99980;background:rgba(8,15,30,.97);border:1px solid rgba(255,255,255,.14);border-radius:14px;box-shadow:0 16px 50px rgba(0,0,0,.6);padding:8px;max-height:min(62vh,480px);overflow-y:auto;min-width:230px;backdrop-filter:blur(6px)";
    const r = ancora.getBoundingClientRect();
    m.style.top = Math.min(r.bottom + 8, innerHeight - 120) + "px";
    m.style.left = Math.max(8, Math.min(r.left, innerWidth - 260)) + "px";
    const ico = (t) => {
      const x = (t || "").toLowerCase();
      if (x === "praia") return "🏖️";
      if (x === "bairro") return "🏘️";
      if (x === "produtora") return "🧺";
      if (x === "histórico" || x === "historico") return "🏛️";
      return "📸";
    };
    const atual = (item.nome || "").toLowerCase();
    // quanto falta pra chegar — em passo de gente, não em número de GPS
    const perto = (d) => {
      if (d == null) return "";
      if (d < 0.6) return "aqui do lado";
      if (d < 10) return d.toFixed(1).replace(".", ",") + " km";
      return Math.round(d) + " km";
    };
    const secoes = ordenar(lista, item);
    m.innerHTML =
      '<div style="font:700 12px system-ui;color:#9fb0c4;padding:6px 10px">' +
        item.cidade + " — " + lista.length + " lugares</div>" +
      secoes.map((sec) =>
        '<div style="font:700 11px system-ui;color:#7f8fa3;letter-spacing:.03em;' +
          'padding:9px 10px 4px;position:sticky;top:0;background:rgba(8,15,30,.97)">' +
          sec.titulo + "</div>" +
        sec.itens.map((s) => {
          const eAtual = (s.sublocal || "").toLowerCase() === atual;
          const d = eAtual ? "" : perto(s._km);
          return '<a href="' + hrefDe(s, item.cidade) + '" style="display:flex;gap:8px;align-items:center;padding:9px 10px;border-radius:9px;text-decoration:none;color:' +
            (eAtual ? "#fbbf24" : "#e8edf5") + ';font:600 14px system-ui" onmouseover="this.style.background=\'rgba(255,255,255,.08)\'" onmouseout="this.style.background=\'\'">' +
            '<span>' + ico(s.tipo) + "</span>" +
            '<span style="flex:1">' + s.sublocal + (eAtual ? " ← você tá aqui" : "") + "</span>" +
            (d ? '<small style="color:#7f8fa3;font:500 11px system-ui">' + d + "</small>" : "") +
            "</a>";
        }).join("")
      ).join("");
    document.body.appendChild(m);
    setTimeout(() => {
      const fora = (e) => { if (!m.contains(e.target) && e.target !== ancora) { fechaMenu(); document.removeEventListener("click", fora, true); } };
      document.addEventListener("click", fora, true);
    }, 50);
  }

  // ── Liga tudo ──────────────────────────────────────────────────────────────
  async function init() {
    // insiste ~8s: VS_LUGAR pode chegar depois (páginas que carregam dados async)
    let item = null;
    for (let i = 0; i < 12 && !item; i++) {
      item = await lugar();
      if (!item) await new Promise((r) => setTimeout(r, 700));
    }
    if (!item) return;
    const h1 = document.querySelector("h1");
    const alvos = [h1, document.querySelector(".carousel")].filter(Boolean);
    if (!alvos.length) return;
    pinta(h1, isFav(item));
    if (h1) { h1.style.cursor = "pointer"; h1.title = "1 toque: praias & bairros · 2 toques: favoritar"; }

    function alterna() {
      const add = toggleFav(item);
      pinta(h1, add);
      toast(add ? "⭐ " + item.nome + " favoritado! Aparece na tela inicial." : "Removido dos favoritos");
    }

    // clique único no h1 abre o menu — com espera curta pra não brigar com o duplo
    let cliqueTimer = null;
    if (h1) h1.addEventListener("click", (e) => {
      if (e.target.closest("button,a")) return;
      if (cliqueTimer) { clearTimeout(cliqueTimer); cliqueTimer = null; return; } // 2º clique: deixa pro dblclick
      cliqueTimer = setTimeout(() => { cliqueTimer = null; abreMenu(h1, item); }, 320);
    });

    let ultimoTap = 0, tapX = 0, tapY = 0;
    alvos.forEach((el) => {
      el.addEventListener("dblclick", (e) => {
        if (e.target.closest("button,a")) return;
        e.preventDefault(); fechaMenu(); alterna();
      });
      // celular: 2 toques rápidos (dblclick nem sempre dispara no touch)
      el.addEventListener("touchend", (e) => {
        if (e.target.closest("button,a")) return;
        const t = Date.now();
        const tq = e.changedTouches && e.changedTouches[0];
        const x = tq ? tq.clientX : 0, y = tq ? tq.clientY : 0;
        if (t - ultimoTap < 400 && Math.abs(x - tapX) < 24 && Math.abs(y - tapY) < 24) {
          e.preventDefault();
          if (cliqueTimer) { clearTimeout(cliqueTimer); cliqueTimer = null; }
          ultimoTap = 0; fechaMenu(); alterna();
        } else { ultimoTap = t; tapX = x; tapY = y; }
      }, { passive: false });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
