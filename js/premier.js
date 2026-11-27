// HGWS – élő premier: a film előre meghirdetett időpontban mindenkinek egyszerre indul (mint egy élő adás).
// Fél órával előtte nyílik a várószoba visszaszámlálással; a vetítést egy vezérlő (master) irányítja zárral védve;
// a nézők csak visszafelé tekerhetnek, és egy gombbal visszaugorhatnak a vezérlőhöz. Vége után a csevegés még 30 percig él,
// a film pedig 24 órával később (vagy a megadott időpontban) magától megjelenik a filmtárban.
import { FB, db, $, esc, avatar, toast, errText } from './core.js?v=202611271237';
import * as VP from './vplayer.js?v=202611271237';
import { ambilight, applyTint } from './fx.js?v=202611271237';

export const LOBBY = 30 * 60e3, AFTER = 30 * 60e3, DAY = 864e5, DEFDUR = 3 * 3600;
let C = null, gen = 0, cleanup = [], offset = 0, last = new Map();
export function init(ctx) { C = ctx; setInterval(() => { if (C.S.videos?.length && apply(C.S.videos)) C.changed?.(); }, 15000); }
const now = () => Date.now() + offset;
const ms = x => x?.toMillis ? x.toMillis() : typeof x === 'number' ? x : null;
const pad = n => String(n).padStart(2, '0');

/* ---------- időpontok, fázisok ---------- */
/** a vezérlő szerinti lejátszási pozíció (mp) – 'auto': a premier kezdete óta eltelt idő */
export function pos(P, liveAt, t = now()) {
  if (!P || !P.state || P.state === 'auto') return (t - liveAt) / 1000;
  const at = ms(P.at) ?? t; return P.state === 'play' ? P.t + Math.max(0, t - at) / 1000 : P.t;
}
/** egy film premier-állapota: upcoming | lobby | live | after | done, a vége és a filmtárba kerülés ideje */
export function info(v, t = now()) {
  if (!v?.liveAt) return null;
  const P = C?.S.premieres?.[v.id], liveAt = v.liveAt, ended = ms(P?.endedAt);
  let end;
  if (ended) end = ended;
  else if (P?.dur) end = t < liveAt ? liveAt + P.dur * 1000 : t + (P.dur - Math.max(0, pos(P, liveAt, t))) * 1000;
  else end = liveAt + DEFDUR * 1000;
  const release = v.releaseAt || end + DAY;
  const phase = t < liveAt - LOBBY ? 'upcoming' : t < liveAt ? 'lobby' : t < end ? 'live' : t < end + AFTER ? 'after' : 'done';
  return { phase, liveAt, end, release, open: phase === 'lobby' || phase === 'live' || phase === 'after', released: t >= release };
}
/** a filmlista frissítése: premieres filmnél a „hamarosan” a filmtárba kerülésig tart. Igaz, ha valami változott. */
export function apply(videos) {
  let ch = false;
  for (const v of videos) {
    if (!v.liveAt) continue; const i = info(v); v.soon = !i.released; v.premiere = dayStr(v.liveAt); v.live = i;
    const k = v.soon + '|' + i.phase; if (last.get(v.id) !== k) { if (last.has(v.id)) ch = true; last.set(v.id, k); }
  }
  return ch;
}
/** a legközelebbi még meg nem jelent premier (a főoldal kiemeléséhez és a hirdetésekhez) */
export function featured(videos) {
  return videos.filter(v => v.liveAt && v.visible !== false && v.live && v.live.phase !== 'done' && !v.live.released).sort((a, b) => a.liveAt - b.liveAt)[0] || null;
}
const dayStr = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const when = t => { const d = new Date(t); return d.toLocaleDateString('hu-HU', { month: 'long', day: 'numeric', weekday: 'long' }) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
export const shortWhen = t => { const d = new Date(t); return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}. ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const hms = s => { s = Math.max(0, Math.floor(s)); const h = s / 3600 | 0, m = s / 60 % 60 | 0, x = s % 60; return (h ? h + ':' + pad(m) : m) + ':' + pad(x); };
export function label(v) { const i = v?.live; if (!i) return ''; return i.phase === 'live' ? 'ÉLŐ PREMIER' : i.phase === 'lobby' ? 'PREMIER HAMAROSAN INDUL' : i.phase === 'after' ? 'A PREMIER VÉGET ÉRT' : 'PREMIER ' + shortWhen(v.liveAt); }

/* szerveróra-eltérés (a party-hoz hasonlóan): egy szerver-időbélyeg visszaolvasása */
async function clockOffset() {
  if (C.S.guest || offset) return;
  try { const ref = FB.doc(db, 'users', C.uid(), 'private', 'clock'), t0 = Date.now(); await FB.setDoc(ref, { t: FB.serverTimestamp() }); const s = await FB.getDoc(ref), t1 = Date.now(); offset = s.data().t.toMillis() - (t0 + t1) / 2; } catch (_) {}
}
function stop() { cleanup.forEach(f => { try { f(); } catch (_) {} }); cleanup = []; }
export function leave() { gen++; stop(); }

/* ---------- a premier oldala: #/premier/<filmazonosító> ---------- */
export async function render(vid) {
  stop(); const my = ++gen, page = $('#page');
  page.innerHTML = '<div class="pg"><div class="spin" style="margin:3rem auto"></div></div>';
  await clockOffset(); if (my !== gen) return;
  const film = () => C.S.videos.find(v => v.id === vid), ref = FB.doc(db, 'premieres', vid);
  const f0 = film();
  if (!f0?.liveAt) { page.innerHTML = '<div class="pg"><div class="noresult"><div class="big"><i class="ic ic-clapperboard"></i></div>Ehhez a filmhez nincs premier.</div></div>'; return; }
  document.title = 'Premier: ' + f0.title + ' · HGWS';
  let P = {}, vp = null, src = null, follow = true, built = false, chatOn = null, endSent = false, durSent = false, lastPh = '';
  const isMaster = () => P.master === C.uid(), canTake = () => C.can('publishMedia') && !isMaster();
  const ph = () => info(film() || f0).phase, expected = () => pos(P, f0.liveAt);

  page.innerHTML = `<div class="party prem"><div class="pmain"><div class="ambw" id="pamb"><div class="pframe" id="pf"></div><div class="prov" id="pov"></div></div>
      <div class="ptbar"><div><div class="eyebrow">// HGWS PREMIER</div><h1>${esc(f0.title)}</h1><small id="pwhen"></small></div>
        <div class="pbtns2" id="pctl"></div></div></div>
    <aside class="pside"><div class="pmem"><h3>Nézők <span class="cnt" id="pCnt">0</span></h3><div id="pMem"></div></div>
      <div class="pchat"><div class="pmsgs" id="pMsgs"></div><div id="pIn"></div></div></aside></div>`;
  const poster = f0.banner || f0.poster || '';
  cleanup.push(ambilight($('#pamb'), { img: poster })); applyTint($('.prem'), poster);
  $('#pwhen').textContent = 'Premier: ' + when(f0.liveAt);
  try { src = (await FB.getDoc(FB.doc(db, 'videoSources', vid))).data() || {}; } catch (_) { src = {}; }
  if (my !== gen) return;

  /* lejátszó: a várószoba megnyitásakor töltődik be (szünetelve), a visszaszámlálás végén indul */
  function build() {
    if (built || !(src.youtube || src.mp4)) return; built = true;
    vp = VP.mount($('#pf'), {
      youtube: src.mp4 ? '' : src.youtube, mp4: src.mp4 || '', vtt: src.vtt || '', poster, title: f0.title, start: Math.max(0, expected()), autoplay: false,
      locked: isMaster() && P.locked !== false, maxT: () => isMaster() ? Infinity : expected() + .6,
      onLocked: () => { if (ph() === 'live' && expected() >= 0 && P.state !== 'pause' && !vp.playing()) { vp.play(); return; } toast('A vetítés zárolva van – a lakattal oldhatod fel.'); },
      onAction: (kind, t) => {
        if (isMaster()) { if (ph() !== 'live') return; FB.updateDoc(ref, { state: kind === 'pause' ? 'pause' : kind === 'seek' ? (vp.playing() ? 'play' : 'pause') : 'play', t, at: FB.serverTimestamp() }).catch(e => toast(errText(e), true)); return; }
        const e = expected();
        if (kind === 'pause') follow = false;
        else if (kind === 'seek') follow = t >= e - 2;
        else if (kind === 'play') follow = Math.abs(t - e) < 2.5;
        ctl();
      },
      onEnd: () => markEnd()
    });
    cleanup.push(() => vp?.destroy());
  }
  function markEnd() { if (endSent || P.endedAt) return; endSent = true; FB.updateDoc(ref, { endedAt: FB.serverTimestamp() }).catch(() => {}); }

  /* szinkron: a követő néző a vezérlő pozícióján marad; előre senki sem kerülhet */
  function sync() {
    if (!vp || !vp.ready()) return;
    const e = expected(), d = vp.dur();
    if (d && !P.dur && !durSent) { durSent = true; FB.updateDoc(ref, { dur: Math.round(d) }).catch(() => {}); }
    if (d && e >= d - .5 && ph() === 'live') markEnd();
    if (e < 0 || ph() === 'after' || ph() === 'done') { if (vp.playing()) vp.pause(); return; }
    const playingWanted = P.state !== 'pause', t = vp.time();
    if (t > e + 1.5) { vp.seek(e); follow = true; }
    if (!follow && !isMaster()) return;
    if (Math.abs(t - e) > 1.8) vp.seek(e);
    if (playingWanted && !vp.playing()) vp.play();
    if (!playingWanted && vp.playing()) vp.pause();
  }
  const resync = () => { follow = true; if (vp?.ready()) { vp.seek(expected()); if (P.state !== 'pause') vp.play(); } ctl(); };

  /* fedőréteg: visszaszámlálás / szünet / vége */
  function overlay() {
    const o = $('#pov'); if (!o) return; const p = ph(), e = expected();
    let h = '';
    if (p === 'upcoming') h = `<div class="pcd"><small>A VÁRÓSZOBA ${esc(when(f0.liveAt - LOBBY).toUpperCase())}-KOR NYÍLIK</small><b>${cd(f0.liveAt - now())}</b><span>a premierig</span></div>`;
    else if (p === 'lobby' || (p === 'live' && e < 0)) h = `<div class="pcd"><small>A PREMIER INDUL</small><b class="big">${cd(f0.liveAt - now())}</b><span>${esc(f0.title)}</span></div>`;
    else if (p === 'live' && !(src.youtube || src.mp4)) h = '<div class="pcd"><b style="font-size:1.4rem">A videó még nem érhető el</b></div>';
    else if (p === 'live' && P.state === 'pause' && follow) h = '<div class="pcd sm"><b>⏸</b><span>A vetítés szünetel</span></div>';
    else if (p === 'after' || p === 'done') { const i = info(film() || f0); h = `<div class="pcd"><small>VÉGE</small><b style="font-size:clamp(1.4rem,4vw,2.4rem)">Köszönjük, hogy velünk néztétek!</b><span>${i.released ? `<a class="pbtn play" href="#/nez/${esc(vid)}"><i class="ic ic-play"></i>Megnézem a filmtárban</a>` : 'A filmtárban: ' + esc(when(i.release))}</span></div>`; }
    o.innerHTML = h; o.classList.toggle('on', !!h); o.classList.toggle('pass', p === 'live' && P.state === 'pause' && follow);
  }
  const cd = t => { const s = Math.max(0, Math.ceil(t / 1000)); const d = s / 86400 | 0; return (d ? d + ' nap ' : '') + hms(s % 86400); };

  /* vezérlőgombok */
  function ctl() {
    const b = $('#pctl'); if (!b) return; const p = ph(), lag = vp?.ready() ? expected() - vp.time() : 0;
    let h = '';
    if (p === 'live') h += `<span class="plv"><i></i>ÉLŐ</span>`;
    if (isMaster()) h += `<button class="btn ${P.locked !== false ? 'goldb' : 'danger'} sm" data-k="lock" title="Zárolva a lejátszó nem állítható le és nem tekerhető"><i class="ic ic-${P.locked !== false ? 'lock' : 'lock-open'}"></i>${P.locked !== false ? 'Zárolva' : 'Feloldva – irányítasz'}</button>${P.state && P.state !== 'auto' ? '<button class="btn plain sm" data-k="auto" title="Vissza a meghirdetett menetrendhez"><i class="ic ic-clock"></i>Menetrend szerint</button>' : ''}`;
    else if (p === 'live' && vp) h += follow && lag < 3 ? '<span class="psy ok"><i class="ic ic-radio"></i>Szinkronban</span>' : `<button class="btn goldb sm" data-k="sync"><i class="ic ic-radio"></i>Szinkron (−${hms(lag)})</button>`;
    if (canTake()) h += '<button class="btn plain sm" data-k="take"><i class="ic ic-crown"></i>Irányítás átvétele</button>';
    h += '<button class="btn plain sm" data-k="copy"><i class="ic ic-link"></i>Link</button>';
    if (b.dataset.h !== h) { b.dataset.h = h; b.innerHTML = h; }
  }
  $('#pctl').onclick = async e => { const k = e.target.closest('[data-k]')?.dataset.k; if (!k) return;
    try {
      if (k === 'lock') await FB.updateDoc(ref, { locked: P.locked === false });
      if (k === 'auto') await FB.updateDoc(ref, { state: 'auto', t: 0, at: FB.serverTimestamp() });
      if (k === 'take') await FB.updateDoc(ref, { master: C.uid(), locked: true });
      if (k === 'sync') resync();
      if (k === 'copy') navigator.clipboard?.writeText(location.href).then(() => toast('Link kimásolva ✓'));
    } catch (er) { toast(errText(er), true); } };

  /* csevegés: a várószoba nyitásától a vége után 30 percig */
  function chat(on) {
    if (chatOn === on) return; chatOn = on; const inBox = $('#pIn'), box = $('#pMsgs'); if (!on) { chat.un?.(); chat.un = null; }
    if (!on) { if (box) box.innerHTML = `<p class="hint">${ph() === 'upcoming' ? 'A csevegés a várószobával együtt nyílik, fél órával a premier előtt.' : 'A premier csevegése lezárult.'}</p>`; if (inBox) inBox.innerHTML = ''; return; }
    inBox.innerHTML = C.S.guest ? '<div class="cnote"><i class="ic ic-eye"></i> Vendégként csak nézni tudsz.</div>' : '<div class="pin"><input class="inp" id="pTxt" maxlength="500" placeholder="Írj valamit…" autocomplete="off"><button class="ibtn send" id="pSend"><i class="ic ic-send-horizontal"></i></button></div>';
    const ti = $('#pTxt');
    const send = async () => { const text = ti.value.trim(); if (!text) return; ti.value = '';
      try { await FB.addDoc(FB.collection(db, 'premieres', vid, 'msgs'), { uid: C.uid(), text, createdAt: FB.serverTimestamp() }); } catch (er) { toast(errText(er), true); ti.value = text; } };
    $('#pSend')?.addEventListener('click', send); ti?.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    const un = FB.onSnapshot(FB.query(FB.collection(db, 'premieres', vid, 'msgs'), FB.orderBy('createdAt', 'desc'), FB.limit(200)), s => {
      const b = $('#pMsgs'); if (!b || !chatOn) return; const at = b.scrollHeight - b.scrollTop - b.clientHeight < 60;
      b.innerHTML = [...s.docs].reverse().map(d => { const m = d.data({ serverTimestamps: 'estimate' }), u = C.U(m.uid);
        return `<div class="ptm">${avatar(u, 26)}<div><b>${esc(u.name)}</b>${m.uid === P.master ? ' <span class="rb" style="--rc:#ffa94d">VETÍTÉSVEZETŐ</span>' : ''}<p>${esc(m.text)}</p></div></div>`; }).join('') || '<p class="hint">Írd meg, mit vársz a filmtől! 🍿</p>';
      if (at) b.scrollTop = b.scrollHeight;
    }, () => {});
    cleanup.push(un); chat.un = un;
  }

  /* nézők – takarékosan: mindenki 75 mp-enként ír egy jelenlét-dokumentumot (premieres/{film}/viewers/{uid});
     a névsort egyetlen kliens (a vezérlő, vagy ha ő nincs, bárki, aki észreveszi, hogy régi) percenként összesíti a fő dokumentumba */
  const VIEW = FB.collection(db, 'premieres', vid, 'viewers'), WIN = 180e3;
  function members() {
    const v = P.view || {}, l = Array.isArray(v.u) ? v.u : [], n = v.n || l.length;
    const box = $('#pMem'); if (!box) return; $('#pCnt').textContent = n;
    box.innerHTML = l.map(u => { const x = C.U(u); return `<span class="pmu" title="${esc(x.name)}">${avatar(x, 30)}${u === P.master ? '<i class="ic ic-crown"></i>' : ''}</span>`; }).join('') + (n > l.length ? `<span class="pmore">+${n - l.length}</span>` : '');
  }
  const open = () => { const p = ph(); return p === 'lobby' || p === 'live' || p === 'after'; };
  const ping = () => { if (open() && !document.hidden) FB.setDoc(FB.doc(VIEW, C.uid()), { at: FB.serverTimestamp() }).catch(() => {}); };
  async function tally(force) {   // összesítés: legfeljebb percenként egyszer, egy kliensről
    if (!open()) return; const age = now() - (ms(P.view?.at) || 0);
    if (!force && !(isMaster() ? age > 55e3 : age > 150e3 + (C.uid().charCodeAt(0) % 20) * 1e3)) return;
    try { const s = await FB.getDocs(FB.query(VIEW, FB.where('at', '>', FB.Timestamp.fromMillis(now() - WIN)), FB.limit(200)));
      const ids = s.docs.map(d => d.id).sort((a, b) => (b === P.master) - (a === P.master));
      await FB.updateDoc(ref, { view: { n: ids.length, u: ids.slice(0, 30), at: FB.serverTimestamp() } }); } catch (_) {}
  }

  /* ütemezés */
  function step() {
    if (my !== gen) return; const p = ph();
    if (p !== lastPh) { lastPh = p; chat(p === 'lobby' || p === 'live' || p === 'after'); if (p === 'lobby' || p === 'live') build(); if (open()) { ping(); setTimeout(() => tally(!P.view), 1500); } }
    sync(); overlay(); ctl();
  }
  cleanup.push(FB.onSnapshot(ref, s => {
    if (!location.hash.startsWith('#/premier/' + vid)) return stop();
    P = s.data() || {}; C.S.premieres = { ...(C.S.premieres || {}), [vid]: P };
    vp?.lock(isMaster() && P.locked !== false); members(); step();
  }, () => {}));
  const iv = setInterval(step, 500), pi = setInterval(ping, 75e3), ti = setInterval(() => tally(), 20e3), vis = () => { if (!document.hidden) ping(); };
  document.addEventListener('visibilitychange', vis); cleanup.push(() => clearInterval(ti), () => document.removeEventListener('visibilitychange', vis), () => { FB.deleteDoc(FB.doc(VIEW, C.uid())).catch(() => {}); });
  cleanup.push(() => clearInterval(iv), () => clearInterval(pi));
  step();
}
