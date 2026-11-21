/* Vízpermet: részecskék (egyetlen Points-hívás), a földet érve „nedves folt” a talajon és találat a küldetésnek.
   Géptípusonként: fúvókasor (szárny alatti cső), rámpa (egy tömbben), vízzsák (a zsák alól), felhőöntözés (nagy magasságból szétterül). */
import * as THREE from 'three';
import { ground, isWater } from './geo.js?v=202611212314';

export function createSpray(scene, max = 1200) {
  const pos = new Float32Array(max * 3), vel = new Float32Array(max * 3), life = new Float32Array(max), vol = new Float32Array(max), rad = new Float32Array(max), size = new Float32Array(max);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('sz', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { k: { value: 600 } },
    vertexShader: 'attribute float sz; uniform float k; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = clamp(sz * k / -mv.z, 0., 64.); vA = step(.01, sz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying float vA; void main(){ vec2 d = gl_PointCoord - .5; float r = dot(d, d); if (r > .25) discard; gl_FragColor = vec4(.82, .93, 1., (1. - r * 4.) * .55 * vA); }' });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 3; scene.add(pts);
  // nedves foltok a talajon (instancolt korong)
  const SN = 500, sGeo = new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2), sMat = new THREE.MeshBasicMaterial({ color: 0x2f5f3a, transparent: true, opacity: .42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6 });
  const splats = new THREE.InstancedMesh(sGeo, sMat, SN); splats.count = 0; splats.frustumCulled = false; splats.renderOrder = 1; scene.add(splats); let sIdx = 0;
  const SM = new THREE.Matrix4(), SQ = new THREE.Quaternion(), SS = new THREE.Vector3(), SP = new THREE.Vector3(), origin = new THREE.Vector3();
  let n = 0, cursor = 0, acc = 0, total = 0; const T = new THREE.Vector3();
  function spawn(x, y, z, vx, vy, vz, v, r, s) { const i = cursor; cursor = (cursor + 1) % max; if (life[i] <= 0) n++; pos[i * 3] = x - origin.x; pos[i * 3 + 1] = y - origin.y; pos[i * 3 + 2] = z - origin.z;
    vel[i * 3] = vx; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = vz; life[i] = 40; vol[i] = v; rad[i] = r; size[i] = s; }
  /* kibocsátás: b = test, model, dt; mennyi liter/s; visszaadja a kiengedett mennyiséget */
  function emit(b, model, dt, rate, qual) { const gep = b.gep; if (b.water <= 0) return 0;
    const lit = Math.min(b.water, rate * dt); b.water -= lit; total += lit;
    const speed = b.vel.length(), spread = gep.szoras * (1 + Math.max(0, speed - 40) / 60) * (gep.felho && b.agl > 300 ? 6 : 1);
    const pts = b.bucket ? null : model.spray, want = (gep.ramp ? 260 : 140) * qual * dt; acc += want; let k = Math.floor(acc); acc -= k; k = Math.max(k, 1);
    const per = lit / k, r = Math.max(2.5, gep.perm / Math.max(1, pts ? pts.length : 1) * .9) * (gep.felho && b.agl > 300 ? 2.2 : 1);
    for (let j = 0; j < k; j++) { let x, y, z;
      if (b.bucket) { x = b.bucket.p.x; y = b.bucket.p.y - 1; z = b.bucket.p.z; }
      else { const p = pts[(Math.random() * pts.length) | 0]; T.set(p[0], p[1], p[2]).applyQuaternion(b.q).add(b.pos); x = T.x; y = T.y; z = T.z; }
      const vx = b.vel.x + (Math.random() - .5) * 4 * spread, vy = b.vel.y - 2 - Math.random() * 3, vz = b.vel.z + (Math.random() - .5) * 4 * spread;
      spawn(x, y, z, vx, vy, vz, per, b.bucket ? gep.perm * .6 : r, gep.ramp || b.bucket ? 3.2 : 1.6); }
    return lit; }
  // közvetlen kiöntés (pl. zsák kiürítése egyben)
  function update(dt, wind, onHit, cam) {
    // a részecskék a kamera közelében lévő origóhoz képest tárolódnak (lebegőpontos pontosság)
    if (cam && cam.position.distanceTo(origin) > 4000) { const dx = cam.position.x - origin.x, dy = cam.position.y - origin.y, dz = cam.position.z - origin.z; for (let i = 0; i < max; i++) if (life[i] > 0) { pos[i * 3] -= dx; pos[i * 3 + 1] -= dy; pos[i * 3 + 2] -= dz; } origin.copy(cam.position); }
    pts.position.copy(origin);
    for (let i = 0; i < max; i++) { if (life[i] <= 0) continue; life[i] -= dt;
      const k = Math.min(1, dt * 1.1); vel[i * 3] += (wind.x - vel[i * 3]) * k; vel[i * 3 + 2] += (wind.z - vel[i * 3 + 2]) * k; vel[i * 3 + 1] += (-12 - vel[i * 3 + 1]) * Math.min(1, dt * .9) - 9.81 * dt * .2;
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      const x = pos[i * 3] + origin.x, y = pos[i * 3 + 1] + origin.y, z = pos[i * 3 + 2] + origin.z, h = ground(x, z);
      if (y <= h + .3 || life[i] <= 0) { if (life[i] > 0) { onHit(x, z, vol[i], rad[i]); if (!isWater(x, z) && Math.random() < .35) splat(x, h, z, rad[i]); } life[i] = 0; size[i] = 0; n--; } }
    g.attributes.position.needsUpdate = true; g.attributes.sz.needsUpdate = true; }
  function splat(x, y, z, r) { const s = Math.max(3, r * (.7 + Math.random() * .6)); SQ.identity(); SS.set(s, 1, s); SP.set(x, y + .35, z); SM.compose(SP, SQ, SS); splats.setMatrixAt(sIdx, SM); sIdx = (sIdx + 1) % SN; splats.count = Math.max(splats.count, sIdx); splats.instanceMatrix.needsUpdate = true; }
  function clear() { life.fill(0); size.fill(0); n = 0; splats.count = 0; sIdx = 0; splats.instanceMatrix.needsUpdate = true; total = 0; }
  return { emit, update, clear, setScale(k) { mat.uniforms.k.value = k; }, get count() { return n; }, get total() { return total; }, resetTotal() { total = 0; } };
}
