// Saját járműfizika (árkád, de súlyos): kétnyomú autómodell tapadási határral és sodródással, ballisztikus ugrás, ütközés-impulzus,
// sérülés (horpadás, szélvédő, füst, tűz), moped dőléssel, koaxiális helikopter, lánctalpas tank forgó toronnyal.
import * as THREE from 'three';
import * as W from './world.js?v=202611270107';
import { VEH, buildVehicle, dent } from './vehicles.js?v=202611270107';

const G = 9.81, clamp = (v, a, b) => v < a ? a : v > b ? b : v;
let UID = 1;
export function makeVehicle(id, x, z, yaw = 0, color = 0) {
  const J = VEH[id], model = buildVehicle(id, color);
  const y = W.surfaceY(x, z, 999, 0);
  const b = { uid: UID++, id, J, kind: J.kind, model, pos: new THREE.Vector3(x, y, z), yaw, vel: new THREE.Vector3(), vy: 0, yr: 0, steer: 0, air: false, airT: 0,
    hp: J.armored ? 3000 : J.kind === 'tank' ? 20000 : 1000, maxHp: J.armored ? 3000 : J.kind === 'tank' ? 20000 : 1000, pitch: 0, roll: 0, lean: 0, rotor: 0, wrecked: false, burnT: 0, sink: 0,
    driver: null, ai: null, tune: { eng: 0, brake: 0, grip: 0, armor: 0 }, color, skid: 0, hit: 0, speed: 0, vf: 0, siren: false, lights: false, turretYaw: 0, gunPitch: 0, lastHit: 0, crashed: 0, tag: '' };
  model.g.position.copy(b.pos); model.g.rotation.y = yaw; return b;
}
export function radius(b) { return Math.max(b.J.w, b.J.l) / 2; }

/* --------- lépés --------- */
export function stepVehicle(b, I, dt, env) {
  if (b.kind === 'heli') return stepHeli(b, I, dt, env);
  const J = b.J, T = b.tune, alive = !b.wrecked && b.hp > 0 && b.sink < 1;
  const fx = -Math.sin(b.yaw), fz = -Math.cos(b.yaw), rx = Math.cos(b.yaw), rz = -Math.sin(b.yaw);
  let vf = b.vel.x * fx + b.vel.z * fz, vr = b.vel.x * rx + b.vel.z * rz;
  const road = W.roadAt(b.pos.x, b.pos.z) || b.pos.y - W.groundY(b.pos.x, b.pos.z) > .4, wet = env.wet ? .86 : 1;
  const grip = J.grip * (1 + .08 * T.grip) * wet * (road ? 1 : .86), eng = (1 + .14 * T.eng) * (b.hp < 250 ? .55 : 1);
  if (!alive) { I = { thr: 0, brk: .4, steer: 0, hand: 0 }; }
  if (!b.air) {
    const vmax = J.vmax * (1 + .07 * T.eng), Pa = J.P * eng / J.m; let a = 0;
    if (b.kind === 'tank') { const tgt = (I.thr - I.brk) * vmax; a = clamp((tgt - vf) * 2.2, -6, 3); b.yr += (I.steer * .85 - b.yr) * Math.min(1, dt * 4); vr *= Math.max(0, 1 - 18 * dt); }
    else {
      if (I.thr > 0) { if (vf < -.6) a += 11 * I.thr; else a += Pa * I.thr * Math.max(0, 1 - Math.max(0, vf) / vmax) * (1.3 - .5 * Math.max(0, vf) / vmax); }
      if (I.brk > 0) { if (vf > .6) a -= 11 * (1 + .12 * T.brake) * Math.min(1, grip) * I.brk; else a -= Pa * .55 * I.brk * Math.max(0, 1 - Math.max(0, -vf) / (vmax * .3)); }
      a -= vf * Math.abs(vf) * (b.kind === 'bike' ? .004 : .0022) + Math.sign(vf) * (road ? .25 : 1.1) * Math.min(1, Math.abs(vf));
      if (I.hand) a -= Math.sign(vf) * Math.min(Math.abs(vf) / dt, 4.5);
      const st = I.steer * J.steer / (1 + Math.max(0, Math.abs(vf) - 6) * .05); b.steer += (st - b.steer) * Math.min(1, dt * 7);
      let yr = vf * Math.tan(b.steer) / J.wb; const lim = grip * G * (I.hand ? .75 : 1.08) / Math.max(1.5, Math.abs(vf)); yr = clamp(yr, -lim, lim);
      b.yr += (yr - b.yr) * Math.min(1, dt * (I.hand ? 2.2 : 9));
      if (I.hand && Math.abs(vf) > 6) b.yr += I.steer * dt * 1.8;
      const latK = I.hand ? 1.1 : grip * 11; vr *= Math.max(0, 1 - latK * dt);
    }
    vf += a * dt;
    b.skid = clamp((Math.abs(vr) - 1.5) / 4, 0, 1);
  } else { b.yr *= 1 - dt * .3; b.airT += dt; }
  b.vel.set(fx * vf + rx * vr, 0, fz * vf + rz * vr); b.vf = vf;
  b.yaw += b.yr * dt;
  // függőleges: ballisztikus előrejelzés
  const gy = W.surfaceY(b.pos.x + b.vel.x * dt, b.pos.z + b.vel.z * dt, b.pos.y, b.kind === 'tank' ? 1 : .7);
  if (b.air) { b.vy -= G * dt; const ny = b.pos.y + b.vy * dt; if (ny <= gy) { const imp = -b.vy; b.pos.y = gy; b.vy = 0; b.air = false; env.onLand?.(b, imp, b.airT); b.airT = 0; if (imp > 9) hurt(b, (imp - 9) * 30, env); } else b.pos.y = ny; }
  else { // a padka / járdaszél lépcső: nem ad függőleges sebességet, csak a rugózás jelzi (látvány)
    const yp = b.pos.y + (b.vy - G * dt) * dt, d = gy - b.pos.y, hs = Math.hypot(b.vel.x, b.vel.z), slope = hs * dt * .65 + .015;
    if (yp > gy + .03 && (d < -.35 || b.vy > 1.2)) { b.air = true; b.vy -= G * dt; b.pos.y = yp; }
    else if (Math.abs(d) > slope) { b.bump = clamp((b.bump || 0) - d, -.35, .35); b.vy = 0; b.pos.y = gy; }
    else { b.vy = clamp(d / dt, -30, 25); b.pos.y = gy; } }
  if (b.bump) { b.bump *= Math.max(0, 1 - dt * 9); if (Math.abs(b.bump) < .002) b.bump = 0; }
  b.pos.x += b.vel.x * dt; b.pos.z += b.vel.z * dt;
  // folyó: elsüllyed
  if (W.inRiver(b.pos.x, b.pos.z) && b.pos.y < .5) { b.sink = Math.min(1.2, b.sink + dt * .35); b.vel.multiplyScalar(1 - dt * 2); b.pos.y = Math.max(-1.5 - b.sink * 2, b.pos.y); b.air = false; b.vy = 0; }
  // dőlés (látvány): talajminta elöl/hátul/oldalt
  const hl = J.l * .4, hw = J.w * .45, h0 = (x, z) => W.surfaceY(x, z, b.pos.y + .5, .9);
  if (!b.air) { const pf = h0(b.pos.x + fx * hl, b.pos.z + fz * hl), pb = h0(b.pos.x - fx * hl, b.pos.z - fz * hl), pr = h0(b.pos.x + rx * hw, b.pos.z + rz * hw), pl = h0(b.pos.x - rx * hw, b.pos.z - rz * hw);
    b.pitch += (Math.atan2(pf - pb, hl * 2) - b.pitch) * Math.min(1, dt * 10); b.roll += (Math.atan2(pl - pr, hw * 2) - b.roll + (b.kind === 'car' ? clamp(-vf * b.yr * .012, -.08, .08) : 0)) * Math.min(1, dt * 8); }
  else { b.pitch += (clamp(b.vy * .03, -.5, .4) - b.pitch) * dt * 1.5; }
  if (b.kind === 'bike') b.lean += (clamp(b.yr * Math.abs(vf) * .06, -.7, .7) - b.lean) * Math.min(1, dt * 6);
  collide(b, dt, env);
  b.speed = Math.hypot(b.vel.x, b.vel.z);
  if (b.hp < 1 && !b.wrecked) { b.burnT += dt; if (b.burnT > 6) { b.wrecked = true; env.onExplode?.(b); } }
}
function stepHeli(b, I, dt, env) {
  const J = b.J, on = !!b.driver && !b.wrecked && b.hp > 0; b.rotor = clamp(b.rotor + (on ? .45 : -.25) * dt, 0, 1);
  const fx = -Math.sin(b.yaw), fz = -Math.cos(b.yaw), rx = Math.cos(b.yaw), rz = -Math.sin(b.yaw), lift = b.rotor > .7 ? (b.rotor - .7) / .3 : 0;
  const gy = W.surfaceY(b.pos.x, b.pos.z, b.pos.y, 1.2), grounded = b.pos.y <= gy + .05;
  const tf = (I.thr - I.brk) * J.vmax * lift, ts = (I.strafe || 0) * J.vmax * .5 * lift;
  const tvx = fx * tf + rx * ts, tvz = fz * tf + rz * ts; const k = Math.min(1, dt * (grounded ? 0 : .9));
  b.vel.x += (tvx - b.vel.x) * k; b.vel.z += (tvz - b.vel.z) * k;
  if (grounded) b.vel.multiplyScalar(1 - Math.min(1, dt * 4));
  const vt = (I.up - I.down) * 9; b.vy += lift > 0 ? ((vt - b.vy) * 1.6 * lift + (1 - lift) * -G) * dt : -G * dt;
  if (!on && b.hp <= 0) b.vy -= G * dt;
  b.yr += ((I.steer * 1.3) * lift - b.yr) * Math.min(1, dt * 3); if (grounded && lift < .3) b.yr = 0; b.yaw += b.yr * dt;
  b.pos.x += b.vel.x * dt; b.pos.z += b.vel.z * dt; b.pos.y += b.vy * dt;
  const g2 = W.surfaceY(b.pos.x, b.pos.z, b.pos.y + 1, 1.5);
  if (b.pos.y < g2) { const imp = -b.vy; b.pos.y = g2; if (b.vy < 0) b.vy = 0; if (imp > 7) hurt(b, (imp - 7) * 80, env); }
  b.pos.y = Math.min(b.pos.y, 380);
  b.pitch += (((I.thr - I.brk) * .22 * lift) - b.pitch) * Math.min(1, dt * 3); b.roll += (((I.strafe || 0) * -.2 + b.yr * -.15) * lift - b.roll) * Math.min(1, dt * 3);
  b.speed = Math.hypot(b.vel.x, b.vel.z); b.vf = b.vel.x * fx + b.vel.z * fz;
  collide(b, dt, env, 3);
  if (b.hp < 1 && !b.wrecked) { b.burnT += dt; if (grounded || b.burnT > 8) { b.wrecked = true; env.onExplode?.(b); } }
}
export function hurt(b, amt, env) { if (b.tram) return; if (env.god && b.driver?.isPlayer) return; const a = amt * (1 - .15 * b.tune.armor); b.hp = Math.max(0, b.hp - a); env.onDamage?.(b, a); }
/* épületek, korlátok, oszlopok: körök a hossztengely mentén */
const P = new THREE.Vector3();
function collide(b, dt, env, hgt = 1.6) {
  const J = b.J, r = Math.min(J.w, J.l) / 2, n = Math.max(1, Math.round(J.l / J.w)), fx = -Math.sin(b.yaw), fz = -Math.cos(b.yaw);
  for (let i = 0; i < n; i++) { const o = n === 1 ? 0 : (i / (n - 1) - .5) * (J.l - J.w); P.set(b.pos.x + fx * o, 0, b.pos.z + fz * o); const px = P.x, pz = P.z;
    const hit = W.pushCircle(P, r * .95, b.pos.y + .25, hgt);
    if (!hit) continue;
    if (hit.c.prop && hit.c.prop.t === 'hydrant' && b.J.m > 300) { hit.c.y1 = -99; hit.c.prop.broken = true; env.onProp?.(hit.c.prop); b.vel.multiplyScalar(.9); continue; }
    if (hit.c.prop && hit.c.prop.t === 'lamp' && b.J.m > 5000) { hit.c.y1 = -99; hit.c.prop.broken = true; env.onProp?.(hit.c.prop); continue; }
    b.pos.x += P.x - px; b.pos.z += P.z - pz; const vn = b.vel.x * hit.nx + b.vel.z * hit.nz;
    if (vn < 0) { b.vel.x -= 1.3 * vn * hit.nx; b.vel.z -= 1.3 * vn * hit.nz; b.vel.multiplyScalar(.92); b.yr += (o * (hit.nx * fz - hit.nz * fx)) * -vn * .08; impact(b, -vn, hit.nx, hit.nz, o, env); } }
}
export function impact(b, v, nx, nz, off, env) {
  b.hit = Math.max(b.hit, v); if (v < 3) return; const now = performance.now(); env.onCrash?.(b, v);
  if (b.kind === 'tank' || b.tram) return; hurt(b, (v - 3) ** 1.6 * 9, env);
  if (v > 5 && now - b.lastHit > 120) { b.lastHit = now; const c = Math.cos(b.yaw), sn = Math.sin(b.yaw), wx = -nx, wz = -nz, lx = wx * c - wz * sn, lz = wx * sn + wz * c;
    const L = new THREE.Vector3(clamp(lx * 1.4, -1, 1) * b.J.w / 2, b.J.h * .55, clamp(lz * b.J.l / 2 + off, -b.J.l / 2, b.J.l / 2)); dent(b.model, L, Math.min(.35, (v - 5) * .03));
    if (v > 11 && b.model.crack && lz < 0) b.model.crack.visible = true; }
}
/* jármű–jármű ütközés (kör–kör, tömegarányos impulzus) */
export function collidePair(a, c, env) {
  if (a.kind === 'heli' || c.kind === 'heli') { if (Math.abs(a.pos.y - c.pos.y) > 3) return; }
  else if (Math.abs(a.pos.y - c.pos.y) > 2.5) return;
  const na = Math.max(1, Math.round(a.J.l / a.J.w)), nc = Math.max(1, Math.round(c.J.l / c.J.w)), ra = a.J.w / 2, rc = c.J.w / 2;
  for (let i = 0; i < na; i++) { const oa = na === 1 ? 0 : (i / (na - 1) - .5) * (a.J.l - a.J.w), ax = a.pos.x - Math.sin(a.yaw) * oa, az = a.pos.z - Math.cos(a.yaw) * oa;
    for (let j = 0; j < nc; j++) { const oc = nc === 1 ? 0 : (j / (nc - 1) - .5) * (c.J.l - c.J.w), cx = c.pos.x - Math.sin(c.yaw) * oc, cz = c.pos.z - Math.cos(c.yaw) * oc;
      let dx = ax - cx, dz = az - cz; const d = Math.hypot(dx, dz), q = ra + rc; if (d >= q || d < 1e-4) continue; dx /= d; dz /= d;
      const ma = a.J.m, mc = c.J.m, ka = mc / (ma + mc), kc = ma / (ma + mc), pen = q - d;
      a.pos.x += dx * pen * ka; a.pos.z += dz * pen * ka; c.pos.x -= dx * pen * kc; c.pos.z -= dz * pen * kc;
      const rv = (a.vel.x - c.vel.x) * dx + (a.vel.z - c.vel.z) * dz; if (rv >= 0) continue; const jimp = -1.25 * rv;
      a.vel.x += dx * jimp * ka; a.vel.z += dz * jimp * ka; c.vel.x -= dx * jimp * kc; c.vel.z -= dz * jimp * kc;
      a.yr += oa * jimp * ka * .05 * Math.sign(dx * Math.cos(a.yaw) - dz * Math.sin(a.yaw)); c.yr -= oc * jimp * kc * .05 * Math.sign(dx * Math.cos(c.yaw) - dz * Math.sin(c.yaw));
      impact(a, -rv * ka * 1.4, dx, dz, oa, env); impact(c, -rv * kc * 1.4, -dx, -dz, oc, env); env.onBump?.(a, c, -rv); return; } }
}
/* modell szinkronizálása */
export function syncModel(b, t, dt) {
  const g = b.model.g; g.position.copy(b.pos); if (b.sink) g.position.y -= b.sink * .8; if (b.bump) g.position.y += b.bump;
  g.rotation.set(0, 0, 0); g.rotateY(b.yaw); g.rotateX(b.pitch); g.rotateZ(b.roll + b.lean);
  for (const w of b.model.wheels) { if (w.front) w.pivot.rotation.y = b.steer * (b.kind === 'bike' ? .6 : 1); w.mesh.rotation.x -= b.vf * dt / b.J.r; }
  if (b.model.rotors) { b.model.rotors[0].rotation.y += b.rotor * dt * 40; b.model.rotors[1].rotation.y -= b.rotor * dt * 40; }
  if (b.model.turret && b.kind === 'tank') { b.model.turret.rotation.y = b.turretYaw; b.model.gun.rotation.x = b.gunPitch; }
  if (b.model.siren) { const on = b.siren, ph = (t * 4) % 2 < 1; b.model.siren[0].material.emissiveIntensity = on && ph ? 3 : 0; b.model.siren[1].material.emissiveIntensity = on && !ph ? 3 : 0; }
  if (b.model.search) b.model.search.intensity = b.siren ? 900 : 0;
  if (b.model.L) { b.model.L.hl.emissiveIntensity = b.lights ? 3 : .15; b.model.L.tl.emissiveIntensity = (b.brakeOn ? 3 : b.lights ? 1.2 : .2); }
  if (b.wrecked && !b.burntPaint) { b.burntPaint = 1; b.model.paint.color.setHex(0x2a2522); b.model.paint.roughness = .95; b.model.paint.metalness = 0; }
}
