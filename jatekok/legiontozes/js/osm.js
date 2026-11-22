/* OpenStreetMap-réteg a Holtváros vármegyei térképeiből (jatekok/holtvaros/terkep, © OpenStreetMap-közreműködők, ODbL):
   - <megye>.bin: a teljes úthálózat 2048 m-es csempékben → útszalagok a domborzatra fektetve (osztály szerinti szélesség, hidak, alagutak kihagyva),
     lakott utak mentén éjszaka utcai lámpák;
   - <megye>.haz: minden épület alaprajza és magassága → kihúzott épületek (kis házaknál nyeregtető), ablakos falak, éjjel világító ablakok;
   - <megye>.json: vasútvonalak (sín + ágyazat), tavak és folyók pontos vízfelülete.
   A megyei helyi koordinátákat a Mozdonyvezető tájadataiban lévő táblázat (taj.json m) alakítja országossá: X = ax + x·sx, Z = ay + y.
   A megyék határán kettőzés elkerülése: minden elem csak annál a megyénél jelenik meg, amelyiknek a körvonalán belül van a közepe (256 m-es maszk).
   A réteg a terep közeli (2 km-es) csonkjaihoz épül, időkerettel, és csak ha az alatta lévő domborzati csempe már betöltődött. */
import * as THREE from 'three';
import { ground, megyek, onTile, tileReady, inAirport } from './geo.js?v=202611221400';
import { SU, withWorld } from './kozos.js?v=202611221400';
import { NEVEZETES, P } from './config.js?v=202611221400';

const BASE = '../holtvaros/terkep/', T = 2048, LEAF = 2000, MASK = 256;
const ROADW = [5.5, 7, 9, 12, 16, 24], ROADC = [[.4, .4, .39], [.33, .33, .33], [.31, .31, .32], [.29, .29, .3], [.27, .27, .28], [.25, .25, .27]];
const WALL = [0xe9e2d2, 0xd8cfbd, 0xf1ecde, 0xcfc6b8, 0xe2d6bf, 0xbfc3c6, 0xd9c4a4, 0xc9b8a0], ROOF = [0xa4523a, 0x8f4433, 0xb3643f, 0x7b3b2c, 0x6d6a66, 0x8a5a44], FLAT = [0x8a8984, 0x77736d, 0x9b9890];
const LC = new Map(), lin = c => { let r = LC.get(c); if (!r) LC.set(c, r = c.map(v => Math.pow(v, 2.2))); return r; };   // sRGB → lineáris
const LANDMARKS = [NEVEZETES.parlament, NEVEZETES.diosgyor].map(([lo, la]) => P(lo, la)), PAD = P(NEVEZETES.raketa[0], NEVEZETES.raketa[1]);

export function createOSM(scene, opt = {}) {
  const ver = opt.ver || '', root = new THREE.Group(); scene.add(root);
  const C = new Map(), roadOv = new Map(), bldOv = new Map(), waterKeys = new Set(); let roadR = opt.roadR || 4500, bldR = opt.bldR || 3200, night = false, frame = 0;
  // anyagok
  // logaritmikus mélységnél a polygonOffset hatástalan: a csúcsokat a távolsággal arányosan a kamera felé húzzuk
  const bias = (m, k) => { m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
    mvPosition.xyz *= ${k}; gl_Position = projectionMatrix * mvPosition;`); }; m.customProgramCacheKey = () => 'osm-bias' + k; return m; };
  const roadMat = bias(new THREE.MeshLambertMaterial({ vertexColors: true }), .9982);
  const bMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  bMat.onBeforeCompile = sh => { withWorld(sh); sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
    { vec3 cr = cross(dFdx(vWPos), dFdy(vWPos)); float cl = length(cr); vec3 fn = cl > 1e-9 ? cr / cl : vec3(0., 1., 0.); if (abs(fn.y) < .5) { float u = abs(fn.x) > abs(fn.z) ? vWPos.z : vWPos.x; vec2 cw = vec2(u / 3.6, vWPos.y / 3.3);
      vec2 f = fract(cw); float win = step(.22, f.x) * step(f.x, .78) * step(.3, f.y) * step(f.y, .82);
      float lit = step(.58, h21(floor(cw) + floor(vWPos.xz / 50.))) * uNight;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.16,.22,.28), win * .8); totalEmissiveRadiance += win * lit * vec3(2.2, 1.6, .9); } }`); };
  bMat.customProgramCacheKey = () => 'osm-epulet';
  const lampMat = new THREE.PointsMaterial({ color: 0xffc070, size: 8, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const waterMat = opt.waterMat;

  /* ---- megyék betöltése ---- */
  function county(id) { let c = C.get(id); if (c) { c.used = performance.now(); return c; } const m = megyek()[id];
    c = { id, m, ax: m[0], sx: m[1], ay: m[2], st: 0, used: performance.now(), bin: null, haz: null, bst: 0, water: [] }; C.set(id, c); const q = ver ? '?v=' + ver : '';
    fetch(BASE + id + '.json' + q).then(r => r.json()).then(md => { prepJson(c, md); c.st = 1; markDirty([c.m[3], c.m[4], c.m[5], c.m[6]]); }).catch(() => { c.st = -1; });
    return c; }
  function loadBig(c) { if (c.bst) return; c.bst = 1; const q = ver ? '?v=' + ver : '';
    Promise.all([fetch(BASE + c.id + '.bin' + q).then(r => r.arrayBuffer()), fetch(BASE + c.id + '.haz' + q).then(r => r.arrayBuffer())])
      .then(([b, h]) => { c.bin = new DataView(b); c.TXN = c.bin.getUint16(4, true); c.TYN = c.bin.getUint16(6, true); c.haz = new DataView(h); c.bst = 2; markDirty([c.m[3], c.m[4], c.m[5], c.m[6]]); })
      .catch(() => { c.bst = -1; }); }
  const toN = (c, x, y) => [c.ax + x * c.sx, c.ay + y];
  const owns = (c, x, y) => { const i = Math.floor(x / MASK), j = Math.floor(y / MASK); return i >= 0 && j >= 0 && i < c.MW && j < c.MH && c.own[j * c.MW + i] > 0; };
  function prepJson(c, md) {
    // tulajdon-maszk a megye körvonalából (256 m)
    c.MW = Math.ceil(md.W / MASK) + 1; c.MH = Math.ceil(md.H / MASK) + 1; const cv = document.createElement('canvas'); cv.width = c.MW; cv.height = c.MH; const x = cv.getContext('2d', { willReadFrequently: true });
    x.fillStyle = '#fff'; for (const f of md.outl) { x.beginPath(); for (let i = 0; i < f.length; i += 2) (i ? x.lineTo : x.moveTo).call(x, f[i] / MASK, f[i + 1] / MASK); x.closePath(); x.fill(); }   // a gyűrűk egyesítése (Pest + Budapest)
    const d = x.getImageData(0, 0, c.MW, c.MH).data; c.own = new Uint8Array(c.MW * c.MH); for (let i = 0; i < c.own.length; i++) c.own[i] = d[i * 4 + 3] >= 128 ? 1 : 0;
    // vasút: szakaszok 2 km-es rácscellákba (országos koordináták)
    c.rails = new Map(); for (const f of md.rails) for (let i = 0; i + 3 < f.length; i += 2) { const mx = (f[i] + f[i + 2]) / 2, my = (f[i + 1] + f[i + 3]) / 2; if (!owns(c, mx, my)) continue;
      const [ax, az] = toN(c, f[i], f[i + 1]), [bx, bz] = toN(c, f[i + 2], f[i + 3]), k = Math.floor((ax + bx) / 2 / LEAF) + ':' + Math.floor((az + bz) / 2 / LEAF); let a = c.rails.get(k); if (!a) c.rails.set(k, a = []); a.push(ax, az, bx, bz); }
    c.md = { wpoly: md.wpoly, water: md.water }; buildWater(c); }

  /* ---- vízfelületek (tavak, folyópartok, folyók) ---- */
  function buildWater(c) { if (!waterMat) return;
    for (const rings of c.md.wpoly) { const o = rings[0]; if (!o || o.length < 6) continue; const [fx, fz] = toN(c, o[0], o[1]), key = Math.round(fx / 5) + ':' + Math.round(fz / 5) + ':' + o.length; if (waterKeys.has(key)) continue; waterKeys.add(key);
      const pts = ring => { const a = []; for (let i = 0; i < ring.length; i += 2) { const [X, Z] = toN(c, ring[i], ring[i + 1]); a.push(new THREE.Vector2(X - fx, Z - fz)); } return a; };
      // raszteres kitöltés (a tópartok gyakran önmetszők, a fülvágó háromszögelés elbukik rajtuk): soronkénti futamokból négyszögek
      const outer = pts(o), holes = rings.slice(1).filter(r => r.length >= 6).map(pts); let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const v of outer) { x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); z0 = Math.min(z0, v.y); z1 = Math.max(z1, v.y); }
      const big = Math.max(x1 - x0, z1 - z0) > 5000, cs = Math.max(10, Math.max(x1 - x0, z1 - z0) / 3000), nx = Math.ceil((x1 - x0) / cs) + 1, nz = Math.ceil((z1 - z0) / cs) + 1;
      const cv = document.createElement('canvas'); cv.width = nx; cv.height = nz; const cx = cv.getContext('2d', { willReadFrequently: true }); cx.fillStyle = '#fff'; cx.beginPath();
      for (const r of [outer, ...holes]) { r.forEach((v, k) => (k ? cx.lineTo : cx.moveTo).call(cx, (v.x - x0) / cs, (v.y - z0) / cs)); cx.closePath(); } cx.fill('evenodd'); const D = cx.getImageData(0, 0, nx, nz).data;
      let lvl = 1e9; if (!big) for (let k = 0; k < outer.length; k += Math.max(1, outer.length / 24 | 0)) lvl = Math.min(lvl, ground(fx + outer[k].x, fz + outer[k].y));
      const P3 = [], maxRun = big ? Math.ceil(250 / cs) : 1e9, Hh = (x, z) => (big ? ground(fx + x, fz + z) : lvl) + .8;
      for (let j = 0; j < nz; j++) for (let k = 0; k < nx;) { if (D[(j * nx + k) * 4 + 3] < 128) { k++; continue; } let e = k; while (e < nx && e - k < maxRun && D[(j * nx + e) * 4 + 3] >= 128) e++;
        const xa = x0 + k * cs, xb = x0 + e * cs, za = z0 + j * cs, zb = za + cs, a = Hh(xa, za), b2 = Hh(xa, zb), c2 = Hh(xb, za), d2 = Hh(xb, zb); P3.push(xa, a, za, xa, b2, zb, xb, c2, za, xb, c2, za, xa, b2, zb, xb, d2, zb); k = e; }
      if (!P3.length) continue; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P3, 3)); g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, waterMat); mesh.position.set(fx, 0, fz); mesh.userData = { fx, fz, big, key }; root.add(mesh); c.water.push(mesh); }
    // folyók: szalag a megadott szélességgel
    const pos = [], idx = []; let ox = null, oz = null;
    for (const [w, f] of c.md.water) for (let i = 0; i + 3 < f.length; i += 2) { const mx = (f[i] + f[i + 2]) / 2, my = (f[i + 1] + f[i + 3]) / 2; if (!owns(c, mx, my)) continue;
      const [ax, az] = toN(c, f[i], f[i + 1]), [bx, bz] = toN(c, f[i + 2], f[i + 3]); if (ox === null) { ox = ax; oz = az; } const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1, nx = -dz / l * w / 2, nz = dx / l * w / 2;
      const ha = ground(ax, az) + .25, hb = ground(bx, bz) + .25, n = pos.length / 3; pos.push(ax + nx - ox, ha, az + nz - oz, ax - nx - ox, ha, az - nz - oz, bx + nx - ox, hb, bz + nz - oz, bx - nx - ox, hb, bz - nz - oz); idx.push(n, n + 2, n + 1, n + 2, n + 3, n + 1); }
    if (pos.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeBoundingSphere(); const mesh = new THREE.Mesh(g, waterMat); mesh.position.set(ox, 0, oz); mesh.userData = { river: 1 }; root.add(mesh); c.water.push(mesh); } }
  function redoWater(c, b) { // betöltődött domborzati csempe: a víz magassága igazodik
    for (const m of c.water) { if (m.userData.river) continue; const g = m.geometry, p = g.attributes.position, { fx, fz, big } = m.userData; const bs = g.boundingSphere; if (fx + bs.center.x + bs.radius < b[0] || fx + bs.center.x - bs.radius > b[2] || fz + bs.center.z + bs.radius < b[1] || fz + bs.center.z - bs.radius > b[3]) continue;
      if (big) { for (let i = 0; i < p.count; i++) p.setY(i, ground(fx + p.getX(i), fz + p.getZ(i)) + .8); } else { let lvl = 1e9; for (let i = 0; i < p.count; i += Math.max(1, p.count / 24 | 0)) lvl = Math.min(lvl, ground(fx + p.getX(i), fz + p.getZ(i))); for (let i = 0; i < p.count; i++) p.setY(i, lvl + .8); }
      p.needsUpdate = true; } }

  /* ---- .bin / .haz dekódolás ---- */
  function nodes(c, t) { const DV = c.bin, io = 8 + 12 * t, off = DV.getUint32(io, true), nn = DV.getUint16(io + 4, true), bx = Math.floor(t / c.TYN) * T, by = (t % c.TYN) * T, o = new Float32Array(nn * 2);
    for (let i = 0; i < nn; i++) { o[2 * i] = bx + DV.getUint16(off + i * 4, true) / 32; o[2 * i + 1] = by + DV.getUint16(off + i * 4 + 2, true) / 32; } return o; }
  function tileRange(c, x0, z0, S) { const lx0 = (x0 - c.ax) / c.sx, lx1 = (x0 + S - c.ax) / c.sx, ly0 = z0 - c.ay, ly1 = z0 + S - c.ay;
    return [Math.max(0, Math.floor(lx0 / T) - 1), Math.min(c.TXN - 1, Math.floor(lx1 / T)), Math.max(0, Math.floor(ly0 / T) - 1), Math.min(c.TYN - 1, Math.floor(ly1 / T))]; }
  const inLeaf = (X, Z, x0, z0) => X >= x0 && X < x0 + LEAF && Z >= z0 && Z < z0 + LEAF;
  const countiesAt = (x0, z0) => { const out = []; for (const id in megyek()) { const m = megyek()[id]; if (m[3] - 50 > x0 + LEAF || m[5] + 50 < x0 || m[4] - 50 > z0 + LEAF || m[6] + 50 < z0) continue; out.push(county(id)); } return out; };

  /* ---- utak, sínek, lámpák egy 2 km-es csonkhoz ---- */
  function buildRoads(x0, z0) { const cs = countiesAt(x0, z0); if (cs.some(c => c.st === 0 || c.bst < 2 && c.bst !== -1 && (loadBig(c), true))) return null;
    const pos = [], col = [], lamps = [];
    const quad = (ax, az, ha, bx, bz, hb, w, c0) => { const rgb = lin(c0); const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1, nx = -dz / l * w / 2, nz = dx / l * w / 2;
      pos.push(ax + nx - x0, ha, az + nz - z0, bx + nx - x0, hb, bz + nz - z0, ax - nx - x0, ha, az - nz - z0, bx + nx - x0, hb, bz + nz - z0, bx - nx - x0, hb, bz - nz - z0, ax - nx - x0, ha, az - nz - z0); for (let k = 0; k < 6; k++) col.push(rgb[0], rgb[1], rgb[2]); };
    const strip = (ax, az, bx, bz, w, rgb, lift, bridge) => { const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 28)); let px = ax, pz = az, ph = bridge ? bridge[0] : ground(ax, az) + lift;
      for (let s = 1; s <= n; s++) { const t = s / n, qx = ax + (bx - ax) * t, qz = az + (bz - az) * t, qh = bridge ? bridge[0] + (bridge[1] - bridge[0]) * t : ground(qx, qz) + lift; quad(px, pz, ph, qx, qz, qh, w, rgb); px = qx; pz = qz; ph = qh; } };
    const bridgeH = (ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l; let h = -1e9; for (const k of [-320, -160, 0, l / 2, l, l + 160, l + 320]) h = Math.max(h, ground(ax + ux * k, az + uz * k)); return [h + 1.2, h + 1.2]; };
    for (const c of cs) { if (c.bst !== 2) continue; const [tx0, tx1, ty0, ty1] = tileRange(c, x0, z0, LEAF), DV = c.bin;
      for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) { const t = tx * c.TYN + ty, io = 8 + 12 * t, off = DV.getUint32(io, true); if (!off) continue; const nn = DV.getUint16(io + 4, true), ne = DV.getUint32(io + 8, true), A = nodes(c, t), nb = new Map();
        for (let i = 0, o = off + nn * 4; i < ne; i++, o += 6) { const a = DV.getUint16(o, true), b = DV.getUint16(o + 2, true), cc = DV.getUint8(o + 4), f = DV.getUint8(o + 5); if (f & 16) continue;
          const t2 = t + (Math.floor(cc / 3) - 1) * c.TYN + (cc % 3 - 1); let B = t2 === t ? A : nb.get(t2); if (!B) { B = nodes(c, t2); nb.set(t2, B); }
          const lax = A[2 * a], lay = A[2 * a + 1], lbx = B[2 * b], lby = B[2 * b + 1]; if (!owns(c, (lax + lbx) / 2, (lay + lby) / 2)) continue;
          const [ax, az] = toN(c, lax, lay), [bx, bz] = toN(c, lbx, lby); if (!inLeaf((ax + bx) / 2, (az + bz) / 2, x0, z0) || inAirport((ax + bx) / 2, (az + bz) / 2) || Math.hypot((ax + bx) / 2 - PAD[0], (az + bz) / 2 - PAD[1]) < 32) continue;
          const cl = f & 7, built = f & 32, dirt = !cl && !built, w = dirt ? 3.6 : ROADW[cl], rgb = dirt ? [.5, .43, .32] : ROADC[cl];
          strip(ax, az, bx, bz, w, rgb, .35 + cl * .03, f & 8 ? bridgeH(ax, az, bx, bz) : null);
          if (built && !(f & 8)) { const L = Math.hypot(bx - ax, bz - az); for (let s = 20; s < L; s += 48) { const k = s / L, x = ax + (bx - ax) * k, z = az + (bz - az) * k, dx = (bz - az) / L, dz = -(bx - ax) / L, off2 = w / 2 + 3; lamps.push(x + dx * off2 - x0, ground(x, z) + 7, z + dz * off2 - z0); } } } }
      for (const k of [Math.floor((x0 + 1) / LEAF) + ':' + Math.floor((z0 + 1) / LEAF)]) { const r = c.rails?.get(k); if (!r) continue;
        for (let i = 0; i < r.length; i += 4) { strip(r[i], r[i + 1], r[i + 2], r[i + 3], 6, [.42, .39, .35], .45); strip(r[i], r[i + 1], r[i + 2], r[i + 3], 2.2, [.2, .17, .15], .55); } } }
    const g = new THREE.Group(); g.position.set(x0, 0, z0);
    if (pos.length) { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      const nrm = new Float32Array(pos.length); for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1; geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); geo.computeBoundingSphere();
      const m = new THREE.Mesh(geo, roadMat); m.receiveShadow = true; m.renderOrder = 1; g.add(m); }
    if (lamps.length) { const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lamps, 3)); lg.computeBoundingSphere(); const lp = new THREE.Points(lg, lampMat); lp.visible = night; lp.userData.lamp = 1; g.add(lp); }
    return g; }

  /* ---- épületek egy 2 km-es csonkhoz ---- */
  const CC = new THREE.Color();
  function buildBuildings(x0, z0) { const cs = countiesAt(x0, z0); if (cs.some(c => c.st === 0 || c.bst < 2 && c.bst !== -1 && (loadBig(c), true))) return null;
    const pos = [], col = [];
    const tri = (a, b, cc, rgb) => { pos.push(a[0], a[1], a[2], b[0], b[1], b[2], cc[0], cc[1], cc[2]); for (let k = 0; k < 3; k++) col.push(rgb[0], rgb[1], rgb[2]); };
    const hsh = (x, z) => { let h = Math.imul(Math.round(x * 7) | 0, 374761393) + Math.imul(Math.round(z * 7) | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    const near = (X, Z) => inAirport(X, Z) || Math.hypot(X - PAD[0], Z - PAD[1]) < 50 || LANDMARKS.some(([lx, lz]) => Math.hypot(X - lx, Z - lz) < 170);
    function building(ring, h, cx, cz, rect) { // ring: [[x,z], …] országos koordinátákban, óramutató szerint vagy ellene
      let base = 1e9; for (let i = 0; i < ring.length; i += Math.max(1, ring.length / 6 | 0)) base = Math.min(base, ground(ring[i][0], ring[i][1])); base -= .6; const gc = ground(cx, cz), top = gc + Math.max(3, h);
      const r = hsh(cx, cz), wall = CC.setHex(WALL[(r * WALL.length) | 0]).toArray(), small = rect && h <= 9, roofC = CC.setHex(small ? ROOF[(hsh(cz, cx) * ROOF.length) | 0] : FLAT[(hsh(cz, cx) * FLAT.length) | 0]).toArray();
      // irány: legyen az óramutatóval ellentétes (a falak kifelé nézzenek)
      let ar = 0; for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length]; ar += p[0] * q[1] - q[0] * p[1]; } if (ar > 0) ring = ring.slice().reverse();
      const L = p => [p[0] - x0, base, p[1] - z0], U = p => [p[0] - x0, top, p[1] - z0];
      for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length]; const sh = .85 + .15 * Math.abs((q[0] - p[0]) / (Math.hypot(q[0] - p[0], q[1] - p[1]) || 1)), wc = [wall[0] * sh, wall[1] * sh, wall[2] * sh];
        tri(L(p), L(q), U(q), wc); tri(L(p), U(q), U(p), wc); }
      if (small && ring.length === 4) { // nyeregtető a hosszabb oldallal párhuzamos gerinccel
        const [a, b, c2, d] = ring, l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c2[0] - b[0], c2[1] - b[1]), rh = Math.min(l1, l2) * .38;
        const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], R = p => [p[0] - x0, top + rh, p[1] - z0];
        if (l1 >= l2) { const m1 = mid(b, c2), m2 = mid(d, a); tri(U(a), U(b), R(m1), roofC); tri(U(a), R(m1), R(m2), roofC); tri(U(c2), U(d), R(m2), roofC); tri(U(c2), R(m2), R(m1), roofC); tri(U(b), U(c2), R(m1), wall); tri(U(d), U(a), R(m2), wall); }
        else { const m1 = mid(a, b), m2 = mid(c2, d); tri(U(b), U(c2), R(m2), roofC); tri(U(b), R(m2), R(m1), roofC); tri(U(d), U(a), R(m1), roofC); tri(U(d), R(m1), R(m2), roofC); tri(U(a), U(b), R(m1), wall); tri(U(c2), U(d), R(m2), wall); }
        return; }
      // lapos tető
      // lapos tető: fülvágó háromszögelés; minden háromszög felfelé néz (különben a hátlapeldobás eltüntetné); ha a sokszög önmetsző és a háromszögelés hiányos, legyezőre esik vissza
      const up = (a, b, c) => { if ((b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]) > 0) tri(a, b, c, roofC); else tri(a, c, b, roofC); };
      let pa = 0; for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length]; pa += p[0] * q[1] - q[0] * p[1]; } pa = Math.abs(pa / 2);
      let t2; try { t2 = THREE.ShapeUtils.triangulateShape(ring.map(p => new THREE.Vector2(p[0], p[1])), []); } catch (_) { t2 = []; }
      let ta = 0; for (const [i, j, k] of t2) ta += Math.abs((ring[j][0] - ring[i][0]) * (ring[k][1] - ring[i][1]) - (ring[k][0] - ring[i][0]) * (ring[j][1] - ring[i][1])) / 2;
      if (t2.length && ta > pa * .9) for (const [i, j, k] of t2) up(U(ring[i]), U(ring[j]), U(ring[k]));
      else { let mx = 0, mz = 0; for (const p of ring) { mx += p[0]; mz += p[1]; } const C = U([mx / ring.length, mz / ring.length]); for (let i = 0; i < ring.length; i++) up(C, U(ring[i]), U(ring[(i + 1) % ring.length])); } }
    for (const c of cs) { if (c.bst !== 2) continue; const [tx0, tx1, ty0, ty1] = tileRange(c, x0, z0, LEAF), HV = c.haz;
      for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) { const t = tx * c.TYN + ty, io = 8 + 12 * t, off = HV.getUint32(io, true); if (!off) continue; const nr = HV.getUint32(io + 4, true), pb = HV.getUint32(io + 8, true), bx = tx * T, by = ty * T;
        for (let i = 0, o = off; i < nr; i++, o += 8) { const lx = bx + HV.getUint16(o, true) / 32, ly = by + HV.getUint16(o + 2, true) / 32; if (!owns(c, lx, ly)) continue; const [X, Z] = toN(c, lx, ly); if (!inLeaf(X, Z, x0, z0) || near(X, Z)) continue;
          const hw = HV.getUint8(o + 4) / 2, hd = HV.getUint8(o + 5) / 2, a = HV.getUint8(o + 6) / 256 * Math.PI, h = HV.getUint8(o + 7), cs2 = Math.cos(a), sn = Math.sin(a);
          building([[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([u, v]) => [X + (cs2 * u - sn * v) * c.sx, Z + sn * u + cs2 * v]), h, X, Z, true); }
        for (let o = off + nr * 8, end = off + nr * 8 + pb; o < end;) { const lx = bx + HV.getUint16(o, true) / 32, ly = by + HV.getUint16(o + 2, true) / 32, n = HV.getUint8(o + 4), h = HV.getUint8(o + 5); o += 6; const st = o; o += n * 4;
          if (!owns(c, lx, ly)) continue; const [X, Z] = toN(c, lx, ly); if (!inLeaf(X, Z, x0, z0) || near(X, Z) || n < 3) continue; const ring = [];
          for (let i = 0; i < n; i++) ring.push([X + HV.getInt16(st + i * 4, true) / 4 * c.sx, Z + HV.getInt16(st + i * 4 + 2, true) / 4]);
          if (ring.length > 3 && Math.hypot(ring[0][0] - ring[ring.length - 1][0], ring[0][1] - ring[ring.length - 1][1]) < .5) ring.pop(); if (ring.length >= 3) building(ring, h, X, Z, false); } } }
    if (!pos.length) return new THREE.Group();
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals(); geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, bMat); m.position.set(x0, 0, z0); m.castShadow = true; m.receiveShadow = true; return m; }

  /* ---- frissítés: a terep látható közeli csonkjai szerint ---- */
  const dirty = new Set();
  function markDirty(b) { for (const map of [roadOv, bldOv]) for (const [k, e] of map) { const [x0, z0] = e.xz; if (x0 < b[2] + 400 && x0 + LEAF > b[0] - 400 && z0 < b[3] + 400 && z0 + LEAF > b[1] - 400) e.dirty = true; } }
  onTile(b => { markDirty(b); for (const c of C.values()) if (c.water.length) redoWater(c, b); });
  function drop(map, k) { const e = map.get(k); if (!e) return; if (e.o) { root.remove(e.o); e.o.traverse(x => { if (x.geometry) x.geometry.dispose(); }); } map.delete(k); }
  function update(cam, dt) { frame++; const leaves = [], cx = Math.floor(cam.position.x / LEAF), cz = Math.floor(cam.position.z / LEAF), K = Math.ceil(Math.max(roadR, bldR) / LEAF) + 1, hy = Math.max(0, cam.position.y - ground(cam.position.x, cam.position.z));
    if (hy < 6000) for (let j = -K; j <= K; j++) for (let i = -K; i <= K; i++) { const x0 = (cx + i) * LEAF, z0 = (cz + j) * LEAF, dx = Math.max(0, x0 - cam.position.x, cam.position.x - x0 - LEAF), dz = Math.max(0, z0 - cam.position.z, cam.position.z - z0 - LEAF); leaves.push([x0, z0, Math.hypot(dx, dz, hy * .5)]); }
    const n = SU.uNight.value > .5; if (n !== night) { night = n; for (const e of roadOv.values()) e.o?.traverse(x => { if (x.userData.lamp) x.visible = night; }); }
    const p = cam.position;
    // megyék: a json a közelben, a nagy fájlok az épület/út-sugáron belül
    if (frame % 30 === 0) for (const id in megyek()) { const m = megyek()[id], dx = Math.max(0, m[3] - p.x, p.x - m[5]), dz = Math.max(0, m[4] - p.z, p.z - m[6]), d = Math.hypot(dx, dz);
      if (d < 30000) { const c = county(id); if (d < roadR + 3000 && c.st === 1) loadBig(c); }
      else if (d > 60000 && C.has(id)) { const c = C.get(id); if (performance.now() - c.used > 30000) { for (const w of c.water) { root.remove(w); w.geometry.dispose(); waterKeys.delete(w.userData.key); } C.delete(id); } } }
    // a kívánt csonkok
    const wantR = new Map(), wantB = new Map(); for (const [x0, z0, d] of leaves) { const k = x0 + ':' + z0; if (d < roadR) wantR.set(k, [x0, z0, d]); if (d < bldR) wantB.set(k, [x0, z0, d]); }
    for (const [map, want] of [[roadOv, wantR], [bldOv, wantB]]) { for (const k of [...map.keys()]) if (!want.has(k)) { const e = map.get(k); if (e.far === undefined) e.far = 0; e.far += dt; if (e.far > 3) drop(map, k); else if (e.o) e.o.visible = false; } }
    const todo = []; for (const [map, want, fn] of [[roadOv, wantR, buildRoads], [bldOv, wantB, buildBuildings]]) for (const [k, v] of want) { const e = map.get(k); if (e) { e.far = 0; if (e.o) e.o.visible = true; } if (!e || e.dirty) todo.push([v[2], map, k, v, fn]); }
    todo.sort((a, b) => a[0] - b[0]); const t0 = performance.now();
    for (const [, map, k, [x0, z0], fn] of todo) { if (performance.now() - t0 > 4) break; if (!tileReady(x0 + LEAF / 2, z0 + LEAF / 2)) continue; const o = fn(x0, z0); if (!o) continue; const old = map.get(k); if (old?.o) { root.remove(old.o); old.o.traverse(x => { if (x.geometry) x.geometry.dispose(); }); }
      root.add(o); map.set(k, { o, xz: [x0, z0], dirty: false, far: 0 }); }
  }
  return { update, root, set(o) { if (o.roadR) roadR = o.roadR; if (o.bldR) bldR = o.bldR; }, stats: () => ({ counties: C.size, roads: roadOv.size, bld: bldOv.size, big: [...C.values()].filter(c => c.bst === 2).length }) };
}
