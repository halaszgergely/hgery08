// HGWS – értesítések (csengő a felső sávban): megemlítés, ötlet-válasz, jóváhagyás, rang, tag, premier, közös nézés
import { FB, db, $, esc, timeLabel, toDate, toast, blip } from './core.js?v=202611210056';
import { popover, closePop } from './ui.js?v=202611210056';

let C = null, list = [], first = true, open = false;
export const ICON = { mention: 'message-circle', idea: 'lightbulb', approve: 'circle-check', reject: 'x', role: 'crown', tag: 'tag', premiere: 'clapperboard', party: 'popcorn', vote: 'thumbs-up', badge: 'award', friend: 'user-plus' };
export function init(ctx) { C = ctx; }

export function start() {
  const btn = $('#bellBtn'); if (!btn) return;
  btn.hidden = false;
  btn.onclick = () => show(btn);
  FB.onSnapshot(FB.query(FB.collection(db, 'users', C.uid(), 'notifs'), FB.orderBy('at', 'desc'), FB.limit(60)), s => {
    const before = new Set(list.map(n => n.id));
    list = s.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
    const fresh = list.filter(n => !n.read && !before.has(n.id));
    if (!first && fresh.length) {
      const n = fresh[0];
      blip();
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        try { const x = new Notification('HGWS', { body: n.text, icon: 'img/icon.png', tag: 'hgws-' + n.id }); x.onclick = () => { focus(); go(n); x.close(); }; } catch (_) {}
      } else if (n.type !== 'badge') toast(n.text);   // a kitüntetésnek saját felugró kártyája van
    }
    first = false; badge();
    if (open) draw();
  }, e => console.warn('értesítések', e));
}
const unread = () => list.filter(n => !n.read).length;
function badge() {
  const n = unread(), b = $('#bellBadge'); if (!b) return;
  b.hidden = !n; b.textContent = n > 9 ? '9+' : n;
}
function go(n) {
  if (!n.read) FB.updateDoc(FB.doc(db, 'users', C.uid(), 'notifs', n.id), { read: true }).catch(() => {});
  if (n.link) location.hash = n.link;
}
let pop = null;
function show(anchor) {
  pop = popover(anchor, '<div class="npop"></div>', 'npopw');
  open = true; draw();
  const r = anchor.getBoundingClientRect();
  pop.style.left = Math.max(8, Math.min(innerWidth - pop.offsetWidth - 8, r.right - pop.offsetWidth)) + 'px';
  pop.style.top = r.bottom + 8 + 'px';
  new MutationObserver((m, o) => { if (!pop.isConnected) { open = false; o.disconnect(); } }).observe(document.body, { childList: true });
}
function draw() {
  const box = pop?.querySelector('.npop'); if (!box) return;
  box.innerHTML = `<div class="nh"><b>Értesítések</b>${unread() ? '<button data-all>Mind olvasott</button>' : ''}${list.some(n => n.read) ? '<button data-clr>Olvasottak törlése</button>' : ''}</div>
    <div class="nl">${list.length ? list.map(n => { const u = n.by ? C.U(n.by) : null;
      return `<button class="ni${n.read ? '' : ' un'}" data-n="${esc(n.id)}"><span class="nic"><i class="ic ic-${ICON[n.type] || 'bell'}"></i></span><span class="nt"><span>${esc(n.text)}</span><small>${u && n.by !== C.uid() ? esc(u.name) + ' · ' : ''}${timeLabel(n.at)}</small></span>${n.read ? '' : '<i class="nd"></i>'}</button>`; }).join('')
      : '<div class="ne"><i class="ic ic-bell-off"></i><br>Nincs értesítésed.</div>'}</div>`;
  box.onclick = async e => {
    const it = e.target.closest('[data-n]');
    if (it) { const n = list.find(x => x.id === it.dataset.n); closePop(); open = false; if (n) go(n); return; }
    if (e.target.closest('[data-all]')) {
      const b = FB.writeBatch(db); list.filter(n => !n.read).forEach(n => b.update(FB.doc(db, 'users', C.uid(), 'notifs', n.id), { read: true }));
      await b.commit().catch(() => {});
    }
    if (e.target.closest('[data-clr]')) {
      const b = FB.writeBatch(db); list.filter(n => n.read).forEach(n => b.delete(FB.doc(db, 'users', C.uid(), 'notifs', n.id)));
      await b.commit().catch(() => {});
    }
  };
}
