// HGWS – kezelőfelület: tagok és rangok, tagek, filmek, zenék, csatornák, jóváhagyások, rangok szerkesztése
import { FB, db, $, $$, esc, ROLES, roleOf, PERMS, SYSTEM_ROLES, OWNER_UID, rolesSorted, avatar, toDate, timeLabel, isOnline, ytId, toast, errText, reservedName, RESERVED_MSG } from './core.js?v=202611170008';
import { modal, confirmBox, compress, STAGES } from './ui.js?v=202611170008';
import { githubRepo } from '../firebase-config.js?v=202611170008';

let C = null, current = null;
export function init(ctx) { C = ctx; }
export function refresh() { if (current && C.S.route.view === 'admin') render(current, true); }

/* ---------- élő listák: rangkérelmek és beküldések (jóváhagyásra várók) ---------- */
const Q = { reqs: [], subs: [], started: false };
function startSubs() {
  if (Q.started || !C.S.me || C.S.guest) return;
  Q.started = true;
  const me = C.uid();
  if (C.isOwner()) FB.onSnapshot(FB.query(FB.collection(db, 'roleRequests'), FB.where('status', '==', 'pending')), s => { Q.reqs = s.docs.map(d => ({ id: d.id, ...d.data() })); badge(); refresh(); }, e => console.warn(e));
  else if (C.can('assignRoles')) FB.onSnapshot(FB.query(FB.collection(db, 'roleRequests'), FB.where('by', '==', me)), s => { Q.reqs = s.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.status === 'pending'); refresh(); }, e => console.warn(e));
  if (C.can('publishMedia')) FB.onSnapshot(FB.query(FB.collection(db, 'submissions'), FB.where('status', '==', 'pending')), s => { Q.subs = sortAt(s.docs.map(d => ({ id: d.id, ...d.data() }))); badge(); refresh(); }, e => console.warn(e));
  else if (C.can('submitMedia')) FB.onSnapshot(FB.query(FB.collection(db, 'submissions'), FB.where('by', '==', me)), s => { Q.subs = sortAt(s.docs.map(d => ({ id: d.id, ...d.data() }))); refresh(); }, e => console.warn(e));
}
const sortAt = l => l.sort((a, b) => (toDate(b.at)?.getTime() || 0) - (toDate(a.at)?.getTime() || 0));
const pendingCount = () => (C.isOwner() ? Q.reqs.length : 0) + (C.can('publishMedia') ? Q.subs.filter(s => s.status === 'pending').length : 0);
function badge() { const n = pendingCount(), b = $('#navAdmin'); if (b) b.dataset.badge = n ? String(n) : ''; }
export function watch() { startSubs(); }

export function render(sub, again) {
  current = sub;
  startSubs();
  const v = $('#page');
  const ok = {
    tagok: C.can('moderate') || C.can('assignRoles') || C.isOwner(),
    cimkek: C.can('manageTags'),
    filmek: C.can('publishMedia') || C.can('submitMedia'),
    zene: C.can('publishMedia') || C.can('submitMedia'),
    csatornak: C.can('manageChannels'),
    jovahagyas: C.can('publishMedia') || C.isOwner() || C.can('submitMedia') || C.can('assignRoles'),
    rangok: C.isOwner()
  };
  if (ok[sub]) return ({ tagok: members, cimkek: tagsPage, filmek: films, zene: music, csatornak: channels, jovahagyas: approvals, rangok: rolesPage })[sub](v, again);
  C.setTitle('🔒', 'Nincs jogosultság');
  v.innerHTML = '<div class="full"><div><div class="big">🔒</div><h2>Ehhez nincs jogosultságod</h2></div></div>';
}

function tabList() {
  const n = pendingCount();
  return [['tagok', '🛡️ Tagok és rangok', C.can('moderate') || C.can('assignRoles') || C.isOwner()], ['cimkek', '🏷️ Tagek', C.can('manageTags')],
    ['filmek', '🎞️ Filmek', C.can('publishMedia') || C.can('submitMedia')], ['zene', '🎵 Zenék', C.can('publishMedia') || C.can('submitMedia')],
    ['csatornak', '⚙️ Csatornák', C.can('manageChannels')],
    ['jovahagyas', `✅ Jóváhagyások${n ? ` <span class="cnt">${n}</span>` : ''}`, C.can('publishMedia') || C.isOwner() || C.can('submitMedia') || C.can('assignRoles')],
    ['rangok', '👑 Rangok', C.isOwner()]].filter(x => x[2]);
}
function tabs() {
  return `<div class="atabs" style="margin:.6rem 0 1rem">${tabList().map(([k, l]) => `<a href="#/admin/${k}" class="${current === k ? 'on' : ''}">${l}</a>`).join('')}</div>`;
}
/* a profilmenü kezelési linkjei – csak amihez joga van */
export function menuLinks() { startSubs(); return tabList().map(([k, l]) => `<a href="#/admin/${k}">${l}</a>`).join(''); }
export function firstTab() { return tabList()[0]?.[0] || 'tagok'; }

/* ================= TAGOK ÉS RANGOK ================= */
let mq = '';
function members(v, again) {
  C.setTitle('🛡️', 'Tagok és rangok', C.isOwner() ? 'Rangok kiosztása, moderálás' : 'Moderálás');
  const me = C.uid();
  const list = [...C.S.users.values()].filter(u => !mq || u.name.toLowerCase().includes(mq))
    .sort((a, b) => C.rankOfUser(b) - C.rankOfUser(a) || a.name.localeCompare(b.name, 'hu'));
  const focus = again && document.activeElement?.id === 'aq';
  const reqOf = id => Q.reqs.find(r => r.target === id && r.status === 'pending');
  const reqRoles = rolesSorted().filter(([k, r]) => k !== 'owner' && k !== 'admin' && r.rank < C.myRank());
  v.innerHTML = `<div class="page"><div class="eyebrow">// KEZELÉS</div>${tabs()}<h1 class="gold">Tagok és rangok</h1>
    <p class="lead">${C.isOwner() ? '👑 <b>Tulajként</b> bármilyen rangot közvetlenül kioszthatsz. Az adminok által kért rangokat a <a href="#/admin/jovahagyas">Jóváhagyások</a> fülön fogadhatod el.'
      : C.can('assignRoles') ? 'A rangváltoztatás kérelemként megy a <b>tulajhoz</b>, ő hagyja jóvá. Admint csak a tulaj adhat.' : 'Az alacsonyabb rangú tagokat némíthatod vagy tilthatod ki.'}</p>
    <div class="search" style="margin:1.2rem 0 0;max-width:380px"><input type="search" id="aq" placeholder="Keresés név szerint…" value="${esc(mq)}"></div>
    <div class="atable">${list.map(u => {
      const muted = toDate(u.mutedUntil) > new Date(), self = u.id === me, own = u.id === OWNER_UID, k = C.roleKey(u);
      const lower = C.rankOfUser(u) < C.myRank();
      const canMod = !self && !own && C.can('moderate') && lower;
      const rq = reqOf(u.id);
      let ctl;
      if (own || self || !lower) ctl = C.roleBadge(u) || '<span class="tg">TAG</span>';
      else if (C.isOwner()) ctl = `<select data-role="${esc(u.id)}">${rolesSorted().filter(([x]) => x !== 'owner').map(([x, r]) => `<option value="${x}" ${k === x ? 'selected' : ''}>${esc(r.label)}</option>`).join('')}</select>`;
      else if (C.can('assignRoles')) ctl = rq ? `<span class="tg b" title="A tulaj jóváhagyására vár">⏳ KÉRVE: ${esc(roleOf(rq.role).label.toUpperCase())}</span><button class="btn plain sm" data-unreq="${esc(rq.id)}">Visszavonás</button>`
        : `<select data-req="${esc(u.id)}"><option value="${k}" selected>${esc(roleOf(k).label)}</option>${reqRoles.filter(([x]) => x !== k).map(([x, r]) => `<option value="${x}">→ ${esc(r.label)}</option>`).join('')}</select>`;
      else ctl = C.roleBadge(u) || '<span class="tg">TAG</span>';
      return `<div class="arow"><span class="avw">${avatar(u, 42)}<i class="on${isOnline(u) ? ' y' : ''}" style="border-color:#0d1830"></i></span>
        <div class="who"><b data-u="${esc(u.id)}" style="cursor:pointer;color:${k !== 'user' ? roleOf(k).color : 'inherit'}">${esc(u.name)}</b>${self ? ' <span class="hint">(te)</span>' : ''}
          <small>${u.createdAt ? 'Tag ' + toDate(u.createdAt).toLocaleDateString('hu-HU') + ' óta' : ''}${u.lastSeen ? ' · ' + (isOnline(u) ? '🟢 online' : 'utoljára ' + timeLabel(u.lastSeen)) : ''}</small>
          <div>${C.tagPills(u, 6)}${u.banned ? '<span class="tg red">⛔ KITILTVA</span>' : ''}${muted ? `<span class="tg red">🔇 NÉMÍTVA ${esc(timeLabel(u.mutedUntil))}-IG</span>` : ''}</div></div>
        <div class="ac">${ctl}
          ${C.can('manageTags') && (!own || C.isOwner()) ? `<button class="btn plain sm" data-tagu="${esc(u.id)}">🏷️ Tagek</button>` : ''}
          ${canMod ? `<button class="btn plain sm" data-mod="${esc(u.id)}">🛡️ Moderálás</button>` : ''}
        </div></div>`;
    }).join('')}</div></div>`;
  const q = $('#aq'); q.oninput = () => { mq = q.value.toLowerCase(); members(v, true); };
  if (focus) { const n = $('#aq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
  // tulaj: közvetlen rangállítás
  $$('[data-role]', v).forEach(s => s.onchange = async () => {
    const u = C.U(s.dataset.role), r = s.value, prev = C.roleKey(u);
    if (r === 'admin' && !await confirmBox(`${u.name} ADMIN lesz: filmeket, zenéket, csatornákat kezel és rangokat kérhet. Biztos?`, 'Admin lesz', false)) { s.value = prev; return; }
    if (r !== 'admin' && !await confirmBox(`${u.name} rangja: ${roleOf(r).label}?`, 'Mentés', false)) { s.value = prev; return; }
    try { await FB.updateDoc(FB.doc(db, 'users', u.id), { role: r }); toast('Rang frissítve ✓'); } catch (e) { toast(errText(e), true); s.value = prev; }
  });
  // admin: rangkérelem a tulajnak
  $$('[data-req]', v).forEach(s => s.onchange = async () => {
    const u = C.U(s.dataset.req), r = s.value, prev = C.roleKey(u);
    if (r === prev) return;
    if (!await confirmBox(`Kérelmezed, hogy ${u.name} rangja ${roleOf(r).label} legyen? A tulaj hagyja jóvá.`, 'Kérelem küldése', false)) { s.value = prev; return; }
    try { await FB.addDoc(FB.collection(db, 'roleRequests'), { target: u.id, role: r, prev, by: C.uid(), at: FB.serverTimestamp(), status: 'pending' }); toast('Kérelem elküldve a tulajnak ✓'); }
    catch (e) { toast(errText(e), true); s.value = prev; }
  });
  $$('[data-unreq]', v).forEach(b => b.onclick = async () => { try { await FB.deleteDoc(FB.doc(db, 'roleRequests', b.dataset.unreq)); toast('Kérelem visszavonva'); } catch (e) { toast(errText(e), true); } });
  $$('[data-mod]', v).forEach(b => b.onclick = () => modModal(b.dataset.mod));
  $$('[data-tagu]', v).forEach(b => b.onclick = () => tagAssign(b.dataset.tagu));
}

/* ================= TAGEK (Discord-rangszerű címkék) ================= */
/* HGWS alap tagek – egy kattintással létrehozhatók a Tagek oldalon */
export const TAG_PRESETS = [
  ['Alapító tag', '#e8b656'], ['Locsoló Isten', '#ffd24a'], ['Arany Locsolófej', '#f0a92b'], ['Vízágyús', '#ff7a6e'],
  ['Nyomásmester', '#6cc6ff'], ['Csepp Futó', '#4dd6c7'], ['Szivattyúkirály', '#4f8dff'], ['PLC-varázsló', '#5ee08a'],
  ['Esőcsináló', '#8fb8ff'], ['Kertész', '#7ccf5a'], ['Szikkadt Szilárd-fan', '#c98b5a'], ['Filmkritikus', '#ff8fc7'],
  ['Premier-vadász', '#c79bff'], ['Isekai-hős', '#a97bff'], ['Arcade-bajnok', '#ffa94d'], ['Zenebona', '#ff5fa2'],
  ['Béta-tesztelő', '#b6e35a'], ['Hibavadász', '#ff5a4d'], ['Ötletgyár', '#ffe08a'], ['Csőtörés-túlélő', '#9aa3ad']
];
export const TAG_COLORS = ['#e8b656', '#ff5a4d', '#ff8fc7', '#c79bff', '#6c8cff', '#6cc6ff', '#4dd6c7', '#5ee08a', '#b6e35a', '#ffa94d', '#c9c3b5', '#8f8a7e'];
const tagPill = t => `<span class="utag lg" style="--tc:${esc(t.color)}">${esc(t.name || 'Tag')}</span>`;
function tagsPage(v) {
  C.setTitle('🏷️', 'Tagek', 'Egyedi rangok: szöveg + szín');
  const tags = C.S.tags, count = id => [...C.S.users.values()].filter(u => (u.tags || []).includes(id)).length;
  v.innerHTML = `<div class="page"><div class="eyebrow">// KEZELÉS</div>${tabs()}<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap">
    <div><h1 class="gold">Tagek</h1><p class="lead">Discord-rangszerű címkék. A moderátorok és adminok hozhatnak létre és oszthatnak ki ilyeneket – a tag neve mellett jelenik meg a csevegésben, a hozzászólásoknál és a profilján.</p></div>
    <div style="display:flex;gap:.5rem;flex-wrap:wrap">${TAG_PRESETS.some(([n]) => !tags.some(t => t.name === n)) ? '<button class="btn plain" id="presetTags">✨ HGWS ALAP TAGEK</button>' : ''}<button class="btn goldb" id="newTag">＋ ÚJ TAG</button></div></div>
    <div class="atable" style="margin-top:1.2rem">${tags.length ? tags.map(t => `<div class="arow"><span style="width:14px;height:14px;border-radius:50%;background:${esc(t.color)};box-shadow:0 0 10px ${esc(t.color)}"></span>
      <div class="who">${tagPill(t)}<small>${count(t.id)} tagnál</small></div>
      <div class="ac"><button class="btn plain sm" data-tedit="${esc(t.id)}">✏️ Szerkesztés</button><button class="btn danger sm" data-tdel="${esc(t.id)}">Törlés</button></div></div>`).join('')
      : '<div class="empty">Még nincs egy tag sem. Hozd létre az elsőt az „Új tag” gombbal!</div>'}</div></div>`;
  $('#newTag').onclick = () => tagModal();
  const pt = $('#presetTags'); if (pt) pt.onclick = async () => {
    const miss = TAG_PRESETS.filter(([n]) => !tags.some(t => t.name === n));
    if (!await confirmBox(`Létrehozod a(z) ${miss.length} HGWS alap taget?`, 'Létrehozás', false)) return;
    pt.disabled = true;
    try {
      const bt = FB.writeBatch(db), t0 = Date.now();
      miss.forEach(([name, color], i) => bt.set(FB.doc(FB.collection(db, 'tags')), { name, color, order: t0 + i, createdAt: FB.serverTimestamp() }));
      await bt.commit(); toast(`${miss.length} tag létrehozva ✓`);
    } catch (e) { toast(errText(e), true); pt.disabled = false; }
  };
  $$('[data-tedit]', v).forEach(b => b.onclick = () => tagModal(tags.find(t => t.id === b.dataset.tedit)));
  $$('[data-tdel]', v).forEach(b => b.onclick = async () => {
    const t = tags.find(x => x.id === b.dataset.tdel), n = count(t.id);
    if (!await confirmBox(`Törlöd a(z) „${t.name}” taget?${n ? ` ${n} tagról is lekerül.` : ''}`, 'Törlés')) return;
    try {
      const bt = FB.writeBatch(db);
      [...C.S.users.values()].filter(u => (u.tags || []).includes(t.id)).forEach(u => bt.update(FB.doc(db, 'users', u.id), { tags: FB.arrayRemove(t.id) }));
      bt.delete(FB.doc(db, 'tags', t.id)); await bt.commit(); toast('Tag törölve');
    } catch (e) { toast(errText(e), true); }
  });
}
export function tagModal(t) {
  let color = t?.color || TAG_COLORS[Math.floor(Math.random() * 8)];
  const el = modal({ title: t ? 'Tag szerkesztése' : 'Új tag', body: `
    <div class="field"><label>Név <em>(max. 24 karakter)</em></label><input class="inp" name="n" maxlength="24" value="${esc(t?.name || '')}" placeholder="pl. Locsolómester, VIP, Tesztelő"></div>
    <div class="field"><label>Szín</label><div class="swatches">${TAG_COLORS.map(c => `<button type="button" data-c="${c}" class="${c === color ? 'on' : ''}" style="background:${c}"></button>`).join('')}
      <label class="cpick" title="Egyéni szín"><input type="color" value="${esc(color)}">🎨</label></div></div>
    <div class="field"><label>Előnézet</label><div class="tprev"><b>Locsoló Laci</b> <span data-prev></span></div></div>`,
    foot: `<button class="btn plain" data-x>Mégse</button><button class="btn goldb" data-save>${t ? 'Mentés' : 'Létrehozás'}</button>` });
  const n = el.querySelector('[name=n]'), pick = el.querySelector('input[type=color]');
  const prev = () => { el.querySelector('[data-prev]').innerHTML = tagPill({ name: n.value.trim() || 'Tag neve', color }); };
  el.querySelector('.swatches').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; color = b.dataset.c; pick.value = color; $$('.swatches [data-c]', el).forEach(x => x.classList.toggle('on', x === b)); prev(); };
  pick.oninput = () => { color = pick.value; $$('.swatches [data-c]', el).forEach(x => x.classList.remove('on')); prev(); };
  n.oninput = prev; prev(); setTimeout(() => n.focus(), 50);
  el.querySelector('[data-save]').onclick = async () => {
    const name = n.value.trim();
    if (!name) return toast('Adj nevet a tagnek.', true);
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return toast('Érvénytelen szín.', true);
    try {
      if (t) await FB.updateDoc(FB.doc(db, 'tags', t.id), { name, color });
      else await FB.addDoc(FB.collection(db, 'tags'), { name, color, order: Date.now(), createdAt: FB.serverTimestamp() });
      toast(t ? 'Tag mentve ✓' : 'Tag létrehozva ✓'); el.close();
    } catch (e) { toast(errText(e), true); }
  };
}
/* tagek kiosztása egy felhasználónak */
export function tagAssign(id) {
  const u = C.U(id), tags = C.S.tags;
  const has = new Set(u.tags || []);
  const el = modal({ title: 'Tagek – ' + u.name, body: tags.length ? `<p class="hint" style="margin-bottom:.8rem">Kattints a tagekre a ki- és bekapcsoláshoz (max. 10).</p>
    <div class="tagpick">${tags.map(t => `<button type="button" class="${has.has(t.id) ? 'on' : ''}" data-t="${esc(t.id)}" style="--tc:${esc(t.color)}"><i></i>${esc(t.name)}</button>`).join('')}</div>`
    : `<div class="empty">Még nincs egy tag sem.</div>`,
    foot: `<a class="btn plain l" href="#/admin/cimkek">🏷️ Tagek kezelése</a><button class="btn plain" data-x>Mégse</button>${tags.length ? '<button class="btn goldb" data-save>Mentés</button>' : ''}` });
  el.querySelector('.tagpick')?.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return;
    if (!b.classList.contains('on') && $$('.tagpick .on', el).length >= 10) return toast('Legfeljebb 10 tag lehet egy tagon.', true);
    b.classList.toggle('on'); });
  el.querySelector('[data-save]')?.addEventListener('click', async () => {
    const ids = $$('.tagpick .on', el).map(b => b.dataset.t);
    try { await FB.updateDoc(FB.doc(db, 'users', id), { tags: ids }); toast('Tagek mentve ✓'); el.close(); } catch (e) { toast(errText(e), true); }
  });
  el.querySelector('a[href="#/admin/cimkek"]')?.addEventListener('click', () => el.close());
}

export function modModal(id) {
  const u = C.U(id), muted = toDate(u.mutedUntil) > new Date();
  const el = modal({ title: 'Moderálás – ' + u.name, body: `
    <div style="display:flex;align-items:center;gap:.9rem">${avatar(u, 52)}<div><b style="font-size:1.05rem">${esc(u.name)}</b><div class="hint">${esc(roleOf(C.roleKey(u)).label)}${u.banned ? ' · ⛔ kitiltva' : ''}${muted ? ' · 🔇 némítva ' + timeLabel(u.mutedUntil) + '-ig' : ''}</div></div></div>
    ${C.can('moderate') ? `<div class="field"><label>Megjelenített név</label><div style="display:flex;gap:.5rem;flex-wrap:wrap"><input class="inp" name="nm" maxlength="32" value="${esc(u.name)}" style="flex:1;min-width:180px"><button class="btn plain sm" data-rn>Mentés</button><button class="btn danger sm" data-rst title="A nevet egy semleges „Tag-…” névre cseréli">Név törlése</button></div></div>` : ''}
    <div class="field"><label>Némítás <em>(nem írhat sehova, de olvashat)</em></label><div style="display:flex;gap:.4rem;flex-wrap:wrap">
      ${[['10 perc', 10], ['1 óra', 60], ['1 nap', 1440], ['1 hét', 10080]].map(([l, m]) => `<button class="btn plain sm" data-mute="${m}">${l}</button>`).join('')}
      ${muted ? '<button class="btn primary sm" data-mute="0">Némítás feloldása</button>' : ''}</div></div>
    <div class="field"><label>Kitiltás <em>(semmit nem lát a közösségből)</em></label><div>
      ${u.banned ? '<button class="btn primary sm" data-ban="0">Kitiltás feloldása</button>' : '<button class="btn danger sm" data-ban="1">⛔ Kitiltás</button>'}</div></div>`,
    foot: '<button class="btn plain" data-x>Bezárás</button>' });
  const ref = FB.doc(db, 'users', id);
  const setName = async name => {
    name = name.trim();
    if (name.length < 2) return toast('A név legalább 2 karakter legyen.', true);
    if (reservedName(name) && C.S.owner?.uid !== id) return toast(RESERVED_MSG, true);
    try { await FB.updateDoc(ref, { name, nameLower: name.toLowerCase() }); toast('Név módosítva ✓'); el.close(); } catch (e) { toast(errText(e), true); }
  };
  const rn = el.querySelector('[data-rn]'); if (rn) rn.onclick = () => setName(el.querySelector('[name=nm]').value);
  const rst = el.querySelector('[data-rst]'); if (rst) rst.onclick = () => setName('Tag-' + id.slice(0, 5));
  $$('[data-mute]', el).forEach(b => b.onclick = async () => {
    const m = +b.dataset.mute;
    try { await FB.updateDoc(ref, { mutedUntil: m ? FB.Timestamp.fromDate(new Date(Date.now() + m * 60e3)) : null }); toast(m ? 'Némítva 🔇' : 'Némítás feloldva'); el.close(); } catch (e) { toast(errText(e), true); }
  });
  $$('[data-ban]', el).forEach(b => b.onclick = async () => {
    const on = b.dataset.ban === '1';
    if (on && !await confirmBox(`Kitiltod ${u.name} felhasználót a közösségből?`, 'Kitiltás')) return;
    try { await FB.updateDoc(ref, { banned: on }); toast(on ? 'Kitiltva ⛔' : 'Kitiltás feloldva'); el.close(); } catch (e) { toast(errText(e), true); }
  });
}

/* ================= CSATORNÁK ================= */
export async function defaultChannels() {
  const b = FB.writeBatch(db), t = FB.serverTimestamp();
  [['bejelentesek', 'bejelentések', 'Információ', 'announce', 'Hírek, premierek, fontos dolgok a HGWS-től.'],
   ['altalanos', 'általános', 'Beszélgetés', 'text', 'Itt mindenről lehet dumálni.'],
   ['filmek', 'filmek', 'Beszélgetés', 'text', 'Oszd meg és beszéljétek meg a HGWS filmeket! 🎬'],
   ['off-topic', 'off-topic', 'Beszélgetés', 'text', 'Minden más.']]
    .forEach(([id, name, category, type, topic], i) => b.set(FB.doc(db, 'channels', id), { name, category, type, topic, order: i * 10, createdAt: t }));
  await b.commit();
}

function channels(v) {
  C.setTitle('⚙️', 'Csatornák kezelése');
  const list = C.S.channels;
  v.innerHTML = `<div class="page"><div class="eyebrow">// KEZELÉS</div>${tabs()}<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap"><div><h1 class="gold">Csatornák</h1>
    <p class="lead">A „Bejelentés” típusú csatornára csak adminok és moderátorok írhatnak.</p></div><button class="btn goldb" id="nc">+ ÚJ CSATORNA</button></div>
    ${list.length ? `<div class="atable">${list.map((c, i) => `<div class="arow"><div class="ord"><button data-up="${i}" ${i ? '' : 'disabled'}>▲</button><button data-dn="${i}" ${i < list.length - 1 ? '' : 'disabled'}>▼</button></div>
      <div class="who"><b>${c.type === 'announce' ? '📢' : '#'} ${esc(c.name)}</b><small>${esc(c.category || '')}${c.topic ? ' · ' + esc(c.topic) : ''}</small></div>
      <div class="ac"><button class="btn plain sm" data-ed="${esc(c.id)}">Szerkesztés</button></div></div>`).join('')}</div>`
    : `<div class="empty"><div class="big">#</div>Még nincs csatorna.<br><button class="btn primary" id="def">ALAP CSATORNÁK LÉTREHOZÁSA</button></div>`}</div>`;
  $('#nc').onclick = () => channelModal();
  const d = $('#def'); if (d) d.onclick = () => defaultChannels().then(() => toast('Kész ✓')).catch(e => toast(errText(e), true));
  $$('[data-ed]', v).forEach(b => b.onclick = () => channelModal(list.find(c => c.id === b.dataset.ed)));
  $$('[data-up],[data-dn]', v).forEach(b => b.onclick = () => reorder('channels', list, +(b.dataset.up ?? b.dataset.dn), b.dataset.up != null ? -1 : 1));
}

async function reorder(col, list, i, dir) {
  const arr = [...list], j = i + dir; [arr[i], arr[j]] = [arr[j], arr[i]];
  const b = FB.writeBatch(db); arr.forEach((x, k) => { if (x.order !== k * 10) b.update(FB.doc(db, col, x.id), { order: k * 10 }); });
  try { await b.commit(); } catch (e) { toast(errText(e), true); }
}

export function channelModal(c) {
  const cats = [...new Set(C.S.channels.map(x => x.category).filter(Boolean))];
  const el = modal({ title: c ? 'Csatorna szerkesztése' : 'Új csatorna', body: `
    <div class="field"><label>Név</label><input class="inp" name="name" maxlength="40" value="${esc(c?.name || '')}" placeholder="pl. mémek"></div>
    <div class="field"><label>Téma <em>(a fejlécben látszik)</em></label><input class="inp" name="topic" maxlength="200" value="${esc(c?.topic || '')}"></div>
    <div class="grid2"><div class="field"><label>Kategória</label><input class="inp" name="cat" list="cats" maxlength="40" value="${esc(c?.category || 'Beszélgetés')}"><datalist id="cats">${cats.map(x => `<option>${esc(x)}</option>`).join('')}</datalist></div>
    <div class="field"><label>Típus</label><select class="inp" name="type"><option value="text">💬 Szöveges – mindenki írhat</option><option value="announce" ${c?.type === 'announce' ? 'selected' : ''}>📢 Bejelentés – csak admin/moderátor</option></select></div></div>`,
    foot: `${c ? '<button class="btn danger l" data-del>Törlés</button>' : ''}<button class="btn plain" data-x>Mégse</button><button class="btn goldb" data-ok>Mentés</button>` });
  el.querySelector('[data-ok]').onclick = async () => {
    const name = el.querySelector('[name=name]').value.trim().toLowerCase().replace(/\s+/g, '-');
    if (!name) return toast('Adj nevet a csatornának.', true);
    const data = { name, topic: el.querySelector('[name=topic]').value.trim(), category: el.querySelector('[name=cat]').value.trim() || 'Beszélgetés', type: el.querySelector('[name=type]').value };
    try {
      if (c) await FB.updateDoc(FB.doc(db, 'channels', c.id), data);
      else { const ref = FB.doc(FB.collection(db, 'channels')); await FB.setDoc(ref, { ...data, order: (Math.max(0, ...C.S.channels.map(x => x.order || 0)) + 10), createdAt: FB.serverTimestamp() }); location.hash = '#/c/' + ref.id; }
      toast('Mentve ✓'); el.close();
    } catch (e) { toast(errText(e), true); }
  };
  const d = el.querySelector('[data-del]'); if (d) d.onclick = async () => {
    if (!await confirmBox(`Törlöd a #${c.name} csatornát? (A régi üzenetek nem fognak látszani.)`, 'Törlés')) return;
    try { await FB.deleteDoc(FB.doc(db, 'channels', c.id)); toast('Törölve'); el.close(); if (location.hash === '#/c/' + c.id) location.hash = '#/'; } catch (e) { toast(errText(e), true); }
  };
}

/* ================= FILMEK ================= */
function films(v) {
  C.setTitle('🎞️', 'Filmek kezelése', 'Ami itt szerepel, az látszik a filmtárban és a főoldalon');
  const list = C.S.videos, pub = C.can('publishMedia');
  v.innerHTML = `<div class="page"><div class="eyebrow">// KEZELÉS</div>${tabs()}<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap"><div><h1 class="gold">Filmek</h1>
    <p class="lead">${pub ? 'A YouTube-linket a „Megjelent” bepipálása után mindenki látja, aki be van lépve. A főoldal csak a címet, a posztert és az állapotot mutatja.' : '✏️ <b>Szerkesztőként</b> az új filmek és a módosítások <b>jóváhagyásra</b> kerülnek egy adminhoz – csak utána jelennek meg.'}</p></div><button class="btn goldb" id="nf">+ ${pub ? 'ÚJ FILM' : 'FILM BEKÜLDÉSE'}</button></div>
    ${pub ? '' : mySubs('film')}
    ${list.length ? `<div class="atable">${list.map((x, i) => `<div class="arow" style="grid-template-columns:auto auto 1fr auto"><div class="ord">${pub ? `<button data-up="${i}" ${i ? '' : 'disabled'}>▲</button><button data-dn="${i}" ${i < list.length - 1 ? '' : 'disabled'}>▼</button>` : ''}</div>
      <div class="fthumb">${x.poster ? `<img src="${esc(x.poster)}" alt="" loading="lazy">` : ''}</div>
      <div class="who"><b>${esc(x.title)}</b><small>${esc([x.kind, x.year, x.genre].filter(Boolean).join(' · '))}</small>
        <div>${x.featured ? '<span class="tg g">★ KIEMELT</span>' : ''}${x.soon === false ? '<span class="tg ok">MEGJELENT</span>' : `<span class="tg b">${esc((x.status || STAGES[x.stage ?? 0]).toUpperCase())}</span>`}${x.hasVideo ? '<span class="tg">▶ VIDEÓ</span>' : ''}${x.visible === false ? '<span class="tg">REJTETT</span>' : ''}</div></div>
      <div class="ac"><button class="btn plain sm" data-ed="${esc(x.id)}">Szerkesztés</button></div></div>`).join('')}</div>`
    : `<div class="empty"><div class="big">🎬</div>Még nincs film.${pub ? '<br><button class="btn primary" id="imp">A KORÁBBI FŐOLDALI CÍMEK ÁTHOZÁSA</button>' : ''}</div>`}</div>`;
  $('#nf').onclick = () => filmModal();
  const imp = $('#imp'); if (imp) imp.onclick = () => importFilms(imp);
  $$('[data-ed]', v).forEach(b => b.onclick = () => filmModal(list.find(x => x.id === b.dataset.ed)));
  $$('[data-up],[data-dn]', v).forEach(b => b.onclick = () => reorder('videos', list, +(b.dataset.up ?? b.dataset.dn), b.dataset.up != null ? -1 : 1));
}

const slug = s => (s || 'film').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'film';

async function filmModal(f) {
  let src = {};
  if (f) { try { src = (await FB.getDoc(FB.doc(db, 'videoSources', f.id))).data() || {}; } catch (_) {} }
  const d = f || { kind: 'Film', year: String(new Date().getFullYear()), soon: true, stage: 0, visible: true };
  let stage = d.stage ?? 0; const imgs = { poster: d.poster || '', banner: d.banner || '' };
  const el = modal({ title: f ? 'Film szerkesztése' : 'Új film', cls: 'wide', body: `
    <div class="grid2"><div class="field"><label>Cím *</label><input class="inp" name="title" maxlength="140" value="${esc(d.title || '')}"></div>
      <div class="field"><label>Alcím <em>(pl. angol cím)</em></label><input class="inp" name="en" maxlength="160" value="${esc(d.en || '')}"></div></div>
    <div class="grid2"><div class="field"><label>Típus</label><input class="inp" name="kind" list="kinds" value="${esc(d.kind || '')}"><datalist id="kinds"><option>Film</option><option>Anime</option><option>Sorozat</option><option>Trailer</option><option>Kisfilm</option><option>Játék</option></datalist></div>
      <div class="field"><label>Év · Hossz</label><div style="display:flex;gap:.5rem"><input class="inp" name="year" maxlength="10" value="${esc(d.year || '')}" placeholder="2026"><input class="inp" name="len" maxlength="30" value="${esc(d.len || '')}" placeholder="6 perc"></div></div></div>
    <div class="grid2"><div class="field"><label>Műfaj</label><input class="inp" name="genre" maxlength="80" value="${esc(d.genre || '')}" placeholder="Akció · Vígjáték"></div>
      <div class="field"><label>Premier dátuma <em>(nem kötelező)</em></label><input class="inp" type="date" name="premiere" value="${esc(d.premiere || '')}"></div></div>
    <div class="field"><label>Leírás</label><textarea class="inp" name="desc" rows="4" maxlength="1500">${esc(d.desc || '')}</textarea></div>
    <div class="field"><label>YouTube link <em>(a lejátszó a saját HGWS-felülettel játssza le)</em></label><input class="inp" name="yt" value="${esc(src.youtube ? 'https://youtu.be/' + src.youtube : '')}" placeholder="https://youtu.be/…  vagy  https://www.youtube.com/watch?v=…"><span class="hint" id="ytok"></span></div>
    <div class="field"><label>…vagy MP4 videó URL</label><input class="inp" name="mp4" value="${esc(src.mp4 || '')}" placeholder="videok/film.mp4"></div>
    <div class="field"><label>Gyártási fázis</label><div class="stagepick" id="sp"></div></div>
    <div class="grid2"><div class="field"><label>Állapot felirat</label><input class="inp" name="status" maxlength="40" value="${esc(d.status || STAGES[stage].toUpperCase())}"></div><div></div></div>
    <div class="checks"><label class="chk"><input type="checkbox" name="rel" ${d.soon === false ? 'checked' : ''}> Megjelent – megnézhető</label>
      <label class="chk"><input type="checkbox" name="feat" ${d.featured ? 'checked' : ''}> Kiemelt (nagy kártya a főoldalon)</label>
      <label class="chk"><input type="checkbox" name="vis" ${d.visible !== false ? 'checked' : ''}> Látható</label></div>
    ${['poster', 'banner'].map(k => `<div class="field"><label>${k === 'poster' ? 'Poszter <em>(16:9)</em>' : 'Kiemelt háttérkép <em>(ha üres, a poszter)</em>'}</label><div class="imgp" data-img="${k}"><div class="prev">nincs kép</div>
      <div class="c"><div class="r"><label class="btn plain sm">Kép feltöltése<input type="file" accept="image/*" hidden></label><button type="button" class="btn danger sm" data-clr>Törlés</button></div>
      <input class="inp" type="url" data-url placeholder="…vagy kép URL-je"><span class="hint" data-info></span></div></div></div>`).join('')}`,
    foot: `${f ? '<button class="btn danger l" data-del>Törlés</button>' : ''}<button class="btn plain" data-x>Mégse</button><button class="btn goldb" data-ok>Mentés</button>` });
  const q = n => el.querySelector(`[name=${n}]`);
  const paint = () => { el.querySelector('#sp').innerHTML = STAGES.map((s, i) => `<button type="button" data-st="${i}" class="${i < stage ? 'done' : i === stage ? 'now' : ''}">${i < stage ? '✓ ' : i === stage ? '● ' : ''}${s.toUpperCase()}</button>`).join(''); };
  paint();
  el.querySelector('#sp').onclick = e => { const b = e.target.closest('[data-st]'); if (!b) return; const prev = STAGES[stage].toUpperCase(); stage = +b.dataset.st; paint(); if (!q('status').value || q('status').value === prev) q('status').value = STAGES[stage].toUpperCase(); };
  const ytChk = () => { const v = q('yt').value.trim(), id = ytId(v); el.querySelector('#ytok').textContent = !v ? '' : id ? '✅ YouTube videó: ' + id : '⚠️ Ez nem tűnik YouTube-linknek'; };
  q('yt').oninput = ytChk; ytChk();
  const setImg = (k, s) => { imgs[k] = s || ''; const b = el.querySelector(`[data-img=${k}]`), p = b.querySelector('.prev');
    p.style.backgroundImage = s ? `url("${s.replace(/"/g, '%22')}")` : ''; p.textContent = s ? '' : 'nincs kép';
    b.querySelector('[data-url]').value = s && !s.startsWith('data:') ? s : '';
    b.querySelector('[data-info]').textContent = s && s.startsWith('data:') ? `Feltöltött kép · ${Math.round(s.length * .75 / 1024)} KB` : ''; };
  ['poster', 'banner'].forEach(k => { setImg(k, imgs[k]); const b = el.querySelector(`[data-img=${k}]`);
    b.querySelector('input[type=file]').onchange = async e => { const fl = e.target.files[0]; e.target.value = ''; if (!fl) return; try { setImg(k, await compress(fl, k === 'banner' ? 1920 : 1280)); } catch (_) { toast('A képet nem sikerült beolvasni.', true); } };
    b.querySelector('[data-url]').onchange = e => setImg(k, e.target.value.trim());
    b.querySelector('[data-clr]').onclick = () => setImg(k, ''); });
  el.querySelector('[data-ok]').onclick = async () => {
    const title = q('title').value.trim(); if (!title) return toast('Add meg a címet.', true);
    const ytRaw = q('yt').value.trim(), yt = ytId(ytRaw);
    if (ytRaw && !yt) return toast('A YouTube-link nem érvényes.', true);
    const mp4 = q('mp4').value.trim();
    const data = { title, en: q('en').value.trim(), kind: q('kind').value.trim() || 'Film', year: q('year').value.trim(), len: q('len').value.trim(),
      genre: q('genre').value.trim(), premiere: q('premiere').value, desc: q('desc').value.trim(), status: q('status').value.trim().toUpperCase(), stage,
      soon: !q('rel').checked, featured: q('feat').checked, visible: q('vis').checked, hasVideo: !!(yt || mp4), poster: imgs.poster, banner: imgs.banner, updatedAt: FB.serverTimestamp() };
    const id = f ? f.id : (() => { let b = slug(title), s = b, n = 2; while (C.S.videos.some(x => x.id === s)) s = b + '-' + n++; return s; })();
    if (!C.can('publishMedia')) {
      const { updatedAt, ...clean } = data;
      try { await submit({ type: 'film', action: f ? 'update' : 'create', targetId: id, title, data: clean, src: { youtube: yt, mp4 } }); el.close(); } catch (e) { toast(errText(e), true); }
      return;
    }
    if (!f) { data.order = Math.max(-10, ...C.S.videos.map(x => x.order || 0)) + 10; data.createdAt = FB.serverTimestamp(); }
    try {
      const b = FB.writeBatch(db);
      b.set(FB.doc(db, 'videos', id), data, { merge: true });
      b.set(FB.doc(db, 'videoSources', id), { youtube: yt, mp4 });
      if (data.featured) C.S.videos.filter(x => x.featured && x.id !== id).forEach(x => b.update(FB.doc(db, 'videos', x.id), { featured: false }));
      await b.commit(); toast('Mentve ✓'); el.close();
    } catch (e) { toast(errText(e), true); }
  };
  const del = el.querySelector('[data-del]'); if (del) del.onclick = async () => {
    if (!await confirmBox(`Törlöd: „${f.title}”?${C.can('publishMedia') ? '' : ' (Jóváhagyásra megy egy adminhoz.)'}`, 'Törlés')) return;
    if (!C.can('publishMedia')) { try { await submit({ type: 'film', action: 'delete', targetId: f.id, title: f.title, data: {}, src: {} }); el.close(); } catch (e) { toast(errText(e), true); } return; }
    try { const b = FB.writeBatch(db); b.delete(FB.doc(db, 'videos', f.id)); b.delete(FB.doc(db, 'videoSources', f.id)); await b.commit(); toast('Törölve'); el.close(); } catch (e) { toast(errText(e), true); }
  };
}

async function importFilms(btn) {
  btn.disabled = true;
  try {
    const seed = await (await fetch('./seed-films.json', { cache: 'no-store' })).json();
    const list = seed.films || [], banner = seed.banner || '';
    if (!list.length) throw new Error('Nincs áthozható cím.');
    const b = FB.writeBatch(db), t = FB.serverTimestamp();
    list.forEach((x, i) => {
      const id = x.id || slug(x.title);
      b.set(FB.doc(db, 'videos', id), { title: x.title || '', en: x.en || '', kind: x.kind || 'Film', year: x.year || '', len: x.len || '', genre: x.genre || '',
        premiere: '', desc: x.desc || '', status: x.status || '', stage: x.stage ?? 0, order: i * 10, soon: x.soon !== false, featured: i === 0, visible: true,
        hasVideo: !!(x.youtube || x.mp4), poster: x.poster || '', banner: i === 0 ? banner : '', createdAt: t, updatedAt: t });
      b.set(FB.doc(db, 'videoSources', id), { youtube: x.youtube || '', mp4: x.mp4 || '' });
    });
    await b.commit(); toast(`${list.length} cím áthozva ✓`);
  } catch (e) { toast(errText(e), true); btn.disabled = false; }
}

/* ================= ZENÉK ================= */
function music(v) {
  C.setTitle('🎵', 'Zenék kezelése');
  const list = C.S.music, pub = C.can('publishMedia');
  v.innerHTML = `<div class="page"><div class="eyebrow">// KEZELÉS</div>${tabs()}<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap"><div><h1 class="gold">Zenék</h1>
    <p class="lead">1. Töltsd fel az mp3-at a GitHubon a <b>zene</b> mappába (<a href="https://github.com/${githubRepo}/upload/main/zene" target="_blank" rel="noopener">feltöltés itt ↗</a> – behúzod, majd „Commit changes”).<br>2. Pár perc múlva itt az „Új zene” gombnál kiválaszthatod.</p></div><button class="btn goldb" id="nm">+ ${pub ? 'ÚJ ZENE' : 'ZENE BEKÜLDÉSE'}</button></div>
    ${pub ? '' : mySubs('music')}
    ${list.length ? `<div class="atable">${list.map((t, i) => `<div class="arow" style="grid-template-columns:auto auto 1fr auto"><div class="ord">${pub ? `<button data-up="${i}" ${i ? '' : 'disabled'}>▲</button><button data-dn="${i}" ${i < list.length - 1 ? '' : 'disabled'}>▼</button>` : ''}</div>
      <span class="pc" style="width:52px;height:52px;${t.cover ? `background-image:url('${esc(t.cover)}')` : ''}"></span>
      <div class="who"><b>${esc(t.title)}</b><small>${esc(t.artist || 'HGWS')} · ${esc(t.src)}</small>${t.visible === false ? '<div><span class="tg">REJTETT</span></div>' : ''}</div>
      <div class="ac"><button class="btn plain sm" data-ed="${esc(t.id)}">Szerkesztés</button></div></div>`).join('')}</div>`
    : '<div class="empty"><div class="big">🎵</div>Még nincs zene.</div>'}</div>`;
  $('#nm').onclick = () => musicModal();
  $$('[data-ed]', v).forEach(b => b.onclick = () => musicModal(list.find(x => x.id === b.dataset.ed)));
  $$('[data-up],[data-dn]', v).forEach(b => b.onclick = () => reorder('music', list, +(b.dataset.up ?? b.dataset.dn), b.dataset.up != null ? -1 : 1));
}

async function repoFiles() {
  try {
    const r = await fetch(`https://api.github.com/repos/${githubRepo}/contents/zene`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) return [];
    return (await r.json()).filter(f => f.type === 'file' && /\.(mp3|m4a|aac|ogg|oga|wav|flac|webm|opus)$/i.test(f.name)).map(f => f.path);
  } catch (_) { return []; }
}

async function musicModal(t) {
  const d = t || { visible: true };
  let cover = d.cover || '';
  const el = modal({ title: t ? 'Zene szerkesztése' : 'Új zene', body: `
    <div class="grid2"><div class="field"><label>Cím *</label><input class="inp" name="title" maxlength="120" value="${esc(d.title || '')}"></div>
      <div class="field"><label>Előadó</label><input class="inp" name="artist" maxlength="120" value="${esc(d.artist || '')}" placeholder="HGWS"></div></div>
    <div class="field"><label>Zenefájl</label><select class="inp" name="pick"><option value="">Betöltés…</option></select>
      <input class="inp" name="src" value="${esc(d.src || '')}" placeholder="zene/szam.mp3  vagy  https://…/szam.mp3" style="margin-top:.4rem">
      <span class="hint">Válassz a feltöltött fájlok közül, vagy írj be egy linket. Az újonnan feltöltött fájl pár perc múlva jelenik meg a listában.</span>
      <audio controls preload="none" style="width:100%;margin-top:.4rem" ${d.src ? `src="${esc(d.src)}"` : ''}></audio></div>
    <div class="field"><label>Borító <em>(négyzetes kép, nem kötelező)</em></label><div class="imgp"><div class="prev" style="aspect-ratio:1;max-width:140px"></div>
      <div class="c"><div class="r"><label class="btn plain sm">Kép feltöltése<input type="file" accept="image/*" hidden></label><button type="button" class="btn danger sm" data-clr>Törlés</button></div></div></div></div>
    <label class="chk"><input type="checkbox" name="vis" ${d.visible !== false ? 'checked' : ''}> Látható</label>`,
    foot: `${t ? '<button class="btn danger l" data-del>Törlés</button>' : ''}<button class="btn plain" data-x>Mégse</button><button class="btn goldb" data-ok>Mentés</button>` });
  const q = n => el.querySelector(`[name=${n}]`), au = el.querySelector('audio'), prev = el.querySelector('.prev');
  const paintCover = () => { prev.style.backgroundImage = cover ? `url("${cover.replace(/"/g, '%22')}")` : ''; prev.textContent = cover ? '' : 'nincs kép'; };
  paintCover();
  el.querySelector('input[type=file]').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { cover = await compress(f, 600); paintCover(); } catch (_) { toast('A képet nem sikerült beolvasni.', true); } };
  el.querySelector('[data-clr]').onclick = () => { cover = ''; paintCover(); };
  q('src').onchange = () => { au.src = q('src').value.trim(); };
  repoFiles().then(files => {
    const sel = q('pick');
    sel.innerHTML = `<option value="">${files.length ? '— Válassz a zene mappából —' : '(a zene mappában még nincs fájl)'}</option>` + files.map(f => `<option ${f === d.src ? 'selected' : ''}>${esc(f)}</option>`).join('');
    sel.onchange = () => { if (!sel.value) return; q('src').value = sel.value; au.src = sel.value;
      if (!q('title').value) q('title').value = sel.value.split('/').pop().replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '); };
  });
  el.querySelector('[data-ok]').onclick = async () => {
    const title = q('title').value.trim(), src = q('src').value.trim();
    if (!title) return toast('Add meg a címet.', true);
    if (!src) return toast('Válassz zenefájlt vagy adj meg linket.', true);
    const data = { title, artist: q('artist').value.trim(), src, cover, visible: q('vis').checked, updatedAt: FB.serverTimestamp() };
    if (!C.can('publishMedia')) {
      const { updatedAt, ...clean } = data;
      try { await submit({ type: 'music', action: t ? 'update' : 'create', targetId: t?.id || '', title, data: clean, src: {} }); el.close(); } catch (e) { toast(errText(e), true); }
      return;
    }
    try {
      if (t) await FB.updateDoc(FB.doc(db, 'music', t.id), data);
      else await FB.addDoc(FB.collection(db, 'music'), { ...data, order: Math.max(-10, ...C.S.music.map(x => x.order || 0)) + 10, createdAt: FB.serverTimestamp() });
      toast('Mentve ✓'); el.close();
    } catch (e) { toast(errText(e), true); }
  };
  const del = el.querySelector('[data-del]'); if (del) del.onclick = async () => {
    if (!await confirmBox(`Törlöd: „${t.title}”? (A fájl a GitHubon marad.)${C.can('publishMedia') ? '' : ' Jóváhagyásra megy egy adminhoz.'}`, 'Törlés')) return;
    if (!C.can('publishMedia')) { try { await submit({ type: 'music', action: 'delete', targetId: t.id, title: t.title, data: {}, src: {} }); el.close(); } catch (e) { toast(errText(e), true); } return; }
    try { await FB.deleteDoc(FB.doc(db, 'music', t.id)); toast('Törölve'); el.close(); } catch (e) { toast(errText(e), true); }
  };
}

/* ================= BEKÜLDÉSEK ÉS JÓVÁHAGYÁSOK ================= */
const ACT = { create: 'Új', update: 'Módosítás', delete: 'Törlés' };
const TYPE = { film: '🎬 Film', music: '🎵 Zene' };
const ST = { pending: ['⏳ JÓVÁHAGYÁSRA VÁR', 'b'], approved: ['✓ JÓVÁHAGYVA', 'ok'], rejected: ['✕ ELUTASÍTVA', 'red'] };
/* szerkesztő: film/zene beküldése jóváhagyásra */
async function submit(x) {
  await FB.addDoc(FB.collection(db, 'submissions'), { ...x, by: C.uid(), at: FB.serverTimestamp(), status: 'pending' });
  toast('Beküldve – egy admin hagyja jóvá ✓');
}
/* a szerkesztő saját beküldései a film / zene oldal tetején */
function mySubs(type) {
  const l = Q.subs.filter(s => s.type === type).slice(0, 8);
  if (!l.length) return '';
  return `<div class="subbox"><h3>Beküldéseid</h3>${l.map(s => `<div class="subrow"><span class="tg ${ST[s.status]?.[1] || ''}">${ST[s.status]?.[0] || s.status}</span>
    <b>${ACT[s.action] || ''}: ${esc(s.title || '')}</b><small>${timeLabel(s.at)}${s.note ? ' · „' + esc(s.note) + '”' : ''}</small></div>`).join('')}</div>`;
}
function approvals(v) {
  C.setTitle('✅', 'Jóváhagyások');
  const subs = Q.subs.filter(s => s.status === 'pending'), reqs = Q.reqs.filter(r => r.status === 'pending');
  const pub = C.can('publishMedia'), own = C.isOwner();
  const subRow = s => {
    const u = C.U(s.by), d = s.data || {};
    const pic = s.type === 'film' ? d.poster : d.cover;
    return `<div class="apcard"><div class="aph"><span class="tg">${TYPE[s.type]}</span><span class="tg ${s.action === 'delete' ? 'red' : s.action === 'create' ? 'ok' : 'b'}">${ACT[s.action]}</span>
      <small>${avatar(u, 22)} <b>${esc(u.name)}</b> · ${timeLabel(s.at)}</small></div>
      <div class="apb">${pic ? `<div class="appic" style="background-image:url('${esc(pic)}')"></div>` : ''}<div>
        <h4>${esc(s.title || d.title || '')}</h4>
        ${s.action === 'delete' ? '<p class="hint">A szerkesztő ennek a törlését kéri.</p>' : s.type === 'film'
          ? `<p class="hint">${esc([d.kind, d.year, d.len, d.genre].filter(Boolean).join(' · '))}${d.soon === false ? ' · <b>MEGJELENT</b>' : ' · ' + esc(d.status || '')}</p>${d.desc ? `<p class="apdesc">${esc(d.desc)}</p>` : ''}
             <p class="hint">${s.src?.youtube ? '▶ YouTube: ' + esc(s.src.youtube) : s.src?.mp4 ? '▶ MP4: ' + esc(s.src.mp4) : 'Nincs videó'}</p>`
          : `<p class="hint">${esc(d.artist || 'HGWS')} · ${esc(d.src || '')}</p>${d.src ? `<audio controls preload="none" src="${esc(d.src)}" style="width:100%;max-width:360px;margin-top:.4rem"></audio>` : ''}`}
      </div></div>
      ${pub ? `<div class="apf"><input class="inp" data-note="${esc(s.id)}" placeholder="Megjegyzés (nem kötelező)…" maxlength="200"><button class="btn danger sm" data-rej="${esc(s.id)}">Elutasítás</button><button class="btn goldb sm" data-ok="${esc(s.id)}">✓ Jóváhagyás</button></div>` : ''}</div>`;
  };
  const reqRow = r => {
    const u = C.U(r.target), by = C.U(r.by);
    return `<div class="apcard"><div class="aph"><span class="tg g">👑 RANGKÉRELEM</span><small>${avatar(by, 22)} <b>${esc(by.name)}</b> kérte · ${timeLabel(r.at)}</small></div>
      <div class="apb"><div style="display:flex;align-items:center;gap:.8rem">${avatar(u, 44)}<div><h4>${esc(u.name)}</h4>
        <p class="hint">${esc(roleOf(r.prev || 'user').label)} → <b style="color:${roleOf(r.role).color}">${esc(roleOf(r.role).label)}</b></p></div></div></div>
      <div class="apf"><button class="btn danger sm" data-rrej="${esc(r.id)}">Elutasítás</button><button class="btn goldb sm" data-rok="${esc(r.id)}">✓ Jóváhagyás</button></div></div>`;
  };
  v.innerHTML = `<div class="page"><div class="eyebrow">// KEZELÉS</div>${tabs()}<h1 class="gold">Jóváhagyások</h1>
    <p class="lead">${own ? 'Itt látod az adminok rangkérelmeit és a szerkesztők film- és zenebeküldéseit.' : pub ? 'A szerkesztők film- és zenebeküldései. Jóváhagyás után azonnal megjelennek az oldalon.' : 'A beküldéseid és kérelmeid állapota.'}</p>
    ${own || reqs.length ? `<h2 class="aps">👑 Rangkérelmek <span class="cnt">${reqs.length}</span></h2>${reqs.length ? (own ? reqs.map(reqRow).join('') : reqs.map(r => `<div class="subrow"><span class="tg b">⏳ VÁR</span><b>${esc(C.U(r.target).name)} → ${esc(roleOf(r.role).label)}</b><small>${timeLabel(r.at)}</small></div>`).join('')) : '<div class="empty sm">Nincs függő rangkérelem.</div>'}` : ''}
    ${pub || C.can('submitMedia') ? `<h2 class="aps">🎬 Film- és zenebeküldések <span class="cnt">${subs.length}</span></h2>${pub ? (subs.length ? subs.map(subRow).join('') : '<div class="empty sm">Nincs jóváhagyásra váró beküldés. ✨</div>') : mySubs('film') + mySubs('music') || '<div class="empty sm">Még nem küldtél be semmit.</div>'}` : ''}
  </div>`;
  $$('[data-ok]', v).forEach(b => b.onclick = () => approve(subs.find(s => s.id === b.dataset.ok), b));
  $$('[data-rej]', v).forEach(b => b.onclick = async () => {
    const s = subs.find(x => x.id === b.dataset.rej), note = v.querySelector(`[data-note="${s.id}"]`)?.value.trim() || '';
    if (!await confirmBox(`Elutasítod: „${s.title}”?`, 'Elutasítás')) return;
    try { await FB.updateDoc(FB.doc(db, 'submissions', s.id), { status: 'rejected', reviewedBy: C.uid(), reviewedAt: FB.serverTimestamp(), note }); toast('Elutasítva'); } catch (e) { toast(errText(e), true); }
  });
  $$('[data-rok]', v).forEach(b => b.onclick = async () => {
    const r = reqs.find(x => x.id === b.dataset.rok); b.disabled = true;
    try {
      const bt = FB.writeBatch(db);
      bt.update(FB.doc(db, 'users', r.target), { role: r.role });
      bt.update(FB.doc(db, 'roleRequests', r.id), { status: 'approved', reviewedAt: FB.serverTimestamp() });
      await bt.commit(); toast(`${C.U(r.target).name} mostantól ${roleOf(r.role).label} ✓`);
    } catch (e) { toast(errText(e), true); b.disabled = false; }
  });
  $$('[data-rrej]', v).forEach(b => b.onclick = async () => {
    try { await FB.updateDoc(FB.doc(db, 'roleRequests', b.dataset.rrej), { status: 'rejected', reviewedAt: FB.serverTimestamp() }); toast('Rangkérelem elutasítva'); } catch (e) { toast(errText(e), true); }
  });
}
async function approve(s, btn) {
  btn.disabled = true;
  const note = document.querySelector(`[data-note="${s.id}"]`)?.value.trim() || '';
  const bt = FB.writeBatch(db), t = FB.serverTimestamp(), d = { ...(s.data || {}) };
  try {
    if (s.type === 'film') {
      if (s.action === 'delete') { bt.delete(FB.doc(db, 'videos', s.targetId)); bt.delete(FB.doc(db, 'videoSources', s.targetId)); }
      else {
        let id = s.targetId || slug(s.title);
        if (s.action === 'create') { const b = id; let n = 2; while (C.S.videos.some(x => x.id === id)) id = b + '-' + n++; d.order = Math.max(-10, ...C.S.videos.map(x => x.order || 0)) + 10; d.createdAt = t; }
        bt.set(FB.doc(db, 'videos', id), { ...d, updatedAt: t }, { merge: true });
        bt.set(FB.doc(db, 'videoSources', id), { youtube: s.src?.youtube || '', mp4: s.src?.mp4 || '' });
        if (d.featured) C.S.videos.filter(x => x.featured && x.id !== id).forEach(x => bt.update(FB.doc(db, 'videos', x.id), { featured: false }));
      }
    } else {
      if (s.action === 'delete') bt.delete(FB.doc(db, 'music', s.targetId));
      else if (s.action === 'update' && C.S.music.some(x => x.id === s.targetId)) bt.update(FB.doc(db, 'music', s.targetId), { ...d, updatedAt: t });
      else bt.set(FB.doc(FB.collection(db, 'music')), { ...d, order: Math.max(-10, ...C.S.music.map(x => x.order || 0)) + 10, createdAt: t, updatedAt: t });
    }
    bt.update(FB.doc(db, 'submissions', s.id), { status: 'approved', reviewedBy: C.uid(), reviewedAt: t, note });
    await bt.commit(); toast('Jóváhagyva – kint van az oldalon ✓');
  } catch (e) { toast(errText(e), true); btn.disabled = false; }
}

/* ================= RANGOK SZERKESZTÉSE (csak a tulaj) ================= */
function rolesPage(v) {
  C.setTitle('👑', 'Rangok', 'Rangok létrehozása és módosítása');
  const count = k => [...C.S.users.values()].filter(u => C.roleKey(u) === k).length;
  v.innerHTML = `<div class="page"><div class="eyebrow">// KEZELÉS · CSAK A TULAJ</div>${tabs()}<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap">
    <div><h1 class="gold">Rangok</h1><p class="lead">Itt hozhatsz létre új rangokat, és módosíthatod a meglévők nevét, színét, szintjét és jogait. A <b>szint</b> dönti el, ki kit moderálhat: mindenki csak a nála alacsonyabb szintűeket. A 👑 Tulaj rang a tiéd, be van égetve – senki nem módosíthatja.</p></div>
    <button class="btn goldb" id="newRole">＋ ÚJ RANG</button></div>
    <div class="atable" style="margin-top:1.2rem">${rolesSorted().map(([k, r]) => `<div class="arow">
      <span class="rdot" style="background:${esc(r.color)};box-shadow:0 0 12px ${esc(r.color)}"></span>
      <div class="who"><b style="color:${esc(r.color)}">${k === 'owner' ? '👑 ' : ''}${esc(r.label)}</b><small>Szint: ${r.rank} · ${count(k)} fő${SYSTEM_ROLES.includes(k) ? ' · alap rang' : ' · egyedi rang'}</small>
        <div class="permlist">${k === 'owner' ? '<span class="tg g">MINDEN JOG</span>' : PERMS.filter(([p]) => r.perms?.[p]).map(([, l]) => `<span class="tg">${esc(l)}</span>`).join('') || '<span class="hint">Nincs külön joga (csevegés, filmnézés, értékelés)</span>'}</div></div>
      <div class="ac">${k === 'owner' ? '<span class="tg g">🔒 BEÉGETVE</span>' : `<button class="btn plain sm" data-redit="${k}">✏️ Szerkesztés</button>`}</div></div>`).join('')}</div></div>`;
  $('#newRole').onclick = () => roleModal();
  $$('[data-redit]', v).forEach(b => b.onclick = () => roleModal(b.dataset.redit));
}
function roleModal(k) {
  const r = k ? roleOf(k) : { label: '', color: TAG_COLORS[4], rank: 30, perms: {} }, sys = SYSTEM_ROLES.includes(k);
  let color = r.color;
  const el = modal({ title: k ? 'Rang szerkesztése' : 'Új rang', body: `
    <div class="grid2"><div class="field"><label>Név <em>(max. 24)</em></label><input class="inp" name="n" maxlength="24" value="${esc(r.label)}" placeholder="pl. VIP, Rendező"></div>
      <div class="field"><label>Szint <em>(1–99, magasabb = erősebb)</em></label><input class="inp" type="number" name="rk" min="1" max="99" value="${r.rank}"></div></div>
    <div class="field"><label>Szín</label><div class="swatches">${TAG_COLORS.map(c => `<button type="button" data-c="${c}" class="${c === color ? 'on' : ''}" style="background:${c}"></button>`).join('')}
      <label class="cpick" title="Egyéni szín"><input type="color" value="${esc(color)}">🎨</label></div></div>
    <div class="field"><label>Jogok</label><div class="permpick">${PERMS.map(([p, l, h]) => `<label class="chk"><input type="checkbox" data-p="${p}" ${r.perms?.[p] ? 'checked' : ''}> <span><b>${esc(l)}</b>${h ? `<small>${esc(h)}</small>` : ''}</span></label>`).join('')}</div></div>
    <div class="field"><label>Előnézet</label><div class="tprev"><b data-pn>Locsoló Laci</b> <span data-prev></span></div></div>
    ${k === 'admin' ? '<p class="hint">ℹ️ Admin rangot mindig csak te (a tulaj) adhatsz.</p>' : ''}`,
    foot: `${k && !sys ? '<button class="btn danger l" data-del>Rang törlése</button>' : ''}${k && sys ? '<button class="btn plain l" data-reset>Alapértékek</button>' : ''}<button class="btn plain" data-x>Mégse</button><button class="btn goldb" data-save>${k ? 'Mentés' : 'Létrehozás'}</button>` });
  const n = el.querySelector('[name=n]'), pick = el.querySelector('input[type=color]');
  const prev = () => { el.querySelector('[data-prev]').innerHTML = `<span class="rb" style="--rc:${esc(color)}">${esc(n.value.trim() || 'Rang')}</span>`; el.querySelector('[data-pn]').style.color = color; };
  el.querySelector('.swatches').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; color = b.dataset.c; pick.value = color; $$('.swatches [data-c]', el).forEach(x => x.classList.toggle('on', x === b)); prev(); };
  pick.oninput = () => { color = pick.value; $$('.swatches [data-c]', el).forEach(x => x.classList.remove('on')); prev(); };
  n.oninput = prev; prev();
  el.querySelector('[data-save]').onclick = async () => {
    const name = n.value.trim(), rank = Math.round(+el.querySelector('[name=rk]').value);
    if (!name) return toast('Adj nevet a rangnak.', true);
    if (!(rank >= 1 && rank <= 99)) return toast('A szint 1 és 99 között legyen.', true);
    const perms = Object.fromEntries($$('[data-p]', el).filter(c => c.checked).map(c => [c.dataset.p, true]));
    let id = k;
    if (!id) { const b = slug(name).replace(/-/g, '_') || 'rang'; id = b; let i = 2; while (ROLES[id]) id = b + '_' + i++; }
    try { await FB.setDoc(FB.doc(db, 'roles', id), { name, color, rank, perms }); toast(k ? 'Rang mentve ✓' : 'Rang létrehozva ✓'); el.close(); } catch (e) { toast(errText(e), true); }
  };
  el.querySelector('[data-reset]')?.addEventListener('click', async () => {
    if (!await confirmBox(`Visszaállítod a(z) „${r.label}” rangot az alapértékekre?`, 'Visszaállítás', false)) return;
    try { await FB.deleteDoc(FB.doc(db, 'roles', k)); toast('Alapértékek visszaállítva'); el.close(); } catch (e) { toast(errText(e), true); }
  });
  el.querySelector('[data-del]')?.addEventListener('click', async () => {
    const users = [...C.S.users.values()].filter(u => u.role === k);
    if (!await confirmBox(`Törlöd a(z) „${r.label}” rangot?${users.length ? ` ${users.length} tag visszakerül sima Tag rangra.` : ''}`, 'Törlés')) return;
    try { const bt = FB.writeBatch(db); users.forEach(u => bt.update(FB.doc(db, 'users', u.id), { role: 'user' })); bt.delete(FB.doc(db, 'roles', k)); await bt.commit(); toast('Rang törölve'); el.close(); }
    catch (e) { toast(errText(e), true); }
  });
}
