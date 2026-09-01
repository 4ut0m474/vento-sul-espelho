// Cadastro de produto/propaganda por voz — Litorânea parseia, comerciante confirma
// API exposta: window.VSCadastroVoz.abrir(barracaId, barracaNome)
// Requer: window.VSSupabase, Web Speech API (browser nativo)

(function () {
  const SPEECH = window.SpeechRecognition || window.webkitSpeechRecognition;
  const SUPA = window.VENTOSUL_CONFIG?.SUPABASE_URL?.replace(/\/+$/, "");
  const ANON = window.VENTOSUL_CONFIG?.SUPABASE_ANON_JWT;

  let modal, recog, gravando = false;
  let transcricao = "";
  let parsed = null;
  let barracaAtual = null;

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }

  function criarModal() {
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "modal-cadastro-voz";
    modal.className = "modal-bg";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="modal" style="max-width:520px;max-height:92vh;overflow-y:auto">
        <h3>📻 Cadastrar produto por voz</h3>
        <p style="font-size:12px;color:var(--hint);margin:6px 0 12px;line-height:1.45">
          Toca no microfone e fala. Diz o nome do produto, preço, estoque e pra quem é.
          <br><strong>Ex:</strong> <em>"tainha fresca, vinte e oito reais o quilo, tem trinta quilos hoje, é pra cozinheiro e família"</em>
        </p>

        <div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:18px;background:rgba(110,200,255,0.06);border:1px solid rgba(110,200,255,0.20);border-radius:12px;margin:10px 0">
          <button id="cv-mic" type="button" style="width:96px;height:96px;border-radius:50%;border:3px solid #7af0ff;background:radial-gradient(circle,rgba(110,200,255,0.45),rgba(110,200,255,0.05));color:#fff;font-size:42px;cursor:pointer;transition:transform .15s,box-shadow .25s;box-shadow:0 0 18px rgba(110,200,255,0.35)">📻</button>
          <div id="cv-status" style="font-size:13px;color:#7af0ff;font-weight:700;min-height:18px">Toque pra falar</div>
          <div id="cv-transcricao" style="width:100%;min-height:50px;padding:10px;background:rgba(0,0,0,0.30);border-radius:8px;font-size:14px;line-height:1.5;color:#fff;font-style:italic;text-align:center"></div>
        </div>

        <div id="cv-preview" style="display:none;background:linear-gradient(135deg,rgba(13,114,62,0.18),rgba(76,175,80,0.06));border:1px solid rgba(76,175,80,0.40);border-radius:12px;padding:14px;margin:12px 0">
          <div style="font-size:11px;color:#4caf50;font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em">✨ Litorânea entendeu:</div>
          <div id="cv-card" style="font-size:14px;line-height:1.6"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
            <button id="cv-corrigir" type="button" class="btn-primary" style="background:rgba(255,140,0,0.55);font-size:13px">✏️ Corrigir / falar de novo</button>
            <button id="cv-salvar" type="button" class="btn-primary" style="background:rgba(13,114,62,0.65);font-size:13px;font-weight:700">✅ Confirmar e salvar</button>
          </div>
        </div>

        <div id="cv-erro" style="display:none;background:rgba(229,57,53,0.20);border:1px solid rgba(229,57,53,0.50);padding:10px;border-radius:8px;font-size:12px;color:#ff9090;margin:10px 0"></div>

        <button type="button" class="btn-primary" style="width:100%;margin-top:8px;background:rgba(120,120,120,0.40)" onclick="window.VSCadastroVoz.fechar()">Fechar</button>
      </div>`;
    document.body.appendChild(modal);

    document.getElementById("cv-mic").onclick = toggleGravacao;
    document.getElementById("cv-corrigir").onclick = resetarParaNovaFala;
    document.getElementById("cv-salvar").onclick = salvarProduto;

    return modal;
  }

  function setStatus(txt, cor = "#7af0ff") {
    const el = document.getElementById("cv-status");
    if (el) { el.textContent = txt; el.style.color = cor; }
  }

  function setErro(txt) {
    const el = document.getElementById("cv-erro");
    if (!txt) { el.style.display = "none"; return; }
    el.textContent = "⚠️ " + txt;
    el.style.display = "block";
  }

  function toggleGravacao() {
    if (gravando) pararGravacao();
    else iniciarGravacao();
  }

  function iniciarGravacao() {
    if (!SPEECH) {
      setErro("Seu navegador não tem reconhecimento de voz. Use Chrome, Edge ou Safari.");
      return;
    }
    setErro("");
    transcricao = "";
    document.getElementById("cv-transcricao").textContent = "…";
    document.getElementById("cv-preview").style.display = "none";

    recog = new SPEECH();
    recog.lang = "pt-BR";
    recog.continuous = true;
    recog.interimResults = true;

    recog.onresult = (ev) => {
      let final = "", interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (final) transcricao += final + " ";
      document.getElementById("cv-transcricao").textContent = transcricao + (interim ? " " + interim : "");
    };

    recog.onerror = (ev) => {
      setErro("Erro no microfone: " + ev.error);
      pararGravacao();
    };

    recog.onend = () => {
      gravando = false;
      document.getElementById("cv-mic").style.transform = "scale(1)";
      document.getElementById("cv-mic").style.boxShadow = "0 0 18px rgba(110,200,255,0.35)";
      if (transcricao.trim()) {
        setStatus("Litorânea está entendendo…", "#ffd54f");
        parsearComLitoranea(transcricao.trim());
      } else {
        setStatus("Toque pra falar");
      }
    };

    recog.start();
    gravando = true;
    setStatus("🔴 Gravando — fala agora", "#ff7043");
    document.getElementById("cv-mic").style.transform = "scale(1.10)";
    document.getElementById("cv-mic").style.boxShadow = "0 0 28px rgba(255,80,80,0.65)";
  }

  function pararGravacao() {
    if (recog) try { recog.stop(); } catch {}
  }

  async function parsearComLitoranea(texto) {
    const prompt = `Você é um parser de produtos pra um app de feira do Sul do Brasil. O comerciante falou:\n\n"${texto}"\n\nExtrai e devolve APENAS um JSON puro (sem markdown, sem texto antes ou depois) com:\n{\n  "titulo": "nome curto do produto",\n  "subtitulo": "descrição curta com preço e detalhes",\n  "preco_centavos": número (28 reais = 2800; null se não falou),\n  "estoque": número (null se não falou),\n  "categorias": ["lista","de","categorias","relevantes"]\n}\n\nCategorias válidas (escolhe as que se encaixam): familia, mae_bebe, crianca, jovem, idoso, vegetariano, fitness, surf, pet, gamer, leitor, viajante, cozinheiro, artista, estudante.\n\nSe não conseguir entender, devolve {"erro":"motivo"}.`;
    try {
      const res = await fetch(`${SUPA}/functions/v1/litoranea-ai`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${ANON}`, "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem: prompt, persona: "litoranea" })
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const d = await res.json();
      const reply = (d.reply || "").trim();
      // Litorânea às vezes envolve em markdown — limpa
      const json = reply.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
      const obj = JSON.parse(json);
      if (obj.erro) throw new Error(obj.erro);
      mostrarPreview(obj);
    } catch (e) {
      setErro("Não consegui entender. Tenta falar de novo, mais claro. (" + (e.message || e) + ")");
      setStatus("Toque pra falar de novo");
    }
  }

  function mostrarPreview(obj) {
    parsed = obj;
    setStatus("Confere e confirma 👇", "#4caf50");
    const preco = obj.preco_centavos ? `R$ ${(obj.preco_centavos / 100).toFixed(2).replace(".", ",")}` : "preço não informado";
    const estoque = obj.estoque != null ? `${obj.estoque} disponíveis` : "estoque não informado";
    const cats = (obj.categorias || []).map(c => `<span style="display:inline-block;background:rgba(110,200,255,0.20);border:1px solid rgba(110,200,255,0.40);padding:2px 8px;border-radius:99px;font-size:11px;margin:2px">${escapeHtml(c)}</span>`).join("");
    document.getElementById("cv-card").innerHTML = `
      <div style="font-size:18px;font-weight:800;margin-bottom:4px">${escapeHtml(obj.titulo || "?")}</div>
      <div style="font-size:13px;color:var(--hint);margin-bottom:8px">${escapeHtml(obj.subtitulo || "")}</div>
      <div style="display:flex;gap:14px;font-size:13px;margin-bottom:10px">
        <span>💰 <strong>${preco}</strong></span>
        <span>📦 <strong>${estoque}</strong></span>
      </div>
      <div>🎯 ${cats || "<em style='color:var(--hint)'>sem categorias</em>"}</div>
    `;
    document.getElementById("cv-preview").style.display = "block";
  }

  function resetarParaNovaFala() {
    parsed = null;
    transcricao = "";
    document.getElementById("cv-preview").style.display = "none";
    document.getElementById("cv-transcricao").textContent = "";
    setErro("");
    iniciarGravacao();
  }

  async function salvarProduto() {
    if (!parsed || !barracaAtual) return;
    const btn = document.getElementById("cv-salvar");
    btn.disabled = true; btn.textContent = "Salvando…";
    try {
      const sub = parsed.subtitulo || "";
      const preco = parsed.preco_centavos ? ` · R$ ${(parsed.preco_centavos / 100).toFixed(2).replace(".", ",")}` : "";
      const estoque = parsed.estoque != null ? ` · ${parsed.estoque} disponíveis` : "";
      const subFinal = (sub + preco + estoque).slice(0, 200);
      const r = await window.VSSupabase.insert("propagandas_segmentadas", {
        barraca_id: barracaAtual,
        titulo: parsed.titulo || "Produto sem nome",
        subtitulo: subFinal,
        cor_fundo: "#0d723e",
        target_categorias: parsed.categorias || [],
        target_classes: [],
        prioridade: 50,
        duracao_seg: 8,
        ativa: true
      });
      if (r?.error) throw new Error(r.error.message || "erro ao salvar");
      setStatus("✅ Salvo! Próximo produto?", "#4caf50");
      // Recarrega lista de propagandas se SmartView estiver aberto
      if (typeof window._recarregarPropagandas === "function") {
        try { await window._recarregarPropagandas(barracaAtual); } catch {}
      }
      // Reset pra próxima
      parsed = null;
      transcricao = "";
      document.getElementById("cv-preview").style.display = "none";
      document.getElementById("cv-transcricao").textContent = "";
    } catch (e) {
      setErro("Erro ao salvar: " + (e.message || e));
    } finally {
      btn.disabled = false; btn.textContent = "✅ Confirmar e salvar";
    }
  }

  window.VSCadastroVoz = {
    abrir(barracaId, barracaNome) {
      barracaAtual = barracaId;
      criarModal();
      modal.querySelector("h3").textContent = barracaNome
        ? `📻 Cadastrar produto · ${barracaNome}`
        : "Cadastrar produto por voz";
      setErro("");
      transcricao = "";
      parsed = null;
      document.getElementById("cv-transcricao").textContent = "";
      document.getElementById("cv-preview").style.display = "none";
      setStatus("Toque pra falar");
      modal.style.display = "flex";
    },
    fechar() {
      pararGravacao();
      if (modal) modal.style.display = "none";
    }
  };
})();
