// HGWS Közösség – csatornák, privát üzenetek, csoportok, filmtár
import { FB, auth, db, notConfigured, $, $$, esc, ROLES, COLORS, avatar, toDate, timeLabel, shortTime, huDate, isOnline,
  ytId, toast, errText, ensureProfile, blip, reservedName, RESERVED_MSG } from './core.js?v=202611161159';
import { modal, confirmBox, popover, closePop, emojiPicker, QUICK, stageHtml } from './ui.js?v=202611161159';
import * as Admin from './admin.js?v=202611161159';
import * as Browse from './browse.js?v=202611161159';
import * as Player from './player.js?v=202611161159';

const S = {
  user: null, me: null, users: new Map(), channels: [], convs: [], convsLoaded: false, videos: [], reads: { ch: {} },
  owner: undefined, route: { sec: 'srv' }, chat: null, memOpen: innerWidth > 1100, myList: [], mode: '', music: [], progress: {}
};
const uid = () => S.user.uid;
const isAdmin = () => S.me?.role === 'admin';
const isMod = () => ['admin', 'moderator'].includes(S.me?.role);
const mutedUntil = () => { const d = toDate(S.me?.mutedUntil); return d && d > new Date() ? d : null; };
const U = id => S.users.get(id) || { id, name: 'Ismeretlen', color: '#55606f' };
const ms = t => toDate(t)?.getTime() || 0;
const nameHtml = u => `<span class="nm" data-u="${esc(u.id)}" style="color:${u.role && u.role !== 'user' ? ROLES[u.role].color : (u.color || '#ebe6da')}">${esc(u.name)}</span>`;
const roleBadge = u => u.role === 'admin' || u.role === 'moderator' ? `<span class="rb ${u.role}">${ROLES[u.role].label}</span>` : '';

/* ===================== INDÍTÁS ===================== */
if (notConfigured) {
  $('#boot').innerHTML = '<div class="full"><div><div class="big">🛠️</div><h2 class="gold">Hamarosan nyitunk</h2><p>A közösségi rész még beállítás alatt van.</p><a class="btn ghost" href="./">Vissza a főoldalra</a></div></div>';
} else {
  FB.onAuthStateChanged(auth, async user => {
    if (!user) { location.replace('belepes.html?next=' + encodeURIComponent('app.html' + location.hash)); return; }
    if (!user.emailVerified) { location.replace('belepes.html'); return; }
    if (S.user) return;
    S.user = user;
    try { S.me = await ensureProfile(user); } catch (e) { $('#boot').innerHTML = `<div class="full"><div><h2>Hiba</h2><p>${esc(errText(e))}</p></div></div>`; return; }
    start();
  });
}

function start() {
  const me = FB.doc(db, 'users', uid());
  FB.onSnapshot(me, s => {
    const was = S.me; S.me = { id: uid(), ...s.data() };
    renderMe();
    if (S.me.banned) return banned();
    if (was?.role !== S.me.role || ms(was?.mutedUntil) !== ms(S.me.mutedUntil)) { renderSide(); S.chat?.renderComposer(); }
  });
  FB.onSnapshot(FB.collection(db, 'users'), s => {
    s.docs.forEach(d => S.users.set(d.id, { id: d.id, ...d.data() }));
    s.docChanges().forEach(c => c.type === 'removed' && S.users.delete(c.doc.id));
    soon('users', () => { renderMembers(); renderOnline(); if (S.route.sec === 'dm') renderSide(); S.chat?.rerender(); if (S.route.view === 'dmhome') renderDmHome(); Admin.refresh(); Browse.updateComm(); });
  }, e => console.warn(e));
  FB.onSnapshot(FB.query(FB.collection(db, 'channels'), FB.orderBy('order')), s => {
    S.channels = s.docs.map(d => ({ id: d.id, ...d.data() }));
    soon('chan', () => { if (S.route.sec === 'srv') renderSide(); if (S.route.view === 'chathome') route(true); Admin.refresh(); });
  }, e => console.warn(e));
  FB.onSnapshot(FB.query(FB.collection(db, 'conversations'), FB.where('members', 'array-contains', uid())), s => {
    const first = !S.convsLoaded; S.convsLoaded = true;
    S.convs = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => ms(b.updatedAt) - ms(a.updatedAt));
    if (!first) s.docChanges().forEach(c => { if (c.type !== 'removed') notifyConv({ id: c.doc.id, ...c.doc.data() }); });
    soon('conv', () => { if (S.route.sec === 'dm') renderSide(); badges(); if (S.chat?.conv) S.chat.updateConv(); Browse.updateComm(); });
  }, e => console.warn(e));
  FB.onSnapshot(FB.collection(db, 'videos'), s => {
    S.videos = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    soon('vid', () => { if (S.mode === 'browse' && S.route.view !== 'admin' && S.route.view !== 'nez') route(true); S.chat?.rerender(); Admin.refresh(); });
  });
  FB.onSnapshot(FB.collection(db, 'music'), s => {
    S.music = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    soon('mus', () => { if (S.mode === 'browse' && ['home', 'zene'].includes(S.route.view)) route(true); S.chat?.rerender(); Admin.refresh(); });
  }, e => console.warn(e));
  FB.onSnapshot(FB.doc(db, 'users', uid(), 'private', 'progress'), s => { S.progress = s.data() || {}; });
  FB.onSnapshot(FB.doc(db, 'users', uid(), 'private', 'list'), s => { S.myList = s.data()?.ids || []; Browse.listChanged(); });
  FB.onSnapshot(FB.doc(db, 'users', uid(), 'private', 'reads'), s => { S.reads = { ch: {}, ...(s.data() || {}) }; soon('reads', () => { if (S.route.sec === 'srv') renderSide(); }); });
  FB.getDoc(FB.doc(db, 'meta', 'owner')).then(s => { S.owner = s.exists() ? s.data() : null; renderOwnerBar(); }).catch(() => {});

  // jelenlét
  const ping = () => { if (!document.hidden && !S.me?.banned) FB.updateDoc(me, { lastSeen: FB.serverTimestamp() }).catch(() => {}); };
  ping(); setInterval(ping, 60e3); document.addEventListener('visibilitychange', () => { if (!document.hidden) { ping(); S.chat?.markRead(); } });

  // UI
  $('#boot').remove(); $('#shell').hidden = false;
  $('#menuBtn').onclick = () => document.body.classList.toggle('nav');
  $('#scrim').onclick = () => document.body.classList.remove('nav', 'mem');
  $('#meBtn').onclick = $('#setBtn').onclick = settings;
  $('#meMenu').onclick = e => userMenu(e.currentTarget);
  addEventListener('scroll', () => $('#topnav').classList.toggle('solid', scrollY > 30), { passive: true });
  const si = $('#sInp');
  $('#sBtn').onclick = () => si.focus();
  addEventListener('keydown', e => { if (e.key === '/' && !e.target.closest('input,textarea')) { e.preventDefault(); si.focus(); } });
  $('#hamBtn').onclick = () => document.body.classList.toggle('anavopen');
  $('#ascrim').onclick = () => document.body.classList.remove('anavopen');
  $('#navSet').onclick = () => { document.body.classList.remove('anavopen'); settings(); };
  $('#outBtn').onclick = async () => { if (await confirmBox('Kijelentkezel?', 'Kijelentkezés', false)) FB.signOut(auth); };
  si.oninput = () => { const q = si.value; if (location.hash.startsWith('#/kereses')) history.replaceState(null, '', '#/kereses/' + encodeURIComponent(q)); else location.hash = '#/kereses/' + encodeURIComponent(q); if (location.hash.startsWith('#/kereses')) Browse.search(encodeURIComponent(q)); };
  zeroEgg();
  let taps = 0, tapT; $('.tlogo').addEventListener('click', e => { taps++; clearTimeout(tapT); tapT = setTimeout(() => taps = 0, 1200); if (taps >= 5) { taps = 0; e.preventDefault(); showZero(); } });
  Player.init(() => S.music.filter(t => t.visible !== false));
  addEventListener('hashchange', route);
  document.addEventListener('click', globalClick);
  route();
}
const timers = {};
function soon(k, f) { clearTimeout(timers[k]); timers[k] = setTimeout(f, 30); }

function banned() {
  S.chat?.destroy(); S.chat = null;
  document.body.classList.add('chatmode'); $('#shell').innerHTML = `<div class="full" style="height:100vh"><div><div class="big">⛔</div><h2 class="gold">Ki vagy tiltva</h2><p>Egy moderátor vagy admin letiltotta a fiókodat a közösségből.</p><button class="btn plain" id="lo">Kijelentkezés</button></div></div>`;
  $('#lo').onclick = () => FB.signOut(auth);
}

/* ===================== ÚTVONALAK ===================== */
function setMode(m) {
  if (S.mode === m) return;
  S.mode = m;
  document.body.classList.toggle('chatmode', m === 'chat');
  $('#page').hidden = m !== 'browse'; $('#chat').hidden = m !== 'chat';
  if (m === 'browse') { S.chat?.destroy(); S.chat = null; } else Browse.cleanup();
}
function route(force) {
  const h = location.hash.replace(/^#\/?/, '').split('/');
  document.body.classList.remove('nav', 'mem', 'anavopen');
  closePop();
  $$('.modal').forEach(m => m.close ? m.close() : m.remove());
  const [a, b] = h;
  if (a === 'filmek') { location.replace(b ? '#/film/' + b : '#/tar'); return; }
  if (a === 'u' && b) return openDm(b);
  let r;
  if (a === 'dm') r = b ? { sec: 'dm', view: 'conv', id: b } : { sec: 'dm', view: 'dmhome' };
  else if (a === 'c' && b) r = { sec: 'srv', view: 'chan', id: b };
  else if (a === 'chat') {
    const c = S.channels.find(c => c.type !== 'announce') || S.channels[0];
    if (c) { location.replace('#/c/' + c.id); return; }
    r = { sec: 'srv', view: 'chathome' };
  }
  else if (a === 'admin') r = { mode: 'browse', view: 'admin', id: b || 'tagok' };
  else if (a === 'tar') r = { mode: 'browse', view: 'tar', id: b || '' };
  else if (a === 'lista') r = { mode: 'browse', view: 'lista' };
  else if (a === 'zene') r = { mode: 'browse', view: 'zene' };
  else if (a === 'kereses') r = { mode: 'browse', view: 'kereses', id: b || '' };
  else if (a === 'nez' && b) r = { mode: 'browse', view: 'nez', id: b };
  else if (a === 'film' && b) r = { mode: 'browse', view: S.route.mode === 'browse' && S.route.view !== 'nez' ? S.route.view : 'home', id: S.route.mode === 'browse' ? S.route.id : '', film: b };
  else r = { mode: 'browse', view: 'home' };
  r.mode ||= 'chat';
  // navigáció kiemelése
  const nav = r.mode === 'chat' ? (r.sec === 'dm' ? 'dm' : 'chat') : r.view === 'admin' ? 'admin' : r.view === 'kereses' ? 'kereses' : r.view === 'tar' ? 'tar' : r.view === 'lista' ? 'lista' : r.view === 'zene' ? 'zene' : r.view === 'home' ? 'home' : '';
  $$('[data-nav]').forEach(x => x.classList.toggle('on', x.dataset.nav === nav));
  $$('#seg [data-seg]').forEach(x => x.classList.toggle('on', x.dataset.seg === r.sec));
  const same = !force && S.route.mode === r.mode && S.route.view === r.view && S.route.id === r.id;
  const filmBefore = S.route.film;
  S.route = r;
  if (!r.film && Browse.detailOpen()) Browse.closeDetail(true);
  if (r.mode === 'browse') {
    setMode('browse');
    if (!same) {
      if (r.view !== 'kereses') $('#sInp').value = '';
      if (r.view === 'home') Browse.home();
      else if (r.view === 'tar') Browse.tar(r.id);
      else if (r.view === 'lista') Browse.myList();
      else if (r.view === 'zene') Browse.music();
      else if (r.view === 'kereses') Browse.search(r.id);
      else if (r.view === 'nez') Browse.watch(r.id);
      else if (r.view === 'admin') { Browse.cleanup(); Admin.render(r.id); }
      if (!r.film) scrollTo(0, 0);
    }
    if (r.film && (!Browse.detailOpen() || filmBefore !== r.film)) Browse.detail(r.film);
    return;
  }
  setMode('chat');
  renderSide();
  if (same && S.chat) return;
  S.chat?.destroy(); S.chat = null;
  $('#mActs').innerHTML = ''; $('#mTopic').textContent = '';
  showMembers(r.view === 'chan');
  if (r.view === 'chan') {
    const c = S.channels.find(x => x.id === r.id);
    if (!c) { setTitle('#', 'Nincs ilyen csatorna'); $('#view').innerHTML = '<div class="full"><div><div class="big">🤷</div><h2>Ez a csatorna nem létezik</h2></div></div>'; return; }
    S.chat = new Chat({ kind: 'chan', id: c.id, chan: c });
  } else if (r.view === 'conv') {
    const c = S.convs.find(x => x.id === r.id);
    if (!c && !S.convsLoaded) { setTimeout(() => route(true), 200); return; }
    S.chat = new Chat({ kind: 'conv', id: r.id, conv: c });
  } else if (r.view === 'dmhome') renderDmHome();
  else renderHome();
}
function setTitle(icon, text, topic = '') {
  $('#mTitle').innerHTML = `${icon ? `<span class="hash">${icon}</span>` : ''}<b>${esc(text)}</b>`;
  $('#mTopic').textContent = topic; $('#mTopic').hidden = !topic;
  document.title = text + ' · HGWS';
  badges();
}
function showMembers(on) {
  $('#members').style.display = on && (S.memOpen || innerWidth <= 1100) ? '' : 'none';
  if (!on) document.body.classList.remove('mem');
  if (on) {
    $('#mActs').insertAdjacentHTML('beforeend', `<button class="ibtn${S.memOpen ? ' on' : ''}" id="memBtn" title="Tagok">👥</button>`);
    $('#memBtn').onclick = () => {
      if (innerWidth <= 1100) { document.body.classList.toggle('mem'); return; }
      S.memOpen = !S.memOpen; showMembers(true); $('#memBtn').classList.toggle('on', S.memOpen);
      $$('#mActs #memBtn').slice(1).forEach(b => b.remove());
    };
    renderMembers();
  }
}

function renderHome() {
  setTitle('🏠', 'HGWS Studios');
  $('#view').innerHTML = `<div class="full"><div><div class="big">🌊</div><h2 class="gold">Üdv a HGWS közösségben!</h2>
    <p>${isAdmin() ? 'Még nincs egy csatorna sem. Hozd létre az elsőket!' : 'Az admin hamarosan megnyitja a csatornákat. Addig nézz körül a filmtárban, vagy írj valakinek privátban.'}</p>
    ${isAdmin() ? '<button class="btn goldb" id="mkDef">ALAP CSATORNÁK LÉTREHOZÁSA</button>' : '<a class="btn ghost" href="#/filmek">🎬 FILMTÁR</a>'}</div></div>`;
  const b = $('#mkDef'); if (b) b.onclick = () => Admin.defaultChannels().then(() => toast('Csatornák létrehozva ✓')).catch(e => toast(errText(e), true));
}

/* ===================== OLDALSÁV ===================== */
function renderMe() {
  const m = S.me; if (!m) return;
  const st = mutedUntil() ? `🔇 némítva` : ROLES[m.role]?.label || '';
  $('#meMenu').innerHTML = `<span class="avw">${avatar(m, 40)}<i class="on y"></i></span><div><b>${esc(m.name)}</b><small>${esc(ROLES[m.role]?.label || '')} · Profil</small></div>`;
  $('#navAdmin').hidden = !isMod();
  $('#meBtn').innerHTML = `<span class="avw">${avatar(m, 34)}<i class="on y"></i></span><div><b>${esc(m.name)}</b><small>${esc(st)}</small></div>`;
}

function chanUnread(c) { return c.lastMessageAt && ms(c.lastMessageAt) > ms(S.reads.ch?.[c.id]) && !(S.route.view === 'chan' && S.route.id === c.id && !document.hidden); }
function convUnread(c) {
  return !!c.lastMessage && c.lastMessage.uid !== uid() && ms(c.updatedAt) > ms(c.reads?.[uid()]) && !(S.route.view === 'conv' && S.route.id === c.id && !document.hidden);
}
function convName(c) {
  if (c.type === 'group') return c.name || c.members.filter(m => m !== uid()).map(m => U(m).name).join(', ') || 'Csoport';
  return U(c.members.find(m => m !== uid()) || uid()).name;
}
function convAv(c, size = 40) {
  if (c.type === 'group') { const o = c.members.filter(m => m !== uid()); return `<span class="grpav">${avatar(U(o[0]), 28)}${avatar(U(o[1] || uid()), 28)}</span>`; }
  const o = U(c.members.find(m => m !== uid()));
  return `<span class="avw">${avatar(o, size)}<i class="on${isOnline(o) ? ' y' : ''}"></i></span>`;
}

function renderSide() {
  if (!S.me) return;
  const r = S.route;
  if (r.sec === 'dm') {
    $('#sHead').innerHTML = `<h2 class="gold">ÜZENETEK</h2><button class="ibtn" id="newGrp" title="Új csoport">➕</button>`;
    $('#newGrp').onclick = newGroup;
    const q = (S.dmq || '').toLowerCase();
    const list = S.convs.filter(c => c.type === 'group' || c.lastMessage || c.id === r.id).filter(c => !q || convName(c).toLowerCase().includes(q));
    $('#sBody').innerHTML = `<div class="search"><input type="search" id="dmq" placeholder="Keresés…" value="${esc(S.dmq || '')}"></div>
      <a class="si${r.view === 'dmhome' ? ' on' : ''}" href="#/dm"><span class="hash">👥</span><span class="nm">Tagok · új beszélgetés</span></a>
      <div class="cat">Beszélgetések</div>
      ${list.map(c => {
        const lm = c.lastMessage, un = convUnread(c);
        const pre = lm ? (lm.uid === uid() ? 'Te: ' : c.type === 'group' ? U(lm.uid).name.split(' ')[0] + ': ' : '') : '';
        return `<a class="ci${r.id === c.id ? ' on' : ''}${un ? ' unread' : ''}" href="#/dm/${esc(c.id)}">${convAv(c)}
          <div class="tx"><b><span>${esc(convName(c))}</span><time>${lm ? shortTime(c.updatedAt) : ''}</time></b>
          <small>${lm ? esc(pre + lm.text) : c.type === 'group' ? c.members.length + ' tag' : 'Új beszélgetés'}</small></div>${un ? '<span class="pill">•</span>' : ''}</a>`;
      }).join('') || '<p class="hint" style="padding:.5rem .6rem">Még nincs beszélgetésed. Válassz valakit a tagok közül!</p>'}`;
    const inp = $('#dmq'); inp.oninput = () => { S.dmq = inp.value; renderSide(); const n = $('#dmq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
    return;
  }
  $('#sHead').innerHTML = `<h2 class="gold">HGWS STUDIOS</h2>${isAdmin() ? '<button class="ibtn" id="addCh" title="Új csatorna">➕</button>' : ''}`;
  if ($('#addCh')) $('#addCh').onclick = () => Admin.channelModal();
  const cats = []; S.channels.forEach(c => { const k = c.category || 'Csatornák'; let g = cats.find(x => x.k === k); if (!g) cats.push(g = { k, l: [] }); g.l.push(c); });
  $('#sBody').innerHTML = `<div class="banner"></div>
    ${cats.map(g => `<div class="cat">${esc(g.k)}</div>${g.l.map(c => `<a class="si${r.view === 'chan' && r.id === c.id ? ' on' : ''}${chanUnread(c) ? ' unread' : ''}" href="#/c/${esc(c.id)}">
      <span class="hash">${c.type === 'announce' ? '📢' : '#'}</span><span class="nm">${esc(c.name)}</span></a>`).join('')}`).join('')}
    ${!S.channels.length ? '<p class="hint" style="padding:.8rem .6rem">Még nincsenek csatornák.</p>' : ''}
`;
  badges();
}

function badges() {
  const n = S.convs.filter(convUnread).length, t = n > 9 ? '9+' : String(n);
  ['#dmBadge', '#dmBadge2', '#chatBadge', '#chatBadge2'].forEach(k => { const b = $(k); if (b) { b.hidden = !n; b.textContent = t; } });
  const base = document.title.replace(/^\(\d+\+?\) /, '');
  document.title = (n ? `(${n}) ` : '') + base;
}

function renderOnline() {
  const on = [...S.users.values()].filter(u => isOnline(u) && !u.banned).sort((a, b) => (ROLES[b.role]?.rank || 0) - (ROLES[a.role]?.rank || 0) || a.name.localeCompare(b.name, 'hu'));
  $('#onCount').textContent = on.length;
  $('#onList').innerHTML = on.map(u => `<button class="onu" data-u="${esc(u.id)}" title="${esc(u.name)}"><span class="avw">${avatar(u, 34)}<i class="on y"></i></span><b style="color:${u.role && u.role !== 'user' ? ROLES[u.role].color : 'inherit'}">${esc(u.name)}</b></button>`).join('');
}

function renderMembers() {
  if (!S.me || $('#members').style.display === 'none') return;
  const all = [...S.users.values()].filter(u => !u.banned);
  const on = all.filter(isOnline), off = all.filter(u => !isOnline(u));
  const by = (l, role) => l.filter(u => (u.role || 'user') === role).sort((a, b) => a.name.localeCompare(b.name, 'hu'));
  const grp = (t, l, y) => l.length ? `<div class="cat">${t} — ${l.length}</div>${l.map(u => `<button class="mi${y ? ' y' : ''}" data-u="${esc(u.id)}">
    <span class="avw">${avatar(u, 32)}<i class="on${y ? ' y' : ''}"></i></span><b style="color:${u.role !== 'user' && u.role ? ROLES[u.role].color : 'inherit'}">${esc(u.name)}</b></button>`).join('')}` : '';
  $('#memList').innerHTML = grp('Admin', by(on, 'admin'), 1) + grp('Moderátor', by(on, 'moderator'), 1) + grp('Online', by(on, 'user'), 1) + grp('Offline', off.sort((a, b) => a.name.localeCompare(b.name, 'hu')), 0);
  $('#memCount').textContent = `${on.length} online`;
}

function renderOwnerBar() {
  if (S.owner !== null) { $$('.ownerslot').forEach(e => e.innerHTML = ''); return; }
  $$('.ownerslot').forEach(e => e.innerHTML = `<div class="ownerbar"><span>👑 <b>Még nincs admin.</b> Ha te vagy az oldal tulajdonosa, igényeld az admin jogot. (Csak egyszer lehet, utána az admin oszt jogokat.)</span><button class="btn goldb sm" data-claim>ADMIN JOG IGÉNYLÉSE</button></div>`);
  $$('[data-claim]').forEach(b => b.onclick = async () => {
    try {
      const b = FB.writeBatch(db);
      b.update(FB.doc(db, 'users', uid()), { role: 'admin' });
      b.set(FB.doc(db, 'meta', 'owner'), { uid: uid(), at: FB.serverTimestamp() });
      await b.commit();
      S.owner = { uid: uid() }; renderOwnerBar();
      setTimeout(async () => { if (!S.channels.length) await Admin.defaultChannels().catch(() => {}); toast('Mostantól te vagy az admin 👑'); }, 800);
    } catch (e) { toast(errText(e), true); }
  });
}

/* ===================== ÉRTESÍTÉSEK ===================== */
const notified = new Map();
function notifyConv(c) {
  const lm = c.lastMessage; if (!lm || lm.uid === uid()) return;
  const t = ms(c.updatedAt); if (!t || notified.get(c.id) >= t) return; notified.set(c.id, t);
  if (S.route.view === 'conv' && S.route.id === c.id && !document.hidden) return;
  if (Date.now() - t > 60e3) return;
  blip();
  const title = c.type === 'group' ? `${U(lm.uid).name} · ${convName(c)}` : U(lm.uid).name;
  toast(`💬 ${title}: ${lm.text}`);
  if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    try { const n = new Notification(title, { body: lm.text, icon: 'img/icon.png', tag: c.id }); n.onclick = () => { focus(); location.hash = '#/dm/' + c.id; n.close(); }; } catch (_) {}
  }
}

/* ===================== GLOBÁLIS KATTINTÁSOK ===================== */
function globalClick(e) {
  const u = e.target.closest('[data-u]');
  if (u && !e.target.closest('.pop')) { e.preventDefault(); return profile(u.dataset.u, u); }
  if (Browse.onClick(e)) return;
  const y = e.target.closest('.yt[data-yt]');
  if (y && !y.querySelector('iframe')) { y.insertAdjacentHTML('beforeend', `<iframe src="https://www.youtube-nocookie.com/embed/${esc(y.dataset.yt)}?autoplay=1&rel=0&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`); }
}

/* profil kártya */
function profile(id, anchor) {
  const u = U(id), self = id === uid();
  const muted = toDate(u.mutedUntil) > new Date();
  const canMod = !self && (isAdmin() || (isMod() && (u.role || 'user') === 'user'));
  const p = popover(anchor, `<div class="prof" style="--pc:${u.color || '#e8b656'}"><div class="cv"></div><div class="pb">
    <div class="pa"><span class="avw">${avatar(u, 72)}<i class="on${isOnline(u) ? ' y' : ''}" style="width:18px;height:18px;border-width:4px;border-color:var(--bg3)"></i></span>${roleBadge(u)}</div>
    <h4>${esc(u.name)}</h4>
    <div class="meta">${isOnline(u) ? '🟢 Online' : u.lastSeen ? 'Utoljára: ' + timeLabel(u.lastSeen) : ''}${u.createdAt ? ' · Tag ' + toDate(u.createdAt).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short' }) + ' óta' : ''}</div>
    ${u.bio ? `<div class="bio">${esc(u.bio)}</div>` : ''}
    ${u.banned ? '<div class="stat">⛔ Kitiltva</div>' : muted ? `<div class="stat">🔇 Némítva eddig: ${timeLabel(u.mutedUntil)}</div>` : ''}
    <div class="sec">${self ? '<button class="btn plain sm" data-a="set">Profil szerkesztése</button>' : `<button class="btn primary sm" data-a="dm">💬 Üzenet</button>`}
      ${canMod ? `<button class="btn plain sm" data-a="mod">🛡️ Moderálás</button>` : ''}</div>
  </div></div>`);
  p.addEventListener('click', e => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    closePop();
    if (a === 'dm') location.hash = '#/u/' + id;
    if (a === 'set') settings();
    if (a === 'mod') Admin.modModal(id);
  });
}

/* ===================== PROFIL MENÜ ===================== */
function userMenu(anchor) {
  const m = S.me;
  const p = popover(anchor, `<div class="umenu"><div class="mh">${avatar(m, 40)}<div><b>${esc(m.name)}</b><small>${esc(ROLES[m.role]?.label || '')}</small></div></div>
    <button data-a="set">⚙️ Profil és beállítások</button><a href="#/lista">＋ Saját lista</a><a href="#/chat">💬 Közösség</a><a href="#/dm">✉️ Privát üzenetek</a>
    ${isMod() ? `<hr><a href="#/admin/tagok">🛡️ Tagok és jogok</a>${isAdmin() ? '<a href="#/admin/filmek">🎞️ Filmek kezelése</a><a href="#/admin/zene">🎵 Zenék kezelése</a><a href="#/admin/csatornak">⚙️ Csatornák kezelése</a>' : ''}` : ''}
    <hr><a href="./">🏠 HGWS főoldal</a><a href="miert_igyal.html">🍻 Ma miért igyál?</a><a href="vizsga.html">📝 Közigazgatási vizsga – gyakorló</a><button data-a="out">🚪 Kijelentkezés</button></div>`);
  const r = anchor.getBoundingClientRect();
  p.style.left = Math.max(8, Math.min(innerWidth - p.offsetWidth - 8, r.left < innerWidth / 2 ? r.left : r.right - p.offsetWidth)) + 'px';
  p.style.top = Math.max(8, r.bottom + 8 + p.offsetHeight > innerHeight ? r.top - p.offsetHeight - 8 : r.bottom + 8) + 'px';
  p.addEventListener('click', e => { const a = e.target.closest('[data-a]')?.dataset.a; if (e.target.closest('a,button')) closePop(); if (a === 'set') settings(); if (a === 'out') FB.signOut(auth); });
}

/* titkos köszönet Zerónak – írd be bárhol: z e r o */
function zeroEgg() {
  let buf = '';
  addEventListener('keydown', e => {
    if (e.target.closest('input,textarea')) return;
    buf = (buf + e.key.toLowerCase()).slice(-4);
    if (buf !== 'zero') return;
    buf = ''; showZero();
  });
}
function showZero() {
  {
    const el = document.createElement('div'); el.className = 'zero';
    el.innerHTML = `<div class="zc"><div class="zt">// TITKOS STÁB</div><div class="zn">ZERO</div><div class="zs">a HGWS árnyékban dolgozó segítője</div><p>Köszi tesó, nélküled ez az oldal nem lenne ilyen. 💧</p><small>(megtaláltad az easter egget)</small></div>`;
    document.body.appendChild(el);
    for (let i = 0; i < 60; i++) { const d = document.createElement('i'); d.style.cssText = `left:${Math.random() * 100}%;animation-delay:${Math.random() * 1.5}s;animation-duration:${1.6 + Math.random() * 1.6}s`; d.textContent = Math.random() < .5 ? '0' : '💧'; el.appendChild(d); }
    el.onclick = () => el.remove(); setTimeout(() => el.remove(), 7000);
  }
}

/* ===================== BEÁLLÍTÁSOK ===================== */
function settings() {
  const m = S.me, pwUser = S.user.providerData.some(p => p.providerId === 'password');
  const notif = 'Notification' in window ? Notification.permission : 'unsupported';
  const el = modal({ title: 'Profil és beállítások', body: `
    <div style="display:flex;align-items:center;gap:1rem">${avatar(m, 64)}<div><b style="font-size:1.1rem">${esc(m.name)}</b><div class="hint">${esc(S.user.email || '')} · ${ROLES[m.role]?.label}</div></div></div>
    <div class="field"><label>Megjelenített név</label><input class="inp" name="name" maxlength="32" value="${esc(m.name)}"></div>
    <div class="field"><label>Bemutatkozás <em>(nem kötelező)</em></label><textarea class="inp" name="bio" maxlength="300" rows="3">${esc(m.bio || '')}</textarea></div>
    <div class="field"><label>Színed</label><div class="swatches">${COLORS.map(c => `<button type="button" data-c="${c}" class="${c === m.color ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div></div>
    <div class="field"><label>Értesítések</label><div>${notif === 'granted' ? '<span class="hint">✅ Asztali értesítések bekapcsolva</span>' : notif === 'unsupported' ? '<span class="hint">A böngésződ nem támogatja.</span>' : notif === 'denied' ? '<span class="hint">A böngészőben le vannak tiltva.</span>' : '<button class="btn plain sm" data-notif>🔔 Asztali értesítések bekapcsolása</button>'}</div></div>
    ${pwUser ? `<details><summary class="lbl" style="cursor:pointer">Jelszó módosítása</summary><div style="display:flex;flex-direction:column;gap:.6rem;margin-top:.7rem">
      <input class="inp" type="password" name="old" placeholder="Jelenlegi jelszó" autocomplete="current-password">
      <input class="inp" type="password" name="new" placeholder="Új jelszó (min. 8 karakter)" autocomplete="new-password">
      <button class="btn plain sm" data-pw style="align-self:flex-start">Jelszó módosítása</button></div></details>` : ''}`,
    foot: `<button class="btn danger l" data-out>Kijelentkezés</button><button class="btn plain" data-x>Mégse</button><button class="btn goldb" data-save>Mentés</button>` });
  let color = m.color;
  el.querySelector('.swatches').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; color = b.dataset.c; $$('.swatches button', el).forEach(x => x.classList.toggle('on', x === b)); };
  el.querySelector('[data-out]').onclick = () => FB.signOut(auth);
  const nb = el.querySelector('[data-notif]'); if (nb) nb.onclick = async () => { const p = await Notification.requestPermission(); toast(p === 'granted' ? 'Értesítések bekapcsolva 🔔' : 'Nem kaptunk engedélyt.', p !== 'granted'); el.close(); };
  const pw = el.querySelector('[data-pw]'); if (pw) pw.onclick = async () => {
    const o = el.querySelector('[name=old]').value, n = el.querySelector('[name=new]').value;
    if (n.length < 8) return toast('Az új jelszó legalább 8 karakter legyen.', true);
    try { await FB.reauthenticateWithCredential(S.user, FB.EmailAuthProvider.credential(S.user.email, o)); await FB.updatePassword(S.user, n); toast('Jelszó módosítva ✓'); el.close(); }
    catch (e) { toast(errText(e), true); }
  };
  el.querySelector('[data-save]').onclick = async () => {
    const name = el.querySelector('[name=name]').value.trim(), bio = el.querySelector('[name=bio]').value.trim();
    if (name.length < 2) return toast('A név legalább 2 karakter legyen.', true);
    if (reservedName(name) && S.owner?.uid !== uid()) return toast(RESERVED_MSG, true);
    try { await FB.updateDoc(FB.doc(db, 'users', uid()), { name, nameLower: name.toLowerCase(), bio, color }); FB.updateProfile(S.user, { displayName: name }).catch(() => {}); toast('Mentve ✓'); el.close(); }
    catch (e) { toast(errText(e), true); }
  };
}

/* ===================== PRIVÁT ÜZENETEK ===================== */
async function openDm(other) {
  if (other === uid()) { location.replace('#/dm'); return; }
  const members = [uid(), other].sort(), id = members.join('_');
  if (!S.convs.some(c => c.id === id)) {
    try { await FB.setDoc(FB.doc(db, 'conversations', id), { type: 'dm', members, createdAt: FB.serverTimestamp(), updatedAt: FB.serverTimestamp(), reads: {}, lastMessage: null }); }
    catch (e) { if (e.code !== 'permission-denied') { toast(errText(e), true); return; } }
  }
  location.replace('#/dm/' + id);
}

function renderDmHome() {
  setTitle('👥', 'Tagok');
  const q = (S.homeq || '').toLowerCase();
  const list = [...S.users.values()].filter(u => u.id !== uid() && !u.banned && (!q || u.name.toLowerCase().includes(q)))
    .sort((a, b) => (isOnline(b) - isOnline(a)) || a.name.localeCompare(b.name, 'hu'));
  $('#view').innerHTML = `<div class="page"><h1 class="gold">Kivel beszélgetnél?</h1><p class="lead">Kattints valakire a privát üzenethez, vagy csinálj csoportot többekkel.</p>
    <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1.2rem;align-items:center"><div class="search" style="flex:1;min-width:220px;margin:0"><input type="search" id="hq" placeholder="Tag keresése…" value="${esc(S.homeq || '')}"></div><button class="btn goldb" id="ng">👥 ÚJ CSOPORT</button></div>
    <div class="atable">${list.map(u => `<div class="arow"><span class="avw">${avatar(u, 42)}<i class="on${isOnline(u) ? ' y' : ''}" style="border-color:#0d1830"></i></span>
      <div class="who"><b data-u="${esc(u.id)}" style="cursor:pointer">${esc(u.name)}</b> ${roleBadge(u)}<small>${isOnline(u) ? '🟢 Online' : u.lastSeen ? 'Utoljára ' + timeLabel(u.lastSeen) : ''}</small></div>
      <div class="ac"><a class="btn primary sm" href="#/u/${esc(u.id)}">💬 Üzenet</a></div></div>`).join('') || '<div class="empty">Nincs találat.</div>'}</div></div>`;
  $('#ng').onclick = newGroup;
  const i = $('#hq'); i.oninput = () => { S.homeq = i.value; renderDmHome(); const n = $('#hq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
}

function pickUsers(el, chosen, exclude = []) {
  const draw = () => {
    const q = (el.querySelector('[data-q]').value || '').toLowerCase();
    el.querySelector('.chips').innerHTML = [...chosen].map(id => `<span class="chip">${avatar(U(id), 20)}${esc(U(id).name)}<button data-rm="${esc(id)}">✕</button></span>`).join('');
    el.querySelector('.pick').innerHTML = [...S.users.values()].filter(u => u.id !== uid() && !exclude.includes(u.id) && !u.banned && u.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'hu'))
      .map(u => `<label><input type="checkbox" value="${esc(u.id)}" ${chosen.has(u.id) ? 'checked' : ''}>${avatar(u, 30)}<span>${esc(u.name)}</span></label>`).join('') || '<p class="hint" style="padding:.6rem">Nincs találat.</p>';
  };
  el.querySelector('[data-q]').oninput = draw;
  el.querySelector('.pick').onchange = e => { const v = e.target.value; e.target.checked ? chosen.add(v) : chosen.delete(v); draw(); };
  el.querySelector('.chips').onclick = e => { const b = e.target.closest('[data-rm]'); if (b) { chosen.delete(b.dataset.rm); draw(); } };
  draw();
}
const pickerHtml = `<div class="chips"></div><div class="search" style="margin:0"><input type="search" data-q placeholder="Tagok keresése…"></div><div class="pick"></div>`;

function newGroup() {
  const chosen = new Set();
  const el = modal({ title: 'Új csoport', body: `<div class="field"><label>Csoport neve</label><input class="inp" name="n" maxlength="60" placeholder="pl. Locsolóbrigád 💧"></div><div class="field"><label>Tagok</label>${pickerHtml}</div>`,
    foot: `<button class="btn plain" data-x>Mégse</button><button class="btn goldb" data-ok>Létrehozás</button>` });
  pickUsers(el, chosen);
  el.querySelector('[data-ok]').onclick = async () => {
    if (!chosen.size) return toast('Válassz legalább egy tagot.', true);
    const name = el.querySelector('[name=n]').value.trim();
    try {
      const ref = FB.doc(FB.collection(db, 'conversations'));
      await FB.setDoc(ref, { type: 'group', name, owner: uid(), members: [uid(), ...chosen], createdAt: FB.serverTimestamp(), updatedAt: FB.serverTimestamp(), reads: {}, lastMessage: null });
      el.close(); location.hash = '#/dm/' + ref.id;
    } catch (e) { toast(errText(e), true); }
  };
}

function groupSettings(c) {
  const owner = c.owner === uid();
  const el = modal({ title: 'Csoport beállításai', body: `
    <div class="field"><label>Csoport neve</label><div style="display:flex;gap:.5rem"><input class="inp" name="n" maxlength="60" value="${esc(c.name || '')}" placeholder="${esc(convName(c))}"><button class="btn plain sm" data-rn>Mentés</button></div></div>
    <div class="field"><label>Tagok (${c.members.length})</label><div class="pick" style="max-height:30vh">${c.members.map(m => `<div style="display:flex;align-items:center;gap:.7rem;padding:.4rem .55rem">${avatar(U(m), 30)}<span style="flex:1">${esc(U(m).name)}${m === c.owner ? ' 👑' : ''}${m === uid() ? ' <span class="hint">(te)</span>' : ''}</span>${owner && m !== uid() ? `<button class="btn danger sm" data-kick="${esc(m)}">Eltávolítás</button>` : ''}</div>`).join('')}</div></div>
    <div class="field"><label>Tagok hozzáadása</label>${pickerHtml}<button class="btn plain sm" data-add style="align-self:flex-start">Hozzáadás</button></div>`,
    foot: `${owner ? '<button class="btn danger l" data-del>Csoport törlése</button>' : ''}<button class="btn danger" data-leave>Kilépés</button><button class="btn plain" data-x>Bezárás</button>` });
  const chosen = new Set(); pickUsers(el, chosen, c.members);
  const ref = FB.doc(db, 'conversations', c.id);
  const sys = t => ({ lastMessage: { text: t, uid: uid(), at: FB.serverTimestamp() }, updatedAt: FB.serverTimestamp() });
  el.querySelector('[data-rn]').onclick = async () => { const n = el.querySelector('[name=n]').value.trim(); try { await FB.updateDoc(ref, { name: n, ...sys(`átnevezte a csoportot: ${n || '—'}`) }); toast('Átnevezve ✓'); el.close(); } catch (e) { toast(errText(e), true); } };
  el.querySelector('[data-add]').onclick = async () => { if (!chosen.size) return; try { await FB.updateDoc(ref, { members: [...c.members, ...chosen], ...sys(`hozzáadta: ${[...chosen].map(i => U(i).name).join(', ')}`) }); toast('Hozzáadva ✓'); el.close(); } catch (e) { toast(errText(e), true); } };
  el.querySelectorAll('[data-kick]').forEach(b => b.onclick = async () => { try { await FB.updateDoc(ref, { members: c.members.filter(m => m !== b.dataset.kick), ...sys(`eltávolította: ${U(b.dataset.kick).name}`) }); toast('Eltávolítva'); el.close(); } catch (e) { toast(errText(e), true); } });
  el.querySelector('[data-leave]').onclick = async () => { if (!await confirmBox('Kilépsz a csoportból? Utána nem látod az üzeneteket.', 'Kilépés')) return; try { await FB.updateDoc(ref, { members: c.members.filter(m => m !== uid()), ...sys('kilépett a csoportból') }); el.close(); location.hash = '#/dm'; } catch (e) { toast(errText(e), true); } };
  const d = el.querySelector('[data-del]'); if (d) d.onclick = async () => { if (!await confirmBox('Biztosan törlöd a csoportot mindenkinek?', 'Törlés')) return; try { await FB.deleteDoc(ref); el.close(); location.hash = '#/dm'; } catch (e) { toast(errText(e), true); } };
}

/* ===================== CSEVEGÉS ===================== */
const DAY = d => d.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
let mentionRe = null, mentionKey = '';
function mentions() {
  const names = [...S.users.values()].map(u => u.name).filter(Boolean).sort((a, b) => b.length - a.length);
  const k = names.join('|'); if (k === mentionKey) return mentionRe;
  mentionKey = k; mentionRe = names.length ? new RegExp('@(' + names.map(n => esc(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'g') : null;
  return mentionRe;
}
function fmt(text) {
  const keep = [];
  const ph = h => `\u0001${keep.push(h) - 1}\u0002`;
  let s = esc(text);
  s = s.replace(/```(?:[a-z]*\n)?([\s\S]*?)```/g, (_, c) => ph(`<pre>${c.replace(/^\n|\n$/g, '')}</pre>`));
  s = s.replace(/`([^`\n]+)`/g, (_, c) => ph(`<code>${c}</code>`));
  s = s.replace(/https?:\/\/[^\s<]+[^\s<.,:;!?)\]'"]/g, u => ph(`<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`));
  const re = mentions();
  if (re) s = s.replace(re, (m, n) => ph(`<span class="at${n === esc(S.me.name) ? ' me' : ''}">@${n}</span>`));
  s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>').replace(/~~(.+?)~~/g, '<s>$1</s>').replace(/__(.+?)__/g, '<u>$1</u>');
  return s.replace(/\u0001(\d+)\u0002/g, (_, i) => keep[i]);
}
const onlyEmoji = t => t.length <= 24 && /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\s|‍|️)+$/u.test(t) && !/^[\d#*\s]+$/.test(t);
function ytEmbeds(text) {
  const ids = [...new Set([...(text || '').matchAll(/https?:\/\/(?:www\.|m\.)?(?:youtube\.com|youtu\.be)\/[^\s<]+/g)].map(m => ytId(m[0])).filter(Boolean))].slice(0, 2);
  return ids.map(id => `<div class="embed"><div class="yt" data-yt="${esc(id)}" style="background-image:url(https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg)"><span class="pb">▶</span><span class="lb">YouTube</span></div></div>`).join('');
}
function trackCard(id) {
  const t = S.music.find(x => x.id === id);
  if (!t) return `<div class="embed" style="padding:.8rem;color:var(--muted);font-size:.85rem">🎵 Ez a zene már nem elérhető.</div>`;
  return `<div class="embed trackc${Player.current() === id ? ' cur' + (Player.isPlaying() ? ' isplay' : '') : ''}" data-track="${esc(t.id)}"><span class="pc" style="${t.cover ? `background-image:url('${esc(t.cover)}')` : ''}"></span><div><b>${esc(t.title)}</b><small>🎵 ${esc(t.artist || 'HGWS')}</small></div><span class="tp"><span>▶</span></span></div>`;
}
function filmCard(id) {
  const v = S.videos.find(x => x.id === id);
  if (!v) return `<div class="embed" style="padding:.8rem;color:var(--muted);font-size:.85rem">🎬 Ez a film már nem elérhető.</div>`;
  return `<div class="embed filmc" data-film="${esc(v.id)}"><div class="ph" style="background-image:url('${esc(v.poster || '')}')"><span class="${v.soon ? '' : 'r'}">${v.soon ? 'HAMAROSAN' : '▶ MEGNÉZHETŐ'}</span></div>
    <div class="fi"><small>${esc((v.kind || 'Film').toUpperCase())} · HGWS STUDIOS</small><b>${esc(v.title)}</b><p>${esc(v.desc || '')}</p></div></div>`;
}

class Chat {
  constructor(o) {
    Object.assign(this, o);
    this.n = 50; this.msgs = []; this.els = new Map(); this.first = true; this.reply = null; this.editing = null;
    this.path = o.kind === 'chan' ? ['channels', o.id] : ['conversations', o.id];
    this.header();
    $('#view').innerHTML = `<div class="msgs" id="msgs"><div class="fill"></div><button class="btn plain sm more" id="more" hidden>Korábbi üzenetek</button><div id="welcome"></div><div id="mlist"></div></div><div class="composer" id="composer"></div>`;
    this.box = $('#msgs'); this.list = $('#mlist');
    $('#more').onclick = () => { this.n += 50; this.keepPos = this.box.scrollHeight - this.box.scrollTop; this.listen(); };
    this.box.addEventListener('scroll', () => { if (this.box.scrollTop < 60 && !$('#more').hidden && !this.loading) $('#more').click(); if (this.atBottom()) this.markRead(); }, { passive: true });
    this.list.addEventListener('click', e => this.onClick(e));
    this.welcome(); this.renderComposer(); this.listen();
  }
  get conv() { return this.kind === 'conv' ? (S.convs.find(c => c.id === this.id) || this._conv) : null; }
  set conv(v) { this._conv = v; }
  header() {
    if (this.kind === 'chan') { setTitle(this.chan.type === 'announce' ? '📢' : '#', this.chan.name, this.chan.topic || ''); return; }
    const c = this.conv;
    if (!c) { setTitle('💬', 'Beszélgetés'); return; }
    if (c.type === 'group') {
      setTitle('👥', convName(c), c.members.map(m => U(m).name).join(', '));
      $('#mActs').innerHTML = `<button class="ibtn" id="gset" title="Csoport beállításai">⚙️</button>`; $('#gset').onclick = () => groupSettings(this.conv);
    } else {
      const o = U(c.members.find(m => m !== uid()));
      setTitle('@', o.name, isOnline(o) ? '🟢 Online' : o.lastSeen ? 'Utoljára ' + timeLabel(o.lastSeen) : '');
    }
  }
  updateConv() { if (!this.conv && this.kind === 'conv') return; this.header(); this.welcome(); this.markRead(); }
  welcome() {
    let h;
    if (this.kind === 'chan') h = `<div class="big">${this.chan.type === 'announce' ? '📢' : '#'}</div><h3 class="gold">Üdv a #${esc(this.chan.name)} csatornán!</h3><p>${esc(this.chan.topic || 'Ez a csatorna eleje.')}</p>`;
    else { const c = this.conv; if (!c) return;
      h = c.type === 'group' ? `<div class="big">👥</div><h3 class="gold">${esc(convName(c))}</h3><p>A csoport eleje. ${c.members.length} tag.</p>`
        : (() => { const o = U(c.members.find(m => m !== uid())); return `${avatar(o, 72)}<h3 class="gold" style="margin-top:.6rem">${esc(o.name)}</h3><p>Ez a privát beszélgetésetek eleje.</p>`; })(); }
    const html = `<div class="welcome">${h}</div>`;
    if (this._wh !== html) { $('#welcome').innerHTML = html; this._wh = html; }
  }
  ref() { return FB.collection(db, ...this.path, 'messages'); }
  listen() {
    this.unsub && this.unsub(); this.loading = true;
    this.unsub = FB.onSnapshot(FB.query(this.ref(), FB.orderBy('createdAt', 'desc'), FB.limit(this.n)), s => {
      this.loading = false;
      const fresh = s.docChanges().some(c => c.type === 'added' && !c.doc.metadata.hasPendingWrites) && !this.first;
      this.msgs = s.docs.map(d => ({ id: d.id, pending: d.metadata.hasPendingWrites, ...d.data({ serverTimestamps: 'estimate' }) })).reverse();
      $('#more').hidden = s.size < this.n;
      $('#welcome').hidden = s.size >= this.n;
      const mine = s.docChanges().some(c => c.type === 'added' && c.doc.data().uid === uid() && c.doc.metadata.hasPendingWrites);
      this.render(mine);
      if (fresh && document.hidden && this.kind === 'chan') blip();
    }, e => { this.loading = false; if (e.code === 'permission-denied') $('#view').innerHTML = '<div class="full"><div><div class="big">🔒</div><h2>Ehhez nincs hozzáférésed</h2></div></div>'; else toast(errText(e), true); });
  }
  atBottom() { return this.box.scrollHeight - this.box.scrollTop - this.box.clientHeight < 90; }
  rerender() { this.els.clear(); this.list.innerHTML = ''; this.header(); this.welcome(); this.render(false, true); }
  render(mine, keep) {
    const bottom = this.first || mine || this.atBottom(), prevTop = this.box.scrollTop;
    const items = []; let last = null, lastDay = '';
    for (const m of this.msgs) {
      const d = toDate(m.createdAt) || new Date(), day = d.toDateString();
      if (day !== lastDay) { items.push({ key: 'd' + day, sig: day, html: `<div class="day">${DAY(d)}</div>` }); lastDay = day; last = null; }
      const cont = last && last.uid === m.uid && !m.replyTo && d - (toDate(last.createdAt) || d) < 5 * 60e3;
      const u = U(m.uid);
      const sig = JSON.stringify([m.text, ms(m.editedAt), m.reactions, m.film, m.track, S.music.length, cont, u.name, u.role, u.color, u.photoURL, m.pending, this.editing === m.id, S.videos.length]);
      items.push({ key: m.id, sig, m, cont });
      last = m;
    }
    const seen = new Set(); let prev = null;
    for (const it of items) {
      seen.add(it.key);
      let el = this.els.get(it.key);
      if (!el || el._sig !== it.sig) {
        const t = document.createElement('template'); t.innerHTML = it.html || this.msgHtml(it.m, it.cont);
        const n = t.content.firstElementChild; n._sig = it.sig; n.dataset.key = it.key;
        if (!this.first && !el && it.m) n.classList.add('new');
        if (el) el.replaceWith(n); el = n; this.els.set(it.key, n);
        if (it.m && this.editing === it.m.id) this.mountEdit(n, it.m);
      }
      const want = prev ? prev.nextSibling : this.list.firstChild;
      if (want !== el) this.list.insertBefore(el, want);
      prev = el;
    }
    for (const [k, el] of this.els) if (!seen.has(k)) { el.remove(); this.els.delete(k); }
    if (this.keepPos != null) { this.box.scrollTop = this.box.scrollHeight - this.keepPos; this.keepPos = null; }
    else if (bottom && !keep) this.box.scrollTop = this.box.scrollHeight;
    else if (keep) this.box.scrollTop = prevTop;
    if (this.first) { this.first = false; requestAnimationFrame(() => this.box.scrollTop = this.box.scrollHeight); }
    this.markRead();
  }
  msgHtml(m, cont) {
    const u = U(m.uid), mine = m.uid === uid(), t = toDate(m.createdAt);
    const me = S.me.name && (m.text || '').includes('@' + S.me.name) && !mine;
    const canDel = mine || (this.kind === 'chan' && isMod());
    const rx = Object.entries(m.reactions || {}).filter(([, l]) => l?.length);
    const rep = m.replyTo ? `<div class="rep" data-jump="${esc(m.replyTo.id)}">${avatar(U(m.replyTo.uid), 16)}<b>${esc(U(m.replyTo.uid).name)}</b><span>${esc(m.replyTo.text || '🎬 film')}</span></div>` : '';
    return `<div class="msg${cont ? ' cont' : ''}${me ? ' mention' : ''}" data-id="${esc(m.id)}">
      <div class="mg">${cont ? `<time>${t ? t.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' }) : ''}</time>` : `<span data-u="${esc(u.id)}">${avatar(u, 40)}</span>`}</div>
      <div class="mb">${rep}${cont ? '' : `<div class="mh">${nameHtml(u)}${roleBadge(u)}<time title="${t ? t.toLocaleString('hu-HU') : ''}">${m.pending ? 'küldés…' : timeLabel(m.createdAt)}</time></div>`}
        ${m.text ? `<div class="mt${onlyEmoji(m.text) ? ' big' : ''}">${fmt(m.text)}${m.editedAt ? '<span class="ed">(szerkesztve)</span>' : ''}</div>` : ''}
        ${m.film ? filmCard(m.film) : ''}${m.track ? trackCard(m.track) : ''}${ytEmbeds(m.text)}
        ${rx.length ? `<div class="reacts">${rx.map(([e, l]) => `<button data-rx="${e}" class="${l.includes(uid()) ? 'me' : ''}" title="${esc(l.map(i => U(i).name).join(', '))}">${e}<b>${l.length}</b></button>`).join('')}</div>` : ''}
      </div>
      <div class="mtools">${QUICK.slice(0, 3).map(e => `<button data-rx="${e}" title="${e}">${e}</button>`).join('')}<button data-act="emo" title="Reakció">😊</button><button data-act="reply" title="Válasz">↩️</button>
        ${mine ? '<button data-act="edit" title="Szerkesztés">✏️</button>' : ''}${canDel ? '<button class="del" data-act="del" title="Törlés">🗑️</button>' : ''}</div>
    </div>`;
  }
  onClick(e) {
    const el = e.target.closest('.msg'); if (!el) return;
    const m = this.msgs.find(x => x.id === el.dataset.id); if (!m) return;
    const rx = e.target.closest('[data-rx]'); if (rx) return this.react(m, rx.dataset.rx, rx);
    const j = e.target.closest('[data-jump]'); if (j) return this.jump(j.dataset.jump);
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (a === 'emo') emojiPicker(e.target.closest('button'), em => this.react(m, em));
    if (a === 'reply') { this.reply = m; this.renderComposer(); $('#mtext')?.focus(); }
    if (a === 'edit') { this.editing = m.id; this.render(false, true); }
    if (a === 'del') this.del(m);
  }
  async react(m, emoji, btn) {
    const has = (m.reactions?.[emoji] || []).includes(uid());
    btn?.classList.add('pop');
    try { await FB.updateDoc(FB.doc(this.ref(), m.id), new FB.FieldPath('reactions', emoji), has ? FB.arrayRemove(uid()) : FB.arrayUnion(uid())); }
    catch (e) { toast(errText(e), true); }
  }
  jump(id) {
    const el = this.els.get(id); if (!el) return toast('Ez az üzenet régebbi, görgess feljebb.');
    el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }
  async del(m) {
    if (!await confirmBox(m.uid === uid() ? 'Törlöd ezt az üzenetet?' : `Törlöd ${U(m.uid).name} üzenetét? (moderátori törlés)`, 'Törlés')) return;
    try { await FB.deleteDoc(FB.doc(this.ref(), m.id)); } catch (e) { toast(errText(e), true); }
  }
  mountEdit(el, m) {
    const mb = el.querySelector('.mb'), old = mb.querySelector('.mt');
    const box = document.createElement('div'); box.className = 'editbox';
    box.innerHTML = `<textarea rows="1">${esc(m.text)}</textarea><small>Esc: <a data-c>mégse</a> · Enter: <a data-s>mentés</a></small>`;
    old ? old.replaceWith(box) : mb.appendChild(box);
    const ta = box.querySelector('textarea'), fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
    fit(); ta.oninput = fit; setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); });
    const done = () => { this.editing = null; this.render(false, true); };
    const save = async () => {
      const t = ta.value.trim(); if (t === m.text) return done(); if (!t && !m.film) return this.del(m).then(done);
      try { await FB.updateDoc(FB.doc(this.ref(), m.id), { text: t, editedAt: FB.serverTimestamp() }); } catch (e) { toast(errText(e), true); }
      done();
    };
    ta.onkeydown = e => { if (e.key === 'Escape') { e.stopPropagation(); done(); } if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); } };
    box.querySelector('[data-c]').onclick = done; box.querySelector('[data-s]').onclick = save;
  }
  renderComposer() {
    const c = $('#composer'); if (!c) return;
    const mu = mutedUntil();
    let note = '';
    if (mu) note = `🔇 Némítva vagy eddig: ${timeLabel(mu)}`;
    else if (this.kind === 'chan' && this.chan.type === 'announce' && !isMod()) note = '📢 Ide csak az adminok és moderátorok írhatnak.';
    if (note) { c.innerHTML = `<div class="cnote">${note}</div>`; return; }
    const ph = this.kind === 'chan' ? `Üzenet a #${this.chan.name} csatornára` : `Üzenet ${this.conv ? (this.conv.type === 'group' ? 'a csoportnak' : '@' + convName(this.conv) + ' részére') : ''}`;
    const prevText = $('#mtext')?.value || '';
    c.innerHTML = `${this.reply ? `<div class="replybar">↩️ <span>Válasz neki: <b>${esc(U(this.reply.uid).name)}</b> — ${esc((this.reply.text || '🎬').slice(0, 80))}</span><button class="ibtn" id="rx" style="width:26px;height:26px">✕</button></div>` : ''}
      <div class="cbox"><button class="ibtn" id="cFilm" title="Film megosztása">🎬</button><button class="ibtn" id="cMus" title="Zene megosztása">🎵</button><button class="ibtn" id="cEmo" title="Emoji">😊</button>
      <textarea id="mtext" rows="1" maxlength="4000" placeholder="${esc(ph)}"></textarea><button class="ibtn send" id="cSend" title="Küldés" disabled>➤</button></div>
      <div class="chint"><span>Enter: küldés · Shift+Enter: új sor · @név: megemlítés</span><span>**félkövér** *dőlt* \`kód\`</span></div>`;
    const ta = $('#mtext'), send = $('#cSend');
    ta.value = prevText;
    const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, innerHeight * .4) + 'px'; send.disabled = !ta.value.trim(); };
    fit();
    ta.oninput = () => { fit(); this.mentionPop(ta); };
    ta.onkeydown = e => {
      if (this.mp && ['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) return this.mentionKey(e, ta);
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !(matchMedia('(hover:none)').matches)) { e.preventDefault(); this.send(); }
      if (e.key === 'Escape' && this.reply) { this.reply = null; this.renderComposer(); }
      if (e.key === 'ArrowUp' && !ta.value) { const m = [...this.msgs].reverse().find(x => x.uid === uid() && x.text); if (m) { e.preventDefault(); this.editing = m.id; this.render(false, true); } }
    };
    send.onclick = () => this.send();
    $('#cEmo').onclick = e => emojiPicker(e.currentTarget, em => { const p = ta.selectionStart; ta.value = ta.value.slice(0, p) + em + ta.value.slice(ta.selectionEnd); ta.focus(); ta.selectionStart = ta.selectionEnd = p + em.length; fit(); });
    $('#cFilm').onclick = () => shareFilm(null, this);
    $('#cMus').onclick = () => shareFilm(null, this, '*');
    const rx = $('#rx'); if (rx) rx.onclick = () => { this.reply = null; this.renderComposer(); };
    if (matchMedia('(hover:hover)').matches) ta.focus();
  }
  mentionPop(ta) {
    const before = ta.value.slice(0, ta.selectionStart), m = before.match(/(^|\s)@([^\s@]{0,20})$/);
    this.mp?.remove(); this.mp = null;
    if (!m) return;
    const q = m[2].toLowerCase();
    const list = [...S.users.values()].filter(u => !u.banned && u.name.toLowerCase().startsWith(q)).slice(0, 6);
    if (!list.length) return;
    const r = ta.getBoundingClientRect();
    const el = document.createElement('div'); el.className = 'pop'; el.style.cssText = `left:${r.left}px;bottom:${innerHeight - r.top + 8}px;min-width:220px;padding:.3rem`;
    el.innerHTML = list.map((u, i) => `<button class="mi y${i === 0 ? ' sel' : ''}" data-n="${esc(u.name)}" style="${i === 0 ? 'background:rgba(108,198,255,.12)' : ''}">${avatar(u, 26)}<b>${esc(u.name)}</b></button>`).join('');
    document.body.appendChild(el); this.mp = el; this.mpi = 0; this.mpq = m[2];
    el.onmousedown = e => { e.preventDefault(); const b = e.target.closest('[data-n]'); if (b) this.mentionPick(ta, b.dataset.n); };
  }
  mentionKey(e, ta) {
    const items = [...this.mp.children];
    if (e.key === 'Escape') { this.mp.remove(); this.mp = null; return; }
    e.preventDefault();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      this.mpi = (this.mpi + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((b, i) => b.style.background = i === this.mpi ? 'rgba(108,198,255,.12)' : '');
      return;
    }
    this.mentionPick(ta, items[this.mpi].dataset.n);
  }
  mentionPick(ta, name) {
    const p = ta.selectionStart, start = p - this.mpq.length - 1;
    ta.value = ta.value.slice(0, start) + '@' + name + ' ' + ta.value.slice(p);
    ta.selectionStart = ta.selectionEnd = start + name.length + 2; ta.focus();
    this.mp?.remove(); this.mp = null; ta.dispatchEvent(new Event('input'));
  }
  async send(film = null, textIn = null, track = null) {
    const ta = $('#mtext');
    const text = (textIn ?? ta?.value ?? '').trim();
    if (!text && !film && !track) return;
    const data = { uid: uid(), text, createdAt: FB.serverTimestamp() };
    if (film) data.film = film;
    if (track) data.track = track;
    if (this.reply && textIn == null) data.replyTo = { id: this.reply.id, uid: this.reply.uid, text: (this.reply.text || '').slice(0, 140) };
    if (ta && textIn == null) { ta.value = ''; ta.dispatchEvent(new Event('input')); }
    this.reply = null; if (data.replyTo) this.renderComposer();
    try { await postTo(this.kind, this.id, data, this.conv); }
    catch (e) { toast(errText(e), true); if (ta && textIn == null && !ta.value) { ta.value = text; ta.dispatchEvent(new Event('input')); } }
  }
  markRead() {
    if (document.hidden || !this.atBottom()) return;
    if (this.kind === 'chan') {
      const c = S.channels.find(x => x.id === this.id);
      if (c?.lastMessageAt && ms(c.lastMessageAt) > ms(S.reads.ch?.[c.id]) && !this.marking) {
        this.marking = true;
        FB.setDoc(FB.doc(db, 'users', uid(), 'private', 'reads'), { ch: { [c.id]: FB.serverTimestamp() } }, { merge: true }).catch(() => {}).finally(() => this.marking = false);
      }
    } else {
      const c = this.conv;
      if (c && c.lastMessage && ms(c.updatedAt) > ms(c.reads?.[uid()]) && !this.marking) {
        this.marking = true;
        FB.updateDoc(FB.doc(db, 'conversations', c.id), new FB.FieldPath('reads', uid()), FB.serverTimestamp()).catch(() => {}).finally(() => this.marking = false);
      }
    }
  }
  destroy() { this.unsub && this.unsub(); this.mp?.remove(); }
}

/* üzenet küldése egy csatornára / beszélgetésbe (a filmmegosztás is ezt használja) */
async function postTo(kind, id, data, conv) {
  const b = FB.writeBatch(db);
  const ref = FB.doc(FB.collection(db, kind === 'chan' ? 'channels' : 'conversations', id, 'messages'));
  b.set(ref, data);
  const preview = data.text ? data.text.slice(0, 120) : data.track ? '🎵 megosztott egy zenét' : '🎬 megosztott egy filmet';
  if (kind === 'chan') b.update(FB.doc(db, 'channels', id), { lastMessageAt: FB.serverTimestamp() });
  else {
    const upd = { lastMessage: { text: preview, uid: uid(), at: FB.serverTimestamp() }, updatedAt: FB.serverTimestamp() };
    upd['reads.' + uid()] = FB.serverTimestamp();
    b.update(FB.doc(db, 'conversations', id), upd);
  }
  await b.commit();
  if (kind === 'chan') FB.setDoc(FB.doc(db, 'users', uid(), 'private', 'reads'), { ch: { [id]: FB.serverTimestamp() } }, { merge: true }).catch(() => {});
}

/* ===================== FILM MEGOSZTÁSA ===================== */
function shareFilm(filmId, chat, trackId) {
  const music = !!trackId, items = music ? S.music.filter(t => t.visible !== false) : S.videos.filter(v => v.visible !== false);
  if (!items.length) return toast(music ? 'Még nincs zene feltöltve.' : 'Még nincs film a tárban.', true);
  const fixed = music ? (trackId !== '*' ? trackId : null) : filmId;
  const canChan = c => c.type !== 'announce' || isMod();
  const el = modal({ title: music ? 'Zene megosztása' : 'Film megosztása', body: `
    ${fixed ? '' : `<div class="field"><label>${music ? 'Melyik szám?' : 'Melyik film?'}</label><div class="pick">${items.map((v, i) => `<label><input type="radio" name="f" value="${esc(v.id)}" ${i === 0 ? 'checked' : ''}>${music
      ? `<span class="pc" style="width:40px;height:40px;${v.cover ? `background-image:url('${esc(v.cover)}')` : ''}"></span><span>${esc(v.title)} <span class="hint">· ${esc(v.artist || 'HGWS')}</span></span>`
      : `<span class="fthumb" style="width:72px">${v.poster ? `<img src="${esc(v.poster)}" alt="">` : ''}</span><span>${esc(v.title)}</span>`}</label>`).join('')}</div></div>`}
    ${chat ? '' : `<div class="field"><label>Hova küldjük?</label><div class="pick">
      ${S.channels.filter(canChan).length ? '<div class="grp">CSATORNÁK</div>' : ''}${S.channels.filter(canChan).map(c => `<label><input type="radio" name="t" value="chan:${esc(c.id)}"><span class="hash" style="width:30px;text-align:center">#</span><span>${esc(c.name)}</span></label>`).join('')}
      ${S.convs.length ? '<div class="grp">BESZÉLGETÉSEK</div>' : ''}${S.convs.map(c => `<label><input type="radio" name="t" value="conv:${esc(c.id)}">${convAv(c, 30)}<span>${esc(convName(c))}</span></label>`).join('')}
    </div></div>`}
    <div class="field"><label>Üzenet <em>(nem kötelező)</em></label><input class="inp" name="m" maxlength="500" placeholder="${music ? 'Ezt hallgasd meg! 🎧' : 'Ezt nézd meg! 🍿'}"></div>`,
    foot: `<button class="btn plain" data-x>Mégse</button><button class="btn goldb" data-ok>Küldés</button>` });
  el.querySelector('[data-ok]').onclick = async () => {
    const f = fixed || el.querySelector('[name=f]:checked')?.value;
    const msg = el.querySelector('[name=m]').value.trim();
    if (!f) return toast('Válassz egyet.', true);
    if (chat) { el.close(); return music ? chat.send(null, msg, f) : chat.send(f, msg); }
    const t = el.querySelector('[name=t]:checked')?.value; if (!t) return toast('Válaszd ki, hova küldjük.', true);
    const [kind, id] = t.split(':');
    const data = { uid: uid(), text: msg, createdAt: FB.serverTimestamp() }; data[music ? 'track' : 'film'] = f;
    try {
      await postTo(kind, id, data, S.convs.find(c => c.id === id));
      $$('.modal').forEach(m => m.close ? m.close() : m.remove());
      toast('Elküldve ✓'); location.hash = kind === 'chan' ? '#/c/' + id : '#/dm/' + id;
    } catch (e) { toast(errText(e), true); }
  };
}

/* az admin modul ezeken keresztül éri el az állapotot */
Admin.init({ S, uid, isAdmin, isMod, U, setTitle, renderSide, route });
Browse.init({ S, uid, isAdmin, isMod, U, shareFilm, renderOwnerBar, convUnread });
setInterval(() => S.users.size && renderOnline(), 60e3);
