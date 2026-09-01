/* aurora-trilha-secreta.js — MOTOR DE NPCs GEO do jogo Aurora.
 * Cada NPC real (figurinha carimbada da Barra) fica num lugar real. Quando o
 * jogador CHEGA (GPS, raio ~60m), abre uma TELA diferente: mensagem do NPC +
 * CHARADA. Acertou → soma os pontos do lugar (recompensa) + revela o fantasioso.
 * Só ativa NPC com consentido:true (respeito à pessoa real). Voz via Golem/VSFalar.
 * NPCs editáveis: localStorage aurora_npcs (senão usa DEFAULT). Admin marca no local (?admin=1).
 */
(function (root) {
  const LS_NPCS = "aurora_npcs";
  const LS_FEITOS = "aurora_npcs_feitos";

  const DEFAULT = [
    { id: "guardia-trilha", emoji: "👵", npc: "A Guardiã da Trilha",
      lat: -27.5746, lng: -48.4267, raio: 60,
      lugar_real: "Trilha da Barra da Lagoa", lugar_fantasia: "O Caminho do Saber Guardado",
      intro: "Eu moro aqui na boca da trilha faz muitos anos. Essa trilha leva a um caminho secreto — só chega quem caminha de verdade, e leva o que aprendeu: o estudo é a única coisa que ninguém te tira.",
      mensagem: "Tu chegaste, viajante. O ar aqui é outro. Antes do portal abrir, responde o que eu te pergunto.",
      charada: { pergunta: "Qual é a única coisa que ninguém pode te tirar?", resposta: ["conhecimento", "estudo", "sabedoria", "aprender", "saber"], dica: "a velhinha da trilha vive dizendo isso..." },
      lore: "No fim desta trilha, onde a mata encontra o mar, fica guardado o que os antigos daqui sabiam. Só chega quem caminha de verdade.",
      consentido: true },
  ];

  let NPCS_DB = [];
  const SUPA_NPC = (root.VENTOSUL_CONFIG && root.VENTOSUL_CONFIG.SUPABASE_URL) || "https://vdrzndgkwdpibexjkyxi.supabase.co";
  const ANON_NPC = "sb_publishable_UuXuHUDxe7nmhE-Z9qu-0w_1tv2IrvC";
  async function carregarNpcs() {
    try {
      const r = await fetch(SUPA_NPC + "/rest/v1/npcs_geo?select=*&ativo=eq.true&modo=in.(jogo,ambos)", { headers: { apikey: ANON_NPC, Authorization: "Bearer " + ANON_NPC } });
      const arr = await r.json();
      if (Array.isArray(arr) && arr.length) {
        NPCS_DB = arr.map(function (n) {
          return { id: n.slug || n.id, emoji: n.emoji || "🧙", npc: n.npc, lat: +n.lat, lng: +n.lng, raio: n.raio || 70,
            lugar_real: n.lugar_real, lugar_fantasia: n.lugar_fantasia, intro: n.intro, mensagem: n.mensagem, lore: n.lore,
            charada: n.charada_pergunta ? { pergunta: n.charada_pergunta, resposta: (n.charada_resposta || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean), dica: n.charada_dica || "" } : null,
            consentido: true };
        });
      }
    } catch (_) {}
  }
  function npcs() {
    if (NPCS_DB.length) return NPCS_DB;
    try { return JSON.parse(localStorage.getItem(LS_NPCS)) || DEFAULT; } catch (_) { return DEFAULT; }
  }
  function feitos() { try { return JSON.parse(localStorage.getItem(LS_FEITOS)) || []; } catch (_) { return []; } }
  function marcarFeito(id) { const f = feitos(); if (!f.includes(id)) { f.push(id); localStorage.setItem(LS_FEITOS, JSON.stringify(f)); } }
  function ativos() { return npcs().filter(n => n.consentido && n.lat && n.lng); }

  function dist(a, b, c, d) {
    const R = 6371000, r = Math.PI / 180;
    const x = (c - a) * r, y = (d - b) * r;
    const h = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function norm(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, "").trim(); }
  function falar(t) { try { root.AuroraGolem ? root.AuroraGolem.fala(t) : root.VSFalar?.falar?.(t); } catch (_) {} }

  // ── Vigia GPS de TODOS os NPCs ativos ──
  let watchId = null;
  function iniciarVigia() {
    if (!navigator.geolocation || watchId) return;
    watchId = navigator.geolocation.watchPosition((pos) => {
      const done = feitos();
      let maisPerto = null, dmin = Infinity;
      ativos().forEach((n) => {
        const d = dist(pos.coords.latitude, pos.coords.longitude, n.lat, n.lng);
        if (d < dmin) { dmin = d; maisPerto = n; }
        if (d <= (n.raio || 60) && !done.includes(n.id) && !document.getElementById("npc-tela")) abrirNpc(n);
      });
      if (maisPerto) bussola(dmin, maisPerto);
    }, () => {}, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
  }
  function bussola(d, n) {
    let b = document.getElementById("npc-bussola");
    if (!b) { b = document.createElement("div"); b.id = "npc-bussola"; b.style.cssText = "position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:99920;background:rgba(8,15,30,.94);border:1px solid rgba(255,209,102,.5);border-radius:999px;padding:8px 16px;font:700 13px system-ui;color:#ffd166;box-shadow:0 6px 20px rgba(0,0,0,.5)"; document.body.appendChild(b); }
    b.textContent = n.emoji + " " + n.lugar_fantasia + " · " + (d >= 1000 ? (d / 1000).toFixed(1) + " km" : Math.round(d) + " m");
  }

  // ── Tela do NPC ao chegar: mensagem + charada ──
  function abrirNpc(n) {
    const bus = document.getElementById("npc-bussola"); if (bus) bus.remove();
    const t = document.createElement("div");
    t.id = "npc-tela";
    t.style.cssText = "position:fixed;inset:0;z-index:100000;background:radial-gradient(circle at 50% 25%,#1a2a4a,#050810 72%);overflow:auto;color:#e8edf5;font-family:system-ui;padding:26px 18px;text-align:center";
    const temCharada = n.charada && n.charada.pergunta;
    t.innerHTML =
      '<div style="font-size:54px;margin-top:10px">' + (n.emoji || "🗿") + '</div>' +
      '<h1 style="font-size:22px;color:#ffd166;margin:6px 0 2px">' + n.npc + '</h1>' +
      '<div style="font-size:12px;color:#9fb3c8;margin-bottom:10px">tu chegaste a ' + n.lugar_real + '</div>' +
      '<p style="max-width:520px;margin:8px auto;font-size:14px;line-height:1.6;color:#cbd5e1">' + (n.mensagem || "") + '</p>' +
      (temCharada
        ? '<div style="max-width:460px;margin:16px auto;background:rgba(255,255,255,.05);border:1px solid rgba(255,209,102,.3);border-radius:14px;padding:16px">' +
          '<div style="font-weight:700;color:#ffd166;font-size:15px;margin-bottom:10px">🧩 ' + n.charada.pergunta + '</div>' +
          '<input id="npc-resp" placeholder="tua resposta" style="width:100%;padding:11px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#fff;font-size:15px;text-align:center">' +
          '<div id="npc-fb" style="font-size:12px;color:#9fb3c8;margin-top:8px;min-height:16px"></div>' +
          '<button id="npc-ok" style="margin-top:8px;width:100%;padding:12px;border:0;border-radius:10px;background:linear-gradient(135deg,#06d6a0,#ffd166);color:#04202c;font-weight:800;cursor:pointer">Responder</button>' +
          '</div>'
        : '<button onclick="AuroraTrilha._revelar(' + "'" + n.id + "'" + ')" style="margin:14px auto;padding:13px 26px;border:0;border-radius:999px;background:linear-gradient(135deg,#06d6a0,#ffd166);color:#04202c;font:800 15px system-ui;cursor:pointer">⚡ Abrir o portal</button>') +
      '<button onclick="document.getElementById(\'npc-tela\').remove()" style="display:block;margin:16px auto 0;padding:8px 18px;border:0;border-radius:999px;background:rgba(120,120,120,.35);color:#fff;cursor:pointer">Voltar ao mundo real</button>';
    document.body.appendChild(t);
    falar((n.mensagem || "") + (temCharada ? " " + n.charada.pergunta : ""));
    if (temCharada) {
      const ok = () => {
        const val = norm(document.getElementById("npc-resp").value);
        const certas = (n.charada.resposta || []).map(norm);
        const fb = document.getElementById("npc-fb");
        if (certas.some(c => c && (val === c || val.includes(c)))) { revelar(n); }
        else { fb.textContent = "Não é essa... " + (n.charada.dica ? "💡 " + n.charada.dica : "tenta de novo."); }
      };
      document.getElementById("npc-ok").onclick = ok;
      document.getElementById("npc-resp").addEventListener("keydown", e => { if (e.key === "Enter") ok(); });
    }
  }

  function revelar(n) {
    marcarFeito(n.id);
    const t = document.getElementById("npc-tela"); if (!t) return;
    const pontos = [
      { e: "🌟", n: "Fonte da Mata", d: "água que nasce ali e desce pro mar" },
      { e: "🪨", n: "A Pedra do Mirante", d: "de cima se vê a Barra inteira" },
      { e: "🌳", n: "Árvore da Memória", d: "guarda o que ninguém te tira" },
      { e: "🌊", n: "Coração do Caminho", d: "onde a mata encontra o mar" },
    ];
    t.innerHTML =
      '<div style="font-size:56px;animation:portal 3s ease-in-out infinite">🌀</div>' +
      '<h1 style="font-size:24px;color:#ffd166;margin:8px 0 2px;text-shadow:0 0 18px rgba(255,209,102,.6)">✨ ' + n.lugar_fantasia + ' ✨</h1>' +
      '<div style="font-size:12px;color:#9fb3c8;margin-bottom:6px">o portal se abriu — ' + n.lugar_real + '</div>' +
      '<p style="max-width:520px;margin:10px auto;font-size:14px;line-height:1.6;color:#cbd5e1">' + (n.lore || "") + '</p>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;max-width:560px;margin:18px auto">' +
      pontos.map(p => '<div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,209,102,.25);border-radius:14px;padding:14px"><div style="font-size:30px">' + p.e + '</div><div style="font-weight:700;color:#ffd166;font-size:14px;margin-top:4px">' + p.n + '</div><div style="font-size:11px;color:#9fb3c8;margin-top:2px">' + p.d + '</div></div>').join("") +
      '</div>' +
      '<button onclick="document.getElementById(\'npc-tela\').remove()" style="display:block;margin:8px auto 0;padding:11px 24px;border:0;border-radius:999px;background:linear-gradient(135deg,#06d6a0,#ffd166);color:#04202c;font:800 14px system-ui;cursor:pointer">⚡ Levar o que aprendi</button>' +
      '<style>@keyframes portal{0%,100%{transform:rotate(0) scale(1)}50%{transform:rotate(180deg) scale(1.15)}}</style>';
    try { root.AuroraGolem && AuroraGolem.faisca(1); } catch (_) {}
    falar("Certa resposta. O portal se abriu — bem-vindo a " + n.lugar_fantasia + ". Tu caminhaste de verdade e somou os pontos deste lugar. Isso ninguém te tira.");
  }

  // ── Admin (?admin=1): marcar NPC aqui, com consentimento ──
  function marcarAqui() {
    if (!navigator.geolocation) return alert("Sem GPS.");
    navigator.geolocation.getCurrentPosition((pos) => {
      const consent = confirm("⚠️ CONSENTIMENTO: a pessoa real deste NPC concordou em ser personagem do jogo?\n\nOK = sim, concordou. Cancelar = ainda não (fica inativo).");
      const npc = prompt("Nome do NPC (personagem):", "") || "NPC";
      const lr = prompt("Nome REAL do lugar:", "") || "";
      const lf = prompt("Nome FANTASIOSO do lugar:", "") || lr;
      const msg = prompt("Mensagem do NPC ao chegar:", "") || "";
      const perg = prompt("Charada/pergunta (deixe vazio p/ sem charada):", "") || "";
      const resp = perg ? (prompt("Resposta(s) certa(s), separadas por vírgula:", "") || "") : "";
      const lore = prompt("Lore (história do lugar fantasioso):", "") || "";
      const lista = npcs();
      const novo = { id: "npc-" + Date.now(), emoji: "🧙", npc, lat: pos.coords.latitude, lng: pos.coords.longitude, raio: 60,
        lugar_real: lr, lugar_fantasia: lf, mensagem: msg, lore, consentido: !!consent };
      if (perg) novo.charada = { pergunta: perg, resposta: resp.split(",").map(x => x.trim()).filter(Boolean), dica: "" };
      lista.push(novo);
      localStorage.setItem(LS_NPCS, JSON.stringify(lista));
      alert("📍 NPC marcado aqui!\n" + npc + " · " + lf + "\n" + (consent ? "✅ consentido (ativo)" : "⏸️ sem consentimento (inativo até liberar)") + "\n(" + novo.lat.toFixed(5) + ", " + novo.lng.toFixed(5) + ")");
    }, () => alert("Não consegui pegar a localização."), { enableHighAccuracy: true });
  }

  // ── Guardiã: card de intro + inicia a busca ──
  function guardia() {
    const n = ativos()[0] || DEFAULT[0];
    const dlg = document.getElementById("modal-dialog"), mod = document.getElementById("modal");
    const wrap = dlg || (function () { const d = document.createElement("div"); d.id = "guardia-fb"; d.style.cssText = "position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:16px"; document.body.appendChild(d); return d; })();
    wrap.innerHTML = '<div style="background:#0e1620;border:1px solid rgba(255,209,102,.4);border-radius:16px;max-width:440px;padding:20px;color:#e8edf5">' +
      '<h2 style="margin:0 0 8px;font-size:19px;color:#ffd166">' + n.emoji + " " + n.npc + '</h2>' +
      '<div style="font-size:14px;line-height:1.6;margin-bottom:14px">"' + (n.intro || n.mensagem) + '"</div>' +
      '<button id="g-aceitar" style="display:block;width:100%;margin:6px 0;padding:12px;border:0;border-radius:10px;background:rgba(255,209,102,.15);color:#ffd166;font-weight:700;cursor:pointer">🥾 Aceitar — seguir até o lugar</button>' +
      '<button id="g-onde" style="display:block;width:100%;margin:6px 0;padding:12px;border:0;border-radius:10px;background:rgba(255,209,102,.1);color:#ffd166;font-weight:700;cursor:pointer">🗺️ Ver onde fica</button>' +
      '<button id="g-fechar" style="display:block;width:100%;margin-top:8px;padding:8px;border:0;border-radius:10px;background:rgba(120,120,120,.3);color:#fff;cursor:pointer">Fechar</button></div>';
    if (mod) mod.classList.add("on");
    const fecha = () => { if (mod) mod.classList.remove("on"); const fb = document.getElementById("guardia-fb"); if (fb) fb.remove(); };
    wrap.querySelector("#g-aceitar").onclick = () => { fecha(); iniciarVigia(); falar("Caminha até o lugar de verdade. Quando tu chegar, a tela do outro mundo se abre no teu aparelho. Vai com fé."); };
    wrap.querySelector("#g-onde").onclick = () => { fecha(); try { location.href = "/ir-para.html?lat=" + n.lat + "&lng=" + n.lng + "&nome=" + encodeURIComponent(n.lugar_real); } catch (_) {} };
    wrap.querySelector("#g-fechar").onclick = fecha;
    falar(n.intro || n.mensagem);
  }

  root.AuroraTrilha = { guardia, iniciarVigia, marcarAqui, _revelar: (id) => { const n = npcs().find(x => x.id === id); if (n) revelar(n); }, simular: () => { const n = ativos()[0] || DEFAULT[0]; abrirNpc(n); } };

  function montar() {
    if (document.getElementById("btn-guardia")) return;
    const b = document.createElement("button");
    b.id = "btn-guardia"; b.textContent = "👵 Guardiã da Trilha";
    b.style.cssText = "position:fixed;right:14px;bottom:150px;z-index:99925;padding:11px 16px;border:0;border-radius:999px;background:linear-gradient(135deg,#7c3aed,#ffd166);color:#1a1030;font:800 13px system-ui;cursor:pointer;box-shadow:0 8px 22px rgba(124,58,237,.45)";
    b.onclick = guardia; document.body.appendChild(b);
    if (/[?&]admin=1/.test(location.search)) {
      const m = document.createElement("button");
      m.textContent = "📍 Marcar NPC aqui"; m.style.cssText = "position:fixed;right:14px;bottom:200px;z-index:99925;padding:9px 14px;border:1px solid #ffd166;border-radius:999px;background:rgba(8,15,30,.9);color:#ffd166;font:700 12px system-ui;cursor:pointer";
      m.onclick = marcarAqui; document.body.appendChild(m);
    }
    // carrega NPCs do banco (todos os aparelhos), aí vigia
    carregarNpcs().then(function () { if (ativos().length) iniciarVigia(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar);
  else montar();
})(window);
