"""Fill the remaining authoritative shelves from the offices that publish them.

Each list is the official index: IRS publications, the Internal Revenue Manual,
Actions on Decision, practice units, the Internal Revenue Bulletin, income-tax
treaties, exchange rates, and federal court opinions from GovInfo.
"""

import json
import re
import time
import urllib.request
from datetime import date
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "lib" / "authorities"
UA = {"User-Agent": "Mozilla/5.0 (compatible; TaxHelping2day-library/1.0)", "Accept": "text/html,application/json"}
TODAY = date.today().isoformat()


def fetch(url: str) -> str:
    request = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read().decode("utf-8", "replace")


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", " ", value))).strip()


def absolute(href: str) -> str:
    if href.startswith("https://"):
        return href
    if href.startswith("/"):
        return f"https://www.irs.gov{href}"
    return href


def write(name: str, source: str, items: list[dict]) -> None:
    unique = []
    seen = set()
    for item in items:
        href = item.get("href") or ""
        if not href or href in seen:
            continue
        seen.add(href)
        unique.append({"cite": item["cite"], "title": item["title"], "href": href})
    payload = {"publisher": "Official publisher", "source": source, "asOf": TODAY, "items": unique}
    (OUT / name).write_text(json.dumps(payload, separators=(",", ":")))
    print(f"{name}: {len(unique)}")


def publications() -> None:
    html = fetch("https://www.irs.gov/publications")
    items = []
    for row in re.findall(r"<tr[^>]*>([\s\S]*?)</tr>", html):
        cells = re.findall(r"<td[^>]*>([\s\S]*?)</td>", row)
        if len(cells) < 3:
            continue
        title = clean(cells[0])
        pdf = re.search(r'href="([^"]+\.pdf)"', cells[2])
        if not title or not pdf:
            continue
        items.append({"cite": title, "title": "IRS publication", "href": absolute(pdf.group(1))})
    write("publications.json", "https://www.irs.gov/publications", items)


def manual() -> None:
    index = fetch("https://www.irs.gov/irm")
    parts = re.findall(r'href="(https://www\.irs\.gov/irm/part\d+)"[^>]*>([^<]+)', index)
    items = []
    counsel = []
    for href, label in parts:
        part = clean(label)
        time.sleep(0.15)
        page = fetch(href)
        sections = re.findall(r'href="(https://www\.irs\.gov/irm/part\d+/irm_[^"]+)"[^>]*>([^<]+)', page)
        print(f"  {part}: {len(sections)}")
        for section_href, section_title in sections:
            item = {"cite": clean(section_title), "title": part, "href": section_href}
            items.append(item)
            if "/irm/part32/" in section_href:
                counsel.append(item)
    write("irm.json", "https://www.irs.gov/irm", items)
    write("counsel.json", "https://www.irs.gov/irm/part32", counsel)


def actions() -> None:
    html = fetch("https://www.irs.gov/actions-on-decisions")
    items = []
    for href, text in re.findall(r'href="([^"]*irs-aod/[^"]+\.pdf)"[^>]*>([\s\S]*?)</a>', html):
        title = clean(text) or href.rsplit("/", 1)[-1]
        items.append({"cite": title, "title": "Action on Decision", "href": absolute(href)})
    write("aod.json", "https://www.irs.gov/actions-on-decisions", items)


def practice_units() -> None:
    html = fetch("https://www.irs.gov/businesses/corporations/practice-units")
    items = []
    for row in re.findall(r"<tr[^>]*>([\s\S]*?)</tr>", html):
        link = re.search(r'href="([^"]+\.pdf)"[^>]*>([\s\S]*?)</a>', row)
        if not link:
            continue
        title = clean(link.group(2)).removesuffix("PDF").strip()
        if not title:
            continue
        items.append({"cite": title, "title": "LB&I practice unit", "href": absolute(link.group(1))})
    write("practice-units.json", "https://www.irs.gov/businesses/corporations/practice-units", items)


def guides() -> None:
    html = fetch("https://www.irs.gov/businesses/small-businesses-self-employed/audit-techniques-guides-atgs")
    items = []
    for href, text in re.findall(r'href="([^"]+)"[^>]*>([\s\S]*?)</a>', html):
        title = clean(text)
        target = absolute(href)
        if "irs.gov" not in target or not title or len(title) < 8:
            continue
        if any(skip in target for skip in ("/es/", "/zh-", "/ko/", "/ru/", "/vi/", "/ht/", "about-form", "javascript")):
            continue
        if "audit" in target or "guide" in title.lower() or target.endswith(".pdf"):
            items.append({"cite": title, "title": "Audit Technique Guide", "href": target})
    write("guides.json", "https://www.irs.gov/businesses/small-businesses-self-employed/audit-techniques-guides-atgs", items)


def bulletins() -> None:
    items = []
    for year in range(2018, date.today().year + 1):
        url = "https://www.irs.gov/irb" if year == date.today().year else f"https://www.irs.gov/irb/{year}"
        try:
            html = fetch(url)
        except Exception as error:
            print(f"  bulletin {year}: {error}")
            continue
        found = 0
        for href, text in re.findall(r'href="([^"]+)"[^>]*>([\s\S]*?)</a>', html):
            target = absolute(href)
            if not re.search(r"/irb/\d{4}-\d+_IRB|irs-irbs/irb\d+", target, re.I):
                continue
            title = clean(text) or target.rsplit("/", 1)[-1]
            if target.lower().endswith(".pdf"):
                continue
            items.append({"cite": title, "title": f"Internal Revenue Bulletin {year}", "href": target})
            found += 1
        print(f"  bulletins {year}: {found}")
        time.sleep(0.15)
    write("bulletins.json", "https://www.irs.gov/irb", items)


def treaties() -> None:
    html = fetch("https://www.irs.gov/businesses/international-businesses/united-states-income-tax-treaties-a-to-z")
    countries = []
    for href, text in re.findall(r'href="([^"]+)"[^>]*>([\s\S]*?)</a>', html):
        title = clean(text)
        target = absolute(href)
        if "tax-treaty-documents" not in target or not title:
            continue
        countries.append((title, target))
    items = []
    for name, page_url in countries:
        time.sleep(0.12)
        try:
            page = fetch(page_url)
        except Exception as error:
            print(f"  treaty {name}: {error}")
            items.append({"cite": name, "title": "Income tax treaty", "href": page_url})
            continue
        docs = []
        for href, text in re.findall(r'href="([^"]+\.pdf)"[^>]*>([\s\S]*?)</a>', page):
            label = clean(text) or "Treaty document"
            docs.append({"cite": f"{name} — {label}", "title": "Income tax treaty", "href": absolute(href)})
        items.extend(docs or [{"cite": name, "title": "Income tax treaty documents", "href": page_url}])
    write("treaties.json", "https://www.irs.gov/businesses/international-businesses/united-states-income-tax-treaties-a-to-z", items)


def rates() -> None:
    html = fetch("https://www.irs.gov/individuals/international-taxpayers/yearly-average-currency-exchange-rates")
    table = re.search(r"<table[\s\S]*?</table>", html)
    items = []
    if table:
        rows = re.findall(r"<tr[^>]*>([\s\S]*?)</tr>", table.group(0))
        headers = [clean(cell) for cell in re.findall(r"<t[dh][^>]*>([\s\S]*?)</t[dh]>", rows[0])] if rows else []
        for row in rows[1:]:
            cells = [clean(cell) for cell in re.findall(r"<t[dh][^>]*>([\s\S]*?)</t[dh]>", row)]
            if len(cells) < 2:
                continue
            place, currency = cells[0], cells[1]
            yearly = []
            for index, value in enumerate(cells[2:], start=2):
                year = headers[index] if index < len(headers) else ""
                if year and value:
                    yearly.append(f"{year}: {value}")
            slug = re.sub(r"[^a-z0-9]+", "-", f"{place}-{currency}".lower()).strip("-")
            items.append({
                "cite": f"{place}, {currency}",
                "title": " · ".join(yearly) or "Yearly average exchange rate",
                "href": f"https://www.irs.gov/individuals/international-taxpayers/yearly-average-currency-exchange-rates#{slug}",
            })
    write("rates.json", "https://www.irs.gov/individuals/international-taxpayers/yearly-average-currency-exchange-rates", items)


def faqs() -> None:
    html = fetch("https://www.irs.gov/faqs")
    items = []
    for href, text in re.findall(r'href="([^"]+)"[^>]*>([\s\S]*?)</a>', html):
        title = clean(text)
        target = absolute(href)
        if not title or "/faqs/" not in target or target.rstrip("/").endswith("/faqs"):
            continue
        if any(lang in target for lang in ("/es/", "/zh-", "/ko/", "/ru/", "/vi/", "/ht/")):
            continue
        items.append({"cite": title, "title": "IRS frequently asked questions", "href": target})
    write("faqs.json", "https://www.irs.gov/faqs", items)


def govinfo(query: str, pages: int) -> list[dict]:
    items = []
    offset = "*"
    for _ in range(pages):
        body = json.dumps({
            "query": query,
            "pageSize": 100,
            "offsetMark": offset,
            "sorts": [{"field": "publishdate", "sortOrder": "DESC"}],
        }).encode()
        request = urllib.request.Request(
            "https://api.govinfo.gov/search",
            data=body,
            headers={**UA, "Content-Type": "application/json", "X-Api-Key": "DEMO_KEY"},
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            payload = json.loads(response.read().decode("utf-8"))
        rows = payload.get("results") or []
        if not rows:
            break
        for row in rows:
            package = row.get("packageId") or ""
            granule = row.get("granuleId") or ""
            if not package.startswith("USCOURTS-") or not granule.startswith(package):
                continue
            court = (row.get("governmentAuthor") or ["Federal court"])[0]
            items.append({
                "cite": row.get("title") or "Federal opinion",
                "title": " · ".join(part for part in (court, row.get("dateIssued") or "") if part),
                "href": f"federal:{package}/{granule}",
            })
        nxt = payload.get("offsetMark")
        if not nxt or nxt == offset or len(rows) < 100:
            break
        offset = nxt
        time.sleep(0.15)
    return items


def courts() -> None:
    tax = '("Internal Revenue Code" OR "Internal Revenue Service" OR "26 U.S.C.")'
    write("federal.json", "https://www.govinfo.gov/", govinfo(f"collection:USCOURTS {tax}", 25))
    write("supreme.json", "https://www.supremecourt.gov/", govinfo(f'collection:USCOURTS governmentauthor:("Supreme Court of the United States") {tax}', 10))
    write("appeals.json", "https://www.uscourts.gov/", govinfo(f'collection:USCOURTS governmentauthor:("Court of Appeals") {tax}', 15))
    write("claims.json", "https://www.uscfc.uscourts.gov/", govinfo(f'collection:USCOURTS governmentauthor:("Court of Federal Claims") {tax}', 10))


if __name__ == "__main__":
    publications()
    actions()
    practice_units()
    guides()
    faqs()
    rates()
    bulletins()
    treaties()
    manual()
    courts()
