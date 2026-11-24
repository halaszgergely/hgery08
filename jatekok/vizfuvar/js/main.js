/* HGWS Vízfuvar – főprogram: betöltés (a Légi Öntözés domborzata, terepe, égboltja és OSM-világa), játékhurok rögzített 120 Hz-es fizikával,
   kamerák, fuvarok, töltés és lerakás, tankolás, rádió, mentés, ranglista, dev mód. */
import * as THREE from 'three';
import { JARMU, JARMUVEK, GAZD, DT, BALLON_KG, GAME } from './config.js?v=202611241215';
import { epitJarmu, salAnim } from './jarmuvek.js?v=202611241215';
import { createCar, placeCar, stepCar, setLoad, createMoped, placeMoped, stepMoped, createProp, stepProp } from './fizika.js?v=202611241215';
import { createPlaces } from './helyszinek.js?v=202611241215';
import { createAudio } from './hang.js?v=202611241215';
import { createRadio } from './radio.js?v=202611241215';
import { createHud } from './hud.js?v=202611241215';
import { drawMap, setMapImage, setGeo } from './terkep.js?v=202611241215';
import { createControls, ALAP_KIOSZTAS } from './iranyitas.js?v=202611241215';
import { createUI } from './ui.js?v=202611241215';
import { UJ_MENTES, ujPiac, elszamol, tankolasAr, vagyon } from './gazdasag.js?v=202611241215';
import { ballon as ballonMesh } from './modellkit.js?v=202611241215';
import * as RL from './ranglista.js?v=202611241215';
import { createStreetLights } from './kozvilagitas.js?v=202611241215';
import * as DG from './dolgozok.js?v=202611241215';
import { createRouter } from './utvonal.js?v=202611241215';

// a Légi Öntözés világa egyetlen, verziózott belépési ponton át (így a modulok mindig összetartoznak)
const K = await import(new URL('../../legiontozes/js/vilagkit.js', import.meta.url).href); const GEO = K.GEO; setGeo(GEO);
const $ = s => document.querySelector(s), TOUCH = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window, DEBUG = new URLSearchParams(location.search).has('debug');
/* ---------- mentés, beállítások, dev ---------- */
const LS = 'hgws_vizfuvar_v1', LSD = 'hgws_vizfuvar_dev';
const DEF_SET = { q: TOUCH ? 'alacsony' : 'kozepes', view: TOUCH ? 6 : 10, vol: .75, rvol: .55, valto: 'auto', tilt: 0, napszak: 'ciklus', fps: 0, pihenes: 0, kiosztas: null };
let save = UJ_MENTES(); try { const o = JSON.parse(localStorage.getItem(LS) || 'null'); if (o) save = { ...save, ...o }; } catch (_) {}
const SET = { ...DEF_SET, ...(save.set || {}) }; save.set = SET;
let DEV = { on: 0, penz: 1, all: 1, fuel: 1, god: 1, fps: 1, police: 0 }; try { DEV = { ...DEV, ...JSON.parse(localStorage.getItem(LSD) || '{}') }; } catch (_) {}
const persistDev = () => { try { localStorage.setItem(LSD, JSON.stringify(DEV)); } catch (_) {} };
function persist() { if (DEV.on) return; try { localStorage.setItem(LS, JSON.stringify(save)); } catch (_) {} RL.cloudSave(save); }
const owns = id => (DEV.on && DEV.all) || save.flotta.some(f => f.id === id);
const penz = () => DEV.on && DEV.penz ? 9999999 : save.penz;
function dolgTick() { if (!save.kezdes) return; save.dolgozok ||= []; const k = lepes0(); if (!k.length) return;
  for (const r of k.slice(-2)) hud.say(r.hiba ? `${r.e.nev} elhagyta a ballonokat (${r.j.nev}) – ${r.net.toLocaleString('hu-HU')} Ft` : `${r.e.nev} leszállított ${r.j.n} ballont: ${r.j.nev} – +${r.net.toLocaleString('hu-HU')} Ft`, r.hiba ? 'bad' : 'ok', 3500);
  if (k.some(r => !r.hiba)) audio.fx.coin(); persist(); }
const lepes0 = () => DG.lepes(save, D);
function fizet(n) { if (DEV.on && DEV.penz) return true; if (save.penz < n) return false; save.penz -= n; return true; }
const QUAL = { alacsony: { pr: 1, tree: 1200, dens: .45, sh: false, sm: 1024, road: 1400, bld: 1000 }, kozepes: { pr: 1.5, tree: 2400, dens: .9, sh: true, sm: 1024, road: 2200, bld: 1600 }, magas: { pr: 2, tree: 4000, dens: 1.3, sh: true, sm: 2048, road: 3200, bld: 2400 } };

/* ---------- renderer ---------- */
const canvas = $('#c'), renderer = new THREE.WebGLRenderer({ canvas, antialias: false, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.setClearColor(0xbcd6ea); renderer.info.autoReset = false;
const post = K.createPost(renderer), scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, .1, 30000); scene.add(cam);
scene.fog = scene.fog || new THREE.Fog(0xbcd6ea, 3000, 10000);
let pr = 1, lastW = 0, lastH = 0;
function resize(force) { const w = innerWidth, h = innerHeight; if (!force && w === lastW && h === lastH) return; lastW = w; lastH = h; renderer.setPixelRatio(pr); renderer.setSize(w, h, false); post.setSize(w, h, pr); cam.aspect = w / h; cam.updateProjectionMatrix(); if (state !== 'load') post.render(scene, cam); }
addEventListener('resize', () => resize()); document.addEventListener('fullscreenchange', () => resize()); document.addEventListener('webkitfullscreenchange', () => resize());
const FS_OK = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
function toggleFs() { const d = document, el = d.documentElement; if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d); else (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' })?.catch?.(() => {}); }
document.querySelectorAll('.fsB').forEach(b => { b.hidden = !FS_OK; b.onclick = e => { e.stopPropagation(); toggleFs(); }; });
addEventListener('keydown', e => { if (e.code === 'KeyK' && !e.repeat && FS_OK && !/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName || '')) toggleFs(); });

const audio = createAudio(), hud = createHud(), ctl = createControls(SET.kiosztas || ALAP_KIOSZTAS), radio = createRadio(audio);
ctl.bindTouch($('#tc')); radio.onSub((t, ms) => hud.subtitle(t, ms));
let terrain, world, osm, places, D, ui, state = 'load', v = null, mdl = null, camMode = 'kulso', look = { yaw: 0, pitch: 0, drag: null }, mapOpen = false, props = [], tod = 13;
let dolgT = 0, router = null, lampak = null, headL = null, previewMdl = null, previewId = null, orbit = 0, lightsOn = false, ind = 0, blinkT = 0, honk = false, jobT = 0, jobDmg0 = 0, saveT = 0, idleMsgT = 0, whistleT = 8, envT = 0, prevFallen = false;

/* ---------- környezet a fizikának: felület (terep + útfelület), normál, tapadás, épületek ---------- */
let segCache = [], segAt = [1e9, 1e9], bldCache = [], bldAt = [1e9, 1e9];
const SURF = { aszfalt: { mu: 1, crr: .014, ut: 1, tipus: 'aszfalt' }, foldut: { mu: .7, crr: .03, ut: 0, tipus: 'fold' }, fu: { mu: .6, crr: .05, ut: 0, tipus: 'fu' }, viz: { mu: .3, crr: .2, ut: 0, tipus: 'viz' } };
function roadHere(x, z) { let best = null; const s = segCache; for (let i = 0; i < s.length; i += 8) { const ax = s[i], az = s[i + 1], dx = s[i + 2] - ax, dz = s[i + 3] - az, L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L)), d = Math.hypot(x - ax - dx * t, z - az - dz * t) - s[i + 4] / 2;
    if (d < .4 && (!best || d < best.d)) best = { d, cl: s[i + 5], f: s[i + 6], h: s[i + 7] }; } return best; }
const env = {
  h(x, z) { const g = GEO.ground(x, z), r = roadHere(x, z); if (!r) return places.isPaved(x, z) ? g + .1 : g; if (r.h > -1e8 && v && Math.abs(v.pos.y - r.h) < 5) return r.h + .05; return g + (r.f & 8 ? 0 : osm.roadLift(r.cl)); },
  n(x, z, out) { return GEO.groundNormal(x, z, out); },
  surf(x, z) { const r = roadHere(x, z); if (r) return (r.cl || (r.f & 32)) ? SURF.aszfalt : SURF.foldut; if (places.isPaved(x, z)) return SURF.aszfalt; return GEO.isWater(x, z) ? SURF.viz : SURF.fu; },
  blds(x, z, r) { if (Math.hypot(x - bldAt[0], z - bldAt[1]) > 25) { bldAt = [x, z]; bldCache = osm.buildingsNear(x, z, 60).concat(places.rings.filter(rg => Math.abs(rg[0][0] - x) < 120 && Math.abs(rg[0][1] - z) < 120)); } return bldCache; } };
let envRT = 0, miniSegs = [], miniT = 0;
function refreshEnv(x, z, force, dt = 0) { envRT -= dt; if (force || envRT <= 0 || Math.hypot(x - segAt[0], z - segAt[1]) > 20) { envRT = 1; segAt = [x, z]; segCache = osm.segsNear(x, z, 70); bldAt = [1e9, 1e9]; } }

/* ---------- betöltés ---------- */
async function boot() { const bar = $('#loadB'), txt = $('#loadT'), prog = (p, t) => { bar.style.width = p + '%'; txt.textContent = t; };
  try { prog(10, 'Magyarország domborzata…'); await GEO.load('../vasut/');
    prog(35, 'Térkép, fuvarcélok…'); const img = new Image(); img.src = '../vasut/taj.jpg'; await img.decode().catch(() => {}); setMapImage(img); D = await (await fetch('adat/celok.json')).json();
    prog(55, 'Táj, utak, épületek…');
    terrain = K.createTerrain(scene, { viewR: SET.view * 1000 }); world = K.createWorld(scene, {}); osm = K.createOSM(scene, { waterMat: terrain.waterMat, lift: .1, step: 8, marks: true, roadR: 2200, bldR: 1600, lamps: false }); router = createRouter(osm); lampak = createStreetLights(scene, osm, GEO.ground, K.SU);
    places = createPlaces(scene, GEO.ground, D); GEO.onTile(bd => { world.fixGround?.(bd); places.fixGround(bd); segAt = [1e9, 1e9]; });
    world.setWind?.(2); ui = createUI(app); applySettings(); devBadge(); await radio.ready;
    radio.setNews(news);
    RL.init().then(async () => { const c = await RL.cloudLoad(); if (c && (c.fuvarok || 0) >= (save.fuvarok || 0) && c.kezdes) { save = { ...UJ_MENTES(), ...c, set: SET }; if (state === 'menu') ui.menu(); } });
    prog(80, 'Telephely…'); toMenu(); for (let i = 0; i < 4; i++) { terrain.update(cam, .016); osm.update(cam, .016); world.update(cam, .016, cam.far, cam.position); }
    prog(100, 'Kész'); setTimeout(() => $('#load').hidden = true, 250);
  } catch (e) { console.error(e); prog(100, 'A betöltés nem sikerült: ' + (e.message || e)); }
  requestAnimationFrame(frame); }

function applySettings(k) { const Q = QUAL[SET.q] || QUAL.kozepes; pr = Math.min(devicePixelRatio || 1, Q.pr); post.setQuality(SET.q); const view = SET.view * 1000;
  terrain.set({ viewR: view, treeR: Q.tree, treeDens: Q.dens }); osm.set({ roadR: Q.road, bldR: Q.bld }); scene.fog.near = view * .25; scene.fog.far = view * .95; cam.far = view * 1.1 + 3000; cam.updateProjectionMatrix();
  renderer.shadowMap.enabled = Q.sh; world.setShadows?.(Q.sh, Q.sm); audio.setVol(SET.vol); radio.setVol(SET.rvol); ctl.setTilt(!!SET.tilt);
  if (!k || k === 'napszak') { tod = { reggel: 8, nappal: 13, este: 20.5, ciklus: tod }[SET.napszak] ?? 13; world.setTime(tod); world.setTimeSpeed?.(SET.napszak === 'ciklus' ? 30 : 0); }
  $('#tc').hidden = !TOUCH || state !== 'drive'; resize(true); }

/* ---------- jármű ---------- */
function szinOf(id) { const J = JARMU[id], i = save.szin[id] ?? 0; return J.szinek[i] || J.szinek[0]; }
function spawn(id, x, z, yaw) { if (mdl) scene.remove(mdl.g); const J = JARMU[id]; mdl = epitJarmu(id, szinOf(id)); scene.add(mdl.g);
  v = J.fiz === 'moped' ? createMoped(J) : createCar(J); refreshEnv(x, z, true); const y = env.h(x, z);
  if (v.kind === 'moped') placeMoped(v, x, y, z, yaw); else placeCar(v, x, y, z, yaw);
  v.fuel = save.uzemanyag[id] ?? J.tank; v.cargo = Math.min(save.munka?.betoltve || 0, J.ballon); v.eng.auto = SET.valto !== 'kezi';
  headL = new THREE.SpotLight(0xfff1d0, 0, 70, .55, .5, 1.2); headL.position.set(0, J.fiz === 'moped' ? 1.0 : .65, J.fiz === 'moped' ? -.6 : -1.9); headL.target.position.set(0, 0, -25); mdl.g.add(headL, headL.target);
  setCargo(v.cargo); audio.engine(J.fiz === 'moped' ? 'moped' : 'auto'); radio.setVehicle(J.fiz === 'moped' ? 'none' : J.ag === 'modern' ? 'modern' : 'retro');
  $('#tP').hidden = J.fiz !== 'moped'; look = { yaw: 0, pitch: 0, drag: null }; }
function setCargo(n) { v.cargo = n; if (v.kind === 'auto') setLoad(v, n * BALLON_KG); else { v.load = n * BALLON_KG; v.m = v.m0 + v.load; } mdl.ballonok.forEach((b, i) => b.visible = i < n); }
const yawOf = () => v.kind === 'moped' ? v.yaw : new THREE.Euler().setFromQuaternion(v.q, 'YXZ').y;

/* ---------- állapotok ---------- */
function toMenu() { state = 'menu'; $('#hud').hidden = true; $('#tc').hidden = true; mapClose(); audio.stopEngine(); radio.stop();
  const [sx, sz] = places.pontok.start; preview(save.aktiv || 'babetto', sx, sz); ui.menu(); }
function preview(id, x, z) { if (previewMdl) scene.remove(previewMdl.g); previewId = id; previewMdl = epitJarmu(id, szinOf(id)); scene.add(previewMdl.g);
  const [px, pz] = places.pontok.bemutato; previewMdl.g.position.set(px, GEO.ground(px, pz) + .1, pz); previewMdl.g.rotation.y = places.rot; if (previewMdl.lovas) previewMdl.lovas.visible = false; }
function startDrive() { if (!save.aktiv) return ui.uj(); ui.hideAll(); if (previewMdl) { scene.remove(previewMdl.g); previewMdl = null; }
  const p = save.poz && !DEV.on ? save.poz : null, [sx, sz] = places.pontok.start;
  spawn(save.aktiv, p ? p[0] : sx, p ? p[1] : sz, p ? p[2] : places.rot + Math.PI); state = 'drive'; $('#hud').hidden = false; $('#tc').hidden = !TOUCH; camMode = 'kulso'; snapCam();
  if (!save.elso && !save.munka) { save.piac = ujPiac(D, save, JARMU[save.aktiv].ballon); hud.say('Üdv a HGWS-nél! Az első fuvar: egyetlen ballon víz a HGWS irodába. Vedd fel a fuvart (álló helyzetben F, vagy a szünetmenüben), töltsd fel a ballont a telephelyen, és vidd el!', 'big', 8000); }
  audio.init(); }
function pause() { if (state !== 'drive') return; state = 'pause'; audio.suspend(); $('#pause').hidden = false; }
function resume() { $('#pause').hidden = true; ui.hideAll(); state = 'drive'; audio.resume(); }
function mapOpenF() { mapOpen = true; $('#mapS').hidden = false; const prev = state; state = state === 'drive' ? 'map' : state; mapS.prev = prev; drawBigMap(true); }
function mapClose() { if (!mapOpen) return; mapOpen = false; $('#mapS').hidden = true; if (state === 'map') state = 'drive'; }
const mapS = { prev: null };
function drawBigMap(follow) { const jobs = (save.piac || []).map(j => ({ ...j, sel: save.munka?.id === j.id })); if (save.munka && !jobs.some(j => j.sel)) jobs.push({ ...save.munka, sel: true });
  drawMap($('#mapC'), { p: v ? v.pos : { x: D.telephely.x, z: D.telephely.z }, yaw: v ? yawOf() : 0, jobs, kutak: D.kutak, base: [D.telephely.x, D.telephely.z], segs: v ? osm.segsNear(v.pos.x, v.pos.z, 1500) : null, route: v ? router.route : null, emps: (save.dolgozok || []).filter(e => e.job).map(e => [...DG.hely(e, D), e.nev]), follow }, j => { if (!save.munka) ui.piac(j.id); }); }
$('#mapX').onclick = () => mapClose(); $('#mapMe').onclick = () => drawBigMap(true); $('#mini').addEventListener('click', () => { if (state === 'drive') mapOpenF(); });
$('#pause').addEventListener('click', e => { const p = e.target.closest('[data-p]')?.dataset.p; if (!p) return; audio.fx.click();
  if (p === 'tovabb') resume(); else if (p === 'piac') ui.piac(); else if (p === 'terkep') { $('#pause').hidden = true; mapOpenF(); } else if (p === 'beall') ui.beall(() => { ui.hideAll(); $('#pause').hidden = false; });
  else if (p === 'telep') gyorsTelep(); else if (p === 'dolg') { $('#pause').hidden = true; } if (p === 'dolg') ui.dolgozok(() => { ui.hideAll(); $('#pause').hidden = false; }); else if (p === 'menu') { $('#pause').hidden = true; savePos(); persist(); toMenu(); } });
function gyorsTelep() { const d = Math.hypot(v.pos.x - D.telephely.x, v.pos.z - D.telephely.z), ar = Math.round(200 + d / 1000 * 60); if (d < 200) { hud.say('Már a telephelyen vagy.'); return resume(); }
  if (!fizet(ar)) { hud.say('Nincs elég pénzed a gyorsutazásra (' + ar + ' Ft).', 'bad'); return; } dropProps(); const [sx, sz] = places.pontok.start; spawn(save.aktiv, sx, sz, places.rot + Math.PI); snapCam(); resume(); hud.say('Gyorsutazás a telephelyre: −' + ar + ' Ft', 'ok'); persist(); }
function savePos() { if (v) { save.poz = [v.pos.x, v.pos.z, yawOf()]; save.uzemanyag[save.aktiv] = v.fuel; } }

/* ---------- fuvar: elfogadás, töltés, lerakás ---------- */
function acceptJob(id) { const j = (save.piac || []).find(x => x.id === id); if (!j) return; const cap = JARMU[save.aktiv].ballon; if (j.n > cap) { hud.say('Ehhez a fuvarhoz ' + j.n + ' ballon kell, a járművedre csak ' + cap + ' fér.', 'bad'); return false; }
  save.munka = { ...j, betoltve: v?.cargo || 0, kezd: null }; save.piac = save.piac.filter(x => x.id !== id); persist(); hud.say('Fuvar elfogadva: ' + j.nev + ' – ' + j.n + ' ballon. Töltsd fel a telephelyen!', 'ok', 4000); return true; }
function cancelJob() { if (!save.munka) return; save.hirnev = Math.max(0, save.hirnev - 3); save.munka = null; places.setMarker(null); persist(); hud.say('Fuvar lemondva (−3 hírnév).', 'bad'); }
function news() { const out = []; if (save.munka) out.push(`Úton van a HGWS egyik járműve ${save.munka.n} ballonnal, célja ${save.munka.nev}. Sok sikert, és lassan a kanyarban!`);
  if (save.fuvarok) out.push(`A HGWS eddig ${save.fuvarok} fuvart teljesített. ${save.kiomlott ? 'Kiömlött víz: ' + save.kiomlott + ' liter – a fű örül neki.' : 'Egy csepp sem ömlött ki – Csöpi bácsi büszke!'}`);
  if (v?.kind === 'moped' && v.damage > .1) out.push('Hírek: Miskolcon egy HGWS-es moped többször is megpihent az út szélén. A ballon jól van.'); out.push('Forgalom: Miskolc belvárosában a szokásos csúcsforgalom, a Bükk felé szabad az út.'); return out; }
// a környező interakció a jármű helyzete alapján (F gomb / érintés)
function interaction() { if (!v) return null; const p = v.pos, near = (pt, r) => Math.hypot(p.x - pt[0], p.z - pt[1]) < r, slow = v.speed < 1.6, J = v.J;
  if (v.kind === 'moped' && v.fallen) return v.fallT > .8 ? { t: 'F – Moped felállítása', f: () => { v.fallen = false; v.lean = 0; v.leanV = 0; v.v = 0; audio.fx.thud(); } } : null;
  const pr = props.find(o => Math.hypot(o.pos.x - p.x, o.pos.z - p.z) < 2.6); if (pr && slow) return v.cargo < J.ballon ? { t: 'F – Ballon visszarakása', f: () => { scene.remove(pr.m); props.splice(props.indexOf(pr), 1); setCargo(v.cargo + 1); if (save.munka) save.munka.betoltve = v.cargo; audio.fx.thud(); } } : null;
  if (near(places.pontok.toltes, 9) && slow) { const need = Math.max(0, Math.min(J.ballon, (save.munka?.n || J.ballon)) - v.cargo); if (need > 0) { const ar = need * GAZD.ballonAr;
      return { t: `F – ${need} ballon töltése és felrakása (${ar} Ft)`, f: () => { if (!fizet(ar)) return hud.say('Nincs elég pénzed a ballonokra.', 'bad'); audio.fx.water(1.4); setCargo(v.cargo + need); if (save.munka) { save.munka.betoltve = v.cargo; if (!save.munka.kezd) save.munka.kezd = Date.now(); jobT = 0; jobDmg0 = v.damage; } hud.say(`${need} ballon felrakva. Indulás!`, 'ok'); persist(); } }; } }
  for (const k of [places.pontok.kut, ...D.kutak.map(k2 => [k2.px, k2.pz])]) if (near(k, 9) && slow && v.fuel < J.tank - .3) { const l = J.tank - v.fuel, ar = tankolasAr(J, l);
    return { t: `F – Tankolás ${l.toFixed(1)} l ${J.keverek ? 'keverék' : 'benzin'} (${ar} Ft)`, f: () => { if (!fizet(ar)) return hud.say('Nincs elég pénzed tankolni.', 'bad'); v.fuel = J.tank; audio.fx.coin(); hud.say(J.keverek ? 'Tele a tank – 1:33 arányú keverék, ahogy a nagykönyvben meg van írva.' : 'Tele a tank.', 'ok'); persist(); } }; }
  const m = save.munka; if (m && near([m.px, m.pz], 7.5) && slow) { if (v.cargo < m.n) return { t: `Ide ${m.n} ballon kell, nálad ${v.cargo} van`, f: null };
    return { t: `F – Lerakás: ${m.n} ballon`, f: () => deliver() }; }
  if (near(places.pontok.garazs, 12) && slow && !m) return { t: 'F – Garázs (járművek)', f: () => { pause(); $('#pause').hidden = true; ui.ceg(() => { ui.hideAll(); $('#pause').hidden = false; }); } };
  if (slow) return { t: m ? 'F – Fuvarpiac (aktuális fuvar)' : 'F – Fuvarpiac', f: () => { pause(); $('#pause').hidden = true; ui.piac(); } };
  return null; }
function deliver() { const m = save.munka, el = Math.round(jobT), r = elszamol(m, el, Math.max(0, v.damage - jobDmg0)); audio.fx.water(2); setCargo(v.cargo - m.n);
  save.penz += r.dij; save.fuvarok++; save.legjobb = Math.max(save.legjobb, r.pont); save.hirnev = Math.min(100, save.hirnev + (el <= m.hatarido ? 2 : -1)); save.km += m.km;
  const elso = !!m.elso; if (elso) save.elso = true; save.munka = null; save.piac = ujPiac(D, save, JARMU[save.aktiv].ballon); places.setMarker(null); audio.fx.coin();
  hud.say(`Kézbesítve! +${r.dij.toLocaleString('hu-HU')} Ft` + (r.lev.length ? '<br><small>' + r.lev.map(l => l[0] + ': −' + l[1] + ' Ft').join(' · ') + '</small>' : ''), 'ok big', 4500);
  if (elso) setTimeout(() => hud.say('Halász Gergely: „Gratulálok! Megszületett a flotta! Ez az első ballon, de nem az utolsó.”', 'big', 6500), 4600);
  persist(); if (!DEV.on) { RL.submit(GAME, vagyon(save)); RL.submit(GAME + '_fuvarok', save.fuvarok); RL.submit(GAME + '_legjobb', save.legjobb); } }
function dropProps() { for (const o of props) scene.remove(o.m); props = []; }
function onFall(why, vv) { audio.fx.crash(Math.min(1, vv / 8)); const n = v.cargo; if (!n) { hud.say('Eldőltél! (' + why + ')', 'bad'); return; }
  for (let i = 0; i < n; i++) { const m = ballonMesh(scene), o = createProp(new THREE.Vector3(v.pos.x, v.pos.y + .9, v.pos.z), new THREE.Vector3(-Math.sin(v.yaw) * v.v * .7 + (Math.random() - .5) * 3, 2 + Math.random(), -Math.cos(v.yaw) * v.v * .7 + (Math.random() - .5) * 3)); o.m = m; props.push(o); }
  setCargo(0); if (save.munka) save.munka.betoltve = 0; hud.say(`Eldőltél (${why})! ${n > 1 ? 'A ballonok legurultak' : 'A ballon legurult'} – szedd vissza ${n > 1 ? 'őket' : ''} (F)!`, 'bad', 4000); }

/* ---------- kamera ---------- */
const CP = new THREE.Vector3(), LA = new THREE.Vector3(), TMP = new THREE.Vector3(), Q2 = new THREE.Quaternion(), E2 = new THREE.Euler();
function snapCam() { camUpdate(1, true); }
function camUpdate(dt, snap) { const yaw = yawOf(), o = mdl.kulso, f = TMP.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  if (camMode === 'kulso') { const a = yaw + look.yaw, d = o.tav * (1 + Math.min(.4, v.speed * .006)), h = o.mag + look.pitch * o.tav;
    CP.set(v.pos.x + Math.sin(a) * d, 0, v.pos.z + Math.cos(a) * d); CP.y = Math.max(GEO.ground(CP.x, CP.z) + .6, v.pos.y + h);
    cam.position.lerp(CP, snap ? 1 : Math.min(1, dt * 6)); LA.set(v.pos.x + f.x * 2, v.pos.y + (v.kind === 'moped' ? 1.1 : .9), v.pos.z + f.z * 2); cam.lookAt(LA); }
  else { const e = mdl.szem; TMP.set(e[0], e[1] - (v.kind === 'auto' ? v.cg : 0), e[2]).applyQuaternion(v.kind === 'moped' ? Q2.setFromEuler(E2.set(v.pitch, v.yaw, -v.lean * .7, 'YXZ')) : v.q); cam.position.copy(v.pos).add(TMP);
    cam.quaternion.copy(v.kind === 'moped' ? Q2 : v.q); cam.quaternion.multiply(new THREE.Quaternion().setFromEuler(E2.set(look.pitch, look.yaw + (ctlI.look ? Math.PI : 0), 0, 'YXZ'))); }
  radio.setInside(camMode === 'fulke'); }
canvas.addEventListener('pointerdown', e => { if (state === 'drive') { look.drag = [e.clientX, e.clientY, e.pointerId]; canvas.setPointerCapture?.(e.pointerId); } });
addEventListener('pointermove', e => { const L = look.drag; if (!L || e.pointerId !== L[2]) return; look.yaw -= (e.clientX - L[0]) * .005; look.pitch = Math.max(-.6, Math.min(.8, look.pitch + (e.clientY - L[1]) * (camMode === 'fulke' ? -.004 : .003))); L[0] = e.clientX; L[1] = e.clientY; });
addEventListener('pointerup', e => { if (look.drag && e.pointerId === look.drag[2]) look.drag = null; });
canvas.addEventListener('dblclick', () => { look.yaw = look.pitch = 0; });

/* ---------- játékhurok ---------- */
let tileT = 0, last = performance.now(), acc = 0, ctlI = {}, fpsT = 0, fpsN = 0, fps = 60;
function frame(now) { requestAnimationFrame(frame); const rdt = Math.min(DEBUG ? .5 : .1, (now - last) / 1000); last = now; fpsN++; fpsT += rdt; if (fpsT > 1) { fps = fpsN / fpsT; fpsN = 0; fpsT = 0; }
  for (const e of ctl.events()) onEvent(e);
  if (state === 'drive') drive(rdt);
  else if (state === 'menu' || state === 'sheet') { orbit += rdt * .12; const [px, pz] = places.pontok.bemutato, gy = GEO.ground(px, pz), r = previewId === 'trabo' ? 7 : 4.2; cam.position.set(px + Math.sin(orbit) * r, gy + 1.9, pz + Math.cos(orbit) * r); cam.lookAt(px, gy + .7, pz); if (previewMdl) previewMdl.g.position.y = gy + .1; }
  else if (state === 'pause' && v) { orbit += rdt * .15; cam.position.set(v.pos.x + Math.sin(orbit) * 9, v.pos.y + 3.5, v.pos.z + Math.cos(orbit) * 9); cam.lookAt(v.pos); }
  if ((tileT -= rdt) <= 0) { tileT = 1; const c = v && state === 'drive' ? v.pos : cam.position; GEO.requestAround(c.x, c.z, 14000); }
  if ((dolgT -= rdt) <= 0) { dolgT = 1; dolgTick(); } terrain.update(cam, rdt); osm.update(cam, rdt); lampak.update(v && state === 'drive' ? v.pos : cam.position, rdt); world.update(cam, rdt, cam.far, v && state === 'drive' ? v.pos : cam.position); places.update(now / 1000);
  world.updateEnv?.(renderer); resize(); post.frameTime?.(rdt); renderer.info.reset(); post.render(scene, cam);
  if (DEBUG) window.__perf = { fps: Math.round(fps), calls: renderer.info.render.calls, tris: renderer.info.render.triangles, osm: osm.stats(), state, v: v ? { x: v.pos.x, y: v.pos.y, z: v.pos.z, spd: v.speed, cargo: v.cargo } : null }; }

function drive(rdt) { const J = v.J; ctlI = ctl.read(rdt); const I = { ...ctlI };
  if (DEV.on && DEV.fuel) v.fuel = J.tank; if (pendShift) { I.shiftUp = pendShift === 'fel' ? 1 : 0; I.shiftDown = pendShift === 'le' ? 1 : 0; pendShift = null; }
  refreshEnv(v.pos.x, v.pos.z, false, rdt); acc += rdt; let n = 0;
  while (acc >= DT && n < (DEBUG ? 60 : 10)) { if (v.kind === 'moped') stepMoped(v, I, env, DT, onFall); else stepCar(v, I, env, DT); acc -= DT; n++; I.shiftUp = I.shiftDown = 0; }
  if (n >= (DEBUG ? 60 : 10)) acc = 0;
  if (v.kind === 'auto' && v.hitV > 4) { audio.fx.crash(Math.min(1, v.hitV / 12)); if (DEV.on && DEV.god) v.damage = 0; }
  if (v.kind === 'moped' && DEV.on && DEV.god && v.fallen && v.fallT > .6) { v.fallen = false; v.lean = 0; }
  if (save.munka?.kezd) jobT += rdt;
  // modell
  const p = v.pos; if (v.kind === 'moped') { mdl.g.position.copy(p); mdl.g.quaternion.copy(v.q); mdl.kerek.forEach(k => k.rotation.x = -v.wheelRot); if (mdl.kormany) mdl.kormany.rotation.y = -v.steer * .35; salAnim(mdl.sal, performance.now() / 1000, v.speed); }
  else { mdl.g.position.copy(p).addScaledVector(TMP.set(0, 1, 0).applyQuaternion(v.q), -v.cg); mdl.g.quaternion.copy(v.q);
    v.wheels.forEach((w, i) => { const k = mdl.kerek[i]; k.position.y = .28 + (w.a.y + v.cg - .28) - w.len - .0; k.rotation.set(-w.rot, w.front ? -v.steer : 0, 0, 'YXZ'); }); if (mdl.kormany) mdl.kormany.rotation.z = v.steer * 2.6; }
  // fények, index
  blinkT += rdt; const blink = blinkT % .8 < .4, night = world.tod !== undefined ? (world.tod < 6.5 || world.tod > 19.5) : false;
  if (night && !lightsOn && !v._autoL) { lightsOn = true; v._autoL = 1; }
  mdl.fenyek.elso.forEach(l => l.material.emissiveIntensity = lightsOn ? 3 : 0); if (headL) headL.intensity = lightsOn ? (night ? 60 : 8) : 0; mdl.fenyek.fek.forEach(l => l.material.emissiveIntensity = (ctlI.brake && v.vx > .3) ? 4 : lightsOn ? 1.2 : .15);
  mdl.fenyek.index.forEach(l => l.material.emissiveIntensity = blink && (ind === 3 || ind === (l.userData.s < 0 ? 1 : 2)) ? 4 : 0); if (ind && blink !== drive.pb) audio.fx.tick(blink); drive.pb = blink;
  // hang
  audio.update(v.eng.rpm, ctlI.thr, v.speed, v.skid, camMode === 'fulke');
  if (v.kind === 'moped') { whistleT -= rdt; if (whistleT < 0) { whistleT = 25 + Math.random() * 30; if (v.speed > 3) audio.fx.whistle(); } }
  // kiesett ballonok
  for (const o of props) { stepProp(o, env, rdt); o.m.position.copy(o.pos); o.m.position.y -= .145; o.m.rotation.copy(o.rot); }
  // fuvar jelölő és célnyíl
  const m = save.munka; let tgt = null; if (m) { if (v.cargo < m.n) tgt = places.pontok.toltes; else tgt = [m.px, m.pz]; places.setMarker(m.px, m.pz, 6); } else places.setMarker(null);
  if (!m && props.length) tgt = [props[0].pos.x, props[0].pos.z];
  router.set(tgt); const route = router.update(p, rdt); let navT = tgt, navL = 0;
  if (route) { for (let i = 1; i < route.length; i++) navL += Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]); navT = route.find(q => Math.hypot(q[0] - p.x, q[1] - p.z) > 35) || tgt; }
  camUpdate(rdt); let arrow = null, arrowD = '', navA = null; if (tgt) { const dx2 = tgt[0] - p.x, dz2 = tgt[1] - p.z, d = Math.hypot(dx2, dz2), cy = new THREE.Euler().setFromQuaternion(cam.quaternion, 'YXZ').y, a = Math.atan2(-dx2, -dz2) - cy;
    arrow = -a; arrowD = d > 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m'; if (navL) arrowD = navL > 1000 ? (navL / 1000).toFixed(1) + ' km' : Math.round(navL) + ' m'; navA = -(Math.atan2(-(navT[0] - p.x), -(navT[1] - p.z)) - yawOf()); }
  const it = interaction(); drive.it = it;
  const kmh = v.speed * 3.6 * Math.sign(v.vx || 1), gearT = v.kind === 'moped' ? 'A' : v.eng.gear === -1 ? 'R' : v.eng.gear === 0 ? 'N' : String(v.eng.gear) + (v.eng.auto ? '' : 'M');
  hud.update(rdt, { kmh: Math.abs(kmh), gearT, rpm: v.eng.rpm, rpmMax: v.kind === 'moped' ? 7500 : J.motor.piros, fuel: v.fuel / J.tank, fuelL: v.fuel, cargoT: `🫙 ${v.cargo} / ${J.ballon} ballon`, money: penz().toLocaleString('hu-HU') + ' Ft',
    job: m ? { t: m.nev, s: `${m.n} ballon · ${m.dij.toLocaleString('hu-HU')} Ft · ${v.cargo < m.n ? 'töltés a telephelyen' : 'határidő ' + fmtT(Math.max(0, m.hatarido - jobT))}` } : props.length ? { t: 'Szedd vissza a ballont!', s: props.length + ' ballon a földön' } : null,
    act: it?.t || null, arrow, arrowD });
  if ((miniT -= rdt) <= 0) { miniT = .3; miniSegs = osm.segsNear(p.x, p.z, 480); } hud.drawMini(p, yawOf(), miniSegs, tgt, [D.telephely.x, D.telephely.z], [...props.map(o => [o.pos.x, o.pos.z, '#5fb7e6']), ...(save.dolgozok || []).filter(e => e.job).map(e => [...DG.hely(e, D), '#f08a24'])], route);
  if (camMode === 'fulke') hud.drawDash({ moped: v.kind === 'moped', kmh: Math.abs(kmh), rpm: v.eng.rpm, fuel: v.fuel / J.tank, fuelL: v.fuel, gearT, cargo: v.cargo + '/' + J.ballon, navA, navD: arrowD, radio: radio.state.on ? radio.state.nev : '', radioF: radio.state.on ? radio.state.frek : '', indL: ind === 1 || ind === 3, indR: ind === 2 || ind === 3, blink, lights: lightsOn, hand: ctlI.hand });
  if (v.fuel <= 0 && !drive.noFuel) { drive.noFuel = 1; hud.say('Kifogyott az üzemanyag! (Szünetmenü: gyorsutazás a telephelyre.)', 'bad', 5000); } else if (v.fuel > 0) drive.noFuel = 0;
  saveT += rdt; if (saveT > 20) { saveT = 0; savePos(); persist(); }
  if (DEV.on && DEV.fps) hud.subtitle(`${Math.round(fps)} FPS · ${renderer.info.render.calls} hívás · ${(renderer.info.render.triangles / 1000).toFixed(0)}k háromszög`, 1200); }
const fmtT = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

function onEvent(e) { if (e === 'szunet') { if (mapOpen) return mapClose(); if (state === 'drive') return pause(); if (state === 'pause') return resume(); return; }
  if (e === 'terkep') { if (mapOpen) return mapClose(); if (state === 'drive') return mapOpenF(); return; }
  if (state !== 'drive') return;
  if (e === 'kamera') { camMode = camMode === 'kulso' ? 'fulke' : 'kulso'; look.yaw = look.pitch = 0; $('#dash').hidden = camMode !== 'fulke'; if (mdl.lovas) mdl.lovas.visible = camMode !== 'fulke'; }
  if (e === 'akcio') { const it = drive.it; if (it?.f) { audio.fx.click(); it.f(); } }
  if (e === 'dudaLe') { honk = true; audio.fx.horn(true, v.kind === 'moped'); } if (e === 'dudaFel') { honk = false; audio.fx.horn(false); }
  if (e === 'lampa') { lightsOn = !lightsOn; audio.fx.click(); }
  if (e === 'indexB') ind = ind === 1 ? 0 : 1; if (e === 'indexJ') ind = ind === 2 ? 0 : 2; if (e === 'veszv') ind = ind === 3 ? 0 : 3;
  if (e === 'radio') { if (v.kind === 'moped') hud.say('A mopeden nincs rádió – de fütyülni lehet!'); else radio.next(); }
  if (e === 'radioKi') radio.toggle();
  if (e === 'fel' || e === 'le') { if (v.kind === 'auto') pendShift = e; } }
let pendShift = null;

/* ---------- dev mód: külön kulcsban, a valódi mentést soha nem módosítja ---------- */
function devBadge() { document.querySelectorAll('.devB').forEach(e => e.hidden = !DEV.on); }
function setDev(on) { DEV.on = on ? 1 : 0; persistDev(); devBadge(); if (!on && save.aktiv && !save.flotta.some(f => f.id === save.aktiv)) save.aktiv = save.flotta[0]?.id || null; if (state === 'menu') ui.menu(); }
let devBuf = '', devTaps = []; addEventListener('keydown', e => { if (state !== 'menu' || e.key.length !== 1) return; devBuf = (devBuf + e.key.toLowerCase()).slice(-7); if (devBuf === 'hgwsdev') { devBuf = ''; if (!DEV.on) setDev(1); ui.dev(); } });
$('#logo').addEventListener('pointerdown', () => { const t = performance.now(); devTaps = devTaps.filter(x => t - x < 2500); devTaps.push(t); if (devTaps.length >= 7) { devTaps = []; if (!DEV.on) setDev(1); ui.dev(); } });
$('#hudDev').addEventListener('click', e => { e.stopPropagation(); if (state === 'drive') pause(); $('#pause').hidden = true; ui.dev(() => { ui.hideAll(); $('#pause').hidden = false; }); });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'drive') pause(); if (document.hidden) { savePos(); persist(); } });

/* ---------- az UI felé ---------- */
const app = { get save() { return save; }, SET, DEV, JARMUVEK, JARMU, D, get v() { return v; }, get state() { return state; }, set state(s) { state = s; }, penz, owns, fizet, persist, persistDev, setDev, applySettings, ctl, RL, GAME, vagyon,
  start: startDrive, toMenu, resume, acceptJob, cancelJob, preview: id => preview(id), radio, audio, mapOpen: mapOpenF,
  newGame(starter) { const set = save.set; save = { ...UJ_MENTES(), set, kezdes: starter, flotta: [{ id: starter }], aktiv: starter, penz: GAZD.kezdoPenz }; save.piac = ujPiac(D, save, JARMU[starter].ballon); persist(); startDrive(); },
  piac() { if (!save.piac || !save.piac.length) save.piac = ujPiac(D, save, JARMU[save.aktiv || 'babetto'].ballon); return save.piac; }, frissitPiac() { save.piac = ujPiac(D, save, JARMU[save.aktiv || 'babetto'].ballon); return save.piac; },
  DG, felvesz(id) { const j = (save.jeloltek || []).find(x => x.id === id); save.dolgozok ||= []; if (!j || save.dolgozok.length >= DG.MAX_DOLGOZO || !fizet(j.felvetel)) return false;
    const jarmu = JARMUVEK.map(J => J.id).find(t => DG.szabad(save, t)) || null; save.dolgozok.push({ id: j.id, nev: j.nev, szint: j.szint, jutalek: j.jutalek, jarmu, job: null, pihen: Date.now() + 5e3, fuvarok: 0, bevetel: 0 });
    save.jeloltek = save.jeloltek.filter(x => x.id !== id); persist(); if (!DEV.on) RL.submit(GAME + '_dolgozok', save.dolgozok.length); return true; },
  elbocsat(id) { save.dolgozok = save.dolgozok.filter(e => e.id !== id); persist(); },
  beoszt(id, jarmu) { const e = save.dolgozok.find(x => x.id === id); if (!e || (jarmu && !DG.szabad(save, jarmu, e))) return false; e.jarmu = jarmu; e.job = null; e.pihen = Date.now() + 5e3; persist(); return true; },
  veszMeg(id) { const J = JARMU[id]; if (!fizet(J.ar || 8000)) return false; save.flotta.push({ id }); persist(); return true; },
  vesz(id) { const J = JARMU[id]; if (owns(id)) return true; if (!fizet(J.ar)) return false; save.flotta.push({ id }); persist(); return true; },
  valaszt(id) { if (!owns(id)) return false; if (!DEV.on && DG.peldany(save, id) - DG.foglalt(save, id) <= 0) { hud.say('Ezt a járművet egy sofőröd használja.', 'bad'); return false; } if (state === 'pause' || state === 'drive') { if (v && Math.hypot(v.pos.x - D.telephely.x, v.pos.z - D.telephely.z) > 120) { hud.say('Járművet csak a telephelyen cserélhetsz.', 'bad'); return false; } savePos(); if (v.cargo) { save.munka && (save.munka.betoltve = 0); } }
    save.aktiv = id; save.poz = null; persist(); if (state === 'pause') { const [sx, sz] = places.pontok.start; spawn(id, sx, sz, places.rot + Math.PI); snapCam(); } else preview(id); return true; },
  szin(id, i) { save.szin[id] = i; persist(); preview(id); },
  devIdo() { world.setTime(((world.tod ?? 13) + 3) % 24); },
  devTeleport() { if (!v || !save.munka) return hud.say('Nincs aktív fuvar vagy jármű.'); const m = save.munka; dropProps(); spawn(save.aktiv, m.px + 8, m.pz + 8, yawOf()); setCargo(Math.max(v.cargo, m.n)); snapCam(); hud.say('DEV teleport', 'ok'); },
  fps: () => Math.round(fps) };
window.__vf = DEBUG ? { app, get v() { return v; }, env, GEO, get osm() { return osm; }, places: () => places, cam, get router() { return router; } } : undefined;
boot();
