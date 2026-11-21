#!/usr/bin/env python3
"""Holtváros – felfedezhető létesítmények (kórház, rendőrség, katonai terület) az OSM-kivonatból.

A <megye>.json „poi” mezőjébe írja: [[fajta, x, y, név], …], fajta: 'hosp' | 'pol' | 'mil'.
A megyei vetület (képpont = méter) a települések ismert helyzetéből van visszaillesztve.
Futás (a .osm.pbf-nek meg kell lennie, lásd terkep/README.md): python3 tools/holtvaros_poi.py
"""
import os, sys, json, glob, math
import numpy as np
from multiprocessing import Pool
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from holtvaros_terkep import fields, pk, pkn, zz, zzl, blobs, block, OUT

TAGK = {b'amenity', b'healthcare', b'landuse', b'military', b'name', b'place'}
MILV = {b'barracks', b'base', b'airfield', b'naval_base', b'training_area', b'range'}

def kind(t):
    if t.get(b'amenity') == b'hospital' or t.get(b'healthcare') == b'hospital': return 'hosp'
    if t.get(b'amenity') == b'police': return 'pol'
    if t.get(b'landuse') == b'military' or t.get(b'military') in MILV: return 'mil'
    return None

def work(a):
    mode, off, size = a; st, groups, gran, lato, lono = block(off, size); out = []
    ki = {i for i, s in enumerate(st) if s in TAGK}
    if mode == 'W' and not ki: return out
    for g in groups:
        for gk, gv in fields(g):
            if mode == 'W' and gk == 3:
                kb = vb = rb = b''
                for k, v in fields(gv):
                    if k == 2: kb = v
                    elif k == 3: vb = v
                    elif k == 8: rb = v
                if not len(kb): continue
                ks = pk(kb)
                if not ki.intersection(ks): continue
                t = {st[k]: st[v] for k, v in zip(ks, pk(vb)) if k in ki}; kd = kind(t)
                if kd: out.append(('w', kd, t.get(b'name', b'').decode(), zzl(pk(rb))))
            elif mode == 'N' and gk == 2:
                ib = lb = ob = kv = b''
                for k, v in fields(gv):
                    if k == 1: ib = v
                    elif k == 8: lb = v
                    elif k == 9: ob = v
                    elif k == 10: kv = v
                ids = np.cumsum(zz(pkn(ib))); lat = 1e-9 * (lato + gran * np.cumsum(zz(pkn(lb)))); lon = 1e-9 * (lono + gran * np.cumsum(zz(pkn(ob))))
                m = np.isin(ids, NEED)
                if m.any(): out.append(('n', ids[m], lat[m], lon[m]))
                if not len(kv) or not ki: continue
                arr = pkn(kv).astype(np.int64); z = np.flatnonzero(arr == 0)
                # csak a címkézett csomópontokat bontjuk ki (a 0 zárja a csomópont címkéit)
                st0 = np.concatenate([[0], z[:-1] + 1]); has = z > st0
                for ni in np.flatnonzero(has).tolist():
                    seg = arr[st0[ni]:z[ni]].tolist(); t = {}
                    for j in range(0, len(seg) - 1, 2):
                        if seg[j] in ki: t[st[seg[j]]] = st[seg[j + 1]]
                    if not t: continue
                    kd = kind(t)
                    if kd: out.append(('p', kd, t.get(b'name', b'').decode(), float(lat[ni]), float(lon[ni])))
                    elif b'place' in t and b'name' in t: out.append(('t', t[b'name'].decode(), float(lat[ni]), float(lon[ni])))
    return out

NEED = np.zeros(0, np.int64)
def init(need):
    global NEED; NEED = need

if __name__ == '__main__':
    bl = blobs(); print(len(bl), 'blokk', flush=True)
    with Pool(2) as p: W = [r for o in p.imap_unordered(work, [('W',) + b for b in bl], 8) for r in o]
    print('területek', len(W), flush=True)
    need = np.unique(np.array([r for w in W for r in w[3]], np.int64))
    with Pool(2, initializer=init, initargs=(need,)) as p: N = [r for o in p.imap_unordered(work, [('N',) + b for b in bl], 8) for r in o]
    ids = np.concatenate([n[1] for n in N if n[0] == 'n']); la = np.concatenate([n[2] for n in N if n[0] == 'n']); lo = np.concatenate([n[3] for n in N if n[0] == 'n'])
    o = np.argsort(ids); ids, la, lo = ids[o], la[o], lo[o]
    pois = [(n[1], n[2], n[3], n[4]) for n in N if n[0] == 'p']
    for _, kd, nm, refs in W:
        i = np.searchsorted(ids, refs); i[i >= len(ids)] = 0; i = i[ids[i] == refs]
        if len(i): pois.append((kd, nm, float(la[i].mean()), float(lo[i].mean())))
    places = {}
    for n in N:
        if n[0] == 't': places.setdefault(n[1], []).append((n[2], n[3]))
    print('létesítmény', len(pois), 'település', len(places), flush=True)
    for jf in sorted(glob.glob(os.path.join(OUT, '*.json'))):
        md = json.load(open(jf, encoding='utf-8'))
        # vetület visszaillesztése: x = (lon − LON0)·KX, y = (LAT1 − lat)·KY
        X, Y, A, B = [], [], [], []
        for t in md['towns']:
            c = places.get(t[0])
            if c and len(c) == 1: X.append(t[1]); Y.append(t[2]); A.append(c[0][0]); B.append(c[0][1])
        A, B, X, Y = map(np.array, (A, B, X, Y))
        kx, bx = np.polyfit(B, X, 1); ky, by = np.polyfit(A, Y, 1)
        res = np.hypot(kx * B + bx - X, ky * A + by - Y); ok = res < 50
        kx, bx = np.polyfit(B[ok], X[ok], 1); ky, by = np.polyfit(A[ok], Y[ok], 1)
        R = [[(r[i], r[i + 1]) for i in range(0, len(r), 2)] for r in md['outl']]
        def inside(x, y):
            c = False
            for r in R:
                for (x1, y1), (x2, y2) in zip(r, r[1:] + r[:1]):
                    if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1): c = not c
            return c
        out = []
        for kd, nm, a, b in pois:
            x, y = kx * b + bx, ky * a + by
            if 0 <= x < md['W'] and 0 <= y < md['H'] and inside(x, y):
                if any(q[0] == kd and math.hypot(q[1] - x, q[2] - y) < 250 for q in out): continue   # ugyanaz a létesítmény pontként és területként
                out.append([kd, round(x), round(y), nm[:60]])
        md['poi'] = out
        json.dump(md, open(jf, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        print(os.path.basename(jf), 'illesztés', int(ok.sum()), 'település, eltérés %.1f m' % float(res[ok].mean()), {k: sum(1 for q in out if q[0] == k) for k in ('hosp', 'pol', 'mil')}, flush=True)
