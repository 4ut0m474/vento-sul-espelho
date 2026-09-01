// vento-sul-shared/litoranea_ai.js
// Cliente da Edge Function `litoranea-ai` no Supabase.
//
// Endpoint: {SUPABASE_URL}/functions/v1/litoranea-ai
// Body:     { mensagem, cidade?, estado?, history? }
// Resposta: { reply, source }   (source = "ai" | "fallback")
//
// IMPORTANTE: Edge Functions NÃO aceitam a chave `sb_publishable_*` —
// rejeita com "UNAUTHORIZED_INVALID_JWT_FORMAT". Usar SUPABASE_ANON_JWT
// (JWT legado) que vem em config.js.

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VSLitoraneaAI = factory();
})(typeof self !== "undefined" ? self : this, function () {

  let _url = null;
  let _urlPool = null;
  let _jwt = null;

  // Cache global edge (Cloudflare Worker) — 0ms latência mundo todo
  const _CACHE_URL = "https://ventosul-cache.fungzilla.workers.dev/cache";
  const _CACHE_TTL = 7 * 24 * 60 * 60; // 7 dias

  // Flag pra migração: usa llama-pool por padrão, fallback litoranea-ai
  // Pode setar window.VS_USE_POOL = false pra forçar legado
  function _usePool() {
    return typeof window !== "undefined" ? (window.VS_USE_POOL !== false) : true;
  }

  function init({ supabaseUrl, anonJwt } = {}) {
    if (supabaseUrl) {
      const base = supabaseUrl.replace(/\/+$/, "");
      _url = `${base}/functions/v1/litoranea-ai`;
      _urlPool = `${base}/functions/v1/llama-pool`;
    }
    _jwt = anonJwt || null;
  }

  // Mapeia bot do app pra persona do llama-pool
  function _personaDoBot(bot) {
    switch ((bot || "").toLowerCase()) {
      case "automata": case "professora": return "automata";
      case "aurora": case "rpg": return "aurora";
      case "comerciante": case "vip": return "comerciante";
      default: return "litoranea_negocios";
    }
  }

  // Hash simples pra chave de cache (pergunta normalizada + cidade + bot)
  async function _cacheKey(mensagem, cidade, bot) {
    const norm = (mensagem || "").toLowerCase().replace(/[^a-zA-Z0-9áéíóúãõâêîôûç ]/g, "").trim();
    const raw = `${bot || "litoranea"}|${norm}|${cidade || ""}`;
    if (!crypto?.subtle) return "vs:" + btoa(raw).slice(0, 60);
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    return "vs:" + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
  }

  async function _cacheGet(key) {
    try {
      const r = await fetch(`${_CACHE_URL}?key=${encodeURIComponent(key)}`, { cache: "no-store" });
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  }

  async function _cacheSet(key, value) {
    try {
      await fetch(`${_CACHE_URL}?key=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value, ttl: _CACHE_TTL })
      });
    } catch { /* silencioso */ }
  }

  function isReady() {
    // Auto-inicializa se config tá disponível mas ainda não chamaram init()
    if ((!_url || !_jwt) && typeof window !== "undefined" && window.VENTOSUL_CONFIG) {
      const c = window.VENTOSUL_CONFIG;
      if (c.SUPABASE_URL && c.SUPABASE_ANON_JWT) {
        init({ supabaseUrl: c.SUPABASE_URL, anonJwt: c.SUPABASE_ANON_JWT });
      }
    }
    return !!(_url && _jwt);
  }

  // Mensagens com >30min são descartadas antes de enviar (paridade com TTL do servidor).
  const HISTORY_TTL_MS = 30 * 60 * 1000;

  function trimHistory(history) {
    if (!Array.isArray(history)) return [];
    const cutoff = Date.now() - HISTORY_TTL_MS;
    return history
      .filter(m => !m.ts || m.ts >= cutoff)
      .slice(-8)
      .map(({ role, content, ts }) => ({ role, content, ts }));
  }

  /**
   * Envia mensagem livre pra Edge Function.
   * Retorna { reply, source } ou null se não está pronto.
   */
  async function ask({ mensagem, cidade = null, estado = null, history = null, jwt = null, bot = null, cache = true } = {}) {
    if (!_url) return null;
    const auth = jwt || _jwt;
    if (!auth) return null;

    // 🔎 Pedido de QR Code? Mostra overlay grande e responde curtinho — sem ir pra IA.
    try {
      if (typeof window !== "undefined" && window.VSQRShow && window.VSQRShow.detectarPedidoQR(mensagem)) {
        window.VSQRShow.mostrar({
          titulo: bot ? `📲 Vento Sul (${bot})` : "📲 Vento Sul",
          subtitulo: "Aponta a câmera de outro celular pra abrir o app"
        });
        return {
          reply: "Pronto! Mostrei o QR Code grande na tela — outro celular pode filmar pra abrir o app.",
          source: "qrcode"
        };
      }
    } catch {}

    // 🧭 Pedido de navegação? Tipo "abre o radio", "leva pra Morretes", "quero o tutor"
    try {
      if (typeof window !== "undefined" && window.VSIrPara) {
        const dest = window.VSIrPara.detectar(mensagem);
        if (dest) {
          window.VSIrPara.maybeHandle(mensagem);
          return {
            reply: "Vamo lá! Te levo pra " + (dest.nome || "lá") + ". 🧭",
            source: "ir_para"
          };
        }
        // 2ª passada async: cidade
        const cidadeDest = await window.VSIrPara.resolverCidade(mensagem);
        if (cidadeDest) {
          window.VSIrPara.executar(cidadeDest);
          return { reply: `Bora pra ${cidadeDest.nome}! 📍`, source: "ir_para_cidade" };
        }
      }
    } catch {}

    const trimmed = trimHistory(history);
    // Só cacheia perguntas SEM histórico (one-shot) pra evitar hit errado
    const podeCachear = cache && trimmed.length === 0;
    let chave = null;
    if (podeCachear) {
      chave = await _cacheKey(mensagem, cidade, bot);
      const hit = await _cacheGet(chave);
      if (hit && hit.reply) {
        return { ...hit, source: "edge_cache" };
      }
    }

    // ─── ROTA NOVA: llama-pool com sanitizacao PII + waterfall 5 providers ───
    if (_usePool() && _urlPool) {
      try {
        const res = await fetch(_urlPool, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${auth}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            persona: _personaDoBot(bot),
            mensagem,
            cidade,
            sessao_id: typeof window !== "undefined"
              ? (localStorage.getItem("vs_sessao") || "anon")
              : "server",
            history: trimmed.map(h => ({ role: h.role, content: h.content })),
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.ok && data.texto) {
            const out = {
              reply: data.texto,
              source: data.fonte === "cache" ? "cache_pool" : `pool_${data.provider}`,
              model: data.model,
              critico: data.critico,
              pii_sanitizada: data.pii_sanitizada,
            };
            if (podeCachear && chave) _cacheSet(chave, out);
            return out;
          }
        }
        // se pool falhou, cai pro legado
      } catch (e) {
        console.warn("[VSLitoraneaAI pool]", e.message);
      }
    }

    // ─── ROTA LEGADO (litoranea-ai original) ───
    try {
      const res = await fetch(_url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${auth}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mensagem,
          cidade,
          estado,
          bot,
          history: trimmed
        })
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (podeCachear && chave && data?.reply) _cacheSet(chave, data);
      return data;
    } catch (e) {
      console.warn("[VSLitoraneaAI legado]", e.message);
      return null;
    }
  }

  return { init, isReady, ask, trimHistory, HISTORY_TTL_MS };
});
