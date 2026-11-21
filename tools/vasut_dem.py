#!/usr/bin/env python3
"""Mozdonyvezető – valódi domborzat a 3D nézethez és a térkép árnyékolásához.

Bemenet: adat/dem/*.zip  (Viewfinder Panoramas 3" .hgt csempék: L33, L34, M33, M34 – viewfinderpanoramas.org)
Kimenet: jatekok/vasut/dem/<tx>_<ty>.png  – 100 m-es rács a játék vetületében, 25,6 km-es csempékben (257×257 képpont,
           a szélső sor/oszlop közös a szomszéddal); magasság deciméterben: R = felső bájt, G = alsó bájt
         jatekok/vasut/dem/index.json     – { c: 100, n: 256, nx, ny, t: [létező csempék] }
         /tmp/vasut-dem250.npy            – 250 m-es országos rács a tools/vasut_taj.py-nak (árnyékolás, emelkedők)
Futás: python3 tools/vasut_dem.py   (kb. 1 perc; numpy, scipy, PIL)
"""
import os, sys, io, json, math, glob, zipfile
import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates, gaussian_filter
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', 'jatekok', 'vasut', 'dem')
LON0, LAT1 = 16.0, 48.65; KX, KY = 111320 * math.cos(math.radians(47.2)), 111190
W, H = 527600, 329900; C = 100; N = 256
la0, la1, lo0, lo1 = 45, 49, 16, 23            # a szükséges 1°-os csempék: N45…N48, E016…E022
big = np.zeros(((la1 - la0) * 1200 + 1, (lo1 - lo0) * 1200 + 1), np.float32)   # [észak→dél, nyugat→kelet]
got = 0
for zp in sorted(glob.glob(os.path.join(HERE, '..', 'adat', 'dem', '*.zip'))):
    z = zipfile.ZipFile(zp)
    for i in z.infolist():
        nm = os.path.basename(i.filename).upper()
        if not nm.endswith('.HGT') or len(nm) != 11 or i.file_size != 1201 * 1201 * 2: continue
        la, lo = int(nm[1:3]), int(nm[4:7])
        if not (la0 <= la < la1 and lo0 <= lo < lo1): continue
        a = np.frombuffer(z.read(i), '>i2').reshape(1201, 1201).astype(np.float32); a[a < -500] = np.nan
        r = (la1 - 1 - la) * 1200; c = (lo - lo0) * 1200; big[r:r + 1201, c:c + 1201] = a; got += 1
print('hgt csempe', got, flush=True); assert got == (la1 - la0) * (lo1 - lo0), 'hiányzó csempe'
if np.isnan(big).any(): big[np.isnan(big)] = np.nanmean(big)
big = gaussian_filter(big, .6)                  # az egész méteres lépcsők elsimítása
def sample(xs, ys):                             # játék-koordináta (m) → magasság (m)
    lon = LON0 + xs / KX; lat = LAT1 - ys / KY
    return map_coordinates(big, [(la1 - lat) * 1200, (lon - lo0) * 1200], order=1, mode='nearest')
CLS = np.array(Image.open(os.path.join(OUT, '..', 'taj_osztaly.png')).convert('L'))
nx, ny = W // (C * N) + 1, H // (C * N) + 1; os.makedirs(OUT, exist_ok=True); [os.remove(f) for f in glob.glob(os.path.join(OUT, '*.png'))]; names = []; tot = 0
for tx in range(nx):
    for ty in range(ny):
        k = CLS[ty * N * C // 250:(ty + 1) * N * C // 250 + 1, tx * N * C // 250:(tx + 1) * N * C // 250 + 1]
        if k.size and (k >= 200).all(): continue      # teljesen külföld: nem kell
        xs, ys = np.meshgrid((tx * N + np.arange(N + 1)) * C, (ty * N + np.arange(N + 1)) * C)
        h = np.clip(np.round(sample(xs.astype(np.float64), ys.astype(np.float64)) * 10), 0, 65535).astype(np.uint16)
        im = np.zeros((N + 1, N + 1, 3), np.uint8); im[..., 0] = h >> 8; im[..., 1] = h & 255
        p = os.path.join(OUT, f'{tx}_{ty}.png'); Image.fromarray(im).save(p, optimize=True); names.append(f'{tx}_{ty}'); tot += os.path.getsize(p)
json.dump({'c': C, 'n': N, 'nx': nx, 'ny': ny, 't': names}, open(os.path.join(OUT, 'index.json'), 'w'))
xs, ys = np.meshgrid(np.arange(W // 250 + 1) * 250.0, np.arange(H // 250 + 1) * 250.0); np.save('/tmp/vasut-dem250.npy', sample(xs, ys).astype(np.float32))
print('csempe', len(names), round(tot / 1e6, 1), 'MB', 'magasság', round(float(big.min())), '…', round(float(big.max())), flush=True)
