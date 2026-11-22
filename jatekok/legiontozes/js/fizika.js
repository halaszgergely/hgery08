/* Repülésmodellek (arcade-szimuláció). Test-koordináták: orr −Z, fel +Y, jobb +X.
   - plane/gyro/glider/rocket: tolóerő, felhajtóerő az állásszögből (átesés), indukált + alakellenállás, oldalerő, a gép a sebesség felé áll be.
     A légellenállás és a max. felhajtási tényező a gép adataiból (vmax, vstall) kalibrálódik, így egy új gép csak adat.
   - heli / coax / tandem: kollektív (tolóerő a rotortengely mentén), ciklikus (dőlésszög-cél), farokrotor / differenciál (forgás).
   - drone: sebességtartó robotpilóta, akkumulátor. airship: felhajtóerő ≈ súly, ballaszt, erősen sodorja a szél.
   A víz tömege beleszámít: tele tartállyal nehezebb és lomhább. */
import * as THREE from 'three';
import { FORGO } from './config.js?v=202611221747';

const g0 = 9.81, V3 = () => new THREE.Vector3();
const _f = V3(), _u = V3(), _r = V3(), _va = V3(), _F = V3(), _t = V3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _n = V3();
const rho = h => 1.225 * Math.exp(-Math.max(0, h) / 8500);

export function createBody(gep) {
  const kind = gep.kind, b = { gep, kind, pos: V3(), vel: V3(), q: new THREE.Quaternion(), w: V3(), thr: 0, col: 0, gear: 1, gearT: 1, flaps: 0, flapT: 0, water: gep.tartaly, battery: 1,
    onGround: true, crashed: false, burner: false, rpm: 0, rotor: 0, alpha: 0, stall: false, aoaWarn: 0, mach: 0, sonic: false, vs: 0, agl: 0, surf: null, landed: null, ramp: 0, droop: 0,
    bucket: gep.zsak ? { p: V3(), v: V3(), fill: 0, inWater: false } : null, winch: 0, moored: false, hoverAssist: true, spd: 0, lastImpact: 0 };
  // kalibrálás: CD0 a végsebességhez, CLmax az átesési sebességhez
  if (!FORGO(kind) && kind !== 'airship') { const S = gep.szarny || 10, m = gep.tomeg + gep.tartaly * .5;
    b.CD0 = gep.tolo > 0 ? gep.tolo / (.5 * 1.225 * gep.vmax * gep.vmax * S) * .8 : .012; b.CLmax = m * g0 / (.5 * 1.225 * gep.vstall * gep.vstall * S); b.CLa = b.CLmax / .27; b.K = .045; }
  b.mass = () => gep.tomeg + b.water;
  return b;
}
export function placeOn(b, x, y, z, hdg, airborne, speed = 0) {
  b.pos.set(x, y, z); b.q.setFromEuler(new THREE.Euler(0, -hdg * Math.PI / 180, 0, 'YXZ')); b.w.set(0, 0, 0); b.crashed = false; b.onGround = !airborne; b.moored = false;
  _f.set(0, 0, -1).applyQuaternion(b.q); b.vel.copy(_f).multiplyScalar(speed); b.thr = airborne ? .7 : 0; b.gear = airborne && !FORGO(b.kind) ? 0 : 1; b.gearT = b.gear;
  b.col = airborne && FORGO(b.kind) ? hoverCol(b) : 0; b.rotor = FORGO(b.kind) || b.kind === 'gyro' ? (airborne ? 1 : .0) : 0; b.rpm = airborne ? .8 : 0;
  if (b.bucket) { b.bucket.p.set(x, y - b.gep.zsak, z); b.bucket.v.set(0, 0, 0); }
}
const hoverCol = b => Math.min(.95, b.mass() * g0 / b.gep.tolo);

export function step(b, I, dt, env) {
  if (b.crashed) return;
  const gep = b.gep, kind = b.kind, m = b.mass();
  _f.set(0, 0, -1).applyQuaternion(b.q); _u.set(0, 1, 0).applyQuaternion(b.q); _r.set(1, 0, 0).applyQuaternion(b.q);
  const gh = env.ground(b.pos.x, b.pos.z), wind = env.wind(b.pos, gep); _va.copy(b.vel).sub(wind); const V = _va.length(); b.spd = V;
  _F.set(0, -m * g0, 0);
  const heavy = Math.sqrt(m / gep.tomeg);   // tele tartállyal lomhább
  if (FORGO(kind)) heliForces(b, I, dt, V, m, heavy, gh, env);
  else if (kind === 'airship') airshipForces(b, I, dt, V, m, env);
  else wingForces(b, I, dt, V, m, heavy, gh, env);
  // integrálás
  b.vel.addScaledVector(_F, dt / m); b.pos.addScaledVector(b.vel, dt);
  _q.setFromAxisAngle(_t.copy(b.w).normalize(), b.w.length() * dt); if (b.w.lengthSq() > 1e-12) b.q.multiply(_q).normalize();
  b.vs = b.vel.y; b.agl = b.pos.y - gh - (b.gearH ?? 0);
  contact(b, I, dt, gh, env);
  if (b.bucket) bucketStep(b, dt, env);
  b.gear += (b.gearT - b.gear) * Math.min(1, dt * .8); b.flaps += (b.flapT - b.flaps) * Math.min(1, dt * .9);
}

function wingForces(b, I, dt, V, m, heavy, gh, env) {
  const gep = b.gep, S = gep.szarny, h = b.pos.y, r = rho(h);
  // gáz
  if (gep.kind !== 'glider') { b.thr = Math.max(0, Math.min(1, b.thr + (I.thrAbs !== undefined ? (I.thrAbs - b.thr) * Math.min(1, dt * (b.real ? 1.2 : 3)) : I.thr * dt * (b.real ? .4 : .6)))); }
  else b.thr = 0;
  b.burner = !!(gep.uteg && I.burner && b.thr > .9);
  b.rpm += ((gep.kind === 'glider' ? 0 : .25 + b.thr * .75) - b.rpm) * Math.min(1, dt * 2);
  if (gep.kind === 'gyro') b.rotor += (Math.min(1.1, V / 14) - b.rotor) * Math.min(1, dt * .6);
  let T = gep.tolo * b.thr * (b.burner ? gep.uteg : 1) * (r / 1.225);
  if (gep.kind === 'glider' && b.winch > 0) { T = m * 14; b.winch -= dt; }
  if (gep.kind === 'rocket') T *= .85 + Math.random() * .3;
  _F.addScaledVector(_f, T);
  if (V < .5) { b.alpha = 0; b.stall = false; angular(b, I, dt, V, heavy, 0, 0, .1); return; }
  const vf = _va.dot(_f), vu = _va.dot(_u), vr = _va.dot(_r), alpha = Math.atan2(-vu, vf), beta = Math.atan2(vr, vf); b.alpha = alpha;
  const q = .5 * r * V * V;
  let CL, stallA = gep.kind === 'gyro' ? .7 : .27 + b.flaps * .03;
  const CLm = b.CLmax * (1 + b.flaps * .3) * (gep.kind === 'gyro' ? Math.min(1, b.rotor) : 1);
  const a = Math.abs(alpha);
  if (a < stallA) CL = b.CLa * alpha + b.flaps * .35 * Math.sign(vf);
  else { CL = Math.sign(alpha) * CLm * Math.max(b.real ? .2 : .35, 1 - (a - stallA) * (b.real ? 3.2 : 2.2)); }
  CL = Math.max(-CLm, Math.min(CLm * 1.05, CL));
  b.stall = !b.onGround && (a > stallA * .97 || V < gep.vstall * (b.real ? 1 : .9)) && gep.kind !== 'gyro';
  // felhajtóerő a sebességre merőlegesen, a szárny síkjában
  _t.crossVectors(_r, _va).normalize(); _F.addScaledVector(_t, q * S * CL);
  const CD = b.CD0 * (1 + b.gear * .25 + b.flaps * .5 + (b.ramp || 0) * .3) + b.K * CL * CL + (a > stallA ? .3 * Math.sin(a) : 0) + (gep.kind === 'gyro' ? .05 : 0);
  _F.addScaledVector(_va, -q * S * CD / V);
  _F.addScaledVector(_r, -q * S * .55 * Math.sin(beta));   // oldalerő (szélkakas)
  const eff = Math.min(1, Math.max(.12, V / (gep.vstall * 1.6))) * (gep.kind === 'rocket' ? 1 : 1);
  // trimm: a stabilitás a vízszintes repüléshez szükséges állásszög felé húz (nem a nulla felé) – kézből elengedve tartja a magasságot
  const trim = Math.max(-.05, Math.min(stallA * .8, (m * g0 * Math.max(.3, _u.y)) / (q * S * b.CLa) - b.flaps * .35 / b.CLa));
  angular(b, I, dt, V, heavy, (alpha - trim * (b.real ? .7 : 1)) * (a > stallA ? .3 : 1), beta, eff, a > stallA);
  // hangsebesség
  const mach = V / 340; if (!b.sonic && mach >= 1) { b.sonic = true; env.event?.('sonic'); } else if (b.sonic && mach < .97) b.sonic = false; b.mach = mach;
}
function angular(b, I, dt, V, heavy, alpha, beta, eff, stalled) {
  const gep = b.gep, f = gep.ford, resp = (3.2 * f) / heavy;
  const sens = I.sens || 1;
  let tp = (I.pitch * .9 * Math.sqrt(f) * sens) * eff, tr = (-I.roll * 1.9 * f * sens) * eff, ty = (-I.yaw * .42 * f) * eff;
  if (!b.onGround) { if (b.real) {   // realisztikus: gyengébb önstabilitás, nincs automatikus koordináció, csűrőellenhatás, motornyomaték, átesésnél szárnybillenés
      tp -= alpha * 1.3 * eff + (stalled ? .35 : 0); ty -= beta * 1.1 * eff - I.roll * .1 * f * eff;
      if (gep.kind !== 'glider' && gep.kind !== 'gyro' && !gep.uteg) tr += b.thr * .06;
      if (stalled) { b.wd = (b.wd || 0) * .97 + (Math.random() - .5) * .25; tr += b.wd * 1.6; } }
    else { tp -= alpha * 2.2 * eff + (stalled ? .5 : 0); ty -= beta * 2.4 * eff; } }
  else { tr = 0; ty = -I.yaw * Math.min(.7, V / 12) - I.roll * Math.min(.5, V / 15) * .5; }
  if (gep.kind === 'rocket') { tp += (Math.random() - .5) * .9; ty += (Math.random() - .5) * .6; tr += (Math.random() - .5) * 1.2; }
  b.w.x += (tp - b.w.x) * Math.min(1, dt * resp); b.w.y += (ty - b.w.y) * Math.min(1, dt * resp); b.w.z += (tr - b.w.z) * Math.min(1, dt * resp * 1.3);
}

function heliForces(b, I, dt, V, m, heavy, gh, env) {
  const gep = b.gep, kind = b.kind, drone = kind === 'drone', coax = kind === 'coax', tandem = kind === 'tandem';
  b.rotor += ((b.started === false ? 0 : 1) - b.rotor) * Math.min(1, dt * .5); b.rpm = b.rotor;
  _e.setFromQuaternion(b.q, 'YXZ'); const yaw = _e.y, pitch = _e.x, roll = _e.z;
  if (drone) {   // sebességtartó robotpilóta: a bot a kívánt sebességet adja meg
    const sp = gep.vmax, want = _t.set(I.roll * sp, (I.thrDrone || 0) * 4, I.pitch * sp).applyAxisAngle(_n.set(0, 1, 0), yaw);
    const wind = env.wind(b.pos, gep); want.x += wind.x * .2; want.z += wind.z * .2;
    const ax = Math.max(-8, Math.min(8, (want.x - b.vel.x) * 1.8)), az = Math.max(-8, Math.min(8, (want.z - b.vel.z) * 1.8)), ay = Math.max(-6, Math.min(6, (want.y - b.vel.y) * 2.2));
    const lift = b.battery > 0 ? 1 : .55; _F.x += ax * m; _F.z += az * m; _F.y += (ay + g0) * m * lift;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), af = ax * fx + az * fz, ar = ax * -fz + az * fx;
    const pT = -Math.atan(af / g0) * .8, rT = -Math.atan(ar / g0) * .8;
    b.w.x = (pT - pitch) * 5; b.w.z = (rT - roll) * 5; b.w.y = -I.yaw * 1.4;
    b.col = Math.max(0, Math.min(1, (ay + g0) * m / gep.tolo)); b.thr = b.col;
    if (!b.onGround) b.battery = Math.max(0, b.battery - dt / gep.akku * (.7 + b.col * .6)); return; }
  // kollektív
  if (I.colAbs !== undefined) b.col += (I.colAbs - b.col) * Math.min(1, dt * 3); else b.col = Math.max(0, Math.min(1, b.col + I.thr * dt * .45));
  b.thr = b.col;
  const ge = b.agl < 8 ? 1.12 - b.agl * .015 : 1, hvel = Math.hypot(_va.x, _va.z), etl = 1 + .14 * Math.min(1, hvel / 18);
  const T = gep.tolo * b.col * b.rotor * ge * etl * (rho(b.pos.y) / 1.225);
  _F.addScaledVector(_u, T);
  // légellenállás (a végsebesség a max. dőlésnél ≈ vmax)
  const kq = gep.tolo * .42 / (gep.vmax * gep.vmax); _F.addScaledVector(_va, -kq * V - m * .04);
  // ciklikus: dőlésszög-cél; a Ka-26 és a Chinook stabilabb, a Chinook lomhább
  const maxT = (tandem ? .32 : coax ? .38 : .45) * (b.real ? 1.35 : 1), stiff = (tandem ? 1.6 : coax ? 3.2 : 2.6) / heavy * (b.real ? .45 : 1), damp = (coax ? 1.25 : 1) * (b.real ? .6 : 1);
  const tp = I.pitch * maxT, tr = -I.roll * maxT * (tandem ? .8 : 1);
  b.w.x += ((tp - pitch) * stiff - b.w.x) * Math.min(1, dt * 4 * damp); b.w.z += ((tr - roll) * stiff - b.w.z) * Math.min(1, dt * 4 * damp);
  // forgás: farokrotor (nyomatékhatás) / koaxiális differenciál (nincs nyomatékhatás, lassabb) / tandem (oldalirányú dőlés)
  let ty = -I.yaw * (coax ? .75 : tandem ? .5 : 1.1) * gep.ford;
  if (kind === 'heli') ty += (b.col - hoverCol(b)) * (b.real ? .7 : .35);   // a főrotor nyomatéka – a pedállal kell ellensúlyozni
  b.w.y += (ty - b.w.y) * Math.min(1, dt * (coax ? 2 : 3));
}

function airshipForces(b, I, dt, V, m, env) {
  const gep = b.gep; b.thr = Math.max(-.4, Math.min(1, b.thr + I.thr * dt * .4)); b.rpm = Math.abs(b.thr);
  _e.setFromQuaternion(b.q, 'YXZ');
  const wind = env.wind(b.pos, gep), heavy = b.water / gep.tartaly;
  const wantVy = I.pitch * -3.5 - heavy * 1.2 + (b.moored ? 0 : 0);
  const fwd = _t.set(0, 0, -1).applyAxisAngle(_n.set(0, 1, 0), _e.y);
  const want = V3().copy(wind).addScaledVector(fwd, b.thr * gep.vmax); want.y = wantVy;
  const acc = want.sub(b.vel).multiplyScalar(.35); _F.set(acc.x * m, acc.y * m, acc.z * m);
  b.w.set(-_e.x * 2, -I.yaw * .14 * (1 + Math.abs(b.thr)), -_e.z * 2);
}

/* talajérintés: leszállás / ütközés / gurulás / úszás */
function contact(b, I, dt, gh, env) {
  const gep = b.gep, kind = b.kind, gH = b.gearH ?? 1.5, bottom = b.pos.y - gH;
  const surf = env.surface(b.pos.x, b.pos.z); b.surf = surf;
  const water = surf.tip === 'viz', floatOk = gep.felsz.includes('viz');
  if (bottom > gh + .02 || (b.vel.y > .05 && bottom >= gh - .01)) { b.onGround = false; b.landed = null; return; }
  _e.setFromQuaternion(b.q, 'YXZ'); const pitchDeg = _e.x * 57.3, rollDeg = _e.z * 57.3, vs = b.vel.y, hs = Math.hypot(b.vel.x, b.vel.z);
  const wasAir = !b.onGround;
  // milyen felszín engedett ennek a gépnek?
  let ok = false, why = '';
  const flat = env.slope(b.pos.x, b.pos.z) < (FORGO(kind) ? .22 : .1);
  if (water) ok = floatOk || (kind === 'airship');
  else if (surf.tip === 'beton') ok = gep.felsz.includes('beton') || (gep.felsz.includes('nagy') && surf.nagy) || gep.felsz.includes('terep');
  else if (surf.tip === 'fu') ok = gep.felsz.includes('fu') || gep.felsz.includes('terep');
  else if (surf.tip === 'heli' || surf.tip === 'apron') ok = gep.felsz.includes('heli') || gep.felsz.includes('terep') || gep.felsz.includes('beton') || gep.felsz.includes('nagy') || kind === 'airship';
  else if (surf.tip === 'terep') ok = gep.felsz.includes('terep') && flat;
  if (kind === 'airship') ok = true;
  if (!ok) why = water ? 'A gép nem tud vízre szállni' : surf.tip === 'erdo' ? 'Az erdőbe zuhantál' : surf.tip === 'varos' ? 'Beleszálltál a házak közé' : surf.tip === 'beton' ? 'Ez a gép csak nagy reptéren szállhat le' : 'Ez a terep nem alkalmas a leszállásra';
  const lim = (FORGO(kind) ? -3.4 : kind === 'airship' ? -4 : -4.6) * (b.real ? .75 : 1);
  if (wasAir) { b.lastImpact = vs;
    if (!ok && (hs > 4 || vs < -1.5 || !FORGO(kind))) return crash(b, env, why);
    if (vs < lim * 1.5) return crash(b, env, 'Túl kemény landolás');
    if (!FORGO(kind) && kind !== 'airship' && b.gear < .9 && !(water && floatOk)) return crash(b, env, 'Behúzott futóművel értél földet');
    if (Math.abs(rollDeg) > (FORGO(kind) ? 18 : 14) || pitchDeg < -10 || (pitchDeg > 22 && vs < -1.5) || pitchDeg > 32) return crash(b, env, 'Rossz szögben értél földet');
    if (!FORGO(kind) && water && !floatOk) return crash(b, env, why);
    env.event?.('touch', { vs, hard: vs < lim, surf }); }
  else if (!ok && hs > 3 && !FORGO(kind)) return crash(b, env, why);
  b.onGround = true; b.pos.y = gh + gH;
  if (b.vel.y < 0) b.vel.y = 0;
  // gurulás: súrlódás, fék, a gép vízszintesbe áll
  const brake = I.brake || (b.thr < .05 && hs < 4 && !water) ? 1 : 0, mu = water ? .03 + hs * .0012 : (surf.tip === 'terep' ? .06 : .025) + brake * .35;
  const dv = Math.min(hs, mu * 9.81 * dt);
  if (hs > 1e-3) { b.vel.x -= b.vel.x / hs * dv; b.vel.z -= b.vel.z / hs * dv; }
  if (FORGO(kind) || kind === 'airship') { b.vel.x *= Math.max(0, 1 - dt * 3); b.vel.z *= Math.max(0, 1 - dt * 3); }
  // dőlés kiegyenlítése (farokkerekes gépek kissé orral fent állnak)
  const tilt = (gep.id === 'permetezo' || gep.id === 'ancsa' || gep.id === 'giro') && hs < 15 ? .17 * (1 - hs / 15) : 0;
  // elemelkedés: elég sebességnél a pilóta felhúzhatja az orrot
  const rot = FORGO(kind) || kind === 'airship' ? 0 : Math.max(0, Math.min(1, (hs - (gep.vstall || 10) * .65) / ((gep.vstall || 10) * .4))), want = tilt + Math.max(0, I.pitch) * .21 * rot;
  b.w.x += ((want - _e.x) * 4 - b.w.x) * Math.min(1, dt * 6); b.w.z += ((-_e.z) * 4 - b.w.z) * Math.min(1, dt * 6);
  b.landed = { surf, hs, stopped: hs < (FORGO(kind) ? .8 : 1.5) };
}
function crash(b, env, why) { b.crashed = true; b.crashWhy = why; env.event?.('crash', why); }

function bucketStep(b, dt, env) {
  const k = b.bucket, L = b.gep.zsak, hook = _t.set(0, b.gep.kind === 'airship' ? -9.6 : -1, 0).applyQuaternion(b.q).add(b.pos);
  k.v.y -= g0 * dt; k.v.multiplyScalar(1 - Math.min(1, dt * .35)); k.p.addScaledVector(k.v, dt);
  const d = _n.copy(k.p).sub(hook), len = d.length();
  if (len > L) { d.multiplyScalar(1 / len); k.p.copy(hook).addScaledVector(d, L); const out = k.v.dot(d) - b.vel.dot(d); if (out > 0) k.v.addScaledVector(d, -out); }
  const gh = env.ground(k.p.x, k.p.z), isW = env.isWater(k.p.x, k.p.z);
  k.inWater = isW && k.p.y < gh + .3;
  if (k.p.y < gh + .8) { k.p.y = gh + .8; if (k.v.y < 0) k.v.y = 0; k.v.x *= .9; k.v.z *= .9; }
  if (k.inWater) { b.water = Math.min(b.gep.tartaly, b.water + b.gep.tartaly * .28 * dt); k.v.multiplyScalar(.9); }
}
