/* Terep: négyfa-alapú (quadtree) csonkok a kamera körül (közel 2 km / 125 m-es rács, távolabb 4–32 km ugyanannyi osztással).
   - Sima árnyalás: a normálvektorok a magassági rácsból (a szomszéd csonkba is átnyúlva), így nincs varrat.
   - A felszín részletei a shaderben, világkoordinátából: parcellák éles határral és szántásmintázattal, zajos színváltozatosság,
     foltos erdő, sziklás meredek, település; a távolban a részletek elhalványulnak.
   - Víz: külön, shaderes vízfelület (hullámzás, napcsillogás, Fresnel-tükröződés az égboltról).
   - Csonkcsere atomian: a régi csonkok láthatók maradnak, amíg az újak mind fel nem épültek (időkorláttal), így nincs lyuk / villanás.
   - Közeli erdőcsonkokon kétféle (tűlevelű, lombos) instancolt fa, szélben hajladozva. */
import * as THREE from 'three';
import { ground, cls, hash2, onTile, clearGridCache, inAirport } from './geo.js?v=202611270914';
import { SU, withWorld, LOGV_PARS, LOGV, LOGF_PARS, LOGF, HASH } from './kozos.js?v=202611270914';

const LEAF = 2000, ROOT = 32000, N = 16;

const TERRAIN_FRAG = `
vec3 terrainColor(vec3 wpos, vec3 nrm, vec4 w, float ap, float dist){
  vec2 p = mod(wpos.xz, 81920.);
  float det = 1. - smoothstep(2500., 14000., dist), far = smoothstep(20000., 60000., dist);
  float n1 = fbm(p / 95.), n2 = fbm(p / 23.);
  vec2 bk = floor(p / 2000.); float ang = h21(bk) * 3.14159, ca = cos(ang), sa = sin(ang);
  vec2 q = vec2(p.x * ca + p.y * sa, -p.x * sa + p.y * ca); float w1 = 230. + h21(bk.yx + 3.) * 300.;
  vec2 cell = floor(q / vec2(w1, 640.)); float pid = h21(cell + bk * 7.);
  vec3 c0 = vec3(.66,.58,.33), c1 = vec3(.45,.33,.21), c2 = vec3(.55,.5,.29), c3 = vec3(.34,.45,.19), c4 = vec3(.5,.49,.2), c5 = vec3(.4,.5,.24), c6 = vec3(.6,.52,.33);
  vec3 field = pid < .16 ? c0 : pid < .32 ? c1 : pid < .46 ? c2 : pid < .62 ? c3 : pid < .74 ? c4 : pid < .88 ? c5 : c6;
  float fur = sin(q.x / mix(4., 7., h21(cell)) * 6.283) * .5 + .5; field *= 1. - fur * .07 * det;
  vec2 fe = abs(fract(q / vec2(w1, 640.)) - .5) * vec2(w1, 640.); float edge = 1. - smoothstep(0., 3.5, min(w1 * .5 - fe.x, 320. - fe.y));
  field = mix(field, vec3(.3,.36,.18), edge * .55 * det);
  field *= .9 + n1 * .22; field = mix(field, vec3(.5,.48,.28), far * .55);
  float fm = smoothstep(.42, .58, w.x + (n1 - .5) * .45);
  vec3 forest = mix(vec3(.14,.26,.12), vec3(.23,.35,.16), n2) * (.8 + n1 * .4) * (.88 + .24 * vn(p / 9.));
  float bm = smoothstep(.4, .6, w.y + (n2 - .5) * .3); vec2 bc = floor(p / 22.); vec3 built = mix(mix(vec3(.5,.48,.44), vec3(.58,.46,.38), vn(p / 60.)), vec3(.36,.45,.27), smoothstep(.55, .8, vn(p / 140. + 3.))) * (.9 + (h21(bc) - .5) * .12 * det);
  vec3 c = mix(field, forest, fm); c = mix(c, built, bm * (1. - fm * .5));
  c = mix(c, vec3(.2,.32,.36), smoothstep(.3, .7, w.z));
  c = mix(c, mix(vec3(.3,.46,.2), vec3(.36,.52,.23), n2), ap);
  float sl = 1. - nrm.y, rk = smoothstep(.32, .5, sl + (n2 - .5) * .15) * smoothstep(200., 320., wpos.y);
  c = mix(c, vec3(.42,.4,.37) * (.8 + n2 * .4), rk);
  c = mix(c, mix(vec3(dot(c, vec3(.33))), c, .45) * .8, smoothstep(.4, .6, w.w));
  return pow(c, vec3(2.2));   // a paletta sRGB-ben van megadva, a fényezés lineáris térben történik
}`;

function makeTerrainMat() {
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff });
  m.onBeforeCompile = s => { withWorld(s);
    s.vertexShader = 'attribute vec4 aW; attribute float aAp; varying vec4 vW; varying float vAp; varying vec3 vN;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vW = aW; vAp = aAp; vN = normal;');
    s.fragmentShader = 'varying vec4 vW; varying float vAp; varying vec3 vN;\n' + s.fragmentShader.replace('void main() {', TERRAIN_FRAG + '\nvoid main() {')
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( terrainColor(vWPos, normalize(vN), vW, vAp, length(vWPos - cameraPosition)), opacity );'); m.userData.ok = s.fragmentShader.includes('terrainColor(vWPos'); };
  m.customProgramCacheKey = () => 'terep';
  return m;
}
function makeWaterMat() {
  return new THREE.ShaderMaterial({ uniforms: { ...SU }, fog: false,
    vertexShader: LOGV_PARS + 'varying vec3 vWPos; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vWPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; ' + LOGV + '}',
    fragmentShader: LOGF_PARS + HASH + `uniform float uTime, uDay, uNight, uFogN, uFogF; uniform vec3 uSunDir, uSunCol, uSunFog, uSkyTop, uSkyHor, uFogC; varying vec3 vWPos;
      vec2 wv(vec2 p, vec2 d, float f, float sp){ float ph = dot(p, d) * f + uTime * sp; return d * cos(ph) * f; }
      void main(){ ${LOGF} vec2 p = mod(vWPos.xz, 8192.); float dist = length(vWPos - cameraPosition);
        vec2 g = wv(p, vec2(.8,.6), .09, 1.3) * .35 + wv(p, vec2(-.5,.86), .14, 1.7) * .25 + wv(p, vec2(.97,-.24), .23, 2.3) * .16 + wv(p, vec2(-.2,-.98), .37, 2.9) * .1;
        float fade = 1. - smoothstep(150., 2500., dist); g += (vec2(vn(p * .6 + uTime * .3), vn(p * .6 - uTime * .27 + 5.)) - .5) * .35 * (1. - smoothstep(60., 400., dist)); vec3 n = normalize(vec3(-g.x * fade, 1., -g.y * fade));
        vec3 v = normalize(cameraPosition - vWPos); float fres = .02 + .98 * pow(1. - max(dot(n, v), 0.), 5.);
        vec3 r = reflect(-v, n); vec3 sky = mix(uSkyHor, uSkyTop, clamp(r.y * 1.6, 0., 1.));
        vec3 deep = mix(vec3(.035,.13,.15), vec3(.06,.2,.22), vn(p / 160.)) * (.25 + .75 * uDay);
        vec3 c = mix(deep, sky, fres * .9);
        float sp = pow(max(dot(r, uSunDir), 0.), 420.) * 6. * (.3 + .7 * fade) + pow(max(dot(r, uSunDir), 0.), 40.) * .25; c += uSunCol * sp * uDay;
        float f = smoothstep(uFogN, uFogF, dist), sd = pow(max(dot(-v, uSunDir), 0.), 6.); c = mix(c, mix(uFogC, uSunFog, sd * .65), f);
        gl_FragColor = vec4(c, 1.); }` });
}

function geoMerge(parts) { let n = 0; const ng = parts.map(([g, c]) => { const x = g.index ? g.toNonIndexed() : g; n += x.attributes.position.count; return [x, c]; });
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), C = new THREE.Color(); let o = 0;
  for (const [g, c] of ng) { const p = g.attributes.position.array; pos.set(p, o * 3); C.setHex(c); for (let k = 0; k < p.length / 3; k++) col.set([C.r, C.g, C.b], (o + k) * 3); o += p.length / 3; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }
const CONIFER = () => geoMerge([[new THREE.CylinderGeometry(.3, .45, 3, 5).translate(0, 1.5, 0), 0x5b4128], [new THREE.ConeGeometry(3.2, 6.5, 7).translate(0, 5.6, 0), 0x2a4f27], [new THREE.ConeGeometry(2.4, 5, 7).translate(0, 8.8, 0), 0x33602e], [new THREE.ConeGeometry(1.4, 3.4, 7).translate(0, 11.6, 0), 0x3b6a33]]);
const DECID = () => geoMerge([[new THREE.CylinderGeometry(.3, .5, 4, 5).translate(0, 2, 0), 0x5e4630], [new THREE.IcosahedronGeometry(3.4, 0).scale(1, .85, 1).translate(0, 6.4, 0), 0x4a7a32], [new THREE.IcosahedronGeometry(2.4, 0).translate(1.6, 7.6, .8), 0x568a3a], [new THREE.IcosahedronGeometry(2.2, 0).translate(-1.4, 7.2, -1), 0x3f6e2c]]);

export function createTerrain(scene, opt) {
  const mat = makeTerrainMat(), wMat = makeWaterMat();
  const tMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  tMat.onBeforeCompile = s => { s.uniforms.uTime = SU.uTime; s.vertexShader = 'uniform float uTime;\n' + s.vertexShader.replace('#include <begin_vertex>',
    `#include <begin_vertex>
     #ifdef USE_INSTANCING
       vec4 ip = instanceMatrix * vec4(0., 0., 0., 1.);
       float sw = sin(uTime * 1.3 + ip.x * .05 + ip.z * .07) * .035 * max(0., position.y - 2.);
       transformed.x += sw; transformed.z += sw * .6;
     #endif`); };
  const geoC = CONIFER(), geoD = DECID();
  const root = new THREE.Group(); scene.add(root);
  const cache = new Map(); let frame = 0, lastSel = [1e9, 0, 0], selT = 0, shown = new Set(), want = [], queue = [], selAt = 0;
  let viewR = opt.viewR || 40000, treeR = opt.treeR ?? 5000, treeDens = opt.treeDens ?? 1;

  function build(key, size, x0, z0) {
    const step = size / N, M = N + 3, Hs = new Float32Array(M * M);
    for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) Hs[j * M + i] = ground(x0 + (i - 1) * step, z0 + (j - 1) * step);
    const NV = (N + 1) * (N + 1), total = NV + N * 4 + 4;
    const pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3), aw = new Float32Array(total * 4), ap = new Float32Array(total);
    const wat = new Uint8Array(NV), idx = [];
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const k = j * (N + 1) + i, h = Hs[(j + 1) * M + i + 1];
      const hx = Hs[(j + 1) * M + i + 2] - Hs[(j + 1) * M + i], hz = Hs[(j + 2) * M + i + 1] - Hs[j * M + i + 1], l = Math.hypot(hx, 2 * step, hz);
      const wx = x0 + i * step, wz = z0 + j * step, c = cls(wx, wz); wat[k] = c === 3 ? 1 : 0;
      pos[k * 3] = i * step; pos[k * 3 + 1] = c === 3 && size >= 8000 ? h - 2.5 : h; pos[k * 3 + 2] = j * step; nrm[k * 3] = -hx / l; nrm[k * 3 + 1] = 2 * step / l; nrm[k * 3 + 2] = -hz / l;
      aw[k * 4] = c === 1 ? 1 : 0; aw[k * 4 + 1] = c === 2 ? 1 : 0; aw[k * 4 + 2] = c === 3 ? 1 : 0; aw[k * 4 + 3] = c === 4 ? 1 : 0; ap[k] = inAirport(wx, wz) ? 1 : 0; }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    let k = NV; const sk = Math.max(25, size / 50), edgeV = [];
    for (let i = 0; i <= N; i++) edgeV.push(i); for (let j = 1; j <= N; j++) edgeV.push(j * (N + 1) + N); for (let i = N - 1; i >= 0; i--) edgeV.push(N * (N + 1) + i); for (let j = N - 1; j >= 1; j--) edgeV.push(j * (N + 1));
    const first = k; for (const e of edgeV) { pos.set([pos[e * 3], pos[e * 3 + 1] - sk, pos[e * 3 + 2]], k * 3); nrm.set([nrm[e * 3], nrm[e * 3 + 1], nrm[e * 3 + 2]], k * 3); aw.set(aw.subarray(e * 4, e * 4 + 4), k * 4); ap[k] = ap[e]; k++; }
    for (let s = 0; s < edgeV.length; s++) { const e0 = edgeV[s], e1 = edgeV[(s + 1) % edgeV.length], s0 = first + s, s1 = first + (s + 1) % edgeV.length; idx.push(e0, s0, e1, e1, s0, s1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, k * 3), 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm.subarray(0, k * 3), 3));
    g.setAttribute('aW', new THREE.BufferAttribute(aw.subarray(0, k * 4), 4)); g.setAttribute('aAp', new THREE.BufferAttribute(ap.subarray(0, k), 1)); g.setIndex(idx); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.position.set(x0, 0, z0); m.matrixAutoUpdate = false; m.updateMatrix(); m.receiveShadow = true;
    let water = null; if (size >= 8000) {  // közelben a pontos OSM-vízfelület (osm.js) látszik
     const wp = []; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, cs = [a, a + 1, a + N + 1, a + N + 2]; if (!cs.some(c => wat[c])) continue;
        let lv = 1e9; for (const c of cs) if (wat[c]) lv = Math.min(lv, Hs[(Math.floor(c / (N + 1)) + 1) * M + (c % (N + 1)) + 1]); const x = i * step, z = j * step, y = lv + .02;
        wp.push(x, y, z, x, y, z + step, x + step, y, z, x + step, y, z, x, y, z + step, x + step, y, z + step); }
      if (wp.length) { const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); wg.computeBoundingSphere(); water = new THREE.Mesh(wg, wMat); water.position.copy(m.position); water.matrixAutoUpdate = false; water.updateMatrix(); } }
    const forest = []; if (size === LEAF) for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (cls(x0 + (i + .5) * step, z0 + (j + .5) * step) === 1) forest.push(i, j);
    m.userData = { key, size, x0, z0, forest };
    return { mesh: m, water, trees: null, used: frame };
  }
  const IM = new THREE.Matrix4(), IQ = new THREE.Quaternion(), IS = new THREE.Vector3(), IP = new THREE.Vector3(), IY = new THREE.Vector3(0, 1, 0), IC = new THREE.Color();
  function addTrees(e) { const u = e.mesh.userData; if (!u.forest.length || e.trees) return;
    const step = u.size / N, per = Math.round(4 * treeDens), cnt = Math.min(1800, u.forest.length / 2 * per); if (cnt <= 0) return;
    const ims = [new THREE.InstancedMesh(geoC, tMat, cnt), new THREE.InstancedMesh(geoD, tMat, cnt)], k = [0, 0];
    for (let f = 0; f < u.forest.length; f += 2) { const i = u.forest[f], j = u.forest[f + 1];
      for (let t = 0; t < per; t++) { const rx = hash2(i * 31 + t, j * 17 + u.x0), rz = hash2(j * 29 + t, i * 13 + u.z0), lx = (i + rx) * step, lz = (j + rz) * step, wx = u.x0 + lx, wz = u.z0 + lz;
        if (inAirport(wx, wz)) continue; const h = ground(wx, wz), sp = h > 420 ? (hash2(lx, t) < .7 ? 0 : 1) : (hash2(lx, t) < .3 ? 0 : 1), im = ims[sp]; if (k[sp] >= cnt) continue;
        const s = .65 + hash2(lx, lz) * .9; IQ.setFromAxisAngle(IY, rx * 6.28); IS.set(s, s * (.75 + rz * .6), s); IP.set(lx, h - .3, lz); IM.compose(IP, IQ, IS); im.setMatrixAt(k[sp], IM);
        IC.setHSL(.24 + (hash2(t, lz) - .5) * .08, .35 + hash2(lz, t) * .2, .75 + hash2(i, t) * .5); im.setColorAt(k[sp], IC); k[sp]++; } }
    e.trees = []; ims.forEach((im, n) => { im.count = k[n]; if (!k[n]) return; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); im.position.copy(e.mesh.position); im.matrixAutoUpdate = false; im.updateMatrix(); im.visible = e.mesh.visible; root.add(im); e.trees.push(im); }); }
  function dropTrees(e) { if (!e.trees) return; for (const t of e.trees) { root.remove(t); t.dispose(); } e.trees = null; }
  function setVis(e, on) { e.mesh.visible = on; if (e.water) e.water.visible = on; if (e.trees) for (const t of e.trees) t.visible = on; }
  function dispose(e) { root.remove(e.mesh); e.mesh.geometry.dispose(); if (e.water) { root.remove(e.water); e.water.geometry.dispose(); } dropTrees(e); }
  function select(cx, cy, cz) { const out = [], R = viewR;
    const rx0 = Math.floor((cx - R) / ROOT), rx1 = Math.floor((cx + R) / ROOT), rz0 = Math.floor((cz - R) / ROOT), rz1 = Math.floor((cz + R) / ROOT);
    const visit = (size, x0, z0) => { const mx = x0 + size / 2, mz = z0 + size / 2, dx = Math.max(0, Math.abs(cx - mx) - size / 2), dz = Math.max(0, Math.abs(cz - mz) - size / 2), d = Math.hypot(dx, dz, Math.max(0, cy - 600) * .7);
      if (d > R) return; if (size > LEAF && d < size * 1.25) { const h = size / 2; visit(h, x0, z0); visit(h, x0 + h, z0); visit(h, x0, z0 + h); visit(h, x0 + h, z0 + h); } else out.push([size + ':' + x0 + ':' + z0, size, x0, z0, d]); };
    for (let rz = rz0; rz <= rz1; rz++) for (let rx = rx0; rx <= rx1; rx++) visit(ROOT, rx * ROOT, rz * ROOT);
    return out.sort((a, b) => a[4] - b[4]); }
  function insert(v) { const [key, size, x0, z0] = v, old = cache.get(key), e = build(key, size, x0, z0); const wasShown = shown.has(key);
    if (old) dispose(old); setVis(e, wasShown); root.add(e.mesh); if (e.water) root.add(e.water); cache.set(key, e); return e; }
  // atomi csere: csak akkor váltunk, ha a kívánt csonkok mind készen vannak
  function swap() { const keys = new Set(want.map(v => v[0])); for (const k of shown) if (!keys.has(k)) { const e = cache.get(k); if (e) setVis(e, false); }
    for (const k of keys) { const e = cache.get(k); if (e) { setVis(e, true); e.used = frame; e.dirty = false; } } shown = keys; }
  function update(cam, dt) { frame++; SU.uTime.value += dt;
    const p = cam.position; selT -= dt;
    if (!queue.length && (selT <= 0 || Math.hypot(p.x - lastSel[0], p.z - lastSel[2]) > 300 || Math.abs(p.y - lastSel[1]) > 300)) { selT = .3; lastSel = [p.x, p.y, p.z];
      want = select(p.x, p.y, p.z); queue = want.filter(v => { const e = cache.get(v[0]); return !e || e.dirty; }); selAt = performance.now();
      if (!queue.length) swap(); }
    if (queue.length) { const t0 = performance.now(), force = frame < 3 || t0 - selAt > 1200 || shown.size === 0;
      while (queue.length && (force || performance.now() - t0 < 5)) insert(queue.shift());
      if (!queue.length) swap(); }
    if (frame % 4 === 0) for (const v of want) { const e = cache.get(v[0]); if (!e || !e.mesh.visible) continue; if (v[1] === LEAF && v[4] < treeR && treeR > 0) { if (!e.trees) { addTrees(e); break; } } else if (e.trees && v[4] > treeR * 1.3) dropTrees(e); }
    if (frame % 90 === 0 && cache.size > 260) { const arr = [...cache.entries()].filter(([k]) => !shown.has(k)).sort((a, b) => a[1].used - b[1].used); for (let i = 0; i < arr.length && cache.size > 220; i++) { dispose(arr[i][1]); cache.delete(arr[i][0]); } }
  }
  onTile(b => { clearGridCache(b); for (const e of cache.values()) { const u = e.mesh.userData; if (u.x0 < b[2] + 200 && u.x0 + u.size > b[0] - 200 && u.z0 < b[3] + 200 && u.z0 + u.size > b[1] - 200) e.dirty = true; } selT = 0; });
  return { update, root, waterMat: wMat, set(o) { if (o.viewR) viewR = o.viewR; if (o.treeR !== undefined) treeR = o.treeR; if (o.treeDens !== undefined && o.treeDens !== treeDens) { treeDens = o.treeDens; for (const e of cache.values()) dropTrees(e); } selT = 0; },
    stats: () => ({ chunks: shown.size, cached: cache.size, queue: queue.length }), rebuildAll() { clearGridCache(); for (const e of cache.values()) e.dirty = true; selT = 0; } };
}
