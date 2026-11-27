/* Fülek az oldalon belül (mint a böngészőben).
   Minden fül egy útvonalat (hash) tárol. A játékot futtató fül iframe-je életben marad, amíg a fül nyitva van:
   ha játék közben máshova navigálunk, az új oldal másik fülre kerül (vagy egy meglévő, nem játékos fülre).
   Fülek száma: legfeljebb 5, vendégnek 3. A fülek a munkamenet végéig megmaradnak (sessionStorage). */
import { $, esc, toast } from './core.js?v=202611271520';

const SK = 'hgws_tabs';
let T = [], act = 0, seq = 1, C = { guest: () => false }, fresh = false, bar, list;
const cur = () => T.find(t => t.id === act);
const max = () => C.guest() ? 3 : 5;
const norm = h => (!h || h === '#' || h === '#/') ? '#/' : h;
const gameOf = h => { const m = /^#\/arcade\/([\w-]+)/.exec(h || ''); return m ? m[1].split('.')[0] : ''; };
const ICON = { '': 'house', tar: 'clapperboard', film: 'clapperboard', nez: 'clapperboard', lista: 'plus', zene: 'music', arcade: 'gamepad-2', birodalom: 'droplets', kapcsolat: 'mail', otletek: 'lightbulb', chat: 'users', c: 'users', dm: 'message-circle', baratok: 'message-circle', u: 'message-circle', admin: 'shield', profil: 'user', party: 'users', premier: 'radio', kereses: 'search' };
const LABEL = { '': 'Főoldal', tar: 'Filmtár', film: 'Filmtár', nez: 'Film', lista: 'Saját lista', zene: 'Zene', arcade: 'Arcade', birodalom: 'Birodalom', kapcsolat: 'Kapcsolat', otletek: 'Ötletek', chat: 'Közösség', c: 'Közösség', dm: 'Üzenetek', baratok: 'Barátok', u: 'Üzenetek', admin: 'Kezelés', profil: 'Profil', party: 'Közös nézés', premier: 'Premier', kereses: 'Keresés' };
const labelOf = h => LABEL[(h.replace(/^#\/?/, '').split(/[/?]/)[0])] || 'HGWS';
const iconOf = h => ICON[(h.replace(/^#\/?/, '').split(/[/?]/)[0])] || 'house';

function save() { try { sessionStorage.setItem(SK, JSON.stringify({ a: act, t: T.map(({ id, hash, title, game, gname, gicon, muted }) => ({ id, hash, title, game, gname, gicon, muted })) })); } catch (_) {} }
function load() { try { const d = JSON.parse(sessionStorage.getItem(SK) || 'null'); if (!d || !Array.isArray(d.t) || !d.t.length) return; T = d.t.filter(t => t && typeof t.hash === 'string').slice(0, 5).map(t => ({ ...t, id: +t.id || seq++, hash: norm(t.hash) })); act = d.a; seq = Math.max(seq, ...T.map(t => t.id + 1)); } catch (_) { T = []; } }
const mk = hash => ({ id: seq++, hash: norm(hash), title: '', game: '', at: Date.now() });

export function init(ctx) {
  C = { ...C, ...ctx };
  load();
  const h = norm(location.hash);
  if (!T.length) T = [mk(h)];
  if (!T.some(t => t.id === act)) act = T[0].id;
  // ha közben vendég lett a fiók: a fölösleges (nem aktív) fülek mennek
  while (T.length > max()) { const i = T.findLastIndex(t => t.id !== act); T.splice(i, 1); }
  const c = cur(); c.at = Date.now();
  if (!c.game) c.hash = h; // a címsorba írt / linkkel érkezett útvonal az aktív fülé (játékos fülnél a router új fület nyit neki)
  bar = $('#wtabs'); list = bar.querySelector('.ftl');
  bar.querySelector('.ftadd').onclick = () => openTab('#/', true);
  list.addEventListener('click', e => {
    const b = e.target.closest('[data-tid]'); if (!b) return; const id = +b.dataset.tid;
    if (e.target.closest('.ftx')) return close(id);
    if (e.target.closest('.ftm')) return mute(id);
    if (id !== act) show(T.find(t => t.id === id));
  });
  list.addEventListener('auxclick', e => { const b = e.target.closest('[data-tid]'); if (b && e.button === 1) { e.preventDefault(); close(+b.dataset.tid); } });
  list.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); });
  // Ctrl/középső kattintás egy belső linken: új fül a háttérben
  const bg = e => { const a = e.target.closest('a[href^="#/"]'); if (!a || a.target || !a.closest('#shell') || a.closest('#wtabs')) return; e.preventDefault(); e.stopPropagation(); openTab(a.getAttribute('href'), false); };
  document.addEventListener('click', e => { if (e.button === 0 && (e.ctrlKey || e.metaKey)) bg(e); }, true);
  document.addEventListener('auxclick', e => { if (e.button === 1) bg(e); }, true);
  // a fül címe az oldal címéből jön
  const tt = document.querySelector('title'); if (tt) new MutationObserver(() => { const c = cur(); if (c && !c.game) { c.title = document.title.replace(/\s*·\s*HGWS$/, ''); draw(); save(); } }).observe(tt, { childList: true, characterData: true, subtree: true });
  draw(); save();
}

/* a router minden útvonalváltás előtt megkérdezi: false = maradj, 'force' = másik fül lett aktív (teljes újrarajzolás) */
export function nav() {
  if (!bar) return true;
  if (fresh) { fresh = false; return 'force'; }
  const h = norm(location.hash), c = cur(), g = gameOf(h);
  if (c.hash === h) return true;
  if (c.game && g === c.game) { c.hash = h; save(); return true; } // ugyanazon a játékon belül
  // a játék már fut egy másik fülön: oda váltunk
  const same = g ? T.find(t => t.id !== c.id && t.game === g) : null;
  if (same) { activate(same); history.replaceState(null, '', same.hash); return 'force'; }
  if (c.game) { // játék közben máshova: a játék marad, az új oldal másik fülre kerül
    const ex = T.find(t => t.id !== c.id && t.hash === h);
    if (ex) { activate(ex); return 'force'; }
    if (T.length < max()) { const t = mk(h); T.splice(T.indexOf(c) + 1, 0, t); activate(t); return 'force'; }
    const re = T.filter(t => !t.game).sort((a, b) => b.at - a.at)[0];
    if (re) { re.hash = h; re.title = ''; activate(re); return 'force'; }
    history.replaceState(null, '', c.hash);
    toast(`Legfeljebb ${max()} fül lehet nyitva – zárj be egy játékot.`, true);
    return false;
  }
  c.hash = h; c.title = ''; save(); draw();
  return true;
}
function activate(t) { act = t.id; t.at = Date.now(); panes(); draw(); save(); try { document.activeElement?.blur?.(); } catch (_) {} }
function show(t) {
  if (!t) return; const c = cur();
  if (c && !c.game && c.id !== t.id) c.hash = norm(location.hash); // a szűrők replaceState-tel írják a címet
  activate(t);
  if (norm(location.hash) === t.hash) { fresh = false; C.route(true); }
  else { fresh = true; location.hash = t.hash; }
}
export function openTab(h, go) {
  h = norm(h);
  const g = gameOf(h), same = g && T.find(t => t.game === g); if (same) { if (go) show(same); return; }
  if (T.length >= max()) { toast(`Legfeljebb ${max()} fül lehet nyitva.`, true); return; }
  const t = mk(h); t.title = ''; T.push(t);
  if (go) show(t); else { draw(); save(); }
}
export function close(id) {
  const i = T.findIndex(t => t.id === id); if (i < 0) return;
  const t = T[i]; t.pane?.remove(); t.pane = null;
  if (T.length === 1) { T = [mk('#/')]; act = T[0].id; fresh = true; draw(); save(); if (norm(location.hash) === '#/') { fresh = false; C.route(true); } else location.hash = '#/'; changed(); return; }
  T.splice(i, 1);
  if (id === act) show(T[Math.min(i, T.length - 1)]); else { draw(); save(); }
  changed();
}
const changed = () => dispatchEvent(new CustomEvent('hgws-tabs'));
export const games = () => T.filter(t => t.game && t.pane).sort((a, b) => b.at - a.at).map(t => t.game);
export const activeGame = () => cur()?.game || '';

/* ---------- játék-iframe-ek ---------- */
export function mountGame(gid, src, name, icon) {
  const c = cur(); if (!c) return null;
  if (c.pane && c.game !== gid) { c.pane.remove(); c.pane = null; }
  c.game = gid; c.gname = name || c.gname || gid; c.gicon = icon || c.gicon || '';
  if (!c.pane || !document.contains(c.pane)) {
    const f = document.createElement('iframe'); f.className = 'arcframe'; f.title = c.gname; f.allow = 'autoplay; fullscreen'; f.src = src;
    $('#tabpanes').appendChild(f); c.pane = f; c.audio = c.audio || { muted: !!c.muted, gains: new Set(), media: new Set() }; c.audio.muted = !!c.muted;
    try { gate(f.contentWindow, c.audio); } catch (_) {}
    f.addEventListener('load', () => { if (cur() === c) try { f.contentWindow.focus(); } catch (_) {} });
  }
  panes(); draw(); save(); changed();
  return c.pane;
}
/* a játék maga lép ki (pl. vissza a listára): ezen a fülön marad a navigáció */
export function leave(frame) { const c = cur(); if (!c || c.pane !== frame) return false; c.pane.remove(); c.pane = null; c.game = ''; draw(); save(); changed(); return true; }
export function panes() { const c = cur(), on = !!(c && c.game && c.pane && gameOf(norm(location.hash)) === c.game); T.forEach(t => t.pane?.classList.toggle('bg', !(on && t === c))); document.body.classList.toggle('tabgame', on); }
export const frames = () => T.filter(t => t.pane).map(t => t.pane);

/* hang: az iframe (és a beágyazott játék) minden AudioContextje egy közös erősítőn át szól → némításkor 0 */
function gate(w, st) {
  if (!w || w.__hgGate) return; w.__hgGate = st;
  ['AudioContext', 'webkitAudioContext'].forEach(n => {
    const A = w[n]; if (!A || A.__hg) return;
    const B = class extends A { constructor(...a) { super(...a); try { const d = Object.getOwnPropertyDescriptor(w.BaseAudioContext?.prototype || A.prototype, 'destination').get.call(this), g = this.createGain(); g.gain.value = st.muted ? 0 : 1; g.connect(d); st.gains.add(new WeakRef(g)); Object.defineProperty(this, 'destination', { get: () => g, configurable: true }); } catch (_) {} } };
    B.__hg = 1; try { w[n] = B; } catch (_) {}
  });
  try { const P = w.HTMLMediaElement.prototype, play = P.play; P.play = function () { if (st.muted) this.muted = true; st.media.add(new WeakRef(this)); return play.apply(this, arguments); }; } catch (_) {}
  w.HGWS_GATE = f => { try { gate(f.contentWindow, st); } catch (_) {} };
}
function applyMute(t) {
  const st = t.audio; if (!st) return; st.muted = !!t.muted;
  st.gains.forEach(r => { const g = r.deref(); if (!g) return st.gains.delete(r); try { g.gain.setTargetAtTime(st.muted ? 0 : 1, g.context.currentTime, .02); } catch (_) { try { g.gain.value = st.muted ? 0 : 1; } catch (_) {} } });
  st.media.forEach(r => { const m = r.deref(); if (!m) return st.media.delete(r); m.muted = st.muted; });
  const walk = w => { try { w.document.querySelectorAll('audio,video').forEach(m => { m.muted = st.muted; }); for (const f of w.document.querySelectorAll('iframe')) walk(f.contentWindow); } catch (_) {} };
  if (t.pane) walk(t.pane.contentWindow);
}
function mute(id) { const t = T.find(x => x.id === id); if (!t) return; t.muted = !t.muted; applyMute(t); draw(); save(); }

/* ---------- fülsáv ---------- */
function draw() {
  if (!bar) return;
  const many = T.length > 1; bar.hidden = !many; document.body.classList.toggle('hastabs', many);
  if (!many) return;
  list.innerHTML = T.map(t => { const ic = t.game ? (t.gicon ? `<span class="fte">${esc(t.gicon)}</span>` : '<i class="ic ic-gamepad-2"></i>') : `<i class="ic ic-${iconOf(t.hash)}"></i>`, name = t.game ? t.gname : (t.title || labelOf(t.hash));
    return `<div class="ftab${t.id === act ? ' on' : ''}${t.game ? ' game' : ''}" data-tid="${t.id}" title="${esc(name)}">${ic}<span class="ftn">${esc(name)}</span>${t.game ? `<button class="ftm${t.muted ? ' on' : ''}" aria-label="${t.muted ? 'Hang be' : 'Némítás'}"><i class="ic ic-volume-${t.muted ? 'x' : '2'}"></i></button>` : ''}<button class="ftx" aria-label="Fül bezárása"><i class="ic ic-x"></i></button></div>`; }).join('');
  bar.querySelector('.ftadd').hidden = T.length >= max();
  list.querySelector('.ftab.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
