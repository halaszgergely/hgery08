// HGWS – Netflix-stílusú filmes felület: kezdőlap, filmtár, saját lista, keresés, részletek, lejátszó
import { FB, db, $, $$, esc, ROLES, avatar, toDate, timeLabel, huDate, isOnline, toast, errText } from './core.js';
import { stageHtml, confirmBox } from './ui.js';
import * as Player from './player.js';

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
let unsubs = [], heroTimer = null, countTimer = null;
function cleanup() { unsubs.forEach(u => u()); unsubs = []; clearTimeout(heroTimer); clearInterval(countTimer); stopTrack(); }

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
export function tile(v, top, cont) {
  const pr = cont ? progOf(v.id) : null;
  return `<div class="tile${top ? ' top' : ''}${pr ? ' cont' : ''}" tabindex="0" data-film="${esc(v.id)}">
    ${top ? `<span class="num">${top}</span>` : ''}
    <div class="im" style="background-image:url('${esc(v.poster || img(v))}')">${pr ? `<span class="left">${leftLabel(pr)}</span>` : badge(v)}${pr ? '' : '<img class="logo" src="img/logo.webp" alt="">'}${pr ? `<div class="prog"><i style="width:${Math.round(pr.t / pr.d * 100)}%"></i></div>` : ''}</div>
    ${top ? '' : `<div class="tt">${esc(v.title)}</div>`}
    <div class="ov"><h4>${esc(v.title)}</h4><div class="b">
      <button class="rnd pl" data-play="${esc(v.id)}" title="${v.soon ? 'Részletek' : 'Lejátszás'}">${v.soon ? '🔔' : '▶'}</button>
      <button class="rnd${inList(v.id) ? ' on' : ''}" data-mylist="${esc(v.id)}" title="Saját lista">${inList(v.id) ? '✓' : '＋'}</button>
      <button class="rnd" data-share="${esc(v.id)}" title="Megosztás">📤</button><span style="flex:1"></span>
      <button class="rnd" data-info="${esc(v.id)}" title="Részletek">⌄</button></div>
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

/* ===================== kezdőlap ===================== */
export function home() {
  cleanup();
  const list = vis(), page = $('#page');
  document.title = 'HGWS';
  if (!list.length) {
    page.innerHTML = `<div class="homeowner"><div class="ownerslot"></div></div><section class="hero"><div class="bg" style="background-image:url(img/logo.webp);background-size:min(60vh,70vw);background-position:75% 45%;background-repeat:no-repeat"></div>
      <div class="in"><div class="orig"><img src="img/logo.webp" alt=""><span><b>HGWS</b> STUDIOS</span></div><h1>Hamarosan</h1>
      <p class="d">Az első HGWS-filmek az utómunka utolsó fázisában vannak. Addig csatlakozz a közösséghez!</p>
      <div class="hbtns"><a class="pbtn play" href="#/chat"><i>💬</i>Közösség</a>${C.isAdmin() ? '<a class="pbtn info" href="#/admin/filmek"><i>🎞️</i>Filmek kezelése</a>' : ''}</div></div></section>`;
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
    <div class="pills"><a href="#/" class="on">Kezdőlap</a>${kinds.map(k => `<a href="#/tar/${encodeURIComponent(k)}">${esc(PLURAL[k] || k)}</a>`).join('')}${tracks().length ? '<a href="#/zene">Zene</a>' : ''}<a href="#/chat">Közösség</a></div>
    ${row('Folytatás', contList, '', false, true)}
    ${row(my.length ? 'Saját listám' : '', my, '#/lista')}
    ${row('Most megnézhető', released, '#/tar')}
    ${musicRow()}
    ${commHtml(online)}
    ${row('Hamarosan a HGWS-nél', soon, '#/tar')}
    ${list.length >= 2 ? row('Top a HGWS-en', list.slice(0, 10), '', true) : ''}
    ${kinds.length > 1 ? kinds.map(k => row(PLURAL[k] || k, list.filter(v => (v.kind || 'Film') === k), '#/tar/' + encodeURIComponent(k))).join('') : ''}
  </div>`;
  C.renderOwnerBar();
  wireRows(page); heroWire(f); Player.refreshMarks();
}
function heroHtml(v) {
  const future = v.soon && v.premiere && new Date(v.premiere + 'T00:00:00') > new Date();
  return `<section class="hero" id="hero"><div class="bg" style="background-image:url('${esc(img(v))}')"></div><div class="vid" id="hvid"></div>
    <div class="in"><div class="orig"><img src="img/logo.webp" alt=""><span><b>HGWS</b> ${esc((v.kind || 'Film').toUpperCase())}</span></div>
      <h1>${esc(v.title)}</h1>${v.en ? `<div class="en">${esc(v.en)}</div>` : ''}
      <div class="hmeta">${v.soon ? `<span class="soonb">${v.premiere ? 'PREMIER: ' + esc(huDate(v.premiere).toUpperCase()) : 'HAMAROSAN'}</span>` : isNew(v) ? '<span class="new">ÚJ</span>' : ''}${[v.year, v.len].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('')}${v.genre ? `<span class="box">${esc(v.genre)}</span>` : ''}</div>
      ${future ? '<div class="count" id="count"></div>' : ''}
      ${v.desc ? `<p class="d">${esc(v.desc)}</p>` : ''}
      <div class="hbtns">${!v.soon && v.hasVideo ? `<a class="pbtn play" href="#/nez/${esc(v.id)}"><i>▶</i>Lejátszás</a>` : v.soon ? `<button class="pbtn gold" data-mylist="${esc(v.id)}"><i>${inList(v.id) ? '✓' : '🔔'}</i>${inList(v.id) ? 'A listádon' : 'Emlékeztess'}</button>` : ''}
        <button class="pbtn info" data-info="${esc(v.id)}"><i>ⓘ</i>További infók</button></div>
    </div>
    <div class="hside"><button class="rnd" id="hmute" hidden title="Hang">🔇</button><span class="agebar">${esc(v.soon ? (v.status || 'Gyártásban') : (v.genre || v.kind || 'HGWS'))}</span></div></section>`;
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
    mb.onclick = () => { muted = !muted; box.querySelector('iframe')?.contentWindow.postMessage(JSON.stringify({ event: 'command', func: muted ? 'mute' : 'unMute', args: [] }), '*'); mb.textContent = muted ? '🔇' : '🔊'; };
  }, 2500);
}
function commHtml(online) {
  const unread = S().convs.filter(C.convUnread).length;
  return `<section class="comm" id="comm"><div class="txt"><div class="eyebrow">// HGWS KÖZÖSSÉG</div><h3 class="gold">Beszéljétek meg!</h3>
    <p>${online.length ? `<b style="color:var(--green)">● ${online.length} tag online</b> most. ` : ''}Csatornák, privát üzenetek, csoportok – oszd meg a filmeket a haverokkal.${unread ? ` <b style="color:var(--red)">${unread} olvasatlan beszélgetésed van.</b>` : ''}</p>
    <div class="stack">${online.slice(0, 7).map(u => `<span data-u="${esc(u.id)}" title="${esc(u.name)}">${avatar(u, 40)}</span>`).join('')}${online.length > 7 ? `<span class="more">+${online.length - 7}</span>` : ''}</div></div>
    <div style="display:flex;gap:.6rem;flex-wrap:wrap"><a class="pbtn play" href="#/chat"><i>💬</i>Csatlakozom</a><a class="pbtn info" href="#/dm"><i>✉️</i>Üzenetek</a></div></section>`;
}
export function updateComm() {
  const el = $('#comm'); if (!el) return;
  const online = [...S().users.values()].filter(u => isOnline(u) && !u.banned);
  el.outerHTML = commHtml(online);
}

/* ===================== zene ===================== */
function sq(t) {
  return `<div class="sq" data-track="${esc(t.id)}"><div class="cv" style="${cov(t)}"><button tabindex="-1" aria-label="Lejátszás">▶</button></div><b>${esc(t.title)}</b><small>${esc(t.artist || 'HGWS')}</small></div>`;
}
function musicRow() {
  const l = tracks(); if (!l.length) return '';
  return `<section class="row"><div class="rowh"><h2>🎵 Zenék</h2><a href="#/zene">Mind ›</a></div>
    <div class="track"><button class="arr l" hidden aria-label="Vissza">‹</button><div class="strip">${l.map(sq).join('')}</div><button class="arr r" aria-label="Tovább">›</button></div></section>`;
}
export function music() {
  cleanup();
  const l = tracks();
  document.title = 'Zene · HGWS';
  $('#page').innerHTML = `<div class="mhero"><div class="art"></div><div><div class="eyebrow">// HGWS RECORDS</div><h1 class="gold">Zene</h1><p>${l.length} szám · HGWS Studios</p></div></div>
    <div class="tracks">${l.length ? `<div class="acts"><button class="bigplay" data-playall title="Összes lejátszása">▶</button><span class="hint">Lejátszás közben nyugodtan lapozz tovább – a zene szól.</span></div>
      ${l.map((t, i) => `<div class="trow" data-track="${esc(t.id)}"><span class="n">${i + 1}</span><span class="pc" style="${cov(t)}"></span><div style="min-width:0"><b>${esc(t.title)}</b><small>${esc(t.artist || 'HGWS')}</small></div>
        <div class="ta"><button data-trackshare="${esc(t.id)}" title="Megosztás">📤</button></div></div>`).join('')}`
      : `<div class="noresult"><div class="big">🎵</div>Még nincs zene feltöltve.${C.isAdmin() ? '<br><br><a class="pbtn info" href="#/admin/zene">Zenék kezelése</a>' : ''}</div>`}</div>`;
  Player.refreshMarks();
}

/* ===================== filmtár, lista, keresés ===================== */
export function tar(kind) {
  cleanup();
  const list = vis(), kinds = [...new Set(list.map(v => v.kind || 'Film'))];
  const k = kind ? decodeURIComponent(kind) : 'all', st = S().tarStatus || 'all';
  const shown = list.filter(v => (k === 'all' || (v.kind || 'Film') === k) && (st === 'all' || (st === 'ready' ? !v.soon : v.soon)));
  document.title = 'Filmtár · HGWS';
  $('#page').innerHTML = `<div class="pg"><div class="eyebrow">// HGWS STUDIOS</div><h1 class="gold">${k === 'all' ? 'Filmtár' : esc(PLURAL[k] || k)}</h1>
    <div class="chipsrow"><button data-k="all" class="${k === 'all' ? 'on' : ''}">Minden</button>${kinds.map(x => `<button data-k="${esc(x)}" class="${k === x ? 'on' : ''}">${esc(PLURAL[x] || x)}</button>`).join('')}
      <span style="width:1px;background:var(--line2);margin:0 .3rem"></span><button data-s="ready" class="${st === 'ready' ? 'on' : ''}">▶ Megnézhető</button><button data-s="soon" class="${st === 'soon' ? 'on' : ''}">🔔 Hamarosan</button></div>
    ${shown.length ? `<div class="grid">${shown.map(v => tile(v)).join('')}</div>` : '<div class="noresult"><div class="big">🎬</div>Nincs ilyen cím.</div>'}</div>`;
  $$('[data-k]').forEach(b => b.onclick = () => location.hash = b.dataset.k === 'all' ? '#/tar' : '#/tar/' + encodeURIComponent(b.dataset.k));
  $$('[data-s]').forEach(b => b.onclick = () => { S().tarStatus = S().tarStatus === b.dataset.s ? 'all' : b.dataset.s; tar(kind); });
}
export function myList() {
  cleanup();
  const list = S().myList.map(film).filter(v => v && v.visible !== false);
  document.title = 'Saját lista · HGWS';
  $('#page').innerHTML = `<div class="pg"><h1 class="gold">Saját listám</h1><p class="lead">Amit elmentettél későbbre – vagy amire várod a premiert.</p>
    ${list.length ? `<div class="grid">${list.map(v => tile(v)).join('')}</div>` : `<div class="noresult"><div class="big">＋</div>Még üres a listád. A filmeknél a <b>＋</b> gombbal tudsz hozzáadni.<br><br><a class="pbtn info" href="#/tar">Filmtár</a></div>`}</div>`;
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
    ${res.length ? `<p class="lead" style="margin-top:1.2rem">${nq ? `Találatok erre: „${esc(q)}”` : 'Minden cím'}</p><div class="grid">${res.map(v => tile(v)).join('')}</div>` : `<div class="noresult"><div class="big">🔍</div>Nincs találat erre: „${esc(q)}”.</div>`}</div>`;
  const i = $('#bq');
  i.oninput = () => history.replaceState(null, '', '#/kereses/' + encodeURIComponent(i.value)) || search(i.value ? encodeURIComponent(i.value) : '');
  if (had === 'bq' || had === 'sInp' || !q) { if (had !== 'sInp') { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
}

/* ===================== részletek ablak ===================== */
let dlgUnsub = null;
export function detail(id) {
  const v = film(id); if (!v) return;
  closeDetail();
  const el = document.createElement('div'); el.className = 'dmodal'; el.id = 'dmodal';
  const similar = vis().filter(x => x.id !== v.id).sort((a, b) => ((b.kind === v.kind) - (a.kind === v.kind))).slice(0, 6);
  el.innerHTML = `<div class="dlg" role="dialog" aria-modal="true">
    <div class="dtop" style="background-image:url('${esc(img(v))}')"><button class="x" data-close aria-label="Bezárás">✕</button>
      <div class="c"><div class="orig"><img src="img/logo.webp" alt=""><span><b>HGWS</b> ${esc((v.kind || 'Film').toUpperCase())}</span></div><h2>${esc(v.title)}</h2>
        <div class="hbtns">${!v.soon && v.hasVideo ? `<a class="pbtn play" href="#/nez/${esc(v.id)}"><i>▶</i>Lejátszás</a>` : `<span class="pbtn gold" style="cursor:default"><i>🔔</i>${v.premiere ? esc(huDate(v.premiere)) : 'Hamarosan'}</span>`}
          <button class="rnd${inList(v.id) ? ' on' : ''}" data-mylist="${esc(v.id)}" title="Saját lista">${inList(v.id) ? '✓' : '＋'}</button>
          <button class="rnd" data-share="${esc(v.id)}" title="Megosztás">📤</button></div></div></div>
    <div class="dbody">
      <div><div class="hmeta" style="margin:0 0 .8rem">${v.soon ? `<span class="soonb">${esc((v.status || 'Hamarosan').toUpperCase())}</span>` : isNew(v) ? '<span class="new">ÚJ</span>' : ''}${[v.year, v.len].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('')}${v.genre ? `<span class="box">${esc(v.genre)}</span>` : ''}</div>
        ${v.en ? `<p style="font-style:italic;color:#bfb8a9;margin-bottom:.6rem">${esc(v.en)}</p>` : ''}<p class="desc">${esc(v.desc || '')}</p></div>
      <div class="side2"><div><b>Típus:</b> ${esc(v.kind || 'Film')}</div>${v.genre ? `<div><b>Műfaj:</b> ${esc(v.genre)}</div>` : ''}${v.premiere ? `<div><b>Premier:</b> ${esc(huDate(v.premiere))}</div>` : ''}<div><b>Stúdió:</b> HGWS Studios</div></div>
      ${v.soon ? `<div class="stagebox"><h4>GYÁRTÁSI ÁLLAPOT</h4>${stageHtml(v.stage ?? 0)}</div>` : ''}
      <div class="sect"><h3>Hozzászólások</h3><div class="cmts" id="cmts"></div></div>
      ${similar.length ? `<div class="sect"><h3>További HGWS-címek</h3><div class="grid" style="margin-top:0">${similar.map(x => tile(x)).join('')}</div></div>` : ''}
    </div></div>`;
  document.body.appendChild(el); document.body.style.overflow = 'hidden';
  el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-close]')) closeDetail(); });
  el._key = e => { if (e.key === 'Escape' && document.body.lastElementChild === el) closeDetail(); };
  addEventListener('keydown', el._key);
  dlgUnsub = comments($('#cmts', el), v.id);
  if (!location.hash.startsWith('#/film/')) { el._back = location.hash || '#/'; history.pushState(null, '', '#/film/' + v.id); }
}
export function closeDetail(fromRoute) {
  const el = $('#dmodal'); if (!el) return;
  removeEventListener('keydown', el._key); dlgUnsub && dlgUnsub(); dlgUnsub = null;
  el.remove(); document.body.style.overflow = '';
  if (!fromRoute && location.hash.startsWith('#/film/')) { if (el._back) history.back(); else history.replaceState(null, '', '#/'); }
}
export const detailOpen = () => !!$('#dmodal');

/* ===================== lejátszó ===================== */
export async function watch(id) {
  cleanup();
  const v = film(id);
  if (!v) { $('#page').innerHTML = '<div class="pg"><div class="noresult"><div class="big">🎬</div>Ez a film nem található.</div></div>'; return; }
  document.title = v.title + ' · HGWS';
  const more = vis().filter(x => x.id !== v.id);
  $('#page').innerHTML = `<div class="watch"><div class="wframe" id="wf"><a class="wback" href="#/">‹ Vissza</a><div class="psoon" style="background-image:url('${esc(img(v))}')"><div><div class="spin" style="margin:0 auto"></div></div></div></div>
    <div class="winfo"><div class="orig"><img src="img/logo.webp" alt=""><span><b>HGWS</b> ${esc((v.kind || 'Film').toUpperCase())}</span></div><h1>${esc(v.title)}</h1>
      <div class="wrow"><div><div class="hmeta" style="margin-top:.4rem">${[v.year, v.len].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('')}${v.genre ? `<span class="box">${esc(v.genre)}</span>` : ''}</div>
        <p style="margin-top:.9rem;line-height:1.65;color:#e2dccf">${esc(v.desc || '')}</p>
        <div class="hbtns"><button class="pbtn info" data-mylist="${esc(v.id)}"><i>${inList(v.id) ? '✓' : '＋'}</i>Saját lista</button><button class="pbtn info" data-share="${esc(v.id)}"><i>📤</i>Megosztás</button></div>
        <div class="sect" style="margin-top:2rem"><h3 style="font-size:1.3rem;font-weight:700;margin-bottom:.8rem">Hozzászólások</h3><div class="cmts" id="cmts"></div></div></div>
      <div>${more.length ? `<h3 style="font-size:1.1rem;font-weight:700;margin-bottom:.8rem">Következő</h3><div class="grid" style="margin-top:0;grid-template-columns:1fr">${more.slice(0, 4).map(x => tile(x)).join('')}</div>` : ''}</div></div></div></div>`;
  unsubs.push(comments($('#cmts'), v.id));
  let src = {};
  if (!v.soon) { try { src = (await FB.getDoc(FB.doc(db, 'videoSources', v.id))).data() || {}; } catch (_) {} }
  const wf = $('#wf'); if (!wf || location.hash !== '#/nez/' + id) return;
  const back = '<a class="wback" href="#/">‹ Vissza</a>';
  const pr = progOf(v.id), start = pr ? Math.floor(pr.t) : 0;
  if (!v.soon && src.youtube) {
    wf.innerHTML = back + `<iframe id="ytw" src="https://www.youtube-nocookie.com/embed/${esc(src.youtube)}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&start=${start}&origin=${encodeURIComponent(location.origin)}" title="${esc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    trackYT(v.id, $('#ytw'));
  } else if (!v.soon && src.mp4) {
    wf.innerHTML = back + `<video src="${esc(src.mp4)}" poster="${esc(v.poster || '')}" controls autoplay playsinline></video>`;
    const vid = $('video', wf); if (start) vid.addEventListener('loadedmetadata', () => { vid.currentTime = start; }, { once: true });
    track.id = v.id; vid.addEventListener('timeupdate', () => note(vid.currentTime, vid.duration)); vid.addEventListener('pause', flush);
  }
  else wf.innerHTML = back + `<div class="psoon" style="background-image:url('${esc(img(v))}')"><div><b>HAMAROSAN</b><span>${v.premiere ? 'Premier: ' + esc(huDate(v.premiere)) : 'A videó még nem érhető el.'}</span>${v.soon ? stageHtml(v.stage ?? 0) : ''}</div></div>`;
}

/* ===================== lejátszási pozíció (Folytatás) ===================== */
const track = { id: null, t: 0, d: 0, saved: 0, timer: null, onMsg: null };
function note(t, d) { if (!isFinite(t) || !isFinite(d) || d <= 0) return; track.t = t; track.d = d; if (Date.now() - track.saved > 15000) flush(); }
function flush() {
  if (!track.id || !track.d || track.t < 5) return;
  track.saved = Date.now();
  const done = track.t >= track.d * .95;
  FB.setDoc(FB.doc(db, 'users', C.uid(), 'private', 'progress'), { [track.id]: done ? FB.deleteField() : { t: Math.round(track.t), d: Math.round(track.d), at: FB.serverTimestamp() } }, { merge: true }).catch(() => {});
}
function trackYT(id, frame) {
  stopTrack(); track.id = id;
  const hello = () => { try { frame.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'); } catch (_) {} };
  frame.addEventListener('load', () => { hello(); setTimeout(hello, 1000); });
  track.timer = setInterval(hello, 5000);
  track.onMsg = e => {
    if (!/youtube(-nocookie)?\.com$/.test(new URL(e.origin).hostname)) return;
    let d; try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch (_) { return; }
    const i = d?.info; if (i && typeof i.currentTime === 'number') note(i.currentTime, i.duration || track.d);
  };
  addEventListener('message', track.onMsg);
}
function stopTrack() {
  flush();
  clearInterval(track.timer); if (track.onMsg) removeEventListener('message', track.onMsg);
  Object.assign(track, { id: null, t: 0, d: 0, timer: null, onMsg: null });
}
addEventListener('pagehide', flush);

/* ===================== hozzászólások ===================== */
function comments(box, vid) {
  const me = C.S.me, uid = C.uid();
  const mu = toDate(me?.mutedUntil) > new Date();
  box.innerHTML = `${mu ? `<div class="cnote">🔇 Némítva vagy eddig: ${timeLabel(me.mutedUntil)}</div>` : `<div class="cform">${avatar(me, 40)}<div class="cb"><textarea maxlength="1500" placeholder="Mit gondolsz róla?"></textarea><div><button class="btn primary sm" data-send disabled>Küldés</button></div></div></div>`}<div data-list></div>`;
  const ta = $('textarea', box), send = $('[data-send]', box), list = $('[data-list]', box);
  const col = FB.collection(db, 'videos', vid, 'comments');
  if (ta) {
    const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; send.disabled = !ta.value.trim(); };
    ta.oninput = fit;
    const go = async () => { const t = ta.value.trim(); if (!t) return; send.disabled = true;
      try { await FB.addDoc(col, { uid, text: t, createdAt: FB.serverTimestamp() }); ta.value = ''; fit(); } catch (e) { toast(errText(e), true); send.disabled = false; } };
    send.onclick = go; ta.onkeydown = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) go(); };
  }
  let items = [];
  const un = FB.onSnapshot(FB.query(col, FB.orderBy('createdAt', 'desc'), FB.limit(100)), s => {
    items = s.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
    list.innerHTML = items.length ? items.map(c => { const u = C.U(c.uid), likes = c.reactions?.['👍'] || [];
      return `<div class="cmt" data-c="${esc(c.id)}">${`<span data-u="${esc(u.id)}" style="cursor:pointer">${avatar(u, 40)}</span>`}<div class="cc"><div class="ch"><b data-u="${esc(u.id)}" style="color:${u.role && u.role !== 'user' ? ROLES[u.role].color : 'inherit'}">${esc(u.name)}</b><time>${timeLabel(c.createdAt)}</time></div>
        <div class="ct">${esc(c.text)}</div><div class="ca"><button data-like class="${likes.includes(uid) ? 'me' : ''}">👍 ${likes.length || ''}</button>${c.uid === uid || C.isMod() ? '<button data-del>Törlés</button>' : ''}</div></div></div>`; }).join('')
      : '<p class="hint">Még senki nem szólt hozzá. Légy te az első!</p>';
  }, e => { list.innerHTML = `<p class="hint">${esc(errText(e))}</p>`; });
  list.onclick = async e => {
    const el = e.target.closest('[data-c]'); if (!el) return; const c = items.find(x => x.id === el.dataset.c); if (!c) return;
    const ref = FB.doc(col, c.id);
    if (e.target.closest('[data-like]')) { const has = (c.reactions?.['👍'] || []).includes(uid);
      try { await FB.updateDoc(ref, new FB.FieldPath('reactions', '👍'), has ? FB.arrayRemove(uid) : FB.arrayUnion(uid)); } catch (er) { toast(errText(er), true); } }
    if (e.target.closest('[data-del]') && await confirmBox('Törlöd ezt a hozzászólást?', 'Törlés')) { try { await FB.deleteDoc(ref); } catch (er) { toast(errText(er), true); } }
  };
  return un;
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
    if (b.classList.contains('rnd')) { b.classList.toggle('on', on); b.textContent = on ? '✓' : '＋'; }
    else { const i = b.querySelector('i'); if (i) i.textContent = on ? '✓' : (b.classList.contains('gold') ? '🔔' : '＋'); if (b.classList.contains('gold')) b.lastChild.textContent = on ? 'A listádon' : 'Emlékeztess'; } });
}

/* ===================== kattintások ===================== */
export function onClick(e) {
  const t = e.target;
  const b = t.closest('[data-play],[data-mylist],[data-share],[data-info]');
  if (b) {
    e.preventDefault(); e.stopPropagation();
    if (b.dataset.play) { const v = film(b.dataset.play); if (v && !v.soon && v.hasVideo) { closeDetail(true); location.hash = '#/nez/' + v.id; } else detail(b.dataset.play); }
    else if (b.dataset.mylist) toggleList(b.dataset.mylist);
    else if (b.dataset.share) C.shareFilm(b.dataset.share);
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
