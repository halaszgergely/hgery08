// HGWS – gyorskereső (Ctrl+K vagy /): filmek, zenék, tagok és oldalak egy helyen, billentyűzettel is
import { $, esc, avatar } from './core.js?v=202611210024';
import { bgOf, I } from './fx.js?v=202611210024';

let C = null, el = null, items = [], cur = 0;
export function init(ctx) {
  C = ctx;
  addEventListener('hashchange', () => close());
  addEventListener('keydown', e => {
    const typing = e.target.closest?.('input,textarea,[contenteditable]');
    if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); el ? close() : open(); }
    else if (e.key === '/' && !typing && !el) { e.preventDefault(); open(); }
  });
}
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function mark(text, q) {
  const t = String(text || ''), i = q ? norm(t).indexOf(q) : -1;
  return i < 0 ? esc(t) : esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length));
}
function pages() {
  const S = C.S, g = !!S.guest, l = [
    ['Főoldal', 'house', '#/'], ['Filmtár', 'clapperboard', '#/tar'], ['Zene', 'music', '#/zene'], ['Arcade', 'gamepad-2', '#/arcade'],
    ['Saját lista', 'plus', '#/lista'], ['Kapcsolat', 'mail', '#/kapcsolat']];
  if (!g) l.push(['Ötletek', 'lightbulb', '#/otletek'], ['Közösség', 'users', '#/chat'], ['Üzenetek', 'message-circle', '#/dm'], ['Barátok', 'users', '#/baratok'], ['Barát hozzáadása', 'user-plus', '#/baratok/hozzaadas'],
    ['Profilom', 'circle-user', '#/profil/' + C.uid()], ['Beállítások', 'settings', () => C.settings()]);
  if (!g && C.isStaff()) l.push(['Kezelés', 'shield', '#/admin']);
  if (!g && (C.isOwner() || C.can('publishMedia'))) l.push(['Statisztika', 'chart-column', '#/admin/stat']);
  if (!g && (C.isOwner() || C.can('assignRoles'))) l.push(['Napló', 'scroll-text', '#/admin/naplo']);
  return l.map(([t, ic, go]) => ({ t, ic, go, k: 'page' }));
}
function build(qRaw) {
  const q = norm(qRaw).trim(), S = C.S, out = [];
  const hit = (...f) => !q || f.some(x => norm(x).includes(q));
  const vids = S.videos.filter(v => v.visible !== false && hit(v.title, v.en, v.genre, v.kind, v.year)).slice(0, q ? 6 : 4)
    .map(v => ({ k: 'film', v, t: v.title, go: '#/film/' + v.id }));
  const mus = S.music.filter(t => t.visible !== false && q && hit(t.title, t.artist)).slice(0, 4).map(t => ({ k: 'music', m: t, t: t.title, go: () => C.playTrack(t.id) }));
  const ppl = S.guest || !q ? [] : [...S.users.values()].filter(u => !u.banned && hit(u.name)).slice(0, 5).map(u => ({ k: 'user', u, t: u.name, go: '#/profil/' + u.id }));
  const pg = pages().filter(p => hit(p.t)).slice(0, q ? 5 : 8);
  if (q) { if (pg.length && norm(pg[0].t).startsWith(q)) out.push(['Oldalak', pg]); }
  if (vids.length) out.push([q ? 'Filmek' : 'Filmek, sorozatok', vids]);
  if (mus.length) out.push(['Zenék', mus]);
  if (ppl.length) out.push(['Tagok', ppl]);
  if (pg.length && !(q && norm(pg[0].t).startsWith(q))) out.push(['Oldalak', pg]);
  return { q, groups: out };
}
function row(x, q, i) {
  let th, sub;
  if (x.k === 'film') { const b = bgOf(x.v.poster || x.v.banner, x.v.id + x.v.title); th = `<span class="th${b.cls}" style="${esc(b.style)}"></span>`;
    sub = [x.v.kind || 'Film', x.v.year, x.v.soon ? 'Hamarosan' : x.v.genre].filter(Boolean).join(' · '); }
  else if (x.k === 'music') { th = `<span class="th sq" style="${x.m.cover ? `background-image:url('${esc(x.m.cover)}')` : ''}"></span>`; sub = x.m.artist || 'HGWS Records'; }
  else if (x.k === 'user') { th = avatar(x.u, 38); sub = C.roleLabel(x.u); }
  else { th = `<span class="gi">${I(x.ic)}</span>`; sub = typeof x.go === 'string' ? 'hgery08.hu/' + x.go : 'Művelet'; }
  return `<a class="it${i === cur ? ' on' : ''}" data-i="${i}" href="${typeof x.go === 'string' ? esc(x.go) : '#'}">${th}<span style="min-width:0"><b>${mark(x.t, q)}</b><small>${esc(sub)}</small></span><span class="go">${I('corner-down-left')}</span></a>`;
}
function draw(qRaw) {
  const { q, groups } = build(qRaw);
  items = groups.flatMap(g => g[1]); cur = Math.min(cur, Math.max(0, items.length - 1));
  let i = 0;
  $('.res', el).innerHTML = items.length ? groups.map(([h, l]) => `<h6>${esc(h.toUpperCase())}</h6>${l.map(x => row(x, q, i++)).join('')}`).join('')
    : `<div class="none"><div class="big">${I('search')}</div>Nincs találat erre: „${esc(qRaw)}”</div>`;
}
function pick(i) {
  const x = items[i]; if (!x) return;
  close();
  if (typeof x.go === 'function') x.go(); else location.hash = x.go;
}
function move(d) {
  if (!items.length) return;
  cur = (cur + d + items.length) % items.length;
  el.querySelectorAll('.it').forEach(a => a.classList.toggle('on', +a.dataset.i === cur));
  el.querySelector('.it.on')?.scrollIntoView({ block: 'nearest' });
}
export function open(q = '') {
  if (el) return;
  el = document.createElement('div'); el.className = 'cmdk';
  el.innerHTML = `<div class="box" role="dialog" aria-label="Gyorskereső"><label class="in">${I('search')}<input placeholder="Filmek, zenék, tagok, oldalak…" autocomplete="off" spellcheck="false"><kbd>ESC</kbd></label>
    <div class="res"></div><div class="ft"><span><kbd>↑</kbd><kbd>↓</kbd> lépkedés</span><span><kbd>Enter</kbd> megnyitás</span><span><kbd>Ctrl</kbd><kbd>K</kbd> bármikor</span></div></div>`;
  document.body.appendChild(el);
  const inp = $('input', el); inp.value = q; cur = 0; draw(q);
  inp.oninput = () => { cur = 0; draw(inp.value); };
  inp.onkeydown = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(cur); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  };
  el.addEventListener('pointerdown', e => { if (e.target === el) close(); });
  el.addEventListener('mousemove', e => { const a = e.target.closest('.it'); if (a && +a.dataset.i !== cur) { cur = +a.dataset.i; el.querySelectorAll('.it').forEach(b => b.classList.toggle('on', b === a)); } });
  el.addEventListener('click', e => { const a = e.target.closest('.it'); if (a) { e.preventDefault(); pick(+a.dataset.i); } });
  setTimeout(() => inp.focus(), 10);
}
export function close() { el?.remove(); el = null; }
export const isOpen = () => !!el;
