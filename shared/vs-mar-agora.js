/* vs-mar-agora.js — "O mar agora": o dado vivo do mar do lugar (clima, ondas,
 * vento, maré, lua) virado em painel + previsão falada.
 *
 * 06/08/2026 — a faixa "Como tá o mar agora" embaixo do h1 virou UMA ONDA
 * DOURADA ao lado do nome do lugar. A onda pisca em dourado pra mostrar que
 * tem coisa ali; de tempo em tempo solta um balãozinho dizendo o que é; e ao
 * abrir a página conta o que faz (com trava de 15 min pra não encher o saco).
 *
 * 06/08/2026 (tarde, pedido do DJ) — o toque na onda mudou:
 *   • 1 toque  → JÁ FALA o mar agora, na voz da Vento Sul (toca de novo = cala);
 *   • 2 toques → mostra a mesma informação escrita, no balão;
 *   • no balão tem a linha "ver tudo" que abre o painel completo (surf, pesca).
 * A ordem é essa porque quem tá na praia quer OUVIR sem ler nada.
 *
 * Dados vivos: /radio-mp3/marino-atual.json (30 em 30 min) + clima-atual.txt.
 * Fala com a voz boa (VSFalar/edge-tts). Auto-injeta nas páginas de lugar. */
(function (root) {
  var INTRO_KEY = "vs.mar.intro";        // último "o que é isso aqui" mostrado
  var INTRO_PAUSA = 15 * 60 * 1000;      // 15 min — pedido do DJ
  var BALAO_INTERVALO = 3 * 60 * 1000;   // lembrete curto de tempos em tempos

  async function dados() {
    const pega = (u, tipo) => fetch(u, { cache: "no-store" }).then((r) => (r.ok ? r[tipo]() : null)).catch(() => null);
    const [mar, clima] = await Promise.all([
      pega("/radio-mp3/marino-atual.json", "json"),
      pega("/radio-mp3/clima-atual.txt", "text"),
    ]);
    return { mar, clima };
  }

  function climaDe(txt) {
    const lin = (txt || "").split("\n").find((l) => l.toLowerCase().startsWith("florian"));
    const m = lin && lin.match(/:\s*(-?\d+)°C,\s*([^,]+),\s*vento\s*(\d+)/i);
    return m ? { temp: +m[1], ceu: m[2].trim(), vento: +m[3] } : null;
  }

  function fraseOnda(o) {
    const h = o.altura_m || 0;
    if (h < 0.4) return "o mar tá quase liso";
    if (h < 0.85) return "ondas de meio metro, a cada " + Math.round(o.periodo_s) + " segundos, chegando de " + dir(o.direcao);
    if (h < 1.3) return "ondas de quase um metro, série de " + Math.round(o.periodo_s) + " segundos, vindo de " + dir(o.direcao);
    return "ondas de " + String(h.toFixed(1)).replace(".", " vírgula ") + " metros, série de " + Math.round(o.periodo_s) + " segundos, de " + dir(o.direcao);
  }
  function dir(d) {
    return ({ N: "norte", S: "sul", L: "leste", E: "leste", O: "oeste", W: "oeste", NE: "nordeste", NO: "noroeste", NW: "noroeste", SE: "sudeste", SO: "sudoeste", SW: "sudoeste" })[d] || d || "";
  }
  function dicaSurf(o) {
    const h = o.altura_m || 0, p = o.periodo_s || 0;
    if (h < 0.5) return "Pra galera do surf: mar manso — dia de longboard, remada de caiaque ou ensinar alguém que tu gosta a ficar de pé na prancha.";
    if (h < 0.9) return "Pra galera do surf: tem ondinha pra brincar, boa pra treinar e pros iniciantes ganharem confiança.";
    if (h < 1.5 && p >= 8) return "Pra galera do surf: swell chegando com força boa — vale conferir os picos cedo.";
    if (h < 1.5) return "Pra galera do surf: mar mexido mas surfável — escolhe bem o pico.";
    return "Pra galera do surf: mar pesado hoje — só pros experientes, com respeito e atenção.";
  }
  // Saber de pescador, na régua do que a gente mede: peixe come melhor com a
  // maré ANDANDO (enchendo ou vazando) e nas luas de força (nova e cheia).
  // Mar muito grosso atrapalha quem pesca de praia e de costão.
  function dicaPesca(mar) {
    const o = (mar && mar.ondas) || {}, m = (mar && mar.mare) || {}, l = (mar && mar.lua) || {};
    const h = o.altura_m || 0;
    const andando = /enchendo|vazando|subindo|baix/i.test(m.tendencia || "");
    // 'iluminacao' é o número medido; o campo 'nome' às vezes vem defasado, então
    // a régua aqui é só a luz: perto de 0% (nova) ou 100% (cheia) = maré grande.
    const cheia = l.iluminacao != null && l.iluminacao >= 85;
    const nova = l.iluminacao != null && l.iluminacao <= 15;
    const partes = [];
    if (andando) partes.push("maré andando (" + String(m.tendencia || "").replace(/[↑↓]\s*/, "") + ") — é a hora que o peixe se mexe");
    else partes.push("maré parada — costuma render menos, vale esperar virar");
    if (cheia || nova) partes.push("lua quase " + (cheia ? "cheia" : "nova") + " (" + l.iluminacao + "% acesa) — maré de maior amplitude");
    if (h >= 1.5) partes.push("mar grosso: praia e costão perigosos, cuidado com a rebentação");
    else if (h < 0.5) partes.push("mar liso: bom pra canoa e pro molhe do canal");
    else partes.push("mar tranquilo pra pescar da praia");
    return "Pra quem pesca: " + partes.join("; ") + ".";
  }
  function fraseLua(l) {
    if (!l) return "";
    const ilum = l.iluminacao != null ? (l.iluminacao >= 45 && l.iluminacao <= 55 ? "metade acesa" : l.iluminacao + " por cento acesa") : "";
    return "Lua " + (l.nome || "").toLowerCase() + (ilum ? ", " + ilum : "") + ".";
  }
  function fraseMare(m) {
    if (!m) return "";
    const t = /vazando|baix/i.test(m.tendencia || "") ? "baixando" : "enchendo";
    let s = "Maré " + t + ", " + String((m.nivel_m || 0).toFixed(2)).replace(".", " vírgula ") + " metros";
    if (m.proximo) s += " — próxima " + m.proximo.replace("Preamar", "cheia às").replace("Baixamar", "seca às").replace(/\((.*)\)/, "");
    return s.trim() + ".";
  }

  async function texto(nomeLugar) {
    const { mar, clima } = await dados();
    const nome = nomeLugar || "Floripa";
    const c = climaDe(clima);
    const partes = [];
    const _h = new Date(), _hh = _h.getHours();
    const saud = _hh < 6 ? "Boa madrugada" : _hh < 12 ? "Bom dia" : _hh < 18 ? "Boa tarde" : "Boa noite";
    partes.push(saud + "! Aqui " + (/^(a|o)\s/i.test(nome) ? nome : "em " + nome) + ", é assim que tá agora:");
    if (c) partes.push(c.temp + " graus, " + c.ceu.toLowerCase() + ", vento de " + c.vento + " quilômetros por hora.");
    if (mar?.ondas) partes.push("No mar, " + fraseOnda(mar.ondas) + " — " + (mar.ondas.classificacao || "").toLowerCase() + ".");
    if (mar?.mare) partes.push(fraseMare(mar.mare));
    if (mar?.lua) partes.push(fraseLua(mar.lua));
    if (mar?.ondas) partes.push(dicaSurf(mar.ondas));
    if (mar) partes.push(dicaPesca(mar));
    partes.push("Isso é ao vivo, direto do mar pra ti, pela Vento Sul.");
    return partes.join(" ");
  }

  async function falarLugar(nomeLugar) {
    const t = await texto(nomeLugar);
    if (root.VSFalar) return root.VSFalar.falar(t);
  }

  function esc(s) { const d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }

  /* O mesmo boletim do painel, encolhido pra caber num balão: uma linha por
   * medida, na ordem em que a pessoa pergunta (tempo, mar, maré, lua). */
  /* Carrega o vs-cameras-mapa.js sob demanda. As páginas de lugar não o incluem
     — ele nasceu pro mapa —, e sem ele não existe nem lista de câmera nem a
     janela sobreposta. Ele se protege sozinho quando não há Leaflet (só deixa de
     desenhar os pinos), que é exatamente o que queremos fora do mapa.
     Assim a câmera passa a valer em TODA página de lugar sem editar página por página. */
  var _camsProm = null;
  function garantirCameras() {
    if (root.VSCameras) return Promise.resolve(true);
    if (_camsProm) return _camsProm;
    _camsProm = new Promise(function (ok) {
      try {
        const s = document.createElement("script");
        s.src = "/shared/vs-cameras-mapa.js";
        s.async = true;
        s.onload = () => ok(!!root.VSCameras);
        s.onerror = () => ok(false);
        document.head.appendChild(s);
      } catch (e) { ok(false); }
    });
    return _camsProm;
  }

  async function resumoHTML(nomeLugar) {
    await garantirCameras();          // sem isto não há como oferecer o ao vivo
    const { mar, clima } = await dados();
    const c = climaDe(clima);
    const o = (mar && mar.ondas) || null, m = (mar && mar.mare) || null, l = (mar && mar.lua) || null;
    const nome = nomeLugar || "Floripa";
    const cab = "<b>🌊 O mar agora " + (/^(a|o)\s/i.test(nome) ? esc(nome) : "em " + esc(nome)) + "</b>";
    if (!c && !o && !m && !l) {
      return cab + '<div class="vs-linha"><span>😕</span><span>Não consegui ler o mar agora. ' +
             "Tenta daqui a pouco — o dado vem de 30 em 30 minutos.</span></div>";
    }
    const linha = (ico, txt) => '<div class="vs-linha"><span>' + ico + "</span><span>" + txt + "</span></div>";
    let h = cab;
    if (c) h += linha("🌤️", esc(c.temp) + "°C, " + esc(c.ceu.toLowerCase()) + " · vento " + esc(c.vento) + " km/h");
    if (o) h += linha("🌊", "ondas de " + (o.altura_m != null ? esc(o.altura_m.toFixed(1).replace(".", ",")) : "?") +
                           " m, série de " + Math.round(o.periodo_s || 0) + "s, de " + esc(dir(o.direcao)) +
                           (o.classificacao ? " — " + esc(o.classificacao.toLowerCase()) : ""));
    if (m) h += linha("↕️", "maré " + (m.nivel_m != null ? esc(m.nivel_m.toFixed(2).replace(".", ",")) : "?") + " m" +
                           (m.tendencia ? " · " + esc(m.tendencia) : "") +
                           (m.proximo ? " · próxima " + esc(m.proximo) : ""));
    if (l) h += linha(esc(l.emoji || "🌙"), "lua " + esc((l.nome || "").toLowerCase()) +
                           (l.iluminacao != null ? " · " + esc(l.iluminacao) + "% acesa" : ""));
    if (o) h += linha("🏄", esc(dicaSurf(o).replace(/^Pra galera do surf:\s*/, "")));
    if (mar) h += linha("🎣", esc(dicaPesca(mar).replace(/^Pra quem pesca:\s*/, "")));
    let quando = "o mar atualiza de 30 em 30 minutos";
    if (mar && mar.atualizado) {
      const t = new Date(mar.atualizado);
      if (!isNaN(t)) quando = "medido às " + t.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) +
                              " · isto é AGORA, não é previsão";
    }
    h += '<div class="vs-quando">' + esc(quando) + "</div>";
    h += '<button type="button" class="vs-vertudo">🔎 ver tudo no painel</button>';
    /* 13/08/2026 (pedido do DJ) — CÂMERA AO VIVO DO PRÓPRIO LUGAR.
       Quem está lendo como o mar está quer ver o mar. A janela sobreposta já
       existia no vs-cameras-mapa.js (abre por cima, e fecha cortando o stream);
       aqui só damos a porta de entrada, no lugar onde a pergunta nasce. */
    const cam = camDoLugar(nome);
    if (cam) {
      h += '<button type="button" class="vs-vercam" data-cam="' + esc(cam.id) + '">' +
           (cam.embed ? '📹 ver a praia ao vivo' : '↗ ver ao vivo no YouTube') + '</button>';
    }
    return h;
  }

  /* Acha a câmera do lugar pelo NOME (o widget conhece o lugar por nome, não por
     coordenada). "Barra da Lagoa · canal" casa por "barra da lagoa".
     ⚠️ Das 6 câmeras só a da Barra autoriza embed; por isso, quando duas casam,
     ganha a que deixa tocar aqui dentro. O rótulo do botão diz a verdade sobre o
     que vai acontecer, em vez de prometer vídeo e entregar aviso. */
  function camDoLugar(nomeLugar) {
    try {
      const lista = root.VSCameras && root.VSCameras.lista;
      if (!lista || !lista.length) return null;
      const norm = (s) => String(s == null ? "" : s).normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
      const alvo = norm(nomeLugar);
      if (!alvo || alvo === "floripa") return null;   // genérico demais pra escolher
      let achou = null;
      lista.forEach(function (c) {
        const n = norm(String(c.nome).split("·")[0]);
        if (!n) return;
        if (alvo.indexOf(n) < 0 && n.indexOf(alvo) < 0) return;
        if (!achou || (c.embed && !achou.embed)) achou = c;
      });
      return achou;
    } catch (e) { return null; }
  }

  /* ── CSS ──────────────────────────────────────────────────────────────── */
  function css() {
    if (document.getElementById("vs-mar-css")) return;
    const st = document.createElement("style");
    st.id = "vs-mar-css";
    st.textContent =
      "@keyframes vsMarGira{to{transform:rotate(360deg)}}" +
      "@keyframes vsMarOnda{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}" +
      // a onda dourada ao lado do título
      "@keyframes vsOndaBrilha{" +
        "0%,100%{box-shadow:0 0 0 0 rgba(255,213,79,.50),0 0 9px 1px rgba(255,213,79,.28);" +
                 "filter:drop-shadow(0 0 2px rgba(255,213,79,.55))}" +
        "50%{box-shadow:0 0 0 7px rgba(255,213,79,0),0 0 20px 5px rgba(255,213,79,.55);" +
             "filter:drop-shadow(0 0 9px rgba(255,213,79,.95))}}" +
      "@keyframes vsBalaoEntra{from{opacity:0;transform:translate(-50%,-6px)}to{opacity:1;transform:translate(-50%,0)}}" +
      "@keyframes vsFolhaSobe{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}" +

      ".vs-onda-wrap{position:relative;display:inline-flex;align-items:center;vertical-align:middle}" +
      ".vs-onda-btn{display:inline-flex;align-items:center;justify-content:center;padding:0;" +
        "width:1.5em;height:1.5em;margin-right:.3em;border:0;border-radius:50%;cursor:pointer;" +
        "background:radial-gradient(circle at 50% 40%,rgba(255,213,79,.34),rgba(255,213,79,.05) 72%);" +
        "font-size:inherit;line-height:1;font-family:inherit;" +
        "animation:vsOndaBrilha 2.6s ease-in-out infinite}" +
      ".vs-onda-btn:active{transform:scale(.9)}" +

      ".vs-onda-balao{position:absolute;top:calc(100% + 10px);left:50%;transform:translate(-50%,0);" +
        "z-index:9998;width:max-content;max-width:min(78vw,300px);padding:9px 13px;border-radius:13px;" +
        "background:linear-gradient(160deg,#1b2a3d,#0e1826);color:#eaf2fb;text-align:left;" +
        "border:1px solid rgba(255,213,79,.45);box-shadow:0 10px 30px rgba(0,0,0,.55);" +
        "font:500 12.5px/1.45 system-ui,-apple-system,sans-serif;letter-spacing:0;" +
        "animation:vsBalaoEntra .28s ease-out;pointer-events:none;white-space:normal;" +
        "-webkit-text-fill-color:#eaf2fb;background-clip:border-box}" +
      ".vs-onda-balao b{color:#ffd54f;-webkit-text-fill-color:#ffd54f}" +
      ".vs-onda-balao::before{content:'';position:absolute;bottom:100%;left:var(--seta,50%);margin-left:-7px;" +
        "border:7px solid transparent;border-bottom-color:rgba(255,213,79,.45)}" +
      // balão de informação (2 toques): dá pra tocar, tem linha "ver tudo"
      ".vs-onda-balao.vs-info{pointer-events:auto;max-width:min(88vw,340px);cursor:default}" +
      ".vs-onda-balao .vs-linha{display:flex;gap:7px;align-items:flex-start;margin-top:5px;font-size:12.5px}" +
      ".vs-onda-balao .vs-linha span:first-child{flex:0 0 auto;width:1.2em;text-align:center}" +
      ".vs-onda-balao .vs-quando{margin-top:8px;color:#8fa6bd;font-size:10.5px}" +
      ".vs-onda-balao .vs-vertudo{display:block;width:100%;margin-top:9px;padding:8px;cursor:pointer;" +
        "border:1px solid rgba(34,211,238,.45);border-radius:10px;background:rgba(34,211,238,.13);" +
        "color:#67e8f9;font:700 12px/1 system-ui;-webkit-text-fill-color:#67e8f9}" +
      // 13/08/2026 — botão da câmera ao vivo: vermelho de "no ar", pra não se
      // confundir com o azul do painel, que é informação parada
      ".vs-onda-balao .vs-vercam{display:block;width:100%;margin-top:7px;padding:8px;cursor:pointer;" +
        "border:1px solid rgba(248,113,113,.5);border-radius:10px;background:rgba(248,113,113,.14);" +
        "color:#fca5a5;font:700 12px/1 system-ui;-webkit-text-fill-color:#fca5a5}" +
      ".vs-onda-balao .vs-vercam:active{transform:scale(.98)}" +
      // a onda enquanto fala: para de piscar dourado e vira azul de som
      ".vs-onda-btn.vs-falando{animation:none;" +
        "background:radial-gradient(circle at 50% 40%,rgba(34,211,238,.42),rgba(34,211,238,.06) 72%);" +
        "box-shadow:0 0 12px 3px rgba(34,211,238,.45)}" +

      // painel
      ".vs-mar-fundo{position:fixed;inset:0;z-index:99990;background:rgba(4,9,17,.72);" +
        "backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);display:flex;align-items:flex-end;justify-content:center}" +
      ".vs-mar-folha{width:100%;max-width:520px;max-height:88vh;overflow-y:auto;" +
        "background:linear-gradient(170deg,#132132,#0a1119 60%);color:#eaf2fb;" +
        "border:1px solid rgba(255,213,79,.28);border-bottom:0;border-radius:20px 20px 0 0;" +
        "padding:16px 16px calc(20px + env(safe-area-inset-bottom,0px));" +
        "box-shadow:0 -14px 44px rgba(0,0,0,.6);animation:vsFolhaSobe .3s ease-out;" +
        "font:400 14px/1.5 system-ui,-apple-system,sans-serif}" +
      "@media(min-width:560px){.vs-mar-fundo{align-items:center}" +
        ".vs-mar-folha{border-radius:20px;border-bottom:1px solid rgba(255,213,79,.28)}}" +
      ".vs-mar-folha h3{margin:0;font:800 17px/1.3 system-ui;color:#fff}" +
      ".vs-mar-topo{display:flex;align-items:flex-start;gap:10px;margin-bottom:2px}" +
      ".vs-mar-x{margin-left:auto;flex:0 0 auto;width:32px;height:32px;border-radius:50%;border:0;cursor:pointer;" +
        "background:rgba(255,255,255,.10);color:#fff;font:400 19px/1 system-ui}" +
      ".vs-mar-quando{color:#8fa6bd;font:400 11.5px/1.4 system-ui;margin:2px 0 14px}" +
      ".vs-mar-grade{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}" +
      "@media(min-width:430px){.vs-mar-grade{grid-template-columns:repeat(3,1fr)}}" +
      ".vs-mar-t{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);" +
        "border-radius:14px;padding:11px 12px}" +
      ".vs-mar-t .k{font:700 10px/1 system-ui;letter-spacing:1.2px;text-transform:uppercase;color:#7fd6e8}" +
      ".vs-mar-t .v{font:800 19px/1.2 system-ui;color:#fff;margin-top:6px}" +
      ".vs-mar-t .s{font:400 11.5px/1.35 system-ui;color:#9fb3c8;margin-top:3px}" +
      ".vs-mar-dica{margin-top:9px;border-radius:14px;padding:12px 13px;font-size:13px;line-height:1.5}" +
      ".vs-mar-dica.surf{background:rgba(6,182,212,.10);border:1px solid rgba(6,182,212,.32)}" +
      ".vs-mar-dica.pesca{background:rgba(255,213,79,.09);border:1px solid rgba(255,213,79,.30)}" +
      ".vs-mar-dica b{display:block;margin-bottom:3px;color:#fff}" +
      ".vs-mar-ouvir{width:100%;margin-top:14px;padding:13px;border-radius:14px;cursor:pointer;" +
        "border:1px solid rgba(34,211,238,.5);background:rgba(34,211,238,.14);color:#67e8f9;" +
        "font:700 14px/1 system-ui;display:flex;align-items:center;justify-content:center;gap:9px}" +
      ".vs-mar-ouvir[disabled]{cursor:progress;opacity:.9}" +
      ".vs-mar-rodape{margin-top:11px;color:#6f8ea0;font:400 10.5px/1.45 system-ui;text-align:center}" +

      ".vs-mar-btn{display:flex;align-items:center;gap:8px;margin:10px auto 0;padding:9px 16px;" +
        "border:1px solid rgba(34,211,238,.5);border-radius:999px;background:rgba(34,211,238,.12);" +
        "color:#67e8f9;font:600 13px system-ui;cursor:pointer;transition:opacity .2s}" +
      ".vs-mar-btn[disabled]{cursor:progress;opacity:.92}" +
      ".vs-mar-spin{width:14px;height:14px;border-radius:50%;flex:0 0 auto;" +
        "border:2px solid rgba(103,232,249,.28);border-top-color:#67e8f9;" +
        "animation:vsMarGira .8s linear infinite}" +
      ".vs-mar-ico{animation:vsMarOnda 2.2s ease-in-out infinite}" +
      ".vs-mar-nota{display:block;text-align:center;margin-top:5px;font:400 10.5px system-ui;" +
        "color:#7d8ea0;letter-spacing:.01em}" +
      "@media (prefers-reduced-motion:reduce){.vs-mar-spin,.vs-mar-ico,.vs-onda-btn,.vs-onda-balao,.vs-mar-folha{animation:none}}";
    document.head.appendChild(st);
  }

  // "medido às 13:00" — deixa claro que o número é real e de quando ele é.
  async function carimbo() {
    try {
      const d = await fetch("/radio-mp3/marino-atual.json", { cache: "no-store" }).then(r => r.ok ? r.json() : null);
      if (!d || !d.atualizado) return "";
      const t = new Date(d.atualizado);
      if (isNaN(t)) return "";
      return "medição do mar às " + t.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch (e) { return ""; }
  }

  /* ── PAINEL ───────────────────────────────────────────────────────────── */
  function tile(k, v, s) {
    return '<div class="vs-mar-t"><div class="k">' + k + '</div><div class="v">' + v + '</div>' +
           (s ? '<div class="s">' + s + '</div>' : '') + '</div>';
  }

  async function abrirPainel(nomeLugar) {
    css();
    const nome = (typeof nomeLugar === "function" ? nomeLugar() : nomeLugar) || "Floripa";
    if (document.getElementById("vs-mar-fundo")) return;

    const fundo = document.createElement("div");
    fundo.id = "vs-mar-fundo";
    fundo.className = "vs-mar-fundo";
    fundo.innerHTML =
      '<div class="vs-mar-folha" role="dialog" aria-label="O mar agora">' +
        '<div class="vs-mar-topo"><h3>🌊 O mar agora ' + (/^(a|o)\s/i.test(nome) ? esc(nome) : "em " + esc(nome)) + '</h3>' +
        '<button class="vs-mar-x" aria-label="Fechar">✕</button></div>' +
        '<div class="vs-mar-quando">lendo o mar…</div>' +
        '<div id="vs-mar-corpo"><div class="vs-mar-quando">…</div></div>' +
      '</div>';
    document.body.appendChild(fundo);
    const fechar = () => { fundo.remove(); document.removeEventListener("keydown", onEsc); };
    const onEsc = (e) => { if (e.key === "Escape") fechar(); };
    document.addEventListener("keydown", onEsc);
    fundo.querySelector(".vs-mar-x").onclick = fechar;
    fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });

    const { mar, clima } = await dados();
    const c = climaDe(clima);
    const o = (mar && mar.ondas) || null, m = (mar && mar.mare) || null, l = (mar && mar.lua) || null;

    let quando = "sem medição agora — o mar atualiza de 30 em 30 minutos";
    if (mar && mar.atualizado) {
      const t = new Date(mar.atualizado);
      if (!isNaN(t)) quando = "medido às " + t.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) +
                              " · atualiza de 30 em 30 min · isto é AGORA, não é previsão de amanhã";
    }
    fundo.querySelector(".vs-mar-quando").textContent = quando;

    let h = '<div class="vs-mar-grade">';
    if (c) {
      h += tile("Tempo", esc(c.temp) + "°C", esc(c.ceu));
      h += tile("Vento", esc(c.vento) + " km/h", "na cidade");
    }
    if (o) {
      h += tile("Ondas", (o.altura_m != null ? o.altura_m.toFixed(1).replace(".", ",") : "?") + " m",
                Math.round(o.periodo_s || 0) + "s · de " + dir(o.direcao));
      h += tile("Mar", esc(o.classificacao || "—"), "como tá a água");
    }
    if (m) {
      h += tile("Maré", (m.nivel_m != null ? m.nivel_m.toFixed(2).replace(".", ",") : "?") + " m",
                esc(m.tendencia || "") + (m.proximo ? " · próxima " + esc(m.proximo) : ""));
    }
    if (l) {
      h += tile("Lua", esc((l.emoji || "🌙") + " " + (l.nome || "")),
                l.iluminacao != null ? l.iluminacao + "% acesa" : "");
    }
    h += "</div>";
    if (!c && !o && !m && !l) {
      h = '<div class="vs-mar-quando">Não consegui ler o mar agora. Tenta daqui a pouco — o dado vem de 30 em 30 minutos.</div>';
    }
    if (o) h += '<div class="vs-mar-dica surf"><b>🏄 Surf</b>' + esc(dicaSurf(o).replace(/^Pra galera do surf:\s*/, "")) + "</div>";
    if (mar) h += '<div class="vs-mar-dica pesca"><b>🎣 Pesca</b>' + esc(dicaPesca(mar).replace(/^Pra quem pesca:\s*/, "")) + "</div>";
    h += '<button class="vs-mar-ouvir" id="vs-mar-ouvir">🔊 Ouvir isso na voz da Vento Sul</button>';
    h += '<div class="vs-mar-rodape">Dado real do mar de Floripa — ondas, maré e lua medidas, não chutadas.</div>';
    const corpo = document.getElementById("vs-mar-corpo");
    if (corpo) corpo.innerHTML = h;

    const ouvir = document.getElementById("vs-mar-ouvir");
    if (ouvir) ouvir.onclick = async () => {
      if (ouvir.disabled) return;
      ouvir.disabled = true;
      ouvir.innerHTML = '<span class="vs-mar-spin"></span><span>preparando a voz…</span>';
      try {
        await Promise.race([falarLugar(nome), new Promise((r) => setTimeout(r, 75000))]);
      } catch (_) {}
      ouvir.disabled = false;
      ouvir.innerHTML = "🔊 Ouvir isso na voz da Vento Sul";
    };
  }

  /* ── BALÃO ────────────────────────────────────────────────────────────── */
  // O balão do vídeo explicativo (#vex-balao, vs-video-explica.js) também nasce
  // na abertura e cobre o topo da página. Dois balões brigando é o oposto de
  // minimalista: a onda espera a vez dela.
  function livre() {
    return !document.getElementById("vex-balao") && !document.getElementById("vs-mar-fundo");
  }
  function quandoLivre(fn, tentativas) {
    if (livre()) return fn();
    if ((tentativas || 0) > 24) return;          // desiste depois de ~36s
    setTimeout(() => quandoLivre(fn, (tentativas || 0) + 1), 1500);
  }

  // A onda mora à esquerda de um h1 centralizado: um balão largo centrado nela
  // escapa pra fora da tela no celular. Aqui ele é empurrado pra dentro e a
  // setinha anda junto, pra continuar apontando pra onda.
  function ajustaBalao(b) {
    if (!b || !b.isConnected) return;
    b.style.marginLeft = "0px";
    b.style.setProperty("--seta", "50%");
    const r = b.getBoundingClientRect();
    let dx = 0;
    if (r.left < 8) dx = 8 - r.left;
    else if (r.right > innerWidth - 8) dx = (innerWidth - 8) - r.right;
    if (dx) {
      b.style.marginLeft = dx + "px";
      b.style.setProperty("--seta", "calc(50% - " + Math.round(dx) + "px)");
    }
  }

  // opts.forcado: balão pedido pela pessoa (toque) — esse sempre aparece.
  // opts.info: balão de informação, dá pra tocar e tem o botão "ver tudo".
  function balao(wrap, html, ms, opts) {
    opts = opts || {};
    if (!wrap || (!opts.forcado && !livre())) return null;
    const velho = wrap.querySelector(".vs-onda-balao");
    if (velho) velho.remove();
    const b = document.createElement("span");
    b.className = "vs-onda-balao" + (opts.info ? " vs-info" : "");
    b.innerHTML = html;
    wrap.appendChild(b);
    requestAnimationFrame(() => ajustaBalao(b));
    const some = () => { b.style.transition = "opacity .4s"; b.style.opacity = "0"; setTimeout(() => b.remove(), 420); };
    b._some = some;
    b._t = setTimeout(some, ms || 6000);
    return b;
  }

  /* ── BOTÃO ANTIGO (compat: quem chamar VSMarAgora.botao() continua tendo) ─ */
  function botao(nomeLugar) {
    css();
    const b = document.createElement("button");
    b.type = "button";
    b.className = "vs-mar-btn";
    b.innerHTML = '<span class="vs-mar-ico">🌊</span><span>Como tá o mar agora</span>';
    b.onclick = () => abrirPainel(nomeLugar);
    const nota = document.createElement("small");
    nota.className = "vs-mar-nota";
    carimbo().then(t => { if (t) nota.textContent = t; });
    b._nota = nota;
    return b;
  }

  /* ── AUTO: a onda dourada ao lado do nome do lugar ────────────────────── */
  const RE_EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;

  function auto(tentativa) {
    if (!/localidade\.html|barra-da-lagoa/.test(location.pathname)) return;
    const h1 = document.querySelector("h1");
    if (!h1 || document.getElementById("vs-onda-btn")) return;

    // O localidade.html só escreve o nome depois de voltar do banco. Se a onda
    // nascesse antes, o `textContent = nome` da página apagava o botão junto —
    // e a fala sairia "aqui em Carregando". Espera o nome de verdade (~12s).
    const bruto = h1.textContent || "";
    if (/carregando|^\s*$/i.test(bruto.replace(RE_EMOJI, "").trim())) {
      if ((tentativa || 0) < 30) setTimeout(() => auto((tentativa || 0) + 1), 400);
      return;
    }
    if (/^❌|Localidade não encontrada/.test(bruto)) return;   // página quebrada: sem onda

    // O h1 vem "🌊 Barra da Lagoa": o emoji vira o BOTÃO, o texto fica limpo.
    // Sem limpar, a fala saía "Aqui em 🌊 Barra da Lagoa" — o emoji ainda
    // quebrava a regra do artigo, que testa "a "/"o " pra dizer "na" ou "em".
    // Já o "· praia" continua na TELA (é o rótulo do tipo), mas some da fala:
    // sem cortar, a voz dizia "aqui em Morro das Pedras ponto praia".
    const visivel = bruto.replace(RE_EMOJI, "").replace(/\s+/g, " ").trim();
    const limpo = () => visivel.split(/—|·|\|/)[0].trim() || "Floripa";
    h1.textContent = visivel;

    const wrap = document.createElement("span");
    wrap.className = "vs-onda-wrap";
    const b = document.createElement("button");
    b.type = "button";
    b.id = "vs-onda-btn";
    b.className = "vs-onda-btn";
    b.textContent = "🌊";
    b.title = "1 toque: ouvir o mar agora · 2 toques: ler aqui mesmo";
    b.setAttribute("aria-label", "O mar agora: 1 toque ouve, 2 toques mostram escrito");
    wrap.appendChild(b);

    /* ── 1 toque fala · 2 toques mostram ────────────────────────────────────
     * O clique único espera 300ms pra ver se vem o segundo. É o mesmo truque
     * que o vs-fav-lugar.js usa no h1 — e o h1 ignora cliques em <button>,
     * então os dois convivem sem brigar. */
    let esperaClique = null, falando = false;

    function limpaBalao() {
      const velho = wrap.querySelector(".vs-onda-balao");
      if (velho) { clearTimeout(velho._t); velho.remove(); }
    }

    // Se o balão do vídeo explicativo estiver aberto, ele tapa o nosso. Quem
    // tocou na onda quer o mar: o do vídeo sai da frente (o ícone 📻 do
    // cabeçalho continua piscando, é sempre por lá que ele volta).
    function saiDaFrente() {
      const vex = document.getElementById("vex-balao");
      if (vex) vex.remove();
    }

    async function falarAgora() {
      if (falando) {                       // tocou de novo enquanto falava: cala
        root.VSFalar && root.VSFalar.parar();
        falando = false;
        b.classList.remove("vs-falando");
        b.textContent = "🌊";
        limpaBalao();
        return;
      }
      falando = true;
      saiDaFrente();
      b.classList.add("vs-falando");
      b.textContent = "🔊";
      balao(wrap, "<b>🔊 Falando o mar agora…</b><br>A voz leva uns segundos pra chegar. " +
                  "Toque de novo pra calar · 2 toques mostram escrito.", 7000, { forcado: true });
      try {
        await Promise.race([falarLugar(limpo()), new Promise((r) => setTimeout(r, 75000))]);
      } catch (_) {}
      falando = false;
      b.classList.remove("vs-falando");
      b.textContent = "🌊";
    }

    async function mostrarEscrito() {
      saiDaFrente();
      limpaBalao();
      const bal = balao(wrap, "<b>🌊 O mar agora</b><br>lendo o mar…", 30000, { forcado: true, info: true });
      if (!bal) return;
      let html;
      try { html = await resumoHTML(limpo()); }
      catch (_) { html = "<b>🌊 O mar agora</b><br>Não consegui ler o mar. Tenta daqui a pouco."; }
      if (!bal.isConnected) return;
      bal.innerHTML = html;
      requestAnimationFrame(() => ajustaBalao(bal));   // cresceu: recoloca na tela
      clearTimeout(bal._t);
      bal._t = setTimeout(bal._some, 22000);        // tempo de ler com calma
      const ver = bal.querySelector(".vs-vertudo");
      if (ver) ver.onclick = (e) => { e.stopPropagation(); limpaBalao(); abrirPainel(limpo); };
      // 13/08/2026 — o 📹 abre a câmera POR CIMA da página; não sai do app
      const vercam = bal.querySelector(".vs-vercam");
      if (vercam) vercam.onclick = (e) => {
        e.stopPropagation();
        const id = vercam.getAttribute("data-cam");
        const cam = (root.VSCameras && root.VSCameras.lista || []).find((c) => c.id === id);
        limpaBalao();
        if (cam && root.VSCameras && root.VSCameras.abrir) root.VSCameras.abrir(cam);
      };
      bal.addEventListener("click", (e) => {
        if (!e.target.closest(".vs-vertudo") && !e.target.closest(".vs-vercam")) { clearTimeout(bal._t); bal._some(); }
      });
    }

    b.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();                 // o h1 tem os toques dele (favoritar)
      if (esperaClique) {                  // 2º toque: mostra escrito
        clearTimeout(esperaClique); esperaClique = null;
        mostrarEscrito();
        return;
      }
      esperaClique = setTimeout(() => { esperaClique = null; falarAgora(); }, 300);
    };
    b.ondblclick = (e) => { e.preventDefault(); e.stopPropagation(); };
    h1.insertBefore(wrap, h1.firstChild);
    css();

    // 1ª coisa ao abrir: contar o que a onda faz — mas só se já passou a pausa.
    let ultimaIntro = 0;
    try { ultimaIntro = parseInt(localStorage.getItem(INTRO_KEY) || "0", 10) || 0; } catch (e) {}
    if (Date.now() - ultimaIntro > INTRO_PAUSA) {
      setTimeout(() => quandoLivre(() => {
        balao(wrap, "<b>Toque nesta onda 🌊</b><br>Ela <b>fala</b> o mar de agora: tempo, vento, ondas, maré e lua — " +
                    "com a dica do dia pra quem surfa e pra quem pesca.<br>" +
                    "<b>2 toques</b> mostram tudo escrito aqui mesmo.", 10000);
        try { localStorage.setItem(INTRO_KEY, String(Date.now())); } catch (e) {}
      }), 1200);
    }

    // Depois, de tempo em tempo, um lembrete curtinho.
    setInterval(() => {
      if (document.hidden) return;
      if (falando || wrap.querySelector(".vs-onda-balao")) return;   // não atropela quem tá lendo/ouvindo
      balao(wrap, "🌊 <b>O mar agora</b> — 1 toque ele fala, 2 toques ele mostra.", 6000);
    }, BALAO_INTERVALO);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(auto, 800));
  else setTimeout(auto, 800);

  root.VSMarAgora = { texto, falar: falarLugar, botao, abrir: abrirPainel };
})(window);
