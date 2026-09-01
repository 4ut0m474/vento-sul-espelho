/* vs-faiscas-coletivas.js — MEDIDOR COLETIVO: "A Barra já somou X pontos do bem".
 * A comunidade inteira puxando junto pra uma meta que destrava coisas reais.
 * Lê faiscas_coletivas (anon). Somar: VSFaiscas.somar(n) (precisa login → RPC).
 * Auto-injeta uma barra no topo do #mapa (jogo) ou onde tiver data-faiscas-coletivas.
 */
(function (root) {
  const SUPA = (root.VENTOSUL_CONFIG && root.VENTOSUL_CONFIG.SUPABASE_URL) || "https://vdrzndgkwdpibexjkyxi.supabase.co";
  const ANON = "sb_publishable_UuXuHUDxe7nmhE-Z9qu-0w_1tv2IrvC";
  const REGIAO = "barra-da-lagoa";
  function jwt() { try { return JSON.parse(localStorage.getItem("vs.sb.session"))?.access_token; } catch (_) { return null; } }

  async function ler() {
    try {
      const r = await fetch(`${SUPA}/rest/v1/faiscas_coletivas?regiao=eq.${REGIAO}&select=total,meta_atual`, { headers: { apikey: ANON, Authorization: "Bearer " + ANON } });
      const a = await r.json(); return a && a[0] ? a[0] : { total: 0, meta_atual: 1000 };
    } catch (_) { return { total: 0, meta_atual: 1000 }; }
  }

  function render(el, d) {
    const pct = Math.min(100, Math.round((d.total / (d.meta_atual || 1000)) * 100));
    el.innerHTML =
      '<div style="background:linear-gradient(135deg,rgba(255,209,102,.12),rgba(6,214,160,.1));border:1px solid rgba(255,209,102,.35);border-radius:14px;padding:12px 14px;margin:10px 0">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">' +
        '<div style="font:800 15px system-ui;color:#ffd166">🔥 A Barra já somou <span id="fc-total">' + d.total.toLocaleString("pt-BR") + '</span> pontos do bem</div>' +
        '<div style="font:600 11px system-ui;color:#9fb3c8">meta: ' + (d.meta_atual || 1000).toLocaleString("pt-BR") + '</div>' +
      '</div>' +
      '<div style="height:10px;background:rgba(255,255,255,.08);border-radius:99px;margin-top:8px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#06d6a0,#ffd166);border-radius:99px;transition:width .8s"></div></div>' +
      '<div style="font:600 11px system-ui;color:#9fb3c8;margin-top:6px">faltam ' + Math.max(0, (d.meta_atual - d.total)).toLocaleString("pt-BR") + ' pra próxima conquista da comunidade ⚡ cada bem que tu faz conta pra todos</div>' +
      '</div>';
  }

  async function montar() {
    let alvo = document.querySelector("[data-faiscas-coletivas]");
    if (!alvo) {
      const mapa = document.getElementById("mapa");
      if (!mapa) return;
      alvo = document.createElement("div");
      alvo.id = "fc-barra";
      mapa.parentNode.insertBefore(alvo, mapa);
    }
    render(alvo, await ler());
  }

  async function somar(n) {
    const t = jwt();
    if (!t) return null;
    try {
      const r = await fetch(`${SUPA}/rest/v1/rpc/faisca_coletiva_somar`, {
        method: "POST", headers: { apikey: ANON, Authorization: "Bearer " + t, "Content-Type": "application/json" },
        body: JSON.stringify({ p_n: n || 1, p_regiao: REGIAO })
      });
      const d = await r.json();
      if (d && d.ok) { const el = document.getElementById("fc-barra") || document.querySelector("[data-faiscas-coletivas]"); if (el) render(el, { total: d.total, meta_atual: d.meta }); }
      return d;
    } catch (_) { return null; }
  }

  root.VSFaiscas = { ler, somar, montar };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar);
  else montar();
})(window);
