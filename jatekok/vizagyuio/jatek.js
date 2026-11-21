// Vízágyú.io – a hiteles szimuláció (a gazda futtatja; a kliensek a mozgás-előrejelzéshez ugyanezt a movePlayer()-t használják).
export const TICK = 1 / 30, PR = 16, RANGE = 285;
export const MODES = [
  { id: 'ffa', n: 'Mindenki mindenki ellen', d: 'Utolsó száraz játékos nyer. Az aszály szűkíti a pályát.' },
  { id: 'tdm', n: 'Csapatmeccs', d: 'Két csapat, 12 kiütésig vagy 3 percig.', teams: 1 },
  { id: 'kert', n: 'Kertvédés', d: 'Állj be az ellenfél kertjébe, hogy kiszáradjon – a sajátodat tartsd nedvesen.', teams: 1 },
  { id: 'coop', n: 'Szilárd ellen', d: 'Együtt a kaktuszhullámok és Szikkadt Szilárd ellen.', coop: 1 }
];
export const ITEMS = [
  { n: 'Turbó szórófej', ic: '⚡', c: '#ffd84a', t: 8 }, { n: 'Ködölő', ic: '🌫️', c: '#b9c6d6', t: 5 }, { n: 'Nyomásfokozó', ic: '💥', c: '#ff7a6e', t: 8 },
  { n: 'Pajzs-esernyő', ic: '☂️', c: '#6cc6ff', t: 7 }, { n: 'Arany Locsolófej', ic: '🏆', c: '#e8b656', t: 5 }
];
export const COLORS = ['#6cc6ff', '#ff7a6e', '#5ee08a', '#e8b656', '#c79bff', '#ffa94d', '#4dd6c7', '#ff8fc7'];
export const TEAMC = ['#6cc6ff', '#ff7a6e'];
const BOTN = ['Locsi', 'Csepi', 'Slagos', 'Párás Pista', 'Zuhany', 'Tócsa', 'Harmat', 'Öntöző Ödön'];

/* ---------- pályák: w,h; h: sövények [x,y,w,h]; b: fal [x,y,w,h]; c: kaktusz [x,y,r]; p: tócsa [x,y,r]; t: csap [x,y]; s: szórófej [x,y]; l: lejtő [x,y,w,h,ax,ay] ---------- */
const sym = (l, w) => l.concat(l.map(q => { const m = q.slice(); m[0] = w - q[0] - (q.length >= 4 ? q[2] : 0); if (q.length === 6) m[4] = -q[4]; return m; }));
export const MAPS = [
  { id: 'volgy', n: 'Locsolóvölgy', w: 1700, h: 1200, col: ['#2f6b3a', '#285e33', '#3f8a4a'],
    h_: sym([[260, 200, 150, 34], [260, 966, 150, 34], [500, 430, 34, 150], [500, 620, 34, 150], [660, 120, 34, 130], [660, 950, 34, 130], [760, 560, 90, 34]], 1700),
    b: [[835, 520, 30, 160]], c: sym([[380, 600, 20], [640, 330, 18], [640, 870, 18]], 1700), p: sym([[250, 420, 60], [250, 780, 60], [720, 600, 46]], 1700), t: sym([[120, 600], [560, 110], [560, 1090]], 1700), s: [[850, 300], [850, 900]], l: [] },
  { id: 'aszaly', n: 'Aszályföld', w: 1800, h: 1100, col: ['#a8793a', '#96692f', '#c79a52'],
    h_: sym([[330, 300, 120, 30], [330, 770, 120, 30], [610, 500, 30, 100]], 1800), b: sym([[480, 120, 40, 120], [480, 860, 40, 120]], 1800),
    c: sym([[240, 550, 24], [420, 420, 18], [420, 680, 18], [700, 220, 20], [700, 880, 20], [800, 550, 22], [560, 330, 16], [560, 770, 16]], 1800), p: [[900, 550, 70]], t: sym([[110, 160], [110, 940]], 1800).concat([[900, 100], [900, 1000]]), s: [[900, 350], [900, 750]], l: sym([[620, 40, 140, 200, 150, 0], [620, 860, 140, 200, 150, 0]], 1800) },
  { id: 'gyar', n: 'HGWS gyár', w: 1600, h: 1200, col: ['#39424e', '#323a45', '#566373'],
    h_: sym([[420, 560, 30, 80]], 1600), b: sym([[240, 240, 220, 36], [240, 924, 220, 36], [240, 276, 36, 150], [240, 774, 36, 150], [560, 100, 36, 260], [560, 840, 36, 260], [640, 560, 120, 36]], 1600).concat([[782, 380, 36, 130], [782, 690, 36, 130]]),
    c: [], p: sym([[380, 360, 44], [380, 840, 44], [690, 430, 40], [690, 770, 40]], 1600), t: sym([[110, 600], [350, 110], [350, 1090]], 1600), s: sym([[500, 600]], 1600).concat([[800, 600]]), l: sym([[600, 400, 60, 400, 0, 170]], 1600).map((q, i) => { if (i) q[5] = -170; return q; }) },
  { id: 'atemelo', n: 'Átemelőtelep', w: 1900, h: 1100, col: ['#1f5a5e', '#1b4f53', '#2c7a80'],
    h_: sym([[300, 250, 34, 140], [300, 710, 34, 140], [640, 300, 140, 34], [640, 766, 140, 34]], 1900), b: sym([[470, 480, 36, 140], [720, 500, 100, 30], [720, 570, 100, 30]], 1900),
    c: sym([[560, 180, 18], [560, 920, 18]], 1900), p: sym([[200, 550, 80], [600, 550, 50], [860, 200, 60], [860, 900, 60]], 1900), t: sym([[110, 110], [110, 990], [400, 550]], 1900), s: sym([[840, 550]], 1900), l: sym([[130, 380, 260, 60, 0, -140], [130, 660, 260, 60, 0, 140]], 1900) }
];
for (const m of MAPS) { m.hedges = m.h_.slice(0, 32); delete m.h_; }
export const mapOf = id => MAPS.find(m => m.id === id) || MAPS[0];

/* ---------- mozgás (közös a gazdával és az előrejelzéssel) ---------- */
function pushRect(p, x, y, w, h, r) { const cx = Math.max(x, Math.min(x + w, p.x)), cy = Math.max(y, Math.min(y + h, p.y)); let dx = p.x - cx, dy = p.y - cy; const d2 = dx * dx + dy * dy; if (d2 >= r * r) return false;
  if (d2 < 1e-6) { const l = p.x - x, rr = x + w - p.x, t = p.y - y, b = y + h - p.y, m = Math.min(l, rr, t, b); if (m === l) p.x = x - r; else if (m === rr) p.x = x + w + r; else if (m === t) p.y = y - r; else p.y = y + h + r; return true; }
  const d = Math.sqrt(d2), k = (r - d) / d; p.x += dx * k; p.y += dy * k; const nx = dx / d, ny = dy / d, vn = p.vx * nx + p.vy * ny; if (vn < 0) { p.vx -= vn * nx; p.vy -= vn * ny; } return true; }
export function movePlayer(p, inp, dt, M, mask) {
  let mx = inp.mx || 0, my = inp.my || 0; const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
  let wetG = false; for (const q of M.p) if ((p.x - q[0]) ** 2 + (p.y - q[1]) ** 2 < q[2] * q[2]) { wetG = true; break; }
  const acc = wetG ? 420 : 1500, fr = wetG ? .9 : 6.5; p.vx += mx * acc * dt; p.vy += my * acc * dt;
  for (const q of M.l) if (p.x > q[0] && p.x < q[0] + q[2] && p.y > q[1] && p.y < q[1] + q[3]) { p.vx += q[4] * dt * 3; p.vy += q[5] * dt * 3; }
  const k = Math.exp(-fr * dt); p.vx *= k; p.vy *= k; const sp = Math.hypot(p.vx, p.vy), mxs = 330; if (sp > mxs) { p.vx *= mxs / sp; p.vy *= mxs / sp; }
  p.x += p.vx * dt; p.y += p.vy * dt;
  for (const q of M.b) pushRect(p, q[0], q[1], q[2], q[3], PR);
  for (let i = 0; i < M.hedges.length; i++) if (mask >>> i & 1) { const q = M.hedges[i]; pushRect(p, q[0], q[1], q[2], q[3], PR); }
  let hit = -1; for (let i = 0; i < M.c.length; i++) { const q = M.c[i], dx = p.x - q[0], dy = p.y - q[1], d = Math.hypot(dx, dy) || 1, R = q[2] + PR; if (d < R) { p.x = q[0] + dx / d * R; p.y = q[1] + dy / d * R; p.vx = dx / d * 240; p.vy = dy / d * 240; hit = i; } }
  if (p.x < PR) { p.x = PR; p.vx = Math.max(0, p.vx); } if (p.x > M.w - PR) { p.x = M.w - PR; p.vx = Math.min(0, p.vx); } if (p.y < PR) { p.y = PR; p.vy = Math.max(0, p.vy); } if (p.y > M.h - PR) { p.y = M.h - PR; p.vy = Math.min(0, p.vy); }
  return hit;
}
export const blocked = (M, mask, x, y, r) => blockedAt({ M, mask }, x, y, r);
const blockedAt = (W, x, y, r) => { const M = W.M; for (const q of M.b) if (x > q[0] - r && x < q[0] + q[2] + r && y > q[1] - r && y < q[1] + q[3] + r) return 1; for (let i = 0; i < M.hedges.length; i++) if (W.mask >>> i & 1) { const q = M.hedges[i]; if (x > q[0] - r && x < q[0] + q[2] + r && y > q[1] - r && y < q[1] + q[3] + r) return 2 + i; } return 0; };

/* ---------- világ ---------- */
// cfg: { mode, map, slots: [{ uid, name, color, bot }] }  – a slot indexe a játékos azonosítója
export function newWorld(cfg) {
  const M = mapOf(cfg.map), mode = MODES.findIndex(m => m.id === cfg.mode), md = MODES[mode] || MODES[0], n = cfg.slots.length;
  const W = { cfg, M, mode: Math.max(0, mode), md, tick: 0, t: 0, over: 0, P: [], shots: [], hs: [], items: [], en: [], ev: [], mask: M.hedges.length >= 32 ? 0xffffffff : (2 ** M.hedges.length - 1) >>> 0, hhp: M.hedges.map(() => 26),
    zr: Math.hypot(M.w, M.h) / 2, zx: M.w / 2, zy: M.h / 2, score: [0, 0], g: [100, 100], gp: [[170, M.h / 2], [M.w - 170, M.h / 2]], wave: 0, waveT: 4, boss: null, itT: 5, iid: 1, eid: 1, tmax: [240, 180, 240, 0][Math.max(0, mode)], res: null };
  cfg.slots.forEach((s, i) => { const team = md.coop ? 0 : md.teams ? i % 2 : i;
    const p = { slot: i, uid: s.uid, name: s.name || BOTN[i % BOTN.length], color: s.color || COLORS[i % 8], bot: !!s.bot, team, x: 0, y: 0, vx: 0, vy: 0, ang: 0, wet: 0, tank: 100, alive: 1, rsp: 0, cd: 0, dry: 0, fx: [0, 0, 0, 0, 0], inp: { mx: 0, my: 0, ang: 0, fire: 0 }, q: [], ack: 0, score: 0, st: { hits: 0, kos: 0, water: 0, deaths: 0 }, ai: { t: 0, s: 1, stuck: 0, sk: .55 + Math.random() * .35 }, gone: 0 };
    spawn(W, p, i, n); W.P.push(p); });
  return W;
}
function spawn(W, p, i = p.slot, n = W.P.length || 1) { const M = W.M; let x, y;
  if (W.md.teams) { const k = Math.floor(i / 2), side = p.team; x = side ? M.w - 110 : 110; y = M.h / 2 + (k - 1.5) * 90; }
  else if (W.md.coop) { x = M.w / 2 + Math.cos(i * 6.283 / n) * 90; y = M.h / 2 + Math.sin(i * 6.283 / n) * 90; }
  else { const a = i * 6.283 / n + .4, rx = Math.min(M.w / 2 - 110, W.zr - 60), ry = Math.min(M.h / 2 - 110, W.zr - 60); x = W.zx + Math.cos(a) * Math.max(60, rx); y = W.zy + Math.sin(a) * Math.max(60, ry); }
  for (let k = 0; k < 12 && blockedAt(W, x, y, PR + 4); k++) { x += (Math.random() - .5) * 120; y += (Math.random() - .5) * 120; }
  p.x = Math.max(PR, Math.min(M.w - PR, x)); p.y = Math.max(PR, Math.min(M.h - PR, y)); p.vx = p.vy = 0; p.wet = 0; p.tank = 100; p.alive = 1; p.fx.fill(0); p.fx[3] = 1.5; p.ang = Math.atan2(W.zy - p.y, W.zx - p.x); }
const foe = (W, a, b) => a !== b && (W.md.coop ? false : a.team !== b.team);
function hurt(W, p, dmg, by, kx = 0, ky = 0) { if (!p.alive || p.fx[4] > 0 || W.over) return; if (p.fx[3] > 0) { dmg *= .2; kx *= .3; ky *= .3; }
  p.wet += dmg; p.dry = 2.5; p.vx += kx; p.vy += ky;
  if (p.wet >= 100) { p.alive = 0; p.wet = 100; p.st.deaths++; p.rsp = W.mode === 0 ? 1e9 : W.md.coop ? 6 : 3; const k = by != null && W.P[by] && by !== p.slot ? W.P[by] : null;
    if (k) { k.st.kos++; k.score++; if (W.md.teams && W.mode === 1) W.score[k.team]++; } W.ev.push({ e: 'ko', a: k ? k.slot : 255, b: p.slot }); } }
function fire(W, p, dt) { p.cd -= dt; if (!p.inp.fire || !p.alive || p.cd > 0) return; const gold = p.fx[4] > 0; if (!gold && p.tank < 1.1) return;
  p.cd = gold ? .05 : p.fx[0] > 0 ? .055 : .1; if (!gold) { p.tank -= 1.1; p.st.water += 1.1; } const a = p.ang + (Math.random() - .5) * .09, c = Math.cos(a), s = Math.sin(a);
  W.shots.push({ x: p.x + c * (PR + 4), y: p.y + s * (PR + 4), vx: c * 540 + p.vx * .3, vy: s * 540 + p.vy * .3, l: RANGE / 540, o: p.slot, d: gold ? 8 : 3.2, k: p.fx[2] > 0 || gold ? 270 : 85, r: gold ? 9 : 5 }); }
function addEnemy(W, ty, x, y) { if (W.en.length >= 40) return; const n = W.P.filter(p => !p.gone).length, w = W.wave; const e = ty === 2 ? { ty, r: 36, hp: 800 + 250 * n, sp: 48, cd: 2 } : ty === 1 ? { ty, r: 15, hp: 22 + 3 * w, sp: 62, cd: 2 } : { ty, r: 16, hp: 16 + 4 * w, sp: 58 + 4 * w, cd: 0 };
  e.id = W.eid++ & 255; e.x = x; e.y = y; e.max = e.hp; W.en.push(e); if (ty === 2) W.boss = e; }
function edgePt(W) { const M = W.M, k = Math.floor(Math.random() * 4), t = Math.random(); return k === 0 ? [30, 30 + t * (M.h - 60)] : k === 1 ? [M.w - 30, 30 + t * (M.h - 60)] : k === 2 ? [30 + t * (M.w - 60), 30] : [30 + t * (M.w - 60), M.h - 30]; }

export function step(W) {
  const dt = TICK, M = W.M; W.tick++; if (W.over) { W.over += dt; return; } W.t += dt;
  for (const p of W.P) { if (p.gone) continue;
    if (p.bot) think(W, p); else if (p.q.length) { const i = p.q.shift(); p.inp = i; p.ack = i.seq; if (p.q.length > 4) p.q.splice(0, p.q.length - 2); }
    if (!p.alive) { if ((p.rsp -= dt) <= 0) spawn(W, p); continue; }
    p.ang = p.inp.ang; const hit = movePlayer(p, p.inp, dt, M, W.mask); if (hit >= 0) hurt(W, p, 14, null);
    for (let i = 0; i < 5; i++) if (p.fx[i] > 0) p.fx[i] = Math.max(0, p.fx[i] - dt);
    if (p.dry > 0) p.dry -= dt; else p.wet = Math.max(0, p.wet - 3.5 * dt);
    let tap = false; for (const q of M.t) if ((p.x - q[0]) ** 2 + (p.y - q[1]) ** 2 < 50 * 50) tap = true; p.tank = Math.min(100, p.tank + (tap ? 50 : 2) * dt);
    fire(W, p, dt);
    if (W.mode === 0 && Math.hypot(p.x - W.zx, p.y - W.zy) > W.zr) hurt(W, p, 9 * dt, null);
    for (const it of W.items) if (!it.got && (p.x - it.x) ** 2 + (p.y - it.y) ** 2 < 28 * 28) { it.got = 1; p.fx[it.ty] = ITEMS[it.ty].t; if (it.ty === 4) p.wet = Math.max(0, p.wet - 40); W.ev.push({ e: 'item', s: p.slot, t: it.ty }); } }
  // játékosok egymásnak ütközése
  for (let i = 0; i < W.P.length; i++) for (let j = i + 1; j < W.P.length; j++) { const a = W.P[i], b = W.P[j]; if (!a.alive || !b.alive || a.gone || b.gone) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d < PR * 2 && d > .01) { const k = (PR * 2 - d) / d / 2; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; } }
  // vízsugarak
  for (const s of W.shots) { s.l -= dt; s.x += s.vx * dt; s.y += s.vy * dt; if (s.l <= 0) continue; const o = W.P[s.o];
    const bl = blockedAt(W, s.x, s.y, 2); if (bl) { s.l = 0; if (bl >= 2) { const i = bl - 2; if ((W.hhp[i] -= s.d > 10 ? 3 : 1) <= 0) { W.mask = (W.mask & ~(1 << i)) >>> 0; W.ev.push({ e: 'hedge', i }); } } continue; }
    for (const p of W.P) { if (!p.alive || p.gone || p.slot === s.o || (o && !foe(W, o, p))) continue; if ((p.x - s.x) ** 2 + (p.y - s.y) ** 2 < (PR + s.r) ** 2) { const sp = Math.hypot(s.vx, s.vy) || 1; hurt(W, p, s.d, s.o, s.vx / sp * s.k, s.vy / sp * s.k); if (o) o.st.hits++; s.l = 0; break; } }
    if (s.l > 0) for (const e of W.en) if ((e.x - s.x) ** 2 + (e.y - s.y) ** 2 < (e.r + s.r) ** 2) { e.hp -= s.d; if (o) o.st.hits++; const sp = Math.hypot(s.vx, s.vy) || 1; if (e.ty !== 2) { e.x += s.vx / sp * s.k * .04; e.y += s.vy / sp * s.k * .04; } if (e.hp <= 0 && o) { o.st.kos++; o.score++; } s.l = 0; break; } }
  W.shots = W.shots.filter(s => s.l > 0);
  // ellenséges lövedékek (hőgolyók)
  for (const s of W.hs) { s.l -= dt; s.x += s.vx * dt; s.y += s.vy * dt; if (blockedAt(W, s.x, s.y, 3)) s.l = 0; for (const p of W.P) if (p.alive && !p.gone && s.l > 0 && (p.x - s.x) ** 2 + (p.y - s.y) ** 2 < (PR + 7) ** 2) { hurt(W, p, 12, null, s.vx * .25, s.vy * .25); s.l = 0; } }
  W.hs = W.hs.filter(s => s.l > 0 && s.x > 0 && s.y > 0 && s.x < M.w && s.y < M.h);
  // szórófejek: 4 mp-enként körbelocsolnak (meglök és kicsit áztat)
  if (W.tick % 120 === 60) for (const q of M.s) { W.ev.push({ e: 'spr', x: q[0], y: q[1] }); for (const p of W.P) { const dx = p.x - q[0], dy = p.y - q[1], d = Math.hypot(dx, dy) || 1; if (p.alive && !p.gone && d < 150) hurt(W, p, 5, null, dx / d * 330, dy / d * 330); } }
  // tárgyak
  W.items = W.items.filter(i => !i.got); if ((W.itT -= dt) <= 0) { W.itT = 7; if (W.items.length < 5) { for (let k = 0; k < 20; k++) { const x = 80 + Math.random() * (M.w - 160), y = 80 + Math.random() * (M.h - 160); if (blockedAt(W, x, y, 26) || (W.mode === 0 && Math.hypot(x - W.zx, y - W.zy) > W.zr - 40)) continue; W.items.push({ id: W.iid++ & 255, ty: Math.random() < .07 ? 4 : Math.floor(Math.random() * 4), x, y }); break; } } }
  mode(W, dt);
}
function mode(W, dt) { const M = W.M, live = W.P.filter(p => !p.gone), alive = live.filter(p => p.alive);
  if (W.mode === 0) { const R0 = Math.hypot(M.w, M.h) / 2; W.zr = W.t < 15 ? R0 : Math.max(110, R0 - (W.t - 15) * (R0 - 110) / 150);
    if (alive.length <= 1 && live.length > 1) return end(W, alive[0] ? [alive[0].slot] : []); if (live.length === 1 && !alive.length) return end(W, []);
    if (W.t >= W.tmax) { const b = alive.slice().sort((a, c) => a.wet - c.wet)[0]; return end(W, b ? [b.slot] : []); } }
  else if (W.mode === 1) { if (W.score[0] >= 12 || W.score[1] >= 12 || W.t >= W.tmax) return end(W, teamWin(W, W.score[0] === W.score[1] ? -1 : W.score[0] > W.score[1] ? 0 : 1)); }
  else if (W.mode === 2) { for (let t = 0; t < 2; t++) { const [gx, gy] = W.gp[t]; let foes = 0, own = 0; for (const p of alive) if ((p.x - gx) ** 2 + (p.y - gy) ** 2 < 120 * 120) p.team === t ? own++ : foes++; W.g[t] = Math.max(0, Math.min(100, W.g[t] + (foes ? -(1 + 5.5 * foes) : own ? 2.2 * own - .5 : -.5) * dt)); }
    if (W.g[0] <= 0 || W.g[1] <= 0 || W.t >= W.tmax) return end(W, teamWin(W, Math.abs(W.g[0] - W.g[1]) < .01 ? -1 : W.g[0] > W.g[1] ? 0 : 1)); }
  else { // kooperatív
    if (!alive.length && W.t > 2) return end(W, [], 0);
    if (!W.en.length && !W.boss && (W.waveT -= dt) <= 0) { W.wave++; W.waveT = 5; W.ev.push({ e: 'wave', n: W.wave }); if (W.wave >= 5) { addEnemy(W, 2, M.w / 2, 60); for (let i = 0; i < 4; i++) addEnemy(W, 0, ...edgePt(W)); } else { const n = 3 + W.wave * 2 + Math.floor(live.length * 1.5); for (let i = 0; i < n; i++) addEnemy(W, W.wave >= 3 && i % 4 === 3 ? 1 : 0, ...edgePt(W)); } }
    for (const e of W.en) { let t = null, td = 1e9; for (const p of alive) { if (p.fx[1] > 0) continue; const d = Math.hypot(p.x - e.x, p.y - e.y); if (d < td) { td = d; t = p; } } if (!t) continue; const dx = (t.x - e.x) / (td || 1), dy = (t.y - e.y) / (td || 1), keep = e.ty === 1 ? 230 : e.ty === 2 ? 150 : 0, dir = td > keep ? 1 : td < keep - 40 ? -1 : 0;
      const nx = e.x + dx * e.sp * dir * dt, ny = e.y + dy * e.sp * dir * dt; if (!blockedAt(W, nx, e.y, e.r * .6)) e.x = nx; if (!blockedAt(W, e.x, ny, e.r * .6)) e.y = ny;
      if (td < e.r + PR + 2) { hurt(W, t, e.ty === 2 ? 22 : 14, null, dx * 320, dy * 320); if (e.ty === 0) { e.x -= dx * 30; e.y -= dy * 30; } }
      if (e.ty && (e.cd -= dt) <= 0) { if (e.ty === 1) { e.cd = 2.4; W.hs.push({ x: e.x, y: e.y, vx: dx * 250, vy: dy * 250, l: 2.2 }); } else { e.cd = 2.8; const a0 = Math.random() * 6.283; for (let i = 0; i < 10; i++) W.hs.push({ x: e.x, y: e.y, vx: Math.cos(a0 + i * .6283) * 210, vy: Math.sin(a0 + i * .6283) * 210, l: 3 }); if (W.en.length < 12) addEnemy(W, 0, ...edgePt(W)); } } }
    const bossDead = W.boss && W.boss.hp <= 0; W.en = W.en.filter(e => e.hp > 0); if (bossDead) { W.boss = null; return end(W, live.map(p => p.slot), 1); } }
}
const teamWin = (W, t) => t < 0 ? [] : W.P.filter(p => !p.gone && p.team === t).map(p => p.slot);
function end(W, win, boss) { if (W.over) return; W.over = dt0; const pl = W.P.filter(p => !p.gone);
  const mvp = pl.slice().sort((a, b) => (b.st.kos * 3 + b.st.hits * .05 + (win.includes(b.slot) ? 2 : 0)) - (a.st.kos * 3 + a.st.hits * .05 + (win.includes(a.slot) ? 2 : 0)))[0];
  W.res = { e: 'end', win, boss: boss ? 1 : 0, mode: W.md.id, map: W.M.id, t: Math.round(W.t), mvp: mvp ? mvp.slot : -1, score: W.score.slice(), g: W.g.map(Math.round), wave: W.wave,
    pl: pl.map(p => ({ s: p.slot, uid: p.uid, n: p.name, c: p.color, team: p.team, bot: p.bot ? 1 : 0, hits: p.st.hits, kos: p.st.kos, water: Math.round(p.st.water), deaths: p.st.deaths })) }; W.ev.push(W.res); }
const dt0 = 1e-3;

/* ---------- botok ---------- */
function think(W, p) { const a = p.ai, M = W.M, I = p.inp; if (!p.alive) { I.fire = 0; return; }
  let t = null, td = 1e9; for (const q of W.P) { if (!q.alive || q.gone || !foe(W, p, q) || q.fx[1] > 0) continue; const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < td) { td = d; t = q; } }
  if (W.md.coop) for (const e of W.en) { const d = Math.hypot(e.x - p.x, e.y - p.y) - e.r; if (d < td) { td = d; t = e; } }
  if ((a.t -= TICK) <= 0) { a.t = .8 + Math.random() * 1.4; a.s = Math.random() < .5 ? 1 : -1; a.jx = (Math.random() - .5) * 2; a.jy = (Math.random() - .5) * 2; }
  let gx = M.w / 2, gy = M.h / 2, want = 0, near = 0;
  const zd = Math.hypot(p.x - W.zx, p.y - W.zy);
  if (W.mode === 0 && zd > W.zr - 70) { gx = W.zx; gy = W.zy; want = 1; }
  else if (p.tank < 22) { let bd = 1e9; for (const q of M.t) { const d = Math.hypot(q[0] - p.x, q[1] - p.y); if (d < bd && (W.mode !== 0 || Math.hypot(q[0] - W.zx, q[1] - W.zy) < W.zr)) { bd = d; gx = q[0]; gy = q[1]; } } want = 1; near = 20; }
  else { let it = null, idd = 320; for (const q of W.items) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < idd) { idd = d; it = q; } }
    if (it && (!t || td > 150)) { gx = it.x; gy = it.y; want = 1; }
    else if (W.mode === 2 && (p.slot >> 1) % 2 === 0 && (!t || td > 200)) { [gx, gy] = W.gp[1 - p.team]; want = 1; near = 60; }
    else if (W.mode === 2 && W.g[p.team] < 60 && (!t || td > 200)) { [gx, gy] = W.gp[p.team]; want = 1; near = 60; }
    else if (t) { gx = t.x; gy = t.y; } }
  let dx = gx - p.x, dy = gy - p.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d; let mx, my;
  if (want) { const k = d > near ? 1 : 0; mx = dx * k; my = dy * k; } else if (t) { const k = td > 210 ? 1 : td < 120 ? -1 : .15; mx = dx * k - dy * a.s * .8; my = dy * k + dx * a.s * .8; } else { mx = a.jx; my = a.jy; }
  const sp = Math.hypot(p.vx, p.vy); a.stuck = sp < 25 && (mx || my) ? a.stuck + TICK : 0; if (a.stuck > .5) { a.un = .6; a.ux = -dy * a.s + (Math.random() - .5); a.uy = dx * a.s + (Math.random() - .5); a.stuck = 0; } if (a.un > 0) { a.un -= TICK; mx = a.ux; my = a.uy; }
  I.mx = mx; I.my = my;
  if (t) { const lead = td / 540, tx = t.x + (t.vx || 0) * lead * a.sk, ty = t.y + (t.vy || 0) * lead * a.sk; const want2 = Math.atan2(ty - p.y, tx - p.x) + Math.sin(W.t * 2.3 + p.slot) * (1 - a.sk) * .35; let da = want2 - I.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); I.ang += da * Math.min(1, TICK * (5 + 8 * a.sk)); I.fire = td < RANGE - 15 && Math.abs(da) < .5 && p.tank > 2 ? 1 : 0; }
  else { I.fire = 0; if (mx || my) I.ang = Math.atan2(my, mx); } }

/* ---------- bináris pillanatkép ---------- */
const FX = [4, 8, 16, 32, 64];
export function encodeSnap(W) { const pl = W.P.filter(p => !p.gone), b = new ArrayBuffer(24 + pl.length * 14 + W.items.length * 6 + W.en.length * 7 + W.hs.length * 4 + 4), v = new DataView(b); let o = 0;
  v.setUint8(o++, 1); v.setUint32(o, W.tick, true); o += 4; v.setUint8(o++, W.mode | (W.over ? 128 : 0)); v.setUint16(o, Math.max(0, Math.round((W.tmax ? W.tmax - W.t : W.t) * 10)), true); o += 2; v.setUint16(o, Math.round(W.zr), true); o += 2;
  v.setUint8(o++, W.score[0]); v.setUint8(o++, W.score[1]); v.setUint8(o++, Math.round(W.g[0] * 2.55)); v.setUint8(o++, Math.round(W.g[1] * 2.55)); v.setUint8(o++, W.wave); v.setUint8(o++, W.boss ? Math.max(1, Math.round(W.boss.hp / W.boss.max * 255)) : 0); v.setUint32(o, W.mask, true); o += 4;
  v.setUint8(o++, pl.length); for (const p of pl) { let f = (p.alive ? 1 : 0) | (p.inp.fire && p.alive && (p.tank >= 1.1 || p.fx[4] > 0) ? 2 : 0); if (p.fx[1] > 0) f |= 4; if (p.fx[0] > 0) f |= 8; if (p.fx[2] > 0) f |= 16; if (p.fx[3] > 0) f |= 32; if (p.fx[4] > 0) f |= 64; if (p.bot) f |= 128;
    v.setUint8(o++, p.slot); v.setUint8(o++, f); v.setUint16(o, Math.round(p.x * 8), true); o += 2; v.setUint16(o, Math.round(p.y * 8), true); o += 2; v.setInt8(o++, Math.max(-127, Math.min(127, Math.round(p.vx / 3)))); v.setInt8(o++, Math.max(-127, Math.min(127, Math.round(p.vy / 3))));
    v.setUint8(o++, Math.round(((p.ang % 6.2832) + 6.2832) % 6.2832 * 40.58) & 255); v.setUint8(o++, Math.round(p.wet * 2.55)); v.setUint8(o++, Math.round(p.tank * 2.55)); v.setUint8(o++, Math.min(255, p.score)); v.setUint16(o, p.ack & 65535, true); o += 2; }
  v.setUint8(o++, W.items.length); for (const i of W.items) { v.setUint8(o++, i.id); v.setUint8(o++, i.ty); v.setUint16(o, Math.round(i.x * 8), true); o += 2; v.setUint16(o, Math.round(i.y * 8), true); o += 2; }
  v.setUint8(o++, W.en.length); for (const e of W.en) { v.setUint8(o++, e.id); v.setUint8(o++, e.ty); v.setUint16(o, Math.round(Math.max(0, e.x) * 8), true); o += 2; v.setUint16(o, Math.round(Math.max(0, e.y) * 8), true); o += 2; v.setUint8(o++, Math.max(1, Math.round(e.hp / e.max * 255))); }
  const hn = Math.min(255, W.hs.length); v.setUint8(o++, hn); for (let i = 0; i < hn; i++) { const s = W.hs[i]; v.setUint16(o, Math.round(s.x * 8), true); o += 2; v.setUint16(o, Math.round(s.y * 8), true); o += 2; }
  return b.slice(0, o); }
export function decodeSnap(buf) { const v = new DataView(buf); let o = 1; const S = { tick: v.getUint32(o, true) }; o += 4; const m = v.getUint8(o++); S.mode = m & 127; S.over = m >> 7; S.time = v.getUint16(o, true) / 10; o += 2; S.zr = v.getUint16(o, true); o += 2;
  S.score = [v.getUint8(o++), v.getUint8(o++)]; S.g = [v.getUint8(o++) / 2.55, v.getUint8(o++) / 2.55]; S.wave = v.getUint8(o++); S.boss = v.getUint8(o++) / 255; S.mask = v.getUint32(o, true); o += 4; S.P = []; S.items = []; S.en = []; S.hs = [];
  for (let n = v.getUint8(o++); n > 0; n--) { const p = { slot: v.getUint8(o++), f: v.getUint8(o++), x: v.getUint16(o, true) / 8, y: v.getUint16(o + 2, true) / 8 }; o += 4; p.vx = v.getInt8(o++) * 3; p.vy = v.getInt8(o++) * 3; p.ang = v.getUint8(o++) / 40.58; p.wet = v.getUint8(o++) / 2.55; p.tank = v.getUint8(o++) / 2.55; p.score = v.getUint8(o++); p.ack = v.getUint16(o, true); o += 2; p.alive = p.f & 1; S.P.push(p); }
  for (let n = v.getUint8(o++); n > 0; n--) { S.items.push({ id: v.getUint8(o), ty: v.getUint8(o + 1), x: v.getUint16(o + 2, true) / 8, y: v.getUint16(o + 4, true) / 8 }); o += 6; }
  for (let n = v.getUint8(o++); n > 0; n--) { S.en.push({ id: v.getUint8(o), ty: v.getUint8(o + 1), x: v.getUint16(o + 2, true) / 8, y: v.getUint16(o + 4, true) / 8, hp: v.getUint8(o + 6) / 255 }); o += 7; }
  for (let n = v.getUint8(o++); n > 0; n--) { S.hs.push({ x: v.getUint16(o, true) / 8, y: v.getUint16(o + 2, true) / 8 }); o += 4; }
  return S; }
export const encodeInput = i => { const b = new ArrayBuffer(7), v = new DataView(b); v.setUint8(0, 2); v.setUint16(1, i.seq & 65535, true); v.setInt8(3, Math.round(Math.max(-1, Math.min(1, i.mx)) * 127)); v.setInt8(4, Math.round(Math.max(-1, Math.min(1, i.my)) * 127)); v.setUint8(5, Math.round(((i.ang % 6.2832) + 6.2832) % 6.2832 * 40.58) & 255); v.setUint8(6, i.fire ? 1 : 0); return b; };
export const decodeInput = buf => { const v = new DataView(buf); return { seq: v.getUint16(1, true), mx: v.getInt8(3) / 127, my: v.getInt8(4) / 127, ang: v.getUint8(5) / 40.58, fire: v.getUint8(6) & 1 }; };

/* gazdaváltás: az új gazda az utolsó pillanatképből építi újra a világot (a statisztikát a saját eseménynaplójából pótolja) */
export function worldFromSnap(cfg, S, stats = {}) { const W = newWorld(cfg); W.tick = S.tick; W.mask = S.mask; W.zr = S.zr || W.zr; W.score = S.score.slice(); W.g = S.g.slice(); W.wave = S.wave; W.t = W.tmax ? Math.max(0, W.tmax - S.time) : S.time; W.waveT = 3;
  for (const p of W.P) { const s = S.P.find(q => q.slot === p.slot); if (!s) { p.gone = 1; p.alive = 0; continue; } Object.assign(p, { x: s.x, y: s.y, vx: s.vx, vy: s.vy, ang: s.ang, wet: s.wet, tank: s.tank, alive: s.alive, score: s.score, ack: s.ack }); p.inp.ang = s.ang; if (!s.alive) p.rsp = W.mode === 0 ? 1e9 : 3; FX.forEach((b, i) => { if (s.f & b) p.fx[[1, 0, 2, 3, 4][i]] = 3; }); if (stats[p.slot]) Object.assign(p.st, stats[p.slot]); }
  W.items = S.items.map(i => ({ ...i })); W.iid = 200;
  for (const e of S.en) { const n = { id: e.id, ty: e.ty, x: e.x, y: e.y, r: e.ty === 2 ? 36 : 16, sp: e.ty === 2 ? 48 : 60, cd: 2 }; n.max = e.ty === 2 ? 800 + 250 * W.P.length : 20 + 4 * W.wave; n.hp = n.max * e.hp; W.en.push(n); if (e.ty === 2) W.boss = n; } W.eid = 128;
  return W; }
