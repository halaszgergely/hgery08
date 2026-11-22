"""HGWS Légi Öntözés – domborzati csempék a repóba tett Viewfinder Panoramas 3"-es (≈90 m) adatból (adat/dem/*.zip, .hgt).
Kimenet: jatekok/legiontozes/dem/10/<x>/<y>.png – Terrarium kódolású PNG (h = R·256 + G + B/256 − 32768), web-Mercator 10-es zoom,
Magyarország és környéke. A játék ezeket tölti be közelről (a hiányzó csempéket az AWS Terrain Tilesból).
Futtatás: python3 tools/legi_dem.py   (numpy + PIL kell)"""
import os, io, math, zipfile, glob, sys
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, OUT, Z = os.path.join(ROOT, 'adat', 'dem'), os.path.join(ROOT, 'jatekok', 'legiontozes', 'dem'), 10
LAT0, LAT1, LON0, LON1 = 45, 49, 15, 24          # mozaik (egész fokok)
N = 1200
mos = np.full(((LAT1 - LAT0) * N + 1, (LON1 - LON0) * N + 1), -32768, np.int32)
for zp in glob.glob(os.path.join(SRC, '*.zip')):
    with zipfile.ZipFile(zp) as zf:
        for nm in zf.namelist():
            b = os.path.basename(nm)
            if not b.endswith('.hgt'): continue
            la, lo = int(b[1:3]), int(b[4:7])
            if not (LAT0 <= la < LAT1 and LON0 <= lo < LON1): continue
            a = np.frombuffer(zf.read(nm), '>i2').reshape(1201, 1201).astype(np.int32)
            r0 = (LAT1 - 1 - la) * N; c0 = (lo - LON0) * N
            mos[r0:r0 + 1201, c0:c0 + 1201] = np.where(a == -32768, mos[r0:r0 + 1201, c0:c0 + 1201], a)
# hiányzó (üres) pontok kitöltése a szomszédokból
bad = mos == -32768
for _ in range(20):
    if not bad.any(): break
    p = np.pad(np.where(bad, 0, mos), 1, mode='edge'); w = np.pad((~bad).astype(np.int32), 1, mode='edge')
    s = sum(p[1 + dy:p.shape[0] - 1 + dy, 1 + dx:p.shape[1] - 1 + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1))
    c = sum(w[1 + dy:w.shape[0] - 1 + dy, 1 + dx:w.shape[1] - 1 + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1))
    fill = bad & (c > 0); mos[fill] = s[fill] // c[fill]; bad = mos == -32768
mos[bad] = 100; mos = mos.astype(np.float32)
n = 1 << Z
t2lon = lambda x: x / n * 360 - 180
t2lat = lambda y: math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
X0, X1 = int((15.9 + 180) / 360 * n), int((23.2 + 180) / 360 * n)
def lat2y(lat): r = math.radians(lat); return (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * n
Y0, Y1 = int(lat2y(48.75)), int(lat2y(45.6))
cnt = 0; tot = 0
for tx in range(X0, X1 + 1):
    for ty in range(Y0, Y1 + 1):
        px = (tx + (np.arange(256) + .5) / 256); py = (ty + (np.arange(256) + .5) / 256)
        lon = px / n * 360 - 180; lat = np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * py / n))))
        fc = (lon - LON0) * N; fr = (LAT1 - lat) * N
        C, R = np.meshgrid(fc, fr); c0 = np.clip(np.floor(C).astype(int), 0, mos.shape[1] - 2); r0 = np.clip(np.floor(R).astype(int), 0, mos.shape[0] - 2); dc = C - c0; dr = R - r0
        h = (mos[r0, c0] * (1 - dc) + mos[r0, c0 + 1] * dc) * (1 - dr) + (mos[r0 + 1, c0] * (1 - dc) + mos[r0 + 1, c0 + 1] * dc) * dr
        v = np.clip(np.round(h * 2) / 2 + 32768, 0, 65535.5); R8 = np.floor(v / 256); G8 = np.floor(v - R8 * 256); B8 = (v - np.floor(v)) * 256   # fél méteres pontosság (kisebb PNG)
        img = np.stack([R8, G8, B8], -1).astype(np.uint8)
        d = os.path.join(OUT, str(Z), str(tx)); os.makedirs(d, exist_ok=True); f = os.path.join(d, f'{ty}.png')
        Image.fromarray(img, 'RGB').save(f, optimize=True); cnt += 1; tot += os.path.getsize(f)
print('csempe', cnt, round(tot / 1e6, 1), 'MB', 'x', X0, X1, 'y', Y0, Y1)
