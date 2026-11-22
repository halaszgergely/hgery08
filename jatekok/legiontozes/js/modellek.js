/* A gépek kódból épített low-poly modelljei (HGWS sárga–zöld–vízkék). Orr: −Z, fel: +Y, jobb: +X, méterben.
   Minden modell { g, prop[], rotor[], gear, flap[], burner, ramp, eye, spray[], hook, len } – a fizika és a kamera ezeket használja. */
import * as THREE from 'three';
import { SZIN } from './config.js?v=202611220300';

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
function rotor(par, x, y, z, r, n = 4, col = SZIN.sotet) { const g = new THREE.Group(); g.position.set(x, y, z); par.add(g); add(g, cylZ(.25, .25, .5, 16).rotateX(Math.PI / 2), M(SZIN.fem));
  for (let i = 0; i < n; i++) { const b = add(g, box(r, .07, .45), M(col), 0, 0, 0, 0, i / n * Math.PI * 2); b.geometry = b.geometry.clone().translate(r / 2, 0, 0); }
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

const B = {
  permetezo() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [0, 1.25, -1.2], len: 10, gearH: 1.6 };
    add(g, cylZ(.55, .7, 2.2), M(SZIN.sarga), 0, .2, -3.4); add(g, cylZ(.7, .75, 1.6), M(SZIN.zold), 0, .25, -1.6); add(g, cylZ(.72, .25, 5.6), M(SZIN.sarga), 0, .35, 1.9);
    add(g, box(.9, .7, 1.4), UVEG(), 0, 1.05, -1.2); add(g, box(.95, .2, 1.5), M(SZIN.zold), 0, 1.45, -1.2);
    const w = add(g, wingGeo(14, 2, 1.4, .3, .22, .45), M(SZIN.sarga), 0, -.15, -1.7); add(g, box(14, .04, .3), M(SZIN.zold), 0, -.03, -2.65);
    for (const s of [-1, 1]) { const f = add(g, box(4.2, .09, .5), M(SZIN.zold), s * 3.4, -.22, -.6); o.flap.push(f); }
    add(g, wingGeo(4.4, 1.1, .7, .3, .14), M(SZIN.sarga), 0, .45, 4.3); add(g, box(.12, 1.8, 1.2), M(SZIN.zold), 0, 1.2, 4.3); add(g, box(.13, .5, .6), M(SZIN.kek), 0, 1.9, 4.6);
    add(g, box(13, .09, .09), M(SZIN.kek), 0, -.45, -.9); for (let i = -6; i <= 6; i += 2) add(g, box(.08, .22, .08), M(SZIN.fem), i, -.55, -.9);
    o.prop.push(prop(g, 0, .2, -4.55, 1.35)); o.gear = tailGear(g, 4.6, 1.45, -2.2, 1.3); decal(g, .76, .4, .9, Math.PI / 2, 2.2); decal(g, -.76, .4, .9, -Math.PI / 2, 2.2);
    for (let i = -6; i <= 6; i += 1.5) o.spray.push([i, -.55, -.9]); o.g = g; return o; },
  ancsa() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [-.3, 1.7, -2.6], len: 12.7, gearH: 2.05 };
    add(g, cylZ(1.05, 1.1, 1.2, 16), M(SZIN.sotet), 0, .3, -5.2); add(g, cylZ(1.1, 1.0, 2.4), M(SZIN.zold), 0, .4, -3.4); add(g, box(1.8, 2, 4.6), M(SZIN.sarga), 0, .45, -.1); add(g, cylZ(1.0, .35, 6), M(SZIN.sarga), 0, .55, 4.9);
    add(g, box(1.7, .7, 1.4), UVEG(), 0, 1.55, -2.7); add(g, box(.05, .55, 3.2), UVEG(), .91, .8, .1); add(g, box(.05, .55, 3.2), UVEG(), -.91, .8, .1);
    add(g, wingGeo(18.2, 2.4, 2.2, 0, .3, 0), M(SZIN.sarga), 0, 2.25, -2.0); add(g, wingGeo(14.2, 2.0, 1.8, 0, .28, .35), M(SZIN.sarga), 0, -.45, -2.0);
    for (const s of [-1, 1]) { add(g, box(.12, 2.6, .12), M(SZIN.fem), s * 4, .9, -2.4); add(g, box(.12, 2.6, .12), M(SZIN.fem), s * 4, .9, -1.4); const f = add(g, box(4, .09, .6), M(SZIN.zold), s * 3.2, -.55, -.7); o.flap.push(f); }
    add(g, box(18.2, .1, .4), M(SZIN.zold), 0, 2.45, -3.0);
    add(g, wingGeo(7.2, 1.7, 1.2, .2, .16), M(SZIN.sarga), 0, .8, 7.1); add(g, box(.15, 2.6, 1.8), M(SZIN.zold), 0, 2, 7.1); add(g, box(.16, .7, .8), M(SZIN.kek), 0, 3.1, 7.5);
    add(g, box(13, .1, .1), M(SZIN.kek), 0, -.7, -1.2); for (let i = -6; i <= 6; i += 1.5) o.spray.push([i, -.8, -1.2]);
    o.prop.push(prop(g, 0, .3, -5.95, 1.8, 4)); o.gear = tailGear(g, 6.9, 1.6, -3.3, 1.7); decal(g, .91, .5, 1.2, Math.PI / 2, 2.6); decal(g, -.91, .5, 1.2, -Math.PI / 2, 2.6); o.g = g; return o; },
  vadasz() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [0, 1.0, -3.6], len: 15, gearH: 1.7 };
    add(g, new THREE.ConeGeometry(.75, 4.2, 16).rotateX(-Math.PI / 2), M(SZIN.sarga), 0, .1, -7.1); add(g, cylZ(.75, 1.05, 5, 16), M(SZIN.sarga), 0, .1, -2.6); add(g, cylZ(1.05, .8, 6.5, 16), M(SZIN.zold), 0, .1, 3.2);
    add(g, new THREE.SphereGeometry(.65, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1, 2.6), UVEG(), 0, .6, -3.6);
    for (const s of [-1, 1]) add(g, box(.7, .8, 3), M(SZIN.sotet), s * 1.05, -.1, -1.2);
    add(g, wingGeo(9.6, 5.2, 1.2, 3.2, .2, -.1), M(SZIN.sarga), 0, -.05, 1.3); add(g, wingGeo(5.4, 2, .8, 1.4, .14), M(SZIN.sarga), 0, .1, 5.6);
    for (const s of [-1, 1]) { const f = add(g, box(2.6, .08, .6), M(SZIN.zold), s * 2.3, -.1, 3.4); o.flap.push(f); }
    add(g, finGeo(3.4, 3.4, 1.1, 2, .15), M(SZIN.zold), 0, .5, 4.8); add(g, box(.16, .7, .9), M(SZIN.kek), 0, 2.6, 5.6);
    add(g, cylZ(.6, .55, .6, 16), M(SZIN.fekete), 0, .1, 6.6); const bu = add(g, new THREE.ConeGeometry(.55, 3.4, 16).rotateX(Math.PI / 2), M(0xffa040, { emissive: 0xff6a10, transparent: true, opacity: .85, depthWrite: false }), 0, .1, 8.5); bu.visible = false; bu.castShadow = false; o.burner = bu;
    add(g, box(9, .07, .07), M(SZIN.kek), 0, -.35, 1.8); for (let i = -4; i <= 4; i += 1.6) o.spray.push([i, -.45, 2]);
    o.gear = triGear(g, -5.2, 1.2, 1.35, 1.4, .4); decal(g, 1.07, .25, 2.4, Math.PI / 2, 2.2); decal(g, -1.07, .25, 2.4, -Math.PI / 2, 2.2); o.g = g; return o; },
  concorde() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [0, 2.2, -24], len: 62, gearH: 5.4 };
    const nose = add(g, new THREE.ConeGeometry(1.45, 9, 16).rotateX(-Math.PI / 2), M(SZIN.feher), 0, .2, -29); o.nose = nose;
    add(g, cylZ(1.45, 1.5, 30, 16), M(SZIN.feher), 0, .2, -9.5); add(g, cylZ(1.5, .6, 22, 16), M(SZIN.feher), 0, .2, 16.5);
    add(g, box(3.02, .5, 40), M(SZIN.zold), 0, -.3, 0); add(g, box(3.04, .3, 40), M(SZIN.sarga), 0, .4, 0);
    add(g, wingGeo(25.6, 32, 3, 26, .7, -.2), M(SZIN.feher), 0, -.9, 4); add(g, box(25.6, .08, .6), M(SZIN.kek), 0, -.5, 19.4);
    add(g, finGeo(9, 11, 3, 6, .3), M(SZIN.zold), 0, .8, 19);
    for (const s of [-1, 1]) for (const k of [3.4, 5.6]) { add(g, box(1.2, 1.2, 11), M(SZIN.fem), s * k, -1.7, 14); } for (let i = -1; i <= 1; i += .4) o.spray.push([i * 12, -1.9, 16]);
    o.gear = triGear(g, -16, 7, 4.2, 3.6, .7); decal(g, 1.52, .4, -10, Math.PI / 2, 6); decal(g, -1.52, .4, -10, -Math.PI / 2, 6); o.g = g; return o; },
  jumbo() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [0, 7.2, -30], len: 70, gearH: 5.2 };
    add(g, new THREE.SphereGeometry(3.25, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-Math.PI / 2).scale(1, 1, 1.8), M(SZIN.feher), 0, 0, -26); add(g, cylZ(3.25, 3.25, 44, 12), M(SZIN.feher), 0, 0, -4);
    add(g, cylZ(3.25, .9, 18, 12), M(SZIN.feher), 0, .8, 27); add(g, cylZ(2.1, 2.6, 18, 16).scale(1, .9, 1), M(SZIN.feher), 0, 2.6, -17);
    add(g, box(6.55, 1.1, 66), M(SZIN.sarga), 0, -.9, 0); add(g, box(6.57, .45, 60), M(SZIN.zold), 0, -1.65, 0); add(g, box(6.58, .25, 50), M(SZIN.kek), 0, .5, -2);
    add(g, wingGeo(64, 14, 4, 18, 1, 2.6), M(SZIN.fem), 0, -1.8, 4); add(g, wingGeo(22, 7, 2.5, 6, .5, .6), M(SZIN.fem), 0, 1.4, 32); add(g, finGeo(11, 11, 3.5, 7, .4), M(SZIN.zold), 0, 2, 30.5);
    for (const s of [-1, 1]) for (const k of [11.6, 21]) { add(g, cylZ(1.4, 1.2, 5.5, 16), M(SZIN.sarga), s * k, -3.4 + k * .04, k * .55 - 2.6); add(g, cylZ(.95, .95, .3, 16), M(SZIN.fekete), s * k, -3.4 + k * .04, k * .55 - 5.4); }
    for (const s of [-1, 1]) { const f = add(g, box(14, .2, 2), M(SZIN.zold), s * 14, -2, 10.5); o.flap.push(f); }
    for (let i = -1; i <= 1; i += .25) o.spray.push([i * 30, -2.4, 11]);
    o.gear = triGear(g, -24, 3, 3.4, 3.4, .75); decal(g, 3.27, 1.5, -12, Math.PI / 2, 9); decal(g, -3.27, 1.5, -12, -Math.PI / 2, 9); o.g = g; return o; },
  herkules() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [0, 2.6, -13.6], len: 30, gearH: 2.6 };
    add(g, new THREE.SphereGeometry(2.1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-Math.PI / 2).scale(1, 1, 1.3), M(SZIN.zold), 0, 0, -12.5);
    add(g, cylZ(2.1, 2.2, 17, 16), M(SZIN.zold), 0, 0, -4); add(g, cylZ(2.2, .9, 9, 16), M(SZIN.zold), 0, .9, 8.6); add(g, box(1.8, .8, 1.4), UVEG(), 0, 1.7, -13.2);
    add(g, box(4.25, .9, 26), M(SZIN.sarga), 0, -1.2, -1);
    add(g, wingGeo(40, 4.6, 2.4, 1.2, .55, 0), M(SZIN.sarga), 0, 2.35, -4);
    for (const s of [-1, 1]) for (const k of [5, 10]) { add(g, cylZ(.55, .7, 4.5, 16), M(SZIN.zold), s * k, 1.9, -5.6); o.prop.push(prop(g, s * k, 1.9, -8, 2.1, 4)); }
    add(g, wingGeo(15, 4, 2, 1, .3), M(SZIN.sarga), 0, 1.6, 13); add(g, finGeo(6.5, 5, 2.4, 2.5, .3), M(SZIN.sarga), 0, 1.7, 12.4); add(g, box(.32, 1.2, 2.2), M(SZIN.kek), 0, 6.3, 13.4);
    const ramp = new THREE.Group(); ramp.position.set(0, -1.6, 4.4); g.add(ramp); add(ramp, box(3.2, .25, 4.2), M(SZIN.sotet), 0, 0, 2.1); o.ramp = ramp;
    for (const s of [-1, 1]) { const f = add(g, box(9, .12, 1.2), M(SZIN.zold), s * 7.5, 2.2, -1.4); o.flap.push(f); }
    for (let i = -1; i <= 1; i += .5) o.spray.push([i * 1.2, -1.8, 7.2]);
    o.gear = triGear(g, -10, 0, 1.2, 2.3, .6); decal(g, 2.15, .5, -6, Math.PI / 2, 4); decal(g, -2.15, .5, -6, -Math.PI / 2, 4); o.g = g; return o; },
  ketelt() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [0, 2.3, -7.6], len: 19.8, gearH: 1.9, float: 1 };
    add(g, new THREE.SphereGeometry(1.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-Math.PI / 2).scale(1, 1, 1.4), M(SZIN.sarga), 0, .4, -7.6);
    add(g, box(2.6, 2.6, 10), M(SZIN.sarga), 0, .4, -2.6); add(g, cylZ(1.4, .5, 8, 16).scale(1, 1.1, 1), M(SZIN.sarga), 0, .9, 6.4); add(g, box(2.4, .8, 13), M(SZIN.piros), 0, -.95, -1.5);
    add(g, box(2.4, .6, 1.4), UVEG(), 0, 1.7, -7.3);
    add(g, wingGeo(28.6, 3.6, 2.2, 0, .45, 0), M(SZIN.sarga), 0, 2.15, -2.2); add(g, box(28.6, .1, .5), M(SZIN.kek), 0, 2.45, -3.6);
    for (const s of [-1, 1]) { add(g, cylZ(.6, .8, 4.6, 16), M(SZIN.zold), s * 4.4, 2.2, -3.6); o.prop.push(prop(g, s * 4.4, 2.2, -6, 1.9, 4)); add(g, box(.6, .5, 2.4), M(SZIN.sarga), s * 13, .6, -2.4); add(g, box(.1, 1.4, .1), M(SZIN.fem), s * 13, 1.4, -2.4); }
    add(g, wingGeo(9, 2.4, 1.4, .6, .25), M(SZIN.sarga), 0, 5.6, 8.6); add(g, finGeo(4.4, 4, 2.2, 2, .25), M(SZIN.zold), 0, 1.6, 8);
    for (const s of [-1, 1]) { const f = add(g, box(7, .1, .8), M(SZIN.zold), s * 6, 2, -.6); o.flap.push(f); }
    for (let i = -1; i <= 1; i += .5) o.spray.push([i * 1.2, -1.4, -1.5]);
    o.gear = triGear(g, -6, 0, 1.0, 1.6, .5); decal(g, 1.31, .7, -3, Math.PI / 2, 3.4); decal(g, -1.31, .7, -3, -Math.PI / 2, 3.4); o.g = g; return o; },
  hidro() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [0, 1.4, -1.3], len: 8.5, gearH: 1.9, float: 1, noGear: 1 };
    add(g, cylZ(.6, .7, 2, 16), M(SZIN.zold), 0, .25, -3); add(g, box(1.25, 1.3, 3), M(SZIN.sarga), 0, .35, -.9); add(g, cylZ(.65, .25, 4.5, 16), M(SZIN.sarga), 0, .45, 2.6); add(g, box(1.2, .7, 1.4), UVEG(), 0, 1.0, -1.2);
    add(g, wingGeo(11, 1.6, 1.3, 0, .2, 0), M(SZIN.sarga), 0, 1.15, -1.1); for (const s of [-1, 1]) add(g, box(.08, 1.2, .08), M(SZIN.fem), s * 1.7, .5, -1);
    add(g, wingGeo(3.6, 1, .7, .3, .12), M(SZIN.sarga), 0, .55, 4.6); add(g, box(.1, 1.3, 1), M(SZIN.zold), 0, 1.15, 4.6);
    for (const s of [-1, 1]) { add(g, cylZ(.22, .4, 1.4, 16), M(SZIN.kek), s * 1.2, -1.35, -2.6); add(g, cylZ(.4, .18, 4.8, 16), M(SZIN.kek), s * 1.2, -1.35, .5); add(g, box(.1, 1.1, .1), M(SZIN.fem), s * 1.1, -.7, -1.6); add(g, box(.1, 1.1, .1), M(SZIN.fem), s * 1.1, -.7, .3);
      const f = add(g, box(3, .08, .4), M(SZIN.zold), s * 2.8, 1.05, -.2); o.flap.push(f); }
    add(g, box(10, .07, .07), M(SZIN.kek), 0, 1.0, -.25); for (let i = -4; i <= 4; i += 2) o.spray.push([i, .95, -.25]);
    o.prop.push(prop(g, 0, .25, -4.1, 1.05, 2)); decal(g, .64, .35, -.6, Math.PI / 2, 1.6); decal(g, -.64, .35, -.6, -Math.PI / 2, 1.6); o.g = g; return o; },
  vitorlazo() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [0, .75, -2.2], len: 8.2, gearH: .55 };
    add(g, new THREE.ConeGeometry(.42, 1.6, 16).rotateX(-Math.PI / 2), M(SZIN.feher), 0, .3, -3.8); add(g, cylZ(.42, .3, 2.6, 16), M(SZIN.feher), 0, .3, -1.7); add(g, cylZ(.3, .1, 5, 16), M(SZIN.feher), 0, .4, 2.1);
    add(g, new THREE.SphereGeometry(.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1, 2.6), UVEG(), 0, .6, -2.2);
    add(g, wingGeo(17, 1.1, .45, .3, .12, .9), M(SZIN.feher), 0, .55, -.8); add(g, box(17, .04, .2), M(SZIN.zold), 0, .62, -1.3); for (const s of [-1, 1]) add(g, box(1.6, .05, .2), M(SZIN.sarga), s * 7.6, .75, -.5);
    add(g, box(.1, 1.3, .8), M(SZIN.zold), 0, 1.1, 4.3); add(g, wingGeo(2.8, .6, .4, .1, .08), M(SZIN.sarga), 0, 1.78, 4.4);
    add(g, box(.4, .15, .8), M(SZIN.kek), 0, -.1, -.6); o.spray.push([0, -.2, -.6]);
    o.gear = new THREE.Group(); g.add(o.gear); wheel(o.gear, 0, -.15, -1, .25); decal(g, .3, .35, 1, Math.PI / 2, .9); decal(g, -.3, .35, 1, -Math.PI / 2, .9); o.g = g; return o; },
  kopter() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [.35, 1.25, -1.5], len: 12, gearH: 1.15, hook: [0, -.8, 0] };
    add(g, new THREE.SphereGeometry(1.25, 16, 10).scale(1, .95, 1.7), M(SZIN.sarga), 0, .35, -.6); add(g, new THREE.SphereGeometry(1.0, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-Math.PI / 2).scale(1, .9, 1), UVEG(), 0, .55, -1.6);
    add(g, box(1.6, .3, 2.2), M(SZIN.zold), 0, -.45, -.3); add(g, cylZ(.4, .18, 6.2, 16), M(SZIN.sarga), 0, .6, 4); add(g, box(.12, 1.4, .9), M(SZIN.zold), 0, 1.2, 6.9); add(g, wingGeo(1.8, .5, .4, .1, .08), M(SZIN.sarga), 0, .6, 5.8);
    add(g, box(.7, .6, 1.4), M(SZIN.fem), 0, 1.45, .1);
    o.rotor.push(rotor(g, 0, 1.95, 0, 5.4, 4)); const tr = rotor(g, .25, 1.2, 6.9, .8, 2); tr.rotation.z = Math.PI / 2; o.tail = tr;
    for (const s of [-1, 1]) { add(g, box(.12, .12, 3.2), M(SZIN.fem), s * .9, -1.12, -.3); add(g, box(.1, .5, .1), M(SZIN.fem), s * .8, -.85, -1); add(g, box(.1, .5, .1), M(SZIN.fem), s * .8, -.85, .4); }
    o.gear = new THREE.Group(); g.add(o.gear); decal(g, 1.24, .2, .1, Math.PI / 2, 1.5); decal(g, -1.24, .2, .1, -Math.PI / 2, 1.5); o.bucket = 1; o.g = g; return o; },
  kamov() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [.4, 1.5, -1.7], len: 8, gearH: 1.3 };
    add(g, box(1.9, 1.9, 2.6), M(SZIN.sarga), 0, .45, -1.1); add(g, box(1.85, 1.3, .9), UVEG(), 0, .7, -2.5); add(g, box(1.6, .5, 1.6), M(SZIN.zold), 0, -.65, -.2);
    add(g, box(1.5, 1.2, 1.4), M(SZIN.kek), 0, -.2, .8); // a beépített tartály
    for (const s of [-1, 1]) { add(g, cylZ(.5, .55, 2.4, 16), M(SZIN.zold), s * 1.7, 1.1, -.6); add(g, box(.15, .15, 5.2), M(SZIN.fem), s * 1.15, 1.1, 2.6); add(g, box(.12, 1.5, 1.0), M(SZIN.zold), s * 1.15, 1.5, 5); }
    add(g, box(2.5, .12, .6), M(SZIN.sarga), 0, 1.15, 5.1); add(g, box(.9, .7, .9), M(SZIN.fem), 0, 1.75, -.6);
    o.rotor.push(rotor(g, 0, 2.3, -.6, 6.5, 3)); o.rotor.push(rotor(g, 0, 3.15, -.6, 6.5, 3)); o.rotor[1].userData.rev = 1;
    add(g, box(11, .1, .1), M(SZIN.kek), 0, -.6, .9); for (const s of [-1, 1]) add(g, box(.08, .1, 1.4), M(SZIN.fem), s * 2.5, -.6, .4); for (let i = -5; i <= 5; i += 1.25) o.spray.push([i, -.7, .9]);
    o.gear = new THREE.Group(); g.add(o.gear); for (const [x, z] of [[-1.2, -1.6], [1.2, -1.6], [-1.3, 1.1], [1.3, 1.1]]) { add(o.gear, box(.12, .9, .12), M(SZIN.fem), x, -.95, z); wheel(o.gear, x, -1.25, z, .3); }
    decal(g, .96, .6, -.8, Math.PI / 2, 1.5); decal(g, -.96, .6, -.8, -Math.PI / 2, 1.5); o.g = g; return o; },
  chinook() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [.5, 1.7, -6.6], len: 16, gearH: 2, hook: [0, -1.4, 0] };
    add(g, box(3.6, 3.4, 14.5), M(SZIN.zold), 0, .8, -.2); add(g, new THREE.SphereGeometry(1.8, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-Math.PI / 2).scale(1, .95, .9), M(SZIN.zold), 0, .6, -7.4);
    add(g, box(3.2, .9, 1.4), UVEG(), 0, 1.3, -7.6); add(g, box(3.62, .9, 12), M(SZIN.sarga), 0, -.2, -.4); add(g, box(1.6, 3.4, 3), M(SZIN.zold), 0, 3.1, 6.2); add(g, box(1.4, 1.2, 2), M(SZIN.zold), 0, 2.8, -6.4);
    for (const s of [-1, 1]) add(g, cylZ(.65, .65, 3.2, 16), M(SZIN.sarga), s * 1.8, 3.2, 5.8);
    o.rotor.push(rotor(g, 0, 3.6, -6.4, 9, 3)); o.rotor.push(rotor(g, 0, 5, 6.2, 9, 3)); o.rotor[1].userData.rev = 1;
    o.gear = new THREE.Group(); g.add(o.gear); for (const [x, z] of [[-1.3, -5], [1.3, -5], [-1.3, 4.5], [1.3, 4.5]]) { add(o.gear, box(.2, 1.1, .2), M(SZIN.fem), x, -1.25, z); wheel(o.gear, x, -1.6, z, .5); }
    decal(g, 1.82, 1, -1.5, Math.PI / 2, 4.4); decal(g, -1.82, 1, -1.5, -Math.PI / 2, 4.4); o.bucket = 1; o.g = g; return o; },
  giro() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [0, 1.25, -.9], len: 5, gearH: 1.0 };
    add(g, new THREE.SphereGeometry(.65, 16, 10).scale(1, .9, 1.9), M(SZIN.sarga), 0, .45, -.7); add(g, box(.15, .15, 3.4), M(SZIN.fem), 0, .1, 1.2); add(g, box(.12, 2.4, .12), M(SZIN.fem), 0, 1.4, .3);
    add(g, box(.1, 1.2, .9), M(SZIN.zold), 0, .7, 2.9); add(g, wingGeo(1.6, .5, .4, .1, .08), M(SZIN.kek), 0, .2, 2.9); add(g, box(.5, .6, .9), M(SZIN.zold), 0, .6, .6);
    o.prop.push(prop(g, 0, .6, 1.15, .85, 3)); o.prop[0].rotation.y = Math.PI;
    o.rotor.push(rotor(g, 0, 2.65, .3, 4.2, 2, SZIN.sarga)); add(g, box(.3, .2, .6), M(SZIN.kek), 0, -.2, -.2); o.spray.push([0, -.3, -.2]);
    o.gear = new THREE.Group(); g.add(o.gear); for (const s of [-1, 1]) { add(o.gear, box(.08, .7, .08), M(SZIN.fem), s * .7, -.35, -.1); wheel(o.gear, s * .9, -.75, -.1, .3); } wheel(o.gear, 0, -.7, -1.7, .2);
    decal(g, .6, .45, -.6, Math.PI / 2, 1); decal(g, -.6, .45, -.6, -Math.PI / 2, 1); o.g = g; return o; },
  dron() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [0, .2, -.9], len: 2.6, gearH: .55 };
    add(g, cylZ(.45, .45, .5, 16).rotateX(Math.PI / 2), M(SZIN.sarga), 0, .1, 0); add(g, new THREE.SphereGeometry(.4, 16, 10).scale(1, .7, 1), M(SZIN.kek), 0, -.25, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6, x = Math.sin(a) * 1.25, z = Math.cos(a) * 1.25; add(g, box(.08, .06, 1.25), M(SZIN.sotet), x / 2, .15, z / 2, 0, a); add(g, cylZ(.08, .08, .18, 6).rotateX(Math.PI / 2), M(SZIN.zold), x, .22, z);
      const r = rotor(g, x, .33, z, .55, 2, SZIN.fekete); if (i % 2) r.userData.rev = 1; o.rotor.push(r); }
    add(g, box(2.4, .05, .05), M(SZIN.kek), 0, -.4, .15); for (let i = -1; i <= 1; i += .5) o.spray.push([i * 1.1, -.45, .15]);
    o.gear = new THREE.Group(); g.add(o.gear); for (const s of [-1, 1]) { add(o.gear, box(.05, .4, .05), M(SZIN.sotet), s * .35, -.3, 0); add(o.gear, box(.06, .06, 1), M(SZIN.sotet), s * .45, -.5, 0); }
    o.g = g; return o; },
  leghajo() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [0, -7.6, -12], len: 70, gearH: 9.5, hook: [0, -9.2, 0] };
    add(g, new THREE.SphereGeometry(9, 16, 10).scale(1, 1, 3.8), M(SZIN.sarga), 0, 0, 0); add(g, new THREE.SphereGeometry(9.05, 16, 10, 0, Math.PI * 2, Math.PI * .45, Math.PI * .1).scale(1, 1, 3.8), M(SZIN.zold), 0, 0, 0);
    for (let a = 0; a < 4; a++) { const f = add(g, box(.4, 8, 7), M(SZIN.zold), 0, 0, 28, 0, 0, a * Math.PI / 2); f.geometry = f.geometry.clone().translate(0, 8, 0); }
    add(g, box(3, 2.4, 11), M(SZIN.feher), 0, -9.6, -4); add(g, box(3.05, .8, 9), UVEG(), 0, -9.2, -5); add(g, box(16, .3, 1), M(SZIN.kek), 0, -9.8, 2);
    for (const s of [-1, 1]) { add(g, cylZ(.6, .6, 2, 16), M(SZIN.fem), s * 4.5, -8.2, 1); o.prop.push(prop(g, s * 4.5, -8.2, -.1, 1.4, 3)); }
    for (let i = -1; i <= 1; i += .4) o.spray.push([i * 7, -9.9, 2]);
    const lg = decal(g, 9.05, 0, -6, Math.PI / 2, 22); const lg2 = decal(g, -9.05, 0, -6, -Math.PI / 2, 22); lg.scale.y = lg2.scale.y = .7;
    o.gear = new THREE.Group(); g.add(o.gear); o.g = g; return o; },
  slag() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [0, .6, -1.2], len: 6, gearH: .45 };
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, -2.6), new THREE.Vector3(0, 0, -1), new THREE.Vector3(.3, .1, .6), new THREE.Vector3(-.2, -.05, 2.2)]);
    add(g, new THREE.TubeGeometry(curve, 24, .2, 8), M(SZIN.zold)); add(g, cylZ(.12, .26, .7, 16), M(SZIN.sarga), 0, 0, -2.9); add(g, cylZ(.22, .22, .4, 16), M(SZIN.kek), 0, 0, -2.4);
    add(g, cylZ(.35, .35, 1.6, 16), M(SZIN.piros), -.2, 0, 2.8); add(g, new THREE.ConeGeometry(.35, .7, 16).rotateX(-Math.PI / 2), M(SZIN.piros), -.2, 0, 1.75);
    for (let a = 0; a < 3; a++) { const f = add(g, box(.05, .7, .6), M(SZIN.sarga), -.2, 0, 3.4, 0, 0, a * 2.09); f.geometry = f.geometry.clone().translate(0, .5, 0); }
    const bu = add(g, new THREE.ConeGeometry(.3, 2.4, 16).rotateX(Math.PI / 2), M(0xffb040, { emissive: 0xff7a10, transparent: true, opacity: .9, depthWrite: false }), -.2, 0, 4.8); bu.castShadow = false; o.burner = bu;
    add(g, box(2.4, .06, .5), M(SZIN.sarga), 0, 0, .2); o.spray.push([0, 0, -3.3]); o.gear = new THREE.Group(); g.add(o.gear); o.g = g; return o; },
  zero() { const g = new THREE.Group(), o = { prop: [], rotor: [], flap: [], spray: [], eye: [0, 1.35, -3.4], len: 13, gearH: 1.6 };
    add(g, new THREE.ConeGeometry(.75, 3, 16).rotateX(-Math.PI / 2), M(SZIN.fekete), 0, .3, -6.4); add(g, cylZ(.8, .95, 5, 16), M(SZIN.fekete), 0, .35, -2.6); add(g, cylZ(.95, .3, 6, 16), M(SZIN.fekete), 0, .4, 2.9);
    add(g, new THREE.SphereGeometry(.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1, 2.4), M(0xe8b656, { emissive: 0x3a2a08 }), 0, .9, -3.3);
    add(g, wingGeo(13, 3, 1.2, 1.6, .22, .8), M(0xe8b656), 0, 0, 0.2); add(g, wingGeo(4, 1.2, .6, .4, .12, .2), M(0xe8b656), 0, .6, -5); add(g, box(13, .06, .2), M(SZIN.kek), 0, .08, 1.5);
    for (const s of [-1, 1]) { add(g, finGeo(1.8, 2, 1, 1, .12), M(SZIN.fekete), s * 6.5, .1, 1); const f = add(g, box(3.5, .08, .5), M(SZIN.fekete), s * 3.5, -.05, 1.4); o.flap.push(f); }
    add(g, cylZ(.4, .4, 1.2, 16), M(SZIN.fem), 0, .4, 5.9); o.prop.push(prop(g, 0, .4, 6.6, 1.3, 5, 0xe8b656)); o.prop[0].rotation.y = Math.PI;
    add(g, box(12, .07, .07), M(SZIN.kek), 0, -.3, 1); for (let i = -5; i <= 5; i += 1.25) o.spray.push([i, -.35, 1]);
    const t = document.createElement('canvas'); t.width = 256; t.height = 64; const x = t.getContext('2d'); x.fillStyle = '#15181c'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#e8b656'; x.font = '900 52px Inter, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ZERO', 128, 34);
    const tx = new THREE.CanvasTexture(t); tx.colorSpace = THREE.SRGBColorSpace; for (const s of [-1, 1]) { const d = new THREE.Mesh(new THREE.PlaneGeometry(2.4, .6), new THREE.MeshLambertMaterial({ map: tx })); d.position.set(s * .93, .35, -1.6); d.rotation.y = s * Math.PI / 2; g.add(d); }
    o.gear = triGear(g, -4.6, .6, 1.25, 1.6, .45); o.g = g; return o; },
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
