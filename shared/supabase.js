// vento-sul-shared/supabase.js
// REST + Auth helper. Espelha SupabaseClientProvider.kt + AuthRepository.kt.
//
// Uso:
//   VSSupabase.init(url, anonKey)
//   await VSSupabase.ensureSession()  // anônima ou restaurada do localStorage
//   await VSSupabase.signIn(email, senha)
//   await VSSupabase.from("v_my_wallet").select().get()
//   await VSSupabase.rpc("responder_intencao", { ... })

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VSSupabase = factory();
})(typeof self !== "undefined" ? self : this, function () {

  let _url = "";
  let _key = "";
  let _accessToken = null;
  let _refreshToken = null;
  let _session = null;
  const LS_SESSION = "vs.sb.session";
  // Cookie fallback: sobrevive a apex↔www e a qualquer perda de localStorage
  // (Safari ITP, modo privado, navegador limpando storage entre updates do PWA, etc).
  const CK_REFRESH = "vs_sb_rt";

  function _cookieDomain() {
    try {
      const h = location.hostname || "";
      // Em domínio próprio, escopa pra todo o eTLD+1 (apex + www)
      if (/vento-sul\.tech$/i.test(h)) return "; Domain=.vento-sul.tech";
      return "";
    } catch { return ""; }
  }
  function _setCookie(name, value, maxAgeSec) {
    try {
      const sec = (typeof location !== "undefined" && location.protocol === "https:") ? "; Secure" : "";
      const dom = _cookieDomain();
      document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${sec}${dom}`;
    } catch {}
  }
  function _getCookie(name) {
    try {
      const m = (document.cookie || "").match(new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"));
      return m ? decodeURIComponent(m[1]) : null;
    } catch { return null; }
  }
  function _delCookie(name) {
    try {
      const dom = _cookieDomain();
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${dom}`;
    } catch {}
  }

  function init(url, anonKey) {
    _url = String(url || "").replace(/\/+$/, "");
    _key = anonKey || "";
    try {
      const raw = localStorage.getItem(LS_SESSION);
      if (raw) {
        const s = JSON.parse(raw);
        if (s?.access_token) {
          _session = s;
          _accessToken = s.access_token;
          _refreshToken = s.refresh_token;
        }
      }
    } catch {}
    // Fallback: sem sessão em localStorage mas há refresh_token em cookie?
    // Restaura via refresh — recupera login após apex↔www, PWA reinstall, ITP, etc.
    if (!_refreshToken) {
      const rtCookie = _getCookie(CK_REFRESH);
      if (rtCookie) {
        _refreshToken = rtCookie;
        // Refresh assíncrono — preenche _session quando voltar
        _refresh().catch(() => {});
      }
    }
    // Refresh proativo: se token vai expirar em <2min ou já venceu, renova já.
    // Sem isso, primeiro request dá 401 e atrapalha a UX.
    _autoRefreshSeNecessario();
    // Agenda renovação automática a cada 45min (token Supabase vive 1h)
    if (!_refreshTimer) {
      _refreshTimer = setInterval(() => _autoRefreshSeNecessario(), 45 * 60 * 1000);
    }
  }
  let _refreshTimer = null;

  function _tokenExpirouEm() {
    if (!_session?.expires_at) return null;
    const restanteSeg = _session.expires_at - Math.floor(Date.now() / 1000);
    return restanteSeg;
  }
  async function _autoRefreshSeNecessario() {
    if (!_refreshToken) return;
    const restante = _tokenExpirouEm();
    if (restante == null) return;
    if (restante < 120) {
      // < 2min ou já venceu → renova agora
      const ok = await _refresh();
      if (!ok) console.warn("[VSSupabase] refresh proativo falhou — sessão pode ter sido invalidada");
    }
  }
  function setAccessToken(jwt) { _accessToken = jwt || null; }

  function _saveSession(s) {
    if (s?.access_token) {
      // Garante expires_at (timestamp Unix) — Supabase pode mandar só expires_in (segundos)
      if (!s.expires_at && s.expires_in) {
        s.expires_at = Math.floor(Date.now() / 1000) + Number(s.expires_in);
      }
    }
    _session = s;
    _accessToken = s?.access_token || null;
    _refreshToken = s?.refresh_token || null;
    if (s?.access_token) {
      try { localStorage.setItem(LS_SESSION, JSON.stringify(s)); } catch {}
      // Refresh_token em cookie (30 dias) — fallback robusto
      if (s.refresh_token) _setCookie(CK_REFRESH, s.refresh_token, 60 * 60 * 24 * 30);
    } else {
      try { localStorage.removeItem(LS_SESSION); } catch {}
      _delCookie(CK_REFRESH);
    }
  }
  function getSession() {
    return _session ? { session: _session, user: _session.user } : { session: null, user: null };
  }
  function isLoggedIn() { return !!_accessToken; }
  function userEmail() { return _session?.user?.email || null; }
  function userId() { return _session?.user?.id || null; }

  // Login email/senha
  async function signIn(email, password) {
    if (!_url) throw new Error("VSSupabase não inicializado");
    const res = await fetch(`${_url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: _key, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error_description || data.msg || data.error || "Login falhou");
    _saveSession(data);
    return { session: data, user: data.user };
  }

  // Cadastro com email/senha (+ metadata opcional: name, documento)
  async function signUp(email, password, metadata = {}) {
    if (!_url) throw new Error("VSSupabase não inicializado");
    const res = await fetch(`${_url}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: _key, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, data: metadata })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error_description || data.msg || data.error || "Cadastro falhou");
    if (data.access_token) _saveSession(data);
    return { user: data.user, session: data.session || data };
  }

  // Sessão anônima — auth.uid() válido pra wallet/sulcoins
  async function signInAnonymously() {
    if (!_url) throw new Error("VSSupabase não inicializado");
    const res = await fetch(`${_url}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: _key, "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error_description || data.msg || "Anon sign-in falhou");
    if (data.access_token) _saveSession(data);
    return { session: data, user: data.user };
  }

  // Garante sessão: reusa (com refresh se vencida), senão cria anônima.
  // Garante que sempre haja um access_token válido pra próximo request.
  async function ensureSession() {
    if (_accessToken) {
      // Se vencido OU vai vencer em <2min, refresh agora antes de devolver
      const restante = _tokenExpirouEm();
      if (restante != null && restante < 120 && _refreshToken) {
        await _refresh();
      }
      return _session;
    }
    try { return (await signInAnonymously()).session; }
    catch (e) { console.warn("[VSSupabase] ensureSession:", e.message); return null; }
  }

  async function signOut() {
    if (_accessToken) {
      try {
        await fetch(`${_url}/auth/v1/logout`, {
          method: "POST",
          headers: { apikey: _key, Authorization: `Bearer ${_accessToken}` }
        });
      } catch {}
    }
    _saveSession(null);
  }

  // Renova sessão se 401 — usa refresh_token
  async function _refresh() {
    if (!_refreshToken) return false;
    try {
      const res = await fetch(`${_url}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: { apikey: _key, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: _refreshToken })
      });
      if (!res.ok) return false;
      const data = await res.json();
      _saveSession(data);
      return true;
    } catch { return false; }
  }

  async function request(path, opts = {}) {
    if (!_url) throw new Error("VSSupabase não inicializado — chame VSSupabase.init(url, key)");
    // Token já vencido AGORA → nem tenta com ele (evita 401 de cara)
    const _venceu = (() => { const r = _tokenExpirouEm(); return r != null && r < 0; })();
    const headers = {
      apikey: _key,
      Authorization: `Bearer ${(!_venceu && _accessToken) || _key}`,
      "Content-Type": "application/json",
      ...(opts.headers || {})
    };
    let res = await fetch(`${_url}/rest/v1/${path}`, { ...opts, headers });
    // 401 → tenta refresh + retry uma vez
    if (res.status === 401) {
      const ok = _refreshToken ? await _refresh() : false;
      if (ok) {
        headers.Authorization = `Bearer ${_accessToken}`;
        res = await fetch(`${_url}/rest/v1/${path}`, { ...opts, headers });
      } else {
        // Refresh morto → repete como ANÔNIMO: dado público continua funcionando
        headers.Authorization = `Bearer ${_key}`;
        res = await fetch(`${_url}/rest/v1/${path}`, { ...opts, headers });
        // Sessão comprovadamente morta (vencida e sem refresh) → limpa pro app se curar
        if (res.ok && _venceu) _saveSession(null);
      }
    }
    if (!res.ok) {
      const err = new Error(`Supabase ${res.status}`);
      err.status = res.status;
      try { err.body = await res.text(); } catch {}
      throw err;
    }
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("json")) return null;
    return res.json();
  }

  function from(tableOrView) {
    let _select = "*";
    let _filters = [];
    let _order = null;
    let _limit = null;

    const api = {
      select(cols = "*") { _select = cols; return api; },
      eq(col, val)   { _filters.push(`${col}=eq.${encodeURIComponent(val)}`); return api; },
      neq(col, val)  { _filters.push(`${col}=neq.${encodeURIComponent(val)}`); return api; },
      gt(col, val)   { _filters.push(`${col}=gt.${encodeURIComponent(val)}`); return api; },
      lt(col, val)   { _filters.push(`${col}=lt.${encodeURIComponent(val)}`); return api; },
      ilike(col, val){ _filters.push(`${col}=ilike.${encodeURIComponent(val)}`); return api; },
      order(col, desc=false) { _order = `${col}.${desc?"desc":"asc"}`; return api; },
      limit(n) { _limit = n; return api; },
      async get() {
        const qs = [];
        qs.push(`select=${encodeURIComponent(_select)}`);
        if (_order) qs.push(`order=${_order}`);
        if (_limit) qs.push(`limit=${_limit}`);
        const url = `${tableOrView}?${[...qs, ..._filters].join("&")}`;
        return request(url);
      }
    };
    return api;
  }

  function rpc(fnName, body = {}) {
    return request(`rpc/${fnName}`, {
      method: "POST",
      body: JSON.stringify(body || {})
    });
  }

  // Envia email de recuperação de senha (Supabase Auth `recover`)
  async function recoverPassword(email) {
    if (!_url) throw new Error("VSSupabase não inicializado");
    const res = await fetch(`${_url}/auth/v1/recover`, {
      method: "POST",
      headers: { apikey: _key, "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error_description || err.msg || "Falha ao enviar email de recuperação");
    }
    return { ok: true };
  }

  // Exclusão LGPD: chama RPC `excluir_minha_conta_lgpd`, signOut local e limpa cache
  async function excluirContaLGPD() {
    if (!_accessToken) throw new Error("Precisa estar logado pra excluir a conta");
    const r = await rpc("excluir_minha_conta_lgpd");
    const data = Array.isArray(r) ? r[0] : r;
    if (data?.ok) {
      await signOut().catch(() => {});
      try { localStorage.removeItem("vs.sb.session"); } catch {}
      return { ok: true };
    }
    throw new Error(data?.erro || "Falha ao excluir conta");
  }

  // Upload de arquivo pro Supabase Storage. Retorna URL pública.
  // bucket precisa existir e ser público (ou ter policy de leitura).
  async function uploadFile(bucket, path, file) {
    if (!_url) throw new Error("VSSupabase não inicializado");
    const tok = _accessToken || _key;
    const url = `${_url}/storage/v1/object/${bucket}/${encodeURIComponent(path)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tok}`,
        apikey: _key,
        "x-upsert": "true",
        "Content-Type": file.type || "application/octet-stream"
      },
      body: file
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || `upload falhou ${res.status}`);
    }
    return `${_url}/storage/v1/object/public/${bucket}/${path}`;
  }


  // ── VINCULAR IDENTIDADE (25/08/2026) ────────────────────────────────────
  // O problema que isto resolve: cada navegador virava um usuario anonimo NOVO.
  // A preferencia do despertador ficava num usuario, o aparelho registrado pro
  // push ficava em outro, e o push nunca achava os dois juntos. O DJ:
  // "tem que tudo do usuario ser sempre um so".
  //
  // A chave e CONVERTER o anonimo em vez de criar outro. Assim o user_id NAO
  // muda, e tudo que a pessoa ja tinha continua sendo dela.
  // ⚠️ Depende de "Allow manual linking" ligado no painel do Supabase — foi
  //    ligado em 25/08. Sem isso o servidor devolve 404 manual_linking_disabled.

  // Vira conta de e-mail mantendo o MESMO user_id.
  async function linkEmail(email, senha) {
    if (!_url) throw new Error("VSSupabase nao inicializado");
    await ensureSession();
    const res = await fetch(`${_url}/auth/v1/user`, {
      method: "PUT",
      headers: { apikey: _key, "Content-Type": "application/json",
                 Authorization: `Bearer ${_accessToken}` },
      body: JSON.stringify({ email, password: senha })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.msg || data.error_description || "Nao consegui vincular o e-mail");
    return { user: data, mesmoId: true };
  }

  // Manda pro Google e volta com a MESMA conta, agora permanente.
  // Se nao houver sessao anonima, cai no login normal — nao trava ninguem.
  async function linkGoogle(voltarPara) {
    if (!_url) throw new Error("VSSupabase nao inicializado");
    const volta = encodeURIComponent(voltarPara || location.href);
    await ensureSession();
    if (_accessToken) {
      // tem sessao: CONVERTE (mantem o user_id e tudo que ele ja tem)
      location.href = `${_url}/auth/v1/user/identities/authorize`
        + `?provider=google&redirect_to=${volta}`;
      return { modo: "vinculo" };
    }
    // sem sessao: login normal
    location.href = `${_url}/auth/v1/authorize?provider=google&redirect_to=${volta}`;
    return { modo: "login" };
  }

  // Diz o que a conta atual ja e: anonima, com e-mail, com Google.
  async function identidades() {
    if (!_accessToken) return { anonimo: true, provedores: [] };
    const res = await fetch(`${_url}/auth/v1/user`, {
      headers: { apikey: _key, Authorization: `Bearer ${_accessToken}` }
    });
    const u = await res.json().catch(() => ({}));
    return {
      anonimo: !!u.is_anonymous,
      email: u.email || null,
      provedores: (u.identities || []).map(i => i.provider)
    };
  }

  return {
    init, setAccessToken, from, rpc, request, uploadFile,
    signIn, signUp, signInAnonymously, ensureSession, signOut,
    linkEmail, linkGoogle, identidades,
    recoverPassword, excluirContaLGPD,
    getSession, isLoggedIn, userEmail, userId
  };
});
