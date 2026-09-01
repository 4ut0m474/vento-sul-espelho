(function() {
  if (window.VSCompraColetiva) return;
  window.VSCompraColetiva = true;

  async function carregar() {
    let data = null;
    for (const url of ['/compra-coletiva.json', '/compra-que-volta/compra-coletiva.json']) {
      try {
        const res = await fetch(url + '?v=' + Date.now());
        if (res.ok) {
          data = await res.json();
          if (Array.isArray(data) && data.length > 0) break;
        }
      } catch(e) {}
    }
    if (!data || !data.length) return;

    const cards = data.map((p) => {
      const imgHtml = p.foto ? `<img src="${p.foto}" alt="${p.nome}" loading="lazy" style="width:100%;height:120px;object-fit:cover;border-radius:10px 10px 0 0;">` : `<div style="width:100%;height:120px;background:rgba(255,255,255,0.03);display:flex;align-items:center;justify-content:center;font-size:48px;">${p.emoji}</div>`;
      return `
        <a href="/produto-${p.id}.html" class="cc-card" style="flex:0 0 260px;background:var(--card,#0f1a30);border:1px solid var(--line,rgba(255,255,255,.08));border-radius:12px;padding:0;display:flex;flex-direction:column;text-decoration:none;color:var(--txt,#e8efff);scroll-snap-align:start;overflow:hidden;">
          ${imgHtml}
          ${p.secao ? `<div style="font-size:0.72em;padding:3px 10px;margin:8px 10px 0;border-radius:999px;background:rgba(93,200,255,.14);color:var(--cyan,#5dc8ff);align-self:flex-start;white-space:nowrap;">${p.secao}</div>` : ''}
          <div style="padding:12px;display:flex;flex-direction:column;flex:1;">
            <div style="font-size:0.95em;font-weight:700;margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;max-height:2.8em;">${p.nome}</div>
            <div style="font-size:0.85em;color:var(--gold,#ffd24d);margin-top:auto;display:flex;align-items:center;gap:6px;"><span>👥 <b>${p.votos || 0}</b> pessoas querem</span></div>
          </div>
        </a>
      `;
    }).join('');

    const container = document.createElement('div');
    container.className = 'vs-cc-container';
    container.style.cssText = 'margin:12px 16px 16px;background:rgba(15,26,48,0.7);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:12px;backdrop-filter:blur(6px);';

    function renderCC() {
      const isRec = localStorage.getItem('vs-cc-recolhido') === '1';
      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;${isRec ? '' : 'margin-bottom:8px;'}cursor:pointer;" id="vs-cc-toggle-bar">
          <h4 style="margin:0;font-size:0.95em;color:var(--gold,#ffd24d);display:flex;align-items:center;gap:6px;">
            <span>🛒 Compra coletiva (${data.length})</span>
            <span style="font-size:0.8em;color:var(--dim,#91a3c2);">${isRec ? '▸' : '▾'}</span>
          </h4>
          <div style="display:flex;align-items:center;gap:12px;">
            <a href="/compra-que-volta.html" style="font-size:0.8em;color:var(--cyan,#5dc8ff);${isRec ? 'display:none;' : ''}" onclick="event.stopPropagation()">Ver todas →</a>
          </div>
        </div>
        <div class="cc-scroll" style="display:${isRec ? 'none' : 'flex'};gap:14px;overflow-x:auto;scroll-snap-type:x proximity;padding-bottom:6px;scrollbar-width:auto;">
          ${cards}
        </div>
      `;
      const bar = container.querySelector('#vs-cc-toggle-bar');
      if (bar) {
        bar.onclick = () => {
          const cur = localStorage.getItem('vs-cc-recolhido') === '1';
          localStorage.setItem('vs-cc-recolhido', cur ? '0' : '1');
          renderCC();
        };
      }
    }
    renderCC();

    const isLugar = document.getElementById('carousel-votados') ||
                    document.querySelector('.carousel-votados') ||
                    document.querySelector('meta[name="vs-lugar"][content="sim"]');
    const isHome = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');

    if (!isHome && !isLugar) return; // Exit if not home and not a lugar

    const votadosEl = document.getElementById('carousel-votados') || document.querySelector('.carousel-votados');
    if (votadosEl) {
      votadosEl.parentNode.insertBefore(container, votadosEl);
    } else {
      const target = document.querySelector('.wrap') || document.body;
      target.prepend(container);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', carregar);
  } else {
    carregar();
  }
})();
