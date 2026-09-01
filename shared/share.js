// Vento Sul — Compartilhamento universal
// Web Share API com fallbacks pra TikTok, Insta, Facebook, X, WhatsApp, YouTube, Telegram, e-mail
// + código de afiliado automático + QR code

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VSShare = factory();
})(typeof self !== "undefined" ? self : this, function () {

  // Hash curto e determinístico do user UUID → código de afiliado de 6 chars
  function refCode(uuid) {
    if (!uuid) return null;
    let h = 0;
    for (let i = 0; i < uuid.length; i++) {
      h = ((h << 5) - h) + uuid.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h).toString(36).toUpperCase().padStart(6, "X").slice(0, 6);
  }

  function getUserUuid() {
    try {
      const sess = JSON.parse(localStorage.getItem("vs.sb.session") || "null");
      return sess?.user?.id || null;
    } catch { return null; }
  }

  function meuRef() {
    const uuid = getUserUuid();
    return uuid ? refCode(uuid) : null;
  }

  // Anexa ?ref=CODE na URL (sem duplicar)
  function comAfiliado(url) {
    const ref = meuRef();
    if (!ref) return url;
    try {
      const u = new URL(url, location.origin);
      if (!u.searchParams.has("ref")) u.searchParams.set("ref", ref);
      return u.toString();
    } catch {
      const sep = url.includes("?") ? "&" : "?";
      return `${url}${sep}ref=${ref}`;
    }
  }

  // QR code via api.qrserver.com (cdn público, sem custo)
  function qrUrl(text, size = 200) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&margin=10&color=ffffff&bgcolor=0a0e14`;
  }

  // Deep links por rede
  function deepLink(rede, { url, texto, hashtags = [] }) {
    const u = encodeURIComponent(url);
    const t = encodeURIComponent(texto || "");
    const tags = hashtags.length ? "&hashtags=" + hashtags.map(x => x.replace(/^#/, "")).join(",") : "";
    const fullText = encodeURIComponent(`${texto || ""} ${url} ${hashtags.map(h => h.startsWith("#") ? h : "#" + h).join(" ")}`.trim());
    switch (rede) {
      case "whatsapp":  return `https://wa.me/?text=${fullText}`;
      case "telegram":  return `https://t.me/share/url?url=${u}&text=${t}`;
      case "facebook":  return `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}`;
      case "x":         return `https://twitter.com/intent/tweet?url=${u}&text=${t}${tags}`;
      case "linkedin":  return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
      case "email":     return `mailto:?subject=${t}&body=${u}`;
      case "reddit":    return `https://reddit.com/submit?url=${u}&title=${t}`;
      case "pinterest": return `https://pinterest.com/pin/create/button/?url=${u}&description=${t}`;
      case "youtube":   return `https://www.youtube.com/upload`;        // só abre upload (não tem deep link de share)
      case "tiktok":    return `https://www.tiktok.com/upload`;          // idem (cola no clipboard)
      case "instagram": return `https://www.instagram.com/`;             // app deep link só funciona em mobile com intent
      default: return url;
    }
  }

  // Tenta Web Share API nativa, fallback abre menu de redes
  async function compartilhar({ url, titulo, texto, hashtags = [], onClose }) {
    const urlFinal = comAfiliado(url);
    const fullText = `${texto || ""} ${hashtags.map(h => h.startsWith("#") ? h : "#" + h).join(" ")}`.trim();
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, text: fullText, url: urlFinal });
        return { ok: true, via: "native" };
      } catch (e) {
        if (e.name === "AbortError") return { ok: false, via: "abort" };
        // fallback abre menu
      }
    }
    abrirMenuShare({ url: urlFinal, texto: fullText, hashtags, titulo, onClose });
    return { ok: true, via: "menu" };
  }

  function abrirMenuShare({ url, texto, hashtags, titulo, onClose }) {
    const overlay = document.createElement("div");
    overlay.className = "vs-share-overlay";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99998;display:flex;justify-content:center;align-items:center;padding:14px";
    const REDES = [
      { id: "whatsapp",  ico: "💚", nome: "WhatsApp" },
      { id: "telegram",  ico: "✈️", nome: "Telegram" },
      { id: "x",         ico: "🐦", nome: "X (Twitter)" },
      { id: "facebook",  ico: "📘", nome: "Facebook" },
      { id: "instagram", ico: "📸", nome: "Instagram" },
      { id: "tiktok",    ico: "🎵", nome: "TikTok" },
      { id: "youtube",   ico: "▶️", nome: "YouTube" },
      { id: "linkedin",  ico: "💼", nome: "LinkedIn" },
      { id: "reddit",    ico: "👽", nome: "Reddit" },
      { id: "email",     ico: "✉️", nome: "E-mail" }
    ];
    const ref = meuRef();
    overlay.innerHTML = `
      <div style="background:#131a23;border:1px solid #06b6d4;border-radius:14px;max-width:440px;width:100%;padding:18px;max-height:90vh;overflow-y:auto">
        <h3 style="margin:0 0 6px;color:#06b6d4">📲 Compartilhar</h3>
        <div style="font-size:11px;color:#94a3b8;margin-bottom:12px">${titulo || ""}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px;margin-bottom:12px">
          ${REDES.map(r => `<button class="vs-share-btn" data-rede="${r.id}"
            style="background:rgba(6,182,212,0.08);border:1px solid #1f2937;border-radius:10px;padding:12px 6px;cursor:pointer;color:#fff;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px">
            <span style="font-size:24px">${r.ico}</span>${r.nome}</button>`).join("")}
        </div>
        <div style="background:#0a0e14;border:1px dashed #1f2937;border-radius:10px;padding:10px;margin-bottom:8px;font-size:11px;color:#94a3b8;word-break:break-all">${url}</div>
        <div style="display:flex;gap:6px">
          <button id="vs-share-copy" style="flex:1;background:#06b6d4;color:#001;border:0;padding:10px;border-radius:8px;cursor:pointer;font-weight:700">📋 Copiar link${ref ? ` (afiliado ${ref})` : ""}</button>
          <button id="vs-share-copy-tudo" style="flex:1;background:#a855f7;color:#fff;border:0;padding:10px;border-radius:8px;cursor:pointer;font-weight:700">📋 Copiar tudo</button>
          <button id="vs-share-close" style="background:rgba(120,120,120,0.3);color:#fff;border:0;padding:10px 14px;border-radius:8px;cursor:pointer">✕</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelectorAll(".vs-share-btn").forEach(b => {
      b.onclick = () => {
        const rede = b.dataset.rede;
        // TikTok/Insta/YouTube: copia tudo no clipboard porque não têm deep link de share direto
        if (rede === "tiktok" || rede === "instagram" || rede === "youtube") {
          navigator.clipboard.writeText(`${texto}\n${url}`).catch(() => {});
        }
        const link = deepLink(rede, { url, texto, hashtags });
        window.open(link, "_blank", "noopener");
      };
    });
    overlay.querySelector("#vs-share-copy").onclick = () => {
      navigator.clipboard.writeText(url);
      overlay.querySelector("#vs-share-copy").textContent = "✅ Copiado!";
    };
    overlay.querySelector("#vs-share-copy-tudo").onclick = () => {
      navigator.clipboard.writeText(`${texto}\n${url}`);
      overlay.querySelector("#vs-share-copy-tudo").textContent = "✅ Copiado!";
    };
    const fechar = () => { overlay.remove(); onClose?.(); };
    overlay.querySelector("#vs-share-close").onclick = fechar;
    overlay.onclick = (e) => { if (e.target === overlay) fechar(); };
  }

  // Botão flutuante 📲 reutilizável
  function botaoFlutuante({ url, titulo, texto, hashtags, anexarA }) {
    const btn = document.createElement("button");
    btn.textContent = "📲";
    btn.title = "Compartilhar";
    btn.style.cssText = "background:linear-gradient(135deg,#06b6d4,#a855f7);color:#fff;border:0;border-radius:50%;width:44px;height:44px;cursor:pointer;font-size:20px;box-shadow:0 4px 14px rgba(6,182,212,0.4);display:inline-flex;align-items:center;justify-content:center";
    btn.onclick = () => compartilhar({ url, titulo, texto, hashtags });
    if (anexarA) anexarA.appendChild(btn);
    return btn;
  }

  // Auto-detect ?ref= na URL e registra clique no banco (só uma vez por sessão)
  function autoRegistrarClique() {
    try {
      const ref = new URLSearchParams(location.search).get("ref");
      if (!ref) return;
      const flagKey = `vs.ref.tracked.${ref}.${location.pathname}`;
      if (sessionStorage.getItem(flagKey)) return;
      sessionStorage.setItem(flagKey, "1");
      // Salva o ref pra usar na hora do cadastro
      localStorage.setItem("vs.ref.indicado_por", ref);
      const cfg = window.VENTOSUL_CONFIG || {};
      const url = `${cfg.SUPABASE_URL || "https://vdrzndgkwdpibexjkyxi.supabase.co"}/rest/v1/rpc/registrar_clique_afiliado`;
      fetch(url, {
        method: "POST",
        headers: {
          "apikey": cfg.SUPABASE_ANON_JWT || "",
          "Authorization": "Bearer " + (cfg.SUPABASE_ANON_JWT || ""),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ p_ref: ref, p_destino: location.pathname, p_ua: navigator.userAgent.slice(0, 200) })
      }).catch(() => {});
    } catch {}
  }
  // Roda automaticamente quando o script carrega
  if (typeof window !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autoRegistrarClique);
    else autoRegistrarClique();
  }

  return { compartilhar, abrirMenuShare, deepLink, comAfiliado, qrUrl, refCode, meuRef, botaoFlutuante, autoRegistrarClique };
});
