/* HGWS Vízfuvar – járműfizika, rögzített 120 Hz-es lépéssel (alacsony FPS-nél is stabil).
   - auto: raycast kerekek valós felfüggesztéssel (rugó, csillapítás, rugóút → súlyáthelyeződés), Pacejka-szerű oldalirányú gumigörbe,
     tapadási kör (hosszirányú + oldalirányú erő), motor nyomatékgörbével, kuplung, váltó (automata / kézi), motorfék, ABS nélküli blokkolás,
     karosszéria–talaj ütközés impulzusokkal (borulás), épületek alaprajza elleni ütközés.
   - moped: saját kétkerekű modell – dőlés kanyarban (a dőlésszög adja a pálya görbületét), egyensúlyozás, tapadásvesztés és eldőlés,
     a ballon súlya lomhábbá teszi; pedálozás emelkedőn.
   - ballon (kiesett rakomány): gördül a lejtőn, pattan, megáll.
   Környezet (env): h(x,z) felület magassága, n(x,z,out) normál, surf(x,z) → { mu, crr, tipus }, blds(x,z,r) épületgyűrűk. */
import * as THREE from 'three';

const G = 9.81, V = () => new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
const T1 = V(), T2 = V(), T3 = V(), T4 = V(), T5 = V(), QT = new THREE.Quaternion();
const lerpCurve = (c, x) => { if (x <= c[0][0]) return c[0][1]; for (let i = 1; i < c.length; i++) if (x <= c[i][0]) { const a = c[i - 1], b = c[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return c[c.length - 1][1]; };
// oldalirányú gumigörbe (Pacejka „magic formula”, egyszerűsítve): csúszási szög → erőtényező
const pacejka = (a, B = 14, C = 1.4) => Math.sin(C * Math.atan(B * a));

/* ======================= AUTÓ ======================= */
export function createCar(J) { const [w, h, l] = J.meret, m0 = J.tomeg + 80, r = J.kerekR, cg = J.sulypont;
  const mq = m0 / 4, k = mq * (2 * Math.PI * J.rugo.frek) ** 2, c = 2 * J.rugo.csill * Math.sqrt(k * mq), L0 = J.rugo.ut + .08, st = mq * G / k;
  const ay = (r - cg) + L0 - st, wb = J.tengelytav / 2, tr = J.nyomtav / 2;
  const wheels = [[-tr, -wb, 1], [tr, -wb, 1], [-tr, wb, 0], [tr, wb, 0]].map(([x, z, front]) => ({ a: new THREE.Vector3(x, ay, z), front, drive: J.motor.hajt === 'elso' ? front : !front, comp: 0, contact: false, spin: 0, rot: 0, slip: 0, Fz: 0, lock: false, surf: null, len: L0 - st }));
  return { kind: 'auto', J, m0, m: m0, r, cg, w, h, l, k, c, L0, wheels, pos: V(), q: new THREE.Quaternion(), vel: V(), av: V(), steer: 0,
    eng: { rpm: J.motor.alap, gear: 1, shiftT: 0, auto: true, rev: false, revT: 0 }, load: 0, damage: 0, hitV: 0, upright: 1, fuel: J.tank, speed: 0, vx: 0, onRoad: 0, skid: 0 }; }

export function setLoad(b, kg) { b.load = kg; b.m = b.m0 + kg; }
export function placeCar(b, x, y, z, yaw) { b.pos.set(x, y + b.cg + .05, z); b.q.setFromAxisAngle(UP, yaw); b.vel.set(0, 0, 0); b.av.set(0, 0, 0); for (const wh of b.wheels) { wh.comp = 0; wh.spin = 0; } b.eng.gear = 1; b.eng.rev = false; }

export function stepCar(b, I, env, dt) { const J = b.J, M = J.motor, q = b.q;
  const up = T1.set(0, 1, 0).applyQuaternion(q).clone(), fwd = T2.set(0, 0, -1).applyQuaternion(q).clone(), right = T3.set(1, 0, 0).applyQuaternion(q).clone();
  const F = V().set(0, -b.m * G, 0), Tq = V(), m = b.m;
  // a test szerinti tehetetlenségi nyomaték (a rakomány is növeli)
  const Ix = m / 12 * (b.h * b.h + b.l * b.l) * .75, Iy = m / 12 * (b.w * b.w + b.l * b.l) * .75, Iz = m / 12 * (b.w * b.w + b.h * b.h) * .75;
  const vf = b.vel.dot(fwd); b.vx = vf; b.speed = b.vel.length();
  // kormányzás: szervó nélkül lassabban, nagy sebességnél kisebb kitérés
  const steerT = I.steer * J.kormany.max / (1 + Math.max(0, Math.abs(vf) - 8) * .045);
  b.steer += Math.max(-J.kormany.seb * dt, Math.min(J.kormany.seb * dt, steerT - b.steer));
  // ---- hajtáslánc ----
  const E = b.eng; E.shiftT = Math.max(0, E.shiftT - dt);
  let thr = I.thr, brk = I.brake;
  if (E.auto) { // hátramenet: állva a fék nyomva tartásával; előre: gázzal
    if (!E.rev && vf < .4 && brk > .5 && thr < .05) { E.revT += dt; if (E.revT > .35) { E.rev = true; E.gear = -1; } } else E.revT = 0;
    if (E.rev) { if (thr > .1 && vf > -.6) { E.rev = false; E.gear = 1; } else { const t = brk; brk = thr; thr = t; } } }
  if (I.shiftUp) { E.auto = false; if (E.gear < M.gears.length) { E.gear = E.gear === -1 ? 0 : E.gear + 1; E.shiftT = .4; } }
  if (I.shiftDown) { E.auto = false; if (E.gear > -1) { E.gear = E.gear === 1 && vf > 1.5 ? 1 : E.gear - 1; if (E.gear === 0 && vf > 1.5) E.gear = 1; E.shiftT = .4; } }
  if (I.autoGear) E.auto = true;
  const ratio = E.gear === -1 ? -M.hatra : E.gear === 0 ? 0 : M.gears[E.gear - 1], tot = ratio * M.fo;
  let wSum = 0, wn = 0; for (const wh of b.wheels) if (wh.drive) { wSum += wh.spin; wn++; }
  const wheelRpm = Math.abs(wSum / Math.max(1, wn)) * 60 / (2 * Math.PI) * Math.abs(tot);
  let Tdrive = 0;
  if (ratio && E.shiftT <= 0 && b.fuel > 0) { const slipping = wheelRpm < M.alap * 1.25;
    E.rpm = slipping ? Math.max(wheelRpm, M.alap + thr * (M.piros - M.alap) * .45) : wheelRpm;
    if (E.rpm > M.piros) thr = 0;   // fordulatszám-határoló
    const Te = lerpCurve(M.gorbe, E.rpm) * thr - (thr < .05 ? M.motorfek * Math.min(1, E.rpm / M.piros) * (slipping ? 0 : 1) : 0);
    Tdrive = Te * tot * .88;
  } else { E.rpm += ((b.fuel > 0 ? M.alap + thr * (M.piros - M.alap) * .9 : 0) - E.rpm) * Math.min(1, dt * 4); }
  if (E.auto && E.gear >= 1 && E.shiftT <= 0) { if (E.rpm > M.piros * .9 && E.gear < M.gears.length && thr > .2) { E.gear++; E.shiftT = .45; } else if (E.rpm < M.alap * 1.9 && E.gear > 1) { E.gear--; E.shiftT = .35; } }
  // ---- kerekek ----
  let contacts = 0, onRoad = 0; b.skid = 0;
  for (const wh of b.wheels) { wh.contact = false;
    const A = T4.copy(wh.a).applyQuaternion(q).add(b.pos), dy = -up.y; if (dy > -.25) { wh.comp = 0; continue; }
    // a sugár (−up irány) és a felület metszése: két iteráció a magasságmezőn
    let t = (A.y - env.h(A.x, A.z)) / -dy; for (let it = 0; it < 2; it++) { const px = A.x - up.x * t, pz = A.z - up.z * t; t = (A.y - env.h(px, pz)) / -dy; }
    const maxT = b.L0 + b.r; if (t > maxT || t < -.5) { wh.comp = 0; wh.len += (b.L0 - wh.len) * Math.min(1, dt * 10); continue; }
    const comp = maxT - t, cvel = (comp - wh.comp) / dt; wh.comp = comp; wh.len = b.L0 - comp; wh.contact = true; contacts++;
    let Fs = b.k * comp + b.c * cvel; if (comp > b.L0 * .92) Fs += (comp - b.L0 * .92) * b.k * 12; Fs = Math.max(0, Fs); wh.Fz = Fs;
    const C = T5.copy(A).addScaledVector(up, -t), n = env.n(C.x, C.z, V()), sf = env.surf(C.x, C.z); wh.surf = sf; if (sf.ut) onRoad++;
    // kerék iránya a talaj síkjában
    const wf = V().copy(fwd); if (wh.front) wf.applyAxisAngle(up, -b.steer); wf.addScaledVector(n, -wf.dot(n)).normalize(); const ws = V().crossVectors(wf, n).normalize();
    const rC = V().subVectors(C, b.pos), vc = V().crossVectors(b.av, rC).add(b.vel), vx = vc.dot(wf), vy = vc.dot(ws);
    const mu = sf.mu * (J.gumi.mu || 1), Fmax = mu * Fs, mqd = m / 4 / dt;
    // hosszirányú: hajtás, fék, gördülési ellenállás
    let Fx = 0; const Fdr = wh.drive && wn ? Tdrive / b.r / wn : 0;
    const bShare = wh.front ? J.fek.elso : 1 - J.fek.elso, Fb = brk * J.fek.max * bShare + (I.hand && !wh.front ? J.fek.kezifek : 0);
    Fx += Fdr; let lock = false;
    if (Fb > 0) { const stop = Math.min(Fb, Math.abs(vx) * mqd); Fx -= Math.sign(vx) * stop; if (!J.fek.abs && Fb > Fmax * 1.05 && Math.abs(vx) > 1.5) lock = true; }
    Fx -= Math.sign(vx) * Math.min(Math.abs(vx) * mqd, sf.crr * Fs);
    // oldalirányú: csúszási szög → Pacejka-görbe; álló helyzetben a kerék nem csúszik oldalra
    const alpha = Math.atan2(vy, Math.max(Math.abs(vx), 1.2)); let Fy = -Fmax * pacejka(alpha) * (lock ? .35 : 1);
    Fy = Math.sign(Fy) * Math.min(Math.abs(Fy), Math.abs(vy) * mqd * 1.2);
    // tapadási kör: ha a hosszirányú igény túl nagy, a kerék kipörög vagy blokkol
    const lim = Fmax * (lock ? .8 : 1); let slip = 0; const tot2 = Math.hypot(Fx, Fy);
    if (tot2 > lim) { const s = lim / tot2; slip = 1 - s; Fx *= s * (Math.abs(Fdr) > lim ? .85 : 1); Fy *= s; }
    if (lock) Fx = -Math.sign(vx) * Fmax * .75;
    wh.slip = Math.max(slip, Math.min(1, Math.abs(alpha) * 2.2 - .35), lock ? 1 : 0); b.skid = Math.max(b.skid, wh.slip * Math.min(1, Math.abs(vx) / 5));
    wh.lock = lock; wh.spin = lock ? 0 : vx / b.r * (1 + (Math.abs(Fdr) > lim && wh.drive ? .6 * Math.sign(Fdr) * Math.sign(vx || 1) : 0)); wh.rot += wh.spin * dt;
    const Fw = V().copy(up).multiplyScalar(Fs).addScaledVector(wf, Fx).addScaledVector(ws, Fy); F.add(Fw); Tq.add(V().crossVectors(rC, Fw)); }
  b.onRoad = onRoad / 4;
  // légellenállás
  F.addScaledVector(b.vel, -J.legellenallas * b.speed);
  // ---- integrálás ----
  b.vel.addScaledVector(F, dt / m); b.pos.addScaledVector(b.vel, dt);
  const Rinv = QT.copy(q).invert(), wl = V().copy(Tq).applyQuaternion(Rinv); wl.set(wl.x / Ix, wl.y / Iy, wl.z / Iz).applyQuaternion(q); b.av.addScaledVector(wl, dt).multiplyScalar(1 - dt * .15);
  const wq = new THREE.Quaternion(b.av.x * dt * .5, b.av.y * dt * .5, b.av.z * dt * .5, 0).multiply(q); q.set(q.x + wq.x, q.y + wq.y, q.z + wq.z, q.w + wq.w).normalize();
  // ---- karosszéria a talajon (borulás, felfekvés): sarkok impulzusa ----
  b.hitV = 0; const hw = b.w / 2, ytop = b.h - b.cg, ybot = .2 - b.cg, hl = b.l / 2;
  for (const [x, y, z] of [[-hw, ybot, -hl], [hw, ybot, -hl], [-hw, ybot, hl], [hw, ybot, hl], [-hw, ytop, -hl * .5], [hw, ytop, -hl * .5], [-hw, ytop, hl * .5], [hw, ytop, hl * .5], [0, ytop + .02, 0]]) {
    const P = T4.set(x, y, z).applyQuaternion(q).add(b.pos), hg = env.h(P.x, P.z); if (P.y >= hg) continue;
    const n = env.n(P.x, P.z, V()), rC = V().subVectors(P, b.pos), vP = V().crossVectors(b.av, rC).add(b.vel), vn = vP.dot(n);
    b.pos.addScaledVector(n, (hg - P.y) * .6);
    if (vn < 0) { const rn = V().crossVectors(rC, n), Iinv = v => { const l = V().copy(v).applyQuaternion(Rinv); return l.set(l.x / Ix, l.y / Iy, l.z / Iz).applyQuaternion(q); };
      const jn = -(1.15) * vn / (1 / m + V().crossVectors(Iinv(rn), rC).dot(n)), vt = V().copy(vP).addScaledVector(n, -vn), vtl = vt.length();
      const J2 = V().copy(n).multiplyScalar(jn); if (vtl > .01) J2.addScaledVector(vt, -Math.min(jn * .6, vtl * m * .5) / vtl);
      b.vel.addScaledVector(J2, 1 / m); b.av.add(Iinv(V().crossVectors(rC, J2))); b.hitV = Math.max(b.hitV, -vn); } }
  // ---- épületek: három kör a hossztengely mentén ----
  const rings = env.blds(b.pos.x, b.pos.z, b.l + 4);
  if (rings.length) for (const oz of [-hl + hw, 0, hl - hw]) { const P = T4.set(0, 0, oz).applyQuaternion(q).add(b.pos), hit = pushOut(P.x, P.z, hw + .05, rings);
    if (hit) { b.pos.x += hit[0] * hit[2]; b.pos.z += hit[1] * hit[2]; const vn = b.vel.x * hit[0] + b.vel.z * hit[1];
      if (vn < 0) { b.vel.x -= 1.25 * vn * hit[0]; b.vel.z -= 1.25 * vn * hit[1]; b.vel.multiplyScalar(.97); const rC = V().subVectors(P, b.pos); b.av.y += (rC.x * hit[1] - rC.z * hit[0]) * -vn * .25; b.hitV = Math.max(b.hitV, -vn); } } }
  if (b.hitV > 2.5) b.damage = Math.min(1, b.damage + (b.hitV - 2.5) * .02);
  b.upright = up.y; b.contacts = contacts;
  // parkolás: állva, fékkel a lejtőn is megáll
  if (contacts >= 3 && (brk > .2 || I.hand) && b.speed < .35 && !thr) { b.vel.multiplyScalar(.5); b.av.multiplyScalar(.5); }
  b.fuel = Math.max(0, b.fuel - (J.fogy / 100 / 1000) * Math.abs(vf) * dt * (.4 + Math.max(thr, .05) * 1.4) - (E.rpm > 0 ? .00002 * dt : 0));
}

/* sokszögből kitolás: [nx, nz, mélység] vagy null (gyűrű: [[x, z], …]) */
export function pushOut(x, z, r, rings) { let best = null;
  for (const ring of rings) { let ins = false, bd = 1e9, bx = 0, bz = 0; const n = ring.length; if (Math.abs(ring[0][0] - x) > 120 || Math.abs(ring[0][1] - z) > 120) continue;
    for (let i = 0, j = n - 1; i < n; j = i++) { const a = ring[j], c = ring[i];
      if ((a[1] > z) !== (c[1] > z) && x < a[0] + (z - a[1]) * (c[0] - a[0]) / (c[1] - a[1])) ins = !ins;
      const dx = c[0] - a[0], dz = c[1] - a[1], L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L)), px = a[0] + dx * t, pz = a[1] + dz * t, d = Math.hypot(x - px, z - pz);
      if (d < bd) { bd = d; bx = px; bz = pz; } }
    if (!ins && bd >= r) continue; let nx = x - bx, nz = z - bz; const L = Math.hypot(nx, nz) || 1; nx /= L; nz /= L; if (ins) { nx = -nx; nz = -nz; }
    const depth = ins ? r + bd : r - bd; if (!best || depth > best[2]) best = [nx, nz, depth]; }
  return best; }

/* ======================= MOPED ======================= */
export function createMoped(J) { return { kind: 'moped', J, m0: J.tomeg + 78, m: J.tomeg + 78, load: 0, pos: V(), yaw: 0, pitch: 0, v: 0, lean: 0, leanV: 0, kappa: 0, fallen: false, fallT: 0, fallSide: 1,
  q: new THREE.Quaternion(), vel: V(), fuel: J.tank, speed: 0, vx: 0, rpm: 0, hitV: 0, damage: 0, onRoad: 1, skid: 0, wheelRot: 0, bump: 0, upright: 1, steer: 0, eng: { rpm: 0, gear: 1 } }; }
export function placeMoped(b, x, y, z, yaw) { b.pos.set(x, y, z); b.yaw = yaw; b.v = 0; b.lean = 0; b.leanV = 0; b.fallen = false; b.fallT = 0; }
export function stepMoped(b, I, env, dt, onFall) { const J = b.J, m = b.m;
  const fx = -Math.sin(b.yaw), fz = -Math.cos(b.yaw), sf = env.surf(b.pos.x, b.pos.z); b.onRoad = sf.ut ? 1 : 0;
  const hF = env.h(b.pos.x + fx * .55, b.pos.z + fz * .55), hB = env.h(b.pos.x - fx * .55, b.pos.z - fz * .55); b.pitch += (Math.atan2(hF - hB, 1.1) - b.pitch) * Math.min(1, dt * 12);
  if (b.fallen) { b.fallT += dt; b.v *= Math.max(0, 1 - dt * 3.5); b.lean += (b.fallSide * 1.42 - b.lean) * Math.min(1, dt * 7); b.leanV = 0; b.kappa = 0; b.skid = b.v > 1 ? 1 : 0;
    b.pos.x += fx * b.v * dt; b.pos.z += fz * b.v * dt; b.pos.y = env.h(b.pos.x, b.pos.z); b.rpm = Math.max(0, b.rpm - dt * 2000); finishMoped(b); return; }
  // hajtás: kétütemű, egyfokozatú automata kuplung; pedálozással segíthető
  const loadK = b.m0 / m, P = (b.fuel > 0 ? J.teljesitmeny * I.thr : 0) + (I.pedal ? 140 : 0);
  let Fd = Math.min(310, P / Math.max(b.v, 1.6)); if (b.v > J.vmax) Fd *= Math.max(0, 1 - (b.v - J.vmax) * 3);
  const grade = Math.sin(b.pitch), Fres = .5 * 1.2 * .6 * b.v * Math.abs(b.v) + sf.crr * 1.4 * m * G * Math.sign(b.v) + m * G * grade;
  const Fb = I.brake * m * G * .5 * Math.min(1, sf.mu);
  let a = (Fd - Fres) / m; if (Fb) a -= Math.sign(b.v || 1) * Math.min(Fb / m, Math.abs(b.v) / dt + (b.v > .05 ? 0 : 0));
  if (b.v < .3 && I.brake > .5 && !I.thr) a = -.9 - b.v * 2;   // tolás hátrafelé
  b.v = Math.max(-1.2, b.v + a * dt); if (Math.abs(b.v) < .02 && !I.thr && Fb) b.v = 0;
  // kormányzás: a dőlés adja az ívet; lassan a lábával egyensúlyoz
  const s = I.steer, vv = Math.abs(b.v), Rmin = Math.max(2.4, vv * vv / (sf.mu * G * .85)), kapD = s / Rmin;
  const leanT = Math.atan(vv * vv * kapD / G) * (vv > 2.5 ? 1 : vv / 2.5), kL = 14 * loadK * loadK, dL = 6 * loadK;
  b.leanV += (kL * (leanT - b.lean) - dL * b.leanV) * dt; b.lean += b.leanV * dt;
  b.kappa = vv > 3 ? G * Math.tan(b.lean) / Math.max(vv * vv, 1) : kapD * Math.min(1, .35 + vv / 3);
  b.yaw -= b.v * b.kappa * dt; b.steer = s;
  // tapadás és eldőlés: túl gyors kanyar, túl nagy dőlés, gödör a földúton, ütközés
  const lat = vv * vv * Math.abs(b.kappa); b.skid = Math.max(0, lat / (sf.mu * G) - .85) * 4;
  let fall = null; if (lat > sf.mu * G * 1.02 && vv > 4) fall = 'csúszás'; if (Math.abs(b.lean) > .88) fall = 'dőlés';
  if (!sf.ut && vv > 7.5) { b.bump += dt * (vv - 7.5) * (sf.tipus === 'fu' ? .045 : .02) * (1 + Math.abs(s) * 2); if (b.bump > 1) { b.bump = 0; if (Math.random() < .35) fall = 'gödör'; else b.leanV += (Math.random() - .5) * 2.2; } }
  b.pos.x += fx * b.v * dt; b.pos.z += fz * b.v * dt;
  const rings = env.blds(b.pos.x, b.pos.z, 3); const hit = rings.length ? pushOut(b.pos.x, b.pos.z, .55, rings) : null;
  b.hitV = 0; if (hit) { b.pos.x += hit[0] * hit[2]; b.pos.z += hit[1] * hit[2]; const vn = -(fx * hit[0] + fz * hit[1]) * b.v; if (vn > 0) { b.hitV = vn; if (vn > 3.5) fall = 'ütközés'; b.v *= .2; } }
  b.pos.y = env.h(b.pos.x, b.pos.z);
  if (fall) { b.fallen = true; b.fallT = 0; b.fallSide = Math.sign(b.lean || s || 1); b.damage = Math.min(1, b.damage + .04 + vv * .006); onFall?.(fall, vv); }
  b.rpm += ((b.fuel > 0 ? 2200 + I.thr * 4800 + vv * 120 : 0) - b.rpm) * Math.min(1, dt * 6);
  b.fuel = Math.max(0, b.fuel - J.fogy / 100 / 1000 * vv * dt * (.5 + I.thr) - (b.fuel > 0 ? .000004 * dt : 0));
  finishMoped(b); }
function finishMoped(b) { b.q.setFromEuler(new THREE.Euler(b.pitch, b.yaw, -b.lean, 'YXZ')); b.vel.set(-Math.sin(b.yaw) * b.v, 0, -Math.cos(b.yaw) * b.v); b.speed = Math.abs(b.v); b.vx = b.v; b.wheelRot += b.v / .27 * (1 / 120); b.upright = Math.cos(b.lean); b.eng.rpm = b.rpm; }

/* ======================= KIESETT BALLON ======================= */
export function createProp(p, v) { return { pos: p.clone(), vel: v.clone(), rot: new THREE.Euler(Math.PI / 2, Math.random() * 6, 0), roll: 0, rest: false }; }
export function stepProp(o, env, dt) { if (o.rest) return; o.vel.y -= G * dt; o.pos.addScaledVector(o.vel, dt); const h = env.h(o.pos.x, o.pos.z) + .145;
  if (o.pos.y < h) { o.pos.y = h; const n = env.n(o.pos.x, o.pos.z, T1); if (o.vel.y < -1.5) o.vel.y *= -.3; else o.vel.y = 0;
    o.vel.x += n.x * G * .55 * dt; o.vel.z += n.z * G * .55 * dt; o.vel.x *= 1 - dt * 1.6; o.vel.z *= 1 - dt * 1.6; o.roll += Math.hypot(o.vel.x, o.vel.z) / .145 * dt;
    if (Math.hypot(o.vel.x, o.vel.z) < .05 && Math.hypot(n.x, n.z) < .12) o.rest = true; }
  o.rot.z = o.roll; }
