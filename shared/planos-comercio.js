// planos-comercio.js — vitrine de planos do comerciante, embutível em qualquer
// página de cidade/bairro. Monta em #planos-comercio-mount.
// Clica num plano -> modal com detalhes + telefone Vento Sul + QR Pix (abre o pagamento real).
(function () {
  var TEL = "5548992467821";             // WhatsApp Vento Sul (Vento Sul)
  var PAG = "/comerciante-planos.html";  // fluxo de pagamento real (Pix Mercado Pago)

  // ⚖️ TABELA ÚNICA DOS PLANOS — quantidades valem em TODAS as páginas.
  // Anual = 10x o mensal (2 meses grátis). Push de promoção só chega em quem
  // MARCOU o gosto nas preferências (🔔) — honesto pro cliente, certeiro pro lojista.
  var PLANOS = [
    { slug:"gratis", ico:"🌊", nome:"Cadastro Grátis", preco:"R$ 0", per:"pra sempre", anual:"",
      resumo:"Existir aqui é grátis, sempre.", destaque:false,
      feats:["Fotos, descrição, mapa e contato","IA Litorânea responde o cliente por você","Comissão R$ 0 — só R$ 1,95 fixo por venda"] },
    { slug:"carrossel", ico:"🖼️", nome:"Carrossel de Imagens", preco:"R$ 9", per:"/mês", anual:"R$ 90/ano",
      resumo:"Suas fotos girando no carrossel da cidade.", destaque:false,
      feats:["Até 5 fotos no carrossel da cidade e do bairro","1 push de promoção/mês (só pra quem marcou seu ramo)","Estatística de impressões e cliques","7 dias grátis pra testar"] },
    { slug:"perto", ico:"📍", nome:"Perto + GPS + Mapa", preco:"R$ 14", per:"/mês", anual:"R$ 140/ano",
      resumo:"Apareça pra quem está pertinho.", destaque:false,
      feats:["Destaque no 'Perto de Você' + pin no mapa","Achado por GPS (raio 100m–2km)","2 push de promoção/mês (só pra quem marcou seu ramo)","7 dias grátis"] },
    { slug:"banner", ico:"📰", nome:"Banner Destaque", preco:"R$ 19", per:"/7 dias", anual:"",
      resumo:"Banner em destaque no topo da cidade.", destaque:false,
      feats:["Posição nº 1 no topo por 7 dias","Banner montado com IA","Relatório de cliques no fim"] },
    { slug:"smartview", ico:"📺", nome:"Smart TV (DOOH)", preco:"R$ 29", per:"/mês", anual:"R$ 290/ano",
      resumo:"Sua propaganda em telas pra quem está perto.", destaque:false,
      feats:["DOOH Vivo (TV/telas de parceiros)","Aparece pra gente próxima","Dashboard de quantos passaram","14 dias grátis"] },
    { slug:"redes", ico:"📣", nome:"Rádio + Redes + Caça", preco:"R$ 19", per:"/mês", anual:"R$ 190/ano",
      resumo:"Anúncio na rádio, redes e caça ao tesouro.", destaque:false,
      feats:["4 anúncios/mês na Rádio Vento Sul","Post automático nas redes (5 IAs revisam)","Aparição no Caça ao Tesouro","2 push de promoção/mês","7 dias grátis"] },
    { slug:"completo", ico:"🌟", nome:"Plano Completo", preco:"R$ 39", per:"/mês", anual:"R$ 390/ano", destaque:true,
      resumo:"TUDO junto, o mais barato do Brasil.",
      feats:["Carrossel (10 fotos) + Perto + Banner + Smart TV + Redes","12 anúncios/mês na Rádio Vento Sul","8 push de promoção/mês (só pra quem marcou seu ramo)","Destaque no Chat da Galera 1x/semana","Prioridade nas buscas + relatório quinzenal","14 dias grátis"] },
  ];
  window.VS_PLANOS = PLANOS; // outras páginas leem daqui — tabela única

  function el(html){ var d=document.createElement("div"); d.innerHTML=html.trim(); return d.firstChild; }

  // ── Pix BR Code (EMV) — cai DIRETO na conta, sem taxa de gateway ──
  var PIX_KEY = "70103e7e-9c5a-44f4-8729-ce2e27f8ee7d";
  function _tlv(i,v){ return i + String(v.length).padStart(2,"0") + v; }
  function _crc16(s){ var crc=0xFFFF; for(var i=0;i<s.length;i++){ crc^=s.charCodeAt(i)<<8; for(var j=0;j<8;j++){ crc=(crc&0x8000)?((crc<<1)^0x1021)&0xFFFF:(crc<<1)&0xFFFF; } } return crc.toString(16).toUpperCase().padStart(4,"0"); }
  function pixCode(valor){
    var mai=_tlv("00","br.gov.bcb.pix")+_tlv("01",PIX_KEY);
    var p=_tlv("00","01")+_tlv("26",mai)+_tlv("52","0000")+_tlv("53","986")
      +(valor?_tlv("54",valor):"")+_tlv("58","BR")+_tlv("59","VENTO SUL")+_tlv("60","FLORIANOPOLIS")+_tlv("62",_tlv("05","***"));
    p+="6304"; return p+_crc16(p);
  }

  // ── Balanceamento Fase 1: até 50% mantém o app no ar (servidor+manutenção+fundador) ──
  function _barAloc(label, pct, cor, valorStr){
    var reais = (parseFloat(valorStr||"0")*pct/100).toFixed(2).replace(".",",");
    return '<div style="margin-bottom:8px">'
      + '<div style="display:flex;justify-content:space-between;gap:8px;font-size:.7rem;color:#cfe3f5;margin-bottom:3px"><span>'+label+'</span><span style="font-weight:800;color:'+cor+';white-space:nowrap">'+pct+'% · R$ '+reais+'</span></div>'
      + '<div style="height:8px;background:#0a1a2a;border-radius:6px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+cor+'"></div></div>'
      + '</div>';
  }

  function abrirModal(p){
    var msg = encodeURIComponent("Oi! Quero o plano " + p.nome + " (" + p.preco + p.per + ") no Vento Sul 🚀");
    var valor = (p.preco.match(/[0-9]+/) || [])[0];
    var pix = valor ? pixCode(valor + ".00") : "";
    var qr  = pix ? ("https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=" + encodeURIComponent(pix)) : "";
    var feats = p.feats.map(function(f){ return '<li style="padding:5px 0;color:#cfe3f5;font-size:.92rem">✓ '+f+'</li>'; }).join("");
    var m = el(
      '<div id="pc-modal" style="position:fixed;inset:0;z-index:100000;background:rgba(4,17,29,.92);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:18px;font-family:system-ui,sans-serif">'
      + '<div style="background:#0d2840;border:1px solid #1d5a8a;border-radius:18px;max-width:380px;width:100%;max-height:92vh;overflow:auto;padding:20px;text-align:center;color:#eaf4ff">'
      + '<div style="font-size:42px">'+p.ico+'</div>'
      + '<div style="font-size:1.3rem;font-weight:800">'+p.nome+'</div>'
      + '<div style="font-size:2rem;font-weight:900;color:#06d6a0;margin:4px 0">'+p.preco+'<span style="font-size:.45em;color:#9cc2dd;font-weight:600">'+p.per+'</span></div>'
      + (p.anual?'<div style="font-size:.95rem;color:#ffd54f;font-weight:700;margin-bottom:6px">💛 Promo anual: '+p.anual+' (2 meses grátis)</div>':'')
      + '<p style="color:#9cc2dd;font-size:.9rem;margin-bottom:8px">'+p.resumo+'</p>'
      + '<ul style="list-style:none;padding:0;margin:0 0 14px;text-align:left;display:inline-block">'+feats+'</ul>'
      + (valor ? (
          '<div style="background:#08263c;border:1px solid #16466b;border-radius:12px;padding:12px;margin:0 0 14px;text-align:left">'
          + '<div style="font-weight:800;font-size:.8rem;color:#06d6a0;margin-bottom:8px">📊 Pra onde vai teu dinheiro (Fase 1 · semente)</div>'
          + _barAloc("🛠️ Manter o app no ar (servidor + manutenção + fundador)", 50, "#ffd54f", valor)
          + _barAloc("💚 Volta pra comunidade (promoções + prêmios)", 50, "#06d6a0", valor)
          + '<div style="font-size:.68rem;color:#9cc2dd;margin-top:8px;line-height:1.4">Hoje os custos (VPS, manutenção) ainda não se pagam — por isso até 50% sustenta o app. Quando se pagar sozinho → vira <b style="color:#06d6a0">1% admin · 99% comunidade</b> (Fase 2). Conta 100% aberta em <a href="/transparencia.html" style="color:#7dd3fc">/transparencia</a> · ajuste a sua parte em <a href="/minhas-alocacoes.html" style="color:#7dd3fc">minhas alocações</a> 🌊</div>'
          + '</div>'
        ) : '')
      + (pix ? (
          '<div style="font-size:.82rem;color:#06d6a0;font-weight:700;margin:2px 0 8px">🪙 Pix direto — sem taxa, cai 100% na conta Vento Sul</div>'
          + '<img src="'+qr+'" alt="QR Pix" style="width:200px;height:200px;background:#fff;padding:8px;border-radius:12px">'
          + '<div style="background:#08263c;border:1px solid #16466b;border-radius:10px;padding:9px;margin:10px 0 6px;font-size:.62rem;word-break:break-all;color:#cfe3f5;line-height:1.4">'+pix+'</div>'
          + '<button id="pc-copiar" style="background:#16466b;color:#fff;border:none;padding:11px 18px;border-radius:30px;cursor:pointer;font-weight:700;margin-bottom:12px">📋 Copiar código Pix</button>'
        ) : '<div style="color:#9cc2dd;margin:8px 0 14px">Esse é grátis — só falar com a gente! 🌊</div>')
      + '<a href="https://wa.me/'+TEL+'?text='+msg+'" target="_blank" style="display:block;background:#25d366;color:#04111d;font-weight:800;padding:13px;border-radius:12px;text-decoration:none;margin-bottom:14px">📞 Falar com o Vento Sul — (48) 99246-7821</a>'
      + '<div style="font-size:.72rem;color:#6f8ea0;margin-top:10px">Vento Sul · o mais justo possível 🌊</div>'
      + '<button id="pc-fechar" style="margin-top:14px;background:#08263c;border:1px solid #16466b;color:#eaf4ff;padding:10px 18px;border-radius:30px;cursor:pointer;font-weight:700">✕ Fechar</button>'
      + '</div></div>'
    );
    m.addEventListener("click", function(e){ if(e.target===m) m.remove(); });
    document.body.appendChild(m);
    document.getElementById("pc-fechar").onclick = function(){ m.remove(); };
    var cp = document.getElementById("pc-copiar");
    if (cp) cp.onclick = function(){ try{ navigator.clipboard.writeText(pix); cp.textContent="✅ Copiado!"; }catch(e){ cp.textContent="copie o código acima"; } };
  }

  function montar(){
    var alvo = document.getElementById("planos-comercio-mount");
    if (!alvo || alvo.dataset.ok) return;
    alvo.dataset.ok = "1";
    var cards = PLANOS.map(function(p){
      return '<button class="pc-card" data-slug="'+p.slug+'" style="flex:0 0 168px;text-align:left;cursor:pointer;background:'
        + (p.destaque?'linear-gradient(160deg,#143a2e,#0d2840)':'#0d2840')
        + ';border:1px solid '+(p.destaque?'#06d6a0':'#16466b')+';border-radius:16px;padding:14px;color:#eaf4ff;scroll-snap-align:start">'
        + (p.destaque?'<div style="font-size:.66rem;font-weight:800;color:#06d6a0;letter-spacing:1px;margin-bottom:4px">⭐ MAIS COMPLETO</div>':'')
        + '<div style="font-size:26px">'+p.ico+'</div>'
        + '<div style="font-weight:800;font-size:.98rem;margin-top:2px">'+p.nome+'</div>'
        + '<div style="font-size:1.4rem;font-weight:900;color:#06d6a0;margin:3px 0">'+p.preco+'<span style="font-size:.42em;color:#9cc2dd;font-weight:600">'+p.per+'</span></div>'
        + (p.anual?'<div style="font-size:.7rem;color:#ffd54f;margin-bottom:3px">ou '+p.anual+' (2 meses grátis)</div>':'')
        + '<div style="font-size:.78rem;color:#9cc2dd;line-height:1.3">'+p.resumo+'</div>'
        + '</button>';
    }).join("");
    alvo.innerHTML =
      '<div style="margin:22px 0 10px"><div style="font-size:.72rem;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:#06d6a0;margin-bottom:3px">💰 Anuncie seu comércio aqui</div>'
      + '<div style="font-size:.84rem;color:#9cc2dd">Planos a partir de R$ 9/mês — o mais barato e justo possível. Toque pra ver e assinar.</div></div>'
      + '<div style="display:flex;gap:10px;overflow-x:auto;padding:4px 0 8px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch">'+cards+'</div>';
    alvo.querySelectorAll(".pc-card").forEach(function(b){
      b.addEventListener("click", function(){
        var p = PLANOS.find(function(x){return x.slug===b.dataset.slug;});
        if (p) abrirModal(p);
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar);
  else montar();
  // re-tenta caso o mount apareça depois (SPA da cidade)
  var _n=0, _iv=setInterval(function(){ montar(); if(++_n>20) clearInterval(_iv); }, 800);
})();
