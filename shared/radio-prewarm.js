// 🔮 Radio pre-warm — baixa abertura ilha-first em background, joga no Cache API.
// Quando user clicar na rádio, áudio já está em cache → toca em <100ms.
//
// 📶 Política de banda (decisão do desenvolvedor 2026-05-09):
//   - Wifi/ethernet/desconhecido → pre-warm sempre
//   - 4G/3G/2G → SÓ se user ligou toggle 'vs.radio.prewarm.permite_movel'
//   - Data Saver ON → skip mesmo em wifi (respeita preferência explícita)
//
// 2s após DOMContentLoaded, em prioridade baixa (não atrapalha render).
// Banda extra: ~50KB/sessão. Cache TTL = slot 30min do XTTS.
// Não roda em /radio.html. Não roda 2x na mesma sessão.

(function () {
  'use strict';
  if (location.pathname.endsWith('/radio.html')) return;
  if (sessionStorage.getItem('vs.radio.prewarm.feito')) return;

  const SUPA = (window.VENTOSUL_CONFIG && window.VENTOSUL_CONFIG.SUPABASE_URL) || 'https://vdrzndgkwdpibexjkyxi.supabase.co';
  const ANON = (window.VENTOSUL_CONFIG && window.VENTOSUL_CONFIG.SUPABASE_ANON_JWT) || '';
  const CACHE_NAME = 'radio-prewarm-v1';

  // Decide se pode pre-warm baseado em conexão + preferência do user
  function podeUsarBanda() {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    // Sem API de conexão (Safari, alguns FF) → permite (desktop/laptop costumam estar em wifi)
    if (!c) return { ok: true, motivo: 'sem-api' };
    // Data Saver ligado → SEMPRE skip (user quer economia explícita)
    if (c.saveData) return { ok: false, motivo: 'data-saver' };
    // Wifi/ethernet → permite
    const tipo = c.type || '';
    if (tipo === 'wifi' || tipo === 'ethernet' || tipo === 'wimax') return { ok: true, motivo: 'wifi' };
    // Cellular ou effectiveType 4g/3g/2g → só se user permitiu
    const permiteMovel = localStorage.getItem('vs.radio.prewarm.permite_movel') === '1';
    if (tipo === 'cellular' || /^(2g|3g|4g|slow-2g)$/.test(c.effectiveType || '')) {
      return permiteMovel
        ? { ok: true, motivo: 'movel-permitido' }
        : { ok: false, motivo: 'movel-bloqueado' };
    }
    // Tipo desconhecido (none, unknown, mixed) → permite no benefit-of-doubt
    return { ok: true, motivo: 'tipo-' + (tipo || 'desconhecido') };
  }

  function obterCidade() {
    // Tenta cidade salva (mesmas chaves usadas no app); fallback Floripa
    try {
      const saved = JSON.parse(localStorage.getItem('vs.cidade.atual') || 'null');
      if (saved && saved.cidade) return { cidade: saved.cidade, estado: saved.estado || 'SC' };
    } catch (e) {}
    return { cidade: 'Florianópolis', estado: 'SC' };
  }

  async function preWarm() {
    if (!('caches' in window) || !ANON) return;
    const banda = podeUsarBanda();
    if (!banda.ok) {
      console.log('[radio prewarm] skip:', banda.motivo);
      return;
    }
    console.log('[radio prewarm] iniciando (' + banda.motivo + ')');
    sessionStorage.setItem('vs.radio.prewarm.feito', '1');

    const { cidade, estado } = obterCidade();
    let chunks = [];
    let slot = '';
    try {
      const u = `${SUPA}/functions/v1/radio-abertura?cidade=${encodeURIComponent(cidade)}&estado=${encodeURIComponent(estado)}`;
      const r = await fetch(u, {
        headers: { apikey: ANON, Authorization: 'Bearer ' + ANON },
        signal: AbortSignal.timeout(6000),
      });
      if (!r.ok) return;
      const j = await r.json();
      chunks = j && j.chunks ? j.chunks : [];
      slot = j && j.slot ? j.slot : '';
    } catch (e) { return; }

    if (!chunks.length) return;

    let cache;
    try { cache = await caches.open(CACHE_NAME); }
    catch (e) { return; }

    // Limpa slot antigo (se mudou)
    try {
      const slotAtual = sessionStorage.getItem('vs.radio.prewarm.slot');
      if (slotAtual && slotAtual !== slot) {
        const keys = await cache.keys();
        for (const k of keys) await cache.delete(k);
      }
      sessionStorage.setItem('vs.radio.prewarm.slot', slot);
    } catch (e) {}

    // Baixa cada chunk em paralelo, com prioridade baixa (idle).
    // Mesma URL EXATA que radio.html usa em tocarMP3 → cache hit garantido.
    // strict=1 obrigatório pra bater com chave do cache que radio.html consulta.
    const lang = 'pt-BR';
    const urls = chunks.map(t =>
      `${SUPA}/functions/v1/radio-tts?texto=${encodeURIComponent(t)}&lang=${lang}&strict=1&apikey=${ANON}`
    );

    await Promise.allSettled(urls.map(async (url) => {
      try {
        // Já está em cache?
        const hit = await cache.match(url);
        if (hit) return;
        const r = await fetch(url, { method: 'GET', priority: 'low', cache: 'force-cache' });
        if (r.ok) await cache.put(url, r.clone());
      } catch (e) {}
    }));
  }

  // Aguarda 2s após carregamento pra não atrapalhar UI/LCP
  function agendar() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => setTimeout(preWarm, 2000), { timeout: 5000 });
    } else {
      setTimeout(preWarm, 2500);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', agendar);
  } else {
    agendar();
  }
})();
