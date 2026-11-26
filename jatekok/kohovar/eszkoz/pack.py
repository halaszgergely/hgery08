# Kohóvár – sprite-atlasz a Mindustry (GPLv3) nyers sprite-jaiból. Futtatás: python3 pack.py <mindustry/core/assets-raw/sprites> <kimeneti mappa>
import os, re, sys, json
from PIL import Image, ImageChops
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from names import *
R, OUT = sys.argv[1], sys.argv[2]
idx = {}
for d, _, fs in os.walk(R):
    for f in fs:
        if f.endswith('.png'): idx[f[:-4]] = os.path.join(d, f)
ENV_F = 'stone dacite sand-floor darksand snow ice grass metal-floor shallow-water deep-water moss spore-moss dirt shale basalt hotrock magmarock char molten-slag tar salt'.split()
ENV_W = 'stone-wall snow-wall sand-wall dacite-wall dirt-wall spore-wall carbon-wall ferric-stone-wall'.split()
ORES = 'copper lead scrap coal titanium thorium'.split()
SECT = 'groundZero frozenForest craters stainedMountains desolateRift ruinousShores windsweptIslands tarFields nuclearComplex fungalPass saltFlats overgrowth coastline'.split()
plain, outl = set(), set()
for n in BN.values():
    for k in idx:
        if (k == n or k.startswith(n + '-')) and not k.endswith('-icon') and not k.endswith('-bg') and not k.endswith('-bg-line'): plain.add(k)
plain |= {k for k in idx if re.match(r'scrap-wall\d$', k)} | {'block-1', 'block-2', 'block-3', 'block-4', 'spawn', 'naval-factory', 'illuminator', 'illuminator-top'}
TUR = [BN[k] for k in 'duo scatter scorch hail wave lancet arc parallax swarmer salvo segment tsunami fuse ripple cyclone foreshadow spectre meltdown'.split()]
for t in TUR: outl.add(t + '-preview' if t + '-preview' in idx else t)
outl |= {'mass-driver', 'repair-point', 'repair-turret'}
for u in UN:
    outl.add(u)
    for s in ('base', 'leg', 'foot', 'joint', 'joint-base', 'leg-base', 'weapon', 'mount', 'cannon', 'launcher', 'missiles'):
        if f'{u}-{s}' in idx: outl.add(f'{u}-{s}')
    if f'{u}-cell' in idx: plain.add(f'{u}-cell')
for w in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'weapons.json'))):
    if w in idx: outl.add(w)
    if w + '-heat' in idx: plain.add(w + '-heat')
for v in IT.values(): plain.add('item-' + v)
for v in LQ.values(): plain.add('liquid-' + v)
for f in ENV_F: plain |= {k for k in idx if re.fullmatch(re.escape(f) + r'\d?', k)}
for f in ENV_W: plain |= {k for k in idx if re.fullmatch(re.escape(f) + r'(\d|-large)', k)}
for o in ORES: plain |= {f'ore-{o}{i}' for i in (1, 2, 3)}
for s in SECT:
    if 'sector-' + s in idx: plain.add('sector-' + s)
def outline(im, r=3, col=(0x40, 0x40, 0x49)):
    p = r + 1; big = Image.new('RGBA', (im.width + 2 * p, im.height + 2 * p)); big.paste(im, (p, p))
    a = big.getchannel('A').point(lambda v: 255 if v > 20 else 0); acc = a.copy()
    for dx in range(-r, r + 1):
        for dy in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r + 1 and (dx or dy): acc = ImageChops.lighter(acc, ImageChops.offset(a, dx, dy))
    base = Image.new('RGBA', big.size, col + (255,)); base.putalpha(acc); base.alpha_composite(big); return base
ims = []
for k in sorted(plain):
    if k in idx: ims.append((k, Image.open(idx[k]).convert('RGBA')))
for k in sorted(outl):
    if k in idx: ims.append((k + '@o', outline(Image.open(idx[k]).convert('RGBA'))))
big = [k for k, im in ims if k.startswith('sector-')]
ims = [(k, im.resize((64, 64), Image.LANCZOS) if k.startswith('sector-') else im) for k, im in ims]
ims.sort(key=lambda t: (-t[1].height, -t[1].width))
W = 2048; x = y = 0; rh = 0; pos = {}
for k, im in ims:
    if x + im.width + 1 > W: x = 0; y += rh + 1; rh = 0
    pos[k] = (x, y, im.width, im.height); x += im.width + 1; rh = max(rh, im.height)
H = y + rh; sheet = Image.new('RGBA', (W, H))
for k, im in ims: sheet.paste(im, pos[k][:2])
os.makedirs(OUT, exist_ok=True); sheet.save(os.path.join(OUT, 'atlasz.png'), optimize=True)
json.dump(pos, open(os.path.join(OUT, 'atlasz.json'), 'w'), separators=(',', ':'))
print(len(ims), 'sprite', W, 'x', H, os.path.getsize(os.path.join(OUT, 'atlasz.png')) // 1024, 'KB; hiányzik:', [k for k in sorted(plain | outl) if k not in idx][:20], 'sector px', [Image.open(idx[k]).size for k in sorted(idx) if k.startswith('sector-')][:1])
