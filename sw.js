// Service Worker — Vento Sul PWA
// Estratégias (revisão 2026-08-12 — o "portal pro passado" foi fechado):
//   - Navegação HTML: network-first (sempre fresca)
//   - JS/CSS da casa: NETWORK-FIRST com cache:"no-cache" (revalida; 304 é barato).
//     ⚠️ ANTES era stale-while-revalidate e ERA O BUG: servia a versão VELHA na
//     hora e só trocava na navegação SEGUINTE. Na prática uma alteração publicada
//     "voltava atrás" na primeira visita — HTML novo + shared/*.js antigo. Foi o
//     que fez o vídeo explicativo reaparecer no ícone da rádio (11-12/08/2026).
//     NÃO voltar pra SWR em arquivo que a gente edita.
//   - Resto (fontes etc): stale-while-revalidate, que aí é seguro.
//   - Pré-cache LAZY: só o núcleo (~15 arquivos). O resto entra no cache quando
//     o usuário USA — quem só usa a loja não baixa o app inteiro.
//   - /radio-mp3/: passa direto (blocos rotacionam toda hora; cachear é lixo acumulado)
//   - Supabase REST/RPC: network-first com fallback de cache (online OK)
//   - Imagens (Storage): cache-first

const VERSION = "v-2026-09-01-carrossel-so-em-lugares";
// "Thrifty" = corta egress do Supabase:
//  - imagens viram cache-first (uma vez baixada, nunca mais bate)
//  - REST: TTL 5min em memória (idêntica request em < 5min reusa cache)
const SHELL_CACHE  = `ventosul-shell-${VERSION}`;
const DATA_CACHE   = `ventosul-data-${VERSION}`;
const IMG_CACHE    = `ventosul-img-${VERSION}`;

// LAZY (2026-06-11): pré-cache SÓ do núcleo que toda visita usa.
// Todo o resto (60+ páginas, fundos, shared/*) entra no cache na PRIMEIRA VEZ
// que o usuário usa, via stale-while-revalidate no fetch handler.
// NÃO cachear nunca: auth-callback.html, oauth-callback.html, reset.html
// (são network-only intencionalmente — kill switches OAuth)
const SHELL_FILES = [
  "./",
  "./index.html",
  "./offline.html",
  "./entrada.html",
  "./styles.css",
  "./config.js",
  "./app.js",
  "./manifest.webmanifest",
  "./favicon.ico",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./shared/supabase.js",
  "./shared/i18n.js",
  "./shared/cidades.js",
  // Cartão + central + Barra — pré-cacheados pra abrir OFFLINE (mostrar sem internet)
  "./cartao.html",
  "./apresentar.html",
  "./barra-da-lagoa.html",
  "./comercio.html",
  "./shared/vs-page-footer.js",
  "./jornal.html",
  // Pitch FluxIA — pré-cacheados pra apresentar OFFLINE pro cliente
  "./auditoria-como-funciona.html",
  "./comerciante-planos.html",
  "./automacoes.html",
  "./proposta-mercado.html",
  "./data/comercio-barra.json",
  "./bg/bg_ponte_floripa.webp",
  "./bg/bg_city_future.webp",
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL_CACHE);
    // addAll falha se QUALQUER arquivo der 404. Usamos put individual
    // pra um arquivo faltando não matar o SW inteiro.
    await Promise.allSettled(
      SHELL_FILES.map(url =>
        fetch(url).then(r => { if (r.ok) c.put(url, r); }).catch(() => {})
      )
    );
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    // Apaga TUDO que não for da versão atual — não confia em substring,
    // compara nome exato. Evita "pontos de restauração" servindo arquivos velhos.
    await Promise.all(
      keys.filter(k => k !== SHELL_CACHE && k !== DATA_CACHE && k !== IMG_CACHE)
          .map(k => caches.delete(k))
    );
    await self.clients.claim();
    // Avisa todas as abas abertas pra recarregarem (pegam JS novo na hora)
    const clients = await self.clients.matchAll({ type: "window" });
    for (const c of clients) {
      try { c.postMessage({ type: "sw-updated", version: VERSION }); } catch {}
    }
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 🔑 AUTH CALLBACKS + RESET: NUNCA passam pelo SW (sempre rede direto, sem cache)
  if (url.origin === location.origin && (
      url.pathname === "/auth-callback.html" ||
      url.pathname === "/oauth-callback.html" ||
      url.pathname === "/reset.html"
  )) {
    return; // deixa o browser pegar direto da rede
  }

  // 🔑 NAVEGAÇÃO HTML: SEMPRE network-first.
  // Sem isso, OAuth callback (#access_token=...) cai numa versão velha do index.html
  // sem o capturador inline → tela fica vazia.
  const isNavigation = req.mode === "navigate" ||
    (url.origin === location.origin && /\.html?$/.test(url.pathname)) ||
    (url.origin === location.origin && (url.pathname === "/" || !url.pathname.includes(".")));
  if (isNavigation) {
    // cache:"no-cache" fura o max-age=4h que o Cloudflare injeta no navegador
    // (revalida no servidor; 304 quando nada mudou — barato e sempre fresco)
    e.respondWith(fetch(req, { cache: "no-cache" }).catch(() => caches.match(req)));
    return;
  }

  // Páginas críticas admin/tutor/webui SEMPRE network-first (sem cache zumbi)
  if (url.origin === location.origin && /\/(admin-painel|tutor|webui)\.html$/.test(url.pathname)) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
  // Manifests do tutor/webui idem
  if (url.origin === location.origin && /\.webmanifest$/.test(url.pathname) && /(tutor|webui)\.webmanifest$/.test(url.pathname)) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // 🎙️ radio-tts: cache-first com 3 sources (radio-prewarm-v1 → radio-tts-runtime → rede).
  // XTTS file cache no servidor é eterno por sha1(texto), então MP3 nunca muda → cache infinito é seguro.
  // Pre-warm script (/shared/radio-prewarm.js) popula radio-prewarm-v1 nas outras páginas → instant hit.
  if (url.hostname.endsWith(".supabase.co") && url.pathname === "/functions/v1/radio-tts") {
    e.respondWith(radioTtsCached(req));
    return;
  }
  // Supabase REST/RPC → cache TTL 5min (corta hits repetidos)
  if (url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/rest/")) {
    e.respondWith(cacheTTL(req, DATA_CACHE, 5 * 60 * 1000));
    return;
  }
  // 📻 Rádio: playlist/mp3 rotacionam toda hora — rede direto, sem encher cache
  if (url.origin === location.origin && url.pathname.startsWith("/radio-mp3/")) {
    e.respondWith(fetch(req).catch(() => caches.match(req)).then(r => r || Response.error()));
    return;
  }
  // 🔊 ÁUDIO — NUNCA passar pelo SW. (03/08/2026: o botão "Como tá o mar agora"
  // ficava mudo no Android.) O elemento <audio> pede o arquivo por faixa de bytes
  // (cabeçalho Range); respondendo do cache vem o arquivo INTEIRO com status 200 e
  // sem Content-Range, e o Chrome se recusa a tocar — sem erro que o app perceba.
  // Vale pra /fala/ (TTS) e pra qualquer pedido com Range ou destino de mídia.
  if (req.headers.get("range") ||
      req.destination === "audio" || req.destination === "video" ||
      (url.origin === location.origin && url.pathname.startsWith("/fala/"))) {
    return;   // sem respondWith = o navegador cuida sozinho, com Range e tudo
  }
  // Imagens
  if (req.destination === "image" || /\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(url.pathname)) {
    e.respondWith(cacheFirst(req, IMG_CACHE));
    return;
  }
  // 🔑 JS/CSS DA CASA: NETWORK-FIRST, sempre fresco.
  // Este bloco era stale-while-revalidate e ESSE era o "portal pro passado":
  // servia a versão velha na hora, trocando só na navegação seguinte. Quem
  // publicava uma alteração e ia conferir via a alteração ANTERIOR e concluía
  // que "voltou sozinho". O cache:"no-cache" também fura o max-age=4h que o
  // Cloudflare injeta, então nem o CDN segura versão velha.
  // Custo: um pedido revalidado por arquivo (304 quando nada mudou).
  // Offline continua funcionando pelo .catch() no cache.
  if (url.origin === location.origin && /\.(js|css)(\?|$)/i.test(url.pathname)) {
    e.respondWith(
      fetch(req, { cache: "no-cache" })
        .then(r => {
          if (r && r.ok) {
            const copia = r.clone();
            caches.open(SHELL_CACHE).then(c => c.put(req, copia)).catch(() => {});
          }
          return r;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Resto da mesma origem (fontes, etc — coisa que não editamos): SWR é seguro aqui.
  if (url.origin === location.origin) {
    e.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
    return;
  }
  // Outros: passa direto, com cache fallback
  e.respondWith(networkFirst(req, DATA_CACHE));
});

// Cache 3-camadas pra radio-tts: prewarm (popular nas outras páginas) → runtime (já tocado) → rede.
// MP3 do XTTS é deterministico por sha1(texto), nunca muda — cache infinito é correto.
const RADIO_TTS_CACHE = "radio-tts-runtime-v1";
const RADIO_PREWARM_CACHE = "radio-prewarm-v1";

async function radioTtsCached(req) {
  // 1. Procura em prewarm (populado pelo radio-prewarm.js nas outras páginas)
  try {
    const prewarmCache = await caches.open(RADIO_PREWARM_CACHE);
    const prewarmHit = await prewarmCache.match(req);
    if (prewarmHit) return prewarmHit;
  } catch {}
  // 2. Procura em runtime (já tocado em sessão atual ou anterior)
  try {
    const runtimeCache = await caches.open(RADIO_TTS_CACHE);
    const runtimeHit = await runtimeCache.match(req);
    if (runtimeHit) return runtimeHit;
  } catch {}
  // 3. Rede + popula runtime
  try {
    const res = await fetch(req);
    if (res.ok) {
      const c = await caches.open(RADIO_TTS_CACHE);
      c.put(req, res.clone());
    }
    return res;
  } catch (e) {
    return new Response(JSON.stringify({ erro: "rede falhou e nada em cache" }), {
      status: 503, headers: { "Content-Type": "application/json" }
    });
  }
}

async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) {
      const c = await caches.open(cacheName);
      c.put(req, res.clone());
    }
    return res;
  } catch {
    // Página HTML: serve offline.html como fallback
    if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
      const off = await caches.match("./offline.html");
      if (off) return off;
    }
    return cached || Response.error();
  }
}

async function networkFirst(req, cacheName) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const c = await caches.open(cacheName);
      c.put(req, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(req);
    return cached || new Response(JSON.stringify({ offline: true }), {
      status: 503, headers: { "Content-Type": "application/json" }
    });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const c = await caches.open(cacheName);
  const cached = await c.match(req);
  // cache:"no-cache" = revalida direto no servidor, furando o TTL de navegador
  // que o Cloudflare injeta (senão a "atualização em background" pegava do
  // próprio cache HTTP local e a novidade demorava até 4h)
  const network = fetch(req, { cache: "no-cache" }).then(res => {
    if (res.ok) c.put(req, res.clone());
    return res;
  }).catch(() => null);
  if (cached) return cached;            // hit: responde já; rede atualiza em background
  const res = await network;            // miss: espera a rede (1ª vez do arquivo)
  return res || Response.error();
}

/**
 * Cache com TTL: se houver versão em cache fresca (< maxAgeMs), serve cache.
 * Se cache for velha ou inexistente, busca rede e atualiza.
 * Reduz drasticamente egress quando vários componentes da página puxam o mesmo
 * endpoint (ex: carrossel landing carregado em landing + cidade).
 */
async function cacheTTL(req, cacheName, maxAgeMs) {
  const c = await caches.open(cacheName);
  const cached = await c.match(req);
  if (cached) {
    const dateHeader = cached.headers.get("x-cached-at");
    const cachedAt = dateHeader ? parseInt(dateHeader, 10) : 0;
    if (Date.now() - cachedAt < maxAgeMs) return cached;
  }
  try {
    const res = await fetch(req);
    if (res.ok) {
      // Re-empacota com header de timestamp pra TTL funcionar
      const body = await res.clone().blob();
      const headers = new Headers(res.headers);
      headers.set("x-cached-at", String(Date.now()));
      const stored = new Response(body, { status: res.status, statusText: res.statusText, headers });
      c.put(req, stored);
    }
    return res;
  } catch {
    return cached || new Response(JSON.stringify({ offline: true }), {
      status: 503, headers: { "Content-Type": "application/json" }
    });
  }
}

self.addEventListener("message", e => {
  if (e.data === "skipWaiting") self.skipWaiting();
  // Responde a versão ativa pra página mostrar a etiqueta (raio-x de cache)
  if (e.data === "version" && e.source) e.source.postMessage({ type: "sw-version", version: VERSION });
});

// 🔔 Push handler — recebe notificação enviada pela Edge Function enviar-push
self.addEventListener("push", e => {
  let data = { titulo: "Vento Sul", corpo: "Algo aconteceu!", url: "/" };
  try { if (e.data) data = e.data.json(); } catch {}
  e.waitUntil(self.registration.showNotification(data.titulo, {
    body: data.corpo,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-72.png",
    data: { url: data.url || "/" },
    vibrate: [100, 50, 100]
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = e.notification.data?.url || "/";
  e.waitUntil(self.clients.matchAll({ type: "window" }).then(list => {
    for (const c of list) if (c.url.includes(url) && "focus" in c) return c.focus();
    if (self.clients.openWindow) return self.clients.openWindow(url);
  }));
});
