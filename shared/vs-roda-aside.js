/* vs-roda-aside.js — O VENTO SUSSURRA o que a localidade tá debatendo.
 * Ícone de vento animado (colorido, cores claras) no topo, do lado do título.
 * A cada 26s o vento "sussurra" um tema aleatório (peek, fecha em 14s). Tocar no
 * sussurro → entra DIRETO no chat daquele assunto. Tocar no ícone → abre TUDO que
 * tá sussurrando, e cada cartão também leva direto pro chat dele
 * (/comunidade.html?tema=<id>).
 * Só na tela-landing (índice do app) + rádio. Index.html é um SPA (troca de
 * tela por hash, ex: #caca da Caça ao Tesouro) — por isso não basta olhar o
 * pathname, tem que checar também qual tela tá aberta agora. */
(function (root) {
  var _naPaginaIndex = (location.pathname === "/" || /index\.html|ir-para/.test(location.pathname));
  var _naRadio = /radio\.html/.test(location.pathname);
  if (!_naPaginaIndex && !_naRadio) return;
  function _ehTelaLanding() {
    if (!_naPaginaIndex) return true;
    /* 12/08/2026 — a index NAO troca de tela pelo hash (ele fica sempre #landing).
     * O showScreen() do app.js liga/desliga a classe .active nas <div class="screen">
     * (screen-landing, screen-city, screen-praias...). Olhar o hash dava "landing"
     * SEMPRE, e por isso o circulo aparecia em cima do nome da cidade nas outras
     * telas. Quem manda e a tela ativa; o hash fica so como reserva. */
    var ativa = document.querySelector(".screen.active");
    if (ativa && ativa.id) return ativa.id === "screen-landing";
    var h = (location.hash || "").replace(/^#/, "");
    return !h || h === "landing";
  }
  const SUPA = (root.VENTOSUL_CONFIG && root.VENTOSUL_CONFIG.SUPABASE_URL) || "https://vdrzndgkwdpibexjkyxi.supabase.co";
  const ANON = "sb_publishable_UuXuHUDxe7nmhE-Z9qu-0w_1tv2IrvC";
  let temas = [], aberto = false, peekEl = null;
  function sincronizarCruzeiros() {
    var delay = (-((Date.now() % 3000) / 1000)) + "s";
    document.querySelectorAll("#roda-mini svg g, .vs-fab-btn svg g, #vsfab svg g").forEach(function (g) { g.style.animationDelay = delay; });
  }
  function espelharFab(b) {
    var tries = 0;
    function alinhar() {
      var fab = document.querySelector(".vs-fab-btn, .vs-fab-root, #vsfab");
      if (fab) {
        var r = fab.getBoundingClientRect();
        if (r.width) {
          // 12/08/2026 — ESPELHO DE VERDADE, medindo DA BORDA ATE O CENTRO.
          // Antes eram dois chutes fixos (top+20 / right+40) que deixavam o circulo
          // 23px mais pra dentro e 3px mais baixo que o Cruzeiro, e desalinhavam de
          // vez quando o usuario mexia no tamanho da fonte (o cabecalho cresce e o
          // FAB desce, mas o offset fixo nao acompanhava).
          var meu = b.getBoundingClientRect();
          var largura = meu.width || 56, altura = meu.height || 56;
          // distancia da borda DIREITA ate o centro do Cruzeiro
          var daBorda = window.innerWidth - (r.left + r.width / 2);
          // mesma distancia, agora da borda ESQUERDA ate o centro do circulo
          b.style.left = Math.max(6, daBorda - largura / 2) + "px";
          // mesmo centro vertical do Cruzeiro
          b.style.top = Math.max(6, r.top + r.height / 2 - altura / 2) + "px";
          sincronizarCruzeiros();
        }
      }
    }
    var iv = setInterval(function () { alinhar(); if (++tries > 18) clearInterval(iv); }, 350);
    window.addEventListener("resize", alinhar);
    window.addEventListener("load", alinhar);

    /* 12/08/2026 — O CIRCULO SO APARECE NA LANDING.
     * A index e um SPA: troca de tela pelo hash (#comercio, #praia...) sem mudar
     * o pathname. O _ehTelaLanding() ja existia, mas so era consultado no balao —
     * o ICONE ficava na tela toda, e nas telas de lugar ele caia em cima do nome
     * da cidade. Agora some junto com a landing e volta quando ela volta. */
    function visibilidade() {
      b.style.display = _ehTelaLanding() ? "flex" : "none";
    }
    visibilidade();
    window.addEventListener("hashchange", function () { visibilidade(); alinhar(); });
    window.addEventListener("popstate",  function () { visibilidade(); alinhar(); });
    // a troca de tela do SPA e so uma classe .active mudando — observa isso
    if (window.MutationObserver) {
      try {
        var mo = new MutationObserver(function () { visibilidade(); });
        document.querySelectorAll(".screen").forEach(function (s) {
          mo.observe(s, { attributes: true, attributeFilter: ["class"] });
        });
      } catch (e) {}
    }
    document.addEventListener("click", function () { setTimeout(visibilidade, 60); }, true);
    b._vsVisibilidade = visibilidade;
    if (window.ResizeObserver) { try { var ro = new ResizeObserver(alinhar); var f = document.querySelector(".vs-fab-btn, .vs-fab-root, #vsfab"); if (f) ro.observe(f); ro.observe(document.body); } catch (e) {} }
  }

  function lugar() {
    try { const h = document.querySelector("h1"); const t = (h && h.textContent || "").trim().split("—")[0].trim(); if (t && t.length < 30 && !/vento sul/i.test(t)) return t; } catch (_) {}
    return "por aqui";
  }
  async function carregar() {
    try { const r = await fetch(`${SUPA}/rest/v1/comunidade_temas?status=eq.aberto&select=id,titulo,n_votos,n_argumentos&order=peso_votos.desc,criado_em.desc&limit=30`, { headers: { apikey: ANON, Authorization: "Bearer " + ANON } }); temas = await r.json() || []; } catch (_) { temas = []; }
  }
  function esc(s){return (s||"").replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));}

  function icone() {
    let b = document.getElementById("roda-mini"); if (b) return b;
    b = document.createElement("button");
    b.id = "roda-mini"; b.title = "O vento sussurra o que a comunidade debate";
    // 12/08/2026: 56 -> 72px. O Cruzeiro do Sul aberto ficava bem maior que o
    // circulo da comunidade; agora os dois se equilibram. O viewBox segue 0 0 512 512
    // e a mascara circular (#rmSoftEdge) escala junto — por isso continua REDONDO.
    b.style.cssText = "position:fixed;left:23px;top:83px;z-index:9000;width:72px;height:72px;overflow:visible;transition:top .2s,left .2s;border:0;background:transparent;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center";
    b.innerHTML = '<svg width="68" height="68" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="rmSky" cx="50%" cy="62%" r="85%"><stop offset="0%" stop-color="#ff7a4d" stop-opacity="0.85"/><stop offset="13%" stop-color="#ff3b30" stop-opacity="0.55"/><stop offset="28%" stop-color="#c9667a" stop-opacity="0.4"/><stop offset="48%" stop-color="#1e4a80" stop-opacity="0.65"/><stop offset="100%" stop-color="#0c2340" stop-opacity="0.97"/></radialGradient><radialGradient id="rmSunCore" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#fff2c9" stop-opacity="0.95"/><stop offset="35%" stop-color="#ffab5e" stop-opacity="0.85"/><stop offset="100%" stop-color="#ff6a4d" stop-opacity="0"/></radialGradient><linearGradient id="rmWindRed" x1="0.1" y1="0.2" x2="0.9" y2="0.5"><stop offset="0" stop-color="#c8161f"/><stop offset="1" stop-color="#ff5b4d"/></linearGradient><linearGradient id="rmWindBlue" x1="0.1" y1="0.2" x2="0.9" y2="0.5"><stop offset="0" stop-color="#1b4f8f"/><stop offset="1" stop-color="#4fa4e8"/></linearGradient><linearGradient id="rmSeaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5bb8f0"/><stop offset="100%" stop-color="#2a7bc4"/></linearGradient><filter id="rmBgBlur" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="18"/></filter><filter id="rmSunBlur" x="-140%" y="-140%" width="380%" height="380%"><feGaussianBlur stdDeviation="26"/></filter><filter id="rmHaloBlur" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="12"/></filter><filter id="rmEdgeBlur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="34"/></filter><mask id="rmSoftEdge" maskUnits="userSpaceOnUse" x="-80" y="-80" width="672" height="672"><circle cx="256" cy="256" r="250" fill="#fff" filter="url(#rmEdgeBlur)"/></mask><radialGradient id="rmRaio" cx="50%" cy="50%" r="50%"><stop offset="55%" stop-color="#7fd4ff" stop-opacity="0"/><stop offset="82%" stop-color="#7fd4ff" stop-opacity="0.45"/><stop offset="100%" stop-color="#7fd4ff" stop-opacity="0"/></radialGradient><linearGradient id="rmWindGold" x1="0.1" y1="0.2" x2="0.9" y2="0.5"><stop offset="0" stop-color="#f5a300"/><stop offset="1" stop-color="#ffd95e"/></linearGradient></defs><circle class="raio" cx="256" cy="256" r="205" fill="url(#rmRaio)"/><g class="wholepulse" mask="url(#rmSoftEdge)"><rect x="0" y="0" width="512" height="512" fill="url(#rmSky)" filter="url(#rmBgBlur)"/><circle class="sunpulse" cx="256" cy="300" r="112" fill="url(#rmSunCore)" filter="url(#rmSunBlur)"/><g class="wind1"><g transform="translate(129,81) scale(0.5908)"><path d="M 99 197 L 101 196 L 103 194 L 105 192 L 108 191 L 110 189 L 112 188 L 114 186 L 116 185 L 119 184 L 121 182 L 123 181 L 125 180 L 128 178 L 130 177 L 132 176 L 135 175 L 137 174 L 139 173 L 141 172 L 144 171 L 146 170 L 148 169 L 150 168 L 152 168 L 155 167 L 157 166 L 159 166 L 161 165 L 163 165 L 166 164 L 168 164 L 170 163 L 172 163 L 174 163 L 176 162 L 178 162 L 180 162 L 182 162 L 184 162 L 186 162 L 188 162 L 190 162 L 192 162 L 194 162 L 196 162 L 198 162 L 200 162 L 203 162 L 205 163 L 207 163 L 209 163 L 211 163 L 213 163 L 215 163 L 217 164 L 219 164 L 221 164 L 223 164 L 225 164 L 228 164 L 232 164 L 235 164 L 237 163 L 240 163 L 243 162 L 245 161 L 248 160 L 250 159 L 253 158 L 255 156 L 257 155 L 259 154 L 262 152 L 264 150 L 266 149 L 267 147 L 269 145 L 271 143 L 273 141 L 274 139 L 275 137 L 277 135 L 278 132 L 279 130 L 280 128 L 281 126 L 282 123 L 282 121 L 283 119 L 283 116 L 284 114 L 284 111 L 284 109 L 284 107 L 284 104 L 284 102 L 284 99 L 283 97 L 283 95 L 282 93 L 282 90 L 281 88 L 280 86 L 279 84 L 278 82 L 277 80 L 276 78 L 274 77 L 273 75 L 272 73 L 270 72 L 269 70 L 267 69 L 266 67 L 264 66 L 262 65 L 260 64 L 259 63 L 257 62 L 255 61 L 253 60 L 251 59 L 249 59 L 247 58 L 245 58 L 244 57 L 242 57 L 240 57 L 238 57 L 236 57 L 234 57 L 232 57 L 230 58 L 228 58 L 227 58 L 225 59 L 223 59 L 222 60 L 220 61 L 218 62 L 217 62 L 215 63 L 214 64 L 212 65 L 211 66 L 210 67 L 209 69 L 208 70 L 207 71 L 206 72 L 205 74 L 204 75 L 203 76 L 202 78 L 202 79 L 201 81 L 200 82 L 200 83 L 200 85 L 199 86 L 199 88 L 199 89 L 199 91 L 199 92 L 199 93 L 199 95 L 199 96 L 199 98 L 200 99 L 200 100 L 200 101 L 201 103 L 201 104 L 202 105 L 202 106 L 203 107 L 204 108 L 204 109 L 205 110 L 206 111 L 207 112 L 208 113 L 208 113 L 209 114 L 210 115 L 211 115 L 212 116 L 213 116 L 214 117 L 215 117 L 216 117 L 217 118 L 218 118 L 219 118 L 220 118 L 221 118 L 222 118 L 222 118 L 223 118 L 224 118 L 225 118 L 226 118 L 227 117 L 227 117 L 228 117 L 229 117 L 230 116 L 230 116 L 231 115 L 231 115 L 230 113 L 230 113 L 229 113 L 229 113 L 228 113 L 227 113 L 227 113 L 226 113 L 226 113 L 225 113 L 224 113 L 224 113 L 223 113 L 222 112 L 222 112 L 221 112 L 221 112 L 220 111 L 219 111 L 219 111 L 218 110 L 218 110 L 217 109 L 217 109 L 216 108 L 216 108 L 215 107 L 215 107 L 215 106 L 214 106 L 214 105 L 214 104 L 213 104 L 213 103 L 213 102 L 213 102 L 213 101 L 212 100 L 212 99 L 212 99 L 212 98 L 212 97 L 212 96 L 212 95 L 212 95 L 212 94 L 213 93 L 213 92 L 213 92 L 213 91 L 214 90 L 214 89 L 214 89 L 215 88 L 215 87 L 216 86 L 216 86 L 217 85 L 217 84 L 218 84 L 218 83 L 219 83 L 220 82 L 220 82 L 221 81 L 222 81 L 223 80 L 224 80 L 224 79 L 225 79 L 226 79 L 227 78 L 228 78 L 229 78 L 230 78 L 231 78 L 232 78 L 233 78 L 234 78 L 235 78 L 236 78 L 236 78 L 237 78 L 238 78 L 239 79 L 240 79 L 241 79 L 242 80 L 243 80 L 244 80 L 245 81 L 246 82 L 247 82 L 248 83 L 249 83 L 249 84 L 250 85 L 251 86 L 252 87 L 252 87 L 253 88 L 254 89 L 254 90 L 255 91 L 255 92 L 256 93 L 256 94 L 256 95 L 257 97 L 257 98 L 257 99 L 258 100 L 258 101 L 258 102 L 258 104 L 258 105 L 258 106 L 258 107 L 258 109 L 257 110 L 257 111 L 257 112 L 256 113 L 256 115 L 255 116 L 255 117 L 254 118 L 254 119 L 253 120 L 252 122 L 251 123 L 251 124 L 250 125 L 249 126 L 248 127 L 247 128 L 246 128 L 244 129 L 243 130 L 242 131 L 241 131 L 240 132 L 238 133 L 237 133 L 236 134 L 234 134 L 233 135 L 231 135 L 230 135 L 228 135 L 228 136 L 226 136 L 224 136 L 222 136 L 220 136 L 217 136 L 215 136 L 213 136 L 211 136 L 208 136 L 206 137 L 204 137 L 201 137 L 199 138 L 197 138 L 195 138 L 192 139 L 190 139 L 188 140 L 185 140 L 183 141 L 181 142 L 178 142 L 176 143 L 174 144 L 172 145 L 169 146 L 167 147 L 165 148 L 163 149 L 160 150 L 158 151 L 156 152 L 154 153 L 152 155 L 150 156 L 148 157 L 145 159 L 143 160 L 141 161 L 139 163 L 137 164 L 135 166 L 133 167 L 131 169 L 129 170 L 127 172 L 125 174 L 123 175 L 120 177 L 118 178 L 116 180 L 114 182 L 112 183 L 110 185 L 108 187 L 106 188 L 104 190 L 101 192 L 99 193 L 97 195 Z" fill="url(#rmWindRed)" opacity="0.88" stroke="#0a1f33" stroke-width="6" stroke-opacity="0.45" transform="translate(-27,23)"/></g></g><g class="wind2"><g transform="translate(129,81) scale(0.5908)"><path d="M 45 302 L 49 300 L 53 299 L 58 297 L 62 296 L 67 295 L 71 293 L 76 292 L 80 291 L 85 290 L 89 289 L 94 287 L 98 286 L 103 285 L 108 284 L 112 283 L 117 282 L 121 282 L 126 281 L 130 280 L 135 279 L 139 278 L 144 278 L 148 277 L 153 276 L 157 276 L 162 275 L 166 275 L 170 274 L 175 274 L 179 274 L 184 273 L 188 273 L 193 273 L 197 273 L 202 273 L 206 272 L 210 272 L 215 272 L 219 272 L 224 272 L 228 272 L 232 272 L 237 272 L 241 272 L 246 273 L 250 273 L 254 273 L 259 273 L 263 273 L 268 273 L 272 273 L 276 274 L 281 274 L 285 274 L 290 274 L 294 274 L 299 275 L 303 275 L 307 275 L 313 275 L 317 274 L 321 274 L 325 273 L 328 272 L 332 271 L 335 270 L 339 268 L 342 267 L 345 265 L 348 263 L 351 261 L 354 259 L 357 257 L 360 255 L 362 252 L 365 250 L 367 247 L 369 245 L 372 242 L 373 239 L 375 236 L 377 233 L 379 230 L 380 227 L 381 224 L 382 221 L 383 218 L 384 215 L 385 211 L 385 208 L 386 205 L 386 202 L 386 198 L 386 195 L 386 192 L 386 189 L 385 186 L 385 183 L 384 180 L 383 177 L 382 174 L 381 171 L 380 168 L 379 165 L 377 163 L 376 160 L 374 158 L 372 155 L 370 153 L 368 151 L 366 149 L 364 147 L 362 145 L 360 143 L 358 141 L 355 140 L 353 138 L 351 137 L 348 136 L 346 134 L 343 133 L 340 133 L 338 132 L 335 131 L 333 131 L 330 130 L 327 130 L 325 130 L 322 130 L 320 130 L 317 130 L 315 130 L 312 131 L 310 131 L 307 132 L 305 133 L 303 133 L 301 134 L 298 135 L 296 136 L 294 138 L 292 139 L 290 140 L 288 142 L 287 143 L 285 145 L 284 146 L 282 148 L 281 150 L 279 151 L 278 153 L 277 155 L 276 157 L 275 159 L 274 161 L 273 162 L 273 164 L 272 166 L 272 168 L 271 170 L 271 172 L 271 174 L 271 176 L 271 178 L 271 180 L 271 182 L 271 184 L 271 185 L 272 187 L 272 189 L 273 191 L 274 192 L 274 194 L 275 195 L 276 197 L 277 198 L 278 200 L 279 201 L 280 202 L 281 203 L 282 205 L 283 206 L 284 207 L 285 207 L 286 208 L 288 209 L 289 210 L 290 210 L 292 211 L 293 212 L 294 212 L 296 212 L 297 213 L 298 213 L 299 213 L 301 213 L 302 213 L 303 213 L 304 213 L 306 213 L 307 213 L 308 212 L 309 212 L 310 212 L 311 211 L 312 211 L 313 210 L 314 210 L 315 209 L 315 209 L 314 206 L 313 207 L 313 207 L 312 207 L 311 207 L 310 207 L 309 207 L 308 207 L 307 207 L 306 207 L 305 207 L 305 207 L 304 207 L 303 206 L 302 206 L 301 206 L 300 205 L 299 205 L 298 205 L 298 204 L 297 204 L 296 203 L 295 202 L 294 202 L 294 201 L 293 200 L 292 200 L 292 199 L 291 198 L 290 197 L 290 196 L 289 195 L 289 194 L 288 193 L 288 192 L 288 191 L 287 190 L 287 189 L 287 188 L 287 187 L 287 186 L 287 185 L 286 184 L 287 182 L 287 181 L 287 180 L 287 179 L 287 178 L 287 177 L 288 175 L 288 174 L 288 173 L 289 172 L 290 171 L 290 170 L 291 169 L 291 168 L 292 167 L 293 166 L 294 165 L 295 164 L 296 163 L 297 162 L 298 161 L 299 160 L 300 160 L 301 159 L 302 158 L 303 158 L 305 157 L 306 156 L 307 156 L 309 156 L 310 155 L 311 155 L 313 155 L 314 154 L 316 154 L 317 154 L 318 154 L 320 154 L 321 154 L 323 155 L 324 155 L 326 155 L 327 156 L 329 156 L 330 157 L 332 157 L 333 158 L 335 158 L 336 159 L 337 160 L 339 161 L 340 162 L 341 163 L 342 164 L 344 165 L 345 166 L 346 168 L 347 169 L 348 170 L 349 172 L 350 173 L 350 175 L 351 176 L 352 178 L 353 180 L 353 181 L 354 183 L 354 185 L 354 186 L 355 188 L 355 190 L 355 192 L 355 194 L 355 195 L 355 197 L 355 199 L 355 201 L 354 203 L 354 205 L 353 207 L 353 208 L 352 210 L 351 212 L 351 214 L 350 216 L 349 217 L 348 219 L 346 221 L 345 222 L 344 224 L 343 225 L 341 227 L 340 228 L 338 230 L 336 231 L 335 232 L 333 233 L 331 234 L 329 235 L 327 236 L 325 237 L 323 238 L 321 239 L 319 239 L 317 240 L 315 240 L 312 241 L 311 241 L 308 241 L 303 241 L 299 241 L 294 241 L 290 242 L 285 242 L 281 242 L 276 242 L 272 242 L 267 243 L 263 243 L 258 243 L 254 244 L 249 244 L 244 245 L 240 245 L 235 246 L 231 246 L 226 247 L 222 248 L 217 248 L 213 249 L 208 250 L 204 251 L 199 251 L 195 252 L 190 253 L 186 254 L 181 255 L 177 256 L 172 257 L 168 259 L 163 260 L 159 261 L 154 262 L 150 263 L 145 265 L 141 266 L 137 267 L 132 269 L 128 270 L 123 271 L 119 273 L 114 274 L 110 276 L 106 277 L 101 279 L 97 280 L 92 282 L 88 283 L 83 285 L 79 286 L 75 288 L 70 289 L 66 291 L 61 292 L 57 294 L 52 295 L 48 297 L 43 298 Z" fill="url(#rmWindGold)" opacity="0.88" stroke="#0a1f33" stroke-width="6" stroke-opacity="0.45" transform="translate(26,-23)"/></g></g><g class="wind3"><g transform="translate(129,81) scale(0.5908)"><path d="M 78 373 L 81 373 L 84 372 L 87 371 L 90 371 L 92 370 L 95 369 L 98 369 L 101 368 L 104 367 L 107 367 L 109 366 L 112 366 L 115 365 L 118 365 L 121 365 L 124 364 L 126 364 L 129 364 L 132 363 L 135 363 L 138 363 L 140 363 L 143 363 L 146 363 L 149 362 L 152 362 L 154 362 L 157 362 L 160 362 L 163 362 L 165 363 L 168 363 L 171 363 L 174 363 L 176 363 L 179 363 L 182 364 L 184 364 L 187 364 L 190 365 L 193 365 L 195 365 L 198 366 L 201 366 L 203 366 L 206 367 L 209 367 L 212 368 L 214 368 L 217 368 L 220 369 L 222 369 L 225 370 L 228 370 L 231 370 L 233 371 L 236 371 L 239 372 L 242 372 L 245 372 L 249 372 L 252 372 L 254 372 L 257 371 L 260 371 L 262 370 L 265 369 L 268 368 L 270 367 L 272 366 L 275 365 L 277 364 L 279 362 L 282 361 L 284 359 L 286 358 L 288 356 L 289 354 L 291 352 L 293 350 L 294 348 L 296 346 L 297 344 L 298 342 L 300 340 L 301 337 L 302 335 L 302 333 L 303 330 L 304 328 L 304 326 L 305 323 L 305 321 L 305 319 L 305 316 L 305 314 L 305 312 L 305 309 L 305 307 L 304 305 L 304 302 L 303 300 L 302 298 L 302 296 L 301 294 L 300 292 L 299 290 L 298 288 L 296 286 L 295 284 L 294 283 L 292 281 L 291 280 L 289 278 L 288 277 L 286 275 L 284 274 L 283 273 L 281 272 L 279 271 L 277 270 L 276 269 L 274 268 L 272 268 L 270 267 L 268 267 L 266 266 L 264 266 L 262 266 L 260 266 L 258 266 L 257 266 L 255 266 L 253 266 L 251 266 L 249 267 L 248 267 L 246 268 L 244 268 L 243 269 L 241 270 L 239 271 L 238 271 L 237 272 L 235 273 L 234 274 L 233 275 L 231 277 L 230 278 L 229 279 L 228 280 L 227 281 L 226 283 L 225 284 L 225 285 L 224 287 L 223 288 L 223 290 L 222 291 L 222 292 L 222 294 L 221 295 L 221 297 L 221 298 L 221 300 L 221 301 L 221 302 L 221 304 L 221 305 L 222 306 L 222 308 L 222 309 L 223 310 L 223 311 L 224 312 L 224 313 L 225 315 L 225 316 L 226 317 L 227 317 L 227 318 L 228 319 L 229 320 L 230 321 L 231 321 L 232 322 L 233 323 L 233 323 L 234 324 L 235 324 L 236 325 L 237 325 L 238 325 L 239 325 L 240 326 L 241 326 L 242 326 L 243 326 L 244 326 L 245 326 L 245 326 L 246 326 L 247 325 L 248 325 L 249 325 L 249 325 L 250 324 L 251 324 L 251 324 L 252 323 L 251 321 L 250 321 L 250 321 L 249 321 L 249 321 L 248 321 L 247 321 L 247 321 L 246 321 L 245 321 L 245 321 L 244 321 L 244 320 L 243 320 L 242 320 L 242 320 L 241 319 L 241 319 L 240 319 L 240 318 L 239 318 L 239 317 L 238 317 L 238 316 L 237 316 L 237 315 L 237 315 L 236 314 L 236 313 L 236 313 L 235 312 L 235 311 L 235 311 L 234 310 L 234 309 L 234 309 L 234 308 L 234 307 L 234 306 L 234 306 L 234 305 L 234 304 L 234 303 L 234 302 L 234 302 L 234 301 L 235 300 L 235 299 L 235 299 L 235 298 L 236 297 L 236 296 L 237 296 L 237 295 L 238 294 L 238 294 L 239 293 L 239 292 L 240 292 L 240 291 L 241 291 L 242 290 L 243 290 L 243 289 L 244 289 L 245 288 L 246 288 L 246 288 L 247 287 L 248 287 L 249 287 L 250 287 L 251 286 L 252 286 L 253 286 L 254 286 L 255 286 L 256 286 L 257 286 L 258 286 L 259 286 L 260 287 L 261 287 L 261 287 L 262 288 L 263 288 L 264 288 L 265 289 L 266 289 L 267 290 L 268 290 L 269 291 L 270 292 L 270 292 L 271 293 L 272 294 L 273 295 L 273 296 L 274 296 L 275 297 L 275 298 L 276 299 L 276 300 L 277 301 L 277 302 L 278 303 L 278 304 L 278 306 L 279 307 L 279 308 L 279 309 L 279 310 L 279 311 L 279 313 L 279 314 L 279 315 L 279 316 L 279 318 L 278 319 L 278 320 L 278 321 L 277 322 L 277 324 L 276 325 L 276 326 L 275 327 L 274 328 L 274 329 L 273 330 L 272 331 L 271 332 L 270 333 L 269 334 L 268 335 L 267 336 L 266 337 L 265 338 L 264 338 L 263 339 L 261 340 L 260 340 L 259 341 L 258 341 L 256 342 L 255 342 L 253 343 L 252 343 L 250 343 L 249 343 L 247 343 L 247 344 L 245 343 L 242 343 L 239 343 L 236 343 L 233 343 L 230 343 L 228 342 L 225 342 L 222 342 L 219 342 L 216 342 L 213 342 L 210 342 L 207 342 L 205 343 L 202 343 L 199 343 L 196 343 L 193 343 L 190 343 L 187 344 L 184 344 L 181 344 L 179 345 L 176 345 L 173 346 L 170 346 L 167 346 L 164 347 L 161 348 L 159 348 L 156 349 L 153 349 L 150 350 L 147 351 L 144 351 L 142 352 L 139 353 L 136 353 L 133 354 L 130 355 L 128 356 L 125 357 L 122 357 L 119 358 L 117 359 L 114 360 L 111 361 L 108 362 L 105 362 L 103 363 L 100 364 L 97 365 L 94 366 L 92 367 L 89 367 L 86 368 L 83 369 L 80 370 L 78 371 Z" fill="url(#rmWindBlue)" opacity="0.88" stroke="#0a1f33" stroke-width="6" stroke-opacity="0.45" transform="translate(0,0)"/></g></g><path class="sea" d="M-20 366 q40 -44 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 L620 560 L-20 560 Z" fill="url(#rmSeaGrad)" opacity="0.95"/></g></svg>';
    b.onclick = abrirTudo;
    document.body.appendChild(b);
    espelharFab(b);
    return b;
  }
  function fecharPeek() { if (peekEl) { peekEl.remove(); peekEl = null; } }
  function peek() {
    if (aberto || !temas.length || document.hidden || !_ehTelaLanding()) return;
    fecharPeek();
    const t = temas[Math.floor(Math.random() * temas.length)];
    peekEl = document.createElement("div");
    // 04/08/2026: o balao nao tinha id nem classe — pra escondê-lo era preciso
    // alvejar o z-index no CSS, o que e fragil. Agora tem nome proprio.
    peekEl.id = "roda-peek";
    peekEl.className = "roda-peek";
    peekEl.style.cssText = "position:fixed;left:14px;top:168px;z-index:9001;max-width:min(90vw,400px);background:rgba(8,15,30,.97);border:1px solid rgba(165,243,252,.5);border-radius:4px 14px 14px 14px;padding:9px 12px;box-shadow:0 8px 22px rgba(0,0,0,.55);cursor:pointer;animation:rodapeek .35s ease";
    peekEl.innerHTML = '<div style="font:800 15px system-ui;background:linear-gradient(90deg,#22d3ee,#fbbf24,#ef4444);-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:2px">🌊 as ondas trazem de ' + esc(lugar()) + '…</div>' +
      '<div style="font:700 21px system-ui;color:#e8edf5;line-height:1.45">' + esc((t.titulo || "").slice(0, 120)) + '</div>' +
      '<div style="font:600 15px system-ui;color:#9fb0c4;margin-top:7px">toque pra entrar nessa conversa →</div>';
    /* 17/08/2026 — o sussurro mostra UM assunto, então o toque tem que abrir a
       conversa DELE, não a lista de tudo (pedido do DJ). Quem quer ver tudo toca
       no ícone do vento, que continua abrindo o balão com todos os debates. */
    peekEl.onclick = function () { location.href = "/comunidade.html?tema=" + encodeURIComponent(t.id); };
    document.body.appendChild(peekEl);
    setTimeout(fecharPeek, 7000);
  }
  function abrirTudo() {
    if (aberto) return; aberto = true; fecharPeek();
    const m = document.createElement("div");
    m.id = "roda-tudo";
    m.style.cssText = "position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,.8);display:flex;align-items:flex-end;justify-content:center";
    m.innerHTML = '<div style="background:#0e1620;border-top:2px solid rgba(165,243,252,.5);border-radius:16px 16px 0 0;max-width:520px;width:100%;max-height:75vh;overflow:auto;padding:18px 16px;color:#e8edf5">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><h3 style="margin:0;font-size:21px;line-height:1.3;background:linear-gradient(90deg,#22d3ee,#fbbf24,#ef4444);-webkit-background-clip:text;background-clip:text;color:transparent">🌊 O que as ondas trazem da comunidade</h3><button id="roda-x" style="background:rgba(120,120,120,.3);border:0;color:#fff;border-radius:8px;padding:4px 12px;cursor:pointer">✕</button></div>' +
      '<div style="font-size:15px;line-height:1.5;color:#9fb0c4;margin-bottom:12px">Tudo que a Barra tá cochichando agora. Toque pra entrar e votar — quem faz o bem tem mais voz.</div>' +
      /* 17/08/2026 — cada conversa leva DIRETO pro chat dela (pedido do DJ).
         Antes todos os cartões apontavam pra /comunidade.html seco: a pessoa
         escolhia um assunto e caía na lista inteira, tendo que procurar de novo.
         O ?tema=<id> é lido no boot da comunidade.html, que já abre o chat. */
      (temas.length ? temas.map(t => '<a href="/comunidade.html?tema=' + encodeURIComponent(t.id) + '" style="display:block;text-decoration:none;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px 15px;margin:9px 0;color:#e8edf5"><div style="font-weight:700;font-size:18px;line-height:1.4">' + esc(t.titulo) + '</div><div style="font-size:14px;color:#9fb0c4;margin-top:5px">👍 ' + (t.n_votos||0) + ' · 💬 ' + (t.n_argumentos||0) + '</div></a>').join("") : '<div style="color:#9fb0c4;font-size:16px;padding:12px">O mar tá calmo — nenhum debate aberto ainda.</div>') +
      '<a href="/comunidade.html" style="display:block;text-align:center;margin-top:8px;padding:11px;border-radius:10px;background:linear-gradient(135deg,#a5f3fc,#7c3aed);color:#04121f;font-weight:800;font-size:17px;text-decoration:none">Abrir a Roda completa →</a></div>';
    document.body.appendChild(m);
    const fecha = () => { m.remove(); aberto = false; };
    m.querySelector("#roda-x").onclick = fecha;
    m.addEventListener("click", e => { if (e.target === m) fecha(); });
  }
  function pilulaRadio() {
    if (document.getElementById("roda-pill")) return;
    var a = document.createElement("a");
    a.id = "roda-pill"; a.href = "/comunidade.html";
    a.textContent = "🗣️ Roda da Comunidade";
    a.style.cssText = "position:fixed;left:12px;bottom:150px;z-index:9000;padding:11px 17px;border-radius:999px;background:rgba(124,58,237,.85);color:#fff;font:700 15px system-ui;text-decoration:none;box-shadow:0 4px 12px rgba(0,0,0,.45)";
    document.body.appendChild(a);
  }
  function _atualizarVisibilidade() {
    var b = document.getElementById("roda-mini");
    if (_ehTelaLanding()) { if (!b) b = icone(); b.style.display = "flex"; }
    else { if (b) b.style.display = "none"; fecharPeek(); }
  }
  async function boot() {
    await carregar(); if (!temas.length) return;
    if (_naRadio) { pilulaRadio(); return; }
    _atualizarVisibilidade();
    if (_naPaginaIndex) window.addEventListener("hashchange", _atualizarVisibilidade);
    setInterval(peek, 100000); setTimeout(peek, 12000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  if (!document.getElementById("roda-peek-css")) { const st = document.createElement("style"); st.id = "roda-peek-css";
    st.textContent = '@keyframes rodaAura{0%,100%{filter:drop-shadow(0 0 6px rgba(251,191,36,.85)) drop-shadow(0 0 14px rgba(251,191,36,.5))}20%{filter:drop-shadow(0 0 10px rgba(251,191,36,.95)) drop-shadow(0 0 20px rgba(251,191,36,.6))}40%{filter:drop-shadow(0 0 9px rgba(249,115,22,.85)) drop-shadow(0 0 18px rgba(239,68,68,.5))}60%{filter:drop-shadow(0 0 10px rgba(168,85,247,.85)) drop-shadow(0 0 20px rgba(168,85,247,.5))}80%{filter:drop-shadow(0 0 9px rgba(6,182,212,.85)) drop-shadow(0 0 18px rgba(59,130,246,.5))}}@keyframes rodapeek{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}@keyframes ventoSuave{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(9px,-7px) scale(1.03)}}@keyframes pulseSea{0%,100%{transform:translateX(0)}50%{transform:translateX(-12px)}}@keyframes pulseSun{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.14);opacity:1}}@keyframes raiar{0%{transform:scale(.5);opacity:0}16%{opacity:1}100%{transform:scale(2.35);opacity:0}}#roda-mini{overflow:visible;animation:rodaAura 5s ease-in-out infinite}#roda-mini .wind1{animation:ventoSuave 3.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}#roda-mini .wind2{animation:ventoSuave 3.4s ease-in-out infinite .2s;transform-box:fill-box;transform-origin:center}#roda-mini .wind3{animation:ventoSuave 3.4s ease-in-out infinite .4s;transform-box:fill-box;transform-origin:center}#roda-mini .sea{animation:pulseSea 4.6s ease-in-out infinite .15s;transform-box:fill-box;transform-origin:center}#roda-mini .sunpulse{animation:pulseSun 4.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}#roda-mini .raio{animation:raiar 3s ease-out infinite;transform-box:fill-box;transform-origin:center;pointer-events:none}@media (prefers-reduced-motion:reduce){#roda-mini,#roda-mini .raio,#roda-mini svg,#roda-mini [class^=wind]{animation:none}}';
    document.head.appendChild(st); }
})(window);
