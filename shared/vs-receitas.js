/* vs-receitas.js — as receitas da cozinha comunitária.
 * Receita real e enxuta: ingredientes, passos, rendimento, guarda e o CUIDADO.
 * O campo "cuidado" não é enfeite: conserva de baixa acidez e peixe defumado
 * têm risco real de botulismo. Onde há risco, ele está escrito.
 */
(function (root) {

// atalhos pra não repetir texto de segurança
var BOTULISMO = 'Conserva de baixa acidez em vidro fechado pode gerar botulismo — doença grave. ' +
  'Ou acidifique até pH abaixo de 4,5 (vinagre/limão, medido com fitinha), ou esterilize em ' +
  'autoclave. Nunca confie só na fervura da panela.';
var DEFUMADO_FRIO = 'Defumação a frio NÃO cozinha o peixe. Exige cura com sal antes, temperatura ' +
  'abaixo de 30 °C, e o produto vai pra geladeira depois — nunca pra prateleira. Sem cura correta, ' +
  'há risco de listeria e botulismo.';
var MAPA = 'Bebida alcoólica só pode ser vendida com registro no Ministério da Agricultura (MAPA) ' +
  'e estabelecimento registrado. Produzir pra consumo próprio é livre; vender, não.';
var VIDRO = 'Vidro e tampa fervidos 15 min, secos em forno baixo. Tampa que não faz "ploc" ao ' +
  'esfriar não vedou: essa vai pra geladeira e se come na semana.';

var R = {};
function add(nome, o) { R[nome] = o; }

/* ═══ PEIXE DEFUMADO E CURADO ═══ */
add('Tainha defumada', {
  ing: ['Tainha limpa, aberta em manta', 'Sal grosso: 1 kg pra cada 4 kg de peixe',
        'Açúcar mascavo: 2 colheres de sopa por kg', 'Louro, pimenta-do-reino em grão',
        'Lenha ou serragem de madeira nativa não resinosa (goiabeira, laranjeira)'],
  passos: ['Abra a tainha em manta, tire vísceras e lave em água corrente gelada.',
    'Cubra com a mistura de sal e açúcar. Deixe curando na geladeira 8 a 12 h, virando na metade.',
    'Lave o sal em água corrente e deixe secar pendurada 2 a 4 h em lugar arejado, até formar uma película brilhante na superfície.',
    'Defume a quente por 3 a 5 h, mantendo o defumador entre 60 e 80 °C, até o centro passar de 63 °C.',
    'Esfrie por completo antes de embalar.'],
  rende: '1 kg de peixe fresco vira cerca de 600 g de defumado.',
  guarda: 'Embalado a vácuo, 20 a 30 dias na geladeira. Congelado, 6 meses.',
  cuidado: 'Use termômetro. "No olho" não serve pra peixe curado.'
});
add('Anchova defumada', {
  ing: ['Anchova em filé com pele', 'Salmoura: 1 L de água + 200 g de sal + 50 g de açúcar',
        'Folha de louro e alho amassado'],
  passos: ['Deixe os filés na salmoura fria por 4 a 6 h na geladeira.',
    'Enxágue, seque e deixe formar película por 2 h no vento.',
    'Defume a quente 2 a 3 h entre 60 e 80 °C.',
    'Peixe gordo pega muito bem a fumaça — não exagere no tempo ou amarga.'],
  rende: '1 kg de filé vira cerca de 700 g.',
  guarda: 'A vácuo, 20 dias refrigerado.',
  cuidado: 'Anchova é peixe gordo: oxida rápido. Embale logo que esfriar.'
});
add('Sardinha defumada', {
  ing: ['Sardinha inteira ou eviscerada', 'Salmoura: 1 L água + 180 g sal', 'Serragem de madeira frutífera'],
  passos: ['Salmoura de 1 a 2 h — sardinha é pequena, satura rápido.',
    'Seque bem e defume a quente 60 a 90 min.',
    'Pode ir pro vidro coberta de azeite depois de fria, virando conserva.'],
  rende: 'Muito volume por real investido — é o produto de entrada mais barato.',
  guarda: 'Defumada simples: 10 dias na geladeira. Em azeite: 60 dias refrigerada.',
  cuidado: 'Sardinha em azeite à temperatura ambiente é risco de botulismo. Geladeira sempre.'
});
add('Filé de peixe a frio', {
  ing: ['Filé de peixe firme, sem pele', 'Sal de cura (com nitrito) conforme dosagem do fabricante',
        'Sal, açúcar, endro ou erva-doce'],
  passos: ['Cure o filé coberto na mistura por 12 a 24 h na geladeira, prensado.',
    'Lave, seque e forme a película por 4 h em geladeira ventilada.',
    'Defume a frio (abaixo de 30 °C) por 6 a 12 h.',
    'Fatie fino no viés e embale a vácuo.'],
  rende: 'O item de maior valor por quilo do catálogo.',
  guarda: 'A vácuo e refrigerado: 21 dias. Congelado: 3 meses.',
  cuidado: DEFUMADO_FRIO
});
add('Cavala e bonito', {
  ing: ['Cavala ou bonito em posta', 'Salmoura: 1 L água + 200 g sal', 'Pimenta e louro'],
  passos: ['Salmoura de 3 a 4 h.', 'Seque e forme película.',
    'Defume a quente 3 a 4 h até 63 °C no centro.',
    'A carne fica firme e escura — combina com desfiar pra patê.'],
  rende: '1 kg vira 650 g.',
  guarda: 'A vácuo, 20 dias na geladeira.',
  cuidado: 'Peixe de sangue escuro estraga rápido: da captura ao gelo, sem parada.'
});
add('Bacalhau da terra', {
  ing: ['Peixe branco de carne firme, aberto em manta', 'Sal grosso em abundância'],
  passos: ['Empilhe camadas de peixe e sal grosso num caixote com dreno.',
    'Deixe 24 a 48 h escorrendo o líquido que sair.',
    'Lave o excesso e seque ao sol e vento por 2 a 4 dias, recolhendo à noite.',
    'Está pronto quando fica rígido e dobra sem quebrar.'],
  rende: 'Perde 60% do peso — mas dispensa geladeira.',
  guarda: 'Meses em lugar seco e arejado. Dessalgar antes de usar.',
  cuidado: 'Se der cheiro azedo ou mancha rosada, descarte. Sol e vento de verdade, não sombra úmida.'
});
add('Patê de peixe defumado', {
  ing: ['200 g de aparas de peixe defumado', '150 g de cream cheese ou requeijão de corte',
        'Suco de meio limão', 'Cebolinha e pimenta a gosto'],
  passos: ['Desfie o defumado tirando espinha e pele.',
    'Bata tudo no processador até virar creme grosso.',
    'Ajuste sal — o defumado já é salgado.',
    'Envase em potinho e refrigere.'],
  rende: 'Aproveita 100% das aparas — o que ia pro lixo vira o item de maior margem.',
  guarda: '7 dias na geladeira.',
  cuidado: 'Produto fresco: não vai pra prateleira em hipótese nenhuma.'
});
add('Linguiça de peixe', {
  ing: ['1 kg de carne de peixe sem espinha', '20 g de sal', 'Alho, cebola, pimentão, coentro',
        '100 g de gordura (toucinho ou azeite gelado)', 'Tripa natural limpa'],
  passos: ['Moa a carne bem gelada com a gordura.',
    'Tempere e sove até a massa ficar pegajosa.',
    'Embuta na tripa sem apertar demais e amarre em gomos.',
    'Cozinhe em água a 75 °C por 20 min ou defume a quente 2 h.'],
  rende: 'Usa o peixe que não tem tamanho pra filé.',
  guarda: 'Refrigerada 5 dias; congelada 3 meses.',
  cuidado: 'Tudo gelado o tempo todo. Massa de peixe morna estraga em minutos.'
});
add('Peixe em pó / farinha', {
  ing: ['Cabeça, espinha e aparas limpas'],
  passos: ['Cozinhe as sobras por 30 min e escorra.',
    'Seque em forno baixo (80 °C) ou ao sol até quebrar entre os dedos.',
    'Triture e peneire.',
    'Pode ir pra tempero (a peneira fina) ou ração animal (a grossa).'],
  rende: 'Fecha o ciclo: nada sai do galpão como lixo.',
  guarda: 'Vidro seco e fechado, 6 meses.',
  cuidado: 'Se ficar qualquer umidade, mofa. Seque mais do que acha necessário.'
});
add('Ovas curadas', {
  ing: ['Ovas de tainha inteiras, com a membrana intacta', 'Sal grosso'],
  passos: ['Lave com cuidado sem romper a membrana.',
    'Cubra de sal por 4 a 8 h dependendo do tamanho.',
    'Lave, prense entre tábuas com peso leve e seque à sombra com vento por 5 a 15 dias.',
    'Está pronta quando fica âmbar e firme.'],
  rende: 'É a BOTTARGA, o "caviar brasileiro". Produzida no litoral catarinense e exportada pra EUA, Japão, União Europeia e Taiwan, a cerca de R$ 500 o quilo. É o produto de maior valor de todo este catálogo — e a ova só se captura em maio e junho.',
  guarda: 'Meses refrigerada, envolta em cera ou a vácuo.',
  cuidado: 'Membrana rompida estraga a peça inteira. É trabalho de mão paciente.'
});

add('Tainha escalada', {
  ing: ['Tainha inteira, fresca', 'Sal grosso', 'Sol forte e vento — não tem substituto'],
  passos: ['Escalar quer dizer ABRIR o peixe em duas partes pela espinha — o mesmo gesto do bacalhau, que os açorianos trouxeram.',
    'Tire as vísceras (guarde a ova: ela vale mais que o peixe) e lave.',
    'Salgue por dentro com sal grosso, generosamente.',
    'Estenda ao sol num dia de sol forte — precisa de um dia inteiro de sol de verdade. Recolha antes do sereno.',
    'Está no ponto quando a carne firma e a superfície fica seca ao toque.',
    'Serve assada na brasa, com pirão.'],
  rende: 'É ESTA a técnica documentada como tradição açoriana de Santa Catarina — salga e secagem ao sol, não defumação. Antes da geladeira, era assim que a safra de maio a julho virava comida o ano inteiro.',
  guarda: 'Bem seca e salgada, semanas em lugar arejado. Dessalgar antes de usar.',
  cuidado: 'Sem um dia de sol forte o peixe não atinge a consistência e estraga. Dia nublado: não escale.'
});

/* ═══ CONSERVAS ═══ */
add('Peixe em escabeche', {
  ing: ['1 kg de peixe em postas', 'Farinha pra empanar', 'Óleo pra fritar',
        '500 ml de vinagre + 250 ml de água', 'Cebola, cenoura, alho, louro, pimenta'],
  passos: ['Frite as postas levemente empanadas e reserve.',
    'Refogue os legumes e junte vinagre e água; ferva 5 min.',
    'Alterne peixe e legumes no vidro esterilizado e cubra com o líquido quente.',
    'Feche e deixe curar 3 dias antes de comer.'],
  rende: 'Guarda a fritura do dia. (Técnica ibérica; não achei fonte que comprove escabeche especificamente açoriano de SC.)',
  guarda: '60 a 90 dias refrigerado.',
  cuidado: BOTULISMO
});
add('Tainha em conserva', {
  ing: ['Tainha cozida ou defumada em lascas', 'Azeite ou óleo', 'Vinagre',
        'Alho, louro, pimenta'],
  passos: ['Cozinhe ou defume a tainha e desfie em lascas grandes.',
    'Acidifique: 1 parte de vinagre pra 3 de óleo, temperada.',
    'Envase em vidro esterilizado e cubra por completo com o líquido.',
    'Não deixe lasca fora do líquido — é ali que estraga.'],
  rende: 'Guarda a safra inteira, que dura poucas semanas por ano.',
  guarda: '90 dias refrigerada.',
  cuidado: BOTULISMO
});
add('Berbigão em conserva', {
  ing: ['Berbigão limpo e cozido', 'Vinagre branco', 'Azeite', 'Alho, salsinha, pimenta'],
  passos: ['Deixe o berbigão em água salgada por 2 h pra soltar areia. Troque a água 2 vezes.',
    'Cozinhe até abrir e retire da concha.',
    'Ferva rapidamente em vinagre temperado.',
    'Envase coberto de azeite.'],
  rende: 'Marisco da maré baixa virando produto de prateleira.',
  guarda: '60 dias refrigerado.',
  cuidado: 'Coleta de molusco tem época e área permitida — confira antes. Marisco de água contaminada não tem conserva que salve. ' + BOTULISMO
});
add('Mexilhão ao vinagrete', {
  ing: ['Mexilhão cozido e limpo', 'Vinagre, azeite', 'Cebola roxa, pimentão, salsinha'],
  passos: ['Cozinhe no vapor até abrir; descarte os que não abrirem.',
    'Misture com o vinagrete bem ácido.',
    'Envase coberto e refrigere.'],
  rende: 'Do costão direto pro vidro.',
  guarda: '30 dias refrigerado.',
  cuidado: 'Mexilhão que não abriu no cozimento estava morto antes — fora. ' + BOTULISMO
});
add('Siri desfiado', {
  ing: ['Siri cozido', 'Limão', 'Sal'],
  passos: ['Cozinhe o siri em água salgada 15 min.',
    'Catar a carne é o trabalho — é aqui que a mão de obra junta faz diferença.',
    'Tempere levemente com limão e envase em vidro esterilizado, coberto.',
    'Refrigere de imediato.'],
  rende: 'Trabalhoso e caro no mercado — justifica o mutirão.',
  guarda: '5 dias refrigerado; congelado 3 meses.',
  cuidado: 'Carne de siri é altamente perecível. Não improvise prateleira com ela.'
});
add('Palmito em conserva', {
  ing: ['Palmito de manejo legalizado (pupunha ou juçara com licença)', 'Água, sal',
        'Ácido cítrico ou vinagre até pH < 4,5'],
  passos: ['Corte e ferva o palmito em água acidulada por 20 min.',
    'Envase quente em vidro esterilizado com a salmoura acidificada.',
    'Feche e faça banho-maria de 30 min.',
    'Meça o pH do líquido depois de frio. Acima de 4,5, não vende.'],
  rende: 'Alto valor — e alto risco se malfeito.',
  guarda: '12 meses fechado.',
  cuidado: 'Palmito é a conserva que mais matou por botulismo no Brasil. Se não tiver medidor de pH, NÃO faça pra vender. Palmito juçara sem licença é crime ambiental.'
});
add('Pepino e cebolinha', {
  ing: ['Pepino pequeno ou cebolinha em conserva', '500 ml vinagre + 250 ml água',
        'Sal, açúcar, endro, mostarda em grão'],
  passos: ['Lave e deixe de molho em água gelada 2 h pra ficar crocante.',
    'Ferva o líquido com os temperos.',
    'Envase os legumes crus e cubra com o líquido fervente.',
    'Feche e deixe 15 dias antes de abrir.'],
  rende: 'O que sobra da horta de quintal.',
  guarda: '12 meses fechado; 30 dias depois de aberto, na geladeira.',
  cuidado: VIDRO
});
add('Pimenta em conserva', {
  ing: ['Pimenta biquinho, dedo-de-moça ou malagueta', 'Vinagre', 'Alho, sal, açúcar'],
  passos: ['Lave e fure cada pimenta com garfo (senão ela boia e murcha).',
    'Ferva o vinagre temperado.',
    'Envase e cubra as pimentas por completo.',
    'Espere 20 dias antes de vender.'],
  rende: 'Alta acidez natural — das conservas mais seguras.',
  guarda: '12 meses fechado.',
  cuidado: 'Use luva. Pimenta na mão vira pimenta no olho.'
});
add('Antepasto de berinjela', {
  ing: ['Berinjela em cubos', 'Vinagre, azeite', 'Alho, orégano, pimenta', 'Sal'],
  passos: ['Salgue a berinjela e deixe escorrer 1 h pra tirar o amargo.',
    'Cozinhe rápido no vinagre e escorra.',
    'Tempere com azeite e alho, envase coberto de óleo.'],
  rende: 'De alto giro em feira.',
  guarda: '60 dias refrigerado.',
  cuidado: 'Alho cru em óleo é fonte clássica de botulismo. Alho fervido no vinagre antes, sempre. ' + BOTULISMO
});
add('Molho de tomate caseiro', {
  ing: ['Tomate maduro', 'Sal', 'Manjericão', 'Ácido cítrico ou suco de limão'],
  passos: ['Escalde e descasque os tomates.',
    'Cozinhe até reduzir à metade.',
    'Acidifique com 1 colher de chá de suco de limão por vidro de 500 ml.',
    'Envase quente e faça banho-maria de 35 min.'],
  rende: 'Safra de tomate não espera — ou processa ou perde.',
  guarda: '12 meses fechado.',
  cuidado: 'Tomate é limítrofe em acidez. A acidificação não é opcional. ' + BOTULISMO
});

/* ═══ GELEIAS ═══ */
function geleia(nome, fruta, obs, prop) {
  add(nome, {
    ing: ['1 kg de ' + fruta, (prop || '600 a 700 g') + ' de açúcar',
          'Suco de 1 limão', 'Água só se a fruta for pouco suculenta'],
    passos: ['Limpe a fruta e pese depois de limpa — a conta é sobre a fruta pronta.',
      'Cozinhe com o açúcar em fogo médio, mexendo, até desmanchar.',
      'Junte o limão (dá pectina e segura a cor).',
      'Teste o ponto: pingue no prato frio; se enrugar ao empurrar com o dedo, está pronta.',
      'Envase fervendo em vidro esterilizado e vire de boca pra baixo por 5 min.'],
    rende: '1 kg de fruta rende cerca de 3 potes de 250 g.',
    guarda: '12 meses fechado; 30 dias aberto na geladeira.',
    cuidado: obs || VIDRO
  });
}
geleia('Goiaba','goiaba madura sem casca','A goiabada de corte é a mesma receita cozida mais tempo, até o ponto de talhar.');
geleia('Butiá','polpa de butiá','Butiá é fibroso: passe na peneira depois de cozido. Coleta de nativa exige respeitar a época e deixar fruto pro bicho.');
geleia('Araçá','araçá inteiro','Sabor forte e ácido — aceita menos açúcar que a goiaba.','550 g');
geleia('Pitanga','pitanga sem caroço','Pitanga escurece rápido: cozinhe no mesmo dia da colheita.');
geleia('Guabiroba','guabiroba','Nativa do Sul, quase não se acha à venda — é aí que está o valor.');
geleia('Uvaia','uvaia','Muito ácida e aromática. Vai bem com pouco açúcar e nada de água.','700 g');
geleia('Maracujá','polpa de maracujá','A casca branca vira doce em calda separado — dois produtos de uma fruta.');
geleia('Banana','banana madura amassada','A banana passada demais é a melhor pra geleia. Junte canela se quiser.','500 g');
geleia('Amora','amora','Mancha tudo. Use avental e vidro escuro se puder.');
geleia('Jabuticaba','jabuticaba com casca','A casca dá cor e pectina. Coe antes de envasar se quiser geleia lisa.');
geleia('Pimenta com fruta','fruta (goiaba, abacaxi ou manga) + 2 pimentas dedo-de-moça sem semente',
  'Agridoce vende bem mais caro que a geleia comum. Comece com pouca pimenta e ajuste.');
geleia('Laranja amarga','casca de laranja fervida 3 vezes (trocando a água) + polpa',
  'A fervura tripla tira o amargo excessivo. É a marmelada inglesa.','800 g');

/* ═══ DOCES E COMPOTAS ═══ */
add('Bananada', {
  ing: ['1 kg de banana madura', '400 g de açúcar', 'Suco de 1 limão', 'Canela opcional'],
  passos: ['Amasse a banana e leve ao tacho com o açúcar.',
    'Mexa sem parar em fogo médio — bananada gruda e queima fácil.',
    'Está no ponto quando desprende do fundo e dá pra ver o rastro da colher.',
    'Despeje em forma untada, deixe firmar e corte em barras.'],
  rende: '1 kg de banana vira cerca de 1,1 kg de bananada.',
  guarda: 'Embalada individual, 60 dias em lugar fresco.',
  cuidado: 'Mexer é o trabalho todo. Não dá pra sair de perto do tacho.'
});
add('Doce de abóbora', {
  ing: ['1 kg de abóbora madura em cubos', '700 g de açúcar', 'Cravo e canela',
        'Coco ralado (opcional)'],
  passos: ['Cozinhe a abóbora com pouca água até amolecer.',
    'Junte açúcar e especiarias e cozinhe até apurar.',
    'Pra doce em pedaço, não mexa muito; pra cremoso, mexa até desmanchar.',
    'Envase quente.'],
  rende: 'Abóbora é barata e dá muito volume.',
  guarda: '6 meses fechado.',
  cuidado: VIDRO
});
add('Figo em calda', {
  ing: ['1 kg de figo verde', '800 g de açúcar', '1 L de água', 'Cravo'],
  passos: ['Risque a casca do figo e deixe de molho em água com cal ou bicarbonato por 12 h — é o que dá a textura.',
    'Ferva em água limpa 2 vezes, trocando a água.',
    'Cozinhe na calda de açúcar por cerca de 2 h, em fogo baixo, até ficar translúcido.',
    'Envase com a calda cobrindo tudo.'],
  rende: 'Produto de alto valor e de presente.',
  guarda: '12 meses fechado.',
  cuidado: 'É doce de paciência: 2 dias de processo. Não tem atalho.'
});
add('Pêssego em calda', {
  ing: ['1 kg de pêssego firme', '600 g de açúcar', '1 L de água', 'Suco de limão'],
  passos: ['Escalde e descasque os pêssegos; corte ao meio e tire o caroço.',
    'Mergulhe em água com limão pra não escurecer.',
    'Cozinhe na calda por 15 min.',
    'Envase quente e faça banho-maria de 20 min.'],
  rende: 'Safra curta, prateleira longa.',
  guarda: '12 meses fechado.',
  cuidado: VIDRO
});
add('Marmelada', {
  ing: ['1 kg de marmelo', '800 g de açúcar', 'Água'],
  passos: ['Cozinhe o marmelo com casca até amolecer e passe pela peneira.',
    'Volte ao tacho com o açúcar e cozinhe mexendo até escurecer e soltar do fundo.',
    'Despeje em forma e deixe firmar por 24 h.'],
  rende: 'O doce mais tradicional da colônia.',
  guarda: '6 meses embalada.',
  cuidado: 'Marmelo tem muita pectina: o ponto chega mais rápido do que você espera.'
});
add('Doce de leite', {
  ing: ['2 L de leite integral', '500 g de açúcar', '1 pitada de bicarbonato'],
  passos: ['Leve tudo ao tacho em fogo médio, mexendo sempre.',
    'O bicarbonato ajuda a escurecer e a não talhar.',
    'Cozinhe por 1h30 a 2h, até o ponto de espelho no fundo do tacho.',
    'Envase quente.'],
  rende: '2 L de leite viram cerca de 700 g.',
  guarda: '90 dias fechado.',
  cuidado: 'Leite tem que ser de origem conhecida e pasteurizado.'
});
add('Cocada', {
  ing: ['1 coco seco ralado', '500 g de açúcar', '200 ml de água', 'Leite condensado (versão cremosa)'],
  passos: ['Faça a calda de açúcar e água até fio médio.',
    'Junte o coco e cozinhe mexendo até soltar do fundo.',
    'Pra cocada branca, tire antes de dourar; pra queimada, deixe caramelizar.',
    'Modele com colher em superfície untada.'],
  rende: 'Custo baixo e giro rápido.',
  guarda: '30 dias embalada individual.',
  cuidado: 'Coco fresco ralado estraga em 2 dias. Use no mesmo dia ou congele.'
});
add('Bala de banana', {
  ing: ['1 kg de banana bem madura', '500 g de açúcar', 'Suco de limão', 'Açúcar cristal pra empanar'],
  passos: ['Cozinhe banana e açúcar até o ponto de bala (mais firme que bananada).',
    'Espalhe em camada de 1 cm e deixe secar por 12 h.',
    'Corte em quadrados e passe no açúcar cristal.',
    'Embale em papel-manteiga individual.'],
  rende: 'Vende muito bem pra turista, e cabe no bolso.',
  guarda: '60 dias.',
  cuidado: 'Ponto errado = bala que gruda no papel. Teste um pedaço antes de cortar tudo.'
});
add('Doce de mamão verde', {
  ing: ['1 kg de mamão verde ralado grosso', '700 g de açúcar', 'Cravo', 'Bicarbonato ou cal pra o molho'],
  passos: ['Descasque, rale e deixe de molho em água com bicarbonato por 4 h.',
    'Lave muito bem, várias águas.',
    'Cozinhe com açúcar e cravo até ficar translúcido e em fio.',
    'Envase quente.'],
  rende: 'Usa o mamão que caiu verde ou que não vai amadurecer.',
  guarda: '12 meses fechado.',
  cuidado: 'Lave o bicarbonato com muita água. Resíduo deixa gosto de sabão.'
});
add('Cristalizados', {
  ing: ['Casca de laranja ou gengibre em tiras', 'Açúcar em peso igual ao da fruta', 'Água',
        'Açúcar cristal pra finalizar'],
  passos: ['Ferva as cascas 3 vezes trocando a água (tira o amargo).',
    'Cozinhe na calda até ficarem translúcidas.',
    'Escorra e deixe secar em grade por 24 h.',
    'Passe no açúcar cristal.'],
  rende: 'Casca que ia pro lixo virando produto de confeitaria.',
  guarda: '90 dias em pote seco.',
  cuidado: 'Se guardar úmido, mofa. Seque de verdade antes de embalar.'
});

/* ═══ VINHOS E FERMENTADOS ═══ */
function fermentado(nome, base, obs, dias) {
  add(nome, {
    ing: ['5 kg de ' + base, 'Açúcar conforme a doçura da fruta (mosto a 20-24 °Brix)',
          'Levedura de vinho (não use fermento de pão)', 'Água filtrada sem cloro'],
    passos: ['Sanitize TUDO: balde, mangueira, garrafão. Fermentação suja vira vinagre.',
      'Prepare o mosto, meça o açúcar e ajuste.',
      'Inocule a levedura e feche com airlock (válvula de ar).',
      'Fermente ' + (dias || '7 a 14 dias') + ' entre 18 e 24 °C, até parar de borbulhar.',
      'Trasfegue pra outro recipiente, deixe clarear, e só então engarrafe.'],
    rende: '5 kg de fruta rendem cerca de 4 a 5 litros.',
    guarda: 'Engarrafado e ao escuro, melhora com o tempo.',
    cuidado: obs ? obs + ' ' + MAPA : MAPA
  });
}
fermentado('Vinho de uva','uva madura','Uva da região, se houver parreira.');
fermentado('Vinho de laranja','suco de laranja fresco','Tradicional no interior catarinense. Nunca use suco pasteurizado de caixa.');
fermentado('Vinho de banana','banana madura amassada e coada','Banana dá muito sedimento: coe duas vezes.');
fermentado('Vinho de jabuticaba','jabuticaba amassada com casca','A casca dá cor e tanino. Safra curta e concentrada.','10 a 20 dias');
add('Hidromel', {
  ing: ['1 parte de mel puro pra 3 de água', 'Levedura de vinho', 'Nutriente de levedura'],
  passos: ['Dissolva o mel na água morna (não ferva — mata o aroma).',
    'Inocule a levedura com o mosto já frio.',
    'Fermente 3 a 6 semanas com airlock.',
    'Trasfegue, deixe maturar meses. Quanto mais espera, melhor.'],
  rende: 'A bebida fermentada mais antiga que existe.',
  guarda: 'Anos, engarrafado.',
  cuidado: 'Precisa de apicultor parceiro com mel de origem conhecida. ' + MAPA
});
add('Vinagre de fruta', {
  ing: ['Fermentado alcoólico que não ficou bom, ou fruta madura', 'Mãe-de-vinagre ou vinagre não pasteurizado',
        'Pano e elástico'],
  passos: ['Deixe o líquido alcoólico num pote de boca larga, coberto só com pano.',
    'Junte a mãe-de-vinagre.',
    'Deixe em lugar escuro e arejado por 1 a 3 meses.',
    'Coe, engarrafe e pasteurize a 70 °C por 10 min.'],
  rende: 'É a rede de segurança do galpão: fermentado que deu errado não se perde, vira vinagre.',
  guarda: 'Anos.',
  cuidado: 'Vinagre é alimento, não bebida alcoólica — não cai na exigência do MAPA para bebidas.'
});
add('Kombucha', {
  ing: ['Chá preto ou verde', 'Açúcar', 'Scoby (colônia)', 'Kombucha pronta como iniciador'],
  passos: ['Faça o chá adoçado e espere esfriar completamente.',
    'Junte o scoby e o iniciador.',
    'Cubra com pano e fermente 7 a 12 dias.',
    'Engarrafe com fruta pra segunda fermentação, 2 a 3 dias.'],
  rende: 'Custo de entrada baixíssimo.',
  guarda: 'Refrigerada, 30 dias.',
  cuidado: 'Na segunda fermentação a garrafa cria pressão. Use garrafa própria e alivie todo dia, senão explode.'
});
add('Sidra de maçã', {
  ing: ['Suco de maçã fresco', 'Levedura de sidra'],
  passos: ['Extraia o suco e sanitize tudo.',
    'Inocule a levedura e feche com airlock.',
    'Fermente 2 a 3 semanas a 18 °C.',
    'Trasfegue e engarrafe.'],
  rende: 'Se houver pomar por perto.',
  guarda: 'Meses refrigerada.',
  cuidado: MAPA
});

/* ═══ LICORES ═══ */
function licor(nome, base, obs, descanso) {
  add(nome, {
    ing: ['500 g de ' + base, '1 L de cachaça ou álcool de cereais',
          'Calda: 500 g de açúcar em 500 ml de água'],
    passos: ['Ponha a base e o álcool num vidro grande e feche.',
      'Deixe em lugar escuro por ' + (descanso || '20 a 30 dias'), 'agitando a cada 2 dias.',
      'Coe em pano fino, sem espremer (senão turva).',
      'Junte a calda já fria, prove e ajuste. Engarrafe.'],
    rende: '1 L de álcool rende cerca de 1,4 L de licor pronto.',
    guarda: 'Anos. Licor melhora parado.',
    cuidado: obs ? obs + ' ' + MAPA : MAPA
  });
}
licor('Licor de butiá','butiá maduro','O mais típico do litoral do Sul — e o que menos se acha à venda.','40 dias');
licor('Licor de jabuticaba','jabuticaba amassada','Escuro e doce, vende como presente.','30 dias');
licor('Licor de gengibre','gengibre fatiado fino','Esquenta — vende no inverno. Use menos base do que nas frutas.','15 dias');
licor('Licor de café','café torrado em grão','Usa borra e café de segunda. Não moa: grão inteiro extrai mais limpo.','20 dias');
licor('Licor de maracujá','polpa de maracujá','Fica cremoso se juntar leite condensado na calda.','20 dias');
licor('Licor de banana','banana madura em rodelas','Fruta abundante virando produto caro.','25 dias');
licor('Licor de laranja','casca de laranja sem a parte branca','A parte branca amarga. Só a casca colorida.','21 dias');
add('Cachaça envelhecida', {
  ing: ['Cachaça de alambique parceiro', 'Tonel ou aparas de madeira (carvalho, amburana, bálsamo)'],
  passos: ['Escolha a madeira — ela é que dá o sabor.',
    'Deixe descansar de 6 meses a 3 anos, provando periodicamente.',
    'Filtre e engarrafe.'],
  rende: 'O galpão não destila: envelhece e engarrafa com marca própria.',
  guarda: 'Anos.',
  cuidado: 'Destilar sem registro é crime. Aqui a associação compra de alambique legalizado e agrega valor. ' + MAPA
});
add('Licor de leite', {
  ing: ['1 L de leite', '1 L de cachaça', '1 kg de açúcar', '3 limões cortados com casca',
        'Fava de baunilha'],
  passos: ['Misture tudo num vidro grande, com o limão em pedaços.',
    'Deixe 20 dias no escuro, agitando de vez em quando. O leite vai talhar — é assim mesmo.',
    'Coe em pano fino várias vezes até o líquido sair claro.',
    'Engarrafe.'],
  rende: 'Receita de avó. Sai translúcido e surpreende quem prova.',
  guarda: 'Anos.',
  cuidado: 'Coar bem é o segredo. Pressa aqui deixa o licor turvo. ' + MAPA
});

/* ═══ CERVEJAS ═══ */
function cerveja(nome, adjunto, obs) {
  add(nome, {
    ing: ['5 kg de malte de cevada', 'Lúpulo conforme o estilo', 'Levedura cervejeira',
          '25 L de água', adjunto],
    passos: ['Mostura: malte moído em água a 66 °C por 60 min.',
      'Filtre o mosto e ferva 60 min, adicionando lúpulo.',
      'Resfrie rápido até 20 °C — esse é o momento de maior risco de contaminação.',
      'Inocule a levedura e fermente 7 a 14 dias.',
      'Adicione ' + adjunto.toLowerCase() + ' na fermentação secundária.',
      'Maturação e envase.'],
    rende: 'Cerca de 20 L por brassagem.',
    guarda: 'Refrigerada, 6 meses.',
    cuidado: (obs ? obs + ' ' : '') + 'É a que mais exige equipamento e registro. ' + MAPA
  });
}
cerveja('Com araçá','2 kg de polpa de araçá','Fruta nativa que quase ninguém usa em cerveja — é aí que está o diferencial que não se copia.');
cerveja('Com butiá','2 kg de polpa de butiá','Sabor que só existe aqui.');
cerveja('Com mel local','1 kg de mel','Junte o mel no fim da fervura pra não perder o aroma.');
cerveja('Com gengibre','200 g de gengibre fresco ralado','Picante e leve, boa pro verão.');
cerveja('Puro malte da casa','Nada — só malte, lúpulo, água e levedura','A base. Quem não domina a puro malte não domina as com fruta.');
cerveja('Com maracujá','1,5 kg de polpa de maracujá','Ácida — agrada quem não gosta de cerveja.');

/* ═══ PANIFICAÇÃO ═══ */
add('Pão caseiro', {
  ing: ['1 kg de farinha de trigo', '600 ml de água morna', '20 g de sal', '10 g de fermento biológico seco',
        '30 g de açúcar', '50 g de banha ou manteiga'],
  passos: ['Misture tudo e sove por 10 min até a massa ficar lisa.',
    'Deixe crescer coberta por 1 h, até dobrar.',
    'Modele os pães, ponha nas formas e deixe crescer mais 40 min.',
    'Asse a 200 °C por 30 a 35 min.'],
  rende: '4 pães de 500 g.',
  guarda: '3 dias. Congelado, 60 dias.',
  cuidado: 'Pão não guarda — é o que mantém o galpão aberto entre uma safra e outra, com giro diário.'
});
add('Cuca alemã', {
  ing: ['Massa de pão doce', 'Fruta da estação (banana, uva, maçã)',
        'Farofa: 100 g farinha + 80 g açúcar + 60 g manteiga'],
  passos: ['Abra a massa doce em assadeira e deixe crescer 30 min.',
    'Cubra com a fruta fatiada.',
    'Espalhe a farofa por cima com a mão.',
    'Asse a 180 °C por 35 min.'],
  rende: '1 assadeira grande.',
  guarda: '4 dias.',
  cuidado: 'Tradição do Sul — vende no fim de semana e casa com a fruta que sobrou da geleia.'
});
add('Rosca de polvilho', {
  ing: ['500 g de polvilho azedo', '250 ml de água', '100 ml de óleo', '2 ovos', 'Sal'],
  passos: ['Escalde o polvilho com a água e o óleo fervendo.',
    'Deixe amornar e junte os ovos, sovando bem.',
    'Modele as roscas e asse a 180 °C até dourar e secar.'],
  rende: 'Longa validade — boa pra vender fora do bairro.',
  guarda: '30 dias em saco bem fechado.',
  cuidado: 'Não é dos que estragam, é dos que amolecem. Embale seco.'
});
add('Biscoito amanteigado', {
  ing: ['500 g de farinha', '250 g de manteiga', '150 g de açúcar', '1 ovo', 'Baunilha'],
  passos: ['Bata manteiga e açúcar até esbranquiçar.',
    'Junte o ovo e a farinha, sem sovar.',
    'Modele com saco de confeitar ou boleador.',
    'Asse a 170 °C por 15 min.'],
  rende: 'Presente e lembrança de turista — embalagem bonita dobra o preço.',
  guarda: '30 dias em lata.',
  cuidado: 'Manteiga de verdade faz diferença. Margarina muda o produto.'
});
add('Pão de banana', {
  ing: ['3 bananas bem maduras amassadas', '300 g de farinha', '150 g de açúcar', '2 ovos',
        '100 ml de óleo', '1 colher de fermento em pó', 'Canela'],
  passos: ['Misture os líquidos com a banana.',
    'Junte os secos e mexa só até incorporar.',
    'Asse em forma de bolo inglês a 180 °C por 45 min.'],
  rende: 'Usa a banana que passou do ponto de vender.',
  guarda: '5 dias.',
  cuidado: 'Quanto mais preta a banana, melhor o pão. Não descarte banana madura.'
});
add('Broa de fubá', {
  ing: ['500 g de fubá', '250 g de farinha', '200 g de açúcar', '200 ml de leite', '2 ovos',
        '100 g de manteiga', 'Erva-doce', 'Fermento'],
  passos: ['Misture os secos, junte os líquidos e a manteiga derretida.',
    'Modele as broas com a mão molhada.',
    'Asse a 180 °C por 30 min.'],
  rende: 'Barata e de giro rápido.',
  guarda: '5 dias.',
  cuidado: 'Erva-doce é o que faz ser broa. Não pule.'
});
add('Massa fresca', {
  ing: ['1 kg de farinha', '10 ovos', 'Sal', 'Semolina pra polvilhar'],
  passos: ['Faça a massa, sove 10 min e descanse 30 min coberta.',
    'Abra em cilindro e corte no formato desejado.',
    'Seque levemente polvilhada em semolina.',
    'Embale refrigerada ou seque por completo.'],
  rende: 'Se houver quem faça, é produto de todo domingo.',
  guarda: 'Fresca: 3 dias refrigerada. Seca: 6 meses.',
  cuidado: 'Massa fresca com ovo é perecível. Prateleira só a seca.'
});

/* ═══ ERVAS, TEMPEROS E CHÁS ═══ */
add('Sal temperado', {
  ing: ['1 kg de sal grosso ou marinho', 'Ervas secas da região (alecrim, orégano, salsa)',
        'Alho desidratado', 'Pimenta'],
  passos: ['Seque bem as ervas (forno a 60 °C ou à sombra com vento).',
    'Triture o sal com as ervas no processador, em pulsos.',
    'Peneire pra uniformizar.',
    'Envase em pote seco e vede.'],
  rende: 'O produto mais fácil do catálogo inteiro — dá pra começar num sábado.',
  guarda: '12 meses.',
  cuidado: 'Erva mal seca deixa o sal empedrar e mofar. Seque mais do que parece necessário.'
});
add('Ervas secas', {
  ing: ['Ervas frescas do quintal: orégano, alecrim, manjericão, tomilho'],
  passos: ['Colha de manhã, depois do orvalho secar.',
    'Lave e seque bem antes de desidratar.',
    'Seque à sombra pendurada, ou em forno a 50-60 °C com a porta entreaberta.',
    'Debulhe as folhas e embale em vidro escuro.'],
  rende: '1 kg fresco vira cerca de 150 g seco.',
  guarda: '12 meses ao abrigo da luz.',
  cuidado: 'Sol direto mata o aroma. Sombra e vento.'
});
add('Chá de erva nativa', {
  ing: ['Carqueja, capim-limão, erva-doce, cidreira ou folha de goiabeira'],
  passos: ['Colha respeitando a planta — nunca arranque a raiz.',
    'Lave, seque à sombra por 3 a 7 dias.',
    'Corte no tamanho de infusão e embale.',
    'Rotule com o nome popular E o nome científico.'],
  rende: 'Custo quase zero. Valor de mercado alto pra nativa.',
  guarda: '12 meses.',
  cuidado: 'Não faça alegação de cura na embalagem — isso é regulado pela Anvisa e dá multa. Venda como chá, não como remédio.'
});
add('Pimenta em pó', {
  ing: ['Pimenta madura', 'Sal (opcional)'],
  passos: ['Seque as pimentas inteiras em forno baixo ou desidratador.',
    'Triture com o pé da janela aberta — o pó irrita muito.',
    'Peneire e envase.'],
  rende: 'Aproveita a pimenta que sobrou da conserva.',
  guarda: '12 meses.',
  cuidado: 'Use máscara e luva ao triturar. Pó de pimenta no ar é sério.'
});
add('Tempero de peixe', {
  ing: ['Sal', 'Alho e cebola desidratados', 'Colorau', 'Coentro seco', 'Pimenta-do-reino', 'Louro moído'],
  passos: ['Desidrate os frescos e triture separado.',
    'Misture nas proporções que a comunidade já usa — a receita é o saber local.',
    'Peneire e envase.',
    'Rotule com o nome da casa.'],
  rende: 'É o produto que carrega a identidade do lugar.',
  guarda: '12 meses.',
  cuidado: 'Anote a proporção. Tempero que muda de gosto a cada lote perde cliente.'
});
add('Óleo aromatizado', {
  ing: ['Azeite ou óleo de boa qualidade', 'Alho, alecrim, pimenta'],
  passos: ['Aqueça o óleo a 80 °C com os aromáticos SECOS por 10 min.',
    'Esfrie e coe.',
    'Envase em vidro escuro.'],
  rende: 'Agrega valor a um insumo simples.',
  guarda: '90 dias ao abrigo da luz.',
  cuidado: 'NUNCA use alho ou erva FRESCA em óleo à temperatura ambiente: é fonte clássica de botulismo. Só desidratado, e refrigerado depois de aberto.'
});
add('Sal de algas', {
  ing: ['Alga marinha de coleta permitida', 'Sal marinho'],
  passos: ['Lave a alga em água doce pra tirar areia.',
    'Seque por completo e triture.',
    'Misture com o sal na proporção 1:4.'],
  rende: 'Produto raro e de alto valor.',
  guarda: '12 meses seco.',
  cuidado: 'Coleta de alga exige autorização ambiental e área livre de contaminação. Confirme antes de colher.'
});

/* ═══ ARTESANATO E REDEIRA ═══ */
add('Rede de pesca e tarrafa', {
  ing: ['Fio de náilon ou multifilamento', 'Agulha de rede (lançadeira)', 'Malheiro (molde da malha)',
        'Chumbada e boia'],
  passos: ['Escolha a malha conforme o peixe — malha errada pega peixe fora do tamanho, e isso é multa.',
    'Monte a entralhação com o malheiro pra manter a malha uniforme.',
    'Trabalhe em fileiras, sempre no mesmo sentido.',
    'Monte a tralha superior com boia e a inferior com chumbo.'],
  rende: 'Uma tarrafa boa leva semanas — e por isso vale o que vale.',
  guarda: 'Guardada seca e à sombra, dura anos.',
  cuidado: 'Este é o saber que mais corre risco de se perder na Barra. Registrar em vídeo com quem sabe é urgente — e é projeto de patrimônio imaterial financiável.'
});
add('Rede de dormir', {
  ing: ['Fio de algodão cru grosso', 'Agulha de rede', 'Vara pra tensionar'],
  passos: ['Mesma técnica da rede de pesca, com malha muito mais aberta.',
    'Trabalhe a punho nas pontas, reforçando bem.',
    'Monte o varandado nas laterais.'],
  rende: 'A mesma mão, outro produto — e este vende pra turista.',
  guarda: 'Anos.',
  cuidado: 'Algodão cru encolhe na primeira lavagem. Faça maior do que a medida final.'
});
add('Reparo de rede', {
  ing: ['Fio compatível com a rede', 'Agulha de rede'],
  passos: ['Identifique o rasgo e corte as malhas soltas até deixar um buraco limpo, de lados regulares.',
    'Refaça malha por malha, seguindo a orientação original.',
    'Feche sempre com o mesmo nó da rede.'],
  rende: 'Serviço contínuo, receita todo mês — não depende de safra.',
  guarda: '—',
  cuidado: 'É o serviço que sustenta a redeira entre uma encomenda e outra. Cobrar por malha reparada é o mais justo.'
});
add('Cestaria', {
  ing: ['Fibra natural da região: taquara, cipó, palha de bananeira, junco'],
  passos: ['Colha e trate a fibra: descasque, corte em tiras e deixe secar.',
    'Amoleça em água antes de trançar.',
    'Monte a base e suba as laterais.',
    'Arremate a borda com trança fechada.'],
  rende: 'Matéria-prima de custo zero.',
  guarda: 'Anos em lugar seco.',
  cuidado: 'Colheita de fibra nativa tem regra ambiental. Taquara e bananeira são livres; cipó de mata nativa, não.'
});
add('Tapete de retalho', {
  ing: ['Retalho de tecido de costureira da região', 'Agulha grossa ou tear simples'],
  passos: ['Corte os retalhos em tiras de largura uniforme.',
    'Emende as tiras e enrole em novelo.',
    'Trance ou teça em espiral ou retangular.'],
  rende: 'Usa o que a costureira do bairro joga fora.',
  guarda: 'Anos.',
  cuidado: 'Lave os retalhos antes. Tecido novo solta tinta.'
});
add('Bordado e crochê', {
  ing: ['Linha de algodão', 'Agulha de crochê ou de bordado', 'Tecido base'],
  passos: ['Defina um padrão que seja identidade da comunidade — motivo de peixe, onda, barco.',
    'Trabalho de casa, entrega no balcão do galpão.',
    'Etiquete com o nome de quem fez.'],
  rende: 'Trabalho que cabe no tempo de quem cuida da casa.',
  guarda: '—',
  cuidado: 'Padrão próprio é o que diferencia de crochê de qualquer lugar. Vale desenhar o motivo junto.'
});
add('Boneca de pano', {
  ing: ['Retalho de algodão', 'Enchimento (fibra ou retalho picado)', 'Linha e agulha'],
  passos: ['Corte o molde e costure do avesso, deixando abertura.',
    'Vire e encha bem firme.',
    'Feche com ponto invisível e borde o rosto.'],
  rende: 'Presente e lembrança.',
  guarda: '—',
  cuidado: 'Se for pra criança pequena: sem botão, sem olho de plástico costurado — só bordado.'
});
add('Madeira de deriva', {
  ing: ['Madeira que o mar trouxe', 'Lixa', 'Óleo ou verniz marítimo'],
  passos: ['Deixe secar por semanas antes de trabalhar.',
    'Escove pra tirar sal e areia.',
    'Lixe respeitando a forma que o mar deu — não tente endireitar.',
    'Finalize com óleo.'],
  rende: 'Matéria-prima que chega sozinha na praia.',
  guarda: 'Anos.',
  cuidado: 'Madeira do mar vem cheia de sal — se não secar direito, racha depois de vendida.'
});
add('Escama de peixe', {
  ing: ['Escamas grandes (tainha, tilápia)', 'Água oxigenada ou limão pra clarear', 'Tinta e verniz',
        'Ferragem de bijuteria'],
  passos: ['Lave as escamas em água corrente e ferva rápido pra higienizar.',
    'Deixe de molho pra clarear e seque prensada entre papéis.',
    'Corte, pinte e envernize.',
    'Monte brinco, colar ou aplicação.'],
  rende: 'Literalmente a sobra do beneficiamento virando bijuteria.',
  guarda: 'Anos.',
  cuidado: 'Escama mal higienizada cheira. Fervura rápida e secagem completa, sempre.'
});
add('Miniatura de baleeira', {
  ing: ['Madeira leve (cedro, pinho)', 'Formão e lixa', 'Tinta', 'Linha pra o cordame'],
  passos: ['Estude o barco de verdade — proporção errada estraga a peça.',
    'Esculpa o casco de um bloco só.',
    'Monte convés e mastro separados.',
    'Pinte nas cores dos barcos da comunidade.'],
  rende: 'O barco da terra virando peça de decoração — o item mais caro do balcão.',
  guarda: 'Anos.',
  cuidado: 'Fazer réplica de um barco existente pede autorização do dono. O barco é dele.'
});

root.VSReceitas = R;
})(window);
