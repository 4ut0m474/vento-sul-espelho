#!/usr/bin/env python3
"""
Versão priority: prioriza cidades turísticas do Sul que estão sem foto.
Filtra a query por uma WHITELIST hardcoded e ordena por essa whitelist.
Tipos: cidade, bairro, produtora.
Fonte: Wikimedia Commons (CC-licensed).
"""
import json
import time
import urllib.parse
import urllib.request
import sys
import re

SVC_KEY_FILE = "/home/erasto/.config/ventosul-supabase-service.key"
SUPA_URL = "https://vdrzndgkwdpibexjkyxi.supabase.co"
import os
MGMT_TOKEN = os.environ.get("SUPABASE_MGMT_TOKEN") or open(os.path.expanduser("~/.config/ventosul-mgmt.key")).read().strip()
PROJECT_REF = "vdrzndgkwdpibexjkyxi"

with open(SVC_KEY_FILE) as f:
    SVC_KEY = f.read().strip()

USER_AGENT = "VentoSulBot/1.0 (https://vento-sul.tech; eerb1976@gmail.com) python-urllib"

BAD_NAME_TOKENS = ["diagram", "map", "logo", "satellite", "satelite", "mapa",
                   "brasao", "brasão", "flag", "bandeira", "coat_of_arms",
                   "location_map", "locator", "infobox", "icon", "pin",
                   ".svg", ".pdf", ".tif", ".tiff", ".gif",
                   "protest", "manifestação", "manifestacao", "fire", "incendio", "incêndio",
                   "construction", "obra", "demolição", "demolicao",
                   "estacionamento", "parking lot", "google street",
                   # close-ups de pessoas — privacidade. Paisagens com gente de longe passam.
                   "selfie", "close-up", "closeup", "close up",
                   "portrait", "porträt", "retrato",
                   "headshot", "head shot", "face shot",
                   "groom", "bride", "wedding photo", "casamento",
                   "interview", "entrevista", "comício", "comicio"]
GOOD_NAME_TOKENS = ["aerial", "panorama", "view", "vista", "skyline",
                    "praça", "praca", "square",
                    "city", "cidade", "town"]
# Pesos cumulativos: foto que tem cores+natureza+longe leva o pacote completo (+125).

# 🌅 Cores fortes / entardecer / anoitecer / luzes / fogos — peso ALTO (+50)
COLOR_RICH_TOKENS = [
    "sunset", "sunrise", "golden hour", "blue hour",
    "twilight", "dusk", "dawn",
    "night", "nuit", "noche", "noite", "noturna", "noturno",
    "iluminada", "iluminado", "illuminated", "lit", "lit up", "lights",
    "luzes", "neon",
    "long exposure", "exposição longa",
    "fireworks", "fogos",
    "colorful", "colorido", "vivid", "vibrante",
    "bokeh",
]

# 🏞️ Natureza / paisagem / cachoeiras / mar / serra — peso ALTO (+35)
NATURE_LANDSCAPE_TOKENS = [
    "waterfall", "cachoeira", "falls", "cataratas", "salto",
    "canyon", "cânion", "canion",
    "mountain", "mountains", "montanha", "morro", "hills",
    "forest", "floresta", "mata atlântica", "mata atlantica",
    "river", "rio", "lake", "lago", "lagoa", "lagoon",
    "valley", "vale",
    "beach", "praia", "ocean", "oceano", "mar",
    "scenic", "scenery", "landscape", "paisagem", "natural",
    "trail", "trilha", "park", "parque",
    "cliff", "falésia", "rocha", "pedra",
    "garganta",
]

# 🛰️ Vistas de longe / aéreas / panorâmicas — peso ALTO (+40)
DISTANCE_VIEW_TOKENS = [
    "aerial", "drone", "from above", "vista aerea", "vista aérea",
    "panorama", "panoramic", "panorâmica", "panorâmico",
    "skyline", "horizonte",
    "viewpoint", "mirante", "lookout",
    "from afar", "from a distance", "vista de longe",
    "overview", "vista geral",
    "wide shot", "wide angle",
    "satellite view",  # cuidado: BAD_NAME tem "satellite" que vai bloquear satélite-mapa. Aqui o boost não dispara.
]

# 🏛️ Marcos / patrimônio histórico (peso médio +18)
LANDMARK_TOKENS = [
    "lighthouse", "farol",
    "iconic", "landmark",
    "monument", "monumento",
    "ruins", "ruínas", "ruinas",
    "catedral", "cathedral",
    "historic", "histórico",
    "museum", "museu",
]
# Tokens "comuns" — penaliza. Centro de cidade banal, rua, prédio comercial.
AVOID_TOKENS = [
    "street view", "google street view", "rua comum",
    "edifício comercial", "prédio comercial", "predio comercial",
    "supermercado", "supermarket", "shopping",
    "ônibus", "bus", "transit", "metro station",
    "comício", "comicio", "evento eleitoral", "feira livre"
]

# Topônimos concorrentes: títulos que contêm um destes são desclassificados
# (Canela=cidade RS x sobrenome de jogadora; Penha=SC x igreja RJ; etc)
BAD_GEO_TOKENS = [
    "portugal", "italia", "italy", "italian", "italiano",
    "spain", "españa", "espanha", "uruguay", "uruguai",
    "méxico", "mexico", "peru", "chile", "colombia", "venezuela",
    "argentina",
    "madeira", "açores", "acores", "azores", "terceira",
    "garda", "venezia", "venice", "florence", "firenze",
    "voleibol", "volleyball", "saque", "lacambra", "marcelín", "marcelin",
    "paratrooper", "u.s. army", "us army", "marines",
    "cinnamon",
    "catanduva", "ipanema", "copacabana", "leblon",
]

# UFs do Brasil que NÃO são Sul (PR/SC/RS): sufixo "-SP", "(RJ)", ", MG" etc desclassifica
_NON_SUL_UF_RE = re.compile(
    r"[\-_,\s\(](SP|RJ|MG|BA|GO|MT|MS|TO|PE|CE|AM|PA|MA|PI|AL|SE|RN|PB|AC|RO|RR|AP|DF|ES)([\-_,\s\)\.]|$)"
)

# Cidades cujos nomes também são sobrenomes / topônimos de praças/bairros em outras cidades.
# Exigem que a sigla OU nome do estado apareça no título da foto.
AMBIGUOUS_CITY_REQUIRE_STATE = {
    "Garibaldi": ("RS", "rio grande do sul"),
    "Canela":    ("RS", "rio grande do sul"),
    "Glória":    ("RS", "rio grande do sul"),
    "Gloria":    ("RS", "rio grande do sul"),
    "Penha":     ("SC", "santa catarina"),
    "Centro":    ("",   ""),  # nunca buscar "Centro" como cidade — é sublocal
    "Lapa":      ("PR", "paraná"),
    "Castro":    ("PR", "paraná"),
    "Itá":       ("SC", "santa catarina"),
}


def is_geo_falso_positivo(title, cidade=""):
    """True se o título tem um topônimo concorrente que indica foto do lugar errado."""
    low = title.lower()
    for bad in BAD_GEO_TOKENS:
        if bad in low:
            # Foz do Iguaçu legítimo no lado argentino
            if bad == "argentina" and ("iguazu" in low or "iguaçu" in low or "iguassu" in low):
                continue
            return True
    if _NON_SUL_UF_RE.search(title):
        return True
    # Cidades ambíguas: precisam ter o estado mencionado pra confirmar
    if cidade in AMBIGUOUS_CITY_REQUIRE_STATE:
        sigla, nome = AMBIGUOUS_CITY_REQUIRE_STATE[cidade]
        if not sigla:
            return True  # bloqueado totalmente (ex: "Centro")
        # Normaliza separadores pra checar nome do estado
        low_norm = re.sub(r"[_\-]+", " ", low)
        if re.search(rf"[\-_,\s\(/]{sigla}([\-_,\s\)\.\?]|$)", title) is None and nome not in low_norm:
            return True
    return False

# WHITELIST de cidades turísticas — em ordem de prioridade (mais turística primeiro)
PRIORITY_PR = [
    "Foz do Iguaçu", "Curitiba", "Morretes", "Antonina", "Paranaguá",
    "Lapa", "Tibagi", "Castro", "Prudentópolis", "Guaratuba", "Matinhos",
]
PRIORITY_SC = [
    "Florianópolis", "Balneário Camboriú", "Bombinhas", "Garopaba", "Imbituba",
    "Blumenau", "Joinville", "Pomerode", "Urubici", "Treze Tílias",
    "Laguna", "Penha", "Itapema", "Itajaí", "Brusque",
    "São Joaquim", "Itá", "São Francisco do Sul", "Porto Belo",
]
PRIORITY_RS = [
    "Gramado", "Canela", "Bento Gonçalves", "Caxias do Sul", "Porto Alegre",
    "Torres", "Capão da Canoa", "Pelotas", "Rio Grande", "São Miguel das Missões",
    "Cambará do Sul", "Nova Petrópolis", "Garibaldi", "Pinhal", "Tramandaí",
    "Antônio Prado", "Veranópolis",
]

# Lista única e ordenada (preserva a ordem de prioridade): PR primeiro, depois SC, depois RS
PRIORITY_ALL = PRIORITY_PR + PRIORITY_SC + PRIORITY_RS

# Pontos icônicos por cidade — viram queries dirigidas (mais específicas que cidade pura).
# São os "cartões postais" — cataratas pra Foz, Cristo Luz pra BC, Itaimbezinho pra Cambará.
ICONIC_BY_CITY = {
    "Foz do Iguaçu":     ["Cataratas do Iguaçu", "Iguaçu Falls", "Garganta do Diabo", "Marco das Três Fronteiras", "Itaipu", "Parque Nacional Iguaçu"],
    "Curitiba":          ["Jardim Botânico Curitiba", "Ópera de Arame", "Bosque do Alemão Curitiba", "Cabeça do Polonês Curitiba", "Memorial Ucraniano", "Largo da Ordem"],
    "Morretes":          ["Trem da Serra Verde", "Estrada da Graciosa", "Rio Nhundiaquara", "Centro Histórico Morretes"],
    "Antonina":          ["Baía de Antonina", "Centro Histórico Antonina", "Igreja Matriz Antonina"],
    "Paranaguá":         ["Centro Histórico Paranaguá", "Mercado Municipal Paranaguá", "Estação Ferroviária Paranaguá"],
    "Lapa":              ["Parque Estadual do Monge", "Centro Histórico Lapa"],
    "Tibagi":            ["Cânion Guartelá", "Salto Santa Rosa Tibagi", "Salto Puxa-Nervo"],
    "Castro":            ["Catedral Sant'Ana Castro", "Museu Casa Sinclair"],
    "Prudentópolis":     ["Salto São Francisco", "Salto São João Prudentópolis"],
    "Guaratuba":         ["Praia Brava Guaratuba", "Píer Guaratuba"],
    "Matinhos":          ["Praia Brava Matinhos", "Caieiras Matinhos"],

    "Florianópolis":     ["Ponte Hercílio Luz", "Lagoa da Conceição", "Praia da Joaquina", "Jurerê Internacional", "Praia Mole", "Praia do Campeche", "Forte São José da Ponta Grossa", "Costa da Lagoa Florianópolis", "Catedral Metropolitana Florianópolis", "Mercado Público Florianópolis"],
    "Balneário Camboriú":["Cristo Luz Balneário Camboriú", "Praia Central Balneário Camboriú", "Parque Unipraias", "Skyline Balneário Camboriú", "Praia de Laranjeiras"],
    "Bombinhas":         ["Praia de Mariscal Bombinhas", "Mirante 360 Bombinhas", "Ilha do Arvoredo", "Praia da Sepultura", "Praia da Lagoinha Bombinhas"],
    "Garopaba":          ["Praia da Ferrugem Garopaba", "Praia do Silveira Garopaba", "Pedra do Urubu Garopaba", "Praia do Rosa"],
    "Imbituba":          ["Praia do Rosa Imbituba", "Farol de Santa Marta Imbituba", "Praia da Vila Imbituba"],
    "Blumenau":          ["Vila Germânica Blumenau", "Castelinho Blumenau", "Catedral São Paulo Apóstolo Blumenau", "Oktoberfest Blumenau"],
    "Joinville":         ["Mirante Joinville", "Centreventos Cau Hansen", "Estação da Memória Joinville"],
    "Pomerode":          ["Casa Wolff Pomerode", "Vila Encantada Pomerode", "Festa Pomerana"],
    "Urubici":           ["Morro da Igreja Urubici", "Pedra Furada Urubici", "Cascata Véu de Noiva Urubici"],
    "Treze Tílias":      ["Igreja Matriz Treze Tílias", "Vila Tirolesa"],
    "Laguna":            ["Centro Histórico Laguna", "Farol Santa Marta Laguna", "Mar Grosso Laguna"],
    "Penha":             ["Beto Carrero World", "Praia Vermelha Penha"],
    "Itapema":           ["Meia Praia Itapema", "Morro do Cachorro Itapema"],
    "Itajaí":            ["Praia Brava Itajaí", "Porto Itajaí"],
    "São Joaquim":       ["Morro da Igreja São Joaquim", "Vinícolas de Altitude", "Neve São Joaquim"],
    "Itá":               ["Termas de Itá", "Lago Itá Santa Catarina"],
    "São Francisco do Sul": ["Centro Histórico São Francisco do Sul", "Praia Itaguaçu", "Museu Nacional do Mar"],
    "Porto Belo":        ["Ilha de Porto Belo", "Praia de Bombas Porto Belo"],

    "Gramado":           ["Lago Negro Gramado", "Mini Mundo Gramado", "Rua Coberta Gramado", "Natal Luz Gramado", "Catedral de Pedra Gramado", "Parque do Pinheiro Grosso", "Snowland Gramado"],
    "Canela":            ["Cascata do Caracol Canela", "Catedral de Pedra Canela", "Parque do Caracol", "Castelinho Caracol", "Ferradura Canela"],
    "Bento Gonçalves":   ["Vale dos Vinhedos", "Maria Fumaça Bento Gonçalves", "Cantina Aurora Bento Gonçalves", "Caminho de Pedra Bento Gonçalves"],
    "Caxias do Sul":     ["Catedral Diocesana Caxias do Sul", "Vinhedos Caxias", "Castelo Lacave"],
    "Porto Alegre":      ["Usina do Gasômetro", "Mercado Público Porto Alegre", "Parque da Redenção", "Pôr do Sol Guaíba", "Rua dos Andradas Porto Alegre", "Catedral Metropolitana Porto Alegre"],
    "Torres":            ["Praia Grande Torres", "Parque da Guarita Torres", "Morro das Furnas Torres"],
    "Capão da Canoa":    ["Praia Capão da Canoa", "Lagoa dos Quadros"],
    "Pelotas":           ["Praça Coronel Pedro Osório Pelotas", "Mercado Público Pelotas", "Casarão Pelotas"],
    "Rio Grande":        ["Catedral São Pedro Rio Grande", "Centro Histórico Rio Grande", "Molhes da Barra Rio Grande"],
    "São Miguel das Missões": ["Ruínas de São Miguel", "Sítio Arqueológico São Miguel das Missões"],
    "Cambará do Sul":    ["Cânion Itaimbezinho", "Cânion Fortaleza", "Parque Nacional Aparados da Serra"],
    "Nova Petrópolis":   ["Labirinto Verde Nova Petrópolis", "Praça das Flores Nova Petrópolis"],
    "Garibaldi":         ["Largo da Estação Garibaldi", "Vinícolas Garibaldi"],
    "Pinhal":            ["Praia de Pinhal"],
    "Tramandaí":         ["Praia Tramandaí", "Lagoa do Armazém"],
    "Antônio Prado":     ["Centro Histórico Antônio Prado"],
    "Veranópolis":       ["Praça Centenário Veranópolis"],
}


def http_get_json(url, headers=None, timeout=30):
    req = urllib.request.Request(url, headers=headers or {})
    req.add_header("User-Agent", USER_AGENT)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def http_post_json(url, payload, headers=None, timeout=60):
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    req.add_header("User-Agent", USER_AGENT)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")


def _sql_str_array(items):
    """Constrói um literal ARRAY['a','b'] com escaping simples."""
    parts = []
    for it in items:
        s = it.replace("'", "''")
        parts.append(f"'{s}'")
    return "ARRAY[" + ",".join(parts) + "]"


def fetch_lugares_sem_foto(force=False):
    """Por padrão lista só lugares sem foto principal.
    Com force=True: lista TODAS as cidades-cabeça da whitelist (pra buscar ângulos épicos extras)."""
    arr_lit = _sql_str_array(PRIORITY_ALL)
    if force:
        sql = (
            "SELECT 'cidade' AS tipo, l.estado, l.cidade, NULL::text AS sublocal, l.descricao "
            "FROM localidades l "
            "WHERE l.tipo='cidade' "
            f"AND l.cidade = ANY({arr_lit}) "
            f"ORDER BY array_position({arr_lit}, l.cidade)"
        )
    else:
        sql = (
            "SELECT l.tipo, l.estado, l.cidade, l.sublocal, l.descricao "
            "FROM localidades l "
            "LEFT JOIN v_foto_principal fp ON l.estado=fp.estado AND l.cidade=fp.cidade "
            "AND COALESCE(l.sublocal,'')=COALESCE(fp.sublocal,'') "
            "WHERE l.tipo IN ('cidade','bairro','produtora') "
            "AND fp.url IS NULL "
            f"AND l.cidade = ANY({arr_lit}) "
            f"ORDER BY array_position({arr_lit}, l.cidade), "
            "  CASE l.tipo WHEN 'cidade' THEN 0 WHEN 'bairro' THEN 1 WHEN 'produtora' THEN 2 ELSE 3 END, "
            "  l.sublocal NULLS FIRST"
        )
    code, body = http_post_json(
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        {"query": sql},
        headers={"Authorization": f"Bearer {MGMT_TOKEN}"},
    )
    if code != 200 and code != 201:
        print(f"ERRO query: {code} {body[:400]}", file=sys.stderr)
        sys.exit(1)
    return json.loads(body)


def search_commons(query):
    """Busca arquivos na Wikimedia Commons (namespace 6 = File:)."""
    params = {
        "action": "query",
        "format": "json",
        "list": "search",
        "srsearch": query,
        "srlimit": "8",
        "srnamespace": "6",
    }
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    try:
        data = http_get_json(url)
        return [hit["title"] for hit in data.get("query", {}).get("search", [])]
    except Exception as e:
        print(f"  search erro: {e}", file=sys.stderr)
        return []


def imageinfo(titles):
    """Pega info (URL, dimensões, mime) de até 50 arquivos de uma vez."""
    if not titles:
        return {}
    params = {
        "action": "query",
        "format": "json",
        "prop": "imageinfo",
        "iiprop": "url|size|mime|extmetadata",
        "titles": "|".join(titles[:50]),
    }
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    try:
        data = http_get_json(url)
        out = {}
        for page in data.get("query", {}).get("pages", {}).values():
            ii = page.get("imageinfo")
            if ii:
                out[page["title"]] = ii[0]
        return out
    except Exception as e:
        print(f"  imageinfo erro: {e}", file=sys.stderr)
        return {}


def score_title(title):
    low = title.lower()
    for bad in BAD_NAME_TOKENS:
        if bad in low:
            return -1000
    score = 0
    for good in GOOD_NAME_TOKENS:
        if good in low:
            score += 5
    # Cumulativo: cada token EM CADA categoria conta.
    # Cores fortes / luzes / entardecer (peso máximo)
    for tok in COLOR_RICH_TOKENS:
        if tok in low:
            score += 50
    # Vistas de longe / aéreas / panorâmicas
    for tok in DISTANCE_VIEW_TOKENS:
        if tok in low:
            score += 40
    # Natureza / paisagem
    for tok in NATURE_LANDSCAPE_TOKENS:
        if tok in low:
            score += 35
    # Marcos icônicos / patrimônio
    for tok in LANDMARK_TOKENS:
        if tok in low:
            score += 18
    # Penaliza fotos genéricas (rua comum, supermercado, etc)
    for avoid in AVOID_TOKENS:
        if avoid in low:
            score -= 22
    return score


_STOP = {"do","da","de","dos","das","e","a","o","em","no","na","sao","são"}

GENERIC_PLACE_WORDS = {
    "centro", "histórico", "historico", "parque", "praça", "praca",
    "lago", "lagoa", "igreja", "museu", "matriz", "vista", "mirante",
    "ponte", "morro", "rua", "avenida", "calçadão", "calcadao",
    "catedral", "estação", "estacao", "mercado", "feira", "cachoeira",
}

def _tokens(s):
    s = re.sub(r"[^a-zA-Zà-úÀ-Ú0-9]+", " ", s).lower().strip()
    return [t for t in s.split() if t and t not in _STOP and len(t) > 2]


def pick_best(termo_busca, cidade, hits, info_map, min_w=900, min_h=600, top_n=1):
    """
    Retorna o melhor candidato (top_n=1) ou lista top-N quando solicitado.
    Threshold mínimo subiu pra 900x600 — fotos cidade-cabeça devem ser hi-res.
    """
    candidates = []
    termo_toks = _tokens(termo_busca)
    cidade_toks = _tokens(cidade)
    distintivo = termo_toks[-1] if termo_toks else (cidade_toks[-1] if cidade_toks else "")
    if not termo_toks and cidade_toks:
        distintivo = cidade_toks[-1]
    used_urls = getattr(pick_best, "_used_urls", set())
    for title in hits:
        info = info_map.get(title)
        if not info:
            continue
        mime = info.get("mime", "")
        if not (mime.startswith("image/jpeg") or mime.startswith("image/png") or mime.startswith("image/webp")):
            continue
        url = info.get("url", "")
        if url in used_urls:
            continue
        w = info.get("width", 0) or 0
        h = info.get("height", 0) or 0
        if w < min_w or h < min_h:
            continue
        s = score_title(title)
        if s < 0:
            continue
        if is_geo_falso_positivo(title, cidade):
            continue
        title_toks = set(_tokens(title))
        if distintivo and distintivo not in title_toks and not any(c in title_toks for c in cidade_toks):
            continue
        s += 10 * sum(1 for t in termo_toks if t in title_toks)
        if all(c in title_toks for c in cidade_toks):
            s += 12
        elif any(c in title_toks for c in cidade_toks):
            s += 5
        s += min(15, w // 400)  # mais peso em alta resolução
        candidates.append((s, title, info))
    candidates.sort(reverse=True, key=lambda x: x[0])
    if top_n > 1:
        return candidates[:top_n]
    return candidates[0] if candidates else None


def get_attribution(info):
    meta = info.get("extmetadata", {}) or {}
    artist = meta.get("Artist", {}).get("value", "") if isinstance(meta.get("Artist"), dict) else ""
    artist = re.sub(r"<[^>]+>", "", artist).strip()
    license_short = ""
    if isinstance(meta.get("LicenseShortName"), dict):
        license_short = meta["LicenseShortName"].get("value", "")
    if not license_short and isinstance(meta.get("License"), dict):
        license_short = meta["License"].get("value", "")
    return artist, license_short


def insert_foto(estado, cidade, sublocal, url, atribuicao, licenca, largura, altura, ordem=0):
    api_url = f"{SUPA_URL}/rest/v1/fotos_locais"
    payload = {
        "estado": estado,
        "cidade": cidade,
        "url": url,
        "atribuicao": atribuicao,
        "licenca": licenca,
        "largura": largura,
        "altura": altura,
        "ordem": ordem,
        "ativo": True,
    }
    if sublocal:
        payload["sublocal"] = sublocal
    else:
        payload["sublocal"] = None
    code, body = http_post_json(
        api_url, payload,
        headers={
            "apikey": SVC_KEY,
            "Authorization": f"Bearer {SVC_KEY}",
            "Prefer": "return=minimal",
        },
    )
    return code, body


def build_queries(tipo, estado, cidade, sublocal):
    """Monta lista de queries por tipo de localidade.
    Pra cidade-cabeça: queries icônicas primeiro (cartão postal),
    depois queries épicas (sunset/aerial/panorama), depois fallbacks."""
    if tipo == "cidade":
        qs = []
        # 1) Pontos icônicos da cidade — combinados com cores fortes / aérea
        iconicos = ICONIC_BY_CITY.get(cidade, [])
        for ico in iconicos[:5]:
            qs.append(f"{ico} sunset")
            qs.append(f"{ico} night")
            qs.append(ico)  # base
        # 2) Cidade + cores+vista de longe (combos com peso alto)
        qs.extend([
            f"{cidade} {estado} aerial sunset",
            f"{cidade} {estado} drone panorama",
            f"{cidade} {estado} skyline night",
            f"{cidade} {estado} sunset",
            f"{cidade} {estado} night iluminada",
            f"{cidade} {estado} viewpoint mirante",
            f"{cidade} {estado} aerial",
            f"{cidade} {estado} panorama",
            f"{cidade} {estado} mountain landscape",
            f"{cidade} {estado} fireworks",
            f"{cidade} {estado} colorful",
            f"{cidade} centro histórico",
            f"{cidade} {estado}",
        ])
        return qs
    elif tipo == "bairro":
        sub = sublocal or ""
        return [
            f"{sub} {cidade} sunset aerial",
            f"{sub} {cidade}",
            f"bairro {sub} {cidade} {estado}",
            f"{sub} {cidade} {estado}",
        ]
    elif tipo == "produtora":
        sub = sublocal or ""
        qs = [f"{sub} {cidade}"]
        if sub and len(sub.split()) >= 2:
            qs.append(sub)
        qs.append(f"{sub} {cidade} {estado}")
        return qs
    else:
        return [f"{cidade} {estado}"]


def main():
    max_lugares = 80
    force = False
    if len(sys.argv) > 1:
        try:
            max_lugares = int(sys.argv[1])
        except ValueError:
            pass
    if "force" in sys.argv:
        force = True
        print("[INFO] FORCE MODE — vai processar TODAS cidades-cabeça (mesmo as que já têm foto)")

    lugares = fetch_lugares_sem_foto(force=force)
    print(f"[INFO] Total lugares (whitelist) sem foto: {len(lugares)}")
    by_tipo = {}
    for l in lugares:
        by_tipo[l["tipo"]] = by_tipo.get(l["tipo"], 0) + 1
    for t, n in by_tipo.items():
        print(f"   - {t}: {n}")
    print(f"[INFO] Whitelist com {len(PRIORITY_ALL)} cidades turísticas (PR/SC/RS)")
    print(f"[INFO] Processando até {max_lugares} nesta rodada\n")

    inseridas = []
    sem_match = []
    stats_tipo = {"cidade": {"ok": 0, "miss": 0},
                  "bairro": {"ok": 0, "miss": 0},
                  "produtora": {"ok": 0, "miss": 0}}
    cidades_com_foto = set()  # cidades que conseguiram pelo menos 1 foto nesta rodada
    pick_best._used_urls = set()  # anti-dup intra-rodada

    TOP_FOTOS_CIDADE = 3  # quantas fotos épicas por cidade-cabeça

    alvo = lugares[:max_lugares]
    for i, p in enumerate(alvo):
        tipo = p["tipo"]
        estado = p["estado"]
        cidade = p["cidade"]
        sub = p.get("sublocal")
        termo = sub if sub else cidade

        queries = build_queries(tipo, estado, cidade, sub)

        rotulo = f"{sub} - {cidade}/{estado}" if sub else f"{cidade}/{estado}"
        print(f"[{i+1}/{len(alvo)}] ({tipo}) {rotulo}")

        # ───── Cidade-cabeça: acumula top N de TODAS as queries (ângulos diferentes) ─────
        if tipo == "cidade":
            todos_cands = []
            for q in queries:
                hits = search_commons(q)
                if not hits:
                    time.sleep(0.35); continue
                info_map = imageinfo(hits)
                cands = pick_best(termo, cidade, hits, info_map, min_w=900, min_h=600, top_n=8)
                if cands:
                    todos_cands.extend(cands)
                time.sleep(0.35)

            # Dedup por URL e ordena pelo score global; escolhe top N
            seen = set(getattr(pick_best, "_used_urls", set()))
            top = []
            for s_, t_, info_ in sorted(todos_cands, reverse=True, key=lambda x: x[0]):
                url_ = info_.get("url", "")
                if url_ in seen:
                    continue
                seen.add(url_)
                top.append((s_, t_, info_))
                if len(top) >= TOP_FOTOS_CIDADE:
                    break

            if not top:
                print("   sem match")
                sem_match.append({"tipo": tipo, "estado": estado, "cidade": cidade, "sublocal": sub})
                stats_tipo[tipo]["miss"] += 1
                time.sleep(0.8); continue

            for ordem_idx, (score, title, info) in enumerate(top):
                url = info.get("url", "")
                w = info.get("width", 0) or 0
                h = info.get("height", 0) or 0
                artist, lic = get_attribution(info)
                atribuicao = f"{artist} / Wikimedia Commons" if artist else "Wikimedia Commons"
                if len(atribuicao) > 200:
                    atribuicao = atribuicao[:197] + "..."
                licenca = lic or "CC"
                code, body = insert_foto(estado, cidade, None, url, atribuicao, licenca, w, h, ordem=ordem_idx)
                if code in (200, 201, 204):
                    marca = "★" if ordem_idx == 0 else " "
                    print(f"   {marca} ordem={ordem_idx} score={score} ({w}x{h}) {title}")
                    inseridas.append({
                        "tipo": tipo, "estado": estado, "cidade": cidade, "sublocal": None,
                        "url": url, "score": score, "w": w, "h": h, "title": title, "ordem": ordem_idx,
                    })
                    stats_tipo[tipo]["ok"] += 1
                    cidades_com_foto.add(cidade)
                    pick_best._used_urls.add(url)
                else:
                    print(f"   FALHA insert ordem={ordem_idx}: {code} {body[:160]}")
            time.sleep(0.9)
            continue

        # ───── Bairro / produtora: 1 foto, igual antes ─────
        chosen = None
        for q in queries:
            hits = search_commons(q)
            if not hits:
                time.sleep(0.4); continue
            info_map = imageinfo(hits)
            best = pick_best(termo, cidade, hits, info_map, min_w=800, min_h=500)
            if best:
                chosen = best
                print(f"   match: {q!r} -> {best[1]}")
                break
            time.sleep(0.4)

        if not chosen:
            print("   sem match")
            sem_match.append({"tipo": tipo, "estado": estado, "cidade": cidade, "sublocal": sub})
            stats_tipo[tipo]["miss"] += 1
            time.sleep(1.0); continue

        score, title, info = chosen
        url = info.get("url", "")
        w = info.get("width", 0) or 0
        h = info.get("height", 0) or 0
        artist, lic = get_attribution(info)
        atribuicao = f"{artist} / Wikimedia Commons" if artist else "Wikimedia Commons"
        if len(atribuicao) > 200:
            atribuicao = atribuicao[:197] + "..."
        licenca = lic or "CC"
        code, body = insert_foto(estado, cidade, sub, url, atribuicao, licenca, w, h)
        if code in (200, 201, 204):
            print(f"   OK inserido ({w}x{h}, {licenca})")
            inseridas.append({
                "tipo": tipo, "estado": estado, "cidade": cidade, "sublocal": sub,
                "url": url, "score": score, "w": w, "h": h, "title": title,
            })
            stats_tipo[tipo]["ok"] += 1
            cidades_com_foto.add(cidade)
            pick_best._used_urls.add(url)
        else:
            print(f"   FALHA insert: {code} {body[:200]}")
            sem_match.append({"tipo": tipo, "estado": estado, "cidade": cidade, "sublocal": sub,
                              "erro_insert": f"{code} {body[:120]}"})
            stats_tipo[tipo]["miss"] += 1
        time.sleep(1.0)

    # Cidades da whitelist que NÃO conseguiram nenhuma foto nesta rodada
    cidades_processadas = set(p["cidade"] for p in alvo)
    whitelist_sem_foto_processadas = sorted(cidades_processadas - cidades_com_foto)
    # Cidades da whitelist que nem apareceram no resultado da query (não tinham linha em localidades sem foto)
    whitelist_nao_apareceram = [c for c in PRIORITY_ALL if c not in cidades_processadas]

    print("\n" + "=" * 60)
    print(f"RESULTADO: {len(inseridas)} inseridas, {len(sem_match)} sem match")
    for t, s in stats_tipo.items():
        print(f"   {t}: ok={s['ok']}  miss={s['miss']}")
    print("=" * 60)
    print("\nTop 5 inseridas (por score):")
    for x in sorted(inseridas, key=lambda r: -r["score"])[:5]:
        rot = f"{x['sublocal']} ({x['cidade']}/{x['estado']})" if x['sublocal'] else f"{x['cidade']}/{x['estado']}"
        print(f"  - [{x['tipo']}] {rot}: {x['url']}")
    print("\nSem match (primeiras 10):")
    for r in sem_match[:10]:
        rot = f"{r['sublocal']} ({r['cidade']}/{r['estado']})" if r['sublocal'] else f"{r['cidade']}/{r['estado']}"
        print(f"  - [{r['tipo']}] {rot}")
    print("\nCidades da whitelist processadas SEM nenhuma foto inserida:")
    for c in whitelist_sem_foto_processadas:
        print(f"  - {c}")

    # salva relatório
    with open("/tmp/coleta_cidades_priority_relatorio.json", "w") as f:
        json.dump({
            "inseridas": inseridas,
            "sem_match": sem_match,
            "stats_tipo": stats_tipo,
            "total_pendente_whitelist": len(lugares),
            "whitelist_size": len(PRIORITY_ALL),
            "cidades_com_foto_inserida": sorted(cidades_com_foto),
            "whitelist_processadas_sem_foto": whitelist_sem_foto_processadas,
            "whitelist_nao_apareceram_na_query": whitelist_nao_apareceram,
        }, f, ensure_ascii=False, indent=2)
    print("\nRelatório: /tmp/coleta_cidades_priority_relatorio.json")


if __name__ == "__main__":
    main()
