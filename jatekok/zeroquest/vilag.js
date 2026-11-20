/* ZERO QUEST – világ: terep, utak, folyó, tereptárgyak, ütközés, a talaj kirajzolása */
'use strict';
const WW = 4800, WH = 3600, TAU = Math.PI * 2, hyp = Math.hypot;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function rnd(a, b, c = 0) { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function noise(x, y) { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return lerp(lerp(rnd(ix, iy, 7), rnd(ix + 1, iy, 7), u), lerp(rnd(ix, iy + 1, 7), rnd(ix + 1, iy + 1, 7), u), v); }
/* Catmull–Rom-simítás: az utak és a folyó ugyanazon a sűrű vonalon rajzolódnak és ütköznek */
function smooth(p, step = 22) { const o = []; for (let i = 0; i < p.length - 1; i++) { const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], d = p[Math.min(p.length - 1, i + 2)], n = Math.max(2, Math.ceil(hyp(c[0] - b[0], c[1] - b[1]) / step));
  for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; o.push([.5 * (2 * b[0] + (c[0] - a[0]) * t + (2 * a[0] - 5 * b[0] + 4 * c[0] - d[0]) * t2 + (3 * b[0] - a[0] - 3 * c[0] + d[0]) * t3), .5 * (2 * b[1] + (c[1] - a[1]) * t + (2 * a[1] - 5 * b[1] + 4 * c[1] - d[1]) * t2 + (3 * b[1] - a[1] - 3 * c[1] + d[1]) * t3)]); } } o.push(p[p.length - 1]); return o; }
function polyD(pts, x, y) { let bd = 1e9, bx = 0, by = 0; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1), 0, 1), cx = a[0] + dx * t, cy = a[1] + dy * t, d = hyp(x - cx, y - cy); if (d < bd) { bd = d; bx = cx; by = cy; } } return [bd, bx, by]; }

const VILLAGE = [1200, 1900], CAMP = [3600, 800], RUIN = [4300, 2080], ARENA_R = 330, RIV_W = 70;
const ROADS = [
  [[-40, 1900], [500, 1915], [900, 1895], [1200, 1900], [1700, 1880], [2100, 1900], [2500, 1905], [3000, 1850], [3500, 1960], [3880, 2060], [3990, 2080]],
  [[1200, 1900], [1160, 2300], [940, 2640], [700, 2900]],
  [[3000, 1850], [3130, 1500], [3390, 1100], [3600, 850]],
  [[1200, 1900], [1250, 1600], [1300, 1340]]
].map(r => smooth(r));
const RIVER = smooth([[2150, -80], [2050, 500], [2200, 1000], [2080, 1500], [2100, 1900], [2180, 2400], [2050, 2900], [2150, 3700]]);
const BRIDGE = { x: 2100, y: 1900, w: 250, h: 86 };
const FIRES = [[1330, 1840], [2880, 1960], [3860, 2170]];
const roadD = (x, y) => { let d = 1e9; for (const r of ROADS) d = Math.min(d, polyD(r, x, y)[0]); return d; };
const onBridge = (x, y) => Math.abs(x - BRIDGE.x) < BRIDGE.w / 2 && Math.abs(y - BRIDGE.y) < BRIDGE.h / 2 - 8;

function biomeW(x, y) { const n = noise(x / 260, y / 260), f0 = sstep(2260, 2520, x + (n - .5) * 280) * (1 - sstep(3740, 3960, x + (n - .5) * 220));
  const ru = 1 - sstep(400, 640, hyp(x - RUIN[0], y - RUIN[1])), ca = 1 - sstep(210, 340, hyp(x - CAMP[0], y - CAMP[1])), vi = 1 - sstep(340, 540, hyp(x - VILLAGE[0], y - VILLAGE[1]));
  return { f: f0 * (1 - ru) * (1 - ca), ru, ca, vi }; }
function groundRGB(x, y) { const w = biomeW(x, y); let r = 98, g = 152, b = 72; const mix = (R, G, B, t) => { r = lerp(r, R, t); g = lerp(g, G, t); b = lerp(b, B, t); };
  mix(116, 168, 84, w.vi * .8); mix(56, 108, 60, w.f); mix(142, 118, 82, w.ca); mix(126, 134, 120, w.ru * .85);
  const k = .9 + .18 * noise(x / 95, y / 95); return [r * k | 0, g * k | 0, b * k | 0]; }

/* ---------- tereptárgyak ---------- */
const OBJ = [], GRID = new Map(), GC = 128, gk = (x, y) => (x + 64) * 4096 + y + 64;
function addO(o) { OBJ.push(o); const x0 = o.w ? o.x - o.w / 2 : o.x - o.r, x1 = o.w ? o.x + o.w / 2 : o.x + o.r, y0 = o.w ? o.y - o.d : o.y - o.r, y1 = o.w ? o.y : o.y + o.r;
  for (let gx = Math.floor(x0 / GC); gx <= Math.floor(x1 / GC); gx++) for (let gy = Math.floor(y0 / GC); gy <= Math.floor(y1 / GC); gy++) { const k = gk(gx, gy); let l = GRID.get(k); if (!l) GRID.set(k, l = []); l.push(o); } return o; }
function near(x, y, r, fn) { for (let gx = Math.floor((x - r) / GC); gx <= Math.floor((x + r) / GC); gx++) for (let gy = Math.floor((y - r) / GC); gy <= Math.floor((y + r) / GC); gy++) { const l = GRID.get(gk(gx, gy)); if (l) for (const o of l) fn(o); } }
/* kör kitolása a szilárd tárgyakból, a folyóból és a pálya széléről */
function collide(e, r) { for (let it = 0; it < 2; it++) near(e.x, e.y, r + 4, o => { if (!o.solid || o.off) return;
    if (o.w) { const cx = clamp(e.x, o.x - o.w / 2, o.x + o.w / 2), cy = clamp(e.y, o.y - o.d, o.y), dx = e.x - cx, dy = e.y - cy, d = hyp(dx, dy); if (d < r) { if (d < .01) { e.y = o.y + r; } else { e.x = cx + dx / d * r; e.y = cy + dy / d * r; } } }
    else { const dx = e.x - o.x, dy = e.y - o.y, d = hyp(dx, dy), m = r + o.r; if (d < m && d > .01) { e.x = o.x + dx / d * m; e.y = o.y + dy / d * m; } } });
  if (!onBridge(e.x, e.y)) { const q = polyD(RIVER, e.x, e.y), m = RIV_W - 6 + r * .4; if (q[0] < m) { const d = q[0] || 1; e.x = q[1] + (e.x - q[1]) / d * m; e.y = q[2] + (e.y - q[2]) / d * m; } }
  e.x = clamp(e.x, 30, WW - 30); e.y = clamp(e.y, 40, WH - 30); }
let GATE = null, BOSSWALL = null;
const CLEAR = [...FIRES.map(f => [f[0], f[1], 120]), [1300, 1300, 150], [3300, 2620, 110], [3690, 740, 80], [2700, 1500, 90], [3350, 2250, 90]];
function buildWorld() {
  const H = (x, y, w, d, roof, o = {}) => addO({ t: 'house', x, y, w, d, roof, solid: 1, ...o });
  H(1050, 1700, 210, 96, '#a5533f', { big: 1 }); H(1450, 1700, 190, 90, '#5d6470', { smith: 1 }); H(930, 2070, 180, 90, '#3f7f86', { shop: 1 }); H(1500, 2090, 170, 86, '#a5533f'); H(760, 1740, 170, 86, '#8a6a3c'); H(1690, 1730, 160, 84, '#8a6a3c'); H(700, 2080, 160, 84, '#a5533f');
  addO({ t: 'well', x: 1280, y: 2010, r: 26, solid: 1 }); addO({ t: 'anvil', x: 1560, y: 1760, r: 14, solid: 1 }); addO({ t: 'stall', x: 1040, y: 2110, r: 26, solid: 1 });
  for (const [x, y] of [[1130, 1760], [880, 1800], [1620, 2130], [820, 2110], [1380, 2120]]) addO({ t: 'crate', x, y, r: 15, solid: 1 });
  FIRES.forEach((f, i) => addO({ t: 'fire', x: f[0], y: f[1], r: 16, solid: 1, i }));
  addO({ t: 'chest', id: 'c1', x: 1300, y: 1290, r: 18, solid: 1 }); addO({ t: 'chest', id: 'c2', x: 3300, y: 2610, r: 18, solid: 1 }); addO({ t: 'chest', id: 'c3', x: 3700, y: 730, r: 18, solid: 1 });
  for (const [x, y] of [[1220, 1250], [1380, 1250], [1200, 1340], [1400, 1340]]) addO({ t: 'pillar', x, y, r: 20, solid: 1, broken: rnd(x, y, 3) > .5 });
  for (const [x, y] of [[3500, 720], [3720, 860], [3520, 900], [3660, 640]]) addO({ t: 'tent', x, y, r: 40, solid: 1 });
  for (const [x, y] of [[3600, 730], [3760, 760], [3450, 820]]) addO({ t: 'crate', x, y, r: 15, solid: 1 });
  addO({ t: 'fire', x: 3610, y: 810, r: 16, solid: 1, i: -1 });
  /* a romok arénája: oszlopgyűrű, nyugaton kapuval */
  const N = 44; for (let k = 0; k < N; k++) { const a = k / N * TAU, da = Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))); if (da < .17) continue; addO({ t: 'pillar', x: RUIN[0] + Math.cos(a) * ARENA_R, y: RUIN[1] + Math.sin(a) * ARENA_R, r: 25, solid: 1, tall: 1, broken: rnd(k, 5, 9) > .7 }); }
  GATE = addO({ t: 'gate', x: RUIN[0] - ARENA_R, y: RUIN[1], r: 50, solid: 1 });
  for (let k = 0; k < 26; k++) { const a = rnd(k, 1, 4) * TAU, d = ARENA_R + 70 + rnd(k, 2, 4) * 260, x = RUIN[0] + Math.cos(a) * d, y = RUIN[1] + Math.sin(a) * d; if (roadD(x, y) < 70 || x > WW - 60) continue; addO({ t: 'pillar', x, y, r: 20, solid: 1, broken: rnd(k, 3, 4) > .35 }); }
  /* fák, sziklák, bokrok */
  for (let gx = 0; gx * 58 < WW; gx++) for (let gy = 0; gy * 58 < WH; gy++) { const x = gx * 58 + rnd(gx, gy, 1) * 50, y = gy * 58 + rnd(gx, gy, 2) * 50, w = biomeW(x, y), p = rnd(gx, gy, 3);
    if (roadD(x, y) < 74 || polyD(RIVER, x, y)[0] < RIV_W + 46 || w.ca > .3 || hyp(x - RUIN[0], y - RUIN[1]) < ARENA_R + 50 || CLEAR.some(c => hyp(x - c[0], y - c[1]) < c[2])) continue;
    let hit = 0; near(x, y, 60, o => { if (o.w ? Math.abs(x - o.x) < o.w / 2 + 50 && y > o.y - o.d - 90 && y < o.y + 50 : hyp(x - o.x, y - o.y) < o.r + 70) hit = 1; }); if (hit) continue;
    const tp = w.vi > .25 ? .05 : w.ru > .4 ? .06 : lerp(.045, .27, w.f);
    if (p < tp) addO({ t: 'tree', v: w.ru > .4 ? 4 : w.f > .5 ? (rnd(gx, gy, 4) < .45 ? 3 : rnd(gx, gy, 4) < .75 ? 1 : 0) : (rnd(gx, gy, 4) < .5 ? 0 : 2), x, y, r: 13, s: .85 + rnd(gx, gy, 5) * .5, solid: 1 });
    else if (p < tp + (w.ru > .3 ? .07 : .014)) addO({ t: 'rock', x, y, r: 15 + rnd(gx, gy, 6) * 11, v: rnd(gx, gy, 8), solid: 1 });
    else if (p < tp + .07 && w.vi < .5) addO({ t: 'bush', x, y, r: 16, v: rnd(gx, gy, 8) }); }
}
const viewObjs = (x0, y0, x1, y1, out) => { const seen = new Set(); for (let gx = Math.floor((x0 - 120) / GC); gx <= Math.floor((x1 + 120) / GC); gx++) for (let gy = Math.floor((y0 - 60) / GC); gy <= Math.floor((y1 + 220) / GC); gy++) { const l = GRID.get(gk(gx, gy)); if (l) for (const o of l) if (!seen.has(o)) { seen.add(o); out.push(o); } } };

/* ---------- a talaj kirajzolása (csempénként gyorsítótárazva) ---------- */
function line(c, pts, w, col) { c.strokeStyle = col; c.lineWidth = w; c.lineJoin = c.lineCap = 'round'; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); }
function paintChunk(c, x0, y0, S) { const st = 32;
  for (let x = x0; x < x0 + S; x += st) for (let y = y0; y < y0 + S; y += st) { const g = groundRGB(x + st / 2, y + st / 2); c.fillStyle = `rgb(${g[0]},${g[1]},${g[2]})`; c.fillRect(x, y, st + 1, st + 1); }
  for (let x = x0 - st; x < x0 + S + st; x += st) for (let y = y0 - st; y < y0 + S + st; y += st) { const ix = x / st, iy = y / st, w = biomeW(x, y), px = x + rnd(ix, iy, 11) * st, py = y + rnd(ix, iy, 12) * st, q = rnd(ix, iy, 13);
    /* lágy foltok, hogy ne látsszon a rács */
    c.fillStyle = q < .5 ? 'rgba(255,255,220,.05)' : 'rgba(0,30,10,.07)'; c.beginPath(); c.ellipse(px, py, 30 + q * 40, 20 + q * 26, q * 3, 0, TAU); c.fill();
    if (w.ru > .45) { if (q < .42) { c.fillStyle = `rgba(${170 + q * 60 | 0},${172 + q * 60 | 0},${160 + q * 50 | 0},.34)`; c.beginPath(); c.roundRect(px - 16, py - 11, 30 + q * 20, 20 + q * 12, 5); c.fill(); c.strokeStyle = 'rgba(40,46,40,.25)'; c.lineWidth = 1.2; c.stroke(); } }
    else if (w.ca < .4) { c.lineCap = 'round'; for (let k = 0; k < 3; k++) { const tx = x + rnd(ix, iy, 20 + k) * st, ty = y + rnd(ix, iy, 30 + k) * st, l = 5 + rnd(ix, iy, 40 + k) * 6; c.strokeStyle = k & 1 ? 'rgba(190,230,130,.32)' : 'rgba(20,60,24,.3)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(tx - 3, ty); c.lineTo(tx - 4, ty - l); c.moveTo(tx, ty); c.lineTo(tx, ty - l - 2); c.moveTo(tx + 3, ty); c.lineTo(tx + 5, ty - l); c.stroke(); }
      if (q > .86 - (1 - w.f) * .1 && w.f < .6) { const col = ['#fff3c9', '#ffd35a', '#ff9ec4', '#bfe0ff'][(q * 97 | 0) % 4]; for (let k = 0; k < 3; k++) { const fx = px + (rnd(ix, iy, 50 + k) - .5) * 22, fy = py + (rnd(ix, iy, 60 + k) - .5) * 16; c.fillStyle = col; c.beginPath(); c.arc(fx, fy, 3, 0, TAU); c.fill(); c.fillStyle = '#e0892b'; c.beginPath(); c.arc(fx, fy, 1.1, 0, TAU); c.fill(); } }
      if (w.f > .5 && q < .2) { c.fillStyle = 'rgba(96,70,36,.35)'; c.beginPath(); c.ellipse(px, py, 5, 3, q * 9, 0, TAU); c.fill(); } }
    else if (q < .3) { c.fillStyle = 'rgba(60,44,26,.3)'; c.beginPath(); c.arc(px, py, 2 + q * 5, 0, TAU); c.fill(); } }
  for (const r of ROADS) line(c, r, 74, 'rgba(70,58,36,.28)'); for (const r of ROADS) line(c, r, 58, '#b59a6c'); for (const r of ROADS) line(c, r, 40, '#c4aa7b');
  for (const r of ROADS) for (let i = 0; i < r.length; i += 2) { const p = r[i], q = rnd(p[0], p[1], 5); c.fillStyle = q < .5 ? 'rgba(90,70,44,.3)' : 'rgba(235,215,170,.35)'; c.beginPath(); c.ellipse(p[0] + (q - .5) * 40, p[1] + (rnd(p[0], p[1], 6) - .5) * 40, 2 + q * 4, 1.5 + q * 2, q * 7, 0, TAU); c.fill(); }
  line(c, RIVER, RIV_W * 2 + 44, '#7d7a55'); line(c, RIVER, RIV_W * 2 + 18, '#a39a6c'); line(c, RIVER, RIV_W * 2, '#2b6792'); line(c, RIVER, RIV_W * 2 - 34, '#3380b3'); line(c, RIVER, RIV_W * 2 - 86, '#4a9bcb');
  /* híd */
  const B = BRIDGE, bx = B.x - B.w / 2, by = B.y - B.h / 2; c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(bx + 6, by + 10, B.w, B.h); c.fillStyle = '#7a5a36'; c.fillRect(bx, by, B.w, B.h);
  for (let x = bx; x < bx + B.w; x += 18) { c.fillStyle = (x / 18 | 0) & 1 ? '#8b6840' : '#94703f'; c.fillRect(x + 1, by + 2, 16, B.h - 4); } c.fillStyle = '#4d351d'; c.fillRect(bx - 6, by - 5, B.w + 12, 9); c.fillRect(bx - 6, by + B.h - 4, B.w + 12, 9);
  for (let x = bx - 2; x <= bx + B.w; x += B.w / 4) { c.fillStyle = '#3a2816'; c.beginPath(); c.arc(x, by - 1, 7, 0, TAU); c.arc(x, by + B.h + 1, 7, 0, TAU); c.fill(); } }

/* ---------- tereptárgyak rajza ---------- */
const TREE_PAL = [['#2f6b34', '#3f8a3f', '#62ad52'], ['#27592f', '#357a3a', '#4f9a4a'], ['#4d7f2e', '#6aa13c', '#93c45a'], ['#1f4a33', '#2b6443', '#3f8257'], ['#5a5348', '#6d6659', '#857d6c']];
function paintTree(c, v) { const P = TREE_PAL[v]; c.fillStyle = 'rgba(0,0,0,.26)'; c.beginPath(); c.ellipse(10, 2, 46, 17, 0, 0, TAU); c.fill();
  const tg = c.createLinearGradient(-7, 0, 7, 0); tg.addColorStop(0, '#4b3320'); tg.addColorStop(.5, '#7a5633'); tg.addColorStop(1, '#3c2817'); c.fillStyle = tg; c.beginPath(); c.moveTo(-8, 2); c.lineTo(-5, -46); c.lineTo(5, -46); c.lineTo(8, 2); c.fill();
  if (v === 4) { c.strokeStyle = '#5a4630'; c.lineWidth = 5; c.lineCap = 'round'; for (const [a, l] of [[-2.2, 44], [-1.3, 50], [-.7, 38], [-1.75, 62]]) { c.beginPath(); c.moveTo(0, -42); c.lineTo(Math.cos(a) * l, -42 + Math.sin(a) * l); c.stroke(); } return; }
  if (v === 3) { for (let k = 0; k < 4; k++) { const y = -34 - k * 27, w = 46 - k * 9; for (const [col, dx] of [[P[0], 0], [P[1], -4]]) { c.fillStyle = col; c.beginPath(); c.moveTo(-w + dx, y); c.quadraticCurveTo(dx, y + 10, w + dx * .4, y); c.lineTo(dx * .5, y - 44); c.fill(); } c.fillStyle = P[2]; c.globalAlpha = .5; c.beginPath(); c.moveTo(-w * .7, y - 4); c.lineTo(-2, y - 40); c.lineTo(-w * .2, y - 6); c.fill(); c.globalAlpha = 1; } return; }
  const B = [[0, -78, 46], [-30, -60, 32], [30, -62, 34], [-4, -108, 34], [18, -92, 30]];
  c.fillStyle = 'rgba(10,30,14,.55)'; for (const [x, y, r] of B) { c.beginPath(); c.arc(x, y + 3, r + 2.5, 0, TAU); c.fill(); }
  c.fillStyle = P[0]; for (const [x, y, r] of B) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  c.fillStyle = P[1]; for (const [x, y, r] of B) { c.beginPath(); c.arc(x - 5, y - 6, r * .8, 0, TAU); c.fill(); }
  c.fillStyle = P[2]; for (const [x, y, r] of B) { c.globalAlpha = .75; c.beginPath(); c.arc(x - 10, y - 13, r * .45, 0, TAU); c.fill(); } c.globalAlpha = .5;
  for (let k = 0; k < 14; k++) { const b = B[k % 5], a = rnd(k, v, 70) * TAU, d = rnd(k, v, 71) * b[2] * .8; c.beginPath(); c.ellipse(b[0] + Math.cos(a) * d, b[1] + Math.sin(a) * d, 5, 3, a, 0, TAU); c.fill(); } c.globalAlpha = 1; }
function paintRock(c, v) { c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(5, 3, 30, 11, 0, 0, TAU); c.fill(); const n = 8, pts = []; for (let k = 0; k < n; k++) { const a = k / n * TAU, r = 20 + rnd(k, v * 99 | 0, 80) * 9; pts.push([Math.cos(a) * r * 1.15, -12 + Math.sin(a) * r * .8]); }
  const g = c.createLinearGradient(-20, -34, 20, 8); g.addColorStop(0, '#a9aca4'); g.addColorStop(1, '#5b5f5c'); c.fillStyle = g; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill(); c.strokeStyle = 'rgba(30,34,32,.6)'; c.lineWidth = 2; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.moveTo(pts[5][0], pts[5][1]); c.lineTo(pts[6][0], pts[6][1]); c.lineTo(pts[7][0] - 4, pts[7][1] + 3); c.lineTo(-2, -14); c.fill(); c.fillStyle = 'rgba(90,130,70,.5)'; c.beginPath(); c.ellipse(-8, -2, 9, 3, 0, 0, TAU); c.fill(); }
function paintBush(c, v) { c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(4, 3, 24, 8, 0, 0, TAU); c.fill(); for (const [col, o] of [['#2c6a33', 0], ['#3d8a40', -3], ['#5aa84e', -6]]) { c.fillStyle = col; for (const [x, y, r] of [[-11, -8, 13], [10, -9, 14], [0, -16, 14]]) { c.beginPath(); c.arc(x + o * .6, y + o, r - Math.abs(o) * .8, 0, TAU); c.fill(); } }
  if (v > .5) { c.fillStyle = '#d2473f'; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(-14 + rnd(k, 1, 90) * 28, -22 + rnd(k, 2, 90) * 18, 2.3, 0, TAU); c.fill(); } } }
function drawHouse(c, o, t) { const w = o.w, x = o.x - w / 2, y = o.y, wh = 50, rd = o.d * .95 + 30, ry = y - wh - rd;
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.moveTo(x + 6, y + 8); c.lineTo(x + w + 26, y + 8); c.lineTo(x + w + 26, y - wh - rd * .5); c.lineTo(x + w, y - wh); c.fill();
  const wg = c.createLinearGradient(0, y - wh, 0, y); wg.addColorStop(0, '#cdbf9f'); wg.addColorStop(1, '#e6dcc0'); c.fillStyle = wg; c.fillRect(x, y - wh, w, wh); c.fillStyle = '#7b7566'; c.fillRect(x, y - 9, w, 9);
  c.fillStyle = '#5b4028'; for (let k = 0; k <= 4; k++) c.fillRect(x + k * (w - 6) / 4, y - wh, 6, wh - 9); c.fillRect(x, y - wh, w, 5);
  c.fillStyle = '#4a321d'; c.beginPath(); c.roundRect(o.x - 13, y - 38, 26, 38, [10, 10, 0, 0]); c.fill(); c.fillStyle = '#e8b656'; c.beginPath(); c.arc(o.x + 7, y - 17, 2, 0, TAU); c.fill();
  for (const dx of [-w * .3, w * .3]) { c.fillStyle = '#3b2a1a'; c.fillRect(o.x + dx - 13, y - 37, 26, 22); c.fillStyle = `rgba(255,${196 + 20 * Math.sin(t * 3 + dx) | 0},110,.92)`; c.fillRect(o.x + dx - 10, y - 34, 20, 16); c.fillStyle = '#3b2a1a'; c.fillRect(o.x + dx - 1, y - 34, 2, 16); c.fillRect(o.x + dx - 10, y - 27, 20, 2); }
  /* tető: két lejtő, zsindelysorokkal */
  const rx = x - 14, rw = w + 28; c.fillStyle = o.roof; c.fillRect(rx, ry, rw, rd + 8); c.fillStyle = 'rgba(0,0,0,.26)'; c.fillRect(rx, ry, rw, rd * .42); c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(rx, ry + rd * .42, rw, 5);
  c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 1.5; for (let k = 1; k < 7; k++) { const yy = ry + k * (rd + 8) / 7; c.beginPath(); c.moveTo(rx, yy); c.lineTo(rx + rw, yy); c.stroke(); for (let q = (k & 1) * 12; q < rw; q += 24) { c.beginPath(); c.moveTo(rx + q, yy); c.lineTo(rx + q, yy - (rd + 8) / 7); c.stroke(); } }
  c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(rx, ry + rd + 4, rw, 5); c.strokeStyle = 'rgba(20,14,8,.6)'; c.lineWidth = 2; c.strokeRect(rx, ry, rw, rd + 8);
  c.fillStyle = '#6a6259'; c.fillRect(x + w * .68, ry - 16, 22, 30); c.fillStyle = '#4b453e'; c.fillRect(x + w * .68 - 3, ry - 20, 28, 7);
  for (let k = 0; k < 3; k++) { const a = (t * .35 + k / 3) % 1; c.fillStyle = `rgba(230,230,230,${.22 * (1 - a)})`; c.beginPath(); c.arc(x + w * .68 + 11 + Math.sin(t + k * 2) * 6 * a + a * 14, ry - 24 - a * 60, 7 + a * 12, 0, TAU); c.fill(); }
  if (o.smith) { c.fillStyle = '#2a2623'; c.fillRect(x + w - 44, y - wh - 22, 34, 18); c.fillStyle = '#c9c9c9'; c.font = '700 15px Georgia'; c.textAlign = 'center'; c.fillText('⚒', x + w - 27, y - wh - 8); }
  if (o.shop) { c.fillStyle = '#2a2623'; c.fillRect(x + 10, y - wh - 22, 34, 18); c.fillStyle = '#e8b656'; c.font = '700 14px Georgia'; c.textAlign = 'center'; c.fillText('⚖', x + 27, y - wh - 8); } }
function drawPillar(c, o) { const h = o.tall ? (o.broken ? 44 : 78) : (o.broken ? 22 : 54), r = o.r; c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(o.x + 8, o.y + 3, r + 8, r * .45, 0, 0, TAU); c.fill();
  const g = c.createLinearGradient(o.x - r, 0, o.x + r, 0); g.addColorStop(0, '#6f736b'); g.addColorStop(.45, '#b9bcb0'); g.addColorStop(1, '#55584f'); c.fillStyle = g; c.fillRect(o.x - r, o.y - h, r * 2, h); c.beginPath(); c.ellipse(o.x, o.y, r, r * .42, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(40,44,38,.35)'; c.lineWidth = 1.5; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(o.x + k * r * .36, o.y - h + 4); c.lineTo(o.x + k * r * .36, o.y + 4); c.stroke(); }
  c.fillStyle = o.broken ? '#8d9086' : '#cfd2c5'; c.beginPath(); if (o.broken) { c.moveTo(o.x - r, o.y - h); c.lineTo(o.x - r * .3, o.y - h - 9); c.lineTo(o.x + r * .2, o.y - h + 3); c.lineTo(o.x + r, o.y - h - 5); c.lineTo(o.x + r, o.y - h + 6); c.lineTo(o.x - r, o.y - h + 6); } else c.ellipse(o.x, o.y - h, r + 3, r * .46, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(86,130,70,.5)'; c.beginPath(); c.ellipse(o.x - r * .3, o.y - 2, r * .6, 4, 0, 0, TAU); c.fill(); }
function drawProp(c, o, t, st) { const x = o.x, y = o.y;
  if (o.t === 'well') { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x + 6, y + 4, 34, 13, 0, 0, TAU); c.fill(); c.fillStyle = '#7f8278'; c.beginPath(); c.ellipse(x, y - 8, 28, 13, 0, 0, TAU); c.fill(); c.fillRect(x - 28, y - 8, 56, 12); c.beginPath(); c.ellipse(x, y + 4, 28, 13, 0, 0, Math.PI); c.fill(); c.fillStyle = '#1d3f58'; c.beginPath(); c.ellipse(x, y - 8, 21, 9, 0, 0, TAU); c.fill(); c.fillStyle = '#5b4028'; c.fillRect(x - 27, y - 62, 5, 56); c.fillRect(x + 22, y - 62, 5, 56); c.fillStyle = '#8a4a36'; c.beginPath(); c.moveTo(x - 36, y - 58); c.lineTo(x, y - 82); c.lineTo(x + 36, y - 58); c.fill(); }
  else if (o.t === 'anvil') { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x + 3, y + 2, 20, 7, 0, 0, TAU); c.fill(); c.fillStyle = '#6b4a2c'; c.fillRect(x - 10, y - 14, 20, 14); c.fillStyle = '#3d4046'; c.beginPath(); c.moveTo(x - 20, y - 26); c.lineTo(x + 14, y - 26); c.lineTo(x + 24, y - 20); c.lineTo(x + 8, y - 14); c.lineTo(x - 12, y - 14); c.fill(); c.fillStyle = '#7d828b'; c.fillRect(x - 18, y - 27, 30, 3); }
  else if (o.t === 'stall') { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x + 5, y + 3, 40, 10, 0, 0, TAU); c.fill(); c.fillStyle = '#7a5a36'; c.fillRect(x - 34, y - 24, 68, 24); c.fillStyle = '#5b4028'; c.fillRect(x - 36, y - 70, 5, 70); c.fillRect(x + 31, y - 70, 5, 70); for (let k = 0; k < 6; k++) { c.fillStyle = k & 1 ? '#e9e2d0' : '#c2463b'; c.fillRect(x - 40 + k * 13.4, y - 78, 13.4, 20); } for (const [dx, col] of [[-20, '#d2473f'], [-4, '#e8b656'], [12, '#6cc6ff']]) { c.fillStyle = col; c.beginPath(); c.arc(x + dx, y - 28, 6, 0, TAU); c.fill(); } }
  else if (o.t === 'crate') { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x + 4, y + 2, 20, 7, 0, 0, TAU); c.fill(); c.fillStyle = '#8d6b41'; c.fillRect(x - 15, y - 26, 30, 28); c.fillStyle = '#a5804f'; c.fillRect(x - 15, y - 32, 30, 8); c.strokeStyle = '#4d351d'; c.lineWidth = 2; c.strokeRect(x - 15, y - 26, 30, 28); c.beginPath(); c.moveTo(x - 15, y - 26); c.lineTo(x + 15, y + 2); c.stroke(); }
  else if (o.t === 'tent') { c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(x + 8, y + 4, 52, 16, 0, 0, TAU); c.fill(); c.fillStyle = '#6d5a42'; c.beginPath(); c.moveTo(x - 48, y + 4); c.lineTo(x, y - 76); c.lineTo(x + 48, y + 4); c.fill(); c.fillStyle = '#8b7556'; c.beginPath(); c.moveTo(x - 48, y + 4); c.lineTo(x, y - 76); c.lineTo(x - 8, y + 4); c.fill(); c.fillStyle = '#1c1611'; c.beginPath(); c.moveTo(x - 10, y + 4); c.lineTo(x + 2, y - 40); c.lineTo(x + 16, y + 4); c.fill(); c.fillStyle = '#7a2f2a'; c.beginPath(); c.moveTo(x, y - 76); c.lineTo(x + 22, y - 84); c.lineTo(x, y - 90); c.fill(); }
  else if (o.t === 'fire') { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x, y + 2, 26, 9, 0, 0, TAU); c.fill(); c.fillStyle = '#6f736b'; for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; c.beginPath(); c.ellipse(x + Math.cos(a) * 20, y - 3 + Math.sin(a) * 8, 6, 4.5, 0, 0, TAU); c.fill(); } c.strokeStyle = '#4b3320'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 12, y - 1); c.lineTo(x + 10, y - 9); c.moveTo(x + 12, y - 1); c.lineTo(x - 10, y - 9); c.stroke();
    for (let k = 0; k < 3; k++) { const f = Math.sin(t * (9 + k * 3) + k) * .5 + .5, h = 30 + f * 14 - k * 8; c.fillStyle = ['rgba(255,120,40,.9)', 'rgba(255,190,70,.9)', 'rgba(255,245,200,.9)'][k]; c.beginPath(); c.moveTo(x - 11 + k * 3, y - 6); c.quadraticCurveTo(x - 14 + k * 4 + f * 4, y - 6 - h * .5, x + Math.sin(t * 7 + k) * 4, y - 6 - h); c.quadraticCurveTo(x + 14 - k * 4, y - 6 - h * .5, x + 11 - k * 3, y - 6); c.fill(); } }
  else if (o.t === 'chest') { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x + 4, y + 2, 26, 8, 0, 0, TAU); c.fill(); c.fillStyle = '#7a5226'; c.fillRect(x - 20, y - 20, 40, 21); c.fillStyle = st ? '#3a2512' : '#96672f'; c.beginPath(); c.roundRect(x - 21, y - (st ? 40 : 32), 42, st ? 12 : 14, [9, 9, 0, 0]); c.fill(); if (st) { c.fillStyle = '#1a1009'; c.fillRect(x - 18, y - 28, 36, 8); } c.fillStyle = '#e8b656'; c.fillRect(x - 21, y - 21, 42, 3); c.fillRect(x - 3, y - 22, 6, 9); c.fillRect(x - 21, y - 20, 4, 21); c.fillRect(x + 17, y - 20, 4, 21); }
  else if (o.t === 'gate') { const open = o.off; c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(x + 6, y + 60, 26, 9, 0, 0, TAU); c.ellipse(x + 6, y - 46, 26, 9, 0, 0, TAU); c.fill(); for (const dy of [-50, 56]) drawPillar(c, { x, y: y + dy, r: 24, tall: 1 });
    if (!open) { const g = c.createLinearGradient(x - 6, 0, x + 6, 0); g.addColorStop(0, '#1d2024'); g.addColorStop(.5, '#4a4f57'); g.addColorStop(1, '#1d2024'); c.fillStyle = g; c.fillRect(x - 6, y - 118, 12, 152); c.fillStyle = '#6a707a'; for (let yy = y - 110; yy < y + 30; yy += 13) c.fillRect(x - 7, yy, 14, 3); c.fillStyle = '#2c2f33'; c.beginPath(); c.moveTo(x - 7, y - 118); c.lineTo(x, y - 134); c.lineTo(x + 7, y - 118); c.fill(); c.fillStyle = '#e8b656'; c.beginPath(); c.roundRect(x - 8, y - 46, 16, 18, 4); c.fill(); c.fillStyle = '#3a2606'; c.beginPath(); c.arc(x, y - 38, 2.6, 0, TAU); c.fill(); } } }
