// Az Átemelőtelep – fő program: mozgás, interakció, fejezetek, hangulat (fények, eső, hangok), HUD, mentés, beállítások, mobil.
import { createRenderer, M4, hex } from './motor.js?v=202611211432';
import { buildLevel, move, pick, overlap, WELL, EYE } from './palya.js?v=202611211432';
import { freshState, step as simStep, clone, CHAPTERS, OVER, LSH_H, cabPow, plcRun, lightPow, supply, ITEMN } from './jatek.js?v=202611211432';
import * as UI from './ui.js?v=202611211432';

const $ = s => document.querySelector(s), TOUCH = matchMedia('(pointer: coarse)').matches, SAVE = 'hgws_atemelo_v1', GAME = 'atemelotelep';
const cv = $('#c'), hc = $('#h'), h = hc.getContext('2d'), R = createRenderer(cv), L = buildLevel(); if (R) R.setWorld(L.g);
let S = null, P = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0 }, CP = null, playing = false, core = null, user = null, busy = false;
let SET = { sens: 1, fov: 78, vol: .8, q: TOUCH ? 0 : 1, scary: 0, lvl: 1 }; try { SET = { ...SET, ...JSON.parse(localStorage.getItem('hgws_atemelo_set') || '{}') }; } catch (_) {}
const saveSet = () => { try { localStorage.setItem('hgws_atemelo_set', JSON.stringify(SET)); } catch (_) {} };
const QUAL = [{ s: .6, rain: 450, far: 40 }, { s: .85, rain: 1000, far: 55 }, { s: 1, rain: 1700, far: 70 }];
const toastEl = $('#toast'); let toastT = 0;
function msg(t, ms = 3200) { toastEl.textContent = t; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), ms); }
let banner = null; const bannerOn = (a, b) => banner = { a, b, l: 4 };

/* ---------- hang (WebAudio, szintetizált – nincs letöltendő hangfájl) ---------- */
const A = (() => { let ac = null, mst = null, nz = null; const loops = {};
  const ctx = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); mst = ac.createGain(); mst.connect(ac.destination); const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; nz = b; } catch (_) {} } if (ac && ac.state === 'suspended') ac.resume(); if (mst) mst.gain.value = SET.vol; return ac; };
  const noise = (f, q, type, dur, vol, dly = 0) => { const a = ctx(); if (!a) return; const s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + dly; s.buffer = nz; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(fl); fl.connect(g); g.connect(mst); s.start(t, Math.random()); s.stop(t + dur + .05); };
  const tone = (f0, f1, dur, vol, type = 'sine', dly = 0) => { const a = ctx(); if (!a) return; const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + dly; o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(mst); o.start(t); o.stop(t + dur + .05); };
  // folyamatos hangok: eső, szél, szivattyúzúgás, fénycső, aggregát, sziréna
  const loop = (k, mk) => { if (loops[k] || !ctx()) return loops[k]; const g = ac.createGain(); g.gain.value = 0; g.connect(mst); mk(g); return loops[k] = g; };
  const nLoop = (k, f, q, type) => loop(k, g => { const s = ac.createBufferSource(), fl = ac.createBiquadFilter(); s.buffer = nz; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; s.connect(fl); fl.connect(g); s.start(); loops[k + 'f'] = fl; });
  const oLoop = (k, fs, lp) => loop(k, g => { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; fl.connect(g); for (const [f, t, v] of fs) { const o = ac.createOscillator(), og = ac.createGain(); o.type = t; o.frequency.value = f; og.gain.value = v; o.connect(og); og.connect(fl); o.start(); } });
  return { ctx, vol() { if (mst) mst.gain.value = SET.vol; },
    set(k, v, tc = .3) { if (!ac) return; const make = { rain: () => nLoop('rain', 1800, .4, 'highpass'), wind: () => nLoop('wind', 380, .8, 'lowpass'), pump: () => oLoop('pump', [[49.5, 'sawtooth', .5], [99, 'sine', .4], [148, 'square', .05]], 420), hum: () => oLoop('hum', [[100, 'sine', .6], [200, 'sine', .15]], 600), gen: () => oLoop('gen', [[24, 'sawtooth', .7], [49, 'square', .15]], 300), siren: () => oLoop('siren', [[700, 'triangle', .5]], 2000) };
      const g = loops[k] || (make[k] && make[k]()); if (g) g.gain.setTargetAtTime(v, ac.currentTime, tc); },
    sirenF(t) { const g = loops.siren; if (g && ac) { /* a sziréna hangmagassága a fénycsóvával lüktet */ } },
    sfx(n) { const a = ctx(); if (!a) return;
      ({ click: () => noise(3000, 2, 'bandpass', .05, .25), relay: () => { noise(2500, 3, 'bandpass', .04, .3); noise(1200, 3, 'bandpass', .04, .2, .03); }, clunk: () => { noise(400, 1, 'lowpass', .15, .5); tone(120, 60, .12, .3); },
        zap: () => { noise(4000, .5, 'highpass', .25, .6); tone(900, 60, .2, .2, 'sawtooth'); }, pick: () => { tone(660, 990, .12, .18); tone(990, 1320, .14, .15, 'sine', .08); }, beep: () => tone(2800, 2800, .09, .15, 'square'),
        tick: () => noise(5000, 4, 'bandpass', .02, .1), crank: () => { noise(160, 2, 'bandpass', .14, .35); tone(70, 60, .12, .2, 'sawtooth'); }, engine: () => { tone(40, 26, 1.2, .5, 'sawtooth'); noise(200, 1, 'lowpass', 1, .4); },
        door: () => { tone(220, 160, .5, .12, 'sawtooth'); noise(300, 2, 'bandpass', .5, .15); }, slam: () => { noise(250, 1, 'lowpass', .5, .9); tone(70, 40, .4, .5); }, hatch: () => { noise(180, 1, 'lowpass', .7, 1); tone(55, 35, .6, .6, 'square'); },
        thunder: () => { noise(120, .7, 'lowpass', 3.5, .9, .4); noise(60, .7, 'lowpass', 4, .7, .9); }, step: () => noise(260, 1.2, 'lowpass', .07, .08), stepM: () => { noise(1800, 6, 'bandpass', .06, .07); noise(300, 2, 'lowpass', .06, .06); },
        far: () => { for (let i = 0; i < 4; i++) noise(200, 1, 'lowpass', .12, .22, i * .55); }, drip: () => tone(1800 + Math.random() * 1500, 600, .08, .06), splash: () => noise(700, .8, 'lowpass', .5, .3), valve: () => noise(900, 6, 'bandpass', .3, .12),
        gas1: () => tone(2900, 2900, .12, .12, 'square'), gas2: () => { tone(3200, 3200, .08, .16, 'square'); tone(3200, 3200, .08, .16, 'square', .14); } }[n] || (() => {}))(); } };
})();

/* ---------- beviteli eszközök ---------- */
const keys = new Set(); let locked = false, useHeld = false, holdA = null, look = { mx: 0, my: 0 };
const T = { mv: null, lk: null };
function lockPointer() { if (TOUCH || !playing) return; A.ctx(); try { const r = cv.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (_) {} }
const unlock = () => { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (_) {} };
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === cv; if (locked) { for (const s of ['pause', 'sets']) $('#' + s).hidden = true; } else if (playing && !UI.isOpen() && !busy && $('#end').hidden) pause(); });
addEventListener('keydown', e => { const k = e.code; if (k === 'Escape') { if (UI.isOpen()) { UI.close(); return; } } if (!playing || !$('#pause').hidden || !$('#sets').hidden) return;
  if (UI.isOpen()) { if (k === 'KeyE' || k === 'Tab' || k === 'KeyI') { e.preventDefault(); UI.close(); } return; }
  keys.add(k); if (k === 'KeyE' && !e.repeat) useDown(); if (k === 'KeyF' && !e.repeat) toggleFlash(); if ((k === 'Tab' || k === 'KeyI') && !e.repeat) { e.preventDefault(); openPanel('inv'); } if (k === 'KeyR' && !e.repeat) battery(); if (k === 'Space') e.preventDefault(); });
addEventListener('keyup', e => { keys.delete(e.code); if (e.code === 'KeyE') useUp(); });
addEventListener('blur', () => { keys.clear(); useUp(); });
cv.addEventListener('mousedown', () => { if (playing && !locked && !UI.isOpen() && !TOUCH) lockPointer(); });
addEventListener('mousemove', e => { if (!locked || !playing) return; const k = .0021 * SET.sens; P.yaw -= e.movementX * k; P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch - e.movementY * k)); });
const tc = $('#tc');
tc.addEventListener('pointerdown', e => { A.ctx(); const b = e.target.closest('[data-b]'); if (b) { const k = b.dataset.b; if (k === 'use') useDown(); else if (k === 'flash') toggleFlash(); else if (k === 'run') keys.has('ShiftLeft') ? keys.delete('ShiftLeft') : keys.add('ShiftLeft'); else if (k === 'inv') openPanel('inv'); else if (k === 'menu') pause(); e.preventDefault(); return; }
  if (e.clientX < innerWidth / 2) { if (!T.mv) T.mv = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY }; } else if (!T.lk) T.lk = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
tc.addEventListener('pointermove', e => { if (T.mv && T.mv.id === e.pointerId) { T.mv.x = e.clientX; T.mv.y = e.clientY; } if (T.lk && T.lk.id === e.pointerId) { const k = .006 * SET.sens; P.yaw -= (e.clientX - T.lk.x) * k; P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch - (e.clientY - T.lk.y) * k)); T.lk.x = e.clientX; T.lk.y = e.clientY; } });
const tup = e => { const b = e.target.closest && e.target.closest('[data-b="use"]'); if (b) useUp(); if (T.mv && T.mv.id === e.pointerId) T.mv = null; if (T.lk && T.lk.id === e.pointerId) T.lk = null; };
tc.addEventListener('pointerup', tup); tc.addEventListener('pointercancel', tup);
function toggleFlash() { if (!S) return; if (S.bat <= 0) return msg('Lemerült az elem. (R – elemcsere, ha van tartalék.)'); S.flash = S.flash ? 0 : 1; A.sfx('click'); }
function battery() { if (!S) return; if (!S.inv.elem) return msg('Nincs tartalék elemed.'); if (S.bat > .9) return; S.inv.elem--; S.bat = 1; S.flash = 1; A.sfx('click'); msg('Elemcsere kész.'); }

/* ---------- panelek, dokumentumok ---------- */
const api = { get S() { return S; }, msg, sfx: n => A.sfx(n), read: k => read(k), check: () => check(), closed: () => { if (playing && !TOUCH) lockPointer(); if (S && S.f.pendingFinish) finish(); } };
UI.initUI(api);
function openPanel(id, arg) { unlock(); UI.open(id, arg); }
function read(k) { S.docs[k] = 1; openPanel('doc', k); }

/* ---------- interakciók ---------- */
let target = null;
const visible = o => { const inW = S.well.in; if (['letra_fel', 'uszo', 'emelo_p1', 'emelo_p2'].includes(o.id)) return inW; if (inW) return false;
  if (o.id === 'letra_le') return S.well.hatch; if (o.id === 'kanna') return !S.f.tookKanna; if (o.id === 'kartya') return S.ch === 6; if (o.id === 'tolozar') return S.ch !== 6; return true; };
const cardIt = { id: 'kartya', a: [51.2, 0, -22.8], b: [52.8, .6, -21.2], label: 'Névjegy a tolózár fedelén' };
if (!L.it.includes(cardIt)) L.it.push(cardIt);
function holdSpec(id) { const W = S.well;
  if (id === 'emelo_p1') { if (!(S.lock[0] && S.mode[0] === '0')) return 'Előbb zárd ki a P1-et a szekrényben: 0 állás + személyes lakat!';
    if (W.p1up < 1 && !W.p1clean) return { t: 3, n: 'P1 kiemelése a vezetősínen', done: () => { W.p1up = 1; A.sfx('splash'); } };
    if (W.p1up >= 1 && !W.p1clean) return { t: 3.5, n: 'Járókerék megtisztítása (rongyok, törlőkendők)', done: () => { W.p1clean = 1; S.clog[0] = 0; S.trip[0] = 0; msg('A járókerékből egy egész köteg rongy jött ki. Ez nem véletlenül került oda.'); } };
    if (W.p1up >= 1) return { t: 3, n: 'P1 visszaengedése', done: () => { W.p1up = 0; A.sfx('splash'); } }; return null; }
  if (id === 'tank') { if (S.gen.fuel > .5) return 'A tartály tele.'; if (!S.inv.kanna) return 'Kellene egy kanna gázolaj.'; return { t: 4, n: 'Tankolás', done: () => { S.gen.fuel = .9; S.inv.kanna = 0; } }; }
  if (id === 'tolozar') { if (!S.f.valveShut || S.valve >= 1) return 'A tolózár nyitva.'; if (!S.inv.tkulcs) return 'Tolózárkulcs nélkül nem lehet elforgatni – a kisbuszban van egy.'; return { t: 14, n: 'Tolózár nyitása (balra, ~40 fordulat)', prog: k => { S.valve = Math.max(S.valve, k); if (Math.random() < .05) A.sfx('valve'); }, done: () => { S.valve = 1; check(); } }; }
  return null; }
function useDown() { if (!S || !playing || UI.isOpen()) return; useHeld = true; const o = target; if (!o) return; const hs = holdSpec(o.id);
  if (hs !== null && hs !== undefined) { if (typeof hs === 'string') return msg(hs); holdA = { o, ...hs, p: 0 }; return; } act(o.id); }
function useUp() { useHeld = false; holdA = null; }
function act(id) { const W = S.well;
  switch (id) {
    case 'lanc': case 'naplo': case 'rajz': case 'lyuk': return read(id);
    case 'kartya': S.f.pendingFinish = 1; return read('kartya');
    case 'busz': case 'fiok': case 'modem': case 'antenna': case 'generator': case 'ats': return openPanel(id);
    case 'szekreny': S.f.atCont = 1; return openPanel('szekreny');
    case 'terminal': if (plcRun(S)) S.f.sawAlarms = 1; return openPanel('terminal');
    case 'ajto': S.door = S.door ? 0 : 1; A.sfx('door'); return;
    case 'fedel': if (W.hatch) { W.hatch = 0; A.sfx('clunk'); } else { W.hatch = 1; A.sfx('clunk'); if (!S.docs.akna) read('akna'); } return;
    case 'letra_le': if (!W.hatch) return msg('A búvónyílás fedele zárva.'); return transition('Lemászol a létrán…', () => { W.in = 1; place(L.spots.wellIn); if (!S.f.w1) S.f.w1 = S.t; if (!(W.vent && lightPow(S))) msg('A gázérzékelő ketyeg. Szellőztetés nélkül itt gyűlik a kénhidrogén.', 4500); });
    case 'letra_fel': return transition('Felmászol…', () => { W.in = 0; place(L.spots.well); check(); });
    case 'vent': if (!lightPow(S)) return msg('A ventilátornak nincs tápja (szekrény, Q1).'); W.vent = W.vent ? 0 : 1; A.sfx('clunk'); return msg(W.vent ? 'Szellőztető BE – friss levegő megy az aknába.' : 'Szellőztető KI.');
    case 'uszo': if (W.float) return msg('Az úszók szabadon lógnak.'); if (!S.inv.fogo) return msg('Az LSH1 úszót kábelkötegelővel felkötötték a korlátra. Fogó kellene hozzá.'); W.float = 1; A.sfx('click'); msg('Elvágtad a kötegelőt – az LSH1 úszó a helyére lendül.'); return check();
    case 'emelo_p2': return msg('A P2 rendben van – nem kell kiemelni.');
    case 'kanna': S.f.tookKanna = 1; S.inv.kanna = 1; A.sfx('pick'); return msg('Gázolajos kanna – tele van. Szerencse.');
    case 'keletikapu': if (!S.inv.kulcs) return msg('Zárva.'); S.eastGate = S.eastGate ? 0 : 1; A.sfx('door'); return;
  } }
function transition(text, fn) { busy = true; const f = $('#fade'); f.textContent = text; f.classList.add('on'); setTimeout(() => { fn(); setTimeout(() => { f.classList.remove('on'); busy = false; }, 350); }, 650); }
function place(sp) { P.x = sp[0]; P.y = sp[1]; P.z = sp[2]; P.yaw = sp[3]; P.pitch = 0; P.vx = P.vy = P.vz = 0; }

/* ---------- fejezetek, célok, események ---------- */
const wiresOK = s => s.wires.W102 === 2 && s.wires.W104 === 4 && s.wires.W105 === 5 && s.wires.W106 === 6 && s.wires.WX === 7;
function objectives() { const s = S, W = s.well, o = [];
  if (s.ch === 1) o.push(!s.f.atCont ? 'Nézz körül, és juss el a vezérlőkonténerig.' : 'Állítsd helyre a tápellátást a kapcsolószekrényben (+S1).');
  else if (s.ch === 2) { if (!s.f.sawAlarms) o.push('Nézd meg a PLC hibalistáját a terminálon.'); else o.push('Kösd vissza az elvágott jelvezetékeket (X1) a kapcsolási rajz alapján.'); }
  else if (s.ch === 3) { o.push((W.vent && lightPow(s) ? '✓ ' : '') + 'Kapcsold be az akna szellőztetését.'); o.push((s.lock[0] || W.p1clean ? '✓ ' : '') + 'Zárd ki a P1 szivattyút (0 állás + személyes lakat).'); o.push((W.float ? '✓ ' : '') + 'Szabadítsd ki a beragadt úszókapcsolót.'); o.push((W.p1clean ? '✓ ' : '') + 'Emeld ki és tisztítsd meg a P1-et.'); if (W.p1clean) o.push('Engedd vissza a P1-et, vedd le a lakatot, és gyere fel.'); }
  else if (s.ch === 4) { o.push((s.progOK ? '✓ ' : '') + 'Javítsd ki a szintszabályozó programot (terminál → Program).'); if (s.progOK) o.push((s.mode[0] === 'A' && s.mode[1] === 'A' ? '✓ ' : '') + 'Állítsd mindkét szivattyút AUTO üzemmódba.'); }
  else if (s.ch === 5) { if (s.mains) o.push('Figyeld a telepet – a vihar erősödik.'); else { o.push((supply(s) ? '✓ ' : '') + 'Áramszünet! Indítsd el az aggregátort, és kapcsold át a telepet.'); if (supply(s)) o.push((s.modem.online ? '✓ ' : '') + 'Állítsd helyre a kommunikációt (VPN-modem).'); if (s.f.sms || s.f.pressSeen) o.push('Nyisd ki a tolózárat a gazdasági ágon – keleti kapu, sárga jelzőoszlopok!'); } }
  else o.push('Hajnalodik. Nézd meg, mit hagytak a tolózárnál.');
  return o; }
function setCh(n) { const s = S; if (!s.done.includes(s.ch)) s.done.push(s.ch); s.ch = n; bannerOn(n <= 5 ? n + '. fejezet' : 'Epilógus', CHAPTERS[n - 1]);
  if (n === 5) { s.qin = .006; s.f.valveShut = 1; s.valve = 0; s.f.cutAt = s.t + 14; }
  if (n === 6) { s.qin = .0015; s.f.dawn = s.t; }
  checkpoint(); cloudSave(); }
function check() { if (!S || !playing) return; const s = S, W = s.well;
  if (s.ch === 1 && plcRun(s)) { setCh(2); msg('A PLC elindult. A terminál életre kel.'); }
  else if (s.ch === 2 && wiresOK(s) && plcRun(s)) { s.wiredOK = 1; setCh(3); if (!SET.scary) { s.door = 0; A.sfx('slam'); setTimeout(() => msg('…a konténer ajtaja magától becsapódott.'), 600); } }
  else if (s.ch === 3 && W.float && W.p1clean && W.p1up === 0 && !s.lock[0] && !W.in) { setCh(4); msg('A hibalista szerint a program paramétereit is átírták.'); }
  else if (s.ch === 4 && s.progOK && s.mode[0] === 'A' && s.mode[1] === 'A' && !s.f.ch4ok) { s.f.ch4ok = s.t; }
  else if (s.ch === 5 && s.valve >= 1) { setCh(6); msg('A nyomás leesett, a szivattyúk szállítanak. A szint csökken.'); }
  UI.refresh(); }
function events(dt) { const s = S;
  if (s.ch === 4 && s.f.ch4ok && s.t - s.f.ch4ok > 10 && s.lvl < 2.2) setCh(5);
  if (s.ch === 5 && s.mains && s.t >= s.f.cutAt) { s.mains = 0; lightning(1); A.sfx('zap'); msg('Áramszünet! A villám a betáplálást is elvitte.', 4500); if (!SET.scary) s.f.figure = { x: -24, z: -14, t: 3.5 }; }
  if (s.ch === 5 && !s.mains && supply(s) && !s.f.genOK) { s.f.genOK = 1; checkpoint(); msg('A telep generátorról üzemel.'); }
  if (s.ch === 3 && s.f.w1 && s.t - s.f.w1 > 25 && !s.f.s3 && s.well.in) { s.f.s3 = 1; s.cab.q[0] = 0; s.f.note1 = 1; A.sfx('relay'); msg('A lámpa kialudt. A szellőztető is leállt.', 4000); if (!SET.scary) { setTimeout(() => A.sfx('far'), 1200); setTimeout(() => A.sfx('hatch'), 3500); setTimeout(() => msg('Odafent valaki jár.'), 3600); } }
  if (s.ch === 4 && !s.f.s4 && !SET.scary && s.progOK) { s.f.s4 = 1; s.f.figure = { x: -29.2, z: -10, t: 4 }; }
  if (s.ch === 1 && !s.f.s1 && !SET.scary && Math.hypot(P.x + 10, P.z) < 9) { s.f.s1 = 1; A.sfx('far'); setTimeout(() => A.sfx('slam'), 1600); }
  if (s.f.figure) { s.f.figure.t -= dt; if (s.f.figure.t <= 0) s.f.figure = null; }
  if (s.ch === 6 && s.t - s.f.dawn > 1 && !s.f.dawnMsg) { s.f.dawnMsg = 1; } }
function simEv(e, i) { const s = S;
  if (e === 'overflow') fail('A medence túlcsordult. A szennyvíz a falu felé indult…');
  else if (e === 'faint') fail('Elszédültél a kénhidrogéntől – az utolsó erőddel kimásztál. A friss levegőn magadhoz térsz… de a munka elölről kezdődik.');
  else if (e === 'trip_clog') msg(`P${i + 1}: a motorvédő leoldott – túláram. Valami eltömíti a járókereket.`);
  else if (e === 'trip_dry') msg(`P${i + 1}: szárazfutás! A motorvédő leoldott. (Szekrény → Szivattyúk → visszaállítás)`, 4500);
  else if (e === 'trip_press') { if (!s.f.pressSeen) { s.f.pressSeen = 1; msg('Nyomásvédelem: a nyomóvezetéken 6 bar fölé ment a nyomás – a szivattyúk leálltak.', 4500); } }
  else if (e === 'online') { s.f.sms = 1; A.sfx('beep'); setTimeout(() => read('sms'), 500); }
  else if (e === 'gen_stop') msg('Az aggregát leállt.'); }
function fail(t) { if (busy) return; busy = true; useUp(); UI.isOpen() && UI.close(); const f = $('#fade'); f.textContent = t; f.classList.add('on'); setTimeout(() => { loadCp(true); setTimeout(() => { f.classList.remove('on'); busy = false; }, 600); }, 3200); }

/* ---------- mentés ---------- */
function checkpoint() { const c = clone(S); c.lvl = Math.min(c.lvl, 2.6); c.f.overNow = 0; c.well.h2s = Math.min(c.well.h2s, 3); CP = { S: c, P: { x: P.x, y: P.y, z: P.z, yaw: P.yaw } }; persist(); }
function persist() { try { const o = JSON.parse(localStorage.getItem(SAVE) || '{}'); o.cp = CP; localStorage.setItem(SAVE, JSON.stringify(o)); } catch (_) {} }
function loadCp(keep) { if (!CP) return; const t = S ? S.t : 0, st = S ? S.stats : null; S = clone(CP.S); if (keep && st) { S.t = t; S.stats = st; } P = { x: CP.P.x, y: CP.P.y, z: CP.P.z, vx: 0, vy: 0, vz: 0, yaw: CP.P.yaw, pitch: 0 }; }
const local = () => { try { return JSON.parse(localStorage.getItem(SAVE) || '{}'); } catch (_) { return {}; } };
async function cloudSave(fin) { if (!core || !user) return; try { const o = local(), st = JSON.stringify(CP); if (st.length > 11000) return;
  await core.FB.setDoc(core.FB.doc(core.db, 'gamesaves', user.uid), { atemelo: { ch: S.ch, t: Math.round(S.t), done: S.done.slice(0, 6), best: Math.round(o.best || 0), nospill: fin && !S.stats.over ? 1 : (o.nospill || 0), nogas: fin && !S.stats.gas ? 1 : (o.nogas || 0), st }, updatedAt: core.FB.serverTimestamp() }); } catch (e) { console.warn('mentés', e); } }
async function cloudLoad() { if (!core || !user) return; try { const d = await core.FB.getDoc(core.FB.doc(core.db, 'gamesaves', user.uid)); const a = d.exists() && d.data().atemelo; if (!a) return; const o = local();
  if (a.best && (!o.best || a.best < o.best)) o.best = a.best; if (a.nospill) o.nospill = 1; if (a.nogas) o.nogas = 1; const cp = JSON.parse(a.st || 'null'); if (cp && (!o.cp || cp.S.t > o.cp.S.t)) o.cp = cp; localStorage.setItem(SAVE, JSON.stringify(o)); menu(); } catch (e) { console.warn(e); } }

/* ---------- menük ---------- */
const fmt = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
function menu() { const o = local(); playing = false; $('#tc').hidden = true; for (const s of ['pause', 'sets', 'end']) $('#' + s).hidden = true; $('#menu').hidden = false; unlock();
  $('#mCont').hidden = !(o.cp && o.cp.S && o.cp.S.ch < 7); if (o.cp) $('#mCont').textContent = 'Folytatás – ' + (o.cp.S.ch <= 5 ? o.cp.S.ch + '. fejezet: ' : '') + CHAPTERS[o.cp.S.ch - 1];
  $('#mBest').textContent = o.best ? 'Legjobb idő: ' + fmt(o.best) : ''; if (!R) { $('#mSt').textContent = 'A böngésződ nem támogatja a WebGL-t, ezért a játék nem indítható.'; $('#mNew').disabled = $('#mCont').disabled = true; } }
function start(fresh) { A.ctx(); if (fresh) { S = freshState(); place(L.spots.start); checkpoint(); } else { CP = local().cp; loadCp(false); }
  playing = true; $('#menu').hidden = true; $('#tc').hidden = !TOUCH; lockPointer();
  if (fresh) { const f = $('#fade'); busy = true; f.innerHTML = '<div><b style="font:900 24px Cinzel,serif;color:#e8b656">03:02 – Riasztás</b><br><br>Az Átemelő 3. kiesett a SCADA-ról. A medence szintje emelkedik.<br>Ha reggelig túlcsordul, a lenti falu utcáit elönti a szennyvíz.<br><br>Ügyeletes: te.</div>'; f.classList.add('on'); setTimeout(() => { f.classList.remove('on'); busy = false; bannerOn('1. fejezet', CHAPTERS[0]); }, 5200); }
  else bannerOn(S.ch <= 5 ? S.ch + '. fejezet' : 'Epilógus', CHAPTERS[S.ch - 1]); }
function pause() { if (!playing) return; useUp(); keys.clear(); $('#pause').hidden = false; $('#pSub').textContent = (S.ch <= 5 ? S.ch + '. fejezet · ' : '') + CHAPTERS[S.ch - 1] + ' · eltelt idő: ' + fmt(S.t); unlock(); }
$('#mNew').onclick = () => start(true); $('#mCont').onclick = () => start(false);
$('#pRes').onclick = () => { $('#pause').hidden = true; lockPointer(); }; $('#pInv').onclick = () => { $('#pause').hidden = true; openPanel('inv'); };
$('#pCp').onclick = () => { $('#pause').hidden = true; loadCp(true); lockPointer(); }; $('#pMenu').onclick = () => { checkpoint(); menu(); };
let setFrom = 'menu'; const openSets = from => { setFrom = from; for (const s of ['menu', 'pause']) $('#' + s).hidden = true; $('#sets').hidden = false; const u = () => { $('#vSens').textContent = (+SET.sens).toFixed(2); $('#vFov').textContent = SET.fov + '°'; $('#vVol').textContent = Math.round(SET.vol * 100) + '%'; };
  $('#sSens').value = SET.sens; $('#sFov').value = SET.fov; $('#sVol').value = SET.vol; $('#sQ').value = SET.q; $('#sScary').value = SET.scary; $('#sLvl').value = SET.lvl; u();
  for (const [id, k] of [['sSens', 'sens'], ['sFov', 'fov'], ['sVol', 'vol']]) $('#' + id).oninput = () => { SET[k] = +$('#' + id).value; u(); saveSet(); A.vol(); };
  for (const [id, k] of [['sQ', 'q'], ['sScary', 'scary'], ['sLvl', 'lvl']]) $('#' + id).onchange = () => { SET[k] = +$('#' + id).value; saveSet(); }; };
$('#mSet').onclick = () => openSets('menu'); $('#pSet').onclick = () => openSets('pause'); $('#sOk').onclick = () => { $('#sets').hidden = true; $('#' + setFrom).hidden = false; };
$('#eNew').onclick = () => start(true); $('#eMenu').onclick = () => menu();
function finish() { const s = S, o = local(), t = Math.round(s.t), nb = !o.best || t < o.best; S.f.pendingFinish = 0; S.done = [1, 2, 3, 4, 5]; playing = false; unlock(); $('#tc').hidden = true;
  o.best = nb ? t : o.best; if (!s.stats.over) o.nospill = 1; if (!s.stats.gas) o.nogas = 1; o.cp = null; localStorage.setItem(SAVE, JSON.stringify(o)); CP = { S: clone(s), P: { ...P } }; CP.S.ch = 7; cloudSave(true);
  try { if (window.top !== window) parent.postMessage({ hgws: 'score', game: GAME, score: 1e6 - t }, location.origin); } catch (_) {}
  const b = [['Éjszakai ügyeletes', 'Végigvitted mind az öt fejezetet', 1], ['Egy csepp se folyt ki', 'Túlcsordulás nélkül', !s.stats.over], ['Gázmester', 'Egyszer sem szólt a gázriasztás (A2)', !s.stats.gas], ['Fél óra alatt', 'A teljes játék 30 perc alatt', t <= 1800]];
  $('#eBody').innerHTML = `<p>Idő: <b style="font-size:20px">${fmt(t)}</b>${nb ? ' <b style="color:#e8b656">– új legjobb!</b>' : ' · legjobb: ' + fmt(o.best)}</p><p class="mut">A diszpécserközpont visszaigazolta: a telep él, a szivattyúk szállítanak, a szint csökken. A falu reggel semmit sem vett észre.</p><div class="grid2" style="margin-top:10px">${b.map(([n, d, ok]) => `<div class="itm" style="opacity:${ok ? 1 : .4}"><div><b>${ok ? '🏅 ' : ''}${n}</b><br><small class="mut">${d}</small></div></div>`).join('')}</div>`;
  $('#end').hidden = false; }

/* ---------- fények, eső, részecskék ---------- */
let flash = 0, nextL = 6, rain = null, parts = new Float32Array(8 * 4000), drops = [];
function lightning(force) { flash = 1; setTimeout(() => A.sfx('thunder'), 300 + Math.random() * 900); if (force) flash = 1.3; }
const indoor = (x, z) => L.indoor.some(q => x > q[0] && x < q[2] && z > q[1] && z < q[3]);
function buildRain(n) { rain = new Float32Array(n * 3); for (let i = 0; i < n; i++) { rain[i * 3] = Math.random() * 30 - 15; rain[i * 3 + 1] = Math.random() * 14; rain[i * 3 + 2] = Math.random() * 30 - 15; } }

/* ---------- fő ciklus ---------- */
let last = performance.now(), stepAcc = 0, footD = 0, gasT = 0, dripT = 0, beaconA = 0;
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.1, (now - last) / 1000); last = now; if (!R) return;
  const q = QUAL[SET.q]; R.resize(q.s); h.setTransform(1, 0, 0, 1, 0, 0); const D = Math.min(2, devicePixelRatio || 1), Wd = innerWidth, Hd = innerHeight; if (hc.width !== Math.round(Wd * D)) { hc.width = Math.round(Wd * D); hc.height = Math.round(Hd * D); } h.clearRect(0, 0, hc.width, hc.height);
  if (!S) { R.begin({ x: 0, y: 3, z: 30, yaw: Math.PI + Math.sin(now / 9000) * .4, pitch: -.05, fov: 1.2 }, env(now, true)); return; }
  const active = playing && $('#pause').hidden && $('#sets').hidden && !busy;
  if (active) { // szimuláció 0,1 s-os lépésekben
    stepAcc += dt; while (stepAcc >= .1) { stepAcc -= .1; simStep(S, .1, simEv); events(.1); } if (Math.floor(S.t * 2) !== Math.floor((S.t - dt) * 2)) check();
    if (!UI.isOpen()) { let mx = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0), my = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      if (T.mv) { const dx = T.mv.x - T.mv.x0, dy = T.mv.y - T.mv.y0, d = Math.hypot(dx, dy), k = Math.min(1, d / 50); if (d > 6) { mx = -dy / d * k; my = dx / d * k; } }
      if (window.__drive) { const d = window.__drive(P, S); mx = d.mx; my = d.my; }
      L.boxes[L.doorCol].off = !!S.door; L.boxes[L.gateCol].off = !!S.eastGate; const ox = P.x, oz = P.z; for (let i = 0; i < 3; i++) move(L, P, mx, my, keys.has('ShiftLeft') || keys.has('ShiftRight'), dt / 3);
      footD += Math.hypot(P.x - ox, P.z - oz); if (footD > (keys.has('ShiftLeft') ? 1.1 : .8)) { footD = 0; A.sfx(S.well.in ? 'stepM' : 'step'); } }
    // interakció: célzott tárgy, tartott műveletek
    const d = [-Math.sin(P.yaw) * Math.cos(P.pitch), Math.sin(P.pitch), -Math.cos(P.yaw) * Math.cos(P.pitch)]; target = UI.isOpen() ? null : pick(L, P.x, P.y + EYE, P.z, d, 2.3, visible);
    if (holdA) { if (!useHeld || target !== holdA.o) holdA = null; else { holdA.p += dt / holdA.t; if (holdA.prog) holdA.prog(Math.min(1, holdA.p)); if (holdA.p >= 1) { const h0 = holdA; holdA = null; h0.done(); check(); } } }
    // gázérzékelő hangja
    const g = S.well.h2s; if (g >= 5) { gasT -= dt; if (gasT <= 0) { gasT = g >= 10 ? .45 : 1.5; A.sfx(g >= 10 ? 'gas2' : 'gas1'); } }
    if (S.well.in && (dripT -= dt) <= 0) { dripT = .3 + Math.random() * 1.4; A.sfx('drip'); }
    if (S.ch < 6 && (nextL -= dt) <= 0) { nextL = (S.ch === 5 ? 7 : 16) + Math.random() * 14; if (!S.well.in) lightning(); } }
  flash = Math.max(0, flash - dt * 3);
  // hangok
  const out = !S.well.in && !indoor(P.x, P.z), stormK = S.ch === 5 ? 1 : S.ch === 6 ? .1 : .55, wellD = Math.hypot(P.x - 8, P.z + 8), pumpOn = (S.run[0] || S.run[1]) ? 1 : 0;
  A.set('rain', active ? (out ? .22 : .06) * stormK * (S.ch === 6 ? Math.max(0, 1 - (S.t - S.f.dawn) / 20) : 1) : 0); A.set('wind', active && out ? .12 * stormK : 0); A.set('pump', active ? pumpOn * (S.well.in ? .25 : Math.max(0, .14 - wellD * .006)) : 0);
  A.set('hum', active && indoor(P.x, P.z) && lightPow(S) && S.cab.q[0] ? .05 : 0); A.set('gen', active && S.gen.run ? Math.max(0, .3 - Math.hypot(P.x + 23, P.z + 19) * .01) : 0); A.set('siren', active && (S.alarm || S.lvl > 3.2) && cabPow(S) ? (.05 + Math.sin(now / 300) * .03) * (S.well.in ? .4 : 1) : 0, .05);
  if (S.ch === 6 && S.f.dawn != null && rain && S.t - S.f.dawn > 25) rain = null;
  render(now, dt, q); hud(now, dt, Wd, Hd, D); }
function env(now, idle) { const s = S, dawn = s && s.ch === 6 ? Math.min(1, (s.t - s.f.dawn) / 40) : 0, lp = s && lightPow(s), lt = [];
  const amb = [.045 + .3 * dawn, .05 + .28 * dawn, .07 + .3 * dawn].map(v => v + flash * .5), fog = [.012 + .45 * dawn, .015 + .4 * dawn, .022 + .45 * dawn].map(v => v + flash * .12);
  if (s && lp) { const fl = s.f.flick != null ? (Math.random() < .3 ? 0 : 1) : 1; if (s.cab.q[0]) { lt.push([...L.lamps.cont.slice(0, 4), ...L.lamps.cont.slice(4).map(v => v * 1.3 * fl)]); if (s.well.in || Math.hypot(P.x - 8, P.z + 8) < 12) lt.push([...L.lamps.well.slice(0, 4), ...L.lamps.well.slice(4).map(v => v * 1.1)]); for (const k of ['l1', 'l2', 'l3']) lt.push([...L.lamps[k].slice(0, 4), ...L.lamps[k].slice(4).map(v => v * 1.4)]); } }
  if (s && (s.alarm || s.lvl > 3.2) && cabPow(s)) { const a = now / 250; lt.unshift([-12 + Math.cos(a) * 1.5, 3.2, -1 + Math.sin(a) * 1.5, 12, 1.6, .1, .05]); }
  if (s && s.gen.run) lt.push([-19.6, 2, -19.6, 6, .9, .7, .4]);
  if (s && plcRun(s)) lt.push([-11, 1, 1.2, 2.2, .1, .35, .2]);
  lt.sort((a, b) => Math.hypot(a[0] - P.x, a[2] - P.z) - Math.hypot(b[0] - P.x, b[2] - P.z));
  const bat = s ? s.bat : 1, fk = bat < .2 ? (Math.random() < .15 ? .2 : 1) * (.4 + bat * 3) : 1, on = !idle && s && s.flash ? 1 : 0, d = [-Math.sin(P.yaw) * Math.cos(P.pitch), Math.sin(P.pitch), -Math.cos(P.yaw) * Math.cos(P.pitch)];
  return { amb, sunD: [.3, .8, .2], sunC: [.04 + .55 * dawn + flash * .9, .05 + .45 * dawn + flash * .9, .08 + .35 * dawn + flash], fog, far: QUAL[SET.q].far + 40 * dawn, spot: { p: [P.x + Math.cos(P.yaw) * .2, P.y + EYE - .15, P.z - Math.sin(P.yaw) * .2], d, c: [2.6 * on * fk, 2.45 * on * fk, 2.1 * on * fk], k: [.9, .975] }, lights: lt }; }
function render(now, dt, q) { const s = S, t = now / 1000, eye = P.y + EYE + (Math.abs(Math.sin(footD * 3.9)) * .03);
  const cam = { x: P.x, y: eye, z: P.z, yaw: P.yaw, pitch: P.pitch, fov: SET.fov * Math.PI / 180 }; R.begin(cam, env(now));
  const B = (x0, y0, z0, x1, y1, z1, c, em = 0, a = 1) => R.draw('box', M4.trs((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, 0, 0, x1 - x0, y1 - y0, z1 - z0), c, em, a);
  const lp = lightPow(s), cp = cabPow(s);
  // ajtó, kapu, búvónyílás fedele
  if (s.door) R.draw('box', M4.trs(-7.4, 1.05, -1.63, 0, 0, 1.2, 2.1, .06), [.72, .74, .66]); else R.draw('box', M4.trs(-8.03, 1.05, -1, 0, 0, .06, 2.1, 1.2), [.72, .74, .66]);
  if (!s.eastGate) B(29.92, 0, -24, 30.08, 2.1, -20, [.36, .4, .38]); else R.draw('box', M4.trs(31.9, 1.05, -24, 0, 0, 4, 2.1, .08), [.36, .4, .38]);
  if (!s.well.hatch) B(5.42, .25, -11.18, 6.58, .3, -10.02, [.3, .3, .3]); else R.draw('box', M4.trs(6, .85, -11.2, 0, 0, 1.16, 1.2, .05), [.3, .3, .3]);
  // világító felületek: fénycső, akna lámpa, terminál képernyő, lámpaoszlopok, LED-ek
  if (lp && s.cab.q[0]) { B(...L.tube.a, ...L.tube.b, [1, 1, .95], 2); B(...L.wellLamp.a, ...L.wellLamp.b, [1, 1, .95], 2); for (const k of ['l1', 'l2', 'l3']) { const l = L.lamps[k]; B(l[0] - .28, 4.88, l[2] - .08, l[0] + .28, 4.9, l[2] + .08, [1, .85, .6], 2.5); } }
  if (cp) B(...L.screen.a, ...L.screen.b, plcRun(s) ? [.3, 1, .5] : [.2, .3, .4], 1.4);
  R.draw('sph', M4.trs(-13.3, 1.7, -3.68, 0, 0, .02, .02, .02), s.modem.online ? [.3, .7, 1] : s.modem.pwr && cp && s.cab.q[4] ? [1, .8, .2] : [.15, .15, .15], s.modem.pwr && cp ? 3 : 0);
  if ((s.alarm || s.lvl > 3.2) && cp) R.draw('cyl', M4.trs(-12, 2.78, -1, 0, 0, .12, .2, .12), [1, .1, .05], 2.5 + Math.sin(t * 12));
  else R.draw('cyl', M4.trs(-12, 2.78, -1, 0, 0, .12, .2, .12), [.4, .05, .05], 0);
  // víz a medencében
  const wy = WELL.floor + s.lvl; R.draw('box', M4.trs(8, wy - .01, -8, 0, 0, 7.48, .02, 7.48), [.16, .2, .14], .02, .9);
  // szivattyúk, úszók
  for (const [x, i] of [[7, 0], [10, 1]]) { const up = i === 0 ? s.well.p1up : 0, py = -5 + up * 3.0, pz = -7 - up * 2.2; R.draw('cyl', M4.trs(x, py, pz, 0, 0, .3, .75, .3), [.2, .32, .55]); R.draw('cyl', M4.trs(x, py + .75, pz, 0, 0, .22, .35, .22), [.25, .27, .3]); if (i === 0 && up && !s.well.p1clean) R.draw('box', M4.trs(x, py + .05, pz + .3, 0, 0, .4, .2, .2), [.6, .55, .45]); }
  if (!s.well.float) R.draw('sph', M4.trs(4.7, WELL.plat + .9, -9.62, 0, 0, .09, .14, .09), [.9, .8, .1]); else R.draw('sph', M4.trs(5.2, Math.min(-5 + LSH_H, wy + .06), -9.2, 0, 0, .09, .14, .09), [.9, .8, .1]);
  R.draw('sph', M4.trs(5.5, Math.max(-5 + .5, Math.min(wy + .06, -4.4)), -9.2, 0, 0, .09, .14, .09), [.9, .3, .1]);
  // szellőztető lapát, aggregát, kanna, névjegy, alak
  R.draw('box', M4.trs(10.8, .7, -4.58, s.well.vent && lp ? t * 20 : 0, 1.5708, .7, .06, .06), [.2, .2, .2]);
  if (!s.f.tookKanna) B(-6.55, 0, 3.45, -6.05, .48, 3.95, [.75, .1, .08]);
  if (s.ch === 6) B(51.85, .3, -22.15, 52.15, .31, -21.85, [1, 1, 1], .6);
  if (s.f.figure) { const f = s.f.figure; R.draw('box', M4.trs(f.x, .9, f.z, 0, 0, .45, 1.8, .3), [.02, .02, .02]); R.draw('sph', M4.trs(f.x, 1.95, f.z, 0, 0, .16, .18, .16), [.02, .02, .02]); }
  // részecskék: eső, csepegés, kipufogó
  let n = 0; const add = (x, y, z, r, g, b, a, sz) => { const o = n * 8; parts[o] = x; parts[o + 1] = y; parts[o + 2] = z; parts[o + 3] = r; parts[o + 4] = g; parts[o + 5] = b; parts[o + 6] = a; parts[o + 7] = sz; n++; };
  { const rn = Math.round(q.rain * (s.ch === 5 ? 1 : .7)); if (!(S.ch === 6 && S.t - S.f.dawn > 25) && (!rain || rain.length !== rn * 3)) buildRain(rn); }
  if (rain && !s.well.in && !(S.ch === 6 && S.t - S.f.dawn > 25)) { const sp = 16 * dt, cnt = rain.length / 3; for (let i = 0; i < cnt; i++) { let y = rain[i * 3 + 1] - sp; if (y < 0) y += 14; rain[i * 3 + 1] = y; const x = P.x + rain[i * 3], z = P.z + rain[i * 3 + 2]; if (indoor(x, z) && y < 2.8) continue; add(x, y, z, .6, .65, .75, .35, .045); } }
  if (s.well.in || Math.hypot(P.x - 8, P.z + 8) < 6) for (const d of drops) { d.y -= dt * 6; } drops = drops.filter(d => d.y > WELL.floor + s.lvl); if (s.well.in && Math.random() < .3) drops.push({ x: 4.5 + Math.random() * 7, y: -.1, z: -11.5 + Math.random() * 7 }); for (const d of drops) add(d.x, d.y, d.z, .5, .6, .6, .7, .04);
  if (s.gen.run) for (let i = 0; i < 14; i++) { const k = ((t * .6 + i / 14) % 1); add(-21 + k * .4, 2.4 + k * 2.4, -18 + Math.sin(i + t) * .2 * k, .3, .3, .32, .35 * (1 - k), .25 + k * .3); }
  R.points(parts, n, .5);
  // kézben: zseblámpa, gázérzékelő
  const bob = Math.sin(footD * 3.9) * .01, hp = [];
  hp.push(['cyl', M4.trs(.22 + bob, -.2, -.38, 0, -1.45, .035, .2, .035), [.15, .15, .17]]); if (s.flash) hp.push(['cyl', M4.trs(.22 + bob, -.2, -.585, 0, -1.45, .04, .012, .04), [1, .97, .85], 3]);
  if (s.well.in || s.well.h2s > 1) { const g = s.well.h2s; hp.push(['box', M4.trs(-.2, -.2 + bob, -.4, 0, .5, .07, .11, .03), [.95, .75, .1]]); hp.push(['box', M4.trs(-.2, -.18 + bob, -.384, 0, .5, .05, .04, .005), g >= 10 ? [1, .2, .1] : g >= 5 ? [1, .8, .2] : [.4, 1, .5], 1.5]); }
  const HS = M4.trs(.06, -.06, -.16, 0, 0, .55, .55, .55); R.hand(70 * Math.PI / 180, hp.map(x => [x[0], M4.mul(HS, x[1]), x[2], x[3]]), [.35, .35, .38].map(v => v + (s.flash ? .2 : 0))); }

/* ---------- HUD ---------- */
function hud(now, dt, W, H, D) { if (!playing || !S) return; h.setTransform(D, 0, 0, D, 0, 0); const s = S;
  const rr = (x, y, w, hh, r) => { h.beginPath(); h.moveTo(x + r, y); h.arcTo(x + w, y, x + w, y + hh, r); h.arcTo(x + w, y + hh, x, y + hh, r); h.arcTo(x, y + hh, x, y, r); h.arcTo(x, y, x + w, y, r); h.closePath(); };
  h.textBaseline = 'middle';
  // célok
  const ob = objectives(); h.font = '600 13px Inter, sans-serif'; const ow = Math.min(W - 24, Math.max(...ob.map(o => h.measureText(o).width)) + 28); h.fillStyle = 'rgba(6,9,14,.62)'; rr(12, 12, ow, 30 + ob.length * 19, 10); h.fill();
  h.fillStyle = '#e8b656'; h.font = '800 10px Inter'; h.textAlign = 'left'; h.fillText((s.ch <= 5 ? s.ch + '. FEJEZET · ' : 'EPILÓGUS · ') + CHAPTERS[s.ch - 1].toUpperCase(), 24, 27); h.font = '600 13px Inter'; ob.forEach((o, i) => { h.fillStyle = o.startsWith('✓') ? '#7fcf8f' : '#fff'; h.fillText(o, 24, 47 + i * 19); });
  // szintjelző
  if (SET.lvl) { const x = 12, y = H - 70, w = 190, k = s.lvl / 4, warn = s.lvl > 3.0; h.fillStyle = 'rgba(6,9,14,.62)'; rr(x, y, w, 56, 10); h.fill(); h.font = '800 10px Inter'; h.fillStyle = warn && Math.sin(now / 150) > 0 ? '#ff5a4d' : '#8b9ab0'; h.fillText('MEDENCESZINT', x + 12, y + 14);
    h.fillStyle = '#fff'; h.font = '800 18px Inter'; h.fillText(s.lvl.toFixed(2).replace('.', ',') + ' m' + (s.qin > (s.run[0] || s.run[1] ? .0095 * ((s.run[0] || 0) + (s.run[1] || 0)) : 0) ? ' ▲' : ' ▼'), x + 12, y + 34);
    h.fillStyle = 'rgba(255,255,255,.12)'; h.fillRect(x + 12, y + 46, w - 24, 5); h.fillStyle = warn ? '#ff5a4d' : s.lvl > 2.5 ? '#ffd84a' : '#5ee08a'; h.fillRect(x + 12, y + 46, (w - 24) * Math.min(1, k), 5); h.fillStyle = '#ff5a4d'; h.fillRect(x + 12 + (w - 24) * OVER / 4, y + 43, 2, 11); }
  // gázmérő
  if (s.well.in || s.well.h2s > .5) { const g = s.well.h2s, x = 214, y = H - 70; h.fillStyle = 'rgba(6,9,14,.62)'; rr(x, y, 130, 56, 10); h.fill(); h.font = '800 10px Inter'; h.fillStyle = g >= 10 ? '#ff5a4d' : g >= 5 ? '#ffd84a' : '#8b9ab0'; h.fillText(g >= 10 ? 'H₂S · A2 RIASZTÁS' : g >= 5 ? 'H₂S · A1' : 'H₂S', x + 12, y + 14); h.fillStyle = '#fff'; h.font = '800 18px Inter'; h.fillText(g.toFixed(1).replace('.', ',') + ' ppm', x + 12, y + 36); }
  if (s.bat < .3) { h.font = '700 12px Inter'; h.textAlign = 'right'; h.fillStyle = s.bat < .1 ? '#ff5a4d' : '#ffd84a'; h.fillText('Zseblámpa elem: ' + Math.round(s.bat * 100) + '%' + (s.inv.elem ? '  (R – csere)' : ''), W - 16, H - 20); h.textAlign = 'left'; }
  // célkereszt, felirat, tartás
  const cx = W / 2, cy = H / 2; h.fillStyle = target ? '#ffe29a' : 'rgba(255,255,255,.5)'; h.beginPath(); h.arc(cx, cy, target ? 3.5 : 2, 0, 6.283); h.fill();
  if (target && !holdA) { const t = '[' + (TOUCH ? 'HASZNÁL' : 'E') + '] ' + target.label; h.font = '700 14px Inter'; const w = h.measureText(t).width + 24; h.fillStyle = 'rgba(6,9,14,.72)'; rr(cx - w / 2, cy + 22, w, 28, 10); h.fill(); h.fillStyle = '#fff'; h.textAlign = 'center'; h.fillText(t, cx, cy + 37); h.textAlign = 'left'; }
  if (holdA) { h.strokeStyle = 'rgba(255,255,255,.2)'; h.lineWidth = 5; h.beginPath(); h.arc(cx, cy, 22, 0, 6.283); h.stroke(); h.strokeStyle = '#e8b656'; h.beginPath(); h.arc(cx, cy, 22, -1.5708, -1.5708 + 6.283 * holdA.p); h.stroke(); h.font = '700 13px Inter'; h.textAlign = 'center'; h.fillStyle = '#fff'; h.fillText(holdA.n, cx, cy + 44); h.textAlign = 'left'; }
  if (banner) { banner.l -= dt; h.globalAlpha = Math.min(1, banner.l, (4 - banner.l) * 2); h.textAlign = 'center'; h.font = '800 12px Inter'; h.fillStyle = '#8b9ab0'; h.fillText(banner.a.toUpperCase(), cx, H * .3 - 26); h.font = `900 ${Math.min(44, W / 13)}px Cinzel, Georgia, serif`; h.fillStyle = '#e8b656'; h.fillText(banner.b, cx, H * .3 + 6); h.globalAlpha = 1; h.textAlign = 'left'; if (banner.l <= 0) banner = null; }
  if (T.mv) { h.strokeStyle = 'rgba(255,255,255,.3)'; h.lineWidth = 2; h.beginPath(); h.arc(T.mv.x0, T.mv.y0, 50, 0, 6.283); h.stroke(); }
  if (s.well.h2s >= 15) { h.fillStyle = `rgba(120,140,40,${Math.min(.45, (s.well.faintT || 0) / 30)})`; h.fillRect(0, 0, W, H); }
  if (flash > .3) { h.fillStyle = `rgba(220,230,255,${(flash - .3) * .25})`; h.fillRect(0, 0, W, H); } }

/* ---------- indulás ---------- */
requestAnimationFrame(frame); menu();
(async () => { try { core = await import('../../js/core.js?v=202611211432'); if (!core || core.notConfigured || !core.auth) return; core.FB.onAuthStateChanged(core.auth, u => { user = u && !u.isAnonymous ? u : null; if (user) cloudLoad(); }); } catch (e) { console.warn(e); } })();
window.__at = () => ({ S, P, L, UI, act, check, setCh, CP, target, holdA, start, SET });
