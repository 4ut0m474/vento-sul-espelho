// 🌊 Vento Sul — Pulsa-FAB
// Botão flutuante dourado pulsante que expande dropdown glass com ações da página.
// Uso:
//   <script src="/shared/vs-fab.js"></script>
//   <script>
//     VSFab.montar({
//       ancora: "bottom-right",   // bottom-right (default) | top-right | bottom-left
//       icone: "✨",                // ícone fechado
//       itens: [
//         { ico:"🌊", label:"Litorânea", cat:"ia",        on:()=>abrirLitoranea() },
//         { ico:"📲", label:"QR loja",   cat:"navegacao", on:()=>VSQRShow.mostrar() },
//         { ico:"⚙️", label:"Config",    cat:"admin",     on:()=>abrirConfig() }
//       ]
//     });
//   </script>
(function () {
  if (window.VSFab) return;

  const CORES = {
    primaria:  { bg: "rgba(232,73,160,0.18)", border: "rgba(232,73,160,0.45)", glow: "rgba(232,73,160,0.5)" },  // rosa-magenta
    navegacao: { bg: "rgba(6,182,212,0.18)",  border: "rgba(6,182,212,0.45)",  glow: "rgba(6,182,212,0.5)"  },  // ciano
    ia:        { bg: "rgba(251,191,36,0.18)", border: "rgba(251,191,36,0.45)", glow: "rgba(251,191,36,0.5)" },  // gold
    admin:     { bg: "rgba(168,85,247,0.18)", border: "rgba(168,85,247,0.45)", glow: "rgba(168,85,247,0.5)" },  // roxo
    info:      { bg: "rgba(255,255,255,0.10)", border: "rgba(255,255,255,0.30)", glow: "rgba(255,255,255,0.4)" }, // branco-glass
    sucesso:   { bg: "rgba(16,185,129,0.18)", border: "rgba(16,185,129,0.45)", glow: "rgba(16,185,129,0.5)" }   // verde
  };

  function injetarCSS() {
    if (document.getElementById("vs-fab-style")) return;
    const s = document.createElement("style");
    s.id = "vs-fab-style";
    s.textContent = `
      .vs-fab-root { position:fixed; z-index:9998; pointer-events:none; }
      .vs-fab-root.bottom-right { bottom:18px; right:14px; }
      /* afastado do header pra não sobrepor barra de cabeçalho */
      .vs-fab-root.top-right    { top:74px; right:6px; }
      .vs-fab-root.bottom-left  { bottom:18px; left:14px; }

      /* 🌊 FAB transparente pulsante (Missão E, 2026-05-10): sem fundo nem moldura.
         Só o ícone, com drop-shadow colorida ciclando — espelha o megafone da rádio. */
      .vs-fab-btn {
        pointer-events:auto;
        width:90px; height:90px; border-radius:50%; border:0; cursor:pointer;
        background: transparent;
        backdrop-filter:none; -webkit-backdrop-filter:none;
        box-shadow:none;
        color:#fff;
        font-size:34px; line-height:54px; text-align:center;
        animation: vs-fab-pulse 4s ease-in-out infinite;
        transition: transform .25s, filter .25s;
      }
      .vs-fab-btn:hover  { transform:scale(1.10); }
      .vs-fab-btn:active { transform:scale(0.94); }
      /* estrela SVG preenche o botão maior */
      .vs-fab-btn svg { width:74px; height:74px; display:block; margin:auto; }
      .vs-fab-btn.aberto { transform: rotate(45deg); animation:none; filter: drop-shadow(0 0 14px rgba(251,191,36,0.95)) drop-shadow(0 0 24px rgba(251,191,36,0.5)); }

      /* Label contextual ao lado do FAB (mostra qual seção está) */
      .vs-fab-label {
        pointer-events:none;
        position:absolute; right:54px; top:50%; transform:translateY(-50%);
        background: rgba(15,15,30,0.78);
        color:#ffd54f;
        padding:5px 11px; border-radius:14px;
        font-size:12px; font-weight:700; letter-spacing:0.3px;
        backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
        border:1px solid rgba(255,213,79,0.35);
        white-space:nowrap; opacity:0; transition: opacity .25s, transform .25s;
        box-shadow: 0 2px 10px rgba(0,0,0,0.35);
      }
      .vs-fab-root.bottom-left .vs-fab-label { right:auto; left:54px; }
      .vs-fab-label.show { opacity:1; }
      .vs-fab-label.troca {
        animation: vs-fab-label-troca 0.6s ease;
      }
      @keyframes vs-fab-label-troca {
        0%   { transform: translateY(-50%) scale(1); }
        30%  { transform: translateY(-50%) scale(1.18); background: rgba(168,85,247,0.85); color:#fff; }
        100% { transform: translateY(-50%) scale(1); }
      }
      .vs-fab-btn.troca {
        animation: vs-fab-btn-troca 0.55s ease;
      }
      @keyframes vs-fab-btn-troca {
        0%,100% { transform: scale(1); }
        45%     { transform: scale(1.18); box-shadow: 0 0 0 18px rgba(168,85,247,0.0), 0 4px 24px rgba(168,85,247,0.7); }
      }

      /* Pulse via drop-shadow colorida (ícone fica brilhando sem fundo).
         Cicla gold → âmbar → laranja-vermelho → roxo → azul → gold. */
      @keyframes vs-fab-pulse {
        0%, 100% { filter: drop-shadow(0 0 8px rgba(251,191,36,0.85)) drop-shadow(0 0 16px rgba(251,191,36,0.5)); }
        20%      { filter: drop-shadow(0 0 12px rgba(251,191,36,0.95)) drop-shadow(0 0 22px rgba(251,191,36,0.6)); }
        40%      { filter: drop-shadow(0 0 10px rgba(249,115,22,0.85)) drop-shadow(0 0 18px rgba(239,68,68,0.5)); }
        60%      { filter: drop-shadow(0 0 12px rgba(168,85,247,0.85)) drop-shadow(0 0 22px rgba(168,85,247,0.5)); }
        80%      { filter: drop-shadow(0 0 10px rgba(6,182,212,0.85))  drop-shadow(0 0 18px rgba(59,130,246,0.5)); }
      }

      .vs-fab-drop {
        pointer-events:none;
        position:absolute; bottom:64px; right:0;
        display:flex; flex-direction:column; gap:10px; align-items:flex-end;
        opacity:0; transform: translateY(8px) scale(0.96); transition: opacity .22s, transform .22s;
      }
      .vs-fab-root.top-right .vs-fab-drop    { top:64px; bottom:auto; max-height:calc(100vh - 150px); overflow-y:auto; padding:4px 2px 4px 12px; }
      .vs-fab-root.bottom-left .vs-fab-drop  { left:0; right:auto; align-items:flex-start; }
      .vs-fab-drop::-webkit-scrollbar { width:6px; }
      .vs-fab-drop::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.22); border-radius:999px; }
      .vs-fab-root.aberto .vs-fab-drop {
        pointer-events:auto;
        opacity:1; transform: translateY(0) scale(1);
      }

      .vs-fab-item {
        display:flex; align-items:center; gap:10px; flex-direction:row-reverse;
        opacity:0; transform: translateY(6px);
        transition: opacity .25s, transform .25s, background .15s;
      }
      .vs-fab-root.bottom-left .vs-fab-item { flex-direction:row; }
      .vs-fab-root.aberto .vs-fab-item { opacity:1; transform: translateY(0); }

      .vs-fab-item-btn {
        width:48px; height:48px; border-radius:50%; border:1px solid;
        backdrop-filter: blur(14px) saturate(160%);
        -webkit-backdrop-filter: blur(14px) saturate(160%);
        font-size:22px; cursor:pointer; color:#fff;
        display:flex; align-items:center; justify-content:center;
        transition: transform .15s, box-shadow .2s;
      }
      .vs-fab-item-btn:hover {
        transform: scale(1.12);
      }

      .vs-fab-item-label {
        background: rgba(15,15,30,0.78); color:#fff;
        padding:8px 14px; border-radius:12px;
        font-size:1.1rem; font-weight:700; letter-spacing:.2px;
        backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
        border:1px solid rgba(255,255,255,0.18);
        white-space:nowrap;
        opacity:0.96;
      }

      .vs-fab-overlay {
        position:fixed; inset:0; z-index:9997;
        background: radial-gradient(ellipse at bottom right, rgba(0,0,0,0.30), transparent 60%);
        opacity:0; pointer-events:none; transition: opacity .22s;
      }
      .vs-fab-root.aberto + .vs-fab-overlay,
      .vs-fab-root.aberto ~ .vs-fab-overlay {
        opacity:1; pointer-events:auto;
      }
    `;
    document.head.appendChild(s);
  }

  // ⭐ Estrela padrao (Cruzeiro do Sul RGB, convergencia) — usada em TODAS as paginas
  const STAR_ICON = '<svg class="vcs2" viewBox="0 0 96 96"><style> .vcs2 g{transform-box:fill-box;transform-origin:center} .vcs2 .cvA{animation:cvA 3s ease-in-out infinite} .vcs2 .cvB{animation:cvB 3s ease-in-out infinite} .vcs2 .cvC{animation:cvC 3s ease-in-out infinite} .vcs2 .cvD{animation:cvD 3s ease-in-out infinite} .vcs2 .cvE{animation:cvE 3s ease-in-out infinite} @keyframes cvA{0%,100%{transform:translate(0,0) scale(1)}45%{transform:translate(0,14px) scale(1.25)}} @keyframes cvB{0%,100%{transform:translate(0,0) scale(1)}45%{transform:translate(16px,2px) scale(1.25)}} @keyframes cvC{0%,100%{transform:translate(0,0) scale(1)}45%{transform:translate(-14px,6px) scale(1.25)}} @keyframes cvD{0%,100%{transform:translate(0,0) scale(1)}45%{transform:translate(-3px,-14px) scale(1.3)}} @keyframes cvE{0%,100%{transform:translate(0,0) scale(1)}45%{transform:translate(-8px,-4px) scale(1.4)}} @media (prefers-reduced-motion:reduce){.vcs2 g{animation:none!important}} </style><defs><radialGradient id="gBlue" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#4FB4FF" stop-opacity=".95"/><stop offset="100%" stop-color="#2E9BFF" stop-opacity="0"/></radialGradient><radialGradient id="gGreen" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#3BFF9A" stop-opacity=".95"/><stop offset="100%" stop-color="#22E67A" stop-opacity="0"/></radialGradient><radialGradient id="gRed" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#FF5B5B" stop-opacity=".95"/><stop offset="100%" stop-color="#FF2E2E" stop-opacity="0"/></radialGradient><radialGradient id="gGold" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#FFDE5B" stop-opacity=".98"/><stop offset="100%" stop-color="#F5B301" stop-opacity="0"/></radialGradient><radialGradient id="gWhite" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#FFFFFF" stop-opacity=".95"/><stop offset="100%" stop-color="#CFE8FF" stop-opacity="0"/></radialGradient></defs><g class="cvA"><circle cx="48" cy="16" r="16" fill="url(#gBlue)"/><path d="M48 6 Q48 16 58 16 Q48 16 48 26 Q48 16 38 16 Q48 16 48 6 Z" fill="#8FD0FF"/></g><g class="cvB"><circle cx="20" cy="46" r="14" fill="url(#gGreen)"/><path d="M20 37 Q20 46 29 46 Q20 46 20 55 Q20 46 11 46 Q20 46 20 37 Z" fill="#7DFFB8"/></g><g class="cvC"><circle cx="74" cy="38" r="13" fill="url(#gRed)"/><path d="M74 30 Q74 38 82 38 Q74 38 74 46 Q74 38 66 38 Q74 38 74 30 Z" fill="#FF9B9B"/></g><g class="cvD"><circle cx="52" cy="74" r="18" fill="url(#gGold)"/><path d="M52 62 Q52 74 64 74 Q52 74 52 86 Q52 74 40 74 Q52 74 52 62 Z" fill="#FFE79A"/></g><g class="cvE"><circle cx="62" cy="54" r="8" fill="url(#gWhite)"/><circle cx="62" cy="54" r="3.5" fill="#FFFFFF"/></g></svg>';

  window.VSFab = window.VSFab || {};
  window.VSFab.STAR_ICON = STAR_ICON;

  // Itens padrão da landing — funcionam de QUALQUER página (só navegação/URL).
  // Nas páginas com FAB próprio (mapa, rádio…) entram DEPOIS dos itens da página.
  // 🛡️ Acesso admin — 05/08/2026.
  // ANTES o escudo TROCAVA a bandeira de idioma no cabeçalho, e o dono do app
  // ficava sem conseguir trocar de língua. Agora ele mora aqui no FAB, que é o
  // lugar combinado pra tudo, e a bandeira volta a ser só bandeira.
  // O PIN/biometria é o gate que já existe (shared/biometric-gate.js) — não
  // inventamos outro. Ele é fricção de tela: quem protege o dado é o RLS.
  function abrirAreaAdmin() {
    function comGate() {
      var g = window.VSBiometric || window.VSPinGate;
      if (!g) { location.href = "/admin-painel.html"; return; }
      g.gate({ titulo: "🛡️ Área do administrador" }).then(function (ok) {
        if (ok) location.href = "/admin-painel.html";
      });
    }
    if (window.VSBiometric || window.VSPinGate) return comGate();
    var sc = document.createElement("script");
    sc.src = "/shared/biometric-gate.js?v=1";
    sc.onload = comGate;
    sc.onerror = function () { location.href = "/admin-painel.html"; };
    document.head.appendChild(sc);
  }

  function itensPadrao() {
    return ([
      { ico:"📻", label:"Rádio",                  cat:"info",      on: () => location.href = "/radio.html" },
      // 17/08/2026 — Roda da Comunidade também nesta lista de reserva: é ela que
      // atende as páginas de FAB próprio que não carregam o vs-default-fab.js
      // (mapa.html, comerciante-painel.html). Sem isto, nelas o item faltaria.
      { ico:"🗣️", label:"Roda da Comunidade · debates", cat:"primaria", on: () => location.href = "/comunidade.html" },
      { ico:"🌅", label:"FluxIA — dá cérebro ao seu negócio", cat:"ia", on: () => window.open("https://fluxia.tec.br","_blank","noopener") },
      { ico:"💰", label:"Auditoria — reduz custo com IA", cat:"sucesso", on: () => location.href = "/auditoria-como-funciona.html" },
      { ico:"🗺️", label:"Mapa Vivo",              cat:"primaria",  on: () => location.href = "/mapa.html" },
      { ico:"🏪", label:"Comerciante",            cat:"primaria",  on: () => location.href = "/#comercio" },
      { ico:"💬", label:"Falar com o Vento Sul",  cat:"info",      on: () => window.open("https://wa.me/5548992467821?text=ajuda","_blank","noopener") },
      { ico:"💳", label:"Carteira",               cat:"sucesso",   on: () => location.href = "/carteira.html" },
      { ico:"🌊", label:"Litorânea",              cat:"ia",        on: () => location.href = "/?ia=litoranea" },
      { ico:"⚡", label:"Devs Fundadores — editais & inscrição", cat:"ia", on: () => location.href = "/devs-hub.html" },
      { ico:"▶️", label:"YouTube — Rádio ao vivo 24h", cat:"info", on: () => window.open("https://www.youtube.com/@vento-sul_tech/live","_blank","noopener") },
      { ico:"📲", label:"Instagram · WhatsApp",   cat:"info",      on: () => { if(window.VSSocial)return VSSocial.canais(); var s=document.createElement("script"); s.src="/shared/vs-social.js?v=2"; s.onload=()=>VSSocial.canais(); document.head.appendChild(s); } },
      { ico:"📰", label:"Jornal",                 cat:"info",      on: () => location.href = "/jornal.html" },
      { ico:"📍", label:"Perto de Você",          cat:"primaria",  on: () => location.href = "/perto.html" },
      { ico:"🎯", label:"Meu Perfil IA",          cat:"ia",        on: () => location.href = "/meu-perfil.html" },
      { ico:"📊", label:"Transparência pública",  cat:"sucesso",   on: () => location.href = "/transparencia.html#pools" },
      { ico:"📍", label:"Meus Lugares",           cat:"navegacao", on: () => location.href = "/meus-lugares.html" },
      { ico:"📣", label:"Divulgar & Sulis",       cat:"sucesso",   on: () => location.href = "/divulgar.html" },
      { ico:"🛒", label:"Compras Coletivas",      cat:"primaria",  on: () => location.href = "/compras-coletivas.html" },
      { ico:"🏝️", label:"Floripa: bairros & praias", cat:"info",   on: () => location.href = "/localidade.html?cidade=" + encodeURIComponent("Florianópolis") + "&estado=" + encodeURIComponent("Santa Catarina") },
    ]);
  }
  window.VSFab.itensPadrao = itensPadrao;

  // ⚠️ 26/08 — guardado em escopo de modulo porque o remendo abaixo remonta
  //    o FAB quando o vs-default-fab.js chega atrasado, e `mapa.html` chama
  //    montar() DUAS vezes: remontar com os opts da 1a chamada apagaria os
  //    itens da 2a. Sempre remontar com o ultimo pedido, nunca com o antigo.
  let ultimoOpts = null;

  function montar(opts = {}) {
    ultimoOpts = opts;
    window.VSFab._montado = true;
    injetarCSS();
    const ancora = opts.ancora || "bottom-right";
    const icone  = opts.icone  || "✨";
    // iconeHtml: SVG/HTML no lugar do emoji (ex.: a constelação do logo)
    const iconeHtml = opts.iconeHtml || (opts.icone ? null : STAR_ICON);
    let itens  = (opts.itens || []).slice();
    // Anexa o padrão da landing DEPOIS dos itens da página (sem duplicar por label).
    // Desligável com { padrao:false } (ex.: mini-FABs contextuais).
    if (opts.padrao !== false) {
      // Fonte única = vs-default-fab (tem extras contextuais); itensPadrao é fallback.
      // ⚠️ 26/08/2026 — ORDEM DO DJ: as opções da própria página vêm primeiro e
      //    as do FAB normal da landing (o do Cruzeiro do Sul) logo abaixo,
      //    SEMPRE, em toda página. O que quebrava isso: `index.html` e
      //    `mapa.html` — a home e o mapa — nunca incluíram o
      //    /shared/vs-default-fab.js. Sem ele, window.VSDefaultFab não existe
      //    na hora do montar() e a lista caía no itensPadrao(), que é só
      //    RESERVA e está desatualizada (ficava sem o Despertador). Medido no
      //    ar: essas duas páginas com FAB diferente de todas as outras.
      //    Consertar as duas não bastava — a próxima página nova cairia no
      //    mesmo buraco. Então, faltando o script do padrão, ele é buscado
      //    aqui e o FAB se remonta sozinho quando chegar.
      //    NÃO tem `return` de propósito: é melhor mostrar o FAB de reserva
      //    agora e completar depois do que deixar a página sem FAB nenhum se
      //    o script não vier.
      if (!window.VSDefaultFab && !window.__vsDefaultFabBuscando) {
        window.__vsDefaultFabBuscando = true;
        const org = String(window.VS_APP_ORIGIN || "").replace(/\/+$/, "");
        const sc = document.createElement("script");
        sc.src = org + "/shared/vs-default-fab.js?v=9";
        // remonta com o ULTIMO pedido, não com este — ver `ultimoOpts` acima
        sc.onload  = () => { try { montar(ultimoOpts || opts); } catch (e) {} };
        // se o script não vier (rede/404), destrava pra poder tentar de novo
        sc.onerror = () => { window.__vsDefaultFabBuscando = false; };
        document.head.appendChild(sc);
      }
      const fonte = (window.VSDefaultFab?.itens?.() || itensPadrao());
      const vistos = new Set(itens.map(it => String(it.label || "").toLowerCase()));
      for (const it of fonte) {
        const k = String(it.label || "").toLowerCase();
        if (!vistos.has(k)) { itens.push(it); vistos.add(k); }
      }
    }
    // 🛡️ 05/08/2026 — a sala do dono vem SEMPRE PRIMEIRO, na frente de tudo.
    // Tem que entrar AQUI e nao no itensPadrao: a fonte real dos itens e o
    // vs-default-fab, e o itensPadrao so roda como reserva — foi onde eu errei
    // da primeira vez, e o item nunca aparecia.
    // So existe quando o SERVIDOR confirmou que e o dono (RPC is_admin).
    if (window.VS_EH_ADMIN && !itens.some(it => /administrador/i.test(it.label || ""))) {
      itens.unshift({ ico: "🛡️", label: "Área do administrador", cat: "admin", on: abrirAreaAdmin });
    }

    const label  = ""; // balãozinho contextual removido a pedido do DJ (22/07) — era opts.label || ""
    if (!itens.length) return;

    // Se já existe um FAB e só quer trocar conteúdo, faz update in-place (preserva DOM/animação)
    const existente = document.querySelector(".vs-fab-root");
    if (existente && opts.update !== false) {
      const btn = existente.querySelector(".vs-fab-btn");
      const drop = existente.querySelector(".vs-fab-drop");
      const lbl = existente.querySelector(".vs-fab-label");
      if (btn && drop) {
        // Atualiza ícone
        if (iconeHtml) btn.innerHTML = iconeHtml;
        else if (btn.firstChild?.nodeType === 3) btn.firstChild.nodeValue = icone;
        else btn.textContent = icone;
        // Garante label
        const labelEl = lbl || (() => {
          const l = document.createElement("span");
          l.className = "vs-fab-label";
          existente.appendChild(l);
          return l;
        })();
        if (label) {
          labelEl.textContent = label;
          labelEl.classList.add("show");
        } else {
          labelEl.classList.remove("show");
        }
        // Anima troca
        labelEl.classList.remove("troca");
        btn.classList.remove("troca");
        // reflow pra reanimar
        void btn.offsetWidth;
        labelEl.classList.add("troca");
        btn.classList.add("troca");

        // Substitui itens
        drop.innerHTML = "";
        _preencherItens(drop, itens, existente);
        return _retornarApi(existente, btn);
      }
    }

    // Senão remove e recria do zero
    document.querySelectorAll(".vs-fab-root, .vs-fab-overlay").forEach(n => n.remove());

    const root = document.createElement("div");
    root.className = `vs-fab-root ${ancora}`;
    const btn = document.createElement("button");
    btn.className = "vs-fab-btn";
    btn.setAttribute("aria-label", "Abrir ações da página");
    if (iconeHtml) btn.innerHTML = iconeHtml;
    else btn.textContent = icone;
    const drop = document.createElement("div");
    drop.className = "vs-fab-drop";

    _preencherItens(drop, itens, root);

    // Label contextual
    if (label) {
      const lbl = document.createElement("span");
      lbl.className = "vs-fab-label show";
      lbl.textContent = label;
      root.appendChild(lbl);
    }

    root.appendChild(btn);
    root.appendChild(drop);
    document.body.appendChild(root);

    // top-right: fica SEMPRE abaixo do #header real (altura varia com A+/safe-area do celular)
    if (ancora === "top-right") {
      const header = document.getElementById("header");
      if (header) {
        const ajustar = () => {
          if (!root.isConnected) return;
          root.style.top = Math.ceil(header.getBoundingClientRect().bottom + 6) + "px";
        };
        ajustar();
        if (window.ResizeObserver) new ResizeObserver(ajustar).observe(header);
        window.addEventListener("resize", ajustar);
      }
    }

    const overlay = document.createElement("div");
    overlay.className = "vs-fab-overlay";
    document.body.appendChild(overlay);

    function abrir()  { root.classList.add("aberto"); btn.classList.add("aberto"); }
    function fechar() { root.classList.remove("aberto"); btn.classList.remove("aberto"); }
    function toggle() { root.classList.contains("aberto") ? fechar() : abrir(); }

    btn.onclick = (e) => { e.stopPropagation(); toggle(); };
    overlay.onclick = fechar;
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") fechar(); });

    return { abrir, fechar, toggle, root };
  }

  function _preencherItens(drop, itens, root) {
    const fechar = () => root.classList.remove("aberto");
    itens.forEach((it, i) => {
      const cat = CORES[it.cat] || CORES.info;
      const wrap = document.createElement("div");
      wrap.className = "vs-fab-item";
      wrap.style.transitionDelay = `${i * 40}ms`;

      const acionar = (e) => {
        e.stopPropagation();
        fechar();
        try { it.on?.(e); } catch (err) { console.error(err); }
      };

      const lbl = document.createElement("span");
      lbl.className = "vs-fab-item-label";
      lbl.textContent = it.label;
      lbl.style.cursor = "pointer";
      lbl.onclick = acionar;            // nome também é clicável (não só o ícone)

      const ib = document.createElement("button");
      ib.className = "vs-fab-item-btn";
      ib.style.background = cat.bg;
      ib.style.borderColor = cat.border;
      ib.style.boxShadow = `0 0 14px ${cat.glow}`;
      ib.textContent = it.ico;
      ib.setAttribute("aria-label", it.label);
      ib.onclick = acionar;

      wrap.appendChild(lbl);
      wrap.appendChild(ib);
      drop.appendChild(wrap);
    });
  }

  function _retornarApi(root, btn) {
    return {
      abrir:  () => { root.classList.add("aberto");    btn.classList.add("aberto"); },
      fechar: () => { root.classList.remove("aberto"); btn.classList.remove("aberto"); },
      toggle: () => { root.classList.contains("aberto") ? root.classList.remove("aberto") : root.classList.add("aberto"); },
      root
    };
  }


  // 🧭 Rosinha GPS — bússola pirata, item padrão em todo FAB
  function _getRosinhaItem() {
    return {
      ico: "🧭", label: "Bússola — onde estou", cat: "primaria",
      on: () => _abrirRosinhaGPS()
    };
  }

  function _abrirRosinhaGPS() {
    const overlay = document.createElement('div');
    overlay.id = 'rosinha-gps-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9997;'
      + 'background:linear-gradient(160deg,rgba(5,10,20,0.95),rgba(10,20,40,0.97));'
      + 'display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;'
      + 'backdrop-filter:blur(8px)';
    overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };

    // SVG da rosa dos ventos animada
    const compassSVG = `<svg viewBox="0 0 120 120" width="90" height="90" style="margin-bottom:8px;filter:drop-shadow(0 0 16px rgba(6,182,212,0.7))">
      <defs>
        <linearGradient id="cg1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#06b6d4"/>
          <stop offset="100%" stop-color="#a855f7"/>
        </linearGradient>
        <linearGradient id="cg2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffd54f"/>
          <stop offset="100%" stop-color="#f59e0b"/>
        </linearGradient>
      </defs>
      <!-- Anel externo -->
      <circle cx="60" cy="60" r="56" fill="none" stroke="url(#cg1)" stroke-width="1.5" opacity="0.5"/>
      <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,213,79,0.25)" stroke-width="0.8"/>
      <!-- Rosa dos ventos — 8 pontas -->
      <!-- N,S pontas longas douradas -->
      <path d="M60 8 L65 55 L60 62 L55 55 Z" fill="url(#cg2)"/>
      <path d="M60 112 L65 65 L60 58 L55 65 Z" fill="#94a3b8"/>
      <!-- L,O pontas médias -->
      <path d="M112 60 L65 65 L58 60 L65 55 Z" fill="#94a3b8"/>
      <path d="M8 60 L55 65 L62 60 L55 55 Z" fill="#94a3b8"/>
      <!-- NE,NO,SE,SO pontas curtas -->
      <path d="M101 19 L67 56 L62 50 L75 37 Z" fill="rgba(6,182,212,0.7)"/>
      <path d="M19 19 L53 56 L58 50 L45 37 Z" fill="rgba(6,182,212,0.7)"/>
      <path d="M101 101 L67 64 L62 70 L75 83 Z" fill="rgba(6,182,212,0.7)"/>
      <path d="M19 101 L53 64 L58 70 L45 83 Z" fill="rgba(6,182,212,0.7)"/>
      <!-- Círculo central -->
      <circle cx="60" cy="60" r="7" fill="#0e1620" stroke="url(#cg1)" stroke-width="2"/>
      <circle cx="60" cy="60" r="3" fill="url(#cg2)"/>
      <!-- N letras -->
      <text x="60" y="6" text-anchor="middle" fill="#ffd54f" font-size="8" font-weight="800" font-family="system-ui">N</text>
      <text x="60" y="118" text-anchor="middle" fill="#94a3b8" font-size="7" font-family="system-ui">S</text>
      <text x="117" y="63" text-anchor="middle" fill="#94a3b8" font-size="7" font-family="system-ui">L</text>
      <text x="4" y="63" text-anchor="middle" fill="#94a3b8" font-size="7" font-family="system-ui">O</text>
    </svg>`;

    overlay.innerHTML = `
      <div style="background:linear-gradient(160deg,#0a1628,#0e1a2e);border:1px solid rgba(6,182,212,0.3);
        border-radius:24px;max-width:340px;width:100%;padding:24px;text-align:center;
        box-shadow:0 0 60px rgba(6,182,212,0.15),inset 0 0 0 1px rgba(255,255,255,0.04)">
        ${compassSVG}
        <h2 style="margin:0 0 2px;font-size:20px;font-weight:900;
          background:linear-gradient(90deg,#06b6d4,#a855f7,#ffd54f);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
          Rosinha</h2>
        <p style="font-size:12px;color:#64748b;margin:0 0 4px;letter-spacing:1px;text-transform:uppercase">
          Rosa dos Ventos · Bússola Pirata</p>
        <p style="font-size:13px;color:#94a3b8;margin:0 0 16px;font-style:italic">
          "Sempre em busca de algo — tesouros, ofertas e lugares inexplorados da ilha…"</p>
        <div id="rg-loc" style="background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.2);
          border-radius:12px;padding:12px;font-size:14px;color:#e5e7eb;margin-bottom:16px;min-height:50px;
          display:flex;align-items:center;justify-content:center">
          <span style="color:#64748b">🧭 Localizando…</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button onclick="location.href='/perto.html'" 
            style="background:linear-gradient(135deg,#06b6d4,#a855f7);color:#fff;border:0;
            padding:13px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;
            letter-spacing:0.3px">
            🗺️ Explorar perto de mim</button>
          <button onclick="location.href='/divulgar.html'"
            style="background:rgba(255,213,79,0.1);border:1px solid rgba(255,213,79,0.4);
            color:#ffd54f;padding:13px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer">
            📣 Divulgar & ganhar Sulis</button>
          <button onclick="(window.VSQRShow||{mostrar:()=>{}}).mostrar({titulo:'📲 Vento Sul'})"
            style="background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.4);
            color:#a855f7;padding:13px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer">
            📲 QR do app</button>
        </div>
        <button onclick="document.getElementById('rosinha-gps-overlay').remove()"
          style="margin-top:14px;background:none;border:0;color:#475569;font-size:13px;cursor:pointer">
          ✕ Fechar</button>
      </div>`;
    document.body.appendChild(overlay);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const el = document.getElementById('rg-loc');
        if (el) el.innerHTML = `<span style="color:#ffd54f">🧭</span> Localizando nome…`;
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=pt`)
          .then(r => r.json()).then(d => {
            const bairro = d.address?.suburb || d.address?.quarter || d.address?.neighbourhood || '';
            const cidade = d.address?.city || d.address?.town || d.address?.village || '';
            const el2 = document.getElementById('rg-loc');
            if (el2) el2.innerHTML =
              `<div><span style="font-size:20px">📍</span><br>`
              + `<strong>${bairro ? bairro+' — ' : ''}${cidade}</strong><br>`
              + `<span style="font-size:11px;color:#475569">${lat.toFixed(5)}, ${lng.toFixed(5)}</span></div>`;
          }).catch(() => {
            const el2 = document.getElementById('rg-loc');
            if (el2) el2.innerHTML = `📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          });
      }, () => {
        const el = document.getElementById('rg-loc');
        if (el) el.innerHTML = '<span style="color:#ef4444">⚠️ GPS não disponível</span>';
      }, { timeout: 8000 });
    }
  }

  // 📲 QR compartilhar item padrão
  function _getQRItem(url, titulo) {
    return {
      ico: "📲", label: "QR / compartilhar", cat: "navegacao",
      on: () => {
        if (window.VSQRShow) VSQRShow.mostrar({ url, titulo: titulo || '📲 Vento Sul' });
        else if (window.VSShare) VSShare.compartilhar({ url: url || location.href, titulo: titulo || 'Vento Sul', texto: 'Conheça o app de impacto social do Sul do Brasil!' });
        else { navigator.clipboard.writeText(url || location.href); alert('Link copiado!'); }
      }
    };
  }

  window.VSFab = { montar, getRosinhaItem: _getRosinhaItem, getQRItem: _getQRItem, itensPadrao, STAR_ICON };

  /* 12/08/2026 — O CRUZEIRO NA MESMA ALTURA DO TÍTULO DO LUGAR.
   * O .vs-fab-root.top-right tem top:74px fixo, mas o título de cada página cai
   * numa altura diferente: na Barra o Cruzeiro ficava ~30px ABAIXO do
   * "Barra da Lagoa", na linha do subtítulo. Aqui o centro do FAB é alinhado ao
   * centro do <h1> do lugar.
   * SÓ nas páginas de lugar (as que têm .city-header). A landing fica como está
   * — o DJ aprovou o Cruzeiro dela e não se mexe no que está bom. */
  function alinharComTituloDoLugar() {
    try {
      var p = location.pathname;
      if (p === "/" || /\/index\.html$/.test(p)) return;      // landing: não mexe
      var raiz = document.querySelector(".vs-fab-root.top-right");
      var h1 = document.querySelector(".city-header h1") || document.querySelector("main h1");
      if (!raiz || !h1) return;
      var rf = raiz.getBoundingClientRect(), rt = h1.getBoundingClientRect();
      if (!rf.height || !rt.height) return;
      var atual = parseFloat(getComputedStyle(raiz).top) || 74;
      // quanto o centro do FAB está abaixo do centro do título
      var desvio = (rf.top + rf.height / 2) - (rt.top + rt.height / 2);
      if (Math.abs(desvio) < 2) return;
      raiz.style.top = Math.max(6, atual - desvio) + "px";
    } catch (e) {}
  }
  window.VSFabAlinhar = alinharComTituloDoLugar;
  ["load"].forEach(function (ev) { window.addEventListener(ev, alinharComTituloDoLugar); });
  window.addEventListener("resize", alinharComTituloDoLugar);
  setTimeout(alinharComTituloDoLugar, 900);
  setTimeout(alinharComTituloDoLugar, 2200);

  // Automontagem: página que incluiu vs-fab.js mas nunca chamou montar() ganha
  // o FAB padrão completo da landing. NÃO roda na landing (ela monta o dela,
  // com itens de admin, mais tarde). DOMContentLoaded, nunca window.load
  // (trava em rede lenta — lição 2026-07-17).
  (function autoMontar() {
    const p = location.pathname;
    if (p === "/" || /\/index\.html$/.test(p)) return;
    const arma = () => setTimeout(() => {
      if (!window.VSFab._montado && !document.querySelector(".vs-fab-root")) {
        montar({ ancora: "top-right", itens: [] });
      }
    }, 1200);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arma);
    else arma();
  })();
})();
