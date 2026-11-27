// Kohóvár JS API – a Mindustry-modok JavaScript-szkriptjeinek futtatása a böngészőben.
// A szkriptek a Mindustry Java-osztályait hívják (Vars, Blocks, extend, Draw, Events…): ezeket itt a Kohóvár saját
// objektumaira képezzük le. Ami nincs meg, az nem állítja meg a szkriptet: üres helyettesítőt kap, és a mod adatlapján
// „hiányzó hívásként” jelenik meg. Mindig aktív; a beépített modok szkriptjei futnak, a játékos saját modjaié csak,
// ha a modlistában engedélyezi (a szkript a lappal azonos jogokkal fut).
import { TS, ITEMS, LIQUIDS, BLOCKS, UNITS, STATUS } from './adat.js?v=202611271431';
import { SN, ISN, LSN } from './kepadat.js?v=202611271431';
import { spr, has, addSprite, sprT } from './rajz.js?v=202611271431';
import { FW } from './keret.js?v=202611271431';

export const JS = {
  name: 'Kohóvár JS API', version: '1.0',
  parts: ['extend / extendContent', 'Draw · Fill · Lines · Drawf', 'Events', 'Time · Mathf · Angles', 'Units · Groups · Damage', 'Effect'],
  mods: [],              // { id, miss: Set, err: [] }
};
const PI = Math.PI, D2R = PI / 180, R2D = 180 / PI;
// a szkriptek a valódi JavaScript-beépítetteket kapják (a többi nagybetűs név Mindustry-osztály)
const JSB = new Set(['Math', 'Object', 'JSON', 'String', 'Array', 'Number', 'Boolean', 'Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError', 'Date', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Promise', 'RegExp', 'Symbol', 'Reflect', 'Proxy', 'Intl', 'BigInt', 'Infinity', 'NaN', 'ArrayBuffer', 'Uint8Array', 'Int8Array', 'Uint16Array', 'Int16Array', 'Uint32Array', 'Int32Array', 'Float32Array', 'Float64Array', 'DataView', 'Function', 'undefined', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent', 'globalThis', 'console']);
const GLOBAL = {};   // a Mindustry szkriptjeinek közös „global” objektuma
let CUR = null;          // az éppen futó mod
let CW = null;           // az aktuális világ
let G2 = null;           // az aktuális rajzfelület
const HT = () => (CW ? CW.h * TS : 0);
const fy = y => HT() - y;                 // Mindustry y (felfelé) ↔ Kohóvár y (lefelé)
const miss = (k, m = CUR) => { if (m && m.miss.size < 400) m.miss.add(k); };
const kebab = s => String(s).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/* ---------- helyettesítő: minden tulajdonsága és hívása újabb helyettesítő ---------- */
const STUB = Symbol('stub'), CLS = Symbol('cls');
const QUIET = /^(Sounds|Styles|Icon|Tex|Fonts|Table|BaseDialog|Dialog|Core\.scene|Scl|Call|Vars\.ui|Vars\.renderer|Vars\.control|Core\.input|Core\.camera|Vars\.netServer|Vars\.netClient|Align|Cell|TextButton|Label|Image|ImageButton|Bar|Stat|StatUnit|Stats|Core\.app\.(addListener|getClipboardText))/;
function stub(path, rec = true) {
  const f = function () {};
  return new Proxy(f, {
    get(t, p) {
      if (p === STUB) return path; if (p === Symbol.toPrimitive) return () => 0; if (p === 'toString') return () => '';
      if (p === Symbol.iterator) return function* () {}; if (typeof p === 'symbol' || p === 'then') return undefined;
      if (p === 'length' || p === 'size') return 0;
      if (!Object.prototype.hasOwnProperty.call(t, p)) t[p] = stub(path + '.' + p, rec);
      return t[p];
    },
    set(t, p, v) { t[p] = v; return true; },
    apply() { if (rec) miss(QUIET.test(path) ? 'felület (UI)' : path + '()'); return stub(path + '()', rec); },
    construct() { if (rec) miss(QUIET.test(path) ? 'felület (UI)' : 'new ' + path); return stub(path, rec); },
  });
}
const fn = f => typeof f !== 'function' ? f : Object.assign((...a) => f(...a), { get: f, run: f, accept: f, apply: f, invoke: f, select: f, getf: f, iget: f, call: f });

/* ---------- Seq (arc.struct.Seq) ---------- */
class Seq {
  constructor(a) { this.items = Array.isArray(a) ? a : []; }
  static with(...a) { return new Seq(a.length === 1 && Array.isArray(a[0]) ? [...a[0]] : a); }
  get size() { return this.items.length; }
  add(...v) { for (const x of v) if (x instanceof Seq) this.items.push(...x.items); else this.items.push(x); return this; }
  addAll(...v) { for (const x of v) this.items.push(...(x instanceof Seq ? x.items : Array.isArray(x) ? x : [x])); return this; }
  get(i) { return this.items[i]; } set(i, v) { this.items[i] = v; } first() { return this.items[0]; } peek() { return this.items[this.items.length - 1]; } pop() { return this.items.pop(); }
  each(a, b) { const p = b ? a : null, f = b || a; for (const x of [...this.items]) if (!p || call(p, x)) call(f, x); }
  contains(v) { return this.items.includes(v); } indexOf(v) { return this.items.indexOf(v); } isEmpty() { return !this.items.length; } any() { return this.items.length > 0; }
  remove(v) { const i = typeof v === 'number' ? v : this.items.indexOf(v); if (i >= 0) return this.items.splice(i, 1)[0]; return null; }
  clear() { this.items.length = 0; return this; } copy() { return new Seq([...this.items]); } toArray() { return [...this.items]; } list() { return [...this.items]; }
  select(p) { return new Seq(this.items.filter(x => call(p, x))); } map(f) { return new Seq(this.items.map(x => call(f, x))); } find(p) { return this.items.find(x => call(p, x)) ?? null; }
  sum(f) { return this.items.reduce((s, x) => s + call(f, x), 0); } count(p) { return this.items.filter(x => call(p, x)).length; }
  sort(f) { this.items.sort(f ? (a, b) => typeof f === 'function' ? (f.length === 2 ? f(a, b) : f(a) - f(b)) : 0 : undefined); return this; }
  random() { return this.items[Math.random() * this.items.length | 0]; } shuffle() { this.items.sort(() => Math.random() - .5); return this; } reverse() { this.items.reverse(); return this; }
  [Symbol.iterator]() { return this.items[Symbol.iterator](); }
}
const call = (f, ...a) => typeof f === 'function' ? f(...a) : f && typeof f.get === 'function' ? f.get(...a) : f && typeof f.run === 'function' ? f.run(...a) : undefined;

// Java-gyűjtemények (arc.struct): Map / Set alapú megfelelők
class JMap { constructor() { this.m = new Map(); } static of(...a) { const o = new JMap(); for (let i = 0; i + 1 < a.length; i += 2) o.put(a[i], a[i + 1]); return o; } put(k, v) { this.m.set(k, v); return this; } get(k, d) { return this.m.has(k) ? this.m.get(k) : (typeof d === 'function' ? (this.m.set(k, d()), this.m.get(k)) : d ?? null); } containsKey(k) { return this.m.has(k); } remove(k) { const v = this.m.get(k); this.m.delete(k); return v; } get size() { return this.m.size; } keys() { return new Seq([...this.m.keys()]); } values() { return new Seq([...this.m.values()]); } each(f) { for (const [k, v] of this.m) call(f, k, v); } clear() { this.m.clear(); } isEmpty() { return !this.m.size; } entries() { return [...this.m].map(([key, value]) => ({ key, value })); } [Symbol.iterator]() { return this.entries()[Symbol.iterator](); } }
class JSet { constructor(a) { this.s = new Set(a || []); } static with(...a) { return new JSet(a); } addAll(...a) { for (const x of a) for (const v of (x instanceof Seq || x instanceof JSet || Array.isArray(x) ? x : [x])) this.s.add(v); return this; } add(v) { const h = this.s.has(v); this.s.add(v); return !h; } contains(v) { return this.s.has(v); } remove(v) { return this.s.delete(v); } get size() { return this.s.size; } each(f) { for (const v of this.s) call(f, v); } clear() { this.s.clear(); } isEmpty() { return !this.s.size; } toSeq() { return new Seq([...this.s]); } [Symbol.iterator]() { return this.s[Symbol.iterator](); } }
/* ---------- színek ---------- */
let PAL = {};
class Col {
  constructor(r = 1, g = 1, b = 1, a = 1) { if (r instanceof Col) ({ r, g, b, a } = r); this.r = +r; this.g = +g; this.b = +b; this.a = +a; }
  static valueOf(h, h2) { if (h instanceof Col) { const c = Col.hex(h2); h.set(c); return h; } return Col.hex(h); }
  static hex(h) { h = String(h || 'ffffff').replace(/^#/, ''); if (h.length < 6) h = h.padEnd(6, 'f'); const n = i => parseInt(h.slice(i, i + 2), 16) / 255; return new Col(n(0), n(2), n(4), h.length >= 8 ? n(6) : 1); }
  static rgb(r, g, b) { return new Col(r / 255, g / 255, b / 255, 1); }
  static HSVtoRGB(h, s, v) { const f = (n, k = (n + h / 60) % 6) => v / 100 - v / 100 * s / 100 * Math.max(Math.min(k, 4 - k, 1), 0); return new Col(f(5), f(3), f(1), 1); }
  set(r, g, b, a) { if (r instanceof Col) { this.r = r.r; this.g = r.g; this.b = r.b; this.a = r.a; } else { this.r = +r; this.g = +g; this.b = +b; if (a != null) this.a = +a; } return this; }
  cpy() { return new Col(this); } a(v) { this.a = +v; return this; } alpha(v) { return this.a(v); }
  mul(c, g, b, a) { if (c instanceof Col) { this.r *= c.r; this.g *= c.g; this.b *= c.b; this.a *= c.a; } else if (g == null) { this.r *= c; this.g *= c; this.b *= c; } else { this.r *= c; this.g *= g; this.b *= b; this.a *= a ?? 1; } return this; }
  mula(v) { this.a *= v; return this; }
  add(c) { this.r = Math.min(1, this.r + c.r); this.g = Math.min(1, this.g + c.g); this.b = Math.min(1, this.b + c.b); return this; }
  sub(c) { this.r = Math.max(0, this.r - c.r); this.g = Math.max(0, this.g - c.g); this.b = Math.max(0, this.b - c.b); return this; }
  lerp(c, t, g2, b2, t2) { if (!(c instanceof Col)) { c = new Col(c, t, g2, b2); t = t2; } this.r += (c.r - this.r) * t; this.g += (c.g - this.g) * t; this.b += (c.b - this.b) * t; this.a += (c.a - this.a) * t; return this; }
  shiftHue() { return this; } saturation() { return this; } value() { return Math.max(this.r, this.g, this.b); } clamp() { return this; }
  hex6() { const h = v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0'); return h(this.r) + h(this.g) + h(this.b); }
  toString() { return this.hex6() + Math.round(this.a * 255).toString(16).padStart(2, '0'); }
  css(a = 1) { return `rgba(${Math.round(this.r * 255)},${Math.round(this.g * 255)},${Math.round(this.b * 255)},${Math.max(0, Math.min(1, this.a * a))})`; }
  rgba() { return parseInt(this.toString(), 16); } rgba8888() { return this.rgba(); }
}
const NAMED = { white: 'ffffff', black: '000000', clear: '00000000', red: 'ff0000', green: '00ff00', blue: '0000ff', yellow: 'ffff00', orange: 'ffa500', gray: '7f7f7f', grey: '7f7f7f', lightGray: 'bfbfbf', darkGray: '3f3f3f', scarlet: 'ff341c', crimson: 'dc143c', purple: 'a020f0', violet: 'ee82ee', magenta: 'ff00ff', pink: 'ff69b4', cyan: '00ffff', sky: '87ceeb', royal: '4169e1', navy: '000080', slate: '708090', teal: '007f7f', lime: '32cd32', forest: '228b22', olive: '6b8e23', gold: 'ffd700', goldenrod: 'daa520', coral: 'ff7f50', salmon: 'fa8072', tan: 'd2b48c', brown: '8b4513', brick: 'b22222', maroon: 'b03060', acid: '7fff00', chartreuse: '7fff00' };
const ColorNs = new Proxy(Col, { apply: (t, s, a) => new Col(...a), get(t, p) { if (p in t) return t[p]; if (typeof p === 'string' && NAMED[p]) return Col.hex(NAMED[p]); return undefined; } });
const PalNs = new Proxy({}, { get: (t, p) => typeof p === 'string' && PAL[p] ? Col.hex(PAL[p]) : typeof p === 'string' ? Col.hex('ffd37f') : undefined });
const toCol = c => c instanceof Col ? c : typeof c === 'string' ? Col.hex(c) : typeof c === 'number' ? Col.hex((c >>> 0).toString(16).padStart(8, '0')) : null;

/* ---------- tartalom: tárgyak, folyadékok, blokkok, egységek ---------- */
const RI = {}, RL = {}, RB = {}, RU = {};   // Mindustry-név → Kohóvár-kulcs
function buildIndex() {
  for (const k in ITEMS) { RI[ISN[k] || k] = k; RI[k] = RI[k] || k; }
  for (const k in LIQUIDS) { RL[LSN[k] || k] = k; RL[k] = RL[k] || k; }
  for (const k in BLOCKS) { RB[SN[k] || k] = k; RB[k] = RB[k] || k; }
  for (const k in UNITS) RU[k] = k;
}
// a gyűjteménymezők az alap tartalmon is léteznek (a szkript bővítheti őket; a Kohóvárban hatástalan)
const COLL = T => Object.fromEntries(['weapons', 'abilities', 'immunities', 'flags', 'targetFlags', 'parts', 'attributes', 'consumers', 'upgrades', 'plans', 'requirements', 'spawnBullets'].map(q => [q, () => { const F = T.__fields || (T.__fields = {}); return F[q] || (F[q] = DEFAULT_F[q](T)); }]));
// meglévő (alap) tartalom módosítása a szkriptből: nem támogatott, hiányként jelezzük
const MODM = nm => Object.fromEntries(['consumeLiquid', 'consumeLiquids', 'consumePower', 'consumeItem', 'consumeItems', 'consume', 'ammo', 'removeConsumer', 'removeConsumers', 'addUpgrade', 'requirements', 'init', 'load', 'setStats', 'setBars', 'addBar', 'removeBar'].map(m => [m, () => (...a) => { if (!/^(init|load|setStats|setBars)$/.test(m)) miss(`${nm()}.${m}()`); return { boost() { return this; }, optional() { return this; }, update() { return this; } }; }]));
const FAC = new Map(), PRIO = new Set(['name', 'consumes', 'size', 'health', 'liquidCapacity', 'itemCapacity', 'localizedName', 'id', 'hitSize', 'speed']);
const itemF = k => { if (!k || !ITEMS[k]) return null; const key = 'i:' + k; if (!FAC.has(key)) { const I = ITEMS[k]; FAC.set(key, { __kind: 'item', key: k, name: ISN[k] || k, localizedName: I.n, color: Col.hex(String(I.c || '#fff').slice(1)), id: Object.keys(ITEMS).indexOf(k), hardness: I.hard || 0, researchRequirements: () => [], cost: I.cost || 1, flammability: I.flam || 0, explosiveness: I.expl || 0, radioactivity: I.rad || 0, charge: I.charge || 0, uiIcon: region('item-' + (ISN[k] || k)), fullIcon: region('item-' + (ISN[k] || k)), toString() { return this.name; } }); } return FAC.get(key); };
const liqF = k => { if (!k || !LIQUIDS[k]) return null; const key = 'l:' + k; if (!FAC.has(key)) { const L = LIQUIDS[k]; FAC.set(key, { __kind: 'liquid', key: k, name: LSN[k] || k, localizedName: L.n, color: Col.hex(String(L.c || '#fff').slice(1)), id: Object.keys(LIQUIDS).indexOf(k), gas: !!L.gas, temperature: L.temp ?? .5, canStayOn: new JSet(), flammability: L.flam || 0, uiIcon: region('liquid-' + (LSN[k] || k)), toString() { return this.name; } }); } return FAC.get(key); };
const itemKey = v => v == null ? null : typeof v === 'string' ? RI[v] || RI[kebab(v)] || (ITEMS[v] ? v : null) : v.__kind === 'item' ? v.key : v.__kind === 'ref' ? itemKey(v.name) : null;
const liqKey = v => v == null ? null : typeof v === 'string' ? RL[v] || RL[kebab(v)] || (LIQUIDS[v] ? v : null) : v.__kind === 'liquid' ? v.key : v.__kind === 'ref' ? liqKey(v.name) : null;
const DEF = new Map();   // tartalomnév → szkriptbeli definíció (extend(X, "név", {...}))
const blockF = k => {
  if (!k || !BLOCKS[k]) return null; const B = BLOCKS[k]; if (B.__jf) return B.__jf;
  const T = B.js || { __fields: {} };
  const comp = {
    name: () => SN[k] || k, localizedName: () => B.n, size: () => B.s, health: () => B.hp, itemCapacity: () => B.icap || B.cap || 10, liquidCapacity: () => B.lcap || 10,
    hasItems: () => true, hasLiquids: () => !!B.lcap, hasPower: () => !!(B.power || B.gen), rotate: () => !!B.rot, solid: () => true, category: () => B.kat, id: () => Object.keys(BLOCKS).indexOf(k),
    region: () => region(SN[k] || k), fullIcon: () => region(SN[k] || k), uiIcon: () => region(SN[k] || k), offset: () => (B.s % 2 ? 0 : TS / 2), range: () => B.range || 0, reload: () => B.reload || 0,
    consumes: () => ({ get(t) { const n = String(t && t[STUB] || t || ''); if (/liquid/.test(n) && B.inL) return { liquid: liqF(B.inL[0]), amount: B.inL[1] }; if (/item/.test(n) && B.inp) return { items: Object.entries(B.inp).map(([i, a]) => ({ item: itemF(i), amount: a })) }; if (/power/.test(n)) return { usage: B.power || 0, capacity: B.capP || 0 }; return null; }, has: () => false }),
    ...COLL(T), ...MODM(() => SN[k] || k), getClass: () => () => ({ getSimpleName: () => B.type, getName: () => B.type, toString: () => B.type }), researchRequirements: () => () => Object.entries(B.cost || {}).map(([i, a]) => ({ item: itemF(i), amount: a })), localizedName_: () => B.n, __key: () => k, __kind: () => 'block', isHidden: () => false, toString: () => () => SN[k] || k,
  };
  const p = new Proxy(T, { get(t, q) { if (typeof q === 'symbol') return undefined; if (PRIO.has(q)) return comp[q](); if (q === 'constructor' && !Object.prototype.hasOwnProperty.call(t, 'constructor')) return fn(() => null); if (q in t) return t[q]; if (comp[q]) return comp[q](); if (/^super\$/.test(q)) return () => {}; return undefined; }, set(t, q, v) { t[q] = v; return true; } });
  B.__jf = p; return p;
};
const unitDefF = k => {
  if (!k || !UNITS[k]) return null; const U = UNITS[k]; if (U.__jf) return U.__jf;
  const T = U.js || { __fields: {} };
  const comp = { ...COLL(T), ...MODM(() => k), getClass: () => () => ({ getSimpleName: () => 'UnitType', getName: () => 'UnitType' }), researchRequirements: () => () => Object.entries(U.cost || {}).map(([i, a]) => ({ item: itemF(i), amount: a })), name: () => k, localizedName: () => U.n, health: () => U.hp, speed: () => U.sp, hitSize: () => U.r * 2, flying: () => !!U.air, armor: () => U.armor || 0, region: () => region(k), fullIcon: () => region(k), uiIcon: () => region(k), __key: () => k, __kind: () => 'unit', id: () => Object.keys(UNITS).indexOf(k), weapons: () => new Seq([]), toString: () => () => k };
  const p = new Proxy(T, { get(t, q) { if (typeof q === 'symbol') return undefined; if (PRIO.has(q)) return comp[q](); if (q === 'constructor' && !Object.prototype.hasOwnProperty.call(t, 'constructor')) return fn(() => null); if (q in t) return t[q]; if (comp[q]) return comp[q](); if (/^super\$/.test(q)) return () => {}; return undefined; }, set(t, q, v) { t[q] = v; return true; } });
  U.__jf = p; return p;
};
const blockKey = v => v == null ? null : typeof v === 'string' ? RB[v] || RB[kebab(v)] || null : v.__key || (v.__kind === 'ref' ? blockKey(v.name) : null);
const unitKey = v => v == null ? null : typeof v === 'string' ? RU[v] || RU[kebab(v)] || null : v.__key || (v.__kind === 'ref' ? unitKey(v.name) : null);
const STATF = {};
const statusF = n => { n = kebab(n); return STATF[n] || (STATF[n] = { __kind: 'status', name: n, key: { burning: 'burn', freezing: 'freeze', wet: 'wet', muddy: 'muddy', melting: 'melt', sapped: 'sap', electrified: 'shock', 'spore-slowed': 'slow', tarred: 'tar', overdrive: 'od', overclock: 'od', shocked: 'shock', blasted: 'blast', corroded: 'corrode', disarmed: 'disarm', boss: 'boss' }[n] || n, color: Col.hex('ffffff'), toString() { return this.name; } }); };
const content = (kind, n) => {
  n = String(n); if (kind === 'item') return itemF(itemKey(n)); if (kind === 'liquid') return liqF(liqKey(n)); if (kind === 'unit') return unitDefF(unitKey(n)); if (kind === 'status') return statusF(n);
  return blockF(blockKey(n));
};
// a Kohóvárban nem létező (más modból vagy újabb játékverzióból való) tartalom: a szkript beállíthatja és bővítheti, de hatástalan
const GHOST = {};
const ghost = (kind, n) => { const k = kind + ':' + n; if (GHOST[k]) return GHOST[k]; miss(`${kind}: ${n}`); const T = { __fields: {} }, C = COLL(T);
  return (GHOST[k] = new Proxy(T, { get: (t, q) => typeof q !== 'string' ? undefined : q === 'name' ? n : C[q] ? C[q]() : q in t.__fields ? t.__fields[q] : /^(set|add|remove|consume|ammo|init|load)/.test(q) ? () => {} : undefined, set: (t, q, v) => { t.__fields[q] = v; return true; } })); };
const ns = kind => new Proxy({}, { get: (t, p) => typeof p !== 'string' ? undefined : content(kind, ALIAS[p] || kebab(p)) || (CUR && DEF.get(kebab(p))) || (kind === 'block' ? envF(ALIAS[p] || kebab(p)) : kind === 'status' ? null : ghost(kind, p)) });
// környezeti blokk (talaj, fal, érc): a Kohóvárban nem épület, csak név szerint hivatkozható
const ENVF = {}; const envF = n => ENVF[n] || (ENVF[n] = { __kind: 'env', name: n, localizedName: n, size: 1, solid: /wall|rock|boulder|tree|pine/.test(n), isLiquid: /water|slag|oil|tar|cryo/.test(n), isFloor: () => !/wall/.test(n), isStatic: () => /wall/.test(n), isAir: () => n === 'air', asFloor() { return this; }, itemDrop: null, liquidDrop: null, attributes: { set() {}, get: () => 0 }, toString() { return n; } });
const ALIAS = { surgealloy: 'surge-alloy', phasefabric: 'phase-fabric', sporepod: 'spore-pod', blastcompound: 'blast-compound', surgeAlloy: 'surge-alloy', phaseFabric: 'phase-fabric', sporePod: 'spore-pod', blastCompound: 'blast-compound', cryofluid: 'cryofluid', coreShard: 'core-shard', coreFoundation: 'core-foundation', coreNucleus: 'core-nucleus' };

/* ---------- textúrák (TextureRegion) ---------- */
const SPRITE_SRC = [];   // [modId, Map(név → png)] a még be nem töltött sprite-okhoz
const tried = new Set();
function key(n) {
  if (!n) return null; n = String(n); if (has(n)) return n; if (has(n + '@o')) return n + '@o';
  if (!tried.has(n)) { tried.add(n); for (const [id, m] of SPRITE_SRC) { const s = n.startsWith(id + '-') ? n.slice(id.length + 1) : null; const d = (s && m.get(s)) || m.get(n); if (d) { addSprite(n, d); break; } } }
  return has(n) ? n : null;
}
class Region { constructor(n) { this.name = String(n); } get key() { return key(this.name); } found() { return !!this.key; } get width() { const r = this.key; return r ? sz(r)[0] : 0; } get height() { const r = this.key; return r ? sz(r)[1] : 0; } toString() { return this.name; } }
let sz = () => [32, 32];
const region = n => n instanceof Region ? n : new Region(n && n.name !== undefined && !(typeof n === 'string') ? n.name : n);
const Atlas = { find(n, fb) { const r = region(n); return r.found() || fb == null ? r : region(fb); }, has(n) { return !!key(n); }, isFound(r) { return !!(r && r.found && r.found()); }, white() { return region('whiteui'); } };

/* ---------- rajzolás (Draw, Fill, Lines, Drawf) ---------- */
const DS = { col: new Col(), mix: null, stroke: 1, add: false };
const g = () => G2;
const setFill = (a = 1) => { const c = g(); c.fillStyle = DS.col.css(a); c.strokeStyle = DS.col.css(a); c.lineWidth = DS.stroke; };
const R_ = deg => -(+deg || 0) * D2R;
const Draw = {
  scl: .25, xscl: 1, yscl: 1,
  color(c, c2, t) { if (c == null) DS.col = new Col(); else if (typeof c === 'number' && c2 != null && typeof c2 === 'number') DS.col = new Col(c, c2, t, arguments[3] ?? 1); else if (c2 instanceof Col) DS.col = toCol(c).cpy().lerp(c2, +t || 0); else DS.col = (toCol(c) || new Col()).cpy(); },
  colorl(l) { DS.col = new Col(l, l, l, 1); }, tint(a, b, t) { Draw.color(a, b, t); },
  alpha(a) { DS.col = DS.col.cpy(); DS.col.a = +a; }, reset() { DS.col = new Col(); DS.mix = null; DS.stroke = 1; if (G2) G2.globalCompositeOperation = 'source-over'; },
  mixcol(c, a) { DS.mix = c == null ? null : [toCol(c), +a || 0]; }, z() {}, blend(b) { if (G2) G2.globalCompositeOperation = b && b[STUB] && /additive/.test(b[STUB]) ? 'lighter' : 'source-over'; },
  draw(z, r) { call(r); }, flush() {}, sort() {}, shader() {}, getColor() { return DS.col; },
  rect(r, x, y, w, h, rot) {
    if (!G2) return; let n = typeof r === 'string' ? key(r) : r && r.key; if (!n) return;
    if (arguments.length === 4) { rot = w; w = h = null; } else if (arguments.length === 3) { w = h = rot = null; }
    else if (arguments.length >= 8) { rot = arguments[7]; }
    const c = DS.col, white = c.r > .99 && c.g > .99 && c.b > .99, a = c.a;
    G2.globalAlpha = Math.max(0, Math.min(1, a));
    const sx = w != null && w < 0 ? -1 : null, W_ = w != null ? Math.abs(w) : null, H_ = h != null ? Math.abs(h) : null;
    if (white && !DS.mix) spr(G2, n, x, fy(y), R_(rot), sx, sx ? 1 : null, W_, H_);
    else sprT(G2, n, '#' + (DS.mix ? DS.mix[0].hex6() : c.hex6()), DS.mix ? 0 : 1, x, fy(y), R_(rot), sx, sx ? 1 : null, W_, H_);
    G2.globalAlpha = 1;
  },
};
const poly = (x, y, n, r, rot) => { const c = g(); c.beginPath(); for (let i = 0; i <= n; i++) { const a = R_(rot) + i * 2 * PI / n; c.lineTo(x + Math.cos(a) * r, fy(y) + Math.sin(a) * r); } };
const Fill = {
  circle(x, y, r) { if (!G2) return; setFill(); G2.beginPath(); G2.arc(x, fy(y), Math.max(0, r), 0, 7); G2.fill(); },
  square(x, y, r, rot) { if (!G2) return; setFill(); poly(x, y, 4, r * Math.SQRT2, (rot || 0) + 45); G2.fill(); },
  rect(x, y, w, h) { if (!G2) return; setFill(); G2.fillRect(x - w / 2, fy(y) - h / 2, w, h); },
  crect(x, y, w, h) { if (!G2) return; setFill(); G2.fillRect(x, fy(y) - h, w, h); },
  poly(x, y, n, r, rot) { if (!G2) return; setFill(); poly(x, y, n, r, rot || 0); G2.fill(); },
  tri(x1, y1, x2, y2, x3, y3) { if (!G2) return; setFill(); G2.beginPath(); G2.moveTo(x1, fy(y1)); G2.lineTo(x2, fy(y2)); G2.lineTo(x3, fy(y3)); G2.fill(); },
  quad(x1, y1, x2, y2, x3, y3, x4, y4) { if (!G2 || typeof x1 !== 'number') return; setFill(); G2.beginPath(); G2.moveTo(x1, fy(y1)); G2.lineTo(x2, fy(y2)); G2.lineTo(x3, fy(y3)); G2.lineTo(x4, fy(y4)); G2.fill(); },
  arc(x, y, r, frac, rot) { if (!G2) return; setFill(); G2.beginPath(); G2.moveTo(x, fy(y)); G2.arc(x, fy(y), r, R_(rot), R_(rot) - frac * 2 * PI, true); G2.fill(); },
  light(x, y, n, r, c1, c2) { if (!G2) return; const c = toCol(c1) || DS.col, gr = G2.createRadialGradient(x, fy(y), 0, x, fy(y), r); gr.addColorStop(0, c.css()); gr.addColorStop(1, (toCol(c2) || new Col(0, 0, 0, 0)).css()); G2.fillStyle = gr; G2.beginPath(); G2.arc(x, fy(y), r, 0, 7); G2.fill(); },
  donut(x, y, r1, r2) { if (!G2) return; setFill(); G2.beginPath(); G2.arc(x, fy(y), r2, 0, 7); G2.arc(x, fy(y), r1, 0, 7, true); G2.fill(); },
};
let LP = null;
const stroke = () => { setFill(); G2.lineWidth = DS.stroke; G2.stroke(); };
const Lines = {
  stroke(w, c) { DS.stroke = +w || 0; if (c) Draw.color(c); }, getStroke() { return DS.stroke; },
  line(x1, y1, x2, y2) { if (!G2 || typeof x1 !== 'number') return; G2.beginPath(); G2.moveTo(x1, fy(y1)); G2.lineTo(x2, fy(y2)); stroke(); },
  lineAngle(x, y, a, len) { if (!G2) return; const r = R_(a); G2.beginPath(); G2.moveTo(x, fy(y)); G2.lineTo(x + Math.cos(r) * len, fy(y) + Math.sin(r) * len); stroke(); },
  lineAngleCenter(x, y, a, len) { const r = a * D2R, dx = Math.cos(r) * len / 2, dy = Math.sin(r) * len / 2; Lines.line(x - dx, y - dy, x + dx, y + dy); },
  circle(x, y, r) { if (!G2) return; G2.beginPath(); G2.arc(x, fy(y), Math.max(0, r), 0, 7); stroke(); },
  dashCircle(x, y, r) { if (!G2) return; G2.setLineDash([3, 3]); Lines.circle(x, y, r); G2.setLineDash([]); },
  poly(x, y, n, r, rot) { if (!G2 || typeof x !== 'number') return; poly(x, y, n, r, rot || 0); stroke(); },
  square(x, y, r, rot) { if (!G2) return; poly(x, y, 4, r * Math.SQRT2, (rot || 0) + 45); stroke(); },
  rect(x, y, w, h) { if (!G2) return; if (typeof x !== 'number') ({ x, y, width: w, height: h } = x); G2.beginPath(); G2.rect(x, fy(y) - h, w, h); stroke(); },
  arc(x, y, r, frac, rot) { if (!G2) return; G2.beginPath(); G2.arc(x, fy(y), r, R_(rot), R_(rot) - frac * 2 * PI, true); stroke(); },
  swirl(x, y, r, frac, rot) { Lines.arc(x, y, r, frac, rot); },
  spikes(x, y, rad, len, n, rot) { for (let i = 0; i < n; i++) { const a = (rot || 0) + i * 360 / n, c = Math.cos(a * D2R), s = Math.sin(a * D2R); Lines.line(x + c * rad, y + s * rad, x + c * (rad + len), y + s * (rad + len)); } },
  beginLine() { LP = []; }, linePoint(x, y) { if (LP) LP.push([x, y]); }, endLine(close) { if (!G2 || !LP) return; G2.beginPath(); LP.forEach(([x, y], i) => i ? G2.lineTo(x, fy(y)) : G2.moveTo(x, fy(y))); if (close) G2.closePath(); stroke(); LP = null; },
  precise() {},
};
const Drawf = {
  liquid(r, x, y, a, c, rot) { const o = DS.col; Draw.color(c); DS.col.a = Math.max(0, Math.min(1, +a || 0)); Draw.rect(r, x, y, rot || 0); DS.col = o; },
  light() {}, shadow(x, y, r, a) { const o = DS.col; DS.col = new Col(0, 0, 0, .3 * (a ?? 1)); Fill.circle(x, y, r * .6); DS.col = o; },
  dashCircle(x, y, r, c) { const o = DS.col; Draw.color(c || o); Lines.stroke(1); Lines.dashCircle(x, y, r); DS.col = o; },
  circles(x, y, r, c) { const o = DS.col; Draw.color(c || PAL.accent || 'ffd37f'); Lines.stroke(1); Lines.circle(x, y, r); DS.col = o; },
  square(x, y, r, rot, c) { const o = DS.col; if (c != null && typeof rot !== 'number') { c = rot; rot = 45; } Draw.color(c || o); Lines.stroke(1); Lines.square(x, y, r, rot ?? 45); DS.col = o; },
  dashLine(c, x1, y1, x2, y2) { const o = DS.col; Draw.color(c); if (G2) G2.setLineDash([3, 3]); Lines.line(x1, y1, x2, y2); if (G2) G2.setLineDash([]); DS.col = o; },
  tri(x, y, w, len, rot) { const r = rot * D2R, c = Math.cos(r), s = Math.sin(r); Fill.tri(x + c * len, y + s * len, x - s * w / 2, y + c * w / 2, x + s * w / 2, y - c * w / 2); },
  spinSprite(r, x, y, rot) { Draw.rect(r, x, y, rot); }, select(x, y, r, c) { Drawf.square(x, y, r, 45, c); },
  laser(a, b, c, x1, y1, x2, y2, sc) { if (typeof a === 'number') return; Lines.stroke(2 * (sc || 1)); Lines.line(x1, y1, x2, y2); },
  target(x, y, r, c) { Drawf.circles(x, y, r, c); }, arrow() {}, selected() {}, additive(r, c, x, y, rot) { Draw.color(c); Draw.rect(r, x, y, rot || 0); Draw.color(); },
};

/* ---------- matek ---------- */
let SEEDR = 0; const seeded = s => { let a = (s | 0) + 0x6D2B79F5; a = Math.imul(a ^ a >>> 15, 1 | a); a ^= a + Math.imul(a ^ a >>> 7, 61 | a); return ((a ^ a >>> 14) >>> 0) / 4294967296; };
const Mathf = {
  PI, pi: PI, PI2: PI * 2, halfPi: PI / 2, degRad: D2R, radDeg: R2D, degreesToRadians: D2R, radiansToDegrees: R2D, E: Math.E, sqrt2: Math.SQRT2,
  random(a, b) { if (a == null) return Math.random(); if (b == null) return Number.isInteger(a) ? Math.floor(Math.random() * (a + 1)) : Math.random() * a; return Number.isInteger(a) && Number.isInteger(b) ? a + Math.floor(Math.random() * (b - a + 1)) : a + Math.random() * (b - a); },
  range(a, b) { return b == null ? (Math.random() * 2 - 1) * a : a + Math.random() * (b - a); }, randomBoolean(p = .5) { return Math.random() < p; },
  randomSeed(s, a, b) { const r = seeded(s); return a == null ? r : b == null ? r * a : a + r * (b - a); }, randomSeedRange(s, a) { return (seeded(s) * 2 - 1) * a; },
  chance(p) { return Math.random() < p; }, chanceDelta(p) { return Math.random() < p; },
  clamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, v)); }, lerp(a, b, t) { return a + (b - a) * t; }, lerpDelta(a, b, t) { return a + (b - a) * t; },
  approach(a, b, s) { return a < b ? Math.min(a + s, b) : Math.max(a - s, b); }, approachDelta(a, b, s) { return Mathf.approach(a, b, s); },
  sin(r, sc, m) { return sc == null ? Math.sin(r) : Math.sin(r / sc) * m; }, cos(r, sc, m) { return sc == null ? Math.cos(r) : Math.cos(r / sc) * m; },
  absin(r, sc, m) { if (sc == null) return (Math.sin(r) + 1) / 2; return (Math.sin(r / sc) + 1) / 2 * m; }, sinDeg(d) { return Math.sin(d * D2R); }, cosDeg(d) { return Math.cos(d * D2R); }, tan: Math.tan, atan2: (x, y) => Math.atan2(y, x),
  dst(x1, y1, x2, y2) { return x2 == null ? Math.hypot(x1, y1) : Math.hypot(x2 - x1, y2 - y1); }, dst2(x1, y1, x2, y2) { return (x2 - x1) ** 2 + (y2 - y1) ** 2; }, len(x, y) { return Math.hypot(x, y); }, len2(x, y) { return x * x + y * y; },
  angle(x, y, x2, y2) { const a = x2 == null ? Math.atan2(y, x) : Math.atan2(y2 - y, x2 - x); return ((a * R2D) + 360) % 360; },
  floor: Math.floor, ceil: Math.ceil, round(v, s) { return s ? Math.round(v / s) * s : Math.round(v); }, abs: Math.abs, sign: Math.sign, sqrt: Math.sqrt, pow: Math.pow, log: (b, v) => Math.log(v) / Math.log(b), exp: Math.exp, mod: (a, b) => ((a % b) + b) % b, sqr: v => v * v, num: b => b ? 1 : 0,
  slope(f) { return 1 - Math.abs(f - .5) * 2; }, curve(f, a, b) { return f < a ? 0 : f > b ? 1 : (f - a) / (b - a); }, map(v, a, b, c, d) { if (d == null) { d = c; c = b; b = a; a = 0; } return c + (v - a) / (b - a) * (d - c); },
  zero(v, t = 1e-4) { return Math.abs(v) <= t; }, equal(a, b, t = 1e-4) { return Math.abs(a - b) <= t; }, within(x1, y1, x2, y2, d) { return Math.hypot(x2 - x1, y2 - y1) < d; }, maxZero: v => Math.max(0, v), wrapAngleAroundZero: a => a > 180 ? a - 360 : a,
  rand: { random: (a, b) => Mathf.random(a, b), range: a => Mathf.range(a), nextFloat: () => Math.random(), chance: p => Math.random() < p, setSeed() {} },
  sum(a) { return [...a].reduce((s, v) => s + v, 0); }, max: Math.max, min: Math.min, mul: (a, b) => a * b, step: (a, b, s) => Math.round((s - a) / b) * b + a, absMin: (a, b) => Math.abs(a) < Math.abs(b) ? a : b,
};
const Angles = {
  trnsx(a, x, y) { return y == null ? x * Math.cos(a * D2R) : x * Math.cos(a * D2R) - y * Math.sin(a * D2R); },
  trnsy(a, x, y) { return y == null ? x * Math.sin(a * D2R) : x * Math.sin(a * D2R) + y * Math.cos(a * D2R); },
  angle(x, y, x2, y2) { return Mathf.angle(x, y, x2, y2); }, angleDist(a, b) { const d = Math.abs(((a - b) % 360 + 540) % 360 - 180); return d; }, angleRange(a, b) { return Angles.angleDist(a, b); },
  moveToward(a, t, s) { const d = ((t - a) % 360 + 540) % 360 - 180; return Math.abs(d) <= s ? t : a + Math.sign(d) * s; }, within(a, b, m) { return Angles.angleDist(a, b) < m; }, near(a, b, m) { return Angles.within(a, b, m); },
  forward(a, b) { return Angles.angleDist(a, b) < 90; }, backwards(a, b) { return !Angles.forward(a, b); }, clampRange(a, d, r) { return a; }, mouseAngle(x, y) { return 0; },
  randLenVectors(seed, n, len, a, b, c) { let ang = 0, rng = 360, f = a; if (c != null) { ang = a; rng = b; f = c; } else if (b != null) { f = b; } let s = seed | 0; for (let i = 0; i < n; i++) { const r1 = seeded(s++), r2 = seeded(s++), aa = ang + (r1 * 2 - 1) * rng, l = r2 * len; call(f, Math.cos(aa * D2R) * l, Math.sin(aa * D2R) * l); } },
  randVectors(seed, n, len, f) { let s = seed | 0; for (let i = 0; i < n; i++) { const aa = seeded(s++) * 360; call(f, Math.cos(aa * D2R) * len, Math.sin(aa * D2R) * len); } },
  shotgun(n, sp, a, f) { for (let i = 0; i < n; i++) call(f, a - (n - 1) * sp / 2 + i * sp); },
};
class Vec2 {
  constructor(x = 0, y = 0) { if (x instanceof Vec2) ({ x, y } = x); this.x = +x; this.y = +y; }
  set(x, y) { if (x && typeof x === 'object') { this.x = x.x; this.y = x.y; } else { this.x = +x; this.y = +y; } return this; } setZero() { return this.set(0, 0); } cpy() { return new Vec2(this.x, this.y); }
  add(x, y) { if (typeof x === 'object') { this.x += x.x; this.y += x.y; } else { this.x += x; this.y += y ?? x; } return this; } sub(x, y) { if (typeof x === 'object') { this.x -= x.x; this.y -= x.y; } else { this.x -= x; this.y -= y ?? x; } return this; }
  scl(a, b) { this.x *= a; this.y *= b ?? a; return this; } len() { return Math.hypot(this.x, this.y); } len2() { return this.x * this.x + this.y * this.y; } angle() { return Mathf.angle(this.x, this.y); } angleTo(x, y) { if (typeof x === 'object') ({ x, y } = x); return Mathf.angle(this.x, this.y, x, y); }
  setAngle(a) { const l = this.len(); this.x = Math.cos(a * D2R) * l; this.y = Math.sin(a * D2R) * l; return this; } rotate(a) { const c = Math.cos(a * D2R), s = Math.sin(a * D2R), x = this.x; this.x = x * c - this.y * s; this.y = x * s + this.y * c; return this; }
  trns(a, x, y) { return this.set(Angles.trnsx(a, x, y), Angles.trnsy(a, x, y)); } setLength(l) { const k = this.len() || 1; return this.scl(l / k); } limit(l) { return this.len() > l ? this.setLength(l) : this; } nor() { return this.setLength(1); }
  dst(x, y) { if (typeof x === 'object') ({ x, y } = x); return Math.hypot(x - this.x, y - this.y); } within(x, y, d) { if (typeof x === 'object') { d = y; ({ x, y } = x); } return this.dst(x, y) < d; } lerp(v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; return this; } approach(v, s) { return this.lerp(v, Math.min(1, s / (this.dst(v) || 1))); } isZero() { return !this.x && !this.y; } dot(v) { return this.x * v.x + this.y * v.y; }
}
const Interp = new Proxy({ linear: { apply: x => x }, pow2: { apply: x => x < .5 ? 2 * x * x : 1 - 2 * (1 - x) ** 2 }, pow2In: { apply: x => x * x }, pow2Out: { apply: x => 1 - (1 - x) ** 2 }, pow3In: { apply: x => x ** 3 }, pow3Out: { apply: x => 1 - (1 - x) ** 3 }, pow5In: { apply: x => x ** 5 }, pow5Out: { apply: x => 1 - (1 - x) ** 5 }, pow10Out: { apply: x => 1 - (1 - x) ** 10 }, smooth: { apply: x => x * x * (3 - 2 * x) }, sine: { apply: x => (1 - Math.cos(x * PI)) / 2 }, sineIn: { apply: x => 1 - Math.cos(x * PI / 2) }, sineOut: { apply: x => Math.sin(x * PI / 2) }, circleOut: { apply: x => Math.sqrt(1 - (x - 1) ** 2) }, circleIn: { apply: x => 1 - Math.sqrt(1 - x * x) }, exp5Out: { apply: x => 1 - 2 ** (-5 * x) }, exp10Out: { apply: x => 1 - 2 ** (-10 * x) }, slope: { apply: x => 1 - Math.abs(x - .5) * 2 }, one: { apply: () => 1 }, zero: { apply: () => 0 } },
  { get: (t, p) => p in t ? t[p] : typeof p === 'string' ? t.linear : undefined });

/* ---------- idő ---------- */
let TIMERS = [];
const Time = { get time() { return CW ? CW.tick : performance.now() / 16.67; }, get globalTime() { return Time.time; }, delta: 1, toSeconds: 60, toMinutes: 3600,
  run(d, f) { TIMERS.push({ at: Time.time + (+d || 0), f }); }, runTask(d, f) { Time.run(d, f); }, millis: () => Date.now(), nanos: () => performance.now() * 1e6, timeSinceMillis: t => Date.now() - t, clear() { TIMERS = []; } };
const Timer = { schedule(f, delay, iv, n) { const t = { at: Time.time + (+delay || 0) * 60, f, iv: iv != null ? iv * 60 : null, n: n ?? -1, cancel() { this.dead = 1; }, isScheduled() { return !this.dead; } }; TIMERS.push(t); return t; }, instance: () => Timer };
class Interval { constructor(n = 1) { this.t = new Array(n).fill(0); } get(i, time) { if (time == null) { time = i; i = 0; } this.t[i] = (this.t[i] || 0) + 1; if (this.t[i] >= time) { this.t[i] = 0; return true; } return false; } check(i, t) { return (this.t[i] || 0) >= t; } reset(i, v) { this.t[i] = v; } getTime(i) { return this.t[i] || 0; } }

/* ---------- csapatok ---------- */
const TEAMS = {};
const team = id => { id = +id || 0; return TEAMS[id] || (TEAMS[id] = { __team: 1, id, name: ['derelict', 'sharded', 'crux', 'malis', 'green', 'blue'][id] || 'team#' + id, color: Col.hex(['4d4e58', 'ffd37f', 'f25555', 'a27ce5', '54d67d', '6c87fd'][id] || 'ffffff'), core() { return CW && id === 1 && CW.core ? buildF(CW.core) : null; }, cores() { return new Seq(CW ? CW.blds.filter(b => b.team === id && b.B.type === 'core').map(buildF) : []); }, data() { return { units: new Seq(CW ? CW.units.filter(u => u.team === id && !u.dead).map(unitF) : []), buildings: new Seq(CW ? CW.blds.filter(b => b.team === id).map(buildF) : []), unitCount: t => CW ? CW.units.filter(u => u.team === id && !u.dead && u.t === unitKey(t)).length : 0, core: () => team(id).core() }; }, isEnemy(o) { return o && o.id !== id && o.id && id; }, toString() { return this.name; }, items() { return team(id).core()?.items; } }); };
const teamId = t => t == null ? 0 : typeof t === 'number' ? t : t.__team ? t.id : 0;
const TeamNs = { get: team, get derelict() { return team(0); }, get sharded() { return team(1); }, get crux() { return team(2); }, get malis() { return team(3); }, get green() { return team(4); }, get blue() { return team(5); }, get all() { return [0, 1, 2, 3, 4, 5].map(team); }, get baseTeams() { return [0, 1, 2, 3, 4, 5].map(team); } };

/* ---------- homlokzatok: épület, egység, mező ---------- */
const NAT = new WeakMap();
// szám, ami függvényként is hívható (a régi v5-ös API-ban metódus volt: maxHealth(), healthf())
const numfn = v => Object.assign(() => v, { valueOf: () => v, toString: () => String(v) });   // épület/egység → { super$név: eredeti }
function itemsF(b) {
  const I = () => b.items || (b.items = {});
  return { get(it) { const k = itemKey(it); return k ? I()[k] || 0 : 0; }, has(it, n = 1) { if (Array.isArray(it) || it instanceof Seq) return [...it].every(s => this.has(s.item, s.amount)); const k = itemKey(it); return k ? (I()[k] || 0) >= n : false; },
    total() { let s = 0; for (const k in I()) s += I()[k] || 0; return s; }, add(it, n = 1) { if (Array.isArray(it) || it instanceof Seq) { for (const s of it) this.add(s.item, s.amount); return; } const k = itemKey(it); if (k) I()[k] = (I()[k] || 0) + n; },
    remove(it, n = 1) { if (Array.isArray(it) || it instanceof Seq) { for (const s of it) this.remove(s.item, s.amount); return; } const k = itemKey(it); if (k) I()[k] = Math.max(0, (I()[k] || 0) - n); }, set(it, n) { const k = itemKey(it); if (k) I()[k] = n; },
    each(f) { for (const k in I()) if (I()[k] > 0) call(f, itemF(k), I()[k]); }, first() { for (const k in I()) if (I()[k] > 0) return itemF(k); return null; }, empty() { return this.total() === 0; }, any() { return this.total() > 0; }, clear() { for (const k in I()) I()[k] = 0; }, sum(f) { let s = 0; this.each((i, n) => { s += call(f, i, n); }); return s; } };
}
function buildF(b) {
  if (!b) return null; if (b.__jf) return b.__jf;
  const B = b.B, W = () => CW, st = {};
  const comp = {
    x: () => (b.x + B.s / 2) * TS, y: () => fy((b.y + B.s / 2) * TS), tileX: () => b.x + ((B.s - 1) >> 1), tileY: () => (CW ? CW.h - 1 : 0) - (b.y + (B.s >> 1)), rotation: () => (4 - (b.rot || 0)) % 4,
    block: () => blockF(b.t), tile: () => tileF(b.x + ((B.s - 1) >> 1), b.y + (B.s >> 1)), team: () => team(b.team), health: () => numfn(b.hp), maxHealth: () => numfn(B.hp), healthf: () => numfn(b.hp / B.hp), dead: () => !!b.dead,
    items: () => itemsF(b), liquids: () => ({ get: l => liqKey(l) === b.lt ? b.lq || 0 : 0, currentAmount: () => b.lq || 0, current: () => liqF(b.lt), add(l, n) { const k = liqKey(l); if (k) { b.lt = k; b.lq = Math.min(B.lcap || 10, (b.lq || 0) + n); } }, remove(l, n) { if (liqKey(l) === b.lt) b.lq = Math.max(0, (b.lq || 0) - n); }, sum: () => b.lq || 0 }),
    power: () => ({ status: b.ps ?? 1, graph: { getSatisfaction: () => b.ps ?? 1, getPowerBalance: () => 0, getLastPowerProduced: () => 0 } }), efficiency: () => b.ps ?? 1, potentialEfficiency: () => 1,
    warmup: () => b.work || 0, progress: () => b.prog || 0, totalProgress: () => b.tp || 0, enabled: () => !b.off, timer: () => b.__iv || (b.__iv = new Interval(8)), timerDump: () => 0, proximity: () => new Seq(CW ? FW.adj(CW, b).map(buildF) : []),
    payload: () => null, ammo: () => new Seq([]), totalAmmo: () => b.ammoN || 0, reloadCounter: () => b.cd || 0, isShooting: () => !!b.tgt, target: () => b.tgt ? (b.tgt.U ? unitF(b.tgt) : buildF(b.tgt)) : null,
    shield: () => 0, lastAccessed: () => '', id: () => b.id || 0, version: () => 0, edelta: () => b.ps ?? 1, delta: () => 1, timeScale: () => b.odT > (CW ? CW.tick : 0) ? b.odM : 1,
  };
  const meth = {
    damage(a) { if (CW) CW.dmgB(b, +a || 0); }, kill() { if (CW) CW.dmgB(b, 1e12); }, heal(a) { b.hp = Math.min(B.hp, b.hp + (a == null ? B.hp : +a)); }, healFract(f) { b.hp = Math.min(B.hp, b.hp + B.hp * f); },
    isValid() { return !b.dead; }, isAdded() { return !b.dead; }, within(x, y, d) { if (typeof x === 'object') { d = y; ({ x, y } = x); } return Math.hypot(x - comp.x(), y - comp.y()) < d; }, dst(x, y) { if (typeof x === 'object') ({ x, y } = x); return Math.hypot(x - comp.x(), y - comp.y()); },
    angleTo(x, y) { if (typeof x === 'object') ({ x, y } = x); return Mathf.angle(comp.x(), comp.y(), x, y); }, front() { return CW ? buildF(CW.front(b)) : null; }, back() { return CW ? buildF(CW.front(b, (b.rot + 2) % 4)) : null; },
    left() { return CW ? buildF(CW.front(b, (b.rot + 3) % 4)) : null; }, right() { return CW ? buildF(CW.front(b, (b.rot + 1) % 4)) : null; },
    dump(it) { if (CW) CW.dump(b, itemKey(it) || undefined); return true; }, offload(it) { const k = itemKey(it); if (k && CW && !CW.offer(CW.front(b), k, b)) { b.items = b.items || {}; b.items[k] = (b.items[k] || 0) + 1; } },
    moveForward(it) { const k = itemKey(it); return !!(k && CW && CW.offer(CW.front(b), k, b)); }, put(it) { return this.moveForward(it); }, produce() {}, consume() {}, canConsume() { return (b.ps ?? 1) > 0; }, shouldConsume() { return true; },
    tileOn() { return comp.tile(); }, floor() { return comp.tile().floor(); }, rotdeg() { return comp.rotation() * 90; }, relativeTo(o) { return 0; }, interactable(t) { return teamId(t) === b.team; }, isPayload() { return false; },
    write() {}, read() {}, writeBase() {}, readBase() {}, noSleep() {}, sleep() {}, updateTile() {}, draw() {}, drawSelect() {}, drawLight() {}, configure() {}, config() { return b.cfg ?? null; }, playerPlaced() {}, placed() {}, onRemoved() {}, onDestroyed() {}, onProximityUpdate() {}, updateProximity() {}, remove() { if (CW) CW.remB(b); },
    acceptItem(src, it) { return true; }, handleItem(src, it) { const k = itemKey(it); if (k) { b.items = b.items || {}; b.items[k] = (b.items[k] || 0) + 1; } }, acceptLiquid() { return true; }, handleLiquid(src, l, n) { comp.liquids().add(l, n); },
    getDisplayEfficiency() { return b.ps ?? 1; }, status() { return { color: Col.hex('84f491') }; }, toString() { return 'Building#' + (SN[b.t] || b.t); },
  };
  const p = new Proxy(st, {
    get(t, q) {
      if (typeof q === 'symbol') return undefined;
      const N = NAT.get(b); if (/^super\$/.test(q)) { const k = q.slice(6); return (N && N[k]) || meth[k] || (() => undefined); }
      const O = b.__jo; if (O && typeof O[q] === 'function') return O[q];
      if (q in t) return t[q]; if (comp[q]) return comp[q](); if (meth[q]) return meth[q];
      return undefined;
    },
    set(t, q, v) { if (q === 'health') { b.hp = +v; return true; } if (q === 'enabled') { b.off = !v; return true; } if (q === 'rotation') { b.rot = (4 - (v & 3)) % 4; return true; } t[q] = v; return true; },
  });
  b.__jf = p;
  const O = B.js && B.js.__build && makeOver(B.js.__build, B.js); if (O) { b.__jo = O.over; for (const k in O.fields) if (!(k in st)) st[k] = O.fields[k]; }
  else if (B.js) {   // régi (v5) stílus: a blokk saját draw(tile) / update(tile) metódusa, a tile.ent() az épület
    const t = B.js[INST], ov = t.__over, self = new Proxy(blockF(b.t), { get: (o, q) => /^super\$(draw|drawBase)$/.test(q) ? () => { const N = NAT.get(b); if (N && N.draw) N.draw(); } : /^super\$(update|updateTile)$/.test(q) ? () => { const N = NAT.get(b); if (N && N.updateTile) N.updateTile(); } : o[q] });
    const tl = () => Object.assign(comp.tile() || {}, { ent: () => p, entity: p, bc: () => p });
    const jo = {}; if (typeof ov.draw === 'function') jo.draw = () => ov.draw.call(self, tl()); const u = ov.updateTile || ov.update; if (typeof u === 'function') jo.updateTile = () => u.call(self, tl());
    if (jo.draw || jo.updateTile) b.__jo = jo;
  }
  return p;
}
function makeOver(bt, def) {
  try { const o = typeof bt === 'function' ? bt() : bt; if (!o || !o.__over) return null; const over = {}, fields = {}; for (const k of Object.keys(o.__over)) (typeof o.__over[k] === 'function' ? over : fields)[k] = o.__over[k]; return { over, fields }; }
  catch (e) { err(def.__mod, 'buildType', e); return null; }
}
function unitF(u) {
  if (!u) return null; if (u.__jf) return u.__jf;
  const st = {};
  const comp = {
    x: () => u.x, y: () => fy(u.y), rotation: () => ((-u.rot * R2D) % 360 + 360) % 360, team: () => team(u.team), type: () => unitDefF(u.t), health: () => u.hp, maxHealth: () => u.U.hp, dead: () => !!u.dead,
    hitSize: () => u.U.r * 2, elevation: () => u.U.air ? 1 : 0, vel: () => new Vec2(u.vx, -u.vy), id: () => u.id, shield: () => u.sh || 0, armor: () => u.U.armor || 0, speedMultiplier: () => u.spm || 1,
    tileX: () => Math.floor(u.x / TS), tileY: () => (CW ? CW.h - 1 : 0) - Math.floor(u.y / TS), stack: () => u.stack ? { item: itemF(u.stack.it), amount: u.stack.n || 0 } : { item: null, amount: 0 }, ammo: () => 1, mounts: () => [],
    controller: () => ({}), plans: () => new Seq([]), lastX: () => u.x, lastY: () => fy(u.y), spawnedByCore: () => false, drag: () => 0,
  };
  const meth = {
    damage(a) { if (CW) CW.dmgU(u, +a || 0); }, damagePierce(a) { if (CW) CW.dmgU(u, +a || 0, 1); }, kill() { if (CW) CW.dmgU(u, 1e12, 1); }, heal(a) { u.hp = Math.min(u.U.hp, u.hp + (a == null ? u.U.hp : +a)); }, healFract(f) { u.hp = Math.min(u.U.hp, u.hp + u.U.hp * f); },
    isFlying() { return !!u.U.air; }, isGrounded() { return !u.U.air; }, isPlayer() { return !!(CW && u === CW.player); }, isValid() { return !u.dead; }, isAdded() { return !u.dead; }, isLocal() { return this.isPlayer(); },
    within(x, y, d) { if (typeof x === 'object') { d = y; ({ x, y } = x); } return Math.hypot(x - u.x, y - fy(u.y)) < d; }, dst(x, y) { if (typeof x === 'object') ({ x, y } = x); return Math.hypot(x - u.x, y - fy(u.y)); },
    angleTo(x, y) { if (typeof x === 'object') ({ x, y } = x); return Mathf.angle(u.x, fy(u.y), x, y); }, apply(s, d = 300) { const k = s && s.key; if (k && STATUS[k]) u.st[k] = Math.max(u.st[k] || 0, d); }, hasEffect(s) { return !!(s && u.st[s.key]); }, unapply(s) { if (s) delete u.st[s.key]; },
    impulse(x, y) { u.vx += (+x || 0) / (u.U.r * 4); u.vy -= (+y || 0) / (u.U.r * 4); }, impulseNet(x, y) { this.impulse(x, y); }, moveAt(v) { u.vx = v.x; u.vy = -v.y; }, lookAt(a, y) { if (y != null) a = Mathf.angle(u.x, fy(u.y), a, y); u.rot = -a * D2R; },
    set(x, y) { u.x = x; u.y = fy(y); }, trns(x, y) { u.x += x; u.y -= y; }, speed() { return u.U.sp; }, moving() { return Math.hypot(u.vx, u.vy) > .01; }, canShoot() { return true; }, inRange(o) { return true; },
    tileOn() { return tileF(Math.floor(u.x / TS), Math.floor(u.y / TS)); }, floorOn() { return this.tileOn().floor(); }, buildOn() { return this.tileOn().build; }, core() { return team(u.team).core(); }, closestCore() { return team(u.team).core(); },
    remove() { u.dead = 1; }, destroy() { this.kill(); }, add() {}, update() {}, draw() {}, write() {}, read() {}, hitbox() {}, collides() { return true; }, toString() { return 'Unit#' + u.t; }, hasWeapons() { return !!(u.U.w && u.U.w.length); }, isBuilding() { return !!u.building; }, mineTile() { return null; }, activelyBuilding() { return !!u.building; },
  };
  const p = new Proxy(st, {
    get(t, q) { if (typeof q === 'symbol') return undefined; const N = NAT.get(u); if (/^super\$/.test(q)) { const k = q.slice(6); return (N && N[k]) || meth[k] || (() => undefined); } const O = u.__jo; if (O && typeof O[q] === 'function') return O[q]; if (q in t) return t[q]; if (comp[q]) return comp[q](); if (meth[q]) return meth[q]; return undefined; },
    set(t, q, v) { if (q === 'health') { u.hp = +v; return true; } if (q === 'rotation') { u.rot = -v * D2R; return true; } if (q === 'x') { u.x = +v; return true; } if (q === 'y') { u.y = fy(+v); return true; } t[q] = v; return true; },
  });
  u.__jf = p;
  const T = u.U.js && u.U.js[INST]; if (T && T.__ctor) { const O = makeOver(T.__fields.constructor, T); if (O) { u.__jo = O.over; Object.assign(st, O.fields); } }
  return p;
}
const TILEF = new Map();
function tileF(x, yK) {
  if (!CW || !CW.inb(x, yK)) return null; const i = yK * CW.w + x;
  return { x, y: CW.h - 1 - yK, get build() { return buildF(CW.bt[i]); }, get team() { const b = CW.bt[i]; return () => team(b ? b.team : 0); },
    block() { const b = CW.bt[i]; return b ? blockF(b.t) : CW.wall[i] ? { name: 'stone-wall', solid: true, isAir: () => false } : { name: 'air', solid: false, isAir: () => true }; }, floor() { const f = CW.fl(i) || {}; return { name: 'floor', isLiquid: !!f.liq, isDeep: () => !!f.deep, liquidDrop: liqF(f.liq), itemDrop: itemF(f.ore), attributes: { get: () => 0 }, drownTime: f.deep ? 1 : 0, solid: false, speedMultiplier: 1 }; },
    overlay() { return { name: 'air', itemDrop: itemF(CW.mineItem ? CW.mineItem(i) : null) }; }, drop() { return itemF(CW.mineItem ? CW.mineItem(i) : null); }, solid() { return !!(CW.wall[i] || CW.bt[i]); }, passable() { return !this.solid(); },
    worldx() { return (x + .5) * TS; }, worldy() { return fy((yK + .5) * TS); }, drawx() { return this.worldx(); }, drawy() { return this.worldy(); }, centerX() { return x; }, centerY() { return CW.h - 1 - yK; },
    nearby(dx, dy) { if (typeof dx === 'number' && dy == null) { const d = dx; dx = [1, 0, -1, 0][d]; dy = [0, 1, 0, -1][d]; } return tileF(x + dx, yK - dy); }, dst(a, b) { return Math.hypot(a - this.worldx(), b - this.worldy()); }, within(a, b, d) { return this.dst(a, b) < d; },
    setNet() { miss('Tile.setNet()'); }, setBlock() { miss('Tile.setBlock()'); }, getLinkedTiles() { return new Seq([this]); }, pos() { return x + (CW.h - 1 - yK) * 65536; }, toString() { return `Tile(${x}, ${CW.h - 1 - yK})`; } };
}

/* ---------- effektek ---------- */
const FXL = [];   // szkriptbeli effektek: { e, x, y, rot, color, data, t }
class Effect {
  constructor(life, a, b) { this.lifetime = +life || 30; this.clip = 50; this.renderer = typeof a === 'function' || (a && a.get) ? a : b; this.layer = 0; this.followParent = false; }
  at(x, y, rot, color, data) { if (x && typeof x === 'object') { y = x.y; x = x.x; } if (FXL.length < 600) FXL.push({ e: this, x: +x || 0, y: +y || 0, rot: typeof rot === 'number' ? rot : 0, color: toCol(color) || (rot instanceof Col ? rot : new Col()), data: data ?? (typeof rot === 'object' && !(rot instanceof Col) ? rot : null), t: 0, id: Math.random() * 1e6 | 0, mod: CUR }); }
  create(x, y, rot, color, data) { this.at(x, y, rot, color, data); } wrap(c) { const e = this; return { at: (x, y, r) => e.at(x, y, r, c) }; } layer_() { return this; } rotWithParent() { return this; } followParent_() { return this; } startDelay() { return this; }
  static shake() {} static create(e, x, y, rot, c, d) { if (e && e.at) e.at(x, y, rot, c, d); }
}
const FX_KIND = n => /explo|blast|nuke|boom|dynamic/i.test(n) ? 'boom' : /smoke|steam|dust|puff|spark/i.test(n) ? 'puff' : /hit|despawn/i.test(n) ? 'hit' : /ring|wave|shock|pulse/i.test(n) ? 'ring' : 'flash';
const FxNs = new Proxy({}, { get(t, n) { if (typeof n !== 'string') return undefined; if (n === 'none') return { at() {}, create() {} }; return t[n] || (t[n] = { name: n, lifetime: 30, at(x, y, rot, c) { if (!CW || x == null) return; if (typeof x === 'object') { y = x.y; x = x.x; } const k = FX_KIND(n), col = '#' + ((toCol(c) || toCol(rot)) || Col.hex('ffd37f')).hex6(); CW.fx.push(k === 'boom' ? { k, x, y: fy(y), r: 8, life: 22, max: 22, c: col } : k === 'ring' ? { k, x, y: fy(y), r: 14, life: 20, max: 20, c: col } : { k, x, y: fy(y), life: 14, max: 14, c: col }); }, create(...a) { this.at(...a); } }); } });
function effectRec(f) {
  const L = f.e.lifetime, fin = f.t / L;
  return { x: f.x, y: f.y, rotation: f.rot, color: f.color, data: f.data, id: f.id, time: f.t, lifetime: L,
    fin(i) { return i ? i.apply(fin) : fin; }, fout(i) { return i ? i.apply(1 - fin) : 1 - fin; }, finpow() { return Interp.pow3Out.apply(fin); }, foutpow() { return Interp.pow3Out.apply(1 - fin); }, fslope() { return 1 - Math.abs(fin - .5) * 2; }, finpowdown() { return Interp.pow5In.apply(fin); },
    scaled(t, f2) { if (f.t <= t) call(f2, Object.assign(Object.create(this), { fin: () => f.t / t, fout: () => 1 - f.t / t, fslope: () => 1 - Math.abs(f.t / t - .5) * 2, finpow: () => Interp.pow3Out.apply(f.t / t), lifetime: t })); }, scaled_() {} };
}

/* ---------- események ---------- */
const EV = {};   // név → [[mod, f]]
const evName = c => { const s = typeof c === 'string' ? c : c && (c[STUB] || c.__ev) || ''; return String(s).split('.').pop(); };
const Events = {
  on(c, f) { const n = evName(c); (EV[n] = EV[n] || []).push([CUR, f]); }, run(c, f) { Events.on(c, f); }, fire(c, o) { if (o == null && typeof c === 'object') { o = c; c = c.__ev || ''; } emit(evName(c), o); },
  remove(c, f) { const n = evName(c); if (EV[n]) EV[n] = EV[n].filter(e => e[1] !== f); }, clear() {},
};
function emit(n, o) { const L = EV[n]; if (!L) return; for (const [m, f] of L) { const p = CUR; CUR = m; try { call(f, o || {}); } catch (e) { err(m, 'esemény ' + n, e); } CUR = p; } }
const EVENT_CLASSES = ['ClientLoadEvent', 'ContentInitEvent', 'WorldLoadEvent', 'ResetEvent', 'WaveEvent', 'UnitDestroyEvent', 'UnitCreateEvent', 'UnitSpawnEvent', 'UnitDamageEvent', 'BlockBuildEndEvent', 'BlockBuildBeginEvent', 'BlockDestroyEvent', 'BuildDamageEvent', 'TapEvent', 'PlayEvent', 'StateChangeEvent', 'GameOverEvent', 'SectorCaptureEvent', 'PlayerChatEvent', 'PlayerJoin', 'PlayerConnect', 'PlayerLeave', 'ConfigEvent', 'PickupEvent', 'PayloadDropEvent', 'TileChangeEvent', 'BuildSelectEvent', 'TurnEvent', 'UnitChangeEvent', 'CoreChangeEvent', 'ResearchEvent', 'UnlockEvent', 'ClientPreConnectEvent', 'FileTreeInitEvent', 'MusicRegisterEvent', 'ServerLoadEvent', 'AdminRequestEvent', 'SaveLoadEvent', 'SaveWriteEvent', 'UnitControlEvent', 'WithdrawEvent', 'DepositEvent', 'LaunchItemEvent', 'SectorLaunchEvent', 'SectorLoseEvent', 'SectorInvasionEvent', 'BuildRotateEvent', 'BuildTeamChangeEvent', 'GeneratorPressureExplodeEvent', 'CoreItemDeliverEvent', 'BlockInfoEvent', 'LoseEvent', 'WinEvent', 'MapMakeEvent', 'MapPublishEvent', 'BuildingBulletDestroyEvent', 'UnitBulletDestroyEvent', 'ResizeEvent', 'DisposeEvent'];
const evCls = n => { const c = function (o) { Object.assign(this, o || {}); this.__ev = n; }; c.__ev = n; c[STUB] = n; return c; };
const EventType = Object.fromEntries(EVENT_CLASSES.map(n => [n, evCls(n)]));
const Trigger = new Proxy({}, { get: (t, p) => typeof p === 'string' ? (t[p] || (t[p] = { __ev: 'Trigger.' + p, [STUB]: 'Trigger.' + p, toString: () => 'Trigger.' + p })) : undefined });
EventType.Trigger = Trigger;
const evK = c => { const n = evName(c); return n; };
Events.on = (c, f) => { const n = c && c.__ev ? c.__ev.replace(/^Trigger\./, 'T:') : evK(c); (EV[n] = EV[n] || []).push([CUR, f]); };
Events.run = Events.on;

/* ---------- az osztályok és a tartalom-definíciók ---------- */
const UNIT_CLS = /UnitType$/, ITEM_CLS = /^Item$/, LIQ_CLS = /^(Liquid|CellLiquid)$/, STAT_CLS = /^StatusEffect$/;
const CTOR = {   // a konstruktor argumentumai → mezők
  BasicBulletType: ['speed', 'damage', 'sprite'], ArtilleryBulletType: ['speed', 'damage', 'sprite'], MissileBulletType: ['speed', 'damage', 'sprite'], FlakBulletType: ['speed', 'damage'], BombBulletType: ['damage', 'radius', 'sprite'],
  LaserBulletType: ['damage'], ContinuousLaserBulletType: ['damage'], LightningBulletType: [], ShrapnelBulletType: [], LiquidBulletType: ['liquid'], BulletType: ['speed', 'damage'], SapBulletType: [], PointBulletType: [], RailBulletType: [], LaserBoltBulletType: ['speed', 'damage'], EmpBulletType: [],
  Weapon: ['name'], ItemStack: ['item', 'amount'], LiquidStack: ['liquid', 'amount'], UnitType: ['name'], Item: ['name', 'color'], Liquid: ['name', 'color'], StatusEffect: ['name'],
};
const INST = Symbol('inst');
function inst(cls, args, over) {
  const o = { __cls: cls, __over: over || {}, __fields: {}, [INST]: 1 };
  const names = CTOR[cls]; if (names) names.forEach((n, i) => { if (args && args[i] !== undefined) o.__fields[n] = args[i]; });
  else if (args && typeof args[0] === 'string') o.__fields.name = args[0];
  const p = new Proxy(o, {
    get(t, q) {
      if (q === INST) return t; if (typeof q === 'symbol') return undefined; if (Object.prototype.hasOwnProperty.call(t, q)) return t[q];
      if (typeof t.__over[q] === 'function') return t.__over[q]; if (Object.prototype.hasOwnProperty.call(t.__fields, q)) return t.__fields[q];
      if (/^super\$/.test(q)) return () => undefined;
      const F = t.__key ? (t.__kind === 'units' ? unitDefF(t.__key) : blockF(t.__key)) : null;
      if (q === 'consumes') return F ? F.consumes : consumesF(t);
      const M = INST_M[q]; if (M) return (...a) => M(t, ...a);
      const D = DEFAULT_F[q]; if (D) return (t.__fields[q] = D(t));
      if (q === 'toString') return () => String(t.__fields.name || t.__cls);
      if (F) return F[q];
      return undefined;
    },
    set(t, q, v) { if (q === 'constructor') { t.__ctor = 1; } t.__fields[q] = v; return true; },
    has(t, q) { return Object.prototype.hasOwnProperty.call(t.__fields, q) || Object.prototype.hasOwnProperty.call(t, q); },
  });
  o.__p = p; return p;
}
// a Mindustry-osztályok alapértelmezett gyűjtemény- és objektummezői (a szkriptek ezeket bővítik: weapons.add, immunities.add…)
const attrsF = () => { const m = new JMap(); return Object.assign(m, { set: (a, v) => m.put(String(a), v), get: a => m.get(String(a), 0), add: (a, v) => m.put(String(a), (m.get(String(a), 0) || 0) + v) }); };
const DEFAULT_F = { weapons: () => new Seq(), abilities: () => new Seq(), parts: () => new Seq(), requirements: () => new Seq(), research: () => new Seq(), targetFlags: () => new Seq(), consumers: () => new Seq(), upgrades: () => new Seq(), plans: () => new Seq(),
  ammoTypes: () => new JMap(), spawnBullets: () => new Seq(), fragBullets: () => 0, segments: () => 0, immunities: () => new JSet(), flags: () => new JSet(), attributes: attrsF, shoot: () => inst('ShootPattern', []), drawer: () => inst('DrawDefault', []), stats: () => stub('Stats', false), bars: () => stub('Bars', false), envRequired: () => 0, envEnabled: () => 1, envDisabled: () => 0 };
const consumesF = t => ({ remove() {}, power(v) { t.__fields.consumePower = v; }, powerCond(v) { t.__fields.consumePower = v; }, item(i, n = 1) { t.__fields.consumeItems = [{ item: i, amount: n }]; }, items(...s) { t.__fields.consumeItems = s.flat(); }, liquid(l, a) { t.__fields.consumeLiquid = { liquid: l, amount: a }; return { boost() { t.__fields.consumeLiquid.booster = true; }, optional() { return this; }, update() { return this; } }; }, powerBuffered(v) { t.__fields.consumePowerBuffered = v; }, add() { return { update() { return this; }, boost() { return this; }, optional() { return this; } }; }, get() { return null; }, has() { return false; }, coolant() {} });
const INST_M = {
  requirements(t, cat, a, b) { t.__fields.category = cat; t.__fields.requirements = b !== undefined ? b : a; if (b !== undefined) t.__fields.buildVisibility = a; },
  ammo(t, ...a) { t.__ammo = a; }, consumePower(t, v) { t.__fields.consumePower = v; return t.__p; }, consumePowerCond(t, v) { t.__fields.consumePower = v; return t.__p; }, consumePowerBuffered(t, v) { t.__fields.consumePowerBuffered = v; },
  consumeItem(t, i, n = 1) { t.__fields.consumeItems = [{ item: i, amount: n }]; return { boost() { return this; }, optional() { return this; }, update() { return this; } }; }, consumeItems(t, ...s) { t.__fields.consumeItems = s.flat(); return { boost() { return this; }, optional() { return this; } }; },
  consumeLiquid(t, l, a) { t.__fields.consumeLiquid = { liquid: l, amount: a }; return { boost() { t.__fields.consumeLiquid.booster = true; return this; }, optional() { return this; }, update() { return this; } }; }, consumeLiquids(t, ...s) { t.__fields.consumeLiquids = s.flat(); }, consumeCoolant(t) {}, consume(t) { return { boost() { return this; }, optional() { return this; } }; },
  outputsItems() { return false; }, setStats() {}, setBars() {}, init() {}, load() {}, add(t, x) { if (t.__cls && /Seq/.test(t.__cls)) { (t.__fields.items = t.__fields.items || []).push(x); } }, copy(t) { return inst(t.__cls, [], t.__over); },
  create(t, owner, team_, x, y, ang) { return spawnBullet(t, owner, team_, x, y, ang); }, createNet(t, team_, x, y, ang) { return spawnBullet(t, null, team_, x, y, ang); },
  addBar() {}, removeBar() {}, setEnginesMirror() {}, setEngines() {}, asFloor(t) { return t.__p; }, asBlock(t) { return t.__p; }, isAir() { return false; }, affinity() {}, opposite() {}, config() {}, configClear() {}, removeConsumer() {}, removeConsumers() {}, getClass(t) { return { getSimpleName: () => t.__cls, getName: () => t.__cls, toString: () => t.__cls }; }, researchRequirements(t) { const r = t.__fields.requirements; return r instanceof Seq ? r.items : Array.isArray(r) ? r : []; }, at(t, x, y) {}, range(t) { const f = t.__fields; return f.maxRange || (+(f.speed ?? 1) * +(f.lifetime ?? 40)); }, estimateDPS(t) { return +(t.__fields.damage || 0); }, isHidden() { return false; }, unlock() {}, unlocked() { return true; }, localizedName(t) { return t.__fields.localizedName || t.__fields.name; },
};
function extend(cls, ...rest) {
  const cn = cls && (cls[CLS] || cls[STUB]) ? String(cls[CLS] || cls[STUB]).split('.').pop() : (cls && cls.name) || 'Block';
  // extend(Osztály, [konstruktor-argumentumok…], {felülírások}); extend(Build, blokk, {…}): a blokk nem argumentum
  const last = rest[rest.length - 1], ov = last && typeof last === 'object' && !last[INST] && !(last instanceof Col) ? rest.pop() : {};
  const args = rest.filter(x => !(x && x[INST] && /Build$/.test(cn)));
  const o = inst(cn, args, ov), t = o[INST]; for (const k of Object.keys(ov)) if (typeof ov[k] !== 'function') t.__fields[k] = ov[k];
  if (typeof args[0] === 'string' && args.length === 1 && !/Build$|Weapon$|BulletType$|Effect$|Ability$|Part$/.test(cn)) { t.__name = args[0]; t.__mod = CUR; DEF.set(args[0], o); if (CUR) CUR.defs.set(args[0], o); }
  return o;
}
const cls = n => { const c = function (...a) { return inst(n, a); }; c[CLS] = n; return new Proxy(c, { get(t, p) { if (p === CLS || p === STUB) return n; if (typeof p !== 'string') return t[p]; if (p in t) return t[p]; if (/^[A-Z]/.test(p)) return (t[p] = cls(p)); if (p === 'class') return t; if (p === 'prototype' || p === 'name' || p === 'length') return t[p]; return (t[p] = stub(n + '.' + p)); }, construct(t, a) { if (n === 'Seq') return new Seq(a[0] instanceof Array ? a[0] : []); return inst(n, a); } }); };

/* ---------- lövedékek a szkriptből ---------- */
function spawnBullet(t, owner, tm, x, y, ang) {
  if (!CW) return null; const f = t.__fields, sp = +(f.speed ?? 3), d = +(f.damage ?? 9), life = +(f.lifetime ?? 40), a = -(+ang || 0) * D2R;
  const b = { x, y: fy(y), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, d, life, team: teamId(tm) || (owner && owner.team && teamId(owner.team)) || 1, c: '#' + ((toCol(f.backColor) || Col.hex('ffd37f')).hex6()), air: f.collidesAir !== false, ground: f.collidesGround !== false, pierce: !!f.pierce, spl: +(f.splashDamage || 0), splR: +(f.splashDamageRadius || 0) };
  if (Object.keys(t.__over).some(k => BUL_OVER.has(k))) { if (t.__bi == null) { t.__bi = BREG.length; BREG.push(t.__p); } b.jsb = t.__bi; }
  CW.bullets.push(b); return b.jsb != null ? bulletF(b) : { x, y, remove() { b.life = 0; }, time: 0, lifetime: life, damage: d };
}

/* ---------- a környezet (globális nevek) ---------- */
const Units = {
  nearby(...a) { if (!CW) return; let tm = null; if (a[0] && a[0].__team) tm = a.shift().id; const f = a.pop(); let [x, y, w, h] = a; if (x && typeof x === 'object') ({ x, y, width: w, height: h } = x);
    const circ = a.length === 3; for (const u of CW.units) { if (u.dead || (tm != null && u.team !== tm)) continue; const ux = u.x, uy = fy(u.y); if (circ ? Math.hypot(ux - x, uy - y) < w : ux >= x && ux <= x + w && uy >= y && uy <= y + h) call(f, unitF(u)); } },
  nearbyEnemies(tm, x, y, w, h, f) { if (!CW) return; const id = teamId(tm); if (x && typeof x === 'object') { f = y; ({ x, y, width: w, height: h } = x); } for (const u of CW.units) { if (u.dead || u.team === id || !u.team) continue; const uy = fy(u.y); if (u.x >= x && u.x <= x + w && uy >= y && uy <= y + h) call(f, unitF(u)); } },
  nearbyBuildings(x, y, r, f) { if (!CW) return; for (const b of CW.blds) { const c = CW.center(b); if (Math.hypot(c.x - x, fy(c.y) - y) < r + b.B.s * 4) call(f, buildF(b)); } },
  closestEnemy(tm, x, y, r, p) { if (!CW) return null; const id = teamId(tm); let best = null, bd = r; for (const u of CW.units) { if (u.dead || u.team === id || !u.team) continue; const d = Math.hypot(u.x - x, fy(u.y) - y); if (d < bd && (!p || call(p, unitF(u)))) { bd = d; best = u; } } return unitF(best); },
  closest(tm, x, y, r, p) { if (!CW) return null; const id = teamId(tm); let best = null, bd = r; for (const u of CW.units) { if (u.dead || u.team !== id) continue; const d = Math.hypot(u.x - x, fy(u.y) - y); if (d < bd && (!p || call(p, unitF(u)))) { bd = d; best = u; } } return unitF(best); },
  closestTarget(tm, x, y, r, p) { const u = Units.closestEnemy(tm, x, y, r, p); if (u) return u; if (!CW) return null; const id = teamId(tm); let best = null, bd = r; for (const b of CW.blds) { if (b.team === id || !b.team) continue; const c = CW.center(b), d = Math.hypot(c.x - x, fy(c.y) - y); if (d < bd) { bd = d; best = b; } } return buildF(best); },
  bestTarget(tm, x, y, r) { return Units.closestTarget(tm, x, y, r); }, findEnemyTile(tm, x, y, r) { return Units.closestTarget(tm, x, y, r); }, findAllyTile() { return null; },
  canCreate() { return true; }, canInteract() { return true; }, invalidateTarget(t, tm, x, y, r) { return !t || t.dead || (r != null && Math.hypot(t.x - x, t.y - y) > r); }, any(tm, x, y, w, h) { let k = false; Units.nearby(tm, x, y, w, h, () => { k = true; }); return k; },
};
const group = (src, F) => ({ each(a, b) { const p = b ? a : null, f = b || a; for (const o of [...src()]) { const v = F(o); if (!p || call(p, v)) call(f, v); } }, size() { return src().length; }, find(p) { for (const o of src()) { const v = F(o); if (call(p, v)) return v; } return null; }, copy(s) { const o = s || new Seq(); for (const x of src()) o.add(F(x)); return o; }, isEmpty() { return !src().length; }, count(p) { let n = 0; for (const o of src()) if (call(p, F(o))) n++; return n; }, intersect(x, y, w, h, f) { for (const o of src()) { const v = F(o); if (v.x >= x && v.x <= x + w && v.y >= y && v.y <= y + h) call(f, v); } }, getByID(id) { return this.find(v => v.id === id); }, index: () => 0, [Symbol.iterator]() { return src().map(F)[Symbol.iterator](); } });
const Groups = { unit: group(() => CW ? CW.units.filter(u => !u.dead) : [], unitF), build: group(() => CW ? CW.blds : [], buildF), player: group(() => CW && CW.player ? [CW.player] : [], u => playerF()), bullet: group(() => [], x => x), fire: group(() => [], x => x), puddle: group(() => [], x => x), all: group(() => CW ? CW.units : [], unitF), draw: group(() => [], x => x), weather: group(() => [], x => x), label: group(() => [], x => x), sync: group(() => [], x => x), powerGraph: group(() => [], x => x) };
const playerF = () => ({ unit: () => CW && CW.player ? unitF(CW.player) : null, team: () => team(1), get x() { return CW && CW.player ? CW.player.x : 0; }, get y() { return CW && CW.player ? fy(CW.player.y) : 0; }, dead: () => !CW || !CW.player || CW.player.dead, name: 'player', id: 1, admin: true, con: null, isLocal: () => true, sendMessage(t) { msg(t); }, core: () => team(1).core(), within: (x, y, d) => !!(CW && CW.player && Math.hypot(CW.player.x - x, fy(CW.player.y) - y) < d), toString: () => 'player' });
const Damage = {
  damage(tm, x, y, r, d, a, air = true, ground = true) { if (!CW) return; const id = typeof tm === 'object' && tm ? teamId(tm) : null; if (typeof tm === 'number' && typeof x === 'number' && typeof d !== 'number') { [x, y, r, d] = [tm, x, y, r]; } CW.splash(x, fy(y), r, d, id == null ? 2 : (id === 1 ? 2 : 1), air !== false, ground !== false, true); },
  dynamicExplosion(x, y, fl, ex, pw, r) { if (!CW) return; CW.boom(x, fy(y), Math.min(40, r || 16), '#ffb347'); CW.splashAll(x, fy(y), r || 16, (ex || 1) * 20 + (pw || 0) / 10); },
  collideLine(b, tm, eff, x, y, a, len) { if (CW) CW.lineDmg(x, fy(y), -a * D2R, len, (b && b.damage) || 20, teamId(tm)); }, tileDamage(tm, x, y, r, d) { Damage.damage(tm, x * TS, y * TS, r * TS, d); }, applySuppression() {}, status(tm, x, y, r, s, d) {},
};
const Lightning = { create(tm, c, d, x, y, a, len) { if (CW) CW.lightning(x, fy(y), -a * D2R, d, teamId(tm), Math.max(3, Math.min(20, len | 0))); } };
const msg = t => { if (CW && t != null) CW.msg(String(t).replace(/\[[^\]]*\]/g, '')); };
const BUNDLE = {};
const Core = {
  atlas: Atlas, assets: stub('Core.assets', false), audio: stub('Core.audio', false), scene: stub('Core.scene', false), input: stub('Core.input', false), camera: { position: new Vec2(), width: 0, height: 0, unproject: v => v, project: v => v }, files: stub('Core.files', false), keybinds: stub('Core.keybinds', false),
  bundle: { get(k, d) { return BUNDLE[k] ?? d ?? '???' + k + '???'; }, format(k, ...a) { return String(BUNDLE[k] ?? k).replace(/\{(\d+)\}/g, (_, i) => a[i] ?? ''); }, has(k) { return k in BUNDLE; }, getOrNull(k) { return BUNDLE[k] ?? null; }, getLocale() { return { toString: () => 'en', getLanguage: () => 'en' }; } },
  settings: (() => { let S = {}; try { S = JSON.parse(localStorage.getItem('kohovar_jsset') || '{}'); } catch (_) {} const sv = () => { try { localStorage.setItem('kohovar_jsset', JSON.stringify(S)); } catch (_) {} };
    return { getBool: (k, d = false) => k in S ? !!S[k] : d, getInt: (k, d = 0) => k in S ? S[k] | 0 : d, getFloat: (k, d = 0) => k in S ? +S[k] : d, getString: (k, d = '') => k in S ? String(S[k]) : d, get: (k, d) => k in S ? S[k] : d, has: k => k in S, put(k, v) { S[k] = v; sv(); }, remove(k) { delete S[k]; sv(); }, defaults(...a) { for (let i = 0; i + 1 < a.length; i += 2) if (!(a[i] in S)) S[a[i]] = a[i + 1]; }, getDataDirectory: () => stub('Fi', false), forceSave() {} }; })(),
  app: { post(f) { setTimeout(() => call(f), 0); }, getFps: () => 60, isDesktop: () => true, isMobile: () => false, isAndroid: () => false, isIOS: () => false, isWeb: () => true, isHeadless: () => false, openURI() { miss('Core.app.openURI()'); }, exit() {}, getVersion: () => 7 },
  graphics: { getWidth: () => innerWidth, getHeight: () => innerHeight, getDeltaTime: () => 1 / 60, getFramesPerSecond: () => 60, isPortrait: () => innerHeight > innerWidth, getFrameId: () => CW ? CW.tick : 0, clear() {} },
};
const Vars = {
  tilesize: TS, mobile: false, android: false, ios: false, headless: false, steam: false, clientLoaded: true, finalWorldBounds: 250, maxSchematicSize: 64, buildingRange: 220, itemSize: 5, iconSmall: 24, iconMed: 32, iconLarge: 40, logicItems: true, enableConsole: false,
  get state() { return stateF(); }, get world() { return worldF; }, get player() { return playerF(); },
  content: {
    getByName(t, n) { const k = String(t && (t[STUB] || t) || '').split('.').pop(); return content(k, n) || DEF.get(String(n).replace(/^[\w]+-/, '')) || null; }, getByID(t, i) { return null; }, block: n => content('block', n) || envF(n), item: n => content('item', n) || DEF.get(n) || ghost('item', n), liquid: n => content('liquid', n) || DEF.get(n) || ghost('liquid', n), unit: n => content('unit', n) || DEF.get(n) || ghost('unit', n), statusEffect: n => content('status', n),
    blocks: () => new Seq(Object.keys(BLOCKS).map(blockF)), items: () => new Seq(Object.keys(ITEMS).map(itemF)), liquids: () => new Seq(Object.keys(LIQUIDS).map(liqF)), units: () => new Seq(Object.keys(UNITS).map(unitDefF)), statusEffects: () => new Seq([]), planets: () => new Seq([]), sectors: () => new Seq([]),
    getBy(t) { const k = String(t && (t[STUB] || t) || '').split('.').pop(); return k === 'item' ? this.items() : k === 'liquid' ? this.liquids() : k === 'unit' ? this.units() : this.blocks(); }, each(f) { this.blocks().each(f); }, unitCount: 0,
  },
  mods: { mainLoader: () => stub('ClassLoader', false), getContentErrors: () => new Seq(), locateMod(n) { const m = JS.mods.find(x => x.id === n); return m ? m.api : null; }, getMod(n) { return this.locateMod(n); }, list() { return new Seq(JS.mods.map(m => m.api)); }, getScripts() { return { runConsole: () => '' }; }, eachEnabled(f) { JS.mods.forEach(m => call(f, m.api)); }, hasContentErrors: () => false, orderedMods: () => new Seq(JS.mods.map(m => m.api)) },
  ui: new Proxy({ showInfo: t => msg(t), showInfoToast: t => msg(t), showInfoFade: t => msg(t), showInfoText: (a, b) => msg(b || a), showErrorMessage: t => msg(t), showException: (t) => msg(t), announce: t => msg(t), showLabel: t => msg(t), showText: (a, b) => msg(b || a), showOkText: (a, b) => msg(b || a), hudfrag: { showToast: (a, b) => msg(typeof a === 'string' ? a : b), showUnlock() {}, showLand() {} } }, { get: (t, p) => p in t ? t[p] : typeof p === 'string' ? (t[p] = stub('Vars.ui.' + p)) : undefined }),
  tree: { loadSound: () => stub('Sound', false), loadMusic: () => stub('Music', false), get: () => stub('Fi', false), loadTexture: () => null }, netClient: stub('Vars.netClient', false), netServer: stub('Vars.netServer', false), renderer: stub('Vars.renderer', false), control: stub('Vars.control', false), schematics: stub('Vars.schematics', false), platform: stub('Vars.platform', false), maps: stub('Vars.maps', false), dataDirectory: stub('Fi', false), modDirectory: stub('Fi', false),
  net: { client: () => false, server: () => false, active: () => false, send() {}, handleClient() {}, handleServer() {} }, logic: { skipWave() { if (CW) CW.nextWave(); }, runWave() { if (CW) CW.nextWave(); }, gameOver() {}, play() {}, reset() {}, isWaitingWave: () => false },
  indexer: { eachBlock(tm, x, y, r, p, f) { if (!CW) return false; const id = teamId(tm); let any = false; for (const b of CW.blds) { if (tm != null && b.team !== id) continue; const c = CW.center(b); if (Math.hypot(c.x - x, fy(c.y) - y) < r) { const v = buildF(b); if (!p || call(p, v)) { any = true; call(f, v); } } } return any; }, findEnemyTile(tm, x, y, r, p) { return Units.closestTarget(tm, x, y, r); }, findTile(tm, x, y, r, p) { return null; }, getFlagged: () => new Seq([]), getEnemy: () => new Seq([]), isBlockPresent: () => false },
  spawner: { getSpawns: () => new Seq(CW ? CW.spawns.map(s => tileF(s.x, s.y)) : []), getFirstSpawn: () => CW && CW.spawns[0] ? tileF(CW.spawns[0].x, CW.spawns[0].y) : null, countSpawns: () => CW ? CW.spawns.length : 0, spawnEnemies() {}, isSpawning: () => false },
};
const worldF = { width: () => CW ? CW.w : 0, height: () => CW ? CW.h : 0, unitWidth: () => CW ? CW.w * TS : 0, unitHeight: () => CW ? CW.h * TS : 0, tile: (x, y) => CW ? tileF(x | 0, CW.h - 1 - (y | 0)) : null, tileWorld: (x, y) => CW ? tileF(Math.floor(x / TS), Math.floor(fy(y) / TS)) : null, build: (x, y) => { const t = worldF.tile(x, y); return t ? t.build : null; }, buildWorld: (x, y) => { const t = worldF.tileWorld(x, y); return t ? t.build : null; }, isAccessible: () => true, get tiles() { return { each: f => { if (CW) for (let y = 0; y < CW.h; y++) for (let x = 0; x < CW.w; x++) call(f, tileF(x, y)); }, eachTile: f => worldF.tiles.each(f), width: CW ? CW.w : 0, height: CW ? CW.h : 0, get: (x, y) => worldF.tile(x, y) }; }, toTile: v => Math.floor(v / TS), conv: v => v / TS };
const stateF = () => ({ get wave() { return CW ? CW.wave : 0; }, set wave(v) { if (CW) CW.wave = v | 0; }, get wavetime() { return CW ? CW.wtimer : 0; }, set wavetime(v) { if (CW) CW.wtimer = v; }, get enemies() { return CW ? CW.nEn || 0 : 0; }, get tick() { return CW ? CW.tick : 0; },
  rules: CW ? Object.assign(Object.create(CW.rules || {}), { defaultTeam: team(1), waveTeam: team(2), get infiniteResources() { return !!(CW.rules && CW.rules.infiniteResources); }, get attackMode() { return !!(CW.rules && CW.rules.attackMode); }, get waves() { return !!(CW.rules && CW.rules.waves); }, get pvp() { return false; }, get editor() { return false; }, get sector() { return null; }, planet: null, teams: { get: () => ({ cheat: false, infiniteResources: false }) }, unitCap: 0 }) : { infiniteResources: false, attackMode: false, waves: true, pvp: false, editor: false, sector: null },
  isGame: () => !!CW, isMenu: () => !CW, isPlaying: () => !!CW, isPaused: () => false, isEditor: () => false, isCampaign: () => !!(CW && !CW.sec.free), hasSector: () => !!(CW && !CW.sec.free), getSector: () => null, getPlanet: () => null, gameOver: false, set: () => {}, is: () => false, stats: { enemyUnitsDestroyed: CW ? CW.stats.kills : 0 }, teams: { get: t => ({ core: () => team(teamId(t)).core(), cores: () => team(teamId(t)).cores(), units: new Seq([]), unitCount: () => 0, active: () => true }), cores: t => team(teamId(t)).cores(), closestCore: (x, y, t) => team(teamId(t)).core(), active: new Seq([team(1), team(2)]), present: new Seq([team(1), team(2)]), isActive: () => true, canInteract: () => true, playerCores: () => team(1).cores() } });
const Log = { info: (...a) => console.info('[mod]', ...a.map(String)), warn: (...a) => console.warn('[mod]', ...a.map(String)), err: (...a) => console.warn('[mod hiba]', ...a.map(String)), debug() {}, infoTag: (t, ...a) => console.info('[' + t + ']', ...a), errTag: (t, ...a) => console.warn('[' + t + ']', ...a) };
const Category = new Proxy({}, { get: (t, p) => typeof p === 'string' ? p : undefined });
const BuildVisibility = new Proxy({}, { get: (t, p) => typeof p === 'string' ? p : undefined });
const ContentType = new Proxy({}, { get: (t, p) => typeof p === 'string' ? p : undefined });
const BASE = {
  Vars, Core, Time, Timer, Interval, Mathf, Angles, Vec2, Seq, Interp, Draw, Fill, Lines, Drawf, Events, EventType, Trigger, Units, Groups, Damage, Lightning, Log, Effect, Fx: FxNs,
  Color: ColorNs, Pal: PalNs, Team: TeamNs, Items: ns('item'), Liquids: ns('liquid'), Blocks: ns('block'), UnitTypes: ns('unit'), StatusEffects: ns('status'), Bullets: new Proxy({}, { get: (t, p) => typeof p === 'string' ? inst('BasicBulletType', []) : undefined }),
  Category, BuildVisibility, ContentType, ConsumeType: { item: 'item', liquid: 'liquid', power: 'power', itemFilter: 'item', liquidFilter: 'liquid' },
  ItemStack: Object.assign(function (i, n) { return { item: i, amount: n }; }, { with(...a) { const out = []; for (let i = 0; i + 1 < a.length; i += 2) out.push({ item: a[i], amount: a[i + 1] }); return out; }, list(...a) { return new Seq(BASE.ItemStack.with(...a)); }, mult(s, m) { return s.map(x => ({ item: x.item, amount: Math.round(x.amount * m) })); } }),
  LiquidStack: Object.assign(function (l, n) { return { liquid: l, amount: n }; }, { with(...a) { const out = []; for (let i = 0; i + 1 < a.length; i += 2) out.push({ liquid: a[i], amount: a[i + 1] }); return out; } }),
  Tmp: { v1: new Vec2(), v2: new Vec2(), v3: new Vec2(), v4: new Vec2(), v5: new Vec2(), v6: new Vec2(), v31: new Vec2(), c1: new Col(), c2: new Col(), c3: new Col(), c4: new Col(), r1: {}, r2: {}, r3: {} },
  Rand: class { constructor(s) { this.s = s | 0; } random(a, b) { const r = seeded(this.s++); return b == null ? r * (a ?? 1) : a + r * (b - a); } range(a) { return (seeded(this.s++) * 2 - 1) * a; } chance(p) { return seeded(this.s++) < p; } nextFloat() { return seeded(this.s++); } nextInt(n) { return Math.floor(seeded(this.s++) * n); } setSeed(s) { this.s = s | 0; } },
  Strings: { fixed: (v, d) => (+v).toFixed(d), autoFixed: (v, d) => String(+(+v).toFixed(d)), format: (s, ...a) => String(s).replace(/@/g, () => a.shift() ?? ''), capitalize: s => String(s).charAt(0).toUpperCase() + String(s).slice(1), stripColors: s => String(s).replace(/\[[^\]]*\]/g, ''), kebabToCamel: s => String(s).replace(/-(\w)/g, (_, c) => c.toUpperCase()), camelToKebab: kebab },
  Structs: {}, EntityMapping: { nameMap: new JMap(), idMap: Array.from({ length: 256 }, (_, i) => i < 48 ? 1 : null), register: () => 0, map: () => 0, customIdMap: new JMap() }, Sounds: stub('Sounds', false), Call: stub('Call'), Styles: stub('Styles', false), Icon: stub('Icon', false), Tex: stub('Tex', false), Fonts: stub('Fonts', false), Layer: new Proxy({}, { get: () => 0 }), Blending: { additive: { [STUB]: 'Blending.additive' }, normal: { [STUB]: 'Blending.normal' }, disabled: {} }, Align: stub('Align', false),
  Weapon: null, Stat: stub('Stat', false), StatUnit: stub('StatUnit', false), Attribute: new Proxy({ add: n => ({ name: n, toString: () => n }), get: n => ({ name: n, toString: () => n }) }, { get: (t, p) => typeof p === 'string' ? (t[p] || (t[p] = { name: p, toString: () => p })) : undefined }), Env: new Proxy({}, { get: () => 1 }),
  Planets: new Proxy({}, { get: (t, p) => typeof p === 'string' ? { name: p, toString: () => p } : undefined }), SectorPresets: new Proxy({}, { get: (t, p) => typeof p === 'string' ? { name: p } : undefined }),
  TechTree: stub('TechTree', false), EnumSet: { of: (...a) => new Set(a), noneOf: () => new Set(), allOf: () => new Set(), copyOf: a => new Set(a) },
  ObjectMap: null, OrderedMap: null, ObjectSet: null, OrderedSet: null, IntMap: null, ObjectFloatMap: null, ObjectIntMap: null, IntSeq: null, FloatSeq: null, SaveFileReader: { fallback: { put() {}, putAll() {} } },
  print: (...a) => console.info('[mod]', ...a), extend, extendContent: extend, JavaAdapter: function (c, o) { return extend(c, o); }, importPackage() {}, importClass() {},
  cons: fn, cons2: fn, prov: fn, func: fn, func2: fn, floatf: fn, floatp: fn, boolf: fn, boolp: fn, intf: fn, run: fn, boolf2: fn, Runnable: fn, Prov: fn, Cons: fn,
  newEffect: (l, r) => new Effect(l, r), newFloats: n => new Array(n).fill(0), newInts: n => new Array(n).fill(0), newObjects: n => new Array(n).fill(null),
  readString: () => '', readBytes: () => new Uint8Array(0), readFile: () => '', loadMusic: () => stub('Music', false), loadSound: () => stub('Sound', false),
};
BASE.Packages = (() => { const P = path => new Proxy(function () {}, { get(t, p) { if (typeof p !== 'string') return undefined; if (/^[A-Z]/.test(p)) return BASE[p] !== undefined && BASE[p] !== null ? BASE[p] : cls(p); return P(path + '.' + p); } }); return P('Packages'); })();
BASE.java = BASE.Packages.java; BASE.arc = BASE.Packages.arc; BASE.mindustry = BASE.Packages.mindustry;
delete BASE.Weapon;
for (const k of ['ObjectMap', 'OrderedMap', 'IntMap', 'ObjectFloatMap', 'ObjectIntMap']) BASE[k] = JMap; for (const k of ['ObjectSet', 'OrderedSet', 'IntSet']) BASE[k] = JSet; BASE.IntSeq = BASE.FloatSeq = Seq;


/* ---------- Rhino-szintaxis: new Osztály(){ ... } (névtelen Java-osztály) → __anon(Osztály, { ... }) ---------- */
function rhino(src) {
  const re = /new\s+([\w.]+)\s*\(([^()]*)\)\s*\{/g; let m, out = '', last = 0;
  while ((m = re.exec(src))) {
    let d = 1, i = m.index + m[0].length;
    for (; i < src.length && d; i++) { const c = src[i]; if (c === '{') d++; else if (c === '}') d--; else if (c === '"' || c === "'" || c === '`') { const q = c; for (i++; i < src.length && src[i] !== q; i++) if (src[i] === '\\') i++; } else if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; } }
    out += src.slice(last, m.index) + `__anon(${m[1]}, [${m[2]}], {` + rhino(src.slice(m.index + m[0].length, i - 1)) + '})';
    last = i; re.lastIndex = i;
  }
  return (out + src.slice(last)).replace(/\bfor\s+each\s*\(\s*(var|let|const)?\s*(\w+)\s+in\s+/g, 'for ($1 $2 of ');
}
BASE.__anon = (c, a, o) => { const n = c && (c[CLS] || c[STUB]) ? String(c[CLS] || c[STUB]).split('.').pop() : 'Object'; const x = inst(n, a, o); for (const k in o) if (typeof o[k] !== 'function') x[INST].__fields[k] = o[k]; return x; };

/* ---------- hibák és hiányok ---------- */
function err(m, where, e) { if (!m) return; if (e && e[INST]) e = { message: `${e[INST].__cls}: ${e[INST].__fields.name ?? ''}` }; const s = `${where}: ${String(e && e.message || e).slice(0, 140)}`; if (m.err.length < 30 && !m.err.includes(s)) m.err.push(s); const k = String(e && e.message || '').match(/([\w$.]+) is not a function|Cannot read properties of (?:undefined|null) \(reading '([\w$]+)'\)/); if (k) miss(k[1] ? k[1] + '()' : '.' + k[2], m); }

/* ---------- egy mod szkriptjeinek futtatása (a modbetöltőből, a tartalom feldolgozása előtt) ---------- */
export function runScripts(files, h) {
  const scripts = new Map(); for (const [p, d] of files) { const m = p.match(/^scripts\/(.+)\.js$/); if (m) scripts.set(m[1], d); }
  if (!scripts.size) return null;
  if (!Object.keys(RB).length) buildIndex();
  const dec = new TextDecoder(), M = { id: h.id, name: h.name, miss: new Set(), err: [], defs: new Map(), files: scripts, api: null };
  M.api = { name: h.id, meta: Object.assign({ name: h.id, displayName: h.name, author: '', description: '', version: '' }, h.meta || {}), root: stub('Fi', false), file: stub('Fi', false), enabled: () => true, isJava: () => false, getRepo: () => null, loader: null, main: null, iconTexture: null };
  JS.mods.push(M); SPRITE_SRC.push([h.id, h.sprites]); Object.assign(BUNDLE, h.bundle || {});
  const loc = new Set(), OWN = Object.create(null); OWN.modName = h.id; OWN.scriptName = 'main'; OWN.global = GLOBAL; OWN.__mod = M.api;
  const own = new Proxy(OWN, {
    has(t, p) { if (typeof p !== 'string' || loc.has(p)) return false; if (JSB.has(p)) return false; return p in t || p in BASE || /^[A-Z]/.test(p); },
    get(t, p) { if (p === Symbol.unscopables) return undefined; if (p in t) return t[p]; if (p in BASE) return BASE[p]; if (typeof p === 'string' && /^[A-Z]/.test(p)) { if (EventType[p]) return EventType[p]; return (t[p] = cls(p)); } return undefined; },
    set(t, p, v) { t[p] = v; return true; },
  });
  const cache = {};
  const req = id => {
    let rel = String(id).replace(/^\.\//, '').replace(/\.js$/, ''); for (const p of [h.id + '/', h.id.replace(/-/g, '_') + '/']) if (rel.startsWith(p)) rel = rel.slice(p.length);
    let src = scripts.get(rel), from = M;
    if (!src) { const [mid, ...rest] = String(id).split('/'); const o = JS.mods.find(x => x.id === mid || x.id.replace(/-/g, '_') === mid); if (o && o.files.get(rest.join('/').replace(/\.js$/, ''))) { from = o; src = o.files.get(rest.join('/').replace(/\.js$/, '')); rel = mid + ':' + rest.join('/'); } }
    if (cache[rel]) return cache[rel].exports; const mo = cache[rel] = { exports: {} }; if (!src) { miss('require: ' + id); return mo.exports; }
    let code = dec.decode(src); code = rhino(code);
    const bare = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');
    for (const m of bare.matchAll(/(?:^|[;{}\s])(?:function\s*\*?\s+([A-Za-z_$][\w$]*)|var\s+([A-Za-z_$][\w$]*))/g)) loc.add(m[1] || m[2]);
    const p = CUR; CUR = from;
    let fnc = null, e0 = null; const raw = dec.decode(src), vr = s => s.replace(/\b(let|const)(\s+[A-Za-z_$])/g, 'var$2');
    for (const v of [code, vr(code), raw, vr(raw)]) { try { fnc = new Function('__G', 'module', 'exports', 'require', 'with (__G) {\n' + v + '\n}'); break; } catch (e) { e0 = e0 || e; if (!(e instanceof SyntaxError)) break; } }
    if (!fnc && e0) err(from, 'scripts/' + rel + '.js', e0);   // a Rhino engedékenyebb: újradeklarált let/const → var
    if (fnc) try { fnc.call(undefined, own, mo, mo.exports, req); } catch (e) { err(from, 'scripts/' + rel + '.js', e); }
    CUR = p; return mo.exports;
  };
  CUR = M;
  try { if (scripts.has('main')) req('main'); else for (const k of scripts.keys()) req(k); } catch (e) { err(M, 'main', e); }
  // a tartalom init()-je (itt állítják be a lőszert és a fegyvereket), a blokkok load()-ja
  for (const [n, d] of M.defs) { const t = d[INST]; if (typeof t.__over.init === 'function') { try { t.__over.init.call(d); } catch (e) { err(M, n + '.init', e); } } }
  CUR = null; return M;
}

/* ---------- a szkriptbeli definíciókból JSON (a modbetöltő a saját átalakítójával dolgozza fel) ---------- */
const jsonV = (v, d = 0) => {
  if (v == null || d > 6) return v; if (typeof v === 'number' || typeof v === 'boolean') return v; if (typeof v === 'string') return v;
  if (v instanceof JSet) return [...v.s].map(x => jsonV(x, d + 1)); if (v instanceof Col) return v.toString(); if (v instanceof JMap) { const o = {}; for (const [k, x] of v.m) { const kk = jsonV(k, d + 1); if (typeof kk === 'string') o[kk] = jsonV(x, d + 1); } return o; } if (v instanceof Seq) return v.items.map(x => jsonV(x, d + 1)); if (Array.isArray(v)) return v.map(x => jsonV(x, d + 1));
  if (v.__kind === 'item' || v.__kind === 'liquid' || v.__kind === 'status') return v.name; if (v.__kind === 'block' || v.__kind === 'unit') return v.name;
  if (v[STUB]) return undefined; if (typeof v === 'function') return undefined;
  if (v[INST]) { const t = v[INST]; if (t.__name) return t.__name; const o = { type: t.__cls }; if (/Bullet/.test(t.__cls) && Object.keys(t.__over).some(k => BUL_OVER.has(k))) { if (t.__bi == null) { t.__bi = BREG.length; BREG.push(v); } o.__jsb = t.__bi; } for (const k in t.__fields) { const x = jsonV(t.__fields[k], d + 1); if (x !== undefined) o[k] = x; } return o; }
  if (v.item !== undefined && v.amount !== undefined) return { item: jsonV(v.item), amount: v.amount }; if (v.liquid !== undefined) return { liquid: jsonV(v.liquid), amount: v.amount };
  if (v instanceof Vec2) return undefined; const o = {}; for (const k in v) { const x = jsonV(v[k], d + 1); if (x !== undefined) o[k] = x; } return o;
};
const SKIP = /^(constructor|buildType|regions|region|consumes|__.*)$/;
export function defJson(d, id) {
  const t = d[INST], o = {}; for (const k in t.__fields) { if (SKIP.test(k)) continue; const v = jsonV(t.__fields[k]); if (v != null && !(typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length)) o[k] = v; }
  const strip = s => typeof s === 'string' && s.startsWith(id + '-') ? s.slice(id.length + 1) : s;
  if (Array.isArray(o.requirements)) o.requirements = o.requirements.map(r => r && r.item ? `${strip(r.item)}/${r.amount}` : r);
  if (t.__ammo) { const am = {}; for (let i = 0; i + 1 < t.__ammo.length; i += 2) { const k = jsonV(t.__ammo[i]), b = jsonV(t.__ammo[i + 1]); if (typeof k === 'string' && b) am[strip(k)] = b; } if (Object.keys(am).length) o.ammoTypes = am; }
  if (o.shootType && !o.bullet) o.bullet = o.shootType;
  return o;
}
// a modbetöltő hívja: kategória szerint a szkript-definíciók (blocks / units / items / liquids)
export function defKind(d) { const c = d[INST].__cls; return /Mech$/.test(c) ? null : UNIT_CLS.test(c) ? 'units' : ITEM_CLS.test(c) ? 'items' : LIQ_CLS.test(c) ? 'liquids' : STAT_CLS.test(c) ? 'status' : /BulletType|Weapon|Effect|Ability|AI$|Planet|Sector|Weather/.test(c) ? null : 'blocks'; }
export const defClass = d => d[INST].__cls;
// a definíció hozzákötése a kész blokkhoz / egységhez (a felülírt metódusok innen futnak)
const B_OVER = new Set(['draw', 'drawSelect', 'updateTile', 'update', 'onDestroyed', 'placed', 'playerPlaced', 'acceptItem', 'acceptLiquid', 'handleItem', 'drawLight', 'drawConfigure', 'buildConfiguration', 'configured', 'tapped', 'onRemoved', 'remove', 'read', 'write', 'readBase', 'writeBase', 'damage', 'collide', 'collision', 'onProximityUpdate', 'shouldConsume', 'canPickup']);
const BLOCK_OVER = new Set(['load', 'init', 'canPlaceOn', 'setStats', 'setBars', 'icons', 'createIcons', 'drawPlace', 'drawRequestRegion', 'drawPlanRegion', 'isHidden', 'localizedName', 'canReplace', 'canBreak', 'outputsItems', 'drawBase', 'getStats', 'loadIcon']);
const U_OVER = new Set(['draw', 'update', 'load', 'init', 'drawBody', 'drawWeapons', 'drawShadow', 'drawOutline', 'setStats', 'createIcons', 'drawEngines', 'killed', 'landed', 'drawSoftShadow', 'drawItems', 'drawLight', 'drawCell', 'drawMech', 'drawLegs', 'drawPayload', 'applyColor', 'loadIcon']);
const UNSUP = new Set(['drawBody', 'drawWeapons', 'drawEngines', 'drawMech', 'drawLegs', 'drawPayload', 'buildConfiguration', 'drawConfigure', 'drawPlace', 'drawPlanRegion', 'drawRequestRegion', 'icons', 'collide', 'collision', 'killed', 'landed', 'canPickup', 'drawCell', 'drawItems', 'applyColor', 'drawOutline']);
export function attachDef(M, d, kind, k) {
  const t = d[INST]; if (!k) return; const T = kind === 'units' ? UNITS[k] : BLOCKS[k]; if (!T) return;
  T.js = d; delete T.__jf; t.__key = k; t.__kind = kind; t.__mod = M; t.__fields.name = kind === 'units' ? k : SN[k] || k;
  if (kind === 'blocks') { t.__build = t.__fields.buildType || null; for (const q of Object.keys(t.__over)) { if (typeof t.__over[q] !== 'function') continue; if (!BLOCK_OVER.has(q) && !B_OVER.has(q)) miss(`${t.__cls}.${q}`, M); else if (UNSUP.has(q)) miss(`${t.__cls}.${q}`, M); } if (t.__build) { const O = makeOver(t.__build, t); if (O) for (const q of Object.keys(O.over)) if (!B_OVER.has(q) || UNSUP.has(q)) miss(`${t.__cls}Build.${q}`, M); } }
  if (kind === 'units') { for (const q of Object.keys(t.__over)) if (typeof t.__over[q] === 'function' && (!U_OVER.has(q) || UNSUP.has(q))) miss(`${t.__cls}.${q}`, M); if (t.__ctor) { const O = makeOver(t.__fields.constructor, t); if (O) for (const q of Object.keys(O.over)) if (!/^(update|draw|classId|write|read|add|remove)$/.test(q)) miss(`${O.cls || 'Unit'}.${q}`, M); } }
  if (typeof t.__over.load === 'function') { const p = CUR; CUR = M; try { t.__over.load.call(kind === 'units' ? unitDefF(k) : blockF(k)); } catch (e) { err(M, k + '.load', e); } CUR = p; }
  if (T.part === undefined && (t.__build || Object.keys(t.__over).length)) T.scripted = 1;
}
// a mod szkript-összefoglalója a modlistához
export function scriptReport(M) {
  if (!M) return []; const out = [];
  if (M.err.length) out.push(`szkripthibák: ${M.err.slice(0, 4).join(' · ')}${M.err.length > 4 ? ` (+${M.err.length - 4})` : ''}`);
  const ms = [...M.miss].filter(x => x !== 'felület (UI)'); if (ms.length) out.push(`a JS API-ból hiányzik: ${ms.slice(0, 10).join(', ')}${ms.length > 10 ? ` (+${ms.length - 10})` : ''}`);
  return out;
}

/* ---------- lövedékek: a szkriptbeli lövedéktípus felülírt metódusai ---------- */
const BREG = [];   // lövedéktípus-példányok (a lövedék jsb mezője ide mutat)
const BUL_OVER = new Set(['draw', 'update', 'init', 'hit', 'hitEntity', 'hitTile', 'despawned', 'removed', 'drawTrail', 'updateHoming', 'updateTrail']);
function bulletF(b) {
  if (b.__jf) return b.__jf; const T = BREG[b.jsb], st = {};
  const comp = { x: () => b.x, y: () => fy(b.y), rotation: () => ((-Math.atan2(b.vy, b.vx) * R2D) % 360 + 360) % 360, team: () => team(b.team), damage: () => b.d, type: () => T, owner: () => null, time: () => b.__t || 0, lifetime: () => b.__l || 1, vel: () => new Vec2(b.vx, -b.vy), id: () => b.__id || (b.__id = Math.random() * 1e9 | 0), hitSize: () => 4, fdata: () => b.fdata || 0, timer: () => b.__iv || (b.__iv = new Interval(4)), aimX: () => b.x, aimY: () => fy(b.y), originX: () => b.sx ?? b.x, originY: () => fy(b.sy ?? b.y) };
  const meth = { fin() { return Math.min(1, (b.__t || 0) / (b.__l || 1)); }, fout() { return 1 - this.fin(); }, fslope() { return 1 - Math.abs(this.fin() - .5) * 2; }, remove() { b.life = 0; b.__rm = 1; }, absorb() { b.life = 0; b.__rm = 1; }, within(x, y, d) { if (typeof x === 'object') { d = y; ({ x, y } = x); } return Math.hypot(x - b.x, y - fy(b.y)) < d; }, dst(x, y) { if (typeof x === 'object') ({ x, y } = x); return Math.hypot(x - b.x, y - fy(b.y)); }, angleTo(x, y) { if (typeof x === 'object') ({ x, y } = x); return Mathf.angle(b.x, fy(b.y), x, y); }, set(x, y) { b.x = x; b.y = fy(y); }, isAdded() { return b.life > 0; }, hit() { return !!b.__hit; }, collides() { return true; }, toString() { return 'Bullet'; } };
  const p = new Proxy(st, { get(t, q) { if (typeof q === 'symbol') return undefined; if (q in t) return t[q]; if (comp[q]) return comp[q](); if (meth[q]) return meth[q]; return undefined; },
    set(t, q, v) { if (q === 'damage') { b.d = +v; return true; } if (q === 'rotation') { const s = Math.hypot(b.vx, b.vy), a = -v * D2R; b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s; return true; } if (q === 'time') { b.__t = +v; return true; } if (q === 'lifetime') { b.__l = +v; return true; } if (q === 'x') { b.x = +v; return true; } if (q === 'y') { b.y = fy(+v); return true; } if (q === 'fdata') { b.fdata = v; return true; } t[q] = v; return true; } });
  b.__jf = p; return p;
}
const bOver = b => { const T = BREG[b.jsb]; return T && T[INST]; };
// a lövedéktípus mint „this”: a super$draw az alap rajz (pont + csóva), a super$hit a találati effekt, a többi super$ üres
function bSelf(t, b) {
  const T = BREG[b.jsb];
  return new Proxy(T, { get(o, q) {
    if (q === 'super$draw') return () => { if (!G2) return; const a = Math.atan2(b.vy, b.vx), big = b.sz || 1; G2.save(); G2.translate(b.x, b.y); G2.rotate(a); G2.fillStyle = b.c || '#ffd37f'; G2.beginPath(); G2.ellipse(0, 0, 3 * big, 1.1 * big, 0, 0, 7); G2.fill(); G2.fillStyle = b.c2 || '#fff'; G2.beginPath(); G2.ellipse(.4, 0, 1.8 * big, .55 * big, 0, 0, 7); G2.fill(); G2.restore(); };
    if (q === 'super$hit') return () => { if (CW) CW.fx.push({ k: 'hit', x: b.x, y: b.y, life: 12, max: 12, c: b.c || '#ffd37f' }); };
    if (typeof q === 'string' && /^super\$/.test(q)) return () => undefined;
    if (q === 'damage') return b.d; if (q === 'speed') return Math.hypot(b.vx, b.vy); if (q === 'lifetime') return b.__l || b.life;
    return o[q];
  } });
}

/* ---------- futásidő: a motor hívja ---------- */
// egy felülírt metódus hívása; ha egy objektum (definíció) 30-nál többször hibázik, a felülírása kikapcsol, és az eredeti fut
const BAD = new WeakMap();
const bad = o => (BAD.get(o) || 0) > 30;
function runHook(m, what, f, self, args, o) {
  const p = CUR; CUR = m;
  try { return f.apply(self, args); } catch (e) { err(m, what, e); if (o) BAD.set(o, (BAD.get(o) || 0) + 1); return ERR; } finally { CUR = p; }
}
const ERR = Symbol('err');
const bName = b => (SN[b.t] || b.t);
FW.js = {
  world(W) { CW = W; TIMERS = []; FXL.length = 0; emit('WorldLoadEvent', {}); },
  // épület frissítése: a szkript updateTile()-ja; a super$updateTile() az eredeti frissítés
  upd(W, b, nat) {
    CW = W; buildF(b); const O = b.__jo, f = O && (O.updateTile || O.update), d = b.B.js[INST];
    if (!f || bad(d)) return nat();
    let called = false; NAT.set(b, Object.assign(NAT.get(b) || {}, { updateTile: () => { if (!called) { called = true; nat(); } }, update: () => { if (!called) { called = true; nat(); } } }));
    const r = runHook(d.__mod, bName(b) + '.updateTile', f, b.__jf, [], d); if (r === ERR && !called) nat();
  },
  draw(g, W, b, nat) {
    CW = W; G2 = g; buildF(b); const O = b.__jo, f = O && O.draw, d = b.B.js[INST];
    if (!f || bad(d)) return nat();
    NAT.set(b, Object.assign(NAT.get(b) || {}, { draw: () => { const s = g.globalCompositeOperation, a = g.globalAlpha; nat(); g.globalCompositeOperation = s; g.globalAlpha = a; } }));
    Draw.reset(); const r = runHook(d.__mod, bName(b) + '.draw', f, b.__jf, [], d); Draw.reset(); g.globalAlpha = 1;
    if (r === ERR) nat();
  },
  drawSel(g, W, b) { const O = b.__jo, d = b.B.js && b.B.js[INST]; if (!O || !O.drawSelect || !d || bad(d)) return; CW = W; G2 = g; Draw.reset(); runHook(d.__mod, 'drawSelect', O.drawSelect, b.__jf, [], d); Draw.reset(); },
  // egység rajza: a típus draw(unit) felülírása (super$draw = az eredeti rajz) és az egyedi egység draw()-ja
  drawUnit(g, W, u, nat) {
    CW = W; G2 = g; const d = u.U.js, t = d[INST], fu = unitF(u);
    const typeDraw = typeof t.__over.draw === 'function' && !bad(t) ? t.__over.draw : null, own = u.__jo && u.__jo.draw;
    if (typeDraw) {
      let drawn = false; const self = new Proxy(unitDefF(u.t), { get: (o, q) => q === 'super$draw' ? () => { if (!drawn) { drawn = true; nat(); } } : o[q] });
      Draw.reset(); const r = runHook(t.__mod, t.__name + '.draw', typeDraw, self, [fu], t); Draw.reset(); g.globalAlpha = 1; if (r === ERR && !drawn) nat();
    } else nat();
    if (own && !bad(u)) { Draw.reset(); runHook(t.__mod, t.__name + ' (egység) draw', own, fu, [], u); Draw.reset(); g.globalAlpha = 1; }
  },
  updUnit(W, u) {
    CW = W; const d = u.U.js, t = d[INST], fu = unitF(u);
    if (typeof t.__over.update === 'function' && !bad(t)) runHook(t.__mod, t.__name + '.update', t.__over.update, new Proxy(unitDefF(u.t), { get: (o, q) => q === 'super$update' ? () => {} : o[q] }), [fu], t);
    if (u.__jo && u.__jo.update && !bad(u)) runHook(t.__mod, t.__name + ' (egység) update', u.__jo.update, fu, [], u);
  },
  canPlace(W, B, x, y, rot) { const d = B.js, t = d && d[INST]; if (!t || typeof t.__over.canPlaceOn !== 'function' || bad(t)) return true; CW = W; const s = B.s, tl = tileF(x + ((s - 1) >> 1), y + (s >> 1)); const r = runHook(t.__mod, 'canPlaceOn', t.__over.canPlaceOn, blockF(t.__key), [tl, team(1), (4 - (rot || 0)) % 4], t); return r !== false; },
  accept(W, b, it, src) { buildF(b); const O = b.__jo, d = b.B.js[INST]; if (!O || !O.acceptItem || bad(d)) return true; CW = W; const r = runHook(d.__mod, 'acceptItem', O.acceptItem, b.__jf, [buildF(src), itemF(it)], d); return r === ERR || r !== false; },
  placed(W, b) { CW = W; buildF(b); const O = b.__jo, d = b.B.js[INST]; if (!O) return; for (const k of ['placed', 'playerPlaced']) if (O[k]) runHook(d.__mod, k, O[k], b.__jf, [b.cfg ?? null], d); },
  destroyed(W, b) { const O = b.__jo, d = b.B.js && b.B.js[INST]; if (O && O.onDestroyed && d) { CW = W; runHook(d.__mod, 'onDestroyed', O.onDestroyed, b.__jf, [], d); } },
  // eseményhidak a motorból (a facade csak akkor készül, ha valaki figyel)
  has: n => !!EV[n],
  ev(name, mk) { if (!EV[name]) return; emit(name, typeof mk === 'function' ? mk() : mk); },
  unit: u => unitF(u), build: b => buildF(b), tile: (x, y) => tileF(x, y), team: id => team(id), item: k => itemF(k),
  tick(W) {
    CW = W; if (EV['T:update']) emit('T:update');
    if (TIMERS.length) { const now = Time.time; for (const t of TIMERS.filter(t => !t.dead && t.at <= now)) { runHook(t.mod, 'Time.run', () => call(t.f), null, []); if (t.iv != null && t.n !== 0) { t.at = now + t.iv; if (t.n > 0) t.n--; } else t.dead = 1; } TIMERS = TIMERS.filter(t => !t.dead); }
    if (FXL.length) { for (const f of FXL) f.t++; for (let i = FXL.length - 1; i >= 0; i--) if (FXL[i].t >= FXL[i].e.lifetime) FXL.splice(i, 1); }
  },
  render(g, W) {
    if (!FXL.length && !EV['T:draw'] && !EV['T:postDraw']) return; CW = W; G2 = g;
    for (const f of FXL) { if (!f.e.renderer) continue; Draw.reset(); if (runHook(f.mod, 'Effect', () => call(f.e.renderer, effectRec(f)), null, []) === ERR) f.e.renderer = null; }
    Draw.reset(); if (EV['T:draw']) emit('T:draw'); if (EV['T:postDraw']) emit('T:postDraw'); Draw.reset(); g.globalAlpha = 1;
  },
  ready() { emit('ContentInitEvent', {}); emit('ClientLoadEvent', {}); },
  // lövedékek
  bUpd(W, b) {
    const t = bOver(b); if (!t || bad(t)) return; CW = W; const fb = bulletF(b);
    if (b.__t == null) { b.__t = 0; b.__l = b.life; if (typeof t.__over.init === 'function') runHook(t.__mod, 'BulletType.init', t.__over.init, BREG[b.jsb], [fb], t); }
    b.__t++; if (typeof t.__over.update === 'function') runHook(t.__mod, 'BulletType.update', t.__over.update, bSelf(t, b), [fb], t);
  },
  bHit(W, b, u, bl) {
    const t = bOver(b); if (!t || bad(t)) return; CW = W; const fb = bulletF(b), o = t.__over; b.__hit = 1;
    if (u && typeof o.hitEntity === 'function') runHook(t.__mod, 'BulletType.hitEntity', o.hitEntity, bSelf(t, b), [fb, unitF(u), u.hp], t);
    if (bl && typeof o.hitTile === 'function') runHook(t.__mod, 'BulletType.hitTile', o.hitTile, bSelf(t, b), [fb, buildF(bl), b.x, fy(b.y), bl.hp, true], t);
    if (typeof o.hit === 'function') runHook(t.__mod, 'BulletType.hit', o.hit, bSelf(t, b), [fb, b.x, fy(b.y)], t);
  },
  bEnd(W, b) {
    const t = bOver(b); if (!t || bad(t)) return; CW = W; const fb = bulletF(b), o = t.__over;
    if (!b.__hit && !b.__rm && typeof o.despawned === 'function') runHook(t.__mod, 'BulletType.despawned', o.despawned, bSelf(t, b), [fb], t);
    if (typeof o.removed === 'function') runHook(t.__mod, 'BulletType.removed', o.removed, bSelf(t, b), [fb], t);
  },
  bDraw(g, W, b) {
    const t = bOver(b); if (!t || bad(t) || typeof t.__over.draw !== 'function') return false; CW = W; G2 = g;
    Draw.reset(); const r = runHook(t.__mod, 'BulletType.draw', t.__over.draw, bSelf(t, b, g), [bulletF(b)], t); Draw.reset(); g.globalAlpha = 1; return r !== ERR;
  },
};
// a Time.run / Timer időzítői az őket felvevő modhoz kötve
Object.defineProperty(Time, 'run', { value(d, f) { TIMERS.push({ at: Time.time + (+d || 0), f, mod: CUR }); } });
Timer.schedule = (f, delay, iv, n) => { const t = { at: Time.time + (+delay || 0) * 60, f, iv: iv != null ? iv * 60 : null, n: n ?? -1, mod: CUR, cancel() { this.dead = 1; }, isScheduled() { return !this.dead; } }; TIMERS.push(t); return t; };

export async function initJsApi(sizeFn) {
  if (sizeFn) sz = sizeFn;
  try { PAL = await fetch('eszkoz/pal.json').then(r => r.json()); } catch (_) { PAL = {}; }
}
