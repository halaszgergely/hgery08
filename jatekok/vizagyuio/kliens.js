// Vízágyú.io – kliens: menü, váróterem, hálózat, előrejelzés + interpoláció, rajz, vezérlés.
import { TICK, PR, RANGE, MODES, MAPS, ITEMS, COLORS, TEAMC, mapOf, movePlayer, blocked, newWorld, step, encodeSnap, decodeSnap, encodeInput, decodeInput, worldFromSnap } from './jatek.js?v=202611240124';
import { joinRoom, localSignal, fireSignal, hasTurn } from '../../js/net.js?v=202611240124';

const $ = s => document.querySelector(s), Q = new URLSearchParams(location.search), LOCAL = Q.has('local');
const cv = $('#c'), g = cv.getContext('2d'), esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let me = { uid: '', name: 'Vendég', color: COLORS[0], guest: true }, core = null, sig = null, net = null, roomId = null, room = null, friends = null, unList = null;
let lobby = { cfg: { mode: 'ffa', map: 'volgy', fill: 4 }, pl: [], st: 'lobby' }, G = null, practice = false, DPR = 1, CW = 0, CH = 0;
const toastEl = $('#toast'); let toastT = 0;
function toast(t) { toastEl.textContent = t; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2600); }
function status(t, k = 'info') { for (const el of [$('#st'), $('#lSt'), $('#rSt')]) { el.textContent = t || ''; if (el.id === 'st') el.className = k; } if (G && t) G.note = { t, l: 4 }; }
function show(id) { for (const s of ['menu', 'lobby', 'res']) $('#' + s).hidden = s !== id; $('#hudq').hidden = !!id || !G; }

/* ---------- indulás, azonosítás ---------- */
function fillSel(el, list, val) { el.innerHTML = list.map(([v, n]) => `<option value="${v}">${esc(n)}</option>`).join(''); el.value = val; }
for (const p of ['m', 'l']) { fillSel($('#' + p + 'Mode'), MODES.map(m => [m.id, m.n]), 'ffa'); fillSel($('#' + p + 'Map'), MAPS.map(m => [m.id, m.n]), 'volgy'); fillSel($('#' + p + 'Fill'), [2, 3, 4, 5, 6, 7, 8].map(n => [n, n + ' fő']), 4); }
async function boot() {
  if (LOCAL) { me = { uid: Q.get('uid') || 'u' + Math.random().toString(36).slice(2, 7), name: Q.get('name') || 'Teszt', color: COLORS[0], guest: false }; sig = localSignal(); return ready(); }
  try { core = await import('../../js/core.js?v=202611240124'); } catch (e) { console.warn(e); }
  if (!core || core.notConfigured || !core.auth) return ready();
  core.FB.onAuthStateChanged(core.auth, async u => {
    if (u && !u.isAnonymous) { me = { uid: u.uid, name: u.displayName || 'Tag', color: COLORS[0], guest: false }; try { const s = await core.FB.getDoc(core.FB.doc(core.db, 'users', u.uid)); if (s.exists()) { me.name = s.data().name || me.name; if (COLORS.includes(s.data().color)) me.color = s.data().color; } } catch (_) {} sig = fireSignal(core.FB, core.db); }
    ready(); });
}
let booted = false;
function ready() { $('#mCreate').disabled = !sig; $('#rmH').hidden = !sig; if (!sig) $('#st').textContent = 'Szobát létrehozni és barátokhoz csatlakozni bejelentkezve lehet – gyakorolni botok ellen így is tudsz.';
  if (booted) return; booted = true; if (sig) { unList = sig.list(me.uid, rooms => { const l = rooms.filter(r => r.game === 'vizagyuio' && r.host !== me.uid && r.members.length < r.max);
    $('#rooms').innerHTML = l.length ? l.map(r => `<div class="rm"><b class="grow">${esc(r.hostName)} szobája</b><span style="color:var(--mut)">${esc((MODES.find(m => m.id === r.mode) || MODES[0]).n)} · ${esc(mapOf(r.map).n)} · ${r.members.length}/${r.max}${r.state === 'play' ? ' · meccs közben' : ''}</span><button class="b sm go" data-join="${esc(r.id)}">Belépés</button></div>`).join('') : '<div style="color:var(--mut)">Most nincs nyitott szoba.</div>'; }); }
  const rid = Q.get('room'); if (rid && sig) enterRoom(rid); }
$('#rooms').onclick = e => { const b = e.target.closest('[data-join]'); if (b) enterRoom(b.dataset.join); };
async function loadFriends() { if (friends) return friends; friends = []; if (LOCAL || !core) return friends;
  try { const FB = core.FB, s = await FB.getDocs(FB.query(FB.collection(core.db, 'friends'), FB.where('users', 'array-contains', me.uid))); const ids = s.docs.map(d => d.data()).filter(d => d.status === 'accepted').map(d => d.users.find(u => u !== me.uid)).slice(0, 100);
    friends = await Promise.all(ids.map(async (id, i) => { let name = 'Barát'; if (i < 30) try { const u = await FB.getDoc(FB.doc(core.db, 'users', id)); if (u.exists()) name = u.data().name || name; } catch (_) {} return { id, name }; })); } catch (e) { console.warn(e); }
  return friends; }

/* ---------- szoba, váróterem ---------- */
$('#mSolo').onclick = () => { practice = true; const n = +$('#mFill').value; startHost({ mode: $('#mMode').value, map: $('#mMap').value, slots: [{ uid: me.uid || 'en', name: me.name, color: me.color }, ...Array.from({ length: n - 1 }, (_, i) => ({ uid: 'bot' + i, bot: 1 }))] }); };
$('#mCreate').onclick = async () => { if (!sig) return; $('#mCreate').disabled = true; status('Szoba létrehozása…');
  try { const fr = await loadFriends(), open = $('#mOpen').checked; lobby.cfg = { mode: $('#mMode').value, map: $('#mMap').value, fill: +$('#mFill').value };
    const id = await sig.create({ host: me.uid, hostName: me.name, game: 'vizagyuio', mode: lobby.cfg.mode, map: lobby.cfg.map, max: 8, open, state: 'lobby', members: [me.uid], vis: open ? fr.map(f => f.id) : [] }); await enterRoom(id, true); }
  catch (e) { console.warn(e); status('Nem sikerült létrehozni a szobát.', 'err'); } $('#mCreate').disabled = false; };
async function enterRoom(id, mine) { if (net) return; practice = false; roomId = id; status('Belépés a szobába…');
  if (!mine) { try { await sig.join(id, me.uid); } catch (e) { console.warn(e); status('Ebbe a szobába nem léphetsz be (csak a gazda barátai, és csak ha van hely).', 'err'); roomId = null; return; } }
  lobby.pl = []; lobby.st = 'lobby'; net = joinRoom({ sig, id, me: me.uid, name: me.name, lag: +Q.get('lag') || 0, loss: +Q.get('loss') || 0, on: { room: onRoom, role: onRole, peer: onPeer, msg: onMsg, status } });
  window.__net = net; show('lobby'); renderLobby(); }
async function leaveRoom(msg) { const n = net; net = null; roomId = null; room = null; G = null; lobby.pl = []; if (n) await n.close(true); show('menu'); if (msg) status(msg, 'warn'); else status(''); }
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
function onMsg(from, d, rel) {
  if (typeof d !== 'string') { const ty = new DataView(d).getUint8(0);
    if (ty === 1 && G && !G.host) onSnap(d); else if (ty === 2 && G && G.host && G.W) { const p = G.W.P.find(q => q.uid === from); if (p && !p.bot) { const i = decodeInput(d); if (!p.q.length || ((i.seq - p.q[p.q.length - 1].seq) & 65535) < 32768) p.q.push(i); } } return; }
  let m; try { m = JSON.parse(d); } catch (_) { return; }
  if (net.isHost()) {
    if (m.e === 'hi') { let p = lobby.pl.find(q => q.uid === from); if (!p) { p = { uid: from, ready: false }; lobby.pl.push(p); } p.name = String(m.name || 'Tag').slice(0, 24); p.color = freeColor(m.color, from);
      if (G && G.W) { const s = G.W.P.find(q => q.uid === from); if (s) { s.bot = false; s.dc = 0; s.q.length = 0; feed(s.name + ' visszatért'); } net.sendTo(from, JSON.stringify({ e: 'start', cfg: G.cfg, resume: 1 }), true); } sendLobby(); }
    else if (m.e === 'me') { const p = lobby.pl.find(q => q.uid === from); if (p) { if (m.color) p.color = freeColor(m.color, from); if (m.ready != null) p.ready = !!m.ready; sendLobby(); } }
    return; }
  if (m.e === 'lobby') { lobby.cfg = m.cfg; lobby.pl = m.pl; lobby.st = m.st; if (m.st === 'lobby' && G) { G = null; show('lobby'); } renderLobby(); }
  else if (m.e === 'start') startGuest(m.cfg);
  else onEvent(m); }
function renderLobby() { if ($('#lobby').hidden && !net) return; const host = net && net.isHost(), c = lobby.cfg, mineP = lobby.pl.find(p => p.uid === me.uid);
  $('#lSub').textContent = room ? (room.hostName || '') + ' szobája' + (room.open ? ' · nyitott a barátoknak' : ' · privát') : '';
  $('#lPl').innerHTML = lobby.pl.map(p => `<div class="p${p.ready ? ' rdy' : ''}"><i style="background:${esc(p.color)}"></i><b>${esc(p.name)}</b><small>${room && p.uid === room.host ? 'GAZDA' : p.ready ? 'KÉSZ' : 'vár'}</small></div>`).join('') || '<div style="color:var(--mut)">Csatlakozás…</div>';
  const used = lobby.pl.filter(p => p.uid !== me.uid).map(p => p.color); $('#lSw').innerHTML = COLORS.map(col => `<button data-c="${col}" class="${mineP && mineP.color === col ? 'on' : ''}" style="background:${col};${used.includes(col) ? 'opacity:.2' : ''}"></button>`).join('');
  $('#lHost').hidden = !host; $('#lStart').hidden = !host; $('#lReady').hidden = !!host; $('#lReady').textContent = mineP && mineP.ready ? 'Mégsem' : 'Kész'; $('#lReady').classList.toggle('on', !!(mineP && mineP.ready));
  const md = MODES.find(m => m.id === c.mode) || MODES[0]; $('#lInfo').textContent = md.n + ' · ' + mapOf(c.map).n + ' · ' + Math.max(c.fill, lobby.pl.length) + ' fő' + (c.fill > lobby.pl.length ? ' (' + (c.fill - lobby.pl.length) + ' bot)' : '') + ' — ' + md.d;
  if (host) { $('#lMode').value = c.mode; $('#lMap').value = c.map; $('#lFill').value = c.fill; $('#lLink').value = location.origin + '/app.html#/arcade/vizagyuio.' + roomId; const wait = lobby.pl.filter(p => p.uid !== me.uid && !p.ready).length; $('#lStart').disabled = wait > 0 || Math.max(c.fill, lobby.pl.length) < 2; if (!$('#lSt').textContent || /vár|Mindenki/.test($('#lSt').textContent)) $('#lSt').textContent = wait ? wait + ' játékosra várunk…' : '';
    if (!$('#lFr').dataset.done) { $('#lFr').dataset.done = 1; loadFriends().then(fr => { $('#lFr').innerHTML = fr.length ? fr.slice(0, 30).map(f => `<button class="b sm" data-inv="${esc(f.id)}">${esc(f.name)}</button>`).join('') : '<span style="color:var(--mut)">Nincs még barátod, akit meghívhatnál – a linket így is elküldheted.</span>'; }); } } }
$('#lSw').onclick = e => { const b = e.target.closest('[data-c]'); if (!b || !net) return; if (net.isHost()) { const p = lobby.pl.find(q => q.uid === me.uid); if (p) { p.color = freeColor(b.dataset.c, me.uid); me.color = p.color; sendLobby(); } } else { me.color = b.dataset.c; net.send(JSON.stringify({ e: 'me', color: b.dataset.c }), true); } };
$('#lReady').onclick = () => { const p = lobby.pl.find(q => q.uid === me.uid); if (net && !net.isHost()) net.send(JSON.stringify({ e: 'me', ready: !(p && p.ready) }), true); };
for (const k of ['Mode', 'Map', 'Fill']) $('#l' + k).onchange = () => { if (!net || !net.isHost()) return; lobby.cfg = { mode: $('#lMode').value, map: $('#lMap').value, fill: +$('#lFill').value }; sendLobby(); };
$('#lFr').onclick = async e => { const b = e.target.closest('[data-inv]'); if (!b || !room) return; b.disabled = true; const id = b.dataset.inv;
  try { if (!(room.vis || []).includes(id)) await sig.update(roomId, { vis: [...(room.vis || []), id].slice(0, 100) }); if (core) await core.notify(id, 'game', me.name + ' meghívott egy Vízágyú.io meccsre', '#/arcade/vizagyuio.' + roomId); b.textContent += ' ✓'; } catch (err) { console.warn(err); b.disabled = false; toast('A meghívót nem sikerült elküldeni.'); } };
$('#lCopy').onclick = async () => { const el = $('#lLink'); try { await navigator.clipboard.writeText(el.value); toast('Link a vágólapon.'); } catch (_) { el.focus(); el.select(); toast('Jelöld ki és másold a linket.'); } };
$('#lLeave').onclick = () => leaveRoom(); $('#rLeave').onclick = () => { if (net) leaveRoom(); else { G = null; show('menu'); } }; $('#qLeave').onclick = () => { if (net) leaveRoom(); else { G = null; show('menu'); } };
$('#lStart').onclick = () => { if (!net || !net.isHost()) return; const hum = lobby.pl.slice(0, 8), n = Math.min(8, Math.max(lobby.cfg.fill, hum.length)); if (n < 2) return;
  const cfg = { mode: lobby.cfg.mode, map: lobby.cfg.map, slots: [...hum.map(p => ({ uid: p.uid, name: p.name, color: p.color })), ...Array.from({ length: n - hum.length }, (_, i) => ({ uid: 'bot' + i, bot: 1 }))] };
  const usedC = hum.map(p => p.color); cfg.slots.forEach(s => { if (s.bot) { s.color = COLORS.find(c => !usedC.includes(c)) || COLORS[0]; usedC.push(s.color); } });
  lobby.st = 'play'; sig.update(roomId, { state: 'play', mode: cfg.mode, map: cfg.map }).catch(() => {}); net.broadcast(JSON.stringify({ e: 'start', cfg }), true); startHost(cfg); sendLobby(); };
$('#rAgain').onclick = () => { if (practice) return startHost(G.cfg); if (!net) return; G = null; show('lobby'); if (net.isHost()) { lobby.st = 'lobby'; lobby.pl.forEach(p => { p.ready = p.uid === me.uid; }); sig.update(roomId, { state: 'lobby' }).catch(() => {}); sendLobby(); } else status('A gazda indítja a visszavágót…'); renderLobby(); };

/* ---------- meccs ---------- */
function baseGame(cfg) { const M = mapOf(cfg.map), slot = cfg.slots.findIndex(s => s.uid === (me.uid || 'en'));
  return { cfg, M, md: MODES.find(m => m.id === cfg.mode) || MODES[0], slot, host: false, W: null, snaps: [], last: null, lp: { x: M.w / 2, y: M.h / 2, vx: 0, vy: 0, alive: 0, wet: 0, tank: 100, f: 0 }, pend: [], seq: 0, ex: 0, ey: 0, mask: 0xffffffff, drops: [], fcd: {}, feedL: [], msg: null, note: null, stats: {}, ended: null, hold: 0, acc: 0, spr: [], shake: 0 }; }
function startHost(cfg) { G = baseGame(cfg); G.host = true; G.W = newWorld(cfg); show(''); status(''); banner((G.md.n).toUpperCase(), mapOf(cfg.map).n); }
function startGuest(cfg) { G = baseGame(cfg); show(''); status(''); banner((G.md.n).toUpperCase(), mapOf(cfg.map).n); }
function takeOver() { // gazdaváltás: az utolsó pillanatképből folytatjuk
  if (!G.last) { G.host = true; G.W = newWorld(G.cfg); return; } G.W = worldFromSnap(G.cfg, G.last, G.stats); G.host = true; G.hold = 2;
  for (const p of G.W.P) if (!p.bot && p.uid !== me.uid) { p.bot = true; p.dc = 1; } const mine = G.W.P[G.slot]; if (mine) { mine.x = G.lp.x; mine.y = G.lp.y; }
  banner('GAZDAVÁLTÁS', 'A meccs mindjárt folytatódik'); lobby.st = 'play'; }
const banner = (a, b) => { if (G) G.msg = { a, b, l: 2.6 }; };
const feed = t => { if (G) { G.feedL.push({ t, l: 5 }); if (G.feedL.length > 5) G.feedL.shift(); } };
const nameOf = s => { const c = G.cfg.slots[s]; return c ? c.name || ['Locsi', 'Csepi', 'Slagos', 'Párás Pista', 'Zuhany', 'Tócsa', 'Harmat', 'Öntöző Ödön'][s % 8] : 'Szilárd'; };
function onEvent(m) { if (!G) return;
  if (m.e === 'ko') { feed(m.a === 255 ? nameOf(m.b) + ' elázott' : nameOf(m.a) + ' 💦 ' + nameOf(m.b)); const st = G.stats; if (m.a !== 255) (st[m.a] = st[m.a] || { kos: 0, deaths: 0 }).kos++; (st[m.b] = st[m.b] || { kos: 0, deaths: 0 }).deaths++; if (m.b === G.slot) { G.shake = 14; banner('ELÁZTÁL', G.md.id === 'ffa' ? 'Nézőként követed a meccset' : 'Mindjárt újraéledsz'); } }
  else if (m.e === 'item') { feed(nameOf(m.s) + ': ' + ITEMS[m.t].n); if (m.t === 4) banner('ARANY LOCSOLÓFEJ', nameOf(m.s) + ' megszerezte!'); }
  else if (m.e === 'spr') G.spr.push({ x: m.x, y: m.y, l: .7 });
  else if (m.e === 'wave') banner(m.n >= 5 ? 'SZIKKADT SZILÁRD' : m.n + '. HULLÁM', m.n >= 5 ? 'Áztasd el a főgonoszt!' : 'Jönnek a kaktuszok');
  else if (m.e === 'end') { G.ended = m; setTimeout(() => { if (G && G.ended === m) results(m); }, 1800); } }
function results(r) { const mine = r.pl.find(p => p.s === G.slot), won = r.win.includes(G.slot), coop = r.mode === 'coop';
  $('#rT').textContent = coop ? (r.boss ? 'SZILÁRD ELÁZOTT!' : 'A KERT KISZÁRADT') : !r.win.length ? 'DÖNTETLEN' : won ? 'GYŐZELEM!' : 'VERESÉG';
  const mvp = r.pl.find(p => p.s === r.mvp); $('#rS').textContent = (MODES.find(m => m.id === r.mode) || MODES[0]).n + ' · ' + mapOf(r.map).n + ' · ' + Math.floor(r.t / 60) + ':' + String(r.t % 60).padStart(2, '0') + (r.mode === 'tdm' ? ' · ' + r.score.join(' : ') : r.mode === 'kert' ? ' · kertek: ' + r.g.join('% : ') + '%' : coop ? ' · ' + r.wave + '. hullám' : '') + (mvp ? ' · MVP: ' + mvp.n : '');
  $('#rTab').innerHTML = '<tr><th>Játékos</th><th>Kiütés</th><th>Találat</th><th>Víz (l)</th><th>Elázás</th></tr>' + r.pl.slice().sort((a, b) => b.kos - a.kos || b.hits - a.hits).map(p => `<tr class="${p.s === G.slot ? 'me' : ''}${r.win.includes(p.s) ? ' win' : ''}"><td><span style="color:${esc(p.c)}">●</span> ${esc(p.n)}${p.bot ? ' <small style="color:var(--mut)">bot</small>' : ''}${p.s === r.mvp ? ' ⭐' : ''}</td><td>${p.kos}</td><td>${p.hits}</td><td>${p.water}</td><td>${p.deaths}</td></tr>`).join('');
  $('#rAgain').textContent = practice ? 'Újra' : 'Visszavágó'; show('res'); $('#rSt').textContent = !practice && net && !net.isHost() ? '' : '';
  if (!practice && mine && core && !LOCAL && r.pl.filter(p => !p.bot).length >= 2) saveStats(r, mine, won); }
async function saveStats(r, mine, won) { try { const FB = core.FB; await FB.setDoc(FB.doc(core.db, 'mpstats', me.uid), { games: FB.increment(1), wins: FB.increment(won ? 1 : 0), kos: FB.increment(Math.min(40, mine.kos)), boss: FB.increment(r.mode === 'coop' && r.boss ? 1 : 0), ['m_' + r.map]: FB.increment(1), updatedAt: FB.serverTimestamp() }, { merge: true }); } catch (e) { console.warn('statisztika', e); } }

/* ---------- vezérlés ---------- */
const keys = new Set(), mouse = { x: 0, y: 0, down: 0, used: 0 }, T = { mv: null, am: null };
addEventListener('keydown', e => { if (!G || !$('#lobby').hidden) return; const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k)) { keys.add(k); e.preventDefault(); } });
addEventListener('keyup', e => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key)); addEventListener('blur', () => { keys.clear(); mouse.down = 0; });
cv.addEventListener('pointerdown', e => { if (!G) return; if (e.pointerType === 'touch') { const k = e.clientX < innerWidth / 2 ? 'mv' : 'am'; if (!T[k]) T[k] = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY }; } else { mouse.down = 1; mouse.x = e.clientX; mouse.y = e.clientY; mouse.used = 1; } e.preventDefault(); });
cv.addEventListener('pointermove', e => { if (e.pointerType === 'touch') { for (const k of ['mv', 'am']) if (T[k] && T[k].id === e.pointerId) { T[k].x = e.clientX; T[k].y = e.clientY; } } else { mouse.x = e.clientX; mouse.y = e.clientY; mouse.used = 1; } });
const pup = e => { if (e.pointerType === 'touch') { for (const k of ['mv', 'am']) if (T[k] && T[k].id === e.pointerId) T[k] = null; } else mouse.down = 0; };
cv.addEventListener('pointerup', pup); cv.addEventListener('pointercancel', pup); cv.addEventListener('contextmenu', e => e.preventDefault());
let aim = 0;
function sample() { let mx = (keys.has('d') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('a') || keys.has('ArrowLeft') ? 1 : 0), my = (keys.has('s') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('w') || keys.has('ArrowUp') ? 1 : 0), fire = mouse.down || keys.has(' ') ? 1 : 0;
  if (T.mv) { const dx = T.mv.x - T.mv.x0, dy = T.mv.y - T.mv.y0, d = Math.hypot(dx, dy), k = Math.min(1, d / 46); if (d > 6) { mx = dx / d * k; my = dy / d * k; } }
  if (T.am) { const dx = T.am.x - T.am.x0, dy = T.am.y - T.am.y0, d = Math.hypot(dx, dy); if (d > 8) { aim = Math.atan2(dy, dx); fire = d > 18 ? 1 : 0; } } else if (mouse.used) aim = Math.atan2(mouse.y - innerHeight / 2 - camOff.y, mouse.x - innerWidth / 2 - camOff.x);
  if (window.__bot && G) { const b = window.__bot(G); if (b) return b; }
  return { mx, my, ang: aim, fire }; }
const camOff = { x: 0, y: 0 };

/* ---------- ütem ---------- */
function tick() { if (!G) return;
  if (G.host) { const W = G.W; if (G.hold > 0) { G.hold -= TICK; if (net) net.broadcast(encodeSnap(W), false); return; }
    const p = W.P[G.slot]; if (p && !p.bot) p.inp = sample(); step(W);
    for (const ev of W.ev) { onEvent(ev); if (net) net.broadcast(JSON.stringify(ev), true); } W.ev.length = 0;
    if (net && W.tick % 2 === 0 && (!W.over || W.over < 3)) net.broadcast(encodeSnap(W), false);
  } else { const i = sample(); i.seq = ++G.seq & 65535; if (net) net.send(encodeInput(i), false); if (G.lp.alive && G.slot >= 0) { G.pend.push(i); if (G.pend.length > 60) G.pend.shift(); movePlayer(G.lp, i, TICK, G.M, G.mask); } G.myFire = i.fire; G.myAng = i.ang; } }
function onSnap(buf) { const S = decodeSnap(buf); if (G.last && S.tick <= G.last.tick && G.last.tick - S.tick < 900) return; G.last = S; G.snaps.push({ t: performance.now(), S }); if (G.snaps.length > 40) G.snaps.shift(); G.mask = S.mask;
  const m = S.P.find(p => p.slot === G.slot); if (!m) return; const lp = G.lp, ox = lp.x, oy = lp.y, was = lp.alive; Object.assign(lp, { alive: m.alive, wet: m.wet, tank: m.tank, f: m.f, x: m.x, y: m.y, vx: m.vx, vy: m.vy });
  G.pend = G.pend.filter(q => ((q.seq - m.ack) & 65535) < 32768 && q.seq !== m.ack); if (m.alive) for (const q of G.pend) movePlayer(lp, q, TICK, G.M, G.mask);
  if (was && m.alive) { G.ex += ox - lp.x; G.ey += oy - lp.y; if (Math.hypot(G.ex, G.ey) > 140) G.ex = G.ey = 0; } else G.ex = G.ey = 0; }
let lastT = performance.now();
setInterval(() => { const now = performance.now(), dt = Math.min(1.2, (now - lastT) / 1000); lastT = now; if (!G) return; G.acc += dt; let n = 0; while (G && G.acc >= TICK && n++ < 40) { G.acc -= TICK; tick(); } if (G && n >= 40) G.acc = 0; }, 1000 / 60);

/* ---------- nézet: gazdánál a világból, vendégnél interpolálva ---------- */
const lerp = (a, b, t) => a + (b - a) * t, lerpA = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
function view(now) {
  if (G.host) { const W = G.W; return { P: W.P.filter(p => !p.gone).map(p => ({ slot: p.slot, x: p.x, y: p.y, ang: p.ang, wet: p.wet, tank: p.tank, alive: p.alive, score: p.score, f: (p.fx[1] > 0 ? 4 : 0) | (p.fx[0] > 0 ? 8 : 0) | (p.fx[2] > 0 ? 16 : 0) | (p.fx[3] > 0 ? 32 : 0) | (p.fx[4] > 0 ? 64 : 0) })), items: W.items, en: W.en.map(e => ({ ...e, hp: e.hp / e.max })), hs: W.hs, shots: W.shots, zr: W.zr, time: W.tmax ? Math.max(0, W.tmax - W.t) : W.t, score: W.score, g: W.g, wave: W.wave, boss: W.boss ? W.boss.hp / W.boss.max : 0, mask: W.mask }; }
  const sn = G.snaps; if (!sn.length) return null; const rt = now - 110; let a = sn[0], b = sn[sn.length - 1]; for (let i = sn.length - 1; i > 0; i--) if (sn[i - 1].t <= rt) { a = sn[i - 1]; b = sn[i]; break; } if (rt <= sn[0].t) b = a;
  const k = b.t > a.t ? Math.max(0, Math.min(1.25, (rt - a.t) / (b.t - a.t))) : 1, A = a.S, B = b.S;
  const P = B.P.map(q => { const o = A.P.find(z => z.slot === q.slot) || q, jump = Math.hypot(q.x - o.x, q.y - o.y) > 200; return q.slot === G.slot ? { ...q, x: G.lp.x + G.ex, y: G.lp.y + G.ey, ang: G.myAng ?? q.ang } : { ...q, x: jump ? q.x : lerp(o.x, q.x, k), y: jump ? q.y : lerp(o.y, q.y, k), ang: lerpA(o.ang, q.ang, Math.min(1, k)) }; });
  const en = B.en.map(q => { const o = A.en.find(z => z.id === q.id) || q; return { ...q, r: q.ty === 2 ? 36 : 16, x: lerp(o.x, q.x, Math.min(1, k)), y: lerp(o.y, q.y, Math.min(1, k)) }; });
  return { P, items: B.items, en, hs: B.hs, shots: G.drops, zr: lerp(A.zr, B.zr, Math.min(1, k)), time: B.time, score: B.score, g: B.g, wave: B.wave, boss: B.boss, mask: B.mask }; }
// vendégnél a vízsugár csak látvány: a „tüzel” jelzőből helyben rajzoljuk (a találatot a gazda dönti el)
function drops(V, dt) { if (G.host) return; for (const p of V.P) { const fire = p.slot === G.slot ? G.myFire && p.alive && (p.tank > 1.2 || p.f & 64) : p.f & 2; if (!fire || !p.alive) { G.fcd[p.slot] = 0; continue; } let cd = (G.fcd[p.slot] || 0) - dt; while (cd <= 0) { cd += p.f & 64 ? .05 : p.f & 8 ? .055 : .1; const a = p.ang + (Math.random() - .5) * .09; G.drops.push({ x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 20, vx: Math.cos(a) * 540, vy: Math.sin(a) * 540, l: RANGE / 540, o: p.slot, r: p.f & 64 ? 9 : 5 }); } G.fcd[p.slot] = cd; }
  for (const s of G.drops) { s.l -= dt; s.x += s.vx * dt; s.y += s.vy * dt; if (blocked(G.M, V.mask, s.x, s.y, 2)) s.l = 0; else for (const p of V.P) if (p.alive && p.slot !== s.o && (p.x - s.x) ** 2 + (p.y - s.y) ** 2 < 400) { s.l = 0; break; } } G.drops = G.drops.filter(s => s.l > 0); }

/* ---------- rajz ---------- */
function size() { DPR = Math.min(devicePixelRatio || 1, 2); CW = cv.width = innerWidth * DPR; CH = cv.height = innerHeight * DPR; } addEventListener('resize', size); size();
const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
let prevT = performance.now();
function draw(now) { requestAnimationFrame(draw); const dt = Math.min(.1, (now - prevT) / 1000); prevT = now; g.setTransform(1, 0, 0, 1, 0, 0);
  if (!G) { const gr = g.createLinearGradient(0, 0, 0, CH); gr.addColorStop(0, '#0c2238'); gr.addColorStop(1, '#071018'); g.fillStyle = gr; g.fillRect(0, 0, CW, CH); return; }
  const V = view(now), M = G.M, d = DPR; g.fillStyle = '#05080d'; g.fillRect(0, 0, CW, CH);
  if (!V) { g.fillStyle = '#8b9ab0'; g.font = `600 ${16 * d}px Inter, sans-serif`; g.textAlign = 'center'; g.fillText('Várakozás a gazdára…', CW / 2, CH / 2); return; }
  drops(V, dt); G.ex *= Math.exp(-12 * dt); G.ey *= Math.exp(-12 * dt);
  const mine = V.P.find(p => p.slot === G.slot), foc = mine && mine.alive ? mine : V.P.find(p => p.alive) || mine || { x: M.w / 2, y: M.h / 2 }, sc = Math.max(CW / 1280, CH / 800) * (matchMedia('(pointer: coarse)').matches ? 1.25 : 1);
  let cx = foc.x, cy = foc.y; const hw = CW / 2 / sc, hh = CH / 2 / sc; cx = M.w + 120 < hw * 2 ? M.w / 2 : Math.max(hw - 60, Math.min(M.w - hw + 60, cx)); cy = M.h + 120 < hh * 2 ? M.h / 2 : Math.max(hh - 60, Math.min(M.h - hh + 60, cy));
  camOff.x = mine ? (mine.x - cx) * sc / d : 0; camOff.y = mine ? (mine.y - cy) * sc / d : 0; if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 40);
  g.setTransform(sc, 0, 0, sc, CW / 2 - cx * sc + (Math.random() - .5) * G.shake * d, CH / 2 - cy * sc + (Math.random() - .5) * G.shake * d);
  // talaj
  g.fillStyle = M.col[0]; g.fillRect(0, 0, M.w, M.h); g.fillStyle = M.col[1]; for (let x = 0; x < M.w; x += 100) for (let y = (x / 100 % 2) * 100; y < M.h; y += 200) g.fillRect(x, y, 100, 100);
  for (const q of M.l) { g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(q[0], q[1], q[2], q[3]); g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 3; const a = Math.atan2(q[5], q[4]), ph = (now / 600) % 1; for (let i = 0; i < 3; i++) { const t = (i + ph) / 3, px = q[0] + q[2] / 2 + Math.cos(a) * (t - .5) * Math.min(q[2], q[3]) * .1 + (q[4] ? (t - .5) * q[2] * .8 * Math.sign(q[4]) : 0), py = q[1] + q[3] / 2 + (q[5] ? (t - .5) * q[3] * .8 * Math.sign(q[5]) : 0); g.beginPath(); g.moveTo(px - Math.cos(a - .6) * 12, py - Math.sin(a - .6) * 12); g.lineTo(px, py); g.lineTo(px - Math.cos(a + .6) * 12, py - Math.sin(a + .6) * 12); g.stroke(); } }
  for (const q of M.p) { g.fillStyle = 'rgba(108,198,255,.32)'; g.beginPath(); g.ellipse(q[0], q[1], q[2], q[2] * .86, 0, 0, 6.283); g.fill(); g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.ellipse(q[0] - q[2] * .25, q[1] - q[2] * .25, q[2] * .3, q[2] * .16, -.5, 0, 6.283); g.fill(); }
  if (G.md.id === 'kert') for (let t = 0; t < 2; t++) { const [gx, gy] = [[170, M.h / 2], [M.w - 170, M.h / 2]][t], m = V.g[t] / 100; g.fillStyle = `rgba(${Math.round(160 - 110 * m)},${Math.round(120 + 90 * m)},70,.45)`; g.beginPath(); g.arc(gx, gy, 120, 0, 6.283); g.fill(); g.strokeStyle = TEAMC[t]; g.lineWidth = 5; g.setLineDash([14, 10]); g.stroke(); g.setLineDash([]); g.font = '34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(m > .5 ? '🌻' : m > .15 ? '🌱' : '🥀', gx, gy); }
  for (const q of M.t) { g.fillStyle = 'rgba(108,198,255,.16)'; g.beginPath(); g.arc(q[0], q[1], 50, 0, 6.283); g.fill(); g.fillStyle = '#c3ced9'; rr(q[0] - 9, q[1] - 14, 18, 28, 5); g.fill(); g.fillStyle = '#ff5a4d'; g.fillRect(q[0] - 12, q[1] - 18, 24, 5); g.fillStyle = '#6cc6ff'; g.beginPath(); g.arc(q[0], q[1] + 20 + Math.sin(now / 200 + q[0]) * 2, 4, 0, 6.283); g.fill(); }
  for (const q of M.s) { g.fillStyle = '#46525f'; g.beginPath(); g.arc(q[0], q[1], 9, 0, 6.283); g.fill(); g.fillStyle = '#e8b656'; g.beginPath(); g.arc(q[0], q[1], 4.5, 0, 6.283); g.fill(); }
  for (const s of G.spr) { s.l -= dt; g.strokeStyle = `rgba(150,215,255,${Math.max(0, s.l)})`; g.lineWidth = 6; g.beginPath(); g.arc(s.x, s.y, 150 * (1 - s.l / .7), 0, 6.283); g.stroke(); } G.spr = G.spr.filter(s => s.l > 0);
  for (const q of M.b) { g.fillStyle = '#1a2230'; rr(q[0], q[1], q[2], q[3], 5); g.fill(); g.fillStyle = M.col[2]; rr(q[0] + 3, q[1] + 3, q[2] - 6, q[3] - 9, 4); g.fill(); }
  M.hedges.forEach((q, i) => { if (!(V.mask >>> i & 1)) return; g.fillStyle = '#0f3d1c'; rr(q[0], q[1], q[2], q[3], 9); g.fill(); g.fillStyle = '#2f8f3f'; rr(q[0] + 3, q[1] + 2, q[2] - 6, q[3] - 8, 7); g.fill(); });
  for (const q of M.c) { g.fillStyle = '#2c7a3a'; g.beginPath(); g.arc(q[0], q[1], q[2], 0, 6.283); g.fill(); g.strokeStyle = '#d8f0c0'; g.lineWidth = 2; for (let i = 0; i < 8; i++) { const a = i * .785; g.beginPath(); g.moveTo(q[0] + Math.cos(a) * q[2] * .7, q[1] + Math.sin(a) * q[2] * .7); g.lineTo(q[0] + Math.cos(a) * (q[2] + 5), q[1] + Math.sin(a) * (q[2] + 5)); g.stroke(); } }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const it of V.items) { const I = ITEMS[it.ty], by = it.y + Math.sin(now / 300 + it.id) * 3; g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(it.x, it.y + 16, 14, 5, 0, 0, 6.283); g.fill(); g.fillStyle = I.c; g.beginPath(); g.arc(it.x, by, 15, 0, 6.283); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); g.font = '17px sans-serif'; g.fillText(I.ic, it.x, by + 1); }
  for (const s of V.shots) { g.fillStyle = s.r > 6 ? '#ffe29a' : 'rgba(170,225,255,.95)'; g.beginPath(); g.arc(s.x, s.y, s.r || 5, 0, 6.283); g.fill(); }
  for (const s of V.hs) { g.fillStyle = '#ff7a2e'; g.beginPath(); g.arc(s.x, s.y, 8, 0, 6.283); g.fill(); g.fillStyle = '#ffe29a'; g.beginPath(); g.arc(s.x, s.y, 4, 0, 6.283); g.fill(); }
  for (const e of V.en) { const r = e.r || 16; if (e.ty === 2) { g.fillStyle = '#7a3b1a'; g.beginPath(); g.arc(e.x, e.y, r, 0, 6.283); g.fill(); g.fillStyle = '#d8a45a'; g.beginPath(); g.arc(e.x, e.y - 4, r * .72, 0, 6.283); g.fill(); g.fillStyle = '#1b0d04'; g.fillRect(e.x - 16, e.y - 12, 12, 4); g.fillRect(e.x + 4, e.y - 12, 12, 4); g.fillRect(e.x - 9, e.y + 8, 18, 3); g.font = '700 13px Inter, sans-serif'; g.fillStyle = '#ffe29a'; g.fillText('SZIKKADT SZILÁRD', e.x, e.y - r - 20); }
    else { g.fillStyle = e.ty === 1 ? '#c2571f' : '#3f9a4a'; rr(e.x - r * .7, e.y - r, r * 1.4, r * 2, r * .7); g.fill(); g.fillStyle = '#10200f'; g.beginPath(); g.arc(e.x - 4, e.y - 3, 2.2, 0, 6.283); g.arc(e.x + 4, e.y - 3, 2.2, 0, 6.283); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(e.x - r, e.y - r - 10, r * 2, 4); g.fillStyle = '#ff7a2e'; g.fillRect(e.x - r, e.y - r - 10, r * 2 * e.hp, 4); }
  for (const p of V.P) { if (!p.alive) continue; const s = G.cfg.slots[p.slot] || {}, team = G.md.teams ? TEAMC[p.slot % 2] : null, own = p.slot === G.slot, ally = own || (G.md.coop || (team && mine && p.slot % 2 === G.slot % 2)); if (p.f & 4 && !ally) continue;
    g.save(); g.translate(p.x, p.y); g.globalAlpha = p.f & 4 ? .35 : 1; g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(0, 6, PR + 2, PR * .8, 0, 0, 6.283); g.fill();
    if (p.f & 64) { g.fillStyle = 'rgba(232,182,86,.35)'; g.beginPath(); g.arc(0, 0, PR + 9 + Math.sin(now / 80) * 2, 0, 6.283); g.fill(); } if (p.f & 32) { g.strokeStyle = 'rgba(108,198,255,.9)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, PR + 6, 0, 6.283); g.stroke(); }
    g.rotate(p.ang); g.fillStyle = '#1a2230'; rr(-PR, -PR * .8, PR * 2, PR * 1.6, 6); g.fill(); g.fillStyle = s.color || COLORS[p.slot % 8]; rr(-PR + 2, -PR * .8 + 2, PR * 2 - 4, PR * 1.6 - 4, 5); g.fill();
    g.fillStyle = 'rgba(108,198,255,.85)'; rr(-PR + 4, -PR * .5, PR * .9 * Math.max(.08, p.tank / 100) + 2, PR, 3); g.fill(); g.fillStyle = '#c3ced9'; g.fillRect(PR * .2, -3.5, PR + 6, 7); g.fillStyle = p.f & 64 ? '#e8b656' : '#46525f'; g.fillRect(PR + 3, -5, 6, 10); g.restore();
    if (team) { g.strokeStyle = team; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y, PR + 3, 0, 6.283); g.stroke(); }
    g.font = '700 12px Inter, sans-serif'; g.fillStyle = own ? '#ffe29a' : '#fff'; g.globalAlpha = p.f & 4 ? .4 : 1; g.fillText(nameOf(p.slot), p.x, p.y - PR - 18); g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(p.x - 20, p.y - PR - 10, 40, 5); g.fillStyle = p.wet > 70 ? '#ff5a4d' : '#6cc6ff'; g.fillRect(p.x - 20, p.y - PR - 10, 40 * Math.min(1, p.wet / 100), 5); g.globalAlpha = 1; }
  // az aszály zónája
  if (G.md.id === 'ffa') { g.save(); g.beginPath(); g.rect(-2000, -2000, M.w + 4000, M.h + 4000); g.moveTo(M.w / 2 + V.zr, M.h / 2); g.arc(M.w / 2, M.h / 2, V.zr, 0, Math.PI * 2); g.closePath(); g.fillStyle = 'rgba(214,120,40,.38)'; g.fill('evenodd'); g.restore(); g.strokeStyle = '#ffb347'; g.lineWidth = 4; g.beginPath(); g.arc(M.w / 2, M.h / 2, V.zr, 0, 6.283); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 6; g.strokeRect(0, 0, M.w, M.h);
  hud(V, mine, now, dt); }
function hud(V, mine, now, dt) { const d = DPR; g.setTransform(d, 0, 0, d, 0, 0); const W = innerWidth, H = innerHeight; g.textBaseline = 'middle';
  const pill = (x, y, w, t, col = '#fff') => { g.fillStyle = 'rgba(8,12,22,.78)'; rr(x, y, w, 28, 14); g.fill(); g.fillStyle = col; g.font = '700 13px Inter, sans-serif'; g.textAlign = 'center'; g.fillText(t, x + w / 2, y + 15); };
  const tm = Math.max(0, Math.round(V.time)), ts = Math.floor(tm / 60) + ':' + String(tm % 60).padStart(2, '0'), id = G.md.id;
  pill(10, 10, 70, ts); if (id === 'ffa') pill(86, 10, 110, V.P.filter(p => p.alive).length + ' száraz'); else if (id === 'tdm') { pill(86, 10, 56, V.score[0] + '', TEAMC[0]); pill(146, 10, 56, V.score[1] + '', TEAMC[1]); } else if (id === 'kert') { pill(86, 10, 76, '🌻 ' + Math.round(V.g[0]) + '%', TEAMC[0]); pill(166, 10, 76, '🌻 ' + Math.round(V.g[1]) + '%', TEAMC[1]); } else pill(86, 10, 100, V.wave + '. hullám');
  if (id === 'coop' && V.boss > 0) { g.fillStyle = 'rgba(8,12,22,.78)'; rr(W / 2 - 150, 46, 300, 16, 8); g.fill(); g.fillStyle = '#ff7a2e'; rr(W / 2 - 148, 48, 296 * V.boss, 12, 6); g.fill(); }
  if (net) pill(W - 196, 10, 92, net.isHost() ? 'gazda' : net.connected() ? net.ping() + ' ms' : 'nincs kapcs.', net.isHost() ? '#e8b656' : net.connected() ? (net.ping() < 120 ? '#5ee08a' : '#ffd84a') : '#ff5a4d');
  if (mine) { const bw = Math.min(300, W - 40), x = W / 2 - bw / 2, y = H - 54; g.fillStyle = 'rgba(8,12,22,.78)'; rr(x - 8, y - 8, bw + 16, 46, 12); g.fill();
    g.fillStyle = 'rgba(255,255,255,.12)'; rr(x, y, bw, 12, 6); g.fill(); g.fillStyle = mine.wet > 70 ? '#ff5a4d' : '#6cc6ff'; rr(x, y, Math.max(4, bw * Math.min(1, mine.wet / 100)), 12, 6); g.fill();
    g.fillStyle = 'rgba(255,255,255,.12)'; rr(x, y + 18, bw, 12, 6); g.fill(); g.fillStyle = mine.tank < 15 ? '#ffd84a' : '#5ee08a'; rr(x, y + 18, Math.max(4, bw * mine.tank / 100), 12, 6); g.fill();
    g.font = '800 9px Inter, sans-serif'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 3; g.textAlign = 'left'; g.fillText('ÁZOTTSÁG', x + 6, y + 6.5); g.fillText(mine.tank < 15 ? 'TARTÁLY – TÖLTS A CSAPNÁL!' : 'TARTÁLY', x + 6, y + 24.5);
    g.shadowBlur = 0; let ix = x; g.font = '18px sans-serif'; [[8, 0], [4, 1], [16, 2], [32, 3], [64, 4]].forEach(([b, i]) => { if (mine.f & b) { g.fillText(ITEMS[i].ic, ix, y - 22); ix += 26; } }); }
  g.textAlign = 'right'; g.font = '600 12px Inter, sans-serif'; G.feedL.forEach((f, i) => { f.l -= dt; g.globalAlpha = Math.min(1, f.l); g.fillStyle = 'rgba(8,12,22,.7)'; const w = g.measureText(f.t).width + 16; rr(W - 10 - w, 46 + i * 26, w, 22, 8); g.fill(); g.fillStyle = '#fff'; g.fillText(f.t, W - 18, 58 + i * 26); }); g.globalAlpha = 1; G.feedL = G.feedL.filter(f => f.l > 0);
  if (G.msg) { G.msg.l -= dt; g.globalAlpha = Math.min(1, G.msg.l * 2); g.textAlign = 'center'; g.font = `900 ${Math.min(40, W / 14)}px Cinzel, Georgia, serif`; g.fillStyle = '#e8b656'; g.fillText(G.msg.a, W / 2, H * .3); g.font = '600 15px Inter, sans-serif'; g.fillStyle = '#fff'; g.fillText(G.msg.b || '', W / 2, H * .3 + 34); g.globalAlpha = 1; if (G.msg.l <= 0) G.msg = null; }
  if (G.note) { G.note.l -= dt; g.textAlign = 'center'; g.font = '700 13px Inter, sans-serif'; const w = g.measureText(G.note.t).width + 24; g.fillStyle = 'rgba(120,60,10,.9)'; rr(W / 2 - w / 2, 46, w, 26, 10); g.fill(); g.fillStyle = '#fff'; g.fillText(G.note.t, W / 2, 59); if (G.note.l <= 0) G.note = null; }
  for (const k of ['mv', 'am']) if (T[k]) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath(); g.arc(T[k].x0, T[k].y0, 46, 0, 6.283); g.stroke(); const dx = T[k].x - T[k].x0, dy = T[k].y - T[k].y0, dd = Math.hypot(dx, dy) || 1, kk = Math.min(46, dd) / dd; g.fillStyle = k === 'am' ? 'rgba(108,198,255,.6)' : 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(T[k].x0 + dx * kk, T[k].y0 + dy * kk, 20, 0, 6.283); g.fill(); }
  $('#hudq').hidden = !$('#menu').hidden || !$('#lobby').hidden || !$('#res').hidden; }
requestAnimationFrame(draw);
window.__vz = () => ({ G, net, lobby, me, room });
boot();
