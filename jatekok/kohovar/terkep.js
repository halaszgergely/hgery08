// Kohóvár – térképgenerátor a Mindustry SerpuloPlanetGenerator lépései szerint:
// ridged zajból nyílt völgyek → sejtautomata (cells) → torzítás → termek kivágása, A*-utak ecsettel → folyók →
// zajalapú ércmezők → medián simítás → elérhetetlen részek kitöltése → technikai padló, moha / kátrány / forró kő.
import { ITEM_IDS, FLOORS, WALLS, BIO } from './adat.js?v=202611270939';

const FL = Object.keys(FLOORS), FLI = Object.fromEntries(FL.map((k, i) => [k, i])), WL = Object.keys(WALLS);

/* ---------- zaj (az Arc Simplex.noise2d felépítése: oktávok összege a max. amplitúdóval osztva, 0..1-re) ---------- */
const G2 = (3 - Math.sqrt(3)) / 6, F2 = .5 * (Math.sqrt(3) - 1), GR = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
function perm(seed) { const p = new Uint8Array(512), a = [...Array(256).keys()]; let s = seed >>> 0 || 1; for (let i = 255; i > 0; i--) { s = Math.imul(s ^ (s >>> 15), 2246822519) + 0x9E3779B9 >>> 0; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } for (let i = 0; i < 512; i++) p[i] = a[i & 255]; return p; }
function raw(P, x, y) {
  const s = (x + y) * F2, i = Math.floor(x + s), j = Math.floor(y + s), t = (i + j) * G2, x0 = x - (i - t), y0 = y - (j - t), i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
  const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2, ii = i & 255, jj = j & 255; let n = 0, q;
  q = .5 - x0 * x0 - y0 * y0; if (q > 0) { const g = GR[P[ii + P[jj]] & 7]; q *= q; n += q * q * (g[0] * x0 + g[1] * y0); }
  q = .5 - x1 * x1 - y1 * y1; if (q > 0) { const g = GR[P[ii + i1 + P[jj + j1]] & 7]; q *= q; n += q * q * (g[0] * x1 + g[1] * y1); }
  q = .5 - x2 * x2 - y2 * y2; if (q > 0) { const g = GR[P[ii + 1 + P[jj + 1]] & 7]; q *= q; n += q * q * (g[0] * x2 + g[1] * y2); }
  return 70 * n;
}
const mkNoise = seed => { const P = perm(seed); return (x, y, oct, fall, scl) => { let tot = 0, f = 1 / scl, a = 1, m = 0; for (let k = 0; k < oct; k++) { tot += raw(P, x * f, y * f) * a; m += a; a *= fall; f *= 2; } return (tot / m + 1) / 2; }; };

/* ---------- Serpulo padlótábla (hőmérséklet × magasság), a Kohóvár padlóneveivel ---------- */
const W_ = 'water', D_ = 'deep', ds = 'darksand', s_ = 'sandf', st = 'stone', sn = 'snow', ic = 'ice', sa = 'salt', mo = 'moss', sp = 'spore', ba = 'basalt', hr = 'hotrock';
const ARR = [
  [W_, W_, ds, ds, ds, ds, s_, s_, s_, s_, W_, st, st],
  [W_, W_, ds, ds, s_, s_, s_, s_, s_, W_, st, st, st],
  [W_, W_, ds, s_, sa, s_, s_, s_, s_, W_, st, st, st],
  [W_, W_, s_, sa, sa, sa, s_, st, st, st, sn, sn, ic],
  [D_, W_, W_, s_, sa, s_, s_, ba, sn, sn, sn, sn, ic],
  [D_, W_, W_, s_, s_, s_, mo, sn, sn, sn, ic, sn, ic],
  [D_, W_, s_, s_, mo, mo, sn, ba, ba, ba, ic, sn, ic],
  [D_, W_, ds, ds, ba, mo, ba, hr, ba, ic, sn, ic, ic],
  [W_, ds, ds, ds, mo, sp, sn, ba, ba, ic, sn, ic, ic],
  [W_, ds, ds, sp, ic, ic, sn, sn, sn, sn, ic, ic, ic],
  [D_, W_, ds, sp, sp, ic, ic, sn, sn, ic, ic, ic, ic],
  [W_, W_, ds, sp, mo, sp, sn, sn, ic, ic, ic, ic, ic],
  [W_, ds, sn, ic, sn, sn, sn, sn, ic, ic, ic, ic, ic],
];
// a szektor tájegységeinek helye a táblában (hőmérséklet, magasság)
const CENTER = { stone: [.2, .9], sand: [.1, .5], snow: [.36, .74], ice: [.8, .78], dark: [.6, .24], grass: [.45, .42], moss: [.62, .4], spore: [.76, .3], basalt: [.55, .62], magma: [.56, .58] };
const WALLOF = { stone: 'rock', dark: 'darkrock', sandf: 'sandrock', darksand: 'sandrock', salt: 'sandrock', snow: 'snowrock', ice: 'snowrock', moss: 'mossrock', grass: 'mossrock', shale: 'mossrock', spore: 'sporerock', sporedark: 'sporerock', basalt: 'basaltrock', ash: 'basaltrock', hotrock: 'basaltrock', magmarock: 'hotwall', metal: 'darkrock' };

class Heap {
  constructor() { this.k = []; this.v = []; }
  get n() { return this.k.length; }
  push(key, val) { const K = this.k, V = this.v; let i = K.length; K.push(key); V.push(val); while (i > 0) { const p = (i - 1) >> 1; if (K[p] <= key) break; K[i] = K[p]; V[i] = V[p]; i = p; } K[i] = key; V[i] = val; }
  pop() { const K = this.k, V = this.v, top = V[0], key = K.pop(), val = V.pop(), n = K.length; if (n) { let i = 0; for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && K[c + 1] < K[c]) c++; if (K[c] >= key) break; K[i] = K[c]; V[i] = V[c]; i = c; } K[i] = key; V[i] = val; } return top; }
}

export function genMapSerpulo(sec, hstr, rng) {
  const w = sec.w, h = sec.h, N = w * h, seed = hstr(sec.id), R = rng(seed ^ 0x2f6b1d93), wq = sec.water || 1;
  const rr = (a, b) => a + R() * (b - a), ri = (a, b) => Math.floor(rr(a, b + 1)), chance = p => R() < p;
  const noise = mkNoise(seed), noise2 = mkNoise(seed + 7), noise3 = mkNoise(seed + 13);
  const solid = new Uint8Array(N), floor = new Uint8Array(N), ore = new Uint8Array(N);
  const L = Math.max(80, Math.min(220, Math.min(w, h) / 1.8));            // a nagy formák hullámhossza

  // tájegység tile-onként (több tájegységű szektorban eltorzított Voronoi-foltok)
  const bl = (sec.biomes || [sec.biome]).filter(k => BIO[k]); if (!bl.length) bl.push('stone');
  const bs = []; for (let k = 0, K = bl.length === 1 ? 1 : Math.round(N / 24000) + bl.length; k < K; k++) bs.push([R() * w, R() * h, k % bl.length]);
  const bio = new Uint8Array(N);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (bl.length === 1) break;
    const X = x + (noise3(x, y, 2, .5, 23) - .5) * 60, Y = y + (noise3(x + 500, y, 2, .5, 23) - .5) * 60; let bi = 0, bd = 1e18;
    for (let k = 0; k < bs.length; k++) { const d = (X - bs[k][0]) ** 2 + (Y - bs[k][1]) ** 2; if (d < bd) { bd = d; bi = k; } }
    bio[y * w + x] = bs[bi][2];
  }

  // 1. genTile: padló a táblából, minden tile fal, kivéve ahol a ridged zaj magas
  const rid = new Float32Array(N);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, b = bl[bio[i]], [tc, hc] = CENTER[b] || CENTER.stone;
    const t = Math.min(.999, Math.max(0, tc + (noise(x, y + 999, 5, .56, L * 1.4) - .5) * .28)), hh = Math.min(.999, Math.max(0, hc + (noise2(x, y, 5, .5, L * 1.2) - .5) * .3));
    let f = ARR[Math.floor(t * 13)][Math.floor(hh * 13)];
    if (sec.sand && noise3(x + 77, y - 31, 2, .6, 26) > 1 - sec.sand * .3) f = f === sn || f === ic ? ds : (f === W_ || f === D_ ? f : (noise3(x, y, 1, 1, 9) > .5 ? s_ : ds));
    floor[i] = FLI[f];
    const n1 = noise3(x + 3000, y, 2, .5, L) * 2 - 1; rid[i] = 1 - Math.abs(n1);
  }
  { const srt = Float32Array.from(rid).sort(), thr = srt[Math.floor(N * (1 - .36))]; for (let i = 0; i < N; i++) solid[i] = rid[i] > thr ? 0 : 1; }

  // 2. cells(4): 24 szomszéd (r < 3); a fal fal marad, ha >= 16 szomszéd fal, az üres fal lesz, ha > 16
  const OFF = []; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if ((dx || dy) && dx * dx + dy * dy < 9) OFF.push([dx, dy]);
  const OD = Int32Array.from(OFF.map(([dx, dy]) => dy * w + dx));
  const cells = it => {
    let rd = solid.slice(), wr = new Uint8Array(N);
    for (let k = 0; k < it; k++) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let a = 0; const i = y * w + x;
        if (x >= 3 && y >= 3 && x < w - 3 && y < h - 3) for (let k = 0; k < 24; k++) a += rd[i + OD[k]];
        else for (const [dx, dy] of OFF) { const X = x + dx, Y = y + dy; a += X < 0 || Y < 0 || X >= w || Y >= h ? 1 : rd[Y * w + X]; } wr[i] = rd[i] ? (a >= 16 ? 1 : 0) : (a > 16 ? 1 : 0);
      }
      [rd, wr] = [wr, rd];
    }
    solid.set(rd);
  };
  // distort: minden tile a zajjal eltolt helyről veszi a padlót és a falat
  const distort = (scl, mag) => {
    const s2 = solid.slice(), f2 = floor.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const cx = Math.min(w - 1, Math.max(0, Math.floor(x + noise(x - 155, y - 200, 1, 0, scl) * mag - mag / 2))), cy = Math.min(h - 1, Math.max(0, Math.floor(y + noise(x + 155, y + 155, 1, 0, scl) * mag - mag / 2)));
      solid[y * w + x] = s2[cy * w + cx]; floor[y * w + x] = f2[cy * w + cx];
    }
  };
  const erase = (cx, cy, r) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const X = cx + x, Y = cy + y; if (X >= 0 && Y >= 0 && X < w && Y < h && x * x + y * y < r * r) solid[Y * w + X] = 0; } };
  cells(4);
  distort(10, 12);

  // 3. termek: néhány nagy, kerek tisztás a térkép belsejében, a játékos és az ellenség kezdőterme a peremen
  const cxm = w / 2, cym = h / 2, rad = Math.min(w, h) / 2 / Math.sqrt(3), rooms = [];
  const nRooms = Math.round(ri(2, 5) * Math.max(1, Math.sqrt(N / 90000)));
  for (let k = 0; k < nRooms; k++) {
    const a = rr(0, Math.PI * 2), d = rr(0, rad / 1.3), rx = cxm + Math.cos(a) * d * w / Math.min(w, h), ry = cym + Math.sin(a) * d * h / Math.min(w, h);
    rooms.push({ x: Math.round(rx), y: Math.round(ry), r: Math.round(Math.min(rr(9, Math.max(10, (rad - d) / 2)), 30)), c: new Set() });
  }
  const off = R() * Math.PI * 2, lenx = w / 2.55 - rr(13, 23), leny = h / 2.55 - rr(13, 23);
  let spawn = null; const enemies = [];
  for (let a = 0; a < 360; a += 5) {
    const ang = off + a * Math.PI / 180, cx = Math.round(cxm + Math.cos(ang) * lenx), cy = Math.round(cym + Math.sin(ang) * leny);
    let wt = 0; for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) { const X = cx + x, Y = cy + y; if (X < 0 || Y < 0 || X >= w || Y >= h || FLOORS[FL[floor[Y * w + X]]].liq) wt++; }
    if (wt <= 4 || a + 5 >= 360) {
      spawn = { x: cx, y: cy, r: ri(8, 15), c: new Set() }; rooms.push(spawn);
      for (let k = 0; k < Math.max(1, sec.sp || 1); k++) {
        const ea = ang + Math.PI + (sec.sp > 1 ? (k / (sec.sp - 1) - .5) * 2 : rr(-1, 1)) * Math.PI / 3;
        const ex = Math.round(Math.min(w - 12, Math.max(12, cxm + Math.cos(ea) * lenx))), ey = Math.round(Math.min(h - 12, Math.max(12, cym + Math.sin(ea) * leny)));
        const er = { x: ex, y: ey, r: ri(8, 16), c: new Set() }; rooms.push(er); enemies.push(er);
      }
      break;
    }
  }
  for (const r of rooms) erase(r.x, r.y, r.r);

  // utak: A* a zajos költségmezőn (fal +50, zaj · 500), az út mentén r = 3..9 sugarú ecsettel
  // az utak zajos költségmezője (a Mindustryban utanként más léptékű; itt egy közös, 120 mezős léptékű mező)
  const pathCost = new Float32Array(N); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) pathCost[y * w + x] = noise2(x + 911, y, 2, .4, 120);
  const join = (x1, y1, x2, y2, fix) => {
    const nscl = rr(100, 140), stroke = ri(3, 9), dd = Math.abs(x2 - x1) + Math.abs(y2 - y1), m = Math.round(dd * .35 + 16);
    const bx0 = Math.max(0, Math.min(x1, x2) - m), by0 = Math.max(0, Math.min(y1, y2) - m), bx1 = Math.min(w - 1, Math.max(x1, x2) + m), by1 = Math.min(h - 1, Math.max(y1, y2) + m), bw = bx1 - bx0 + 1, bh = by1 - by0 + 1;
    const g = new Float32Array(bw * bh).fill(Infinity), from = new Int32Array(bw * bh).fill(-1), cost = new Float32Array(bw * bh); let mc = Infinity;
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { const i = (y + by0) * w + x + bx0, c = 1 + (solid[i] ? 50 : 0) + pathCost[i] * 500; cost[y * bw + x] = c; if (c < mc) mc = c; }
    const tx = x2 - bx0, ty = y2 - by0, hp = new Heap(), s0 = (y1 - by0) * bw + x1 - bx0, goal = ty * bw + tx; g[s0] = 0; hp.push(0, s0);
    while (hp.n) {
      const c = hp.pop(); if (c === goal) break; const cx = c % bw, cy = (c - cx) / bw, gc = g[c];
      for (let k = 0; k < 4; k++) { const nx = cx + (k === 0) - (k === 1), ny = cy + (k === 2) - (k === 3); if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue; const j = ny * bw + nx, ng = gc + cost[j]; if (ng < g[j]) { g[j] = ng; from[j] = c; hp.push(ng + (Math.abs(nx - tx) + Math.abs(ny - ty)) * mc, j); } }
    }
    for (let c = goal; c >= 0; c = from[c]) { const px = c % bw + bx0, py = Math.floor(c / bw) + by0; erase(px, py, fix ? 3 : stroke); if (fix) for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) { const X = px + xx, Y = py + yy; if (X >= 0 && Y >= 0 && X < w && Y < h && xx * xx + yy * yy < 9) fix(Y * w + X); } }
  };
  const connect = (a, b) => {
    if (a === b || a.c.has(b)) return; a.c.add(b);
    let mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; const d = Math.hypot(mx - a.x, my - a.y), ang = rr(0, Math.PI * 2); mx += Math.cos(ang) * d; my += Math.sin(ang) * d;
    let vx = mx - cxm, vy = my - cym; const lim = Math.min(w, h) / 2 / Math.sqrt(3) * 1.5, vl = Math.hypot(vx, vy); if (vl > lim) { vx *= lim / vl; vy *= lim / vl; }
    mx = Math.round(Math.min(w - 4, Math.max(3, cxm + vx))); my = Math.round(Math.min(h - 4, Math.max(3, cym + vy)));
    join(a.x, a.y, mx, my); join(mx, my, b.x, b.y);
  };
  const nCon = ri(Math.max(nRooms - 1, 1), nRooms + 3);
  for (let k = 0; k < nCon; k++) connect(rooms[Math.floor(R() * rooms.length)], rooms[Math.floor(R() * rooms.length)]);
  for (const r of rooms) connect(spawn, r);
  cells(1);
  distort(10, 6);

  // 4. folyók a nyílt részeken (a magtól távol; jégen, havon nem), magmás tájon olvadt salak
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (solid[i]) continue;
    const v = 1 - Math.abs(noise(x + 4100, y - 900, 2, .45, L * 1.25) * 2 - 1) + (noise3(x, y, 2, .6, 7) - .5) * .02, rs = (noise3(x, y, 2, .6, 7) - .5) * 44;
    const thr = 1 - .045 * wq;
    if (v > thr && Math.hypot(x - spawn.x, y - spawn.y) > 14 + rs) {
      const f = FL[floor[i]]; if (f === 'ice' || f === 'snow' || FLOORS[f].liq) continue;
      const deep = v > 1 - .018 * wq && Math.hypot(x - spawn.x, y - spawn.y) > 17 + rs, mag = bl[bio[i]] === 'magma';
      floor[i] = FLI[mag ? 'magma' : deep ? 'deep' : 'water'];
    }
  }

  // 5. ércek (BasicGenerator.ores / Serpulo): két zajfeltétel, a ritkább érc elsőbbséget kap; hulladéknál sérült fémpadló
  const base = ['copper', 'lead', 'coal', 'titanium', 'thorium', 'scrap'], ores = [...base, ...Object.keys(sec.ores).filter(k => !base.includes(k) && k !== 'sand' && ITEM_IDS.includes(k))].filter(k => sec.ores[k]);
  const freq = ores.map((k, i) => rr(-.1, .01) - i * .01 + .3 * .04 - ((sec.ores[k] || 1) - 1) * .04);
  const nOre = mkNoise(seed + 101);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (FLOORS[FL[floor[i]]].liq) continue;
    const ox = x - 4, oy = y + 23;
    for (let k = ores.length - 1; k >= 0; k--) {
      if (Math.abs(.5 - nOre(ox, oy + k * 999, 2, .7, 40 + k * 2)) > .22 + k * .01 && Math.abs(.5 - nOre(ox, oy - k * 999, 1, 1, 30 + k * 4)) > .37 + freq[k]) {
        ore[i] = ITEM_IDS.indexOf(ores[k]) + 1; if (ores[k] === 'scrap' && chance(.33)) floor[i] = FLI.metal; break;
      }
    }
  }

  // 6. medián simítás (r = 2) a padlón és a falakon
  {
    const C = []; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (dx * dx + dy * dy <= 4) C.push([dx, dy]);
    const fo = new Uint8Array(N), so = new Uint8Array(N), cnt = new Uint16Array(64), sc = new Uint16Array(4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let n = 0; cnt.fill(0); sc.fill(0);
      for (const [dx, dy] of C) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = Y * w + X; cnt[floor[j]]++; sc[solid[j]]++; n++; }
      const m = Math.min(n - 1, Math.floor(n * .5)); let a = 0, k = 0; for (; k < 64; k++) { a += cnt[k]; if (a > m) break; } fo[y * w + x] = k;
      a = 0; for (k = 0; k < 4; k++) { a += sc[k]; if (a > m) break; } so[y * w + x] = k;
    }
    floor.set(fo); solid.set(so);
  }

  // a magnak hely, a kezdőpontok tiszták
  const disc = (x0, y0, r, fn) => { for (let y = y0 - r; y <= y0 + r; y++) for (let x = x0 - r; x <= x0 + r; x++) if (x >= 1 && y >= 1 && x < w - 1 && y < h - 1 && (x - x0) ** 2 + (y - y0) ** 2 <= r * r) fn(y * w + x, x, y); };
  const dry = i => { if (FLOORS[FL[floor[i]]].liq) floor[i] = FLI[bl[bio[i]] === 'sand' ? 'darksand' : 'stone']; };
  disc(spawn.x, spawn.y, 6, i => { solid[i] = 0; dry(i); });
  for (const e of enemies) disc(e.x, e.y, 5, i => { solid[i] = 0; dry(i); });

  // 7. inverseFloodFill: ami a játékos kezdőhelyéről nem érhető el, az fal lesz; az ellenség kezdőhelyéhez szükség esetén utat vág
  const reach = (passDeep) => { const seen = new Uint8Array(N), st2 = [spawn.y * w + spawn.x]; seen[st2[0]] = 1; while (st2.length) { const i = st2.pop(), x = i % w; for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) { if (j < 0 || j >= N || seen[j] || solid[j] || (!passDeep && FLOORS[FL[floor[j]]].deep)) continue; seen[j] = 1; st2.push(j); } } return seen; };
  for (let pass = 0; pass < 4; pass++) {
    const ok = reach(false); let bad = false;
    for (const e of enemies) if (!ok[e.y * w + e.x]) { bad = true; join(e.x, e.y, spawn.x, spawn.y, i => { const f = FL[floor[i]]; if (FLOORS[f].deep) floor[i] = f === 'magma' ? FLI.magmarock : FLI.water; }); }   // gázló a mély vízen át
    if (!bad) break;
  }
  { const ok = reach(true); for (let i = 0; i < N; i++) if (!ok[i]) solid[i] = 1; }

  // 8. technikai padló, moha / spóra, kátrány, forró kő
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, f = FL[floor[i]]; if (FLOORS[f].liq) continue;
    const mx = x % 20, my = y % 20, sx = Math.floor(x / 20), sy = Math.floor(y / 20);
    if (noise3(sx, sy, 1, 0, .2) > .63 && noise3(sx, sy + 999, 1, 0, 200) > .6 && (mx === 0 || my === 0 || mx === 19 || my === 19)) { if (chance(noise3(x + 0x2315, y, 1, 0, 40))) floor[i] = FLI.metal; if (solid[i] && chance(.7)) solid[i] = 2; }
    if (f === 'spore' && Math.abs(.5 - noise2(x - 90, y, 4, .8, 65)) > .02) floor[i] = FLI.moss;
    if (f === 'darksand' && Math.abs(.5 - noise2(x - 40, y, 2, .7, 80)) > .25 && Math.abs(.5 - noise3(x, y + 333, 1, 1, 60)) > .41 && !rooms.some(r => Math.hypot(x - r.x, y - r.y) < 30)) floor[i] = FLI.tar;
    if (f === 'hotrock') {
      if (Math.abs(.5 - noise2(x - 90, y, 4, .8, 80)) > .035) floor[i] = FLI.basalt;
      else { ore[i] = 0; let all = true; for (const j of [i - 1, i + 1, i - w, i + w]) { const g2 = FL[floor[j]]; if (g2 !== 'hotrock' && g2 !== 'magmarock') all = false; } if (all) floor[i] = FLI.magmarock; }
    }
  }

  // falak a végső padló szerint (Mindustry: floor.wall), a tájegység falszíne a folyadékok mellett
  const wall = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (!solid[i]) continue; const f = FL[floor[i]], wn = solid[i] === 2 ? 'darkrock' : WALLOF[f] || BIO[bl[bio[i]]].wall;
    wall[i] = WL.indexOf(wn) + 1; if (FLOORS[f].liq) floor[i] = FLI[BIO[bl[bio[i]]].f[0]];
  }
  // trimDark: a térkép széle (sötétség) mindig fal
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if ((x < 3 || y < 3 || x >= w - 3 || y >= h - 3) && !wall[i]) { wall[i] = WL.indexOf(WALLOF[FL[floor[i]]] || BIO[bl[bio[i]]].wall) + 1; if (FLOORS[FL[floor[i]]].liq) floor[i] = FLI[BIO[bl[bio[i]]].f[0]]; } }

  // a kezdőhely mellé, ha a zaj nem adott, egy-egy kis réz- és ólomfolt és homok (különben a kampány eleje elakadna)
  const cx = spawn.x, cy = spawn.y, has = (k, r) => { let f = false; disc(cx, cy, r, i => { if (!wall[i] && (k === 'sand' ? FLOORS[FL[floor[i]]].ore === 'sand' : ore[i] === ITEM_IDS.indexOf(k) + 1)) f = true; }); return f; };
  const patch = (k, r0) => { for (let t = 0; t < 60; t++) { const a = R() * 7, d = rr(7, r0), px = Math.round(cx + Math.cos(a) * d), py = Math.round(cy + Math.sin(a) * d), pi = py * w + px; if (px < 3 || py < 3 || px >= w - 3 || py >= h - 3 || wall[pi]) continue; disc(px, py, 2, i => { if (wall[i]) return; dry(i); if (k === 'sand') floor[i] = FLI.darksand; else ore[i] = ITEM_IDS.indexOf(k) + 1; }); return; } };
  for (const k of ['copper', 'lead']) if (!has(k, 24)) patch(k, 14);
  if (sec.sand && !has('sand', 40)) patch('sand', 18);
  for (const e of enemies) for (let y = e.y - 1; y <= e.y + 1; y++) for (let x = e.x - 1; x <= e.x + 1; x++) { floor[y * w + x] = FLI.spawn; ore[y * w + x] = 0; }
  disc(cx, cy, 2, i => { ore[i] = 0; });
  for (let i = 0; i < N; i++) if (wall[i]) ore[i] = ore[i];        // a falak alatti érc rejtve marad (a Mindustryban is)
  return { floor, ore, wall, coreAt: { x: cx - 1, y: cy - 1 }, spawns: enemies.map(e => ({ x: e.x, y: e.y })) };
}
