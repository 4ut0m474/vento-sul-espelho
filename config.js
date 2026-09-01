// Configuração do mini app — preenche aqui pra reusar o mesmo Supabase do app nativo.

// Safe localStorage — fallback em memória se Safari private mode ou iOS restrito lançar SecurityError
(function() {
  try { localStorage.setItem('_vs_t','1'); localStorage.removeItem('_vs_t'); }
  catch(e) {
    var _m = {};
    Object.defineProperty(window, 'localStorage', { value: {
      getItem: function(k) { return Object.prototype.hasOwnProperty.call(_m,k) ? _m[k] : null; },
      setItem: function(k,v) { _m[k] = String(v); },
      removeItem: function(k) { delete _m[k]; },
      clear: function() { _m = {}; },
      key: function(i) { return Object.keys(_m)[i] || null; },
      get length() { return Object.keys(_m).length; }
    }, writable: false });
  }
})();

// 📸 Fonte de imagem — 04/08/2026: POLLINATIONS ARRANCADO.
// Historico: em 11/06 o pollinations virou pago (403) e foi posto um reescritor
// pra loremflickr. Hoje o loremflickr devolve 500 em toda chamada e o pollinations
// devolve 429 (rate limit) — as DUAS fontes morreram. Nao entra substituto de
// terceiro aqui: a fonte boa ja e o Wikimedia Commons (770 fotos reais em
// fotos_locais), servido direto pelo banco.
// Quem usava isto degrada sozinho, de proposito:
//   jornal.html      -> const PROXY = (window.VS_PROXY_IMG || ((u)=>u))  = identidade
//   aurora-classes   -> if (proxy) ... ; return "/icons/icon-192.png"    = icone local

window.VENTOSUL_CONFIG = {
  SUPABASE_URL: "https://vdrzndgkwdpibexjkyxi.supabase.co",
  SUPABASE_ANON: "sb_publishable_UuXuHUDxe7nmhE-Z9qu-0w_1tv2IrvC",
  // JWT anon legado — exigido por Edge Functions (sb_publishable_* dá Invalid JWT).
  // Não substitui SUPABASE_ANON; usado em VSLitoraneaAI/Edge para HEADER Authorization.
  SUPABASE_ANON_JWT: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkcnpuZGdrd2RwaWJleGpreXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyODA0MTAsImV4cCI6MjA4Njg1NjQxMH0.pE1cUYQ-gL6iJfpeZREvTnG1R1sG2DGEnA_pB0tKx60",
  // URL do bot Node (./bot/) que valida initData e fala com Supabase.
  // Vazio = leitura pública só (votos/comprar barraca/pix exigem bot).
  BOT_API_URL: "",
  // 📲 VAPID public key — push notifications (privada fica em Supabase secrets +
  // backup /opt/ventosul/keys/vapid-*.key na VPS). Par PRÓPRIO gerado 2026-07-06;
  // a antiga era a pública do Firebase (privada mora no Google = envio sempre 403).
  VAPID_PUBLIC_KEY: "BGC9GDXpIGR8V0b1FqOuTKg5nK5jUvwVq_hLwLJclTLLJE0VixDofc5BK1GRVJg4xlHbKLgHfW_1m1R-e5T6cr0",
  // Cidades por estado — espelha CidadesBR.kt do app nativo (subset principal aqui;
  // pra lista completa importe o JSON gerado na build do app nativo).
  CIDADES: {
    "Santa Catarina": [
      "Florianópolis","Balneário Camboriú","Bombinhas","Garopaba","Itajaí",
      "Itapema","Laguna","Imbituba","Criciúma","Joinville","Blumenau",
      "Chapecó","Lages","São José","Biguaçu","Palhoça","Penha","Navegantes"
    ],
    "Paraná": [
      "Curitiba","Foz do Iguaçu","Londrina","Maringá","Ponta Grossa",
      "Antonina","Morretes","Paranaguá","Matinhos","Guaratuba",
      "Pontal do Paraná","Cascavel","Pato Branco","Guarapuava"
    ],
    "Rio Grande do Sul": [
      "Porto Alegre","Caxias do Sul","Canoas","Pelotas","Santa Maria",
      "Gramado","Canela","Bento Gonçalves","Torres","Tramandaí","Imbé",
      "Capão da Canoa","Xangri-lá","Osório","Rio Grande","Passo Fundo"
    ]
  }
};
