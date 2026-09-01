// vento-sul-shared/intencao.js
// Port fiel de:
//   ui/voice/inteligencia/IntencaoDetector.kt
//   ui/voice/inteligencia/Intencao.kt
//
// Quando mudar IntencaoDetector.kt no nativo, replicar AQUI e rodar sync-shared.sh
//
// 8 intenções, mesma ordem de match do Kotlin:
//   1) AbrirAcao    2) ListarPromocoes   3) MaisVotados   4) BuscarBarraca
//   5) SugerirProximas   6) ExplicarTermo   7) DescreverLugar   8) IrParaCidade
// Fallback: NaoEntendi.

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VSIntencao = factory();
})(typeof self !== "undefined" ? self : this, function () {

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "") // tira acentos
      .replace(/[^\p{L}\p{Nd} ]/gu, " ")
      .replace(/ +/g, " ")
      .trim();
  }

  function contem(t, ...termos) {
    const nt = " " + norm(t) + " ";
    return termos.some(x => nt.includes(" " + norm(x) + " "));
  }

  // Mesmo dicionário do Kotlin (CidadesBR.sinonimosPorAcao + IntencaoDetector.acaoMap)
  const ACAO_MAP = {
    promocoes:        ["promo","promocao","promocoes","desconto","oferta"],
    barracas:         ["feira","barraca","vende","comprar"],
    mais_votados:     ["mais votado","mais votados","ranking","preferido"],
    caca:             ["caca","tesouro","missao","missoes"],
    trilhas:          ["trilha","trilhas"],
    compras_coletiva: ["compra coletiva","compras coletivas","coletiva"],
    wallet:           ["carteira","saldo","sulcoin"],
    perto:            ["perto de mim","lugar perto","proximo de mim"],
  };
  const VERBOS_ABRIR = ["abre","vai pra","leva","mostra","quero ver"];

  const PALAVRAS_BARRACA = [
    "cerveja","vinho","mel","cafe","camarao","peixe","tainha","queijo",
    "pao","pizza","sorvete","artesanato","frutos do mar","ostras",
    "uva","suco","cachaca","bombom","doce","churrasco","pastel"
  ];

  const TERMOS_EXPLICAR = {
    sulcoin: [
      "o que e sulcoin","como funciona sulcoin","como ganho sulcoin",
      "explica sulcoin","que e sulcoin"
    ],
    compras_coletiva: [
      "como funciona compra coletiva","que e compra coletiva"
    ],
    feira: [
      "como funciona a feira","que e a feira","como compro barraca"
    ],
    votos: [
      "como vota","como funciona o voto","como dou voto"
    ],
    caca: [
      "como funciona a caca","que e a caca","explica caca"
    ],
  };

  /**
   * @param {string} texto
   * @param {string|null} cidadeContexto cidade atualmente selecionada
   * @param {object|null} navParser  { parse(texto) -> {estado,cidade} } opcional
   * @returns {{tipo:string, ...}}
   */
  function detectar(texto, cidadeContexto = null, navParser = null) {
    const t = norm(texto);

    // 1) AbrirAcao
    for (const acao of Object.keys(ACAO_MAP)) {
      const termos = ACAO_MAP[acao];
      if (contem(t, ...termos) && contem(t, ...VERBOS_ABRIR)) {
        return { tipo: "abrir_acao", acao };
      }
    }

    // 2) ListarPromocoes (sem verbo de abrir)
    if (contem(t, "tem promo","tem desconto","tem oferta",
                  "qual a promo","quais promocoes")) {
      return { tipo: "listar_promocoes", cidade: cidadeContexto };
    }

    // 3) MaisVotados
    if (contem(t, "mais votado","preferido","que a galera curte",
                  "que tem de bom","melhor da cidade")) {
      return { tipo: "mais_votados", cidade: cidadeContexto };
    }

    // 4) BuscarBarraca
    for (const palavra of PALAVRAS_BARRACA) {
      if (contem(t, palavra) &&
          contem(t, "tem","vende","onde acho","onde compro","quero")) {
        return { tipo: "buscar_barraca", termo: palavra };
      }
    }

    // 5) SugerirProximas (praias próximas)
    if (contem(t, "praias proximas","outras praias","tem outra",
                  "mais opcoes","outras opcoes","perto daqui")) {
      return { tipo: "sugerir_proximas", cidade: cidadeContexto };
    }

    // 6) ExplicarTermo
    for (const termo of Object.keys(TERMOS_EXPLICAR)) {
      if (contem(t, ...TERMOS_EXPLICAR[termo])) {
        return { tipo: "explicar_termo", termo };
      }
    }

    // 7) DescreverLugar (genérico)
    if (contem(t, "que tem aqui","conta sobre","fala desse lugar",
                  "fala dessa cidade","me fala da cidade","como e aqui",
                  "que tem pra fazer")) {
      return { tipo: "descrever_lugar", cidade: cidadeContexto };
    }

    // 8) IrParaCidade — usa NavParser custom OU VSCidades.resolverCidade (default)
    if (navParser && typeof navParser.parse === "function") {
      const m = navParser.parse(texto);
      if (m && m.cidade && m.estado) {
        return { tipo: "ir_para_cidade", estado: m.estado, cidade: m.cidade };
      }
    } else if (typeof window !== "undefined" && window.VSCidades?.resolverCidade) {
      const m = window.VSCidades.resolverCidade(texto);
      if (m) return { tipo: "ir_para_cidade", estado: m.estado, cidade: m.cidade };
    }

    return { tipo: "nao_entendi" };
  }

  return { detectar, norm };
});
