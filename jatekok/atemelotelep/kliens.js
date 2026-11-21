// Az Átemelőtelep – fő program: mozgás, interakció, fejezetek, hangulat (fények, eső, hangok), HUD, mentés, beállítások, mobil.
// A megjelenítést a latvany.js (Three.js) végzi, a szimulációt a jatek.js, a paneleket az ui.js.
import { createWorld, QUAL } from './latvany.js?v=202611212314';
import { createAudio } from './hang.js?v=202611212314';
import { buildLevel, move, pick, itVisible, WELL, EYE } from './palya.js?v=202611212314';
import * as PAL from './palya.js?v=202611212314';
import { freshState, step as simStep, clone, CHAPTERS, OVER, cabPow, plcRun, lightPow, supply } from './jatek.js?v=202611212314';
import * as UI from './ui.js?v=202611212314';

const $ = s => document.querySelector(s), TOUCH = matchMedia('(pointer: coarse)').matches, SAVE = 'hgws_atemelo_v1', GAME = 'atemelotelep', DEBUG = /[?&]debug\b/.test(location.search);
let SET = { sens: 1, fov: 78, vol: .8, mus: .55, sfx: 1, q: 3, res: 0, inv: 0, scary: 0, lvl: 1, wp: 1, cap: 1 };
try { SET = { ...SET, ...JSON.parse(localStorage.getItem('hgws_atemelo_set') || '{}') }; } catch (_) {}
const saveSet = () => { try { localStorage.setItem('hgws_atemelo_set', JSON.stringify(SET)); } catch (_) {} };
const L = buildLevel(), cv = $('#c');
let autoQ = TOUCH ? 0 : 1; const qWant = () => SET.q === 3 ? autoQ : SET.q;
const V = createWorld(cv, L, { q: qWant(), vignette: $('#vig') });
let S = null, P = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0 }, CP = null, playing = false, core = null, user = null, busy = false;
const RES = [0, 1, .85, .7, .5]; const applyRes = () => V && V.setRes(SET.res === 0, RES[SET.res] || 1);
if (V) applyRes();

/* ---------- üzenetek, feliratok, sáv ---------- */
const toastEl = $('#toast'); let toastT = 0;
function msg(t, ms = 3200) { toastEl.textContent = t; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), ms); }
const capEl = $('#caps'); let capT = 0;
function caption(t) { if (!SET.cap || !playing) return; capEl.textContent = '[' + t + ']'; capEl.classList.add('on'); clearTimeout(capT); capT = setTimeout(() => capEl.classList.remove('on'), 2600); }
let banner = null; const bannerOn = (a, b) => { banner = { l: 4 }; $('#bnA').textContent = a; $('#bnB').textContent = b; $('#banner').classList.add('on'); };

/* ---------- hang ---------- */
const A = createAudio(SET, caption);
const at = o => [(o.a[0] + o.b[0]) / 2, (o.a[1] + o.b[1]) / 2, (o.a[2] + o.b[2]) / 2];
const POS = { door: [-8, 1.1, -1], hatch: [6, .3, -10.6], gate: [30, 1, -22], cab: [-14.7, 1.2, -3.5], gen: [-23, 1, -19.5] };

/* ---------- beviteli eszközök ---------- */
const keys = new Set(); let locked = false, useHeld = false, holdA = null, lookV = 0;
const T = { mv: null, lk: null, run: false };
function lockPointer() { if (TOUCH || !playing) return; A.ctx(); try { const r = cv.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (_) {} }
const unlock = () => { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (_) {} };
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === cv; if (locked) { for (const s of ['pause', 'sets']) $('#' + s).hidden = true; } else if (playing && !UI.isOpen() && !busy && $('#end').hidden) pause(); });
addEventListener('keydown', e => { const k = e.code; if (k === 'Escape') { if (UI.isOpen()) { UI.close(); return; } } if (!playing || !$('#pause').hidden || !$('#sets').hidden) return;
  if (UI.isOpen()) { if (k === 'KeyE' || k === 'Tab' || k === 'KeyI') { e.preventDefault(); UI.close(); } return; }
  keys.add(k); if (k === 'KeyE' && !e.repeat) useDown(); if (k === 'KeyF' && !e.repeat) toggleFlash(); if ((k === 'Tab' || k === 'KeyI') && !e.repeat) { e.preventDefault(); openPanel('inv'); } if (k === 'KeyR' && !e.repeat) battery(); if (k === 'Space') e.preventDefault(); });
addEventListener('keyup', e => { keys.delete(e.code); if (e.code === 'KeyE') useUp(); });
addEventListener('blur', () => { keys.clear(); useUp(); });
cv.addEventListener('mousedown', () => { if (playing && !locked && !UI.isOpen() && !TOUCH) lockPointer(); });
const lookBy = (dx, dy, k) => { P.yaw -= dx * k; P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch - dy * k * (SET.inv ? -1 : 1))); lookV += Math.abs(dx) * k; };
addEventListener('mousemove', e => { if (!locked || !playing) return; lookBy(e.movementX, e.movementY, .0021 * SET.sens); });
// érintés: bal fél lebegő joystick, jobb fél nézelődés, nagy gombok
const tc = $('#tc'), joy = $('#joy'), knob = $('#knob');
tc.addEventListener('pointerdown', e => { A.ctx(); const b = e.target.closest('[data-b]'); if (b) { const k = b.dataset.b; b.classList.add('on'); if (k === 'use') useDown(); else if (k === 'flash') toggleFlash(); else if (k === 'run') { T.run = !T.run; b.classList.toggle('lit', T.run); } else if (k === 'inv') openPanel('inv'); else if (k === 'menu') pause(); e.preventDefault(); return; }
  if (e.clientX < innerWidth * .45) { if (!T.mv) { T.mv = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY }; joy.style.transform = `translate(${e.clientX - 60}px,${e.clientY - 60}px)`; joy.classList.add('on'); knob.style.transform = 'translate(0,0)'; } } else if (!T.lk) T.lk = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
tc.addEventListener('pointermove', e => { if (T.mv && T.mv.id === e.pointerId) { T.mv.x = e.clientX; T.mv.y = e.clientY; let dx = T.mv.x - T.mv.x0, dy = T.mv.y - T.mv.y0; const d = Math.hypot(dx, dy); if (d > 50) { dx *= 50 / d; dy *= 50 / d; } knob.style.transform = `translate(${dx}px,${dy}px)`; }
  if (T.lk && T.lk.id === e.pointerId) { lookBy(e.clientX - T.lk.x, e.clientY - T.lk.y, .0058 * SET.sens); T.lk.x = e.clientX; T.lk.y = e.clientY; } });
const tup = e => { const b = e.target.closest && e.target.closest('[data-b]'); if (b) { b.classList.remove('on'); if (b.dataset.b === 'use') useUp(); } if (T.mv && T.mv.id === e.pointerId) { T.mv = null; joy.classList.remove('on'); } if (T.lk && T.lk.id === e.pointerId) T.lk = null; };
tc.addEventListener('pointerup', tup); tc.addEventListener('pointercancel', tup);
function toggleFlash() { if (!S) return; if (S.bat <= 0) return msg('Lemerült az elem. (R – elemcsere, ha van tartalék.)'); S.flash = S.flash ? 0 : 1; A.sfx('click'); }
function battery() { if (!S) return; if (!S.inv.elem) return msg('Nincs tartalék elemed.'); if (S.bat > .9) return; S.inv.elem--; S.bat = 1; S.flash = 1; A.sfx('click'); msg('Elemcsere kész.'); }

/* ---------- panelek, dokumentumok ---------- */
const api = { get S() { return S; }, msg, sfx: n => A.sfx(n), read: k => read(k), check: () => check(), closed: () => { if (playing && !TOUCH) lockPointer(); if (S && S.f.pendingFinish) finish(); } };
UI.initUI(api);
function openPanel(id, arg) { unlock(); useUp(); UI.open(id, arg); }
function read(k) { S.docs[k] = 1; openPanel('doc', k); }

/* ---------- interakciók ---------- */
let target = null;
const visible = o => itVisible(o, S);
function holdSpec(id) { const W = S.well;
  if (id === 'emelo_p1') { if (!(S.lock[0] && S.mode[0] === '0')) return 'Előbb zárd ki a P1-et a szekrényben: 0 állás + személyes lakat!';
    if (W.p1up < 1 && !W.p1clean) return { t: 3, n: 'P1 kiemelése a vezetősínen', done: () => { W.p1up = 1; A.sfx('splash', [7, -4, -7]); } };
    if (W.p1up >= 1 && !W.p1clean) return { t: 3.5, n: 'Járókerék megtisztítása (rongyok, törlőkendők)', done: () => { W.p1clean = 1; S.clog[0] = 0; S.trip[0] = 0; msg('A járókerékből egy egész köteg rongy jött ki. Ez nem véletlenül került oda.'); } };
    if (W.p1up >= 1) return { t: 3, n: 'P1 visszaengedése', done: () => { W.p1up = 0; A.sfx('splash', [7, -4, -7]); } }; return null; }
  if (id === 'tank') { if (S.gen.fuel > .5) return 'A tartály tele.'; if (!S.inv.kanna) return 'Kellene egy kanna gázolaj.'; return { t: 4, n: 'Tankolás', done: () => { S.gen.fuel = .9; S.inv.kanna = 0; msg('A tartály tele – a kannát üresen visszateszed a kocsiba.'); } }; }
  if (id === 'tolozar') { if (!S.f.valveShut || S.valve >= 1) return 'A tolózár nyitva.'; if (!S.inv.tkulcs) return 'Tolózárkulcs nélkül nem lehet elforgatni – a kisbuszban van egy.'; return { t: 14, n: 'Tolózár nyitása (balra, ~40 fordulat)', prog: k => { S.valve = Math.max(S.valve, k); if (Math.random() < .05) A.sfx('valve', [52, .2, -22]); }, done: () => { S.valve = 1; check(); } }; }
  return null; }
function useDown() { if (!S || !playing || UI.isOpen() || busy) return; useHeld = true; const o = target; if (!o) return; const hs = holdSpec(o.id);
  if (hs !== null && hs !== undefined) { if (typeof hs === 'string') return msg(hs); holdA = { o, ...hs, p: 0 }; return; } act(o.id); }
function useUp() { useHeld = false; holdA = null; }
function act(id) { const W = S.well;
  switch (id) {
    case 'lanc': case 'naplo': case 'rajz': case 'lyuk': return read(id);
    case 'kartya': S.f.pendingFinish = 1; return read('kartya');
    case 'busz': case 'fiok': case 'modem': case 'antenna': case 'generator': case 'ats': return openPanel(id);
    case 'szekreny': S.f.atCont = 1; return openPanel('szekreny');
    case 'terminal': if (plcRun(S)) S.f.sawAlarms = 1; return openPanel('terminal');
    case 'ajto': S.door = S.door ? 0 : 1; A.sfx('door', POS.door); return;
    case 'fedel': case 'fedel_le': W.hatch = W.hatch ? 0 : 1; A.sfx('hatch', POS.hatch); if (W.hatch && !S.docs.akna) read('akna'); return;
    case 'letra_le': if (!W.hatch) return msg('A búvónyílás fedele zárva.'); return transition('Lemászol a létrán…', () => { W.in = 1; place(L.spots.wellIn); if (!S.f.w1) S.f.w1 = S.t; if (!(W.vent && lightPow(S))) msg('A gázérzékelő ketyeg. Szellőztetés nélkül itt gyűlik a kénhidrogén.', 4500); }, 'ladder');
    case 'letra_fel': return transition('Felmászol…', () => { W.in = 0; place(L.spots.well); check(); }, 'ladder');
    case 'vent': if (!lightPow(S)) return msg('A ventilátornak nincs tápja (szekrény, Q1).'); W.vent = W.vent ? 0 : 1; A.sfx('clunk', [10.8, .7, -5.2]); return msg(W.vent ? 'Szellőztető BE – friss levegő megy az aknába.' : 'Szellőztető KI.');
    case 'uszo': if (W.float) return msg('Az úszók szabadon lógnak.'); if (!S.inv.fogo) return msg('Az LSH1 úszót kábelkötegelővel felkötötték a korlátra. Fogó kellene hozzá.'); W.float = 1; A.sfx('click'); msg('Elvágtad a kötegelőt – az LSH1 úszó a helyére lendül.'); return check();
    case 'emelo_p2': return msg('A P2 rendben van – nem kell kiemelni.');
    case 'kanna': S.f.tookKanna = 1; S.inv.kanna = 1; A.sfx('pick'); return msg('Gázolajos kanna – tele van. Szerencse.');
    case 'keletikapu': if (!S.inv.kulcs) return msg('Zárva.'); S.eastGate = S.eastGate ? 0 : 1; A.sfx('door', POS.gate); return;
  } }
function transition(text, fn, snd) { busy = true; useUp(); const f = $('#fade'); f.textContent = text; f.classList.add('on'); if (snd) { A.sfx(snd); setTimeout(() => A.sfx(snd), 300); }
  setTimeout(() => { fn(); setTimeout(() => { f.classList.remove('on'); busy = false; }, 350); }, 650); }
function place(sp) { P.x = sp[0]; P.y = sp[1]; P.z = sp[2]; P.yaw = sp[3]; P.pitch = 0; P.vx = P.vy = P.vz = 0; }

/* ---------- fejezetek, célok, események ---------- */
const wiresOK = s => s.wires.W102 === 2 && s.wires.W104 === 4 && s.wires.W105 === 5 && s.wires.W106 === 6 && s.wires.WX === 7;
function objectives() { const s = S, W = s.well, o = [], t = (ok, x) => o.push((ok ? '✓ ' : '') + x);
  if (s.ch === 1) { t(s.f.atCont, 'Nézz körül, és juss el a vezérlőkonténerig.'); t(plcRun(s), 'Állítsd helyre a tápellátást a kapcsolószekrényben (+S1).'); }
  else if (s.ch === 2) { t(s.f.sawAlarms, 'Nézd meg a PLC hibalistáját a terminálon.'); t(wiresOK(s), 'Kösd vissza az elvágott jelvezetékeket (X1) a kapcsolási rajz alapján.'); }
  else if (s.ch === 3) { t(W.vent && lightPow(s), 'Kapcsold be az akna szellőztetését.'); t(s.lock[0] || W.p1clean, 'Zárd ki a P1 szivattyút (0 állás + személyes lakat).'); t(W.float, 'Szabadítsd ki a beragadt úszókapcsolót.'); t(W.p1clean, 'Emeld ki és tisztítsd meg a P1-et.'); t(W.p1clean && W.p1up === 0 && !s.lock[0] && !W.in, 'Engedd vissza a P1-et, vedd le a lakatot, és gyere fel.'); }
  else if (s.ch === 4) { t(s.progOK, 'Javítsd ki a szintszabályozó programot (terminál → Program).'); t(s.progOK && s.mode[0] === 'A' && s.mode[1] === 'A', 'Állítsd mindkét szivattyút AUTO üzemmódba.'); t(0, 'Figyeld, ahogy az automatika leviszi a szintet 2,2 m alá.'); }
  else if (s.ch === 5) { if (s.mains) t(0, 'Figyeld a telepet – a vihar erősödik.'); else { t(supply(s), 'Áramszünet! Indítsd el az aggregátort, és kapcsold át a telepet.'); t(s.modem.online, 'Állítsd helyre a kommunikációt (VPN-modem).'); t(s.valve >= 1, 'Nyisd ki a tolózárat a gazdasági ágon – keleti kapu, sárga jelzőoszlopok!'); } }
  else t(0, 'Hajnalodik. Nézd meg, mit hagytak a tolózárnál.');
  return o; }
// a célpontjelölő: merre van a következő teendő
function goal() { const s = S, W = s.well, G = s.gen;
  if (s.ch === 1) return s.f.atCont ? [-14.7, 1.3, -3.4] : [-8, 1.3, -1];
  if (s.ch === 2) return s.f.sawAlarms ? [-14.7, 1.3, -3.4] : [-11, 1.1, 1.3];
  if (s.ch === 3) { if (W.in) return !W.float ? [4.8, -1.2, -9.6] : !W.p1clean || W.p1up ? [7, -1.2, -9.8] : [6, -1, -11.4];
    if (!(W.vent && lightPow(s))) return lightPow(s) ? [10.8, 1, -5.2] : [-14.7, 1.3, -3.4]; if (!s.lock[0] && !W.p1clean) return [-14.7, 1.3, -3.4];
    if (W.p1clean && s.lock[0]) return [-14.7, 1.3, -3.4]; return [6, .4, -10.6]; }
  if (s.ch === 4) return s.progOK && s.mode[0] === 'A' && s.mode[1] === 'A' ? null : s.progOK ? [-14.7, 1.3, -3.4] : [-11, 1.1, 1.3];
  if (s.ch === 5) { if (s.mains) return null; if (!supply(s)) { if (G.fuel < .2) return s.inv.kanna ? [-23, .9, -16.8] : !s.f.tookKanna ? [-6.3, .5, 3.7] : null; return G.run && G.warm >= 1 ? [-17.5, 1.5, -18.9] : [-20, 1.2, -19.7]; }
    if (!s.modem.online && !s.f.sms) return !s.modem.pwr ? [-13.1, 1.6, -3.7] : !s.modem.ant ? [-17, .8, -5.1] : null; return [52, .4, -22]; }
  return [52, .4, -22]; }
function setCh(n) { const s = S; if (!s.done.includes(s.ch)) s.done.push(s.ch); s.ch = n; bannerOn(n <= 5 ? n + '. fejezet' : 'Epilógus', CHAPTERS[n - 1]);
  if (n === 5) { s.qin = .006; s.f.valveShut = 1; s.valve = 0; s.f.cutAt = s.t + 14; }
  if (n === 6) { s.qin = .0015; s.f.dawn = s.t; }
  checkpoint(); cloudSave(); }
function check() { if (!S || !playing) return; const s = S, W = s.well;
  if (s.ch === 1 && plcRun(s)) { setCh(2); msg('A PLC elindult. A terminál életre kel.'); }
  else if (s.ch === 2 && wiresOK(s) && plcRun(s)) { s.wiredOK = 1; setCh(3); if (!SET.scary) { s.door = 0; A.sfx('slam', POS.door); setTimeout(() => msg('…a konténer ajtaja magától becsapódott.'), 600); } }
  else if (s.ch === 3 && W.float && W.p1clean && W.p1up === 0 && !s.lock[0] && !W.in) { setCh(4); msg('A hibalista szerint a program paramétereit is átírták.'); }
  else if (s.ch === 4 && s.progOK && s.mode[0] === 'A' && s.mode[1] === 'A' && !s.f.ch4ok) { s.f.ch4ok = s.t; }
  else if (s.ch === 5 && s.valve >= 1) { setCh(6); msg('A nyomás leesett, a szivattyúk szállítanak. A szint csökken.'); }
  UI.refresh(); }
function events(dt) { const s = S;
  if (s.ch === 1 && !s.f.atCont && !s.well.in && P.x > PAL.CONT.x0 && P.x < PAL.CONT.x1 && P.z > PAL.CONT.z0 && P.z < PAL.CONT.z1) s.f.atCont = 1;   // beléptél a konténerbe
  if (s.ch === 4 && s.f.ch4ok && s.t - s.f.ch4ok > 10 && s.lvl < 2.2) setCh(5);
  if (s.ch === 5 && s.mains && s.t >= s.f.cutAt) { s.mains = 0; lightning(1); A.sfx('zap', [-17, 3, -12]); msg('Áramszünet! A villám a betáplálást is elvitte.', 4500); if (!SET.scary) s.f.figure = { x: -24, z: -14, t: 3.5 }; }
  if (s.ch === 5 && !s.mains && supply(s) && !s.f.genOK) { s.f.genOK = 1; checkpoint(); msg('A telep generátorról üzemel.'); }
  if (s.ch === 3 && s.f.w1 && s.t - s.f.w1 > 25 && !s.f.s3 && s.well.in) { s.f.s3 = 1; s.cab.q[0] = 0; s.f.note1 = 1; A.sfx('relay', POS.cab); msg('A lámpa kialudt. A szellőztető is leállt.', 4000); if (!SET.scary) { setTimeout(() => A.sfx('far', [6, 1, -14]), 1200); setTimeout(() => A.sfx('hatch', POS.hatch), 3500); setTimeout(() => msg('Odafent valaki jár.'), 3600); } }
  if (s.ch === 4 && !s.f.s4 && !SET.scary && s.progOK) { s.f.s4 = 1; s.f.figure = { x: -29.2, z: -10, t: 4 }; }
  if (s.ch === 1 && !s.f.s1 && !SET.scary && Math.hypot(P.x + 10, P.z) < 9) { s.f.s1 = 1; A.sfx('far', [-24, 1, -12]); setTimeout(() => A.sfx('slam', [-28, 1, -10]), 1600); }
  if (s.f.figure) { s.f.figure.t -= dt; if (s.f.figure.t <= 0) s.f.figure = null; } }
function simEv(e, i) { const s = S;
  if (e === 'overflow') fail('A medence túlcsordult. A szennyvíz a falu felé indult…');
  else if (e === 'faint') fail('Elszédültél a kénhidrogéntől – az utolsó erőddel kimásztál. A friss levegőn magadhoz térsz… de a munka elölről kezdődik.');
  else if (e === 'trip_clog') msg(`P${i + 1}: a motorvédő leoldott – túláram. Valami eltömíti a járókereket.`);
  else if (e === 'trip_dry') msg(`P${i + 1}: szárazfutás! A motorvédő leoldott. (Szekrény → Szivattyúk → visszaállítás)`, 4500);
  else if (e === 'trip_press') { if (!s.f.pressSeen) { s.f.pressSeen = 1; msg('Nyomásvédelem: a nyomóvezetéken 6 bar fölé ment a nyomás – a szivattyúk leálltak.', 4500); } }
  else if (e === 'online') { s.f.sms = 1; A.sfx('beep'); caption('SMS érkezett'); setTimeout(() => read('sms'), 500); }
  else if (e === 'gen_stop') msg('Az aggregát leállt.'); }
function fail(t) { if (busy) return; busy = true; useUp(); UI.isOpen() && UI.close(); const f = $('#fade'); f.textContent = t; f.classList.add('on'); setTimeout(() => { loadCp(true); setTimeout(() => { f.classList.remove('on'); busy = false; }, 600); }, 3200); }

/* ---------- mentés: fejezetenkénti ellenőrzőpont, frissítés után innen folytatódik ---------- */
function checkpoint() { const c = clone(S); c.lvl = Math.min(c.lvl, 2.6); c.f.overNow = 0; c.well.h2s = Math.min(c.well.h2s, 3); CP = { S: c, P: { x: P.x, y: P.y, z: P.z, yaw: P.yaw } }; persist(); }
function persist() { try { const o = local(); o.cp = CP; localStorage.setItem(SAVE, JSON.stringify(o)); } catch (_) {} }
function loadCp(keep) { if (!CP) return; const t = S ? S.t : 0, st = S ? S.stats : null; S = clone(CP.S); if (keep && st) { S.t = t; S.stats = st; } P = { x: CP.P.x, y: CP.P.y, z: CP.P.z, vx: 0, vy: 0, vz: 0, yaw: CP.P.yaw, pitch: 0 }; }
const local = () => { try { return JSON.parse(localStorage.getItem(SAVE) || '{}'); } catch (_) { return {}; } };
// az állás a fejezetek között is: frissítés előtt / bezáráskor elmentjük a mostani helyzetet (a fejezet ellenőrzőpontja mellé)
addEventListener('pagehide', () => { if (playing && S && CP) { const o = local(); o.cp = { S: { ...clone(CP.S), t: S.t, stats: S.stats }, P: CP.P }; try { localStorage.setItem(SAVE, JSON.stringify(o)); } catch (_) {} } });
async function cloudSave(fin) { if (!core || !user) return; try { const o = local(), st = JSON.stringify(CP); if (st.length > 11000) return;
  await core.FB.setDoc(core.FB.doc(core.db, 'gamesaves', user.uid), { atemelo: { ch: S.ch, t: Math.round(S.t), done: S.done.slice(0, 6), best: Math.round(o.best || 0), nospill: fin && !S.stats.over ? 1 : (o.nospill || 0), nogas: fin && !S.stats.gas ? 1 : (o.nogas || 0), st }, updatedAt: core.FB.serverTimestamp() }); } catch (e) { console.info('mentés', e); } }
async function cloudLoad() { if (!core || !user) return; try { const d = await core.FB.getDoc(core.FB.doc(core.db, 'gamesaves', user.uid)); const a = d.exists() && d.data().atemelo; if (!a) return; const o = local();
  if (a.best && (!o.best || a.best < o.best)) o.best = a.best; if (a.nospill) o.nospill = 1; if (a.nogas) o.nogas = 1; const cp = JSON.parse(a.st || 'null'); if (cp && (!o.cp || cp.S.t > o.cp.S.t)) o.cp = cp; localStorage.setItem(SAVE, JSON.stringify(o)); if (!playing) menu(); } catch (e) { console.info(e); } }

/* ---------- menük ---------- */
const fmt = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
function menu() { const o = local(); playing = false; $('#tc').hidden = true; $('#hud').hidden = true; for (const s of ['pause', 'sets', 'end']) $('#' + s).hidden = true; $('#menu').hidden = false; unlock();
  $('#mCont').hidden = !(o.cp && o.cp.S && o.cp.S.ch < 7); if (o.cp && o.cp.S) $('#mCont').textContent = 'Folytatás – ' + (o.cp.S.ch <= 5 ? o.cp.S.ch + '. fejezet: ' : '') + CHAPTERS[o.cp.S.ch - 1];
  $('#mBest').textContent = o.best ? 'Legjobb idő: ' + fmt(o.best) : ''; if (!V) { $('#mSt').textContent = 'A böngésződ nem támogatja a WebGL-t, ezért a játék nem indítható.'; $('#mNew').disabled = $('#mCont').disabled = true; } }
let tipsAt = -1;
function start(fresh) { A.ctx(); if (fresh) { S = freshState(); place(L.spots.start); checkpoint(); } else { CP = local().cp; loadCp(false); }
  playing = true; $('#menu').hidden = true; $('#end').hidden = true; $('#hud').hidden = false; $('#tc').hidden = !TOUCH; lockPointer(); hudCache = {};
  if (fresh) { tipsAt = 0; const f = $('#fade'); busy = true; f.innerHTML = '<div><b style="font:900 24px Cinzel,serif;color:#e8b656">03:02 – Riasztás</b><br><br>Az Átemelő 3. kiesett a SCADA-ról. A medence szintje emelkedik.<br>Ha reggelig túlcsordul, a lenti falu utcáit elönti a szennyvíz.<br><br>Ügyeletes: te.</div>'; f.classList.add('on'); setTimeout(() => { f.classList.remove('on'); busy = false; bannerOn('1. fejezet', CHAPTERS[0]); }, 5200); }
  else { tipsAt = -1; bannerOn(S.ch <= 5 ? S.ch + '. fejezet' : 'Epilógus', CHAPTERS[S.ch - 1]); } }
function pause() { if (!playing) return; useUp(); keys.clear(); $('#pause').hidden = false; $('#pSub').textContent = (S.ch <= 5 ? S.ch + '. fejezet · ' : '') + CHAPTERS[S.ch - 1] + ' · eltelt idő: ' + fmt(S.t); unlock(); }
$('#mNew').onclick = () => { if (local().cp && local().cp.S && local().cp.S.ch < 7 && !$('#mNew').dataset.sure) { $('#mNew').dataset.sure = 1; $('#mNew').textContent = 'Biztos? A mentés elvész'; return; } delete $('#mNew').dataset.sure; $('#mNew').textContent = 'Új játék'; start(true); };
$('#mCont').onclick = () => start(false);
$('#pRes').onclick = () => { $('#pause').hidden = true; lockPointer(); }; $('#pInv').onclick = () => { $('#pause').hidden = true; openPanel('inv'); };
$('#pCp').onclick = () => { $('#pause').hidden = true; loadCp(true); lockPointer(); }; $('#pMenu').onclick = () => { checkpoint(); menu(); };
let setFrom = 'menu';
const SETS = [['sQ', 'q'], ['sRes', 'res'], ['sInv', 'inv'], ['sScary', 'scary'], ['sLvl', 'lvl'], ['sWp', 'wp'], ['sCap', 'cap']], SLID = [['sSens', 'sens', v => (+v).toFixed(2)], ['sFov', 'fov', v => v + '°'], ['sVol', 'vol', v => Math.round(v * 100) + '%'], ['sMus', 'mus', v => Math.round(v * 100) + '%'], ['sSfx', 'sfx', v => Math.round(v * 100) + '%']];
function openSets(from) { setFrom = from; for (const s of ['menu', 'pause']) $('#' + s).hidden = true; $('#sets').hidden = false;
  for (const [id, k, f] of SLID) { const el = $('#' + id), out = el.parentElement.querySelector('span'); el.value = SET[k]; out.textContent = f(SET[k]); el.oninput = () => { SET[k] = +el.value; out.textContent = f(SET[k]); saveSet(); A.vol(); }; }
  for (const [id, k] of SETS) { const el = $('#' + id); el.value = SET[k]; el.onchange = () => { SET[k] = +el.value; saveSet(); if (k === 'q') { autoTry = 0; V && V.setQuality(qWant()); } if (k === 'res') applyRes(); }; } }
$('#mSet').onclick = () => openSets('menu'); $('#pSet').onclick = () => openSets('pause'); $('#sOk').onclick = () => { $('#sets').hidden = true; $('#' + setFrom).hidden = false; };
$('#eNew').onclick = () => start(true); $('#eMenu').onclick = () => menu();
function finish() { const s = S, o = local(), t = Math.round(s.t), nb = !o.best || t < o.best; S.f.pendingFinish = 0; S.done = [1, 2, 3, 4, 5]; playing = false; unlock(); $('#tc').hidden = true; $('#hud').hidden = true;
  o.best = nb ? t : o.best; if (!s.stats.over) o.nospill = 1; if (!s.stats.gas) o.nogas = 1; o.cp = null; localStorage.setItem(SAVE, JSON.stringify(o)); CP = { S: clone(s), P: { ...P } }; CP.S.ch = 7; cloudSave(true);
  try { if (window.top !== window) parent.postMessage({ hgws: 'score', game: GAME, score: 1e6 - t }, location.origin); } catch (_) {}
  const ov = s.stats.over || 0, gs = s.stats.gas || 0;
  const b = [['Éjszakai ügyeletes', 'Végigvitted az összes fejezetet', 1], ['Egy csepp se folyt ki', 'Túlcsordulás nélkül', !ov], ['Gázmester', 'Egyszer sem szólt a gázriasztás (A2)', !gs], ['Fél óra alatt', 'A teljes játék 30 perc alatt', t <= 1800]];
  $('#eBody').innerHTML = `<div class="stats"><div><small>Idő</small><b>${fmt(t)}</b>${nb ? '<em>új legjobb!</em>' : `<em>legjobb: ${fmt(o.best)}</em>`}</div><div><small>Túlcsordulás</small><b>${ov}</b><em>${ov ? 'a falu megúszta… majdnem' : 'egy csepp sem'}</em></div><div><small>Gázbelégzés (A2)</small><b>${gs}</b><em>${gs ? 'legközelebb szellőztess' : 'tiszta tüdő'}</em></div></div>
    <p class="mut">A diszpécserközpont visszaigazolta: a telep él, a szivattyúk szállítanak, a szint csökken. A falu reggel semmit sem vett észre.</p><div class="grid2" style="margin-top:10px">${b.map(([n, d, ok]) => `<div class="itm${ok ? ' got' : ''}"><i class="ic ic-${ok ? 'award' : 'lock'}"></i><div><b>${n}</b><br><small class="mut">${d}</small></div></div>`).join('')}</div>`;
  $('#end').hidden = false; }

/* ---------- fények, villám ---------- */
let flash = 0, nextL = 6;
function lightning(force) { flash = force ? 1.3 : 1; setTimeout(() => A.sfx('thunder'), 300 + Math.random() * 900); }
const indoor = (x, z) => L.indoor.some(q => x > q[0] && x < q[2] && z > q[1] && z < q[3]);

/* ---------- HUD (DOM; csak változáskor írjuk) ---------- */
let hudCache = {};
const setTxt = (k, el, v) => { if (hudCache[k] !== v) { hudCache[k] = v; el.textContent = v; } };
const setHtml = (k, el, v) => { if (hudCache[k] !== v) { hudCache[k] = v; el.innerHTML = v; } };
const setCls = (k, el, c, on) => { const kk = k + c; if (hudCache[kk] !== on) { hudCache[kk] = on; el.classList.toggle(c, on); } };
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const E = {}; for (const id of ['obj', 'objH', 'objL', 'lvlBox', 'lvlV', 'lvlBar', 'gasBox', 'gasV', 'gasH', 'bat', 'prompt', 'ring', 'ringC', 'holdN', 'cross', 'banner', 'tips', 'wp', 'hurt', 'flashL', 'dbg']) E[id] = $('#' + id);
const TIPS = TOUCH ? [['move', 'Bal hüvelykujj – mozgás · jobb – nézelődés'], ['hand', 'HASZNÁL – tárgyak, ajtók, panelek'], ['flashlight', 'LÁMPA – zseblámpa ki/be'], ['briefcase', 'TÁSKA – leltár és dokumentumok']]
  : [['move', 'W A S D – mozgás · egér – nézelődés · Shift – futás'], ['hand', 'E – használat (nyomva tartva: hosszabb műveletek)'], ['flashlight', 'F – zseblámpa · R – elemcsere'], ['briefcase', 'Tab – leltár és dokumentumok · Esc – szünet']];
const wpv = [0, 0, 0]; let wpT = 0, wpGoal = null;
let hudSlow = 0;
function hud(now, dt) { if (!playing || !S) return; const s = S;
  if ((hudSlow -= dt) <= 0) { hudSlow = .2; hudText(s); }
  hudFast(s, dt); }
function hudText(s) {
  const ob = objectives(); setTxt('objH', E.objH, (s.ch <= 5 ? s.ch + '. fejezet · ' : 'Epilógus · ') + CHAPTERS[s.ch - 1]);
  setHtml('objL', E.objL, ob.map(o => o.startsWith('✓') ? `<li class="ok"><i class="ic ic-circle-check"></i>${esc(o.slice(2))}</li>` : `<li><i class="ic ic-circle"></i>${esc(o)}</li>`).join(''));
  E.lvlBox.hidden = !SET.lvl; if (SET.lvl) { const rising = s.qin > .0095 * ((s.run[0] || 0) + (s.run[1] || 0)); setTxt('lvlV', E.lvlV, s.lvl.toFixed(2).replace('.', ',') + ' m ' + (rising ? '▲' : '▼'));
    const k = Math.round(Math.min(1, s.lvl / 4) * 200) / 2; if (hudCache.lvlK !== k) { hudCache.lvlK = k; E.lvlBar.style.width = k + '%'; } setCls('lvl', E.lvlBox, 'warn', s.lvl > 3.0); setCls('lvl', E.lvlBox, 'mid', s.lvl > 2.5 && s.lvl <= 3); }
  const g = s.well.h2s, gOn = s.well.in || g > .5; E.gasBox.hidden = !gOn; if (gOn) { setTxt('gasV', E.gasV, g.toFixed(1).replace('.', ',') + ' ppm'); setTxt('gasH', E.gasH, g >= 10 ? 'H₂S · A2 RIASZTÁS' : g >= 5 ? 'H₂S · A1' : 'H₂S'); setCls('gas', E.gasBox, 'warn', g >= 10); setCls('gas', E.gasBox, 'mid', g >= 5 && g < 10); }
  const bt = s.bat < .3 ? 'Zseblámpa elem: ' + Math.round(s.bat * 100) + '%' + (s.inv.elem ? (TOUCH ? '  (TÁSKA – csere)' : '  (R – csere)') : '') : ''; setTxt('bat', E.bat, bt); setCls('bat', E.bat, 'warn', s.bat < .1);
}
function hudFast(s, dt) {
  const pr = target && !holdA ? target.label : ''; if (hudCache.pr !== pr) { hudCache.pr = pr; E.prompt.innerHTML = pr ? `<kbd>${TOUCH ? 'HASZNÁL' : 'E'}</kbd>${esc(pr)}` : ''; E.prompt.classList.toggle('on', !!pr); }
  setCls('cross', E.cross, 'on', !!target);
  E.ring.hidden = !holdA; if (holdA) { E.ringC.style.strokeDashoffset = String(138.2 * (1 - Math.min(1, holdA.p))); setTxt('holdN', E.holdN, holdA.n); }
  if (banner && (banner.l -= dt) <= 0) { banner = null; E.banner.classList.remove('on'); }
  // tippek az első percben
  if (tipsAt >= 0 && !busy) { tipsAt += dt; const i = Math.floor(tipsAt / 6.5); if (i >= TIPS.length) { tipsAt = -1; E.tips.classList.remove('on'); } else { setHtml('tip', E.tips, `<i class="ic ic-${TIPS[i][0]}"></i>${TIPS[i][1]}`); E.tips.classList.toggle('on', tipsAt % 6.5 < 5.8); } }
  // célpontjelölő: halvány ikon a következő teendő irányában (a képernyő szélén, ha nem látszik)
  if ((wpT -= dt) <= 0) { wpT = .25; wpGoal = SET.wp && !UI.isOpen() ? goal() : null; } const gp = wpGoal; if (!gp || (s.well.in ? gp[1] > -.5 : gp[1] < -.5)) { if (!hudCache.wpOff) { hudCache.wpOff = 1; E.wp.hidden = true; } }
  else { hudCache.wpOff = 0; E.wp.hidden = false; V.project(gp[0], gp[1], gp[2], wpv); const W = innerWidth, H = innerHeight; let x = wpv[0], y = wpv[1]; const behind = !wpv[2], dist = Math.hypot(gp[0] - P.x, gp[2] - P.z);
    if (behind) { x = W - x; y = H - 28; } const m = 34, clamped = behind || x < m || x > W - m || y < m || y > H - m; x = Math.max(m, Math.min(W - m, x)); y = Math.max(m + 60, Math.min(H - m - 70, y));
    E.wp.style.transform = `translate(${x | 0}px,${y | 0}px)`; E.wp.style.opacity = dist < 2.2 ? '0' : clamped ? '.55' : '.8'; setTxt('wpd', E.wp.lastChild, dist >= 2.2 ? Math.round(dist) + ' m' : ''); }
  const hurtA = s.well.h2s >= 15 ? Math.min(.45, (s.well.faintT || 0) / 30) : 0; E.hurt.style.opacity = hurtA.toFixed(2);
  E.flashL.style.opacity = flash > .3 ? ((flash - .3) * .25).toFixed(3) : '0'; }

/* ---------- mérés: ?debug ---------- */
const FT = new Float32Array(120); let fti = 0, dbgT = 0;
function debug(dt) { FT[fti] = dt * 1000; fti = (fti + 1) % FT.length; if ((dbgT -= dt) > 0) return; dbgT = .25; const a = Array.from(FT).filter(Boolean).sort((x, y) => x - y), avg = a.reduce((x, y) => x + y, 0) / (a.length || 1), inf = V.info();
  E.dbg.textContent = `${(1000 / avg).toFixed(1)} FPS · ${avg.toFixed(1)} ms (p95 ${a[Math.floor(a.length * .95)]?.toFixed(1)}, max ${a[a.length - 1]?.toFixed(1)})\nrajzhívás ${inf.calls} · háromszög ${inf.tris} · geometria ${inf.geos} · textúra ${inf.tex}\nminőség ${QUAL[V.quality].name}${SET.q === 3 ? ' (auto)' : ''} · felbontás ${Math.round(V.resScale * 100)}% · pixelarány ${V.pixelRatio.toFixed(2)}${performance.memory ? ' · heap ' + (performance.memory.usedJSHeapSize / 1048576).toFixed(1) + ' MB' : ''}`;
  window.__perf = { fps: 1000 / avg, avg, p95: a[Math.floor(a.length * .95)], max: a[a.length - 1], ...inf, q: V.quality, res: V.resScale }; }
// automatikus minőség: ha a felbontás-skálázás már a minimumon van és még mindig lassú, egy szinttel lejjebb; egyszer megpróbál feljebb lépni
let autoAcc = 0, autoN = 0, autoT = 0, autoTry = 0;
function autoQual(dt) { if (SET.q !== 3 || !playing) return; autoAcc += dt; autoN++; if ((autoT += dt) < 3) return; const avg = autoAcc / autoN * 1000; autoAcc = autoN = autoT = 0;
  if (avg > 24 && V.resScale <= .55 && autoQ > 0) { autoQ--; V.setQuality(autoQ); autoTry = 2; }
  else if (avg < 17.3 && V.resScale >= 1 && autoQ < 2 && !autoTry && S && S.t > 25) { autoQ++; autoTry = 1; V.setQuality(autoQ); } }

/* ---------- fő ciklus ---------- */
const F = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, fov: 1.3, t: 0, dt: 0, S: null, dawn: 0, flash: 0, torch: 0, detector: 0, gas: 0, lightPow: 0, cabPow: 0, plcRun: 0, rain: 1, wind: .6, bobX: 0, bobY: 0, swayP: 0, swayY: 0, hurt: 0 };
const menuS = freshState(); menuS.cab.q0 = 1; menuS.cab.q[0] = 1; menuS.cab.fuse = [1, 1, 1]; menuS.well.hatch = 0;
const DIR = [0, 0, -1];
let last = performance.now(), stepAcc = 0, footD = 0, gasT = 0, dripT = 0, swY = 0, swP = 0, prevYaw = 0;
function frame(now) { requestAnimationFrame(frame); const real = now - last, rdt = Math.min(.1, real / 1000); last = now; if (!V) return; V.dynRes(real); if (DEBUG) debug(real / 1000); const ts = window.__ts || 1, dt = rdt * ts;
  if (!S) { const t = now / 1000; F.x = Math.sin(t * .05) * 4; F.y = 2.2; F.z = 30; F.yaw = Math.sin(t * .07) * .35; F.pitch = -.06; F.roll = 0; F.fov = 62; F.t = t; F.dt = rdt; F.S = menuS; F.dawn = 0; F.flash = flash; F.torch = 0; F.detector = 0; F.lightPow = 1; F.cabPow = 1; F.plcRun = 0; F.rain = 1; F.wind = .7; F.hurt = 0;
    flash = Math.max(0, flash - rdt * 3); if ((nextL -= rdt) <= 0) { nextL = 9 + Math.random() * 12; flash = 1; } V.frame(F); return; }
  const active = playing && $('#pause').hidden && $('#sets').hidden && !busy;
  if (active) { autoQual(rdt);
    stepAcc += dt; let guard = 0; while (stepAcc >= .1 && guard++ < 40) { stepAcc -= .1; simStep(S, .1, simEv); events(.1); } if (Math.floor(S.t * 2) !== Math.floor((S.t - dt) * 2)) check();
    if (!UI.isOpen()) { let mx = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0), my = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      if (T.mv) { const dx = T.mv.x - T.mv.x0, dy = T.mv.y - T.mv.y0, d = Math.hypot(dx, dy), k = Math.min(1, d / 50); if (d > 6) { mx = -dy / d * k; my = dx / d * k; } }
      if (window.__drive) { const d = window.__drive(P, S); mx = d.mx; my = d.my; }
      L.boxes[L.doorCol].off = !!S.door; L.boxes[L.gateCol].off = !!S.eastGate; const ox = P.x, oz = P.z, run = keys.has('ShiftLeft') || keys.has('ShiftRight') || T.run; for (let i = 0; i < 3; i++) move(L, P, mx, my, run, rdt / 3);
      const st = Math.hypot(P.x - ox, P.z - oz); footD += st; if (footD > (run ? 1.1 : .8)) { footD = 0; A.sfx(S.well.in ? 'stepM' : indoor(P.x, P.z) ? 'step' : 'stepG'); } }
    // célzott tárgy, tartott műveletek
    const cp = Math.cos(P.pitch); DIR[0] = -Math.sin(P.yaw) * cp; DIR[1] = Math.sin(P.pitch); DIR[2] = -Math.cos(P.yaw) * cp; target = UI.isOpen() || busy ? null : pick(L, P.x, P.y + EYE, P.z, DIR, 2.3, visible);
    if (holdA) { if (!useHeld || target !== holdA.o) holdA = null; else { holdA.p += dt / holdA.t; if (holdA.prog) holdA.prog(Math.min(1, holdA.p)); if (holdA.p >= 1) { const h0 = holdA; holdA = null; h0.done(); check(); } } }
    const g = S.well.h2s; if (g >= 5) { gasT -= rdt; if (gasT <= 0) { gasT = g >= 10 ? .45 : 1.5; A.sfx(g >= 10 ? 'gas2' : 'gas1'); } }
    if (S.well.in && (dripT -= rdt) <= 0) { dripT = .3 + Math.random() * 1.4; A.sfx('drip', [4.5 + Math.random() * 7, -1, -11.5 + Math.random() * 7]); }
    if (S.ch < 6 && (nextL -= rdt) <= 0) { nextL = (S.ch === 5 ? 7 : 16) + Math.random() * 14; if (!S.well.in) lightning(); } }
  flash = Math.max(0, flash - rdt * 3);
  // hangok: környezet, gépek (térben), zene
  const s = S, out = !s.well.in && !indoor(P.x, P.z), stormK = s.ch === 5 ? 1 : s.ch === 6 ? .1 : .55, dawnK = s.ch === 6 ? Math.max(0, 1 - (s.t - s.f.dawn) / 20) : 1, pumpOn = (s.run[0] || s.run[1]) ? 1 : 0;
  A.listen(P.x, P.y + EYE, P.z, P.yaw);
  A.set('rain', active ? (out ? .2 : s.well.in ? .015 : .07) * stormK * dawnK : 0); A.set('rainLow', active ? (out ? .1 : .05) * stormK * dawnK : 0); A.set('wind', active && !s.well.in ? (out ? .14 : .04) * stormK : 0);
  A.set('pump', active ? pumpOn * .35 : 0); A.set('pump2', active ? pumpOn * .05 : 0); A.set('hum', active && lightPow(s) && s.cab.q[0] ? .07 : 0); A.set('gen', active && s.gen.run ? .45 : 0); A.set('genN', active && s.gen.run ? .12 : 0);
  A.set('siren', active && (s.alarm || s.lvl > 3.2) && cabPow(s) ? .07 : 0, .05); A.set('fan', active && s.well.vent && lightPow(s) ? .06 : 0);
  if (active) A.music(s.ch === 5 ? 1 : s.lvl > 3 ? .8 : s.ch === 6 ? 0 : .3); else A.set('music', 0, .8);
  // kamera, kéz
  const moving = Math.hypot(P.vx, P.vz), bob = moving > .3 ? Math.sin(footD * 7.85) : 0, dYaw = P.yaw - prevYaw; prevYaw = P.yaw; swY += (Math.max(-.08, Math.min(.08, dYaw * 2)) - swY) * Math.min(1, rdt * 8); swP += ((P.vy ? .02 : 0) - swP) * Math.min(1, rdt * 6);
  const dawn = s.ch === 6 ? Math.min(1, (s.t - s.f.dawn) / 40) : 0; V.setDawn(dawn);
  const bat = s.bat, fk = bat < .2 ? (Math.random() < .15 ? .2 : 1) * (.4 + bat * 3) : 1;
  F.x = P.x; F.y = P.y + EYE + Math.abs(bob) * .035 * Math.min(1, moving / 2.6); F.z = P.z; F.yaw = P.yaw; F.pitch = P.pitch; F.roll = bob * .006; F.fov = SET.fov; F.t = now / 1000; F.dt = rdt; F.S = s; F.dawn = dawn; F.flash = flash; F.torch = s.flash ? fk : 0;
  F.detector = s.well.in || s.well.h2s > 1 ? 1 : 0; F.gas = s.well.h2s; F.lightPow = lightPow(s); F.cabPow = cabPow(s); F.plcRun = plcRun(s); F.rain = s.ch === 6 ? dawnK : 1; F.wind = s.ch === 5 ? 1.2 : .6;
  F.bobX = bob * .006; F.bobY = -Math.abs(bob) * .01; F.swayP = swP; F.swayY = -swY; F.hurt = s.well.h2s >= 10 ? Math.min(.35, (s.well.h2s - 10) / 20) : 0;
  V.frame(F); hud(now, rdt); }

/* ---------- indulás ---------- */
$('#load').hidden = true; requestAnimationFrame(frame); menu();
(async () => { try { core = await import('../../js/core.js?v=202611212314'); if (!core || core.notConfigured || !core.auth) return; core.FB.onAuthStateChanged(core.auth, u => { user = u && !u.isAnonymous ? u : null; if (user) cloudLoad(); }); } catch (e) { console.info(e); } })();
window.__at = () => ({ S, P, L, V, UI, PAL, act, check, setCh, CP, target, holdA, start, SET, useDown, useUp, goal, objectives });
