// HGWS – Ötletek (ticket rendszer): a belépett tagok ötletet, hibát, kérdést küldhetnek,
// a moderátortól felfelé (akinek „tickets” joga van) mindenki látja és válaszolhat rájuk.
import { FB, db, $, $$, esc, avatar, timeLabel, toDate, toast, errText } from './core.js?v=202611170008';
import { modal, confirmBox } from './ui.js?v=202611170008';

let C = null;
export function init(ctx) { C = ctx; }

export const CATS = { otlet: ['💡', 'Ötlet'], hiba: ['🐞', 'Hiba'], kerdes: ['❓', 'Kérdés'], egyeb: ['💬', 'Egyéb'] };
export const STATUS = {
  nyitott: ['Nyitott', '#6cc6ff'], folyamatban: ['Folyamatban', '#ffa94d'], kesz: ['Kész', '#5ee08a'], elutasitva: ['Elutasítva', '#ff7a6e']
};
const pill = s => { const [l, c] = STATUS[s] || STATUS.nyitott; return `<span class="ipill" style="--ic:${c}">${l}</span>`; };
const staff = () => C.can('tickets');
const here = () => location.hash.startsWith('#/otletek');

let unsubs = [], filter = 'aktiv', items = [], loaded = false;
function stop() { unsubs.forEach(u => u()); unsubs = []; }

export function render(id) {
  stop();
  if (id) return detail(id);
  document.title = 'Ötletek · HGWS';
  const page = $('#page');
  page.innerHTML = `<div class="pg ideas"><div class="ihead"><div><div class="eyebrow">// HGWS KÖZÖSSÉG</div><h1 class="gold">Ötletek és visszajelzések</h1>
    <p class="lead">${staff() ? 'Az összes beküldött ötlet, hibajelzés és kérdés. Válaszolj rájuk, és állítsd az állapotukat.' : 'Van egy ötleted, hibát találtál, vagy kérdésed van? Küldd be – a HGWS csapata (moderátoroktól felfelé) válaszol rá.'}</p></div>
    <button class="btn goldb" id="newIdea">＋ ÚJ BEKÜLDÉS</button></div>
    <div class="ifilt">${[['aktiv', 'Aktív'], ['mind', 'Mind'], ...Object.entries(STATUS).map(([k, [l]]) => [k, l])].map(([k, l]) => `<button data-f="${k}" class="${filter === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div id="ilist"><div class="spin" style="margin:2rem auto"></div></div></div>`;
  $('#newIdea').onclick = newIdea;
  $('.ifilt').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; filter = b.dataset.f; $$('.ifilt button').forEach(x => x.classList.toggle('on', x === b)); drawList(); };
  const col = FB.collection(db, 'ideas');
  const q = staff() ? FB.query(col, FB.orderBy('updatedAt', 'desc'), FB.limit(300)) : FB.query(col, FB.where('uid', '==', C.uid()));
  unsubs.push(FB.onSnapshot(q, s => {
    if (!here()) return stop();
    items = s.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })).sort((a, b) => (toDate(b.updatedAt)?.getTime() || 0) - (toDate(a.updatedAt)?.getTime() || 0));
    loaded = true; drawList();
  }, e => { const l = $('#ilist'); if (l) l.innerHTML = `<p class="hint">${esc(errText(e))}</p>`; }));
}

function drawList() {
  const l = $('#ilist'); if (!l) return;
  const shown = items.filter(x => filter === 'mind' || (filter === 'aktiv' ? ['nyitott', 'folyamatban'].includes(x.status) : x.status === filter));
  l.innerHTML = shown.length ? shown.map(x => {
    const u = C.U(x.uid), [ic, cl] = CATS[x.category] || CATS.egyeb;
    const fresh = x.lastReplyBy && x.lastReplyBy !== C.uid() && (toDate(x.lastReplyAt)?.getTime() || 0) > seen(x.id);
    return `<a class="icard${fresh ? ' fresh' : ''}" href="#/otletek/${esc(x.id)}"><span class="icat" title="${cl}">${ic}</span>
      <div class="ib"><div class="it"><b>${esc(x.title)}</b>${pill(x.status)}${fresh ? '<span class="inew">ÚJ VÁLASZ</span>' : ''}</div>
        <small>${staff() ? `${esc(u.name)} · ` : ''}${cl} · ${timeLabel(x.createdAt)}${x.replies ? ` · 💬 ${x.replies} válasz` : ''}</small></div><span class="iarr">›</span></a>`;
  }).join('') : `<div class="empty"><div class="big">💡</div>${items.length ? 'Ebben a nézetben nincs semmi.' : staff() ? 'Még senki nem küldött be semmit.' : 'Még nem küldtél be semmit. Itt az ideje!'}</div>`;
}
/* olvasottság (helyben) – hogy az új válaszok kiemelve látszódjanak */
const seen = id => { try { return +(JSON.parse(localStorage.getItem('hgws_ideas_seen') || '{}')[id] || 0); } catch (_) { return 0; } };
const markSeen = id => { try { const m = JSON.parse(localStorage.getItem('hgws_ideas_seen') || '{}'); m[id] = Date.now(); localStorage.setItem('hgws_ideas_seen', JSON.stringify(m)); } catch (_) {} };

function newIdea() {
  const el = modal({ title: 'Új beküldés', body: `
    <div class="field"><label>Típus</label><div class="icats">${Object.entries(CATS).map(([k, [i, l]], n) => `<label><input type="radio" name="cat" value="${k}" ${n ? '' : 'checked'}><span>${i} ${l}</span></label>`).join('')}</div></div>
    <div class="field"><label>Cím <em>(max. 100)</em></label><input class="inp" name="t" maxlength="100" placeholder="pl. Legyen sötét/világos mód"></div>
    <div class="field"><label>Részletek <em>(max. 2000)</em></label><textarea class="inp" name="x" rows="6" maxlength="2000" placeholder="Írd le minél pontosabban…"></textarea></div>`,
    foot: '<button class="btn plain" data-x>Mégse</button><button class="btn goldb" data-ok>Beküldés</button>' });
  setTimeout(() => el.querySelector('[name=t]').focus(), 50);
  el.querySelector('[data-ok]').onclick = async e => {
    const title = el.querySelector('[name=t]').value.trim(), text = el.querySelector('[name=x]').value.trim(), category = el.querySelector('[name=cat]:checked').value;
    if (title.length < 3) return toast('Adj egy rövid címet (legalább 3 karakter).', true);
    e.target.disabled = true;
    try {
      const t = FB.serverTimestamp();
      const ref = await FB.addDoc(FB.collection(db, 'ideas'), { uid: C.uid(), title, text, category, status: 'nyitott', replies: 0, createdAt: t, updatedAt: t });
      toast('Beküldve – köszönjük! ✓'); el.close(); location.hash = '#/otletek/' + ref.id;
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
      <div class="imeta">${avatar(u, 28)} <b>${esc(u.name)}</b>${C.roleBadge(u)} · ${cl} · ${timeLabel(x.createdAt)}</div>
      ${x.text ? `<div class="itext">${esc(x.text)}</div>` : ''}
      ${staff() ? `<div class="istaff"><span>Állapot:</span>${Object.entries(STATUS).map(([k, [l, c]]) => `<button data-st="${k}" class="${x.status === k ? 'on' : ''}" style="--ic:${c}">${l}</button>`).join('')}
        <button class="idel" data-del>🗑️ Törlés</button></div>` : mine ? '<div class="istaff"><button class="idel" data-del>🗑️ Visszavonás</button></div>' : ''}</div>
      <h3 class="irh">Válaszok <span class="cnt">${reps.length}</span></h3>
      <div class="ireps">${reps.length ? reps.map(r => { const ru = C.U(r.uid), st = r.uid !== x.uid;
        return `<div class="irep${st ? ' staff' : ''}">${avatar(ru, 36)}<div><div class="irm"><b>${esc(ru.name)}</b>${C.roleBadge(ru)}<time>${timeLabel(r.createdAt)}</time>${staff() ? `<button class="idx" data-rdel="${esc(r.id)}" title="Törlés">✕</button>` : ''}</div><div class="irt">${esc(r.text)}</div></div></div>`; }).join('')
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
      } catch (er) { toast(errText(er), true); }
      e.target.disabled = false;
    });
    ta?.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) box.querySelector('[data-send]').click(); });
    $$('[data-st]', box).forEach(b => b.onclick = async () => {
      try { await FB.updateDoc(ref, { status: b.dataset.st, updatedAt: FB.serverTimestamp() }); toast('Állapot: ' + STATUS[b.dataset.st][0]); } catch (er) { toast(errText(er), true); }
    });
    box.querySelector('[data-del]')?.addEventListener('click', async () => {
      if (!await confirmBox(`Törlöd ezt a beküldést: „${x.title}”?`, 'Törlés')) return;
      try { await FB.deleteDoc(ref); toast('Törölve'); location.hash = '#/otletek'; } catch (er) { toast(errText(er), true); }
    });
    $$('[data-rdel]', box).forEach(b => b.onclick = async () => {
      if (!await confirmBox('Törlöd ezt a választ?', 'Törlés')) return;
      try { const bt = FB.writeBatch(db); bt.delete(FB.doc(db, 'ideas', id, 'replies', b.dataset.rdel)); bt.update(ref, { replies: FB.increment(-1), updatedAt: FB.serverTimestamp() }); await bt.commit(); } catch (er) { toast(errText(er), true); }
    });
    markSeen(id);
  };
  unsubs.push(FB.onSnapshot(ref, s => {
    if (!here()) return stop();
    if (!s.exists()) { $('#idet').innerHTML = '<div class="empty"><div class="big">🔍</div>Ez a beküldés nem található (lehet, hogy törölték).</div>'; return; }
    x = { id: s.id, ...s.data({ serverTimestamps: 'estimate' }) }; draw();
  }, e => { $('#idet').innerHTML = `<div class="empty"><div class="big">🔒</div>${esc(errText(e))}</div>`; }));
  unsubs.push(FB.onSnapshot(FB.query(FB.collection(db, 'ideas', id, 'replies'), FB.orderBy('createdAt')), s => {
    if (!here()) return stop();
    reps = s.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })); draw();
  }, () => {}));
}
