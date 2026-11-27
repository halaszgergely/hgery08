// Kohóvár – többjátékos mód (kooperatív): a szoba gazdája futtatja a világot, a vendégek a gazdára csatlakoznak.
// Hálózat: a közös HGWS réteg (js/net.js, WebRTC, csillag topológia). A Firestore csak a bemutatkozáshoz kell (szoba + kapcsolatonként
// 2 jelzés), játék közben semmit nem ír és nem olvas – így nem fogy a napi keret.
// A gazda → vendég forgalom érdeklődés szerint szűrt: csak a vendég nézete körüli egységek, lövedékek és épületállapotok mennek,
// az épületállapotból is csak az, ami megváltozott. A vendég a bemenetét (mozgás, célzás, lövés) és a műveleteit (építés, bontás…) küldi.
import { TS, BLOCKS, UNITS, ITEMS } from './adat.js?v=202611271824';
import { joinRoom, localSignal, fireSignal } from '../../js/net.js?v=202611271824';

const GAME = 'kohovar', CH = 48000, SNAP = 100, DSTATE = 200;
export const MP = { on: false, host: false, guest: false, room: null, roomId: null, me: null, name: '', peers: new Map(), research: null, myUnit: -1, status: '', mods: [] };
let sig = null, net = null, core = null, F = null, inbox = {}, lastSnap = 0, lastState = 0, lastSlow = 0, gIn = { t: 0 };
const Q = new URLSearchParams(location.search), LOCAL = Q.has('local');

/* ---------- tömörítés (a kezdő állapothoz) ---------- */
async function gz(str) { const s = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip')); const u8 = new Uint8Array(await new Response(s).arrayBuffer()); let b = ''; for (let i = 0; i < u8.length; i += 0x8000) b += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(b); }
async function ungz(b64) { const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).text(); }
const tb64 = a => { const u8 = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); let b = ''; for (let i = 0; i < u8.length; i += 0x8000) b += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(b); };
const fb64 = (s, T) => { const bin = atob(s), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return new T(u8.buffer); };
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;

/* ---------- belépés, szoba ---------- */
export async function initMp(f) {
  F = f;
  if (LOCAL) { MP.me = Q.get('uid') || 'u' + Math.random().toString(36).slice(2, 7); MP.name = Q.get('name') || 'Teszt'; sig = localSignal('kohovar_net'); return true; }
  try { core = await import('../../js/core.js?v=202611271824'); } catch (_) { core = null; }
  if (!core || core.notConfigured || !core.auth) return false;
  return new Promise(ok => core.FB.onAuthStateChanged(core.auth, async u => {
    if (u && !u.isAnonymous) { MP.me = u.uid; MP.name = u.displayName || 'Tag'; try { const s = await core.FB.getDoc(core.FB.doc(core.db, 'users', u.uid)); if (s.exists()) MP.name = s.data().name || MP.name; } catch (_) {} sig = fireSignal(core.FB, core.db); }
    else { sig = null; MP.me = null; }
    ok(!!sig); F.mpUi();
  }));
}
export const canMp = () => !!sig;
let unList = null;
export function listRooms(cb) { if (!sig) return cb([]); if (unList) unList(); unList = sig.list(MP.me, rooms => cb(rooms.filter(r => r.game === GAME && r.host !== MP.me && r.members.length < r.max))); }
async function friends() {
  if (LOCAL || !core) return [];
  try { const FB = core.FB, s = await FB.getDocs(FB.query(FB.collection(core.db, 'friends'), FB.where('users', 'array-contains', MP.me))); return s.docs.map(d => d.data()).filter(d => d.status === 'accepted').map(d => d.users.find(u => u !== MP.me)).slice(0, 100); } catch (_) { return []; }
}
export async function createRoom(open) {
  if (!sig || net) return false; const vis = open ? await friends() : [];
  const id = await sig.create({ host: MP.me, hostName: MP.name.slice(0, 40), game: GAME, mode: 'coop', map: '-', max: 8, open: !!open, state: 'lobby', members: [MP.me], vis: LOCAL ? [] : vis });
  if (LOCAL) await sig.update(id, { open: true });
  enter(id); return id;
}
export async function joinRoomId(id) { if (!sig || net) return false; try { await sig.join(id, MP.me); } catch (_) { MP.status = 'Ebbe a szobába nem léphetsz be.'; F.mpUi(); return false; } enter(id); return true; }
function enter(id) {
  MP.roomId = id; MP.on = true; MP.status = 'Belépés…';
  net = joinRoom({ sig, id, me: MP.me, name: MP.name, on: {
    room: r => { MP.room = r; if (!r) leave('A szoba megszűnt.'); F.mpUi(); },
    role: isHost => { MP.host = isHost; MP.guest = !isHost; if (isHost) { MP.status = 'Te vagy a gazda – indíts egy játékot, a vendégek abba lépnek be.'; } else MP.status = 'Csatlakozás a gazdához…'; F.mpUi(); },
    peer: (uid, up) => { if (MP.host) { if (up) hostPeerUp(uid); else hostPeerDown(uid); } else { MP.status = up ? 'Várakozás a gazdára…' : 'A kapcsolat megszakadt – újracsatlakozás…'; if (up) net.send(JSON.stringify({ e: 'hi', name: MP.name, mods: F.modIds() }), true); F.mpUi(); } },
    msg: (from, d, rel) => onMsg(from, d, rel), status: (t, k) => { if (t) { MP.status = t; F.mpUi(); } },
  } });
  window.__mpnet = net; F.mpUi();
}
export async function leave(why) {
  const n = net; net = null; const wasGuest = MP.guest;
  MP.on = false; MP.host = false; MP.guest = false; MP.room = null; MP.roomId = null; MP.peers.clear(); MP.research = null; MP.myUnit = -1; MP.status = why || '';
  if (n) await n.close(true);
  if (wasGuest) F.guestEnd(why); F.mpUi();
}
export const inviteLink = () => MP.roomId ? location.origin + location.pathname.replace(/[^/]*$/, '') + 'index.html?room=' + MP.roomId : '';
export const roster = () => MP.room ? MP.room.members.map(u => ({ uid: u, host: MP.room.host === u, name: u === MP.me ? MP.name : (MP.peers.get(u) || {}).name || (MP.room.host === u ? MP.room.hostName : 'Játékos') })) : [];

/* ---------- üzenetek ---------- */
function onMsg(from, d, rel) {
  if (typeof d !== 'string') return; let m; try { m = JSON.parse(d); } catch (_) { return; }
  if (MP.host) return hostMsg(from, m);
  guestMsg(m);
}

/* ================= GAZDA ================= */
// vendégenként: a nézete (amit lát), az utoljára küldött épületállapotok, az egysége
function hostPeerUp(uid) { MP.peers.set(uid, { uid, name: 'Játékos', view: null, sent: new Map(), unit: null, inp: null, plansH: '', seenN: -1, ready: false }); F.mpUi(); const W = F.W(); if (W) sendInit(uid); }
function hostPeerDown(uid) { const p = MP.peers.get(uid); const W = F.W(); if (p && p.unit && W) { p.unit.dead = 1; W.msg(p.name + ' kilépett'); } MP.peers.delete(uid); F.mpUi(); }
function hostMsg(from, m) {
  const p = MP.peers.get(from); if (!p) return; const W = F.W();
  if (m.e === 'hi') { p.name = String(m.name || 'Játékos').slice(0, 24); const miss = F.modIds().filter(x => !(m.mods || []).includes(x)); p.mods = miss; F.mpUi(); if (W) W.msg(p.name + ' csatlakozott'); return; }
  if (m.e === 'ready') { p.ready = true; return; }
  if (!W) return;
  if (m.e === 'in') { p.inp = m; p.view = m.v; return; }
  if (m.e === 'act') return hostAct(W, p, m);
}
// a vendég műveletei: ugyanazok a világfüggvények, amelyeket a gazda felülete is hív
function hostAct(W, p, m) {
  const a = m.a || [], b = () => W.tb(a[0], a[1]);
  switch (m.k) {
    case 'plan': if (BLOCKS[a[0]]) W.plan(a[0], a[1] | 0, a[2] | 0, a[3] | 0, a[4] ?? null); break;
    case 'unplan': { const o = b(); if (o) W.unplan(o); break; }
    case 'cancel': W.cancelAt(a[0] | 0, a[1] | 0); break;
    case 'rot': W.rotateAt(a[0] | 0, a[1] | 0, a[2] | 0); break;
    case 'prio': W.prioritize(a[0] | 0, a[1] | 0); break;
    case 'link': { const o = b(), q = W.tb(a[2], a[3]); if (o && q && o.team === 1) W.toggleLink(o, q); break; }
    case 'mine': if (p.unit && !p.unit.dead) p.unit.mine = a[0] == null ? -1 : a[0] | 0; break;
    case 'state': { const o = b(); if (o && o.team === 1) { const s = a[2] || {}; for (const k of ['cfg', 'open', 'off', 'link']) if (k in s) o[k] = s[k]; W.ver++; W.fdirty = 1; } break; }
    case 'rally': W.rally(a[0], a[1]); break;
    case 'cmd': { const ids = new Set(a[0] || []), L = W.units.filter(u => ids.has(u.id)), t = a[3] ? (a[3][0] === 'u' ? W.units.find(u => u.id === a[3][1] && u.team === 2) : W.tb(a[3][1], a[3][2])) : null; W.command(L, +a[1] || 0, +a[2] || 0, t && (t.U || t.team === 2) ? t : null); break; }
    case 'wave': W.nextWave(); break;
  }
}
// kezdő állapot: a terep tömörítve + a teljes épület- és tervlista + a gazda kutatásai
async function sendInit(uid) {
  const W = F.W(); if (!W) return; const p = MP.peers.get(uid); if (!p) return;
  if (!p.unit || p.unit.dead) p.unit = spawnGuest(W, p);
  p.sent = new Map(); p.plansH = ''; p.seenN = -1;
  const sec = F.SEC(), gen = { floor: tb64(W.floor), ore: tb64(W.ore), wall: tb64(W.wall), prop: tb64(W.prop || new Uint8Array(W.w * W.h)), props: W.props || [], spawns: W.spawns, coreAt: { x: W.core.x, y: W.core.y }, coreT: W.core.t, area: W.area || null };
  const s = { sec: { id: sec.id, n: sec.n, w: W.w, h: W.h, planet: sec.planet, camp: sec.camp, fog: sec.fog, gen: sec.gen, wt: sec.wt, win: sec.win, free: sec.free ? 1 : 0, rules: W.rules, start: {} }, gen,
    blds: W.blds.map(b => [b.t, b.x, b.y, b.rot, b.team, b.cfg ?? null, Math.round(b.hp)]), plans: plansOf(W), research: F.research(), seen: tb64(W.seen), wave: W.wave, wt: W.wtimer, items: W.core.items, unit: p.unit.id, mods: F.modIds() };
  const str = await gz(JSON.stringify(s)), n = Math.ceil(str.length / CH), id = Math.random().toString(36).slice(2, 8);
  for (let i = 0; i < n; i++) net.sendTo(uid, JSON.stringify({ e: 'init', id, i, n, d: str.slice(i * CH, (i + 1) * CH) }), true);
}
function spawnGuest(W, p) {
  const c = W.center(W.core), u = W.spawnU(W.core.B.unit, 1, c.x + (Math.random() - .5) * 16, c.y + (Math.random() - .5) * 16);
  u.ctl = { ax: 0, ay: 0, shoot: false, mx: c.x, my: c.y }; u.net = p.uid; u.pname = p.name; return u;
}
const plansOf = W => W.plans.map(q => [q.t, q.x, q.y, q.rot | 0, q.brk ? 1 : 0, r2(q.prog || 0)]);
// a gazda játéka elindult / véget ért
export function hostStart() { if (!MP.host) return; for (const uid of MP.peers.keys()) sendInit(uid); }
export function hostEnd(won) { if (!MP.host || !net) return; net.broadcast(JSON.stringify({ e: 'end', won: won == null ? null : !!won }), true); for (const p of MP.peers.values()) { p.unit = null; p.ready = false; } }
// körönként: a vendégek egységeinek bemenete, újraéledés
export function hostTick(W) {
  if (!MP.host || !MP.peers.size) return;
  for (const p of MP.peers.values()) {
    if (!p.ready) continue;
    if (!p.unit || (p.unit.dead && !W.units.includes(p.unit))) { p.respawn = (p.respawn || 150) - 1; if (p.respawn <= 0) { p.respawn = 150; p.unit = spawnGuest(W, p); } continue; }
    const u = p.unit, m = p.inp; if (!m) continue;
    u.ctl.ax = Math.max(-1, Math.min(1, +m.ax || 0)); u.ctl.ay = Math.max(-1, Math.min(1, +m.ay || 0)); u.ctl.shoot = !!m.sh; u.ctl.mx = +m.mx || 0; u.ctl.my = +m.my || 0; u.ctl.noBuild = !!m.nb;
  }
}
// hálózati küldés (a gazda képkockájából): 10/mp pillanatkép (egységek, lövedékek, effektek), 5/mp épületállapot és események
export function hostSend(W) {
  if (!MP.host || !net || !MP.peers.size) return; const now = performance.now();
  const snap = now - lastSnap >= SNAP, state = now - lastState >= DSTATE, slow = now - lastSlow >= 1000; if (!snap && !state) return;
  if (snap) lastSnap = now; if (state) lastState = now; if (slow) lastSlow = now;
  if (!W.netLog) { W.netLog = []; W.netMsgs = []; W.netSeen = []; }
  const log = state ? W.netLog.splice(0) : [], msgs = state ? W.netMsgs.splice(0) : [], sn = state ? W.netSeen.splice(0) : [];
  const plans = state ? plansOf(W) : null, plansH = plans ? JSON.stringify(plans) : '';
  for (const p of MP.peers.values()) {
    if (!p.ready) continue;
    const v = p.view || (p.unit ? [p.unit.x - 400, p.unit.y - 300, 800, 600] : [0, 0, W.w * TS, W.h * TS]), M = 120, inV = (x, y) => x >= v[0] - M && x <= v[0] + v[2] + M && y >= v[1] - M && y <= v[1] + v[3] + M;
    if (snap) {
      const u = []; for (const q of W.units) { if (q.dead && q !== p.unit) continue; if (q !== p.unit && !inV(q.x, q.y)) continue; u.push([q.id, q.t, q.team, r1(q.x), r1(q.y), r2(q.rot), q.aim == null ? null : r2(q.aim), q.walk | 0, Math.round(q.hp), Math.round(q.sh || 0), q.hit | 0, Object.keys(q.st || {}).filter(k => k !== 'od').join(','), q.mining && q.mine >= 0 ? q.mine : -1, q.stack ? [q.stack.it, q.stack.n] : 0, q.building && !q.building.done ? [q.building.x, q.building.y, q.building.B.s, q.building.brk ? 1 : 0] : 0, r1(q.vx || 0), r1(q.vy || 0), q.beam && q.beam.x != null ? [r1(q.beam.x), r1(q.beam.y)] : 0, q.pname || 0]); if (u.length >= 400) break; }
      const bl = []; for (const q of W.bullets) { if (!inV(q.x, q.y)) continue; bl.push([r1(q.x), r1(q.y), r2(q.vx), r2(q.vy), q.k || 0, q.c || 0, q.c2 || 0, q.sz || 0, q.tr || 0, q.k === 'art' ? [r1(q.sx), r1(q.sy), r1(q.tx), r1(q.ty), q.life | 0] : 0]); if (bl.length >= 250) break; }
      const fx = []; for (const q of W.fx) { if (q.k === 'rubble' || (q.x != null && !inV(q.x, q.y))) continue; fx.push(q); if (fx.length >= 150) break; }
      net.sendTo(p.uid, JSON.stringify({ e: 's', tk: W.tick, me: p.unit && !p.unit.dead ? p.unit.id : -1, u, b: bl, fx, w: [W.wave, Math.round(W.wtimer), W.nEn || 0] }), false);
    }
    if (state) {
      const blk = []; for (const b of W.blds) { const s = b.B.s; if (!inV((b.x + s / 2) * TS, (b.y + s / 2) * TS)) continue; const st = bstate(b), h = JSON.stringify(st); if (p.sent.get(b) === h) continue; p.sent.set(b, h); blk.push([b.x, b.y, st]); if (blk.length >= 600) break; }
      const o = { e: 'd' }; if (blk.length) o.blk = blk; if (log.length) o.log = log; if (msgs.length) o.msg = msgs; if (plansH !== p.plansH) { o.plans = plans; p.plansH = plansH; }
      if (sn.length) o.sn = sn; if (slow) o.items = W.core.items;
      if (Object.keys(o).length > 1) net.sendTo(p.uid, JSON.stringify(o), true);
    }
  }
  for (const [x, y] of log.filter(e => e[0] === 'rem').map(e => [e[1], e[2]])) for (const p of MP.peers.values()) for (const b of p.sent.keys()) if (b.dead) p.sent.delete(b);
}
// egy épület változó, rajzhoz kellő állapota
const BK = ['team', 'hp', 'rot', 'ang', 'heat', 'work', 'prog', 'lq', 'lt', 'ps', 'off', 'open', 'cfg', 'link', 'pay', 'burn', 'warm', 'chg', 'beamT', 'bx', 'by', 'dItem', 'oq', 'pw', 'hOut', 'tp', 'rotA'];
function bstate(b) {
  const o = {}; for (const k of BK) { const v = b[k]; if (v == null || v === 0 || v === false) continue; o[k] = typeof v === 'number' ? (k === 'hp' ? Math.round(v) : r2(v)) : v; }
  if (b.cv && b.cv.length) o.cv = b.cv.map(e => [e.it, r2(e.p)]); if (b.st) o.st = [b.st.it, b.st.n]; if (b.links && b.links.length) o.ln = b.links.map(q => q.i);
  if (b.ammo && b.ammo.length) o.am = b.ammo[b.ammo.length - 1].it; if (b.B.type === 'core' || b.B.type === 'storage') { const it = {}; for (const k in b.items) if (b.items[k] > 0) it[k] = b.items[k]; o.it = it; }
  if (b.tgt && !b.tgt.dead) o.tg = [r1(b.tgt.x != null && b.tgt.U ? b.tgt.x : (b.tgt.x + b.tgt.B.s / 2) * TS), r1(b.tgt.U ? b.tgt.y : (b.tgt.y + b.tgt.B.s / 2) * TS)];
  return o;
}

/* ================= VENDÉG ================= */
function guestMsg(m) {
  if (m.e === 'init') { const I = inbox[m.id] = inbox[m.id] || { n: m.n, p: [] }; I.p[m.i] = m.d; if (I.p.filter(x => x != null).length === I.n) { delete inbox[m.id]; ungz(I.p.join('')).then(t => guestInit(JSON.parse(t))).catch(e => { console.warn(e); MP.status = 'A pálya nem tölthető be'; F.mpUi(); }); } return; }
  const W = F.W(); if (!W || !W.mpGuest) return;
  if (m.e === 's') return guestSnap(W, m);
  if (m.e === 'd') return guestState(W, m);
  if (m.e === 'end') { F.guestEnd(m.won == null ? 'A gazda kilépett a játékból.' : m.won ? 'Győzelem!' : 'A mag elpusztult.'); MP.status = 'Várakozás a gazdára…'; F.mpUi(); }
}
function guestInit(s) {
  const miss = (s.mods || []).filter(x => !F.modIds().includes(x));
  if (miss.length) { MP.status = 'A gazdánál bekapcsolt modok kellenek: ' + miss.join(', '); F.mpUi(); return; }
  const g = s.gen, N = s.sec.w * s.sec.h;
  const gen = { floor: fb64(g.floor, Uint16Array), ore: fb64(g.ore, Uint8Array), wall: fb64(g.wall, Uint16Array), prop: fb64(g.prop, Uint8Array), props: g.props, spawns: g.spawns, coreAt: g.coreAt, coreT: g.coreT, coreItems: {}, mapB: [], area: g.area };
  if (gen.floor.length !== N) { MP.status = 'Hibás pályaadat'; F.mpUi(); return; }
  MP.research = new Set(s.research || []);
  const W = F.startGuest({ ...s.sec, __gen: gen, map: null });
  W.mpGuest = 1; W.units = []; W.player = null; W.plans = []; W.wave = s.wave; W.wtimer = s.wt; W.core.items = s.items || {};
  for (const b of [...W.blds]) if (b !== W.core) W.remB(b);
  for (const [t, x, y, rot, team, cfg, hp] of s.blds) { if (!BLOCKS[t]) continue; if (W.core && W.core.x === x && W.core.y === y && W.core.t === t) continue; try { const b = W.addB(t, x, y, rot, cfg, team); b.hp = hp; } catch (_) {} }
  if (s.seen) W.seen.set(fb64(s.seen, Uint8Array).subarray(0, N));
  setPlans(W, s.plans); MP.myUnit = s.unit; guestOverrides(W);
  net.send(JSON.stringify({ e: 'ready' }), true); MP.status = ''; F.mpUi();
}
function setPlans(W, L) { W.plans = (L || []).filter(q => BLOCKS[q[0]]).map(([t, x, y, rot, brk, prog]) => ({ t, B: BLOCKS[t], x, y, rot, brk: !!brk, prog, paid: {}, cfg: null, b: brk ? W.tb(x, y) : null })); }
// a vendég világa nem szimulál: a műveletek a gazdához mennek
function guestOverrides(W) {
  const act = (k, ...a) => net && net.send(JSON.stringify({ e: 'act', k, a }), true);
  W.plan = (t, x, y, rot, cfg) => { act('plan', t, x, y, rot, cfg ?? null); if (!W.plans.some(q => q.x === x && q.y === y)) W.plans.push({ t, B: BLOCKS[t], x, y, rot, brk: false, prog: 0, paid: {}, cfg: null }); return true; };
  W.unplan = b => { act('unplan', b.x, b.y); return true; };
  W.cancelAt = (x, y) => { const had = W.plans.some(q => !q.brk && x >= q.x && y >= q.y && x < q.x + q.B.s && y < q.y + q.B.s); act('cancel', x, y); if (had) W.plans = W.plans.filter(q => !(x >= q.x && y >= q.y && x < q.x + q.B.s && y < q.y + q.B.s)); return had; };
  W.rotateAt = (x, y, d) => { const p = W.planAt(x, y), b = W.tb(x, y); if (!(p || (b && b.B.rot && b.team === 1))) return false; act('rot', x, y, d); return true; };
  W.prioritize = (x, y) => { if (!W.planAt(x, y)) return false; act('prio', x, y); return true; };
  W.toggleLink = (a, b) => { act('link', a.x, a.y, b.x, b.y); };
  W.rally = (x, y) => { act('rally', x, y); return 0; };
  W.command = (L, x, y, t) => { act('cmd', L.map(u => u.id), x, y, t ? (t.U ? ['u', t.id] : ['b', t.x, t.y]) : null); return L.length; };
  W.nextWave = () => act('wave');
  W.mpState = b => act('state', b.x, b.y, { cfg: b.cfg ?? null, open: !!b.open, off: !!b.off, link: b.link ?? -1 });
  W.mpMine = i => act('mine', i);
  W.save = () => null;
}
// pillanatkép: egységek (simítva), lövedékek, effektek, hullám
const UMAP = new Map();
function guestSnap(W, m) {
  if (m.tk < (W.mpTk || 0)) return; W.mpTk = m.tk; W.tick = m.tk;
  const seen = new Set(), out = [];
  for (const a of m.u) {
    const [id, t, team, x, y, rot, aim, walk, hp, sh, hit, st, mine, stack, bld, vx, vy, beam, pname] = a; if (!UNITS[t]) continue; seen.add(id);
    let u = UMAP.get(id); if (!u || u.t !== t) { u = { id, t, U: UNITS[t], team, x, y, rot, wc: [], st: {}, walk: 0, hp, vx: 0, vy: 0 }; UMAP.set(id, u); }
    u.tx = x; u.ty = y; u.trot = rot; u.team = team; u.aim = aim; u.walk = walk; u.hp = hp; u.sh = sh; u.hit = hit; u.vx = vx; u.vy = vy; u.dead = 0; u.pname = pname || null;
    u.st = {}; if (st) for (const k of st.split(',')) u.st[k] = 1; u.mining = mine >= 0 ? 1 : 0; u.mine = mine; u.stack = stack ? { it: stack[0], n: stack[1] } : null;
    u.building = bld ? { x: bld[0], y: bld[1], B: { s: bld[2] }, brk: !!bld[3], done: 0 } : null; u.beam = beam ? { x: beam[0], y: beam[1] } : null;
    if (Math.hypot(u.x - x, u.y - y) > 64) { u.x = x; u.y = y; u.rot = rot; }
    out.push(u);
  }
  for (const id of [...UMAP.keys()]) if (!seen.has(id)) UMAP.delete(id);
  W.units = out; MP.myUnit = m.me; const me = UMAP.get(m.me) || null; W.player = me; if (me) me.ctl = 1;
  W.bullets = m.b.map(([x, y, vx, vy, k, c, c2, sz, tr, art]) => ({ x, y, vx, vy, k: k || undefined, c: c || '#ffd37f', c2: c2 || undefined, sz: sz || undefined, tr: tr || undefined, ...(art ? { sx: art[0], sy: art[1], tx: art[2], ty: art[3], life: art[4] } : {}) }));
  W.fx = m.fx.concat(W.fx.filter(f => f.k === 'rubble'));
  [W.wave, W.wtimer, W.nEn] = m.w;
}
function guestState(W, m) {
  if (m.log) for (const e of m.log) {
    if (e[0] === 'add') { const [, t, x, y, rot, team, cfg, hp] = e; if (!BLOCKS[t]) continue; const o = W.tb(x, y); if (o && o.x === x && o.y === y && o.t === t) continue; if (o) W.remB(o); try { const b = W.addB(t, x, y, rot, cfg, team); b.hp = hp; } catch (_) {} }
    else if (e[0] === 'rem') { const o = W.tb(e[1], e[2]); if (o && o.x === e[1] && o.y === e[2]) { if (o === W.core) continue; W.remB(o); if (e[3]) { const c = W.center(o); W.boom(c.x, c.y, o.B.s * 7, '#ffb347'); } } }
    else if (e[0] === 'core') { const o = W.tb(e[2], e[3]); if (o && o.t === e[1]) W.core = o; }
  }
  if (m.blk) for (const [x, y, st] of m.blk) { const b = W.tb(x, y); if (!b || b.x !== x || b.y !== y) continue; applyState(W, b, st); }
  if (m.plans) setPlans(W, m.plans);
  if (m.items) W.core.items = m.items;
  if (m.sn) for (const i of m.sn) if (!W.seen[i]) { W.seen[i] = 1; W.seenNew.push(i); }
  if (m.msg) for (const [t, c] of m.msg) W.msgs.push({ t, c: c || '', life: 240 });
}
function applyState(W, b, st) {
  for (const k of BK) { if (k in st) b[k] = st[k]; else if (k !== 'hp' && k !== 'rot' && typeof b[k] === 'number') b[k] = 0; else if (k === 'open' || k === 'off') b[k] = false; }
  if (st.cv) b.cv = st.cv.map(([it, p]) => ({ it, p })); else if (b.cv) b.cv = [];
  b.st = st.st ? { it: st.st[0], n: st.st[1], age: 0 } : (b.B.type === 'sconv' ? null : b.st);
  if (st.ln) { const L = st.ln.map(i => W.bt[i]).filter(Boolean); b.links = L; }
  if (st.it) b.items = st.it; if (st.am && b.ammo) b.ammo = [{ it: st.am, n: 1 }]; else if (b.ammo) b.ammo = [];
  b.tgt = st.tg ? { x: st.tg[0], y: st.tg[1], U: {}, dead: 0 } : null;
}
// vendég képkockánként: simítás + a bemenet küldése (20/mp)
export function guestFrame(W, ctl, view) {
  for (const u of W.units) { if (u.tx == null) continue; u.x += (u.tx - u.x) * .35; u.y += (u.ty - u.y) * .35; const d = ((u.trot - u.rot + Math.PI * 3) % (Math.PI * 2)) - Math.PI; u.rot += d * .35; }
  for (const m of W.msgs) m.life--; W.msgs = W.msgs.filter(m => m.life > 0);
  const now = performance.now(); if (now - gIn.t < 50 || !net) return; gIn.t = now;
  net.send(JSON.stringify({ e: 'in', ax: ctl.ax, ay: ctl.ay, sh: ctl.shoot ? 1 : 0, mx: r1(ctl.mx), my: r1(ctl.my), nb: ctl.noBuild ? 1 : 0, v: view.map(Math.round) }), false);
}
