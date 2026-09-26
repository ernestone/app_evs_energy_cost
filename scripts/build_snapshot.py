#!/usr/bin/env python3
"""Build the static snapshot used by Paralelo.

Downloads public files only. If a required download or parse fails, the
script stops and names the source. It does not invent prices.

UK household electricity comes from DESNZ Quarterly Energy Prices table
2.2.5 (overall standard bill at the department's own 3,400 kWh). If that
file cannot be opened, electricity for the United Kingdom is left null.
"""

from __future__ import annotations

import csv
import io
import json
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "snapshot"
UA = "ParaleloSnapshot/1.0 (public-data; contact: local script)"

OIL_PAGE = "https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en"
EUROSTAT_URL = (
    "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_pc_204"
    "?format=JSON&lang=EN&siec=E7000&nrg_cons=KWH2500-4999&unit=KWH&tax=I_TAX"
    "&currency=NAC&lastTimePeriod=8"
)
EIA_GAS_URL = "https://www.eia.gov/petroleum/gasdiesel/xls/pswrgvwall.xls"
EIA_DIESEL_URL = "https://www.eia.gov/petroleum/gasdiesel/xls/psw18vwall.xls"
EIA_ELEC_URL = "https://www.eia.gov/electricity/monthly/xls/table_5_03.xlsx"
UK_FUEL_PAGE = "https://www.gov.uk/government/statistics/weekly-road-fuel-prices"
UK_ELEC_PAGE = "https://www.gov.uk/government/statistical-data-sets/annual-domestic-energy-price-statistics"
EPA_ZIP = "https://www.fueleconomy.gov/feg/epadata/vehicles.csv.zip"
EMBER_URL = "https://storage.googleapis.com/emb-prod-bkt-publicdata/public-downloads/yearly_full_release_long_format.csv"
FRANKFURTER = "https://api.frankfurter.app/latest?from=EUR"

# National currency of the September 2026 snapshot. Bulgaria's euro changeover
# is already reflected by the ECB (no BGN rate on the latest Frankfurter day).
CURRENCY = {
    "AT": "EUR", "BE": "EUR", "BG": "EUR", "HR": "EUR", "CY": "EUR", "CZ": "CZK",
    "DK": "DKK", "EE": "EUR", "FI": "EUR", "FR": "EUR", "DE": "EUR", "GR": "EUR",
    "HU": "HUF", "IE": "EUR", "IT": "EUR", "LV": "EUR", "LT": "EUR", "LU": "EUR",
    "MT": "EUR", "NL": "EUR", "PL": "PLN", "PT": "EUR", "RO": "RON", "SK": "EUR",
    "SI": "EUR", "ES": "EUR", "SE": "SEK", "US": "USD", "GB": "GBP",
}
NON_EURO_FUEL = {"CZ": "CZK", "DK": "DKK", "HU": "HUF", "PL": "PLN", "RO": "RON", "SE": "SEK"}
ISO3 = {
    "AT": "AUT", "BE": "BEL", "BG": "BGR", "HR": "HRV", "CY": "CYP", "CZ": "CZE",
    "DK": "DNK", "EE": "EST", "FI": "FIN", "FR": "FRA", "DE": "DEU", "GR": "GRC",
    "HU": "HUN", "IE": "IRL", "IT": "ITA", "LV": "LVA", "LT": "LTU", "LU": "LUX",
    "MT": "MLT", "NL": "NLD", "PL": "POL", "PT": "PRT", "RO": "ROU", "SK": "SVK",
    "SI": "SVN", "ES": "ESP", "SE": "SWE", "US": "USA", "GB": "GBR",
}
EUROSTAT_GEO = {**{k: k for k in CURRENCY if k not in ("GR", "GB", "US")}, "GR": "EL"}
OIL_NAME = {
    "Austria": "AT", "Belgium": "BE", "Bulgaria": "BG", "Croatia": "HR", "Cyprus": "CY",
    "Czechia": "CZ", "Denmark": "DK", "Estonia": "EE", "Finland": "FI", "France": "FR",
    "Germany": "DE", "Greece": "GR", "Hungary": "HU", "Ireland": "IE", "Italy": "IT",
    "Latvia": "LV", "Lithuania": "LT", "Luxembourg": "LU", "Malta": "MT",
    "Netherlands": "NL", "Poland": "PL", "Portugal": "PT", "Romania": "RO",
    "Slovakia": "SK", "Slovenia": "SI", "Spain": "ES", "Sweden": "SE",
}
NAMES = {
    "AT": ("Austria", "Austria"), "BE": ("Bélgica", "Belgium"), "BG": ("Bulgaria", "Bulgaria"),
    "HR": ("Croacia", "Croatia"), "CY": ("Chipre", "Cyprus"), "CZ": ("Chequia", "Czechia"),
    "DK": ("Dinamarca", "Denmark"), "EE": ("Estonia", "Estonia"), "FI": ("Finlandia", "Finland"),
    "FR": ("Francia", "France"), "DE": ("Alemania", "Germany"), "GR": ("Grecia", "Greece"),
    "HU": ("Hungría", "Hungary"), "IE": ("Irlanda", "Ireland"), "IT": ("Italia", "Italy"),
    "LV": ("Letonia", "Latvia"), "LT": ("Lituania", "Lithuania"), "LU": ("Luxemburgo", "Luxembourg"),
    "MT": ("Malta", "Malta"), "NL": ("Países Bajos", "Netherlands"), "PL": ("Polonia", "Poland"),
    "PT": ("Portugal", "Portugal"), "RO": ("Rumanía", "Romania"), "SK": ("Eslovaquia", "Slovakia"),
    "SI": ("Eslovenia", "Slovenia"), "ES": ("España", "Spain"), "SE": ("Suecia", "Sweden"),
    "US": ("Estados Unidos", "United States"), "GB": ("Reino Unido", "United Kingdom"),
}


def fail(source: str, detail: str) -> None:
    print(f"SNAPSHOT FAILED\nSource: {source}\n{detail}", file=sys.stderr)
    sys.exit(1)


def fetch(url: str, source: str, timeout: int = 180) -> bytes:
    req = Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    try:
        with urlopen(req, timeout=timeout) as res:
            data = res.read()
            if not data:
                fail(source, f"Empty response from {url}")
            return data
    except HTTPError as exc:
        fail(source, f"HTTP {exc.code} for {url}")
    except URLError as exc:
        fail(source, f"Could not open {url}: {exc.reason}")
    except Exception as exc:  # noqa: BLE001 — surface the source name and stop
        fail(source, f"Could not open {url}: {exc}")
    raise AssertionError("unreachable")


def html_links(page_url: str, source: str) -> str:
    return fetch(page_url, source, timeout=60).decode("utf-8", "replace")


def num(value) -> float | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = str(value).strip().replace(",", "")
    if text in ("", "NA", "N/A", "-", "nan", "None"):
        return None
    try:
        return float(text)
    except ValueError:
        return None


def iso_date(value) -> str:
    if isinstance(value, datetime):
        return value.date().isoformat()
    text = str(value).strip()
    if " " in text and text[0:4].isdigit():
        return text[:10]
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(text[:10], fmt).date().isoformat()
        except ValueError:
            continue
    return text[:10]


def frankfurter(date: str | None, source: str) -> dict:
    url = FRANKFURTER if not date else f"https://api.frankfurter.app/{date}?from=EUR"
    payload = json.loads(fetch(url, source, timeout=40).decode())
    rates = {"EUR": 1.0, **{k: float(v) for k, v in payload["rates"].items()}}
    return {"date": payload["date"], "base": "EUR", "rates": rates, "url": "https://www.frankfurter.app", "provider": "Frankfurter (ECB reference rates)"}


def parse_oil(raw: bytes) -> tuple[str, dict[str, tuple[float, float]], str]:
    df = pd.read_excel(io.BytesIO(raw), header=None)
    date = iso_date(df.iloc[1, 0])
    prices: dict[str, tuple[float, float]] = {}
    for _, row in df.iloc[2:].iterrows():
        name = str(row[0]).split("\n")[0].strip()
        code = OIL_NAME.get(name)
        if not code:
            continue
        gas = num(row[1])
        diesel = num(row[2])
        if gas is None or diesel is None:
            fail("European Commission Weekly Oil Bulletin", f"Missing Euro-super 95 or diesel for {name}")
        prices[code] = (gas / 1000.0, diesel / 1000.0)
    missing = [c for c in OIL_NAME.values() if c not in prices]
    if missing:
        fail("European Commission Weekly Oil Bulletin", f"Countries missing from the with-taxes file: {', '.join(missing)}")
    return date, prices, OIL_PAGE


def parse_eurostat(raw: bytes) -> tuple[str, dict[str, tuple[float, str]]]:
    data = json.loads(raw)
    geos = data["dimension"]["geo"]["category"]["index"]
    times = data["dimension"]["time"]["category"]["index"]
    time_by_i = {i: t for t, i in times.items()}
    n_t = len(times)
    values = {int(k): float(v) for k, v in data["value"].items()}
    updated = str(data.get("updated", ""))[:10]
    out: dict[str, tuple[float, str]] = {}
    for code, geo in EUROSTAT_GEO.items():
        if code in ("US", "GB"):
            continue
        if geo not in geos:
            fail("Eurostat nrg_pc_204", f"No row for {code} ({geo})")
        gi = geos[geo]
        latest = None
        for ti in range(n_t - 1, -1, -1):
            flat = gi * n_t + ti
            if flat in values:
                latest = (values[flat], time_by_i[ti])
                break
        if latest is None:
            fail("Eurostat nrg_pc_204", f"No household price for {code}, band 2,500–4,999 kWh, all taxes")
        out[code] = latest
    return updated, out


def latest_eia_column(raw: bytes, sheet: str, source: str) -> tuple[str, float]:
    df = pd.read_excel(io.BytesIO(raw), sheet, header=None)
    last = None
    for _, row in df.iloc[3:].iterrows():
        date = row[0]
        value = num(row[1])
        if value is None or not isinstance(date, datetime):
            continue
        last = (iso_date(date), value)
    if last is None:
        fail(source, f"No US price in sheet {sheet}")
    return last


def parse_eia_electricity(raw: bytes) -> tuple[str, float, str]:
    df = pd.read_excel(io.BytesIO(raw), header=None)
    # Monthly rows sit under "Year YYYY" banners. The latest month is the last
    # named month before "Year to Date".
    months = {
        "january": "01", "february": "02", "march": "03", "april": "04", "may": "05",
        "june": "06", "july": "07", "august": "08", "sept": "09", "september": "09",
        "october": "10", "november": "11", "december": "12",
    }
    year = None
    last = None
    for _, row in df.iterrows():
        label = str(row[0]).strip()
        low = label.lower()
        if low.startswith("year 20"):
            year = label.split()[-1]
            continue
        if low.startswith("year to date") or low.startswith("rolling"):
            break
        if year and low in months:
            value = num(row[1])
            if value is None:
                continue
            last = (f"{year}-{months[low]}", value / 100.0)
    if last is None:
        fail("EIA Electric Power Monthly table 5.3", "No residential monthly price")
    note = "Preliminary where EIA marks the current year as preliminary. National average, all 50 states and DC, not a state price."
    return last[0], last[1], note


def parse_uk_fuel(raw: bytes) -> tuple[str, float, float]:
    text = raw.decode("utf-8-sig")
    rows = list(csv.DictReader(io.StringIO(text)))
    if not rows:
        fail("DESNZ weekly road fuel prices", "CSV has no rows")
    last = rows[-1]
    try:
        date = datetime.strptime(last["Date"], "%d/%m/%Y").date().isoformat()
        petrol = float(last["ULSP (Ultra low sulphur unleaded petrol) Pump price in pence/litre"]) / 100.0
        diesel = float(last["ULSD (Ultra low sulphur diesel) Pump price in pence/litre"]) / 100.0
    except (KeyError, ValueError) as exc:
        fail("DESNZ weekly road fuel prices", f"Could not read the latest pump price: {exc}")
    return date, petrol, diesel


def parse_uk_electricity(raw: bytes) -> dict:
    df = pd.read_excel(io.BytesIO(raw), "Table 2.2.5", header=None)
    header = None
    for _, row in df.iterrows():
        if str(row[0]).strip() == "Year":
            header = [str(c) if pd.notna(c) else "" for c in row]
            break
    if header is None:
        fail("DESNZ QEP table 2.2.5", "Header row not found")
    bill_col = next(i for i, name in enumerate(header) if "3,400kWh" in name and "Cash" in name)
    year = None
    bill = None
    for _, row in df.iterrows():
        if str(row[0]).strip() == "2025" or (isinstance(row[0], (int, float)) and int(row[0]) >= 2020):
            candidate = num(row[bill_col])
            if candidate is None:
                continue
            year = int(row[0])
            bill = candidate
    if year is None or bill is None:
        fail("DESNZ QEP table 2.2.5", "No cash bill at 3,400 kWh")
    kwh = 3400.0
    return {
        "value": bill / kwh,
        "year": year,
        "billGbp": bill,
        "assumedKwh": kwh,
        "published": "2026-07-30",
    }


def parse_ember(raw: bytes) -> dict[str, tuple[int, float]]:
    wanted = set(ISO3.values())
    latest: dict[str, tuple[int, float]] = {}
    reader = csv.DictReader(io.StringIO(raw.decode("utf-8", "replace")))
    for row in reader:
        code = row.get("ISO 3 code")
        if code not in wanted:
            continue
        if row.get("Variable") != "CO2 intensity":
            continue
        if row.get("Category") != "Power sector emissions":
            continue
        value = num(row.get("Value"))
        if value is None:
            continue
        year = int(row["Year"])
        prev = latest.get(code)
        if prev is None or year > prev[0]:
            latest[code] = (year, value)
    missing = [iso for iso, iso3 in ISO3.items() if iso3 not in latest]
    if missing:
        fail("Ember yearly electricity data", f"No CO2 intensity for: {', '.join(missing)}")
    return latest


def fnum(value: str | None) -> float | None:
    if value is None:
        return None
    text = value.strip()
    if text == "":
        return None
    try:
        number = float(text)
    except ValueError:
        return None
    if number < 0:
        return None
    return number


def classify(row: dict) -> tuple[str, str, str] | None:
    year = int(float(row["year"]))
    if year < 2000:
        return None
    atv = (row.get("atvType") or "").strip()
    ft1 = (row.get("fuelType1") or "").strip()
    ft2 = (row.get("fuelType2") or "").strip()
    if atv in ("CNG", "FCV", "Bifuel (CNG)", "Bifuel (LPG)", "eFCV"):
        return None
    if ft1 in ("Natural Gas", "Hydrogen", "Propane"):
        return None
    if atv == "EV" or (ft1 == "Electricity" and atv != "Plug-in Hybrid"):
        return ("ev", "ev", "electricity")
    if "Diesel" in ft1:
        fuel = "diesel"
    elif "Premium" in ft1:
        fuel = "premium"
    elif "Gasoline" in ft1 or ft1 == "Regular":
        fuel = "gasoline"
    else:
        return None
    if atv == "Plug-in Hybrid" or ft2 == "Electricity":
        return ("ice", "phev", fuel)
    if atv == "Hybrid":
        return ("ice", "hev", fuel)
    if atv == "FFV":
        return ("ice", "ffv", "gasoline")
    if atv in ("", "Diesel") or "Gasoline" in ft1 or "Diesel" in ft1:
        kind = "diesel" if fuel == "diesel" else "gasoline"
        return ("ice", kind, fuel)
    return None


def parse_vehicles(raw: bytes) -> tuple[str, list[dict]]:
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        name = archive.namelist()[0]
        info = archive.getinfo(name)
        stamp = datetime(*info.date_time).date().isoformat()
        text = io.TextIOWrapper(archive.open(name), encoding="utf-8", newline="")
        reader = csv.DictReader(text)
        vehicles = []
        for row in reader:
            kind = classify(row)
            if kind is None:
                continue
            side, powertrain, fuel = kind
            city = fnum(row.get("city08U")) or fnum(row.get("city08"))
            hwy = fnum(row.get("highway08U")) or fnum(row.get("highway08"))
            comb = fnum(row.get("comb08U")) or fnum(row.get("comb08"))
            item = {
                "id": int(float(row["id"])),
                "year": int(float(row["year"])),
                "make": row["make"].strip(),
                "model": (row.get("baseModel") or row["model"]).strip(),
                "version": row["model"].strip(),
                "trany": (row.get("trany") or "").strip(),
                "drive": (row.get("drive") or "").strip(),
                "vclass": (row.get("VClass") or "").strip(),
                "side": side,
                "powertrain": powertrain,
                "fuel": fuel,
                "cityMpg": city,
                "hwyMpg": hwy,
                "combMpg": comb,
                "cityE": fnum(row.get("cityE")),
                "hwyE": fnum(row.get("highwayE")),
                "combE": fnum(row.get("combE")),
                "cityUf": fnum(row.get("cityUF")),
                "hwyUf": fnum(row.get("highwayUF")),
                "combUf": fnum(row.get("combinedUF")),
                "cdGalPer100Mi": fnum(row.get("combinedCD")) or 0,
                "co2Gpm": fnum(row.get("co2TailpipeGpm")),
                "rangeMi": fnum(row.get("range")),
                "rangeAMi": fnum(row.get("rangeA")),
                "charge240": fnum(row.get("charge240")),
            }
            if item["rangeMi"] == 0:
                item["rangeMi"] = None
            if item["rangeAMi"] == 0:
                item["rangeAMi"] = None
            if item["charge240"] == 0:
                item["charge240"] = None
            vehicles.append(item)
    if not vehicles:
        fail("fueleconomy.gov vehicles.csv", "No vehicles kept from model year 2000 onward")
    return stamp, vehicles


def find_href(html: str, predicate, source: str) -> str:
    import re

    hrefs = re.findall(r'href="([^"]+)"', html)
    for href in hrefs:
        if predicate(href):
            return href.replace("&amp;", "&")
    fail(source, "Download link not found on the public page")
    raise AssertionError


def absolute(page: str, href: str) -> str:
    if href.startswith("http"):
        return href
    from urllib.parse import urljoin
    return urljoin(page, href)


def main() -> None:
    print("Oil Bulletin…")
    oil_html = html_links(OIL_PAGE, "European Commission Weekly Oil Bulletin")
    oil_href = find_href(
        oil_html,
        lambda href: "with" in href.lower() and "tax" in href.lower() and "download" in href.lower(),
        "European Commission Weekly Oil Bulletin",
    )
    oil_url = absolute(OIL_PAGE, oil_href)
    oil_date, oil_prices, _ = parse_oil(fetch(oil_url, "European Commission Weekly Oil Bulletin"))

    print("Frankfurter…")
    fx_latest = frankfurter(None, "Frankfurter / ECB")
    fx_oil = frankfurter(oil_date, "Frankfurter / ECB (oil bulletin date)")
    fx_bgn = frankfurter("2025-12-31", "Frankfurter / ECB (BGN)")
    if "BGN" not in fx_bgn["rates"]:
        fail("Frankfurter / ECB (BGN)", "No BGN rate on 2025-12-31; Bulgaria electricity cannot be converted without inventing a rate")

    print("Eurostat…")
    euro_updated, euro = parse_eurostat(fetch(EUROSTAT_URL, "Eurostat nrg_pc_204"))

    print("EIA fuels…")
    gas_date, gas_gal = latest_eia_column(fetch(EIA_GAS_URL, "EIA weekly gasoline"), "Data 3", "EIA weekly gasoline")
    diesel_date, diesel_gal = latest_eia_column(fetch(EIA_DIESEL_URL, "EIA weekly diesel"), "Data 1", "EIA weekly diesel")
    gal_to_l = 3.785411784

    print("EIA electricity…")
    elec_period, elec_usd, elec_note = parse_eia_electricity(fetch(EIA_ELEC_URL, "EIA Electric Power Monthly table 5.3"))

    print("DESNZ road fuel…")
    uk_html = html_links(UK_FUEL_PAGE, "DESNZ weekly road fuel prices")
    uk_csv_href = find_href(
        uk_html,
        lambda href: href.endswith(".csv") and "2018" in href,
        "DESNZ weekly road fuel prices",
    )
    uk_fuel_url = absolute(UK_FUEL_PAGE, uk_csv_href)
    uk_date, uk_petrol, uk_diesel = parse_uk_fuel(fetch(uk_fuel_url, "DESNZ weekly road fuel prices"))

    print("DESNZ electricity…")
    uk_elec = None
    uk_elec_error = None
    try:
        elec_html = html_links(UK_ELEC_PAGE, "DESNZ annual domestic energy price statistics")
        elec_href = find_href(
            elec_html,
            lambda href: "table_225" in href or "2.2.5" in href,
            "DESNZ QEP table 2.2.5",
        )
        uk_elec = parse_uk_electricity(fetch(absolute(UK_ELEC_PAGE, elec_href), "DESNZ QEP table 2.2.5"))
        uk_elec["url"] = absolute(UK_ELEC_PAGE, elec_href)
    except SystemExit:
        raise
    except Exception as exc:  # noqa: BLE001
        uk_elec_error = str(exc)
        print(f"UK electricity left blank: {uk_elec_error}")

    print("Ember…")
    ember = parse_ember(fetch(EMBER_URL, "Ember yearly electricity data"))

    print("EPA vehicles…")
    epa_date, vehicles = parse_vehicles(fetch(EPA_ZIP, "fueleconomy.gov vehicles.csv"))

    countries = []
    for code in ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "US", "GB"]:
        currency = CURRENCY[code]
        es, en = NAMES[code]
        grid_year, grid = ember[ISO3[code]]
        if code == "US":
            gasoline = gas_gal / gal_to_l
            diesel = diesel_gal / gal_to_l
            electricity = elec_usd
            fuel_note = "EIA national weekly retail price, dollars per gallon converted with 1 US gallon = 3.785411784 L. Taxes included, as EIA states on the Gasoline and Diesel Fuel Update."
            elec_meta = {
                "value": electricity,
                "date": elec_period,
                "source": "EIA Electric Power Monthly, table 5.3, residential",
                "url": "https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_3",
                "note": elec_note + " Cents per kWh converted to dollars per kWh.",
            }
            gas_meta = {
                "value": gasoline, "date": gas_date,
                "source": "EIA Weekly U.S. Regular All Formulations Retail Gasoline Prices",
                "url": "https://www.eia.gov/petroleum/gasdiesel/",
                "note": fuel_note + f" Published series value {gas_gal} USD/gallon on {gas_date}.",
            }
            diesel_meta = {
                "value": diesel, "date": diesel_date,
                "source": "EIA Weekly U.S. No. 2 Diesel Retail Prices",
                "url": "https://www.eia.gov/petroleum/gasdiesel/",
                "note": fuel_note + f" Published series value {diesel_gal} USD/gallon on {diesel_date}.",
            }
        elif code == "GB":
            gasoline, diesel = uk_petrol, uk_diesel
            gas_meta = {
                "value": gasoline, "date": uk_date,
                "source": "DESNZ weekly road fuel prices, ULSP pump price",
                "url": UK_FUEL_PAGE,
                "note": "Pence per litre converted to pounds per litre. Pump price, duty and VAT included.",
            }
            diesel_meta = {
                "value": diesel, "date": uk_date,
                "source": "DESNZ weekly road fuel prices, ULSD pump price",
                "url": UK_FUEL_PAGE,
                "note": "Pence per litre converted to pounds per litre. Pump price, duty and VAT included.",
            }
            if uk_elec is None:
                electricity = None
                elec_meta = {
                    "value": None,
                    "date": None,
                    "source": "DESNZ",
                    "url": UK_ELEC_PAGE,
                    "note": uk_elec_error or "No reusable household series was opened. Enter a price.",
                }
            else:
                electricity = uk_elec["value"]
                elec_meta = {
                    "value": electricity,
                    "date": str(uk_elec["year"]),
                    "source": "DESNZ Quarterly Energy Prices, table 2.2.5",
                    "url": uk_elec["url"],
                    "note": (
                        f"Overall standard-electricity bill in cash terms for {uk_elec['assumedKwh']:.0f} kWh "
                        f"in {uk_elec['year']}: £{uk_elec['billGbp']:.2f}, divided by those kWh. "
                        "The 3,400 kWh figure is DESNZ's own assumption in that table, not a guess. VAT included. "
                        "It is a household average, not a night rate and not public fast charging."
                    ),
                }
        else:
            gas_eur, diesel_eur = oil_prices[code]
            fx_ccy = NON_EURO_FUEL.get(code)
            if fx_ccy:
                rate = fx_oil["rates"].get(fx_ccy)
                if rate is None:
                    fail("Frankfurter / ECB (oil bulletin date)", f"No {fx_ccy} rate on {fx_oil['date']}")
                gasoline = gas_eur * rate
                diesel = diesel_eur * rate
                fx_note = (
                    f" Oil Bulletin publishes this price in euros ({gas_eur:.5f} EUR/L petrol, {diesel_eur:.5f} EUR/L diesel). "
                    f"Shown in {fx_ccy} with the ECB rate via Frankfurter on {fx_oil['date']}: 1 EUR = {rate} {fx_ccy}. "
                    "The euro price is not replaced."
                )
            else:
                gasoline, diesel = gas_eur, diesel_eur
                fx_note = " Price as published in euros per litre (file is euros per 1,000 litres)."
            gas_meta = {
                "value": gasoline, "date": oil_date,
                "source": "European Commission Weekly Oil Bulletin, Euro-super 95 with taxes",
                "url": OIL_PAGE,
                "eurPerLiter": gas_eur,
                "note": "Consumer price with taxes." + fx_note,
            }
            diesel_meta = {
                "value": diesel, "date": oil_date,
                "source": "European Commission Weekly Oil Bulletin, automotive diesel with taxes",
                "url": OIL_PAGE,
                "eurPerLiter": diesel_eur,
                "note": "Consumer price with taxes." + fx_note,
            }
            nac, period = euro[code]
            if code == "BG":
                bgn_rate = fx_bgn["rates"]["BGN"]
                electricity = nac / bgn_rate
                elec_note = (
                    f"Eurostat national-currency price for 2025-S2 is {nac} BGN/kWh. "
                    f"Bulgaria's prices in this snapshot are in euros. Converted with the ECB rate via Frankfurter "
                    f"on {fx_bgn['date']}: 1 EUR = {bgn_rate} BGN. The lev figure is not replaced."
                )
            else:
                electricity = nac
                elec_note = "National currency per kWh. Band DC, 2,500–4,999 kWh, all taxes and levies included."
            elec_meta = {
                "value": electricity,
                "date": period,
                "source": "Eurostat nrg_pc_204, household electricity",
                "url": "https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_204/default/table",
                "nacPerKwh": nac,
                "note": elec_note + f" Dataset updated {euro_updated}.",
            }

        countries.append({
            "code": code,
            "name": {"es": es, "en": en},
            "currency": currency,
            "gasolinePerLiter": gasoline,
            "dieselPerLiter": diesel,
            "electricityPerKwh": electricity,
            "gasoline": gas_meta,
            "diesel": diesel_meta,
            "electricity": elec_meta,
            "grid": {
                "gPerKwh": grid,
                "year": grid_year,
                "unit": "gCO2/kWh",
                "source": "Ember yearly electricity data, power-sector CO2 intensity",
                "url": "https://ember-energy.org/data/yearly-electricity-data/",
                "license": "CC BY 4.0",
                "licenseUrl": "https://ember-energy.org/creative-commons/",
                "note": "Generation intensity. No grid-loss factor is applied.",
            },
        })

    meta = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "epaFileDate": epa_date,
        "vehicleCount": len(vehicles),
        "modelYearMin": min(v["year"] for v in vehicles),
        "modelYearMax": max(v["year"] for v in vehicles),
        "trimmed": True,
        "trimmedNote": "vehicles.json keeps the fields the screen uses, from model year 2000. MSRP is not included. The raw EPA file is not committed.",
        "fx": fx_latest,
        "fxOilBulletin": {"date": fx_oil["date"], "rates": {k: fx_oil["rates"][k] for k in ("CZK", "DKK", "HUF", "PLN", "RON", "SEK", "USD", "GBP")}},
        "fxBgn": {"date": fx_bgn["date"], "bgnPerEur": fx_bgn["rates"]["BGN"]},
        "upstream": {
            "multiplier": 1.25,
            "surchargeShare": 0.25,
            "appliesTo": "gasoline",
            "citation": "U.S. EPA / fueleconomy.gov: tailpipe CO2 of gasoline is multiplied by 1.25 for upstream production (extraction, refining, distribution). See 75 FR 25437, May 7, 2010.",
            "url": "https://www.fueleconomy.gov/feg/label/calculations-information.shtml",
            "notCountrySpecific": True,
            "notOfficialComparison": True,
            "diesel": "The same page does not publish a separate diesel multiplier, so the switch does not change diesel.",
        },
        "phevIcct": {
            "citation": "Isenstadt, Yang, Searle and German, ICCT, December 2022. Real-world electric drive share may be 26%–56% lower than the EPA label.",
            "url": "https://theicct.org/publication/real-world-phev-us-dec22/",
            "lowCut": 0.26,
            "highCut": 0.56,
            "note": "The two options are the published ends of that range, applied as the same cut to every car. They are not a measurement of the selected model.",
        },
        "ukElectricity": "filled" if uk_elec else "blank",
    }

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "countries.json").write_text(json.dumps(countries, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT / "fx.json").write_text(json.dumps(fx_latest, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    vehicle_path = OUT / "vehicles.json"
    with vehicle_path.open("w", encoding="utf-8") as handle:
        json.dump(vehicles, handle, ensure_ascii=False, separators=(",", ":"))
    print(f"countries {len(countries)} vehicles {len(vehicles)} bytes {vehicle_path.stat().st_size}")
    print(f"years {meta['modelYearMin']}-{meta['modelYearMax']} uk electricity {meta['ukElectricity']}")


if __name__ == "__main__":
    main()
