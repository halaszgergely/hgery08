// HGWS – barátrendszer: barátkérelem név alapján, privát üzenet csak barátnak.
// Adat: friends/{a_b} (a két uid ábécérendben) = { users:[a,b], from, to, status:'pending'|'accepted', createdAt, acceptedAt? }
import { FB, db, $, esc, avatar, isOnline, timeLabel, toast, errText, notify, blip } from './core.js?v=202611252025';
import { confirmBox, popover, closePop } from './ui.js?v=202611252025';

let C = null;
export const F = new Map();            // másik uid → kapcsolat dokumentum
let loaded = false;
export function init(ctx) { C = ctx; }
const me = () => C.uid();
export const pairId = (a, b) => [a, b].sort().join('_');
const other = d => d.users.find(x => x !== me());

/* ---------- állapot ---------- */
export const state = id => { const d = F.get(id); if (!d) return 'none'; if (d.status === 'accepted') return 'friend'; return d.from === me() ? 'out' : 'in'; };
export const isFriend = id => state(id) === 'friend';
export const friends = () => [...F.values()].filter(d => d.status === 'accepted').map(d => C.U(other(d))).filter(u => !u.banned);
export const incoming = () => [...F.values()].filter(d => d.status === 'pending' && d.to === me());
export const outgoing = () => [...F.values()].filter(d => d.status === 'pending' && d.from === me());
export const pendingCount = () => incoming().length;

export function watch() {
  FB.onSnapshot(FB.query(FB.collection(db, 'friends'), FB.where('users', 'array-contains', me())), s => {
    const first = !loaded; loaded = true;
    s.docChanges().forEach(c => {
      const d = { id: c.doc.id, ...c.doc.data() }, o = other(d);
      if (c.type === 'removed') { F.delete(o); return; }
      const was = F.get(o); F.set(o, d);
      if (first || c.doc.metadata.hasPendingWrites) return;
      if (d.status === 'pending' && d.to === me() && !was) { blip(); toast(`👋 ${C.U(o).name} barátnak jelölt`); }
      if (d.status === 'accepted' && was?.status === 'pending' && d.from === me()) { blip(); toast(`🤝 ${C.U(o).name} elfogadta a barátkérelmedet`); }
    });
    C.changed();
  }, e => console.warn('barátok', e));
}

/* ---------- műveletek ---------- */
export async function request(id) {
  const st = state(id);
  if (id === me()) throw 'Saját magadat nem jelölheted be. 🙂';
  if (st === 'friend') throw `${C.U(id).name} már a barátod.`;
  if (st === 'out') throw `Már küldtél kérelmet neki: ${C.U(id).name}.`;
  if (st === 'in') return accept(id);
  if (outgoing().length >= 25) throw 'Túl sok elküldött kérelmed vár válaszra (max. 25). Várj, amíg elfogadják őket.';
  await FB.setDoc(FB.doc(db, 'friends', pairId(me(), id)), { users: [me(), id].sort(), from: me(), to: id, status: 'pending', createdAt: FB.serverTimestamp() });
  notify(id, 'friend', `${C.S.me.name} barátnak jelölt. Fogadd el, hogy üzenhessetek egymásnak!`, '#/baratok/fuggoben');
  return 'sent';
}
export async function accept(id) {
  await FB.updateDoc(FB.doc(db, 'friends', pairId(me(), id)), { status: 'accepted', acceptedAt: FB.serverTimestamp() });
  notify(id, 'friend', `${C.S.me.name} elfogadta a barátkérelmedet – mostantól üzenhettek egymásnak.`, '#/u/' + me());
  return 'accepted';
}
export const remove = id => FB.deleteDoc(FB.doc(db, 'friends', pairId(me(), id)));

/* név alapján: pontos egyezés (kis/nagybetű mindegy). Több azonos nevű tagnál választani kell. */
export function findByName(q) {
  const n = q.trim().replace(/^@/, '').toLowerCase();
  return [...C.S.users.values()].filter(u => !u.banned && (u.name || '').toLowerCase() === n);
}

/* gomb egy tag mellé (profil kártya, profiloldal) */
export function actionHtml(id, cls = 'btn sm') {
  const st = state(id), pb = cls === 'pbtn', K = { primary: pb ? 'play' : 'primary', goldb: pb ? 'gold' : 'goldb', plain: pb ? 'info' : 'plain' };
  cls = pb ? 'pbtn' : cls;
  if (st === 'friend') return `<a class="${cls} ${K.primary}" href="#/u/${esc(id)}" data-fr="msg"><i class="ic ic-message-circle"></i> Üzenet</a>`;
  if (st === 'in') return `<button class="${cls} ${K.goldb}" data-fr="accept" data-id="${esc(id)}"><i class="ic ic-user-check"></i> Elfogadás</button>`;
  if (st === 'out') return `<button class="${cls} ${K.plain}" data-fr="cancel" data-id="${esc(id)}" title="Kérelem visszavonása"><i class="ic ic-clock-arrow-up"></i> Kérelem elküldve</button>`;
  return `<button class="${cls} ${K.plain}" data-fr="add" data-id="${esc(id)}"><i class="ic ic-user-plus"></i> Barátnak jelölés</button>`;
}
/* data-fr gombok kezelése bárhol */
export async function onAction(e) {
  const b = e.target.closest('[data-fr]'); if (!b || b.dataset.fr === 'msg') return false;
  e.preventDefault(); const id = b.dataset.id, n = C.U(id).name;
  b.disabled = true;
  try {
    if (b.dataset.fr === 'add') { await request(id); toast(`Barátkérelem elküldve: ${n} ✓`); }
    if (b.dataset.fr === 'accept') { await accept(id); toast(`${n} mostantól a barátod 🤝`); }
    if (b.dataset.fr === 'decline') { await remove(id); toast('Kérelem elutasítva'); }
    if (b.dataset.fr === 'cancel') { if (!await confirmBox(`Visszavonod a barátkérelmet (${n})?`, 'Visszavonás')) { b.disabled = false; return true; } await remove(id); toast('Kérelem visszavonva'); }
    if (b.dataset.fr === 'unfriend') { if (!await confirmBox(`Biztosan eltávolítod ${n} nevű barátodat? Utána nem tudtok egymásnak privátban írni, amíg újra be nem jelölitek egymást.`, 'Eltávolítás')) { b.disabled = false; return true; } await remove(id); toast(`${n} eltávolítva a barátaid közül`); }
  } catch (err) { toast(typeof err === 'string' ? err : errText(err), true); }
  b.disabled = false; closePop?.();
  return true;
}

/* ===================== BARÁTOK OLDAL ===================== */
const TABS = [['online', 'Online'], ['osszes', 'Összes'], ['fuggoben', 'Függőben'], ['hozzaadas', 'Barát hozzáadása']];
let addState = null;   // { kind: 'ok'|'err'|'pick', text, list }

export function render(tab = 'online') {
  if (!TABS.some(t => t[0] === tab)) tab = 'online';
  C.setTitle('<i class="ic ic-users"></i>', 'Barátok');
  const pc = pendingCount();
  $('#mActs').innerHTML = `<nav class="frtabs">${TABS.map(([k, l]) => `<a href="#/baratok/${k}" class="${k === tab ? 'on' : ''}${k === 'hozzaadas' ? ' add' : ''}">${k === 'hozzaadas' ? '<i class="ic ic-user-plus"></i> <span class="lg">Barát hozzáadása</span><span class="sm">Hozzáadás</span>' : l}${k === 'fuggoben' && pc ? `<span class="frc">${pc}</span>` : ''}</a>`).join('')}</nav>`;
  const view = $('#view');
  const keep = tab === 'hozzaadas' && $('#frq') ? $('#frq').value : null;
  view.innerHTML = `<div class="page frpage">${tab === 'hozzaadas' ? addHtml() : listHtml(tab)}</div>`;
  if (tab === 'hozzaadas') bindAdd(keep); else bindList(tab);
}

function row(u, sub, acts) {
  return `<div class="frrow" data-open="${esc(u.id)}"><span class="avw">${avatar(u, 40)}<i class="on${isOnline(u) ? ' y' : ''}"></i></span>
    <div class="who"><b data-u="${esc(u.id)}">${esc(u.name)}</b>${C.roleBadge(u)}<small>${sub}</small></div><div class="fac">${acts}</div></div>`;
}
const status = u => isOnline(u) ? '<span class="odot"></span>Online' : u.lastSeen ? 'Utoljára ' + esc(timeLabel(u.lastSeen)) : 'Offline';
const ib = (fr, id, ic, t, cls = '') => `<button class="fib${cls}" data-fr="${fr}" data-id="${esc(id)}" title="${t}" aria-label="${t}"><i class="ic ic-${ic}"></i></button>`;

function listHtml(tab) {
  const q = (C.S.frq || '').toLowerCase();
  if (tab === 'fuggoben') {
    const inc = incoming(), out = outgoing();
    if (!inc.length && !out.length) return empty('clock', 'Nincs függőben lévő kérelem', 'Itt látod majd, ha valaki barátnak jelöl, vagy ha a te kérelmed még válaszra vár.');
    const sec = (t, l, f) => l.length ? `<div class="frh">${t} — ${l.length}</div>${l.map(f).join('')}` : '';
    return search() + sec('Bejövő', inc, d => { const u = C.U(d.from); return row(u, 'Barátnak jelölt · ' + esc(timeLabel(d.createdAt)), ib('accept', u.id, 'check', 'Elfogadás', ' ok') + ib('decline', u.id, 'x', 'Elutasítás', ' no')); })
      + sec('Elküldött', out, d => { const u = C.U(d.to); return row(u, 'Válaszra vár · ' + esc(timeLabel(d.createdAt)), ib('cancel', u.id, 'x', 'Visszavonás', ' no')); });
  }
  let l = friends().sort((a, b) => (isOnline(b) - isOnline(a)) || a.name.localeCompare(b.name, 'hu'));
  if (tab === 'online') l = l.filter(isOnline);
  const all = l.length;
  if (q) l = l.filter(u => u.name.toLowerCase().includes(q));
  if (!all) return tab === 'online' && friends().length
    ? empty('users', 'Most egy barátod sincs online', 'Amint valaki fellép, itt látod – addig nézz körül a filmtárban.')
    : empty('user-plus', 'Még nincsenek barátaid', 'Privát üzenetet csak barátnak írhatsz. Jelöld be őket a felhasználónevük alapján!', '<a class="btn goldb" href="#/baratok/hozzaadas"><i class="ic ic-user-plus"></i> Barát hozzáadása</a>');
  return search() + `<div class="frh">${tab === 'online' ? 'Online' : 'Összes barát'} — ${l.length}</div>`
    + (l.map(u => row(u, status(u), `<a class="fib" href="#/u/${esc(u.id)}" title="Üzenet" aria-label="Üzenet"><i class="ic ic-message-circle"></i></a>${ib('more', u.id, 'ellipsis-vertical', 'Továbbiak')}`)).join('') || '<p class="hint" style="padding:1rem .4rem">Nincs találat.</p>');
}
const search = () => `<div class="search frs"><input type="search" id="frf" placeholder="Keresés…" value="${esc(C.S.frq || '')}"></div>`;
const empty = (ic, h, p, btn = '') => `<div class="frempty"><div class="big"><i class="ic ic-${ic}"></i></div><h3>${h}</h3><p>${p}</p>${btn}</div>`;

function bindList(tab) {
  const v = $('#view');
  const i = $('#frf'); if (i) i.oninput = () => { C.S.frq = i.value; render(tab); const n = $('#frf'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  v.onclick = async e => {
    const more = e.target.closest('[data-fr="more"]');
    if (more) {
      e.preventDefault(); const id = more.dataset.id;
      popover(more, `<div class="frmenu"><a href="#/u/${esc(id)}"><i class="ic ic-message-circle"></i> Üzenet küldése</a><a href="#/profil/${esc(id)}"><i class="ic ic-user"></i> Profil megnyitása</a><hr><button class="dang" data-fr="unfriend" data-id="${esc(id)}"><i class="ic ic-user-minus"></i> Barát eltávolítása</button></div>`);
      return;
    }
    if (e.target.closest('[data-fr]')) return;
    const r = e.target.closest('[data-open]');
    if (r && !e.target.closest('a,button,[data-u]') && isFriend(r.dataset.open)) location.hash = '#/u/' + r.dataset.open;
  };
}

function addHtml() {
  const st = addState;
  return `<section class="fradd"><h2>Barát hozzáadása</h2><p>Add meg a barátod <b>pontos felhasználónevét</b>. Ha elfogadja a kérelmet, írhattok egymásnak privátban.</p>
    <form class="frbox${st ? ' ' + st.kind : ''}" id="frform" autocomplete="off"><i class="ic ic-user-round-search"></i><input id="frq" maxlength="32" placeholder="Felhasználónév, pl. Locsolómester" spellcheck="false">
      <button class="btn goldb" id="frgo" disabled>Kérelem küldése</button></form>
    <div class="frmsg" id="frmsg">${st && st.kind !== 'pick' ? `<i class="ic ic-${st.kind === 'ok' ? 'circle-check' : 'triangle-alert'}"></i><span>${st.text}</span>` : ''}</div>
    ${st?.kind === 'pick' ? `<div class="frh">Több tag is ezt a nevet használja – válaszd ki, kit jelölsz:</div>${st.list.map(u => row(u, status(u), actionHtml(u.id))).join('')}` : ''}
    <div class="frme"><span>A te felhasználóneved:</span><b>${esc(C.S.me.name)}</b><button class="btn plain sm" id="frcopy"><i class="ic ic-copy"></i> Másolás</button><small>Ezt add meg a barátaidnak, hogy be tudjanak jelölni.</small></div></section>
    <section class="frtips"><div><i class="ic ic-shield-check"></i><b>Csak barátok írhatnak</b><span>Idegen nem tud privát üzenetet küldeni neked – csak az, akinek elfogadtad a kérelmét.</span></div>
      <div><i class="ic ic-users"></i><b>Csoportok</b><span>Csoportba is csak a barátaidat hívhatod meg.</span></div>
      <div><i class="ic ic-user-minus"></i><b>Bármikor eltávolíthatod</b><span>A barátok listájában a ⋮ menüből – ezzel a privát üzenetek is lezárulnak.</span></div></section>`;
}
function bindAdd(keep) {
  const f = $('#frform'), q = $('#frq'), go = $('#frgo');
  if (keep != null) q.value = keep;
  const upd = () => { go.disabled = q.value.trim().length < 2; };
  q.oninput = () => { if (addState && addState.kind !== 'pick') { addState = null; f.className = 'frbox'; $('#frmsg').innerHTML = ''; } upd(); };
  upd(); q.focus();
  $('#frcopy').onclick = () => navigator.clipboard?.writeText(C.S.me.name).then(() => toast('Név kimásolva ✓'), () => {});
  f.onsubmit = async e => {
    e.preventDefault(); const name = q.value.trim(); if (name.length < 2) return;
    const list = findByName(name).filter(u => u.id !== me());
    const self = findByName(name).some(u => u.id === me());
    const set = (kind, text, l) => { addState = { kind, text, list: l }; render('hozzaadas'); };
    if (!list.length) return set('err', self ? 'Ez a te neved. 🙂 Írd be a barátod nevét!' : `Nincs <b>${esc(name)}</b> nevű tag. Ellenőrizd a nevet – a pontos felhasználónév kell (a kis- és nagybetű mindegy).`);
    if (list.length > 1) return set('pick', '', list);
    const u = list[0]; go.disabled = true;
    try { const r = await request(u.id); q.value = ''; set('ok', r === 'accepted' ? `<b>${esc(u.name)}</b> már téged is bejelölt – mostantól barátok vagytok! 🤝` : `Kérelem elküldve neki: <b>${esc(u.name)}</b>. Amint elfogadja, írhattok egymásnak.`); }
    catch (err) { set('err', esc(typeof err === 'string' ? err : errText(err))); }
  };
  $('#view').onclick = null;
}
export function resetAdd() { addState = null; }
