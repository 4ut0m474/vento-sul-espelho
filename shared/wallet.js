// vento-sul-shared/wallet.js
// Port de SulcoinsRepository.kt — leitura + RPCs de movimentação.
//
// IMPORTANTE: as views v_my_* e RPCs com p_para_user_id exigem AUTH JWT.
// Sem auth ativa retorna null/throw. Pra escrever (transferir, ganhar, etc),
// chamar via bot Node (BOT_API_URL) ou ativar Supabase Auth no cliente.

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VSWallet = factory();
})(typeof self !== "undefined" ? self : this, function () {

  let _supabase = null;
  let _botApi = null;

  function init({ supabase, botApi = null } = {}) {
    _supabase = supabase;
    _botApi = botApi; // function (path, body) -> Promise<json>
  }

  // =====================================================
  // LEITURA — exige session JWT (Supabase Auth ou bot)
  // =====================================================

  async function myWallet() {
    if (!_supabase) return null;
    try {
      const r = await _supabase.from("v_my_wallet").select().get();
      return Array.isArray(r) && r.length ? r[0] : null;
    } catch (e) {
      // 401 = sem auth. Devolve null, deixa caller decidir.
      if (e.status === 401) return null;
      console.warn("myWallet:", e.message);
      return null;
    }
  }

  async function myHistory(limit = 50) {
    if (!_supabase) return [];
    try {
      return await _supabase.from("v_my_tx_history")
        .select("*").order("created_at", true).limit(limit).get() || [];
    } catch (e) {
      if (e.status === 401) return [];
      return [];
    }
  }

  // =====================================================
  // HEARTBEAT — chama na abertura do app
  // =====================================================

  async function heartbeat() {
    if (!_supabase) return null;
    try { return await _supabase.rpc("heartbeat_wallet"); }
    catch (e) { if (e.status === 401) return null; throw e; }
  }

  // =====================================================
  // ESCRITA — preferencialmente via bot (assinatura initData)
  // =====================================================

  async function transferirSulis({ paraUserId, sulis, mensagem = null }) {
    if (_botApi) {
      return _botApi("/api/wallet/transferir", { paraUserId, sulis, mensagem });
    }
    if (!_supabase) throw new Error("Wallet não inicializada");
    return _supabase.rpc("transferir_sulis", {
      p_para_user_id: paraUserId,
      p_sulis: sulis,
      ...(mensagem ? { p_mensagem: mensagem } : {})
    });
  }

  // Versão que aceita email — wrapper SQL transferir_sulis_por_email
  async function transferirPorEmail({ email, sulis, mensagem = null }) {
    if (!_supabase) throw new Error("Wallet não inicializada");
    return _supabase.rpc("transferir_sulis_por_email", {
      p_email: email,
      p_sulis: sulis,
      ...(mensagem ? { p_mensagem: mensagem } : {})
    });
  }

  async function ganharSulcoin({ sulis, refTipo, refId, mensagem = null, rateLimitPerDay = 3000 }) {
    if (_botApi) {
      return _botApi("/api/wallet/ganhar", { sulis, refTipo, refId, mensagem, rateLimitPerDay });
    }
    if (!_supabase) throw new Error("Wallet não inicializada");
    return _supabase.rpc("ganhar_sulcoin", {
      p_sulis: sulis,
      p_ref_tipo: refTipo,
      p_ref_id: refId,
      ...(mensagem ? { p_mensagem: mensagem } : {}),
      p_rate_limit_per_day: rateLimitPerDay
    });
  }

  async function bloquearSulcoin({ sulis, refTipo, refId, mensagem = null }) {
    if (_botApi) return _botApi("/api/wallet/bloquear", { sulis, refTipo, refId, mensagem });
    if (!_supabase) throw new Error("Wallet não inicializada");
    return _supabase.rpc("bloquear_sulcoin", {
      p_sulis: sulis, p_ref_tipo: refTipo, p_ref_id: refId,
      ...(mensagem ? { p_mensagem: mensagem } : {})
    });
  }

  async function desbloquearSulcoin({ sulis, refTipo, refId, mensagem = null }) {
    if (_botApi) return _botApi("/api/wallet/desbloquear", { sulis, refTipo, refId, mensagem });
    if (!_supabase) throw new Error("Wallet não inicializada");
    return _supabase.rpc("desbloquear_sulcoin", {
      p_sulis: sulis, p_ref_tipo: refTipo, p_ref_id: refId,
      ...(mensagem ? { p_mensagem: mensagem } : {})
    });
  }

  // ────── Bônus diário ──────
  async function dailyBonusStatus() {
    if (!_supabase) return null;
    try { return await _supabase.rpc("daily_bonus_status"); }
    catch (e) { if (e.status === 401) return null; return null; }
  }
  async function claimDailyBonus() {
    if (!_supabase) throw new Error("Wallet não inicializada");
    // Versão safe garante que a wallet do user existe (auto-cria free 30 dias)
    return _supabase.rpc("claim_daily_bonus_safe");
  }

  // ────── Pool transparente (lastro real, em tempo real) ──────
  async function poolStatus() {
    if (!_supabase) return null;
    try { return await _supabase.rpc("pool_status"); } catch { return null; }
  }

  // ────── Forjas (origem rastreável dos meus sulis) ──────
  async function minhasForjas(limit = 50) {
    if (!_supabase) return [];
    try {
      return await _supabase.from("v_minhas_forjas")
        .select("*").order("criado_em", true).limit(limit).get() || [];
    } catch { return []; }
  }

  async function verificarForja(forjaId) {
    if (!_supabase) return null;
    try { return await _supabase.rpc("verificar_forja", { p_forja_id: forjaId }); }
    catch { return null; }
  }

  // ────── Reservas (oportunidades em andamento) ──────
  async function minhasReservas(limit = 30) {
    if (!_supabase) return [];
    try {
      return await _supabase.from("v_minhas_reservas")
        .select("*").order("criado_em", true).limit(limit).get() || [];
    } catch { return []; }
  }

  async function listarServicos() {
    if (!_supabase) return [];
    try {
      return await _supabase.from("sc_services_catalog")
        .select("*").eq("ativo", true).get() || [];
    } catch { return []; }
  }

  // =====================================================
  // FORMATTERS (UX consistente entre versões)
  // =====================================================

  /**
   * Formata sulis em string SC. Ex: 1234 sulis → "12,34 SC"
   * 1 SC = 100 sulis
   */
  function formatarSulis(sulis) {
    if (sulis == null) return "—";
    const sc = sulis / 100;
    return `${sc.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SC`;
  }

  function formatarSulisCompacto(sulis) {
    if (sulis == null) return "—";
    if (sulis < 100) return `${sulis} sulis`;
    return formatarSulis(sulis);
  }

  function tipoTxLabel(tipo) {
    const map = {
      ENTRADA: "Entrada anual",
      RECEBIDO: "Recebido",
      ENVIADO: "Enviado",
      MISSAO: "Missão",
      CACA_WP: "Caça waypoint",
      BLOQUEIO: "Bloqueio",
      DESBLOQUEIO: "Desbloqueio",
      PACOTE: "Pacote SC",
      SERVICO: "Serviço",
      REATIVACAO: "Reativação",
    };
    return map[String(tipo || "").toUpperCase()] || tipo;
  }

  return {
    init, myWallet, myHistory, heartbeat,
    transferirSulis, transferirPorEmail, ganharSulcoin, bloquearSulcoin, desbloquearSulcoin, listarServicos,
    dailyBonusStatus, claimDailyBonus,
    poolStatus, minhasForjas, minhasReservas, verificarForja,
    formatarSulis, formatarSulisCompacto, tipoTxLabel
  };
});
