// 📸 VSFoto — otimiza foto no NAVEGADOR antes de subir (a trava de espaço).
// Redimensiona pro maior lado <= maxPx e converte pra WebP. Transforma uma foto
// de 5MB em ~75-120KB ANTES de tocar no storage. Sem isso, qualquer limite vaza.
// Uso: const blob = await VSFoto.otimizar(file, { maxPx: 800, quality: 0.8 });
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VSFoto = factory();
})(typeof self !== "undefined" ? self : this, function () {

  async function _dim(file) {
    // createImageBitmap é o caminho rápido; cai pro <img> se faltar suporte
    try {
      const bmp = await createImageBitmap(file);
      return { w: bmp.width, h: bmp.height, src: bmp };
    } catch {
      const url = URL.createObjectURL(file);
      try {
        const img = await new Promise((res, rej) => {
          const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url;
        });
        return { w: img.naturalWidth, h: img.naturalHeight, src: img };
      } finally { /* url revogada após desenhar */ setTimeout(() => URL.revokeObjectURL(url), 5000); }
    }
  }

  /**
   * Otimiza uma imagem. Retorna { blob, type, ext, antes, depois }.
   * Se algo falhar (ou WebP não suportado), devolve o arquivo original intacto.
   */
  async function otimizar(file, opts = {}) {
    const maxPx = opts.maxPx || 800;
    const quality = opts.quality ?? 0.8;
    const orig = { blob: file, type: file.type || "image/jpeg", ext: "jpg", antes: file.size, depois: file.size };
    if (!file || !(file.type || "").startsWith("image/")) return orig;
    try {
      const { w, h, src } = await _dim(file);
      if (!w || !h) return orig;
      const scale = Math.min(1, maxPx / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement("canvas");
      canvas.width = cw; canvas.height = ch;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(src, 0, 0, cw, ch);
      const blob = await new Promise(res => canvas.toBlob(res, "image/webp", quality));
      if (blob && blob.size > 0 && blob.size < file.size) {
        return { blob, type: "image/webp", ext: "webp", antes: file.size, depois: blob.size };
      }
      // WebP não ajudou (ou maior): tenta JPEG redimensionado; senão original
      const jpg = await new Promise(res => canvas.toBlob(res, "image/jpeg", quality));
      if (jpg && jpg.size > 0 && jpg.size < file.size) {
        return { blob: jpg, type: "image/jpeg", ext: "jpg", antes: file.size, depois: jpg.size };
      }
      return orig;
    } catch {
      return orig;
    }
  }

  return { otimizar };
});
