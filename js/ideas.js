// HGWS – Ötletek (ticket rendszer): a belépett tagok ötletet, hibát, kérdést küldhetnek,
// a moderátortól felfelé (akinek „tickets” joga van) mindenki látja és válaszolhat rájuk.
import { FB, db, $, $$, esc, avatar, timeLabel, toDate, toast, errText, notify, audit, roleOf, OWNER_UID } from './core.js?v=202611211715';
import { modal, confirmBox } from './ui.js?v=202611211715';

let C = null;
export function init(ctx) { C = ctx; }

export const CATS = { otlet: ['<i class="ic ic-lightbulb"></i>', 'Ötlet'], hiba: ['<i class="ic ic-bug"></i>', 'Hiba'], kerdes: ['<i class="ic ic-circle-help"></i>', 'Kérdés'], egyeb: ['<i class="ic ic-message-circle"></i>', 'Egyéb'] };
export const STATUS = {
  nyitott: ['Nyitott', '#6cc6ff'], folyamatban: ['Folyamatban', '#ffa94d'], kesz: ['Kész', '#5ee08a'], elutasitva: ['Elutasítva', '#ff7a6e']
};
const pill = s => { const [l, c] = STATUS[s] || STATUS.nyitott; return `<span class="ipill" style="--ic:${c}">${l}</span>`; };
const staff = () => C.can('tickets');
const here = () => location.hash.startsWith('#/otletek');

let unsubs = [], filter = null, items = [], loaded = false;
function stop() { unsubs.forEach(u => u()); unsubs = []; }

export function render(id) {
  stop();
  if (id) return detail(id);
  document.title = 'Ötletek · HGWS';
  filter ||= staff() ? 'aktiv' : 'szavaz';
  const page = $('#page');
  page.innerHTML = `<div class="pg ideas"><div class="ihead"><div><div class="eyebrow">// HGWS KÖZÖSSÉG</div><h1 class="gold">Ötletek és visszajelzések</h1>
    <p class="lead">${staff() ? 'Az összes beküldött ötlet, hibajelzés és kérdés. Válaszolj rájuk, és állítsd az állapotukat.' : 'Van egy ötleted, hibát találtál, vagy kérdésed van? Küldd be – a HGWS csapata (moderátoroktól felfelé) válaszol rá.'}</p></div>
    <button class="btn goldb" id="newIdea"><i class="ic ic-plus"></i> Új beküldés</button></div>
    <div class="ifilt">${[['szavaz', '<i class="ic ic-thumbs-up"></i> Szavazás'], ['aktiv', 'Aktív'], ['mind', 'Mind'], ...(staff() ? [] : [['sajat', 'Sajátjaim']]), ...Object.entries(STATUS).map(([k, [l]]) => [k, l])].map(([k, l]) => `<button data-f="${k}" class="${filter === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div id="ilist"><div class="spin" style="margin:2rem auto"></div></div></div>`;
  $('#newIdea').onclick = newIdea;
  $('#ilist').addEventListener('click', e => { const v = e.target.closest('[data-vote]'); if (v) { e.preventDefault(); e.stopPropagation(); vote(v.dataset.vote); } });
  $('.ifilt').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; filter = b.dataset.f; $$('.ifilt button').forEach(x => x.classList.toggle('on', x === b)); drawList(); };
  const col = FB.collection(db, 'ideas');
  // a staff mindent lát; a tagok a sajátjukat + a nyilvános (szavazható) ötleteket
  const got = {}, merge = () => { items = Object.values(Object.assign({}, ...Object.values(got))).sort((a, b) => (toDate(b.updatedAt)?.getTime() || 0) - (toDate(a.updatedAt)?.getTime() || 0)); loaded = true; drawList(); };
  const sub = (key, q) => unsubs.push(FB.onSnapshot(q, s => {
    if (!here()) return stop();
    got[key] = Object.fromEntries(s.docs.map(d => [d.id, { id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }])); merge();
  }, e => { const l = $('#ilist'); if (l) l.innerHTML = `<p class="hint">${esc(errText(e))}</p>`; }));
  if (staff()) sub('all', FB.query(col, FB.orderBy('updatedAt', 'desc'), FB.limit(300)));
  else { sub('mine', FB.query(col, FB.where('uid', '==', C.uid()))); sub('pub', FB.query(col, FB.where('public', '==', true))); }
}

/* szavazás egy nyilvános ötletre (👍) – újra kattintva visszavonja */
async function vote(id, list = items) {
  const x = list.find(i => i.id === id); if (!x) return;
  const on = (x.votes || []).includes(C.uid());
  try { await FB.updateDoc(FB.doc(db, 'ideas', id), { votes: on ? FB.arrayRemove(C.uid()) : FB.arrayUnion(C.uid()) }); }
  catch (e) { toast(errText(e), true); }
}
function drawList() {
  const l = $('#ilist'); if (!l) return;
  let shown = items.filter(x => filter === 'mind' || (filter === 'szavaz' ? x.public : filter === 'sajat' ? x.uid === C.uid() : filter === 'aktiv' ? ['nyitott', 'folyamatban'].includes(x.status) : x.status === filter));
  if (filter === 'szavaz') shown = shown.slice().sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0));
  l.innerHTML = shown.length ? shown.map(x => {
    const u = C.U(x.uid), [ic, cl] = CATS[x.category] || CATS.egyeb;
    const fresh = x.lastReplyBy && x.lastReplyBy !== C.uid() && (toDate(x.lastReplyAt)?.getTime() || 0) > seen(x.id);
    const vn = x.votes?.length || 0, iv = (x.votes || []).includes(C.uid());
    return `<a class="icard${fresh ? ' fresh' : ''}" href="#/otletek/${esc(x.id)}">${x.public ? `<button class="ivote${iv ? ' on' : ''}" data-vote="${esc(x.id)}" title="${iv ? 'Szavazat visszavonása' : 'Szavazok rá'}"><span><i class="ic ic-thumbs-up"></i></span><b>${vn}</b></button>` : ''}<span class="icat" title="${cl}">${ic}</span>
      <div class="ib"><div class="it"><b>${esc(x.title)}</b>${pill(x.status)}${fresh ? '<span class="inew">ÚJ VÁLASZ</span>' : ''}</div>
        <small>${staff() || x.uid !== C.uid() ? `${esc(u.name)} · ` : ''}${cl} · ${timeLabel(x.createdAt)}${x.public ? ' · <i class="ic ic-globe"></i> nyilvános' : ''}${x.replies ? ` · <i class="ic ic-message-circle"></i> ${x.replies} válasz` : ''}</small></div><span class="iarr">›</span></a>`;
  }).join('') : `<div class="empty"><div class="big"><i class="ic ic-lightbulb"></i></div>${filter === 'szavaz' ? 'Még nincs nyilvános ötlet. Az ötleteket beküldéskor nyilvánossá teheted, és a többiek szavazhatnak rájuk.' : items.length ? 'Ebben a nézetben nincs semmi.' : staff() ? 'Még senki nem küldött be semmit.' : 'Még nem küldtél be semmit. Itt az ideje!'}</div>`;
}
/* olvasottság (helyben) – hogy az új válaszok kiemelve látszódjanak */
const seen = id => { try { return +(JSON.parse(localStorage.getItem('hgws_ideas_seen') || '{}')[id] || 0); } catch (_) { return 0; } };
const markSeen = id => { try { const m = JSON.parse(localStorage.getItem('hgws_ideas_seen') || '{}'); m[id] = Date.now(); localStorage.setItem('hgws_ideas_seen', JSON.stringify(m)); } catch (_) {} };

function newIdea() {
  const el = modal({ title: 'Új beküldés', body: `
    <div class="field"><label>Típus</label><div class="icats">${Object.entries(CATS).map(([k, [i, l]], n) => `<label><input type="radio" name="cat" value="${k}" ${n ? '' : 'checked'}><span>${i} ${l}</span></label>`).join('')}</div></div>
    <div class="field"><label>Cím <em>(max. 100)</em></label><input class="inp" name="t" maxlength="100" placeholder="pl. Legyen sötét/világos mód"></div>
    <div class="field"><label>Részletek <em>(max. 2000)</em></label><textarea class="inp" name="x" rows="6" maxlength="2000" placeholder="Írd le minél pontosabban…"></textarea></div>
    <label class="chk"><input type="checkbox" name="pub" checked> <span><b>Nyilvános</b> – a többi tag is látja és szavazhat rá. <small class="hint">(hibánál, kérdésnél érdemes kikapcsolni)</small></span></label>`,
    foot: '<button class="btn plain" data-x>Mégse</button><button class="btn goldb" data-ok>Beküldés</button>' });
  setTimeout(() => el.querySelector('[name=t]').focus(), 50);
  el.querySelectorAll('[name=cat]').forEach(r => r.onchange = () => { el.querySelector('[name=pub]').checked = r.value === 'otlet' || r.value === 'egyeb'; });
  el.querySelector('[data-ok]').onclick = async e => {
    const title = el.querySelector('[name=t]').value.trim(), text = el.querySelector('[name=x]').value.trim(), category = el.querySelector('[name=cat]:checked').value;
    if (title.length < 3) return toast('Adj egy rövid címet (legalább 3 karakter).', true);
    e.target.disabled = true;
    try {
      const t = FB.serverTimestamp();
      const pub = el.querySelector('[name=pub]').checked;
      const ref = await FB.addDoc(FB.collection(db, 'ideas'), { uid: C.uid(), title, text, category, status: 'nyitott', replies: 0, public: pub, votes: [], createdAt: t, updatedAt: t });
      toast('Beküldve – köszönjük! ✓'); el.close(); location.hash = '#/otletek/' + ref.id;
      [...C.S.users.values()].filter(u => u.id !== C.uid() && (u.id === OWNER_UID || roleOf(u.role).perms?.tickets))
        .forEach(u => notify(u.id, 'idea', `Új ${CATS[category][1].toLowerCase()} érkezett ${C.S.me.name} tagtól: ${title}`, '#/otletek/' + ref.id));
    } catch (er) { toast(errText(er), true); e.target.disabled = false; }
  };
}

function detail(id) {
  const page = $('#page');
  page.innerHTML = `<div class="pg ideas"><a class="iback" href="#/otletek">‹ Vissza az ötletekhez</a><div id="idet"><div class="spin" style="margin:2rem auto"></div></div></div>`;
  let x = null, reps = [];
  const ref = FB.doc(db, 'ideas', id);
  const draw = () => {
    const box = $('#idet'); if (!box || !x) return;
    const u = C.U(x.uid), [ic, cl] = CATS[x.category] || CATS.egyeb, mine = x.uid === C.uid();
    document.title = x.title + ' · Ötletek · HGWS';
    box.innerHTML = `<div class="iorig"><div class="it"><span class="icat">${ic}</span><h1>${esc(x.title)}</h1>${pill(x.status)}</div>
      <div class="imeta">${avatar(u, 28)} <b>${esc(u.name)}</b>${C.roleBadge(u)} · ${cl} · ${timeLabel(x.createdAt)}${x.public ? ' · <i class="ic ic-globe"></i> nyilvános' : ' · <i class="ic ic-lock"></i> csak a csapat látja'}</div>
      ${x.public ? `<div class="ivrow"><button class="ivote big${(x.votes || []).includes(C.uid()) ? ' on' : ''}" data-vote="${esc(x.id)}"><span><i class="ic ic-thumbs-up"></i></span><b>${x.votes?.length || 0}</b></button><span class="hint">${(x.votes || []).length ? esc((x.votes || []).slice(0, 8).map(v => C.U(v).name).join(', ')) + ((x.votes || []).length > 8 ? '…' : '') + ' szavazott rá' : 'Még senki nem szavazott rá – légy te az első!'}</span></div>` : ''}
      ${x.text ? `<div class="itext">${esc(x.text)}</div>` : ''}
      ${staff() ? `<div class="istaff"><span>Állapot:</span>${Object.entries(STATUS).map(([k, [l, c]]) => `<button data-st="${k}" class="${x.status === k ? 'on' : ''}" style="--ic:${c}">${l}</button>`).join('')}
        <button class="ipub" data-pub>${x.public ? '<i class="ic ic-lock"></i> Elrejtés a tagok elől' : '<i class="ic ic-globe"></i> Nyilvánossá tétel'}</button><button class="idel" data-del><i class="ic ic-trash-2"></i> Törlés</button></div>` : mine ? '<div class="istaff"><button class="idel" data-del><i class="ic ic-trash-2"></i> Visszavonás</button></div>' : ''}</div>
      <h3 class="irh">Válaszok <span class="cnt">${reps.length}</span></h3>
      <div class="ireps">${reps.length ? reps.map(r => { const ru = C.U(r.uid), st = r.uid !== x.uid;
        return `<div class="irep${st ? ' staff' : ''}">${avatar(ru, 36)}<div><div class="irm"><b>${esc(ru.name)}</b>${C.roleBadge(ru)}<time>${timeLabel(r.createdAt)}</time>${staff() ? `<button class="idx" data-rdel="${esc(r.id)}" title="Törlés"><i class="ic ic-x"></i></button>` : ''}</div><div class="irt">${esc(r.text)}</div></div></div>`; }).join('')
        : `<p class="hint">${staff() ? 'Még nincs válasz – írj elsőként!' : 'Még nincs válasz. A HGWS csapata hamarosan ránéz. 🙂'}</p>`}</div>
      ${mine || staff() ? `<div class="irform"><textarea class="inp" rows="3" maxlength="2000" placeholder="${staff() && !mine ? 'Válasz a beküldőnek…' : 'Kiegészítés, válasz…'}"></textarea><div><button class="btn goldb sm" data-send>Küldés</button></div></div>` : ''}`;
    const ta = box.querySelector('.irform textarea');
    box.querySelector('[data-send]')?.addEventListener('click', async e => {
      const text = ta.value.trim(); if (!text) return;
      e.target.disabled = true;
      try {
        const bt = FB.writeBatch(db), t = FB.serverTimestamp();
        bt.set(FB.doc(FB.collection(db, 'ideas', id, 'replies')), { uid: C.uid(), text, createdAt: t });
        bt.update(ref, { replies: FB.increment(1), lastReplyAt: t, lastReplyBy: C.uid(), updatedAt: t,
          ...(staff() && !mine && x.status === 'nyitott' ? { status: 'folyamatban' } : {}) });
        await bt.commit(); ta.value = '';
        if (!mine) notify(x.uid, 'idea', `${C.S.me.name} válaszolt: ${x.title}`, '#/otletek/' + id);
        else if (x.lastReplyBy && x.lastReplyBy !== C.uid()) notify(x.lastReplyBy, 'idea', `${C.S.me.name} válaszolt: ${x.title}`, '#/otletek/' + id);
      } catch (er) { toast(errText(er), true); }
      e.target.disabled = false;
    });
    ta?.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) box.querySelector('[data-send]').click(); });
    $$('[data-st]', box).forEach(b => b.onclick = async () => {
      try { await FB.updateDoc(ref, { status: b.dataset.st, updatedAt: FB.serverTimestamp() }); toast('Állapot: ' + STATUS[b.dataset.st][0]);
        audit('idea.status', x.title, STATUS[b.dataset.st][0]); notify(x.uid, 'idea', `Az ötleted állapota: ${STATUS[b.dataset.st][0]} – ${x.title}`, '#/otletek/' + id); } catch (er) { toast(errText(er), true); }
    });
    box.querySelector('[data-pub]')?.addEventListener('click', async () => {
      try { await FB.updateDoc(ref, { public: !x.public, updatedAt: FB.serverTimestamp() }); toast(x.public ? 'Elrejtve' : 'Nyilvános – a tagok szavazhatnak rá'); } catch (er) { toast(errText(er), true); }
    });
    box.querySelector('[data-del]')?.addEventListener('click', async () => {
      if (!await confirmBox(`Törlöd ezt a beküldést: „${x.title}”?`, 'Törlés')) return;
      try { await FB.deleteDoc(ref); toast('Törölve'); location.hash = '#/otletek'; } catch (er) { toast(errText(er), true); }
    });
    box.querySelector('[data-vote]')?.addEventListener('click', () => vote(id, [x]));
    $$('[data-rdel]', box).forEach(b => b.onclick = async () => {
      if (!await confirmBox('Törlöd ezt a választ?', 'Törlés')) return;
      try { const bt = FB.writeBatch(db); bt.delete(FB.doc(db, 'ideas', id, 'replies', b.dataset.rdel)); bt.update(ref, { replies: FB.increment(-1), updatedAt: FB.serverTimestamp() }); await bt.commit(); } catch (er) { toast(errText(er), true); }
    });
    markSeen(id);
  };
  unsubs.push(FB.onSnapshot(ref, s => {
    if (!here()) return stop();
    if (!s.exists()) { $('#idet').innerHTML = '<div class="empty"><div class="big"><i class="ic ic-search"></i></div>Ez a beküldés nem található (lehet, hogy törölték).</div>'; return; }
    x = { id: s.id, ...s.data({ serverTimestamps: 'estimate' }) }; draw();
  }, e => { $('#idet').innerHTML = `<div class="empty"><div class="big"><i class="ic ic-lock"></i></div>${esc(errText(e))}</div>`; }));
  unsubs.push(FB.onSnapshot(FB.query(FB.collection(db, 'ideas', id, 'replies'), FB.orderBy('createdAt')), s => {
    if (!here()) return stop();
    reps = s.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })); draw();
  }, () => {}));
}
