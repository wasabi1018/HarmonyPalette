"""Proportional crops of the final, unmodified browser captures."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent
for capture, metrics, output, leading, extra in [
    ('01-mobile-full.jpg', 'mobile-metrics.json', '04-mobile-pickup.png', 92, 120),
    ('02-desktop-full.jpg', 'desktop-metrics.json', '05-desktop-pickup.png', 15, 140),
]:
    image = Image.open(root / capture).convert('RGB')
    measure = json.loads((root / metrics).read_text(encoding='utf-8'))
    region = measure['section']
    scale = image.width / measure['viewportWidth']
    x = round(region['x'] * scale)
    y = round((region['y'] + leading) * scale)
    crop = image.crop((x, max(0, round(y - 12 * scale)), min(image.width, x + round(region['width'] * scale)), min(image.height, y + round((region['height'] + extra) * scale))))
    crop.save(root / output)
    print(output, crop.size)
