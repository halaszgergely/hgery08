/* Terep: négyfa-alapú (quadtree) csonkok a kamera körül. Közel 2 km-es, 125 m-es rácsú csonkok, távolabb egyre nagyobbak
   (4, 8, 16, 32 km) ugyanannyi osztással – ez a LOD. A csonkok széle „szoknyát” kap, hogy ne látszódjon rés a szintek között.
   A felszínt lapszínek adják (low-poly): mezőparcellák, erdő, település, víz, szikla. Közeli erdőcsonkokon instancolt fák. */
import * as THREE from 'three';
import { ground, cls, hash2, G, onTile, clearGridCache, inAirport } from './geo.js?v=202611212316';

const LEAF = 2000, ROOT = 32000, N = 16;
const C = new THREE.Color();
const PAL = {
  viz: [0x2b6a96, 0x2f73a0, 0x28628c], erdo: [0x2c5a2c, 0x335f2f, 0x2a5233, 0x3a6a34], varos: [0x8a8580, 0x9a8f86, 0xa46a52, 0x7d7c7a], kint: [0x5e6a52, 0x58654f, 0x637055],
  mezo: [0xc8b26a, 0x8a6a48, 0xa99a5a, 0x6f8f3e, 0x9c9a40, 0x7c9a4c, 0xb9a76b, 0x93704c, 0x6c8a46], szikla: [0x7d7a72, 0x8b877e], hegy: [0x40613a, 0x4c6c3f]
};
function faceColor(x, z, h, slope, out) {
  const c = cls(x, z), r = hash2(Math.floor(x / 125), Math.floor(z / 125));
  let p;
  if (inAirport(x, z)) { out.setHex(r < .5 ? 0x77a04c : 0x6f9846); return out; }
  if (slope > .62 && h > 300) p = PAL.szikla;
  else if (c === 3) p = PAL.viz; else if (c === 1) p = h > 650 ? PAL.hegy : PAL.erdo; else if (c === 2) p = PAL.varos; else if (c === 4) p = PAL.kint;
  else { // szántóföld-parcellák: 2 km-es blokkonként más irányú, eltérő szélességű sávok
    const bx = Math.floor(x / 2000), bz = Math.floor(z / 2000), a = hash2(bx, bz) * Math.PI, ca = Math.cos(a), sa = Math.sin(a);
    const u = x * ca + z * sa, v = -x * sa + z * ca, w1 = 260 + hash2(bz, bx) * 260, pid = hash2(Math.floor(u / w1), Math.floor(v / 620) + bx * 7);
    p = PAL.mezo; out.setHex(p[Math.floor(pid * p.length)]); out.offsetHSL(0, 0, (r - .5) * .05); return out; }
  out.setHex(p[Math.floor(r * p.length)]); out.offsetHSL(0, 0, (hash2(Math.floor(x / 60), Math.floor(z / 60)) - .5) * .05); return out;
}

// egy fa: törzs + két kúp, egyetlen geometriában
function treeGeo() {
  const parts = [new THREE.CylinderGeometry(.35, .5, 3, 5).translate(0, 1.5, 0), new THREE.ConeGeometry(3.2, 7, 6).translate(0, 6, 0), new THREE.ConeGeometry(2.3, 5, 6).translate(0, 9.5, 0)];
  const cols = [0x5b4128, 0x2f5a2b, 0x3a6a33]; let n = 0; for (const g of parts) n += g.toNonIndexed().attributes.position.count;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  parts.forEach((g, i) => { const ng = g.toNonIndexed(), p = ng.attributes.position.array; pos.set(p, o * 3); C.setHex(cols[i]); for (let k = 0; k < p.length / 3; k++) { col[(o + k) * 3] = C.r; col[(o + k) * 3 + 1] = C.g; col[(o + k) * 3 + 2] = C.b; } o += p.length / 3; });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}

export function createTerrain(scene, opt) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  const tGeo = treeGeo(), tMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const uTime = { value: 0 };
  tMat.onBeforeCompile = s => { s.uniforms.uTime = uTime; s.vertexShader = 'uniform float uTime;\n' + s.vertexShader.replace('#include <begin_vertex>',
    `#include <begin_vertex>
     #ifdef USE_INSTANCING
       vec4 ip = instanceMatrix * vec4(0., 0., 0., 1.);
       float sw = sin(uTime * 1.3 + ip.x * .05 + ip.z * .07) * .035 * max(0., position.y - 2.);
       transformed.x += sw; transformed.z += sw * .6;
     #endif`); };
  const root = new THREE.Group(); scene.add(root);
  const cache = new Map(); let frame = 0, lastSel = [0, 0, 0], selT = 0, visible = [], queue = [];
  let viewR = opt.viewR || 40000, treeR = opt.treeR ?? 5000, treeDens = opt.treeDens ?? 1;

  function build(key, size, x0, z0) {
    const step = size / N, V = (N * N * 6 + N * 4 * 6), pos = new Float32Array(V * 3), col = new Float32Array(V * 3);
    const H = new Float32Array((N + 1) * (N + 1));
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) H[j * (N + 1) + i] = ground(x0 + i * step, z0 + j * step);
    let o = 0; const put = (x, y, z) => { pos[o * 3] = x; pos[o * 3 + 1] = y; pos[o * 3 + 2] = z; o++; };
    const paint = (n) => { for (let k = o - n; k < o; k++) { col[k * 3] = C.r; col[k * 3 + 1] = C.g; col[k * 3 + 2] = C.b; } };
    const forest = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const a = H[j * (N + 1) + i], b = H[j * (N + 1) + i + 1], c = H[(j + 1) * (N + 1) + i], d = H[(j + 1) * (N + 1) + i + 1];
      const xa = i * step, za = j * step, xb = xa + step, zc = za + step;
      // 1. háromszög: a b c  (bal felső) – ugyanaz a felosztás, mint a fizika talajfüggvényében
      put(xa, a, za); put(xa, c, zc); put(xb, b, za);
      const s1 = Math.hypot(b - a, c - a) / step; faceColor(x0 + xa + step / 3, z0 + za + step / 3, (a + b + c) / 3, s1, C); paint(3);
      put(xb, d, zc); put(xb, b, za); put(xa, c, zc);
      const s2 = Math.hypot(c - d, b - d) / step; faceColor(x0 + xa + step * .66, z0 + za + step * .66, (b + c + d) / 3, s2, C); paint(3);
      if (size === LEAF && cls(x0 + xa + step / 2, z0 + za + step / 2) === 1 && s1 < .9) forest.push(i, j);
    }
    // szoknya a négy élen
    const sk = Math.max(25, size / 60);
    const edge = (ax, az, ha, bx, bz, hb) => { faceColor(x0 + (ax + bx) / 2, z0 + (az + bz) / 2, ha, 0, C); C.multiplyScalar(.8); put(ax, ha, az); put(ax, ha - sk, az); put(bx, hb, bz); put(bx, hb, bz); put(ax, ha - sk, az); put(bx, hb - sk, bz); paint(6); };
    for (let i = 0; i < N; i++) { edge((i + 1) * step, 0, H[i + 1], i * step, 0, H[i]); edge(i * step, size, H[N * (N + 1) + i], (i + 1) * step, size, H[N * (N + 1) + i + 1]);
      edge(0, i * step, H[i * (N + 1)], 0, (i + 1) * step, H[(i + 1) * (N + 1)]); edge(size, (i + 1) * step, H[(i + 1) * (N + 1) + N], size, i * step, H[i * (N + 1) + N]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, o * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(col.subarray(0, o * 3), 3));
    g.computeVertexNormals(); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.position.set(x0, 0, z0); m.matrixAutoUpdate = false; m.updateMatrix(); m.userData = { key, size, x0, z0, forest, H };
    return m;
  }
  function addTrees(e) { const m = e.mesh, u = m.userData; if (!u.forest.length || e.trees) return;
    const step = u.size / N, per = Math.round(3.4 * treeDens), cnt = Math.min(1400, u.forest.length / 2 * per); if (cnt <= 0) return;
    const im = new THREE.InstancedMesh(tGeo, tMat, cnt), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), Pp = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0); let k = 0;
    for (let f = 0; f < u.forest.length && k < cnt; f += 2) { const i = u.forest[f], j = u.forest[f + 1];
      for (let t = 0; t < per && k < cnt; t++) { const rx = hash2(i * 31 + t, j * 17 + u.x0), rz = hash2(j * 29 + t, i * 13 + u.z0), lx = (i + rx) * step, lz = (j + rz) * step;
        const s = .7 + hash2(lx, lz) * .8; Q.setFromAxisAngle(Y, rx * 6.28); S.set(s, s * (.8 + rz * .5), s); Pp.set(lx, ground(u.x0 + lx, u.z0 + lz) - .3, lz); M.compose(Pp, Q, S); im.setMatrixAt(k++, M); } }
    im.count = k; im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.position.copy(m.position); im.matrixAutoUpdate = false; im.updateMatrix(); im.frustumCulled = true;
    e.trees = im; root.add(im); }
  function dropTrees(e) { if (!e.trees) return; root.remove(e.trees); e.trees.dispose(); e.trees = null; }
  function dispose(e) { root.remove(e.mesh); e.mesh.geometry.dispose(); dropTrees(e); }

  function select(cx, cy, cz) {
    const want = [], R = viewR;
    const rx0 = Math.floor((cx - R) / ROOT), rx1 = Math.floor((cx + R) / ROOT), rz0 = Math.floor((cz - R) / ROOT), rz1 = Math.floor((cz + R) / ROOT);
    const visit = (size, x0, z0) => { const mx = x0 + size / 2, mz = z0 + size / 2, dx = Math.max(0, Math.abs(cx - mx) - size / 2), dz = Math.max(0, Math.abs(cz - mz) - size / 2), d = Math.hypot(dx, dz, Math.max(0, cy - 600) * .7);
      if (d > R) return; if (size > LEAF && d < size * 1.25) { const h = size / 2; visit(h, x0, z0); visit(h, x0 + h, z0); visit(h, x0, z0 + h); visit(h, x0 + h, z0 + h); } else want.push([size, x0, z0, d]); };
    for (let rz = rz0; rz <= rz1; rz++) for (let rx = rx0; rx <= rx1; rx++) visit(ROOT, rx * ROOT, rz * ROOT);
    return want; }

  function update(cam, dt) { frame++; uTime.value += dt;
    const p = cam.position; selT -= dt;
    if (selT <= 0 || Math.hypot(p.x - lastSel[0], p.z - lastSel[2]) > 300 || Math.abs(p.y - lastSel[1]) > 300) { selT = .3; lastSel = [p.x, p.y, p.z];
      const want = select(p.x, p.y, p.z), keys = new Set(); visible = [];
      for (const [size, x0, z0, d] of want) { const key = size + ':' + x0 + ':' + z0; keys.add(key); visible.push([key, size, x0, z0, d]); }
      visible.sort((a, b) => a[4] - b[4]);
      for (const [key, e] of cache) { const on = keys.has(key); e.mesh.visible = on; if (e.trees) e.trees.visible = on; if (on) e.used = frame; }
      queue = visible.filter(v => { const e = cache.get(v[0]); return !e || e.dirty; }); }
    // építési keret: közelről előre, képkockánként korlátozva (az első képkocka mindent megépít)
    let budget = frame < 3 ? 1e9 : 10; const t0 = performance.now();
    while (queue.length && budget-- > 0 && (frame < 3 || performance.now() - t0 < 6)) { const [key, size, x0, z0] = queue.shift(); const old = cache.get(key);
      const m = build(key, size, x0, z0); if (old) dispose(old); const e = { mesh: m, used: frame, trees: null }; cache.set(key, e); root.add(m); }
    // fák a közeli csonkokon
    for (const [key, , , , d] of visible) { const e = cache.get(key); if (!e) continue; if (e.mesh.userData.size === LEAF && d < treeR && treeR > 0) addTrees(e); else if (e.trees && d > treeR * 1.3) dropTrees(e); }
    // nem használt csonkok kidobása
    if (frame % 60 === 0 && cache.size > 260) { const arr = [...cache.entries()].filter(([, e]) => !e.mesh.visible).sort((a, b) => a[1].used - b[1].used); for (let i = 0; i < arr.length && cache.size > 220; i++) { dispose(arr[i][1]); cache.delete(arr[i][0]); } }
  }
  onTile(b => { clearGridCache(b); for (const e of cache.values()) { const u = e.mesh.userData; if (u.x0 < b[2] + 200 && u.x0 + u.size > b[0] - 200 && u.z0 < b[3] + 200 && u.z0 + u.size > b[1] - 200) e.dirty = 1; } selT = 0; });
  return { update, root, set(o) { if (o.viewR) viewR = o.viewR; if (o.treeR !== undefined) treeR = o.treeR; if (o.treeDens !== undefined) { treeDens = o.treeDens; for (const e of cache.values()) dropTrees(e); } selT = 0; },
    stats: () => ({ chunks: visible.length, cached: cache.size, queue: queue.length }), uTime, rebuildAll() { clearGridCache(); for (const e of cache.values()) e.dirty = 1; selT = 0; } };
}
