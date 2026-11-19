"""Refresh the official Code and Treasury regulation indexes in lib/authorities.

Section headings come from the Office of the Law Revision Counsel and the
Electronic Code of Federal Regulations. The script stores the citation, the
official heading, and the link to the government text.
"""

import json
import re
import urllib.parse
import urllib.request
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "lib" / "authorities"
UA = {"User-Agent": "Mozilla/5.0 (compatible; TaxHelping2day-library/1.0)", "Accept": "application/json,text/html"}


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(request, timeout=180) as response:
        return response.read()


def clean(value: str) -> str:
    text = unescape(value)
    text = text.replace("\u2060", "").replace("\u200b", "").replace("⁠", "")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def build_code() -> None:
    html = fetch("https://uscode.house.gov/us/usc/t26/").decode("utf-8", "replace")
    items = []
    seen = set()
    for href, raw in re.findall(r'<a class="section-link" href="([^"]+)">([^<]+)</a>', html):
        text = clean(raw)
        match = re.match(r"§\s+(.+?)\s+[—–-]\s+(.*)$", text)
        if not match:
            continue
        number = match.group(1).strip()
        title = match.group(2).strip().rstrip("]")
        if number in seen:
            continue
        seen.add(number)
        items.append(
            {
                "cite": f"IRC § {number}",
                "title": title,
                "href": urllib.parse.urljoin("https://uscode.house.gov/us/usc/t26/", href),
            }
        )
    payload = {
        "publisher": "Office of the Law Revision Counsel, U.S. House of Representatives",
        "source": "https://uscode.house.gov/us/usc/t26/",
        "items": items,
    }
    (OUT / "irc.json").write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"IRC sections: {len(items)}")


def build_regulations() -> None:
    meta = json.loads(fetch("https://www.ecfr.gov/api/versioner/v1/titles.json").decode())
    title = next(row for row in meta["titles"] if row["number"] == 26)
    date = title["latest_issue_date"]
    tree = json.loads(fetch(f"https://www.ecfr.gov/api/versioner/v1/structure/{date}/title-26.json").decode())
    items = []
    seen = set()

    def walk(node, trail):
        kind = node.get("type") or ""
        identifier = node.get("identifier")
        next_trail = trail
        if identifier and kind in {"chapter", "subchapter", "part", "subpart", "section"}:
            next_trail = trail + [(kind, str(identifier))]
        if kind == "section" and identifier and str(identifier) not in seen:
            seen.add(str(identifier))
            heading = clean(node.get("label_description") or node.get("label") or "")
            if node.get("reserved") and not heading:
                heading = "Reserved"
            parts = []
            for part_kind, part_id in next_trail:
                parts.append(f"{part_kind}-{urllib.parse.quote(part_id, safe='-._')}")
            items.append(
                {
                    "cite": f"Treas. Reg. § {identifier}",
                    "title": heading or "Reserved",
                    "href": "https://www.ecfr.gov/current/title-26/" + "/".join(parts),
                }
            )
        for child in node.get("children") or []:
            walk(child, next_trail)

    walk(tree, [])
    payload = {
        "publisher": "Office of the Federal Register, Electronic Code of Federal Regulations",
        "source": "https://www.ecfr.gov/current/title-26",
        "asOf": date,
        "items": items,
    }
    (OUT / "regulations.json").write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Treasury regulation sections: {len(items)} as of {date}")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    build_code()
    build_regulations()
