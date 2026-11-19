"""Refresh the Tax Court rules and opinion indexes in lib/authorities.

Rule headings come from the Tax Court's rules page. Opinion headings come
from the court's Dawson public search. The script stores the citation, the
official heading, and the link used to copy the text into the library.
"""

import json
import re
import time
import urllib.parse
import urllib.request
from datetime import date, timedelta
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "lib" / "authorities"
DAWSON = "https://public-api-green.dawson.ustaxcourt.gov/public-api/opinion-search"
UA = {"User-Agent": "Mozilla/5.0 (compatible; TaxHelping2day-library/1.0)", "Accept": "application/json,text/html"}


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(request, timeout=180) as response:
        return response.read()


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", unescape(value)).strip()


def build_rules() -> None:
    html = fetch("https://www.ustaxcourt.gov/rules/").decode("utf-8", "replace")
    items = []
    seen = set()
    for href, raw in re.findall(r'href="(https://(?:www\.)?ustaxcourt\.gov/files/documents/rule-[^"]+\.pdf)"[^>]*>([^<]+)', html):
        title = clean(raw)
        match = re.match(r"Rule\s+([0-9]+(?:\.[0-9]+)?[A-Za-z]?)\s*\.\s+(.*)$", title)
        if not match or href in seen:
            continue
        seen.add(href)
        number = match.group(1)
        items.append({
            "cite": f"Tax Court Rule {number}",
            "title": match.group(2),
            "href": href,
            "sort": [int(part) if part.isdigit() else part for part in re.findall(r"[0-9]+|[A-Za-z]+", number)],
        })
    items.sort(key=lambda item: item["sort"])
    for item in items:
        del item["sort"]
    payload = {
        "publisher": "United States Tax Court",
        "source": "https://www.ustaxcourt.gov/rules/",
        "asOf": date.today().isoformat(),
        "items": items,
    }
    (OUT / "rules.json").write_text(json.dumps(payload, separators=(",", ":")))
    print(f"Tax Court rules: {len(items)}")


def opinion_window(start: str, end: str, opinion_type: str) -> list[dict]:
    params = urllib.parse.urlencode({
        "dateRange": "customDates",
        "startDate": start,
        "endDate": end,
        "opinionTypes": opinion_type,
    })
    for attempt in range(4):
        try:
            payload = json.loads(fetch(f"{DAWSON}?{params}"))
            return payload.get("results") or []
        except Exception as error:
            if attempt == 3:
                raise
            print(f"retry {opinion_type} {start} {end}: {error}")
            time.sleep(2 * (attempt + 1))
    return []


def collect_opinions(start_year: int, end_year: int, opinion_type: str) -> list[dict]:
    start = f"01/01/{start_year}"
    end = f"12/31/{end_year}" if end_year < date.today().year else date.today().strftime("%m/%d/%Y")
    rows = opinion_window(start, end, opinion_type)
    if len(rows) < 5000 or start_year == end_year:
        print(f"{opinion_type} {start_year}-{end_year}: {len(rows)}")
        return rows
    middle = (start_year + end_year) // 2
    time.sleep(0.3)
    return collect_opinions(start_year, middle, opinion_type) + collect_opinions(middle + 1, end_year, opinion_type)


def build_opinions() -> None:
    rows = []
    for opinion_type in ("TCOP", "MOP", "SOP"):
        rows.extend(collect_opinions(1986, date.today().year, opinion_type))
        time.sleep(0.3)
    items = []
    seen = set()
    for row in rows:
        docket = row.get("docketNumber")
        entry = row.get("docketEntryId")
        if not docket or not entry or entry in seen:
            continue
        seen.add(entry)
        filed = (row.get("filingDate") or "")[:10]
        judge = row.get("judge") or ""
        items.append({
            "cite": clean(row.get("documentTitle") or row.get("documentType") or "Tax Court opinion"),
            "title": " · ".join(part for part in (row.get("caseCaption") or "", f"Judge {judge}" if judge else "", filed) if part),
            "href": f"opinion:{docket}/{entry}",
            "filed": filed,
        })
    items.sort(key=lambda item: item["filed"], reverse=True)
    for item in items:
        del item["filed"]
    payload = {
        "publisher": "United States Tax Court",
        "source": "https://dawson.ustaxcourt.gov/",
        "asOf": date.today().isoformat(),
        "items": items,
    }
    (OUT / "opinions.json").write_text(json.dumps(payload, separators=(",", ":")))
    print(f"Tax Court opinions: {len(items)}")


def order_window(start: date, end: date) -> list[dict]:
    params = urllib.parse.urlencode({
        "dateRange": "customDates",
        "startDate": start.strftime("%m/%d/%Y"),
        "endDate": end.strftime("%m/%d/%Y"),
    })
    url = f"https://public-api-green.dawson.ustaxcourt.gov/public-api/order-search?{params}"
    for attempt in range(4):
        try:
            payload = json.loads(fetch(url))
            return payload.get("results") or []
        except Exception as error:
            if attempt == 3:
                raise
            print(f"retry orders {start} {end}: {error}")
            time.sleep(2 * (attempt + 1))
    return []


def collect_orders(start: date, end: date) -> list[dict]:
    rows = order_window(start, end)
    if len(rows) < 5000 or start >= end:
        print(f"orders {start.isoformat()} {end.isoformat()}: {len(rows)}")
        return rows
    middle = start + (end - start) // 2
    time.sleep(0.2)
    return collect_orders(start, middle) + collect_orders(middle + timedelta(days=1), end)


def build_orders() -> None:
    rows = []
    cursor = date(2024, 1, 1)
    last = date.today()
    while cursor <= last:
        window_end = min(cursor + timedelta(days=13), last)
        rows.extend(collect_orders(cursor, window_end))
        cursor = window_end + timedelta(days=1)
        time.sleep(0.2)
    items = []
    seen = set()
    for row in rows:
        docket = row.get("docketNumber")
        entry = row.get("docketEntryId")
        if not docket or not entry or entry in seen:
            continue
        seen.add(entry)
        filed = (row.get("filingDate") or "")[:10]
        judge = row.get("judge") or ""
        items.append({
            "cite": clean(row.get("documentTitle") or row.get("documentType") or "Tax Court order"),
            "title": " · ".join(part for part in (row.get("caseCaption") or "", f"Judge {judge}" if judge else "", filed) if part),
            "href": f"opinion:{docket}/{entry}",
            "filed": filed,
        })
    items.sort(key=lambda item: item["filed"], reverse=True)
    for item in items:
        del item["filed"]
    payload = {
        "publisher": "United States Tax Court",
        "source": "https://dawson.ustaxcourt.gov/",
        "asOf": date.today().isoformat(),
        "items": items,
    }
    (OUT / "orders.json").write_text(json.dumps(payload, separators=(",", ":")))
    print(f"Tax Court orders: {len(items)}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "orders":
        build_orders()
    else:
        build_rules()
        build_opinions()
