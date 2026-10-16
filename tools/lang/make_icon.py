# The Tounsi app icon: the Tunisian flag with one of the artist's MemiBeasts (Jaxi, baby) climbing over it.
# Run from the repo root: python3 tools/lang/make_icon.py tounsi   → tounsi/icons/{icon-512,icon-192,apple-touch-icon,favicon-32}.png
import sys, math, pathlib
from PIL import Image, ImageDraw, ImageFilter
root = pathlib.Path(__file__).resolve().parents[2]
lang = root / sys.argv[1]; out = lang / 'icons'; out.mkdir(exist_ok=True)
S = 1024
img = Image.new('RGBA', (S, S), (231, 0, 19, 255))   # the flag's red
d = ImageDraw.Draw(img)
# the white disc, a little up and left so the beast has the bottom right
cx, cy, R = int(S * .42), int(S * .40), int(S * .30)
d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=(255, 255, 255, 255))
# the crescent: a red disc with a white disc cut out of it, open to the right as on the flag
r1 = int(R * .75); d.ellipse([cx - r1, cy - r1, cx + r1, cy + r1], fill=(231, 0, 19, 255))
r2 = int(R * .60); ox = int(R * .22); d.ellipse([cx + ox - r2, cy - r2, cx + ox + r2, cy + r2], fill=(255, 255, 255, 255))
# the five-pointed star in the crescent's opening
sx, sy, sr = cx + int(R * .20), cy, int(R * .27)
pts = []
for i in range(10):
    a = -math.pi / 2 + i * math.pi / 5; rr = sr if i % 2 == 0 else sr * .4
    pts.append((sx + rr * math.cos(a), sy + rr * math.sin(a)))
d.polygon(pts, fill=(231, 0, 19, 255))
# the beast, bottom right, with a soft shadow
beast = Image.open(root / 'art/beasts/jaxi_baby.webp').convert('RGBA')
bw = int(S * .62); beast = beast.resize((bw, int(beast.height * bw / beast.width)), Image.LANCZOS)
bx, by = S - bw + int(S * .04), S - beast.height + int(S * .06)
shadow = Image.new('RGBA', img.size, (0, 0, 0, 0)); sh = Image.new('RGBA', beast.size, (0, 0, 0, 0)); sh.paste((0, 0, 0, 110), (0, 0), beast)
shadow.paste(sh, (bx + 14, by + 22), sh); shadow = shadow.filter(ImageFilter.GaussianBlur(18))
img = Image.alpha_composite(img, shadow); img.paste(beast, (bx, by), beast)
img = img.convert('RGB')
for name, size in [('icon-512.png', 512), ('icon-192.png', 192), ('apple-touch-icon.png', 180), ('favicon-32.png', 32)]:
    img.resize((size, size), Image.LANCZOS).save(out / name, optimize=True)
print('icons written to', out)
