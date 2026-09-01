// ui-modal.js — modais gráficos pra todo o app
// Substitui prompt/confirm/alert nativos por interface bonita e acessível.
//
// Uso:
//   vsModal({titulo, texto, campos:[{label,id,tipo,opts?,value?,placeholder?}], acoes:[{label,classe?,onClick}]})
//   vsConfirma(titulo, msg, callback, btnLabel?)
//   vsAlerta(msg, classe?)
//   vsToast(msg) — mensagem efêmera (3s) sem modal

(function() {
  if (window.vsModal) return;  // evita re-injetar

  // Estilo único injetado no head — inclui modal + botões glass globais
  const css = `
    /* ─── BOTÕES GLASS GLOBAIS (sobrescreve estilos sólidos) ─── */
    button.btn, a.btn, .btn-primary, .btn-secundario, .entrada-btn-primario, .entrada-btn-secundario {
      background: rgba(6,182,212,0.12) !important;
      color: #06b6d4 !important;
      border: 1px solid rgba(6,182,212,0.45) !important;
      backdrop-filter: blur(10px) !important;
      -webkit-backdrop-filter: blur(10px) !important;
      transition: all 0.15s !important;
      box-shadow: none !important;
    }
    button.btn:hover, a.btn:hover, .btn-primary:hover, .btn-secundario:hover {
      background: rgba(6,182,212,0.24) !important;
      transform: translateY(-1px);
    }
    button.btn:active, a.btn:active {
      background: rgba(6,182,212,0.32) !important;
    }
    /* Variantes de cor mantém o tema mas glass */
    button.btn.ai, a.btn.ai, .btn-primary.ai {
      background: rgba(168,85,247,0.12) !important;
      color: #a855f7 !important;
      border-color: rgba(168,85,247,0.45) !important;
    }
    button.btn.ai:hover { background: rgba(168,85,247,0.26) !important; }
    button.btn.good, a.btn.good {
      background: rgba(16,185,129,0.12) !important;
      color: #10b981 !important;
      border-color: rgba(16,185,129,0.45) !important;
    }
    button.btn.good:hover { background: rgba(16,185,129,0.26) !important; }
    button.btn.warn, a.btn.warn {
      background: rgba(245,158,11,0.12) !important;
      color: #f59e0b !important;
      border-color: rgba(245,158,11,0.45) !important;
    }
    button.btn.warn:hover { background: rgba(245,158,11,0.26) !important; }
    button.btn.bad, a.btn.bad, button.btn.danger {
      background: rgba(239,68,68,0.12) !important;
      color: #ef4444 !important;
      border-color: rgba(239,68,68,0.45) !important;
    }
    button.btn.bad:hover { background: rgba(239,68,68,0.26) !important; }
    /* Pills e tabs do app principal */
    .tutor-pill, button.tutor-pill {
      background: rgba(15,22,32,0.18) !important;
      backdrop-filter: blur(8px) !important;
    }
    .tutor-pill:hover, button.tutor-pill:hover {
      background: rgba(168,85,247,0.18) !important;
      border-color: #a855f7 !important;
    }
    /* Tabs gerais (admin/comerciante-pro) */
    .tabs button, .pers-tab {
      background: transparent !important;
      backdrop-filter: blur(6px);
    }
    .tabs button.on, .tabs button.active, .pers-tab.active {
      background: rgba(6,182,212,0.15) !important;
      backdrop-filter: blur(10px);
    }
    /* Filtros de template */
    .f-btn {
      background: rgba(15,22,32,0.30) !important;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(148,163,184,0.25) !important;
      color: #cbd5e1 !important;
    }
    .f-btn.act, .f-btn.active {
      background: rgba(6,182,212,0.20) !important;
      color: #06b6d4 !important;
      border-color: rgba(6,182,212,0.45) !important;
    }
    /* Inputs de form globais — sutis */
    input[type=text], input[type=email], input[type=number], input[type=tel],
    input[type=password], input[type=search], input[type=url], input[type=date],
    input[type=time], textarea, select {
      background: rgba(0,0,0,0.30);
      border: 1px solid rgba(148,163,184,0.25);
      backdrop-filter: blur(4px);
    }

    .vs-mod-bg { position:fixed; inset:0; background:rgba(0,0,0,0.78); z-index:99999; display:none; align-items:center; justify-content:center; padding:18px; backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); }
    .vs-mod-bg.on { display:flex; }
    .vs-mod-card { background:rgba(15,22,32,0.92); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid rgba(148,163,184,0.30); border-radius:14px; padding:20px; max-width:520px; width:100%; max-height:90vh; overflow-y:auto; color:#e5f6e8; position:relative; box-shadow:0 12px 40px rgba(0,0,0,0.55); }
    .vs-mod-card h3 { margin:0 0 12px; color:#06b6d4; font-size:1.15em; }
    .vs-mod-card label { display:block; font-size:0.85em; color:#94a3b8; margin:10px 0 4px; }
    .vs-mod-card input, .vs-mod-card textarea, .vs-mod-card select {
      width:100%; box-sizing:border-box; background:rgba(0,0,0,0.4); color:#e5f6e8;
      border:1px solid rgba(148,163,184,0.30); border-radius:8px; padding:10px 12px;
      font-size:1em; font-family:inherit;
    }
    .vs-mod-card input:focus, .vs-mod-card textarea:focus, .vs-mod-card select:focus {
      outline:none; border-color:#06b6d4;
    }
    .vs-mod-card textarea { min-height:80px; line-height:1.4; }
    .vs-mod-card .vs-mod-acoes { display:flex; gap:8px; justify-content:flex-end; margin-top:18px; flex-wrap:wrap; }
    .vs-mod-card button.vs-mod-btn {
      background:rgba(6,182,212,0.10); color:#06b6d4; border:1px solid rgba(6,182,212,0.45);
      padding:10px 18px; border-radius:10px; cursor:pointer; font-weight:600; font-size:0.95em;
    }
    .vs-mod-card button.vs-mod-btn:hover { background:rgba(6,182,212,0.25); }
    .vs-mod-card button.vs-mod-btn.primary { background:rgba(168,85,247,0.18); color:#a855f7; border-color:rgba(168,85,247,0.55); }
    .vs-mod-card button.vs-mod-btn.primary:hover { background:rgba(168,85,247,0.32); }
    .vs-mod-card button.vs-mod-btn.danger { background:rgba(239,68,68,0.18); color:#ef4444; border-color:rgba(239,68,68,0.55); }
    .vs-mod-card .vs-mod-fechar { position:absolute; top:14px; right:18px; background:transparent; border:0; color:#94a3b8; font-size:24px; cursor:pointer; line-height:1; }
    .vs-mod-card .vs-mod-texto { color:#cbd5e1; font-size:0.95em; line-height:1.5; margin:0 0 4px; }

    /* Toast */
    .vs-toast { position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:rgba(15,22,32,0.95); backdrop-filter:blur(14px); color:#e5f6e8; padding:12px 20px; border-radius:24px; border:1px solid rgba(148,163,184,0.25); z-index:99998; max-width:90%; box-shadow:0 8px 24px rgba(0,0,0,0.5); font-size:0.95em; opacity:0; transition:opacity 0.3s, transform 0.3s; }
    .vs-toast.on { opacity:1; transform:translateX(-50%) translateY(-4px); }
    .vs-toast.erro { border-color:#ef4444; color:#fca5a5; }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // DOM do modal
  const bg = document.createElement("div");
  bg.className = "vs-mod-bg";
  bg.id = "vs-mod-bg";
  bg.innerHTML = `<div class="vs-mod-card" id="vs-mod-card">
    <button class="vs-mod-fechar" id="vs-mod-fechar">✕</button>
    <h3 id="vs-mod-titulo"></h3>
    <div id="vs-mod-corpo"></div>
    <div class="vs-mod-acoes" id="vs-mod-acoes"></div>
  </div>`;
  // Insere no body assim que disponível
  if (document.body) document.body.appendChild(bg);
  else document.addEventListener("DOMContentLoaded", () => document.body.appendChild(bg));

  bg.addEventListener("click", (e) => { if (e.target === bg) fechar(); });
  function fechar() { bg.classList.remove("on"); }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && bg.classList.contains("on")) fechar(); });

  bg.querySelector("#vs-mod-fechar")?.addEventListener("click", fechar);

  window.vsModalFechar = fechar;

  window.vsModal = function(opts) {
    document.getElementById("vs-mod-titulo").textContent = opts.titulo || "";
    const corpo = document.getElementById("vs-mod-corpo");
    corpo.innerHTML = "";
    if (opts.texto) {
      const p = document.createElement("p");
      p.className = "vs-mod-texto";
      p.textContent = opts.texto;
      corpo.appendChild(p);
    }
    const refs = {};
    for (const c of (opts.campos || [])) {
      const wrap = document.createElement("div");
      if (c.label) {
        const l = document.createElement("label");
        l.textContent = c.label;
        l.htmlFor = "vs-mod-" + c.id;
        wrap.appendChild(l);
      }
      let inp;
      if (c.tipo === "textarea") {
        inp = document.createElement("textarea");
      } else if (c.tipo === "select") {
        inp = document.createElement("select");
        for (const o of (c.opts || [])) {
          const opt = document.createElement("option");
          if (typeof o === "string") { opt.value = o; opt.textContent = o; }
          else { opt.value = o.value; opt.textContent = o.label; }
          inp.appendChild(opt);
        }
      } else {
        inp = document.createElement("input");
        inp.type = c.tipo || "text";
      }
      inp.id = "vs-mod-" + c.id;
      if (c.placeholder) inp.placeholder = c.placeholder;
      if (c.value !== undefined && c.value !== null) inp.value = c.value;
      if (c.maxlength) inp.maxLength = c.maxlength;
      if (c.required) inp.required = true;
      wrap.appendChild(inp);
      corpo.appendChild(wrap);
      refs[c.id] = inp;
    }
    const acoesEl = document.getElementById("vs-mod-acoes");
    acoesEl.innerHTML = "";
    const acoes = opts.acoes || [{label: "OK", classe: "primary", onClick: fechar}];
    for (const a of acoes) {
      const b = document.createElement("button");
      b.className = "vs-mod-btn " + (a.classe || "");
      b.textContent = a.label;
      b.onclick = () => {
        if (typeof a.onClick === "function") {
          const v = {};
          for (const k of Object.keys(refs)) v[k] = (refs[k].type === "checkbox") ? refs[k].checked : refs[k].value;
          a.onClick(v);
        } else fechar();
      };
      acoesEl.appendChild(b);
    }
    bg.classList.add("on");
    setTimeout(() => { const k = Object.keys(refs)[0]; if (k) refs[k].focus(); }, 80);
  };

  window.vsConfirma = function(titulo, msg, acaoOk, btnOkLabel) {
    vsModal({
      titulo, texto: msg,
      acoes: [
        { label: btnOkLabel || "Confirmar", classe: "primary", onClick: () => { fechar(); acaoOk && acaoOk(); } },
        { label: "Cancelar", classe: "", onClick: fechar },
      ],
    });
  };

  window.vsAlerta = function(msg, classe) {
    vsModal({
      titulo: classe === "erro" ? "❌ Algo deu ruim" : "✓ Pronto",
      texto: msg,
      acoes: [{ label: "Fechar", classe: "primary", onClick: fechar }],
    });
  };

  // Toast efêmero
  let toastEl = null;
  window.vsToast = function(msg, classe) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "vs-toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.className = "vs-toast on" + (classe ? " " + classe : "");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => { toastEl.className = "vs-toast"; }, 3000);
  };
})();
