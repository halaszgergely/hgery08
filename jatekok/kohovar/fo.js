// Kohóvár – főprogram: menük, kutatás, irányítás, kezelőfelület, mentés.
// A Mindustry (Anuke) alapján: https://store.steampowered.com/app/1127400/Mindustry/
import { TS, ITEMS, ITEM_IDS, BLOCKS, CATS, BUILD_ORDER, UNITS, TECH, SECTORS, CAMPAIGNS, FREE_OPTS, FREE_DEF, freeSector, freeRanked } from './adat.js?v=202611261601';
import { World, DX, DY, PLAYER, ENEMY, isPow, buildTime, genMap } from './vilag.js?v=202611261601';
import { floorLayer, render, drawB, ghostOf, minimap, drawUnitShape } from './rajz.js?v=202611261601';

const $ = s => document.querySelector(s), cv = $('#c'), g = cv.getContext('2d');
const KEY = 'kohovar_v1', GAME = 'kohovar';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- mentés ---------- */
let S = (() => { try { return JSON.parse(localStorage.getItem(KEY) || localStorage.getItem('ercfront_v1')) || null; } catch (_) { return null; } })();
if (!S || !S.research) S = { research: TECH.filter(t => !Object.keys(t.cost).length).map(t => t.id), bank: {}, cap: {}, best: 0, runs: {} };
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) { } };
if (S.runs) delete S.runs.vegtelen;
S.free = { ...FREE_DEF, ...(S.free || {}) }; S.seed = S.seed || (Math.random() * 1e9 | 0);
const done = id => (W && W.sec.unlockAll) || S.research.includes(id);

/* ---------- ikonok ---------- */
const ICON = {};
function blockIcon(t) {
  if (ICON[t]) return ICON[t];
  const B = BLOCKS[t], c = document.createElement('canvas'), z = 4; c.width = c.height = B.s * TS * z; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.scale(z, z);
  const fake = { ...ghostOf({ t, x: 0, y: 0, rot: 0, cfg: null }), dItem: 'copper', work: 0 }; fake.g = null;
  drawB(x, null, fake, 0); return (ICON[t] = c.toDataURL());
}
function unitIcon(t) { const k = 'u_' + t; if (ICON[k]) return ICON[k]; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.scale(64 / 24, 64 / 24); drawUnitShape(x, t, PLAYER, 12, 12, -Math.PI / 2, 0, 1.4); return (ICON[k] = c.toDataURL()); }
const itI = k => `<i class="it" style="background:${ITEMS[k].c}"></i>`;
const costHtml = (cost, have) => Object.entries(cost).map(([k, n]) => `<span class="${have && (have[k] || 0) < n ? 'bad' : ''}">${itI(k)}${n}</span>`).join(' ');

/* ---------- állapot ---------- */
let W = null, FLOOR = null, SEC = null, paused = false, acc = 0, last = performance.now(), T = 0;
const cam = { x: 0, y: 0, z: 4 }, keys = new Set(), M = { x: 0, y: 0, wx: 0, wy: 0, l: false, r: false, drag: null, rdrag: null };
let selBlock = null, rot = 0, cat = 'turret', selB = null, hoverBlock = null, saveT = 0;

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
    const goal = `Cél: ${s.win} hullám túlélése`;
    const ores = Object.keys(s.ores).concat(s.sand ? ['sand'] : []).map(k => itI(k)).join('');
    return `<div class="sec ${st}"><h3>${esc(s.n)} ${tag}</h3><div class="mut">${esc(s.d)}</div><div>${ores}</div><div class="mut">${goal}</div><div class="row">${st === 'lock' ? '' : run ? `<button class="b go sm" data-go="${s.id}">Folytatás</button><button class="b sm" data-new="${s.id}">Újrakezdés</button>` : `<button class="b go sm" data-new="${s.id}">${st === 'cap' ? 'Újra' : 'Indítás'}</button>`}</div></div>`;
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

/* ---------- kutatás ---------- */
let techBack = '#menu';
function techAvail() { const a = { ...S.bank }; if (W && !W.sec.free) for (const k in W.core.items) a[k] = (a[k] || 0) + W.core.items[k]; return a; }
function techSpend(cost) {
  for (const k in cost) { let n = cost[k]; if (W && !W.sec.free) { const c = Math.min(n, W.core.items[k] || 0); W.core.items[k] = (W.core.items[k] || 0) - c; n -= c; } S.bank[k] = (S.bank[k] || 0) - n; }
}
function showTech(back) {
  techBack = back; $('#tech').hidden = false; if (back === '#menu') $('#menu').hidden = true; $('#pmenu').hidden = true; drawTech();
}
function drawTech() {
  const av = techAvail(); $('#bank2').innerHTML = bankHtml(W && !W.sec.free ? W.core.items : null);
  const kids = {}; for (const t of TECH) if (t.req) (kids[t.req] = kids[t.req] || []).push(t);
  const pos = {}; let leaf = 0;
  const lay = (t, d) => { const ch = kids[t.id] || []; if (!ch.length) { pos[t.id] = { x: leaf++, y: d }; return; } ch.forEach(c => lay(c, d + 1)); const xs = ch.map(c => pos[c.id].x); pos[t.id] = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: d }; };
  lay(TECH[0], 0);
  const DXp = 132, DYp = 96, maxX = Math.max(...Object.values(pos).map(p => p.x)), maxY = Math.max(...Object.values(pos).map(p => p.y));
  let svg = `<svg width="${(maxX + 1) * DXp + 40}" height="${(maxY + 1) * DYp + 40}">`, html = '';
  for (const t of TECH) {
    const p = pos[t.id], x = 20 + p.x * DXp, y = 20 + p.y * DYp;
    if (t.req) { const q = pos[t.req]; svg += `<line x1="${20 + q.x * DXp + 59}" y1="${20 + q.y * DYp + 60}" x2="${x + 59}" y2="${y}" stroke="${done(t.id) ? '#8c7337' : '#3b3e4a'}" stroke-width="3"/>`; }
    const st = done(t.id) ? 'done' : (!t.req || done(t.req)) ? 'av' : 'lock';
    const name = t.id === 'core' ? 'Mag: Szilánk' : BLOCKS[t.id].n;
    const ok = st === 'av' && Object.entries(t.cost).every(([k, n]) => (av[k] || 0) >= n);
    html += `<div class="tn ${st}" data-t="${t.id}" style="left:${x}px;top:${y}px"><img src="${blockIcon(t.id)}">${esc(name)}${st === 'av' ? `<div class="c">${costHtml(t.cost, av)}</div>${ok ? '' : ''}` : ''}</div>`;
  }
  const tr = $('#tree'), first = !tr.innerHTML; tr.innerHTML = svg + '</svg>' + html;
  if (first) { tr.scrollLeft = 20 + pos.core.x * DXp + 59 - tr.clientWidth / 2; tr.scrollTop = 0; }
}
$('#tree').onclick = e => {
  const n = e.target.closest('.tn'); if (!n || moved > 4) return; const t = TECH.find(q => q.id === n.dataset.t);
  if (done(t.id) || (t.req && !done(t.req))) return; const av = techAvail();
  if (!Object.entries(t.cost).every(([k, q]) => (av[k] || 0) >= q)) return;
  techSpend(t.cost); S.research.push(t.id); persist(); drawTech(); if (W) buildPalette();
};
let moved = 0; { const tr = $('#tree'); let d = null; tr.onpointerdown = e => { d = [e.clientX, e.clientY, tr.scrollLeft, tr.scrollTop]; moved = 0; }; window.addEventListener('pointermove', e => { if (!d) return; moved = Math.hypot(e.clientX - d[0], e.clientY - d[1]); tr.scrollLeft = d[2] - (e.clientX - d[0]); tr.scrollTop = d[3] - (e.clientY - d[1]); }); window.addEventListener('pointerup', () => { d = null; }); }
$('#techBack').onclick = () => { $('#tech').hidden = true; if (techBack === '#menu') scr('#menu'); else if (techBack === '#pmenu') $('#pmenu').hidden = false; };

/* ---------- indítás ---------- */
function start(sec, save) {
  SEC = sec; W = new World(sec, save); FLOOR = floorLayer(W); selB = null; selBlock = null; paused = false;
  W.onWave = n => { W.msg(`${n}. hullám`); if (sec.free && sec.ranked) { if (n > (S.best || 0)) { S.best = n; persist(); } try { if (window.top !== window) parent.postMessage({ hgws: 'score', game: GAME, score: n }, location.origin); } catch (_) { } } };
  const p = W.player; cam.x = p.x; cam.y = p.y;
  scr(null); $('#hud').hidden = false; buildPalette(); saveT = performance.now();
}
const runKey = s => s.free ? 'free' : s.id;
function saveRun() { if (!W || W.lost || W.won) return; S.runs[runKey(SEC)] = W.save(); if (SEC.free) S.freeSec = SEC; persist(); }
function quit() { saveRun(); const f = SEC.free; W = null; $('#hud').hidden = true; f ? showFree() : showSecs(); }
function endGame(won) {
  paused = true; const items = { ...W.core.items };
  if (won && SEC.free) { $('#endT').textContent = 'GYŐZELEM'; $('#endP').textContent = `${SEC.n}: mind a ${W.wave} hullám túlélve, ${W.stats.kills} ellenség megsemmisítve.`; $('#endB').innerHTML = ''; }
  else if (won) { S.cap[SEC.id] = 1; for (const k in items) S.bank[k] = (S.bank[k] || 0) + items[k]; $('#endT').textContent = 'SZEKTOR ELFOGLALVA'; $('#endP').textContent = `${SEC.n}: ${W.wave} hullám túlélve, ${W.stats.kills} ellenség megsemmisítve. A mag készlete a raktárba került:`; $('#endB').innerHTML = Object.keys(items).filter(k => items[k] > 0).map(k => `<span>${itI(k)}${Math.floor(items[k])}</span>`).join(''); }
  else { $('#endT').textContent = 'A MAG ELPUSZTULT'; $('#endP').textContent = `${SEC.n}: ${W.wave}. hullámig jutottál, ${W.stats.kills} ellenség megsemmisítve.`; $('#endB').innerHTML = ''; }
  delete S.runs[runKey(SEC)]; endFree = !!SEC.free; persist(); W = null; $('#hud').hidden = true; scr('#end');
}
let endFree = false;
$('#endOk').onclick = () => endFree ? showFree() : showSecs();

/* ---------- szabad játék ---------- */
function showFree() {
  scr('#free'); const o = S.free, run = S.runs.free;
  $('#fOpts').innerHTML = Object.entries(FREE_OPTS).map(([k, l]) => `<div class="fo"><h2>${{ map: 'Térkép', size: 'Méret', diff: 'Nehézség', wt: 'Hullámidő', win: 'Hullámok', sp: 'Kezdőpontok', ore: 'Érc', start: 'Kezdő készlet', res: 'Kutatás' }[k]}</h2><div class="row">${l.map(x => `<button class="b sm ${o[k] === x[0] ? 'on' : ''}" data-k="${k}" data-v="${x[0]}">${esc(x[1])}</button>`).join('')}</div></div>`).join('')
    + `<div class="fo"><h2>Térképkód</h2><div class="row"><span>${S.seed}</span><button class="b sm" id="fSeed">Új térkép</button></div></div>`;
  $('#fRank').innerHTML = freeRanked(o) ? `<span class="ok">Ranglistás</span> · rekord: ${S.best || 0}. hullám` : '<span class="mut">Nem ranglistás</span>';
  $('#fCont').hidden = !run; if (run) $('#fCont').textContent = `Folytatás (${S.freeSec.n}, ${run.wave}. hullám)`;
  const sec = freeSector(o, S.seed), m = genMap(sec), fl = floorLayer({ ...m, w: sec.w, h: sec.h }), pc = $('#fPrev'); pc.width = sec.w * 2; pc.height = sec.h * 2; const pg = pc.getContext('2d'); pg.imageSmoothingEnabled = true; pg.drawImage(fl, 0, 0, pc.width, pc.height); pg.fillStyle = '#ffd37f'; pg.fillRect((m.coreAt.x) * 2, m.coreAt.y * 2, 6, 6);
}
$('#fOpts').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.id === 'fSeed') S.seed = Math.random() * 1e9 | 0; else { const k = b.dataset.k, v = b.dataset.v; S.free[k] = typeof FREE_DEF[k] === 'number' ? +v : v; } persist(); showFree(); };
$('#fGo').onclick = e => { const b = e.currentTarget; if (S.runs.free && b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Biztos? A folyamatban lévő játék elvész'; return; } b.dataset.sure = ''; b.textContent = 'Indítás'; delete S.runs.free; const sec = freeSector(S.free, S.seed); S.freeSec = sec; persist(); start(sec, null); };
$('#fCont').onclick = () => start(S.freeSec, S.runs.free);

/* ---------- paletta ---------- */
function buildPalette() {
  $('#cats').innerHTML = CATS.map(([id, n, ic]) => BUILD_ORDER[id].some(done) ? `<button data-c="${id}" class="${id === cat ? 'on' : ''}" title="${esc(n)}">${ic}</button>` : '').join('');
  const l = BUILD_ORDER[cat].filter(done);
  $('#blks').innerHTML = l.map(t => `<div class="bk ${t === selBlock ? 'on' : ''} ${W && !W.has(BLOCKS[t].cost) ? 'no' : ''}" data-b="${t}"><img src="${blockIcon(t)}"></div>`).join('');
  document.documentElement.style.setProperty('--palh', $('#pal').offsetHeight + 'px');
}
$('#cats').onclick = e => { const b = e.target.closest('button'); if (!b) return; cat = b.dataset.c; buildPalette(); };
$('#blks').onclick = e => { const b = e.target.closest('.bk'); if (!b) return; selBlock = selBlock === b.dataset.b ? null : b.dataset.b; selB = null; buildPalette(); showInfo(selBlock); };
$('#blks').onmouseover = e => { const b = e.target.closest('.bk'); hoverBlock = b ? b.dataset.b : null; showInfo(hoverBlock || selBlock); };
$('#blks').onmouseleave = () => { hoverBlock = null; showInfo(selBlock); };
function stats(B) {
  const o = [];
  if (B.type === 'turret') { o.push(`Hatótáv: ${(B.range / TS).toFixed(1)} mező`); o.push(`${B.ground ? 'Földi' : ''}${B.ground && B.air ? ' és ' : ''}${B.air ? 'légi' : ''} célok`); if (B.ammo) o.push('Lőszer: ' + Object.entries(B.ammo).map(([k, a]) => `${itI(k)}${a.d}${a.spl ? ' (rob.)' : ''}`).join(' ')); if (B.laser) o.push(`Sebzés: ${B.laser.d}`); if (B.arcd) o.push(`Sebzés: ${B.arcd}`); }
  if (B.type === 'drill') o.push(`Szint: ${B.tier} – ${ITEM_IDS.filter(k => ITEMS[k].h <= B.tier && ['copper', 'lead', 'sand', 'coal', 'scrap', 'titanium', 'thorium'].includes(k)).map(itI).join('')}`, `Sebesség (teljes ércen): ${(60 / (B.time + 50) * B.s * B.s).toFixed(2)}/mp`);
  if (B.type === 'crafter') o.push(`${Object.entries(B.inp).map(([k, n]) => itI(k) + n).join(' + ')} → ${Object.entries(B.out).map(([k, n]) => itI(k) + n).join('')} · ${(B.time / 60).toFixed(2)} mp`);
  if (B.type === 'conveyor') o.push(`${B.speed} tárgy/mp`);
  if (B.power) o.push(`Áram: ${(B.power * 60).toFixed(0)}/mp`);
  if (B.gen) o.push(`Termel: ${(B.gen * 60).toFixed(0)}/mp${B.burn ? ' (szén)' : ''}`);
  if (B.type === 'node') o.push(`Hatótáv: ${B.range} mező, ${B.links} kapcsolat`);
  if (B.type === 'battery') o.push(`Kapacitás: ${B.capP}`);
  if (B.type === 'bridge') o.push(`Hatótáv: ${B.range} mező`);
  if (B.type === 'factory') o.push('Egységek: ' + B.plans.map(u => UNITS[u].n).join(', '));
  if (B.type === 'storage') o.push(`${B.cap} / anyag`);
  if (B.type === 'mender') o.push(`Hatótáv: ${B.range} mező`);
  o.push(`Életerő: ${B.hp}`);
  return o.map(s => `<div class="st">${s}</div>`).join('');
}
function showInfo(t) {
  const el = $('#info'); if (!t || !W) { el.hidden = true; return; } const B = BLOCKS[t];
  el.hidden = false; el.innerHTML = `<h3>${esc(B.n)}</h3><div>${costHtml(B.cost, W.core.items)}</div>${stats(B)}`;
}

/* ---------- kiválasztott épület ---------- */
function selHtml() {
  const b = selB; if (!b || b.dead) { $('#sel').hidden = true; selB = null; return; }
  const B = b.B; let h = `<h3><span>${esc(B.n)}</span><button class="b sm" data-x="1">✕</button></h3><div class="bar"><i style="width:${b.hp / B.hp * 100}%;background:#ff6b5a"></i></div>`;
  const its = Object.keys(b.items).filter(k => b.items[k] > 0 && b !== W.core);
  if (its.length) h += `<div>${its.map(k => `${itI(k)}${Math.floor(b.items[k])}`).join(' ')}</div>`;
  if (b.ammo && b.B.ammo) h += `<div>Lőszer: ${b.ammo.map(a => itI(a.it) + a.n).join(' ') || '<span class="bad">nincs</span>'}</div>`;
  if (b.B.type === 'drill') h += `<div>${b.dItem ? `${itI(b.dItem)} ${(60 / ((B.time + 50 * ITEMS[b.dItem].h) / b.dCnt) * (B.power ? b.ps : 1)).toFixed(2)}/mp` : ''}</div>`;
  if (b.g) h += `<div class="mut">Hálózat: +${(b.g.prod * 60).toFixed(0)} / −${(b.g.need * 60).toFixed(0)}${b.g.cap ? ` · akku ${Math.floor(b.g.stored)}/${b.g.cap}` : ''}</div><div class="bar"><i style="width:${b.g.sat * 100}%"></i></div>`;
  if (B.cfg === 'item') h += `<div class="ipick">${ITEM_IDS.map(k => `<button class="${b.cfg === k ? 'on' : ''}" data-i="${k}" title="${ITEMS[k].n}"><i style="background:${ITEMS[k].c}"></i></button>`).join('')}</div>`;
  if (B.type === 'factory') { const U = UNITS[B.plans[b.cfg || 0]]; h += `<div class="ipick">${B.plans.map((u, i) => `<button class="${(b.cfg || 0) === i ? 'on' : ''}" data-u="${i}" title="${UNITS[u].n}" style="width:34px;height:34px"><img src="${unitIcon(u)}" style="width:26px"></button>`).join('')}</div><div>${U.n}: ${costHtml(U.cost, b.items)}</div><div class="bar"><i style="width:${b.prog * 100}%"></i></div>`; }
  if (b === W.core) h += `<div class="mut">Tárhely: ${B.cap} / anyag</div>`;
  $('#sel').hidden = false; if ($('#sel').dataset.h !== h) { $('#sel').innerHTML = h; $('#sel').dataset.h = h; }
}
$('#sel').onclick = e => {
  const t = e.target.closest('button'); if (!t || !selB) return;
  if (t.dataset.x) { selB = null; $('#sel').hidden = true; return; }
  if (t.dataset.i) { selB.cfg = selB.cfg === t.dataset.i ? null : t.dataset.i; }
  if (t.dataset.u) { selB.cfg = +t.dataset.u; selB.prog = 0; }
  selHtml();
};

/* ---------- bevitel ---------- */
const tileAt = (wx, wy) => [Math.floor(wx / TS), Math.floor(wy / TS)];
function originOf(t, tx, ty) { const s = BLOCKS[t].s, o = Math.floor((s - 1) / 2); return [tx - o, ty - o]; }
function linePlans(t, a, b) {
  const B = BLOCKS[t], s = B.s, out = []; let [x, y] = a; const [x2, y2] = b;
  const horizFirst = Math.abs(x2 - x) >= Math.abs(y2 - y);
  const pts = [[x, y]];
  const stepTo = (axis) => { if (axis === 0) while (Math.abs(x2 - x) >= s) { x += Math.sign(x2 - x) * s; pts.push([x, y]); } else while (Math.abs(y2 - y) >= s) { y += Math.sign(y2 - y) * s; pts.push([x, y]); } };
  if (horizFirst) { stepTo(0); stepTo(1); } else { stepTo(1); stepTo(0); }
  for (let k = 0; k < pts.length; k++) {
    let r = rot;
    if (B.type === 'conveyor' && pts.length > 1) { const [px, py] = pts[k], [qx, qy] = k + 1 < pts.length ? pts[k + 1] : pts[k - 1]; const ddx = k + 1 < pts.length ? qx - px : px - qx, ddy = k + 1 < pts.length ? qy - py : py - qy; r = ddx > 0 ? 0 : ddx < 0 ? 2 : ddy > 0 ? 1 : 3; }
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
  const b = W.tb(tx, ty);
  if (selB && b && b !== selB && linkClick(selB, b)) return;
  if (b) { selB = b; selHtml(); return; }
  const i = ty * W.w + tx;
  if (W.inb(tx, ty) && W.mineItem(i, 1)) { if (W.player) W.player.mine = W.player.mine === i ? -1 : i; return; }
  selB = null; $('#sel').hidden = true; M.l = true;
});
window.addEventListener('pointermove', e => { updMouse(e); });
window.addEventListener('pointerup', e => {
  if (!W) { M.l = false; return; }
  updMouse(e); const [tx, ty] = tileAt(M.wx, M.wy);
  if (e.button === 0) { M.l = false; if (M.drag && selBlock) { for (const p of linePlans(selBlock, M.drag, [tx, ty])) W.plan(p.t, p.x, p.y, p.rot); } M.drag = null; }
  if (e.button === 2 && M.rdrag) {
    const [ax, ay] = M.rdrag, x0 = Math.min(ax, tx), x1 = Math.max(ax, tx), y0 = Math.min(ay, ty), y1 = Math.max(ay, ty), seen = new Set();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (W.cancelAt(x, y)) continue; const b = W.tb(x, y); if (b && !seen.has(b)) { seen.add(b); W.unplan(b); } }
    M.rdrag = null;
  }
});
cv.addEventListener('wheel', e => { e.preventDefault(); cam.z = Math.max(1.5, Math.min(9, cam.z * (e.deltaY > 0 ? .88 : 1.14))); }, { passive: false });
function pickAt(tx, ty) { const b = W.tb(tx, ty); if (!b || b.t === 'core' || !done(b.t)) return; selBlock = b.t; rot = b.rot; cat = BLOCKS[b.t].kat; buildPalette(); showInfo(selBlock); }
function linkClick(a, b) {
  if (a.B.type === 'node' && isPow(b)) { const ca = W.center(a), cb = W.center(b); if (Math.hypot(ca.x - cb.x, ca.y - cb.y) - b.B.s * TS / 2 <= a.B.range * TS) { W.toggleLink(a, b); selHtml(); return true; } }
  if (a.B.type === 'bridge' && b.B.type === 'bridge') { if ((a.x === b.x || a.y === b.y) && Math.abs(a.x - b.x) + Math.abs(a.y - b.y) <= a.B.range) { a.link = a.link === b.i ? -1 : b.i; if (b.link === a.i) b.link = -1; selB = b; selHtml(); return true; } }
  return false;
}
window.addEventListener('keydown', e => {
  if (!W) return; const k = e.key.toLowerCase(); keys.add(k);
  if (k === 'r') { rot = (rot + (e.shiftKey ? 3 : 1)) % 4; }
  if (k === 'q') { const [tx, ty] = tileAt(M.wx, M.wy); pickAt(tx, ty); }
  if (k === ' ') { e.preventDefault(); togglePause(); }
  if (k === 'escape') { if (selBlock || selB) { selBlock = null; selB = null; $('#sel').hidden = true; buildPalette(); showInfo(null); } else openPM(); }
  if (k === 'e' && selB && selB.t !== 'core') W.unplan(selB);
  if (/^[1-9]$/.test(k)) { const l = BUILD_ORDER[cat].filter(done), t = l[+k - 1]; if (t) { selBlock = t; buildPalette(); showInfo(t); } }
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); M.l = false; });
function togglePause() { paused = !paused; $('#paused').hidden = !paused; }
function openPM() { paused = true; scr('#pmenu'); }
$('#bPause').onclick = togglePause; $('#bMenu').onclick = openPM; $('#bTech').onclick = () => { paused = true; showTech(null); };
$('#pRes').onclick = () => { $('#pmenu').hidden = true; paused = false; $('#paused').hidden = true; };
$('#pTech').onclick = () => showTech('#pmenu');
$('#pSave').onclick = () => { $('#pmenu').hidden = true; quit(); };
$('#pAband').onclick = e => { const b = e.currentTarget; if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Biztos? A szektor elvész'; return; } b.dataset.sure = ''; b.textContent = 'Szektor feladása'; $('#pmenu').hidden = true; endGame(false); };
$('#techBack').addEventListener('click', () => { if (techBack === null && W) paused = false; });
$('#skip').onclick = () => { if (W && (!SEC.win || W.wave < SEC.win)) W.nextWave(); };
$('#mini').onclick = e => { if (!W) return; const r = e.target.getBoundingClientRect(); cam.free = { x: (e.clientX - r.left) / r.width * W.w * TS, y: (e.clientY - r.top) / r.height * W.h * TS, t: 180 }; };
window.addEventListener('beforeunload', saveRun);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveRun(); });

/* ---------- HUD ---------- */
let palSig = '';
function hud() {
  const w = W, wt = Math.max(0, Math.ceil(w.wtimer / 60));
  $('#wn').textContent = SEC.endless ? `${w.wave}. HULLÁM` : `HULLÁM ${w.wave} / ${SEC.win}`;
  $('#wt').textContent = SEC.win && w.wave >= SEC.win ? 'Utolsó hullám' : `Következő: ${Math.floor(wt / 60)}:${String(wt % 60).padStart(2, '0')}`;
  const en = w.enemies(); $('#en').innerHTML = en ? `<span class="bad">${en} ellenség</span>` : '';
  $('#skip').disabled = !!(SEC.win && w.wave >= SEC.win);
  const it = w.core.items; $('#items').innerHTML = ITEM_IDS.filter(k => it[k] > 0).map(k => `<span>${itI(k)}${Math.floor(it[k])}</span>`).join('');
  $('#msgs').innerHTML = w.msgs.slice(-4).map(m => `<div class="box ${m.c}">${esc(m.t)}</div>`).join('');
  if (selB) selHtml();
  if (selBlock || hoverBlock) showInfo(hoverBlock || selBlock);
  minimap($('#mini'), w, FLOOR);
  const sig = cat + selBlock + BUILD_ORDER[cat].map(t => done(t) && w.has(BLOCKS[t].cost) ? 1 : 0).join('');
  if (sig !== palSig) { palSig = sig; buildPalette(); }
}

/* ---------- ciklus ---------- */
function resize() { cv.width = innerWidth; cv.height = innerHeight; }
addEventListener('resize', resize); resize();
function control() {
  const c = W.ctl; c.ax = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0); c.ay = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
  c.mx = M.wx; c.my = M.wy; c.shoot = M.l && !selBlock;
}
function overlay(gx, z) {
  const t = T;
  // kurzor-előnézet
  const [tx, ty] = tileAt(M.wx, M.wy);
  if (selBlock) {
    const list = M.drag ? linePlans(selBlock, M.drag, [tx, ty]) : [{ t: selBlock, ...(([x, y]) => ({ x, y }))(originOf(selBlock, tx, ty)), rot }];
    for (const p of list) {
      const B = BLOCKS[p.t], ok = W.canPlace(p.t, p.x, p.y, p.rot) || (W.tb(p.x, p.y)?.t === p.t && B.type === 'conveyor'), s = B.s * TS;
      gx.globalAlpha = .55; drawB(gx, W, ghostOf(p), t); gx.globalAlpha = 1;
      gx.strokeStyle = ok ? '#84f491' : '#ff5a4d'; gx.lineWidth = 1 / z * 1.5; gx.strokeRect(p.x * TS, p.y * TS, s, s);
      if (B.rot || B.type === 'factory') { const cx = (p.x + B.s / 2) * TS, cy = (p.y + B.s / 2) * TS; gx.fillStyle = ok ? '#84f491' : '#ff5a4d'; gx.save(); gx.translate(cx, cy); gx.rotate(p.rot * Math.PI / 2); gx.beginPath(); gx.moveTo(s / 2 + 2.5, 0); gx.lineTo(s / 2, -2); gx.lineTo(s / 2, 2); gx.fill(); gx.restore(); }
    }
    const B = BLOCKS[selBlock], [ox, oy] = originOf(selBlock, tx, ty), cx = (ox + B.s / 2) * TS, cy = (oy + B.s / 2) * TS, R = B.type === 'turret' ? B.range : B.type === 'node' ? B.range * TS : B.type === 'mender' ? B.range * TS : 0;
    if (R && !M.drag) { gx.strokeStyle = 'rgba(255,211,127,.6)'; gx.lineWidth = 1 / z * 1.5; gx.setLineDash([3, 3]); gx.beginPath(); gx.arc(cx, cy, R, 0, 7); gx.stroke(); gx.setLineDash([]); }
  }
  if (M.rdrag) { const [ax, ay] = M.rdrag, x0 = Math.min(ax, tx), y0 = Math.min(ay, ty), x1 = Math.max(ax, tx) + 1, y1 = Math.max(ay, ty) + 1; gx.fillStyle = 'rgba(255,90,77,.15)'; gx.fillRect(x0 * TS, y0 * TS, (x1 - x0) * TS, (y1 - y0) * TS); gx.strokeStyle = '#ff5a4d'; gx.lineWidth = 1 / z * 1.5; gx.strokeRect(x0 * TS, y0 * TS, (x1 - x0) * TS, (y1 - y0) * TS); }
  if (selB && !selB.dead) {
    const B = selB.B, s = B.s * TS; gx.strokeStyle = '#ffd37f'; gx.lineWidth = 1 / z * 2; gx.strokeRect(selB.x * TS - 1, selB.y * TS - 1, s + 2, s + 2);
    const c = W.center(selB), R = B.type === 'turret' ? B.range + W.rangeBonus(selB) : B.type === 'node' ? B.range * TS : B.type === 'mender' ? B.range * TS : B.type === 'bridge' ? B.range * TS : 0;
    if (R) { gx.strokeStyle = 'rgba(255,211,127,.6)'; gx.lineWidth = 1 / z * 1.5; gx.setLineDash([3, 3]); gx.beginPath(); if (B.type === 'bridge') { gx.rect(c.x - R - 4, c.y - 4, R * 2 + 8, 8); gx.rect(c.x - 4, c.y - R - 4, 8, R * 2 + 8); } else gx.arc(c.x, c.y, R, 0, 7); gx.stroke(); gx.setLineDash([]); }
  } else if (!selBlock && W.inb(tx, ty)) {
    const b = W.tb(tx, ty), i = ty * W.w + tx;
    if (!b && W.mineItem(i, 1)) { gx.strokeStyle = 'rgba(255,255,255,.5)'; gx.lineWidth = 1 / z * 1.5; gx.strokeRect(tx * TS, ty * TS, TS, TS); }
  }
  const p = W.player;
  if (p && !p.dead && !p.building && W.plans.length) { gx.fillStyle = 'rgba(255,211,127,.8)'; }
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
  if (cam.free && cam.free.t-- > 0 && !(W.ctl.ax || W.ctl.ay)) { cam.x += (cam.free.x - cam.x) * .15; cam.y += (cam.free.y - cam.y) * .15; }
  else { cam.free = null; if (p && !p.dead) { cam.x += (p.x - cam.x) * .2; cam.y += (p.y - cam.y) * .2; } }
  render(g, W, { cam, cw: cv.width, ch: cv.height, t: T, floor: FLOOR, ui: overlay });
  if (now - saveT > 60000) { saveT = now; saveRun(); }
  if (T % 6 === 0 || paused) hud();
}
requestAnimationFrame(frame);
scr('#menu');
window.__KV = { get W() { return W; }, S, start, SECTORS };
