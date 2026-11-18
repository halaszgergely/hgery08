// HGWS – Netflix-stílusú filmes felület: kezdőlap, filmtár, saját lista, keresés, részletek, lejátszó
import { FB, db, $, $$, esc, ROLES, avatar, toDate, timeLabel, huDate, isOnline, toast, errText, notify, audit, OWNER_UID } from './core.js?v=202611182104';
import { stageHtml, confirmBox } from './ui.js?v=202611182104';
import * as Player from './player.js?v=202611182104';
import * as Party from './party.js?v=202611182104';
import * as VP from './vplayer.js?v=202611182104';
import { bgOf, applyTint, ambilight, I } from './fx.js?v=202611182104';

let C = null;
export function init(ctx) { C = ctx; }
const S = () => C.S;
const vis = () => S().videos.filter(v => v.visible !== false);
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
  if (v.soon) return `<span class="bdg">${v.premiere ? 'PREMIER ' + esc(v.premiere.slice(5).replace('-', '.')) + '.' : 'HAMAROSAN'}</span>`;
  if (isNew(v)) return '<span class="bdg new">ÚJ</span>';
  return '';
}
function meta(v) {
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
    ${top ? '' : `<div class="tt">${esc(v.title)}</div>`}
    <div class="ov"><h4>${esc(v.title)}</h4><div class="b">
      <button class="rnd pl" data-play="${esc(v.id)}" title="${v.soon ? 'Részletek' : 'Lejátszás'}">${v.soon ? '<i class="ic ic-bell"></i>' : '<i class="ic ic-play"></i>'}</button>
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
    <div class="fc"><h4>Szórakozás</h4><a href="#/arcade"><i class="ic ic-gamepad-2"></i> HGWS Arcade</a><a href="miert_igyal.html"><i class="ic ic-beer"></i> Ma miért igyál?</a></div>
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
  const f = list.find(v => v.featured) || list.find(v => !v.soon) || list[0];
  const released = list.filter(v => !v.soon), soon = list.filter(v => v.soon);
  const kinds = [...new Set(list.map(v => v.kind || 'Film'))];
  const my = S().myList.map(film).filter(v => v && v.visible !== false);
  const online = [...S().users.values()].filter(u => isOnline(u) && !u.banned);
  const contList = Object.entries(S().progress || {}).filter(([id]) => film(id) && progOf(id) && !film(id).soon && film(id).visible !== false)
    .sort((a, b) => (toDate(b[1].at) || 0) - (toDate(a[1].at) || 0)).map(([id]) => film(id));
  page.innerHTML = `<div class="homeowner"><div class="ownerslot"></div></div>${heroHtml(f)}<div class="rows">
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
  wireRows(page); heroWire(f); Player.refreshMarks(); applyTint($('#hero'), img(f));
}
function heroHtml(v) {
  const future = v.soon && v.premiere && new Date(v.premiere + 'T00:00:00') > new Date();
  const bg = bgOf(img(v), v.id + v.title), pr = !v.soon && v.hasVideo ? progOf(v.id) : null;
  return `<section class="hero" id="hero"><div class="bg${bg.cls}" style="${esc(bg.style)}"></div><div class="vid" id="hvid"></div>
    <div class="in"><div class="orig"><img src="img/logo.webp" alt=""><span><b>HGWS</b> ${esc((v.kind || 'Film').toUpperCase())}</span></div>
      <h1>${esc(v.title)}</h1>${v.en ? `<div class="en">${esc(v.en)}</div>` : ''}
      <div class="hmeta">${v.soon ? `<span class="soonb">${v.premiere ? 'PREMIER: ' + esc(huDate(v.premiere).toUpperCase()) : 'HAMAROSAN'}</span>` : isNew(v) ? '<span class="new">ÚJ</span>' : ''}${[v.year, v.len].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('')}${v.genre ? `<span class="box">${esc(v.genre)}</span>` : ''}</div>
      ${future ? '<div class="count" id="count"></div>' : ''}
      ${v.desc ? `<p class="d">${esc(v.desc)}</p>` : ''}
      <div class="hbtns">${!v.soon && v.hasVideo ? `<a class="pbtn play" href="#/nez/${esc(v.id)}"><i class="ic ic-play"></i>${pr ? 'Folytatás' : 'Lejátszás'}</a>` : v.soon ? `<button class="pbtn gold" data-mylist="${esc(v.id)}"><i class="ic ic-${inList(v.id) ? 'check' : 'bell'}"></i>${inList(v.id) ? 'A listádon' : 'Emlékeztess'}</button>` : ''}
        <button class="pbtn info" data-info="${esc(v.id)}"><i class="ic ic-info"></i>További infók</button></div>
      ${pr ? `<div class="cont">${leftLabel(pr)}<span><i style="width:${Math.round(pr.t / pr.d * 100)}%"></i></span></div>` : ''}
    </div>
    <div class="hside"><button class="rnd" id="hmute" hidden title="Hang">${I('volume-x')}</button><span class="agebar">${esc(v.soon ? (v.status || 'Gyártásban') : (v.genre || v.kind || 'HGWS'))}</span></div></section>`;
}
async function heroWire(v) {
  const c = $('#count');
  if (c) {
    const end = new Date(v.premiere + 'T00:00:00');
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
  { id: 'nyomas', name: 'Nyomásmester', icon: '🎛️', desc: 'Állítsd meg a mutatót a zöld zónában – a PLC rád bízta a szivattyút.', c: '#6cc6ff' },
  { id: 'vizagyu', name: 'Vízágyú', icon: '💦', desc: 'Kaktuszok és tűzgolyók zúdulnak a kertre. Célozz a vízágyúval!', c: '#ff7a6e' },
  { id: 'csepp', name: 'Csepp Futam', icon: '💧', desc: 'Repülj át a csövek között egy bátor vízcseppel – egy ütközés és vége!', c: '#e8b656' },
  { id: 'viztorony', name: 'Víztorony', icon: '🗼', unit: 'm', desc: 'Mássz fel a víztorony tetejére az Arany Locsolófejért – egy rossz ugrás, és zuhansz!', c: '#b48cff', sponsor: 'A Zerosites támogatásával' },
  { id: 'drift', name: 'Drift Király', icon: '🏎️', desc: 'Felülnézetes drift-verseny 10 pályán, szellemautókkal és kétjátékos móddal.', c: '#ff5a4d' },
  { id: 'birodalom', name: 'Öntöző Birodalom', icon: '🌱', unit: 'Ft', desc: 'Építs csőhálózatot, ültess kertet és ültetvényt – a kerted akkor is termel, amikor nem vagy itt.', c: '#6fcf6a' }
];
const EXTRA = [{ id: 'zerospace', name: 'Zero Space Demo', icon: '🚀', desc: 'Építs űrhajót modulról modulra és vezesd csatába – korai demó, egyjátékos sandbox.', c: '#b2382a', demo: 1 }];
const best = id => { try { return +localStorage.getItem('hgws_best_' + id) || 0; } catch (_) { return 0; } };
function arcadeRow() {
  return `<section class="row arcrow"><div class="rowh"><h2><i class="ic ic-gamepad-2"></i> HGWS Arcade</h2><a href="#/arcade">Mind ›</a></div>
    <div class="agrid">${[...GAMES, ...EXTRA].map((g, i) => `<a class="acard" href="#/arcade/${g.id}" style="--c:${g.c}"><span class="an">${String(i + 1).padStart(2, '0')}</span><span class="ai">${g.icon}</span>
      <b>${esc(g.name)}</b>${g.sponsor ? `<span class="aspon">${esc(g.sponsor)}</span>` : ''}<small>${esc(g.desc)}</small><span class="af"><em>${g.demo ? 'DEMO' : 'REKORD: ' + best(g.id).toLocaleString('hu-HU') + (g.unit ? ' ' + g.unit : '')}</em><i>Játék <i class="ic ic-play"></i></i></span></a>`).join('')}</div></section>`;
}
export function arcade(id) {
  cleanup();
  document.title = 'Arcade · HGWS';
  const g = [...GAMES, ...EXTRA].find(x => x.id === id);
  $('#page').innerHTML = `<iframe class="arcframe" src="arcade.html${new URL(import.meta.url).search}${g ? '#play=' + g.id : ''}" title="HGWS Arcade" allow="autoplay; fullscreen"></iframe>`;
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
    return s.docs.map(d => ({ uid: d.id, score: d.data().best, wins: d.data().wins || 0 })).sort((a, b) => b.score - a.score || b.wins - a.wins).slice(0, n); } catch (_) { return []; }
}
async function sendBoards(win) {
  const wk = weekKey(), boards = {};
  await Promise.all(GAMES.map(async g => {
    const [all, week] = await Promise.all([topOf(g.id), topOf(g.id + '_' + wk)]);
    const fmt = l => l.map(r => ({ name: C.U(r.uid).name, score: r.score, wins: r.wins, me: r.uid === C.uid() }));
    boards[g.id] = { all: fmt(all), week: fmt(week) };
  }));
  win?.postMessage({ hgws: 'lb', boards, week: wk.replace('-W', '. év ') + '. hét', guest: guest() }, location.origin);
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
      if (!guest() && !m.has(C.uid())) { const s = await FB.getDoc(FB.doc(db, 'ghosts', t, 'runs', C.uid())); if (s.exists()) m.set(s.id, s.data()); }
      out[t] = [...m].map(([uid, r]) => ({ name: C.U(uid).name, ms: r.ms < 36e5 ? r.ms : 0, rms: r.rms < 36e5 ? r.rms : 0, car: r.car, p: r.ms < 36e5 ? r.path : '', me: uid === C.uid() }));
    } catch (_) {}
  }));
  return out;
}
async function ghostSave(d) {
  if (guest() || !okTrack(d.track)) return;
  const ref = FB.doc(db, 'ghosts', d.track, 'runs', C.uid());
  try {
    const s = await FB.getDoc(ref), o = s.data() || {}, big = 36e5;
    const lap = Number.isInteger(d.ms) && d.ms > 5000 && d.ms < big && typeof d.path === 'string' && d.path.length < 60000 && typeof d.car === 'string' && d.car.length < 20 && d.ms < (o.ms || big);
    const race = Number.isInteger(d.rms) && d.rms > 10000 && d.rms < big && d.rms < (o.rms || big);
    if (!lap && !race) return;
    await FB.setDoc(ref, { ms: lap ? d.ms : (o.ms || big), car: lap ? d.car : (o.car || ''), path: lap ? d.path : (o.path || ''), rms: race ? d.rms : (o.rms || big), at: FB.serverTimestamp() });
  } catch (e) { console.warn('szellem', e); }
}
async function saveScore(game, score, win) {
  if (guest() || !GAMES.some(g => g.id === game) || !(score > 0)) return;
  const me = C.uid(), sc = Math.floor(score);
  for (const lb of [game, game + '_' + weekKey()]) {
    const ref = FB.doc(db, 'leaderboards', lb, 'scores', me);
    try { const s = await FB.getDoc(ref), o = s.data() || {}, ob = o.best || 0;
      if (sc > ob || win) await FB.setDoc(ref, { best: Math.max(sc, ob), at: FB.serverTimestamp(), ...(win || o.wins ? { wins: (o.wins || 0) + (win ? 1 : 0) } : {}) }); } catch (e) { console.warn('ranglista', e); }
  }
}
addEventListener('message', async e => {
  if (e.origin !== location.origin || !e.data?.hgws) return;
  const fr = $('.arcframe'); if (!fr || e.source !== fr.contentWindow) return;
  if (e.data.hgws === 'score') { await saveScore(e.data.game, e.data.score, !!e.data.win); sendBoards(fr.contentWindow); }
  if (e.data.hgws === 'lbreq') sendBoards(fr.contentWindow);
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
    const winners = [...new Set((await Promise.all(GAMES.map(g => topOf(g.id + '_' + prev, 1)))).flat().map(r => r.uid))]
      .filter(u => S().users.has(u) && (u !== OWNER_UID || C.isOwner()));
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
  $('#page').innerHTML = `<div class="mhero"><div class="art"></div><div><div class="eyebrow">// HGWS RECORDS</div><h1 class="gold">Zene</h1><p>${l.length} szám · HGWS Studios</p></div></div>
    <div class="tracks">${l.length ? `<div class="acts"><button class="bigplay" data-playall title="Összes lejátszása"><i class="ic ic-play"></i></button><span class="hint">Lejátszás közben nyugodtan lapozz tovább – a zene szól.</span></div>
      ${l.map((t, i) => `<div class="trow" data-track="${esc(t.id)}"><span class="n">${i + 1}</span><span class="pc" style="${cov(t)}"></span><div style="min-width:0"><b>${esc(t.title)}</b><small>${esc(t.artist || 'HGWS')}</small></div>
        <div class="ta"><button data-trackshare="${esc(t.id)}" title="Megosztás"><i class="ic ic-share-2"></i></button></div></div>`).join('')}`
      : `<div class="noresult"><div class="big"><i class="ic ic-music"></i></div>Még nincs zene feltöltve.${C.can('publishMedia') || C.can('submitMedia') ? '<br><br><a class="pbtn info" href="#/admin/zene">Zenék kezelése</a>' : ''}</div>`}</div>`;
  Player.refreshMarks();
}

/* ===================== filmtár, lista, keresés ===================== */
export function tar(kind) {
  loadRatings();
  cleanup();
  const list = vis(), kinds = [...new Set(list.map(v => v.kind || 'Film'))];
  const k = kind ? decodeURIComponent(kind) : 'all', st = S().tarStatus || 'all';
  const shown = list.filter(v => (k === 'all' || (v.kind || 'Film') === k) && (st === 'all' || (st === 'ready' ? !v.soon : v.soon)));
  document.title = 'Filmtár · HGWS';
  $('#page').innerHTML = `<div class="pg"><div class="eyebrow">// HGWS STUDIOS</div><h1 class="gold">${k === 'all' ? 'Filmtár' : esc(PLURAL[k] || k)}</h1>
    <div class="chipsrow"><button data-k="all" class="${k === 'all' ? 'on' : ''}">Minden</button>${kinds.map(x => `<button data-k="${esc(x)}" class="${k === x ? 'on' : ''}">${esc(PLURAL[x] || x)}</button>`).join('')}
      <span style="width:1px;background:var(--line2);margin:0 .3rem"></span><button data-s="ready" class="${st === 'ready' ? 'on' : ''}"><i class="ic ic-play"></i> Megnézhető</button><button data-s="soon" class="${st === 'soon' ? 'on' : ''}"><i class="ic ic-bell"></i> Hamarosan</button></div>
    ${shown.length ? `<div class="grid">${shown.map(v => tile(v)).join('')}</div>` : '<div class="noresult"><div class="big"><i class="ic ic-clapperboard"></i></div>Nincs ilyen cím.</div>'}</div>${footHtml()}`;
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
  const res = nq ? vis().filter(v => [v.title, v.en, v.genre, v.kind, v.desc, v.year].some(x => n(x).includes(nq))) : vis();
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
  const similar = vis().filter(x => x.id !== v.id).sort((a, b) => score(b) - score(a)).slice(0, 6);
  const bg = bgOf(img(v), v.id + v.title);
  el.innerHTML = `<div class="dlg" role="dialog" aria-modal="true">
    <div class="dtop${bg.cls}" style="${esc(bg.style)}"><div class="tv" id="dtv"></div><button class="x" data-close aria-label="Bezárás"><i class="ic ic-x"></i></button><button class="rnd dmute" id="dmute" hidden title="Hang">${I('volume-x')}</button>
      <div class="c"><div class="orig"><img src="img/logo.webp" alt=""><span><b>HGWS</b> ${esc((v.kind || 'Film').toUpperCase())}</span></div><h2>${esc(v.title)}</h2>
        <div class="hbtns">${!v.soon && v.hasVideo ? `<a class="pbtn play" href="#/nez/${esc(v.id)}"><i class="ic ic-play"></i>Lejátszás</a>${guest() ? '' : `<button class="pbtn info" data-party="${esc(v.id)}"><i class="ic ic-popcorn"></i>Közös nézés</button>`}` : `<span class="pbtn gold" style="cursor:default"><i class="ic ic-calendar"></i>${v.premiere ? esc(huDate(v.premiere)) : 'Hamarosan'}</span>${alertBtn(v)}`}
          <button class="rnd${inList(v.id) ? ' on' : ''}" data-mylist="${esc(v.id)}" title="Saját lista">${inList(v.id) ? '<i class="ic ic-check"></i>' : '<i class="ic ic-plus"></i>'}</button>
          <button class="rnd" data-share="${esc(v.id)}" title="Megosztás"><i class="ic ic-share-2"></i></button></div></div></div>
    <div class="dbody">
      <div><div class="hmeta" style="margin:0 0 .8rem">${v.soon ? `<span class="soonb">${esc((v.status || 'Hamarosan').toUpperCase())}</span>` : isNew(v) ? '<span class="new">ÚJ</span>' : ''}${[v.year, v.len].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('')}${v.genre ? `<span class="box">${esc(v.genre)}</span>` : ''}</div>
        ${v.en ? `<p style="font-style:italic;color:#bfb8a9;margin-bottom:.6rem">${esc(v.en)}</p>` : ''}<p class="desc">${esc(v.desc || '')}</p></div>
      <div class="side2"><div><b>Típus:</b> ${esc(v.kind || 'Film')}</div>${v.genre ? `<div><b>Műfaj:</b> ${esc(v.genre)}</div>` : ''}${v.premiere ? `<div><b>Premier:</b> ${esc(huDate(v.premiere))}</div>` : ''}<div><b>Stúdió:</b> HGWS Studios</div>
        <div class="dfacts">${RT.avg[v.id] ? `<span>${I('star')} ${RT.avg[v.id].toFixed(1).replace('.', ',')} · ${RT.n[v.id]} értékelés</span>` : ''}${progOf(v.id) ? `<span class="g">${I('history')} ${leftLabel(progOf(v.id))}</span>` : ''}${inList(v.id) ? `<span>${I('check')} A listádon</span>` : ''}</div></div>
      ${v.soon ? `<div class="stagebox"><h4>GYÁRTÁSI ÁLLAPOT</h4>${stageHtml(v.stage ?? 0)}</div>` : ''}
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
  const more = vis().filter(x => x.id !== v.id);
  const next = more.find(x => !x.soon && x.hasVideo);
  $('#page').innerHTML = `<div class="watch" id="watch"><div class="ambw" id="ambw"><div class="wframe" id="wf"><div class="psoon" style="background-image:url('${esc(img(v))}')"><div><div class="spin" style="margin:0 auto"></div></div></div></div></div><a class="wback" href="#/">${I('arrow-left')} Vissza</a>
    <div class="winfo"><div class="orig"><img src="img/logo.webp" alt=""><span><b>HGWS</b> ${esc((v.kind || 'Film').toUpperCase())}</span></div><h1>${esc(v.title)}</h1>
      <div class="wrow"><div><div class="hmeta" style="margin-top:.4rem">${[v.year, v.len].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('')}${v.genre ? `<span class="box">${esc(v.genre)}</span>` : ''}<span class="ravgmini" id="wavg"></span></div>
        <p style="margin-top:.9rem;line-height:1.65;color:#e2dccf">${esc(v.desc || '')}</p>
        <div class="hbtns"><button class="pbtn info" data-mylist="${esc(v.id)}"><i class="ic ic-${inList(v.id) ? 'check' : 'plus'}"></i>Saját lista</button><button class="pbtn info" data-share="${esc(v.id)}"><i class="ic ic-share-2"></i>Megosztás</button>${!v.soon && v.hasVideo && !guest() ? `<button class="pbtn info" data-party="${esc(v.id)}"><i class="ic ic-popcorn"></i>Közös nézés</button>` : ''}${alertBtn(v)}</div>
        <div class="sect" style="margin-top:2rem"><h3 style="font-size:1.3rem;font-weight:700;margin-bottom:.8rem">Értékelések és hozzászólások</h3><div class="cmts" id="cmts"></div></div></div>
      <div>${more.length ? `<h3 style="font-size:1.1rem;font-weight:700;margin-bottom:.8rem">Következő</h3><div class="grid" style="margin-top:0;grid-template-columns:1fr">${more.slice(0, 4).map(x => tile(x)).join('')}</div>` : ''}</div></div></div></div>`;
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
      next: next ? { title: next.title, href: '#/nez/' + next.id, poster: next.poster || img(next) } : null
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
    if (b.dataset.play) { const v = film(b.dataset.play); if (v && !v.soon && v.hasVideo) { closeDetail(true); location.hash = '#/nez/' + v.id; } else detail(b.dataset.play); }
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
