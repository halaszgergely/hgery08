// Kohóvár – főprogram: menük és párbeszédablakok a Mindustry kezelőfelülete szerint (MenuFragment, PlanetDialog,
// ResearchDialog, DatabaseDialog, SettingsMenuDialog, CustomGameDialog, PausedDialog, HudFragment, PlacementFragment),
// kampány, egyéni játék, kutatás, irányítás, mentés.
// A Mindustry (Anuke) alapján: https://store.steampowered.com/app/1127400/Mindustry/
import { TS, ITEMS, ITEM_IDS, ITEM_PL, LIQUIDS, BLOCKS, CATS, BUILD_ORDER, UNITS, TECH, LEGACY_SIZE, FREE_OPTS, FREE_DEF, MAPS, freeSector, freeRanked } from './adat.js?v=202611271857';
import { FW, installFramework, loadAddon } from './keret.js?v=202611271857';
import { World, PLAYER, isPow, genFor, prepContent } from './vilag.js?v=202611271857';
import { makeTerrain, render, drawB, ghostOf, minimap, drawUnit, loadAtlas, spr, sprSize, icoCss, drawLanding } from './rajz.js?v=202611271857';
import { MODS, MOD_SECTORS, MOD_PLANETS, MOD_MAPS, loadMods, builtinList, localMods, saveLocalMod, deleteLocalMod, modPrefs, setModPrefs, readZip } from './modok.js?v=202611271857';
import { JS } from './jsapi.js?v=202611271857';
import { initCloud, changed as cloudChanged, push as cloudPush, flush as cloudFlush } from './felho.js?v=202611271857';
import { MP, initMp, canMp, listRooms, createRoom, joinRoomId, leave as mpLeave, inviteLink, roster, hostStart, hostEnd, hostTick, hostSend, guestFrame } from './mp.js?v=202611271857';
import { ISN, LSN, SN, SECSPR } from './kepadat.js?v=202611271857';
import { SECTORS, GRID, GRIDS, TXT, PLANETS, TECH_ROOT, loadMap, sectorFor, contentOf, textsFor, addModSectors } from './kampany.js?v=202611271857';
import { putSlot, getSlot, delSlot } from './mentes.js?v=202611271857';
import { toWorld } from './msav.js?v=202611271857';
import { Story } from './logika.js?v=202611271857';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)], cv = $('#c'), g = cv.getContext('2d');
const KEY = 'kohovar_v1', GAME = 'kohovar', INFRAME = window.top !== window;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
if (INFRAME) document.body.classList.add('inarc');   // az Arcade bezárógombja a jobb alsó sarokban van

/* ---------- mentés ---------- */
let S = (() => { try { return JSON.parse(localStorage.getItem(KEY) || localStorage.getItem('ercfront_v1')) || null; } catch (_) { return null; } })();
if (!S || !S.research) S = { research: TECH.filter(t => t.k === 'b' && !Object.keys(t.cost).length).map(t => t.id), bank: {}, cap: {}, best: 0, runs: {}, rv: 2 };
S.seen = S.seen || {};
if (!S.rv) { for (const id of [...S.research]) { const B = BLOCKS[id]; for (const u of [...(B && B.plans || []), ...Object.values(B && B.up || {})]) if (!S.research.includes('u:' + u)) S.research.push('u:' + u); } S.rv = 2; }   // a korábbi mentés: a már kikutatott gyárak egységei megmaradnak
for (const k in S.bank) if (S.bank[k] > 0) S.seen['i:' + k] = 1;
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); cloudChanged(); return true; } catch (_) { return false; } };
if (!S.research.includes('bastion')) S.research.push('bastion');
if (S.runs) { delete S.runs.vegtelen; for (const k in S.runs) if (k !== 'free' && !SECTORS.some(s => s.id === k)) delete S.runs[k]; }   // a régi hadjárat szektorai megszűntek
S.free = { ...FREE_DEF, ...(S.free || {}) }; S.seed = S.seed || (Math.random() * 1e9 | 0);
for (const k in FREE_OPTS) if (!FREE_OPTS[k].some(x => x[0] === S.free[k]) && !(k === 'map' && /^(def|mod):/.test(S.free.map || ''))) S.free[k] = FREE_DEF[k];
const plOk = id => { const B = BLOCKS[id]; if (!B || !W) return true; const PI = plItems(SEC.planet || 'serpulo'); return Object.keys(B.cost).every(k => PI.includes(k)); };
const done = id => ((W && W.sec.unlockAll) || (W && W.mpGuest && MP.research ? MP.research.has(id) : S.research.includes(id))) && plOk(id);   // vendégként a gazda kutatásai számítanak

/* ---------- beállítások (SettingsMenuDialog) ---------- */
const SET = { ui: 100, fps: 0, mini: 1, fx: 1, autosave: 1, ...(() => { try { return JSON.parse(localStorage.getItem('kohovar_beall')) || {}; } catch (_) { return {}; } })() };
const saveSet = () => { try { localStorage.setItem('kohovar_beall', JSON.stringify(SET)); } catch (_) {} applySet(); };
function applySet() { document.documentElement.style.setProperty('--ui', SET.ui / 100); $('#minibox').hidden = !SET.mini; $('#fps').hidden = !SET.fps; }

/* ---------- ikonok ---------- */
const ICON = {};
function blockIcon(t) {
  if (ICON[t]) return ICON[t];
  const B = BLOCKS[t], c = document.createElement('canvas'), z = B.s <= 3 ? 4 : 2; c.width = c.height = B.s * TS * z; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.scale(z, z);
  drawB(x, null, { ...ghostOf({ t, x: 0, y: 0, rot: 0, cfg: null }), dItem: null }, 0); return (ICON[t] = c.toDataURL());
}
function unitIcon(t) { const k = 'u_' + t; if (ICON[k]) return ICON[k]; const c = document.createElement('canvas'), sz = sprSize(t + '@o') || [48, 48], m = Math.max(sz[0], sz[1], 56) + 16; c.width = c.height = m; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.scale(4, 4); drawUnit(x, t, PLAYER, m / 8, m / 8, -Math.PI / 2, 0); return (ICON[k] = c.toDataURL()); }
function sprIcon(n) { const k = 's_' + n; if (ICON[k]) return ICON[k]; const sz = sprSize(n); if (!sz) return ''; const c = document.createElement('canvas'); c.width = sz[0]; c.height = sz[1]; const x = c.getContext('2d'); x.scale(4, 4); spr(x, n, sz[0] / 8, sz[1] / 8); return (ICON[k] = c.toDataURL()); }
const nodeIcon = t => t.k === 'b' ? blockIcon(t.key) : t.k === 'u' ? unitIcon(t.key) : t.k === 'i' ? sprIcon('item-' + ISN[t.key]) : t.k === 'l' ? sprIcon('liquid-' + LSN[t.key]) : sprIcon('sector-' + SECSPR[t.key]);
const itI = k => `<i class="it" style="${icoCss('item-' + ISN[k])}"></i>`, lqI = k => `<i class="it" style="${icoCss('liquid-' + LSN[k])}"></i>`;
const costHtml = (cost, have) => Object.entries(cost).map(([k, n]) => `<span class="${have && (have[k] || 0) < n ? 'bad' : ''}">${itI(k)}${n}</span>`).join(' ');
const num = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'm' : n >= 10000 ? (n / 1000).toFixed(0) + 'k' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(Math.floor(n));
const ic = (n, cls = '') => `<i class="ic ${cls} ic-${n}"></i>`;

/* ---------- állapot ---------- */
let W = null, TER = null, SEC = null, paused = false, acc = 0, last = performance.now(), T = 0;
const cam = { x: 0, y: 0, z: 4, free: null }, keys = new Set(), M = { x: 0, y: 0, wx: 0, wy: 0, l: false, drag: null, rdrag: null };
let LAND = null, selBlock = null, rot = 0, cat = 'turret', selB = null, hoverBlock = null, saveT = 0, bigMap = false, ready = false;

/* ---------- párbeszédablakok: verem, „Vissza” és Esc ---------- */
const STACK = [];
function showDlg(id, onClose) { const el = $(id); if (!STACK.some(d => d.id === id)) { for (const d of STACK) $(d.id).hidden = true; STACK.push({ id, onClose }); } else STACK.find(d => d.id === id).onClose = onClose; el.hidden = false; el.style.zIndex = 10 + STACK.length; }   // mindig csak a legfelső ablak látszik
function closeDlg(id) {
  const k = id ? STACK.findIndex(d => d.id === id) : STACK.length - 1; if (k < 0) return; const d = STACK.splice(k, 1)[0]; $(d.id).hidden = true; if (STACK.length) $(STACK[STACK.length - 1].id).hidden = false; if (d.onClose) d.onClose();
  if (!W && !STACK.length) showMenu();
}
// a modkeret szövegszerkesztője (processzorkód, üzenet)
let txtCb = null;
const FWAPI = {
  editPixels(title, w, h, data, pal, cb) { $('#pxT').textContent = title; pxState = { w, h, data: data.slice(), pal, col: 1, cb }; drawPx(); paused = true; showDlg('#dPix', () => { paused = false; pxState = null; }); },
  editText(title, text, cb, code) { $('#txtT').textContent = title; const a = $('#txtA'); a.value = text; a.className = code ? 'code' : ''; txtCb = cb; paused = true; showDlg('#dText', () => { paused = false; txtCb = null; }); setTimeout(() => a.focus(), 0); } };
let pxState = null;
function drawPx() {
  const P = pxState; if (!P) return;
  $('#pxPal').innerHTML = P.pal.map((c, i) => `<button class="${i === P.col ? 'on' : ''}" data-c="${i}" style="background:${c}"></button>`).join('');
  const cv = $('#pxC'), z = Math.floor(Math.min(480 / P.w, 480 / P.h)); cv.width = P.w * z; cv.height = P.h * z; const g = cv.getContext('2d');
  for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) { g.fillStyle = P.pal[P.data[y * P.w + x]] || '#000'; g.fillRect(x * z, y * z, z, z); }
  P.z = z;
}
$('#pxPal').onclick = e => { const b = e.target.closest('[data-c]'); if (b && pxState) { pxState.col = +b.dataset.c; drawPx(); } };
{ const paint = e => { const P = pxState; if (!P || !(e.buttons & 1)) return; const r = $('#pxC').getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * P.w), y = Math.floor((e.clientY - r.top) / r.height * P.h); if (x >= 0 && y >= 0 && x < P.w && y < P.h && P.data[y * P.w + x] !== P.col) { P.data[y * P.w + x] = P.col; drawPx(); } };
  $('#pxC').onpointerdown = e => { $('#pxC').setPointerCapture(e.pointerId); paint(e); }; $('#pxC').onpointermove = paint; }
$('#pxOk').onclick = () => { if (pxState) pxState.cb(pxState.data); closeDlg('#dPix'); if (selB) selHtml(); };
$('#txtOk').onclick = () => { if (txtCb) txtCb($('#txtA').value); txtCb = null; closeDlg('#dText'); if (selB) selHtml(); };
const closeAll = () => { while (STACK.length) { const d = STACK.pop(); $(d.id).hidden = true; } };
document.addEventListener('click', e => { const b = e.target.closest('[data-back]'); if (!b) return; const d = b.closest('.dlg,#planet'); if (d) closeDlg('#' + d.id); });

/* ---------- főmenü (MenuFragment) ---------- */
const MENU = [
  ['play', 'Játék', [['play', 'Hadjárat', () => showPlanet()], ['terrain', 'Egyéni játék', () => showCustom()], ['download', 'Játék betöltése', () => showLoad()], ['users', 'Többjátékos', () => showMp()]]],
  ['menu', 'Adatbázis', [['tree', 'Technológiafa', () => showTech()], ['book', 'Támaszpont adatbázisa', () => showDb()], ['info', 'Névjegy', () => showDlg('#dAbout')]]],
  ['book', 'Modok', () => showMods()],
  ['settings', 'Beállítások', () => showSet()],
];
let subOpen = -1;
function buildMenu() {
  if (!ready) { $('#mcol').innerHTML = '<div class="fb lg" style="height:70px">Betöltés…</div>'; return; }
  $('#mcol').innerHTML = MENU.map((m, i) => `<button class="fb ${subOpen === i ? 'on' : ''}" data-m="${i}">${ic(m[0])}${m[1]}</button>`).join('');
  const sub = subOpen >= 0 && Array.isArray(MENU[subOpen][2]) ? MENU[subOpen][2] : null; $('#msub').hidden = !sub;
  if (sub) $('#msub').innerHTML = `<div style="height:${subOpen * 70}px;flex:none"></div>` + sub.map((m, i) => `<button class="fb" data-s="${i}">${ic(m[0])}${m[1]}</button>`).join('');
}
$('#mcol').onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; const i = +b.dataset.m, m = MENU[i]; if (Array.isArray(m[2])) { subOpen = subOpen === i ? -1 : i; buildMenu(); } else { subOpen = -1; buildMenu(); m[2](); } };
$('#msub').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; const f = MENU[subOpen][2][+b.dataset.s][2]; subOpen = -1; buildMenu(); f(); };
function showMenu() { $('#menu').hidden = false; $('#hud').hidden = true; buildMenu(); }

// a menü háttere (MenuRenderer): véletlen térkép lassan úszó kamerával, alakzatban átrepülő egységek
let MW = null, MTER = null; const MCAM = { x: 0, y: 0, z: 3, vx: .18, vy: .07 }, FLY = [];
function menuWorld() {
  const sec = { id: 'menu' + (Math.random() * 1e6 | 0), free: 1, n: '', w: 160, h: 120, ores: { copper: 1, lead: .9, coal: .8, titanium: .7, thorium: .4, scrap: .4 }, sand: .3, biome: 'stone', biomes: [['stone', 'dark', 'moss', 'basalt'], ['snow', 'ice'], ['sand', 'dark'], ['spore', 'moss']][Math.random() * 4 | 0], sp: 1, win: 0, wt: 120, threat: 1, wo: 0, start: {}, fog: 0 };
  MW = new World(sec); MW.blds = []; MW.units = []; MW.spawns = []; MW.fog = false; MW.plans = []; MTER = makeTerrain(MW);
  MCAM.x = MW.w * TS * .3; MCAM.y = MW.h * TS * .4; FLY.length = 0;
}
function menuFlyers(cw, ch) {
  if (!FLY.length || FLY.every(u => u.gone)) {
    const types = ['flare', 'horizon', 'zenith', 'mono', 'poly', 'mega', 'antumbra'], t = types[Math.random() * types.length | 0], n = { flare: 9, horizon: 6, zenith: 5, mono: 7, poly: 5, mega: 3, antumbra: 2 }[t];
    const a = Math.random() * Math.PI * 2, sp = UNITS[t].sp * .9, vw = cw / MCAM.z, vh = ch / MCAM.z, R = Math.hypot(vw, vh) / 2 + 60;
    const cx = MCAM.x - Math.cos(a) * R, cy = MCAM.y - Math.sin(a) * R; FLY.length = 0;
    for (let k = 0; k < n; k++) { const row = Math.floor(k / 3), col = k % 3 - 1; FLY.push({ t, U: UNITS[t], team: PLAYER, x: cx - Math.cos(a) * row * 30 + Math.cos(a + Math.PI / 2) * col * 26, y: cy - Math.sin(a) * row * 30 + Math.sin(a + Math.PI / 2) * col * 26, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: a, walk: 0, st: {}, hp: 1, wc: [], dead: false, life: 0 }); }
  }
  for (const u of FLY) { u.x += u.vx; u.y += u.vy; u.life++; if (u.life > 60 && Math.hypot(u.x - MCAM.x, u.y - MCAM.y) > Math.hypot(cw, ch) / MCAM.z) u.gone = 1; }
  MW.units = FLY.filter(u => !u.gone);
}
function drawMenuBg() {
  if (!MW) { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height); return; }
  const vw = cv.width / MCAM.z / 2, vh = cv.height / MCAM.z / 2;
  MCAM.x += MCAM.vx; MCAM.y += MCAM.vy;
  if (MCAM.x < vw || MCAM.x > MW.w * TS - vw) MCAM.vx = -MCAM.vx; if (MCAM.y < vh || MCAM.y > MW.h * TS - vh) MCAM.vy = -MCAM.vy;
  menuFlyers(cv.width, cv.height);
  render(g, MW, { cam: MCAM, cw: cv.width, ch: cv.height, t: T, ter: MTER, nofx: 1 });
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 0, cv.width, cv.height);
}

/* ---------- raktár, szektorok ---------- */
const secNode = s => NODE['s:' + s.id] || NODE['E/s:' + s.id] || Object.values(NODE).find(t => t.k === 's' && t.key === s.id);   // az erekiri csomópontok E/ előtagosak
function secState(s) { if (S.cap[s.id]) return 'cap'; const n = secNode(s); if (s.p.alwaysUnlocked || (n && nOpen(n)) || (!n && s.mod && S.cap.groundZero)) return 'open'; return 'lock'; }
// a raktár közös, de bolygónként az ott használt anyagokat mutatja (a Mindustryban a két bolygó anyagai külön vannak)
const plItems = pl => ITEM_PL[pl] || ITEM_IDS;   // a modok bolygóin minden anyag használható
const curPl = () => W ? (SEC.planet || 'serpulo') : pcur;
function bankHtml(extra, cols = 3, pl = curPl()) { const tot = { ...S.bank }; if (extra) for (const k in extra) tot[k] = (tot[k] || 0) + (extra[k] || 0); const PI = plItems(pl), l = ITEM_IDS.filter(k => tot[k] > 0 && PI.includes(k)); return l.length ? `<div class="grid" style="display:grid;grid-template-columns:repeat(${cols},auto);gap:2px 12px">${l.map(k => `<span>${itI(k)}${num(tot[k])}</span>`).join('')}</div>` : '<span class="lg">üres</span>'; }

/* ---------- hadjárat: a Serpulo bolygó (PlanetDialog) – az eredeti PlanetGrid csempéi, forgatható gömbön ---------- */
let psel = null, PSTARS = null, g2 = null, pcur = 'serpulo';
const PV = { yaw: 0, pitch: .3, ty: null, tp: null, drag: null };
const onP = s => (s.planet || 'serpulo') === pcur, secOf = gi => SECTORS.find(s => s.gi === gi && onP(s));
function tileCol(v) {          // a csempe színe: egyszerű 3D-zaj (jég a sarkokon, víz, fű, kő, homok)
  const [x, y, z] = v, n = Math.sin(x * 3.1 + 1.3) * Math.cos(y * 2.7 - .4) + Math.sin(z * 3.7 + x * 1.9) * .6 + Math.cos(y * 5.3 + z * 2.1) * .3;
  if (pcur === 'erekir') { const k = .75 + n * .2; return Math.abs(y) > .85 ? [150 * k, 70 * k, 50 * k] : n < -.4 ? [196 * k, 98 * k, 70 * k] : n > .5 ? [120 * k, 72 * k, 60 * k] : [176 * k, 110 * k, 72 * k]; }
  if (pcur !== 'serpulo') { const P = PLANETS.find(p => p.id === pcur), c = parseInt((P && P.col || '#9c7fc8').slice(1), 16), k = .6 + n * .25; return [(c >> 16 & 255) * k, (c >> 8 & 255) * k, (c & 255) * k]; }
  if (Math.abs(y) > .82) return [214, 226, 238]; if (n < -.55) return [54, 82, 140]; if (n < -.35) return [74, 108, 160];
  if (n > .75) return [118, 112, 122]; if (n > .35) return [92, 118, 82]; return y < -.3 ? [176, 150, 108] : [86, 110, 76];
}
function rotV([x, y, z]) { const cy = Math.cos(PV.yaw), sy = Math.sin(PV.yaw), cp = Math.cos(PV.pitch), sp = Math.sin(PV.pitch); const X = x * cy + z * sy, Z1 = -x * sy + z * cy; return [X, y * cp - Z1 * sp, y * sp + Z1 * cp]; }
function planetGeo() { const c = $('#pcv'), w = c.clientWidth, h = c.clientHeight, R = Math.min(w, h) * .42; return { w, h, R, cx: w / 2, cy: h / 2 }; }
function showPlanet() { closeAll(); $('#menu').hidden = true; showDlg('#planet', () => {}); const o = SECTORS.filter(s => secState(s) === 'open' && onP(s)); if (!psel || !onP(SECTORS.find(s => s.id === psel) || {})) psel = (o.find(s => S.runs[s.id]) || o[0] || SECTORS.find(onP) || SECTORS[0]).id; focusSec(psel, 1); planetTabs(); planetInfo(); Promise.all([document.fonts.load('16px mfont'), document.fonts.load('20px mico')]).then(() => { if (!$('#planet').hidden) drawPlanet(); }); planetLoop(); }
function planetTabs() { const el = $('#ptabs'); if (!el) return; el.hidden = PLANETS.length < 2; el.innerHTML = PLANETS.map(p => `<button class="b np-button sm${p.id === pcur ? ' on' : ''}" data-pl="${p.id}">${esc(p.n)}</button>`).join(''); }
function focusSec(id, now) { const s = SECTORS.find(q => q.id === id); if (!s) return; const [x, y, z] = (GRIDS[s.planet] || GRID)[s.gi].v; const yaw = Math.atan2(-x, z), pitch = Math.atan2(y, Math.hypot(x, z)); if (now) { PV.yaw = yaw; PV.pitch = pitch; PV.ty = null; } else { let d = yaw - PV.yaw; d = ((d + Math.PI * 3) % (Math.PI * 2)) - Math.PI; PV.ty = PV.yaw + d; PV.tp = pitch; } }
let ploop = 0;
function planetLoop() { if (ploop) return; const f = () => { if ($('#planet').hidden) { ploop = 0; return; } if (PV.ty != null) { PV.yaw += (PV.ty - PV.yaw) * .15; PV.pitch += (PV.tp - PV.pitch) * .15; if (Math.abs(PV.ty - PV.yaw) < .002 && Math.abs(PV.tp - PV.pitch) < .002) PV.ty = null; } drawPlanet(); ploop = requestAnimationFrame(f); }; ploop = requestAnimationFrame(f); }
function drawPlanet() {
  const c = $('#pcv'); if (c.width !== c.clientWidth || c.height !== c.clientHeight) { c.width = c.clientWidth; c.height = c.clientHeight; } g2 = c.getContext('2d'); const { w, h, R, cx, cy } = planetGeo();
  g2.fillStyle = '#000'; g2.fillRect(0, 0, w, h);
  if (!PSTARS) { PSTARS = []; for (let k = 0; k < 260; k++) PSTARS.push([Math.random(), Math.random(), Math.random()]); }
  for (const [x, y, b] of PSTARS) { g2.fillStyle = `rgba(255,255,255,${.25 + b * .6})`; g2.fillRect(x * w, y * h, b > .8 ? 2 : 1, b > .8 ? 2 : 1); }
  const at = g2.createRadialGradient(cx, cy, R * .95, cx, cy, R * 1.12); at.addColorStop(0, 'rgba(120,150,255,.25)'); at.addColorStop(1, 'rgba(120,150,255,0)'); g2.fillStyle = at; g2.beginPath(); g2.arc(cx, cy, R * 1.12, 0, 7); g2.fill();
  const L = [-.45, .5, .74], P = p => [cx + p[0] * R, cy - p[1] * R];
  const vis = [];
  const GR = GRIDS[pcur] || GRID; GR.forEach((t, gi) => { const v = rotV(t.v); if (v[2] < -.05) return; vis.push([gi, v]); });
  for (const [gi, v] of vis) {
    const t = GR[gi], s = secOf(gi), col = tileCol(t.v), lit = .35 + .65 * Math.max(0, v[0] * L[0] + v[1] * L[1] + v[2] * L[2]);
    g2.beginPath(); t.c.forEach((q, k) => { const [x, y] = P(rotV(q)); g2[k ? 'lineTo' : 'moveTo'](x, y); }); g2.closePath();
    g2.fillStyle = `rgb(${col[0] * lit | 0},${col[1] * lit | 0},${col[2] * lit | 0})`; g2.fill();
    g2.strokeStyle = 'rgba(0,0,0,.25)'; g2.lineWidth = 1; g2.stroke();
    if (s) { const st = secState(s), sel = psel === s.id; g2.fillStyle = st === 'cap' ? 'rgba(255,211,127,.35)' : st === 'open' ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.65)'; g2.fill(); g2.lineWidth = sel ? 3 : 1.5; g2.strokeStyle = sel ? '#fff' : st === 'cap' ? '#ffd37f' : st === 'open' ? 'rgba(255,255,255,.7)' : '#454545'; g2.stroke(); }
  }
  g2.font = '16px mfont'; g2.textAlign = 'center';
  for (const [gi, v] of vis) {
    const s = secOf(gi); if (!s || v[2] < .15) continue; const [x, y] = P(v), st = secState(s), hr = R * .09 * v[2];
    if (S.runs[s.id] && st !== 'cap') { g2.fillStyle = '#ff4a3d'; g2.beginPath(); g2.arc(x + hr * .6, y - hr * .6, 4, 0, 7); g2.fill(); }
    const icn = 'sector-' + s.id; if (st !== 'lock' && sprSize(icn)) { g2.globalAlpha = .9; g2.imageSmoothingEnabled = false; spr(g2, icn, x, y, 0, null, null, hr * 1.1, hr * 1.1); g2.globalAlpha = 1; }
    else if (st === 'lock') { g2.fillStyle = '#5a5a5a'; g2.font = `${Math.round(hr * .8)}px mico`; g2.fillText(String.fromCharCode(0xe88d), x, y + hr * .3); g2.font = '16px mfont'; }
    if (st !== 'lock' && v[2] > .35) { g2.fillStyle = st === 'cap' ? '#ffd37f' : '#fff'; g2.shadowColor = '#000'; g2.shadowOffsetY = 2; g2.fillText(s.n, x, y + hr + 16); g2.shadowOffsetY = 0; }
  }
}
const THREAT = s => { const d = s.diff || 0; return d < 3 ? 'Alacsony' : d < 5 ? 'Közepes' : d < 7 ? 'Magas' : d < 9 ? 'Extrém' : 'Irtózatos'; };
function planetInfo() {
  const s = SECTORS.find(q => q.id === psel); if (!s) return; const st = secState(s), run = S.runs[s.id], node = secNode(s);
  let h = `<div class="nm">${esc(s.n)}</div><div class="lg">${mtext(s.d)}</div>`;
  h += `<div class="row">${st === 'cap' ? '<span class="acc">Elfoglalva</span>' : st === 'lock' ? `<span class="lg">${ic('lock', 'xs')} Zárva</span>` : run ? `<span>Hullám: ${run.wave}${s.win ? '/' + s.win : ''}</span>` : '<span class="lg">Felderítetlen</span>'}</div>`;
  h += `<div class="row"><span class="lg">Ellenállás:</span><span>${THREAT(s)}</span></div><div class="row"><span class="lg">Cél:</span>${s.win ? s.win + ' hullám túlélése' : 'Az ellenséges bázis elpusztítása'}</div>`;
  if (st === 'lock' && node) { const miss = [node.req, ...node.need].filter(n => n && NODE[n] && !nDone(NODE[n])); if (miss.length) h += `<div class="row bad" style="font-size:14px">Előbb: ${miss.map(n => esc(nName(NODE[n]))).join(', ')}</div>`; }
  if (run && st !== 'lock') h += `<div class="row" style="margin-top:8px"><button class="b np-button sm" id="pRestart" style="width:100%">${ic('refresh', 's')}Újrakezdés</button></div>`;
  $('#pinfo').hidden = false; $('#pinfo').innerHTML = h;
  $('#pbank').innerHTML = `<div class="acc" style="margin-bottom:4px">Raktár</div>${bankHtml()}`;
  $('#pGo').disabled = st === 'lock'; $('#pGo').querySelector('span').textContent = run ? 'Folytatás' : st === 'cap' ? 'Újra' : 'Kilövés';
}
$('#pcv').onpointerdown = e => { PV.drag = { x: e.clientX, y: e.clientY, yaw: PV.yaw, pitch: PV.pitch, m: 0 }; PV.ty = null; };
addEventListener('pointermove', e => { const d = PV.drag; if (!d) return; const { R } = planetGeo(), z = SET.ui / 100, dx = (e.clientX - d.x) / z, dy = (e.clientY - d.y) / z; d.m = Math.max(d.m, Math.abs(dx) + Math.abs(dy)); PV.yaw = d.yaw + dx / R; PV.pitch = Math.max(-1.4, Math.min(1.4, d.pitch + dy / R)); });
addEventListener('pointerup', () => { setTimeout(() => { PV.drag = null; }, 0); });
$('#pcv').onclick = e => {
  if (PV.drag && PV.drag.m > 5) return; const { R, cx, cy } = planetGeo(), r = e.target.getBoundingClientRect(), z = SET.ui / 100, mx = (e.clientX - r.left) / z, my = (e.clientY - r.top) / z;
  let best = null, bd = R * .1; for (const s of SECTORS) { if (!onP(s)) continue; const v = rotV((GRIDS[pcur] || GRID)[s.gi].v); if (v[2] < .1) continue; const d = Math.hypot(cx + v[0] * R - mx, cy - v[1] * R - my); if (d < bd) { bd = d; best = s.id; } }
  if (best) { psel = best; focusSec(best); planetInfo(); }
};
$('#pinfo').onclick = e => { const b = e.target.closest('#pRestart'); if (!b) return; if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.innerHTML = `${ic('warning', 's')}Biztos? A mentés elvész`; return; } delete S.runs[psel]; persist(); start(SECTORS.find(s => s.id === psel), null); };
$('#planet').addEventListener('click', e => { const b = e.target.closest('[data-pl]'); if (!b) return; pcur = b.dataset.pl; psel = null; showPlanet(); });
$('#pGo').onclick = () => { const s = SECTORS.find(q => q.id === psel); if (!s || secState(s) === 'lock') return; start(s, S.runs[s.id] || null); };
$('#pTree').onclick = () => showTech();

/* ---------- technológiafa (ResearchDialog): a gyökér középen, az ágak fölfelé és lefelé ---------- */
let tsel = null, tzoom = 1, TPOS = null, tpl = 'serpulo';
const THIDE = new Set();   // a technológiafában ideiglenesen elrejtett modok
const TT_ = () => { const L = TECH.filter(t => (t.pl || 'serpulo') === tpl); if (!THIDE.size) return L; const by = Object.fromEntries(L.map(t => [t.id, t])), vis = {};
  const ok = t => { if (t.id in vis) return vis[t.id]; vis[t.id] = false; return (vis[t.id] = !(t.mod && THIDE.has(t.mod)) && (!t.req || (by[t.req] ? ok(by[t.req]) : true))); };
  return L.filter(ok); };
const campRun = () => W && !W.sec.free;
function techAvail() { const a = { ...S.bank }; if (campRun()) for (const k in W.core.items) a[k] = (a[k] || 0) + W.core.items[k]; return a; }
function techSpend(cost) { for (const k in cost) { let n = cost[k]; if (campRun()) { const c = Math.min(n, W.core.items[k] || 0); W.core.items[k] = (W.core.items[k] || 0) - c; n -= c; } S.bank[k] = (S.bank[k] || 0) - n; } }
let NODE = Object.fromEntries(TECH.map(t => [t.id, t]));
const nDone = t => !t.req && t.k === 'b' ? true : t.k === 'b' || t.k === 'u' ? S.research.includes(t.rid || t.id) : t.k === 's' ? !!S.cap[t.key] : !!S.seen[t.k + ':' + t.key];
const needOk = n => NODE[n] ? nDone(NODE[n]) : n.startsWith('s:') ? !!S.cap[n.slice(2)] : S.research.includes(n);
const nOpen = t => (!t.req || nDone(NODE[t.req])) && (!t.need || (Array.isArray(t.need) ? t.need : [t.need]).every(needOk));
const nName = t => t.k === 'b' ? BLOCKS[t.key].n : t.k === 'u' ? UNITS[t.key].n : t.k === 'i' ? ITEMS[t.key].n : t.k === 'l' ? LIQUIDS[t.key].n : SECTORS.find(s => s.id === t.key).n;
const nCan = (t, av) => !nDone(t) && nOpen(t) && (t.k === 'b' || t.k === 'u') && Object.entries(t.cost).every(([k, n]) => (av[k] || 0) >= n);
function layoutTech() {
  TPOS = TPOS || {}; const tk = tpl + '|' + [...THIDE].join(','); if (TPOS[tk]) return TPOS[tk]; const kids = {}, root = TECH_ROOT[tpl]; for (const t of TT_()) if (t.req) (kids[t.req] = kids[t.req] || []).push(t);
  const pos = {}, rc = kids[root] || [], half = Math.ceil(rc.length / 2);
  const lay = (t, d, st) => { const ch = kids[t.id] || []; if (!ch.length) pos[t.id] = { x: st.leaf++, y: d, st }; else { ch.forEach(c => lay(c, d + st.dir, st)); const xs = ch.map(c => pos[c.id].x); pos[t.id] = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: d, st }; } };
  const up = { leaf: 0, dir: -1 }, dn = { leaf: 0, dir: 1 }; rc.slice(0, half).forEach(c => lay(c, -1, up)); rc.slice(half).forEach(c => lay(c, 1, dn));
  for (const id in pos) pos[id].x -= (pos[id].st.leaf - 1) / 2; pos[root] = { x: 0, y: 0 };
  const P = Object.values(pos), GX = 66, GY = 84, minX = Math.min(...P.map(p => p.x)), minY = Math.min(...P.map(p => p.y));
  for (const p of P) { p.px = 80 + (p.x - minX) * GX; p.py = 80 + (p.y - minY) * GY; }
  return (TPOS[tk] = { root, pos, w: 216 + (Math.max(...P.map(p => p.x)) - minX) * GX, h: 216 + (Math.max(...P.map(p => p.y)) - minY) * GY });
}
$('#dTech').addEventListener('click', e => { const m = e.target.closest('[data-tm]'); if (m) { const id = m.dataset.tm; if (THIDE.has(id)) THIDE.delete(id); else THIDE.add(id); if (tsel && !TT_().some(t => t.id === tsel)) tsel = null; drawTech(); return; } const b = e.target.closest('[data-tp]'); if (!b) return; tpl = b.dataset.tp; tsel = null; tzoom = Math.max(.55, Math.min(1, $('#tree').clientWidth / layoutTech().w)); drawTech(true); });
function showTech() { tpl = curPl() === 'erekir' ? 'erekir' : 'serpulo'; showDlg('#dTech', () => { if (W && STACK.length === 0) paused = false; if (W) buildPalette(); }); tsel = null; tzoom = Math.max(.55, Math.min(1, $('#tree').clientWidth / layoutTech().w)); drawTech(true); }
function drawTech(center) {
  const av = techAvail(), { pos, w, h, root } = layoutTech(), TL = TT_();
  $('#ttabs').innerHTML = ['serpulo', 'erekir'].map(p => `<button class="b np-button sm${p === tpl ? ' on' : ''}" data-tp="${p}">${esc((PLANETS.find(q => q.id === p) || { n: p }).n)}</button>`).join('');
  const tm = [...new Set(TECH.filter(t => t.mod && (t.pl || 'serpulo') === tpl).map(t => t.mod))]; $('#tmods').hidden = !tm.length;
  $('#tmods').innerHTML = tm.map(id => `<button class="b np-button sm${THIDE.has(id) ? '' : ' on'}" data-tm="${esc(id)}">${ic(THIDE.has(id) ? 'cancel' : 'eye', 'xs')}${esc((MODS.find(m => m.id === id) || { name: id }).name)}</button>`).join('');
  $('#tbank').innerHTML = `<div class="acc" style="margin-bottom:4px">Nyersanyagok <span class="lg">· ${TL.filter(nDone).length}/${TL.length}</span></div>${bankHtml(campRun() ? W.core.items : null, 3, tpl)}`;
  let svg = `<svg width="${w}" height="${h}">`, html = '';
  for (const t of TL) {
    const p = pos[t.id], d = nDone(t), o = nOpen(t); if (!p) continue;
    if (t.req) { const q = pos[t.req], my = (q.py + p.py) / 2 + 28; svg += `<path d="M${q.px + 28} ${q.py + 28}V${my}H${p.px + 28}V${p.py + 28}" fill="none" stroke="${d ? '#ffd37f' : o ? '#6e7080' : '#454545'}" stroke-width="4"/>`; }
    html += `<div class="tn np-button ${d ? 'done' : o ? 'av' : 'lock'}${nCan(t, av) ? ' can' : ''}${tsel === t.id ? ' sel' : ''}" data-t="${t.id}" style="left:${p.px}px;top:${p.py}px"><img src="${nodeIcon(t)}">${(t.k === 'b' ? BLOCKS[t.key] : t.k === 'u' ? UNITS[t.key] : null)?.part ? ic('warning', 'xs pw') : ''}</div>`;
  }
  const tr = $('#tree'), ti = $('#treeIn'), sl = tr.scrollLeft, st = tr.scrollTop; ti.style.zoom = tzoom; ti.style.width = w + 'px'; ti.style.height = h + 'px'; ti.innerHTML = svg + '</svg>' + html;
  if (center) { tr.scrollLeft = (pos[root].px + 28) * tzoom - tr.clientWidth / 2; tr.scrollTop = (pos[root].py + 28) * tzoom - tr.clientHeight / 2; } else { tr.scrollLeft = sl; tr.scrollTop = st; }
  techInfo();
}
function techInfo() {
  const el = $('#tinfo'), t = tsel && NODE[tsel]; if (!t) { el.hidden = true; return; }
  const av = techAvail(), d = nDone(t), o = nOpen(t);
  let h = `<div style="display:flex;align-items:center;gap:10px"><img src="${nodeIcon(t)}" style="width:40px;height:40px;object-fit:contain;image-rendering:pixelated"><div class="nm" style="flex:1">${o || d ? esc(nName(t)) : '???'}</div><button class="b np-button sm" id="tInfo" style="width:44px">?</button></div>`;
  if (d) h += `<div class="ok" style="margin-top:6px">${t.k === 's' ? 'Elfoglalva' : t.k === 'i' || t.k === 'l' ? 'Megszerezve' : 'Kifejlesztve'}</div>`;
  else if (t.k === 'b' || t.k === 'u') {
    h += Object.entries(t.cost).map(([k, n]) => `<div class="st">${itI(k)}${esc(ITEMS[k].n)} <span class="${(av[k] || 0) < n ? 'bad' : ''}">${num(Math.min(av[k] || 0, n))}/${num(n)}</span></div>`).join('');
    if (t.req && !nDone(NODE[t.req])) h += `<div class="bad">Előbb: ${esc(nName(NODE[t.req]))}</div>`; for (const n of [].concat(t.need || [])) if (!needOk(n)) h += `<div class="bad">Előbb: ${esc(NODE[n] ? nName(NODE[n]) : BLOCKS[n] ? BLOCKS[n].n : n)}</div>`;
    h += `<button class="b np-button" id="tGo" ${nCan(t, av) ? '' : 'disabled'} style="margin-top:8px;width:100%">${ic('hammer', 's')}Fejlesztés</button>`;
  } else h += `<div class="lg" style="margin-top:6px">${t.k === 's' ? 'Még nincs elfoglalva' : 'Még nem termelted'}</div>`;
  el.hidden = false; el.innerHTML = h;
}
function research() { if (W && W.mpGuest) return; const t = NODE[tsel]; if (!t || !nCan(t, techAvail())) return; techSpend(t.cost); S.research.push(t.rid || t.id); persist(); drawTech(); if (W) buildPalette(); }
$('#tree').onclick = e => { if (moved > 4) return; const n = e.target.closest('.tn'); tsel = n ? n.dataset.t : null; drawTech(); };
$('#tree').ondblclick = e => { if (e.target.closest('.tn')) research(); };
$('#tinfo').onclick = e => { if (e.target.closest('#tGo')) research(); if (e.target.closest('#tInfo')) { const t = NODE[tsel]; if (t && (nOpen(t) || nDone(t))) showContent(t.k, t.key); } };
$('#tree').addEventListener('wheel', e => { e.preventDefault(); const tr = $('#tree'), r = tr.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, z0 = tzoom; tzoom = Math.max(.3, Math.min(1.8, tzoom * (e.deltaY > 0 ? .88 : 1.14))); $('#treeIn').style.zoom = tzoom; tr.scrollLeft = (tr.scrollLeft + mx) * tzoom / z0 - mx; tr.scrollTop = (tr.scrollTop + my) * tzoom / z0 - my; }, { passive: false });
let moved = 0; { const tr = $('#tree'); let d = null; tr.onpointerdown = e => { d = [e.clientX, e.clientY, tr.scrollLeft, tr.scrollTop]; moved = 0; }; window.addEventListener('pointermove', e => { if (!d) return; moved = Math.hypot(e.clientX - d[0], e.clientY - d[1]); tr.scrollLeft = d[2] - (e.clientX - d[0]); tr.scrollTop = d[3] - (e.clientY - d[1]); }); window.addEventListener('pointerup', () => { d = null; }); }

/* ---------- adatbázis és tartalominformáció (DatabaseDialog, ContentInfoDialog) ---------- */
const unlocked = (k, key) => k === 'i' ? !!S.seen['i:' + key] || (S.bank[key] > 0) : k === 'l' ? !!S.seen['l:' + key] : k === 'b' ? key === 'core' || S.research.includes(key) : k === 'u' ? S.research.includes('u:' + key) || !!UNITS[key].core : k === 's' ? secState(SECTORS.find(s => s.id === key)) !== 'lock' : true;
function showDb() { showDlg('#dDb'); $('#dbq').value = ''; drawDb(); }
function drawDb() {
  const q = $('#dbq').value.trim().toLowerCase(), m = n => !q || n.toLowerCase().includes(q);
  const sec = (title, k, list, name, icon) => { const l = list.filter(key => m(name(key))); if (!l.length) return ''; return `<h4>${title}</h4><div class="dbgrid">${l.map(key => unlocked(k, key) ? `<button data-k="${k}" data-key="${key}" title="${esc(name(key))}"><img src="${icon(key)}"></button>` : `<button disabled title="?">${ic('lock', 'lk')}</button>`).join('')}</div>`; };
  $('#dbl').innerHTML = sec('Anyagok', 'i', ITEM_IDS, k => ITEMS[k].n, k => sprIcon('item-' + ISN[k])) + sec('Folyadékok', 'l', Object.keys(LIQUIDS), k => LIQUIDS[k].n, k => sprIcon('liquid-' + LSN[k]))
    + sec('Blokkok', 'b', Object.keys(BLOCKS), k => BLOCKS[k].n, blockIcon) + sec('Egységek', 'u', Object.keys(UNITS), k => UNITS[k].n, unitIcon) + sec('Szektorok', 's', SECTORS.map(s => s.id), k => SECTORS.find(s => s.id === k).n, k => sprIcon('sector-' + SECSPR[k]));
}
$('#dbq').oninput = drawDb; $('#dbl').onclick = e => { const b = e.target.closest('[data-key]'); if (b) showContent(b.dataset.k, b.dataset.key); };
function showContent(k, key) {
  let h = '', name = '', icon = '';
  const row = (a, b) => `<div class="st">${a}: <b>${b}</b></div>`;
  if (k === 'i') { const I = ITEMS[key]; name = I.n; icon = sprIcon('item-' + ISN[key]); h = row('Keménység', I.h) + row('Építési költség', I.cost + '×') + (I.f ? row('Gyúlékonyság', Math.round(I.f * 100) + '%') : '') + (I.ex ? row('Robbanékonyság', Math.round(I.ex * 100) + '%') : '') + (I.rad ? row('Radioaktivitás', Math.round(I.rad * 100) + '%') : ''); }
  else if (k === 'l') { const L = LIQUIDS[key]; name = L.n; icon = sprIcon('liquid-' + LSN[key]); h = row('Hőkapacitás', Math.round((L.hc || 0) * 100) + '%'); }
  else if (k === 'b') { const B = BLOCKS[key]; name = B.n; icon = blockIcon(key); h = row('Méret', `${B.s}×${B.s}`) + (Object.keys(B.cost).length ? `<div class="st">Építési költség: ${costHtml(B.cost)}</div>` : '') + stats(B, true); }
  else if (k === 'u') { const U = UNITS[key]; name = U.n; icon = unitIcon(key); h = ustats(U) + (U.cost ? `<div class="st">Gyártás: ${costHtml(U.cost)} · ${U.time} mp</div>` : ''); }
  else if (k === 's') { const s = SECTORS.find(q => q.id === key); name = s.n; icon = sprIcon('sector-' + SECSPR[key]); h = `<div class="st">${mtext(s.d)}</div>` + row('Cél', s.win ? s.win + ' hullám' : 'támadás') + row('Ellenállás', THREAT(s)); }
  $('#cinfo').innerHTML = `<div class="hd"><img src="${icon}"><div class="nm">${esc(name)}</div></div>${h}`; showDlg('#dInfo');
}
function ustats(U) {
  const o = [...(U.part ? [`<span class="bad">${ic('warning', 'xs')} Nem működik teljesen: ${esc(U.part)}</span>`] : []), `Életerő: <b>${U.hp}</b>`, `Páncél: <b>${U.armor}</b>`, `Sebesség: <b>${(U.sp * 60 / TS).toFixed(1)} mező/mp</b>`, `Fajta: <b>${U.air ? 'légi' : U.naval ? 'vízi' : U.legs ? 'lábas' : 'földi'}</b>`];
  if (U.rng) o.push(`Hatótáv: <b>${(U.rng / TS).toFixed(1)} mező</b>`); if (U.build) o.push(`Építési sebesség: <b>${Math.round(U.build * 100)}%</b>`); if (U.mine) o.push(`Bányászat: <b>${U.mineT}. szint</b>`); if (U.ab) o.push('Képesség: <b>' + Object.keys(U.ab).map(k => ({ regen: 'pajzsot oszt', ff: 'erőtér', rep: 'javítómező' }[k])).join(', ') + '</b>');
  return o.map(s => `<div class="st">${s}</div>`).join('');
}

/* ---------- beállítások ---------- */
let stab = 'game';
function showSet() { showDlg('#dSet'); drawSet(); }
const KEYS = [['W A S D / nyilak', 'Mozgás'], ['Bal egér', 'Lövés · lerakás · kijelölés · bányászat ércre kattintva'], ['Bal egér húzása', 'Lerakás vonalban'], ['Jobb egér húzása', 'Bontás'], ['Jobb egér', 'Kijelölés megszüntetése'], ['Q / középső gomb', 'Épület másolása'], ['R / Shift+R', 'Forgatás'], ['E', 'A kijelölt épület bontása'], ['1–9', 'Blokk a kategóriából'], ['Szóköz', 'Szünet'], ['M', 'Nagy térkép'], ['G', 'Az egységek gyülekezője a kurzornál'], ['Görgő', 'Nagyítás'], ['Esc', 'Menü / vissza']];
function drawSet() {
  $('#stabs').innerHTML = [['game', 'Játék', 'mode-survival'], ['gfx', 'Grafika', 'image'], ['ctl', 'Irányítás', 'move']].map(([k, n, i]) => `<button class="b np-button ${stab === k ? 'on' : ''}" data-tab="${k}">${ic(i, 's')}${n}</button>`).join('');
  const cb = (k, n) => `<div class="cb ${SET[k] ? 'on' : ''}" data-cb="${k}"><i></i>${n}</div>`, sl = (k, n, a, b, st, fmt) => `<div class="sl"><span class="lbl">${n}</span><input type="range" min="${a}" max="${b}" step="${st}" value="${SET[k]}" data-sl="${k}"><b>${fmt(SET[k])}</b></div>`;
  $('#sbody').innerHTML = `<div class="np-pane pane">${stab === 'game' ? sl('autosave', 'Automatikus mentés', 1, 10, 1, v => v + ' perc') : stab === 'gfx'
    ? sl('ui', 'Felület méretezése', 50, 150, 5, v => v + '%') + cb('fx', 'Hatások megjelenítése') + cb('mini', 'Minitérkép megjelenítése') + cb('fps', 'FPS megjelenítése')
    : KEYS.map(([a, b]) => `<div class="kb"><b>${a}</b><span>${b}</span></div>`).join('')}</div>`;
}
$('#stabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) { stab = b.dataset.tab; drawSet(); } };
$('#sbody').onclick = e => { const b = e.target.closest('[data-cb]'); if (!b) return; SET[b.dataset.cb] = SET[b.dataset.cb] ? 0 : 1; saveSet(); drawSet(); };
$('#sbody').oninput = e => { const k = e.target.dataset.sl; if (!k) return; SET[k] = +e.target.value; e.target.nextElementSibling.textContent = k === 'ui' ? SET[k] + '%' : SET[k] + ' perc'; if (k !== 'ui') saveSet(); };
$('#sbody').onchange = e => { if (e.target.dataset.sl === 'ui') saveSet(); };

/* ---------- egyéni játék (CustomGameDialog, MapPlayDialog) ---------- */
const FLAB = { size: 'Méret', diff: 'Nehézség', wt: 'Hullámidő', win: 'Hullámok', sp: 'Kezdőpontok', ore: 'Érc', start: 'Kezdő készlet', res: 'Kutatás', fog: 'Felfedezési köd' };
const PREV = new Map(); let prevQ = [], prevT = 0;
function preview(canvas, o, k) {
  const key = k || JSON.stringify([o.map, o.size, o.ore, o.sp, S.seed]);
  const draw = img => { canvas.width = img.width; canvas.height = img.height; const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(img, 0, 0); };
  if (PREV.has(key)) return draw(PREV.get(key));
  prevQ.push([canvas, o, key, draw]); clearTimeout(prevT); prevT = setTimeout(runPrev, 10);
}
function runPrev() {
  const job = prevQ.shift(); if (!job) return; const [canvas, o, key, draw] = job;
  if (!PREV.has(key)) {
    const sec = freeSector(o, S.seed), m = genFor(sec), ter = makeTerrain({ ...m, w: sec.w, h: sec.h }), c = document.createElement('canvas'), k = Math.max(1, Math.round(420 / sec.w)); c.width = sec.w * k; c.height = sec.h * k;
    const pg = c.getContext('2d'); pg.imageSmoothingEnabled = false; pg.drawImage(ter.mini, 0, 0, c.width, c.height); pg.fillStyle = '#ffd37f'; pg.fillRect(m.coreAt.x * k - 2, m.coreAt.y * k - 2, 3 * k + 4, 3 * k + 4); pg.fillStyle = '#ff4a3d'; for (const sp of m.spawns) pg.fillRect(sp.x * k - 3, sp.y * k - 3, 7, 7);
    PREV.set(key, c);
  }
  draw(PREV.get(key)); if (prevQ.length) prevT = setTimeout(runPrev, 10);
}
// a Mindustry beépített egyéni pályái (Maps.defaultMapNames) és a modok szektor nélküli pályái
const DEFMAPS = [['maze', 'Maze'], ['fortress', 'Fortress'], ['labyrinth', 'Labyrinth'], ['islands', 'Islands'], ['tendrils', 'Tendrils'], ['caldera', 'Ancient Caldera'], ['wasteland', 'Wasteland'], ['shattered', 'Shattered'], ['fork', 'Fork'], ['triad', 'Triad'], ['mudFlats', 'Mud Flats'], ['moltenLake', 'Molten Lake'], ['archipelago', 'Archipelago'], ['debrisField', 'Debris Field'], ['domain', 'Domain'], ['veins', 'Veins'], ['glacier', 'Glacier'], ['passage', 'Passage']];
const mapList = () => [...MAPS.map(m => ({ id: m.id, n: m.n, kind: 'gen' })), ...DEFMAPS.map(([f, n]) => ({ id: 'def:' + f, n, kind: 'msav', file: 'default/' + f + '.msav' })), ...MOD_MAPS.map(m => ({ id: 'mod:' + m.id, n: m.n, kind: 'msav', mod: m }))];
const curMap = () => mapList().find(m => m.id === S.free.map) || mapList()[0];
// a pálya adatai (a Mindustry Gamemode.valid szerint: túlélés kezdőponttal, támadás ellenséges maggal)
const MINFO = new Map();
async function mapInfo(M) {
  if (MINFO.has(M.id)) return MINFO.get(M.id);
  const m = await loadMap(M.id, M.mod ? { modMap: M.mod.id } : { mapFile: M.file }, M.mod ? M.mod.bytes : null), w = toWorld(m);
  const ec = m.builds.some(b => b.team !== 1 && b.team !== 0 && /(^|-)core/.test(m.names[m.block[b.y * m.w + b.x]] || ''));
  const ter = makeTerrain({ ...w, w: m.w, h: m.h }), c = document.createElement('canvas'), k = Math.max(1, Math.round(420 / Math.max(m.w, m.h))); c.width = m.w * k; c.height = m.h * k;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(ter.mini, 0, 0, c.width, c.height); g.fillStyle = '#ffd37f'; g.fillRect(w.coreAt.x * k - 2, w.coreAt.y * k - 2, 3 * k + 4, 3 * k + 4); g.fillStyle = '#ff4a3d'; for (const sp of w.spawns) g.fillRect(sp.x * k - 3, sp.y * k - 3, 6, 6);
  const r = { m, img: c, survival: w.spawns.length > 0, attack: ec, w: m.w, h: m.h }; MINFO.set(M.id, r); return r;
}
const drawImg = (canvas, img) => { canvas.width = img.width; canvas.height = img.height; const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(img, 0, 0); };
function showCustom() {
  showDlg('#dCustom'); prevQ = []; const L = mapList();
  const card = m => `<div class="mapb np-button ${S.free.map === m.id ? 'on' : ''}" data-map="${m.id}"><canvas></canvas><div class="nm">${esc(m.n)}</div>${m.mod ? `<div class="lg" style="font-size:13px;text-align:center">${esc(m.mod.modName)}</div>` : ''}</div>`;
  const sec = (t, l) => l.length ? `<h4 class="mapsh">${t}</h4><div class="maps">${l.map(card).join('')}</div>` : '';
  $('#maps').innerHTML = sec('Generált pályák', L.filter(m => m.kind === 'gen')) + sec('Mindustry pályák', L.filter(m => m.id.startsWith('def:'))) + sec('Mod pályák', L.filter(m => m.id.startsWith('mod:')));
  for (const el of $$('#maps .mapb')) { const M = L.find(m => m.id === el.dataset.map); if (M.kind === 'gen') preview(el.querySelector('canvas'), { ...S.free, map: M.id, size: 's' }, 'mini:' + M.id + S.seed); else mapInfo(M).then(r => drawImg(el.querySelector('canvas'), r.img)).catch(() => {}); }
}
$('#maps').onclick = e => { const b = e.target.closest('[data-map]'); if (!b) return; S.free.map = b.dataset.map; persist(); showPlay(); };
// egyéni szabályok (Mindustry CustomRulesDialog – amit a Kohóvár motorja megvalósít)
const RULES = [
  ['Hullámok', [['waves', 'Hullámok', 'b', true], ['waveTimer', 'Hullámidőzítő', 'b', true], ['waitForWaveToEnd', 'Várakozás a hullám végéig', 'b', false], ['waveSpacing', 'Hullámidő (mp)', 'n', 0, 10, 0, 600], ['winWave', 'Győzelmi hullám', 'n', 0, 5, 0, 500]]],
  ['Építés', [['infiniteResources', 'Végtelen erőforrás', 'b', false], ['buildCostMultiplier', 'Építési költség', 'n', 1, .25, 0, 10], ['buildSpeedMultiplier', 'Építési sebesség', 'n', 1, .25, .25, 20], ['deconstructRefundMultiplier', 'Bontási visszatérítés', 'n', .5, .1, 0, 1], ['blockHealthMultiplier', 'Épületek életereje', 'n', 1, .25, .25, 20], ['blockDamageMultiplier', 'Épületek sebzése', 'n', 1, .25, .25, 20], ['solarMultiplier', 'Napenergia', 'n', 1, .25, 0, 10]]],
  ['Egységek', [['unitCap', 'Egységkorlát módosító', 'n', 0, 4, -24, 200], ['unitDamageMultiplier', 'Egységek sebzése', 'n', 1, .25, .25, 20], ['unitHealthMultiplier', 'Egységek életereje', 'n', 1, .25, .25, 20], ['unitBuildSpeedMultiplier', 'Egységgyártás sebessége', 'n', 1, .25, .25, 20], ['unitCostMultiplier', 'Egységek költsége', 'n', 1, .25, 0, 10], ['unitMineSpeedMultiplier', 'Bányászat sebessége', 'n', 1, .25, .25, 10]]],
  ['Ellenség', [['enemyCoreBuildRadius', 'Építési tilalom az ellenséges mag körül (mező)', 'n', 0, 5, 0, 100]]],
];
const RDEF = Object.fromEntries(RULES.flatMap(([, l]) => l.map(r => [r[0], r])));
const GEN_SKIP = new Set(['waveSpacing', 'winWave']);   // a generált pályáknál a Hullámidő / Hullámok opció adja
const rulesCustom = () => Object.keys(S.free.rules || {}).some(k => RDEF[k] && S.free.rules[k] !== RDEF[k][3] && !(GEN_SKIP.has(k) && curMap().kind === 'gen'));
const rv = (k, base) => (S.free.rules || {})[k] ?? base ?? RDEF[k][3];
const fmt = v => typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0$/, '')) : v;
function rulesHtml(gen, mapR) {
  const base = k => k === 'waveSpacing' ? Math.round((mapR.waveSpacing || 7200) / 60) : k === 'winWave' ? (mapR.winWave || 0) : k in mapR && typeof mapR[k] !== 'object' ? mapR[k] : undefined;
  return `<details class="rules" ${S.rulesOpen ? 'open' : ''}><summary>Szabályok${rulesCustom() ? ' <span class="acc">· módosítva</span>' : ''}</summary>` + RULES.map(([t, l]) => `<div class="lg" style="margin-top:8px">${t}</div>` + l.filter(r => !(gen && GEN_SKIP.has(r[0]))).map(([k, n, ty, d, st, mi, ma]) => { const v = rv(k, base(k));
    return `<div class="rrow"><span>${n}</span>${ty === 'b' ? `<button class="b np-button sm ${v ? 'on' : ''}" data-rb="${k}" data-v="${v ? 1 : 0}">${v ? 'Be' : 'Ki'}</button>` : `<span class="optrow"><button class="b np-button sm" data-rn="${k}" data-d="-1" data-v="${v}">−</button><b class="rv">${k === 'winWave' && !v ? '∞' : fmt(v)}</b><button class="b np-button sm" data-rn="${k}" data-d="1" data-v="${v}">+</button></span>`}</div>`; }).join('')).join('') + `<div class="optrow" style="margin-top:8px"><button class="b np-button sm" data-rr="1">${ic('refresh', 'xs')}Alapértékek</button></div></details>`;
}
const MODES = [['survival', 'Túlélés'], ['attack', 'Támadás'], ['sandbox', 'Homokozó']];
async function showPlay() {
  showDlg('#dPlay'); const o = S.free, run = S.runs.free, M_ = curMap(); o.rules = o.rules || {};
  $('#fTitle').textContent = M_ ? M_.n : 'Egyéni játék';
  $('#fCont').hidden = !run; if (run && S.freeSec) $('#fCont').querySelector('span').textContent = `Folytatás (${run.wave}. hullám)`;
  const b = $('#fGo'); b.dataset.sure = ''; b.querySelector('span').textContent = 'Játék';
  if (M_.kind === 'gen') {
    $('#fOpts').innerHTML = Object.entries(FREE_OPTS).filter(([k]) => k !== 'map').map(([k, l]) => `<div class="lg" style="margin-top:6px">${FLAB[k]}</div><div class="optrow">${l.map(x => `<button class="b np-button ${o[k] === x[0] ? 'on' : ''}" data-k="${k}" data-v="${x[0]}">${esc(x[1])}${k === 'size' ? ` <span class="lg" style="font-size:14px">${x[2][0]}×${x[2][1]}</span>` : ''}</button>`).join('')}</div>`).join('')
      + `<div class="lg" style="margin-top:6px">Térképkód</div><div class="optrow" style="align-items:center"><span style="min-width:140px">${S.seed}</span><button class="b np-button" id="fSeed">${ic('refresh', 's')}Új térkép</button></div>` + rulesHtml(true, {});
    $('#fRank').innerHTML = freeRanked(o) && !MODS.length && !rulesCustom() ? `<span class="acc">Ranglistás</span> <span class="lg">· rekord: ${S.best || 0}. hullám</span>` : '<span class="lg">Nem ranglistás</span>';
    preview($('#fPrev'), o); return;
  }
  $('#fOpts').innerHTML = '<div class="lg">Betöltés…</div>'; $('#fRank').innerHTML = '<span class="lg">Nem ranglistás</span>';
  let I; try { I = await mapInfo(M_); } catch (e) { $('#fOpts').innerHTML = '<div class="bad">A pálya nem tölthető be</div>'; return; }
  if (curMap() !== M_ && curMap().id !== M_.id) return;
  const ok = m => m === 'sandbox' || (m === 'survival' ? I.survival : I.attack); if (!ok(o.mode)) o.mode = ok('survival') ? 'survival' : ok('attack') ? 'attack' : 'sandbox';
  drawImg($('#fPrev'), I.img);
  $('#fOpts').innerHTML = `<div class="lg">Méret: ${I.w}×${I.h}</div><div class="lg" style="margin-top:6px">Játékmód</div><div class="optrow">${MODES.map(([k, n]) => `<button class="b np-button ${o.mode === k ? 'on' : ''}" data-mode="${k}" ${ok(k) ? '' : 'disabled'}>${n}</button>`).join('')}</div>`
    + ['res', 'fog'].map(k => `<div class="lg" style="margin-top:6px">${FLAB[k]}</div><div class="optrow">${FREE_OPTS[k].map(x => `<button class="b np-button ${o[k] === x[0] ? 'on' : ''}" data-k="${k}" data-v="${x[0]}">${esc(x[1])}</button>`).join('')}</div>`).join('') + rulesHtml(false, I.m.rules || {});
}
$('#fOpts').addEventListener('toggle', e => { if (e.target.matches('details.rules')) { S.rulesOpen = e.target.open; persist(); } }, true);
$('#fOpts').onclick = e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return; const R = S.free.rules || (S.free.rules = {});
  if (b.id === 'fSeed') S.seed = Math.random() * 1e9 | 0;
  else if (b.dataset.mode) S.free.mode = b.dataset.mode;
  else if (b.dataset.rb) R[b.dataset.rb] = b.dataset.v !== '1';
  else if (b.dataset.rn) { const [, , , , st, mi, ma] = RDEF[b.dataset.rn]; R[b.dataset.rn] = Math.round(Math.max(mi, Math.min(ma, +b.dataset.v + st * +b.dataset.d)) * 100) / 100; }
  else if (b.dataset.rr) S.free.rules = {};
  else if (b.dataset.k) { const k = b.dataset.k, v = b.dataset.v; S.free[k] = typeof FREE_DEF[k] === 'number' ? +v : v; }
  else return;
  persist(); showPlay();
};
// a kiválasztott egyéni szabályok a Kohóvár szektorleírásához
function applyRules(sec, base) {
  const R = { ...(S.free.rules || {}) }, r = sec.rules = { ...(sec.rules || {}) };
  for (const k in R) { if (!RDEF[k]) continue; if (k === 'waveSpacing') { if (R[k] > 0) { r.waveSpacing = R[k] * 60; sec.wt = R[k]; } } else if (k === 'winWave') sec.win = R[k]; else if (k === 'enemyCoreBuildRadius') r[k] = R[k] * TS; else r[k] = R[k]; }
  if (base) { const mode = S.free.mode || 'survival'; r.attackMode = mode === 'attack'; sec.attack = r.attackMode; if (mode === 'sandbox') { r.infiniteResources = true; r.waveTimer = R.waveTimer ?? false; } if (mode === 'survival') r.waves = R.waves ?? true; }
  if (rulesCustom()) sec.ranked = 0;
  return sec;
}
$('#fGo').onclick = async e => {
  await archiveFree(); delete S.runs.free; const M_ = curMap(); let sec;
  if (M_.kind === 'gen') sec = applyRules(freeSector(S.free, S.seed));
  else sec = { id: 'free_map', n: M_.n, d: '', free: 1, camp: 'serpulo', planet: 'serpulo', p: { alwaysUnlocked: true }, ...(M_.mod ? { modMap: M_.mod.id } : { mapFile: M_.file }), fr: { mode: S.free.mode, rules: { ...(S.free.rules || {}) }, res: S.free.res, fog: S.free.fog } };
  S.freeSec = sec; persist(); start(sec, null);
};
$('#fCont').onclick = () => start(S.freeSec, S.runs.free);

/* ---------- játék betöltése (LoadDialog) ---------- */
// mentéshelyek: S.slots = [{ id, key ('free' vagy szektor), n, t, wave, auto, w, h }]; az adat a mentes.js-ben
S.slots = S.slots || [];
let loadKey = null;
const slotSec = key => key === 'free' ? null : SECTORS.find(s => s.id === key);
async function addSlot(auto) {
  if (W && W.mpGuest) return false;
  if (!W || W.lost || W.won) return false; const key = runKey(SEC), run = W.save(), base = SEC.free ? (SEC.base || SEC) : null;
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6), meta = { id, key, n: SEC.n, t: Date.now(), wave: W.wave, auto: auto ? 1 : 0, w: SEC.w || W.w, h: SEC.h || W.h };
  if (!(await putSlot(id, { sec: base, run }))) { W.msg('A mentés nem fért el', 'bad'); return false; }
  S.slots.unshift(meta);
  if (auto) { const A = S.slots.filter(q => q.auto && q.key === key && q.n === meta.n); for (const q of A.slice(3)) { delSlot(q.id); S.slots.splice(S.slots.indexOf(q), 1); } }   // futásonként az utolsó 3 automatikus
  persist(); return true;
}
// a folyamatban lévő egyéni játékot új játék előtt nem írjuk felül: mentéshelyre kerül
async function archiveFree() { const r = S.runs.free, sec = S.freeSec; if (!r || !sec) return; const id = Date.now().toString(36) + 'f'; if (await putSlot(id, { sec, run: r })) { S.slots.unshift({ id, key: 'free', n: sec.n, t: Date.now(), wave: r.wave, auto: 1, w: sec.w, h: sec.h }); persist(); } }
function showLoad(key) { loadKey = key || null; showDlg('#dLoad'); drawLoad(); }
const when = t => { const d = new Date(t); return d.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' }); };
function drawLoad() {
  const cur = Object.entries(S.runs).filter(([k, r]) => r && (k === 'free' ? S.freeSec : slotSec(k)) && (!loadKey || k === loadKey));
  const row = (icon, n, sub, attrs, del) => `<div class="save np-pane"><img src="${icon}" style="width:48px;height:48px;image-rendering:pixelated"><div class="grow"><div class="nm">${esc(n)}</div><div class="lg" style="font-size:16px">${sub}</div></div><button class="b np-button sm" ${attrs} style="width:150px">${ic('play', 's')}Betöltés</button><button class="b np-button sm" ${del} style="width:56px">${ic('trash', 's')}</button></div>`;
  const icon = k => k === 'free' ? sprIcon('sector-groundZero') : sprIcon('sector-' + SECSPR[k]);
  const curH = cur.map(([k, r]) => { const s = k === 'free' ? S.freeSec : slotSec(k); return row(icon(k), s.n, `${k === 'free' ? 'Egyéni játék' : 'Hadjárat'} · folyamatban · ${r.wave}. hullám`, `data-load="${k}"`, `data-del="${k}"`); });
  const sl = S.slots.filter(q => (!loadKey || q.key === loadKey) && (q.key === 'free' || slotSec(q.key)));
  const slH = sl.map(q => row(icon(q.key), q.n, `${q.key === 'free' ? 'Egyéni játék' : 'Hadjárat'} · ${q.auto ? 'automatikus · ' : ''}${q.wave}. hullám · ${when(q.t)}`, `data-slot="${q.id}"`, `data-sdel="${q.id}"`));
  $('#saves').innerHTML = (curH.length || slH.length) ? curH.join('') + (slH.length ? `<h4 class="mapsh" style="width:100%">Mentések</h4>` + slH.join('') : '') : '<div class="lg">Nincs mentett játék.</div>';
}
$('#saves').onclick = async e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.load) { const k = b.dataset.load; start(k === 'free' ? S.freeSec : slotSec(k), S.runs[k]); }
  if (b.dataset.slot) { const q = S.slots.find(x => x.id === b.dataset.slot), d = q && await getSlot(q.id); if (!d || !d.run) { b.disabled = true; return; }
    if (q.key === 'free') { if (S.runs.free && S.freeSec) await archiveFree(); S.freeSec = d.sec; S.runs.free = d.run; persist(); start(d.sec, d.run); } else { S.runs[q.key] = d.run; persist(); start(slotSec(q.key), d.run); } }
  if (b.dataset.del || b.dataset.sdel) { if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.innerHTML = ic('warning', 's'); return; }
    if (b.dataset.del) delete S.runs[b.dataset.del]; else { delSlot(b.dataset.sdel); S.slots = S.slots.filter(q => q.id !== b.dataset.sdel); }
    persist(); drawLoad(); }
};

/* ---------- indítás, mentés, vége ---------- */
// Mindustry-szöveg: [accent]…[] színek, :név: ikonok, \n sortörés
const MCOL = { accent: 'acc', lightgray: 'lg', gray: 'lg', red: 'bad', scarlet: 'bad', green: 'ok', white: 'wh', unlaunched: 'lg', stat: 'acc', orange: 'acc', yellow: 'acc', sky: 'acc', royal: 'acc' };
function mIcon(n) {
  const b = Object.keys(SN).find(k => SN[k] === n && BLOCKS[k]); if (b) return `<img class="mi" src="${blockIcon(b)}">`;
  if (Object.hasOwn(UNITS, n)) return `<img class="mi" src="${unitIcon(n)}">`;
  for (const k in ISN) if (ISN[k] === n) return itI(k); for (const k in LSN) if (LSN[k] === n) return lqI(k);
  if (n.startsWith('ore-') && sprSize(n + '1')) return `<img class="mi" src="${sprIcon(n + '1')}">`;
  return ic(n, 'xs');
}
function mtext(t) {
  let o = '', open = 0; t = String(t || '').replace(/[-]/g, '');
  for (let i = 0; i < t.length;) {
    const ch = t[i];
    if (ch === '[') { if (t[i + 1] === '[') { o += '['; i += 2; continue; } const j = t.indexOf(']', i); if (j > 0) { const k = t.slice(i + 1, j); if (!k) { if (open) { o += '</span>'; open--; } i = j + 1; continue; } if (/^[a-z]+$|^#[0-9a-f]{6,8}$/i.test(k)) { o += k[0] === '#' ? `<span style="color:${k.slice(0, 7)}">` : `<span class="${MCOL[k] || ''}">`; open++; i = j + 1; continue; } } }
    if (ch === ':') { const m = /^:([a-z0-9-]+):/.exec(t.slice(i)); if (m) { o += mIcon(m[1]); i += m[0].length; continue; } }
    if (ch === '\n') { o += '<br>'; i++; continue; }
    o += esc(ch); i++;
  }
  return o + '</span>'.repeat(open);
}
const toCoreT = m => { for (const b of m.builds) { const n = m.names[b.id]; if (b.team === 1 && n && n.startsWith('core-')) return Object.keys(SN).find(k => SN[k] === n && BLOCKS[k]) || 'core'; } return 'core'; };
let STORY = null;
async function start(sec, save) {
  if (sec.camp === 'serpulo' && !sec.map) {
    const mm = sec.modMap ? MOD_MAPS.find(q => q.id === sec.modMap) : null; if (sec.modMap && !mm) { $('#pinfo').insertAdjacentHTML('beforeend', `<div class="bad">A pálya modja nincs bekapcsolva</div>`); return; }
    let m; try { m = await loadMap(sec.id, sec.free ? sec : null, mm ? mm.bytes : null); } catch (e) { $('#pinfo').insertAdjacentHTML('beforeend', `<div class="bad">A pálya nem tölthető be</div>`); return; }
    const base = sec; sec = sectorFor(base, m);
    if (base.free) { const F = base.fr || {}, keep = S.free; S.free = { ...S.free, mode: F.mode, rules: F.rules || {} }; sec = applyRules({ ...sec, free: 1, base, unlockAll: F.res === 'all', ranked: 0, fog: F.fog ?? sec.fog }, base); if (mm) sec.txt = mm.txt; S.free = keep; }
    if (!save && !base.p.alwaysUnlocked) { const cap = BLOCKS[toCoreT(m)] ? BLOCKS[toCoreT(m)].cap : 4000; for (const k of plItems(base.planet || 'serpulo')) { if (!(S.bank[k] > 0)) continue; const n = Math.min(S.bank[k], Math.max(0, cap - (sec.start[k] || 0))); if (n > 0) { sec.start[k] = (sec.start[k] || 0) + n; S.bank[k] -= n; } } persist(); }   // kilövés: a raktárból a mag befogadóképességéig
  }
  if (save && save.gv === 2) sec = { ...sec, gen: 2 };   // a korábbi barlangos térkép
  if (save && !save.gv) sec = { ...sec, gen: 1, ...(LEGACY_SIZE[sec.id] ? { w: LEGACY_SIZE[sec.id][0], h: LEGACY_SIZE[sec.id][1] } : {}) };   // régi mentés: a régi térképével töltjük vissza
  SEC = sec; W = new World(sec, save); if (FW.js) FW.js.world(W); TER = makeTerrain(W); selB = null; selBlock = null; paused = false; cam.free = null; cam.z = 4; STORY = null;
  LAND = !save && W.core && SET.fx !== 0 ? { t: 0, D: 160 } : null; if (LAND) W.core.__land = 1;   // a mag leszállása (Mindustry: új szektorra érkezéskor)
  if (sec.map) STORY = W.story = new Story(W, sec.map, textsFor(SECTORS.find(q => q.id === sec.id) || {}, sec.map), { unlocked: c => { const r = contentOf(c); if (!r) return true; if (r[0] === 'b' || r[0] === 'u') return S.research.includes(r[0] === 'u' ? 'u:' + r[1] : r[1]); if (r[0] === 's') return !!S.cap[r[1]]; return !!S.seen[r[0] + ':' + r[1]] || (W.core.items[r[1]] > 0); }, content: c => contentOf(c) || ['i', 'copper'], icon: (k, key) => k === 'b' ? `:${SN[key]}:` : k === 'u' ? `:${key}:` : k === 'i' ? `:${ISN[key]}:` : k === 'l' ? `:${LSN[key]}:` : '', name: (k, key) => k === 'b' ? BLOCKS[key].n : k === 'u' ? UNITS[key].n : k === 'i' ? ITEMS[key].n : k === 'l' ? LIQUIDS[key].n : key });
  if (MODS.length) sec.ranked = 0;   // modokkal nincs ranglista
  W.onWave = n => { W.msg(`${n}. hullám`); if (n > 1 && n % 3 === 0) setTimeout(() => addSlot(true), 0); if (sec.free && sec.ranked) { if (n > (S.best || 0)) { S.best = n; persist(); } try { if (INFRAME) parent.postMessage({ hgws: 'score', game: GAME, score: n }, location.origin); } catch (_) { } } };
  W.canUnit = t => !!sec.unlockAll || S.research.includes('u:' + t);
  W.onAccel = () => { const others = PLANETS.filter(p => p.id !== (sec.planet || 'serpulo')); if (!others.length) return; saveRun(); const P = others.find(p => p.id === 'erekir') || others[0]; W.msg(`Mag kilőve: ${P.n}`); setTimeout(() => { if (!W) return; pcur = P.id; psel = null; quit(); }, 1200); };
  W.onLand = (k, max) => { if (sec.free) return 0; const n = Math.min(max, Math.floor(S.bank[k] || 0)); if (n > 0) { S.bank[k] -= n; persist(); } return n; };
  W.onLaunch = items => { if (sec.free) return; let n = 0; for (const k in items) { S.bank[k] = (S.bank[k] || 0) + items[k]; n += items[k]; } W.msg(`Kilövés: ${n} tárgy a raktárba`); persist(); };
  const p = W.player; cam.x = p.x; cam.y = p.y;
  closeAll(); $('#menu').hidden = true; $('#hud').hidden = false; $('#pbar').hidden = true; sizeMini(); buildPalette(); saveT = performance.now(); setPauseIcon();
  if (MP.host) { W.netLog = []; W.netMsgs = []; W.netSeen = []; hostStart(); }   // többjátékos: a vendégek ebbe a világba lépnek
}
// vendégként: a gazdától kapott világ (nem szimulál, csak megjeleníti a gazda állapotát)
function startGuest(gsec) {
  SEC = gsec; W = new World(gsec, null); if (FW.js) FW.js.world(W); W.mpGuest = 1; TER = makeTerrain(W); selB = null; selBlock = null; paused = false; cam.free = null; cam.z = 4; STORY = null; LAND = null;
  W.canUnit = t => !!(MP.research && MP.research.has('u:' + t)); const c = W.center(W.core); cam.x = c.x; cam.y = c.y;
  closeAll(); $('#menu').hidden = true; $('#hud').hidden = false; $('#pbar').hidden = true; sizeMini(); buildPalette(); setPauseIcon(); return W;
}
function guestEnd(why) { if (W && W.mpGuest) { W = null; closeAll(); $('#hud').hidden = true; showMenu(); } if (why) mpNote(why); }
function mpNote(t, c) { const el = $('#cnote'); el.textContent = t; el.className = 'np-pane' + (c ? ' ' + c : ''); el.hidden = false; clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 4000); }
/* ---------- többjátékos (szoba, váróterem) ---------- */
function showMp() { showDlg('#dMp'); renderMp(); if (canMp() && !MP.on) listRooms(L => { MPR = L; renderMp(); }); }
let MPR = [];
function renderMp() {
  const el = $('#mpBody'); if (!el) return;
  if (!canMp()) { el.innerHTML = `<div class="lg">Bejelentkezés szükséges</div>`; return; }
  if (!MP.on) { el.innerHTML = `<div class="mprow"><button class="b np-button" id="mpCreate">${ic('add', 's')}Szoba létrehozása</button><label class="mpchk"><input type="checkbox" id="mpOpen" checked> Barátaim beléphetnek</label></div>`
    + `<div class="acc" style="margin:12px 0 6px">Barátok szobái</div>` + (MPR.length ? MPR.map(r => `<div class="modr np-pane"><div class="grow"><div class="nm">${esc(r.hostName)} szobája</div><div class="lg" style="font-size:14px">${r.members.length}/${r.max} játékos</div></div><button class="b np-button sm" data-mpj="${esc(r.id)}" style="width:150px">${ic('right', 's')}Belépés</button></div>`).join('') : '<div class="lg">Nincs elérhető szoba</div>')
    + (MP.status ? `<div class="lg" style="margin-top:10px">${esc(MP.status)}</div>` : ''); return; }
  const R = roster(); el.innerHTML = `<div class="acc">${MP.host ? 'A te szobád' : 'Szoba: ' + esc((MP.room && MP.room.hostName) || '')}</div>`
    + R.map(p => `<div class="modr np-pane"><div class="grow nm">${esc(p.name)}${p.host ? ' <span class="lg">· gazda</span>' : ''}${p.uid === MP.me ? ' <span class="lg">· te</span>' : ''}</div></div>`).join('')
    + `<div class="mprow"><button class="b np-button sm" id="mpCopy">${ic('link', 's')}Meghívó link</button><button class="b np-button sm" id="mpLeave">${ic('exit', 's')}Kilépés a szobából</button></div>`
    + (MP.status ? `<div class="lg" style="margin-top:10px">${esc(MP.status)}</div>` : '');
}
$('#dMp').addEventListener('click', async e => { const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'mpCreate') { b.disabled = true; try { await createRoom($('#mpOpen').checked); } catch (er) { MP.status = 'Nem sikerült létrehozni a szobát.'; } renderMp(); }
  if (b.dataset.mpj) { await joinRoomId(b.dataset.mpj); renderMp(); }
  if (b.id === 'mpLeave') { await mpLeave(''); renderMp(); if (canMp()) listRooms(L => { MPR = L; renderMp(); }); }
  if (b.id === 'mpCopy') { try { await navigator.clipboard.writeText(inviteLink()); b.innerHTML = ic('ok', 's') + 'Kimásolva'; } catch (_) {} } });
const runKey = s => s.free ? 'free' : s.id;
function saveRun() { if (!W || W.lost || W.won || W.mpGuest) return; S.runs[runKey(SEC)] = W.save(); if (SEC.free) S.freeSec = SEC.base || SEC; if (!persist()) W.msg('A mentés nem fért el a böngésző tárhelyén', 'bad'); }
function quit() { if (W && W.mpGuest) { mpLeave(''); return; } if (MP.host) hostEnd(null); saveRun(); const f = SEC.free; W = null; closeAll(); $('#hud').hidden = true; if (f) { showMenu(); showCustom(); showPlay(); } else { showMenu(); showPlanet(); } }
let endFree = false;
function endGame(won) {
  if (W.mpGuest) return;
  if (MP.host) hostEnd(won);
  paused = true; const items = { ...W.core.items }, st = W.stats;
  const lines = [`Túlélt hullámok: <span class="acc">${W.wave}</span>`, `Megsemmisített ellenségek: <span class="acc">${st.kills}</span>`, `Megépített épületek: <span class="acc">${st.built}</span>`];
  if (won && SEC.free) { $('#endT').textContent = 'Győzelem!'; $('#endB').innerHTML = ''; }
  else if (won) { S.cap[SEC.id] = 1; for (const k in items) S.bank[k] = (S.bank[k] || 0) + items[k]; $('#endT').textContent = `A(z) ${SEC.n} szektor elfoglalva!`; lines.push('A mag készlete a raktárba került:'); $('#endB').innerHTML = Object.keys(items).filter(k => items[k] > 0).map(k => `<span>${itI(k)}${num(items[k])}</span>`).join(''); }
  else { $('#endT').textContent = SEC.free ? 'A játéknak vége' : `A(z) ${SEC.n} szektor elveszett!`; $('#endB').innerHTML = ''; }
  $('#endP').innerHTML = lines.join('<br>');
  const lk = runKey(SEC), hasSl = !won && S.slots.some(q => q.key === lk); $('#endLoad').hidden = !hasSl; $('#endLoad').dataset.k = lk;
  delete S.runs[runKey(SEC)]; endFree = !!SEC.free; persist(); W = null; $('#hud').hidden = true; closeAll(); showDlg('#dEnd', () => { showMenu(); if (endFree) { showCustom(); } else showPlanet(); });
}
$('#endOk').onclick = () => closeDlg('#dEnd');
$('#endLoad').onclick = () => { const k = $('#endLoad').dataset.k; closeAll(); showMenu(); showLoad(k); };
$('#pSlot').onclick = async () => { const b = $('#pSlot'); if (await addSlot(false)) { b.querySelector('span').textContent = 'Mentve'; setTimeout(() => { b.querySelector('span').textContent = 'Mentés'; }, 1500); } };

/* ---------- építőpaletta (PlacementFragment) ---------- */
const CATICON = { logic: 'logic', turret: 'turret', prod: 'production', dist: 'distribution', liquid: 'liquid', power: 'power', def: 'defense', craft: 'crafting', units: 'units', effect: 'effect' };
function buildPalette() {
  if (!BUILD_ORDER[cat].some(done)) { const c0 = CATS.find(c => BUILD_ORDER[c[0]].some(done)); if (c0) cat = c0[0]; }
  $('#cats').innerHTML = CATS.map(([id, n]) => BUILD_ORDER[id].some(done) ? `<button data-c="${id}" class="${id === cat ? 'on' : ''}" title="${esc(n)}">${ic(CATICON[id] || 'box')}</button>` : '').join('');
  $('#blks').innerHTML = BUILD_ORDER[cat].filter(done).map(t => `<div class="bk ${t === selBlock ? 'on' : ''} ${W && !W.has(BLOCKS[t].cost) ? 'no' : ''}" data-b="${t}" title="${esc(BLOCKS[t].n)}"><img src="${blockIcon(t)}">${BLOCKS[t].part ? ic('warning', 'xs pw') : ''}</div>`).join('');
}
$('#cats').onclick = e => { const b = e.target.closest('button'); if (!b) return; cat = b.dataset.c; buildPalette(); };
$('#blks').onclick = e => { const b = e.target.closest('.bk'); if (!b) return; selBlock = selBlock === b.dataset.b ? null : b.dataset.b; selB = null; $('#sel').hidden = true; buildPalette(); showInfo(selBlock); };
$('#blks').onmouseover = e => { const b = e.target.closest('.bk'); hoverBlock = b ? b.dataset.b : null; showInfo(hoverBlock || selBlock); };
$('#blks').onmouseleave = () => { hoverBlock = null; showInfo(selBlock); };
$('#binfo').onclick = e => { if (e.target.closest('.q')) { const t = hoverBlock || selBlock; if (t) { paused = true; showContent('b', t); STACK[STACK.length - 1].onClose = () => { paused = false; }; } } };
const ps = v => (v * 60).toFixed(v * 60 < 10 ? 1 : 0) + '/mp';
function stats(B, full) {
  const o = [], til = v => (v / TS).toFixed(1) + ' mező';
  { const FT = FW.types[B.type]; if (FT && FT.info) o.push(...FT.info(B)); }
  if (B.part) o.push(`<span class="bad">${ic('warning', 'xs')} Nem működik teljesen: ${esc(B.part)}</span>`);
  switch (B.type) {
    case 'turret': {
      o.push(`Hatótáv: <b>${til(B.range)}</b>`, `Célpontok: <b>${B.ground ? 'földi' : ''}${B.ground && B.air ? ', ' : ''}${B.air ? 'légi' : ''}</b>`);
      if (B.ammo && !B.pam) o.push('Lőszer: ' + Object.entries(B.ammo).map(([k, a]) => `${itI(k)}<b>${a.d}${a.spl ? '+' + Math.round(a.spl) : ''}</b>`).join(' '));
      if (B.lammo) o.push('Folyadék: ' + Object.keys(B.lammo).map(lqI).join(''));
      if (B.laser) o.push(`Lézer: <b>${B.laser.d}</b>, átüt ${B.laser.pierce} célt`); if (B.arcd) o.push(`Villám: <b>${B.arcd}</b>`); if (B.beam) o.push(`Folyamatos sugár: <b>${Math.round(B.beam.d * 12)}/mp</b>, ${(B.beam.dur / 60).toFixed(1)} mp`);
      if (B.tractor) o.push('Vonósugár: lehúzza a légi egységeket'); if (B.pd) o.push('Lelövi az ellenséges lövedékeket');
      if (B.reload) o.push(`Tűzgyorsaság: <b>${(60 / B.reload * (B.shots || 1)).toFixed(1)}/mp</b>`);
      if (B.coolReq) o.push(`Hűtés kell: ${lqI('water')}${lqI('cryo')} ${ps(B.coolReq)}`); else if (B.cool) o.push(`Hűtéssel gyorsabb: ${lqI('water')}${lqI('cryo')}`);
      break;
    }
    case 'drill': o.push(`Fúrható: ${ITEM_IDS.filter(k => ITEMS[k].h <= B.tier && ['copper', 'lead', 'sand', 'coal', 'scrap', 'titanium', 'thorium'].includes(k)).map(itI).join('')}`, `Sebesség (teljes ércen): <b>${(60 / (B.time + 50) * B.s * B.s).toFixed(2)}/mp</b>`, `Vízzel <b>${(B.boost * B.boost).toFixed(2)}×</b> gyorsabb`); break;
    case 'crafter': {
      const inp = [...Object.entries(B.inp || {}).map(([k, n]) => itI(k) + n), ...(B.inL ? [lqI(B.inL[0]) + ps(B.inL[1])] : [])], out = [...Object.entries(B.out || {}).map(([k, n]) => itI(k) + n), ...(B.outL ? [lqI(B.outL[0]) + ps(B.outL[1])] : []), ...(B.sep ? [Object.keys(B.sep).map(itI).join('')] : [])];
      if (B.recipes) o.push(...B.recipes.map(r => `${Object.entries(r.inp).map(([k, n]) => itI(k) + n).join(' + ') || '—'} → ${Object.entries(r.out).map(([k, n]) => itI(k) + n).join(' ')} <span class="lg">${(r.time / 60).toFixed(1)} mp</span>`));
      else o.push(`Bemenet: ${inp.join(' + ') || '—'}`, `Kimenet: ${out.join(' ')}`); if (B.time && !B.recipes) o.push(`Gyártási idő: <b>${(B.time / 60).toFixed(2)} mp</b>`); if (B.attr) o.push({ spores: 'Spórás talajon gyorsabb', heat: 'Forró talajon gyorsabb', oil: 'Homokon, palán, kátrányon termel' }[B.attr] || ''); break;
    }
    case 'conveyor': case 'sconv': o.push(`Sebesség: <b>${B.speed} tárgy/mp</b>`); break;
    case 'bridge': case 'lbridge': o.push(`Hatótáv: <b>${B.range} mező</b>`); break;
    case 'driver': o.push(`Hatótáv: <b>${til(B.range)}</b>, ${B.cap} tárgy / lövés`); break;
    case 'pump': o.push(`Szivattyúzás: <b>${ps(B.amt * B.s * B.s)}</b>`); break;
    case 'conduit': case 'lrouter': o.push(`Kapacitás: <b>${B.lcap}</b>`); break;
    case 'node': o.push(`Hatótáv: <b>${B.range} mező</b>`, `Kapcsolatok: <b>${B.links}</b>`); break;
    case 'battery': o.push(`Kapacitás: <b>${B.capP}</b>`); break;
    case 'generator': o.push(`Termel: <b>${Math.round(B.gen * 60)}/mp</b>` + ({ burn: ' · éghető anyag', item: ` · ${itI(B.fuel)}`, rtg: ` · ${itI('thorium')}${itI('phase')}`, thermal: ' / forró mező', reactor: ` · ${itI('thorium')}`, impact: ` · ${itI('blast')}` }[B.mode] || '') + (B.inL ? ` + ${lqI(B.inL[0])}${ps(B.inL[1])}` : '')); break;
    case 'mender': o.push(`Javítás: <b>${B.heal}%</b> / ${(B.reload / 60).toFixed(1)} mp`, `Hatótáv: <b>${til(B.range)}</b>`); if (B.bItem) o.push(`Erősítő: ${itI(B.bItem)}`); break;
    case 'overdrive': o.push(`Gyorsítás: <b>+${Math.round((B.od - 1) * 100)}%</b>`, `Hatótáv: <b>${til(B.range)}</b>`, B.need ? 'Kell: ' + Object.keys(B.need).map(itI).join('') : B.bItem ? `Erősítő: ${itI(B.bItem)}` : ''); break;
    case 'shield': o.push(`Pajzs: <b>${B.shp}</b>`, `Sugár: <b>${til(B.radius)}</b>`); if (B.bItem) o.push(`Erősítő: ${itI(B.bItem)}`); break;
    case 'mine': o.push(`Villám: <b>${B.cnt}×${B.d}</b>`); break;
    case 'factory': o.push('Egységek: <b>' + B.plans.map(u => UNITS[u].n).join(', ') + '</b>'); break;
    case 'recon': o.push('<b>' + Object.entries(B.up).map(([a, b]) => `${UNITS[a].n} → ${UNITS[b].n}`).join(', ') + '</b>', `Kell: ${costHtml(B.inp)}${B.inL ? ' ' + lqI(B.inL[0]) + ps(B.inL[1]) : ''} · ${B.time / 60} mp`); break;
    case 'repair': o.push(`Egységjavítás: <b>${ps(B.rep)}</b>`, `Hatótáv: <b>${til(B.range)}</b>`); break;
    case 'core': o.push(`Tárhely: <b>${B.cap} / anyag</b>`, `Egység: <b>${UNITS[B.unit].n}</b>`); break;
    case 'storage': o.push(`Tárhely: <b>${B.cap} / anyag</b>`); break;
    case 'launchpad': o.push(`<b>${B.cap}</b> tárgy a raktárba ${B.time / 60} mp-enként`); break;
    case 'wall': if (B.deflect) o.push('Visszaveri a lövedékeket'); if (B.zap) o.push('Találatkor villámot szór'); if (B.insul) o.push('Elnyeli a lézert, szigetel'); break;
  }
  if (B.power) o.push(`Áramfelvétel: <b>${Math.round(B.power * 60)}/mp</b>`);
  o.push(`Életerő: <b>${B.hp}</b>`);
  return o.filter(Boolean).map(s => `<div class="st">${s}</div>`).join('');
}
function showInfo(t) {
  const el = $('#binfo'); if (!t || !W) { el.hidden = true; el.dataset.h = ''; return; } const B = BLOCKS[t], have = W.core.items;
  const h = `<div class="hd"><img src="${blockIcon(t)}"><span class="nm">${esc(B.n)}</span><button class="b np-button q" title="Információ">?</button></div>` + Object.entries(B.cost).map(([k, n]) => `<div class="rq">${itI(k)}<span class="lg" style="flex:1">${esc(ITEMS[k].n)}</span><span class="${(have[k] || 0) < n ? 'bad' : ''}">${num(have[k] || 0)}/${n}</span></div>`).join('');
  el.hidden = false; if (el.dataset.h !== h) { el.innerHTML = h; el.dataset.h = h; }
}

/* ---------- kiválasztott épület: a blokk alatt lebegő tábla (BlockInventoryFragment, BlockConfigFragment) ---------- */
const bar = (f, col, txt) => `<div class="mbar"><i style="width:${Math.max(0, Math.min(1, f)) * 100}%;background:${col}"></i><span>${txt}</span></div>`;
function selHtml() {
  const b = selB; if (!b || b.dead) { $('#sel').hidden = true; selB = null; return; }
  const B = b.B; let h = `<div class="hd"><span>${esc(B.n)}</span><button class="x" data-x="1">${ic('cancel', 'xs')}</button></div>` + bar(b.hp / B.hp, '#ff341c', `Életerő ${Math.ceil(b.hp)}/${B.hp}`);
  const its = b === W.core ? [] : Object.keys(b.items).filter(k => b.items[k] > 0);
  if (its.length) h += `<div style="display:flex;flex-wrap:wrap;gap:2px 10px;margin:4px 0">${its.map(k => `<span>${itI(k)}${num(b.items[k])}</span>`).join('')}</div>`;
  if (b.lq > .1) h += bar(b.lq / (B.lcap || 10), LIQUIDS[b.lt].c, `${LIQUIDS[b.lt].n} ${b.lq.toFixed(0)}`);
  if (b.oq > .1) { const k = B.outL ? B.outL[0] : b.pLiq; h += bar(b.oq / (B.lcap || 10), LIQUIDS[k].c, `${LIQUIDS[k].n} ${b.oq.toFixed(0)}`); }
  if (B.ammo && !B.pam) h += `<div>Lőszer: ${b.ammo.map(a => itI(a.it) + a.n).join(' ') || '<span class="bad">nincs</span>'}</div>`;
  if (B.type === 'drill') h += bar(b.warm || 0, '#ffd37f', b.dItem ? `${ITEMS[b.dItem].n} ${(60 * b.dCnt * (b.warm || 0) / (B.time + 50 * ITEMS[b.dItem].h)).toFixed(2)}/mp` : 'Nincs érc');
  if (B.type === 'generator') h += bar(B.mode === 'reactor' ? b.heat : (b.pgen || 0) / B.gen, B.mode === 'reactor' ? '#ff341c' : '#ec7b4c', `Termel: ${Math.round((b.pgen || 0) * 60)}/mp${B.mode === 'reactor' ? ` · hő ${Math.round(b.heat * 100)}%` : B.mode === 'impact' ? ` · ${Math.round(b.warm * 100)}%` : ''}`);
  if (B.type === 'shield') h += bar(1 - b.sh / B.shp, '#ffd37f', b.broken ? 'Összeomlott' : `Pajzs ${Math.round(B.shp - b.sh)}/${B.shp}`);
  if (b.g) h += bar(b.g.sat, '#ec7b4c', `Áram: +${Math.round(b.g.prod * 60)} / −${Math.round(b.g.need * 60)}`) + (b.g.cap ? bar(b.g.stored / b.g.cap, '#ec7b4c', `Akkumulátor ${num(b.g.stored)}/${num(b.g.cap)}`) : '');
  if (B.cfg === 'item') h += `<div class="ipick">${ITEM_IDS.map(k => `<button class="${b.cfg === k ? 'on' : ''}" data-i="${k}" title="${esc(ITEMS[k].n)}"><i style="${icoCss('item-' + ISN[k], 24)}"></i></button>`).join('')}</div>`;
  if (B.type === 'factory') { const ut = B.plans[b.cfg || 0], U = UNITS[ut], pc = (B.pcost && B.pcost[ut]) || U; h += `<div class="ipick">${B.plans.map((u, i) => W.canUnit(u) ? `<button class="${(b.cfg || 0) === i ? 'on' : ''}" data-u="${i}" title="${esc(UNITS[u].n)}"><img src="${unitIcon(u)}" style="width:32px"></button>` : '').join('')}</div><div>${W.canUnit(ut) ? '' : '<span class="bad">Nincs kifejlesztve</span> '}${esc(U.n)} (${W.countU(ut)}/${W.core.B.ucap}): ${costHtml(pc.cost || {}, b.items)}</div>` + bar(b.prog, '#ffd37f', Math.round(b.prog * 100) + '%'); }
  if (B.type === 'recon') h += `<div>${b.pay ? `${esc(UNITS[b.pay].n)} → ${esc(UNITS[B.up[b.pay]].n)}` : '<span class="lg">Egységre vár</span>'}: ${costHtml(B.inp, b.items)}</div>` + bar(b.prog, '#ffd37f', Math.round(b.prog * 100) + '%');
  if (B.type === 'launchpad' || (B.type === 'crafter' && B.time)) h += bar(B.type === 'launchpad' ? b.prog / B.time : b.prog, '#ffd37f', Math.round((B.type === 'launchpad' ? b.prog / B.time : b.prog) * 100) + '%');
  if (b === W.core) h += `<div class="lg">Tárhely: ${W.coreCap()} / anyag</div>`;
  { const FT = FW.types[B.type]; if (FT && FT.sel) h += FT.sel(W, b); }
  const el = $('#sel'); el.hidden = false; if (el.dataset.h !== h) { el.innerHTML = h; el.dataset.h = h; }
  const z = SET.ui / 100, c = W.center(b), sx = ((c.x - cam.x) * cam.z + cv.width / 2) / z, sy = ((c.y + B.s * TS / 2 - cam.y) * cam.z + cv.height / 2) / z + 8;
  el.style.left = Math.max(4, Math.min(innerWidth / z - 304, sx - 150)) + 'px'; el.style.top = Math.max(70, Math.min(innerHeight / z - el.offsetHeight - 4, sy)) + 'px';
}
$('#sel').onclick = e => {
  const t = e.target.closest('button'); if (!t || !selB) return;
  if (t.dataset.x) { selB = null; $('#sel').hidden = true; return; }
  if (t.dataset.i) selB.cfg = selB.cfg === t.dataset.i ? null : t.dataset.i;
  if (t.dataset.u) { selB.cfg = +t.dataset.u; selB.prog = 0; }
  if (t.dataset.fw) { const FT = FW.types[selB.B.type]; if (FT && FT.selClick) FT.selClick(W, selB, t, FWAPI); }
  if (W.mpState) W.mpState(selB);   // vendégként a beállítás a gazdához megy
  selHtml();
};

/* ---------- parancsmód (Mindustry: Shift + egér) ---------- */
const CMD = new Set();
const cmdUnits = () => W.units.filter(u => !u.dead && u.team === 1 && u !== W.player && typeof u.ctl !== 'object' && !u.carrier);
function cmdSelect() {
  const [ax, ay] = M.box, x0 = Math.min(ax, M.wx), x1 = Math.max(ax, M.wx), y0 = Math.min(ay, M.wy), y1 = Math.max(ay, M.wy);
  if (x1 - x0 < 3 && y1 - y0 < 3) { let best = null, bd = 1e9; for (const u of cmdUnits()) { const d = Math.hypot(u.x - M.wx, u.y - M.wy); if (d < u.U.r + 4 && d < bd) { bd = d; best = u; } } CMD.clear(); if (best) CMD.add(best); return; }
  CMD.clear(); for (const u of cmdUnits()) if (u.x >= x0 - u.U.r && u.x <= x1 + u.U.r && u.y >= y0 - u.U.r && u.y <= y1 + u.U.r) CMD.add(u);
}
function cmdIssue() {
  let t = null, bd = 1e9; for (const u of W.units) { if (u.dead || u.team !== 2) continue; const d = Math.hypot(u.x - M.wx, u.y - M.wy); if (d < u.U.r + 6 && d < bd) { bd = d; t = u; } }
  if (!t) { const [tx, ty] = tileAt(M.wx, M.wy), b = W.inb(tx, ty) && W.seen[ty * W.w + tx] ? W.tb(tx, ty) : null; if (b && b.team === 2) t = b; }
  const n = W.command([...CMD], M.wx, M.wy, t); if (!n) return;
  const c = t ? (t.U ? t : W.center(t)) : { x: M.wx, y: M.wy }; W.fx.push({ k: 'ring', x: c.x, y: c.y, r: 10, life: 20, max: 20, c: t ? '#f25555' : '#ffd37f' });
}

/* ---------- bevitel ---------- */
const tileAt = (wx, wy) => [Math.floor(wx / TS), Math.floor(wy / TS)];
function originOf(t, tx, ty) { const o = Math.floor((BLOCKS[t].s - 1) / 2); if (BLOCKS[t].type === 'core') { for (const [dx, dy] of [[0, 0], [-1, 0], [0, -1], [-1, -1], [1, 0], [0, 1], [1, 1], [-1, 1], [1, -1]]) if (W.zoneOk(BLOCKS[t], tx - o + dx, ty - o + dy)) return [tx - o + dx, ty - o + dy]; return W.coreSpot(t); } return [tx - o, ty - o]; }   // mag: a core-zone talajra újként, máshol a saját mag fejlesztéseként
function linePlans(t, a, b) {
  const B = BLOCKS[t], s = B.s, out = []; let [x, y] = a; const [x2, y2] = b, pts = [[x, y]];
  if (B.type === 'core') { const [cx, cy] = originOf(t, b[0], b[1]); return [{ t, x: cx, y: cy, rot: 0 }]; }
  const stepTo = axis => { if (axis === 0) while (Math.abs(x2 - x) >= s) { x += Math.sign(x2 - x) * s; pts.push([x, y]); } else while (Math.abs(y2 - y) >= s) { y += Math.sign(y2 - y) * s; pts.push([x, y]); } };
  if (Math.abs(x2 - x) >= Math.abs(y2 - y)) { stepTo(0); stepTo(1); } else { stepTo(1); stepTo(0); }
  for (let k = 0; k < pts.length; k++) {
    let r = rot;
    if (B.rot && s === 1 && pts.length > 1) { const [px, py] = pts[k], [qx, qy] = k + 1 < pts.length ? pts[k + 1] : pts[k - 1]; const ddx = k + 1 < pts.length ? qx - px : px - qx, ddy = k + 1 < pts.length ? qy - py : py - qy; r = ddx > 0 ? 0 : ddx < 0 ? 2 : ddy > 0 ? 1 : 3; }
    const [ox, oy] = originOf(t, pts[k][0], pts[k][1]); let tt = t;
    // Mindustry: a vonalban húzott szalag a keresztben futó szalagra csomópontot tesz, a cső a keresztező csőre folyadék-csomópontot
    if (s === 1 && k > 0 && k < pts.length - 1 && (B.type === 'conveyor' || B.type === 'conduit')) { const o = W.tb(ox, oy); if (o && o.B.type === B.type && (o.rot - r + 4) % 2 === 1) tt = B.type === 'conveyor' ? 'junction' : 'ljunction'; }
    out.push({ t: tt, x: ox, y: oy, rot: r });
  }
  return out;
}
function updMouse(e) { const r = cv.getBoundingClientRect(); M.x = e.clientX - r.left; M.y = e.clientY - r.top; M.wx = (M.x - cv.width / 2) / cam.z + cam.x; M.wy = (M.y - cv.height / 2) / cam.z + cam.y; }
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  if (!W) { if (subOpen >= 0) { subOpen = -1; buildMenu(); } return; } updMouse(e); cv.setPointerCapture(e.pointerId);
  const [tx, ty] = tileAt(M.wx, M.wy);
  if (e.button === 1) { pickAt(tx, ty); return; }
  if (keys.has('shift') && (e.button === 0 || e.button === 2)) {   // parancsmód (Shift): bal húzás kijelöl, jobb klikk parancsot ad
    if (e.button === 0) { M.box = [M.wx, M.wy]; return; }
    if (CMD.size) { cmdIssue(); return; }
  }
  if (e.button === 2) { if (selBlock && !(W.inb(tx, ty) && (W.tb(tx, ty) || W.planAt(tx, ty)))) { selBlock = null; buildPalette(); showInfo(null); return; } M.rdrag = [tx, ty]; return; }   // építés közben is töröl, ha van alatta valami
  if (e.button !== 0) return;
  if (selBlock) { M.drag = [tx, ty]; return; }
  const b = W.inb(tx, ty) && W.seen[ty * W.w + tx] ? W.tb(tx, ty) : null;
  if (selB && b && b !== selB && linkClick(selB, b)) return;
  { const FT = b && FW.types[b.B.type]; if (FT && FT.tap && FT.tap(W, b)) { if (selB === b) selHtml(); return; } }
  if (b && b.B.door) { b.open = !b.open; W.fdirty = 1; if (W.mpState) W.mpState(b); return; }
  if (!b && W.prioritize(tx, ty)) return;   // a kattintott terv épüljön először
  if (b) { selB = b; selHtml(); return; }
  { const FT = selB && !selB.dead && FW.types[selB.B.type]; if (FT && FT.pointTap && FT.pointTap(W, selB, tx, ty)) { selHtml(); return; } }
  const i = ty * W.w + tx, p = W.player;
  if (W.inb(tx, ty) && W.seen[i] && p && W.mineItem(i, p.U.mineT, p.U.mineW ? 'w' : 1)) { p.mine = p.mine === i ? -1 : i; if (W.mpMine) W.mpMine(p.mine); return; }
  selB = null; $('#sel').hidden = true; M.l = true;
});
window.addEventListener('pointermove', e => { updMouse(e); });
window.addEventListener('pointerup', e => {
  if (!W) { M.l = false; return; }
  updMouse(e); const [tx, ty] = tileAt(M.wx, M.wy);
  if (e.button === 0 && M.box) { cmdSelect(); M.box = null; return; }
  if (e.button === 0) { M.l = false; if (M.drag && selBlock) { const pa = M.drag[0] === tx && M.drag[1] === ty && W.planAt(tx, ty); if (pa && pa.t !== selBlock) W.prioritize(tx, ty); else { for (const p of linePlans(selBlock, M.drag, [tx, ty])) W.plan(p.t, p.x, p.y, p.rot); if (pa) W.prioritize(tx, ty); } } M.drag = null; }
  if (e.button === 2 && M.rdrag) {
    const [ax, ay] = M.rdrag, x0 = Math.min(ax, tx), x1 = Math.max(ax, tx), y0 = Math.min(ay, ty), y1 = Math.max(ay, ty), seen = new Set();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (W.cancelAt(x, y)) continue; const b = W.tb(x, y); if (b && !seen.has(b)) { seen.add(b); W.unplan(b); } }
    M.rdrag = null;
  }
});
cv.addEventListener('wheel', e => { e.preventDefault(); if (!W) return; cam.z = Math.max(1.5, Math.min(9, cam.z * (e.deltaY > 0 ? .88 : 1.14))); }, { passive: false });
function pickAt(tx, ty) { const b = W.tb(tx, ty); if (!b || b.t === 'core' || !done(b.t)) return; selBlock = b.t; rot = b.rot; cat = BLOCKS[b.t].kat || cat; buildPalette(); showInfo(selBlock); }
function linkClick(a, b) {
  { const FT = FW.types[a.B.type]; if (FT && FT.linkTap) { if (FT.linkTap(W, a, b)) { selHtml(); return true; } return false; } }
  if (a.B.type === 'node' && isPow(b) && b.B.type !== 'diode') { if (W.nodeDist(a, b) <= a.B.range * TS) { W.toggleLink(a, b); selHtml(); return true; } return false; }
  if ((a.B.type === 'bridge' || a.B.type === 'lbridge') && !a.B.dir && b.t === a.t) { if ((a.x === b.x || a.y === b.y) && Math.abs(a.x - b.x) + Math.abs(a.y - b.y) <= a.B.range) { a.link = a.link === b.i ? -1 : b.i; if (b.link === a.i) b.link = -1; selB = b; selHtml(); return true; } }
  if (a.B.type === 'driver' && b.t === a.t) { if (Math.hypot(a.x - b.x, a.y - b.y) * TS <= a.B.range) { a.link = a.link === b.i ? -1 : b.i; if (b.link === a.i) b.link = -1; selHtml(); return true; } }
  return false;
}
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase(), typing = (e.target.tagName === 'INPUT' && e.target.type !== 'range') || e.target.tagName === 'TEXTAREA';
  if (k === 'escape') { if (STACK.length) { closeDlg(); return; } if (!W) { if (subOpen >= 0) { subOpen = -1; buildMenu(); } return; } }
  if (!W || typing || STACK.length) return; keys.add(k);
  if (k === 'r') { const d = e.shiftKey ? 3 : 1, [tx, ty] = tileAt(M.wx, M.wy); if (!W.rotateAt(tx, ty, d)) rot = (rot + d) % 4; }
  if (k === 'q') { const [tx, ty] = tileAt(M.wx, M.wy); pickAt(tx, ty); }
  if (k === ' ') { e.preventDefault(); togglePause(); }
  if (k === 'm') { bigMap = !bigMap; sizeMini(); }
  if (k === 'g') { const n = W.rally(M.wx, M.wy); if (n) W.msg(`${n} egység gyülekezik`); }
  if (k === 'shift') W.rallied = 1;   // parancsmódba lépés (Mindustry CommandModeObjective)
  if (k === 'escape' && CMD.size) { CMD.clear(); return; }
  if (k === 'escape') { if (bigMap) { bigMap = false; sizeMini(); } else if (selBlock || selB) { selBlock = null; selB = null; $('#sel').hidden = true; buildPalette(); showInfo(null); } else openPM(); }
  if (k === 'e' && selB && selB.B.type !== 'core') W.unplan(selB);
  if (/^[1-9]$/.test(k)) { const t = BUILD_ORDER[cat].filter(done)[+k - 1]; if (t) { selBlock = t; buildPalette(); showInfo(t); } }
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); M.l = false; });
function setPauseIcon() { $('#bPause').innerHTML = ic(paused ? 'play' : 'pause'); }
function togglePause() { paused = !paused; $('#pbar').hidden = !paused; setPauseIcon(); }
const resume = () => { paused = false; $('#pbar').hidden = true; setPauseIcon(); };
function openPM() { paused = true; const b = $('#pAband'); b.dataset.sure = ''; b.querySelector('span').textContent = SEC && SEC.free ? 'Feladás' : 'Szektor feladása'; showDlg('#dPause', resume); }
$('#bPause').onclick = togglePause; $('#bMenu').onclick = openPM;
$('#bTech').onclick = () => { paused = true; showTech(); STACK[STACK.length - 1].onClose = () => { resume(); buildPalette(); }; };
$('#bDb').onclick = () => { paused = true; showDb(); STACK[STACK.length - 1].onClose = resume; };
$('#bMap').onclick = () => { bigMap = !bigMap; sizeMini(); };
$('#pRes').onclick = () => closeDlg('#dPause');
$('#pSet').onclick = () => showSet();
$('#pTech').onclick = () => showTech();
$('#pDb').onclick = () => showDb();
$('#pSave').onclick = () => { quit(); cloudFlush(); };
$('#pCloud').onclick = () => { saveRun(); cloudFlush('man'); };
$('#pAband').onclick = e => { const b = e.currentTarget; if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.querySelector('span').textContent = 'Biztos?'; return; } closeAll(); endGame(false); };
$('#skip').onclick = () => { if (W && W.rules.waves && W.rules.waveSending && (!SEC.win || W.wave < SEC.win)) W.nextWave(); };
function sizeMini() { if (!W) return; const c = $('#mini'), a = W.w / W.h, z = SET.ui / 100, mw = bigMap ? Math.min(innerWidth * .8, innerHeight * .8 * a) / z : 240; c.width = Math.round(mw); c.height = Math.round(mw / a); c.style.width = mw + 'px'; c.classList.toggle('big', bigMap); }
$('#mini').onclick = e => { if (!W) return; const r = e.target.getBoundingClientRect(); cam.free = { x: (e.clientX - r.left) / r.width * W.w * TS, y: (e.clientY - r.top) / r.height * W.h * TS }; if (bigMap) { bigMap = false; sizeMini(); } };
window.addEventListener('beforeunload', saveRun);
document.addEventListener('visibilitychange', () => { if (document.hidden) { saveRun(); cloudFlush(); } });

/* ---------- HUD ---------- */
let palSig = '', fpsN = 0, fpsT = 0, fpsV = 0;
function hud() {
  const w = W, wt = Math.max(0, Math.ceil(w.wtimer / 60)), en = w.enemies(), last = (SEC.win && w.wave >= SEC.win) || !w.rules.waves, timer = w.rules.waves && w.rules.waveTimer;
  const lines = [`<span class="acc">${SEC.win ? `${w.wave}/${SEC.win}` : w.wave}. hullám</span>`];
  if (en) lines.push(`<span class="lg">${en} ellenség maradt</span>`);
  if (!last && timer) lines.push(`<span class="lg">Következő hullám: ${Math.floor(wt / 60)}:${String(wt % 60).padStart(2, '0')}</span>`); else if (!en && SEC.win && w.wave >= SEC.win) lines.push('<span class="lg">Utolsó hullám</span>');
  if (w.rules.attackMode && w.ecores) lines.push(`<span class="lg">Ellenséges magok: ${w.ecores}</span>`);
  const wh = lines.join('<br>'); if ($('#wtxt').dataset.h !== wh) { $('#wtxt').innerHTML = wh; $('#wtxt').dataset.h = wh; }
  $('#skip').disabled = !!last || !w.rules.waveSending;
  if (STORY) {
    const oh = STORY.active().map(o => STORY.text(o)).filter(Boolean).map(t => `<div>${mtext(t)}</div>`).join(''); if ($('#obj').dataset.h !== oh) { $('#obj').innerHTML = oh; $('#obj').dataset.h = oh; $('#obj').hidden = !oh; }
    const an = STORY.msgs.filter(m => m.k === 'announce').pop(), to = STORY.msgs.filter(m => m.k !== 'announce').pop();
    const ah = an ? mtext(an.t) : ''; if ($('#annc').dataset.h !== ah) { $('#annc').innerHTML = ah; $('#annc').dataset.h = ah; } $('#annc').hidden = !an; if (an) $('#annc').style.opacity = Math.min(1, an.life / 30);
    const th = to ? mtext(to.t) : ''; if ($('#toast').dataset.h !== th) { $('#toast').innerHTML = th; $('#toast').dataset.h = th; } $('#toast').hidden = !to;
  } else { $('#obj').hidden = true; $('#annc').hidden = true; $('#toast').hidden = true; }
  const it = w.core.items; let ns = 0; for (const k of ITEM_IDS) if (it[k] > 0 && !S.seen['i:' + k]) { S.seen['i:' + k] = 1; ns = 1; } for (const k in w.madeL) if (!S.seen['l:' + k]) { S.seen['l:' + k] = 1; ns = 1; } if (ns) persist();
  const ih = ITEM_IDS.filter(k => it[k] > 0).map(k => `<span title="${esc(ITEMS[k].n)}">${itI(k)}${num(it[k])}</span>`).join(''); if ($('#items').dataset.h !== ih) { $('#items').innerHTML = ih; $('#items').dataset.h = ih; $('#items').hidden = !ih; }
  const mh = w.msgs.slice(-4).map(m => `<div class="np-button ${m.c}">${esc(m.t)}</div>`).join(''); if ($('#msgs').dataset.h !== mh) { $('#msgs').innerHTML = mh; $('#msgs').dataset.h = mh; }
  if (selB) selHtml();
  if (selBlock || hoverBlock) showInfo(hoverBlock || selBlock);
  if (SET.mini || bigMap) minimap($('#mini'), w, TER, cam, cv.width, cv.height);
  if (SET.fps) $('#fps').textContent = `FPS: ${fpsV}`;
  const sig = cat + selBlock + S.research.length + BUILD_ORDER[cat].map(t => done(t) && w.has(BLOCKS[t].cost) ? 1 : 0).join('');
  if (sig !== palSig) { palSig = sig; buildPalette(); }
}

/* ---------- ciklus ---------- */
function resize() { cv.width = innerWidth; cv.height = innerHeight; if (bigMap) sizeMini(); }
addEventListener('resize', resize); resize();
function control() {
  const c = W.ctl; c.ax = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0); c.ay = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
  c.mx = M.wx; c.my = M.wy; c.shoot = M.l && !selBlock;
}
const RANGE = B => B.type === 'turret' ? B.range : B.type === 'node' || B.type === 'bridge' || B.type === 'lbridge' ? B.range * TS : B.type === 'mender' || B.type === 'overdrive' || B.type === 'repair' || B.type === 'driver' ? B.range : B.type === 'shield' ? B.radius : 0;
const mplain = t => String(t || '').replace(/[-]/g, '').replace(/\[\[/g, '\u0001').replace(/\[[^\]]*\]/g, '').replace(/\u0001/g, '[').replace(/:[a-z0-9-]+:/g, '').replace(/ +/g, ' ');
function storyOverlay(gx, z) {
  const A = W.area; if (A) { gx.fillStyle = 'rgba(0,0,0,.78)'; const X0 = A.x * TS, Y0 = A.y * TS, X1 = (A.x + A.w) * TS, Y1 = (A.y + A.h) * TS, BW = W.w * TS, BH = W.h * TS; gx.fillRect(-BW, -BH, BW * 3, BH + Y0); gx.fillRect(-BW, Y1, BW * 3, BH * 2); gx.fillRect(-BW, Y0, BW + X0, Y1 - Y0); gx.fillRect(X1, Y0, BW * 2, Y1 - Y0); gx.strokeStyle = 'rgba(255,211,127,.5)'; gx.lineWidth = 2 / z; gx.strokeRect(X0, Y0, X1 - X0, Y1 - Y0); }
  if (!STORY) return;
  gx.textAlign = 'center'; gx.textBaseline = 'bottom';
  for (const m of STORY.markers()) {
    const shape = m.k === 'ShapeText' || m.k === 'Shape', r = (m.r || (m.k === 'Shape' ? 8 : 6)) * 1.2;
    if (shape) { gx.save(); gx.translate(m.x, m.y); gx.rotate((m.rot + 45) * Math.PI / 180); gx.strokeStyle = '#ffd37f'; gx.lineWidth = 1.5; gx.globalAlpha = .6 + .4 * Math.sin(T / 12); gx.strokeRect(-r / 1.41, -r / 1.41, r * 1.41, r * 1.41); gx.restore(); gx.globalAlpha = 1; }
    if (m.text && m.fs !== 0) {
      const fs = Math.max(3, 4 * (m.fs || 1)), lines = mplain(m.text).split('\n'); gx.font = `${fs}px mfont`; let y = m.y - (shape ? r + 3 : 0) - (lines.length - 1) * fs * 1.15;
      for (const l of lines) { gx.fillStyle = 'rgba(0,0,0,.7)'; gx.fillText(l, m.x + .5, y + .6); gx.fillStyle = '#fff'; gx.fillText(l, m.x, y); y += fs * 1.15; }
    }
  }
  gx.textBaseline = 'alphabetic';
}
function overlay(gx, z) {
  if (CMD.size || M.box) {   // parancsmód: kijelölt egységek, kijelölő téglalap
    for (const u of CMD) { if (u.dead || !W.units.includes(u)) { CMD.delete(u); continue; } gx.strokeStyle = 'rgba(255,211,127,.9)'; gx.lineWidth = 1.2 / z * 2; gx.beginPath(); gx.arc(u.x, u.y, u.U.r + 2.5, 0, 7); gx.stroke();
      const h = u.cmd && u.cmd.k === 'move' && u.home; if (h && Math.hypot(h.x - u.x, h.y - u.y) > 6) { gx.setLineDash([2, 2]); gx.globalAlpha = .5; gx.beginPath(); gx.moveTo(u.x, u.y); gx.lineTo(h.x, h.y); gx.stroke(); gx.setLineDash([]); gx.globalAlpha = 1; }
      const t = u.cmd && u.cmd.k === 'atk' && u.cmd.t; if (t && !t.dead) { gx.strokeStyle = 'rgba(242,85,85,.9)'; gx.beginPath(); gx.arc(t.x, t.y, t.U.r + 3, 0, 7); gx.stroke(); } }
    if (M.box && keys.has('shift')) { const [ax, ay] = M.box; gx.strokeStyle = 'rgba(255,211,127,.9)'; gx.fillStyle = 'rgba(255,211,127,.12)'; gx.lineWidth = 1.5 / z * 2; gx.fillRect(Math.min(ax, M.wx), Math.min(ay, M.wy), Math.abs(M.wx - ax), Math.abs(M.wy - ay)); gx.strokeRect(Math.min(ax, M.wx), Math.min(ay, M.wy), Math.abs(M.wx - ax), Math.abs(M.wy - ay)); }
  }
  if (LAND && W.core) { drawLanding(gx, W, Math.min(1, LAND.t / LAND.D), T + LAND.t); return; }
  storyOverlay(gx, z);
  const [tx, ty] = tileAt(M.wx, M.wy), lw = 1.5 / z, ring = (x, y, R, cross) => { gx.strokeStyle = 'rgba(255,211,127,.6)'; gx.lineWidth = lw; gx.setLineDash([3, 3]); gx.beginPath(); if (cross) { gx.rect(x - R - 4, y - 4, R * 2 + 8, 8); gx.rect(x - 4, y - R - 4, 8, R * 2 + 8); } else gx.arc(x, y, R, 0, 7); gx.stroke(); gx.setLineDash([]); };
  if (selBlock) {
    const [ox0, oy0] = originOf(selBlock, tx, ty), list = M.drag ? linePlans(selBlock, M.drag, [tx, ty]) : [{ t: selBlock, x: ox0, y: oy0, rot }];
    for (const p of list) {
      const B = BLOCKS[p.t], o = W.tb(p.x, p.y), ok = W.canPlace(p.t, p.x, p.y, p.rot || 0) || (o && o.t === p.t && B.rot && B.type !== 'turret' && o.x === p.x && o.y === p.y), s = B.s * TS;
      gx.globalAlpha = .55; drawB(gx, null, ghostOf(p), T); gx.globalAlpha = 1;
      gx.strokeStyle = ok ? '#ffd37f' : '#e55454'; gx.lineWidth = lw; gx.strokeRect(p.x * TS, p.y * TS, s, s);
      if (B.rot) { const cx = (p.x + B.s / 2) * TS, cy = (p.y + B.s / 2) * TS; gx.fillStyle = ok ? '#ffd37f' : '#e55454'; gx.save(); gx.translate(cx, cy); gx.rotate(p.rot * Math.PI / 2); gx.beginPath(); gx.moveTo(s / 2 + 2.5, 0); gx.lineTo(s / 2, -2); gx.lineTo(s / 2, 2); gx.fill(); gx.restore(); }
    }
    const B = BLOCKS[selBlock], R = RANGE(B); if (R && !M.drag) ring((ox0 + B.s / 2) * TS, (oy0 + B.s / 2) * TS, R, B.type === 'bridge' || B.type === 'lbridge');
  }
  if (M.rdrag) { const [ax, ay] = M.rdrag, x0 = Math.min(ax, tx), y0 = Math.min(ay, ty), x1 = Math.max(ax, tx) + 1, y1 = Math.max(ay, ty) + 1; gx.fillStyle = 'rgba(229,84,84,.15)'; gx.fillRect(x0 * TS, y0 * TS, (x1 - x0) * TS, (y1 - y0) * TS); gx.strokeStyle = '#e55454'; gx.lineWidth = lw; gx.strokeRect(x0 * TS, y0 * TS, (x1 - x0) * TS, (y1 - y0) * TS); }
  if (selB && !selB.dead) {
    const B = selB.B, s = B.s * TS, c = W.center(selB); gx.strokeStyle = '#ffd37f'; gx.lineWidth = 2 / z; gx.strokeRect(selB.x * TS - 1, selB.y * TS - 1, s + 2, s + 2);
    const R = RANGE(B) + (B.type === 'turret' ? W.rangeBonus(selB) : 0); if (R) ring(c.x, c.y, R, B.type === 'bridge' || B.type === 'lbridge');
    { const FT = FW.types[B.type]; if (FT && FT.overlay) FT.overlay(gx, W, selB); }
    if (B.type === 'driver' && selB.link >= 0 && W.bt[selB.link]) { const o = W.center(W.bt[selB.link]); gx.strokeStyle = 'rgba(255,211,127,.8)'; gx.lineWidth = lw; gx.beginPath(); gx.moveTo(c.x, c.y); gx.lineTo(o.x, o.y); gx.stroke(); }
  } else if (!selBlock && W.inb(tx, ty)) {
    const i = ty * W.w + tx; if (!W.tb(tx, ty) && W.seen[i] && W.player && W.mineItem(i, W.player.U.mineT, W.player.U.mineW ? 'w' : 1)) { gx.strokeStyle = 'rgba(255,255,255,.5)'; gx.lineWidth = lw; gx.strokeRect(tx * TS, ty * TS, TS, TS); }
  }
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(100, now - last); last = now; fpsN++; if (now - fpsT > 1000) { fpsV = fpsN; fpsN = 0; fpsT = now; }
  if (!W) { T++; if ($('#planet').hidden && STACK.every(d => d.id !== '#dTech')) drawMenuBg(); return; }
  control();
  if (LAND) {   // leszállás: a szimuláció áll, a kamera a magra közelít
    LAND.t += dt / (1000 / 60); const f = Math.min(1, LAND.t / LAND.D), c = W.center(W.core); cam.x = c.x; cam.y = c.y; cam.z = 1.5 + 2.5 * f ** 3; acc = 0;
    if (f > .78) for (let yy = 0; yy < W.core.B.s; yy++) for (let xx = 0; xx < W.core.B.s; xx++) if (Math.random() < .25) { const x = (W.core.x + xx + .5) * TS, y = (W.core.y + yy + .5) * TS, fl = W.fl((W.core.y + yy) * W.w + W.core.x + xx); W.fx.push({ k: 'puff', x: x + (x - c.x) * .6, y: y + (y - c.y) * .6, life: 30, max: 30, c: (fl && fl.c) || '#8a8a8a' }); }
    for (const q of W.fx) q.life--; W.fx = W.fx.filter(q => q.life > 0);
    if (f >= 1) { W.core.__land = 0; LAND = null; cam.z = 4; }
  }
  if (W.mpGuest) { guestFrame(W, W.ctl, [cam.x - cv.width / 2 / cam.z, cam.y - cv.height / 2 / cam.z, cv.width / cam.z, cv.height / cam.z]); T++; }
  else if (MP.host) hostTick(W);
  if (!paused && !LAND && !W.mpGuest) { acc += dt; let n = 0; while (acc >= 1000 / 60 && n < 4) { try { W.step(); } catch (e) { console.error(e); if (!W.errShown) { W.errShown = 1; W.msg('Játékhiba: ' + (e && e.message || e), 'bad'); } } acc -= 1000 / 60; n++; T++; } if (n === 4) acc = 0; }
  if (W.won) return endGame(true);
  if (W.lost) return endGame(false);
  const p = W.player;
  if (W.cut) { const c = W.cut; if (cam.z0 == null) cam.z0 = cam.z; cam.x += (c.x - cam.x) * .25; cam.y += (c.y - cam.y) * .25; if (c.z != null) cam.z += (1.2 + c.z * 4.8 - cam.z) * .1; }
  else if (cam.z0 != null) { cam.z = cam.z0; cam.z0 = null; }
  if (W.cut) {}
  else if (cam.free && !(W.ctl.ax || W.ctl.ay)) { cam.x += (cam.free.x - cam.x) * .15; cam.y += (cam.free.y - cam.y) * .15; }
  else { cam.free = null; if (p && !p.dead) { cam.x += (p.x - cam.x) * .2; cam.y += (p.y - cam.y) * .2; } }
  if ((W.terV || 0) !== (TER.v || 0)) { TER = makeTerrain(W); TER.v = W.terV || 0; }
  render(g, W, { cam, cw: cv.width, ch: cv.height, t: T, ter: TER, ui: overlay, nofx: !SET.fx });
  if (MP.host && W) hostSend(W);
  if (now - saveT > SET.autosave * 60000) { saveT = now; saveRun(); }
  if (T % 6 === 0 || paused) hud();
}

/* ---------- modok (ModsDialog) ---------- */
let modDirty = false, modErrs = [];
async function showMods() {
  showDlg('#dMods'); const pref = modPrefs(), list = await builtinList(); let loc = []; try { loc = await localMods(); } catch (_) {}
  const on = (key, def) => pref[key] === undefined ? def : pref[key], loaded = src => MODS.find(m => m.src === src);
  const row = (key, title, isOn, local, li) => { const m = loaded(key) || (li && { name: li.name, version: li.version, author: li.author }); return `<div class="modr np-pane"><div class="grow"><div class="nm">${esc(li ? li.name : m ? m.name : title)}${m && m.version ? ' <span class="lg">' + esc(m.version) + '</span>' : ''}</div>${m && m.author ? `<div class="lg" style="font-size:16px">${esc(m.author)}</div>` : ''}${m && m.added ? `<div class="lg" style="font-size:14px">${m.added.blocks} blokk · ${m.added.units} egység · ${m.added.items} anyag · ${m.added.liquids} folyadék${m.added.patched ? ' · ' + m.added.patched + ' módosított' : ''}${m.added.maps ? ' · ' + m.added.maps + ' pálya' : ''}</div>${m.warn.length ? `<details class="mwarn"><summary class="bad">${m.warn.length} eltérés</summary><div>${m.warn.map(esc).join('<br>')}</div></details>` : ''}` : ''}</div><button class="b np-button sm" data-k="${esc(key)}" data-on="${isOn ? 1 : 0}" style="width:150px">${isOn ? ic('cancel', 's') + 'Letiltás' : ic('ok', 's') + 'Engedélyezés'}</button>${local && m && m.src && (m.js || m.warn.some(w => /JavaScript/.test(w))) ? `<button class="b np-button sm${pref['js:' + key] ? ' on' : ''}" data-k="js:${esc(key)}" data-on="${pref['js:' + key] ? 1 : 0}" style="width:84px">${ic(pref['js:' + key] ? 'ok' : 'cancel', 's')}JS</button>` : ''}${local ? `<button class="b np-button sm" data-del="${esc(local)}" style="width:56px">${ic('trash', 's')}</button>` : ''}</div>`; };
  const fwRow = `<div class="modr np-pane fwrow"><div class="grow"><div class="nm">${esc(FW.name)} <span class="lg">${FW.version}</span></div><div class="lg" style="font-size:16px">Kohóvár</div><div class="lg" style="font-size:14px">${FW.parts.map(esc).join(' · ')}${FW.addons.length ? ' · ' + FW.addons.length + ' kiegészítő' : ''}</div></div><div class="fwon">${ic('ok', 'xs')} Mindig aktív</div></div>`;
  const jsRow = `<div class="modr np-pane fwrow"><div class="grow"><div class="nm">${esc(JS.name)} <span class="lg">${JS.version}</span></div><div class="lg" style="font-size:16px">Kohóvár</div><div class="lg" style="font-size:14px">${JS.parts.map(esc).join(' · ')}${JS.mods.length ? ' · ' + JS.mods.length + ' szkriptes mod' : ''}</div></div><div class="fwon">${ic('ok', 'xs')} Mindig aktív</div></div>`;
  $('#modList').innerHTML = fwRow + jsRow + (list.map(m => row(m.file, m.name || m.file, on(m.file, !!m.on), null, m)).join('') + loc.map(n => row('local:' + n, n, on('local:' + n, true), n)).join('')) || '<div class="lg">Nem találhatók modok.</div>';
  $('#modMsg').innerHTML = (modDirty ? '<div class="bad" style="margin:8px 0">Újratöltés szükséges</div>' : '') + modErrs.map(e => `<div class="bad">${esc(e)}</div>`).join('');
  $('#modApply').hidden = !modDirty;
}
$('#modApply').onclick = () => location.reload();
$('#modList').onclick = async e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.k) { const p = modPrefs(); p[b.dataset.k] = b.dataset.on !== '1'; setModPrefs(p); modDirty = true; showMods(); }
  if (b.dataset.del) { await deleteLocalMod(b.dataset.del); const p = modPrefs(); delete p['local:' + b.dataset.del]; setModPrefs(p); modDirty = true; showMods(); }
};
$('#modFile').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { const buf = await f.arrayBuffer(), files = await readZip(buf); if (!files.has('mod.hjson') && !files.has('mod.json')) throw new Error('nincs benne mod.hjson / mod.json'); await saveLocalMod(f.name, buf); modDirty = true; showMods(); }
  catch (err) { $('#modMsg').innerHTML = `<div class="bad">${esc(f.name)}: ${esc(err.message)}</div>`; }
};

/* ---------- indulás ---------- */
applySet(); showMenu(); requestAnimationFrame(frame);
loadAtlas().then(() => loadMods()).then(errs => {
  modErrs = errs; prepContent(); addModSectors(MOD_SECTORS, MOD_PLANETS); NODE = Object.fromEntries(TECH.map(t => [t.id, t])); TPOS = null;
  ready = true; buildMenu(); try { menuWorld(); } catch (_) { MW = null; }
  initMp({ W: () => W, SEC: () => SEC, research: () => S.research, modIds: () => MODS.map(m => m.id), mpUi: () => { renderMp(); }, startGuest, guestEnd }).then(ok => { const rid = new URLSearchParams(location.search).get('room'); if (ok && rid && !MP.on) { showMp(); joinRoomId(rid).then(renderMp); } });
  // felhőmentés (csak az Arcade-ból indítva, bejelentkezve)
  initCloud({ getS: () => S, note: (t, c) => { if (W) W.msg(t, c); else { const el = $('#cnote'); el.textContent = t; el.className = 'np-pane' + (c ? ' ' + c : ''); el.hidden = false; clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 3500); } },
    onAdmin: a => { $('#pCloud').hidden = !a; },
    applyS: S2 => { if (MP.on) return false; if (W) return false; for (const k of Object.keys(S)) delete S[k]; Object.assign(S, S2); S.seen = S.seen || {}; S.runs = S.runs || {}; S.bank = S.bank || {}; S.cap = S.cap || {}; S.free = { ...FREE_DEF, ...(S.free || {}) }; S.seed = S.seed || (Math.random() * 1e9 | 0);
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {} TPOS = null; buildMenu(); return true; } });
}, () => { $('#mcol').innerHTML = '<div class="fb bad" style="height:auto;padding:14px">A grafika betöltése nem sikerült – frissítsd az oldalt.</div>'; });
FW.blockIcon = blockIcon; FW.done = done;
window.__KV = { get W() { return W; }, secState, get NODE() { return NODE; }, get selBlock() { return selBlock; }, get rot() { return rot; }, FWT: FW.types, get selB() { return selB; }, set selB(v) { selB = v; }, S, start, SECTORS, freeSector, BL: BLOCKS, UN: UNITS, cam, retex() { TER = makeTerrain(W); }, showPlanet, showCustom, showPlay, showTech, showDb, showSet, showMods, showLoad, openPM, closeDlg, STACK };
