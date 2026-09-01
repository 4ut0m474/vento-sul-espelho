/* vs-push.js — NOTIFICAÇÃO QUE SOBREVIVE (13/08/2026)
 *
 * O PROBLEMA QUE ISTO RESOLVE, nas palavras do DJ:
 *   "reseta o celular e não tem mais notificação mesmo voltando a logar na mesma
 *    conta; e no navegador é diferente do celular".
 *
 * A CAUSA: o firebase.js pedia a permissão e criava a inscrição, mas NUNCA a
 * gravava no banco — só sabia cancelar (`unsubscribe`). A tabela `device_tokens`
 * já existia e o painel do admin já lia dela; faltava alguém ESCREVER.
 * Sem isso a inscrição vive só dentro daquele navegador: apagou o app, resetou o
 * aparelho ou trocou de máquina, sumiu — mesmo logando na mesma conta, porque a
 * inscrição nunca esteve ligada à conta.
 *
 * O QUE ESTE ARQUIVO FAZ:
 *   1. registra a inscrição de push e a GRAVA em device_tokens com o user_id;
 *   2. refaz esse registro sempre que a pessoa entra na conta (é isto que traz a
 *      notificação de volta depois de resetar o aparelho);
 *   3. atualiza `last_seen`, pra dar pra saber quais aparelhos ainda existem;
 *   4. vale em TODA plataforma: no navegador do PC e no app do celular, cada um
 *      com a sua linha — são aparelhos diferentes, e é assim que tem que ser.
 *      A conta é a mesma; o que muda é o aparelho.
 *
 * A RLS de device_tokens JÁ estava certa (verificado em 13/08):
 *   tokens_own_write  INSERT  with_check (auth.uid() = user_id)
 *   tokens_own_update UPDATE  using      (auth.uid() = user_id)
 *   tokens_own_read   SELECT  using      (auth.uid() = user_id)
 *   tokens_admin_read SELECT  using      eh_role('admin')
 * Ou seja: cada um só enxerga e mexe nos próprios aparelhos. Não precisou mudar.
 *
 * ⚠️ A PERMISSÃO EM SI continua sendo do navegador e NENHUM site consegue
 * guardá-la ou restaurá-la. Se o Chrome revogar, a pessoa precisa autorizar de
 * novo — o que este arquivo garante é que, autorizando, o aparelho volta pra
 * conta certa sozinho, sem precisar refazer nada.
 */
(function () {
  'use strict';
  if (window.VSPush) return;

  var VAPID = 'BGiObWUhXp9OP_b5MJTWSHeBwNXdGp3VcAcCcsPGrWutBTTdshAwvUyIXIv3PL3C5sd3XRNXIp5aPmxaoEv8enY';
  var SUPA = (window.VENTOSUL_CONFIG && window.VENTOSUL_CONFIG.SUPABASE_URL) ||
             'https://vdrzndgkwdpibexjkyxi.supabase.co';
  var ANON = 'sb_publishable_UuXuHUDxe7nmhE-Z9qu-0w_1tv2IrvC';
  var CHAVE_LOCAL = 'vs.push.assinado';   // marca só pra não repetir gravação à toa

  function sessao() {
    try { return (window.VSSupabase && VSSupabase.getSession && VSSupabase.getSession()) || null; }
    catch (e) { return null; }
  }
  /* ⚠️ o token mora DENTRO de .session, não na raiz — a mesma pegadinha que já
     mordeu nos favoritos e no modo de edição do mapa. */
  function token() {
    var s = sessao();
    return (s && ((s.session && s.session.access_token) || s.access_token)) || null;
  }
  function uid() {
    var s = sessao();
    try {
      return (s && ((s.user && s.user.id) || (s.session && s.session.user && s.session.user.id))) || null;
    } catch (e) { return null; }
  }

  /* que aparelho é este? o DJ notou que "no app do celular é uma coisa, no
     navegador é outra" — e está certo: são inscrições diferentes. Guardar a
     plataforma deixa isso explícito no banco em vez de virar mistério. */
  function plataforma() {
    var ua = navigator.userAgent || '';
    var standalone = false;
    try {
      standalone = window.matchMedia('(display-mode: standalone)').matches ||
                   window.navigator.standalone === true;
    } catch (e) {}
    if (/Android/i.test(ua))            return standalone ? 'android_pwa' : 'web_push';
    if (/iPhone|iPad|iPod/i.test(ua))   return standalone ? 'ios_pwa'     : 'web_push';
    return 'web_push';
  }

  function b64ToUint8(base64) {
    var pad = '='.repeat((4 - base64.length % 4) % 4);
    var b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(b64);
    var arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  /* Grava (ou atualiza) o aparelho na conta.
     Estratégia: procura uma linha desta conta com este mesmo endpoint; se achar,
     só renova o last_seen; se não, insere. Assim não enche a tabela de duplicata
     cada vez que a pessoa abre o app. */
  function gravar(sub) {
    var tk = token(), u = uid();
    if (!tk || !u) return Promise.resolve(false);

    var corpo = JSON.stringify(sub);
    var h = { apikey: ANON, Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' };
    var agora = new Date().toISOString();

    return fetch(SUPA + '/rest/v1/device_tokens?select=id,fcm_token&user_id=eq.' + u, { headers: h })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (linhas) {
        var igual = null;
        (linhas || []).forEach(function (l) {
          try {
            var j = JSON.parse(l.fcm_token);
            if (j && j.endpoint && sub.endpoint && j.endpoint === sub.endpoint) igual = l;
          } catch (e) {}
        });
        if (igual) {
          return fetch(SUPA + '/rest/v1/device_tokens?id=eq.' + igual.id, {
            method: 'PATCH',
            headers: Object.assign({}, h, { Prefer: 'return=minimal' }),
            body: JSON.stringify({ last_seen: agora, fcm_token: corpo, platform: plataforma() })
          }).then(function (r) { return r.ok; });
        }
        return fetch(SUPA + '/rest/v1/device_tokens', {
          method: 'POST',
          headers: Object.assign({}, h, { Prefer: 'return=minimal' }),
          body: JSON.stringify({
            user_id: u, fcm_token: corpo, platform: plataforma(),
            created_at: agora, last_seen: agora
          })
        }).then(function (r) { return r.ok; });
      })
      .catch(function () { return false; });
  }

  /* Registra de verdade: pede (ou reusa) a inscrição e manda pro banco. */
  function registrar(pedirPermissao) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return Promise.resolve({ ok: false, motivo: 'aparelho não suporta push' });
    }
    if (!uid()) return Promise.resolve({ ok: false, motivo: 'sem conta' });

    var p = Promise.resolve(Notification.permission);
    if (Notification.permission === 'default' && pedirPermissao) p = Notification.requestPermission();

    return p.then(function (perm) {
      if (perm !== 'granted') return { ok: false, motivo: 'permissão ' + perm };
      return navigator.serviceWorker.ready.then(function (reg) {
        return reg.pushManager.getSubscription().then(function (sub) {
          if (sub) return sub;
          return reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: b64ToUint8(VAPID)
          });
        });
      }).then(function (sub) {
        return gravar(sub.toJSON ? sub.toJSON() : sub).then(function (ok) {
          try { localStorage.setItem(CHAVE_LOCAL, ok ? '1' : '0'); } catch (e) {}
          return { ok: ok, motivo: ok ? 'gravado na conta' : 'não gravou no banco' };
        });
      }).catch(function (e) {
        /* 'different applicationServerKey' = inscrição velha, de uma chave
           anterior. Cancela e refaz uma vez — está documentado no mapa-sistema. */
        if (/applicationServerKey|already exist/i.test(e && e.message || '')) {
          return navigator.serviceWorker.ready.then(function (reg) {
            return reg.pushManager.getSubscription();
          }).then(function (s) { return s && s.unsubscribe(); })
            .then(function () { return registrar(false); })
            .catch(function () { return { ok: false, motivo: 'inscrição velha' }; });
        }
        return { ok: false, motivo: (e && e.message) || 'erro' };
      });
    });
  }

  /* ── quando rodar sozinho ──────────────────────────────────────────────
     Só re-registra se já houver permissão: NUNCA pede autorização sem a pessoa
     mandar. Pedir sozinho ao abrir é o caminho mais rápido pro "bloquear pra
     sempre", e aí a notificação morre de vez naquele aparelho. */
  function auto() {
    try {
      if (Notification.permission !== 'granted') return;
      if (!uid()) return;
      registrar(false);
    } catch (e) {}
  }

  // 1) ao abrir a página (a sessão costuma chegar depois: tenta de novo)
  setTimeout(auto, 1500);
  setTimeout(auto, 5000);

  // 2) ao ENTRAR NA CONTA — é isto que devolve a notificação depois de resetar
  window.addEventListener('vs:login', auto);
  window.addEventListener('storage', function (e) {
    if (e && e.key && /vs\.sb\.session/.test(e.key)) auto();
  });

  window.VSPush = {
    registrar: function () { return registrar(true); },   // com pedido de permissão
    reRegistrar: auto,
    plataforma: plataforma,
    estado: function () {
      return {
        suportado: ('serviceWorker' in navigator) && ('PushManager' in window),
        permissao: (window.Notification && Notification.permission) || 'indisponível',
        logado: !!uid(),
        plataforma: plataforma()
      };
    },
    /* diagnóstico honesto: diz na tela o que está acontecendo, em vez de falhar calado */
    diag: function () {
      var e = this.estado();
      var msg = 'push: ' + (e.suportado ? 'suportado' : 'NÃO suportado') +
                ' | permissão: ' + e.permissao +
                ' | conta: ' + (e.logado ? 'logado' : 'DESLOGADO') +
                ' | aparelho: ' + e.plataforma;
      try { vsToast(msg); } catch (x) { alert(msg); }
      return msg;
    }
  };
})();
