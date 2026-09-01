/* vs-pagar-suli.js — usuário paga o COMERCIANTE em SulCoin, fácil.
 * VSPagarSuli.abrir(donoUuid, nomeLoja) → modal valor + confirma (RPC transferir_sulis, antifraude no banco).
 * VSPagarSuli.botaoBarraca(barracaId) → botão que resolve o dono e paga. */
(function (root) {
  const SUPA = "https://vdrzndgkwdpibexjkyxi.supabase.co";
  const ANON = "sb_publishable_UuXuHUDxe7nmhE-Z9qu-0w_1tv2IrvC";
  function sess() { try { return JSON.parse(localStorage.getItem("vs.sb.session")); } catch (_) { return null; } }

  async function saldo(tok) {
    try {
      const r = await fetch(`${SUPA}/rest/v1/sc_wallets?select=saldo_livre_sulis`, { headers: { apikey: ANON, Authorization: "Bearer " + tok } });
      const a = await r.json(); return a?.[0]?.saldo_livre_sulis ?? 0;
    } catch (_) { return 0; }
  }
  async function donoDaBarraca(barracaId) {
    try {
      const r = await fetch(`${SUPA}/rest/v1/feira_barracas?id=eq.${barracaId}&select=dono_uuid,nome`, { headers: { apikey: ANON, Authorization: "Bearer " + ANON } });
      return (await r.json())?.[0] || null;
    } catch (_) { return null; }
  }

  function abrir(donoUuid, nomeLoja) {
    const s = sess();
    if (!s?.access_token) { alert("Entra na tua conta pra pagar com SulCoin."); return; }
    if (!donoUuid) { alert("Loja sem carteira ainda."); return; }
    const m = document.createElement("div");
    m.id = "vs-suli-modal";
    m.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;z-index:100000;padding:16px";
    m.innerHTML = `<div style="background:#0e1620;border:1px solid #1f2937;border-radius:16px;max-width:380px;width:100%;padding:22px;color:#e5e7eb;text-align:center">
      <h2 style="margin:0 0 4px;font-size:19px">💠 Pagar ${nomeLoja || "o comerciante"}</h2>
      <p style="font-size:13px;color:#94a3b8;margin:0 0 14px">Teu saldo: <b id="suli-saldo">…</b> sulis</p>
      <input id="suli-valor" type="number" min="1" inputmode="numeric" placeholder="Quantos sulis?" style="width:100%;padding:12px;font-size:18px;text-align:center;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#fff">
      <input id="suli-msg" type="text" maxlength="80" placeholder="Recado (opcional)" style="width:100%;padding:10px;font-size:13px;margin-top:8px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.04);color:#e5e7eb">
      <button id="suli-btn" style="margin-top:12px;width:100%;padding:13px;border:0;border-radius:10px;background:linear-gradient(135deg,#0d723e,#059669);color:#fff;font-weight:800;font-size:15px;cursor:pointer">💠 Pagar com SulCoin</button>
      <div id="suli-status" style="font-size:13px;color:#94a3b8;margin-top:10px"></div>
      <button onclick="document.getElementById('vs-suli-modal').remove()" style="margin-top:8px;width:100%;padding:8px;border:0;border-radius:10px;background:rgba(120,120,120,.3);color:#fff;cursor:pointer">Cancelar</button>
    </div>`;
    document.body.appendChild(m);
    saldo(s.access_token).then((v) => { const e = document.getElementById("suli-saldo"); if (e) e.textContent = v; });
    document.getElementById("suli-btn").onclick = async () => {
      const val = parseInt(document.getElementById("suli-valor").value, 10);
      const msg = document.getElementById("suli-msg").value.trim();
      const st = document.getElementById("suli-status");
      if (!val || val <= 0) { st.textContent = "Coloca quantos sulis."; return; }
      st.textContent = "⏳ Enviando…";
      try {
        const r = await fetch(`${SUPA}/rest/v1/rpc/transferir_sulis`, {
          method: "POST",
          headers: { apikey: ANON, Authorization: "Bearer " + s.access_token, "Content-Type": "application/json" },
          body: JSON.stringify({ p_para_user_id: donoUuid, p_sulis: val, p_mensagem: msg || null })
        });
        const d = await r.json();
        if (r.ok && (typeof d === "string" || d?.id || d === null)) {
          st.innerHTML = "✅ <b style='color:#34d399'>Pago! " + val + " sulis pro comerciante.</b>";
          if (root.VSFalar) root.VSFalar.falar("Pagamento feito! " + val + " sulis enviados. Obrigado por circular o bem na tua comunidade.");
          setTimeout(() => document.getElementById("vs-suli-modal")?.remove(), 2600);
        } else {
          st.textContent = "⚠️ " + (d?.message || d?.hint || "Não rolou. Confere teu saldo.");
        }
      } catch (e) { st.textContent = "Erro: " + (e.message || e); }
    };
  }

  async function botaoBarraca(barracaId) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = "💠 Pagar com SulCoin";
    b.style.cssText = "display:block;margin:12px auto 0;padding:12px 22px;border:0;border-radius:999px;background:linear-gradient(135deg,#0d723e,#059669);color:#fff;font:800 15px system-ui;cursor:pointer;box-shadow:0 8px 22px rgba(5,150,105,.4)";
    b.onclick = async () => {
      b.textContent = "…";
      const d = await donoDaBarraca(barracaId);
      b.textContent = "💠 Pagar com SulCoin";
      if (d?.dono_uuid) abrir(d.dono_uuid, d.nome);
      else alert("Essa loja ainda não tem carteira SulCoin ativa.");
    };
    return b;
  }
  root.VSPagarSuli = { abrir, botaoBarraca };
})(window);
