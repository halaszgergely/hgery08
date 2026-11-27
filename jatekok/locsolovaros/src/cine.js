// Kamera: harmadik személyű követés (ütközés-elkerüléssel, járműmögé igazodással, célzáskor vállkamera) és átvezető jelenetek (kamerautak + feliratok).
import * as THREE from 'three';
import * as W from './world.js?v=202611271305';

const ss = k => k * k * (3 - 2 * k);
export function createCamera(camera) {
  const C = { yaw: Math.PI, pitch: -.18, dist: 4.5, zoom: 0, idle: 0, pos: camera.position, dir: new THREE.Vector3(0, 0, -1), shake: 0, target: new THREE.Vector3() };
  const T = new THREE.Vector3(), D = new THREE.Vector3(), L = new THREE.Vector3();
  C.look = (dx, dy, sens, inv) => { C.yaw -= dx * .0024 * sens; C.pitch -= dy * .0024 * sens * (inv ? -1 : 1); C.pitch = Math.max(-1.35, Math.min(.85, C.pitch)); if (dx || dy) C.idle = 0; };
  C.update = (dt, pl, aim) => {
    const v = pl.veh; C.idle += dt;
    let dist, h;
    if (v) { const big = Math.max(v.J.l, v.J.h * 2); dist = (v.kind === 'heli' ? 15 : v.kind === 'tank' ? 12 : Math.max(5.5, big * 1.05 + 2.2)) * [1, 1.45, .75][C.zoom]; h = v.kind === 'heli' ? 2.4 : v.J.h * .85 + .5; T.set(v.pos.x, v.pos.y + h, v.pos.z);
      if (C.idle > 1.2 && v.speed > 3 && v.kind !== 'heli' || (v.kind === 'heli' && C.idle > 1.2 && v.speed > 4)) { const back = v.vf < -1 ? v.yaw + Math.PI : v.yaw; let d = back - C.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); C.yaw += d * Math.min(1, dt * 2.2); C.pitch += (-.2 - C.pitch) * Math.min(1, dt * 1.2); } }
    else { dist = aim ? 2.3 : [4.2, 6, 3][C.zoom]; h = 1.6; T.set(pl.pos.x, pl.pos.y + h, pl.pos.z); if (aim) T.add(L.set(Math.cos(C.yaw) * .65, 0, -Math.sin(C.yaw) * .65)); }
    C.target.lerp(T, C.target.distanceToSquared(T) > 100 ? 1 : Math.min(1, dt * 14));
    D.set(-Math.sin(C.yaw) * Math.cos(C.pitch), Math.sin(C.pitch), -Math.cos(C.yaw) * Math.cos(C.pitch)); C.dir.copy(D);
    // ütközés: a célpontból hátrafelé haladva az első akadály előtt áll meg
    let dd = dist; for (let i = 1; i <= 14; i++) { const k = i / 14 * dist, x = C.target.x - D.x * k, y = C.target.y - D.y * k, z = C.target.z - D.z * k; let hit = y < W.groundY(x, z) + .3;
      if (!hit) W.collNear(x, z, 0, c => { if (!hit && !c.rail && !c.prop && x > c.x0 - .3 && x < c.x1 + .3 && z > c.z0 - .3 && z < c.z1 + .3 && y < c.y1 + .3 && y > (c.y0 ?? -99)) hit = true; }); if (hit) { dd = Math.max(.8, k - .45); break; } }
    C.cur = C.cur === undefined ? dd : dd < C.cur ? dd : C.cur + (dd - C.cur) * Math.min(1, dt * 3);
    camera.position.set(C.target.x - D.x * C.cur, C.target.y - D.y * C.cur, C.target.z - D.z * C.cur);
    const gy = W.groundY(camera.position.x, camera.position.z) + .35; if (camera.position.y < gy) camera.position.y = gy;
    if (C.shake > 0) { C.shake = Math.max(0, C.shake - dt * 2); camera.position.x += (Math.random() - .5) * C.shake * .4; camera.position.y += (Math.random() - .5) * C.shake * .4; }
    camera.lookAt(C.target.x + D.x * 10, C.target.y + D.y * 10, C.target.z + D.z * 10);
    camera.fov += ((v ? 65 + Math.min(14, v.speed * .25) : aim ? 52 : 65) - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix();
  };
  return C;
}
export function createCine(camera, ui, input) {
  const K = { active: false, shots: [], i: 0, t: 0, res: null };
  const A = new THREE.Vector3(), B = new THREE.Vector3(), LA = new THREE.Vector3(), LB = new THREE.Vector3();
  K.play = shots => new Promise(res => { K.active = true; K.shots = shots; K.i = 0; K.t = 0; K.res = res; ui.cine(true); begin(); });
  function begin() { const s = K.shots[K.i]; s.do?.(); ui.subtitle(s.say?.[0], s.say?.[1]); }
  function end() { K.active = false; ui.cine(false); const r = K.res; K.res = null; r?.(); }
  K.stop = () => { if (K.active) end(); };
  K.update = dt => {
    if (!K.active) return; const s = K.shots[K.i]; K.t += dt;
    if (input.hitAny('Enter', 'Escape') || input.pad?.pa || input.pad?.pstart) { end(); return; }
    if (input.hitAny('Space') || input.lmbP) K.t = s.dur;
    const k = ss(Math.min(1, K.t / s.dur)); A.fromArray(s.from); B.fromArray(s.to || s.from); LA.fromArray(s.look); LB.fromArray(s.lookTo || s.look);
    camera.position.lerpVectors(A, B, k); camera.lookAt(LA.lerp(LB, k)); camera.fov = 50; camera.updateProjectionMatrix();
    if (K.t >= s.dur) { K.i++; K.t = 0; if (K.i >= K.shots.length) end(); else begin(); }
  };
  return K;
}
