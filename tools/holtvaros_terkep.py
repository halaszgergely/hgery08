#!/usr/bin/env python3
"""Holtváros – megyetérképek készítése Magyarország OpenStreetMap-kivonatából.

  python3 tools/terkep_osszefuz.py                    # a 4 részből összefűzi a .osm.pbf-et
  python3 tools/holtvaros_terkep.py [munkamappa]      # 1) kinyerés (gyorsítótár a munkamappában)  2) megyénkénti fájlok

Kimenet a jatekok/holtvaros/terkep/ mappában:
  megyek.js      – országos áttekintő (megyehatárok, nevek)
  <megye>.json   – áttekintő rétegek: határ, vizek, erdők, főutak, vasút, települések, beépítettség
  <megye>.bin    – a teljes úthálózat 2048 m-es csempékben (csomópontok + élek)
Adat: © OpenStreetMap-közreműködők (ODbL). Csak a numpy és a PIL kell hozzá; a .pbf olvasója itt van megírva.
"""
import sys, os, zlib, struct, json, math, base64, time, pickle, unicodedata
import numpy as np
from multiprocessing import Pool
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'jatekok', 'holtvaros', 'terkep')
PBF = os.path.join(OUT, 'hungary-261119.osm.pbf')
WORK = sys.argv[1] if len(sys.argv) > 1 else '/tmp/holtvaros-osm'
ROAD = {b'motorway': 5, b'motorway_link': 5, b'trunk': 4, b'trunk_link': 4, b'primary': 3, b'primary_link': 3, b'secondary': 2, b'secondary_link': 2, b'tertiary': 1, b'tertiary_link': 1,
        b'unclassified': 0, b'residential': 0, b'living_street': 0, b'pedestrian': 0}
KEYS = [b'highway', b'railway', b'waterway', b'natural', b'landuse', b'leisure', b'building', b'bridge', b'tunnel', b'name', b'service', b'area', b'boundary', b'admin_level', b'type', b'place', b'population', b'usage']

# ---------- .osm.pbf olvasó ----------
def varint(b, i):
    r = s = 0
    while True:
        c = b[i]; i += 1; r |= (c & 127) << s
        if c < 128: return r, i
        s += 7
def fields(b):
    i, n = 0, len(b)
    while i < n:
        k, i = varint(b, i); w = k & 7
        if w == 0: v, i = varint(b, i)
        elif w == 2: l, i = varint(b, i); v = b[i:i + l]; i += l
        elif w == 5: v = b[i:i + 4]; i += 4
        else: v = b[i:i + 8]; i += 8
        yield k >> 3, v
def pk(b):                                   # kis csomagolt varint-tömb
    o = []; i, n = 0, len(b)
    while i < n: v, i = varint(b, i); o.append(v)
    return o
def pkn(b):                                  # nagy csomagolt varint-tömb, vektorosan
    a = np.frombuffer(b, np.uint8)
    if not len(a): return np.zeros(0, np.uint64)
    ends = np.flatnonzero(a < 128); starts = np.empty_like(ends); starts[0] = 0; starts[1:] = ends[:-1] + 1
    pos = np.arange(len(a)) - np.repeat(starts, ends - starts + 1)
    return np.add.reduceat((a & 127).astype(np.uint64) << (7 * pos).astype(np.uint64), starts)
zz = lambda a: (a >> np.uint64(1)).astype(np.int64) ^ -(a & np.uint64(1)).astype(np.int64)
def zzl(l):
    o = []; c = 0
    for v in l: c += (v >> 1) ^ -(v & 1); o.append(c)
    return o
def blobs():
    o = []
    with open(PBF, 'rb') as f:
        while True:
            h = f.read(4)
            if len(h) < 4: break
            hd = f.read(struct.unpack('>I', h)[0]); typ = size = None
            for k, v in fields(hd):
                if k == 1: typ = bytes(v)
                elif k == 3: size = v
            if typ == b'OSMData': o.append((f.tell(), size))
            f.seek(size, 1)
    return o
def block(off, size):
    with open(PBF, 'rb') as f: f.seek(off); raw = f.read(size)
    data = None
    for k, v in fields(raw):
        if k == 1: data = bytes(v)
        elif k == 3: data = zlib.decompress(v)
    st = []; groups = []; gran, lato, lono = 100, 0, 0
    for k, v in fields(memoryview(data)):
        if k == 1: st = [bytes(s) for kk, s in fields(v) if kk == 1]
        elif k == 2: groups.append(v)
        elif k == 17: gran = v
        elif k == 19: lato = v
        elif k == 20: lono = v
    return st, groups, gran, lato, lono

MEMB = set(); NEED = None
def tags_of(st, ki, kb, vb):
    ks = pk(kb)
    if not ki.intersection(ks): return None
    vs = pk(vb); return {st[k]: st[v] for k, v in zip(ks, vs) if k in ki}
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
                t = tags_of(st, ki, kb, vb)
                if not t: continue
                kind = None
                if t.get(b'boundary') == b'administrative' and t.get(b'admin_level') == b'6': kind = 'adm'
                elif t.get(b'type') == b'multipolygon':
                    if t.get(b'natural') == b'water' or t.get(b'waterway') == b'riverbank': kind = 'water'
                    elif t.get(b'landuse') == b'forest' or t.get(b'natural') == b'wood': kind = 'green'
                if kind: out.append((kind, t.get(b'name', b'').decode(), [m for m, ty in zip(zzl(pk(mem)), pk(typ)) if ty == 1]))
            elif mode == 'W' and gk == 3:
                kb = vb = rb = b''; wid = 0
                for k, v in fields(gv):
                    if k == 1: wid = v
                    elif k == 2: kb = v
                    elif k == 3: vb = v
                    elif k == 8: rb = v
                if wid in MEMB: out.append(('m', wid, np.array(zzl(pk(rb)), np.int64)))
                t = tags_of(st, ki, kb, vb) if len(kb) else None
                if not t: continue
                if b'building' in t: 
                    if len(rb): v0 = varint(rb, 0)[0]; out.append(('b', (v0 >> 1) ^ -(v0 & 1)))
                    continue
                refs = None; hw = t.get(b'highway')
                if hw in ROAD and t.get(b'area') != b'yes':
                    refs = np.array(zzl(pk(rb)), np.int64); out.append(('r', ROAD[hw] | (8 if t.get(b'bridge', b'no') != b'no' else 0) | (16 if t.get(b'tunnel', b'no') != b'no' else 0), refs)); continue
                if t.get(b'railway') == b'rail' and b'service' not in t and t.get(b'tunnel', b'no') == b'no': out.append(('t', np.array(zzl(pk(rb)), np.int64))); continue
                ww = t.get(b'waterway')
                if ww in (b'river', b'canal'): out.append(('w', t.get(b'name', b'').decode(), ww == b'river', np.array(zzl(pk(rb)), np.int64))); continue
                if t.get(b'natural') == b'water' or ww == b'riverbank' or t.get(b'landuse') == b'reservoir': out.append(('wp', np.array(zzl(pk(rb)), np.int64))); continue
                gk2 = 0 if (t.get(b'landuse') == b'forest' or t.get(b'natural') == b'wood') else 1 if t.get(b'leisure') == b'park' else None
                if gk2 is not None: out.append(('g', gk2, np.array(zzl(pk(rb)), np.int64)))
            elif mode == 'N' and gk == 2:
                ib = lb = ob = kv = b''
                for k, v in fields(gv):
                    if k == 1: ib = v
                    elif k == 8: lb = v
                    elif k == 9: ob = v
                    elif k == 10: kv = v
                ids = np.cumsum(zz(pkn(ib))); lat = np.cumsum(zz(pkn(lb))); lon = np.cumsum(zz(pkn(ob)))
                m = np.isin(ids, NEED, assume_unique=True)
                if m.any(): out.append(('n', ids[m], 1e-9 * (lato + gran * lat[m]), 1e-9 * (lono + gran * lon[m])))
                if len(kv) and b'place' in st:
                    pi = st.index(b'place'); arr = pkn(kv).astype(np.int64).tolist(); ni = 0; i = 0
                    while i < len(arr):
                        if arr[i] == 0: ni += 1; i += 1; continue
                        t = {}
                        while arr[i] != 0: t[arr[i]] = arr[i + 1]; i += 2
                        if pi in t:
                            tt = {st[k]: st[v] for k, v in t.items()}
                            out.append(('p', tt.get(b'place', b'').decode(), tt.get(b'name', b'').decode(), tt.get(b'population', b'').decode(), 1e-9 * (lato + gran * int(lat[ni])), 1e-9 * (lono + gran * int(lon[ni]))))
    return out

def extract():
    global MEMB, NEED
    cache = os.path.join(WORK, 'kinyert.pkl')
    if os.path.exists(cache): return pickle.load(open(cache, 'rb'))
    bl = blobs(); print(len(bl), 'blokk'); t0 = time.time()
    with Pool(2) as p: rel = [r for o in p.imap_unordered(work, [('R',) + b for b in bl], 8) for r in o]
    print('relációk', len(rel), round(time.time() - t0)); MEMB = {m for r in rel for m in r[2]}
    with Pool(2) as p: ways = [r for o in p.imap_unordered(work, [('W',) + b for b in bl], 8) for r in o]
    print('utak', len(ways), round(time.time() - t0))
    bld = np.array([w[1] for w in ways if w[0] == 'b'], np.int64); ways = [w for w in ways if w[0] != 'b']
    NEED = np.unique(np.concatenate([bld] + [w[-1] for w in ways]))
    with Pool(2) as p: nd = [r for o in p.imap_unordered(work, [('N',) + b for b in bl], 8) for r in o]
    print('csomópontok', round(time.time() - t0))
    ids = np.concatenate([n[1] for n in nd if n[0] == 'n']); lat = np.concatenate([n[2] for n in nd if n[0] == 'n']); lon = np.concatenate([n[3] for n in nd if n[0] == 'n'])
    o = np.argsort(ids); d = dict(rel=rel, ways=ways, bld=bld, ids=ids[o], lat=lat[o], lon=lon[o], places=[n[1:] for n in nd if n[0] == 'p'])
    os.makedirs(WORK, exist_ok=True); pickle.dump(d, open(cache, 'wb'), 4); return d

# ---------- feldolgozás ----------
def dp(x, y, tol):                           # Douglas–Peucker, a megtartott indexekkel
    n = len(x)
    if n < 3: return list(range(n))
    keep = [False] * n; keep[0] = keep[-1] = True; st = [(0, n - 1)]; t2 = tol * tol
    while st:
        a, b = st.pop()
        if b - a < 2: continue
        ax, ay = x[a], y[a]; dx, dy = x[b] - ax, y[b] - ay; l2 = dx * dx + dy * dy; md = -1.0; mi = -1
        for i in range(a + 1, b):
            px, py = x[i] - ax, y[i] - ay
            if l2:
                t = (px * dx + py * dy) / l2; t = 0 if t < 0 else 1 if t > 1 else t; px -= dx * t; py -= dy * t
            d = px * px + py * py
            if d > md: md = d; mi = i
        if md > t2: keep[mi] = True; st.append((a, mi)); st.append((mi, b))
    return [i for i in range(n) if keep[i]]
def chains(segs, closed_only=False):         # végpontjuknál összeérő szakaszok összefűzése
    from collections import defaultdict
    segs = [list(q) for q in segs if len(q) > 1]; out = [q for q in segs if q[0] == q[-1]]; op = [q for q in segs if q[0] != q[-1]]
    idx = defaultdict(list)
    for i, q in enumerate(op): idx[q[0]].append(i); idx[q[-1]].append(i)
    used = [False] * len(op)
    def grow(cur):
        while cur[0] != cur[-1]:
            nx = [j for j in idx[cur[-1]] if not used[j]]
            if not nx or (not closed_only and len(idx[cur[-1]]) != 2): break
            j = nx[0]; used[j] = True; t = op[j]; cur += t[1:] if t[0] == cur[-1] else t[::-1][1:]
        return cur
    for i, q in enumerate(op):
        if used[i]: continue
        used[i] = True; cur = grow(list(q))
        if not closed_only and cur[0] != cur[-1]: cur = grow(cur[::-1])
        if not closed_only or (cur[0] == cur[-1] and len(cur) > 3): out.append(cur)
    return out
def slug(n): return ''.join(c for c in unicodedata.normalize('NFD', n.lower()) if c.isalnum() or c == '-').strip('-')
RIVW = {'Duna': 280, 'Tisza': 120, 'Dráva': 100, 'Maros': 70, 'Mosoni-Duna': 60, 'Ráckevei (Soroksári)-Duna': 70, 'Ráckevei-Duna': 70, 'Soroksári-Duna': 70, 'Szentendrei-Duna': 160, 'Hármas-Körös': 60, 'Szamos': 60, 'Bodrog': 60, 'Sajó': 30, 'Rába': 30, 'Sió': 20, 'Hernád': 25, 'Zagyva': 16, 'Ipoly': 20, 'Kettős-Körös': 40, 'Sebes-Körös': 30, 'Fehér-Körös': 30, 'Fekete-Körös': 30, 'Berettyó': 20, 'Túr': 16, 'Kraszna': 20, 'Mura': 60, 'Zala': 16}

def build(D):
    ids, lat, lon = D['ids'], D['lat'], D['lon']; GKX, GKY = 111320 * math.cos(math.radians(47.2)), 111190
    def ix(refs): i = np.searchsorted(ids, refs); i[i >= len(ids)] = 0; return i[ids[i] == refs]
    def geo(refs, tol):                      # refs → (lon[], lat[]) egyszerűsítve
        i = ix(np.asarray(refs, np.int64))
        if len(i) < 2: return None
        x = (lon[i] * GKX).tolist(); y = (lat[i] * GKY).tolist(); k = dp(x, y, tol); return lon[i][k], lat[i][k]
    def area(g): x = g[0] * GKX; y = g[1] * GKY; return abs(float(np.dot(x[:-1], y[1:]) - np.dot(x[1:], y[:-1]))) / 2
    ways = D['ways']; memb = {w[1]: w[2] for w in ways if w[0] == 'm'}; t0 = time.time()
    # --- úthálózat: csomópontok a kereszteződések és az alakpontok, az élek egyenes szakaszok
    rw = [w for w in ways if w[0] == 'r']; cnt = np.bincount(ix(np.concatenate([w[2] for w in rw])), minlength=len(ids))
    ea, eb, ef = [], [], []; exl, exa = [], []; nbase = len(ids)
    for _, fl, refs in rw:
        li = ix(refs)
        if len(li) < 2: continue
        x = (lon[li] * GKX).tolist(); y = (lat[li] * GKY).tolist(); j = (cnt[li] > 1).tolist(); L = li.tolist(); n = len(L); p = 0
        for q in range(1, n):
            if not (j[q] or q == n - 1): continue
            k = [p + v for v in dp(x[p:q + 1], y[p:q + 1], 4)]; p = q
            for u, v in zip(k, k[1:]):
                a, b = L[u], L[v]; d = math.hypot(x[v] - x[u], y[v] - y[u])
                if a == b or d < .5: continue
                m = int(d // 350)
                for s in range(1, m + 1):
                    t = s / (m + 1); nn = nbase + len(exl); exl.append(lon[a] + (lon[b] - lon[a]) * t if a < nbase else 0); exa.append(lat[a] + (lat[b] - lat[a]) * t if a < nbase else 0)
                    if a >= nbase: exl[-1] = exl[a - nbase] + (lon[b] - exl[a - nbase]) * (1 / (m + 2 - s)); exa[-1] = exa[a - nbase] + (lat[b] - exa[a - nbase]) * (1 / (m + 2 - s))
                    ea.append(a); eb.append(nn); ef.append(fl); a = nn
                ea.append(a); eb.append(b); ef.append(fl)
    NL = np.concatenate([lon, np.array(exl)]); NA = np.concatenate([lat, np.array(exa)]); ea = np.array(ea); eb = np.array(eb); ef = np.array(ef, np.uint8)
    print('élek', len(ea), round(time.time() - t0))
    # --- beépítettség: az él „lakott”, ha a közelében épület áll
    bi = ix(D['bld']); BL, BA = lon[bi], lat[bi]; cell = lambda lo, la, dx=0, dy=0: (np.floor(lo * GKX / 32).astype(np.int64) + dx) * 400000 + np.floor(la * GKY / 32).astype(np.int64) + dy
    bc = np.unique(cell(BL, BA)); built = np.zeros(len(ea), bool)
    for t in (0, .5, 1):
        lo = NL[ea] + (NL[eb] - NL[ea]) * t; la = NA[ea] + (NA[eb] - NA[ea]) * t
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1): built |= np.isin(cell(lo, la, dx, dy), bc)
    ef = ef | (built.astype(np.uint8) << 5); print('lakott élek', int(built.sum()), round(time.time() - t0))
    # --- rétegek (lon/lat-ban, megyénként vetítve)
    def polys(kind_way, kind_rel, amin, tol, sel=lambda w: True):
        o = []
        for w in ways:
            if w[0] == kind_way and sel(w) and len(w[-1]) > 3 and w[-1][0] == w[-1][-1]:
                g = geo(w[-1], tol)
                if g and len(g[0]) > 3 and area(g) >= amin: o.append([g])
        for r in D['rel']:
            if r[0] != kind_rel: continue
            rs = [g for g in (geo(c, tol) for c in chains([memb[m] for m in r[2] if m in memb], True)) if g and len(g[0]) > 3]
            if rs and max(area(g) for g in rs) >= amin: o.append(rs)
        for q in o: q.append((min(g[0].min() for g in q), min(g[1].min() for g in q), max(g[0].max() for g in q), max(g[1].max() for g in q)))
        return o
    wpoly = polys('wp', 'water', 4000, 5); forest = polys('g', 'green', 80000, 20, lambda w: w[1] == 0); park = polys('g', None, 8000, 8, lambda w: w[1] == 1)
    def lines(segs, tol): return [g for g in (geo(c, tol) for c in chains(segs)) if g]
    rails = lines([w[1] for w in ways if w[0] == 't'], 6); wl = {}
    for w in ways:
        if w[0] == 'w': wl.setdefault((w[1], w[2]), []).append(w[3])
    wline = [(RIVW.get(nm, 14 if riv else 8), g) for (nm, riv), segs in wl.items() for g in lines(segs, 5)]
    over = [(w[1] & 7, g) for w in rw if (w[1] & 7) >= 1 for g in [geo(w[2], 25)] if g]
    print('rétegek: víz', len(wpoly), 'erdő', len(forest), 'park', len(park), 'vasút', len(rails), 'folyó', len(wline), 'főút', len(over), round(time.time() - t0))
    counties = []
    for r in D['rel']:
        if r[0] == 'adm' and r[1].endswith(' megye'):
            rs = [g for g in (geo(c, 30) for c in chains([memb[m] for m in r[2] if m in memb], True)) if g and area(g) > 1e6]
            if rs: counties.append((r[1], rs))
    def pip(g, x, y):
        X, Y = g; c = False; j = len(X) - 1
        for i in range(len(X)):
            if (Y[i] > y) != (Y[j] > y) and x < (X[j] - X[i]) * (y - Y[i]) / (Y[j] - Y[i]) + X[i]: c = not c
            j = i
        return c
    PT = {'city': 60, 'town': 8, 'village': 1.2}; stamp = time.strftime('%Y%m%d%H%M'); index = []
    C0 = (16.0, 48.65); IK = 10                                      # országos áttekintő: 1 egység = 100 m
    for name, rs in sorted(counties):
        cid = slug(name[:-6]); al = np.concatenate([g[0] for g in rs]); aa = np.concatenate([g[1] for g in rs])
        LON0, LON1, LAT0, LAT1 = al.min() - .03, al.max() + .03, aa.min() - .02, aa.max() + .02; KX, KY = 111320 * math.cos(math.radians((LAT0 + LAT1) / 2)), 111190
        W, H = int((LON1 - LON0) * KX), int((LAT1 - LAT0) * KY); T = 2048; TXN, TYN = W // T + 1, H // T + 1
        PX = lambda lo: (lo - LON0) * KX; PY = lambda la: (LAT1 - la) * KY
        flat = lambda g: np.stack([np.round(PX(g[0])), np.round(PY(g[1]))], 1).astype(int).ravel().tolist()
        hit = lambda b: b[0] < LON1 and b[2] > LON0 and b[1] < LAT1 and b[3] > LAT0
        ghit = lambda g: hit((g[0].min(), g[1].min(), g[0].max(), g[1].max()))
        # csempemaszk: a megye (és egy csempényi környezete)
        im = Image.new('L', (TXN, TYN), 0); dr = ImageDraw.Draw(im)
        for g in rs: dr.polygon(list(zip((PX(g[0]) / T).tolist(), (PY(g[1]) / T).tolist())), fill=255)
        tm = np.array(im.filter(ImageFilter.MaxFilter(3))).T > 0                   # [tx, ty]
        used = np.unique(np.concatenate([ea, eb])); x = PX(NL[used]); y = PY(NA[used]); ok = (x >= 0) & (y >= 0) & (x < W) & (y < H)
        used, x, y = used[ok], x[ok], y[ok]; tx = (x // T).astype(int); ty = (y // T).astype(int); ok = tm[tx, ty]; used, x, y, tx, ty = used[ok], x[ok], y[ok], tx[ok], ty[ok]
        t = tx * TYN + ty; o = np.argsort(t, kind='stable'); used, x, y, t = used[o], x[o], y[o], t[o]
        nn = np.bincount(t, minlength=TXN * TYN); st = np.concatenate([[0], np.cumsum(nn)[:-1]]); loc = np.arange(len(used)) - st[t]; assert nn.max() < 65536, nn.max()
        gl = np.full(len(NL), -1, np.int64); gl[used] = np.arange(len(used))
        A, B = gl[ea], gl[eb]; m = (A >= 0) & (B >= 0); A, B, F = A[m], B[m], ef[m]; sw = t[A] > t[B]; A, B = np.where(sw, B, A), np.where(sw, A, B)
        dx = t[B] // TYN - t[A] // TYN; dy = t[B] % TYN - t[A] % TYN; assert np.abs(dx).max() <= 1 and np.abs(dy).max() <= 1
        o = np.argsort(t[A], kind='stable'); A, B, F, dx, dy = A[o], B[o], F[o], dx[o], dy[o]; ne = np.bincount(t[A], minlength=TXN * TYN); es = np.concatenate([[0], np.cumsum(ne)[:-1]])
        nrec = np.zeros(len(used), [('x', '<u2'), ('y', '<u2')]); nrec['x'] = np.clip((x - (t // TYN) * T) * 32, 0, 65535); nrec['y'] = np.clip((y - (t % TYN) * T) * 32, 0, 65535)
        erec = np.zeros(len(A), [('a', '<u2'), ('b', '<u2'), ('c', 'u1'), ('f', 'u1')]); erec['a'] = loc[A]; erec['b'] = loc[B]; erec['c'] = (dx + 1) * 3 + dy + 1; erec['f'] = F
        head = 8 + 12 * TXN * TYN; off = head; idx = bytearray(); body = []
        for k in range(TXN * TYN):
            if not nn[k]: idx += struct.pack('<IHHI', 0, 0, 0, 0); continue
            nb = nrec[st[k]:st[k] + nn[k]].tobytes(); ebt = erec[es[k]:es[k] + ne[k]].tobytes(); idx += struct.pack('<IHHI', off, int(nn[k]), 0, int(ne[k])); body += [nb, ebt]; off += len(nb) + len(ebt)
        open(os.path.join(OUT, cid + '.bin'), 'wb').write(struct.pack('<4sHH', b'HVG1', TXN, TYN) + bytes(idx) + b''.join(body))
        # beépítettségi raszter (256 m)
        bx = PX(BL); by = PY(BA); ok = (bx >= 0) & (by >= 0) & (bx < W) & (by < H); MW, MH = W // 256 + 1, H // 256 + 1
        mk = np.bincount((by[ok] // 256).astype(int) * MW + (bx[ok] // 256).astype(int), minlength=MW * MH) >= 3
        towns = []; labels = []
        for kind, nm, pop, la, lo in D['places']:
            if not nm or not (LON0 < lo < LON1 and LAT0 < la < LAT1): continue
            if kind in PT:
                try: pv = int(pop.replace(' ', '')) / 1000
                except ValueError: pv = PT[kind]
                towns.append([nm, round(PX(lo)), round(PY(la)), round(pv, 1), any(pip(g, lo, la) for g in rs)])
            elif kind in ('suburb', 'quarter', 'borough', 'neighbourhood'): labels.append([round(PX(lo)), round(PY(la)), nm, 22 if kind != 'neighbourhood' else 12])
        cap = max((q for q in towns if q[4]), key=lambda q: q[3]); towns = [q[:4] for q in towns if q[4]]
        meta = dict(id=cid, title=name.replace(' megye', ' vármegye'), W=W, H=H, K=1000, T=T, cap=[cap[0].upper(), cap[1], cap[2]], outl=[flat(g) for g in rs],
                    water=[[w, flat(g)] for w, g in wline if ghit(g)], wpoly=[[flat(g) for g in q[:-1]] for q in wpoly if hit(q[-1])],
                    green=[[0, [flat(g) for g in q[:-1]]] for q in forest if hit(q[-1])] + [[1, [flat(g) for g in q[:-1]]] for q in park if hit(q[-1])],
                    roads=[[c, flat(g)] for c, g in over if ghit(g)], rails=[flat(g) for g in rails if ghit(g)], towns=towns, labels=labels,
                    mask=dict(c=256, w=MW, h=MH, b=base64.b64encode(np.packbits(mk).tobytes()).decode()))
        json.dump(meta, open(os.path.join(OUT, cid + '.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
        index.append(dict(id=cid, title=meta['title'], cap=cap[0], capxy=[round((LON0 + cap[1] / KX - C0[0]) * GKX / 1000 * IK), round((C0[1] - (LAT1 - cap[2] / KY)) * GKY / 1000 * IK)],
                          out=[np.stack([np.round((g[0][k] - C0[0]) * GKX / 1000 * IK), np.round((C0[1] - g[1][k]) * GKY / 1000 * IK)], 1).astype(int).ravel().tolist() for g in rs for k in [dp((g[0] * GKX).tolist(), (g[1] * GKY).tolist(), 250)]]))
        print(cid, W, H, 'csomópont', len(used), 'él', len(A), 'bin', off // 1024, 'kB · json', os.path.getsize(os.path.join(OUT, cid + '.json')) // 1024, 'kB', cap[0])
    IW = max(max(r[0::2]) for q in index for r in q['out']) + 60; IH = max(max(r[1::2]) for q in index for r in q['out']) + 60
    open(os.path.join(OUT, 'megyek.js'), 'w').write('/* Holtváros – országos áttekintő. Generálta: tools/holtvaros_terkep.py · adat: © OpenStreetMap-közreműködők (ODbL) */\nwindow.HGZIndex = ' + json.dumps(dict(W=IW, H=IH, v=stamp, maps=index), ensure_ascii=False, separators=(',', ':')) + ';\n')

if __name__ == '__main__':
    build(extract())
