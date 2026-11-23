// HGWS – kezelőfelület: tagok és rangok, tagek, filmek, zenék, csatornák, jóváhagyások, rangok szerkesztése
import { FB, db, $, $$, esc, ROLES, roleOf, PERMS, SYSTEM_ROLES, OWNER_UID, rolesSorted, notify, audit, avatar, toDate, timeLabel, isOnline, ytId, toast, errText, reservedName, RESERVED_MSG, badName, BAD_MSG, badMsg, badReason } from './core.js?v=202611230454';
import { modal, confirmBox, compress, STAGES } from './ui.js?v=202611230454';
import { githubRepo } from '../firebase-config.js?v=202611230454';

let C = null, current = null;
/* e-mail címek: csak adminok és a tulaj olvashatják (emails/{uid}); a lista megnyitásakor egyszer töltjük be */
const EMAILS = new Map(); let emailsAt = 0;
function loadEmails() { if (!C.isAdmin() || Date.now() - emailsAt < 60e3) return; emailsAt = Date.now(); FB.getDocs(FB.collection(db, 'emails')).then(s => { let ch = EMAILS.size !== s.size; s.docs.forEach(d => { const e = d.data().email; if (EMAILS.get(d.id) !== e) { EMAILS.set(d.id, e); ch = true; } }); if (ch) refresh(); }).catch(e => console.warn('e-mail címek', e)); }
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
    rangok: C.isOwner(),
    naplo: C.isOwner() || C.can('assignRoles'),
    stat: C.isOwner() || C.can('publishMedia')
  };
  if (ok[sub]) return ({ tagok: members, cimkek: tagsPage, filmek: films, zene: music, csatornak: channels, jovahagyas: approvals, rangok: rolesPage, naplo: auditPage, stat: statsPage })[sub](v, again);
  C.setTitle('<i class="ic ic-lock"></i>', 'Nincs jogosultság');
  v.innerHTML = '<div class="full"><div><div class="big"><i class="ic ic-lock"></i></div><h2>Ehhez nincs jogosultságod</h2></div></div>';
}

function tabList() {
  const n = pendingCount();
  return [['tagok', '<i class="ic ic-shield"></i> Tagok és rangok', C.can('moderate') || C.can('assignRoles') || C.isOwner()], ['cimkek', '<i class="ic ic-tag"></i> Tagek', C.can('manageTags')],
    ['filmek', '<i class="ic ic-film"></i> Filmek', C.can('publishMedia') || C.can('submitMedia')], ['zene', '<i class="ic ic-music"></i> Zenék', C.can('publishMedia') || C.can('submitMedia')],
    ['csatornak', '<i class="ic ic-settings"></i> Csatornák', C.can('manageChannels')],
    ['jovahagyas', `<i class="ic ic-circle-check"></i> Jóváhagyások${n ? ` <span class="cnt">${n}</span>` : ''}`, C.can('publishMedia') || C.isOwner() || C.can('submitMedia') || C.can('assignRoles')],
    ['stat', '<i class="ic ic-chart-column"></i> Statisztika', C.isOwner() || C.can('publishMedia')], ['naplo', '<i class="ic ic-scroll-text"></i> Napló', C.isOwner() || C.can('assignRoles')],
    ['rangok', '<i class="ic ic-crown"></i> Rangok', C.isOwner()]].filter(x => x[2]);
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
  C.setTitle('<i class="ic ic-shield"></i>', 'Tagok és rangok', C.isOwner() ? 'Rangok kiosztása, moderálás' : 'Moderálás');
  const me = C.uid();
  const list = [...C.S.users.values()].filter(u => !mq || u.name.toLowerCase().includes(mq))
    .sort((a, b) => C.rankOfUser(b) - C.rankOfUser(a) || a.name.localeCompare(b.name, 'hu'));
  const focus = again && document.activeElement?.id === 'aq';
  const reqOf = id => Q.reqs.find(r => r.target === id && r.status === 'pending');
  const reqRoles = rolesSorted().filter(([k, r]) => k !== 'owner' && k !== 'admin' && r.rank < C.myRank());
  v.innerHTML = `<div class="page"><div class="eyebrow">// KEZELÉS</div>${tabs()}<h1 class="gold">Tagok és rangok</h1>
    <p class="lead">${C.isOwner() ? '<i class="ic ic-crown"></i> <b>Tulajként</b> bármilyen rangot közvetlenül kioszthatsz. Az adminok által kért rangokat a <a href="#/admin/jovahagyas">Jóváhagyások</a> fülön fogadhatod el.'
      : C.can('assignRoles') ? 'A rangváltoztatás kérelemként megy a <b>tulajhoz</b>, ő hagyja jóvá. Admint csak a tulaj adhat.' : 'Az alacsonyabb rangú tagokat némíthatod vagy tilthatod ki.'}</p>
    ${(() => { const bad = [...C.S.users.values()].filter(u => badName(u.name));
      if (!bad.length) return '';
      const fixable = bad.filter(u => u.id !== me && u.id !== OWNER_UID && C.can('moderate') && C.rankOfUser(u) < C.myRank());
      const why = u => badReason(u.name) === 'karakter' ? 'nem engedett karakter' : 'trágár/sértő szó';
      return `<div class="badnames"><i class="ic ic-triangle-alert"></i><div><b>${bad.length} tag neve nem megfelelő</b>
        <span>${bad.map(u => `<b data-u="${esc(u.id)}">${esc(u.name)}</b> <small>(${why(u)})</small>`).join(', ')}. Belépéskor kötelezően új nevet kell választaniuk – vagy itt azonnal átnevezheted őket.</span></div>
        ${fixable.length ? `<button class="btn danger sm" data-fixbad>Átnevezés (${fixable.length}) → Tag-xxxxx</button>` : ''}</div>`; })()}
    <div class="search" style="margin:1.2rem 0 0;max-width:380px"><input type="search" id="aq" placeholder="Keresés név szerint…" value="${esc(mq)}"></div>
    <div class="atable">${(loadEmails(), list).map(u => {
      const muted = toDate(u.mutedUntil) > new Date(), self = u.id === me, own = u.id === OWNER_UID, k = C.roleKey(u);
      const lower = C.rankOfUser(u) < C.myRank();
      const canMod = !self && !own && C.can('moderate') && lower;
      const rq = reqOf(u.id);
      let ctl;
      if (own || self || !lower) ctl = C.roleBadge(u) || '<span class="tg">TAG</span>';
      else if (C.isOwner()) ctl = `<select data-role="${esc(u.id)}">${rolesSorted().filter(([x]) => x !== 'owner').map(([x, r]) => `<option value="${x}" ${k === x ? 'selected' : ''}>${esc(r.label)}</option>`).join('')}</select>`;
      else if (C.can('assignRoles')) ctl = rq ? `<span class="tg b" title="A tulaj jóváhagyására vár"><i class="ic ic-hourglass"></i> KÉRVE: ${esc(roleOf(rq.role).label.toUpperCase())}</span><button class="btn plain sm" data-unreq="${esc(rq.id)}">Visszavonás</button>`
        : `<select data-req="${esc(u.id)}"><option value="${k}" selected>${esc(roleOf(k).label)}</option>${reqRoles.filter(([x]) => x !== k).map(([x, r]) => `<option value="${x}">→ ${esc(r.label)}</option>`).join('')}</select>`;
      else ctl = C.roleBadge(u) || '<span class="tg">TAG</span>';
      return `<div class="arow"><span class="avw">${avatar(u, 42)}<i class="on${isOnline(u) ? ' y' : ''}" style="border-color:#0d1830"></i></span>
        <div class="who"><b data-u="${esc(u.id)}" style="cursor:pointer;color:${k !== 'user' ? roleOf(k).color : 'inherit'}">${esc(u.name)}</b>${self ? ' <span class="hint">(te)</span>' : ''}
          <small>${u.createdAt ? 'Tag ' + toDate(u.createdAt).toLocaleDateString('hu-HU') + ' óta' : ''}${u.lastSeen ? ' · ' + (isOnline(u) ? '<span class="odot"></span>online' : 'utoljára ' + timeLabel(u.lastSeen)) : ''}</small>${C.isAdmin() && EMAILS.get(u.id) ? `<small style="user-select:all"><i class="ic ic-mail"></i> ${esc(EMAILS.get(u.id))}</small>` : ''}
          <div>${C.tagPills(u, 6)}${badName(u.name) ? `<span class="tg red" title="${esc(badMsg(u.name))}"><i class="ic ic-triangle-alert"></i> NEM MEGFELELŐ NÉV</span>` : ''}${u.banned ? '<span class="tg red"><i class="ic ic-ban"></i> KITILTVA</span>' : ''}${muted ? `<span class="tg red"><i class="ic ic-volume-x"></i> NÉMÍTVA ${esc(timeLabel(u.mutedUntil))}-IG</span>` : ''}</div></div>
        <div class="ac">${ctl}
          ${C.can('manageTags') && (!own || C.isOwner()) ? `<button class="btn plain sm" data-tagu="${esc(u.id)}"><i class="ic ic-tag"></i> Tagek</button>` : ''}
          ${canMod ? `<button class="btn plain sm" data-mod="${esc(u.id)}"><i class="ic ic-shield"></i> Moderálás</button>` : ''}
        </div></div>`;
    }).join('')}</div></div>`;
  const q = $('#aq'); q.oninput = () => { mq = q.value.toLowerCase(); members(v, true); };
  const fb = v.querySelector('[data-fixbad]');
  if (fb) fb.onclick = async () => {
    const l = [...C.S.users.values()].filter(u => badName(u.name) && u.id !== me && u.id !== OWNER_UID && C.rankOfUser(u) < C.myRank());
    if (!await confirmBox(`${l.length} tag nevét átírod „Tag-xxxxx” formára: ${l.map(u => u.name).join(', ')}. Mehet?`, 'Átnevezés')) return;
    let ok = 0;
    for (const u of l) {
      const name = 'Tag-' + u.id.slice(0, 5);
      try { await FB.updateDoc(FB.doc(db, 'users', u.id), { name, nameLower: name.toLowerCase() }); audit('user.rename', u.name, '→ ' + name + ' (trágár név)'); ok++; } catch (e) { console.warn(e); }
    }
    toast(`${ok} / ${l.length} tag átnevezve ✓`, ok < l.length);
  };
  if (focus) { const n = $('#aq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
  // tulaj: közvetlen rangállítás
  $$('[data-role]', v).forEach(s => s.onchange = async () => {
    const u = C.U(s.dataset.role), r = s.value, prev = C.roleKey(u);
    if (r === 'admin' && !await confirmBox(`${u.name} ADMIN lesz: filmeket, zenéket, csatornákat kezel és rangokat kérhet. Biztos?`, 'Admin lesz', false)) { s.value = prev; return; }
    if (r !== 'admin' && !await confirmBox(`${u.name} rangja: ${roleOf(r).label}?`, 'Mentés', false)) { s.value = prev; return; }
    try { await FB.updateDoc(FB.doc(db, 'users', u.id), { role: r }); audit('role.set', u.name, `${roleOf(prev).label} → ${roleOf(r).label}`); notify(u.id, 'role', `Új rangot kaptál: ${roleOf(r).label} 👑`, '#/profil/' + u.id); toast('Rang frissítve ✓'); } catch (e) { toast(errText(e), true); s.value = prev; }
  });
  // admin: rangkérelem a tulajnak
  $$('[data-req]', v).forEach(s => s.onchange = async () => {
    const u = C.U(s.dataset.req), r = s.value, prev = C.roleKey(u);
    if (r === prev) return;
    if (!await confirmBox(`Kérelmezed, hogy ${u.name} rangja ${roleOf(r).label} legyen? A tulaj hagyja jóvá.`, 'Kérelem küldése', false)) { s.value = prev; return; }
    try { await FB.addDoc(FB.collection(db, 'roleRequests'), { target: u.id, role: r, prev, by: C.uid(), at: FB.serverTimestamp(), status: 'pending' });
      audit('role.request', u.name, `${roleOf(prev).label} → ${roleOf(r).label}`); notify(OWNER_UID, 'role', `${C.S.me.name} rangot kér: ${u.name} → ${roleOf(r).label}`, '#/admin/jovahagyas'); toast('Kérelem elküldve a tulajnak ✓'); }
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
  C.setTitle('<i class="ic ic-tag"></i>', 'Tagek', 'Egyedi rangok: szöveg + szín');
  const tags = C.S.tags, count = id => [...C.S.users.values()].filter(u => (u.tags || []).includes(id)).length;
  v.innerHTML = `<div class="page"><div class="eyebrow">// KEZELÉS</div>${tabs()}<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap">
    <div><h1 class="gold">Tagek</h1><p class="lead">Discord-rangszerű címkék. A moderátorok és adminok hozhatnak létre és oszthatnak ki ilyeneket – a tag neve mellett jelenik meg a csevegésben, a hozzászólásoknál és a profilján.</p></div>
    <div style="display:flex;gap:.5rem;flex-wrap:wrap">${TAG_PRESETS.some(([n]) => !tags.some(t => t.name === n)) ? '<button class="btn plain" id="presetTags"><i class="ic ic-sparkles"></i> HGWS alap tagek</button>' : ''}<button class="btn goldb" id="newTag"><i class="ic ic-plus"></i> Új tag</button></div></div>
    <div class="atable" style="margin-top:1.2rem">${tags.length ? tags.map(t => `<div class="arow"><span style="width:14px;height:14px;border-radius:50%;background:${esc(t.color)};box-shadow:0 0 10px ${esc(t.color)}"></span>
      <div class="who">${tagPill(t)}<small>${count(t.id)} tagnál</small></div>
      <div class="ac"><button class="btn plain sm" data-tedit="${esc(t.id)}"><i class="ic ic-pencil"></i> Szerkesztés</button><button class="btn danger sm" data-tdel="${esc(t.id)}">Törlés</button></div></div>`).join('')
      : '<div class="empty">Még nincs egy tag sem. Hozd létre az elsőt az „Új tag” gombbal!</div>'}</div></div>`;
  $('#newTag').onclick = () => tagModal();
  const pt = $('#presetTags'); if (pt) pt.onclick = async () => {
    const miss = TAG_PRESETS.filter(([n]) => !tags.some(t => t.name === n));
    if (!await confirmBox(`Létrehozod a(z) ${miss.length} HGWS alap taget?`, 'Létrehozás', false)) return;
    pt.disabled = true;
    try {
      const bt = FB.writeBatch(db), t0 = Date.now();
      miss.forEach(([name, color], i) => bt.set(FB.doc(FB.collection(db, 'tags')), { name, color, order: t0 + i, createdAt: FB.serverTimestamp() }));
      await bt.commit(); audit('tag.create', `${miss.length} HGWS alap tag`); toast(`${miss.length} tag létrehozva ✓`);
    } catch (e) { toast(errText(e), true); pt.disabled = false; }
  };
  $$('[data-tedit]', v).forEach(b => b.onclick = () => tagModal(tags.find(t => t.id === b.dataset.tedit)));
  $$('[data-tdel]', v).forEach(b => b.onclick = async () => {
    const t = tags.find(x => x.id === b.dataset.tdel), n = count(t.id);
    if (!await confirmBox(`Törlöd a(z) „${t.name}” taget?${n ? ` ${n} tagról is lekerül.` : ''}`, 'Törlés')) return;
    try {
      const bt = FB.writeBatch(db);
      [...C.S.users.values()].filter(u => (u.tags || []).includes(t.id)).forEach(u => bt.update(FB.doc(db, 'users', u.id), { tags: FB.arrayRemove(t.id) }));
      bt.delete(FB.doc(db, 'tags', t.id)); await bt.commit(); audit('tag.delete', t.name); toast('Tag törölve');
    } catch (e) { toast(errText(e), true); }
  });
}
export function tagModal(t) {
  let color = t?.color || TAG_COLORS[Math.floor(Math.random() * 8)];
  const el = modal({ title: t ? 'Tag szerkesztése' : 'Új tag', body: `
    <div class="field"><label>Név <em>(max. 24 karakter)</em></label><input class="inp" name="n" maxlength="24" value="${esc(t?.name || '')}" placeholder="pl. Locsolómester, VIP, Tesztelő"></div>
    <div class="field"><label>Szín</label><div class="swatches">${TAG_COLORS.map(c => `<button type="button" data-c="${c}" class="${c === color ? 'on' : ''}" style="background:${c}"></button>`).join('')}
      <label class="cpick" title="Egyéni szín"><input type="color" value="${esc(color)}"><i class="ic ic-palette"></i></label></div></div>
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
      audit(t ? 'tag.edit' : 'tag.create', name);
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
    foot: `<a class="btn plain l" href="#/admin/cimkek"><i class="ic ic-tag"></i> Tagek kezelése</a><button class="btn plain" data-x>Mégse</button>${tags.length ? '<button class="btn goldb" data-save>Mentés</button>' : ''}` });
  el.querySelector('.tagpick')?.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return;
    if (!b.classList.contains('on') && $$('.tagpick .on', el).length >= 10) return toast('Legfeljebb 10 tag lehet egy tagon.', true);
    b.classList.toggle('on'); });
  el.querySelector('[data-save]')?.addEventListener('click', async () => {
    const ids = $$('.tagpick .on', el).map(b => b.dataset.t);
    try { await FB.updateDoc(FB.doc(db, 'users', id), { tags: ids }); toast('Tagek mentve ✓'); el.close();
      const added = ids.filter(x => !has.has(x)).map(x => tags.find(t => t.id === x)?.name).filter(Boolean), removed = [...has].filter(x => !ids.includes(x)).map(x => tags.find(t => t.id === x)?.name).filter(Boolean);
      if (added.length || removed.length) audit('tag.assign', u.name, [added.length ? '+ ' + added.join(', ') : '', removed.length ? '− ' + removed.join(', ') : ''].filter(Boolean).join(' · '));
      if (added.length) notify(id, 'tag', `Új taget kaptál: ${added.join(', ')} 🏷️`, '#/profil/' + id); } catch (e) { toast(errText(e), true); }
  });
  el.querySelector('a[href="#/admin/cimkek"]')?.addEventListener('click', () => el.close());
}

export function modModal(id) {
  const u = C.U(id), muted = toDate(u.mutedUntil) > new Date();
  const el = modal({ title: 'Moderálás – ' + u.name, body: `
    <div style="display:flex;align-items:center;gap:.9rem">${avatar(u, 52)}<div><b style="font-size:1.05rem">${esc(u.name)}</b><div class="hint">${esc(roleOf(C.roleKey(u)).label)}${u.banned ? ' · <i class="ic ic-ban"></i> kitiltva' : ''}${muted ? ' · <i class="ic ic-volume-x"></i> némítva ' + timeLabel(u.mutedUntil) + '-ig' : ''}</div></div></div>
    ${C.can('moderate') ? `<div class="field"><label>Megjelenített név</label><div style="display:flex;gap:.5rem;flex-wrap:wrap"><input class="inp" name="nm" maxlength="32" value="${esc(u.name)}" style="flex:1;min-width:180px"><button class="btn plain sm" data-rn>Mentés</button><button class="btn danger sm" data-rst title="A nevet egy semleges „Tag-…” névre cseréli">Név törlése</button></div></div>` : ''}
    <div class="field"><label>Némítás <em>(nem írhat sehova, de olvashat)</em></label><div style="display:flex;gap:.4rem;flex-wrap:wrap">
      ${[['10 perc', 10], ['1 óra', 60], ['1 nap', 1440], ['1 hét', 10080]].map(([l, m]) => `<button class="btn plain sm" data-mute="${m}">${l}</button>`).join('')}
      ${muted ? '<button class="btn primary sm" data-mute="0">Némítás feloldása</button>' : ''}</div></div>
    <div class="field"><label>Kitiltás <em>(semmit nem lát a közösségből)</em></label><div>
      ${u.banned ? '<button class="btn primary sm" data-ban="0">Kitiltás feloldása</button>' : '<button class="btn danger sm" data-ban="1"><i class="ic ic-ban"></i> Kitiltás</button>'}</div></div>`,
    foot: '<button class="btn plain" data-x>Bezárás</button>' });
  const ref = FB.doc(db, 'users', id);
  const setName = async name => {
    name = name.trim();
    if (name.length < 2) return toast('A név legalább 2 karakter legyen.', true);
    if (reservedName(name) && C.S.owner?.uid !== id) return toast(RESERVED_MSG, true);
    if (badName(name)) return toast(badMsg(name), true);
    try { await FB.updateDoc(ref, { name, nameLower: name.toLowerCase() }); audit('user.rename', u.name, '→ ' + name); toast('Név módosítva ✓'); el.close(); } catch (e) { toast(errText(e), true); }
  };
  const rn = el.querySelector('[data-rn]'); if (rn) rn.onclick = () => setName(el.querySelector('[name=nm]').value);
  const rst = el.querySelector('[data-rst]'); if (rst) rst.onclick = () => setName('Tag-' + id.slice(0, 5));
  $$('[data-mute]', el).forEach(b => b.onclick = async () => {
    const m = +b.dataset.mute;
    try { await FB.updateDoc(ref, { mutedUntil: m ? FB.Timestamp.fromDate(new Date(Date.now() + m * 60e3)) : null }); audit(m ? 'user.mute' : 'user.unmute', u.name, m ? m + ' perc' : ''); toast(m ? 'Némítva 🔇' : 'Némítás feloldva'); el.close(); } catch (e) { toast(errText(e), true); }
  });
  $$('[data-ban]', el).forEach(b => b.onclick = async () => {
    const on = b.dataset.ban === '1';
    if (on && !await confirmBox(`Kitiltod ${u.name} felhasználót a közösségből?`, 'Kitiltás')) return;
    try { await FB.updateDoc(ref, { banned: on }); audit(on ? 'user.ban' : 'user.unban', u.name); toast(on ? 'Kitiltva ⛔' : 'Kitiltás feloldva'); el.close(); } catch (e) { toast(errText(e), true); }
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
  C.setTitle('<i class="ic ic-settings"></i>', 'Csatornák kezelése');
  const list = C.S.channels;
  v.innerHTML = `<div class="page"><div class="eyebrow">// KEZELÉS</div>${tabs()}<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap"><div><h1 class="gold">Csatornák</h1>
    <p class="lead">A „Bejelentés” típusú csatornára csak adminok és moderátorok írhatnak.</p></div><button class="btn goldb" id="nc"><i class="ic ic-plus"></i> Új csatorna</button></div>
    ${list.length ? `<div class="atable">${list.map((c, i) => `<div class="arow"><div class="ord"><button data-up="${i}" ${i ? '' : 'disabled'}>▲</button><button data-dn="${i}" ${i < list.length - 1 ? '' : 'disabled'}>▼</button></div>
      <div class="who"><b>${c.type === 'announce' ? '<i class="ic ic-megaphone"></i>' : '#'} ${esc(c.name)}</b><small>${esc(c.category || '')}${c.topic ? ' · ' + esc(c.topic) : ''}</small></div>
      <div class="ac"><button class="btn plain sm" data-ed="${esc(c.id)}">Szerkesztés</button></div></div>`).join('')}</div>`
    : `<div class="empty"><div class="big">#</div>Még nincs csatorna.<br><button class="btn primary" id="def">Alap csatornák létrehozása</button></div>`}</div>`;
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
      audit(c ? 'channel.edit' : 'channel.create', '#' + data.name);
      if (c) await FB.updateDoc(FB.doc(db, 'channels', c.id), data);
      else { const ref = FB.doc(FB.collection(db, 'channels')); await FB.setDoc(ref, { ...data, order: (Math.max(0, ...C.S.channels.map(x => x.order || 0)) + 10), createdAt: FB.serverTimestamp() }); location.hash = '#/c/' + ref.id; }
      toast('Mentve ✓'); el.close();
    } catch (e) { toast(errText(e), true); }
  };
  const d = el.querySelector('[data-del]'); if (d) d.onclick = async () => {
    if (!await confirmBox(`Törlöd a #${c.name} csatornát? (A régi üzenetek nem fognak látszani.)`, 'Törlés')) return;
    try { await FB.deleteDoc(FB.doc(db, 'channels', c.id)); audit('channel.delete', '#' + c.name); toast('Törölve'); el.close(); if (location.hash === '#/c/' + c.id) location.hash = '#/'; } catch (e) { toast(errText(e), true); }
  };
}

/* ================= FILMEK ================= */
function films(v) {
  C.setTitle('<i class="ic ic-film"></i>', 'Filmek kezelése', 'Ami itt szerepel, az látszik a filmtárban és a főoldalon');
  const list = C.S.videos, pub = C.can('publishMedia');
  v.innerHTML = `<div class="page"><div class="eyebrow">// KEZELÉS</div>${tabs()}<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap"><div><h1 class="gold">Filmek</h1>
    <p class="lead">${pub ? 'A YouTube-linket a „Megjelent” bepipálása után mindenki látja, aki be van lépve. A főoldal csak a címet, a posztert és az állapotot mutatja.' : '<i class="ic ic-pencil"></i> <b>Szerkesztőként</b> az új filmek és a módosítások <b>jóváhagyásra</b> kerülnek egy adminhoz – csak utána jelennek meg.'}</p></div><button class="btn goldb" id="nf"><i class="ic ic-plus"></i> ${pub ? 'Új film' : 'Film beküldése'}</button></div>
    ${pub ? '' : mySubs('film')}
    ${list.length ? `<div class="atable">${list.map((x, i) => `<div class="arow" style="grid-template-columns:auto auto 1fr auto"><div class="ord">${pub ? `<button data-up="${i}" ${i ? '' : 'disabled'}>▲</button><button data-dn="${i}" ${i < list.length - 1 ? '' : 'disabled'}>▼</button>` : ''}</div>
      <div class="fthumb">${x.poster ? `<img src="${esc(x.poster)}" alt="" loading="lazy">` : ''}</div>
      <div class="who"><b>${esc(x.title)}</b><small>${esc([x.kind, x.year, x.genre].filter(Boolean).join(' · '))}</small>
        <div>${x.featured ? '<span class="tg g"><i class="ic ic-star"></i> KIEMELT</span>' : ''}${x.soon === false ? '<span class="tg ok">MEGJELENT</span>' : `<span class="tg b">${esc((x.status || STAGES[x.stage ?? 0]).toUpperCase())}</span>`}${x.hasVideo ? '<span class="tg"><i class="ic ic-play"></i> VIDEÓ</span>' : ''}${x.visible === false ? '<span class="tg">REJTETT</span>' : ''}</div></div>
      <div class="ac"><button class="btn plain sm" data-ed="${esc(x.id)}">Szerkesztés</button></div></div>`).join('')}</div>`
    : `<div class="empty"><div class="big"><i class="ic ic-clapperboard"></i></div>Még nincs film.${pub ? '<br><button class="btn primary" id="imp">A korábbi főoldali címek áthozása</button>' : ''}</div>`}</div>`;
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
    <div class="field"><label>Felirat az MP4-hez <em>(.vtt vagy .srt link – a nézők a CC gombbal kapcsolhatják be, alapból ki van kapcsolva; YouTube-nál a YouTube saját feliratát használja)</em></label><input class="inp" name="vtt" value="${esc(src.vtt || '')}" placeholder="feliratok/film.hu.vtt"></div>
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
    const mp4 = q('mp4').value.trim(), vtt = q('vtt').value.trim();
    const data = { title, en: q('en').value.trim(), kind: q('kind').value.trim() || 'Film', year: q('year').value.trim(), len: q('len').value.trim(),
      genre: q('genre').value.trim(), premiere: q('premiere').value, desc: q('desc').value.trim(), status: q('status').value.trim().toUpperCase(), stage,
      soon: !q('rel').checked, featured: q('feat').checked, visible: q('vis').checked, hasVideo: !!(yt || mp4), poster: imgs.poster, banner: imgs.banner, updatedAt: FB.serverTimestamp() };
    const id = f ? f.id : (() => { let b = slug(title), s = b, n = 2; while (C.S.videos.some(x => x.id === s)) s = b + '-' + n++; return s; })();
    if (!C.can('publishMedia')) {
      const { updatedAt, ...clean } = data;
      try { await submit({ type: 'film', action: f ? 'update' : 'create', targetId: id, title, data: clean, src: { youtube: yt, mp4, vtt } }); el.close(); } catch (e) { toast(errText(e), true); }
      return;
    }
    if (!f) { data.order = Math.max(-10, ...C.S.videos.map(x => x.order || 0)) + 10; data.createdAt = FB.serverTimestamp(); }
    try {
      const b = FB.writeBatch(db);
      b.set(FB.doc(db, 'videos', id), data, { merge: true });
      b.set(FB.doc(db, 'videoSources', id), { youtube: yt, mp4, vtt });
      if (data.featured) C.S.videos.filter(x => x.featured && x.id !== id).forEach(x => b.update(FB.doc(db, 'videos', x.id), { featured: false }));
      await b.commit(); audit(f ? 'film.edit' : 'film.create', title); toast('Mentve ✓'); el.close();
    } catch (e) { toast(errText(e), true); }
  };
  const del = el.querySelector('[data-del]'); if (del) del.onclick = async () => {
    if (!await confirmBox(`Törlöd: „${f.title}”?${C.can('publishMedia') ? '' : ' (Jóváhagyásra megy egy adminhoz.)'}`, 'Törlés')) return;
    if (!C.can('publishMedia')) { try { await submit({ type: 'film', action: 'delete', targetId: f.id, title: f.title, data: {}, src: {} }); el.close(); } catch (e) { toast(errText(e), true); } return; }
    try { const b = FB.writeBatch(db); b.delete(FB.doc(db, 'videos', f.id)); b.delete(FB.doc(db, 'videoSources', f.id)); await b.commit(); audit('film.delete', f.title); toast('Törölve'); el.close(); } catch (e) { toast(errText(e), true); }
  };
}

async function importFilms(btn) {
  btn.disabled = true;
  try {
    const seed = await (await fetch('./adat/seed-films.json', { cache: 'no-store' })).json();
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
  C.setTitle('<i class="ic ic-music"></i>', 'Zenék kezelése');
  const list = C.S.music, pub = C.can('publishMedia');
  v.innerHTML = `<div class="page"><div class="eyebrow">// KEZELÉS</div>${tabs()}<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap"><div><h1 class="gold">Zenék</h1>
    <p class="lead">1. Töltsd fel az mp3-at a GitHubon a <b>zene</b> mappába (<a href="https://github.com/${githubRepo}/upload/main/zene" target="_blank" rel="noopener">feltöltés itt ↗</a> – behúzod, majd „Commit changes”).<br>2. Pár perc múlva itt az „Új zene” gombnál kiválaszthatod.</p></div><button class="btn goldb" id="nm"><i class="ic ic-plus"></i> ${pub ? 'Új zene' : 'Zene beküldése'}</button></div>
    ${pub ? '' : mySubs('music')}
    ${list.length ? `<div class="atable">${list.map((t, i) => `<div class="arow" style="grid-template-columns:auto auto 1fr auto"><div class="ord">${pub ? `<button data-up="${i}" ${i ? '' : 'disabled'}>▲</button><button data-dn="${i}" ${i < list.length - 1 ? '' : 'disabled'}>▼</button>` : ''}</div>
      <span class="pc" style="width:52px;height:52px;${t.cover ? `background-image:url('${esc(t.cover)}')` : ''}"></span>
      <div class="who"><b>${esc(t.title)}</b><small>${esc(t.artist || 'HGWS')} · ${esc(t.src)}</small>${t.visible === false ? '<div><span class="tg">REJTETT</span></div>' : ''}</div>
      <div class="ac"><button class="btn plain sm" data-ed="${esc(t.id)}">Szerkesztés</button></div></div>`).join('')}</div>`
    : '<div class="empty"><div class="big"><i class="ic ic-music"></i></div>Még nincs zene.</div>'}</div>`;
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
      audit(t ? 'music.edit' : 'music.create', title); toast('Mentve ✓'); el.close();
    } catch (e) { toast(errText(e), true); }
  };
  const del = el.querySelector('[data-del]'); if (del) del.onclick = async () => {
    if (!await confirmBox(`Törlöd: „${t.title}”? (A fájl a GitHubon marad.)${C.can('publishMedia') ? '' : ' Jóváhagyásra megy egy adminhoz.'}`, 'Törlés')) return;
    if (!C.can('publishMedia')) { try { await submit({ type: 'music', action: 'delete', targetId: t.id, title: t.title, data: {}, src: {} }); el.close(); } catch (e) { toast(errText(e), true); } return; }
    try { await FB.deleteDoc(FB.doc(db, 'music', t.id)); audit('music.delete', t.title); toast('Törölve'); el.close(); } catch (e) { toast(errText(e), true); }
  };
}

/* ================= BEKÜLDÉSEK ÉS JÓVÁHAGYÁSOK ================= */
const ACT = { create: 'Új', update: 'Módosítás', delete: 'Törlés' };
const TYPE = { film: 'Film', music: 'Zene' };
const ST = { pending: ['<i class="ic ic-hourglass"></i> JÓVÁHAGYÁSRA VÁR', 'b'], approved: ['<i class="ic ic-check"></i> JÓVÁHAGYVA', 'ok'], rejected: ['<i class="ic ic-x"></i> ELUTASÍTVA', 'red'] };
/* szerkesztő: film/zene beküldése jóváhagyásra */
async function submit(x) {
  await FB.addDoc(FB.collection(db, 'submissions'), { ...x, by: C.uid(), at: FB.serverTimestamp(), status: 'pending' });
  toast('Beküldve – egy admin hagyja jóvá ✓');
  audit('media.submit', x.title, `${TYPE[x.type]} · ${ACT[x.action]}`);
  [...C.S.users.values()].filter(u => u.id === OWNER_UID || roleOf(u.role).perms?.publishMedia).forEach(u => notify(u.id, 'approve', `${C.S.me.name} beküldött: ${ACT[x.action]} ${x.type === 'film' ? 'film' : 'zene'} – ${x.title}`, '#/admin/jovahagyas'));
}
/* a szerkesztő saját beküldései a film / zene oldal tetején */
function mySubs(type) {
  const l = Q.subs.filter(s => s.type === type).slice(0, 8);
  if (!l.length) return '';
  return `<div class="subbox"><h3>Beküldéseid</h3>${l.map(s => `<div class="subrow"><span class="tg ${ST[s.status]?.[1] || ''}">${ST[s.status]?.[0] || s.status}</span>
    <b>${ACT[s.action] || ''}: ${esc(s.title || '')}</b><small>${timeLabel(s.at)}${s.note ? ' · „' + esc(s.note) + '”' : ''}</small></div>`).join('')}</div>`;
}
function approvals(v) {
  C.setTitle('<i class="ic ic-circle-check"></i>', 'Jóváhagyások');
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
             <p class="hint">${s.src?.youtube ? '<i class="ic ic-play"></i> YouTube: ' + esc(s.src.youtube) : s.src?.mp4 ? '<i class="ic ic-play"></i> MP4: ' + esc(s.src.mp4) : 'Nincs videó'}</p>`
          : `<p class="hint">${esc(d.artist || 'HGWS')} · ${esc(d.src || '')}</p>${d.src ? `<audio controls preload="none" src="${esc(d.src)}" style="width:100%;max-width:360px;margin-top:.4rem"></audio>` : ''}`}
      </div></div>
      ${pub ? `<div class="apf"><input class="inp" data-note="${esc(s.id)}" placeholder="Megjegyzés (nem kötelező)…" maxlength="200"><button class="btn danger sm" data-rej="${esc(s.id)}">Elutasítás</button><button class="btn goldb sm" data-ok="${esc(s.id)}"><i class="ic ic-check"></i> Jóváhagyás</button></div>` : ''}</div>`;
  };
  const reqRow = r => {
    const u = C.U(r.target), by = C.U(r.by);
    return `<div class="apcard"><div class="aph"><span class="tg g"><i class="ic ic-crown"></i> RANGKÉRELEM</span><small>${avatar(by, 22)} <b>${esc(by.name)}</b> kérte · ${timeLabel(r.at)}</small></div>
      <div class="apb"><div style="display:flex;align-items:center;gap:.8rem">${avatar(u, 44)}<div><h4>${esc(u.name)}</h4>
        <p class="hint">${esc(roleOf(r.prev || 'user').label)} → <b style="color:${roleOf(r.role).color}">${esc(roleOf(r.role).label)}</b></p></div></div></div>
      <div class="apf"><button class="btn danger sm" data-rrej="${esc(r.id)}">Elutasítás</button><button class="btn goldb sm" data-rok="${esc(r.id)}"><i class="ic ic-check"></i> Jóváhagyás</button></div></div>`;
  };
  v.innerHTML = `<div class="page"><div class="eyebrow">// KEZELÉS</div>${tabs()}<h1 class="gold">Jóváhagyások</h1>
    <p class="lead">${own ? 'Itt látod az adminok rangkérelmeit és a szerkesztők film- és zenebeküldéseit.' : pub ? 'A szerkesztők film- és zenebeküldései. Jóváhagyás után azonnal megjelennek az oldalon.' : 'A beküldéseid és kérelmeid állapota.'}</p>
    ${own || reqs.length ? `<h2 class="aps"><i class="ic ic-crown"></i> Rangkérelmek <span class="cnt">${reqs.length}</span></h2>${reqs.length ? (own ? reqs.map(reqRow).join('') : reqs.map(r => `<div class="subrow"><span class="tg b"><i class="ic ic-hourglass"></i> VÁR</span><b>${esc(C.U(r.target).name)} → ${esc(roleOf(r.role).label)}</b><small>${timeLabel(r.at)}</small></div>`).join('')) : '<div class="empty sm">Nincs függő rangkérelem.</div>'}` : ''}
    ${pub || C.can('submitMedia') ? `<h2 class="aps"><i class="ic ic-clapperboard"></i> Film- és zenebeküldések <span class="cnt">${subs.length}</span></h2>${pub ? (subs.length ? subs.map(subRow).join('') : '<div class="empty sm">Nincs jóváhagyásra váró beküldés.</div>') : mySubs('film') + mySubs('music') || '<div class="empty sm">Még nem küldtél be semmit.</div>'}` : ''}
  </div>`;
  $$('[data-ok]', v).forEach(b => b.onclick = () => approve(subs.find(s => s.id === b.dataset.ok), b));
  $$('[data-rej]', v).forEach(b => b.onclick = async () => {
    const s = subs.find(x => x.id === b.dataset.rej), note = v.querySelector(`[data-note="${s.id}"]`)?.value.trim() || '';
    if (!await confirmBox(`Elutasítod: „${s.title}”?`, 'Elutasítás')) return;
    try { await FB.updateDoc(FB.doc(db, 'submissions', s.id), { status: 'rejected', reviewedBy: C.uid(), reviewedAt: FB.serverTimestamp(), note }); toast('Elutasítva');
      audit('media.reject', s.title, note); notify(s.by, 'reject', `Elutasítva: ${s.title}${note ? ' – „' + note + '”' : ''}`, '#/admin/jovahagyas'); } catch (e) { toast(errText(e), true); }
  });
  $$('[data-rok]', v).forEach(b => b.onclick = async () => {
    const r = reqs.find(x => x.id === b.dataset.rok); b.disabled = true;
    try {
      const bt = FB.writeBatch(db);
      bt.update(FB.doc(db, 'users', r.target), { role: r.role });
      bt.update(FB.doc(db, 'roleRequests', r.id), { status: 'approved', reviewedAt: FB.serverTimestamp() });
      await bt.commit(); toast(`${C.U(r.target).name} mostantól ${roleOf(r.role).label} ✓`);
      audit('role.approve', C.U(r.target).name, `→ ${roleOf(r.role).label} (kérte: ${C.U(r.by).name})`);
      notify(r.target, 'role', `Új rangot kaptál: ${roleOf(r.role).label} 👑`, '#/profil/' + r.target);
      notify(r.by, 'approve', `A tulaj jóváhagyta: ${C.U(r.target).name} → ${roleOf(r.role).label}`, '#/admin/tagok');
    } catch (e) { toast(errText(e), true); b.disabled = false; }
  });
  $$('[data-rrej]', v).forEach(b => b.onclick = async () => {
    const r = reqs.find(x => x.id === b.dataset.rrej);
    try { await FB.updateDoc(FB.doc(db, 'roleRequests', r.id), { status: 'rejected', reviewedAt: FB.serverTimestamp() }); toast('Rangkérelem elutasítva');
      audit('role.reject', C.U(r.target).name, `→ ${roleOf(r.role).label}`); notify(r.by, 'reject', `A tulaj elutasította: ${C.U(r.target).name} → ${roleOf(r.role).label}`, '#/admin/jovahagyas'); } catch (e) { toast(errText(e), true); }
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
        bt.set(FB.doc(db, 'videoSources', id), { youtube: s.src?.youtube || '', mp4: s.src?.mp4 || '', vtt: s.src?.vtt || '' });
        if (d.featured) C.S.videos.filter(x => x.featured && x.id !== id).forEach(x => bt.update(FB.doc(db, 'videos', x.id), { featured: false }));
      }
    } else {
      if (s.action === 'delete') bt.delete(FB.doc(db, 'music', s.targetId));
      else if (s.action === 'update' && C.S.music.some(x => x.id === s.targetId)) bt.update(FB.doc(db, 'music', s.targetId), { ...d, updatedAt: t });
      else bt.set(FB.doc(FB.collection(db, 'music')), { ...d, order: Math.max(-10, ...C.S.music.map(x => x.order || 0)) + 10, createdAt: t, updatedAt: t });
    }
    bt.update(FB.doc(db, 'submissions', s.id), { status: 'approved', reviewedBy: C.uid(), reviewedAt: t, note });
    await bt.commit(); toast('Jóváhagyva – kint van az oldalon ✓');
    audit('media.approve', s.title, `${TYPE[s.type]} · ${ACT[s.action]}`); notify(s.by, 'approve', `Jóváhagyva: ${s.title} ✓${note ? ' – „' + note + '”' : ''}`, s.type === 'film' && s.action !== 'delete' ? '#/tar' : '#/admin/jovahagyas');
  } catch (e) { toast(errText(e), true); btn.disabled = false; }
}

/* ================= RANGOK SZERKESZTÉSE (csak a tulaj) ================= */
function rolesPage(v) {
  C.setTitle('<i class="ic ic-crown"></i>', 'Rangok', 'Rangok létrehozása és módosítása');
  const count = k => [...C.S.users.values()].filter(u => C.roleKey(u) === k).length;
  v.innerHTML = `<div class="page"><div class="eyebrow">// KEZELÉS · CSAK A TULAJ</div>${tabs()}<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap">
    <div><h1 class="gold">Rangok</h1><p class="lead">Itt hozhatsz létre új rangokat, és módosíthatod a meglévők nevét, színét, szintjét és jogait. A <b>szint</b> dönti el, ki kit moderálhat: mindenki csak a nála alacsonyabb szintűeket. A <i class="ic ic-crown"></i> Tulaj rang a tiéd, be van égetve – senki nem módosíthatja.</p></div>
    <button class="btn goldb" id="newRole"><i class="ic ic-plus"></i> Új rang</button></div>
    <div class="atable" style="margin-top:1.2rem">${rolesSorted().map(([k, r]) => `<div class="arow">
      <span class="rdot" style="background:${esc(r.color)};box-shadow:0 0 12px ${esc(r.color)}"></span>
      <div class="who"><b style="color:${esc(r.color)}">${k === 'owner' ? '<i class="ic ic-crown"></i> ' : ''}${esc(r.label)}</b><small>Szint: ${r.rank} · ${count(k)} fő${SYSTEM_ROLES.includes(k) ? ' · alap rang' : ' · egyedi rang'}</small>
        <div class="permlist">${k === 'owner' ? '<span class="tg g">MINDEN JOG</span>' : PERMS.filter(([p]) => r.perms?.[p]).map(([, l]) => `<span class="tg">${esc(l)}</span>`).join('') || '<span class="hint">Nincs külön joga (csevegés, filmnézés, értékelés)</span>'}</div></div>
      <div class="ac">${k === 'owner' ? '<span class="tg g"><i class="ic ic-lock"></i> BEÉGETVE</span>' : `<button class="btn plain sm" data-redit="${k}"><i class="ic ic-pencil"></i> Szerkesztés</button>`}</div></div>`).join('')}</div></div>`;
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
      <label class="cpick" title="Egyéni szín"><input type="color" value="${esc(color)}"><i class="ic ic-palette"></i></label></div></div>
    <div class="field"><label>Jogok</label><div class="permpick">${PERMS.map(([p, l, h]) => `<label class="chk"><input type="checkbox" data-p="${p}" ${r.perms?.[p] ? 'checked' : ''}> <span><b>${esc(l)}</b>${h ? `<small>${esc(h)}</small>` : ''}</span></label>`).join('')}</div></div>
    <div class="field"><label>Előnézet</label><div class="tprev"><b data-pn>Locsoló Laci</b> <span data-prev></span></div></div>
    ${k === 'admin' ? '<p class="hint"><i class="ic ic-info"></i> Admin rangot mindig csak te (a tulaj) adhatsz.</p>' : ''}`,
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
    try { await FB.setDoc(FB.doc(db, 'roles', id), { name, color, rank, perms }); audit(k ? 'rank.edit' : 'rank.create', name, `szint ${rank} · ${Object.keys(perms).length} jog`); toast(k ? 'Rang mentve ✓' : 'Rang létrehozva ✓'); el.close(); } catch (e) { toast(errText(e), true); }
  };
  el.querySelector('[data-reset]')?.addEventListener('click', async () => {
    if (!await confirmBox(`Visszaállítod a(z) „${r.label}” rangot az alapértékekre?`, 'Visszaállítás', false)) return;
    try { await FB.deleteDoc(FB.doc(db, 'roles', k)); toast('Alapértékek visszaállítva'); el.close(); } catch (e) { toast(errText(e), true); }
  });
  el.querySelector('[data-del]')?.addEventListener('click', async () => {
    const users = [...C.S.users.values()].filter(u => u.role === k);
    if (!await confirmBox(`Törlöd a(z) „${r.label}” rangot?${users.length ? ` ${users.length} tag visszakerül sima Tag rangra.` : ''}`, 'Törlés')) return;
    try { const bt = FB.writeBatch(db); users.forEach(u => bt.update(FB.doc(db, 'users', u.id), { role: 'user' })); bt.delete(FB.doc(db, 'roles', k)); await bt.commit(); audit('rank.delete', r.label); toast('Rang törölve'); el.close(); }
    catch (e) { toast(errText(e), true); }
  });
}

/* ================= NAPLÓ (audit log) ================= */
const ACTIONS = {
  'role.set': ['<i class="ic ic-crown"></i>', 'Rangot adott', 'rang'], 'role.request': ['<i class="ic ic-send"></i>', 'Rangot kért', 'rang'], 'role.approve': ['<i class="ic ic-circle-check"></i>', 'Rangkérelmet jóváhagyott', 'rang'], 'role.reject': ['<i class="ic ic-x"></i>', 'Rangkérelmet elutasított', 'rang'],
  'rank.create': ['<i class="ic ic-sparkles"></i>', 'Rangot hozott létre', 'rang'], 'rank.edit': ['<i class="ic ic-pencil"></i>', 'Rangot módosított', 'rang'], 'rank.delete': ['<i class="ic ic-trash-2"></i>', 'Rangot törölt', 'rang'],
  'user.ban': ['<i class="ic ic-ban"></i>', 'Kitiltott', 'mod'], 'user.unban': ['<i class="ic ic-reply"></i>', 'Feloldotta a kitiltást', 'mod'], 'user.mute': ['<i class="ic ic-volume-x"></i>', 'Lenémított', 'mod'], 'user.unmute': ['<i class="ic ic-volume-2"></i>', 'Feloldotta a némítást', 'mod'], 'user.rename': ['<i class="ic ic-pencil"></i>', 'Átnevezett', 'mod'],
  'msg.delete': ['<i class="ic ic-trash-2"></i>', 'Üzenetet törölt', 'mod'],
  'tag.create': ['<i class="ic ic-tag"></i>', 'Taget hozott létre', 'tag'], 'tag.edit': ['<i class="ic ic-pencil"></i>', 'Taget módosított', 'tag'], 'tag.delete': ['<i class="ic ic-trash-2"></i>', 'Taget törölt', 'tag'], 'tag.assign': ['<i class="ic ic-tag"></i>', 'Tageket osztott', 'tag'],
  'film.create': ['<i class="ic ic-clapperboard"></i>', 'Filmet adott hozzá', 'media'], 'film.edit': ['<i class="ic ic-pencil"></i>', 'Filmet módosított', 'media'], 'film.delete': ['<i class="ic ic-trash-2"></i>', 'Filmet törölt', 'media'],
  'music.create': ['<i class="ic ic-music"></i>', 'Zenét adott hozzá', 'media'], 'music.edit': ['<i class="ic ic-pencil"></i>', 'Zenét módosított', 'media'], 'music.delete': ['<i class="ic ic-trash-2"></i>', 'Zenét törölt', 'media'],
  'media.submit': ['<i class="ic ic-share-2"></i>', 'Beküldött', 'media'], 'media.approve': ['<i class="ic ic-circle-check"></i>', 'Beküldést jóváhagyott', 'media'], 'media.reject': ['<i class="ic ic-x"></i>', 'Beküldést elutasított', 'media'],
  'channel.create': ['<i class="ic ic-message-circle"></i>', 'Csatornát hozott létre', 'chan'], 'channel.edit': ['<i class="ic ic-pencil"></i>', 'Csatornát módosított', 'chan'], 'channel.delete': ['<i class="ic ic-trash-2"></i>', 'Csatornát törölt', 'chan'],
  'idea.status': ['<i class="ic ic-lightbulb"></i>', 'Ötlet állapotát állította', 'idea'], 'arcade.champion': ['<i class="ic ic-trophy"></i>', 'Heti Arcade-bajnok', 'tag']
};
const AGROUPS = [['', 'Mind'], ['rang', '<i class="ic ic-crown"></i> Rangok'], ['mod', '<i class="ic ic-shield"></i> Moderálás'], ['tag', '<i class="ic ic-tag"></i> Tagek'], ['media', '<i class="ic ic-clapperboard"></i> Filmek, zenék'], ['chan', '<i class="ic ic-message-circle"></i> Csatornák'], ['idea', '<i class="ic ic-lightbulb"></i> Ötletek']];
const LOG = { items: [], at: 0, grp: '', q: '' };
async function auditPage(v, again) {
  C.setTitle('<i class="ic ic-scroll-text"></i>', 'Napló', 'Ki mit csinált a kezelőfelületen');
  if (!again || Date.now() - LOG.at > 30000) {
    try { const s = await FB.getDocs(FB.query(FB.collection(db, 'audit'), FB.orderBy('at', 'desc'), FB.limit(400))); LOG.items = s.docs.map(d => ({ id: d.id, ...d.data() })); LOG.at = Date.now(); }
    catch (e) { v.innerHTML = `<div class="page">${tabs()}<p class="hint">${esc(errText(e))}</p></div>`; return; }
    if (current !== 'naplo') return;
  }
  const q = LOG.q.toLowerCase();
  const list = LOG.items.filter(x => (!LOG.grp || ACTIONS[x.action]?.[2] === LOG.grp) && (!q || [C.U(x.by).name, x.target, x.detail, ACTIONS[x.action]?.[1]].join(' ').toLowerCase().includes(q)));
  const focus = document.activeElement?.id === 'lq';
  let day = '';
  v.innerHTML = `<div class="page"><div class="eyebrow">// KEZELÉS</div>${tabs()}<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap">
    <div><h1 class="gold">Napló</h1><p class="lead">Minden kezelési művelet: rangok, moderálás, tagek, filmek, csatornák. Csak a tulaj és az adminok látják, és senki nem törölheti.</p></div>
    <button class="btn plain" id="lr"><i class="ic ic-refresh-cw"></i> Frissítés</button></div>
    <div class="lfil"><div class="ifilt">${AGROUPS.map(([k, l]) => `<button data-g="${k}" class="${LOG.grp === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="search" style="max-width:300px;margin:0"><input type="search" id="lq" placeholder="Keresés (név, cél, részlet)…" value="${esc(LOG.q)}"></div></div>
    <div class="logl">${list.length ? list.map(x => {
      const a = ACTIONS[x.action] || ['•', x.action], u = C.U(x.by), t = toDate(x.at), d = t ? t.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) : '';
      const head = d !== day ? `<div class="lday">${esc(d)}</div>` : ''; day = d;
      return `${head}<div class="lrow"><time>${t ? t.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' }) : ''}</time><span class="lic">${a[0]}</span>
        <div><span data-u="${esc(u.id)}" class="lwho">${avatar(u, 22)} <b>${esc(u.name)}</b></span> ${esc(a[1].toLowerCase())}${x.target ? `: <b>${esc(x.target)}</b>` : ''}${x.detail ? `<small>${esc(x.detail)}</small>` : ''}</div></div>`;
    }).join('') : '<div class="empty sm">Nincs bejegyzés.</div>'}</div></div>`;
  $('#lr').onclick = () => { LOG.at = 0; auditPage(v, true); };
  $$('[data-g]', v).forEach(b => b.onclick = () => { LOG.grp = b.dataset.g; auditPage(v, true); });
  const lq = $('#lq'); lq.oninput = () => { LOG.q = lq.value; auditPage(v, true); };
  if (focus) { lq.focus(); lq.setSelectionRange(lq.value.length, lq.value.length); }
}

/* ================= STATISZTIKA ================= */
const DAY = 864e5;
/* vízszintes sávdiagram – egy sorozat, közvetlen címkék, hover-tooltip */
const hbars = (rows, unit = '') => { const max = Math.max(1, ...rows.map(r => r[1]));
  return `<div class="hb">${rows.map(([l, n, c]) => `<div class="hbr" title="${esc(l)}: ${n.toLocaleString('hu-HU')}${unit}"><span class="hbl">${l}</span><span class="hbt"><i style="width:${Math.max(n ? 2 : 0, n / max * 100)}%;${c ? `background:${c}` : ''}"></i></span><b>${n.toLocaleString('hu-HU')}</b></div>`).join('')}</div>`; };
async function statsPage(v) {
  C.setTitle('<i class="ic ic-chart-column"></i>', 'Statisztika');
  const users = [...C.S.users.values()], now = Date.now();
  const seen = u => toDate(u.lastSeen)?.getTime() || 0, born = u => toDate(u.createdAt)?.getTime() || 0;
  const act = d => users.filter(u => now - seen(u) < d * DAY).length;
  const online = users.filter(u => isOnline(u) && !u.banned).length;
  // regisztrációk az elmúlt 30 napban (napi oszlopok)
  const days = [...Array(30)].map((_, i) => { const d0 = new Date(); d0.setHours(0, 0, 0, 0); return d0.getTime() - (29 - i) * DAY; });
  const reg = days.map(d0 => users.filter(u => born(u) >= d0 && born(u) < d0 + DAY).length), regMax = Math.max(1, ...reg);
  const roles = rolesSorted().map(([k, r]) => [esc(r.label), users.filter(u => C.roleKey(u) === k).length, r.color]).filter(r => r[1]);
  const vids = C.S.videos;
  v.innerHTML = `<div class="page"><div class="eyebrow">// KEZELÉS</div>${tabs()}<h1 class="gold">Statisztika</h1><p class="lead">A HGWS közösség és a filmek számokban.</p>
    <div class="stiles">
      <div class="stile"><small>TAGOK</small><b>${users.length}</b><span>${users.filter(u => now - born(u) < 7 * DAY).length} új a héten</span></div>
      <div class="stile"><small>MOST ONLINE</small><b>${online}</b><span>${act(1)} aktív ma</span></div>
      <div class="stile"><small>AKTÍV 7 / 30 NAP</small><b>${act(7)} <em>/ ${act(30)}</em></b><span>legalább egyszer belépett</span></div>
      <div class="stile"><small>FILMEK</small><b>${vids.filter(x => !x.soon).length}</b><span>+ ${vids.filter(x => x.soon).length} hamarosan</span></div>
      <div class="stile"><small>ÉRTÉKELÉSEK</small><b id="stR">…</b><span id="stRa">&nbsp;</span></div>
      <div class="stile"><small>MEGTEKINTÉSEK</small><b id="stV">…</b><span>összesen</span></div>
    </div>
    <div class="sgrid">
      <section class="sbox wide"><h3>Új regisztrációk – elmúlt 30 nap</h3>
        ${reg.some(Boolean) ? `<div class="cols">${reg.map((n, i) => `<div class="col" title="${new Date(days[i]).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}: ${n} új tag"><i style="height:${n / regMax * 100}%"></i></div>`).join('')}</div>
        <div class="colx"><span>${new Date(days[0]).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}</span><span>ma</span></div>`
        : `<div class="estate"><i class="ic ic-users"></i><b>Az elmúlt 30 napban nem volt új regisztráció</b><span>Amint valaki csatlakozik, itt napi bontásban látod.</span></div>`}</section>
      <section class="sbox"><h3>Legnézettebb filmek</h3><div id="stTop"><div class="skl"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div></div></section>
      <section class="sbox"><h3>Legjobbra értékelt filmek</h3><div id="stRate"><div class="skl"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div></div></section>
      <section class="sbox"><h3>Tagok rangok szerint</h3>${hbars(roles, ' fő')}</section>
      <section class="sbox"><h3>Ötletek állapota</h3><div id="stIdea"><div class="skl"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div></div></section>
      <section class="sbox"><h3>Arcade – játékosok száma</h3><div id="stArc"><div class="skl"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div></div></section>
    </div></div>`;
  const name = id => esc(vids.find(x => x.id === id)?.title || id);
  FB.getDocs(FB.collection(db, 'views')).then(s => {
    const l = s.docs.map(d => [d.id, d.data().n || 0]).sort((a, b) => b[1] - a[1]);
    $('#stV').textContent = l.reduce((a, b) => a + b[1], 0).toLocaleString('hu-HU');
    $('#stTop').innerHTML = l.length ? hbars(l.slice(0, 8).map(([id, n]) => [name(id), n]), ' megtekintés') : '<div class="estate"><i class="ic ic-eye"></i><b>Még nincs megtekintés</b><span>A nézéseket mostantól számoljuk.</span></div>';
  }).catch(() => { $('#stV').textContent = '–'; $('#stTop').innerHTML = '<p class="hint">Nem elérhető.</p>'; });
  FB.getDocs(FB.collectionGroup(db, 'ratings')).then(s => {
    const sum = {}, n = {}; let all = 0;
    s.docs.forEach(d => { const id = d.ref.parent.parent?.id, x = d.data().stars; if (!id || !x) return; sum[id] = (sum[id] || 0) + x; n[id] = (n[id] || 0) + 1; all += x; });
    $('#stR').textContent = s.size.toLocaleString('hu-HU'); $('#stRa').textContent = s.size ? `átlag ★ ${(all / s.size).toFixed(1).replace('.', ',')}` : 'még nincs';
    const l = Object.keys(sum).map(id => [id, sum[id] / n[id], n[id]]).sort((a, b) => b[1] - a[1] || b[2] - a[2]).slice(0, 8);
    $('#stRate').innerHTML = l.length ? `<div class="hb">${l.map(([id, a, c]) => `<div class="hbr" title="${name(id)}: ${a.toFixed(2)} (${c} értékelés)"><span class="hbl">${name(id)}</span><span class="hbt"><i style="width:${a / 5 * 100}%"></i></span><b>★ ${a.toFixed(1).replace('.', ',')}</b></div>`).join('')}</div>` : '<p class="hint">Még nincs értékelés.</p>';
  }).catch(() => { $('#stR').textContent = '–'; $('#stRate').innerHTML = '<p class="hint">Nem elérhető.</p>'; });
  FB.getDocs(FB.collection(db, 'ideas')).then(s => {
    const st = { nyitott: ['Nyitott', '#6cc6ff'], folyamatban: ['Folyamatban', '#ffa94d'], kesz: ['Kész', '#5ee08a'], elutasitva: ['Elutasítva', '#ff7a6e'] };
    $('#stIdea').innerHTML = s.size ? hbars(Object.entries(st).map(([k, [l, c]]) => [l, s.docs.filter(d => d.data().status === k).length, c]), ' db') : '<div class="estate"><i class="ic ic-lightbulb"></i><b>Még nincs beküldött ötlet</b></div>';
  }).catch(() => { $('#stIdea').innerHTML = '<p class="hint">Nem elérhető.</p>'; });
  import('./browse.js?v=202611230454').then(({ GAMES }) => Promise.all(GAMES.map(g => FB.getDocs(lbScores(g.id)).then(s => [g.name, s.size]).catch(() => [g.name, 0]))))
    .then(l => { $('#stArc').innerHTML = hbars(l, ' játékos'); });
}
const lbScores = g => FB.collection(db, 'leaderboards', g, 'scores');
