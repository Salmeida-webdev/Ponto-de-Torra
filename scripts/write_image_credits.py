#!/usr/bin/env python3
"""Create a human-readable per-file photo attribution list."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS_TS = ROOT / "src/lib/data/products.ts"
MANIFEST = ROOT / "static/images/credits.json"
OUTPUT = ROOT / "docs/IMAGENS-E-CREDITOS.md"

rows = re.findall(r"^\s*\['([^']+)','([^']+)'", PRODUCTS_TS.read_text(encoding="utf-8"), re.M)
names = {f"p{index:02d}": name for index, (_, name) in enumerate(rows, start=1)}
credits = json.loads(MANIFEST.read_text(encoding="utf-8"))

lines = [
    "# Imagens reais e créditos",
    "",
    "Todas as imagens desta pasta são fotografias reais obtidas de Wikimedia Commons sob licenças abertas compatíveis com reutilização e atribuição. Para cada arquivo, a orientação EXIF foi aplicada, a imagem foi convertida para JPEG RGB progressivo, redimensionada sem corte mantendo a proporção até 760 px e comprimida em qualidade 82. O crédito individual informa a licença da foto-fonte; preserve essa licença ao reutilizar a versão modificada.",
    "",
    "Cada foto foi associada ao tipo de produto ou preparo descrito e representa esse objeto real. Os produtos da loja são conceituais: as fotos não representam marca, embalagem, variante, lote ou estoque da Ponto de Torra. Confira a associação visual antes de substituir qualquer arquivo.",
    "",
    "## Arquivo, associação visual e atribuição",
    "",
    "| Arquivo no projeto | Produto demonstrativo | Foto na fonte | Autor/crédito e licença | Alteração aplicada |",
    "|---|---|---|---|---|",
]

for entry in sorted(credits, key=lambda item: item["product_id"]):
    pid = entry["product_id"]
    filename = Path(entry["file"]).name
    source = entry.get("source_url", "")
    license_url = entry.get("license_url", "")
    source_label = entry.get("title", "Foto").replace("|", "\\|")
    source_cell = f"[{source_label}]({source})" if source else source_label
    license_label = entry.get("license", "Licença na fonte")
    license_cell = f"[{license_label}]({license_url})" if license_url else license_label
    attribution = (entry.get("artist") or entry.get("credit") or "Autor indicado na fonte").replace("|", "\\|")
    changes = entry.get("changes", "Redimensionada sem corte e otimizada para o site.").replace("|", "\\|")
    lines.append(f"| `static/images/products/{filename}` | {pid.upper()} · {names.get(pid, 'Produto demonstrativo')} | {source_cell} | {attribution} · {license_cell} | {changes} |")

lines += [
    "",
    f"Total: {len(credits)} fotografias relacionadas no manifesto. O detalhe de cada arquivo também está em `static/images/credits.json` e é apresentado na página `/creditos`.",
    "",
    "Antes de reutilizar fora do projeto, confira a página da fotografia e cumpra integralmente a licença indicada, inclusive atribuição e compartilhamento pela mesma licença quando exigidos.",
]
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"Wrote {OUTPUT} ({len(credits)} image entries)")
