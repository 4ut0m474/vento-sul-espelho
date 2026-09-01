// vento-sul-shared/praias.js
// Port de:
//   data/geo/CidadesBR.kt  (locaisDaCidade, sinonimosPorTag)
//   data/repository/LocalidadeRepository.kt (select em "localidades")
//   data/repository/PertoRepository.kt (distanceMetros)
//
// Fonte de verdade dos lugares: tabela "localidades" no Supabase.
// CidadesBR.kt fica como FALLBACK offline (cache em memória).

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VSPraias = factory();
})(typeof self !== "undefined" ? self : this, function () {

  // Cache em memória por cidade (preenchido on-demand do Supabase)
  const _cacheLocais = new Map();
  let _supabase = null; // injetado via init()

  function init(supabaseClient) { _supabase = supabaseClient; }

  /**
   * Distância em metros (Haversine). Igual a PertoRepository.kt
   */
  function distanceMetros(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = x => x * Math.PI / 180;
    const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(toRad(lng2 - lng1) / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Lista localidades de uma cidade (todos os tipos: praia, atração, bairro, histórico).
   * Equivalente a CidadesBR.locaisDaCidade(cidade) + LocalidadeRepository.list(estado, cidade).
   *
   * Schema esperado da tabela `localidades`:
   *   id, nome, tipo, cidade, estado, sublocal, lat, lng, tags(text[]), foto_url
   */
  async function locaisDaCidade(cidade, estado = null) {
    const cacheKey = `${estado || "*"}|${cidade}`;
    if (_cacheLocais.has(cacheKey)) return _cacheLocais.get(cacheKey);
    if (!_supabase) return [];
    try {
      let q = _supabase.from("localidades")
        .select("id,nome,tipo,sublocal,lat,lng,tags,foto_url")
        .eq("cidade", cidade)
        .order("ordem")
        .limit(30);
      if (estado) q = q.eq("estado", estado);
      const list = await q.get() || [];
      _cacheLocais.set(cacheKey, list);
      return list;
    } catch (e) {
      console.warn("locaisDaCidade falhou:", e.message);
      return [];
    }
  }

  /**
   * Filtra praias da cidade (espelha .filter { it.tipo == "praia" } do Kotlin)
   */
  async function praiasDaCidade(cidade, estado = null, limite = 5) {
    const todos = await locaisDaCidade(cidade, estado);
    return todos.filter(l => l.tipo === "praia").slice(0, limite);
  }

  /**
   * Praia mais próxima da posição GPS (precisa lat/lng nos registros).
   * Equivalente: PertoRepository.maisProximas(lat, lng, raio).
   */
  async function praiaMaisProxima(lat, lng, cidade = null, estado = null) {
    let lista;
    if (cidade) lista = await praiasDaCidade(cidade, estado, 99);
    else if (_supabase) {
      lista = await _supabase.from("localidades")
        .select("id,nome,tipo,cidade,estado,lat,lng,foto_url")
        .eq("tipo","praia")
        .get() || [];
    } else return null;

    let melhor = null, menor = Infinity;
    for (const p of lista) {
      if (p.lat == null || p.lng == null) continue;
      const d = distanceMetros(lat, lng, p.lat, p.lng);
      if (d < menor) { menor = d; melhor = { ...p, distancia_m: d }; }
    }
    return melhor;
  }

  /**
   * Sinônimos por tag — espelha CidadesBR.sinonimosPorTag.
   * Usado pra "quero praia pra surfar" → tag "surfe".
   */
  const SINONIMOS_POR_TAG = {
    sossego: ["sossego","sossegada","sossegado","calma","calmo","tranquila","tranquilo",
              "quieta","quieto","paz","natureza","silencio","isolada"],
    badalada:["badalada","badalado","balada","agitada","agitado","bar","barzinho",
              "festa","musica","musical","vip","movimentada","movimentado","noite"],
    surfe:   ["surfe","surf","surfar","surfando","onda","ondas","esporte","esportiva",
              "mar bravo","vento"],
    familia: ["familia","crianca","criancas","segura","segurao","estrutura","infantil","filhos","filho"],
    historico:["historico","historia","historica","antiga","antigo","centro velho","museu","igreja"],
    trilha:  ["trilha","trilhas","caminhada","caminhar","mata","floresta","verde"],
    gastronomia:["comer","comida","gastronomia","restaurante","restaurantes","bar","almoco","almocar","jantar"]
  };

  /**
   * Dado um texto livre, sugere uma praia que case com a tag identificada.
   * Espelha o fluxo da Litorânea perguntando "sossego, badalada ou onda?".
   */
  async function sugerirPorTag(texto, cidade, estado = null) {
    const t = String(texto || "").toLowerCase();
    let tagEscolhida = null;
    for (const tag of Object.keys(SINONIMOS_POR_TAG)) {
      if (SINONIMOS_POR_TAG[tag].some(s => t.includes(s))) {
        tagEscolhida = tag; break;
      }
    }
    const praias = await praiasDaCidade(cidade, estado, 99);
    if (!tagEscolhida) return praias.slice(0, 3);
    const match = praias.filter(p => Array.isArray(p.tags) && p.tags.includes(tagEscolhida));
    return match.length ? match.slice(0, 3) : praias.slice(0, 3);
  }

  // Limpa cache (útil quando troca de cidade)
  function limparCache() { _cacheLocais.clear(); }

  return {
    init, distanceMetros, locaisDaCidade, praiasDaCidade,
    praiaMaisProxima, sugerirPorTag, SINONIMOS_POR_TAG, limparCache
  };
});
