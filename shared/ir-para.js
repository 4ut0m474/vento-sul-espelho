// Vento Sul — Ir Para 🧭
// Detecta no texto livre intenções tipo "abre o radio", "leva pra Morretes",
// "abre a bussola", "quero o tutor", e oferece um modalzinho:
// "🧭 Te levo pra <destino>?" com [Sim, vamo!] [Não].
//
// Hook em chat IA: VSIrPara.maybeHandle(texto) → bool. Se true, já mostrou
// o modal e a IA não precisa responder mais nada de navegação.
//
// Dicionário simples + fallback resolver_cidade pra qualquer cidade brasileira.

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VSIrPara = factory();
})(typeof self !== "undefined" ? self : this, function () {

  // Dicionário canônico: palavra-chave → { url, nome, gps?:{lat,lng,nome} }
  // Cada entrada pode ter múltiplos sinônimos (split por |)
  const MAPA = [
    { kws: "radio|rádio|rádio sul|radio sul",          url:"/radio.html",          nome:"Rádio Vento Sul 📻" },
    { kws: "aurora|jogo aurora|jogo|rpg",              url:"/aurora-jogo.html",    nome:"Aurora 🌟" },
    { kws: "mapa aurora|mapa do jogo",                 url:"/aurora-jogo.html",    nome:"Mapa do Aurora 🗺️" },
    { kws: "mapa|mapa do app|mapa do sistema",         url:"/mapa-sistema.html",   nome:"Mapa do sistema" },
    { kws: "butler|mordomo",                           url:"/butler.html",         nome:"Butler 🤵" },
    { kws: "comerciante|loja grande|comércio pro",     url:"/comerciante-pro.html",nome:"Comércio Pro 🏢" },
    { kws: "comerciante cardapio|cardápio|menu",       url:"/comerciante-cardapio.html", nome:"Cardápio do comerciante" },
    { kws: "promocao|promoção|promoção do comércio",   url:"/comerciante-promocao.html", nome:"Promoções 🎯" },
    { kws: "reservas|reservar|comerciante reserva",    url:"/comerciante-reservas.html", nome:"Reservas 📋" },
    { kws: "transparência|transparencia",              url:"/transparencia.html",  nome:"Transparência pública" },
    { kws: "manifesto",                                url:"/manifesto.html",      nome:"Manifesto Vento Sul" },
    { kws: "regras|regras oficiais",                   url:"/regras.html",         nome:"Regras" },
    { kws: "vips|vip",                                 url:"/vips.html",           nome:"VIPs" },
    { kws: "divulgar",                                 url:"/divulgar.html",       nome:"Divulgar" },
    { kws: "shorts|videos curtos",                     url:"/shorts.html",         nome:"Shorts 🎬" },
    { kws: "ia imagens|gerar imagem|imagens ia",       url:"/ia-imagens.html",     nome:"IA Imagens 🎨" },
    { kws: "photobooth|photo booth|foto cabine",       url:"/photobooth.html",     nome:"Photobooth 📸" },
    { kws: "admin painel|painel administrativo",       url:"/admin-painel.html",   nome:"Painel admin" },
    { kws: "admin supremo",                            url:"/admin-supremo.html",  nome:"Admin Supremo" },
    { kws: "webui|web ui|cloud ai",                    url:"/webui.html",          nome:"WebUI Cloud" },
    { kws: "floripa|florianópolis|piloto floripa",     url:"/floripa-piloto.html", nome:"Florianópolis 🏝️" },
    { kws: "verifica identidade|kyc|identidade",       url:"/verifica-identidade.html", nome:"Verificar identidade" },
    { kws: "loja|mercadinho|mercadinho padrão",        url:"/loja.html?template=mercadinho", nome:"Mercadinho Padrão 🏪" },
    { kws: "feira digital|feira|barracas",             url:"/index.html#feira",    nome:"Feira digital 🛒" },
    { kws: "carteira|sulcoin|sulis|saldo",             url:"/index.html#carteira", nome:"Carteira SulCoin 💰" },
    { kws: "trilhas|trilha",                           url:"/index.html#trilhas",  nome:"Trilhas 🥾" },
    { kws: "praias|praia",                             url:"/index.html#praias",   nome:"Praias 🏖️" },
    { kws: "caça ao tesouro|caca tesouro|missoes",     url:"/index.html#caca",     nome:"Caça ao Tesouro 🗺️" },
    { kws: "compras coletivas|coletiva",               url:"/index.html#coletiva", nome:"Compras coletivas 🤝" },
    { kws: "pitch|apresentação",                       url:"/pitch.html",          nome:"Pitch CADIPACTO" },
    // /dicionario migrou pra área admin (2026-05-10). Atalho público removido —
    // admin acessa via painel admin ou /mapa-admin.
    { kws: "despertador|alarme|me acorda",             url:"/despertador.html",    nome:"Despertador ⏰" },
    { kws: "bussola|bússola|gps|me leva",              special:"gps_atual",        nome:"Bússola/GPS 🧭" },
    { kws: "qr|qrcode|qr code",                        special:"qr",               nome:"QR Code 📲" },
  ];

  function _norm(s) {
    return String(s||"").toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g,"")
      .replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
  }

  // VERBOS típicos de pedido de navegação
  const RX_VERBO = /\b(abre|abrir|leva|levar|vai|vamos|bora|quero|me mostra|me leva|liga|iniciar|inicia|entra|entrar|navega|chama|me manda|me leve)\b/;

  function detectar(texto) {
    const t = " " + _norm(texto) + " ";
    if (!t.trim()) return null;

    // Tenta cada entrada
    for (const e of MAPA) {
      const kws = e.kws.split("|").map(_norm).filter(Boolean);
      for (const k of kws) {
        if (t.includes(" " + k + " ")) {
          // Se for special, não exige verbo (pedir QR direto já basta)
          if (e.special) return { ...e, kw: k };
          // Pra navegação textual, exige um verbo de ação ou frase tipo "X" sozinho
          if (RX_VERBO.test(t) || t.trim() === k || t.split(" ").length <= 3) {
            return { ...e, kw: k };
          }
        }
      }
    }

    // Cidades brasileiras: tenta resolver via RPC pública
    // (não chamamos aqui pra não bloquear; deixamos pra resolverCidade async)
    return null;
  }

  // Resolver cidade async (segunda passada quando dict não bate)
  async function resolverCidade(texto) {
    if (!texto) return null;
    const cfg = window.VENTOSUL_CONFIG || {};
    const url = (cfg.SUPABASE_URL || "https://vdrzndgkwdpibexjkyxi.supabase.co") + "/rest/v1/rpc/resolver_cidade";
    try {
      const r = await fetch(url, {
        method:"POST",
        headers:{"apikey":cfg.SUPABASE_ANON_JWT||"","Authorization":"Bearer "+(cfg.SUPABASE_ANON_JWT||""),"Content-Type":"application/json"},
        body: JSON.stringify({ p_texto: texto })
      });
      if (!r.ok) return null;
      const j = await r.json();
      const cid = j?.cidade || j?.[0]?.cidade;
      if (!cid) return null;
      const slugify = s => _norm(s).replace(/ +/g,"-");
      return { url: `/index.html?cidade=${encodeURIComponent(cid)}`, nome: cid + " 📍" };
    } catch { return null; }
  }

  function _confirmModal(destino, onSim, onNao) {
    const ov = document.createElement("div");
    ov.id = "vs-irpara-modal";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99997;display:flex;align-items:center;justify-content:center;padding:14px";
    ov.innerHTML = `
      <div style="background:#131a23;border:2px solid #06b6d4;border-radius:18px;padding:22px;max-width:420px;width:100%;text-align:center">
        <div style="font-size:38px;margin-bottom:6px">🧭</div>
        <h3 style="margin:0 0 6px;color:#06b6d4">Te levo pra <span style="color:#fff">${escapeH(destino.nome)}</span>?</h3>
        <p style="color:#94a3b8;font-size:13px;margin:0 0 14px">Posso abrir a página ou ativar o GPS conversador.</p>
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
          <button id="vs-irpara-sim" style="background:#06b6d4;color:#001;border:0;padding:11px 18px;border-radius:10px;cursor:pointer;font-weight:700">Sim, vamo! ✨</button>
          <button id="vs-irpara-nao" style="background:rgba(255,255,255,0.1);color:#fff;border:0;padding:11px 18px;border-radius:10px;cursor:pointer">Não, valeu</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    function fechar(){ ov.remove(); }
    ov.querySelector("#vs-irpara-sim").onclick = () => { fechar(); onSim?.(); };
    ov.querySelector("#vs-irpara-nao").onclick = () => { fechar(); onNao?.(); };
    ov.addEventListener("click", e => { if (e.target === ov) fechar(); });
    setTimeout(() => {
      // Auto-aceita em 8s se user não clicar nada (UX gentil)
      if (document.getElementById("vs-irpara-modal")) { fechar(); onSim?.(); }
    }, 8000);
  }

  function escapeH(s){ const d=document.createElement("div"); d.textContent=String(s??""); return d.innerHTML; }

  function executar(destino) {
    if (!destino) return false;
    if (destino.special === "qr") {
      if (window.VSQRShow) window.VSQRShow.mostrar({ titulo:"📲 Vento Sul" });
      return true;
    }
    if (destino.special === "gps_atual") {
      // sem destino concreto: oferece página /mapa
      location.href = "/mapa.html";
      return true;
    }
    if (destino.url) {
      // Se é página de localidade e a gente sabe lat/lng, ativa GPS Acompanhante junto
      location.href = destino.url;
      return true;
    }
    return false;
  }

  // Estratégia: detecta intent local, mostra modal, executa
  function maybeHandle(texto) {
    const d = detectar(texto);
    if (!d) return false;
    _confirmModal(d, () => executar(d), () => {});
    return true;
  }

  // Auto-attach: monitora Enter em chats e tenta tanto QR quanto Ir-Para
  function attachAuto() {
    if (window.__vsIrParaAttached) return;
    window.__vsIrParaAttached = true;
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.shiftKey) return;
      const t = e.target;
      if (!t || (t.tagName!=="INPUT" && t.tagName!=="TEXTAREA")) return;
      const tag = ((t.id||"")+" "+(t.placeholder||"")+" "+(t.className||"")).toLowerCase();
      if (!/chat|pergunt|fala|msg|mensag|ia\b|ai\b|prompt|tutor|aurora|litor|mordomo|comerc|butler/.test(tag)) return;
      const v = (t.value||"").trim();
      if (!v) return;
      // tenta navegação
      const d = detectar(v);
      if (d) {
        e.preventDefault();
        _confirmModal(d, () => executar(d), () => {});
      }
    }, true);
  }
  if (typeof window !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", attachAuto);
    else attachAuto();
  }

  return { detectar, resolverCidade, executar, maybeHandle, attachAuto, MAPA };
});
