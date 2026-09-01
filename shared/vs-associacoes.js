/* vs-associacoes.js — Diretório das associações de Florianópolis.
 *
 * 05/08/2026 — pedido do DJ: "dar voz a todas". A lista fica atrás de UM ícone
 * no fim da página, e não solta no meio dela: são 33 entidades e a página da
 * associação já é longa. Abre por cima, busca por nome ou bairro, e fecha.
 *
 * O dado (/data/associacoes-floripa.json) vem de fonte pública e cada linha diz
 * de onde veio. Campo que a fonte não tem fica VAZIO — telefone chutado é pior
 * que telefone faltando, porque alguém liga.
 */
(function (root) {
  if (root.VSAssociacoes) return;

  var DADOS = '/data/associacoes-floripa.json';
  var cache = null;

  var CSS = "\
#vs-assoc-btn{display:flex;align-items:center;gap:14px;width:100%;max-width:620px;margin:26px auto 8px;\
 padding:18px 20px;border:1px solid rgba(255,209,102,.4);border-radius:16px;cursor:pointer;\
 background:linear-gradient(135deg,rgba(255,209,102,.10),rgba(6,214,160,.08));color:#e8edf5;\
 font:inherit;text-align:left;transition:border-color .15s,transform .1s}\
#vs-assoc-btn:hover{border-color:rgba(255,209,102,.8)}\
#vs-assoc-btn:active{transform:scale(.99)}\
#vs-assoc-btn .ic{font-size:34px;flex-shrink:0}\
#vs-assoc-btn .tx{flex:1;min-width:0}\
#vs-assoc-btn .tt{font-weight:800;font-size:16px;color:#ffd166;display:block}\
#vs-assoc-btn .ds{font-size:13px;color:#9fb3c8;margin-top:3px;display:block;line-height:1.45}\
#vs-assoc-btn .seta{font-size:22px;color:#ffd166;flex-shrink:0}\
#vs-assoc-ov{position:fixed;inset:0;z-index:100040;background:#050b16;\
 display:none;flex-direction:column;padding:0}\
#vs-assoc-ov.on{display:flex}\
.va-topo{padding:16px 16px 10px;border-bottom:1px solid #1f2937;background:#0a1120}\
.va-topo h2{margin:0 0 3px;font-size:19px;color:#ffd166}\
.va-topo p{margin:0 0 11px;font-size:12.5px;color:#9fb3c8;line-height:1.45}\
.va-linha{display:flex;gap:8px}\
.va-busca{flex:1;background:#050b16;border:1px solid #1f2937;border-radius:10px;color:#e8edf5;\
 padding:11px 13px;font-size:15px;font-family:inherit}\
.va-busca:focus{outline:none;border-color:#ffd166}\
.va-fechar{background:rgba(120,120,120,.25);border:0;color:#e8edf5;border-radius:10px;\
 padding:11px 15px;font-size:15px;cursor:pointer}\
.va-corpo{flex:1;overflow-y:auto;padding:12px 16px 30px;-webkit-overflow-scrolling:touch}\
.va-item{background:rgba(255,255,255,.04);border:1px solid #1f2937;border-radius:13px;\
 padding:14px;margin-bottom:9px}\
.va-nome{font-weight:700;font-size:15px;color:#e8edf5;line-height:1.35}\
.va-sigla{display:inline-block;background:rgba(255,209,102,.16);color:#ffd166;font-size:11px;\
 font-weight:800;padding:2px 8px;border-radius:99px;margin-right:7px;vertical-align:middle}\
.va-bairro{font-size:12.5px;color:#06d6a0;margin-top:3px}\
.va-contatos{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}\
.va-contatos a{display:inline-flex;align-items:center;gap:5px;background:rgba(6,214,160,.12);\
 border:1px solid rgba(6,214,160,.35);color:#06d6a0;text-decoration:none;font-size:12.5px;\
 padding:7px 11px;border-radius:99px}\
.va-end{font-size:12.5px;color:#9fb3c8;margin-top:8px;line-height:1.45}\
.va-fonte{font-size:10.5px;color:#64748b;margin-top:8px}\
.va-vazio{text-align:center;color:#9fb3c8;padding:34px 12px;font-size:14px;line-height:1.6}\
.va-rodape{font-size:12px;color:#64748b;line-height:1.6;padding:14px 2px 0;border-top:1px solid #1f2937;margin-top:14px}";

  function estilo() {
    if (document.getElementById('vs-assoc-css')) return;
    var s = document.createElement('style');
    s.id = 'vs-assoc-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function soDigitos(t) { return (t || '').replace(/\D/g, ''); }

  function cartao(e) {
    var contatos = '';
    if (e.tel) {
      contatos += '<a href="tel:+' + soDigitos(e.tel) + '">📞 ' + esc(e.tel) + '</a>';
    }
    if (e.email) {
      contatos += '<a href="mailto:' + esc(e.email) + '">✉️ e-mail</a>';
    }
    if (e.site) {
      var u = e.site.indexOf('http') === 0 ? e.site : 'https://' + e.site;
      contatos += '<a href="' + esc(u) + '" target="_blank" rel="noopener">🌐 site</a>';
    }
    if (e.lat && e.lng) {
      contatos += '<a href="https://www.openstreetmap.org/?mlat=' + e.lat + '&mlon=' + e.lng +
                  '#map=18/' + e.lat + '/' + e.lng + '" target="_blank" rel="noopener">📍 no mapa</a>';
    }
    return '<div class="va-item">' +
      '<div class="va-nome">' + (e.sigla ? '<span class="va-sigla">' + esc(e.sigla) + '</span>' : '') +
        esc(e.nome) + '</div>' +
      (e.bairro ? '<div class="va-bairro">' + esc(e.bairro) + '</div>' : '') +
      (e.endereco ? '<div class="va-end">' + esc(e.endereco) + '</div>' : '') +
      (contatos ? '<div class="va-contatos">' + contatos + '</div>' : '') +
      '<div class="va-fonte">fonte: ' + esc((e.fontes || []).join(' · ')) + '</div>' +
    '</div>';
  }

  function pintar(termo) {
    var corpo = document.getElementById('va-corpo');
    if (!corpo || !cache) return;
    var t = (termo || '').toLowerCase().trim();
    var lista = cache.entidades.filter(function (e) {
      if (!t) return true;
      return ((e.nome || '') + ' ' + (e.bairro || '') + ' ' + (e.sigla || '') + ' ' +
              (e.endereco || '')).toLowerCase().indexOf(t) > -1;
    });
    corpo.innerHTML = lista.length
      ? lista.map(cartao).join('') +
        '<div class="va-rodape">' + esc(cache.aviso) + '<br><br>Fontes: ' +
        esc((cache.fontes || []).join(' · ')) + '<br>Atualizado em ' + esc(cache.atualizado) + '.</div>'
      : '<div class="va-vazio">Nada com esse nome.<br>Tenta o bairro, ou a sigla.</div>';
  }

  function abrir() {
    estilo();
    var ov = document.getElementById('vs-assoc-ov');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'vs-assoc-ov';
      ov.innerHTML =
        '<div class="va-topo">' +
          '<h2>🏘️ Associações de Florianópolis</h2>' +
          '<p>Nome, bairro e contato de quem organiza cada canto da Ilha. ' +
             'Aqui não tem dono: é lista pública, pra todo mundo achar quem cuida do lugar onde mora.</p>' +
          '<div class="va-linha">' +
            '<input class="va-busca" id="va-busca" placeholder="Buscar por nome ou bairro…" autocomplete="off">' +
            '<button class="va-fechar" id="va-fechar">Fechar</button>' +
          '</div>' +
        '</div>' +
        '<div class="va-corpo" id="va-corpo"><div class="va-vazio">Carregando…</div></div>';
      document.body.appendChild(ov);
      ov.querySelector('#va-fechar').onclick = fechar;
      ov.querySelector('#va-busca').oninput = function () { pintar(this.value); };
    }
    ov.classList.add('on');

    if (cache) { pintar(''); return; }
    fetch(DADOS, { cache: 'default' })
      .then(function (r) { return r.json(); })
      .then(function (d) { cache = d; pintar(''); })
      .catch(function () {
        var c = document.getElementById('va-corpo');
        if (c) c.innerHTML = '<div class="va-vazio">Não consegui carregar a lista agora.<br>Tenta de novo daqui a pouco.</div>';
      });
  }

  function fechar() {
    var ov = document.getElementById('vs-assoc-ov');
    if (ov) ov.classList.remove('on');
  }

  function montar(alvo) {
    estilo();
    if (document.getElementById('vs-assoc-btn')) return;
    var b = document.createElement('button');
    b.id = 'vs-assoc-btn';
    b.type = 'button';
    b.innerHTML =
      '<span class="ic">🏘️</span>' +
      '<span class="tx">' +
        '<span class="tt">Todas as associações de Florianópolis</span>' +
        '<span class="ds">Nome, bairro e contato de quem organiza cada canto da Ilha — ' +
          'de moradores a pescadores. Toque para abrir a lista.</span>' +
      '</span>' +
      '<span class="seta">›</span>';
    b.onclick = abrir;
    (alvo || document.body).appendChild(b);
    return b;
  }

  root.VSAssociacoes = { montar: montar, abrir: abrir, fechar: fechar };

  // entra sozinho no fim do conteúdo, ANTES do rodapé de contato do DJ
  function auto() {
    var main = document.querySelector('main') || document.body;
    var cf = document.getElementById('vs-contato-footer');
    var b = montar(main);
    if (b && cf && cf.parentElement === main) main.insertBefore(b, cf);
    else if (b && cf) cf.parentElement.insertBefore(b, cf);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(auto, 400); });
  else setTimeout(auto, 400);
})(window);
