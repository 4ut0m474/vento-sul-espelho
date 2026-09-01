// 🧭 Rosinha v6 — Bússola Desbravadora · 3 Skins Imersivas · Vento Sul
// Skins: 'pirata' | 'tech' | 'dino'
// API: Rosinha.init('#el',{skin,tamanho}) · setSkin · setBearing · setAccuracy · falar · alerta

(function(global){
'use strict';

// ── helpers ───────────────────────────────────────────────────────
function P(cx,cy,r,deg){const a=deg*Math.PI/180;return{x:cx+r*Math.sin(a),y:cy-r*Math.cos(a)};}
function ps(cx,cy,r,deg){const p=P(cx,cy,r,deg);return`${p.x.toFixed(2)},${p.y.toFixed(2)}`;}

function gear(n,ri,ro,cx=100,cy=100){
  const step=360/n;let d='';
  for(let i=0;i<n;i++){
    const a0=i*step-step*.28,a1=i*step-step*.06,a2=i*step+step*.06,a3=i*step+step*.28;
    const p0=P(cx,cy,ri,a0),p1=P(cx,cy,ro,a1),p2=P(cx,cy,ro,a2),p3=P(cx,cy,ri,a3);
    const pN=P(cx,cy,ri,(i+1)*step-step*.28);
    d+=(i===0?'M':'L')+`${p0.x.toFixed(2)},${p0.y.toFixed(2)} `;
    d+=`L${p1.x.toFixed(2)},${p1.y.toFixed(2)} L${p2.x.toFixed(2)},${p2.y.toFixed(2)} `;
    d+=`L${p3.x.toFixed(2)},${p3.y.toFixed(2)} A${ri},${ri} 0 0,1 ${pN.x.toFixed(2)},${pN.y.toFixed(2)} `;
  }
  return d+'Z';
}

function tks(n,r1,r2,stroke,sw,op,cx=100,cy=100){
  return Array.from({length:n},(_,i)=>{
    const a=i*360/n,p1=P(cx,cy,r1,a),p2=P(cx,cy,r2,a);
    return`<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="${stroke}" stroke-width="${sw}" opacity="${op}"/>`;
  }).join('');
}

function rose(cx=100,cy=100){
  let s='';
  for(let i=0;i<8;i++){
    const a=i*45,major=i%2===0,tipR=major?63:50;
    const tip=P(cx,cy,tipR,a),s1=P(cx,cy,17,a-9),s2=P(cx,cy,17,a+9);
    s+=`<polygon points="${tip.x.toFixed(1)},${tip.y.toFixed(1)} ${s1.x.toFixed(1)},${s1.y.toFixed(1)} ${cx},${cy} ${s2.x.toFixed(1)},${s2.y.toFixed(1)}" fill="${major?'#c89028':'#e8c060'}" opacity="${major?.44:.22}"/>`;
  }
  return s;
}

// ── SVG por skin ──────────────────────────────────────────────────
const SVG={

// ════════════════════════════════════════════════════════════════
//  🏴‍☠️  PIRATA — Bússola náutica de latão envelhecida em couro
// ════════════════════════════════════════════════════════════════
pirata:(uid)=>`
<svg viewBox="0 0 200 200" class="rosinha-svg" xmlns="http://www.w3.org/2000/svg">
<defs>
  <radialGradient id="pk-${uid}" cx="42%" cy="38%" r="68%">
    <stop offset="0%" stop-color="#5a3018"/><stop offset="65%" stop-color="#2e1408"/><stop offset="100%" stop-color="#130804"/>
  </radialGradient>
  <linearGradient id="pg-${uid}" x1="5%" y1="5%" x2="95%" y2="95%">
    <stop offset="0%" stop-color="#f2d45c"/><stop offset="28%" stop-color="#d4a030"/><stop offset="62%" stop-color="#a06e18"/><stop offset="100%" stop-color="#5c3c0a"/>
  </linearGradient>
  <radialGradient id="pf-${uid}" cx="44%" cy="36%" r="72%">
    <stop offset="0%" stop-color="#f6f0dc"/><stop offset="60%" stop-color="#ead8b8"/><stop offset="100%" stop-color="#d0be98"/>
  </radialGradient>
  <radialGradient id="pc-${uid}" cx="32%" cy="30%">
    <stop offset="0%" stop-color="#ffea80"/><stop offset="55%" stop-color="#d4a028"/><stop offset="100%" stop-color="#7a4e10"/>
  </radialGradient>
  <linearGradient id="pnN-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#7a0600"/><stop offset="50%" stop-color="#e01800"/><stop offset="100%" stop-color="#7a0600"/>
  </linearGradient>
  <linearGradient id="pnS-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#c0aa88"/><stop offset="50%" stop-color="#f2e8cc"/><stop offset="100%" stop-color="#c0aa88"/>
  </linearGradient>
  <filter id="pgw-${uid}" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="2.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="psh-${uid}"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#00000090"/></filter>
</defs>

<!-- COURO EXTERIOR -->
<circle cx="100" cy="100" r="99" fill="url(#pk-${uid})"/>
<!-- costura de couro -->
${Array.from({length:44},(_,i)=>{const p=P(100,100,93,i*8.18);return`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r=".85" fill="#3c1c0a" opacity=".55"/>`;}).join('')}
<!-- marcas de desgaste -->
${[15,87,142,213,268,311].map(a=>{const p=P(100,100,86,a);return`<line x1="${(p.x-2).toFixed(1)}" y1="${(p.y-3).toFixed(1)}" x2="${(p.x+2).toFixed(1)}" y2="${(p.y+3).toFixed(1)}" stroke="#1a0a04" stroke-width="1.2" opacity=".4"/>`;}).join('')}

<!-- BEZEL ENGRENAGEM DE LATÃO -->
<path d="${gear(32,82,97)}" fill="url(#pg-${uid})" filter="url(#psh-${uid})"/>
<!-- anel brilhante interno do bezel -->
<circle cx="100" cy="100" r="83" fill="none" stroke="#f2d45c" stroke-width=".8" opacity=".45"/>
<circle cx="100" cy="100" r="82" fill="none" stroke="#7a5018" stroke-width="1.5" opacity=".6"/>

<!-- FACE PERGAMINHO -->
<circle cx="100" cy="100" r="81" fill="url(#pf-${uid})"/>

<!-- ROSA DOS VENTOS decorativa (fundo fixo) -->
${rose()}
<!-- anel dourado na rosa -->
<circle cx="100" cy="100" r="20" fill="none" stroke="#c89028" stroke-width=".7" opacity=".35"/>

<!-- MARCAÇÕES DE GRAU -->
${tks(72,75,79,'#b07820',.75,.4)}
${tks(12,73,81,'#c89028',1.6,.8)}
${tks(4,70,83,'#a06018',2.5,1)}

<!-- Graus a cada 30° (sem cardinais) -->
${[30,60,120,150,210,240,300,330].map(a=>{const p=P(100,100,65,a);return`<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="Georgia,serif" font-size="5.5" fill="#9a7030" opacity=".6">${a}</text>`;}).join('')}

<!-- CARDINAIS -->
${(()=>{const p=P(100,100,53,0);return`<text x="${p.x.toFixed(1)}" y="${(p.y+.5).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="'Palatino Linotype',Georgia,serif" font-size="17" font-weight="900" fill="#dd2800" filter="url(#pgw-${uid})">N</text>`;})()}
${(()=>{const p=P(100,100,67,0);return`<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="serif" font-size="11" fill="#c89028" opacity=".9">✦</text>`;})()}
${(()=>{const p=P(100,100,54,180);return`<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="'Palatino Linotype',Georgia,serif" font-size="13" font-weight="700" fill="#9a6030">S</text>`;})()}
${(()=>{const p=P(100,100,54,90);return`<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="'Palatino Linotype',Georgia,serif" font-size="13" font-weight="700" fill="#9a6030">L</text>`;})()}
${(()=>{const p=P(100,100,54,270);return`<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="'Palatino Linotype',Georgia,serif" font-size="13" font-weight="700" fill="#9a6030">O</text>`;})()}
${['NE','SE','SO','NO'].map((l,i)=>{const p=P(100,100,45,45+i*90);return`<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="Georgia,serif" font-size="7" fill="#b87820" opacity=".65">${l}</text>`;}).join('')}

<!-- REBITES nos 45° da engrenagem -->
${Array.from({length:8},(_,i)=>{const p=P(100,100,90,i*45+22.5);return`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.8" fill="#d4a030" stroke="#7a5018" stroke-width=".8"/>`;}).join('')}

<!-- AGULHA -->
<g class="rosinha-agulha" style="transform-origin:100px 100px">
  <!-- sombra da agulha -->
  <polygon points="101.5,31 106.5,101 101.5,110 96.5,101" fill="#00000044" transform="translate(2,2)"/>
  <!-- norte vermelho -->
  <polygon points="100,29 105.5,100 100,109 94.5,100" fill="url(#pnN-${uid})" filter="url(#pgw-${uid})"/>
  <!-- reflexo brilhante norte -->
  <polygon points="100,29 102.5,72 100,80 97.5,72" fill="#ff6644" opacity=".38"/>
  <!-- sul marfim -->
  <polygon points="100,171 105.5,100 100,91 94.5,100" fill="url(#pnS-${uid})"/>
  <!-- linha de junção decorativa -->
  <line x1="100" y1="91" x2="100" y2="109" stroke="#d4a030" stroke-width=".6" opacity=".5"/>
  <!-- pivot -->
  <circle cx="100" cy="100" r="9" fill="#120804" stroke="#d4a030" stroke-width="2.2"/>
  <circle cx="100" cy="100" r="5" fill="url(#pc-${uid})"/>
  <circle cx="98.5" cy="98.8" r="1.6" fill="#fff8c8" opacity=".65"/>
</g>

<!-- ANEL DE PRECISÃO -->
<circle cx="100" cy="100" r="82.5" fill="none" stroke="var(--rosinha-acc-cor,#c89028)" stroke-width="3" opacity="var(--rosinha-acc-op,0)" class="rosinha-acc-ring"/>
</svg>`,

// ════════════════════════════════════════════════════════════════
//  🔬  TECH — HUD holográfico · grade hexagonal · alvo futurista
// ════════════════════════════════════════════════════════════════
tech:(uid)=>`
<svg viewBox="0 0 200 200" class="rosinha-svg" xmlns="http://www.w3.org/2000/svg">
<defs>
  <pattern id="th-${uid}" x="0" y="0" width="12" height="20.8" patternUnits="userSpaceOnUse">
    <path d="M6,1 L11,3.5 L11,8.5 L6,11 L1,8.5 L1,3.5Z" fill="none" stroke="#00d4ff" stroke-width=".35" opacity=".22"/>
    <path d="M12,11.4 L17,13.9 L17,18.9 L12,21.4 L7,18.9 L7,13.9Z" fill="none" stroke="#00d4ff" stroke-width=".35" opacity=".22"/>
  </pattern>
  <clipPath id="tc-${uid}"><circle cx="100" cy="100" r="91"/></clipPath>
  <radialGradient id="tb-${uid}"><stop offset="0%" stop-color="#001a30"/><stop offset="100%" stop-color="#00060f"/></radialGradient>
  <filter id="tgw-${uid}" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="tsg-${uid}" x="-80%" y="-80%" width="260%" height="260%">
    <feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="tow-${uid}"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <linearGradient id="tnN-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#007744"/><stop offset="50%" stop-color="#00ff88"/><stop offset="100%" stop-color="#007744"/>
  </linearGradient>
  <radialGradient id="tscan-${uid}" cx="50%" cy="100%" fx="50%" fy="100%" r="55%">
    <stop offset="0%" stop-color="#00ffcc33"/><stop offset="100%" stop-color="transparent"/>
  </radialGradient>
</defs>

<!-- FUNDO ESCURO -->
<circle cx="100" cy="100" r="99" fill="url(#tb-${uid})"/>

<!-- GRADE HEXAGONAL (clipped) -->
<rect x="-10" y="-10" width="220" height="220" fill="url(#th-${uid})" clip-path="url(#tc-${uid})"/>

<!-- ANÉIS CONCÊNTRICOS -->
<circle cx="100" cy="100" r="97" fill="none" stroke="#00d4ff" stroke-width="2.5" opacity=".7" filter="url(#tow-${uid})"/>
<circle cx="100" cy="100" r="94" fill="none" stroke="#00d4ff" stroke-width=".5" stroke-dasharray="6 3" opacity=".3"/>
<circle cx="100" cy="100" r="80" fill="none" stroke="#00d4ff" stroke-width="1" stroke-dasharray="4 4" opacity=".25"/>
<circle cx="100" cy="100" r="65" fill="none" stroke="#0088cc" stroke-width=".6" opacity=".2"/>
<circle cx="100" cy="100" r="50" fill="none" stroke="#00d4ff" stroke-width=".5" stroke-dasharray="2 5" opacity=".18"/>
<circle cx="100" cy="100" r="35" fill="none" stroke="#00ccff" stroke-width=".7" opacity=".25"/>
<circle cx="100" cy="100" r="18" fill="none" stroke="#00d4ff" stroke-width=".8" opacity=".35"/>

<!-- MARCAÇÕES DE GRAU -->
${tks(72,87,91,'#00d4ff',.7,.38)}
${tks(36,86,92,'#00ffcc',1,.65)}
${tks(4,83,96,'#00ffcc',2.5,.95)}

<!-- CROSSHAIRS FINOS (cardinal) -->
${[0,90,180,270].map(a=>{const p1=P(100,100,18,a),p2=P(100,100,82,a);return`<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="#00d4ff" stroke-width=".4" opacity=".2"/>`;}).join('')}

<!-- BRACKETS HUD nos quadrantes -->
${[0,90,180,270].map(a=>{
  const pc=P(100,100,94,a),p1=P(100,100,94,a-14),p2=P(100,100,82,a-14),p3=P(100,100,82,a),pr1=P(100,100,94,a+14),pr2=P(100,100,82,a+14);
  return`<polyline points="${p1.x.toFixed(1)},${p1.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)} ${p3.x.toFixed(1)},${p3.y.toFixed(1)}" fill="none" stroke="#00ffcc" stroke-width="2" opacity=".9" filter="url(#tow-${uid})"/>
<polyline points="${pr1.x.toFixed(1)},${pr1.y.toFixed(1)} ${pr2.x.toFixed(1)},${pr2.y.toFixed(1)} ${p3.x.toFixed(1)},${p3.y.toFixed(1)}" fill="none" stroke="#00ffcc" stroke-width="2" opacity=".9" filter="url(#tow-${uid})"/>`;
}).join('')}

<!-- NÚMEROS nos 45° -->
${[45,135,225,315].map(a=>{const p=P(100,100,72,a);return`<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="'Courier New',monospace" font-size="7" fill="#00d4ff" opacity=".5">${a}</text>`;}).join('')}

<!-- CARDINAIS NEON -->
${(()=>{const p=P(100,100,54,0);return`<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="'Courier New',monospace" font-size="14" font-weight="900" fill="#00ffaa" filter="url(#tgw-${uid})">N</text>`;})()}
${(()=>{const p=P(100,100,55,180);return`<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="'Courier New',monospace" font-size="11" fill="#00d4ff" opacity=".8">S</text>`;})()}
${(()=>{const p=P(100,100,55,90);return`<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="'Courier New',monospace" font-size="11" fill="#00d4ff" opacity=".8">L</text>`;})()}
${(()=>{const p=P(100,100,55,270);return`<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="'Courier New',monospace" font-size="11" fill="#00d4ff" opacity=".8">O</text>`;})()}

<!-- FEIXE DE SCAN (animado via CSS) -->
<g class="rosinha-scan" style="transform-origin:100px 100px">
  <path d="M100,100 L${P(100,100,91,0).x.toFixed(1)},${P(100,100,91,0).y.toFixed(1)} A91,91 0 0,1 ${P(100,100,91,28).x.toFixed(1)},${P(100,100,91,28).y.toFixed(1)} Z" fill="url(#tscan-${uid})" opacity=".65"/>
</g>

<!-- AGULHA HOLOGRÁFICA -->
<g class="rosinha-agulha" style="transform-origin:100px 100px" filter="url(#tsg-${uid})">
  <!-- corpo norte (verde neon) -->
  <polygon points="100,24 105.5,97 100,109 94.5,97" fill="#002a14" stroke="#00ff88" stroke-width="1.2"/>
  <!-- ponta brilhante norte -->
  <polygon points="100,24 103.5,82 100,90 96.5,82" fill="url(#tnN-${uid})"/>
  <!-- sul (azul escuro) -->
  <polygon points="100,176 105.5,103 100,91 94.5,103" fill="#003366" stroke="#005599" stroke-width=".8" opacity=".75"/>
  <!-- pivot central -->
  <circle cx="100" cy="100" r="8" fill="#000d1a" stroke="#00d4ff" stroke-width="1.8"/>
  <circle cx="100" cy="100" r="4.5" fill="#00d4ff" opacity=".9"/>
  <circle cx="100" cy="100" r="2" fill="#ffffff"/>
</g>

<!-- RETÍCULO CENTRAL -->
${[0,90,180,270].map(a=>{const p1=P(100,100,10,a),p2=P(100,100,16,a);return`<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="#00ffcc" stroke-width="1.2" opacity=".8"/>`;}).join('')}
<circle cx="100" cy="100" r="8" fill="none" stroke="#00d4ff" stroke-width="1" opacity=".5"/>

<!-- PULSO EXTERNO (animado) -->
<circle cx="100" cy="100" r="93" fill="none" stroke="#00d4ff" stroke-width="1.5" class="rosinha-pulse" opacity=".25"/>

<!-- ANEL DE PRECISÃO -->
<circle cx="100" cy="100" r="79" fill="none" stroke="var(--rosinha-acc-cor,#00ffaa)" stroke-width="2.5" opacity="var(--rosinha-acc-op,0)" class="rosinha-acc-ring" stroke-dasharray="8 4"/>
</svg>`,

// ════════════════════════════════════════════════════════════════
//  🦕  DINO — Cabaça com água · folha · estilhaço de ferro
// ════════════════════════════════════════════════════════════════
dino:(uid)=>`
<svg viewBox="0 0 200 200" class="rosinha-svg" xmlns="http://www.w3.org/2000/svg">
<defs>
  <radialGradient id="dk-${uid}" cx="40%" cy="35%" r="70%">
    <stop offset="0%" stop-color="#6a3c18"/><stop offset="55%" stop-color="#3c1e08"/><stop offset="100%" stop-color="#1a0c04"/>
  </radialGradient>
  <radialGradient id="dw-${uid}" cx="45%" cy="42%">
    <stop offset="0%" stop-color="#2a7880"/><stop offset="60%" stop-color="#145860"/><stop offset="100%" stop-color="#082a30"/>
  </radialGradient>
  <radialGradient id="dl-${uid}" cx="42%" cy="35%">
    <stop offset="0%" stop-color="#68ba3a"/><stop offset="65%" stop-color="#388018"/><stop offset="100%" stop-color="#1a4808"/>
  </radialGradient>
  <linearGradient id="ds-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#505050"/><stop offset="40%" stop-color="#909090"/><stop offset="70%" stop-color="#686868"/><stop offset="100%" stop-color="#404040"/>
  </linearGradient>
  <linearGradient id="dr-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#6a3010"/><stop offset="50%" stop-color="#9a4818"/><stop offset="100%" stop-color="#5a2808"/>
  </linearGradient>
  <filter id="dgw-${uid}" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="dbl-${uid}"><feGaussianBlur stdDeviation="1.5"/></filter>
  <filter id="dsw-${uid}"><feGaussianBlur stdDeviation="2"/></filter>
</defs>

<!-- CABAÇA EXTERIOR (madeira velha) -->
<circle cx="100" cy="100" r="99" fill="url(#dk-${uid})"/>
<!-- textura de casca/madeira (linhas curvadas) -->
${Array.from({length:14},(_,i)=>{
  const a=i*25.7,p1=P(100,100,92,a),pm=P(100,100,90,a+12.5),p2=P(100,100,92,a+25.7);
  return`<path d="M${p1.x.toFixed(1)},${p1.y.toFixed(1)} Q${pm.x.toFixed(1)},${pm.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}" fill="none" stroke="#241008" stroke-width="1.4" opacity=".45"/>`;
}).join('')}
<!-- aro interno da cabaça -->
<circle cx="100" cy="100" r="90" fill="none" stroke="#4a2410" stroke-width="3"/>
<circle cx="100" cy="100" r="88" fill="#0e1e0e" stroke="none"/>

<!-- ÁGUA dentro da cabaça -->
<circle cx="100" cy="100" r="86" fill="url(#dw-${uid})"/>

<!-- REFLEXO DA ÁGUA (brilho no canto) -->
<ellipse cx="78" cy="76" rx="22" ry="9" fill="#5aaa7a" opacity=".1" transform="rotate(-20 78 76)"/>

<!-- ONDULAÇÕES DA ÁGUA (anéis concêntricos) -->
${[18,32,48,64,78].map((r,i)=>`<ellipse cx="100" cy="100" rx="${r}" ry="${(r*.7).toFixed(0)}" fill="none" stroke="#3a9060" stroke-width="${i<2?.5:.8}" opacity="${(.38-i*.05).toFixed(2)}" transform="rotate(-5 100 100)"/>`).join('')}

<!-- FOLHA FLUTUANDO (estática, não gira) -->
<ellipse cx="100" cy="100" rx="35" ry="26" fill="url(#dl-${uid})" stroke="#1a5010" stroke-width="1.5" transform="rotate(-10 100 100)"/>
<!-- nervura central da folha -->
<path d="M71,106 Q100,96 129,106" fill="none" stroke="#1a5010" stroke-width=".9" opacity=".65" transform="rotate(-10 100 100)"/>
<!-- nervuras secundárias -->
${[-16,-8,0,8,16].map(t=>`<path d="M${(100+t*.6).toFixed(0)},${(100-t*.5).toFixed(0)} L${(100+t*.6+13).toFixed(0)},${(100-t*.5-8).toFixed(0)}" fill="none" stroke="#1a5010" stroke-width=".5" opacity=".4" transform="rotate(-10 100 100)"/>`).join('')}

<!-- PEDRAS CARDINAIS (marcadores gravados) -->
${[{a:0,l:'N',c:'#8aff5a',glow:true},{a:90,l:'L',c:'#4a8030',glow:false},{a:180,l:'S',c:'#4a8030',glow:false},{a:270,l:'O',c:'#4a8030',glow:false}].map(({a,l,c,glow})=>{
  const p=P(100,100,68,a);
  return`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5.5" fill="#2a1e0a" stroke="#4a3010" stroke-width="1.2"/>
<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="Georgia,serif" font-size="${a===0?9:7}" font-weight="${a===0?'900':'700'}" fill="${c}"${glow?` filter="url(#dgw-${uid})"`:''}>${l}</text>`;
}).join('')}

<!-- MUSGO / VINHAS na borda interna -->
${Array.from({length:16},(_,i)=>{
  const a=i*22.5+5,p1=P(100,100,82,a),pm=P(100,100,86,a+5),p2=P(100,100,84,a+10);
  return`<path d="M${p1.x.toFixed(1)},${p1.y.toFixed(1)} Q${pm.x.toFixed(1)},${pm.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}" fill="none" stroke="#386020" stroke-width="1.3" opacity=".65"/>`;
}).join('')}

<!-- PONTOS BIOLUMINESCENTES -->
${Array.from({length:26},(_,i)=>{
  const a=i*13.85+7,r=74+Math.sin(i*1.8)*6;
  const p=P(100,100,r,a),sz=(.6+Math.abs(Math.sin(i*.9))*1.2).toFixed(1);
  const op=(.2+Math.abs(Math.sin(i*1.2))*.35).toFixed(2);
  return`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${sz}" fill="#88ff44" opacity="${op}" filter="url(#dbl-${uid})"/>`;
}).join('')}

<!-- AGULHA: ESTILHAÇO DE FERRO MAGNÉTICO -->
<g class="rosinha-agulha" style="transform-origin:100px 100px">
  <!-- sombra na água -->
  <polygon points="100,40 103,70 104,90 103,100 100,106 97,100 96,90 97,70" fill="#000" opacity=".22" transform="translate(2.5,3.5)" filter="url(#dsw-${uid})"/>
  <!-- norte: ferro cinza-prata -->
  <path d="M100,40 L104,68 L105,85 L104,100 L100,107 L96,100 L95,85 L96,68 Z" fill="url(#ds-${uid})" stroke="#3a3a3a" stroke-width=".6"/>
  <!-- brilho metálico norte -->
  <path d="M100,40 L102,65 L101.5,82 L100,40" fill="#d8d8d8" opacity=".4"/>
  <!-- ferrugem/oxidação no lado sul -->
  <path d="M100,160 L103.5,132 L104.5,115 L103.5,100 L100,93 L96.5,100 L95.5,115 L96.5,132 Z" fill="url(#dr-${uid})" stroke="#4a2810" stroke-width=".6" opacity=".88"/>
  <!-- pivot: pedra preciosa bioluminescente -->
  <circle cx="100" cy="100" r="6" fill="#152a18" stroke="#3a6020" stroke-width="1.5"/>
  <circle cx="100" cy="100" r="3.2" fill="#4aff78" filter="url(#dgw-${uid})" opacity=".8"/>
  <circle cx="100" cy="100" r="1.5" fill="#ccffcc" opacity=".9"/>
</g>

<!-- BRILHO BIOLUMINESCENTE central pulsante -->
<circle cx="100" cy="100" r="5" fill="#44ff88" opacity=".15" filter="url(#dgw-${uid})" class="rosinha-pulse"/>

<!-- ANEL DE PRECISÃO -->
<circle cx="100" cy="100" r="82" fill="none" stroke="var(--rosinha-acc-cor,#8aff5a)" stroke-width="2.5" opacity="var(--rosinha-acc-op,0)" class="rosinha-acc-ring"/>
</svg>`
};

// ── CSS ───────────────────────────────────────────────────────────
const STYLE=`
.rosinha-host{position:relative;display:inline-block;line-height:0;--rosinha-acc-cor:#22c55e;--rosinha-acc-op:0}
.rosinha-stage{position:relative;width:100%;aspect-ratio:1/1;border-radius:50%;overflow:hidden;isolation:isolate}
.rosinha-svg{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none}
.rosinha-agulha{transform-origin:100px 100px;transition:transform .7s cubic-bezier(.35,1.6,.3,1)}
.rosinha-acc-ring{transition:opacity .5s,stroke .5s}
@keyframes rosinha-scan{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
.rosinha-scan{transform-origin:100px 100px;animation:rosinha-scan 5s linear infinite}
@keyframes rosinha-pulse{0%,100%{opacity:.25;r:93px}50%{opacity:.06;r:96px}}
.rosinha-pulse{animation:rosinha-pulse 2.5s ease-in-out infinite}
.rosinha-balao{position:absolute;left:8%;right:8%;bottom:8%;z-index:3;background:rgba(255,255,255,.96);color:#0f172a;padding:8px 12px;border-radius:12px;font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;font-weight:600;text-align:center;line-height:1.3;box-shadow:0 4px 14px rgba(0,0,0,.3);opacity:0;transform:translateY(8px) scale(.94);transition:opacity .3s,transform .3s;pointer-events:none}
.rosinha-balao::after{content:'';position:absolute;left:50%;bottom:-7px;transform:translateX(-50%);border:7px solid transparent;border-top-color:rgba(255,255,255,.96)}
.rosinha-host[data-falando="1"] .rosinha-balao{opacity:1;transform:translateY(0) scale(1)}
.rosinha-tag{position:absolute;top:6%;left:50%;transform:translateX(-50%);z-index:3;background:rgba(0,0,0,.75);color:#fff;padding:3px 9px;border-radius:999px;font-family:ui-sans-serif,system-ui,sans-serif;font-size:10px;font-weight:700;letter-spacing:.4px;white-space:nowrap;border:1px solid var(--rosinha-acc-cor,#22c55e)}
.rosinha-host[data-alerta="1"] .rosinha-stage{animation:rAlerta 1s ease-in-out infinite}
@keyframes rAlerta{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}50%{box-shadow:0 0 0 10px rgba(239,68,68,.35)}}
`;

function _accStyle(m){
  if(m==null||m>200) return{cor:'#ef4444',op:.15};
  if(m<=5)  return{cor:'#00ffcc',op:.95};
  if(m<=15) return{cor:'#22c55e',op:.8};
  if(m<=30) return{cor:'#86efac',op:.65};
  if(m<=60) return{cor:'#fbbf24',op:.5};
  if(m<=100)return{cor:'#f97316',op:.38};
  return       {cor:'#ef4444',op:.28};
}

let _inj=false,_uid=0;
function _css(){if(_inj)return;const s=document.createElement('style');s.id='rosinha-v6';s.textContent=STYLE;document.head.appendChild(s);_inj=true;}

const Rosinha={
  _host:null,_agulha:null,_balaoTxt:null,_moodTxt:null,
  _falaTimer:null,_skin:'pirata',_acc:null,

  init(target,opts={}){
    _css();
    const el=typeof target==='string'?document.querySelector(target):target;
    if(!el)throw new Error('Rosinha: target não encontrado');
    this._skin=opts.skin||'pirata';
    el.classList.add('rosinha-host');
    el.style.width=(opts.tamanho||260)+'px';
    const uid='r'+(++_uid);
    el.innerHTML=`<div class="rosinha-stage">${SVG[this._skin]?.(uid)||SVG.pirata(uid)}<div class="rosinha-balao"><span class="rosinha-balao-txt"></span></div><div class="rosinha-tag">🧭 <span class="rosinha-mood">calibrando…</span></div></div>`;
    this._host=el;
    this._agulha=el.querySelector('.rosinha-agulha');
    this._balaoTxt=el.querySelector('.rosinha-balao-txt');
    this._moodTxt=el.querySelector('.rosinha-mood');
    if(typeof opts.bearing==='number')this.setBearing(opts.bearing);
    if(typeof opts.accuracy==='number')this.setAccuracy(opts.accuracy);
    return this;
  },

  setSkin(nome){
    if(!SVG[nome]||!this._host)return this;
    this._skin=nome;
    const uid='r'+(++_uid);
    const bearing=this._agulha?+(this._agulha.style.transform.replace(/[^0-9.-]/g,'')||0):0;
    const oldSvg=this._host.querySelector('.rosinha-svg');
    if(oldSvg){const t=document.createElement('div');t.innerHTML=SVG[nome](uid);oldSvg.replaceWith(t.firstElementChild);}
    this._agulha=this._host.querySelector('.rosinha-agulha');
    this.setBearing(bearing);
    this.setAccuracy(this._acc);
    return this;
  },

  setBearing(graus){
    if(!this._agulha)return this;
    const g=((graus%360)+360)%360;
    this._agulha.style.transform=`rotate(${g}deg)`;
    return this;
  },

  setAccuracy(metros){
    this._acc=metros;
    if(!this._host)return this;
    const{cor,op}=_accStyle(metros);
    this._host.style.setProperty('--rosinha-acc-cor',cor);
    this._host.style.setProperty('--rosinha-acc-op',op);
    const mood=metros==null?'sem sinal':metros<=5?'GPS perfeito ✦':metros<=15?'sinal ótimo':metros<=30?'sinal bom':metros<=60?'sinal médio':metros<=100?'sinal fraco':'GPS perdido ⚠';
    if(this._moodTxt)this._moodTxt.textContent=mood;
    return this;
  },

  falar(texto,opts={}){
    if(!this._host)return this;
    this._balaoTxt.textContent=texto;
    this._host.dataset.falando='1';
    clearTimeout(this._falaTimer);
    this._falaTimer=setTimeout(()=>{this._host.dataset.falando='0';},opts.duracao||Math.min(8000,Math.max(1500,texto.length*65)));
    return this;
  },

  alerta(msg){
    if(this._host)this._host.dataset.alerta='1';
    this.setAccuracy(999);
    if(msg)this.falar(msg,{duracao:4000});
    return this;
  },

  piscar(){
    if(!this._host)return this;
    const svg=this._host.querySelector('.rosinha-svg');
    if(svg){svg.style.opacity='.2';setTimeout(()=>svg.style.opacity='',250);}
    return this;
  },

  skinsDisponiveis(){return Object.keys(SVG);},
  setCor(){return this;},coresDisponiveis(){return[];}
};

global.Rosinha=Rosinha;
})(typeof window!=='undefined'?window:globalThis);
