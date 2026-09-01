// Vento Sul — Gate de acesso admin (funciona em CELULAR e COMPUTADOR)
// API: VSBiometric.gate(opts) / VSPinGate.gate(opts) (alias).
//
// Regras (decididas com o Vento Sul):
//  - Sempre abre uma TELA DE TOQUE primeiro ("🔐 Entrar"). O toque é obrigatório:
//    navegador de celular só libera a biometria depois de um gesto do usuário.
//  - Ao tocar:
//      📱 aparelho com biometria de plataforma -> digital / Face ID (WebAuthn).
//      💻 aparelho sem biometria (PC) -> PIN.
//  - Se a biometria falhar por AMBIENTE (WebView, domínio, sem suporte) -> cai
//    automático no PIN. NUNCA tranca de fora.
//  - PIN: 1º acesso do aparelho define o PIN; guarda só o HASH (SHA-256), nunca o texto.
//  - Mesma sessão (aba) não repergunta (cache em sessionStorage).
//
// Gate local (sem servidor validando a assinatura) — é fricção de UI. A proteção
// real dos dados é o login/RLS do backend.
(function () {
  "use strict";

  const CRED_KEY    = "vs.bio.credId";
  const PINHASH_KEY = "vs.bio.pinHash";
  const SESSION_KEY = "vs.bio.session";
  const RP_NAME     = "Vento Sul";
  const PIN_SALT    = "ventosul:v1";

  function _rpId() {
    const h = location.hostname;
    if (h === "localhost" || /^[0-9.]+$/.test(h)) return h;
    return h.split(".").slice(-2).join(".");
  }
  function _b64uFromBuf(buf) {
    let s = ""; const b = new Uint8Array(buf);
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function _bufFromB64u(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    const bin = atob(s); const b = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return b.buffer;
  }
  function _rand(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return a; }
  async function _sha256hex(txt) {
    const data = new TextEncoder().encode(PIN_SALT + ":" + txt);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async function _temBiometriaNativa() {
    if (!window.PublicKeyCredential ||
        !window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) return false;
    try { return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); }
    catch (_e) { return false; }
  }
  async function _registrar() {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: _rand(32),
        rp: { name: RP_NAME, id: _rpId() },
        user: { id: _rand(16), name: "admin@vento-sul", displayName: "Admin Vento Sul" },
        pubKeyCredParams: [ { type: "public-key", alg: -7 }, { type: "public-key", alg: -257 } ],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
        timeout: 60000, attestation: "none",
      },
    });
    if (!cred) throw new Error("sem credencial");
    localStorage.setItem(CRED_KEY, _b64uFromBuf(cred.rawId));
  }
  async function _verificar(credIdB64u) {
    const a = await navigator.credentials.get({
      publicKey: {
        challenge: _rand(32), rpId: _rpId(),
        allowCredentials: [{ type: "public-key", id: _bufFromB64u(credIdB64u), transports: ["internal"] }],
        userVerification: "required", timeout: 60000,
      },
    });
    if (!a) throw new Error("nao confirmado");
  }
  // roda a biometria; lança erro com .name pra distinguir cancelamento de ambiente
  async function _bio() {
    const credId = localStorage.getItem(CRED_KEY);
    if (credId) {
      try { await _verificar(credId); return; }
      catch (e1) {
        if (e1 && e1.name === "NotAllowedError") throw e1;  // cancelou/timeout
        localStorage.removeItem(CRED_KEY);                   // cred velha -> re-registra
      }
    }
    await _registrar();
  }

  const CSS = [
    '<style>',
    '#vs-bio-gate{position:fixed;inset:0;z-index:99999;background:rgba(10,14,20,0.98);backdrop-filter:blur(20px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:32px;text-align:center;font-family:system-ui,sans-serif}',
    '#vs-bio-gate .bg-ico{font-size:60px}',
    '#vs-bio-gate .bg-titulo{font-size:20px;font-weight:700;color:#ffd54f}',
    '#vs-bio-gate .bg-sub{font-size:14px;color:rgba(255,255,255,0.6);max-width:300px;line-height:1.5}',
    '#vs-bio-gate input{width:100%;max-width:280px;padding:14px 16px;border-radius:12px;border:1px solid rgba(255,255,255,0.18);background:rgba(255,255,255,0.06);color:#fff;font-size:16px;outline:none;letter-spacing:0.18em;text-align:center}',
    '#vs-bio-gate input::placeholder{color:rgba(255,255,255,0.35);letter-spacing:0.08em}',
    '#vs-bio-gate .bg-btn{margin-top:6px;background:linear-gradient(135deg,#06b6d4,#a855f7,#ffd54f);background-size:200% 200%;color:#fff;border:0;border-radius:999px;padding:15px 38px;font-size:17px;font-weight:700;cursor:pointer;box-shadow:0 4px 24px rgba(168,85,247,0.55);animation:bg-shine 6s ease infinite}',
    '@keyframes bg-shine{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}',
    '#vs-bio-gate .bg-btn:disabled{opacity:0.6;cursor:default}',
    '#vs-bio-gate .bg-err{font-size:13px;color:#ef4444;min-height:18px}',
    '#vs-bio-gate .bg-link{font-size:13px;color:#7dd3fc;cursor:pointer;text-decoration:underline}',
    '#vs-bio-gate .bg-cancel{font-size:12px;color:rgba(255,255,255,0.3);cursor:pointer;text-decoration:underline;margin-top:2px}',
    '</style>',
  ].join("");

  // overlay único com máquina de estados: unlock(biometria) <-> pin
  function gate(opts) {
    opts = opts || {};
    if (!opts.sempre && sessionStorage.getItem(SESSION_KEY) === "1") return Promise.resolve(true);

    return new Promise(async (resolve) => {
      const titulo = opts.titulo || "🛡️ Área restrita";
      const hasBio = await _temBiometriaNativa();

      document.documentElement.style.overflow = "hidden";
      const el = document.createElement("div");
      el.id = "vs-bio-gate";
      document.body.appendChild(el);

      const fim = (ok) => {
        el.remove();
        document.documentElement.style.overflow = "";
        if (ok) sessionStorage.setItem(SESSION_KEY, "1");
        else if (typeof opts.onFail === "function") { try { opts.onFail(); } catch (_e) {} }
        resolve(ok);
      };
      const $ = (id) => document.getElementById(id);

      // ---- view: biometria (tela de toque) ----
      function viewBio(msg) {
        el.innerHTML = CSS + [
          '<div class="bg-ico">🔐</div>',
          '<div class="bg-titulo">' + titulo + '</div>',
          '<div class="bg-sub">Confirme com a digital ou Face ID do aparelho.</div>',
          '<button class="bg-btn" id="vsb-go">🔐 Entrar com a digital</button>',
          '<div class="bg-err" id="vsb-err">' + (msg || "") + '</div>',
          '<span class="bg-link" id="vsb-usepin">Usar PIN</span>',
          '<span class="bg-cancel" id="vsb-cancel">Cancelar e voltar</span>',
        ].join("");
        $("vsb-go").addEventListener("click", async () => {
          const b = $("vsb-go"); b.disabled = true; b.textContent = "⏳ Aguarde…";
          try { await _bio(); fim(true); }
          catch (e) {
            if (e && e.name === "NotAllowedError") { viewBio("Não confirmado. Tente de novo ou use o PIN."); }
            else { viewPin("Biometria indisponível aqui — use o PIN."); }  // ambiente -> PIN
          }
        });
        $("vsb-usepin").addEventListener("click", () => viewPin(""));
        $("vsb-cancel").addEventListener("click", () => fim(false));
      }

      // ---- view: PIN (set no 1º uso, verify depois) ----
      function viewPin(msg) {
        const set = !localStorage.getItem(PINHASH_KEY);
        el.innerHTML = CSS + [
          '<div class="bg-ico">' + (set ? "🔑" : "🔢") + '</div>',
          '<div class="bg-titulo">' + titulo + '</div>',
          '<div class="bg-sub">' + (set
              ? "Defina um PIN para acessar deste aparelho."
              : "Digite o PIN deste aparelho.") + '</div>',
          '<input id="vsb-pin" type="password" inputmode="numeric" autocomplete="off" placeholder="' + (set ? "Novo PIN (mín. 4)" : "PIN") + '">',
          (set ? '<input id="vsb-pin2" type="password" inputmode="numeric" autocomplete="off" placeholder="Repita o PIN">' : ''),
          '<button class="bg-btn" id="vsb-pingo">' + (set ? "Definir PIN" : "Entrar") + '</button>',
          '<div class="bg-err" id="vsb-err">' + (msg || "") + '</div>',
          (hasBio ? '<span class="bg-link" id="vsb-usebio">Usar a digital</span>' : ''),
          '<span class="bg-cancel" id="vsb-cancel">Cancelar e voltar</span>',
        ].join("");
        const submit = async () => {
          const err = $("vsb-err");
          const p1 = $("vsb-pin").value.trim();
          if (p1.length < 4) { err.textContent = "PIN curto demais (mín. 4)."; return; }
          if (set) {
            const p2 = $("vsb-pin2").value.trim();
            if (p1 !== p2) { err.textContent = "Os PINs não conferem."; return; }
            localStorage.setItem(PINHASH_KEY, await _sha256hex(p1));
            fim(true); return;
          }
          if (await _sha256hex(p1) === localStorage.getItem(PINHASH_KEY)) { fim(true); }
          else { err.textContent = "❌ PIN errado."; $("vsb-pin").value = ""; $("vsb-pin").focus(); }
        };
        $("vsb-pingo").addEventListener("click", submit);
        el.querySelectorAll("input").forEach(i => i.addEventListener("keydown", e => { if (e.key === "Enter") submit(); }));
        if (hasBio && $("vsb-usebio")) $("vsb-usebio").addEventListener("click", () => viewBio(""));
        $("vsb-cancel").addEventListener("click", () => fim(false));
        $("vsb-pin").focus();
      }

      if (hasBio) viewBio(""); else viewPin("");
    });
  }

  window.VSBiometric = { gate, temBiometriaNativa: _temBiometriaNativa };
  window.VSPinGate   = { gate };
})();
