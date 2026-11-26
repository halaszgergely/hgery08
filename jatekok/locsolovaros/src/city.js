// A város megjelenítése: domborzat, folyó, utak, járdák, épületek (chunkonként, LOD-dal), utcabútor (instancing, a játékos körül újratöltve)
import * as THREE from 'three';
import { mergeGeometries } from '../lib/addons/utils/BufferGeometryUtils.js?v=202611262133';
import * as W from './world.js?v=202611262133';
import { facadeMat, FACADE, groundMats, signTex, graffitiTex } from './textures.js?v=202611262133';

const V3 = THREE.Vector3;
function quad(pos, uv, nrm, a, b, c, d, ua, ub, uc, ud, n) { pos.push(...a, ...b, ...c, ...a, ...c, ...d); uv.push(...ua, ...ub, ...uc, ...ua, ...uc, ...ud); for (let i = 0; i < 6; i++) nrm.push(...n); }
function geo(pos, uv, nrm, col) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); if (col) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g; }
/* doboz falai világ-skálás UV-val (homlokzat-csempe) */
function walls(o, x0, z0, x1, z1, y0, y1, pos, uv, nrm, voff = 0) {
  const fw = FACADE.w, fh = FACADE.h, v0 = voff / fh, v1 = (y1 - y0 + voff) / fh;
  const side = (ax, az, bx, bz, n) => { const L = Math.hypot(bx - ax, bz - az), u0 = (ax + az) / fw % 1; quad(pos, uv, nrm, [ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az], [u0, v0], [u0 + L / fw, v0], [u0 + L / fw, v1], [u0, v1], n); };
  side(x0, z1, x1, z1, [0, 0, 1]); side(x1, z0, x0, z0, [0, 0, -1]); side(x1, z1, x1, z0, [1, 0, 0]); side(x0, z0, x0, z1, [-1, 0, 0]);
}
function flatTop(x0, z0, x1, z1, y, pos, uv, nrm, s = 8) { quad(pos, uv, nrm, [x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [x0 / s, z1 / s], [x1 / s, z1 / s], [x1 / s, z0 / s], [x0 / s, z0 / s], [0, 1, 0]); }
function boxG(x0, y0, z0, x1, y1, z1, P, s = 4) { // egyszerű doboz (attika, korlát) – 5 oldal
  const pos = P.pos, uv = P.uv, nrm = P.nrm; flatTop(x0, z0, x1, z1, y1, pos, uv, nrm, s);
  const side = (a, b, c, d, n, L, H) => quad(pos, uv, nrm, a, b, c, d, [0, 0], [L / s, 0], [L / s, H / s], [0, H / s], n);
  const H = y1 - y0; side([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], x1 - x0, H); side([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], x1 - x0, H);
  side([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], z1 - z0, H); side([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], z1 - z0, H);
}
const P0 = () => ({ pos: [], uv: [], nrm: [] });

export function createCity(scene, Q) {
  const M = groundMats(), root = new THREE.Group(); scene.add(root);
  const goldM = new THREE.MeshStandardMaterial({ color: 0xffc83d, metalness: 1, roughness: .22, emissive: 0x3a2400 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0x9c9a94, roughness: .9 }), darkM = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: .7, metalness: .3 });
  const parapetM = new THREE.MeshStandardMaterial({ color: 0x8a8780, roughness: .95 }), roofFlat = new THREE.MeshStandardMaterial({ map: M.gravel.map, color: 0xa09e98, roughness: 1 });
  /* ---------- domborzat ---------- */
  { const S = 2600, n = 260, g = new THREE.PlaneGeometry(S, S, n, n); g.rotateX(-Math.PI / 2); const p = g.attributes.position, col = [];
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), h = W.terrain(x, z); p.setY(i, h - .12); const av = Math.hypot(x - W.AVAS.x, z - W.AVAS.z) < W.AVAS.r * 1.1, riv = h < -.6;
      const c = riv ? [.55, .5, .42] : av ? [.78, .9, .7] : Math.abs(x) > W.HALF + 30 || Math.abs(z) > W.HALF + 30 ? [.9, .95, .8] : [1, 1, 1]; col.push(...c); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * S / 12, uv.getY(i) * S / 12);
    const m = M.grass.clone(); m.vertexColors = true; const t = new THREE.Mesh(g, m); t.receiveShadow = true; root.add(t); }
  /* ---------- folyó ---------- */
  { const g = new THREE.PlaneGeometry(2400, W.RIV1 - W.RIV0 + 30, 1, 1); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 120, uv.getY(i) * 4);
    const w = new THREE.Mesh(g, M.water); w.position.set(0, -1.4, (W.RIV0 + W.RIV1) / 2); w.renderOrder = 1; root.add(w); M.water.map.offset.set(0, 0); }
  // rakpart-fal
  { const P = P0(); for (const zz of [W.RIV0 - 2, W.RIV1 + 2]) boxG(-1200, -4, zz - 1, 1200, .25, zz + 1, P, 3); const g = geo(P.pos, P.uv, P.nrm); const m = new THREE.Mesh(g, concrete); m.receiveShadow = true; root.add(m);
    const R = P0(); for (const zz of [W.RIV0 - 1, W.RIV1 + 1]) { let xs = -1200; for (const b of [...W.BRIDGES, 1200]) { const xe = b - W.ROADW / 2 - 1.5; if (xe > xs) { boxG(xs, .25, zz - .06, xe, 1.1, zz + .06, R, 2); for (let x = xs; x < xe; x += 2.5) boxG(x, .25, zz - .05, x + .1, 1.1, zz + .05, R); } xs = b + W.ROADW / 2 + 1.5; } }
    root.add(new THREE.Mesh(geo(R.pos, R.uv, R.nrm), darkM)); }
  // hidak
  { const P = P0(), Rl = P0(); for (const b of W.BRIDGES) { for (let z = W.RIV0 - 14; z < W.RIV1 + 14; z += 2) { const y = W.deckAt(z + 1); boxG(b - W.ROADW / 2 - 1.5, y - 1.2, z, b + W.ROADW / 2 + 1.5, y - .02, z + 2.02, P, 4); }
    for (const s of [-1, 1]) { const x = b + s * (W.ROADW / 2 + .8); for (let z = W.RIV0 - 8; z < W.RIV1 + 8; z += 2) { const y = W.deckAt(z + 1); boxG(x - .08, y, z, x + .08, y + 1.1, z + .12, Rl); boxG(x - .1, y + 1, z, x + .1, y + 1.12, z + 2.02, Rl); } }
    for (const z of [W.RIV0 + 12, (W.RIV0 + W.RIV1) / 2, W.RIV1 - 12]) boxG(b - 6, -5, z - 2, b + 6, W.deckY - 1.2, z + 2, P, 4); }
    const m = new THREE.Mesh(geo(P.pos, P.uv, P.nrm), concrete); m.castShadow = m.receiveShadow = true; root.add(m); root.add(new THREE.Mesh(geo(Rl.pos, Rl.uv, Rl.nrm), darkM)); }

  /* ---------- utak (egész város, szakaszokra bontva, a domborzatot követve) ---------- */
  const roadMeshes = [];
  { const byMat = { road: P0(), hw: P0(), cross: P0(), walk: P0(), curb: P0() };
    const strip = (P, ax, az, bx, bz, w, lift, uScale = 1, vLen = 14) => { const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 8)), dx = (bx - ax) / L, dz = (bz - az) / L, nx = -dz * w / 2, nz = dx * w / 2;
      for (let i = 0; i < n; i++) { const k0 = i / n, k1 = (i + 1) / n, x0 = ax + (bx - ax) * k0, z0 = az + (bz - az) * k0, x1 = ax + (bx - ax) * k1, z1 = az + (bz - az) * k1;
        const y = (x, z) => W.groundY(x, z) + lift; const a = [x0 - nx, y(x0 - nx, z0 - nz), z0 - nz], b = [x0 + nx, y(x0 + nx, z0 + nz), z0 + nz], c = [x1 + nx, y(x1 + nx, z1 + nz), z1 + nz], d = [x1 - nx, y(x1 - nx, z1 - nz), z1 - nz];
        quad(P.pos, P.uv, P.nrm, a, b, c, d, [0, k0 * L / vLen], [uScale, k0 * L / vLen], [uScale, k1 * L / vLen], [0, k1 * L / vLen], [0, 1, 0]); } };
    for (const r of W.ROADS) { const [ax, az] = r.a, [bx, bz] = r.b, h = r.w / 2, dx = Math.sign(bx - ax), dz = Math.sign(bz - az);
      // a kereszteződés négyzete nélkül
      const s = r.hw ? 0 : h; strip(r.hw ? byMat.hw : byMat.road, ax + dx * s, az + dz * s, bx - dx * s, bz - dz * s, r.w, .07, 1, r.w);
      if (!r.hw && !r.ramp) for (const sd of [-1, 1]) { // járda + szegély a két oldalon
        const ox = dz * sd * (h + W.SIDEW / 2), oz = -dx * sd * (h + W.SIDEW / 2); strip(byMat.walk, ax + dx * s + ox, az + dz * s + oz, bx - dx * s + ox, bz - dz * s + oz, W.SIDEW, .2, W.SIDEW / 4, 4);
        const cx = dz * sd * (h + .1), cz = -dx * sd * (h + .1); strip(byMat.curb, ax + dx * s + cx, az + dz * s + cz, bx - dx * s + cx, bz - dz * s + cz, .25, .2, .1, 2); } }
    for (const n of W.NODES.values()) { if (n.hw) continue; const h = W.ROADW / 2, y = W.groundY(n.x, n.z) + .09; const P = n.light ? byMat.cross : byMat.road;
      if (n.light) quad(P.pos, P.uv, P.nrm, [n.x - h, W.groundY(n.x - h, n.z + h) + .09, n.z + h], [n.x + h, W.groundY(n.x + h, n.z + h) + .09, n.z + h], [n.x + h, W.groundY(n.x + h, n.z - h) + .09, n.z - h], [n.x - h, W.groundY(n.x - h, n.z - h) + .09, n.z - h], [0, 1], [1, 1], [1, 0], [0, 0], [0, 1, 0]);
      else { const T = byMat.road; quad(T.pos, T.uv, T.nrm, [n.x - h, W.groundY(n.x - h, n.z + h) + .09, n.z + h], [n.x + h, W.groundY(n.x + h, n.z + h) + .09, n.z + h], [n.x + h, W.groundY(n.x + h, n.z - h) + .09, n.z - h], [n.x - h, W.groundY(n.x - h, n.z - h) + .09, n.z - h], [.06, .3], [.12, .3], [.12, .32], [.06, .32], [0, 1, 0]); }
      // sarok-járdák
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const cx = n.x + sx * (h + W.SIDEW / 2), cz = n.z + sz * (h + W.SIDEW / 2); strip(byMat.walk, cx, cz - W.SIDEW / 2, cx, cz + W.SIDEW / 2, W.SIDEW, .2, .8, 4); } void y; }
    // autópálya terelőkorlát
    const bar = P0(); for (const s of [-1, 1]) for (let z = -W.HALF; z < W.HALF; z += 10) boxG(W.MOTOR_X + s * 11.3 - .15, W.groundY(W.MOTOR_X, z) + .1, z, W.MOTOR_X + s * 11.3 + .15, W.groundY(W.MOTOR_X, z) + .85, z + 10.05, bar, 2);
    for (let z = -W.HALF; z < W.HALF; z += 10) boxG(W.MOTOR_X - .2, W.groundY(W.MOTOR_X, z) + .1, z, W.MOTOR_X + .2, W.groundY(W.MOTOR_X, z) + .95, z + 10.05, bar, 2);
    for (const s of [-1, 1]) W.addColl({ x0: W.MOTOR_X + s * 11.3 - .2, z0: -W.HALF, x1: W.MOTOR_X + s * 11.3 + .2, z1: s < 0 ? W.HALF : -112, y0: 0, y1: 1, rail: 1 }), s > 0 && W.addColl({ x0: W.MOTOR_X + 11.1, z0: -88, x1: W.MOTOR_X + 11.5, z1: W.HALF, y0: 0, y1: 1, rail: 1 });
    W.addColl({ x0: W.MOTOR_X - .25, z0: -W.HALF, x1: W.MOTOR_X + .25, z1: W.HALF, y0: 0, y1: 1, rail: 1 });
    const mk = (P, mat, sh = false) => { const m = new THREE.Mesh(geo(P.pos, P.uv, P.nrm), mat); m.receiveShadow = true; m.castShadow = sh; m.material.polygonOffset = true; m.material.polygonOffsetFactor = -1; m.material.polygonOffsetUnits = -2; root.add(m); roadMeshes.push(m); return m; };
    mk(byMat.road, M.road); mk(byMat.hw, M.hw); mk(byMat.cross, M.cross); mk(byMat.walk, M.walk); mk(byMat.curb, concrete.clone()); root.add(new THREE.Mesh(geo(bar.pos, bar.uv, bar.nrm), darkM));
    // villamossín a Fő utcán (z = 0)
    const rail = P0(); for (const off of [-4.2, -2.8, 2.8, 4.2]) for (let x = -700; x < 700; x += 8) { const y = W.groundY(x, off) + .1; boxG(x, y, off - .06, x + 8.02, y + .05, off + .06, rail); }
    root.add(new THREE.Mesh(geo(rail.pos, rail.uv, rail.nrm), new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: .9, roughness: .3 }))); }
  // kaszkadőr-ugratók: ék alakú rámpa sárga-fekete csíkkal
  { const jm = new THREE.MeshStandardMaterial({ map: signTex('▶ ▶ ▶ ▶', '#f2c230', '#15181c', 256, 64), roughness: .7 });
    for (const j of W.JUMPS) { const L = 12, Wd = 6, H = 2.6, sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(L, 0), new THREE.Vector2(L, H), new THREE.Vector2(L - .4, H)]);
      const g = new THREE.ExtrudeGeometry(sh, { depth: Wd, bevelEnabled: false }); g.translate(-L / 2, 0, -Wd / 2); const m = new THREE.Mesh(g, [jm, concrete]); m.castShadow = m.receiveShadow = true;
      m.position.set(j.x, j.y, j.z); m.rotation.y = j.ax === 'x' ? 0 : -Math.PI / 2; root.add(m); } }

  /* ---------- épületek chunkonként ---------- */
  const chunks = W.BLOCKS.map(B => ({ B, hi: null, lo: null }));
  const STYCOL = { office: 0x6a7f92, hgws: 0xe6ecf0, panel: 0xb2ada2, old: 0xd2ac66, old2: 0xc49888, brick: 0x8a4a34, warehouse: 0x8a9298, house: 0xe6dccb, szerviz: 0x2c6fa8, hgwsg: 0xd5dade, garage: 0xa39f96, villa: 0xeee8de };
  /* távoli LOD: az egész város egyetlen hálóban; tömbönkénti láthatóság adattextúrából (1 rajzolási hívás), ablakminta és éjszakai fények árnyalóban */
  const visData = new Uint8Array(16 * 16 * 4), visTex = new THREE.DataTexture(visData, 16, 16); visTex.needsUpdate = true;
  const loU = { vis: { value: visTex }, night: { value: 0 } };
  const loMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  loMat.onBeforeCompile = sh => { Object.assign(sh.uniforms, loU);
    sh.vertexShader = 'attribute float cid; uniform sampler2D vis; varying vec3 vWP; varying vec3 vWN;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vWP = position; vWN = normal; if (texture2D(vis, vec2((mod(cid, 16.) + .5) / 16., (floor(cid / 16.) + .5) / 16.)).r < .5) gl_Position = vec4(2., 2., 2., 1.);');
    sh.fragmentShader = 'uniform float night; varying vec3 vWP; varying vec3 vWN;\nfloat hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5); }\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      if (abs(vWN.y) < .5) { float a = abs(vWN.x) > .5 ? vWP.z : vWP.x; vec2 c = vec2(a / 3.4, vWP.y / 3.2); vec2 f = fract(c); float win = step(.22, f.x) * step(f.x, .78) * step(.3, f.y) * step(f.y, .8);
        diffuseColor.rgb *= 1. - win * .45; totalEmissiveRadiance += win * step(.55, hh(floor(c))) * night * vec3(1., .82, .5) * .9; }`); };
  function buildLo(ch, ci, pos, nrm, col, uv, cid) {
    for (const o of ch.B.b) { if (o.pipes) continue; const c = new THREE.Color(o.tank || o.chimney || o.tower ? 0x9a9a96 : STYCOL[o.style] || 0x999999), P = { pos: [], uv: [], nrm: [] };
      if (o.tank) boxG(o.x - o.r, o.y0, o.z - o.r, o.x + o.r, o.y0 + o.h, o.z + o.r, P); else if (o.chimney) boxG(o.x - 2, o.y0, o.z - 2, o.x + 2, o.y0 + o.h, o.z + 2, P); else if (o.tower) boxG(o.x - 3, o.y0, o.z - 3, o.x + 3, o.y0 + 34, o.z + 3, P);
      else boxG(o.x - o.w / 2, o.y0, o.z - o.d / 2, o.x + o.w / 2, o.y0 + o.h + (o.roof === 'flat' ? 0 : 3), o.z + o.d / 2, P);
      pos.push(...P.pos); nrm.push(...P.nrm); uv.push(...P.uv); for (let i = 0; i < P.pos.length / 3; i++) { col.push(c.r, c.g, c.b); cid.push(ci); } }
  }
  { const pos = [], nrm = [], col = [], uv = [], cid = []; chunks.forEach((ch, i) => buildLo(ch, i, pos, nrm, col, uv, cid)); const g = geo(pos, uv, nrm, col); g.setAttribute('cid', new THREE.Float32BufferAttribute(cid, 1));
    const lo = new THREE.Mesh(g, loMat); lo.matrixAutoUpdate = false; lo.frustumCulled = false; root.add(lo); }
  const setVis = (i, v) => { const k = v ? 255 : 0; if (visData[i * 4] !== k) { visData[i * 4] = k; visTex.needsUpdate = true; } };
  function buildHi(ch) {
    const g = new THREE.Group(), by = {}, roofs = { flat: P0(), tile: P0(), metal: P0(), par: P0() }, extra = [];
    const W2 = st => (by[st] ||= P0());
    for (const o of ch.B.b) {
      if (o.tank || o.chimney || o.tower || o.pipes) { extra.push(o); continue; }
      const x0 = o.x - o.w / 2, x1 = o.x + o.w / 2, z0 = o.z - o.d / 2, z1 = o.z + o.d / 2, y0 = o.y0, y1 = o.y0 + o.h, P = W2(o.style);
      walls(o, x0, z0, x1, z1, y0, y1, P.pos, P.uv, P.nrm, o.style === 'house' ? 1.5 : 0);
      if (o.roof === 'flat') { flatTop(x0, z0, x1, z1, y1, roofs.flat.pos, roofs.flat.uv, roofs.flat.nrm, 6);
        const t = .35; for (const [a, b, c, d] of [[x0, z0, x1, z0 + t], [x0, z1 - t, x1, z1], [x0, z0, x0 + t, z1], [x1 - t, z0, x1, z1]]) boxG(a, y1, b, c, y1 + .9, d, roofs.par, 3); }
      else if (o.roof === 'saw') { const n = Math.max(2, Math.round(o.w / 10)), sw = o.w / n, R = roofs.metal; for (let i = 0; i < n; i++) { const a = x0 + i * sw, b = a + sw;
          quad(R.pos, R.uv, R.nrm, [a, y1, z1], [b, y1 + 3, z1], [b, y1 + 3, z0], [a, y1, z0], [0, 0], [1, 0], [1, o.d / 4], [0, o.d / 4], [-.3, .95, 0]);
          quad(R.pos, R.uv, R.nrm, [b, y1, z0], [b, y1 + 3, z0], [b, y1 + 3, z1], [b, y1, z1], [0, 0], [0, .5], [o.d / 4, .5], [o.d / 4, 0], [1, 0, 0]);
          const S = W2('warehouse'); quad(S.pos, S.uv, S.nrm, [a, y1, z1], [b, y1, z1], [b, y1 + 3, z1], [a, y1, z1], [0, 0], [1, 0], [1, .2], [0, .2], [0, 0, 1]); quad(S.pos, S.uv, S.nrm, [b, y1, z0], [a, y1, z0], [a, y1, z0], [b, y1 + 3, z0], [0, 0], [1, 0], [1, 0], [0, .2], [0, 0, -1]); } }
      else { // nyereg- vagy kontyolt tető
        const R = roofs.tile, along = o.rot ? 'z' : 'x', rh = Math.min(o.w, o.d) * .42, ov = .5, X0 = x0 - ov, X1 = x1 + ov, Z0 = z0 - ov, Z1 = z1 + ov, hip = o.roof === 'hip';
        if (along === 'x') { const zm = (Z0 + Z1) / 2, ia = hip ? X0 + (Z1 - Z0) / 2 : X0, ib = hip ? X1 - (Z1 - Z0) / 2 : X1;
          quad(R.pos, R.uv, R.nrm, [X0, y1, Z1], [X1, y1, Z1], [ib, y1 + rh, zm], [ia, y1 + rh, zm], [0, 0], [o.w / 3, 0], [o.w / 3, 2], [0, 2], [0, .7, .7]);
          quad(R.pos, R.uv, R.nrm, [X1, y1, Z0], [X0, y1, Z0], [ia, y1 + rh, zm], [ib, y1 + rh, zm], [0, 0], [o.w / 3, 0], [o.w / 3, 2], [0, 2], [0, .7, -.7]);
          const E = hip ? R : W2(o.style); quad(E.pos, E.uv, E.nrm, [X1, y1, Z1], [X1, y1, Z0], [ib, y1 + rh, zm], [ib, y1 + rh, zm], [0, 0], [1, 0], [.5, .4], [.5, .4], [.7, .7, 0]); quad(E.pos, E.uv, E.nrm, [X0, y1, Z0], [X0, y1, Z1], [ia, y1 + rh, zm], [ia, y1 + rh, zm], [0, 0], [1, 0], [.5, .4], [.5, .4], [-.7, .7, 0]); }
        else { const xm = (X0 + X1) / 2, ia = hip ? Z0 + (X1 - X0) / 2 : Z0, ib = hip ? Z1 - (X1 - X0) / 2 : Z1;
          quad(R.pos, R.uv, R.nrm, [X1, y1, Z1], [X1, y1, Z0], [xm, y1 + rh, ia], [xm, y1 + rh, ib], [0, 0], [o.d / 3, 0], [o.d / 3, 2], [0, 2], [.7, .7, 0]);
          quad(R.pos, R.uv, R.nrm, [X0, y1, Z0], [X0, y1, Z1], [xm, y1 + rh, ib], [xm, y1 + rh, ia], [0, 0], [o.d / 3, 0], [o.d / 3, 2], [0, 2], [-.7, .7, 0]);
          const E = hip ? R : W2(o.style); quad(E.pos, E.uv, E.nrm, [X0, y1, Z1], [X1, y1, Z1], [xm, y1 + rh, ib], [xm, y1 + rh, ib], [0, 0], [1, 0], [.5, .4], [.5, .4], [0, .7, .7]); quad(E.pos, E.uv, E.nrm, [X1, y1, Z0], [X0, y1, Z0], [xm, y1 + rh, ia], [xm, y1 + rh, ia], [0, 0], [1, 0], [.5, .4], [.5, .4], [0, .7, -.7]); } }
      if (o.sign) { const t = signTex(o.sign, o.style === 'hgws' ? '#1f8fd6' : o.style === 'szerviz' ? '#f2c230' : o.style === 'warehouse' ? '#5a1d1d' : '#2b3a4a', o.style === 'szerviz' ? '#10202e' : '#fff'), sw = Math.min(o.w * .8, o.sign.length * 1.6), m = new THREE.Mesh(new THREE.PlaneGeometry(sw, sw / 5.3), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .2, roughness: .6 }));
        m.position.set(o.x, y1 - (o.style === 'hgws' ? 3 : 1.8), z0 - .12); m.rotation.y = Math.PI; g.add(m); m.userData.sign = 1; }
      if (o.clock) { const m = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, .3, 24), new THREE.MeshStandardMaterial({ color: 0xf2ead2, roughness: .5 })); m.rotation.x = Math.PI / 2; m.position.set(o.x, y1 + 3, z0 - .3); g.add(m);
        const t = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 6), facadeMat('old')); t.position.set(o.x, y1 + 2, o.z - o.d / 2 + 3); g.add(t); }
      if (o.statue) { const s = statue(goldM); s.position.set(o.x, y1 + .9, o.z); s.scale.setScalar(1.6); g.add(s); ch.statue = s; }
      if (o.helipad) { const pad = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, .12, 32), new THREE.MeshStandardMaterial({ map: signTex('H', '#2d3238', '#f2c230', 256, 256), roughness: .8 })); pad.position.set(o.x, y1 + .96, o.z); g.add(pad);
        const rp = P0(); boxG(x1 + .5, y0, z0, x1 + 4.5, y0 + .3, z1, rp); const rm = new THREE.Mesh(geo(rp.pos, rp.uv, rp.nrm), concrete); g.add(rm);
        const ramp = W.RAMPS.find(r => Math.abs(r.x0 - (x1 + .5)) < 2 && r.h1 > 5); if (ramp) { const rg = new THREE.BoxGeometry(4, .4, Math.hypot(ramp.z1 - ramp.z0, ramp.h1 - ramp.h0)); const rr = new THREE.Mesh(rg, concrete); rr.position.set((ramp.x0 + ramp.x1) / 2, (ramp.h0 + ramp.h1) / 2 - .2, (ramp.z0 + ramp.z1) / 2); rr.rotation.x = -Math.atan2(ramp.h1 - ramp.h0, ramp.z1 - ramp.z0); g.add(rr); } }
      if (o.garage) { const door = new THREE.Mesh(new THREE.PlaneGeometry(8, 4.2), new THREE.MeshStandardMaterial({ map: signTex('▮▮▮ GARÁZS ▮▮▮', '#6a737b', '#2a2f34', 512, 256), roughness: .6, metalness: .4 })); door.position.set(o.x, y0 + 2.1, z0 - .05); door.rotation.y = Math.PI; g.add(door); }
    }
    // a ZERO-tető feljárója
    for (const R of W.RAMPS) if (!R.jump && R.h1 > 20 && R.x0 >= ch.B.cx - 50 && R.x0 < ch.B.cx + 50 && R.z0 >= ch.B.cz - 50 && R.z0 < ch.B.cz + 50) {
      const L = Math.hypot(R.z1 - R.z0, R.h1 - R.h0), m = new THREE.Mesh(new THREE.BoxGeometry(4, .4, L), darkM); m.position.set((R.x0 + R.x1) / 2, (R.h0 + R.h1) / 2 - .2, (R.z0 + R.z1) / 2); m.rotation.x = -Math.atan2(R.h1 - R.h0, R.z1 - R.z0); g.add(m); }
    if (ch.B.zero) { const z = ch.B.zero, m = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.5), new THREE.MeshBasicMaterial({ map: graffitiTex(), transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(z.x, z.y - .38, z.z); m.renderOrder = 2; g.add(m); }
    for (const o of extra) {
      if (o.tank) { const m = new THREE.Mesh(new THREE.CylinderGeometry(o.r, o.r, o.h, 28), new THREE.MeshStandardMaterial({ color: 0xa8aeb2, roughness: .45, metalness: .6 })); m.position.set(o.x, o.y0 + o.h / 2, o.z); g.add(m);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(o.r * .3, o.r, 1.2, 28), new THREE.MeshStandardMaterial({ color: 0x8a9094, roughness: .5, metalness: .6 })); top.position.set(o.x, o.y0 + o.h + .6, o.z); g.add(top);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(o.r + .05, .12, 6, 32), darkM); ring.rotation.x = Math.PI / 2; ring.position.set(o.x, o.y0 + o.h * .5, o.z); g.add(ring); }
      else if (o.chimney) { const m = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.4, o.h, 16), facadeMat('brick')); m.position.set(o.x, o.y0 + o.h / 2, o.z); g.add(m); for (const k of [.85, .95]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, .6, 16), new THREE.MeshStandardMaterial({ color: k > .9 ? 0xd8d8d8 : 0xb0352a })); r.position.set(o.x, o.y0 + o.h * k, o.z); g.add(r); } }
      else if (o.tower) g.add(lookout(o, concrete, darkM));
      else if (o.pipes) { const pm = new THREE.MeshStandardMaterial({ color: 0x2f7d4a, roughness: .5, metalness: .5 }); for (const [ax, az, bx, bz] of [[-8, -14, 15, -14], [15, -14, 15, 9], [-8, -14, -18, 9]]) { const L = Math.hypot(bx - ax, bz - az), m = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, L, 10), pm); m.rotation.z = Math.PI / 2; m.rotation.y = -Math.atan2(bz - az, bx - ax); m.position.set(o.x + (ax + bx) / 2, W.terrain(o.x, o.z) + 1.4, o.z + (az + bz) / 2); g.add(m); } }
    }
    for (const st in by) { const P = by[st]; if (!P.pos.length) continue; const m = new THREE.Mesh(geo(P.pos, P.uv, P.nrm), facadeMat(st)); m.castShadow = m.receiveShadow = true; g.add(m); }
    const R = [[roofs.flat, roofFlat], [roofs.tile, M.roofTile], [roofs.metal, M.roofMetal], [roofs.par, parapetM]]; for (const [P, mat] of R) if (P.pos.length) { const m = new THREE.Mesh(geo(P.pos, P.uv, P.nrm), mat); m.castShadow = m.receiveShadow = true; g.add(m); }
    // telekhatár-kerítések és burkolat
    const pav = ch.B.dist === 'belvaros' || ch.B.dist === 'ipari' || ch.B.place === 'hgws' || ch.B.place?.startsWith('szerviz') || ch.B.place?.startsWith('atemelo') || ch.B.place === 'raktar';
    if (pav) { const s = 43 - W.SIDEW, n = 10, P = P0(); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const ax = ch.B.cx - s + i * 2 * s / n, az = ch.B.cz - s + j * 2 * s / n, bx = ax + 2 * s / n, bz = az + 2 * s / n, y = (x, z) => W.terrain(x, z) + .05;
        quad(P.pos, P.uv, P.nrm, [ax, y(ax, bz), bz], [bx, y(bx, bz), bz], [bx, y(bx, az), az], [ax, y(ax, az), az], [ax / 6, bz / 6], [bx / 6, bz / 6], [bx / 6, az / 6], [ax / 6, az / 6], [0, 1, 0]); }
      const m = new THREE.Mesh(geo(P.pos, P.uv, P.nrm), ch.B.dist === 'ipari' || ch.B.place?.startsWith('atemelo') || ch.B.place === 'raktar' ? M.asphalt : M.walk); m.receiveShadow = true; m.material.polygonOffset = true; m.material.polygonOffsetFactor = -1; g.add(m); }
    return g;
  }
  function statue(mat) { // az Arany Locsolófej
    const g = new THREE.Group(), add = (geo, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.castShadow = true; g.add(m); return m; };
    add(new THREE.CylinderGeometry(1.6, 2, .8, 24), 0, .4, 0); add(new THREE.CylinderGeometry(.35, .45, 4, 16), 0, 2.8, 0); add(new THREE.CylinderGeometry(1.3, .5, 1.2, 24), 0, 5.2, 0);
    add(new THREE.TorusGeometry(1.3, .18, 8, 24), 0, 5.8, 0, Math.PI / 2); const arm = add(new THREE.CylinderGeometry(.18, .18, 3.4, 10), 0, 6.4, 0, 0, Math.PI / 2); arm.userData.spin = 1;
    for (const s of [-1, 1]) add(new THREE.SphereGeometry(.35, 12, 8), s * 1.7, 6.4, 0);
    const drop = add(new THREE.SphereGeometry(.7, 16, 12), 0, 7.6, 0); drop.scale.set(1, 1.4, 1); g.userData.arm = arm; return g;
  }
  function lookout(o, conc, dark) {
    const g = new THREE.Group(), y = o.y0, m = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.6, 30, 16), conc); m.position.set(o.x, y + 15, o.z); m.castShadow = true; g.add(m);
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(8, 6, 3, 24), new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: .4, metalness: .2 })); deck.position.set(o.x, y + 31, o.z); deck.castShadow = true; g.add(deck);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(8.1, 8.1, 1.8, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x5a8fbf, roughness: .1, metalness: .6, transparent: true, opacity: .55 })); glass.position.set(o.x, y + 31, o.z); g.add(glass);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(.12, .3, 14, 6), dark); ant.position.set(o.x, y + 39, o.z); g.add(ant);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.4, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3030 })); lamp.position.set(o.x, y + 46, o.z); lamp.userData.blink = 1; g.add(lamp); return g;
  }
  /* ---------- utcabútor: instancing a játékos körül ---------- */
  const PROPS = W.BLOCKS.flatMap(B => B.props);
  for (const p of PROPS) if (p.t === 'tree' || p.t === 'lamp' || p.t === 'hydrant') W.addColl({ x0: p.x - .4, z0: p.z - .4, x1: p.x + .4, z1: p.z + .4, y0: -99, y1: p.y + (p.t === 'hydrant' ? .8 : 6), round: p.t === 'tree' ? .45 : .2, prop: p });
  const pm = (c, r = .8, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const merged = (parts) => { const gs = parts.map(([g, c]) => { const n = g.index ? g.toNonIndexed() : g; const cc = new THREE.Color(c), col = new Float32Array(n.attributes.position.count * 3); for (let i = 0; i < col.length; i += 3) { col[i] = cc.r; col[i + 1] = cc.g; col[i + 2] = cc.b; } n.setAttribute('color', new THREE.BufferAttribute(col, 3)); n.deleteAttribute('uv'); return n; }); return mergeGeometries(gs); };
  const tr = (g, x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => g.applyMatrix4(new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(s, s, s)));
  const vc = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85 });
  const KIND = {
    tree: merged([[tr(new THREE.CylinderGeometry(.18, .28, 3, 7), 0, 1.5, 0), 0x5a4030], [tr(new THREE.IcosahedronGeometry(2.2, 1), 0, 4.2, 0), 0x3f7a35], [tr(new THREE.IcosahedronGeometry(1.6, 1), .9, 5.2, .4), 0x4f8f3f], [tr(new THREE.IcosahedronGeometry(1.4, 1), -.8, 5, -.5), 0x356b2e]]),
    lamp: merged([[tr(new THREE.CylinderGeometry(.08, .12, 7, 6), 0, 3.5, 0), 0x3a4048], [tr(new THREE.BoxGeometry(.1, .1, 2), 0, 7, -.9), 0x3a4048]]),
    lampHead: tr(new THREE.BoxGeometry(.45, .14, .8), 0, 6.9, -1.8),
    bench: merged([[tr(new THREE.BoxGeometry(1.8, .08, .5), 0, .45, 0), 0x8a5a32], [tr(new THREE.BoxGeometry(1.8, .4, .06), 0, .75, -.24), 0x8a5a32], [tr(new THREE.BoxGeometry(.08, .45, .5), -.8, .22, 0), 0x2d3238], [tr(new THREE.BoxGeometry(.08, .45, .5), .8, .22, 0), 0x2d3238]]),
    hydrant: merged([[tr(new THREE.CylinderGeometry(.16, .2, .7, 10), 0, .35, 0), 0xd03a2a], [tr(new THREE.SphereGeometry(.17, 10, 6), 0, .72, 0), 0xd03a2a], [tr(new THREE.CylinderGeometry(.06, .06, .5, 6), 0, .45, 0, 0, 0, Math.PI / 2), 0xe0e0e0]]),
    bin: merged([[tr(new THREE.CylinderGeometry(.28, .24, .9, 10), 0, .45, 0), 0x2f6f3f]]),
    barrel: merged([[tr(new THREE.CylinderGeometry(.35, .35, 1, 12), 0, .5, 0), 0x2a5d9c], [tr(new THREE.TorusGeometry(.35, .03, 4, 12), 0, .25, 0, Math.PI / 2), 0x1a2a3a], [tr(new THREE.TorusGeometry(.35, .03, 4, 12), 0, .75, 0, Math.PI / 2), 0x1a2a3a]]),
    fountain: merged([[tr(new THREE.CylinderGeometry(5, 5.3, .7, 28), 0, .35, 0), 0x9a958a], [tr(new THREE.CylinderGeometry(.6, .9, 2.4, 12), 0, 1.4, 0), 0x9a958a], [tr(new THREE.CylinderGeometry(1.6, .6, .5, 16), 0, 2.6, 0), 0x9a958a], [tr(new THREE.CylinderGeometry(4.6, 4.6, .1, 28), 0, .62, 0), 0x3a8fc0]]),
    playground: merged([[tr(new THREE.BoxGeometry(.12, 2.6, .12), -1.6, 1.3, -.8, 0, 0, .25), 0xc0392b], [tr(new THREE.BoxGeometry(.12, 2.6, .12), 1.6, 1.3, -.8, 0, 0, -.25), 0xc0392b], [tr(new THREE.BoxGeometry(3.6, .12, .12), 0, 2.55, -.8), 0xf2c230], [tr(new THREE.BoxGeometry(.6, .06, .3), -.6, .6, -.8), 0x2a6fd1], [tr(new THREE.BoxGeometry(.6, .06, .3), .6, .6, -.8), 0x2a6fd1], [tr(new THREE.BoxGeometry(2.5, .1, 4), 3, .9, 1, .35), 0x27ae60]]),
    pool: merged([[tr(new THREE.BoxGeometry(5, .45, 8), 0, .2, 0), 0xdfe6ea], [tr(new THREE.BoxGeometry(4.4, .1, 7.4), 0, .42, 0), 0x3fb6e8]]),
    fenceSeg: merged([[tr(new THREE.BoxGeometry(1, .9, .06), 0, .45, 0), 0x8a6a4a]]),
    tlPole: merged([[tr(new THREE.CylinderGeometry(.09, .11, 4.2, 6), 0, 2.1, 0), 0x2d3238], [tr(new THREE.BoxGeometry(.38, 1.15, .32), 0, 3.6, 0), 0x1d2024]]),
    bulb: tr(new THREE.SphereGeometry(.12, 8, 6), 0, 0, -.18)
  };
  const IM = {}, MAXN = { tree: 900, lamp: 700, lampHead: 700, bench: 200, hydrant: 200, bin: 300, barrel: 120, fountain: 4, playground: 40, pool: 80, fenceSeg: 3000, tlPole: 400, bulbR: 400, bulbY: 400, bulbG: 400 };
  const lampM = new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffd890, emissiveIntensity: 0, roughness: .4 });
  const bulbM = c => new THREE.MeshStandardMaterial({ color: 0x111111, emissive: c, emissiveIntensity: 2.2, toneMapped: false });
  for (const k in MAXN) { const g = k.startsWith('bulb') ? KIND.bulb : KIND[k], m = k === 'lampHead' ? lampM : k === 'bulbR' ? bulbM(0xff2a1a) : k === 'bulbY' ? bulbM(0xffb020) : k === 'bulbG' ? bulbM(0x30ff60) : vc;
    const im = new THREE.InstancedMesh(g, m, MAXN[k]); im.count = 0; im.castShadow = k === 'tree' || k === 'lamp' || k === 'playground' || k === 'tlPole'; im.receiveShadow = true; im.frustumCulled = false; root.add(im); IM[k] = im; }
  const mat4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s3 = new V3(), p3 = new V3();
  let lastProp = null, lightList = [];
  function refreshProps(px, pz, R) {
    for (const k in IM) IM[k].count = 0; lightList = [];
    const put = (k, x, y, z, ry, s = 1, sx = s, sy = s, sz = s) => { const im = IM[k]; if (im.count >= MAXN[k]) return -1; mat4.compose(p3.set(x, y, z), q.setFromEuler(e.set(0, ry, 0)), s3.set(sx, sy, sz)); im.setMatrixAt(im.count, mat4); return im.count++; };
    for (const p of PROPS) { if (Math.abs(p.x - px) > R || Math.abs(p.z - pz) > R) continue;
      if (p.t === 'fence') { const h = p.w / 2; for (let i = -h; i < h; i += 1) { if (Math.abs(i) < 2) continue; put('fenceSeg', p.x + i + .5, p.y, p.z - h, 0); put('fenceSeg', p.x + i + .5, p.y, p.z + h, 0); put('fenceSeg', p.x - h, p.y, p.z + i + .5, Math.PI / 2); put('fenceSeg', p.x + h, p.y, p.z + i + .5, Math.PI / 2); } continue; }
      put(p.t, p.x, p.y + (p.t === 'lamp' || p.t === 'hydrant' || p.t === 'bin' || p.t === 'bench' ? .2 : 0), p.z, p.a || 0, p.s || 1); if (p.t === 'lamp') put('lampHead', p.x, p.y + .2, p.z, p.a || 0); }
    for (const n of W.LIGHTS) { if (Math.abs(n.x - px) > R || Math.abs(n.z - pz) > R) continue; const h = W.ROADW / 2 + 1.2, y = W.groundY(n.x, n.z) + .2;
      for (const [sx, sz, ry, ax] of [[-1, -1, 0, 'z'], [1, 1, Math.PI, 'z'], [1, -1, -Math.PI / 2, 'x'], [-1, 1, Math.PI / 2, 'x']]) { const x = n.x + sx * h, z = n.z + sz * h; put('tlPole', x, y, z, ry);
        const idx = ['bulbR', 'bulbY', 'bulbG'].map((b, i) => put(b, x + Math.sin(ry) * -.18, y + 3.95 - i * .36, z + Math.cos(ry) * -.18, ry)); lightList.push({ n, ax, idx }); } }
    for (const k in IM) IM[k].instanceMatrix.needsUpdate = true; lastProp = [px, pz];
  }
  const hide = new THREE.Matrix4().makeScale(0, 0, 0), mtmp = new THREE.Matrix4();
  function updateLights(t) { // a lámpák állapota: a nem világító izzót a mátrix nullázásával rejtjük el
    for (const L of lightList) { const st = W.lightState(L.n, t), myGreen = L.ax === 'z' ? st === 0 : st === 2, myYellow = L.ax === 'z' ? st === 1 : st === 3;
      const on = [!myGreen && !myYellow, myYellow, myGreen];
      ['bulbR', 'bulbY', 'bulbG'].forEach((b, i) => { const k = L.idx[i]; if (k < 0) return; const im = IM[b]; if (!L.m) L.m = []; if (!L.m[i]) { L.m[i] = new THREE.Matrix4(); im.getMatrixAt(k, L.m[i]); } im.setMatrixAt(k, on[i] ? L.m[i] : hide); im.instanceMatrix.needsUpdate = true; }); }
  }
  /* ---------- chunk-kezelés ---------- */
  let statueRef = null, statueHidden = false, initial = true;
  function update(cam, env, t) {
    const px = cam.position.x, pz = cam.position.z, R = Q().detail;
    let budget = initial ? 999 : 2; const order = chunks.map(ch => [Math.max(Math.abs(ch.B.cx - px), Math.abs(ch.B.cz - pz)) - 50, ch]).sort((a, b) => a[0] - b[0]); initial = false;
    for (const [d, ch] of order) {
      if (d < R && (ch.hi || budget > 0)) { if (!ch.hi) { budget--; ch.hi = buildHi(ch); root.add(ch.hi); if (ch.statue) statueRef = ch.statue; } ch.hi.visible = true; setVis(chunks.indexOf(ch), false); }
      else { if (ch.hi && d > R + 160) { root.remove(ch.hi); ch.hi.traverse(o => { if (o.geometry) o.geometry.dispose(); }); ch.hi = null; if (ch.statue) { ch.statue = null; } } else if (ch.hi) ch.hi.visible = false;
        setVis(chunks.indexOf(ch), d < Q().far); } }
    loU.night.value = env.night;
    chunks.sorted = order;
    if (!lastProp || Math.hypot(px - lastProp[0], pz - lastProp[1]) > 40) refreshProps(px, pz, Q().props);
    updateLights(t);
    lampM.emissiveIntensity = env.lampsOn ? 2.4 : 0;
    for (const st of ['office', 'hgws', 'panel', 'old', 'old2', 'brick', 'warehouse', 'house', 'villa', 'garage', 'szerviz', 'hgwsg']) facadeMat(st).emissiveIntensity = env.night * (st === 'office' ? 1.1 : .9);
    if (statueRef) { statueRef.visible = !statueHidden; if (statueRef.userData.arm) statueRef.userData.arm.rotation.y = t * 1.5; }
    M.water.map.offset.x = t * .01;
  }
  return { root, update, refreshProps, chunks, get statue() { return statueRef; }, setStatueVisible(v) { statueHidden = !v; if (statueRef) statueRef.visible = v; }, statueModel: () => statue(goldM), goldM };
}
