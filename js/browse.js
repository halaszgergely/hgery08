// HGWS – Netflix-stílusú filmes felület: kezdőlap, filmtár, saját lista, keresés, részletek, lejátszó
import { FB, db, $, $$, esc, ROLES, avatar, toDate, timeLabel, huDate, isOnline, toast, errText, notify, audit, OWNER_UID, reservedName, RESERVED_MSG, badName, BAD_MSG, badMsg, bigNum, lbEnc, lbDec } from './core.js?v=202611270059';
import { stageHtml, confirmBox, modal } from './ui.js?v=202611270059';
import * as Player from './player.js?v=202611270059';
import * as Party from './party.js?v=202611270059';
import * as Premier from './premier.js?v=202611270059';
import * as VP from './vplayer.js?v=202611270059';
import { bgOf, applyTint, ambilight, I } from './fx.js?v=202611270059';
import * as Promo from './promo.js?v=202611270059';
import * as ArcL from './arcade-lista.js?v=202611270059';

let C = null;
export function init(ctx) { C = ctx; Promo.setup({ videos: () => C.S.videos, open: id => detail(id) }); }
const S = () => C.S;
const vis = () => S().videos.filter(v => v.visible !== false && !v.series);
/* sorozatok: a sorozat egy „mappa” (isSeries), a részek series = sorozat-azonosító, season / ep sorszámmal */
const eps = sid => S().videos.filter(x => x.series === sid && x.visible !== false).sort((a, b) => (a.season || 1) - (b.season || 1) || (a.ep || 0) - (b.ep || 0) || (a.order || 0) - (b.order || 0));
const done = x => { const p = S().progress?.[x.id]; return p && p.d > 0 && p.t >= p.d * .95; };
const nextEp = sid => { const l = eps(sid).filter(x => !x.soon && x.hasVideo); return l.find(x => progOf(x.id)) || l.find(x => !done(x)) || l[0] || null; };
const epLabel = x => { const multi = new Set(eps(x.series).map(e => e.season || 1)).size > 1; return (multi ? (x.season || 1) + '. évad · ' : '') + (x.ep ? x.ep + '. rész' : 'Rész'); };
const playId = v => v.isSeries ? nextEp(v.id)?.id || null : !v.soon && v.hasVideo ? v.id : null;
const dispTitle = v => { const sr = v.series && film(v.series); return sr ? sr.title + ' · ' + epLabel(v) : v.title; };
function epList(sid, cur) { const l = eps(sid); if (!l.length) return ''; let ls = 0;
  return `<div class="sect"><h3>Részek <small style="font-weight:600;color:#9a9385;font-size:.85rem">· ${l.length}</small></h3><div class="eplist">${l.map(x => { const b = bgOf(x.poster || img(x), x.id + x.title), pr = progOf(x.id), sz = x.season || 1, head = sz !== ls && new Set(l.map(e => e.season || 1)).size > 1 ? `<div class="epseason">${sz}. évad</div>` : ''; ls = sz;
    return `${head}<a class="ep${x.id === cur ? ' cur' : ''}" href="${!x.soon && x.hasVideo ? '#/nez/' + esc(x.id) : '#/film/' + esc(x.id)}"><span class="en">${x.ep || ''}</span><span class="ph${b.cls}" style="${esc(b.style)}">${!x.soon && x.hasVideo ? '<i class="ic ic-play"></i>' : ''}${pr ? `<i class="pb" style="width:${Math.round(pr.t / pr.d * 100)}%"></i>` : done(x) ? '<i class="pb" style="width:100%"></i>' : ''}</span>
      <span class="et"><b>${esc(x.title)}</b><small>${esc([x.len, x.soon ? (x.premiere ? huDate(x.premiere) : 'Hamarosan') : ''].filter(Boolean).join(' · '))}</small>${x.desc ? `<em>${esc(x.desc)}</em>` : ''}</span></a>`; }).join('')}</div></div>`; }
const film = id => S().videos.find(v => v.id === id);
const PLURAL = { Film: 'Filmek', Anime: 'Animék', Sorozat: 'Sorozatok', Trailer: 'Trailerek', Kisfilm: 'Kisfilmek', Játék: 'Játékok' };
const isNew = v => !v.soon && ((v.premiere && Date.now() - new Date(v.premiere + 'T00:00:00') < 30 * 864e5) || (toDate(v.createdAt) && Date.now() - toDate(v.createdAt) < 14 * 864e5));
const inList = id => S().myList.includes(id);
const img = v => v.banner || v.poster || '';
const tracks = () => S().music.filter(t => t.visible !== false);
const cov = t => t.cover ? `background-image:url('${esc(t.cover)}')` : '';
let unsubs = [], heroTimer = null, countTimer = null, vp = null, ambStop = null, dTimer = null;
const guest = () => !!S().guest;
function cleanup() { unsubs.forEach(u => u()); unsubs = []; clearTimeout(heroTimer); clearInterval(countTimer); stopTrack(); vp?.destroy(); vp = null; ambStop?.(); ambStop = null; }

/* ===================== kártyák, sorok ===================== */
function badge(v) {
  if (v.live && v.soon) return `<span class="bdg${v.live.phase === 'live' || v.live.phase === 'lobby' ? ' live' : ''}">${esc(Premier.label(v))}</span>`;
  if (v.soon) return `<span class="bdg">${v.premiere ? 'PREMIER ' + esc(v.premiere.slice(5).replace('-', '.')) + '.' : 'HAMAROSAN'}</span>`;
  if (isNew(v)) return '<span class="bdg new">ÚJ</span>';
  return '';
}
function meta(v) {
  if (v.isSeries) { const n = eps(v.id).length; return [v.soon ? `<span class="y">${esc(v.status || 'Hamarosan')}</span>` : '<span class="g">Sorozat</span>', n ? n + ' rész' : '', v.year, v.genre].filter(Boolean).map(x => x.startsWith('<') ? x : `<span>${esc(x)}</span>`).join(''); }
  return [v.soon ? `<span class="y">${esc(v.status || 'Hamarosan')}</span>` : isNew(v) ? '<span class="g">Új</span>' : '<span class="g">Megnézhető</span>',
    v.year, v.len, v.genre].filter(Boolean).map(x => x.startsWith('<') ? x : `<span>${esc(x)}</span>`).join('');
}
const progOf = id => { const p = S().progress?.[id]; return p && p.d > 0 && p.t > 15 && p.t < p.d * .95 ? p : null; };
const leftLabel = p => { const m = Math.max(1, Math.round((p.d - p.t) / 60)); return m >= 60 ? `Még ${Math.floor(m / 60)} ó ${m % 60} p` : `Még ${m} perc`; };
/* ---------- értékelések összesítése (csempék jelvénye + „Legjobbra értékelt” sor) ---------- */
const RT = { avg: {}, n: {}, at: 0, busy: false };
function loadRatings() {
  if (RT.busy || Date.now() - RT.at < 15000) return;
  RT.busy = true;
  FB.getDocs(FB.collectionGroup(db, 'ratings')).then(s => {
    const sum = {}, n = {};
    s.docs.forEach(d => { const vid = d.ref.parent.parent?.id, x = d.data().stars; if (!vid || !(x >= 1 && x <= 5)) return; sum[vid] = (sum[vid] || 0) + x; n[vid] = (n[vid] || 0) + 1; });
    RT.avg = Object.fromEntries(Object.keys(sum).map(k => [k, sum[k] / n[k]])); RT.n = n; RT.at = Date.now();
    // jelvények a már kirajzolt csempékre, és a „Legjobbra értékelt” sor beszúrása újrarajzolás nélkül
    $$('.tile[data-film]').forEach(t => { const a = RT.avg[t.dataset.film], b = t.querySelector('.trate');
      if (a && !b) t.querySelector('.im')?.insertAdjacentHTML('afterend', `<span class="trate">★ ${a.toFixed(1).replace('.', ',')}</span>`); else if (a && b) b.textContent = '★ ' + a.toFixed(1).replace('.', ','); });
    const anchor = $('.rows .cstrip');
    if (S().route?.view === 'home' && anchor && topRated().length >= 2) {
      $('.rows .toprated')?.remove();
      anchor.insertAdjacentHTML('beforebegin', `<div class="toprated">${row('Legjobbra értékelt', topRated(), '')}</div>`);
      wireRows($('.rows .toprated'));
    }
  }).catch(() => {}).finally(() => RT.busy = false);
}
const topRated = () => vis().filter(v => RT.avg[v.id] && !v.soon).sort((a, b) => RT.avg[b.id] - RT.avg[a.id] || (RT.n[b.id] || 0) - (RT.n[a.id] || 0)).slice(0, 10);

/* ---------- nézettség: filmenként egyszer számol egy munkamenetben ---------- */
function countView(id) {
  try { const k = 'hgws_viewed_' + id; if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch (_) {}
  FB.setDoc(FB.doc(db, 'views', id), { n: FB.increment(1) }, { merge: true }).catch(() => {});
}

/* ---------- premier-értesítő: „Szólj, ha kijön” ---------- */
const alerting = id => (S().alerts || []).includes(id);
function alertBtn(v) {
  if (guest() || !v.soon) return '';
  return `<button class="pbtn ${alerting(v.id) ? 'gold' : 'info'}" data-alert="${esc(v.id)}"><i class="ic ic-${alerting(v.id) ? 'bell' : 'bell-off'}"></i>${alerting(v.id) ? 'Szólunk, ha kijön' : 'Szólj, ha kijön'}</button>`;
}
async function toggleAlert(id, btn) {
  const on = alerting(id);
  try {
    await FB.setDoc(FB.doc(db, 'users', C.uid(), 'private', 'alerts'), { ids: on ? FB.arrayRemove(id) : FB.arrayUnion(id) }, { merge: true });
    S().alerts = on ? S().alerts.filter(x => x !== id) : [...(S().alerts || []), id];
    toast(on ? 'Értesítő kikapcsolva' : '🔔 Szólunk, amint megjelenik!');
    if (btn) btn.outerHTML = alertBtn(film(id));
  } catch (e) { toast(errText(e), true); }
}

export function tile(v, top, cont) {
  const pr = cont ? progOf(v.id) : null;
  return `<div class="tile${top ? ' top' : ''}${pr ? ' cont' : ''}" tabindex="0" data-film="${esc(v.id)}">
    ${top ? `<span class="num">${top}</span>` : ''}
    <div class="im${bgOf(v.poster || img(v), v.id + v.title).cls}" style="${esc(bgOf(v.poster || img(v), v.id + v.title).style)}">${pr ? `<span class="left">${leftLabel(pr)}</span>` : badge(v)}${pr ? '' : '<img class="logo" src="img/logo.webp" alt="">'}${pr ? `<div class="prog"><i style="width:${Math.round(pr.t / pr.d * 100)}%"></i></div>` : ''}</div>
    ${RT.avg[v.id] ? `<span class="trate">★ ${RT.avg[v.id].toFixed(1).replace('.', ',')}</span>` : ''}
    ${v.isSeries && eps(v.id).length ? `<span class="sercount"><i class="ic ic-list-video"></i>${eps(v.id).length}</span>` : ''}
    ${top ? '' : `<div class="tt">${esc(dispTitle(v))}</div>`}
    <div class="ov"><h4>${esc(dispTitle(v))}</h4><div class="b">
      <button class="rnd pl" data-play="${esc(v.id)}" title="${playId(v) ? 'Lejátszás' : 'Részletek'}">${playId(v) ? '<i class="ic ic-play"></i>' : '<i class="ic ic-bell"></i>'}</button>
      <button class="rnd${inList(v.id) ? ' on' : ''}" data-mylist="${esc(v.id)}" title="Saját lista">${inList(v.id) ? '<i class="ic ic-check"></i>' : '<i class="ic ic-plus"></i>'}</button>
      <button class="rnd" data-share="${esc(v.id)}" title="Megosztás"><i class="ic ic-share-2"></i></button><span style="flex:1"></span>
      <button class="rnd" data-info="${esc(v.id)}" title="Részletek"><i class="ic ic-chevron-down"></i></button></div>
      <div class="m">${meta(v)}</div></div>
  </div>`;
}
function row(title, list, link, top, cont) {
  if (!list.length || !title) return '';
  return `<section class="row"><div class="rowh"><h2>${esc(title)}</h2>${link ? `<a href="${link}">Mind ›</a>` : ''}</div>
    <div class="track"><button class="arr l" hidden aria-label="Vissza">‹</button><div class="strip">${list.map((v, i) => tile(v, top ? i + 1 : 0, cont)).join('')}</div><button class="arr r" aria-label="Tovább">›</button></div></section>`;
}
function wireRows(root) {
  $$('.track', root).forEach(t => {
    const s = $('.strip', t), l = $('.arr.l', t), r = $('.arr.r', t);
    const upd = () => { l.hidden = s.scrollLeft < 10; r.hidden = s.scrollLeft + s.clientWidth >= s.scrollWidth - 10; };
    l.onclick = () => s.scrollBy({ left: -s.clientWidth * .85 }); r.onclick = () => s.scrollBy({ left: s.clientWidth * .85 });
    s.addEventListener('scroll', upd, { passive: true }); upd(); setTimeout(upd, 300);
  });
}

/* ===================== lábléc: partner + kapcsolat ===================== */
export const PARTNERS = [
  { name: 'Bombasz', url: 'https://bombasz.hu', host: 'bombasz.hu' },
  { name: 'Zerosites', url: 'https://zeroarmageddon.github.io/BFG-Managger/BFG_App.html', host: 'zerosites' }
];
export const CONTACT = 'info@hgery08.hu';
function footHtml() {
  return `<footer class="sitefoot"><div class="fl"><img src="img/logo.webp" alt=""><div><b>HGWS Studios</b><small>Halász Gergely Watering Solutions</small></div></div>
    <div class="fc"><h4>Partneroldalak</h4>${PARTNERS.map(p => `<a href="${p.url}" target="_blank" rel="noopener"><i class="ic ic-handshake"></i> ${esc(p.name)} <small>${esc(p.host)} ↗</small></a>`).join('')}</div>
    <div class="fc"><h4>Kapcsolat</h4><a href="mailto:${CONTACT}"><i class="ic ic-mail"></i> ${CONTACT}</a><a href="#/kapcsolat"><i class="ic ic-contact"></i> Kapcsolat oldal</a></div>
    <div class="fc"><h4>Szórakozás</h4><a href="#/arcade"><i class="ic ic-gamepad-2"></i> HGWS Arcade</a><a href="oldalak/miert_igyal.html"><i class="ic ic-beer"></i> Ma miért igyál?</a></div>
    <div class="fslogan">VÍZ. ERŐ. TECHNIKA. ÉLETFORMA.</div>
    <div class="fcopy">© ${new Date().getFullYear()} Halász Gergely Watering Solutions Kft. · HGWS Studios</div></footer>`;
}

/* ===================== kapcsolat ===================== */
function contactStrip() {
  return `<section class="cstrip"><div class="ci"><span class="cic"><i class="ic ic-mail"></i></span><div><div class="eyebrow">// KAPCSOLAT</div><h3>Írj nekünk!</h3>
    <p>Kérdésed, ötleted vagy üzleti ajánlatod van? A HGWS Studios várja a leveled.</p></div></div>
    <div class="cbtns"><a class="pbtn play" href="mailto:${CONTACT}"><i class="ic ic-mail"></i>${CONTACT}</a><button class="pbtn info" data-copymail><i class="ic ic-copy"></i>Másolás</button>
    ${PARTNERS.map(p => `<a class="pbtn info" href="${p.url}" target="_blank" rel="noopener"><i class="ic ic-handshake"></i>${esc(p.name)}</a>`).join('')}</div></section>`;
}
export function contact() {
  cleanup();
  document.title = 'Kapcsolat · HGWS';
  $('#page').innerHTML = `<div class="pg cpage"><div class="eyebrow">// HGWS STUDIOS</div><h1 class="gold">Kapcsolat</h1>
    <p class="lead">Kérdésed, ötleted, együttműködési vagy üzleti ajánlatod van? Írj bátran, válaszolunk.</p>
    <div class="cgrid" style="--n:${PARTNERS.length}">
      <a class="ccard big" href="mailto:${CONTACT}"><span class="ico"><i class="ic ic-mail"></i></span><small>E-MAIL</small><b>${CONTACT}</b><em>Kattints a levélíráshoz</em></a>
      <button class="ccard" data-copymail><span class="ico"><i class="ic ic-copy"></i></span><small>CÍM MÁSOLÁSA</small><b>Vágólapra</b><em>Ha a saját leveleződből írnál</em></button>
      ${PARTNERS.map(p => `<a class="ccard" href="${p.url}" target="_blank" rel="noopener"><span class="ico"><i class="ic ic-handshake"></i></span><small>PARTNEROLDAL</small><b>${esc(p.name)}</b><em>${esc(p.host)} ↗</em></a>`).join('')}
    </div>
    <div class="cinfo"><div><small>CÉG</small><b>Halász Gergely Watering Solutions Kft.</b></div><div><small>STÚDIÓ</small><b>HGWS Studios</b></div><div><small>WEBOLDAL</small><b>hgery08.hu</b></div></div>
  </div>${footHtml()}`;
}

/* ===================== 404 – nem létező oldal ===================== */
export function notFound() {
  cleanup();
  document.title = 'Nincs ilyen oldal · HGWS';
  $('#page').innerHTML = `<section class="nf"><div><span class="cactus" aria-hidden="true">🌵</span><div class="code">404</div>
    <h1>Szikkadt Szilárd kiszárította ezt az oldalt</h1>
    <p>Amit keresel, nincs itt – talán elírás, vagy a link már nem él. A kert többi része szerencsére még zöld.</p>
    <div class="hbtns"><a class="pbtn play" href="#/">${I('house')}Vissza a főoldalra</a><a class="pbtn info" href="#/tar">${I('clapperboard')}Filmtár</a></div></div></section>${footHtml()}`;
}

/* ===================== kezdőlap ===================== */
export function home() {
  cleanup(); loadRatings();
  const list = vis(), page = $('#page');
  document.title = 'HGWS';
  if (!list.length) {
    page.innerHTML = `<div class="homeowner"><div class="ownerslot"></div></div><section class="hero"><div class="bg" style="background-image:url(img/logo.webp);background-size:min(60vh,70vw);background-position:75% 45%;background-repeat:no-repeat"></div>
      <div class="in"><div class="orig"><img src="img/logo.webp" alt=""><span><b>HGWS</b> STUDIOS</span></div><h1>Hamarosan</h1>
      <p class="d">Az első HGWS-filmek az utómunka utolsó fázisában vannak. Addig csatlakozz a közösséghez!</p>
      <div class="hbtns">${guest() ? '' : '<a class="pbtn play" href="#/chat"><i class="ic ic-message-circle"></i>Közösség</a>'}${C.can('publishMedia') || C.can('submitMedia') ? '<a class="pbtn info" href="#/admin/filmek"><i class="ic ic-film"></i>Filmek kezelése</a>' : ''}</div></div></section>${footHtml()}`;
    C.renderOwnerBar(); return;
  }
  const f = Premier.featured(list) || list.find(v => v.featured) || list.find(v => !v.soon) || list[0], lv = list.filter(v => v.live?.open);
  const released = list.filter(v => !v.soon), soon = list.filter(v => v.soon);
  const kinds = [...new Set(list.map(v => v.kind || 'Film'))];
  const my = S().myList.map(film).filter(v => v && v.visible !== false);
  const online = [...S().users.values()].filter(u => isOnline(u) && !u.banned);
  const contList = Object.entries(S().progress || {}).filter(([id]) => film(id) && progOf(id) && !film(id).soon && film(id).visible !== false)
    .sort((a, b) => (toDate(b[1].at) || 0) - (toDate(a[1].at) || 0)).map(([id]) => film(id));
  page.innerHTML = `<div class="homeowner"><div class="ownerslot"></div></div>${heroHtml(f)}<div class="rows">
    ${lv.map(v => `<a class="plivebar" href="#/premier/${esc(v.id)}"><span class="plv"><i></i>${v.live.phase === 'live' ? 'ÉLŐ' : v.live.phase === 'lobby' ? 'VÁRÓSZOBA' : 'CSEVEGÉS'}</span><b>${esc(v.title)}</b><span>${v.live.phase === 'live' ? 'Most megy a premier' : v.live.phase === 'lobby' ? 'A premier ' + esc(Premier.shortWhen(v.liveAt).slice(-5)) + '-kor indul' : 'A premier véget ért – a csevegés még nyitva'}</span><span class="go">Belépés <i class="ic ic-chevron-right"></i></span></a>`).join('')}
    ${Promo.target() && Promo.target().id !== f.id ? Promo.bannerHtml() : ''}
    ${row('Folytasd a nézést', contList, '', false, true)}
    ${row(my.length ? 'Saját listám' : '', my, '#/lista')}
    ${row('Most megnézhető', released, '#/tar')}
    ${topRated().length >= 2 ? `<div class="toprated">${row('Legjobbra értékelt', topRated(), '')}</div>` : ''}
    ${contactStrip()}
    ${musicRow()}
    ${arcadeRow()}
    ${guest() ? guestHtml() : commHtml(online)}
    ${row('Hamarosan a HGWS-nél', soon, '#/tar')}
    ${list.length >= 2 ? row('Top a HGWS-en', list.slice(0, 10), '', true) : ''}
    ${kinds.length > 1 ? kinds.map(k => row(PLURAL[k] || k, list.filter(v => (v.kind || 'Film') === k), '#/tar/' + encodeURIComponent(k))).join('') : ''}
    ${tickerHtml()}
  </div>${footHtml()}`;
  C.renderOwnerBar();
  wireRows(page); heroWire(f); Player.refreshMarks(); applyTint($('#hero'), img(f)); loadPlays(); Promo.wire(page);
}
function heroHtml(v) {
  const future = v.liveAt ? v.live && (v.live.phase === 'upcoming' || v.live.phase === 'lobby') : v.soon && v.premiere && new Date(v.premiere + 'T00:00:00') > new Date();
  const bg = bgOf(img(v), v.id + v.title), pid = playId(v), pr = pid ? progOf(pid) : null;
  return `<section class="hero" id="hero"><div class="bg${bg.cls}" style="${esc(bg.style)}"></div><div class="vid" id="hvid"></div>
    <div class="in"><div class="orig"><img src="img/logo.webp" alt=""><span><b>HGWS</b> ${esc((v.kind || 'Film').toUpperCase())}</span></div>
      <h1>${esc(v.title)}</h1>${v.en ? `<div class="en">${esc(v.en)}</div>` : ''}
      <div class="hmeta">${v.soon ? `<span class="soonb${v.live?.phase === 'live' ? ' live' : ''}">${v.liveAt ? (v.live?.phase === 'live' ? '● ÉLŐ PREMIER' : 'PREMIER: ' + esc(Premier.when(v.liveAt).toUpperCase())) : v.premiere ? 'PREMIER: ' + esc(huDate(v.premiere).toUpperCase()) : 'HAMAROSAN'}</span>` : isNew(v) ? '<span class="new">ÚJ</span>' : ''}${[v.year, v.len].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('')}${v.genre ? `<span class="box">${esc(v.genre)}</span>` : ''}</div>
      ${future ? '<div class="count" id="count"></div>' : ''}
      ${v.desc ? `<p class="d">${esc(v.desc)}</p>` : ''}
      <div class="hbtns">${v.live?.open && v.soon ? `<a class="pbtn play" href="#/premier/${esc(v.id)}"><i class="ic ic-radio"></i>Belépés a premierre</a>` : ''}${pid ? `<a class="pbtn play" href="#/nez/${esc(pid)}"><i class="ic ic-play"></i>${pr ? 'Folytatás' : 'Lejátszás'}${v.isSeries ? ' · ' + esc(epLabel(film(pid))) : ''}</a>` : v.soon ? `<button class="pbtn gold" data-mylist="${esc(v.id)}"><i class="ic ic-${inList(v.id) ? 'check' : 'bell'}"></i>${inList(v.id) ? 'A listádon' : 'Emlékeztess'}</button>` : ''}
        <button class="pbtn info" data-info="${esc(v.id)}"><i class="ic ic-info"></i>További infók</button></div>
      ${pr ? `<div class="cont">${leftLabel(pr)}<span><i style="width:${Math.round(pr.t / pr.d * 100)}%"></i></span></div>` : ''}
    </div>
    <div class="hside"><button class="rnd" id="hmute" hidden title="Hang">${I('volume-x')}</button><span class="agebar">${esc(v.soon ? (v.status || 'Gyártásban') : (v.genre || v.kind || 'HGWS'))}</span></div></section>`;
}
async function heroWire(v) {
  const c = $('#count');
  if (c) {
    const end = v.liveAt ? new Date(v.liveAt) : new Date(v.premiere + 'T00:00:00');
    const tick = () => { let s = Math.max(0, (end - Date.now()) / 1000 | 0); const d = s / 86400 | 0; s %= 86400; const h = s / 3600 | 0; s %= 3600; const m = s / 60 | 0; s %= 60;
      c.innerHTML = [[d, 'NAP'], [h, 'ÓRA'], [m, 'PERC'], [s, 'MP']].map(([n, l]) => `<div><b>${String(n).padStart(2, '0')}</b><small>${l}</small></div>`).join(''); };
    tick(); countTimer = setInterval(tick, 1000);
  }
  if (v.soon || !v.hasVideo || matchMedia('(prefers-reduced-motion: reduce)').matches || innerWidth < 640) return;
  let src = {}; try { src = (await FB.getDoc(FB.doc(db, 'videoSources', v.id))).data() || {}; } catch (_) { return; }
  if (!src.youtube) return;
  heroTimer = setTimeout(() => {
    const box = $('#hvid'); if (!box) return;
    box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${esc(src.youtube)}?autoplay=1&mute=1&controls=0&loop=1&playlist=${esc(src.youtube)}&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&enablejsapi=1" allow="autoplay; encrypted-media" tabindex="-1" title=""></iframe>`;
    setTimeout(() => box.classList.add('on'), 1800);
    const mb = $('#hmute'); mb.hidden = false; let muted = true;
    mb.onclick = () => { muted = !muted; box.querySelector('iframe')?.contentWindow.postMessage(JSON.stringify({ event: 'command', func: muted ? 'mute' : 'unMute', args: [] }), '*'); mb.innerHTML = muted ? '<i class="ic ic-volume-x"></i>' : '<i class="ic ic-volume-2"></i>'; };
  }, 2500);
}
function commHtml(online) {
  const unread = S().convs.filter(C.convUnread).length;
  return `<section class="comm" id="comm"><div class="txt"><div class="eyebrow">// HGWS KÖZÖSSÉG</div><h3 class="gold">Beszéljétek meg!</h3>
    <p>${online.length ? `<b style="color:var(--green)">● ${online.length} tag online</b> most. ` : ''}Csatornák, privát üzenetek, csoportok – oszd meg a filmeket a haverokkal.${unread ? ` <b style="color:var(--red)">${unread} olvasatlan beszélgetésed van.</b>` : ''}</p>
    <div class="stack">${online.slice(0, 7).map(u => `<span data-u="${esc(u.id)}" title="${esc(u.name)}">${avatar(u, 40)}</span>`).join('')}${online.length > 7 ? `<span class="more">+${online.length - 7}</span>` : ''}</div></div>
    <div style="display:flex;gap:.6rem;flex-wrap:wrap"><a class="pbtn play" href="#/chat"><i class="ic ic-message-circle"></i>Csatlakozom</a><a class="pbtn info" href="#/dm"><i class="ic ic-mail"></i>Üzenetek</a></div></section>`;
}
function guestHtml() {
  return `<section class="comm" id="comm"><div class="txt"><div class="eyebrow">// VENDÉGKÉNT NÉZEL</div><h3 class="gold">Csatlakozz a HGWS közösséghez!</h3>
    <p>Regisztrálj, és értékelheted a filmeket, hozzászólhatsz, csevegsz a többiekkel és megoszthatod a kedvenceidet.</p></div>
    <div style="display:flex;gap:.6rem;flex-wrap:wrap"><button class="pbtn play" data-guestreg><i class="ic ic-sparkles"></i>Regisztráció</button><button class="pbtn info" data-guestlogin><i class="ic ic-key-round"></i>Belépés</button></div></section>`;
}
export function updateComm() {
  const el = $('#comm'); if (!el || guest()) return;
  const online = [...S().users.values()].filter(u => isOnline(u) && !u.banned);
  el.outerHTML = commHtml(online);
}

/* ===================== HGWS márka-szalag és Arcade ===================== */
function tickerHtml() {
  const w = ['VÍZ', 'ERŐ', 'TECHNIKA', 'ÉLETFORMA', 'HGWS', 'HAMAROSAN A KERTEDBEN'];
  const one = w.map(x => `<span>${x}</span><b>◆</b>`).join('');
  return `<div class="ticker" aria-hidden="true"><div class="tk">${one}${one}${one}${one}</div></div>`;
}
export const GAMES = [
  { id: 'locsolo', name: 'Locsoló Mester', icon: '🌻', desc: 'Locsold meg a hervadó virágokat, mielőtt Szikkadt Szilárd kiszárítja a kertet!', c: '#5ee08a' },
  { id: 'anya', name: 'Anyahajtó', icon: '🔧', unit: 'cm', fmt: v => ((+v || 0) / 10).toLocaleString('hu-HU', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' cm', desc: 'Hajtsd az anyát a végtelen menetes száron – hány centit bírsz egy perc alatt?', c: '#e8c46a' },
  { id: 'nyomas', name: 'Nyomásmester', icon: '🎛️', desc: 'Állítsd meg a mutatót a zöld zónában – a PLC rád bízta a szivattyút.', c: '#6cc6ff' },
  { id: 'vizagyu', name: 'Vízágyú', icon: '💦', desc: 'Kaktuszok és tűzgolyók zúdulnak a kertre. Célozz a vízágyúval!', c: '#ff7a6e' },
  { id: 'csepp', name: 'Csepp Futam', icon: '💧', desc: 'Repülj át a csövek között egy bátor vízcseppel – egy ütközés és vége!', c: '#e8b656' },
  { id: 'ugro', name: 'Cseppugró', icon: '🫧', unit: 'm', desc: 'Pattogj levélről levélre egyre magasabbra – a száraz levél letörik, a locsolófej fellő!', c: '#5ee08a' },
  { id: 'viztorony', name: 'Víztorony', icon: '🗼', unit: 'm', desc: 'Mássz fel a víztorony tetejére az Arany Locsolófejért – egy rossz ugrás, és zuhansz!', c: '#b48cff' },
  { id: 'drift', name: 'Drift Király', icon: '🏎️', desc: 'Felülnézetes drift-verseny 10 pályán, szellemautókkal és kétjátékos móddal.', c: '#ff5a4d' },
  { id: 'holtvaros', name: 'Holtváros', icon: '🧟', unit: 'pont', desc: 'Védd meg a várost a zombijárványtól: zóna, kapuk, őrség, légicsapás. A Zombies Aren\'t Real ihlette.', c: '#7dff4a' },
  { id: 'vizfuvar', name: 'HGWS Vízfuvar', icon: '🚚', unit: 'Ft', desc: 'Vízszállító-szimulátor Miskolc valódi utcáin: mopeddel, egyetlen ballonnal kezded, és céget építesz – rekord: a cég vagyona.', c: '#f2c230' },
  { id: 'waterblast', name: 'HGWS Water Blast', icon: '💧', unit: 'p', desc: 'Blokk-kirakós HGWS-víztömbökkel: teli sorok és oszlopok, kombók, tiszta tábla – rekord: a legnagyobb pontszám.', c: '#2a8fe0' },
  { id: 'locsolovaros', name: 'HGWS: Locsoló Város', icon: '🏙️', desc: 'Nyitott világú akciójáték egy Miskolc ihlette városban: küldetések Szilárd ellen, vízfegyverek, Trabanttól a helikopterig minden jármű.', c: '#ffd23a' },
  { id: 'flightsim', name: 'HGWS Légi Öntözés', icon: '✈️', unit: 'p', desc: '3D repülőszimulátor Magyarország felett: öntözés, tűzoltás, precíziós célok és vízikarikák – rekord: a legjobb küldetéspontszám.', c: '#2aa7d9' },
  { id: 'szerver', name: 'Cable Horror', icon: '🖥️', unit: 'Ft', fmt: v => Math.floor(+v || 0).toLocaleString('hu-HU') + ' Ft', desc: 'Garázsszervertől az adatközpontig: szerverépítés, kábelezés, ügyfelek és kriptobányászat – rekord: az összes bevétel.', c: '#4cc9f0' },
  { id: 'kohovar', name: 'Kohóvár', icon: '⛏️', unit: 'hullám', fmt: v => Math.floor(+v || 0) + '. hullám', desc: 'Gyárépítő toronyvédelem a Mindustry alapján – rekord: a szabad játék végtelen módjának legmagasabb hulláma.', c: '#ffd37f' },
  { id: 'vasut', name: 'Derail Hungary', icon: '🚂', unit: 'Ft', fmt: v => Math.floor(+v || 0).toLocaleString('hu-HU') + ' Ft', desc: 'Teherfuvarozás Magyarország valódi vasúthálózatán – rekord: az összes megkeresett fuvardíj.', c: '#a9b4c2' },
  { id: 'atemelotelep', name: 'Az Átemelőtelep', icon: '🏭', desc: 'Éjszakai ügyelet egy szabotált szennyvízátemelőn – mielőtt túlcsordul a medence. Rekord: a leggyorsabb teljes idő.', c: '#e8b656', fmt: v => { const t = Math.max(0, 1e6 - v); return Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0'); } },
  { id: 'birodalom', name: 'Öntöző Birodalom', icon: '🌱', unit: 'Ft', fmt: v => { let m, e; if (typeof v === 'string' && /e/i.test(v)) { [m, e] = v.split(/e/i).map(Number); } else { v = +v || 0; if (v < 1e6) return Math.floor(v).toLocaleString('hu-HU') + ' Ft'; e = Math.floor(Math.log10(v)); m = v / 10 ** e; } if (m >= 9.995) { m /= 10; e++; } return m.toFixed(2).replace('.', ',') + 'E' + e + ' Ft'; }, desc: 'Építs csőhálózatot, ültess kertet és ültetvényt – a kerted akkor is termel, amikor nem vagy itt.', c: '#6fcf6a' },
  { id: 'aszaly', name: 'Aszálytúlélő', icon: '🌵', desc: 'Hordatúlélő: a fegyvereid maguktól tüzelnek, te mozogsz, cseppeket gyűjtesz és szintet lépsz. Meddig bírod Szikkadt Szilárd serege ellen?', c: '#ff9a3c' }
];
const EXTRA = [{ id: 'boonline', name: 'Öntöző Birodalom Online', icon: '🌍', desc: 'Közös világ 13 régióval: telkek, piac, vezetékek, szövetkezetek, heti ostrom.', c: '#e8b656', tag: 'CLOSED BETA', href: '#/birodalom' }, { id: 'aranylocsolofej', name: 'Az Arany Locsolófej', icon: '🏆', desc: 'Filmes kalandjáték: szerezd vissza az Arany Locsolófejet Szikkadt Szilárdtól!', c: '#e8b656', demo: 1, tag: 'ÚJ' }, { id: 'locsolohaboru', name: 'Locsolóháború', icon: '💦', desc: 'Első személyű vízipisztoly-aréna 2–8 játékosnak – barátokkal vagy botok ellen.', c: '#4aa8ff', demo: 1, tag: 'ONLINE' }, { id: 'vizagyuio', name: 'Vízágyú.io', icon: '🔫', desc: 'Valós idejű locsolóaréna 2–8 játékosnak – barátokkal vagy botok ellen.', c: '#6cc6ff', demo: 1, tag: 'ONLINE' }, { id: 'zerochip', name: 'Zero Chip', icon: '🔌', desc: 'Építs áramköröket a tranzisztortól a processzorig – 61 küldetés.', c: '#3ecf8e', demo: 1 }, { id: 'zerospace', name: 'Zero Space Demo', icon: '🚀', desc: 'Építs űrhajót modulról modulra és vezesd csatába – korai demó, egyjátékos sandbox.', c: '#b2382a', demo: 1 }];
/* Zero Quest – zárt béta: adminok és a „Béta-tesztelő” taggel rendelkezők */
const betaOk = () => { try { return !!C && !C.S.guest && (C.isAdmin() || (C.S.me?.tags || []).some(id => /b[eé]ta/i.test(C.S.tags.find(t => t.id === id)?.name || ''))); } catch (_) { return false; } };
const ZQ = { id: 'zeroquest', name: 'Zero Quest', icon: '⚔️', desc: 'A Szikkadt Korona – komor akció-szerepjáték a kiszáradt Ázottföldön – zárt béta.', c: '#e8b656', demo: 1, beta: 1 };
const extras = () => betaOk() ? [...EXTRA, ZQ] : EXTRA;
/* „A Zerosites támogatásával” – minden játék, kivéve a három klasszikust */
const NOSPON = ['locsolo', 'vizagyu', 'csepp', 'vizfuvar'];
[...GAMES, ...EXTRA, ZQ].forEach(g => { if (!NOSPON.includes(g.id)) g.sponsor = 'A Zerosites támogatásával'; });
/* népszerűség: játékonkénti indításszám (plays/{játék}.n), munkamenetenként játékonként egyszer nő */
let PLAYS = (() => { try { return JSON.parse(localStorage.getItem('hgws_plays') || '{}') || {}; } catch (_) { return {}; } })(), playsAt = 0;
const byPop = l => l.map((g, i) => [g, i]).sort((a, b) => (PLAYS[b[0].id] || 0) - (PLAYS[a[0].id] || 0) || a[1] - b[1]).map(x => x[0]);
async function loadPlays() {
  if (Date.now() - playsAt < 60e3) return PLAYS; playsAt = Date.now();
  try { const s = await FB.getDocs(FB.collection(db, 'plays')); const o = {}; s.docs.forEach(d => { o[d.id] = +d.data().n || 0; }); PLAYS = o; localStorage.setItem('hgws_plays', JSON.stringify(o)); } catch (_) {}
  const g = $('.arcrow .agrid'); if (g) byPop([...GAMES, ...extras()]).forEach((x, i) => { const a = g.querySelector(`[href="#/arcade/${x.id}"]`); if (a) { g.appendChild(a); a.querySelector('.an').textContent = String(i + 1).padStart(2, '0'); } });
  return PLAYS;
}
/* felhőmentés idle játékokhoz: cloudsaves/{uid}/g/{játék} = { life, st, updatedAt } – a szabály csak nagyobb vagy egyenlő life-ot enged */
const CS_GAMES = ['birodalom', 'szerver', 'szerver2', 'szerver3'], CS_GAP = 30 * 60e3; // automatikus mentés legfeljebb 30 percenként + kilépéskor; kézi mentést csak admin indíthat (minden felhőmentéses játékra)
const csLast = g => { try { return +localStorage.getItem('hgws_cs_' + g) || 0; } catch (_) { return 0; } };
const csMan = () => C.isOwner() || (!guest() && ((ROLES[S().me?.role] || ROLES.user).rank || 0) >= ((ROLES.moderator && ROLES.moderator.rank) || 40)); // kézi felhőmentés: csak rang alapján (moderátor és afölött), tagtől és külön engedélytől függetlenül
async function cloudGet(win, game) {
  if (!CS_GAMES.includes(game) || guest() || !C.uid()) return win.postMessage({ hgws: 'cs', game, none: 1 }, location.origin);
  try { const d = (await FB.getDoc(FB.doc(db, 'cloudsaves', C.uid(), 'g', game))).data(); win.postMessage({ hgws: 'cs', game, life: d ? +d.life || 0 : 0, lg: d && typeof d.lg === 'number' ? d.lg : undefined, st: d ? d.st : null, admin: csMan() }, location.origin); }
  catch (e) { win.postMessage({ hgws: 'cs', game, none: 1, err: (e && e.code) || 'hiba', admin: csMan() }, location.origin); } // pl. ha a szabály még nincs kitéve: a játék így ki tudja írni az okát
}
function cloudPut(m, win) {
  const ack = (ok, err) => { if (m.ack) win?.postMessage({ hgws: 'cs', game: m.game, ack: 1, ok, err }, location.origin); };
  if (!CS_GAMES.includes(m.game) || guest() || !C.uid() || typeof m.st !== 'string' || m.st.length > 900000 || !(m.life >= 0)) return ack(false, 'nincs bejelentkezve');
  if (m.man && !csMan()) return ack(false, 'kézi mentést csak moderátor vagy magasabb rang indíthat');
  if (!m.man && !m.exit && Date.now() - csLast(m.game) < CS_GAP) return ack(false, 'automatikus mentés 30 percenként egyszer');
  FB.setDoc(FB.doc(db, 'cloudsaves', C.uid(), 'g', m.game), { life: Math.min(9e15, +m.life || 0), lg: typeof m.lg === 'number' && isFinite(m.lg) ? m.lg : 0, st: m.st, updatedAt: FB.serverTimestamp() }).then(() => { try { localStorage.setItem('hgws_cs_' + m.game, Date.now()); } catch (_) {} ack(true); }, er => ack(false, er?.code === 'permission-denied' ? 'elutasítva – kisebb mentés, túl gyakori írás vagy nincs kint a szabály' : 'hálózati hiba'));
}
function countPlay(id) {
  if (!/^[a-z0-9]{2,24}$/.test(id || '') || !C.uid()) return;
  try { const k = 'hgws_played_' + id; if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch (_) {}
  PLAYS[id] = (PLAYS[id] || 0) + 1;
  FB.setDoc(FB.doc(db, 'plays', id), { n: FB.increment(1) }, { merge: true }).catch(() => {});
}
const best = id => { try { return +localStorage.getItem('hgws_best_' + id) || 0; } catch (_) { return 0; } };
/* az Arcade listaoldal (js/arcade-lista.js) csak ezeken át olvas: saját rekord, formázás, játékszám, top 10 */
/* ki mit játszik éppen: playing/{uid} = { g, at } – percenként frissül, amíg a játék nyitva van; a lista az utóbbi 2,5 perc jelzéseit számolja */
let nowG = '', nowT = 0;
function playing(id) { clearInterval(nowT); nowT = 0; const u = C.uid(); if (!u) return; const ref = FB.doc(db, 'playing', u);
  if (!id) { if (nowG) FB.deleteDoc(ref).catch(() => {}); nowG = ''; return; } nowG = id; const ping = () => { if (!document.hidden) FB.setDoc(ref, { g: id, at: FB.serverTimestamp() }).catch(() => {}); }; ping(); nowT = setInterval(ping, 60e3); }
const WHO = {}; // moderátori nézet: játékonként az éppen játszók neve
async function activeNow() { const o = {}, w = {}; try { const s = await FB.getDocs(FB.query(FB.collection(db, 'playing'), FB.where('at', '>', FB.Timestamp.fromMillis(Date.now() - 150e3)))); s.docs.forEach(d => { const g = d.data().g; if (typeof g !== 'string') return; o[g] = (o[g] || 0) + 1; const u = S().users.get(d.id); (w[g] = w[g] || []).push(u ? u.name : FORCED.get(d.id) || S().guests?.get(d.id)?.nick || 'Vendég'); }); } catch (_) {} for (const k in WHO) delete WHO[k]; Object.assign(WHO, w); return o; }
addEventListener('hashchange', () => { if (!/^#\/arcade\/\w/.test(location.hash)) playing(''); }); addEventListener('pagehide', () => playing(''));
const arcCtx = { best, active: () => activeNow(), who: id => C.isMod() ? (WHO[id] || []) : [], num: bigNum, beta: () => betaOk(), fmt: (id, v) => { const g = GAMES.find(x => x.id === id); return g && g.fmt ? g.fmt(v) : null; }, playsNow: () => PLAYS, plays: () => loadPlays(),
  profile: (uid, nick) => lbProfile(uid, nick),
  boards: async week => { const wk = weekKey(); return Promise.all(GAMES.map(async g => ({ id: g.id, name: g.name, icon: g.icon, rows: (await topOf(week ? g.id + '_' + wk : g.id, 10)).map(r => ({ uid: r.uid, nick: r.nick || '', name: lbName(r.uid, r.nick), wins: r.wins, me: r.uid === C.uid(), score: g.fmt ? g.fmt(r.score) : bigNum(r.score) + (g.unit ? ' ' + g.unit : '') })) }))); },
  top: async id => { const g = GAMES.find(x => x.id === id); return (await topOf(id, 10)).map(r => ({ name: lbName(r.uid, r.nick), me: r.uid === C.uid(), score: g && g.fmt ? g.fmt(r.score) : bigNum(r.score) + (g && g.unit ? ' ' + g.unit : '') })); } };
function arcadeRow() { return ArcL.homeRow(arcCtx); }
/* ha a tagek vagy a saját fiók megváltozik, a zárt béta jogosultságot újraküldjük az Arcade-nak */
export function tagsChanged() { const f = $('.arcframe'); if (f) sendBoards(f.contentWindow); }
export const watchGuestNames = () => watchForced();
/* moderátor (és afölött): vendég átnevezése. Vissza: { ok } | { err, free? } – free: a legközelebbi szabad név, ha a kért foglalt */
export async function modRenameGuest(uid, raw) { if (!C.isMod() || typeof uid !== 'string' || !/^[\w-]{6,128}$/.test(uid)) return { err: 'Nincs jogosultság.' };
  const n = String(raw || '').trim().replace(/\s+/g, ' '), m = nickError(n); if (m) return { err: m };
  if (await nickTaken(n, uid)) { const f = await freeNick(n, uid); return { err: 'Ez a név már foglalt – szabad: ' + f, free: f }; }
  try { const old = await FB.getDocs(FB.query(FB.collection(db, 'guestnames'), FB.where('uid', '==', uid))); await FB.setDoc(gnRef(n), { uid, nick: n, at: FB.serverTimestamp(), lock: true }); await Promise.all(old.docs.filter(d => d.id !== n.toLowerCase()).map(d => FB.deleteDoc(d.ref).catch(() => {}))); toast('Vendég átnevezve: ' + n); return { ok: true }; }
  catch (e) { return { err: 'Nem sikerült: ' + errText(e) }; } }
/* moderátor: vendégfiók összevonása egy regisztrált fiókkal – a ranglistás eredmények (mindenkori, e heti) és a Drift-idők átkerülnek,
   játékonként a jobbik marad; a vendég jelenléte és neve törlődik, a merges/{vendég} jelzi neki, hogy a fiókjával lépjen be */
const DRIFT_TRACKS = ['belvaros', 'neon', 'kikoto', 'csillag', 'kigyo', 'szoloheggy', 'erdei', 'nyolcas', 'szerpentin', 'csucstamadas', 'teli', 'sivatag'];
export async function mergeGuest(gid, uid) { const ok = s => typeof s === 'string' && /^[\w-]{6,128}$/.test(s); if (!C.isMod() || !ok(gid) || !ok(uid) || gid === uid || !S().users.get(uid)) return { err: 'Nincs jogosultság vagy érvénytelen fiók.' };
  const wk = weekKey(); let moved = 0, gnick = '';
  try {
    for (const g of GAMES) for (const lb of [g.id, g.id + '_' + wk]) { const gr = FB.doc(db, 'leaderboards', lb, 'scores', gid), gs = await FB.getDoc(gr); if (!gs.exists()) continue; const gd = gs.data(); gnick = gnick || gd.nick || '';
      const tr = FB.doc(db, 'leaderboards', lb, 'scores', uid), t = (await FB.getDoc(tr)).data(), best = Math.max(+gd.best || 0, +t?.best || 0), wins = (gd.wins || 0) + (t?.wins || 0);
      if (!t || best > (+t.best || 0) || wins !== (t.wins || 0)) await FB.setDoc(tr, { best, at: FB.serverTimestamp(), ...(wins ? { wins } : {}), merged: gid }); await FB.deleteDoc(gr); moved++; }
    for (const tk of DRIFT_TRACKS) { const gr = FB.doc(db, 'ghosts', tk, 'runs', gid), gs = await FB.getDoc(gr); if (!gs.exists()) continue; const gd = gs.data(), tr = FB.doc(db, 'ghosts', tk, 'runs', uid), t = (await FB.getDoc(tr)).data();
      if (!t || gd.ms < t.ms || gd.rms < t.rms) { const lap = !t || gd.ms <= t.ms ? gd : t; await FB.setDoc(tr, { ms: Math.min(gd.ms, t?.ms ?? gd.ms), rms: Math.min(gd.rms, t?.rms ?? gd.rms), car: lap.car, path: lap.path, at: FB.serverTimestamp(), merged: gid }); }
      await FB.deleteDoc(gr); moved++; }
    await FB.setDoc(FB.doc(db, 'merges', gid), { into: uid, by: C.uid(), at: FB.serverTimestamp() });
    const names = await FB.getDocs(FB.query(FB.collection(db, 'guestnames'), FB.where('uid', '==', gid))); gnick = gnick || names.docs[0]?.data().nick || 'Vendég'; await Promise.all(names.docs.map(d => FB.deleteDoc(d.ref).catch(() => {})));
    await FB.deleteDoc(FB.doc(db, 'guests', gid)).catch(() => {});
    audit('guest.merge', gnick, '→ ' + S().users.get(uid).name); toast(`Összevonva: ${gnick} → ${S().users.get(uid).name} (${moved} eredmény)`); return { ok: true, moved };
  } catch (e) { return { err: 'Nem sikerült: ' + errText(e) + (moved ? ` (${moved} eredmény már átkerült)` : '') }; } }
/* vendégként: ha a fiókot egy moderátor összevonta egy regisztrált fiókkal, szólunk, hogy azzal lépjen be */
export async function mergedNotice() { if (!guest()) return; try { const s = await FB.getDoc(FB.doc(db, 'merges', C.uid())); if (!s.exists()) return; const u = S().users.get(s.data().into); toast(`Ezt a vendégfiókot összevontuk${u ? ' a(z) ' + u.name + ' fiókkal' : ' egy regisztrált fiókkal'} – az eredményeid ott vannak. Jelentkezz be azzal a fiókkal.`); } catch (_) {} }
export function arcade(id) {
  cleanup(); watchForced();
  document.title = 'Arcade · HGWS';
  const [gid, rid] = String(id || '').split('.'), g = [...GAMES, ...extras()].find(x => x.id === gid);
  if (!g) { playing(''); ArcL.render($('#page'), arcCtx); const ps = Promo.stripHtml(); if (ps) { ($('#page .arcl') || $('#page')).insertAdjacentHTML('afterbegin', `<div class="pstripw arc">${ps}</div>`); Promo.wire(); } awardChampions(); return; } // játék nélkül: az új listaoldal
  ArcL.played(g.id); playing(g.id);
  $('#page').innerHTML = `<iframe class="arcframe" src="arcade.html${new URL(import.meta.url).search}${g ? '#play=' + g.id + (rid && /^\w+$/.test(rid) ? '.' + rid : '') : ''}" title="HGWS Arcade" allow="autoplay; fullscreen"></iframe>`;
  const f = $('.arcframe');
  f.addEventListener('load', () => { try { f.contentWindow.focus(); } catch (_) {} });
  awardChampions();
}

/* ---------- Arcade online ranglista ----------
   leaderboards/{játék}/scores/{uid}          – mindenkori rekord
   leaderboards/{játék}_{év-hét}/scores/{uid} – heti rekord */
export function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear(), w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return y + '-W' + String(w).padStart(2, '0');
}
const lbCol = lb => FB.collection(db, 'leaderboards', lb, 'scores');
async function topOf(lb, n = 10) {
  try { const s = await FB.getDocs(FB.query(lbCol(lb), FB.orderBy('best', 'desc'), FB.limit(n * 3)));
    return s.docs.map(d => ({ uid: d.id, raw: +d.data().best || 0, score: lbDec(d.data().best), wins: d.data().wins || 0, nick: d.data().nick })).sort((a, b) => b.raw - a.raw || b.wins - a.wins).slice(0, n); } catch (_) { return []; }
}
async function sendBoards(win) {
  const wk = weekKey(), boards = {}, plays = await loadPlays();
  await Promise.all(GAMES.map(async g => {
    const [all, week] = await Promise.all([topOf(g.id), topOf(g.id + '_' + wk)]);
    const adm = C.isAdmin(), fmt = l => l.map(r => ({ name: lbName(r.uid, r.nick), guest: !!r.nick, score: r.score, wins: r.wins, me: r.uid === C.uid(), uid: r.uid }));
    boards[g.id] = { all: fmt(all), week: fmt(week) };
  }));
  win?.postMessage({ hgws: 'lb', boards, plays, week: wk.replace('-W', '. év ') + '. hét', guest: guest(), nick: guest() ? getNick() : '', admin: C.isAdmin(), beta: betaOk() }, location.origin);
}
/* Drift Király: pályánkénti legjobb kör (szellem) és legjobb verseny-idő */
const okTrack = t => typeof t === 'string' && /^[a-z0-9_]{1,24}$/.test(t);
async function ghostList(tracks) {
  const out = {};
  await Promise.all((Array.isArray(tracks) ? tracks : []).slice(0, 20).filter(okTrack).map(async t => {
    try {
      const col = FB.collection(db, 'ghosts', t, 'runs');
      const [a, b] = await Promise.all([FB.getDocs(FB.query(col, FB.orderBy('ms'), FB.limit(3))), FB.getDocs(FB.query(col, FB.orderBy('rms'), FB.limit(1)))]);
      const m = new Map(); for (const d of [...a.docs, ...b.docs]) m.set(d.id, d.data());
      if (!m.has(C.uid())) { const s = await FB.getDoc(FB.doc(db, 'ghosts', t, 'runs', C.uid())); if (s.exists()) m.set(s.id, s.data()); }
      out[t] = [...m].map(([uid, r]) => ({ name: lbName(uid, r.nick), guest: !!r.nick, ms: r.ms < 36e5 ? r.ms : 0, rms: r.rms < 36e5 ? r.rms : 0, car: r.car, p: r.ms < 36e5 ? r.path : '', me: uid === C.uid() }));
    } catch (_) {}
  }));
  return out;
}
async function ghostSave(d) {
  if (!okTrack(d.track)) return;
  const nick = await nickFor(); if (nick === null) return;
  const ref = FB.doc(db, 'ghosts', d.track, 'runs', C.uid());
  try {
    const s = await FB.getDoc(ref), o = s.data() || {}, big = 36e5;
    const lap = Number.isInteger(d.ms) && d.ms > 5000 && d.ms < big && typeof d.path === 'string' && d.path.length < 60000 && typeof d.car === 'string' && d.car.length < 20 && d.ms < (o.ms || big);
    const race = Number.isInteger(d.rms) && d.rms > 10000 && d.rms < big && d.rms < (o.rms || big);
    if (!lap && !race) return;
    await FB.setDoc(ref, { ms: lap ? d.ms : (o.ms || big), car: lap ? d.car : (o.car || ''), path: lap ? d.path : (o.path || ''), rms: race ? d.rms : (o.rms || big), at: FB.serverTimestamp(), ...nick });
  } catch (e) { console.warn('szellem', e); }
}
/* ---------- vendég becenév a ranglistához ----------
   A vendég (névtelen Firebase-fiók) uid-ja megmarad ebben a böngészőben, így a rekordjai is.
   A becenév localStorage-ben van, és minden rekord-dokumentumba bekerül („nick” mező). */
const NICK_KEY = 'hgws_nick';
const NICK_A = ['Csöpögő', 'Szomjas', 'Rozsdás', 'Pörgő', 'Bátor', 'Álmos', 'Kócos', 'Csúszós', 'Turbó', 'Vizes', 'Morcos', 'Vidám', 'Laza', 'Fürge', 'Kósza', 'Ügyes', 'Ázott', 'Sunyi', 'Nyugis', 'Pimasz'];
const NICK_B = ['Locsolófej', 'Slag', 'Kaktusz', 'Csiga', 'Uborka', 'Vödör', 'Szivattyú', 'Kertitörpe', 'Pocsolya', 'Esőfelhő', 'Retek', 'Sünimalac', 'Tökfej', 'Kacsa', 'Csepp', 'Gereblye', 'Spenót', 'Béka', 'Sárkány', 'Krumpli'];
function funnyNick() {
  for (let i = 0; i < 20; i++) { const n = NICK_A[Math.random() * NICK_A.length | 0] + ' ' + NICK_B[Math.random() * NICK_B.length | 0] + ' ' + (10 + (Math.random() * 90 | 0)); if (n.length <= 20) return n; }
  return 'Vizes Csiga ' + (10 + (Math.random() * 90 | 0));
}
/* a vendég beceneve: amíg nem ad meg sajátot, egy véletlenszerű (vicces) név, ami ebben a böngészőben megmarad */
export const getNick = () => { try { let n = localStorage.getItem(NICK_KEY); if (!n) { n = funnyNick(); localStorage.setItem(NICK_KEY, n); } return n; } catch (_) { return 'Vizes Csiga 42'; } };
const setNick = n => { try { localStorage.setItem(NICK_KEY, n); } catch (_) {} };
/* vendégnevek egyedisége: guestnames/{kisbetűs név} = { uid, nick, at, lock }
   – a vendég lefoglalja a saját nevét; foglalt névnél szám kerül a végére. Két hónapja nem frissített foglalás átvehető.
   – lock: a nevet moderátor állította be; a vendég ilyenkor nem módosíthatja, és mindenhol ez a név látszik. */
const FORCED = new Map(); let gnLock = false, gnWatch = false;
const gnRef = n => FB.doc(db, 'guestnames', n.toLowerCase());
const gnFresh = d => Date.now() - (toDate(d.at)?.getTime() || 0) < 60 * 864e5;
async function nickTaken(n, uid = C.uid()) { try { const d = (await FB.getDoc(gnRef(n))).data(); return !!d && d.uid !== uid && (!!d.lock || gnFresh(d)); } catch (_) { return false; } } // ha a szabály még nincs kint, nem akadályozunk
async function claimNick(n) { try { if (await nickTaken(n)) return 'taken'; await FB.setDoc(gnRef(n), { uid: C.uid(), nick: n, at: FB.serverTimestamp() }); return 'ok'; } catch (_) { return 'err'; } }
const withNum = (base, k) => { const b = base.replace(/\s*\d+$/, ''), suf = ' ' + k; return b.slice(0, 20 - suf.length).trim() + suf; };
async function freeNick(n, uid) { if (!(await nickTaken(n, uid))) return n; for (let i = 0; i < 14; i++) { const c = withNum(n, i < 8 ? 2 + i : 10 + (Math.random() * 90 | 0)); if (!(await nickTaken(c, uid))) return c; } return withNum(n, 100 + (Math.random() * 900 | 0)); }
function watchForced() { if (gnWatch) return; gnWatch = true; try { FB.onSnapshot(FB.query(FB.collection(db, 'guestnames'), FB.where('lock', '==', true)), s => { FORCED.clear(); s.docs.forEach(d => { const x = d.data(); if (x.uid) FORCED.set(x.uid, x.nick); });
    const mine = guest() && FORCED.get(C.uid()); gnLock = !!mine; if (mine && mine !== getNick()) { setNick(mine); applyNick(mine); } tagsChanged(); }, () => {}); } catch (_) {} }
/* vendégként belépve: a moderátor által adott név átvétele, különben a saját név lefoglalása (ütközésnél számmal a végén) */
export async function guestNames() { if (!guest() || !C.uid()) return; watchForced(); const cur = getNick(), n = await freeNick(cur); if (gnLock) return; if (n !== cur) { setNick(n); applyNick(n); } claimNick(n); }
const lbName = (uid, nick) => FORCED.get(uid) || (nick ? String(nick) : C.U(uid).name);
let nickAsk = null, nickSkip = false;
function nickError(n) {
  if (n.length < 2 || n.length > 20) return 'A becenév 2–20 karakter legyen.';
  if (/[<>&"\/]/.test(n)) return 'Ezek a karakterek nem használhatók: < > & " /';
  if (reservedName(n)) return RESERVED_MSG;
  if (badName(n)) return badMsg(n);
  if ([...S().users.values()].some(u => (u.name || '').trim().toLowerCase() === n.toLowerCase())) return 'Ezt a nevet már egy regisztrált tag használja. Válassz másikat!';
  return '';
}
function askNick(force) {
  if (nickAsk) return nickAsk;
  return nickAsk = new Promise(res => {
    const cur = getNick();
    const el = modal({ title: cur ? 'Becenév módosítása' : '🏆 Felkerülsz a ranglistára!',
      body: `<p style="color:var(--ink2);line-height:1.55;margin-bottom:.8rem">${cur ? 'Az új beceneved az összes eddigi rekordodnál is lecserélődik.' : 'Vendégként is ott lehetsz a ranglistán – add meg, milyen néven szerepelj.'}</p>
        <input class="inp" id="nickInp" maxlength="20" placeholder="Becenév (2–20 karakter)" value="${esc(cur)}" autocomplete="nickname" style="width:100%">
        <p id="nickErr" style="color:#ff8080;font-size:.85rem;min-height:1.2em;margin-top:.4rem"></p>
        <p style="color:var(--ink3,#8f8a7e);font-size:.8rem;line-height:1.5">A vendégrekordok ehhez a böngészőhöz kötődnek. Ha megtartanád őket, és bajnok-taget is szeretnél, regisztrálj!</p>`,
      foot: `<button class="btn plain" data-x>${force ? 'Mégse' : 'Most nem'}</button><button class="btn goldb" data-ok>Mentés</button>`,
      onClose: () => { nickAsk = null; if (!done) { if (!force) nickSkip = true; res(null); } } });
    let done = false;
    const inp = el.querySelector('#nickInp'), err = el.querySelector('#nickErr');
    const ok = async () => { const n = inp.value.trim().replace(/\s+/g, ' '), m = gnLock ? 'A nevedet egy moderátor állította be, nem módosítható.' : nickError(n); if (m) { err.textContent = m; inp.focus(); return; }
      if (n.toLowerCase() !== cur.toLowerCase() && await nickTaken(n)) { const f = await freeNick(n); err.textContent = 'Ez a név már foglalt – szabad: ' + f; inp.value = f; inp.focus(); return; }
      if (cur && cur.toLowerCase() !== n.toLowerCase()) FB.deleteDoc(gnRef(cur)).catch(() => {}); claimNick(n);
      done = true; setNick(n); el.close(); res(n); };
    el.querySelector('[data-ok]').onclick = ok;
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); });
  });
}
/* {} regisztrált tagnak, { nick } vendégnek, null ha a vendég nem adott meg becenevet */
async function nickFor() {
  if (!guest()) return {};
  return { nick: getNick() };
}
/* becenév-csere: a vendég meglévő rekordjaiban is átírjuk */
async function renameNick() {
  if (!guest()) return;
  const n = await askNick(true); if (!n) return;
  await applyNick(n); toast('Becenév mentve: ' + n);
}
async function applyNick(n) {
  const me = C.uid(), wk = weekKey(), refs = GAMES.flatMap(g => [g.id, g.id + '_' + wk].map(lb => FB.doc(db, 'leaderboards', lb, 'scores', me)));
  await Promise.all(refs.map(async ref => { try { const s = await FB.getDoc(ref); if (s.exists() && s.data().nick !== n) await FB.setDoc(ref, { ...s.data(), nick: n, at: FB.serverTimestamp() }); } catch (e) { console.warn('becenév', e); } }));
}
/* admin/tulaj: egy játékos eredményének törlése (mindenkori + heti) */
async function delScore(game, uid) {
  if (!C.isAdmin() || !GAMES.some(g => g.id === game) || typeof uid !== 'string' || !/^[\w-]{6,128}$/.test(uid)) return;
  const name = lbName(uid, null);
  try { await Promise.all([game, game + '_' + weekKey()].map(lb => FB.deleteDoc(FB.doc(db, 'leaderboards', lb, 'scores', uid))));
    if (game === 'drift') await Promise.all(['belvaros', 'neon', 'kikoto', 'csillag', 'kigyo', 'szoloheggy', 'erdei', 'nyolcas', 'szerpentin', 'csucstamadas', 'teli', 'sivatag'].map(t => FB.deleteDoc(FB.doc(db, 'ghosts', t, 'runs', uid)).catch(() => {})));
    toast('Eredmény törölve' + (name ? ': ' + name : ''));
  } catch (e) { console.warn('ranglista-törlés', e); toast('Nem sikerült törölni.'); }
}
/* gyanús (pl. időmanipulációs) eredmény: nem kerül ranglistára, csak a moderátori ellenőrző listára */
async function saveSuspect(game, score, why) { if (!GAMES.some(g => g.id === game) || !(score > 0) || !C.uid()) return; const u = C.U && C.U(C.uid());
  try { await FB.addDoc(FB.collection(db, 'suspects'), { uid: C.uid(), name: String(guest() ? getNick() || 'Vendég' : (u && u.name) || '').slice(0, 40), guest: !!guest(), game, score: Math.min(+score || 0, 9e15), why: String(why || 'ido').slice(0, 20), at: FB.serverTimestamp() }); } catch (_) {} }
async function saveScore(game, score, win, sync, lg) {
  if (!GAMES.some(g => g.id === game) || !(score > 0)) return;
  const nick = await nickFor(); if (nick === null) return;
  const me = C.uid(), sc = lbEnc(score, lg);
  // szinkronnál csak az örök ranglistára (a régi rekord a heti listába nem való)
  for (const lb of sync ? [game] : [game, game + '_' + weekKey()]) {
    const ref = FB.doc(db, 'leaderboards', lb, 'scores', me);
    try { const s = await FB.getDoc(ref), o = s.data() || {}, ob = o.best || 0;
      if (sc > ob || win) await FB.setDoc(ref, { best: Math.max(sc, ob), at: FB.serverTimestamp(), ...(win || o.wins ? { wins: (o.wins || 0) + (win ? 1 : 0) } : {}), ...nick }); } catch (e) { console.warn('ranglista', e); if (!lbErr[game]) { lbErr[game] = 1; toast(`Ranglista – ${GAMES.find(g => g.id === game)?.name || game}: nem sikerült menteni (${e?.code || e?.message || 'ismeretlen hiba'}, érték: ${bigNum(score)})`, true); } }
  }
}
const lbErr = {}; /* ranglista-profil: a névre kattintva a játékos (vendég is) összes rekordja egy ablakban */
export async function lbProfile(uid, nick) {
  if (typeof uid !== 'string' || !/^[\w-]{6,128}$/.test(uid)) return;
  watchForced(); const u = S().users.get(uid), name = u ? u.name : FORCED.get(uid) || (typeof nick === 'string' && nick.trim().slice(0, 20)) || 'Vendég', wk = weekKey(), modRen = !u && C.isMod();
  const el = modal({ title: 'Ranglista-profil', body: `<div style="display:flex;align-items:center;gap:.9rem;margin-bottom:1rem">${u ? avatar(u, 56) : '<span style="width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:var(--bg3);font-size:1.6rem">🎮</span>'}
      <div><b style="font-size:1.15rem">${esc(name)}</b> ${u ? C.tagPills(u, 4) : '<span class="utag" style="--tc:#8f8a7e">Vendég</span>'}</div></div>${modRen ? `<div style="display:flex;gap:.5rem;align-items:center;margin-bottom:.4rem"><input class="inp" data-gn maxlength="20" value="${esc(name)}" style="flex:1" autocomplete="off"><button class="btn plain" data-gnok>Átnevezés</button></div><p data-gnerr style="color:#ff8080;font-size:.85rem;min-height:1.2em;margin-bottom:.6rem"></p>` : ''}<div data-rec><div class="empty">Betöltés…</div></div>`,
    foot: `${u ? `<a class="btn plain" href="#/profil/${esc(uid)}" data-x><i class="ic ic-user"></i> Teljes profil</a>` : ''}<button class="btn goldb" data-x>Bezárás</button>` });
  if (modRen) el.querySelector('[data-gnok]').onclick = async () => { const inp = el.querySelector('[data-gn]'), er = el.querySelector('[data-gnerr]'), r = await modRenameGuest(uid, inp.value);
    if (r.free) inp.value = r.free; er.style.color = r.ok ? 'var(--green)' : '#ff8080'; er.textContent = r.ok ? 'Átnevezve. A vendég a nevét ezután nem tudja módosítani.' : r.err; };
  const get = async lb => { try { return (await FB.getDoc(FB.doc(db, 'leaderboards', lb, 'scores', uid))).data() || null; } catch (_) { return null; } };
  const rows = await Promise.all(GAMES.map(async g => { const [a, w] = await Promise.all([get(g.id), get(g.id + '_' + wk)]); return { g, a, w }; })), has = rows.filter(r => r.a || r.w);
  const box = el.querySelector('[data-rec]'); if (!box) return; const num = (d, g) => d ? (g.fmt ? g.fmt(lbDec(d.best)) : bigNum(lbDec(d.best)) + (g.unit ? ' ' + g.unit : '')) : '–';
  box.innerHTML = has.length ? `<div style="display:grid;grid-template-columns:1fr auto auto;gap:.45rem 1.1rem;align-items:center"><small style="opacity:.6">JÁTÉK</small><small style="opacity:.6;text-align:right">MINDEN IDŐK</small><small style="opacity:.6;text-align:right">E HÉT</small>
    ${has.map(r => `<span>${r.g.icon} ${esc(r.g.name)}${r.a?.wins ? ` <span class="utag" style="--tc:#e8b656">🏆×${r.a.wins}</span>` : ''}</span><b style="text-align:right">${num(r.a, r.g)}</b><span style="text-align:right;opacity:.85">${num(r.w, r.g)}</span>`).join('')}</div>` : '<div class="empty">Még nincs rekordja.</div>';
}
let synced = false; const syncBest = {}; // az első szinkron (régi helyi rekordok) csak az örök listára megy, a munkamenet közbeni új rekord a hetire is
addEventListener('message', async e => {
  if (e.origin !== location.origin || !e.data?.hgws) return;
  const fr = $('.arcframe'); if (!fr || e.source !== fr.contentWindow) return;
  if (e.data.hgws === 'suspect') { saveSuspect(e.data.game, e.data.score, e.data.why); return; }
  if (e.data.hgws === 'score') { await saveScore(e.data.game, e.data.score, !!e.data.win, false, typeof e.data.lg === 'number' ? e.data.lg : undefined); sendBoards(fr.contentWindow); }
  if (e.data.hgws === 'lbreq') sendBoards(fr.contentWindow);
  if (e.data.hgws === 'play') countPlay(e.data.game);
  if (e.data.hgws === 'csreq') cloudGet(fr.contentWindow, e.data.game);
  if (e.data.hgws === 'cssave') cloudPut(e.data, fr.contentWindow);
  if (e.data.hgws === 'csdel' && CS_GAMES.includes(e.data.game) && !guest() && C.uid()) FB.deleteDoc(FB.doc(db, 'cloudsaves', C.uid(), 'g', e.data.game)).catch(() => {}); // új játék: a régi felhőmentés törlése
  if (e.data.hgws === 'sync' && !guest() && C.uid()) { const first = !synced; synced = true; let ch = 0; for (const [g, v] of Object.entries(e.data.bests || {})) if (v > (syncBest[g] || 0)) { syncBest[g] = v; ch = 1; await saveScore(g, v, false, first); } if (ch) sendBoards(fr.contentWindow); }
  if (e.data.hgws === 'nickreq') { await renameNick(); sendBoards(fr.contentWindow); }
  if (e.data.hgws === 'lbprof') lbProfile(e.data.uid, e.data.nick);
  if (e.data.hgws === 'nav' && (e.data.to === '#/birodalom' || e.data.to === '#/arcade')) location.hash = e.data.to;
  if (e.data.hgws === 'lbdel') { await delScore(e.data.game, e.data.uid); sendBoards(fr.contentWindow); }
  if (e.data.hgws === 'ghostreq') fr.contentWindow.postMessage({ hgws: 'ghosts', data: await ghostList(e.data.tracks), guest: guest() }, location.origin);
  if (e.data.hgws === 'ghostsave') await ghostSave(e.data);
});
/* heti bajnok: az előző hét játékonkénti győztesei megkapják az „Arcade-bajnok” taget.
   Szerver nincs, ezért az első tagkezelő (moderátor+) végzi el, aki a hét után megnyitja az Arcade-ot. */
async function awardChampions() {
  if (!C.can('manageTags')) return;
  const tag = S().tags.find(t => t.name === 'Arcade-bajnok'); if (!tag) return;
  const prev = weekKey(new Date(Date.now() - 7 * 864e5)), meta = FB.doc(db, 'meta', 'arcade');
  try {
    const m = await FB.getDoc(meta); if (m.data()?.awarded === prev) return;
    // a bajnok-tag profilhoz kötött, ezért a legjobb REGISZTRÁLT játékos kapja (a vendégek a ranglistán szerepelnek, tagot nem kapnak)
    const winners = [...new Set((await Promise.all(GAMES.map(g => topOf(g.id + '_' + prev, 10)))).map(l => l.find(r => !r.nick && S().users.has(r.uid))?.uid).filter(Boolean))]
      .filter(u => u !== OWNER_UID || C.isOwner());
    const bt = FB.writeBatch(db);
    [...S().users.values()].filter(u => (u.tags || []).includes(tag.id) && !winners.includes(u.id) && (u.id !== OWNER_UID || C.isOwner()))
      .forEach(u => bt.update(FB.doc(db, 'users', u.id), { tags: FB.arrayRemove(tag.id) }));
    winners.filter(u => !(S().users.get(u).tags || []).includes(tag.id) && (S().users.get(u).tags || []).length < 10)
      .forEach(u => bt.update(FB.doc(db, 'users', u), { tags: FB.arrayUnion(tag.id) }));
    bt.set(meta, { awarded: prev, winners, at: FB.serverTimestamp() });
    await bt.commit();
    winners.forEach(u => notify(u, 'tag', `🏆 Te lettél a hét Arcade-bajnoka (${prev})! Megkaptad az „Arcade-bajnok” taget.`, '#/arcade'));
    if (winners.length) audit('arcade.champion', winners.map(u => C.U(u).name).join(', '), prev);
  } catch (e) { console.warn('arcade-bajnok', e); }
}

/* ===================== zene ===================== */
function sq(t) {
  return `<div class="sq" data-track="${esc(t.id)}"><div class="cv" style="${cov(t)}"><button tabindex="-1" aria-label="Lejátszás"><i class="ic ic-play"></i></button></div><b>${esc(t.title)}</b><small>${esc(t.artist || 'HGWS')}</small></div>`;
}
function musicRow() {
  const l = tracks(); if (!l.length) return '';
  return `<section class="row"><div class="rowh"><h2><i class="ic ic-music"></i> Zenék</h2><a href="#/zene">Mind ›</a></div>
    <div class="track"><button class="arr l" hidden aria-label="Vissza">‹</button><div class="strip">${l.map(sq).join('')}</div><button class="arr r" aria-label="Tovább">›</button></div></section>`;
}
export function music() {
  cleanup();
  const l = tracks();
  document.title = 'Zene · HGWS';
  $('#page').innerHTML = `<div class="mhero"><div class="art"></div><div><div class="eyebrow">// HGWS RECORDS</div><h1 class="gold">Zene</h1><p>${l.length} szám · HGWS Studios</p></div></div><div class="pstripw">${Promo.stripHtml()}</div>
    <div class="tracks">${l.length ? `<div class="acts"><button class="bigplay" data-playall title="Összes lejátszása"><i class="ic ic-play"></i></button><span class="hint">Lejátszás közben nyugodtan lapozz tovább – a zene szól.</span></div>
      ${l.map((t, i) => `<div class="trow" data-track="${esc(t.id)}"><span class="n">${i + 1}</span><span class="pc" style="${cov(t)}"></span><div style="min-width:0"><b>${esc(t.title)}</b><small>${esc(t.artist || 'HGWS')}</small></div>
        <div class="ta"><button data-trackshare="${esc(t.id)}" title="Megosztás"><i class="ic ic-share-2"></i></button></div></div>`).join('')}`
      : `<div class="noresult"><div class="big"><i class="ic ic-music"></i></div>Még nincs zene feltöltve.${C.can('publishMedia') || C.can('submitMedia') ? '<br><br><a class="pbtn info" href="#/admin/zene">Zenék kezelése</a>' : ''}</div>`}</div>`;
  Player.refreshMarks(); Promo.wire();
}

/* ===================== filmtár, lista, keresés ===================== */
export function tar(kind) {
  loadRatings();
  cleanup();
  const list = vis(), kinds = [...new Set(list.map(v => v.kind || 'Film'))];
  const k = kind ? decodeURIComponent(kind) : 'all', st = S().tarStatus || 'all';
  const shown = list.filter(v => (k === 'all' || (v.kind || 'Film') === k) && (st === 'all' || (st === 'ready' ? !v.soon : v.soon)));
  document.title = 'Filmtár · HGWS';
  $('#page').innerHTML = `<div class="pg"><div class="eyebrow">// HGWS STUDIOS</div><h1 class="gold">${k === 'all' ? 'Filmtár' : esc(PLURAL[k] || k)}</h1>${Promo.stripHtml()}
    <div class="chipsrow"><button data-k="all" class="${k === 'all' ? 'on' : ''}">Minden</button>${kinds.map(x => `<button data-k="${esc(x)}" class="${k === x ? 'on' : ''}">${esc(PLURAL[x] || x)}</button>`).join('')}
      <span style="width:1px;background:var(--line2);margin:0 .3rem"></span><button data-s="ready" class="${st === 'ready' ? 'on' : ''}"><i class="ic ic-play"></i> Megnézhető</button><button data-s="soon" class="${st === 'soon' ? 'on' : ''}"><i class="ic ic-bell"></i> Hamarosan</button></div>
    ${shown.length ? `<div class="grid">${shown.map(v => tile(v)).join('')}</div>` : '<div class="noresult"><div class="big"><i class="ic ic-clapperboard"></i></div>Nincs ilyen cím.</div>'}</div>${footHtml()}`;
  Promo.wire();
  $$('[data-k]').forEach(b => b.onclick = () => location.hash = b.dataset.k === 'all' ? '#/tar' : '#/tar/' + encodeURIComponent(b.dataset.k));
  $$('[data-s]').forEach(b => b.onclick = () => { S().tarStatus = S().tarStatus === b.dataset.s ? 'all' : b.dataset.s; tar(kind); });
}
export function myList() {
  cleanup();
  const list = S().myList.map(film).filter(v => v && v.visible !== false);
  document.title = 'Saját lista · HGWS'; 
  $('#page').innerHTML = `<div class="pg"><h1 class="gold">Saját listám</h1><p class="lead">Amit elmentettél későbbre – vagy amire várod a premiert.</p>
    ${list.length ? `<div class="grid">${list.map(v => tile(v)).join('')}</div>` : `<div class="noresult"><div class="big"><i class="ic ic-plus"></i></div>Még üres a listád. A filmeknél a <b><i class="ic ic-plus"></i></b> gombbal tudsz hozzáadni.<br><br><a class="pbtn info" href="#/tar">Filmtár</a></div>`}</div>`;
}
export function search(q = '') {
  cleanup();
  q = decodeURIComponent(q);
  const n = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const nq = n(q).trim();
  const res = nq ? vis().filter(v => [v.title, v.en, v.genre, v.kind, v.desc, v.year, ...(v.studios || [])].some(x => n(x).includes(nq))) : vis();
  document.title = 'Keresés · HGWS'; 
  const had = document.activeElement?.id;
  $('#page').innerHTML = `<div class="pg"><h1 class="gold">Keresés</h1><div class="bigsearch"><input id="bq" type="search" placeholder="Címek, műfajok, évek…" value="${esc(q)}" autocomplete="off"></div>
    ${res.length ? `<p class="lead" style="margin-top:1.2rem">${nq ? `Találatok erre: „${esc(q)}”` : 'Minden cím'}</p><div class="grid">${res.map(v => tile(v)).join('')}</div>` : `<div class="noresult"><div class="big"><i class="ic ic-search"></i></div>Nincs találat erre: „${esc(q)}”.</div>`}</div>`;
  const i = $('#bq');
  i.oninput = () => history.replaceState(null, '', '#/kereses/' + encodeURIComponent(i.value)) || search(i.value ? encodeURIComponent(i.value) : '');
  if (had === 'bq' || had === 'sInp' || !q) { if (had !== 'sInp') { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
}

/* ===================== részletek ablak ===================== */
let dlgUnsub = null;
export function detail(id) {
  const v = film(id); if (!v) return;
  const prev = $('#dmodal'), back = prev?._back;
  if (prev) closeDetail(true); else closeDetail();
  const el = document.createElement('div'); el.className = 'dmodal'; el.id = 'dmodal';
  // hasonló címek: azonos típus és műfaj előre
  const score = x => (x.kind === v.kind) * 2 + (!!v.genre && x.genre === v.genre) * 3 + (!x.soon) * .5;
  const sr = v.series ? film(v.series) : null, sid = v.isSeries ? v.id : sr ? sr.id : null, pid = playId(v);
  const similar = vis().filter(x => x.id !== v.id && x.id !== sid).sort((a, b) => score(b) - score(a)).slice(0, 6);
  const bg = bgOf(img(v), v.id + v.title);
  el.innerHTML = `<div class="dlg" role="dialog" aria-modal="true">
    <div class="dtop${bg.cls}" style="${esc(bg.style)}"><div class="tv" id="dtv"></div><button class="x" data-close aria-label="Bezárás"><i class="ic ic-x"></i></button><button class="rnd dmute" id="dmute" hidden title="Hang">${I('volume-x')}</button>
      <div class="c"><div class="orig"><img src="img/logo.webp" alt=""><span><b>HGWS</b> ${esc((v.kind || 'Film').toUpperCase())}</span></div>${sr ? `<button class="serlink" data-info="${esc(sr.id)}"><i class="ic ic-list-video"></i>${esc(sr.title)} · ${esc(epLabel(v))}</button>` : ''}<h2>${esc(v.title)}</h2>
        <div class="hbtns">${v.liveAt && v.soon && v.live?.phase !== 'done' ? `<a class="pbtn play" href="#/premier/${esc(v.id)}"><i class="ic ic-radio"></i>${v.live?.open ? 'Belépés a premierre' : 'Premier oldala'}</a>` : ''}${pid ? `<a class="pbtn play" href="#/nez/${esc(pid)}"><i class="ic ic-play"></i>${progOf(pid) ? 'Folytatás' : 'Lejátszás'}${v.isSeries ? ' · ' + esc(epLabel(film(pid))) : ''}</a>${guest() ? '' : `<button class="pbtn info" data-party="${esc(pid)}"><i class="ic ic-popcorn"></i>Közös nézés</button>`}` : `<span class="pbtn gold" style="cursor:default"><i class="ic ic-calendar"></i>${v.premiere ? esc(huDate(v.premiere)) : 'Hamarosan'}</span>${alertBtn(v)}`}
          <button class="rnd${inList(v.id) ? ' on' : ''}" data-mylist="${esc(v.id)}" title="Saját lista">${inList(v.id) ? '<i class="ic ic-check"></i>' : '<i class="ic ic-plus"></i>'}</button>
          <button class="rnd" data-share="${esc(v.id)}" title="Megosztás"><i class="ic ic-share-2"></i></button></div></div></div>
    <div class="dbody">
      <div><div class="hmeta" style="margin:0 0 .8rem">${v.soon ? `<span class="soonb">${esc((v.status || 'Hamarosan').toUpperCase())}</span>` : isNew(v) ? '<span class="new">ÚJ</span>' : ''}${[v.year, v.len].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('')}${v.genre ? `<span class="box">${esc(v.genre)}</span>` : ''}</div>
        ${v.en ? `<p style="font-style:italic;color:#bfb8a9;margin-bottom:.6rem">${esc(v.en)}</p>` : ''}<p class="desc">${esc(v.desc || '')}</p></div>
      <div class="side2"><div><b>Típus:</b> ${esc(v.kind || 'Film')}</div>${v.genre ? `<div><b>Műfaj:</b> ${esc(v.genre)}</div>` : ''}${v.liveAt ? `<div><b>Premier:</b> ${esc(Premier.when(v.liveAt))}</div>` : v.premiere ? `<div><b>Premier:</b> ${esc(huDate(v.premiere))}</div>` : ''}${(st => `<div><b>${st.length > 1 ? 'Stúdiók' : 'Stúdió'}:</b> ${st.map(esc).join(', ')}</div>`)(Array.isArray(v.studios) && v.studios.length ? v.studios : ['HGWS Studios'])}
        <div class="dfacts">${RT.avg[v.id] ? `<span>${I('star')} ${RT.avg[v.id].toFixed(1).replace('.', ',')} · ${RT.n[v.id]} értékelés</span>` : ''}${progOf(v.id) ? `<span class="g">${I('history')} ${leftLabel(progOf(v.id))}</span>` : ''}${inList(v.id) ? `<span>${I('check')} A listádon</span>` : ''}</div></div>
      ${v.soon ? `<div class="stagebox"><h4>GYÁRTÁSI ÁLLAPOT</h4>${stageHtml(v.stage ?? 0)}</div>` : ''}
      ${sid ? epList(sid, v.id) : ''}
      <div class="sect"><h3>Értékelések és hozzászólások</h3><div class="cmts" id="cmts"></div></div>
      ${similar.length ? `<div class="sect"><h3>Hasonló címek</h3><div class="simg">${similar.map(x => { const b = bgOf(x.poster || img(x), x.id + x.title);
        return `<button class="sim" data-info="${esc(x.id)}"><div class="ph${b.cls}" style="${esc(b.style)}"></div><div><b>${esc(x.title)}</b><small>${esc([x.kind || 'Film', x.year, x.soon ? 'Hamarosan' : RT.avg[x.id] ? '★ ' + RT.avg[x.id].toFixed(1).replace('.', ',') : ''].filter(Boolean).join(' · '))}</small></div></button>`; }).join('')}</div></div>` : ''}
    </div></div>`;
  document.body.appendChild(el); document.body.style.overflow = 'hidden';
  el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-close]')) closeDetail(); });
  el._key = e => { if (e.key === 'Escape' && document.body.lastElementChild === el) closeDetail(); };
  addEventListener('keydown', el._key);
  dlgUnsub = social($('#cmts', el), v.id);
  applyTint(el, img(v));
  dTrailer(v, el);
  if (prev) { el._back = back; history.replaceState(null, '', '#/film/' + v.id); }   // részletekből másik címre: nem halmozzuk az előzményeket
  else if (!location.hash.startsWith('#/film/')) { el._back = location.hash || '#/'; history.pushState(null, '', '#/film/' + v.id); }
}
/* részleteknél hang nélkül induló előzetes (YouTube), mint a mozis oldalakon */
async function dTrailer(v, el) {
  clearTimeout(dTimer);
  if (v.soon || !v.hasVideo || matchMedia('(prefers-reduced-motion: reduce)').matches || innerWidth < 640) return;
  let src = {}; try { src = (await FB.getDoc(FB.doc(db, 'videoSources', v.id))).data() || {}; } catch (_) { return; }
  const yt = src.youtube || v.trailer; if (!yt || !el.isConnected) return;
  dTimer = setTimeout(() => {
    const box = $('#dtv', el); if (!box) return;
    box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${esc(yt)}?autoplay=1&mute=1&controls=0&loop=1&playlist=${esc(yt)}&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&enablejsapi=1&start=20" allow="autoplay; encrypted-media" tabindex="-1" title=""></iframe>`;
    setTimeout(() => box.classList.add('on'), 1800);
    const mb = $('#dmute', el); mb.hidden = false; let muted = true;
    mb.onclick = () => { muted = !muted; box.querySelector('iframe')?.contentWindow.postMessage(JSON.stringify({ event: 'command', func: muted ? 'mute' : 'unMute', args: [] }), '*'); mb.innerHTML = I(muted ? 'volume-x' : 'volume-2'); };
  }, 1400);
}
export function closeDetail(fromRoute) {
  const el = $('#dmodal'); if (!el) return;
  clearTimeout(dTimer);
  removeEventListener('keydown', el._key); dlgUnsub && dlgUnsub(); dlgUnsub = null;
  el.remove(); document.body.style.overflow = '';
  if (!fromRoute && location.hash.startsWith('#/film/')) { if (el._back) history.back(); else history.replaceState(null, '', '#/'); }
}
export const detailOpen = () => !!$('#dmodal');

/* ===================== lejátszó ===================== */
export async function watch(id) {
  cleanup();
  const v = film(id);
  if (!v) { $('#page').innerHTML = '<div class="pg"><div class="noresult"><div class="big"><i class="ic ic-clapperboard"></i></div>Ez a film nem található.</div></div>'; return; }
  document.title = v.title + ' · HGWS';
  const sr = v.series ? film(v.series) : null, el = sr ? eps(sr.id) : [], ix = el.findIndex(x => x.id === v.id);
  const more = sr ? el.filter(x => x.id !== v.id) : vis().filter(x => x.id !== v.id && !x.isSeries);
  const next = sr ? el.slice(ix + 1).find(x => !x.soon && x.hasVideo) : more.find(x => !x.soon && x.hasVideo);
  $('#page').innerHTML = `<div class="watch" id="watch"><div class="ambw" id="ambw"><div class="wframe" id="wf"><div class="psoon" style="background-image:url('${esc(img(v))}')"><div><div class="spin" style="margin:0 auto"></div></div></div></div></div><a class="wback" href="#/">${I('arrow-left')} Vissza</a>
    <div class="winfo"><div class="orig"><img src="img/logo.webp" alt=""><span><b>HGWS</b> ${esc((v.kind || 'Film').toUpperCase())}</span></div>${sr ? `<button class="serlink" data-info="${esc(sr.id)}"><i class="ic ic-list-video"></i>${esc(sr.title)} · ${esc(epLabel(v))}</button>` : ''}<h1>${esc(v.title)}</h1>
      <div class="wrow"><div><div class="hmeta" style="margin-top:.4rem">${[v.year, v.len].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('')}${v.genre ? `<span class="box">${esc(v.genre)}</span>` : ''}<span class="ravgmini" id="wavg"></span></div>
        <p style="margin-top:.9rem;line-height:1.65;color:#e2dccf">${esc(v.desc || '')}</p>
        <div class="hbtns"><button class="pbtn info" data-mylist="${esc(v.id)}"><i class="ic ic-${inList(v.id) ? 'check' : 'plus'}"></i>Saját lista</button><button class="pbtn info" data-share="${esc(v.id)}"><i class="ic ic-share-2"></i>Megosztás</button>${!v.soon && v.hasVideo && !guest() ? `<button class="pbtn info" data-party="${esc(v.id)}"><i class="ic ic-popcorn"></i>Közös nézés</button>` : ''}${alertBtn(v)}</div>
        <div class="sect" style="margin-top:2rem"><h3 style="font-size:1.3rem;font-weight:700;margin-bottom:.8rem">Értékelések és hozzászólások</h3><div class="cmts" id="cmts"></div></div></div>
      <div>${sr ? epList(sr.id, v.id) : more.length ? `<h3 style="font-size:1.1rem;font-weight:700;margin-bottom:.8rem">Következő</h3><div class="grid" style="margin-top:0;grid-template-columns:1fr">${more.slice(0, 4).map(x => tile(x)).join('')}</div>` : ''}</div></div></div></div>`;
  unsubs.push(social($('#cmts'), v.id, $('#wavg')));
  applyTint($('#watch'), img(v));
  let src = {};
  if (!v.soon) { try { src = (await FB.getDoc(FB.doc(db, 'videoSources', v.id))).data() || {}; } catch (_) {} }
  const wf = $('#wf'); if (!wf || location.hash !== '#/nez/' + id) return;
  const pr = progOf(v.id), start = pr ? Math.floor(pr.t) : 0;
  if (!v.soon && (src.youtube || src.mp4)) {
    stopTrack(); track.id = v.id;
    vp = VP.mount(wf, {
      youtube: src.mp4 ? '' : src.youtube, mp4: src.mp4 || '', vtt: src.vtt || '', poster: img(v), title: v.title, start,
      onTime: note, onPause: flush, onEnd: flush,
      next: next ? { title: sr ? epLabel(next) + ' · ' + next.title : next.title, href: '#/nez/' + next.id, poster: next.poster || img(next) } : null
    });
    wf.focus({ preventScroll: true });
    countView(v.id);
    ambStop = ambilight($('#ambw'), { img: src.youtube && !src.mp4 ? `https://i.ytimg.com/vi/${src.youtube}/hqdefault.jpg` : img(v) });
  }
  else wf.innerHTML = `<div class="psoon" style="background-image:url('${esc(img(v))}')"><div><b>HAMAROSAN</b><span>${v.premiere ? 'Premier: ' + esc(huDate(v.premiere)) : 'A videó még nem érhető el.'}</span>${v.soon ? stageHtml(v.stage ?? 0) : ''}</div></div>`;
}

/* ===================== lejátszási pozíció (Folytatás) ===================== */
const track = { id: null, t: 0, d: 0, saved: 0 };
function note(t, d) { if (!isFinite(t) || !isFinite(d) || d <= 0) return; track.t = t; track.d = d; if (Date.now() - track.saved > 15000) flush(); }
function flush() {
  if (!track.id || !track.d || track.t < 5) return;
  track.saved = Date.now();
  const done = track.t >= track.d * .95;
  FB.setDoc(FB.doc(db, 'users', C.uid(), 'private', 'progress'), { [track.id]: done ? FB.deleteField() : { t: Math.round(track.t), d: Math.round(track.d), at: FB.serverTimestamp() } }, { merge: true }).catch(() => {});
}
function stopTrack() {
  flush();
  Object.assign(track, { id: null, t: 0, d: 0 });
}
addEventListener('pagehide', flush);

/* ===================== értékelések (csillagok) + hozzászólások ===================== */
const starRow = (n, cls = '') => `<span class="stars ${cls}" style="--p:${Math.max(0, Math.min(5, n)) / 5 * 100}%" aria-label="${n.toFixed(1).replace('.', ',')} / 5"></span>`;
function social(box, vid, avgEl) {
  box.innerHTML = '<div class="rate" data-rate></div><div data-cm></div>';
  const rb = $('[data-rate]', box);
  let R = {}, loaded = false, hover = 0;
  const cm = comments($('[data-cm]', box), vid, () => R);
  const mine = () => guest() ? 0 : (R[C.uid()] || 0);
  function render() {
    const vals = Object.values(R), n = vals.length, avg = n ? vals.reduce((a, b) => a + b, 0) / n : 0;
    const dist = [5, 4, 3, 2, 1].map(s => [s, vals.filter(x => x === s).length]);
    const my = mine(), show = hover || my;
    rb.innerHTML = `<div class="rsum"><div class="ravg"><b>${n ? avg.toFixed(1).replace('.', ',') : '–'}</b>${starRow(avg)}<small>${n ? n + ' értékelés' : 'Még nincs értékelés'}</small></div>
      <div class="rbars">${dist.map(([s, c]) => `<div><span>${s}★</span><i><b style="width:${n ? c / n * 100 : 0}%"></b></i><em>${c}</em></div>`).join('')}</div></div>
      <div class="rmine${guest() ? ' off' : ''}"><span class="rl">${guest() ? 'Értékeléshez regisztrálj' : my ? 'A te értékelésed' : 'Értékeld te is!'}</span>
        <div class="rstars" role="radiogroup" aria-label="Értékelés">${[1, 2, 3, 4, 5].map(s => `<button type="button" data-star="${s}" class="${s <= show ? 'on' : ''}" role="radio" aria-checked="${s === my}" aria-label="${s} csillag">★</button>`).join('')}</div>
        <span class="rtxt">${show ? ['', 'Gyenge', 'Elmegy', 'Jó', 'Nagyon jó', 'Zseniális!'][show] : ''}</span>
        ${my && !guest() ? '<button class="rdel" data-unrate>Törlés</button>' : ''}</div>`;
    if (avgEl) avgEl.innerHTML = n ? `${starRow(avg, 'sm')}<b>${avg.toFixed(1).replace('.', ',')}</b><small>(${n})</small>` : '';
  }
  rb.addEventListener('mouseover', e => { const b = e.target.closest('[data-star]'); if (!b || guest()) return; if (hover !== +b.dataset.star) { hover = +b.dataset.star; render(); } });
  rb.addEventListener('mouseleave', () => { if (hover) { hover = 0; render(); } });
  rb.addEventListener('click', async e => {
    const st = e.target.closest('[data-star]'), un = e.target.closest('[data-unrate]');
    if (!st && !un) return;
    if (guest()) return C.guestPrompt('Értékelni csak regisztrált tagok tudnak.');
    const ref = FB.doc(db, 'videos', vid, 'ratings', C.uid());
    try {
      if (un) { await FB.deleteDoc(ref); toast('Értékelés törölve'); }
      else { const s = +st.dataset.star; await FB.setDoc(ref, { stars: s, at: FB.serverTimestamp() }); toast(`Értékelted: ${'★'.repeat(s)} ✓`); }
    } catch (er) { toast(errText(er), true); }
  });
  render();
  const un = FB.onSnapshot(FB.collection(db, 'videos', vid, 'ratings'), s => {
    R = {}; s.docs.forEach(d => { const x = d.data().stars; if (x >= 1 && x <= 5) R[d.id] = x; });
    loaded = true; render(); cm.rerender();
  }, () => { rb.innerHTML = ''; });
  return () => { un(); cm.unsub(); };
}

function comments(box, vid, ratings = () => ({})) {
  const me = C.S.me, uid = C.uid();
  const mu = toDate(me?.mutedUntil) > new Date();
  box.innerHTML = `${guest() ? `<div class="cnote guestnote"><i class="ic ic-eye"></i> Vendégként csak nézni tudsz. <button class="link" data-guestreg>Regisztrálj</button> vagy <button class="link" data-guestlogin>lépj be</button>, hogy hozzászólhass és értékelhess.</div>`
    : mu ? `<div class="cnote"><i class="ic ic-volume-x"></i> Némítva vagy eddig: ${timeLabel(me.mutedUntil)}</div>` : `<div class="cform">${avatar(me, 40)}<div class="cb"><textarea maxlength="1500" placeholder="Mit gondolsz róla?"></textarea><div><button class="btn primary sm" data-send disabled>Küldés</button></div></div></div>`}<div data-list></div>`;
  const ta = $('textarea', box), send = $('[data-send]', box), list = $('[data-list]', box);
  const col = FB.collection(db, 'videos', vid, 'comments');
  if (ta) {
    const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; send.disabled = !ta.value.trim(); };
    ta.oninput = fit;
    const go = async () => { const t = ta.value.trim(); if (!t) return; send.disabled = true;
      try { await FB.addDoc(col, { uid, text: t, createdAt: FB.serverTimestamp() }); ta.value = ''; fit(); } catch (e) { toast(errText(e), true); send.disabled = false; } };
    send.onclick = go; ta.onkeydown = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) go(); };
  }
  let items = [], failed = '';
  const draw = () => {
    if (failed) { list.innerHTML = `<p class="hint">${esc(failed)}</p>`; return; }
    const R = ratings();
    list.innerHTML = items.length ? items.map(c => { const u = C.U(c.uid), likes = c.reactions?.['👍'] || [], r = R[c.uid];
      return `<div class="cmt" data-c="${esc(c.id)}">${`<span data-u="${esc(u.id)}" style="cursor:pointer">${avatar(u, 40)}</span>`}<div class="cc"><div class="ch"><b data-u="${esc(u.id)}" style="color:${u.role && u.role !== 'user' && ROLES[u.role] ? ROLES[u.role].color : 'inherit'}">${esc(u.name)}</b>${C.tagPills(u)}${r ? starRow(r, 'sm') : ''}<time>${timeLabel(c.createdAt)}</time></div>
        <div class="ct">${esc(c.text)}</div><div class="ca"><button data-like class="${likes.includes(uid) ? 'me' : ''}"><i class="ic ic-thumbs-up"></i> ${likes.length || ''}</button>${!guest() && (c.uid === uid || C.can('deleteMessages')) ? '<button data-del>Törlés</button>' : ''}</div></div></div>`; }).join('')
      : `<p class="hint">Még senki nem szólt hozzá.${guest() ? '' : ' Légy te az első!'}</p>`;
  };
  const un = FB.onSnapshot(FB.query(col, FB.orderBy('createdAt', 'desc'), FB.limit(100)), s => {
    items = s.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })); failed = ''; draw();
  }, e => { failed = errText(e); draw(); });
  list.onclick = async e => {
    const el = e.target.closest('[data-c]'); if (!el) return; const c = items.find(x => x.id === el.dataset.c); if (!c) return;
    const ref = FB.doc(col, c.id);
    if (e.target.closest('[data-like]')) {
      if (guest()) return C.guestPrompt('Kedvelni csak regisztrált tagok tudnak.');
      const has = (c.reactions?.['👍'] || []).includes(uid);
      try { await FB.updateDoc(ref, new FB.FieldPath('reactions', '👍'), has ? FB.arrayRemove(uid) : FB.arrayUnion(uid)); } catch (er) { toast(errText(er), true); } }
    if (e.target.closest('[data-del]') && await confirmBox('Törlöd ezt a hozzászólást?', 'Törlés')) { try { await FB.deleteDoc(ref); } catch (er) { toast(errText(er), true); } }
  };
  return { unsub: un, rerender: draw };
}

/* ===================== saját lista ===================== */
export async function toggleList(id) {
  const has = inList(id);
  try {
    await FB.setDoc(FB.doc(db, 'users', C.uid(), 'private', 'list'), { ids: has ? FB.arrayRemove(id) : FB.arrayUnion(id) }, { merge: true });
    toast(has ? 'Levéve a listádról' : 'Hozzáadva a listádhoz ✓');
  } catch (e) { toast(errText(e), true); }
}
export function listChanged() {
  $$('[data-mylist]').forEach(b => { const on = inList(b.dataset.mylist);
    if (b.classList.contains('rnd')) { b.classList.toggle('on', on); b.innerHTML = on ? '<i class="ic ic-check"></i>' : '<i class="ic ic-plus"></i>'; }
    else { const i = b.querySelector('i'); if (i) i.className = 'ic ic-' + (on ? 'check' : b.classList.contains('gold') ? 'bell' : 'plus'); if (b.classList.contains('gold')) b.lastChild.textContent = on ? 'A listádon' : 'Emlékeztess'; } });
}

/* ===================== kattintások ===================== */
export function onClick(e) {
  const t = e.target;
  const al = t.closest('[data-alert]'); if (al) { e.preventDefault(); toggleAlert(al.dataset.alert, al); return true; }
  const pa = t.closest('[data-party]'); if (pa) { e.preventDefault(); Party.create(pa.dataset.party); return true; }
  if (t.closest('[data-copymail]')) { e.preventDefault(); navigator.clipboard?.writeText(CONTACT).then(() => toast('E-mail-cím kimásolva ✓'), () => toast(CONTACT)); return true; }
  if (t.closest('[data-guestreg]')) { e.preventDefault(); C.guestLeave('reg'); return true; }
  if (t.closest('[data-guestlogin]')) { e.preventDefault(); C.guestLeave('login'); return true; }
  const b = t.closest('[data-play],[data-mylist],[data-share],[data-info]');
  if (b) {
    e.preventDefault(); e.stopPropagation();
    if (b.dataset.play) { const v = film(b.dataset.play), pid = v && playId(v); if (pid) { closeDetail(true); location.hash = '#/nez/' + pid; } else detail(b.dataset.play); }
    else if (b.dataset.mylist) toggleList(b.dataset.mylist);
    else if (b.dataset.share) guest() ? C.guestPrompt('Filmet megosztani csak regisztrált tagok tudnak.') : C.shareFilm(b.dataset.share);
    else if (b.dataset.info) detail(b.dataset.info);
    return true;
  }
  if (t.closest('[data-playall]')) { Player.playAll(tracks()); return true; }
  const ts = t.closest('[data-trackshare]'); if (ts) { e.stopPropagation(); C.shareFilm(null, null, ts.dataset.trackshare); return true; }
  const tr = t.closest('[data-track]'); if (tr && !t.closest('a')) { e.preventDefault(); Player.play(tr.dataset.track, tracks()); return true; }
  const f = t.closest('[data-film]');
  if (f && !t.closest('a')) { e.preventDefault(); detail(f.dataset.film); return true; }
  return false;
}
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList?.contains('tile')) detail(e.target.dataset.film); });
export { cleanup };
