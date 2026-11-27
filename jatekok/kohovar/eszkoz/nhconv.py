# A New Horizon (Java-mod, GPLv3, Yuria & Lao) tartalmának átalakítása a Kohóvár modformátumára (Hjson-tartalom + sprite-ok + pályák).
# Használat: python3 nhconv.py <NewHorizonMod forrásmappa> <kimeneti mappa>
import sys, os, re, json, glob, shutil
import javaparse as J
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]
JS = os.path.join(SRC, 'src/newhorizon')
C = os.path.join(JS, 'content')
warn = []

kebab = lambda s: re.sub(r'(?<=[a-z0-9])([A-Z])', r'-\1', s).lower()

# ---- osztályhierarchia: a mod saját osztályai melyik Mindustry-osztályra vezethetők vissza ----
EXT, CTOR = {}, {}
for f in glob.glob(JS + '/**/*.java', recursive=True):
    t = open(f, encoding='utf-8').read()
    for m in re.finditer(r'class (\w+)(?:<[^>]*>)?\s+extends\s+([\w.]+)', t): EXT[m.group(1)] = m.group(2).split('.')[-1]
    for m in re.finditer(r'public (\w+)\(([^)]*)\)\s*\{', t):
        ps = [p.strip().split()[-1] for p in m.group(2).split(',') if p.strip()]
        CTOR.setdefault(m.group(1), []).append(ps)
VANILLA_ROOTS = set()
def root(t, stop):
    seen = 0
    while t not in stop and t in EXT and seen < 30: t = EXT[t]; seen += 1
    return t

# ---- definíciók beolvasása ----
DEFS = {}       # 'Osztály.mező' és 'mező' → Obj
def load(path, cls):
    out = J.parse_defs(open(path, encoding='utf-8').read())
    for n, o in out: DEFS[cls + '.' + n] = o; DEFS.setdefault(n, o)
    return out

items = load(C + '/NHItems.java', 'NHItems')
liquids = load(C + '/NHLiquids.java', 'NHLiquids')
status = load(C + '/NHStatusEffects.java', 'NHStatusEffects')
bullets = load(C + '/NHBullets.java', 'NHBullets')
units = []
for f in [C + '/NHUnitTypes.java'] + glob.glob(C + '/units/*.java'): units += load(f, os.path.basename(f)[:-5])
blocks = []
for f in glob.glob(C + '/blocks/*.java') + [C + '/NHBlocks.java']: blocks += load(f, os.path.basename(f)[:-5])
# saját osztályként megírt tartalom (pl. destruction = new Destruction()): a konstruktor törzse adja a mezőket
SRCF = {os.path.basename(f)[:-5]: f for f in glob.glob(JS + '/**/*.java', recursive=True)}
def expand_class(o):
    if o.args or o.type not in SRCF: return
    t = open(SRCF[o.type], encoding='utf-8').read()
    m = re.search(r'public ' + o.type + r'\(\)\s*\{\s*super\("([^"]+)"\);', t)
    if not m: return
    env = {n: x for n, x in J.parse_defs(t)}
    i = m.end(); d = 1; j = i
    while d and j < len(t):
        d += {'{': 1, '}': -1}.get(t[j], 0); j += 1
    p = J.P(t[i:j - 1], env); tmp = J.Obj(o.type, []); p.body(tmp)
    o.args = [m.group(1)]; o.f.update(tmp.f); o.calls += tmp.calls
for n, o in units: expand_class(o)
UNIT_ROOTS = {'UnitType', 'NHUnitType', 'AncientUnitType'}
units = [(n, o) for n, o in units if root(o.type, UNIT_ROOTS) in UNIT_ROOTS]
name_of = {}    # Obj azonosító → tartalomnév
for n, o in items + liquids + status + units + blocks:
    if o.args and isinstance(o.args[0], str): name_of[id(o)] = o.args[0].replace('new-horizon-', '')
    elif o.args and isinstance(o.args[0], J.Call) and o.args[0].name == 'name' and o.args[0].args and isinstance(o.args[0].args[0], str): name_of[id(o)] = o.args[0].args[0]

VAN_ITEMS = 'scrap copper lead graphite coal titanium thorium silicon plastanium phase-fabric surge-alloy spore-pod sand blast-compound pyratite metaglass beryllium tungsten oxide carbide fissile-matter dormant-cyst'.split()
VAN_LIQ = 'water slag oil cryofluid arkycite gallium neoplasm ozone hydrogen nitrogen cyanogen'.split()

def ref_name(r):
    """Items.copper / NHItems.zeta / Blocks.duo → tartalomnév (a mod saját tartalma előtag nélkül)."""
    if isinstance(r, J.Obj): return name_of.get(id(r))
    if not isinstance(r, J.Ref): return None
    p = r.path.split('.')
    last = p[-1]
    o = DEFS.get(r.path) or (DEFS.get(last) if p[0].startswith('NH') or len(p) == 1 or p[0] in ('CraftingBlock', 'TurretBlock', 'ProductionBlock', 'PowerBlock', 'DefenseBlock', 'DistributionBlock', 'LiquidBlock', 'EnvironmentBlock', 'UnitBlock', 'SpecialBlock', 'GroundUnitTypes', 'AirUnitTypes', 'CoreUnitTypes') else None)
    if o is not None and id(o) in name_of: return name_of[id(o)]
    k = kebab(last)
    return {'fissile-matter': 'thorium', 'dormant-cyst': 'spore-pod'}.get(k, k)

def stacks(v):
    """ItemStack.with(a, 1, b, 2) / with(...) / list(...) → ["név/1", ...]"""
    if isinstance(v, J.Call) and v.name in ('with', 'list'):
        a = v.args; out = []
        for i in range(0, len(a) - 1, 2):
            n = ref_name(a[i]); q = a[i + 1]
            if n and isinstance(q, (int, float)): out.append('%s/%s' % (n, fmt(q)))
        return out
    if isinstance(v, J.Obj) and v.type == 'ItemStack' and len(v.args) >= 2:
        n = ref_name(v.args[0]); return ['%s/%s' % (n, fmt(v.args[1]))] if n else []
    if isinstance(v, list): return sum((stacks(x) for x in v), [])
    return []

def lstack(v):
    if isinstance(v, J.Obj) and v.type == 'LiquidStack' and len(v.args) >= 2:
        n = ref_name(v.args[0]); return {'liquid': n, 'amount': num(v.args[1])} if n else None
    if isinstance(v, J.Call) and v.name == 'with':
        a = v.args; return [{'liquid': ref_name(a[i]), 'amount': num(a[i + 1])} for i in range(0, len(a) - 1, 2) if ref_name(a[i])]
    return None

fmt = lambda x: int(x) if isinstance(x, float) and x.is_integer() else round(x, 4) if isinstance(x, float) else x
num = lambda x: fmt(x) if isinstance(x, (int, float)) and not isinstance(x, bool) else None

def color(v):
    if isinstance(v, J.Call) and v.name == 'valueOf' and v.args and isinstance(v.args[0], str): return v.args[0].lstrip('#')[:6]
    if isinstance(v, str): return v.lstrip('#')[:6]
    if isinstance(v, J.Ref): return {'Color.white': 'ffffff', 'Pal.accent': 'ffd37f', 'Pal.lancerLaser': 'a9d8ff'}.get(v.path)
    return None

# ---- egyszerű értékek másolása ----
def plain(o, keys):
    d = {}
    for k in keys:
        v = o.f.get(k)
        if isinstance(v, bool) or num(v) is not None: d[k] = v if isinstance(v, bool) else num(v)
        elif isinstance(v, str): d[k] = v
    return d

# ---- lövedékek ----
BUL_KEYS = 'damage speed lifetime splashDamage splashDamageRadius homingPower homingRange pierce pierceCap pierceBuilding statusDuration lightning lightningDamage lightningLength length width height knockback buildingDamageMultiplier ammoMultiplier reloadMultiplier rangeChange collidesAir collidesGround collides sapStrength fragBullets maxRange drag instantDisappear shieldDamageMultiplier healPercent'.split()
VAN_BUL = {'BasicBulletType', 'ArtilleryBulletType', 'MissileBulletType', 'LaserBulletType', 'ContinuousLaserBulletType', 'ContinuousFlameBulletType', 'LightningBulletType', 'ShrapnelBulletType', 'LiquidBulletType', 'FlakBulletType', 'SapBulletType', 'RailBulletType', 'EmpBulletType', 'BombBulletType', 'ExplosionBulletType', 'PointBulletType', 'PointLaserBulletType', 'LaserBoltBulletType', 'BulletType', 'ContinuousBulletType', 'FireBulletType', 'MassDriverBolt', 'InterceptorBulletType', 'SpaceLiquidBulletType'}
NAME_HINT = [('laser', 'LaserBulletType'), ('lightning', 'LightningBulletType'), ('missile', 'MissileBulletType'), ('artillery', 'ArtilleryBulletType'), ('shrapnel', 'ShrapnelBulletType'), ('flak', 'FlakBulletType'), ('continuous', 'ContinuousLaserBulletType'), ('bomb', 'BombBulletType'), ('rail', 'RailBulletType'), ('emp', 'EmpBulletType'), ('trail', 'BasicBulletType'), ('chain', 'LightningBulletType'), ('lightningline', 'LightningBulletType'), ('poslightning', 'LightningBulletType'), ('effectbullet', 'BasicBulletType'), ('strafe', 'LaserBulletType'), ('arc', 'LightningBulletType')]
CTOR_DEF = {'BasicBulletType': ['speed', 'damage', 'sprite'], 'ArtilleryBulletType': ['speed', 'damage', 'sprite'], 'MissileBulletType': ['speed', 'damage', 'sprite'], 'FlakBulletType': ['speed', 'damage'], 'LaserBulletType': ['damage'], 'ContinuousLaserBulletType': ['damage'], 'LiquidBulletType': ['liquid'], 'BombBulletType': ['damage', 'radius', 'sprite'], 'ExplosionBulletType': ['splashDamage', 'splashDamageRadius'], 'RailBulletType': [], 'LaserBoltBulletType': ['speed', 'damage'], 'BulletType': ['speed', 'damage'], 'EmpBulletType': [], 'SapBulletType': [], 'ContinuousFlameBulletType': ['damage']}
seenB = {}
def bullet(v, depth=0):
    if isinstance(v, J.Call) and v.name == 'copy': v = v.target
    if isinstance(v, J.Ref):
        o = DEFS.get(v.path) or DEFS.get(v.path.split('.')[-1])
        if o is None:
            return None
        v = o
    if not isinstance(v, J.Obj) or depth > 4: return None
    if id(v) in seenB: return seenB[id(v)]
    t = v.type; r = root(t, VAN_BUL)
    if r not in VAN_BUL:
        lt = t.lower(); r = next((b for h, b in NAME_HINT if h in lt), 'BasicBulletType')
    if r == 'BulletType': r = 'BasicBulletType'
    d = {'type': r}
    # konstruktor-paraméterek: a mod saját osztályainál a forrásbeli paraméternevek
    params = None
    for ps in CTOR.get(t, []):
        if len(ps) == len(v.args): params = ps; break
    if params is None: params = CTOR_DEF.get(t, CTOR_DEF.get(r, []))
    for pn, a in zip(params, v.args):
        if num(a) is not None and pn in ('speed', 'damage', 'splashDamage', 'splashDamageRadius', 'length', 'lifetime'): d[pn] = num(a)
        elif pn == 'radius' and num(a) is not None: d['splashDamageRadius'] = num(a); d.setdefault('splashDamage', d.get('damage', 0))
        elif pn == 'liquid': d['liquid'] = ref_name(a)
    d.update(plain(v, BUL_KEYS))
    for c in v.calls:
        if c.name == 'setDamage':
            a = [num(x) for x in c.args[1:]]
            if len(a) == 2 and a[0] is not None: d['damage'] = a[0]
            elif len(a) == 3 and a[1] is not None: d['damage'] = a[1]; d.setdefault('splashDamageRadius', a[0])
            elif len(a) == 4 and None not in a: d['splashDamageRadius'], d['splashDamage'], d['damage'] = a[0], a[1], a[2]
    st = v.f.get('status')
    if isinstance(st, J.Ref): d['status'] = ref_name(st)
    for k in ('fragBullet', 'intervalBullet'):
        fb = bullet(v.f.get(k), depth + 1)
        if fb: d[k] = fb
    if 'damage' not in d and 'splashDamage' not in d and depth == 0: d['damage'] = 20
    seenB[id(v)] = d
    return d

def ammo_types(call):
    out = {}
    a = call.args
    for i in range(0, len(a) - 1, 2):
        n = ref_name(a[i]); b = bullet(a[i + 1])
        if n and b: out[n] = b
    return out

# ---- blokkok ----
BLOCK_ROOTS = {'Floor', 'StaticWall', 'OreBlock', 'Prop', 'TallBlock', 'SteamVent', 'GenericCrafter', 'ItemTurret', 'PowerTurret', 'LaserTurret', 'ContinuousTurret', 'LiquidTurret', 'TractorBeamTurret', 'PointDefenseTurret', 'Wall', 'Drill', 'CoreBlock', 'StackConveyor', 'PowerNode', 'LiquidRouter', 'ConsumeGenerator', 'ThermalGenerator', 'Battery', 'StorageBlock', 'ForceProjector', 'Pump', 'ItemBridge', 'OverflowDuct', 'OverflowGate', 'Sorter', 'DirectionalUnloader', 'Unloader', 'Conveyor', 'ArmoredConveyor', 'Router', 'Junction', 'DuctRouter', 'Conduit', 'LiquidJunction', 'SolarGenerator', 'NuclearReactor', 'PowerGenerator', 'OverdriveProjector', 'MendProjector', 'RegenProjector', 'SolidPump', 'LiquidSource', 'ItemSource', 'BaseTurret', 'Block', 'ShallowLiquid', 'OverlayFloor', 'StaticTree', 'TreeBlock', 'Turret', 'UnitFactory', 'Reconstructor', 'ImpactReactor', 'LiquidBridge', 'ShockwaveTower', 'BufferedItemBridge', 'DirectionalUnloader', 'RegenProjector', 'ContinuousTurret'}
BLK_KEYS = 'gravityRange liquidUse reloadTime intensity size health armor itemCapacity liquidCapacity craftTime range reload maxAmmo ammoPerShot inaccuracy shootCone targetAir targetGround drillTime tier hardnessDrillMultiplier liquidBoostIntensity powerProduction itemDuration laserRange maxNodes speed displayedSpeed radius shieldHealth cooldownNormal cooldownBrokenBase reload healPercent speedBoost pumpAmount insulated absorbLasers chanceDeflect lightningChance variants attributes itemDrop playerUnmineable isLiquid isDeep drownTime liquidMultiplier mapColor shootDuration bulletDamage force damage scaledHealth buildCostMultiplier heatOutput heatRequirement unitCapModifier coolantMultiplier maxHeat'.split()

def drawer_layers(o, name):
    """A DrawMulti-rétegekből az ikon összeállításához szükséges sprite-nevek."""
    dr = o.f.get('drawer')
    lay = []
    def walk(d):
        if isinstance(d, J.Obj):
            if d.type == 'DrawMulti': [walk(x) for x in d.args]
            elif d.type == 'DrawBaseRegion' and d.args and isinstance(d.args[0], str): lay.append('bottom' + d.args[0])
            elif d.type in ('DrawRegion', 'DrawRegionRotated') and d.args and isinstance(d.args[0], str): lay.append(name + d.args[0])
            elif d.type == 'DrawRegion' and not d.args: lay.append(name)
            elif d.type == 'DrawDefault': lay.append(name)
            elif d.type == 'DrawPistons': lay.append(name + '-piston-icon')
            elif d.type in ('DrawGlowRegion',): pass
            elif d.type == 'DrawLiquidTile': pass
            else:
                sfx = d.f.get('suffix')
                if isinstance(sfx, str): lay.append(name + sfx)
        elif isinstance(d, list): [walk(x) for x in d]
    walk(dr)
    return lay

def links_size(o):
    """MultiBlockCrafter addLink(p(x,y)...): a teljes befoglaló méret (a Kohóvár négyzetes blokkjaihoz)."""
    s = num(o.f.get('size')) or 1; xs, ys = [0, s - 1], [0, s - 1]
    for c in o.calls:
        if c.name == 'addLink':
            for p in c.args:
                if isinstance(p, J.Call) and p.name == 'p' and len(p.args) >= 2 and num(p.args[0]) is not None and num(p.args[1]) is not None:
                    x, y = p.args[0], p.args[1]; xs.append(x); ys.append(y)
    off = -(s - 1) // 2
    return max(max(xs) - min(xs) + 1, max(ys) - min(ys) + 1), (max(xs) - min(xs) + 1, max(ys) - min(ys) + 1)

TYPEMAP = {'MultiBlockCrafter': 'GenericCrafter', 'RecipeGenericCrafter': 'GenericCrafter', 'AdaptDrill': 'Drill', 'DrillModule': 'Block', 'AdaptWall': 'Wall', 'LaserWallBlock': 'Wall', 'FloodFluidBlock': 'Wall',
           'AdaptStackConveyor': 'StackConveyor', 'AdaptConveyor': 'Conveyor', 'FloatArmoredConveyor': 'ArmoredConveyor', 'AdaptJunction': 'Junction', 'AdaptDirectionalRouter': 'DuctRouter', 'AdaptDirectionalMerger': 'DuctRouter',
           'AdaptItemBridge': 'BufferedItemBridge', 'AdaptLiquidBridge': 'LiquidBridge', 'AdaptSorter': 'Sorter', 'AdaptUnloader': 'Unloader', 'AdaptDirectionalUnloader': 'DirectionalUnloader', 'AdaptLiquidDirectionalUnloader': 'DirectionalUnloader',
           'AdaptPump': 'Pump', 'AdaptConduit': 'Conduit', 'FloatMultiRouter': 'LiquidRouter', 'FloatMultiJunction': 'LiquidJunction', 'AdaptRegenProjector': 'RegenProjector', 'AdaptOverdriveProjector': 'OverdriveProjector', 'AssignedBeacon': 'OverdriveProjector',
           'QuantumVortexProjector': 'ForceProjector', 'ShieldGenerator': 'ForceProjector', 'HyperReactor': 'ImpactReactor', 'MultiBlockConsumeGenerator': 'ConsumeGenerator',
           'AccumulatingStorage': 'StorageBlock', 'RemoteCoreStorage': 'StorageBlock', 'JumpGate': 'UnitFactory', 'TiledFloor': 'Floor', 'PlateFloor': 'Floor',
           'ShootMatchTurret': 'ItemTurret', 'CaptureableTurret': 'ItemTurret', 'AdaptItemTurret': 'ItemTurret', 'SpeedupTurret': 'PowerTurret', 'ContinuousOverheatTurret': 'ContinuousTurret', 'DrawTurret': 'PowerTurret',
           'Webber': 'TractorBeamTurret', 'MultTractorBeamTurret': 'TractorBeamTurret', 'LiquidRadiator': 'Block', 'OreCollector': 'Drill',
           'StreamExtractor': 'LiquidBridge', 'StreamRepeater': 'LiquidBridge', 'StreamRedirector': 'LiquidBridge', 'StreamReceiver': 'LiquidRouter', 'StreamSplitter': 'LiquidRouter', 'ShockwaveGenerator': 'ShockwaveTower'}
SANDBOX = {'StreamSource', 'LiquidSource', 'ItemSource', 'PlaceholderBlock', 'UnitSpawner'}
STREAM = {'GravityWell', 'ShockwaveGenerator', 'FireExtinguisher', 'AirRaider', 'UnitSpawner', 'BombLauncher', 'HyperSpaceWarper', 'IconDisplay', 'CharacterDisplay', 'PlaceholderBlock'}

def conv_block(var, o):
    n = name_of.get(id(o))
    if not n: return None
    t = o.type
    if n.startswith('test-') or t in SANDBOX or 'sandbox' in str(getattr(o.f.get('buildVisibility'), 'path', '')).lower(): return None    # csak homokozóban építhető
    T = TYPEMAP.get(t) or (t if t in BLOCK_ROOTS else root(t, BLOCK_ROOTS))
    d = {'type': T if T in BLOCK_ROOTS or T in TYPEMAP.values() else 'Block', '_class': t}
    d.update(plain(o, BLK_KEYS))
    for k in ('mapColor',):
        c = color(o.f.get(k))
        if c: d[k] = c
    for k in ('itemDrop', 'liquidDrop', 'output', 'unitType'):
        v = o.f.get(k)
        if isinstance(v, J.Ref): d[k] = ref_name(v)
    for k in ('outputItems',):
        s = stacks(o.f.get(k))
        if s: d[k] = s
    oi = o.f.get('outputItem')
    if oi is not None: s = stacks(oi); d['outputItem'] = s[0] if s else None
    ol = lstack(o.f.get('outputLiquid'))
    if ol: d['outputLiquid'] = ol
    ols = lstack(o.f.get('outputLiquids'))
    if ols: d['outputLiquids'] = ols
    sh = o.f.get('shoot')
    if isinstance(sh, J.Obj):
        d['shoot'] = plain(sh, ['shots', 'shotDelay', 'spread', 'firstShotDelay'])
        if sh.args and num(sh.args[0]) is not None and 'spread' not in d['shoot'] and 'Spread' in sh.type: d['shoot']['spread'] = num(sh.args[1]) if len(sh.args) > 1 else 5
        if sh.args and num(sh.args[0]) is not None and 'shots' not in d['shoot']: d['shoot']['shots'] = num(sh.args[0])
    bt = o.f.get('shootType') or o.f.get('bullet')
    if bt is not None:
        b = bullet(bt)
        if b: d['shootType'] = b
    cons = {}
    for c in o.calls:
        a = c.args
        if c.name == 'requirements':
            for x in a:
                if isinstance(x, J.Ref) and x.path.startswith('Category.'): d['category'] = x.path.split('.')[1]
                s = stacks(x)
                if s: d['requirements'] = s
        elif c.name in ('consumePower', 'consumePowerCond', 'consumePowerDynamic') and a and num(a[0]) is not None: d['consumePower'] = num(a[0])
        elif c.name == 'consumePowerBuffered' and a and num(a[0]) is not None: d['consumePowerBuffered'] = num(a[0])
        elif c.name == 'consumeItems' and a: d['consumeItems'] = stacks(a[0])
        elif c.name == 'consumeItem' and a:
            nm = ref_name(a[0]); d['consumeItems'] = ['%s/%s' % (nm, fmt(a[1]) if len(a) > 1 and num(a[1]) else 1)] if nm else []
        elif c.name == 'consumeLiquid' and len(a) >= 2 and num(a[1]) is not None:
            nm = ref_name(a[0])
            if nm: d.setdefault('consumeLiquids', []).append({'liquid': nm, 'amount': num(a[1])})
        elif c.name == 'consumeLiquids' and a:
            ls = lstack(a[0]) if len(a) == 1 else None
            if isinstance(ls, list): d.setdefault('consumeLiquids', []).extend(ls)
            elif isinstance(ls, dict): d.setdefault('consumeLiquids', []).append(ls)
        elif c.name == 'consumeCoolant' and a and num(a[0]) is not None: d['coolant'] = {'type': 'ConsumeCoolant', 'amount': num(a[0])}
        elif c.name == 'ammo': d['ammoTypes'] = ammo_types(c)
    if 'consumeLiquids' in d and len(d['consumeLiquids']) == 1: d['consumeLiquid'] = d.pop('consumeLiquids')[0]
    if t == 'MultiBlockCrafter' or t == 'MultiBlockConsumeGenerator':
        d['size'], d['_rect'] = links_size(o)
    lay = drawer_layers(o, n)
    if lay: d['_layers'] = lay
    if t in STREAM: d['_special'] = t
    PART = {'MultiBlockCrafter': 'négyzetes helyet foglal (az eredeti nem négyzetes)', 'MultiBlockConsumeGenerator': 'négyzetes helyet foglal (az eredeti nem négyzetes)',
            'AirRaider': 'egyszerűsítve: tüzérségi toronyként, választható csapásmód nélkül', 'BombLauncher': 'egyszerűsítve: tüzérségi toronyként',
            'StreamExtractor': 'a nyaláb folyadékhídként működik', 'StreamRepeater': 'a nyaláb folyadékhídként működik', 'StreamRedirector': 'a nyaláb folyadékhídként működik',
            'StreamReceiver': 'a nyaláb folyadékelosztóként működik', 'StreamSplitter': 'a nyaláb folyadékelosztóként működik', 'JumpGate': 'egyszerűsítve: egységgyárként, ugrás nélkül',
            'OreCollector': 'egyszerűsítve: fúróként', 'QuantumVortexProjector': 'egyszerűsítve: erőtérként', 'AssignedBeacon': 'egyszerűsítve: gyorsítóként',
            'CaptureableTurret': 'elfoglalás nélkül', 'Webber': 'egyszerűsítve: vonósugárként', 'MultTractorBeamTurret': 'egyszerűsítve: vonósugárként', 'RemoteCoreStorage': 'egyszerűsítve: raktárként', 'AccumulatingStorage': 'egyszerűsítve: raktárként'}
    if t in PART: d['_partial'] = PART[t]
    ADDON = {'DrillModule': 'NhRadiator', 'LiquidRadiator': 'NhRadiator', 'FireExtinguisher': 'NhExtinguisher', 'GravityWell': 'NhGravityWell', 'HyperSpaceWarper': 'NhWarper'}   # a kiegészítő (modok/kiegeszitok/new-horizon.js) fajtái
    if t in ADDON: d['type'] = ADDON[t]; d.pop('_special', None)
    if T == 'LiquidBridge' and t.startswith('Stream'): d['range'] = 5
    if t == 'OreCollector': d.setdefault('tier', 4); d.setdefault('drillTime', 400)
    if t == 'AirRaider':       # távoli csapásmérő állás → nagy hatótávú tüzérségi torony
        d.update(type='PowerTurret', range=640, reload=360, targetAir=False, shootType={'type': 'ArtilleryBulletType', 'speed': 4, 'lifetime': 170, 'damage': 0, 'splashDamage': 900, 'splashDamageRadius': 64, 'fragBullets': 6, 'fragBullet': {'type': 'BasicBulletType', 'damage': 60, 'speed': 3, 'lifetime': 20}})
    if t == 'BombLauncher':    # bombavető → tüzérségi torony a saját lövedékével
        b = d.pop('shootType', {}) or {}
        d.update(type='PowerTurret', range=480, reload=240, targetAir=False, shootType={'type': 'ArtilleryBulletType', 'speed': 3.5, 'lifetime': 140, 'damage': 0, 'splashDamage': b.get('damage', 200) * 2, 'splashDamageRadius': 48, 'lightning': 4, 'lightningDamage': 40})
        d.setdefault('consumePower', 4)
    if T == 'ShockwaveTower': d.setdefault('range', 170); d.setdefault('reload', 80)
    return n, d

# ---- egységek ----
UNIT_KEYS = 'health speed hitSize armor flying mineTier mineSpeed buildSpeed itemCapacity legCount legLength rotateSpeed accel drag lowAltitude canBoost hovering naval range maxRange crushDamage'.split()
WEAP_KEYS = 'reload x y shootY mirror alternate rotate rotateSpeed top inaccuracy shootCone'.split()
IDMAP = {20: 'naval', 4: 'mech', 43: 'mech', 24: 'legs', 3: 'flying', 5: 'flying'}
ENT = {}
for m in re.finditer(r'nameMap\.put\(NewHorizon\.name\("([^"]+)"\),\s*(?:EntityMapping\.idMap\[(\d+)\]|(\w+)::new)', open(C + '/NHUnitTypes.java', encoding='utf-8').read()):
    ENT[m.group(1)] = IDMAP.get(int(m.group(2))) if m.group(2) else ('flying' if m.group(3) in ('PesterEntity', 'NucleoidEntity', 'ProbeEntity', 'EnergyUnit', 'AdaptedTimedKillUnit') else None)

def weapon(w):
    mv = None
    if isinstance(w, J.Call) and w.name in ('copyAndMove', 'copyAndMoveAnd', 'copyAnd', 'copy') :   # NHUnitTypes.copyAndMove(fegyver, x, y)
        base = w.args[0] if w.name != 'copy' else w.target
        if w.name.startswith('copyAndMove') and len(w.args) >= 3: mv = (num(w.args[1]), num(w.args[2]))
        if isinstance(base, J.Ref): base = DEFS.get(base.path) or DEFS.get(base.path.split('.')[-1])
        w = base
    if not isinstance(w, J.Obj): return None
    d = {}
    if w.args and isinstance(w.args[0], str): d['name'] = w.args[0].replace('new-horizon-', '')
    elif w.args and isinstance(w.args[0], J.Call) and w.args[0].args and isinstance(w.args[0].args[0], str): d['name'] = w.args[0].args[0]
    d.update(plain(w, WEAP_KEYS))
    if mv and None not in mv: d['x'], d['y'] = mv
    b = bullet(w.f.get('bullet'))
    if b:
        b = dict(b)
        for k, v in w.f.items():         # bullet.damage = ... felülírások
            if k.startswith('bullet.') and num(v) is not None: b[k[7:]] = num(v)
        d['bullet'] = b
    sh = w.f.get('shoot')
    if isinstance(sh, J.Obj): d['shoot'] = plain(sh, ['shots', 'shotDelay', 'spread'])
    return d if 'bullet' in d else None

def conv_unit(var, o):
    n = name_of.get(id(o))
    if not n: return None
    d = plain(o, UNIT_KEYS)
    fam = ENT.get(n)
    ct = o.f.get('constructor')
    if isinstance(ct, J.Call) and ct.name == 'map' and ct.args and num(ct.args[0]) is not None: fam = IDMAP.get(int(ct.args[0]), fam)
    if o.f.get('flying') is True: fam = 'flying'
    elif o.f.get('legCount') or 'Legs' in str(o.f.get('constructor')): fam = fam or 'legs'
    d['type'] = {'flying': 'flying', 'legs': 'legs', 'naval': 'naval', 'mech': 'mech'}.get(fam or 'mech')
    ws = []
    for c in o.calls:
        tgt = c.target.path if isinstance(c.target, J.Ref) else ''
        if tgt.endswith('weapons') and c.name in ('add', 'addAll'):
            for a in c.args:
                if isinstance(a, J.Ref): a = DEFS.get(a.path) or DEFS.get(a.path.split('.')[-1])
                w = weapon(a)
                if w: ws.append(w)
        if tgt.endswith('abilities') and c.name in ('add', 'addAll'):
            for a in c.args:
                if isinstance(a, J.Obj):
                    ab = {'type': a.type}
                    for k, v in zip(['radius', 'regen', 'max', 'cooldown'] if 'ForceField' in a.type else ['amount', 'reload', 'range'], a.args):
                        if num(v) is not None: ab[k] = num(v)
                    ab.update(plain(a, ['radius', 'regen', 'max', 'cooldown', 'amount', 'reload', 'range']))
                    d.setdefault('abilities', []).append(ab)
    if ws: d['weapons'] = ws
    return n, d

# ---- egységreceptek (ugrókapuk) és többreceptes gyárak ----
reg_u = open(C + '/register/UnitRecipeRegister.java', encoding='utf-8').read()
gate_plans = {}
for m in re.finditer(r'^\s*unitRecipePlan\(UnitBlock\.(\w+),\s*([\w.]+),\s*([\d.]+)\s*\*\s*60f?,\s*recipe -> recipe\.inputItem = ItemStack\.list\(([^;]*)\)\);', reg_u, re.M):
    g, u, tsec, lst = m.groups()
    req = stacks(J.Call(None, 'with', [J.P(x).expr() for x in lst.split(',')]))
    gate_plans.setdefault(g, []).append({'unit': ref_name(J.Ref(u)), 'time': float(tsec) * 60, 'requirements': req})
reg_r = open(C + '/register/RecipeRegister.java', encoding='utf-8').read()
recipes = {}
for m in re.finditer(r'recipe\((\w+)\.(\w+),\s*recipe -> \{(.*?)\}\);', reg_r, re.S):
    blk, body = m.group(2), m.group(3)
    r = {}
    for k, v in re.findall(r'recipe\.(\w+)\s*=\s*([^;]+);', body):
        e = J.P(v).expr()
        if k in ('inputItem', 'outputItem'): r[k] = stacks(e)
        elif k in ('inputLiquid', 'outputLiquid'):
            a = e.args if isinstance(e, J.Call) else []
            r[k] = [{'liquid': ref_name(a[i]), 'amount': num(a[i + 1])} for i in range(0, len(a) - 1, 2) if ref_name(a[i]) and num(a[i + 1]) is not None]
        elif k == 'craftTime' and num(e) is not None: r['craftTime'] = num(e)
        elif k == 'inputPower' and num(e) is not None: r['power'] = num(e)
    recipes.setdefault(blk, []).append(r)

# ---- kimenet ----
if os.path.exists(OUT): shutil.rmtree(OUT)
for sub in ('content/items', 'content/liquids', 'content/blocks', 'content/units', 'content/status', 'sprites', 'maps', 'bundles'): os.makedirs(os.path.join(OUT, sub), exist_ok=True)
def put(kind, n, d): json.dump(d, open(os.path.join(OUT, 'content', kind, n + '.json'), 'w'), indent=1, ensure_ascii=False)

for v, o in items:
    n = name_of.get(id(o))
    if not n: continue
    d = plain(o, ['hardness', 'cost', 'flammability', 'explosiveness', 'radioactivity', 'charge'])
    if len(o.args) > 1: d['color'] = color(o.args[1])
    put('items', n, d)
for v, o in liquids:
    n = name_of.get(id(o))
    if not n: continue
    d = plain(o, ['heatCapacity', 'temperature', 'viscosity', 'flammability', 'explosiveness', 'gas'])
    if len(o.args) > 1: d['color'] = color(o.args[1]) or '9a9aff'
    if v in ('particle', 'photon', 'neutron', 'zetaPositive', 'zetaNegative', 'proton', 'antiMatter'): d['_stream'] = True
    put('liquids', n, d)
for v, o in status:
    n = name_of.get(id(o))
    if not n: continue
    d = plain(o, ['speedMultiplier', 'damage', 'healthMultiplier', 'damageMultiplier', 'reloadMultiplier'])
    c = color(o.f.get('color'))
    if c: d['color'] = c
    put('status', n, d)
nb = nu = 0
gates_by_name = {}
for v, o in blocks:
    r = conv_block(v, o)
    if not r: continue
    n, d = r
    if d['_class'] == 'JumpGate' and v in gate_plans: d['plans'] = gate_plans[v]
    if v in recipes: d['_recipes'] = recipes[v]
    put('blocks', n, d); nb += 1
for v, o in units:
    r = conv_unit(v, o)
    if not r: continue
    put('units', r[0], r[1]); nu += 1

# kutatási fa: kategóriánként költség szerint láncba fűzve, az első elem egy hasonló eredeti blokkhoz kapcsolódik
ROOTS = {'turret': 'duo', 'crafting': 'graphite-press', 'production': 'mechanical-drill', 'distribution': 'conveyor', 'liquid': 'mechanical-pump', 'power': 'combustion-generator', 'defense': 'copper-wall', 'units': 'ground-factory', 'effect': 'core-foundation', 'logic': 'micro-processor'}
VAL = {}
for f in glob.glob(os.path.join(OUT, 'content/items/*.json')): VAL[os.path.basename(f)[:-5]] = json.load(open(f)).get('cost', 1)
def costv(d): return sum(int(s.split('/')[1]) * (VAL.get(s.split('/')[0], 1) if s.split('/')[0] in VAL else 1) for s in d.get('requirements', []))
bycat = {}
for f in glob.glob(os.path.join(OUT, 'content/blocks/*.json')):
    d = json.load(open(f))
    if d.get('requirements') and d.get('category'): bycat.setdefault(d['category'], []).append((costv(d), os.path.basename(f)[:-5], f, d))
for cat, l in bycat.items():
    l.sort(); prev = ROOTS.get(cat, 'conveyor')
    for i, (_, n, f, d) in enumerate(l):
        d['research'] = prev; json.dump(d, open(f, 'w'), indent=1, ensure_ascii=False)
        if i % 2 == 1 or cat in ('distribution', 'liquid'): prev = n      # kétágú lánc, hogy ne legyen túl mély

# sprite-ok: lapítva (a fájlnév a név), a gyárak ikonja a rajzolórétegekből összerakva
sp = {}
for f in glob.glob(os.path.join(SRC, 'assets/sprites/**/*.png'), recursive=True):
    b = os.path.basename(f)[:-4]
    if b not in sp: sp[b] = f
for b, f in sp.items(): shutil.copy(f, os.path.join(OUT, 'sprites', b + '.png'))
for f in glob.glob(os.path.join(SRC, 'assets/sprites-override/**/*.png'), recursive=True):
    os.makedirs(os.path.join(OUT, 'sprites-override'), exist_ok=True); shutil.copy(f, os.path.join(OUT, 'sprites-override', os.path.basename(f)))
made = 0
for f in glob.glob(os.path.join(OUT, 'content/blocks/*.json')):
    d = json.load(open(f)); n = os.path.basename(f)[:-5]
    if n in sp or n + '-full' in sp or n + '-preview' in sp: continue
    lay = [l for l in d.get('_layers', []) if l in sp]
    if not lay: continue
    ims = [Image.open(sp[l]).convert('RGBA') for l in lay]
    W = max(i.width for i in ims); H = max(i.height for i in ims); S = max(W, H)
    base = Image.new('RGBA', (S, S))
    for im in ims: base.alpha_composite(im, ((S - im.width) // 2, (S - im.height) // 2))
    base.save(os.path.join(OUT, 'sprites', n + '.png')); made += 1

for f in glob.glob(os.path.join(SRC, 'assets/maps/*.msav')): shutil.copy(f, os.path.join(OUT, 'maps'))
for f in glob.glob(os.path.join(SRC, 'assets/bundles/*.properties')): shutil.copy(f, os.path.join(OUT, 'bundles'))
open(os.path.join(OUT, 'mod.hjson'), 'w').write('name: new-horizon\ndisplayName: New Horizon\nauthor: Yuria & Lao\nversion: "2.3.0"\ndescription: "A New Horizon Java-mod Kohóvárra átírt változata (GPLv3)."\n')
print('anyag', len(items), 'folyadék', len(liquids), 'blokk', nb, 'egység', nu, 'összerakott ikon', made, 'sprite', len(sp))
