#!/usr/bin/env python3
"""Resize the bundled real reference photos for a lightweight storefront."""
from io import BytesIO
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "static/images/products"
total = 0

for path in sorted(DEST.glob("p*.jpg")):
    with Image.open(path) as source:
        image = source.convert("RGB")
        image.thumbnail((760, 760), Image.Resampling.LANCZOS)
        output = b""
        quality_used = 80
        for quality in (80, 76, 72, 68):
            buffer = BytesIO()
            image.save(buffer, "JPEG", quality=quality, optimize=True, progressive=True)
            output = buffer.getvalue()
            quality_used = quality
            if len(output) <= 350_000:
                break
    path.write_bytes(output)
    total += len(output)
    print(f"{path.name}: {image.width}x{image.height}, Q{quality_used}, {len(output)} bytes")

print(f"Optimized {len(list(DEST.glob('p*.jpg')))} photos; total {total / 1024:.1f} KiB")
