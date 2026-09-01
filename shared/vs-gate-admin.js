/* vs-gate-admin.js — 🔒 GATE ADMIN compartilhado (28/07/2026)
 * Esconde a página até confirmar que a conta tem role admin.
 * Sem JWT no localStorage → manda pro app. Com JWT mas sem role → bloqueio claro.
 * Padrão validado: RPC public.eh_role(text), SECURITY DEFINER.
 *
 * Uso, no <head> da página (ANTES de qualquer outra coisa):
 *   <meta name="robots" content="noindex,nofollow">
 *   <style>html.gate-loading{visibility:hidden}</style>
 *   <script>document.documentElement.classList.add("gate-loading");
 *           window.VS_GATE_MOTIVO="Frase explicando de quem é a área.";</script>
 *   <script src="/shared/vs-gate-admin.js"></script>
 */
(function () {
  var SUPA = "https://vdrzndgkwdpibexjkyxi.supabase.co";
  var ANON = "sb_publishable_UuXuHUDxe7nmhE-Z9qu-0w_1tv2IrvC";
  var MOTIVO = window.VS_GATE_MOTIVO ||
    "Esta área é da equipe interna do Vento Sul. Sua conta não tem permissão.";

  document.documentElement.classList.add("gate-loading");

  var token = null;
  try {
    var raw = localStorage.getItem("vs.sb.session");
    if (raw) token = JSON.parse(raw) && JSON.parse(raw).access_token;
  } catch (_) {}

  function liberar() { document.documentElement.classList.remove("gate-loading"); }

  function bloquear(motivo) {
    document.documentElement.innerHTML =
      '<head><meta charset="utf-8"><title>Restrito · Vento Sul</title>' +
      '<meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
      '<body style="margin:0;background:radial-gradient(ellipse at top,#0d1320,#0a0e14);' +
      'color:#e5e7eb;font-family:system-ui;text-align:center;padding:80px 24px;min-height:100vh">' +
      '<div style="max-width:440px;margin:0 auto;background:#131a23;border:1px solid #1f2937;' +
      'border-radius:16px;padding:32px"><div style="font-size:48px">🔒</div>' +
      '<h1 style="margin:12px 0 6px;font-size:22px;color:#fbbf24">Área restrita</h1>' +
      '<p style="color:#94a3b8;font-size:14px;line-height:1.5">' + motivo + '</p>' +
      '<a href="/" style="display:inline-block;margin-top:20px;padding:12px 22px;' +
      'border-radius:10px;background:linear-gradient(135deg,#06b6d4,#a855f7);' +
      'color:#fff;text-decoration:none;font-weight:700">← Voltar pro app</a>' +
      '</div></body>';
    document.documentElement.classList.remove("gate-loading");
  }

  if (!token) {
    location.replace("/?next=" + encodeURIComponent(location.pathname));
    return;
  }

  fetch(SUPA + "/rest/v1/rpc/eh_role", {
    method: "POST",
    headers: {
      apikey: ANON,
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ p_role: "admin" })
  })
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (eh) { if (eh === true) liberar(); else bloquear(MOTIVO); })
    .catch(function () {
      // Token expirado ou rede ruim — manda pro login pra refrescar
      location.replace("/?next=" + encodeURIComponent(location.pathname));
    });
})();
