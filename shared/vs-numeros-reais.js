/* vs-numeros-reais.js — o painel de números do Vento Sul.
 *
 * 05/08/2026. Antes a transparência mostrava pools e catálogo de preços, mas
 * NÃO mostrava gente. E quando eu fui contar gente, quase errei feio: o banco
 * tem 1.348 contas, das quais 1.337 são SESSÕES ANÔNIMAS (quem abriu o app sem
 * se cadastrar). Dizer "1.348 usuários" seria mentira por omissão.
 *
 * Regra desta tela: cada número diz exatamente o que é.
 *   pessoa   = cadastro com e-mail confirmado
 *   visita   = sessão anônima
 *   pagante  = assinatura válida, serviço ativo ou compra ativa HOJE
 *
 * Ordem: primeiro o que decide (gente e dinheiro), depois o acervo.
 * Tudo vem da RPC estatisticas_publicas() — nada cravado em HTML.
 */
(function (root) {
  if (root.VSNumeros) return;

  var SUPA = (root.VENTOSUL_CONFIG && root.VENTOSUL_CONFIG.SUPABASE_URL) || 'https://vdrzndgkwdpibexjkyxi.supabase.co';
  // nem toda pagina carrega /config.js — a chave publica de reserva e a mesma
  // que shared/vs-faiscas-coletivas.js ja usa. Sem ela o painel fica mudo.
  var ANON = (root.VENTOSUL_CONFIG && root.VENTOSUL_CONFIG.SUPABASE_ANON_JWT)
          || 'sb_publishable_UuXuHUDxe7nmhE-Z9qu-0w_1tv2IrvC';

  var CSS = "\
.vn-wrap{max-width:760px;margin:0 auto 26px;font-family:system-ui,sans-serif;color:#e8edf5}\
.vn-tit{font-size:19px;font-weight:800;color:#ffd166;margin:0 0 4px}\
.vn-sub{font-size:13px;color:#9fb3c8;margin:0 0 16px;line-height:1.5}\
.vn-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:12px}\
.vn-cel{background:rgba(255,255,255,.04);border:1px solid #1f2937;border-radius:14px;padding:15px 14px}\
.vn-cel.forte{border-color:rgba(255,209,102,.45);background:linear-gradient(135deg,rgba(255,209,102,.09),rgba(6,214,160,.05))}\
.vn-num{font-size:34px;font-weight:900;line-height:1;font-variant-numeric:tabular-nums}\
.vn-cel.forte .vn-num{color:#ffd166}\
.vn-rot{font-size:12.5px;color:#9fb3c8;margin-top:6px;line-height:1.35}\
.vn-exp{font-size:11px;color:#64748b;margin-top:4px;line-height:1.4}\
.vn-nota{font-size:12px;color:#9fb3c8;background:rgba(6,182,212,.07);border:1px solid rgba(6,182,212,.22);\
 border-radius:11px;padding:11px 13px;line-height:1.55;margin-bottom:14px}\
.vn-nota b{color:#67e8f9}\
.vn-secao{font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1.4px;margin:18px 0 8px}\
.vn-pe{font-size:11px;color:#64748b;margin-top:12px}\
.vn-carregando{color:#9fb3c8;font-size:14px;padding:18px 0}";

  function estilo() {
    if (document.getElementById('vn-css')) return;
    var s = document.createElement('style'); s.id = 'vn-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function n(v) { return (v == null ? 0 : v).toLocaleString('pt-BR'); }

  function cel(valor, rotulo, explica, forte) {
    return '<div class="vn-cel' + (forte ? ' forte' : '') + '">' +
      '<div class="vn-num">' + n(valor) + '</div>' +
      '<div class="vn-rot">' + rotulo + '</div>' +
      (explica ? '<div class="vn-exp">' + explica + '</div>' : '') +
    '</div>';
  }

  function pintar(el, d) {
    var p = d.pessoas || {}, m = d.dinheiro || {}, v = d.visitas || {}, l = d.lugar || {}, r = d.radio || {};
    var quando = '';
    try { quando = new Date(d.gerado_em).toLocaleString('pt-BR'); } catch (e) {}

    el.innerHTML = '<div class="vn-wrap">' +
      '<h2 class="vn-tit">📊 Os números de verdade</h2>' +
      '<p class="vn-sub">Direto do banco, na hora que você abriu esta página. ' +
        'Sem número enfeitado e sem número escondido.</p>' +

      '<div class="vn-nota"><b>Pessoa não é visita.</b> Quem abre o app sem se cadastrar ' +
        'ganha uma sessão anônima automática. Isso conta como <b>visita</b>. ' +
        'Só entra em “pessoas” quem se cadastrou e confirmou o e-mail.</div>' +

      '<div class="vn-secao">Gente</div>' +
      '<div class="vn-grade">' +
        cel(p.cadastradas, 'Pessoas cadastradas', 'com e-mail confirmado', true) +
        cel(p.ativas_7d, 'Ativas nos últimos 7 dias') +
        cel(p.ativas_30d, 'Ativas nos últimos 30 dias') +
        cel(p.novas_30d, 'Novas nos últimos 30 dias') +
      '</div>' +

      '<div class="vn-secao">Dinheiro</div>' +
      '<div class="vn-grade">' +
        cel(m.pagantes_agora, 'Pagantes hoje', 'assinatura, serviço ou compra ativa', true) +
        cel(m.nao_pagantes, 'Cadastradas sem pagar') +
        cel(m.ja_pagaram_alguma_vez, 'Já pagaram alguma vez') +
      '</div>' +

      '<div class="vn-secao">Visitas</div>' +
      '<div class="vn-grade">' +
        cel(v.sessoes_anonimas, 'Sessões anônimas', 'abriram sem se cadastrar') +
        cel(v.anonimas_7d, 'Visitas nos últimos 7 dias') +
      '</div>' +

      '<div class="vn-secao">O que já está mapeado</div>' +
      '<div class="vn-grade">' +
        cel(l.comercios, 'Comércios') +
        cel(l.localidades, 'Localidades') +
        cel(l.npcs, 'Personagens no mapa') +
        cel(l.fotos, 'Fotos de lugares') +
        cel(r.blocos, 'Blocos de rádio') +
      '</div>' +

      '<div class="vn-pe">Consultado em ' + quando + ' · fonte: banco do Vento Sul, ' +
        'função pública <code>estatisticas_publicas()</code></div>' +
    '</div>';
  }

  function montar(el) {
    estilo();
    el = el || document.getElementById('vs-numeros') || document.querySelector('[data-numeros-reais]');
    if (!el) return;
    el.innerHTML = '<div class="vn-wrap"><div class="vn-carregando">Buscando os números…</div></div>';
    return fetch(SUPA + '/rest/v1/rpc/estatisticas_publicas', {
      method: 'POST',
      headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' },
      body: '{}'
    }).then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.pessoas) throw new Error('resposta vazia');
        pintar(el, d);
        return d;
      })
      .catch(function () {
        el.innerHTML = '<div class="vn-wrap"><div class="vn-carregando">' +
          'Não consegui buscar os números agora. Recarrega a página daqui a pouco.</div></div>';
      });
  }

  root.VSNumeros = { montar: montar };

  function auto() {
    if (document.getElementById('vs-numeros') || document.querySelector('[data-numeros-reais]')) montar();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
  else auto();
})(window);
