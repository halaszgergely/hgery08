/* HGWS Légi Öntözés – főprogram: betöltés, renderelés, játékhurok, kamerák, töltés, küldetések, feloldások. */
import * as THREE from 'three';
import { GEPEK, GEP, REPTER, REPTEREK, KULDETESEK, FORGO, ZERO_HELY, GAME } from './config.js?v=202611212314';
import * as GEO from './geo.js?v=202611212314';
import { createTerrain } from './terep.js?v=202611212314';
import { createWorld } from './vilag.js?v=202611212314';
import { buildModel, animate } from './modellek.js?v=202611212314';
import { createBody, placeOn, step } from './fizika.js?v=202611212314';
import { createSpray } from './permet.js?v=202611212314';
import { createMission } from './kuldetes.js?v=202611212314';
import { createAudio } from './hang.js?v=202611212314';
import { createControls } from './iranyitas.js?v=202611212314';
import { createHud, setMapImage, drawMap } from './hud.js?v=202611212314';
import { createUI } from './ui.js?v=202611212314';
import * as RL from './ranglista.js?v=202611212314';

const $ = s => document.querySelector(s);
const LS = 'hgws_legi_v1', TOUCH = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
const DEBUG = new URLSearchParams(location.search).has('debug');
/* ---------- mentés és beállítások ---------- */
const DEF_SET = { q: TOUCH ? 'alacsony' : 'kozepes', view: TOUCH ? 24 : 40, vol: .7, sens: 1, inv: 0, wind: 1, tod: 'nappal', cloud: 1, tiles: 1, gyro: 0, fps: 0 };
let save = { pont: 0, unl: [], best: {}, zero: 0, gep: 'permetezo', set: {} };
try { const o = JSON.parse(localStorage.getItem(LS) || 'null'); if (o) save = { ...save, ...o }; } catch (_) {}
const SET = { ...DEF_SET, ...(save.set || {}) }; save.set = SET;
function persist() { try { localStorage.setItem(LS, JSON.stringify(save)); } catch (_) {} RL.cloudSave(save); }
const unlocked = g => g.titkos ? !!save.zero : g.pont <= save.pont || save.unl.includes(g.id);
if (!unlocked(GEP[save.gep])) save.gep = 'permetezo';
const QUAL = { alacsony: { pr: .85, prCap: 1, tree: 1800, dens: .45, shadow: false, part: .5, maxView: 30 }, kozepes: { pr: 1, prCap: 1.5, tree: 3600, dens: 1, shadow: false, part: 1, maxView: 80 }, magas: { pr: 1, prCap: 2, tree: 7000, dens: 1.4, shadow: true, part: 1.4, maxView: 80 } };

/* ---------- renderer, jelenet ---------- */
const canvas = $('#c'), renderer = new THREE.WebGLRenderer({ canvas, antialias: SET.q !== 'alacsony', logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, .5, 60000); scene.add(cam);
let pr = 1, prCap = 1;
function resize() { renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); spray?.setScale(innerHeight * pr / (2 * Math.tan(cam.fov * Math.PI / 360))); }
addEventListener('resize', resize);

const audio = createAudio(), ctl = createControls(SET), hud = createHud();
ctl.bindTouch($('#tc'));
let terrain, world, spray, ui, towns = [];
/* ---------- állapot ---------- */
let state = 'load', mode = 'szabad', b = null, model = null, mission = null, missionDef = null, camMode = 'kulso', timeK = 1, acc = 0, lastTouch = 0, refillMsg = 0, ended = false, crashT = 0, debris = null;
let startRepter = 'miskolc', previewId = null, previewModel = null, menuAng = 0, orbit = { yaw: 0, pitch: .25, dist: 0 }, mapOpen = false, scoreShow = 0, tileT = 0;
const env = { ground: GEO.ground, surface: GEO.surfaceAt, isWater: GEO.isWater, wind: (p, g) => world.wind(p, g), slope: (x, z) => { const e = 30; return Math.hypot(GEO.ground(x + e, z) - GEO.ground(x - e, z), GEO.ground(x, z + e) - GEO.ground(x, z - e)) / (2 * e); }, event: onEvent };

function canUse(g, r) { const f = g.felsz;
  if (g.kind === 'airship') return !!r.arboc;
  if (FORGO(g.kind)) return r.tip !== 'viz';
  if (r.tip === 'viz') return f.includes('viz');
  if (r.tip === 'heli') return false;
  if (r.len < (g.palya || 0)) return false;
  if (f.includes('nagy')) return r.tip === 'beton' && r.meret === 'nagy';
  if (r.tip === 'beton') return f.includes('beton') || f.includes('terep');
  if (r.tip === 'fu') return f.includes('fu');
  return false; }

/* ---------- betöltés ---------- */
async function boot() {
  const bar = $('#loadB'), txt = $('#loadT'), prog = (p, t) => { bar.style.width = p + '%'; txt.textContent = t; };
  try { prog(10, 'Magyarország domborzata…'); await GEO.load('../vasut/');
    prog(40, 'Térkép…'); const img = new Image(); img.src = '../vasut/taj.jpg'; await img.decode().catch(() => {}); setMapImage(img);
    towns = GEO.townList(); prog(55, 'Táj és városok…');
    terrain = createTerrain(scene, { viewR: SET.view * 1000 }); world = createWorld(scene, {}); spray = createSpray(scene, 1600);
    GEO.onTile(bd => { world.rebuildTowns(bd); world.fixGround?.(bd); mission?.redrape?.(bd); });
    ui = createUI(app); applyAll(); prog(80, 'Bázis…');
    RL.init().then(async () => { const c = await RL.cloudLoad(); if (c && (c.pont || 0) >= save.pont) { save = { ...save, ...c, set: SET }; ui && state === 'menu' && ui.menu(); } });
    toMenu(); for (let i = 0; i < 3; i++) { terrain.update(cam, .016); world.update(cam, .016, cam.far); }
    prog(100, 'Kész'); setTimeout(() => $('#load').hidden = true, 200); ui.menu();
  } catch (e) { console.error(e); prog(100, 'A betöltés nem sikerült: ' + (e.message || e)); }
  requestAnimationFrame(frame);
}

/* ---------- beállítások alkalmazása ---------- */
function applySettings(k) { const Q = QUAL[SET.q] || QUAL.kozepes;
  if (!k || k === 'q' || k === 'view') { prCap = Math.min(devicePixelRatio || 1, Q.prCap); pr = Math.min(prCap, (devicePixelRatio || 1) * Q.pr); const view = Math.min(SET.view, Q.maxView) * 1000;
    terrain.set({ viewR: view, treeR: Q.tree, treeDens: Q.dens }); scene.fog.near = view * .3; scene.fog.far = view * .97; cam.far = view * 1.15 + 6000; cam.updateProjectionMatrix();
    renderer.shadowMap.enabled = Q.shadow; world.setShadows(Q.shadow); resize(); }
  if (!k || k === 'vol') audio.setVol(SET.vol);
  if (!k || k === 'wind') world.setWind([0, 4, 9, 15][SET.wind] ?? 4);
  if (!k || k === 'tod') { const t = { hajnal: 5.9, nappal: 13, alkony: 19.3, ejszaka: 23.2, ciklus: 9 }[SET.tod] ?? 13; world.setTime(t); world.setTimeSpeed(SET.tod === 'ciklus' ? 60 : 0); }
  if (!k || k === 'cloud') world.setClouds([.18, .42, .7][SET.cloud] ?? .42);
  if (!k || k === 'tiles') GEO.setTilesOn(!!SET.tiles);
  if (!k || k === 'gyro') ctl.setGyro(!!SET.gyro);
  if (!k || k === 'fps') $('#fps').hidden = !SET.fps && !DEBUG; }
const applyAll = () => applySettings();

/* ---------- menü-háttér: a kiválasztott gép a miskolci hangár előtt ---------- */
const BASE = REPTER.miskolc;
function hangarSpot() { const h = BASE.group.userData.hangar; BASE.group.updateMatrixWorld(true); return h.localToWorld(new THREE.Vector3(-20, 0, -135)); }
function preview(id) { if (previewModel) { scene.remove(previewModel.g); previewModel = null; } previewId = id; const m = buildModel(id); const bb = new THREE.Box3().setFromObject(m.g); m.gearH = -bb.min.y;
  const p = hangarSpot(); m.g.position.set(p.x, GEO.ground(p.x, p.z) + m.gearH + (GEP[id].kind === 'airship' ? 2 : 0), p.z); m.g.rotation.y = -BASE.hdg * Math.PI / 180 + Math.PI * .85; scene.add(m.g); previewModel = m; orbit.dist = Math.max(13, m.len * 1.25);
  const far = BASE.group.userData.hangar.localToWorld(new THREE.Vector3(0, 0, -300)); orbit.yaw = Math.atan2(far.x - p.x, far.z - p.z) + .5; orbit.pitch = .16; }
function toMenu() { state = 'menu'; endFlight(); hud.show(false); $('#tc').hidden = true; $('#mapS').hidden = true; mapOpen = false; preview(save.gep); audio.setType(''); }
function endFlight() { if (model) { scene.remove(model.g); model = null; } if (mission) { mission.dispose(); mission = null; } if (debris) { scene.remove(debris.g); debris = null; } removeBucket(); b = null; spray?.clear(); timeK = 1; }

/* ---------- repülés indítása ---------- */
function start(o) { audio.init(); audio.resume(); endFlight(); if (previewModel) { scene.remove(previewModel.g); previewModel = null; }
  mode = o.mode; missionDef = o.mission ? KULDETESEK.find(k => k.id === o.mission) : null; const gep = GEP[save.gep];
  let r = REPTER[missionDef ? missionDef.repter : o.repter || 'miskolc'];
  if (!canUse(gep, r)) { const alt = GEO.nearestAirport(r.x, r.z, x => canUse(gep, x)); if (alt) { hud.say(`${gep.nev}: ${alt.nev} a legközelebbi alkalmas reptér.`, '', 4000); r = alt; } }
  startRepter = r.id; model = buildModel(gep.id); const bb = new THREE.Box3().setFromObject(model.g); model.gearH = -bb.min.y; scene.add(model.g);
  b = createBody(gep); b.gearH = model.gearH; b.model = model; spawnAt(r);
  if (missionDef) { world.setWind(Math.max([0, 4, 9, 15][SET.wind] ?? 4, missionDef.szel ? 10 : 0)); mission = createMission(missionDef, scene, gep, rng(missionDef.id)); mission.used = 0; }
  else world.setWind([0, 4, 9, 15][SET.wind] ?? 4);
  if (b.bucket) addBucket(); ended = false; camMode = 'kulso'; state = 'fly'; acc = 0; ui.hideAll(); hud.show(true); $('#tc').hidden = !TOUCH; ctl.resetTouchThr();
  audio.setType(gep.hang); spray.resetTotal(); scoreShow = 0;
  hud.say(missionDef ? missionDef.nev : 'Szabad repülés – ' + r.nev, 'big', 3500); if (missionDef) setTimeout(() => hud.say(missionDef.leir, '', 6000), 900);
  snapCam(); }
function rng(s) { let h = 1779033703; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 3432918353); return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
function spawnAt(r) { const gep = b.gep, k = gep.kind; let x = r.x, z = r.z, hdg = r.hdg, y;
  if (k === 'airship') { const m = r.mast || { x: r.x + 200, z: r.z }; x = m.x - 60; z = m.z; hdg = 90; }
  else if (FORGO(k)) { const pad = world.pads.find(p => p.r === r); if (pad) { x = pad.x; z = pad.z; } else { x = r.x - r.dz * (r.wid / 2 + 120); z = r.z + r.dx * (r.wid / 2 + 120); } }
  else if (r.tip === 'heli') { x = r.x; z = r.z; }
  else { const back = r.len / 2 - Math.min(80, r.len * .08); x = r.x - r.dx * back; z = r.z - r.dz * back; }
  y = GEO.ground(x, z) + b.gearH + .05; placeOn(b, x, y, z, hdg, false); b.water = gep.tartaly; b.battery = 1; b.started = true; b.lastImpact = 0; }
function respawn() { if (!b) return; const r = GEO.nearestAirport(b.pos.x, b.pos.z, x => canUse(b.gep, x)) || REPTER[startRepter]; if (debris) { scene.remove(debris.g); debris = null; }
  model.g.visible = true; spawnAt(r); state = 'fly'; if (b.bucket) { b.bucket.p.copy(b.pos); b.bucket.p.y -= 3; } hud.say('Újraindulás: ' + r.nev, '', 3000); snapCam(); }
function restart() { start({ mode, mission: missionDef?.id, repter: startRepter }); }

/* ---------- vízzsák látványa ---------- */
let bucketMesh = null, rope = null;
function addBucket() { bucketMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.1, 2.2, 10), new THREE.MeshLambertMaterial({ color: 0xff8a2a, flatShading: true })); scene.add(bucketMesh);
  rope = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x222222 })); rope.frustumCulled = false; scene.add(rope); }
function removeBucket() { if (bucketMesh) { scene.remove(bucketMesh, rope); bucketMesh = rope = null; } }

/* ---------- események ---------- */
function onEvent(t, d) {
  if (t === 'sonic') { audio.fx.boom(); hud.say('HGWS szuperszonikus öntözés!', 'big', 3000); shake = 1.2; }
  if (t === 'touch') { lastTouch = d.vs; if (d.vs < -2.5) audio.fx.touch(); }
  if (t === 'crash') { audio.fx.crash(); state = 'crash'; crashT = 0; makeDebris(); if (mission) mission.pen += 300; shake = 2; }
}
let shake = 0;
function makeDebris() { const g = new THREE.Group(), parts = []; model.g.updateMatrixWorld(true);
  model.g.traverse(o => { if (!o.isMesh || parts.length > 60) return; const m = o.clone(); o.getWorldPosition(m.position); o.getWorldQuaternion(m.quaternion); o.getWorldScale(m.scale); g.add(m);
    parts.push({ m, v: new THREE.Vector3((Math.random() - .5) * 18, 6 + Math.random() * 14, (Math.random() - .5) * 18).addScaledVector(b.vel, .25), w: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6) }); });
  const smk = []; const tex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(60,58,55,.9)'); gr.addColorStop(1, 'rgba(60,58,55,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, color: i < 4 ? 0xffaa55 : 0xffffff })); s.position.copy(b.pos); s.scale.setScalar(4); g.add(s); smk.push({ s, v: new THREE.Vector3((Math.random() - .5) * 4, 3 + Math.random() * 5, (Math.random() - .5) * 4), t: i * .12 }); }
  scene.add(g); model.g.visible = false; debris = { g, parts, smk }; }
function debrisStep(dt) { if (!debris) return; for (const p of debris.parts) { p.v.y -= 9.81 * dt; p.m.position.addScaledVector(p.v, dt); p.m.rotation.x += p.w.x * dt; p.m.rotation.y += p.w.y * dt; const gh = GEO.ground(p.m.position.x, p.m.position.z); if (p.m.position.y < gh + .3) { p.m.position.y = gh + .3; p.v.multiplyScalar(.4); p.v.y = Math.abs(p.v.y) * .3; p.w.multiplyScalar(.6); } }
  for (const s of debris.smk) { s.t -= dt; if (s.t > 0) continue; s.s.position.addScaledVector(s.v, dt); s.s.scale.multiplyScalar(1 + dt * .5); s.s.material.opacity = Math.max(0, s.s.material.opacity - dt * .12); } }

/* ---------- kamera ---------- */
const CP = new THREE.Vector3(), LA = new THREE.Vector3(), F = new THREE.Vector3(), U = new THREE.Vector3(), E = new THREE.Euler(0, 0, 0, 'YXZ'), TMP = new THREE.Vector3(), camLook = new THREE.Vector3();
function snapCam() { camUpdate(1, true); }
function camUpdate(dt, snap) { const len = model?.len || 10, d = Math.max(11, len * 1.45) * (b.gep.kind === 'airship' ? 1.1 : 1);
  F.set(0, 0, -1).applyQuaternion(b.q); E.setFromQuaternion(b.q, 'YXZ');
  if (camMode === 'kulso') { const hz = Math.hypot(F.x, F.z) || 1, fx = F.x / hz, fz = F.z / hz, fy = FORGO(b.kind) ? 0 : Math.max(-.6, Math.min(.6, F.y));
    CP.set(b.pos.x - fx * d * (1 - Math.abs(fy) * .4), b.pos.y + d * .26 - fy * d * .6, b.pos.z - fz * d * (1 - Math.abs(fy) * .4));
    const gh = GEO.ground(CP.x, CP.z) + 2; if (CP.y < gh) CP.y = gh;
    const k = snap ? 1 : 1 - Math.exp(-dt * (FORGO(b.kind) ? 3.5 : 5)); cam.position.lerp(CP, k); LA.copy(b.pos).addScaledVector(F, d * .4); LA.y += d * .06; camLook.lerp(LA, snap ? 1 : 1 - Math.exp(-dt * 8)); cam.up.set(0, 1, 0); cam.lookAt(camLook); }
  else if (camMode === 'pilota') { const e = model.eye; TMP.set(e[0], e[1], e[2]).applyQuaternion(b.q); cam.position.copy(b.pos).add(TMP); cam.quaternion.copy(b.q); }
  else if (camMode === 'also') { cam.position.copy(b.pos); cam.position.y -= (model.gearH || 1.5) + .5; U.set(F.x, 0, F.z).normalize(); cam.up.copy(U); cam.lookAt(TMP.copy(cam.position).add(new THREE.Vector3(0, -1, 0))); }
  if (shake > 0) { cam.position.x += (Math.random() - .5) * shake; cam.position.y += (Math.random() - .5) * shake; shake = Math.max(0, shake - dt * 2); } }
function orbitCam(dt, target, dist) { cam.position.set(target.x + Math.sin(orbit.yaw) * Math.cos(orbit.pitch) * dist, target.y + Math.sin(orbit.pitch) * dist, target.z + Math.cos(orbit.yaw) * Math.cos(orbit.pitch) * dist);
  const gh = GEO.ground(cam.position.x, cam.position.z) + 2; if (cam.position.y < gh) cam.position.y = gh; cam.up.set(0, 1, 0); cam.lookAt(target); }
// egérrel / ujjal forgatható kamera szünetben és a menüben
let drag = null; canvas.addEventListener('pointerdown', e => { if (state === 'pause' || state === 'menu') drag = [e.clientX, e.clientY]; });
addEventListener('pointermove', e => { if (!drag) return; orbit.yaw -= (e.clientX - drag[0]) * .006; orbit.pitch = Math.max(-.1, Math.min(1.3, orbit.pitch + (e.clientY - drag[1]) * .004)); drag = [e.clientX, e.clientY]; menuAng = orbit.yaw; });
addEventListener('pointerup', () => drag = null);
canvas.addEventListener('wheel', e => { if (state === 'pause' || state === 'menu') orbit.dist = Math.max(8, Math.min(400, orbit.dist * (1 + Math.sign(e.deltaY) * .1))); }, { passive: true });

/* ---------- a repülés egy képkockája ---------- */
const I0 = { pitch: 0, roll: 0, yaw: 0, thr: 0, spray: false, burner: false, brake: false };
function fly(rdt) { const gep = b.gep;
  for (const e of ctl.events()) handle(e);
  if (state !== 'fly') return;
  const I = ctl.poll(b.kind), dt = rdt * timeK;
  // fizika rögzített lépésekkel
  acc += dt; const H = 1 / 120; let n = 0; while (acc >= H && n < 40) { step(b, I, H, env); acc -= H; n++; if (state !== 'fly') break; } if (n >= 40) acc = 0;
  if (state !== 'fly') return;
  // a magasabb csempe betöltődése után a gép ne kerüljön a föld alá
  const gh = GEO.ground(b.pos.x, b.pos.z); if (b.onGround && b.pos.y < gh + b.gearH - .2) b.pos.y = gh + b.gearH;
  // töltés
  let refill = false; const surf = b.surf, r = surf?.r;
  if (b.onGround && b.landed?.stopped && r && r.allomas && gep.tolt.includes('repter') && (surf.tip !== 'viz' || gep.tolt.includes('vizreSzall'))) refill = true;
  if (gep.kind === 'airship') { const m = world.masts.find(m => Math.hypot(b.pos.x - m.x, b.pos.z - m.z) < 120); b.moored = !!m && b.agl < 25 && b.spd < 4; if (b.moored) refill = true; }
  if (refill && !(b.water < gep.tartaly || b.battery < 1)) refill = false;
  if (refill) { b.water = Math.min(gep.tartaly, b.water + gep.tartaly / 7 * dt); b.battery = Math.min(1, b.battery + dt / 6); if (refillMsg <= 0) { hud.say('Töltés a HGWS állomáson…', 'ok'); audio.fx.refill(); } refillMsg = 3; }
  const canScoop = gep.tolt.includes('szippant') || (gep.tolt.includes('szippantNagy') && GEO.bigWater(b.pos.x, b.pos.z));
  if (!b.onGround && canScoop && b.agl < 10 && b.spd > 14 && GEO.isWater(b.pos.x, b.pos.z) && b.water < gep.tartaly) { b.water = Math.min(gep.tartaly, b.water + gep.tartaly * .14 * dt); refill = true; if (refillMsg <= 0) { hud.say('Vízfelszedés!', 'ok'); audio.fx.scoop(); } refillMsg = 2; }
  if (b.onGround && surf?.tip === 'viz' && gep.tolt.includes('vizreSzall') && b.spd > 7 && b.water < gep.tartaly) { b.water = Math.min(gep.tartaly, b.water + gep.tartaly * .16 * dt); refill = true; if (refillMsg <= 0) { hud.say('Töltés siklás közben…', 'ok'); audio.fx.scoop(); } refillMsg = 2; }
  if (b.bucket?.inWater && b.water < gep.tartaly) { refill = true; if (refillMsg <= 0) { hud.say('A vízzsák merül – töltés', 'ok'); audio.fx.scoop(); } refillMsg = 2; }
  refillMsg -= dt;
  // permet
  const spraying = I.spray && b.water > 0 && (!b.onGround || FORGO(b.kind));
  if (spraying) { const rate = gep.tartaly / (gep.ramp ? 6 : b.bucket ? 5 : FORGO(b.kind) ? 16 : 20); const lit = spray.emit(b, model, dt, rate, QUAL[SET.q].part); if (mission) mission.used += lit; }
  b.ramp = model.ramp ? (b.ramp || 0) + ((spraying ? 1 : 0) - (b.ramp || 0)) * Math.min(1, dt * 2) : 0;
  spray.update(dt, world.wind(b.pos, null), (x, z, v, rr) => mission?.hit(x, z, v, rr), cam);
  // küldetés
  if (mission && !ended) { mission.t += dt; mission.update(dt, b, world.wind(b.pos, null)); for (const [t, k] of mission.msgs.splice(0)) { hud.say(t, k, 3200); if (k === 'ok') audio.fx.ring(); if (k === 'bad') audio.fx.bad(); }
    if (mission.lost || (mission.limit && mission.t >= mission.limit)) finishMission(null);
    else if (mission.allDone && b.onGround && b.landed?.stopped && b.surf?.r) finishMission(lastTouch > -1.6 ? 'sima' : lastTouch > -3 ? 'ok' : '');
    if ((scoreShow -= rdt) <= 0) { scoreShow = .5; mission.liveScore = mission.finish(null).total; } }
  // titkos felirat
  if (!save.zero && Math.hypot(b.pos.x - ZERO_HELY[0], b.pos.z - ZERO_HELY[1]) < 1300 && b.agl < 1800) { save.zero = 1; persist(); audio.fx.ok(); hud.say('ZERO – feloldottad Zero különgépét!', 'big', 6000); }
  // modell és animáció
  model.g.position.copy(b.pos); model.g.quaternion.copy(b.q); animate(model, { rpm: b.rpm, rotor: b.rotor, gear: b.gear, flaps: b.flaps, burner: b.burner, ramp: b.ramp, droop: b.spd < 90 ? 1 : 0 }, rdt);
  if (bucketMesh) { bucketMesh.position.copy(b.bucket.p); const p = rope.geometry.attributes.position; TMP.set(0, -1, 0).applyQuaternion(b.q).add(b.pos); p.setXYZ(0, TMP.x, TMP.y, TMP.z); p.setXYZ(1, b.bucket.p.x, b.bucket.p.y + 1.1, b.bucket.p.z); p.needsUpdate = true; }
  if (b.stall && !b.onGround && Math.random() < rdt * 4) audio.fx.stall();
  camUpdate(rdt);
  audio.update({ rpm: b.rpm || b.rotor, spd: b.spd, burner: b.burner, col: b.col, spray: spraying, cockpit: camMode === 'pilota' });
  // HUD
  E.setFromQuaternion(b.q, 'YXZ'); const hdg = (-E.y * 57.3 + 360) % 360, place = nearestTown(b.pos.x, b.pos.z);
  const camE = new THREE.Euler().setFromQuaternion(cam.quaternion, 'YXZ');
  hud.update({ b, pitch: E.x, roll: -E.z, hdg, wind: world.wind(b.pos, null).clone(), timeK, m: mission, score: mission?.liveScore, target: mission && !ended ? (mission.allDone ? nearestAirportPos() : mission.target(b)) : null, camDir: -camE.y, cam: camMode, aim: camMode === 'also' ? aimPoint() : null, marks: mission?.marks(), place, refill }, rdt);
  if ((tileT -= rdt) <= 0) { tileT = 1; GEO.requestAround(b.pos.x, b.pos.z, 26000); }
  // füst rontja a látást
  if (mission?.smokeAt) { const k = mission.smokeAt(b.pos), base = Math.min(SET.view, QUAL[SET.q].maxView) * 1000; scene.fog.far = base * .97 * (1 - k) + 900 * k; scene.fog.near = Math.min(scene.fog.far * .3, base * .3); }
}
function nearestAirportPos() { const r = GEO.nearestAirport(b.pos.x, b.pos.z, x => canUse(b.gep, x)); return r ? [r.x, r.elev, r.z] : null; }
let townT = 0, townName = '';
function nearestTown(x, z) { if ((townT -= .016) > 0) return townName; townT = 1; let best = null, bd = 1e18; for (const t of towns) { if (t[3] < 3) continue; const d = Math.hypot(t[1] - x, t[2] - z) / Math.sqrt(t[3]); if (d < bd) { bd = d; best = t; } }
  townName = best ? (Math.hypot(best[1] - x, best[2] - z) < 4000 ? best[0] : best[0] + ' környéke') : ''; return townName; }
function aimPoint() { // a permet várható becsapódása (egyszerű közelítés) a képernyőn
  const t = Math.sqrt(Math.max(1, 2 * Math.max(1, b.agl) / 9.81)) * 1.25, x = b.pos.x + b.vel.x * t * .55, z = b.pos.z + b.vel.z * t * .55, y = GEO.ground(x, z);
  TMP.set(x, y, z).project(cam); if (TMP.z > 1) return null; return [(TMP.x + 1) / 2 * innerWidth, (1 - TMP.y) / 2 * innerHeight]; }
function handle(e) { const gep = b?.gep;
  if (e === 'cam') { camMode = camMode === 'kulso' ? 'pilota' : camMode === 'pilota' ? 'also' : 'kulso'; model.g.visible = camMode !== 'pilota' || !FORGO(b.kind) || true; audio.fx.click(); }
  if (e === 'map') toggleMap();
  if (e === 'pause') { if (mapOpen) toggleMap(); else pause(); }
  if (e === 'gear' && !FORGO(b.kind) && b.kind !== 'airship' && !model.noGear) { if (b.onGround && b.gearT > .5) hud.say('A földön nem húzhatod be a futóművet', 'bad'); else { b.gearT = b.gearT > .5 ? 0 : 1; audio.fx.click(); } }
  if (e === 'flaps' && model.flap.length) { b.flapT = b.flapT >= 1 ? 0 : b.flapT + .5; audio.fx.click(); hud.say('Fékszárny: ' + Math.round(b.flapT * 100) + '%'); }
  if (e === 'time') { if (mode !== 'szabad') hud.say('Időgyorsítás csak szabad repülésben', 'bad'); else { timeK = timeK === 1 ? 2 : timeK === 2 ? 4 : 1; hud.say('Idő: ' + timeK + '×'); } }
  if (e === 'winch' && gep?.kind === 'glider') { if (b.onGround && b.landed?.stopped && (b.surf?.tip === 'beton' || b.surf?.tip === 'fu')) { b.winch = 6.5; hud.say('Csörlős indítás!', 'ok'); } else hud.say('Csörlős indítás csak a pályán, álló helyzetből', 'bad'); }
  if (e === 'mute') { audio.setMute(!audio.muted); hud.say(audio.muted ? 'Hang ki' : 'Hang be'); }
  if (e === 'help') { pause(); ui.help(() => ui.pause()); } }
function pause() { if (state !== 'fly') return; state = 'pause'; audio.suspend(); E.setFromQuaternion(cam.quaternion, 'YXZ'); orbit.yaw = Math.atan2(cam.position.x - b.pos.x, cam.position.z - b.pos.z); orbit.pitch = .3; orbit.dist = Math.max(14, (model.len || 10) * 1.8); ui.pause(); $('#tc').hidden = true; }
function resume() { if (!b) return; state = 'fly'; audio.resume(); $('#tc').hidden = !TOUCH; }
function toggleMap() { mapOpen = !mapOpen; $('#mapS').hidden = !mapOpen; if (mapOpen) { if (state === 'fly') { state = 'map'; audio.suspend(); } $('#mapH').textContent = '';
    E.setFromQuaternion(b.q, 'YXZ'); drawMap($('#mapC'), { b, hdg: (-E.y * 57.3 + 360) % 360, marks: mission?.marks() }, towns, mode === 'szabad' ? r => { if (!canUse(b.gep, r)) { $('#mapH').textContent = 'Ez a gép itt nem tud leszállni: ' + r.nev; return; } toggleMap(); spawnAt(r); snapCam(); hud.say('Gyorsutazás: ' + r.nev, 'ok'); } : null); }
  else if (state === 'map') { state = 'fly'; audio.resume(); } }
$('#mapX').onclick = () => toggleMap();

/* ---------- küldetés vége, pontok, feloldás ---------- */
function finishMission(land) { if (ended) return; ended = true; const gep = b.gep, res = mission.finish(land);
  const before = GEPEK.filter(unlocked).map(g => g.id); save.pont += Math.round(res.total / 10); if (res.total > (save.best[mission.def.id] || 0)) save.best[mission.def.id] = res.total;
  const newly = GEPEK.filter(g => unlocked(g) && !before.includes(g.id)).map(g => g.nev); persist();
  state = 'end'; audio.fx.ok(); $('#tc').hidden = true; ui.end(res, mission, gep, newly); }

/* ---------- fő ciklus ---------- */
let last = performance.now(), fpsA = 0, fpsN = 0, fpsT = 0, slow = 0;
function frame(now) { requestAnimationFrame(frame); const rdt = Math.min(.1, (now - last) / 1000); last = now;
  if (state === 'load') return;
  if (state === 'fly') fly(rdt);
  else if (state === 'menu') { if (!drag) orbit.yaw += rdt * .08; if (previewModel) { const p = previewModel.g.position; orbitCam(rdt, TMP.set(p.x, p.y + previewModel.len * .08, p.z), orbit.dist); animate(previewModel, { rpm: .25, rotor: .3, gear: 1 }, rdt); } }
  else if (state === 'pause' || state === 'map' || state === 'end') { for (const e of ctl.events()) if (e === 'pause' && state === 'pause') { ui.hideAll(); resume(); } else if (e === 'map' && state === 'map') toggleMap(); if (state === 'pause') orbitCam(rdt, b.pos, orbit.dist); }
  else if (state === 'crash') { crashT += rdt; debrisStep(rdt); spray.update(rdt, world.wind(b.pos, null), () => {}, cam); orbitCam(rdt, b.pos, Math.max(30, (model.len || 10) * 3)); orbit.yaw += rdt * .3; if (crashT > 1.8 && crashT - rdt <= 1.8) { ui.crash(b.crashWhy, () => respawn(), () => ui.menu()); $('#tc').hidden = true; } }
  terrain.update(cam, rdt); world.update(cam, rdt, cam.far);
  renderer.render(scene, cam);
  // dinamikus felbontás és FPS
  fpsA += rdt; fpsN++; fpsT += rdt; if (fpsT > 1.5) { const ms = fpsA / fpsN * 1000;
    if (state === 'fly') { if (ms > 24 && pr > .55) { pr = Math.max(.55, pr * .88); resize(); } else if (ms < 15 && pr < prCap) { pr = Math.min(prCap, pr * 1.07); resize(); } }
    if (!$('#fps').hidden) { const i = renderer.info, ts = terrain.stats(); $('#fps').textContent = `${(1000 / ms).toFixed(0)} FPS · ${ms.toFixed(1)} ms · ${i.render.calls} hívás · ${(i.render.triangles / 1000).toFixed(0)}k háromszög · ${ts.chunks} csonk · csempe ${GEO.tileStats.ok}/${GEO.tileStats.req} · ${pr.toFixed(2)}×`; window.__perf = { fps: 1000 / ms, ms, calls: i.render.calls, tris: i.render.triangles, chunks: ts.chunks, pr }; }
    fpsA = fpsN = fpsT = 0; void slow; }
}
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'fly') pause(); });

/* ---------- a felület API-ja ---------- */
const app = { get save() { return save; }, SET, audio, touch: TOUCH, canUse, unlocked, persist, start, preview, applySettings, restart, respawn, resume, toMenu, get mode() { return mode; } };
window.__legi = { get b() { return b; }, get state() { return state; }, get mission() { return mission; }, app, GEO, get world() { return world; }, cam, scene, renderer, start, setState: s => state = s, GAME };
boot();
