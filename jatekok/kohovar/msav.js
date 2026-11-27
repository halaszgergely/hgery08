// Kohóvár – a Mindustry .msav pályafájlok olvasója (az eredeti io/SaveVersion, MapIO formátum alapján).
// A Mindustry y tengelye felfelé nő, a Kohóváré lefelé: a sorokat itt fordítjuk meg.
import { parseHjson } from './hjson.js?v=202611271237';

async function inflate(buf) {
  const ds = new DecompressionStream('deflate'), s = new Blob([buf]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(s).arrayBuffer());
}
class Rd {
  constructor(u8) { this.u = u8; this.d = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); this.p = 0; }
  i() { const v = this.d.getInt32(this.p); this.p += 4; return v; }
  s() { const v = this.d.getInt16(this.p); this.p += 2; return v; }
  us() { const v = this.d.getUint16(this.p); this.p += 2; return v; }
  ub() { return this.u[this.p++]; }
  b() { const v = this.d.getInt8(this.p); this.p += 1; return v; }
  f() { const v = this.d.getFloat32(this.p); this.p += 4; return v; }
  utf() { const n = this.us(), v = new TextDecoder().decode(this.u.subarray(this.p, this.p + n)); this.p += n; return v; }
}
// épület-alapadatok (Building.readBase): életerő, forgatás, csapat, tárgyak
function base(r) {
  const o = { hp: r.f() }, rot = r.ub(); o.team = r.ub(); o.rot = rot & 127; let ver = 0, mb = 0;
  if (rot & 128) { ver = r.ub(); if (ver >= 1) r.ub(); if (ver >= 2) mb = r.ub(); } else return o;
  if (mb & 1) { o.items = {}; const c = r.s(); for (let k = 0; k < c; k++) { const id = r.s(); o.items[id] = r.i(); } }
  if (mb & 2) { const n = r.s(); r.p += 4 * n + 4; }
  if (mb & 4) { const n = r.s(); r.p += 6 * n; }
  if (mb & 16) r.p += 8;
  if (mb & 32) r.p += 4;
  if (ver <= 2) r.p += 1; else r.p += 2;
  if (ver === 4) r.p += 8;
  o.ok = 1; return o;
}
export async function readMsav(buf) {
  const r = new Rd(await inflate(buf));
  if (String.fromCharCode(...r.u.subarray(0, 4)) !== 'MSAV') throw new Error('nem msav'); r.p = 4;
  const ver = r.i(), region = () => { const n = r.i(); return [r.p, n]; };
  let [st, n] = region(); const meta = {};
  for (let c = r.s(), k = 0; k < c; k++) { const key = r.utf(); meta[key] = r.utf(); }
  r.p = st + n;
  const content = {};
  for (const reg of ver >= 12 ? ['patches', 'content'] : ver >= 11 ? ['content', 'patches'] : ['content']) {   // a 11 előtti mentésekben nincs patches-régió
    [st, n] = region();
    if (reg === 'content') for (let m = r.ub(), k = 0; k < m; k++) { const t = r.b(), tot = r.s(), a = []; for (let j = 0; j < tot; j++) a.push(r.utf()); content[t] = a; }
    r.p = st + n;
  }
  [st, n] = region();
  const w = r.us(), h = r.us(), N = w * h, floor = new Int16Array(N), ore = new Int16Array(N), block = new Int16Array(N);
  for (let i = 0; i < N;) { const fl = r.s(), o = r.s(), c = r.ub(); for (let j = i; j <= i + c && j < N; j++) { floor[j] = fl; ore[j] = o; } i += c + 1; }
  const builds = [];
  for (let i = 0; i < N; i++) {
    const b = r.s(), pk = r.b(), he = pk & 1, hd = pk & 4, ho = ver < 10 && (pk & 2); if (hd) r.p += 7;
    let center = true; if (he) center = r.ub() !== 0;
    block[i] = b;
    if (he) {
      if (center) {
        const ln = ver < 10 ? r.us() : r.i(), s0 = r.p; /* a 10 előtti mentésekben rövid (short) a blokkhossz */ r.b(); const o = base(r); o.x = i % w; o.y = (i / w) | 0; o.id = b;
        if (o.ok && content[1][b] === 'world-processor') try { const cl = r.i(), d = await inflate(r.u.slice(r.p, r.p + cl)), q = new Rd(d); q.ub(); const bl = q.i(); o.code = new TextDecoder().decode(d.subarray(q.p, q.p + bl)); q.p += bl; o.links = []; for (let t = q.i(), k = 0; k < t; k++) { const nm = q.utf(), lx = q.s(), ly = q.s(); o.links.push([nm, lx, ly]); } } catch (e) { }
        builds.push(o); r.p = s0 + ln;
      }
    } else if (ho) r.p += 1;
    else if (!hd) { const c = r.ub(); for (let j = i + 1; j <= i + c; j++) block[j] = b; i += c; }
  }
  let rules = {}; try { rules = parseHjson(meta.rules || '{}'); } catch (e) { }
  return { ver, meta, rules, names: content[1] || [], inames: content[0] || [], w, h, floor, ore, block, builds };
}

/* ----- pálya → Kohóvár-világ ----- */
import { FLOORS, WALLS, TREES, MFLOOR, MWALL, MPROP, ITEM_IDS, BLOCKS, MOD_ORE, MOD_DECO } from './adat.js?v=202611271237';
import { SN, ISN } from './kepadat.js?v=202611271237';
const DECO = new Set(['pebbles', 'tendrils', 'rune-overlay', 'char-overlay']);
let INV = null, INVN = 0;
export function blockOf(mname) {
  const nb = Object.keys(SN).length; if (!INV || nb !== INVN) { INVN = nb; INV = Object.create(null); for (const k in SN) if (BLOCKS[k] && !INV[SN[k]]) INV[SN[k]] = k; }
  return INV[mname] || null;
}
export function itemOf(mname) { for (const k in ISN) if (ISN[k] === mname) return k; return null; }
const ROT = [0, 3, 2, 1];
// Mindustry-csempe (y felfelé) → Kohóvár-csempe (y lefelé)
export const mtile = (m, x, y) => ({ x, y: m.h - 1 - y });
export function toWorld(m) {
  const { w, h, names } = m, N = w * h, floor = new Uint16Array(N), ore = new Uint8Array(N), wall = new Uint16Array(N), prop = new Uint8Array(N), FLK = Object.keys(FLOORS), WLK = Object.keys(WALLS);
  const fi = n => { const k = FLOORS[n] ? n : MFLOOR[n]; const i = FLK.indexOf(k || 'stone'); return i < 0 ? 0 : i; };
  const wi = n => { const k = WALLS[n] ? n : MWALL[n]; return k ? WLK.indexOf(k) + 1 : n.endsWith('-wall') || n.endsWith('-vent') || (/(shrubs?|tree|pine|cliffs?|rocks?|stone|spikes)$/.test(n) && !blockOf(n)) ? WLK.indexOf('rock') + 1 : 0; };   // az ismeretlen statikus fal is fal marad
  const fcache = {}, ocache = {}, wcache = {}, spawns = [], props = [], PN = [null];
  for (let my = 0; my < h; my++) for (let x = 0; x < w; x++) {
    const s = my * w + x, i = (h - 1 - my) * w + x;
    const fn = names[m.floor[s]]; floor[i] = fcache[fn] ??= fi(fn);
    const on = m.ore[s] ? names[m.ore[s]] : null;
    if (on) {
      if (on === 'spawn') spawns.push({ x, y: h - 1 - my });
      else if (MOD_ORE[on]) { const it = ITEM_IDS.indexOf(MOD_ORE[on]) + 1; if (it > 0) ore[i] = it; }
      else if (MOD_DECO[on]) { props.push({ x, y: h - 1 - my, n: on + 1, i }); prop[i] = 1; }
      else if (on.startsWith('ore-')) { const it = ocache[on] ??= ITEM_IDS.indexOf(itemOf(on.replace(/^ore-(wall-|crystal-)?/, ''))) + 1; if (it > 0) ore[i] = it; }   // a falérc a fal csempéjén marad
      else if (DECO.has(on)) { props.push({ x, y: h - 1 - my, n: on + (1 + ((x * 7 + my * 13) % 3)), i }); prop[i] = 1; }
      else if (FLOORS[on] || MFLOOR[on]) floor[i] = fcache[on] ??= fi(on);
    }
    const bn = names[m.block[s]];
    if (bn && bn !== 'air') {
      if (MPROP.has(bn)) { props.push({ x, y: h - 1 - my, n: bn + (1 + ((x * 5 + my * 11) % 2)), r: ((x * 31 + my * 17) % 4) * 90, i }); prop[i] = 1; }
      else { const wv = wcache[bn] ??= wi(bn); if (wv) { wall[i] = wv; if (TREES.has(bn)) props.push({ x, y: h - 1 - my, n: /^(crystal|vibrant)/.test(bn) ? bn + (1 + (x * 7 + my * 3) % 3) : bn, r: ((x * 31 + my * 17) % 4) * 90, tree: 1, i }); } }
    }
  }
  const mapB = [], scripts = []; let core = null;
  for (const b of m.builds) {
    const nm = names[b.id];
    if (b.code) { scripts.push({ x: b.x, y: h - 1 - b.y, team: b.team, code: b.code, links: (b.links || []).map(([n, lx, ly]) => [n, lx, h - 1 - ly]) }); continue; }
    const t = blockOf(nm) || (/(^|-)core-/.test(nm) ? (names.includes('core-bastion') || m.rules.planet === 'erekir' ? 'bastion' : 'core') : null); if (!t) continue;   /* ismeretlen magtípus: a bolygó alapmagja */ const B = BLOCKS[t], o = (B.s - 1) >> 1, x = b.x - o, y = h - b.y + o - B.s;
    const items = {}; if (b.items) for (const id in b.items) { const it = itemOf(m.inames[id]); if (it) items[it] = b.items[id]; }
    const e = { t, x, y, rot: B.rot ? ROT[b.rot & 3] : 0, team: b.team === 1 ? 1 : b.team === 0 ? 0 : 2, hp: b.hp, items, mx: b.x, my: b.y };
    if (B.type === 'core' && e.team === 1 && (!core || B.s > BLOCKS[core.t].s)) core = e; else mapB.push(e);
  }
  if (!core) { const sp = spawns[0] || { x: w >> 1, y: h >> 1 }; core = { t: 'core', x: w - sp.x - 2, y: h - sp.y - 2, items: {} }; }
  const R = m.rules, area = R.limitMapArea ? { x: R.limitX | 0, y: h - (R.limitY | 0) - (R.limitHeight | 0), w: R.limitWidth | 0, h: R.limitHeight | 0 } : null;
  return { floor, ore, wall, prop, props, spawns, coreAt: { x: core.x, y: core.y }, coreT: core.t, coreItems: core.items, mapB, scripts, area, fog: 0 };
}
