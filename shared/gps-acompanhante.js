// Vento Sul — GPS Acompanhante 🧭🎉
// Geolocation contínuo + bearing + TTS conversacional. Te leva até um destino
// como uma acompanhante simpática, contando do caminho, com nível de tagarelice
// regulável (mute / baixo / normal / festa). Quando chega: confete + frase de chegada.
//
// API:
//   const ag = VSGPSAcompanhante.iniciar({
//     destino: { lat:-27.5949, lng:-48.5482, nome:"Mercado Público" },
//     persona: "litoranea",            // 'litoranea','aurora','automata','butler','tutor'
//     tagarelice: "festa",             // 'mute' | 'baixo' | 'normal' | 'festa'
//     contarCaminho: true,             // descreve atrações/comércios próximos
//     vozLocal: true,                  // usa Web Speech; false = TTS Coqui server (Feiosão)
//     onChegou: () => {...}            // chamado a ≤25m
//   });
//   ag.parar(); ag.tagarelice("normal"); ag.muteToggle();

/* 12/08/2026 — CONSERTO: "root is not defined".
   O UMD passava `root` só pro WRAPPER, mas a factory usa `root` lá dentro
   (root.speechSynthesis, root.VSTTS, root.VSLitoraneaAI). Como a factory era
   chamada SEM argumento, `root` não existia no escopo dela e o módulo estourava
   na primeira linha do iniciar() — o botão "🧭 Me leva" do comércio não fazia
   nada e o erro só aparecia no console. Agora a factory RECEBE o root. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(root);
  else root.VSGPSAcompanhante = factory(root);
})(typeof self !== "undefined" ? self : this, function (root) {

  const _D = Math.PI / 180;
  function haversine(lat1,lng1,lat2,lng2){
    const dLat=(lat2-lat1)*_D, dLng=(lng2-lng1)*_D;
    const a=Math.sin(dLat/2)**2 + Math.cos(lat1*_D)*Math.cos(lat2*_D)*Math.sin(dLng/2)**2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }
  function bearing(lat1,lng1,lat2,lng2){
    const φ1=lat1*_D, φ2=lat2*_D, λ=(lng2-lng1)*_D;
    const y=Math.sin(λ)*Math.cos(φ2);
    const x=Math.cos(φ1)*Math.sin(φ2)-Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ);
    return ((Math.atan2(y,x)*180/Math.PI)+360)%360;
  }
  function pontoCardeal(b){
    const dirs=["norte","nordeste","leste","sudeste","sul","sudoeste","oeste","noroeste"];
    return dirs[Math.round(b/45)%8];
  }

  // Intervalo entre falas, conforme tagarelice
  const INTERVALO_MS = { mute: Infinity, baixo: 90_000, normal: 35_000, festa: 15_000 };

  function falar(texto, opts){
    if (!texto) return;
    const o=opts||{};
    if (o.vozLocal !== false && root.speechSynthesis){
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = "pt-BR";
      u.rate = o.tagarelice==="festa" ? 1.08 : 1.0;
      u.pitch = o.tagarelice==="festa" ? 1.12 : 1.0;
      try { speechSynthesis.cancel(); } catch {}
      try { speechSynthesis.speak(u); } catch {}
      return;
    }
    // Coqui server (se disponível)
    if (root.VSTTS && root.VSTTS.falar) root.VSTTS.falar(texto);
  }

  // Confete simples ao chegar
  function festaChegada(){
    const n=80;
    for (let i=0;i<n;i++){
      const c=document.createElement("span");
      c.textContent = ["🎉","✨","🌟","🎊","💫"][i%5];
      c.style.cssText=`position:fixed;left:${Math.random()*100}vw;top:-10vh;font-size:${20+Math.random()*30}px;z-index:99998;pointer-events:none;transition:transform 2.4s ease-in,opacity 2.4s`;
      document.body.appendChild(c);
      requestAnimationFrame(()=>{
        c.style.transform=`translateY(${110+Math.random()*10}vh) rotate(${Math.random()*720}deg)`;
        c.style.opacity="0";
      });
      setTimeout(()=>c.remove(), 2600);
    }
  }

  // Frase pelo bearing/distância
  function frasePassoAPasso(distM, brg, destino, tagarelice){
    const card = pontoCardeal(brg);
    const km = distM>=1000 ? (distM/1000).toFixed(1)+"km" : Math.round(distM)+"m";
    const personalidade = {
      mute: "",
      baixo: `${km} pra ${destino.nome}, segue ${card}.`,
      normal: `Falta ${km} pra chegar em ${destino.nome}. Vai pelo ${card}.`,
      festa: `🎉 Falta só ${km} pra ${destino.nome}! Bora seguir ${card} que esse trecho é massa!`,
    };
    return personalidade[tagarelice] || personalidade.normal;
  }

  // Fala da chegada
  function fraseChegada(destino, tagarelice){
    const variantes = {
      mute: "",
      baixo: `Chegou em ${destino.nome}.`,
      normal: `Pronto, chegamos em ${destino.nome}!`,
      festa: `🎉🎊 CHEGAMOS! Bem-vindo a ${destino.nome}! Aproveita aí!`,
    };
    return variantes[tagarelice] || variantes.normal;
  }

  // Histórias do caminho (chama Litorânea persona pra contar 1 frase)
  async function pedirHistoria(persona, lat, lng){
    try {
      if (!root.VSLitoraneaAI || !root.VSLitoraneaAI.ask) return null;
      const r = await root.VSLitoraneaAI.ask({
        bot: persona || "litoranea",
        mensagem: `Em UMA FRASE curta (≤22 palavras), me conta uma curiosidade legal sobre o lugar perto de lat ${lat.toFixed(4)} lng ${lng.toFixed(4)}. Sem saudação.`,
        cidade: null, cache: true
      });
      return r?.reply || null;
    } catch { return null; }
  }

  function iniciar(opts){
    const o = opts || {};
    if (!o.destino || typeof o.destino.lat !== "number") throw new Error("destino.lat/lng obrigatório");
    let tagarelice = o.tagarelice || "normal";
    let muted = false;
    let parado = false;
    let ultimoFalouAt = 0;
    let contou = 0;
    const persona = o.persona || "litoranea";
    const dest = o.destino;
    let watchId = null;

    function falaSeHora(texto, forcar){
      if (parado || muted || !texto) return;
      const agora = Date.now();
      const intervalo = INTERVALO_MS[tagarelice] || 35_000;
      if (!forcar && (agora - ultimoFalouAt) < intervalo) return;
      ultimoFalouAt = agora;
      falar(texto, { vozLocal: o.vozLocal !== false, tagarelice });
    }

    async function onPos(p){
      if (parado) return;
      const { latitude:la, longitude:lg } = p.coords;
      const distM = haversine(la, lg, dest.lat, dest.lng);
      if (distM < 25) {
        falaSeHora(fraseChegada(dest, tagarelice), true);
        festaChegada();
        if (typeof o.onChegou==="function") o.onChegou();
        parar();
        return;
      }
      const brg = bearing(la, lg, dest.lat, dest.lng);
      falaSeHora(frasePassoAPasso(distM, brg, dest, tagarelice));

      // A cada 3 falas em modo festa/normal, traz uma curiosidade do caminho
      if (o.contarCaminho !== false && (tagarelice==="festa" || tagarelice==="normal") && (++contou % 3 === 0)) {
        const h = await pedirHistoria(persona, la, lg);
        if (h) falaSeHora("Curiosidade: " + h, true);
      }
    }
    function onErr(e){ console.warn("[gps-acompanhante] erro", e); }

    function parar(){
      parado = true;
      if (watchId !== null) { try { navigator.geolocation.clearWatch(watchId); } catch {} watchId=null; }
      try { speechSynthesis.cancel(); } catch {}
    }

    if (!navigator.geolocation) throw new Error("Geolocalização não suportada");
    watchId = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true, maximumAge: 5000, timeout: 20000
    });

    // saudação inicial
    if (tagarelice !== "mute") {
      const saudacao = ({
        mute: "",
        baixo: `Indo pra ${dest.nome}.`,
        normal: `Vamo até ${dest.nome}, eu te aviso o caminho.`,
        festa: `🎉 Beleza! Vou te levar até ${dest.nome} e contar umas curiosidades no caminho!`
      })[tagarelice];
      setTimeout(() => falar(saudacao, { vozLocal: o.vozLocal !== false, tagarelice }), 600);
    }

    return {
      parar,
      tagarelice: (n) => { tagarelice = n; },
      muteToggle: () => { muted = !muted; if (muted) try { speechSynthesis.cancel(); } catch{} },
      destino: dest
    };
  }

  // UI helper: cria um botão flutuante com seletor de tagarelice
  function botaoFlutuante(destino, anexarA){
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:fixed;right:14px;bottom:80px;z-index:9000;display:flex;flex-direction:column;gap:6px;align-items:flex-end";
    const btn = document.createElement("button");
    btn.textContent = "🧭 Me leva";
    btn.style.cssText = "background:linear-gradient(135deg,#06b6d4,#a855f7);color:#fff;border:0;padding:10px 14px;border-radius:30px;cursor:pointer;font-weight:700;box-shadow:0 6px 20px rgba(6,182,212,0.35)";
    let agente=null;
    btn.onclick = () => {
      if (agente){ agente.parar(); agente=null; btn.textContent="🧭 Me leva"; sel.style.display="none"; return; }
      const tag = sel.value || "festa";
      agente = iniciar({ destino, tagarelice: tag, contarCaminho:true,
        onChegou:()=>{ agente=null; btn.textContent="🧭 Me leva"; sel.style.display="none"; } });
      btn.textContent="⏹ Parar";
      sel.style.display="block";
    };
    const sel = document.createElement("select");
    sel.innerHTML = '<option value="mute">🔇 quieto</option><option value="baixo">😶 falar pouco</option><option value="normal" selected>🙂 normal</option><option value="festa">🎉 festa</option>';
    sel.style.cssText="display:none;padding:6px 10px;border-radius:14px;border:1px solid rgba(255,255,255,0.15);background:#131a23;color:#e5e7eb;font-size:12px";
    sel.onchange = () => { if (agente) agente.tagarelice(sel.value); };
    wrap.appendChild(sel); wrap.appendChild(btn);
    (anexarA || document.body).appendChild(wrap);
    return wrap;
  }

  return { iniciar, botaoFlutuante, haversine, bearing, pontoCardeal };
});
