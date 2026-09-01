// Vento Sul — Badge de custo IA no topo do chat
// Mostra "💸 R$X,XX · Nch (30d)" pra cada persona, somando custos_ia + llama_uso.
// Uso:
//   VSCustoBadge.attach(elContainer, "litoranea", { dias: 30 });
//   VSCustoBadge.attachAuto();   // tenta detectar containers comuns
//
// Lê RPC `custo_persona_resumo(p_persona,p_dias)`.

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VSCustoBadge = factory();
})(typeof self !== "undefined" ? self : this, function () {

  function _cfg() {
    return window.VENTOSUL_CONFIG || {
      SUPABASE_URL: "https://vdrzndgkwdpibexjkyxi.supabase.co",
      SUPABASE_ANON_JWT: ""
    };
  }

  async function consultar(persona, dias) {
    const cfg = _cfg();
    const url = `${cfg.SUPABASE_URL}/rest/v1/rpc/custo_persona_resumo`;
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "apikey": cfg.SUPABASE_ANON_JWT || "",
          "Authorization": "Bearer " + (cfg.SUPABASE_ANON_JWT || ""),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ p_persona: persona || null, p_dias: dias || 30 })
      });
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  }

  function _format(v) {
    const j = v || {};
    const brl = Number(j.brl || 0).toFixed(2).replace(".", ",");
    const ch  = Number(j.chamadas || 0);
    const tin = Number(j.tin || 0);
    const tout = Number(j.tout || 0);
    const total = tin + tout;
    const tk = total >= 1e6 ? (total/1e6).toFixed(1)+"M" : total >= 1e3 ? (total/1e3).toFixed(1)+"k" : String(total);
    return { brl, ch, tk };
  }

  function _pill(persona, dias) {
    const el = document.createElement("span");
    el.className = "vs-custo-badge";
    el.title = `Custo IA (${persona||"todas"}) · últimos ${dias||30}d`;
    el.style.cssText = "display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border-radius:14px;background:rgba(6,182,212,0.13);color:#06b6d4;font-size:11px;font-weight:600;border:1px solid rgba(6,182,212,0.3);margin-left:6px;cursor:help;font-family:system-ui,sans-serif";
    el.innerHTML = `<span style="font-size:13px">💸</span><span class="v">R$ —</span><span style="opacity:0.7">·</span><span class="c">— ch</span>`;
    return el;
  }

  async function _atualizar(el, persona, dias) {
    const data = await consultar(persona, dias);
    const { brl, ch, tk } = _format(data);
    el.querySelector(".v").textContent = `R$ ${brl}`;
    el.querySelector(".c").textContent = `${ch} ch · ${tk} tk`;
    el.dataset.persona = persona || "todas";
  }

  function attach(container, persona, opts) {
    if (!container) return null;
    const o = opts || {};
    const dias = o.dias || 30;
    const el = _pill(persona, dias);
    container.appendChild(el);
    _atualizar(el, persona, dias);
    // Re-atualiza a cada 60s
    const tId = setInterval(() => _atualizar(el, persona, dias), 60000);
    el.dataset.timerId = String(tId);
    el.addEventListener("click", () => _atualizar(el, persona, dias));
    return el;
  }

  function attachAuto() {
    if (window.__vsCustoBadgeAttached) return;
    window.__vsCustoBadgeAttached = true;
    // Containers prováveis no app
    const mapas = [
      { sel: "#litoranea-header,[data-vs-chat='litoranea']", persona: "litoranea" },
      { sel: "[data-vs-chat='aurora']",     persona: "aurora" },
      { sel: "[data-vs-chat='automata'],[data-vs-chat='professora']", persona: "automata" },
      { sel: "[data-vs-chat='comerciante'],[data-vs-chat='mordomo']", persona: "comerciante" },
      { sel: "[data-vs-chat='tutor']",      persona: "tutor" }
    ];
    for (const m of mapas) {
      document.querySelectorAll(m.sel).forEach(c => {
        if (!c.querySelector(".vs-custo-badge")) attach(c, m.persona, { dias: 30 });
      });
    }
  }

  if (typeof window !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", attachAuto);
    else attachAuto();
  }

  return { attach, attachAuto, consultar };
});
