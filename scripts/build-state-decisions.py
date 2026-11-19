#!/usr/bin/env python3
"""Index official state tax decisions from the offices that publish them.

The script only keeps documents linked on those official pages. It does not
invent docket numbers or copy another publisher's compilation.
"""

from __future__ import annotations

import json
import re
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "lib" / "authorities" / "state-decisions"
AS_OF = "2026-11-19"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

# Official starting pages. A miss is skipped; nothing is invented from a guess.
STATES: list[tuple[str, str, list[str]]] = [
    ("Alabama", "Alabama Tax Tribunal", ["https://www.taxtribunal.alabama.gov/decisions/"]),
    ("Alaska", "Alaska Office of Administrative Hearings", ["https://aws.state.ak.us/OAH/Category/Item?cat=127"]),
    ("Arizona", "Arizona Board of Tax Appeals", ["https://bota.az.gov/"]),
    ("Arkansas", "Arkansas Department of Finance and Administration", ["https://www.dfa.arkansas.gov/"]),
    ("California", "California Office of Tax Appeals", ["https://ota.ca.gov/opinions/"]),
    ("Colorado", "Colorado Department of Revenue", ["https://tax.colorado.gov/private-letter-rulings", "https://tax.colorado.gov/letter-rulings"]),
    ("Connecticut", "Connecticut Department of Revenue Services", ["https://portal.ct.gov/drs"]),
    ("Delaware", "Delaware Tax Appeal Board", ["https://revenue.delaware.gov/"]),
    ("District of Columbia", "District of Columbia Office of Administrative Hearings", ["https://oah.dc.gov/"]),
    ("Florida", "Florida Division of Administrative Hearings", ["https://www.doah.state.fl.us/FLAIO/", "https://floridarevenue.com/rules/Pages/technical-assistance-advisements.aspx"]),
    ("Georgia", "Georgia Tax Tribunal", ["https://gataxtribunal.georgia.gov/"]),
    ("Hawaii", "Hawaii Department of Taxation", ["https://tax.hawaii.gov/legal/"]),
    ("Idaho", "Idaho Board of Tax Appeals", ["https://bta.idaho.gov/recent-decisions/"]),
    ("Illinois", "Illinois Independent Tax Tribunal", ["https://taxtribunal.illinois.gov/"]),
    ("Indiana", "Indiana Department of Revenue", ["https://www.in.gov/dor/legal-resources/letters-of-findings/"]),
    ("Iowa", "Iowa Department of Revenue", ["https://tax.iowa.gov/"]),
    ("Kansas", "Kansas Board of Tax Appeals", ["https://www.kansas.gov/bota/", "https://ksrevenue.gov/bota.html"]),
    ("Kentucky", "Kentucky Board of Tax Appeals", ["https://bta.ky.gov/", "https://kbta.ky.gov/"]),
    ("Louisiana", "Louisiana Board of Tax Appeals", ["https://labta.louisiana.gov/"]),
    ("Maine", "Maine Board of Tax Appeals", ["https://www.maine.gov/revenue/"]),
    ("Maryland", "Maryland Tax Court", ["https://www.mdcourts.gov/taxcourt", "https://www.courts.state.md.us/taxcourt"]),
    ("Massachusetts", "Massachusetts Appellate Tax Board", ["https://www.mass.gov/lists/appellate-tax-board-decisions", "https://www.mass.gov/orgs/appellate-tax-board"]),
    ("Michigan", "Michigan Tax Tribunal", ["https://www.michigan.gov/taxtrib/entire-tribunal/decisions"]),
    ("Minnesota", "Minnesota Tax Court", ["https://mn.gov/tax-court/"]),
    ("Mississippi", "Mississippi Board of Tax Appeals", ["https://www.dor.ms.gov/"]),
    ("Missouri", "Missouri Administrative Hearing Commission", ["https://ahc.mo.gov/", "https://stc.mo.gov/"]),
    ("Montana", "Montana Tax Appeal Board", ["https://mtrevenue.gov/"]),
    ("Nebraska", "Nebraska Department of Revenue", ["https://revenue.nebraska.gov/"]),
    ("Nevada", "Nevada Tax Commission", ["https://tax.nv.gov/"]),
    ("New Hampshire", "New Hampshire Board of Tax and Land Appeals", ["https://www.nh.gov/btla/"]),
    ("New Jersey", "New Jersey Tax Court", ["https://www.njcourts.gov/attorneys/opinions/tax"]),
    ("New Mexico", "New Mexico Taxation and Revenue Department", ["https://www.tax.newmexico.gov/"]),
    ("New York", "New York Tax Appeals Tribunal", ["https://dta.ny.gov/decisions/", "https://dta.ny.gov/decisions/orders.htm"]),
    ("North Carolina", "North Carolina Department of Revenue", ["https://www.ncdor.gov/"]),
    ("North Dakota", "North Dakota Office of State Tax Commissioner", ["https://www.tax.nd.gov/"]),
    ("Ohio", "Ohio Board of Tax Appeals", ["https://bta.ohio.gov/", "https://tax.ohio.gov/professional/legal/final-determinations"]),
    ("Oklahoma", "Oklahoma Tax Commission", ["https://oklahoma.gov/tax.html"]),
    ("Oregon", "Oregon Tax Court", ["https://www.courts.oregon.gov/publications/tax/pages/tax-regular.aspx", "https://www.courts.oregon.gov/publications/tax/pages/tax-magistrate.aspx"]),
    ("Pennsylvania", "Pennsylvania Department of Revenue", ["https://www.revenue.pa.gov/", "https://www.boardoffinanceandrevenue.pa.gov/"]),
    ("Rhode Island", "Rhode Island Division of Taxation", ["https://tax.ri.gov/guidance/declaratory-rulings", "https://tax.ri.gov/"]),
    ("South Carolina", "South Carolina Administrative Law Court", ["https://alc.sc.gov/", "https://dor.sc.gov/"]),
    ("South Dakota", "South Dakota Department of Revenue", ["https://dor.sd.gov/"]),
    ("Tennessee", "Tennessee Department of Revenue", ["https://www.tn.gov/revenue/tax-resources/legal-resources.html"]),
    ("Texas", "Texas Comptroller of Public Accounts", ["https://comptroller.texas.gov/taxes/", "https://star.comptroller.texas.gov/"]),
    ("Utah", "Utah State Tax Commission", ["https://tax.utah.gov/commission/decisions", "https://tax.utah.gov/commission/private-letter-rulings"]),
    ("Vermont", "Vermont Department of Taxes", ["https://tax.vermont.gov/laws-and-guidance"]),
    ("Virginia", "Virginia Tax", ["https://www.tax.virginia.gov/laws-rules-decisions/rulings-tax-commissioner", "https://www.tax.virginia.gov/laws-rules-decisions"]),
    ("Washington", "Washington Board of Tax Appeals", ["https://bta.wa.gov/search-appeal-decisions", "https://bta.wa.gov/"]),
    ("West Virginia", "West Virginia Office of Tax Appeals", ["https://taxappeals.wv.gov/"]),
    ("Wisconsin", "Wisconsin Tax Appeals Commission", ["https://taxappeals.wi.gov/pages/Decisions/All.aspx"]),
    ("Wyoming", "Wyoming State Board of Equalization", ["https://revenue.wyo.gov/"]),
]

FOLLOW = re.compile(r"decision|opinion|ruling|determination|precedent|appeal|letter", re.I)
FILE_EXT = (".pdf", ".doc", ".docx")
SKIP_TEXT = re.compile(r"^(home|contact|search|next|previous|menu|facebook|twitter|linkedin|youtube|skip|back to top)$", re.I)


def state_key(name: str) -> str:
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", name.lower())).strip("-")


def clean(value: str) -> str:
    text = unescape(re.sub(r"<[^>]+>", " ", value))
    return re.sub(r"\s+", " ", text).strip()


def official_host(host: str) -> bool:
    lowered = host.lower()
    return lowered.endswith(".gov") or lowered.endswith(".us") or ".state." in lowered


class Fetcher:
    def get(self, url: str, accept: str = "text/html,application/xhtml+xml,application/json") -> tuple[int, str, bytes]:
        last_error: Exception | None = None
        for attempt in range(3):
            completed = subprocess.run(
                [
                    "curl", "-sS", "-L", "--max-time", "40",
                    "-A", UA,
                    "-H", f"Accept: {accept}",
                    "-H", "Accept-Language: en-US,en;q=0.9",
                    "-w", "\n__CURL__%{http_code} %{url_effective}",
                    url,
                ],
                capture_output=True,
            )
            raw = completed.stdout
            marker = b"\n__CURL__"
            split = raw.rfind(marker)
            if completed.returncode != 0 or split < 0:
                last_error = RuntimeError(completed.stderr.decode("utf-8", "replace")[:240] or "curl failed")
                if attempt == 2:
                    raise last_error
                time.sleep(1 + attempt)
                continue
            body = raw[:split]
            meta = raw[split + len(marker):].decode("utf-8", "replace").strip().split(" ", 1)
            code = int(meta[0])
            final = meta[1] if len(meta) > 1 else url
            if code in (403, 429, 503) and attempt < 2:
                time.sleep(2 + attempt * 2)
                continue
            if code >= 400:
                raise urllib.error.HTTPError(url, code, "curl", None, None)
            return code, final, body
        if isinstance(last_error, Exception):
            raise last_error
        raise RuntimeError(url)


def links_in(html: str, page_url: str) -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    for href, text in re.findall(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>([\s\S]*?)</a>', html, re.I):
        if href.startswith(("#", "mailto:", "javascript:", "tel:")):
            continue
        absolute = urllib.parse.urljoin(page_url, href)
        parsed = urllib.parse.urlsplit(absolute)
        if parsed.scheme != "https" or not official_host(parsed.netloc):
            continue
        cleaned = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, parsed.query, ""))
        found.append((cleaned, clean(text)))
    return found


def is_file(url: str) -> bool:
    path = urllib.parse.urlsplit(url).path.lower()
    return path.endswith(FILE_EXT)


def prefix_for(href: str) -> str:
    parsed = urllib.parse.urlsplit(href)
    base = f"{parsed.scheme}://{parsed.netloc}"
    parts = parsed.path.split("/")
    cut = max(1, len(parts) - 1)
    for index, part in enumerate(parts):
        label = urllib.parse.unquote(part).lower()
        if any(token in label for token in ("decision", "opinion", "ruling", "upload")):
            cut = index + 1
            break
    folder = "/".join(parts[:cut])
    if not folder.endswith("/"):
        folder += "/"
    if "rec=" in parsed.query and "decision" in parsed.path.lower():
        return f"{base}{parsed.path}?rec="
    return base + folder


def add_item(bucket: list[dict[str, str]], prefixes: set[str], cite: str, title: str, href: str) -> None:
    if not href.startswith("https://") or not cite:
        return
    if any(item["href"] == href for item in bucket):
        return
    prefixes.add(prefix_for(href))
    bucket.append({"cite": cite[:180], "title": (title or cite)[:300], "href": href})


def harvest(fetcher: Fetcher, start_urls: list[str], office: str, bucket: list[dict[str, str]], prefixes: set[str], page_limit: int = 40) -> None:
    seen: set[str] = set()
    queue: list[tuple[str, int]] = [(url, 0) for url in start_urls]
    while queue and len(seen) < page_limit and len(bucket) < 5000:
        url, depth = queue.pop(0)
        if url in seen or is_file(url):
            continue
        seen.add(url)
        try:
            status, final, body = fetcher.get(url)
        except Exception as error:
            print(f"  skip {url} ({error})", flush=True)
            continue
        if status != 200:
            continue
        html = body.decode("utf-8", "replace")
        host = urllib.parse.urlsplit(final).netloc
        for href, text in links_in(html, final):
            label = text if text and not SKIP_TEXT.match(text) else ""
            link_host = urllib.parse.urlsplit(href).netloc
            if is_file(href):
                name = urllib.parse.unquote(Path(urllib.parse.urlsplit(href).path).name)
                on_decision_page = bool(FOLLOW.search(urllib.parse.urlsplit(final).path))
                looks_like_decision = bool(FOLLOW.search(href) or FOLLOW.search(label) or FOLLOW.search(name))
                junk = bool(re.search(r"org-chart|agenda|minutes|brochure|handbook|calendar|newsletter", name, re.I))
                if (on_decision_page or looks_like_decision) and not junk:
                    cite = label or name
                    add_item(bucket, prefixes, cite, f"{office} · {cite}", href)
                continue
            if depth >= 2 or link_host != host or href in seen:
                continue
            if FOLLOW.search(urllib.parse.urlsplit(href).path) or FOLLOW.search(label):
                queue.append((href, depth + 1))
        time.sleep(0.2)


def wordpress_decisions(fetcher: Fetcher, origin: str, office: str, bucket: list[dict[str, str]], prefixes: set[str]) -> bool:
    try:
        _status, _final, body = fetcher.get(f"{origin}/wp-json/wp/v2/types", accept="application/json")
        types = json.loads(body.decode("utf-8", "replace"))
    except Exception:
        return False
    names = [name for name in ("decisions", "decision", "opinions", "opinion") if name in types]
    if not names:
        return False
    for name in names:
        page = 1
        while page <= 40 and len(bucket) < 5000:
            endpoint = f"{origin}/wp-json/wp/v2/{name}?per_page=100&page={page}&orderby=date&order=desc"
            try:
                status, _final, body = fetcher.get(endpoint, accept="application/json")
            except Exception as error:
                print(f"  wp {name} page {page} ({error})", flush=True)
                break
            if status != 200:
                break
            rows = json.loads(body.decode("utf-8", "replace"))
            if not isinstance(rows, list) or not rows:
                break
            for row in rows:
                title = clean(str((row.get("title") or {}).get("rendered") or ""))
                link = str(row.get("link") or "")
                issued = str(row.get("date") or "")[:10]
                if title and link.startswith("https://"):
                    add_item(bucket, prefixes, title, f"{office} · {issued}".strip(" ·"), link)
            if len(rows) < 100:
                break
            page += 1
            time.sleep(0.15)
    if any(item["href"].startswith(origin) for item in bucket):
        prefixes.add(origin.rstrip("/") + "/wp-content/uploads/")
    return bool(bucket)


def alaska(fetcher: Fetcher, bucket: list[dict[str, str]], prefixes: set[str]) -> None:
    data = urllib.parse.urlencode({"CategoryId": "127", "FieldId": "3", "SortId": "5"}).encode()
    request = urllib.request.Request(
        "https://aws.state.ak.us/OAH/Category/Sort",
        data=data,
        headers={
            "User-Agent": UA,
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "text/html",
            "Referer": "https://aws.state.ak.us/OAH/Category/Item?cat=127",
        },
    )
    with urllib.request.urlopen(request, timeout=40) as response:
        html = response.read().decode("utf-8", "replace")
    for cell in re.findall(r"<td>([\s\S]*?)</td>", html):
        recs = re.findall(r'href="/OAH/Decision/Display\?rec=(\d+)"', cell)
        blurb = re.search(r"<p>([\s\S]*?)</p>", cell)
        summary = clean(blurb.group(1)) if blurb else ""
        for rec in recs:
            href = f"https://aws.state.ak.us/OAH/Decision/Display?rec={rec}"
            add_item(bucket, prefixes, f"Alaska OAH Decision {rec}", summary or f"Alaska Office of Administrative Hearings · Decision No. {rec}", href)
    prefixes.add("https://aws.state.ak.us/OAH/Decision/Display?rec=")
    prefixes.add("https://aws.state.ak.us/OAH/Decision/Download?rec=")


def alabama(fetcher: Fetcher, bucket: list[dict[str, str]], prefixes: set[str]) -> None:
    origin = "https://www.taxtribunal.alabama.gov"
    terms: dict[str, dict[int, str]] = {}
    for taxonomy in ("appeal-type", "decision-type"):
        terms[taxonomy] = {}
        try:
            _status, _final, body = fetcher.get(f"{origin}/wp-json/wp/v2/{taxonomy}?per_page=100", accept="application/json")
            for term in json.loads(body.decode("utf-8", "replace")):
                terms[taxonomy][int(term["id"])] = clean(str(term.get("name") or ""))
        except Exception as error:
            print(f"  alabama terms {taxonomy} ({error})", flush=True)
    page = 1
    while page <= 30:
        endpoint = f"{origin}/wp-json/wp/v2/decisions?per_page=100&page={page}&orderby=date&order=desc"
        _status, _final, body = fetcher.get(endpoint, accept="application/json")
        rows = json.loads(body.decode("utf-8", "replace"))
        if not isinstance(rows, list) or not rows:
            break
        for row in rows:
            docket = clean(str((row.get("title") or {}).get("rendered") or ""))
            link = str(row.get("link") or "")
            issued = str(row.get("date") or "")[:10]
            appeal_ids = row.get("appeal-type") or []
            decision_ids = row.get("decision-type") or []
            appeal = terms["appeal-type"].get(int(appeal_ids[0]), "") if appeal_ids else ""
            decision = terms["decision-type"].get(int(decision_ids[0]), "") if decision_ids else ""
            detail = " · ".join(part for part in (appeal, decision, issued) if part)
            if docket and link.startswith("https://"):
                add_item(bucket, prefixes, f"Alabama Tax Tribunal {docket}", detail or "Alabama Tax Tribunal", link)
        print(f"  alabama page {page} running total {len(bucket)}", flush=True)
        if len(rows) < 100:
            break
        page += 1
        time.sleep(0.15)
    prefixes.add("https://www.taxtribunal.alabama.gov/decisions/")
    prefixes.add("https://www.taxtribunal.alabama.gov/wp-content/uploads/")


def wisconsin(fetcher: Fetcher, bucket: list[dict[str, str]], prefixes: set[str]) -> None:
    letters = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    for letter in letters:
        url = f"https://taxappeals.wi.gov/Pages/Decision%20Pages/All/{letter}.aspx"
        try:
            _status, final, body = fetcher.get(url)
        except Exception as error:
            print(f"  wisconsin {letter} ({error})", flush=True)
            continue
        html = body.decode("utf-8", "replace")
        before = len(bucket)
        for href, text in links_in(html, final):
            if not is_file(href) and "decision" not in urllib.parse.urlsplit(href).path.lower():
                continue
            if is_file(href) or "/Pages/Decision" in href:
                cite = text or letter
                if cite.upper() == letter and is_file(href):
                    cite = urllib.parse.unquote(Path(urllib.parse.urlsplit(href).path).name)
                if len(cite) < 2 or SKIP_TEXT.match(cite):
                    continue
                add_item(bucket, prefixes, cite, f"Wisconsin Tax Appeals Commission · {cite}", href)
        print(f"  wisconsin {letter} +{len(bucket) - before}", flush=True)
        time.sleep(0.25)
    prefixes.add("https://taxappeals.wi.gov/Pages/Decision")


def california(fetcher: Fetcher, bucket: list[dict[str, str]], prefixes: set[str]) -> None:
    pages = ["https://ota.ca.gov/opinions/", "https://ota.ca.gov/all-precedential-franchise-and-income-tax-opinions/", "https://ota.ca.gov/all-precedential-business-tax-opinions/"]
    for year in range(2018, 2027):
        pages.append(f"https://ota.ca.gov/{year}-franchise-income-tax-opinions/")
        pages.append(f"https://ota.ca.gov/{year}-business-tax-opinions/")
    harvest(fetcher, pages, "California Office of Tax Appeals", bucket, prefixes, page_limit=len(pages))


def new_york(fetcher: Fetcher, bucket: list[dict[str, str]], prefixes: set[str]) -> None:
    pages = ["https://dta.ny.gov/decisions/", "https://dta.ny.gov/decisions/orders.htm"]
    for year in range(1990, 2027):
        pages.append(f"https://dta.ny.gov/decisions/{year}.htm")
    seen: set[str] = set()
    for url in pages:
        if url in seen:
            continue
        seen.add(url)
        try:
            _status, final, body = fetcher.get(url)
        except Exception:
            continue
        html = body.decode("utf-8", "replace")
        before = len(bucket)
        for row in re.findall(r"<tr[\s\S]*?</tr>", html, re.I):
            match = re.search(r'href="([^"]+\.pdf)"[^>]*>([\s\S]*?)</a>', row, re.I)
            if not match:
                continue
            href = urllib.parse.urljoin(final, match.group(1))
            name = clean(match.group(2))
            issued = ""
            dates = re.findall(r">([A-Z][a-z]+ \d{1,2}, \d{4})<", row)
            if dates:
                issued = dates[-1]
            if name and href.startswith("https://"):
                add_item(bucket, prefixes, name, f"New York Tax Appeals Tribunal · {issued}".strip(" ·"), href)
        if before == len(bucket):
            harvest(fetcher, [final], "New York Tax Appeals Tribunal", bucket, prefixes, page_limit=1)
        else:
            print(f"  new york {url} +{len(bucket) - before}", flush=True)
        time.sleep(0.15)


def write_state(name: str, office: str, items: list[dict[str, str]]) -> None:
    if not items:
        return
    payload = {"state": name, "office": office, "asOf": AS_OF, "items": items}
    (OUT / f"{state_key(name)}.json").write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"{name}: {len(items)}", flush=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    index: dict[str, dict[str, object]] = {}
    prefixes: set[str] = set()
    for name, office, urls in STATES:
        print(f"collecting {name}", flush=True)
        existing = OUT / f"{state_key(name)}.json"
        if existing.exists():
            saved = json.loads(existing.read_text(encoding="utf-8"))
            saved_items = saved.get("items") or []
            if len(saved_items) >= 20:
                for item in saved_items:
                    prefixes.add(prefix_for(str(item.get("href") or "")))
                index[state_key(name)] = {
                    "count": len(saved_items),
                    "asOf": saved.get("asOf") or AS_OF,
                    "office": saved.get("office") or office,
                }
                print(f"{name}: kept {len(saved_items)}", flush=True)
                (OUT / "index.json").write_text(json.dumps(index, indent=2), encoding="utf-8")
                (ROOT / "lib" / "authorities" / "state-prefixes.json").write_text(json.dumps(sorted(prefixes), indent=2), encoding="utf-8")
                continue
        fetcher = Fetcher()
        bucket: list[dict[str, str]] = []
        try:
            if name == "Alaska":
                alaska(fetcher, bucket, prefixes)
            elif name == "Alabama":
                alabama(fetcher, bucket, prefixes)
            elif name == "Wisconsin":
                wisconsin(fetcher, bucket, prefixes)
            elif name == "California":
                california(fetcher, bucket, prefixes)
            elif name == "New York":
                new_york(fetcher, bucket, prefixes)
            else:
                origin = urllib.parse.urlsplit(urls[0]).scheme + "://" + urllib.parse.urlsplit(urls[0]).netloc
                if not wordpress_decisions(fetcher, origin, office, bucket, prefixes):
                    harvest(fetcher, urls, office, bucket, prefixes)
                elif len(bucket) < 5:
                    harvest(fetcher, urls, office, bucket, prefixes)
        except Exception as error:
            print(f"  failed {name}: {error}", flush=True)
        write_state(name, office, bucket)
        if bucket:
            index[state_key(name)] = {"count": len(bucket), "asOf": AS_OF, "office": office}
        else:
            print(f"{name}: none found on the official pages reached", flush=True)
        (OUT / "index.json").write_text(json.dumps(index, indent=2), encoding="utf-8")
        (ROOT / "lib" / "authorities" / "state-prefixes.json").write_text(json.dumps(sorted(prefixes), indent=2), encoding="utf-8")
    print(f"states indexed {len(index)} prefixes {len(prefixes)}", flush=True)


if __name__ == "__main__":
    main()
