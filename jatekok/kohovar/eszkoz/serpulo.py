# A Mindustry Serpulo-hadjáratának adatai a forráskódból: szektorrács (PlanetGrid), szektorok (SectorPresets),
# kutatási fa (SerpuloTechTree) és a magyar (angol tartalékkal) szövegek. Kimenet: serpulo.json
# Futtatás: python3 serpulo.py <mindustry-gyökér> <kimeneti fájl>
import sys, re, json, math
root, out = sys.argv[1], sys.argv[2]
src = lambda p: open(f'{root}/core/src/mindustry/{p}', encoding='utf8').read()

# ---- PlanetGrid (az eredeti algoritmus, élek nélkül) ----
X, Z = -0.525731112119133606, -0.850650808352039932
IT = [(-X, 0, Z), (X, 0, Z), (-X, 0, -Z), (X, 0, -Z), (0, Z, X), (0, Z, -X), (0, -Z, X), (0, -Z, -X), (Z, X, 0), (-Z, X, 0), (Z, -X, 0), (-Z, -X, 0)]
ITP = [[9, 4, 1, 6, 11], [4, 8, 10, 6, 0], [11, 7, 3, 5, 9], [2, 7, 10, 8, 5], [9, 5, 8, 1, 0], [2, 3, 8, 4, 9], [0, 1, 10, 7, 11], [11, 6, 10, 3, 2], [5, 3, 10, 1, 4], [2, 5, 4, 0, 11], [3, 7, 6, 1, 8], [7, 2, 9, 0, 6]]
class T:
    def __init__(s, i, n): s.id = i; s.n = n; s.tiles = [None] * n; s.corners = [None] * n; s.v = None
class C:
    def __init__(s, i): s.id = i; s.tiles = [None] * 3; s.corners = [None] * 3; s.v = None
def nor(v): l = math.sqrt(sum(a * a for a in v)); return tuple(a / l for a in v)
def grid(size):
    tc, cc = 10 * 3 ** size + 2, 20 * 3 ** size
    return [T(i, 5 if i < 12 else 6) for i in range(tc)], [C(i) for i in range(cc)]
def pos_t(t, n): return next(i for i in range(t.n) if t.tiles[i] is n)
def pos_c(t, c): return next(i for i in range(t.n) if t.corners[i] is c)
def add_corner(cid, tiles, corners, a, b, c):
    co = corners[cid]; t = [tiles[a], tiles[b], tiles[c]]
    co.v = nor(tuple(t[0].v[k] + t[1].v[k] + t[2].v[k] for k in range(3)))
    for i in range(3): t[i].corners[pos_t(t[i], t[(i + 2) % 3])] = co; co.tiles[i] = t[i]
def connect(corners):
    for c in corners:
        for k in range(3): c.corners[k] = c.tiles[k].corners[(pos_c(c.tiles[k], c) + 1) % c.tiles[k].n]
def initial():
    tiles, corners = grid(0)
    for t in tiles:
        t.v = IT[t.id]
        for k in range(5): t.tiles[k] = tiles[ITP[t.id][k]]
    for i in range(5): add_corner(i, tiles, corners, 0, ITP[0][(i + 4) % 5], ITP[0][i])
    for i in range(5): add_corner(i + 5, tiles, corners, 3, ITP[3][(i + 4) % 5], ITP[3][i])
    for cid, a, b, c in [(10, 10, 1, 8), (11, 1, 10, 6), (12, 6, 10, 7), (13, 6, 7, 11), (14, 11, 7, 2), (15, 11, 2, 9), (16, 9, 2, 5), (17, 9, 5, 4), (18, 4, 5, 8), (19, 4, 8, 1)]: add_corner(cid, tiles, corners, a, b, c)
    connect(corners); return tiles, corners
def subdivide(prev, size):
    pt, pc = prev; tiles, corners = grid(size); P = len(pt)
    for i in range(P):
        tiles[i].v = pt[i].v
        for k in range(tiles[i].n): tiles[i].tiles[k] = tiles[pt[i].corners[k].id + P]
    for i in range(len(pc)):
        tiles[i + P].v = pc[i].v
        for k in range(3): tiles[i + P].tiles[2 * k] = tiles[pc[i].corners[k].id + P]; tiles[i + P].tiles[2 * k + 1] = tiles[pc[i].tiles[k].id]
    nc = 0
    for n in pt:
        t = tiles[n.id]
        for k in range(t.n): add_corner(nc, tiles, corners, t.id, t.tiles[(k + t.n - 1) % t.n].id, t.tiles[k].id); nc += 1
    connect(corners); return tiles, corners
g = initial()
for s in range(1, 4): g = subdivide(g, s)
tiles, corners = g
GRID = [{'v': [round(a, 5) for a in t.v], 'c': [[round(a, 5) for a in c.v] for c in t.corners], 'n': [x.id for x in t.tiles]} for t in tiles]

# ---- szektorok ----
sp = src('content/SectorPresets.java'); ser = sp[sp.index('//region serpulo'):sp.index('//endregion', sp.index('//region serpulo'))]
PRE = {}
for m in re.finditer(r'(\w+) = new SectorPreset\("([\w-]+)", serpulo, (-?\d+)\)\{\{(.*?)\}\};', ser, re.S):
    o = {'id': m.group(2), 'sector': int(m.group(3))}
    for k, v in re.findall(r'(\w+) = ([^;]+);', m.group(4)): o[k] = json.loads(v.rstrip('f')) if re.match(r'^[\d.]+f?$|^true$|^false$', v) else v
    PRE[m.group(1)] = o

# ---- kutatási fa ----
tt = src('content/SerpuloTechTree.java'); body = tt[tt.index('nodeRoot('):]
def camel2kebab(s): return re.sub(r'(?<!^)(?=[A-Z0-9])', '-', s).lower().replace('-', '-')
def match_paren(s, i):
    d = 0
    for j in range(i, len(s)):
        if s[j] == '(': d += 1
        elif s[j] == ')':
            d -= 1
            if d == 0: return j
    raise Exception('paren')
def split_args(s):
    out, d, cur = [], 0, ''
    for ch in s:
        if ch in '({': d += 1
        if ch in ')}': d -= 1
        if ch == ',' and d == 0: out.append(cur.strip()); cur = ''
        else: cur += ch
    if cur.strip(): out.append(cur.strip())
    return out
def parse_body(s):
    nodes, i = [], 0
    while True:
        m = re.compile(r'\b(node|nodeProduce)\(').search(s, i)
        if not m: return nodes
        a = m.end() - 1; b = match_paren(s, a); args = split_args(s[a + 1:b]); i = b + 1
        n = {'k': m.group(1), 'c': args[0], 'req': [], 'cost': None, 'ch': []}
        for x in args[1:]:
            if x.startswith('Seq.with('):
                for r in split_args(x[len('Seq.with('):-1]):
                    mm = re.match(r'new (\w+)\(([\w.]+)\)', r)
                    if mm: n['req'].append([mm.group(1), mm.group(2)])
            elif x.startswith('ItemStack.with('):
                p = split_args(x[len('ItemStack.with('):-1]); n['cost'] = {p[j].split('.')[-1]: int(p[j + 1]) for j in range(0, len(p), 2)}
            elif x.startswith('()'):
                n['ch'] = parse_body(x[x.index('{') + 1:x.rindex('}')])
        nodes.append(n)
a = body.index('('); b = match_paren(body, a); args = split_args(body[a + 1:b])
TREE = {'k': 'root', 'c': args[1], 'req': [], 'cost': None, 'ch': parse_body(args[2][args[2].index('{') + 1:args[2].rindex('}')])}
def norm(n):
    c = n['c']
    if '.' in c: kind, nm = c.split('.')[-2:]; n['c'] = ('item:' if kind == 'Items' else 'liquid:') + camel2kebab(nm)
    elif c in PRE: n['c'] = 'sector:' + PRE[c]['id']
    else: n['c'] = 'content:' + camel2kebab(c)
    n['req'] = [[k, ('sector:' + PRE[v]['id']) if v in PRE else ('item:' + camel2kebab(v.split('.')[1]) if v.startswith('Items.') else 'liquid:' + camel2kebab(v.split('.')[1]) if v.startswith('Liquids.') else 'content:' + camel2kebab(v))] for k, v in n['req']]
    for ch in n['ch']: norm(ch)
norm(TREE)

# ---- szövegek ----
def props(p):
    d = {}
    try:
        for l in open(p, encoding='utf8'):
            m = re.match(r'^\s*([^#=\s][^=]*?)\s*=\s*(.*)$', l)
            if m: d[m.group(1)] = re.sub(r'\\u([0-9a-fA-F]{4})', lambda q: chr(int(q.group(1), 16)), m.group(2).replace('\\n', '\n'))
    except FileNotFoundError: pass
    return d
en, hu = props(f'{root}/core/assets/bundles/bundle.properties'), props(f'{root}/core/assets/bundles/bundle_hu.properties')
need = set()
for o in PRE.values(): need |= {f"sector.{o['id']}.name", f"sector.{o['id']}.description", f"sector.{o['id']}.details"}
need |= {k for k in en if k.startswith(('objective.', 'gz.', 'atolls.', 'frontier.', 'onset.', 'aegis.', 'split.', 'sector.curcapture', 'sector.capture', 'sector.lost', 'wave.', 'threat.', 'sectors.', 'hint.'))}
import glob
for f in glob.glob(f'{root}/core/assets/maps/serpulo/*.msav'):
    import zlib
    raw = zlib.decompress(open(f, 'rb').read()).decode('latin1')
    need |= set(re.findall(r'@([a-z][\w.]+)', raw)) | set(re.findall(r'localeprint "([\w.]+)"', raw))
TXT = {k: hu.get(k, en.get(k)) for k in sorted(need) if hu.get(k, en.get(k))}
json.dump({'grid': GRID, 'presets': list(PRE.values()), 'tree': TREE, 'txt': TXT}, open(out, 'w'), ensure_ascii=False, separators=(',', ':'))
print('rács', len(GRID), 'szektor', len(PRE), 'szöveg', len(TXT))
