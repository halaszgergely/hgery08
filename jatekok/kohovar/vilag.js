// Kohóvár – a világ szimulációja: térképgenerálás, épületek, szállítás, folyadékok, áram, tornyok, egységek, hullámok, építés, felfedezés.
import { genMapSerpulo } from './terkep.js?v=202611282048';
import { FW } from './keret.js?v=202611282048';
import { toWorld } from './msav.js?v=202611282048';
import { TS, ITEMS, ITEM_IDS, LIQUIDS, STATUS, FLOORS, WALLS, WALL_SAND, WALL_DROP, BIO, BLOCKS, UNITS, waveUnits } from './adat.js?v=202611282048';
import { SN } from './kepadat.js?v=202611282048';
import { BCM, FOGB, FOGU } from './epitesido.js?v=202611282048';

export const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
const NX = [1, 0, -1, 0, 1, 1, -1, -1], NY = [0, 1, 0, -1, 1, -1, 1, -1];
export const FL = Object.keys(FLOORS), FLI = Object.fromEntries(FL.map((k, i) => [k, i]));
export const WL = Object.keys(WALLS);
const GAP = .4, CVCAP = 3, BUILD_RANGE = 220, MINE_RANGE = 70, CORE_RANGE = 220, REFUND = .5;
export const PLAYER = 1, ENEMY = 2, DERELICT = 0;
export const foeOf = t => t === PLAYER ? ENEMY : PLAYER;
const NONSOLID = new Set(['conveyor', 'sconv', 'conduit', 'junction', 'ljunction', 'mine']);
export const isSolid = b => !(NONSOLID.has(b.B.type) || (b.B.type === 'lrouter' && b.B.s === 1));
const UNDER = b => !isSolid(b) || (b.B.type === 'node' && b.B.s === 1);
const POW_T = new Set(['generator', 'battery', 'node', 'diode']);
export const isPow = b => POW_T.has(b.B.type) || !!b.B.power;
const pureCons = b => b.B.power && b.B.type !== 'generator' && b.B.type !== 'battery';
const wireless = b => b.B.type === 'node' || b.B.type === 'diode';
// Mindustry Block.init: buildTime = Σ darab · item.cost (üres költségnél 20), szorozva a blokk buildCostMultiplierével; tickben
let BKEY = null, BKN = 0;
const bkey = B => { const nb = Object.keys(BLOCKS).length; if (!BKEY || BKN !== nb) { BKN = nb; BKEY = new Map(); for (const k in BLOCKS) BKEY.set(BLOCKS[k], k); } return BKEY.get(B); };
export function buildTime(B) {
  if (B.__bt != null) return B.__bt;
  const mn = SN[bkey(B)], m = mn && BCM[mn]; let c = 0, any = 0;
  for (const k in B.cost) { c += B.cost[k] * (ITEMS[k] ? ITEMS[k].cost : 1); any = 1; }
  if (!any) c = 20; if (m && m[1] != null) c = m[1]; if (B.btime != null) c = B.btime;
  c *= B.bcm ?? (m ? m[0] : 1);
  return (B.__bt = Math.max(1, c));
}
const NOLEAD = new Set(['laser', 'shrap', 'sap', 'arc', 'beam', 'field', 'bomb', 'boom', 'rail']);
const wr = w => w.len || (w.k === 'bomb' ? 8 : w.sp * w.life);
// származtatott értékek (a modok betöltése után újra lefut)
export function prepContent() {
  for (const k in UNITS) { const U = UNITS[k]; U.rng = Math.max(0, ...U.w.map(wr)); U.lob = U.w.length > 0 && U.w.every(w => w.k === 'art' || w.k === 'bomb'); }
  for (const k in BLOCKS) { const B = BLOCKS[k]; B.id = k; if (B.ammo && Object.values(B.ammo).some(a => a.k === 'art')) B.lob = 1; }   // a tüzérség íves pályán a falak fölött lő
}
prepContent();
const sum = o => { let s = 0; for (const k in o) s += o[k]; return s; };
// Mindustry blokkcsoportok (BlockGroup) a ráépítéshez
const GRP = { conveyor: 'tr', sconv: 'tr', junction: 'tr', bridge: 'tr', sorter: 'tr', router: 'tr', overflow: 'tr', storage: 'tr', pump: 'lq', conduit: 'lq', lrouter: 'lq', ljunction: 'lq', lbridge: 'lq', node: 'pw', diode: 'pw', battery: 'pw', generator: 'pw', drill: 'dr', wall: 'wl', mender: 'pj', overdrive: 'pj', shield: 'pj', repair: 'pj', turret: 'tu', factory: 'un', recon: 'un' };
// a Mindustry tárgyazonosítói (döntetlennél a fúró a nagyobbat választja)
const MID = { copper: 0, lead: 1, metaglass: 2, graphite: 3, sand: 4, coal: 5, titanium: 6, thorium: 7, scrap: 8, silicon: 9, plastanium: 10, phase: 11, surge: 12, spore: 13, blast: 14, pyratite: 15 };
const ANYREP = new Set(['tr', 'lq', 'wl', 'pj', 'tu']);
const grpOf = B => B.type === 'crafter' ? (B.id === 'wextract' || B.id === 'oilext' ? 'lq' : null) : GRP[B.type] || null;
const clsOf = B => B.type + ':' + (B.mode || '');
const lqOk = (b, L) => !L || (b.lt === L[0] && b.lq >= L[1]);

/* ---------- véletlen, zaj ---------- */
export function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function hstr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function hash2(x, y, s) { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vn(x, y, s) { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); const a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), c = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, y, s) { return vn(x, y, s) * .57 + vn(x * 2.1, y * 2.1, s + 7) * .29 + vn(x * 4.3, y * 4.3, s + 13) * .14; }

/* ---------- régi térképgenerátor (csak a korábbi mentésekhez) ---------- */
const BIOMES_OLD = { grass: ['grass', 'stone', 'rock', 'sandf'], ice: ['ice', 'snow', 'snowrock', 'darksand'], stone: ['stone', 'dark', 'rock', 'sandf'], snow: ['snow', 'ice', 'snowrock', 'darksand'], sand: ['darksand', 'sandf', 'sandrock', 'sandf'], dark: ['dark', 'metal', 'darkrock', 'darksand'] };
export function genMapOld(sec) {
  const w = sec.w, h = sec.h, N = w * h, s = hstr(sec.id) % 100000, wq = sec.water || 1, R = rng(hstr(sec.id) ^ 0x9e3779b9);
  const floor = new Uint8Array(N), ore = new Uint8Array(N), wall = new Uint8Array(N), bio = BIOMES_OLD[sec.biome];
  const wallT = WL.indexOf(bio[2]) + 1;
  const cx = Math.round(w * .2), cy = Math.round(h * (.5 + (R() - .5) * .25));
  const spawns = [{ x: w - 7, y: Math.round(h * (.3 + R() * .4)) }];
  const nsp = sec.sp || 1, top = R() < .5;
  if (nsp >= 2) spawns.push({ x: Math.round(w * (.55 + R() * .2)), y: top ? 6 : h - 7 });
  if (nsp >= 3) spawns.push({ x: Math.round(w * (.45 + R() * .2)), y: top ? h - 7 : 6 });
  const wet = sec.biome !== 'sand';
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, n = fbm(x / 13, y / 13, s), m = fbm(x / 9, y / 9, s + 101), sd = fbm(x / 11, y / 11, s + 202), wa = fbm(x / 17, y / 17, s + 303);
    let f = m > .58 ? bio[1] : bio[0];
    if (sd > .8 - sec.sand * .3) f = sd > .84 - sec.sand * .3 ? 'sandf' : bio[3];
    if (wet && wa < .27 + (wq - 1) * .09) f = wa < .21 + (wq - 1) * .08 ? 'deep' : 'water';
    floor[i] = FLI[f];
    if (n > .64 || x < 2 || y < 2 || x >= w - 2 || y >= h - 2) wall[i] = wallT;
  }
  const base = FLI[bio[0]];
  const clear = (x0, y0, r, keepFloor) => { for (let y = y0 - r; y <= y0 + r; y++) for (let x = x0 - r; x <= x0 + r; x++) { if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) continue; if ((x - x0) ** 2 + (y - y0) ** 2 > r * r + r) continue; const i = y * w + x; wall[i] = 0; if (FL[floor[i]] === 'deep') floor[i] = keepFloor ? FLI.water : base; if (!keepFloor && FLOORS[FL[floor[i]]].shallow) floor[i] = base; } };
  // utak a kezdőponttól a magig, hogy a földi egységek mindig odaérjenek
  for (const sp of spawns) {
    let px = sp.x, py = sp.y, guard = 0;
    while (Math.hypot(px - cx, py - cy) > 3 && guard++ < 2000) {
      const a = Math.atan2(cy - py, cx - px) + (R() - .5) * 1.6; px += Math.cos(a) * 1.5; py += Math.sin(a) * 1.5;
      clear(Math.round(px), Math.round(py), 2, true);
    }
    clear(sp.x, sp.y, 6);
  }
  clear(cx, cy, 9);
  // ércek
  const coreD = (x, y) => Math.hypot(x - cx, y - cy);
  // ércfoltok: összefüggő, kerekded lelőhelyek (nem szórt mezők)
  ITEM_IDS.forEach((id, k) => {
    const fr = sec.ores[id]; if (!fr || id === 'sand') return;
    const minD = id === 'titanium' ? 26 : id === 'thorium' ? 42 : 8, n = Math.round(w * h / 900 * fr * (id === 'scrap' ? .7 : 1)), kk = k + 1;
    for (let q = 0, tries = 0; q < n && tries < n * 20; tries++) {
      const x0 = 4 + Math.floor(R() * (w - 8)), y0 = 4 + Math.floor(R() * (h - 8));
      if (coreD(x0, y0) < minD || wall[y0 * w + x0] || FLOORS[FL[floor[y0 * w + x0]]].shallow || FLOORS[FL[floor[y0 * w + x0]]].deep || ore[y0 * w + x0]) continue;
      q++; const r = 2 + R() * 2.6, rr = Math.ceil(r + 1.5), ph = R() * 9;
      for (let y = y0 - rr; y <= y0 + rr; y++) for (let x = x0 - rr; x <= x0 + rr; x++) {
        if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) continue; const i = y * w + x;
        if (wall[i] || FLOORS[FL[floor[i]]].shallow || FLOORS[FL[floor[i]]].deep) continue;
        const a = Math.atan2(y - y0, x - x0), edge = r * (1 + .28 * Math.sin(a * 3 + ph) + .15 * Math.sin(a * 5 + ph * 2));
        if (Math.hypot(x - x0, y - y0) <= edge) ore[i] = kk;
      }
    }
  });
  const patch = (id, x0, y0, r) => { const k = ITEM_IDS.indexOf(id) + 1, q = Math.ceil(r); for (let y = y0 - q; y <= y0 + q; y++) for (let x = x0 - q; x <= x0 + q; x++) { const i = y * w + x; if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2 || (x - x0) ** 2 + (y - y0) ** 2 > r * r + R() * 2) continue; wall[i] = 0; if (!FLOORS[FL[floor[i]]].ore) floor[i] = base; ore[i] = k; } };
  const sd = cy > h / 2 ? -1 : 1;
  patch('copper', cx + 6, cy + 6 * sd, 2.6); patch('lead', cx + 7, cy - 6 * sd, 2.2); patch('copper', cx - 6, cy - 7 * sd, 2);
  if (sec.ores.coal) patch('coal', cx - 7, cy + 7 * sd, 2.2);
  if (sec.ores.scrap) patch('scrap', cx + 11, cy, 1.6);
  { const k = FLI.sandf; for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx + 11; x <= cx + 14; x++) { const i = y * w + x; if (!ore[i] && !wall[i]) floor[i] = k; } }
  for (const sp of spawns) for (let y = sp.y - 1; y <= sp.y + 1; y++) for (let x = sp.x - 1; x <= sp.x + 1; x++) { const i = y * w + x; floor[i] = FLI.spawn; ore[i] = 0; }
  for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) ore[y * w + x] = 0;
  return { floor, ore, wall, coreAt: { x: cx - 1, y: cy - 1 }, spawns };
}

/* ---------- térképgenerátor: barlangtermek folyosókkal, több biom, ritka ércfoltok ---------- */
// térképváltozatok: 1 = legelső, 2 = barlangos (2026-11-26), 3 = a Mindustry Serpulo-generátora szerint (a mentés gv mezője dönt)
export const genFor = sec => sec.__gen ? sec.__gen : sec.map ? toWorld(sec.map) : sec.gen === 1 ? genMapOld(sec) : sec.gen === 2 ? genMap(sec) : genMapSerpulo(sec, hstr, rng);
export function genMap(sec) {
  const w = sec.w, h = sec.h, N = w * h, s = hstr(sec.id) % 100000, R = rng(hstr(sec.id) ^ 0x51ed270b), wq = sec.water || 1;
  const floor = new Uint8Array(N), ore = new Uint8Array(N), wall = new Uint8Array(N), open = new Uint8Array(N), keep = new Uint8Array(N);
  const bl = (sec.biomes || [sec.biome]).map(k => BIO[k]), F = i => FLOORS[FL[floor[i]]];
  // termek
  const SEP = 30, ms = Math.sqrt(N) * .2, rooms = [];
  for (let t = 0, T = Math.max(400, N / 30); t < T; t++) {
    const x = 16 + R() * (w - 32), y = 16 + R() * (h - 32);
    if (rooms.length > 3 && fbm(x / ms, y / ms, s + 77) < .42) continue;
    if (rooms.some(r => (r.x - x) ** 2 + (r.y - y) ** 2 < SEP * SEP)) continue;
    rooms.push({ x, y, r: 9 + R() * 8, ph: R() * 9 });
  }
  let mx = 0, my = 0; for (const r of rooms) { mx += r.x; my += r.y; } mx /= rooms.length; my /= rooms.length;
  const core = rooms.reduce((a, b) => (a.x - mx) ** 2 + (a.y - my) ** 2 > (b.x - mx) ** 2 + (b.y - my) ** 2 ? a : b); core.r = Math.max(core.r, 15);
  const cx = Math.round(core.x), cy = Math.round(core.y);
  // feszítőfa + néhány hurok
  const n = rooms.length, inT = new Uint8Array(n), best = new Float64Array(n).fill(1e18), par = new Int32Array(n).fill(-1), edges = [], has = new Set(); best[0] = 0;
  for (let k = 0; k < n; k++) {
    let u = -1; for (let i = 0; i < n; i++) if (!inT[i] && (u < 0 || best[i] < best[u])) u = i; inT[u] = 1; if (par[u] >= 0) { edges.push([u, par[u]]); has.add(Math.min(u, par[u]) * n + Math.max(u, par[u])); }
    for (let v = 0; v < n; v++) if (!inT[v]) { const d = (rooms[u].x - rooms[v].x) ** 2 + (rooms[u].y - rooms[v].y) ** 2; if (d < best[v]) { best[v] = d; par[v] = u; } }
  }
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (Math.hypot(rooms[i].x - rooms[j].x, rooms[i].y - rooms[j].y) < SEP * 1.7 && !has.has(i * n + j) && R() < .3) edges.push([i, j]);
  for (const r of rooms) {
    const q = Math.ceil(r.r * 1.45);
    for (let y = Math.max(2, Math.floor(r.y - q)); y <= Math.min(h - 3, r.y + q); y++) for (let x = Math.max(2, Math.floor(r.x - q)); x <= Math.min(w - 3, r.x + q); x++) {
      const a = Math.atan2(y - r.y, x - r.x), e = r.r * (.85 + .2 * Math.sin(a * 3 + r.ph) + .12 * Math.sin(a * 5 + r.ph * 2.3)) + (fbm(x / 6, y / 6, s + 41) - .5) * r.r * .6;
      if (Math.hypot(x - r.x, y - r.y) < e) open[y * w + x] = 1;
    }
  }
  for (let i = 0; i < N; i++) if (open[i] && fbm((i % w) / 7, Math.floor(i / w) / 7, s + 50) > .73) open[i] = 0;        // sziklatömbök a termekben
  for (const [a, b] of edges) {
    const A = rooms[a], Bq = rooms[b], len = Math.hypot(Bq.x - A.x, Bq.y - A.y), nx = -(Bq.y - A.y) / len, ny = (Bq.x - A.x) / len, amp = Math.min(12, len * .12) * (R() - .5) * 2, fr = 1 + Math.floor(R() * 2), wd = 3 + R() * 2.5;
    for (let t = 0; t <= len; t += .7) {
      const f = t / len, off = Math.sin(f * Math.PI * fr) * amp * Math.sin(f * Math.PI), px = A.x + (Bq.x - A.x) * f + nx * off, py = A.y + (Bq.y - A.y) * f + ny * off, rr = wd + (fbm(px / 9, py / 9, s + 60) - .5) * 3, q = Math.ceil(rr);
      for (let y = Math.floor(py - q); y <= py + q; y++) for (let x = Math.floor(px - q); x <= px + q; x++) { if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) continue; const d = Math.hypot(x - px, y - py); if (d <= rr) { open[y * w + x] = 1; if (d <= 2.2) keep[y * w + x] = 1; } }
    }
  }
  const disc = (x0, y0, r, fn) => { for (let y = y0 - r; y <= y0 + r; y++) for (let x = x0 - r; x <= x0 + r; x++) if (x >= 2 && y >= 2 && x < w - 2 && y < h - 2 && (x - x0) ** 2 + (y - y0) ** 2 <= r * r + r) fn(y * w + x); };
  disc(cx, cy, 10, i => { open[i] = 1; keep[i] = 1; });
  // biomok: eltorzított Voronoi-foltok
  const bs = [[cx, cy, 0]]; if (bl.length > 1) for (let k = 0, K = Math.round(N / 24000) + bl.length; k < K; k++) bs.push([R() * w, R() * h, k % bl.length]);
  const bioAt = (x, y) => { if (bl.length === 1) return bl[0]; const X = x + (fbm(x / 23, y / 23, s + 800) - .5) * 46, Y = y + (fbm(x / 23, y / 23, s + 801) - .5) * 46; let bi = 0, bd = 1e18; for (let k = 0; k < bs.length; k++) { const d = (X - bs[k][0]) ** 2 + (Y - bs[k][1]) ** 2; if (d < bd) { bd = d; bi = k; } } return bl[bs[bi][2]]; };
  const near = open.slice(); for (let p = 0; p < 3; p++) { const src = near.slice(); for (let i = w; i < N - w; i++) if (!src[i] && (src[i - 1] || src[i + 1] || src[i - w] || src[i + w])) near[i] = 1; }
  const w0 = WL.indexOf(bl[0].wall) + 1, f0 = FLI[bl[0].f[0]];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (!near[i]) { wall[i] = w0; floor[i] = f0; continue; }
    const b = bioAt(x, y); if (!open[i]) { wall[i] = WL.indexOf(b.wall) + 1; floor[i] = FLI[b.f[0]]; continue; }
    const m = fbm(x / 9, y / 9, s + 101), sd = fbm(x / 11, y / 11, s + 202);
    let f = m > .58 ? b.f[1] : b.f[0];
    if (b.x && fbm(x / 8, y / 8, s + 404) > .76 - b.x[1] * .6) f = b.x[0];
    if (sd > .8 - sec.sand * .3) f = sd > .84 - sec.sand * .3 ? 'sandf' : b.sand;
    if (b.liq && !keep[i]) { const wa = fbm(x / 17, y / 17, s + 303), q = (b.lq || 1) * wq - 1; if (wa < .27 + q * .09) f = wa < .21 + q * .08 ? b.liq[1] : b.liq[0]; }
    else if (FLOORS[f].liq && keep[i]) f = b.f[0];
    floor[i] = FLI[f];
  }
  // elérhetőség a magtól, kezdőpontok
  const dist = new Int32Array(N).fill(-1), qu = new Int32Array(N); let qh = 0, qt = 0; dist[cy * w + cx] = 0; qu[qt++] = cy * w + cx;
  while (qh < qt) { const i = qu[qh++]; for (const d of [1, -1, w, -w]) { const j = i + d; if (j < 0 || j >= N || dist[j] >= 0 || wall[j] || F(j).deep) continue; dist[j] = dist[i] + 1; qu[qt++] = j; } }
  const cand = rooms.filter(r => r !== core).map(r => ({ r, d: dist[Math.round(r.y) * w + Math.round(r.x)] })).filter(c => c.d > 40);
  const maxD = Math.max(60, ...cand.map(c => c.d)), T = Math.min(maxD * .8, 240 + Math.sqrt(N) * .12), spawns = [];
  if (cand.length) {
    const first = cand.reduce((a, b) => Math.abs(a.d - T) < Math.abs(b.d - T) ? a : b); spawns.push({ x: Math.round(first.r.x), y: Math.round(first.r.y) });
    const far = cand.filter(c => c.d >= T * .6 && c.d <= T * 1.25);
    while (spawns.length < (sec.sp || 1) && far.length) { const sep = c => Math.min(...spawns.map(p => Math.hypot(p.x - c.r.x, p.y - c.r.y))), b = far.reduce((a, c) => sep(a) > sep(c) ? a : c); if (sep(b) < 30) break; spawns.push({ x: Math.round(b.r.x), y: Math.round(b.r.y) }); }
  } else { let bi = 0; for (let i = 0; i < N; i++) if (dist[i] > dist[bi]) bi = i; spawns.push({ x: bi % w, y: Math.floor(bi / w) }); }
  for (const sp of spawns) disc(sp.x, sp.y, 6, i => { wall[i] = 0; if (F(i).liq) floor[i] = f0; });
  // ércfoltok: ritkák, de nagyobbak; a titán és a tórium a magtól távolabb
  let FA = 0; for (let i = 0; i < N; i++) if (!wall[i] && !F(i).liq) FA++;
  const ok = i => !wall[i] && !F(i).liq;
  ITEM_IDS.forEach((id, k) => {
    const fr = sec.ores[id]; if (!fr || id === 'sand') return;
    const rare = id === 'titanium' || id === 'thorium', minD = id === 'titanium' ? 34 : id === 'thorium' ? 60 : 13, cnt = Math.max(rare ? 2 : 1, Math.round(FA / 2000 * fr * (id === 'scrap' ? .7 : 1)));
    for (let q = 0, tries = 0; q < cnt && tries < cnt * 80; tries++) {
      const x0 = 4 + Math.floor(R() * (w - 8)), y0 = 4 + Math.floor(R() * (h - 8)), i0 = y0 * w + x0;
      if (!ok(i0) || ore[i0] || Math.hypot(x0 - cx, y0 - cy) < minD || !ok(i0 + 2) || !ok(i0 - 2) || !ok(i0 + 2 * w) || !ok(i0 - 2 * w)) continue;
      q++; const r = 2.2 + R() * 2.4, rr = Math.ceil(r + 1.5), ph = R() * 9;
      for (let y = y0 - rr; y <= y0 + rr; y++) for (let x = x0 - rr; x <= x0 + rr; x++) {
        if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2 || !ok(y * w + x)) continue;
        const a = Math.atan2(y - y0, x - x0); if (Math.hypot(x - x0, y - y0) <= r * (1 + .28 * Math.sin(a * 3 + ph) + .15 * Math.sin(a * 5 + ph * 2))) ore[y * w + x] = k + 1;
      }
    }
  });
  const patch = (id, x0, y0, r) => { const k = ITEM_IDS.indexOf(id) + 1; disc(x0, y0, Math.ceil(r), i => { if (Math.hypot(i % w - x0, Math.floor(i / w) - y0) > r + R() * .8) return; wall[i] = 0; if (!F(i).ore || F(i).liq) floor[i] = f0; ore[i] = k; }); };
  const sd = cy > h / 2 ? -1 : 1;
  patch('copper', cx + 6, cy + 6 * sd, 2.6); patch('lead', cx + 7, cy - 6 * sd, 2.2); patch('copper', cx - 6, cy - 7 * sd, 2);
  if (sec.ores.coal) patch('coal', cx - 7, cy + 7 * sd, 2.2);
  if (sec.ores.scrap) patch('scrap', cx + 11, cy, 1.6);
  for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx + 11; x <= cx + 14; x++) { const i = y * w + x; if (x < w - 2 && !ore[i]) { wall[i] = 0; floor[i] = FLI.sandf; } }
  for (const sp of spawns) for (let y = sp.y - 1; y <= sp.y + 1; y++) for (let x = sp.x - 1; x <= sp.x + 1; x++) { floor[y * w + x] = FLI.spawn; ore[y * w + x] = 0; }
  for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++) ore[y * w + x] = 0;
  return { floor, ore, wall, coreAt: { x: cx - 1, y: cy - 1 }, spawns };
}

/* ---------- kupac az útkereséshez ---------- */
class Heap {
  constructor(n) { this.k = new Float32Array(n); this.v = new Int32Array(n); this.n = 0; this.top = 0; }
  push(key, val) { if (this.n === this.k.length) { const k = new Float32Array(this.n * 2), v = new Int32Array(this.n * 2); k.set(this.k); v.set(this.v); this.k = k; this.v = v; } let i = this.n++; const K = this.k, V = this.v; while (i > 0) { const p = (i - 1) >> 1; if (K[p] <= key) break; K[i] = K[p]; V[i] = V[p]; i = p; } K[i] = key; V[i] = val; }
  pop() { const K = this.k, V = this.v, top = V[0], n = --this.n; this.top = K[0]; if (n > 0) { const key = K[n], val = V[n]; let i = 0; for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && K[c + 1] < K[c]) c++; if (K[c] >= key) break; K[i] = K[c]; V[i] = V[c]; i = c; } K[i] = key; V[i] = val; } return top; }
}
const rle = a => { const o = []; let v = 0, n = 0; for (let i = 0; i < a.length; i++) { if ((a[i] ? 1 : 0) === v) n++; else { o.push(n.toString(36)); v ^= 1; n = 1; } } o.push(n.toString(36)); return o.join('.'); };
const unrle = (s, a) => { let i = 0, v = 0; for (const p of s.split('.')) { const n = parseInt(p, 36); if (v) a.fill(1, i, i + n); i += n; v ^= 1; } };

export class World {
  constructor(sec, save) {
    Object.assign(this, genFor(sec));
    this.sec = sec; this.w = sec.w; this.h = sec.h; const N = this.w * this.h, w = this.w;
    this.bt = new Array(N).fill(null); this.sol = new Uint8Array(N); this.nearW = new Uint8Array(N);
    for (let i = 0; i < N; i++) this.sol[i] = this.wall[i] || this.fl(i).deep ? 1 : 0;
    for (let i = w; i < N - w; i++) if (!this.sol[i] && (this.sol[i - 1] || this.sol[i + 1] || this.sol[i - w] || this.sol[i + w])) this.nearW[i] = 1;
    this.fog = sec.fog !== 0 && sec.gen !== 1; this.seen = new Uint8Array(N); if (!this.fog) this.seen.fill(1); this.seenNew = [];
    this.blds = []; this.units = []; this.bullets = []; this.fx = []; this.plans = []; this.msgs = []; this.rebuild = []; this.shields = [];
    this.wave = 0; this.wtimer = sec.wt * 60 * 1.6; this.tick = 0; this.ver = 1; this.pdirty = 1; this.fdirty = 0; this.flowT = 0; this.fjob = null; this.nEn = 0; this.capV = -1;
    this.won = false; this.lost = false; this.graphs = []; this.flow = null; this.ctl = { mx: 0, my: 0, ax: 0, ay: 0, shoot: false };
    this.stats = { kills: 0, built: 0, placed: {}, coreIn: {} }; this.madeL = {}; this.flags = new Set(); this.rules = Object.assign({ waves: true, waveTimer: true, waveSending: true, unitCap: 0 }, sec.rules || {}); this.area = this.area || null;
    const ct = save && BLOCKS[save.core] ? save.core : this.coreT || 'core';
    this.core = this.addB(ct, save && save.cx != null ? save.cx : this.coreAt.x, save && save.cy != null ? save.cy : this.coreAt.y, 0);
    for (const k in sec.start) this.core.items[k] = sec.start[k];
    if (this.mapB && !save) for (const m of this.mapB) { if (!this.fits(BLOCKS[m.t], m.x, m.y)) continue; const b = this.addB(m.t, m.x, m.y, m.rot, null, m.team); if (m.items && b.B.type === 'core') b.items = m.items; if (m.ammo && b.ammo) b.ammo = m.ammo.map(a => ({ ...a })); if (m.lt && m.team === ENEMY) { b.lt = m.lt; b.lq = m.lq; } if (m.hp != null) b.hp = Math.max(1, Math.min(b.B.hp, m.hp)); if (m.code) b.code = m.code, b.lnk = m.links; }
    if (sec.map) { this.wave = 1; if (!save) this.wtimer = sec.wt0 || 7200 * 2; }
    this.lastCore = { ...this.core.items };
    this.player = null; this.respawn = 0;
    if (save) this.load(save);
    if (this.onInit) this.onInit();
    this.spawnPlayer(); this.fjob = this.flowBegin(); this.flowRun(1e9); this.fdirty = 0;
  }
  /* ----- mezők ----- */
  inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  inA(x, y) { const A = this.area; return !A || (x >= A.x && y >= A.y && x < A.x + A.w && y < A.y + A.h); }      // a Mindustry limitMapArea szabálya
  fits(B, x, y) { if (!B) return false; for (let yy = 0; yy < B.s; yy++) for (let xx = 0; xx < B.s; xx++) { if (!this.inb(x + xx, y + yy)) return false; const i = (y + yy) * this.w + x + xx; if (this.bt[i] || this.wall[i]) return false; } return true; }
  tb(x, y) { return this.inb(x, y) ? this.bt[y * this.w + x] : null; }
  fl(i) { return FLOORS[FL[this.floor[i]]]; }
  solidG(i) { return this.sol[i]; }
  // unit === 'w': falból bányászó (Erekir magegysége, plazmafúró) – csak a falérc vagy a fal saját anyaga
  mineItem(i, tier = 9, unit) { if (unit === 'w') { const w = this.wall[i]; if (!w) return null; const o = this.ore[i], it = o ? ITEM_IDS[o - 1] : WALL_DROP[WL[w - 1]]; return it && ITEMS[it].h <= tier ? it : null; } const o = this.ore[i]; const it = o ? ITEM_IDS[o - 1] : unit ? null : this.fl(i).ore; if (!it || this.wall[i]) return null; return ITEMS[it].h <= tier ? it : null; }   // a homokos talaj egységgel nem bányászható (playerUnmineable)
  front(b, d = b.rot) { const s = b.B.s, o = (s - 1) >> 1; return this.tb(b.x + o + DX[d] * (d === 0 ? s - o : d === 2 ? o + 1 : 0), b.y + o + DY[d] * (d === 1 ? s - o : d === 3 ? o + 1 : 0)); }
  center(b) { return { x: (b.x + b.B.s / 2) * TS, y: (b.y + b.B.s / 2) * TS }; }
  sideOf(t, src) { const dx = (src.x + src.B.s / 2) - (t.x + t.B.s / 2), dy = (src.y + src.B.s / 2) - (t.y + t.B.s / 2); return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3); }
  nbs(b) {
    if (b.nbv === this.ver) return b.nb;
    const s = b.B.s, set = new Set();
    for (let k = 0; k < s; k++) for (const [x, y] of [[b.x + s, b.y + k], [b.x + k, b.y + s], [b.x - 1, b.y + k], [b.x + k, b.y - 1]]) { const o = this.tb(x, y); if (o && o !== b) set.add(o); }
    b.nb = [...set]; b.nbv = this.ver; return b.nb;
  }
  msg(t, c) { this.msgs.push({ t, c: c || '', life: 240 }); if (this.netMsgs) this.netMsgs.push([t, c || '']); }
  /* ----- köd (Mindustry FogControl): statikus (egyszer felfedezett terep) és dinamikus (a jelenlegi látótáv) ----- */
  // épület látótávja csempében: Block.fogRadius; torony: hatótáv · fogRadiusMultiplier; mag: (30 + 20·méret)/8·3 + 13; radar: 34 · bekapcsoltság
  fogRB(b) {
    const B = b.B; if (B.__fr === undefined) { const f = FOGB[SN[bkey(B)]]; let r = B.fogR ?? (f && f[0] != null ? f[0] : -1);
      if (B.type === 'turret' && B.range) r = Math.max(Math.round(B.range / TS * ((f && f[1]) || B.fogM || 1)), r);
      if (B.type === 'core') r = Math.max(r, Math.floor((30 + 20 * B.s) / 8 * 3) + 13);
      if (B.type === 'radar') r = B.range || 34;
      B.__fr = r; }
    return B.type === 'radar' ? B.__fr * (b.rp || 0) : B.__fr;
  }
  fogRU(u) { const U = u.U; if (U.__fr === undefined) U.__fr = U.fogR ?? FOGU[u.t] ?? Math.max(58 * 3, U.r * 4) / 8; return U.__fr; }
  stampVis(A, cx, cy, r) { const w = this.w, h = this.h, R = Math.ceil(r), r2 = r * r; for (let y = Math.max(0, cy - R); y <= Math.min(h - 1, cy + R); y++) { const dy = (y - cy) ** 2; for (let x = Math.max(0, cx - R); x <= Math.min(w - 1, cx + R); x++) if ((x - cx) ** 2 + dy <= r2) A[y * w + x] = 1; } }
  updVis() {
    const N = this.w * this.h; if (!this.vis || this.vis.length !== N) { this.vis = new Uint8Array(N); this.visN = new Uint8Array(N); this.visB = new Uint8Array(N); this.visV = -1; this.visChg = []; for (const b of this.blds) if (b.team !== PLAYER) { const c = this.center(b), tx = Math.floor(c.x / TS), ty = Math.floor(c.y / TS); if (this.inb(tx, ty) && this.seen[ty * this.w + tx]) b.wv = 1; } }
    if (this.visV !== this.ver || this.tick % 30 === 0) { this.visV = this.ver; const A = this.visB; A.fill(0); for (const b of this.teamB(PLAYER)) { if (b.dead) continue; const r = this.fogRB(b); if (r > 0) { const c = this.center(b); this.stampVis(A, Math.floor(c.x / TS), Math.floor(c.y / TS), r); } } }
    const nv = this.visN; nv.set(this.visB);
    for (const u of this.units) if (u.team === PLAYER && !u.dead) { const r = this.fogRU(u); if (r > 0) this.stampVis(nv, Math.floor(u.x / TS), Math.floor(u.y / TS), r); }
    const ov = this.vis, S = this.seen, chg = this.visChg, bt = this.bt;
    for (let i = 0; i < N; i++) if (nv[i] !== ov[i]) { chg.push(i); if (nv[i]) { if (!S[i]) { S[i] = 1; this.seenNew.push(i); if (this.netSeen) this.netSeen.push(i); } const b = bt[i]; if (b && b.team !== PLAYER) b.wv = 1; } }
    if (chg.length > N) { chg.length = 0; this.visFull = 1; }
    this.vis = nv; this.visN = ov;
  }
  // látja-e a játékos csapata ezt a pontot (a mesterséges intelligencia mindent lát)
  visAt(x, y) { if (!this.fog || !this.vis) return true; const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return this.inb(tx, ty) && this.vis[ty * this.w + tx] === 1; }
  reveal(px, py, r) {
    if (!this.fog) return; const tx = Math.floor(px / TS), ty = Math.floor(py / TS), w = this.w, S = this.seen, r2 = r * r + r;
    for (let y = Math.max(0, ty - r); y <= Math.min(this.h - 1, ty + r); y++) for (let x = Math.max(0, tx - r); x <= Math.min(w - 1, tx + r); x++) { const i = y * w + x; if (!S[i] && (x - tx) ** 2 + (y - ty) ** 2 <= r2) { S[i] = 1; this.seenNew.push(i); if (this.netSeen) this.netSeen.push(i); } }
  }
  // a csapat magja: a játékosé this.core; másnál a legnagyobb mag (Mindustry: a csapat magjai közös készletet tartanak)
  coreOf(team) { if (team === PLAYER || team == null) return this.core; if (this.cofV !== this.ver) { this.cofV = this.ver; this.cof = {}; this.cofC = {}; for (const o of this.blds) if (o.B.type === 'core' && o.team !== PLAYER && !o.dead) { const p = this.cof[o.team]; if (!p || o.B.s > p.B.s) this.cof[o.team] = o; this.cofC[o.team] = (this.cofC[o.team] || 0) + o.B.cap; } for (const t in this.cof) { const c = this.cof[t]; for (const o of this.blds) if (o.B.type === 'core' && o.team === c.team && o !== c && sum(o.items) > 0) { for (const k in o.items) c.items[k] = (c.items[k] || 0) + o.items[k]; o.items = {}; } } } return this.cof[team] || null; }
  teamRule(team, k) { const T = this.rules.teams; return !!(T && T[team] && T[team][k]); }
  coreCap() { if (this.capV !== this.ver) { this.capV = this.ver; let c = this.core.B.cap; for (const o of this.blds) if (o.B.type === 'core' && o !== this.core && o.team === PLAYER) c += o.B.cap; for (const o of this.nbs(this.core)) if (o.B.type === 'storage' && !o.B.noMerge) { c += o.B.cap; for (const k in o.items) this.core.items[k] = (this.core.items[k] || 0) + o.items[k]; o.items = {}; } this.capN = c; } return this.capN; }
  linked(b) { const c = this.coreOf(b.team); return !!c && b.B.type === 'storage' && !b.B.noMerge && this.nbs(b).some(o => o.B.type === 'core' && o.team === b.team); }

  /* ----- épületek ----- */
  addB(t, x, y, rot = 0, cfg = null, team = PLAYER) {
    const B = BLOCKS[t], b = { t, B, x, y, rot, team, i: y * this.w + x, hp: B.hp, items: {}, di: 0, ps: 0, pgen: 0, pneed: 0, cfg, work: 0, prog: 0, hit: 0, lq: 0, lt: null, oq: 0, inl: [], odT: 0, odM: 1 };
    switch (B.type) {
      case 'conveyor': b.cv = []; break;
      case 'sconv': b.st = null; b.cd = 0; break;
      case 'junction': b.jb = [[], [], [], []]; break;
      case 'router': b.buf = null; b.rt = 0; break;
      case 'bridge': case 'lbridge': b.buf = []; b.link = -1; b.indir = -1; break;
      case 'driver': b.link = -1; b.rl = 0; b.ang = 0; break;
      case 'turret': b.ammo = []; b.ang = -Math.PI / 2; b.rl = 0; b.tgt = null; b.side = 1; b.heat = 0; b.burst = 0; b.bd = 0; b.chg = 0; b.beamT = 0; break;
      case 'generator': b.burn = 0; b.bm = 1; b.heat = 0; b.warm = 0; b.ft = 0; break;
      case 'battery': b.pw = 0; break;
      case 'node': b.links = []; break;
      case 'factory': if (cfg == null) b.cfg = 0; break;
      case 'recon': b.pay = null; break;
      case 'shield': b.sh = 0; b.broken = false; b.bst = 0; break;
      case 'mender': case 'overdrive': b.bst = 0; break;
      case 'mine': b.cd = 0; break;
    }
    { const FT = FW.types[B.type]; if (FT && FT.init) { if (b.cfg && typeof b.cfg === 'object') b.cfg = structuredClone(b.cfg); FT.init(this, b); } }
    for (let yy = 0; yy < B.s; yy++) for (let xx = 0; xx < B.s; xx++) { const i = (y + yy) * this.w + x + xx; this.bt[i] = b; if (this.prop && this.prop[i]) { this.prop[i] = 0; this.propV = (this.propV || 0) + 1; } }
    if (B.xlinks) { b.xt = []; for (const [X, Y] of FW.extra(B, x, y, rot)) if (this.inb(X, Y) && !this.bt[Y * this.w + X]) { const i = Y * this.w + X; this.bt[i] = b; b.xt.push(i); } }   // a nem négyzetes blokk további mezői
    this.scan(b);
    this.blds.push(b); this.ver++; this.pdirty = 1; this.fdirty = 1;
    if (B.type === 'shield') this.shields.push(b);
    if (team === PLAYER && this.fog) this.visV = -1;
    if (team === ENEMY) { this.eteam = 1; if (B.type === 'core') this.ecores = (this.ecores || 0) + 1; }
    if (B.js && FW.js) FW.js.placed(this, b);
    if (this.netLog) this.netLog.push(['add', t, x, y, rot, team, cfg ?? null, Math.round(b.hp)]);   // többjátékos: a vendégeknek
    return b;
  }
  scan(b) {           // a blokk alatti talaj: érc, folyadék, hő / spóra / olaj
    const B = b.B, cnt = {}, lq = {}; let attr = 0;
    for (let yy = 0; yy < B.s; yy++) for (let xx = 0; xx < B.s; xx++) {
      const i = (b.y + yy) * this.w + b.x + xx, f = this.fl(i);
      if (B.type === 'drill') { const it = this.mineItem(i, B.tier); if (it) cnt[it] = (cnt[it] || 0) + 1; }
      if (f.liq) lq[f.liq] = (lq[f.liq] || 0) + 1;
      attr += f[B.attr || 'heat'] || 0;
    }
    if (B.type === 'beamdrill') {          // Mindustry BeamDrill: minden sávban az első tömör csempe; ha fal és van benne érc, az számít
      const dx = DX[b.rot], dy = DY[b.rot], s = B.s, ox = dx > 0 ? b.x + s : dx < 0 ? b.x - 1 : b.x, oy = dy > 0 ? b.y + s : dy < 0 ? b.y - 1 : b.y; b.lasers = []; b.tiles = [];
      for (let p = 0; p < s; p++) { let x = ox + (dx ? 0 : p), y = oy + (dy ? 0 : p); for (let r = 0; r < B.range; r++, x += dx, y += dy) { if (!this.inb(x, y)) break; const i = y * this.w + x; if (this.wall[i]) { const it = this.mineItem(i, B.tier, 'w'); if (it) { cnt[it] = (cnt[it] || 0) + 1; b.tiles.push(i); b.lasers.push([(ox + (dx ? 0 : p) + .5 - dx * .5) * TS, (oy + (dy ? 0 : p) + .5 - dy * .5) * TS, (x + .5 - dx * .5) * TS, (y + .5 - dy * .5) * TS]); } break; } if (this.bt[i] && isSolid(this.bt[i])) break; } }
    }
    if (B.type === 'wcrafter') {           // Mindustry WallCrafter: az előtte álló falak homok-attribútuma
      const dx = DX[b.rot], dy = DY[b.rot], s = B.s, ox = dx > 0 ? b.x + s : dx < 0 ? b.x - 1 : b.x, oy = dy > 0 ? b.y + s : dy < 0 ? b.y - 1 : b.y; attr = 0;
      for (let p = 0; p < s; p++) { const x = ox + (dx ? 0 : p), y = oy + (dy ? 0 : p); if (this.inb(x, y)) { const w = this.wall[y * this.w + x]; if (w) attr += WALL_SAND[WL[w - 1]] || 0; } }
    }
    let best = null, n = 0; for (const k in cnt) { const lo = k === 'sand', blo = best === 'sand'; if (!best || (blo && !lo) || (lo === blo && (cnt[k] > n || (cnt[k] === n && MID[k] > MID[best])))) { best = k; n = cnt[k]; } }
    b.dItem = best; b.dCnt = n; b.attr = attr; b.pLiq = null; b.pCnt = 0; for (const k in lq) if (lq[k] > b.pCnt) { b.pLiq = k; b.pCnt = lq[k]; }
  }
  remB(b, boom) {
    const B = b.B;
    for (let yy = 0; yy < B.s; yy++) for (let xx = 0; xx < B.s; xx++) { const i = (b.y + yy) * this.w + b.x + xx; if (this.bt[i] === b) this.bt[i] = null; }
    for (const i of b.xt || []) if (this.bt[i] === b) this.bt[i] = null;
    const k = this.blds.indexOf(b); if (k >= 0) this.blds.splice(k, 1);
    for (const o of b.links || []) o.inl = o.inl.filter(z => z !== b);
    for (const o of b.inl) if (o.links) o.links = o.links.filter(z => z !== b);
    if (B.type === 'shield') this.shields = this.shields.filter(z => z !== b);
    b.dead = 1; this.ver++; this.pdirty = 1; this.fdirty = 1; if (this.netLog) this.netLog.push(['rem', b.x, b.y, boom ? 1 : 0]);
    if (FW.js && boom) { if (B.js) FW.js.destroyed(this, b); FW.js.ev('BlockDestroyEvent', () => ({ tile: FW.js.tile(b.x, b.y) })); }
    if (b.team === ENEMY && B.type === 'core') this.ecores--;
    if (boom) { const c = this.center(b); this.boom(c.x, c.y, B.s * 7, '#ffb347'); this.fx.push({ k: 'rubble', x: b.x, y: b.y, s: B.s, life: 1800, max: 1800 }); if (b.team === PLAYER && B.type !== 'core' && !this.plan(b.t, b.x, b.y, b.rot, b.cfg) && this.rebuild.length < 400) this.rebuild.push([b.t, b.x, b.y, b.rot, b.cfg]); }   // a lerombolt épület tervként marad (Mindustry: „szellem” blokk)
  }
  // ráépítés a Mindustry szabálya szerint (Block.canReplace): azonos csoportba tartozó blokk lecserélhető;
  // a „bármit cserélő” csoportokban (szállítás, folyadék, fal, torony, kivetítő) a nagyobb a kisebbet is, a többiben csak azonos méret vagy azonos fajta
  swap(o, B) {
    if (o.B.type === 'core' || o.B === B) return false;
    const g = grpOf(o.B); if (!g || g !== grpOf(B)) return false;
    return B.s === o.B.s || (B.s >= o.B.s && (ANYREP.has(g) || clsOf(B) === clsOf(o.B)));
  }
  okTiles(B, x, y, plans) {
    const s = B.s, isCore = B.type === 'core', onZone = isCore && this.zoneOk(B, x, y);
    if (isCore && !onZone && !(B.tier > this.core.B.tier && x <= this.core.x && y <= this.core.y && x + s >= this.core.x + this.core.B.s && y + s >= this.core.y + this.core.B.s)) return false;
    for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) {
      const X = x + xx, Y = y + yy; if (!this.inb(X, Y)) return false; const i = Y * this.w + X;
      if (this.wall[i] || (this.fl(i).deep && !B.float) || !this.seen[i] || (B.water && this.fl(i).liq !== 'water') || !this.inA(X, Y)) return false;
      const o = this.bt[i]; if (o && o.team === ENEMY) return false;
      if (o && o.team !== PLAYER && (o.x < x || o.y < y || o.x + o.B.s > x + s || o.y + o.B.s > y + s)) return false;   // elhagyatott: ráépíthető, ha teljesen lefedi
      if (o && o.team === PLAYER && !(isCore && o === this.core) && (!this.swap(o, B) || o.x < x || o.y < y || o.x + o.B.s > x + s || o.y + o.B.s > y + s)) return false;
      if (plans && this.plans.some(p => !p.brk && X >= p.x && Y >= p.y && X < p.x + p.B.s && Y < p.y + p.B.s)) return false;
      for (const sp of this.spawns) if ((X - sp.x) ** 2 + (Y - sp.y) ** 2 < 36) return false;
    }
    if (this.ecores && this.rules.enemyCoreBuildRadius) { const r = this.rules.enemyCoreBuildRadius / TS + s / 2, cx = x + s / 2, cy = y + s / 2; for (const o of this.blds) if (o.team === ENEMY && o.B.type === 'core' && Math.hypot(o.x + o.B.s / 2 - cx, o.y + o.B.s / 2 - cy) < r) return false; }
    return true;
  }
  // Erekir: új mag csak magzónára tehető (Mindustry CoreBlock.requiresCoreZone)
  zoneOk(B, x, y) { if (!B.zone) return false; const z = FL.indexOf('core-zone'); for (let yy = 0; yy < B.s; yy++) for (let xx = 0; xx < B.s; xx++) { if (!this.inb(x + xx, y + yy)) return false; const i = (y + yy) * this.w + x + xx; if (this.floor[i] !== z || (this.bt[i] && this.bt[i].team === PLAYER)) return false; } return true; }
  canPlace(t, x, y, rot = 0) {
    const B = BLOCKS[t], s = B.s; if (!this.okTiles(B, x, y, true)) return false;
    if (B.js && FW.js && !FW.js.canPlace(this, B, x, y, rot)) return false;
    if (B.xlinks) for (const [X, Y] of FW.extra(B, x, y, rot)) { if (!this.inb(X, Y)) return false; const i = Y * this.w + X; if (this.wall[i] || this.bt[i] || !this.seen[i] || (this.fl(i).deep && !B.float) || this.plans.some(p => !p.brk && X >= p.x && Y >= p.y && X < p.x + p.B.s && Y < p.y + p.B.s)) return false; }
    const any = fn => { for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) if (fn((y + yy) * this.w + x + xx)) return true; return false; };
    if (B.type === 'drill') return any(i => this.mineItem(i, B.tier));
    if (B.attr && B.aMin) { let s2 = 0; for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) s2 += this.fl((y + yy) * this.w + x + xx)[B.attr] || 0; return s2 >= B.aMin - .001; }
    if (B.type === 'pump') return any(i => this.fl(i).liq);
    if (B.mode === 'thermal') return any(i => this.fl(i).heat);
    return true;
  }
  planAt(tx, ty) { return this.plans.find(q => !q.done && tx >= q.x && ty >= q.y && tx < q.x + q.B.s && ty < q.y + q.B.s) || null; }
  // a kattintott terv a sor elejére kerül (a játékos és az építő egységek azt építik először)
  prioritize(tx, ty) { const p = this.planAt(tx, ty); if (!p) return false; this.plans.splice(this.plans.indexOf(p), 1); this.plans.unshift(p); p.stall = false; return true; }
  // a kurzor alatti forgatható épület vagy építési terv elforgatása (R)
  rotateAt(tx, ty, d) {
    const p = this.plans.find(q => !q.brk && !q.done && tx >= q.x && ty >= q.y && tx < q.x + q.B.s && ty < q.y + q.B.s);
    if (p) { if (!p.B.rot || p.B.type === 'turret' || p.B.xlinks) return false; p.rot = ((p.rot || 0) + d) % 4; return true; }
    const b = this.tb(tx, ty); if (!b || b.team !== PLAYER || !b.B.rot || b.B.type === 'turret' || b.B.xlinks) return false;
    b.rot = (b.rot + d) % 4; this.ver++; this.fdirty = 1; return true;
  }
  coreSpot(t) { const d = (BLOCKS[t].s - this.core.B.s) >> 1; return [this.core.x - d, this.core.y - d]; }
  plan(t, x, y, rot, cfg) {
    const B = BLOCKS[t]; if (B.type === 'core' && !this.zoneOk(B, x, y)) [x, y] = this.coreSpot(t);
    const o = this.tb(x, y);
    if (o && o.t === t && B.rot && B.type !== 'turret' && o.x === x && o.y === y) { if (o.rot !== rot) { o.rot = rot; this.ver++; this.pdirty = 1; if (B.type === 'beamdrill' || B.type === 'wcrafter') this.scan(o); } return true; }   // azonos blokk: csak elforgatja
    { const q = this.plans.find(p => !p.brk && p.t === t && p.x === x && p.y === y); if (q) { q.rot = rot; if (cfg != null) q.cfg = cfg; return true; } }   // azonos terv: csak elforgatja
    if (!this.canPlace(t, x, y, rot)) return false;
    this.plans.push({ t, B, x, y, rot, cfg: cfg ?? null, prog: 0, paid: {}, brk: false });
    return true;
  }
  unplan(b) {
    if (b.B.type === 'core' || b.team === ENEMY || this.plans.some(p => p.brk && p.b === b)) return false;
    this.plans.push({ t: b.t, B: b.B, x: b.x, y: b.y, rot: b.rot, b, prog: 0, paid: {}, brk: true }); return true;
  }
  cancelAt(x, y) { const n = this.plans.length; this.plans = this.plans.filter(p => { const hit = x >= p.x && y >= p.y && x < p.x + p.B.s && y < p.y + p.B.s; if (hit) { p.done = 1; for (const k in p.paid) this.addCore(k, p.paid[k], 1); } return !hit; }); return n !== this.plans.length; }
  finishPlan(p) {
    p.done = 1;
    if (p.brk) { if (!p.b.dead) { if (p.b.team === PLAYER) for (const k in p.B.cost) this.addCore(k, Math.floor(p.B.cost[k] * this.rm('buildCostMultiplier') * this.rm('deconstructRefundMultiplier', REFUND)), 1); this.remB(p.b); } return; }
    if (p.B.type === 'core' && this.zoneOk(p.B, p.x, p.y) && !(p.x <= this.core.x && p.y <= this.core.y && p.x + p.B.s >= this.core.x + this.core.B.s && p.y + p.B.s >= this.core.y + this.core.B.s)) { this.clearFor(p); const nc = this.addB(p.t, p.x, p.y, 0); this.capV = -1; this.stats.built++; this.stats.placed[nc.t] = (this.stats.placed[nc.t] || 0) + 1; this.captureNet(nc); return; }   // új mellékmag a magzónán (a küldetés BuildCount-célja is számolja)
    if (p.B.type === 'core') {
      const old = this.core, items = old.items; this.remB(old); const nb = this.addB(p.t, p.x, p.y, 0); nb.items = items; this.core = nb; if (this.netLog) this.netLog.push(['core', nb.t, nb.x, nb.y]);
      const pl = this.player; if (pl && !pl.dead) { pl.t = nb.B.unit; pl.U = UNITS[pl.t]; pl.hp = pl.U.hp; pl.wc = pl.U.w.map(() => 0); } return;
    }
    this.clearFor(p); const b = this.addB(p.t, p.x, p.y, p.rot, p.cfg), pv = p.prev || [];
    // amit a felülírt épület átad (Mindustry: overwrote): szalag tartalma, raktár készlete, akku töltése, folyadék
    for (const o of pv) {
      if (o.cv && b.cv && pv.length === 1) b.cv = o.cv;
      if (b.B.type === 'storage' && o.items) { for (const k in o.items) b.items[k] = Math.min(b.B.cap || 1e9, (b.items[k] || 0) + o.items[k]); }
      if (b.B.type === 'battery' && o.pw) b.pw = Math.min(b.B.cap || 1e9, (b.pw || 0) + o.pw);
      if (o.lq && b.B.lcap && 'lq' in b) { b.lq = Math.min(b.B.lcap, (b.lq || 0) + o.lq); b.lt = o.lt; }
      if (b.B.type === 'recon' && o.t === b.t && o.items) b.items = { ...o.items };
    }
    if (FW.js) FW.js.ev('BlockBuildEndEvent', () => ({ tile: FW.js.tile(b.x, b.y), team: FW.js.team(b.team), unit: this.player ? FW.js.unit(this.player) : null, breaking: false, config: b.cfg ?? null }));
    this.stats.built++; this.stats.placed[b.t] = (this.stats.placed[b.t] || 0) + 1; const T = b.B.type;
    if ((T === 'bridge' || T === 'lbridge') && !b.B.dir) { const pb = this['last_' + b.t], d = pb ? Math.abs(pb.x - b.x) + Math.abs(pb.y - b.y) : 0; if (pb && !pb.dead && pb.link < 0 && (pb.x === b.x || pb.y === b.y) && d > 0 && d <= b.B.range) pb.link = b.i; this['last_' + b.t] = b; }
    if (T === 'node') this.autoLink(b); else if (isPow(b)) this.linkToNodes(b);
  }
  // építés kezdetekor a felülírt épületek eltűnnek (nem jár értük visszatérítés, mint a Mindustryban)
  clearFor(p) {
    if (p.cleared) return; p.cleared = 1; p.prev = p.prev || [];
    for (let yy = 0; yy < p.B.s; yy++) for (let xx = 0; xx < p.B.s; xx++) { const o = this.tb(p.x + xx, p.y + yy); if (o && !o.dead && o.B.type !== 'core' && !p.prev.includes(o)) { p.prev.push(o); this.remB(o); } }
  }
  // a magba érkező anyag; a beérkezést számoljuk (Mindustry stats.coreItemCount), a visszatérítést nem
  addCore(k, n, refund, team = PLAYER) { if (team !== PLAYER) { const e = this.coreOf(team); if (e) e.items[k] = Math.min(this.cofC[team] || e.B.cap, (e.items[k] || 0) + n); return; } const c = this.core.items; c[k] = Math.min(this.coreCap(), (c[k] || 0) + n); if (!refund) this.stats.coreIn[k] = (this.stats.coreIn[k] || 0) + n; }
  has(cost, mult = 1) { if (this.rules.infiniteResources) return true; mult *= this.rules.buildCostMultiplier ?? 1; const c = this.core.items; for (const k in cost) if ((c[k] || 0) < Math.ceil(cost[k] * mult)) return false; return true; }
  rm(k, d = 1) { const v = this.rules[k]; return v == null || !isFinite(v) ? d : +v; }   // szabályszorzó (Mindustry Rules)

  /* ----- áram ----- */
  nodeDist(n, b) { const c = this.center(n), d = this.center(b); return Math.hypot(d.x - c.x, d.y - c.y) - (b.B.s + n.B.s) * TS / 2; }
  autoLink(n) {
    const R = n.B.range * TS, cand = [];
    for (const b of this.blds) { if (b === n || !isPow(b) || b.B.type === 'diode') continue; const d = this.nodeDist(n, b); if (d <= R) cand.push([d, b]); }
    cand.sort((a, b) => a[0] - b[0]); this.solvePower();
    for (const [, b] of cand) { if (n.links.length >= n.B.links) break; if (b.g && n.g && b.g === n.g) continue; this.link(n, b); this.pdirty = 1; this.solvePower(); }
  }
  linkToNodes(b) { for (const n of this.blds) { if (n.B.type !== 'node' || n === b || n.links.length >= n.B.links) continue; if (this.nodeDist(n, b) <= n.B.range * TS) { this.link(n, b); break; } } }
  link(n, b) { if (n.links.includes(b) || b.links?.includes(n)) return; n.links.push(b); b.inl.push(n); this.pdirty = 1; }
  unlink(n, b) { n.links = n.links.filter(z => z !== b); b.inl = b.inl.filter(z => z !== n); if (b.links) { b.links = b.links.filter(z => z !== n); n.inl = n.inl.filter(z => z !== b); } this.pdirty = 1; }
  toggleLink(n, b) { if (n.links.includes(b) || b.links?.includes(n)) this.unlink(n, b); else if (n.links.length < n.B.links) this.link(n, b); else return false; return true; }
  solvePower() {
    if (!this.pdirty) return; this.pdirty = 0; this.graphs = [];
    for (const b of this.blds) { b.g = null; b.bml = null; b.bmi = null; b.bmd = null; }
    for (const b of this.blds) if (b.B.beam && b.team !== DERELICT) {          // Mindustry BeamNode: mind a 4 irányban az első áramot használó épülethez kapcsol
      b.bml = []; b.bmd = []; const s = b.B.s, c = (s - 1) >> 1;
      for (let d = 0; d < 4; d++) { let x = b.x + c, y = b.y + c; for (let r = 1; r <= b.B.range + c; r++) { x += DX[d]; y += DY[d]; if (!this.inb(x, y)) break; const o = this.bt[y * this.w + x]; if (!o || o === b) continue; if (o.B.insul) break; if (o.team === b.team && isPow(o)) { if (!b.bml.includes(o)) { b.bml.push(o); (o.bmi = o.bmi || []).push(b); } b.bmd.push({ o, d, x, y, r }); break; } } }
    }
    for (const b0 of this.blds) {
      if (b0.g || !isPow(b0) || b0.B.type === 'diode' || b0.team === DERELICT) continue;
      const g = { m: [], bat: [], prod: 0, need: 0, stored: 0, cap: 0, sat: 0 }, st = [b0]; b0.g = g;
      while (st.length) {
        const b = st.pop(); g.m.push(b); if (b.B.type === 'battery') g.bat.push(b);
        for (const o of b.links || []) if (!o.g && !o.dead && o.team === b.team) { o.g = g; st.push(o); }
        for (const o of b.inl) if (!o.g && !o.dead && o.team === b.team) { o.g = g; st.push(o); }
        for (const o of b.bml || []) if (!o.g && !o.dead && o.team === b.team) { o.g = g; st.push(o); }
        for (const o of b.bmi || []) if (!o.g && !o.dead && o.team === b.team) { o.g = g; st.push(o); }
        if (!wireless(b)) for (const o of this.nbs(b)) if (!o.g && o.team === b.team && isPow(o) && !wireless(o) && !(pureCons(b) && pureCons(o))) { o.g = g; st.push(o); }
      }
      this.graphs.push(g);
    }
  }
  powerTick() {
    this.solvePower();
    for (const g of this.graphs) {
      let prod = 0, need = 0, stored = 0, cap = 0;
      for (const b of g.m) { prod += b.pgen; need += b.pneed; } for (const b of g.bat) { stored += b.pw; cap += b.B.capP; }
      let sat = 1;
      if (prod >= need) { let sur = prod - need; for (const b of g.bat) { if (sur <= 0) break; const a = Math.min(sur, b.B.capP - b.pw); b.pw += a; sur -= a; } }
      else { let def = need - prod, got = 0; for (const b of g.bat) { if (def <= 0) break; const a = Math.min(def, b.pw); b.pw -= a; def -= a; got += a; } sat = need > 0 ? Math.min(1, (prod + got) / need) : 1; }
      for (const b of g.m) b.ps = sat;
      g.prod = prod; g.need = need; g.stored = stored; g.cap = cap; g.sat = sat;
    }
    for (const b of this.blds) {
      if (!b.g) b.ps = 0; if (b.team !== PLAYER) continue;
      if (b.B.type === 'diode') {          // egyirányú töltéskiegyenlítés hátulról előre
        const bk = this.tb(b.x - DX[b.rot], b.y - DY[b.rot]), fr = this.tb(b.x + DX[b.rot], b.y + DY[b.rot]), g1 = bk && bk.g, g2 = fr && fr.g;
        if (g1 && g2 && g1 !== g2 && g1.cap && g2.cap && g1.stored / g1.cap > g2.stored / g2.cap) {
          let amt = (g1.stored / g1.cap - g2.stored / g2.cap) * Math.min(g1.cap, g2.cap) / 2, a2 = amt;
          for (const o of g1.bat) { const a = Math.min(amt, o.pw); o.pw -= a; amt -= a; } for (const o of g2.bat) { const a = Math.min(a2, o.B.capP - o.pw); o.pw += a; a2 -= a; }
        }
      }
    }
  }

  /* ----- tárgyátadás ----- */
  offer(t, it, src, d = 0) {
    if (!t || t === src || d > 8 || t.dead || (src && src.team !== undefined && t.team !== src.team)) return false;
    const B = t.B, I = t.items, cap = B.icap || 10;
    if (B.js && FW.js && !FW.js.accept(this, t, it, src)) return false;
    { const FT = FW.types[B.type]; if (FT) return FT.accept ? !!FT.accept(this, t, it, src) : false; }
    switch (B.type) {
      case 'conveyor': {
        const side = this.sideOf(t, src); if (side === t.rot) return false;
        if (B.armored && src.B.type !== 'conveyor' && src.B.type !== 'sconv') return false;
        const L = t.cv; if (L.length >= CVCAP) return false;
        const back = side === (t.rot + 2) % 4, min = L.length ? L[L.length - 1].p : 9;
        if (back ? min < GAP : min <= .7) return false;
        L.push({ it, p: back ? 0 : .5 }); return true;
      }
      case 'sconv': {
        if (src.B.type === 'sconv' || this.nbs(t).some(o => o.B.type === 'sconv' && this.front(o) === t)) return false;
        if (this.sideOf(t, src) === t.rot) return false;
        if (t.st && (t.st.it !== it || t.st.n >= 10)) return false;
        if (t.st) t.st.n++; else t.st = { it, n: 1, age: 0 }; return true;
      }
      case 'junction': {
        const dir = (this.sideOf(t, src) + 2) % 4, q = t.jb[dir]; if (q.length >= 6) return false;
        if (!this.tb(t.x + DX[dir], t.y + DY[dir])) return false; q.push({ it, tm: this.tick }); return true;
      }
      case 'router': if (B.duct) return this.ductIn(t, it, src); if (t.buf) return false; t.buf = it; t.from = src; t.rt = 0; return true;
      case 'sorter': case 'overflow': if (B.duct) return this.ductIn(t, it, src); {
        if (src.B.type === 'sorter' || src.B.type === 'overflow') return false;
        const dir = (this.sideOf(t, src) + 2) % 4, fwd = this.tb(t.x + DX[dir], t.y + DY[dir]), a = this.tb(t.x + DX[(dir + 1) % 4], t.y + DY[(dir + 1) % 4]), c = this.tb(t.x + DX[(dir + 3) % 4], t.y + DY[(dir + 3) % 4]);
        const sides = () => { t.flip = !t.flip; const [f1, f2] = t.flip ? [a, c] : [c, a]; return this.offer(f1, it, t, d + 1) || this.offer(f2, it, t, d + 1); };
        if (B.type === 'sorter') return ((it === t.cfg) !== !!B.inv) ? this.offer(fwd, it, t, d + 1) : sides();
        return B.inv ? sides() || this.offer(fwd, it, t, d + 1) : this.offer(fwd, it, t, d + 1) || sides();
      }
      case 'bridge': if (B.dir) { if (!this.linkB(t) || t.buf.length >= B.cap || this.sideOf(t, src) === t.rot) return false; t.buf.push(it); return true; }
      { if (t.buf.length >= 12) return false; const L = this.linkB(t); if (!L || src === L) return false; t.buf.push(it); return true; }
      case 'driver': if (this.linkB(t) && sum(I) < B.cap) { I[it] = (I[it] || 0) + 1; return true; } return false;
      case 'core': this.addCore(it, 1, 0, t.team); return true;
      case 'storage': if (this.linked(t)) { this.addCore(it, 1, 0, t.team); return true; } if ((I[it] || 0) >= B.cap) return false; I[it] = (I[it] || 0) + 1; return true;
      case 'heater': if (B.fuel !== it || (I[it] || 0) >= (B.icap || 10)) return false; I[it] = (I[it] || 0) + 1; return true;
      case 'launchpad': if (sum(I) >= B.cap) return false; I[it] = (I[it] || 0) + 1; return true;
      case 'incinerator': return t.ps > .5 || !!B.free;
      case 'crafter': { const ip = B.inpAll || B.inp; if (!ip || !ip[it] || (I[it] || 0) >= Math.max(cap, ip[it] * 2)) return false; I[it] = (I[it] || 0) + 1; return true; }
      case 'generator': {
        const ok = B.mode === 'burn' ? ITEMS[it].f >= .2 && !(ITEMS[it].ex > .5) : B.mode === 'rtg' ? ITEMS[it].rad > 0 : B.fuel === it;
        if (!ok || (I[it] || 0) >= cap) return false; I[it] = (I[it] || 0) + 1; return true;
      }
      case 'turret': {
        const a = B.ammo && B.ammo[it]; if (!a) return false; const n = a.n || 2, tot = t.ammo.reduce((s, e) => s + e.n, 0); if (tot + n > (B.maxAmmo || 30)) return false;
        const last = t.ammo[t.ammo.length - 1]; if (last && last.it === it) last.n += n; else { const old = t.ammo.find(e => e.it === it); t.ammo = t.ammo.filter(e => e.it !== it); t.ammo.push({ it, n: n + (old ? old.n : 0) }); }
        return true;
      }
      case 'factory': { const pu = B.plans[t.cfg || 0], need = ((B.pcost && B.pcost[pu]) || UNITS[pu]).cost[it]; if (!need || (I[it] || 0) >= need * 2) return false; I[it] = (I[it] || 0) + 1; return true; }
      case 'recon': { const need = B.inp[it]; if (!need || (I[it] || 0) >= need * 2) return false; I[it] = (I[it] || 0) + 1; return true; }
      case 'mender': case 'overdrive': case 'shield': if (!(B.bItem === it || (B.need && B.need[it])) || (I[it] || 0) >= 10) return false; I[it] = (I[it] || 0) + 1; return true;
    }
    return false;
  }
  dump(b, only) {
    const nb = this.nbs(b), n = nb.length; if (!n) return false;
    const keys = only || Object.keys(b.items);
    for (let k = 0; k < n; k++) {
      const t = nb[(b.di + k) % n];
      for (const it of keys) if (b.items[it] > 0 && this.offer(t, it, b)) { b.items[it]--; b.di = (b.di + k + 1) % n; return true; }
    }
    b.di = (b.di + 1) % n; return false;
  }
  // Mindustry DuctRouter / OverflowDuct: egyetlen tárgy, csak hátulról fogad; (1 - 1/speed) haladás után adja tovább
  ductIn(t, it, src) { if (t.buf || !src || this.sideOf(t, src) !== (t.rot + 2) % 4) return false; t.buf = it; t.dp = -1; return true; }
  updDuct(b, ts) {
    if (!b.buf) { b.dp = 0; return; } b.dp = (b.dp || 0) + ts * .5; if (b.dp < .75) return;
    const B = b.B, it = b.buf, at = d => { const o = this.tb(b.x + DX[d], b.y + DY[d]); return o && o.team === b.team && this.offer(o, it, b); };
    let ok = false;
    if (B.type === 'router') {
      const back = (b.rot + 2) % 4; for (let k = 0; k < 4 && !ok; k++) { const d = (b.di || 0) % 4; b.di = (d + 1) % 4; if (d === back) continue; if (b.cfg && (it === b.cfg) !== (d === b.rot)) continue; if (at(d)) ok = true; }   // incrementDump: minden vizsgált szomszéd után lép
    } else {
      const l = (b.rot + 1) % 4, r = (b.rot + 3) % 4, [s1, s2] = b.flip ? [r, l] : [l, r];
      if (B.inv) ok = at(s1) || at(s2) || at(b.rot); else ok = at(b.rot) || at(s1) || at(s2);
      if (ok) b.flip = !b.flip;
    }
    if (ok) { b.buf = null; b.dp %= .75; }
  }
  linkB(t) {
    if (t.B.dir) {     // Mindustry DirectionBridge.findLink: a forgatás irányában az első azonos híd (csapattárs) a hatótávon belül
      if (t.lkT === this.tick && t.lkV === this.ver) return t.lk; let L = null;
      for (let i = 1; i <= t.B.range && !L; i++) { const o = this.tb(t.x + DX[t.rot] * i, t.y + DY[t.rot] * i); if (o && o !== t && o.t === t.t && o.team === t.team && !o.dead) L = o; }
      t.lk = L; t.lkT = this.tick; t.lkV = this.ver; t.link = L ? L.y * this.w + L.x : -1; return L;
    }
    if (t.link < 0) return null; const o = this.bt[t.link];
    if (!o || o === t || o.dead || o.t !== t.t) { t.link = -1; return null; }
    if (t.B.type === 'driver') { if (Math.hypot(o.x - t.x, o.y - t.y) * TS > t.B.range) { t.link = -1; return null; } return o; }
    if ((o.x !== t.x && o.y !== t.y) || Math.abs(o.x - t.x) + Math.abs(o.y - t.y) > t.B.range) { t.link = -1; return null; }
    return o;
  }

  /* ----- folyadékok ----- */
  lqAccept(t, liq, src) {
    const B = t.B; if (t.lq > .01 && t.lt !== liq) return B.type === 'incinerator';
    { const FT = FW.types[B.type]; if (FT) return FT.lqAccept ? !!FT.lqAccept(this, t, liq, src) : false; }
    switch (B.type) {
      case 'conduit': return this.front(t) !== src && (!B.armored || src.B.type === 'conduit' || this.sideOf(t, src) === (t.rot + 2) % 4);
      case 'lrouter': return true;
      case 'lbridge': return !B.dir || ((!!this.linkB(t) || (src && src.t === t.t && this.linkB(src) === t)) && (!src || this.sideOf(t, src) !== t.rot));
      case 'incinerator': return t.ps > .5 || !!B.free;
      case 'turret': return B.lammo ? liq in B.lammo : !!(B.cool || B.coolReq) && LIQUIDS[liq].hc > 0;
      case 'drill': case 'beamdrill': return liq === (B.needL ? B.needL[0] : B.boostLiq || 'water');
      case 'pump': return !!B.needL && liq === B.needL[0];
    }
    return !!B.inL && B.inL[0] === liq;
  }
  // forrásból (mennyiség, kapacitás) a t célba; a szállítóelemek között a töltöttség egyenlítődik ki
  lqPush(t, liq, have, scap, src, share = 1) {
    if (!t || t.dead || have <= 0) return 0;
    if (t.B.type === 'ljunction') { const d = (this.sideOf(t, src) + 2) % 4; return this.lqPush(this.tb(t.x + DX[d], t.y + DY[d]), liq, have, scap, t, share); }
    const cap = t.B.lcap || 10;
    if (t.B.inL2 && liq === t.B.inL2[0]) { const f = Math.min(have, cap - (t.lq2 || 0), Math.max(.5, cap / 10)); if (f <= 0) return 0; t.lq2 = (t.lq2 || 0) + f; return f; }   // második bemeneti folyadék
    if (!this.lqAccept(t, liq, src)) return 0;
    if (t.B.type === 'incinerator') return Math.min(have, 2);
    let flow;
    if (t.B.lmove) { const tf = t.lq / cap, sf = have / scap; if (tf >= sf) return 0; flow = Math.min(Math.max(have - tf * scap, 0) * share, have, cap - t.lq); }
    else flow = Math.min(have, cap - t.lq, Math.max(.5, cap / 10));
    if (flow <= 0) return 0; t.lt = liq; t.lq += flow; return flow;
  }
  lqDump(b, key = 'lq', liq = b.lt, skip = null) {
    const nb = this.nbs(b), n = nb.length; if (!n || b[key] <= .001 || !liq) return;
    for (let k = 0; k < n; k++) { const t = nb[(b.di + k) % n]; if (t === skip) continue; const f = this.lqPush(t, liq, b[key], b.B.lcap || 10, b, .5); if (f > 0) { b[key] -= f; b.di = (b.di + k + 1) % n; return; } }
    b.di = (b.di + 1) % n;
  }

  /* ----- épület-frissítés ----- */
  updB(b) {
    if (b.B.js && !b.__nat && FW.js) { b.__nat = 1; try { FW.js.upd(this, b, () => this.updB(b)); } finally { b.__nat = 0; } return; }
    const B = b.B, I = b.items; b.pgen = 0; b.pneed = 0; if (b.hit > 0) b.hit--;
    const ts = b.odT > this.tick ? b.odM : 1;
    { const FT = FW.types[B.type]; if (FT) { if (FT.update) FT.update(this, b, ts); return; } }
    switch (B.type) {
      case 'conveyor': {
        const L = b.cv, v = B.mv * ts;
        for (let k = 0; k < L.length; k++) { const e = L[k], lim = k === 0 ? 1 : L[k - 1].p - GAP; e.p = Math.min(e.p + v, Math.max(e.p, lim)); }
        if (L.length && L[0].p >= 1 && this.offer(this.tb(b.x + DX[b.rot], b.y + DY[b.rot]), L[0].it, b)) L.shift();
        break;
      }
      case 'sconv': {
        if (b.cd > 0) b.cd -= ts; const s = b.st; if (!s) break; s.age = (s.age || 0) + 1; if (b.cd > 0) break;
        const nx = this.tb(b.x + DX[b.rot], b.y + DY[b.rot]);
        if (nx && nx.B.type === 'sconv' && this.front(nx) !== b) { if (!nx.st && (s.n >= 10 || s.age > 40 || s.moved)) { s.moved = 1; nx.st = s; b.st = null; nx.cd = 15; } }
        else if (nx && this.offer(nx, s.it, b) && --s.n <= 0) b.st = null;
        break;
      }
      case 'junction': for (let d = 0; d < 4; d++) { const q = b.jb[d]; if (q.length && this.tick - q[0].tm >= 26 / ts && this.offer(this.tb(b.x + DX[d], b.y + DY[d]), q[0].it, b)) q.shift(); } break;
      case 'overflow': if (B.duct) this.updDuct(b, ts); break;
      case 'router': if (B.duct) { this.updDuct(b, ts); break; } if (b.buf && (b.rt += ts) >= 8) { const nb = this.nbs(b), n = nb.length; for (let k = 0; k < n; k++) { const t = nb[(b.di + k) % n]; if (t === b.from && t.B.type === 'overflow') continue; if (this.offer(t, b.buf, b)) { b.buf = null; b.di = (b.di + k + 1) % n; break; } } } break;
      case 'bridge': if (B.dir) {      // DuctBridge.updateTile: speed tickenként egy tárgy a következő hídnak; ha nincs, előre adja tovább
        const L = this.linkB(b);
        if (L) { if (b.buf.length && L.buf.length < L.B.cap) { b.prog = (b.prog || 0) + ts; while (b.prog > B.sp && b.buf.length && L.buf.length < L.B.cap) { L.buf.push(b.buf.shift()); b.prog -= B.sp; } } }
        else if (b.buf.length && this.offer(this.tb(b.x + DX[b.rot], b.y + DY[b.rot]), b.buf[0], b)) b.buf.shift();
        break;
      } else {
        const L = this.linkB(b); let e = 1; if (B.power) { b.pneed = B.power; e = b.ps; }
        if (L) { if (e > .1 && this.tick % B.tt === 0 && b.buf.length && L.buf.length < 12) L.buf.push(b.buf.shift()); }
        else if (b.buf.length) {
          if (this.tick % 30 === 0 || b.indir < 0) { b.indir = -1; for (let d = 0; d < 4 && b.indir < 0; d++) for (let r = 1; r <= B.range; r++) { const o = this.tb(b.x + DX[d] * r, b.y + DY[d] * r); if (o && o.t === b.t && this.linkB(o) === b) { b.indir = d; break; } } }
          for (let k = 0; k < 4; k++) { const d = (b.di + k) % 4; if (d === b.indir) continue; const t = this.tb(b.x + DX[d], b.y + DY[d]); if (t && t.B.type !== 'bridge' && this.offer(t, b.buf[0], b)) { b.buf.shift(); b.di = (d + 1) % 4; break; } }
        }
        break;
      }
      case 'lbridge': {
        const L = this.linkB(b); let e = 1; if (B.power) { b.pneed = B.power; e = b.ps; }
        if (L) { if (e > .1 && b.lq > 0) { const f = this.lqPush(L, b.lt, b.lq, B.lcap, b); b.lq -= f; } }
        else if (b.lq > 0) { if (B.dir) { const f = this.lqPush(this.tb(b.x + DX[b.rot], b.y + DY[b.rot]), b.lt, b.lq, B.lcap, b); b.lq -= f; } else { let inc = null; for (const o of this.blds) if (o.t === b.t && o.link === b.i) { inc = o; break; } this.lqDump(b, 'lq', b.lt, inc); } }
        break;
      }
      case 'unloader': if (B.duct) {     // Mindustry DirectionalUnloader: 4 tickenként egy tárgy a hátsó épületből az elülsőbe; magból / maghoz kötött tárolóból nem
        if ((b.ut = (b.ut || 0) + ts) < 4) break; b.ut %= 4;
        const fr = this.tb(b.x + DX[b.rot], b.y + DY[b.rot]), bk = this.tb(b.x - DX[b.rot], b.y - DY[b.rot]);
        if (!fr || !bk || fr.team !== b.team || bk.team !== b.team || !bk.items || bk.B.type === 'core' || bk.B.type === 'turret' || this.linked(bk)) break;
        if (b.cfg) { if ((bk.items[b.cfg] || 0) > 0 && this.offer(fr, b.cfg, b)) bk.items[b.cfg]--; break; }
        for (let k = 0; k < ITEM_IDS.length; k++) { const j = ((b.uoff || 0) + k) % ITEM_IDS.length, it = ITEM_IDS[j]; if ((bk.items[it] || 0) > 0 && this.offer(fr, it, b)) { bk.items[it]--; b.uoff = j + 1; break; } }
        break;
      } else if (this.tick % 5 === 0) {
        const nb = this.nbs(b), src = [], dst = []; for (const o of nb) { if (o.B.type === 'core' || o.B.type === 'storage') src.push(o.B.type === 'core' || this.linked(o) ? this.coreOf(b.team) || o : o); else dst.push(o); }
        if (!src.length || !dst.length) break;
        let it = b.cfg;
        if (!it) for (let k = 0; k < ITEM_IDS.length; k++) { const c = ITEM_IDS[(b.di + k) % ITEM_IDS.length]; if (src.some(s => (s.items[c] || 0) > 0)) { it = c; b.di = (b.di + k + 1) % ITEM_IDS.length; break; } }
        if (!it) break; const s = src.find(o => (o.items[it] || 0) > 0); if (!s) break;
        for (let k = 0; k < dst.length; k++) { const t = dst[(b.dj = ((b.dj || 0) + 1) % dst.length)]; if (this.offer(t, it, b)) { s.items[it]--; break; } }
        break;
      }
      case 'driver': {
        b.pneed = B.power; const L = this.linkB(b), tot = sum(I); if (b.rl > 0) b.rl -= b.ps * ts;
        if (L) {
          const c = this.center(b), lc = this.center(L); b.ang = Math.atan2(lc.y - c.y, lc.x - c.x);
          if (tot >= 10 && b.rl <= 0 && b.ps > .5 && !L.incoming && sum(L.items) + tot <= L.B.cap) { const d = Math.hypot(lc.x - c.x, lc.y - c.y), sp = 5.5; this.bullets.push({ k: 'drv', x: c.x, y: c.y, vx: (lc.x - c.x) / d * sp, vy: (lc.y - c.y) / d * sp, life: d / sp, items: b.items, tgt: L, team: b.team, c: '#ffd37f', d: 0 }); b.items = {}; b.rl = B.reload; L.incoming = 1; }
        } else if (tot > 0) this.dump(b);
        break;
      }
      case 'drill': {
        // Mindustry Drill.updateTile: a melegedés (warmup) a sebességhez közelít, a haladás = darabszám · sebesség · melegedés
        if (!b.dItem) break; const cap = B.icap || 10, tot = I[b.dItem] || 0, wsp = (B.warm || .015) * ts, needOk = !B.needL || (b.lt === B.needL[0] && b.lq >= B.needL[1] * ts);
        b.warm = b.warm || 0; b.rotA = (b.rotA || 0) + b.warm * ts * (B.rotS || 2) * Math.PI / 180;
        if (B.power) b.pneed = B.power;
        const eff = (B.power ? b.ps : 1) * (needOk ? 1 : 0);
        if (tot < cap && b.dCnt > 0 && eff > 0) {
          let opt = 0; if (B.needL) b.lq -= B.needL[1] * ts; else if (b.lq >= B.boostL * ts && b.lt === (B.boostLiq || 'water')) { b.lq -= B.boostL * ts; opt = 1; }
          const speed = (1 + ((B.boost || 1) - 1) * opt) * eff;
          b.warm = b.warm < speed ? Math.min(speed, b.warm + wsp) : Math.max(speed, b.warm - wsp);
          b.prog += ts * b.dCnt * speed * b.warm; b.work = Math.min(1, b.warm);
          const delay = B.time + (B.burst ? 0 : 50 * ITEMS[b.dItem].h);
          if (b.prog >= delay) { const n = Math.floor(b.prog / delay); I[b.dItem] = Math.min(cap, tot + n); b.prog %= delay; }
        } else { b.warm = Math.max(0, b.warm - wsp); b.work = b.warm; }
        if (I[b.dItem] > 0) this.dump(b, [b.dItem]);
        break;
      }
      case 'pump': {
        if (!b.pLiq) break; let e = ts; if (B.power) { b.pneed = B.power; e *= b.ps; } if (B.needL) { if (b.lt === B.needL[0] && b.lq >= B.needL[1] * ts) b.lq -= B.needL[1] * ts; else e = 0; }
        b.oq = Math.min(B.lcap, b.oq + B.amt * b.pCnt * e); b.work = e; if (e > 0 && b.team === PLAYER) this.madeL[b.pLiq] = 1; this.lqDump(b, 'oq', b.pLiq);
        break;
      }
      case 'conduit': if (b.lq > .001) { const f = this.lqPush(this.tb(b.x + DX[b.rot], b.y + DY[b.rot]), b.lt, b.lq, B.lcap, b); b.lq -= f; } break;
      case 'lrouter': this.lqDump(b); break;
      case 'crafter': {
        const cap = B.icap || 10, lcap = B.lcap || 10;
        let R = B;
        if (B.recipes) {        // több receptes gyár (New Horizon RecipeGenericCrafter): az első teljesíthető recept
          const has = r => { for (const k in r.inp) if ((I[k] || 0) < r.inp[k]) return false; return true; };
          if (!(b.rc >= 0) || !has(B.recipes[b.rc]) && b.prog < .01) { const i = B.recipes.findIndex(has); if (i >= 0) b.rc = i; else b.rc = b.rc >= 0 ? b.rc : 0; }
          R = { ...B, ...B.recipes[b.rc] };
        }
        const outs = R.out ? Object.keys(R.out) : [], outK = outs[0] || null; let ok = lqOk(b, R.inL);
        if (R.inp) for (const k in R.inp) if ((I[k] || 0) < R.inp[k]) ok = false;
        for (const k of outs) if ((I[k] || 0) + R.out[k] > cap) ok = false;
        if (B.sep) { let o = 0; for (const k in B.sep) o += I[k] || 0; if (o >= cap) ok = false; }
        if (B.outL && b.oq >= lcap - .01 && (!B.outL2 || (b.oq2 || 0) >= lcap - .01)) ok = false;
        let am = B.attr ? (B.aBase ?? 1) + Math.min(B.aMax ?? 9, (B.aScale ?? 1) * b.attr / (B.aAvg ? B.s * B.s : 1)) : 1;
        if (B.aMin && b.attr < B.aMin - .001) am = 0;
        if (B.heatReq) am *= Math.min(B.heatMax ?? 4, (b.hIn || 0) / B.heatReq);   // hővel működő gyár (HeatCrafter)
        if (ok && am > 0) {
          if (B.power) b.pneed = B.power; const e = (B.power ? b.ps : 1) * ts;
          if (R.inL) b.lq -= R.inL[1] * e;
          if (B.outL) { b.oq = Math.min(lcap, b.oq + B.outL[1] * e * am); if (e > 0 && b.team === PLAYER) this.madeL[B.outL[0]] = 1; }
          if (B.outL2) { b.oq2 = Math.min(lcap, (b.oq2 || 0) + B.outL2[1] * e * am); if (e > 0 && b.team === PLAYER) this.madeL[B.outL2[0]] = 1; }
          if (B.heatOut) b.hOut = (b.hOut || 0) + (B.heatOut * Math.min(1, e) - (b.hOut || 0)) * .02;
          b.work = Math.min(1, b.work + .03 * e);
          if (R.time && (b.prog += e * (B.outL ? 1 : am) / R.time) >= 1) {
            b.prog = 0; for (const k in R.inp) I[k] -= R.inp[k];
            for (const k of outs) I[k] = (I[k] || 0) + R.out[k];
            if (B.sep) { let r = Math.random() * sum(B.sep); for (const k in B.sep) if ((r -= B.sep[k]) < 0) { I[k] = (I[k] || 0) + 1; break; } }
            if (outK && Math.random() < .5) { const c = this.center(b); this.fx.push({ k: 'puff', x: c.x, y: c.y, life: 30, max: 30, c: ITEMS[outK].c }); }
          }
        } else { b.work *= .95; if (B.heatOut) b.hOut = (b.hOut || 0) * .98; }
        const dk = B.outAll || outs; if (dk.length) this.dump(b, dk);
        if (B.outL2) this.lqDump(b, 'oq2', B.outL2[0]);
        if (B.sep) this.dump(b, Object.keys(B.sep));
        if (B.outL) this.lqDump(b, 'oq', B.outL[0]);
        break;
      }
      case 'incinerator': b.pneed = B.power; b.lq = 0; break;
      case 'beamdrill': {          // plazmafúró: drillTime-onként minden érintett falcsempéből egy darab
        if (!b.dItem) break; const cap = B.icap || 10; let tot = 0; for (const k in I) tot += I[k];
        if (B.power) b.pneed = B.power; const needOk = !B.needL || (b.lt === B.needL[0] && b.lq >= B.needL[1] * ts), eff = (B.power ? b.ps : 1) * (needOk ? 1 : 0), run = eff > 0 && tot < cap;
        b.warm = (b.warm || 0) + ((run ? 1 : 0) - (b.warm || 0)) * .02 * ts;
        let mul = 1; if (run) { if (B.needL) b.lq -= B.needL[1] * ts; else if (B.boostL && b.lt === B.boostLiq && b.lq >= B.boostL * ts) { b.lq -= B.boostL * ts; mul = B.boost; }
          b.prog += ts * mul * eff * b.warm; if (b.prog >= B.time) { b.prog %= B.time; for (const i of b.tiles) { const it = this.mineItem(i, B.tier, 'w'); if (it && tot < cap) { I[it] = (I[it] || 0) + 1; tot++; } } } }
        b.bw = (b.bw || 0) + ((mul > 1 ? 1 : 0) - (b.bw || 0)) * .1 * ts; b.work = b.warm; this.dump(b); break;
      }
      case 'wcrafter': {           // sziklazúzó: a falak homok-attribútumával arányosan homokot termel
        const cap = B.icap || 10; if (B.power) b.pneed = B.power; const eff = (B.power ? b.ps : 1) * b.attr;
        if ((I.sand || 0) < cap && eff > 0) { b.prog += ts * eff; b.work = Math.min(1, b.work + .05); if (b.prog >= B.time) { b.prog %= B.time; I.sand = (I.sand || 0) + 1; } } else b.work *= .95;
        if (I.sand > 0) this.dump(b, ['sand']); break;
      }
      case 'heater': {
        let e = 1; if (B.power) { b.pneed = B.power; e = b.ps; }
        if (B.inL) { if (b.lt === B.inL[0] && b.lq >= B.inL[1] * ts) b.lq -= B.inL[1] * ts; else e = 0; }
        if (B.fuel && e > 0) { if ((b.burn || 0) > 0) b.burn -= ts; else if (I[B.fuel] > 0) { I[B.fuel]--; b.burn = B.dur; } else e = 0; }
        b.hOut = (b.hOut || 0) + (B.heatOut * e - (b.hOut || 0)) * .02 * ts; b.work = e; break;
      }
      case 'radar': b.pneed = B.power; b.rotA = (b.rotA || 0) + .02 * b.ps; b.rp = (b.rp || 0) + ((b.ps > .5 ? 1 : 0) - (b.rp || 0)) * .02; break;   // Radar: a látótáv a bekapcsoltsággal együtt nő
      case 'btower': {           // építőtorony: a hatótávján belüli terveket építi, a lerombolt épületeket újraépíti
        b.pneed = B.power; const ok = b.ps > .5 && lqOk(b, [B.inL[0], B.inL[1] * ts]); b.work = ok ? 1 : 0; if (!ok) break; const c = this.center(b);
        if (!this.plans.length && this.rebuild.length && !this.nEn && this.tick % 30 === b.i % 30) { const [t, x, y, rot, cfg] = this.rebuild.shift(); this.plan(t, x, y, rot, cfg); }
        const pl = this.plans.find(p => !p.stall && Math.hypot((p.x + p.B.s / 2) * TS - c.x, (p.y + p.B.s / 2) * TS - c.y) <= B.range);
        if (pl) { b.lq -= B.inL[1] * ts; b.fu = b.fu || { U: { build: B.build }, x: c.x, y: c.y }; this.buildPlan(b.fu, pl); b.tgtP = pl; } else b.tgtP = null; break;
      }
      case 'shock': {            // lökéshullám-torony: időnként minden ellenséges lövedéket gyengít a hatótávján belül
        b.pneed = B.power; if (b.ps < .5 || !lqOk(b, [B.inL[0], .01])) break;
        if ((b.prog += ts) < B.reload) break; const c = this.center(b); let n = 0;
        for (const q of this.bullets) if (q.team !== b.team && Math.hypot(q.x - c.x, q.y - c.y) < B.range) { q.d -= B.bulletDmg; if (q.d <= 0) q.life = 0; n++; }
        if (n) { b.prog = 0; b.lq -= B.inL[1] * B.reload; this.fx.push({ k: 'ring', x: c.x, y: c.y, r: B.range, life: 20, max: 20, c: '#ffd37f' }); } else b.prog = B.reload; break;
      }
      case 'heatcond': b.hOut = (b.hOut || 0) + ((b.hIn || 0) - (b.hOut || 0)) * .1 * ts; break;
      case 'lamp': b.pneed = B.power; break;
      case 'generator': this.updGen(b, ts); break;
      case 'mender': {
        b.pneed = B.power; if (b.bst > 0) b.bst--; else if (I[B.bItem] > 0) { I[B.bItem]--; b.bst = 400; }
        if ((b.prog += b.ps * ts) >= B.reload) {
          b.prog = 0; const c = this.center(b), R = B.range + (b.bst > 0 ? B.bRange : 0), hl = (B.heal + (b.bst > 0 ? B.bHeal : 0)) / 100 * b.ps;
          this.fx.push({ k: 'ring', x: c.x, y: c.y, r: R, life: 30, max: 30, c: '#84f491' });
          for (const o of this.teamB(b.team)) if (o.hp < o.B.hp) { const oc = this.center(o); if (Math.hypot(oc.x - c.x, oc.y - c.y) <= R + o.B.s * 4) o.hp = Math.min(o.B.hp, o.hp + o.B.hp * hl); }
        }
        break;
      }
      case 'overdrive': {
        b.pneed = B.power; let on = b.ps > .5;
        if (B.need) { if (b.bst > 0) b.bst--; else if (Object.keys(B.need).every(k => (I[k] || 0) >= B.need[k])) { for (const k in B.need) I[k] -= B.need[k]; b.bst = B.useT; } on = on && b.bst > 0; }
        else if (b.bst > 0) b.bst--; else if (I[B.bItem] > 0) { I[B.bItem]--; b.bst = 400; }
        b.work = on ? 1 : 0;
        if (on && this.tick % 60 === (b.i % 60)) {
          const c = this.center(b), bo = !B.need && b.bst > 0, R = B.range + (bo ? B.bRange : 0), m = B.od + (bo ? B.bOd : 0);
          for (const o of this.teamB(b.team)) if (o.B.type !== 'overdrive') { const oc = this.center(o); if (Math.hypot(oc.x - c.x, oc.y - c.y) <= R + o.B.s * 4 && !(o.odT > this.tick && o.odM > m)) { o.odT = this.tick + 62; o.odM = m; } }
        }
        break;
      }
      case 'shield': {
        b.pneed = B.power; if (b.bst > 0) b.bst--; else if (I[B.bItem] > 0) { I[B.bItem]--; b.bst = 350; }
        b.on = b.ps > .5 && !b.broken; b.rad = B.radius + (b.bst > 0 ? B.bRadius : 0);
        if (b.sh > 0) b.sh = Math.max(0, b.sh - (b.broken ? B.broken : B.regen) * (b.ps > .5 ? 1 : 0));
        if (b.broken && b.sh <= 0) b.broken = false;
        break;
      }
      case 'mine': if (b.cd > 0) b.cd--; else if (this.tick % 4 === 0) {
        const c = this.center(b); for (const u of this.units) if (u.team === foeOf(b.team) && !u.dead && !u.U.air && Math.abs(u.x - c.x) < 6 + u.U.r && Math.abs(u.y - c.y) < 6 + u.U.r) { for (let k = 0; k < B.cnt; k++) this.lightning(c.x, c.y, Math.random() * 7, B.d, b.team); b.cd = 80; this.dmgB(b, 7); break; }
      } break;
      case 'launchpad': {
        b.pneed = B.power; if ((b.prog += b.ps * ts) >= B.time) { b.prog = 0; if (sum(I) > 0) { const c = this.center(b); this.fx.push({ k: 'launch', x: c.x, y: c.y, life: 60, max: 60, c: '#ffd37f' }); if (this.onLaunch && b.team === PLAYER) this.onLaunch(I); b.items = {}; } }
        break;
      }
      case 'factory': {
        const ut = B.plans[b.cfg || 0], U0 = UNITS[ut]; if (!U0) break; const pc = B.pcost && B.pcost[ut], U = pc ? { cost: pc.cost, time: pc.time } : U0, ucm = this.rm('unitCostMultiplier'); let ok = true; for (const k in U.cost) if ((I[k] || 0) < Math.ceil(U.cost[k] * ucm)) ok = false;
        if (ok && (b.team !== PLAYER || this.canUnit(ut)) && this.countU(ut, b.team) < ((this.coreOf(b.team) || this.core).B.ucap)) {
          b.pneed = B.power; b.prog += b.ps * ts * this.rm('unitBuildSpeedMultiplier') / (U.time * 60); b.work = Math.min(1, b.work + .03);
          if (b.prog >= 1) { b.prog = 0; for (const k in U.cost) I[k] -= Math.ceil(U.cost[k] * ucm); this.outUnit(b, ut); }
        } else b.work *= .95;
        break;
      }
      case 'recon': {
        if (!b.pay) { b.work *= .95; break; } let ok = lqOk(b, B.inL); for (const k in B.inp) if ((I[k] || 0) < B.inp[k]) ok = false;
        if (ok) { b.pneed = B.power; const e = b.ps * ts; if (B.inL) b.lq -= B.inL[1] * e; b.work = Math.min(1, b.work + .03); if ((b.prog += e / B.time) >= 1) { b.prog = 0; for (const k in B.inp) I[k] -= B.inp[k]; const to = B.up[b.pay]; b.pay = null; this.outUnit(b, to); } } else b.work *= .95;
        break;
      }
      case 'repair': {
        b.pneed = B.power; const c = this.center(b); if (this.tick % 20 === (b.i % 20) || (b.tgt && (b.tgt.dead || b.tgt.hp >= b.tgt.U.hp))) { b.tgt = null; let bd = B.range; for (const u of this.units) if (u.team === b.team && !u.dead && u.hp < u.U.hp) { const d = Math.hypot(u.x - c.x, u.y - c.y); if (d < bd) { bd = d; b.tgt = u; } } }
        if (b.tgt && b.ps > .1) { b.tgt.hp = Math.min(b.tgt.U.hp, b.tgt.hp + B.rep * b.ps * ts); b.ang = Math.atan2(b.tgt.y - c.y, b.tgt.x - c.x); }
        break;
      }
      case 'turret': this.updTurret(b, ts); break;
    }
  }
  updGen(b, ts) {
    const B = b.B, I = b.items; let p = 0;
    switch (B.mode) {
      case 'solar': p = B.gen * this.rm('solarMultiplier'); break;
      case 'thermal': p = b.attr >= (B.aMin || 0) - .001 ? B.gen * b.attr : 0; if (B.outL && p > 0) { b.oq = Math.min(B.lcap || 10, (b.oq || 0) + B.outL[1] * b.attr * ts); this.madeL[B.outL[0]] = 1; } if (B.outL) this.lqDump(b, 'oq', B.outL[0]); break;
      case 'liq': {
        let run = lqOk(b, [B.inL[0], B.inL[1] * ts]) && (b.lq2 || 0) >= B.inL2[1] * ts;
        if (run && B.fuel) { if ((b.burn || 0) > 0) b.burn -= ts; else if (I[B.fuel] > 0) { I[B.fuel]--; b.burn = B.dur; } else run = false; }
        if (run) { b.lq -= B.inL[1] * ts; b.lq2 -= B.inL2[1] * ts; p = B.gen; if (B.outL) { b.oq = Math.min(B.lcap || 10, (b.oq || 0) + B.outL[1] * ts); this.madeL[B.outL[0]] = 1; } }
        if (B.heatOut) b.hOut = (b.hOut || 0) + ((run ? B.heatOut : 0) - (b.hOut || 0)) * .02 * ts;
        if (B.outL) this.lqDump(b, 'oq', B.outL[0]); break;
      }
      case 'liq1': if (lqOk(b, [B.inL[0], B.inL[1] * ts])) { b.lq -= B.inL[1] * ts; p = B.gen; } break;   // egyetlen folyadékot égető generátor
      case 'flux': if (lqOk(b, [B.inL[0], B.inL[1] * ts])) { b.lq -= B.inL[1] * ts; p = B.gen * Math.min(1, (b.hIn || 0) / B.heatReq); } break;   // fluxusreaktor: a teljesítmény a kapott hővel arányos   // több folyadékot égető generátor
      case 'burn': case 'item': case 'rtg': {
        const L = lqOk(b, B.inL);
        if (b.burn <= 0 && L) { const it = Object.keys(I).find(k => I[k] > 0); if (it) { I[it]--; b.burn = B.dur * (B.mode === 'rtg' && it === 'phase' ? 15 : B.mode === 'burn' && it === 'pyratite' ? 3 : 1); b.bm = B.mode === 'burn' ? ITEMS[it].f : B.mode === 'rtg' ? ITEMS[it].rad : 1; } }
        if (b.burn > 0 && L) { b.burn -= ts; if (B.inL) b.lq -= B.inL[1] * ts; p = B.gen * b.bm; }
        break;
      }
      case 'reactor': {
        const fuel = I.thorium || 0, full = fuel / B.icap;
        if (fuel > 0) { b.heat += full * .005 * ts; if ((b.ft += ts) >= B.dur) { b.ft = 0; I.thorium--; } p = B.gen * full; } else b.heat = Math.max(0, b.heat - 1 / 1200);
        if (b.heat > 0 && b.lq > 0 && b.lt === 'cryo') { const used = Math.min(b.lq, b.heat / .125); b.heat -= used * .125; b.lq -= used; }
        if (b.heat >= 1) { const c = this.center(b); this.remB(b, 1); this.msg('Egy tóriumreaktor túlhevült és felrobbant!', 'bad'); this.splashAll(c.x, c.y, 150, 5000); return; }
        break;
      }
      case 'impact': {
        b.pneed = B.power; const L = lqOk(b, B.inL);
        if (b.burn <= 0 && L && b.ps >= .99 && I.blast > 0) { I.blast--; b.burn = B.dur; }
        if (b.burn > 0 && L && b.ps >= .99) { b.burn -= ts; b.lq -= B.inL[1] * ts; b.warm += (1 - b.warm) * .001 * ts; if (b.warm > .999) b.warm = 1; } else b.warm += (0 - b.warm) * .01;
        p = B.gen * b.warm ** 5; break;
      }
    }
    b.pgen = p; b.work = p > 0 ? Math.min(1, b.work + .05) : b.work * .95;
  }
  canUnit() { return true; }
  losB(u, b) { const c = this.center(b), s = b.B.s * 4 - 1; return this.losT(u.x, u.y, Math.max(c.x - s, Math.min(c.x + s, u.x)), Math.max(c.y - s, Math.min(c.y + s, u.y))); }
  // a lövésvonal: a Mindustryhez hasonlóan a térkép falai fölött át lehet lőni, így mindig szabad (a régi falvizsgálat _losT néven megmaradt)
  losT() { return true; }
  _losT(x0, y0, x1, y1) {
    const w = this.w; let tx = Math.floor(x0 / TS), ty = Math.floor(y0 / TS); const ex = Math.floor(x1 / TS), ey = Math.floor(y1 / TS), dx = x1 - x0, dy = y1 - y0;
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, ddx = dx ? Math.abs(TS / dx) : 1e9, ddy = dy ? Math.abs(TS / dy) : 1e9;
    let mx = dx ? ((sx > 0 ? (tx + 1) * TS - x0 : x0 - tx * TS) / Math.abs(dx)) : 1e9, my = dy ? ((sy > 0 ? (ty + 1) * TS - y0 : y0 - ty * TS) / Math.abs(dy)) : 1e9;
    for (let k = 0; k < 400; k++) {
      if (tx === ex && ty === ey) return true;
      if (mx < my) { mx += ddx; tx += sx; } else { my += ddy; ty += sy; }
      if (!this.inb(tx, ty) || this.wall[ty * w + tx]) return tx === ex && ty === ey && this.inb(tx, ty) ? true : false;
    }
    return true;
  }
  // robbanás → épület: a sziklafal és a közelebbi tömör épület (pl. fal) eltakarja a mögötte állót
  shielded(x, y, b) {
    const c = this.center(b), d = Math.hypot(c.x - x, c.y - y), n = Math.floor(d / 3);
    for (let k = 1; k < n; k++) { const px = x + (c.x - x) * k / n, py = y + (c.y - y) * k / n, tx = Math.floor(px / TS), ty = Math.floor(py / TS); if (!this.inb(tx, ty)) return true; const i = ty * this.w + tx; const o = this.bt[i]; if (o && o !== b && !o.dead && !UNDER(o) && Math.hypot(px - x, py - y) > o.B.s * 4) return true; }
    return false;
  }
  wet(x, y) { const tx = Math.floor(x / TS), ty = Math.floor(y / TS), i = ty * this.w + tx; return this.inb(tx, ty) && !this.wall[i] && this.fl(i).liq === 'water'; }
  countU(t, team = PLAYER) { let n = 0; for (const u of this.units) if (u.team === team && u.t === t && !u.dead) n++; return n; }
  outUnit(b, ut) {
    const fb = this.front(b);
    { const FT = fb && !fb.dead && FW.types[fb.B.type]; if (FT && FT.payAccept && FT.payAccept(this, fb, { u: ut }, b)) return; }   // rakománytovábbító a gyár előtt
    if (fb && fb.B.type === 'recon' && fb.team === b.team && fb.B.up[ut] && (b.team !== PLAYER || this.canUnit(fb.B.up[ut])) && !fb.pay && !fb.dead) { fb.pay = ut; fb.prog = 0; return; }
    const c = this.center(b), d = b.B.s * 4 + UNITS[ut].r + 4; let sx = c.x + DX[b.rot] * d, sy = c.y + DY[b.rot] * d;
    if (UNITS[ut].naval && !this.wet(sx, sy)) { let bd = 1e9; const tx = Math.floor(sx / TS), ty = Math.floor(sy / TS); for (let yy = ty - 8; yy <= ty + 8; yy++) for (let xx = tx - 8; xx <= tx + 8; xx++) { const px = (xx + .5) * TS, py = (yy + .5) * TS, q = Math.hypot(px - sx, py - sy); if (q < bd && this.wet(px, py) && !this.bt[yy * this.w + xx]) { bd = q; c.wx = px; c.wy = py; } } if (bd < 1e9) { sx = c.wx; sy = c.wy; } }
    const u = this.spawnU(ut, b.team, sx, sy); u.home = UNITS[ut].naval ? { x: sx, y: sy } : { x: c.x + DX[b.rot] * (d + 26), y: c.y + DY[b.rot] * (d + 26) };
  }

  /* ----- tornyok ----- */
  updTurret(b, ts) {
    const B = b.B, c = this.center(b), pw = B.power && !(b.team !== PLAYER && this.teamRule(b.team, 'cheat')) ? b.ps : 1, foe = foeOf(b.team);
    if (b.heat > 0) b.heat -= .05;
    if (B.pam) { b.ammo = pw > .1 ? [{ it: '_p', n: 1e9 }] : []; if (b.tgt) b.pneed = B.power; }   // modbeli áramtorony: az áram a lőszer
    const am = B.ammo ? b.ammo[b.ammo.length - 1] : null, st = am ? B.ammo[am.it] : null, range = B.range + (st && st.rg || 0);
    if (B.pd) {                       // pontvédelem: az ellenséges lövedékeket lövi le
      b.pneed = B.power; if (b.rl > 0) { b.rl -= pw * ts; return; } if (pw < .5) return;
      let best = null, bd = range; for (const q of this.bullets) if (q.team === foe && !q.k) { const d = Math.hypot(q.x - c.x, q.y - c.y); if (d < bd) { bd = d; best = q; } }
      if (best) { b.ang = Math.atan2(best.y - c.y, best.x - c.x); best.d -= B.pd; if (best.d <= 0) best.life = 0; this.fx.push({ k: 'laser', x: c.x, y: c.y, x2: best.x, y2: best.y, life: 6, max: 6, c: '#ffe39a', w: 1 }); b.rl = B.reload; b.heat = 1; }
      return;
    }
    if (this.tick % 8 === (b.i & 7) || (b.tgt && b.tgt.dead)) {
      let best = null, bd = 1e9;
      for (const u of this.units) { if (u.team !== foe || u.dead) continue; if (u.U.air ? !B.air : !B.ground) continue; const d = Math.hypot(u.x - c.x, u.y - c.y) - u.U.r; if (d < range && d < bd && (B.lob || this.losT(c.x, c.y, u.x, u.y))) { bd = d; best = u; } }
      if (!best && B.ground && (this.tick % 32 === (b.i & 31) || (b.tgt && b.tgt.bl))) { let o = null, od = range; for (const q of this.teamB(foe)) { if (q.B.type === 'mine') continue; const d = Math.hypot((q.x + q.B.s / 2) * TS - c.x, (q.y + q.B.s / 2) * TS - c.y) - q.B.s * 4; if (d < od && (B.lob || this.losB({ x: c.x, y: c.y }, q))) { od = d; o = q; } } if (o) best = this.bref(o); }   // épületre is lő (Mindustry: targetGround)
      b.tgt = best;
    }
    const u = b.tgt; let rate = pw * ts;
    if (B.power && (u || b.rl > 0 || b.beamT > 0)) b.pneed = B.power;
    if (B.coolReq) { rate = 0; if (b.rl > 0 && b.lq > 0 && LIQUIDS[b.lt].hc) { const used = Math.min(b.lq, B.coolReq * ts); b.lq -= used; rate = used * LIQUIDS[b.lt].hc * 5 * pw; } }
    else if (B.cool && b.rl > 0 && b.lq > .01 && u) { const used = Math.min(b.lq, B.cool * ts); b.lq -= used; rate += used * LIQUIDS[b.lt].hc * (B.coolM || 5); }
    b.rl = Math.max(0, b.rl - rate);
    if (b.beamT > 0) {                // folyamatos lézer (Olvadás)
      b.beamT--; if (u) { const ta = Math.atan2(u.y - c.y, u.x - c.x), da = ((ta - b.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI; b.ang += Math.max(-.02, Math.min(.02, da)); }
      if (this.tick % 5 === 0) { const e = this.lineDmg(c.x, c.y, b.ang, B.beam.len, B.beam.d * pw, b.team, { air: 1, ground: 1, wide: 5 }); b.bx = e.x; b.by = e.y; }
      b.heat = 1; if (b.beamT <= 0) b.rl = B.reload; return;
    }
    if (!u) { b.chg = 0; b.beam = null; return; }
    const P = st && st.sp && st.k !== 'shrap' && st.k !== 'rail' ? this.intercept(c.x, c.y, u, st.sp, st.k === 'art' ? 0 : B.s * 4 + 3) : u; b.aimX = P.x; b.aimY = P.y;   // előretartás (Mindustry Predict.intercept)
    const ta = Math.atan2(P.y - c.y, P.x - c.x), da = ((ta - b.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI, rs = (B.rspd || .14 / Math.sqrt(B.s)) * ts;
    b.ang += Math.max(-rs, Math.min(rs, da));
    if (Math.abs(da) > .3) return;
    if (B.tractor && u.bl) return;
    if (B.tractor) { b.beam = null; if (pw < .1) return; const d = Math.hypot(u.x - c.x, u.y - c.y) || 1, f = B.tractor.force * pw / (1 + u.U.r / 12); u.x -= (u.x - c.x) / d * f; u.y -= (u.y - c.y) / d * f; u.vx *= .9; u.vy *= .9; this.dmgU(u, B.tractor.d * pw, 1); b.beam = u; return; }
    if (b.burst > 0) { if (--b.bd <= 0) { this.fireAmmo(b, c); b.burst--; b.bd = B.sd; } return; }
    if (b.rl > 0) return;
    if (B.laser) { if (pw < .1) return; if (b.chg < B.laser.charge) { b.chg += ts; b.heat = b.chg / B.laser.charge; return; } b.chg = 0; this.lineDmg(c.x, c.y, b.ang, B.laser.len, B.laser.d, b.team, { air: 0, ground: 1, pierce: B.laser.pierce, fx: '#a9d8ff', wide: 4 }); b.rl = B.reload; b.heat = 1; return; }
    if (B.arcd) { if (pw < .1) return; this.lightning(c.x, c.y, b.ang, B.arcd, b.team); b.rl = B.reload; b.heat = 1; return; }
    if (B.beam) { if (pw >= .5) b.beamT = B.beam.dur; return; }
    if (B.lflame) {                 // folyamatos láng folyadék-lőszerrel (Szublimáló): 5 lépésenként sebez a vonalán
      const L = B.pam ? (pw > .5 ? B.lflame._p : null) : B.lflame[b.lt]; if (!L || (!B.pam && b.lq < .05)) return; if (!B.pam) b.lq = Math.max(0, b.lq - B.luse * B.reload); b.rl = B.reload; b.heat = 1;
      this.lineDmg(c.x, c.y, b.ang, L.len, L.d, b.team, { air: 1, ground: 1, pierce: L.pierce, fx: L.c, wide: 5, bdm: .3 }); return;
    }
    if (B.lammo) {
      if (!(b.lt in B.lammo) || b.lq < 1 / B.lam) return;
      for (let k = 0; k < (B.shots || 1) && b.lq >= 1 / B.lam; k++) { b.lq -= 1 / B.lam; const a = b.ang + (Math.random() - .5) * .12, mz = B.s * 4 + 2, o = (k - ((B.shots || 1) - 1) / 2) * 4; this.bullets.push({ k: 'liq', x: c.x + Math.cos(a) * mz - Math.sin(a) * o, y: c.y + Math.sin(a) * mz + Math.cos(a) * o, vx: Math.cos(a) * B.lsp, vy: Math.sin(a) * B.lsp, life: range / B.lsp + 3, d: B.lammo[b.lt], team: PLAYER, air: 1, ground: 1, st: LIQUIDS[b.lt].st, stT: 240, liq: b.lt, c: LIQUIDS[b.lt].c }); }
      b.rl = B.reload; return;
    }
    if (!st || (st.k === 'rail' && pw < .5)) return;
    b.rl = B.reload / (st.rlm || 1);
    const shots = B.shots || 1; this.fireAmmo(b, c);
    if (shots > 1) { if (B.sd) { b.burst = shots - 1; b.bd = B.sd; } else for (let k = 1; k < shots; k++) this.fireAmmo(b, c, k); }
  }
  rangeBonus(b) { const am = b.ammo && b.ammo[b.ammo.length - 1]; return am && b.B.ammo[am.it].rg || 0; }
  fireAmmo(b, c, idx = 0) {
    const B = b.B, am = b.ammo[b.ammo.length - 1]; if (!am) { b.burst = 0; return; }
    const st = B.ammo[am.it], range = B.range + (st.rg || 0), col = ITEMS[am.it] ? ITEMS[am.it].c : '#ffe39a';
    if (B.each || (idx === 0 && b.burst === 0)) { if (--am.n <= 0) b.ammo.pop(); }
    b.heat = 1; let off = 0; if (B.alt) { b.side = -b.side; off = B.s * 1.6 * b.side; } else if (B.shots > 1) off = ((b.burst + idx) % 4 - 1.5) * B.s * .9;
    const mz = B.s * 4 + 3, x = c.x + Math.cos(b.ang) * mz - Math.sin(b.ang) * off, y = c.y + Math.sin(b.ang) * mz + Math.cos(b.ang) * off, u = b.tgt;
    const bdmR = this.rm('blockDamageMultiplier'), base = { ab: this.aimB(b.tgt, null), jsb: st.jsb, team: b.team, c: st.c || col, c2: st.c2, sz: st.sz, tr: st.tr, st: st.st, stT: st.stT, spl: st.spl && st.spl * bdmR, splR: st.splR, frag: st.frag, zap: st.zap, zapD: st.zapD, d: st.d * bdmR, bdm: st.bdm };
    switch (st.k) {
      case 'shrap': { const n = B.spread || 1; for (let k = 0; k < n; k++) this.lineDmg(c.x, c.y, b.ang + (k - (n - 1) / 2) * .35, st.len, st.d, b.team, { air: 1, ground: 1, fx: col, wide: 5 }); return; }
      case 'rail': { this.lineDmg(c.x, c.y, b.ang, range, st.d, b.team, { air: 1, ground: 1, rail: 1, fx: '#f3e979', wide: 5 }); return; }
      case 'art': {
        const sc = B.scat || 0, tx = (u ? b.aimX ?? u.x : x) + (Math.random() - .5) * sc * 2, ty = (u ? b.aimY ?? u.y : y) + (Math.random() - .5) * sc * 2, d = Math.hypot(tx - x, ty - y) || 1;
        this.bullets.push({ ...base, k: 'art', x, y, sx: x, sy: y, tx, ty, vx: (tx - x) / d * st.sp, vy: (ty - y) / d * st.sp, life: d / st.sp, ground: 1, hom: st.hom ? u : null, hp: st.hom }); return;
      }
      case 'flame': { for (let k = 0; k < 2; k++) { const a = b.ang + (Math.random() - .5) * .25; this.bullets.push({ ...base, k: 'flame', x, y, vx: Math.cos(a) * st.sp, vy: Math.sin(a) * st.sp, life: range / st.sp, d: st.d / 2, air: 0, ground: 1, pierce: 99 }); } return; }
    }
    const a = b.ang + (Math.random() - .5) * (st.k === 'missile' ? .25 : .06) + (B.spr ? (idx - ((B.shots || 1) - 1) / 2) * B.spr * Math.PI / 180 : 0), hom = st.k === 'missile' ? st.hom || .08 : st.hom;
    this.bullets.push({ ...base, k: st.k === 'flak' || st.k === 'missile' ? st.k : undefined, x, y, vx: Math.cos(a) * st.sp, vy: Math.sin(a) * st.sp, life: range / st.sp + 4, air: B.air, ground: st.k === 'flak' ? st.gnd : B.ground, hom: hom ? u : null, hp: hom, pierce: st.pierce });
    this.fx.push({ k: 'flash', x, y, a: b.ang, life: 6, max: 6, c: col });
  }
  // egyenes mentén sebez (lézer, repesz, sínágyú, szívósugár); visszaadja a végpontot
  lineDmg(x, y, a, len, d, team, o) {
    const foe = team === PLAYER ? ENEMY : PLAYER, ca = Math.cos(a), sa = Math.sin(a), hits = []; let end = len;
    for (let t = 2; t < len; t += 2) { const tx = Math.floor((x + ca * t) / TS), ty = Math.floor((y + sa * t) / TS); if (!this.inb(tx, ty)) { end = t; break; } }   // a térkép falai fölött átmegy, csak a pálya széle állítja meg
    {                 // a sugár csak az első idegen tömör épületet éri; ami mögötte van, azt az még takarja
      for (let t = 4; t < end; t += 4) { const bl = this.tb(Math.floor((x + ca * t) / TS), Math.floor((y + sa * t) / TS)); if (bl && bl.team !== team && !UNDER(bl)) { this.dmgB(bl, d * (o.bdm || 1)); end = t; break; } }
    }
    for (const u of this.units) { if (u.team !== foe || u.dead || (u.U.air ? !o.air : !o.ground)) continue; const t = (u.x - x) * ca + (u.y - y) * sa; if (t < -u.U.r || t > end + u.U.r) continue; if (Math.abs((u.x - x) * sa - (u.y - y) * ca) < u.U.r + (o.wide || 3)) hits.push([t, u]); }
    hits.sort((p, q) => p[0] - q[0]); let left = d, n = 0;
    for (const [t, u] of hits) { if (o.rail) { const hp = u.hp + (u.sh || 0); this.dmgU(u, left, 1); left -= hp; if (left <= 0) { end = t; break; } } else { this.dmgU(u, d); if (o.st) u.st[o.st] = 120; if (o.pierce && ++n >= o.pierce) { end = t; break; } } }
    const ex = x + ca * end, ey = y + sa * end;
    if (o.fx) this.fx.push({ k: 'laser', x, y, x2: ex, y2: ey, life: 16, max: 16, c: o.fx, w: o.wide || 3 });
    return { x: ex, y: ey, n: hits.length };
  }
  lightning(x, y, a, d, team, segs = 9) {
    const foe = team === PLAYER ? ENEMY : PLAYER, pts = [[x, y]], hit = new Set(); let px = x, py = y;
    for (let k = 0; k < segs; k++) {
      let near = null, nd = 40; for (const u of this.units) { if (u.team !== foe || u.U.air || hit.has(u) || u.dead) continue; const dd = Math.hypot(u.x - px, u.y - py); if (dd < nd) { nd = dd; near = u; } }
      if (near && k > 0 && this.losT(px, py, near.x, near.y)) { px = near.x; py = near.y; hit.add(near); this.dmgU(near, d); }
      else { a += (Math.random() - .5) * 1.2; const qx = px + Math.cos(a) * 12, qy = py + Math.sin(a) * 12; if (!this.losT(px, py, qx, qy)) break; px = qx; py = qy; { const bl = this.tb(Math.floor(px / TS), Math.floor(py / TS)); if (bl && bl.team !== team && !hit.has(bl) && !UNDER(bl)) { hit.add(bl); this.dmgB(bl, d); pts.push([px, py]); break; } } }
      pts.push([px, py]);
    }
    this.fx.push({ k: 'bolt', pts, life: 10, max: 10, c: team === PLAYER ? '#a9d8ff' : '#ff9a8a' });
  }

  /* ----- egységek ----- */
  spawnU(t, team, x, y) {
    const U = UNITS[t], u = { t, U, team, x, y, vx: 0, vy: 0, hp: U.hp, sh: 0, rot: 0, wc: U.w.map(() => 0), tgt: null, id: this.nid = (this.nid || 0) + 1, walk: 0, stack: null, mt: 0, st: {}, ffh: U.ab && U.ab.ff ? U.ab.ff[2] : 0, ffb: 0 };
    this.units.push(u); if (FW.js) FW.js.ev('UnitCreateEvent', () => ({ unit: FW.js.unit(u), spawner: null })); return u;
  }
  spawnPlayer() { const c = this.center(this.core); this.player = this.spawnU(this.core.B.unit, PLAYER, c.x, c.y); this.player.ctl = 1; }
  dmgU(u, d, raw) {
    if (u.bl) return this.dmgB(u.bl, d);
    if (u.dead) return; if (!raw) d = Math.max(d - u.U.armor, d * .25); if (u.st.freeze) d *= 1.25; d /= this.rm('unitHealthMultiplier');
    if (u.sh > 0) { const a = Math.min(u.sh, d); u.sh -= a; d -= a; }
    u.hp -= d; u.hit = 6;
    if (u.hp <= 0) {
      u.dead = 1; if (FW.js) FW.js.ev('UnitDestroyEvent', () => ({ unit: FW.js.unit(u) })); this.boom(u.x, u.y, u.U.r * 2.2, u.team === ENEMY ? '#f25555' : '#ffd37f');
      if (u.team === ENEMY) this.stats.kills++;
      if (u === this.player) { this.respawn = 150; this.msg('Az egységed megsemmisült – újraéledés a magnál', 'bad'); }
    }
  }
  dmgB(b, d, src) {
    if (b.dead) return; d /= this.rm('blockHealthMultiplier');
    if (b.B.zap && src && Math.random() < b.B.zap) { const c = this.center(b); this.lightning(c.x, c.y, Math.atan2(src.y - c.y, src.x - c.x), 20, b.team || PLAYER); }
    if (b.B.armor) d = Math.max(d - b.B.armor, d * .1);   // páncél (Damage.applyArmor)
    b.hp -= d; b.hit = 8;
    if (b.hp <= 0) { if (b.team === ENEMY) this.stats.ekill = (this.stats.ekill || 0) + 1; if (b === this.core) { const alt = this.blds.find(o => o !== b && o.team === PLAYER && o.B.type === 'core'); if (alt) { alt.items = b.items; this.core = alt; this.remB(b, 1); this.capV = -1; this.fdirty = 1; this.msg('A fő mag megsemmisült – a tartalék mag vette át', 'bad'); return; } this.lost = true; const c = this.center(b); this.boom(c.x, c.y, 40, '#ffb347'); return; } this.remB(b, 1); }
  }
  splash(x, y, r, d, victim, air, ground, blds, st) {
    for (const u of this.units) if (u.team === victim && !u.dead && (u.U.air ? air : ground)) { const dd = Math.hypot(u.x - x, u.y - y); if (dd < r + u.U.r && this.losT(x, y, u.x, u.y)) { this.dmgU(u, d * (1 - dd / (r + u.U.r) * .5)); if (st) u.st[st] = 240; } }
    if (blds) { const atk = foeOf(victim); const R = Math.ceil(r / TS), tx = Math.floor(x / TS), ty = Math.floor(y / TS), seen = new Set(); for (let yy = ty - R; yy <= ty + R; yy++) for (let xx = tx - R; xx <= tx + R; xx++) { const b = this.tb(xx, yy); if (b && b.team !== atk && !seen.has(b) && Math.hypot((xx + .5) * TS - x, (yy + .5) * TS - y) <= r + 4) { seen.add(b); if (!this.shielded(x, y, b)) this.dmgB(b, d); } } }
    this.boom(x, y, r * .8, '#ffcf7a');
  }
  splashAll(x, y, r, d) { for (const u of this.units) { const dd = Math.hypot(u.x - x, u.y - y); if (dd < r && this.losT(x, y, u.x, u.y)) this.dmgU(u, d * (1 - dd / r)); } for (const b of [...this.blds]) { const c = this.center(b), dd = Math.hypot(c.x - x, c.y - y); if (dd < r && (dd < b.B.s * 6 || !this.shielded(x, y, b))) this.dmgB(b, d * (1 - dd / r)); } this.boom(x, y, r, '#ff8a5a'); }
  healB(x, y, r, pct, team = PLAYER) { for (const b of this.blds) if (b.team === team && b.hp < b.B.hp) { const c = this.center(b); if (Math.hypot(c.x - x, c.y - y) <= r + b.B.s * 4) { b.hp = Math.min(b.B.hp, b.hp + b.B.hp * pct / 100); b.heal = 12; } } }
  boom(x, y, r, c) { this.fx.push({ k: 'boom', x, y, r, life: 22, max: 22, c }); }
  teamB(t) { if (this.tbV !== this.ver) { this.tbV = this.ver; this.tbL = {}; for (const b of this.blds) (this.tbL[b.team] = this.tbL[b.team] || []).push(b); } return this.tbL[t] || []; }   // épületek csapatonként (gyorsítótár)
  // a célzott épület (Mindustry BulletComp.checkUnderBuild aimTile): az alacsony épületet (szalag, cső…) csak a rá célzott lövedék találja el
  aimB(t, tc) { if (t) return t.bl || (!t.U ? t : null); if (tc && tc.x != null) { const b = this.tb(Math.floor(tc.x / TS), Math.floor(tc.y / TS)); return b || null; } return null; }
  bref(b) { return b.ref || (b.ref = { bl: b, get x() { return (b.x + b.B.s / 2) * TS; }, get y() { return (b.y + b.B.s / 2) * TS; }, vx: 0, vy: 0, U: { r: b.B.s * 4 }, get dead() { return !!b.dead; } }); }
  // a legközelebbi épület; alapból csak a játékosé (ezt támadja az ellenség, ezt javítják a javítók)
  nearestB(x, y, r, fn, any) {
    let best = null, bd = r;
    for (const b of any ? this.blds : this.teamB(PLAYER)) { if (b.B.type === 'mine' || (fn && !fn(b))) continue; const d = Math.hypot((b.x + b.B.s / 2) * TS - x, (b.y + b.B.s / 2) * TS - y) - b.B.s * 4; if (d < bd) { bd = d; best = b; } }
    return best;
  }
  nearestU(x, y, r, team, air, ground, los) {
    let best = null, bd = r;
    for (const u of this.units) { if (u.team !== team || u.dead) continue; if (u.U.air ? !air : !ground) continue; if (team !== PLAYER && this.fog && this.vis && !this.visAt(u.x, u.y)) continue; const d = Math.hypot(u.x - x, u.y - y) - u.U.r; if (d < bd && (!los || this.losT(x, y, u.x, u.y))) { bd = d; best = u; } }
    return best;
  }
  // hová lőjön, hogy a mozgó célt eltalálja: a lövedék (sebesség sp, a csőtorkolattól off távolságra indul) és a cél pályájának metszéspontja
  intercept(sx, sy, t, sp, off = 0) {
    const vx = t.mvx || 0, vy = t.mvy || 0; if (!t.U || !sp || (Math.abs(vx) < .01 && Math.abs(vy) < .01)) return t;
    const dx = t.x - sx, dy = t.y - sy, a = vx * vx + vy * vy - sp * sp, bb = 2 * (dx * vx + dy * vy - off * sp), cc = dx * dx + dy * dy - off * off;
    let tt; if (Math.abs(a) < 1e-6) tt = -cc / bb; else { const disc = bb * bb - 4 * a * cc; if (disc < 0) return t; const r = Math.sqrt(disc), t1 = (-bb - r) / (2 * a), t2 = (-bb + r) / (2 * a); tt = Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2); }
    if (!(tt > 0) || tt > 600) return t; return { x: t.x + vx * tt, y: t.y + vy * tt };
  }
  free(x, y, team) { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (!this.inb(tx, ty) || (team === PLAYER && !this.inA(tx, ty))) return false; const i = ty * this.w + tx; if (this.sol[i]) return false; const b = this.bt[i]; return !b || !isSolid(b) || (b.open && team === PLAYER); }
  moveU(u, dx, dy) {
    const nx = u.x + dx, ny = u.y + dy, A = u.team === PLAYER ? this.area : null, x0 = A ? A.x * TS : 0, y0 = A ? A.y * TS : 0, x1 = A ? (A.x + A.w) * TS : this.w * TS, y1 = A ? (A.y + A.h) * TS : this.h * TS;
    if (u.carrier) return;
    if (u.U.air || u.U.legs) { u.x = Math.max(x0 + 4, Math.min(x1 - 4, nx)); u.y = Math.max(y0 + 4, Math.min(y1 - 4, ny)); return; }
    if (u.U.hov) { const fh = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (!this.inb(tx, ty) || (u.team === PLAYER && !this.inA(tx, ty))) return false; const i = ty * this.w + tx; if (this.wall[i]) return false; const b = this.bt[i]; return !b || !isSolid(b); }; if (fh(nx, u.y)) u.x = nx; if (fh(u.x, ny)) u.y = ny; return; }   // lebegő egység: vízen is átkel
    if (u.U.naval && this.wet(u.x, u.y)) { if (this.wet(nx, u.y)) u.x = nx; if (this.wet(u.x, ny)) u.y = ny; return; }   // a hajó vízen marad; ha partra került, a szárazon csúszik, amíg vizet nem ér
    if (this.free(nx, u.y, u.team)) u.x = nx; if (this.free(u.x, ny, u.team)) u.y = ny;
  }
  // egy fegyver elsütése; t: célegység vagy épület, tc: a cél pontja
  fireW(u, w, tc, t) {
    const team = u.team, foe = foeOf(team), a = Math.atan2(tc.y - u.y, tc.x - u.x), dm = (u.st.od ? 1.3 : 1) * this.rm('unitDamageMultiplier'), col = team === ENEMY ? '#ff7a6a' : w.heal ? '#84f491' : '#ffe39a';
    const air = w.air !== 0 ? 1 : 0, base = { jsb: w.jsb, team, c: w.c || col, c2: w.c2, sz: w.sz, tr: w.tr, d: (w.d || 0) * dm, spl: w.spl && w.spl * dm, splR: w.splR, st: w.st, stT: w.stT, frag: w.frag, zap: w.zap, zapD: w.zapD, heal: w.heal, ab: this.aimB(t, tc) };
    switch (w.k) {
      case 'laser': case 'shrap': { const e = this.lineDmg(u.x, u.y, a, w.len, w.d * dm, team, { air: 1, ground: 1, pierce: w.k === 'laser' ? 6 : 0, fx: col, wide: w.wide ? 9 : 4 }); if (w.heal && team === PLAYER) this.healB((u.x + e.x) / 2, (u.y + e.y) / 2, w.len / 2, w.heal); return; }
      case 'sap': { const d = Math.hypot(tc.x - u.x, tc.y - u.y); if (t && t.U) { this.dmgU(t, w.d * dm); t.st.sap = 180; } else if (t) this.dmgB(t, w.d * dm, u); u.hp = Math.min(u.U.hp, u.hp + w.d * w.sap); this.fx.push({ k: 'laser', x: u.x, y: u.y, x2: u.x + Math.cos(a) * Math.min(d, w.len + 8), y2: u.y + Math.sin(a) * Math.min(d, w.len + 8), life: 10, max: 10, c: '#bf92f9', w: 2 }); return; }
      case 'arc': for (let k = 0; k < (w.n || 1); k++) this.lightning(u.x, u.y, a + (k - ((w.n || 1) - 1) / 2) * .3, w.d * dm, team, 6); if (w.heal && team === PLAYER) this.healB(u.x, u.y, w.len, w.heal); return;
      case 'beam': u.beam = { w, t: w.dur, a }; return;
      case 'field': { let n = 0; for (const o of this.units) { if (o.team === team || o.dead || n >= (w.n || 25) || Math.hypot(o.x - u.x, o.y - u.y) > w.len + o.U.r) continue; n++; this.fx.push({ k: 'laser', x: u.x, y: u.y, x2: o.x, y2: o.y, life: 10, max: 10, c: col }); this.dmgU(o, w.d * dm); } if (team === ENEMY) { const b = this.nearestB(u.x, u.y, w.len, isSolid); if (b) { const c = this.center(b); this.fx.push({ k: 'laser', x: u.x, y: u.y, x2: c.x, y2: c.y, life: 10, max: 10, c: col }); this.dmgB(b, w.d * dm, u); } } else if (w.heal) this.healB(u.x, u.y, w.len, w.heal); return; }
      case 'bomb': this.splash(u.x, u.y, w.splR, w.spl * dm, foe, 0, 1, 1); if (w.heal && team === PLAYER) this.healB(u.x, u.y, w.splR, w.heal); return;
      case 'boom': this.splash(u.x, u.y, w.splR, w.spl * dm, foe, 1, 1, 1); u.dead = 1; this.boom(u.x, u.y, 12, '#ffb347'); return;
      case 'art': { const d = Math.hypot(tc.x - u.x, tc.y - u.y) || 1; this.bullets.push({ ...base, k: 'art', x: u.x, y: u.y, sx: u.x, sy: u.y, tx: tc.x, ty: tc.y, vx: (tc.x - u.x) / d * w.sp, vy: (tc.y - u.y) / d * w.sp, life: d / w.sp, ground: 1 }); return; }
      case 'flame': for (let k = 0; k < 2; k++) { const q = a + (Math.random() - .5) * .3; this.bullets.push({ ...base, k: 'flame', d: base.d / 2, x: u.x, y: u.y, vx: Math.cos(q) * w.sp, vy: Math.sin(q) * w.sp, life: w.life, air: 0, ground: 1, pierce: 99, pb: 1 }); } return;
    }
    const n = w.n || 1;
    for (let k = 0; k < n; k++) {
      const q = a + (n > 1 ? (k - (n - 1) / 2) * .12 : 0) + (Math.random() - .5) * .04, hom = w.k === 'missile' ? .08 : w.hom;
      this.bullets.push({ ...base, k: w.k === 'missile' || w.k === 'flak' || w.k === 'acid' ? w.k : undefined, x: u.x + Math.cos(q) * u.U.r, y: u.y + Math.sin(q) * u.U.r, vx: Math.cos(q) * w.sp, vy: Math.sin(q) * w.sp, life: w.life + 4, air, ground: w.k === 'flak' ? w.gnd : 1, hom: hom && t && t.U ? t : null, hp: hom, pierce: w.pierce, bolt: w.k === 'bolt' });
    }
  }
  // a hatótávon belüli célra minden kész fegyverrel tüzel
  attack(u, t) {
    const tc = t.U ? t : this.center(t), d = Math.hypot(tc.x - u.x, tc.y - u.y) - (t.U ? t.U.r : t.B.s * 4), W = u.U.w; let shot = false;
    for (let i = 0; i < W.length; i++) { const w = W[i]; if (u.wc[i] > 0 || (t.U && t.U.air && w.air === 0) || d > wr(w)) continue; this.fireW(u, w, t.U && w.sp && !NOLEAD.has(w.k) ? this.intercept(u.x, u.y, t, w.sp, u.U.r) : tc, t); u.wc[i] = w.rl; shot = true; if (u.dead) break; }
    return shot;
  }
  updUnit(u) {
    const U = u.U; if (u.hit > 0) u.hit--;
    let spm = 1; for (const k in u.st) { const S = STATUS[k]; if (--u.st[k] <= 0) { delete u.st[k]; continue; } if (S.sp) spm *= S.sp; if (S.dps) { u.hp -= S.dps; if (u.hp <= 0) { this.dmgU(u, 1, 1); return; } } }
    u.spm = spm; const wsp = u.st.od ? 1.6 : 1; for (let i = 0; i < u.wc.length; i++) if (u.wc[i] > 0) u.wc[i] -= wsp;
    const A = U.ab;
    if (A) {
      if (A.regen && this.tick % A.regen[2] === u.id % A.regen[2]) for (const o of this.units) if (o.team === u.team && !o.dead && Math.hypot(o.x - u.x, o.y - u.y) < A.regen[3] + o.U.r) o.sh = Math.max(o.sh, Math.min(A.regen[1], o.sh + A.regen[0]));
      if (A.rep && this.tick % A.rep[1] === u.id % A.rep[1]) for (const o of this.units) if (o.team === u.team && !o.dead && o.hp < o.U.hp && Math.hypot(o.x - u.x, o.y - u.y) < A.rep[2]) o.hp = Math.min(o.U.hp, o.hp + A.rep[0]);
      if (A.ff) { if (u.ffb > 0) u.ffb--; else u.ffh = Math.min(A.ff[2], u.ffh + A.ff[1]); }
    }
    if (u.beam) { const bm = u.beam; if (u.aim != null) { const da = ((u.aim - bm.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI; bm.a += Math.max(-.025, Math.min(.025, da)); } if (this.tick % 5 === 0) { const e = this.lineDmg(u.x, u.y, bm.a, bm.w.len, bm.w.d, u.team, { air: 1, ground: 1, pierce: 9, wide: 5 }); bm.x = e.x; bm.y = e.y; } if (--bm.t <= 0) u.beam = null; }
    if (u === this.player || typeof u.ctl === 'object') return this.updPlayer(u);
    if (u.carrier) return;
    if (u.lc != null && u.lmove && this.tick - u.lc < 600) { this.steer(u, u.lmove.x, u.lmove.y, u.lmove.r || 2); return; }   // világprocesszor irányítja (Mindustry LogicAI, 10 mp után visszaáll)
    if (u.team === ENEMY) return U.air ? this.aiAir(u) : this.aiGround(u);
    if (u.cmd) return this.aiDefend(u);   // parancsot kapott: a bányászok és építők is követik
    if (U.miner) return this.aiMiner(u);
    if (U.rebuild && this.aiBuilder(u)) return;
    return this.aiDefend(u);
  }
  /* ---------- útkeresés a saját egységeknek (Mindustry Pathfinder / ControlPathfinder mintájára) ----------
     Célpontonként távolságmező (Dijkstra, 8 irány, saroklevágás nélkül, fal mellett drágább), az egységek a mező lejtőjén mennek.
     Osztályok: földi (g), lebegő (h: vízen is), hajó (n: csak vízen); a nagy egységeknek szélesebb szabad hely kell.
     A repülők és a lábas egységek egyenesen mennek, mint a Mindustryban. */
  pathCls(u) { const U = u.U; if (U.air || U.legs || u.carrier) return null; const k = U.naval ? 'n' : U.hov ? 'h' : 'g'; return k + Math.min(2, Math.max(0, Math.ceil(U.r / TS - 1))); }
  pathBase(k) {   // járható mezők + távolság a legközelebbi akadálytól (a méretes egységekhez)
    const P = this.pathB || (this.pathB = {}); let o = P[k[0]]; if (o && o.v === this.ver) return o;
    const w = this.w, h = this.h, N = w * h, ok = new Uint8Array(N), A = this.area;
    for (let i = 0; i < N; i++) {
      const x = i % w, y = (i / w) | 0; if (A && (x < A.x || y < A.y || x >= A.x + A.w || y >= A.y + A.h)) continue;
      const b = this.bt[i]; if (b && isSolid(b) && !(b.open && b.team === PLAYER)) continue;
      if (k[0] === 'n') { if (!this.wall[i] && this.fl(i).liq === 'water') ok[i] = 1; }
      else if (k[0] === 'h') { if (!this.wall[i]) ok[i] = 1; }
      else if (!this.sol[i]) ok[i] = 1;
    }
    const dt = new Uint8Array(N).fill(255), q = new Int32Array(N); let qh = 0, qt = 0;   // Csebisev-távolság az akadálytól (legfeljebb 3)
    for (let i = 0; i < N; i++) if (!ok[i]) { dt[i] = 0; q[qt++] = i; }
    while (qh < qt) { const i = q[qh++], x = i % w, y = (i / w) | 0, nd = dt[i] + 1; if (nd > 3) continue; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = Y * w + X; if (dt[j] > nd) { dt[j] = nd; q[qt++] = j; } } }
    for (let x = 0; x < w; x++) { dt[x] = Math.min(dt[x], 1); dt[N - w + x] = Math.min(dt[N - w + x], 1); } for (let y = 0; y < h; y++) { dt[y * w] = Math.min(dt[y * w], 1); dt[y * w + w - 1] = Math.min(dt[y * w + w - 1], 1); }
    o = P[k[0]] = { v: this.ver, ok, dt }; return o;
  }
  pathField(k, tx, ty) {
    const C = this.pathC || (this.pathC = new Map()), key = k + ':' + tx + ',' + ty; let f = C.get(key);
    if (f && (f.v === this.ver || this.tick - f.t < 45)) { f.used = this.tick; return f; }   // a pálya változása után legfeljebb 45 lépésig a régi mező is jó
    if ((this.pathN = this.pathT === this.tick ? (this.pathN || 0) + 1 : 1) > 2) { this.pathT = this.tick; return f || null; } this.pathT = this.tick;   // lépésenként legfeljebb 2 új mező
    const B = this.pathBase(k), w = this.w, h = this.h, N = w * h, need = +k[1] + 1, ok = i => B.ok[i] && B.dt[i] >= need;
    const d = new Float32Array(N).fill(Infinity); if (!this.inb(tx, ty)) return null;
    // Dijkstra kosaras sorral (egész költségek: egyenes 10, átló 14, fal mellett +6)
    const cost = i => B.dt[i] <= need ? 16 : 10, bk = []; let cur = 0; const push = (i, c) => { (bk[c] || (bk[c] = [])).push(i); };
    const s = ty * w + tx; d[s] = 0; push(s, 0); let left = 1;
    while (left > 0) { const L = bk[cur]; if (!L || !L.length) { cur++; continue; } const i = L.pop(); left--; if (d[i] < cur) continue; const x = i % w, y = (i / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = Y * w + X; if (!ok(j)) continue;
        if (dx && dy && (!ok(y * w + X) || !ok(Y * w + x))) continue; const c = cur + (dx && dy ? Math.round(cost(j) * 1.4) : cost(j)); if (c < d[j]) { d[j] = c; push(j, c); left++; } } }
    f = { v: this.ver, t: this.tick, used: this.tick, d }; C.set(key, f);
    if (C.size > 24) { let old = null; for (const [k2, v] of C) if (!old || v.used < old[1].used) old = [k2, v]; C.delete(old[0]); }
    return f;
  }
  // a következő köztes pont a mezőn (néhány lépés előre, a simább mozgásért); null: nincs út, egyenesen megy
  pathNext(u, tx, ty) {
    const k = this.pathCls(u); if (!k) return null; const w = this.w, gx = Math.floor(tx / TS), gy = Math.floor(ty / TS), q = u.cmd && u.cmd.k === 'atk' && u.cmd.t && u.cmd.t.U ? 3 : 1;
    const f = this.pathField(k, Math.floor(gx / q) * q + (q >> 1), Math.floor(gy / q) * q + (q >> 1)); if (!f) return null;
    let x = Math.floor(u.x / TS), y = Math.floor(u.y / TS); if (!this.inb(x, y) || f.d[y * w + x] === Infinity) return null;
    for (let s = 0; s < 3; s++) { let best = f.d[y * w + x], bx = x, by = y; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (!this.inb(X, Y)) continue; const v = f.d[Y * w + X]; if (v < best && (!dx || !dy || (f.d[y * w + X] < Infinity && f.d[Y * w + x] < Infinity))) { best = v; bx = X; by = Y; } } if (bx === x && by === y) break; x = bx; y = by; }
    return { x: (x + .5) * TS, y: (y + .5) * TS };
  }
  steer(u, tx, ty, stop = 0) {
    if (u.team === PLAYER && Math.hypot(tx - u.x, ty - u.y) > stop + TS) { const n = this.pathNext(u, tx, ty); if (n && Math.hypot(n.x - u.x, n.y - u.y) > 1) { tx = n.x; ty = n.y; stop = 0; } }   // a saját földi egységek kerülnek
    const d = Math.hypot(tx - u.x, ty - u.y), sp = u.U.sp * (u.spm || 1);
    if (d > stop) { const v = Math.min(sp, d - stop); u.vx += ((tx - u.x) / d * v - u.vx) * .2; u.vy += ((ty - u.y) / d * v - u.vy) * .2; }
    else { u.vx *= .8; u.vy *= .8; }
    this.moveU(u, u.vx, u.vy);
    if (Math.hypot(u.vx, u.vy) > .05) { u.rot = Math.atan2(u.vy, u.vx); u.walk += Math.hypot(u.vx, u.vy); }
  }
  aiGround(u) {
    const U = u.U, boom = U.w[0] && U.w[0].k === 'boom', groundOnly = U.w.every(w => w.air === 0);
    if (this.tick % 15 === (u.id % 15) || (u.tgt && u.tgt.dead)) u.tgt = this.nearestU(u.x, u.y, U.rng + 16, PLAYER, !groundOnly, 1, !U.lob) || this.nearestB(u.x, u.y, boom ? 40 : U.rng + 4, b => isSolid(b) && (U.lob || this.losB(u, b)));
    let nx = null, block = null;
    if (!U.legs) {
      const tx = Math.floor(u.x / TS), ty = Math.floor(u.y / TS), w = this.w;
      if (this.flow && this.inb(tx, ty)) {
        let bd = this.flow[ty * w + tx], bi = -1;
        for (let k = 0; k < 8; k++) {
          const X = tx + NX[k], Y = ty + NY[k]; if (!this.inb(X, Y)) continue; const i = Y * w + X;
          if (k > 3) { const a = ty * w + X, b = Y * w + tx; if (this.sol[a] || this.sol[b] || (this.bt[a] && isSolid(this.bt[a])) || (this.bt[b] && isSolid(this.bt[b]))) continue; }
          if (this.flow[i] < bd) { bd = this.flow[i]; bi = i; }
        }
        if (bi >= 0) { const b = this.bt[bi]; if (b && isSolid(b)) block = b; else nx = { x: (bi % w + .5) * TS, y: (Math.floor(bi / w) + .5) * TS }; }
      }
    }
    if (block && (!u.tgt || u.tgt.U)) u.tgt = block;
    const t = u.tgt, tc = t ? (t.U ? t : this.center(t)) : null;
    if (boom) { if (tc && Math.hypot(tc.x - u.x, tc.y - u.y) < (t.U ? 10 : t.B.s * 4 + 8)) { this.fireW(u, U.w[0], tc, t); return; } if (tc && !block) this.steer(u, tc.x, tc.y); else if (nx) this.steer(u, nx.x, nx.y); return; }
    const inR = tc && Math.hypot(tc.x - u.x, tc.y - u.y) - (t.U ? 0 : t.B.s * 4) < U.rng * .9, cc = this.center(this.core), atCore = Math.hypot(cc.x - u.x, cc.y - u.y) < U.rng * .5 + this.core.B.s * 4;
    if (U.legs) { if (inR && !t.U) { u.vx *= .8; u.vy *= .8; } else this.steer(u, (tc || cc).x, (tc || cc).y); }
    else if (nx && !atCore) this.steer(u, nx.x, nx.y); else { u.vx *= .8; u.vy *= .8; }
    if (tc) { u.aim = Math.atan2(tc.y - u.y, tc.x - u.x); this.attack(u, t); } else u.aim = null;
  }
  aiAir(u) {
    const U = u.U, sp = U.sp * (u.spm || 1);
    if (this.tick % 20 === (u.id % 20) || !u.tgt || u.tgt.dead) {
      const pick = fn => this.nearestB(u.x, u.y, 1e9, fn);
      if (U.bomber) u.tgt = pick(b => b.B.type !== 'wall' && isSolid(b)) || this.core;
      else if (U.tier === 1) u.tgt = this.nearestU(u.x, u.y, 200, PLAYER, 0, 1) || pick(b => b.B.type === 'generator') || this.nearestU(u.x, u.y, 260, PLAYER, 1, 1) || pick(isSolid);
      else u.tgt = this.nearestU(u.x, u.y, U.rng, PLAYER, 1, 1) || pick(b => b.B.type === 'turret') || pick(isSolid);
    }
    const t = u.tgt; if (!t) return;
    const tc = t.U ? t : this.center(t), d = Math.hypot(tc.x - u.x, tc.y - u.y), a = Math.atan2(tc.y - u.y, tc.x - u.x);
    if (U.bomber || U.circle) {          // rárepül a célra, túlszalad, visszafordul
      if (d > (U.circle || 40) || Math.cos(a - u.rot) > 0) { u.vx += (Math.cos(a) * sp - u.vx) * .05; u.vy += (Math.sin(a) * sp - u.vy) * .05; }
      this.moveU(u, u.vx, u.vy); u.rot = Math.atan2(u.vy, u.vx);
      if (U.bomber) { const b = this.tb(Math.floor(u.x / TS), Math.floor(u.y / TS)); if (b && u.wc[0] <= 0) { this.fireW(u, U.w[0], u, b); u.wc[0] = U.w[0].rl; } }
      else if (d < U.rng && Math.cos(a - u.rot) > .7) this.attack(u, t);
      return;
    }
    if (d > U.rng * .8 || !this.losT(u.x, u.y, tc.x, tc.y)) { u.vx += (Math.cos(a) * sp - u.vx) * .06; u.vy += (Math.sin(a) * sp - u.vy) * .06; } else { u.vx *= .95; u.vy *= .95; }
    this.moveU(u, u.vx, u.vy); u.rot = a; u.aim = a; this.attack(u, t);
  }
  aiDefend(u) {
    const U = u.U, home = u.home || this.center(this.core), W0 = U.w[0];
    if (u.cmd && u.cmd.k === 'atk') { if (u.cmd.t.dead) { u.cmd = { k: 'move' }; u.home = { x: u.x, y: u.y }; u.tgt = null; } else u.tgt = u.cmd.t; }   // kijelölt célpont: amíg él, azt támadja
    if (!(u.cmd && u.cmd.k === 'atk') && (this.tick % 15 === (u.id % 15) || (u.tgt && u.tgt.dead))) u.tgt = u.cmd ? (U.rng ? this.nearestU(u.x, u.y, U.rng, ENEMY, 1, 1) : null) : U.rng ? this.nearestU(home.x, home.y, 300, ENEMY, 1, 1) || (this.eteam ? (b => b && this.bref(b))(this.nearestB(home.x, home.y, 160, q => q.team === ENEMY && isSolid(q), 1)) : null) : null;   // a célpontot a lőhelyzetig követi (a fal mögé nem lő); a gyülekezőpont közelében az ellenséges épületeket is támadja
    const t = u.tgt;
    if (t && !t.dead) {
      const d = Math.hypot(t.x - u.x, t.y - u.y) - (t.bl ? t.U.r : 0);
      if (W0.k === 'boom') { this.steer(u, t.x, t.y); if (d < 12) this.fireW(u, W0, t, t); return; }
      const see = U.lob || this.losT(u.x, u.y, t.x, t.y); if (u.cmd && u.cmd.k === 'move') this.steer(u, home.x, home.y, 4); else this.steer(u, t.x, t.y, U.bomber || !see ? 0 : U.rng * .75);   // vonulás közben csak a hatótávon belülire lő, nem üldöz u.aim = Math.atan2(t.y - u.y, t.x - u.x);
      if (U.bomber) { if (d < W0.splR * .6 && u.wc[0] <= 0) { this.fireW(u, W0, t, t); u.wc[0] = W0.rl; } } else if (see) this.attack(u, t);
      return;
    }
    u.aim = null;
    if (W0 && W0.heal && this.tick % 30 === u.id % 30) { const c = this.nearestB(u.x, u.y, 400, b => b.hp < b.B.hp); u.fix = c; }
    if (u.fix && !u.fix.dead && u.fix.hp < u.fix.B.hp) { const c = this.center(u.fix), d = Math.hypot(c.x - u.x, c.y - u.y); this.steer(u, c.x, c.y, Math.max(20, U.rng * .6)); if (d < Math.max(30, U.rng) && u.wc[0] <= 0) { u.fix.hp = Math.min(u.fix.B.hp, u.fix.hp + u.fix.B.hp * W0.heal / 100); u.fix.heal = 12; u.wc[0] = W0.rl; this.fx.push({ k: 'laser', x: u.x, y: u.y, x2: c.x, y2: c.y, life: 8, max: 8, c: '#84f491', w: 1.5 }); } return; }
    if (u.cmd) this.steer(u, home.x, home.y, 4); else this.steer(u, home.x + Math.cos(u.id) * (16 + U.r), home.y + Math.sin(u.id) * (16 + U.r), 4);
  }
  aiBuilder(u) {
    if (!this.plans.length && this.rebuild.length && !this.nEn && this.tick % 20 === u.id % 20) { const [t, x, y, rot, cfg] = this.rebuild.shift(); this.plan(t, x, y, rot, cfg); }
    const pl = this.plans.find(p => !p.stall) || this.plans[0]; if (!pl || this.nearestU(u.x, u.y, 120, ENEMY, 1, 1)) return false;
    const px = (pl.x + pl.B.s / 2) * TS, py = (pl.y + pl.B.s / 2) * TS; this.steer(u, px, py, 60);
    if (Math.hypot(px - u.x, py - u.y) < BUILD_RANGE) this.buildPlan(u, pl);
    return true;
  }
  // Mindustry MinerAI: azt az ércet bányássza, amelyikből a magban a legkevesebb van (4 mp-enként dönt), a maghoz legközelebbi lelőhelyen;
  // ha megtelt, visszaviszi a maghoz (a hatótávján belül adja le), aztán újra bányászik
  aiMiner(u) {
    const U = u.U, c = this.center(this.core), w = this.w, cap = U.icap || 20, rng = U.range || 50;
    if (u.miningMode !== 0) {
      if (this.tick >= (u.itT || 0) || !u.want) {
        u.itT = this.tick + 240; let best = null;
        for (const it of ['copper', 'lead', 'titanium', 'thorium']) { if (ITEMS[it].h > U.mineT || !this.hasOre(it)) continue; if (!best || (this.core.items[it] || 0) < (this.core.items[best] || 0)) best = it; }
        u.want = best;
      }
      if (u.want && (this.core.items[u.want] || 0) >= this.coreCap()) { u.stack = null; u.mine = -1; u.mining = 0; return this.steer(u, c.x, c.y, 40); }
      if (u.stack && (u.stack.n >= cap || u.stack.it !== u.want)) u.miningMode = 0;
      else {
        if (this.tick >= (u.oreT || 0) && u.want) { u.oreT = this.tick + 60; u.mine = this.closestOre(u.want, c.x, c.y); }
        u.mining = 0;
        if (u.mine >= 0 && u.mine != null) {
          const mx = (u.mine % w + .5) * TS, my = (Math.floor(u.mine / w) + .5) * TS, it = this.mineItem(u.mine, U.mineT);
          this.steer(u, mx, my, MINE_RANGE / 2);
          if (it && !this.bt[u.mine] && Math.hypot(mx - u.x, my - u.y) < MINE_RANGE) {
            u.mining = 1; u.mt += U.mine;
            if (u.mt >= 50 + ITEMS[it].h * 15) { u.mt = 0; if (!u.stack) u.stack = { it, n: 0 }; if (u.stack.it === it) u.stack.n++; }
          }
        } else this.steer(u, c.x, c.y, 40);
      }
      return;
    }
    u.mine = -1; u.mining = 0;
    if (!u.stack || !u.stack.n) { u.stack = null; u.miningMode = 1; return; }
    if (Math.hypot(c.x - u.x, c.y - u.y) < rng + this.core.B.s * 4) { this.addCore(u.stack.it, u.stack.n); this.fx.push({ k: 'xfer', x: u.x, y: u.y, x2: c.x, y2: c.y, life: 14, max: 14, c: ITEMS[u.stack.it].c }); u.stack = null; u.miningMode = 1; }
    else this.steer(u, c.x, c.y, rng / 1.8);
  }
  oreList(it) { this.oreL = this.oreL || {}; if (!this.oreL[it]) { const k = ITEM_IDS.indexOf(it) + 1, a = []; for (let i = 0; i < this.ore.length; i++) if (this.ore[i] === k && !this.wall[i]) a.push(i); this.oreL[it] = Int32Array.from(a); } return this.oreL[it]; }
  hasOre(it) { return this.oreList(it).length > 0; }
  closestOre(it, x, y) {
    const L = this.oreList(it), w = this.w, cx = x / TS - .5, cy = y / TS - .5; let bi = -1, bd = 1e18;
    for (let k = 0; k < L.length; k++) { const i = L[k]; if (this.bt[i] || !this.seen[i]) continue; const d = (i % w - cx) ** 2 + (Math.floor(i / w) - cy) ** 2; if (d < bd) { bd = d; bi = i; } }
    return bi;
  }

  updPlayer(p) {
    const U = p.U, c = typeof p.ctl === 'object' ? p.ctl : this.ctl, W0 = U.w[0];   // a vendégek egységeit (többjátékos) a saját bemenetük irányítja
    const len = Math.hypot(c.ax, c.ay) || 1, ts = U.sp * Math.min(1, Math.hypot(c.ax, c.ay));
    p.vx += (c.ax / len * ts - p.vx) * .18; p.vy += (c.ay / len * ts - p.vy) * .18;
    this.moveU(p, p.vx, p.vy);
    if (c.shoot) { p.rot = Math.atan2(c.my - p.y, c.mx - p.x); if (p.wc[0] <= 0) { this.fireW(p, W0, { x: c.mx, y: c.my }, this.nearestU(c.mx, c.my, 40, ENEMY, 1, 1)); p.wc[0] = W0.rl; } }
    else {
      // automatikus célzás (Mindustry: mobil automata célzás): a fegyver hatótávján belüli legközelebbi ellenség – egység, aztán épület
      let t = null; if (U.w.length && this.tick % 6 === p.id % 6) { const R = Math.max(...U.w.map(wr)); t = this.nearestU(p.x, p.y, R, ENEMY, 1, 1, true) || this.nearestB(p.x, p.y, R, b => b.team === ENEMY, true); p.atgt = t; }
      else if (p.atgt && (p.atgt.dead || (p.atgt.U && p.atgt.team !== ENEMY))) p.atgt = null;
      t = p.atgt; if (t) { const tc = t.U ? t : this.center(t); p.rot = Math.atan2(tc.y - p.y, tc.x - p.x); this.attack(p, t); }
      else if (Math.hypot(p.vx, p.vy) > .2) p.rot = Math.atan2(p.vy, p.vx);
    }
    // Mindustry MinerComp: időzítő += bányászsebesség; tárgyanként 50 + 15·keménység. A játékos tárgya a mag hatókörén (220) belül
    // azonnal a magba kerül, azon kívül a rakományba; ha az megtelt vagy más tárgy van benne, a bányászat leáll. Építés közben szünetel.
    p.mining = 0;
    if (p.mine >= 0 && p.mine != null) {
      const mx = (p.mine % this.w + .5) * TS, my = (Math.floor(p.mine / this.w) + .5) * TS, it = this.mineItem(p.mine, U.mineT, U.mineW ? 'w' : 1);
      if (!it || this.bt[p.mine] || Math.hypot(mx - p.x, my - p.y) > MINE_RANGE) { if (!it || this.bt[p.mine]) p.mine = -1; }
      else if (!p.building) {
        p.mining = 1; p.mt += U.mine * (this.tsc || 1) * this.rm('unitMineSpeedMultiplier');
        if (p.mt >= 50 + ITEMS[it].h * 15) {
          p.mt = 0; const cc = this.center(this.core), cap = U.icap || 30;
          if (Math.hypot(cc.x - p.x, cc.y - p.y) < CORE_RANGE && (this.core.items[it] || 0) < this.coreCap()) { this.addCore(it, 1); this.fx.push({ k: 'xfer', x: mx, y: my, x2: cc.x, y2: cc.y, life: 16, max: 16, c: ITEMS[it].c }); }
          else if ((!p.stack || p.stack.it === it) && (!p.stack || p.stack.n < cap)) { p.stack = p.stack || { it, n: 0 }; p.stack.n++; }
          else { p.mine = -1; p.mt = 0; }
        }
      }
    }
    if (p.stack) { const cc = this.center(this.core); if (Math.hypot(cc.x - p.x, cc.y - p.y) < CORE_RANGE) { this.addCore(p.stack.it, p.stack.n); this.fx.push({ k: 'xfer', x: p.x, y: p.y, x2: cc.x, y2: cc.y, life: 14, max: 14, c: ITEMS[p.stack.it].c }); p.stack = null; } }
    p.building = null; if (!this.plans.length || c.noBuild) return;
    let pl = null; for (const q of this.plans) if (Math.hypot((q.x + q.B.s / 2) * TS - p.x, (q.y + q.B.s / 2) * TS - p.y) <= BUILD_RANGE) { pl = q; break; }
    if (pl) this.buildPlan(p, pl);
  }
  buildPlan(u, pl) {
    if (pl.done) return; const drop = () => { pl.done = 1; const k = this.plans.indexOf(pl); if (k >= 0) this.plans.splice(k, 1); for (const it in pl.paid) this.addCore(it, pl.paid[it], 1); };
    if (pl.brk ? pl.b.dead : !this.okTiles(pl.B, pl.x, pl.y, false)) return drop();
    u.building = pl; const dp = u.U.build / buildTime(pl.B) * this.rm('buildSpeedMultiplier');
    if (!pl.brk && pl.B.type !== 'core') this.clearFor(pl);
    if (pl.brk) pl.prog += dp;
    else {
      const np = Math.min(1, pl.prog + dp), c = this.core.items; let ok = true; const pay = {};
      const cm = this.rules.infiniteResources ? 0 : this.rm('buildCostMultiplier');
      for (const it in pl.B.cost) { const owe = Math.floor(pl.B.cost[it] * cm * np + 1e-9) - (pl.paid[it] || 0); if (owe > 0) { if ((c[it] || 0) < owe) ok = false; pay[it] = owe; } }
      pl.stall = !ok; if (!ok) return;
      for (const it in pay) { c[it] -= pay[it]; pl.paid[it] = (pl.paid[it] || 0) + pay[it]; }
      pl.prog = np;
    }
    if (pl.prog >= 1) { const k = this.plans.indexOf(pl); if (k >= 0) this.plans.splice(k, 1); this.finishPlan(pl); }
  }
  // a saját egységek parancs nélkül is tüzelnek a hatótávon belüli legközelebbi ellenségre (egység, aztán épület);
  // támadási parancsnál a parancsolt célpont az elsődleges, amíg az hatótávon kívül van, útközben a többire lőnek
  autoFire(u) {
    const U = u.U; if (!U.w.length || u.carrier) return; const R = U.wr || (U.wr = Math.max(...U.w.map(wr)));
    const ct = u.cmd && u.cmd.k === 'atk' && !u.cmd.t.dead ? u.cmd.t : null;
    if (ct) { const d = Math.hypot(ct.x - u.x, ct.y - u.y) - (ct.U ? ct.U.r : 0); if (d <= R) { u.aim = Math.atan2(ct.y - u.y, ct.x - u.x); this.attack(u, ct); return; } }
    if (this.tick % 10 === u.id % 10 || (u.atg && u.atg.dead)) { const c = this.nearestU(u.x, u.y, R, ENEMY, 1, 1, true); u.atg = c || (b => b && this.bref(b))(this.nearestB(u.x, u.y, R, q => q.team === ENEMY && q.B.type !== 'mine', true)); }
    const t = u.atg; if (!t || t.dead) return;
    if (Math.hypot(t.x - u.x, t.y - u.y) - (t.U ? t.U.r : 0) > R) return;
    u.aim = Math.atan2(t.y - u.y, t.x - u.x); this.attack(u, t);
  }
  // az új mag átveszi a hozzá kötött ellenséges / elhagyott épületeket: szomszédság, híd és áramvezeték mentén, láncban
  // (a saját épületeknél és a többi magnál a lánc megáll)
  captureNet(c) {
    const seen = new Set([c]), q = [c], out = [];
    while (q.length && out.length < 5000) {
      const b = q.shift(), nb = [...this.nbs(b), ...(b.links || []), ...(b.inl || [])]; if (b.link != null && b.link >= 0 && this.bt[b.link]) nb.push(this.bt[b.link]);
      for (const o of nb) { if (!o || o.dead || seen.has(o)) continue; seen.add(o); if (o.team === PLAYER || o.B.type === 'core') continue; out.push(o); q.push(o); }
    }
    for (const o of out) { o.team = PLAYER; o.tgt = null; }
    if (out.length) { this.ver++; this.pdirty = 1; this.fdirty = 1; this.msg(`${out.length} épület átvéve`); }
    return out.length;
  }
  // parancsmód (Mindustry RTS): a kijelölt egységek odavonulnak / megtámadják a célt
  command(L, x, y, t) {
    this.rallied = 1; let n = 0; const tg = t ? (t.U ? t : this.bref(t)) : null;
    for (const u of L) { if (!u || u.dead || u.team !== PLAYER || u === this.player || typeof u.ctl === 'object') continue;
      if (tg) { u.cmd = { k: 'atk', t: tg }; u.tgt = tg; u.home = { x: tg.x, y: tg.y }; }
      else { u.cmd = { k: 'move' }; u.tgt = null; u.home = { x: x + Math.cos(n * 2.4) * Math.sqrt(n) * (8 + u.U.r), y: y + Math.sin(n * 2.4) * Math.sqrt(n) * (8 + u.U.r) }; }
      n++; }
    return n;
  }
  rally(x, y) { this.rallied = 1; let n = 0; for (const u of this.units) if (u.team === PLAYER && u !== this.player && !u.U.miner) { u.home = { x: x + Math.cos(n * 2.4) * Math.sqrt(n) * 9, y: y + Math.sin(n * 2.4) * Math.sqrt(n) * 9 }; n++; } return n; }

  /* ----- útkeresés: időszeletelt Dijkstra a magtól ----- */
  flowBegin() {
    const dist = new Float32Array(this.w * this.h).fill(1e9), hp = new Heap(8192), co = this.core;
    for (let y = co.y; y < co.y + co.B.s; y++) for (let x = co.x; x < co.x + co.B.s; x++) { dist[y * this.w + x] = 0; hp.push(0, y * this.w + x); }
    return { dist, hp };
  }
  flowRun(budget) {
    const { dist, hp } = this.fjob, w = this.w, h = this.h, sol = this.sol, bt = this.bt, co = this.core, nw = this.nearW, A = this.area; let n = 0;
    while (hp.n && n++ < budget) {
      const i = hp.pop(), d = hp.top; if (d > dist[i]) continue; const x = i % w, y = (i - x) / w;
      for (let k = 0; k < 8; k++) {
        const X = x + NX[k], Y = y + NY[k]; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const q = Y * w + X; if (sol[q]) continue;   // az ellenség útja a lezárt zónán kívül is vezethet (Mindustry: az AI-csapatot a zóna nem korlátozza)
        if (k > 3 && (sol[y * w + X] || sol[Y * w + x])) continue;
        const b = bt[q]; if (b && b.team === ENEMY && isSolid(b)) continue; const nd = d + (k > 3 ? 1.414 : 1) + (b && b !== co && isSolid(b) ? (b.B.type === 'wall' ? 70 : 40) : 0) + nw[q] * 2;
        if (nd < dist[q]) { dist[q] = nd; hp.push(nd, q); }
      }
    }
    if (!hp.n) { this.flow = dist; this.fjob = null; }
  }

  /* ----- hullámok ----- */
  // az eredeti pályák hullámai (Mindustry SpawnGroup): minden csoport minden kezdőponton megjelenik
  mapWave() {
    const W = this.wave - 1, h = this.h, out = [], sps = [...this.spawns]; if (this.rules.attackMode && this.rules.wavesSpawnAtCores !== false) for (const b of this.blds) if (b.team === ENEMY && b.B.type === 'core') sps.push({ x: b.x + b.B.s / 2 - .5, y: b.y + b.B.s / 2 - .5, core: 1 });
    for (const g of this.sec.groups) {
      const U = UNITS[g.type]; if (!U) continue; const sp = g.spacing || 1, end = g.end ?? 1e9, begin = g.begin || 0;
      if (W < begin || W > end || (W - begin) % sp) continue;
      const n = Math.min((g.amount ?? 1) + (g.scaling ? Math.floor(Math.floor((W - begin) / sp) / g.scaling) : 0), g.max ?? 40), sh = Math.max((g.shields || 0) + (g.shieldScaling || 0) * (W - begin), 0);
      const at = g.spawn != null && g.spawn >= 0 ? sps.filter(s => s.x === g.spawn >>> 16 && s.y === h - 1 - (g.spawn & 0xffff)) : sps.filter(s => !s.core || !U.naval);
      for (const s of at) for (let k = 0; k < n; k++) out.push([g.type, sh, null, s]);
    }
    return out;
  }
  nextWave() {
    if (this.sec.groups) {
      const list = this.mapWave(); this.wave++;
      list.forEach(([t, sh, eff, sp]) => { const a = Math.random() * Math.PI * 2, r = Math.random() * 18 + UNITS[t].r, u = this.spawnU(t, ENEMY, (sp.x + .5) * TS + Math.cos(a) * r, (sp.y + .5) * TS + Math.sin(a) * r); u.sh = sh; });
      const dz = (this.rules.dropZoneRadius ?? 300); if (dz > 0) for (const sp of this.spawns) { const x = (sp.x + .5) * TS, y = (sp.y + .5) * TS; for (const b of [...this.blds]) { const c = this.center(b); if (b.team === PLAYER && b !== this.core && Math.hypot(c.x - x, c.y - y) < dz) this.remB(b, 1); } for (const u of this.units) if (u.team === PLAYER && !u.U.air && Math.hypot(u.x - x, u.y - y) < dz) this.dmgU(u, 1e9, 1); }   // a ledobási zóna mindent elpusztít
      this.wtimer = (this.rules.waveSpacing || 7200) * (this.sec.wsm || 1);
      for (const sp of this.spawns) this.fx.push({ k: 'ring', x: (sp.x + .5) * TS, y: (sp.y + .5) * TS, r: dz / 2 || 48, life: 40, max: 40, c: '#f25555' });
      if (FW.js) FW.js.ev('WaveEvent', {}); if (this.onWave) this.onWave(this.wave); return;
    }
    const list = waveUnits(this.wave + 1, this.sec); this.wave++;
    list.forEach(([t, sh, eff], k) => { const sp = this.spawns[k % this.spawns.length], a = Math.random() * Math.PI * 2, r = Math.random() * 18 + UNITS[t].r, u = this.spawnU(t, ENEMY, (sp.x + .5) * TS + Math.cos(a) * r, (sp.y + .5) * TS + Math.sin(a) * r); u.sh = sh; if (eff) u.st[eff] = 1e9; });
    this.wtimer = this.sec.wt * 60;
    for (const sp of this.spawns) this.fx.push({ k: 'ring', x: (sp.x + .5) * TS, y: (sp.y + .5) * TS, r: 48, life: 40, max: 40, c: '#f25555' });
    if (FW.js) FW.js.ev('WaveEvent', {}); if (this.onWave) this.onWave(this.wave);
  }
  enemies() { return this.nEn; }

  /* ----- lépés ----- */
  step() {
    if (this.lost || this.won) return;
    this.tick++;
    let ne = 0; for (const u of this.units) if (u.team === ENEMY && !u.dead) ne++; this.nEn = ne;
    if (this.fdirty && !this.fjob && this.tick - this.flowT > 30 && (ne || this.wtimer < 900)) { this.fdirty = 0; this.flowT = this.tick; this.fjob = this.flowBegin(); }
    if (this.fjob) this.flowRun(30000);
    this.powerTick(); this.fillFoe(); if (this.fog && this.tick % 3 === 0) this.updVis();
    const PB = this.teamB(PLAYER); for (const b of PB) if (b.B.heatReq || b.B.type === 'heatcond') b.hIn = 0;          // hőátadás: a hőtermelő az előtte álló épületnek adja
    for (const b of PB) if (b.hOut > .001) {
      if (b.B.split) { const T = this.nbs(b).filter(o => (o.B.heatReq || o.B.type === 'heatcond') && this.front(o) !== b); for (const o of T) o.hIn += b.hOut / T.length; continue; }   // hőelosztó: a szomszédok között szétosztja
      const f = this.front(b); if (f && f !== b && (f.B.heatReq || f.B.type === 'heatcond')) f.hIn += b.hOut; }
    if (this.actV !== this.ver) { this.actV = this.ver; this.act = [...this.teamB(PLAYER), ...this.teamB(ENEMY)]; }   // csak a játékos épületei és az ellenséges tornyok frissülnek
    for (const b of this.act) { if (b.off || b.dead) continue; if (b.team === PLAYER) this.updB(b); else if (b.team === ENEMY) this.updFoe(b); }
    for (const u of this.units) if (u.carrier) { if (u.carrier.dead) u.carrier = null; else { u.x = u.carrier.x; u.y = u.carrier.y; } }
    if (this.onTick) this.onTick();
    if (this.rules.infiniteResources && this.tick % 30 === 0) { const c = this.core.items, cap = this.coreCap(); for (const k of ITEM_IDS) c[k] = cap; }   // homokozó
    if (FW.tick) FW.tick(this);
    if (FW.js) FW.js.tick(this);
    if (!this.player || this.player.dead) { if (this.respawn-- <= 0) this.spawnPlayer(); }
    for (const u of this.units) if (!u.dead) { const ox = u.x, oy = u.y; this.updUnit(u); if (u.team === PLAYER && u !== this.player && typeof u.ctl !== 'object' && !u.dead) this.autoFire(u); u.mvx = (u.mvx || 0) * .5 + (u.x - ox) * .5; u.mvy = (u.mvy || 0) * .5 + (u.y - oy) * .5;   // a tényleges sebesség (az előretartáshoz)
 if (u.U.js && FW.js && !u.dead) FW.js.updUnit(this, u); }
    if (this.tick % 2 === 0) { const L = this.units; for (let a = 0; a < L.length; a++) { const u = L[a]; if (u.dead || u === this.player) continue; for (let b = a + 1; b < L.length; b++) { const v = L[b]; if (v.dead || v === this.player || !!u.U.air !== !!v.U.air) continue; const dx = v.x - u.x, dy = v.y - u.y, r = u.U.r + v.U.r, d2 = dx * dx + dy * dy; if (d2 < r * r && d2 > .01) { const d = Math.sqrt(d2), f = (r - d) / d * .25; this.moveU(u, -dx * f, -dy * f); this.moveU(v, dx * f, dy * f); } } } }
    this.units = this.units.filter(u => !u.dead || u === this.player);
    this.updBullets();
    for (const f of this.fx) f.life--; this.fx = this.fx.filter(f => f.life > 0);
    for (const m of this.msgs) m.life--; this.msgs = this.msgs.filter(m => m.life > 0);
    if (this.rules.waves && this.rules.waveTimer && (!this.sec.win || this.wave < this.sec.win) && !(this.rules.waitForWaveToEnd && this.nEn > 0)) { this.wtimer--; if (this.wtimer <= 0) this.nextWave(); }
    if (this.rules.attackMode && this.eteam && !this.ecores) { this.won = true; this.derelictAll(); return; }
    if (this.sec.win && this.wave >= this.sec.win) { this.calm = ne === 0 ? (this.calm || 0) + 1 : 0; if (this.calm > 90) { this.won = true; this.derelictAll(); } }
  }
  // az enemy tornyai: a Mindustry-pályákon a saját ellátásuk helyett végtelen lőszert kapnak
  // ellenséges épület: a Mindustryhez hasonlóan teljes szimuláció (bányászat, szállítás, áram, lőszer); csak a „cheat” csapatszabály ad végtelen lőszert
  updFoe(b) {
    const B = b.B;
    if (B.type === 'turret' && this.teamRule(ENEMY, 'cheat')) { if (B.ammo && !b.ammo.length) { const k = Object.keys(B.ammo)[0]; b.ammo.push({ it: k, n: 1e9 }); } if (B.lammo && b.lq < 5) { b.lt = Object.keys(B.lammo)[0]; b.lq = B.lcap || 10; } }
    if (B.type === 'btower' || B.type === 'core') { if (b.hit > 0) b.hit--; return; }
    this.updB(b);
  }
  fillFoe() {     // fillItems csapatszabály: a mag mindig tele
    if (this.tick % 60 || !this.teamRule(ENEMY, 'fillItems')) return; const c = this.coreOf(ENEMY); if (!c) return; const cap = this.cofC[ENEMY] || c.B.cap;
    for (const k of ITEM_IDS) c.items[k] = cap;
  }
  derelictAll() { this.ver++; for (const b of this.blds) if (b.team === ENEMY) { b.team = DERELICT; b.tgt = null; } for (const u of this.units) if (u.team === ENEMY) u.dead = 1; this.fdirty = 1; }
  hitFx(b) { this.fx.push({ k: 'hit', x: b.x, y: b.y, life: 8, max: 8, c: b.c }); }
  burst(b, foe) {        // becsapódás: területi sebzés, repeszek, villámok
    if (b.spl) this.splash(b.x, b.y, b.splR, b.spl, foe, b.k === 'art' ? 0 : 1, b.k === 'flak' ? !!b.ground : 1, b.k !== 'flak' || !!b.ground, b.st);
    if (b.heal) this.healB(b.x, b.y, (b.splR || 8) + 6, b.heal, b.team);
    if (b.zap) for (let k = 0; k < b.zap; k++) this.lightning(b.x, b.y, Math.random() * 7, b.zapD, b.team, 5);
    const f = b.frag; if (f) for (let k = 0; k < f.n; k++) { const a = Math.random() * 7, sp = f.sp * (.6 + Math.random() * .6); this.bullets.push(f.k === 'art' ? { k: 'art', x: b.x, y: b.y, sx: b.x, sy: b.y, tx: b.x + Math.cos(a) * sp * f.life, ty: b.y + Math.sin(a) * sp * f.life, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: f.life, d: f.d, spl: f.spl, splR: f.splR, team: b.team, ground: 1, c: b.c } : { x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: f.life, d: f.d, spl: f.spl, splR: f.splR, team: b.team, air: f.air !== 0, ground: f.ground !== 0, c: b.c }); }
  }
  updBullets() {
    const out = [], w = this.w; let nj = 0;
    for (const b of this.bullets) {
      if (b.jsb != null && FW.js) { nj++; FW.js.bUpd(this, b); }
      if (b.hom && !b.hom.dead && b.k !== 'art') { const a = Math.atan2(b.hom.y - b.y, b.hom.x - b.x), sp = Math.hypot(b.vx, b.vy), ca = Math.atan2(b.vy, b.vx), da = ((a - ca + Math.PI * 3) % (Math.PI * 2)) - Math.PI, na = ca + Math.max(-b.hp, Math.min(b.hp, da)); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; }
      const foe = foeOf(b.team);
      if (b.k !== 'drv' && b.k !== 'art') {          // a térkép falai fölött átrepül (Mindustry); az épületnél és a pálya szélénél áll meg, gyors lövedéknél résztávolságonként vizsgálva
        const n = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) / 4)); let nx = b.x + b.vx, ny = b.y + b.vy, wallHit = false;
        for (let k = 1; k <= n; k++) {
          const px = b.x + b.vx * k / n, py = b.y + b.vy * k / n, tx = Math.floor(px / TS), ty = Math.floor(py / TS);
          if (!this.inb(tx, ty)) { nx = b.x + b.vx * (k - 1) / n; ny = b.y + b.vy * (k - 1) / n; wallHit = true; break; }
          { const bl = this.bt[ty * w + tx]; if (bl && bl.team !== b.team && !UNDER(bl) && !bl.open && !(b.seen && b.seen.includes(bl))) { nx = px; ny = py; break; } }   // az első épületnél megáll
        }
        b.x = nx; b.y = ny;
        if (wallHit) { if (b.k !== 'flame') this.hitFx(b); if (b.spl || b.k === 'flak' || b.k === 'missile') this.burst(b, foe); continue; }
      } else { b.x += b.vx; b.y += b.vy; }
      b.life--;
      if (b.k === 'drv') { if (b.life <= 0) { const t = b.tgt; t.incoming = 0; if (!t.dead) for (const k in b.items) t.items[k] = (t.items[k] || 0) + b.items[k]; continue; } out.push(b); continue; }
      if (b.k === 'art') { if (b.life <= 0) { this.burst(b, foe); continue; } out.push(b); continue; }
      if (b.team !== PLAYER && !b.k) { let ab = false; for (const s of this.shields) if (s.on && Math.hypot(b.x - (s.x + 1.5) * TS, b.y - (s.y + 1.5) * TS) < s.rad) { s.sh += b.d + (b.spl || 0); s.hit = 6; if (s.sh >= s.B.shp) { s.broken = true; s.on = false; } ab = true; break; } if (ab) { this.hitFx(b); continue; } }
      let hit = false;
      for (const u of this.units) {
        if (u.team !== foe || u.dead) continue;
        if (u.ffh > 0 && Math.hypot(u.x - b.x, u.y - b.y) < u.U.ab.ff[0]) { u.ffh -= b.d + (b.spl || 0); if (u.ffh <= 0) u.ffb = u.U.ab.ff[3]; hit = true; b.pierce = 0; break; }
        if (u.U.air ? !b.air : !b.ground) continue;
        const R = u.U.r + 2 + (b.k === 'flak' ? b.splR * .5 : 0);
        if (Math.abs(u.x - b.x) < R && Math.abs(u.y - b.y) < R) {
          if (b.seen && b.seen.includes(u)) continue;
          if (b.jsb != null && FW.js) FW.js.bHit(this, b, u, null); this.dmgU(u, b.d); if (b.st) u.st[b.st] = b.stT || 240; if (b.liq === 'water') { u.vx += b.vx * .25; u.vy += b.vy * .25; }
          hit = true; if (b.pierce > 0) (b.seen = b.seen || []).push(u); break;
        }
      }
      if (!hit) { const bl = this.tb(Math.floor(b.x / TS), Math.floor(b.y / TS)); if (bl && bl.team !== b.team && (!UNDER(bl) || bl === b.ab) && !(bl.open) && !(b.seen && b.seen.includes(bl))) {
        if (bl.B.deflect && !b.k && Math.random() < bl.B.deflect / Math.max(1, b.d)) { b.vx = -b.vx; b.vy = -b.vy; b.team = bl.team; b.c = '#f4ba6e'; b.life += 20; out.push(b); continue; }
        if (b.jsb != null && FW.js) FW.js.bHit(this, b, null, bl); this.dmgB(bl, b.d * (b.bdm || 1), b); hit = true; if (b.pierce > 0 && b.pb) (b.seen = b.seen || []).push(bl); else b.pierce = 0;
      } }
      if (hit) { if (b.k !== 'flame') this.hitFx(b); if (b.pierce > 0) { b.pierce--; out.push(b); continue; } this.burst(b, foe); continue; }
      if (b.life <= 0) { if (b.k === 'flak' || b.k === 'missile') this.burst(b, foe); continue; }
      out.push(b);
    }
    if (nj && FW.js) { const keep = new Set(out); for (const b of this.bullets) if (b.jsb != null && !keep.has(b)) FW.js.bEnd(this, b); }
    this.bullets = out;
  }

  /* ----- mentés ----- */
  save() {
    const st = b => { const o = {}; if (sum(b.items) > 0) o.i = b.items; if (b.ammo && b.ammo.length) o.a = b.ammo; if (b.lq > .5) o.l = [b.lt, Math.round(b.lq)]; if (b.oq > .5) o.o = Math.round(b.oq); if (b.pw > 1) o.p = Math.round(b.pw); if (b.burn > 0) o.b = [Math.round(b.burn), b.bm]; if (b.heat > .01 && b.B.mode) o.h = +b.heat.toFixed(2); if (b.warm > .01) o.w = +b.warm.toFixed(3); if (b.pay) o.y = b.pay; if (b.open) o.d = 1; if (b.team !== PLAYER) o.tm = b.team; if (b.off) o.off = 1;
      if (b.cv && b.cv.length) o.c = b.cv.map(e => [e.it, Math.round(e.p * 1000) / 1000]); if (b.st) o.s = [b.st.it, b.st.n]; if (b.jb && b.jb.some(q => q.length)) o.j = b.jb.map(q => q.map(e => e.it)); if ((b.B.type === 'router' || b.B.type === 'bridge') && b.buf != null && (!Array.isArray(b.buf) || b.buf.length)) o.r = b.buf;   // szállítás közbeni tárgyak
      return Object.keys(o).length ? o : 0; };
    return {
      v: 2, gv: this.sec.gen === 1 ? undefined : this.sec.gen === 2 ? 2 : 3, wave: this.wave, wt: Math.round(this.wtimer), items: this.core.items, chp: Math.round(this.core.hp), kills: this.stats.kills,
      core: this.core.t, cx: this.core.x, cy: this.core.y, seen: this.fog ? rle(this.seen) : undefined, rb: this.rebuild.slice(0, 200),
      b: this.blds.filter(b => b !== this.core).map(b => { const a = [b.t, b.x, b.y, b.rot, Math.round(b.hp), b.cfg ?? null, b.link ?? -1, b.links ? b.links.map(l => l.i) : 0], s = st(b); if (s) a.push(s); return a; }),
      p: this.plans.map(p => [p.t, p.x, p.y, p.rot, p.brk ? 1 : 0, p.cfg ?? null]),
      u: this.units.filter(u => u.team === PLAYER && u !== this.player).map(u => [u.t, Math.round(u.x), Math.round(u.y), Math.round(u.hp)]),
      st: this.sec.map ? { placed: this.stats.placed, coreIn: this.stats.coreIn, ek: this.stats.ekill || 0, fl: [...this.flags], ru: this.rules, ar: this.area, sc: this.onSave ? this.onSave() : null } : undefined,
    };
  }
  load(s) {
    this.wave = s.wave || 0; this.wtimer = s.wt || this.wtimer; this.core.items = s.items || {}; this.core.hp = Math.min(this.core.B.hp, s.chp || this.core.hp); this.stats.kills = s.kills || 0;
    if (s.seen && this.fog) unrle(s.seen, this.seen); this.rebuild = s.rb || [];
    const links = [];
    if (s.st) { const q = s.st; this.stats.placed = q.placed || {}; this.stats.coreIn = q.coreIn || {}; this.stats.ekill = q.ek || 0; this.flags = new Set(q.fl || []); if (q.ru) this.rules = q.ru; this.area = q.ar || null; this.scState = q.sc; }
    for (const [t, x, y, rot, hp, cfg, link, lk, st] of s.b || []) {
      const B = BLOCKS[t]; if (!B) continue; let ok = true; for (let yy = 0; yy < B.s; yy++) for (let xx = 0; xx < B.s; xx++) if (!this.inb(x + xx, y + yy) || this.bt[(y + yy) * this.w + x + xx] || this.wall[(y + yy) * this.w + x + xx]) ok = false; if (!ok) continue;
      const b = this.addB(t, x, y, rot, cfg, st && st.tm != null ? st.tm : PLAYER); if (st && st.off) b.off = 1; b.hp = Math.min(B.hp, hp || B.hp); if (b.link !== undefined) b.link = link; if (lk) links.push([b, lk]);
      if (st) { if (st.i) b.items = st.i; if (st.a && b.ammo) b.ammo = st.a.filter(a => B.ammo && B.ammo[a.it]); if (st.l && LIQUIDS[st.l[0]]) { b.lt = st.l[0]; b.lq = st.l[1]; } if (st.o) b.oq = st.o; if (st.p) b.pw = st.p; if (st.b) { b.burn = st.b[0]; b.bm = st.b[1]; } if (st.h) b.heat = st.h; if (st.w) b.warm = st.w; if (st.y && UNITS[st.y]) b.pay = st.y; if (st.d) b.open = true;
        if (st.c && b.cv) b.cv = st.c.filter(e => ITEMS[e[0]]).map(([it, p]) => ({ it, p })); if (st.s && 'st' in b && ITEMS[st.s[0]]) b.st = { it: st.s[0], n: st.s[1], age: 0 }; if (st.j && b.jb) b.jb = st.j.map(q => q.filter(it => ITEMS[it]).map(it => ({ it, tm: -9999 }))); if (st.r != null) { if (Array.isArray(b.buf)) b.buf = [].concat(st.r).filter(it => ITEMS[it]); else if (ITEMS[st.r]) b.buf = st.r; } }
    }
    for (const [b, lk] of links) for (const i of lk) { const o = this.bt[i]; if (o && o.i === i) this.link(b, o); }
    for (const [t, x, y, rot, brk, cfg] of s.p || []) { if (!BLOCKS[t]) continue; if (brk) { const b = this.tb(x, y); if (b) this.unplan(b); } else this.plan(t, x, y, rot, cfg); }
    for (const [t, x, y, hp] of s.u || []) { if (!UNITS[t]) continue; const u = this.spawnU(t, PLAYER, x, y); u.hp = hp; }
    // korábbi mentés: a magzónára épített mellékmagot a statisztika nem számolta (a küldetés elakadt), és nem vette át a hálózatát – pótoljuk
    const pc = this.blds.filter(b => b.B.type === 'core' && b.team === PLAYER && b !== this.core), cnt = {}; for (const b of pc) cnt[b.t] = (cnt[b.t] || 0) + 1;
    for (const t in cnt) if ((this.stats.placed[t] || 0) < cnt[t]) { this.stats.placed[t] = cnt[t]; for (const b of pc) if (b.t === t) this.captureNet(b); }
  }
}
