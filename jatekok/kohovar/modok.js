// Kohóvár – Mindustry-modok betöltése.
// A mod egy Mindustry-formátumú .zip (mod.hjson / mod.json, content/{items,liquids,blocks,units}/*.json|hjson, sprites/**.png,
// bundles/bundle*.properties). A tartalmat a Kohóvár saját blokkfajtáira fordítjuk le; amit nem ismerünk, azt kihagyjuk és jelezzük.
// Forrás: a modok/lista.json-ban felsorolt, a játékkal együtt kiadott modok, és a játékos által betöltött .zip-ek (IndexedDB-ben, csak helyben).
import { ITEMS, ITEM_IDS, LIQUIDS, BLOCKS, UNITS, BUILD_ORDER, TECH, EXTRA_ORES, rcost, ucost } from './adat.js?v=202611262244';
import { SN, ISN, LSN, UW } from './kepadat.js?v=202611262244';
import { parseHjson } from './hjson.js?v=202611262244';
import { addSprite, spritesReady } from './rajz.js?v=202611262244';

export const MODS = [];
export const MOD_SECTORS = [], MOD_PLANETS = [];   // a modok szektorai (SectorPreset) és bolygói (Planet), a pályájuk a mod maps/ mappájából          // betöltött modok: { id, name, version, author, desc, src, warn: [] }

/* ---------- HJSON (a Mindustry modjainak lazább JSON-ja) ---------- */
export { parseHjson };

/* ---------- ZIP olvasás (tömörítetlen és deflate) ---------- */
export async function readZip(buf) {
  const d = new DataView(buf), u8 = new Uint8Array(buf), out = new Map(), dec = new TextDecoder();
  let e = buf.byteLength - 22; while (e >= 0 && d.getUint32(e, true) !== 0x06054b50) e--; if (e < 0) throw new Error('nem zip');
  let p = d.getUint32(e + 16, true); const n = d.getUint16(e + 10, true);
  for (let k = 0; k < n; k++) {
    const method = d.getUint16(p + 10, true), csize = d.getUint32(p + 20, true), nl = d.getUint16(p + 28, true), el = d.getUint16(p + 30, true), cl = d.getUint16(p + 32, true), lo = d.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nl)); p += 46 + nl + el + cl;
    if (name.endsWith('/')) continue;
    const ds = lo + 30 + d.getUint16(lo + 26, true) + d.getUint16(lo + 28, true), raw = u8.subarray(ds, ds + csize);
    let data = raw;
    if (method === 8) data = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    else if (method !== 0) continue;
    out.set(name.replace(/^[^/]*\/(?=(mod\.h?json|content\/|sprites\/|bundles\/))/, ''), data);   // ha a zip egy mappát tartalmaz, azt levágjuk
  }
  return out;
}

/* ---------- a Mindustry nevei → Kohóvár azonosítók ---------- */
const inv = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k]));
const ITEM_OF = () => ({ ...Object.fromEntries(ITEM_IDS.map(k => [k, k])), ...inv(ISN) });
const LIQ_OF = () => ({ ...Object.fromEntries(Object.keys(LIQUIDS).map(k => [k, k])), ...inv(LSN), slag: 'slag', cryofluid: 'cryo' });
const BLOCK_OF = () => ({ ...Object.fromEntries(Object.keys(BLOCKS).map(k => [k, k])), ...inv(SN) });
const CAT = { turret: 'turret', production: 'prod', distribution: 'dist', liquid: 'liquid', power: 'power', defense: 'def', crafting: 'craft', units: 'units', effect: 'effect', logic: 'effect' };
const human = n => n.replace(/[-_]/g, ' ').replace(/^\w/, c => c.toUpperCase());

export function installMod(files, srcLabel) {
  const dec = new TextDecoder(), txt = p => files.has(p) ? dec.decode(files.get(p)) : null;
  const meta = parseHjson(txt('mod.hjson') || txt('mod.json') || '{}');
  const id = String(meta.name || srcLabel || 'mod').toLowerCase().replace(/[^a-z0-9-]/g, '-'), warn = [];
  if (MODS.some(m => m.id === id)) return null;
  const mod = { id, name: meta.displayName || meta.name || id, version: meta.version || '', author: meta.author || '', desc: meta.description || '', src: srcLabel, warn, added: { items: 0, liquids: 0, blocks: 0, units: 0 } };
  // nyelvi fájl: a magyar az első, aztán az angol alap
  const bundle = {}; for (const f of ['bundles/bundle.properties', 'bundles/bundle_hu.properties']) { const t = txt(f); if (t) for (const l of t.split(/\r?\n/)) { const m = l.match(/^\s*([^#=][^=]*?)\s*=\s*(.*)$/); if (m) bundle[m[1]] = m[2]; } }
  const pre = n => id + '-' + n, label = (kind, n) => bundle[`${kind}.${pre(n)}.name`] || bundle[`${kind}.${n}.name`] || human(n);
  const content = {}; for (const [p] of files) { const m = p.match(/^content\/(items|liquids|blocks|units|sectors|planets)\/(?:.*\/)?([^/]+)\.h?json$/); if (m) (content[m[1]] = content[m[1]] || []).push([m[2], parseHjson(txt(p))]); }
  // sprite-ok: a fájlnév (kiterjesztés nélkül) a név; a modbeli tartalom a Mindustryhoz hasonlóan előtagot kap
  const spr = new Map(); for (const [p, d] of files) { const m = p.match(/^sprites\/(?:.*\/)?([^/]+)\.png$/); if (m) spr.set(m[1], d); }
  const sp = (...names) => { for (const n of names) if (spr.has(n)) return spr.get(n); return null; };
  const io = ITEM_OF(), lo = LIQ_OF(), bo = BLOCK_OF();
  const itemId = n => { n = String(n); return io[pre(n)] ? pre(n) : io[n] || (ITEMS[pre(n)] ? pre(n) : null); };
  const liqId = n => { n = String(n); return LIQUIDS[pre(n)] ? pre(n) : lo[n] || null; };
  const unitId = n => UNITS[pre(n)] ? pre(n) : UNITS[n] ? n : null;
  const stacks = (r, f = 1) => { const o = {}; const add = (k, v) => { const it = itemId(k); if (it) o[it] = (o[it] || 0) + Math.round(v * f); else warn.push('ismeretlen anyag: ' + k); };
    if (!r) return o; if (typeof r === 'string') r = r.split(/[,\s]+/).filter(Boolean);
    if (Array.isArray(r)) { for (const e of r) { if (typeof e === 'string') { const [k, v] = e.split('/'); add(k, +v || 1); } else if (e && e.item) add(e.item, +e.amount || 1); } }
    else for (const k in r) add(k, +r[k]); return o; };
  const liqOf = r => { if (!r) return null; if (typeof r === 'string') { const [k, v] = r.split('/'); const l = liqId(k); return l ? [l, +v || .1] : null; } if (r.liquid) { const l = liqId(r.liquid); return l ? [l, +r.amount || .1] : null; } return null; };
  const cons = j => {          // a v6 'consumes' blokk és a v7 consume* mezők
    const c = j.consumes || {}, o = {};
    const it = c.items ? (c.items.items || c.items) : c.item ? [c.item] : j.consumeItems || (j.consumeItem ? [j.consumeItem] : null); if (it) o.inp = stacks(it.items || it);
    const pw = c.power ?? j.consumePower; if (pw != null) o.power = typeof pw === 'object' ? +(pw.usage ?? pw.amount ?? 0) : +pw;
    if (c.powerBuffered ?? j.consumePowerBuffered) o.buf = +(c.powerBuffered ?? j.consumePowerBuffered);
    const lq = c.liquid ?? j.consumeLiquid; if (lq) { const l = liqOf(lq); if (l) { o.inL = l; if (lq.booster || lq.optional) o.boost = l; } }
    if (c.coolant ?? j.coolant) { const l = liqOf(c.coolant ?? j.coolant); if (l) o.cool = l; }
    return o;
  };

  // anyagok és folyadékok
  for (const [n, j] of content.items || []) {
    const k = pre(n); ITEMS[k] = { n: label('item', n), c: '#' + String(j.color || 'ffffff').slice(0, 6), c2: '#' + String(j.color || 'aaaaaa').slice(0, 6), h: +j.hardness || 0, cost: +j.cost || 1, f: +j.flammability || 0, ex: +j.explosiveness || 0, rad: +j.radioactivity || 0, mod: id };
    ITEM_IDS.push(k); ISN[k] = k; mod.added.items++; TECH.push({ id: 'i:' + k, k: 'i', key: k, req: 'i:copper', cost: {}, mod: id });
    const im = sp(n, 'item-' + n, n + '-ui'); if (im) addSprite('item-' + k, im);
  }
  for (const [n, j] of content.liquids || []) {
    const k = pre(n); LIQUIDS[k] = { n: label('liquid', n), c: '#' + String(j.color || '6688ff').slice(0, 6), hc: +j.heatCapacity || .4, mod: id };
    LSN[k] = k; mod.added.liquids++; TECH.push({ id: 'l:' + k, k: 'l', key: k, req: 'l:water', cost: {}, mod: id }); const im = sp(n, 'liquid-' + n); if (im) addSprite('liquid-' + k, im);
  }

  // lövedék → Kohóvár lőszerleírás
  const bullet = (b, base = {}) => {
    if (!b || typeof b !== 'object') return null; const t = String(b.type || 'BasicBulletType').replace(/^.*\./, ''), o = { d: +(b.damage ?? 9), sp: +(b.speed ?? 2.5) };
    if (b.splashDamage) { o.spl = +b.splashDamage; o.splR = +(b.splashDamageRadius || 20); }
    if (b.homingPower) o.hom = +b.homingPower; if (b.pierce || b.pierceCap) o.pierce = +(b.pierceCap > 0 ? b.pierceCap : 3);
    if (b.status) { const st = { burning: 'burn', freezing: 'freeze', wet: 'wet', tarred: 'tar', melting: 'melt', sapped: 'sap' }[b.status]; if (st) { o.st = st; o.stT = +(b.statusDuration || 240); } }
    if (b.lightning) { o.zap = +b.lightning; o.zapD = +(b.lightningDamage || 10); }
    if (b.fragBullets && b.fragBullet) { const f = bullet(b.fragBullet); if (f) o.frag = { n: +b.fragBullets, d: f.d, sp: f.sp, life: +(b.fragBullet.lifetime || 20) }; }
    if (b.lifetime) o.life = +b.lifetime;
    if (/Artillery/.test(t)) o.k = 'art'; else if (/Missile/.test(t)) o.k = 'missile'; else if (/Flak/.test(t)) { o.k = 'flak'; o.gnd = b.collidesGround ? 1 : 0; if (!o.spl) { o.spl = o.d * 3; o.splR = 20; } }
    else if (/Shrapnel/.test(t)) { o.k = 'shrap'; o.len = +(b.length || 100); } else if (/Rail/.test(t)) o.k = 'rail';
    else if (/ContinuousLaser|ContinuousFlame/.test(t)) { o.k = 'beam'; o.len = +(b.length || 160); o.dur = 180; }
    else if (/Laser/.test(t)) { o.k = 'laser'; o.len = +(b.length || 160); } else if (/Lightning/.test(t)) { o.k = 'arc'; o.len = +(b.lightningLength || 25) * 8; }
    else if (/Bomb/.test(t)) o.k = 'bomb'; else if (/Liquid/.test(t)) { o.k = 'liq'; o.liq = liqId(b.liquid) || 'water'; }
    else if (/Sap/.test(t)) { o.k = 'sap'; o.len = +(b.length || 60); o.sap = +(b.sapStrength || .5); }
    return { ...o, ...base };
  };

  // egységek
  for (const [n, j] of content.units || []) {
    const k = pre(n), T = String(j.type || 'mech').toLowerCase(), fam = T === 'flying' ? 'air' : T === 'legs' ? 'legs' : T === 'naval' ? 'naval' : T === 'payload' ? 'air' : 'mech';
    const U = { n: label('unit', n), fam, tier: 1, hp: +(j.health || 200), sp: +(j.speed || .5), r: +(j.hitSize || 8) / 2, armor: +(j.armor || 0), air: fam === 'air' ? 1 : 0, legs: fam === 'legs' ? 1 : 0, naval: fam === 'naval' ? 1 : 0, w: [], mod: id };
    if (j.mineTier != null && j.mineTier >= 0) { U.mine = +(j.mineSpeed || 1); U.mineT = +j.mineTier; }
    if (j.buildSpeed) U.build = +j.buildSpeed;
    if (j.itemCapacity) U.icap = +j.itemCapacity;
    const uw = []; for (const wp of j.weapons || []) {
      const b = bullet(wp.bullet || {}); if (!b) continue; const W = { rl: +(wp.reload || 20), ...b }; if (!W.life) W.life = 60; if (W.k === 'beam') { W.dur = 155; } if (b.k === 'art') W.air = 0;
      U.w.push(W); const wn = wp.name ? (spr.has(wp.name) ? pre(wp.name) : wp.name) : null; if (wn && spr.has(wp.name)) addSprite(wn + '@o', spr.get(wp.name));
      if (wn) uw.push([wn, +(wp.x || 0), +(wp.y || 0), wp.mirror === false ? 0 : 1, wp.top ? 1 : 0]);
    }
    UNITS[k] = U; UW[k] = uw; mod.added.units++;
    const im = sp(n); if (im) addSprite(k + '@o', im); for (const suf of ['-cell', '-leg', '-base', '-foot', '-joint']) { const d = sp(n + suf); if (d) addSprite(k + suf + (suf === '-cell' ? '' : '@o'), d); }
  }
  // blokkok
  const req = j => stacks(j.requirements);
  for (const [n, j] of content.blocks || []) {
    const k = pre(n), T = String(j.type || '').replace(/^.*\./, ''), s = +(j.size || 1), c = cons(j), cost = req(j), hp = +(j.health || 40 * s * s), cat = CAT[String(j.category || '').toLowerCase()] || null;
    const base = { n: label('block', n), kat: cat, s, hp, cost, mod: id };
    let B = null;
    if (/^OreBlock$/.test(T)) { const it = itemId(j.itemDrop); if (it) { if (!EXTRA_ORES.includes(it)) EXTRA_ORES.push(it); const im = [1, 2, 3].map(v => sp(n + v, n)); im.forEach((d, v) => d && addSprite('ore-' + ISN[it] + (v + 1), d)); } continue; }
    else if (/Wall$/.test(T)) B = { ...base, kat: cat || 'def', type: 'wall', hp: +(j.health || 80 * 4 * s * s), insul: j.insulated || j.absorbLasers ? 1 : 0, deflect: j.chanceDeflect ? 10 : 0, zap: j.lightningChance ? .05 : 0, door: T === 'Door' ? 1 : 0 };
    else if (/^(ArmoredConveyor|Conveyor)$/.test(T)) B = { ...base, type: 'conveyor', rot: 1, speed: +(j.displayedSpeed || 4.2), mv: +(j.speed || .03) * 1.15, armored: T === 'ArmoredConveyor' ? 1 : 0 };
    else if (T === 'StackConveyor') B = { ...base, type: 'sconv', rot: 1, speed: +(j.speed || .08) * 500 };
    else if (T === 'Junction') B = { ...base, type: 'junction' };
    else if (/ItemBridge$/.test(T)) B = { ...base, type: 'bridge', range: +(j.range || 4), cfg: 'link', tt: 4, power: c.power };
    else if (/Sorter$/.test(T)) B = { ...base, type: 'sorter', cfg: 'item', inv: j.invert ? 1 : 0 };
    else if (T === 'Router') B = { ...base, type: 'router' };
    else if (T === 'OverflowGate') B = { ...base, type: 'overflow', inv: j.invert ? 1 : 0 };
    else if (T === 'Unloader') B = { ...base, type: 'unloader', cfg: 'item' };
    else if (T === 'StorageBlock') B = { ...base, type: 'storage', cap: +(j.itemCapacity || 300) };
    else if (/Drill$/.test(T)) B = { ...base, type: 'drill', tier: +(j.tier || 2), time: +(j.drillTime || 600), power: c.power, boostL: c.boost ? c.boost[1] : .05, boost: +(j.liquidBoostIntensity || 1.6), icap: +(j.itemCapacity || 10) };
    else if (/^(GenericCrafter|AttributeCrafter|GenericSmelter|Separator|AttributeSmelter)$/.test(T)) {
      const out = j.outputItems ? stacks(j.outputItems) : j.outputItem ? stacks([j.outputItem]) : null, oL = liqOf(j.outputLiquid || (j.outputLiquids && j.outputLiquids[0]));
      B = { ...base, type: 'crafter', inp: c.inp, time: +(j.craftTime || 60), power: c.power, inL: c.inL, icap: +(j.itemCapacity || 10), lcap: +(j.liquidCapacity || 10) };
      if (out && Object.keys(out).length) B.out = out; if (oL) B.outL = oL;
      if (T === 'Separator' && j.results) { B.sep = stacks(j.results); }
      if (j.attribute) { B.attr = { heat: 'heat', spores: 'spores', oil: 'oil' }[j.attribute] || null; B.aScale = +(j.baseEfficiency ?? 1); B.aMax = +(j.maxBoost || 2); }
    }
    else if (/^(PowerNode|PowerTower)$/.test(T)) B = { ...base, type: 'node', range: +(j.laserRange || 6), links: +(j.maxNodes || 10) };
    else if (T === 'Battery') B = { ...base, type: 'battery', capP: c.buf || 1000 };
    else if (/Generator$/.test(T)) {
      const g = +(j.powerProduction || 1);
      if (T === 'SolarGenerator') B = { ...base, type: 'generator', gen: g, mode: 'solar' };
      else if (T === 'ThermalGenerator') B = { ...base, type: 'generator', gen: g, mode: 'thermal' };
      else if (T === 'DecayGenerator') B = { ...base, type: 'generator', gen: g, mode: 'rtg', dur: +(j.itemDuration || 840) };
      else { const fuel = c.inp && Object.keys(c.inp)[0]; B = { ...base, type: 'generator', gen: g, mode: fuel ? 'item' : 'burn', fuel, dur: +(j.itemDuration || 120), inL: c.inL }; }
    }
    else if (/Turret$/.test(T) && T !== 'RepairTurret' && T !== 'BuildTurret') {
      const sh = j.shoot || {}, shots = +(sh.shots || j.shots || 1), tu = { ...base, kat: 'turret', type: 'turret', range: +(j.range || 110), reload: +(j.reload || 20), air: j.targetAir === false ? 0 : 1, ground: j.targetGround === false ? 0 : 1, power: c.power, shots, sd: +(sh.shotDelay || 0) };
      if (c.cool) { tu.cool = c.cool[1]; tu.coolM = +(j.coolantMultiplier || 5); }
      if (T === 'ItemTurret' && j.ammo) {
        tu.ammo = {}; const am = Array.isArray(j.ammo) ? Object.fromEntries(j.ammo.reduce((a, v, x) => (x % 2 ? a[a.length - 1].push(v) : a.push([v]), a), [])) : j.ammo;
        for (const it in am) { const iid = itemId(it); const bb = bullet(am[it], { n: +(am[it].ammoMultiplier || 2), rlm: +(am[it].reloadMultiplier || 1) }); if (iid && bb) tu.ammo[iid] = bb; }
      } else if (T === 'LiquidTurret' && j.ammo) {
        tu.lammo = {}; tu.lcap = +(j.liquidCapacity || 10); tu.lsp = 3.5; tu.lam = 1;
        const am = Array.isArray(j.ammo) ? Object.fromEntries(j.ammo.reduce((a, v, x) => (x % 2 ? a[a.length - 1].push(v) : a.push([v]), a), [])) : j.ammo;
        for (const l in am) { const lid = liqId(l); if (lid) tu.lammo[lid] = +(am[l].damage || 0); }
      } else {
        const bb = bullet(j.shootType || j.bullet);
        if (bb && bb.k === 'laser') tu.laser = { d: bb.d, len: bb.len, charge: +(j.shoot && j.shoot.firstShotDelay || 0), pierce: 4 };
        else if (bb && bb.k === 'arc') tu.arcd = bb.d;
        else if (bb && bb.k === 'beam') { tu.beam = { d: bb.d, len: bb.len, dur: +(j.shootDuration || 180) }; }
        else if (bb) { tu.ammo = { _p: bb }; tu.pam = 1; }
        else warn.push(n + ': ismeretlen lövedék');
      }
      B = tu;
    }
    else if (T === 'UnitFactory') {
      const plans = [], pc = {}; for (const p of j.plans || []) { const u = unitId(p.unit); if (!u) { warn.push(n + ': ismeretlen egység ' + p.unit); continue; } plans.push(u); pc[u] = { cost: stacks(p.requirements), time: +(p.time || 1800) / 60 }; }
      B = { ...base, type: 'factory', rot: 1, power: c.power, plans, pcost: pc };
    }
    else if (T === 'Reconstructor') {
      const up = {}; for (const [a, b] of j.upgrades || []) { const ua = unitId(a), ub = unitId(b); if (ua && ub) up[ua] = ub; }
      B = { ...base, type: 'recon', rot: 1, power: c.power, inp: c.inp || {}, time: +(j.constructTime || 600), up, inL: c.inL, lcap: c.inL ? 120 : undefined };
    }
    else if (T === 'MendProjector' || T === 'RegenProjector') B = { ...base, type: 'mender', power: c.power, reload: +(j.reload || 200), range: +(j.range || 40), heal: +(j.healPercent || 12), bItem: null };
    else if (T === 'OverdriveProjector') B = { ...base, type: 'overdrive', power: c.power, range: +(j.range || 80), od: +(j.speedBoost || 1.5) };
    else if (T === 'ForceProjector') B = { ...base, type: 'shield', power: c.power, radius: +(j.radius || 100), shp: +(j.shieldHealth || 700), regen: +(j.cooldownNormal || 1.75), broken: +(j.cooldownBrokenBase || .35) };
    else if (T === 'Pump') B = { ...base, type: 'pump', amt: +(j.pumpAmount || 7 / 60), lcap: +(j.liquidCapacity || 20), power: c.power, float: 1 };
    else if (/^(Conduit|ArmoredConduit)$/.test(T)) B = { ...base, type: 'conduit', rot: 1, lcap: +(j.liquidCapacity || 10), lmove: 1 };
    else if (/^(LiquidRouter|LiquidContainer)$/.test(T)) B = { ...base, type: 'lrouter', lcap: +(j.liquidCapacity || 20), lmove: 1 };
    else if (T === 'LiquidJunction') B = { ...base, type: 'ljunction' };
    else if (/LiquidBridge$/.test(T)) B = { ...base, type: 'lbridge', range: +(j.range || 4), lcap: +(j.liquidCapacity || 100), lmove: 1, cfg: 'link', float: 1 };
    else if (T === 'RepairTurret' || T === 'RepairPoint') B = { ...base, type: 'repair', power: c.power, range: +(j.repairRadius || 60), rep: +(j.repairSpeed || .45) };
    else if (T === 'ShockMine') B = { ...base, type: 'mine', d: +(j.damage || 25), cnt: +(j.tendrils || 4) };
    else if (T === 'LightBlock') B = { ...base, type: 'lamp', power: c.power };
    else { warn.push(`${n}: nem támogatott blokkfajta (${T || '?'})`); continue; }
    if (B.power === undefined) delete B.power;
    BLOCKS[k] = B; SN[k] = k; mod.added.blocks++;
    const im = sp(n); if (im) addSprite(k, im);
    for (const suf of ['-top', '-rotator', '-team', '-heat', '-liquid', '-bottom', '-light', '-rim', '-end', '-bridge', '-arrow', '-cap', '-base']) { const d = sp(n + suf); if (d) addSprite(k + suf, d); }
    if (B.type === 'turret') { const d = sp(n, n + '-preview'); if (d) addSprite(k + '@o', d); }
    if (B.type === 'conveyor') for (let a = 0; a < 5; a++) for (let f = 0; f < 4; f++) { const d = sp(`${n}-${a}-${f}`); if (d) addSprite(`${k}-${a}-${f}`, d); }
    const kat = B.kat || 'effect'; if (BUILD_ORDER[kat]) BUILD_ORDER[kat].push(k); else (BUILD_ORDER.effect = BUILD_ORDER.effect || []).push(k);
    researchNode(k, 'b', j.research, cost);
  }

  // a gyárak terveiben szereplő modbeli egységek ára (a gyár adja)
  for (const b in BLOCKS) { const B = BLOCKS[b]; if (B.mod === id && B.pcost) for (const u in B.pcost) { const U = UNITS[u]; if (U && U.mod === id) { U.cost = B.pcost[u].cost; U.time = B.pcost[u].time; } } }
  for (const [n, j] of content.units || []) { const k = pre(n); if (UNITS[k]) researchNode(k, 'u', j.research, UNITS[k].cost || {}); }

  function researchNode(key, kind, r, cost) {
    const parent = r && typeof r === 'object' ? r.parent : r; const id2 = kind === 'u' ? 'u:' + key : key;
    let req = null; if (parent) { const p = String(parent), b = BLOCKS[pre(p)] ? pre(p) : bo[p], u = unitId(p); req = b ? b : u ? 'u:' + u : null; }
    if (!req) req = kind === 'u' ? (Object.keys(BLOCKS).find(b => (BLOCKS[b].plans || []).includes(key) || Object.values(BLOCKS[b].up || {}).includes(key)) || 'core') : 'core';
    const c = r && typeof r === 'object' && r.requirements ? stacks(r.requirements) : null;
    const need = kind === 'u' ? Object.keys(BLOCKS).find(b => (BLOCKS[b].plans || []).includes(key) || Object.values(BLOCKS[b].up || {}).includes(key)) : undefined;
    TECH.push({ id: id2, k: kind, key, req, need, cost: c || (kind === 'u' ? ucost(cost) : rcost(cost)), mod: id });
  }
  // bolygók és szektorok (Mindustry ContentParser: planet, sector) – a Java-ban írt bolygógenerátor nem fut, a szektorok pályája az msav
  for (const [n, j] of content.planets || []) { const k = pre(n); MOD_PLANETS.push({ id: k, n: bundle[`planet.${k}.name`] || bundle[`planet.${n}.name`] || human(n), col: '#' + String(j.atmosphereColor || j.landCloudColor || '7f9cc8').slice(0, 6), mod: id }); }
  for (const [n, j] of content.sectors || []) {
    const map = files.get(`maps/${n}.msav`) || files.get(`maps/${j.map || n}.msav`); if (!map) { warn.push('a szektornak nincs pályája: ' + n); continue; }
    const pl = String(j.planet || 'serpulo'), k = pre(n);
    MOD_SECTORS.push({ id: k, n: bundle[`sector.${k}.name`] || bundle[`sector.${n}.name`] || human(n), d: bundle[`sector.${k}.description`] || bundle[`sector.${n}.description`] || '', planet: pl === 'serpulo' ? 'serpulo' : MOD_PLANETS.some(p => p.id === pre(pl)) ? pre(pl) : pl,
      gi: j.sector ?? -1, win: +j.captureWave || 0, diff: +j.difficulty || 0, p: { alwaysUnlocked: !!j.alwaysUnlocked, captureWave: +j.captureWave || 0, startWaveTimeMultiplier: j.startWaveTimeMultiplier ?? 2 }, mapBytes: map, txt: bundle, camp: 'serpulo', mod: id });
  }
  MODS.push(mod); return mod;
}

/* ---------- tárolás: a beépített modok listája és a helyben betöltött .zip-ek (IndexedDB) ---------- */
const DB = () => new Promise((ok, no) => { const r = indexedDB.open('kohovar_modok', 1); r.onupgradeneeded = () => r.result.createObjectStore('z'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
const tx = (mode, fn) => DB().then(db => new Promise((ok, no) => { const t = db.transaction('z', mode), st = t.objectStore('z'), r = fn(st); t.oncomplete = () => ok(r && r.result); t.onerror = () => no(t.error); }));
export const localMods = () => tx('readonly', st => st.getAllKeys());
export const saveLocalMod = (name, buf) => tx('readwrite', st => st.put(buf, name));
export const deleteLocalMod = name => tx('readwrite', st => st.delete(name));
const getLocal = name => tx('readonly', st => st.get(name));
export const modPrefs = () => { try { return JSON.parse(localStorage.getItem('kohovar_modok') || '{}'); } catch (_) { return {}; } };
export const setModPrefs = p => { try { localStorage.setItem('kohovar_modok', JSON.stringify(p)); } catch (_) {} };
export const builtinList = () => fetch('modok/lista.json?v=' + Date.now()).then(r => r.ok ? r.json() : []).catch(() => []);

// a bekapcsolt modok betöltése a játék indulása előtt; hibás mod nem állítja meg a játékot
export async function loadMods() {
  const pref = modPrefs(), errs = [];
  let list = []; try { list = await builtinList(); } catch (_) {}
  for (const m of list) { if (pref[m.file] === false || (pref[m.file] !== true && !m.on)) continue; try { const buf = await fetch('modok/' + m.file).then(r => r.arrayBuffer()); installMod(await readZip(buf), m.file); } catch (e) { errs.push(m.file + ': ' + e.message); } }
  let loc = []; try { loc = await localMods(); } catch (_) {}
  for (const name of loc) { if (pref['local:' + name] === false) continue; try { installMod(await readZip(await getLocal(name)), 'local:' + name); } catch (e) { errs.push(name + ': ' + e.message); } }
  await spritesReady(); return errs;
}
