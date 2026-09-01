/* vs-acoes-bem.js — painel "Ações do Bem": o APP inteiro vira ação do bem.
 * Cada ação real leva a uma parte do app (deep-link) e, quando feita, o Golem
 * confirma e a ação soma no coletivo (RPC faisca_por_acao, com teto/dia antifraude).
 * Auto-injeta um botão flutuante no jogo. VSAcoes.registrar(motivo,ref).
 */
(function (root) {
  const SUPA = (root.VENTOSUL_CONFIG && root.VENTOSUL_CONFIG.SUPABASE_URL) || "https://vdrzndgkwdpibexjkyxi.supabase.co";
  const ANON = "sb_publishable_UuXuHUDxe7nmhE-Z9qu-0w_1tv2IrvC";
  function jwt() { try { return JSON.parse(localStorage.getItem("vs.sb.session"))?.access_token; } catch (_) { return null; } }

  const ACOES = [
    { motivo: "comprar_local",      emoji: "🛒", nome: "Comprar de um comércio local", faiscas: 3, link: "/index.html#comercio", cta: "Ver comércios" },
    { motivo: "indicar_amigo",      emoji: "🤝", nome: "Trazer um amigo pro Vento Sul", faiscas: 5, acao: "compartilhar", cta: "Compartilhar" },
    { motivo: "ouvir_radio",        emoji: "📻", nome: "Ouvir a Rádio da Ilha", faiscas: 1, link: "/radio.html", cta: "Abrir rádio" },
    { motivo: "aprender_lugar",     emoji: "🧭", nome: "Descobrir um lugar (trilha/NPC)", faiscas: 2, acao: "guardia", cta: "Ir pra trilha" },
    { motivo: "ajudar_comerciante", emoji: "🏪", nome: "Ajudar um comerciante a aparecer", faiscas: 3, link: "/comerciante-planos.html", cta: "Como ajudar" },
    { motivo: "avaliar_honesto",    emoji: "⭐", nome: "Avaliar um lugar com honestidade", faiscas: 1, link: "/index.html#perto", cta: "Avaliar" },
  ];

  async function registrar(motivo, ref) {
    const t = jwt();
    if (!t) { toast("Entra na tua conta pra tuas ações contarem de verdade 🙂"); return null; }
    try {
      const r = await fetch(`${SUPA}/rest/v1/rpc/faisca_por_acao`, {
        method: "POST", headers: { apikey: ANON, Authorization: "Bearer " + t, "Content-Type": "application/json" },
        body: JSON.stringify({ p_motivo: motivo, p_ref: ref || null })
      });
      const d = await r.json();
      if (d && d.ok) {
        try { root.AuroraGolem && AuroraGolem.faisca(d.faiscas); } catch (_) {}
        try { const el = document.getElementById("fc-barra"); if (el && root.VSFaiscas) VSFaiscas.montar(); } catch (_) {}
        toast("⚡ +" + d.faiscas + " pontos do bem! O Golem confirmou o teu feito.");
      } else if (d && d.erro === "limite_diario") {
        toast("Já somou esses pontos hoje 🙏 volta amanhã, o bem é constante.");
      } else { toast("Faz a ação de verdade primeiro — o Golem só confirma o que é real."); }
      return d;
    } catch (_) { return null; }
  }

  function toast(m) {
    let t = document.getElementById("vs-acao-toast");
    if (!t) { t = document.createElement("div"); t.id = "vs-acao-toast"; t.style.cssText = "position:fixed;left:50%;bottom:96px;transform:translateX(-50%);background:rgba(8,15,30,.96);color:#ffe9a8;border:1px solid rgba(255,209,102,.5);border-radius:12px;padding:10px 16px;font:600 13px system-ui;z-index:100010;opacity:0;transition:opacity .25s;max-width:88vw;text-align:center"; document.body.appendChild(t); }
    t.textContent = m; t.style.opacity = "1"; clearTimeout(t._h); t._h = setTimeout(() => t.style.opacity = "0", 2800);
  }

  function fazer(a) {
    if (a.acao === "compartilhar") {
      const url = "https://vento-sul.tech"; const txt = "Vem pro Vento Sul — a Ilha no teu bolso 🌊";
      if (navigator.share) navigator.share({ title: "Vento Sul", text: txt, url }).then(() => registrar(a.motivo)).catch(() => {});
      else { try { navigator.clipboard.writeText(txt + " " + url); } catch (_) {} registrar(a.motivo); }
      return;
    }
    if (a.acao === "guardia") { fechar(); try { root.AuroraTrilha && AuroraTrilha.guardia(); } catch (_) {} return; }
    // deep-link: abre a parte do app e credita a intenção (teto/dia protege)
    registrar(a.motivo, a.link);
    setTimeout(() => { location.href = a.link; }, 500);
  }

  function abrir() {
    if (document.getElementById("acoes-modal")) return;
    const m = document.createElement("div");
    m.id = "acoes-modal";
    m.style.cssText = "position:fixed;inset:0;z-index:100005;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto";
    m.innerHTML = '<div style="background:#0e1620;border:1px solid rgba(255,209,102,.4);border-radius:16px;max-width:440px;width:100%;padding:20px;color:#e8edf5;max-height:88vh;overflow:auto">' +
      '<h2 style="margin:0 0 2px;font-size:19px;color:#ffd166">🌟 Ações do Bem</h2>' +
      '<div style="font-size:12px;color:#9fb3c8;margin-bottom:14px">Cada coisa boa que tu faz no app soma pontos do bem — pra ti e pra Barra inteira. O Golem confirma o que é de verdade.</div>' +
      ACOES.map(function (a, i) { return '<button data-i="' + i + '" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;margin:6px 0;padding:12px;border:0;border-radius:12px;background:rgba(255,255,255,.05);color:#e8edf5;cursor:pointer">' +
        '<span style="font-size:26px">' + a.emoji + '</span>' +
        '<span style="flex:1"><span style="font-weight:700;font-size:14px;display:block">' + a.nome + '</span><span style="font-size:11px;color:#9fb3c8">+' + a.faiscas + ' pontos do bem · ' + a.cta + '</span></span>' +
        '<span style="font-size:18px;color:#ffd166">⚡</span></button>'; }).join("") +
      '<button id="acoes-fechar" style="display:block;width:100%;margin-top:10px;padding:9px;border:0;border-radius:10px;background:rgba(120,120,120,.3);color:#fff;cursor:pointer">Fechar</button></div>';
    document.body.appendChild(m);
    m.querySelectorAll("button[data-i]").forEach(function (b) { b.onclick = function () { fazer(ACOES[+b.dataset.i]); }; });
    m.querySelector("#acoes-fechar").onclick = fechar;
    m.addEventListener("click", function (e) { if (e.target === m) fechar(); });
  }
  function fechar() { const m = document.getElementById("acoes-modal"); if (m) m.remove(); }

  root.VSAcoes = { registrar, abrir };

  function montar() {
    if (document.getElementById("btn-acoes") || !document.getElementById("mapa")) return;
    const b = document.createElement("button");
    b.id = "btn-acoes"; b.textContent = "🌟 Ações do Bem";
    b.style.cssText = "position:fixed;right:14px;bottom:96px;z-index:99925;padding:11px 16px;border:0;border-radius:999px;background:linear-gradient(135deg,#06d6a0,#ffd166);color:#04202c;font:800 13px system-ui;cursor:pointer;box-shadow:0 8px 22px rgba(6,214,160,.45)";
    b.onclick = abrir; document.body.appendChild(b);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar);
  else montar();
})(window);
