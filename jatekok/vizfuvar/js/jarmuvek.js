/* Ideiglenes, kódból épített járműmodellek (a valódi glTF-modellek helyére, amíg nincsenek beszerezve – lásd assets/manifest.json).
   Közös felület: { g, kerek[], kormany, szem, kulso, ballonHely[], ballonok[], fenyek{elso, hatso, fek, index[]}, lovas?, sal? }.
   A modell origója a talajon, a jármű közepén; orr −Z. */
import * as THREE from 'three';
import { M, FEST, KROM, GUMI, UVEG, LAMPA, hull, lathe, add, tube, rbox, kerek, logo, ballon } from './modellkit.js?v=202611271009';
import { SZIN } from './config.js?v=202611271009';

/* ---- motoros figura: bukósisak, kabát, sál ---- */
function lovas(par, kabat = SZIN.zold, sisak = SZIN.sarga) { const g = new THREE.Group(); par.add(g); const bor = M(0xe0b08a), nadrag = M(0x2b3440), cipo = M(0x1d1d1f), kab = M(kabat, { roughness: .7 });
  hull(g, [[-.13, .05, .05, .05, 1.08], [-.1, .17, .2, .14, 1.12, 2.4], [.08, .19, .26, .16, 1.12, 2.6], [.13, .05, .05, .05, 1.1]], kab, { seg: 16, sub: 3 });   // törzs (ülő, kissé előredőlve)
  const torzs = g.children[g.children.length - 1]; torzs.rotation.x = -.28; torzs.position.set(0, .0, .12);
  lathe(g, [[0, 0], [.02, .07], [.12, .1], [.2, .095], [.24, .05], [.25, 0]], M(sisak, { roughness: .25, metalness: .1 }), 18, 0, 1.47, -.02);   // sisak
  add(g, new THREE.SphereGeometry(.085, 14, 10), bor, 0, 1.52, -.06); add(g, new THREE.BoxGeometry(.17, .05, .02), M(0x10171c, { roughness: .1 }), 0, 1.55, -.13);   // arc és szemüveg
  for (const s of [-1, 1]) { tube(g, [s * .17, 1.33, .02], [s * .24, 1.12, -.2], .045, kab); tube(g, [s * .24, 1.12, -.2], [s * .3, 1.03, -.36], .04, kab); add(g, new THREE.SphereGeometry(.04, 8, 6), M(0x2a2a2a), s * .3, 1.02, -.38);
    tube(g, [s * .1, .84, .2], [s * .14, .7, -.12], .065, nadrag); tube(g, [s * .14, .7, -.12], [s * .16, .38, -.08], .055, nadrag); add(g, rbox(.08, .07, .2, .03), cipo, s * .16, .34, -.12); }
  // sál: szalag, a menetszél lobogtatja
  const n = 8, sg = new THREE.PlaneGeometry(.09, .5, 1, n).translate(0, -.25, 0).rotateX(-Math.PI / 2 + .2), sal = new THREE.Mesh(sg, M(0xd9413a, { side: THREE.DoubleSide, roughness: .8 })); sal.position.set(.05, 1.38, .1); g.add(sal);
  sal.userData.base = Float32Array.from(sg.attributes.position.array); return { g, sal }; }

/* ---- Babettó: lépcsős vázas kétütemű moped, nagy műanyag burkolat ---- */
function babetto(sz) { const g = new THREE.Group(), f = FEST(sz[1]), f2 = FEST(sz[2]), vaz = M(0x2a2e33, { roughness: .4, metalness: .5 }), o = { g, kerek: [], fenyek: { elso: [], hatso: [], fek: [], index: [] }, ballonHely: [[0, .92, .66, Math.PI / 2]], ballonok: [] };
  for (const [z, r] of [[-.53, .27], [.53, .27]]) { const k = kerek(g, r, .065, KROM(), 18); k.position.set(0, r, z); o.kerek.push(k); }
  const villa = new THREE.Group(); villa.position.set(0, .86, -.4); g.add(villa); o.kormany = villa;
  for (const s of [-1, 1]) tube(villa, [s * .06, 0, 0], [s * .06, -.6, -.14], .018, KROM());
  tube(villa, [-.31, .18, .04], [.31, .18, .04], .014, KROM()); tube(villa, [0, 0, 0], [0, .18, .04], .022, KROM()); for (const s of [-1, 1]) add(villa, new THREE.CylinderGeometry(.022, .022, .11, 10).rotateZ(Math.PI / 2), GUMI(), s * .33, .18, .04);
  hull(villa, [[-.13, .02, .02, .02, .05], [-.11, .08, .07, .07, .05], [.02, .08, .07, .07, .05], [.04, .02, .02, .02, .05]], f2, { seg: 16, sub: 2 });   // lámpaház
  const el = add(villa, new THREE.CircleGeometry(.055, 16), LAMPA(0xfff4d6, 0), 0, .05, -.131, 0, Math.PI, 0); o.fenyek.elso.push(el);
  add(villa, new THREE.BoxGeometry(.06, .03, .045), M(0x111111), .1, .2, .0);   // kis sebességmérő
  hull(villa, [[-.3, .07, .03, .0, -.33], [-.15, .075, .035, .0, -.42], [.05, .07, .03, .0, -.47]], f, { seg: 12, sub: 2 }).rotation.x = .25;   // első sárvédő
  // váz és burkolat
  tube(g, [0, .86, -.4], [0, .42, -.12], .03, vaz); tube(g, [0, .42, -.12], [0, .38, .2], .03, vaz); tube(g, [0, .38, .2], [0, .76, .38], .028, vaz);
  hull(g, [[-.32, .05, .05, .05, .62], [-.2, .12, .16, .18, .58, 2.4], [.05, .15, .2, .2, .55, 2.6], [.32, .16, .2, .16, .62, 2.4], [.55, .08, .1, .06, .7]], f, { seg: 20 });
  hull(g, [[-.1, .1, .06, .06, .3], [.15, .12, .1, .08, .3, 3], [.3, .08, .06, .05, .32]], M(0x7c8288, { metalness: .6, roughness: .4 }), { seg: 14, sub: 2 });   // motor
  tube(g, [.08, .26, .1], [.1, .3, .55], .025, KROM()); add(g, new THREE.CylinderGeometry(.035, .03, .2, 10).rotateX(Math.PI / 2), KROM(), .1, .3, .6);
  add(g, rbox(.2, .07, .4, .03), M(0x1c1c1e, { roughness: .65 }), 0, .78, .26);   // ülés
  // csomagtartó
  for (const s of [-1, 1]) { tube(g, [s * .09, .8, .45], [s * .09, .8, .82], .012, KROM()); tube(g, [s * .09, .8, .8], [s * .05, .3, .53], .012, KROM()); }
  for (const z of [.5, .65, .8]) tube(g, [-.09, .8, z], [.09, .8, z], .01, KROM());
  hull(g, [[.25, .07, .04, .0, .5], [.5, .075, .04, .0, .62], [.78, .06, .03, .0, .56]], f, { seg: 12, sub: 2 });   // hátsó sárvédő
  const hl = add(g, new THREE.BoxGeometry(.07, .04, .02), LAMPA(0xd01010, .2), 0, .74, .84); o.fenyek.hatso.push(hl); o.fenyek.fek.push(hl);
  logo(g, .162, .6, .1, Math.PI / 2, .26); logo(g, -.162, .6, .1, -Math.PI / 2, .26);
  const L = lovas(g); o.lovas = L.g; o.sal = L.sal;
  o.szem = [0, 1.62, -.02]; o.kulso = { tav: 4.2, mag: 1.7 }; return o; }

/* ---- Rigó-13: hagyományosabb vázas moped, tank a váz felett, oldalkosár a második ballonnak ---- */
function rigo(sz) { const o = babetto(sz), g = o.g, f = FEST(sz[1]), fon = M(0x8a6a3c, { roughness: .9 });
  hull(g, [[-.3, .03, .03, .03, .78], [-.22, .1, .09, .06, .8, 2.4], [-.02, .1, .08, .06, .8, 2.4], [.04, .03, .03, .03, .78]], f, { seg: 16, sub: 2 });   // üzemanyagtank
  // oldalkosár a jobb oldalon, a csomagtartóhoz rögzítve
  const kos = new THREE.Group(); kos.position.set(.3, .58, .55); g.add(kos);
  add(kos, rbox(.3, .26, .36, .04), fon, 0, .02, 0); for (const s of [-1, 1]) tube(g, [.1, .78, .55 + s * .12], [.18, .7, .55 + s * .12], .012, KROM());
  tube(g, [.1, .36, .5], [.2, .48, .52], .012, KROM());
  o.ballonHely.push([.3, .45, .55, 0]);
  o.kulso = { tav: 4.3, mag: 1.7 }; return o; }

/* ---- Trabó 601: kétütemű kisautó, ballonok a hátsó ülésen és a csomagtartóban ---- */
function trabo(sz) { const g = new THREE.Group(), f = FEST(sz[1]), tet = FEST(sz[2]), fek = M(0x1a1b1d, { roughness: .6 }), o = { g, kerek: [], fenyek: { elso: [], hatso: [], fek: [], index: [] }, ballonHely: [], ballonok: [] };
  f.side = THREE.DoubleSide;
  // alsó karosszéria (övvonalig): lekerekített „doboz”, előre lejtő motorháztető
  hull(g, [[-1.78, .66, .2, .28, .56, 3.6], [-1.72, .73, .27, .36, .56, 4.4], [-1.2, .75, .31, .37, .57, 5], [-.62, .75, .34, .39, .56, 5.2], [.3, .75, .34, .4, .54, 5.4], [1.35, .75, .32, .37, .55, 5], [1.73, .72, .3, .33, .55, 4.4], [1.78, .64, .26, .27, .55, 3.6]], f, { seg: 36, sub: 4 });
  // utastér üvegezése, tető, oszlopok
  hull(g, [[-.66, .72, .015, .015, .9, 6], [-.22, .69, .25, .25, 1.15, 7], [.66, .68, .26, .26, 1.15, 7], [1.15, .7, .015, .015, .9, 6]], UVEG(), { seg: 28, sub: 3 });
  const roof = hull(g, [[-.24, .66, .025, .025, 1.415, 8], [-.18, .69, .03, .03, 1.42, 8], [.62, .68, .03, .03, 1.42, 8], [.7, .65, .025, .025, 1.41, 8]], tet, { seg: 28, sub: 2 }); roof.material.side = THREE.DoubleSide;
  for (const s of [-1, 1]) { tube(g, [s * .71, .9, -.64], [s * .68, 1.41, -.22], .028, tet); tube(g, [s * .68, 1.41, .66], [s * .7, .9, 1.13], .045, tet); tube(g, [s * .705, .9, .2], [s * .69, 1.41, .2], .03, tet);
    add(g, new THREE.CircleGeometry(.34, 20, 0, Math.PI), fek, s * .752, .28, -1.0, 0, s * Math.PI / 2, 0); add(g, new THREE.CircleGeometry(.34, 20, 0, Math.PI), fek, s * .752, .28, 1.02, 0, s * Math.PI / 2, 0);
    add(g, new THREE.BoxGeometry(.01, .015, 1.6), KROM(), s * .756, .74, .1);   // díszléc
    add(g, new THREE.BoxGeometry(.006, .32, .012), fek, s * .754, .62, -.66); add(g, new THREE.BoxGeometry(.006, .32, .012), fek, s * .754, .62, .45);   // ajtóvonal
    add(g, rbox(.03, .07, .1, .012), fek, s * .77, .95, -.62); add(g, new THREE.CircleGeometry(.045, 12), M(0xbfd3df, { metalness: .9, roughness: .05 }), s * .77, .95, -.565);   // tükör
  }
  // orr: hűtőrács-panel, kerek fényszórók, lökhárítók; far: lámpák
  add(g, rbox(1.12, .2, .04, .02), M(0x2a2c2f, { roughness: .5 }), 0, .63, -1.775);
  for (const s of [-1, 1]) { add(g, new THREE.CylinderGeometry(.09, .09, .03, 20).rotateX(Math.PI / 2), KROM(), s * .55, .63, -1.78); const h = add(g, new THREE.CircleGeometry(.075, 20), LAMPA(0xfff7e2, 0), s * .55, .63, -1.797, 0, Math.PI, 0); o.fenyek.elso.push(h);
    const ix = add(g, new THREE.BoxGeometry(.1, .05, .02), LAMPA(0xffa020, 0), s * .6, .45, -1.79); o.fenyek.index.push(ix); ix.userData.s = s;
    const t = add(g, new THREE.BoxGeometry(.16, .12, .03), LAMPA(0xb01010, .15), s * .55, .66, 1.78); o.fenyek.hatso.push(t); o.fenyek.fek.push(t);
    const ix2 = add(g, new THREE.BoxGeometry(.06, .06, .03), LAMPA(0xffa020, 0), s * .66, .66, 1.78); o.fenyek.index.push(ix2); ix2.userData.s = s; }
  add(g, rbox(1.5, .09, .1, .03), KROM(), 0, .36, -1.82); add(g, rbox(1.5, .09, .1, .03), KROM(), 0, .36, 1.82);
  add(g, new THREE.BoxGeometry(.32, .1, .01), M(0xf3f1ea), 0, .4, 1.875);   // rendszámtábla
  add(g, new THREE.CylinderGeometry(.022, .022, .2, 8).rotateX(Math.PI / 2), KROM(), .35, .2, 1.85);   // kipufogó
  logo(g, .757, .66, .2, Math.PI / 2, .7); logo(g, -.757, .66, .2, -Math.PI / 2, .7);
  // belső: műszerfal, kormány, ülések
  const muf = M(0x2e2a26, { roughness: .7 }); add(g, rbox(1.36, .14, .34, .04), muf, 0, .93, -.5); add(g, rbox(1.3, .06, .2, .02), M(0x3b3631, { roughness: .8 }), 0, 1.0, -.58);
  const kor = new THREE.Group(); kor.position.set(-.34, 1.02, -.34); kor.rotation.x = -.55; g.add(kor); add(kor, new THREE.TorusGeometry(.18, .016, 8, 28), M(0x1c1a18, { roughness: .5 })); tube(kor, [0, 0, 0], [.17, 0, 0], .012, M(0x1c1a18)); tube(kor, [0, 0, 0], [-.17, 0, 0], .012, M(0x1c1a18)); o.kormany = kor;
  const ules = M(0x6b5a48, { roughness: .9 }); for (const s of [-1, 1]) { add(g, rbox(.44, .12, .46, .05), ules, s * .33, .5, .02); add(g, rbox(.44, .52, .1, .05), ules, s * .33, .8, .28).rotation.x = -.18; }
  add(g, rbox(1.2, .12, .44, .05), ules, 0, .48, .78); add(g, rbox(1.2, .48, .1, .05), ules, 0, .78, 1.02).rotation.x = -.15;
  // ballonhelyek: hátsó ülés (8) és csomagtartó (4)
  for (const z of [.66, .9]) for (const x of [-.45, -.15, .15, .45]) o.ballonHely.push([x, .54, z, 0]);
  for (const x of [-.42, -.14, .14, .42]) o.ballonHely.push([x, .2, 1.42, 0]);
  for (const [x, z] of [[-.69, -1.0], [.69, -1.0], [-.69, 1.02], [.69, 1.02]]) { const k = kerek(g, .28, .145, M(0xc9ccd0, { metalness: .8, roughness: .3 })); k.position.set(x, .28, z); o.kerek.push(k); }
  o.szem = [-.34, 1.2, .05]; o.kulso = { tav: 7.2, mag: 2.6 }; return o; }

const B = { babetto, rigo, trabo };
export function epitJarmu(id, szin) { const o = B[id](szin); o.g.traverse(m => { if (m.isMesh) m.receiveShadow = !m.material.transparent; });
  for (const h of o.ballonHely) { const b = ballon(o.g); b.position.set(h[0], h[1], h[2]); b.rotation.x = h[3]; b.visible = false; o.ballonok.push(b); }
  o.g.userData.jarmu = o; return o; }
// a menetszél lobogtatja a sálat
export function salAnim(sal, t, v) { if (!sal) return; const p = sal.geometry.attributes.position, b = sal.userData.base, k = Math.min(1, v / 8);
  for (let i = 0; i < p.count; i++) { const y = b[i * 3 + 1], z = b[i * 3 + 2], d = Math.max(0, z) / .5; p.setY(i, y + d * (.3 * k) - (1 - k) * d * .35 * 0 + Math.sin(t * 14 - d * 6) * .04 * d * k); p.setX(i, b[i * 3] + Math.sin(t * 11 - d * 5) * .05 * d * k); }
  p.needsUpdate = true; }
