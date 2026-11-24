/* ZERO QUEST – a világ felépítése: utak, falvak, Szárazvár, romok emeletekkel, kazamaták, barlangok, tornyok */
'use strict';
const PW = (t, x, y, r, o = {}) => addO({ t, x, y, r, solid: r > 0 ? 1 : 0, ...o });
const WALL = (x, y, w, d, o = {}) => addO({ t: 'wall', x, y, w, d, solid: 1, h: 120, ...o });
const POIS = [], RVC = {}; let KCH = null;
/* a fontos pontokhoz ösvény vezet, és a talaj elegyengetve: mindig elérhető */
function poi(x, y, r = 90) { POIS.push([x, y, r]); addPad(x, y, r, 160); }
function trailTo(x, y) { let bd = 1e9, bp = null; for (const r of ROADS) for (let i = 0; i < r.length; i += 3) { const d = hyp(r[i][0] - x, r[i][1] - y); if (d < bd) { bd = d; bp = r[i]; } }
  if (!bp || bd < 260) return; const n = Math.ceil(bd / 500), pts = [[x, y]]; for (let k = 1; k < n; k++) { const t = k / n, px = lerp(x, bp[0], t), py = lerp(y, bp[1], t), nx = -(bp[1] - y) / bd, ny = (bp[0] - x) / bd, o = (rnd(x | 0, k, 5) - .5) * 260 * Math.sin(t * Math.PI); pts.push([px + nx * o, py + ny * o]); } pts.push(bp);
  const s = smooth(pts, 60); s.trail = 1; ROADS.push(s); stampRoad(s.map(p => p), 50); }

/* ---------- utak ---------- */
function buildRoads() { const N = [...FIRES.slice(0, 11), ...Object.values(LORD).filter(l => l[0] < OW).map(l => [l[0], l[1] + l[2] + 160]), ...ZDEF.filter(z => z.at && !z.par && !z.proc).map(z => z.at), ...REGS.map(r => r.c), [RK.var.c[0], RK.var.c[1] - 1500], [RK.var.c[0], RK.var.c[1] + 1500], [RK.var.c[0] - 1950, RK.var.c[1]], [RK.var.c[0] + 1950, RK.var.c[1]]];
  const nodes = N.filter((p, i) => land(p[0], p[1]) > .05 && !N.slice(0, i).some(q => hyp(q[0] - p[0], q[1] - p[1]) < 500)), E = [], inT = new Set([0]);
  while (inT.size < nodes.length) { let bd = 1e18, ba = -1, bb = -1; for (const a of inT) for (let b = 0; b < nodes.length; b++) if (!inT.has(b)) { const d = hyp(nodes[a][0] - nodes[b][0], nodes[a][1] - nodes[b][1]); if (d < bd) { bd = d; ba = a; bb = b; } } inT.add(bb); E.push([ba, bb]); }
  for (let a = 0; a < nodes.length; a++) { const ds = nodes.map((q, b) => [hyp(q[0] - nodes[a][0], q[1] - nodes[a][1]), b]).filter(q => q[1] !== a).sort((p, q) => p[0] - q[0]); for (const [d, b] of ds.slice(0, 2)) if (d < 5200 && !E.some(e => e[0] === a && e[1] === b || e[0] === b && e[1] === a) && rnd(a, b, 3) < .55) E.push([a, b]); }
  for (const [a, b] of E) { const A = nodes[a], B = nodes[b], L = hyp(B[0] - A[0], B[1] - A[1]), n = Math.max(2, Math.ceil(L / 700)), pts = [A];
    for (let k = 1; k < n; k++) { const t = k / n, nx = -(B[1] - A[1]) / L, ny = (B[0] - A[0]) / L, o = (fbm(a * 3.1 + t * 4, b * 1.7, 2) - .5) * 1400 * Math.sin(t * Math.PI); let px = lerp(A[0], B[0], t) + nx * o, py = lerp(A[1], B[1], t) + ny * o;
      for (let it = 0; it < 20 && land(px, py) < .08; it++) { px = lerp(px, OW / 2, .06); py = lerp(py, OH / 2, .06); } pts.push([px, py]); } pts.push(B); const s = smooth(pts, 60); ROADS.push(s); stampRoad(s); } }

/* ---------- épületek: alaprajz, falszakaszok, emelet, lépcső, tető ---------- */
const MATS = { mez: 'ko', lap: 'sar', nap: 'feher', var: 'ko', cso: 'homok', kak: 'voros', jeg: 'jeg', so: 'so', mely: 'sotet' };
function bld(x, y, w, d, o = {}) { const ts = 40; w = Math.max(160, Math.round(w / ts) * ts); d = Math.max(120, Math.round(d / ts) * ts); const id = BLDS.length, sd = o.seed != null ? o.seed : id * 7 + 3;
  const fl = o.fl === 2 && w >= 280 ? 2 : 1, dmg = o.dmg || 0, b = addO({ t: 'bld', id, x, y, w, d, fl, roof: o.roof == null ? (dmg < .2 ? 1 : dmg < .5 ? 2 : 0) : o.roof, kind: o.kind || 'house', mat: o.mat || 'ko', dmg, segs: [], ts, tw: w / ts, th: d / ts, can: o.can, snow: o.snow, sunk: o.sunk });
  BLDS.push(b); b.pad = addPad(x, y, hyp(w, d) / 2 + 30, 170); b.base = b.pad[4];
  const doors = o.doors || [1]; const T = 16;
  for (let side = 0; side < 4; side++) { const hor = side < 2, L = hor ? w : d, n = L / ts, cx = hor ? x - w / 2 : side === 2 ? x - w / 2 : x + w / 2, cy = hor ? (side === 0 ? y - d / 2 : y + d / 2) : y - d / 2, di = doors.includes(side) ? Math.floor(n / 2) - 1 : -9;
    for (let lv = 0; lv < fl; lv++) { let run = null; const flush = () => { if (!run) return; const a = run[0] * ts, bb = (run[1] + 1) * ts; if (hor) WALL(cx + (a + bb) / 2, cy, bb - a + T, T, { fz: lv, b: id, nr: 1 }); else WALL(cx, cy + (a + bb) / 2, T, bb - a + T, { fz: lv, b: id, nr: 1 }); run = null; };
      for (let i = 0; i < n; i++) { const r = rnd(sd, side * 100 + i, lv + 11); let h = FH, st = 'full';
        if (lv === 0 && (i === di || i === di + 1)) st = 'door'; else if (r < dmg * .42 && !(lv === 0 && (i === 0 || i === n - 1))) st = 'gap'; else if (r < dmg * .95) { h = FH * (lv ? .2 + .6 * rnd(sd, i, side + 40) : .35 + .55 * rnd(sd, i, side + 40)); st = 'broken'; }
        const win = st === 'full' && i % 3 === 1 && rnd(sd, i, side + 70) < .7 && !(lv === 0 && i === di + 2);
        b.segs.push({ side, i, lv, st, h, win, x0: hor ? cx + i * ts : cx, y0: hor ? cy : cy + i * ts, x1: hor ? cx + (i + 1) * ts : cx, y1: hor ? cy : cy + (i + 1) * ts });
        if (st === 'gap' || st === 'door') flush(); else if (run) run[1] = i; else run = [i, i]; } flush(); } }
  /* emelet: födém-csempék, a lépcső nyílása, beszakadt foltok */
  if (fl === 2) { const L = Math.min(240, w - 160); b.stairs = { x: x + w / 2 - 70 - L / 2 - 30, y: y - d / 2 + 8 + 34, w: L, d: 60, dir: 1 }; const s = b.stairs, x0 = s.x - L / 2, x1 = s.x + L / 2;
    WALL(s.x, s.y + 34, L, 8, { fz: 0, b: id, rail: 1, h: 30 }); WALL(s.x, s.y + 34, L, 8, { fz: 1, b: id, rail: 1, h: 30 }); WALL(x0 - 6, s.y, 8, 68, { fz: 0, b: id, rail: 1, h: FH }); WALL(x1 + 6, s.y, 8, 68, { fz: 1, b: id, rail: 1, h: 30 });
    b.tiles = new Uint8Array(b.tw * b.th); for (let j = 0; j < b.th; j++) for (let i = 0; i < b.tw; i++) { const tx = x - w / 2 + (i + .5) * ts, ty = y - d / 2 + (j + .5) * ts; const inSt = Math.abs(tx - s.x) < L / 2 + 20 && Math.abs(ty - s.y) < 50; const land0 = tx < x0 && tx > x0 - 120 && Math.abs(ty - s.y) < 90;
      const hole = !land0 && fbm(tx / 90 + sd, ty / 90, 2) < dmg * .62 - .05; b.tiles[i + j * b.tw] = inSt ? 2 : hole ? 0 : 1; } }
  return b; }
/* bútorok és lim-lom egy épületben (földszint/emelet) */
function furnish(b, opt = {}) { const sd = b.id * 13 + 5, k = b.kind, F = (t, dx, dy, r, o = {}) => PW(t, b.x + dx, b.y + dy, r, { b: b.id, ...o });
  const iw = b.w / 2 - 50, id = b.d / 2 - 50;
  if (k === 'church') { F('altar', iw - 20, 0, 26); for (let i = -2; i <= 2; i++) { F('pillar', i * b.w / 6, -id + 20, 18, { h: FH * 1.6, broken: rnd(sd, i, 1) < b.dmg, mat: b.mat }); F('pillar', i * b.w / 6, id - 20, 18, { h: FH * 1.6, broken: rnd(sd, i, 2) < b.dmg, mat: b.mat }); }
    for (let i = 0; i < 4; i++) if (rnd(sd, i, 3) > .35) F('bench', -iw + 80 + i * 70, (rnd(sd, i, 4) - .5) * 60, 0, { a: Math.PI / 2 }); F('candles', iw - 20, -60, 0); return; }
  if (k === 'crypt') { F('sarc', 0, -id + 40, 0, { w: 110, d: 50, solid: 1 }); return; }
  const n = 2 + (rnd(sd, 1, 1) * 4 | 0); for (let i = 0; i < n; i++) { const t = ['barrel', 'crate', 'table', 'bed', 'shelf', 'bones', 'pot'][rnd(sd, i, 2) * 7 | 0], dx = (rnd(sd, i, 3) - .5) * 2 * iw, dy = (rnd(sd, i, 4) - .5) * 2 * id;
    if (b.stairs && Math.abs(b.x + dx - b.stairs.x) < b.stairs.w / 2 + 50 && Math.abs(b.y + dy - b.stairs.y) < 80) continue; if (Math.abs(dy - b.d / 2) < 90 && Math.abs(dx) < 70) continue;
    F(t, dx, dy, t === 'barrel' ? 14 : t === 'crate' ? 16 : t === 'table' ? 26 : t === 'bed' ? 0 : t === 'shelf' ? 0 : t === 'pot' ? 10 : 0, { a: rnd(sd, i, 5) * TAU }); }
  if (b.fl === 2) for (let i = 0; i < 2; i++) { const dx = (rnd(sd, i, 7) - .5) * 2 * iw, dy = (rnd(sd, i, 8) - .2) * id; if (floorAt(b, b.x + dx, b.y + dy)) F(rnd(sd, i, 9) < .5 ? 'crate' : 'bones', dx, dy, 0, { fz: 1 }); } }

/* ---------- romtípusok ---------- */
function ruin(x, y, k, n) { const r0 = rnd(n, 1, 61), sd = n * 31 + 7, mat = MATS[k] || 'ko', dm = .35 + rnd(n, 2, 61) * .55;
  const pick = { mez: ['house', 'house2', 'mill', 'chapel', 'circle', 'aqua', 'graves', 'house2'], lap: ['sunk', 'house', 'chapel', 'tower', 'stilt', 'graves'], nap: ['colon', 'temple', 'tower', 'obs', 'house2', 'colon'], var: ['house2', 'tower', 'gate', 'keep', 'statues', 'wall'],
    cso: ['wreck', 'ribs', 'buried', 'obelisk', 'house', 'buried'], kak: ['shrine', 'chapel', 'totem', 'house', 'tower'], jeg: ['house2', 'tower', 'statues', 'keep', 'chapel'], so: ['temple', 'tower', 'wall', 'house2', 'obelisk'], mely: ['house2', 'crypt', 'colon', 'keep', 'graves', 'tower'] }[k] || ['house'];
  const tp = pick[rnd(n, 3, 61) * pick.length | 0], info = { x, y, k, tp, b: null, up: 0 };
  const chestAt = (dx, dy, o) => { if (rnd(n, 9, 61) < .62) PW('chest', x + dx, y + dy, 18, { id: 'r' + n, ...o }); };
  switch (tp) {
    case 'house': case 'sunk': case 'stilt': { const b = bld(x, y, 200 + r0 * 160, 160 + rnd(n, 4, 61) * 100, { dmg: dm, mat, sunk: tp === 'sunk', doors: [rnd(n, 5, 61) * 4 | 0], seed: sd }); furnish(b); info.b = b; chestAt(0, -20, { b: b.id }); break; }
    case 'house2': case 'keep': { const big = tp === 'keep', b = bld(x, y, big ? 520 + r0 * 120 : 360 + r0 * 120, big ? 360 + r0 * 80 : 240 + rnd(n, 4, 61) * 80, { fl: 2, dmg: dm * .8, mat, kind: big ? 'keep' : 'house', doors: big ? [1, 2] : [1], seed: sd }); furnish(b); info.b = b; info.up = 1;
      if (b.tiles) { for (let t = 0; t < 30; t++) { const dx = (rnd(n, t, 70) - .5) * (b.w - 120), dy = (rnd(n, t, 71) - .5) * (b.d - 120); if (floorAt(b, x + dx, y + dy)) { PW('chest', x + dx, y + dy, 0, { id: 'r' + n, fz: 1, b: b.id }); break; } } } else chestAt(0, 0, { b: b.id }); break; }
    case 'tower': case 'obs': { const b = bld(x, y, 280, 280, { fl: 2, dmg: dm * .7, mat, kind: 'tower', doors: [1], seed: sd, roof: tp === 'obs' ? 0 : undefined }); furnish(b); info.b = b; info.up = 1; chestAt(-40, 40, { b: b.id }); break; }
    case 'chapel': case 'temple': { const b = bld(x, y, 440 + r0 * 160, 220 + rnd(n, 4, 61) * 60, { dmg: dm, mat, kind: 'church', doors: [2], seed: sd }); furnish(b); info.b = b; chestAt(b.w / 2 - 90, 40, { b: b.id }); break; }
    case 'crypt': { const b = bld(x, y, 240, 200, { dmg: dm * .5, mat, kind: 'crypt', doors: [1], seed: sd, roof: 1 }); furnish(b); info.b = b; break; }
    case 'mill': { PW('mill', x, y, 50, { broken: 1 }); bld(x + 220, y + 60, 200, 160, { dmg: dm, mat, seed: sd }); chestAt(80, 120); break; }
    case 'circle': case 'totem': case 'shrine': { const m = tp === 'circle' ? 11 : 8, R = 180 + r0 * 80; for (let j = 0; j < m; j++) { const a = j / m * TAU; if (rnd(n, j, 62) < .25) continue; PW(tp === 'totem' ? 'totem' : 'menhir', x + Math.cos(a) * R, y + Math.sin(a) * R, 20, { h: 90 + rnd(n, j, 63) * 90, a, mat }); } PW(tp === 'shrine' ? 'altar' : 'statue', x, y, 24, { v: rnd(n, 7, 61), mat }); addPad(x, y, R + 40, 150); chestAt(40, 50); break; }
    case 'colon': { const m = 4 + (r0 * 4 | 0), R = 90; addPad(x, y, m * R / 2 + 120, 160); PW('plinth', x, y, 0, { w: m * R + 80, d: 300, mat }); for (let j = 0; j < m; j++) for (const s of [-1, 1]) { const px = x + (j - (m - 1) / 2) * R, py = y + s * 110; if (rnd(n, j * 2 + s, 64) < .2) PW('colfall', px + 30, py + s * 60, 0, { a: rnd(n, j, 66) * TAU, mat }); else PW('pillar', px, py, 18, { h: FH * 1.8, broken: rnd(n, j * 2 + s, 65) < dm, mat }); } chestAt(0, 0); break; }
    case 'aqua': { const a = rnd(n, 5, 61) * Math.PI, m = 6 + (r0 * 6 | 0); for (let j = 0; j < m; j++) { if (rnd(n, j, 67) < dm * .35) { PW('rubble', x + Math.cos(a) * (j - m / 2) * 220, y + Math.sin(a) * (j - m / 2) * 220, 0, { mat }); continue; } PW('arch', x + Math.cos(a) * (j - m / 2) * 220, y + Math.sin(a) * (j - m / 2) * 220, 0, { a, mat, h: 260 + r0 * 80 }); const px = x + Math.cos(a) * ((j - m / 2) * 220 - 110), py = y + Math.sin(a) * ((j - m / 2) * 220 - 110); PW('apier', px, py, 28, { mat }); } chestAt(Math.cos(a + 1.57) * 80, Math.sin(a + 1.57) * 80); break; }
    case 'graves': { addPad(x, y, 300, 160); for (let j = 0; j < 22; j++) { const px = x + ((j % 6) - 2.5) * 80 + (rnd(n, j, 68) - .5) * 20, py = y + ((j / 6 | 0) - 1.5) * 90; PW('tomb', px, py, 0, { v: rnd(n, j, 69), a: (rnd(n, j, 70) - .5) * .5 }); } bld(x, y - 260, 200, 160, { kind: 'crypt', dmg: .2, mat, roof: 1, doors: [1], seed: sd }); chestAt(-200, 120); break; }
    case 'gate': { const a = rnd(n, 5, 61) < .5 ? 0 : 1; bld(x - (a ? 0 : 260), y - (a ? 260 : 0), 200, 200, { fl: 1, dmg: dm, mat, kind: 'tower', seed: sd }); bld(x + (a ? 0 : 260), y + (a ? 260 : 0), 200, 200, { fl: 1, dmg: dm, mat, kind: 'tower', seed: sd + 1 }); PW('arch', x, y, 0, { a: a ? 0 : Math.PI / 2, mat, h: 260, big: 1 }); chestAt(0, 0); break; }
    case 'wall': { const a = rnd(n, 5, 61) < .5, L = 900 + r0 * 700; for (let j = 0; j < L / 120; j++) { if (rnd(n, j, 72) < dm * .45) continue; const t = j * 120 - L / 2; WALL(x + (a ? t : 0), y + (a ? 0 : t), a ? 124 : 40, a ? 40 : 124, { h: 90 + rnd(n, j, 73) * 120, mat, cren: 1 }); } addPad(x, y, L / 2, 140); chestAt(0, 60); break; }
    case 'statues': { for (let j = 0; j < 5; j++) PW('statue', x + (j - 2) * 140, y + (rnd(n, j, 74) - .5) * 80, 26, { v: rnd(n, j, 75), mat, broken: rnd(n, j, 76) < dm }); addPad(x, y, 340, 140); chestAt(0, 80); break; }
    case 'wreck': { PW('wreck', x, y, 0, { a: rnd(n, 5, 61) * TAU, f: rnd(n, 6, 61) < .5 ? 1 : -1 }); chestAt(0, 0); break; }
    case 'ribs': { PW('ribs', x, y, 0, { a: rnd(n, 5, 61) * TAU, s: 1 + r0 }); chestAt(0, 30); break; }
    case 'buried': { const b = bld(x, y, 320 + r0 * 120, 220, { dmg: .85, mat, kind: 'church', seed: sd, roof: 0, sunk: 1 }); info.b = b; PW('obelisk', x - b.w / 2 - 60, y, 26, { mat }); chestAt(0, 0, { b: b.id }); break; }
    case 'obelisk': { PW('obelisk', x, y, 30, { mat, h: 300 + r0 * 200 }); for (let j = 0; j < 4; j++) PW('rubble', x + Math.cos(j * 1.6) * 140, y + Math.sin(j * 1.6) * 140, 0, { mat }); addPad(x, y, 200, 120); chestAt(70, 70); break; }
  }
  RUINS.push([x, y, k, info]); return info; }

/* ---------- várak: körfal, saroktornyok, kapuház leeresztett rácsostorral; a kapu a kapuőrök halálakor nyílik ---------- */
const CASTLES = [];
function castle(id, cx, cy, R, mat, side = 1, o = {}) { addPad(cx, cy, R + 120, 260); const GW = 240, T = 64, Hh = 330, wl = (x, y, w, d) => WALL(x, y, w, d, { h: Hh, mat, cren: 1, city: 1, cas: id });
  const C = { id, x: cx, y: cy, R, mat, side, gate: null }; CASTLES.push(C);
  for (let s = 0; s < 4; s++) { const hor = s < 2, c0 = hor ? (s === 0 ? cy - R : cy + R) : (s === 2 ? cx - R : cx + R);
    if (s === side) { const g = hor ? cx : cy; if (hor) { wl((cx - R + g - GW / 2) / 2, c0, g - GW / 2 - (cx - R), T); wl((g + GW / 2 + cx + R) / 2, c0, cx + R - g - GW / 2, T); } else { wl(c0, (cy - R + g - GW / 2) / 2, T, g - GW / 2 - (cy - R)); wl(c0, (g + GW / 2 + cy + R) / 2, T, cy + R - g - GW / 2); }
      const gx = hor ? g : c0, gy = hor ? c0 : g; PW('gatehouse', gx, gy, 0, { a: hor ? 0 : Math.PI / 2, w: GW, mat }); C.gate = addO({ t: 'portc', x: gx, y: gy, w: hor ? GW + 8 : 26, d: hor ? 26 : GW + 8, solid: 1, h: 250, gate: id, a: hor ? 0 : Math.PI / 2 }); C.gx = gx; C.gy = gy; C.out = [gx + (hor ? 0 : (s === 2 ? -1 : 1) * 260), gy + (hor ? (s === 0 ? -1 : 1) * 260 : 0)]; }
    else { if (hor) wl(cx, c0, 2 * R + T, T); else wl(c0, cy, T, 2 * R + T); } }
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) PW('ctower', cx + sx * R, cy + sy * R, 96, { mat, r: 96, h: 520, spire: 1 });
  for (const t of [-.5, .5]) for (let s = 0; s < 4; s++) { if (s === side) continue; const hor = s < 2; PW('ctower', hor ? cx + t * R : (s === 2 ? cx - R : cx + R), hor ? (s === 0 ? cy - R : cy + R) : cy + t * R, 70, { mat, r: 70, h: 430, spire: 1 }); }
  /* udvar: tornyos lakóépület a kapuval szemközti sarokban, benne a tömlöc lejárata */
  const back = side === 1 ? -1 : 1, kx = cx + (o.kx || R * .55), ky = cy + back * R * .62; const keep = bld(kx, ky, 400, 280, { fl: 2, dmg: .35, mat, kind: 'keep', doors: [back < 0 ? 1 : 0], seed: id.length * 31 }); furnish(keep); C.keep = keep;
  const bar = bld(cx - R * .55, ky, 360, 240, { fl: 2, dmg: .5, mat, kind: 'house', doors: [back < 0 ? 1 : 0], seed: id.length * 37 }); furnish(bar);
  /* felső termek: a lakótorony emeletéről vezet fel ajtó */
  if (o.uz) { const z = ZK[o.uz], dx = keep.x + 60, dy = keep.y + 40; for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const ti = Math.floor((dx + i * 40 - keep.x + keep.w / 2) / keep.ts), tj = Math.floor((dy + j * 40 - keep.y + keep.d / 2) / keep.ts); if (ti >= 0 && tj >= 0 && ti < keep.tw && tj < keep.th && keep.tiles[ti + tj * keep.tw] !== 2) keep.tiles[ti + tj * keep.tw] = 1; } z.at = [dx, dy]; z.atfz = 1; PW('door', dx, dy, 0, { z: z.id, dk: 'up', b: keep.id, fz: 1 }); z.rg = o.rg; }
  /* katedrális az udvaron, emeleti karzattal, mellette csúcsos harangtorony */
  { const chx = cx - R * .7, chy = cy + R * .3 * -back; const ch = bld(chx, chy, 300, 560, { fl: 2, dmg: .2, mat, kind: 'church', doors: [3], seed: id.length * 11 });
    for (let k = -2; k <= 2; k++) for (const s of [-1, 1]) PW('pillar', chx + s * 95, chy + k * 100, 16, { h: FH * 1.9, mat, b: ch.id }); PW('altar', chx, chy - back * 0 - 220, 24, { b: ch.id, mat }); PW('candles', chx, chy - 180, 0, { b: ch.id }); for (let k = -1; k <= 2; k++) PW('bench', chx, chy + k * 70, 0, { b: ch.id });
    PW('ctower', chx - 120, chy - 330, 64, { mat, r: 64, h: 560, spire: 1 }); }
  if (o.dz) { const z = ZK[o.dz]; z.at = [keep.x - keep.w / 4, keep.y]; PW('door', z.at[0], z.at[1], 0, { z: z.id, dk: 'hatch', b: keep.id }); z.rg = o.rg; }
  for (let k = 0; k < 6; k++) PW(k % 2 ? 'banner' : 'brazier', C.out[0] + (k - 2.5) * 70 * (side < 2 ? 1 : 0), C.out[1] + (k - 2.5) * 70 * (side < 2 ? 0 : 1) + (side < 2 ? -back * 60 : 0), k % 2 ? 0 : 14, { lit: 1, mat });
  RUINS.push([kx, ky, o.rg || 'var', { b: keep, up: 1, tp: 'keep', cas: id }]); return C; }
/* ---------- magas vízvezeték-romok a hegyek között: rámpán fel a tetejére, ahol ritka zsákmány vár ---------- */
function aqueduct(x, y, L, horiz, n) { const W = 120, ts = 40, x0 = horiz ? x - L / 2 : x, y0 = horiz ? y : y - L / 2, at = t => horiz ? [x0 + t, y] : [x, y0 + t];
  let hmax = -1e9; for (let t = 0; t <= L; t += 60) { const p = at(t); hmax = Math.max(hmax, Hraw(p[0], p[1])); } const g0 = Hraw(...at(40)), top = hmax + 210 + rnd(n, 1, 9) * 130, fh = top - g0, Ls = clamp(fh / .58, 220, L * .45);
  if (fh > 560 || Ls > L * .44) return null; const pad = addPad(...at(60), 150, 140, g0);
  const w = horiz ? L : W, d = horiz ? W : L, id = BLDS.length, b = addO({ t: 'bld', id, x, y, w, d, fl: 2, kind: 'aqua', mat: 'ko', dmg: .3, segs: [], ts, tw: w / ts, th: d / ts, fh, pad, base: g0, roof: 0, horiz, Ls }); BLDS.push(b);
  b.stairs = horiz ? { x: x0 + Ls / 2, y, w: Ls, d: W - 24, dir: 0 } : { x, y: y0 + Ls / 2, w: W - 24, d: Ls, dir: 2 };
  b.tiles = new Uint8Array(b.tw * b.th); const gapAt = L * (.55 + rnd(n, 2, 9) * .3); for (let j = 0; j < b.th; j++) for (let i = 0; i < b.tw; i++) { const along = horiz ? i * ts : j * ts, lat = horiz ? j : i; b.tiles[i + j * b.tw] = along < Ls ? 2 : Math.abs(along - gapAt) < 40 && lat !== 0 ? 0 : 1; }
  const rail = (t0, t1, side, fz) => { const p0 = at(t0), p1 = at(t1), off = side * (W / 2 - 4); WALL(horiz ? (p0[0] + p1[0]) / 2 : x + off, horiz ? y + off : (p0[1] + p1[1]) / 2, horiz ? t1 - t0 : 8, horiz ? 8 : t1 - t0, { fz, b: id, rail: 1, h: 30 }); };
  for (const s of [-1, 1]) { rail(0, Ls, s, 0); rail(0, Ls, s, 1); for (let t = Ls; t < L; t += 160) if (rnd(n, t | 0, s + 20) > .22) rail(t, Math.min(L, t + 150), s, 1); }
  { const p = at(Ls + 6); WALL(p[0], p[1], horiz ? 8 : W, horiz ? W : 8, { fz: 0, b: id, rail: 1, h: 40 }); }
  for (let t = Ls + 110; t < L - 40; t += 220) { const p = at(t); PW('apier', p[0], p[1], 34, { b: undefined, aq: id }); }
  const far = at(L - 80); PW('chest', far[0], far[1], 0, { id: 'aq' + n, fz: 1, b: id, rare: 1 }); const mid = at(Ls + (L - Ls) * .45); PW('chest', mid[0] + (horiz ? 0 : 20), mid[1] + (horiz ? 20 : 0), 0, { id: 'aq' + n + 'b', fz: 1, b: id, rare: 1 });
  RUINS.push([x, y, biomeW(x, y).k, { b, up: 1, tp: 'aqua2' }]); return b; }
/* ---------- Szárazvár: fallal kerített város utcákkal, házakkal, a bálteremmel ---------- */
function buildCity() { const C = RK.var.c, X0 = C[0] - 1950, X1 = C[0] + 1950, Y0 = C[1] - 1450, Y1 = C[1] + 1450; addPad(C[0], C[1], 2250, 500); FIRES[3] = [X1 + 380, FIRES[3][1]]; const zx = ZONES.filter(z => z.at && z.at[0] > X0 && z.at[0] < X1 && z.at[1] > Y0 && z.at[1] < Y1).map(z => z.at);
  const gates = { n: C[0], s: C[0], w: C[1], e: FIRES[3][1] }, GW = 260, WT = 70, wl = (x, y, w, d) => WALL(x, y, w, d, { h: 300, mat: 'ko', cren: 1, city: 1 });
  for (const [yy, g, k, sd] of [[Y0, gates.n, 'v_n', -1], [Y1, gates.s, 'v_s', 1]]) { wl((X0 + g - GW / 2) / 2, yy, g - GW / 2 - X0, WT); wl((g + GW / 2 + X1) / 2, yy, X1 - g - GW / 2, WT); PW('gatehouse', g, yy, 0, { a: 0, w: GW }); addO({ t: 'portc', x: g, y: yy, w: GW + 8, d: 26, solid: 1, h: 250, gate: k, a: 0 }); CASTLES.push({ id: k, x: g, y: yy, R: 0, city: 1, out: [g, yy + sd * 260], gx: g, gy: yy, side: sd < 0 ? 0 : 1 }); }
  for (const [xx, g, k, sd] of [[X0, gates.w, 'v_w', -1], [X1, gates.e, 'v_e', 1]]) { wl(xx, (Y0 + g - GW / 2) / 2, WT, g - GW / 2 - Y0); wl(xx, (g + GW / 2 + Y1) / 2, WT, Y1 - g - GW / 2); PW('gatehouse', xx, g, 0, { a: Math.PI / 2, w: GW }); addO({ t: 'portc', x: xx, y: g, w: 26, d: GW + 8, solid: 1, h: 250, gate: k, a: Math.PI / 2 }); CASTLES.push({ id: k, x: xx, y: g, R: 0, city: 1, out: [xx + sd * 260, g], gx: xx, gy: g, side: sd < 0 ? 2 : 3 }); }
  for (const [x, y] of [[X0, Y0], [X1, Y0], [X0, Y1], [X1, Y1]]) PW('ctower', x, y, 90, { mat: 'ko' }); for (let t = X0 + 650; t < X1 - 300; t += 650) { if (Math.abs(t - gates.n) > 300) PW('ctower', t, Y0, 60, { mat: 'ko' }); if (Math.abs(t - gates.s) > 300) PW('ctower', t, Y1, 60, { mat: 'ko' }); }
  const ro = LORD.rozalia, mk = FIRES[4], kw = sc([4420, 3740]); let n = 0;
  for (let gx = X0 + 260; gx < X1 - 200; gx += 430) for (let gy = Y0 + 240; gy < Y1 - 180; gy += 380) { const cx = gx + 150, cy = gy + 130; if (Math.abs(cx - gates.n) < 260 || Math.abs(cy - C[1]) < 240 || Math.abs(cy - gates.e) < 220) continue;
    if (zx.some(q => hyp(cx - q[0], cy - q[1]) < 480) || hyp(cx - ro[0], cy - ro[1]) < ro[2] + 260 || hyp(cx - mk[0], cy - mk[1]) < 520 || hyp(cx - kw[0], cy - kw[1]) < 360) continue; n++; const two = rnd(n, 1, 81) < .6, dm = .15 + rnd(n, 2, 81) * .65;
    const b = bld(cx, cy, two ? 360 : 260 + rnd(n, 3, 81) * 60, 240 + rnd(n, 4, 81) * 40, { fl: two ? 2 : 1, dmg: dm, mat: 'ko', doors: [rnd(n, 5, 81) < .5 ? 1 : 0], seed: 900 + n }); furnish(b); if (rnd(n, 6, 81) < .35) PW('chest', cx + 40, cy, 18, { id: 'v' + n, b: b.id }); RUINS.push([cx, cy, 'var', { b, up: b.fl === 2, x: cx, y: cy, k: 'var' }]); }
  PW('bigwell', kw[0], kw[1], 52); for (let k = 0; k < 46; k++) { const x = mk[0] - 380 + rnd(k, 1, 51) * 760, y = mk[1] - 260 + rnd(k, 2, 51) * 520; if (hyp(x - mk[0], y - mk[1]) < 150) continue; PW('statue', x, y, 22, { v: rnd(k, 3, 51), dust: 1, a: rnd(k, 4, 51) * TAU }); }
  for (let k = 0; k < 8; k++) PW('stall', mk[0] - 300 + k * 85, mk[1] - 330, 26); const pal = bld(ro[0], ro[1] - ro[2] - 200, 700, 260, { fl: 2, dmg: .45, mat: 'ko', kind: 'keep', doors: [1], seed: 4242 }); furnish(pal); { const z = ZK.k_palota; z.at = [pal.x - pal.w / 4, pal.y]; z.rg = 'var'; PW('door', z.at[0], z.at[1], 0, { z: z.id, dk: 'hatch', b: pal.id }); }
  for (let k = 0; k < 26; k++) { const a = k / 26 * TAU; PW('pillar', ro[0] + Math.cos(a) * ro[2], ro[1] + Math.sin(a) * ro[2] * .92, 22, { h: FH * 2.2, broken: rnd(k, 5, 7) > .75, mat: 'ko' }); } PW('floor', ro[0], ro[1], 0, { r: ro[2] + 30, pat: 'ball' });
  bld(C[0] + 1100, C[1] + 700, 520, 260, { kind: 'church', dmg: .35, mat: 'ko', doors: [2], seed: 4343 }); return { X0, X1, Y0, Y1 }; }

/* ---------- zónák belseje ---------- */
const ZFIRE = [];
function buildKat(z, zi) { const [gw, gh] = z.g, cell = (i, j) => i + j * gw, par = new Array(gw * gh).fill(-1), dist = new Array(gw * gh).fill(0), open = new Set(), st = [0]; par[0] = 0; let seed = 0;
  while (st.length) { const c0 = st[st.length - 1], i = c0 % gw, j = c0 / gw | 0, nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(d => [i + d[0], j + d[1]]).filter(q => q[0] >= 0 && q[1] >= 0 && q[0] < gw && q[1] < gh && par[cell(q[0], q[1])] < 0); if (!nb.length) { st.pop(); continue; } const q = nb[rnd(zi, seed++, 81) * nb.length | 0], c1 = cell(q[0], q[1]); par[c1] = c0; dist[c1] = dist[c0] + 1; open.add(Math.min(c0, c1) + ':' + Math.max(c0, c1)); st.push(c1); }
  for (let k = 0; k < gw * gh / 3; k++) { const i = rnd(zi, k, 82) * (gw - 1) | 0, j = rnd(zi, k, 83) * gh | 0; open.add(cell(i, j) + ':' + cell(i + 1, j)); }
  const hall = new Set(); for (let k = 0; k < gw * gh / 5; k++) { const i = rnd(zi, k, 85) * (gw - 1) | 0, j = rnd(zi, k, 86) * (gh - 1) | 0; hall.add(cell(i, j) + ':' + cell(i + 1, j)); hall.add(cell(i, j) + ':' + cell(i, j + 1)); open.add(cell(i, j) + ':' + cell(i + 1, j)); open.add(cell(i, j) + ':' + cell(i, j + 1)); }
  const T = 44, HH = 170, wl = (x, y, w, d) => WALL(x, y, w, d, { dg: z.th, h: HH, zw: 1 }), seg = (hor, a, b, c) => { if (hor) wl((a + b) / 2, c, b - a + T, T); else wl(c, (a + b) / 2, T, b - a + T); };
  for (let j = 0; j <= gh; j++) for (let i = 0; i < gw; i++) { const x0 = z.x + i * ZC, y = z.y + j * ZC, key = cell(i, j - 1) + ':' + cell(i, j), op = j > 0 && j < gh && open.has(key); if (op && hall.has(key)) continue; if (op) { seg(1, x0, x0 + ZC / 2 - 80, y); seg(1, x0 + ZC / 2 + 80, x0 + ZC, y); } else seg(1, x0, x0 + ZC, y); }
  for (let i = 0; i <= gw; i++) for (let j = 0; j < gh; j++) { const x = z.x + i * ZC, y0 = z.y + j * ZC, key = cell(i - 1, j) + ':' + cell(i, j), op = i > 0 && i < gw && open.has(key); if (op && hall.has(key)) continue; if (op) { seg(0, y0, y0 + ZC / 2 - 80, x); seg(0, y0 + ZC / 2 + 80, y0 + ZC, x); } else seg(0, y0, y0 + ZC, x); }
  const cc = c0 => [z.x + (c0 % gw + .5) * ZC, z.y + ((c0 / gw | 0) + .5) * ZC]; let far = 0; for (let c0 = 0; c0 < gw * gh; c0++) if (dist[c0] > dist[far]) far = c0;
  let far2 = 0; for (let c0 = 0; c0 < gw * gh; c0++) if (c0 !== far && dist[c0] > dist[far2] && hyp(...[cc(c0)[0] - cc(far)[0], cc(c0)[1] - cc(far)[1]]) > ZC * 2) far2 = c0;
  z.in = cc(0); z.far = cc(far); z.cells = []; PW('door', z.in[0], z.in[1] - 120, 0, { z: z.id, out: 1, up: 1, dk: 'stairs' }); PW('chest', z.far[0] + 80, z.far[1] - 60, 18, { id: 'z' + z.id });
  const pg = PAGES.findIndex(p => p[0] === z.id); if (pg >= 0) PW('page', z.far[0] - 80, z.far[1] + 50, 0, { i: pg, txt: PAGES[pg][1] }); z.far2 = cc(far2);
  if (gw * gh >= 24) { const mid = [...dist.keys()].sort((a, b) => Math.abs(dist[a] - dist[far] / 2) - Math.abs(dist[b] - dist[far] / 2))[0], m = cc(mid); ZFIRE.push([m[0] - 60, m[1] + 80, z.n.charAt(0) + z.n.slice(1).toLowerCase()]); }
  for (let c0 = 1; c0 < gw * gh; c0++) { const [x, y] = cc(c0); z.cells.push([x, y, dist[c0]]); const q = rnd(zi, c0, 84), isH = [...hall].some(h => h.startsWith(c0 + ':') || h.endsWith(':' + c0));
    if (isH) { for (const [dx, dy] of [[-120, -120], [120, -120], [-120, 120], [120, 120]]) if (rnd(zi, c0 + dx, 87 + dy) < .7) PW('pillar', x + dx, y + dy, 22, { h: HH, mat: z.th, dg: 1, broken: rnd(zi, c0, 88 + dx) < .25 }); }
    if (q < .28) PW('sarc', x + (rnd(zi, c0, 90) - .5) * 160, y + (rnd(zi, c0, 91) - .5) * 120, 0, { w: 54, d: 116, solid: 1, a: rnd(zi, c0, 92) < .5 ? 0 : 1 });
    else if (q < .42) PW('pillar', x - 100, y - 80, 20, { h: HH, mat: z.th, dg: 1, broken: q < .35 }); if (q > .6 && q < .72) PW('crate', x + 110, y - 100, 16); if (q > .7) PW('bones', x - 60, y + 60, 0, { v: q }); if (q > .45 && q < .6) PW('brazier', x + (q < .52 ? 140 : -140), y + 140, 14, { lit: 1 });
    if (rnd(zi, c0, 93) < .5) PW(z.kas ? 'banner' : 'niche', x + (rnd(zi, c0, 94) < .5 ? -1 : 1) * (ZC / 2 - 30), y, 0, { mat: z.th }); if (z.kas) { const q2 = rnd(zi, c0, 95); if (q2 < .3) PW('bars', x, y - ZC / 2 + 26, 0, {}); else if (q2 < .45) PW('rack', x + 120, y - 120, 16, {}); else if (q2 < .55) PW('chains', x - 130, y - ZC / 2 + 30, 0, {}); } } }
/* barlang: sejtautomata, garantált út a bejárattól a legmélyebb pontig, magasságtérkép */
function buildBar(z, zi, open) { const hc = 60, hw = Math.ceil(z.w / hc) + 1, hh = Math.ceil(z.h / hc) + 1, M = new Uint8Array(hw * hh), I = (i, j) => i + j * hw;
  for (let j = 0; j < hh; j++) for (let i = 0; i < hw; i++) { const edge = i < 2 || j < 2 || i >= hw - 2 || j >= hh - 2; M[I(i, j)] = edge || rnd(zi, i * 977 + j, 31) < (open ? .36 : .45) + (fbm(i / 7 + zi, j / 7, 2) - .5) * .5 ? 1 : 0; }
  const ein = [4, Math.floor(hh / 2)]; let p = [...ein]; const tgt = [hw - 5, 3 + (rnd(zi, 1, 32) * (hh - 6) | 0)], carve = (r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const x = clamp(p[0] + i, 2, hw - 3), y = clamp(p[1] + j, 2, hh - 3); M[I(x, y)] = 0; } };
  const path = []; for (let s = 0; s < 4000 && (p[0] !== tgt[0] || p[1] !== tgt[1]); s++) { carve(2); path.push([...p]); const r = rnd(zi, s, 33); if (r < .55) p[0] += Math.sign(tgt[0] - p[0]); else if (r < .8) p[1] += Math.sign(tgt[1] - p[1]) || (r < .7 ? 1 : -1); else p[1] += r < .9 ? 1 : -1; p[0] = clamp(p[0], 3, hw - 4); p[1] = clamp(p[1], 3, hh - 4); }
  for (let it = 0; it < 4; it++) { const N = M.slice(); for (let j = 2; j < hh - 2; j++) for (let i = 2; i < hw - 2; i++) { let c = 0; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (a || b) c += N[I(i + a, j + b)]; M[I(i, j)] = c >= 5 ? 1 : c <= 2 ? 0 : N[I(i, j)]; } }
  for (const q of path) { p = q; carve(1); } p = ein; carve(3);
  const D = new Int32Array(hw * hh).fill(-1), Qq = [I(...ein)]; D[Qq[0]] = 0; for (let h = 0; h < Qq.length; h++) { const c = Qq[h], i = c % hw, j = c / hw | 0; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = I(i + a, j + b); if (!M[n] && D[n] < 0) { D[n] = D[c] + 1; Qq.push(n); } } }
  for (let k = 0; k < M.length; k++) if (!M[k] && D[k] < 0) M[k] = 1; let far = Qq[0]; for (const c of Qq) if (D[c] > D[far]) far = c;
  const B = new Float32Array(hw * hh); for (let k = 0; k < M.length; k++) B[k] = M[k]; for (let it = 0; it < 2; it++) { const N = B.slice(); for (let j = 1; j < hh - 1; j++) for (let i = 1; i < hw - 1; i++) { let s = 0; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) s += N[I(i + a, j + b)]; B[I(i, j)] = s / 9; } }
  const hm = new Float32Array(hw * hh); for (let j = 0; j < hh; j++) for (let i = 0; i < hw; i++) { const k = I(i, j); hm[k] = sstep(.3, .62, B[k]) * (230 + 90 * fbm(i / 4 + zi, j / 4, 2)) + 22 * (fbm(i / 3 - zi, j / 3, 2) - .5); }
  Object.assign(z, { hm, hc, hw, hh, mask: M }); const cw = (c) => [z.x + (c % hw) * hc, z.y + (c / hw | 0) * hc]; z.in = cw(I(...ein)); z.far = cw(far); z.cells = [];
  if (!open) { PW('door', z.in[0] - 30, z.in[1], 0, { z: z.id, out: 1, up: 1, dk: 'cave' }); PW('chest', z.far[0], z.far[1], 18, { id: 'z' + z.id }); const pg = PAGES.findIndex(q => q[0] === z.id); if (pg >= 0) PW('page', z.far[0] + 70, z.far[1] + 40, 0, { i: pg, txt: PAGES[pg][1] }); }
  const sorted = Qq.filter(c => D[c] > 6 && B[c] < .08); let f2 = sorted[0] || far; for (const c of sorted) if (D[c] > D[far] * .7 && D[c] < D[far] * .85) { f2 = c; break; } z.far2 = cw(f2);
  if (!open && sorted.length > 400) { const m = sorted.find(c => D[c] > D[far] * .45 && D[c] < D[far] * .55); if (m != null) { const q = cw(m); ZFIRE.push([q[0], q[1], z.n.charAt(0) + z.n.slice(1).toLowerCase()]); } }
  for (let s = 0; s < sorted.length; s += 9) { const c = sorted[s], [x, y] = cw(c); z.cells.push([x, y, D[c] / 6]); const q = rnd(zi, c, 35); if (q < .22) PW('stalag', x + 20, y - 20, 18 + rnd(zi, c, 36) * 18, { th: z.th }); else if (q < .3) PW('crystal', x, y, 0, { th: z.th }); else if (q < .36) PW('bones', x, y, 0, { v: q }); }
  return z; }
/* torony: szintenként egy-egy kör alakú terem, lépcsővel felfelé */
function buildTor(z, zi) { const L = z.lv || 3; z.cells = []; for (let i = 0; i < L; i++) { const cx = z.x + i * 1200 + 600, cy = z.y + 550, R = 470, n = 28;
    for (let k = 0; k < n; k++) { const a = k / n * TAU, a2 = (k + 1) / n * TAU, x0 = cx + Math.cos(a) * R, y0 = cy + Math.sin(a) * R, x1 = cx + Math.cos(a2) * R, y1 = cy + Math.sin(a2) * R; WALL((x0 + x1) / 2, (y0 + y1) / 2, Math.abs(x1 - x0) + 40, Math.abs(y1 - y0) + 40, { dg: z.th, h: 150, zw: 1, cren: 1, tor: 1 }); }
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + .5; PW('pillar', cx + Math.cos(a) * 230, cy + Math.sin(a) * 230, 26, { h: 260, mat: z.th, dg: 1, broken: rnd(zi, i * 9 + k, 41) < .35 }); }
    const up = [cx + 330, cy - 250], dn = [cx - 330, cy + 250]; if (i < L - 1) PW('door', up[0], up[1], 0, { go: [z.x + (i + 1) * 1200 + 600 - 330 + 60, z.y + 550 + 250], dk: 'up' }); if (i > 0) PW('door', dn[0], dn[1], 0, { go: [z.x + (i - 1) * 1200 + 600 + 330 - 60, z.y + 550 - 250 + 60], dk: 'down' });
    if (i > 0) z.cells.push([cx, cy, i * 2], [cx + 150, cy + 100, i * 2], [cx - 120, cy - 140, i * 2]); else z.cells.push([cx + 160, cy, 1]); }
  z.in = [z.x + 600, z.y + 550 + 300]; PW('door', z.in[0], z.in[1] + 60, 0, { z: z.id, out: 1, dk: 'stairs' }); z.far = [z.x + (L - 1) * 1200 + 600, z.y + 550]; z.far2 = z.far;
  PW('chest', z.far[0] + 60, z.far[1] + 60, 18, { id: 'z' + z.id }); const pg = PAGES.findIndex(q => q[0] === z.id); if (pg >= 0) PW('page', z.far[0] - 80, z.far[1] - 40, 0, { i: pg, txt: PAGES[pg][1] }); }
/* ---------- várkastélyok felső szintjei: lovagterem, könyvtár-karzat, katedrális, nyitott terasz ---------- */
function buildKast(z, zi) { const L = z.lv || 4, LS = z.ls, RW = 2000, RD = 1100; z.cells = []; const th = z.th, sd = zi * 17 + 3;
  for (let i = 0; i < L; i++) { const x0 = z.x + i * LS + 100, y0 = z.y + 100, x1 = x0 + RW, y1 = y0 + RD, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, kind = z.lvls[i], open = kind === 'terr', H = open ? 48 : kind === 'cath' ? 300 : 220;
    const wl = (x, y, w, d) => WALL(x, y, w, d, { dg: th, h: H, zw: 1, cren: 1, tor: 1 }); wl(cx, y0, RW + 40, 40); wl(cx, y1, RW + 40, 40); wl(x0, cy, 40, RD + 40); wl(x1, cy, 40, RD + 40);
    if (kind === 'hall') { for (let k = 0; k < 6; k++) for (const s of [-1, 1]) PW('pillar', x0 + 260 + k * 300, cy + s * 300, 28, { h: 300, mat: th, dg: 1, broken: rnd(sd, k * 2 + s, 1) < .15 });
      for (let k = 0; k < 4; k++) { PW('table', x0 + 500 + k * 280, cy, 0, { a: 0 }); PW('bench', x0 + 500 + k * 280, cy - 40, 0); PW('bench', x0 + 500 + k * 280, cy + 40, 0); PW('candles', x0 + 500 + k * 280, cy, 0); }
      PW('altar', x1 - 160, cy, 26, { mat: th }); PW('statue', x1 - 90, cy - 220, 30, { mat: th, v: 1 }); PW('statue', x1 - 90, cy + 220, 30, { mat: th, v: 2 }); for (let k = 0; k < 5; k++) { PW('banner', x0 + 300 + k * 360, y0 + 40, 0, { mat: th }); PW('brazier', x0 + 300 + k * 360, y1 - 70, 14, { lit: 1, mat: th }); } }
    else if (kind === 'gal') { for (let k = 0; k < 9; k++) { PW('shelf', x0 + 160 + k * 200, y0 + 50, 0); PW('shelf', x0 + 160 + k * 200, y1 - 50, 0); } for (let k = 0; k < 3; k++) { PW('table', x0 + 560 + k * 420, cy, 0); PW('candles', x0 + 560 + k * 420, cy, 0); PW('arch', x0 + 400 + k * 600, cy, 0, { a: Math.PI / 2, h: 220, mat: th }); }
      for (let k = 0; k < 4; k++) PW('pillar', x0 + 300 + k * 460, cy + (k % 2 ? -260 : 260), 24, { h: 220, mat: th, dg: 1 }); PW('brazier', cx, cy, 16, { lit: 1, mat: th }); }
    else if (kind === 'cath') { for (let k = 0; k < 7; k++) for (const s of [-1, 1]) PW('pillar', x0 + 240 + k * 250, cy + s * 280, 32, { h: 420, mat: th, dg: 1, broken: rnd(sd, k + s * 9, 3) < .12 });
      for (let k = 0; k < 6; k++) PW('arch', x0 + 240 + k * 250 + 125, cy, 0, { a: 0, h: 340, big: 1, mat: th }); for (let k = 0; k < 7; k++) for (const s of [-1, 1]) PW('bench', x0 + 340 + k * 170, cy + s * 110, 0, { a: Math.PI / 2 });
      PW('altar', x1 - 150, cy, 30, { mat: th }); PW('candles', x1 - 200, cy - 70, 0); PW('candles', x1 - 200, cy + 70, 0); PW('statue', x1 - 70, cy, 34, { mat: th, v: 3 }); for (const s of [-1, 1]) { PW('sarc', x0 + 400, cy + s * 420, 0, { mat: th }); PW('sarc', x0 + 900, cy + s * 420, 0, { mat: th }); PW('banner', x1 - 300, cy + s * 480, 0, { mat: th }); } }
    else { for (let k = 0; k < 8; k++) for (const s of [-1, 1]) PW('pillar', x0 + 120 + k * 250, cy + s * (RD / 2 - 40), 22, { h: 90, mat: th, dg: 1 }); for (const [a, b] of [[x0 + 300, y0 + 220], [x1 - 300, y0 + 220], [x0 + 300, y1 - 220], [x1 - 300, y1 - 220]]) { PW('statue', a, b, 30, { mat: th, v: (a + b) % 4 | 0 }); PW('brazier', a + 120, b, 14, { lit: 1, mat: th }); }
      for (let k = 0; k < 3; k++) PW('bench', cx - 300 + k * 300, cy + 300, 0); PW('arch', cx, cy - 200, 0, { a: 0, h: 300, big: 1, mat: th }); }
    const up = [x1 - 140, cy - 380], dn = [x0 + 140, cy + 380]; if (i < L - 1) PW('door', up[0], up[1], 0, { go: [z.x + (i + 1) * LS + 100 + 140 + 70, z.y + 100 + RD / 2 + 380 - 40], dk: 'up' }); if (i > 0) PW('door', dn[0], dn[1], 0, { go: [z.x + (i - 1) * LS + 100 + RW - 140 - 70, z.y + 100 + RD / 2 - 380 + 40], dk: 'down' });
    z.cells.push([cx - 400, cy, i * 2 + 1], [cx + 300, cy + 200, i * 2 + 1], [cx + 500, cy - 250, i * 2 + 2]); }
  z.in = [z.x + 100 + 200, z.y + 100 + RD / 2 + 300]; PW('door', z.in[0] - 80, z.in[1] + 60, 0, { z: z.id, out: 1, dk: 'stairs' });
  const tx = z.x + (L - 1) * LS + 100 + RW / 2, ty = z.y + 100 + RD / 2; z.far = [tx, ty]; z.far2 = z.far; PW('chest', tx + 500, ty, 18, { id: 'z' + z.id, rare: 1 }); const cI = z.lvls.indexOf('cath'); if (cI >= 0) PW('chest', z.x + cI * LS + 100 + RW - 260, ty + 160, 18, { id: 'z' + z.id + 'b', rare: 1 }); }
/* ---------- a Csillagmélyi Város: lebegő szikla-szigeteken romos utcák, vízvezeték-hidak a szakadék felett, kupolás katedrális, csillagos ég ---------- */
function buildStar(z, zi) { const hc = 60, hw = Math.ceil(z.w / hc) + 1, hh = Math.ceil(z.h / hc) + 1, AB = -3000, hm = new Float32Array(hw * hh).fill(AB), X = z.x + 1900, Y = z.y + 1500, th = 'ko';
  const IS = [[X + 700, Y + 2400, 520, 0], [X + 2000, Y + 1500, 820, 40], [X + 2300, Y + 3350, 620, 60], [X + 3900, Y + 2300, 720, 30], [X + 4950, Y + 1100, 420, 80]];
  const BR = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]], edge = (p, q) => { const a = IS[p], b = IS[q], d = hyp(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / d, uy = (b[1] - a[1]) / d; return { a, b, d, ux, uy, x0: a[0] + ux * a[2] * .8, y0: a[1] + uy * a[2] * .8, L: d - (a[2] + b[2]) * .8 }; };
  const isH = (x, y) => { let h = AB; for (const [cx, cy, r, h0] of IS) { const d = hyp(x - cx, y - cy), rr = r * (1 + (fbm(x / 260 + zi, y / 260, 2) - .5) * .5); if (d < rr) h = Math.max(h, h0 + (fbm(x / 90, y / 90, 2) - .5) * 8); } return h; };
  const brs = BR.map(([p, q]) => edge(p, q));
  for (let j = 0; j < hh; j++) for (let i = 0; i < hw; i++) { const x = z.x + i * hc, y = z.y + j * hc; let h = isH(x, y);
    for (const e of brs) { const t = (x - e.a[0]) * e.ux + (y - e.a[1]) * e.uy, lat = Math.abs(-(x - e.a[0]) * e.uy + (y - e.a[1]) * e.ux); if (t > 0 && t < e.d && lat < 75) h = Math.max(h, lerp(e.a[3], e.b[3], clamp((t - e.a[2] * .6) / (e.d - (e.a[2] + e.b[2]) * .6), 0, 1))); }
    hm[i + j * hw] = h; }
  Object.assign(z, { hm, hc, hw, hh, star: 1 }); z.cells = []; const sd = zi * 31 + 7, Hs = (x, y) => zoneH(z, x, y), on = (x, y) => Hs(x, y) > -30;
  /* a hidak alatt többszintes vízvezetékek */
  for (const e of brs) PW('aqmega', e.a[0] + e.ux * e.a[2] * .55, e.a[1] + e.uy * e.a[2] * .55, 0, { a: Math.atan2(e.uy, e.ux), L: e.d - (e.a[2] + e.b[2]) * .55, top: Math.min(e.a[3], e.b[3]) - 2, base: AB, bw: 160 });
  /* távoli óriástornyok és a lebegő szikla a romtemplommal */
  const ZX = z.x + z.w / 2, ZY = z.y + z.h / 2;
  for (let k = 0; k < 18; k++) { const a = k / 18 * TAU + rnd(k, 1, 3) * .25, f = .4 + rnd(k, 2, 3) * .06; PW('megatower', ZX + Math.cos(a) * z.w * f, ZY + Math.sin(a) * z.h * f, 0, { h: 4200 + rnd(k, 4, 3) * 4200, r: 240 + rnd(k, 5, 3) * 320, a: rnd(k, 6, 3), base: AB - 200, broken: rnd(k, 7, 3) < .55 }); }
  for (const [fx, fy, r, b] of [[X + 3800, Y - 900, 620, 1400], [X - 1200, Y + 4300, 520, 1900], [X + 5600, Y + 4600, 760, 2400]]) PW('floatrock', fx, fy, 0, { r, base: b });
  /* a barlang: hatalmas sziklafalak körben, befelé hajló peremmel és cseppkövekkel – középen nyílik a csillagos „ég” */
  for (let k = 0; k < 30; k++) { const a = k / 30 * TAU, px = ZX + Math.cos(a) * z.w * .5, py = ZY + Math.sin(a) * z.h * .5; PW('cavewall', px, py, 0, { a: a + Math.PI, h: 7000 + rnd(k, 1, 4) * 3000, s: 900 + rnd(k, 2, 4) * 400, base: AB - 300 }); }
  /* romos utcák: utcarács, házfalak csonkjai, lámpák, szobrok, ledőlt oszlopok */
  const house = (hx, hy, w, d, k) => { const hgt = 130 + rnd(sd, k, 1) * 200, br = rnd(sd, k, 2); for (let s = 0; s < 4; s++) { if (rnd(sd, k, 10 + s) < .22) continue; const hor = s < 2, L2 = hor ? w : d, cx = hor ? hx : hx + (s === 2 ? -w / 2 : w / 2), cy = hor ? hy + (s === 0 ? -d / 2 : d / 2) : hy;
      if (s === 1) { const q = L2 / 2 - 40; WALL(cx - (L2 / 4 + 20), cy, q, 18, { dg: th, h: hgt * (br < .5 ? .6 : 1) }); WALL(cx + (L2 / 4 + 20), cy, q, 18, { dg: th, h: hgt }); } else WALL(cx, cy, hor ? L2 : 18, hor ? 18 : L2, { dg: th, h: hgt * (s === 3 && br < .35 ? .45 : 1) }); }
    if (rnd(sd, k, 20) < .5) PW('rubble', hx + 20, hy, 0); };
  for (const q of [1, 3, 0]) { const [cx, cy, r] = IS[q]; let k = q * 100; for (let gx = -r; gx <= r; gx += 280) for (let gy = -r; gy <= r; gy += 280) { const hx = cx + gx + 70, hy = cy + gy + 70; k++; if (!on(hx - 110, hy - 90) || !on(hx + 110, hy + 90) || !on(hx + 110, hy - 90) || !on(hx - 110, hy + 90)) continue; if (hyp(hx - cx, hy - cy) < 200 && q !== 1) continue; if (rnd(sd, k, 30) < .72) house(hx, hy, 180 + rnd(sd, k, 31) * 40, 150 + rnd(sd, k, 32) * 30, k); else { PW('statue', hx, hy, 26, { v: k % 4, broken: rnd(sd, k, 33) < .4 }); PW('tree', hx + 60, hy + 40, 18, { v: 9 }); } }
    for (let gx = -r; gx <= r; gx += 280) for (let gy = -r; gy <= r; gy += 280) { const lx = cx + gx - 70, ly = cy + gy - 70; if (on(lx, ly) && rnd(sd, gx | 0, gy | 0) < .55) PW('lamp', lx, ly, 8); } }
  for (let k = 0; k < 40; k++) { const q = IS[k % 5], a = rnd(k, 1, 51) * TAU, r = q[2] * (.3 + rnd(k, 2, 51) * .6), px = q[0] + Math.cos(a) * r, py = q[1] + Math.sin(a) * r; if (!on(px, py)) continue; PW(k % 3 ? 'colfall' : 'pillar', px, py, k % 3 ? 0 : 20, { a: rnd(k, 3, 51) * TAU, h: 160, broken: 1, dg: 1, mat: th }); }
  /* a szigetek peremén sziklák */
  for (let k = 0; k < 90; k++) { const q = IS[k % 5], a = rnd(k, 1, 61) * TAU, px = q[0] + Math.cos(a) * q[2] * 1.05, py = q[1] + Math.sin(a) * q[2] * 1.05; if (Hs(px, py) > -30) continue; PW('rock', px, py, 0, { r: 50 + rnd(k, 2, 61) * 60, rg: 'jeg' }); }
  /* kupolás katedrális a középső szigeten, előtte lépcsős tér */
  { const [cx, cy] = IS[2], dx = cx + 60, dy = cy - 60; PW('dome', dx, dy, 0, { s: .62 }); WALL(dx, dy, 400, 400, { nr: 1, h: 400 }); WALL(dx, dy, 560, 190, { nr: 1, h: 300 }); WALL(dx, dy, 190, 560, { nr: 1, h: 300 }); for (const s of [-1, 1]) PW('brazier', dx + s * 130, dy + 330, 14, { lit: 1 }); PW('chest', dx - 160, dy + 380, 18, { id: 'z' + z.id + 'b', rare: 1 }); }
  /* bejárat, tábortűz, végpont */
  const [ex, ey] = IS[0]; z.in = [ex - 250, ey]; PW('door', ex - 340, ey, 0, { z: z.id, out: 1, dk: 'stairs' }); ZFIRE.push([ex - 60, ey + 120, 'A Csillagmélyi Város']);
  const [fx, fy] = IS[4]; z.far = [fx, fy]; z.far2 = [fx + 120, fy]; PW('chest', fx, fy - 60, 18, { id: 'z' + z.id, rare: 1 }); PW('statue', fx - 120, fy - 140, 30, { v: 3 }); PW('statue', fx + 120, fy - 140, 30, { v: 2 }); PW('brazier', fx, fy + 120, 16, { lit: 1 });
  PW('msg', ex + 120, ey - 60, 0, { txt: 'Ez a város a víz alatt épült, amikor még volt víz. A csillagok a tenger tükörképei voltak – most csak ők maradtak.' }); PW('msg', IS[1][0], IS[1][1] + 200, 0, { txt: 'A Rend alapítói innen jöttek fel. A kutakat a csillagok vízéből fakasztották.' });
  for (let q = 0; q < 5; q++) { const [cx, cy, r] = IS[q]; for (let k = 0; k < (q === 1 || q === 3 ? 5 : 3); k++) { const a = rnd(q, k, 71) * TAU, rr = r * (.2 + rnd(q, k, 72) * .55), px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr; if (on(px, py) && q + k > 0) z.cells.push([px, py, 2 + q]); } } }
function buildMely(z, zi) { buildBar(z, zi, 1); const hc = z.hc, I = (x, y) => Math.round((x - z.x) / hc) + Math.round((y - z.y) / hc) * z.hw;
  /* szabad út a lejárattól a Szívig, és a szívterem */
  const H0 = [z.x + 1200, z.y + 340]; for (let y = H0[1]; y < HEART[1]; y += hc) for (let dx = -180; dx <= 180; dx += hc) { const k = I(H0[0] + dx + Math.sin(y / 300) * 120, y); if (k >= 0 && k < z.hm.length) z.hm[k] = Math.min(z.hm[k], 6 * Math.sin(y / 90)); }
  for (let j = 0; j < z.hh; j++) for (let i = 0; i < z.hw; i++) { const x = z.x + i * hc, y = z.y + j * hc, d = hyp(x - HEART[0], y - HEART[1]); if (d < 620) z.hm[i + j * z.hw] = Math.min(z.hm[i + j * z.hw], -30 * (1 - d / 620)); else if (d < 760) z.hm[i + j * z.hw] = Math.max(z.hm[i + j * z.hw], 0); }
  z.in = H0; PW('door', z.in[0], z.in[1] - 160, 0, { z: z.id, out: 1, up: 1, big: 1, dk: 'stairs' }); PW('well', z.x + 1000, z.y + 1000, 26, { dry: 1 });
  PW('msg', z.x + 1200, z.y + 700, 0, { txt: 'A Kísérletezők Útja. Mind lejöttek idáig. Tovább egyik sem.' }); PW('msg', z.x + 1000, z.y + 1100, 0, { txt: 'A Csontos Szökőkút. A Rend szentélye volt.' }); PW('page', z.x + 1420, z.y + 1300, 0, { i: 11, txt: PAGES[11][1] }); PW('heart', HEART[0], HEART[1] - 180, 46);
  for (let k = 0; k < 40; k++) PW('statue', z.x + 1200 + (k % 2 ? 140 : -140) + Math.sin((z.y + 560 + k * 40) / 300) * 120, z.y + 560 + k * 40, 14, { v: rnd(k, 1, 61), dust: 1, a: k % 2 ? Math.PI : 0 }); }

/* ---------- a világ ---------- */
function buildWorld() {
  buildRoads();
  /* az Utolsó Kút: a kráter közepén, beomlott kolostorudvar */
  addPad(HUB[0], HUB[1], 700, 300); for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; if (Math.abs(Math.atan2(Math.sin(a - 1.57), Math.cos(a - 1.57))) < .2) continue; PW('pillar', HUB[0] + Math.cos(a) * 720, HUB[1] + Math.sin(a) * 640, 24, { h: FH * (k % 2 ? 2.4 : 1.6), broken: rnd(k, 2, 7) > .45, mat: 'ko' }); }
  PW('anvil', HUB[0] + 400, HUB[1] - 170, 16); PW('cart', HUB[0] - 430, HUB[1] - 150, 40); PW('crate', HUB[0] - 540, HUB[1] - 20, 16); PW('spire', HUB[0], HUB[1] - 260, 40);
  for (const [dx, dy, w, d] of [[-560, -560, 420, 30], [520, -560, 360, 30], [-760, 300, 30, 380]]) WALL(HUB[0] + dx, HUB[1] + dy, w, d, { h: 140, mat: 'ko', cren: 0 });
  /* tábortüzek, arénák */
  FIRES.forEach((f, i) => { if (f[0] < OW) poi(f[0], f[1], 170); });
  for (const k in LORD) { const l = LORD[k]; if (l[0] < OW) addPad(l[0], l[1], l[2] + 80, 260); }
  const city = buildCity();
  castle('c_gaspar', LORD.gaspar[0], LORD.gaspar[1] - 120, 960, 'ko', 1, { dz: 'k_gaspar', uz: 'u_gaspar', rg: 'mez' }); castle('c_denes', LORD.denes[0], LORD.denes[1] - 80, 920, 'feher', 1, { dz: 'k_denes', uz: 'u_denes', rg: 'nap' });
  castle('c_klara', LORD.klara[0], LORD.klara[1] - 80, 920, 'jeg', 1, { dz: 'k_klara', uz: 'u_klara', rg: 'jeg' }); castle('c_lorinc', LORD.lorinc[0], LORD.lorinc[1] - 60, 960, 'so', 1, { dz: 'k_lorinc', uz: 'u_lorinc', rg: 'so' });
  /* Szikkadt Mezők: Kalászvég, malmok, Varjúdomb, Gáspár udvarháza */
  const V = (x, y, w, d, o) => { const p = sc([x, y]), b = bld(p[0], p[1], w, d, { roof: 1, dmg: .05, ...o }); furnish(b); return b; };
  V(8100, 3640, 260, 180, { mat: 'fa' }); V(8480, 3650, 240, 170, { mat: 'fa', doors: [1] }); V(8110, 3900, 240, 170, { mat: 'fa', doors: [0] }); V(8500, 3920, 260, 180, { mat: 'fa', doors: [0] }); KCH = V(8300, 3560, 400, 220, { kind: 'church', mat: 'ko', doors: [2], dmg: .25 });
  for (const q of [[7900, 4350], [8850, 4400], [8700, 2980]]) { const p = sc(q); PW('mill', p[0], p[1], 50, { big: q[1] < 3000 }); addPad(p[0], p[1], 140, 140); }
  for (const q of [[8880, 3180], [8990, 3230], [8930, 3300]]) { const p = sc(q); PW('gallows', p[0], p[1], 12); }
  { const g = LORD.gaspar; for (let k = 0; k < 26; k++) { const a = k / 26 * TAU; if (Math.abs(a - 1.2) < .2) continue; PW('pillar', g[0] + Math.cos(a) * g[2], g[1] + Math.sin(a) * g[2], 18, { h: 90, broken: 1, mat: 'sotet' }); } }
  for (const q of [[7100, 4080], [7180, 4160]]) { const p = sc(q); PW('tent', p[0], p[1], 40); }
  /* Rézlápa: Kannaváros, a Süllyedt Bazilika tornya, Békasziget */
  V(5220, 5560, 220, 160, { can: 1, mat: 'fa' }); V(5420, 5550, 210, 150, { can: 1, mat: 'fa', doors: [0] }); V(5230, 5720, 210, 150, { can: 1, mat: 'fa' }); V(5440, 5730, 220, 160, { can: 1, mat: 'fa', doors: [0] });
  { const p = sc([4330, 5830]); PW('tower', p[0], p[1], 60, { sunk: 1, mat: 'sar' }); } PW('flower', BEKA[0] + 40, BEKA[1] - 10, 0); addPad(BEKA[0], BEKA[1], 220, 160, LAPW + 8);
  /* Napszúrt Fennsík: a Napórák Erődje, árnyékárusok */
  { const l = LORD.denes; for (let k = 0; k < 30; k++) { const a = k / 30 * TAU; if (Math.abs(a - 1.57) < .15) continue; PW('pillar', l[0] + Math.cos(a) * l[2], l[1] + Math.sin(a) * l[2], 24, { h: FH * 2.4, mat: 'feher', broken: rnd(k, 4, 7) > .8 }); } PW('sundial', l[0], l[1] - 200, 34); }
  for (const q of [[4930, 1640], [5080, 1700]]) { const p = sc(q); PW('tent', p[0], p[1], 40); } { const p = sc([5010, 1790]); PW('stall', p[0], p[1], 26); }
  /* Csontpart: roncsok, Fenékváros */
  for (const [x, y, f] of [[1900, 5330, 1], [1350, 5450, -1], [2450, 6050, 1], [900, 6720, -1], [2650, 6800, 1], [700, 5250, 1], [1600, 6500, 1], [400, 6100, -1]]) { const p = sc([x, y]); PW('wreck', p[0], p[1], 0, { f, a: rnd(x, y, 1) * TAU }); }
  V(2100, 5920, 240, 170, { mat: 'homok', dmg: .3 }); V(2300, 5930, 250, 170, { mat: 'homok', dmg: .3, doors: [0] }); V(2190, 6090, 240, 170, { mat: 'homok', dmg: .3 });
  /* Kaktuszerdő: a Tüskés Szentély, a Tölgyharang */
  { const l = LORD.kaktusz; for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; if (Math.abs(a - 1.57) < .2) continue; addO({ t: 'tree', v: 1, x: l[0] + Math.cos(a) * l[2], y: l[1] + Math.sin(a) * l[2], r: 17, s: 1.3 + rnd(k, 3, 9) * .4, solid: 1, rot: a }); } }
  { const p = sc([7500, 1300]); PW('belltree', p[0], p[1], 26); poi(p[0], p[1], 120); const q = sc([8300, 1050]); PW('altar', q[0], q[1], 26); poi(q[0], q[1], 120); }
  /* Jégorom: kolostor, falu, megfagyott vízesések */
  { const l = LORD.klara; for (let k = 0; k < 26; k++) { const a = k / 26 * TAU; if (Math.abs(a - 1.57) < .2) continue; addO({ t: 'tree', v: 6, x: l[0] + Math.cos(a) * l[2], y: l[1] + Math.sin(a) * l[2], r: 16, s: 1.2 + rnd(k, 3, 11) * .5, solid: 1, rot: a }); } }
  for (const q of [[500, 200], [1500, 180], [2400, 210], [900, 190], [2000, 170]]) { const p = sc(q); PW('icefall', p[0], p[1], 60); }
  V(2190, 1420, 240, 170, { mat: 'jeg', snow: 1 }); V(2400, 1410, 230, 160, { mat: 'jeg', snow: 1, doors: [0] }); V(2200, 1600, 230, 160, { mat: 'jeg', snow: 1 }); { const p = sc([2560, 1300]); PW('box', p[0], p[1], 18); }
  /* Égő Partvidék: Sókatedrális, Lőrinc arénája */
  { const l = LORD.lorinc; for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; if (Math.abs(a - 1.57) < .2) continue; addO({ t: 'tree', v: 7, x: l[0] + Math.cos(a) * l[2], y: l[1] + Math.sin(a) * l[2], r: 16, s: 1.3 + rnd(k, 3, 13) * .6, solid: 1, rot: a }); } }
  { const l = LORD.iszap; addPad(l[0], l[1], l[2] + 60, 200, LAPW - 14); } { const l = LORD.fereg; for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; PW('ribs', l[0] + Math.cos(a) * (l[2] + 90), l[1] + Math.sin(a) * (l[2] + 90), 0, { a: a + 1.57, s: 1.2 }); } }
  /* a Mély: a nagy lejárat a szakadék alján */
  addPad(KWELL[0], KWELL[1], 320, 300); PW('bigwell', KWELL[0], KWELL[1], 70, { mely: 1 });
  /* zóna-bejáratok a felszínen: torony, kripta, barlangszáj */
  for (const z of ZONES) { if (!z.at || z.par || z.kas) continue; if (z.open) { PW('door', z.at[0], z.at[1], 0, { z: z.id, big: 1, dk: 'shaft' }); continue; } if (z.proc) continue;
    const [x, y] = z.at; if (z.id === 'malom') { const m = sc([8700, 2980]); PW('door', m[0] + 110, m[1] + 70, 0, { z: z.id, dk: 'hatch' }); z.at = [m[0] + 110, m[1] + 70]; continue; } if (z.kind === 'tor') { PW('bigtower', x, y - 120, 150, { lv: z.lv, mat: MATS[biomeW(x, y).k], light: z.id === 'vilagito' }); PW('door', x, y + 40, 0, { z: z.id, up: 1, dk: 'gate' }); addPad(x, y - 60, 300, 220); }
    else if (z.kind === 'bar') { PW('cave', x, y - 140, 0, {}); PW('door', x, y - 30, 0, { z: z.id, dk: 'cave' }); addPad(x, y, 200, 200); }
    else { const b = bld(x, y - 40, 300, 240, { kind: 'crypt', dmg: .3, mat: MATS[biomeW(x, y).k] || 'ko', roof: 1, doors: [1], seed: z.id.length * 97 }); PW('door', x, y - 80, 0, { z: z.id, dk: 'hatch', b: b.id }); } }
  /* romok szerte a szigeten */
  const okR = (x, y, m) => { if (land(x, y) < .1) return false; const w = biomeW(x, y); if (w.ku > 0 || w.bk > 0) return false; if (x > city.X0 - 600 && x < city.X1 + 600 && y > city.Y0 - 600 && y < city.Y1 + 600) return false;
    if (roadD(x, y) < m * .6) return false; if (inPad(x, y, m)) return false; for (const r of RUINS) if (hyp(x - r[0], y - r[1]) < 950) return false; let lo = 1e9, hi = -1e9; for (const [dx, dy] of [[0, 0], [-m, 0], [m, 0], [0, -m], [0, m]]) { const h = Hraw(x + dx, y + dy); lo = Math.min(lo, h); hi = Math.max(hi, h); } return hi - lo < m * .45; };
  for (let k = 0, n = 0; k < 4000 && n < 250; k++) { const x = 600 + rnd(k, 1, 71) * (OW - 1200), y = 600 + rnd(k, 2, 71) * (OH - 1200); if (!okR(x, y, 340)) continue; n++; ruin(x, y, biomeW(x, y).k, n); }
  /* magas vízvezeték-romok a hegyvidékeken */
  { let n = 0; for (let k = 0; k < 900 && n < 11; k++) { const rg = ['jeg', 'kak', 'so', 'mely', 'nap', 'mez', 'jeg', 'kak'][k % 8], c0 = RK[rg].c, a = rnd(k, 3, 41) * TAU, dd = 1500 + rnd(k, 4, 41) * 3800, x = c0[0] + Math.cos(a) * dd, y = c0[1] + Math.sin(a) * dd, L = 1300 + rnd(k, 5, 41) * 900, hz = rnd(k, 6, 41) < .5;
      if (biomeW(x, y).k !== rg || land(x, y) < .15) continue; const ok = [0, .25, .5, .75, 1].every(t => { const px = hz ? x - L / 2 + t * L : x, py = hz ? y : y - L / 2 + t * L; return land(px, py) > .1 && !inPad(px, py, 200) && roadD(px, py) > 120 && !RUINS.some(r => hyp(r[0] - px, r[1] - py) < 500); }); if (!ok) continue; if (aqueduct(x, y, L, hz, n)) n++; } }
  /* eldugott pincék a romok alatt */
  const cand = RUINS.filter(r => r[3] && r[3].b && r[3].b.kind !== 'crypt'); ZONES.filter(z => z.proc).forEach((z, i) => { const r = cand[(i * 13 + 5) % cand.length], b = r[3].b, k = r[2]; z.at = [b.x - b.w / 4, b.y + 16]; z.t = clamp(RK[k].t + 1, 1, 9); z.th = { lap: 'sar', jeg: 'jeg', so: 'so', mely: 'mely', kak: 'gy', mez: 'fa' }[k] || 'ko'; z.rg = k; PW('door', z.at[0], z.at[1], 0, { z: z.id, dk: 'hatch', b: b.id }); r[3].cellar = z.id; });
  /* a krónika töredékei: egy-egy őrzött láda a Szárazurak vidékén */
  for (const k of ['iszap', 'denes', 'rozalia', 'fereg', 'kaktusz', 'klara', 'lorinc']) { const l = LORD[k], rg = biomeW(l[0], l[1]).k; let best = null, bs = 1e9; for (const r of RUINS) { const inf = r[3]; if (!inf || !inf.b || inf.b.kind === 'crypt' || inf.cellar || inf.rv || r[2] !== rg && k !== 'rozalia') continue; const dd = Math.abs(hyp(r[0] - l[0], r[1] - l[1]) - 2600); if (dd < bs) { bs = dd; best = r; } }
    if (!best) best = RUINS.find(r => r[3] && r[3].b && !r[3].rv); best[3].rv = k; const b = best[3].b; RVC[k] = [b.x + 30, b.y]; PW('chest', b.x + 30, b.y, 18, { id: 'rv_' + k, rv: k, b: b.id }); }
  /* térképkutak tájanként */
  for (const r of REGS) { let best = null; for (let k = 0; k < 60; k++) { const a = rnd(k, r.t, 5) * TAU, d = 600 + rnd(k, r.t, 6) * 1800, x = r.c[0] + Math.cos(a) * d, y = r.c[1] + Math.sin(a) * d; if (land(x, y) < .1 || inPad(x, y, 150)) continue; const rd = roadD(x, y); if (rd < 180 || rd > 500) continue; best = [x, y]; break; }
    if (!best) best = [r.c[0] + 300, r.c[1] + 300]; WELLS.push([best[0], best[1], r.k]); poi(best[0], best[1], 130); PW('kut', best[0], best[1], 34, { k: r.k }); }
  /* további tábortüzek: romoknál, kereszteződéseknél */
  const extra = []; for (const r of REGS) { let c = 0; for (const q of RUINS) { if (c >= 3 || q[2] !== r.k || !q[3] || !q[3].b) continue; if (FIRES.some(f => hyp(f[0] - q[0], f[1] - q[1]) < 3500) || extra.some(f => hyp(f[0] - q[0], f[1] - q[1]) < 3500)) continue; const f = [q[0] + q[3].b.w / 2 + 120, q[1] + 60, r.n.charAt(0) + r.n.slice(1).toLowerCase() + ' · ' + ['Omladék', 'Csonka torony', 'Néma ház', 'Hamuudvar', 'Kőkapu'][c + r.t & 3]]; extra.push(f); poi(f[0], f[1], 120); c++; } }
  /* zónák belseje */
  ZONES.forEach((z, zi) => { if (z.open) buildMely(z, zi); else if (z.kind === 'kat') buildKat(z, zi); else if (z.kind === 'bar') buildBar(z, zi); else if (z.kast) buildKast(z, zi); else if (z.kind === 'star') buildStar(z, zi); else buildTor(z, zi); });
  for (const z of ZONES) if (z.par) { const p = ZK[z.par]; z.at = [p.far2[0], p.far2[1] + 40]; PW('door', p.far2[0], p.far2[1], 0, { z: z.id, dk: p.kind === 'bar' ? 'cave' : 'stairs', down: 1 }); }
  for (const f of [...extra, ...ZFIRE]) { FIRES.push([f[0], f[1]]); FIRE_N.push(f[2]); }
  FIRES.forEach((f, i) => PW('fire', f[0], f[1], i === 2 ? 0 : 22, { i, hub: i === 2 }));
  /* feliratok, lapok, harmatgyűjtők, ládák */
  for (const [x, y, txt] of MSGS) { PW('msg', x, y, 0, { txt }); poi(x, y, 80); }
  DEWS.forEach((p, i) => { PW('dew', p[0], p[1], 0, { i }); poi(p[0], p[1], 90); }); for (const [id, x, y] of CHESTS) { PW('chest', x, y, 18, { id }); poi(x, y, 80); }
  PAGES.forEach((p, i) => { if (typeof p[0] === 'number') { const q = sc([p[0], p[1]]); PW('page', q[0], q[1], 0, { i, txt: p[2] }); poi(q[0], q[1], 80); } });
  for (const z of ZONES) if (z.at && !z.par && z.at[0] < OW) poi(z.at[0], z.at[1], 120);
  for (const k in LORD) CLEAR.push([LORD[k][0], LORD[k][1], LORD[k][2] + 80]); for (const f of FIRES) CLEAR.push([f[0], f[1], 200]); CLEAR.push([HUB[0], HUB[1], 800]);
}
/* a szereplők helye után: ösvények minden fontos ponthoz, majd a domborzat véglegesítése */
/* az NPC-k helye: mesterségükre utaló tárgyak körülöttük (mögöttük, hogy elölről szabadon megközelíthetők maradjanak) */
const NPCSET = {
  bence: [['forge', -90, -95, 34], ['rack', 95, -95, 0], ['crate', -140, 0, 15], ['crate', -145, 35, 15], ['barrel', 120, 10, 12], ['dummy', 150, -40, 0], ['sign', 60, -130, 0, { k: 'kard' }]],
  ilona: [['stall', 0, -80, 26], ['crate', -85, -40, 15], ['crate', -95, -5, 15], ['barrel', 80, -40, 12], ['pot', 62, 8, 0], ['pot', 74, 22, 0], ['sign', -120, -95, 0, { k: 'erme' }]],
  erzs: [['pot', -70, -30, 0], ['pot', -82, -18, 0], ['candles', -40, -60, 0], ['sign', 60, -70, 0, { k: 'csepp' }]],
  ambrus: [['tent', 0, -130, 40], ['banner', -75, -70, 0], ['rack', 75, -80, 0], ['dummy', 110, 30, 0], ['brazier', -70, 40, 14, { lit: 1 }], ['sign', -130, -40, 0, { k: 'kard2' }]],
  par1: [['barrel', 50, -40, 12], ['crate', 80, -10, 15]], par2: [['pot', -40, -40, 0], ['pot', -55, -30, 0], ['bench', 0, -60, 0]], par3: [['bench', 0, -55, 0], ['pot', 40, -30, 0]], juli: [['bench', 0, -55, 0]],
  hanna: [['pot', -50, -40, 0], ['pot', -64, -28, 0], ['pot', 52, -38, 0], ['candles', 0, -60, 0], ['sign', 90, -70, 0, { k: 'csepp' }]],
  kornel: [['altar', 0, -80, 22], ['candles', -45, -70, 0], ['candles', 45, -70, 0], ['pot', -70, -20, 0], ['pot', -82, -8, 0], ['pot', 70, -20, 0], ['sign', 110, -60, 0, { k: 'kanna' }]],
  kalman: [['bush', -60, -50, 0], ['bush', 60, -60, 0], ['bush', 0, -90, 0], ['pot', -80, 10, 0], ['pot', 80, 10, 0]],
  pal: [['tent', 0, -130, 40], ['stall', 80, -50, 26], ['crate', -80, -40, 15], ['crate', -90, -5, 15], ['brazier', -60, 50, 12, { lit: 1 }], ['sign', 150, -60, 0, { k: 'erme' }]],
  ferenc: [['altar', 0, -80, 24], ['candles', -45, -65, 0], ['candles', 45, -65, 0], ['bench', -60, 40, 0], ['bench', 60, 40, 0], ['sign', 100, -60, 0, { k: 'kereszt' }]],
  marton: [['barrel', -60, -40, 12], ['barrel', -75, -10, 12], ['barrel', 60, -45, 12], ['crate', 85, -15, 15], ['sign', 120, -60, 0, { k: 'horgony' }]],
  terez: [['tent', 0, -120, 40], ['pot', -55, -30, 0], ['pot', 55, -30, 0]], panni: [['bench', 0, -55, 0], ['crate', 50, -30, 15]], gyula: [['brazier', 50, 30, 14, { lit: 1 }], ['bench', -40, -50, 0]],
  vince: [['tomb', -80, -90, 0, { v: .3 }], ['tomb', 0, -110, 0, { v: .7 }], ['tomb', 80, -90, 0, { v: .5 }], ['bones', -110, -20, 0], ['candles', 0, -70, 0], ['sign', 120, -40, 0, { k: 'kereszt' }]],
  lukacs: [['table', 0, -60, 0], ['candles', 0, -60, 0], ['shelf', -70, -95, 0], ['shelf', 70, -95, 0], ['sign', -110, -40, 0, { k: 'konyv' }]],
  kristof: [['brazier', 60, 30, 14, { lit: 1 }], ['crate', -60, -40, 15], ['barrel', -80, 0, 12]] };
function npcProps() { for (const n of NPCS) { const L = NPCSET[n.id]; if (!L) continue; for (const [t, dx, dy, r, o] of L) PW(t, n.x + dx, n.y + dy, r, { ...(o || {}), npcp: 1 }); } }
function finishWorld() { npcProps(); for (const p of POIS) trailTo(p[0], p[1]);
  /* a telkek magassága az utak után, sorrendben: a későbbi telek a már elegyengetett talajhoz igazodik */
  for (const p of PADS) if (p[5]) p[6] = 0; for (const p of PADS) if (p[5]) { p[4] = Hcalc(p[0], p[1]); p[6] = 1; } for (const b of BLDS) b.base = b.pad[4]; HREADY = true; }
