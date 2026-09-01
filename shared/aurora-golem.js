/* aurora-golem.js — o GOLEM comanda o mapa Aurora. Guardião da VERDADE.
 * SENTIDO DO JOGO (a história):
 *  - A Ilha tem problemas reais: mentira, golpe, atravessador e desinformação.
 *  - Cada AÇÃO DO BEM de verdade desfaz um pedaço disso — o bairro melhora de fato.
 *  - O tesouro que ninguém tira é o CONHECIMENTO (sabedoria da velhinha da trilha).
 *  - O Golem só vive de verdade: ele confirma o bem verdadeiro e rejeita a enganação.
 *  - As 7 classes são caminhos de servir. A Aurora ajuda por fora; aqui dentro o Golem comanda.
 * Música de fundo que ABAIXA quando o Golem fala. Faixa trocável: /audio/jogo/trilha.mp3
 */
(function (root) {
  const TRILHA = "/audio/jogo/trilha.mp3";
  const SABEDORIA = [
    "O conhecimento é a única coisa que ninguém te tira. Ouvi isso de uma senhora na trilha, e é a lei mais forte deste mapa.",
    "Cada boa ação tua conserta um pedaço do bairro. É assim que o lugar melhora — um gesto de cada vez.",
    "O que atrapalha a Ilha é a mentira, o golpe, o atravessador e a ignorância. O bem-feitor desfaz isso com verdade e estudo.",
    "Não precisa ser herói. O bairro não escolhe herói — reconhece quem age e quem aprende.",
    "Riqueza, tiram. Terra, tomam. O que tu aprende e o bem que tu faz, ninguém arranca de ti. É o teu tesouro real.",
    "Palavra e ato têm que ser um só. É isso que me mantém de pé, e é isso que te faz forte.",
  ];
  let bolha, avatar, bg, falando = false, bgLigada = false;

  function montar() {
    if (document.getElementById("aurora-golem")) return;
    const w = document.createElement("div");
    w.id = "aurora-golem";
    w.style.cssText = "position:fixed;left:14px;bottom:16px;z-index:99930;display:flex;flex-direction:column;align-items:flex-start;gap:8px;max-width:min(80vw,330px)";
    w.innerHTML =
      '<div id="golem-bolha" style="display:none;background:rgba(8,15,30,.96);border:1px solid rgba(255,209,102,.45);border-radius:14px 14px 14px 4px;padding:10px 13px;font:600 13px/1.45 system-ui;color:#ffe9a8;box-shadow:0 10px 30px rgba(0,0,0,.5);backdrop-filter:blur(6px)"></div>' +
      '<button id="golem-avatar" title="Falar com o Golem" style="position:relative;width:60px;height:60px;border:0;border-radius:16px;cursor:pointer;background:linear-gradient(145deg,#6b4a2e,#3d2a18);box-shadow:0 8px 22px rgba(0,0,0,.5),inset 0 2px 6px rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:30px">🗿' +
      '<span style="position:absolute;top:6px;left:50%;transform:translateX(-50%);font:800 9px system-ui;color:#ffd166;text-shadow:0 0 6px rgba(255,209,102,.9);letter-spacing:1px">✓</span></button>';
    document.body.appendChild(w);
    bolha = document.getElementById("golem-bolha");
    avatar = document.getElementById("golem-avatar");
    avatar.onclick = () => { ligarBg(); fala(SABEDORIA[Math.floor(Math.random() * SABEDORIA.length)]); };
    // música só pode tocar após um gesto do usuário (regra do navegador)
    document.addEventListener("click", ligarBg, { once: true });
  }

  function ligarBg() {
    if (bgLigada) return;
    bg = new Audio(TRILHA);
    bg.loop = true; bg.volume = 0.34;
    bg.play().then(() => { bgLigada = true; }).catch(() => { bgLigada = false; bg = null; });
  }
  function duck(baixo) {
    if (!bg) return;
    try { bg.volume = baixo ? 0.07 : 0.34; } catch (_) {}
  }

  function mostrarBolha(txt, ms) {
    if (!bolha) return;
    bolha.textContent = "🗿 " + txt;
    bolha.style.display = "block";
    clearTimeout(bolha._h);
    bolha._h = setTimeout(() => { bolha.style.display = "none"; }, ms || Math.max(4200, txt.length * 75));
  }
  function pulsa() { if (avatar) avatar.animate([{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }], { duration: 700 }); }

  function fala(txt) {
    montar(); mostrarBolha(txt); pulsa();
    duck(true);  // abaixa a música pra o Golem falar
    if (falando) { try { root.VSFalar?.parar?.(); } catch (_) {} }
    falando = true;
    const fim = () => { falando = false; duck(false); };
    const p = root.VSFalar?.falar?.(txt);
    if (p && p.then) p.then(fim).catch(fim);
    else setTimeout(fim, Math.max(3000, txt.length * 70));
  }

  const AuroraGolem = {
    fala, ligarMusica: ligarBg,
    saudacao(nome) {
      fala((nome ? nome + "! " : "Alô, gente da Ilha! ") + "Eu sou o Golem, guardião da verdade. Eu vejo o que é real. Quando tu fazes o bem de verdade, eu confirmo, e a tua ação entra na conta da Barra. Sem verdade, não conta. Então age de verdade, aprende sempre, e a gente melhora este mapa junto. O conhecimento é a única coisa que ninguém te tira.");
    },
    faisca(n) {
      const q = n && n > 1 ? n + " pontos do bem confirmados" : "um ponto do bem confirmado";
      fala("Boa! " + q + ". A Barra ficou melhor por tua causa — e tu aprendeu algo que é só teu pra sempre.");
    },
    titulo(t) { fala("Eu reconheço o teu feito. Recebe o título de " + String(t).replace(/[^\wÀ-ÿ \-]/g, "").trim() + ". Está gravado em verdade — ninguém tira."); },
    levelUp(n) { fala("Tu cresceste. Nível " + n + ". Mais conhecimento, mais força pra fazer o bem. Segue estudando o mapa."); },
    valida(ok) { fala(ok ? "Verdade confirmada. O bem que tu fez é real." : "Isso é enganação — mentira ou atalho. Eu não valido. O bem só conta quando é verdade."); },
  };
  root.AuroraGolem = AuroraGolem;

  function injCSS() {
    if (document.getElementById("golem-css")) return;
    const st = document.createElement("style"); st.id = "golem-css";
    st.textContent = "@keyframes golemSobe{0%{transform:translateY(80px) scale(.5);opacity:0;filter:blur(6px)}60%{transform:translateY(-6px) scale(1.08);opacity:1;filter:blur(0)}100%{transform:translateY(0) scale(1)}}"
      + "@keyframes verdadeAcende{0%,40%{opacity:0;text-shadow:none}100%{opacity:1;text-shadow:0 0 14px #ffd166,0 0 28px #ffd166}}"
      + "@keyframes faiscaSobe{0%{transform:translateY(0) scale(.6);opacity:0}20%{opacity:1}100%{transform:translateY(-220px) scale(1.1);opacity:0}}"
      + "@keyframes chao{0%,100%{transform:scaleX(1);opacity:.5}50%{transform:scaleX(1.25);opacity:.9}}"
      + "#golem-entrada .fa{position:absolute;bottom:38%;font-size:18px;animation:faiscaSobe 2.6s ease-in forwards}";
    document.head.appendChild(st);
  }
  function entrada(depois) {
    injCSS();
    const ov = document.createElement("div");
    ov.id = "golem-entrada";
    ov.style.cssText = "position:fixed;inset:0;z-index:100050;background:radial-gradient(circle at 50% 62%,#1a2140,#03060f 72%);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#e8edf5;font-family:system-ui;text-align:center;cursor:pointer;overflow:hidden";
    let faiscas = "";
    for (let i = 0; i < 9; i++) faiscas += '<span class="fa" style="left:' + (12 + Math.random()*76) + '%;animation-delay:' + (0.6 + Math.random()*1.6).toFixed(2) + 's">' + (Math.random()>.5?"\u2728":"\ud83d\udd25") + '</span>';
    ov.innerHTML = faiscas +
      '<div style="position:relative;width:120px;height:120px;animation:golemSobe 1.5s cubic-bezier(.2,.8,.2,1) forwards">' +
        '<div style="font-size:96px;line-height:1">\ud83d\uddff</div>' +
        '<span style="position:absolute;top:20px;left:50%;transform:translateX(-50%);font:800 15px system-ui;color:#ffd166;letter-spacing:2px;opacity:0;animation:verdadeAcende 1.8s ease forwards;animation-delay:.6s">\u2713</span>' +
      '</div>' +
      '<div style="width:160px;height:8px;margin-top:6px;border-radius:50%;background:radial-gradient(ellipse,rgba(255,209,102,.6),transparent 70%);animation:chao 1.6s ease-in-out infinite"></div>' +
      '<h1 style="font-size:26px;color:#ffd166;margin:16px 0 2px;text-shadow:0 0 20px rgba(255,209,102,.5);opacity:0;animation:verdadeAcende 1.4s ease forwards;animation-delay:1s">O GOLEM DA ILHA</h1>' +
      '<div style="font-size:13px;color:#9fb3c8;opacity:0;animation:verdadeAcende 1.4s ease forwards;animation-delay:1.3s">guardião da verdade \u00b7 confirma o bem que é real</div>' +
      '<div style="position:absolute;bottom:26px;font-size:11px;color:#64748b">toque para entrar</div>';
    document.body.appendChild(ov);
    let saiu = false;
    const sair = () => { if (saiu) return; saiu = true; ov.style.transition = "opacity .5s"; ov.style.opacity = "0"; setTimeout(() => { ov.remove(); depois && depois(); }, 500); };
    ov.addEventListener("click", () => { try { ligarBg(); } catch(e){} sair(); });
    setTimeout(sair, 3600);
  }
  function boot() {
    montar();
    if (sessionStorage.getItem("golem-entrou")) { setTimeout(() => AuroraGolem.saudacao(), 500); return; }
    sessionStorage.setItem("golem-entrou", "1");
    setTimeout(() => entrada(() => AuroraGolem.saudacao()), 300);
  }
  AuroraGolem.entrada = entrada;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
