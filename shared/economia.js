// vento-sul-shared/economia.js?v=1
// Fonte única das REGRAS econômicas no cliente — espelha o whitepaper (rpc whitepaper_get).
//
// ═══════════════════════════════════════════════════════════════════
// MODELO: SULCOIN É O SANGUE DO APP
//   dinheiro real → vira § → vira SERVIÇO → serviço move a rede.
//   § NUNCA vira dinheiro de volta. Sem saque, nunca.
//
//   TURISTA: ganha § (bônus, missões, cashback) → gasta em desconto
//            nos comércios parceiros (que SÃO obrigados a aceitar).
//   COMERCIANTE: recebe § dos clientes / pacotes / plano VIP →
//            compra serviços da plataforma com § (propaganda automática
//            com matching, auditoria NF, coletivas organizadas, rádio…).
//   PLATAFORMA: automação (matching por dados, triggers, coletivas,
//            rádio) entrega os serviços a custo ~zero — é isso que faz
//            cada § valer mais dentro da rede do que fora dela.
// ═══════════════════════════════════════════════════════════════════
//
// Se mudar regra: edite no whitepaper (admin → regras) e atualize este
// espelho. Nunca hardcode valores nas páginas.

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VSEconomia = factory();
})(typeof self !== "undefined" ? self : this, function () {

  // =====================================================================
  // REGRAS — FONTE ÚNICA NO CLIENTE (espelho do whitepaper v1.5)
  // =====================================================================
  const REGRAS = {
    versao_whitepaper: "1.5",
    modelo: "voucher", // pontos fechados, sem conversão em dinheiro

    // Valor de referência (decisão 2026-08-23): whitepaper vence.
    // Compra de pacote: R$1 ≈ 1,5§  →  1§ ≈ R$0,67
    VALOR_SULI_BRL: 0.67,
    PACOTE: { brl: 1.0, sulis: 1.5 }, // R$1 compra 1,5§

    // Resgate do COMERCIANTE: converte § acumulado em crédito da mensalidade VIP.
    // Fator menor que a compra (spread cooperativo → pool Plataforma).
    RESGATE_COMERCIANTE: { brl_por_suli: 0.25, min_sulis: 500 },

    // SAQUE PIX: NUNCA EXISTE. § é direito a serviço dentro da rede.
    SAQUE: { ativo: false, motivo: "§ é serviço, não dinheiro — circula na rede ou não vale" },

    // Dever do comerciante parceiro (WP §3.2): aceitar § como parte do pagamento.
    COMERCIANTE: {
      aceitar_sulis: true,
      cashback_min_pct: 0.05,   // mínimo sugerido de cashback em § sobre a venda
      conversao_venda_pct: 0.30 // até 30% da conta pode ser paga em §
    },

    // Catálogo de SERVIÇOS que o comerciante compra com § (o destino do sangue).
    // Preços ancorados em BRL de mercado ÷ taxa oficial (R$0,67/§).
    // Sincronizar com sc_services_catalog via supabase/sql/economia-unificada.sql.
    SERVICOS_PLATAFORMA: [
      { codigo: "propaganda_automatica", nome: "Propaganda automática com matching",
        preco_sulis: 75, unidade: "campanha/semana",
        descricao: "App entrega sua promoção pra quem JÁ quer esse produto (dados + matches_proximos). Fim do panfleto e do anúncio em rede social." },
      { codigo: "compra_coletiva_organizada", nome: "Compra coletiva organizada",
        preco_sulis: 150, unidade: "coletiva",
        descricao: "Plataforma monta a coletiva do seu produto: capta o grupo, barateia o preço e manda o movimento pra sua barraca." },
      { codigo: "compra_programada", nome: "Compra programada (recorrência)",
        preco_sulis: 45, unidade: "setup",
        descricao: "Clientes assinam compra recorrente do seu produto — receita previsível pros dois lados." },
      { codigo: "auditoria_nf", nome: "Auditoria de notas fiscais",
        preco_sulis: 135, unidade: "mês",
        descricao: "IA confere suas NFs e aponta crédito/dedução perdida e divergências — redução real de imposto." },
      { codigo: "spot_radio", nome: "Spot na Rádio Vento Sul",
        preco_sulis: 60, unidade: "semana/1x dia",
        descricao: "Sua mensagem no streaming da rádio do app." },
      { codigo: "push_geofenced", nome: "Push georreferenciado",
        preco_sulis: 200, unidade: "disparo", ja_no_banco: true,
        descricao: "Notificação pra usuários num raio da sua porta (serviço já ativo no catálogo)." },
      { codigo: "destaque_mais_votados", nome: "Destaque Mais Votados",
        preco_sulis: 3000, unidade: "7 dias", ja_no_banco: true },
      { codigo: "carrossel_landing", nome: "Carrossel do Landing",
        preco_sulis: 10000, unidade: "7 dias", ja_no_banco: true }
    ],

    // Emissão pro turista
    BONUS_DIARIO_SULIS: 50,
    INDICACAO_SULIS: 200,
    GERACOES_IA_GRATIS: 3,
    CUSTO_GERACAO_SULIS: 10,

    // Split por transação com § (whitepaper 14.3)
    SPLIT_TX: { destino: 0.97, magos: 0.01, bonus: 0.005, plataforma: 0.005, hub: 0.01 },

    // Guardas
    CAP_EMISSAO_DIARIA_SULIS: 1000,   // por conta, sem aprovação manual
    ALERTA_POOL_MIN_BRL: 500,          // notifica admin se pool livre < isso

    // Fase semente: até 50% da receita mantém o app até se pagar
    FASE_SEMENTE_TETO: 0.50,

    // Planos (whitepaper 3.1 / 18)
    PLANOS: {
      gratis: { brl_mes: 0, geracoes_ia_mes: 0, sulis_inclusos: 0 },
      vip: { brl_mes: 199, geracoes_ia_mes: 30, sulis_inclusos: 500 },
      grande: { brl_mes: 799, futuro: true },
      b2g: { brl_mes_min: 5000, brl_mes_max: 30000 }
    }
  };

  // Mapa pools banco ↔ whitepaper §14 (compatibilidade, sem renomear nada agora)
  const MAPA_POOLS_WP = {
    app: "Plataforma",
    fundador: "Plataforma",
    premios: "Bônus",
    premios_assistir_video: "Bônus",
    premios_missoes_sociais: "Missões",
    premios_quests_jogo: "Missões",
    propaganda: "DOOH",
    propaganda_jogo: "Missões",
    propaganda_radio: "DOOH",
    propaganda_redes_sociais: "DOOH",
    promocoes_devolucao: "Descontos"
  };

  let _supabase = null;
  let _supaUrl = null;
  let _apiKey = null;

  function init({ supabase = null, supaUrl = null, apiKey = null } = {}) {
    _supabase = supabase;
    _supaUrl = supaUrl;
    _apiKey = apiKey;
  }

  function _headers() {
    // Mesmo padrão das páginas públicas: apikey + Bearer na própria chave anon
    // (RLS libera leituras de transparência/catálogo sem JWT).
    return {
      apikey: _apiKey || "",
      Authorization: "Bearer " + (_apiKey || ""),
      "Content-Type": "application/json"
    };
  }

  async function _rpc(nome, params = {}) {
    if (_supabase && _supabase.rpc) {
      try { return await _supabase.rpc(nome, params); }
      catch (e) { console.warn(`VSEconomia.${nome}:`, e.message); return null; }
    }
    if (!(_supaUrl && (_apiKey || _apiKey === ""))) throw new Error("VSEconomia não inicializado");
    const r = await fetch(`${_supaUrl}/rest/v1/rpc/${nome}`, {
      method: "POST", headers: _headers(), body: JSON.stringify(params)
    });
    if (!r.ok) throw new Error(`RPC ${nome}: HTTP ${r.status}`);
    return r.json();
  }

  // ===================== LEITURAS (dados) =====================

  async function statsAdmin() {
    return _rpc("stats_admin");
  }

  async function dashboardTransparencia() {
    return _rpc("dashboard_transparencia");
  }

  async function poolsFloripa(regiao = "floripa-sc") {
    const r = await fetch(`${_supaUrl}/rest/v1/transparencia_pools?region_id=eq.${encodeURIComponent(regiao)}`, { headers: _headers() });
    if (!r.ok) throw new Error("pools " + r.status);
    return r.json();
  }

  async function catalogoServicos() {
    const r = await fetch(`${_supaUrl}/rest/v1/sc_services_catalog?select=*&ativo=eq.true`, { headers: _headers() });
    if (!r.ok) throw new Error("catalogo " + r.status);
    return r.json();
  }

  // Catálogo unificado: serviços do banco + preço BRL derivado pela taxa oficial.
  async function catalogoUnificado() {
    const itens = await catalogoServicos();
    return (itens || []).map(s => ({
      ...s,
      preco_brl: s.preco_sulis != null ? +(s.preco_sulis * REGRAS.VALOR_SULI_BRL).toFixed(2) : null
    }));
  }

  async function whitepaperGet() {
    return _rpc("whitepaper_get");
  }

  // ===================== HELPERS =====================

  function formatarBRL(centavosOuReais, ehCentavos = false) {
    const v = ehCentavos ? centavosOuReais / 100 : centavosOuReais;
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  // § → BRL pela taxa de COMPRA (o que vale pra quem compra pacote)
  function sulisParaBRLCompra(sulis) {
    return +(sulis / PACOTE_SULIS_POR_REAL()).toFixed(2);
  }

  function PACOTE_SULIS_POR_REAL() { return REGRAS.PACOTE.sulis / REGRAS.PACOTE.brl; }

  // § → crédito na mensalidade do comerciante (taxa de RESGATE)
  function sulisParaCreditoMensalidade(sulis) {
    return +(sulis * REGRAS.RESGATE_COMERCIANTE.brl_por_suli).toFixed(2);
  }

  function brlParaSulis(brl) {
    return Math.round(brl * PACOTE_SULIS_POR_REAL());
  }

  // Guarda client-side (o banco continua sendo a verdade final via RPC SECURITY DEFINER)
  function validarOperacao({ tipo, sulis }) {
    if (!Number.isFinite(sulis) || sulis <= 0) return { ok: false, motivo: "quantidade inválida" };
    if (tipo === "saque") return { ok: false, motivo: REGRAS.SAQUE.motivo };
    if (["emissao", "ganhar"].includes(tipo) && sulis > REGRAS.CAP_EMISSAO_DIARIA_SULIS) {
      return { ok: false, motivo: `cap diário de ${REGRAS.CAP_EMISSAO_DIARIA_SULIS}§ excedido` };
    }
    if (tipo === "resgate_mensalidade" && sulis < REGRAS.RESGATE_COMERCIANTE.min_sulis) {
      return { ok: false, motivo: `mínimo de ${REGRAS.RESGATE_COMERCIANTE.min_sulis}§ pro resgate` };
    }
    return { ok: true, motivo: null };
  }

  // Catálogo de serviços do comerciante (com BRL derivado pela taxa oficial)
  function servicosComBRL() {
    return REGRAS.SERVICOS_PLATAFORMA.map(s => ({
      ...s,
      preco_brl: s.preco_sulis != null ? +(s.preco_sulis * REGRAS.VALOR_SULI_BRL).toFixed(2) : null
    }));
  }

  function servicoPorCodigo(codigo) {
    return REGRAS.SERVICOS_PLATAFORMA.find(s => s.codigo === codigo) || null;
  }

  // Texto pronto das regras (pra listas visuais e prompts de IA — nunca mais hardcode)
  function textoRegras() {
    const R = REGRAS;
    const servs = R.SERVICOS_PLATAFORMA
      .map(s => `${s.nome} ${s.preco_sulis}§`)
      .slice(0, 5).join(", ");
    return [
      `SulCoin (§): é o sangue do app — serviço dentro da rede, NUNCA dinheiro, NUNCA saque`,
      `Turista ganha § (bônus diário ${R.BONUS_DIARIO_SULIS}§, indicação ${R.INDICACAO_SULIS}§, cashback) e gasta em desconto nos comércios parceiros`,
      `Comerciante PARCEIRO É OBRIGADO a aceitar §: até ${(R.COMERCIANTE.conversao_venda_pct * 100).toFixed(0)}% da conta pode ser paga em §, cashback mínimo sugerido ${(R.COMERCIANTE.cashback_min_pct * 100).toFixed(0)}%`,
      `Comerciante usa § pra comprar serviços da plataforma: ${servs}, entre outros`,
      `Compra de pacote: R$${R.PACOTE.brl.toFixed(2)} = ${R.PACOTE.sulis}§ · Resgate em crédito da mensalidade VIP: R$${R.RESGATE_COMERCIANTE.brl_por_suli.toFixed(2)}/§ (mín ${R.RESGATE_COMERCIANTE.min_sulis}§)`,
      `IA promoção: ${R.GERACOES_IA_GRATIS} grátis → ${R.CUSTO_GERACAO_SULIS}§/geração · Split por transação: ${(R.SPLIT_TX.destino * 100).toFixed(0)}% destino · ${(R.SPLIT_TX.magos * 100)}% Magos · ${(R.SPLIT_TX.bonus * 100)}% Bônus · ${(R.SPLIT_TX.plataforma * 100)}% Plataforma · ${(R.SPLIT_TX.hub * 100)}% Hub`,
      `Cap de emissão: ${R.CAP_EMISSAO_DIARIA_SULIS}§/dia por conta · Fase semente: até ${R.FASE_SEMENTE_TETO * 100}% da receita sustenta o app`
    ].join(" | ");
  }

  return {
    REGRAS, MAPA_POOLS_WP,
    init, statsAdmin, dashboardTransparencia, poolsFloripa,
    catalogoServicos, catalogoUnificado, whitepaperGet,
    servicosComBRL, servicoPorCodigo,
    formatarBRL, sulisParaBRLCompra, sulisParaCreditoMensalidade,
    brlParaSulis, validarOperacao, textoRegras
  };
});
