"""Server-only asset preparation; requires Pillow. The canonical PNG is unchanged."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
image = Image.open(root / 'public/art/ankuzo-head-master.png').convert('RGBA')
image = image.resize((336, 336), Image.Resampling.LANCZOS)
pixels = image.load()
dots = [1, 8, 2, 16, 4, 32, 64, 128]
thresholds = [.10, .58, .82, .34, .46, .94, .70, .22]
cells = []
for row in range(84):
    for col in range(168):
        code = 0
        red = green = blue = weight = 0
        for i, dot in enumerate(dots):
            r, g, b, a = [v / 255 for v in pixels[col * 2 + i % 2, row * 4 + i // 2]]
            if a < .22:
                continue
            hair = r > g * 1.3 and r > b * 1.12
            light = r * .94 if hair else r * .2126 + g * .7152 + b * .0722
            if (light ** (.65 if hair else .9)) * a > thresholds[i]:
                code |= dot
            red += r * a
            green += g * a
            blue += b * a
            weight += a
        if code:
            hair = int(red > green * 1.3 and red > blue * 1.12)
            light = round((red * .2126 + green * .7152 + blue * .0722) / weight * 255)
            cells.append([col, row, code, hair, light])
(root / 'public/art/intro-portrait-v2.json').write_text(json.dumps(cells, separators=(',', ':')) + '\n')
print(f'{len(cells)} portrait cells')
