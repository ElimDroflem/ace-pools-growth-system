#!/usr/bin/env python3
"""Build Ace Pools' permanent pool-property register and daily action queue.

Known pool properties are retained permanently. Daily web/planning discoveries are
kept in a separate verification queue until a person confirms the address, pool
and lawful contact route.
"""
from __future__ import annotations

import hashlib, json, math, os, re, time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote_plus
from urllib.request import Request, urlopen
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
SEEDS = DATA / "lead_seeds.json"
CACHE = DATA / "geocode_cache.json"
OUTPUT = DATA / "leads.json"
CENTRE_POSTCODE = "CB23 7BZ"
MAX_DRIVE_MINUTES = 45
UA = "AcePoolsTerritoryEngine/2.0 (public business lead research)"
POOL_TERMS = re.compile(r"\b(swimming pool|heated pool|indoor pool|outdoor pool|pool house|pool room|pool hall|pool complex|pool enclosure|pool plant)\b", re.I)
NEED_TERMS = re.compile(r"\b(old|older|ageing|reduced|modernisation|updating|required|refurbish|renovation|plant room|heat pump|gas boiler|oil|decommission|weathered|recommission)\b", re.I)
TOWNS = ("Cambridge", "Comberton", "Hardwick", "Bourn", "Cottenham", "Melbourn", "Royston", "St Neots", "Huntingdon", "Godmanchester", "Saffron Walden", "Great Shelford", "Willingham", "Over", "Yelling", "Great Gransden")
SEARCHES = [
    f'site:rightmove.co.uk/properties "swimming pool" "{town}"' for town in TOWNS
] + [
    'site:onthemarket.com/details "swimming pool" (Cambridge OR Huntingdon OR Royston)',
    'site:zoopla.co.uk/for-sale/details "swimming pool" (Cambridge OR Huntingdon OR Royston)',
    '"private heated indoor pool" (Cambridge OR Huntingdon OR Royston) holiday home',
    '"swimming pool" "planning application" (Cambridge OR South Cambridgeshire OR Huntingdonshire)',
]

def fetch(url: str, timeout: int = 20) -> bytes:
    req = Request(url, headers={"User-Agent": UA, "Accept": "application/json,application/xml,text/xml,*/*"})
    with urlopen(req, timeout=timeout) as response:
        return response.read()

def load(path: Path, default):
    try:
        return json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return default

def postcode_key(postcode: str) -> str:
    return re.sub(r"\s+", "", postcode.upper())

def geocode(postcode: str, cache: dict) -> tuple[float, float] | None:
    key = postcode_key(postcode)
    if not key:
        return None
    if key in cache:
        return tuple(cache[key]) if cache[key] else None
    endpoint = "postcodes" if len(key) > 4 else "outcodes"
    try:
        body = json.loads(fetch(f"https://api.postcodes.io/{endpoint}/{quote_plus(key)}"))
        result = body.get("result") or {}
        coords = [float(result["latitude"]), float(result["longitude"])]
        cache[key] = coords
        time.sleep(0.12)
        return tuple(coords)
    except Exception as error:
        print(f"geocode failed for {postcode}: {error}")
        cache[key] = None
        return None

def haversine(a, b) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, [a[0], a[1], b[0], b[1]])
    value = math.sin((lat2-lat1)/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2
    return 6371 * 2 * math.asin(math.sqrt(value))

def drive_minutes(origin, destination) -> tuple[int, str]:
    if os.environ.get("ACE_OFFLINE") == "1":
        return round(8 + haversine(origin, destination) / 48 * 60), "estimated"
    url = f"https://router.project-osrm.org/route/v1/driving/{origin[1]},{origin[0]};{destination[1]},{destination[0]}?overview=false"
    try:
        data = json.loads(fetch(url))
        return round(data["routes"][0]["duration"] / 60), "OSRM"
    except Exception:
        return round(8 + haversine(origin, destination) / 48 * 60), "estimated"

def infer_pool_type(text: str) -> str:
    lowered = text.lower()
    indoor, outdoor = "indoor" in lowered or "pool hall" in lowered, "outdoor" in lowered
    if indoor and outdoor:
        return "Both"
    if indoor:
        return "Indoor"
    if outdoor:
        return "Outdoor"
    return "Unknown"

def infer_trigger(text: str, item: dict) -> tuple[str, str, int]:
    lowered = text.lower()
    if item.get("propertyClass") in ("Managed short-let", "Residential development"):
        return "Managed use", "High", 18
    if "reduced" in lowered:
        return "Price reduction", "High", 18
    if any(term in lowered for term in ("sold stc", "under offer", "sale agreed")):
        return "Ownership change", "High", 18
    if any(term in lowered for term in ("fresh listing", "new listing", "active sale", "current sale", "current knight frank sale", "sale listing")):
        return "Active sale", "Medium", 14
    if "planning" in lowered or "proposal" in lowered or "application" in lowered:
        return "Planning", "Medium", 14
    if NEED_TERMS.search(text):
        return "Age / condition", "Medium", 12
    return "Known pool home", "Low", 7

def contactability(route: str) -> tuple[str, int]:
    lowered = route.lower()
    if any(term in lowered for term in ("property manager", "historic customer", "direct contact")):
        return "Verified", 15
    if any(term in lowered for term in ("selling agent", "estate agent", "savills", "knight frank", "bidwells", "carter jonas", "connells", "planning agent", "architect", "addressed")) or "→" in route:
        return "Available", 12
    return "Needs research", 4

def score(item: dict, distance: int | None) -> tuple[int, dict]:
    confirmed = item.get("poolConfidence") == "Confirmed"
    pool_points = 30 if confirmed else 15 if item.get("poolConfidence") == "Probable" else 5
    text = " ".join(str(item.get(key, "")) for key in ("signal", "pain", "whyNow"))
    need_points = 22 if NEED_TERMS.search(text) else 14 if item.get("poolType") in ("Indoor", "Both") else 8
    trigger_type, trigger_strength, trigger_points = infer_trigger(text, item)
    contact_status, contact_points = contactability(item.get("route", ""))
    distance_points = 10 if distance is not None and distance <= 20 else 8 if distance is not None and distance <= 30 else 5 if distance is not None and distance <= 45 else 0
    total = pool_points + need_points + trigger_points + contact_points + distance_points
    parts = {
        "pool": pool_points, "need": need_points, "trigger": trigger_points,
        "contact": contact_points, "distance": distance_points,
        "triggerType": trigger_type, "triggerStrength": trigger_strength,
        "contactability": contact_status,
    }
    return total, parts

def discover() -> list[dict]:
    if os.environ.get("ACE_OFFLINE") == "1":
        return []
    found = []
    for query in SEARCHES:
        try:
            root = ElementTree.fromstring(fetch("https://www.bing.com/search?format=rss&q=" + quote_plus(query)))
            for entry in root.findall(".//item")[:12]:
                title = (entry.findtext("title") or "").strip()
                url = (entry.findtext("link") or "").strip()
                description = re.sub("<[^>]+>", " ", entry.findtext("description") or "")
                text = f"{title} {description}"
                if not url or not POOL_TERMS.search(text):
                    continue
                found.append({
                    "id": "auto-" + hashlib.sha1(url.encode()).hexdigest()[:12],
                    "prospect": title[:120], "area": "Verify", "postcode": "", "county": "Verify",
                    "signal": description[:300], "pain": "Pool property detected; exact address, current status and contact route need verification.",
                    "offer": "Pool Review", "whyNow": "New public pool signal from today's scan.",
                    "route": "Needs research", "angle": "Verify the property and identify the professional route before contact.",
                    "action": "Confirm the exact property, pool and contact route; then promote it into the pool register.",
                    "url": url, "poolConfidence": "Candidate", "status": "Verify", "autoDiscovered": True,
                    "evidenceDate": datetime.now(timezone.utc).date().isoformat(),
                })
        except Exception as error:
            print(f"search failed: {error}")
    return found

def main():
    DATA.mkdir(exist_ok=True)
    seeds, prior, cache = load(SEEDS, []), load(OUTPUT, {}).get("leads", []), load(CACHE, {})
    origin = geocode(CENTRE_POSTCODE, cache)
    if not origin:
        raise SystemExit("Could not locate Comberton centre")
    candidates = seeds + [item for item in prior if item.get("autoDiscovered")] + discover()
    unique = {}
    for item in candidates:
        key = item.get("propertyId") or item.get("url") or item["id"]
        # Prefer a registered/confirmed record over an auto-discovered candidate.
        if key not in unique or unique[key].get("autoDiscovered"):
            unique[key] = item

    leads = []
    today = datetime.now(timezone.utc).date()
    for lead in unique.values():
        item = dict(lead)
        text = " ".join(str(item.get(key, "")) for key in ("signal", "pain", "whyNow", "prospect"))
        planning = bool(re.search(r"planning|proposal|application", text, re.I))
        former = bool(re.search(r"former pool|pool removed|convert pool house away", text, re.I))
        item.setdefault("poolConfidence", "Candidate" if item.get("autoDiscovered") or former else "Probable" if planning else "Confirmed")
        item.setdefault("status", "Verify" if item.get("autoDiscovered") else "Active")
        item.setdefault("poolType", infer_pool_type(text))
        item.setdefault("propertyClass", "Private home")
        item.setdefault("evidenceDate", "2026-07-11")
        item.setdefault("locationPrecision", "Full postcode" if len(postcode_key(item.get("postcode", ""))) > 4 else "Area only")
        try:
            item["evidenceAgeDays"] = max(0, (today - datetime.fromisoformat(item["evidenceDate"]).date()).days)
        except ValueError:
            item["evidenceAgeDays"] = None

        epc = re.search(r"\bEPC\s*(?:rating\s*)?([A-G])\b", text, re.I)
        fuels = [fuel for fuel in ("gas", "oil", "electric", "air-source heat pump", "solar") if fuel in text.lower()]
        item["energySignal"] = (f"EPC {epc.group(1).upper()}" if epc else "") + ((" · " if epc and fuels else "") + ", ".join(fuels) if fuels else "")
        item["ownershipSignal"] = next((value.title() for value in ("sold stc", "under offer", "sale agreed", "chain-free", "no-chain", "no onward chain") if value in text.lower()), "")

        coords = geocode(item.get("postcode", ""), cache)
        if coords:
            minutes, method = drive_minutes(origin, coords)
            item.update(latitude=round(coords[0], 5), longitude=round(coords[1], 5), driveMinutes=minutes, driveMethod=method, inTerritory=minutes <= MAX_DRIVE_MINUTES)
        else:
            item.update(latitude=None, longitude=None, driveMinutes=None, driveMethod="unverified", inTerritory=False)

        total, parts = score(item, item.get("driveMinutes"))
        item.update(score=total, scoreBreakdown=parts, triggerType=parts["triggerType"], triggerStrength=parts["triggerStrength"], contactability=parts["contactability"])
        actionable = item["poolConfidence"] == "Confirmed" and item["contactability"] in ("Verified", "Available") and item.get("inTerritory")
        item["priority"] = "A" if actionable and total >= 72 else "B" if item["poolConfidence"] == "Confirmed" and item.get("inTerritory") else "C"
        item["actNow"] = item["priority"] == "A"
        item["reasoning"] = f"{item['poolConfidence']} {item['poolType'].lower()} pool. {item['triggerType']} trigger. {item['contactability'].lower()} contact route. {item.get('whyNow', '')}"
        if item.get("inTerritory") or item.get("autoDiscovered"):
            leads.append(item)

    leads.sort(key=lambda item: (item.get("status") == "Verify", not item.get("actNow", False), -item["score"], item.get("driveMinutes") or 999))
    CACHE.write_text(json.dumps(cache, indent=2, sort_keys=True))
    register = [item for item in leads if item.get("poolConfidence") == "Confirmed" and item.get("inTerritory")]
    verify = [item for item in leads if item.get("status") == "Verify"]
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "centre": {"name": "Comberton", "postcode": CENTRE_POSTCODE, "latitude": origin[0], "longitude": origin[1]},
        "maxDriveMinutes": MAX_DRIVE_MINUTES, "count": len(leads),
        "territoryCount": sum(1 for item in leads if item.get("inTerritory")),
        "poolRegisterCount": len(register), "actNowCount": sum(1 for item in register if item.get("actNow")),
        "verifyCount": len(verify), "leads": leads,
    }
    OUTPUT.write_text(json.dumps(payload, indent=2))
    print(f"wrote {len(register)} confirmed pool properties; {payload['actNowCount']} actionable now; {len(verify)} to verify")

if __name__ == "__main__":
    main()
