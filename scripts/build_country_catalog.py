#!/usr/bin/env python3
"""Snapshot country model lists from public catalogs.

EU-27 comes from the EEA passenger-car CO2 viewer (public Elasticsearch
API, no login). Each figure is the most frequent published value in the
latest reporting year for that commercial name and fuel class. It is not
an average, and it is not converted from CO2.

The United Kingdom is not in that file. The VCA car-fuel database download
is unavailable, so this script records that failure and does not copy
another country's list into the UK.

The United States list stays the EPA snapshot already in vehicles.json.
"""

from __future__ import annotations

import json
import sys
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "snapshot" / "country-catalog.json"
UA = "ParaleloSnapshot/1.0 (public-data; country catalog)"
API = "https://co2cars.apps.eea.europa.eu/tools/api"
VIEWER = "https://co2cars.apps.eea.europa.eu/"
LICENSE = "CC BY 2.5 DK"
LICENSE_URL = "http://creativecommons.org/licenses/by/2.5/dk/deed.en_GB"
VCA_URL = "https://www.vehicle-certification-agency.gov.uk/information-for-cars/"
VCA_DETAIL = (
    "Due to technical issues, the latest version of the data is not currently available. "
    "The VCA page says this about the downloadable car fuel and CO2 database."
)

EU = [
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
    "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
    "SI", "ES", "SE",
]

ALLOWED = {
    "ev": {"electric"},
    "phev": {"petrol", "diesel", "petrol/electric", "diesel/electric"},
    "hybrid": {"petrol", "diesel", "petrol/electric", "diesel/electric"},
    "mono": {"petrol", "diesel"},
}


def fail(detail: str) -> None:
    print(f"SNAPSHOT FAILED\nSource: European Environment Agency CO2 passenger cars\n{VIEWER}\n{detail}", file=sys.stderr)
    sys.exit(1)


def query(body: dict, attempt: int = 0) -> dict:
    url = API + "?source=" + urllib.parse.quote(json.dumps(body, separators=(",", ":")))
    req = Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urlopen(req, timeout=240) as res:
            data = json.loads(res.read().decode())
    except HTTPError as exc:
        err = exc.read()[:400].decode("utf-8", "replace")
        if attempt < 4 and exc.code in (429, 500, 502, 503, 504):
            time.sleep(4 * (attempt + 1))
            return query(body, attempt + 1)
        fail(f"HTTP {exc.code} for {API}: {err}")
    except URLError as exc:
        if attempt < 4:
            time.sleep(4 * (attempt + 1))
            return query(body, attempt + 1)
        fail(f"Could not open {API}: {exc.reason}")
    except Exception as exc:  # noqa: BLE001
        fail(f"Could not open {API}: {exc}")
    if not isinstance(data, dict) or "aggregations" not in data and "hits" not in data:
        fail(f"Unexpected response from {API}")
    return data


def figure_aggs() -> dict:
    weight = {"w": {"sum": {"field": "r"}}}
    zr = {"terms": {"field": "Zr", "size": 1, "order": {"w": "desc"}}, "aggs": weight}
    z = {"terms": {"field": "z__Wh_km_", "size": 1, "order": {"w": "desc"}}, "aggs": {**weight, "zr": zr}}
    co2 = {"terms": {"field": "Ewltp__g_km_", "size": 1, "order": {"w": "desc"}}, "aggs": {**weight, "z": z}}
    fc_vals = {
        "terms": {"field": "Fc", "size": 1, "order": {"w": "desc"}},
        "aggs": {**weight, "co2": co2},
    }
    z_vals = {
        "terms": {"field": "z__Wh_km_", "size": 1, "order": {"w": "desc"}},
        "aggs": {
            **weight,
            "co2": {"terms": {"field": "Ewltp__g_km_", "size": 1, "order": {"w": "desc"}}, "aggs": {**weight, "zr": zr}},
        },
    }
    return {
        "by_year": {
            "terms": {"field": "year", "size": 1, "order": {"_key": "desc"}},
            "aggs": {
                "fc": {"filter": {"exists": {"field": "Fc"}}, "aggs": {"vals": fc_vals}},
                "zonly": {
                    "filter": {"bool": {"must": [{"exists": {"field": "z__Wh_km_"}}], "must_not": [{"exists": {"field": "Fc"}}]}},
                    "aggs": {"vals": z_vals},
                },
            },
        }
    }


def classify(pass_name: str, ft: str) -> tuple[str, str, str] | None:
    ft = ft.lower()
    if ft not in ALLOWED[pass_name]:
        return None
    diesel = ft.startswith("diesel")
    if pass_name == "ev":
        return ("ev", "ev", "electricity")
    fuel = "diesel" if diesel else "gasoline"
    if pass_name == "phev":
        return ("ice", "phev", fuel)
    if pass_name == "hybrid":
        return ("ice", "hev", fuel)
    if ft == "petrol":
        return ("ice", "gasoline", "gasoline")
    if ft == "diesel":
        return ("ice", "diesel", "diesel")
    return None


def rounded_fc(value: float) -> float:
    return round(float(value), 1)


def from_bucket(bucket: dict, country: str, pass_name: str) -> dict | None:
    mk = str(bucket["key"].get("mk", "")).strip()
    cn = str(bucket["key"].get("cn", "")).strip()
    ft = "electric" if pass_name == "ev" else str(bucket["key"].get("ft", "")).strip()
    if not mk or not cn:
        return None
    kind = classify(pass_name, ft)
    if kind is None:
        return None
    years = bucket["by_year"]["buckets"]
    if not years:
        return None
    node = years[0]
    year = int(node["key"])
    fc = co2 = z = zr = None
    weight = 0.0
    fc_vals = node["fc"]["vals"]["buckets"]
    z_vals = node["zonly"]["vals"]["buckets"]
    if fc_vals:
        fc = rounded_fc(fc_vals[0]["key"])
        weight = float(fc_vals[0]["w"]["value"])
        co2s = fc_vals[0]["co2"]["buckets"]
        if co2s:
            co2 = int(co2s[0]["key"])
            zs = co2s[0]["z"]["buckets"]
            if zs and kind[1] in ("ev", "phev"):
                z = int(zs[0]["key"])
                zrs = zs[0]["zr"]["buckets"]
                if zrs:
                    zr = int(zrs[0]["key"])
    elif z_vals and kind[1] == "ev":
        z = int(z_vals[0]["key"])
        weight = float(z_vals[0]["w"]["value"])
        co2s = z_vals[0]["co2"]["buckets"]
        if co2s:
            co2 = int(co2s[0]["key"])
        zrs = z_vals[0]["co2"]["buckets"][0]["zr"]["buckets"] if co2s and z_vals[0]["co2"]["buckets"][0].get("zr") else []
        # zr sits under co2 in the zonly agg
        if co2s:
            zrs = co2s[0]["zr"]["buckets"]
            if zrs:
                zr = int(zrs[0]["key"])
    if weight < 5:
        return None
    if kind[1] == "ev" and z is None:
        return None
    if kind[1] != "ev" and fc is None:
        return None
    side, powertrain, fuel = kind
    kwh = round(z / 10, 1) if z is not None and powertrain in ("ev", "phev") else None
    return {
        "country": country,
        "make": mk,
        "model": cn,
        "side": side,
        "powertrain": powertrain,
        "fuel": fuel,
        "year": year,
        "lPer100km": fc if powertrain != "ev" else None,
        "co2GPerKm": co2,
        "kwhPer100km": kwh,
        "electricRangeKm": zr if powertrain in ("ev", "phev") else None,
        "chargeSustainingLPer100km": None,
        "registrations": int(round(weight)),
    }


def pages(q: dict, sources: list, aggs: dict):
    after = None
    while True:
        composite: dict = {"size": 400, "sources": sources}
        if after:
            composite["after"] = after
        data = query({"size": 0, "query": q, "aggs": {"models": {"composite": composite, "aggs": aggs}}})
        block = data["aggregations"]["models"]
        buckets = block["buckets"]
        yield buckets
        after = block.get("after_key")
        if not after or not buckets:
            break


def country_rows(code: str) -> list[dict]:
    rows: list[dict] = []
    aggs = figure_aggs()
    passes = [
        ("ev", [{"term": {"FtTrim": "electric"}}], [{"mk": {"terms": {"field": "Mk"}}}, {"cn": {"terms": {"field": "Cn"}}}]),
        (
            "phev",
            [{"term": {"Fm": "P"}}],
            [{"mk": {"terms": {"field": "Mk"}}}, {"cn": {"terms": {"field": "Cn"}}}, {"ft": {"terms": {"field": "FtTrim"}}}],
        ),
        (
            "hybrid",
            [{"term": {"Fm": "H"}}],
            [{"mk": {"terms": {"field": "Mk"}}}, {"cn": {"terms": {"field": "Cn"}}}, {"ft": {"terms": {"field": "FtTrim"}}}],
        ),
        (
            "mono",
            [{"term": {"Fm": "M"}}],
            [{"mk": {"terms": {"field": "Mk"}}}, {"cn": {"terms": {"field": "Cn"}}}, {"ft": {"terms": {"field": "FtTrim"}}}],
        ),
    ]
    for name, extra, sources in passes:
        q = {
            "bool": {
                "must": [{"term": {"MS": code}}, {"range": {"year": {"gte": 2021}}}, *extra],
                "must_not": [{"term": {"Cn": ""}}, {"term": {"Mk": ""}}],
            }
        }
        seen = 0
        for buckets in pages(q, sources, aggs):
            for bucket in buckets:
                row = from_bucket(bucket, code, name)
                if row:
                    rows.append(row)
            seen += len(buckets)
            print(f"  {code} {name} {seen}", flush=True)
    return rows


def index_name() -> str:
    data = query({"size": 1, "query": {"term": {"MS": "ES"}}})
    hits = data.get("hits", {}).get("hits", [])
    if not hits:
        fail("No Spain sample row, so the index name could not be recorded.")
    return str(hits[0].get("_index") or "")


def main() -> None:
    print("EEA country catalogs…", flush=True)
    index = index_name()
    if not index:
        fail("The viewer response did not name an index.")
    print("index", index, flush=True)
    models: list[dict] = []
    for code in EU:
        print(code, flush=True)
        models.extend(country_rows(code))
    qashqai = [
        row for row in models
        if row["country"] == "ES" and row["make"] == "NISSAN" and "QASHQAI" in row["model"] and row["powertrain"] != "ev"
    ]
    if not qashqai:
        fail("Spain Nissan Qashqai was not in the aggregated catalog. Stopped without writing a file.")
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "eu": {
            "status": "ok",
            "source": "European Environment Agency, Monitoring of CO2 emissions from passenger cars",
            "url": VIEWER,
            "index": index,
            "retrieved": datetime.now(timezone.utc).date().isoformat(),
            "years": "2021-2025 reporting years in that index",
            "license": LICENSE,
            "licenseUrl": LICENSE_URL,
            "regulation": "Regulation (EU) 2019/631",
            "countries": EU,
            "note": (
                "Each row is one commercial name, fuel class, and member state. "
                "Litres/100 km are the most frequent Fc value in the latest reporting year, "
                "and g/km is the most frequent Ewltp among those same rows. "
                "Electric kWh/100 km is Z (Wh/km) divided by 10, only for battery EVs and plug-in hybrids. "
                "Nothing is averaged and nothing is converted between EPA and WLTP. "
                "Names with fewer than 5 registrations on that figure are left out. "
                "The file does not publish a separate charge-sustaining column, so that field is null."
            ),
        },
        "gb": {
            "status": "failed",
            "source": "UK Vehicle Certification Agency, New Car Fuel Consumption and Emissions database",
            "url": VCA_URL,
            "retrieved": datetime.now(timezone.utc).date().isoformat(),
            "detail": VCA_DETAIL,
        },
        "us": {
            "status": "ok",
            "source": "U.S. EPA / DOE, fueleconomy.gov",
            "url": "https://www.fueleconomy.gov/feg/ws/index.shtml",
            "cycle": "EPA",
        },
        "modelCount": len(models),
        "models": models,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUT} models={len(models)} qashqai={len(qashqai)}", flush=True)
    for row in qashqai:
        print(" ", row["model"], row["powertrain"], row["year"], row["lPer100km"], row["co2GPerKm"], row["registrations"])


if __name__ == "__main__":
    main()
