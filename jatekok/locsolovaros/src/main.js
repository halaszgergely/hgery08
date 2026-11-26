// HGWS: Locsoló Város – főciklus és összekötés
import * as THREE from 'three';
import * as W from './world.js?v=202611262157';
import { initTextures } from './textures.js?v=202611262157';
import { createRender } from './render.js?v=202611262157';
import { createCity } from './city.js?v=202611262157';
import { createInput } from './input.js?v=202611262157';
import { createPlayer, pose, equipWeapons } from './player.js?v=202611262157';
import { makeVehicle, stepVehicle, syncModel, collidePair, radius } from './physics.js?v=202611262157';
import { VEH, repair } from './vehicles.js?v=202611262157';
import { createPeds } from './npc.js?v=202611262157';
import { createTraffic } from './traffic.js?v=202611262157';
import { createFX } from './fx.js?v=202611262157';
import { createWeapons, WEAPONS } from './weapons.js?v=202611262157';
import { createActors } from './actors.js?v=202611262157';
import { createWanted } from './wanted.js?v=202611262157';
import { createAudio } from './audio.js?v=202611262157';
import { createMarkers, createMissions, MAIN } from './missions.js?v=202611262157';
import { createJobs } from './jobs.js?v=202611262157';
import { createUI } from './ui.js?v=202611262157';
import { createCamera, createCine } from './cine.js?v=202611262157';
import { createDev } from './dev.js?v=202611262157';

const SAVE_KEY = 'hgws-locsolovaros-v1', SET_KEY = 'hgws-locsolovaros-settings';
const newSave = () => ({ v: 1, money: 500, mission: 0, props: {}, garage: {}, jumps: {}, zero: 0, stats: { time: 0, dist: 0 }, log: [], weapons: null, pos: { x: 136, z: 27 }, tod: 9, day: 1 });
const loadJSON = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const settings = { quality: 'kozepes', ssao: 0, rain: 'auto', master: .8, sfx: .9, music: .55, sens: 1, invert: 0, ...(loadJSON(SET_KEY) || {}) };

const canvas = document.getElementById('c'), loadEl = document.createElement('div'); loadEl.id = 'load'; loadEl.textContent = 'LOCSOLÓ VÁROS ÉPÜL…'; document.getElementById('ui').appendChild(loadEl);
await new Promise(r => requestAnimationFrame(() => r()));
initTextures();
const R = createRender(canvas), scene = R.scene, camera = R.camera;
R.setQuality(settings.quality, settings.ssao); R.resize(innerWidth, innerHeight);
addEventListener('resize', () => R.resize(innerWidth, innerHeight));

const ctx = { R, scene, camera, vehicles: [], t: 0, tod: 9, settings, save: loadJSON(SAVE_KEY) || newSave(), weather: { k: 0, target: 0, lock: 0, next: 120 }, playing: false, paused: false, prompt: '' };
const S = ctx.save; S.stats ||= { time: 0, dist: 0 }; S.log ||= []; S.garage ||= {}; S.props ||= {}; S.jumps ||= {};
ctx.hasSave = () => !!localStorage.getItem(SAVE_KEY);
ctx.input = createInput(canvas);
ctx.audio = createAudio();
ctx.env = { wet: false, god: false,
  onLand: (b, imp, airT) => { if (imp > 3) ctx.audio.land(imp); ctx.jobs?.onLand(b, imp, airT); if (b === ctx.player.veh && imp > 6) ctx.cam.shake = Math.min(1, imp * .05); },
  onCrash: (b, v) => { if (v > 4) { ctx.audio.crash(v, b.pos); if (v > 8) ctx.fx.sparks(b.pos.x, b.pos.y + .6, b.pos.z, 10); } if (b === ctx.player.veh) { ctx.cam.shake = Math.min(1, v * .06); if (ctx.input.pad && v > 5) navigator.getGamepads?.()[0]?.vibrationActuator?.playEffect?.('dual-rumble', { duration: 180, strongMagnitude: Math.min(1, v / 20), weakMagnitude: .4 }); } },
  onBump: (a, c, v) => { const pv = ctx.player.veh; if (v > 3 && pv && (a === pv || c === pv)) { const o = a === pv ? c : a; o.lastDamager = ctx.player; if (o.J?.cop) ctx.crime('copcar', o.pos.x, o.pos.z); if (o.ai?.mode === 'traffic' && v > 6) ctx.peds.scare(o.pos.x, o.pos.z, 20); } },
  onDamage: (b, a) => { if (b.driver?.isPlayer && b.kind === 'bike' && a > 60) { ctx.exitVehicle(true); ctx.player.downT = 1.6; ctx.hurtPlayer(a * .1, 'bukás'); } },
  onExplode: b => explode(b), onProp: p => { ctx.city.refreshProps(ctx.player.pos.x, ctx.player.pos.z, R.Q.props); if (p.t === 'hydrant') ctx.gushers.push({ x: p.x, z: p.z, y: p.y, t: 25 }); }
};
ctx.gushers = [];
ctx.city = createCity(scene, () => R.Q);
ctx.fx = createFX(scene);
ctx.markers = createMarkers(scene);
ctx.player = createPlayer(scene);
ctx.peds = createPeds(scene);
ctx.actors = createActors(ctx);
ctx.weapons = createWeapons(ctx);
ctx.wanted = createWanted(ctx);
ctx.traffic = createTraffic(ctx);
ctx.ui = createUI(ctx);
ctx.cam = createCamera(camera);
ctx.cine = createCine(camera, ctx.ui, ctx.input);
ctx.missions = createMissions(ctx);
ctx.jobs = createJobs(ctx);
ctx.dev = createDev(ctx);
ctx.audio.onRadio = e => { if (!ctx.player.veh) return; if (e.type === 'song') ctx.ui.toast(`📻 ${e.station}: <b>${e.artist}</b> – ${e.title}`, 'radio'); if (e.type === 'ad') ctx.ui.toast(`REKLÁM · ${e.text}`, 'ad'); };
ctx.input.onKonami = () => ctx.dev.activate();
ctx.onWaterGround = (x, z) => ctx.missions.onWater(x, z);
const pl = ctx.player;
equipWeapons(pl.model, WEAPONS.map(w => w.id));
/* ---------- segédek ---------- */
ctx.money = (d, why) => { S.money = Math.max(0, Math.round(S.money + d)); S.log.push([Math.round(d), why || '']); if (S.log.length > 60) S.log.shift(); if (d > 0) ctx.audio.money(); };
ctx.stat = k => { S.stats[k] = (S.stats[k] || 0) + 1; };
const crimeCool = {};
ctx.crime = (type, x, z) => { if (ctx.cine.active) return; const now = ctx.t; if (crimeCool[type] > now) return; crimeCool[type] = now + (type === 'ped' ? 1.5 : 1); if (type === 'ped') ctx.stat('soaked'); ctx.wanted.crime(type, x, z); S.stats.maxWanted = Math.max(S.stats.maxWanted || 0, ctx.wanted.level); };
ctx.addVehicle = (id, x, z, yaw = 0, color) => { const b = makeVehicle(id, x, z, yaw, color ?? Math.floor(Math.random() * 9)); scene.add(b.model.g); ctx.vehicles.push(b); return b; };
ctx.removeVehicle = b => { const i = ctx.vehicles.indexOf(b); if (i >= 0) ctx.vehicles.splice(i, 1); scene.remove(b.model.g); b.model.g.traverse(o => { if (o.geometry && o.userData.base) o.geometry.dispose(); }); if (ctx.wanted.heli === b) ctx.wanted.heli = null; };
ctx.repairVehicle = b => { repair(b.model); b.hp = b.maxHp; b.wrecked = false; b.burnT = 0; b.burntPaint = 0; const c = VEH[b.id].cols; b.model.paint.color.setHex(c[b.color % c.length]); b.model.paint.roughness = .32; b.model.paint.metalness = .25; };
function freeSpot(x, z, yaw, r = 3) { // szabad, talajszintű hely a közelben (nem épületben, nem tetőn)
  for (const d of [8, 12, 6, 16, 20, 26]) for (const a of [0, .6, -.6, 1.3, -1.3, Math.PI, 2.2, -2.2]) { const px = x - Math.sin(yaw + a) * d, pz = z - Math.cos(yaw + a) * d; let bad = W.inRiver(px, pz);
    if (!bad) W.collNear(px, pz, r, c => { if (!bad && px + r > c.x0 && px - r < c.x1 && pz + r > c.z0 && pz - r < c.z1 && c.y1 > W.groundY(px, pz) + .4) bad = true; }); if (!bad) return [px, pz, yaw + a]; }
  return [x, z, yaw]; }
ctx.freeSpot = freeSpot;
ctx.spawnNear = id => { const p = pl.veh ? pl.veh.pos : pl.pos, yaw = pl.veh ? pl.veh.yaw : pl.yaw, [sx, sz] = freeSpot(p.x, p.z, yaw, Math.max(VEH[id].l, VEH[id].w) / 2 + .5), b = ctx.addVehicle(id, sx, sz, yaw); b.keep = 1; if (b.kind === 'heli') b.pos.y = W.surfaceY(b.pos.x, b.pos.z, p.y + 3, 2); return b; };
ctx.callTaxi = () => { const p = pl.pos, n = W.nearestNode(p.x, p.z); const b = ctx.addVehicle('taxi', n.x + 3.5, n.z + 14, 0); b.keep = 1; b.lights = R.env.lampsOn; ctx.ui.waypoint = { x: b.pos.x, z: b.pos.z, kind: 'way' }; };
ctx.teleport = (x, z) => { const y = W.surfaceY(x, z, 999, 0); if (pl.veh) { pl.veh.pos.set(x, y + .5, z); pl.veh.vel.set(0, 0, 0); } else { pl.pos.set(x, y + .2, z); pl.vy = 0; } ctx.city.refreshProps(x, z, R.Q.props); };
ctx.fullscreen = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}); };
ctx.setSetting = (k, v) => { settings[k] = v; localStorage.setItem(SET_KEY, JSON.stringify(settings)); if (k === 'quality' || k === 'ssao') R.setQuality(settings.quality, settings.ssao); if (['master', 'sfx', 'music'].includes(k)) ctx.audio.setVol(k, v); };
for (const k of ['master', 'sfx', 'music']) ctx.audio.setVol(k, settings[k]);
ctx.autosave = force => { if (ctx.dev.on || !ctx.playing) return; if (!force && ctx.missions.cur) return; const p = pl.veh ? pl.veh.pos : pl.pos; if (!ctx.missions.cur) S.pos = { x: p.x, z: p.z }; S.tod = ctx.tod;
  S.weapons = { owned: ctx.weapons.st.owned, ammo: ctx.weapons.st.ammo.map(a => a === Infinity ? -1 : a), clip: ctx.weapons.st.clip }; try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch { } };
ctx.hurtPlayer = (a, why) => { if (ctx.env.god || pl.dead || ctx.cine.active) return; if (pl.armor > 0) { const t = Math.min(pl.armor, a * .7); pl.armor -= t; a -= t; } pl.hp -= a; pl.wetT = Math.min(1.2, (pl.wetT || 0) + a * .04); if (pl.hp <= 0) die('KISZÁRADTÁL', 'Rehidratáló kezelés a HGWS-központban', { x: 136, z: 34 }, .1); };
ctx.bust = () => { if (pl.dead) return; die('ELKAPTAK', 'A Vízügyi Ellenőrzés bírságot szabott ki', { x: -50, z: -30 }, .12); };
function die(t, s, at, fee) { pl.dead = true; ctx.missions.abort(t === 'ELKAPTAK' ? 'Elkaptak' : 'Kiszáradtál'); ctx.ui.banner(t, s, true); if (pl.veh) ctx.exitVehicle(true); pl.downT = 3.2;
  setTimeout(() => { const f = Math.round(S.money * fee); if (f) ctx.money(-f, t === 'ELKAPTAK' ? 'Vízügyi bírság' : 'Rehidratáló kezelés'); ctx.wanted.clear(); pl.hp = 100; pl.armor = 0; pl.dead = false; pl.downT = 0; pl.wetT = 0; ctx.teleport(at.x, at.z); pl.yaw = 0; ctx.cam.yaw = 0; ctx.actors.clear('cop'); }, 3200); }
/* ---------- beszállás / kiszállás ---------- */
function nearestEnterable() { let best = null, bd = 1e9; for (const b of ctx.vehicles) { if (b.tram || b.wrecked || b.sink > .5) continue; const d = Math.hypot(b.pos.x - pl.pos.x, b.pos.z - pl.pos.z) - radius(b) * .8; if (d < 2.6 && d < bd && Math.abs(b.pos.y - pl.pos.y) < 2.5) { bd = d; best = b; } } return best; }
ctx.enterVehicle = b => {
  if (b.driver?.npc) { const side = 1; const x = b.pos.x - Math.cos(b.yaw) * (b.J.w / 2 + .9) * side, z = b.pos.z + Math.sin(b.yaw) * (b.J.w / 2 + .9) * side; if (b.J.cop) { ctx.actors.spawn({ x, z, look: 'cop', team: 'cop', ai: 'hunt', hp: 70, tag: 'cop' }); ctx.crime('cop', x, z); }
    else { ctx.peds.spawnAt(x, z, true); if (ctx.wanted.units.some(u => Math.hypot(u.pos.x - b.pos.x, u.pos.z - b.pos.z) < 60) || Math.random() < .25) ctx.crime('theft', x, z); } }
  if (b.ai?.mode === 'traffic') { const i = ctx.traffic.cars.indexOf(b); if (i >= 0) ctx.traffic.cars.splice(i, 1); }
  if (ctx.wanted.units.includes(b)) ctx.wanted.units.splice(ctx.wanted.units.indexOf(b), 1);
  b.ai = null; b.driver = pl; b.keep = 1; pl.veh = b; pl.fly = false; b.siren = false; b.lights = R.env.lampsOn; pl.model.visible = b.kind === 'bike';
  if (b.J.radio) ctx.audio.radio(b.J.radio === 'retro' ? 0 : b.J.radio === 'pop' ? 1 : 2); ctx.audio.blip();
};
ctx.exitVehicle = (force) => {
  const b = pl.veh; if (!b) return; if (!force && b.speed > 6 && b.kind !== 'heli') return;
  const r = b.J.w / 2 + .8, x = b.pos.x - Math.cos(b.yaw) * r, z = b.pos.z + Math.sin(b.yaw) * r; pl.pos.set(x, b.pos.y + .3, z); W.pushCircle(pl.pos, .4, pl.pos.y, 1.7);
  pl.vel.set(b.vel.x * .5, 0, b.vel.z * .5); pl.vy = 0; pl.yaw = b.yaw; b.driver = null; pl.veh = null; pl.model.visible = true; b.brakeOn = false;
  if (b.speed > 6 && b.kind !== 'heli') { pl.downT = 1.2; ctx.hurtPlayer(b.speed * .8, 'kiugrás'); }
  ctx.audio.radio(-1); ctx.audio.engine(false, 0); };
/* ---------- robbanás ---------- */
function explode(b) { ctx.fx.explosion(b.pos.x, b.pos.y, b.pos.z); ctx.audio.explosion(b.pos); ctx.cam.shake = Math.max(ctx.cam.shake, Math.max(0, 1 - Math.hypot(camera.position.x - b.pos.x, camera.position.z - b.pos.z) / 60));
  for (const q of ctx.peds.list) if (Math.hypot(q.x - b.pos.x, q.z - b.pos.z) < 9) ctx.peds.soak(q, q.x - b.pos.x, q.z - b.pos.z, 3); ctx.peds.scare(b.pos.x, b.pos.z, 45);
  for (const o of ctx.vehicles) if (o !== b && !o.tram) { const d = Math.hypot(o.pos.x - b.pos.x, o.pos.z - b.pos.z); if (d < 9) { o.hp = Math.max(0, o.hp - 300 * (1 - d / 9)); o.vel.x += (o.pos.x - b.pos.x) / (d || 1) * 6 * 1500 / Math.max(1000, o.J.m); o.vel.z += (o.pos.z - b.pos.z) / (d || 1) * 6 * 1500 / Math.max(1000, o.J.m); o.vy += 4 * 1500 / Math.max(1000, o.J.m); o.air = true; } }
  for (const a of ctx.actors.list) if (Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) < 8) ctx.actors.damage(a, 200, b.pos.x, b.pos.z, null);
  if (pl.veh === b) { ctx.exitVehicle(true); pl.downT = 2; ctx.hurtPlayer(45, 'robbanás'); } else { const d = Math.hypot(pl.pos.x - b.pos.x, pl.pos.z - b.pos.z); if (!pl.veh && d < 8) { pl.downT = 1.5; ctx.hurtPlayer(50 * (1 - d / 8), 'robbanás'); } }
  b.vy = 6; b.air = true; ctx.stat('wrecks'); if (b.lastDamager === pl) ctx.crime('wreck', b.pos.x, b.pos.z); }
/* ---------- indítás / menü ---------- */
function applySave() {
  const w = S.weapons; if (w) { ctx.weapons.st.owned = w.owned; ctx.weapons.st.ammo = w.ammo.map(a => a === -1 ? Infinity : a); ctx.weapons.st.clip = w.clip; } else { ctx.weapons.st.owned = [1, 1, 0, 0, 0, 0]; ctx.weapons.st.ammo = [Infinity, 120, 0, 0, 0, 0]; ctx.weapons.st.clip = [0, 12, 0, 0, 6, 0]; }
  ctx.weapons.st.cur = 1; ctx.tod = S.tod ?? 9; pl.hp = 100; pl.armor = 0; ctx.teleport(S.pos.x, S.pos.z); pl.yaw = Math.PI; ctx.cam.yaw = Math.PI; ctx.cam.pitch = -.15;
}
ctx.start = fresh => { ctx.audio.init(); if (fresh) { localStorage.removeItem(SAVE_KEY); Object.keys(S).forEach(k => delete S[k]); Object.assign(S, newSave()); }
  applySave(); ctx.ui.showScreen(null); ctx.ui.showHud(true); ctx.playing = true; ctx.paused = false; ctx.jobs.refresh(); canvas.requestPointerLock?.(); ctx.autosave(true);
  if (fresh) ctx.ui.banner('LOCSOLÓ VÁROS', 'Halász Gergely Watering Solutions'); };
ctx.resume = () => { ctx.paused = false; ctx.ui.showScreen(null); ctx.ui.showHud(true); canvas.requestPointerLock?.(); };
ctx.toMenu = () => { ctx.autosave(true); ctx.missions.abort('Kiléptél'); ctx.playing = false; ctx.paused = false; if (pl.veh) ctx.exitVehicle(true); ctx.ui.showHud(false); ctx.ui.showScreen('main'); ctx.audio.radio(-1); ctx.audio.engine(false, 0); };
/* ---------- bemenet (egyszeri gombok) ---------- */
const I = ctx.input;
addEventListener('keydown', e => {
  if (ctx.ui.screen) { if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.code)) { ctx.ui.screenKey(e.code); e.preventDefault(); } I.consume(e.code); return; }
  if (ctx.ui.menuOpen) { ctx.ui.menuKey(e.code); I.consume(e.code); return; }
  if (ctx.dev.open && e.code === 'Escape') { ctx.dev.toggle(false); I.consume(e.code); return; }
  if (ctx.ui.phoneOpen && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Backspace'].includes(e.code)) { ctx.ui.phoneKey(e.code); I.consume(e.code); return; }
});
function onceKeys() {
  const P = I.pad || {};
  if (ctx.cine.active) return;
  if (I.hit('Escape') || P.pstart) { if (ctx.ui.mapOpen) ctx.ui.toggleMap(false); else if (ctx.ui.phoneOpen) ctx.ui.togglePhone(false); else if (ctx.dev.open) ctx.dev.toggle(false); else { ctx.paused = true; ctx.ui.showHud(false); ctx.ui.showScreen('pause'); } return; }
  if (I.hit('KeyM') || P.pback) { ctx.ui.toggleMap(); if (ctx.ui.phoneOpen) ctx.ui.togglePhone(false); }
  if ((I.hit('ArrowUp') || P.pup) && !ctx.ui.phoneOpen && !ctx.ui.mapOpen) { ctx.ui.togglePhone(true); return; }
  if (ctx.ui.phoneOpen) { if (P.pb) ctx.ui.togglePhone(false); if (P.pup) ctx.ui.phoneKey('ArrowUp'); if (P.pdown) ctx.ui.phoneKey('ArrowDown'); if (P.pleft) ctx.ui.phoneKey('ArrowLeft'); if (P.pright) ctx.ui.phoneKey('ArrowRight'); if (P.pa) ctx.ui.phoneKey('Enter'); return; }
  if (ctx.ui.mapOpen) return;
  if (I.hit('KeyC') || P.pr3) ctx.cam.zoom = (ctx.cam.zoom + 1) % 3;
  if (I.hit('KeyF') || P.py) { if (pl.veh) ctx.exitVehicle(); else if (!pl.dead && pl.downT <= 0) { const b = nearestEnterable(); if (b) ctx.enterVehicle(b); } }
  const v = pl.veh;
  if (v) { if (v.J.radio && v.kind !== 'heli') { const st = ctx.audio.station; if (I.hit('KeyE') && !ctx.jobs.prompt || P.pright) ctx.audio.radio(st >= 2 ? -1 : st + 1); if (I.hit('KeyQ') || P.pleft) ctx.audio.radio(st <= -1 ? 2 : st - 1); }
    if (I.hit('KeyH') || P.pb) { if (v.J.cop) v.siren = !v.siren; else ctx.audio.horn(v.pos); ctx.peds.scare(v.pos.x, v.pos.z, 10); }
    if (I.hit('KeyL')) v.lights = !v.lights; }
  else { for (let i = 0; i < 6; i++) if (I.hit('Digit' + (i + 1))) ctx.weapons.select(i); if (I.wheel) ctx.weapons.cycle(I.wheel > 0 ? 1 : -1); if (P.pleft) ctx.weapons.cycle(-1); if (P.pright) ctx.weapons.cycle(1); }
}
/* ---------- főciklus ---------- */
const DTMAX = /[?&]lassu/.test(location.search) ? .2 : .05;
let last = performance.now(), menuT = 0, saveT = 0, fpsA = 0, fpsN = 0;
const tmpV = new THREE.Vector3();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(DTMAX, (now - last) / 1000); last = now; I.poll();
  const playing = ctx.playing && !ctx.paused;
  if (playing && !ctx.cine.active && !ctx.ui.menuOpen && !ctx.dev.open) onceKeys();
  const wheelHeld = playing && !pl.veh && !ctx.cine.active && (I.down('Tab') || (I.pad?.lb > .5 && !pl.veh));
  if (wheelHeld) { ctx.ui.wheel(true, I.mx + (I.pad?.rx || 0) * 20, I.my + (I.pad?.ry || 0) * 20); dt *= .3; } else if (ctx.ui.wheelOpen) { const i = ctx.ui.wheel(true); ctx.ui.wheel(false); ctx.weapons.select(i); }
  const frozen = !playing || ctx.ui.mapOpen || ctx.ui.menuOpen;
  ctx.t += frozen && playing ? 0 : dt;
  if (!frozen) step(dt, wheelHeld); else if (!ctx.playing) menuCam(dt);
  if (ctx.cine.active) ctx.cine.update(dt);
  // környezet
  if (!frozen || !ctx.playing) { ctx.tod = (ctx.tod + dt / 60 * (ctx.playing ? 1 : 4)) % 24; weather(dt); }
  const focus = pl.veh ? pl.veh.pos : ctx.playing ? pl.pos : camera.position;
  const env = R.setTime(ctx.tod, ctx.weather.k, tmpV.set(focus.x, 0, focus.z)); ctx.env.wet = ctx.weather.k > .3;
  ctx.city.update(camera, env, ctx.t); ctx.markers.update(ctx.t, camera.position); ctx.fx.update(frozen && ctx.playing ? 0 : dt, camera); R.updateRain(ctx.weather.k, camera, dt, ctx.t);
  for (const b of ctx.vehicles) { b.model.g.visible = Math.abs(b.pos.x - camera.position.x) < R.Q.far && Math.abs(b.pos.z - camera.position.z) < R.Q.far; if (!b.tram) syncModel(b, ctx.t, frozen ? 0 : dt); if (!b.driver?.isPlayer && b.lights !== env.lampsOn && !b.tram) b.lights = env.lampsOn; }
  ctx.ui.update(dt, I.axes());
  ctx.audio.listener(camera.position);
  R.render(ctx.t);
  I.endFrame();
  fpsA += dt; fpsN++; if (fpsA > 1) { ctx.fps = fpsN / fpsA; fpsA = 0; fpsN = 0; }
}
function weather(dt) { const w = ctx.weather; if (settings.rain === 'off') w.target = 0; else if (w.lock > 0) w.lock -= dt; else { w.next -= dt; if (w.next <= 0) { w.next = 120 + Math.random() * 240; w.target = Math.random() < .3 ? .6 + Math.random() * .4 : 0; } } w.k += Math.sign(w.target - w.k) * Math.min(Math.abs(w.target - w.k), dt * .05); }
function menuCam(dt) { menuT += dt * .04; const r = 260; camera.position.set(Math.cos(menuT) * r + 100, 70 + Math.sin(menuT * 1.7) * 15, Math.sin(menuT) * r); camera.lookAt(80, 15, 0); camera.fov = 55; camera.updateProjectionMatrix(); ctx.traffic.update(dt, camera.position.x, camera.position.z, 12); for (const b of ctx.vehicles) if (b.ai?.mode === 'traffic') b.lights = R.env.lampsOn; ctx.peds.update(dt, camera.position.x, camera.position.z, 0, { carNear: () => false }); }
function step(dt, wheelHeld) {
  const A = I.axes(), P = I.pad || {}, cin = ctx.cine.active;
  if (cin) { A.fwd = A.side = A.thr = A.brk = A.steer = A.up = A.down = 0; A.fire = A.aim = A.jump = A.hand = false; }
  if (!wheelHeld && !cin) ctx.cam.look(I.mx + (P.rx || 0) * 14, I.my + (P.ry || 0) * 10, settings.sens, settings.invert);
  // játékos
  const v = pl.veh, sub = dt > 1 / 45 ? 2 : 1, h = dt / sub;
  if (v) {
    const In = { thr: A.thr, brk: A.brk, steer: A.steer, hand: A.hand ? 1 : 0, up: A.up, down: A.down, strafe: (I.down('KeyE') ? 1 : 0) - (I.down('KeyQ') ? 1 : 0) + (P.rx || 0) };
    if (v.kind === 'heli') { In.steer = A.steer; In.thr = Math.max(0, A.fwd); In.brk = Math.max(0, -A.fwd); }
    if (v.wrecked) Object.assign(In, { thr: 0, brk: 0, steer: 0 });
    v.brakeOn = In.brk > .1 && v.vf > .5; for (let i = 0; i < sub; i++) stepVehicle(v, In, h, ctx.env);
    if (v.kind === 'tank') { let d = ctx.cam.yaw - v.yaw - v.turretYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); v.turretYaw += Math.max(-dt * 1.2, Math.min(dt * 1.2, d)); v.gunPitch = Math.max(-.1, Math.min(.4, ctx.cam.pitch + .22)); }
    if (v.J.sprayer) { let d = ctx.cam.yaw - v.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); v.nozzleYaw = Math.max(-1.2, Math.min(1.2, d)); if (v.model.nozzle) v.model.nozzle.rotation.y = v.nozzleYaw; }
    if ((v.kind === 'tank' || v.J.sprayer) && !cin) ctx.weapons.vehicleSpray(v, dt, I.lmb || (P.rb > .5 && v.kind !== 'heli') || (P.x > .5), ctx.cam);
    const rpm = v.kind === 'heli' ? v.rotor : Math.min(1, Math.abs(v.vf) / v.J.vmax) * .85 + A.thr * .15; ctx.audio.engine(!v.wrecked, rpm, v.kind); ctx.audio.skid(v.skid);
    const rp = W.rampAt(v.pos.x, v.pos.z); if (rp?.jump && !v.air) v.jumpFrom = rp.jump; else if (!v.air && !rp) v.jumpFrom = null;
    pl.pos.copy(v.pos); S.stats.dist += v.speed * dt;
    if (v.kind === 'bike') { const m = pl.model; m.position.set(v.pos.x, v.pos.y + .25, v.pos.z); m.rotation.set(0, 0, 0); m.rotateY(v.yaw); m.rotateZ(v.lean); m.rotateX(v.pitch); pose(m, 'sit', 0, dt); m.userData.hips.position.y = .62; }
    for (const b of ctx.vehicles) if (b.J.cop && b.siren) { /* jelzés */ }
  } else {
    pl.update(dt, A, ctx.cam.yaw, ctx); if (!pl.dead) ctx.weapons.update(dt, A, { pos: camera.position, dir: ctx.cam.dir }, pl); S.stats.dist += Math.hypot(pl.vel.x, pl.vel.z) * dt;
    const b = nearestEnterable(); ctx.prompt = b && !cin && !pl.dead ? `[F] ${b.driver?.npc ? 'Elvétel: ' : 'Beszállás: '}${VEH[b.id]?.n}` : '';
    if (W.inRiver(pl.pos.x, pl.pos.z) && pl.pos.y < -.6) pl.wetT = 1;
  }
  pl.model.userData.setWeapon(v || pl.swim ? -1 : ctx.weapons.st.cur);
  if (v) ctx.prompt = '';
  pl.wetT = Math.max(0, (pl.wetT || 0) - dt * .25); if (!v && pl.hp < 100 && pl.hp > 0) pl.hp = Math.min(100, pl.hp + dt * .4);
  S.stats.time += dt;
  // a világ
  const p = v ? v.pos : pl.pos;
  ctx.traffic.update(dt, p.x, p.z, R.Q.cars);
  for (const b of ctx.vehicles) { if (b === v || b.tram || b.ai?.mode === 'traffic' || ctx.wanted.units.includes(b) || b === ctx.wanted.heli || b.ai?.mode === 'leave') continue;
    if (b.ai) ctx.jobs.driveAI(b, dt); else if (b.kind !== 'heli' || b.pos.y > W.groundY(b.pos.x, b.pos.z) + .1 || b.rotor > 0) stepVehicle(b, { thr: 0, brk: b.driver ? 0 : .3, steer: 0, hand: 1, up: 0, down: 0 }, dt, ctx.env); }
  ctx.wanted.update(dt);
  // jármű-jármű ütközés
  const VL = ctx.vehicles; for (let i = 0; i < VL.length; i++) for (let j = i + 1; j < VL.length; j++) { const a = VL[i], c = VL[j]; const r = radius(a) + radius(c); if (Math.abs(a.pos.x - c.pos.x) < r && Math.abs(a.pos.z - c.pos.z) < r) collidePair(a, c, ctx.env); }
  // elütések
  for (const b of VL) { if (b.speed < 3 || b.kind === 'heli' && b.pos.y - W.groundY(b.pos.x, b.pos.z) > 2) continue; const rr = radius(b) + .4, c = Math.cos(b.yaw), s = Math.sin(b.yaw);
    const inside = (x, z, y) => { const dx = x - b.pos.x, dz = z - b.pos.z; if (Math.abs(dx) > rr || Math.abs(dz) > rr || Math.abs(y - b.pos.y) > 2) return false; const lx = dx * c - dz * s, lz = dx * s + dz * c; return Math.abs(lx) < b.J.w / 2 + .35 && Math.abs(lz) < b.J.l / 2 + .35; };
    for (const q of ctx.peds.list) if (q.st !== 'down' && inside(q.x, q.z, q.y)) { ctx.peds.soak(q, b.vel.x, b.vel.z, 2); q.x += b.vel.x * .08; q.z += b.vel.z * .08; ctx.audio.crash(4, b.pos); if (b === v) ctx.crime('runover', q.x, q.z); }
    for (const a of ctx.actors.list) if (a.hp > 0 && inside(a.pos.x, a.pos.z, a.pos.y)) { ctx.actors.damage(a, b.speed * 6, b.pos.x, b.pos.z, b === v ? pl : null); a.pos.x += b.vel.x * .1; a.pos.z += b.vel.z * .1; }
    if (!v && b !== v && !pl.dead && inside(pl.pos.x, pl.pos.z, pl.pos.y) && pl.downT <= 0) { pl.downT = 1.6; pl.vel.set(b.vel.x * .6, 0, b.vel.z * .6); ctx.hurtPlayer(b.speed * 2.2, 'elütés'); pl.pos.x += b.vel.x * .1; pl.pos.z += b.vel.z * .1; } }
  // sérülés-effektek
  for (const b of VL) { if (b.tram || !b.maxHp) continue; const k = b.hp / b.maxHp, fx = -Math.sin(b.yaw), fz = -Math.cos(b.yaw), hx = b.pos.x + fx * b.J.l * .35, hz = b.pos.z + fz * b.J.l * .35, hy = b.pos.y + b.J.h * .7;
    if (Math.abs(b.pos.x - camera.position.x) > 160 || Math.abs(b.pos.z - camera.position.z) > 160) continue;
    if (b.wrecked) { if (Math.random() < .3) ctx.fx.smoke(b.pos.x, hy, b.pos.z, .15, 1.4); if (b.burnT < 30 && Math.random() < .6) ctx.fx.fire(b.pos.x, b.pos.y + b.J.h * .5, b.pos.z, 1.3); b.burnT += dt; }
    else if (k < .12) { ctx.fx.fire(hx, hy, hz, .8); if (Math.random() < .5) ctx.fx.smoke(hx, hy + .5, hz, .2); }
    else if (k < .35 && Math.random() < dt * 14) ctx.fx.smoke(hx, hy, hz, .55 - k); }
  // gyalogosok, szereplők
  ctx.peds.update(dt, p.x, p.z, R.Q.peds, { carNear: (x, z, r) => VL.some(b => b.speed > 2 && Math.abs(b.pos.x - x) < r && Math.abs(b.pos.z - z) < r) });
  ctx.actors.update(dt);
  ctx.missions.update(dt); ctx.jobs.update(dt);
  // sziréna-hang
  let sk = 0; for (const b of VL) if (b.siren) sk = Math.max(sk, 1 - Math.hypot(b.pos.x - camera.position.x, b.pos.z - camera.position.z) / 140); ctx.audio.siren(sk);
  // szökőkút és tűzcsapok
  if (ctx.fountainOn !== undefined || S.mission > 0) { const fx0 = -50, fz0 = -62; if (Math.hypot(fx0 - p.x, fz0 - p.z) < 160 && Math.random() < .9) for (let i = 0; i < 3; i++) { const a = Math.random() * 6.28; ctx.fx.emit({ x: fx0, y: W.groundY(fx0, fz0) + 2.8, z: fz0, vx: Math.cos(a) * 1.2, vy: 5.5 + Math.random(), vz: Math.sin(a) * 1.2, life: 1.3, size: .22, grow: .3, a: .7, a1: .2 }); } }
  for (let i = ctx.gushers.length - 1; i >= 0; i--) { const g = ctx.gushers[i]; g.t -= dt; if (g.t <= 0) { ctx.gushers.splice(i, 1); continue; } if (Math.hypot(g.x - p.x, g.z - p.z) < 150) for (let k = 0; k < 4; k++) ctx.fx.emit({ x: g.x, y: g.y + .6, z: g.z, vx: (Math.random() - .5) * 1.5, vy: 9 + Math.random() * 3, vz: (Math.random() - .5) * 1.5, life: 2, size: .3, grow: .5, a: .7, a1: .1, splash: true }); }
  // kamera
  if (!cin) ctx.cam.update(dt, pl, !v && (A.aim || pl.aimT > 0) && ctx.weapons.st.cur > 0);
  // ingatlan-bevétel éjfélkor
  if (ctx.tod < ctx._lastTod) { S.day = (S.day || 1) + 1; const inc = Object.keys(S.props).reduce((a, k) => a + (W.PROPS_FOR_SALE.find(q => q.id === k)?.inc || 0), 0); if (inc) { ctx.money(inc, 'Ingatlanbevétel'); ctx.ui.toast(`HGWS Bank: ingatlanbevétel +${inc.toLocaleString('hu')} Ft`); } } ctx._lastTod = ctx.tod;
  saveT += dt; if (saveT > 45) { saveT = 0; ctx.autosave(); }
}
/* ---------- a pointer lock elvesztése szünetet jelent ---------- */
let wasLocked = false;
document.addEventListener('pointerlockchange', () => { const L = document.pointerLockElement === canvas; if (wasLocked && !L && ctx.playing && !ctx.paused && !ctx.ui.mapOpen && !ctx.ui.menuOpen && !ctx.ui.phoneOpen && !ctx.dev.open && !ctx.cine.active) { ctx.paused = true; ctx.ui.showHud(false); ctx.ui.showScreen('pause'); } wasLocked = L; });
/* ---------- indulás ---------- */
loadEl.remove();
ctx.dev.on && ctx.ui.dev(true);
requestAnimationFrame(frame);
await ctx.ui.intro();
ctx.ui.showScreen('main');
window.__game = ctx;
