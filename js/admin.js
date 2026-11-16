// HGWS – admin és moderátor felület: tagok, szerepkörök, filmek, csatornák
import { FB, db, $, $$, esc, ROLES, avatar, toDate, timeLabel, isOnline, ytId, toast, errText, reservedName, RESERVED_MSG } from './core.js?v=202611161949';
import { modal, confirmBox, compress, STAGES } from './ui.js?v=202611161949';
import { githubRepo } from '../firebase-config.js?v=202611161949';

let C = null, current = null;
export function init(ctx) { C = ctx; }
export function refresh() { if (current && C.S.route.view === 'admin') render(current, true); }

export function render(sub, again) {
  current = sub;
  const v = $('#page');
  if (sub === 'tagok' && C.isMod()) return members(v, again);
  if (sub === 'filmek' && C.isAdmin()) return films(v, again);
  if (sub === 'csatornak' && C.isAdmin()) return channels(v, again);
  if (sub === 'zene' && C.isAdmin()) return music(v, again);
  C.setTitle('🔒', 'Nincs jogosultság');
  v.innerHTML = '<div class="full"><div><div class="big">🔒</div><h2>Ehhez nincs jogosultságod</h2></div></div>';
}

function tabs() {
  const t = [['tagok', '🛡️ Tagok és jogok', C.isMod()], ['filmek', '🎞️ Filmek', C.isAdmin()], ['zene', '🎵 Zenék', C.isAdmin()], ['csatornak', '⚙️ Csatornák', C.isAdmin()]].filter(x => x[2]);
  return `<div class="atabs" style="margin:.6rem 0 1rem">${t.map(([k, l]) => `<a href="#/admin/${k}" class="${current === k ? 'on' : ''}">${l}</a>`).join('')}</div>`;
}

/* ================= TAGOK ================= */
let mq = '';
function members(v, again) {
  C.setTitle('🛡️', 'Tagok és jogok', C.isAdmin() ? 'Szerepkörök, némítás, kitiltás' : 'Moderálás');
  const me = C.uid(), list = [...C.S.users.values()].filter(u => !mq || u.name.toLowerCase().includes(mq))
    .sort((a, b) => (ROLES[b.role]?.rank || 0) - (ROLES[a.role]?.rank || 0) || a.name.localeCompare(b.name, 'hu'));
  const focus = again && document.activeElement?.id === 'aq';
  v.innerHTML = `<div class="page"><div class="eyebrow">// KEZELÉS</div>${tabs()}<h1 class="gold">Tagok és jogok</h1>
    <p class="lead">${C.isAdmin() ? '<b style="color:var(--gold2)">Admin</b>: mindent kezel (filmek, csatornák, jogok). <b style="color:var(--water)">Moderátor</b>: üzeneteket töröl, tagokat némít vagy kitilt. <b>Tag</b>: csevegés és filmnézés.' : 'Moderátorként sima tagokat némíthatsz vagy tilthatsz ki, és bármelyik csatornán törölhetsz üzenetet.'}</p>
    <div class="search" style="margin:1.2rem 0 0;max-width:380px"><input type="search" id="aq" placeholder="Keresés név szerint…" value="${esc(mq)}"></div>
    <div class="atable">${list.map(u => {
      const muted = toDate(u.mutedUntil) > new Date(), self = u.id === me;
      const canMod = !self && (C.isAdmin() || (u.role || 'user') === 'user');
      return `<div class="arow"><span class="avw">${avatar(u, 42)}<i class="on${isOnline(u) ? ' y' : ''}" style="border-color:#0d1830"></i></span>
        <div class="who"><b data-u="${esc(u.id)}" style="cursor:pointer;color:${u.role && u.role !== 'user' ? ROLES[u.role].color : 'inherit'}">${esc(u.name)}</b>${self ? ' <span class="hint">(te)</span>' : ''}
          <small>${u.createdAt ? 'Tag ' + toDate(u.createdAt).toLocaleDateString('hu-HU') + ' óta' : ''}${u.lastSeen ? ' · ' + (isOnline(u) ? '🟢 online' : 'utoljára ' + timeLabel(u.lastSeen)) : ''}</small>
          <div>${u.banned ? '<span class="tg red">⛔ KITILTVA</span>' : ''}${muted ? `<span class="tg red">🔇 NÉMÍTVA ${esc(timeLabel(u.mutedUntil))}-IG</span>` : ''}</div></div>
        <div class="ac">
          ${C.isAdmin() ? `<select data-role="${esc(u.id)}" ${self ? 'disabled title="A saját jogodat nem veheted el"' : ''}>${Object.entries(ROLES).map(([k, r]) => `<option value="${k}" ${(u.role || 'user') === k ? 'selected' : ''}>${r.label}</option>`).join('')}</select>`
            : `<span class="tg ${u.role === 'admin' ? 'g' : u.role === 'moderator' ? 'b' : ''}">${ROLES[u.role || 'user'].label.toUpperCase()}</span>`}
          ${canMod ? `<button class="btn plain sm" data-mod="${esc(u.id)}">🛡️ Moderálás</button>` : ''}
        </div></div>`;
    }).join('')}</div></div>`;
  const q = $('#aq'); q.oninput = () => { mq = q.value.toLowerCase(); members(v, true); };
  if (focus) { const n = $('#aq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
  $$('[data-role]', v).forEach(s => s.onchange = async () => {
    const u = C.U(s.dataset.role), r = s.value;
    if (!await confirmBox(`${u.name} szerepköre: ${ROLES[r].label}?`, 'Mentés', false)) { s.value = u.role || 'user'; return; }
    try { await FB.updateDoc(FB.doc(db, 'users', u.id), { role: r }); toast('Szerepkör frissítve ✓'); } catch (e) { toast(errText(e), true); s.value = u.role || 'user'; }
  });
  $$('[data-mod]', v).forEach(b => b.onclick = () => modModal(b.dataset.mod));
}

export function modModal(id) {
  const u = C.U(id), muted = toDate(u.mutedUntil) > new Date();
  const el = modal({ title: 'Moderálás – ' + u.name, body: `
    <div style="display:flex;align-items:center;gap:.9rem">${avatar(u, 52)}<div><b style="font-size:1.05rem">${esc(u.name)}</b><div class="hint">${ROLES[u.role || 'user'].label}${u.banned ? ' · ⛔ kitiltva' : ''}${muted ? ' · 🔇 némítva ' + timeLabel(u.mutedUntil) + '-ig' : ''}</div></div></div>
    ${C.isAdmin() ? `<div class="field"><label>Megjelenített név <em>(csak admin)</em></label><div style="display:flex;gap:.5rem;flex-wrap:wrap"><input class="inp" name="nm" maxlength="32" value="${esc(u.name)}" style="flex:1;min-width:180px"><button class="btn plain sm" data-rn>Mentés</button><button class="btn danger sm" data-rst title="A nevet egy semleges „Tag-…” névre cseréli">Név törlése</button></div></div>` : ''}
    <div class="field"><label>Némítás <em>(nem írhat sehova, de olvashat)</em></label><div style="display:flex;gap:.4rem;flex-wrap:wrap">
      ${[['10 perc', 10], ['1 óra', 60], ['1 nap', 1440], ['1 hét', 10080]].map(([l, m]) => `<button class="btn plain sm" data-mute="${m}">${l}</button>`).join('')}
      ${muted ? '<button class="btn primary sm" data-mute="0">Némítás feloldása</button>' : ''}</div></div>
    <div class="field"><label>Kitiltás <em>(semmit nem lát a közösségből)</em></label><div>
      ${u.banned ? '<button class="btn primary sm" data-ban="0">Kitiltás feloldása</button>' : '<button class="btn danger sm" data-ban="1">⛔ Kitiltás</button>'}</div></div>`,
    foot: '<button class="btn plain" data-x>Bezárás</button>' });
  const ref = FB.doc(db, 'users', id);
  const setName = async name => {
    name = name.trim();
    if (name.length < 2) return toast('A név legalább 2 karakter legyen.', true);
    if (reservedName(name) && C.S.owner?.uid !== id) return toast(RESERVED_MSG, true);
    try { await FB.updateDoc(ref, { name, nameLower: name.toLowerCase() }); toast('Név módosítva ✓'); el.close(); } catch (e) { toast(errText(e), true); }
  };
  const rn = el.querySelector('[data-rn]'); if (rn) rn.onclick = () => setName(el.querySelector('[name=nm]').value);
  const rst = el.querySelector('[data-rst]'); if (rst) rst.onclick = () => setName('Tag-' + id.slice(0, 5));
  $$('[data-mute]', el).forEach(b => b.onclick = async () => {
    const m = +b.dataset.mute;
    try { await FB.updateDoc(ref, { mutedUntil: m ? FB.Timestamp.fromDate(new Date(Date.now() + m * 60e3)) : null }); toast(m ? 'Némítva 🔇' : 'Némítás feloldva'); el.close(); } catch (e) { toast(errText(e), true); }
  });
  $$('[data-ban]', el).forEach(b => b.onclick = async () => {
    const on = b.dataset.ban === '1';
    if (on && !await confirmBox(`Kitiltod ${u.name} felhasználót a közösségből?`, 'Kitiltás')) return;
    try { await FB.updateDoc(ref, { banned: on }); toast(on ? 'Kitiltva ⛔' : 'Kitiltás feloldva'); el.close(); } catch (e) { toast(errText(e), true); }
  });
}

/* ================= CSATORNÁK ================= */
export async function defaultChannels() {
  const b = FB.writeBatch(db), t = FB.serverTimestamp();
  [['bejelentesek', 'bejelentések', 'Információ', 'announce', 'Hírek, premierek, fontos dolgok a HGWS-től.'],
   ['altalanos', 'általános', 'Beszélgetés', 'text', 'Itt mindenről lehet dumálni.'],
   ['filmek', 'filmek', 'Beszélgetés', 'text', 'Oszd meg és beszéljétek meg a HGWS filmeket! 🎬'],
   ['off-topic', 'off-topic', 'Beszélgetés', 'text', 'Minden más.']]
    .forEach(([id, name, category, type, topic], i) => b.set(FB.doc(db, 'channels', id), { name, category, type, topic, order: i * 10, createdAt: t }));
  await b.commit();
}

function channels(v) {
  C.setTitle('⚙️', 'Csatornák kezelése');
  const list = C.S.channels;
  v.innerHTML = `<div class="page"><div class="eyebrow">// KEZELÉS</div>${tabs()}<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap"><div><h1 class="gold">Csatornák</h1>
    <p class="lead">A „Bejelentés” típusú csatornára csak adminok és moderátorok írhatnak.</p></div><button class="btn goldb" id="nc">+ ÚJ CSATORNA</button></div>
    ${list.length ? `<div class="atable">${list.map((c, i) => `<div class="arow"><div class="ord"><button data-up="${i}" ${i ? '' : 'disabled'}>▲</button><button data-dn="${i}" ${i < list.length - 1 ? '' : 'disabled'}>▼</button></div>
      <div class="who"><b>${c.type === 'announce' ? '📢' : '#'} ${esc(c.name)}</b><small>${esc(c.category || '')}${c.topic ? ' · ' + esc(c.topic) : ''}</small></div>
      <div class="ac"><button class="btn plain sm" data-ed="${esc(c.id)}">Szerkesztés</button></div></div>`).join('')}</div>`
    : `<div class="empty"><div class="big">#</div>Még nincs csatorna.<br><button class="btn primary" id="def">ALAP CSATORNÁK LÉTREHOZÁSA</button></div>`}</div>`;
  $('#nc').onclick = () => channelModal();
  const d = $('#def'); if (d) d.onclick = () => defaultChannels().then(() => toast('Kész ✓')).catch(e => toast(errText(e), true));
  $$('[data-ed]', v).forEach(b => b.onclick = () => channelModal(list.find(c => c.id === b.dataset.ed)));
  $$('[data-up],[data-dn]', v).forEach(b => b.onclick = () => reorder('channels', list, +(b.dataset.up ?? b.dataset.dn), b.dataset.up != null ? -1 : 1));
}

async function reorder(col, list, i, dir) {
  const arr = [...list], j = i + dir; [arr[i], arr[j]] = [arr[j], arr[i]];
  const b = FB.writeBatch(db); arr.forEach((x, k) => { if (x.order !== k * 10) b.update(FB.doc(db, col, x.id), { order: k * 10 }); });
  try { await b.commit(); } catch (e) { toast(errText(e), true); }
}

export function channelModal(c) {
  const cats = [...new Set(C.S.channels.map(x => x.category).filter(Boolean))];
  const el = modal({ title: c ? 'Csatorna szerkesztése' : 'Új csatorna', body: `
    <div class="field"><label>Név</label><input class="inp" name="name" maxlength="40" value="${esc(c?.name || '')}" placeholder="pl. mémek"></div>
    <div class="field"><label>Téma <em>(a fejlécben látszik)</em></label><input class="inp" name="topic" maxlength="200" value="${esc(c?.topic || '')}"></div>
    <div class="grid2"><div class="field"><label>Kategória</label><input class="inp" name="cat" list="cats" maxlength="40" value="${esc(c?.category || 'Beszélgetés')}"><datalist id="cats">${cats.map(x => `<option>${esc(x)}</option>`).join('')}</datalist></div>
    <div class="field"><label>Típus</label><select class="inp" name="type"><option value="text">💬 Szöveges – mindenki írhat</option><option value="announce" ${c?.type === 'announce' ? 'selected' : ''}>📢 Bejelentés – csak admin/moderátor</option></select></div></div>`,
    foot: `${c ? '<button class="btn danger l" data-del>Törlés</button>' : ''}<button class="btn plain" data-x>Mégse</button><button class="btn goldb" data-ok>Mentés</button>` });
  el.querySelector('[data-ok]').onclick = async () => {
    const name = el.querySelector('[name=name]').value.trim().toLowerCase().replace(/\s+/g, '-');
    if (!name) return toast('Adj nevet a csatornának.', true);
    const data = { name, topic: el.querySelector('[name=topic]').value.trim(), category: el.querySelector('[name=cat]').value.trim() || 'Beszélgetés', type: el.querySelector('[name=type]').value };
    try {
      if (c) await FB.updateDoc(FB.doc(db, 'channels', c.id), data);
      else { const ref = FB.doc(FB.collection(db, 'channels')); await FB.setDoc(ref, { ...data, order: (Math.max(0, ...C.S.channels.map(x => x.order || 0)) + 10), createdAt: FB.serverTimestamp() }); location.hash = '#/c/' + ref.id; }
      toast('Mentve ✓'); el.close();
    } catch (e) { toast(errText(e), true); }
  };
  const d = el.querySelector('[data-del]'); if (d) d.onclick = async () => {
    if (!await confirmBox(`Törlöd a #${c.name} csatornát? (A régi üzenetek nem fognak látszani.)`, 'Törlés')) return;
    try { await FB.deleteDoc(FB.doc(db, 'channels', c.id)); toast('Törölve'); el.close(); if (location.hash === '#/c/' + c.id) location.hash = '#/'; } catch (e) { toast(errText(e), true); }
  };
}

/* ================= FILMEK ================= */
function films(v) {
  C.setTitle('🎞️', 'Filmek kezelése', 'Ami itt szerepel, az látszik a filmtárban és a főoldalon');
  const list = C.S.videos;
  v.innerHTML = `<div class="page"><div class="eyebrow">// KEZELÉS</div>${tabs()}<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap"><div><h1 class="gold">Filmek</h1>
    <p class="lead">A YouTube-linket a „Megjelent” bepipálása után mindenki látja, aki be van lépve. A főoldal csak a címet, a posztert és az állapotot mutatja.</p></div><button class="btn goldb" id="nf">+ ÚJ FILM</button></div>
    ${list.length ? `<div class="atable">${list.map((x, i) => `<div class="arow" style="grid-template-columns:auto auto 1fr auto"><div class="ord"><button data-up="${i}" ${i ? '' : 'disabled'}>▲</button><button data-dn="${i}" ${i < list.length - 1 ? '' : 'disabled'}>▼</button></div>
      <div class="fthumb">${x.poster ? `<img src="${esc(x.poster)}" alt="" loading="lazy">` : ''}</div>
      <div class="who"><b>${esc(x.title)}</b><small>${esc([x.kind, x.year, x.genre].filter(Boolean).join(' · '))}</small>
        <div>${x.featured ? '<span class="tg g">★ KIEMELT</span>' : ''}${x.soon === false ? '<span class="tg ok">MEGJELENT</span>' : `<span class="tg b">${esc((x.status || STAGES[x.stage ?? 0]).toUpperCase())}</span>`}${x.hasVideo ? '<span class="tg">▶ VIDEÓ</span>' : ''}${x.visible === false ? '<span class="tg">REJTETT</span>' : ''}</div></div>
      <div class="ac"><button class="btn plain sm" data-ed="${esc(x.id)}">Szerkesztés</button></div></div>`).join('')}</div>`
    : `<div class="empty"><div class="big">🎬</div>Még nincs film.<br><button class="btn primary" id="imp">A KORÁBBI FŐOLDALI CÍMEK ÁTHOZÁSA</button></div>`}</div>`;
  $('#nf').onclick = () => filmModal();
  const imp = $('#imp'); if (imp) imp.onclick = () => importFilms(imp);
  $$('[data-ed]', v).forEach(b => b.onclick = () => filmModal(list.find(x => x.id === b.dataset.ed)));
  $$('[data-up],[data-dn]', v).forEach(b => b.onclick = () => reorder('videos', list, +(b.dataset.up ?? b.dataset.dn), b.dataset.up != null ? -1 : 1));
}

const slug = s => (s || 'film').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'film';

async function filmModal(f) {
  let src = {};
  if (f) { try { src = (await FB.getDoc(FB.doc(db, 'videoSources', f.id))).data() || {}; } catch (_) {} }
  const d = f || { kind: 'Film', year: String(new Date().getFullYear()), soon: true, stage: 0, visible: true };
  let stage = d.stage ?? 0; const imgs = { poster: d.poster || '', banner: d.banner || '' };
  const el = modal({ title: f ? 'Film szerkesztése' : 'Új film', cls: 'wide', body: `
    <div class="grid2"><div class="field"><label>Cím *</label><input class="inp" name="title" maxlength="140" value="${esc(d.title || '')}"></div>
      <div class="field"><label>Alcím <em>(pl. angol cím)</em></label><input class="inp" name="en" maxlength="160" value="${esc(d.en || '')}"></div></div>
    <div class="grid2"><div class="field"><label>Típus</label><input class="inp" name="kind" list="kinds" value="${esc(d.kind || '')}"><datalist id="kinds"><option>Film</option><option>Anime</option><option>Sorozat</option><option>Trailer</option><option>Kisfilm</option><option>Játék</option></datalist></div>
      <div class="field"><label>Év · Hossz</label><div style="display:flex;gap:.5rem"><input class="inp" name="year" maxlength="10" value="${esc(d.year || '')}" placeholder="2026"><input class="inp" name="len" maxlength="30" value="${esc(d.len || '')}" placeholder="6 perc"></div></div></div>
    <div class="grid2"><div class="field"><label>Műfaj</label><input class="inp" name="genre" maxlength="80" value="${esc(d.genre || '')}" placeholder="Akció · Vígjáték"></div>
      <div class="field"><label>Premier dátuma <em>(nem kötelező)</em></label><input class="inp" type="date" name="premiere" value="${esc(d.premiere || '')}"></div></div>
    <div class="field"><label>Leírás</label><textarea class="inp" name="desc" rows="4" maxlength="1500">${esc(d.desc || '')}</textarea></div>
    <div class="field"><label>YouTube link <em>(a lejátszó a saját HGWS-felülettel játssza le)</em></label><input class="inp" name="yt" value="${esc(src.youtube ? 'https://youtu.be/' + src.youtube : '')}" placeholder="https://youtu.be/…  vagy  https://www.youtube.com/watch?v=…"><span class="hint" id="ytok"></span></div>
    <div class="field"><label>…vagy MP4 videó URL</label><input class="inp" name="mp4" value="${esc(src.mp4 || '')}" placeholder="videok/film.mp4"></div>
    <div class="field"><label>Gyártási fázis</label><div class="stagepick" id="sp"></div></div>
    <div class="grid2"><div class="field"><label>Állapot felirat</label><input class="inp" name="status" maxlength="40" value="${esc(d.status || STAGES[stage].toUpperCase())}"></div><div></div></div>
    <div class="checks"><label class="chk"><input type="checkbox" name="rel" ${d.soon === false ? 'checked' : ''}> Megjelent – megnézhető</label>
      <label class="chk"><input type="checkbox" name="feat" ${d.featured ? 'checked' : ''}> Kiemelt (nagy kártya a főoldalon)</label>
      <label class="chk"><input type="checkbox" name="vis" ${d.visible !== false ? 'checked' : ''}> Látható</label></div>
    ${['poster', 'banner'].map(k => `<div class="field"><label>${k === 'poster' ? 'Poszter <em>(16:9)</em>' : 'Kiemelt háttérkép <em>(ha üres, a poszter)</em>'}</label><div class="imgp" data-img="${k}"><div class="prev">nincs kép</div>
      <div class="c"><div class="r"><label class="btn plain sm">Kép feltöltése<input type="file" accept="image/*" hidden></label><button type="button" class="btn danger sm" data-clr>Törlés</button></div>
      <input class="inp" type="url" data-url placeholder="…vagy kép URL-je"><span class="hint" data-info></span></div></div></div>`).join('')}`,
    foot: `${f ? '<button class="btn danger l" data-del>Törlés</button>' : ''}<button class="btn plain" data-x>Mégse</button><button class="btn goldb" data-ok>Mentés</button>` });
  const q = n => el.querySelector(`[name=${n}]`);
  const paint = () => { el.querySelector('#sp').innerHTML = STAGES.map((s, i) => `<button type="button" data-st="${i}" class="${i < stage ? 'done' : i === stage ? 'now' : ''}">${i < stage ? '✓ ' : i === stage ? '● ' : ''}${s.toUpperCase()}</button>`).join(''); };
  paint();
  el.querySelector('#sp').onclick = e => { const b = e.target.closest('[data-st]'); if (!b) return; const prev = STAGES[stage].toUpperCase(); stage = +b.dataset.st; paint(); if (!q('status').value || q('status').value === prev) q('status').value = STAGES[stage].toUpperCase(); };
  const ytChk = () => { const v = q('yt').value.trim(), id = ytId(v); el.querySelector('#ytok').textContent = !v ? '' : id ? '✅ YouTube videó: ' + id : '⚠️ Ez nem tűnik YouTube-linknek'; };
  q('yt').oninput = ytChk; ytChk();
  const setImg = (k, s) => { imgs[k] = s || ''; const b = el.querySelector(`[data-img=${k}]`), p = b.querySelector('.prev');
    p.style.backgroundImage = s ? `url("${s.replace(/"/g, '%22')}")` : ''; p.textContent = s ? '' : 'nincs kép';
    b.querySelector('[data-url]').value = s && !s.startsWith('data:') ? s : '';
    b.querySelector('[data-info]').textContent = s && s.startsWith('data:') ? `Feltöltött kép · ${Math.round(s.length * .75 / 1024)} KB` : ''; };
  ['poster', 'banner'].forEach(k => { setImg(k, imgs[k]); const b = el.querySelector(`[data-img=${k}]`);
    b.querySelector('input[type=file]').onchange = async e => { const fl = e.target.files[0]; e.target.value = ''; if (!fl) return; try { setImg(k, await compress(fl, k === 'banner' ? 1920 : 1280)); } catch (_) { toast('A képet nem sikerült beolvasni.', true); } };
    b.querySelector('[data-url]').onchange = e => setImg(k, e.target.value.trim());
    b.querySelector('[data-clr]').onclick = () => setImg(k, ''); });
  el.querySelector('[data-ok]').onclick = async () => {
    const title = q('title').value.trim(); if (!title) return toast('Add meg a címet.', true);
    const ytRaw = q('yt').value.trim(), yt = ytId(ytRaw);
    if (ytRaw && !yt) return toast('A YouTube-link nem érvényes.', true);
    const mp4 = q('mp4').value.trim();
    const data = { title, en: q('en').value.trim(), kind: q('kind').value.trim() || 'Film', year: q('year').value.trim(), len: q('len').value.trim(),
      genre: q('genre').value.trim(), premiere: q('premiere').value, desc: q('desc').value.trim(), status: q('status').value.trim().toUpperCase(), stage,
      soon: !q('rel').checked, featured: q('feat').checked, visible: q('vis').checked, hasVideo: !!(yt || mp4), poster: imgs.poster, banner: imgs.banner, updatedAt: FB.serverTimestamp() };
    const id = f ? f.id : (() => { let b = slug(title), s = b, n = 2; while (C.S.videos.some(x => x.id === s)) s = b + '-' + n++; return s; })();
    if (!f) { data.order = Math.max(-10, ...C.S.videos.map(x => x.order || 0)) + 10; data.createdAt = FB.serverTimestamp(); }
    try {
      const b = FB.writeBatch(db);
      b.set(FB.doc(db, 'videos', id), data, { merge: true });
      b.set(FB.doc(db, 'videoSources', id), { youtube: yt, mp4 });
      if (data.featured) C.S.videos.filter(x => x.featured && x.id !== id).forEach(x => b.update(FB.doc(db, 'videos', x.id), { featured: false }));
      await b.commit(); toast('Mentve ✓'); el.close();
    } catch (e) { toast(errText(e), true); }
  };
  const del = el.querySelector('[data-del]'); if (del) del.onclick = async () => {
    if (!await confirmBox(`Törlöd: „${f.title}”?`, 'Törlés')) return;
    try { const b = FB.writeBatch(db); b.delete(FB.doc(db, 'videos', f.id)); b.delete(FB.doc(db, 'videoSources', f.id)); await b.commit(); toast('Törölve'); el.close(); } catch (e) { toast(errText(e), true); }
  };
}

async function importFilms(btn) {
  btn.disabled = true;
  try {
    const seed = await (await fetch('./seed-films.json', { cache: 'no-store' })).json();
    const list = seed.films || [], banner = seed.banner || '';
    if (!list.length) throw new Error('Nincs áthozható cím.');
    const b = FB.writeBatch(db), t = FB.serverTimestamp();
    list.forEach((x, i) => {
      const id = x.id || slug(x.title);
      b.set(FB.doc(db, 'videos', id), { title: x.title || '', en: x.en || '', kind: x.kind || 'Film', year: x.year || '', len: x.len || '', genre: x.genre || '',
        premiere: '', desc: x.desc || '', status: x.status || '', stage: x.stage ?? 0, order: i * 10, soon: x.soon !== false, featured: i === 0, visible: true,
        hasVideo: !!(x.youtube || x.mp4), poster: x.poster || '', banner: i === 0 ? banner : '', createdAt: t, updatedAt: t });
      b.set(FB.doc(db, 'videoSources', id), { youtube: x.youtube || '', mp4: x.mp4 || '' });
    });
    await b.commit(); toast(`${list.length} cím áthozva ✓`);
  } catch (e) { toast(errText(e), true); btn.disabled = false; }
}

/* ================= ZENÉK ================= */
function music(v) {
  C.setTitle('🎵', 'Zenék kezelése');
  const list = C.S.music;
  v.innerHTML = `<div class="page"><div class="eyebrow">// KEZELÉS</div>${tabs()}<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap"><div><h1 class="gold">Zenék</h1>
    <p class="lead">1. Töltsd fel az mp3-at a GitHubon a <b>zene</b> mappába (<a href="https://github.com/${githubRepo}/upload/main/zene" target="_blank" rel="noopener">feltöltés itt ↗</a> – behúzod, majd „Commit changes”).<br>2. Pár perc múlva itt az „Új zene” gombnál kiválaszthatod.</p></div><button class="btn goldb" id="nm">+ ÚJ ZENE</button></div>
    ${list.length ? `<div class="atable">${list.map((t, i) => `<div class="arow" style="grid-template-columns:auto auto 1fr auto"><div class="ord"><button data-up="${i}" ${i ? '' : 'disabled'}>▲</button><button data-dn="${i}" ${i < list.length - 1 ? '' : 'disabled'}>▼</button></div>
      <span class="pc" style="width:52px;height:52px;${t.cover ? `background-image:url('${esc(t.cover)}')` : ''}"></span>
      <div class="who"><b>${esc(t.title)}</b><small>${esc(t.artist || 'HGWS')} · ${esc(t.src)}</small>${t.visible === false ? '<div><span class="tg">REJTETT</span></div>' : ''}</div>
      <div class="ac"><button class="btn plain sm" data-ed="${esc(t.id)}">Szerkesztés</button></div></div>`).join('')}</div>`
    : '<div class="empty"><div class="big">🎵</div>Még nincs zene.</div>'}</div>`;
  $('#nm').onclick = () => musicModal();
  $$('[data-ed]', v).forEach(b => b.onclick = () => musicModal(list.find(x => x.id === b.dataset.ed)));
  $$('[data-up],[data-dn]', v).forEach(b => b.onclick = () => reorder('music', list, +(b.dataset.up ?? b.dataset.dn), b.dataset.up != null ? -1 : 1));
}

async function repoFiles() {
  try {
    const r = await fetch(`https://api.github.com/repos/${githubRepo}/contents/zene`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) return [];
    return (await r.json()).filter(f => f.type === 'file' && /\.(mp3|m4a|aac|ogg|oga|wav|flac|webm|opus)$/i.test(f.name)).map(f => f.path);
  } catch (_) { return []; }
}

async function musicModal(t) {
  const d = t || { visible: true };
  let cover = d.cover || '';
  const el = modal({ title: t ? 'Zene szerkesztése' : 'Új zene', body: `
    <div class="grid2"><div class="field"><label>Cím *</label><input class="inp" name="title" maxlength="120" value="${esc(d.title || '')}"></div>
      <div class="field"><label>Előadó</label><input class="inp" name="artist" maxlength="120" value="${esc(d.artist || '')}" placeholder="HGWS"></div></div>
    <div class="field"><label>Zenefájl</label><select class="inp" name="pick"><option value="">Betöltés…</option></select>
      <input class="inp" name="src" value="${esc(d.src || '')}" placeholder="zene/szam.mp3  vagy  https://…/szam.mp3" style="margin-top:.4rem">
      <span class="hint">Válassz a feltöltött fájlok közül, vagy írj be egy linket. Az újonnan feltöltött fájl pár perc múlva jelenik meg a listában.</span>
      <audio controls preload="none" style="width:100%;margin-top:.4rem" ${d.src ? `src="${esc(d.src)}"` : ''}></audio></div>
    <div class="field"><label>Borító <em>(négyzetes kép, nem kötelező)</em></label><div class="imgp"><div class="prev" style="aspect-ratio:1;max-width:140px"></div>
      <div class="c"><div class="r"><label class="btn plain sm">Kép feltöltése<input type="file" accept="image/*" hidden></label><button type="button" class="btn danger sm" data-clr>Törlés</button></div></div></div></div>
    <label class="chk"><input type="checkbox" name="vis" ${d.visible !== false ? 'checked' : ''}> Látható</label>`,
    foot: `${t ? '<button class="btn danger l" data-del>Törlés</button>' : ''}<button class="btn plain" data-x>Mégse</button><button class="btn goldb" data-ok>Mentés</button>` });
  const q = n => el.querySelector(`[name=${n}]`), au = el.querySelector('audio'), prev = el.querySelector('.prev');
  const paintCover = () => { prev.style.backgroundImage = cover ? `url("${cover.replace(/"/g, '%22')}")` : ''; prev.textContent = cover ? '' : 'nincs kép'; };
  paintCover();
  el.querySelector('input[type=file]').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { cover = await compress(f, 600); paintCover(); } catch (_) { toast('A képet nem sikerült beolvasni.', true); } };
  el.querySelector('[data-clr]').onclick = () => { cover = ''; paintCover(); };
  q('src').onchange = () => { au.src = q('src').value.trim(); };
  repoFiles().then(files => {
    const sel = q('pick');
    sel.innerHTML = `<option value="">${files.length ? '— Válassz a zene mappából —' : '(a zene mappában még nincs fájl)'}</option>` + files.map(f => `<option ${f === d.src ? 'selected' : ''}>${esc(f)}</option>`).join('');
    sel.onchange = () => { if (!sel.value) return; q('src').value = sel.value; au.src = sel.value;
      if (!q('title').value) q('title').value = sel.value.split('/').pop().replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '); };
  });
  el.querySelector('[data-ok]').onclick = async () => {
    const title = q('title').value.trim(), src = q('src').value.trim();
    if (!title) return toast('Add meg a címet.', true);
    if (!src) return toast('Válassz zenefájlt vagy adj meg linket.', true);
    const data = { title, artist: q('artist').value.trim(), src, cover, visible: q('vis').checked, updatedAt: FB.serverTimestamp() };
    try {
      if (t) await FB.updateDoc(FB.doc(db, 'music', t.id), data);
      else await FB.addDoc(FB.collection(db, 'music'), { ...data, order: Math.max(-10, ...C.S.music.map(x => x.order || 0)) + 10, createdAt: FB.serverTimestamp() });
      toast('Mentve ✓'); el.close();
    } catch (e) { toast(errText(e), true); }
  };
  const del = el.querySelector('[data-del]'); if (del) del.onclick = async () => {
    if (!await confirmBox(`Törlöd: „${t.title}”? (A fájl a GitHubon marad.)`, 'Törlés')) return;
    try { await FB.deleteDoc(FB.doc(db, 'music', t.id)); toast('Törölve'); el.close(); } catch (e) { toast(errText(e), true); }
  };
}
