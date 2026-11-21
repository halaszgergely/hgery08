#!/usr/bin/env python3
"""Vasúti Birodalom – az országos vasúthálózat gráfja az OSM-kivonatból.

Kimenet: jatekok/vasut/halo.json
  K: méretarány (1 egység = 1 méter), W/H: a térkép mérete
  n: csomópontok [x, y]  (elágazások, végpontok)
  e: élek [a, b, hossz, villamosított(0/1), max seb. km/h, [x0,y0,x1,y1,…] ]
  s: állomások [név, típus(0 állomás / 1 megálló), él, pozíció az élen méterben]
  o: országhatár / vármegyehatárok (a Holtváros áttekintőjéből), w: nagy vizek
Vetület: x = (lon − 16,0)·KX, y = (48,65 − lat)·KY méterben (ugyanaz, mint a Holtváros országos áttekintője ×100).
Futás: python3 tools/vasut_halo.py   (kb. 2 perc; a .osm.pbf kell hozzá, lásd jatekok/holtvaros/terkep/README.md)
"""
import re, os, sys, json, math, glob
import numpy as np
from multiprocessing import Pool
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from holtvaros_terkep import fields, pk, pkn, zz, zzl, blobs, block, dp, OUT as HOUT

OUTD = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'jatekok', 'vasut')
LON0, LAT1 = 16.0, 48.65
KX, KY = 111320 * math.cos(math.radians(47.2)), 111190
TAGK = {b'railway', b'service', b'electrified', b'maxspeed', b'name', b'usage', b'place', b'population', b'waterway', b'public_transport', b'train', b'building'}

def work(a):
    mode, off, size = a; st, groups, gran, lato, lono = block(off, size); out = []
    ki = {i for i, s in enumerate(st) if s in TAGK}
    if not ki: return out
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
                t = {st[k]: st[v] for k, v in zip(ks, pk(vb)) if k in ki}
                svc = t.get(b'service'); rw = t.get(b'railway')
                if rw in (b'rail', b'disused'):
                    try: vm = int(t.get(b'maxspeed', b'0').split()[0])
                    except ValueError: vm = 0
                    out.append(('r', 1 if t.get(b'electrified', b'no') not in (b'no', b'') else 0, vm, zzl(pk(rb)), 2 if rw == b'disused' else 0 if svc is None else 1))
                elif t.get(b'railway') == b'platform' or (t.get(b'public_transport') == b'platform' and t.get(b'train') == b'yes'): out.append(('p', zzl(pk(rb))))
                elif t.get(b'building') == b'train_station': out.append(('b', zzl(pk(rb))))
                elif rw == b'turntable': out.append(('t', zzl(pk(rb))))
                elif t.get(b'waterway') == b'river': out.append(('w', t.get(b'name', b'').decode(), zzl(pk(rb))))
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
                if not len(kv): continue
                arr = pkn(kv).astype(np.int64); z = np.flatnonzero(arr == 0); st0 = np.concatenate([[0], z[:-1] + 1])
                for ni in np.flatnonzero(z > st0).tolist():
                    seg = arr[st0[ni]:z[ni]].tolist(); t = {}
                    for j in range(0, len(seg) - 1, 2):
                        if seg[j] in ki: t[st[seg[j]]] = st[seg[j + 1]]
                    if not t: continue
                    rw = t.get(b'railway')
                    if rw in (b'station', b'halt') and b'name' in t: out.append(('s', t[b'name'].decode(), 0 if rw == b'station' else 1, float(lat[ni]), float(lon[ni])))
    return out

NEED = np.zeros(0, np.int64)
def init(need):
    global NEED; NEED = need

def P(lon, lat): return (lon - LON0) * KX, (LAT1 - lat) * KY

if __name__ == '__main__':
    import pickle
    cache = '/tmp/vasut-osm3.pkl'
    if os.path.exists(cache): W, N = pickle.load(open(cache, 'rb'))
    else:
        bl = blobs(); print(len(bl), 'blokk', flush=True)
        with Pool(2) as p: W = [r for o in p.imap_unordered(work, sorted([('W',) + b for b in bl]), 8) for r in o]
        need = np.unique(np.array([r for w in W if w[0] == 'r' for r in w[3]] + [r for w in W if w[0] in 'wpb' for r in (w[2] if w[0] == 'w' else w[1])] + [r for w in W if w[0] == 't' for r in w[1]], np.int64))
        with Pool(2, initializer=init, initargs=(need,)) as p: N = [r for o in p.imap_unordered(work, sorted([('N',) + b for b in bl]), 8) for r in o]
        pickle.dump((W, N), open(cache, 'wb'))
    rails = [w for w in W if w[0] == 'r']; rivers = [w for w in W if w[0] == 'w']
    print('sínek', len(rails), 'folyók', len(rivers), round(sum(len(w[3]) for w in rails)), 'pont', flush=True)
    ids = np.concatenate([n[1] for n in N if n[0] == 'n']); la = np.concatenate([n[2] for n in N if n[0] == 'n']); lo = np.concatenate([n[3] for n in N if n[0] == 'n'])
    o = np.argsort(ids); ids, la, lo = ids[o], la[o], lo[o]
    xs, ys = P(lo, la)
    def ix(refs): refs = np.asarray(refs, np.int64); i = np.searchsorted(ids, refs); i[i >= len(ids)] = 0; return i[ids[i] == refs]
    # gráf: csomópont minden olyan OSM-pont, amely több vonalon szerepel, vagy vonalvég
    cnt = {}
    for w in rails:
        r = w[3]
        for q in r: cnt[q] = cnt.get(q, 0) + 1
        cnt[r[0]] = cnt.get(r[0], 0) + 5; cnt[r[-1]] = cnt.get(r[-1], 0) + 5
    nid = {}; nodes = []; edges = []
    def node(q):
        if q not in nid:
            j = ix([q])
            if not len(j): return None
            nid[q] = len(nodes); nodes.append((float(xs[j[0]]), float(ys[j[0]])))
        return nid[q]
    for _, el, vm, refs, svc in rails:
        p0 = 0
        for k in range(1, len(refs)):
            if cnt.get(refs[k], 0) > 1 or k == len(refs) - 1:
                seg = refs[p0:k + 1]; j = ix(seg)
                if len(j) >= 2:
                    px = xs[j].tolist(); py = ys[j].tolist(); keep = dp(px, py, 12)
                    a, b = node(seg[0]), node(seg[-1])
                    if a is not None and b is not None and a != b:
                        pts = [(px[i], py[i]) for i in keep]; L = sum(math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) for i in range(len(pts) - 1))
                        if L > 1: edges.append([a, b, L, el, vm or (20 if svc == 2 else 30 if svc else 0), pts, svc])
                p0 = k
    print('csomópont', len(nodes), 'él', len(edges), flush=True)
    # kettes fokszámú csomópontok összevonása (azonos villamosítás / sebesség mellett), kis komponensek elhagyása
    adj = {}
    for k, e in enumerate(edges): adj.setdefault(e[0], []).append(k); adj.setdefault(e[1], []).append(k)
    dead = set()
    for v, ks in list(adj.items()):
        ks = [k for k in ks if k not in dead]
        if len(ks) != 2 or ks[0] == ks[1]: continue
        e1, e2 = edges[ks[0]], edges[ks[1]]
        if e1[3] != e2[3] or e1[4] != e2[4] or e1[6] != e2[6]: continue
        p1 = e1[5] if e1[1] == v else e1[5][::-1]; a = e1[0] if e1[1] == v else e1[1]
        p2 = e2[5] if e2[0] == v else e2[5][::-1]; b = e2[1] if e2[0] == v else e2[0]
        if a == b: continue
        ne = [a, b, e1[2] + e2[2], e1[3], e1[4], p1 + p2[1:], e1[6]]
        dead.add(ks[0]); dead.add(ks[1]); edges.append(ne); nk = len(edges) - 1
        for x in (a, b): adj[x] = [nk if k in (ks[0], ks[1]) else k for k in adj[x]]
        adj[v] = []
    edges = [e for k, e in enumerate(edges) if k not in dead]
    # összekötés: az OSM-ben a vonalak gyakran csak állomási mellékvágányon (amit elhagyunk) kapcsolódnak, ezért a
    # különböző komponensek egymáshoz közeli pontjait (vonalvég ↔ bármely csomópont 250 m-en, két csomópont 60 m-en belül) összekötjük
    def comps():
        par = list(range(len(nodes)))
        def f(x):
            while par[x] != x: par[x] = par[par[x]]; x = par[x]
            return x
        for e in edges: par[f(e[0])] = f(e[1])
        return [f(i) for i in range(len(nodes))]
    deg = [0] * len(nodes)
    for e in edges: deg[e[0]] += 1; deg[e[1]] += 1
    Gn = {}
    for i, (x, y) in enumerate(nodes):
        if deg[i]: Gn.setdefault((int(x // 250), int(y // 250)), []).append(i)
    for rnd in range(6):
        cp = comps(); cand = []
        for i, (x, y) in enumerate(nodes):
            if not deg[i]: continue
            lim = 250 if deg[i] == 1 else 60
            for gx in range(int(x // 250) - 1, int(x // 250) + 2):
                for gy in range(int(y // 250) - 1, int(y // 250) + 2):
                    for j in Gn.get((gx, gy), []):
                        if cp[j] != cp[i]:
                            d = math.hypot(nodes[j][0] - x, nodes[j][1] - y)
                            if d < lim: cand.append((d, i, j))
        cand.sort(); added = 0
        par = {}
        def f2(x):
            while par.get(x, x) != x: x = par[x]
            return x
        for d, i, j in cand:
            a_, b_ = f2(cp[i]), f2(cp[j])
            if a_ == b_: continue
            par[a_] = b_; added += 1
            el = 0; edges.append([i, j, max(d, 1), el, 0, [nodes[i], nodes[j]], 0]); deg[i] += 1; deg[j] += 1
        print('összekötés', rnd, added, flush=True)
        if not added: break
    # vonalvégek: ha a vonal folytatásában 150 m-en belül egy másik él fut (az OSM-ben közös pont nélkül), oda bekötjük (az élet ott kettévágjuk)
    deg = [0] * len(nodes)
    for e in edges: deg[e[0]] += 1; deg[e[1]] += 1
    SG = {}
    for k, e in enumerate(edges):
        for i in range(len(e[5]) - 1):
            (x0, y0), (x1, y1) = e[5][i], e[5][i + 1]
            for gx in range(int(min(x0, x1) // 200), int(max(x0, x1) // 200) + 1):
                for gy in range(int(min(y0, y1) // 200), int(max(y0, y1) // 200) + 1): SG.setdefault((gx, gy), []).append((k, i))
    own = {}
    for k, e in enumerate(edges): own.setdefault(e[0], []).append(k); own.setdefault(e[1], []).append(k)
    splits = {}; links = []; links_direct = []
    for v in range(len(nodes)):
        if deg[v] != 1: continue
        k0 = own[v][0]; e0 = edges[k0]
        if e0[6]: continue
        pts = e0[5] if e0[0] == v else e0[5][::-1]
        x, y = pts[0]; j = 1
        while j < len(pts) - 1 and math.hypot(pts[j][0] - x, pts[j][1] - y) < 40: j += 1
        dx, dy = x - pts[j][0], y - pts[j][1]; l = math.hypot(dx, dy) or 1; dx, dy = dx / l, dy / l
        best = None
        for gx in range(int(x // 200) - 1, int(x // 200) + 2):
            for gy in range(int(y // 200) - 1, int(y // 200) + 2):
                for k, i in SG.get((gx, gy), []):
                    if k == k0: continue
                    (x0, y0), (x1, y1) = edges[k][5][i], edges[k][5][i + 1]; sx, sy = x1 - x0, y1 - y0; L2 = sx * sx + sy * sy or 1
                    t = max(0, min(1, ((x - x0) * sx + (y - y0) * sy) / L2)); px, py = x0 + sx * t, y0 + sy * t; d = math.hypot(px - x, py - y)
                    if d > 150 or (d > 8 and ((px - x) * dx + (py - y) * dy) / d < .45): continue
                    if best is None or d < best[0]: best = (d, k, i, t, px, py)
        if best:
            d, k, i, t, px, py = best; e = edges[k]; links.append(v)
            near = [w for w, q in ((e[0], e[5][0]), (e[1], e[5][-1])) if math.hypot(q[0] - px, q[1] - py) < 4]
            if near: links_direct.append((v, near[0]))
            else: splits.setdefault(k, []).append((i, t, px, py, v))
    ne = []; rm = set()
    for k, lst in splits.items():
        e = edges[k]; rm.add(k); lst.sort(); pts = e[5]; cur = [pts[0]]; a = e[0]; ci = 0
        for (i, t, px, py, v) in lst:
            while ci < i: ci += 1; cur.append(pts[ci])
            nodes.append((px, py)); m = len(nodes) - 1; cur.append((px, py))
            L = sum(math.hypot(cur[q + 1][0] - cur[q][0], cur[q + 1][1] - cur[q][1]) for q in range(len(cur) - 1))
            if L > .5: ne.append([a, m, L, e[3], e[4], cur, e[6]])
            else: m = a
            vx, vy = nodes[v]; ne.append([v, m, max(1, math.hypot(px - vx, py - vy)), e[3], e[4], [nodes[v], (px, py)], 0])
            a = m; cur = [(px, py)]
        cur += pts[ci + 1:]; L = sum(math.hypot(cur[q + 1][0] - cur[q][0], cur[q + 1][1] - cur[q][1]) for q in range(len(cur) - 1))
        if L > .5 and a != e[1]: ne.append([a, e[1], L, e[3], e[4], cur, e[6]])
    edges = [e for k, e in enumerate(edges) if k not in rm] + ne + [[v, w, max(1, math.hypot(nodes[w][0] - nodes[v][0], nodes[w][1] - nodes[v][1])), 0, 0, [nodes[v], nodes[w]], 0] for v, w in links_direct if v != w]
    print('vonalvég-bekötés', len(links), flush=True)
    # komponensek
    par = list(range(len(nodes)))
    def f(x):
        while par[x] != x: par[x] = par[par[x]]; x = par[x]
        return x
    for e in edges: par[f(e[0])] = f(e[1])
    tot = {}
    for e in edges: r = f(e[0]); tot[r] = tot.get(r, 0) + e[2]
    print('komponensek (km):', sorted([round(v / 1000) for v in tot.values()], reverse=True)[:12], 'össz', round(sum(tot.values()) / 1000), flush=True)
    big = max(tot, key=tot.get); edges = [e for e in edges if f(e[0]) == big]
    used = sorted({e[0] for e in edges} | {e[1] for e in edges}); remap = {v: i for i, v in enumerate(used)}
    nodes = [nodes[v] for v in used]
    for e in edges: e[0] = remap[e[0]]; e[1] = remap[e[1]]
    print('fő hálózat', len(nodes), 'csomópont', len(edges), 'él', round(sum(e[2] for e in edges) / 1000), 'km', flush=True)
    # fordítókorongok: a korongon belüli vágánydarabok helyett középpont + karok (a peremnél végződő vágányok), a szemközti oldalon hiányzó karok helyett vak csonk
    tts = []; drop = set()
    for w in W:
        if w[0] != 't': continue
        j = ix(w[1])
        if len(j) < 4: continue
        px, py = xs[j], ys[j]; cx, cy = float(px.mean()), float(py.mean()); r = float(np.hypot(px - cx, py - cy).mean())
        if r < 5 or r > 25: continue
        for k, e in enumerate(edges):
            if k in drop: continue
            if all(math.hypot(q[0] - cx, q[1] - cy) < r + 2.5 for q in e[5]): drop.add(k)
        tts.append([cx, cy, r])
    if tts:
        keep = [e for k, e in enumerate(edges) if k not in drop]; edges[:] = keep
        deg = [0] * len(nodes)
        for e in edges: deg[e[0]] += 1; deg[e[1]] += 1
        TT = []
        for cx, cy, r in tts:
            arms = [i for i, (x, y) in enumerate(nodes[:len(deg)]) if deg[i] and math.hypot(x - cx, y - cy) < r + 4]
            if len(arms) < 2: continue
            c = len(nodes); nodes.append((cx, cy)); conn = []; angs = []
            for i in arms:
                x, y = nodes[i]; a = math.atan2(y - cy, x - cx); edges.append([i, c, max(1, math.hypot(x - cx, y - cy)), 0, 5, [nodes[i], (cx, cy)], 1]); conn.append(len(edges) - 1); angs.append(a)
            # párok: minden kar a szemközti karral (0,12 rad-on belül), ha nincs ilyen, egy vak csonkkal
            dif = lambda a, b: abs(((a - b) + math.pi) % (2 * math.pi) - math.pi)
            cand = sorted((dif(angs[p], angs[q] + math.pi), p, q) for p in range(len(arms)) for q in range(p + 1, len(arms)))
            used = set(); pairs = []; stubs = []
            for dd, p, q in cand:
                if dd > .12: break
                if p in used or q in used: continue
                used |= {p, q}; pairs.append([conn[p], conn[q]])
            for p in range(len(arms)):
                if p in used: continue
                a = angs[p]; sx, sy = cx + math.cos(a + math.pi) * r, cy + math.sin(a + math.pi) * r; nodes.append((sx, sy)); edges.append([len(nodes) - 1, c, r, 0, 5, [(sx, sy), (cx, cy)], 1])
                pairs.append([conn[p], len(edges) - 1]); stubs.append(len(edges) - 1)
            conn = pairs
            TT.append([round(cx, 1), round(cy, 1), round(r, 1), c, conn, stubs])
        print('fordítókorong', len(TT), 'eldobott belső él', len(drop), flush=True)
    else: TT = []
    # ipari rakodók: a telephelyen belül (vagy 60 m-en belül) futó mellék- és iparvágány
    IP = []
    if os.path.exists('/tmp/vasut-ipar.pkl'):
        import unicodedata, collections
        def fold(t): return ''.join(c for c in unicodedata.normalize('NFD', t.lower()) if not unicodedata.combining(c))
        def kind(nm, t):
            n = fold(nm) + ' ' + fold(' '.join(t.get(k, '') for k in ('industrial', 'product', 'operator', 'plant:source', 'resource', 'works', 'man_made')))
            has = lambda *w: any(x in n for x in w)
            if has('steel', 'acel', 'dunaferr', 'vasmu', 'koho', 'metallurg'): return 'acel'
            if has('cement', 'mesz', 'concrete', 'beton'): return 'cement'
            if has('refiner', 'finomito', 'kozolaj'): return 'finomito'
            if has('chemical', 'vegyi', 'chem', 'nitrogen', 'mutragya', 'tvk', 'gyogyszer', 'pharma'): return 'vegyi'
            if t.get('power') == 'plant' or has('eromu', 'power', 'biomass', 'coal'): return 'eromu'
            if t.get('landuse') == 'quarry' or has('quarry', 'banya', 'mine', 'kofejto', 'kavics', 'homok'): return 'banya'
            if has('audi', 'mercedes', 'suzuki', 'bmw', 'opel', 'autogyar', 'jarmu', 'automotive'): return 'auto'
            if has('sawmill', 'furesz', 'fatelep', 'faipar', 'fafeldolg', 'paper', 'papir', 'lumber', 'wood'): return 'fa'
            if has('grinding_mill', 'malom', 'gabona', 'silo', 'agro', 'agricult', 'takarmany', 'food', 'cukor', 'sugar', 'konzerv', 'slaughter', 'vagohid'): return 'malom'
            if has('scrap', 'recycl', 'hulladek', 'ocskavas'): return 'hulladek'
            if has('logist', 'warehouse', 'depot', 'port', 'terminal', 'kikoto', 'kontener', 'raktar', 'transport'): return 'logisz'
            if has('brick', 'tegla', 'cserep'): return 'tegla'
            if has('oil', 'natural_gas', 'gas', 'olaj', 'substation', 'communication', 'water', 'wastewater', 'heating'): return None
            return 'gyar'
        TP = {}
        for k, e in enumerate(edges):
            if not e[6]: continue
            pts = e[5]; acc = 0
            for i in range(len(pts) - 1):
                (x0, y0), (x1, y1) = pts[i], pts[i + 1]; L = math.hypot(x1 - x0, y1 - y0)
                for t in np.linspace(0, 1, max(2, int(L / 20) + 1)):
                    x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t; TP.setdefault((int(x // 200), int(y // 200)), []).append((x, y, k, acc + L * t))
                acc += L
        def pip(px, py, x, y):
            c = False; j = len(px) - 1
            for i in range(len(px)):
                if (py[i] > y) != (py[j] > y) and x < (px[j] - px[i]) * (y - py[i]) / ((py[j] - py[i]) or 1e-9) + px[i]: c = not c
                j = i
            return c
        cand = []
        for nm, t, lo, la in pickle.load(open('/tmp/vasut-ipar.pkl', 'rb')):
            ty = kind(nm, t)
            if not ty: continue
            px, py = P(np.array(lo), np.array(la)); px = px.tolist(); py = py.tolist()
            x0, x1, y0, y1 = min(px), max(px), min(py), max(py)
            if x1 - x0 > 8000 or y1 - y0 > 8000: continue
            cx, cy = sum(px) / len(px), sum(py) / len(py); area = (x1 - x0) * (y1 - y0); best = None
            for gx in range(int((x0 - 60) // 200), int((x1 + 60) // 200) + 1):
                for gy in range(int((y0 - 60) // 200), int((y1 + 60) // 200) + 1):
                    for (x, y, k, sp) in TP.get((gx, gy), []):
                        if x < x0 - 60 or x > x1 + 60 or y < y0 - 60 or y > y1 + 60: continue
                        inside = pip(px, py, x, y)
                        if not inside and min((x - qx) ** 2 + (y - qy) ** 2 for qx, qy in zip(px[::3], py[::3])) > 3600: continue
                        d = math.hypot(x - cx, y - cy) + (0 if inside else 150)
                        if best is None or d < best[0]: best = (d, k, sp, x, y)
            if best: cand.append((0 if nm else 1, -area, nm, ty, best, px, py))
        cand.sort(key=lambda q: (q[0], q[1])); taken = []
        for _, _, nm, ty, (d, k, sp, x, y), px, py in cand:
            if any(math.hypot(x - q[0], y - q[1]) < 350 for q in taken): continue
            taken.append((x, y)); kk = dp(px, py, 15)
            IP.append([nm[:40], ty, k, round(sp), [round(v) for i in kk for v in (px[i], py[i])][:400]])
        print('ipari rakodó', len(IP), dict(collections.Counter(q[1] for q in IP)), flush=True)
    # állomások: a legközelebbi élpontra vetítve (300 m-en belül)
    G = {}
    for k, e in enumerate(edges):
        acc = 0; pts = e[5]
        for i in range(len(pts) - 1):
            (x0, y0), (x1, y1) = pts[i], pts[i + 1]; L = math.hypot(x1 - x0, y1 - y0)
            for t in np.linspace(0, 1, max(2, int(L / 100) + 1)):
                x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t; G.setdefault((int(x // 500), int(y // 500)), []).append((x, y, k, acc + L * t))
            acc += L
    sts = []; seen = {}
    for q in N:
        if q[0] != 's': continue
        _, name, typ, lat, lon = q; x, y = P(lon, lat); best = None
        for gx in range(int(x // 500) - 1, int(x // 500) + 2):
            for gy in range(int(y // 500) - 1, int(y // 500) + 2):
                for (px, py, k, s) in G.get((gx, gy), []):
                    d = math.hypot(px - x, py - y) + (80 if edges[k][6] else 0)
                    if d < 300 and (best is None or d < best[0]): best = (d, k, s)
        if not best: continue
        name = re.sub(r'\s+(vasútállomás|megállóhely|pályaudvar\b(?=.*)|állomás)$', lambda m: ' pályaudvar' if 'pályaudvar' in m.group(0) else '', name).strip()
        key = re.sub(r'^budapest-', '', name.lower()).replace(' pályaudvar', '')
        if key in seen and math.hypot(seen[key][0] - x, seen[key][1] - y) < 2500:
            if typ == 0: sts[seen[key][2]][1] = 0
            continue
        seen[key] = (x, y, len(sts)); sts.append([name[:40], typ, best[1], round(best[2])])
    # nagy (teherpályaudvarral bíró) állomás: elágazás közelében (2 km) vagy pályaudvar; a többi megálló marad
    deg = [0] * len(nodes)
    for e in edges: deg[e[0]] += 1; deg[e[1]] += 1
    J = {}
    for i, (x, y) in enumerate(nodes):
        if deg[i] >= 3: J.setdefault((int(x // 2000), int(y // 2000)), []).append((x, y))
    for q in sts:
        if q[1] != 0: continue
        e = edges[q[2]]; px, py = e[5][0]
        acc = 0; pts = e[5]
        for i in range(len(pts) - 1):
            L = math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
            if acc + L >= q[3]: t = (q[3] - acc) / (L or 1); px, py = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t; break
            acc += L
        near = any(math.hypot(jx - px, jy - py) < 2000 for gx in range(int(px // 2000) - 1, int(px // 2000) + 2) for gy in range(int(py // 2000) - 1, int(py // 2000) + 2) for jx, jy in J.get((gx, gy), []))
        if not (near or 'pályaudvar' in q[0] or q[0].startswith('Budapest-')): q[1] = 1
    print('állomás', len(sts), flush=True)
    # háttér: országos áttekintő (vármegyehatárok, 100 m-es egység), folyók, települések
    idx = json.loads(open(os.path.join(HOUT, 'megyek.js'), encoding='utf-8').read().split('=', 1)[1].strip().rstrip(';'))
    outl = [[v * 100 for v in r] for m in idx['maps'] for r in m['out']]
    riv = []
    for _, name, refs in rivers:
        j = ix(refs)
        if len(j) < 2: continue
        px = xs[j].tolist(); py = ys[j].tolist(); L = sum(math.hypot(px[i + 1] - px[i], py[i + 1] - py[i]) for i in range(len(px) - 1))
        big = name in ('Duna', 'Tisza', 'Dráva', 'Rába', 'Maros', 'Szamos', 'Körös', 'Sajó', 'Hármas-Körös')
        if L < (200 if big else 3000): continue
        k = dp(px, py, 120); riv.append([1 if big else 0] + [round(v) for i in k for v in (px[i], py[i])])
    plat, sbld = [], []
    for w in W:
        if w[0] not in 'pb': continue
        j = ix(w[1])
        if len(j) < 2: continue
        px = xs[j].tolist(); py = ys[j].tolist(); k = dp(px, py, 1.5); closed = w[1][0] == w[1][-1] and len(j) > 3
        if w[0] == 'p': plat.append([1 if closed else 0] + [round(v) for i in k for v in (px[i], py[i])])
        elif closed: sbld.append([round(v) for i in k for v in (px[i], py[i])])
    print('peron', len(plat), 'állomásépület', len(sbld), flush=True)
    W_, H_ = idx['W'] * 100, idx['H'] * 100
    json.dump({'K': 1, 'W': W_, 'H': H_, 'n': [[round(x), round(y)] for x, y in nodes],
               'e': [[e[0], e[1], round(e[2]), e[3], e[4], [round(v) for p in e[5] for v in p], e[6]] for e in edges], 'pl': plat, 'sb': sbld, 'tt': TT, 'ip': IP,
               's': sts, 'o': outl, 'w': riv}, open(os.path.join(OUTD, 'halo.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('kész', os.path.getsize(os.path.join(OUTD, 'halo.json')) // 1024, 'kB', flush=True)
