/* vs-filtro-palavras.js — filtro de respeito do Vento Sul (28/07/2026)
 *
 * Por que existe: o app é aberto pra família, tem Modo Criança no jogo.
 * Tudo que um usuário escreve e OUTRO usuário lê passa por aqui.
 *
 * Três coisas que a versão antiga (copiada solta em jornal.html e radio.html)
 * fazia errado e aqui estão consertadas:
 *   1. a lista de palavrão ficava em texto puro no fonte da página — bastava
 *      "ver código-fonte" pra ler a lista inteira. Agora vai codificada.
 *   2. era includes() cru: "reputação" batia em "puta", "desviado" em "viado".
 *      Agora só casa em começo de palavra.
 *   3. não pegava disfarce comum (p0rra, c@ralho, pu7a). Agora normaliza.
 *
 * Uso:
 *   <script src="/shared/vs-filtro-palavras.js"></script>
 *   if (VSFiltro.temPalavrao(texto)) { ...avisa o usuário... }
 */
(function (root) {
  // Lista em base64 só pra não ficar escancarada em "ver código-fonte".
  // Não é segurança — é decência. A checagem de verdade é no servidor.
  var _b64 =
    "cG9ycmEsY2FyYWxoLGJ1Y2V0YSxidWNldCx2aWFkbyx2ZWFkbyxwdXRhLHB1dG8scHV0YXJp" +
    "YSx2YWdhYnVuZGEsZmRwLGFycm9tYmFkLGN1emFvLGN1esOjbyxwaXJhbmhhLGZvZGUsZm9k" +
    "YSxmb2Rlcixmb2RpZCxtZXJkYSxjYWdhbyx4b3hvdGEseG90YSxwaXJvY2EscGF1IG5vIGN1" +
    "LGN1IGRlLHRvbWEgbm8gY3UsZmlsaG8gZGEgcCxmaWxoYSBkYSBwLGRlc2dyYWNhZCxkZXNn" +
    "cmHDp2FkLG90YXJpbyxvdMOhcmksaW1iZWNpbCxib3N0YSxwcm9zdGl0dSxzYWZhZGEsc2Fm" +
    "YWRvLGNvcm5vLGNodXBhIG1lLHNpZnUsdnNmLHBxcCxlc2Nyb3QsYmFiYWNhLHRlIG1hdG8s" +
    "dGUgbWF0YXIsbWF0byB0dSx2b3UgbWF0YXIscXVlcm8gbWF0YXIsbWF0YXIgdm9jZSxtYXRh" +
    "ciB2b2PDqixtYXRhciBlbGUsbWF0YXIgZWxhLG1hdGFyIHR1LGVzdHVwcixlc3RyYW5ndWxh" +
    "LHRpcm90ZWlvLHN1aWNpZCxzZSBtYXRhLG1hdGEgZWxlLG1hdGEgZWxhLHBlZG9maWwsYWxp" +
    "Y2lhciBtZW5vcixmdWRlLGZ1ZGVyLGZ1ZGVuZCxjYWNldGUscHVuaGV0LHBvcm7DtCxwb3Ju" +
    "byx4aW5nYXI=";

  var _lista = null;
  function lista() {
    if (_lista) return _lista;
    var txt;
    try { txt = decodeURIComponent(escape(atob(_b64))); }
    catch (_) { txt = atob(_b64); }
    _lista = txt.split(",").filter(function (s) { return s.length > 2; });
    return _lista;
  }

  // Tira acento, baixa caixa, desfaz disfarce comum (0->o, 1->i, @->a, $->s…),
  // e colapsa repetição de letra ("caraaaalho" -> "caralho").
  function normalizar(t) {
    var n = String(t || "");
    try { n = n.normalize("NFKD").replace(/[̀-ͯ]/g, ""); } catch (_) {}
    n = n.toLowerCase();
    n = n.replace(/[0]/g, "o").replace(/[1!|]/g, "i").replace(/[3]/g, "e")
         .replace(/[4@]/g, "a").replace(/[5$]/g, "s").replace(/[7]/g, "t")
         .replace(/[()]/g, "c");
    n = n.replace(/[^a-z ]+/g, " ");     // pontuação/emoji viram espaço
    n = n.replace(/(.)\1{2,}/g, "$1");   // aaaa -> a
    n = n.replace(/\s+/g, " ").trim();
    return " " + n + " ";
  }

  // Só casa em COMEÇO de palavra: mata "puta" mas deixa "reputação" passar.
  function temPalavrao(texto) {
    if (!texto) return false;
    var n = normalizar(texto);
    var ps = lista();
    for (var i = 0; i < ps.length; i++) {
      if (n.indexOf(" " + ps[i]) !== -1) return true;
    }
    return false;
  }

  // Devolve { ok, motivo } — pra quem quiser mostrar mensagem própria.
  function checar(texto, idioma) {
    if (!temPalavrao(texto)) return { ok: true, motivo: "" };
    var msg = {
      pt: "Sem palavrão nem violência — aqui é a corrente do bem 💚",
      en: "No swearing or violence — this is the good chain 💚",
      es: "Sin groserías ni violencia — aquí es la buena onda 💚"
    };
    return { ok: false, motivo: msg[idioma] || msg.pt };
  }

  var API = { temPalavrao: temPalavrao, checar: checar, normalizar: normalizar };

  if (typeof module === "object" && module.exports) module.exports = API;
  root.VSFiltro = API;
})(typeof window !== "undefined" ? window : globalThis);
