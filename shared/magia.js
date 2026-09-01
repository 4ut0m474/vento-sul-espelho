// shared/magia.js — camada de "feitiço" pra fazer humano grudar no app.
// Tudo opt-in: nada anima sem ser chamado. Sem libs.
// Princípios: Variable Reward + Loss Aversion + Endowed Progress + Anticipation.
window.VSMagia = (() => {
  const HAPTIC = (ms) => navigator.vibrate?.(ms);
  const PREFER_REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ─── 1. Confete canvas leve (~40 linhas) ────────────────────────────
  function confete({ partes = 60, dur = 2200, x = innerWidth/2, y = innerHeight/3 } = {}) {
    if (PREFER_REDUCE) return;
    const c = document.createElement("canvas");
    c.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999";
    c.width = innerWidth; c.height = innerHeight;
    document.body.appendChild(c);
    const ctx = c.getContext("2d");
    const cores = ["#7fd0f5","#ffd56b","#ff9b6b","#7af0ff","#81c784","#fc8eb0","#fff"];
    const ps = [];
    for (let i=0;i<partes;i++) ps.push({
      x, y, vx: (Math.random()-0.5)*8, vy: -Math.random()*9-4,
      a: Math.random()*Math.PI*2, va: (Math.random()-0.5)*0.4,
      cor: cores[Math.random()*cores.length|0],
      w: 6+Math.random()*6, h: 8+Math.random()*8, life: 1
    });
    const t0 = Date.now();
    function tick() {
      const t = Date.now()-t0;
      ctx.clearRect(0,0,c.width,c.height);
      ps.forEach(p => {
        p.vy += 0.25; p.x += p.vx; p.y += p.vy; p.a += p.va;
        p.life = Math.max(0, 1 - t/dur);
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.a);
        ctx.globalAlpha = p.life; ctx.fillStyle = p.cor;
        ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
        ctx.restore();
      });
      if (t < dur) requestAnimationFrame(tick); else c.remove();
    }
    tick();
  }

  // ─── 2. Número rolando (de A → B com easing) ─────────────────────────
  function rolar(el, de, ate, dur = 900, prefixo = "") {
    if (!el) return;
    if (PREFER_REDUCE) { el.textContent = prefixo + ate; return; }
    const t0 = performance.now();
    const ease = t => 1 - Math.pow(1-t, 3);
    function step(t) {
      const p = Math.min(1, (t - t0) / dur);
      const v = Math.round(de + (ate - de) * ease(p));
      el.textContent = prefixo + v.toLocaleString("pt-BR");
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ─── 3. Brilho passando (glint shimmer no botão) ─────────────────────
  function brilhar(el) {
    if (!el || PREFER_REDUCE) return;
    el.classList.add("vs-glint");
    setTimeout(() => el.classList.remove("vs-glint"), 1100);
  }

  // ─── 4. Celebração genérica (combina tudo) ───────────────────────────
  // tipo: 'sc' | 'plano' | 'login' | 'streak' | 'missao'
  function celebrar({ tipo = "sc", valor, elemento, mensagem } = {}) {
    HAPTIC(tipo === "plano" ? [60, 30, 60] : 25);
    const cfg = {
      sc:     { partes: 40, mensagem: mensagem || `+${valor || ""} sulis 🪙` },
      plano:  { partes: 80, mensagem: mensagem || "Plano ativado! 🎉" },
      login:  { partes: 30, mensagem: mensagem || "Bom te ver de novo 💙" },
      streak: { partes: 20, mensagem: mensagem || `${valor}🔥 dias seguidos!` },
      missao: { partes: 50, mensagem: mensagem || "Missão concluída ✨" }
    }[tipo];
    confete({ partes: cfg.partes });
    if (window.vsToast) vsToast({ tipo: "success", titulo: cfg.mensagem, dur: 3500 });
    if (elemento) brilhar(elemento);
  }

  // ─── 5. Streak diário (loss aversion) ────────────────────────────────
  function calcularStreak() {
    const hoje = new Date().toDateString();
    const dados = JSON.parse(localStorage.getItem("vs_streak") || "{}");
    if (dados.last === hoje) return dados.dias || 1;
    const ontem = new Date(Date.now() - 86400000).toDateString();
    if (dados.last === ontem) {
      dados.dias = (dados.dias || 0) + 1;
    } else if (dados.last !== hoje) {
      dados.dias = 1; // resetou
    }
    dados.last = hoje;
    localStorage.setItem("vs_streak", JSON.stringify(dados));
    return dados.dias;
  }
  function streakHoras() {
    const dados = JSON.parse(localStorage.getItem("vs_streak") || "{}");
    if (!dados.last) return 24;
    const ms = Date.now() - new Date(dados.last).getTime();
    return Math.max(0, 24 - Math.floor(ms / 3600000));
  }

  // ─── 6. Saudação personalizada (pelo horário) ────────────────────────
  function saudacao(nome) {
    const h = new Date().getHours();
    const cumprimento = h < 6 ? "Acordou cedo, " : h < 12 ? "Bom dia, " : h < 18 ? "Boa tarde, " : "Boa noite, ";
    const emoji = h < 6 ? "🌙" : h < 12 ? "☀️" : h < 18 ? "🌤️" : "🌆";
    return `${emoji} ${cumprimento}${nome || "viajante"}!`;
  }

  // ─── 7. Tease idle: passa shimmer no botão "principal" da tela ───────
  let teaseTimer = null;
  function ativarTease(seletor = "#btn-perguntar, .btn-primary[id]:not(:disabled)") {
    if (PREFER_REDUCE) return;
    clearTimeout(teaseTimer);
    teaseTimer = setTimeout(() => {
      const alvo = document.querySelector(seletor);
      if (alvo && document.visibilityState === "visible") brilhar(alvo);
      ativarTease(seletor); // reagenda
    }, 18000); // a cada 18s, sutil
  }

  // ─── 8. Anti-fix: detecta longa inatividade e anima volta ────────────
  let lastTouch = Date.now();
  ["pointerdown","touchstart","keydown","scroll"].forEach(e =>
    addEventListener(e, () => lastTouch = Date.now(), { passive: true }));

  // ─── 9. Auto-pluga em eventos do app — observa mudanças no saldo ─────
  function observarSaldo() {
    const el = document.getElementById("ws-valor") || document.querySelector(".ws-valor");
    if (!el) return;
    let ultimo = parseInt(el.textContent.replace(/\D/g, "")) || 0;
    new MutationObserver(() => {
      const novo = parseInt(el.textContent.replace(/\D/g, "")) || 0;
      if (novo > ultimo) {
        const ganho = novo - ultimo;
        rolar(el, ultimo, novo, 1200);
        if (ganho >= 1) celebrar({ tipo: "sc", valor: ganho });
      }
      ultimo = novo;
    }).observe(el, { childList: true, characterData: true, subtree: true });
  }

  // ─── 10. Quase-lá: glow amarelo em progress próximo de 100% ──────────
  function quaseLa() {
    document.querySelectorAll("[data-progresso]").forEach(el => {
      const p = parseFloat(el.dataset.progresso) || 0;
      if (p >= 90 && p < 100) el.classList.add("vs-quase-la");
      else el.classList.remove("vs-quase-la");
    });
  }

  // ─── Boot ────────────────────────────────────────────────────────────
  function boot() {
    setTimeout(observarSaldo, 1000);
    setTimeout(ativarTease, 8000);
    setInterval(quaseLa, 3000);
  }
  if (document.readyState === "complete") boot();
  else addEventListener("load", boot);

  return { confete, rolar, brilhar, celebrar, saudacao, calcularStreak, streakHoras, ativarTease, quaseLa };
})();
