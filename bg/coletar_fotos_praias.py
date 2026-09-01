#!/usr/bin/env python3
"""
Coleta fotos de praias do Sul do Brasil sem foto principal.
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
                   "selfie", "close-up", "closeup", "close up",
                   "portrait", "porträt", "retrato",
                   "headshot", "head shot", "face shot",
                   "groom", "bride", "wedding photo",
                   "interview", "entrevista", "comício", "comicio"]
GOOD_NAME_TOKENS = ["beach", "praia", "sunset", "sunrise", "morning", "aerial",
                    "surf", "ocean", "mar", "costa", "litoral", "panorama"]

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

_NON_SUL_UF_RE = re.compile(
    r"[\-_,\s\(](SP|RJ|MG|BA|GO|MT|MS|TO|PE|CE|AM|PA|MA|PI|AL|SE|RN|PB|AC|RO|RR|AP|DF|ES)([\-_,\s\)\.]|$)"
)

AMBIGUOUS_CITY_REQUIRE_STATE = {
    "Garibaldi": ("RS", "rio grande do sul"),
    "Canela":    ("RS", "rio grande do sul"),
    "Glória":    ("RS", "rio grande do sul"),
    "Gloria":    ("RS", "rio grande do sul"),
    "Penha":     ("SC", "santa catarina"),
    "Centro":    ("",   ""),
    "Lapa":      ("PR", "paraná"),
    "Castro":    ("PR", "paraná"),
    "Itá":       ("SC", "santa catarina"),
}


def is_geo_falso_positivo(title, cidade=""):
    low = title.lower()
    for bad in BAD_GEO_TOKENS:
        if bad in low:
            if bad == "argentina" and ("iguazu" in low or "iguaçu" in low or "iguassu" in low):
                continue
            return True
    if _NON_SUL_UF_RE.search(title):
        return True
    if cidade in AMBIGUOUS_CITY_REQUIRE_STATE:
        sigla, nome = AMBIGUOUS_CITY_REQUIRE_STATE[cidade]
        if not sigla:
            return True
        low_norm = re.sub(r"[_\-]+", " ", low)
        if re.search(rf"[\-_,\s\(/]{sigla}([\-_,\s\)\.\?]|$)", title) is None and nome not in low_norm:
            return True
    return False


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


def fetch_praias_sem_foto():
    sql = ("SELECT l.estado, l.cidade, l.sublocal, l.descricao FROM localidades l "
           "LEFT JOIN v_foto_principal fp ON l.estado=fp.estado AND l.cidade=fp.cidade "
           "AND l.sublocal=fp.sublocal "
           "WHERE l.tipo='praia' AND fp.url IS NULL "
           "ORDER BY l.cidade, l.sublocal")
    code, body = http_post_json(
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        {"query": sql},
        headers={"Authorization": f"Bearer {MGMT_TOKEN}"},
    )
    if code != 200 and code != 201:
        print(f"ERRO query: {code} {body[:200]}", file=sys.stderr)
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
    return score


def pick_best(praia_name, cidade, hits, info_map):
    candidates = []
    praia_low = praia_name.lower()
    cidade_low = cidade.lower()
    for title in hits:
        info = info_map.get(title)
        if not info:
            continue
        mime = info.get("mime", "")
        if not (mime.startswith("image/jpeg") or mime.startswith("image/png") or mime.startswith("image/webp")):
            continue
        w = info.get("width", 0) or 0
        h = info.get("height", 0) or 0
        if w < 800 or h < 500:
            continue
        s = score_title(title)
        if s < 0:
            continue
        if is_geo_falso_positivo(title, cidade):
            continue
        # boost se nome da praia ou cidade aparece
        tl = title.lower()
        if praia_low.split()[-1] in tl:
            s += 10
        if cidade_low in tl:
            s += 8
        # boost por resolução (cap 10)
        s += min(10, w // 500)
        candidates.append((s, title, info))
    candidates.sort(reverse=True, key=lambda x: x[0])
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


def insert_foto(estado, cidade, sublocal, url, atribuicao, licenca, largura, altura):
    api_url = f"{SUPA_URL}/rest/v1/fotos_locais"
    payload = {
        "estado": estado,
        "cidade": cidade,
        "sublocal": sublocal,
        "url": url,
        "atribuicao": atribuicao,
        "licenca": licenca,
        "largura": largura,
        "altura": altura,
        "ordem": 0,
        "ativo": True,
    }
    code, body = http_post_json(
        api_url, payload,
        headers={
            "apikey": SVC_KEY,
            "Authorization": f"Bearer {SVC_KEY}",
            "Prefer": "return=minimal",
        },
    )
    return code, body


def main():
    max_praias = 50
    if len(sys.argv) > 1:
        try:
            max_praias = int(sys.argv[1])
        except ValueError:
            pass

    praias = fetch_praias_sem_foto()
    print(f"[INFO] Total praias sem foto: {len(praias)}")
    print(f"[INFO] Processando até {max_praias} nesta rodada\n")

    inseridas = []
    sem_match = []

    for i, p in enumerate(praias[:max_praias]):
        estado = p["estado"]
        cidade = p["cidade"]
        sub = p["sublocal"]
        nome = sub or ""
        # remove "Praia" duplicado para query mais limpa
        nome_clean = re.sub(r"^\s*praia\s+(d[aoe]s?\s+)?", "", nome, flags=re.I).strip() or nome
        queries = [
            f"{nome} {cidade} praia",
            f"{nome_clean} {cidade}",
            f"praia {nome_clean} {estado}",
        ]

        print(f"[{i+1}/{min(max_praias, len(praias))}] {sub} - {cidade}/{estado}")

        chosen = None
        for q in queries:
            hits = search_commons(q)
            if not hits:
                time.sleep(0.4)
                continue
            info_map = imageinfo(hits)
            best = pick_best(nome, cidade, hits, info_map)
            if best:
                chosen = best
                print(f"   match: {q!r} -> {best[1]}")
                break
            time.sleep(0.4)

        if not chosen:
            print(f"   sem match")
            sem_match.append((estado, cidade, sub))
            time.sleep(1.0)
            continue

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
                "estado": estado, "cidade": cidade, "sublocal": sub,
                "url": url, "score": score, "w": w, "h": h, "title": title,
            })
        else:
            print(f"   FALHA insert: {code} {body[:200]}")
            sem_match.append((estado, cidade, sub))

        time.sleep(1.0)

    print("\n" + "=" * 60)
    print(f"RESULTADO: {len(inseridas)} inseridas, {len(sem_match)} sem match")
    print("=" * 60)
    print("\nTop 5 inseridas (por score):")
    for x in sorted(inseridas, key=lambda r: -r["score"])[:5]:
        print(f"  - {x['sublocal']} ({x['cidade']}/{x['estado']}): {x['url']}")
    print("\nSem match (primeiras 10):")
    for est, cid, sub in sem_match[:10]:
        print(f"  - {sub} ({cid}/{est})")

    # salva relatório
    with open("/tmp/coleta_praias_relatorio.json", "w") as f:
        json.dump({
            "inseridas": inseridas,
            "sem_match": [{"estado": e, "cidade": c, "sublocal": s} for e, c, s in sem_match],
            "total_pendente": len(praias),
        }, f, ensure_ascii=False, indent=2)
    print("\nRelatório: /tmp/coleta_praias_relatorio.json")


if __name__ == "__main__":
    main()
