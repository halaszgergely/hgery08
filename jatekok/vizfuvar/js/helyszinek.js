/* Helyszínek: a miskolci HGWS telephely (iroda, garázs, kút és víztöltő, víztorony, ballonraklapok, benzinkút, cégtábla),
   benzinkutak a főutak mellett, a fuvarcél jelölője és a HGWS iroda. Minden a talajhoz igazítva, a domborzati csempék betöltésekor újraigazítva. */
import * as THREE from 'three';
import { M, FEST, KROM, UVEG, LAMPA, add, tube, rbox, lathe, logo, tabla, ballon, hull } from './modellkit.js?v=202611260010';
import { SZIN } from './config.js?v=202611260010';

export function createPlaces(scene, ground, D) { const root = new THREE.Group(); scene.add(root); const fix = [];
  const place = (o, x, z, off = 0) => { o.position.set(x, ground(x, z) + off, z); o.userData.fy = [x, z, off]; fix.push(o); root.add(o); return o; };
  // talajra simuló betonlap (rácsosan mintavételezve)
  const paved = [];
  function slab(cx, cz, w, d, rot, col, step = 6) { paved.push([cx, cz, w / 2, d / 2, Math.cos(rot), Math.sin(rot)]); const nx = Math.max(1, Math.ceil(w / step)), nz = Math.max(1, Math.ceil(d / step)), g = new THREE.PlaneGeometry(w, d, nx, nz).rotateX(-Math.PI / 2), p = g.attributes.position, c = Math.cos(rot), s = Math.sin(rot);
    const upd = () => { for (let i = 0; i < p.count; i++) { const lx = p.getX(i), lz = p.getZ(i), wx = cx + lx * c + lz * s, wz = cz - lx * s + lz * c; p.setY(i, ground(wx, wz) + .1); } p.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere(); };
    upd(); const m = new THREE.Mesh(g, M(col, { roughness: .9 })); m.position.set(cx, 0, cz); m.rotation.y = rot; m.receiveShadow = true; m.userData.upd = upd; root.add(m); fix.push(m); return m; }
  // ---- a telephely ----
  const T = D.telephely, dx = T.kapu[0] - T.x, dz = T.kapu[1] - T.z, rot = Math.atan2(dx, dz);   // a kapu felé néz (+Z helyi tengely)
  const base = new THREE.Group(); base.rotation.y = rot; place(base, T.x, T.z);
  slab(T.x, T.z, 70, 56, rot, 0x6b6c69); const toW = (lx, lz) => [T.x + lx * Math.cos(rot) + lz * Math.sin(rot), T.z - lx * Math.sin(rot) + lz * Math.cos(rot)];
  // bekötőút a kapuig
  { const [gx, gz] = toW(0, 28), L = Math.hypot(T.kapu[0] - gx, T.kapu[1] - gz); if (L > 2) slab((gx + T.kapu[0]) / 2, (gz + T.kapu[1]) / 2, 8, L + 6, Math.atan2(T.kapu[0] - gx, T.kapu[1] - gz), 0x5b5c5e, 4); }
  const wall = M(0xe8e1cf, { roughness: .8 }), roofM = M(0x6d6a66, { roughness: .7 }), steel = M(0x9aa3ad, { metalness: .6, roughness: .4 });
  // iroda (kétszintes) – a telephely hátsó részén
  add(base, rbox(18, 7, 10, .3), wall, -18, 3.5, -18); add(base, new THREE.BoxGeometry(18.4, .4, 10.4), roofM, -18, 7.2, -18);
  for (let i = 0; i < 6; i++) for (const y of [2, 5]) add(base, new THREE.BoxGeometry(1.6, 1.3, .1), UVEG(), -25.5 + i * 3, y, -12.96);
  tabla(base, 'HGWS', 9, 2.2, '#15181c', '#f2c230', -18, 8.6, -13.05, 0, .6); logo(base, -27.25, 4.2, -18, -Math.PI / 2, 4);
  // garázs (nagy kapuval)
  add(base, rbox(20, 7.5, 14, .2), M(0xd9d2bf, { roughness: .85 }), 14, 3.75, -16); add(base, new THREE.BoxGeometry(20.6, .5, 14.6), roofM, 14, 7.7, -16);
  for (const x of [8, 20]) add(base, new THREE.BoxGeometry(5.5, 5, .12), M(SZIN.zold, { roughness: .5, metalness: .3 }), x, 2.5, -8.94);
  tabla(base, 'GARÁZS', 6, 1.2, '#2f9e4f', '#ffffff', 14, 6.3, -8.9);
  // kút, szivattyúház, víztorony, töltőcsőr
  add(base, new THREE.CylinderGeometry(1.4, 1.5, 1, 20), M(0x8e8a82), 24, .5, 10); add(base, new THREE.CylinderGeometry(1.55, 1.55, .15, 20), KROM(), 24, 1.05, 10);
  add(base, rbox(3, 2.6, 3, .1), wall, 19.5, 1.3, 10); add(base, new THREE.BoxGeometry(3.2, .2, 3.2), roofM, 19.5, 2.7, 10);
  const tw = new THREE.Group(); tw.position.set(27, 0, -2); base.add(tw); for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) tube(tw, [x, 0, z], [x * .55, 13, z * .55], .14, steel);
  lathe(tw, [[0, 0], [0, 2.4], [.4, 2.6], [3.4, 2.7], [3.8, 2.4], [4.4, 1.2], [4.6, 0]], M(SZIN.kek, { roughness: .35, metalness: .3 }), 28, 0, 13, 0); logo(tw, 0, 15, 2.75, 0, 3.4);
  // ballontöltő állás és raklapok
  const toltes = new THREE.Group(); toltes.position.set(6, 0, 10); base.add(toltes); add(toltes, new THREE.BoxGeometry(6, 3.4, .2), steel, 0, 1.7, 2.5); add(toltes, new THREE.BoxGeometry(6.4, .2, 4), M(SZIN.sarga, { metalness: .3 }), 0, 3.5, 1);
  for (const x of [-2, 2]) tube(toltes, [x, 0, -.8], [x, 3.4, -.8], .08, steel); tabla(toltes, 'BALLONTÖLTŐ', 5.4, .8, '#2aa7d9', '#ffffff', 0, 3.1, 2.38, Math.PI);
  for (let p = 0; p < 4; p++) { const rp = new THREE.Group(); rp.position.set(-10 + p * 3.2, 0, 14); base.add(rp); add(rp, new THREE.BoxGeometry(1.2, .14, 1), M(0xb48a52, { roughness: .9 }), 0, .07, 0);
    for (let i = 0; i < 6; i++) { const b = ballon(rp); b.position.set(-.38 + (i % 3) * .38, .14 + Math.floor(i / 3) * .58, -.2 + (i % 2) * .4); } }
  // benzinkút a telephelyen
  add(base, new THREE.BoxGeometry(.8, 1.8, .5), M(SZIN.piros, { roughness: .4 }), -6, .9, 4); tabla(base, 'KEVERÉK', 1.6, .4, '#15181c', '#f2c230', -6, 2.1, 4.26, 0);
  // kerítés
  for (const [ax, az, bx, bz] of [[-35, -28, 35, -28], [-35, -28, -35, 28], [35, -28, 35, 28], [-35, 28, -6, 28], [6, 28, 35, 28]]) { const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 3);
    for (let i = 0; i <= n; i++) { const t = i / n; add(base, new THREE.BoxGeometry(.08, 1.8, .08), steel, ax + (bx - ax) * t, .9, az + (bz - az) * t); }
    const f = add(base, new THREE.BoxGeometry(Math.abs(bx - ax) + .05 || .05, 1.6, Math.abs(bz - az) + .05 || .05), M(0x6b7a6b, { transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false }), (ax + bx) / 2, .95, (az + bz) / 2); f.castShadow = false; }
  tabla(base, 'HGWS VÍZFUVAR – MISKOLCI TELEPHELY', 10, 1.1, '#2f9e4f', '#ffffff', 10, 2.6, 28.2, 0); for (const x of [5.2, 14.8]) tube(base, [x, 0, 28.2], [x, 2.1, 28.2], .08, steel);
  // ütközési alaprajzok (a járműfizika az OSM-épületekkel együtt kezeli)
  const rings = []; const rr = (tw2, lx, lz, w, d) => rings.push([[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([a, b]) => tw2(lx + a, lz + b)));
  for (const [lx, lz, w, d] of [[-18, -18, 18, 10], [14, -16, 20, 14], [19.5, 10, 3, 3], [24, 10, 3, 3], [27, -2, 3.6, 3.6], [-6, 4, .8, .5], [6, 12.5, 6.4, .5]]) rr(toW, lx, lz, w, d);
  // ---- benzinkutak ----
  for (const k of D.kutak || []) { const g = new THREE.Group(); g.rotation.y = k.rot; place(g, k.x, k.z); slab(k.x, k.z, 26, 22, k.rot, 0x5e5f61);
    for (const [x, z] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) add(g, new THREE.CylinderGeometry(.18, .18, 5, 10), M(0xe8e8e8), x, 2.5, z);
    add(g, rbox(11, .7, 11, .2), M(0xf3f1ea), 0, 5.2, 0); tabla(g, 'BENZIN · KEVERÉK', 8, .6, '#d9413a', '#ffffff', 0, 5.2, 5.52, 0, .4);
    for (const x of [-1.8, 1.8]) add(g, rbox(.7, 1.7, .5, .08), M(SZIN.piros), x, .85, 0); add(g, rbox(6, 3.4, 5, .2), M(0xe8e1cf), 0, 1.7, -9);
    const kw = (lx, lz) => [k.x + lx * Math.cos(k.rot) + lz * Math.sin(k.rot), k.z - lx * Math.sin(k.rot) + lz * Math.cos(k.rot)]; rr(kw, 0, -9, 6, 5); for (const x of [-1.8, 1.8]) rr(kw, x, 0, .7, .5); }
  // ---- HGWS iroda jelzése (az első fuvar célja) ----
  { const o = D.hgwsIroda, g = new THREE.Group(); place(g, o.px, o.pz); tabla(g, 'HGWS IRODA', 3.2, .8, '#f2c230', '#15181c', 0, 3.2, 0, Math.atan2(o.x - o.px, o.z - o.pz) + Math.PI, .3); tube(g, [0, 0, 0], [0, 2.8, 0], .06, steel); }
  // ---- fuvarcél jelölő: fénylő gyűrű és lebegő nyíl ----
  const mk = new THREE.Group(); mk.visible = false; root.add(mk);
  const ringM = new THREE.MeshBasicMaterial({ color: new THREE.Color(.4, 2.2, 2.8), transparent: true, opacity: .55, depthWrite: false, side: THREE.DoubleSide }), ring = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 1.6, 40, 1, true), ringM); ring.position.y = .8; mk.add(ring);
  const arr = new THREE.Mesh(new THREE.ConeGeometry(.9, 1.8, 4).rotateX(Math.PI), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.0, .3) })); arr.position.y = 6; mk.add(arr);
  // burkolt felület (telephely, bekötőút, benzinkút): a fizika aszfaltnak veszi, 10 cm-rel a talaj fölött
  function isPaved(x, z) { for (const [cx, cz, hw, hd, c, s2] of paved) { const dx = x - cx, dz = z - cz, lx = dx * c - dz * s2, lz = dx * s2 + dz * c; if (Math.abs(lx) <= hw && Math.abs(lz) <= hd) return true; } return false; }
  return { root, rings, isPaved, setMarker(x, z, r = 6) { if (x === null) { mk.visible = false; return; } mk.visible = true; mk.position.set(x, ground(x, z), z); ring.scale.set(r / 6, 1, r / 6); },
    update(t) { if (mk.visible) { arr.position.y = 6 + Math.sin(t * 3) * .5; arr.rotation.y = t * 2; ringM.opacity = .4 + Math.sin(t * 4) * .15; } },
    fixGround(bd) { for (const o of fix) { if (o.userData.upd) { o.userData.upd(); continue; } const [x, z, off] = o.userData.fy; if (x > bd[0] - 200 && x < bd[2] + 200 && z > bd[1] - 200 && z < bd[3] + 200) o.position.y = ground(x, z) + off; } if (mk.visible) mk.position.y = ground(mk.position.x, mk.position.z); },
    // a telephely helyi pontjai országos koordinátában
    toW, rot,
    pontok: { toltes: toW(6, 6), kut: toW(-6, 6), garazs: toW(14, -4), bemutato: toW(14, 3), start: toW(0, 18) } };
}
