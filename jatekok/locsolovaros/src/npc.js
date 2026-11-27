// Járókelők: instanced testrészek, a járdahálózaton sétálnak, zebrán kelnek át; eláznak, elesnek, felállnak és elfutnak.
import * as THREE from 'three';
import * as W from './world.js?v=202611270914';

const H = W.ROADW / 2 + 1.6;
const SKIN = [0xf0c8a8, 0xe0b08a, 0xc89070, 0x9a6a4a, 0x6a4a32], SHIRT = [0xc0392b, 0x2a6fd1, 0x27ae60, 0xf2c230, 0x8e44ad, 0xe8e8e8, 0x2c3e50, 0xd35400, 0x16a085, 0x7f8c8d, 0xe84393, 0x6c5ce7],
  PANTS = [0x2c3440, 0x34495e, 0x5d4037, 0x1b1b1f, 0x3a5a8a, 0x6a6a5a], HAIR = [0x1b1410, 0x3b2a1c, 0x8a5a2a, 0xc0a060, 0x9a9a9a, 0x5a2010];
function neighbor(n, dx, dz) { return n.n.find(m => !m.hw && m.x === n.x + dx * W.PITCH && m.z === n.z + dz * W.PITCH); }
export function createPeds(scene) {
  const MAX = 64, parts = {
    torso: [new THREE.CapsuleGeometry(.19, .34, 3, 8).scale(1.15, 1, .72), 1], hips: [new THREE.CapsuleGeometry(.17, .1, 3, 8).scale(1.15, 1, .75), 1], head: [new THREE.SphereGeometry(.12, 10, 8).scale(.95, 1.1, 1), 1],
    hair: [new THREE.SphereGeometry(.127, 10, 6, 0, Math.PI * 2, 0, 1.4), 1], leg: [new THREE.CapsuleGeometry(.08, .62, 3, 8), 2], arm: [new THREE.CapsuleGeometry(.06, .5, 3, 6), 2] };
  const IM = {}, mat = new THREE.MeshStandardMaterial({ roughness: .75 });
  for (const k in parts) { const [g, n] = parts[k]; if (k === 'leg' || k === 'arm') g.translate(0, -(k === 'leg' ? .39 : .31), 0); const im = new THREE.InstancedMesh(g, mat, MAX * n); im.count = 0; im.castShadow = true; im.frustumCulled = false;
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * n * 3), 3); scene.add(im); IM[k] = im; }
  const peds = [], rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const C = new THREE.Color();
  function spawn(px, pz) { // véletlen járdasarok a játékostól 50–140 m-re
    for (let tries = 0; tries < 12; tries++) { const a = rnd() * Math.PI * 2, d = 50 + rnd() * 90, x = Math.round((px + Math.cos(a) * d + W.HALF) / W.PITCH) * W.PITCH - W.HALF, z = Math.round((pz + Math.sin(a) * d + W.HALF) / W.PITCH) * W.PITCH - W.HALF;
      const n = W.nodeAt(x, z); if (!n || n.hw || !n.n.length) continue; if (W.district(x + 1, z + 1) === 'folyo' && rnd() < .7) continue;
      const p = { n, cx: rnd() < .5 ? -1 : 1, cz: rnd() < .5 ? -1 : 1, x: 0, z: 0, y: 0, yaw: 0, tx: 0, tz: 0, sp: 1.1 + rnd() * .5, st: 'walk', t: 0, ph: rnd() * 6, soak: 0, fleeX: 0, fleeZ: 0,
        col: [pick(SKIN), pick(SHIRT), pick(PANTS), pick(HAIR)], h: .92 + rnd() * .16, prev: null };
      p.x = n.x + p.cx * H; p.z = n.z + p.cz * H; nextTarget(p); peds.push(p); return p; } return null; }
  function nextTarget(p) {
    const opts = [], n = p.n;
    { const m = neighbor(n, p.cx, 0); if (m) opts.push(['m', m, -p.cx, p.cz]); }
    { const m = neighbor(n, 0, p.cz); if (m) opts.push(['m', m, p.cx, -p.cz]); }
    if (neighbor(n, 0, 1) || neighbor(n, 0, -1)) opts.push(['c', n, -p.cx, p.cz]);
    if (neighbor(n, 1, 0) || neighbor(n, -1, 0)) opts.push(['c', n, p.cx, -p.cz]);
    let o = opts.filter(q => !(p.prev && q[1] === p.prev.n && q[2] === p.prev.cx && q[3] === p.prev.cz)); if (!o.length) o = opts; if (!o.length) { p.dead = 1; return; }
    const ch = o[Math.floor(rnd() * o.length)]; p.prev = { n: p.n, cx: p.cx, cz: p.cz }; p.n = ch[1]; p.cx = ch[2]; p.cz = ch[3]; p.cross = ch[0] === 'c';
    p.tx = p.n.x + p.cx * H + (rnd() - .5) * .8; p.tz = p.n.z + p.cz * H + (rnd() - .5) * .8;
  }
  const m4 = new THREE.Matrix4(), base = new THREE.Matrix4(), tmp = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1);
  const api = { list: peds, scare(x, z, r, src) { for (const p of peds) if (p.st === 'walk' && (p.x - x) ** 2 + (p.z - z) ** 2 < r * r) { p.st = 'flee'; p.t = 6 + rnd() * 4; p.fleeX = p.x - x; p.fleeZ = p.z - z; } },
    soak(p, dx, dz, k = 1) { p.soak = Math.min(1, p.soak + .35 * k); if (p.st !== 'down') { p.st = 'down'; p.t = 3.5 + rnd() * 1.5; p.fleeX = dx; p.fleeZ = dz; p.yaw = Math.atan2(dx, dz) + Math.PI; } },
    spawnAt(x, z, flee) { const p = spawn(x, z); if (p) { p.x = x; p.z = z; if (flee) { p.st = 'flee'; p.t = 8; p.fleeX = rnd() - .5; p.fleeZ = rnd() - .5; } } return p; },
    update(dt, px, pz, maxN, env) {
      for (let i = peds.length - 1; i >= 0; i--) { const p = peds[i]; if (p.dead || Math.abs(p.x - px) > 190 || Math.abs(p.z - pz) > 190) peds.splice(i, 1); }
      let need = maxN - peds.length; while (need-- > 0 && peds.length < MAX) if (!spawn(px, pz)) break;
      for (const p of peds) {
        p.t -= dt;
        if (p.st === 'down') { if (p.t <= 0) { p.st = 'getup'; p.t = .9; } }
        else if (p.st === 'getup') { if (p.t <= 0) { p.st = 'flee'; p.t = 7; } }
        else { const run = p.st === 'flee', sp = run ? 5.2 : p.sp; let dx, dz;
          if (run) { const l = Math.hypot(p.fleeX, p.fleeZ) || 1; dx = p.fleeX / l; dz = p.fleeZ / l; if (p.t <= 0) { p.st = 'walk'; const n = W.nearestNode(p.x, p.z); p.n = n; p.cx = p.x > n.x ? 1 : -1; p.cz = p.z > n.z ? 1 : -1; p.tx = n.x + p.cx * H; p.tz = n.z + p.cz * H; p.prev = null; } }
          else { dx = p.tx - p.x; dz = p.tz - p.z; const l = Math.hypot(dx, dz); if (l < .6) { nextTarget(p); continue; } dx /= l; dz /= l;
            // zebrán: piros/autó esetén vár
            if (p.cross && env.carNear?.(p.x + dx * 3, p.z + dz * 3, 5)) { p.wait = .5; } }
          if (p.wait > 0) { p.wait -= dt; p.ph += dt * 1.5; continue; }
          // a játékos kikerülése
          const ox = p.x - px, oz = p.z - pz, od = Math.hypot(ox, oz); if (od < 1.2 && od > .01 && !run) { dx += ox / od * .8; dz += oz / od * .8; }
          const nx = p.x + dx * sp * dt, nz = p.z + dz * sp * dt; const P = V.set(nx, 0, nz); W.pushCircle(P, .3, (p.y || 0) + .1, 1.6); p.x = P.x; p.z = P.z;
          if (W.inRiver(p.x, p.z)) { p.x -= dx * sp * dt * 2; p.z -= dz * sp * dt * 2; p.fleeX = -p.fleeX; p.fleeZ = -p.fleeZ; }
          const ty = Math.atan2(-dx, -dz); let d = ty - p.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); p.yaw += d * Math.min(1, dt * 8); p.ph += dt * (run ? 11 : 6.5) * (run ? 1 : p.sp / 1.3); }
        p.y = W.surfaceY(p.x, p.z, (p.y || 0) + .5, .7); p.soak = Math.max(0, p.soak - dt * .03);
      }
      // rajzolás
      const cnt = { torso: 0, hips: 0, head: 0, hair: 0, leg: 0, arm: 0 };
      const put = (k, M, col, wet) => { const im = IM[k], i = cnt[k]++; im.setMatrixAt(i, M); C.setHex(col); if (wet) C.multiplyScalar(1 - wet * .45); im.setColorAt(i, C); };
      for (const p of peds) { const s = Math.sin(p.ph), c = Math.cos(p.ph), run = p.st === 'flee', amp = p.st === 'walk' ? .45 : run ? .9 : 0;
        base.compose(V.set(p.x, p.y, p.z), q.setFromEuler(e.set(0, p.yaw, 0)), S.set(p.h, p.h, p.h));
        if (p.st === 'down') base.multiply(tmp.makeTranslation(0, .16, 0)).multiply(tmp.makeRotationX(-Math.PI / 2));
        else if (p.st === 'getup') base.multiply(tmp.makeTranslation(0, .16 * p.t / .9, 0)).multiply(tmp.makeRotationX(-Math.PI / 2 * p.t / .9));
        const wet = p.soak, [sk, sh, pa, ha] = p.col, bob = Math.abs(c) * amp * .05;
        put('hips', m4.copy(base).multiply(tmp.makeTranslation(0, .97 + bob, 0)), pa, wet);
        put('torso', m4.copy(base).multiply(tmp.makeTranslation(0, 1.3 + bob, 0)).multiply(tmp.makeRotationX(run ? -.15 : 0)), sh, wet);
        put('head', m4.copy(base).multiply(tmp.makeTranslation(0, 1.78 + bob, 0)), sk, 0); put('hair', m4.copy(base).multiply(tmp.makeTranslation(0, 1.81 + bob, .01)), ha, wet);
        for (const sd of [-1, 1]) { put('leg', m4.copy(base).multiply(tmp.makeTranslation(sd * .1, .95 + bob, 0)).multiply(tmp.makeRotationX(s * amp * sd)), pa, wet);
          put('arm', m4.copy(base).multiply(tmp.makeTranslation(sd * .27, 1.55 + bob, 0)).multiply(tmp.makeRotationX(p.st === 'down' ? -2.6 : -s * amp * .8 * sd + (run ? -.3 : 0))).multiply(tmp.makeRotationZ(sd * .08)), sh, wet); } }
      for (const k in IM) { IM[k].count = cnt[k]; IM[k].instanceMatrix.needsUpdate = true; if (IM[k].instanceColor) IM[k].instanceColor.needsUpdate = true; }
    },
    clear() { peds.length = 0; }
  };
  return api;
}
