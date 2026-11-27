/* ZERO QUEST – modellek: kódból épített, lapos árnyalású geometria (tereptárgyak, épületek, szereplők) */
import * as THREE from './lib/three.module.min.js?v=202611271510';
const TAU = Math.PI * 2; const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const hex = (h, k = 1) => { const n = typeof h === 'string' ? parseInt(h.slice(1), 16) : h; return [((n >> 16) & 255) / 255 * k, ((n >> 8) & 255) / 255 * k, (n & 255) / 255 * k]; };
export const rgb = (r, g, b) => [r / 255, g / 255, b / 255];
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mulc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
let JS = 1; const jr = () => { JS = (JS * 16807) % 2147483647; return JS / 2147483647; };

/* ---------- geometria-gyűjtő: háromszögek lapos normállal, csúcsszínnel, opcionális izzással ---------- */
export class GB { constructor() { this.p = []; this.n = []; this.c = []; this.e = null; this.jit = .07; this.glow = 0; }
  tri(ax, ay, az, bx, by, bz, cx, cy, cz, col) { const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az; let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const k = 1 + (jr() - .5) * 2 * this.jit; this.p.push(ax, ay, az, bx, by, bz, cx, cy, cz); this.n.push(nx, ny, nz, nx, ny, nz, nx, ny, nz); const r = col[0] * k, g = col[1] * k, b = col[2] * k; this.c.push(r, g, b, r, g, b, r, g, b); if (this.e || this.glow) { if (!this.e) this.e = new Array(this.p.length / 3 - 3).fill(0); this.e.push(this.glow, this.glow, this.glow); } }
  /* alakzat helyi koordinátákban → mátrix (m: 16 elemű tömb) */
  shape(verts, tris, m, col, cols) { const P = verts.map(v => xf(m, v)); for (let i = 0; i < tris.length; i += 3) { const a = P[tris[i]], b = P[tris[i + 1]], c = P[tris[i + 2]]; this.tri(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], cols ? cols[i / 3 | 0] : col); } }
  box(m, sx, sy, sz, col, top) { const x = sx / 2, z = sz / 2, V = [[-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z], [-x, sy, -z], [x, sy, -z], [x, sy, z], [-x, sy, z]];
    const T = [0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0]; this.shape(V, T, m, col, top ? [col, col, top, top, col, col, col, col, col, col, col, col] : null); }
  cyl(m, rt, rb, h, seg, col, cap = true, topCol) { const V = [], T = []; for (let i = 0; i < seg; i++) { const a = i / seg * TAU; V.push([Math.cos(a) * rb, 0, Math.sin(a) * rb], [Math.cos(a) * rt, h, Math.sin(a) * rt]); }
    for (let i = 0; i < seg; i++) { const a = i * 2, b = ((i + 1) % seg) * 2; T.push(a, a + 1, b + 1, a, b + 1, b); } const cols = T.length / 3; const C = new Array(cols).fill(col);
    if (cap) { const ci = V.length; V.push([0, h, 0], [0, 0, 0]); for (let i = 0; i < seg; i++) { const a = i * 2, b = ((i + 1) % seg) * 2; T.push(ci, b + 1, a + 1); C.push(topCol || col); if (rb > 0) { T.push(ci + 1, a, b); C.push(col); } } } this.shape(V, T, m, col, C); }
  ico(m, r, det, col, rough = 0, flat = 1) { const g = ICO[det] || (ICO[det] = (g0 => g0.index ? g0.toNonIndexed() : g0)(new THREE.IcosahedronGeometry(1, det)).attributes.position.array), V = [], T = [];
    for (let i = 0; i < g.length; i += 3) { const x = g[i], y = g[i + 1], z = g[i + 2], k = rough ? 1 + (hash3(x, y, z) - .5) * rough : 1; V.push([x * r * k, y * r * k * flat, z * r * k]); T.push(i / 3); } this.shape(V, T, m, col); }
  geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); if (this.e) g.setAttribute('emis', new THREE.Float32BufferAttribute(this.e, 1)); g.computeBoundingSphere(); return g; }
  get empty() { return !this.p.length; }
  /* kész alakzat (prototípus) bélyegzése: forgatás Y körül, nagyítás, eltolás */
  stamp(pr, x, y, z, ry = 0, s = 1, tint) { const c = Math.cos(ry), sn = Math.sin(ry), P = pr.p, N = pr.n, C = pr.c; for (let i = 0; i < P.length; i += 3) { const px = P[i] * s, py = P[i + 1] * s, pz = P[i + 2] * s; this.p.push(x + px * c - pz * sn, y + py, z + px * sn + pz * c); this.n.push(N[i] * c - N[i + 2] * sn, N[i + 1], N[i] * sn + N[i + 2] * c);
      if (tint) this.c.push(C[i] * tint[0], C[i + 1] * tint[1], C[i + 2] * tint[2]); else this.c.push(C[i], C[i + 1], C[i + 2]); }
    if (pr.e || this.e) { if (!this.e) this.e = new Array(this.p.length / 3 - P.length / 3).fill(0); if (pr.e) for (const v of pr.e) this.e.push(v); else for (let i = 0; i < P.length / 3; i++) this.e.push(0); } } }
const ICO = {}; const hash3 = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
/* mátrix-segédek: [x,y,z, ry, rx, rz, sx, sy, sz] → 4×4 */
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
export function M(x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, s = 1, sy, sz) { _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); _v.set(x, y, z); _s.set(s, sy == null ? s : sy, sz == null ? s : sz); return _m.compose(_v, _q, _s).elements.slice(); }
export const mm = (a, b) => new THREE.Matrix4().fromArray(a).multiply(new THREE.Matrix4().fromArray(b)).elements.slice();
function xf(m, v) { const x = v[0], y = v[1], z = v[2]; return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]]; }
const PRO = new Map();
export function proto(key, fn) { let p = PRO.get(key); if (!p) { const b = new GB(); JS = 7 + key.length * 131; fn(b); p = { p: new Float32Array(b.p), n: new Float32Array(b.n), c: new Float32Array(b.c), e: b.e ? new Float32Array(b.e) : null }; PRO.set(key, p); } return p; }

/* ---------- anyagszínek ---------- */
export const MAT = { ko: [hex('#7c766c'), hex('#5e5952'), hex('#9a9286')], fa: [hex('#6e5236'), hex('#4e3a26'), hex('#8a6a48')], sar: [hex('#5e6450'), hex('#454c3a'), hex('#727a60')], feher: [hex('#d6ccb6'), hex('#b4a88e'), hex('#ece2cc')], homok: [hex('#c2a578'), hex('#9c8258'), hex('#d6bc8e')],
  voros: [hex('#9a5e42'), hex('#74442e'), hex('#b07052')], jeg: [hex('#a4b4c2'), hex('#7a8a9a'), hex('#c8d6e2')], so: [hex('#ddd4ce'), hex('#b2a6a0'), hex('#f2ebe6')], sotet: [hex('#4a4246'), hex('#342e32'), hex('#5e5458')], gy: [hex('#5a4634'), hex('#3e3024'), hex('#6e5844')], rez: [hex('#5a6a52'), hex('#3e4a38'), hex('#6e8466')], mely: [hex('#4a3e44'), hex('#2e262c'), hex('#5e5058')] };
const mat = k => MAT[k] || MAT.ko;
const ROOF = { ko: hex('#4a3e36'), fa: hex('#5a4630'), sar: hex('#3e4434'), feher: hex('#8a6a4a'), homok: hex('#8a6a46'), voros: hex('#7a3e2a'), jeg: hex('#e8eef4'), so: hex('#9a8a84'), sotet: hex('#2e2a2e'), gy: hex('#4a3a2a') };

/* ---------- növényzet, sziklák (prototípusok) ---------- */
function branch(b, x, y, z, a, tilt, len, r, depth, col, sd) { const m = M(x, y, z, a, 0, tilt); b.cyl(m, r * .62, r, len, 5, col, false); const tip = xf(m, [0, len, 0]);
  if (depth > 0) { const n = depth > 2 ? 3 : 2; for (let i = 0; i < n; i++) branch(b, tip[0], tip[1], tip[2], a + (i / n) * TAU + sd + jr() * 1.2, tilt * .6 + (.45 + jr() * .5) * (jr() < .5 ? 1 : -1), len * (.6 + jr() * .2), r * .62, depth - 1, col, sd + 1.3); } }
export function treeProto(v, k = 0) { return proto('t' + v + '_' + k, b => { JS = 99 + v * 17 + k * 61;
  if (v === 0 || v === 14) { const col = v === 14 ? hex('#d8d0c0') : hex('#4a3a2c'); branch(b, 0, 0, 0, jr() * TAU, (jr() - .5) * .2, 60 + jr() * 30, 9, 3, col, jr() * 3); }
  else if (v === 11) { b.cyl(M(), 3, 7, 60, 6, hex('#3a3028')); const n = 5; for (let i = 0; i < n; i++) { const r = 46 - i * 8, y = 34 + i * 26, rot = jr() * 3; b.cyl(M(0, y, 0, rot), 0, r, 48 - i * 4, 8, mixc(hex('#24322c'), hex('#36443a'), jr()), false); b.cyl(M(0, y + 16, 0, rot), 0, r * .62, 26 - i * 2, 8, hex('#e6edf2'), false); } b.cyl(M(0, 34 + n * 26, 0), 0, 8, 26, 6, hex('#e6edf2'), false); }
  else if (v === 12) { const col = hex('#3c3a2c'); b.cyl(M(0, 0, 0, 0, 0, .15), 7, 12, 70, 6, col); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; b.cyl(M(8, 66, 0, a, 0, 1.1), 2, 5, 50, 5, col, false); for (let j = 0; j < 3; j++) b.cyl(M(8 + Math.cos(a) * 44, 84, Math.sin(a) * 44, a + j, Math.PI, 0), .3, 1.4, 34 + jr() * 30, 3, hex('#5a5a3a'), false); } }
  else if (v === 1) { const g = hex('#4a6a3a'), d = hex('#3a5430'), rib = (m, h, r) => { b.cyl(m, r * .8, r, h, 8, g, true, d); b.ico(mm(m, M(0, h, 0)), r * .8, 1, g); }; rib(M(), 130 + jr() * 50, 15); const n = 1 + (jr() * 3 | 0);
    for (let i = 0; i < n; i++) { const a = jr() * TAU, y = 40 + jr() * 50, l = 22 + jr() * 10; b.cyl(M(Math.cos(a) * 12, y, Math.sin(a) * 12, -a, 0, -1.4), 7, 8, l, 7, g); rib(M(Math.cos(a) * (12 + l), y - 2, Math.sin(a) * (12 + l)), 40 + jr() * 30, 8); }
    b.glow = 0; b.ico(M(0, 128, 0), 5, 0, hex('#d86a7a')); }
  else if (v === 2) { const g = hex('#5a7a42'); for (let i = 0; i < 5; i++) b.ico(M((jr() - .5) * 30, 14 + i * 9, (jr() - .5) * 20, jr() * 3, 0, (jr() - .5) * .8), 12, 1, g, .2, .45); }
  else if (v === 3) { const c = hex('#a8904c'); b.cyl(M(), 6, 24, 46, 9, c, true, hex('#8a7438')); b.cyl(M(0, 40, 0), 2, 7, 12, 7, hex('#b89c58')); }
  else if (v === 5) { const c = hex('#d4c8ae'); b.cyl(M(), 15, 18, 140 + jr() * 60, 10, c, true, hex('#b8ac90')); b.box(M(0, 0, 0), 44, 12, 44, hex('#c4b89c')); }
  else if (v === 6) { const c = hex('#bcd6ea'); for (let i = 0; i < 4; i++) b.cyl(M((jr() - .5) * 26, 0, (jr() - .5) * 26, 0, (jr() - .5) * .4, (jr() - .5) * .4), 0, 10 + jr() * 8, 90 + jr() * 90, 5, i ? hex('#9ec2de') : c, false); }
  else if (v === 7) { for (let i = 0; i < 6; i++) b.cyl(M((jr() - .5) * 30, 0, (jr() - .5) * 30, jr() * 3, (jr() - .5) * .7, (jr() - .5) * .7), 0, 6 + jr() * 7, 40 + jr() * 70, 6, hex(jr() < .5 ? '#f2ebe6' : '#e8d8d0'), false); }
  else if (v === 13) { for (let i = 0; i < 4; i++) b.cyl(M((jr() - .5) * 26, 0, (jr() - .5) * 26, jr() * 3, (jr() - .5) * .5, (jr() - .5) * .5), 0, 9 + jr() * 9, 60 + jr() * 90, 5, hex('#1e1a1e'), false); }
  else if (v === 15) { b.glow = .9; for (let i = 0; i < 5; i++) b.cyl(M((jr() - .5) * 30, 0, (jr() - .5) * 30, jr() * 3, (jr() - .5) * .6, (jr() - .5) * .6), 0, 7 + jr() * 8, 40 + jr() * 80, 6, hex('#8a4ad0'), false); b.glow = 0; }
  else if (v === 8) statueBody(b, M(), hex('#8a8272'), jr());
  else if (v === 9) { const c = hex('#e4dccb'); for (let i = 0; i < 6; i++) { const z = (i - 2.5) * 34; b.cyl(M(-50, 0, z, 0, 0, .55), 4, 7, 110, 5, c, false); b.cyl(M(50, 0, z, 0, 0, -.55), 4, 7, 110, 5, c, false); } b.cyl(M(0, 6, -110, 0, Math.PI / 2, 0), 9, 9, 220, 6, c); }
  else if (v === 10) { for (let i = 0; i < 9; i++) b.cyl(M((jr() - .5) * 50, (i > 5 ? 22 : 0) + jr() * 4, (jr() - .5) * 40, jr() * 3, jr() < .3 ? 1.57 : 0, 0), 8, 9, 22, 8, hex(jr() < .5 ? '#7a6a58' : '#8a5a3a')); }
}); }
export function rockProto(k, rg) { return proto('r' + k + rg, b => { const C = { mez: '#77705f', lap: '#55594a', nap: '#cfc4a8', var: '#7a7468', cso: '#b49a72', kak: '#9a5c3e', jeg: '#8a96a4', so: '#3a3436', mely: '#4a4048' }[rg] || '#777'; const c = hex(C);
  b.ico(M(0, -4, 0, k * 2, 0, 0, 1, .62 + (k % 3) * .12, 1), 1, 1, c, .55); if (k % 2) b.ico(M(.7, -3, .3, k, 0, 0, .55), 1, 0, mulc(c, .9), .5); if (rg === 'jeg' || rg === 'nap') b.ico(M(0, .32, 0, 0, 0, 0, .8, .25, .8), 1, 0, rg === 'jeg' ? hex('#eef4fa') : mulc(c, 1.12), .3); }); }
export function bushProto(k, rg) { return proto('b' + k + rg, b => { const c = hex({ lap: '#4a5236', kak: '#6a6a3a', cso: '#8a7a50', jeg: '#6a6a5a' }[rg] || '#7a6a40'); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + jr(); b.cyl(M(0, 0, 0, a, 0, .5 + jr() * .7), .2, 1.4, 18 + jr() * 18, 3, mulc(c, .8 + jr() * .4), false); } }); }
export function grassProto(k) { return proto('g' + k, b => { const C = ['#a08c4c', '#6a7444', '#b8a070', '#8a9484', '#5e5a46', '#7e6a4a'][k]; b.jit = .2; for (let i = 0; i < 7; i++) { const a = jr() * TAU, r = jr() * 9, h = 10 + jr() * 14; const x = Math.cos(a) * r, z = Math.sin(a) * r, w = 1.8; b.tri(x - w, 0, z, x + w, 0, z, x + (jr() - .5) * 8, h, z + (jr() - .5) * 8, hex(C)); } b.jit = .07; }); }

/* ---------- szobor (porszobrok, kőalakok) ---------- */
export function statueBody(b, m, c, q) { const d = mulc(c, .82); b.box(mm(m, M(0, 0, 0)), 40, 14, 34, d); b.cyl(mm(m, M(-7, 14, 0)), 6, 7, 30, 6, c); b.cyl(mm(m, M(7, 14, 0)), 6, 7, 30, 6, c); b.cyl(mm(m, M(0, 44, 0)), 13, 10, 30, 7, c); b.ico(mm(m, M(0, 84, 0)), 9, 1, c, .15);
  const ar = q < .33 ? [-.4, 2.6] : q < .66 ? [.3, -.3] : [2.9, .2]; b.cyl(mm(m, M(-14, 72, 0, 0, 0, ar[0])), 3.5, 4.5, 28, 5, c); b.cyl(mm(m, M(14, 72, 0, 0, 0, -ar[1])), 3.5, 4.5, 28, 5, c); }

/* ---------- emberi alak (szereplők): csontváz-csoportok ---------- */
const MATC = new Map(); export function smat(col, o) { o = o || {}; const k = col + JSON.stringify(o); let m = MATC.get(k); if (!m) { const lc = new THREE.Color(col); m = new THREE.MeshStandardMaterial({ color: lc.clone().offsetHSL(0, 0, .06), roughness: o.r ?? .78, metalness: o.m ?? 0, emissive: o.e || lc.clone().multiplyScalar(.16), emissiveIntensity: o.ei ?? 1, transparent: !!o.t, opacity: o.o ?? 1, flatShading: true }); MATC.set(k, m); } return m; }
const GEO = {}; const geo = (k, f) => GEO[k] || (GEO[k] = f());
const capsule = (r, l) => geo('cap' + r + '_' + l, () => new THREE.CapsuleGeometry(r, l, 3, 7));
const part = (g, col, o) => { const m = new THREE.Mesh(g, smat(col, o)); m.castShadow = true; return m; };
const grp = (...c) => { const g = new THREE.Group(); for (const x of c) g.add(x); return g; };
/* fegyverek fajtánként (a markolat a csoport origójában, a penge +Y felé) */
export function weaponMesh(kind, col, glow, len = 1) { const g = new THREE.Group(), steel = col || '#c8ccd0', o = glow ? { e: glow, ei: .55, m: .6, r: .35 } : { m: .6, r: .4 }, wood = '#5b3a1e', P = (gg, c, x, y, z, rx = 0, rz = 0, oo) => { const m = part(gg, c, oo); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); g.add(m); return m; };
  const BX = (w, h, d) => geo(`b${w}_${h}_${d}`, () => new THREE.BoxGeometry(w, h, d)), CY = (a, b, h, s = 6) => geo(`c${a}_${b}_${h}_${s}`, () => new THREE.CylinderGeometry(a, b, h, s));
  P(CY(1.4, 1.6, 9), wood, 0, 0, 0);
  switch (kind) {
    case 'kes': P(BX(5, 1.6, 2.4), '#e8b656', 0, 5, 0); P(BX(2.6, 16 * len, .8), steel, 0, 13 * len, 0, 0, 0, o); break;
    case 'sarlo': { const t = new THREE.TorusGeometry(10, 1.3, 4, 10, Math.PI * 1.2); const m = P(t, steel, -9, 13, 0, 0, 0, o); m.rotation.z = -.3; break; }
    case 'kard': P(BX(10, 2, 3), '#e8b656', 0, 5, 0); P(BX(3.4, 34 * len, 1), steel, 0, 22.5 * len, 0, 0, 0, o); break;
    case 'pallos': P(CY(1.4, 1.6, 14), wood, 0, -6, 0); P(BX(15, 2.4, 3.4), '#9a8a6a', 0, 6, 0); P(BX(5, 52, 1.2), steel, 0, 33, 0, 0, 0, o); break;
    case 'buzogany': P(CY(1.5, 1.5, 26), wood, 0, 12, 0); { const h = P(geo('ico4', () => new THREE.IcosahedronGeometry(6, 0)), steel, 0, 27, 0, 0, 0, o); h.scale.set(1, 1.2, 1); } break;
    case 'landzsa': P(CY(1.2, 1.2, 70), wood, 0, 30, 0); P(geo('cone', () => new THREE.ConeGeometry(2.6, 12, 5)), steel, 0, 70, 0, 0, 0, o); break;
    case 'fejsze': P(CY(1.5, 1.5, 34), wood, 0, 14, 0); P(BX(12, 10, 1.4), steel, 6, 28, 0, 0, 0, o); break;
    case 'kasza': P(CY(1.3, 1.3, 70), wood, 0, 30, 0); { const m = P(new THREE.TorusGeometry(20, 1.4, 4, 12, Math.PI * .7), steel, -20, 64, 0, 0, 0, o); m.rotation.z = .2; } break;
    case 'bow': g.clear(); { const m = P(new THREE.TorusGeometry(16, 1.1, 4, 12, Math.PI * .9), '#6b4a2c', 0, 0, 0); m.rotation.z = -Math.PI * .45; } break;
    case 'staff': P(CY(1.3, 1.6, 64), wood, 0, 26, 0); P(geo('ico5', () => new THREE.IcosahedronGeometry(4.5, 0)), steel, 0, 60, 0, 0, 0, { e: steel, ei: .9 }); break;
    case 'kanna': g.clear(); P(CY(7, 9, 16, 8), '#8a6a3a', 0, 0, 0, 0, 0, { m: .5, r: .5 }); P(CY(1.2, 1.6, 14), '#8a6a3a', 9, 4, 0, 0, -1, { m: .5 }); break;
  } return g; }
export function shieldMesh(it) { const g = new THREE.Group(), sh = it.shape, c = it.col, rim = it.rim || '#4a3a2a';
  if (sh === 'torony') { const m = part(geo('sht', () => new THREE.BoxGeometry(22, 40, 3)), c, { r: .6, m: .3 }); g.add(m); const r = part(geo('shtr', () => new THREE.BoxGeometry(24, 3, 4)), rim, { m: .6 }); r.position.y = 18; g.add(r); }
  else if (sh === 'cimer') { const s = new THREE.Shape(); s.moveTo(-11, 12); s.lineTo(11, 12); s.lineTo(11, -2); s.quadraticCurveTo(10, -12, 0, -17); s.quadraticCurveTo(-10, -12, -11, -2); s.closePath(); const m = part(geo('shc', () => new THREE.ExtrudeGeometry(s, { depth: 2.4, bevelEnabled: true, bevelSize: .8, bevelThickness: .8, bevelSegments: 1 })), c, { r: .5, m: .3 }); m.position.z = -1.2; g.add(m); const e = part(geo('she', () => new THREE.BoxGeometry(3, 16, 1.4)), rim, { m: .7, r: .3 }); e.position.set(0, 0, 2); g.add(e); }
  else { const m = part(geo('shk', () => new THREE.CylinderGeometry(13, 13, 2.6, 12)), c, { r: .8 }); m.rotation.x = Math.PI / 2; g.add(m); const b = part(geo('shb', () => new THREE.SphereGeometry(3.4, 8, 6, 0, TAU, 0, Math.PI / 2)), rim, { m: .7, r: .3 }); b.rotation.x = Math.PI / 2; b.position.z = 1.3; g.add(b); const r = part(geo('shr', () => new THREE.TorusGeometry(13, 1, 4, 14)), rim, { m: .6 }); g.add(r); }
  return g; }
/* L: kinézet (skin, tunic, hair, hood, mask, eye, cape, boot, trim, kak, plate, helm, s, gaunt) — csontonként egy-egy összefűzött háló */
export const charMat = (() => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .74, metalness: .04, flatShading: true }); m.onBeforeCompile = sh => { sh.vertexShader = 'attribute float emis;\nvarying float vEmis;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvEmis = emis;'); sh.fragmentShader = 'varying float vEmis;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * (vEmis * 3.0 + .14);'); }; return m; })();
const bm = b => { const m = new THREE.Mesh(b.geo(), charMat); m.castShadow = true; return m; };
const lift = (c, k = 1.12) => { const a = hex(c); return [Math.min(1, a[0] * k + .02), Math.min(1, a[1] * k + .02), Math.min(1, a[2] * k + .02)]; };
export function makeMan(L) { const root = new THREE.Group(), body = new THREE.Group(); root.add(body); JS = 4242;
  const sk = lift(L.skin || '#c8a080'), tu = lift(L.tunic || '#5a5248'), tud = mulc(tu, .78), bo = lift(L.boot || '#3a2a1c'), tr = lift(L.trim || '#4b3320'), lg = L.legc ? lift(L.legc) : mulc(tu, .7), sl = L.sleeve ? lift(L.sleeve) : tu, gl = L.glove ? lift(L.glove) : sk, g = L.gaunt ? .78 : 1, pl = L.plate;
  const hips = new THREE.Group(); hips.position.y = 25; body.add(hips);
  { const b = new GB(); b.jit = .05;
    b.cyl(M(0, -4, 0, 0, 0, 0, 1, 1, .78), 8 * g, 8.6 * g, 8, 8, lg); b.cyl(M(0, 4, 0, 0, 0, 0, 1, 1, .74), 10.6 * g, 7.6 * g, 15, 9, tu); b.cyl(M(0, 19, 0, 0, 0, 0, 1, 1, .74), 6 * g, 10.6 * g, 5, 9, tud);
    b.cyl(M(0, -9, 0, 0, 0, 0, 1, 1, .85), 8.6 * g, 11.8 * g, 10, 10, mulc(tu, .9), false); b.cyl(M(0, 3.6, 0, 0, 0, 0, 1, 1, .8), 8.4 * g, 8.4 * g, 2.8, 10, tr); b.box(M(0, 3.4, 6.6 * g), 3.4, 3.2, 1.2, hex('#c8a050'));
    if (pl) { b.cyl(M(0, 7, 0, 0, 0, 0, 1, 1, .8), 11.4 * g, 8.4 * g, 14, 8, mulc(tu, 1.12)); b.box(M(0, 9, 7.4 * g), 2, 12, 1, mulc(tu, .7)); } else b.box(M(0, -8, 7.8 * g, 0, -.12), 7.5, 20, 1.2, tr);
    b.box(M(-6 * g, 1, 6.8 * g, .3), 4, 4.4, 3, hex('#5a4026'));
    if (L.pauld) { const pc = lift(L.pauld, 1.05), bk = L.bulky ? 1.3 : 1; for (const s of [-1, 1]) { b.ico(M(s * 11.6 * g, 22.5, 0, 0, 0, s * -.3, 1, .62, 1), 5.8 * bk, 1, pc); if (L.bulky) { b.ico(M(s * 13.4 * g, 19.5, 0, 0, 0, s * -.5, 1, .5, 1), 6 * bk, 1, mulc(pc, .86)); b.box(M(s * 12 * g, 27, 0, 0, 0, s * -.35), 2, 3.2, 12, mulc(pc, 1.1)); } } }
    if (pl) { const pc = mulc(tu, 1.18); b.cyl(M(0, 22.5, 0, 0, 0, 0, 1, 1, .8), 6.8 * g, 9.2 * g, 4, 10, pc); for (const y of [12, 16]) b.cyl(M(0, y, .6, 0, 0, 0, 1, 1, .78), 11.2 * g, 11.6 * g, 1.2, 10, mulc(pc, .82)); b.box(M(0, 15, 8.9 * g, -.12), 1.3, 13, 1.4, mulc(pc, 1.15)); }
    if (L.tabard) { const tc = lift(L.tabard); b.box(M(0, 3, 8.4 * g, -.06), 10, 30, 1, tc); b.box(M(0, 3, -8.3 * g, .06), 10, 30, 1, mulc(tc, .85)); b.box(M(0, 17.5, 8.9 * g, -.06), 10.4, 1.6, 1.2, hex('#c8a050')); b.box(M(0, 10, 9 * g), 4, 4, .6, hex('#c8a050')); }
    if (L.robe) { const rc = mulc(tu, .92); b.cyl(M(0, -14, 0, 0, 0, 0, 1, 1, .86), 9.6 * g, 13.4 * g, 22, 11, rc, false); b.cyl(M(0, -24.6, 0, 0, 0, 0, 1, 1, .86), 13.4 * g, 13.6 * g, 1.6, 11, L.tabard ? lift(L.tabard) : tr); }
    if (L.feathers) for (let k = 0; k < 14; k++) { const a = (k / 13 - .5) * 3.6, r = 10.5 * g; b.box(M(Math.sin(a) * r, 21 - Math.abs(Math.sin(a)) * 2, Math.cos(a) * r * -.75, -.5 + .35 * Math.abs(Math.cos(a)), a, 0), 3, 10, .8, mulc(tu, .55 + (k % 3) * .08)); }
    if (L.hood && !pl) b.cyl(M(0, 17, -.5, 0, 0, 0, 1, 1, .82), 5.6, 12.4 * g, 8, 10, lift(L.hood), false);
    if (L.kak) { for (const [x, y, h] of L.kak === 2 ? [[-7, 20, 16], [7, 22, 20], [0, 22, 12]] : [[-6, 20, 12], [7, 19, 9]]) { b.cyl(M(x, y, -5), 2.4, 3, h, 6, hex('#3f5a36')); b.glow = .6; b.ico(M(x, y + h, -5), 1.6, 0, hex('#e06a7a')); b.glow = 0; } }
    hips.add(bm(b)); }
  const neck = new THREE.Group(); neck.position.y = 24; hips.add(neck); const head = new THREE.Group(); neck.add(head);
  { const b = new GB(); b.jit = .04; b.cyl(M(0, 0, 0), 2.8 * g, 3.4, 5, 6, mulc(sk, .9)); b.ico(M(0, 9, .4, 0, 0, 0, 1, 1.12, 1.04), 6.8 * (L.gaunt ? .92 : 1), 1, sk); b.box(M(0, 7.4, 6.6), 1.8, 3, 1.8, mulc(sk, .92)); b.box(M(0, 4.6, 5.4), 4.4, 1, 1.2, mulc(sk, .7));
    const ey = L.eye, glowE = ey && /^#(f|e|c|b)/i.test(ey); if (glowE) { b.glow = 1; for (const s of [-1, 1]) b.ico(M(s * 2.5, 9.2, 6.2), 1.25, 0, hex(ey)); b.glow = 0; } else for (const s of [-1, 1]) b.box(M(s * 2.4, 8.8, 6.2), 1.6, 1.2, .6, hex('#1c1410'));
    if (L.hood) { const hc = lift(L.hood); b.ico(M(0, 11.4, -1.2, 0, 0, 0, 1.06, 1.05, 1.1), 7.6, 1, hc); b.cyl(M(0, 15, -5, 0, -.9, 0), .5, 4.4, 10, 6, hc); b.box(M(0, 9, 7.2), 12, 10, 1, mulc(hc, .5)); b.ico(M(0, 9.2, .8, 0, 0, 0, 1, 1.12, 1.04), 6.82, 1, sk); }
    else if (L.helm) { const hc = lift(L.helm, 1.1), st = L.helmStyle, dk = hex('#0c0a0a');
      if (st === 'horn') { b.cyl(M(0, 9.6, 0), 7.9, 8.3, 13, 12, hc); b.ico(M(0, 16.2, 0, 0, 0, 0, 1, .55, 1), 8, 1, hc); b.box(M(0, 10.6, 8.1), 11, 1.2, .6, hex('#ff3a20')); b.glow = .6; b.box(M(0, 10.6, 8.3), 9, .6, .3, hex('#ff5a30')); b.glow = 0; for (const s of [-1, 1]) for (let k = 0; k < 4; k++) b.cyl(M(s * (8.5 + k * 2.6), 15 + k * 3.2 - k * k * .2, -1 - k * .6, 0, 0, s * (-1.2 + k * .35)), 2.2 - k * .45, 2.8 - k * .45, 4.4, 6, mixc(hc, hex('#d8ccb0'), .4 + k * .15)); }
      else if (st === 'crown') { b.cyl(M(0, 9.4, 0), 7.6, 7.8, 10, 12, hc); b.ico(M(0, 14.4, 0, 0, 0, 0, 1, .6, 1), 7.6, 1, hc); b.box(M(0, 7.6, 7.6), 9.5, 6, 1, mulc(hc, 1.1)); b.box(M(0, 9.6, 8.2), 8, .9, .5, dk); b.glow = .35; for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; b.cyl(M(Math.cos(a) * 7.8, 15 + (k % 2) * 1.5, Math.sin(a) * 7.8), 0, 1.6, 6 + (k % 2) * 4, 4, hex('#f0d070')); } b.glow = 0; b.cyl(M(0, 14.4, 0), 8.2, 8.2, 2, 12, hex('#f0d070'), false); }
      else if (st === 'great') { b.cyl(M(0, 9.6, 0), 7.9, 8.1, 13, 12, hc); b.cyl(M(0, 16.4, 0), 6, 7.9, 2.4, 12, mulc(hc, 1.08)); b.box(M(0, 10.6, 8), 11, 1.2, .6, dk); b.box(M(0, 7, 8), 1.2, 6, .6, dk); for (const y of [4, 13.4]) b.cyl(M(0, y, 0), 8.3, 8.3, 1, 12, mulc(hc, .8)); b.box(M(0, 9.6, 8.2), 1.4, 13, 1, mulc(hc, 1.15)); }
      else if (st === 'kettle') { b.cyl(M(0, 8.4, 0), 7.3, 7.5, 6, 10, hc); b.ico(M(0, 13.2, 0, 0, 0, 0, 1, .7, 1), 7.4, 1, hc); b.cyl(M(0, 10.6, 0), 12.4, 12.8, 1.2, 14, mulc(hc, .9)); b.cyl(M(0, 17.4, 0), .5, 1.4, 2, 6, mulc(hc, .8)); }
      else if (st === 'beak') { b.ico(M(0, 10, 0, 0, 0, 0, 1, 1.05, 1.1), 7.8, 1, hc); b.cyl(M(0, 7.4, 9.4, 1.35, 0, 0), .4, 3, 11, 6, mulc(hc, .85)); b.box(M(0, 9.6, 7.4), 9, 1.4, .6, hex('#a02a30')); for (let k = 0; k < 5; k++) b.box(M((k - 2) * 2.2, 17 + Math.abs(k - 2) * -.6, -3 - Math.abs(k - 2) * .6, -.7, 0, (k - 2) * .18), 1.6, 9, .6, mulc(hc, .7)); }
      else if (st === 'hat') { b.cyl(M(0, 11.8, 0), 12.6, 12.8, 1, 14, hc); b.cyl(M(-.6, 19, -1, -.12, 0, .06), .6, 7.4, 15, 10, hc); b.cyl(M(0, 13, 0), 7.5, 7.6, 2, 10, hex('#c8a050')); b.ico(M(0, 11.6, -1.4, 0, 0, 0, 1.04, .78, 1.02), 7.1, 1, lift(L.hair || '#3a2a1c')); }
      else if (st === 'sun') { b.glow = .25; for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; b.box(M(Math.cos(a) * 9.4, 9 + Math.sin(a) * 9.4, 4.6, 0, 0, a + Math.PI / 2), 1.6, 5 + (k % 2) * 3, .8, hex('#e8c050')); } b.glow = 0; b.cyl(M(0, 9, 6.2, Math.PI / 2, 0, 0), 7.6, 7.6, 1.2, 14, hc); b.ico(M(0, 11.6, -1.4, 0, 0, 0, 1.04, .78, 1.02), 7.1, 1, lift(L.hair || '#3a2a1c')); }
      else { b.cyl(M(0, 8.4, 0), 7.3, 7.5, 6, 10, hc); b.ico(M(0, 13.6, 0, 0, 0, 0, 1, .75, 1), 7.4, 1, hc); b.box(M(0, 5.6, 7.1), 1.6, 8, 1.4, mulc(hc, .85)); }
      if (L.plume) { const pc = lift(L.plume); for (let k = 0; k < 6; k++) b.box(M(0, 19 + Math.sin(k * .5) * 2, 4 - k * 2.6, -.3 + k * .18), 1.8, 4.6, 3, mulc(pc, 1 - k * .05)); }
      else if (st === 'plume' || !st) b.cyl(M(0, 17, 0), .4, 1.6, 6, 5, hex('#8a2a22')); }
    else { const hc = lift(L.hair || '#3a2a1c'); b.ico(M(0, 11.6, -1.4, 0, 0, 0, 1.04, .78, 1.02), 7.1, 1, hc); b.box(M(0, 7, -5.4), 11, 8, 3, hc); }
    if (L.mask) b.box(M(0, 5.6, 6.4), 9.6, 4.6, 1.6, lift(L.mask));
    if (L.crown) { b.glow = .35; for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; b.cyl(M(Math.cos(a) * 6.4, 15, Math.sin(a) * 6.4), 0, 1.8, 5 + (k % 2) * 3, 4, hex(L.crown)); } b.cyl(M(0, 14, 0), 6.8, 6.8, 2, 10, hex(L.crown), false); b.glow = 0; }
    head.add(bm(b)); }
  if (L.halo) { const c = part(geo('halo', () => new THREE.TorusGeometry(14, 1.2, 4, 24)), L.halo, { e: L.halo, ei: 2.4 }); c.position.set(0, 10, -7); head.add(c); }
  const arm = s => { const sh = new THREE.Group(); sh.position.set(s * 11.2 * g, 21, 0); hips.add(sh); { const b = new GB(); b.cyl(M(0, -12, 0), 2.7 * g, 3.4 * g, 12.5, 7, sl); if (pl) { b.ico(M(0, -1, 0, 0, 0, 0, 1, .7, 1), 4.6, 0, mulc(sl, 1.1)); for (const y of [-5, -8.5]) b.cyl(M(0, y, 0), 3.6 * g, 3.7 * g, 1, 8, mulc(sl, .85)); } sh.add(bm(b)); }
    const el = new THREE.Group(); el.position.y = -12; sh.add(el); { const b = new GB(); b.cyl(M(0, -10.5, 0), 2.2 * g, 2.8 * g, 10.5, 7, gl); if (L.glove) b.cyl(M(0, -4, 0), 3.2, 3.4, 4, 7, mulc(gl, .85)); if (L.glovePlate) { const bk = L.bulky ? 1.25 : 1; b.ico(M(0, .2, -1, 0, 0, 0, 1, .8, 1), 3.6 * bk, 0, mulc(gl, 1.12)); b.cyl(M(0, -6.5, 0), 3.4 * bk, 4.4 * bk, 4.5, 8, mulc(gl, 1.08)); b.box(M(0, -12.4, 2.2), 4.4, 3, 1.6, mulc(gl, 1.15)); } b.ico(M(0, -12, .6, 0, 0, 0, 1, 1.15, .8), 2.6, 0, L.glove ? gl : sk); el.add(bm(b)); }
    const hand = new THREE.Group(); hand.position.y = -12; el.add(hand); return { sh, el, hand }; };
  const leg = s => { const hp = new THREE.Group(); hp.position.set(s * 4.4 * g, -2, 0); hips.add(hp); { const b = new GB(); b.cyl(M(0, -12, 0), 3.2 * g, 4 * g, 12.5, 7, lg); if (L.legPlate) { b.box(M(0, -6, 3.8 * g, -.06), 6 * g, 10, 1.2, mulc(lg, 1.12)); b.cyl(M(0, -1.6, 0), 4.6 * g, 4.8 * g, 3, 8, mulc(lg, .9)); } hp.add(bm(b)); }
    const kn = new THREE.Group(); kn.position.y = -12; hp.add(kn); { const b = new GB(); b.cyl(M(0, -10, 0), 2.9 * g, 3.4 * g, 10, 7, bo); b.cyl(M(0, -4, 0), 3.8 * g, 3.6 * g, 4, 7, mulc(bo, 1.1)); b.box(M(0, -12.2, 2.2), 5.8, 3.4, 10, mulc(bo, .85)); if (L.legPlate) { const bk = L.bulky ? 1.2 : 1, pc = mulc(bo, 1.15); b.ico(M(0, .4, 2.6, 0, 0, 0, 1, .9, .8), 3.8 * bk, 0, pc); b.box(M(0, -6, 3.2, -.05), 5.4 * bk, 9, 1.4, pc); b.box(M(0, -2, 3.9), 1, 3, 1, mulc(pc, 1.2)); } kn.add(bm(b)); } return { hp, kn }; };
  const A = { r: arm(-1), l: arm(1) }, Lg = { r: leg(-1), l: leg(1) }; let cape = null;
  if (L.cape) { cape = new THREE.Group(); cape.position.set(0, 21, -7); hips.add(cape); const b = new GB(); const cc = lift(L.cape); const cn = L.longCape ? 5 : 4; for (let k = 0; k < cn; k++) { const y0 = -k * 9, y1 = -(k + 1) * 9, w0 = 10 + k * 1.6, w1 = 10 + (k + 1) * 1.6, z0 = -k * 1.3, z1 = -(k + 1) * 1.3; b.shape([[-w0, y0, z0], [w0, y0, z0], [w1, y1, z1], [-w1, y1, z1]], [0, 2, 1, 0, 3, 2, 0, 1, 2, 0, 2, 3], M(), mulc(cc, 1 - k * .05)); } cape.add(bm(b)); }
  const s = L.s || 1; root.scale.setScalar(s); root.userData = { body, hips, head, neck, A, L: Lg, cape, wep: null, sh: null };
  root.traverse(o => { if (o.isMesh) o.castShadow = true; }); return root; }
export function setGear(m, wep, sh, wep2) { const u = m.userData; if (u.wep) u.A.r.hand.remove(u.wep); if (u.sh) u.A.l.hand.remove(u.sh); u.wep = wep; u.sh = sh || wep2 || null; if (wep) { wep.rotation.set(Math.PI / 2, 0, 0); u.A.r.hand.add(wep); } if (wep2) { wep2.rotation.set(Math.PI / 2, 0, 0); u.A.l.hand.add(wep2); } else if (sh) { sh.position.set(2, 0, 4); sh.rotation.set(0, Math.PI / 2 * 0, 0); u.A.l.hand.add(sh); } }
/* póz: walk fázis, mozgás erőssége, kar-lendítés (sw: -2..2), védekezés, gurulás, halál */
export function poseMan(m, o) { const u = m.userData, w = o.walk || 0, k = o.mv || 0, sw = Math.sin(w), cw = Math.cos(w);
  u.L.r.hp.rotation.x = sw * .75 * k; u.L.l.hp.rotation.x = -sw * .75 * k; u.L.r.kn.rotation.x = Math.max(0, -cw) * .9 * k; u.L.l.kn.rotation.x = Math.max(0, cw) * .9 * k; u.body.position.y = Math.abs(cw) * 1.6 * k;
  u.hips.rotation.y = sw * .08 * k; u.A.l.sh.rotation.set(-sw * .5 * k, 0, .12); u.A.l.el.rotation.x = -.3 - .2 * k; u.A.r.sh.rotation.set(sw * .5 * k, 0, -.12); u.A.r.el.rotation.x = -.35;
  if (o.sw != null) { const a = o.sw; u.A.r.sh.rotation.set(-1.2 - Math.cos(a) * .5, 0, -.2 - Math.sin(a) * 1.1); u.A.r.el.rotation.x = -.2 - Math.max(0, Math.cos(a)) * .5; u.hips.rotation.y = -Math.sin(a) * .45; }
  if (o.atk) { const A = o.atk, e = A.k, cl = A.cl, L = cl === 'dual' && A.dir < 0, sA = L ? u.A.l : u.A.r, sg = L ? -1 : 1;
    if (A.ty === 'h') { const a = (-1.6 + 3.2 * e) * A.dir * (cl === 'great' ? 1.15 : 1); sA.sh.rotation.set(-1.2 - Math.cos(a) * .5, 0, sg * (-.2 - Math.sin(a) * 1.1 * sg)); sA.el.rotation.x = -.2 - Math.max(0, Math.cos(a)) * .5; u.hips.rotation.y = -Math.sin(a) * (cl === 'great' ? .7 : .45); }
    else if (A.ty === 'v') { const w = e < .35 ? e / .35 : 1, d = e < .35 ? 0 : clamp((e - .35) / .4, 0, 1); sA.sh.rotation.set(-1.2 - 1.7 * w + 2.4 * d, 0, -.15 * sg); sA.el.rotation.x = -.9 * w + .8 * d; u.hips.rotation.x = .3 * d; }
    else if (A.ty === 't') { const p = e < .4 ? e / .4 : 1, x = e < .4 ? 0 : clamp((e - .4) / .25, 0, 1); sA.sh.rotation.set(-.8 - .75 * x + .3 * p * (1 - x), 0, -.1 * sg); sA.el.rotation.x = -1.7 * p * (1 - x); u.hips.rotation.y = .35 * p - .75 * x; }
    else if (A.ty === 's') { for (const s of ['r', 'l']) { u.A[s].sh.rotation.set(-1.1, 0, s === 'r' ? -1.3 : 1.3); u.A[s].el.rotation.x = -.15; } }
    if (cl === 'great') { u.A.l.sh.rotation.set(u.A.r.sh.rotation.x, 0, -u.A.r.sh.rotation.z * .3 + .55); u.A.l.el.rotation.x = u.A.r.el.rotation.x - .5; } }
  if (o.raise) { u.A.r.sh.rotation.set(-2.6, 0, -.2); u.A.r.el.rotation.x = -.6; }
  if (o.cast) { u.A.r.sh.rotation.set(-1.5, 0, 0); u.A.l.sh.rotation.set(-1.5, 0, 0); u.A.r.el.rotation.x = 0; u.A.l.el.rotation.x = 0; }
  if (o.block) { u.A.l.sh.rotation.set(-1.35, 0, -.55); u.A.l.el.rotation.x = -1.1; }
  if (o.bow) { u.A.l.sh.rotation.set(-1.55, 0, .1); u.A.r.sh.rotation.set(-1.5, 0, -.4); u.A.r.el.rotation.x = -1.3 * (o.draw || .3); }
  u.neck.rotation.x = 0; u.body.position.z = 0; if (!o.atk) u.hips.rotation.x = 0;
  if (o.roll) { const r = o.roll, e = r * r * (3 - 2 * r), th = e * TAU, tk = clamp(Math.sin(Math.PI * Math.min(1, r * 1.15)) * 1.7, 0, 1), c0 = 25 - 3 * tk;
    for (const s of ['r', 'l']) { u.L[s].hp.rotation.x = -1.7 * tk; u.L[s].kn.rotation.x = 2.3 * tk; u.A[s].sh.rotation.set(-1.1 * tk, 0, (s === 'r' ? -.2 : .2)); u.A[s].el.rotation.x = -1.5 * tk; } u.neck.rotation.x = .7 * tk; u.hips.rotation.y = 0;
    u.body.rotation.set(th, 0, 0); u.body.position.y = c0 - c0 * Math.cos(th) - 5 * tk; u.body.position.z = -c0 * Math.sin(th) + 10 * Math.sin(Math.PI * r); if (u.cape) u.cape.rotation.x = .15 + .45 * tk; return; }
  u.body.rotation.set(0, 0, o.tilt || 0); if (o.dead) { u.body.rotation.x = -Math.min(1.5, o.dead * 4); u.body.position.y = -Math.min(1, o.dead * 3) * 10; }
  if (u.cape) u.cape.rotation.x = .1 + k * .5 + Math.sin(w * 2) * .06 * k; }

/* ---------- lények ---------- */
export function makeBeast(t, s = 1) { const root = new THREE.Group(), body = new THREE.Group(); root.add(body); const u = { body, legs: [], t }; root.userData = u;
  const P = (g, c, x, y, z, o, par = body) => { const m = part(g, c, o); m.position.set(x, y, z); par.add(m); return m; };
  if (t === 'kutya' || t === 'jfarkas') { const c = t === 'jfarkas' ? hex('#c4d0da') : hex('#6e5c48'), d = t === 'jfarkas' ? hex('#8696a6') : hex('#3e3228'), ey = t === 'jfarkas' ? '#9fdcff' : '#ffb020';
    { const b = new GB(); b.ico(M(0, 22, 8, 0, 0, 0, 1, .95, 1.25), 9, 1, c, .12); b.ico(M(0, 21, -6, 0, 0, 0, .9, .85, 1.3), 8, 1, mulc(c, .95), .12); b.ico(M(0, 26, 4, 0, 0, 0, 1.1, .5, 1.6), 7.4, 1, d, .2); for (let k = 0; k < 7; k++) b.cyl(M((k % 2 - .5) * 6, 26, 10 - k * 2.4, 0, -.6, (k % 2 - .5) * .5), 0, 2.4, 7, 4, d, false); const m = bm(b); body.add(m); }
    const hd = new THREE.Group(); hd.position.set(0, 27, 15); body.add(hd); u.head = hd; { const b = new GB(); b.ico(M(0, 0, 0, 0, 0, 0, 1, .9, 1.05), 6.4, 1, c, .1); b.cyl(M(0, -1.6, 4, 0, Math.PI / 2, 0), 2, 3.6, 10, 6, mulc(c, .92)); b.box(M(0, -1.2, 14), 2.4, 2, 1.6, hex('#141010')); b.box(M(0, -4.4, 9), 4, 1.2, 7, d);
      for (const sx of [-1, 1]) { b.cyl(M(sx * 3.4, 3.6, -1.4, 0, -.25, sx * .25), 0, 2.2, 6, 4, d); b.glow = 1; b.ico(M(sx * 2.8, 1.2, 4.6), 1.1, 0, hex(ey)); b.glow = 0; } hd.add(bm(b)); }
    for (const [x, z] of [[-4.6, 12], [4.6, 12], [-4.6, -10], [4.6, -10]]) { const l = new THREE.Group(); l.position.set(x, 20, z); body.add(l); const b = new GB(); b.cyl(M(0, -10, 0), 2, 3.2, 10, 6, c); b.cyl(M(0, -19, z > 0 ? 0 : -1.2, 0, z > 0 ? 0 : .25, 0), 1.6, 2, 9, 5, d); b.box(M(0, -20, 1.2), 3, 1.8, 4, d); l.add(bm(b)); u.legs.push(l); }
    { const tl = new THREE.Group(); tl.position.set(0, 24, -16); body.add(tl); const b = new GB(); b.cyl(M(0, 0, 0, 0, -2.3, 0), .8, 3.4, 16, 6, c); b.cyl(M(0, -6, -12, 0, -2.6, 0), 0, 2.4, 8, 5, d); tl.add(bm(b)); u.tail = tl; } }
  else if (t === 'varju') { const c = '#1c1a1e'; P(geo('crowb', () => new THREE.IcosahedronGeometry(6, 1)), c, 0, 8, 0).scale.set(.8, .8, 1.3); P(geo('crowh', () => new THREE.IcosahedronGeometry(3.8, 1)), c, 0, 12, 7); const bk = P(geo('crowk', () => new THREE.ConeGeometry(1.4, 5, 4)), '#3a3226', 0, 11.5, 11); bk.rotation.x = Math.PI / 2; P(geo('eye', () => new THREE.SphereGeometry(1.1, 5, 4)), '#ff3020', 1.8, 13, 9, { e: '#ff3020', ei: 2 });
    for (const sx of [-1, 1]) { const w = new THREE.Group(); w.position.set(sx * 4, 10, 0); body.add(w); const wm = P(geo('wing', () => { const g = new THREE.PlaneGeometry(20, 10); g.translate(10, 0, 0); g.rotateX(-Math.PI / 2); return g; }), c, 0, 0, 0, { r: .9 }, w); wm.material = smat(c); wm.material.side = THREE.DoubleSide; wm.scale.x = sx; u.legs.push(w); } }
  else if (t === 'nyalka') { const m = P(geo('slime', () => new THREE.IcosahedronGeometry(16, 2)), '#5a6a3a', 0, 12, 0, { r: .3, t: 1, o: .88 }); m.material = new THREE.MeshStandardMaterial({ color: '#5a6a3a', roughness: .25, metalness: .1, transparent: true, opacity: .86, flatShading: true }); u.blob = m; for (const sx of [-1, 1]) P(geo('eye2', () => new THREE.SphereGeometry(2, 6, 5)), '#e8ff9a', sx * 5, 18, 12, { e: '#c8ff7a', ei: 1.5 }); }
  else if (t === 'skorp' || t === 'sorak') { const c = t === 'sorak' ? '#e8dcd6' : '#b8893f', d = t === 'sorak' ? '#a8989a' : '#7a5622'; const tor = P(capsule(8, 12), c, 0, 10, 0, { r: .5 }); tor.rotation.x = Math.PI / 2; tor.scale.set(1.3, 1, .7);
    for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) { const l = new THREE.Group(); l.position.set(sx * 8, 9, -4 + i * 6); body.add(l); const lm = P(capsule(1.3, 10), d, sx * 6, -2, 0, null, l); lm.rotation.z = sx * 1.1; u.legs.push(l); }
    for (const sx of [-1, 1]) { const cl = new THREE.Group(); cl.position.set(sx * 7, 10, 12); body.add(cl); P(capsule(2.4, 8), c, sx * 2, 0, 5, null, cl).rotation.x = Math.PI / 2; P(geo('claw', () => new THREE.ConeGeometry(3.5, 9, 5)), d, sx * 2, 0, 14, null, cl).rotation.x = Math.PI / 2; }
    const tail = new THREE.Group(); tail.position.set(0, 12, -10); body.add(tail); u.tail = tail; let par = tail; for (let i = 0; i < 4; i++) { const sg = new THREE.Group(); sg.position.set(0, i ? 6 : 0, i ? -2 : 0); sg.rotation.x = -.55; par.add(sg); P(geo('seg', () => new THREE.IcosahedronGeometry(3.6, 0)), c, 0, 3, 0, null, sg); par = sg; } P(geo('sting', () => new THREE.ConeGeometry(2, 8, 5)), '#2a1a10', 0, 7, 2, null, par).rotation.x = .9; }
  else if (t === 'ordog' || t === 'sutto') { u.swirl = []; const c = t === 'sutto' ? '#b8d8a8' : '#d6ba80'; for (let i = 0; i < 6; i++) { const r = part(geo('dv' + i, () => new THREE.TorusGeometry(5 + i * 2.6, 1.3, 3, 12, Math.PI * 1.5)), c, { t: 1, o: .7 - i * .06, e: c, ei: t === 'sutto' ? .6 : .1 }); r.rotation.x = Math.PI / 2; r.position.y = 4 + i * 8; body.add(r); u.swirl.push(r); } }
  root.scale.setScalar(s); root.traverse(o => { if (o.isMesh) o.castShadow = true; }); return root; }
export function poseBeast(m, o) { const u = m.userData, w = o.walk || 0, k = o.mv || 0, T = o.T || 0;
  if (u.t === 'varju') { const f = o.fly ? Math.sin(T * 18 + o.ph) : Math.sin(T * 2 + o.ph) * .2; u.legs.forEach((l, i) => l.rotation.z = (i ? 1 : -1) * (f * .9 - (o.fly ? 0 : .7))); u.body.position.y = o.fly ? 30 + Math.sin(T * 4 + o.ph) * 5 : 0; }
  else if (u.t === 'nyalka') { const h = Math.abs(Math.sin(T * (k > .2 ? 7 : 3) + o.ph)); u.blob.scale.set(1 + (1 - h) * .15 + (o.wind ? .2 : 0), .8 + h * .3 - (o.wind ? .25 : 0), 1 + (1 - h) * .15); u.body.position.y = h * 5 * k; }
  else if (u.swirl) { u.swirl.forEach((r, i) => { r.rotation.z = T * (5 + i) + i; r.position.x = Math.sin(T * 3 + i) * 3; }); }
  else { u.legs.forEach((l, i) => { l.rotation.x = Math.sin(w + i * 1.7) * .6 * k; }); if (u.tail) { if (u.t === 'skorp' || u.t === 'sorak') u.tail.rotation.x = (o.wind ? .9 : .2) + Math.sin(T * 3) * .1; else { u.tail.rotation.x = Math.sin(T * 3) * .12; u.tail.rotation.y = Math.sin(T * 6) * .35 * Math.max(.2, k); } } if (u.head) u.head.rotation.x = o.wind ? -.3 : 0; u.body.rotation.x = o.wind ? -.12 : 0; }
  if (o.dead) { u.body.rotation.z = Math.min(1.5, o.dead * 4); u.body.position.y = -Math.min(1, o.dead * 2) * 4; } }
