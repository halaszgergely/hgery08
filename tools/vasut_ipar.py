#!/usr/bin/env python3
"""Mozdonyvezető – ipari telephelyek kigyűjtése az OSM-kivonatból (a vasut_halo.py használja).

Telephely: landuse=industrial|quarry, man_made=works, power=plant vagy industrial=* címkés vonal/terület/reláció.
Kimenet: /tmp/vasut-ipar.pkl  [(név, {címkék}, [lon…], [lat…]), …]  – a külső gyűrű pontjai (relációnál az összes külső tag).
Futás: python3 tools/vasut_ipar.py   (kb. 3 perc)
"""
import os, sys, pickle, time
import numpy as np
from multiprocessing import Pool
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from holtvaros_terkep import fields, pk, pkn, zz, zzl, blobs, block

KEYS = {b'landuse', b'man_made', b'industrial', b'product', b'name', b'power', b'operator', b'plant:source', b'resource', b'type', b'works', b'building'}
MEMB = set(); NEED = np.zeros(0, np.int64)

def site(t):
    return (t.get(b'landuse') in (b'industrial', b'quarry') or t.get(b'man_made') == b'works' or t.get(b'power') == b'plant' or b'industrial' in t) and t.get(b'building') is None

def dec(t): return {k.decode(): v.decode('utf-8', 'replace') for k, v in t.items()}

def work(a):
    mode, off, size = a; st, groups, gran, lato, lono = block(off, size); out = []
    ki = {i for i, s in enumerate(st) if s in KEYS}
    for g in groups:
        for gk, gv in fields(g):
            if mode == 'R' and gk == 4:
                kb = vb = mem = typ = b''
                for k, v in fields(gv):
                    if k == 2: kb = v
                    elif k == 3: vb = v
                    elif k == 9: mem = v
                    elif k == 10: typ = v
                if not len(kb) or not ki.intersection(pk(kb)): continue
                t = {st[k]: st[v] for k, v in zip(pk(kb), pk(vb)) if k in ki}
                if t.get(b'type') == b'multipolygon' and site(t): out.append(('R', dec(t), [m for m, ty in zip(zzl(pk(mem)), pk(typ)) if ty == 1]))
            elif mode == 'W' and gk == 3:
                kb = vb = rb = b''; wid = 0
                for k, v in fields(gv):
                    if k == 1: wid = v
                    elif k == 2: kb = v
                    elif k == 3: vb = v
                    elif k == 8: rb = v
                if wid in MEMB: out.append(('m', wid, zzl(pk(rb))))
                if not len(kb) or not ki.intersection(pk(kb)): continue
                t = {st[k]: st[v] for k, v in zip(pk(kb), pk(vb)) if k in ki}
                if site(t):
                    r = zzl(pk(rb))
                    if len(r) >= 4 and r[0] == r[-1]: out.append(('W', dec(t), r))
            elif mode == 'N' and gk == 2:
                ib = lb = ob = b''
                for k, v in fields(gv):
                    if k == 1: ib = v
                    elif k == 8: lb = v
                    elif k == 9: ob = v
                ids = np.cumsum(zz(pkn(ib))); m = np.isin(ids, NEED, assume_unique=True)
                if m.any(): out.append(('n', ids[m], 1e-9 * (lato + gran * np.cumsum(zz(pkn(lb))))[m], 1e-9 * (lono + gran * np.cumsum(zz(pkn(ob))))[m]))
    return out

def init(mb, nd):
    global MEMB, NEED; MEMB = mb; NEED = nd

if __name__ == '__main__':
    t0 = time.time(); bl = blobs()
    with Pool(2) as p: R = [r for o in p.imap_unordered(work, sorted([('R',) + b for b in bl]), 8) for r in o]
    mb = {m for r in R for m in r[2]}; print('reláció', len(R), 'tagút', len(mb), round(time.time() - t0), flush=True)
    with Pool(2, initializer=init, initargs=(mb, np.zeros(0, np.int64))) as p: W = [r for o in p.imap_unordered(work, sorted([('W',) + b for b in bl]), 8) for r in o]
    memb = {w[1]: w[2] for w in W if w[0] == 'm'}; ways = [w for w in W if w[0] == 'W']
    sites = [(w[1], [w[2]]) for w in ways] + [(r[1], [memb[m] for m in r[2] if m in memb]) for r in R]
    need = np.unique(np.array([q for _, rs in sites for r in rs for q in r], np.int64)); print('telephely', len(sites), 'pont', len(need), round(time.time() - t0), flush=True)
    with Pool(2, initializer=init, initargs=(set(), need)) as p: N = [r for o in p.imap_unordered(work, sorted([('N',) + b for b in bl]), 8) for r in o]
    ids = np.concatenate([n[1] for n in N]); la = np.concatenate([n[2] for n in N]); lo = np.concatenate([n[3] for n in N]); o = np.argsort(ids); ids, la, lo = ids[o], la[o], lo[o]
    out = []
    for t, rs in sites:
        pts = np.concatenate([np.asarray(r, np.int64) for r in rs]) if rs else np.zeros(0, np.int64)
        i = np.searchsorted(ids, pts); i[i >= len(ids)] = 0; i = i[ids[i] == pts]
        if len(i) >= 3: out.append((t.get('name', ''), t, lo[i].tolist(), la[i].tolist()))
    pickle.dump(out, open('/tmp/vasut-ipar.pkl', 'wb')); print('kész', len(out), round(time.time() - t0), flush=True)
