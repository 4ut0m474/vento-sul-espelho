// 💰 sulcoin-modal.js — modal "seu R$1 vai assim, ali na hora"
// Whitepaper §6: antes de cada compra de SulCoin, mostra ao user EXATAMENTE
// como o dinheiro será distribuído nos 5 pools da fase atual.
//
// Uso:
//   await sulcoinDestinoModal({
//     valorCentavos: 1000,                // R$ 10,00
//     regionId: "floripa-sc",             // opcional, default
//     onConfirm: async (auditoria) => { … },  // chamado se user concordar
//     onCancel: () => { … }               // opcional
//   });
//
// Visual: cards glass + accent dourado (padrão Carteira v6 / dashboard admin).

(function (root) {
  if (root.sulcoinDestinoModal) return;

  const SUPA = root.VSSupabase || null;

  // CSS isolado pra não conflitar com a página hospedeira.
  function injetarCSS() {
    if (document.getElementById("sc-modal-css")) return;
    const s = document.createElement("style");
    s.id = "sc-modal-css";
    s.textContent = `
      .sc-bg { position:fixed; inset:0; background:rgba(8,11,16,.85); backdrop-filter:blur(8px);
               z-index:9998; display:none; align-items:center; justify-content:center; padding:18px; }
      .sc-bg.on { display:flex; }
      .sc-card { width:min(560px,100%); max-height:90vh; overflow:auto;
                 background:linear-gradient(180deg,#131a23 0%,#0a0e14 100%);
                 border:1px solid rgba(251,191,36,.4); border-radius:16px;
                 box-shadow:0 20px 60px rgba(0,0,0,.6); padding:22px;
                 color:#e5e7eb; font-family:system-ui,-apple-system,sans-serif; }
      .sc-titulo { font-size:20px; font-weight:800; margin-bottom:4px;
                   background:linear-gradient(90deg,#fbbf24,#06b6d4);
                   -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .sc-sub { color:#94a3b8; font-size:13px; margin-bottom:14px; }
      .sc-fase { background:rgba(16,185,129,.12); border:1px solid rgba(16,185,129,.5);
                 border-radius:10px; padding:10px 14px; margin:10px 0; font-size:13px; color:#a7f3d0; }
      .sc-total { background:rgba(251,191,36,.10); border:1px solid rgba(251,191,36,.45);
                  border-radius:10px; padding:14px; margin-bottom:12px; text-align:center; }
      .sc-total .v { font-size:30px; font-weight:800; color:#fbbf24; }
      .sc-total .l { font-size:11px; color:#94a3b8; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:2px; }
      .sc-pool-list { display:grid; gap:8px; margin:12px 0 14px; }
      .sc-pool { display:flex; align-items:center; justify-content:space-between;
                 background:rgba(255,255,255,.04); border:1px solid #1f2937; border-radius:10px;
                 padding:10px 14px; gap:10px; }
      .sc-pool.zero, .sc-grupo.zero, .sc-sub.zero { opacity:.45; }
      .sc-pool-l { flex:1; min-width:0; }
      .sc-pool-nome { font-weight:700; font-size:14px; color:#e5e7eb; }
      .sc-pool-desc { font-size:11px; color:#94a3b8; line-height:1.3; }
      .sc-pool-r { text-align:right; flex-shrink:0; }
      .sc-pool-pct { font-size:11px; color:#94a3b8; text-transform:uppercase; }
      .sc-pool-val { font-size:18px; font-weight:800; color:#06b6d4; }
      .sc-pool.zero .sc-pool-val { color:#475569; }
      .sc-grupo { background:rgba(168,85,247,.08); border:1px solid rgba(168,85,247,.35);
                  border-radius:10px; padding:10px 14px; }
      .sc-grupo-h { display:flex; justify-content:space-between; gap:10px; align-items:center; }
      .sc-grupo-l { flex:1; min-width:0; }
      .sc-grupo-nome { font-weight:800; font-size:14px; color:#e5e7eb; }
      .sc-sub-list { display:grid; gap:6px; margin:10px 0 0 16px; padding-left:10px;
                     border-left:2px solid rgba(168,85,247,.4); }
      .sc-sub { display:flex; align-items:center; justify-content:space-between;
                background:rgba(255,255,255,.025); border-radius:8px; padding:7px 10px; gap:10px; }
      .sc-sub .sc-pool-nome { font-size:13px; font-weight:600; }
      .sc-sub .sc-pool-val { font-size:15px; }
      .sc-sub .sc-pool-pct { font-size:10px; }
      .sc-acoes { display:flex; gap:10px; flex-wrap:wrap; }
      .sc-btn { flex:1; min-width:140px; padding:14px 18px; border:0; border-radius:12px;
                font-weight:700; font-size:15px; cursor:pointer; font-family:inherit; transition:all .15s; }
      .sc-btn.primary { background:linear-gradient(135deg,#10b981,#06b6d4); color:#fff; }
      .sc-btn.primary:hover { filter:brightness(1.1); }
      .sc-btn.ghost { background:transparent; color:#94a3b8; border:1px solid #1f2937; }
      .sc-btn:disabled { opacity:.5; cursor:wait; }
      .sc-erro { background:rgba(239,68,68,.10); border:1px solid #ef4444; color:#fca5a5;
                 padding:10px 14px; border-radius:10px; margin:10px 0; font-size:13px; }
      .sc-link { color:#06b6d4; font-size:12px; text-decoration:none; margin-top:8px; display:inline-block; }
      .sc-link:hover { text-decoration:underline; }
    `;
    document.head.appendChild(s);
  }

  // Pools principais (topo)
  const POOL_LABELS = {
    fundador:            { nome: "Fundador",                emoji: "👤", desc: "Sustento mínimo de quem mantém o app no ar" },
    app:                 { nome: "App rodando (infra+IA)",  emoji: "⚙️", desc: "VPS regional, Ollama local, XTTS, jobs" },
    promocoes_devolucao: { nome: "Volta pra você",          emoji: "🎁", desc: "Cashback direto pros users (Fase 3+)" },
  };

  // Sub-pools agrupados por categoria-pai
  const SUB_LABELS = {
    propaganda_radio:         { nome: "Rádio Vento Sul",       emoji: "📻", desc: "Alcance regional, comerciantes locais" },
    propaganda_jogo:          { nome: "Jogo Aurora",           emoji: "✨", desc: "Engaja jovens, traz desbravadores" },
    propaganda_redes_sociais: { nome: "Redes sociais",         emoji: "📱", desc: "Desbravadores postam, viralizam comércio" },
    premios_missoes_sociais:  { nome: "Missões sociais",       emoji: "🎯", desc: "Recompensa quem ajuda a crescer (desbravadores)" },
    premios_quests_jogo:      { nome: "Quests Vivas Aurora",   emoji: "⚔️", desc: "Impacto regional via jogo (riacho, dengue, etc)" },
    premios_assistir_video:   { nome: "Assistir vídeo",        emoji: "🎬", desc: "Engagement: ver conteúdo curado vira SC" },
  };

  const GRUPOS_PAI = {
    propaganda: { nome: "Propaganda regional", emoji: "📢", desc: "Cada serviço puxa um tipo de gente. Sem nenhum, o motor trava.",
                  filhos: ["propaganda_radio","propaganda_jogo","propaganda_redes_sociais"] },
    premios:    { nome: "Prêmios", emoji: "🎯", desc: "Recompensa pra quem move a rede.",
                  filhos: ["premios_missoes_sociais","premios_quests_jogo","premios_assistir_video"] },
  };

  function fmtR$(centavos) {
    return "R$ " + (Number(centavos || 0) / 100).toFixed(2).replace(".", ",");
  }

  async function chamarAuditoria(valorCentavos, regionId, userUuid) {
    const params = { p_valor_centavos: valorCentavos, p_region_id: regionId };
    if (userUuid) params.p_user_uuid = userUuid;
    if (SUPA && typeof SUPA.rpc === "function") {
      return SUPA.rpc("auditoria_destino_real", params);
    }
    const url = (root.SUPABASE_URL || "https://vdrzndgkwdpibexjkyxi.supabase.co") + "/rest/v1/rpc/auditoria_destino_real";
    const key = root.SUPABASE_ANON || root.ANON || "";
    const r = await fetch(url, {
      method: "POST",
      headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!r.ok) throw new Error("auditoria_destino_real HTTP " + r.status);
    return r.json();
  }

  function linhaSimples(k, p) {
    const lbl = POOL_LABELS[k] || { nome: k, emoji: "•", desc: "" };
    const cls = p.centavos > 0 ? "" : "zero";
    return `<div class="sc-pool ${cls}">
      <div class="sc-pool-l">
        <div class="sc-pool-nome">${lbl.emoji} ${lbl.nome}</div>
        <div class="sc-pool-desc">${lbl.desc}</div>
      </div>
      <div class="sc-pool-r">
        <div class="sc-pool-pct">${p.pct}%</div>
        <div class="sc-pool-val">${fmtR$(p.centavos)}</div>
      </div>
    </div>`;
  }

  function bloco(grupoKey, dest) {
    const g = GRUPOS_PAI[grupoKey];
    // Total agregado do pai = soma centavos dos filhos
    const totalC = g.filhos.reduce((s, f) => s + Number(dest[f]?.centavos || 0), 0);
    const pctGlobalTotal = g.filhos.reduce((s, f) => s + Number(dest[f]?.pct_global || 0), 0);
    const cls = totalC > 0 ? "" : "zero";
    const filhos = g.filhos.map(f => {
      const p = dest[f] || { pct_interno: 0, centavos: 0 };
      const lbl = SUB_LABELS[f] || { nome: f, emoji: "•", desc: "" };
      const fcls = p.centavos > 0 ? "" : "zero";
      return `<div class="sc-sub ${fcls}">
        <div class="sc-pool-l">
          <div class="sc-pool-nome">${lbl.emoji} ${lbl.nome}</div>
          <div class="sc-pool-desc">${lbl.desc}</div>
        </div>
        <div class="sc-pool-r">
          <div class="sc-pool-pct">${p.pct_interno}% interno</div>
          <div class="sc-pool-val">${fmtR$(p.centavos)}</div>
        </div>
      </div>`;
    }).join("");
    return `<div class="sc-grupo ${cls}">
      <div class="sc-grupo-h">
        <div class="sc-grupo-l">
          <div class="sc-grupo-nome">${g.emoji} ${g.nome}</div>
          <div class="sc-pool-desc">${g.desc}</div>
        </div>
        <div class="sc-pool-r">
          <div class="sc-pool-pct">${pctGlobalTotal.toFixed(0)}% total</div>
          <div class="sc-pool-val" style="color:#fbbf24">${fmtR$(totalC)}</div>
        </div>
      </div>
      <div class="sc-sub-list">${filhos}</div>
    </div>`;
  }

  function montarCard(aud) {
    const wrap = document.createElement("div");
    wrap.className = "sc-card";
    const dest = aud.destino || {};
    const origem = aud.alocacao_origem || "default_fase";
    const origemHTML = origem === "user_pref"
      ? `<span style="color:#fbbf24">tua escolha</span> em vigor · <a class="sc-link" href="/minhas-alocacoes.html" style="display:inline">editar →</a>`
      : `usando <strong>default</strong> da fase · <a class="sc-link" href="/minhas-alocacoes.html" style="display:inline">tu pode customizar →</a>`;
    wrap.innerHTML = `
      <div class="sc-titulo">💰 Seu dinheiro vai assim, ali na hora</div>
      <div class="sc-sub">Auditoria viva — sem promessa, sem caixa-preta. Direto na sua tela.</div>
      <div class="sc-fase">🌱 Fase ${aud.fase} — <strong>${aud.fase_nome}</strong> · região <strong>${aud.region_id}</strong></div>
      <div class="sc-fase" style="background:rgba(168,85,247,.10);border-color:rgba(168,85,247,.45);color:#ddd">🎚️ Alocação: ${origemHTML}</div>
      <div class="sc-total">
        <div class="l">Você está convertendo</div>
        <div class="v">${fmtR$(aud.valor_total_centavos)}</div>
      </div>
      <div class="sc-pool-list">
        ${linhaSimples("fundador", dest.fundador || {pct:0,centavos:0})}
        ${linhaSimples("app", dest.app || {pct:0,centavos:0})}
        ${linhaSimples("promocoes_devolucao", dest.promocoes_devolucao || {pct:0,centavos:0})}
        ${bloco("propaganda", dest)}
        ${bloco("premios", dest)}
      </div>
      <p style="font-size:12px;color:#94a3b8;margin:6px 0 0;line-height:1.5">
        Cada serviço puxa um tipo de gente. Sem nenhum deles, o app não cresce.
      </p>
      <a class="sc-link" href="/transparencia.html#pools" target="_blank" rel="noopener">📊 Ver saldos vivos dos 9 pools →</a>
      <div class="sc-acoes" style="margin-top:14px">
        <button class="sc-btn ghost" data-act="cancelar">Cancelar</button>
        <button class="sc-btn primary" data-act="confirmar">✓ Concordo, gerar SulCoin</button>
      </div>
    `;
    return wrap;
  }

  function montarErro(msg) {
    const wrap = document.createElement("div");
    wrap.className = "sc-card";
    wrap.innerHTML = `
      <div class="sc-titulo">⚠️ Não consegui ler a auditoria</div>
      <div class="sc-erro">${msg}</div>
      <div class="sc-acoes" style="margin-top:14px">
        <button class="sc-btn ghost" data-act="cancelar">Fechar</button>
      </div>
    `;
    return wrap;
  }

  root.sulcoinDestinoModal = async function ({ valorCentavos, regionId = "floripa-sc", userUuid = null, onConfirm, onCancel } = {}) {
    if (!Number.isFinite(valorCentavos) || valorCentavos <= 0) {
      throw new Error("valorCentavos inválido");
    }
    injetarCSS();

    let bg = document.getElementById("sc-modal-bg");
    if (!bg) {
      bg = document.createElement("div");
      bg.id = "sc-modal-bg";
      bg.className = "sc-bg";
      document.body.appendChild(bg);
    }
    bg.innerHTML = "";

    function fechar() { bg.classList.remove("on"); }

    let aud;
    try {
      aud = await chamarAuditoria(valorCentavos, regionId, userUuid);
    } catch (e) {
      bg.appendChild(montarErro(String(e?.message || e)));
      bg.classList.add("on");
      bg.querySelector('[data-act="cancelar"]').onclick = () => { fechar(); onCancel && onCancel(); };
      return null;
    }

    const card = montarCard(aud);
    bg.appendChild(card);
    bg.classList.add("on");

    return new Promise((resolve) => {
      card.querySelector('[data-act="cancelar"]').onclick = () => {
        fechar();
        onCancel && onCancel();
        resolve(null);
      };
      card.querySelector('[data-act="confirmar"]').onclick = async (ev) => {
        const btn = ev.currentTarget;
        btn.disabled = true;
        btn.textContent = "Processando…";
        try {
          if (onConfirm) await onConfirm(aud);
          fechar();
          resolve(aud);
        } catch (e) {
          btn.disabled = false;
          btn.textContent = "Tentar de novo";
          const err = document.createElement("div");
          err.className = "sc-erro";
          err.textContent = String(e?.message || e);
          card.insertBefore(err, card.querySelector(".sc-acoes"));
        }
      };
    });
  };
})(typeof self !== "undefined" ? self : this);
