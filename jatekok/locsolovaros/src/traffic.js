// Forgalom: AI-sofőrök sávkövetéssel, lámpákkal, követési távolsággal; villamos a Fő utcán; általános „vezess oda” AI (üldözés, verseny).
import * as THREE from 'three';
import * as W from './world.js?v=202611271349';
import { makeVehicle, stepVehicle } from './physics.js?v=202611271349';
import { TRAFFIC_TYPES, VEH, mat } from './vehicles.js?v=202611271349';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export function laneOff(hw) { return hw ? 5.5 : 3.5; }
/* útvonalpontok egy csomópont-szakaszhoz: A→B, majd B-ben fordulás C felé */
function legPoints(A, B, C) {
  const off = laneOff(A.hw && B.hw), d1x = Math.sign(B.x - A.x), d1z = Math.sign(B.z - A.z), r1x = -d1z, r1z = d1x, pts = [];
  const enter = B.hw ? 14 : 9; pts.push({ x: B.x - d1x * enter + r1x * off, z: B.z - d1z * enter + r1z * off, stop: B, ax: d1x ? 'x' : 'z' });
  if (C) { const d2x = Math.sign(C.x - B.x), d2z = Math.sign(C.z - B.z), r2x = -d2z, r2z = d2x, off2 = laneOff(B.hw && C.hw);
    if (d2x === d1x && d2z === d1z) pts.push({ x: B.x + r1x * off, z: B.z + r1z * off }); else if (d2x === -d1x && d2z === -d1z) { pts.push({ x: B.x + d1x * 4 + r1x * off, z: B.z + d1z * 4 + r1z * off }); pts.push({ x: B.x + d1x * 4 - r1x * off, z: B.z + d1z * 4 - r1z * off }); }
    else { const cx = B.x + r1x * off + r2x * off2, cz = B.z + r1z * off + r2z * off2; pts.push({ x: (cx + B.x - d1x * enter + r1x * off) / 2 * .4 + cx * .6, z: (cz + B.z - d1z * enter + r1z * off) / 2 * .4 + cz * .6 }); pts.push({ x: (cx + B.x + d2x * enter + r2x * off2) / 2 * .4 + cx * .6, z: (cz + B.z + d2z * enter + r2z * off2) / 2 * .4 + cz * .6 }); }
    pts.push({ x: B.x + d2x * enter + r2x * off2, z: B.z + d2z * enter + r2z * off2 }); }
  return pts;
}
/* kormány/gáz egy célpont felé – minden AI ugyanezt használja */
export function steerTo(b, tx, tz, vDes) {
  const fx = -Math.sin(b.yaw), fz = -Math.cos(b.yaw), dx = tx - b.pos.x, dz = tz - b.pos.z, ang = Math.atan2(fz * dx - fx * dz, fx * dx + fz * dz);
  const v = b.vf, I = { thr: 0, brk: 0, steer: clamp(ang * 2.2, -1, 1), hand: 0 };
  if (Math.abs(ang) > 2.2 && Math.hypot(dx, dz) < 25) { I.brk = 1; I.steer = -I.steer; return I; }  // mögöttünk: tolatva fordul
  if (v < vDes) I.thr = clamp((vDes - v) * .45 + .15, 0, 1); else I.brk = clamp((v - vDes) * .35, 0, 1);
  return I;
}
export function createTraffic(ctx) {
  const cars = [], scene = ctx.scene;
  function addCar(type, x, z, yaw, color) { const b = makeVehicle(type, x, z, yaw, color ?? Math.floor(Math.random() * 9)); scene.add(b.model.g); ctx.vehicles.push(b); b.lights = ctx.env.lampsOn; return b; }
  function spawn(px, pz) {
    for (let t = 0; t < 10; t++) { const r = W.ROADS[Math.floor(Math.random() * W.ROADS.length)]; if (!r.A || !r.B) continue; const mx = (r.A.x + r.B.x) / 2, mz = (r.A.z + r.B.z) / 2, d = Math.hypot(mx - px, mz - pz);
      if (d < 90 || d > 230) continue; if (r.ramp) continue; const fw = Math.random() < .5, A = fw ? r.A : r.B, B = fw ? r.B : r.A;
      const dist = W.district(mx + 1, mz + 1); let type = TRAFFIC_TYPES[Math.floor(Math.random() * TRAFFIC_TYPES.length)];
      if (dist === 'ipari' && Math.random() < .4) type = Math.random() < .5 ? 'ifa' : 'kamaz'; if (A.hw && (type === 'babetta' || type === 'riga')) type = 'modern';
      const dx = Math.sign(B.x - A.x), dz = Math.sign(B.z - A.z), off = laneOff(A.hw && B.hw), k = .3 + Math.random() * .3;
      const x = A.x + (B.x - A.x) * k - dz * off, z = A.z + (B.z - A.z) * k + dx * off;
      if (ctx.vehicles.some(v => Math.abs(v.pos.x - x) < 10 && Math.abs(v.pos.z - z) < 10)) continue;
      const b = addCar(type, x, z, Math.atan2(-dx, -dz)); b.ai = { mode: 'traffic', A, B, pts: [], cruise: (A.hw ? 26 : W.district(x, z) === 'kertes' ? 10 : 13) * (.85 + Math.random() * .3) * Math.min(1, VEH[type].vmax / 30 + .3), honk: 0 }; b.driver = { npc: 1 };
      b.vel.set(-Math.sin(b.yaw) * 6, 0, -Math.cos(b.yaw) * 6); cars.push(b); return b; }
  }
  function nextLeg(b) { const ai = b.ai, A = ai.A, B = ai.B; let opts = B.n.filter(n => n !== A && !(n.hw && !B.hw && Math.random() < .5)); if (!opts.length) opts = B.n;
    // gyalogút (a lehajtóval) ne legyen zsákutca-ismétlés
    const C = opts[Math.floor(Math.random() * opts.length)]; ai.pts.push(...legPoints(A, B, C)); ai.A = B; ai.B = C; }
  /* forgalmi AI egy lépése */
  function drive(b, dt) {
    const ai = b.ai; if (ai.pts.length < 3) nextLeg(b);
    let p = ai.pts[0]; const dx = p.x - b.pos.x, dz = p.z - b.pos.z; if (dx * dx + dz * dz < 16 || ((-Math.sin(b.yaw)) * dx + (-Math.cos(b.yaw)) * dz < -2 && dx * dx + dz * dz < 100)) { ai.pts.shift(); p = ai.pts[0]; }
    let vDes = ai.cruise;
    // lámpa
    const sp = ai.pts.find(q => q.stop); if (sp && sp.stop.light) { const d = Math.hypot(sp.x - b.pos.x, sp.z - b.pos.z), st = W.lightState(sp.stop, ctx.t), green = sp.ax === 'z' ? st === 0 : st === 2, yellow = sp.ax === 'z' ? st === 1 : st === 3;
      if (!green && !(yellow && d < 10) && d < 45 && ai.pts[0] === sp) vDes = Math.min(vDes, Math.sqrt(Math.max(0, d - 1.5) * 6)); }
    // akadály előttünk
    const fx = -Math.sin(b.yaw), fz = -Math.cos(b.yaw); let blocked = 99;
    const chk = (x, z, len) => { const ox = x - b.pos.x, oz = z - b.pos.z, fd = ox * fx + oz * fz, ld = Math.abs(ox * -fz + oz * fx); if (fd > 0 && fd < 30 && ld < 2.4) blocked = Math.min(blocked, fd - len); };
    for (const o of ctx.vehicles) if (o !== b && Math.abs(o.pos.x - b.pos.x) < 32 && Math.abs(o.pos.z - b.pos.z) < 32) chk(o.pos.x, o.pos.z, (o.J.l + b.J.l) / 2);
    if (!ctx.player.veh) chk(ctx.player.pos.x, ctx.player.pos.z, b.J.l / 2 + .5);
    for (const q of ctx.peds.list) if (Math.abs(q.x - b.pos.x) < 20 && Math.abs(q.z - b.pos.z) < 20 && q.st !== 'down') chk(q.x, q.z, b.J.l / 2 + .5);
    if (blocked < 99) { vDes = Math.min(vDes, Math.max(0, (blocked - 2.5) * .9)); if (blocked < 6 && b.speed < .5) { ai.honk += dt; if (ai.honk > 3) { ai.honk = -4; ctx.audio?.horn(b.pos); } } }
    if (b.wrecked || b.hp < 300) vDes = 0;
    const I = steerTo(b, p.x, p.z, vDes); if (vDes < .3 && b.speed < .8) { I.thr = 0; I.brk = .6; } b.brakeOn = I.brk > .2; stepVehicle(b, I, dt, ctx.env);
  }
  /* ---------- villamos ---------- */
  const trams = [];
  function buildTram() { const g = new THREE.Group(), body = mat(0xf2c230, { roughness: .35, metalness: .2 }), win = mat(0x22303a, { roughness: .1, metalness: .5 }), dark = mat(0x2a2d32);
    for (const [z0, len] of [[-12, 11.6], [.4, 11.6]]) { const s = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, len), body); s.position.set(0, 1.75, z0 + len / 2); s.castShadow = true; g.add(s);
      const w = new THREE.Mesh(new THREE.BoxGeometry(2.44, .9, len - 1), win); w.position.set(0, 2.25, z0 + len / 2); g.add(w); const r = new THREE.Mesh(new THREE.BoxGeometry(2.2, .25, len - .6), dark); r.position.set(0, 3.15, z0 + len / 2); g.add(r);
      const sk = new THREE.Mesh(new THREE.BoxGeometry(2.46, .3, len), mat(0xd8d8d8)); sk.position.set(0, .7, z0 + len / 2); g.add(sk); }
    const pant = new THREE.Mesh(new THREE.BoxGeometry(1.6, .06, .06), dark); pant.position.set(0, 4.3, -2); g.add(pant); const arm = new THREE.Mesh(new THREE.BoxGeometry(.06, 1.2, .06), dark); arm.position.set(0, 3.7, -2); arm.rotation.x = .5; g.add(arm);
    const wire = new THREE.Mesh(new THREE.BoxGeometry(.03, .03, 1400), dark); return { g, wire }; }
  for (const [dir, x0] of [[1, -500], [-1, 300]]) { const T = buildTram(); scene.add(T.g); const zl = dir > 0 ? 3.5 : -3.5; // keletre a déli sávban (jobbra tartás)
    const b = { uid: 9000 + trams.length, id: 'villamos', kind: 'tram', J: { m: 1e6, w: 2.5, l: 24, h: 3.4, r: .4, kind: 'tram' }, pos: new THREE.Vector3(x0, 0, zl), yaw: dir > 0 ? -Math.PI / 2 : Math.PI / 2, vel: new THREE.Vector3(), vy: 0, yr: 0, model: { g: T.g, wheels: [] }, hp: 1e9, tune: {}, dir, stopT: 0, v: 0, speed: 0, vf: 0, tram: 1 };
    trams.push(b); ctx.vehicles.push(b); }
  { const wm = mat(0x222222); for (const z of [-3.5, 3.5]) { const w = new THREE.Mesh(new THREE.BoxGeometry(1400, .03, .03), wm); w.position.set(0, 6.2, z); scene.add(w); } for (let x = -700; x <= 700; x += 50) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.1, .12, 6.6, 6), wm); p.position.set(x, W.groundY(x, -8.3) + 3.3, -8.3); p.castShadow = true; scene.add(p); const a = new THREE.Mesh(new THREE.BoxGeometry(.06, .06, 12.6), wm); a.position.set(x, 6.4 + W.groundY(x, 0), -2.1); scene.add(a); } }
  function stepTram(b, dt) {
    const x = b.pos.x, stopAt = Math.round(x / 200) * 200 + 50 * b.dir; let vDes = 11;
    if (Math.abs(x - stopAt) < 1 && b.stopT <= 0 && !b.stopped) { b.stopT = 7; b.stopped = 1; } if (Math.abs(x - stopAt) > 5) b.stopped = 0;
    if (b.stopT > 0) { b.stopT -= dt; vDes = 0; } else if (b.dir * (stopAt - x) > 0 && b.dir * (stopAt - x) < 22) vDes = Math.min(vDes, Math.sqrt(Math.max(0, b.dir * (stopAt - x)) * 2.5) + .3);
    let block = 99; for (const o of ctx.vehicles) if (o !== b && Math.abs(o.pos.z - b.pos.z) < 2.6 && b.dir * (o.pos.x - x) > 0) block = Math.min(block, b.dir * (o.pos.x - x) - (o.J.l / 2 + 12.5) - 2);
    if (!ctx.player.veh && Math.abs(ctx.player.pos.z - b.pos.z) < 2 && b.dir * (ctx.player.pos.x - x) > 0) block = Math.min(block, b.dir * (ctx.player.pos.x - x) - 13);
    if (block < 25) { vDes = Math.min(vDes, Math.max(0, block * .6)); if (block < 8 && ctx.audio) { b.bell = (b.bell || 0) + dt; if (b.bell > 2.5) { b.bell = 0; ctx.audio.bell(b.pos); } } }
    b.v += clamp(vDes - b.v, -3 * dt, 1.2 * dt); b.pos.x += b.dir * b.v * dt; if (b.pos.x > 690) { b.pos.x = 690; b.dir = -1; b.pos.z = -3.5; b.yaw = Math.PI / 2; } if (b.pos.x < -690) { b.pos.x = -690; b.dir = 1; b.pos.z = 3.5; b.yaw = -Math.PI / 2; }
    b.vel.set(b.dir * b.v, 0, 0); b.speed = b.v; b.pos.y = W.groundY(b.pos.x, b.pos.z) + .07; b.model.g.position.set(b.pos.x - b.dir * 0, b.pos.y, b.pos.z); b.model.g.rotation.y = b.yaw;
  }
  return { cars, trams, addCar, legPoints,
    update(dt, px, pz, maxN) {
      for (let i = cars.length - 1; i >= 0; i--) { const b = cars[i]; if (b.ai?.mode !== 'traffic') { cars.splice(i, 1); continue; }
        if ((Math.abs(b.pos.x - px) > 260 || Math.abs(b.pos.z - pz) > 260) && !b.keep) { ctx.removeVehicle(b); cars.splice(i, 1); } }
      let need = maxN - cars.length; for (let i = 0; i < 2 && need > 0; i++, need--) spawn(px, pz);
      for (const b of cars) drive(b, dt);
      for (const b of trams) stepTram(b, dt);
    } };
}
