/* A gépek kódból épített low-poly modelljei (HGWS sárga–zöld–vízkék). Orr: −Z, fel: +Y, jobb: +X, méterben.
   Minden modell { g, prop[], rotor[], gear, flap[], burner, ramp, eye, spray[], hook, len } – a fizika és a kamera ezeket használja. */
import * as THREE from 'three';
import { SZIN } from './config.js?v=202611250019';

const MC = new Map();
// fényes festék (PBR), a környezeti térkép az égboltból jön (scene.environment)
const M = (c, o = {}) => { const k = c + JSON.stringify(o); if (!MC.has(k)) { const met = c === SZIN.fem ? .75 : c === SZIN.fekete || c === SZIN.sotet ? .3 : .12, rough = c === SZIN.fem ? .32 : c === SZIN.fekete ? .55 : .3;
  MC.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: met, envMapIntensity: 1.1, ...o })); } return MC.get(k); };
const UVEG = () => { if (!MC.has('uveg')) MC.set('uveg', new THREE.MeshStandardMaterial({ color: 0x0e2430, roughness: .04, metalness: .6, envMapIntensity: 1.8, transparent: true, opacity: .88 })); return MC.get('uveg'); };
let LOGO = null;
function logoMat() { if (LOGO) return LOGO; const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d');
  x.fillStyle = '#f2c230'; x.fillRect(0, 0, 256, 96); x.fillStyle = '#2f9e4f'; x.fillRect(0, 70, 256, 26); x.fillStyle = '#2aa7d9'; x.beginPath(); x.arc(40, 40, 26, 0, 6.3); x.fill();
  x.fillStyle = '#fff'; x.beginPath(); x.moveTo(40, 18); x.quadraticCurveTo(58, 44, 40, 58); x.quadraticCurveTo(22, 44, 40, 18); x.fill();
  x.fillStyle = '#15181c'; x.font = '900 46px Inter, Arial, sans-serif'; x.textBaseline = 'middle'; x.fillText('HGWS', 78, 40);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; LOGO = new THREE.MeshStandardMaterial({ map: t, roughness: .3, metalness: .05, polygonOffset: true, polygonOffsetFactor: -2 }); return LOGO; }

// vékony lemez-dobozokból profilos felület: függőleges vezérsík (keskeny, magas) és vízszintes lap (lapos, széles) – a festett anyagoknál
function shape(geo, mat) { const P = geo.parameters; if (!geo.isBufferGeometry || geo.type !== 'BoxGeometry' || !P || mat === UVEG() || mat.transparent) return geo;
  const { width: w, height: h, depth: d } = P;
  if (w <= .2 && h >= .45 && d >= .45 && h > w * 3) return finGeo(h, d, d * .62, d * .3, Math.max(w, .08)).translate(0, -h / 2, -d * .07);
  if (h <= .12 && w >= 1.8 && d >= .35) return wingGeo(w, d, d * .8, 0, Math.max(h, .07));
  if (Math.min(w, h, d) >= .5) return rounded(w, h, d, Math.min(w, h, d) * .2);
  return geo; }
// lekerekített élű doboz (törzsek, kabinok, tartályok)
const RB = new Map(); function rounded(w, h, d, r) { const k = [w, h, d, r].join(); if (RB.has(k)) return RB.get(k); const g = new THREE.BoxGeometry(w, h, d, 4, 4, 4), p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3(), hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const sx = Math.sign(v.x), sy = Math.sign(v.y), sz = Math.sign(v.z);
    // a csúcsokat a belső doboz széle felé sűrítjük, majd a sarkokat gömbre vetítjük
    v.set(sx * (Math.abs(v.x) <= w / 4 + 1e-6 ? Math.abs(v.x) / (w / 4) * hw * .5 : hw * .5 + (Math.abs(v.x) - w / 4) / (w / 4) * (hw * .5 + r)), sy * (Math.abs(v.y) <= h / 4 + 1e-6 ? Math.abs(v.y) / (h / 4) * hh * .5 : hh * .5 + (Math.abs(v.y) - h / 4) / (h / 4) * (hh * .5 + r)), sz * (Math.abs(v.z) <= d / 4 + 1e-6 ? Math.abs(v.z) / (d / 4) * hd * .5 : hd * .5 + (Math.abs(v.z) - d / 4) / (d / 4) * (hd * .5 + r)));
    c.set(Math.max(-hw, Math.min(hw, v.x)), Math.max(-hh, Math.min(hh, v.y)), Math.max(-hd, Math.min(hd, v.z))); const o = v.clone().sub(c); if (o.lengthSq() > 1e-12) v.copy(c).addScaledVector(o.normalize(), r); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); RB.set(k, g); return g; }
function add(par, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { const m = new THREE.Mesh(shape(geo, mat), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; par.add(m); return m; }
// henger a Z tengely mentén: rf az orr felőli (−Z), rb a hátsó sugár
const cylZ = (rf, rb, len, seg = 18) => new THREE.CylinderGeometry(rf, rb, len, seg).rotateX(-Math.PI / 2);
const box = (w, h, l) => new THREE.BoxGeometry(w, h, l);
// szárnyprofil (NACA 00xx enyhe íveléssel): u 0 = belépőél (elöl, −z) … 1 = kilépőél
const AF = (() => { const n = 13, up = [], lo = []; for (let i = 0; i <= n; i++) { const u = (1 - Math.cos(i / n * Math.PI)) / 2, t = (.2969 * Math.sqrt(u) - .126 * u - .3516 * u * u + .2843 * u ** 3 - .1036 * u ** 4) / .1003, c = .18 * Math.sin(Math.PI * u) * (1 - u * .3);
  up.push([u, c + t]); lo.push([u, c - t]); } return up.reverse().concat(lo.slice(1, -1)); })();   // zárt kontúr: kilépőél → felső → belépőél → alsó
// felület állomásokból: st = [[pos, chord, zOff, yOff, thick], …]; vert = függőleges (vezérsík)
function surfGeo(st, vert) { const P = [], I = [], n = AF.length;
  for (const [a, c, zo, yo, th] of st) for (const [u, v] of AF) { const z = -c / 2 + u * c + zo, w = (vert ? v - .18 * Math.sin(Math.PI * u) * (1 - u * .3) : v) * th / 2;   // a vezérsík szimmetrikus
    if (vert) P.push(w, a + yo, z); else P.push(a, w + yo, z); }
  for (let s = 0; s < st.length - 1; s++) for (let i = 0; i < n; i++) { const a = s * n + i, b = s * n + (i + 1) % n, c = a + n, d = b + n; if (vert) I.push(a, b, c, b, d, c); else I.push(a, c, b, b, c, d); }
  const cap = (s, flip) => { const base = s * n; for (let i = 1; i < n - 1; i++) flip ? I.push(base, base + i + 1, base + i) : I.push(base, base + i, base + i + 1); };
  cap(0, !vert); cap(st.length - 1, !!vert);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals(); return g; }
// szárny: fesztáv, tőhúr, véghúr, nyilazás (m a végen), vastagság, V-állás (m a végen)
function wingGeo(span, cr, ct, sweep = 0, th = .25, dih = 0) { const st = [], N = 6;
  for (let i = -N; i <= N; i++) { const k = Math.abs(i) / N, c = cr * (1 - k) + ct * k; st.push([i / N * span / 2, c, sweep * k, dih * k, th * (1 - k * .45)]); }
  const g = surfGeo(st, false); return g; }
// függőleges vezérsík: magasság, tőhúr, véghúr, nyilazás, vastagság – az alja y = 0-n
function finGeo(h, cr, ct, sweep = 0, th = .2) { const st = []; for (let i = 0; i <= 4; i++) { const k = i / 4; st.push([k * h, cr * (1 - k) + ct * k, sweep * k, 0, th * (1 - k * .4)]); } return surfGeo(st, true); }
function decal(par, x, y, z, ry, w = 2.4) { w *= 1.25; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * .375), logoMat()); m.position.set(x, y, z); m.rotation.y = ry; par.add(m); return m; }
function prop(par, x, y, z, r = 1.1, n = 3, col = SZIN.fekete) { const g = new THREE.Group(); g.position.set(x, y, z); par.add(g);
  add(g, new THREE.ConeGeometry(.26, .55, 20).rotateX(-Math.PI / 2), M(SZIN.piros), 0, 0, -.3); add(g, cylZ(.26, .26, .2, 20), M(SZIN.piros), 0, 0, 0);
  const bg = bladeGeo(r); for (let i = 0; i < n; i++) add(g, bg, M(col), 0, 0, 0, 0, 0, i / n * Math.PI * 2);
  const disc = add(g, new THREE.CircleGeometry(r, 20), M(0xcccccc, { transparent: true, opacity: .18, depthWrite: false, side: THREE.DoubleSide }), 0, 0, .05); disc.userData.disc = 1; disc.visible = false; disc.castShadow = false;
  return g; }
function rotor(par, x, y, z, r, n = 4, col = SZIN.sotet) { const g = new THREE.Group(); g.position.set(x, y, z); par.add(g); const hr = Math.min(.25, r * .07), ch = Math.min(.45, r * .09); add(g, cylZ(hr, hr, hr * 1.6, 16).rotateX(Math.PI / 2), M(SZIN.fem));
  const bg = r >= 1.8 ? wingGeo(r, ch, ch * .9, 0, .07).translate(r / 2, 0, 0) : new THREE.BoxGeometry(r, .03, ch).translate(r / 2, 0, 0); for (let i = 0; i < n; i++) add(g, bg, M(col), 0, 0, 0, 0, i / n * Math.PI * 2);
  const disc = add(g, new THREE.CircleGeometry(r, 28).rotateX(-Math.PI / 2), M(0xbbbbbb, { transparent: true, opacity: .16, depthWrite: false, side: THREE.DoubleSide }), 0, .02, 0); disc.userData.disc = 1; disc.visible = false; disc.castShadow = false;
  return g; }
// légcsavarlapát: csúcs felé keskenyedő, csavart, lekerekített végű
const BLADE = new Map(); function bladeGeo(r) { if (BLADE.has(r)) return BLADE.get(r); const g = new THREE.BoxGeometry(.24, r, .05, 1, 8, 1).translate(0, r / 2, 0), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = p.getY(i) / r, w = (k < .15 ? .55 + k * 3 : 1 - (k - .15) * .55) * (k > .9 ? Math.sqrt(Math.max(.05, (1 - k) / .1)) : 1), x = p.getX(i) * w, z = p.getZ(i) * (1.6 - k), a = .7 * (1 - k) + .15;
    p.setX(i, x * Math.cos(a) - z * Math.sin(a)); p.setZ(i, x * Math.sin(a) + z * Math.cos(a)); } g.computeVertexNormals(); BLADE.set(r, g); return g; }
// kerék: gumi, felni, agy
function wheel(par, x, y, z, r = .35) { const w = new THREE.Group(); w.position.set(x, y, z); par.add(w);
  add(w, new THREE.TorusGeometry(r * .68, r * .32, 8, 22).rotateY(Math.PI / 2), M(SZIN.fekete)); add(w, new THREE.CylinderGeometry(r * .52, r * .52, r * .42, 18).rotateZ(Math.PI / 2), M(SZIN.fem)); add(w, new THREE.CylinderGeometry(r * .16, r * .16, r * .6, 10).rotateZ(Math.PI / 2), M(SZIN.sotet)); return w; }
function tailGear(par, gz, gh, mz, span = 1.4) { const g = new THREE.Group(); par.add(g);
  add(g, box(.12, gh, .12), M(SZIN.fem), -span, -gh / 2, mz); add(g, box(.12, gh, .12), M(SZIN.fem), span, -gh / 2, mz); wheel(g, -span, -gh, mz, .38); wheel(g, span, -gh, mz, .38);
  wheel(g, 0, -.5, gz, .16); return g; }
function triGear(par, nz, mz, gh, span, r = .45) { const g = new THREE.Group(); par.add(g);
  add(g, box(.15, gh, .15), M(SZIN.fem), 0, -gh / 2, nz); wheel(g, 0, -gh, nz, r * .8);
  for (const s of [-1, 1]) { add(g, box(.18, gh, .18), M(SZIN.fem), s * span, -gh / 2, mz); wheel(g, s * span, -gh, mz, r); } return g; }

/* ---- törzsek, gondolák, kabinüvegek: keresztmetszet-állomásokból simított héj ----
   kulcs: [z, félszélesség, felső félmagasság, alsó félmagasság, középvonal y, alakkitevő (2 = ellipszis, nagyobb = szögletesebb)] */
const PAINTM = () => M(0xffffff, { vertexColors: true });
const PC = new THREE.Color();
function loft(keys, { seg = 28, sub = 5, paint = null } = {}) {
  const K = keys.map(k => ({ z: k[0], w: k[1], ht: k[2], hb: k[3] ?? k[2], y: k[4] ?? 0, p: k[5] ?? 2 })), S = [];
  for (let i = 0; i < K.length - 1; i++) { const a = K[Math.max(0, i - 1)], b = K[i], c = K[i + 1], d = K[Math.min(K.length - 1, i + 2)];
    for (let s = 0; s < sub; s++) { const t = s / sub, cr = k => .5 * (2 * b[k] + (c[k] - a[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t * t + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * t * t * t);
      S.push({ z: b.z + (c.z - b.z) * t, w: Math.max(0, cr('w')), ht: Math.max(0, cr('ht')), hb: Math.max(0, cr('hb')), y: cr('y'), p: b.p + (c.p - b.p) * t }); } }
  S.push(K[K.length - 1]);
  const P = [], C = [], I = [], ring = (s, out) => { for (let j = 0; j < seg; j++) { const th = j / seg * Math.PI * 2, c = Math.cos(th), sn = Math.sin(th), e = 2 / s.p;
      const x = s.w * Math.sign(c) * Math.abs(c) ** e, y = s.y + (sn >= 0 ? s.ht : s.hb) * Math.sign(sn) * Math.abs(sn) ** e; out.push(x, y, s.z); } };
  for (const s of S) ring(s, P); const n = S.length;
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) { const a = i * seg + j, b = i * seg + (j + 1) % seg, c = a + seg, d = b + seg; I.push(a, b, c, b, d, c); }
  for (const [si, front] of [[0, true], [n - 1, false]]) { const s = S[si]; if (s.w < .01 || s.ht + s.hb < .01) continue; const base = P.length / 3; P.push(0, s.y, s.z); ring(s, P);
    for (let j = 0; j < seg; j++) { const a = base + 1 + j, b = base + 1 + (j + 1) % seg; front ? I.push(base, b, a) : I.push(base, a, b); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
  if (paint) { for (let i = 0; i < P.length; i += 3) { PC.setHex(paint(P[i], P[i + 1], P[i + 2], (i / 3 % seg) / seg)); C.push(PC.r, PC.g, PC.b); } g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); }
  return g; }
// héj hozzáadása: festés függvénnyel (x, y, z → szín) vagy egyszínű anyaggal
function hull(par, keys, paint, opt = {}, x = 0, y = 0, z = 0) { const isF = typeof paint === 'function', g = loft(keys, { ...opt, paint: isF ? paint : null });
  const m = new THREE.Mesh(g, isF ? PAINTM() : paint); m.position.set(x, y, z); m.castShadow = true; par.add(m); return m; }
// hajtómű-gondola / forgástest: hossz mentén sugár-arányok
function pod(par, x, y, z, len, r, mat, prof = [[0, .55], [.12, .95], [.3, 1], [.75, .92], [1, .5]], opt = {}) {
  return hull(par, prof.map(([t, k]) => [z - len / 2 + t * len, r * k, r * k, r * k, 0]), mat, { seg: 22, sub: 3, ...opt }, x, y, 0); }
// cső két pont között (merevítő, csúszótalp, futószár)
function tube(par, a, b, r, mat) { const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), mat);
  m.position.copy(A).add(Bv).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.castShadow = true; par.add(m); return m; }
// festési minták
const band = (y, y0, y1) => y >= y0 && y < y1;
const LIV = {   // HGWS: sárga test, zöld has-csík, kék vékony csík
  hgws: (top = SZIN.sarga, belly = SZIN.zold, line = SZIN.kek, yb = 0, yl = .35) => (x, y, z) => y < yb ? belly : band(y, yb + yl * .1, yb + yl) ? line : top };

const B = {
  /* Air Tractor AT-502 jellegű mezőgazdasági gép: hosszú turbólégcsavaros orr, tartály a magas kabin előtt, egyenes alsószárny, rugós főfutó, farokkerék */
  permetezo() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [0, 1.45, -.4], len: 10.2, gearH: 1.6 };
    const pt = (x, y, z) => z < -3.9 ? SZIN.zold : y < -.05 ? SZIN.zold : band(y, .05, .2) && z < 3 ? SZIN.kek : SZIN.sarga;
    hull(g, [[-5.25, .3, .3, .3, .3], [-5.0, .42, .44, .42, .3, 2.2], [-3.8, .47, .5, .48, .32, 2.4], [-2.4, .6, .78, .6, .36, 2.6], [-.9, .62, .95, .62, .42, 2.6], [.5, .56, .88, .58, .45, 2.6], [2.4, .36, .55, .42, .56, 2.4], [4.6, .14, .32, .2, .72], [5.3, .05, .12, .06, .8]], pt);
    hull(g, [[-1.55, .02, .02, .02, 1.25], [-1.2, .5, .55, .1, 1.3, 2.4], [-.2, .55, .62, .1, 1.32, 2.6], [.7, .45, .42, .1, 1.3, 2.4], [1.2, .05, .05, .02, 1.25]], UVEG());
    add(g, wingGeo(15.8, 2.0, 1.75, .25, .3, .55), M(SZIN.sarga), 0, -.18, -1.1);
    for (const s of [-1, 1]) { const f = add(g, box(4.6, .09, .5), M(SZIN.zold), s * 3.7, -.2, .15); o.flap.push(f); add(g, finGeo(.35, 1.9, 1.6, .1, .04).rotateZ(-s * Math.PI / 2), M(SZIN.zold), s * 7.9, -.08, -1.1); }
    add(g, wingGeo(5.4, 1.25, .85, .25, .16, .05), M(SZIN.sarga), 0, .7, 4.55); add(g, finGeo(1.9, 1.6, .85, .75, .16), M(SZIN.zold), 0, .78, 4.35);
    for (const s of [-1, 1]) tube(g, [s * .3, .4, 4.0], [s * 1.5, .7, 4.5], .03, M(SZIN.fem));
    for (const s of [-1, 1]) add(g, cylZ(.06, .07, .5, 8), M(SZIN.sotet), s * .45, .55, -3.3, .3 * s, 0, 0);
    tube(g, [0, -.1, -2.0], [0, -.55, -2.2], .05, M(SZIN.fem));
    add(g, box(14, .07, .07), M(SZIN.kek), 0, -.38, .2); for (let i = -6; i <= 6; i += 1.5) { add(g, box(.05, .18, .05), M(SZIN.fem), i, -.47, .2); o.spray.push([i, -.55, .2]); }
    o.prop.push(prop(g, 0, .3, -5.45, 1.4, 3)); o.gear = new THREE.Group(); g.add(o.gear);
    for (const s of [-1, 1]) { tube(o.gear, [s * .35, -.25, -2.1], [s * 1.45, -1.25, -2.2], .07, M(SZIN.fem)); wheel(o.gear, s * 1.5, -1.25, -2.2, .4); }
    tube(o.gear, [0, .55, 4.8], [0, .0, 5.05], .04, M(SZIN.fem)); wheel(o.gear, 0, -.05, 5.05, .15);
    decal(g, .62, .45, 1.1, Math.PI / 2, 2.0); decal(g, -.62, .45, 1.1, -Math.PI / 2, 2.0); o.g = g; return o; },
  /* Antonov An–2: kétfedelű, nagy csillagmotor, szögletes törzs, magas kabin, I-merevítők */
  ancsa() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [-.35, 1.85, -3.2], len: 12.4, gearH: 2.05 };
    const pt = (x, y, z) => z < -4.6 ? SZIN.sotet : z < -3.6 ? SZIN.zold : band(y, .1, .32) ? SZIN.kek : y < .1 ? SZIN.zold : SZIN.sarga;
    hull(g, [[-6.25, .62, .62, .62, .45], [-6.1, .95, .95, .95, .5], [-5.0, 1.0, 1.0, 1.0, .5], [-4.2, .9, 1.25, .95, .62, 2.8], [-2.6, .84, 1.35, 1.0, .65, 3.2], [0, .84, 1.08, 1.0, .58, 3.4], [3, .64, .82, .72, .7, 3], [5.6, .32, .55, .32, 1.0, 2.6], [7.1, .1, .22, .1, 1.2]], pt);
    hull(g, [[-4.25, .05, .05, .05, 1.65], [-4.0, .78, .5, .1, 1.7, 3], [-3.0, .82, .58, .1, 1.72, 3.2], [-2.5, .6, .2, .05, 1.75]], UVEG());
    for (let i = 0; i < 5; i++) for (const s of [-1, 1]) add(g, box(.03, .4, .38), UVEG(), s * .85, 1.05, -1.4 + i * .85);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; add(g, cylZ(.17, .17, .6, 8), M(SZIN.fem), Math.cos(a) * .7, .5 + Math.sin(a) * .7, -5.85); }
    add(g, wingGeo(18.2, 2.45, 2.3, 0, .32, .1), M(SZIN.sarga), 0, 2.3, -2.2); add(g, wingGeo(14.2, 2.0, 1.85, 0, .28, .4), M(SZIN.sarga), 0, -.5, -2.0);
    for (const s of [-1, 1]) { add(g, box(.1, 2.75, .45), M(SZIN.fem), s * 4.6, .95, -2.1); for (const [a, b] of [[[s * .8, 2.2, -2.6], [s * 4.5, -.4, -2.6]], [[s * .8, -.4, -1.4], [s * 4.5, 2.2, -1.4]]]) tube(g, a, b, .025, M(SZIN.fem));
      const f = add(g, box(4.6, .09, .6), M(SZIN.zold), s * 3.5, -.6, -.7); o.flap.push(f); add(g, box(8, .06, .35), M(SZIN.zold), s * 4.7, 2.3, -1.0); }
    add(g, wingGeo(7.2, 1.9, 1.4, .25, .2, .05), M(SZIN.sarga), 0, 1.0, 6.4); add(g, finGeo(3.0, 2.6, 1.5, 1.4, .22), M(SZIN.zold), 0, 1.05, 6.2);
    for (const s of [-1, 1]) tube(g, [s * .15, 1.0, 6.4], [s * 1.8, 1.05, 6.6], .03, M(SZIN.fem));
    add(g, box(13, .08, .08), M(SZIN.kek), 0, -.75, -1.2); for (let i = -6; i <= 6; i += 1.5) o.spray.push([i, -.82, -1.2]);
    o.prop.push(prop(g, 0, .5, -6.45, 1.8, 4)); o.gear = new THREE.Group(); g.add(o.gear);
    for (const s of [-1, 1]) { tube(o.gear, [s * .6, -.5, -3.3], [s * 1.7, -1.6, -3.4], .1, M(SZIN.fem)); tube(o.gear, [s * 1.4, -.5, -2.6], [s * 1.7, -1.6, -3.4], .07, M(SZIN.fem)); wheel(o.gear, s * 1.75, -1.6, -3.4, .45); }
    tube(o.gear, [0, .7, 6.6], [0, .2, 6.9], .05, M(SZIN.fem)); wheel(o.gear, 0, .1, 6.9, .2);
    decal(g, .86, .55, 1.0, Math.PI / 2, 2.5); decal(g, -.86, .55, 1.0, -Math.PI / 2, 2.5); o.g = g; return o; },
  /* JAS 39 Gripen jellegű vadász: deltaszárny + kacsaszárny, oldalsó légbeömlők, buborékkabin, egy hajtómű */
  vadasz() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [0, .95, -3.5], len: 14.1, gearH: 1.7 };
    const GR = 0x8c959c, pt = (x, y, z) => z < -6.1 ? SZIN.sotet : band(y, -.05, .08) ? SZIN.sarga : y < -.05 ? 0xa3abb1 : z > 3.5 && y > .45 ? SZIN.zold : GR;
    hull(g, [[-7.1, .0, .0, .0, .08], [-6.4, .28, .3, .28, .1], [-5.0, .5, .55, .45, .14], [-3.4, .6, .78, .5, .2], [-1.6, .82, .74, .58, .15, 2.6], [1.0, .98, .72, .62, .12, 2.8], [4.0, .86, .68, .6, .12, 2.6], [6.0, .6, .58, .56, .12], [6.9, .52, .52, .52, .12]], pt);
    hull(g, [[-4.8, .02, .02, .02, .62], [-4.2, .4, .42, .05, .66], [-3.2, .43, .55, .05, .7], [-2.2, .3, .35, .05, .74], [-1.6, .02, .02, .02, .72]], UVEG());
    for (const s of [-1, 1]) { hull(g, [[-2.3, .3, .38, .42, 0, 2.4], [-1.6, .34, .42, .46, 0, 2.6], [.8, .3, .36, .4, 0, 2.6], [2.0, .12, .18, .2, .1]], M(GR), {}, s * .92, -.05, 0); add(g, box(.45, .55, .06), M(SZIN.fekete), s * .95, -.06, -2.32); }
    add(g, wingGeo(8.4, 6.0, 1.0, 2.4, .26, -.12), M(GR), 0, -.12, 1.6);
    for (const s of [-1, 1]) { const f = add(g, box(2.6, .07, .55), M(SZIN.zold), s * 2.4, -.15, 4.35); o.flap.push(f); tube(g, [s * 4.2, -.2, 3.0], [s * 4.2, -.2, 4.7], .05, M(SZIN.fem)); }
    add(g, wingGeo(3.7, 1.6, .65, .75, .1, .18), M(GR), 0, .42, -1.75);
    add(g, finGeo(2.65, 3.6, 1.0, 2.1, .16), M(SZIN.zold), 0, .62, 3.95); add(g, box(.18, .55, .9), M(SZIN.sarga), 0, 2.55, 5.3);
    hull(g, [[6.6, .5, .5, .5, .12], [7.4, .44, .44, .44, .12]], M(SZIN.sotet), { seg: 20 });
    const bu = add(g, new THREE.ConeGeometry(.42, 3.4, 16, 1, true).rotateX(Math.PI / 2), M(0xffa040, { emissive: 0xff6a10, transparent: true, opacity: .85, depthWrite: false }), 0, .12, 9.1); bu.visible = false; bu.castShadow = false; o.burner = bu;
    add(g, cylZ(.04, .04, 1.2, 6), M(SZIN.fem), 0, .1, -7.6);
    add(g, box(7.6, .07, .07), M(SZIN.kek), 0, -.42, 2.4); for (let i = -3.6; i <= 3.6; i += 1.2) o.spray.push([i, -.5, 2.4]);
    o.gear = triGear(g, -4.5, 1.9, 1.3, 1.25, .38); decal(g, .9, .3, 2.6, Math.PI / 2, 1.8); decal(g, -.9, .3, 2.6, -Math.PI / 2, 1.8); o.g = g; return o; },
  /* Concorde: karcsú törzs, lehajtható orr, ogivális deltaszárny, ikergondolák, magas függőleges vezérsík */
  concorde() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [0, 1.75, -24.2], len: 61.7, gearH: 5.4 };
    const pt = (x, y, z) => band(y, .55, .8) ? SZIN.sotet : band(y, -.2, .1) ? SZIN.zold : band(y, .1, .28) ? SZIN.sarga : SZIN.feher;
    hull(g, [[-24, 1.25, 1.25, 1.25, .1], [-22, 1.38, 1.4, 1.38, .15], [-12, 1.45, 1.5, 1.45, .2], [10, 1.45, 1.5, 1.45, .2], [20, 1.2, 1.3, 1.1, .4], [27, .6, .8, .5, .8], [30.5, .15, .25, .1, 1.1]], pt, { sub: 4 });
    const nose = new THREE.Group(); nose.position.set(0, .1, -24); g.add(nose); o.nose = nose;
    hull(nose, [[0, 1.25, 1.25, 1.25, 0], [-3, 1.05, 1.0, 1.05, -.1], [-5.5, .62, .55, .6, -.2], [-7.2, .08, .08, .08, -.3]], M(SZIN.feher)); hull(nose, [[.2, .02, .02, .02, .95], [.6, .65, .35, .05, 1.0], [1.4, .7, .28, .05, 1.05], [1.8, .05, .05, .02, 1.05]], UVEG(), {}, 0, 0, 0);
    { const st = [], N = 12; for (let i = -N; i <= N; i++) { const s = Math.abs(i) / N, le = -20 + 26 * s ** .45 + 14 * s ** 4, te = 24 - 2 * s; st.push([i / N * 12.8, te - le, (le + te) / 2, -s * .25, Math.max(.25, 1.1 * (1 - .65 * s))]); }
      add(g, surfGeo(st, false), M(SZIN.feher), 0, -.9, 0); }
    for (const s of [-1, 1]) { hull(g, [[11, .9, .5, .6, 0, 4], [12.5, 1.35, .7, .75, 0, 5], [22, 1.35, .7, .75, 0, 5], [24.5, 1.25, .6, .6, 0, 4]], M(0xd9dbde), {}, s * 4.5, -2.25, 0); add(g, box(2.4, .9, .1), M(SZIN.fekete), s * 4.5, -2.25, 11.05);
      const f = add(g, box(8.5, .12, 1.5), M(SZIN.zold), s * 7.5, -1.05, 22.3); o.flap.push(f); }
    add(g, finGeo(10.6, 11.5, 2.8, 7.5, .5), M(SZIN.zold), 0, 1.0, 22.5);
    for (let i = -1; i <= 1; i += .4) o.spray.push([i * 12, -2.1, 18]);
    o.gear = triGear(g, -17, 5, 4.1, 3.9, .7); decal(g, 1.47, .5, -10, Math.PI / 2, 6); decal(g, -1.47, .5, -10, -Math.PI / 2, 6); o.g = g; return o; },
  /* Boeing 747–400: púpos felső fedélzet, nyilazott szárny szárnyvég-lapokkal, négy gondola pilonokon */
  jumbo() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [0, 5.0, -31.5], len: 70.7, gearH: 5.2 };
    const pt = (x, y, z) => y < -1.2 ? SZIN.zold : band(y, -1.2, -.6) ? SZIN.sarga : band(y, .9, 1.25) && Math.abs(x) > 2.4 ? SZIN.sotet : band(y, .45, .65) ? SZIN.kek : SZIN.feher;
    hull(g, [[-35.4, .2, .3, .3, -.5], [-34.6, 1.7, 1.8, 1.7, -.3], [-32.3, 2.9, 3.4, 2.9, .1], [-28.5, 3.25, 4.6, 3.2, 0, 2.1], [-18, 3.25, 4.85, 3.25, 0, 2.1], [-11, 3.25, 4.2, 3.25, 0], [-7, 3.25, 3.3, 3.25, 0], [18, 3.25, 3.25, 3.25, 0], [26, 2.4, 2.6, 1.9, .8], [32, 1.1, 1.3, .7, 1.8], [35.2, .3, .4, .3, 2.1]], pt, { seg: 32, sub: 4 });
    hull(g, [[-33.6, .05, .05, .05, 2.2], [-33.0, 1.3, .55, .05, 2.4, 2.6], [-31.9, 1.6, .7, .05, 2.65, 2.8], [-31.0, .3, .2, .05, 2.75]], UVEG());
    add(g, wingGeo(64.4, 14, 3.9, 19.7, 1.3, 2.6), M(0xdfe2e5), 0, -2.05, 2.5);
    for (const s of [-1, 1]) { add(g, finGeo(1.9, 2.3, 1.1, 1.1, .12), M(SZIN.zold), s * 32.1, .5, 22.1, 0, 0, -s * .3);
      for (const k of [11.8, 21]) { const zl = -4.5 + k / 32.2 * 24.7, yw = -2.05 + 2.6 * k / 32.2; pod(g, s * k, yw - 1.75, zl - 1.6, 6.8, 1.38, M(SZIN.sarga), [[0, .82], [.08, 1], [.45, .98], [.85, .75], [1, .45]]);
        add(g, cylZ(.95, .95, .2, 18), M(SZIN.fekete), s * k, yw - 1.75, zl - 4.85); add(g, box(.3, 1.4, 4.2), M(0xdfe2e5), s * k, yw - .7, zl); }
      const f = add(g, box(12, .2, 2.2), M(SZIN.zold), s * 13, -1.7, 11.5, 0, s * .45, 0); o.flap.push(f); }
    add(g, wingGeo(22, 7.5, 2.4, 6.2, .55, .9), M(0xdfe2e5), 0, 1.6, 30.5); add(g, finGeo(10.5, 12, 3.8, 8.5, .55), M(SZIN.zold), 0, 2.4, 27.8);
    for (let i = -1; i <= 1; i += .25) o.spray.push([i * 28, -2.6, 12]);
    o.gear = triGear(g, -27.5, 3.5, 3.4, 3.4, .75); decal(g, 3.2, 1.5, -13, Math.PI / 2, 9); decal(g, -3.2, 1.5, -13, -Math.PI / 2, 9); o.g = g; return o; },
  /* C–130 Hercules: felsőszárny, négy turbólégcsavaros gondola, felhajló far rámpával, futógondolák a törzs oldalán */
  herkules() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [-.5, 1.55, -12.9], len: 29.8, gearH: 2.6 };
    const pt = (x, y, z) => z < -14.4 ? SZIN.sotet : y < -1.2 ? SZIN.zold : band(y, -1.2, -.85) ? SZIN.kek : SZIN.sarga;
    hull(g, [[-15.1, .15, .3, .3, -.2], [-14.4, 1.05, 1.1, 1.0, -.1], [-13, 1.8, 2.0, 1.85, 0, 2.2], [-11, 2.15, 2.2, 2.1, .05, 2.3], [4.5, 2.15, 2.2, 2.1, .05, 2.3], [8, 1.9, 2.1, 1.15, .75, 2.2], [11, 1.2, 1.6, .5, 1.45], [14, .4, .6, .2, 2.0], [15, .1, .1, .05, 2.1]], pt, { seg: 30, sub: 4 });
    hull(g, [[-14.3, .05, .05, .05, .85], [-13.9, 1.4, .6, .05, 1.0, 2.6], [-12.9, 1.85, .78, .05, 1.2, 2.8], [-12.1, .3, .2, .05, 1.35]], UVEG());
    for (const s of [-1, 1]) hull(g, [[-4.5, .2, .3, .3, 0], [-3.8, .65, .7, .8, 0, 2.8], [2.8, .65, .7, .8, 0, 2.8], [3.6, .2, .3, .3, 0]], M(SZIN.sarga), {}, s * 2.05, -1.3, 0);
    add(g, wingGeo(40.4, 4.9, 2.6, .9, .7, 0), M(SZIN.sarga), 0, 2.45, -3.4);
    for (const s of [-1, 1]) for (const k of [5.1, 10.2]) { pod(g, s * k, 2.0, -4.5, 7.6, .62, M(SZIN.zold), [[0, .55], [.1, .95], [.35, 1], [.8, .8], [1, .4]]); o.prop.push(prop(g, s * k, 2.05, -8.45, 2.05, 4)); }
    for (const s of [-1, 1]) { const f = add(g, box(8, .12, 1.2), M(SZIN.zold), s * 7.6, 2.3, -.75); o.flap.push(f); }
    add(g, wingGeo(16, 4.2, 2.2, 1.2, .35, 0), M(SZIN.sarga), 0, 1.9, 13.0); add(g, finGeo(6.9, 6.8, 2.8, 3.4, .35), M(SZIN.sarga), 0, 1.9, 11.4); add(g, box(.38, 1.2, 2.2), M(SZIN.kek), 0, 7.2, 13.8);
    const ramp = new THREE.Group(); ramp.position.set(0, -1.0, 5.6); g.add(ramp); add(ramp, box(3.0, .2, 4.6), M(SZIN.sotet), 0, 0, 2.3); o.ramp = ramp;
    for (let i = -1; i <= 1; i += .5) o.spray.push([i * 1.2, -1.6, 8]);
    o.gear = triGear(g, -11.2, -.4, 1.25, 1.9, .62); decal(g, 2.15, .4, -6, Math.PI / 2, 4); decal(g, -2.15, .4, -6, -Math.PI / 2, 4); o.g = g; return o; },
  /* Canadair CL–415: hajótest, felsőszárny két gondolával, T-vezérsík, szárnyvégi úszók */
  ketelt() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [-.45, 2.0, -8.0], len: 19.8, gearH: 1.9, float: 1 };
    const pt = (x, y, z) => y < -.6 ? SZIN.piros : band(y, -.6, -.35) ? SZIN.feher : SZIN.sarga;
    hull(g, [[-9.9, .25, .55, .6, .25], [-9.2, 1.05, 1.25, 1.2, .3, 2.4], [-7.6, 1.3, 1.6, 1.4, .35, 2.6], [-2, 1.3, 1.62, 1.42, .35, 2.8], [2, 1.25, 1.5, 1.15, .45, 2.6], [6, .8, 1.1, .5, .95], [9.2, .32, .6, .2, 1.45], [10, .1, .2, .05, 1.55]], pt, { seg: 30 });
    hull(g, [[-9.6, .4, .3, .3, -1.0], [-8, 1.0, .3, .15, -.95, 3], [2, 1.0, .3, .15, -.9, 3], [3.2, .3, .2, .1, -.75]], M(SZIN.piros));
    hull(g, [[-9.75, .05, .05, .05, 1.15], [-9.2, .95, .55, .05, 1.3, 2.8], [-8.3, 1.2, .62, .05, 1.5, 3], [-7.7, .3, .2, .05, 1.6]], UVEG());
    hull(g, [[-4.5, .3, .2, .1, 1.95], [-3.8, .7, .45, .1, 1.95, 3], [-.6, .7, .45, .1, 1.95, 3], [.4, .3, .2, .1, 1.9]], M(SZIN.sarga));
    add(g, wingGeo(28.6, 3.6, 2.2, .3, .5, 0), M(SZIN.sarga), 0, 2.45, -2.4);
    for (const s of [-1, 1]) { pod(g, s * 4.4, 2.35, -3.6, 6.0, .72, M(SZIN.zold)); o.prop.push(prop(g, s * 4.4, 2.35, -6.75, 1.95, 4));
      hull(g, [[-1.4, .1, .1, .1, 0], [-.9, .3, .25, .3, 0], [.9, .3, .25, .25, 0], [1.4, .08, .08, .08, .05]], M(SZIN.sarga), {}, s * 12.8, .7, -2.6); tube(g, [s * 12.8, .9, -2.6], [s * 12.8, 2.35, -2.6], .07, M(SZIN.fem));
      const f = add(g, box(6.8, .1, .8), M(SZIN.zold), s * 6.2, 2.3, -.5); o.flap.push(f); }
    add(g, finGeo(4.6, 4.2, 2.5, 2.2, .3), M(SZIN.zold), 0, 1.6, 8.0); add(g, wingGeo(9.6, 2.3, 1.5, .5, .25, 0), M(SZIN.sarga), 0, 6.15, 9.5);
    for (let i = -1; i <= 1; i += .5) o.spray.push([i * 1.2, -1.35, -1.5]);
    o.gear = triGear(g, -6.4, .2, 1.0, 1.7, .5); decal(g, 1.3, .6, -3, Math.PI / 2, 3.4); decal(g, -1.3, .6, -3, -Math.PI / 2, 3.4); o.g = g; return o; },
  /* Cessna 172 úszótalpakon: felsőszárny merevítőkkel, kétlapátos légcsavar */
  hidro() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [-.3, 1.05, -1.1], len: 8.3, gearH: 1.9, float: 1, noGear: 1 };
    const pt = (x, y, z) => z < -2.8 ? SZIN.zold : band(y, .25, .4) ? SZIN.kek : y < .25 && z > -2.8 ? SZIN.zold : SZIN.sarga;
    hull(g, [[-4.15, .35, .38, .32, .32], [-3.9, .5, .52, .48, .35, 2.4], [-2.8, .56, .6, .52, .4, 2.6], [-1.7, .58, .75, .55, .45, 2.8], [-.2, .57, .76, .55, .45, 2.8], [1.2, .44, .56, .42, .52, 2.6], [3.4, .18, .32, .2, .62], [4.3, .07, .18, .08, .66]], pt);
    hull(g, [[-2.05, .05, .05, .05, .95], [-1.65, .56, .35, .05, 1.0, 3], [-.1, .58, .37, .05, 1.0, 3.2], [.7, .45, .25, .05, 1.0, 3], [1.1, .05, .05, .02, 1.0]], UVEG());
    add(g, wingGeo(11, 1.62, 1.15, .05, .2, .12), M(SZIN.sarga), 0, 1.33, -1.05);
    for (const s of [-1, 1]) { tube(g, [s * .55, .0, -.9], [s * 2.6, 1.28, -1.1], .035, M(SZIN.fem)); const f = add(g, box(2.6, .08, .4), M(SZIN.zold), s * 1.9, 1.24, -.1); o.flap.push(f); }
    add(g, wingGeo(3.4, 1.2, .75, .15, .12, 0), M(SZIN.sarga), 0, .62, 3.75); add(g, finGeo(1.55, 1.6, .75, 1.05, .12), M(SZIN.zold), 0, .72, 3.45);
    for (const s of [-1, 1]) { hull(g, [[-3.3, .05, .2, .1, .25], [-2.9, .24, .3, .2, .1], [-2.2, .3, .35, .3, 0, 2.4], [1.0, .3, .32, .3, 0, 2.4], [2.9, .16, .22, .08, .08]], M(SZIN.kek), {}, s * 1.2, -1.45, 0);
      for (const z of [-1.7, .3]) tube(g, [s * .5, -.25, z], [s * 1.2, -1.15, z], .04, M(SZIN.fem)); }
    add(g, box(10, .06, .06), M(SZIN.kek), 0, 1.18, -.35); for (let i = -4; i <= 4; i += 2) o.spray.push([i, 1.1, -.35]);
    o.prop.push(prop(g, 0, .32, -4.3, 1.0, 2)); decal(g, .57, .5, -.6, Math.PI / 2, 1.5); decal(g, -.57, .5, -.6, -Math.PI / 2, 1.5); o.g = g; return o; },
  /* ASK 21 jellegű vitorlázó: karcsú gondola és farokcső, hosszú keskeny szárny, T-vezérsík */
  vitorlazo() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [0, .72, -2.4], len: 8.4, gearH: .55 };
    const pt = (x, y, z) => z > 3.3 ? SZIN.zold : band(y, .18, .27) ? SZIN.kek : SZIN.feher;
    hull(g, [[-3.75, .02, .02, .02, .25], [-3.4, .26, .27, .25, .27], [-2.6, .35, .42, .34, .3], [-1.5, .36, .46, .36, .31], [-.3, .33, .4, .32, .35], [.8, .2, .26, .2, .4], [2.8, .12, .15, .11, .46], [4.2, .09, .12, .09, .5], [4.55, .04, .07, .04, .5]], pt);
    hull(g, [[-3.15, .03, .03, .03, .6], [-2.8, .27, .25, .05, .64], [-2.0, .32, .32, .05, .68], [-1.2, .2, .2, .05, .7], [-.9, .03, .03, .03, .68]], UVEG());
    add(g, wingGeo(17, 1.15, .42, .25, .15, .95), M(SZIN.feher), 0, .5, -.95); for (const s of [-1, 1]) add(g, box(2.4, .05, .22), M(SZIN.sarga), s * 6.8, .52 + .55, -.6);
    add(g, finGeo(1.25, 1.05, .6, .45, .1), M(SZIN.zold), 0, .52, 3.75); add(g, wingGeo(3.0, .62, .38, .12, .08), M(SZIN.zold), 0, 1.78, 4.2);
    add(g, box(.35, .14, .8), M(SZIN.kek), 0, -.08, -.6); o.spray.push([0, -.18, -.6]);
    o.gear = new THREE.Group(); g.add(o.gear); wheel(o.gear, 0, -.15, -1.0, .25); wheel(o.gear, 0, .3, 4.3, .07); decal(g, .3, .35, -.6, Math.PI / 2, .8); decal(g, -.3, .35, -.6, -Math.PI / 2, .8); o.g = g; return o; },
  /* AS350 Écureuil jellegű könnyűhelikopter: üvegezett orr, hajtóműburkolat a tetőn, karcsú farokcső, véglemezes stabilizátor, csúszótalp */
  kopter() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [.35, 1.05, -1.4], len: 10.9, gearH: 1.15, hook: [0, -.8, 0] };
    const pt = (x, y, z) => y < -.4 ? SZIN.zold : band(y, -.4, -.25) ? SZIN.kek : SZIN.sarga;
    hull(g, [[-2.45, .15, .3, .25, .25], [-2.1, .68, .82, .72, .35], [-.95, .86, 1.02, .8, .42, 2.3]], UVEG(), { sub: 4 });
    hull(g, [[-.95, .86, 1.02, .8, .42, 2.3], [.2, .86, 1.04, .78, .45, 2.4], [1.1, .74, .92, .6, .55, 2.3], [1.9, .42, .55, .32, .85], [2.5, .2, .24, .18, .98], [6.4, .12, .16, .12, 1.02], [6.9, .08, .1, .08, 1.05]], pt);
    hull(g, [[-.7, .2, .1, .1, 1.35], [-.3, .5, .3, .1, 1.4, 2.6], [1.2, .5, .32, .1, 1.42, 2.6], [2.1, .25, .15, .05, 1.3]], M(SZIN.zold));
    add(g, cylZ(.14, .14, .5, 10), M(SZIN.sotet), 0, 1.35, 2.2);
    add(g, finGeo(1.25, 1.1, .55, .55, .14), M(SZIN.zold), 0, 1.0, 6.3); add(g, finGeo(.55, .7, .35, -.2, .12).rotateZ(Math.PI), M(SZIN.zold), 0, 1.0, 6.35);
    add(g, wingGeo(2.1, .55, .45, .05, .08), M(SZIN.sarga), 0, 1.0, 5.4); for (const s of [-1, 1]) add(g, finGeo(.5, .5, .4, .1, .05), M(SZIN.zold), s * 1.05, .8, 5.4);
    add(g, cylZ(.12, .12, .5, 10).rotateX(Math.PI / 2), M(SZIN.fem), 0, 1.7, 0);
    o.rotor.push(rotor(g, 0, 1.98, 0, 5.35, 3)); const tr = rotor(g, .25, 1.45, 6.6, .9, 2); tr.rotation.z = Math.PI / 2; o.tail = tr;
    o.gear = new THREE.Group(); g.add(o.gear); const F = M(SZIN.fem);
    for (const s of [-1, 1]) { tube(o.gear, [s * .95, -1.12, -1.7], [s * .95, -1.12, 1.3], .05, F); tube(o.gear, [s * .95, -1.12, -1.7], [s * .95, -.9, -2.1], .05, F);
      tube(o.gear, [s * .5, -.6, -1.0], [s * .95, -1.12, -1.15], .045, F); tube(o.gear, [s * .5, -.6, .6], [s * .95, -1.12, .75], .045, F); }
    tube(o.gear, [-.5, -.6, -1.0], [.5, -.6, -1.0], .045, F); tube(o.gear, [-.5, -.6, .6], [.5, -.6, .6], .045, F);
    decal(g, .86, .3, .2, Math.PI / 2, 1.4); decal(g, -.86, .3, .2, -Math.PI / 2, 1.4); o.bucket = 1; o.g = g; return o; },
  /* Ka–26: koaxiális rotor, üvegezett kabin, két motorgondola csonkaszárnyon, ikerfarok, négykerekes futó, cserélhető vegyszertartály */
  kamov() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [.4, 1.25, -2.0], len: 7.75, gearH: 1.3 };
    hull(g, [[-2.75, .2, .35, .35, .55], [-2.4, .78, .85, .8, .6, 2.4], [-1.6, .92, .95, .85, .6, 2.6]], UVEG());
    hull(g, [[-1.6, .92, .95, .85, .6, 2.6], [-.3, .92, .95, .85, .6, 2.8], [.15, .85, .85, .78, .6, 2.6], [.25, .05, .05, .05, .6]], (x, y) => y < -.05 ? SZIN.zold : SZIN.sarga);
    hull(g, [[.25, .7, .55, .55, -.05, 3], [1.75, .7, .55, .55, -.05, 3], [1.85, .05, .05, .05, -.05]], M(SZIN.kek));
    hull(g, [[-1.3, .4, .25, .2, 1.65], [-.6, .5, .35, .25, 1.7, 2.6], [.2, .45, .3, .2, 1.68], [.6, .15, .1, .05, 1.6]], M(SZIN.fem));
    for (const s of [-1, 1]) { pod(g, s * 1.75, 1.1, -.6, 2.8, .55, M(SZIN.zold), [[0, .5], [.15, .95], [.5, 1], [.85, .85], [1, .5]]); add(g, wingGeo(1.0, .9, .9, 0, .12), M(SZIN.sarga), s * 1.2, 1.05, -.6);
      tube(g, [s * 1.75, 1.0, .6], [s * 1.25, 1.1, 5.2], .07, M(SZIN.fem)); add(g, finGeo(1.4, 1.0, .65, .3, .1), M(SZIN.zold), s * 1.25, .55, 5.1); }
    add(g, wingGeo(2.6, .65, .65, 0, .1), M(SZIN.sarga), 0, 1.15, 5.15);
    o.rotor.push(rotor(g, 0, 2.3, -.6, 6.5, 3)); o.rotor.push(rotor(g, 0, 3.05, -.6, 6.5, 3)); o.rotor[1].userData.rev = 1; add(g, cylZ(.11, .11, 1.0, 10).rotateX(Math.PI / 2), M(SZIN.fem), 0, 2.6, -.6);
    add(g, box(11, .08, .08), M(SZIN.kek), 0, -.6, .9); for (const s of [-1, 1]) tube(g, [s * .6, -.4, .9], [s * 2.6, -.6, .9], .03, M(SZIN.fem)); for (let i = -5; i <= 5; i += 1.25) o.spray.push([i, -.68, .9]);
    o.gear = new THREE.Group(); g.add(o.gear); for (const [x, z, r] of [[-1.15, -1.9, .26], [1.15, -1.9, .26], [-1.4, 1.0, .32], [1.4, 1.0, .32]]) { tube(o.gear, [Math.sign(x) * .6, -.3, z * .8], [x, -1.0, z], .06, M(SZIN.fem)); wheel(o.gear, x, -1.0, z, r); }
    decal(g, .9, .55, -.7, Math.PI / 2, 1.3); decal(g, -.9, .55, -.7, -Math.PI / 2, 1.3); o.g = g; return o; },
  /* CH–47 Chinook: szögletes törzs oldalsó üzemanyag-dudorokkal, első és magas hátsó rotorpilon, hajtóművek a farpilon oldalán */
  chinook() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [.5, 1.85, -6.9], len: 15.5, gearH: 2, hook: [0, -1.4, 0] };
    const pt = (x, y) => y < -.2 ? SZIN.sarga : band(y, -.2, .05) ? SZIN.kek : SZIN.zold;
    hull(g, [[-7.9, .35, .5, .55, .55], [-7.4, 1.25, 1.15, 1.35, .6, 2.6], [-6.4, 1.65, 1.5, 1.55, .75, 3]], UVEG(), { sub: 4 });
    hull(g, [[-6.4, 1.65, 1.5, 1.55, .75, 3], [-5, 1.8, 1.7, 1.6, .8, 4], [5, 1.8, 1.7, 1.6, .8, 4], [7.2, 1.6, 1.6, 1.15, 1.1, 3.4], [7.7, 1.35, 1.35, .5, 1.6, 3]], pt, { seg: 32 });
    for (const s of [-1, 1]) hull(g, [[-3.6, .2, .3, .3, 0], [-2.8, .45, .6, .62, 0, 2.6], [4.4, .45, .6, .62, 0, 2.6], [5.1, .2, .3, .3, 0]], M(SZIN.sarga), {}, s * 1.95, -.35, 0);
    hull(g, [[-7.4, .2, .2, .1, 2.45], [-6.6, .62, .7, .2, 2.5, 3], [-5.0, .62, .62, .2, 2.5, 3], [-4.2, .2, .2, .1, 2.45]], M(SZIN.zold));
    hull(g, [[4.0, .3, .4, .4, 2.5], [4.8, .82, 1.9, .5, 3.0, 3], [7.3, .82, 1.7, .5, 3.0, 3], [7.8, .3, .4, .3, 2.9]], M(SZIN.zold));
    for (const s of [-1, 1]) { pod(g, s * 1.85, 3.25, 5.6, 3.6, .62, M(SZIN.sarga), [[0, .7], [.1, 1], [.7, .95], [1, .6]]); add(g, box(.9, .1, .7), M(SZIN.fem), s * 1.4, 3.25, 5.6); }
    o.rotor.push(rotor(g, 0, 3.4, -6.0, 9.15, 3)); o.rotor.push(rotor(g, 0, 5.15, 6.1, 9.15, 3)); o.rotor[1].userData.rev = 1;
    o.gear = new THREE.Group(); g.add(o.gear); for (const [x, z] of [[-1.3, -4.8], [1.3, -4.8], [-1.4, 4.4], [1.4, 4.4]]) { tube(o.gear, [Math.sign(x) * 1.2, -.7, z], [x, -1.55, z], .12, M(SZIN.fem)); wheel(o.gear, x, -1.6, z, .5); }
    decal(g, 1.82, .9, -1.5, Math.PI / 2, 4.2); decal(g, -1.82, .9, -1.5, -Math.PI / 2, 4.2); o.bucket = 1; o.g = g; return o; },
  /* Magni M16 jellegű autogiró: tandem nyitott gondola, tolólégcsavar, gerinccső, árboc a rotorig */
  giro() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [0, 1.15, -.7], len: 5.1, gearH: 1.0 };
    hull(g, [[-2.0, .05, .15, .15, .4], [-1.7, .38, .42, .38, .45], [-.8, .46, .5, .42, .48], [.4, .44, .42, .38, .5], [.95, .3, .28, .25, .55], [1.1, .05, .05, .05, .55]], (x, y) => y < .3 ? SZIN.zold : SZIN.sarga);
    hull(g, [[-1.15, .05, .05, .05, .95], [-.95, .36, .3, .02, .98, 2.4], [-.75, .38, .1, .02, 1.05]], UVEG());
    add(g, box(.32, .2, 1.2), M(SZIN.sotet), 0, .97, -.15);
    tube(g, [0, .05, .9], [0, .1, 3.4], .07, M(SZIN.fem)); tube(g, [0, .7, .5], [0, 2.55, .3], .06, M(SZIN.fem)); tube(g, [0, .1, 1.4], [0, 2.0, .45], .04, M(SZIN.fem));
    pod(g, 0, .6, .95, .9, .32, M(SZIN.zold), [[0, .6], [.2, 1], [1, .8]]); add(g, finGeo(1.1, .95, .6, .3, .1), M(SZIN.zold), 0, .1, 3.2); add(g, wingGeo(1.6, .5, .4, .05, .08), M(SZIN.kek), 0, .15, 3.25);
    for (const s of [-1, 1]) add(g, finGeo(.6, .55, .4, .2, .06), M(SZIN.zold), s * .8, .15, 3.25);
    o.prop.push(prop(g, 0, .6, 1.45, .85, 3)); o.prop[0].rotation.y = Math.PI;
    o.rotor.push(rotor(g, 0, 2.62, .3, 4.2, 2, SZIN.sarga)); add(g, box(.3, .2, .6), M(SZIN.kek), 0, -.15, -.2); o.spray.push([0, -.25, -.2]);
    o.gear = new THREE.Group(); g.add(o.gear); for (const s of [-1, 1]) { tube(o.gear, [s * .25, .1, .0], [s * .9, -.72, -.1], .04, M(SZIN.fem)); wheel(o.gear, s * .92, -.75, -.1, .3); } tube(o.gear, [0, .1, -1.5], [0, -.6, -1.7], .035, M(SZIN.fem)); wheel(o.gear, 0, -.72, -1.7, .2);
    decal(g, .45, .5, -.3, Math.PI / 2, .9); decal(g, -.45, .5, -.3, -Math.PI / 2, .9); o.g = g; return o; },
  /* mezőgazdasági hexakopter (Agras-szerű): központi test tartállyal, összecsukható karok, motorok, szórófej-sor, csúszótalp */
  dron() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [0, .2, -.9], len: 2.6, gearH: .55 };
    hull(g, [[-.6, .1, .1, .1, .12], [-.45, .38, .18, .14, .12, 3], [.45, .38, .18, .14, .12, 3], [.6, .1, .1, .1, .12]], M(SZIN.sarga));
    hull(g, [[-.42, .1, .1, .1, -.18], [-.3, .3, .2, .22, -.18, 2.6], [.35, .3, .2, .22, -.18, 2.6], [.45, .1, .1, .1, -.18]], M(SZIN.kek));
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6, x = Math.sin(a) * 1.25, z = Math.cos(a) * 1.25; tube(g, [x * .25, .15, z * .25], [x, .2, z], .035, M(SZIN.sotet));
      add(g, cylZ(.08, .09, .16, 12).rotateX(Math.PI / 2), M(SZIN.sotet), x, .27, z); add(g, cylZ(.03, .03, .32, 6).rotateX(Math.PI / 2), M(SZIN.fem), x, .05, z);
      const r = rotor(g, x, .36, z, .55, 2, SZIN.fekete); if (i % 2) r.userData.rev = 1; o.rotor.push(r); }
    add(g, box(2.4, .04, .04), M(SZIN.kek), 0, -.42, .15); for (let i = -1; i <= 1; i += .5) o.spray.push([i * 1.1, -.46, .15]);
    o.gear = new THREE.Group(); g.add(o.gear); for (const s of [-1, 1]) { tube(o.gear, [s * .2, -.05, -.25], [s * .42, -.5, -.3], .025, M(SZIN.sotet)); tube(o.gear, [s * .2, -.05, .25], [s * .42, -.5, .3], .025, M(SZIN.sotet)); tube(o.gear, [s * .42, -.5, -.55], [s * .42, -.5, .55], .03, M(SZIN.sotet)); }
    o.noNav = 1; o.g = g; return o; },
  /* léghajó (Goodyear-jellegű): csepp alakú burok, X-elrendezésű vezérsíkok, áramvonalas gondola, forgatható légcsavarok */
  leghajo() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [0, -8.4, -11], len: 70, gearH: 9.5, hook: [0, -9.2, 0] };
    hull(g, [[-34, .05, .05, .05, 0], [-32, 4.2, 4.2, 4.2, 0], [-26, 7.6, 7.6, 7.6, 0], [-14, 9, 9, 9, 0], [0, 9, 9, 9, 0], [14, 7.6, 7.6, 7.6, 0], [26, 4.2, 4.2, 4.2, 0], [34, .3, .3, .3, 0]], (x, y, z, t) => Math.abs(Math.sin(t * Math.PI * 2)) < .15 ? SZIN.zold : SZIN.sarga, { seg: 72, sub: 4 });
    for (let a = 0; a < 4; a++) { const f = add(g, finGeo(7.5, 8, 4.5, 3.5, .5), M(SZIN.zold), 0, 0, 22); f.geometry = f.geometry.clone().translate(0, 3, 0); f.rotation.z = a * Math.PI / 2 + Math.PI / 4; }
    hull(g, [[-11, .2, .3, .3, 0], [-9.5, 1.4, 1.1, 1.2, 0, 2.6], [1.5, 1.4, 1.1, 1.2, 0, 2.6], [3.5, .3, .4, .4, .3]], (x, y) => y < -.3 ? SZIN.zold : SZIN.feher, {}, 0, -9.6, 0);
    hull(g, [[-10.8, .05, .05, .05, .2], [-10, 1.3, .7, .05, .4, 2.6], [-6, 1.42, .55, .05, .45, 3], [-5.4, .3, .2, .05, .45]], UVEG(), {}, 0, -9.6, 0);
    add(g, box(16, .3, .9), M(SZIN.kek), 0, -10.3, 1.5);
    for (const s of [-1, 1]) { tube(g, [s * 1.4, -9.0, -1.0], [s * 4.3, -8.6, -1.0], .12, M(SZIN.fem)); pod(g, s * 4.5, -8.6, -.6, 2.4, .6, M(SZIN.fem)); o.prop.push(prop(g, s * 4.5, -8.6, -2.0, 1.4, 3)); }
    for (let i = -1; i <= 1; i += .4) o.spray.push([i * 7, -10.5, 1.5]);
    const lg = decal(g, 8.9, 1.2, -6, Math.PI / 2, 22); const lg2 = decal(g, -8.9, 1.2, -6, -Math.PI / 2, 22); lg.scale.y = lg2.scale.y = .7;
    o.gear = new THREE.Group(); g.add(o.gear); wheel(o.gear, 0, -10.9, 0, .45); o.g = g; return o; },
  slag() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [0, .6, -1.2], len: 6, gearH: .45 };
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, -2.6), new THREE.Vector3(0, 0, -1), new THREE.Vector3(.3, .1, .6), new THREE.Vector3(-.2, -.05, 2.2)]);
    add(g, new THREE.TubeGeometry(curve, 40, .2, 12), M(SZIN.zold)); add(g, cylZ(.12, .26, .7, 16), M(SZIN.sarga), 0, 0, -2.9); add(g, cylZ(.22, .22, .4, 16), M(SZIN.kek), 0, 0, -2.4);
    pod(g, -.2, 0, 2.9, 2.4, .36, M(SZIN.piros), [[0, .1], [.25, .85], [.4, 1], [1, .95]]);
    for (let a = 0; a < 3; a++) { const f = add(g, finGeo(.6, .7, .35, .3, .05), M(SZIN.sarga), -.2, 0, 3.5); f.geometry = f.geometry.clone().translate(0, .3, 0); f.rotation.z = a * 2.09; }
    const bu = add(g, new THREE.ConeGeometry(.3, 2.4, 16, 1, true).rotateX(Math.PI / 2), M(0xffb040, { emissive: 0xff7a10, transparent: true, opacity: .9, depthWrite: false }), -.2, 0, 5.3); bu.castShadow = false; o.burner = bu;
    add(g, wingGeo(2.4, .55, .35, .15, .08), M(SZIN.sarga), 0, 0, .2); o.spray.push([0, 0, -3.3]); o.gear = new THREE.Group(); g.add(o.gear); o.g = g; return o; },
  /* Zero különgépe: Mitsubishi A6M „Zero” ihlette – csillagmotor, alsószárny lekerekített végekkel, hosszú üvegtető, farokkerék; fekete–arany */
  zero() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [0, 1.4, -1.2], len: 10.9, gearH: 1.6 };
    const GOLD = 0xe8b656, pt = (x, y, z) => z < -3.7 ? GOLD : band(y, .12, .3) ? GOLD : SZIN.fekete;
    hull(g, [[-4.85, .55, .6, .55, .3], [-4.6, .78, .8, .78, .32], [-3.7, .78, .8, .78, .35], [-2.2, .68, .78, .66, .4], [0, .6, .72, .58, .45], [2.4, .42, .55, .4, .55], [5.0, .14, .28, .14, .72], [5.9, .05, .1, .05, .78]], pt);
    hull(g, [[-2.3, .03, .03, .03, 1.05], [-1.9, .38, .4, .05, 1.12], [.2, .4, .45, .05, 1.15], [2.2, .25, .25, .05, 1.1], [2.8, .03, .03, .03, 1.02]], UVEG());
    { const st = [], N = 10; for (let i = -N; i <= N; i++) { const s = Math.abs(i) / N, ch = 2.5 * Math.sqrt(Math.max(.02, 1 - s ** 2.6)); st.push([i / N * 6.6, ch, -.15 + s * .35, s * .45, .32 * (1 - s * .55)]); } add(g, surfGeo(st, false), M(GOLD), 0, -.1, -.9); }
    for (const s of [-1, 1]) { const f = add(g, box(2.6, .07, .45), M(SZIN.fekete), s * 2.2, -.1, .3); o.flap.push(f); }
    add(g, wingGeo(4.4, 1.3, .65, .3, .12, 0), M(GOLD), 0, .62, 4.9); add(g, finGeo(1.55, 1.5, .7, .7, .13), M(SZIN.fekete), 0, .66, 4.7);
    o.prop.push(prop(g, 0, .3, -5.05, 1.45, 3, GOLD));
    add(g, box(12, .06, .06), M(SZIN.kek), 0, -.32, .2); for (let i = -5; i <= 5; i += 1.25) o.spray.push([i, -.38, .2]);
    const t = document.createElement('canvas'); t.width = 256; t.height = 64; const x = t.getContext('2d'); x.fillStyle = '#15181c'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#e8b656'; x.font = '900 52px Inter, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ZERO', 128, 34);
    const tx = new THREE.CanvasTexture(t); tx.colorSpace = THREE.SRGBColorSpace; for (const s of [-1, 1]) { const d = new THREE.Mesh(new THREE.PlaneGeometry(2.0, .5), new THREE.MeshStandardMaterial({ map: tx, roughness: .4 })); d.position.set(s * .52, .5, 1.6); d.rotation.y = s * Math.PI / 2; g.add(d); }
    o.gear = new THREE.Group(); g.add(o.gear); for (const s of [-1, 1]) { tube(o.gear, [s * 1.6, -.15, -1.4], [s * 1.65, -1.2, -1.55], .08, M(SZIN.fem)); wheel(o.gear, s * 1.65, -1.25, -1.55, .38); }
    tube(o.gear, [0, .4, 5.3], [0, -.05, 5.5], .04, M(SZIN.fem)); wheel(o.gear, 0, -.1, 5.5, .14); o.g = g; return o; },
};

/* navigációs fények: piros bal, zöld jobb szárnyvég, fehér farokfény + villogó stroboszkóp; a helyük a modell szélső pontjaiból (a forgó részek nélkül) */
const LIT = c => new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(c[0], c[1], c[2]), toneMapped: false, fog: true });
const NAVM = { r: LIT([6, .25, .2]), g: LIT([.2, 5, .6]), w: LIT([5, 5, 4.6]) }, NAVG = new THREE.SphereGeometry(.13, 10, 8);
function navLights(o) { if (o.noNav) return; const skip = new Set([...o.prop, ...o.rotor, o.tail, o.gear, o.burner].filter(Boolean)), V = new THREE.Vector3(); let mn = null, mx = null, bk = null; o.g.updateMatrixWorld(true);
  const walk = (n, sk) => { sk = sk || skip.has(n); if (n.isMesh && !sk && !n.material.transparent && n.material !== UVEG()) { const p = n.geometry.attributes.position, st = Math.max(1, p.count / 400 | 0);
      for (let i = 0; i < p.count; i += st) { V.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld); if (!mn || V.x < mn.x) mn = V.clone(); if (!mx || V.x > mx.x) mx = V.clone(); if (!bk || V.z > bk.z) bk = V.clone(); } }
    for (const c of n.children) walk(c, sk); };
  walk(o.g, false); if (!mn) return; o.strobe = [];
  const put = (v, m, dx = 0, dz = 0) => { const l = new THREE.Mesh(NAVG, m); l.position.set(v.x + dx, v.y, v.z + dz); l.castShadow = false; o.g.add(l); return l; };
  if (mx.x - mn.x > 2.5) { put(mn, NAVM.r, -.08); put(mx, NAVM.g, .08); o.strobe.push(put(mn, NAVM.w, -.08, .25), put(mx, NAVM.w, .08, .25)); }
  put(bk, NAVM.w, 0, .1); }
export function buildModel(id) { const o = B[id](); navLights(o); o.g.traverse(m => { if (m.isMesh && !m.material.transparent) m.receiveShadow = false; }); o.g.userData.model = o; return o; }
export function animate(o, st, dt) { o.t = (o.t || 0) + dt; if (o.strobe) { const on = o.t % 1.3 < .06; for (const l of o.strobe) l.visible = on; }
  for (const p of o.prop) { p.rotation.z += dt * (st.rpm || 0) * 40 * (p.rotation.y ? -1 : 1); for (const c of p.children) if (c.userData.disc) c.visible = (st.rpm || 0) > .35; }
  for (const r of o.rotor) { r.rotation.y += dt * (st.rotor || 0) * 26 * (r.userData.rev ? -1 : 1); for (const c of r.children) if (c.userData.disc) c.visible = (st.rotor || 0) > .5; }
  if (o.tail) o.tail.rotation.x += dt * (st.rotor || 0) * 70;
  if (o.gear && !o.noGear) { const k = st.gear ?? 1; o.gear.scale.y = Math.max(.02, k); o.gear.visible = k > .05; }
  for (const f of o.flap) f.rotation.x = (st.flaps || 0) * .5;
  if (o.burner) { o.burner.visible = !!st.burner; if (st.burner) { const s = .85 + Math.random() * .3; o.burner.scale.set(s, s, .8 + Math.random() * .5); } }
  if (o.ramp) o.ramp.rotation.x = -(st.ramp || 0) * .45;
  if (o.nose) o.nose.rotation.x = (st.droop || 0) * .2;
}
