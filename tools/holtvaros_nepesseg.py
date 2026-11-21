#!/usr/bin/env python3
"""Holtváros – valós népesség szétosztása az épületekre.

A <megye>.json települései (OSM population, ezer fő) mellé kiszámolja, hogy a település
lakossága hány „súlyozott szintterület” egységre oszlik el (alapterület × max(1, magasság/3), a csarnokok 8%-kal).
Minden épület ahhoz a településhez tartozik, amelyiknél a (távolság − hatósugár) a legkisebb
(ugyanaz a képlet, mint a játékban). Kimenet a .json-ba:
  towns[i][4] = lakos / súlyozott m² (sűrűségi szorzó; 0 = nincs adat, a játék becsül)
  dens = { c: cellaméret m, nx, ny, b: base64 Uint16 – lakos cellánként }
Csak numpy kell. Futás: python3 tools/holtvaros_nepesseg.py
"""
import json, glob, struct, base64, math, os
import numpy as np

DIR = os.path.join(os.path.dirname(__file__), '..', 'jatekok', 'holtvaros', 'terkep')
CELL = 500
IND = .08   # nagy alapterületű, alacsony épület (csarnok, gyár, áruház): alig laknak benne

def buildings(haz, TXN, TYN, T):
    xs, ys, ws = [], [], []
    for t in range(TXN * TYN):
        io = 8 + 12 * t
        off, nr, pb = struct.unpack_from('<III', haz, io)
        if not off: continue
        bx, by = (t // TYN) * T, (t % TYN) * T
        a = np.frombuffer(haz, dtype=np.uint8, count=nr * 8, offset=off).reshape(-1, 8) if nr else np.zeros((0, 8), np.uint8)
        if nr:
            xy = a[:, :4].copy().view('<u2').reshape(-1, 2).astype(np.float64) / 32
            w = a[:, 4].astype(np.float64); d = a[:, 5].astype(np.float64); h = a[:, 7].astype(np.float64)
            ar = w * d; xs.append(bx + xy[:, 0]); ys.append(by + xy[:, 1]); ws.append(ar * np.maximum(1, h / 3) * np.where((ar > 2500) & (h <= 15), IND, 1))
        o, end = off + nr * 8, off + nr * 8 + pb
        px, py, pw = [], [], []
        while o < end:
            x, y, n, h = struct.unpack_from('<HHBB', haz, o); o += 6
            p = np.frombuffer(haz, dtype='<i2', count=n * 2, offset=o).reshape(-1, 2).astype(np.float64) / 4; o += 4 * n
            q = np.roll(p, -1, axis=0); ar = abs((p[:, 0] * q[:, 1] - q[:, 0] * p[:, 1]).sum()) / 2
            px.append(bx + x / 32); py.append(by + y / 32); pw.append(ar * max(1, h / 3) * (IND if ar > 2500 and h <= 15 else 1))
        if px: xs.append(np.array(px)); ys.append(np.array(py)); ws.append(np.array(pw))
    return np.concatenate(xs), np.concatenate(ys), np.concatenate(ws)

for jf in sorted(glob.glob(os.path.join(DIR, '*.json'))):
    md = json.load(open(jf, encoding='utf-8'))
    bid = jf[:-5]
    T, W, H, K = md['T'], md['W'], md['H'], md['K']
    TXN, TYN = struct.unpack_from('<HH', open(bid + '.bin', 'rb').read(8), 4)
    haz = open(bid + '.haz', 'rb').read()
    bx, by, bw = buildings(haz, TXN, TYN, T)
    SC = K / 180
    tw = md['towns']
    tx = np.array([t[1] for t in tw], float); ty = np.array([t[2] for t in tw], float)
    tr = np.array([(95 + 62 * math.sqrt(t[3])) * SC for t in tw])
    own = np.empty(len(bx), np.int32)
    for s in range(0, len(bx), 20000):
        d = np.hypot(bx[s:s + 20000, None] - tx[None], by[s:s + 20000, None] - ty[None]) - tr[None]
        own[s:s + 20000] = d.argmin(1)
    tot = np.bincount(own, weights=bw, minlength=len(tw))
    f = np.array([t[3] * 1000 / tot[i] if t[3] > 0 and tot[i] > 0 else 0 for i, t in enumerate(tw)])
    fb = f[own]; fb[fb == 0] = 1 / 60
    res = bw * fb
    for i, t in enumerate(tw):
        del t[4:]; t.append(float('%.4g' % f[i]))
    nx, ny = math.ceil(W / CELL), math.ceil(H / CELL)
    g = np.zeros(nx * ny)
    ix = np.clip((bx // CELL).astype(int), 0, nx - 1); iy = np.clip((by // CELL).astype(int), 0, ny - 1)
    np.add.at(g, ix * ny + iy, res)
    md['dens'] = {'c': CELL, 'nx': nx, 'ny': ny, 'b': base64.b64encode(np.minimum(np.round(g), 65535).astype('<u2').tobytes()).decode()}
    json.dump(md, open(jf, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(os.path.basename(bid), len(bx), 'épület', 'becsült (60 m²) %.0fe' % (bw.sum() / 60 / 1000), 'valós %.0fe' % (res.sum() / 1000), 'max cella', int(g.max()))
