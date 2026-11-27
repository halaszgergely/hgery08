// A Mindustry JS-modok szkriptjeiből kinyeri a tartalomleírásokat (lőszerek, lövedékek, számértékek),
// és a mod JSON-fájljaiba írja őket. Csak a gépünkön, a beépített (átnézett, szabad licencű) modokra fut –
// a böngészőben ezen felül a Kohóvár JS API (jsapi.js) futtatja a szkripteket; ez az eszköz a tartalmat előre is átveszi.
// Használat: node jsmod.mjs <mod mappa>
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const DIR = process.argv[2];
const SCR = path.join(DIR, 'scripts');
const meta = fs.readFileSync(fs.existsSync(path.join(DIR, 'mod.hjson')) ? path.join(DIR, 'mod.hjson') : path.join(DIR, 'mod.json'), 'utf8');
const MODNAME = (meta.match(/^\s*"?name"?\s*:\s*"?([\w-]+)/m) || [])[1] || path.basename(DIR);

// ---- „varázs” objektum: minden tulajdonsága, hívása és példányosítása újabb varázs objektum ----
const REF = Symbol('ref');
function magic(name) {
  const f = function () {};
  return new Proxy(f, {
    get(t, p) {
      if (p === REF) return name; if (p === Symbol.toPrimitive) return () => 0; if (p === 'toString') return () => name;
      if (p === Symbol.iterator) return function* () {};
      if (typeof p === 'symbol') return undefined;
      if (!(p in t)) t[p] = magic(name + '.' + p);
      return t[p];
    },
    set(t, p, v) { t[p] = v; return true; },
    apply() { return magic(name + '()'); },
    construct(t, args) { return inst(name.split('.').pop(), args); },
  });
}
// tartalomhivatkozás (Items.copper → "copper")
const ALIAS = { surgealloy: 'surge-alloy', phasefabric: 'phase-fabric', sporepod: 'spore-pod', blastcompound: 'blast-compound' };
const kebab = s => { const k = String(s).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase(); return ALIAS[k] || k; };
const ns = (kind) => new Proxy({}, { get: (t, p) => typeof p === 'symbol' ? undefined : { [REF]: kebab(p), kind } });

// példány: egy Mindustry-osztály objektuma, a beállított mezőket gyűjti
function inst(type, args, over) {
  const o = { __type: type, __args: args || [], __over: over || {} };
  return new Proxy(o, {
    get(t, p) {
      if (p in t) return t[p]; if (typeof p === 'symbol') return undefined;
      if (over && typeof over[p] === 'function') return over[p];
      if (/^super\$/.test(p)) return () => {};
      if (p === 'ammo') return (...a) => { t.__ammo = a; };
      if (p === 'consumes') return magic('consumes');
      return magic(type + '.' + p);
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}

const CONTENT = {};       // név → példány
const BULLETS = new Set(['BasicBulletType', 'ArtilleryBulletType', 'MissileBulletType', 'LaserBulletType', 'LightningBulletType', 'FlakBulletType', 'LiquidBulletType', 'BombBulletType', 'ShrapnelBulletType', 'BulletType', 'HealBulletType', 'ContinuousLaserBulletType', 'SapBulletType']);
function extend(cls, a, b) {
  const type = (cls && cls[REF]) ? String(cls[REF]).split('.').pop() : 'Block';
  if (typeof a === 'string') { const o = inst(type, [a], b || {}); o.__name = a; CONTENT[a] = o; return o; }
  return inst(type, [], a || {});
}
const classes = new Proxy({}, { has: () => false });
const PAL = JSON.parse(fs.readFileSync(new URL('./pal.json', import.meta.url), 'utf8'));
const colorObj = h => ({ __col: String(h).replace(/^#/, '').slice(0, 6).toLowerCase(), cpy() { return this; }, mul() { return this; }, lerp() { return this; }, a() { return this; } });
const palNs = new Proxy({}, { get: (t, p) => typeof p === 'symbol' ? undefined : PAL[p] ? colorObj(PAL[p]) : undefined });
const ColorNs = new Proxy(function () {}, { get: (t, p) => p === 'valueOf' ? h => colorObj(h) : typeof p === 'symbol' ? undefined : PAL[p] ? colorObj(PAL[p]) : undefined, construct: (t, a) => colorObj([a[0], a[1], a[2]].map(v => Math.round(Math.max(0, Math.min(1, +v || 0)) * 255).toString(16).padStart(2, '0')).join('')) });
const G = {
  Color: ColorNs, Pal: palNs,
  extend, extendContent: extend,
  Items: ns('item'), Liquids: ns('liquid'), StatusEffects: ns('status'), Blocks: ns('block'), UnitTypes: ns('unit'), Bullets: ns('bullet'),
  print() {}, Log: magic('Log'), Core: magic('Core'), Vars: magic('Vars'), Time: magic('Time'), Math, JSON, Object, Array, String, Number, Boolean, Symbol, parseInt, parseFloat, isNaN, Infinity, NaN, undefined,
  cons: f => f, prov: f => f, func: f => f, floatf: f => f, boolf: f => f, run: f => f,
  java: magic('java'), Packages: magic('Packages'),
};
G.Vars.content = new Proxy(magic('content'), { get: (t, p) => p === 'getByName' ? (ct, nm) => ({ [REF]: String(nm).replace(MODNAME + '-', ''), kind: 'item' }) : t[p] });
const ctx = vm.createContext(new Proxy(G, {
  has: () => true,
  get(t, p) { if (p in t) return t[p]; if (typeof p === 'symbol') return undefined; if (p === 'globalThis') return ctx; return (t[p] = magic(String(p))); },
  set(t, p, v) { t[p] = v; return true; },
}));

// Rhino-szintaxis: new Osztály(){ ... } (névtelen Java-osztály) → __anon(Osztály, { ... })
function rhino(src) {
  const re = /new\s+([\w.]+)\s*\(\s*\)\s*\{/g; let m, out = '', last = 0;
  while ((m = re.exec(src))) {
    let d = 1, i = m.index + m[0].length;
    for (; i < src.length && d; i++) { const c = src[i]; if (c === '{') d++; else if (c === '}') d--; else if (c === '"' || c === "'") { const q = c; for (i++; i < src.length && src[i] !== q; i++) if (src[i] === '\\') i++; } }
    out += src.slice(last, m.index) + `__anon(${m[1]}, {` + rhino(src.slice(m.index + m[0].length, i - 1)) + '})';
    last = i; re.lastIndex = i;
  }
  return out + src.slice(last);
}
G.__anon = (cls, o) => o;
const cache = {};
function req(id) {
  const rel = id.replace(new RegExp('^' + MODNAME + '/'), '');
  const f = path.join(SCR, rel.endsWith('.js') ? rel : rel + '.js');
  if (cache[f]) return cache[f].exports;
  const m = cache[f] = { exports: {} };
  if (!fs.existsSync(f)) return m.exports;
  try { vm.runInContext(`(function(module, exports, require){${rhino(fs.readFileSync(f, 'utf8'))}\n})`, ctx, { filename: f, timeout: 2000 })(m, m.exports, req); }
  catch (e) { console.error('hiba:', rel, String(e.message).slice(0, 120)); }
  return m.exports;
}
G.require = req;
req('main');

// init() lefuttatása (itt állítják be a lőszert), majd a mezők kiírása
const num = v => typeof v === 'number' && isFinite(v);
const B_KEYS = ['damage', 'speed', 'lifetime', 'splashDamage', 'splashDamageRadius', 'knockback', 'homingPower', 'homingRange', 'pierce', 'fragBullets', 'ammoMultiplier', 'reloadMultiplier', 'lightning', 'lightningLength', 'lightningDamage', 'statusDuration', 'length', 'drag', 'collidesAir', 'collidesGround', 'collidesTiles', 'healPercent'];
function bulletJson(b, d = 0) {
  if (!b || d > 3) return null;
  if (b[REF] !== undefined) return b.kind === 'bullet' ? String(b[REF]) : null;   // Bullets.standardCopper → beépített lövedék neve; a többi varázs érték nem lövedék
  if (!b.__type) return null;
  const o = { type: BULLETS.has(b.__type) ? b.__type : 'BasicBulletType' };
  for (const k of B_KEYS) if (num(b[k]) || typeof b[k] === 'boolean') o[k] = b[k];
  if (b.status && b.status.kind === 'status') o.status = b.status[REF];
  if (b.liquid && b.liquid.kind === 'liquid') o.liquid = b.liquid[REF];
  if ('fragBullet' in b) { const f = bulletJson(b.fragBullet, d + 1); if (f && typeof f === 'object') o.fragBullet = f; }
  for (const [k, v] of [['backColor', b.backColor], ['frontColor', b.frontColor], ['trailColor', b.trailColor], ['hitColor', b.hitColor]]) if (v && v.__col) o[k] = v.__col;
  for (const [k, k2] of [['width', 'bulletWidth'], ['height', 'bulletHeight']]) { const v = num(b[k]) ? b[k] : num(b[k2]) ? b[k2] : null; if (v != null) o[k] = v; }
  if (num(b.trailLength)) o.trailLength = b.trailLength;
  if (!num(o.damage) && !num(o.splashDamage)) o.damage = 10;
  if (num(o.speed) && o.speed < .05) {          // „álló” lövedék = sugár (pl. laserBullet(range))
    o.type = 'LaserBulletType'; delete o.speed;
    try { const r = b.__over.range && b.__over.range.call(b); if (num(r)) o.length = r; } catch (e) {}
  }
  return o;
}
const out = {};
for (const [n, o] of Object.entries(CONTENT)) {
  try { if (typeof o.__over.init === 'function') o.__over.init.call(o); } catch (e) { /* a rajzoló részek hibái nem számítanak */ }
  const j = {};
  if (o.__ammo) { const a = o.__ammo, am = {}; for (let i = 0; i + 1 < a.length; i += 2) { const k = a[i] && a[i][REF], b = bulletJson(a[i + 1]); if (k && b) am[k] = b; } if (Object.keys(am).length) j.ammoTypes = am; }
  for (const k of ['shootType', 'bullet']) if (k in o) { const b = bulletJson(o[k]); if (b) j.shootType = b; }
  if ('mech' in o && o.mech && o.mech.__name) j.mech = o.mech.__name;
  for (const k of ['reload', 'range', 'health', 'size', 'shots', 'spread', 'inaccuracy', 'craftTime', 'powerProduction', 'itemCapacity', 'speed', 'hitsize', 'mineTier', 'buildSpeed', 'armor']) if (k in o && num(o[k])) j[k] = o[k];
  j.__type = o.__type;
  out[n] = j;
}
// a régi (v5) Mech-ek egységként, a MechPad-ek a hozzájuk tartozó mech nevével
const UDIR = path.join(DIR, 'content', 'units');
for (const [n, o] of Object.entries(CONTENT)) {
  if (o.__type === 'MechPad' && o.mech && o.mech.__name) out[n].mech = o.mech.__name;
  if (o.__type !== 'Mech') continue;
  const u = { type: o.flying === true ? 'flying' : 'mech', health: num(o.health) ? o.health : 200, speed: num(o.speed) ? o.speed : .5, hitSize: 8 };
  if (num(o.itemCapacity)) u.itemCapacity = o.itemCapacity; if (num(o.buildPower)) u.buildSpeed = o.buildPower; if (num(o.drillPower)) { u.mineTier = Math.min(4, Math.round(o.drillPower / 2)); u.mineSpeed = num(o.mineSpeed) ? o.mineSpeed : 1; }
  const w = o.weapon; if (w && w.__type) { const b = bulletJson(w.bullet); if (b && typeof b === 'object') u.weapons = [{ reload: num(w.reload) ? w.reload : 20, x: num(o.weaponOffsetX) ? o.weaponOffsetX : 4, alternate: !!w.alternate, shoot: { shots: num(w.shots) ? w.shots : 1, spread: num(w.inaccuracy) ? w.inaccuracy : 0 }, bullet: b }]; }
  fs.mkdirSync(UDIR, { recursive: true }); const f = path.join(UDIR, n + '.json');
  if (!fs.existsSync(f)) { fs.writeFileSync(f, JSON.stringify(u, null, 1)); console.log('mech →', n); }
}
// a mod JSON-fájljaiba írás (csak a hiányzó mezők)
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.h?json$/.test(f)) files.push(p); } })(path.join(DIR, 'content'));
let n = 0;
for (const [name, j] of Object.entries(out)) {
  const f = files.find(p => path.basename(p).replace(/\.h?json$/, '') === name); if (!f) continue;
  const add = {}; let txt = fs.readFileSync(f, 'utf8');
  for (const [k, v] of Object.entries(j)) { if (k === '__type') continue; if (new RegExp('^\\s*"?' + k + '"?\\s*:', 'm').test(txt)) continue; add[k] = v; }
  if (!/^\s*"?type"?\s*:/m.test(txt) && j.__type && !/^(Block|UnitType)$/.test(j.__type) && /[\\/]blocks[\\/]/.test(f)) add.type = j.__type;
  if (!Object.keys(add).length) continue;
  // Hjson-fájl végére JSON-szintaxisú mezők (a Hjson a JSON-t is elfogadja)
  const body = Object.entries(add).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n');
  if (/^\s*\{/.test(txt)) txt = txt.replace(/\}\s*$/, (txt.trim().length > 2 ? ',\n' : '') + Object.entries(add).map(([k, v]) => `"${k}": ${JSON.stringify(v)}`).join(',\n') + '\n}\n');
  else txt = txt.replace(/\s*$/, '\n') + '// a szkriptből kinyerve (Kohóvár)\n' + body + '\n';
  fs.writeFileSync(f, txt); n++;
  console.log(name, Object.keys(add).join(','));
}
fs.writeFileSync(path.join(DIR, 'kohovar-js.txt'), 'A szkriptek tartalmát a Kohóvár eszkoz/jsmod.mjs eszköze átvette a JSON-fájlokba.\n');
console.log('kiegészített fájl:', n, '/ szkriptbeli tartalom:', Object.keys(out).length);
