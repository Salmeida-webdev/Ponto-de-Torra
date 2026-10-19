#!/usr/bin/env python3
"""Refresh the storefront's real, openly licensed Wikimedia reference photos.

All photos are illustrative references. They are not photos of Ponto de Torra
products, packages, lots, suppliers, or inventory. Update this curated list only
after checking the source page and its redistribution license.
"""
from __future__ import annotations

import html
import json
import re
import urllib.parse
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "static" / "images" / "products"
MANIFEST = ROOT / "static" / "images" / "credits.json"
APP_MANIFEST = ROOT / "src" / "lib" / "data" / "photo-credits.json"
USER_AGENT = "PontoDeTorraPortfolio/1.1 (Wikimedia attribution; portfolio demo)"
MAX_EDGE = 760
JPEG_QUALITY = 82

# Corrections made after a visual review. Entries omitted here retain the
# existing, already reviewed Wikimedia Commons source from credits.json.
PHOTO_TITLE_OVERRIDES = {
    # Specific object photos replace broad process/scene images where the
    # catalog describes a single physical item.
    "p29": "Hario V60 dripper (30519007832).jpg",
    "p17": "Manual drip (pour-over) coffee.jpg",
    "p18": "Preparation of cold brew coffee 06.jpg",
    "p21": "Single Serving Pour Over Coffee.jpg",
    "p22": "Single drip coffee filter.jpg",
    "p23": "Manual drip (pour-over) coffee.jpg",
    "p32": "Coador de Café (1-07-01-000-11409-02-02-02).jpg",
    "p33": "Brewing pour over coffee with kettle and scale.jpg",
    "p34": "Manual coffee grinder brazil.jpg",
    "p35": "Coffee-filter.jpg",
    "p36": "Kaffeefilter.jpg",
    "p37": "Gradiations on Coffee Carafe.jpg",
    "p38": "Coffee Spoon MET DP254141.jpg",
    "p39": "Roasted Coffee Beans in Hermetic Jar.jpg",
    "p40": "Coffee mug on table.jpg",
    "p41": "16oz travel mug.jpg",
    "p42": "Cleaning brushes.jpg",
    "p43": "Brewing pour over coffee with kettle and scale.jpg",
    "p44": "Coffee Pour Over Setup.jpg",
    "p45": "French Press coffee making 01.jpg",
    "p46": "Espresso Preparation Step.jpg",
    "p47": "Preparation of cold brew coffee 06.jpg",
    "p49": "Coffee-box and thermos jug.jpg",
    "p50": "Coffee set.jpg",
}


def request_json(url: str) -> dict:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        return json.load(response)


def strip_html(value: str) -> str:
    value = re.sub(r"<br\s*/?>", " ", value, flags=re.I)
    value = re.sub(r"<[^>]+>", "", value)
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


def redistributable(license_name: str) -> bool:
    value = license_name.lower().strip()
    if re.search(r"\b(nc|nd)\b", value):
        return False
    return value.startswith(("cc by", "cc0", "public domain", "public-domain"))


def category_for(product_id: str) -> str:
    number = int(product_id[1:])
    if number <= 20:
        return "coffee"
    if number <= 28:
        return "drip"
    if number <= 34:
        return "methods"
    if number <= 42:
        return "accessories"
    return "kits"


def download_and_optimize(image_url: str, destination: Path) -> int:
    request = urllib.request.Request(image_url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        payload = response.read()
    destination.parent.mkdir(parents=True, exist_ok=True)
    import io

    with Image.open(io.BytesIO(payload)) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
        image.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
        image.save(
            destination,
            format="JPEG",
            quality=JPEG_QUALITY,
            optimize=True,
            progressive=True,
            subsampling=1,
        )
    return destination.stat().st_size


def main() -> None:
    old_items = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if len(old_items) != 50:
        raise SystemExit(f"Expected 50 manifest rows, found {len(old_items)}")

    titles_by_id = {}
    for item in old_items:
        product_id = item["product_id"]
        title = PHOTO_TITLE_OVERRIDES.get(product_id, item["title"].removeprefix("File:"))
        titles_by_id[product_id] = title

    unique_titles = list(dict.fromkeys(titles_by_id.values()))
    query = {
        "action": "query",
        "format": "json",
        "titles": "|".join(f"File:{title}" for title in unique_titles),
        "prop": "imageinfo",
        "iiprop": "url|size|mime|extmetadata",
        "iiurlwidth": "960",
    }
    api_url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(query)
    data = request_json(api_url)

    metadata_by_title = {}
    for page in data.get("query", {}).get("pages", {}).values():
        if page.get("missing") is not None or not page.get("imageinfo"):
            raise SystemExit(f"Wikimedia source not found: {page.get('title')}")
        info = page["imageinfo"][0]
        metadata = info.get("extmetadata", {})
        license_name = strip_html(metadata.get("LicenseShortName", {}).get("value", ""))
        if not redistributable(license_name):
            raise SystemExit(f"License is not approved for redistribution: {page['title']} ({license_name})")
        if info.get("mime", "").lower() not in {"image/jpeg", "image/png", "image/webp"}:
            raise SystemExit(f"Unsupported image type for {page['title']}: {info.get('mime')}")
        thumb_url = info.get("thumburl") or info.get("url")
        if not thumb_url:
            raise SystemExit(f"No downloadable image URL for {page['title']}")
        metadata_by_title[page["title"].removeprefix("File:").casefold()] = {
            "title": page["title"],
            "url": thumb_url,
            "source_url": info.get("descriptionurl", ""),
            "mime": info.get("mime", ""),
            "width": info.get("width", 0),
            "height": info.get("height", 0),
            "license": license_name,
            "license_url": strip_html(metadata.get("LicenseUrl", {}).get("value", "")),
            "artist": strip_html(metadata.get("Artist", {}).get("value", "")),
            "credit": strip_html(metadata.get("Credit", {}).get("value", "")),
        }

    source_counts = Counter(title.casefold() for title in titles_by_id.values())
    rows = []
    tasks = []
    for old_item in old_items:
        product_id = old_item["product_id"]
        title = titles_by_id[product_id]
        info = metadata_by_title.get(title.casefold())
        if not info:
            raise SystemExit(f"Wikimedia API omitted source: {title}")
        image_path = ROOT / "static" / old_item["file"].lstrip("/")
        tasks.append((info["url"], image_path))
        rows.append({
            "product_id": product_id,
            "file": old_item["file"],
            "query": old_item.get("query", ""),
            "category": category_for(product_id),
            "illustrative": True,
            "reused": source_counts[title.casefold()] > 1,
            "changes": "Orientação EXIF aplicada; convertida para JPEG RGB progressivo; redimensionada mantendo a proporção até 760 px e comprimida em qualidade 82, sem corte.",
            **info,
        })

    def download(task: tuple[str, Path]) -> tuple[str, int]:
        url, path = task
        return path.as_posix(), download_and_optimize(url, path)

    with ThreadPoolExecutor(max_workers=5) as pool:
        sizes_by_path = dict(pool.map(download, tasks))
    for row in rows:
        row["bytes"] = sizes_by_path[(ROOT / "static" / row["file"].lstrip("/")).as_posix()]

    output = json.dumps(rows, ensure_ascii=False, indent=2) + "\n"
    MANIFEST.write_text(output, encoding="utf-8")
    APP_MANIFEST.write_text(output, encoding="utf-8")
    total = sum(row["bytes"] for row in rows)
    print(f"Updated {len(rows)} illustrative, licensed photos ({total / 1024:.0f} KiB)")
    print(f"Manifest: {MANIFEST.relative_to(ROOT)}")
    print(f"App manifest: {APP_MANIFEST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
