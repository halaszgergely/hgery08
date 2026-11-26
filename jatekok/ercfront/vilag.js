// Ércfront – a világ szimulációja: térképgenerálás, épületek, szállítás, áram, tornyok, egységek, hullámok, építés.
import { TS, ITEMS, ITEM_IDS, FLOORS, WALLS, BLOCKS, UNITS, waveUnits } from './adat.js?v=202611261553';

export const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
export const FL = Object.keys(FLOORS), FLI = Object.fromEntries(FL.map((k, i) => [k, i]));
export const WL = Object.keys(WALLS);
const GAP = .3, BUILD_RANGE = 220, MINE_RANGE = 70, CORE_RANGE = 220, MAX_AMMO = 30, UNIT_CAP = 24, REFUND = .5;
export const PLAYER = 1, ENEMY = 2;

/* ---------- véletlen, zaj ---------- */
export function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function hstr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function hash2(x, y, s) { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vn(x, y, s) { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); const a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), c = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, y, s) { return vn(x, y, s) * .57 + vn(x * 2.1, y * 2.1, s + 7) * .29 + vn(x * 4.3, y * 4.3, s + 13) * .14; }

/* ---------- térkép ---------- */
const BIOMES = { stone: ['stone', 'dark', 'rock', 'sandf'], snow: ['snow', 'ice', 'snowrock', 'darksand'], sand: ['darksand', 'sandf', 'sandrock', 'sandf'], dark: ['dark', 'metal', 'darkrock', 'darksand'] };
export function genMap(sec) {
  const w = sec.w, h = sec.h, N = w * h, s = hstr(sec.id) % 100000, R = rng(hstr(sec.id) ^ 0x9e3779b9);
  const floor = new Uint8Array(N), ore = new Uint8Array(N), wall = new Uint8Array(N), bio = BIOMES[sec.biome];
  const wallT = WL.indexOf(bio[2]) + 1;
  const cx = Math.round(w * .2), cy = Math.round(h * (.5 + (R() - .5) * .25));
  const spawns = [{ x: w - 7, y: Math.round(h * (.3 + R() * .4)) }];
  if (sec.threat >= 2.2) spawns.push({ x: Math.round(w * (.55 + R() * .2)), y: R() < .5 ? 6 : h - 7 });
  const wet = sec.biome !== 'sand';
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, n = fbm(x / 13, y / 13, s), m = fbm(x / 9, y / 9, s + 101), sd = fbm(x / 11, y / 11, s + 202), wa = fbm(x / 17, y / 17, s + 303);
    let f = m > .58 ? bio[1] : bio[0];
    if (sd > .8 - sec.sand * .3) f = sd > .84 - sec.sand * .3 ? 'sandf' : bio[3];
    if (wet && wa < .27) f = wa < .21 ? 'deep' : 'water';
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
  ITEM_IDS.forEach((id, k) => {
    const fr = sec.ores[id]; if (!fr || id === 'sand') return;
    const minD = id === 'titanium' ? 26 : id === 'thorium' ? 42 : 0, th = .775 - fr * .055 + (id === 'scrap' ? .02 : 0);
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
      const i = y * w + x; if (wall[i] || FLOORS[FL[floor[i]]].shallow || FLOORS[FL[floor[i]]].deep) continue;
      if (coreD(x, y) < Math.max(minD, 5)) continue;
      if (fbm(x / 4.2, y / 4.2, s + 500 + k * 37) > th) ore[i] = k + 1;
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

/* ---------- segédek ---------- */
const BSET = (...a) => new Set(a);
const POWER_T = BSET('generator', 'battery', 'node');
export const isPow = b => POWER_T.has(b.B.type) || !!b.B.power;
export function buildTime(B) { let c = 2; for (const k in B.cost) c += B.cost[k] * ITEMS[k].cost; return c * 1.4; }
const ammoOf = (B, it) => B.ammo && B.ammo[it];

export class World {
  constructor(sec, save) {
    const m = genMap(sec); Object.assign(this, m);
    this.sec = sec; this.w = sec.w; this.h = sec.h;
    this.bt = new Array(this.w * this.h).fill(null);
    this.blds = []; this.units = []; this.bullets = []; this.fx = []; this.plans = []; this.msgs = [];
    this.wave = 0; this.wtimer = sec.wt * 60 * 1.6; this.tick = 0; this.ver = 1; this.pdirty = 1; this.fdirty = 1; this.flowT = 0;
    this.won = false; this.lost = false; this.graphs = []; this.flow = null; this.ctl = { mx: 0, my: 0, ax: 0, ay: 0, shoot: false };
    this.stats = { kills: 0, built: 0 };
    this.core = this.addB('core', this.coreAt.x, this.coreAt.y, 0);
    this.core.items = {}; for (const k in sec.start) this.core.items[k] = sec.start[k];
    this.player = null; this.respawn = 0;
    if (save) this.load(save);
    this.spawnPlayer();
    this.calcFlow();
  }
  /* ----- mezők ----- */
  inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  tb(x, y) { return this.inb(x, y) ? this.bt[y * this.w + x] : null; }
  fl(i) { return FLOORS[FL[this.floor[i]]]; }
  solidG(i) { return this.wall[i] || this.fl(i).deep; }
  mineItem(i, tier = 9) { const o = this.ore[i]; let it = o ? ITEM_IDS[o - 1] : this.fl(i).ore; if (!it || this.wall[i]) return null; return ITEMS[it].h <= tier ? it : null; }
  tbDir(b, d) { const s = b.B.s; if (s === 1) return this.tb(b.x + DX[d], b.y + DY[d]); return null; }
  center(b) { return { x: (b.x + b.B.s / 2) * TS, y: (b.y + b.B.s / 2) * TS }; }
  sideOf(t, src) { const dx = (src.x + src.B.s / 2) - (t.x + t.B.s / 2), dy = (src.y + src.B.s / 2) - (t.y + t.B.s / 2); return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3); }
  nbs(b) {
    if (b.nbv === this.ver) return b.nb;
    const s = b.B.s, set = new Set();
    for (let k = 0; k < s; k++) { for (const [x, y] of [[b.x + s, b.y + k], [b.x + k, b.y + s], [b.x - 1, b.y + k], [b.x + k, b.y - 1]]) { const o = this.tb(x, y); if (o && o !== b) set.add(o); } }
    b.nb = [...set]; b.nbv = this.ver; return b.nb;
  }
  msg(t, c) { this.msgs.push({ t, c: c || '', life: 240 }); }

  /* ----- épületek ----- */
  addB(t, x, y, rot = 0, cfg = null) {
    const B = BLOCKS[t], b = { t, B, x, y, rot, i: y * this.w + x, hp: B.hp, items: {}, di: 0, ps: 0, pgen: 0, pneed: 0, cfg, team: PLAYER, work: 0, prog: 0, hit: 0 };
    switch (B.type) {
      case 'conveyor': b.cv = []; break;
      case 'junction': b.jb = [[], [], [], []]; break;
      case 'router': b.buf = null; b.from = null; b.rt = 0; break;
      case 'bridge': b.buf = []; b.link = -1; b.indir = -1; break;
      case 'turret': b.ammo = []; b.ang = -Math.PI / 2; b.rl = 0; b.tgt = null; b.side = 1; b.heat = 0; b.burst = 0; break;
      case 'generator': b.burn = 0; break;
      case 'battery': b.pw = 0; break;
      case 'node': b.links = []; break;
      case 'factory': if (cfg == null) b.cfg = 0; break;
      case 'drill': b.rotA = 0; this.drillScan(b); break;
    }
    b.inl = [];
    for (let yy = 0; yy < B.s; yy++) for (let xx = 0; xx < B.s; xx++) this.bt[(y + yy) * this.w + x + xx] = b;
    this.blds.push(b); this.ver++; this.pdirty = 1; this.fdirty = 1;
    return b;
  }
  remB(b, boom) {
    const B = b.B;
    for (let yy = 0; yy < B.s; yy++) for (let xx = 0; xx < B.s; xx++) { const i = (b.y + yy) * this.w + b.x + xx; if (this.bt[i] === b) this.bt[i] = null; }
    const k = this.blds.indexOf(b); if (k >= 0) this.blds.splice(k, 1);
    for (const o of b.links || []) o.inl = o.inl.filter(z => z !== b);
    for (const o of b.inl) if (o.links) o.links = o.links.filter(z => z !== b);
    b.dead = 1; this.ver++; this.pdirty = 1; this.fdirty = 1;
    if (boom) { const c = this.center(b); this.boom(c.x, c.y, B.s * 7, '#ffb347'); this.fx.push({ k: 'rubble', x: b.x, y: b.y, s: B.s, life: 1800, max: 1800 }); }
  }
  drillScan(b) {
    const B = b.B, cnt = {};
    for (let yy = 0; yy < B.s; yy++) for (let xx = 0; xx < B.s; xx++) { const it = this.mineItem((b.y + yy) * this.w + b.x + xx, B.tier); if (it) cnt[it] = (cnt[it] || 0) + 1; }
    let best = null, n = 0; for (const k in cnt) if (cnt[k] > n || (cnt[k] === n && ITEMS[k].h > ITEMS[best].h)) { best = k; n = cnt[k]; }
    b.dItem = best; b.dCnt = n;
  }
  canPlace(t, x, y, rot) {
    const B = BLOCKS[t], s = B.s;
    for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) {
      const X = x + xx, Y = y + yy; if (!this.inb(X, Y)) return false; const i = Y * this.w + X;
      if (this.wall[i] || this.fl(i).deep) return false;
      const o = this.bt[i];
      if (o && !(s === 1 && o.B.type === 'conveyor' && B.type === 'conveyor' && o.t !== t)) return false;
      if (this.plans.some(p => !p.brk && X >= p.x && Y >= p.y && X < p.x + p.B.s && Y < p.y + p.B.s)) return false;
      for (const sp of this.spawns) if ((X - sp.x) ** 2 + (Y - sp.y) ** 2 < 36) return false;
    }
    if (B.type === 'drill') { let ok = 0; for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) if (this.mineItem((y + yy) * this.w + x + xx, B.tier)) ok = 1; if (!ok) return false; }
    return true;
  }
  plan(t, x, y, rot, cfg) {
    const o = this.tb(x, y);
    if (o && o.t === t && BLOCKS[t].type === 'conveyor') { if (o.rot !== rot) { o.rot = rot; this.ver++; } return true; }
    if (!this.canPlace(t, x, y, rot)) return false;
    this.plans.push({ t, B: BLOCKS[t], x, y, rot, cfg: cfg ?? null, prog: 0, paid: {}, brk: false });
    return true;
  }
  unplan(b) {
    if (b.t === 'core') return false;
    if (this.plans.some(p => p.brk && p.b === b)) return false;
    this.plans.push({ t: b.t, B: b.B, x: b.x, y: b.y, rot: b.rot, b, prog: 0, paid: {}, brk: true }); return true;
  }
  cancelAt(x, y) { const n = this.plans.length; this.plans = this.plans.filter(p => !(x >= p.x && y >= p.y && x < p.x + p.B.s && y < p.y + p.B.s)); return n !== this.plans.length; }
  finishPlan(p) {
    if (p.brk) {
      if (!p.b.dead) { for (const k in p.B.cost) this.addCore(k, Math.floor(p.B.cost[k] * REFUND)); this.remB(p.b); }
      return;
    }
    const old = this.tb(p.x, p.y);
    if (old && old.B.type === 'conveyor' && p.B.type === 'conveyor') { for (const k in old.B.cost) this.addCore(k, old.B.cost[k]); const cv = old.cv; this.remB(old); const nb = this.addB(p.t, p.x, p.y, p.rot, p.cfg); nb.cv = cv; return; }
    const b = this.addB(p.t, p.x, p.y, p.rot, p.cfg); this.stats.built++;
    if (b.B.type === 'bridge') { const pb = this.lastBridge, d = pb ? Math.abs(pb.x - b.x) + Math.abs(pb.y - b.y) : 0; if (pb && !pb.dead && pb.link < 0 && (pb.x === b.x || pb.y === b.y) && d > 0 && d <= b.B.range) pb.link = b.i; this.lastBridge = b; }
    if (b.B.type === 'node') this.autoLink(b);
    else if (isPow(b)) this.linkToNodes(b);
  }
  addCore(k, n) { const c = this.core.items; c[k] = Math.min(this.core.B.cap, (c[k] || 0) + n); }
  has(cost, mult = 1) { const c = this.core.items; for (const k in cost) if ((c[k] || 0) < Math.ceil(cost[k] * mult)) return false; return true; }

  /* ----- áram ----- */
  autoLink(n) {
    const c = this.center(n), R = n.B.range * TS, cand = [];
    for (const b of this.blds) { if (b === n || !isPow(b)) continue; const d = Math.hypot(this.center(b).x - c.x, this.center(b).y - c.y) - b.B.s * TS / 2; if (d <= R) cand.push([d, b]); }
    cand.sort((a, b) => a[0] - b[0]); this.solvePower();
    for (const [, b] of cand) { if (n.links.length >= n.B.links) break; if (b.g && n.g && b.g === n.g && b.B.type !== 'node') continue; this.link(n, b); this.solvePower(); }
  }
  linkToNodes(b) {
    const c = this.center(b);
    for (const n of this.blds) { if (n.B.type !== 'node' || n.links.length >= n.B.links) continue; const d = Math.hypot(this.center(n).x - c.x, this.center(n).y - c.y) - b.B.s * TS / 2; if (d <= n.B.range * TS) { this.link(n, b); break; } }
  }
  link(n, b) { if (n.links.includes(b) || b.links?.includes(n)) return; n.links.push(b); b.inl.push(n); this.pdirty = 1; }
  unlink(n, b) { n.links = n.links.filter(z => z !== b); b.inl = b.inl.filter(z => z !== n); if (b.links) { b.links = b.links.filter(z => z !== n); n.inl = n.inl.filter(z => z !== b); } this.pdirty = 1; }
  toggleLink(n, b) { if (n.links.includes(b) || b.links?.includes(n)) this.unlink(n, b); else if (n.links.length < n.B.links) this.link(n, b); else return false; return true; }
  solvePower() {
    if (!this.pdirty) return; this.pdirty = 0; this.graphs = [];
    for (const b of this.blds) b.g = null;
    for (const b0 of this.blds) {
      if (b0.g || !isPow(b0)) continue;
      const g = { m: [], prod: 0, need: 0, stored: 0, cap: 0, sat: 0 }, st = [b0]; b0.g = g;
      while (st.length) {
        const b = st.pop(); g.m.push(b);
        const nx = [...(b.links || []), ...b.inl];
        if (b.B.type === 'battery' || b.B.type === 'node') for (const o of this.nbs(b)) if (isPow(o)) nx.push(o);
        for (const o of this.nbs(b)) if ((o.B.type === 'battery' || o.B.type === 'node') && isPow(b)) nx.push(o);
        for (const o of nx) if (!o.g && !o.dead) { o.g = g; st.push(o); }
      }
      this.graphs.push(g);
    }
  }
  powerTick() {
    this.solvePower();
    for (const g of this.graphs) {
      let prod = 0, need = 0, stored = 0, cap = 0;
      for (const b of g.m) { prod += b.pgen; need += b.pneed; if (b.B.type === 'battery') { stored += b.pw; cap += b.B.capP; } }
      let sat = 1;
      if (prod >= need) { let sur = prod - need; for (const b of g.m) if (b.B.type === 'battery' && sur > 0) { const a = Math.min(sur, b.B.capP - b.pw); b.pw += a; sur -= a; } }
      else { let def = need - prod, got = 0; for (const b of g.m) if (b.B.type === 'battery' && def > 0) { const a = Math.min(def, b.pw); b.pw -= a; def -= a; got += a; } sat = need > 0 ? Math.min(1, (prod + got) / need) : 1; }
      for (const b of g.m) b.ps = sat;
      Object.assign(g, { prod, need, stored, cap, sat });
    }
    for (const b of this.blds) if (!b.g) b.ps = 0;
  }

  /* ----- tárgyátadás ----- */
  offer(t, it, src, d = 0) {
    if (!t || t === src || d > 8 || t.dead) return false;
    const B = t.B;
    switch (B.type) {
      case 'conveyor': {
        const side = this.sideOf(t, src); if (side === t.rot) return false;
        const L = t.cv; if (L.length >= 4) return false;
        let p0 = 0;
        if (side !== (t.rot + 2) % 4) { const bk = this.tb(t.x - DX[t.rot], t.y - DY[t.rot]); if (bk && (bk.B.type !== 'conveyor' || bk.rot === t.rot)) p0 = .5; }
        for (const e of L) if (Math.abs(e.p - p0) < GAP) return false;
        let k = 0; while (k < L.length && L[k].p > p0) k++;
        L.splice(k, 0, { it, p: p0 }); return true;
      }
      case 'junction': {
        const dir = (this.sideOf(t, src) + 2) % 4, q = t.jb[dir]; if (q.length >= 6) return false;
        if (!this.tb(t.x + DX[dir], t.y + DY[dir])) return false; q.push({ it, tm: this.tick }); return true;
      }
      case 'router': if (t.buf) return false; t.buf = it; t.from = src; t.rt = 0; return true;
      case 'sorter': case 'overflow': {
        const dir = (this.sideOf(t, src) + 2) % 4, fwd = this.tbDir(t, dir);
        const pass = B.type === 'sorter' ? ((it === t.cfg) !== !!B.inv) : true;
        if (pass && this.offer(fwd, it, t, d + 1)) return true;
        if (B.type === 'sorter' && pass) return false;
        const a = this.tbDir(t, (dir + 1) % 4), c = this.tbDir(t, (dir + 3) % 4); t.flip = !t.flip;
        const [f1, f2] = t.flip ? [a, c] : [c, a];
        return (f1 !== src && this.offer(f1, it, t, d + 1)) || (f2 !== src && this.offer(f2, it, t, d + 1));
      }
      case 'bridge': { if (t.buf.length >= 10) return false; const L = this.linkB(t); if (!L || src === L) return false; t.buf.push(it); return true; }
      case 'core': this.addCore(it, 1); return true;
      case 'storage': if ((t.items[it] || 0) >= B.cap) return false; t.items[it] = (t.items[it] || 0) + 1; return true;
      case 'crafter': if (!B.inp[it] || (t.items[it] || 0) >= 10) return false; t.items[it] = (t.items[it] || 0) + 1; return true;
      case 'generator': if (!B.burn || !ITEMS[it].f || (t.items[it] || 0) >= 10) return false; t.items[it] = (t.items[it] || 0) + 1; return true;
      case 'turret': {
        const a = ammoOf(B, it); if (!a) return false; const tot = t.ammo.reduce((s, e) => s + e.n, 0); if (tot + a.n > MAX_AMMO) return false;
        const last = t.ammo[t.ammo.length - 1]; if (last && last.it === it) last.n += a.n; else { t.ammo = t.ammo.filter(e => e.it !== it); t.ammo.push({ it, n: a.n }); }
        return true;
      }
      case 'factory': { const U = UNITS[B.plans[t.cfg || 0]], need = U.cost[it]; if (!need || (t.items[it] || 0) >= need * 2) return false; t.items[it] = (t.items[it] || 0) + 1; return true; }
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
  linkB(t) {
    if (t.link < 0) return null; const o = this.bt[t.link];
    if (!o || o === t || o.B.type !== 'bridge' || (o.x !== t.x && o.y !== t.y) || Math.abs(o.x - t.x) + Math.abs(o.y - t.y) > t.B.range) { t.link = -1; return null; }
    return o;
  }

  /* ----- épület-frissítés ----- */
  updB(b) {
    const B = b.B; b.pgen = 0; b.pneed = 0; if (b.hit > 0) b.hit--;
    switch (B.type) {
      case 'conveyor': {
        const L = b.cv, v = B.speed * GAP / 60;
        for (let k = 0; k < L.length; k++) { const e = L[k], lim = k === 0 ? 1 : L[k - 1].p - GAP; e.p = Math.min(e.p + v, Math.max(e.p, lim)); }
        if (L.length && L[0].p >= 1 && this.offer(this.tb(b.x + DX[b.rot], b.y + DY[b.rot]), L[0].it, b)) L.shift();
        break;
      }
      case 'junction': for (let d = 0; d < 4; d++) { const q = b.jb[d]; if (q.length && this.tick - q[0].tm >= 20 && this.offer(this.tb(b.x + DX[d], b.y + DY[d]), q[0].it, b)) q.shift(); } break;
      case 'router': if (b.buf && ++b.rt >= 6) { const nb = this.nbs(b), n = nb.length; for (let k = 0; k < n; k++) { const t = nb[(b.di + k) % n]; if (t === b.from && n > 1) continue; if (this.offer(t, b.buf, b)) { b.buf = null; b.di = (b.di + k + 1) % n; break; } } } break;
      case 'bridge': {
        const L = this.linkB(b);
        if (L) { if (this.tick % 4 === 0 && b.buf.length && L.buf.length < 10) L.buf.push(b.buf.shift()); }
        else if (b.buf.length) {
          if (this.tick % 30 === 0 || b.indir < 0) { b.indir = -1; for (let d = 0; d < 4 && b.indir < 0; d++) for (let r = 1; r <= B.range; r++) { const o = this.tb(b.x + DX[d] * r, b.y + DY[d] * r); if (o && o.B.type === 'bridge' && this.linkB(o) === b) { b.indir = d; break; } } }
          for (let k = 0; k < 4; k++) { const d = (b.di + k) % 4; if (d === b.indir) continue; const t = this.tb(b.x + DX[d], b.y + DY[d]); if (t && t.B.type !== 'bridge' && this.offer(t, b.buf[0], b)) { b.buf.shift(); b.di = (d + 1) % 4; break; } }
        }
        break;
      }
      case 'unloader': if (this.tick % 9 === 0) {
        const nb = this.nbs(b), src = nb.filter(o => o.B.type === 'core' || o.B.type === 'storage'), dst = nb.filter(o => o.B.type !== 'core' && o.B.type !== 'storage');
        if (!src.length || !dst.length) break;
        let it = b.cfg;
        if (!it) { for (let k = 0; k < ITEM_IDS.length; k++) { const c = ITEM_IDS[(b.di + k) % ITEM_IDS.length]; if (src.some(s => (s.items[c] || 0) > 0)) { it = c; b.di = (b.di + k + 1) % ITEM_IDS.length; break; } } }
        if (!it) break;
        const s = src.find(o => (o.items[it] || 0) > 0); if (!s) break;
        for (let k = 0; k < dst.length; k++) { const t = dst[(b.dj = ((b.dj || 0) + 1) % dst.length)]; if (this.offer(t, it, b)) { s.items[it]--; break; } }
        break;
      }
      case 'drill': {
        if (!b.dItem) break;
        const tot = b.items[b.dItem] || 0;
        if (tot < 10) {
          const eff = B.power ? b.ps : 1; if (B.power) b.pneed = B.power;
          b.prog += eff; b.work = Math.min(1, b.work + .02 * eff); b.rotA += .08 * eff * (B.s / 2);
          const tm = (B.time + 50 * ITEMS[b.dItem].h) / b.dCnt;
          if (b.prog >= tm) { b.prog -= tm; b.items[b.dItem] = tot + 1; }
        } else b.work *= .96;
        if (b.items[b.dItem] > 0) this.dump(b, [b.dItem]);
        break;
      }
      case 'crafter': {
        const outK = Object.keys(B.out)[0];
        const can = (b.items[outK] || 0) < 10 && Object.entries(B.inp).every(([k, n]) => (b.items[k] || 0) >= n);
        if (can) {
          if (B.power) b.pneed = B.power; const eff = B.power ? b.ps : 1;
          b.prog += eff / B.time; b.work = Math.min(1, b.work + .03 * eff);
          if (b.prog >= 1) { b.prog = 0; for (const k in B.inp) b.items[k] -= B.inp[k]; b.items[outK] = (b.items[outK] || 0) + B.out[outK]; if (Math.random() < .5) { const c = this.center(b); this.fx.push({ k: 'puff', x: c.x, y: c.y, life: 30, max: 30, c: ITEMS[outK].c }); } }
        } else b.work *= .95;
        if (b.items[outK] > 0) this.dump(b, [outK]);
        break;
      }
      case 'generator':
        if (B.burn) { if (b.burn <= 0) { const f = Object.keys(b.items).find(k => b.items[k] > 0); if (f) { b.items[f]--; b.burn = B.burn; } } if (b.burn > 0) { b.burn--; b.pgen = B.gen; b.work = Math.min(1, b.work + .05); } else b.work *= .95; }
        else b.pgen = B.gen;
        break;
      case 'mender': b.pneed = B.power; b.prog += b.ps; if (b.prog >= 200) {
        b.prog = 0; const c = this.center(b), R = B.range * TS; this.fx.push({ k: 'ring', x: c.x, y: c.y, r: R, life: 30, max: 30, c: '#84f491' });
        for (const o of this.blds) if (o.hp < o.B.hp) { const oc = this.center(o); if (Math.hypot(oc.x - c.x, oc.y - c.y) <= R) o.hp = Math.min(o.B.hp, o.hp + o.B.hp * .12); }
      } break;
      case 'factory': {
        const ut = B.plans[b.cfg || 0], U = UNITS[ut]; let ok = true; for (const k in U.cost) if ((b.items[k] || 0) < U.cost[k]) ok = false;
        if (ok && this.units.filter(u => u.team === PLAYER && u.t !== 'alpha').length < UNIT_CAP) {
          b.pneed = B.power; b.prog += b.ps / (U.time * 60); b.work = Math.min(1, b.work + .03);
          if (b.prog >= 1) { b.prog = 0; for (const k in U.cost) b.items[k] -= U.cost[k]; const c = this.center(b); const u = this.spawnU(ut, PLAYER, c.x + DX[b.rot] * 20, c.y + DY[b.rot] * 20); u.home = { x: c.x + DX[b.rot] * 40, y: c.y + DY[b.rot] * 40 }; }
        } else b.work *= .95;
        break;
      }
      case 'turret': this.updTurret(b); break;
    }
  }
  updTurret(b) {
    const B = b.B, c = this.center(b);
    if (b.heat > 0) b.heat -= .05;
    if (this.tick % 8 === (b.i & 7) || (b.tgt && b.tgt.dead)) {
      let best = null, bd = 1e9;
      const range = B.range + this.rangeBonus(b);
      for (const u of this.units) { if (u.team !== ENEMY || u.dead) continue; if (u.U.air ? !B.air : !B.ground) continue; const d = Math.hypot(u.x - c.x, u.y - c.y); if (d < range && d < bd) { bd = d; best = u; } }
      b.tgt = best;
    }
    const pw = !!B.power;
    if (pw) { b.rl = Math.max(0, b.rl - b.ps); if (b.tgt) b.pneed = B.power; }
    else b.rl = Math.max(0, b.rl - 1);
    const u = b.tgt; if (!u) return;
    const ta = Math.atan2(u.y - c.y, u.x - c.x); let da = ((ta - b.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    b.ang += Math.max(-.12, Math.min(.12, da));
    if (Math.abs(da) > .25) return;
    if (b.burst > 0) { if (this.tick % 4 === 0) { this.shootAmmo(b, c); b.burst--; } return; }
    if (b.rl > 0) return;
    if (B.laser) { if (b.ps < .1) return; this.laser(b, c); b.rl = B.reload; return; }
    if (B.arcd) { if (b.ps < .1) return; this.lightning(c.x, c.y, b.ang, B.arcd); b.rl = B.reload; return; }
    const am = b.ammo[b.ammo.length - 1]; if (!am) return;
    const st = B.ammo[am.it]; b.rl = B.reload * (st.rl || 1);
    if (B.burst) { b.burst = B.burst - 1; }
    this.shootAmmo(b, c);
  }
  rangeBonus(b) { const am = b.ammo && b.ammo[b.ammo.length - 1]; return am && b.B.ammo[am.it].rg || 0; }
  shootAmmo(b, c) {
    const am = b.ammo[b.ammo.length - 1]; if (!am) { b.burst = 0; return; }
    const B = b.B, st = B.ammo[am.it], range = B.range + (st.rg || 0); am.n--; if (am.n <= 0) b.ammo.pop();
    b.heat = 1;
    let ox = 0, oy = 0; if (B.alt) { b.side = -b.side; ox = -Math.sin(b.ang) * 2 * b.side; oy = Math.cos(b.ang) * 2 * b.side; }
    const mz = B.s * 4 + 3, x = c.x + Math.cos(b.ang) * mz + ox, y = c.y + Math.sin(b.ang) * mz + oy;
    if (B.art) { const u = b.tgt; const tx = u ? u.x + u.vx * 20 : x, ty = u ? u.y + u.vy * 20 : y, d = Math.hypot(tx - x, ty - y); this.bullets.push({ x, y, sx: x, sy: y, tx, ty, vx: (tx - x) / d * st.sp, vy: (ty - y) / d * st.sp, life: d / st.sp, d: st.d, team: PLAYER, art: 1, spl: st.spl, ground: 1, c: ITEMS[am.it].c, hom: st.hom ? u : null }); return; }
    const a = b.ang + (Math.random() - .5) * .06;
    this.bullets.push({ x, y, vx: Math.cos(a) * st.sp, vy: Math.sin(a) * st.sp, life: range / st.sp + 4, d: st.d, team: PLAYER, air: B.air, ground: B.ground, fl: st.fl, spl: st.spl, hom: st.hom ? b.tgt : null, c: ITEMS[am.it].c });
    this.fx.push({ k: 'flash', x, y, a: b.ang, life: 6, max: 6, c: ITEMS[am.it].c });
  }
  laser(b, c) {
    const B = b.B, a = b.ang, L = B.range, x2 = c.x + Math.cos(a) * L, y2 = c.y + Math.sin(a) * L;
    for (const u of this.units) { if (u.team !== ENEMY || u.U.air || u.dead) continue; const t = Math.max(0, Math.min(1, ((u.x - c.x) * (x2 - c.x) + (u.y - c.y) * (y2 - c.y)) / (L * L))); if (Math.hypot(u.x - (c.x + (x2 - c.x) * t), u.y - (c.y + (y2 - c.y) * t)) < u.U.r + 4) this.dmgU(u, B.laser.d); }
    this.fx.push({ k: 'laser', x: c.x, y: c.y, x2, y2, life: 16, max: 16, c: '#a9d8ff' });
  }
  lightning(x, y, a, d) {
    const pts = [[x, y]]; let px = x, py = y, hit = new Set();
    for (let k = 0; k < 9; k++) {
      let near = null, nd = 40; for (const u of this.units) { if (u.team !== ENEMY || u.U.air || hit.has(u) || u.dead) continue; const dd = Math.hypot(u.x - px, u.y - py); if (dd < nd) { nd = dd; near = u; } }
      if (near && k > 0) { px = near.x; py = near.y; hit.add(near); this.dmgU(near, d); }
      else { a += (Math.random() - .5) * 1.2; px += Math.cos(a) * 12; py += Math.sin(a) * 12; }
      pts.push([px, py]);
    }
    this.fx.push({ k: 'bolt', pts, life: 10, max: 10, c: '#a9d8ff' });
  }

  /* ----- egységek ----- */
  spawnU(t, team, x, y) {
    const U = UNITS[t], u = { t, U, team, x, y, vx: 0, vy: 0, hp: U.hp, rot: 0, rl: 0, tgt: null, id: this.tick * 1000 + this.units.length, walk: 0, stack: null, mt: 0 };
    this.units.push(u); return u;
  }
  spawnPlayer() { const c = this.center(this.core); this.player = this.spawnU('alpha', PLAYER, c.x, c.y); this.player.ctl = 1; }
  dmgU(u, d) {
    if (u.dead) return; u.hp -= d; u.hit = 6;
    if (u.hp <= 0) {
      u.dead = 1; this.boom(u.x, u.y, u.U.r * 2.2, u.team === ENEMY ? '#f25555' : '#ffd37f');
      if (u.team === ENEMY) this.stats.kills++;
      if (u.U.boom) this.splash(u.x, u.y, 22, u.U.d * .5, PLAYER, 0, 1, 1);
      if (u === this.player) { this.respawn = 150; this.msg('Az egységed megsemmisült – újraéledés a magnál', 'bad'); }
    }
  }
  dmgB(b, d) {
    if (b.dead) return; b.hp -= d; b.hit = 8;
    if (b.hp <= 0) { if (b === this.core) { this.lost = true; this.boom(this.center(b).x, this.center(b).y, 40, '#ffb347'); return; } this.remB(b, 1); }
  }
  splash(x, y, r, d, victimTeam, air, ground, blds) {
    for (const u of this.units) if (u.team === victimTeam && !u.dead && (u.U.air ? air : ground)) { const dd = Math.hypot(u.x - x, u.y - y); if (dd < r + u.U.r) this.dmgU(u, d * (1 - dd / (r + u.U.r) * .5)); }
    if (blds && victimTeam === PLAYER) { const R = Math.ceil(r / TS), tx = Math.floor(x / TS), ty = Math.floor(y / TS), seen = new Set(); for (let yy = ty - R; yy <= ty + R; yy++) for (let xx = tx - R; xx <= tx + R; xx++) { const b = this.tb(xx, yy); if (b && !seen.has(b) && Math.hypot((xx + .5) * TS - x, (yy + .5) * TS - y) <= r + 4) { seen.add(b); this.dmgB(b, d); } } }
    this.boom(x, y, r * .8, '#ffcf7a');
  }
  boom(x, y, r, c) { this.fx.push({ k: 'boom', x, y, r, life: 22, max: 22, c }); }
  nearestB(x, y, r, pref) {
    let best = null, bd = r;
    for (const b of this.blds) { const c = this.center(b), d = Math.hypot(c.x - x, c.y - y) - b.B.s * 4; if (d < bd) { const w = pref && pref(b) ? 0 : 0; bd = d; best = b; } }
    return best;
  }
  nearestU(x, y, r, team, air, ground) {
    let best = null, bd = r;
    for (const u of this.units) { if (u.team !== team || u.dead) continue; if (u.U.air ? !air : !ground) continue; const d = Math.hypot(u.x - x, u.y - y); if (d < bd) { bd = d; best = u; } }
    return best;
  }
  fire(u, tx, ty, team) {
    const U = u.U, a = Math.atan2(ty - u.y, tx - u.x);
    if (U.flame) { for (let k = 0; k < 2; k++) this.bullets.push({ x: u.x, y: u.y, vx: Math.cos(a + (Math.random() - .5) * .3) * 2.6, vy: Math.sin(a + (Math.random() - .5) * .3) * 2.6, life: U.rng / 2.6, d: U.d, team, air: 1, ground: 1, pierce: 1, flame: 1, c: '#ffa04a' }); return; }
    if (U.art) { const d = Math.hypot(tx - u.x, ty - u.y); this.bullets.push({ x: u.x, y: u.y, sx: u.x, sy: u.y, tx, ty, vx: (tx - u.x) / d * 2.4, vy: (ty - u.y) / d * 2.4, life: d / 2.4, d: U.d, team, art: 1, spl: 22, ground: 1, c: team === ENEMY ? '#ff7a6a' : '#ffd37f' }); return; }
    const sp = 3.2; this.bullets.push({ x: u.x + Math.cos(a) * U.r, y: u.y + Math.sin(a) * U.r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: U.rng / sp + 6, d: U.d, team, air: 1, ground: 1, c: team === ENEMY ? '#ff7a6a' : '#ffe39a' });
  }
  moveU(u, dx, dy) {
    const U = u.U, nx = u.x + dx, ny = u.y + dy;
    if (U.air) { u.x = Math.max(0, Math.min(this.w * TS, nx)); u.y = Math.max(0, Math.min(this.h * TS, ny)); return; }
    const free = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (!this.inb(tx, ty)) return false; const i = ty * this.w + tx; return !this.solidG(i) && !this.bt[i]; };
    if (free(nx, u.y)) u.x = nx; if (free(u.x, ny)) u.y = ny;
  }
  updUnit(u) {
    const U = u.U; if (u.hit > 0) u.hit--; if (u.rl > 0) u.rl--;
    if (u === this.player) return this.updPlayer(u);
    if (u.team === ENEMY) return U.air ? this.aiAir(u) : this.aiGround(u);
    if (U.miner) return this.aiMiner(u);
    return this.aiDefend(u);
  }
  steer(u, tx, ty, stop = 0) {
    const d = Math.hypot(tx - u.x, ty - u.y), U = u.U;
    if (d > stop) { const sp = Math.min(U.sp, d - stop); u.vx += ((tx - u.x) / d * sp - u.vx) * .2; u.vy += ((ty - u.y) / d * sp - u.vy) * .2; }
    else { u.vx *= .8; u.vy *= .8; }
    this.moveU(u, u.vx, u.vy);
    if (Math.hypot(u.vx, u.vy) > .05) { u.rot = Math.atan2(u.vy, u.vx); u.walk += Math.hypot(u.vx, u.vy); }
  }
  aiGround(u) {
    const U = u.U;
    if (this.tick % 15 === (u.id % 15) || (u.tgt && u.tgt.dead)) {
      u.tgt = this.nearestU(u.x, u.y, U.rng + 16, PLAYER, 1, 1) || this.nearestB(u.x, u.y, U.boom ? 40 : U.rng + 4);
    }
    const tx = Math.floor(u.x / TS), ty = Math.floor(u.y / TS);
    let nx = null, block = null;
    if (this.flow && this.inb(tx, ty)) {
      let bd = this.flow[ty * this.w + tx], bi = -1;
      for (let k = 0; k < 8; k++) {
        const ddx = [1, 0, -1, 0, 1, 1, -1, -1][k], ddy = [0, 1, 0, -1, 1, -1, 1, -1][k], X = tx + ddx, Y = ty + ddy; if (!this.inb(X, Y)) continue;
        const i = Y * this.w + X; if (k > 3 && (this.solidG(ty * this.w + X) || this.solidG(Y * this.w + tx) || this.bt[ty * this.w + X] || this.bt[Y * this.w + tx])) continue;
        if (this.flow[i] < bd) { bd = this.flow[i]; bi = i; }
      }
      if (bi >= 0) { if (this.bt[bi]) block = this.bt[bi]; else nx = { x: (bi % this.w + .5) * TS, y: (Math.floor(bi / this.w) + .5) * TS }; }
    }
    if (block && (!u.tgt || u.tgt.U)) u.tgt = block;
    const t = u.tgt, tc = t ? (t.U ? t : this.center(t)) : null;
    if (U.boom && tc && Math.hypot(tc.x - u.x, tc.y - u.y) < (t.U ? 10 : t.B.s * 4 + 8)) { this.splash(u.x, u.y, 24, U.d, PLAYER, 0, 1, 1); u.dead = 1; return; }
    if (U.boom && tc && !block) this.steer(u, tc.x, tc.y);
    else if (nx) this.steer(u, nx.x, nx.y); else { u.vx *= .8; u.vy *= .8; }
    if (tc && !U.boom) { const d = Math.hypot(tc.x - u.x, tc.y - u.y); u.aim = Math.atan2(tc.y - u.y, tc.x - u.x); if (d < U.rng + (t.U ? 0 : t.B.s * 4) && u.rl <= 0) { this.fire(u, tc.x, tc.y, ENEMY); u.rl = U.rl; } }
  }
  aiAir(u) {
    const U = u.U;
    if (this.tick % 20 === (u.id % 20) || !u.tgt || u.tgt.dead) {
      if (U.bomber) { const l = this.blds.filter(b => b.B.type !== 'wall' && b.B.type !== 'conveyor'); u.tgt = l.length ? l.reduce((a, b) => { const ca = this.center(a), cb = this.center(b); return Math.hypot(ca.x - u.x, ca.y - u.y) < Math.hypot(cb.x - u.x, cb.y - u.y) ? a : b; }) : this.core; }
      else u.tgt = this.nearestU(u.x, u.y, 260, PLAYER, 1, 1) || this.nearestB(u.x, u.y, 1e9, null);
    }
    const t = u.tgt; if (!t) return;
    const tc = t.U ? t : this.center(t), d = Math.hypot(tc.x - u.x, tc.y - u.y);
    if (U.bomber) {
      const a = Math.atan2(tc.y - u.y, tc.x - u.x); u.vx += (Math.cos(a) * U.sp - u.vx) * .05; u.vy += (Math.sin(a) * U.sp - u.vy) * .05; this.moveU(u, u.vx, u.vy); u.rot = Math.atan2(u.vy, u.vx);
      const b = this.tb(Math.floor(u.x / TS), Math.floor(u.y / TS)); if (b && u.rl <= 0) { this.splash(u.x, u.y, 14, U.d, PLAYER, 0, 1, 1); u.rl = U.rl; }
      return;
    }
    if (d > U.rng * .7) { const a = Math.atan2(tc.y - u.y, tc.x - u.x); u.vx += (Math.cos(a) * U.sp - u.vx) * .06; u.vy += (Math.sin(a) * U.sp - u.vy) * .06; }
    else { u.vx *= .97; u.vy *= .97; u.vx += Math.cos(u.id) * .02; }
    this.moveU(u, u.vx, u.vy); u.rot = Math.atan2(tc.y - u.y, tc.x - u.x);
    if (d < U.rng && u.rl <= 0) { this.fire(u, tc.x, tc.y, ENEMY); u.rl = U.rl; }
  }
  aiDefend(u) {
    const U = u.U, home = u.home || this.center(this.core);
    if (this.tick % 15 === (u.id % 15) || (u.tgt && u.tgt.dead)) u.tgt = this.nearestU(home.x, home.y, 260, ENEMY, 1, !U.air || 1);
    const t = u.tgt;
    if (t && !t.dead) {
      const d = Math.hypot(t.x - u.x, t.y - u.y);
      if (U.boom) { this.steer(u, t.x, t.y); if (d < 10) { this.splash(u.x, u.y, 24, U.d, ENEMY, 0, 1, 0); u.dead = 1; } return; }
      this.steer(u, t.x, t.y, U.rng * .75);
      if (d < U.rng && u.rl <= 0) { this.fire(u, t.x, t.y, PLAYER); u.rl = U.rl; }
      u.aim = Math.atan2(t.y - u.y, t.x - u.x);
    } else this.steer(u, home.x + Math.cos(u.id) * 16, home.y + Math.sin(u.id) * 16, 4);
  }
  aiMiner(u) {
    const c = this.center(this.core);
    if (u.stack && u.stack.n >= 20) { this.steer(u, c.x, c.y, 18); if (Math.hypot(c.x - u.x, c.y - u.y) < 40) { this.addCore(u.stack.it, u.stack.n); this.fx.push({ k: 'xfer', x: u.x, y: u.y, x2: c.x, y2: c.y, life: 14, max: 14, c: ITEMS[u.stack.it].c }); u.stack = null; } u.mine = -1; return; }
    if (u.mine == null || u.mine < 0 || this.tick % 300 === 0) {
      const want = (this.core.items.copper || 0) <= (this.core.items.lead || 0) ? 'copper' : 'lead', w = u.stack ? u.stack.it : want;
      let bi = -1, bd = 1e9; const step = 1;
      for (let i = 0; i < this.ore.length; i += step) { if (this.mineItem(i, 1) !== w || this.bt[i]) continue; const x = (i % this.w + .5) * TS, y = (Math.floor(i / this.w) + .5) * TS, d = Math.hypot(x - c.x, y - c.y); if (d < bd) { bd = d; bi = i; } }
      u.mine = bi;
    }
    if (u.mine < 0) return this.steer(u, c.x, c.y, 30);
    const mx = (u.mine % this.w + .5) * TS, my = (Math.floor(u.mine / this.w) + .5) * TS;
    this.steer(u, mx, my, 30);
    if (Math.hypot(mx - u.x, my - u.y) < MINE_RANGE) { const it = this.mineItem(u.mine, 1); u.mining = 1; u.mt += .7; if (u.mt > 50 + ITEMS[it].h * 15) { u.mt = 0; if (!u.stack) u.stack = { it, n: 0 }; u.stack.n++; } } else u.mining = 0;
  }
  updPlayer(p) {
    const U = p.U, c = this.ctl;
    const len = Math.hypot(c.ax, c.ay) || 1, ts = U.sp * Math.min(1, Math.hypot(c.ax, c.ay));
    p.vx += (c.ax / len * ts - p.vx) * .18; p.vy += (c.ay / len * ts - p.vy) * .18;
    this.moveU(p, p.vx, p.vy);
    if (c.shoot) { p.rot = Math.atan2(c.my - p.y, c.mx - p.x); if (p.rl <= 0) { const a = p.rot, sp = 3.4; for (const s of [-1, 1]) this.bullets.push({ x: p.x + Math.cos(a) * 5 - Math.sin(a) * 3 * s, y: p.y + Math.sin(a) * 5 + Math.cos(a) * 3 * s, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: U.rng / sp + 8, d: U.d / 2, team: PLAYER, air: 1, ground: 1, c: '#ffe39a' }); p.rl = U.rl; } }
    else if (Math.hypot(p.vx, p.vy) > .2) p.rot = Math.atan2(p.vy, p.vx);
    // bányászat
    p.mining = 0;
    if (p.mine >= 0 && p.mine != null) {
      const mx = (p.mine % this.w + .5) * TS, my = (Math.floor(p.mine / this.w) + .5) * TS, it = this.mineItem(p.mine, 1);
      if (!it || this.bt[p.mine]) p.mine = -1;
      else if (Math.hypot(mx - p.x, my - p.y) < MINE_RANGE) {
        p.mining = 1; p.mt += .5 * 1.0;
        if (p.mt >= 50 + ITEMS[it].h * 15) { p.mt = 0; const cc = this.center(this.core);
          if (Math.hypot(cc.x - p.x, cc.y - p.y) < CORE_RANGE) { this.addCore(it, 1); this.fx.push({ k: 'xfer', x: mx, y: my, x2: cc.x, y2: cc.y, life: 16, max: 16, c: ITEMS[it].c }); }
          else if (!p.stack || p.stack.it === it) { p.stack = p.stack || { it, n: 0 }; if (p.stack.n < 30) p.stack.n++; } }
      }
    }
    if (p.stack) { const cc = this.center(this.core); if (Math.hypot(cc.x - p.x, cc.y - p.y) < CORE_RANGE) { this.addCore(p.stack.it, p.stack.n); p.stack = null; } }
    this.buildStep(p);
  }
  buildStep(p) {
    p.building = null; if (!this.plans.length || c_noBuild(this)) return;
    let k = 0, pl = null;
    for (; k < this.plans.length; k++) { const q = this.plans[k], qx = (q.x + q.B.s / 2) * TS, qy = (q.y + q.B.s / 2) * TS; if (Math.hypot(qx - p.x, qy - p.y) <= BUILD_RANGE) { pl = q; break; } }
    if (!pl) return;
    if (k > 0) { this.plans.splice(k, 1); this.plans.unshift(pl); }
    if (!pl.brk && !this.canPlaceAgain(pl)) { this.plans.shift(); return; }
    if (pl.brk && pl.b.dead) { this.plans.shift(); return; }
    p.building = pl;
    const dp = p.U.build / buildTime(pl.B);
    if (pl.brk) { pl.prog += dp * 1.5; }
    else {
      const np = Math.min(1, pl.prog + dp), c = this.core.items; let ok = true; const pay = {};
      for (const it in pl.B.cost) { const owe = Math.floor(pl.B.cost[it] * np + 1e-9) - (pl.paid[it] || 0); if (owe > 0) { if ((c[it] || 0) < owe) ok = false; pay[it] = owe; } }
      pl.stall = !ok; if (!ok) return;
      for (const it in pay) { c[it] -= pay[it]; pl.paid[it] = (pl.paid[it] || 0) + pay[it]; }
      pl.prog = np;
    }
    if (pl.prog >= 1) { this.plans.shift(); this.finishPlan(pl); }
  }
  canPlaceAgain(pl) {
    for (let yy = 0; yy < pl.B.s; yy++) for (let xx = 0; xx < pl.B.s; xx++) { const o = this.tb(pl.x + xx, pl.y + yy); if (o && !(pl.B.type === 'conveyor' && o.B.type === 'conveyor')) return false; }
    return true;
  }

  /* ----- útkeresés ----- */
  calcFlow() {
    const w = this.w, h = this.h, N = w * h, dist = new Float32Array(N).fill(1e9), heap = [];
    const push = (i, d) => { heap.push([d, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    const co = this.core; for (let y = co.y; y < co.y + 3; y++) for (let x = co.x; x < co.x + 3; x++) { dist[y * w + x] = 0; push(y * w + x, 0); }
    while (heap.length) {
      const [d, i] = pop(); if (d > dist[i]) continue; const x = i % w, y = (i - x) / w;
      for (let k = 0; k < 8; k++) {
        const ddx = [1, 0, -1, 0, 1, 1, -1, -1][k], ddy = [0, 1, 0, -1, 1, -1, 1, -1][k], X = x + ddx, Y = y + ddy;
        if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = Y * w + X; if (this.solidG(j)) continue;
        if (k > 3 && (this.solidG(y * w + X) || this.solidG(Y * w + x))) continue;
        const b = this.bt[j]; const c = (k > 3 ? 1.414 : 1) + (b && b !== co ? (b.B.type === 'wall' ? 70 : 40) : 0);
        let near = 0; for (let q = 0; q < 4; q++) { const XX = X + [1, 0, -1, 0][q], YY = Y + [0, 1, 0, -1][q]; if (XX >= 0 && YY >= 0 && XX < w && YY < h && this.solidG(YY * w + XX)) near = 1; }
        const nd = d + c + near * 2; if (nd < dist[j]) { dist[j] = nd; push(j, dist[j]); }
      }
    }
    this.flow = dist; this.fdirty = 0;
  }

  /* ----- hullámok ----- */
  nextWave() {
    const list = waveUnits(this.wave + 1, this.sec.threat, this.sec.endless); this.wave++;
    list.forEach((t, k) => { const sp = this.spawns[k % this.spawns.length], a = Math.random() * Math.PI * 2, r = Math.random() * 14; this.spawnU(t, ENEMY, (sp.x + .5) * TS + Math.cos(a) * r, (sp.y + .5) * TS + Math.sin(a) * r); });
    this.wtimer = this.sec.wt * 60;
    for (const sp of this.spawns) this.fx.push({ k: 'ring', x: (sp.x + .5) * TS, y: (sp.y + .5) * TS, r: 48, life: 40, max: 40, c: '#f25555' });
    this.onWave && this.onWave(this.wave);
  }
  enemies() { let n = 0; for (const u of this.units) if (u.team === ENEMY && !u.dead) n++; return n; }

  /* ----- lépés ----- */
  step() {
    if (this.lost || this.won) return;
    this.tick++;
    if (this.fdirty && this.tick - this.flowT > 20) { this.flowT = this.tick; this.calcFlow(); }
    this.powerTick();
    for (let k = 0; k < this.blds.length; k++) this.updB(this.blds[k]);
    if (!this.player || this.player.dead) { if (this.respawn-- <= 0) this.spawnPlayer(); }
    for (const u of this.units) if (!u.dead) this.updUnit(u);
    // egymás taszítása
    if (this.tick % 2 === 0) { const L = this.units; for (let a = 0; a < L.length; a++) { const u = L[a]; if (u.dead || u === this.player) continue; for (let b = a + 1; b < L.length; b++) { const v = L[b]; if (v.dead || v === this.player || !!u.U.air !== !!v.U.air) continue; const dx = v.x - u.x, dy = v.y - u.y, r = u.U.r + v.U.r, d2 = dx * dx + dy * dy; if (d2 < r * r && d2 > .01) { const d = Math.sqrt(d2), f = (r - d) / d * .25; this.moveU(u, -dx * f, -dy * f); this.moveU(v, dx * f, dy * f); } } } }
    this.units = this.units.filter(u => !u.dead || u === this.player);
    if (this.player && this.player.dead && !this.units.includes(this.player)) {}
    this.updBullets();
    for (const f of this.fx) f.life--; this.fx = this.fx.filter(f => f.life > 0);
    for (const m of this.msgs) m.life--; this.msgs = this.msgs.filter(m => m.life > 0);
    // hullámidő
    if (!this.sec.win || this.wave < this.sec.win) { this.wtimer--; if (this.wtimer <= 0) this.nextWave(); }
    if (this.sec.win && this.wave >= this.sec.win && this.enemies() === 0) { this.won = true; }
  }
  updBullets() {
    const out = [];
    for (const b of this.bullets) {
      if (b.hom && !b.hom.dead && !b.art) { const a = Math.atan2(b.hom.y - b.y, b.hom.x - b.x), sp = Math.hypot(b.vx, b.vy), ca = Math.atan2(b.vy, b.vx); let da = ((a - ca + Math.PI * 3) % (Math.PI * 2)) - Math.PI; const na = ca + Math.max(-.08, Math.min(.08, da)); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; }
      b.x += b.vx; b.y += b.vy; b.life--;
      const foe = b.team === PLAYER ? ENEMY : PLAYER;
      if (b.art) { if (b.life <= 0) { this.splash(b.x, b.y, b.spl || 20, b.d, foe, 0, 1, foe === PLAYER); continue; } out.push(b); continue; }
      let hit = false;
      if (b.fl) { for (const u of this.units) if (u.team === foe && u.U.air && !u.dead && Math.hypot(u.x - b.x, u.y - b.y) < b.fl * .45) { hit = true; break; } if (hit || b.life <= 0) { this.splash(b.x, b.y, b.fl, b.d, foe, 1, 0, 0); continue; } out.push(b); continue; }
      for (const u of this.units) {
        if (u.team !== foe || u.dead) continue; if (u.U.air ? !b.air : !b.ground) continue;
        if (Math.abs(u.x - b.x) < u.U.r + 2 && Math.abs(u.y - b.y) < u.U.r + 2) { this.dmgU(u, b.d); hit = true; if (b.spl) this.splash(b.x, b.y, b.spl, b.d * .5, foe, 1, 1, 0); this.fx.push({ k: 'hit', x: b.x, y: b.y, life: 8, max: 8, c: b.c }); break; }
      }
      if (!hit && foe === PLAYER) { const bl = this.tb(Math.floor(b.x / TS), Math.floor(b.y / TS)); if (bl) { this.dmgB(bl, b.d); hit = true; this.fx.push({ k: 'hit', x: b.x, y: b.y, life: 8, max: 8, c: b.c }); } }
      if (!hit && !b.flame) { const tx = Math.floor(b.x / TS), ty = Math.floor(b.y / TS); if (this.inb(tx, ty) && this.wall[ty * this.w + tx]) hit = true; }
      if ((hit && !b.pierce) || b.life <= 0) continue;
      out.push(b);
    }
    this.bullets = out;
  }

  /* ----- mentés ----- */
  save() {
    return {
      v: 1, wave: this.wave, wt: Math.round(this.wtimer), items: this.core.items, chp: Math.round(this.core.hp), kills: this.stats.kills,
      b: this.blds.filter(b => b !== this.core).map(b => [b.t, b.x, b.y, b.rot, Math.round(b.hp), b.cfg ?? null, b.link ?? -1, b.links ? b.links.map(l => l.i) : 0]),
      p: this.plans.map(p => [p.t, p.x, p.y, p.rot, p.brk ? 1 : 0, p.cfg ?? null]),
      u: this.units.filter(u => u.team === PLAYER && u !== this.player).map(u => [u.t, Math.round(u.x), Math.round(u.y), Math.round(u.hp)]),
    };
  }
  load(s) {
    this.wave = s.wave || 0; this.wtimer = s.wt || this.wtimer; this.core.items = s.items || {}; this.core.hp = s.chp || this.core.hp; this.stats.kills = s.kills || 0;
    const links = [];
    for (const [t, x, y, rot, hp, cfg, link, lk] of s.b || []) {
      if (!BLOCKS[t] || !this.canPlaceLoad(t, x, y)) continue;
      const b = this.addB(t, x, y, rot, cfg); b.hp = Math.min(b.B.hp, hp || b.B.hp); if (b.link !== undefined) b.link = link; if (lk) links.push([b, lk]);
    }
    for (const [b, lk] of links) for (const i of lk) { const o = this.bt[i]; if (o && o.i === i) this.link(b, o); }
    for (const [t, x, y, rot, brk, cfg] of s.p || []) { if (!BLOCKS[t]) continue; if (brk) { const b = this.tb(x, y); if (b) this.unplan(b); } else this.plan(t, x, y, rot, cfg); }
    for (const [t, x, y, hp] of s.u || []) { if (!UNITS[t]) continue; const u = this.spawnU(t, PLAYER, x, y); u.hp = hp; }
  }
  canPlaceLoad(t, x, y) { const s = BLOCKS[t].s; for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) { if (!this.inb(x + xx, y + yy) || this.bt[(y + yy) * this.w + x + xx]) return false; } return true; }
}
function c_noBuild(w) { return w.ctl.noBuild; }
