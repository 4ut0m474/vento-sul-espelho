// vento-sul-shared/carousel.js
// Carrossel auto-rotativo com lazy load e ordem aleatória por sessão.
//
// Uso:
//   const c = VSCarousel.criar(elemento, { fotos: [{foto_url, titulo, subtitulo}, ...],
//                                          intervaloMs: 4000, modo: "fade" | "single" });
//   c.iniciar();  // começa a rotação
//   c.parar();
//   c.atualizar(novasFotos);
//
// Modos:
//   "fade"   — fade entre 2 layers (padrão pros carrosseis principais)
//   "single" — uma única imagem cíclica (pra Mais Votados — leve, mostra movimento)
//
// Lazy load:
//   Quando o elemento sai do viewport, pausa rotação. Volta no scroll.
//   Imagens só são preloaded 1 à frente (não baixa todas de uma vez).

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VSCarousel = factory();
})(typeof self !== "undefined" ? self : this, function () {

  function shuffleSession(arr) {
    // Embaralha cópia. Determinismo opcional via seed na sessionStorage por elemento
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function escapeHtml(s) {
    if (!s) return "";
    return String(s).replace(/[&<>"']/g, c =>
      ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  /**
   * Cria carrossel num elemento.
   * @param {HTMLElement} el
   * @param {object} opts
   *   - fotos: array de {foto_url, titulo?, subtitulo?}
   *   - intervaloMs: padrão 4500
   *   - modo: "fade" (default) | "single"
   *   - shuffle: bool (default true)
   */
  function criar(el, { fotos = [], intervaloMs = 8000, modo = "fade", shuffle = true } = {}) {
    if (!el) return null;
    // Força mínimo de 6 segundos por slide — se vier valor menor (cache antigo
    // chamando com 3500/4500), eleva pra 6000.
    if (intervaloMs < 6000) intervaloMs = 8000;
    let lista = (shuffle ? shuffleSession(fotos) : fotos.slice()).filter(f => f && f.foto_url);
    let idx = 0;
    let timer = null;
    let visivel = true;
    let pausadoFora = false;

    function preload(i) {
      const f = lista[(i) % lista.length];
      if (!f) return;
      const img = new Image();
      img.src = f.foto_url;
    }

    function render() {
      if (!lista.length) {
        el.innerHTML = `<div class="carousel-item" style="background:#222"></div>`;
        return;
      }
      if (modo === "single") {
        const f = lista[idx % lista.length];
        el.innerHTML = `
          <div class="carousel-item carousel-single" style="background-image:url('${f.foto_url}')">
            ${f.titulo ? `<div class="carousel-caption">
              <strong>${escapeHtml(f.titulo)}</strong>
              ${f.subtitulo ? `<small>${escapeHtml(f.subtitulo)}</small>` : ""}
            </div>` : ""}
          </div>`;
        // preload próxima
        preload(idx + 1);
        return;
      }
      // modo fade: 2 layers (atual e próxima) com transição via opacity
      if (!el.querySelector(".vs-fade-layer")) {
        el.innerHTML = `
          <div class="vs-fade-layer vs-fade-a carousel-item" style="position:absolute;inset:0;opacity:1;transition:opacity .9s"></div>
          <div class="vs-fade-layer vs-fade-b carousel-item" style="position:absolute;inset:0;opacity:0;transition:opacity .9s"></div>
          <div class="vs-fade-caption" style="position:absolute;left:0;right:0;bottom:0"></div>`;
        if (getComputedStyle(el).position === "static") el.style.position = "relative";
      }
      const a = el.querySelector(".vs-fade-a");
      const b = el.querySelector(".vs-fade-b");
      const cap = el.querySelector(".vs-fade-caption");
      const f = lista[idx % lista.length];
      const visAtual = a.style.opacity !== "0";
      const layerAtual = visAtual ? a : b;
      const layerProx  = visAtual ? b : a;
      layerProx.style.backgroundImage = `url('${f.foto_url}')`;
      requestAnimationFrame(() => {
        layerAtual.style.opacity = "0";
        layerProx.style.opacity = "1";
      });
      // Botão ❤️ se a foto tiver id (curadoria distribuída)
      const likeBtn = f.id
        ? `<button type="button" class="vs-like-btn" data-foto-id="${f.id}"
                   aria-label="Curtir foto"
                   style="position:absolute;right:10px;bottom:10px;background:rgba(0,0,0,0.55);border:1.5px solid rgba(255,255,255,0.30);color:${f.eu_curti ? '#ff4d6d' : '#fff'};padding:6px 12px;border-radius:99px;font-size:14px;cursor:pointer;backdrop-filter:blur(4px);display:flex;align-items:center;gap:5px;font-weight:700;z-index:5">
             <span class="vs-like-ico">${f.eu_curti ? '❤️' : '🤍'}</span>
             <span class="vs-like-cnt">${f.likes ?? 0}</span>
           </button>`
        : "";
      cap.innerHTML = (f.titulo
        ? `<div class="carousel-caption">
             <strong>${escapeHtml(f.titulo)}</strong>
             ${f.subtitulo ? `<small>${escapeHtml(f.subtitulo)}</small>` : ""}
           </div>` : "") + likeBtn;
      // wire-up listener pro novo botão (HTML reaproveita o anterior)
      const btn = cap.querySelector(".vs-like-btn");
      if (btn && !btn.dataset.wired) {
        btn.dataset.wired = "1";
        btn.addEventListener("click", async (ev) => {
          ev.stopPropagation();
          if (!window.VSSupabase?.rpc) { return; }
          btn.disabled = true;
          try {
            const r = await window.VSSupabase.rpc("toggle_like_foto", { p_foto_id: btn.dataset.fotoId });
            const d = Array.isArray(r) ? r[0] : r;
            if (d?.ok) {
              btn.querySelector(".vs-like-ico").textContent = d.liked ? "❤️" : "🤍";
              btn.querySelector(".vs-like-cnt").textContent = d.likes;
              btn.style.color = d.liked ? "#ff4d6d" : "#fff";
              // Atualiza estado local da foto pra próxima volta do carrossel
              f.eu_curti = d.liked;
              f.likes = d.likes;
            } else if (d?.erro === "AUTH_REQUIRED") {
              if (window.vsToast) window.vsToast({ tipo: "warn", titulo: "Faça login", corpo: "Entra na sua conta pra curtir fotos" });
            }
          } catch {}
          btn.disabled = false;
        }, { capture: true });
      }
      preload(idx + 1);
    }

    function tick() {
      if (!visivel || pausadoFora) return;
      idx = (idx + 1) % lista.length;
      render();
    }

    let pausaManualUntil = 0;
    function passar(delta) {
      if (!lista.length) return;
      idx = (idx + delta + lista.length) % lista.length;
      render();
      // Pausa rotação automática por 12s pro usuário ler com calma
      pausaManualUntil = Date.now() + 12000;
    }
    const tickOriginal = tick;
    tick = function () {
      if (Date.now() < pausaManualUntil) return;
      tickOriginal();
    };

    // ─── Swipe (touch + mouse drag) ───
    function ligarSwipe() {
      let sx = 0, sy = 0, ativo = false;
      el.addEventListener("touchstart", e => {
        if (e.touches.length !== 1) return;
        sx = e.touches[0].clientX; sy = e.touches[0].clientY; ativo = true;
      }, { passive: true });
      el.addEventListener("touchmove", e => {
        if (!ativo) return;
        const dy = e.touches[0].clientY - sy;
        const dx = e.touches[0].clientX - sx;
        if (Math.abs(dy) > Math.abs(dx) + 12) ativo = false; // scroll vertical, abandona
      }, { passive: true });
      el.addEventListener("touchend", e => {
        if (!ativo) return; ativo = false;
        const dx = e.changedTouches[0].clientX - sx;
        if (Math.abs(dx) < 40) return;
        passar(dx > 0 ? -1 : +1);
      });
      // Mouse drag (PC)
      let md = false, mdx = 0;
      el.addEventListener("mousedown", e => { md = true; mdx = e.clientX; });
      el.addEventListener("mouseup", e => {
        if (!md) return; md = false;
        const dx = e.clientX - mdx;
        if (Math.abs(dx) < 40) return;
        passar(dx > 0 ? -1 : +1);
      });
      el.addEventListener("mouseleave", () => { md = false; });
    }

    // Setas opcionais (clicáveis)
    function ligarSetas() {
      if (el.querySelector(".vs-carousel-arrow")) return;
      const mkArrow = (dir, dx) => {
        const b = document.createElement("button");
        b.className = `vs-carousel-arrow vs-arrow-${dir}`;
        b.setAttribute("aria-label", dir === "prev" ? "Anterior" : "Próxima");
        b.textContent = dir === "prev" ? "‹" : "›";
        b.addEventListener("click", (ev) => { ev.stopPropagation(); passar(dx); });
        el.appendChild(b);
      };
      mkArrow("prev", -1);
      mkArrow("next", +1);
    }

    // Pausa quando fora do viewport (economiza bateria + rede)
    let io = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver((entries) => {
        const e = entries[0];
        pausadoFora = !e.isIntersecting;
      }, { threshold: 0.1 });
      io.observe(el);
    }

    // Pausa quando aba inativa
    const onVis = () => { visivel = !document.hidden; };
    document.addEventListener("visibilitychange", onVis);

    return {
      iniciar() {
        if (!lista.length) return;
        render();
        if (lista.length > 1) {
          ligarSwipe();
          ligarSetas();
        }
        if (lista.length > 1 && !timer) {
          timer = setInterval(tick, intervaloMs);
        }
      },
      proxima() { passar(+1); },
      anterior() { passar(-1); },
      parar() {
        if (timer) { clearInterval(timer); timer = null; }
        if (io) { io.disconnect(); io = null; }
        document.removeEventListener("visibilitychange", onVis);
      },
      atualizar(novas) {
        lista = (shuffle ? shuffleSession(novas) : novas.slice()).filter(f => f && f.foto_url);
        idx = 0;
        render();
      },
      getFotos() { return lista; }
    };
  }

  return { criar, shuffleSession };
});
