// HGWS – közös többjátékos hálózati réteg (WebRTC, csillag topológia).
// A szoba gazdája (host) a hiteles fél: minden vendég vele áll közvetlen kapcsolatban, két adatcsatornán:
//   'u' – megbízhatatlan, rendezetlen (bemenetek, pillanatképek)      'r' – megbízható, rendezett (események, váróterem)
// A bemutatkozás (signaling) cserélhető: fireSignal() Firestore-on megy (rooms/{id} + rooms/{id}/sig),
// a localSignal() ugyanazt BroadcastChannel + localStorage fölött adja (tesztekhez, egy gépen több ablak).
// A kapcsolat felépülése után a Firestore-t nem használjuk: kapcsolatonként 2 írás (offer + answer, az ICE-jelöltek az SDP-ben mennek).
// TURN (nem kötelező):  localStorage.hgws_turn = '{"urls":"turn:...","username":"...","credential":"..."}'  vagy  window.HGWS_TURN = {...}

export function iceServers() {
  const l = [{ urls: 'stun:stun.cloudflare.com:3478' }];
  try { const t = (typeof window !== 'undefined' && window.HGWS_TURN) || JSON.parse(localStorage.getItem('hgws_turn') || 'null'); if (t && t.urls) l.push(t); } catch (_) {}
  return l;
}
export const hasTurn = () => iceServers().length > 1;

/* ---------- bemutatkozás Firestore-on ---------- */
export function fireSignal(FB, db) {
  const R = id => FB.doc(db, 'rooms', id), S = id => FB.collection(db, 'rooms', id, 'sig'), now = () => FB.serverTimestamp();
  return {
    kind: 'fire',
    async create(data) { const ref = FB.doc(FB.collection(db, 'rooms')); await FB.setDoc(ref, { ...data, createdAt: now(), updatedAt: now() }); return ref.id; },
    watch(id, cb) { return FB.onSnapshot(R(id), s => cb(s.exists() ? { id: s.id, ...s.data() } : null), () => cb(null)); },
    update(id, p) { return FB.updateDoc(R(id), { ...p, updatedAt: now() }); },
    join(id, uid) { return FB.updateDoc(R(id), { members: FB.arrayUnion(uid), updatedAt: now() }); },
    leave(id, uid) { return FB.updateDoc(R(id), { members: FB.arrayRemove(uid), updatedAt: now() }); },
    claim(id, uid, name) { return FB.updateDoc(R(id), { host: uid, hostName: name, updatedAt: now() }); },
    async remove(id, me) { try { const s = await FB.getDocs(FB.query(S(id), FB.where('from', '==', me))); await Promise.all(s.docs.map(d => FB.deleteDoc(d.ref))); } catch (_) {} return FB.deleteDoc(R(id)); },
    send(id, m) { return FB.addDoc(S(id), { ...m, at: now() }); },
    listen(id, me, cb) { return FB.onSnapshot(FB.query(S(id), FB.where('to', '==', me)), s => s.docChanges().forEach(c => { if (c.type === 'added') { cb(c.doc.data()); FB.deleteDoc(c.doc.ref).catch(() => {}); } }), () => {}); },
    // azok a szobák, amelyeket láthatok (a gazda a `vis` listába írja a barátait / meghívottjait)
    list(me, cb) { return FB.onSnapshot(FB.query(FB.collection(db, 'rooms'), FB.where('vis', 'array-contains', me)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => cb([])); }
  };
}

/* ---------- bemutatkozás helyben (egy böngésző több ablaka) ---------- */
export function localSignal(ns = 'hgws_net') {
  // a lapok közti localStorage-szinkron késhet, ezért az üzenet viszi a teljes szobaállapotot, és mindig a legfrissebb verzió (v) nyer
  const bc = new BroadcastChannel(ns), KEY = ns + '_rooms', subs = new Set(), cur = {};
  const stored = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const get = id => { const s = stored()[id]; if (s && (!cur[id] || s.v > cur[id].v)) cur[id] = s; return cur[id] && !cur[id].gone ? cur[id] : null; };
  const take = (id, d) => { if (cur[id] && cur[id].v >= d.v) return false; cur[id] = d; return true; };
  const put = (id, d) => { d = d ? { ...d } : { gone: 1 }; d.v = Date.now() + Math.random(); cur[id] = d; const a = stored(); if (d.gone) delete a[id]; else a[id] = d; try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (_) {} bc.postMessage({ t: 'room', id, d }); subs.forEach(f => f({ t: 'room', id })); };
  bc.onmessage = e => { const m = e.data; if (m.t === 'room' && m.d && !take(m.id, m.d)) return; subs.forEach(f => f(m)); };
  const on = f => { subs.add(f); return () => subs.delete(f); };
  const rooms = () => { const a = stored(); for (const id in a) get(id); return Object.entries(cur).filter(([, d]) => !d.gone); };
  return {
    kind: 'local',
    async create(data) { const id = 'L' + Math.random().toString(36).slice(2, 9); put(id, { ...data, createdAt: Date.now(), updatedAt: Date.now() }); return id; },
    watch(id, cb) { const f = m => { if (m.t === 'room' && m.id === id) { const d = get(id); cb(d ? { id, ...d } : null); } }; setTimeout(() => f({ t: 'room', id }), 0); return on(f); },
    async update(id, p) { const d = get(id); if (d) put(id, { ...d, ...p, updatedAt: Date.now() }); },
    async join(id, uid) { const d = get(id); if (!d) throw new Error('nincs ilyen szoba'); if (!d.members.includes(uid)) put(id, { ...d, members: [...d.members, uid] }); },
    async leave(id, uid) { const d = get(id); if (d) put(id, { ...d, members: d.members.filter(u => u !== uid) }); },
    async claim(id, uid, name) { const d = get(id); if (d) put(id, { ...d, host: uid, hostName: name }); },
    async remove(id) { put(id, null); },
    async send(id, m) { bc.postMessage({ t: 'sig', id, m }); },
    listen(id, me, cb) { return on(d => { if (d.t === 'sig' && d.id === id && d.m.to === me) cb(d.m); }); },
    list(me, cb) { const f = () => cb(rooms().filter(([, d]) => (d.vis || []).includes(me) || d.open).map(([id, d]) => ({ id, ...d }))); setTimeout(f, 0); return on(m => { if (m.t === 'room') f(); }); }
  };
}

/* ---------- kapcsolat ---------- */
const CTL = '\u0001';   // ezzel kezdődő szöveges üzenet a hálózati réteg belső ügye (névsor, ping)
function waitIce(pc, ms = 2500) { return new Promise(res => { if (pc.iceGatheringState === 'complete') return res(); const t = setTimeout(res, ms); pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } }); }); }

/* joinRoom({ sig, id, me, name, on, lag, loss })
   on.room(room)         – a szoba dokumentuma változott (null = törölték)
   on.role(isHost, why)  – gazda lettem / vendég lettem ('start' | 'migrate' | 'demote')
   on.peer(uid, up)      – gazdaként: vendég csatlakozott / lekapcsolódott;  vendégként: a gazdával él-e a kapcsolat
   on.msg(from, data, reliable) – adat (ArrayBuffer vagy szöveg)
   on.status(text, kind) – ember által olvasható állapot ('info' | 'warn' | 'err')
   vissza: { isHost(), host(), send(d, rel), sendTo(uid, d, rel), broadcast(d, rel), peers(), ping(), room(), close(leave) } */
export function joinRoom({ sig, id, me, name = '', on = {}, lag = 0, loss = 0 }) {
  let room = null, host = false, closed = false, hostConn = null, tries = 0, pingMs = 0, roster = [], migT = 0, connecting = false, seq = 0;
  const peers = new Map(), ice = iceServers(), ev = (k, ...a) => { try { on[k] && on[k](...a); } catch (e) { console.error(e); } };
  const raw = (ch, d) => { try { if (ch && ch.readyState === 'open') ch.send(d); } catch (_) {} };
  const tx = (c, d, rel) => { if (!c) return; if (!rel && loss && Math.random() * 100 < loss) return; const ch = rel ? c.r : c.u && c.u.readyState === 'open' ? c.u : c.r; if (lag) setTimeout(() => raw(ch, d), lag * (rel ? 1 : .6 + Math.random() * .8)); else raw(ch, d); };
  const rosterOut = () => { roster = [me, ...[...peers.keys()].filter(u => peers.get(u).up)]; for (const c of peers.values()) tx(c, CTL + 'R' + JSON.stringify(roster), true); };
  function wire(c, uid) {
    const got = (e, rel) => { const d = e.data; c.rx = performance.now();
      if (typeof d === 'string' && d[0] === CTL) { const k = d[1], b = d.slice(2);
        if (k === 'P') tx(c, CTL + 'Q' + b, false); else if (k === 'Q') pingMs = Math.round(pingMs ? pingMs * .7 + (performance.now() - +b) * .3 : performance.now() - +b); else if (k === 'R') { try { roster = JSON.parse(b); } catch (_) {} }
        return; }
      const go = () => ev('msg', uid, d, rel); if (lag) setTimeout(go, lag * (rel ? 1 : .6 + Math.random() * .8)); else go(); };
    const up = () => { if (c.up || !c.r || c.r.readyState !== 'open') return; c.up = true; c.rx = performance.now(); tries = 0; if (host) { rosterOut(); ev('peer', uid, true); } else { ev('status', '', 'info'); ev('peer', uid, true); } };
    const down = () => { if (c.dead) return; c.dead = true; const was = c.up; c.up = false; try { c.pc.close(); } catch (_) {}
      if (host) { if (peers.get(uid) === c) { peers.delete(uid); rosterOut(); if (was) ev('peer', uid, false); } }
      else if (hostConn === c) { hostConn = null; if (was) ev('peer', uid, false); if (!closed) lost(); } };
    c.bind = ch => { ch.binaryType = 'arraybuffer'; if (ch.label === 'u') { c.u = ch; ch.onmessage = e => got(e, false); } else { c.r = ch; ch.onmessage = e => got(e, true); ch.onopen = up; ch.onclose = down; if (ch.readyState === 'open') up(); } };
    c.pc.onconnectionstatechange = () => { const s = c.pc.connectionState; if (s === 'failed' || s === 'closed') down(); else if (s === 'disconnected') setTimeout(() => { if (c.pc.connectionState === 'disconnected') down(); }, 3500); };
    c.kill = down;
  }
  /* vendég → gazda */
  async function connect() {
    if (closed || host || connecting || !room || room.host === me) return; if (hostConn && !hostConn.dead && (hostConn.up || performance.now() - hostConn.t0 < 4400)) return; connecting = true; const to = room.host, n = ++seq;
    ev('status', tries ? 'Újracsatlakozás… (' + tries + ')' : 'Csatlakozás a gazdához…', 'info');
    try {
      const pc = new RTCPeerConnection({ iceServers: ice }), c = { pc, uid: to, n, t0: performance.now() }; wire(c, to);
      c.bind(pc.createDataChannel('u', { ordered: false, maxRetransmits: 0 })); c.bind(pc.createDataChannel('r', { ordered: true }));
      await pc.setLocalDescription(await pc.createOffer()); await waitIce(pc);
      if (closed || n !== seq) { pc.close(); connecting = false; return; }
      { const old = hostConn; hostConn = c; if (old && old !== c) { old.dead = true; try { old.pc.close(); } catch (_) {} } }
      await sig.send(id, { from: me, to, k: 'offer', n, d: pc.localDescription.sdp, name });
      setTimeout(() => { if (hostConn === c && !c.up && !closed) { c.kill(); } }, 4500);
    } catch (e) { console.warn('net', e); setTimeout(lost, 800); }
    connecting = false;
  }
  function lost() {
    if (closed || host) return; tries++;
    if (room && room.host !== me && tries <= 1) return void setTimeout(connect, 500);
    // a gazda nem érhető el: gazdaváltás – a legkorábban belépett, még bent lévő játékos veszi át
    const order = (room ? room.members : []).filter(u => u !== (room && room.host) && (roster.includes(u) || u === me)), rank = Math.max(0, order.indexOf(me));
    if (!order.includes(me)) { ev('status', hasTurn() ? 'Nem sikerült csatlakozni a gazdához.' : 'Nem sikerült csatlakozni – a két hálózat között közvetlen kapcsolat nem épült fel (TURN-kiszolgáló nincs beállítva).', 'err'); if (tries < 8) setTimeout(connect, 3000); return; }
    ev('status', 'A gazda kiesett – gazdaváltás…', 'warn'); clearTimeout(migT); const old = room.host;
    migT = setTimeout(() => { if (closed || host || !room || room.host !== old || (hostConn && hostConn.up)) return; sig.claim(id, me, name).catch(() => setTimeout(lost, 1500)); }, 300 + rank * 2500);
    setTimeout(() => { if (!closed && !host && !(hostConn && hostConn.up) && room && room.host === old) lost(); }, 400 + order.length * 2500 + 3000);
  }
  /* gazda: bejövő ajánlat */
  async function offer(m) {
    if (closed) return; if (!host || !room || !room.members.includes(m.from)) { m.t0 = m.t0 || performance.now(); wait.push(m); return; }   // a szoba frissítése még nem ért ide: megvárjuk
    try { const old = peers.get(m.from); if (old) { peers.delete(m.from); old.kill(); }
      const pc = new RTCPeerConnection({ iceServers: ice }), c = { pc, uid: m.from, name: m.name || '' }; wire(c, m.from); peers.set(m.from, c); pc.ondatachannel = e => c.bind(e.channel);
      await pc.setRemoteDescription({ type: 'offer', sdp: m.d }); await pc.setLocalDescription(await pc.createAnswer()); await waitIce(pc);
      await sig.send(id, { from: me, to: m.from, k: 'answer', n: m.n, d: pc.localDescription.sdp });
      setTimeout(() => { if (peers.get(m.from) === c && !c.up) c.kill(); }, 15000);
    } catch (e) { console.warn('net', e); }
  }
  const unSig = sig.listen(id, me, m => { if (m.k === 'offer') offer(m); else if (m.k === 'answer' && hostConn && hostConn.n === m.n && !hostConn.up) hostConn.pc.setRemoteDescription({ type: 'answer', sdp: m.d }).catch(() => {}); });
  const wait = [];
  const unRoom = sig.watch(id, r => { if (closed) return; const prev = room; room = r; ev('room', r); if (!r) return; setTimeout(() => { for (const m of wait.splice(0)) if (performance.now() - m.t0 < 8000) offer(m); }, 0);
    const mine = r.host === me;
    if (mine && !host) { host = true; clearTimeout(migT); if (hostConn) { const c = hostConn; hostConn = null; c.dead = true; try { c.pc.close(); } catch (_) {} } roster = [me]; ev('role', true, prev ? 'migrate' : 'start'); ev('status', '', 'info'); }
    else if (!mine && host) { host = false; for (const c of [...peers.values()]) c.kill(); peers.clear(); ev('role', false, 'demote'); tries = 0; connect(); }
    else if (!mine && (!prev || prev.host !== r.host)) { if (!prev) ev('role', false, 'start'); clearTimeout(migT); tries = 0; if (hostConn) { const c = hostConn; hostConn = null; c.dead = true; try { c.pc.close(); } catch (_) {} } connect(); } });
  // életjel: ha a túloldal hirtelen eltűnik (bezárt lap, megszakadt hálózat), a csatorna nem mindig zár le magától
  const pingT = setInterval(() => { const now = performance.now();
    if (!host && hostConn && hostConn.up) { if (now - hostConn.rx > 4000) return hostConn.kill(); tx(hostConn, CTL + 'P' + now, false); }
    if (host) for (const c of [...peers.values()]) if (c.up && now - c.rx > 7000) c.kill(); }, 1000);
  return {
    isHost: () => host, host: () => room && room.host, room: () => room, ping: () => host ? 0 : pingMs, peers: () => [...peers.keys()].filter(u => peers.get(u).up), connected: () => host || !!(hostConn && hostConn.up),
    send(d, rel) { tx(hostConn, d, rel); },
    sendTo(uid, d, rel) { tx(peers.get(uid), d, rel); },
    broadcast(d, rel, except) { for (const [u, c] of peers) if (c.up && u !== except) tx(c, d, rel); },
    kick(uid) { const c = peers.get(uid); if (c) c.kill(); },
    drop() { if (hostConn) hostConn.kill(); },   // tesztekhez: a kapcsolat megszakítása
    async close(leave = true) { if (closed) return; closed = true; clearInterval(pingT); clearTimeout(migT); try { unSig(); unRoom(); } catch (_) {}
      for (const c of peers.values()) { c.dead = true; try { c.pc.close(); } catch (_) {} } if (hostConn) { hostConn.dead = true; try { hostConn.pc.close(); } catch (_) {} }
      if (leave && room) { try { if (host && room.members.filter(u => u !== me).length === 0) await sig.remove(id, me); else await sig.leave(id, me); } catch (_) {} } }
  };
}
