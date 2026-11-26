// Kohóvár – Mindustry-modok betöltése.
// A mod egy Mindustry-formátumú .zip (mod.hjson / mod.json, content/{items,liquids,blocks,units}/*.json|hjson, sprites/**.png,
// bundles/bundle*.properties). A tartalmat a Kohóvár saját blokkfajtáira fordítjuk le; amit nem ismerünk, azt kihagyjuk és jelezzük.
// Forrás: a modok/lista.json-ban felsorolt, a játékkal együtt kiadott modok, és a játékos által betöltött .zip-ek (IndexedDB-ben, csak helyben).
import { ITEMS, ITEM_IDS, ITEM_PL, LIQUIDS, STATUS, FLOORS, WALLS, TREES, MPROP, WALL_SAND, WALL_DROP, BLOCKS, UNITS, BUILD_ORDER, TECH, EXTRA_ORES, MOD_ORE, MOD_DECO, rcost, ucost } from './adat.js?v=202611262304';
import { SN, ISN, LSN, UW, LEG, FSPR, WSPR } from './kepadat.js?v=202611262304';
import { FL, FLI, WL } from './vilag.js?v=202611262304';
import { parseHjson } from './hjson.js?v=202611262304';
import { addSprite, spritesReady, has as AT_HAS } from './rajz.js?v=202611262304';

export const MODS = [];
export const MOD_SECTORS = [], MOD_PLANETS = [];   // a modok szektorai (SectorPreset) és bolygói (Planet), a pályájuk a mod maps/ mappájából          // betöltött modok: { id, name, version, author, desc, src, warn: [] }
export const SN_TYPE = { turret: 'ItemTurret', crafter: 'GenericCrafter', drill: 'Drill', generator: 'ConsumeGenerator', wall: 'Wall', conveyor: 'Conveyor', node: 'PowerNode', battery: 'Battery', storage: 'StorageBlock', factory: 'UnitFactory', recon: 'Reconstructor', mender: 'MendProjector', pump: 'Pump' };   // a felülírt eredeti blokkok Mindustry-típusa

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
    out.set(name, data);
  }
  // ha a zip egyetlen mappát tartalmaz (pl. GitHub-letöltés), azt levágjuk
  const root = [...out.keys()].find(k => /(^|\/)mod\.h?json$/.test(k)); const pf = root ? root.replace(/mod\.h?json$/, '') : '';
  if (pf) { const o2 = new Map(); for (const [k, v] of out) if (k.startsWith(pf)) o2.set(k.slice(pf.length), v); return o2; }
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
  const clr = v => String(v ?? '').replace(/\[(#?[0-9a-fA-F]{6,8}|[a-z]+)?\]/g, '').trim();   // a Mindustry színjelölései ([red], [#ff0000])
  const mod = { id, name: clr(meta.displayName || meta.name || id), version: clr(meta.version), author: clr(meta.author), desc: clr(meta.description), src: srcLabel, warn, added: { items: 0, liquids: 0, blocks: 0, units: 0, patched: 0, overrides: 0, maps: 0 } };
  // nyelvi fájl: a magyar az első, aztán az angol alap
  const bundle = {}; for (const f of ['bundles/bundle.properties', 'bundles/bundle_hu.properties']) { const t = txt(f); if (t) for (const l of t.split(/\r?\n/)) { const m = l.match(/^\s*([^#=][^=]*?)\s*=\s*(.*)$/); if (m) bundle[m[1]] = m[2]; } }
  const pre = n => id + '-' + n, label = (kind, n, j) => clr(bundle[`${kind}.${pre(n)}.name`] || bundle[`${kind}.${n}.name`] || (j && (j.localizedName || j.name)) || human(n));
  const content = {}; for (const [p] of files) { const m = p.match(/^content\/(items|liquids|blocks|units|sectors|planets|status|statuses)\/(?:.*\/)?([^/]+)\.h?json$/); if (m) { const kk = m[1] === 'statuses' ? 'status' : m[1]; let j; try { j = parseHjson(txt(p)); } catch (e) { warn.push(p + ': hibás fájl'); continue; } if (j && typeof j === 'object') (content[kk] = content[kk] || []).push([m[2], j]); } }
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
    const lqs = c.liquids ? (c.liquids.liquids || c.liquids) : j.consumeLiquids; if (lqs) { const L = (Array.isArray(lqs) ? lqs : Object.entries(lqs).map(([k, v]) => ({ liquid: k, amount: v }))).map(liqOf).filter(Boolean); if (L[0] && !o.inL) o.inL = L[0]; if (L[1]) o.inL2 = L[1]; else if (L[0] && o.inL !== L[0]) o.inL2 = L[0]; }
    const cl = c.coolant ?? j.coolant; if (cl) { const l = cl.type && /Coolant/.test(cl.type) ? ['water', +(cl.amount || .2)] : liqOf(cl); if (l) o.cool = l; }
    return o;
  };

  // anyagok, folyadékok, állapothatások
  const pick = (j, ...ks) => { for (const k of ks) if (j[k] != null) return j[k]; return undefined; };
  const col = (v, d) => '#' + String(v || d).replace(/^#/, '').slice(0, 6);
  for (const [n, j] of content.items || []) {
    const k = pre(n); ITEMS[k] = { n: label('item', n, j), c: col(j.color, 'ffffff'), c2: col(j.color, 'aaaaaa'), h: +j.hardness || 0, cost: +j.cost || 1, f: +j.flammability || 0, ex: +j.explosiveness || 0, rad: +j.radioactivity || 0, mod: id };
    ITEM_IDS.push(k); ISN[k] = k; for (const p in ITEM_PL) ITEM_PL[p].push(k); mod.added.items++; TECH.push({ id: 'i:' + k, k: 'i', key: k, req: 'i:copper', cost: {}, mod: id });
    const im = sp(n, 'item-' + n, n + '-ui'); if (im) addSprite('item-' + k, im);
  }
  for (const [n, j] of content.liquids || []) {
    const k = pre(n); LIQUIDS[k] = { n: label('liquid', n, j), c: col(j.color, '6688ff'), hc: +(j.heatCapacity ?? .4), gas: j.gas ? 1 : 0, mod: id };
    LSN[k] = k; mod.added.liquids++; TECH.push({ id: 'l:' + k, k: 'l', key: k, req: 'l:water', cost: {}, mod: id }); const im = sp(n, 'liquid-' + n); if (im) addSprite('liquid-' + k, im);
  }
  const STV = { burning: 'burn', freezing: 'freeze', wet: 'wet', muddy: 'wet', tarred: 'tar', melting: 'melt', sapped: 'sap', overdrive: 'od', overclock: 'od', fast: 'od', blasted: 'burn', corroded: 'melt', electrified: 'sap', shocked: 'sap', slow: 'freeze', sporeSlowed: 'freeze' };
  for (const [n, j] of content.status || []) {
    const k = pre(n), s = { c: col(j.color, 'ffffff') }; if (j.speedMultiplier != null) s.sp = +j.speedMultiplier; if (j.damage) s.dps = +j.damage; if (j.healthMultiplier) s.dm = 1 / +j.healthMultiplier; if (j.damageMultiplier) s.dmg = +j.damageMultiplier;
    STATUS[k] = s; STV[n] = k; STV[k] = k;
  }
  const stOf = v => { if (!v) return null; v = String(v).replace(new RegExp('^' + id + '-'), ''); return STV[v] || (STATUS[pre(v)] ? pre(v) : STATUS[v] ? v : null); };

  // lövedék → Kohóvár lőszerleírás (Mindustry BulletType-családok)
  const bullet = (b, base = {}) => {
    if (typeof b === 'string') b = { type: b };
    if (!b || typeof b !== 'object') return null; const t = String(b.type || 'BasicBulletType').replace(/^.*\./, '').toLowerCase();
    const o = { d: +(b.damage ?? (/laser|lightning|explosion/.test(t) ? 0 : 9)), sp: +(b.speed ?? (/artillery/.test(t) ? 3 : 2.5)) };
    if (b.splashDamage) { o.spl = +b.splashDamage; o.splR = +(b.splashDamageRadius || 20); }
    if (/explosion/.test(t)) { o.spl = +(b.splashDamage ?? b.damage ?? 50); o.splR = +(b.splashDamageRadius || 40); }
    if (b.homingPower) o.hom = +b.homingPower; if (b.pierce || b.pierceCap) o.pierce = +(b.pierceCap > 0 ? b.pierceCap : 3); if (b.pierceBuilding) o.pb = 1;
    const st = stOf(b.status); if (st) { o.st = st; o.stT = +(b.statusDuration || 240); }
    if (b.lightning) { o.zap = +b.lightning; o.zapD = +(b.lightningDamage || o.d || 10); }
    if (b.buildingDamageMultiplier != null) o.bdm = +b.buildingDamageMultiplier;
    const fb = b.fragBullet || b.intervalBullet; if (fb) { const f = bullet(fb); if (f) o.frag = { n: +(b.fragBullets || (b.intervalBullet ? 3 : 9)), d: f.d, sp: f.sp, life: +(fb.lifetime || 20), spl: f.spl, splR: f.splR }; }
    if (b.lifetime) o.life = +b.lifetime;
    if (b.knockback) o.kb = +b.knockback;
    if (/artillery/.test(t)) o.k = 'art'; else if (/missile/.test(t)) o.k = 'missile'; else if (/flak/.test(t)) { o.k = 'flak'; o.gnd = b.collidesGround ? 1 : 0; if (!o.spl) { o.spl = o.d * 3; o.splR = 20; } }
    else if (/shrapnel/.test(t)) { o.k = 'shrap'; o.len = +(b.length || 100); } else if (/rail/.test(t)) { o.k = 'rail'; o.d = +(b.damage ?? 100); }
    else if (/continuousflame|continuouslaser|pointlaser/.test(t)) { o.k = 'beam'; o.len = +(b.length || b.maxRange || 160); o.dur = 180; if (/point/.test(t)) o.len = 0; }
    else if (/laser/.test(t)) { o.k = 'laser'; o.len = +(b.length || 160); } else if (/lightning/.test(t)) { o.k = 'arc'; o.len = +(b.lightningLength || 25) * 8; o.d = +(b.damage || b.lightningDamage || 12); }
    else if (/bomb/.test(t)) o.k = 'bomb'; else if (/liquid/.test(t)) { o.k = 'liq'; o.liq = liqId(b.liquid) || 'water'; }
    else if (/sap/.test(t)) { o.k = 'sap'; o.len = +(b.length || 60); o.sap = +(b.sapStrength || .5); }
    else if (/explosion|point/.test(t)) { o.k = 'art'; o.sp = 8; }
    else if (/emp/.test(t)) { o.zap = o.zap || 2; o.zapD = o.zapD || +(b.empDamage || 20); }
    if (b.instantDisappear && o.spl) { o.k = 'art'; o.sp = 8; }
    return { ...o, ...base };
  };
  const ammoMap = j => { const a = j.ammoTypes || j.ammo; if (!a) return null; return Array.isArray(a) ? Object.fromEntries(a.reduce((r, v, x) => (x % 2 ? r[r.length - 1].push(v) : r.push([v]), r), [])) : a; };

  // egységek (Mindustry UnitType; a type a mozgásmódot adja, a template egy meglévő egységet másol)
  const FAM = { flying: 'air', flyingunit: 'air', builderdrone: 'air', wraith: 'air', revenant: 'air', payload: 'air', missile: 'air', legs: 'legs', legsunit: 'legs', naval: 'naval', navalunit: 'naval', uwater: 'naval', tank: 'mech', mech: 'mech', mechunit: 'mech', groundunit: 'mech', ground: 'mech', crawl: 'mech', tether: 'air', hover: 'mech', hoverunit: 'mech', elevated: 'mech' };
  const unitConv = (n, j, U0) => {
    const T = String(j.type || '').replace(/^.*\./, '').toLowerCase(), fam = FAM[T] || (j.flying ? 'air' : j.legCount ? 'legs' : U0 ? U0.fam : 'mech');
    const U = { ...(U0 || {}), n: label('unit', n, j), fam, tier: U0 ? U0.tier : 1, hp: +(j.health ?? (U0 ? U0.hp : 200)), sp: +(j.speed ?? (U0 ? U0.sp : .5)), r: j.hitSize != null ? +j.hitSize / 2 : U0 ? U0.r : 4, armor: +(j.armor ?? (U0 ? U0.armor : 0)), mod: id };
    U.air = fam === 'air' ? 1 : 0; U.legs = fam === 'legs' ? 1 : 0; U.naval = fam === 'naval' ? 1 : 0; if (T === 'tank') U.tank = 1; if (/hover/.test(T) || j.hovering) U.hov = 1;
    if (j.mineTier != null && j.mineTier >= 0) { U.mine = +(j.mineSpeed || 1); U.mineT = +j.mineTier; if (j.mineWalls) U.mineW = 1; }
    if (j.buildSpeed) U.build = +j.buildSpeed; if (j.itemCapacity) U.icap = +j.itemCapacity;
    const ab = {}; for (const a of j.abilities || []) { const at = String(a.type || '').replace(/^.*\./, ''); if (/ForceField/.test(at)) ab.ff = [+(a.radius || 60), +(a.regen || .1), +(a.max || 200), +(a.cooldown || 300)]; else if (/RepairField/.test(at)) ab.rep = [+(a.amount || 30), +(a.reload || 120), +(a.range || 60)]; else if (/ShieldRegen/.test(at)) ab.regen = [+(a.amount || 10), +(a.max || 100), +(a.reload || 60), +(a.range || 60)]; }
    if (Object.keys(ab).length) U.ab = ab;
    if (j.weapons) {
      U.w = []; const uw = [];
      for (const wp of j.weapons) {
        if (typeof wp === 'string') continue; const sh = wp.shoot || {}, b = bullet(wp.bullet || wp.shootType || {}); if (!b) continue;
        const W = { rl: +(wp.reload ?? 20), ...b, n: +(sh.shots || wp.shots || 1) }; if (!W.life) W.life = 60; if (W.k === 'beam') W.dur = 155; if (b.k === 'art') W.air = 0;
        if (b.k === 'laser' && !W.len) W.len = 120; U.w.push(W); if (wp.mirror !== false && !wp.alternate) U.w.push({ ...W });
        const wn = wp.name ? (spr.has(wp.name) ? pre(wp.name) : wp.name) : null; if (wn && spr.has(wp.name)) addSprite(wn + '@o', spr.get(wp.name));
        if (wn) uw.push([wn, +(wp.x || 0), +(wp.y || 0), wp.mirror === false ? 0 : 1, wp.top ? 1 : 0]);
      }
      UW[pre(n)] = uw;
    }
    return U;
  };
  const vanillaUnit = n => UNITS[n] && !UNITS[n].mod ? n : null;
  for (const [n, j] of content.units || []) {
    const van = vanillaUnit(n);
    if (van && !j.type && !j.template) { Object.assign(UNITS[van], unitConv(n, j, UNITS[van]), { n: j.name || UNITS[van].n, mod: undefined }); mod.added.patched++; continue; }   // meglévő egység módosítása
    const tpl = j.template ? (UNITS[unitId(j.template)] || null) : null, k = pre(n);
    UNITS[k] = unitConv(n, j, tpl); if (!UNITS[k].w) UNITS[k].w = []; if (!UW[k]) UW[k] = tpl ? (UW[unitId(j.template)] || []) : []; mod.added.units++;
    const im = sp(n, n + '-full'); if (im) addSprite(k + '@o', im); for (const suf of ['-cell', '-leg', '-base', '-foot', '-joint', '-joint-base', '-leg-base', '-treads']) { const d = sp(n + suf); if (d) addSprite(k + suf + (suf === '-cell' || suf === '-treads' ? '' : '@o'), d); }
    if (UNITS[k].legs && !LEG[k]) LEG[k] = [+(j.legCount || 4), +(j.legLength || UNITS[k].r * 2)];
  }

  // blokkok
  const req = j => stacks(j.requirements);
  const NT = t => { t = String(t || '').replace(/^.*\./, ''); return t ? t[0].toUpperCase() + t.slice(1) : ''; };
  const envSpr = (n, k) => { let v = 0; for (let i = 1; i <= 8; i++) { const d = sp(n + i); if (d) { addSprite(k + i, d); v = i; } } const d0 = sp(n); if (d0) addSprite(k, d0); const L = sp(n + '-large'); if (L) addSprite(k + '-large', L); return v; };
  const addFloor = (k, f) => { FLOORS[k] = f; if (!FL.includes(k)) { FL.push(k); FLI[k] = FL.length - 1; } };
  const addWall = (k, c) => { WALLS[k] = c; if (!WL.includes(k)) WL.push(k); };
  const convert = (n, j, T, k) => {
    const s = +(j.size || 1), c = cons(j), cost = req(j), hp = +(j.health || (j.scaledHealth ? j.scaledHealth * s * s : 40 * s * s)), cat = CAT[String(j.category || '').toLowerCase()] || null;
    const base = { n: label('block', n, j), kat: cat, s, hp, cost, mod: id }; if (j.armor) base.armor = +j.armor;
    const g = +(j.powerProduction || 1), turret = /Turret$/.test(T) && !/^(RepairTurret|BuildTurret)$/.test(T);
    if (/Wall$/.test(T) && !/^(StaticWall|ShieldWall)$/.test(T) || T === 'ShieldWall') return { ...base, kat: cat || 'def', type: 'wall', hp: +(j.health || 80 * 4 * s * s), insul: j.insulated || j.absorbLasers ? 1 : 0, deflect: j.chanceDeflect ? 10 : 0, zap: j.lightningChance ? .05 : 0, power: c.power };
    if (/^(Door|AutoDoor)$/.test(T)) return { ...base, kat: cat || 'def', type: 'wall', door: 1 };
    if (/^(ArmoredConveyor|Conveyor)$/.test(T)) return { ...base, type: 'conveyor', rot: 1, speed: +(j.displayedSpeed || 4.2), mv: +(j.speed || .03) * 1.15, armored: T === 'ArmoredConveyor' ? 1 : 0 };
    if (/^(Duct|ArmoredDuct)$/.test(T)) return { ...base, type: 'conveyor', rot: 1, speed: 8, mv: .06, duct: 1, armored: T === 'ArmoredDuct' ? 1 : 0 };
    if (T === 'StackConveyor') return { ...base, type: 'sconv', rot: 1, speed: +(j.speed || .08) * 500, power: c.power };
    if (T === 'Junction') return { ...base, type: 'junction' };
    if (/ItemBridge$|^DuctBridge$|^PhaseConveyor$/.test(T)) return { ...base, type: 'bridge', range: +(j.range || 4), cfg: 'link', tt: 4, power: c.power };
    if (/Sorter$/.test(T)) return { ...base, type: 'sorter', cfg: 'item', inv: j.invert ? 1 : 0 };
    if (/^(Router|DuctRouter|StackRouter)$/.test(T)) return { ...base, type: 'router', fwd: T === 'DuctRouter' ? 1 : 0 };
    if (/^(OverflowGate|OverflowDuct)$/.test(T)) return { ...base, type: 'overflow', inv: j.invert ? 1 : 0 };
    if (/Unloader$/.test(T)) return { ...base, type: 'unloader', cfg: 'item' };
    if (T === 'MassDriver') return { ...base, type: 'driver', range: +(j.range || 440), power: c.power || 1.75, cap: +(j.itemCapacity || 120), reload: +(j.reload || 200), cfg: 'link' };
    if (T === 'StorageBlock' || T === 'Vault') return { ...base, type: 'storage', cap: +(j.itemCapacity || 300), noMerge: j.coreMerge === false ? 1 : 0 };
    if (T === 'CoreBlock') { const u = unitId(j.unitType) || 'alpha'; return { ...base, kat: 'effect', type: 'core', cap: +(j.itemCapacity || 4000), tier: 2, unit: u, ucap: +(j.unitCapModifier || 8), zone: j.requiresCoreZone ? 1 : 0 }; }
    if (T === 'LaunchPad') return { ...base, type: 'launchpad', power: c.power || 4, cap: +(j.itemCapacity || 100), time: +(j.launchTime || 1200) };
    if (T === 'BeamDrill') return { ...base, type: 'beamdrill', rot: 1, tier: +(j.tier || 3), time: +(j.drillTime || 160), range: +(j.range || 5), power: c.power, icap: +(j.itemCapacity || 10), lcap: 10, ...(c.boost ? { boostL: c.boost[1], boostLiq: c.boost[0], boost: +(j.optionalBoostIntensity || 2.5) } : c.inL ? { needL: c.inL } : {}) };
    if (/Drill$/.test(T)) return { ...base, type: 'drill', tier: +(j.tier || 2), time: +(j.drillTime || 600), power: c.power, boostL: c.boost ? c.boost[1] : .05, boostLiq: c.boost ? c.boost[0] : 'water', boost: +(j.liquidBoostIntensity || 1.6), icap: +(j.itemCapacity || 10), ...(c.inL && !c.boost ? { needL: c.inL, lcap: 30 } : {}), burst: T === 'BurstDrill' ? 1 : 0 };
    if (T === 'WallCrafter') return { ...base, type: 'wcrafter', rot: 1, time: +(j.drillTime || 150), power: c.power, out: { [itemId(j.output) || 'sand']: 1 }, icap: +(j.itemCapacity || 10), ...(c.inL ? { needL: c.inL, lcap: 20 } : {}) };
    if (/^(GenericCrafter|AttributeCrafter|GenericSmelter|Separator|AttributeSmelter|HeatCrafter|SolidPump|Fracker|LiquidConverter|PayloadCrafter)$/.test(T) || (T === 'HeatProducer' && (j.outputItem || j.outputItems))) {
      const out = j.outputItems ? stacks(j.outputItems) : j.outputItem ? stacks([j.outputItem]) : null, oLs = (j.outputLiquids || (j.outputLiquid ? [j.outputLiquid] : (T === 'SolidPump' || T === 'Fracker') && j.result ? [{ liquid: j.result, amount: +(j.pumpAmount || .1) * s * s }] : [])).map(liqOf).filter(Boolean);
      const B = { ...base, type: 'crafter', inp: c.inp, time: +(j.craftTime || 60), power: c.power, inL: c.inL, icap: +(j.itemCapacity || 10), lcap: +(j.liquidCapacity || 10) };
      if (c.inL2) B.inL2 = c.inL2; if (out && Object.keys(out).length) B.out = out; if (oLs[0]) B.outL = oLs[0]; if (oLs[1]) B.outL2 = oLs[1];
      if (T === 'Separator' && j.results) B.sep = stacks(j.results);
      if (j.attribute) { B.attr = { heat: 'heat', spores: 'spores', oil: 'oil', steam: 'steam', water: 'water' }[j.attribute] || null; B.aScale = +(j.boostScale ?? 1); B.aMax = +(j.maxBoost || 2); if (j.baseEfficiency != null) B.aBase = +j.baseEfficiency; if (j.minEfficiency) B.aMin = +j.minEfficiency; }
      if (j.heatRequirement) { B.heatReq = +j.heatRequirement; B.heatMax = +(j.maxEfficiency || 4); }
      if (j.heatOutput) { B.heatOut = +j.heatOutput; B.rot = 1; }
      return B;
    }
    if (T === 'HeatProducer') return { ...base, type: 'heater', rot: 1, heatOut: +(j.heatOutput || 3), power: c.power, inL: c.inL, fuel: c.inp && Object.keys(c.inp)[0], dur: +(j.craftTime || 120), lcap: +(j.liquidCapacity || 20) };
    if (T === 'HeatConductor') return { ...base, type: 'heatcond', rot: 1, split: j.splitHeat ? 1 : 0 };
    if (/^(PowerNode|PowerTower|LongPowerNode)$/.test(T)) return { ...base, type: 'node', range: +(j.laserRange || 6), links: +(j.maxNodes || 10) };
    if (T === 'BeamNode') return { ...base, type: 'node', range: +(j.range || 10), links: 0, beam: 1 };
    if (T === 'PowerDiode') return { ...base, type: 'diode', rot: 1 };
    if (T === 'Battery') return { ...base, type: 'battery', capP: c.buf || 1000 };
    if (T === 'NuclearReactor') return { ...base, type: 'generator', gen: g, mode: 'reactor', fuel: (c.inp && Object.keys(c.inp)[0]) || 'thorium', dur: +(j.itemDuration || 360), icap: +(j.itemCapacity || 30), lcap: 30, inL: c.inL || ['cryo', .04] };
    if (T === 'ImpactReactor') return { ...base, type: 'generator', gen: g, mode: 'impact', fuel: (c.inp && Object.keys(c.inp)[0]) || 'blast', dur: +(j.itemDuration || 140), power: c.power || 25, lcap: 80, inL: c.inL || ['cryo', .25] };
    if (T === 'VariableReactor') return { ...base, type: 'generator', gen: g, mode: 'flux', heatReq: +(j.maxHeat || 150), inL: c.inL || ['cyanogen', .15], lcap: 30 };
    if (/Generator$|^HeaterGenerator$/.test(T)) {
      if (T === 'SolarGenerator') return { ...base, type: 'generator', gen: g, mode: 'solar' };
      if (T === 'ThermalGenerator') return { ...base, type: 'generator', gen: g, mode: 'thermal', attr: j.attribute === 'steam' ? 'steam' : undefined, aMin: j.minEfficiency ? +j.minEfficiency : undefined };
      if (T === 'DecayGenerator') return { ...base, type: 'generator', gen: g, mode: 'rtg', dur: +(j.itemDuration || 840) };
      if (c.inL && c.inL2) return { ...base, type: 'generator', gen: g, mode: 'liq', inL: c.inL, inL2: c.inL2, lcap: +(j.liquidCapacity || 30), fuel: c.inp && Object.keys(c.inp)[0], dur: +(j.itemDuration || 120), heatOut: j.heatOutput ? +j.heatOutput : undefined };
      const fuel = c.inp && Object.keys(c.inp)[0]; return { ...base, type: 'generator', gen: g, mode: fuel ? 'item' : c.inL ? 'liq1' : 'burn', fuel, dur: +(j.itemDuration || 120), inL: c.inL, lcap: c.inL ? +(j.liquidCapacity || 30) : undefined };
    }
    if (turret) {
      const sh = j.shoot || {}, shots = +(sh.shots || j.shots || 1), tu = { ...base, kat: 'turret', type: 'turret', range: +(j.range || 110), reload: +(j.reload ?? j.reloadTime ?? 20), air: j.targetAir === false ? 0 : 1, ground: j.targetGround === false ? 0 : 1, power: c.power, shots, sd: +(sh.shotDelay || 0), spr: +(sh.spread || 0), maxAmmo: +(j.maxAmmo || 30) };
      if (c.cool) { tu.cool = c.cool[1]; tu.coolM = +(j.coolantMultiplier || 5); }
      if (T === 'PointDefenseTurret') { tu.pd = +(j.bulletDamage || 10); return tu; }
      if (T === 'TractorBeamTurret') { tu.tractor = { force: +(j.force || .3), d: +(j.damage || .3) }; tu.ground = 0; return tu; }
      const am = ammoMap(j);
      if (/^ItemTurret$/.test(T) && am) { tu.ammo = {}; for (const it in am) { const iid = itemId(it); const bb = bullet(am[it], { n: +(am[it].ammoMultiplier || 2) / +(j.ammoPerShot || 1), rlm: +(am[it].reloadMultiplier || 1), rg: +(am[it].rangeChange || 0) / 1 || undefined }); if (iid && bb) tu.ammo[iid] = bb; else warn.push(n + ': ismeretlen lőszer ' + it); } if (!Object.keys(tu.ammo).length) delete tu.ammo; }
      else if (/Liquid/.test(T) && am) {
        if (/Continuous/.test(T)) { tu.lflame = {}; tu.lammo = {}; for (const l in am) { const lid = liqId(l), bb = bullet(am[l]); if (lid && bb) { tu.lflame[lid] = { d: bb.d || 30, len: bb.len || tu.range, pierce: bb.pierce || 2, c: LIQUIDS[lid].c }; tu.lammo[lid] = 0; } } tu.luse = +(j.liquidConsumed || .2); tu.lcap = +(j.liquidCapacity || 30); tu.reload = 5; }
        else { tu.lammo = {}; tu.lcap = +(j.liquidCapacity || 10); tu.lsp = 3.5; tu.lam = 1; for (const l in am) { const lid = liqId(l); if (lid) tu.lammo[lid] = +(am[l].damage || 0); } }
      } else {
        const bb = bullet(j.shootType || j.bullet || (am && Object.values(am)[0]));
        if (bb && bb.k === 'laser') tu.laser = { d: bb.d, len: bb.len || tu.range, charge: +(sh.firstShotDelay || j.chargeTime || 0), pierce: bb.pierce || 4 };
        else if (bb && bb.k === 'arc') tu.arcd = bb.d;
        else if (bb && bb.k === 'beam') { if (/Continuous/.test(T) || bb.len === 0) { tu.lflame = { _p: { d: Math.max(5, bb.d / 2), len: bb.len || tu.range, pierce: 2, c: '#ff9a6a' } }; tu.pam = 1; tu.reload = 5; } else tu.beam = { d: bb.d, len: bb.len, dur: +(j.shootDuration || 180) }; }
        else if (bb) { tu.ammo = { _p: { ...bb, n: 1e9 } }; tu.pam = 1; if (!c.power) tu.power = .01; }
        else warn.push(n + ': ismeretlen lövedék');
      }
      return tu;
    }
    if (T === 'UnitFactory') {
      const plans = [], pc = {}; for (const p of j.plans || []) { const u = unitId(p.unit); if (!u) { warn.push(n + ': ismeretlen egység ' + p.unit); continue; } plans.push(u); pc[u] = { cost: stacks(p.requirements), time: +(p.time || 1800) / 60 }; }
      return { ...base, type: 'factory', rot: 1, power: c.power, plans, pcost: pc };
    }
    if (T === 'UnitAssembler') {          // a rakomány (egységek, blokkok) helyett anyagköltség
      const plans = [], pc = {}; for (const p of j.plans || []) { const u = unitId(p.unit); if (!u) continue; const cst = {}; for (const ps of p.requirements || []) { const [nm, amt] = typeof ps === 'string' ? ps.split('/') : [ps.item || ps.unit || ps.block, ps.amount]; const ub = unitId(nm), bb = BLOCKS[pre(nm)] || BLOCKS[bo[nm]], src = ub ? (UNITS[ub].cost || {}) : bb ? bb.cost : null; if (src) for (const q in src) cst[q] = (cst[q] || 0) + src[q] * (+amt || 1); } plans.push(u); pc[u] = { cost: cst, time: +(p.time || 3600) / 60 }; }
      return { ...base, type: 'factory', rot: 1, power: c.power, plans, pcost: pc };
    }
    if (T === 'Reconstructor') {
      const up = {}; for (const [a, b] of j.upgrades || []) { const ua = unitId(a), ub = unitId(b); if (ua && ub) up[ua] = ub; }
      return { ...base, type: 'recon', rot: 1, power: c.power, inp: c.inp || {}, time: +(j.constructTime || 600), up, inL: c.inL, lcap: c.inL ? 120 : undefined };
    }
    if (T === 'MendProjector' || T === 'RegenProjector') return { ...base, type: 'mender', power: c.power, reload: +(j.reload || (T === 'RegenProjector' ? 60 : 200)), range: +(j.range || 40) * (T === 'RegenProjector' ? 4 : 1), heal: +(j.healPercent || 12) * (T === 'RegenProjector' ? 60 : 1), bItem: null };
    if (T === 'OverdriveProjector') return { ...base, type: 'overdrive', power: c.power, range: +(j.range || 80), od: +(j.speedBoost || 1.5) };
    if (T === 'ForceProjector' || T === 'BaseShield' || T === 'DirectionalForceProjector') return { ...base, type: 'shield', power: c.power, radius: +(j.radius || 100), shp: +(j.shieldHealth || 700), regen: +(j.cooldownNormal || 1.75), broken: +(j.cooldownBrokenBase || .35) };
    if (T === 'Pump') return { ...base, type: 'pump', amt: +(j.pumpAmount || 7 / 60), lcap: +(j.liquidCapacity || 20), power: c.power, float: 1, ...(c.inL ? { needL: c.inL } : {}) };
    if (/^(Conduit|ArmoredConduit)$/.test(T)) return { ...base, type: 'conduit', rot: 1, lcap: +(j.liquidCapacity || 10), lmove: 1, armored: T === 'ArmoredConduit' ? 1 : 0 };
    if (/^(LiquidRouter|LiquidContainer|LiquidTank)$/.test(T)) return { ...base, type: 'lrouter', lcap: +(j.liquidCapacity || 20), lmove: 1 };
    if (T === 'LiquidJunction') return { ...base, type: 'ljunction' };
    if (/LiquidBridge$/.test(T)) return { ...base, type: 'lbridge', range: +(j.range || 4), lcap: +(j.liquidCapacity || 100), lmove: 1, cfg: 'link', float: 1 };
    if (/^(RepairTurret|RepairPoint|RepairTower)$/.test(T)) return { ...base, type: 'repair', power: c.power, range: +(j.repairRadius || j.range || 60), rep: +(j.repairSpeed || j.healAmount || .45) };
    if (T === 'BuildTurret') return { ...base, type: 'btower', power: c.power || 1, range: +(j.range || 200), build: +(j.buildSpeed || 1), inL: c.inL || ['water', 0], lcap: 30 };
    if (T === 'ShockwaveTower') return { ...base, type: 'shock', power: c.power || 1, range: +(j.range || 170), reload: +(j.reload || 80), bulletDmg: +(j.bulletDamage || 160), inL: c.inL || ['water', 0], lcap: 30 };
    if (T === 'Radar') return { ...base, type: 'radar', power: c.power || .5, range: +(j.fogRadius || 34) };
    if (T === 'ShockMine') return { ...base, type: 'mine', d: +(j.damage || 25), cnt: +(j.tendrils || 4) };
    if (T === 'LightBlock') return { ...base, type: 'lamp', power: c.power };
    if (/Incinerator$/.test(T)) return { ...base, type: 'incinerator', power: c.power, free: c.power ? 0 : 1 };
    return null;
  };
  const ENV = /^(Floor|SteamVent|ShallowLiquid|OverlayFloor|StaticWall|StaticTree|TreeBlock|TallBlock|Prop|OreBlock|AirBlock|Cliff|SeaBush|ShrubBlock|Boulder|Rock|Seaweed|DoubleOverlayFloor|EmptyFloor|SpawnBlock)$/;
  for (const [n, j] of content.blocks || []) {
    const T = NT(j.type), k = pre(n);
    // a pályák környezeti blokkjai (talaj, fal, fa, kő, érc) a mod pályáihoz
    if (ENV.test(T) || (!j.type && /^(ore|floor)/i.test(n))) {
      if (T === 'OreBlock' || /^ore/i.test(n) && !T) { const it = itemId(j.itemDrop); if (it) { if (!EXTRA_ORES.includes(it)) EXTRA_ORES.push(it); MOD_ORE[k] = it; const im = [1, 2, 3].map(v => sp(n + v, n)); im.forEach((d, v) => d && addSprite((j.wallOre ? 'ore-wall-' : 'ore-') + ISN[it] + (v + 1), d)); } continue; }
      if (T === 'OverlayFloor') { envSpr(n, k); MOD_DECO[k] = 1; continue; }
      if (/Floor|SteamVent|ShallowLiquid/.test(T)) { const v = envSpr(n, k); addFloor(k, { c: col(j.mapColor, '777777'), c2: col(j.mapColor, '777777'), ...(j.isLiquid ? { liq: liqId(j.liquidDrop) || 'water', ...(j.isDeep || j.drownTime > 0 ? { deep: 1 } : { shallow: 1 }) } : {}), ...(j.itemDrop && itemId(j.itemDrop) === 'sand' ? { ore: 'sand' } : {}), ...(T === 'SteamVent' ? { steam: 1 } : {}) }); FSPR[k] = [k, v]; continue; }
      if (/^(StaticWall|StaticTree|TreeBlock|TallBlock|Cliff)$/.test(T)) { const v = envSpr(n, k); addWall(k, col(j.mapColor, '444444')); WSPR[k] = v ? k : k; if (/Tree|Tall/.test(T)) TREES.add(k); if (j.itemDrop && itemId(j.itemDrop)) WALL_DROP[k] = itemId(j.itemDrop); if (j.attributes && j.attributes.sand) WALL_SAND[k] = +j.attributes.sand; continue; }
      if (/^(Prop|SeaBush|ShrubBlock|Boulder|Rock|Seaweed)$/.test(T)) { envSpr(n, k); MPROP.add(k); continue; }
      continue;
    }
    const van = bo[n];
    if (van && !j.type) { const cur = BLOCKS[van], B = convert(n, j, NT(SN_TYPE[cur.type] || ''), van);   // meglévő blokk módosítása (a Mindustryban a típus nélküli azonos nevű blokk felülírja az eredetit)
      if (j.health) cur.hp = +j.health; if (j.requirements) cur.cost = req(j); for (const f of ['reload', 'range', 'time', 'gen', 'cap', 'tier', 'capP']) if (B && B[f] != null && j[{ reload: 'reload', range: 'range', time: 'craftTime', gen: 'powerProduction', cap: 'itemCapacity', tier: 'tier', capP: 'consumePowerBuffered' }[f]] != null) cur[f] = B[f];
      if (j.reloadTime) cur.reload = +j.reloadTime; const am = ammoMap(j); if (am && cur.ammo) for (const it in am) { const iid = itemId(it), bb = bullet(am[it], { n: +(am[it].ammoMultiplier || 2) }); if (iid && bb) cur.ammo[iid] = bb; }
      if (j.name) cur.n = j.name; mod.added.patched++; continue; }
    let B = convert(n, j, T, k);
    if (!B) {           // ismeretlen fajta: építhető, de nem csinál semmit (díszítőelem)
      if (!j.requirements) { warn.push(`${n}: nem támogatott blokkfajta (${T || 'Block'})`); continue; }
      B = { n: label('block', n, j), kat: CAT[String(j.category || '').toLowerCase()] || 'effect', s: +(j.size || 1), hp: +(j.health || 40 * (j.size || 1) ** 2), cost: req(j), type: 'deco', mod: id }; warn.push(`${n}: csak díszítőelemként (${T || 'Block'})`);
    }
    if (B.power === undefined) delete B.power;
    BLOCKS[k] = B; SN[k] = k; mod.added.blocks++;
    const im = sp(n, n + '-full'); if (im) addSprite(k, im);
    for (const suf of ['-top', '-rotator', '-team', '-heat', '-liquid', '-bottom', '-light', '-rim', '-end', '-bridge', '-arrow', '-cap', '-base', '-glow', '-mid', '-top1', '-top2', '-open', '-dir', '-0', '-1', '-2', '-edge', '-stack', '-turbine', '-middle', '-spinner', '-weave', '-plasma-0', '-plasma-1', '-plasma-2', '-plasma-3', '-lights']) { const d = sp(n + suf); if (d) addSprite(k + suf, d); }
    for (let a = 0; a < 5; a++) { const d = sp(`${n}-top-${a}`); if (d) addSprite(`${k}-top-${a}`, d); }
    if (B.type === 'turret') { const d = sp(n + '-preview', n); if (d) addSprite(k + '@o', d); }
    if (B.type === 'conveyor') for (let a = 0; a < 5; a++) for (let f = 0; f < 4; f++) { const d = sp(`${n}-${a}-${f}`); if (d) addSprite(`${k}-${a}-${f}`, d); }
    const kat = B.kat || 'effect'; if (BUILD_ORDER[kat]) BUILD_ORDER[kat].push(k); else (BUILD_ORDER.effect = BUILD_ORDER.effect || []).push(k);
    researchNode(k, 'b', j.research, B.cost);
  }
  // egységek „requirements” mezője: a gyár/átépítő tervébe veszi fel (Mindustry UnitReq)
  for (const [n, j] of content.units || []) { const r = j.requirements; if (!r || typeof r !== 'object' || Array.isArray(r)) continue; const k = UNITS[pre(n)] ? pre(n) : vanillaUnit(n); const bk = BLOCKS[pre(r.block)] ? pre(r.block) : bo[r.block]; const B = bk && BLOCKS[bk]; if (!B || !k) continue;
    if (B.type === 'factory') { if (!B.plans.includes(k)) B.plans.push(k); B.pcost = B.pcost || {}; B.pcost[k] = { cost: stacks(r.requirements), time: +(r.time || 1800) / 60 }; }
    else if (B.type === 'recon' && r.previous) { const pv = unitId(r.previous); if (pv) B.up[pv] = k; } }
  // a felülírt eredeti sprite-ok (sprites-override)
  for (const [p, d] of files) { const m = p.match(/^sprites-override\/(?:.*\/)?([^/]+)\.png$/); if (m) { addSprite(m[1], d); if (AT_HAS(m[1] + '@o')) addSprite(m[1] + '@o', d); mod.added.overrides++; } }
  const nScripts = [...files.keys()].filter(p => /^scripts\/.*\.js$/.test(p)).length; if (nScripts) warn.push(`${nScripts} JavaScript-fájl: a szkriptek nem futnak`);
  if (meta.main || [...files.keys()].some(p => /\.(class|jar|dex)$/.test(p))) warn.push('Java-kódot tartalmaz: az nem fut a böngészőben');

  // a gyárak terveiben szereplő modbeli egységek ára (a gyár adja)
  for (const b in BLOCKS) { const B = BLOCKS[b]; if (B.mod === id && B.pcost) for (const u in B.pcost) { const U = UNITS[u]; if (U && U.mod === id) { U.cost = B.pcost[u].cost; U.time = B.pcost[u].time; } } }
  for (const [n, j] of content.units || []) { const k = pre(n); if (UNITS[k]) researchNode(k, 'u', j.research, UNITS[k].cost || {}); }

  function researchNode(key, kind, r, cost) {
    const parent = r && typeof r === 'object' ? r.parent : r; const id2 = kind === 'u' ? 'u:' + key : key;
    let req = null; if (parent) { const p = String(parent), b = BLOCKS[pre(p)] ? pre(p) : bo[p], u = unitId(p), it = itemId(p); req = b ? b : u ? 'u:' + u : it ? 'i:' + it : null; }
    let pl; if (req && !TECH.some(t => t.id === req) && TECH.some(t => t.id === 'E/' + req)) { req = 'E/' + req; pl = 'erekir'; } else if (req) { const pt = TECH.find(t => t.id === req); if (pt) pl = pt.pl; }   // a szülő bolygójának fájába kerül
    if (!req) req = kind === 'u' ? (Object.keys(BLOCKS).find(b => (BLOCKS[b].plans || []).includes(key) || Object.values(BLOCKS[b].up || {}).includes(key)) || 'core') : 'core';
    const c = r && typeof r === 'object' && r.requirements ? stacks(r.requirements) : null;
    const need = kind === 'u' ? Object.keys(BLOCKS).find(b => (BLOCKS[b].plans || []).includes(key) || Object.values(BLOCKS[b].up || {}).includes(key)) : undefined;
    TECH.push({ id: id2, k: kind, key, req, need: need ? [need] : [], pl, cost: c || (kind === 'u' ? ucost(cost) : rcost(cost)), mod: id });
  }
  // bolygók és szektorok (Mindustry ContentParser: planet, sector) – a Java-ban írt bolygógenerátor nem fut, a szektorok pályája az msav
  for (const [n, j] of content.planets || []) { const k = pre(n); MOD_PLANETS.push({ id: k, n: bundle[`planet.${k}.name`] || bundle[`planet.${n}.name`] || human(n), col: '#' + String(j.atmosphereColor || j.landCloudColor || '7f9cc8').slice(0, 6), mod: id }); }
  for (const [n, j] of content.sectors || []) {
    const mapFile = files.has(`maps/${n}.msav`) ? `maps/${n}.msav` : `maps/${j.map || n}.msav`, map = files.get(mapFile); if (!map) { warn.push('a szektornak nincs pályája: ' + n); continue; }
    const pl = String(j.planet || 'serpulo'), k = pre(n);
    MOD_SECTORS.push({ id: k, n: bundle[`sector.${k}.name`] || bundle[`sector.${n}.name`] || human(n), d: bundle[`sector.${k}.description`] || bundle[`sector.${n}.description`] || '', planet: pl === 'serpulo' ? 'serpulo' : MOD_PLANETS.some(p => p.id === pre(pl)) ? pre(pl) : pl,
      gi: j.sector ?? -1, win: +j.captureWave || 0, diff: +j.difficulty || 0, p: { alwaysUnlocked: !!j.alwaysUnlocked, captureWave: +j.captureWave || 0, startWaveTimeMultiplier: j.startWaveTimeMultiplier ?? 2 }, mapBytes: map, mapFile, txt: bundle, camp: 'serpulo', mod: id });
  }
  const used = new Set(MOD_SECTORS.filter(s => s.mod === id).map(s => s.mapFile));
  const maps = [...files.keys()].filter(p => /^maps\/[^/]+\.msav$/.test(p) && !used.has(p));
  if (maps.length) { const pl = 'mod-' + id; MOD_PLANETS.push({ id: pl, n: mod.name, col: '#8a8f9c', mod: id }); maps.forEach((p, i) => { const nm = p.slice(5, -5); MOD_SECTORS.push({ id: pre('map-' + nm), n: bundle[`map.${nm}.name`] || human(nm), d: '', planet: pl, gi: i * 7, win: 0, diff: 0, p: { alwaysUnlocked: true }, mapBytes: files.get(p), txt: bundle, camp: 'serpulo', mod: id }); mod.added.maps++; }); }
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
