// vento-sul-shared/ollama.js
// Cliente Ollama (mesmo cérebro do app nativo). Espelha OllamaClient.kt.
//
// Mixed-content: HTTPS site não pode chamar HTTP. Pra Ollama funcionar via
// browser, ou rode o PWA em http://localhost:8088 OU configure tunnel HTTPS.
//
// Uso:
//   await VSOllama.init()                        // detecta endpoint vivo
//   const r = await VSOllama.chat([{role:"user", content:"oi"}])
//   if (r) console.log(r.text)

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VSOllama = factory();
})(typeof self !== "undefined" ? self : this, function () {

  const ENDPOINTS_DEFAULT = [
    "http://localhost:11434",
    "http://127.0.0.1:11434",
    "http://192.168.1.5:11434"
  ];
  let _endpoint = null;
  let _model = "ventosul:latest";
  let _ready = false;

  async function _alive(url, ms = 1500) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), ms);
      const res = await fetch(`${url}/api/tags`, { signal: ctrl.signal, cache: "no-store" });
      clearTimeout(t);
      return res.ok;
    } catch { return false; }
  }

  async function init({ endpoints = ENDPOINTS_DEFAULT, model } = {}) {
    if (model) _model = model;
    // Se PWA rodando em HTTPS, navegador bloqueia HTTP — só vai funcionar
    // em localhost (mesmo origem) ou se Ollama estiver em HTTPS.
    const isHttps = typeof location !== "undefined" && location.protocol === "https:";
    for (const ep of endpoints) {
      // Em produção (HTTPS) NÃO sondar a rede local: dispara o prompt "Acessar
      // dispositivos na rede local" do Chrome e nem funciona (mixed-content).
      // Só endpoints HTTPS passam quando o site é HTTPS. Em dev (localhost) tudo passa.
      const sameProto = ep.startsWith("https:") || !isHttps;
      if (!sameProto) continue;
      if (await _alive(ep)) {
        _endpoint = ep;
        _ready = true;
        console.log("[VSOllama] endpoint vivo:", ep);
        return true;
      }
    }
    _ready = false;
    return false;
  }

  function isReady() { return _ready; }
  function endpoint() { return _endpoint; }

  // Chat completo (não-streaming) — retorna { text, modelo, durMs }
  async function chat(messages, opts = {}) {
    if (!_ready) {
      const ok = await init();
      if (!ok) return null;
    }
    const t0 = performance.now();
    const res = await fetch(`${_endpoint}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: opts.model || _model,
        messages,
        stream: false,
        options: {
          temperature: opts.temperature ?? 0.7,
          num_predict: opts.maxTokens ?? 320
        }
      })
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Ollama ${res.status}: ${err}`);
    }
    const data = await res.json();
    return {
      text: data.message?.content || "",
      modelo: data.model || _model,
      durMs: Math.round(performance.now() - t0)
    };
  }

  // Helper: pergunta única tipo Litorânea — sistema pré-definido
  async function perguntar(textoUsuario, ctx = {}) {
    const sys = `Você é a Litorânea, guia carismática do Sul do Brasil — Santa Catarina, Paraná e Rio Grande do Sul.
Responde em português brasileiro, máximo 3 frases curtas, tom acolhedor.
Se a pergunta for sobre lugar, sugere uma cidade ou praia específica.
Cidade contexto: ${ctx.cidade || "—"}, Estado: ${ctx.estado || "—"}.`;
    return chat([
      { role: "system", content: sys },
      { role: "user", content: textoUsuario }
    ]);
  }

  return { init, isReady, endpoint, chat, perguntar };
});
