/* ÓLOMTÉL – brutalista épületek kódból: nyers beton tömbök, zsaluzási sávok, acélvázak. Nincs kézzel modellezett elem. */
import * as THREE from 'three';

const BETON = 0x8d8b85, BETON2 = 0x74726d, BETON3 = 0x5d5c59, ACEL = 0x4b5057, ACEL2 = 0x363a40, ROZSDA = 0x7b4b35, HO = 0xe9eef2, PIROS = 0xa8372c, FEHER = 0xd9d6cc, SARGA = 0xc79a2e;
const FENY = 0xffb347, TUZ = 0xff6a1e, KEK = 0x59e6ff, UVEG = 0x1b232b;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _c = new THREE.Color();
const GEO = {}; const geo = (k, f) => GEO[k] || (GEO[k] = f().toNonIndexed());

export class Epito {
  constructor(seed = 1) { this.p = []; this.c = []; this.lp = []; this.lc = []; this.s = seed * 9301 + 49297; this.fust = []; this.lang = []; }
  r() { this.s = (this.s * 16807) % 2147483647; return this.s / 2147483647; }
  add(g, x, y, z, col, o = {}) {
    _e.set(o.rx || 0, o.ry || 0, o.rz || 0); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(o.sx || 1, o.sy || 1, o.sz || 1); _m.compose(_p, _q, _s);
    const a = g.attributes.position, P = o.lit ? this.lp : this.p, C = o.lit ? this.lc : this.c, j = o.lit ? 1 : 1 + (this.r() - .5) * (o.j ?? .07); _c.set(col);
    for (let i = 0; i < a.count; i++) { _p.fromBufferAttribute(a, i).applyMatrix4(_m); P.push(_p.x, _p.y, _p.z); C.push(_c.r * j, _c.g * j, _c.b * j); }
  }
  // doboz: x,z a közép, y az alja
  box(x, y, z, w, h, d, col, o = {}) { this.add(geo('b', () => new THREE.BoxGeometry(1, 1, 1)), x, y + h / 2, z, col, { ...o, sx: w, sy: h, sz: d }); }
  // betontömb zsaluzási sávokkal és hósapkával
  tomb(x, y, z, w, h, d, col = BETON, ho = true) { const n = Math.max(1, Math.round(h / .45)), sh = h / n; for (let i = 0; i < n; i++) this.box(x, y + i * sh, z, w - (i % 2 ? .02 : 0), sh, d - (i % 2 ? .02 : 0), col, { j: .09 }); if (ho) this.box(x, y + h, z, w * .96, .05, d * .96, HO, { j: .02 }); }
  cyl(x, y, z, r, h, col, o = {}) { const sg = o.seg || 8, k = 'c' + sg + (o.rt ?? 1); this.add(geo(k, () => new THREE.CylinderGeometry(o.rt ?? 1, 1, 1, sg)), x, y + h / 2, z, col, { ...o, sx: r, sy: h, sz: r }); }
  kupola(x, y, z, r, col, o = {}) { this.add(geo('k' + (o.fi || 0), () => new THREE.SphereGeometry(1, 10, 4, 0, o.fi || Math.PI * 2, 0, Math.PI / 2)), x, y, z, col, { ...o, sx: r, sy: o.h || r, sz: r }); }
  // vörös-fehér sávos kémény, a tetején füsttel
  kemeny(x, y, z, r, h, fust = 1) { const n = Math.max(3, Math.round(h / .7)); for (let i = 0; i < n; i++) this.cyl(x, y + i * h / n, z, r * (1 - i * .04), h / n, i >= n - 3 && (n - i) % 2 ? PIROS : i >= n - 3 ? FEHER : BETON2, { seg: 8 }); if (fust) this.fust.push([x, y + h, z, fust]); }
  // világító ablaksor egy fal mentén (ax: 'x' vagy 'z')
  ablak(x, y, z, hossz, ax, n, sz = .16, m = .2) { for (let i = 0; i < n; i++) { const t = (i + .5) / n - .5, ki = this.r() < .55; const px = ax === 'x' ? x + t * hossz : x, pz = ax === 'z' ? z + t * hossz : z; this.box(px, y, pz, ax === 'x' ? sz : .04, m, ax === 'z' ? sz : .04, ki ? FENY : UVEG, { lit: ki, j: 0 }); } }
  // acél rácsos állvány
  allvany(x, y, z, w, h, d, col = ACEL) { const t = .06; for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) this.box(x + sx * w / 2, y, z + sz * d / 2, t, h, t, col); const n = Math.max(1, Math.round(h / .8)); for (let i = 1; i <= n; i++) { const yy = y + i * h / n; this.box(x, yy, z - d / 2, w, t, t, col); this.box(x, yy, z + d / 2, w, t, t, col); this.box(x - w / 2, yy, z, t, t, d, col); this.box(x + w / 2, yy, z, t, t, d, col); } }
  cso(x1, y1, z1, x2, y2, z2, r, col) { const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1, l = Math.hypot(dx, dy, dz); if (l < .01) return; _p.set(dx, dy, dz).normalize(); _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _p); _e.setFromQuaternion(_q); this.add(geo('c61', () => new THREE.CylinderGeometry(1, 1, 1, 6)), (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2, col, { rx: _e.x, ry: _e.y, rz: _e.z, sx: r, sy: l, sz: r }); }
  kesz(matS, matL) {
    const G = new THREE.Group(), mk = (P, C, mat, sh) => { if (!P.length) return; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.castShadow = sh; m.receiveShadow = sh; G.add(m); return m; };
    G.userData.szilard = mk(this.p, this.c, matS, true); G.userData.fenyek = mk(this.lp, this.lc, matL, false); G.userData.fust = this.fust; G.userData.lang = this.lang; return G;
  }
}

/* Minden épület a [0..w]×[0..h] alapra épül (x kelet, z dél), a közép: (w/2, h/2). st: állapot (pl. reaktor fokozata). */
const TERV = {
  reaktor(g, w, h, st) {
    const cx = w / 2, cz = h / 2, lvl = st.lvl || 0;
    g.tomb(cx, 0, cz, 4.5, .7, 4.5, BETON3); g.tomb(cx - .9, .7, cz + .3, 2.4, 1.5, 3.4, BETON); g.ablak(cx - .9, 1.5, cz + 2.02, 2, 'x', 6); g.ablak(cx - 2.12, 1.5, cz + .3, 3, 'z', 8);
    g.tomb(cx + 1.3, .7, cz + 1.2, 1.6, 1.1, 1.6, BETON2);
    // hermetikus védőépület: a találat óta nyitott, a 2. fokozattól ép
    const dx = cx + .7, dz = cz - .8; g.cyl(dx, .7, dz, 1.55, 1.5, BETON, { seg: 12 }); g.cyl(dx, 2.2, dz, 1.62, .14, BETON3, { seg: 12 });
    if (lvl >= 2) { g.kupola(dx, 2.34, dz, 1.5, BETON2, { h: 1.1 }); g.box(dx, 3.4, dz, .3, .2, .3, BETON3); }
    else { g.kupola(dx, 2.34, dz, 1.5, BETON2, { h: 1.1, fi: Math.PI * 1.25, ry: 2.2 }); g.cyl(dx, 2.3, dz, 1.2, .1, KEK, { seg: 12, lit: 1 }); g.box(dx + .5, 2.34, dz + .9, .9, .25, .5, BETON3, { ry: .5, rz: .3 }); g.box(dx + 1.5, .7, dz + 1.3, .6, .3, .5, BETON3, { ry: .8 }); g.lang.push([dx, 2.6, dz, 'kek']); }
    if (lvl >= 3) { g.cyl(cx - 1.6, 2.2, cz - 1.3, .45, 1.2, ACEL, { seg: 8 }); g.kupola(cx - 1.6, 3.4, cz - 1.3, .45, ACEL); }
    if (lvl >= 5) { g.cyl(cx - .9, 2.2, cz + 1.2, 1, .9, BETON, { seg: 12 }); g.kupola(cx - .9, 3.1, cz + 1.2, 1, BETON2, { h: .7 }); }
    g.kemeny(cx + 1.9, .7, cz - 1.9, .16, 5.2, 0); g.box(cx + 1.9, 5.95, cz - 1.9, .08, .08, .08, 0xff3020, { lit: 1 });
    for (let i = 0; i < 4; i++) g.cso(cx - 2, 1 + i * .25, cz - 2, cx - .3, 1 + i * .25, cz - 2, .06, FEHER);
    if (st.jav) g.allvany(dx, .7, dz, 3.4, 3.2, 3.4, SARGA);
  },
  allomas(g, w, h) {
    g.tomb(w / 2, 0, h - .6, w - .2, .22, 1, BETON2); for (let i = 0; i < 6; i++) g.box(.6 + i * (w - 1.2) / 5, .22, h - .6, .14, .9, .14, BETON3); g.tomb(w / 2, 1.1, h - .6, w - .1, .16, 1.3, BETON);
    g.tomb(1.3, 0, 1, 2.2, 1.3, 1.5, BETON); g.ablak(1.3, .8, 1.77, 1.8, 'x', 5); g.tomb(3.8, 0, 1.1, 2.4, .9, 1.7, BETON2); g.tomb(5.2, 0, .9, .9, 2.2, .9, BETON); g.box(5.2, 2.25, .9, 1.2, .5, 1.2, BETON3); g.ablak(5.2, 2.4, 1.52, 1, 'x', 3, .22, .25);
    for (let i = 0; i < 3; i++) g.cyl(3.2 + i * .6, 0, 2, .22, .7, ROZSDA, { seg: 8 });
  },
  vizkivet(g, w, h) { g.tomb(.9, 0, 1, 1.4, 1, 1.5, BETON); g.ablak(.9, .6, 1.77, 1, 'x', 2); g.cso(.3, .5, .3, -.9, .1, .3, .14, ACEL); g.cso(.3, .5, .3, .3, 1, .3, .14, ACEL); g.cyl(1.55, 0, .4, .3, .8, ACEL, { seg: 8 }); g.box(.9, 1.05, 1, 1.2, .12, .3, BETON3); },
  turbina(g, w, h) {
    g.tomb(w / 2, 0, h / 2, w - .3, 1.5, h - .5, BETON); for (let i = 0; i < 5; i++) { g.box(.55 + i * .72, 1.55, h / 2, .5, .35, h - .7, BETON2, { rz: .35 }); }
    g.ablak(w / 2, .9, h - .23, w - .8, 'x', 9, .2, .5); for (let i = 0; i < 3; i++) g.cso(.9 + i * 1, 1.2, .2, .9 + i * 1, 1.2, -.25, .18, FEHER);
    g.tomb(w - .5, 0, .5, .8, 2.1, .8, BETON3); g.fust.push([w - .5, 2.2, .5, .6]);
  },
  kazan(g, w, h) { g.tomb(1.2, 0, 1.6, 2, 1.7, 2.2, BETON); g.ablak(1.2, 1, 2.72, 1.6, 'x', 4, .14, .5); g.tomb(2.5, 0, 2.2, .7, .8, 1.2, BETON2); g.kemeny(2.3, 0, .6, .26, 4.2); g.kemeny(1.2, 1.7, .9, .16, 1.6, .5); g.box(.2, .3, 1.6, .06, .5, .7, TUZ, { lit: 1 }); },
  hokozp(g, w, h) { g.tomb(1, 0, 1, 1.5, .9, 1.5, BETON2); for (let i = 0; i < 3; i++) { g.cso(.5 + i * .5, .9, .5, .5 + i * .5, 1.6, .5, .1, FEHER); g.cso(.5 + i * .5, 1.6, .5, .5 + i * .5, 1.6, 1.5, .1, FEHER); } g.box(1, .35, 1.77, 1, .2, .04, TUZ, { lit: 1 }); g.fust.push([1, 1.7, 1, .4]); },
  olajkut(g, w, h) {
    g.tomb(1, 0, 1, 1.8, .14, 1.8, BETON3, false); g.box(.9, .14, 1, .12, 1.2, .12, ACEL); g.box(1.2, .14, 1.25, .1, 1.25, .1, ACEL, { rz: .25 }); g.box(1.2, .14, .75, .1, 1.25, .1, ACEL, { rz: .25 });
    g.box(.9, 1.3, 1, 1.5, .12, .14, SARGA, { rz: -.18 }); g.box(.2, 1.05, 1, .3, .5, .2, SARGA); g.box(1.6, .14, 1, .5, .5, .5, ACEL2); g.cso(.2, .14, 1, .2, 1, 1, .03, ACEL2); g.cyl(.4, .14, .35, .25, .5, ROZSDA, { seg: 8 });
  },
  sotalan(g, w, h) { for (const z of [.6, 1.4]) { g.box(.5, 0, z, .2, .5, .5, BETON2); g.box(1.5, 0, z, .2, .5, .5, BETON2); g.cso(.15, .7, z, 1.85, .7, z, .28, FEHER); } g.cso(1, .9, .6, 1, 1.4, .6, .05, ACEL); g.cso(1, 1.4, .6, 1, 1.4, 1.4, .05, ACEL); g.cso(1, 1.4, 1.4, 1, .9, 1.4, .05, ACEL); },
  kemence(g, w, h) { g.tomb(1, 0, 1.6, 1.5, .3, 2.4, BETON3, false); g.box(1, .3, 1.7, 1.3, 1.4, 1.9, ROZSDA); for (let i = 0; i < 4; i++) g.box(1, .5 + i * .32, 2.66, 1.1, .05, .04, TUZ, { lit: 1 }); g.box(1, 1.7, 1.7, .9, .4, 1.3, ACEL2); g.kemeny(1, 2.1, 1.2, .2, 2.4, .7); g.lang.push([1, .6, 2.7, 'tuz']); },
  atm(g, w, h) {
    g.tomb(1.5, 0, 1.5, 2.6, .35, 2.6, BETON3, false); g.cyl(1.3, .35, 1.3, .55, 5.2, ACEL, { seg: 10 }); g.kupola(1.3, 5.55, 1.3, .55, ACEL, { h: .35 });
    for (let i = 0; i < 5; i++) { g.cyl(1.3, 1.1 + i * .95, 1.3, .78, .06, ACEL2, { seg: 10 }); }
    g.cso(1.3, 5.9, 1.3, 2.3, 5.9, 1.3, .08, FEHER); g.cso(2.3, 5.9, 1.3, 2.3, .6, 1.3, .08, FEHER);
    g.cyl(2.35, .35, 2.3, .28, 1.6, FEHER, { seg: 8 }); g.cyl(.5, .35, 2.4, .22, 2.4, ACEL, { seg: 8 }); g.allvany(1.3, .35, 2.2, .7, 2.6, .5); g.box(1.3, 5.95, 1.3, .08, .08, .08, 0xff3020, { lit: 1 });
  },
  vakuum(g, w, h) { g.tomb(1.5, 0, 1.5, 2.6, .35, 2.6, BETON3, false); g.cyl(1.4, .35, 1.4, .5, 1, ACEL, { seg: 10 }); g.cyl(1.4, 1.35, 1.4, .85, 2.2, ACEL, { seg: 10 }); g.cyl(1.4, 3.55, 1.4, .5, .9, ACEL, { seg: 10 }); g.kupola(1.4, 4.45, 1.4, .5, ACEL, { h: .3 }); g.cyl(1.4, 2.4, 1.4, 1, .06, ACEL2, { seg: 10 }); g.cso(1.4, 4.7, 1.4, 2.5, 4.7, 2.4, .1, FEHER); g.cso(2.5, 4.7, 2.4, 2.5, .5, 2.4, .1, FEHER); g.cyl(.5, .35, 2.4, .3, .9, FEHER, { seg: 8 }); },
  krakk(g, w, h) { g.tomb(1.5, 0, 2, 2.6, .35, 3.6, BETON3, false); g.allvany(1.5, .35, 1.6, 2, 4.4, 2.2); g.cyl(1.1, 1.6, 1.3, .5, 2.6, ACEL, { seg: 8 }); g.kupola(1.1, 4.2, 1.3, .5, ACEL, { h: .4 }); g.cyl(1.1, .9, 1.3, .2, .8, ACEL, { seg: 6 }); g.cyl(2, 1, 2, .62, 1.9, ROZSDA, { seg: 8 }); g.kupola(2, 2.9, 2, .62, ROZSDA, { h: .4 }); g.cso(2, 3.2, 2, 2, 4.9, 2, .1, ACEL2); g.cso(1.1, 4.5, 1.3, 1.1, 5.2, 1.3, .08, FEHER); g.tomb(1.5, .35, 3.4, 1.8, .9, .8, BETON); g.kemeny(2.5, .35, 3.4, .14, 3.6, .5); },
  kenment(g, w, h) { g.tomb(1, 0, 1.5, 1.7, .3, 2.7, BETON3, false); g.cyl(.6, .3, .7, .3, 3.2, ACEL, { seg: 8 }); g.kupola(.6, 3.5, .7, .3, ACEL); g.cyl(1.4, .3, .7, .24, 2.4, ACEL, { seg: 8 }); g.kupola(1.4, 2.7, .7, .24, ACEL); g.tomb(1, .3, 2.1, 1.4, .8, 1.1, BETON); g.cyl(1, 1.1, 2.1, .3, .5, SARGA, { seg: 8 }); g.cso(.6, 2, .7, 1.4, 2, .7, .05, FEHER); },
  faklya(g) { g.box(.5, 0, .5, .5, .15, .5, BETON3); g.cyl(.5, .15, .5, .07, 4.6, ACEL2, { seg: 6 }); g.allvany(.5, .15, .5, .3, 2.2, .3); g.lang.push([.5, 4.85, .5, 'faklya']); },
  tartaly(g) { g.cyl(1, 0, 1, .86, .1, BETON3, { seg: 14 }); g.cyl(1, .1, 1, .8, .95, FEHER, { seg: 14 }); g.cyl(1, 1.05, 1, .8, .1, HO, { seg: 14, rt: .2 }); g.cyl(1, .55, 1, .82, .05, ACEL2, { seg: 14 }); g.cso(1.82, .1, 1, 1.82, 1.1, 1, .03, ACEL2); },
  banya(g, w, h, st) {
    g.tomb(1, 0, 2, 1.7, 1.2, 1.6, BETON); g.ablak(1, .7, 2.82, 1.3, 'x', 3); g.allvany(2.2, 0, 1, .9, 3.2, .9, ACEL2); g.cyl(2.2, 3.1, 1, .45, .1, ACEL, { seg: 10, rx: Math.PI / 2 }); g.box(1.5, 0, 1, .1, 3.4, .1, ACEL2, { rz: -.4 }); g.box(2.2, 3.35, 1, 1.1, .08, 1.1, BETON3);
    g.box(1.6, 1, .5, 2.2, .3, .4, BETON2, { rz: .25 }); g.cyl(.5, 0, .6, .5, .5, st.szin, { seg: 7, rt: .1 }); g.cyl(2.5, 0, 2.4, .4, .4, st.szin, { seg: 7, rt: .1 });
  },
  meszbany(g, w, h) { for (let i = 0; i < 3; i++) g.box(.6 + i * .25, 0, .5, 1 - i * .3, .35 * (i + 1), .8, 0xc8c4b4, { j: .1 }); g.tomb(2.2, 0, 1.2, 1.2, 1.3, 1.2, BETON); g.box(1.5, .8, 1.1, 1.6, .25, .35, BETON2, { rz: -.3 }); g.cyl(2.4, 0, .35, .35, .4, 0xc8c4b4, { seg: 7, rt: .1 }); },
  depo(g, w, h) { g.box(w / 2, 0, .1, w - .2, .9, .14, BETON); g.box(.1, 0, h / 2, .14, .9, h - .2, BETON); g.box(w - .1, 0, h / 2, .14, .9, h - .2, BETON); g.box(w / 2, 0, h / 2, .14, .7, h - .3, BETON2); g.cyl(.8, 0, 1, .55, .6, 0x2a2a2c, { seg: 7, rt: .1 }); g.cyl(2.2, 0, 1, .55, .5, 0x6a5a50, { seg: 7, rt: .1 }); },
  kokszolo(g, w, h) { g.tomb(1.7, 0, 1, 3, 1.2, 1.3, BETON3); for (let i = 0; i < 9; i++) g.box(.45 + i * .31, .2, 1.67, .12, .8, .04, i % 3 === 1 ? TUZ : ACEL2, { lit: i % 3 === 1 }); g.box(1.7, 1.2, 1, 3.1, .12, .5, ACEL2); g.tomb(3.6, 0, .5, .6, 2.4, .6, BETON); g.fust.push([3.6, 2.5, .5, 1.2]); g.kemeny(.3, 0, .4, .2, 4.4); g.lang.push([1.7, .6, 1.72, 'tuz']); },
  koho(g, w, h) {
    g.tomb(2, 0, 2, 3.7, .4, 3.7, BETON3, false); g.cyl(1.6, .4, 1.8, .8, 1.2, ROZSDA, { seg: 10 }); g.cyl(1.6, 1.6, 1.8, .95, 1.6, ROZSDA, { seg: 10, rt: .6 }); g.cyl(1.6, 3.2, 1.8, .57, 1.2, ACEL2, { seg: 10 }); g.allvany(1.6, .4, 1.8, 2, 4.4, 2); g.box(1.6, 4.85, 1.8, 1.3, .1, 1.3, ACEL);
    g.box(2.9, 2.2, 1.8, 3, .22, .3, ACEL2, { rz: 1.02 }); for (let i = 0; i < 3; i++) { g.cyl(3.4, .4, .7 + i * 1.05, .38, 2.6, BETON, { seg: 8 }); g.kupola(3.4, 3, .7 + i * 1.05, .38, BETON2); }
    g.kemeny(.5, .4, 3.4, .22, 5); g.cso(1.6, 4.9, 1.8, .5, 4.9, 3.4, .12, ACEL2); g.box(1.6, .5, 2.75, .7, .12, .3, TUZ, { lit: 1 }); g.lang.push([1.6, .7, 2.9, 'tuz']);
  },
  konverter(g, w, h) { g.tomb(1.5, 0, 1.7, 2.6, 2, 2.2, BETON); g.tomb(1.5, 2, 1.4, 1.4, 1.1, 1.4, BETON2); g.ablak(1.5, 1.2, 2.82, 2.2, 'x', 3, .5, .25); g.box(.9, .2, 2.82, .6, .8, .04, TUZ, { lit: 1 }); g.kemeny(2.5, 0, .35, .2, 4.2, 1); g.cso(1.5, 3.1, 1.4, 2.5, 3.6, .35, .1, ACEL2); g.lang.push([.9, .6, 2.9, 'tuz']); },
  hengermu(g, w, h) { g.tomb(w / 2, 0, 1, w - .3, 1.1, 1.6, BETON); g.box(w / 2, 1.15, 1, w - .9, .4, .7, BETON2); g.ablak(w / 2, 1.3, 1.36, w - 1.2, 'x', 10, .28, .16); g.ablak(w / 2, .6, 1.82, w - .8, 'x', 7, .3, .2); for (let i = 0; i < 4; i++) g.box(.6 + i * 1.25, 0, 1.9, .14, 1.2, .14, BETON3); g.fust.push([w - .6, 1.6, .6, .5]); },
  betonuz(g) { g.cyl(.6, .5, .6, .42, 1.8, BETON, { seg: 8 }); g.cyl(1.4, .5, .6, .42, 1.8, BETON, { seg: 8 }); g.allvany(1, 0, .6, 1.5, .5, .7); g.tomb(1, 0, 1.5, 1.5, .8, .7, BETON2); g.box(1, 1.3, 1.1, .3, .3, 1.2, ACEL2, { rx: -.5 }); },
  gepmuh(g, w, h) { g.tomb(w / 2, 0, 1, w - .3, 1, 1.6, BETON); for (let i = 0; i < 4; i++) g.box(.6 + i * .62, 1.05, 1, .45, .3, 1.5, BETON2, { rz: .4 }); g.ablak(w / 2, .55, 1.82, w - .8, 'x', 6, .25, .3); g.cyl(w - .4, 0, .3, .12, 2, ACEL2, { seg: 6 }); },
  szallo(g, w, h, st) { const em = 4; g.tomb(w / 2, 0, h / 2, w - .4, em * .5 + .1, h - .7, st.panel ? 0x9a9488 : BETON); for (let e = 0; e < em; e++) { g.ablak(w / 2, .28 + e * .5, h / 2 + (h - .7) / 2 + .01, w - .7, 'x', 8, .13, .2); g.ablak(w / 2 - (w - .4) / 2 - .01, .28 + e * .5, h / 2, h - 1, 'z', 3, .13, .2); } g.box(w / 2, em * .5 + .15, h / 2 - .2, .5, .3, .4, BETON3); g.box(.9, 0, h - .25, .5, .45, .3, BETON2); },
  rendelo(g) { g.tomb(1, 0, 1, 1.6, .9, 1.5, FEHER); g.ablak(1, .5, 1.77, 1.3, 'x', 4); g.box(1, 1, 1, .5, .14, .14, PIROS, { lit: 1 }); g.box(1, 1, 1, .14, .14, .5, PIROS, { lit: 1 }); g.box(1, 0, 1.9, .9, .08, .3, BETON3); },
  kultur(g, w, h) { for (let i = 0; i < 4; i++) g.box(.5 + i * .67, 0, 1.65, .16, 1, .16, BETON3); g.tomb(w / 2, 1, 1.1, w - .3, .8, 1.6, BETON); g.tomb(w / 2, 0, .8, w - .9, 1, 1, BETON2, false); g.ablak(w / 2, 1.4, 1.92, w - .8, 'x', 7, .22, .3); g.box(w / 2, 1.85, .5, .9, .5, .5, BETON3); },
  kutato(g, w, h) { g.tomb(w / 2, 0, 1, w - .4, 1.6, 1.4, BETON); for (let e = 0; e < 3; e++) g.ablak(w / 2, .35 + e * .5, 1.72, w - .7, 'x', 9, .2, .14); g.tomb(.6, 1.6, .8, .7, .5, .7, BETON2); g.cso(2.3, 1.6, .7, 2.3, 3, .7, .03, ACEL2); g.box(2.3, 3, .7, .08, .08, .08, 0xff3020, { lit: 1 }); g.cyl(1.6, 1.65, .8, .3, .1, ACEL, { seg: 8, rx: .5 }); },
  uveghaz(g, w, h) { g.tomb(w / 2, 0, 1, w - .2, .25, 1.7, BETON3, false); g.box(w / 2, .25, 1, w - .4, .6, 1.4, 0x9fe8c8, { lit: 1 }); for (let i = 0; i < 6; i++) g.box(.3 + i * (w - .6) / 5, .25, 1, .06, .7, 1.5, ACEL); g.box(w / 2, .85, 1, w - .3, .05, .08, ACEL); g.cso(.2, .2, .2, w - .2, .2, .2, .06, FEHER); }
};
const BANYASZIN = { szenbany: 0x1c1c1e, ercbany: 0x8a4630 };

export function epuletGeo(t, w, h, st, matS, matL, seed) {
  const g = new Epito(seed); const f = TERV[t] || (BANYASZIN[t] ? TERV.banya : null);
  if (f) f(g, w, h, { ...st, szin: BANYASZIN[t] }); else g.tomb(w / 2, 0, h / 2, w - .3, 1, h - .3);
  return g.kesz(matS, matL);
}
// épülő egység: alaplemez és sárga állványzat, a kész rész arányában emelkedik
export function allvanyGeo(w, h, ep, matS, matL) { const g = new Epito(7); g.box(w / 2, 0, h / 2, w - .2, .12, h - .2, BETON3); g.allvany(w / 2, .12, h / 2, w - .5, .5 + ep * 1.6, h - .5, SARGA); g.tomb(w / 2, .12, h / 2, w - .9, .1 + ep * 1.2, h - .9, BETON2, false); return g.kesz(matS, matL); }
export const SZIN = { BETON, BETON2, BETON3, ACEL, ACEL2, HO, FENY, TUZ, KEK };
