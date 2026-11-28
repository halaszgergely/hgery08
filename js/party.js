// HGWS – közös nézés (watch party): a házigazda irányítja a lejátszást, mindenki más szinkronban nézi, mellette csevegés
import { FB, db, $, $$, esc, avatar, timeLabel, toast, errText, notify, isOnline } from './core.js?v=202611281736';
import { modal } from './ui.js?v=202611281736';
import * as VP from './vplayer.js?v=202611281736';
import { ambilight, applyTint } from './fx.js?v=202611281736';

let C = null, gen = 0, cleanup = [];
export function init(ctx) { C = ctx; }
const here = id => location.hash === '#/party/' + id;
function stop() { cleanup.forEach(f => { try { f(); } catch (_) {} }); cleanup = []; }

/* szerveridő-eltérés: egyszer írunk egy szerver-időbélyeget, és visszaolvassuk */
let offset = null;
async function clockOffset() {
  if (offset !== null) return offset;
  try {
    const ref = FB.doc(db, 'users', C.uid(), 'private', 'clock');
    const t0 = Date.now(); await FB.setDoc(ref, { t: FB.serverTimestamp() });
    const s = await FB.getDoc(ref); const t1 = Date.now();
    offset = s.data().t.toMillis() - (t0 + t1) / 2;
  } catch (_) { offset = 0; }
  return offset;
}
const nowS = () => Date.now() + (offset || 0);

/* új közös nézés indítása egy filmhez */
export async function create(vid) {
  if (C.S.guest) return toast('Közös nézést csak regisztrált tagok indíthatnak.', true);
  try {
    const t = FB.serverTimestamp();
    const ref = await FB.addDoc(FB.collection(db, 'parties'), { host: C.uid(), vid, state: 'pause', t: 0, at: t, createdAt: t, members: { [C.uid()]: t } });
    location.hash = '#/party/' + ref.id;
  } catch (e) { toast(errText(e), true); }
}

export async function render(id) {
  stop();
  const my = ++gen, page = $('#page');
  page.innerHTML = '<div class="pg"><div class="spin" style="margin:3rem auto"></div></div>';
  await clockOffset();
  if (my !== gen) return;
  const ref = FB.doc(db, 'parties', id);
  let p = null, vp = null, built = false, joined = false;
  const isHost = () => p && p.host === C.uid();
  const film = () => C.S.videos.find(v => v.id === p?.vid);
  const expected = () => p.state === 'play' ? p.t + Math.max(0, nowS() - (p.at?.toMillis?.() ?? nowS())) / 1000 : p.t;

  async function build() {
    built = true;
    const f = film();
    let src = {};
    try { src = (await FB.getDoc(FB.doc(db, 'videoSources', p.vid))).data() || {}; } catch (_) {}
    if (my !== gen) return;
    page.innerHTML = `<div class="party"><div class="pmain"><div class="ambw" id="pamb"><div class="pframe" id="pf"></div></div>
        <div class="ptbar"><div><div class="eyebrow">// KÖZÖS NÉZÉS</div><h1>${esc(f?.title || 'Film')}</h1>
          <small id="pHost"></small></div>
          <div class="pbtns2"><button class="btn plain sm" id="pCopy"><i class="ic ic-link"></i> Link másolása</button>${C.S.guest ? '' : '<button class="btn plain sm" id="pInv"><i class="ic ic-mail"></i> Meghívás</button>'}<button class="btn danger sm" id="pLeave">${isHost() ? 'Befejezés' : 'Kilépés'}</button></div></div></div>
      <aside class="pside"><div class="pmem"><h3>Nézők <span class="cnt" id="pCnt">0</span></h3><div id="pMem"></div></div>
        <div class="pchat"><div class="pmsgs" id="pMsgs"></div>${C.S.guest ? '<div class="cnote"><i class="ic ic-eye"></i> Vendégként csak nézni tudsz.</div>' : '<div class="pin"><input class="inp" id="pTxt" maxlength="500" placeholder="Írj valamit…" autocomplete="off"><button class="ibtn send" id="pSend"><i class="ic ic-send-horizontal"></i></button></div>'}</div></aside></div>`;
    if (!src.youtube && !src.mp4) { $('#pf').innerHTML = '<div class="psoon"><div><b>A videó még nem érhető el</b></div></div>'; return; }
    vp = VP.mount($('#pf'), {
      youtube: src.mp4 ? '' : src.youtube, mp4: src.mp4 || '', vtt: src.vtt || '', poster: f?.poster || '', title: f?.title || '', start: 0,
      locked: !isHost(), autoplay: false,
      onLocked: () => { joined = true; sync(true); },
      onAction: (kind, t) => { if (!isHost()) return; FB.updateDoc(ref, { state: kind === 'pause' ? 'pause' : (kind === 'seek' ? (vp.playing() ? 'play' : 'pause') : 'play'), t, at: FB.serverTimestamp() }).catch(e => toast(errText(e), true)); },
      onEnd: () => { if (isHost()) FB.updateDoc(ref, { state: 'pause', t: 0, at: FB.serverTimestamp() }).catch(() => {}); }
    });
    cleanup.push(() => vp?.destroy());
    const poster = src.youtube && !src.mp4 ? `https://i.ytimg.com/vi/${src.youtube}/hqdefault.jpg` : (f?.poster || f?.banner || '');
    cleanup.push(ambilight($('#pamb'), { img: poster })); applyTint($('.party'), f?.banner || f?.poster);
    $('#pCopy').onclick = () => navigator.clipboard?.writeText(location.href).then(() => toast('Link kimásolva – küldd el a barátaidnak! ✓'));
    $('#pInv')?.addEventListener('click', invite);
    $('#pLeave').onclick = async () => {
      if (isHost()) { try { await FB.deleteDoc(ref); } catch (e) { return toast(errText(e), true); } }
      location.hash = '#/nez/' + p.vid;
    };
    const ti = $('#pTxt');
    const send = async () => { const text = ti.value.trim(); if (!text) return; ti.value = '';
      try { await FB.addDoc(FB.collection(db, 'parties', id, 'msgs'), { uid: C.uid(), text, createdAt: FB.serverTimestamp() }); } catch (e) { toast(errText(e), true); ti.value = text; } };
    $('#pSend')?.addEventListener('click', send);
    ti?.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    cleanup.push(FB.onSnapshot(FB.query(FB.collection(db, 'parties', id, 'msgs'), FB.orderBy('createdAt'), FB.limit(200)), s => {
      const box = $('#pMsgs'); if (!box) return;
      const at = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
      box.innerHTML = s.docs.map(d => { const m = d.data({ serverTimestamps: 'estimate' }), u = C.U(m.uid);
        return `<div class="ptm">${avatar(u, 26)}<div><b>${esc(u.name)}</b>${m.uid === p.host ? ' <span class="rb" style="--rc:#ffa94d">HÁZIGAZDA</span>' : ''}<p>${esc(m.text)}</p></div></div>`; }).join('') || '<p class="hint">Írd meg, mit szólsz a filmhez! 🍿</p>';
      if (at) box.scrollTop = box.scrollHeight;
    }, () => {}));
    // jelenlét: 20 mp-enként frissül
    const ping = () => FB.updateDoc(ref, new FB.FieldPath('members', C.uid()), FB.serverTimestamp()).catch(() => {});
    ping(); const pi = setInterval(ping, 20000); cleanup.push(() => clearInterval(pi));
    // szinkron ellenőrzés
    const si = setInterval(() => sync(false), 3000); cleanup.push(() => clearInterval(si));
  }

  function sync(fromClick) {
    if (!vp || !p || isHost() || !vp.ready()) return;
    const want = expected();
    if (Math.abs(vp.time() - want) > 1.5) vp.seek(want);
    if (p.state === 'play' && !vp.playing() && (joined || fromClick)) vp.play();
    if (p.state === 'pause' && vp.playing()) vp.pause();
  }

  function members() {
    const now = nowS(), l = Object.entries(p.members || {}).filter(([, t]) => t?.toMillis && now - t.toMillis() < 45000).map(([u]) => u);
    const box = $('#pMem'); if (!box) return;
    $('#pCnt').textContent = l.length;
    box.innerHTML = l.map(u => { const x = C.U(u); return `<span class="pmu" title="${esc(x.name)}">${avatar(x, 30)}${u === p.host ? '<i class="ic ic-crown"></i>' : ''}</span>`; }).join('');
    const h = C.U(p.host); $('#pHost').innerHTML = `Házigazda: <b>${esc(h.name)}</b>${isHost() ? ' (te irányítasz)' : ' – ő irányítja a lejátszást'}`;
  }

  function invite() {
    const l = [...C.S.users.values()].filter(u => u.id !== C.uid() && !u.banned).sort((a, b) => (isOnline(b) - isOnline(a)) || a.name.localeCompare(b.name, 'hu'));
    const el = modal({ title: 'Meghívás közös nézésre', body: `<p class="hint" style="margin-bottom:.8rem">Akit kiválasztasz, értesítést kap a csengőnél.</p>
      <div class="invl">${l.map(u => `<label class="chk"><input type="checkbox" value="${esc(u.id)}"> ${avatar(u, 26)} <b>${esc(u.name)}</b>${isOnline(u) ? ' <span class="odot"></span>' : ''}</label>`).join('')}</div>`,
      foot: '<button class="btn plain" data-x>Mégse</button><button class="btn goldb" data-ok>Meghívás</button>' });
    el.querySelector('[data-ok]').onclick = () => {
      const ids = $$('.invl input:checked', el).map(i => i.value);
      ids.forEach(u => notify(u, 'party', `${C.S.me.name} meghívott közös nézésre: ${film()?.title || 'film'} 🍿`, '#/party/' + id));
      toast(ids.length ? `${ids.length} meghívó elküldve ✓` : 'Senkit nem választottál ki.'); el.close();
    };
  }

  cleanup.push(FB.onSnapshot(ref, s => {
    if (!here(id)) return stop();
    if (!s.exists()) { stop(); page.innerHTML = `<div class="pg"><div class="noresult"><div class="big"><i class="ic ic-popcorn"></i></div>Ez a közös nézés véget ért.<br><br><a class="pbtn play" href="#/tar"><i class="ic ic-clapperboard"></i>Filmtár</a></div></div>`; return; }
    p = { id: s.id, ...s.data() };
    if (!built) build().then(() => { members(); sync(false); });
    else { vp?.lock(!isHost()); members(); sync(false); }
  }, e => { page.innerHTML = `<div class="pg"><div class="noresult"><div class="big"><i class="ic ic-lock"></i></div>${esc(errText(e))}</div></div>`; }));
}
/* elhagyjuk a közös nézést (másik oldalra navigáltunk) */
export function leave() { gen++; stop(); }
