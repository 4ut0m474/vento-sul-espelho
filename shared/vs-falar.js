// vs-falar.js — voz fluida pública (edge-tts via /fala/). UMA VOZ SÓ (Antônio).
//
// Por que este arquivo é chato: o /fala/ leva ~4s pra sintetizar. Nesse intervalo o
// a.play() do celular costuma rejeitar (política de autoplay), o que disparava o
// fallback do navegador — e quando o áudio do Antônio finalmente chegava, tocava por
// cima. Resultado: duas vozes, e a do navegador quase sempre FEMININA, porque a voz
// padrão pt-BR do Android é feminina.
//
// Regras agora:
//   1. o fallback espera de verdade (o áudio tem tempo de chegar);
//   2. se o áudio chegou ou está a caminho, o fallback NUNCA dispara;
//   3. no fallback só entra voz MASCULINA — sem voz masculina, fica em silêncio.
//      Silêncio é melhor que a voz errada.
// API: VSFalar.falar(texto[, opts]) -> Promise que resolve no fim. VSFalar.parar()
(function (root) {
  "use strict";
  var _audio = null, _utter = null;
  // 03/08/2026: eram 9000 e o botão do mar ficava MUDO. O boletim inteiro (clima +
  // ondas + maré + lua + dica) leva 5 a 12s pra sintetizar quando não está em cache
  // — medido. Aos 9s o cliente desistia e caía no fallback, que exige voz masculina
  // pt-BR no aparelho; no Android a voz padrão é feminina, então dava silêncio puro.
  // 30s cobre a síntese fria + rede de celular, e o spinner mostra que está vindo.
  var ESPERA_MS = 30000;

  function parar() {
    if (_audio) { try { _audio.pause(); } catch (e) {} _audio = null; }
    _utter = null;
    try { root.speechSynthesis && speechSynthesis.cancel(); } catch (e) {}
  }

  // Só voz masculina em português. Não achou? Devolve null — e aí não se fala nada.
  function vozMasculina() {
    try {
      var vs = (speechSynthesis.getVoices() || []).filter(function (x) {
        return x.lang && x.lang.toLowerCase().indexOf("pt") === 0;
      });
      return vs.find(function (x) {
        return /ant[oô]nio|daniel|felipe|ricardo|male|homem|masc/i.test(x.name);
      }) || null;
    } catch (e) { return null; }
  }

  function falar(texto, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      if (!texto) return resolve();
      parar();
      var t = String(texto).replace(/\s+/g, " ").trim().slice(0, 1300);
      var v = opts.voz || "antonio";
      var rate = opts.rate || "+12%";
      var url = "/fala/?t=" + encodeURIComponent(t) + "&v=" + v + "&rate=" + encodeURIComponent(rate);

      var a = new Audio(url);
      a.preload = "auto";
      _audio = a;

      var done = false, tocou = false, chegou = false, desistiu = false, timer = null;

      function fim() {
        if (done) return;
        done = true;
        if (timer) { clearTimeout(timer); timer = null; }
        if (_audio === a) _audio = null;
        resolve();
      }

      // Fallback do navegador: último recurso, e SÓ com voz masculina.
      function fallback() {
        if (done || tocou || chegou) return;   // áudio real venceu — não fala por cima
        if (!desistiu) return;                 // ainda dentro da janela de espera
        var voz = vozMasculina();
        if (!voz) { fim(); return; }           // sem voz de homem: silêncio, não a voz errada
        try {
          var u = new SpeechSynthesisUtterance(t);
          u.lang = "pt-BR"; u.rate = 1.08; u.voice = voz;
          u.onend = fim; u.onerror = fim;
          _utter = u;
          speechSynthesis.speak(u);
        } catch (e) { fim(); }
      }

      // O áudio real chegou: mata qualquer fala do navegador que tenha escapado.
      function assumiuAudio() {
        chegou = true;
        if (_utter) { try { speechSynthesis.cancel(); } catch (e) {} _utter = null; }
      }

      a.oncanplay = assumiuAudio;
      a.onplaying = function () { tocou = true; assumiuAudio(); };
      a.onended = fim;
      a.onerror = function () { desistiu = true; fallback(); };

      // Se o áudio JÁ COMEÇOU a chegar, desistir no meio seria burrice: o servidor
      // está entregando, o arquivo é que é grande (o boletim dá ~165 KB). Cada
      // pedaço que chega renova a janela de espera.
      a.onprogress = function () {
        if (done || desistiu || !timer) return;
        clearTimeout(timer);
        timer = setTimeout(function () { desistiu = true; fallback(); }, ESPERA_MS);
      };

      // Espera o servidor sintetizar antes de cogitar o fallback.
      timer = setTimeout(function () { desistiu = true; fallback(); }, ESPERA_MS);

      a.play().then(function () { tocou = true; assumiuAudio(); })
              .catch(function () {
                // play bloqueado (autoplay) NÃO é erro de rede: o áudio pode estar vindo.
                // Tenta de novo quando ele estiver pronto; se nada vier, o timer decide.
                a.addEventListener("canplaythrough", function () {
                  if (!done && !tocou) { a.play().then(function(){ tocou = true; assumiuAudio(); }).catch(function(){}); }
                }, { once: true });
              });
    });
  }

  root.VSFalar = { falar: falar, parar: parar };
})(window);
