// Locsolóháború – kliens: menü, váróterem, hálózat, előrejelzés, megjelenítés, HUD, hang, irányítás, beállítások.
import { TICK, MODES, WEAPONS, GOLD, COLORS, TEAMC, ENT, newWorld, step, encodeSnap, decodeSnap, encodeInput, decodeInput, worldFromSnap } from './jatek.js?v=202611231642';
import { MAPS, mapOf, movePlayer, raycast, pointSolid, eyeH, PR, PH, CH, B_JUMP, B_CROUCH, B_RUN, B_FIRE, B_RELOAD, B_AIM } from './vilag.js?v=202611231642';
import { createRenderer, M4, hex } from './motor.js?v=202611231642';
import { joinRoom, localSignal, fireSignal } from '../../js/net.js?v=202611231642';

const $ = s => document.querySelector(s), Q = new URLSearchParams(location.search), LOCAL = Q.has('local'), GAME = 'locsolohaboru';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cv = $('#c'), hc = $('#h'), h = hc.getContext('2d'), R = createRenderer(cv), TOUCH = matchMedia('(pointer: coarse)').matches;
let me = { uid: '', name: 'Vendég', color: COLORS[0] }, core = null, sig = null, net = null, roomId = null, room = null, friends = null;
let lobby = { cfg: { mode: 'ffa', map: 'kert', fill: 6 }, pl: [], st: 'lobby' }, G = null, practice = false;

/* ---------- beállítások (a böngészőben mentve) ---------- */
const KEYDEF = { fwd: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space', crouch: 'KeyC', run: 'ShiftLeft', reload: 'KeyR', aim: 'KeyE', scores: 'Tab' };
const KEYN = { fwd: 'Előre', back: 'Hátra', left: 'Balra', right: 'Jobbra', jump: 'Ugrás', crouch: 'Guggolás', run: 'Futás', reload: 'Újratöltés', aim: 'Célzás (jobb egérgomb is)', scores: 'Eredménytábla' };
const QUAL = [{ s: .6, far: 48, parts: 350, dec: 40 }, { s: .85, far: 72, parts: 1000, dec: 120 }, { s: 1, far: 100, parts: 2200, dec: 260 }];
let SET = { sens: 1, fov: 85, vol: .7, q: TOUCH ? 0 : 1, keys: { ...KEYDEF } };
try { const s = JSON.parse(localStorage.getItem('hgws_lh_set') || 'null'); if (s) SET = { ...SET, ...s, keys: { ...KEYDEF, ...(s.keys || {}) } }; } catch (_) {}
const saveSet = () => { try { localStorage.setItem('hgws_lh_set', JSON.stringify(SET)); } catch (_) {} };

const toastEl = $('#toast'); let toastT = 0;
function toast(t) { toastEl.textContent = t; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2600); }
function status(t, k = 'info') { for (const el of [$('#st'), $('#lSt'), $('#rSt')]) { el.textContent = t || ''; if (el.id === 'st') el.className = k; } if (G && t) G.note = { t, l: 4 }; }
const SCR = ['menu', 'lobby', 'res', 'pause', 'sets']; let back = 'menu';
function show(id) { for (const s of SCR) $('#' + s).hidden = s !== id; $('#tc').hidden = !(TOUCH && G && !id); }

/* ---------- indulás, azonosítás ---------- */
function fillSel(el, list, val) { el.innerHTML = list.map(([v, n]) => `<option value="${v}">${esc(n)}</option>`).join(''); el.value = val; }
for (const p of ['m', 'l']) { fillSel($('#' + p + 'Mode'), MODES.map(m => [m.id, m.n]), 'ffa'); fillSel($('#' + p + 'Map'), MAPS.map(m => [m.id, m.n]), 'kert'); fillSel($('#' + p + 'Fill'), [2, 3, 4, 5, 6, 7, 8].map(n => [n, n + ' fő']), 6); }
async function boot() {
  if (!R) { $('#st').textContent = 'A böngésződ nem támogatja a WebGL-t, ezért a játék nem indítható.'; $('#mSolo').disabled = $('#mCreate').disabled = true; return; }
  if (LOCAL) { me = { uid: Q.get('uid') || 'u' + Math.random().toString(36).slice(2, 7), name: Q.get('name') || 'Teszt', color: COLORS[0] }; sig = localSignal('hgws_lh'); return ready(); }
  try { core = await import('../../js/core.js?v=202611231642'); } catch (e) { console.warn(e); }
  if (!core || core.notConfigured || !core.auth) return ready();
  core.FB.onAuthStateChanged(core.auth, async u => {
    if (u && !u.isAnonymous) { me = { uid: u.uid, name: u.displayName || 'Tag', color: COLORS[0] }; try { const s = await core.FB.getDoc(core.FB.doc(core.db, 'users', u.uid)); if (s.exists()) { me.name = s.data().name || me.name; if (COLORS.includes(s.data().color)) me.color = s.data().color; } } catch (_) {} sig = fireSignal(core.FB, core.db); }
    ready(); });
}
let booted = false;
function ready() { $('#mCreate').disabled = !sig; $('#rmH').hidden = !sig; if (!sig) $('#st').textContent = 'Szobát létrehozni és barátokhoz csatlakozni bejelentkezve lehet – gyakorolni botok ellen így is tudsz.';
  if (booted) return; booted = true;
  if (sig) sig.list(me.uid, rooms => { const l = rooms.filter(r => r.game === GAME && r.host !== me.uid && r.members.length < r.max);
    $('#rooms').innerHTML = l.length ? l.map(r => `<div class="rm"><b class="grow">${esc(r.hostName)} szobája</b><span style="color:var(--mut)">${esc((MODES.find(m => m.id === r.mode) || MODES[0]).n)} · ${esc(mapOf(r.map).n)} · ${r.members.length}/${r.max}${r.state === 'play' ? ' · meccs közben' : ''}</span><button class="b sm go" data-join="${esc(r.id)}">Belépés</button></div>`).join('') : '<div style="color:var(--mut)">Most nincs nyitott szoba.</div>'; });
  const rid = Q.get('room'); if (rid && sig) enterRoom(rid); }
$('#rooms').onclick = e => { const b = e.target.closest('[data-join]'); if (b) enterRoom(b.dataset.join); };
async function loadFriends() { if (friends) return friends; friends = []; if (LOCAL || !core) return friends;
  try { const FB = core.FB, s = await FB.getDocs(FB.query(FB.collection(core.db, 'friends'), FB.where('users', 'array-contains', me.uid))); const ids = s.docs.map(d => d.data()).filter(d => d.status === 'accepted').map(d => d.users.find(u => u !== me.uid)).slice(0, 100);
    friends = await Promise.all(ids.map(async (id, i) => { let name = 'Barát'; if (i < 30) try { const u = await FB.getDoc(FB.doc(core.db, 'users', id)); if (u.exists()) name = u.data().name || name; } catch (_) {} return { id, name }; })); } catch (e) { console.warn(e); }
  return friends; }

/* ---------- szoba, váróterem ---------- */
$('#mSolo').onclick = () => { practice = true; const n = +$('#mFill').value; lockPointer(); startHost({ mode: $('#mMode').value, map: $('#mMap').value, slots: [{ uid: me.uid || 'en', name: me.name, color: me.color }, ...Array.from({ length: n - 1 }, (_, i) => ({ uid: 'bot' + i, bot: 1, color: COLORS[(i + 1) % 8] }))] }); };
$('#mCreate').onclick = async () => { if (!sig) return; $('#mCreate').disabled = true; status('Szoba létrehozása…');
  try { const fr = await loadFriends(), open = $('#mOpen').checked; lobby.cfg = { mode: $('#mMode').value, map: $('#mMap').value, fill: +$('#mFill').value };
    const id = await sig.create({ host: me.uid, hostName: me.name, game: GAME, mode: lobby.cfg.mode, map: lobby.cfg.map, max: 8, open, state: 'lobby', members: [me.uid], vis: open ? fr.map(f => f.id) : [] }); await enterRoom(id, true); }
  catch (e) { console.warn(e); status('Nem sikerült létrehozni a szobát.', 'err'); } $('#mCreate').disabled = false; };
async function enterRoom(id, mine) { if (net) return; practice = false; roomId = id; status('Belépés a szobába…');
  if (!mine) { try { await sig.join(id, me.uid); } catch (e) { console.warn(e); status('Ebbe a szobába nem léphetsz be (csak a gazda barátai, és csak ha van hely).', 'err'); roomId = null; return; } }
  lobby.pl = []; lobby.st = 'lobby'; net = joinRoom({ sig, id, me: me.uid, name: me.name, lag: +Q.get('lag') || 0, loss: +Q.get('loss') || 0, on: { room: onRoom, role: onRole, peer: onPeer, msg: onMsg, status } });
  window.__net = net; back = 'lobby'; show('lobby'); renderLobby(); }
async function leaveRoom(msg) { const n = net; net = null; roomId = null; room = null; G = null; lobby.pl = []; unlockPointer(); back = 'menu'; if (n) await n.close(true); show('menu'); status(msg || '', msg ? 'warn' : 'info'); }
function onRoom(r) { if (!net) return; if (!r) return void leaveRoom('A szoba megszűnt.'); room = r; renderLobby(); }
function onRole(isHost, why) {
  if (isHost) { const mine = { uid: me.uid, name: me.name, color: (lobby.pl.find(p => p.uid === me.uid) || me).color, ready: true };
    if (why === 'migrate' && G && !G.host) { takeOver(); lobby.pl = lobby.pl.filter(p => p.uid === me.uid || net.peers().includes(p.uid)); if (!lobby.pl.some(p => p.uid === me.uid)) lobby.pl.unshift(mine); }
    else { lobby.pl = [mine]; lobby.st = G ? 'play' : 'lobby'; }
    toast(why === 'migrate' ? 'Te lettél a gazda.' : 'Szoba létrehozva.'); }
  else if (G && G.host) { G.host = false; G.W = null; }
  renderLobby(); }
function onPeer(uid, up) {
  if (net.isHost()) { if (!up) { lobby.pl = lobby.pl.filter(p => p.uid !== uid); if (G && G.W) { const p = G.W.P.find(q => q.uid === uid); if (p && !p.bot) { p.bot = true; p.dc = 1; feed(p.name + ' kapcsolata megszakadt – bot vette át'); } } sendLobby(); } }
  else if (up) { net.send(JSON.stringify({ e: 'hi', name: me.name, color: (lobby.pl.find(p => p.uid === me.uid) || me).color }), true); status(''); }
  else status('A kapcsolat megszakadt – újracsatlakozás…', 'warn'); }
function sendLobby() { if (!net || !net.isHost()) return; net.broadcast(JSON.stringify({ e: 'lobby', cfg: lobby.cfg, pl: lobby.pl, st: lobby.st }), true); renderLobby(); }
function freeColor(want, uid) { const used = lobby.pl.filter(p => p.uid !== uid).map(p => p.color); return !used.includes(want) && COLORS.includes(want) ? want : COLORS.find(c => !used.includes(c)) || COLORS[0]; }
function onMsg(from, d) {
  if (typeof d !== 'string') { const ty = new DataView(d).getUint8(0);
    if (ty === 1 && G && !G.host) onSnap(d); else if (ty === 2 && G && G.host && G.W) { const p = G.W.P.find(q => q.uid === from); if (p && !p.bot) { const i = decodeInput(d); if (!p.q.length || ((i.seq - p.q[p.q.length - 1].seq) & 65535) < 32768) p.q.push(i); } } return; }
  let m; try { m = JSON.parse(d); } catch (_) { return; }
  if (net.isHost()) {
    if (m.e === 'hi') { let p = lobby.pl.find(q => q.uid === from); if (!p) { p = { uid: from, ready: false }; lobby.pl.push(p); } p.name = String(m.name || 'Tag').slice(0, 24); p.color = freeColor(m.color, from);
      if (G && G.W) { const s = G.W.P.find(q => q.uid === from); if (s) { s.bot = false; s.dc = 0; s.q.length = 0; feed(s.name + ' visszatért'); } net.sendTo(from, JSON.stringify({ e: 'start', cfg: G.cfg, resume: 1 }), true); } sendLobby(); }
    else if (m.e === 'me') { const p = lobby.pl.find(q => q.uid === from); if (p) { if (m.color) p.color = freeColor(m.color, from); if (m.ready != null) p.ready = !!m.ready; sendLobby(); } }
    return; }
  if (m.e === 'lobby') { lobby.cfg = m.cfg; lobby.pl = m.pl; lobby.st = m.st; if (m.st === 'lobby' && G) { G = null; unlockPointer(); show('lobby'); } renderLobby(); }
  else if (m.e === 'start') { if (!G || G.cfg.map !== m.cfg.map || !m.resume) startGuest(m.cfg); }
  else onEvent(m); }
function renderLobby() { if (!net) return; const host = net.isHost(), c = lobby.cfg, mineP = lobby.pl.find(p => p.uid === me.uid);
  $('#lSub').textContent = room ? (room.hostName || '') + ' szobája' + (room.open ? ' · nyitott a barátoknak' : ' · privát') : '';
  $('#lPl').innerHTML = lobby.pl.map(p => `<div class="p${p.ready ? ' rdy' : ''}"><i style="background:${esc(p.color)}"></i><b>${esc(p.name)}</b><small>${room && p.uid === room.host ? 'GAZDA' : p.ready ? 'KÉSZ' : 'vár'}</small></div>`).join('') || '<div style="color:var(--mut)">Csatlakozás…</div>';
  const used = lobby.pl.filter(p => p.uid !== me.uid).map(p => p.color); $('#lSw').innerHTML = COLORS.map(col => `<button data-c="${col}" class="${mineP && mineP.color === col ? 'on' : ''}" style="background:${col};${used.includes(col) ? 'opacity:.2' : ''}"></button>`).join('');
  $('#lHost').hidden = !host; $('#lStart').hidden = !host; $('#lReady').hidden = !!host; $('#lReady').textContent = mineP && mineP.ready ? 'Mégsem' : 'Kész'; $('#lReady').classList.toggle('on', !!(mineP && mineP.ready));
  const md = MODES.find(m => m.id === c.mode) || MODES[0]; $('#lInfo').textContent = md.n + ' · ' + mapOf(c.map).n + ' · ' + Math.max(c.fill, lobby.pl.length) + ' fő' + (c.fill > lobby.pl.length ? ' (' + (c.fill - lobby.pl.length) + ' bot)' : '') + ' — ' + md.d;
  if (host) { $('#lMode').value = c.mode; $('#lMap').value = c.map; $('#lFill').value = c.fill; $('#lLink').value = location.origin + '/app.html#/arcade/' + GAME + '.' + roomId; const wait = lobby.pl.filter(p => p.uid !== me.uid && !p.ready).length; $('#lStart').disabled = wait > 0 || Math.max(c.fill, lobby.pl.length) < 2; if (!$('#lSt').textContent || /vár/.test($('#lSt').textContent)) $('#lSt').textContent = wait ? wait + ' játékosra várunk…' : '';
    if (!$('#lFr').dataset.done) { $('#lFr').dataset.done = 1; loadFriends().then(fr => { $('#lFr').innerHTML = fr.length ? fr.slice(0, 30).map(f => `<button class="b sm" data-inv="${esc(f.id)}">${esc(f.name)}</button>`).join('') : '<span style="color:var(--mut)">Nincs még barátod, akit meghívhatnál – a linket így is elküldheted.</span>'; }); } } }
$('#lSw').onclick = e => { const b = e.target.closest('[data-c]'); if (!b || !net) return; if (net.isHost()) { const p = lobby.pl.find(q => q.uid === me.uid); if (p) { p.color = freeColor(b.dataset.c, me.uid); me.color = p.color; sendLobby(); } } else { me.color = b.dataset.c; net.send(JSON.stringify({ e: 'me', color: b.dataset.c }), true); } };
$('#lReady').onclick = () => { const p = lobby.pl.find(q => q.uid === me.uid); if (net && !net.isHost()) net.send(JSON.stringify({ e: 'me', ready: !(p && p.ready) }), true); };
for (const k of ['Mode', 'Map', 'Fill']) $('#l' + k).onchange = () => { if (!net || !net.isHost()) return; lobby.cfg = { mode: $('#lMode').value, map: $('#lMap').value, fill: +$('#lFill').value }; sendLobby(); };
$('#lFr').onclick = async e => { const b = e.target.closest('[data-inv]'); if (!b || !room) return; b.disabled = true; const id = b.dataset.inv;
  try { if (!(room.vis || []).includes(id)) await sig.update(roomId, { vis: [...(room.vis || []), id].slice(0, 100) }); if (core) await core.notify(id, 'game', me.name + ' meghívott egy Locsolóháború-meccsre', '#/arcade/' + GAME + '.' + roomId); b.textContent += ' ✓'; } catch (err) { console.warn(err); b.disabled = false; toast('A meghívót nem sikerült elküldeni.'); } };
$('#lCopy').onclick = async () => { const el = $('#lLink'); try { await navigator.clipboard.writeText(el.value); toast('Link a vágólapon.'); } catch (_) { el.focus(); el.select(); toast('Jelöld ki és másold a linket.'); } };
$('#lLeave').onclick = () => leaveRoom(); $('#rLeave').onclick = () => { if (net) leaveRoom(); else { G = null; show('menu'); } }; $('#pLeave').onclick = () => { if (net) leaveRoom(); else { G = null; unlockPointer(); show('menu'); } };
$('#lStart').onclick = () => { if (!net || !net.isHost()) return; const hum = lobby.pl.slice(0, 8), n = Math.min(8, Math.max(lobby.cfg.fill, hum.length)); if (n < 2) return;
  const cfg = { mode: lobby.cfg.mode, map: lobby.cfg.map, slots: [...hum.map(p => ({ uid: p.uid, name: p.name, color: p.color })), ...Array.from({ length: n - hum.length }, (_, i) => ({ uid: 'bot' + i, bot: 1 }))] };
  const usedC = hum.map(p => p.color); cfg.slots.forEach(s => { if (s.bot) { s.color = COLORS.find(c => !usedC.includes(c)) || COLORS[0]; usedC.push(s.color); } });
  lobby.st = 'play'; sig.update(roomId, { state: 'play', mode: cfg.mode, map: cfg.map }).catch(() => {}); lockPointer(); net.broadcast(JSON.stringify({ e: 'start', cfg }), true); startHost(cfg); sendLobby(); };
$('#rAgain').onclick = () => { if (practice) { lockPointer(); return startHost(G.cfg); } if (!net) return; G = null; back = 'lobby'; show('lobby'); if (net.isHost()) { lobby.st = 'lobby'; lobby.pl.forEach(p => { p.ready = p.uid === me.uid; }); sig.update(roomId, { state: 'lobby' }).catch(() => {}); sendLobby(); } else status('A gazda indítja a visszavágót…'); renderLobby(); };

/* ---------- beállítások panel ---------- */
let setBack = 'menu', rebind = null;
function openSets(from) { setBack = from; show('sets'); const u = () => { $('#vSens').textContent = (+SET.sens).toFixed(2); $('#vFov').textContent = SET.fov + '°'; $('#vVol').textContent = Math.round(SET.vol * 100) + '%'; };
  $('#sSens').value = SET.sens; $('#sFov').value = SET.fov; $('#sVol').value = SET.vol; $('#sQ').value = SET.q; u();
  $('#sSens').oninput = () => { SET.sens = +$('#sSens').value; u(); saveSet(); }; $('#sFov').oninput = () => { SET.fov = +$('#sFov').value; u(); saveSet(); }; $('#sVol').oninput = () => { SET.vol = +$('#sVol').value; u(); saveSet(); Snd.vol(); }; $('#sQ').onchange = () => { SET.q = +$('#sQ').value; saveSet(); if (G) G.decals.l.length = 0; };
  keysUI(); }
const keyName = c => ({ Space: 'Szóköz', ShiftLeft: 'Bal Shift', ShiftRight: 'Jobb Shift', ControlLeft: 'Bal Ctrl', ControlRight: 'Jobb Ctrl', Tab: 'Tab', AltLeft: 'Alt' }[c] || c.replace(/^Key|^Digit/, ''));
function keysUI() { $('#sKeys').innerHTML = Object.keys(KEYDEF).map(k => `<div class="k"><span>${KEYN[k]}</span><button class="b sm${rebind === k ? ' on' : ''}" data-k="${k}">${rebind === k ? '…' : esc(keyName(SET.keys[k]))}</button></div>`).join(''); }
$('#sKeys').onclick = e => { const b = e.target.closest('[data-k]'); if (b) { rebind = b.dataset.k; keysUI(); } };
$('#sReset').onclick = () => { SET.keys = { ...KEYDEF }; saveSet(); keysUI(); };
$('#sOk').onclick = () => { rebind = null; if (setBack === 'pause') show('pause'); else show(setBack); };
$('#mSet').onclick = () => openSets('menu'); $('#lSet').onclick = () => openSets('lobby'); $('#pSet').onclick = () => openSets('pause');
$('#pResume').onclick = () => { show(''); lockPointer(); };

/* ---------- hang (WebAudio, szintetizált) ---------- */
const Snd = (() => { let ac = null, master = null, noise = null, hose = null;
  const ctx = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.connect(ac.destination); const b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; noise = b; } catch (_) {} } if (ac && ac.state === 'suspended') ac.resume(); if (master) master.gain.value = SET.vol; return ac; };
  const burst = (f, q, dur, vol, type = 'bandpass') => { const a = ctx(); if (!a) return; const s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); s.buffer = noise; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.setValueAtTime(vol, a.currentTime); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + dur); s.connect(fl); fl.connect(g); g.connect(master); s.start(0, Math.random() * .5); s.stop(a.currentTime + dur + .02); };
  const tone = (f0, f1, dur, vol, type = 'sine') => { const a = ctx(); if (!a) return; const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f0, a.currentTime); o.frequency.exponentialRampToValueAtTime(f1, a.currentTime + dur); g.gain.setValueAtTime(vol, a.currentTime); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + dur); o.connect(g); g.connect(master); o.start(); o.stop(a.currentTime + dur + .02); };
  return { ctx, vol() { if (master) master.gain.value = SET.vol; },
    shot(w, k = 1) { if (k < .03) return; if (w === 0) burst(1800, 1.4, .09, .35 * k); else if (w === 1) { burst(900, .8, .22, .55 * k); burst(300, .7, .12, .3 * k, 'lowpass'); } else if (w === 2) { burst(2600, 2, .3, .45 * k); tone(160, 50, .2, .35 * k); } else if (w === 3) burst(1300, 1, .06, .12 * k); else if (w === 4) tone(300, 140, .15, .2 * k, 'triangle'); else burst(2200, 1.2, .07, .3 * k); },
    hoseLoop(on) { const a = ctx(); if (!a) return; if (on && !hose) { const s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); s.buffer = noise; s.loop = true; fl.type = 'bandpass'; fl.frequency.value = 1400; fl.Q.value = 1; g.gain.value = .18; s.connect(fl); fl.connect(g); g.connect(master); s.start(); hose = { s, g }; } else if (!on && hose) { const x = hose; hose = null; x.g.gain.setTargetAtTime(0, a.currentTime, .04); setTimeout(() => { try { x.s.stop(); } catch (_) {} }, 200); } },
    splash(k = 1) { burst(500, .6, .35, .35 * k, 'lowpass'); }, boom(k = 1) { burst(300, .5, .7, .9 * k, 'lowpass'); tone(90, 40, .5, .5 * k); },
    hit() { tone(1300, 1100, .06, .18, 'square'); }, ko() { tone(700, 180, .4, .25, 'triangle'); }, pick() { tone(660, 990, .12, .2); setTimeout(() => tone(990, 1320, .15, .2), 90); }, reload() { burst(700, 3, .25, .15); }, step() { burst(200, .7, .05, .05, 'lowpass'); } };
})();

/* ---------- egér / billentyű / érintés ---------- */
const keys = new Set(), look = { yaw: 0, pitch: 0 }, btn = { fire: 0, aim: 0 }; let wsel = 0, locked = false, scoresOn = false;
function lockPointer() { if (TOUCH) return; Snd.ctx(); try { const r = cv.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (_) {} }
function unlockPointer() { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (_) {} }
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === cv; if (locked && G && !$('#pause').hidden) show(''); if (!locked && G && !G.ended && $('#res').hidden && $('#sets').hidden) { keys.clear(); btn.fire = 0; show('pause'); } });
const act = c => Object.keys(SET.keys).find(k => SET.keys[k] === c);
addEventListener('keydown', e => { if (rebind) { e.preventDefault(); if (e.code !== 'Escape') { SET.keys[rebind] = e.code; saveSet(); } rebind = null; keysUI(); return; }
  if (!G || !$('#pause').hidden || !$('#sets').hidden || !$('#lobby').hidden) return; const a = act(e.code); if (a) { keys.add(a); e.preventDefault(); if (a === 'scores') scoresOn = true; }
  if (/^Digit[1-5]$/.test(e.code)) wsel = +e.code[5] - 1; if (e.code === 'KeyQ') wsel = (wsel + 4) % 5; if (e.code === 'KeyG') { wsel = 4; } });
addEventListener('keyup', e => { const a = act(e.code); if (a) { keys.delete(a); if (a === 'scores') scoresOn = false; } });
addEventListener('blur', () => { keys.clear(); btn.fire = btn.aim = 0; });
cv.addEventListener('mousedown', e => { if (!G) return; if (!locked && !TOUCH) { lockPointer(); return; } if (e.button === 0) btn.fire = 1; if (e.button === 2) btn.aim = 1; });
addEventListener('mouseup', e => { if (e.button === 0) btn.fire = 0; if (e.button === 2) btn.aim = 0; });
cv.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mousemove', e => { if (!locked || !G) return; const z = G.zoom > .5 ? .35 : 1, k = .0022 * SET.sens * z; look.yaw -= e.movementX * k; look.pitch = Math.max(-1.45, Math.min(1.45, look.pitch - e.movementY * k)); });
addEventListener('wheel', e => { if (G && locked) wsel = (wsel + (e.deltaY > 0 ? 1 : 4)) % 5; }, { passive: true });
// érintés: bal fél mozgás (virtuális kar), jobb fél nézelődés; gombok
const T = { mv: null, lk: null, b: {} };
const tc = $('#tc');
tc.addEventListener('pointerdown', e => { if (!G) return; Snd.ctx(); const b = e.target.closest('[data-b]'); if (b) { const k = b.dataset.b; b.classList.add('on'); T.b[e.pointerId] = { k, el: b };
    if (k === 'fire') btn.fire = 1; else if (k === 'aim') btn.aim = btn.aim ? 0 : 1; else if (k === 'wnext') wsel = (wsel + 1) % 5; else if (k === 'menu') show('pause'); else keys.add(k); e.preventDefault(); return; }
  if (e.clientX < innerWidth / 2) { if (!T.mv) T.mv = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY }; } else if (!T.lk) T.lk = { id: e.pointerId, x: e.clientX, y: e.clientY }; e.preventDefault(); });
tc.addEventListener('pointermove', e => { if (T.mv && T.mv.id === e.pointerId) { T.mv.x = e.clientX; T.mv.y = e.clientY; }
  if (T.lk && T.lk.id === e.pointerId) { const z = G && G.zoom > .5 ? .35 : 1, k = .006 * SET.sens * z; look.yaw -= (e.clientX - T.lk.x) * k; look.pitch = Math.max(-1.45, Math.min(1.45, look.pitch - (e.clientY - T.lk.y) * k)); T.lk.x = e.clientX; T.lk.y = e.clientY; } });
const tup = e => { const b = T.b[e.pointerId]; if (b) { delete T.b[e.pointerId]; if (b.k !== 'aim') b.el.classList.remove('on'); if (b.k === 'fire') btn.fire = 0; else if (['jump', 'crouch', 'reload'].includes(b.k)) keys.delete(b.k); } if (T.mv && T.mv.id === e.pointerId) T.mv = null; if (T.lk && T.lk.id === e.pointerId) T.lk = null; };
tc.addEventListener('pointerup', tup); tc.addEventListener('pointercancel', tup);
function sample() { const paused = !$('#pause').hidden || !$('#sets').hidden; let mx = (keys.has('fwd') ? 1 : 0) - (keys.has('back') ? 1 : 0), my = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
  if (T.mv) { const dx = T.mv.x - T.mv.x0, dy = T.mv.y - T.mv.y0, d = Math.hypot(dx, dy), k = Math.min(1, d / 50); if (d > 6) { mx = -dy / d * k; my = dx / d * k; } }
  let b = (keys.has('jump') ? B_JUMP : 0) | (keys.has('crouch') ? B_CROUCH : 0) | (keys.has('run') || (T.mv && Math.hypot(T.mv.x - T.mv.x0, T.mv.y - T.mv.y0) > 70) ? B_RUN : 0) | (btn.fire ? B_FIRE : 0) | (keys.has('reload') ? B_RELOAD : 0) | (btn.aim || keys.has('aim') ? B_AIM : 0);
  if (paused) { mx = my = 0; b = 0; }
  const i = { mx, my, b, w: wsel, yaw: look.yaw, pitch: look.pitch, vt: G ? G.vt : 0 }; if (window.__bot && G) Object.assign(i, window.__bot(G, i)); return i; }

/* ---------- meccs ---------- */
function baseGame(cfg) { const M = mapOf(cfg.map), slot = cfg.slots.findIndex(s => s.uid === (me.uid || 'en')); R.setMap(M); buildMini(M);
  return { cfg, M, md: MODES.find(m => m.id === cfg.mode) || MODES[0], slot, host: false, W: null, snaps: [], last: null, own: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 1, cr: 0, alive: 0, px: 0, py: 0, pz: 0 }, pend: [], seq: 0, ex: 0, ey: 0, ez: 0,
    parts: new Float32Array(8 * 3000), pl: [], decals: { l: [], dirty: 0, t: 0 }, fcd: {}, feedL: [], msg: null, note: null, stats: {}, ended: null, hold: 0, acc: 0, alpha: 0, zoom: 0, kick: 0, bob: 0, hm: 0, hmT: 0, vt: 0, wetFx: 0, deadT: 0, lastW: -1 }; }
function startHost(cfg) { G = baseGame(cfg); G.host = true; G.W = newWorld(cfg); const p = G.W.P[G.slot]; if (p) { look.yaw = p.yaw; look.pitch = 0; } wsel = 0; show(TOUCH || locked || practice ? '' : 'pause'); if (practice) show(''); status(''); banner(G.md.n.toUpperCase(), G.M.n); }
function startGuest(cfg) { G = baseGame(cfg); wsel = 0; show(locked || TOUCH ? '' : 'pause'); status(''); banner(G.md.n.toUpperCase(), G.M.n); }
function takeOver() { if (!G.last) { G.host = true; G.W = newWorld(G.cfg); return; } G.W = worldFromSnap(G.cfg, G.last, G.stats); G.host = true; G.hold = 2; G.snaps.length = 0;
  for (const p of G.W.P) if (!p.bot && p.uid !== me.uid) { p.bot = true; p.dc = 1; } const mine = G.W.P[G.slot]; if (mine) Object.assign(mine, { x: G.own.x, y: G.own.y, z: G.own.z });
  banner('GAZDAVÁLTÁS', 'A meccs mindjárt folytatódik'); lobby.st = 'play'; }
const banner = (a, b) => { if (G) G.msg = { a, b, l: 2.8 }; };
const feed = t => { if (G) { G.feedL.push({ t, l: 5 }); if (G.feedL.length > 5) G.feedL.shift(); } };
const nameOf = s => { const c = G.cfg.slots[s]; return c ? c.name || ['Locsi', 'Csepi', 'Slagos', 'Párás Pista', 'Zuhany', 'Tócsa', 'Harmat', 'Öntöző Ödön'][s % 8] : '?'; };
const colOf = s => { if (G.md.teams) return TEAMC[s % 2]; const c = G.cfg.slots[s]; return (c && c.color) || COLORS[s % 8]; };
function onEvent(m) { if (!G) return; const W0 = ['pisztoly', 'shotgun', 'mesterlövész', 'tömlő', 'vízibomba'];
  if (m.e === 'ko') { feed(m.a === 255 ? nameOf(m.b) + ' elázott' : nameOf(m.a) + ' ' + (W0[m.w] ? '[' + W0[m.w] + ']' : '') + ' → ' + nameOf(m.b)); const st = G.stats; if (m.a !== 255) (st[m.a] = st[m.a] || { kos: 0 }).kos++;
    if (m.b === G.slot) { G.deadT = 0; banner('ELÁZTÁL', m.a !== 255 ? nameOf(m.a) + ' eláztatott' : ''); Snd.ko(); } else if (m.a === G.slot) Snd.ko(); }
  else if (m.e === 'eko') { if (m.a === G.slot) Snd.hit(); splashAt(m.x, m.y + 1, m.z, 30, [.4, .8, .35]); }
  else if (m.e === 'boom') { splashAt(m.x, m.y, m.z, 90, [.6, .85, 1]); addDecal(m.x, Math.max(.01, m.y - .1), m.z, [0, 1, 0], 2.2); const d = camDist(m.x, m.y, m.z); Snd.boom(Math.max(.1, 1 - d / 40)); if (d < 6) G.wetFx = Math.max(G.wetFx, 1 - d / 6); }
  else if (m.e === 'gold') { feed(nameOf(m.s) + ' megszerezte az Arany Locsolófejet!'); if (m.s === G.slot) { banner('ARANY LOCSOLÓFEJ', 'Pár másodpercig legyőzhetetlen vagy'); Snd.pick(); } }
  else if (m.e === 'flag') { const tn = ['kék', 'piros'][m.t]; feed(m.ev === 'take' ? nameOf(m.s) + ' elvitte a ' + tn + ' locsolófejet' : m.ev === 'cap' ? nameOf(m.s) + ' PONTOT SZERZETT!' : m.ev === 'drop' ? 'A ' + tn + ' locsolófej a földre esett' : 'A ' + tn + ' locsolófej visszakerült'); if (m.ev === 'cap') banner('PONT!', nameOf(m.s) + ' hazavitte a locsolófejet'); }
  else if (m.e === 'wave') banner(m.n >= 5 ? 'SZIKKADT SZILÁRD' : m.n + '. HULLÁM', m.n >= 5 ? 'Áztasd el a főgonoszt!' : 'Jönnek a kaktuszok');
  else if (m.e === 'end') { G.ended = m; setTimeout(() => { if (G && G.ended === m) results(m); }, 2200); } }
function results(r) { unlockPointer(); const mine = r.pl.find(p => p.s === G.slot), won = r.win.includes(G.slot), coop = r.mode === 'coop';
  $('#rT').textContent = coop ? (r.boss ? 'SZILÁRD ELÁZOTT!' : 'A KERT KISZÁRADT') : !r.win.length ? 'DÖNTETLEN' : won ? 'GYŐZELEM!' : 'VERESÉG';
  const mvp = r.pl.find(p => p.s === r.mvp); $('#rS').textContent = (MODES.find(m => m.id === r.mode) || MODES[0]).n + ' · ' + mapOf(r.map).n + ' · ' + Math.floor(r.t / 60) + ':' + String(r.t % 60).padStart(2, '0') + (r.mode === 'tdm' || r.mode === 'ctf' ? ' · ' + r.score.join(' : ') : coop ? ' · ' + r.wave + '. hullám' : '') + (mvp ? ' · MVP: ' + mvp.n : '');
  $('#rTab').innerHTML = '<tr><th>Játékos</th><th>Kiütés</th><th>Elázás</th><th>Találat</th><th>Víz (l)</th>' + (r.mode === 'ctf' ? '<th>Pont</th>' : '') + '</tr>' + r.pl.slice().sort((a, b) => b.kos - a.kos || a.deaths - b.deaths).map(p => `<tr class="${p.s === G.slot ? 'me' : ''}${r.win.includes(p.s) ? ' win' : ''}"><td><span style="color:${esc(G.md.teams ? TEAMC[p.team] : p.c)}">●</span> ${esc(p.n)}${p.bot ? ' <small style="color:var(--mut)">bot</small>' : ''}${p.s === r.mvp ? ' ⭐' : ''}</td><td>${p.kos}</td><td>${p.deaths}</td><td>${p.hits}</td><td>${p.water}</td>${r.mode === 'ctf' ? `<td>${p.caps}</td>` : ''}</tr>`).join('');
  $('#rAgain').textContent = practice ? 'Újra' : 'Visszavágó'; show('res');
  if (!practice && mine && core && !LOCAL && r.pl.filter(p => !p.bot).length >= 2) saveStats(r, mine, won); }
async function saveStats(r, mine, won) { try { const FB = core.FB; await FB.setDoc(FB.doc(core.db, 'fpsstats', me.uid), { games: FB.increment(1), wins: FB.increment(won ? 1 : 0), kos: FB.increment(Math.min(60, mine.kos)), caps: FB.increment(Math.min(5, mine.caps)), boss: FB.increment(r.mode === 'coop' && r.boss ? 1 : 0), ['m_' + r.map]: FB.increment(1), updatedAt: FB.serverTimestamp() }, { merge: true }); } catch (e) { console.warn('statisztika', e); } }

/* ---------- ütem: gazda szimulál, vendég küld + előrejelez ---------- */
function tick() { if (!G) return; const i = sample();
  if (G.host) { const W = G.W; for (const p of W.P) { p.px = p.x; p.py = p.y; p.pz = p.z; }
    if (G.hold > 0) { G.hold -= TICK; if (net) net.broadcast(encodeSnap(W), false); return; }
    const p = W.P[G.slot]; if (p && !p.bot) { i.vt = W.tick; p.inp = i; } step(W);
    for (const ev of W.ev) { onEvent(ev); if (net) net.broadcast(JSON.stringify(ev), true); } W.ev.length = 0;
    const snap = encodeSnap(W); if (net && (!W.over || W.over < 3)) net.broadcast(snap, false); pushSnap(decodeSnap(snap));
  } else { i.seq = ++G.seq & 65535; if (net) net.send(encodeInput(i), false); const o = G.own; o.px = o.x; o.py = o.y; o.pz = o.z; if (o.alive && G.slot >= 0) { G.pend.push(i); if (G.pend.length > 90) G.pend.shift(); movePlayer(o, i, TICK, G.M); } }
  G.lastIn = i; }
function pushSnap(S) { G.snaps.push({ t: performance.now(), S }); if (G.snaps.length > 40) G.snaps.shift(); G.last = S; }
function onSnap(buf) { const S = decodeSnap(buf); if (G.last && S.tick <= G.last.tick && G.last.tick - S.tick < 900) return; pushSnap(S);
  const m = S.P.find(p => p.slot === G.slot); if (!m) return; const o = G.own, ox = o.x, oy = o.y, oz = o.z, was = o.alive; o.alive = m.alive;
  Object.assign(o, { x: m.x, y: m.y, z: m.z, vx: m.vx, vy: m.vy, vz: m.vz, g: m.g, cr: m.cr });
  G.pend = G.pend.filter(q => ((q.seq - m.ack) & 65535) < 32768 && q.seq !== m.ack); if (m.alive) for (const q of G.pend) movePlayer(o, q, TICK, G.M);
  if (was && m.alive) { G.ex += ox - o.x; G.ey += oy - o.y; G.ez += oz - o.z; if (Math.hypot(G.ex, G.ey, G.ez) > 3) G.ex = G.ey = G.ez = 0; } else { G.ex = G.ey = G.ez = 0; o.px = o.x; o.py = o.y; o.pz = o.z; if (!was && m.alive) { look.yaw = m.yaw; look.pitch = 0; } } }
let lastT = performance.now();
setInterval(() => { const now = performance.now(), dt = Math.min(1, (now - lastT) / 1000); lastT = now; if (!G) return; G.acc += dt; let n = 0; while (G && G.acc >= TICK && n++ < 30) { G.acc -= TICK; tick(); } if (G && n >= 30) G.acc = 0; if (G) G.alpha = Math.min(1, G.acc / TICK); }, 1000 / 120);

/* ---------- nézet (a többiek ~100 ms-mal visszább, interpolálva) ---------- */
const lerp = (a, b, t) => a + (b - a) * t, lerpA = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
function view(now) { const sn = G.snaps; if (!sn.length) return null; const delay = G.host ? 34 : 105, rt = now - delay; let a = sn[0], b = sn[sn.length - 1];
  for (let i = sn.length - 1; i > 0; i--) if (sn[i - 1].t <= rt) { a = sn[i - 1]; b = sn[i]; break; } if (rt <= sn[0].t) b = a;
  const k = b.t > a.t ? Math.max(0, Math.min(1.2, (rt - a.t) / (b.t - a.t))) : 1, A = a.S, B = b.S; G.vt = Math.round(lerp(A.tick, B.tick, Math.min(1, k)));
  const P = B.P.map(q => { const o = A.P.find(z => z.slot === q.slot) || q, jump = Math.hypot(q.x - o.x, q.z - o.z) > 4; return { ...q, x: jump ? q.x : lerp(o.x, q.x, k), y: jump ? q.y : lerp(o.y, q.y, k), z: jump ? q.z : lerp(o.z, q.z, k), yaw: lerpA(o.yaw, q.yaw, Math.min(1, k)), pitch: lerp(o.pitch, q.pitch, Math.min(1, k)) }; });
  const en = B.en.map(q => { const o = A.en.find(z => z.id === q.id && z.ty === q.ty) || q; return { ...q, x: lerp(o.x, q.x, Math.min(1, k)), y: lerp(o.y, q.y, Math.min(1, k)), z: lerp(o.z, q.z, Math.min(1, k)), yaw: lerpA(o.yaw, q.yaw, Math.min(1, k)) }; });
  const pr = B.pr.map((q, i) => { const o = A.pr[i] && A.pr[i].k === q.k ? A.pr[i] : q; return { ...q, x: lerp(o.x, q.x, Math.min(1, k)), y: lerp(o.y, q.y, Math.min(1, k)), z: lerp(o.z, q.z, Math.min(1, k)) }; });
  return { P, en, pr, flags: B.flags, gold: B.gold, score: B.score, time: B.time, wave: B.wave, boss: B.boss, last: sn[sn.length - 1].S }; }
function ownPos() { const a = G.alpha; if (G.host) { const p = G.W.P[G.slot]; if (!p) return null; return { x: lerp(p.px ?? p.x, p.x, a), y: lerp(p.py ?? p.y, p.y, a), z: lerp(p.pz ?? p.z, p.z, a), cr: p.cr, alive: p.alive, vx: p.vx, vz: p.vz, g: p.g }; }
  const o = G.own; return { x: lerp(o.px, o.x, a) + G.ex, y: lerp(o.py, o.y, a) + G.ey, z: lerp(o.pz, o.z, a) + G.ez, cr: o.cr, alive: o.alive, vx: o.vx, vz: o.vz, g: o.g }; }
const camDist = (x, y, z) => G && G.cam ? Math.hypot(x - G.cam.x, y - G.cam.y, z - G.cam.z) : 99;

/* ---------- részecskék, foltok ---------- */
function emit(x, y, z, vx, vy, vz, life, size, c, a = .9, kind = 0, owner = -1) { if (G.pl.length >= QUAL[SET.q].parts) G.pl.splice(0, 20); G.pl.push({ x, y, z, vx, vy, vz, l: life, s: size, c, a, k: kind, o: owner }); }
function splashAt(x, y, z, n, c = [.6, .85, 1]) { n = Math.round(n * (SET.q ? 1 : .4)); for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, u = Math.random(), s = 2 + Math.random() * 5; emit(x, y, z, Math.cos(a) * s * (1 - u * .5), 2 + u * 6, Math.sin(a) * s * (1 - u * .5), .5 + Math.random() * .5, .08 + Math.random() * .1, c, .85, 1); } }
function addDecal(x, y, z, n, r) { const D = G.decals; for (const d of D.l) if (Math.abs(d.x - x) + Math.abs(d.y - y) + Math.abs(d.z - z) < d.r * .7 && d.n[0] === n[0] && d.n[1] === n[1] && d.n[2] === n[2]) { if (d.r < 1.1) { d.r = Math.min(1.1, d.r + r * .15); D.dirty = 1; } return; }
  D.l.push({ x, y, z, n, r }); if (D.l.length > QUAL[SET.q].dec) D.l.shift(); D.dirty = 1; }
const WSPD = [28, 19, 75, 19, 0];
// a vízsugarak csak látvány: a lövő helyéből és nézési irányából rajzoljuk (a találatot a gazda dönti el)
function muzzle(x, y, z, yaw, pitch, cr, fp) { const e = y + (cr ? CH : PH) - .14, fx = -Math.sin(yaw) * Math.cos(pitch), fy = Math.sin(pitch), fz = -Math.cos(yaw) * Math.cos(pitch), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  return fp ? [x + fx * .5 + rx * .18, e - .16 + fy * .5, z + fz * .5 + rz * .18, fx, fy, fz] : [x + fx * .55 + rx * .25, e - .42 + fy * .55, z + fz * .55 + rz * .25, fx, fy, fz]; }
function shotFx(slot, w, gold, mz, near) { const d = [mz[3], mz[4], mz[5]], sp = gold ? 30 : WSPD[w], n = gold ? 4 : w === 1 ? 14 : w === 3 ? 3 : w === 2 ? 10 : 2, spr = gold ? .03 : [.02, .09, .004, .05, 0][w], c = gold ? [1, .86, .4] : [.72, .9, 1];
  if (w === 4 && !gold) return; for (let i = 0; i < n; i++) { const jx = (Math.random() - .5) * 2 * spr, jy = (Math.random() - .5) * 2 * spr, jz = (Math.random() - .5) * 2 * spr, s = sp * (w === 2 ? 1 - i * .04 : .9 + Math.random() * .2), o = w === 2 ? i * .06 : Math.random() * .05;
    emit(mz[0] + d[0] * o * s * .05, mz[1] + d[1] * o * s * .05, mz[2] + d[2] * o * s * .05, (d[0] + jx) * s, (d[1] + jy) * s, (d[2] + jz) * s, w === 2 ? 1.4 : 1.6, gold ? .2 : w === 3 ? .16 : w === 2 ? .09 : .12, c, .88, 0, slot); }
  if (near) Snd.shot(gold ? 5 : w, near); }
function stepParts(dt, V) { const M = G.M, out = G.parts; let n = 0; const ps = V ? V.P : [];
  for (const p of G.pl) { p.l -= dt; if (p.l <= 0) continue; const ox = p.x, oy = p.y, oz = p.z; p.vy -= (p.k === 2 ? 2 : 9.8 * .55) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.k === 0) { let hit = pointSolid(M, p.x, p.y, p.z); if (!hit) for (const q of ps) if (q.alive && q.slot !== p.o && Math.abs(p.x - q.x) < PR + .1 && Math.abs(p.z - q.z) < PR + .1 && p.y > q.y && p.y < q.y + PH) { hit = 2; break; }
      if (!hit && V) for (const e of V.en) { const E = ENT[e.ty]; if (Math.abs(p.x - e.x) < E.r && Math.abs(p.z - e.z) < E.r && p.y > e.y && p.y < e.y + E.h) { hit = 2; break; } }
      if (hit) { p.l = 0; if (Math.random() < .5) emit(ox, oy, oz, (Math.random() - .5) * 3, 1 + Math.random() * 2, (Math.random() - .5) * 3, .3, .07, [.7, .9, 1], .8, 1);
        if (hit === true && Math.random() < .35) { const dx = p.x - ox, dy = p.y - oy, dz = p.z - oz, l = Math.hypot(dx, dy, dz) || 1, r = raycast(M, ox, oy, oz, dx / l, dy / l, dz / l, l + .2); if (r) addDecal(ox + dx / l * r.t, oy + dy / l * r.t, oz + dz / l * r.t, r.n, .16 + Math.random() * .14); }
        continue; } }
    else if (p.y < 0) { p.l = 0; continue; }
    const o = n * 8; out[o] = p.x; out[o + 1] = p.y; out[o + 2] = p.z; out[o + 3] = p.c[0]; out[o + 4] = p.c[1]; out[o + 5] = p.c[2]; out[o + 6] = p.a * Math.min(1, p.l * 3); out[o + 7] = p.s; n++; if (n >= 2999) break; }
  G.pl = G.pl.filter(p => p.l > 0); return n; }

/* ---------- rajz ---------- */
const C = { skin: hex(0xf0c9a0), dark: hex(0x2a2f38), tank: hex(0x2a7ac0), gold: hex(0xe8b656), green: hex(0x3f9a4a), orange: hex(0xc2571f), white: [1, 1, 1], red: hex(0xff5a4d) };
function drawPlayer(p, t) { const col = hex(parseInt(colOf(p.slot).slice(1), 16)), wet = Math.min(1, p.wet / 100) * .8, yaw = p.yaw, h = p.cr ? .75 : 1, sy = Math.sin(yaw), cy = Math.cos(yaw), off = (ox, oz) => [p.x + cy * ox + sy * oz, p.z - sy * ox + cy * oz];
  const glow = p.gold ? .35 + Math.sin(t * 10) * .15 : 0, walk = p.g ? Math.sin(t * 9 + p.slot) * Math.min(1, Math.hypot(p.vx, p.vz) / 5) * .35 : 0;
  for (const s of [-1, 1]) { const [x, z] = off(s * .13, 0); R.draw('box', M4.trs(x, p.y + .42 * h, z, yaw, walk * s, .2, .84 * h, .24), C.dark, wet); }
  R.draw('box', M4.trs(p.x, p.y + (.84 + .32) * h, p.z, yaw, 0, .56, .66 * h, .32), p.gold ? C.gold : col, wet, glow);
  R.draw('box', M4.trs(p.x, p.y + 1.5 * h + .14, p.z, yaw, p.pitch * .4, .34, .34, .34), C.skin, wet * .7);
  { const [x, z] = off(0, .25); R.draw('cyl', M4.trs(x, p.y + .9 * h, z, yaw, 0, .16, .6 * h, .16), C.tank, 0); }
  const [gx, gz] = off(.24, -.2), gy = p.y + 1.18 * h; R.draw('box', M4.trs(gx, gy, gz, yaw, p.pitch, .1, .12, .55), p.gold ? C.gold : hex(0xffd84a), 0, glow); { const fx = -sy * Math.cos(p.pitch), fz = -cy * Math.cos(p.pitch), fy = Math.sin(p.pitch); R.draw('box', M4.trs(gx + fx * .32, gy + fy * .32, gz + fz * .32, yaw, p.pitch, .06, .06, .16), C.dark, 0); }
  if (p.prot) R.draw('sph', M4.trs(p.x, p.y + .95 * h, p.z, 0, 0, .75, 1.1 * h, .75), [.6, .85, 1], 0, .6, .25); }
function drawFlag(x, y, z, team, t, carried) { R.draw('cyl', M4.trs(x, y, z, 0, 0, .05, carried ? .9 : 2.2, .05), [.85, .85, .9]); const top = y + (carried ? .9 : 2.2), c = hex(parseInt(TEAMC[team].slice(1), 16));
  R.draw('cyl', M4.trs(x, top, z, t * 2, 0, .22, .34, .22), C.gold, 0, .3); R.draw('cone', M4.trs(x, top + .34, z, t * 2, 0, .3, .3, .3), C.gold, 0, .3); R.draw('box', M4.trs(x, top - .1, z, t * 2, 0, .5, .14, .06), c, 0, .2); }
function drawEnemy(e, t) { const E = ENT[e.ty], wob = Math.sin(t * 6 + e.id) * .06;
  if (e.ty === 2) { const y = e.y + .6 + Math.sin(t * 2) * .2; R.draw('sph', M4.trs(e.x, y + 1.6, e.z, e.yaw, 0, 1.3, 1.6, 1.1), hex(0x8a5a2a)); R.draw('sph', M4.trs(e.x, y + 3.4, e.z, e.yaw, 0, .8, .8, .8), hex(0xe2b060), 0, .2);
    const fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw), rx = Math.cos(e.yaw), rz = -Math.sin(e.yaw); for (const s of [-1, 1]) R.draw('box', M4.trs(e.x + fx * .7 + rx * .3 * s, y + 3.55, e.z + fz * .7 + rz * .3 * s, e.yaw, 0, .34, .14, .08), hex(0x101010));
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + t; R.draw('cone', M4.trs(e.x + Math.cos(a) * .9, y + 4, e.z + Math.sin(a) * .9, 0, 0, .14, .5, .14), hex(0xffb347), 0, .5); } return; }
  const c = e.ty === 1 ? C.orange : C.green; R.draw('cyl', M4.trs(e.x, e.y, e.z, e.yaw, wob, E.r * .8, E.h * .85, E.r * .8), c);
  R.draw('sph', M4.trs(e.x, e.y + E.h * .85, e.z, e.yaw, 0, E.r * .8, E.r * .7, E.r * .8), c); const rx = Math.cos(e.yaw), rz = -Math.sin(e.yaw), fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw);
  for (const s of [-1, 1]) { R.draw('cyl', M4.trs(e.x + rx * s * .55, e.y + E.h * .45, e.z + rz * s * .55, e.yaw, 0, .14, .5 + s * .1, .14), c); R.draw('box', M4.trs(e.x + fx * E.r * .75 + rx * s * .14, e.y + E.h * .78, e.z + fz * E.r * .75 + rz * s * .14, e.yaw, 0, .08, .1, .04), hex(0x101010)); }
  if (e.ty === 1) R.draw('sph', M4.trs(e.x, e.y + E.h * 1.05, e.z, 0, 0, .18, .12, .18), hex(0xff5a8a), 0, .3); }
const VMODEL = [
  (k, g) => [['box', M4.trs(.24, -.24 + k * .02, -.45 + k * .06, 0, k * .2, .09, .13, .34), g || hex(0x3f9a4a)], ['cyl', M4.trs(.24, -.12, -.36 + k * .06, 0, 0, .07, .1, .07), g || hex(0xffd84a)], ['box', M4.trs(.24, -.24, -.66 + k * .06, 0, 0, .04, .04, .12), C.dark], ['box', M4.trs(.24, -.34, -.36, 0, -.3, .06, .14, .07), C.dark]],
  (k, g) => [['box', M4.trs(.24, -.26 + k * .03, -.45 + k * .1, 0, k * .25, .13, .14, .44), g || hex(0xff7a6e)], ['cone', M4.trs(.24, -.26, -.68 + k * .1, 0, -1.5708, .09, .14, .09), g || C.gold], ['box', M4.trs(.24, -.36, -.34, 0, -.3, .07, .15, .07), C.dark]],
  (k, g) => [['box', M4.trs(.22, -.24 + k * .02, -.5 + k * .12, 0, k * .15, .08, .11, .7), g || hex(0x6c7a8c)], ['cyl', M4.trs(.22, -.15, -.46 + k * .12, 0, 1.5708, .05, .26, .05), C.dark], ['box', M4.trs(.22, -.24, -.9 + k * .12, 0, 0, .035, .035, .12), C.dark], ['cyl', M4.trs(.22, -.33, -.3, 0, 0, .09, .14, .09), C.tank]],
  (k, g) => [['box', M4.trs(.24, -.26 + k * .01, -.42, 0, 0, .06, .06, .3), g || hex(0xe8b656)], ['cyl', M4.trs(.24, -.26, -.3, 0, 1.5708, .07, .14, .07), g || hex(0x2f8f3f)], ['box', M4.trs(.32, -.32, -.2, 0, .4, .07, .07, .3), hex(0x2f8f3f)]],
  (k, g) => [['sph', M4.trs(.24, -.24 + k * .05, -.42, 0, 0, .12, .12, .12), g || hex(0x4aa8ff)], ['box', M4.trs(.24, -.13 + k * .05, -.42, 0, 0, .03, .05, .03), hex(0xffd84a)]]
];
let prevF = performance.now();
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.1, (now - prevF) / 1000); prevF = now;
  if (!G || !R) { R && R.resize(.5); h.setTransform(1, 0, 0, 1, 0, 0); hc.width = hc.width; return; }
  const q = QUAL[SET.q]; R.resize(q.s); const V = view(now), t = now / 1000; if (!V) return; const op = ownPos(), M = G.M;
  const mineS = V.last.P.find(p => p.slot === G.slot); G.zoom = mineS && mineS.alive && (G.lastIn && G.lastIn.b & B_AIM) && (G.lastIn.w === 2 || wsel === 2) ? Math.min(1, G.zoom + dt * 6) : Math.max(0, G.zoom - dt * 6);
  // kamera
  let cam; if (op && op.alive) { const eh = (op.cr ? CH : PH) - .14, sp = Math.hypot(op.vx, op.vz); if (op.g && sp > 1) { G.bob += dt * sp * 1.6; } cam = { x: op.x, y: op.y + eh + Math.abs(Math.sin(G.bob)) * .04 * Math.min(1, sp / 5), z: op.z, yaw: look.yaw, pitch: look.pitch }; G.deadT = 0; G.deadPos = [op.x, op.y, op.z]; }
  else { G.deadT += dt; const d = G.deadPos || [0, 0, 0]; cam = { x: d[0], y: d[1] + 1.6 + Math.min(3, G.deadT * 1.5), z: d[2], yaw: look.yaw, pitch: Math.max(-1.2, look.pitch - Math.min(.8, G.deadT * .4)) }; }
  cam.fov = (SET.fov - (SET.fov - 28) * G.zoom) * Math.PI / 180; G.cam = cam; R.begin(cam, q.far);
  // tárgyak
  for (const b of M.bases) if (G.md.id === 'ctf') { const i = M.bases.indexOf(b); R.draw('cyl', M4.trs(b[0], .01, b[1], 0, 0, 2, .06, 2), hex(parseInt(TEAMC[i].slice(1), 16)), 0, .3); }
  if (V.gold) { const g = M.gold, y = g[1] + .4 + Math.sin(t * 2) * .15; R.draw('cyl', M4.trs(g[0], y, g[2], t * 2, 0, .2, .3, .2), C.gold, 0, .5); R.draw('cone', M4.trs(g[0], y + .3, g[2], t * 2, 0, .32, .32, .32), C.gold, 0, .5); if (Math.random() < .3) emit(g[0] + (Math.random() - .5), y + .3, g[2] + (Math.random() - .5), 0, .6, 0, .8, .08, [1, .85, .4], .9, 2); }
  if (G.md.id === 'ctf') V.flags.forEach((f, i) => { if (f.st === 1) { const c = V.P.find(p => p.slot === f.s); if (c && !(c.slot === G.slot && op)) drawFlag(c.x, c.y + 1.4, c.z, i, t, 1); } else drawFlag(f.x, f.y, f.z, i, t, 0); });
  for (const q2 of M.taps) if (Math.random() < .15) emit(q2[0] + .35, .9, q2[1], 0, -.5, 0, .5, .06, [.6, .85, 1], .8, 1);
  for (const p of V.P) { if (!p.alive || p.slot === G.slot && op && op.alive) continue; drawPlayer(p, t); if (p.wet > 40 && Math.random() < p.wet / 400) emit(p.x + (Math.random() - .5) * .5, p.y + 1.2, p.z + (Math.random() - .5) * .5, 0, -.5, 0, .6, .05, [.6, .85, 1], .7, 1); }
  for (const e of V.en) drawEnemy(e, t);
  for (const pr of V.pr) { if (pr.k === 0) R.draw('sph', M4.trs(pr.x, pr.y, pr.z, t * 5, t * 3, .16, .16, .16), hex(0x4aa8ff), 0, .2); else { R.draw('sph', M4.trs(pr.x, pr.y, pr.z, 0, 0, .22, .22, .22), hex(0xff7a2e), 0, .9); if (Math.random() < .6) emit(pr.x, pr.y, pr.z, (Math.random() - .5), (Math.random() - .5), (Math.random() - .5), .3, .18, [1, .55, .2], .8, 2); } }
  // lövés-effektek (a saját azonnal, a többieké a pillanatkép szerint)
  for (const p of V.P) { if (!p.alive) { G.fcd[p.slot] = 0; continue; } const own = p.slot === G.slot; let firing, w = p.w, gold = p.gold;
    if (own) { const i = G.lastIn; firing = i && i.b & B_FIRE && !p.rl && (p.ammo > 0 || gold) && $('#pause').hidden; w = i ? i.w : w; } else firing = p.trig && !p.rl && (p.ammo > 0 || p.gold);
    if (!firing) { G.fcd[p.slot] = Math.min(0, G.fcd[p.slot] || 0); if (own) Snd.hoseLoop(false); continue; }
    let cd = (G.fcd[p.slot] ?? 0) - dt; const per = gold ? GOLD.cd : WEAPONS[w].cd, dist = camDist(p.x, p.y, p.z);
    while (cd <= 0) { cd += per; const mz = own && op ? muzzle(op.x, op.y, op.z, look.yaw, look.pitch, op.cr, 1) : muzzle(p.x, p.y, p.z, p.yaw, p.pitch, p.cr, 0); shotFx(p.slot, w, gold, mz, w === 3 && own ? 0 : Math.max(0, 1 - dist / 45)); if (own) G.kick = Math.min(1, G.kick + (w === 2 ? 1 : w === 1 ? .8 : .25)); if (own && w === 4) Snd.shot(4); }
    G.fcd[p.slot] = cd; if (own) Snd.hoseLoop(w === 3 && !gold); }
  const pn = stepParts(dt, V); R.after(t, G.decals, G.parts, pn, .55);
  // kézben tartott fegyver
  if (op && op.alive && G.zoom < .5) { G.kick = Math.max(0, G.kick - dt * 6); const w = G.lastIn ? G.lastIn.w : 0, bob = Math.sin(G.bob) * .012, rel = mineS && mineS.rl ? .25 : 0; R.viewModel(70 * Math.PI / 180, VMODEL[w](G.kick + rel, mineS && mineS.gold ? C.gold : null).map(x => [x[0], M4.mul(M4.trs(bob + .1, Math.abs(bob) - rel * .3 - .09, -.2, 0, 0, .5, .5, .5), x[1]), x[2], mineS && mineS.gold ? .3 : 0])); }
  hud(V, mineS, op, now, dt); }

/* ---------- HUD ---------- */
let mini = null; const RX = window.top !== window ? 66 : 18;   // az Arcade bezárógombja a jobb alsó sarokban van
function buildMini(M) { const s = 150 / Math.max(M.W, M.D), c = document.createElement('canvas'); c.width = Math.ceil(M.W * s); c.height = Math.ceil(M.D * s); const x = c.getContext('2d'); x.fillStyle = 'rgba(20,30,40,.75)'; x.fillRect(0, 0, c.width, c.height);
  for (const v of M.vis) if (v.t === 'water') { x.fillStyle = 'rgba(80,160,230,.7)'; x.fillRect((v.a[0] + M.W / 2) * s, (v.a[2] + M.D / 2) * s, (v.b[0] - v.a[0]) * s, (v.b[2] - v.a[2]) * s); }
  for (const b of M.boxes) { const hh = b.b[1]; x.fillStyle = hh > 2.5 ? 'rgba(210,220,230,.85)' : hh > 1 ? 'rgba(160,175,190,.75)' : 'rgba(120,130,140,.6)'; x.fillRect((b.a[0] + M.W / 2) * s, (b.a[2] + M.D / 2) * s, Math.max(1, (b.b[0] - b.a[0]) * s), Math.max(1, (b.b[2] - b.a[2]) * s)); }
  for (const q of M.taps) { x.fillStyle = '#6cc6ff'; x.beginPath(); x.arc((q[0] + M.W / 2) * s, (q[1] + M.D / 2) * s, 2.5, 0, 6.283); x.fill(); } mini = { c, s }; }
function hud(V, mineS, op, now, dt) { const d = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight; if (hc.width !== Math.round(W * d) || hc.height !== Math.round(H * d)) { hc.width = Math.round(W * d); hc.height = Math.round(H * d); } h.setTransform(d, 0, 0, d, 0, 0); h.clearRect(0, 0, W, H);
  const rr = (x, y, w, hh, r) => { h.beginPath(); h.moveTo(x + r, y); h.arcTo(x + w, y, x + w, y + hh, r); h.arcTo(x + w, y + hh, x, y + hh, r); h.arcTo(x, y + hh, x, y, r); h.arcTo(x, y, x + w, y, r); h.closePath(); };
  const pill = (x, y, w, t, col = '#fff', al = 'center') => { h.fillStyle = 'rgba(8,12,22,.72)'; rr(x, y, w, 28, 14); h.fill(); h.fillStyle = col; h.font = '700 13px Inter, sans-serif'; h.textAlign = al; h.textBaseline = 'middle'; h.fillText(t, al === 'center' ? x + w / 2 : x + 12, y + 15); };
  // nevek és életerősávok a fejek fölött
  const cam = G.cam, VPm = M4.mul(M4.persp(cam.fov, W / H, .05, 200), M4.view(cam.x, cam.y, cam.z, cam.yaw, cam.pitch)), proj = (x, y, z) => { const cx = VPm[0] * x + VPm[4] * y + VPm[8] * z + VPm[12], cy = VPm[1] * x + VPm[5] * y + VPm[9] * z + VPm[13], cw = VPm[3] * x + VPm[7] * y + VPm[11] * z + VPm[15]; return cw > .1 ? [(cx / cw * .5 + .5) * W, (1 - (cy / cw * .5 + .5)) * H, cw] : null; };
  h.textAlign = 'center'; h.textBaseline = 'middle';
  for (const p of V.P) { if (!p.alive || p.slot === G.slot) continue; const ally = G.md.coop || (G.md.teams && mineS && p.slot % 2 === G.slot % 2), dd = camDist(p.x, p.y, p.z); if (!ally && dd > 22) continue; const s = proj(p.x, p.y + (p.cr ? 1.45 : 2.05), p.z); if (!s) continue;
    if (!ally && raycast(G.M, cam.x, cam.y, cam.z, (p.x - cam.x) / dd, (p.y + 1.5 - cam.y) / dd, (p.z - cam.z) / dd, dd)) continue;
    h.font = '700 12px Inter, sans-serif'; h.fillStyle = ally ? '#bfe6ff' : '#fff'; h.fillText(nameOf(p.slot), s[0], s[1] - 10); h.fillStyle = 'rgba(0,0,0,.5)'; h.fillRect(s[0] - 18, s[1] - 2, 36, 4); h.fillStyle = p.wet > 70 ? '#ff5a4d' : '#6cc6ff'; h.fillRect(s[0] - 18, s[1] - 2, 36 * p.wet / 100, 4); }
  for (const e of V.en) { const E = ENT[e.ty], s = proj(e.x, e.y + E.h + (e.ty === 2 ? 1.6 : .4), e.z); if (!s || s[2] > 40) continue; const w = e.ty === 2 ? 90 : 34; h.fillStyle = 'rgba(0,0,0,.5)'; h.fillRect(s[0] - w / 2, s[1], w, 4); h.fillStyle = '#ff7a2e'; h.fillRect(s[0] - w / 2, s[1], w * e.hp, 4); }
  // célkereszt, találatjelző
  const cx = W / 2, cy = H / 2; if (mineS && mineS.alive) { if (G.zoom > .5) { h.fillStyle = 'rgba(0,0,0,.85)'; h.beginPath(); h.rect(0, 0, W, H); h.arc(cx, cy, Math.min(W, H) * .42, 0, 6.283, true); h.fill(); h.strokeStyle = 'rgba(0,0,0,.9)'; h.lineWidth = 1.5; h.beginPath(); h.moveTo(cx - W, cy); h.lineTo(cx + W, cy); h.moveTo(cx, cy - H); h.lineTo(cx, cy + H); h.stroke(); }
    else { const w = G.lastIn ? G.lastIn.w : 0, g = 6 + (w === 1 ? 14 : w === 3 ? 6 : 2) + G.kick * 8; h.strokeStyle = 'rgba(255,255,255,.9)'; h.lineWidth = 2; h.beginPath(); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { h.moveTo(cx + a * g, cy + b * g); h.lineTo(cx + a * (g + 7), cy + b * (g + 7)); } h.stroke(); h.fillStyle = '#fff'; h.fillRect(cx - 1, cy - 1, 2, 2); }
    if (mineS.hm !== G.hm) { if (G.hm !== null && G.slot >= 0) { G.hmT = .25; Snd.hit(); } G.hm = mineS.hm; } if (G.hmT > 0) { G.hmT -= dt; h.strokeStyle = `rgba(255,226,154,${G.hmT * 4})`; h.lineWidth = 2.5; h.beginPath(); for (const [a, b] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { h.moveTo(cx + a * 6, cy + b * 6); h.lineTo(cx + a * 13, cy + b * 13); } h.stroke(); } }
  // áztatás: kék vignetta
  const wet = mineS ? mineS.wet / 100 : 0; G.wetFx = Math.max(0, G.wetFx - dt * .8); const wv = Math.max(wet * .7, G.wetFx); if (wv > .05) { const gr = h.createRadialGradient(cx, cy, Math.min(W, H) * .25, cx, cy, Math.max(W, H) * .7); gr.addColorStop(0, 'rgba(60,140,220,0)'); gr.addColorStop(1, `rgba(60,140,220,${wv * .65})`); h.fillStyle = gr; h.fillRect(0, 0, W, H); }
  // felső sor: idő, pontok, ping
  const tm = Math.max(0, Math.round(V.time)), ts = Math.floor(tm / 60) + ':' + String(tm % 60).padStart(2, '0'); pill(W / 2 - 40, 10, 80, ts);
  if (G.md.teams) { pill(W / 2 - 108, 10, 60, V.score[0] + '', TEAMC[0]); pill(W / 2 + 48, 10, 60, V.score[1] + '', TEAMC[1]); }
  else if (G.md.coop) { pill(W / 2 + 48, 10, 100, V.wave + '. hullám'); if (V.boss > 0) { h.fillStyle = 'rgba(8,12,22,.78)'; rr(W / 2 - 160, 46, 320, 16, 8); h.fill(); h.fillStyle = '#ff7a2e'; rr(W / 2 - 158, 48, 316 * V.boss, 12, 6); h.fill(); h.font = '800 10px Inter'; h.fillStyle = '#fff'; h.fillText('SZIKKADT SZILÁRD', W / 2, 55); } }
  else if (mineS) { const top = V.last.P.slice().sort((a, b) => b.kills - a.kills)[0]; pill(W / 2 + 48, 10, 120, mineS.kills + ' / ' + G.md.goal + (top && top.slot !== G.slot ? ' · ' + top.kills : ''), '#ffe29a'); }
  if (net) pill(10, H - 38, 86, net.isHost() ? 'gazda' : net.connected() ? net.ping() + ' ms' : 'nincs kapcs.', net.isHost() ? '#e8b656' : net.connected() ? (net.ping() < 120 ? '#5ee08a' : '#ffd84a') : '#ff5a4d');
  // minitérkép
  if (mini) { const s = mini.s, x0 = W - mini.c.width - 12, y0 = 12; h.globalAlpha = .9; h.drawImage(mini.c, x0, y0); h.globalAlpha = 1; const P = (x, z) => [x0 + (x + G.M.W / 2) * s, y0 + (z + G.M.D / 2) * s];
    for (const p of V.P) { if (!p.alive) continue; const own = p.slot === G.slot, ally = G.md.coop || (G.md.teams && p.slot % 2 === G.slot % 2); if (!own && !ally && !(p.f & 2)) continue; const [x, y] = own && op ? P(op.x, op.z) : P(p.x, p.z), a = own ? look.yaw : p.yaw;
      h.fillStyle = own ? '#fff' : ally ? colOf(p.slot) : '#ff5a4d'; h.beginPath(); h.moveTo(x - Math.sin(a) * 6, y - Math.cos(a) * 6); h.lineTo(x + Math.cos(a) * 3.5, y - Math.sin(a) * 3.5); h.lineTo(x - Math.cos(a) * 3.5, y + Math.sin(a) * 3.5); h.fill(); }
    for (const e of V.en) { const [x, y] = P(e.x, e.z); h.fillStyle = e.ty === 2 ? '#ffb347' : '#ff5a4d'; h.fillRect(x - (e.ty === 2 ? 3 : 1.5), y - (e.ty === 2 ? 3 : 1.5), e.ty === 2 ? 6 : 3, e.ty === 2 ? 6 : 3); }
    if (G.md.id === 'ctf') V.flags.forEach((f, i) => { const [x, y] = P(f.x, f.z); h.fillStyle = TEAMC[i]; h.strokeStyle = '#ffe29a'; h.lineWidth = 1.5; h.beginPath(); h.arc(x, y, 4, 0, 6.283); h.fill(); h.stroke(); });
    if (V.gold) { const [x, y] = P(G.M.gold[0], G.M.gold[2]); h.fillStyle = '#e8b656'; h.beginPath(); h.arc(x, y, 3.5, 0, 6.283); h.fill(); } }
  // alsó sáv: áztatás, tartály, fegyver
  if (mineS) { const bw = Math.min(280, W * .38), x = 14, y = H - 92; h.fillStyle = 'rgba(8,12,22,.78)'; rr(x - 6, y - 8, bw + 12, 50, 12); h.fill();
    h.fillStyle = 'rgba(255,255,255,.12)'; rr(x, y, bw, 12, 6); h.fill(); h.fillStyle = mineS.wet > 70 ? '#ff5a4d' : '#6cc6ff'; rr(x, y, Math.max(4, bw * mineS.wet / 100), 12, 6); h.fill();
    h.fillStyle = 'rgba(255,255,255,.12)'; rr(x, y + 20, bw, 12, 6); h.fill(); h.fillStyle = mineS.tank < 15 ? '#ffd84a' : '#5ee08a'; rr(x, y + 20, Math.max(4, bw * mineS.tank / 100), 12, 6); h.fill();
    h.font = '800 9px Inter, sans-serif'; h.textAlign = 'left'; h.fillStyle = '#fff'; h.shadowColor = 'rgba(0,0,0,.8)'; h.shadowBlur = 3; h.fillText('ÁZOTTSÁG', x + 6, y + 6.5); h.fillText(mineS.tank < 15 ? 'TARTÁLY – TÖLTS A CSAPNÁL!' : 'TARTÁLY', x + 6, y + 26.5); h.shadowBlur = 0;
    const w = G.lastIn ? G.lastIn.w : 0, Wn = mineS.gold ? 'ARANY LOCSOLÓFEJ' : WEAPONS[w].n.toUpperCase(), ammo = mineS.gold ? '∞' : mineS.rl ? 'töltés…' : (w === mineS.w ? mineS.ammo : '–') + ' / ' + WEAPONS[w].mag;
    h.textAlign = 'right'; h.font = '800 12px Inter, sans-serif'; h.fillStyle = mineS.gold ? '#e8b656' : '#fff'; h.fillText(Wn, W - RX, H - 58); h.font = '900 26px Inter, sans-serif'; h.fillText(ammo, W - RX, H - 32);
    for (let i = 0; i < 5; i++) { const bx = W - RX - (5 - i) * 26; h.fillStyle = i === w ? 'rgba(232,182,86,.85)' : 'rgba(8,12,22,.7)'; rr(bx, H - 104, 22, 22, 6); h.fill(); h.fillStyle = i === w ? '#1b1304' : '#fff'; h.font = '800 11px Inter'; h.textAlign = 'center'; h.fillText(i + 1, bx + 11, H - 92); } }
  if (mineS && !mineS.alive) { h.textAlign = 'center'; h.font = '800 15px Inter'; h.fillStyle = '#fff'; h.fillText(G.md.coop ? 'Mindjárt újraéledsz…' : 'Újraéledés…', W / 2, H * .62); }
  // ölési napló, üzenetek
  h.textAlign = 'right'; h.font = '600 12px Inter, sans-serif'; G.feedL.forEach((f, i) => { f.l -= dt; h.globalAlpha = Math.min(1, f.l); h.fillStyle = 'rgba(8,12,22,.72)'; const w = h.measureText(f.t).width + 16; rr(W - 12 - w, 178 + i * 26, w, 22, 8); h.fill(); h.fillStyle = '#fff'; h.fillText(f.t, W - 20, 190 + i * 26); }); h.globalAlpha = 1; G.feedL = G.feedL.filter(f => f.l > 0);
  if (G.msg) { G.msg.l -= dt; h.globalAlpha = Math.min(1, G.msg.l * 2); h.textAlign = 'center'; h.font = `900 ${Math.min(42, W / 14)}px Cinzel, Georgia, serif`; h.fillStyle = '#e8b656'; h.fillText(G.msg.a, W / 2, H * .28); h.font = '600 15px Inter, sans-serif'; h.fillStyle = '#fff'; h.fillText(G.msg.b || '', W / 2, H * .28 + 34); h.globalAlpha = 1; if (G.msg.l <= 0) G.msg = null; }
  if (G.note) { G.note.l -= dt; h.textAlign = 'center'; h.font = '700 13px Inter, sans-serif'; const w = h.measureText(G.note.t).width + 24; h.fillStyle = 'rgba(120,60,10,.9)'; rr(W / 2 - w / 2, 48, w, 26, 10); h.fill(); h.fillStyle = '#fff'; h.fillText(G.note.t, W / 2, 61); if (G.note.l <= 0) G.note = null; }
  if (T.mv) { h.strokeStyle = 'rgba(255,255,255,.35)'; h.lineWidth = 2; h.beginPath(); h.arc(T.mv.x0, T.mv.y0, 50, 0, 6.283); h.stroke(); const dx = T.mv.x - T.mv.x0, dy = T.mv.y - T.mv.y0, dd = Math.hypot(dx, dy) || 1, kk = Math.min(50, dd) / dd; h.fillStyle = 'rgba(255,255,255,.5)'; h.beginPath(); h.arc(T.mv.x0 + dx * kk, T.mv.y0 + dy * kk, 20, 0, 6.283); h.fill(); }
  // eredménytábla (Tab)
  if (scoresOn || (G.ended && !G.res)) { const l = V.last.P.slice().sort((a, b) => b.kills - a.kills || a.deaths - b.deaths), w = Math.min(520, W - 30), x = W / 2 - w / 2, y = H / 2 - (l.length * 28 + 50) / 2; h.fillStyle = 'rgba(8,12,22,.88)'; rr(x, y, w, l.length * 28 + 50, 14); h.fill();
    h.font = '800 11px Inter'; h.fillStyle = '#8b9ab0'; h.textAlign = 'left'; h.fillText('JÁTÉKOS', x + 16, y + 22); h.textAlign = 'right'; h.fillText('KIÜTÉS', x + w - 110, y + 22); h.fillText('ELÁZÁS', x + w - 20, y + 22);
    l.forEach((p, i) => { const yy = y + 50 + i * 28; h.font = '700 13px Inter'; h.textAlign = 'left'; h.fillStyle = colOf(p.slot); h.fillText('●', x + 16, yy); h.fillStyle = p.slot === G.slot ? '#ffe29a' : '#fff'; h.fillText(nameOf(p.slot) + (p.f & 128 ? '  (bot)' : ''), x + 34, yy); h.textAlign = 'right'; h.fillText(p.kills, x + w - 110, yy); h.fillText(p.deaths, x + w - 20, yy); }); } }
requestAnimationFrame(frame);
window.__lh = () => ({ G, net, lobby, me, room, look, SET });
boot();
