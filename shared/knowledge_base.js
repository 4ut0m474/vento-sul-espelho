// shared/knowledge_base.js — Respostas locais sem API.
// Cada tópico tem um TEXTO LONGO (pra ditar) escrito em pt-BR coloquial,
// pensado pra ser OUVIDO 2-3x antes da pessoa entender. Linguagem simples,
// frases curtas, ritmo natural com pausas (. ! ? ;).
//
// Uso: VSKnowledge.explicar("carteira") → string do texto
//      VSKnowledge.responder("o que é sulcoin") → string casando intent
//      VSKnowledge.topicos() → ["carteira","sulcoin",...] pra UI

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VSKnowledge = factory();
})(typeof self !== "undefined" ? self : this, function () {

  const KB = {
    // ════════════════════════════════════════════════════════════
    // OVERVIEW DO APP
    // ════════════════════════════════════════════════════════════
    como_funciona: `
Bem-vindo ao Vento Sul, a frequência da costa magenta. Aqui não é app de gigante
que cobra comissão, não. É rede de impacto digital regional, feita por feios pra feios,
do jeito certo. Te conto rapidinho o que rola aqui dentro.

Tem a Rádio Vento Sul, ao vivo, que toca notícia da TUA cidade primeiro, depois
das vizinhas, do estado, do Sul. Acordou? Aperta o despertador Bartinho, ele te
fala "lava a cara que o dia ta começando, te leva junto que tô cheio de notícia".
Quer aprender inglês? Modo bilíngue toca em português, depois traduzido pra
inglês, ouvindo aprende.

Tem o SulCoin, ponto do app, cem sulis valem um real, sempre. Tu ganha abrindo
o app, visitando lugar com GPS, fazendo quest cidadã, convidando amigo. Gasta
no comerciante do bairro. Comerciante recebe sem pagar comissão pra ninguém.

Tem Aurora, o jogo dentro do app. Sete classes de personagem, mapa do Sul vivo,
quest real tipo limpar riacho do morro com 3 amigos, foto antes e depois,
ganhou SulCoin. Não é joguinho cinza, é organização comunitária com cara de RPG.

Tem comerciante grande e pequeno, cada um com IA assistente própria que gera
promoção por voz, monta cardápio, escreve post de Insta. De graça, sempre.

Tem divulgador, que ganha código de afiliado pra postar e ganhar SulCoin a cada
amigo que entra. Cinco tiers de badge, da Semente ao Anjo do Sul.

Tudo isso? Funciona com inteligência artificial gratuita orquestrada com carinho.
Acessibilidade total, ouve botão de alto-falante em cada tela. Dá pra logar com
Google ou e-mail. Pode instalar como app no celular. Costa magenta, sempre.
    `,

    // ════════════════════════════════════════════════════════════
    // CARTEIRA / SULCOIN
    // ════════════════════════════════════════════════════════════
    carteira: `
Aqui é a tua carteira de SulCoin. SulCoin é o ponto do app. Cem sulis valem
um real. Sempre. Não sobe, não desce, não rende juros. Tu ganha SulCoin de
cinco jeitos. Primeiro: bônus diário. Abre o app uma vez por dia que ganha um
pouquinho. Sete dias seguidos rende mais. Segundo: caça ao tesouro. Visita
um lugar marcado no mapa, o GPS confirma, ganha. Terceiro: missões cidadãs,
tipo foto de buraco na rua ou ajuda na limpeza de praia. Quarto: convidando
amigo. Cada amigo que entrar com teu código te dá cem sulis e o amigo ganha
cinquenta. Quinto: recebendo de outra pessoa, tipo um Pix simbólico de carinho.
Pra gastar, é só pagar comerciante do bairro. Ele recebe e converte em real
via Pix com nota fiscal — direitinho com a Receita.
    `,

    sulcoin: `
SulCoin é o ponto do app, vou explicar com calma. Não é Bitcoin, não é cripto,
não é investimento. É ponto de fidelidade, igual milha de avião. Cem sulis
valem um real, e isso nunca muda. Cada sulis tem uma origem rastreável —
uma assinatura matemática única que prova quando ele foi criado, por quem,
em que lugar e por que motivo. Isso significa que o admin do app não consegue
imprimir SulCoin no escuro. Toda criação deixa rastro provável. Qualquer
pessoa pode auditar e bater os números. Pra ganhar, é só participar: bônus
diário, missão, caça, indicação. Pra gastar, no comerciante parceiro do
bairro. Pra mandar pra outra pessoa, é só fazer um recado em sulis no app.
    `,

    pool_lastro: `
A pool é a reserva real de dinheiro do app. Toda vez que comerciante ou
prefeitura coloca dinheiro na pool, esse dinheiro vira lastro. Cada sulis
em circulação tem um centavo correspondente guardado. Tipo um cofre que
banca o sistema. Isso quer dizer que o app não pode imprimir mais sulis
do que tem dinheiro pra cobrir. Quando a pool fica cheia, tem muita missão
e bônus disponível. Quando esvazia, o app automaticamente para de oferecer
missões até alguém abastecer. É uma economia de verdade, sustentável,
não furada. E qualquer um pode olhar quanto tem na pool em tempo real,
no botão Pool da Comunidade na tua carteira.
    `,

    forjas_seguranca: `
Cada SulCoin que nasce no app vira uma forja. Forja é tipo uma certidão de
nascimento da moeda, com assinatura digital impossível de falsificar. A
assinatura usa uma chave secreta que mora num cofre digital — nem o admin
do app vê. Quem tenta inventar uma forja fora do caminho oficial tem a
fraude detectada na hora, porque a assinatura não bate. Tu pode tocar em
qualquer forja na lista Origem dos Meus Sulis, que o app confere a
assinatura na hora. Aparece autêntica ou adulterada. Isso faz o SulCoin
ser confiável de verdade, não só palavra de honra do app.
    `,

    // ════════════════════════════════════════════════════════════
    // COMERCIANTE
    // ════════════════════════════════════════════════════════════
    comerciante: `
Tu é comerciante? Então tem aqui tua área. Pra começar, faz login com email
e senha. Se ainda não tem conta, é só cadastrar. Depois tu pode comprar uma
barraca na Feira Digital, escolher categoria, descrição, fotos. A barraca
fica de graça pra existir, aparece pro pessoal da região no mapa Perto de Mim.
Quem quiser aparecer mais, comprar destaque: carrossel rotativo, banner do
topo, ou plano anual com dois meses grátis. Cada destaque tem preço claro,
pode pagar parte em SulCoin que tu já recebeu de clientes. Tu também pode
abrir uma SmartView, que é uma TV na vitrine que mostra propaganda pra
quem passa na frente, baseada no perfil agregado das pessoas. E quando
vender, recebe os SulCoin do cliente direto na carteira, que vira Pix com
nota fiscal quando tu solicitar saque.
    `,

    planos: `
Os planos pro comerciante funcionam assim. Existir na Feira é de graça —
tu já aparece. Pra aparecer MAIS, tem destaque pago. O carrossel rotativo
deixa tua barraca girar lá em cima junto com outras. O banner do topo
fixa tua barraca na entrada do app por um tempo. A geolocalização paga
te coloca no mapa Perto de Mim, pra quem passar perto saber que tu tá
ali. A SmartView é a TV na vitrine que mostra propaganda inteligente.
Tudo tem preço em real e em sulis. Plano anual sai com dois meses
grátis comparado com o mensal. Tu pode usar até cinquenta por cento em
SulCoin pra abater o valor. Os preços aparecem na hora de comprar e
podem mudar — sempre confere antes de fechar.
    `,

    // ════════════════════════════════════════════════════════════
    // CAÇA / COLETIVA / TRILHAS
    // ════════════════════════════════════════════════════════════
    caca_tesouro: `
Caça ao Tesouro é missão pela cidade. Tu abre o mapa e aparecem pontos
marcados — uma praia, um café, um mirante. Tu vai até o lugar, o GPS
confirma que tu chegou, e ganha SulCoin na hora. Cada cidade tem seus
pontos. Quem patrocina os pontos é a prefeitura, o hub do bairro, ou
um comerciante da região. Por isso só aparece caça quando tem dinheiro
na pool pra pagar. Tu vê os pontos disponíveis, escolhe uma rota,
visita, ganha. Bom pra conhecer lugar novo. Bom pra fazer um passeio
diferente. E o melhor: se chama amigo, todo mundo ganha.
    `,

    compra_coletiva: `
Compra coletiva é quando muita gente entra na mesma oferta pra ficar mais
barato. Funciona assim: comerciante abre uma oferta, tipo dez almoços por
um preço só. Quanto mais gente entra, mais barato fica pra todos. Tu se
compromete em SulCoin pra entrar. Se a oferta fechar com gente suficiente,
o desconto é aplicado. Se não fechar, teus SulCoin voltam, ninguém perde.
É segurança pros dois lados: comerciante só vende se realmente tem demanda,
cliente só paga se realmente tem economia. Tudo registrado no app, com
prazo claro, sem surpresa.
    `,

    // ════════════════════════════════════════════════════════════
    // AURORA / JOGO
    // ════════════════════════════════════════════════════════════
    aurora: `
Aurora é o jogo dentro do app. Tu escolhe uma classe — desbravador, guerreiro,
mago, alquimista, sábio, forjador — cada uma com talento próprio. Tu joga
explorando o mapa do Espelho da Alma, fazendo missões, encontrando NPCs.
Cada classe tem visual em três épocas: passado medieval, presente, futuro
cyber. Quanto mais tu joga, mais sobe de nível, mais missões abre. As
missões do jogo são também missões da vida real — limpar uma praia,
denunciar buraco, ajudar idoso. Cidadania vira aventura, aventura vira
SulCoin, SulCoin vira poder de compra no comércio do bairro. Tudo conectado.
    `,

    // ════════════════════════════════════════════════════════════
    // PRIVACIDADE / LGPD
    // ════════════════════════════════════════════════════════════
    privacidade: `
A gente leva privacidade a sério. Não vendemos teus dados, nunca. Teu CPF
e RG, se tu cadastrar, viram código embaralhado antes de sair do teu
celular — nem a gente vê o número original. Email é só pra te avisar de
coisa que tu pediu, nunca pra spam. Tu pode pedir pra apagar tua conta
quando quiser, sem taxa, sem pergunta. Em até trinta dias tudo apagado:
nome, email, hashes. A geolocalização do mapa Perto de Mim fica arredondada
em onze metros e dura cinco minutos só. A TV inteligente nunca sabe quem
tu é, só categoria agregada. É lei geral de proteção de dados cumprida na
prática, não só no papel.
    `,

    // ════════════════════════════════════════════════════════════
    // BÔNUS, MISSÕES, INDICAÇÃO
    // ════════════════════════════════════════════════════════════
    bonus_diario: `
Bônus diário é o presente que o app te dá toda vez que tu abre, uma vez
por dia. Começa pequeno, uns cinco sulis. Se voltar amanhã, ganha de novo
e o streak sobe. Sete dias seguidos rende muito mais. Se faltar um dia,
o streak zera e começa do um. É grátis, vem da pool da comunidade.
Quando a pool fica vazia, o bônus diário pode pausar até alguém abastecer.
Por isso vale a pena olhar a pool de vez em quando — ela mostra a saúde
do sistema. E o bônus não some: cada resgate é uma forja com hash, fica
na tua lista Origem dos Meus Sulis pra sempre.
    `,

    indicacao: `
Convidar amigo é o jeito mais rápido de ganhar SulCoin. Tu pega teu código
no botão Convidar Amigos da carteira, manda pra alguém. Quando esse alguém
entra no app pelo teu código, tu ganha cem sulis na hora, e o amigo ganha
cinquenta. Os dois ainda ganham sete dias grátis de assinatura. O sistema
reserva os sulis na pool quando tu manda o convite, então só funciona se
a pool tiver verba. Se o amigo entrar, vira forja real. Se não entrar em
sete dias, os sulis voltam pra pool. Tudo rastreável, tudo justo.
    `,

    // ════════════════════════════════════════════════════════════
    // LITORÂNEA / IAS
    // ════════════════════════════════════════════════════════════
    litoranea: `
Eu sou a Litorânea. Sou a guia do app. Pode falar comigo, pode digitar,
pode tocar nos botões — eu entendo dos três jeitos. Sei do Sul do Brasil:
praias, cidades, comércios, festas, gastronomia, caça ao tesouro. Pra eu
te ajudar melhor, primeiro me conta de qual estado tu é, depois qual cidade,
depois sobre o que tu quer falar — praias, bairros, atrações, comércio.
A cada passo fica mais fácil pra mim te dar resposta certa. Se quiser
trocar a qualquer momento, é só falar muda cidade ou outro estado. Tem
mais duas IAs aqui: a Automata é a professora do app, ela explica como
usar qualquer tela. E a Aurora é a narradora do jogo. Toca no rosto delas
em cima pra trocar.
    `,

    // ════════════════════════════════════════════════════════════
    // POOL / TRANSPARÊNCIA
    // ════════════════════════════════════════════════════════════
    auditoria: `
Tudo no app é auditável. Tu pode tocar no botão Pool e ver quanto dinheiro
real tem depositado, quanto sulis tá em circulação, quanto tá reservado
em missões. Pode tocar em Origem dos Meus Sulis e ver cada moeda que
entrou na tua carteira, com motivo, data e assinatura digital. Pode tocar
em qualquer forja e o app confere a assinatura na hora — autêntica ou
adulterada, aparece a verdade. Não tem como o admin esconder nada. A
matemática protege todo mundo, cidadão e comerciante. É blockchain de
principiante: cada moeda tem certidão de nascimento que ninguém consegue
falsificar.
    `,

    // ════════════════════════════════════════════════════════════
    // MAIS VOTADOS
    // ════════════════════════════════════════════════════════════
    mais_votados: `
Mais Votados é a vitrine do que a galera ama na cidade. Cada usuário pode
votar nos lugares que mais gosta — uma praia, um café, uma trilha, uma
festa. Os mais votados aparecem em destaque, com foto e nome. Não é
ranking pago, é amor de gente local. Tu pode votar tocando no botão
estrela de cada lugar. Cada voto vale um pouquinho — não pode votar
mil vezes no mesmo. O app cuida pra ser justo. Quanto mais voto um
lugar tem, mais aparece pros visitantes que chegam. É turismo guiado
pelo morador, não por agência. Por isso a lista é viva, muda toda
semana, e mostra a cara real da cidade.
    `,

    // ════════════════════════════════════════════════════════════
    // PRAIAS
    // ════════════════════════════════════════════════════════════
    praias: `
Praias é a sessão das praias do Sul, com tudo que tu precisa saber. Pra
cada praia tem foto, descrição, distância da cidade, dificuldade de
acesso, se tem ou não estrutura — quiosque, banheiro, salva-vidas. Tem
filtro pra mostrar só praia tranquila, badalada, com onda pra surfar,
ou de família. Se tu liberar GPS, a Litorânea acha a praia mais perto
de onde tu tá. E se tu já viu uma praia bonita que não tá no app,
manda foto pra Litorânea, ela cadastra. As praias são o coração do
Sul, tem mais de cem mapeadas só em Santa Catarina e no litoral
do Paraná.
    `,

    // ════════════════════════════════════════════════════════════
    // TRILHAS
    // ════════════════════════════════════════════════════════════
    trilhas: `
Trilhas mostra os caminhos pela natureza do Sul, com pontos marcados.
Cada trilha tem distância, tempo médio, dificuldade — tranquila, média
ou puxada. O mapa funciona offline depois que tu baixar a primeira vez
— bom pra lugar sem sinal. Tem trilha pra família, pra cachorro, pra
quem só quer caminhar leve, e pra quem encara serra séria. Cada
ponto da trilha pode ser também um ponto da Caça ao Tesouro — assim
tu ganha SulCoin enquanto caminha. Antes de ir, sempre avisa alguém
da rota, leva água, e baixa o mapa offline. Boa caminhada.
    `,

    // ════════════════════════════════════════════════════════════
    // BOTTOM BAR / NAVEGAÇÃO
    // ════════════════════════════════════════════════════════════
    navegacao: `
A barra de baixo do app tem cinco botões principais. O do meio, com a foto
da Litorânea, é o atalho pra falar comigo. Toca curto pra abrir o chat,
segura apertado pra ativar o microfone. Os outros quatro são Início,
Comerciante, SulCoins e Perto. Início te leva pra tela inicial com o
carrossel das fotos do Sul. Comerciante é a área do dono de barraca,
pra fazer login e gerenciar. SulCoins abre tua carteira. E Perto é
o mapa Perto de Mim que mostra as ofertas e barracas próximas com
GPS. Em cima do app tem mais botões: trocar tema, idioma, voltar e
avançar. E sempre tem o botãozinho redondinho de antena pra ouvir
explicação da tela onde tu tá.
    `,

    // ════════════════════════════════════════════════════════════
    // HUB / SOLIDARIEDADE DE BAIRRO
    // ════════════════════════════════════════════════════════════
    hub: `
Hub é um nó de impacto de bairro dentro do app (solidariedade local, não rede de impacto formal). Cada usuário pode entrar num
hub do seu bairro, do seu condomínio, da sua cidade. Quando tu ganha
SulCoin, oito por cento vai pra um caixa coletivo do hub. Esse caixa é
usado pra projetos da galera — pode ser internet compartilhada, evento
de rua, manutenção de uma praça, o que a maioria votar. Tu vê o saldo
do hub, vê quem mais contribui, vê os movimentos. Tudo transparente,
todo mundo decide junto. É solidariedade regional de verdade, leve, dentro
do app. A regra de oito por cento pode mudar com voto da galera. E
qualquer um pode propor um projeto pro caixa do hub usar.
    `,

    // ════════════════════════════════════════════════════════════
    // SELO CIDADANIA / HONESTIDADE
    // ════════════════════════════════════════════════════════════
    selo_cidadania: `
Selo de Cidadania é a tua reputação dentro do app. Quanto mais missão tu
faz com honestidade, quanto mais SulCoin gasta no comércio do bairro,
quanto mais tu ajuda no hub e no jogo Aurora, mais o teu selo cresce.
Selo bom destrava coisas: vira ouro pra ofertas exclusivas, prioridade
nas compras coletivas, descontos extras nos planos de comerciante. E
selo ruim — se tu tenta trapacear, marcar GPS sem ir no lugar, transferir
sulis em loop com amigo pra inflar — o app detecta e reduz teu selo. É
incentivo pra ser bom morador, bom cidadão, bom usuário. Não é nota
do banco, é nota da comunidade.
    `,

    // ════════════════════════════════════════════════════════════
    // QUESTS VIVAS / CIVIC
    // ════════════════════════════════════════════════════════════
    quests_vivas: `
Quests Vivas é o sistema que transforma problemas reais da cidade em
missões cidadãs. Tem buraco grande na rua? Vira um Monstro Buraco no
mapa Aurora. Foco de dengue? Vira um Mosquito Boss. Riacho poluído?
Vira uma Caverna Suja. Cidadãos viram heróis quando vão lá, registram
foto, antes e depois. Quando o problema for resolvido — pelo poder
público ou pela própria comunidade — o monstro morre, sai do mapa,
e quem participou ganha SulCoin e pontos de selo. Cidadania vira jogo,
jogo vira mudança real. É a parte mais bonita do app: usar a tecnologia
pra fazer a cidade ficar melhor de verdade, com as pessoas se
mobilizando juntas.
    `,

    // ════════════════════════════════════════════════════════════
    // RECARREGAR / GASTAR SULCOIN
    // ════════════════════════════════════════════════════════════
    recarregar: `
Recarregar SulCoin é trocar real por sulis. Cem sulis por um real.
Funciona via Pix, com Mercado Pago ou Asaas. Tu escolhe um pacote —
tem opções de cinco, vinte, cinquenta ou cem reais — e pacote maior
ganha bônus em sulis extras. Tu paga via Pix, e na hora os sulis
caem na tua carteira. O dinheiro real entra na pool da comunidade,
virando lastro pra todo mundo. Por enquanto, recarregar é opcional —
tu pode ganhar sulis de graça também, fazendo missão, caça e bônus
diário. A diferença é que recarregar entrega rápido. E o dinheiro
fica disponível pra circular no comércio do bairro. Ninguém perde,
todo mundo ganha.
    `,

    // ════════════════════════════════════════════════════════════
    // FALAR NO MIC / VOZ
    // ════════════════════════════════════════════════════════════
    voz: `
Quase tudo no app pode ser feito por voz. Tu segura o botão da Litorânea
no meio da barra de baixo, fala com calma, ela escuta. Pode pedir pra
mostrar uma cidade, abrir uma tela, contar piada do Sul, explicar
qualquer função. Pode também responder por voz quando ela faz pergunta
— por exemplo, no funil ela te pergunta de qual estado tu é, tu responde
Paraná falando ou tocando no chip. Tem botãozinho de antena em cada
tela pra ouvir a explicação inteira da tela narrada. É bom pra quem
não enxerga bem, pra quem dirige, pra quem prefere ouvir do que ler.
A Litorânea entende português brasileiro. Não te apressa. Não te julga.
Pode falar bem devagar.
    `
  };

  // Mapeia frases comuns pra tópicos da KB. Match progressivo: contém palavras-chave
  const ATALHOS = [
    { topico: "como_funciona", palavras: ["como funciona", "como funka", "o que é", "explicar", "explicação", "tour"] },
    { topico: "carteira",      palavras: ["carteira", "wallet", "saldo", "meus sulis", "meu dinheiro"] },
    { topico: "sulcoin",       palavras: ["sulcoin", "sulis", "que ponto", "moeda", "como ganhar", "como gastar"] },
    { topico: "pool_lastro",   palavras: ["pool", "lastro", "reserva", "comunidade", "sustentável"] },
    { topico: "forjas_seguranca", palavras: ["forja", "hash", "assinatura", "blockchain", "fraude", "segurança"] },
    { topico: "comerciante",   palavras: ["comerciante", "barraca", "vender", "minha loja", "merchant"] },
    { topico: "planos",        palavras: ["plano", "destaque", "carrossel", "banner", "smartview"] },
    { topico: "caca_tesouro",  palavras: ["caça", "caca", "tesouro", "missão", "missoes", "ponto", "waypoint"] },
    { topico: "compra_coletiva", palavras: ["coletiva", "comprar junto", "grupo", "desconto coletivo"] },
    { topico: "aurora",        palavras: ["aurora", "jogo", "rpg", "classe", "espelho da alma"] },
    { topico: "privacidade",   palavras: ["privacidade", "lgpd", "dados", "cpf", "anônimo", "anonima"] },
    { topico: "bonus_diario",  palavras: ["bônus", "bonus", "streak", "diário", "diario", "todo dia"] },
    { topico: "indicacao",     palavras: ["indicar", "indicacao", "indicação", "convidar amigo", "código de amigo"] },
    { topico: "litoranea",     palavras: ["litorânea", "litoranea", "ias", "automata", "voz"] },
    { topico: "auditoria",     palavras: ["auditoria", "audit", "verificar", "transparência", "transparencia"] },
    { topico: "mais_votados",  palavras: ["mais votados", "votar", "voto", "estrela", "ranking"] },
    { topico: "praias",        palavras: ["praia", "praias", "mar", "areia", "litoral"] },
    { topico: "trilhas",       palavras: ["trilha", "trilhas", "caminhada", "caminho", "natureza"] },
    { topico: "navegacao",     palavras: ["navegação", "navegacao", "barra", "bottom", "botões", "botoes", "menu"] },
    { topico: "hub",           palavras: ["hub", "impacto", "bairro", "caixa coletivo", "comunidade"] },
    { topico: "selo_cidadania", palavras: ["selo", "cidadania", "honestidade", "reputação", "reputacao"] },
    { topico: "quests_vivas",  palavras: ["quest", "quests", "monstro", "buraco", "denúncia", "denuncia", "civic"] },
    { topico: "recarregar",    palavras: ["recarregar", "comprar sulis", "pix", "pacote", "trocar real"] },
    { topico: "voz",           palavras: ["voz", "falar", "ditar", "microfone", "mic", "ouvir"] }
  ];

  function _normalizar(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  }

  function explicar(topico) {
    const t = (KB[topico] || "").trim();
    if (!t) return null;
    return t.replace(/\s+/g, " ");   // colapsa whitespace pra TTS soar bem
  }

  function responder(textoLivre) {
    const t = _normalizar(textoLivre);
    if (!t) return null;
    for (const a of ATALHOS) {
      for (const p of a.palavras) {
        if (t.includes(_normalizar(p))) return explicar(a.topico);
      }
    }
    return null;
  }

  function topicos() { return Object.keys(KB); }

  return { explicar, responder, topicos };
});
