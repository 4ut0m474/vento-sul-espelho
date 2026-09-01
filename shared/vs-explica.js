/* vs-explica.js — explicações por voz em tudo que é difícil.
 * Toca /audio/explica/<chave>.mp3 se existir (slot da VOZ CLONADA do DJ);
 * senão fala ao vivo via VSFalar (edge-tts). API: VSExplica.tocar(chave, textoFallback)
 * e VSExplica.botao(chave, texto, rotulo) → elemento <button> pronto. */
(function (root) {
  let audioAtual = null;
  function parar() {
    if (audioAtual) { try { audioAtual.pause(); } catch (_) {} audioAtual = null; }
    if (root.VSFalar) try { root.VSFalar.parar(); } catch (_) {}
  }
  function tocar(chave, textoFallback) {
    parar();
    return new Promise((res) => {
      const a = new Audio("/audio/explica/" + chave + ".mp3");
      audioAtual = a;
      let erroTratado = false;
      const aoFalhar = () => {
        if (erroTratado) return; // evita o mesmo erro (nativo + play().catch()) disparar 2 vezes = voz duplicada
        erroTratado = true;
        audioAtual = null;
        if (root.VSFalar && textoFallback) root.VSFalar.falar(textoFallback).then(() => res(true));
        else res(false);
      };
      a.onended = () => { audioAtual = null; res(true); };
      a.onerror = aoFalhar;
      a.play().catch(aoFalhar);
    });
  }
  function botao(chave, texto, rotulo) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = rotulo || "🔊 Me explica";
    b.style.cssText = "padding:9px 14px;border:1px solid rgba(59,130,246,.5);border-radius:999px;background:rgba(59,130,246,.15);color:#93c5fd;font:600 13px system-ui;cursor:pointer";
    b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); b.textContent = "🔊 Falando…"; tocar(chave, texto).then(() => { b.textContent = rotulo || "🔊 Me explica"; }); };
    return b;
  }
  root.VSExplica = { tocar, botao, parar };
})(window);
