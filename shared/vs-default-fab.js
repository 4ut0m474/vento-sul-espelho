// vs-default-fab.js — FAB ✨ padrão. Auto-monta se a página não configurou FAB próprio.
// Expõe VSDefaultFab.itens() para que páginas com FAB próprio (ex.: rádio) reaproveitem
// AS MESMAS opções padrão depois das suas — sem duplicar a lista.
(function () {
  /* 17/08/2026 — MESMO FAB FORA DO DOMÍNIO DO APP (fluxia.tec.br).
   * A landing da FluxIA mora noutro domínio, então '/radio.html' apontaria pra
   * fluxia.tec.br/radio.html — que não existe. A página de lá declara
   * window.VS_APP_ORIGIN='https://vento-sul.tech' e os destinos saem completos.
   * Dentro do vento-sul.tech nada muda: sem a variável, ir() é location.href seco. */
  function ir(p) { location.href = (window.VS_APP_ORIGIN && p.charAt(0) === '/' ? window.VS_APP_ORIGIN : '') + p; }

  function buildItens() {
    const itens = [
      // ⭐ Ordem definida pelo DJ: Mapa Vivo, Comerciante, Rádio, Auditoria, Litorânea
      { ico:'📻', label:'Rádio',                  cat:'info',      on:()=>{ ir('/radio.html'); } },
      // 17/08/2026 — a Roda da Comunidade não tinha porta no FAB (pedido do DJ):
      // só se chegava nela pelo ícone do vento na tela inicial. Agora está aqui,
      // em todas as páginas, junto com as outras vozes da comunidade.
      { ico:'🗣️', label:'Roda da Comunidade · debates', cat:'primaria', on:()=>{ ir('/comunidade.html'); } },
      // 12/08/2026 — despertador no FAB de TODAS as páginas (pedido do DJ).
      // Abre a página própria dele; nada solto na tela, tudo dentro do FAB.
      { ico:'⏰', label:'Despertador',            cat:'primaria',  on:()=>{ ir('/despertador.html'); } },
      { ico:'💬', label:'Chat da rádio',          cat:'info',      on:()=>{ ir('/radio.html?painel=chat'); } },
      { ico:'🌅', label:'FluxIA — dá cérebro ao seu negócio', cat:'ia', on:()=>{ window.open('https://fluxia.tec.br','_blank','noopener'); } },
      { ico:'💰', label:'Auditoria — reduz custo com IA', cat:'sucesso', on:()=>{ ir('/auditoria-como-funciona.html'); } },
      { ico:'🗺️', label:'Mapa Vivo',              cat:'primaria',  on:()=>{ ir('/mapa.html'); } },
      // 13/08/2026 — o acervo inteiro num lugar só (pedido do DJ). A página não
      // pesa: cada vídeo só carrega quando a pessoa toca no card dele.
      { ico:'🎬', label:'Tudo que a gente já fez', cat:'info',     on:()=>{ ir('/videos-galeria.html'); } },
      // 13/08/2026 — o manual com o mapa de integrações (pedido do DJ)
      // 17/08/2026 — SAIU DO FAB PÚBLICO. O DJ definiu que o manual do sistema e o
      // do app são particulares, só dele. O texto deles é interno (mapa de
      // integrações tirado do código, o que ainda não foi verificado, o que não
      // pode ser prometido no vídeo) — planta baixa da operação, não material de
      // usuário. As duas páginas agora pedem senha no nginx; deixar o item aqui
      // só serviria pra dar caixa de senha na cara de quem não é admin e avisar
      // que elas existem. O acesso mora no bloco de admin do FAB da landing,
      // junto com Painel admin e Centro de Comando.
      { ico:'🏪', label:'Comerciante',            cat:'primaria',  on:()=>{ ir('/#comercio'); } },
      { ico:'💬', label:'Falar com o Vento Sul', cat:'info', on:()=>{ window.open('https://wa.me/5548992467821?text=ajuda','_blank','noopener'); } },
      { ico:'💳', label:'Carteira',               cat:'sucesso',   on:()=>{ ir('/carteira.html'); } },
      { ico:'🌊', label:'Litorânea',              cat:'ia',        on:()=>{ ir('/?go=litoranea'); } },
      { ico:'⚡', label:'Devs Fundadores — editais & inscrição', cat:'ia', on:()=>{ ir('/devs-hub.html'); } },
      { ico:'▶️', label:'YouTube — Rádio ao vivo 24h', cat:'info', on:()=>{ window.open('https://www.youtube.com/@vento-sul_tech/live','_blank','noopener'); } },
      { ico:'📲', label:'Instagram · WhatsApp', cat:'info', on:()=>{ if(window.VSSocial)return VSSocial.canais(); var s=document.createElement('script'); s.src='/shared/vs-social.js?v=2'; s.onload=()=>VSSocial.canais(); document.head.appendChild(s); } },
      { ico:'🔔', label:'Notificações do seu jeito', cat:'primaria', on:()=>{ ir('/?go=notif'); } },
      { ico:'📰', label:'Jornal',                 cat:'info',      on:()=>{ ir('/jornal.html'); } },
      { ico:'📍', label:'Perto de Você',          cat:'primaria',  on:()=>{ ir('/perto.html'); } },
      { ico:'🎯', label:'Meu Perfil IA',          cat:'ia',        on:()=>{ ir('/meu-perfil.html'); } },
      { ico:'🛰️', label:'Centro de Comando',     cat:'info',      on:()=>{ ir('/centro-comando.html'); } },
      { ico:'📊', label:'Transparência pública',  cat:'sucesso',   on:()=>{ ir('/transparencia.html#pools'); } },
      { ico:'📍', label:'Meus Lugares',           cat:'navegacao', on:()=>{ ir('/meus-lugares.html'); } },
    ];
    // 📡 Radar Sul (GPS) em TODAS as páginas — overlay animado (Rosinha) que localiza
    // e leva pra "Perto de Você". Fica no topo por importância.
    if (window.VSFab?.getRosinhaItem) {
      const g = VSFab.getRosinhaItem();
      g.ico = '📡'; g.label = 'Radar Sul · GPS (perto de você)'; g.cat = 'ia';
      itens.push(g);
    }
    // Páginas de cidade/bairro/praia (localidade): "Comércio em volta"
    if (/localidade\.html/.test(location.pathname)) {
      itens.push({ ico:'🏪', label:'Comércio em volta', cat:'sucesso', on:()=>{
        const s=document.getElementById('secComercio');
        if(s){ s.style.display=''; s.scrollIntoView({behavior:'smooth'}); } else { ir('/mapa.html'); }
      } });
    }
    if(window.VSFab?.getQRItem) itens.push(VSFab.getQRItem(location.href, '📲 ' + (document.title||'Vento Sul')));
    itens.push({ ico:'📣', label:'Divulgar & Sulis', cat:'sucesso', on:()=>{ ir('/divulgar.html'); } });
    itens.push(
      { ico:'🛒', label:'Compras Coletivas',      cat:'primaria',  on:()=>{ ir('/compras-coletivas.html'); } },
      { ico:'🚤', label:'Barcos da Barra',        cat:'primaria',  on:()=>{ ir('/barcos-barra.html'); } },
      { ico:'🏝️', label:'Floripa: bairros & praias', cat:'info',   on:()=>{ ir('/localidade.html?cidade='+encodeURIComponent('Florianópolis')+'&estado='+encodeURIComponent('Santa Catarina')); } },
      { ico:'🌊', label:'Barra da Lagoa',         cat:'info',      on:()=>{ ir('/barra-da-lagoa.html'); } },
      { ico:'🎚️', label:'Minhas alocações',       cat:'navegacao', on:()=>{ ir('/minhas-alocacoes.html'); } },
      { ico:'🪞', label:'Espelho da Alma',        cat:'ia',        on:()=>{ ir('/aurora-jogo.html'); } },
      { ico:'🤖', label:'Automata',               cat:'ia',        on:()=>{ ir('/automacoes.html'); } },
      { ico:'👤', label:'Minha Área',  cat:'navegacao', on:()=>{ ir('/minha-area.html'); } },
      { ico:'🏠', label:'Início',      cat:'navegacao', on:()=>{ ir('/'); } }
    );
    return itens;
  }
  // Disponível pra outras páginas reaproveitarem as opções padrão depois das suas.
  window.VSDefaultFab = { itens: buildItens };

  function montar() {
    if (!window.VSFab) return;
    if (window.VSFab._montado) return; // pagina ja configurou FAB proprio
    VSFab.montar({
      ancora: 'top-right',
      label: document.body.dataset.vsTitle || document.title.replace(/\s*[—·\-|]\s*Vento Sul.*/i,'').trim() || 'Vento Sul',
      itens: buildItens()
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
  else setTimeout(montar, 0);
})();
