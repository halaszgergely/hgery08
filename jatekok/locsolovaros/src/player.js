// Procedurális emberalak (ízületes, animált) és a gyalogos játékos-irányítás.
import * as THREE from 'three';
import * as W from './world.js?v=202611282048';

const MC = new Map(), M = (c, r = .7) => { const k = c + '|' + r; if (!MC.has(k)) MC.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: r })); return MC.get(k); };
const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10);
function part(par, g, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; par.add(o); return o; }
/* look: { skin, shirt, pants, shoes, hair, hat (null|'cap'|'helmet'), hatCol, vest, beard, glasses, logo } */
export function buildHuman(look = {}) {
  const L = { skin: 0xe0b08a, shirt: 0x2a6fb0, pants: 0x2c3440, shoes: 0x1c1c1c, hair: 0x3a2a1a, ...look };
  const g = new THREE.Group(), hips = new THREE.Group(); hips.position.y = .95; g.add(hips);
  const torso = new THREE.Group(); hips.add(torso);
  part(torso, cap(.19, .34), M(L.shirt), 0, .33, 0).scale.set(1.15, 1, .72);
  part(hips, cap(.17, .1), M(L.pants), 0, .02, 0).scale.set(1.15, 1, .75);
  if (L.vest) { part(torso, cap(.2, .26), M(L.vest, .5), 0, .36, 0).scale.set(1.17, 1, .76); }
  if (L.logo) { const c = document.createElement('canvas'); c.width = 128; c.height = 48; const x = c.getContext('2d'); x.fillStyle = '#f2c230'; x.font = '900 34px Arial'; x.textAlign = 'center'; x.fillText(L.logo, 64, 36); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Mesh(new THREE.PlaneGeometry(.32, .12), new THREE.MeshBasicMaterial({ map: t, transparent: true })); s.position.set(0, .45, .165); s.rotation.y = Math.PI; torso.add(s); }
  const neck = new THREE.Group(); neck.position.y = .66; torso.add(neck); part(neck, new THREE.CylinderGeometry(.06, .07, .1, 8), M(L.skin), 0, .03, 0);
  const head = new THREE.Group(); head.position.y = .1; neck.add(head); const hd = part(head, new THREE.SphereGeometry(.12, 16, 12), M(L.skin, .55), 0, .1, 0); hd.scale.set(.95, 1.1, 1);
  part(head, new THREE.SphereGeometry(.125, 16, 10, 0, Math.PI * 2, 0, 1.4), M(L.hair, .9), 0, .13, .01);
  for (const s of [-1, 1]) part(head, new THREE.SphereGeometry(.017, 6, 4), M(0x15181c, .3), s * .042, .12, -.112);
  part(head, new THREE.ConeGeometry(.02, .05, 6), M(L.skin, .55), 0, .09, -.125).rotation.x = -Math.PI / 2;
  if (L.beard) part(head, new THREE.SphereGeometry(.1, 10, 8, 0, Math.PI * 2, 1.6, 1.2), M(L.hair, .95), 0, .09, -.02);
  if (L.glasses) for (const s of [-1, 1]) part(head, new THREE.TorusGeometry(.03, .006, 4, 10), M(0x111111, .3), s * .045, .12, -.118);
  if (L.hat === 'cap') { part(head, new THREE.SphereGeometry(.13, 14, 8, 0, Math.PI * 2, 0, 1.45), M(L.hatCol ?? 0xf2c230, .8), 0, .15, 0); part(head, new THREE.BoxGeometry(.2, .015, .12), M(L.hatCol ?? 0xf2c230, .8), 0, .19, -.15); }
  if (L.hat === 'helmet') part(head, new THREE.SphereGeometry(.145, 14, 8, 0, Math.PI * 2, 0, 1.55), M(L.hatCol ?? 0xffffff, .4), 0, .14, 0);
  const limb = (par, x, y, upper, lower, col1, col2, foot) => { const a = new THREE.Group(); a.position.set(x, y, 0); par.add(a); part(a, cap(upper[0], upper[1]), M(col1), 0, -upper[1] / 2 - upper[0], 0);
    const b = new THREE.Group(); b.position.y = -upper[1] - upper[0] * 2 + .02; a.add(b); part(b, cap(lower[0], lower[1]), M(col2), 0, -lower[1] / 2 - lower[0], 0);
    if (foot) part(b, new THREE.BoxGeometry(.11, .08, .26), M(L.shoes, .6), 0, -lower[1] - lower[0] * 2 + .03, -.06); else part(b, new THREE.SphereGeometry(.05, 8, 6), M(L.skin), 0, -lower[1] - lower[0] * 2, 0); return [a, b]; };
  const [aL, aL2] = limb(torso, -.27, .58, [.065, .2], [.055, .19], L.shirt, L.skin), [aR, aR2] = limb(torso, .27, .58, [.065, .2], [.055, .19], L.shirt, L.skin);
  const [lL, lL2] = limb(hips, -.1, 0, [.085, .3], [.07, .3], L.pants, L.pants, 1), [lR, lR2] = limb(hips, .1, 0, [.085, .3], [.07, .3], L.pants, L.pants, 1);
  const gun = new THREE.Group(); aR2.add(gun); gun.position.set(0, -.3, -.04); gun.rotation.x = -Math.PI / 2;
  g.userData = { hips, torso, head, aL, aL2, aR, aR2, lL, lL2, lR, lR2, gun, ph: 0 };
  return g;
}
/* póz: state = idle|walk|run|jump|sit|fall|down|aim|swim|wave|talk */
export function pose(h, state, speed, dt, aim = 0) {
  const u = h.userData; u.ph += dt * (state === 'run' ? 11 : state === 'walk' ? 6.5 : state === 'swim' ? 3 : 2) * (state === 'walk' || state === 'run' ? Math.max(.6, speed / (state === 'run' ? 6 : 2.2)) : 1);
  const s = Math.sin(u.ph), c = Math.cos(u.ph), amp = state === 'run' ? .9 : state === 'walk' ? .5 : 0;
  const set = (o, x = 0, y = 0, z = 0) => o.rotation.set(x, y, z);
  u.hips.position.y = .95; u.hips.rotation.set(0, 0, 0); u.torso.rotation.set(0, 0, 0);
  if (state === 'sit') { u.hips.position.y = .55; set(u.lL, 1.45); set(u.lR, 1.45); set(u.lL2, -1.4); set(u.lR2, -1.4); set(u.aL, .9, 0, .1); set(u.aR, .9, 0, -.1); set(u.aL2, .4); set(u.aR2, .4); return; }
  if (state === 'down') { u.hips.position.y = .2; u.hips.rotation.x = -1.5; set(u.lL, .1); set(u.lR, -.1); set(u.lL2, .3); set(u.lR2, .2); set(u.aL, -2.6, 0, .3); set(u.aR, -2.4, 0, -.4); set(u.aL2, -.3); set(u.aR2, -.5); u.head.rotation.set(-.3, .5, 0); return; }
  if (state === 'swim') { u.hips.position.y = .15; u.hips.rotation.x = -1.3; set(u.lL, s * .5); set(u.lR, -s * .5); set(u.lL2, .2); set(u.lR2, .2); set(u.aL, -2.8 + s * .8, 0, .3); set(u.aR, -2.8 - s * .8, 0, -.3); set(u.aL2, -.2); set(u.aR2, -.2); return; }
  if (state === 'jump' || state === 'fall') { set(u.lL, .6); set(u.lR, -.2); set(u.lL2, -.9); set(u.lR2, -.4); set(u.aL, .3, 0, .8); set(u.aR, .3, 0, -.8); set(u.aL2, .5); set(u.aR2, .5); u.head.rotation.set(0, 0, 0); return; }
  set(u.lL, s * amp); set(u.lR, -s * amp); set(u.lL2, -Math.max(0, -c) * amp * 1.3 - .05); set(u.lR2, -Math.max(0, c) * amp * 1.3 - .05);
  u.hips.position.y = .95 + Math.abs(c) * amp * .05; u.torso.rotation.x = state === 'run' ? -.15 : 0;
  set(u.aL, -s * amp * .8, 0, .08); set(u.aR, s * amp * .8, 0, -.08); set(u.aL2, .25 + amp * .4); set(u.aR2, .25 + amp * .4);
  if (state === 'idle') { const br = Math.sin(u.ph) * .03; set(u.aL, br, 0, .1); set(u.aR, -br, 0, -.1); u.torso.rotation.x = br * .3; }
  if (state === 'wave') { set(u.aR, -2.6 + Math.sin(u.ph * 4) * .3, 0, -.4); set(u.aR2, -.4); }
  if (state === 'talk') { set(u.aR, .5 + Math.sin(u.ph * 2) * .2, 0, -.2); set(u.aR2, 1 + Math.sin(u.ph * 3) * .3); u.head.rotation.y = Math.sin(u.ph) * .15; }
  if (aim) { set(u.aR, 1.5, 0, 0); set(u.aR2, 0); set(u.aL, 1.2, 0, -.5); set(u.aL2, .6); }
}
export const LOOKS = {
  gergely: { skin: 0xe2b48c, shirt: 0x1f8fd6, pants: 0x23303d, shoes: 0x2a1d14, hair: 0x3b2a1c, hat: 'cap', hatCol: 0xf2c230, vest: null, beard: 1, logo: 'HGWS' },
  szilard: { skin: 0xdcae8a, shirt: 0x1b1b1f, pants: 0x1b1b1f, shoes: 0x0e0e0e, hair: 0x15110e, glasses: 1, vest: 0x6a1020 },
  anna: { skin: 0xf0c6a6, shirt: 0xe8eef2, pants: 0x2a4a6a, shoes: 0x333333, hair: 0xb06a2a, logo: 'HGWS' },
  feri: { skin: 0xc89a78, shirt: 0x3a6a3a, pants: 0x4a3a2a, shoes: 0x222222, hair: 0x888888, hat: 'cap', hatCol: 0x2a6fd1, beard: 1 },
  cop: { skin: 0xdcb08c, shirt: 0x1d4f8f, pants: 0x1a2a40, shoes: 0x111111, hair: 0x2a2018, hat: 'cap', hatCol: 0x1a2a40, vest: 0x25344a },
  goon: { skin: 0xdcae8a, shirt: 0x5a1020, pants: 0x1b1b1f, shoes: 0x111111, hair: 0x111111, hat: 'cap', hatCol: 0x1b1b1f }
};

/* ---------- játékos ---------- */
export function createPlayer(scene) {
  const model = buildHuman(LOOKS.gergely); scene.add(model);
  const P = { isPlayer: true, model, pos: new THREE.Vector3(150, 0, 112), yaw: Math.PI, vel: new THREE.Vector3(), vy: 0, ground: true, hp: 100, armor: 0, veh: null, seatT: 0, state: 'idle', soak: 0, swim: false, downT: 0, weapon: 0, aimT: 0, wanted: 0, inv: 0, fly: false };
  P.pos.y = W.surfaceY(P.pos.x, P.pos.z, 99, 0);
  P.update = (dt, A, camYaw, env) => {
    if (P.veh) return;
    model.visible = true;
    if (P.downT > 0) { P.downT -= dt; pose(model, 'down', 0, dt); model.position.copy(P.pos); return; }
    if (P.fly) { // fejlesztői repülés
      const sp = A.sprint ? 60 : 22, fx = -Math.sin(camYaw), fz = -Math.cos(camYaw); P.pos.x += (fx * A.fwd + Math.cos(camYaw) * A.side) * sp * dt; P.pos.z += (fz * A.fwd - Math.sin(camYaw) * A.side) * sp * dt; P.pos.y += (A.up - A.down) * sp * dt; P.vy = 0;
      model.position.copy(P.pos); model.rotation.y = camYaw; pose(model, 'jump', 0, dt); return; }
    const mvx = -Math.sin(camYaw) * A.fwd + Math.cos(camYaw) * A.side, mvz = -Math.cos(camYaw) * A.fwd - Math.sin(camYaw) * A.side, ml = Math.min(1, Math.hypot(mvx, mvz));
    const sp = P.swim ? 2.2 : A.sprint ? 7.6 : 4.6, aiming = A.aim || P.aimT > 0;
    const tvx = ml ? mvx / Math.hypot(mvx, mvz) * sp * ml : 0, tvz = ml ? mvz / Math.hypot(mvx, mvz) * sp * ml : 0, k = Math.min(1, dt * (P.ground ? 12 : 2));
    P.vel.x += (tvx - P.vel.x) * k; P.vel.z += (tvz - P.vel.z) * k;
    if (aiming) P.yaw = camYaw; else if (ml > .1) { const ty = Math.atan2(-mvx, -mvz); let d = ty - P.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); P.yaw += d * Math.min(1, dt * 12); }
    P.pos.x += P.vel.x * dt; P.pos.z += P.vel.z * dt;
    const g = W.surfaceY(P.pos.x, P.pos.z, P.pos.y, .65);
    if (A.jump && P.ground && !P.swim) { P.vy = 5.4; P.ground = false; }
    P.vy -= 9.81 * dt; P.pos.y += P.vy * dt;
    if (P.pos.y <= g) { if (!P.ground && P.vy < -14) env.hurtPlayer?.((-P.vy - 14) * 6, 'esés'); P.pos.y = g; P.vy = 0; P.ground = true; } else if (P.pos.y > g + .25) P.ground = false;
    P.swim = W.inRiver(P.pos.x, P.pos.z) && P.pos.y < -.6; if (P.swim) { P.pos.y = Math.max(P.pos.y, -1.1); P.vy = Math.max(P.vy, 0); P.ground = true; }
    W.pushCircle(P.pos, .35, P.pos.y + .1, 1.7);
    model.position.copy(P.pos); model.rotation.y = P.yaw;
    const hs = Math.hypot(P.vel.x, P.vel.z); P.state = P.swim ? 'swim' : !P.ground ? 'jump' : hs > 5.5 ? 'run' : hs > .5 ? 'walk' : 'idle';
    pose(model, P.state, hs, dt, aiming && !P.swim ? 1 : 0); P.aimT = Math.max(0, P.aimT - dt);
  };
  return P;
}

/* ---------- fegyvermodellek (a kéz koordináta-rendszerében: −Z a cső iránya, +Y felfelé) ---------- */
const WM = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .4, metalness: .1, ...o });
function wp(g, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; g.add(o); return o; }
const cyl = (r1, r2, l, n = 12) => new THREE.CylinderGeometry(r1, r2, l, n).rotateX(Math.PI / 2);
export function buildWeapon(id, tint) {
  const g = new THREE.Group(), water = WM(0x7fd0ff, { transparent: true, opacity: .75, roughness: .05, metalness: 0 }), dark = WM(0x24272c, { roughness: .6 }), metal = WM(0xc8ccd2, { roughness: .2, metalness: .9 });
  if (id === 'pisztoly') { const body = WM(tint ?? 0xff7a1a), acc = WM(0x1f8fd6);
    wp(g, new THREE.BoxGeometry(.055, .1, .24), body, 0, .045, -.07); wp(g, new THREE.BoxGeometry(.05, .13, .06), body, 0, -.03, .01, -.25);
    wp(g, cyl(.018, .024, .1), acc, 0, .065, -.23); wp(g, new THREE.SphereGeometry(.055, 14, 10), water, 0, .13, -.04).scale.set(.9, .8, 1.3);
    wp(g, new THREE.TorusGeometry(.025, .007, 6, 12, Math.PI), dark, 0, -.005, -.05, 0, Math.PI / 2, 0); }
  else if (id === 'tomlo') { const green = WM(0x2e9d4a, { roughness: .7 });
    wp(g, new THREE.BoxGeometry(.045, .12, .05), WM(0xf2c230), 0, -.03, .02, -.2); wp(g, cyl(.028, .022, .12), WM(0xf2c230), 0, .03, -.04); wp(g, cyl(.016, .03, .2), metal, 0, .03, -.19);
    const pts = [new THREE.Vector3(0, .03, .03), new THREE.Vector3(0, -.05, .2), new THREE.Vector3(.05, -.25, .3), new THREE.Vector3(.1, -.45, .25), new THREE.Vector3(.12, -.6, .1)];
    wp(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, .018, 6), green); }
  else if (id === 'bomba') { const b = wp(g, new THREE.SphereGeometry(.085, 16, 12), WM(0x2a7fff, { roughness: .15, transparent: true, opacity: .9 }), 0, .02, -.08); b.scale.set(1, 1, 1.2);
    wp(g, new THREE.ConeGeometry(.02, .04, 8), WM(0x2a7fff), 0, .02, .02, -Math.PI / 2); }
  else if (id === 'puska') { const body = WM(0x2f7d4a), wood = WM(0x8a5a32, { roughness: .8 });
    wp(g, new THREE.BoxGeometry(.06, .08, .52), body, 0, .05, -.2); wp(g, new THREE.BoxGeometry(.05, .12, .2), wood, 0, 0, .16, .25); wp(g, new THREE.BoxGeometry(.045, .1, .05), wood, 0, -.03, .0, -.2);
    wp(g, cyl(.03, .03, .4), metal, 0, .07, -.62); wp(g, new THREE.ConeGeometry(.07, .1, 14).rotateX(-Math.PI / 2), metal, 0, .07, -.86);
    wp(g, cyl(.04, .04, .2), WM(0xd8d0b8), 0, -.01, -.36); wp(g, cyl(.045, .045, .26), water, 0, .14, -.18); }
  else if (id === 'agyu') { const y = WM(0xf2c230, { metalness: .3 }), red = WM(0xc0392b);
    wp(g, cyl(.07, .08, .7), y, 0, .07, -.3); wp(g, cyl(.05, .07, .22), metal, 0, .07, -.75); wp(g, new THREE.TorusGeometry(.075, .015, 6, 16), red, 0, .07, -.62);
    wp(g, new THREE.BoxGeometry(.05, .14, .06), dark, 0, -.04, .02, -.2); wp(g, new THREE.BoxGeometry(.04, .12, .05), dark, 0, -.03, -.35, .3);
    const pts = [new THREE.Vector3(0, .07, .05), new THREE.Vector3(0, .1, .25), new THREE.Vector3(-.15, -.05, .4), new THREE.Vector3(-.3, -.35, .35)];
    wp(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, .025, 6), dark); }
  return g;
}
/* háti tartály a tömlőhöz és a vízágyúhoz */
export function buildBackpack(big) { const g = new THREE.Group(), t = WM(big ? 0xf2c230 : 0x2e9d4a, { metalness: .3 }), strap = WM(0x24272c, { roughness: .8 });
  for (const s of big ? [-1, 1] : [0]) { wp(g, new THREE.CylinderGeometry(.1, .1, .46, 14), t, s * .1, .36, .2); wp(g, new THREE.SphereGeometry(.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), t, s * .1, .59, .2); }
  for (const s of [-1, 1]) wp(g, new THREE.BoxGeometry(.04, .5, .02), strap, s * .14, .4, -.12);
  wp(g, new THREE.BoxGeometry(big ? .36 : .22, .06, .14), strap, 0, .15, .2); return g; }
/* a játékos fegyvereinek felszerelése: mind a kézben, csak az aktuális látszik */
export function equipWeapons(model, ids) {
  const u = model.userData, list = ids.map(id => id === 'kez' ? null : buildWeapon(id)); list.forEach(w => w && u.gun.add(w));
  const bp = [buildBackpack(false), buildBackpack(true)]; bp.forEach(b => { u.torso.add(b); b.visible = false; });
  u.setWeapon = i => { list.forEach((w, k) => { if (w) w.visible = k === i; }); bp[0].visible = ids[i] === 'tomlo'; bp[1].visible = ids[i] === 'agyu'; };
  u.setWeapon(-1);
}
