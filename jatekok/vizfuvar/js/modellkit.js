/* Modellező segédek: PBR anyagok, simított keresztmetszetű héjak (karosszéria, tartály, ballon), csövek, lekerekített dobozok, HGWS logó.
   Egység: méter; orr −Z, fel +Y, jobb +X. */
import * as THREE from 'three';

const MC = new Map();
export function M(c, o = {}) { const k = c + JSON.stringify(o); if (!MC.has(k)) MC.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: .42, metalness: .08, ...o })); return MC.get(k); }
export const FEST = c => M(c, { roughness: .28, metalness: .15, envMapIntensity: 1.1 });   // fényezés
export const KROM = () => M(0xdfe3e8, { roughness: .12, metalness: .95 });
export const GUMI = () => M(0x1b1c1e, { roughness: .85, metalness: 0 });
export const UVEG = () => M(0x16303c, { roughness: .03, metalness: .5, transparent: true, opacity: .55, envMapIntensity: 1.8, side: THREE.DoubleSide, depthWrite: false });
export const LAMPA = (c, e = 0) => M(c, { emissive: c, emissiveIntensity: e, roughness: .1 });

/* héj keresztmetszet-kulcsokból: [z, félszélesség, felső félmagasság, alsó félmagasság, középvonal y, alakkitevő] (2 = ellipszis, nagyobb = szögletesebb) */
export function loft(keys, { seg = 28, sub = 5, paint = null } = {}) {
  const K = keys.map(k => ({ z: k[0], w: k[1], ht: k[2], hb: k[3] ?? k[2], y: k[4] ?? 0, p: k[5] ?? 2 })), S = [];
  for (let i = 0; i < K.length - 1; i++) { const a = K[Math.max(0, i - 1)], b = K[i], c = K[i + 1], d = K[Math.min(K.length - 1, i + 2)];
    for (let s = 0; s < sub; s++) { const t = s / sub, cr = k => .5 * (2 * b[k] + (c[k] - a[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t * t + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * t * t * t);
      S.push({ z: b.z + (c.z - b.z) * t, w: Math.max(0, cr('w')), ht: Math.max(0, cr('ht')), hb: Math.max(0, cr('hb')), y: cr('y'), p: b.p + (c.p - b.p) * t }); } }
  S.push(K[K.length - 1]);
  const P = [], C = [], I = [], ring = (s, out) => { for (let j = 0; j < seg; j++) { const th = j / seg * Math.PI * 2, c = Math.cos(th), sn = Math.sin(th), e = 2 / s.p;
      out.push(s.w * Math.sign(c) * Math.abs(c) ** e, s.y + (sn >= 0 ? s.ht : s.hb) * Math.sign(sn) * Math.abs(sn) ** e, s.z); } };
  for (const s of S) ring(s, P); const n = S.length;
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) { const a = i * seg + j, b = i * seg + (j + 1) % seg, c = a + seg, d = b + seg; I.push(a, b, c, b, d, c); }
  for (const [si, front] of [[0, true], [n - 1, false]]) { const s = S[si]; if (s.w < .005 || s.ht + s.hb < .005) continue; const base = P.length / 3; P.push(0, s.y, s.z); ring(s, P);
    for (let j = 0; j < seg; j++) { const a = base + 1 + j, b = base + 1 + (j + 1) % seg; front ? I.push(base, b, a) : I.push(base, a, b); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
  if (paint) { const col = new THREE.Color(); for (let i = 0; i < P.length; i += 3) { col.setHex(paint(P[i], P[i + 1], P[i + 2], (i / 3 % seg) / seg)); C.push(col.r, col.g, col.b); } g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); }
  return g; }
export function hull(par, keys, mat, opt = {}, x = 0, y = 0, z = 0) { const isF = typeof mat === 'function', g = loft(keys, { ...opt, paint: isF ? mat : null });
  const m = new THREE.Mesh(g, isF ? M(0xffffff, { vertexColors: true, roughness: .3, metalness: .12 }) : mat); m.position.set(x, y, z); m.castShadow = true; par.add(m); return m; }
// forgástest a Y tengely körül: [y, sugár] párok (ballon, lámpa, tartály)
export function lathe(par, prof, mat, seg = 24, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([py, r]) => new THREE.Vector2(r, py)), seg), mat); m.position.set(x, y, z); m.castShadow = true; par.add(m); return m; }
export function add(par, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; par.add(m); return m; }
export function tube(par, a, b, r, mat, seg = 8) { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), seg), mat);
  m.position.copy(A).add(B).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.castShadow = true; par.add(m); return m; }
// lekerekített élű doboz
const RB = new Map();
export function rbox(w, h, d, r = Math.min(w, h, d) * .18) { const k = [w, h, d, r].join(); if (RB.has(k)) return RB.get(k); const g = new THREE.BoxGeometry(w, h, d, 6, 6, 6), p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3(), hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); c.set(Math.max(-hw, Math.min(hw, v.x)), Math.max(-hh, Math.min(hh, v.y)), Math.max(-hd, Math.min(hd, v.z))); const o = v.clone().sub(c); if (o.lengthSq() > 1e-12) v.copy(c).addScaledVector(o.normalize(), r); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); RB.set(k, g); return g; }
// kerék: gumi, felni, agy – a csoport a kerék közepén, tengely X irányban
export function kerek(par, r, w, felni = KROM(), kullok = 0) { const g = new THREE.Group(); par.add(g);
  add(g, new THREE.TorusGeometry(r * .74, r * .26, 10, 28).rotateY(Math.PI / 2).scale(w / (r * .52), 1, 1), GUMI());
  add(g, new THREE.CylinderGeometry(r * .5, r * .5, w * .7, 24).rotateZ(Math.PI / 2), felni);
  if (kullok) for (let i = 0; i < kullok; i++) { const a = i / kullok * Math.PI * 2; tube(g, [0, 0, 0], [0, Math.cos(a) * r * .5, Math.sin(a) * r * .5], .006, KROM(), 4); }
  return g; }
// HGWS logó matrica
let LOGO = null;
export function logo(par, x, y, z, ry, w = 1) { if (!LOGO) { const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x2 = c.getContext('2d');
    x2.fillStyle = '#f2c230'; x2.fillRect(0, 0, 256, 96); x2.fillStyle = '#2f9e4f'; x2.fillRect(0, 70, 256, 26); x2.fillStyle = '#2aa7d9'; x2.beginPath(); x2.arc(40, 40, 26, 0, 6.3); x2.fill();
    x2.fillStyle = '#fff'; x2.beginPath(); x2.moveTo(40, 18); x2.quadraticCurveTo(58, 44, 40, 58); x2.quadraticCurveTo(22, 44, 40, 18); x2.fill();
    x2.fillStyle = '#15181c'; x2.font = '900 46px Inter, Arial, sans-serif'; x2.textBaseline = 'middle'; x2.fillText('HGWS', 78, 40);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; LOGO = new THREE.MeshStandardMaterial({ map: t, roughness: .35, polygonOffset: true, polygonOffsetFactor: -2 }); }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * .375), LOGO); m.position.set(x, y, z); m.rotation.y = ry; par.add(m); return m; }
// felirat-tábla (cégtábla, kijelző)
export function tabla(par, text, w, h, bg = '#15181c', fg = '#f2c230', x = 0, y = 0, z = 0, ry = 0, emis = 0) { const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w); const x2 = c.getContext('2d');
  x2.fillStyle = bg; x2.fillRect(0, 0, c.width, c.height); x2.fillStyle = fg; x2.font = `900 ${Math.round(c.height * .62)}px Inter, Arial, sans-serif`; x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.fillText(text, 256, c.height * .54);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: .5, emissive: emis ? 0xffffff : 0, emissiveMap: emis ? t : null, emissiveIntensity: emis }));
  m.position.set(x, y, z); m.rotation.y = ry; par.add(m); return m; }
// 20 literes vizesballon (kék, áttetsző, nyakkal)
const BALLON_PROF = [[0, 0], [0, .135], [.03, .145], [.1, .145], [.12, .132], [.15, .145], [.3, .145], [.32, .132], [.35, .145], [.42, .14], [.47, .09], [.5, .045], [.53, .042], [.55, .045], [.56, 0]];
export function ballon(par) { const g = new THREE.Group(); par.add(g); lathe(g, BALLON_PROF, M(0x5fb7e6, { roughness: .08, metalness: 0, transparent: true, opacity: .72, envMapIntensity: 1.6 }), 20);
  lathe(g, [[.53, 0], [.53, .05], [.585, .05], [.585, 0]], M(SZINK), 12); return g; }
const SZINK = 0x2a6fb0;
