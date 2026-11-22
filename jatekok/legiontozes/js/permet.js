/* Vízpermet két rétegben:
   - „cseppek”: ezek viszik a vizet, a földet érve találatot adnak a küldetésnek (és nedves foltot hagynak);
   - „pára”: csak látvány – puha szélű, élettartama alatt táguló, napfénnyel árnyalt fehéres-kék részecskék, amelyek a gép mögött
     hosszan lebegő függönyként sodródnak a széllel és lassan ülepednek; földet érve fröccsenő pára.
   Géptípusonként: fúvókasor (keskeny, egyenletes függöny), rámpa (egy tömbben zúduló víz), vízzsák (zuhatag nagy cseppekkel),
   felhőöntözés (széles, szétterülő pára). Minden részecske egyetlen rajzhívás, a kamera közelében lévő origóhoz képest tárolva. */
import * as THREE from 'three';
import { ground, isWater } from './geo.js?v=202611221437';
import { SU, LOGV_PARS, LOGV, LOGF_PARS, LOGF } from './kozos.js?v=202611221437';

export function createSpray(scene, max = 1200, mistMax = 6000) {
  const origin = new THREE.Vector3();
  const dp = new Float32Array(max * 3), dv = new Float32Array(max * 3), dl = new Float32Array(max), dvol = new Float32Array(max), drad = new Float32Array(max), dkind = new Uint8Array(max);
  let dCur = 0, dN = 0;
  const P = mistMax, mp = new Float32Array(P * 3), mv = new Float32Array(P * 3), ma = new Float32Array(P), mlife = new Float32Array(P), mfall = new Float32Array(P);
  const aD = new Float32Array(P * 4);   // kor (0–1), kezdő méret, végső méret, átlátszóság
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(mp, 3)); g.setAttribute('aD', new THREE.BufferAttribute(aD, 4));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { k: { value: 600 }, uSunCol: SU.uSunCol, uDay: SU.uDay },
    vertexShader: LOGV_PARS + 'attribute vec4 aD; uniform float k; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); float t = aD.x; float s = mix(aD.y, aD.z, sqrt(t)); gl_PointSize = clamp(s * k / -mv.z, 0., 140.); vA = aD.w * (1. - t) * smoothstep(0., .06, t) * step(.001, aD.y) * smoothstep(6., 30., -mv.z); gl_Position = projectionMatrix * mv; ' + LOGV + '}',
    fragmentShader: LOGF_PARS + 'uniform vec3 uSunCol; uniform float uDay; varying float vA; void main(){ ' + LOGF + ' vec2 d = gl_PointCoord - .5; float r = dot(d, d) * 4.; if (r > 1. || vA <= .002) discard; float a = (1. - r) * (1. - r) * vA;\n float lit = .55 + .45 * clamp(.5 - d.y * 1.2 + d.x * .3, 0., 1.); vec3 c = mix(vec3(.62,.75,.86), vec3(.95,.98,1.), lit) * (.35 + .75 * uDay) + uSunCol * .08 * uDay; gl_FragColor = vec4(c, a); }' });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 3; scene.add(pts);
  let mCur = 0;
  function mist(x, y, z, vx, vy, vz, life, s0, s1, a, fall) { const i = mCur; mCur = (mCur + 1) % P; mp[i * 3] = x - origin.x; mp[i * 3 + 1] = y - origin.y; mp[i * 3 + 2] = z - origin.z; mv[i * 3] = vx; mv[i * 3 + 1] = vy; mv[i * 3 + 2] = vz; ma[i] = 0; mlife[i] = life; mfall[i] = fall; aD[i * 4] = 0; aD[i * 4 + 1] = s0; aD[i * 4 + 2] = s1; aD[i * 4 + 3] = a; }
  const SN = 700, sGeo = new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2), sMat = new THREE.MeshLambertMaterial({ color: 0x24502c, transparent: true, opacity: .55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6 });
  const splats = new THREE.InstancedMesh(sGeo, sMat, SN); splats.count = 0; splats.frustumCulled = false; splats.renderOrder = 1; splats.receiveShadow = true; scene.add(splats); let sIdx = 0;
  const SM = new THREE.Matrix4(), SQ = new THREE.Quaternion(), SS = new THREE.Vector3(), SP = new THREE.Vector3(), T = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  let acc = 0, accM = 0, total = 0, qual = 1;

  function emit(b, model, dt, rate, q) { const gep = b.gep; if (b.water <= 0) return 0; qual = q;
    const lit = Math.min(b.water, rate * dt); b.water -= lit; total += lit;
    const kind = b.bucket ? 'zsak' : gep.ramp ? 'ramp' : gep.felho && b.agl > 300 ? 'felho' : 'fuvoka', big = kind === 'ramp' || kind === 'zsak';
    const speed = b.vel.length(), spread = gep.szoras * (1 + Math.max(0, speed - 40) / 60) * (kind === 'felho' ? 6 : 1);
    const sp2 = b.bucket ? null : model.spray, nE = sp2 ? sp2.length : 1;
    const src = () => { if (b.bucket) return T.set(b.bucket.p.x + (Math.random() - .5) * 2, b.bucket.p.y - 1, b.bucket.p.z + (Math.random() - .5) * 2); const p = sp2[(Math.random() * nE) | 0]; return T.set(p[0] + (Math.random() - .5) * .4, p[1], p[2]).applyQuaternion(b.q).add(b.pos); };
    acc += (big ? 220 : 150) * Math.max(.5, q) * dt; let k = Math.floor(acc); acc -= k; k = Math.max(k, 1);
    const per = lit / k, r = kind === 'zsak' ? gep.perm * .6 : Math.max(2.5, gep.perm / nE * .9) * (kind === 'felho' ? 2.2 : 1);
    for (let j = 0; j < k; j++) { const s = src(), i = dCur; dCur = (dCur + 1) % max; if (dl[i] <= 0) dN++;
      dp[i * 3] = s.x; dp[i * 3 + 1] = s.y; dp[i * 3 + 2] = s.z; dv[i * 3] = b.vel.x * (kind === 'ramp' ? .9 : .97) + (Math.random() - .5) * 4 * spread; dv[i * 3 + 1] = b.vel.y - (big ? 4 : 2) - Math.random() * 3; dv[i * 3 + 2] = b.vel.z * (kind === 'ramp' ? .9 : .97) + (Math.random() - .5) * 4 * spread;
      dl[i] = 40; dvol[i] = per; drad[i] = r; dkind[i] = big ? 1 : 0; }
    const mRate = (kind === 'felho' ? 520 : kind === 'ramp' ? 420 : kind === 'zsak' ? 300 : 340) * q * Math.min(1.6, .6 + Math.sqrt(gep.perm / 20) * .5);
    accM += mRate * dt; const km = Math.floor(accM); accM -= km;
    for (let j = 0; j < km; j++) { const s = src(), sp = spread * (kind === 'fuvoka' ? 1.1 : 2.2);
      mist(s.x, s.y, s.z, b.vel.x * (big ? .85 : .9) + (Math.random() - .5) * 3 * sp, b.vel.y - (big ? 5 : 1.2) - Math.random() * (big ? 4 : 1.5), b.vel.z * (big ? .85 : .9) + (Math.random() - .5) * 3 * sp,
        kind === 'felho' ? 9 + Math.random() * 6 : big ? 2.5 + Math.random() * 2 : 4.5 + Math.random() * 4,
        big ? 2.4 + Math.random() * 1.6 : kind === 'felho' ? 6 : 1.6 + gep.perm * .03, big ? 7 + Math.random() * 6 : kind === 'felho' ? 30 + Math.random() * 20 : 6 + gep.perm * .25 + Math.random() * 5,
        big ? .75 : kind === 'felho' ? .35 : .5, big ? 9 : kind === 'felho' ? 1.4 : 2.2); }
    return lit; }

  function update(dt, wind, onHit, cam) {
    if (cam && cam.position.distanceTo(origin) > 3000) { const dx = cam.position.x - origin.x, dy = cam.position.y - origin.y, dz = cam.position.z - origin.z; for (let i = 0; i < P; i++) { mp[i * 3] -= dx; mp[i * 3 + 1] -= dy; mp[i * 3 + 2] -= dz; } origin.copy(cam.position); }
    pts.position.copy(origin);
    for (let i = 0; i < max; i++) { if (dl[i] <= 0) continue; dl[i] -= dt;
      const k = Math.min(1, dt * (dkind[i] ? .5 : 1.1)); dv[i * 3] += (wind.x - dv[i * 3]) * k; dv[i * 3 + 2] += (wind.z - dv[i * 3 + 2]) * k; dv[i * 3 + 1] += ((dkind[i] ? -20 : -12) - dv[i * 3 + 1]) * Math.min(1, dt * .9) - 9.81 * dt * .2;
      dp[i * 3] += dv[i * 3] * dt; dp[i * 3 + 1] += dv[i * 3 + 1] * dt; dp[i * 3 + 2] += dv[i * 3 + 2] * dt;
      const x = dp[i * 3], y = dp[i * 3 + 1], z = dp[i * 3 + 2], h = ground(x, z);
      if (y <= h + .3 || dl[i] <= 0) { if (dl[i] > 0) { onHit(x, z, dvol[i], drad[i]); const w = isWater(x, z);
          if (!w && Math.random() < .3) splat(x, h, z, drad[i]);
          if (Math.random() < .35 * qual) mist(x, h + .5, z, wind.x * .5 + (Math.random() - .5) * 3, 1 + Math.random() * 1.5, wind.z * .5 + (Math.random() - .5) * 3, 1.2 + Math.random(), 2, 7 + drad[i] * .3, w ? .5 : .35, -.3); }
        dl[i] = 0; dN--; } }
    for (let i = 0; i < P; i++) { if (aD[i * 4 + 1] <= 0) continue; ma[i] += dt; const t = ma[i] / mlife[i]; if (t >= 1) { aD[i * 4 + 1] = 0; continue; }
      const k = Math.min(1, dt * (mfall[i] > 5 ? .6 : 1.4)); mv[i * 3] += (wind.x - mv[i * 3]) * k; mv[i * 3 + 2] += (wind.z - mv[i * 3 + 2]) * k; mv[i * 3 + 1] += (-mfall[i] - mv[i * 3 + 1]) * Math.min(1, dt * 1.2);
      mp[i * 3] += mv[i * 3] * dt; mp[i * 3 + 1] += mv[i * 3 + 1] * dt; mp[i * 3 + 2] += mv[i * 3 + 2] * dt;
      if ((i & 3) === (mCur & 3)) { const h = ground(mp[i * 3] + origin.x, mp[i * 3 + 2] + origin.z) - origin.y + .4; if (mp[i * 3 + 1] < h) { mp[i * 3 + 1] = h; mv[i * 3 + 1] = 0; mfall[i] = Math.min(mfall[i], .2); } }
      aD[i * 4] = t; }
    g.attributes.position.needsUpdate = true; g.attributes.aD.needsUpdate = true; }
  function splat(x, y, z, r) { const s = Math.max(3, r * (.8 + Math.random() * .7)); SQ.setFromAxisAngle(Y, Math.random() * 6.28); SS.set(s, 1, s * (.7 + Math.random() * .5)); SP.set(x, y + .35, z); SM.compose(SP, SQ, SS); splats.setMatrixAt(sIdx, SM); sIdx = (sIdx + 1) % SN; splats.count = Math.max(splats.count, sIdx); splats.instanceMatrix.needsUpdate = true; }
  function clear() { dl.fill(0); dN = 0; for (let i = 0; i < P; i++) aD[i * 4 + 1] = 0; g.attributes.aD.needsUpdate = true; splats.count = 0; sIdx = 0; splats.instanceMatrix.needsUpdate = true; total = 0; }
  return { emit, update, clear, setScale(k) { mat.uniforms.k.value = k; }, get count() { return dN; }, get total() { return total; }, resetTotal() { total = 0; } };
}
