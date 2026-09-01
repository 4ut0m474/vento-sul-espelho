// Vento Sul — Butler Vision
// Classifica foto de produto em categorias (padaria, frios, hortifruti, bebidas, limpeza,
// mercearia, carnes, peixaria, padaria, sobremesa, outros).
// Usa Cloudflare Workers AI (Llama 3.2 11B Vision) via Edge Function llama-pool quando
// disponível; senão Groq llama-3.2-90b-vision como fallback. Tudo grátis no free tier.
//
// Uso:
//   const out = await VSButlerVision.categorizar({
//     fotoUrl: "https://...jpg",
//     loja_tipo: "mercadinho"  // ou "padaria","farmacia","peixaria"
//   });
//   // out = { categoria, confianca, nome_sugerido, descricao_curta, alt_text }
//
//   const lote = await VSButlerVision.categorizarLote(arrayDeUrls, { loja_tipo, onProgresso });

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VSButlerVision = factory();
})(typeof self !== "undefined" ? self : this, function () {

  const CATEGORIAS_MERCADINHO = [
    "padaria","frios","hortifruti","bebidas","limpeza","mercearia",
    "carnes","peixaria","sobremesa","higiene","pet","bebê","outros"
  ];
  const CATEGORIAS_PADARIA = ["pão","doce","salgado","bolo","torta","biscoito","bebida","outros"];
  const CATEGORIAS_FARMACIA = ["medicamento","higiene","beleza","mama_bebê","suplemento","outros"];
  const CATEGORIAS_PEIXARIA = ["peixe","camarão","ostra","molusco","frutos do mar","preparado","outros"];

  function _categorias(tipo) {
    switch ((tipo||"").toLowerCase()) {
      case "padaria":  return CATEGORIAS_PADARIA;
      case "farmacia": return CATEGORIAS_FARMACIA;
      case "peixaria": return CATEGORIAS_PEIXARIA;
      default:         return CATEGORIAS_MERCADINHO;
    }
  }

  function _cfg() {
    return root.VENTOSUL_CONFIG || {
      SUPABASE_URL: "https://vdrzndgkwdpibexjkyxi.supabase.co",
      SUPABASE_ANON_JWT: ""
    };
  }

  function _prompt(tipo) {
    const cats = _categorias(tipo).join(", ");
    return `Olha a imagem de UM PRODUTO de ${tipo||"loja"}. Responde SÓ JSON puro (sem comentário, sem markdown):
{"categoria":"<uma de: ${cats}>","confianca":<0..1>,"nome_sugerido":"<nome curto pt-BR ≤4 palavras>","descricao_curta":"<≤14 palavras>","alt_text":"<acessibilidade ≤80 chars>"}
Se não conseguir identificar, usa categoria "outros" e confianca 0.2.`;
  }

  async function _viaPool(fotoUrl, tipo, jwt) {
    const cfg = _cfg();
    const url = `${cfg.SUPABASE_URL}/functions/v1/llama-pool`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + (jwt || cfg.SUPABASE_ANON_JWT || ""),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        persona: "butler",
        mensagem: _prompt(tipo),
        imagem_url: fotoUrl,            // edge function precisa repassar pra modelo de visão
        modo: "vision",
        json_only: true
      })
    });
    if (!r.ok) throw new Error("llama-pool HTTP " + r.status);
    const j = await r.json();
    const txt = j.reply || j.text || "";
    return _parseJson(txt);
  }

  function _parseJson(txt) {
    if (!txt) return null;
    // tira ```json``` se vier
    const limpo = String(txt).replace(/```json|```/g, "").trim();
    try { return JSON.parse(limpo); } catch {}
    // tenta extrair primeiro {...}
    const m = limpo.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch {} }
    return null;
  }

  async function categorizar(opts) {
    const o = opts || {};
    if (!o.fotoUrl) throw new Error("fotoUrl obrigatório");
    const tipo = o.loja_tipo || "mercadinho";
    const jwt = o.jwt || null;

    let out = null;
    try { out = await _viaPool(o.fotoUrl, tipo, jwt); } catch {}

    if (!out || !out.categoria) {
      // fallback heurístico simples pelo nome do arquivo (último recurso)
      const url = String(o.fotoUrl).toLowerCase();
      const guess = (() => {
        if (/pao|bread|fran[cç]/.test(url))  return "padaria";
        if (/leite|queijo|presunto|frios|iogurte/.test(url)) return "frios";
        if (/banan|tomate|alface|fruta|verdur|legum|hortifrut/.test(url)) return "hortifruti";
        if (/cerveja|refrig|agua|vinho|cocacol|bebid/.test(url)) return "bebidas";
        if (/sabao|detergente|amaciante|limpeza/.test(url)) return "limpeza";
        if (/arroz|feijao|macarrao|cafe|mercearia|oleo/.test(url)) return "mercearia";
        if (/carne|frango|linguica|bif/.test(url)) return "carnes";
        if (/peixe|camarao|sardinha|tainha/.test(url)) return "peixaria";
        return "outros";
      })();
      return {
        categoria: guess, confianca: 0.3,
        nome_sugerido: "", descricao_curta: "", alt_text: "",
        fonte: "fallback-heuristica"
      };
    }
    out.fonte = "llama-vision";
    return out;
  }

  // Lote: classifica várias fotos com concorrência limitada
  async function categorizarLote(urls, opts) {
    const o = opts || {};
    const tipo = o.loja_tipo || "mercadinho";
    const concorrencia = Math.max(1, Math.min(o.concorrencia || 3, 6));
    const onProg = typeof o.onProgresso === "function" ? o.onProgresso : null;
    const out = new Array(urls.length);
    let i = 0, feitos = 0;
    async function worker() {
      while (i < urls.length) {
        const idx = i++;
        try {
          out[idx] = await categorizar({ fotoUrl: urls[idx], loja_tipo: tipo });
        } catch (e) {
          out[idx] = { categoria: "outros", confianca: 0, erro: e.message };
        }
        feitos++;
        if (onProg) onProg(feitos, urls.length, out[idx], urls[idx]);
      }
    }
    await Promise.all(new Array(concorrencia).fill(0).map(() => worker()));
    return out;
  }

  return { categorizar, categorizarLote, CATEGORIAS_MERCADINHO, CATEGORIAS_PADARIA };
});
