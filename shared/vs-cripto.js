/* vs-cripto.js — Criptografia ponta-a-ponta das mensagens do Vento Sul.
 *
 * Cada celular gera UM par de chaves (ECDH P-256). A chave PRIVADA fica só
 * no aparelho (localStorage) e NUNCA vai pro servidor. A pública a gente
 * publica (registrar_chave_publica) pra outros poderem cifrar pra você.
 *
 * Mensagem = AES-GCM com a chave derivada do ECDH entre os dois.
 * O servidor só guarda o texto CIFRADO + o nonce — nem a gente nem a
 * Supabase conseguem ler. "Mensagens seguras" de verdade.
 *
 * Limite honesto: se a pessoa limpar os dados do navegador/app, perde a
 * chave do aparelho e não decifra as mensagens antigas (isso é o preço do
 * E2E — só quem tem a chave lê). Por isso oferecemos exportar/guardar.
 */
window.VSCripto = (function () {
  const LS_PRIV = "vs_ecdh_priv_v1";
  const LS_PUB = "vs_ecdh_pub_v1";
  const ALG = { name: "ECDH", namedCurve: "P-256" };

  const b64 = {
    enc: (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))),
    dec: (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)),
  };

  let _priv = null;   // CryptoKey (privada deste aparelho)
  let _pubB64 = null; // chave pública em base64 (raw)

  async function _gerar() {
    const kp = await crypto.subtle.generateKey(ALG, true, ["deriveKey"]);
    const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
    const raw = await crypto.subtle.exportKey("raw", kp.publicKey);
    const pub = b64.enc(raw);
    localStorage.setItem(LS_PRIV, JSON.stringify(jwk));
    localStorage.setItem(LS_PUB, pub);
    return {
      priv: await crypto.subtle.importKey("jwk", jwk, ALG, false, ["deriveKey"]),
      pubB64: pub,
    };
  }

  async function carregar() {
    if (_priv) return;
    const pj = localStorage.getItem(LS_PRIV);
    const pub = localStorage.getItem(LS_PUB);
    if (pj && pub) {
      _priv = await crypto.subtle.importKey("jwk", JSON.parse(pj), ALG, false, ["deriveKey"]);
      _pubB64 = pub;
    } else {
      const g = await _gerar();
      _priv = g.priv;
      _pubB64 = g.pubB64;
    }
  }

  async function _chaveCom(pubPeerB64) {
    const pub = await crypto.subtle.importKey("raw", b64.dec(pubPeerB64), ALG, false, []);
    return crypto.subtle.deriveKey(
      { name: "ECDH", public: pub },
      _priv,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }

  // ---- API pública ----------------------------------------------------------

  // Garante que existe par de chaves; retorna a pública (base64) pra publicar.
  async function minhaChavePublica() {
    await carregar();
    return _pubB64;
  }

  // Cifra um texto PRA alguém (passa a chave pública base64 do destinatário).
  async function cifrarPara(pubPeerB64, texto) {
    await carregar();
    const k = await _chaveCom(pubPeerB64);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      k,
      new TextEncoder().encode(texto),
    );
    return { texto: b64.enc(ct), nonce: b64.enc(iv) };
  }

  // Decifra um texto cifrado DE alguém (chave pública base64 do remetente).
  async function decifrarDe(pubPeerB64, textoCifrado, nonce) {
    await carregar();
    try {
      const k = await _chaveCom(pubPeerB64);
      const pt = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: b64.dec(nonce) },
        k,
        b64.dec(textoCifrado),
      );
      return new TextDecoder().decode(pt);
    } catch (e) {
      return "🔒 (não foi possível abrir esta mensagem neste aparelho)";
    }
  }

  // Backup/restauro da chave do aparelho (texto pra guardar em lugar seguro).
  function exportarChave() {
    return localStorage.getItem(LS_PRIV);
  }
  async function importarChave(jwkStr) {
    const jwk = JSON.parse(jwkStr);
    const priv = await crypto.subtle.importKey("jwk", jwk, ALG, false, ["deriveKey"]);
    // recompõe a pública a partir da JWK (tira o 'd')
    const pubJwk = { ...jwk }; delete pubJwk.d;
    const pubKey = await crypto.subtle.importKey("jwk", pubJwk, ALG, true, []);
    const raw = await crypto.subtle.exportKey("raw", pubKey);
    localStorage.setItem(LS_PRIV, jwkStr);
    localStorage.setItem(LS_PUB, b64.enc(raw));
    _priv = priv; _pubB64 = b64.enc(raw);
    return _pubB64;
  }

  return { minhaChavePublica, cifrarPara, decifrarDe, exportarChave, importarChave };
})();
