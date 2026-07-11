#!/usr/bin/env python3
"""Refresh Ace Pools' Comberton territory lead data.

Uses area-level postcode coordinates, caches lookups, estimates/requests drive time,
and adds newly discovered public sale/planning signals for human verification.
"""
from __future__ import annotations

import hashlib, json, math, os, re, time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote_plus
from urllib.request import Request, urlopen
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
SEEDS = DATA / "lead_seeds.json"
CACHE = DATA / "geocode_cache.json"
OUTPUT = DATA / "leads.json"
CENTRE_POSTCODE = "CB23 7BZ"  # Comberton village centre, not a home address.
MAX_DRIVE_MINUTES = 45
UA = "AcePoolsTerritoryEngine/1.0 (public business lead research)"
POOL_TERMS = re.compile(r"\b(swimming pool|pool house|pool room|pool hall|pool complex|pool enclosure|pool plant)\b", re.I)
PAIN_TERMS = re.compile(r"\b(reduced|sold stc|under offer|modernisation|updating required|refurbish|renovation|plant room|heat pump|gas boiler|oil|decommission|fill(?:ed)? in)\b", re.I)

SEARCHES = [
    'site:rightmove.co.uk/properties "swimming pool" (Cambridge OR Royston OR Huntingdon OR Ely OR Saffron Walden)',
    'site:zoopla.co.uk/for-sale/details "swimming pool" (Cambridge OR Royston OR Huntingdon OR Ely)',
    'site:onthemarket.com/details "swimming pool" (Cambridge OR Royston OR Huntingdon)',
    '"swimming pool" "planning application" (Cambridgeshire OR Royston OR Saffron Walden)',
]

def fetch(url: str, timeout: int = 20) -> bytes:
    req = Request(url, headers={"User-Agent": UA, "Accept": "application/json,application/xml,text/xml,*/*"})
    with urlopen(req, timeout=timeout) as r:
        return r.read()

def load(path: Path, default):
    try: return json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError): return default

def postcode_key(postcode: str) -> str:
    return re.sub(r"\s+", "", postcode.upper())

def geocode(postcode: str, cache: dict) -> tuple[float, float] | None:
    key = postcode_key(postcode)
    if not key: return None
    if key in cache: return tuple(cache[key]) if cache[key] else None
    endpoint = "postcodes" if len(key) > 4 else "outcodes"
    try:
        body = json.loads(fetch(f"https://api.postcodes.io/{endpoint}/{quote_plus(key)}"))
        result = body.get("result") or {}
        coords = [float(result["latitude"]), float(result["longitude"])]
        cache[key] = coords
        time.sleep(0.15)
        return tuple(coords)
    except Exception as e:
        print(f"geocode failed for {postcode}: {e}")
        cache[key] = None
        return None

def haversine(a, b) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, [a[0], a[1], b[0], b[1]])
    x = math.sin((lat2-lat1)/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2
    return 6371 * 2 * math.asin(math.sqrt(x))

def drive_minutes(origin, dest) -> tuple[int, str]:
    if os.environ.get("ACE_OFFLINE") == "1":
        km = haversine(origin, dest)
        return round(8 + (km / 48 * 60)), "estimated"
    url = f"https://router.project-osrm.org/route/v1/driving/{origin[1]},{origin[0]};{dest[1]},{dest[0]}?overview=false"
    try:
        data = json.loads(fetch(url))
        seconds = data["routes"][0]["duration"]
        return round(seconds / 60), "OSRM"
    except Exception:
        km = haversine(origin, dest)
        return round(8 + (km / 48 * 60)), "estimated"

def discover() -> list[dict]:
    if os.environ.get("ACE_OFFLINE") == "1": return []
    found = []
    for query in SEARCHES:
        try:
            xml = fetch("https://www.bing.com/search?format=rss&q=" + quote_plus(query))
            root = ElementTree.fromstring(xml)
            for item in root.findall(".//item")[:15]:
                title = (item.findtext("title") or "").strip()
                link = (item.findtext("link") or "").strip()
                desc = re.sub("<[^>]+>", " ", item.findtext("description") or "")
                text = f"{title} {desc}"
                if not link or not POOL_TERMS.search(text): continue
                found.append({
                    "id": "auto-" + hashlib.sha1(link.encode()).hexdigest()[:12],
                    "prospect": title[:120], "area": "Verify", "postcode": "", "county": "Verify",
                    "signal": desc[:300], "pain": "New public pool signal; verify condition and ownership event.",
                    "offer": "Pool Review", "whyNow": "Newly discovered by daily scan.",
                    "route": "Verify public professional route", "angle": "Reference the visible pool project and offer a practical review.",
                    "action": "Open source, verify location and trigger, then qualify.", "url": link,
                    "baseScore": 62 + (10 if PAIN_TERMS.search(text) else 0), "autoDiscovered": True,
                })
        except Exception as e: print(f"search failed: {e}")
    return found

def main():
    DATA.mkdir(exist_ok=True)
    seeds = load(SEEDS, [])
    prior = load(OUTPUT, {}).get("leads", [])
    cache = load(CACHE, {})
    origin = geocode(CENTRE_POSTCODE, cache)
    if not origin: raise SystemExit("Could not locate Comberton centre")
    candidates = seeds + [x for x in prior if x.get("autoDiscovered")] + discover()
    unique = {}
    for lead in candidates:
        unique[lead.get("url") or lead["id"]] = lead
    leads = []
    for lead in unique.values():
        item = dict(lead)
        coords = geocode(item.get("postcode", ""), cache)
        if coords:
            mins, method = drive_minutes(origin, coords)
            item.update(latitude=round(coords[0], 3), longitude=round(coords[1], 3), driveMinutes=mins, driveMethod=method)
            item["inTerritory"] = mins <= MAX_DRIVE_MINUTES
            route_bonus = 5 if mins <= 25 else 2 if mins <= 45 else -12
        else:
            item.update(latitude=None, longitude=None, driveMinutes=None, driveMethod="unverified", inTerritory=False)
            route_bonus = -8
        item["score"] = max(0, min(100, int(item.get("baseScore", 50)) + route_bonus))
        item["priority"] = "A" if item["score"] >= 90 else "B" if item["score"] >= 75 else "C"
        item["reasoning"] = f"{item.get('whyNow','')} Likely need: {item.get('pain','')}"
        if item["inTerritory"] or item.get("autoDiscovered"):
            leads.append(item)
    leads.sort(key=lambda x: (not x.get("inTerritory", False), -x["score"], x.get("driveMinutes") or 999))
    CACHE.write_text(json.dumps(cache, indent=2, sort_keys=True))
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(), "centre": {"name":"Comberton","postcode":CENTRE_POSTCODE,"latitude":origin[0],"longitude":origin[1]},
        "maxDriveMinutes": MAX_DRIVE_MINUTES, "count": len(leads), "territoryCount": sum(1 for x in leads if x.get("inTerritory")), "leads": leads,
    }
    OUTPUT.write_text(json.dumps(payload, indent=2))
    print(f"wrote {len(leads)} leads; {payload['territoryCount']} within territory")

if __name__ == "__main__": main()
