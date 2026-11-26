// Locsoló Város – a város adatai (determinisztikus): rács, kerületek, domborzat, folyó, utak, épületek, ütközők, járható felületek
export const HALF = 800, PITCH = 100, ROADW = 14, SIDEW = 3.2, N = 16;          // 16×16 tömb, 100 m-es rács
export const RIV0 = 425, RIV1 = 475;                                             // a Sajó medre (z)
export const BRIDGES = [-600, -200, 200, 600];                                   // hidak x-e
export const AVAS = { x: 500, z: -500, r: 230, h: 64 };                          // Avas-domb
export const MOTOR_X = -860;                                                     // autópálya
export const LINES = Array.from({ length: N + 1 }, (_, i) => -HALF + i * PITCH);

export function rng(seed) { let s = seed | 0; return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* ---------- domborzat ---------- */
export function terrain(x, z) {
  const dx = x - AVAS.x, dz = z - AVAS.z, d = Math.sqrt(dx * dx + dz * dz);
  let h = AVAS.h * Math.exp(-((d / (AVAS.r * .78)) ** 2));
  h += Math.sin(x * .004) * Math.cos(z * .0035) * 1.2;
  const out = Math.max(Math.abs(x) - HALF - 40, Math.abs(z) - HALF - 40);
  if (out > 0) h += 70 * (1 - Math.exp(-out / 140)) * (1 + .3 * Math.sin(Math.atan2(z, x) * 7 + x * .002)) + out * .02;   // a város széle körül dombok
  const rz = (RIV0 + RIV1) / 2, rw = (RIV1 - RIV0) / 2, rd = Math.abs(z - rz);
  if (rd < rw + 6 && Math.abs(x) < HALF + 200) h = Math.min(h, -1 - 4 * (1 - smooth(rw - 10, rw + 4, rd)));
  return h;
}
export const onBridge = (x, z) => z > RIV0 - 8 && z < RIV1 + 8 && BRIDGES.some(b => Math.abs(x - b) < ROADW / 2 + 1.5);
export const deckY = 2.2;
export const deckAt = z => deckY * Math.min(smooth(RIV0 - 12, RIV0 + 2, z), 1 - smooth(RIV1 - 2, RIV1 + 12, z));
export function groundY(x, z) { const t = terrain(x, z); return onBridge(x, z) ? Math.max(t, deckAt(z)) : t; }
export const inRiver = (x, z) => z > RIV0 && z < RIV1 && Math.abs(x) < HALF + 200 && !onBridge(x, z);

/* ---------- kerületek ---------- */
export function district(cx, cz) {
  if (cz > RIV0 - 30 && cz < RIV1 + 30) return 'folyo';
  if (Math.hypot(cx - AVAS.x, cz - AVAS.z) < AVAS.r) return 'avas';
  if (cz > 500) return 'kertes';
  if (Math.abs(cx) <= 300 && cz >= -300 && cz <= 400) return 'belvaros';
  if (cx < -300 && cz > -300) return 'panel';
  if (cx > 300 && cz > -260) return 'ipari';
  return 'kertes';
}
export const DNAME = { belvaros: 'Belváros', panel: 'Panelnegyed', ipari: 'Ipari zóna', kertes: 'Kertváros', avas: 'Avas', folyo: 'Sajó-part', autopalya: 'Autópálya' };
export function districtAt(x, z) { if (x < -HALF - 20) return 'autopalya'; const cx = Math.floor((x + HALF) / PITCH) * PITCH - HALF + 50, cz = Math.floor((z + HALF) / PITCH) * PITCH - HALF + 50; return district(cx, cz); }

/* ---------- utak ---------- */
// vízszintes (z = állandó) és függőleges (x = állandó) szakaszok két kereszteződés között
export function roadExists(a, b) {   // a, b: rácspontok [x, z]
  const [x0, z0] = a, [x1, z1] = b;
  if (x0 === x1) { const lo = Math.min(z0, z1), hi = Math.max(z0, z1); if (lo < RIV1 && hi > RIV0) return BRIDGES.includes(x0); return true; }
  return true;
}
export const ROADS = [];      // { a:[x,z], b:[x,z], dir:'x'|'z', w, hw (autópálya) }
export const NODES = new Map();
const key = (x, z) => x + ',' + z;
for (const x of LINES) for (const z of LINES) NODES.set(key(x, z), { x, z, n: [] });
for (let i = 0; i < LINES.length; i++) for (let j = 0; j < LINES.length; j++) {
  const x = LINES[i], z = LINES[j];
  if (i < N && NODES.has(key(x, z)) && NODES.has(key(LINES[i + 1], z)) && roadExists([x, z], [LINES[i + 1], z])) ROADS.push({ a: [x, z], b: [LINES[i + 1], z], dir: 'x', w: ROADW });
  if (j < N && roadExists([x, z], [x, LINES[j + 1]])) ROADS.push({ a: [x, z], b: [x, LINES[j + 1]], dir: 'z', w: ROADW, bridge: z === 400 ? 1 : 0 });
}
// autópálya + lehajtó (z = -100)
for (const z of LINES) if (z < HALF) ROADS.push({ a: [MOTOR_X, z], b: [MOTOR_X, z + PITCH], dir: 'z', w: 22, hw: 1 });
ROADS.push({ a: [MOTOR_X, -100], b: [-HALF, -100], dir: 'x', w: ROADW, ramp: 1 });
for (const z of LINES) NODES.set(key(MOTOR_X, z), { x: MOTOR_X, z, n: [], hw: 1 });
for (const r of ROADS) { const A = NODES.get(key(...r.a)), B = NODES.get(key(...r.b)); if (A && B) { A.n.push(B); B.n.push(A); r.A = A; r.B = B; } }
export const nodeAt = (x, z) => NODES.get(key(x, z));
// jelzőlámpás kereszteződések: ahol legalább 3 út fut be, a belvárosban/panelben/iparban
export const LIGHTS = [...NODES.values()].filter(n => n.n.length >= 3 && !n.hw && Math.abs(n.x) < HALF && Math.abs(n.z) < HALF && ['belvaros', 'panel', 'ipari'].includes(district(n.x + 1, n.z + 1)) && (n.x / 100 + n.z / 100) % 2 === 0);
LIGHTS.forEach((n, i) => { n.light = { ph: i * 3.7 }; });
// lámpafázis: 0 = É-D zöld, 1 = É-D sárga, 2 = K-Ny zöld, 3 = K-Ny sárga
export function lightState(n, t) { const c = (t + n.light.ph) % 26; return c < 11 ? 0 : c < 13 ? 1 : c < 24 ? 2 : 3; }

/* ---------- utak közelsége ---------- */
export function roadAt(x, z) {   // van-e út a ponton (útburkolat), és ha igen melyik tengely
  for (const L of LINES) { if (Math.abs(x - L) < ROADW / 2) { const zz = Math.max(-HALF, Math.min(HALF, z)); if (Math.abs(zz - z) < 1 && !(z > RIV0 && z < RIV1 && !BRIDGES.includes(L))) return 'z'; } }
  for (const L of LINES) { if (Math.abs(z - L) < ROADW / 2 && Math.abs(x) <= HALF + ROADW / 2) return 'x'; }
  if (Math.abs(x - MOTOR_X) < 11 && Math.abs(z) <= HALF) return 'z';
  if (Math.abs(z + 100) < ROADW / 2 && x < -HALF && x > MOTOR_X) return 'x';
  return null;
}

/* ---------- különleges helyek ---------- */
export const PLACES = {
  hgws: { x: 150, z: 50, n: 'HGWS-központ' },
  szerviz1: { x: -250, z: -150, n: 'Locsolófej Szerviz – Belváros' },
  szerviz2: { x: 350, z: -350, n: 'Locsolófej Szerviz – Avas alja' },
  atemelo1: { x: 550, z: 150, n: '1-es szennyvízátemelő' },
  atemelo2: { x: 650, z: -150, n: '2-es szennyvízátemelő' },
  raktar: { x: 650, z: 250, n: 'Szilárd raktára' },
  kilato: { x: AVAS.x, z: AVAS.z, n: 'Avasi kilátó' },
  zero: { x: -550, z: 150, n: '' },
  piac: { x: -50, z: -50, n: 'Városháza tér' }
};
export const PROPS_FOR_SALE = [
  { id: 'g1', n: 'Panelgarázs', x: -450, z: -50, price: 8000, inc: 120 },
  { id: 'g2', n: 'Sajó-parti csónakház', x: -350, z: 550, price: 15000, inc: 260 },
  { id: 'g3', n: 'Ipari csarnok', x: 450, z: 50, price: 30000, inc: 520 },
  { id: 'g4', n: 'Avasi villa', x: 650, z: -650, price: 60000, inc: 900 }
];
const placeAt = (cx, cz) => Object.entries(PLACES).find(([, p]) => p.x === cx && p.z === cz)?.[0] || (PROPS_FOR_SALE.find(p => p.x === cx && p.z === cz) ? 'prop' : null);

/* ---------- épületek ---------- */
// a tömbök belseje: [cx-43, cx+43] (út + járda kívül)
export const BLOCKS = [];         // { cx, cz, dist, place, b:[épületek], props:[] }
export const COLL = new Map();    // 20 m-es rács → AABB-k (épületek, falak, korlátok): { x0, z0, x1, z1, y1 (teteje), roof }
export const RAMPS = [];          // járható rámpák: { x0,z0,x1,z1, ax:'x'|'z', h0, h1 }
const CS = 20, ck = (i, j) => i * 65536 + j;
export function addColl(c) { for (let i = Math.floor(c.x0 / CS); i <= Math.floor(c.x1 / CS); i++) for (let j = Math.floor(c.z0 / CS); j <= Math.floor(c.z1 / CS); j++) { const k = ck(i, j); let l = COLL.get(k); if (!l) COLL.set(k, l = []); l.push(c); } }
export function collNear(x, z, r, fn) { const seen = new Set(); for (let i = Math.floor((x - r) / CS); i <= Math.floor((x + r) / CS); i++) for (let j = Math.floor((z - r) / CS); j <= Math.floor((z + r) / CS); j++) { const l = COLL.get(ck(i, j)); if (l) for (const c of l) if (!seen.has(c)) { seen.add(c); fn(c); } } }

function genBlock(cx, cz) {
  const dist = district(cx, cz), place = placeAt(cx, cz), r = rng(cx * 7919 + cz * 104729 + 17), B = { cx, cz, dist, place, b: [], props: [] };
  const g0 = terrain(cx, cz), inner = 43 - SIDEW, x0 = cx - inner, z0 = cz - inner, x1 = cx + inner, z1 = cz + inner;
  const bld = (x, z, w, d, h, style, roof = 'flat', extra = {}) => { const y0 = Math.min(terrain(x - w / 2, z - d / 2), terrain(x + w / 2, z - d / 2), terrain(x - w / 2, z + d / 2), terrain(x + w / 2, z + d / 2), terrain(x, z)) - .3; const o = { x, z, w, d, h, y0, style, roof, ...extra }; B.b.push(o); addColl({ x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2, y0, y1: y0 + h + (roof === 'flat' ? .9 : 0), roof: roof === 'flat', b: o }); return o; };
  const prop = (t, x, z, a = 0, s = 1) => B.props.push({ t, x, z, a, s, y: groundY(x, z) });
  const trees = (n, margin = 4) => { for (let i = 0; i < n; i++) prop('tree', x0 + margin + r() * (x1 - x0 - margin * 2), z0 + margin + r() * (z1 - z0 - margin * 2), r() * 6.28, .8 + r() * .6); };
  // utcabútor a járdán
  if (dist !== 'folyo') for (let k = 0; k < 4; k++) { const s = k < 2 ? -1 : 1, alongX = k % 2 === 0;
    for (let t = -34; t <= 34; t += 34) { const px = alongX ? cx + t : cx + s * (43 - 1), pz = alongX ? cz + s * (43 - 1) : cz + t; prop('lamp', px, pz, alongX ? (s > 0 ? 0 : Math.PI) : (s > 0 ? Math.PI / 2 : -Math.PI / 2)); }
    if (r() < .35) { const t = (r() - .5) * 50; prop('hydrant', alongX ? cx + t : cx + s * 41.6, alongX ? cz + s * 41.6 : cz + t); }
    if (dist === 'belvaros' && r() < .5) { const t = (r() - .5) * 50; prop('bench', alongX ? cx + t : cx + s * 41.4, alongX ? cz + s * 41.4 : cz + t, alongX ? 0 : Math.PI / 2); }
    if (r() < .3) { const t = (r() - .5) * 60; prop('bin', alongX ? cx + t : cx + s * 41.8, alongX ? cz + s * 41.8 : cz + t); } }
  if (place === 'hgws') {
    bld(cx - 14, cz + 8, 46, 30, 22, 'hgws', 'flat', { sign: 'HGWS', statue: 1 });
    bld(cx + 24, cz + 8, 26, 30, 7, 'hgwsg', 'flat', { garage: 1, helipad: 1 });
    RAMPS.push({ x0: cx + 37.5, z0: cz - 7, x1: cx + 41.5, z1: cz + 23, ax: 'z', h0: g0 + .05, h1: g0 + 7.9 });
    prop('tree', cx - 30, cz - 30); prop('tree', cx - 10, cz - 32); prop('tree', cx + 10, cz - 30); prop('bench', cx - 20, cz - 26);
    B.pad = { x: cx + 24, z: cz + 8, y: g0 + 7.9 }; return B;
  }
  if (place === 'szerviz1' || place === 'szerviz2') { bld(cx, cz + 12, 40, 26, 8, 'szerviz', 'flat', { sign: 'LOCSOLÓFEJ SZERVIZ' }); trees(3); return B; }
  if (place === 'atemelo1' || place === 'atemelo2') {
    bld(cx - 20, cz - 20, 24, 16, 9, 'brick', 'flat', { sign: 'SZENNYVÍZÁTEMELŐ' });
    for (const [tx, tz] of [[cx + 15, cz - 15], [cx + 15, cz + 18], [cx - 18, cz + 18]]) B.b.push({ x: tx, z: tz, tank: 1, r: 9, h: 6, y0: terrain(tx, tz) - .2 }), addColl({ x0: tx - 9, z0: tz - 9, x1: tx + 9, z1: tz + 9, y0: 0, y1: terrain(tx, tz) + 6, roof: true, round: 9 });
    B.b.push({ pipes: 1, x: cx, z: cz }); prop('tree', cx - 34, cz + 34); return B;
  }
  if (place === 'raktar') { bld(cx + 6, cz + 4, 60, 44, 12, 'warehouse', 'saw', { sign: 'SZILÁRD KFT.' }); bld(cx - 30, cz - 28, 14, 12, 5, 'brick'); prop('barrel', cx - 26, cz + 30); prop('barrel', cx - 24, cz + 31); return B; }
  if (place === 'kilato') { B.b.push({ tower: 1, x: cx, z: cz, y0: terrain(cx, cz) }); addColl({ x0: cx - 4, z0: cz - 4, x1: cx + 4, z1: cz + 4, y0: 0, y1: terrain(cx, cz) + 34, round: 4 }); trees(14, 12); return B; }
  if (place === 'prop') { const p = PROPS_FOR_SALE.find(p => p.x === cx && p.z === cz); bld(cx, cz + 14, 30, 22, p.id === 'g4' ? 9 : 7, p.id === 'g4' ? 'villa' : 'garage', p.id === 'g4' ? 'hip' : 'flat'); trees(5); return B; }
  if (place === 'zero') { const b = bld(cx, cz, 14, 70, 30, 'panel'); RAMPS.push({ x0: cx + 7, z0: cz - 30, x1: cx + 11, z1: cz + 34, ax: 'z', h0: b.y0 + .1, h1: b.y0 + 30.4 }); B.zero = { x: cx, z: cz + 20, y: b.y0 + 30.9 }; trees(4); return B; }
  if (dist === 'folyo') { trees(8, 2); return B; }
  if (dist === 'belvaros') {
    const plaza = cx === -50 && cz === -50;
    if (plaza) { bld(cx, cz + 26, 50, 22, 18, 'old', 'flat', { sign: 'VÁROSHÁZA', clock: 1 }); prop('fountain', cx, cz - 12); for (let i = 0; i < 6; i++) prop('bench', cx - 25 + i * 10, cz - 30); trees(4, 6); return B; }
    const tall = Math.abs(cx) < 200 && Math.abs(cz) < 200 && r() < .55;
    if (tall) { const w = 26 + r() * 18, d = 26 + r() * 18, h = 40 + r() * 55; const o = bld(cx + (r() - .5) * 8, cz + (r() - .5) * 8, w, d, h, 'office'); if (r() < .6) bld(o.x, o.z, w * .7, d * .7, h + 12 + r() * 25, 'office', 'flat', { top: 1, y0x: 1 }); prop('tree', cx - 36, cz - 36); prop('tree', cx + 36, cz + 36); return B; }
    // zárt sorház-tömb udvarral
    const h = 14 + Math.floor(r() * 4) * 3.2, dd = 13; const st = r() < .5 ? 'old' : 'old2';
    bld(cx, z0 + dd / 2, x1 - x0, dd, h, st); bld(cx, z1 - dd / 2, x1 - x0, dd, h + (r() < .3 ? 3.2 : 0), st);
    bld(x0 + dd / 2, cz, dd, z1 - z0 - dd * 2, h, st); bld(x1 - dd / 2, cz, dd, z1 - z0 - dd * 2, h, st);
    prop('tree', cx, cz, 0, 1.3); return B;
  }
  if (dist === 'panel') {
    const rot = r() < .5, n = r() < .4 ? 1 : 2;
    for (let i = 0; i < n; i++) { const off = n === 1 ? 0 : (i ? 18 : -18); const h = 27 + Math.floor(r() * 2) * 3; if (rot) bld(cx + off, cz, 12, 66, h, 'panel'); else bld(cx, cz + off, 66, 12, h, 'panel'); }
    if (r() < .5) prop('playground', cx + (rot ? 0 : 0) + (rot ? 0 : 0), cz + (rot ? 0 : 0) + 30 * (rot ? 0 : 1));
    trees(7, 3); return B;
  }
  if (dist === 'ipari') {
    const k = r(); if (k < .45) bld(cx, cz, 60 + r() * 14, 40 + r() * 16, 9 + r() * 4, 'warehouse', 'saw');
    else if (k < .75) { bld(cx - 14, cz, 40, 50, 11, 'brick'); B.b.push({ chimney: 1, x: cx + 22, z: cz + 18, h: 32 + r() * 18, y0: terrain(cx + 22, cz + 18) }); addColl({ x0: cx + 19, z0: cz + 15, x1: cx + 25, z1: cz + 21, y0: 0, y1: 60, round: 3 }); }
    else { for (let i = 0; i < 3; i++) { const tx = cx - 22 + i * 22, tz = cz - 10; B.b.push({ tank: 1, x: tx, z: tz, r: 8, h: 10, y0: terrain(tx, tz) }); addColl({ x0: tx - 8, z0: tz - 8, x1: tx + 8, z1: tz + 8, y0: 0, y1: terrain(tx, tz) + 10, roof: true, round: 8 }); } bld(cx, cz + 26, 50, 14, 6, 'brick'); }
    for (let i = 0; i < 3; i++) prop('barrel', cx - 38 + r() * 10, cz + 30 + r() * 6); return B;
  }
  if (dist === 'avas') {
    // domboldali kertes házak és fák
    const n = 2 + Math.floor(r() * 3); for (let i = 0; i < n; i++) { const hx = cx + (r() - .5) * 50, hz = cz + (r() - .5) * 50; bld(hx, hz, 9 + r() * 4, 10 + r() * 4, 6, 'house', 'gable', { rot: r() < .5 }); }
    trees(12, 3); return B;
  }
  // kertváros: 4 telek, mindegyiken egy ház kerttel
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const hx = cx + sx * 20, hz = cz + sz * 20;
    if (r() < .08) { prop('tree', hx, hz, 0, 1.4); continue; }
    bld(hx + (r() - .5) * 4, hz + (r() - .5) * 4, 9 + r() * 3, 10 + r() * 3, 5.5 + (r() < .3 ? 2.6 : 0), 'house', r() < .7 ? 'gable' : 'hip', { rot: r() < .5, col: Math.floor(r() * 6) });
    B.props.push({ t: 'fence', x: hx, z: hz, w: 36, d: 36, y: groundY(hx, hz) }); prop('tree', hx + sx * 12, hz + sz * 12, r() * 6, .9 + r() * .5); if (r() < .25) prop('pool', hx - sx * 9, hz - sz * 10); }
  return B;
}
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) BLOCKS.push(genBlock(LINES[i] + 50, LINES[j] + 50));
export const blockAt = (x, z) => { const i = Math.floor((x + HALF) / PITCH), j = Math.floor((z + HALF) / PITCH); return i >= 0 && j >= 0 && i < N && j < N ? BLOCKS[i * N + j] : null; };
// folyópart korlátja (a hidak kivételével) – ütköző
for (const zz of [RIV0 - 1, RIV1 + 1]) { let xs = -HALF - 60; for (const b of [...BRIDGES, HALF + 60]) { const xe = b - ROADW / 2 - 1.5; if (xe > xs) addColl({ x0: xs, z0: zz - .3, x1: xe, z1: zz + .3, y0: 0, y1: 1.1, rail: 1 }); xs = b + ROADW / 2 + 1.5; } }
for (const b of BRIDGES) for (const s of [-1, 1]) addColl({ x0: b + s * (ROADW / 2 + .8) - .3, z0: RIV0 - 8, x1: b + s * (ROADW / 2 + .8) + .3, z1: RIV1 + 8, y0: 0, y1: deckY + 1.1, rail: 1 });
// ugratók (kaszkadőr)
export const JUMPS = [[-700, -330, 0], [-400, 620, 1], [380, 120, 0], [720, -40, 1], [-120, -720, 0], [130, 680, 1], [-830, 300, 1], [600, -260, 0]].map(([x, z, ax], i) => ({ id: i, x, z, ax: ax ? 'z' : 'x', y: groundY(x, z) }));
for (const j of JUMPS) RAMPS.push({ x0: j.x - (j.ax === 'x' ? 6 : 3), z0: j.z - (j.ax === 'z' ? 6 : 3), x1: j.x + (j.ax === 'x' ? 6 : 3), z1: j.z + (j.ax === 'z' ? 6 : 3), ax: j.ax, h0: j.y, h1: j.y + 2.6, jump: j });

/* ---------- járható magasság (gyalogos, jármű) ---------- */
export function curb(x, z) {   // járda (+0,2 m) és útburkolat (+0,07 m) a domborzat fölött
  if (Math.abs(x) > HALF + ROADW || Math.abs(z) > HALF + ROADW) return Math.abs(x - MOTOR_X) < 11 ? .07 : 0;
  const dx = Math.abs(x - Math.round((x + HALF) / PITCH) * PITCH + HALF), dz = Math.abs(z - Math.round((z + HALF) / PITCH) * PITCH + HALF), h = ROADW / 2;
  if (dx < h || dz < h) return (z > RIV0 && z < RIV1 && !onBridge(x, z)) ? 0 : .07; if (dx < h + SIDEW || dz < h + SIDEW) return (z > RIV0 - 2 && z < RIV1 + 2) ? 0 : .2; return 0;
}
export function surfaceY(x, z, y, step = .6) {    // a legmagasabb felület a ponton, ami a y+step alatt van
  let g = groundY(x, z) + curb(x, z);
  for (const R of RAMPS) if (x >= R.x0 && x <= R.x1 && z >= R.z0 && z <= R.z1) { const k = R.ax === 'x' ? (x - R.x0) / (R.x1 - R.x0) : (z - R.z0) / (R.z1 - R.z0), h = R.h0 + (R.h1 - R.h0) * k; if (h <= y + step + .4 && h > g) g = h; }
  collNear(x, z, 0, c => { if (!c.roof) return; if (x < c.x0 || x > c.x1 || z < c.z0 || z > c.z1) return; if (c.round && Math.hypot(x - (c.x0 + c.x1) / 2, z - (c.z0 + c.z1) / 2) > c.round) return; if (c.y1 <= y + step && c.y1 > g) g = c.y1; });
  return g;
}
export function rampAt(x, z) { for (const R of RAMPS) if (x >= R.x0 && x <= R.x1 && z >= R.z0 && z <= R.z1) return R; return null; }
/* ütközés körrel (gyalogos, jármű közelítés): kitolás a dobozokból, ha a test a doboz magassága alatt van */
export function pushCircle(p, r, y, h = 1.8) {
  let hit = null;
  collNear(p.x, p.z, r + 1, c => {
    if (y >= c.y1 - .05 || y + h < (c.y0 ?? -99)) return;
    if (c.round) { const cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2, dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz), q = c.round + r; if (d < q && d > 1e-4) { p.x = cx + dx / d * q; p.z = cz + dz / d * q; hit = { nx: dx / d, nz: dz / d, c }; } return; }
    const qx = Math.max(c.x0, Math.min(c.x1, p.x)), qz = Math.max(c.z0, Math.min(c.z1, p.z)), dx = p.x - qx, dz = p.z - qz, d = Math.hypot(dx, dz);
    if (d < r) { if (d > 1e-4) { p.x = qx + dx / d * r; p.z = qz + dz / d * r; hit = { nx: dx / d, nz: dz / d, c }; } else { const l = p.x - c.x0, rr = c.x1 - p.x, t = p.z - c.z0, b = c.z1 - p.z, m = Math.min(l, rr, t, b); if (m === l) { p.x = c.x0 - r; hit = { nx: -1, nz: 0, c }; } else if (m === rr) { p.x = c.x1 + r; hit = { nx: 1, nz: 0, c }; } else if (m === t) { p.z = c.z0 - r; hit = { nx: 0, nz: -1, c }; } else { p.z = c.z1 + r; hit = { nx: 0, nz: 1, c }; } } }
  });
  return hit;
}
/* látóvonal két pont között (épületek takarják) */
export function lineOfSight(ax, ay, az, bx, by, bz) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 6);
  for (let i = 1; i < n; i++) { const k = i / n, x = ax + (bx - ax) * k, z = az + (bz - az) * k, y = ay + (by - ay) * k; let blocked = false;
    collNear(x, z, 0, c => { if (!blocked && !c.rail && x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && y < c.y1) blocked = true; }); if (blocked) return false; }
  return true;
}
/* útkeresés a rácson (minitérkép-útvonal, AI): A* a csomópontokon */
export function nearestNode(x, z) { let b = null, bd = 1e18; for (const n of NODES.values()) { const d = (n.x - x) ** 2 + (n.z - z) ** 2; if (d < bd) { bd = d; b = n; } } return b; }
export function route(ax, az, bx, bz) {
  const s = nearestNode(ax, az), t = nearestNode(bx, bz); if (!s || !t) return [];
  const open = [[0, s]], g = new Map([[s, 0]]), from = new Map(), done = new Set();
  while (open.length) { open.sort((a, b) => a[0] - b[0]); const [, u] = open.shift(); if (u === t) break; if (done.has(u)) continue; done.add(u);
    for (const v of u.n) { if (done.has(v)) continue; const ng = g.get(u) + Math.hypot(u.x - v.x, u.z - v.z) * (v.hw && u.hw ? .6 : 1); if (ng < (g.get(v) ?? 1e18)) { g.set(v, ng); from.set(v, u); open.push([ng + Math.hypot(v.x - t.x, v.z - t.z), v]); } } }
  const out = [[bx, bz]]; for (let u = t; u; u = from.get(u)) out.push([u.x, u.z]); out.push([ax, az]); return out.reverse();
}
