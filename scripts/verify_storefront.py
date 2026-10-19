#!/usr/bin/env python3
"""Check public storefront and generated image handoff invariants."""
import json
import re
from collections import Counter
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
products_source = (ROOT / "src/lib/data/products.ts").read_text(encoding="utf-8")
rows = re.findall(r"^\s*\['([^']+)','([^']+)','([^']+)'", products_source, re.M)
errors: list[str] = []
counts = Counter(category for _, _, category in rows)
expected = {"cafes": 20, "drip": 8, "metodos": 6, "acessorios": 8, "kits": 8}
if len(rows) != 50:
    errors.append(f"expected 50 product records, found {len(rows)}")
if dict(counts) != expected:
    errors.append(f"category distribution mismatch: {dict(counts)}")

manifest_path = ROOT / "static/images/credits.json"
images = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else []
if len(images) != 50:
    errors.append(f"expected 50 generated-image entries, found {len(images)}")
expected_ids = {f"p{i:02d}" for i in range(1, 51)}
if {entry.get("product_id") for entry in images} != expected_ids:
    errors.append("generated-image manifest must map each product exactly once")

total_bytes = 0
for entry in images:
    path = ROOT / "static" / entry.get("file", "").lstrip("/")
    if not path.exists():
        errors.append(f"missing image: {entry.get('file')}")
        continue
    total_bytes += path.stat().st_size
    if path.stat().st_size > 350_000:
        errors.append(f"image exceeds 350 KB: {path.name} ({path.stat().st_size})")
    if entry.get("image_type") != "fotografia conceitual fotorealista gerada por IA":
        errors.append(f"image transparency field is missing: {entry.get('product_id')}")
    with Image.open(path) as image:
        if image.format != "JPEG" or image.size != (760, 570):
            errors.append(f"unexpected image format or size: {path.name} {image.format} {image.size}")

for name in ("grinding.jpg", "brewing.jpg"):
    path = ROOT / "static/images/guides" / name
    if not path.exists():
        errors.append(f"missing guide image: {path.relative_to(ROOT)}")

footer = (ROOT / "src/lib/components/SiteFooter.svelte").read_text(encoding="utf-8")
layout = (ROOT / "src/routes/+layout.svelte").read_text(encoding="utf-8")
if "wa.me/5583998739712" not in footer:
    errors.append("WhatsApp URL missing or incorrect")
if "Desenvolvido por LMX Soluções Digitais/Segundo Almeida" not in footer:
    errors.append("required footer credit missing or altered")
if "Projeto de portfólio" not in layout:
    errors.append("global demo notice is missing")

print(f"Products: {len(rows)} ({dict(counts)})")
print(f"Generated product images: {len(images)} ({total_bytes / 1024:.1f} KiB)")
if errors:
    for error in errors:
        print(f"FAIL: {error}")
    raise SystemExit(1)
print("PASS: storefront handoff invariants")
