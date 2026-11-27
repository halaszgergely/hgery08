// Járművek: adatok és procedurális modellek (orr: −Z, fel: +Y). Karosszéria héjból (keresztmetszet-kulcsok), külön fényezés/üveg/lámpa/kerék hálóval.
import * as THREE from 'three';
import { mergeGeometries } from '../lib/addons/utils/BufferGeometryUtils.js?v=202611271522';

/* ---------- anyagok ---------- */
const MC = new Map(); const nmat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .45, metalness: .1, ...o });
export const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!MC.has(k)) MC.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: .45, metalness: .1, ...o })); return MC.get(k); };
const CHROME = () => mat(0xdfe3e8, { roughness: .15, metalness: .95 }), RUBBER = () => mat(0x18191b, { roughness: .9 }), TRIM = () => mat(0x22252a, { roughness: .6, metalness: .2 });
const GLASS = () => mat(0x22323d, { roughness: .06, metalness: .85, envMapIntensity: 1.6 });
/* héj keresztmetszet-kulcsokból: [z, félszélesség, felső félmagasság, alsó félmagasság, középvonal y, alakkitevő] */
function loft(keys, seg = 24, sub = 4) {
  const K = keys.map(k => ({ z: k[0], w: k[1], ht: k[2], hb: k[3] ?? k[2], y: k[4] ?? 0, p: k[5] ?? 4 })), S = [];
  for (let i = 0; i < K.length - 1; i++) { const a = K[Math.max(0, i - 1)], b = K[i], c = K[i + 1], d = K[Math.min(K.length - 1, i + 2)];
    for (let s = 0; s < sub; s++) { const t = s / sub, cr = k => .5 * (2 * b[k] + (c[k] - a[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t * t + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * t * t * t);
      S.push({ z: b.z + (c.z - b.z) * t, w: Math.max(0, cr('w')), ht: Math.max(0, cr('ht')), hb: Math.max(0, cr('hb')), y: cr('y'), p: b.p + (c.p - b.p) * t }); } }
  S.push(K[K.length - 1]);
  const P = [], I = [], ring = s => { for (let j = 0; j < seg; j++) { const th = j / seg * Math.PI * 2, c = Math.cos(th), sn = Math.sin(th), e = 2 / s.p; P.push(s.w * Math.sign(c) * Math.abs(c) ** e, s.y + (sn >= 0 ? s.ht : s.hb) * Math.sign(sn) * Math.abs(sn) ** e, s.z); } };
  for (const s of S) ring(s); const n = S.length;
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) { const a = i * seg + j, b = i * seg + (j + 1) % seg, c = a + seg, d = b + seg; I.push(a, b, c, b, d, c); }
  for (const [si, front] of [[0, true], [n - 1, false]]) { const s = S[si], base = P.length / 3; P.push(0, s.y, s.z); ring(s); for (let j = 0; j < seg; j++) { const a = base + 1 + j, b = base + 1 + (j + 1) % seg; front ? I.push(base, b, a) : I.push(base, a, b); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals(); return g;
}
const add = (par, g, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; par.add(o); return o; };
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const WG = new Map(), WHEELM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .55, metalness: .35 });
function colored(g, c) { g = g.index ? g.toNonIndexed() : g; const cc = new THREE.Color(c), a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = cc.r; a[i + 1] = cc.g; a[i + 2] = cc.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
function wheel(r, w) { const k = r + '|' + w; if (!WG.has(k)) WG.set(k, mergeGeometries([colored(new THREE.CylinderGeometry(r, r, w, 18).rotateZ(Math.PI / 2), 0x18191b), colored(new THREE.CylinderGeometry(r * .62, r * .62, w * 1.02, 14).rotateZ(Math.PI / 2), 0xc8ccd2), colored(new THREE.CylinderGeometry(r * .2, r * .2, w * 1.06, 8).rotateZ(Math.PI / 2), 0x2a2d32)]));
  const m = new THREE.Mesh(WG.get(k), WHEELM); m.castShadow = true; return m; }
/* a test közvetlen hálóinak összevonása anyagonként (kevesebb rajzolási hívás) */
function mergeBody(body) {
  const by = new Map(); for (const o of [...body.children]) if (o.isMesh && !o.userData.keep) { if (!by.has(o.material)) by.set(o.material, []); by.get(o.material).push(o); }
  for (const [m, list] of by) { if (list.length < 2) continue; const gs = list.map(o => { o.updateMatrix(); let g = o.geometry.clone().applyMatrix4(o.matrix); if (g.index) g = g.toNonIndexed(); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; });
    const mg = mergeGeometries(gs); if (!mg) continue; list.forEach(o => body.remove(o)); const mm = new THREE.Mesh(mg, m); mm.castShadow = true; body.add(mm); }
}

/* ---------- adatok ----------
   m: tömeg, P: teljesítmény (N hajtóerő-csúcs), vmax m/s, grip, steer (rad), wb (tengelytáv), tr (nyomtáv), r (kerék), w,h,l (méret), kind: car|bike|heli|tank */
export const VEH = {
  trabant: { n: 'Trabant 601', kind: 'car', m: 620, P: 5200, vmax: 30, grip: 1.05, steer: .62, wb: 2.02, tr: 1.2, r: .3, w: 1.5, h: 1.45, l: 3.55, price: 1500, cols: [0x7fb0a8, 0xe6d8b0, 0x9ab4cc, 0xc94a3a, 0xf2f2e6], radio: 'retro' },
  lada: { n: 'Lada 1200', kind: 'car', m: 960, P: 7600, vmax: 40, grip: 1.08, steer: .6, wb: 2.42, tr: 1.35, r: .33, w: 1.61, h: 1.44, l: 4.07, price: 3500, cols: [0xd8d0b8, 0x7a1f1f, 0x2f5e8c, 0x3f6b3a, 0xe8e8e2], radio: 'retro' },
  wartburg: { n: 'Wartburg 353', kind: 'car', m: 900, P: 7000, vmax: 38, grip: 1.04, steer: .6, wb: 2.45, tr: 1.3, r: .33, w: 1.64, h: 1.5, l: 4.22, price: 3000, cols: [0xb7c4cf, 0x8c6a3a, 0x4f6a4a, 0xe0d6be], radio: 'retro' },
  babetta: { n: 'Babetta', kind: 'bike', m: 120, P: 1100, vmax: 14, grip: 1.1, steer: .7, wb: 1.08, tr: 0, r: .28, w: .55, h: 1.1, l: 1.65, price: 500, cols: [0xc0392b, 0x2a6fd1, 0xf2c230], radio: 0 },
  riga: { n: 'Riga moped', kind: 'bike', m: 135, P: 1500, vmax: 17, grip: 1.1, steer: .65, wb: 1.18, tr: 0, r: .3, w: .6, h: 1.12, l: 1.8, price: 700, cols: [0x3a7d44, 0x1b4f8f, 0x8c1f2a], radio: 0 },
  ikarus: { n: 'Ikarus 260', kind: 'car', m: 9800, P: 52000, vmax: 22, grip: .95, steer: .55, wb: 5.4, tr: 2.1, r: .52, w: 2.5, h: 3.1, l: 11, price: 0, cols: [0xe8862a], radio: 'pop', bus: 1 },
  ifa: { n: 'IFA W50', kind: 'car', m: 6200, P: 36000, vmax: 24, grip: .98, steer: .55, wb: 3.2, tr: 1.9, r: .5, w: 2.4, h: 2.9, l: 6.5, price: 9000, cols: [0x4a6a3a, 0x2f5e8c, 0x8c3a2a], radio: 'retro', truck: 1 },
  kamaz: { n: 'Kamaz 5320', kind: 'car', m: 7800, P: 48000, vmax: 26, grip: .98, steer: .5, wb: 3.7, tr: 2, r: .54, w: 2.5, h: 3.1, l: 7.4, price: 14000, cols: [0xd27a1a, 0x2f6fa8, 0x3a3a3a], radio: 'techno', truck: 1 },
  modern: { n: 'Aquila GT', kind: 'car', m: 1400, P: 15000, vmax: 58, grip: 1.25, steer: .58, wb: 2.7, tr: 1.6, r: .35, w: 1.9, h: 1.3, l: 4.5, price: 18000, cols: [0x15181c, 0xe8e8ea, 0xb11f2a, 0x1f5fbf, 0x8a8f96], radio: 'pop' },
  taxi: { n: 'Lada Taxi', kind: 'car', m: 980, P: 7800, vmax: 40, grip: 1.08, steer: .6, wb: 2.42, tr: 1.35, r: .33, w: 1.61, h: 1.44, l: 4.07, price: 0, cols: [0xf2c230], radio: 'pop', model: 'lada', taxi: 1 },
  hgwsvan: { n: 'HGWS szervizkisbusz', kind: 'car', m: 1900, P: 12000, vmax: 38, grip: 1.08, steer: .58, wb: 3, tr: 1.6, r: .36, w: 1.95, h: 2.3, l: 5, price: 0, cols: [0xffffff], radio: 'pop', hgws: 1 },
  locsolo: { n: 'HGWS locsolókocsi', kind: 'car', m: 7000, P: 42000, vmax: 26, grip: 1, steer: .52, wb: 3.6, tr: 2, r: .52, w: 2.5, h: 3, l: 7.2, price: 0, cols: [0xf2c230], radio: 'pop', hgws: 1, sprayer: 1 },
  vizugy: { n: 'Vízügyi járőrautó', kind: 'car', m: 1300, P: 12500, vmax: 48, grip: 1.18, steer: .6, wb: 2.6, tr: 1.5, r: .34, w: 1.8, h: 1.45, l: 4.5, price: 0, cols: [0x1d4f8f], radio: 0, cop: 1, model: 'modern' },
  pancel: { n: 'Vízügyi páncélautó', kind: 'car', m: 9000, P: 60000, vmax: 30, grip: 1.05, steer: .5, wb: 3.6, tr: 2.1, r: .6, w: 2.6, h: 2.6, l: 6.8, price: 0, cols: [0x2c3e50], radio: 0, cop: 1, armored: 1 },
  ka26: { n: 'HGWS Ka-26', kind: 'heli', m: 2500, P: 0, vmax: 42, grip: 1, steer: 0, wb: 0, tr: 0, r: 0, w: 2.6, h: 4, l: 7.8, price: 0, cols: [0xe8833a], radio: 'pop' },
  vizheli: { n: 'Vízügyi helikopter', kind: 'heli', m: 2500, P: 0, vmax: 45, grip: 1, steer: 0, wb: 0, tr: 0, r: 0, w: 2.6, h: 4, l: 7.8, price: 0, cols: [0x1d4f8f], radio: 0, cop: 1, model: 'ka26' },
  tank: { n: 'HGWS T-55 „Vízágyú”', kind: 'tank', m: 36000, P: 260000, vmax: 15, grip: 1.6, steer: 0, wb: 3.9, tr: 2.6, r: .45, w: 3.3, h: 2.4, l: 6.4, price: 0, cols: [0x4f5a3a], radio: 'techno' }
};
export const TRAFFIC_TYPES = ['trabant', 'trabant', 'trabant', 'lada', 'lada', 'lada', 'wartburg', 'wartburg', 'modern', 'modern', 'taxi', 'ifa', 'kamaz', 'hgwsvan', 'ikarus', 'babetta', 'riga'];

/* ---------- modellek ---------- */
function sedan(g, J, paint, o = {}) {   // személyautó: alsó karosszéria + üvegezett utastér festett tetővel és oszlopokkal
  const w = J.w / 2, l = J.l / 2, H = J.h, r = J.r, low = r * 1.02, belt = o.belt ?? H * .6, roof = H, hh = (belt - low) / 2, cy = (belt + low) / 2;
  const nose = o.nose ?? .75, tail = o.tail ?? .85;
  add(g, loft([[-l, w * .9, hh * nose * .7, hh * .7, cy - hh * .12, 6], [-l + .18, w * .97, hh * nose, hh * .95, cy - hh * (1 - nose) * .5, 9], [-l * .45, w, hh, hh, cy, 12], [l * .45, w, hh, hh, cy, 12], [l - .18, w * .97, hh * tail, hh * .95, cy - hh * (1 - tail) * .5, 9], [l, w * .9, hh * tail * .7, hh * .7, cy - hh * .1, 6]], 28, 4), paint);
  const [c0, c1] = o.cab ?? [-l * .3, l * .55], ws = o.ws ?? .55, rs = o.rs ?? .45, gh = roof - belt, rw = w * .8;
  // üveg utastér (szélvédő- és hátsóablak-dőléssel)
  add(g, loft([[c0, rw * .98, .01, .01, belt + .005, 6], [c0 + ws, rw, gh * .96, .01, belt + .005, 7], [c1 - rs, rw, gh * .96, .01, belt + .005, 7], [c1, rw * .98, .01, .01, belt + .005, 6]], 20, 3), GLASS());
  // tető és oszlopok
  add(g, loft([[c0 + ws - .06, rw * .97, .035, .035, roof - .01, 8], [c1 - rs + .06, rw * .97, .035, .035, roof - .01, 8]], 16, 2), paint);
  const pill = (z0, y0, z1, y1, x) => { const L = Math.hypot(z1 - z0, y1 - y0), m = add(g, box(.07, .07, L), paint, x, (y0 + y1) / 2, (z0 + z1) / 2); m.rotation.x = -Math.atan2(y1 - y0, z1 - z0); };
  for (const s of [-1, 1]) { const x = s * rw * .985; pill(c0 + .02, belt, c0 + ws, roof - .02, x); pill(c1 - .02, belt, c1 - rs, roof - .02, x); add(g, box(.07, gh, .09), paint, x, belt + gh / 2, (c0 + ws + c1 - rs) / 2 + (o.bpil ?? 0)); }
  add(g, box(J.w * .98, .1, .12), o.chromeB ? CHROME() : TRIM(), 0, low + hh * .55, -l - .02); add(g, box(J.w * .98, .1, .12), o.chromeB ? CHROME() : TRIM(), 0, low + hh * .55, l + .02);
  return { low, belt, roof };
}
function boxBody(g, mat2, z0, z1, w, y0, y1, p = 14, round = .12) { const hy = (y1 - y0) / 2; return add(g, loft([[z0, w - round, hy - round, hy - round, (y0 + y1) / 2, p], [z0 + round, w, hy, hy, (y0 + y1) / 2, p], [z1 - round, w, hy, hy, (y0 + y1) / 2, p], [z1, w - round, hy - round, hy - round, (y0 + y1) / 2, p]], 24, 2), mat2); }
function lamps(g, J, front, rear, yF, yR) {
  const hl = nmat(0xfff6d8, { emissive: 0xfff2c8, emissiveIntensity: .2 }), tl = nmat(0xb01818, { emissive: 0xff2020, emissiveIntensity: .25 }), l = J.l / 2, x = J.w / 2 * .7;
  const F = [add(g, front === 'round' ? new THREE.CylinderGeometry(.11, .11, .06, 12).rotateX(Math.PI / 2) : box(.32, .14, .06), hl, -x, yF, -l - .01), add(g, front === 'round' ? new THREE.CylinderGeometry(.11, .11, .06, 12).rotateX(Math.PI / 2) : box(.32, .14, .06), hl, x, yF, -l - .01)];
  const R = [add(g, box(rear === 'wide' ? .42 : .2, .14, .06), tl, -x, yR, l + .01), add(g, box(rear === 'wide' ? .42 : .2, .14, .06), tl, x, yR, l + .01)];
  return { hl, tl, F, R };
}
export function buildVehicle(id, colorIdx = 0) {
  const J = VEH[id], g = new THREE.Group(), body = new THREE.Group(); g.add(body); const col = J.cols[colorIdx % J.cols.length];
  const paint = new THREE.MeshStandardMaterial({ color: col, roughness: .32, metalness: .25 }), M = J.model || id, out = { g, body, paint, wheels: [], J, id };
  const wheelsAt = (list, r = J.r, w = .2) => { for (let [x, z, front] of list) { if (x) x = Math.sign(x) * Math.max(Math.abs(x), J.w / 2 - w / 2 - .03); const p = new THREE.Group(); p.position.set(x, r, z); g.add(p); const wh = wheel(r, w); p.add(wh); out.wheels.push({ pivot: p, mesh: wh, front, x, z }); } };
  const L = J.l / 2, tr = J.tr / 2, wb = J.wb / 2;
  if (M === 'trabant') { sedan(body, J, paint, { belt: .86, cab: [-.75, 1.15], ws: .5, rs: .5, nose: .7, tail: .8, chromeB: 1 }); out.L = lamps(body, J, 'round', 'small', .7, .78); wheelsAt([[-tr, -wb + .1, 1], [tr, -wb + .1, 1], [-tr, wb, 0], [tr, wb, 0]]); add(body, box(.5, .08, .02), TRIM(), 0, .72, -L - .01); }
  else if (M === 'lada') { sedan(body, J, paint, { belt: .9, cab: [-.7, 1.2], ws: .45, rs: .35, nose: .9, tail: .95, chromeB: 1 }); out.L = lamps(body, J, 'round', 'wide', .74, .8); add(body, box(.8, .16, .04), CHROME(), 0, .74, -L - .02); wheelsAt([[-tr, -wb, 1], [tr, -wb, 1], [-tr, wb, 0], [tr, wb, 0]]);
    if (J.taxi) { add(body, box(.5, .16, .22), mat(0x15181c, { emissive: 0xf2c230, emissiveIntensity: .4 }), 0, J.h + .08, .1); const ch = mat(0x15181c); for (let i = 0; i < 6; i++) add(body, box(.12, .1, .02), ch, -J.w / 2 + .1 + i * .25, .95, L * .2).scale.z = 1; } }
  else if (M === 'wartburg') { sedan(body, J, paint, { belt: .92, cab: [-.75, 1.3], ws: .5, rs: .45, nose: .85, tail: .95, chromeB: 1 }); out.L = lamps(body, J, 'square', 'wide', .76, .82); add(body, box(1, .14, .04), CHROME(), 0, .72, -L - .02); wheelsAt([[-tr, -wb, 1], [tr, -wb, 1], [-tr, wb, 0], [tr, wb, 0]]); }
  else if (M === 'modern') { const w = J.w / 2; sedan(body, J, paint, { belt: .82, cab: [-1.05, 1.3], ws: .85, rs: .7, nose: .6, tail: .9 }); out.L = lamps(body, J, 'square', 'wide', .7, .82); wheelsAt([[-tr, -wb, 1], [tr, -wb, 1], [-tr, wb, 0], [tr, wb, 0]], J.r, .26);
    add(body, box(J.w * .9, .05, .3), TRIM(), 0, J.h - .02 + .06, L - .05);
    if (J.cop) { const bar = new THREE.Group(); body.add(bar); bar.position.set(0, J.h + .07, .1); out.siren = [add(bar, box(.6, .12, .24), nmat(0x1040ff, { emissive: 0x2050ff, emissiveIntensity: 0 }), -.32, 0, 0), add(bar, box(.6, .12, .24), nmat(0xff2020, { emissive: 0xff2020, emissiveIntensity: 0 }), .32, 0, 0)]; add(body, box(.02, .25, 1.6), mat(0xffffff), w + .01, .75, 0); add(body, box(.02, .25, 1.6), mat(0xffffff), -w - .01, .75, 0); } }
  else if (M === 'hgwsvan') { const w = J.w / 2; boxBody(body, paint, -L + .35, L, w, .5, 2.25, 14, .14); add(body, loft([[-L, w * .9, .32, .25, .82, 6], [-L + .4, w, .4, .3, .85, 10]], 24, 2), paint);
    const gl = GLASS(); add(body, box(J.w * .86, .74, .05), gl, 0, 1.72, -L + .33); for (const s2 of [-1, 1]) { add(body, box(.04, .6, 1), gl, s2 * (w + .005), 1.72, -L + 1.05); add(body, box(.04, .55, 2.2), gl, s2 * (w + .005), 1.75, .6); add(body, box(.03, .22, 3.7), mat(0x1f8fd6), s2 * (w + .012), 1.05, .2); add(body, box(.03, .08, 3.7), mat(0xf2c230), s2 * (w + .012), .86, .2); }
    add(body, box(J.w * .5, .12, 1.6), mat(0x1f8fd6), 0, 2.31, .4); add(body, box(J.w + .04, .12, .14), TRIM(), 0, .62, -L - .02); add(body, box(J.w + .04, .12, .14), TRIM(), 0, .62, L + .02); add(body, box(J.w * .8, .9, .04), gl, 0, 1.6, L + .01);
    out.L = lamps(body, J, 'square', 'small', .95, 1.05); wheelsAt([[-tr, -wb, 1], [tr, -wb, 1], [-tr, wb, 0], [tr, wb, 0]], J.r, .22); }
  else if (M === 'ikarus') { const w = J.w / 2; add(body, loft([[-L, w * .96, 1.2, 1.05, 1.75, 9], [-L + .4, w, 1.3, 1.15, 1.75, 12], [L - .3, w, 1.3, 1.15, 1.75, 12], [L, w * .97, 1.25, 1.1, 1.75, 10]]), paint);
    const gw = mat(0x2a3440, { roughness: .1, metalness: .4 }); for (const s of [-1, 1]) add(body, box(.03, .9, J.l - 1.6), gw, s * (w + .01), 2.2, .2); add(body, box(J.w * .9, 1.2, .04), gw, 0, 2.15, -L - .02);
    add(body, box(J.w + .02, .16, J.l * .98), mat(0xf2f2e6), 0, 1.55, 0); add(body, box(1.2, .25, .05), mat(0x111111, { emissive: 0xff9a20, emissiveIntensity: .6 }), 0, 2.9, -L - .03);
    out.L = lamps(body, J, 'round', 'small', .8, 1); wheelsAt([[-tr, -wb + .3, 1], [tr, -wb + .3, 1], [-tr, wb, 0], [tr, wb, 0]], J.r, .3); }
  else if (M === 'ifa' || M === 'kamaz' || M === 'locsolo' || M === 'pancel') { const w = J.w / 2, cabL = M === 'pancel' ? J.l * .9 : 2.1, cz = -L + cabL / 2;
    boxBody(body, paint, -L, -L + cabL, w, .95, M === 'pancel' ? 2.4 : 2.75, 16, .16); add(body, box(J.w * .84, .62, .05), GLASS(), 0, 2.2, -L - .01); for (const s of [-1, 1]) add(body, box(.05, .5, .8), GLASS(), s * (w + .005), 2.2, -L + .75);
    add(body, box(J.w * .9, .3, .06), mat(0x2a2d32, { metalness: .5, roughness: .4 }), 0, 1.3, -L - .02); add(body, box(J.w + .06, .2, .2), TRIM(), 0, .95, -L - .05);
    add(body, box(J.w * .7, .25, J.l - cabL), TRIM(), 0, .95, -L + cabL + (J.l - cabL) / 2);
    if (M === 'locsolo') { const tk = add(body, new THREE.CylinderGeometry(1.05, 1.05, J.l - cabL - .4, 20).rotateX(Math.PI / 2), mat(0xe8eef2, { metalness: .6, roughness: .25 }), 0, 2.05, -L + cabL + (J.l - cabL) / 2); tk.scale.x = 1.12;
      add(body, box(.12, 2.3, .12), mat(0x1f8fd6), 0, 2.1, L - .1); const noz = new THREE.Group(); body.add(noz); noz.position.set(0, 2.7, -L - .1); add(noz, new THREE.CylinderGeometry(.08, .12, .7, 8).rotateX(Math.PI / 2), CHROME(), 0, 0, -.3); out.nozzle = noz; }
    else if (M === 'pancel') { add(body, loft([[-L + .3, w * .8, .5, .2, 2.4, 6], [L - .5, w * .85, .55, .2, 2.4, 7]]), paint); const tur = new THREE.Group(); body.add(tur); tur.position.set(0, 2.9, -.4); add(tur, new THREE.CylinderGeometry(.6, .7, .45, 12), paint); add(tur, new THREE.CylinderGeometry(.1, .14, 1.6, 8).rotateX(Math.PI / 2), TRIM(), 0, .05, -.9); out.turret = tur;
      const bar = new THREE.Group(); body.add(bar); bar.position.set(0, 3.15, .6); out.siren = [add(bar, box(.5, .12, .2), nmat(0x1040ff, { emissive: 0x2050ff, emissiveIntensity: 0 }), -.3, 0, 0), add(bar, box(.5, .12, .2), nmat(0xff2020, { emissive: 0xff2020, emissiveIntensity: 0 }), .3, 0, 0)]; }
    else { const cargo = M === 'ifa' ? mat(0x6a5a3a) : mat(0x5a6a7a); add(body, box(J.w, M === 'ifa' ? 1.1 : 1.6, J.l - cabL - .2), cargo, 0, M === 'ifa' ? 1.7 : 1.95, -L + cabL + (J.l - cabL) / 2 + .05); if (M === 'ifa') add(body, loft([[-L + cabL + .2, w, .7, .02, 2.2, 3], [L, w, .7, .02, 2.2, 3]]), mat(0x5a6b3a)); }
    out.L = lamps(body, J, 'round', 'small', 1.15, 1.1); const rear = M === 'pancel' ? [[-tr, wb, 0], [tr, wb, 0], [-tr, 0, 0], [tr, 0, 0]] : [[-tr, wb, 0], [tr, wb, 0], [-tr, wb - 1.3, 0], [tr, wb - 1.3, 0]];
    wheelsAt([[-tr, -wb, 1], [tr, -wb, 1], ...rear], J.r, .34); }
  else if (M === 'babetta' || M === 'riga') { const fr = paint; add(body, loft([[-.5, .14, .2, .15, .75, 3], [-.1, .16, .24, .18, .7, 3], [.35, .15, .2, .12, .72, 3]], 12, 3), fr);
    add(body, box(.22, .08, .55), mat(0x1a1a1a), 0, .95, .25); add(body, new THREE.CylinderGeometry(.025, .025, .85, 6), CHROME(), 0, .72, -.62).rotation.x = .35; add(body, box(.62, .04, .04), CHROME(), 0, 1.12, -.72);
    add(body, new THREE.CylinderGeometry(.09, .09, .1, 12).rotateX(Math.PI / 2), nmat(0xfff6d8, { emissive: 0xfff2c8, emissiveIntensity: .2 }), 0, 1.02, -.76); if (M === 'riga') add(body, box(.36, .22, .42), paint, 0, .9, .65);
    out.L = { hl: body.children.at(-1).material, tl: nmat(0xb01818, { emissive: 0xff2020, emissiveIntensity: .2 }), F: [], R: [] }; wheelsAt([[0, -J.wb / 2, 1], [0, J.wb / 2, 0]], J.r, .08); }
  else if (M === 'ka26') { // koaxiális rotoros könnyű helikopter: kabin, két farokgerenda, két rotor
    add(body, loft([[-2.2, .02, .02, .02, 1.6, 3], [-1.8, .75, .8, .55, 1.65, 3], [-.6, .95, .95, .6, 1.75, 4], [.6, .9, .9, .55, 1.75, 4], [1.1, .6, .6, .4, 1.8, 3]]), paint);
    add(body, loft([[-2.15, .02, .02, .02, 1.75, 3], [-1.7, .72, .65, .2, 1.95, 3], [-.8, .9, .7, .1, 2.05, 3], [-.4, .02, .02, .02, 2.2, 3]]), GLASS());
    for (const s of [-1, 1]) { add(body, box(.12, .12, 3.6), paint, s * .8, 2.1, 2.6); add(body, box(.05, .9, .7), paint, s * .8, 2.4, 4.3); }
    add(body, box(1.8, .1, .1), paint, 0, 2.1, 4.3); add(body, new THREE.CylinderGeometry(.12, .16, .9, 8), TRIM(), 0, 2.9, 0);
    out.rotors = []; for (const y of [3.3, 3.75]) { const r = new THREE.Group(); r.position.set(0, y, 0); body.add(r); for (let i = 0; i < 3; i++) add(r, box(.28, .04, 6.4), TRIM(), 0, 0, 0, 0, i * Math.PI * 2 / 3); out.rotors.push(r); }
    for (const s of [-1, 1]) add(body, new THREE.CylinderGeometry(.05, .05, 2.6, 6).rotateX(Math.PI / 2), TRIM(), s * .9, .35, 0); for (const [x, z] of [[-.9, -.6], [.9, -.6], [-.9, .6], [.9, .6]]) add(body, box(.05, .8, .05), TRIM(), x, .75, z);
    if (J.cop) { out.search = new THREE.SpotLight(0xe8f0ff, 0, 160, .22, .5, 1.2); out.search.position.set(0, .8, -1.4); body.add(out.search); body.add(out.search.target); out.search.target.position.set(0, -20, -14); } else { add(body, box(1.6, .02, .5), mat(0x1f8fd6), 0, 1.2, -.2); for (const s of [-1, 1]) add(body, new THREE.CylinderGeometry(.04, .04, 2.6, 6).rotateZ(Math.PI / 2), CHROME(), s * 1.6, .6, .2); }
    out.L = { hl: nmat(0xffffff), tl: nmat(0xffffff), F: [], R: [] }; }
  else if (M === 'tank') { const w = J.w / 2; add(body, loft([[-L, w * .9, .35, .35, .95, 6], [-L + .6, w, .45, .45, 1, 8], [L - .5, w, .45, .45, 1, 8], [L, w * .9, .35, .35, .95, 6]]), paint);
    for (const s of [-1, 1]) { const tr2 = add(body, box(.55, .85, J.l - .2), mat(0x2a2c2a, { roughness: .9 }), s * (w - .1), .48, 0); tr2.userData.track = 1; for (let i = 0; i < 6; i++) add(body, new THREE.CylinderGeometry(.36, .36, .5, 12).rotateZ(Math.PI / 2), TRIM(), s * (w - .1), .42, -L + .7 + i * (J.l - 1.4) / 5); }
    const tur = new THREE.Group(); tur.position.set(0, 1.55, .2); body.add(tur); add(tur, loft([[-1.4, 1.15, .45, .1, 0, 3], [0, 1.4, .55, .1, 0, 3], [1.4, 1.1, .4, .1, 0, 3]], 20, 3), paint);
    const gun = new THREE.Group(); gun.position.set(0, .15, -1.2); tur.add(gun); add(gun, new THREE.CylinderGeometry(.11, .14, 3.8, 10).rotateX(Math.PI / 2), paint, 0, 0, -1.9); add(gun, new THREE.CylinderGeometry(.2, .16, .5, 10).rotateX(Math.PI / 2), mat(0x1f8fd6), 0, 0, -3.8);
    add(tur, new THREE.CylinderGeometry(.35, .35, .2, 12), TRIM(), .5, .55, .4); out.turret = tur; out.gun = gun; out.L = { hl: nmat(0xffffff), tl: nmat(0xffffff), F: [], R: [] }; }
  mergeBody(body);
  // árnyék és sérülés-előkészítés: a fényezett hálók csúcsait megőrizzük (horpadás)
  body.traverse(o => { if (o.isMesh && o.material === paint) { o.geometry = o.geometry.clone(); o.userData.base = o.geometry.attributes.position.array.slice(); } });
  // repedt szélvédő overlay
  const crack = new THREE.Mesh(new THREE.PlaneGeometry(J.w * .8, .6), new THREE.MeshBasicMaterial({ map: crackTex(), transparent: true, depthWrite: false })); crack.visible = false; crack.position.set(0, J.h * .78, -J.l / 2 * .45); crack.rotation.x = -.6; if (J.kind === 'car') body.add(crack); out.crack = crack;
  return out;
}
let CT = null; function crackTex() { if (CT) return CT; const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 1.5;
  for (let k = 0; k < 3; k++) { const cx = 60 + Math.random() * 140, cy = 80 + Math.random() * 100; for (let i = 0; i < 12; i++) { let px = cx, py = cy, a = i / 12 * 6.28; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 6; j++) { a += (Math.random() - .5) * .6; px += Math.cos(a) * 14; py += Math.sin(a) * 14; x.lineTo(px, py); } x.stroke(); } x.beginPath(); x.arc(cx, cy, 6, 0, 6.28); x.stroke(); }
  CT = new THREE.CanvasTexture(c); return CT; }
/* horpadás: a becsapódási pont körül a fényezett héj csúcsai befelé mozdulnak */
export function dent(model, local, amount) {
  model.body.traverse(o => { if (!o.isMesh || !o.userData.base) return; const p = o.geometry.attributes.position, a = p.array, l = local.clone().sub(o.position), n = l.clone().normalize();
    for (let i = 0; i < a.length; i += 3) { const dx = a[i] - l.x, dy = a[i + 1] - l.y, dz = a[i + 2] - l.z, d2 = dx * dx + dy * dy + dz * dz; if (d2 > 1.4) continue; const k = (1 - d2 / 1.4) * amount; a[i] -= n.x * k; a[i + 1] -= n.y * k * .5; a[i + 2] -= n.z * k; }
    p.needsUpdate = true; o.geometry.computeVertexNormals(); });
}
export function repair(model) { model.body.traverse(o => { if (!o.isMesh || !o.userData.base) return; o.geometry.attributes.position.array.set(o.userData.base); o.geometry.attributes.position.needsUpdate = true; o.geometry.computeVertexNormals(); }); if (model.crack) model.crack.visible = false; }
