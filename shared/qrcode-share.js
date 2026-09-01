// Vento Sul — QR Code on-demand global
// Em qualquer IA, chat, mordomo, comerciante, etc., quando o user pedir
// "qrcode / qr code / código qr / mostra link / mostra app", abrir um overlay
// GRANDE com QR Code do app pra outro celular filmar.
//
// Uso direto:
//   VSQRShow.mostrar({ url: "https://www.vento-sul.tech", titulo: "📲 Vento Sul" });
//
// Em chats:
//   if (VSQRShow.detectarPedidoQR(textoUser)) { VSQRShow.mostrar(); return; }
//   ou:
//   VSQRShow.maybeHandle(textoUser); // mostra se for o caso, retorna bool

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VSQRShow = factory();
})(typeof self !== "undefined" ? self : this, function () {

  // Padrões de pedido
  const RX = [
    /\bqr ?-? ?cod(?:e|igo|ê)\b/i,
    /\bc[óo]digo ?qr\b/i,
    /\bmostra(?:r)? (?:o ?)?(?:qr|c[óo]digo|link|app)\b/i,
    /\babre(?:r)? (?:o ?)?(?:qr|c[óo]digo)\b/i,
    /\bgera(?:r)? (?:um ?)?(?:qr|c[óo]digo|link)\b/i,
    /\bquero (?:o ?)?(?:qr|c[óo]digo|link)\b/i,
    /\bmanda(?:r)? (?:o ?)?(?:qr|c[óo]digo|link)\b/i,
    /\bp[oô]e(?:r)? (?:o ?)?(?:qr|c[óo]digo)\b/i,
    /\blink ?curto\b/i,
    /\bcompartilha(?:r)? (?:o ?)?app\b/i
  ];

  function detectarPedidoQR(texto) {
    const t = String(texto || "").trim();
    if (!t) return false;
    return RX.some(rx => rx.test(t));
  }

  function urlPadrao(extra) {
    let base = "https://www.vento-sul.tech";
    try {
      if (location.hostname.endsWith("vento-sul.tech")) base = location.origin;
    } catch {}
    if (extra) {
      const sep = base.includes("?") ? "&" : "?";
      return base + sep + extra;
    }
    // anexa afiliado se VSShare disponível
    try {
      if (window.VSShare && window.VSShare.comAfiliado) return window.VSShare.comAfiliado(base);
    } catch {}
    return base;
  }

  function qrUrl(text, size = 720) {
    if (window.VSShare && window.VSShare.qrUrl) return window.VSShare.qrUrl(text, size);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&margin=10&color=ffffff&bgcolor=0a0e14`;
  }

  function escapeH(s) { const d = document.createElement("div"); d.textContent = String(s ?? ""); return d.innerHTML; }

  function fechar() {
    const o = document.getElementById("vs-qr-overlay");
    if (o) o.remove();
  }

  function mostrar(opts) {
    fechar();
    const o = opts || {};
    const url = o.url || urlPadrao();
    const titulo = o.titulo || "📲 Vento Sul";
    const sub = o.subtitulo || "Aponte a câmera de outro celular pra abrir o app";

    const ov = document.createElement("div");
    ov.id = "vs-qr-overlay";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999;padding:14px;backdrop-filter:blur(4px)";
    ov.innerHTML = `
      <div style="background:#131a23;border:2px solid #06b6d4;border-radius:18px;padding:18px;max-width:520px;width:100%;text-align:center;box-shadow:0 0 40px rgba(6,182,212,0.4)">
        <h2 style="margin:0 0 4px;color:#06b6d4;font-size:22px">${escapeH(titulo)}</h2>
        <p style="margin:0 0 14px;color:#94a3b8;font-size:13px">${escapeH(sub)}</p>
        <div style="background:#0a0e14;border-radius:12px;padding:10px;display:flex;justify-content:center">
          <img id="vs-qr-img" src="${qrUrl(url, 720)}" alt="QR Code" style="width:100%;max-width:480px;height:auto;display:block;border-radius:8px"
               onerror="this.src='${qrUrl(url, 480).replace("'", "")}'">
        </div>
        <div style="margin-top:12px;font-size:12px;color:#94a3b8;word-break:break-all;background:#0a0e14;border:1px dashed #1f2937;border-radius:8px;padding:8px">${escapeH(url)}</div>
        <div style="display:flex;gap:8px;margin-top:12px;justify-content:center;flex-wrap:wrap">
          <button id="vs-qr-copy" style="background:#06b6d4;color:#001;border:0;padding:10px 16px;border-radius:8px;cursor:pointer;font-weight:700">📋 Copiar link</button>
          <button id="vs-qr-share" style="background:#a855f7;color:#fff;border:0;padding:10px 16px;border-radius:8px;cursor:pointer;font-weight:700">📲 Compartilhar</button>
          <button id="vs-qr-close" style="background:rgba(255,255,255,0.12);color:#fff;border:0;padding:10px 16px;border-radius:8px;cursor:pointer">✕ Fechar</button>
        </div>
      </div>
    `;
    document.body.appendChild(ov);

    ov.querySelector("#vs-qr-copy").onclick = async () => {
      try {
        await navigator.clipboard.writeText(url);
        ov.querySelector("#vs-qr-copy").textContent = "✅ Copiado!";
      } catch {}
    };
    ov.querySelector("#vs-qr-share").onclick = () => {
      if (window.VSShare && window.VSShare.compartilhar) {
        window.VSShare.compartilhar({ url, titulo });
      } else if (navigator.share) {
        navigator.share({ url, title: titulo }).catch(() => {});
      }
    };
    ov.querySelector("#vs-qr-close").onclick = fechar;
    ov.addEventListener("click", (e) => { if (e.target === ov) fechar(); });
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { fechar(); document.removeEventListener("keydown", esc); }
    });
  }

  // Se o texto contém pedido de QR → mostra e retorna true. Senão false.
  function maybeHandle(texto, opts) {
    if (!detectarPedidoQR(texto)) return false;
    mostrar(opts || {});
    return true;
  }

  // Auto-attach: intercepta Enter em inputs/textareas que pareçam ser de chat IA
  // (id/placeholder/classe contém: chat, pergunta, fala, mensagem, msg, ia, ai, prompt)
  function _pareceChat(el) {
    if (!el) return false;
    const t = (el.tagName || "").toUpperCase();
    if (t !== "INPUT" && t !== "TEXTAREA") return false;
    const tag = ((el.id || "") + " " + (el.placeholder || "") + " " + (el.className || "") + " " + (el.name || "")).toLowerCase();
    return /chat|pergunt|fala|msg|mensag|ia\b|ai\b|prompt|tutor|aurora|litor|mordomo|comerc|butler/.test(tag);
  }
  function attachAuto() {
    if (window.__vsqrAttached) return; window.__vsqrAttached = true;
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.shiftKey) return;
      const t = e.target;
      if (!_pareceChat(t)) return;
      const v = (t.value || "").trim();
      if (detectarPedidoQR(v)) {
        mostrar();
        // não cancela: deixa a IA também ser chamada, ela vai responder normalmente
      }
    }, true);
  }
  if (typeof window !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", attachAuto);
    else attachAuto();
  }

  return { mostrar, fechar, detectarPedidoQR, maybeHandle, qrUrl, attachAuto };
});
