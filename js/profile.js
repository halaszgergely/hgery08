// HGWS – tag profiloldala (#/profil/<uid>): rang, tagek, bemutatkozás, Arcade-rekordok, értékelései
import { FB, db, $, esc, bigNum, lbDec, avatar, toDate, timeLabel, isOnline, roleOf, OWNER_UID, notify } from './core.js?v=202611202019';
import { I, bgOf } from './fx.js?v=202611202019';
import * as Admin from './admin.js?v=202611202019';
import { GAMES } from './browse.js?v=202611202019';

let C = null, gen = 0;
export function init(ctx) { C = ctx; }

/* ===================== kitüntetések =====================
   Az adatokból számoljuk (értékelések, Arcade, ötletek, közös nézés, tagság ideje, rang) – nincs külön tárolás. */
const DAY = 864e5;
export const BADGES = [
  { id: 'ertekelo', ic: 'star', n: 'Első értékelés', d: 'Értékelt egy filmet', c: '#e8b656', ok: x => x.rates >= 1 },
  { id: 'kritikus', ic: 'award', n: 'Kritikus', d: 'Legalább 10 filmet értékelt', c: '#c79bff', ok: x => x.rates >= 10 },
  { id: 'jatekos', ic: 'gamepad-2', n: 'Játékos', d: 'Rekordot állított az Arcade-ban', c: '#5ee08a', ok: x => x.games >= 1 },
  { id: 'mindenes', ic: 'zap', n: 'Mindenes', d: 'Mind a 4 Arcade-játékban van rekordja', c: '#4dd6c7', ok: x => x.games >= 4 },
  { id: 'bajnok', ic: 'trophy', n: 'Arcade-bajnok', d: 'Megnyert egy heti versenyt', c: '#ffa94d', ok: x => x.champ },
  { id: 'otletgazda', ic: 'lightbulb', n: 'Ötletgazda', d: 'Beküldött egy ötletet', c: '#6cc6ff', ok: x => x.ideas >= 1 },
  { id: 'hazigazda', ic: 'popcorn', n: 'Házigazda', d: 'Közös nézést szervezett', c: '#ff8fc7', ok: x => x.hosts >= 1 },
  { id: 'bemutatkozott', ic: 'file-pen', n: 'Bemutatkozott', d: 'Kitöltötte a bemutatkozását', c: '#e8b656', ok: x => x.bio },
  { id: 'torzstag', ic: 'medal', n: 'Törzstag', d: 'Legalább 30 napja HGWS-tag', c: '#ff7a6e', ok: x => x.days >= 30 },
  { id: 'csapat', ic: 'shield-check', n: 'A csapat tagja', d: 'Moderátor vagy magasabb rang', c: '#6cc6ff', ok: x => x.staff }
];
async function facts(id) {
  const u = C.S.users.get(id) || {}, self = id === C.uid();
  const [rates, games, ideas, hosts] = await Promise.all([
    FB.getDocs(FB.collectionGroup(db, 'ratings')).then(s => s.docs.filter(d => d.id === id).length).catch(() => 0),
    Promise.all(GAMES.map(g => FB.getDoc(FB.doc(db, 'leaderboards', g.id, 'scores', id)).then(s => lbDec(s.data()?.best || 0)).catch(() => 0))),
    FB.getDocs(self ? FB.query(FB.collection(db, 'ideas'), FB.where('uid', '==', id)) : FB.query(FB.collection(db, 'ideas'), FB.where('uid', '==', id), FB.where('public', '==', true))).then(s => s.size).catch(() => 0),
    FB.getDocs(FB.query(FB.collection(db, 'parties'), FB.where('host', '==', id))).then(s => s.size).catch(() => 0)
  ]);
  return { rates, scores: games, games: games.filter(Boolean).length, ideas, hosts, bio: !!(u.bio || '').trim(),
    days: (Date.now() - (toDate(u.createdAt)?.getTime() || Date.now())) / DAY,
    champ: C.userTags(u).some(t => t.name === 'Arcade-bajnok'), staff: C.rankOfUser(u) >= 40 };
}
const seenKey = () => 'hgws_badges_' + C.uid();
const seen = () => { try { return JSON.parse(localStorage.getItem(seenKey())); } catch (_) { return null; } };
const saveSeen = l => { try { localStorage.setItem(seenKey(), JSON.stringify(l)); } catch (_) {} };
const achHtml = (b, on, fresh) => `<div class="ach${on ? ' on' : ''}${fresh ? ' new' : ''}" style="--c:${b.c}" title="${esc(b.d)}"><span class="bd">${I(on ? b.ic : 'lock')}</span><b>${esc(b.n)}</b><small>${esc(b.d)}</small></div>`;
function celebrate(b) {
  const t = document.createElement('div'); t.className = 'achtoast';
  t.innerHTML = `${achHtml(b, true, true).replace(/<b>.*<\/small>/, '')}<div><small>ÚJ KITÜNTETÉS</small><b>${esc(b.n)}</b><div class="hint" style="font-size:.8rem">${esc(b.d)}</div></div>`;
  t.onclick = () => { location.hash = '#/profil/' + C.uid(); t.remove(); };
  document.body.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 450); }, 5200);
}
/* induláskor (és saját profilon) megnézzük, van-e új kitüntetés – az elsőnél csak eltároljuk, hogy ne zúduljon rá minden */
export async function checkBadges(x) {
  if (!C || C.S.guest || !C.uid()) return [];
  x ||= await facts(C.uid());
  const got = BADGES.filter(b => b.ok(x)).map(b => b.id), old = seen();
  saveSeen(got);
  if (!old) return [];
  const fresh = got.filter(id => !old.includes(id));
  fresh.forEach((id, i) => { const b = BADGES.find(z => z.id === id);
    setTimeout(() => celebrate(b), i * 1800);
    notify(C.uid(), 'badge', `Új kitüntetést kaptál: ${b.n} – ${b.d}`, '#/profil/' + C.uid()); });
  return fresh;
}

export async function render(id) {
  const my = ++gen;
  const u = C.S.users.get(id);
  const page = $('#page');
  if (!u) { page.innerHTML = '<div class="pg"><div class="noresult"><div class="big"><i class="ic ic-user"></i></div>Ez a tag nem található.</div></div>'; return; }
  document.title = u.name + ' · HGWS';
  const self = id === C.uid(), k = C.roleKey(u), r = roleOf(k), tags = C.userTags(u);
  const canMod = !self && id !== OWNER_UID && C.can('moderate') && C.rankOfUser(u) < C.myRank();
  const since = toDate(u.createdAt);
  page.innerHTML = `<div class="pg profpage">
    <div class="phero" style="--pc:${esc(k !== 'user' ? r.color : (u.color || '#6cc6ff'))}">
      <div class="pav">${avatar(u, 120)}<i class="on${isOnline(u) ? ' y' : ''}"></i></div>
      <div class="pinfo"><div class="eyebrow">// HGWS TAG</div><h1>${esc(u.name)}</h1>
        <div class="prow">${C.roleBadge(u) || '<span class="rb">Tag</span>'}${u.banned ? '<span class="tg red"><i class="ic ic-ban"></i> KITILTVA</span>' : ''}</div>
        ${tags.length ? `<div class="ptagl">${tags.map(t => `<span class="utag lg" style="--tc:${esc(t.color)}">${esc(t.name)}</span>`).join('')}</div>` : ''}
        ${u.bio ? `<p class="pbio">${esc(u.bio)}</p>` : self ? '<p class="pbio hint">Még nem írtál bemutatkozást – a Beállításokban megteheted.</p>' : ''}
        <div class="pbtns">${self ? '<a class="pbtn info" href="#/" data-set><i class="ic ic-settings"></i>Profil szerkesztése</a>' : C.S.guest ? '' : C.friendBtn(id)}
          ${C.can('manageTags') && (id !== OWNER_UID || C.isOwner()) ? '<button class="pbtn info" data-tags><i class="ic ic-tag"></i>Tagek</button>' : ''}
          ${canMod ? '<button class="pbtn info" data-mod><i class="ic ic-shield"></i>Moderálás</button>' : ''}</div></div></div>
    <div class="pstats">
      <div class="pst"><small>TAG</small><b>${since ? since.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' }) : '–'}</b><span>óta</span></div>
      <div class="pst"><small>UTOLJÁRA</small><b>${isOnline(u) ? '<span class="odot"></span>Most online' : u.lastSeen ? timeLabel(u.lastSeen) : '–'}</b></div>
      <div class="pst"><small>RANG</small><b style="color:${esc(r.color)}">${esc(r.label)}</b></div>
      <div class="pst"><small>ÉRTÉKELÉSEK</small><b id="pRc">…</b><span>filmet értékelt</span></div>
    </div>
    <section class="pbox"><h3>${I('award')} Kitüntetések <span class="achcount" id="pAchN"></span></h3><div class="pach" id="pAch">${BADGES.map(() => '<div class="ach"><span class="bd skel"></span><b class="skel" style="width:70%">&nbsp;</b></div>').join('')}</div></section>
    <div class="pcols"><section><h3><i class="ic ic-gamepad-2"></i> Arcade-rekordok</h3><div id="pArc" class="parc">${GAMES.map(() => '<div class="pag skel" style="height:58px"></div>').join('')}</div></section>
      <section><h3><i class="ic ic-star"></i> Értékelései</h3><div id="pRat" class="prat"><div class="skl"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div></div></section></div>
  </div>`;
  page.querySelector('[data-set]')?.addEventListener('click', e => { e.preventDefault(); $('#setBtn')?.click(); });
  page.querySelector('[data-tags]')?.addEventListener('click', () => Admin.tagAssign(id));
  page.querySelector('[data-mod]')?.addEventListener('click', () => Admin.modModal(id));
  // kitüntetések
  facts(id).then(async x => {
    if (my !== gen) return;
    const fresh = self ? await checkBadges(x) : [];
    const on = BADGES.filter(b => b.ok(x));
    $('#pAchN').textContent = `${on.length} / ${BADGES.length}`;
    $('#pAch').innerHTML = [...on, ...BADGES.filter(b => !b.ok(x))].map(b => achHtml(b, b.ok(x), fresh.includes(b.id))).join('');
  });
  // Arcade-rekordok
  Promise.all(GAMES.map(g => FB.getDoc(FB.doc(db, 'leaderboards', g.id, 'scores', id)).then(s => [g, lbDec(s.data()?.best || 0), s.data()?.wins || 0]).catch(() => [g, 0, 0]))).then(l => {
    if (my !== gen) return;
    $('#pArc').innerHTML = l.map(([g, b, w]) => `<a class="pag" href="#/arcade/${g.id}" style="--c:${g.c}"><span>${g.icon}</span><div><b>${esc(g.name)}</b><small>${b ? bigNum(b) + ' ' + (g.unit || 'pont') + (w ? ' · 🏆×' + w : '') : 'Még nem játszott'}</small></div></a>`).join('');
  });
  // értékelései (a ratings gyűjteménycsoportból – a dokumentum azonosítója a tag uid-ja)
  FB.getDocs(FB.collectionGroup(db, 'ratings')).then(s => {
    if (my !== gen) return;
    const mine = s.docs.filter(d => d.id === id).map(d => ({ vid: d.ref.parent.parent.id, ...d.data() }))
      .sort((a, b) => (toDate(b.at)?.getTime() || 0) - (toDate(a.at)?.getTime() || 0));
    $('#pRc').textContent = mine.length;
    const film = vid => C.S.videos.find(v => v.id === vid);
    $('#pRat').innerHTML = mine.length ? mine.slice(0, 12).map(x => { const f = film(x.vid); return f ? `<a class="prr" href="#/nez/${esc(f.id)}"><span class="ph${bgOf(f.thumb || f.poster || f.banner, f.id + f.title).cls}" style="${esc(bgOf(f.thumb || f.poster || f.banner, f.id + f.title).style)}"></span><div><b>${esc(f.title)}</b><span class="stars sm" style="--p:${x.stars / 5 * 100}%"></span></div></a>` : ''; }).join('')
      : `<div class="estate">${I('star')}<b>Még nem értékelt filmet</b>${self ? '<span>Nézz meg egyet, és adj neki csillagot!</span>' : ''}</div>`;
  }).catch(() => { $('#pRc').textContent = '–'; $('#pRat').innerHTML = '<p class="hint">Nem sikerült betölteni.</p>'; });
}
