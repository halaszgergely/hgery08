// Locsolóháború – pályák (kódból épített low-poly elemek), ütközés, sugárkövetés. A gazda és a kliensek ugyanezt használják.
export const PR = 0.35, PH = 1.75, CH = 1.2, STEP = 0.55, GRAV = 22, JUMP = 7.4;

/* ---------- pályaépítő ---------- */
function builder(W, D) {
  const M = { W, D, boxes: [], vis: [], taps: [], pools: [], belts: [], spawns: [], bases: [], gold: [0, 0, 0], ens: [] };
  // box: középpont x,z; szélesség w (x), mélység d (z), magasság h, szín; y0 alap; k: 0 szilárd, 2 kaktusz (szúr), 4 csak látvány
  M.box = (x, z, w, d, h, c, y0 = 0, k = 0) => { const b = { a: [x - w / 2, y0, z - d / 2], b: [x + w / 2, y0 + h, z + d / 2], c, k }; if (k & 4) M.vis.push({ t: 'box', ...b }); else M.boxes.push(b); return b; };
  M.cyl = (x, z, r, h, c, y0 = 0, solid = 1, n = 10) => { M.vis.push({ t: 'cyl', x, z, r, h, y0, c, n }); if (solid) M.boxes.push({ a: [x - r * .82, y0, z - r * .82], b: [x + r * .82, y0 + h, z + r * .82], c, k: 8 }); };
  M.cone = (x, z, r, h, c, y0 = 0, n = 8) => M.vis.push({ t: 'cone', x, z, r, h, y0, c, n });
  M.hpipe = (x0, z0, x1, z1, r, y, c) => M.vis.push({ t: 'hcyl', x0, z0, x1, z1, r, y, c });
  M.water = (x0, z0, x1, z1, y = .05) => M.vis.push({ t: 'water', a: [x0, y, z0], b: [x1, y, z1] });
  // lépcső: dir 0:+x 1:-x 2:+z 3:-z irányba emelkedik
  M.stairs = (x, z, w, len, h, dir, c) => { const n = Math.max(2, Math.ceil(h / .42)), sl = len / n;
    for (let i = 0; i < n; i++) { const hh = h * (i + 1) / n, o = -len / 2 + sl * (i + .5); if (dir < 2) M.box(x + (dir ? -o : o), z, sl + .02, w, hh, c); else M.box(x, z + (dir === 3 ? -o : o), w, sl + .02, hh, c); } };
  M.tap = (x, z) => { M.taps.push([x, z]); M.cyl(x, z, .18, 1.1, 0x9aa8b8, 0, 1, 8); M.box(x, z, .5, .12, .12, 0xff5a4d, 1.05, 4); M.hpipe(x, z, x + .35, z, .07, .95, 0x9aa8b8); };
  M.wall = (x0, z0, x1, z1, h, c, t = .6) => { const w = Math.abs(x1 - x0) || t, d = Math.abs(z1 - z0) || t; M.box((x0 + x1) / 2, (z0 + z1) / 2, w, d, h, c); };
  M.border = (h, c) => { M.wall(-W / 2, -D / 2, W / 2, -D / 2, h, c, 1); M.wall(-W / 2, D / 2, W / 2, D / 2, h, c, 1); M.wall(-W / 2, -D / 2, -W / 2, D / 2, h, c, 1); M.wall(W / 2, -D / 2, W / 2, D / 2, h, c, 1); };
  return M;
}
function kert() { const M = builder(62, 62); M.id = 'kert'; M.n = 'Locsolóvölgy kertje'; M.sky = [.55, .78, .95]; M.ground = 0x5fa04e; M.fog = [.62, .8, .92];
  M.border(3.2, 0x2f7a35);
  // kerti ház ajtókkal és lapos tetővel (a tetőre lépcső visz)
  const hx = -15, hz = -15, hc = 0xc9a66b; M.wall(hx - 4, hz - 3, hx + 4, hz - 3, 3, hc, .4); M.wall(hx - 4, hz + 3, hx - 1, hz + 3, 3, hc, .4); M.wall(hx + 1, hz + 3, hx + 4, hz + 3, 3, hc, .4); M.box(hx, hz + 3, 2, .4, .8, hc, 2.2);
  M.wall(hx - 4, hz - 3, hx - 4, hz + 3, 3, hc, .4); M.wall(hx + 4, hz - 3, hx + 4, hz - 1, 3, hc, .4); M.wall(hx + 4, hz + 1, hx + 4, hz + 3, 3, hc, .4); M.box(hx + 4, hz, .4, 2, .8, hc, 2.2); M.box(hx, hz, 8.6, 6.6, .3, 0x8a4b2e, 3); M.stairs(hx - 6, hz, 2, 3.6, 3.3, 1, 0x9c7b52);
  M.box(hx - 2.5, hz - 1.6, 1.4, 1, 1, 0x8a6b45); M.box(hx + 2.4, hz - 1.8, 1, 1, 1.2, 0x7a5b35);
  M.box(15, 15, 8, 6, 2.4, 0xd8e8f0, 0, 4); M.wall(11, 12, 19, 12, 2.4, 0xbfe0ea, .2); M.wall(11, 18, 13.8, 18, 2.4, 0xbfe0ea, .2); M.wall(16.2, 18, 19, 18, 2.4, 0xbfe0ea, .2); M.wall(11, 12, 11, 18, 2.4, 0xbfe0ea, .2); M.wall(19, 12, 19, 18, 2.4, 0xbfe0ea, .2); M.box(15, 15, 3, 1.2, .9, 0x6b4a2a);
  // sövénysorok, ágyások
  for (const [x, z, w, d] of [[-6, 8, 10, 1.2], [8, -8, 10, 1.2], [-22, 6, 1.2, 9], [22, -6, 1.2, 9], [0, 24, 14, 1.2], [0, -25, 12, 1.2], [6, 4, 1.2, 6], [-6, -4, 1.2, 6]]) M.box(x, z, w, d, 1.7, 0x2c7d36);
  for (const [x, z] of [[-10, 20], [10, -20], [20, 2], [-20, -2], [24, 22], [-24, -22]]) { M.box(x, z, 3, 1.6, .55, 0x7a4b2a); M.box(x, z, 2.6, 1.2, .2, 0xff7aa8, .55, 4); }
  // fák
  for (const [x, z] of [[-26, 24], [26, -24], [-4, 18], [4, -18], [18, 24], [-18, -26], [27, 12], [-27, -12]]) { M.cyl(x, z, .35, 2.6, 0x6b4423); M.cone(x, z, 2.1, 3.4, 0x2f8c3c, 2.2); M.cone(x, z, 1.5, 2.4, 0x3aa44a, 3.8); }
  // tó a közepén, alacsony peremmel
  M.water(-4, -3, 4, 3, .06); M.pools.push([-4, -3, 4, 3]); for (const [x0, z0, x1, z1] of [[-4.3, -3.3, 4.3, -3], [-4.3, 3, 4.3, 3.3], [-4.3, -3.3, -4, 3.3], [4, -3.3, 4.3, 3.3]]) M.box((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, .35, 0x9a9a92);
  // emelvény az Arany Locsolófejnek
  M.box(0, -16, 4, 4, 2.2, 0xb08d57); M.stairs(0, -12.5, 2, 3, 2.2, 3, 0xa07d47); M.gold = [0, 2.2, -16];
  for (const [x, z] of [[-27, 0], [27, 0], [0, 27], [8, 8], [-9, -9]]) M.tap(x, z);
  M.box(-12, 10, 1.2, 1.2, 1.2, 0x8a6b45); M.box(12, -11, 1.2, 1.2, 1.2, 0x8a6b45); M.box(12.6, -11, 1, 1, 2.2, 0x9a7b55); M.box(-25, 16, 2.4, 1.2, .8, 0x6b4a2a); M.box(25, -16, 2.4, 1.2, .8, 0x6b4a2a);
  M.bases = [[-26, 0], [26, 0]]; M.spawns = [[-27, -8, 0], [-27, 8, 0], [-22, -20, 0], [-22, 20, 0], [27, 8, 1], [27, -8, 1], [22, 20, 1], [22, -20, 1]];
  M.ens = [[-29, -29], [29, 29], [29, -29], [-29, 29], [0, 29], [0, -29]]; return M; }
function gyar() { const M = builder(72, 50); M.id = 'gyar'; M.n = 'HGWS gyárcsarnok'; M.sky = [.42, .47, .55]; M.ground = 0x5c6470; M.fog = [.36, .4, .46];
  M.border(8, 0x3a4250);
  for (let i = 0; i < 6; i++) M.box(-30 + i * 12, -24.6, 3, .6, 6, 0x2a7ac0, 1.5, 4);
  // raktárpolcok ládákkal
  for (const z of [-15, -9]) for (const x of [-22, -12, 12, 22]) { M.box(x, z, 7, 1.1, 3.2, 0x6c7a8c); for (let k = -2; k <= 2; k++) M.box(x + k * 1.35, z, 1.1, .9, .9, [0xc98a3e, 0x9a6a2e, 0xe8b656][(k + 4) % 3], 3.2, 4); }
  for (const z of [9, 15]) for (const x of [-22, -12, 12, 22]) { M.box(x, z, 7, 1.1, 3.2, 0x6c7a8c); for (let k = -2; k <= 2; k++) M.box(x + k * 1.35, z, 1.1, .9, .9, [0xc98a3e, 0x9a6a2e, 0xe8b656][(k + 5) % 3], 3.2, 4); }
  // futószalagok (aki rááll, viszi)
  for (const [z, v] of [[-3, 3], [3, -3]]) { M.box(0, z, 26, 2, .6, 0x2a2f38); M.box(0, z, 26, 1.6, .04, 0x444b57, .6, 4); M.belts.push([-13, z - 1, 13, z + 1, v, 0, .6]); for (let k = -12; k <= 12; k += 3) M.box(k, z, .2, 1.7, .05, 0xe8b656, .62, 4); }
  // gépek csövekkel
  for (const [x, z] of [[-30, 0], [30, 0]]) { M.box(x, z, 4, 6, 3.4, 0x8a96a6); M.cyl(x, z - 4.5, 1, 4.5, 0xc3ced9); M.cyl(x, z + 4.5, 1, 4.5, 0xc3ced9); M.hpipe(x, z - 4.5, x, z + 4.5, .25, 4.2, 0xe8b656); }
  // járóhíd középen, két lépcsővel
  M.box(0, 18, 16, 3, .3, 0x9aa6b6, 3.2); for (const x of [-7.5, 7.5]) M.box(x, 18, .3, 3, 3.2, 0x6c7a8c); M.stairs(-10.5, 18, 2.6, 4.5, 3.4, 1, 0x7a8696); M.stairs(10.5, 18, 2.6, 4.5, 3.4, 0, 0x7a8696);
  M.box(0, -18, 16, 3, .3, 0x9aa6b6, 3.2); M.stairs(-10.5, -18, 2.6, 4.5, 3.4, 1, 0x7a8696); M.stairs(10.5, -18, 2.6, 4.5, 3.4, 0, 0x7a8696); M.gold = [0, 3.5, -18];
  for (const [x, z] of [[-5, 10], [5, -10], [-18, 0], [18, 0], [-6, -21], [6, 21]]) M.box(x, z, 1.4, 1.4, 1.4, 0xc98a3e);
  for (const [x, z] of [[-34, -20], [34, 20], [-34, 20], [34, -20], [0, 0]]) M.tap(x, z === 0 ? 7 : z);
  M.bases = [[-33, 0], [33, 0]]; M.spawns = [[-33, -6, 0], [-33, 6, 0], [-28, -21, 0], [-28, 21, 0], [33, 6, 1], [33, -6, 1], [28, 21, 1], [28, -21, 1]];
  M.ens = [[-34, -23], [34, 23], [-34, 23], [34, -23], [0, -23], [0, 23]]; return M; }
function atemelo() { const M = builder(66, 66); M.id = 'atemelo'; M.n = 'Átemelőtelep'; M.sky = [.5, .66, .78]; M.ground = 0x7f8a80; M.fog = [.55, .68, .76];
  M.border(3.5, 0x58646a);
  // medencék peremmel: bennük lassabb a mozgás, de a tartály töltődik
  for (const [x0, z0, x1, z1] of [[-24, -24, -10, -12], [10, 12, 24, 24], [-6, -5, 6, 5]]) { M.water(x0, z0, x1, z1, .08); M.pools.push([x0, z0, x1, z1]); const t = .5, c = 0xa4aaa4;
    M.box((x0 + x1) / 2, z0 - t / 2, x1 - x0 + 2 * t, t, .9, c); M.box((x0 + x1) / 2, z1 + t / 2, x1 - x0 + 2 * t, t, .9, c); M.box(x0 - t / 2, (z0 + z1) / 2 - 2.5, t, z1 - z0 - 5, .9, c); M.box(x1 + t / 2, (z0 + z1) / 2 + 2.5, t, z1 - z0 - 5, .9, c); }
  // szivattyúház, tetőre lépcső
  const hx = 18, hz = -16, hc = 0xb7a58a; M.wall(hx - 5, hz - 4, hx + 5, hz - 4, 3.4, hc, .4); M.wall(hx - 5, hz + 4, hx - 1.2, hz + 4, 3.4, hc, .4); M.wall(hx + 1.2, hz + 4, hx + 5, hz + 4, 3.4, hc, .4); M.box(hx, hz + 4, 2.4, .4, .9, hc, 2.5);
  M.wall(hx - 5, hz - 4, hx - 5, hz + 4, 3.4, hc, .4); M.wall(hx + 5, hz - 4, hx + 5, hz - 1.2, 3.4, hc, .4); M.wall(hx + 5, hz + 1.2, hx + 5, hz + 4, 3.4, hc, .4); M.box(hx + 5, hz, .4, 2.4, .9, hc, 2.5); M.box(hx, hz, 10.6, 8.6, .3, 0x6b4a3a, 3.4);
  M.cyl(hx - 2, hz, 1, 2, 0x2a7ac0); M.cyl(hx + 2, hz, 1, 2, 0x2a7ac0); M.hpipe(hx - 2, hz, hx + 2, hz, .3, 1.6, 0xe8b656); M.stairs(hx, hz - 6.2, 2.4, 3.8, 3.7, 3, 0x8a7a64); M.gold = [hx, 3.7, hz];
  // nagy tartályok és aknák
  for (const [x, z] of [[-20, 16], [-12, 22], [22, -2]]) { M.cyl(x, z, 2.4, 5, 0xc3ced9, 0, 1, 14); M.cone(x, z, 2.5, 1, 0x9aa6b6, 5, 14); }
  for (const [x, z] of [[-2, 16], [4, -16], [-16, 0], [14, 2], [-26, -2], [28, 26], [-28, 28], [26, -28]]) M.cyl(x, z, .8, 1, 0x56606a, 0, 1, 10);
  M.hpipe(-31, 8, 31, 8, .35, .4, 0x8a96a6); M.box(0, 8, 62, .7, .75, 0x8a96a6, 0, 4); M.boxes.push({ a: [-31, 0, 7.65], b: [31, .75, 8.35], c: 0, k: 8 });
  M.hpipe(-8, -31, -8, -6, .35, .4, 0x8a96a6); M.boxes.push({ a: [-8.35, 0, -31], b: [-7.65, .75, -6], c: 0, k: 8 });
  for (const [x, z] of [[-30, -30], [30, 30], [-30, 30], [30, -30]]) M.tap(x, z);
  M.bases = [[-28, 0], [28, 4]]; M.spawns = [[-29, -10, 0], [-29, 10, 0], [-14, -29, 0], [-14, 29, 0], [29, 12, 1], [29, -8, 1], [14, 29, 1], [10, -29, 1]];
  M.ens = [[-31, -31], [31, 31], [-31, 31], [31, -31], [0, 31], [0, -31]]; return M; }
function aszaly() { const M = builder(72, 60); M.id = 'aszaly'; M.n = 'Aszályföld'; M.sky = [.95, .78, .52]; M.ground = 0xc9a066; M.fog = [.92, .76, .55];
  M.border(6, 0x9a6a3e);
  // a kanyon két sziklafala átjárókkal
  for (const z of [-9, 9]) for (const [x0, x1] of [[-36, -20], [-15, -4], [4, 15], [20, 36]]) { const h = 5 + ((x0 * 7 + z) & 3) * .6; M.box((x0 + x1) / 2, z, x1 - x0, 3.2, h, 0xa86a3a); M.box((x0 + x1) / 2, z, x1 - x0 - 1.5, 2.2, 1, 0xb87a4a, h, 4); }
  // fennsíkok lépcsővel
  M.box(-24, -20, 8, 7, 3, 0xb07440); M.stairs(-24, -14.8, 2.4, 3.4, 3, 2, 0x9a6438); M.box(24, 20, 8, 7, 3, 0xb07440); M.stairs(24, 14.8, 2.4, 3.4, 3, 3, 0x9a6438);
  M.box(0, 0, 5, 5, 2.6, 0xb98050); M.stairs(-3.9, 0, 2, 2.8, 2.6, 0, 0xa06a40); M.gold = [0, 2.6, 0];
  for (const [x, z, s] of [[-12, -20, 1.6], [12, 22, 1.4], [-30, 22, 2], [30, -22, 2], [8, -22, 1.2], [-8, 22, 1.3], [-28, 0, 1.4], [28, 0, 1.4], [16, -2, 1], [-16, 3, 1.1], [0, 14, 1.2], [0, -14, 1.2]]) M.box(x, z, s * 1.6, s * 1.4, s, 0xb88a58);
  // kaktuszok (szúrnak)
  for (const [x, z] of [[-6, -20], [6, 20], [-18, 24], [18, -24], [-32, -12], [32, 12], [-10, 4], [10, -4], [24, -12], [-24, 12], [-2, -26], [2, 26]]) { M.box(x, z, .7, .7, 2.6, 0x3f9a4a, 0, 2); M.box(x + .55, z, .5, .4, .9, 0x3f9a4a, 1.2, 6); M.box(x - .55, z, .5, .4, .9, 0x3f9a4a, 1.6, 6); }
  M.cyl(30, -2, .3, 3, 0x6b4a2a); M.box(30, -2, 2.4, .25, .25, 0x6b4a2a, 2.4, 4);
  for (const [x, z] of [[-34, -27], [34, 27], [-2, 9 + 4], [2, -13]]) M.tap(x, z);
  M.bases = [[-32, 0], [32, 0]]; M.spawns = [[-33, -4, 0], [-33, 4, 0], [-30, -24, 0], [-30, 24, 0], [33, 4, 1], [33, -4, 1], [30, 24, 1], [30, -24, 1]];
  M.ens = [[-34, -27], [34, 27], [-34, 27], [34, -27], [0, -27], [0, 27]]; return M; }
export const MAPS = [{ id: 'kert', n: 'Locsolóvölgy kertje', f: kert }, { id: 'gyar', n: 'HGWS gyárcsarnok', f: gyar }, { id: 'atemelo', n: 'Átemelőtelep', f: atemelo }, { id: 'aszaly', n: 'Aszályföld', f: aszaly }];
const cache = {};
export function mapOf(id) { if (cache[id]) return cache[id]; const def = MAPS.find(m => m.id === id) || MAPS[0], M = def.f(); index(M); return cache[id] = M; }

/* ---------- térbeli rács a gyors lekérdezéshez ---------- */
const CS = 4;
function index(M) { M.gw = Math.ceil(M.W / CS) + 2; M.gd = Math.ceil(M.D / CS) + 2; M.grid = Array.from({ length: M.gw * M.gd }, () => []); M.stamp = 0;
  M.boxes.forEach((b, i) => { b.id = i; b.s = 0; for (let gx = cx(M, b.a[0]); gx <= cx(M, b.b[0]); gx++) for (let gz = cz(M, b.a[2]); gz <= cz(M, b.b[2]); gz++) M.grid[gz * M.gw + gx].push(b); }); }
const cx = (M, x) => Math.max(0, Math.min(M.gw - 1, Math.floor((x + M.W / 2) / CS) + 1)), cz = (M, z) => Math.max(0, Math.min(M.gd - 1, Math.floor((z + M.D / 2) / CS) + 1));
function near(M, x0, z0, x1, z1, fn) { const st = ++M.stamp; for (let gx = cx(M, x0); gx <= cx(M, x1); gx++) for (let gz = cz(M, z0); gz <= cz(M, z1); gz++) for (const b of M.grid[gz * M.gw + gx]) { if (b.s === st) continue; b.s = st; if (fn(b)) return b; } return null; }
export function overlap(M, x, y, z, r, h) { return near(M, x - r, z - r, x + r, z + r, b => !(b.k & 4) && x + r > b.a[0] && x - r < b.b[0] && z + r > b.a[2] && z - r < b.b[2] && y + h > b.a[1] + 1e-4 && y < b.b[1] - 1e-4); }
export function pointSolid(M, x, y, z) { if (y < 0) return true; return !!near(M, x, z, x, z, b => !(b.k & 4) && x > b.a[0] && x < b.b[0] && y > b.a[1] && y < b.b[1] && z > b.a[2] && z < b.b[2]); }
export const inZone = (l, x, z) => l.find(q => x > q[0] && x < q[2] && z > q[1] && z < q[3]);

/* sugár a pálya ellen: { t, n:[nx,ny,nz] } vagy null (a talaj y = 0) */
export function raycast(M, ox, oy, oz, dx, dy, dz, maxT) {
  let best = maxT, nb = null; if (dy < -1e-6) { const t = -oy / dy; if (t >= 0 && t < best) { best = t; nb = [0, 1, 0]; } }
  const x1 = ox + dx * maxT, z1 = oz + dz * maxT;
  near(M, Math.min(ox, x1), Math.min(oz, z1), Math.max(ox, x1), Math.max(oz, z1), b => { if (b.k & 4) return false;
    let t0 = 0, t1 = best, ax = -1, sg = 0; const o = [ox, oy, oz], d = [dx, dy, dz];
    for (let i = 0; i < 3; i++) { if (Math.abs(d[i]) < 1e-9) { if (o[i] < b.a[i] || o[i] > b.b[i]) return false; continue; } let ta = (b.a[i] - o[i]) / d[i], tb = (b.b[i] - o[i]) / d[i], s = -1; if (ta > tb) { const q = ta; ta = tb; tb = q; s = 1; } if (ta > t0) { t0 = ta; ax = i; sg = s; } if (tb < t1) t1 = tb; if (t0 > t1) return false; }
    if (ax >= 0 && t0 < best) { best = t0; nb = [0, 0, 0]; nb[ax] = sg; } return false; });
  return nb ? { t: best, n: nb } : null;
}

/* ---------- mozgás (közös: gazda-szimuláció és kliens-előrejelzés) ---------- */
// inp: { mx, my (-1..1 előre/jobbra), b: gombok, yaw }  B_JUMP 1, B_CROUCH 2, B_RUN 4
export const B_JUMP = 1, B_CROUCH = 2, B_RUN = 4, B_FIRE = 8, B_RELOAD = 16, B_AIM = 32;
export function movePlayer(p, inp, dt, M) {
  const b = inp.b | 0; let h = p.cr ? CH : PH;
  if (b & B_CROUCH) p.cr = 1; else if (p.cr && !overlap(M, p.x, p.y, p.z, PR, PH)) p.cr = 0; h = p.cr ? CH : PH;
  const yaw = inp.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  let wx = fx * inp.mx + rx * inp.my, wz = fz * inp.mx + rz * inp.my; const wl = Math.hypot(wx, wz); if (wl > 1) { wx /= wl; wz /= wl; }
  const pool = p.y < .3 && inZone(M.pools, p.x, p.z), sp = (p.cr ? 2.7 : b & B_RUN ? 7.6 : 5.4) * (pool ? .6 : 1) * (p.gold > 0 ? 1.12 : 1), k = Math.min(1, dt * (p.g ? 12 : 2.6));
  p.vx += (wx * sp - p.vx) * k; p.vz += (wz * sp - p.vz) * k;
  if (p.g && b & B_JUMP && !p.cr) { p.vy = JUMP * (pool ? .8 : 1); p.g = 0; }
  p.vy -= GRAV * dt; if (p.vy < -30) p.vy = -30;
  let bx = 0, bz = 0; if (p.g) { const bl = M.belts.find(q => p.x > q[0] && p.x < q[2] && p.z > q[1] && p.z < q[3] && Math.abs(p.y - q[6]) < .05); if (bl) { bx = bl[4]; bz = bl[5]; } }
  const wasG = p.g;
  for (const ax of [0, 2]) { const v = (ax ? p.vz : p.vx) + (ax ? bz : bx); if (!v) continue; const old = ax ? p.z : p.x; if (ax) p.z += v * dt; else p.x += v * dt;
    const hit = overlap(M, p.x, p.y, p.z, PR, h); if (!hit) continue;
    if (wasG && hit.b[1] - p.y <= STEP && !overlap(M, p.x, hit.b[1] + .001, p.z, PR, h)) { p.y = hit.b[1] + .001; continue; }
    if (ax) { p.z = v > 0 ? hit.a[2] - PR - .001 : hit.b[2] + PR + .001; if (overlap(M, p.x, p.y, p.z, PR, h)) p.z = old; p.vz = 0; } else { p.x = v > 0 ? hit.a[0] - PR - .001 : hit.b[0] + PR + .001; if (overlap(M, p.x, p.y, p.z, PR, h)) p.x = old; p.vx = 0; } }
  p.y += p.vy * dt; p.g = 0;
  if (p.y <= 0) { p.y = 0; p.vy = 0; p.g = 1; }
  else { const hit = overlap(M, p.x, p.y, p.z, PR, h); if (hit) { if (p.vy <= 0) { p.y = hit.b[1] + .001; p.vy = 0; p.g = 1; } else { p.y = hit.a[1] - h - .001; p.vy = 0; } } else if (p.vy <= 0 && overlap(M, p.x, p.y - .06, p.z, PR, h)) { p.g = 1; p.vy = 0; } }
  const lx = M.W / 2 - PR - .6, lz = M.D / 2 - PR - .6; p.x = Math.max(-lx, Math.min(lx, p.x)); p.z = Math.max(-lz, Math.min(lz, p.z));
  return pool;
}
export const eyeH = p => (p.cr ? CH : PH) - .14;
export const cactusHit = (M, x, y, z) => near(M, x - PR - .15, z - PR - .15, x + PR + .15, z + PR + .15, b => (b.k & 2) && x + PR + .15 > b.a[0] && x - PR - .15 < b.b[0] && z + PR + .15 > b.a[2] && z - PR - .15 < b.b[2] && y < b.b[1] && y + PH > b.a[1]);
