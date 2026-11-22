"""HGWS Vízfuvar: a miskolci telephely helye és a fuvarcélok (irodaházak, családi házak) a Holtváros OSM-adataiból.
Kimenet: jatekok/vizfuvar/adat/celok.json – országos méterkoordináták (x kelet, z dél; a Légi Öntözés vetülete)."""
import json, struct, math, random, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KX = 111320 * math.cos(math.radians(47.2)); KY = 111190
P = lambda lon, lat: ((lon - 16) * KX, (48.65 - lat) * KY)
M = json.load(open(R + '/jatekok/vasut/taj.json'))['m']
CID = 'borsod-abauj-zemplen'; ax, sx, ay = M[CID][:3]
b = open(R + f'/jatekok/holtvaros/terkep/{CID}.bin', 'rb').read(); h = open(R + f'/jatekok/holtvaros/terkep/{CID}.haz', 'rb').read()
TXN, TYN = struct.unpack_from('<HH', b, 4)
jd = json.load(open(R + f'/jatekok/holtvaros/terkep/{CID}.json'))
C0 = P(20.7800, 48.1030); RAD = 13000
x0, x1, z0, z1 = C0[0] - RAD, C0[0] + RAD, C0[1] - RAD, C0[1] + RAD
lx0, lx1, ly0, ly1 = (x0 - ax) / sx, (x1 - ax) / sx, z0 - ay, z1 - ay
blds, roads = [], []
for tx in range(max(0, int(lx0 // 2048) - 1), min(TXN - 1, int(lx1 // 2048)) + 1):
    for ty in range(max(0, int(ly0 // 2048) - 1), min(TYN - 1, int(ly1 // 2048)) + 1):
        t = tx * TYN + ty; bx, by = tx * 2048, ty * 2048
        off, nr, pb = struct.unpack_from('<III', h, 8 + 12 * t)
        if off:
            for i in range(nr):
                xx, yy, w, d, a, hh = struct.unpack_from('<HHBBBB', h, off + i * 8)
                blds.append((ax + (bx + xx / 32) * sx, ay + by + yy / 32, hh, w * d / 4.0, w / 2, d / 2))
            o = off + nr * 8; end = o + pb
            while o < end:
                xx, yy, n, hh = struct.unpack_from('<HHBB', h, o); o += 6
                pts = [struct.unpack_from('<hh', h, o + k * 4) for k in range(n)]; o += n * 4
                ar = abs(sum(pts[k][0] * pts[(k + 1) % n][1] - pts[(k + 1) % n][0] * pts[k][1] for k in range(n))) / 2 / 16
                rr = max(math.hypot(p[0], p[1]) for p in pts) / 4 if pts else 5
                blds.append((ax + (bx + xx / 32) * sx, ay + by + yy / 32, hh, ar, rr, rr))
        off, nn, _, ne = struct.unpack_from('<IHHI', b, 8 + 12 * t)
        if not off: continue
        nodes = [struct.unpack_from('<HH', b, off + i * 4) for i in range(nn)]
        for i in range(ne):
            a_, b_, c_, f = struct.unpack_from('<HHBB', b, off + nn * 4 + i * 6)
            if c_ != 4 or f & 16: continue
            p1, p2 = nodes[a_], nodes[b_]
            roads.append((ax + (bx + p1[0] / 32) * sx, ay + by + p1[1] / 32, ax + (bx + p2[0] / 32) * sx, ay + by + p2[1] / 32, f & 7, f))
blds = [q for q in blds if x0 <= q[0] <= x1 and z0 <= q[1] <= z1]
print('épület', len(blds), 'útszakasz', len(roads))
# térbeli rács a gyors kereséshez
G = 100
def grid(items, key):
    d = {}
    for it in items:
        k = key(it); d.setdefault((int(k[0] // G), int(k[1] // G)), []).append(it)
    return d
BG = grid(blds, lambda q: q[:2]); RG = grid(roads, lambda r: ((r[0] + r[2]) / 2, (r[1] + r[3]) / 2))
def near(d, x, z, r):
    out = []
    for i in range(int((x - r) // G), int((x + r) // G) + 1):
        for j in range(int((z - r) // G), int((z + r) // G) + 1): out += d.get((i, j), [])
    return out
def segdist(px, pz, r):
    dx, dz = r[2] - r[0], r[3] - r[1]; L = dx * dx + dz * dz or 1; t = max(0, min(1, ((px - r[0]) * dx + (pz - r[1]) * dz) / L))
    qx, qz = r[0] + dx * t, r[1] + dz * t; return math.hypot(px - qx, pz - qz), qx, qz
def nearest_road(x, z, rmax=120, mincls=0):
    best = None
    for r in near(RG, x, z, rmax):
        if r[4] < mincls: continue
        d, qx, qz = segdist(x, z, r)
        if not best or d < best[0]: best = (d, qx, qz, r)
    return best
labels = [(ax + l[0] * sx, ay + l[1], l[2]) for l in jd['labels']] + [(ax + t[1] * sx, ay + t[2], t[0]) for t in jd['towns']]
def place(x, z):
    return min(labels, key=lambda l: (l[0] - x) ** 2 + (l[1] - z) ** 2)[2]
def pip(x, z, ring):
    ins = False; n = len(ring) // 2
    for i in range(n):
        x1, z1, x2, z2 = ring[2 * i], ring[2 * i + 1], ring[2 * ((i + 1) % n)], ring[2 * ((i + 1) % n) + 1]
        if (z1 > z) != (z2 > z) and x < x1 + (z - z1) * (x2 - x1) / (z2 - z1): ins = not ins
    return ins
polys = []
for k, rings in jd['green']:
    for r in rings: polys.append([v for i, v in enumerate(r) for v in [(ax + v * sx) if i % 2 == 0 else (ay + v)]][:0] or [(ax + r[i] * sx) if i % 2 == 0 else (ay + r[i]) for i in range(len(r))])
for rings in jd['wpoly']:
    for r in rings[:1]: polys.append([(ax + r[i] * sx) if i % 2 == 0 else (ay + r[i]) for i in range(len(r))])
polys = [p for p in polys if min(p[0::2]) < x1 and max(p[0::2]) > x0 and min(p[1::2]) < z1 and max(p[1::2]) > z0]
PB = [(min(p[0::2]), min(p[1::2]), max(p[0::2]), max(p[1::2]), p) for p in polys]
def ingreen(x, z, m=40):
    return any(b[0] - m <= x <= b[2] + m and b[1] - m <= z <= b[3] + m and any(pip(x + dx, z + dz, b[4]) for dx, dz in ((0, 0), (m, 0), (-m, 0), (0, m), (0, -m))) for b in PB)
# --- telephely: üres terület (nincs épület 75 m-en belül), 30–55 m-re egy legalább mellékúttól, a belvároshoz közel
best = None
for gx in range(-6000, 6001, 50):
    for gz in range(-6000, 6001, 50):
        x, z = C0[0] + gx, C0[1] + gz
        if any(math.hypot(q[0] - x, q[1] - z) < 75 + q[4] for q in near(BG, x, z, 160)): continue
        nr = nearest_road(x, z, 70, 1)
        if not nr or not (30 <= nr[0] <= 55): continue
        if any(segdist(x, z, r)[0] < 28 for r in near(RG, x, z, 80)): continue
        if ingreen(x, z): continue
        dc = math.hypot(gx, gz); sc = dc
        if not best or sc < best[0]: best = (sc, x, z, nr)
_, bx_, bz_, nr = best
base = {'x': round(bx_, 1), 'z': round(bz_, 1), 'kapu': [round(nr[1], 1), round(nr[2], 1)], 'hely': place(bx_, bz_)}
print('telephely', base, 'táv a központtól', round(best[0]))
random.seed(7)
def pick(cond, n, rmax, mind):
    cand = [q for q in blds if cond(q) and math.hypot(q[0] - bx_, q[1] - bz_) < rmax]
    random.shuffle(cand); out = []
    for q in cand:
        if any(math.hypot(q[0] - o[0], q[1] - o[1]) < mind for o in out): continue
        nr = nearest_road(q[0], q[1], 60)
        if not nr or nr[0] < 3: continue
        dx, dz = q[0] - nr[1], q[1] - nr[2]; L = math.hypot(dx, dz) or 1
        out.append((q[0], q[1], round(nr[1] + dx / L * 3.5, 1), round(nr[2] + dz / L * 3.5, 1), q[2]))
        if len(out) >= n: break
    return out
iroda = pick(lambda q: q[2] >= 12 and q[3] >= 350, 36, 9000, 300)
otthon = pick(lambda q: 3 <= q[2] <= 8 and 60 <= q[3] <= 260, 70, 12000, 250)
# a HGWS iroda: a telephelyhez legközelebbi irodaház (az első fuvar)
hgws = min(iroda, key=lambda o: math.hypot(o[0] - bx_, o[1] - bz_))
out = {'telephely': base, 'hgwsIroda': {'x': round(hgws[0], 1), 'z': round(hgws[1], 1), 'px': hgws[2], 'pz': hgws[3], 'nev': 'HGWS iroda – ' + place(hgws[0], hgws[1])},
       'celok': [{'t': 'iroda', 'x': round(o[0], 1), 'z': round(o[1], 1), 'px': o[2], 'pz': o[3], 'nev': 'Irodaház – ' + place(o[0], o[1])} for o in iroda if o is not hgws]
              + [{'t': 'otthon', 'x': round(o[0], 1), 'z': round(o[1], 1), 'px': o[2], 'pz': o[3], 'nev': 'Családi ház – ' + place(o[0], o[1])} for o in otthon]}
# benzinkutak: főút mellett, üres helyen, 2–9 km-re a telephelytől, egymástól távol
kutak = []
cand = [r for r in roads if r[4] >= 3]; random.shuffle(cand)
for r in cand:
    mx, mz = (r[0] + r[2]) / 2, (r[1] + r[3]) / 2; d = math.hypot(mx - bx_, mz - bz_)
    if not 2000 < d < 9000 or any(math.hypot(mx - k['x'], mz - k['z']) < 3500 for k in kutak): continue
    dx, dz = r[2] - r[0], r[3] - r[1]; L = math.hypot(dx, dz) or 1; nx, nz = -dz / L, dx / L
    for sgn in (1, -1):
        x, z = mx + nx * 22 * sgn, mz + nz * 22 * sgn
        if any(math.hypot(q[0] - x, q[1] - z) < 30 + q[4] for q in near(BG, x, z, 120)) or ingreen(x, z, 10): continue
        if any(segdist(x, z, rr)[0] < 14 for rr in near(RG, x, z, 60)): continue
        kutak.append({'x': round(x, 1), 'z': round(z, 1), 'px': round(mx + nx * 8 * sgn, 1), 'pz': round(mz + nz * 8 * sgn, 1), 'rot': round(math.atan2(dx, dz), 3), 'nev': 'Benzinkút – ' + place(x, z)}); break
    if len(kutak) >= 4: break
out['kutak'] = kutak; print('kút', len(kutak))
json.dump(out, open(R + '/jatekok/vizfuvar/adat/celok.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('cél', len(out['celok']), out['hgwsIroda'])
