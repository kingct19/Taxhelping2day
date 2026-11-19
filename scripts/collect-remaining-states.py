#!/usr/bin/env python3
"""Collect official state tax decisions for jurisdictions that still have no pack.

Each row is a document the office itself published. Nothing is invented.
"""

from __future__ import annotations

import json
import re
import subprocess
import time
from datetime import date
from html import unescape
from pathlib import Path
from urllib.parse import urljoin, urlsplit

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "lib" / "authorities" / "state-decisions"
AS_OF = date.today().isoformat()
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)


def fetch(url: str) -> tuple[str, str]:
    result = subprocess.run(
        [
            "curl",
            "-sS",
            "-L",
            "--max-time",
            "40",
            "-A",
            UA,
            "-H",
            "Accept: text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
            "-H",
            "Sec-Fetch-Dest: document",
            "-H",
            "Sec-Fetch-Mode: navigate",
            "-H",
            "Sec-Fetch-Site: none",
            "-H",
            "Upgrade-Insecure-Requests: 1",
            "-w",
            "\n__CURL__%{http_code}",
            "--",
            url,
        ],
        capture_output=True,
    )
    raw = result.stdout
    marker = b"\n__CURL__"
    cut = raw.rfind(marker)
    body = raw[:cut].decode("utf-8", "replace") if cut >= 0 else ""
    code = raw[cut + len(marker) :].decode().strip() if cut >= 0 else "err"
    if code in {"403", "429", "503"}:
        time.sleep(2)
    return code, body


def clean(value: str) -> str:
    text = unescape(re.sub(r"<[^>]+>", " ", value))
    return re.sub(r"\s+", " ", text).strip()


def links(html: str, page: str) -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    for href, text in re.findall(r'href="([^"]+)"[^>]*>([\s\S]*?)</a>', html):
        href = unescape(href).strip()
        if href.startswith("#") or href.startswith("mailto:") or href.startswith("tel:"):
            continue
        found.append((urljoin(page, href), clean(text)))
    return found


def add(items: list[dict[str, str]], seen: set[str], cite: str, title: str, href: str) -> None:
    href = href.split("#")[0]
    if not href.startswith("http") or href in seen or not cite:
        return
    seen.add(href)
    items.append({"cite": cite[:180], "title": title[:240], "href": href})


def illinois() -> list[dict[str, str]]:
    url = (
        "https://taxtribunal.illinois.gov/content/soi/taxtribunal/en/decisions-rulings/"
        "jcr:content/responsivegrid/container/data_table.datatablejson.json"
    )
    code, body = fetch(url)
    print("illinois", code, len(body))
    data = json.loads(body)["data"]
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    for row in data:
        match = re.search(r'href="([^"]+)"[^>]*>([\s\S]*?)</a>', row[0])
        if not match:
            continue
        href = urljoin("https://taxtribunal.illinois.gov/", unescape(match.group(1)))
        docket = clean(match.group(2))
        case = clean(row[3]) if len(row) > 3 else ""
        subject = clean(row[4]) if len(row) > 4 else ""
        issued = clean(row[2]) if len(row) > 2 else ""
        title = " · ".join(part for part in (case, subject, issued) if part)
        add(items, seen, f"Illinois Tax Tribunal {docket}", title or docket, href)
    return items


def maryland() -> list[dict[str, str]]:
    page = "https://taxcourt.maryland.gov/Decisions.shtml"
    code, html = fetch(page)
    print("maryland", code, len(html))
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    for href, text in links(html, page):
        if "/pdf/decisions/" not in href.lower():
            continue
        name = text.split("Decided")[0].strip(" ,")
        add(items, seen, name or Path(urlsplit(href).path).name, f"Maryland Tax Court · {name}", href)
    return items


def kansas() -> list[dict[str, str]]:
    page = "https://bota.kansas.gov/decisions-orders/published-decisions/"
    code, html = fetch(page)
    print("kansas", code, len(html))
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    for href, text in links(html, page):
        if "selected_decisions" not in href.lower() or not href.lower().endswith(".pdf"):
            continue
        add(items, seen, text or Path(urlsplit(href).path).stem, f"Kansas Board of Tax Appeals · {text}", href)
    return items


def new_jersey() -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    for base, kind in (
        ("https://www.njcourts.gov/attorneys/opinions/published-tax", "Published"),
        ("https://www.njcourts.gov/attorneys/opinions/unpublished-tax", "Unpublished"),
    ):
        for page_no in range(0, 40):
            page = base if page_no == 0 else f"{base}?page={page_no}"
            code, html = fetch(page)
            added = 0
            for href, text in links(html, page):
                if "/court-opinions/" not in href.lower() or not href.lower().endswith(".pdf"):
                    continue
                before = len(items)
                add(items, seen, text, f"New Jersey Tax Court · {kind} · {text}", href)
                added += len(items) - before
            print("new jersey", kind, page_no, code, "added", added, "total", len(items))
            if added == 0:
                break
    return items


def west_virginia() -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    for year in range(2018, 2027):
        for page_no in range(0, 80):
            url = (
                "https://taxappeals.wv.gov/decisions"
                f"?field_issue_date_value=01/01/{year}&field_issue_date_value_1=12/31/{year}&page={page_no}"
            )
            code, html = fetch(url)
            added = 0
            for href, text in links(html, url):
                if not re.search(r"/media/\d+/download", href):
                    continue
                label = text or f"{year} decision"
                before = len(items)
                add(items, seen, f"West Virginia OTA {label}", f"West Virginia Office of Tax Appeals · {year} · {label}", href)
                added += len(items) - before
            print("west virginia", year, "page", page_no, code, "added", added, "total", len(items))
            if added == 0:
                break
    return items


def arizona() -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    for page_no in range(1, 25):
        url = f"https://bota.az.gov/resources/decisions?page={page_no}"
        code, html = fetch(url)
        added = 0
        for href, text in links(html, url):
            if not href.lower().endswith(".pdf"):
                continue
            if "decision" not in href.lower() and "doc" not in href.lower() and ".pdf" not in text.lower():
                continue
            before = len(items)
            label = re.sub(r"\s*pdf\s*$", "", text, flags=re.I).strip() or Path(urlsplit(href).path).stem
            add(items, seen, label, f"Arizona Board of Tax Appeals · {label}", href)
            added += len(items) - before
        print("arizona", page_no, code, "added", added, "total", len(items))
        if code != "200" or added == 0:
            break
    return items


def colorado() -> list[dict[str, str]]:
    page = "https://tax.colorado.gov/all-letter-rulings"
    code, html = fetch(page)
    print("colorado", code, len(html))
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    if code != "200":
        return items
    for href, text in links(html, page):
        blob = f"{href} {text}"
        if not re.search(r"PLR|GIL|letter-ruling|letter_ruling", blob, re.I):
            continue
        if not href.lower().endswith((".pdf", ".html", ".htm")) and "sites/tax" not in href:
            continue
        add(items, seen, text, f"Colorado Department of Revenue · {text}", href)
    return items


def maine() -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    url = (
        "https://digitalmaine.com/do/oai/"
        "?verb=ListRecords&metadataPrefix=oai_dc&set=publication:tax_appeals_decisions"
    )
    token = ""
    for _ in range(20):
        code, xml = fetch(url if not token else f"https://digitalmaine.com/do/oai/?verb=ListRecords&resumptionToken={token}")
        print("maine", code, len(xml))
        if code != "200" or "<record>" not in xml:
            break
        for record in re.findall(r"<record>([\s\S]*?)</record>", xml):
            titles = re.findall(r"<dc:title>([\s\S]*?)</dc:title>", record)
            identifiers = re.findall(r"<dc:identifier>([\s\S]*?)</dc:identifier>", record)
            title = clean(titles[0]) if titles else ""
            pdfs = [clean(item) for item in identifiers if clean(item).lower().endswith(".pdf") or "viewcontent" in clean(item)]
            href = pdfs[0] if pdfs else next((clean(item) for item in identifiers if clean(item).startswith("http")), "")
            if href:
                add(items, seen, title or "Maine Board of Tax Appeals decision", f"Maine Board of Tax Appeals · {title}", href)
        token_match = re.search(r"<resumptionToken[^>]*>([^<]+)</resumptionToken>", xml)
        token = token_match.group(1).strip() if token_match else ""
        if not token:
            break
    if items:
        return items
    page = "https://digitalmaine.com/tax_appeals_decisions/"
    code, html = fetch(page)
    print("maine html", code, len(html))
    for href, text in links(html, page):
        if "/tax_appeals_decisions/" not in href:
            continue
        if href.rstrip("/").endswith("tax_appeals_decisions"):
            continue
        add(items, seen, text, f"Maine Board of Tax Appeals · {text}", href)
    return items


def louisiana() -> list[dict[str, str]]:
    page = "http://labta.louisiana.gov/decisions.html"
    code, html = fetch(page)
    print("louisiana", code, len(html))
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    if code != "200":
        return items
    for href, text in links(html, page):
        lower = href.lower()
        if not lower.endswith((".pdf", ".doc", ".docx")):
            continue
        add(items, seen, text or Path(urlsplit(href).path).stem, f"Louisiana Board of Tax Appeals · {text}", href)
    return items


def massachusetts() -> list[dict[str, str]]:
    pages = [
        "https://www.mass.gov/lists/atb-findings-of-fact-and-reports",
        "https://www.mass.gov/info-details/state-agency-decisions-and-opinions",
    ]
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    for page in pages:
        code, html = fetch(page)
        print("massachusetts", code, len(html), page.rsplit("/", 1)[-1])
        if code != "200":
            continue
        for href, text in links(html, page):
            if not href.lower().endswith(".pdf"):
                continue
            if "atb" not in href.lower() and "tax" not in f"{href} {text}".lower():
                continue
            add(items, seen, text, f"Massachusetts Appellate Tax Board · {text}", href)
    return items


def iowa() -> list[dict[str, str]]:
    page = "https://revenue.iowa.gov/resources/law-policy-information/administrative-orders"
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    pending = [page]
    visited: set[str] = set()
    while pending and len(visited) < 8:
        url = pending.pop(0)
        if url in visited:
            continue
        visited.add(url)
        code, html = fetch(url)
        added = 0
        for href, text in links(html, url):
            if "/media/" in href and "/download" in href:
                before = len(items)
                add(items, seen, text, f"Iowa Department of Revenue · {text}", href.split("?")[0] + "?inline")
                added += len(items) - before
            if "page=" in href and href.startswith(page):
                pending.append(href.replace("&amp;", "&"))
        print("iowa", code, "added", added, "total", len(items), "queued", len(pending))
    return items


def north_carolina() -> list[dict[str, str]]:
    page = "https://www.ncdor.gov/taxes-forms/information-tax-professionals/contested-tax-cases-and-tax-hearing-decisions"
    code, html = fetch(page)
    print("north carolina", code, len(html))
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    rows = re.findall(
        r'<a href="(/documents/[^"]+)">([^<]+)</a>(?:</p>)?\s*</td>\s*<td[^>]*>(?:\s*<p>)?([^<]*)(?:</p>)?\s*</td>\s*<td[^>]*>(?:\s*<p>)?([\s\S]*?)(?:</p>)?\s*</td>',
        html,
    )
    for href, docket, decided, issue in rows:
        issue_text = clean(issue)
        add(
            items,
            seen,
            f"North Carolina DOR {clean(docket)}",
            f"Decided {clean(decided)} · {issue_text}",
            urljoin(page, unescape(href)),
        )
    return items


def arkansas() -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    page = "https://ig.arkansas.gov/tax-appeals-commission/ig-decisions-search/"
    for year in range(2019, 2027):
        result = subprocess.run(
            [
                "curl", "-sS", "-L", "--max-time", "30", "-A", UA,
                "-o", "/tmp/ar-year.html",
                "-w", "%{http_code}",
                "--data", f"postID=metl-4470&content=&docket_number=&decision_month=&decision_year={year}&tax_type=",
                page,
            ],
            capture_output=True,
        )
        code = result.stdout.decode().strip()
        html = Path("/tmp/ar-year.html").read_text("utf-8", "replace")
        added = 0
        for href, text in links(html, page):
            if not href.lower().endswith(".pdf"):
                continue
            if "power-of-attorney" in href.lower() or "form" in text.lower():
                continue
            before = len(items)
            add(items, seen, text or Path(urlsplit(href).path).stem, f"Arkansas Tax Appeals Commission · {year} · {text}", href)
            added += len(items) - before
        print("arkansas", year, code, "added", added, "total", len(items), "pdf", html.lower().count(".pdf"))
    return items


def connecticut() -> list[dict[str, str]]:
    start = "https://portal.ct.gov/drs/publications/rulings"
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    for page_no in range(0, 45):
        page = start if page_no == 0 else f"{start}?page={page_no}"
        code, html = fetch(page)
        added = 0
        for href, text in links(html, page):
            if "/rulings/" not in href.lower() or not re.search(r"\bruling\b", text, re.I):
                continue
            if re.search(r"\d{4}\s+rulings", text, re.I):
                continue
            before = len(items)
            add(items, seen, text, f"Connecticut Department of Revenue Services · {text}", href)
            added += len(items) - before
        print("connecticut", page_no, code, "added", added, "total", len(items))
        if added == 0:
            break
    return items


def vermont() -> list[dict[str, str]]:
    page = "https://tax.vermont.gov/tax-law-and-guidance/formal-rulings"
    code, html = fetch(page)
    print("vermont", code, len(html))
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    for href, text in links(html, page):
        if "/formal-rulings/fr-" not in href:
            continue
        number = href.rstrip("/").rsplit("/", 1)[-1].upper()
        add(items, seen, f"Vermont {number}", f"{text} · Vermont Department of Taxes", href)
    return items


def south_carolina() -> list[dict[str, str]]:
    base = (
        "https://www.dor.sc.gov/advisory-opinion-search"
        "?search_api_fulltext=&field_tax_category=All&field_year=All"
        "&field_advisory_opinion_type=All&field_status=All"
    )
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    kept_kinds = {
        "revenue ruling",
        "private letter ruling",
        "private revenue opinion",
        "technical advice memorandum",
        "temporary revenue ruling",
    }
    for page_no in range(0, 250):
        page = base if page_no == 0 else f"{base}&page={page_no}"
        code, html = fetch(page)
        added = 0
        found = 0
        for chunk in re.findall(r"<tr>([\s\S]*?)</tr>", html):
            href_match = re.search(r'<td[^>]*views-field-name[^>]*>\s*<a href="(/[^"?]+)"', chunk)
            policy_match = re.search(r'views-field-field-policy-id[^>]*>\s*([A-Za-z0-9-]{3,})', chunk)
            kind_match = re.search(r'views-field-field-advisory-opinion-type[^>]*>\s*([^<]+)', chunk)
            name_match = re.search(r'<td[^>]*views-field-name[^>]*>\s*<a[^>]*>([\s\S]*?)</a>', chunk)
            if not href_match or not policy_match or not kind_match or not name_match:
                continue
            href = href_match.group(1)
            policy_id = policy_match.group(1).strip()
            kind = clean(kind_match.group(1))
            name = name_match.group(1)
            found += 1
            if kind.lower() not in kept_kinds:
                continue
            before = len(items)
            add(
                items,
                seen,
                f"South Carolina {policy_id}",
                f"{kind} · {clean(name)}",
                urljoin("https://www.dor.sc.gov/", unescape(href)),
            )
            added += len(items) - before
        print("south carolina", page_no, code, "rows", found, "added", added, "total", len(items))
        if found == 0:
            break
    return items


COLLECTORS = {
    "illinois": ("Illinois", "Illinois Independent Tax Tribunal", illinois),
    "maryland": ("Maryland", "Maryland Tax Court", maryland),
    "kansas": ("Kansas", "Kansas Board of Tax Appeals", kansas),
    "new-jersey": ("New Jersey", "New Jersey Tax Court", new_jersey),
    "west-virginia": ("West Virginia", "West Virginia Office of Tax Appeals", west_virginia),
    "arizona": ("Arizona", "Arizona Board of Tax Appeals", arizona),
    "colorado": ("Colorado", "Colorado Department of Revenue", colorado),
    "maine": ("Maine", "Maine Board of Tax Appeals", maine),
    "louisiana": ("Louisiana", "Louisiana Board of Tax Appeals", louisiana),
    "massachusetts": ("Massachusetts", "Massachusetts Appellate Tax Board", massachusetts),
    "iowa": ("Iowa", "Iowa Department of Revenue", iowa),
    "north-carolina": ("North Carolina", "North Carolina Department of Revenue", north_carolina),
    "arkansas": ("Arkansas", "Arkansas Tax Appeals Commission", arkansas),
    "connecticut": ("Connecticut", "Connecticut Department of Revenue Services", connecticut),
    "vermont": ("Vermont", "Vermont Department of Taxes", vermont),
    "south-carolina": ("South Carolina", "South Carolina Department of Revenue", south_carolina),
}


def save(slug: str, state: str, office: str, items: list[dict[str, str]]) -> None:
    if len(items) < 3:
        print("skip", slug, len(items))
        return
    payload = {"state": state, "office": office, "asOf": AS_OF, "items": items}
    (OUT / f"{slug}.json").write_text(json.dumps(payload, indent=2) + "\n")
    print("wrote", slug, len(items))


def prefix_for(href: str) -> str | None:
    if "contentdm.oclc.org" in href:
        return None
    url = urlsplit(href)
    if url.scheme != "https" or url.username:
        return None
    if "rec=" in url.query and "/Decision/" in url.path:
        return f"{url.scheme}://{url.netloc}{url.path}?rec="
    if re.search(r"/media/\d+/download", url.path):
        return f"{url.scheme}://{url.netloc}/media/"
    original = url.path
    path = original
    if not path.endswith("/"):
        path = path.rsplit("/", 1)[0] + "/"
    parts = [part for part in path.split("/") if part]
    cut = None
    for index, part in enumerate(parts):
        lowered = part.lower()
        if any(word in lowered for word in ("decision", "opinion", "ruling")):
            cut = index
    if cut is None:
        for index, part in enumerate(parts):
            if "upload" in part.lower():
                cut = index
    if cut is not None:
        path = "/" + "/".join(parts[: cut + 1]) + "/"
    if path in {"", "/"}:
        slug = original.strip("/")
        if slug and "/" not in slug:
            return f"{url.scheme}://{url.netloc}{original}"
        return None
    return f"{url.scheme}://{url.netloc}{path}"


def rebuild_catalog() -> None:
    index: dict[str, dict[str, object]] = {}
    prefixes: set[str] = set()
    missed: list[str] = []
    for path in sorted(OUT.glob("*.json")):
        if path.name == "index.json":
            continue
        payload = json.loads(path.read_text())
        index[path.stem] = {
            "count": len(payload["items"]),
            "asOf": payload["asOf"],
            "office": payload["office"],
        }
        for item in payload["items"]:
            prefix = prefix_for(item["href"])
            if prefix:
                prefixes.add(prefix)
            elif item["href"].startswith("https://") and "contentdm.oclc.org" not in item["href"]:
                missed.append(item["href"])
    (OUT / "index.json").write_text(json.dumps(index, indent=2) + "\n")
    (ROOT / "lib" / "authorities" / "state-prefixes.json").write_text(
        json.dumps(sorted(prefixes), indent=2) + "\n"
    )
    print("index", len(index), "prefixes", len(prefixes), "unlisted https", len(missed))
    for href in missed[:8]:
        print(" unlisted", href[:140])


def main() -> None:
    import sys

    chosen = [arg for arg in sys.argv[1:] if arg != "--index"]
    for slug in chosen:
        state, office, collector = COLLECTORS[slug]
        try:
            save(slug, state, office, collector())
        except Exception as error:  # noqa: BLE001 — one state must not stop the rest
            print("failed", slug, type(error).__name__, error)
    if not chosen or "--index" in sys.argv[1:]:
        rebuild_catalog()


if __name__ == "__main__":
    main()
