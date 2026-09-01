// vento-sul-shared/cidades.js
// Subset de CidadesBR.kt — lista de cidades por estado pra dropdowns.
// Pra lista completa (~215 cidades), o nativo gera no build via gen_seed_*.py.
// Aqui mantenho as principais; expansão pode vir de um JSON gerado no Supabase.
//
// Quando adicionar cidades no nativo (CidadesBR.kt → cidadesPorEstado),
// replicar aqui ou rodar `node gen-cidades-from-kotlin.js` (a fazer).

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VSCidades = factory();
})(typeof self !== "undefined" ? self : this, function () {

  const CIDADES_POR_ESTADO = {
    "Santa Catarina": [
      "Florianópolis","Balneário Camboriú","Bombinhas","Garopaba","Itajaí",
      "Itapema","Laguna","Imbituba","Criciúma","Joinville","Blumenau",
      "Chapecó","Lages","São José","Biguaçu","Palhoça","Penha","Navegantes",
      "Tubarão","Brusque","Jaraguá do Sul","São Bento do Sul","Rio do Sul",
      "Concórdia","Caçador","Camboriú","Araranguá","Indaial","Gaspar"
    ],
    "Paraná": [
      // Capital + Litoral histórico (turístico)
      "Curitiba","Antonina","Morretes","Paranaguá","Matinhos","Guaratuba","Pontal do Paraná",
      // Demais top
      "Foz do Iguaçu","Londrina","Maringá","Ponta Grossa","Cascavel",
      "Pato Branco","Guarapuava","São José dos Pinhais","Colombo",
      "Araucária","Pinhais","Apucarana","Toledo","Umuarama",
      "Campo Largo","Almirante Tamandaré"
    ],
    "Rio Grande do Sul": [
      "Porto Alegre","Caxias do Sul","Canoas","Pelotas","Santa Maria",
      "Gramado","Canela","Bento Gonçalves","Torres","Tramandaí","Imbé",
      "Capão da Canoa","Xangri-lá","Osório","Rio Grande","Passo Fundo",
      "Novo Hamburgo","São Leopoldo","Viamão","Gravataí","Cachoeirinha",
      "Alvorada","Sapucaia do Sul","Esteio","Erechim","Bagé","Uruguaiana",
      "Ijuí","Santa Cruz do Sul","Lajeado","Vacaria","Cachoeira do Sul"
    ]
  };

  const ESTADOS = Object.keys(CIDADES_POR_ESTADO);

  function cidadesDe(estado) {
    return CIDADES_POR_ESTADO[estado] || [];
  }

  function estadoDe(cidade) {
    for (const e of ESTADOS) {
      if (CIDADES_POR_ESTADO[e].includes(cidade)) return e;
    }
    return null;
  }

  // Apelidos pra cobrir transcrições erradas do STT (espelha CidadesBR.apelidosCidade do nativo)
  const APELIDOS = {
    "floripa": "Florianópolis", "ilha": "Florianópolis", "ilha da magia": "Florianópolis",
    "florianopolis": "Florianópolis", "florinopolis": "Florianópolis",
    "praia mole": "Florianópolis", "joaquina": "Florianópolis", "campeche": "Florianópolis",
    "jurere": "Florianópolis", "ingleses": "Florianópolis", "lagoa da conceicao": "Florianópolis",
    "balneario": "Balneário Camboriú", "bc": "Balneário Camboriú", "camboriu": "Balneário Camboriú",
    "balneario camboriu": "Balneário Camboriú", "balneari camburiu": "Balneário Camboriú",
    "bombas": "Bombinhas", "bombi": "Bombinhas",
    "garopa": "Garopaba", "garopaba": "Garopaba",
    "imbi": "Imbituba", "imbituba": "Imbituba",
    "naveg": "Navegantes", "navegantes": "Navegantes",
    "ita": "Itajaí", "itajai": "Itajaí",
    "itapema": "Itapema",
    "blu": "Blumenau", "blumenau": "Blumenau",
    "joinvile": "Joinville", "joinville": "Joinville", "jlle": "Joinville",
    "jaragua": "Jaraguá do Sul",
    "lages": "Lages", "chapeco": "Chapecó", "criciuma": "Criciúma",
    "foz": "Foz do Iguaçu", "iguacu": "Foz do Iguaçu", "cataratas": "Foz do Iguaçu",
    "curitiba": "Curitiba", "cwb": "Curitiba",
    "matinhos": "Matinhos", "guaratuba": "Guaratuba", "antonina": "Antonina",
    "morretes": "Morretes", "paranagua": "Paranaguá", "ilha do mel": "Paranaguá",
    "ponta grossa": "Ponta Grossa", "pg": "Ponta Grossa",
    "londrina": "Londrina", "maringa": "Maringá",
    "poa": "Porto Alegre", "porto alegre": "Porto Alegre",
    "caxias": "Caxias do Sul", "santa cruz": "Santa Cruz do Sul",
    "torres": "Torres", "tramandai": "Tramandaí", "imbe": "Imbé",
    "capao da canoa": "Capão da Canoa", "xangri": "Xangri-lá",
    "rio grande": "Rio Grande", "pelotas": "Pelotas",
    "gramado": "Gramado", "canela": "Canela", "bento": "Bento Gonçalves",
    "santa maria": "Santa Maria", "passo fundo": "Passo Fundo",
    "novo hamburgo": "Novo Hamburgo", "sao leo": "São Leopoldo"
  };

  function norm(s) {
    return String(s || "").toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9 ]/g, " ").replace(/ +/g, " ").trim();
  }

  // Levenshtein distance pra fuzzy match
  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let v0 = Array(b.length + 1).fill(0).map((_, i) => i);
    let v1 = Array(b.length + 1).fill(0);
    for (let i = 0; i < a.length; i++) {
      v1[0] = i + 1;
      for (let j = 0; j < b.length; j++) {
        const cost = a[i] === b[j] ? 0 : 1;
        v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
      }
      [v0, v1] = [v1, v0];
    }
    return v0[b.length];
  }

  /**
   * Resolve cidade a partir de texto livre falado.
   * Mesma estratégia do NavParser.kt: nomes longos primeiro, apelidos, fuzzy fallback.
   * @returns {{cidade,estado}|null}
   */
  function resolverCidade(texto) {
    const t = norm(texto);
    if (!t) return null;
    // 1) match direto cidade (longas primeiro)
    const todas = ESTADOS.flatMap(e => CIDADES_POR_ESTADO[e].map(c => ({ c, e, n: norm(c) })))
      .sort((a, b) => b.n.length - a.n.length);
    for (const { c, e, n } of todas) {
      const re = new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`);
      if (re.test(t)) return { cidade: c, estado: e };
    }
    // 2) apelidos (longos primeiro)
    const aps = Object.entries(APELIDOS).map(([a, c]) => ({ a, c, n: norm(a) }))
      .sort((x, y) => y.n.length - x.n.length);
    for (const { c, n } of aps) {
      const re = new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`);
      if (re.test(t)) {
        const e = estadoDe(c);
        if (e) return { cidade: c, estado: e };
      }
    }
    // 3) fuzzy
    const palavras = t.split(" ").filter(p => p.length >= 4);
    let best = null;
    for (const p of palavras) {
      for (const { c, e, n } of todas) {
        const base = n.split(" ")[0] || n;
        const tol = Math.max(1, Math.floor(base.length * 0.25));
        const d = levenshtein(p, base);
        if (d <= tol && (!best || d < best.d)) best = { c, e, d };
      }
    }
    if (best) return { cidade: best.c, estado: best.e };
    return null;
  }

  function todasCidades() {
    return ESTADOS.flatMap(e => CIDADES_POR_ESTADO[e].map(c => ({ cidade: c, estado: e })));
  }

  return { ESTADOS, CIDADES_POR_ESTADO, APELIDOS, cidadesDe, estadoDe, todasCidades, resolverCidade };
});
