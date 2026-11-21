#!/usr/bin/env python3
"""Mozdonyvezető – táj a vasúttérkép alá.

Kimenet (jatekok/vasut/):
  taj_osztaly.png  0 mező / 1 erdő / 2 beépített / 3 víz / 4 külföld (×50), ugyanazon a rácson
  taj.jpg   domborzat-árnyékolás + erdők + beépített területek országos rasztere (RES m/képpont, a halo.json vetületében)
  taj.json  { R: RES, nx, ny,
              z: { c: 1000, nx, ny, b: base64 uint16 tengerszint feletti magasság (m) 1 km-es rácson } – a fizikához (emelkedő),
              r: [[típus, x0,y0,x1,y1,…], …] országos főúthálózat (a Holtváros-megyetérképekből),
              m: { megye: [ax, sx, ay, x0, y0, x1, y1] }  a megyei helyi koordináták → országos: X = ax + x·sx, Y = ay + y }
A közeli nézethez a játék a Holtváros megyei fájljait (…/holtvaros/terkep/<megye>.json és .haz) tölti be.
Futás: python3 tools/vasut_taj.py   (kell: /tmp/holtvaros-osm/kinyert2.pkl a holtvaros_terkep.py-ból, valamint a .osm.pbf)
"""
import os, sys, json, math, pickle, base64, time
import numpy as np
from multiprocessing import Pool
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from holtvaros_terkep import fields, pk, pkn, zz, blobs, block, dp, chains, slug, OUT as HOUT

OUTD = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'jatekok', 'vasut')
LONC, LATC = 16.0, 48.65
KXN, KY = 111320 * math.cos(math.radians(47.2)), 111190
RES = 250
TAGK = {b'ele', b'natural', b'place'}

def work(a):
    off, size = a; st, groups, gran, lato, lono = block(off, size); out = []
    ki = {i for i, s in enumerate(st) if s in TAGK}
    if not ki: return out
    for g in groups:
        for gk, gv in fields(g):
            if gk != 2: continue
            ib = lb = ob = kv = b''
            for k, v in fields(gv):
                if k == 8: lb = v
                elif k == 9: ob = v
                elif k == 10: kv = v
            if not len(kv): continue
            lat = 1e-9 * (lato + gran * np.cumsum(zz(pkn(lb)))); lon = 1e-9 * (lono + gran * np.cumsum(zz(pkn(ob))))
            arr = pkn(kv).astype(np.int64); z = np.flatnonzero(arr == 0); st0 = np.concatenate([[0], z[:-1] + 1])
            for ni in np.flatnonzero(z > st0).tolist():
                seg = arr[st0[ni]:z[ni]].tolist(); t = {}
                for j in range(0, len(seg) - 1, 2):
                    if seg[j] in ki: t[st[seg[j]]] = st[seg[j + 1]]
                e = t.get(b'ele')
                if not e: continue
                try: ev = float(e.decode().replace(',', '.').split()[0].rstrip('m'))
                except (ValueError, IndexError, UnicodeDecodeError): continue
                if not (70 <= ev <= 1100): continue
                kind = 2 if t.get(b'natural') in (b'peak', b'hill', b'saddle', b'ridge') else 1 if b'place' in t else 0
                out.append((float(lon[ni]), float(lat[ni]), ev, kind))
    return out

def P(lon, lat): return (np.asarray(lon) - LONC) * KXN, (LATC - np.asarray(lat)) * KY

if __name__ == '__main__':
    t0 = time.time()
    idx = json.loads(open(os.path.join(HOUT, 'megyek.js'), encoding='utf-8').read().split('=', 1)[1].strip().rstrip(';'))
    W, H = idx['W'] * 100, idx['H'] * 100; nx, ny = W // RES + 1, H // RES + 1
    # --- megyei vetületek (pontosan, ahogy a holtvaros_terkep.py számolja)
    pc = '/tmp/vasut-megyek.json'
    if os.path.exists(pc): MP = json.load(open(pc))
    else:
        D = pickle.load(open('/tmp/holtvaros-osm/kinyert2.pkl', 'rb')); ids, lat, lon = D['ids'], D['lat'], D['lon']; GKX, GKY = KXN, KY
        def ix(refs): i = np.searchsorted(ids, refs); i[i >= len(ids)] = 0; return i[ids[i] == refs]
        def geo(refs, tol):
            i = ix(np.asarray(refs, np.int64))
            if len(i) < 2: return None
            x = (lon[i] * GKX).tolist(); y = (lat[i] * GKY).tolist(); k = dp(x, y, tol); return lon[i][k], lat[i][k]
        def area(g): x = g[0] * GKX; y = g[1] * GKY; return abs(float(np.dot(x[:-1], y[1:]) - np.dot(x[1:], y[:-1]))) / 2
        memb = {w[1]: w[2] for w in D['ways'] if w[0] == 'm'}; MP = {}
        for r in D['rel']:
            if r[0] == 'adm' and r[1].endswith(' megye'):
                rs = [g for g in (geo(c, 30) for c in chains([memb[m] for m in r[2] if m in memb], True)) if g and area(g) > 1e6]
                if not rs: continue
                al = np.concatenate([g[0] for g in rs]); aa = np.concatenate([g[1] for g in rs])
                LON0, LON1, LAT0, LAT1 = al.min() - .03, al.max() + .03, aa.min() - .02, aa.max() + .02; KX = 111320 * math.cos(math.radians((LAT0 + LAT1) / 2))
                MP[slug(r[1][:-6])] = [float(LON0), float(LAT1), float(KX)]
        del D; json.dump(MP, open(pc, 'w'))
    print('megyék', len(MP), round(time.time() - t0), flush=True)
    mp = {}
    for cid, (LON0, LAT1, KX) in MP.items():
        md = json.load(open(os.path.join(HOUT, cid + '.json'), encoding='utf-8'))
        ax, sx, ay = (LON0 - LONC) * KXN, KXN / KX, (LATC - LAT1) * KY
        mp[cid] = [round(ax, 2), round(sx, 6), round(ay, 2), round(ax), round(ay), round(ax + md['W'] * sx), round(ay + md['H'])]
    # --- magasságpontok
    pc2 = '/tmp/vasut-ele.pkl'
    if os.path.exists(pc2): EL = pickle.load(open(pc2, 'rb'))
    else:
        bl = blobs()
        with Pool(2) as p: EL = [r for o in p.imap_unordered(work, sorted(bl), 8) for r in o]
        pickle.dump(EL, open(pc2, 'wb'))
    EL = np.array(EL); print('magasságpont', len(EL), 'csúcs', int((EL[:, 3] == 2).sum()), round(time.time() - t0), flush=True)
    ex, ey = P(EL[:, 0], EL[:, 1]); ev = EL[:, 2]
    # --- magasságmező: 1 km-es rácson súlyozott átlag (csúcsok erősebben), majd simítás; az alföldi alapszint a környező pontokból
    from scipy.ndimage import gaussian_filter, zoom as nzoom, distance_transform_edt
    C = 1000; zx, zy = W // C + 1, H // C + 1
    ix_ = np.clip((ex / C).astype(int), 0, zx - 1); iy_ = np.clip((ey / C).astype(int), 0, zy - 1)
    w = np.where(EL[:, 3] == 2, 3.0, 1.0)
    S = np.zeros((zy, zx)); N = np.zeros((zy, zx)); MX = np.zeros((zy, zx))
    np.add.at(S, (iy_, ix_), ev * w); np.add.at(N, (iy_, ix_), w); np.maximum.at(MX, (iy_, ix_), ev)
    mean = np.where(N > 0, S / np.maximum(N, 1e-9), 0)
    cell = np.where(N > 0, .55 * mean + .45 * MX, 0)
    # hiányzó cellák: a legközelebbi ismert cella értéke, aztán simítás
    known = N > 0; _, (iy2, ix2) = distance_transform_edt(~known, return_indices=True); Z = cell[iy2, ix2]
    Z = gaussian_filter(Z, 1.6); Z = np.clip(Z, 75, 1015)
    # --- nagyfelbontású raszter: domborzatárnyékolás + színezés
    Zh = nzoom(Z, C / RES, order=3)[:ny, :nx]; Zh = np.pad(Zh, ((0, max(0, ny - Zh.shape[0])), (0, max(0, nx - Zh.shape[1]))), mode='edge')
    Zh = gaussian_filter(Zh, 1.2)
    gy, gx = np.gradient(Zh, RES); az, alt = math.radians(315), math.radians(40)
    slope = np.arctan(np.hypot(gx, gy) * 7); aspect = np.arctan2(-gx, gy)
    hs = np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect)
    t = np.clip((Zh - 80) / 700, 0, 1)[..., None]
    low, mid, high = np.array([62, 70, 46]), np.array([74, 74, 52]), np.array([104, 96, 80])
    col = np.where(t < .35, low + (mid - low) * (t / .35), mid + (high - mid) * ((t - .35) / .65))
    col = col * (.5 + .7 * hs[..., None])
    # erdők és beépített területek a megyei rétegekből
    forest = Image.new('L', (nx, ny), 0); fd = ImageDraw.Draw(forest); water = Image.new('L', (nx, ny), 0); wd = ImageDraw.Draw(water); built = np.zeros((ny, nx), bool); roads = []
    for cid, (ax, sx, ay, *_r) in mp.items():
        md = json.load(open(os.path.join(HOUT, cid + '.json'), encoding='utf-8'))
        for k, rs in md['green']:
            for r in rs:
                pts = [((ax + r[i] * sx) / RES, (ay + r[i + 1]) / RES) for i in range(0, len(r) - 1, 2)]
                if len(pts) >= 3: fd.polygon(pts, fill=255 if k == 0 else 160)
        for rs in md['wpoly']:
            for j, r in enumerate(rs):
                pts = [((ax + r[i] * sx) / RES, (ay + r[i + 1]) / RES) for i in range(0, len(r) - 1, 2)]
                if len(pts) >= 3: wd.polygon(pts, fill=255)
        m = md['mask']; bits = np.unpackbits(np.frombuffer(base64.b64decode(m['b']), np.uint8))[:m['w'] * m['h']].reshape(m['h'], m['w'])
        yy, xx = np.nonzero(bits)
        for dy in (0, .5):
            for dx in (0, .5):
                X = ((ax + (xx + dx) * m['c'] * sx) / RES).astype(int); Y = ((ay + (yy + dy) * m['c']) / RES).astype(int); ok = (X >= 0) & (Y >= 0) & (X < nx) & (Y < ny); built[Y[ok], X[ok]] = True
        for tp, r in md['roads']:
            x = [ax + r[i] * sx for i in range(0, len(r) - 1, 2)]; y = [ay + r[i + 1] for i in range(0, len(r) - 1, 2)]
            if tp < 2: continue
            roads.append((int(tp), [(round(x[j] / 8), round(y[j] / 8)) for j in range(len(x))]))
    # utak: megyehatáron ismétlődő darabok kiszűrése, láncolás típusonként, egyszerűsítés
    seen = set(); byt = {}
    for tp, pts in roads:
        k = (tp, pts[0], pts[-1]); k2 = (tp, pts[-1], pts[0])
        if k in seen or k2 in seen or len(pts) < 2: continue
        seen.add(k); byt.setdefault(tp, []).append(pts)
    roads = []
    for tp, segs in byt.items():
        for c in chains(segs):
            x = [p[0] * 8 for p in c]; y = [p[1] * 8 for p in c]; k = dp(x, y, 70 if tp >= 3 else 120)
            if len(k) >= 2 and sum(math.hypot(x[k[i + 1]] - x[k[i]], y[k[i + 1]] - y[k[i]]) for i in range(len(k) - 1)) > 150: roads.append([tp] + [round(v) for j in k for v in (x[j], y[j])])
    # a megyék (holtvárosi) maszkjai szerint az ország külső része sötét
    outside = Image.new('L', (nx, ny), 0); od = ImageDraw.Draw(outside)
    for m_ in idx['maps']:
        for r in m_['out']: od.polygon([(r[i] * 100 / RES, r[i + 1] * 100 / RES) for i in range(0, len(r) - 1, 2)], fill=255)
    inside = np.array(outside.filter(ImageFilter.GaussianBlur(1.5))) / 255.0
    f = np.array(forest.filter(ImageFilter.GaussianBlur(.6))) / 255.0
    fcol = np.array([30, 62, 34]) * (.5 + .7 * hs[..., None])
    col = col * (1 - f[..., None] * .85) + fcol * f[..., None] * .85
    b = gaussian_filter(built.astype(float), .7)
    col = col * (1 - b[..., None] * .4) + np.array([112, 106, 98]) * b[..., None] * .4
    wt = np.array(water.filter(ImageFilter.GaussianBlur(.5))) / 255.0; col = col * (1 - wt[..., None]) + np.array([38, 72, 104]) * (.8 + .3 * hs[..., None]) * wt[..., None]
    col = col * inside[..., None] + np.array([16, 20, 17]) * (1 - inside[..., None])
    # osztályraszter a közeli nézet rajzolásához: 0 mező, 1 erdő, 2 beépített, 3 víz, 4 országon kívül (×50 szürkeárnyalat)
    fr = np.array(forest) / 255.0; cls = np.zeros((ny, nx), np.uint8); cls[fr > .5] = 1; cls[built] = 2; cls[np.array(water) > 127] = 3; cls[np.array(outside) < 128] = 4
    Image.fromarray(cls * 50).save(os.path.join(OUTD, 'taj_osztaly.png'), optimize=True)
    Image.fromarray(np.clip(col, 0, 255).astype(np.uint8)).save(os.path.join(OUTD, 'taj.jpg'), quality=82, optimize=True, progressive=True)
    print('raszter', nx, ny, os.path.getsize(os.path.join(OUTD, 'taj.jpg')) // 1024, 'kB', 'utak', len(roads), round(time.time() - t0), flush=True)
    zb = base64.b64encode(np.round(Z).astype('<u2').tobytes()).decode()
    json.dump({'R': RES, 'nx': nx, 'ny': ny, 'z': {'c': C, 'nx': zx, 'ny': zy, 'b': zb}, 'r': roads, 'm': mp},
              open(os.path.join(OUTD, 'taj.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('kész', os.path.getsize(os.path.join(OUTD, 'taj.json')) // 1024, 'kB', round(time.time() - t0), flush=True)
