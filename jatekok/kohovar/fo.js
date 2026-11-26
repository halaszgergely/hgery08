// Kohóvár – főprogram: menük, kampány, szabad játék, kutatás, irányítás, kezelőfelület, mentés.
// A Mindustry (Anuke) alapján: https://store.steampowered.com/app/1127400/Mindustry/
import { TS, ITEMS, ITEM_IDS, LIQUIDS, BLOCKS, CATS, BUILD_ORDER, UNITS, TECH, SECTORS, CAMPAIGNS, LEGACY_SIZE, FREE_OPTS, FREE_DEF, freeSector, freeRanked } from './adat.js?v=202611261904';
import { World, PLAYER, isPow, genMap } from './vilag.js?v=202611261904';
import { makeTerrain, render, drawB, ghostOf, minimap, drawUnit, loadAtlas, spr, sprSize, icoCss } from './rajz.js?v=202611261904';
import { ISN, LSN, SECSPR } from './kepadat.js?v=202611261904';

const $ = s => document.querySelector(s), cv = $('#c'), g = cv.getContext('2d');
const KEY = 'kohovar_v1', GAME = 'kohovar';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- mentés ---------- */
let S = (() => { try { return JSON.parse(localStorage.getItem(KEY) || localStorage.getItem('ercfront_v1')) || null; } catch (_) { return null; } })();
if (!S || !S.research) S = { research: TECH.filter(t => t.k === 'b' && !Object.keys(t.cost).length).map(t => t.id), bank: {}, cap: {}, best: 0, runs: {}, rv: 2 };
S.seen = S.seen || {};
if (!S.rv) { for (const id of [...S.research]) { const B = BLOCKS[id]; for (const u of [...(B && B.plans || []), ...Object.values(B && B.up || {})]) if (!S.research.includes('u:' + u)) S.research.push('u:' + u); } S.rv = 2; }   // a korábbi mentés: a már kikutatott gyárak egységei megmaradnak
for (const k in S.bank) if (S.bank[k] > 0) S.seen['i:' + k] = 1;
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); return true; } catch (_) { return false; } };
if (S.runs) delete S.runs.vegtelen;
S.free = { ...FREE_DEF, ...(S.free || {}) }; S.seed = S.seed || (Math.random() * 1e9 | 0);
for (const k in FREE_OPTS) if (!FREE_OPTS[k].some(x => x[0] === S.free[k])) S.free[k] = FREE_DEF[k];
const done = id => (W && W.sec.unlockAll) || S.research.includes(id);

/* ---------- ikonok ---------- */
const ICON = {};
function blockIcon(t) {
  if (ICON[t]) return ICON[t];
  const B = BLOCKS[t], c = document.createElement('canvas'), z = B.s <= 3 ? 4 : 2; c.width = c.height = B.s * TS * z; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.scale(z, z);
  drawB(x, null, { ...ghostOf({ t, x: 0, y: 0, rot: 0, cfg: null }), dItem: null }, 0); return (ICON[t] = c.toDataURL());
}
function unitIcon(t) { const k = 'u_' + t; if (ICON[k]) return ICON[k]; const c = document.createElement('canvas'), sz = sprSize(t + '@o') || [48, 48], m = Math.max(sz[0], sz[1], 56) + 16; c.width = c.height = m; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.scale(4, 4); drawUnit(x, t, PLAYER, m / 8, m / 8, -Math.PI / 2, 0); return (ICON[k] = c.toDataURL()); }
function sprIcon(n) { const k = 's_' + n; if (ICON[k]) return ICON[k]; const sz = sprSize(n); if (!sz) return ''; const c = document.createElement('canvas'); c.width = sz[0]; c.height = sz[1]; const x = c.getContext('2d'); x.scale(4, 4); spr(x, n, sz[0] / 8, sz[1] / 8); return (ICON[k] = c.toDataURL()); }
const nodeIcon = t => t.k === 'b' ? blockIcon(t.key) : t.k === 'u' ? unitIcon(t.key) : t.k === 'i' ? sprIcon('item-' + ISN[t.key]) : t.k === 'l' ? sprIcon('liquid-' + LSN[t.key]) : sprIcon('sector-' + SECSPR[t.key]);
const itI = k => `<i class="it" style="${icoCss('item-' + ISN[k])}"></i>`, lqI = k => `<i class="it" style="${icoCss('liquid-' + LSN[k])}"></i>`;
const costHtml = (cost, have) => Object.entries(cost).map(([k, n]) => `<span class="${have && (have[k] || 0) < n ? 'bad' : ''}">${itI(k)}${n}</span>`).join(' ');
const num = n => n >= 10000 ? (n / 1000).toFixed(0) + 'k' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(Math.floor(n));

/* ---------- állapot ---------- */
let W = null, TER = null, SEC = null, paused = false, acc = 0, last = performance.now(), T = 0;
const cam = { x: 0, y: 0, z: 4, free: null }, keys = new Set(), M = { x: 0, y: 0, wx: 0, wy: 0, l: false, drag: null, rdrag: null };
let selBlock = null, rot = 0, cat = 'turret', selB = null, hoverBlock = null, saveT = 0, bigMap = false;

/* ---------- képernyők ---------- */
const scr = id => { for (const s of ['#menu', '#secs', '#free', '#tech', '#pmenu', '#end']) $(s).hidden = s !== id; };
function bankHtml(extra) { const tot = { ...S.bank }; if (extra) for (const k in extra) tot[k] = (tot[k] || 0) + (extra[k] || 0); const l = ITEM_IDS.filter(k => tot[k] > 0); return l.length ? l.map(k => `<span>${itI(k)}${Math.floor(tot[k])} ${ITEMS[k].n}</span>`).join('') : '<span class="mut">üres</span>'; }
const campOpen = c => !c.req || S.cap[c.req];
function secState(s) { if (S.cap[s.id]) return 'cap'; if (!campOpen(CAMPAIGNS.find(c => c.id === s.camp)) || (s.req && !S.cap[s.req])) return 'lock'; return 'open'; }
let camp = 'a';
function showSecs() {
  scr('#secs'); $('#bank1').innerHTML = bankHtml();
  $('#camps').innerHTML = CAMPAIGNS.map(c => `<button class="b ${c.id === camp ? 'on' : ''}" data-camp="${c.id}" ${campOpen(c) ? '' : 'disabled'}>${esc(c.n)} <span class="mut">${SECTORS.filter(s => s.camp === c.id && S.cap[s.id]).length}/${SECTORS.filter(s => s.camp === c.id).length}</span></button>`).join('');
  const C = CAMPAIGNS.find(c => c.id === camp); $('#campD').innerHTML = esc(C.d) + (campOpen(C) ? '' : ` <span class="bad">Feltétel: ${esc(SECTORS.find(s => s.id === C.req).n)} elfoglalása</span>`);
  $('#secList').innerHTML = SECTORS.filter(s => s.camp === camp).map(s => {
    const st = secState(s), run = S.runs[s.id];
    const tag = st === 'cap' ? '<span class="ok">ELFOGLALVA</span>' : st === 'lock' ? '<span class="mut">ZÁRT</span>' : run ? `<span>${run.wave}. hullám</span>` : '';
    const ores = Object.keys(s.ores).concat(s.sand ? ['sand'] : []).map(k => itI(k)).join('');
    return `<div class="sec ${st}"><h3>${esc(s.n)} ${tag}</h3><div class="mut">${esc(s.d)}</div><div>${ores} <span class="mut">${s.w}×${s.h}</span></div><div class="mut">Cél: ${s.win} hullám túlélése</div><div class="row">${st === 'lock' ? '' : run ? `<button class="b go sm" data-go="${s.id}">Folytatás</button><button class="b sm" data-new="${s.id}">Újrakezdés</button>` : `<button class="b go sm" data-new="${s.id}">${st === 'cap' ? 'Újra' : 'Indítás'}</button>`}</div></div>`;
  }).join('');
}
$('#secList').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.go) return start(SECTORS.find(s => s.id === b.dataset.go), S.runs[b.dataset.go]);
  if (b.dataset.new) { if (S.runs[b.dataset.new] && b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Biztos?'; return; } delete S.runs[b.dataset.new]; persist(); start(SECTORS.find(s => s.id === b.dataset.new), null); }
};
$('#camps').onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled) return; camp = b.dataset.camp; showSecs(); };
$('#mPlay').onclick = showSecs; $('#mFree').onclick = showFree; $('#freeBack').onclick = () => scr('#menu'); $('#secBack').onclick = () => scr('#menu');
$('#mTech').onclick = () => showTech('#menu');

/* ---------- kutatás (a Mindustry fájának elrendezésében: a gyökér középen, az ágak fölfelé és lefelé) ---------- */
let techBack = '#menu', tsel = null, tzoom = 1, TPOS = null;
const campRun = () => W && !W.sec.free;
function techAvail() { const a = { ...S.bank }; if (campRun()) for (const k in W.core.items) a[k] = (a[k] || 0) + W.core.items[k]; return a; }
function techSpend(cost) { for (const k in cost) { let n = cost[k]; if (campRun()) { const c = Math.min(n, W.core.items[k] || 0); W.core.items[k] = (W.core.items[k] || 0) - c; n -= c; } S.bank[k] = (S.bank[k] || 0) - n; } }
const NODE = Object.fromEntries(TECH.map(t => [t.id, t]));
const nDone = t => t.k === 'b' || t.k === 'u' ? S.research.includes(t.id) : t.k === 's' ? !!S.cap[t.key] : !!S.seen[t.id];
const nOpen = t => (!t.req || nDone(NODE[t.req])) && (!t.need || S.research.includes(t.need));
const nName = t => t.k === 'b' ? BLOCKS[t.key].n : t.k === 'u' ? UNITS[t.key].n : t.k === 'i' ? ITEMS[t.key].n : t.k === 'l' ? LIQUIDS[t.key].n : SECTORS.find(s => s.id === t.key).n;
const nCan = (t, av) => !nDone(t) && nOpen(t) && (t.k === 'b' || t.k === 'u') && Object.entries(t.cost).every(([k, n]) => (av[k] || 0) >= n);
function layoutTech() {
  if (TPOS) return TPOS; const kids = {}; for (const t of TECH) if (t.req) (kids[t.req] = kids[t.req] || []).push(t);
  const pos = {}, rc = kids.core, half = Math.ceil(rc.length / 2);
  const lay = (t, d, st) => { const ch = kids[t.id] || []; if (!ch.length) pos[t.id] = { x: st.leaf++, y: d, st }; else { ch.forEach(c => lay(c, d + st.dir, st)); const xs = ch.map(c => pos[c.id].x); pos[t.id] = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: d, st }; } };
  const up = { leaf: 0, dir: -1 }, dn = { leaf: 0, dir: 1 }; rc.slice(0, half).forEach(c => lay(c, -1, up)); rc.slice(half).forEach(c => lay(c, 1, dn));
  for (const id in pos) pos[id].x -= (pos[id].st.leaf - 1) / 2; pos.core = { x: 0, y: 0 };
  const P = Object.values(pos), GX = 54, GY = 66, minX = Math.min(...P.map(p => p.x)), minY = Math.min(...P.map(p => p.y));
  for (const p of P) { p.px = 60 + (p.x - minX) * GX; p.py = 60 + (p.y - minY) * GY; }
  return (TPOS = { pos, w: 164 + (Math.max(...P.map(p => p.x)) - minX) * GX, h: 164 + (Math.max(...P.map(p => p.y)) - minY) * GY });
}
function showTech(back) { techBack = back; $('#tech').hidden = false; if (back === '#menu') $('#menu').hidden = true; $('#pmenu').hidden = true; tsel = null; tzoom = Math.max(.6, Math.min(1, $('#tree').clientWidth / layoutTech().w)); drawTech(true); }
function drawTech(center) {
  const av = techAvail(), { pos, w, h } = layoutTech();
  $('#bank2').innerHTML = bankHtml(campRun() ? W.core.items : null) + ` <span class="mut">· ${TECH.filter(nDone).length}/${TECH.length}</span>`;
  let svg = `<svg width="${w}" height="${h}">`, html = '';
  for (const t of TECH) {
    const p = pos[t.id], d = nDone(t), o = nOpen(t);
    if (t.req) { const q = pos[t.req], my = (q.py + p.py) / 2 + 22; svg += `<path d="M${q.px + 22} ${q.py + 22}V${my}H${p.px + 22}V${p.py + 22}" fill="none" stroke="${d ? '#ffd37f' : o ? '#8a7340' : '#34363f'}" stroke-width="2"/>`; }
    html += `<div class="tn ${d ? 'done' : o ? 'av' : 'lock'}${nCan(t, av) ? ' can' : ''}${tsel === t.id ? ' sel' : ''}" data-t="${t.id}" style="left:${p.px}px;top:${p.py}px"><img src="${nodeIcon(t)}"></div>`;
  }
  const tr = $('#tree'), ti = $('#treeIn'), sl = tr.scrollLeft, st = tr.scrollTop; ti.style.zoom = tzoom; ti.style.width = w + 'px'; ti.style.height = h + 'px'; ti.innerHTML = svg + '</svg>' + html;
  if (center) { tr.scrollLeft = (pos.core.px + 22) * tzoom - tr.clientWidth / 2; tr.scrollTop = (pos.core.py + 22) * tzoom - tr.clientHeight / 2; } else { tr.scrollLeft = sl; tr.scrollTop = st; }
  techInfo();
}
function ustats(U) {
  const o = [`Életerő: ${U.hp} · páncél: ${U.armor}`, `Sebesség: ${(U.sp * 60 / TS).toFixed(1)} mező/mp · ${U.air ? 'légi' : U.naval ? 'vízi' : U.legs ? 'lábas' : 'földi'}`];
  if (U.rng) o.push(`Hatótáv: ${(U.rng / TS).toFixed(1)} mező`); if (U.build) o.push('Építeni tud'); if (U.mine) o.push('Bányászni tud'); if (U.ab) o.push(Object.keys(U.ab).map(k => ({ regen: 'pajzsot oszt', ff: 'erőtér', rep: 'javítómező' }[k])).join(', '));
  return o.map(s => `<div class="st">${s}</div>`).join('');
}
function techInfo() {
  const el = $('#tinfo'), t = tsel && NODE[tsel]; if (!t) { el.hidden = true; return; }
  const av = techAvail(), d = nDone(t); let h = `<h3>${esc(nName(t))}</h3>` + (t.k === 'b' ? stats(BLOCKS[t.key]) : t.k === 'u' ? ustats(UNITS[t.key]) : '');
  if (d) h += `<div class="ok" style="margin-top:6px">${t.k === 's' ? 'Elfoglalva' : t.k === 'i' || t.k === 'l' ? 'Megszerezve' : 'Kikutatva'}</div>`;
  else if (t.k === 'b' || t.k === 'u') {
    h += `<div style="margin-top:6px">${costHtml(t.cost, av)}</div>`;
    if (t.req && !nDone(NODE[t.req])) h += `<div class="bad">Előbb: ${esc(nName(NODE[t.req]))}</div>`; if (t.need && !S.research.includes(t.need)) h += `<div class="bad">Előbb: ${esc(BLOCKS[t.need].n)}</div>`;
    h += `<button class="b go sm" id="tGo" ${nCan(t, av) ? '' : 'disabled'} style="margin-top:8px">Kutatás</button>`;
  } else h += `<div class="mut" style="margin-top:6px">${t.k === 's' ? 'Még nincs elfoglalva' : 'Még nem termelted'}</div>`;
  el.hidden = false; el.innerHTML = h;
}
function research() { const t = NODE[tsel]; if (!t || !nCan(t, techAvail())) return; techSpend(t.cost); S.research.push(t.id); persist(); drawTech(); if (W) buildPalette(); }
$('#tree').onclick = e => { if (moved > 4) return; const n = e.target.closest('.tn'); tsel = n ? n.dataset.t : null; drawTech(); };
$('#tree').ondblclick = e => { if (e.target.closest('.tn')) research(); };
$('#tinfo').onclick = e => { if (e.target.id === 'tGo') research(); };
$('#tree').addEventListener('wheel', e => { e.preventDefault(); const tr = $('#tree'), r = tr.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, z0 = tzoom; tzoom = Math.max(.3, Math.min(1.8, tzoom * (e.deltaY > 0 ? .88 : 1.14))); $('#treeIn').style.zoom = tzoom; tr.scrollLeft = (tr.scrollLeft + mx) * tzoom / z0 - mx; tr.scrollTop = (tr.scrollTop + my) * tzoom / z0 - my; }, { passive: false });
let moved = 0; { const tr = $('#tree'); let d = null; tr.onpointerdown = e => { d = [e.clientX, e.clientY, tr.scrollLeft, tr.scrollTop]; moved = 0; }; window.addEventListener('pointermove', e => { if (!d) return; moved = Math.hypot(e.clientX - d[0], e.clientY - d[1]); tr.scrollLeft = d[2] - (e.clientX - d[0]); tr.scrollTop = d[3] - (e.clientY - d[1]); }); window.addEventListener('pointerup', () => { d = null; }); }
$('#techBack').onclick = () => { $('#tech').hidden = true; if (techBack === '#menu') scr('#menu'); else if (techBack === '#pmenu') $('#pmenu').hidden = false; else if (W) paused = false; };

/* ---------- indítás, mentés, vége ---------- */
function start(sec, save) {
  if (save && !save.gv) sec = { ...sec, gen: 1, ...(LEGACY_SIZE[sec.id] ? { w: LEGACY_SIZE[sec.id][0], h: LEGACY_SIZE[sec.id][1] } : {}) };   // régi mentés: a régi térképével töltjük vissza
  SEC = sec; W = new World(sec, save); TER = makeTerrain(W); selB = null; selBlock = null; paused = false; cam.free = null; cam.z = 4;
  W.onWave = n => { W.msg(`${n}. hullám`); if (sec.free && sec.ranked) { if (n > (S.best || 0)) { S.best = n; persist(); } try { if (window.top !== window) parent.postMessage({ hgws: 'score', game: GAME, score: n }, location.origin); } catch (_) { } } };
  W.canUnit = t => !!sec.unlockAll || S.research.includes('u:' + t);
  W.onLaunch = items => { if (sec.free) return; let n = 0; for (const k in items) { S.bank[k] = (S.bank[k] || 0) + items[k]; n += items[k]; } W.msg(`Kilövés: ${n} tárgy a raktárba`); persist(); };
  const p = W.player; cam.x = p.x; cam.y = p.y;
  scr(null); $('#hud').hidden = false; sizeMini(); buildPalette(); saveT = performance.now();
}
const runKey = s => s.free ? 'free' : s.id;
function saveRun() { if (!W || W.lost || W.won) return; S.runs[runKey(SEC)] = W.save(); if (SEC.free) S.freeSec = SEC; if (!persist()) W.msg('A mentés nem fért el a böngésző tárhelyén', 'bad'); }
function quit() { saveRun(); const f = SEC.free; W = null; $('#hud').hidden = true; f ? showFree() : showSecs(); }
let endFree = false;
function endGame(won) {
  paused = true; const items = { ...W.core.items };
  if (won && SEC.free) { $('#endT').textContent = 'GYŐZELEM'; $('#endP').textContent = `${SEC.n}: mind a ${W.wave} hullám túlélve, ${W.stats.kills} ellenség megsemmisítve.`; $('#endB').innerHTML = ''; }
  else if (won) { S.cap[SEC.id] = 1; for (const k in items) S.bank[k] = (S.bank[k] || 0) + items[k]; $('#endT').textContent = 'SZEKTOR ELFOGLALVA'; $('#endP').textContent = `${SEC.n}: ${W.wave} hullám túlélve, ${W.stats.kills} ellenség megsemmisítve. A mag készlete a raktárba került:`; $('#endB').innerHTML = Object.keys(items).filter(k => items[k] > 0).map(k => `<span>${itI(k)}${Math.floor(items[k])}</span>`).join(''); }
  else { $('#endT').textContent = 'A MAG ELPUSZTULT'; $('#endP').textContent = `${SEC.n}: ${W.wave}. hullámig jutottál, ${W.stats.kills} ellenség megsemmisítve.`; $('#endB').innerHTML = ''; }
  delete S.runs[runKey(SEC)]; endFree = !!SEC.free; persist(); W = null; $('#hud').hidden = true; scr('#end');
}
$('#endOk').onclick = () => endFree ? showFree() : showSecs();

/* ---------- szabad játék ---------- */
const FLAB = { map: 'Térkép', size: 'Méret', diff: 'Nehézség', wt: 'Hullámidő', win: 'Hullámok', sp: 'Kezdőpontok', ore: 'Érc', start: 'Kezdő készlet', res: 'Kutatás', fog: 'Felfedezési köd' };
let prevT = 0;
function showFree() {
  scr('#free'); const o = S.free, run = S.runs.free;
  $('#fOpts').innerHTML = Object.entries(FREE_OPTS).map(([k, l]) => `<div class="fo"><h2>${FLAB[k]}</h2><div class="row">${l.map(x => `<button class="b sm ${o[k] === x[0] ? 'on' : ''}" data-k="${k}" data-v="${x[0]}">${esc(x[1])}${k === 'size' ? ` <span class="mut">${x[2][0]}×${x[2][1]}</span>` : ''}</button>`).join('')}</div></div>`).join('')
    + `<div class="fo"><h2>Térképkód</h2><div class="row"><span>${S.seed}</span><button class="b sm" id="fSeed">Új térkép</button></div></div>`;
  $('#fRank').innerHTML = freeRanked(o) ? `<span class="ok">Ranglistás</span> · rekord: ${S.best || 0}. hullám` : '<span class="mut">Nem ranglistás</span>';
  $('#fCont').hidden = !run; if (run && S.freeSec) $('#fCont').textContent = `Folytatás (${S.freeSec.n}, ${run.wave}. hullám)`;
  clearTimeout(prevT); prevT = setTimeout(() => {          // előnézet: a teljes térkép, a mag és a kezdőpontok
    const sec = freeSector(o, S.seed), m = genMap(sec), ter = makeTerrain({ ...m, w: sec.w, h: sec.h }), pc = $('#fPrev'), k = Math.max(1, Math.round(600 / sec.w)); pc.width = sec.w * k; pc.height = sec.h * k;
    const pg = pc.getContext('2d'); pg.imageSmoothingEnabled = false; pg.drawImage(ter.mini, 0, 0, pc.width, pc.height); pg.fillStyle = '#ffd37f'; pg.fillRect(m.coreAt.x * k - 2, m.coreAt.y * k - 2, 3 * k + 4, 3 * k + 4); pg.fillStyle = '#ff4a3d'; for (const sp of m.spawns) pg.fillRect(sp.x * k - 3, sp.y * k - 3, 7, 7);
  }, 30);
}
$('#fOpts').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.id === 'fSeed') S.seed = Math.random() * 1e9 | 0; else { const k = b.dataset.k, v = b.dataset.v; S.free[k] = typeof FREE_DEF[k] === 'number' ? +v : v; } persist(); showFree(); };
$('#fGo').onclick = e => { const b = e.currentTarget; if (S.runs.free && b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Biztos? A folyamatban lévő játék elvész'; return; } b.dataset.sure = ''; b.textContent = 'Indítás'; delete S.runs.free; const sec = freeSector(S.free, S.seed); S.freeSec = sec; persist(); start(sec, null); };
$('#fCont').onclick = () => start(S.freeSec, S.runs.free);

/* ---------- paletta ---------- */
function buildPalette() {
  if (!BUILD_ORDER[cat].some(done)) cat = CATS.find(c => BUILD_ORDER[c[0]].some(done))[0];
  $('#cats').innerHTML = CATS.map(([id, n, ic]) => BUILD_ORDER[id].some(done) ? `<button data-c="${id}" class="${id === cat ? 'on' : ''}" title="${esc(n)}">${ic}</button>` : '').join('');
  $('#blks').innerHTML = BUILD_ORDER[cat].filter(done).map(t => `<div class="bk ${t === selBlock ? 'on' : ''} ${W && !W.has(BLOCKS[t].cost) ? 'no' : ''}" data-b="${t}"><img src="${blockIcon(t)}"></div>`).join('');
  document.documentElement.style.setProperty('--palh', $('#pal').offsetHeight + 'px');
}
$('#cats').onclick = e => { const b = e.target.closest('button'); if (!b) return; cat = b.dataset.c; buildPalette(); };
$('#blks').onclick = e => { const b = e.target.closest('.bk'); if (!b) return; selBlock = selBlock === b.dataset.b ? null : b.dataset.b; selB = null; $('#sel').hidden = true; buildPalette(); showInfo(selBlock); };
$('#blks').onmouseover = e => { const b = e.target.closest('.bk'); hoverBlock = b ? b.dataset.b : null; showInfo(hoverBlock || selBlock); };
$('#blks').onmouseleave = () => { hoverBlock = null; showInfo(selBlock); };
const ps = v => (v * 60).toFixed(v * 60 < 10 ? 1 : 0) + '/mp';
function stats(B) {
  const o = [], til = v => (v / TS).toFixed(1) + ' mező';
  switch (B.type) {
    case 'turret': {
      o.push(`Hatótáv: ${til(B.range)} · ${B.ground ? 'földi' : ''}${B.ground && B.air ? ' és ' : ''}${B.air ? 'légi' : ''} célok`);
      if (B.ammo) o.push('Lőszer: ' + Object.entries(B.ammo).map(([k, a]) => `${itI(k)}${a.d}${a.spl ? '+' + Math.round(a.spl) : ''}`).join(' '));
      if (B.lammo) o.push('Folyadék: ' + Object.keys(B.lammo).map(lqI).join(''));
      if (B.laser) o.push(`Lézer: ${B.laser.d}, átüt ${B.laser.pierce} célt`); if (B.arcd) o.push(`Villám: ${B.arcd}`); if (B.beam) o.push(`Folyamatos sugár: ${Math.round(B.beam.d * 12)}/mp, ${(B.beam.dur / 60).toFixed(1)} mp`);
      if (B.tractor) o.push('Vonósugár: lehúzza a légi egységeket'); if (B.pd) o.push('Lelövi az ellenséges lövedékeket');
      if (B.reload) o.push(`Tűzgyorsaság: ${(60 / B.reload * (B.shots || 1)).toFixed(1)}/mp`);
      if (B.coolReq) o.push(`Hűtés kell: ${lqI('water')}${lqI('cryo')} ${ps(B.coolReq)}`); else if (B.cool) o.push(`Hűtéssel gyorsabb: ${lqI('water')}${lqI('cryo')}`);
      break;
    }
    case 'drill': o.push(`Fúrható: ${ITEM_IDS.filter(k => ITEMS[k].h <= B.tier && ['copper', 'lead', 'sand', 'coal', 'scrap', 'titanium', 'thorium'].includes(k)).map(itI).join('')}`, `Sebesség (teljes ércen): ${(60 / (B.time + 50) * B.s * B.s).toFixed(2)}/mp`, `Vízzel ${(B.boost * B.boost).toFixed(2)}× gyorsabb`); break;
    case 'crafter': {
      const inp = [...Object.entries(B.inp || {}).map(([k, n]) => itI(k) + n), ...(B.inL ? [lqI(B.inL[0]) + ps(B.inL[1])] : [])], out = [...Object.entries(B.out || {}).map(([k, n]) => itI(k) + n), ...(B.outL ? [lqI(B.outL[0]) + ps(B.outL[1])] : []), ...(B.sep ? [Object.keys(B.sep).map(itI).join('')] : [])];
      o.push(`${inp.join(' + ') || '—'} → ${out.join(' ')}${B.time ? ` · ${(B.time / 60).toFixed(2)} mp` : ''}`); if (B.attr) o.push({ spores: 'Spórás talajon gyorsabb', heat: 'Forró talajon gyorsabb', oil: 'Homokon, palán, kátrányon termel' }[B.attr]); break;
    }
    case 'conveyor': case 'sconv': o.push(`${B.speed} tárgy/mp`); break;
    case 'bridge': case 'lbridge': o.push(`Hatótáv: ${B.range} mező`); break;
    case 'driver': o.push(`Hatótáv: ${til(B.range)}, ${B.cap} tárgy / lövés`); break;
    case 'pump': o.push(`${ps(B.amt * B.s * B.s)} (teljes folyadékon)`); break;
    case 'conduit': case 'lrouter': o.push(`Kapacitás: ${B.lcap}`); break;
    case 'node': o.push(`Hatótáv: ${B.range} mező, ${B.links} kapcsolat`); break;
    case 'battery': o.push(`Kapacitás: ${B.capP}`); break;
    case 'generator': o.push(`Termel: ${Math.round(B.gen * 60)}/mp` + ({ burn: ' · éghető anyag', item: ` · ${itI(B.fuel)}`, rtg: ` · ${itI('thorium')}${itI('phase')}`, thermal: ' / forró mező', reactor: ` · ${itI('thorium')}`, impact: ` · ${itI('blast')}` }[B.mode] || '') + (B.inL ? ` + ${lqI(B.inL[0])}${ps(B.inL[1])}` : '')); break;
    case 'mender': o.push(`${B.heal}% javítás ${(B.reload / 60).toFixed(1)} mp-enként, ${til(B.range)}`, `Erősítő: ${itI(B.bItem)}`); break;
    case 'overdrive': o.push(`+${Math.round((B.od - 1) * 100)}% sebesség, ${til(B.range)}`, B.need ? 'Kell: ' + Object.keys(B.need).map(itI).join('') : `Erősítő: ${itI(B.bItem)}`); break;
    case 'shield': o.push(`Pajzs: ${B.shp}, sugár ${til(B.radius)}`, `Erősítő: ${itI(B.bItem)}`); break;
    case 'mine': o.push(`Villám: ${B.cnt}×${B.d}`); break;
    case 'factory': o.push('Egységek: ' + B.plans.map(u => UNITS[u].n).join(', ')); break;
    case 'recon': o.push(Object.entries(B.up).map(([a, b]) => `${UNITS[a].n}→${UNITS[b].n}`).join(', '), `Kell: ${costHtml(B.inp)}${B.inL ? ' ' + lqI(B.inL[0]) + ps(B.inL[1]) : ''} · ${B.time / 60} mp`); break;
    case 'repair': o.push(`Egységjavítás: ${ps(B.rep)}, ${til(B.range)}`); break;
    case 'core': o.push(`Tárhely: ${B.cap} / anyag · egység: ${UNITS[B.unit].n}`); break;
    case 'storage': o.push(`${B.cap} / anyag`); break;
    case 'launchpad': o.push(`${B.cap} tárgy a raktárba ${B.time / 60} mp-enként`); break;
    case 'wall': if (B.deflect) o.push('Visszaveri a lövedékeket'); if (B.zap) o.push('Találatkor villámot szór'); if (B.insul) o.push('Elnyeli a lézert, szigetel'); break;
  }
  if (B.power) o.push(`Áram: ${Math.round(B.power * 60)}/mp`);
  o.push(`Életerő: ${B.hp}`);
  return o.map(s => `<div class="st">${s}</div>`).join('');
}
function showInfo(t) { const el = $('#info'); if (!t || !W) { el.hidden = true; return; } const B = BLOCKS[t], h = `<h3>${esc(B.n)}</h3><div>${costHtml(B.cost, W.core.items)}</div>${stats(B)}`; el.hidden = false; if (el.dataset.h !== h) { el.innerHTML = h; el.dataset.h = h; } }

/* ---------- kiválasztott épület ---------- */
function selHtml() {
  const b = selB; if (!b || b.dead) { $('#sel').hidden = true; selB = null; return; }
  const B = b.B; let h = `<h3><span>${esc(B.n)}</span><button class="b sm" data-x="1">✕</button></h3><div class="bar"><i style="width:${b.hp / B.hp * 100}%;background:#ff6b5a"></i></div>`;
  const its = b === W.core ? [] : Object.keys(b.items).filter(k => b.items[k] > 0);
  if (its.length) h += `<div>${its.map(k => `${itI(k)}${Math.floor(b.items[k])}`).join(' ')}</div>`;
  if (b.lq > .1) h += `<div>${lqI(b.lt)}${LIQUIDS[b.lt].n}: ${b.lq.toFixed(0)} / ${B.lcap || 10}</div>`;
  if (b.oq > .1) { const k = B.outL ? B.outL[0] : b.pLiq; h += `<div>${lqI(k)}${LIQUIDS[k].n}: ${b.oq.toFixed(0)} / ${B.lcap || 10}</div>`; }
  if (B.ammo) h += `<div>Lőszer: ${b.ammo.map(a => itI(a.it) + a.n).join(' ') || '<span class="bad">nincs</span>'}</div>`;
  if (B.type === 'drill') h += `<div>${b.dItem ? `${itI(b.dItem)} ${(60 / ((B.time + 50 * ITEMS[b.dItem].h) / b.dCnt) * (B.power ? b.ps : 1)).toFixed(2)}/mp` : ''}</div>`;
  if (B.type === 'generator') h += `<div>Termel: ${Math.round(b.pgen * 60)}/mp${B.mode === 'reactor' ? ` · hő ${Math.round(b.heat * 100)}%` : B.mode === 'impact' ? ` · felfűtés ${Math.round(b.warm * 100)}%` : ''}</div>`;
  if (B.type === 'shield') h += `<div>Pajzs: ${Math.round(B.shp - b.sh)} / ${B.shp}${b.broken ? ' <span class="bad">összeomlott</span>' : ''}</div>`;
  if (b.g) h += `<div class="mut">Hálózat: +${Math.round(b.g.prod * 60)} / −${Math.round(b.g.need * 60)}${b.g.cap ? ` · akku ${num(b.g.stored)}/${num(b.g.cap)}` : ''}</div><div class="bar"><i style="width:${b.g.sat * 100}%"></i></div>`;
  if (B.cfg === 'item') h += `<div class="ipick">${ITEM_IDS.map(k => `<button class="${b.cfg === k ? 'on' : ''}" data-i="${k}" title="${ITEMS[k].n}"><i style="${icoCss('item-' + ISN[k], 18)}"></i></button>`).join('')}</div>`;
  if (B.type === 'factory') { const U = UNITS[B.plans[b.cfg || 0]]; h += `<div class="ipick">${B.plans.map((u, i) => W.canUnit(u) ? `<button class="${(b.cfg || 0) === i ? 'on' : ''}" data-u="${i}" title="${UNITS[u].n}" style="width:38px;height:38px"><img src="${unitIcon(u)}" style="width:32px"></button>` : '').join('')}</div><div>${W.canUnit(B.plans[b.cfg || 0]) ? '' : '<span class="bad">Nincs kikutatva</span> '}${U.n} (${W.countU(B.plans[b.cfg || 0])}/${W.core.B.ucap}): ${costHtml(U.cost, b.items)}</div><div class="bar"><i style="width:${b.prog * 100}%"></i></div>`; }
  if (B.type === 'recon') h += `<div>${b.pay ? `${UNITS[b.pay].n} → ${UNITS[B.up[b.pay]].n}` : '<span class="mut">Egységre vár</span>'}: ${costHtml(B.inp, b.items)}</div><div class="bar"><i style="width:${b.prog * 100}%"></i></div>`;
  if (B.type === 'launchpad' || (B.type === 'crafter' && B.time)) h += `<div class="bar"><i style="width:${(B.type === 'launchpad' ? b.prog / B.time : b.prog) * 100}%"></i></div>`;
  if (b === W.core) h += `<div class="mut">Tárhely: ${W.coreCap()} / anyag</div>`;
  $('#sel').hidden = false; if ($('#sel').dataset.h !== h) { $('#sel').innerHTML = h; $('#sel').dataset.h = h; }
}
$('#sel').onclick = e => {
  const t = e.target.closest('button'); if (!t || !selB) return;
  if (t.dataset.x) { selB = null; $('#sel').hidden = true; return; }
  if (t.dataset.i) selB.cfg = selB.cfg === t.dataset.i ? null : t.dataset.i;
  if (t.dataset.u) { selB.cfg = +t.dataset.u; selB.prog = 0; }
  selHtml();
};

/* ---------- bevitel ---------- */
const tileAt = (wx, wy) => [Math.floor(wx / TS), Math.floor(wy / TS)];
function originOf(t, tx, ty) { if (BLOCKS[t].type === 'core') return W.coreSpot(t); const o = Math.floor((BLOCKS[t].s - 1) / 2); return [tx - o, ty - o]; }
function linePlans(t, a, b) {
  const B = BLOCKS[t], s = B.s, out = []; let [x, y] = a; const [x2, y2] = b, pts = [[x, y]];
  if (B.type === 'core') return [{ t, x: W.coreSpot(t)[0], y: W.coreSpot(t)[1], rot: 0 }];
  const stepTo = axis => { if (axis === 0) while (Math.abs(x2 - x) >= s) { x += Math.sign(x2 - x) * s; pts.push([x, y]); } else while (Math.abs(y2 - y) >= s) { y += Math.sign(y2 - y) * s; pts.push([x, y]); } };
  if (Math.abs(x2 - x) >= Math.abs(y2 - y)) { stepTo(0); stepTo(1); } else { stepTo(1); stepTo(0); }
  for (let k = 0; k < pts.length; k++) {
    let r = rot;
    if (B.rot && s === 1 && pts.length > 1) { const [px, py] = pts[k], [qx, qy] = k + 1 < pts.length ? pts[k + 1] : pts[k - 1]; const ddx = k + 1 < pts.length ? qx - px : px - qx, ddy = k + 1 < pts.length ? qy - py : py - qy; r = ddx > 0 ? 0 : ddx < 0 ? 2 : ddy > 0 ? 1 : 3; }
    const [ox, oy] = originOf(t, pts[k][0], pts[k][1]); out.push({ t, x: ox, y: oy, rot: r });
  }
  return out;
}
function updMouse(e) { const r = cv.getBoundingClientRect(); M.x = e.clientX - r.left; M.y = e.clientY - r.top; M.wx = (M.x - cv.width / 2) / cam.z + cam.x; M.wy = (M.y - cv.height / 2) / cam.z + cam.y; }
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  if (!W) return; updMouse(e); cv.setPointerCapture(e.pointerId);
  const [tx, ty] = tileAt(M.wx, M.wy);
  if (e.button === 1) { pickAt(tx, ty); return; }
  if (e.button === 2) { if (selBlock) { selBlock = null; buildPalette(); showInfo(null); return; } M.rdrag = [tx, ty]; return; }
  if (e.button !== 0) return;
  if (selBlock) { M.drag = [tx, ty]; return; }
  const b = W.inb(tx, ty) && W.seen[ty * W.w + tx] ? W.tb(tx, ty) : null;
  if (selB && b && b !== selB && linkClick(selB, b)) return;
  if (b && b.B.door) { b.open = !b.open; W.fdirty = 1; return; }
  if (b) { selB = b; selHtml(); return; }
  const i = ty * W.w + tx, p = W.player;
  if (W.inb(tx, ty) && W.seen[i] && p && W.mineItem(i, p.U.mineT)) { p.mine = p.mine === i ? -1 : i; return; }
  selB = null; $('#sel').hidden = true; M.l = true;
});
window.addEventListener('pointermove', e => { updMouse(e); });
window.addEventListener('pointerup', e => {
  if (!W) { M.l = false; return; }
  updMouse(e); const [tx, ty] = tileAt(M.wx, M.wy);
  if (e.button === 0) { M.l = false; if (M.drag && selBlock) for (const p of linePlans(selBlock, M.drag, [tx, ty])) W.plan(p.t, p.x, p.y, p.rot); M.drag = null; }
  if (e.button === 2 && M.rdrag) {
    const [ax, ay] = M.rdrag, x0 = Math.min(ax, tx), x1 = Math.max(ax, tx), y0 = Math.min(ay, ty), y1 = Math.max(ay, ty), seen = new Set();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (W.cancelAt(x, y)) continue; const b = W.tb(x, y); if (b && !seen.has(b)) { seen.add(b); W.unplan(b); } }
    M.rdrag = null;
  }
});
cv.addEventListener('wheel', e => { e.preventDefault(); cam.z = Math.max(1.5, Math.min(9, cam.z * (e.deltaY > 0 ? .88 : 1.14))); }, { passive: false });
function pickAt(tx, ty) { const b = W.tb(tx, ty); if (!b || b.t === 'core' || !done(b.t)) return; selBlock = b.t; rot = b.rot; cat = BLOCKS[b.t].kat; buildPalette(); showInfo(selBlock); }
function linkClick(a, b) {
  if (a.B.type === 'node' && isPow(b) && b.B.type !== 'diode') { if (W.nodeDist(a, b) <= a.B.range * TS) { W.toggleLink(a, b); selHtml(); return true; } return false; }
  if ((a.B.type === 'bridge' || a.B.type === 'lbridge') && b.t === a.t) { if ((a.x === b.x || a.y === b.y) && Math.abs(a.x - b.x) + Math.abs(a.y - b.y) <= a.B.range) { a.link = a.link === b.i ? -1 : b.i; if (b.link === a.i) b.link = -1; selB = b; selHtml(); return true; } }
  if (a.B.type === 'driver' && b.t === a.t) { if (Math.hypot(a.x - b.x, a.y - b.y) * TS <= a.B.range) { a.link = a.link === b.i ? -1 : b.i; if (b.link === a.i) b.link = -1; selHtml(); return true; } }
  return false;
}
window.addEventListener('keydown', e => {
  if (!W) return; const k = e.key.toLowerCase(); keys.add(k);
  if (k === 'r') rot = (rot + (e.shiftKey ? 3 : 1)) % 4;
  if (k === 'q') { const [tx, ty] = tileAt(M.wx, M.wy); pickAt(tx, ty); }
  if (k === ' ') { e.preventDefault(); togglePause(); }
  if (k === 'm') { bigMap = !bigMap; sizeMini(); }
  if (k === 'g') { const n = W.rally(M.wx, M.wy); if (n) W.msg(`${n} egység gyülekezik`); }
  if (k === 'escape') { if (bigMap) { bigMap = false; sizeMini(); } else if (selBlock || selB) { selBlock = null; selB = null; $('#sel').hidden = true; buildPalette(); showInfo(null); } else openPM(); }
  if (k === 'e' && selB && selB.B.type !== 'core') W.unplan(selB);
  if (/^[1-9]$/.test(k)) { const t = BUILD_ORDER[cat].filter(done)[+k - 1]; if (t) { selBlock = t; buildPalette(); showInfo(t); } }
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); M.l = false; });
function togglePause() { paused = !paused; $('#paused').hidden = !paused; }
function openPM() { paused = true; scr('#pmenu'); }
$('#bPause').onclick = togglePause; $('#bMenu').onclick = openPM; $('#bTech').onclick = () => { paused = true; showTech(null); };
$('#bMap').onclick = () => { bigMap = !bigMap; sizeMini(); };
$('#pRes').onclick = () => { $('#pmenu').hidden = true; paused = false; $('#paused').hidden = true; };
$('#pTech').onclick = () => showTech('#pmenu');
$('#pSave').onclick = () => { $('#pmenu').hidden = true; quit(); };
$('#pAband').onclick = e => { const b = e.currentTarget; if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Biztos? A szektor elvész'; return; } b.dataset.sure = ''; b.textContent = 'Szektor feladása'; $('#pmenu').hidden = true; endGame(false); };
$('#skip').onclick = () => { if (W && (!SEC.win || W.wave < SEC.win)) W.nextWave(); };
function sizeMini() { if (!W) return; const c = $('#mini'), a = W.w / W.h, mw = bigMap ? Math.min(innerWidth * .8, innerHeight * .8 * a) : 200; c.width = Math.round(mw); c.height = Math.round(mw / a); c.classList.toggle('big', bigMap); }
$('#mini').onclick = e => { if (!W) return; const r = e.target.getBoundingClientRect(); cam.free = { x: (e.clientX - r.left) / r.width * W.w * TS, y: (e.clientY - r.top) / r.height * W.h * TS }; if (bigMap) { bigMap = false; sizeMini(); } };
window.addEventListener('beforeunload', saveRun);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveRun(); });

/* ---------- HUD ---------- */
let palSig = '';
function hud() {
  const w = W, wt = Math.max(0, Math.ceil(w.wtimer / 60));
  $('#wn').textContent = SEC.win ? `HULLÁM ${w.wave} / ${SEC.win}` : `${w.wave}. HULLÁM`;
  $('#wt').textContent = SEC.win && w.wave >= SEC.win ? 'Utolsó hullám' : `Következő: ${Math.floor(wt / 60)}:${String(wt % 60).padStart(2, '0')}`;
  const en = w.enemies(); $('#en').innerHTML = en ? `<span class="bad">${en} ellenség</span>` : '';
  $('#skip').disabled = !!(SEC.win && w.wave >= SEC.win);
  const it = w.core.items; let ns = 0; for (const k of ITEM_IDS) if (it[k] > 0 && !S.seen['i:' + k]) { S.seen['i:' + k] = 1; ns = 1; } for (const k in w.madeL) if (!S.seen['l:' + k]) { S.seen['l:' + k] = 1; ns = 1; } if (ns) persist();
  $('#items').innerHTML = ITEM_IDS.filter(k => it[k] > 0).map(k => `<span>${itI(k)}${num(it[k])}</span>`).join('');
  $('#msgs').innerHTML = w.msgs.slice(-4).map(m => `<div class="box ${m.c}">${esc(m.t)}</div>`).join('');
  if (selB) selHtml();
  if (selBlock || hoverBlock) showInfo(hoverBlock || selBlock);
  minimap($('#mini'), w, TER, cam, cv.width, cv.height);
  const sig = cat + selBlock + S.research.length + BUILD_ORDER[cat].map(t => done(t) && w.has(BLOCKS[t].cost) ? 1 : 0).join('');
  if (sig !== palSig) { palSig = sig; buildPalette(); }
}

/* ---------- ciklus ---------- */
function resize() { cv.width = innerWidth; cv.height = innerHeight; if (bigMap) sizeMini(); }
addEventListener('resize', resize); resize();
function control() {
  const c = W.ctl; c.ax = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0); c.ay = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
  c.mx = M.wx; c.my = M.wy; c.shoot = M.l && !selBlock;
}
const RANGE = B => B.type === 'turret' ? B.range : B.type === 'node' || B.type === 'bridge' || B.type === 'lbridge' ? B.range * TS : B.type === 'mender' || B.type === 'overdrive' || B.type === 'repair' || B.type === 'driver' ? B.range : B.type === 'shield' ? B.radius : 0;
function overlay(gx, z) {
  const [tx, ty] = tileAt(M.wx, M.wy), lw = 1.5 / z, ring = (x, y, R, cross) => { gx.strokeStyle = 'rgba(255,211,127,.6)'; gx.lineWidth = lw; gx.setLineDash([3, 3]); gx.beginPath(); if (cross) { gx.rect(x - R - 4, y - 4, R * 2 + 8, 8); gx.rect(x - 4, y - R - 4, 8, R * 2 + 8); } else gx.arc(x, y, R, 0, 7); gx.stroke(); gx.setLineDash([]); };
  if (selBlock) {
    const [ox0, oy0] = originOf(selBlock, tx, ty), list = M.drag ? linePlans(selBlock, M.drag, [tx, ty]) : [{ t: selBlock, x: ox0, y: oy0, rot }];
    for (const p of list) {
      const B = BLOCKS[p.t], o = W.tb(p.x, p.y), ok = W.canPlace(p.t, p.x, p.y) || (o && o.t === p.t && B.rot && B.s === 1), s = B.s * TS;
      gx.globalAlpha = .55; drawB(gx, null, ghostOf(p), T); gx.globalAlpha = 1;
      gx.strokeStyle = ok ? '#84f491' : '#ff5a4d'; gx.lineWidth = lw; gx.strokeRect(p.x * TS, p.y * TS, s, s);
      if (B.rot) { const cx = (p.x + B.s / 2) * TS, cy = (p.y + B.s / 2) * TS; gx.fillStyle = ok ? '#84f491' : '#ff5a4d'; gx.save(); gx.translate(cx, cy); gx.rotate(p.rot * Math.PI / 2); gx.beginPath(); gx.moveTo(s / 2 + 2.5, 0); gx.lineTo(s / 2, -2); gx.lineTo(s / 2, 2); gx.fill(); gx.restore(); }
    }
    const B = BLOCKS[selBlock], R = RANGE(B); if (R && !M.drag) ring((ox0 + B.s / 2) * TS, (oy0 + B.s / 2) * TS, R, B.type === 'bridge' || B.type === 'lbridge');
  }
  if (M.rdrag) { const [ax, ay] = M.rdrag, x0 = Math.min(ax, tx), y0 = Math.min(ay, ty), x1 = Math.max(ax, tx) + 1, y1 = Math.max(ay, ty) + 1; gx.fillStyle = 'rgba(255,90,77,.15)'; gx.fillRect(x0 * TS, y0 * TS, (x1 - x0) * TS, (y1 - y0) * TS); gx.strokeStyle = '#ff5a4d'; gx.lineWidth = lw; gx.strokeRect(x0 * TS, y0 * TS, (x1 - x0) * TS, (y1 - y0) * TS); }
  if (selB && !selB.dead) {
    const B = selB.B, s = B.s * TS, c = W.center(selB); gx.strokeStyle = '#ffd37f'; gx.lineWidth = 2 / z; gx.strokeRect(selB.x * TS - 1, selB.y * TS - 1, s + 2, s + 2);
    const R = RANGE(B) + (B.type === 'turret' ? W.rangeBonus(selB) : 0); if (R) ring(c.x, c.y, R, B.type === 'bridge' || B.type === 'lbridge');
    if (B.type === 'driver' && selB.link >= 0 && W.bt[selB.link]) { const o = W.center(W.bt[selB.link]); gx.strokeStyle = 'rgba(255,211,127,.8)'; gx.lineWidth = lw; gx.beginPath(); gx.moveTo(c.x, c.y); gx.lineTo(o.x, o.y); gx.stroke(); }
  } else if (!selBlock && W.inb(tx, ty)) {
    const i = ty * W.w + tx; if (!W.tb(tx, ty) && W.seen[i] && W.player && W.mineItem(i, W.player.U.mineT)) { gx.strokeStyle = 'rgba(255,255,255,.5)'; gx.lineWidth = lw; gx.strokeRect(tx * TS, ty * TS, TS, TS); }
  }
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(100, now - last); last = now;
  if (!W) { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#111216'; g.fillRect(0, 0, cv.width, cv.height); return; }
  control();
  if (!paused) { acc += dt; let n = 0; while (acc >= 1000 / 60 && n < 4) { W.step(); acc -= 1000 / 60; n++; T++; } if (n === 4) acc = 0; }
  if (W.won) return endGame(true);
  if (W.lost) return endGame(false);
  const p = W.player;
  if (cam.free && !(W.ctl.ax || W.ctl.ay)) { cam.x += (cam.free.x - cam.x) * .15; cam.y += (cam.free.y - cam.y) * .15; }
  else { cam.free = null; if (p && !p.dead) { cam.x += (p.x - cam.x) * .2; cam.y += (p.y - cam.y) * .2; } }
  render(g, W, { cam, cw: cv.width, ch: cv.height, t: T, ter: TER, ui: overlay });
  if (now - saveT > 60000) { saveT = now; saveRun(); }
  if (T % 6 === 0 || paused) hud();
}
requestAnimationFrame(frame);
scr('#menu');
for (const b of ['#mPlay', '#mFree', '#mTech']) $(b).disabled = true;
loadAtlas().then(() => { for (const b of ['#mPlay', '#mFree', '#mTech']) $(b).disabled = false; }, () => { $('.credit').insertAdjacentHTML('beforebegin', '<p class="bad" style="margin-top:14px">A grafika betöltése nem sikerült – frissítsd az oldalt.</p>'); });
window.__KV = { get W() { return W; }, S, start, SECTORS, freeSector, BL: BLOCKS, UN: UNITS, cam, retex() { TER = makeTerrain(W); } };
