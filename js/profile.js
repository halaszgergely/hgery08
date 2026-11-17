// HGWS – tag profiloldala (#/profil/<uid>): rang, tagek, bemutatkozás, Arcade-rekordok, értékelései
import { FB, db, $, esc, avatar, toDate, timeLabel, isOnline, roleOf, OWNER_UID } from './core.js?v=202611170221';
import * as Admin from './admin.js?v=202611170221';
import { GAMES } from './browse.js?v=202611170221';

let C = null, gen = 0;
export function init(ctx) { C = ctx; }

export async function render(id) {
  const my = ++gen;
  const u = C.S.users.get(id);
  const page = $('#page');
  if (!u) { page.innerHTML = '<div class="pg"><div class="noresult"><div class="big">👤</div>Ez a tag nem található.</div></div>'; return; }
  document.title = u.name + ' · HGWS';
  const self = id === C.uid(), k = C.roleKey(u), r = roleOf(k), tags = C.userTags(u);
  const canMod = !self && id !== OWNER_UID && C.can('moderate') && C.rankOfUser(u) < C.myRank();
  const since = toDate(u.createdAt);
  page.innerHTML = `<div class="pg profpage">
    <div class="phero" style="--pc:${esc(k !== 'user' ? r.color : (u.color || '#6cc6ff'))}">
      <div class="pav">${avatar(u, 120)}<i class="on${isOnline(u) ? ' y' : ''}"></i></div>
      <div class="pinfo"><div class="eyebrow">// HGWS TAG</div><h1>${esc(u.name)}</h1>
        <div class="prow">${C.roleBadge(u) || '<span class="rb">Tag</span>'}${u.banned ? '<span class="tg red">⛔ KITILTVA</span>' : ''}</div>
        ${tags.length ? `<div class="ptagl">${tags.map(t => `<span class="utag lg" style="--tc:${esc(t.color)}">${esc(t.name)}</span>`).join('')}</div>` : ''}
        ${u.bio ? `<p class="pbio">${esc(u.bio)}</p>` : self ? '<p class="pbio hint">Még nem írtál bemutatkozást – a Beállításokban megteheted.</p>' : ''}
        <div class="pbtns">${self ? '<a class="pbtn info" href="#/" data-set><i>⚙️</i>Profil szerkesztése</a>' : C.S.guest ? '' : `<a class="pbtn play" href="#/u/${esc(id)}"><i>💬</i>Üzenet</a>`}
          ${C.can('manageTags') && (id !== OWNER_UID || C.isOwner()) ? '<button class="pbtn info" data-tags><i>🏷️</i>Tagek</button>' : ''}
          ${canMod ? '<button class="pbtn info" data-mod><i>🛡️</i>Moderálás</button>' : ''}</div></div></div>
    <div class="pstats">
      <div class="pst"><small>TAG</small><b>${since ? since.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' }) : '–'}</b><span>óta</span></div>
      <div class="pst"><small>UTOLJÁRA</small><b>${isOnline(u) ? '🟢 Most online' : u.lastSeen ? timeLabel(u.lastSeen) : '–'}</b></div>
      <div class="pst"><small>RANG</small><b style="color:${esc(r.color)}">${esc(r.label)}</b></div>
      <div class="pst"><small>ÉRTÉKELÉSEK</small><b id="pRc">…</b><span>filmet értékelt</span></div>
    </div>
    <div class="pcols"><section><h3>🎮 Arcade-rekordok</h3><div id="pArc" class="parc"><div class="spin"></div></div></section>
      <section><h3>⭐ Értékelései</h3><div id="pRat" class="prat"><div class="spin"></div></div></section></div>
  </div>`;
  page.querySelector('[data-set]')?.addEventListener('click', e => { e.preventDefault(); $('#setBtn')?.click(); });
  page.querySelector('[data-tags]')?.addEventListener('click', () => Admin.tagAssign(id));
  page.querySelector('[data-mod]')?.addEventListener('click', () => Admin.modModal(id));
  // Arcade-rekordok
  Promise.all(GAMES.map(g => FB.getDoc(FB.doc(db, 'leaderboards', g.id, 'scores', id)).then(s => [g, s.data()?.best || 0]).catch(() => [g, 0]))).then(l => {
    if (my !== gen) return;
    $('#pArc').innerHTML = l.map(([g, b]) => `<a class="pag" href="#/arcade/${g.id}" style="--c:${g.c}"><span>${g.icon}</span><div><b>${esc(g.name)}</b><small>${b ? b.toLocaleString('hu-HU') + ' pont' : 'Még nem játszott'}</small></div></a>`).join('');
  });
  // értékelései (a ratings gyűjteménycsoportból – a dokumentum azonosítója a tag uid-ja)
  FB.getDocs(FB.collectionGroup(db, 'ratings')).then(s => {
    if (my !== gen) return;
    const mine = s.docs.filter(d => d.id === id).map(d => ({ vid: d.ref.parent.parent.id, ...d.data() }))
      .sort((a, b) => (toDate(b.at)?.getTime() || 0) - (toDate(a.at)?.getTime() || 0));
    $('#pRc').textContent = mine.length;
    const film = vid => C.S.videos.find(v => v.id === vid);
    $('#pRat').innerHTML = mine.length ? mine.slice(0, 12).map(x => { const f = film(x.vid); return f ? `<a class="prr" href="#/nez/${esc(f.id)}"><span class="ph" style="background-image:url('${esc(f.thumb || f.poster || '')}')"></span><div><b>${esc(f.title)}</b><span class="stars sm" style="--p:${x.stars / 5 * 100}%"></span></div></a>` : ''; }).join('')
      : '<p class="hint">Még nem értékelt filmet.</p>';
  }).catch(() => { $('#pRc').textContent = '–'; $('#pRat').innerHTML = '<p class="hint">Nem sikerült betölteni.</p>'; });
}
