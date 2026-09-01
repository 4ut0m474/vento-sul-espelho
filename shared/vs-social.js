/* vs-social.js — janelas IN-APP pros nossos canais, em QUALQUER página.
 * Abre YouTube e Instagram sem sair do app, e um hub com YT · Insta · WhatsApp.
 *
 *   VSSocial.abrir(url)        -> detecta YT/IG/imagem e abre embedado
 *   VSSocial.video(tipo, id)   -> 'yt' | 'insta'
 *   VSSocial.foto(url)
 *   VSSocial.canais()          -> hub: YouTube, Instagram, Assistente WhatsApp
 *
 * Auto-injeta o modal + CSS. Zero dependência. Reaproveita a ideia do jornal.
 */
(function () {
  if (window.VSSocial) return;

  // ⚙️ Nossos canais (atualizar aqui quando mudar)
  const CANAIS = {
    youtube:   { handle: '@vento-sul_tech', url: 'https://youtube.com/@vento-sul_tech', destaque: 'Hqj4D0lgIFo',
                 live: 'https://www.youtube.com/@vento-sul_tech/live', channelId: 'UCOqPLLEQ0YLI2HQ6ermY4lw' },
    instagram: { handle: '@oraculodesilicio', url: 'https://instagram.com/oraculodesilicio' },
    whatsapp:  { num: '5548992467821', nome: 'Assistente Vento Sul' },
  };

  const esc = (s) => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  function ensureDom() {
    if (document.getElementById('vs-social-modal')) return;
    const css = document.createElement('style');
    css.textContent = `
      #vs-social-modal{position:fixed;inset:0;z-index:99990;display:none;background:rgba(3,6,14,.92);
        backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:14px}
      #vs-social-modal.on{display:flex}
      .vss-card{width:100%;max-width:440px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;
        background:#0d1320;border:1px solid rgba(255,255,255,.12);border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.6)}
      .vss-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;
        border-bottom:1px solid rgba(255,255,255,.08);font-weight:700;color:#e8edf5;font-size:14px}
      .vss-close{background:rgba(255,255,255,.1);color:#fff;border:0;border-radius:9px;padding:7px 12px;font-weight:700;cursor:pointer;font-size:13px}
      .vss-frame{background:#000;aspect-ratio:9/16;max-height:74vh}
      .vss-frame iframe,.vss-frame img{width:100%;height:100%;border:0;display:block;object-fit:contain}
      .vss-body{padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:10px}
      .vss-item{display:flex;gap:12px;align-items:center;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);
        border-radius:14px;padding:12px;text-decoration:none;color:#e8edf5;cursor:pointer;transition:transform .15s,border-color .15s}
      .vss-item:hover{transform:translateY(-2px);border-color:rgba(255,255,255,.25)}
      .vss-ico{font-size:26px;width:42px;text-align:center;flex:0 0 auto}
      .vss-it-t{font-weight:800;font-size:14px}
      .vss-it-s{font-size:12px;color:#9fb0c4;margin-top:2px;line-height:1.4}`;
    document.head.appendChild(css);
    const m = document.createElement('div');
    m.id = 'vs-social-modal';
    m.innerHTML = `<div class="vss-card">
      <div class="vss-head"><span class="vss-tit">📲 Vento Sul</span>
        <button class="vss-close" onclick="VSSocial.fechar()">✕ voltar pro app</button></div>
      <div class="vss-frame" style="display:none"></div>
      <div class="vss-body" style="display:none"></div></div>`;
    m.addEventListener('click', (e) => { if (e.target === m) VSSocial.fechar(); });
    document.body.appendChild(m);
  }

  function setHead(t){ document.querySelector('#vs-social-modal .vss-tit').textContent = t; }
  function open(){ ensureDom(); document.getElementById('vs-social-modal').classList.add('on'); }

  function showFrame(html, titulo){
    open(); setHead(titulo || '📲 Vento Sul');
    const fr = document.querySelector('#vs-social-modal .vss-frame');
    const bd = document.querySelector('#vs-social-modal .vss-body');
    bd.style.display = 'none'; bd.innerHTML = '';
    fr.style.display = ''; fr.innerHTML = html;
  }
  function showBody(html, titulo){
    open(); setHead(titulo || '📲 Vento Sul');
    const fr = document.querySelector('#vs-social-modal .vss-frame');
    const bd = document.querySelector('#vs-social-modal .vss-body');
    fr.style.display = 'none'; fr.innerHTML = '';
    bd.style.display = ''; bd.innerHTML = html;
  }

  const VSSocial = {
    parse(t){
      if(!t) return null;
      let m = t.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/i);
      if(m) return { tipo:'yt', id:m[1] };
      m = t.match(/youtube\.com\/playlist\?list=([\w-]+)/i);
      if(m) return { tipo:'ytlist', id:m[1] };
      m = t.match(/instagram\.com\/(?:p|reel|tv)\/([\w-]+)/i);
      if(m) return { tipo:'insta', id:m[1] };
      if(/\.(jpe?g|png|webp|gif)(\?|$)/i.test(t)) return { tipo:'img', id:t };
      return null;
    },
    video(tipo, id){
      const src = tipo==='ytlist' ? `https://www.youtube.com/embed/videoseries?list=${id}`
        : tipo==='yt' ? `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1`
        : `https://www.instagram.com/p/${id}/embed`;
      const tit = (tipo==='insta') ? '📷 Instagram' : '▶️ YouTube';
      showFrame(`<iframe src="${src}" allow="autoplay; encrypted-media; clipboard-write; picture-in-picture" allowfullscreen></iframe>`, tit);
      const fr = document.querySelector('#vs-social-modal .vss-frame');
      if (fr) fr.style.aspectRatio = '';
    },
    foto(url){ showFrame(`<img src="${esc(url)}" alt="foto">`, '🖼️ Foto'); },
    abrir(url){
      const v = this.parse(url);
      if(!v){ window.open(url, '_blank', 'noopener'); return; }
      if(v.tipo==='img') return this.foto(v.id);
      return this.video(v.tipo, v.id);
    },
    aoVivo(){
      // 📻 a rádio tocando no YouTube — embeda a live atual do canal (sempre pega a live do momento)
      showFrame(`<iframe src="https://www.youtube.com/embed/live_stream?channel=${CANAIS.youtube.channelId}&autoplay=1&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`, '📻 Rádio Vento Sul ao vivo');
      const fr = document.querySelector('#vs-social-modal .vss-frame');
      if (fr) fr.style.aspectRatio = '16/9';
    },
    canais(){
      const yt = CANAIS.youtube, ig = CANAIS.instagram, wa = CANAIS.whatsapp;
      const zapMsg = encodeURIComponent('Oi! Sou do app Vento Sul 🌊 Quero falar com o assistente — tirar dúvida e receber as promoções dos parceiros.');
      showBody(`
        <div class="vss-item" onclick="VSSocial.aoVivo()">
          <div class="vss-ico">📻</div>
          <div><div class="vss-it-t">Rádio Vento Sul ao vivo 24h</div>
          <div class="vss-it-s">A rádio tocando no YouTube, aqui dentro do app.</div></div></div>

        <div class="vss-item" onclick="window.open('${yt.url}','_blank','noopener')">
          <div class="vss-ico">📺</div>
          <div><div class="vss-it-t">Nosso canal · ${esc(yt.handle)}</div>
          <div class="vss-it-s">Todos os vídeos no YouTube.</div></div></div>

        <div class="vss-item" onclick="window.open('${ig.url}','_blank','noopener')">
          <div class="vss-ico">📷</div>
          <div><div class="vss-it-t">Instagram · ${esc(ig.handle)}</div>
          <div class="vss-it-s">Nosso feed. (Posts e reels também abrem aqui dentro quando alguém cola o link no chat.)</div></div></div>

        <div class="vss-item" onclick="window.open('https://wa.me/${wa.num}?text=${zapMsg}','_blank','noopener')">
          <div class="vss-ico">💬</div>
          <div><div class="vss-it-t">${esc(wa.nome)} no WhatsApp</div>
          <div class="vss-it-s">Tira dúvida sobre o app e <b>recebe as promoções dos parceiros</b> direto no seu Zap.</div></div></div>
      `, '📲 Nossos canais');
    },
    fechar(){
      const m = document.getElementById('vs-social-modal'); if(!m) return;
      m.classList.remove('on');
      m.querySelector('.vss-frame').innerHTML = '';
      m.querySelector('.vss-body').innerHTML = '';
    },
  };
  window.VSSocial = VSSocial;
})();
