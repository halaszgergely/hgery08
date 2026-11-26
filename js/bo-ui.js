// HGWS – Öntöző Birodalom Online: felület (világtérkép, régiók, telkek, Vízvár, negyedek, ostrom).
import { $, $$, esc, toast, errText, avatar } from './core.js?v=202611262023';
import { modal, confirmBox } from './ui.js?v=202611262023';
import * as D from './bo-data.js?v=202611262023';
import * as B from './bo.js?v=202611262023';
import * as Friends from './friends.js?v=202611262023';

let C = null, off = null, tick = null, path = [], pend = false, plotM = null, data = {};
export function init(ctx) { C = ctx; B.init(ctx); }
export function leave() { if (off) off(); off = null; clearInterval(tick); tick = null; if (plotM) { plotM.el.remove(); plotM = null; } const p = $('#page'); if (p) p.onclick = p.onsubmit = p.onfocusout = null; }
const here = () => location.hash.startsWith('#/birodalom');
const name = id => C.U(id)?.name || 'Ismeretlen', R = k => D.RES[k], em = k => D.RES[k][1];
const cost = c => [c.ft ? D.fmt(c.ft) + ' Ft' : '', c.alk ? c.alk + ' ⚙️' : '', c.gep ? c.gep + ' 🤖' : ''].filter(Boolean).join(' · ');
const run = async (p, ok) => { try { const r = await (typeof p === 'function' ? p() : p); if (ok) toast(typeof ok === 'function' ? ok(r) : ok); return r; } catch (e) { toast(typeof e === 'string' ? e : errText(e), true); } };
const go = h => { location.hash = '#/birodalom' + (h ? '/' + h : ''); };
const days = t => Math.max(0, Math.ceil((t - Date.now()) / 864e5));
const bar = (v, max, cls = '') => `<div class="bo-bar ${cls}"><i style="width:${Math.min(100, v / max * 100).toFixed(1)}%"></i></div>`;

export async function render(id) {
  leave(); path = (id || '').split('/').filter(Boolean); data = {};
  document.title = 'Öntöző Birodalom · HGWS';
  const page = $('#page');
  if (C.S.guest) { page.innerHTML = `<div class="pg bo"><div class="empty"><div class="big"><i class="ic ic-droplets"></i></div><b>Öntöző Birodalom Online</b> <span class="bo-beta">CLOSED BETA</span><p>A közös világ regisztrált tagoknak érhető el.</p></div></div>`; return; }
  if (!B.st.ready) page.innerHTML = '<div class="pg bo"><div class="spin" style="margin:5rem auto"></div></div>';
  try { await B.open(); } catch (e) { console.warn('birodalom', e); if (here()) page.innerHTML = `<div class="pg bo"><div class="empty"><b>Nem sikerült betölteni a világot.</b><p>${esc(errText(e))}</p></div></div>`; return; }
  if (!here()) return;
  const rid = path[0]; if (rid && D.REG[rid]?.p) B.watchRegion(rid);
  off = B.on(() => { draw(); if (plotM) plotM.draw(); }); tick = setInterval(ticker, 1000);
  page.onclick = click; page.onsubmit = submit; page.onfocusout = () => { if (pend) setTimeout(draw, 0); };
  draw(true); loadTab();
}

/* ---------- közös fejléc ---------- */
function head(v) {
  const P = v, r = D.rates(B.st.P, B.cx(), Date.now()), L = P.lv + 1, keys = Object.keys(D.RES).filter(k => k !== 'viz' && ((P.inv[k] || 0) >= 1 || r.net[k]));
  const wait = B.st.t0 + D.lvlWait(L) - Date.now(), rid = path[0], Rg = D.REG[rid];
  return `<header class="bo-top"><div><div class="eyebrow">// ${esc(B.st.sid)} szezon · még ${days(D.seasonEnd(B.st.sid))} nap</div><h1 class="gold">Öntöző Birodalom <span class="bo-beta">CLOSED BETA</span></h1></div>
    <div class="bo-me"><span class="bo-chip gold2">${P.lv}. szint</span><span class="bo-chip">💰 <b data-ft>${D.fmt(P.ft)}</b> Ft</span><span class="bo-chip${r.thirst < 1 ? ' bad' : ''}">💧 <b data-r="viz">${D.fmt(P.inv.viz || 0)}</b> <small${(r.net.viz || 0) < 0 ? ' class="neg"' : ''}>${D.perH(r.net.viz || 0)}</small></span>
    ${L <= D.MAX_LV ? `<button class="btn sm goldb" data-a="lvl"${wait > 0 || P.ft < D.lvlCost(L) ? ' disabled' : ''}>${L}. szint · ${D.fmt(D.lvlCost(L))} Ft${wait > 0 ? ' · ' + Math.ceil(wait / 60e3) + ' p' : ''}</button>` : ''}</div></header>
  <nav class="bo-crumb"><a href="#/birodalom"${!rid ? ' class="on"' : ''}><i class="ic ic-globe"></i> Térkép</a><a href="#/birodalom/vizvar"${rid === 'vizvar' ? ' class="on"' : ''}>🏛️ Vízvár</a><a href="#/birodalom/erod"${rid === 'erod' ? ' class="on"' : ''}>🏰 Ostrom</a>${Rg && !['vizvar', 'erod'].includes(rid) ? `<a class="on">${Rg.e} ${esc(Rg.n)}</a>` : ''}
    ${B.st.err ? `<span class="bo-chip bad" title="${esc(B.st.err)}"><i class="ic ic-triangle-alert"></i> nincs mentve</span>` : ''}</nav>
  <div class="bo-inv">${keys.map(k => `<span class="bo-res" title="${esc(R(k)[0])}">${em(k)} <b data-r="${k}">${D.fmt(P.inv[k] || 0)}</b>${r.net[k] ? ` <small class="${r.net[k] < 0 ? 'neg' : ''}">${D.perH(r.net[k])}</small>` : ''}</span>`).join('')}</div>`;
}
function ticker() { if (!here()) return leave(); const v = B.view(); $$('.bo [data-r]').forEach(e => { e.textContent = D.fmt(v.inv[e.dataset.r] || 0); }); $$('.bo [data-ft]').forEach(e => { e.textContent = D.fmt(v.ft); }); }
function draw(force) {
  if (!here() || !B.st.P) return;
  const page = $('#page'), ae = document.activeElement;
  if (force !== true && ae && page.contains(ae) && /INPUT|SELECT|TEXTAREA/.test(ae.tagName)) { pend = true; return; }
  pend = false; const v = B.view(), rid = path[0], sy = scrollY;
  const bodyHtml = !rid ? mapPage(v) : rid === 'vizvar' ? varPage(v) : rid === 'erod' ? raidPage(v) : D.REG[rid]?.p ? regPage(v, rid) : '<div class="empty"><b>Nincs ilyen régió.</b></div>';
  page.innerHTML = `<div class="pg bo${B.st.busy ? ' busy' : ''}">${head(v)}${bodyHtml}</div>`; if (force !== true) scrollTo(0, sy);
}

/* ---------- világtérkép ---------- */
function evChip(rid) { const e = D.eventOf(B.st.sid, rid, Date.now()); return e ? `<span class="bo-ev${e.bad ? ' bad' : ''}">${e.e} ${esc(e.n)}</span>` : ''; }
function droughtCard(v) {
  const d = D.drought(B.st.W, Date.now()), txt = d.on ? (d.saved ? 'Szilárd aszálya megtört a víztornyon – ma minden 20%-kal többet terem.' : 'Szilárd aszálya tombol – a szivattyúk harmadannyi vizet adnak.')
    : d.saved ? `A víztorony megtelt. Aszály: ${days(d.start) <= 1 ? 'holnap' : days(d.start) + ' nap múlva'}.` : `Szilárd aszálya ${days(d.start) <= 1 ? 'holnap' : days(d.start) + ' nap múlva'} jön. Töltsétek fel együtt a víztornyot!`;
  return `<section class="bo-card${d.on && !d.saved ? ' bad' : ''}"><h3>${d.on ? '🦹' : '🗼'} Közös víztorony</h3><p>${txt}</p>${bar(d.v, d.goal, d.saved ? 'ok' : '')}<div class="bo-row"><b>${D.fmt(d.v)} / ${D.fmt(d.goal)} liter</b>
    <form data-f="tower" class="bo-form"><input type="number" name="x" min="1" max="${Math.floor(v.inv.viz || 0)}" placeholder="liter" required><button class="btn sm primary">Betöltöm</button></form></div></section>`;
}
function mapPage(v) {
  const W = B.st.W, mine = {}; for (const p of Object.values(v.pl)) mine[p.r] = (mine[p.r] || 0) + 1;
  const edges = D.EDGES.map(([a, b]) => { const A = D.REG[a], Bb = D.REG[b], id = D.edgeId(a, b), p = W.pipes[id];
    return `<line class="${p ? 'pipe' : ''}" x1="${A.x}" y1="${A.y}" x2="${Bb.x}" y2="${Bb.y}"/>${p ? `<text class="fee" x="${(A.x + Bb.x) / 2}" y="${(A.y + Bb.y) / 2 - 8}">${p.fee} Ft/l</text>` : ''}`; }).join('');
  const nodes = Object.entries(D.REG).map(([id, r]) => { const lock = v.lv < r.lv, e = D.eventOf(B.st.sid, id, Date.now());
    return `<a href="#/birodalom/${id}" class="node${lock ? ' lock' : ''}${mine[id] ? ' mine' : ''}"><circle cx="${r.x}" cy="${r.y}" r="${id === 'vizvar' ? 46 : 38}" style="--c:${r.c}"/><text class="e" x="${r.x}" y="${r.y + 12}">${lock ? '🔒' : r.e}</text>
      <text class="n" x="${r.x}" y="${r.y + (id === 'vizvar' ? 74 : 64)}">${esc(r.n)}</text>${e ? `<text class="ev" x="${r.x + 30}" y="${r.y - 24}">${e.e}</text>` : ''}${mine[id] ? `<text class="cnt" x="${r.x - 30}" y="${r.y - 22}">${mine[id]}×🏡</text>` : ''}</a>`; }).join('');
  const list = Object.entries(D.REG).map(([id, r]) => `<a class="bo-reg${v.lv < r.lv ? ' lock' : ''}" href="#/birodalom/${id}" style="--c:${r.c}"><i>${r.e}</i><b>${esc(r.n)}</b><small>${v.lv < r.lv ? `🔒 ${r.lv}. szint` : mine[id] ? `${mine[id]} telked` : r.kind === 'varos' ? 'főváros' : r.kind === 'raid' ? 'heti ostrom' : r.p ? D.fmt(r.p) + ' Ft / telek' : ''}</small>${evChip(id)}</a>`).join('');
  return `<div class="bo-map"><svg viewBox="0 0 1000 620" role="img" aria-label="Világtérkép">${edges}${nodes}</svg></div>
    <div class="bo-cards">${droughtCard(v)}
      <section class="bo-card"><h3>📜 A szezon szabálya</h3><p>${W.rule ? `<b>${esc(D.RULES[W.rule][0])}</b> – ${esc(D.RULES[W.rule][1])}` : 'Ebben a szezonban nincs érvényben tanácsi szabály.'}</p><a class="btn sm plain" href="#/birodalom/vizvar/tanacs">Vízügyi Tanács</a></section>
      <section class="bo-card"><h3>🏡 Telkeim <small>${Object.keys(v.pl).length} / ${D.plotMax(v.lv)}</small></h3>${Object.keys(v.pl).length ? `<div class="bo-chips">${Object.entries(v.pl).map(([pid, p]) => `<button class="bo-chip" data-a="open" data-pid="${pid}">${D.REG[p.r].e} ${esc(D.REG[p.r].n)} · ${p.lv}. sz.</button>`).join('')}</div>` : '<p>Még nincs telked – kezdd a Locsolóvölgyben!</p><a class="btn sm goldb" href="#/birodalom/volgy">Locsolóvölgy</a>'}</section></div>
    <div class="bo-regs">${list}</div>`;
}

/* ---------- régió ---------- */
function regPage(v, rid) {
  const Rg = D.REG[rid], reg = B.st.regs[rid] || { plots: {} }, me = B.me(), lock = v.lv < Rg.lv;
  let cells = '';
  for (let i = 0; i < D.PLOTS; i++) { const e = reg.plots[i], k = String(i);
    if (!e) cells += `<button class="bo-plot free" data-a="plot" data-k="${k}" title="Szabad telek"${lock ? ' disabled' : ''}>+</button>`;
    else if (e.u === me) { const pl = v.pl[rid + '_' + k] || {}, top = Object.keys(pl.b || {}).sort((a, b) => pl.b[b] - pl.b[a])[0];
      cells += `<button class="bo-plot mine" data-a="open" data-pid="${rid}_${k}" title="Saját telek">${top ? D.BLD[top].e : '🏡'}<small>${e.lv}</small>${(v.cos || []).length ? `<em>${D.COS[v.cos[v.cos.length - 1]][1]}</em>` : ''}</button>`; }
    else { const dry = B.isDry(e), u = C.U(e.u);
      cells += `<button class="bo-plot ${dry ? 'dry' : 'other'}" data-a="plot" data-k="${k}" title="${esc(name(e.u))}${dry ? ' – kiszáradt' : ''}" style="--c:${esc(u?.color || '#6cc6ff')}">${dry ? '🥀' : esc((name(e.u)[0] || '?').toUpperCase())}<small>${e.lv}</small></button>`; } }
  const pipes = D.EDGES.filter(e => e.includes(rid) && !e.includes('erod')).map(e => { const o = e[0] === rid ? e[1] : e[0], id = D.edgeId(...e), p = B.st.W.pipes[id], have = B.myRegs(v).includes(rid);
    return `<div class="bo-line"><span>${D.REG[o].e} <b>${esc(D.REG[o].n)}</b>${p ? ` <small>${esc(name(p.o))} vezetéke · ${p.fee} Ft/l díj</small>` : ' <small>nincs vezeték</small>'}</span>
      ${p ? `<form class="bo-form" data-f="import" data-edge="${id}"><input type="number" name="q" min="1" max="100000" placeholder="liter" required${have ? '' : ' disabled'}><button class="btn sm primary"${have ? '' : ' disabled'}>Behozom · ${D.VIZ_BASE + p.fee} Ft/l</button></form>${p.o === me ? `<form class="bo-form" data-f="fee" data-edge="${id}"><select name="fee">${[0, 1, 2, 3, 4, 5].map(f => `<option${f === p.fee ? ' selected' : ''}>${f}</option>`).join('')}</select><button class="btn sm plain">Díj</button></form>` : ''}`
        : `<form class="bo-form" data-f="pipe" data-edge="${id}"><select name="fee" title="Díj (Ft/liter)">${[0, 1, 2, 3, 4, 5].map(f => `<option${f === 1 ? ' selected' : ''}>${f}</option>`).join('')}</select><button class="btn sm goldb">Megépítem · ${cost({ ft: D.PIPE_FT, alk: D.PIPE_ALK })}</button></form>`}</div>`; }).join('');
  let extra = '';
  if (rid === 'gyar') { const has = Object.values(v.pl).some(p => p.b?.ontomuhely);
    extra = `<section class="bo-card"><h3>🏭 Műhely</h3><div class="bo-line"><span>🏆 <b>Arany Locsolófej</b> <small>7 🔱 + 50 ⚙️${has ? '' : ' · öntőműhely kell'}</small></span><button class="btn sm goldb" data-a="forge"${has && (v.inv.lfd || 0) >= 7 && (v.inv.alk || 0) >= 50 ? '' : ' disabled'}>Kiöntöm</button></div>
      <div class="bo-line"><span>🎈 <b>Léghajó</b> <small>10 🤖 · út a Felhőszigetekre</small></span><button class="btn sm goldb" data-a="airship"${(v.inv.gep || 0) >= 10 && !v.inv.hajo ? '' : ' disabled'}>${v.inv.hajo ? 'Megvan' : 'Megépítem'}</button></div></section>`; }
  if (rid === 'hold' && Object.values(v.pl).some(p => p.b?.csillagkapu)) extra = `<section class="bo-card"><h3>🚀 Csillagkapu</h3><p>Az átjáró nyitva áll a Zero Space felé.</p><a class="btn sm goldb" href="#/arcade/zerospace">Belépek</a></section>`;
  if (rid === 'studio') extra = studioExtra(v);
  return `<section class="bo-reghead" style="--c:${Rg.c}"><div class="bo-rt"><span class="bo-big">${Rg.e}</span><div><h2>${esc(Rg.n)}</h2><p>${esc(Rg.d)}</p></div></div>
      <div class="bo-chips">${evChip(rid)}${Rg.base ? `<span class="bo-chip">${em(Rg.base)} ${esc(R(Rg.base)[0])}</span>` : ''}${D.bldOf(rid).map(b => `<span class="bo-chip">${D.BLD[b].e} ${esc(D.BLD[b].n)}</span>`).join('')}<span class="bo-chip gold2">${D.fmt(Rg.p)} Ft / telek</span>${lock ? `<span class="bo-chip bad">🔒 ${Rg.lv}. szinttől</span>` : ''}</div></section>
    <div class="bo-cols"><div class="bo-grid${lock ? ' lock' : ''}">${cells}</div>
      <div class="bo-side">${pipes ? `<section class="bo-card"><h3><i class="ic ic-waves"></i> Vezetékek</h3>${pipes}</section>` : ''}${extra}</div></div>`;
}
function studioExtra(v) {
  const h = data.hall, W = B.st.W, news = [];
  if (W.rp?.wk) news.push([W.rp.ok ? '🏰 Az erőd elesett!' : '🦹 Szilárd visszaverte az ostromot', 'A múlt heti ostrom bemutatója']);
  const d = D.drought(W, Date.now()); if (d.on) news.push([d.saved ? '🗼 A víztorony megmentette a völgyet' : '🏜️ Aszályhíradó', 'Élő közvetítés']);
  if ((v.inv.alf || 0) > 0) news.push(['🏆 Az Arany Locsolófej legendája', 'A te műhelyedből']);
  return `<section class="bo-card"><h3>🍿 Mozi</h3>${news.map(n => `<div class="bo-line"><span><b>${n[0]}</b> <small>${n[1]}</small></span></div>`).join('') || '<p>Ma nincs bemutató.</p>'}<a class="btn sm plain" href="#/tar"><i class="ic ic-film"></i> Filmtár</a></section>
    <section class="bo-card"><h3>🎁 Dísztárgyak</h3><div class="bo-shop">${Object.entries(D.COS).map(([id, c]) => `<button class="bo-cos${v.cos.includes(id) ? ' own' : ''}" data-a="cos" data-id="${id}"${v.cos.includes(id) || (v.inv.hir || 0) < c[2] ? ' disabled' : ''}><i>${c[1]}</i><b>${esc(c[0])}</b><small>${v.cos.includes(id) ? 'megvan' : c[2] + ' ⭐'}</small></button>`).join('')}</div></section>
    <section class="bo-card"><h3>🗿 A főtér szobrai</h3>${h ? (h.top?.length ? h.top.map((t, i) => `<div class="bo-line"><span>${['🥇', '🥈', '🥉'][i]} <b>${esc(name(t.u))}</b> <small>${D.fmt(t.sc)} pont</small></span></div>`).join('') : '<p>Az első szezon bajnokai kerülnek ide.</p>') : '<div class="spin"></div>'}</section>`;
}

/* ---------- telek ---------- */
function plotHtml(pid) {
  const v = B.view(), pl = v.pl[pid]; if (!pl) return '<p>Ez a telek már nem a tiéd.</p>';
  const [rid, k] = pid.split('_'), Rg = D.REG[rid], e = B.st.regs[rid]?.plots?.[k], age = e ? (Date.now() - B.ms(e.wt)) / 3600e3 : 0, up = D.plotUpCost((pl.lv || 1) + 1);
  const rows = D.bldOf(rid).map(b => { const Bd = D.BLD[b], L = pl.b[b] || 0, max = Bd.max || D.BLD_MAX, c = D.bldCost(b, L + 1);
    const io = [...Object.entries(Bd.out || {}).map(([r, x]) => `${em(r)} ${D.perH(x * Math.max(1, L))}`), ...Object.entries(Bd.use || {}).map(([r, x]) => `${em(r)} ${D.perH(-x * Math.max(1, L))}`), Bd.boost ? `+${Math.round(Bd.boost * Math.max(1, L) * 100)}% a telekre` : '', Bd.pump ? '📜' : ''].filter(Boolean).join(' · ');
    return `<div class="bo-bld${L ? ' on' : ''}"><i>${Bd.e}</i><div><b>${esc(Bd.n)}</b> <span class="bo-lv">${'●'.repeat(L)}${'○'.repeat(max - L)}</span><small>${io}</small></div>
      ${L < max ? `<button class="btn sm ${L ? 'plain' : 'goldb'}" data-a="build" data-b="${b}">${L ? 'Fejlesztés' : 'Építés'} · ${cost(c)}</button>` : '<span class="bo-chip gold2">MAX</span>'}</div>`; }).join('');
  return `<div class="bo-pm"><div class="bo-row"><span class="bo-chip gold2">${pl.lv}. szintű telek</span>${pl.lv < 10 ? `<button class="btn sm plain" data-a="upplot">Bővítés · ${cost(up)}</button>` : ''}
      <span class="bo-chip${age > 48 ? ' bad' : ''}">💧 ${age < 1 ? 'most öntözve' : Math.floor(age) + ' órája öntözve'}</span><button class="btn sm plain" data-a="water">Öntözés · ${D.WATER_COST} 💧</button></div>
    ${Rg.base ? `<div class="bo-bld on"><i>🌱</i><div><b>Kert</b> <span class="bo-lv">${pl.g || 0}. szint</span><small>${em(Rg.base)} ${D.perH(.02 * (1 + .25 * (pl.lv - 1)) * (1 + .05 * (pl.g || 0)))}</small></div><button class="btn sm primary" data-a="garden">Megnyitom</button></div>` : ''}
    ${rid === 'atemelo' ? `<div class="bo-bld on"><i>🎛️</i><div><b>Szivattyúvezérlés</b><small>${pl.mgT > Date.now() - 6 * 3600e3 ? `+${Math.round((pl.mg || 0) * 100)}% hatásfok még ${Math.ceil((pl.mgT + 6 * 3600e3 - Date.now()) / 3600e3)} óráig` : 'alapüzem'}</small></div><button class="btn sm primary" data-a="pump">Vezérlőpult</button></div>` : ''}
    ${rows}<div class="bo-row end"><button class="btn sm danger" data-a="leaveplot">Telek feladása</button></div></div>`;
}
function openPlot(pid) {
  const [rid, k] = pid.split('_'); if (plotM) plotM.el.remove();
  if (!B.st.regs[rid]) B.loadRegion(rid).then(() => plotM && plotM.draw());
  const el = modal({ title: `${D.REG[rid].e} ${D.REG[rid].n} – ${+k + 1}. telek`, cls: 'bo-modal', body: '', onClose: () => { plotM = null; } });
  plotM = { el, pid, draw() { const ae = document.activeElement; if (el.contains(ae) && /INPUT|SELECT/.test(ae.tagName)) return; el.querySelector('.bd').innerHTML = plotHtml(pid); } };
  plotM.draw();
  el.querySelector('.bd').onclick = async e => { const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; const a = b.dataset.a;
    if (a === 'build') await run(B.build(pid, b.dataset.b)); else if (a === 'upplot') await run(B.upPlot(pid)); else if (a === 'water') await run(B.waterPlot(pid), 'Megöntözve.');
    else if (a === 'garden') garden(pid); else if (a === 'pump') pumpGame(pid);
    else if (a === 'leaveplot') { if (await confirmBox('Biztosan feladod ezt a telket? Az épületei elvesznek.', 'Feladom')) { await run(B.leavePlot(pid)); el.close(); } } };
}
function garden(pid) {
  const [rid] = pid.split('_'), e = B.st.regs[rid]?.plots?.[pid.split('_')[1]], w = Math.max(.3, D.REG[rid].wq || .5) * (B.isDry(e) ? .3 : 1);
  modal({ title: 'Kert', cls: 'bo-garden', body: `<iframe src="arcade.html${new URL(import.meta.url).search || '?'}&bo=${B.st.sid}__${pid}&bw=${w.toFixed(2)}#play=birodalom" title="Kert" allow="autoplay; fullscreen"></iframe>` });
}
/* Átemelőtelep – szivattyúvezérlés: tartsd a szintet a két jelző között 40 másodpercig (hiszterézis: BE a felsőnél, KI az alsónál) */
function pumpGame(pid) {
  const pl = B.st.P.pl[pid], plc = pl.b?.plc || 0, lo = 30 - plc * 2, hi = 70 + plc * 2, T = 40;
  const el = modal({ title: 'Szivattyúvezérlés', cls: 'bo-pump', body: `<div class="pg-tank"><i class="pg-fill"></i><u style="bottom:${hi}%">BE ▸</u><u style="bottom:${lo}%">KI ▸</u><em class="pg-alarm">TÚLCSORDULÁS</em></div>
    <div class="pg-side"><div class="bo-chip" data-t>${T} mp</div><div class="bo-chip" data-s>0%</div><button class="btn primary pg-btn" data-p>SZIVATTYÚ: KI</button></div>`, onClose: () => { live = false; removeEventListener('keydown', key); } });
  let live = true, lvl = 50, pump = false, t = 0, good = 0, over = false, last = performance.now(), ph = Math.random() * 6;
  const fill = el.querySelector('.pg-fill'), btn = el.querySelector('[data-p]'), tank = el.querySelector('.pg-tank');
  const toggle = () => { pump = !pump; btn.textContent = 'SZIVATTYÚ: ' + (pump ? 'BE' : 'KI'); btn.classList.toggle('goldb', pump); btn.classList.toggle('primary', !pump); };
  const key = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } };
  btn.onclick = toggle; addEventListener('keydown', key);
  (function loop(now) {
    if (!live) return; const dt = Math.min(.25, (now - last) / 1000); last = now; t += dt;
    const inflow = 9 + 7 * Math.sin(t * .9 + ph) + 5 * Math.sin(t * 2.3 + ph * 2) + (t > 20 ? 4 : 0);
    lvl += (Math.max(1, inflow) - (pump ? 22 : 0)) * dt; if (lvl <= 0) { lvl = 0; } if (lvl >= 100) { lvl = 100; over = true; }
    if (lvl >= lo && lvl <= hi) good += dt;
    fill.style.height = lvl + '%'; tank.classList.toggle('alarm', lvl > 90); tank.classList.toggle('low', lvl < 8 && pump);
    el.querySelector('[data-t]').textContent = Math.max(0, Math.ceil(T - t)) + ' mp'; el.querySelector('[data-s]').textContent = Math.round(good / Math.max(t, .1) * 100) + '%';
    if (t >= T) { live = false; const sc = good / T * .5; el.close(); run(B.pumpResult(pid, sc, over), over ? '🚨 Túlcsordult – a mocsár koszosabb lett.' : `Üzem beállítva: +${Math.round(sc * 100)}% hatásfok 6 órára.`); return; }
    requestAnimationFrame(loop);
  })(last);
}
/* más telke: barátnál látogatás, víz küldése, közvetlen ajánlat */
async function otherPlot(rid, k, e) {
  const fr = Friends.isFriend(e.u), u = C.U(e.u), dry = B.isDry(e), Rg = D.REG[rid];
  const el = modal({ title: `${Rg.e} ${Rg.n} – ${+k + 1}. telek`, cls: 'bo-modal', body: `<div class="bo-row">${u ? avatar(u, 44) : ''}<div><b>${esc(name(e.u))}</b><br><small>${e.lv}. szintű telek${dry ? ' · kiszáradt' : ''}</small></div></div>
    ${dry ? `<div class="bo-row end"><button class="btn goldb" data-a="take">Felvásárlom · ${D.fmt(Rg.p / 4)} Ft</button></div>` : ''}<div data-v>${fr ? '<div class="spin"></div>' : '<p class="bo-muted">Látogatni és közvetlenül kereskedni csak barátokkal lehet. Idegenekkel a vízvári piacon üzletelhetsz.</p>'}</div>` });
  el.querySelector('.bd').onclick = async ev => { const b = ev.target.closest('[data-a]'); if (b?.dataset.a === 'take') { await run(B.buyPlot(rid, k), 'A telek a tiéd.'); el.close(); } };
  el.querySelector('.bd').onsubmit = async ev => { ev.preventDefault(); const q = +new FormData(ev.target).get('q'); await run(B.offer('viz', q, 0, e.u), 'Elküldve – a piacon veheti át.'); el.close(); };
  if (!fr) return;
  const fp = await B.visit(e.u), box = el.querySelector('[data-v]'); if (!box) return;
  box.innerHTML = fp ? `<div class="bo-chips"><span class="bo-chip gold2">${fp.lv}. szint</span><span class="bo-chip">${D.fmt(fp.sc)} pont</span>${fp.cos.map(c => `<span class="bo-chip">${D.COS[c]?.[1] || ''}</span>`).join('')}</div>
    ${Object.values(fp.pl).map(p => `<div class="bo-line"><span>${D.REG[p.r].e} <b>${esc(D.REG[p.r].n)}</b> <small>${p.lv}. szint · kert ${p.g || 0}</small></span><span>${Object.keys(p.b || {}).map(b => D.BLD[b]?.e || '').join(' ')}</span></div>`).join('')}
    <form class="bo-form"><input type="number" name="q" min="1" placeholder="liter" required><button class="btn sm primary">💧 Vizet küldök</button><a class="btn sm plain" href="#/birodalom/vizvar/piac" data-x>Ajánlatot teszek</a></form>` : '<p class="bo-muted">Ebben a szezonban még nem játszott.</p>';
}

/* ---------- Vízvár ---------- */
const TABS = [['piac', '⚖️ Piac'], ['bank', '🏦 Bank'], ['ranglista', '🏆 Ranglista'], ['tanacs', '📜 Tanács'], ['dokk', '🕹️ Arcade-dokk'], ['szovetkezet', '🛡️ Szövetkezet']];
function varPage(v) {
  const tab = path[1] || 'piac';
  return `<section class="bo-reghead" style="--c:${D.REG.vizvar.c}"><div class="bo-rt"><span class="bo-big">🏛️</span><div><h2>Vízvár</h2><p>${esc(D.REG.vizvar.d)}</p></div></div>
    <div class="bo-tabs">${TABS.map(([k, l]) => `<a href="#/birodalom/vizvar/${k}"${k === tab ? ' class="on"' : ''}>${l}</a>`).join('')}</div></section>
    ${tab === 'bank' ? bankTab(v) : tab === 'ranglista' ? topTab() : tab === 'tanacs' ? councilTab(v) : tab === 'dokk' ? dockTab(v) : tab === 'szovetkezet' ? coopTab(v) : marketTab(v)}`;
}
function loadTab() {
  const rid = path[0], tab = path[1] || 'piac', done = () => { if (here()) draw(); };
  if (rid === 'vizvar' && tab === 'piac') B.loadDeals().then(d => { data.deals = d; done(); });
  if (rid === 'vizvar' && (tab === 'ranglista' || tab === 'tanacs')) B.loadTop().then(t => { data.top = t; done(); });
  if (rid === 'vizvar' && tab === 'szovetkezet' && path[2]) B.getCoop(path[2]).then(c => { data.inv = c || {}; done(); });
  if (rid === 'studio') B.loadHall().then(h => { data.hall = h; done(); });
}
const dealRow = (d, btn) => `<div class="bo-line"><span>${d.k === 'toll' ? `💧 <b>Vezetékdíj</b> <small>${D.fmt(d.q)} liter · ${esc(name(d.b))}</small>` : `${em(d.res)} <b>${D.fmt(d.q)} ${esc(R(d.res)[0].toLowerCase())}</b> <small>${d.s !== B.me() ? esc(name(d.s)) : d.b ? 'megvette: ' + esc(name(d.b)) : d.to ? esc(name(d.to)) + ' részére' : 'nyilvános'}</small>`}</span><span class="bo-row"><b>${d.p ? D.fmt(d.p) + ' Ft' : 'ajándék'}</b>${btn}</span></div>`;
function marketTab(v) {
  const dl = data.deals, mine = Object.keys(v.inv).filter(k => D.TRADE.includes(k) && v.inv[k] >= 1), fr = Friends.friends();
  return `<div class="bo-cols"><div><section class="bo-card"><h3>Új ajánlat</h3><form class="bo-form wrap" data-f="offer"><select name="res" required>${mine.map(k => `<option value="${k}">${em(k)} ${esc(R(k)[0])} (${D.fmt(v.inv[k])})</option>`).join('')}</select>
        <input type="number" name="q" min="1" placeholder="mennyiség" required><input type="number" name="p" min="0" placeholder="ár összesen (Ft)" required>
        <select name="to"><option value="">Nyilvános piac</option>${fr.map(u => `<option value="${esc(u.id)}">Csak neki: ${esc(u.name)}</option>`).join('')}</select><button class="btn sm goldb"${mine.length ? '' : ' disabled'}>Meghirdetem</button></form></section>
      <section class="bo-card"><h3>Saját ajánlataim</h3>${!dl ? '<div class="spin"></div>' : dl.mine.length ? dl.mine.map(d => dealRow(d, d.st === 'sold' ? `<button class="btn sm goldb" data-a="collect" data-id="${d.id}">Felveszem</button>` : `<button class="btn sm plain" data-a="cancel" data-id="${d.id}">Visszavonom</button>`)).join('') : '<p class="bo-muted">Nincs élő ajánlatod.</p>'}</section></div>
    <div>${dl && dl.forMe.length ? `<section class="bo-card"><h3>🤝 Barátoktól</h3>${dl.forMe.map(d => dealRow(d, `<button class="btn sm primary" data-a="buy" data-id="${d.id}">${d.p ? 'Megveszem' : 'Átveszem'}</button>`)).join('')}</section>` : ''}
      <section class="bo-card"><h3>Nyilvános piac</h3>${!dl ? '<div class="spin"></div>' : dl.pub.length ? dl.pub.map(d => dealRow(d, `<button class="btn sm primary" data-a="buy" data-id="${d.id}"${v.ft < d.p ? ' disabled' : ''}>Megveszem</button>`)).join('') : '<p class="bo-muted">Most senki nem árul semmit.</p>'}</section></div></div>`;
}
function bankTab(v) {
  const rows = D.TRADE.filter(k => D.RES[k][2] > 0 && (v.inv[k] || 0) >= 1);
  return `<div class="bo-cols"><section class="bo-card"><h3>📜 Vízjog</h3><p>${v.inv.vjog || 0} vízjogod van, ebből ${B.pumps(v)} szivattyún.</p><button class="btn sm goldb" data-a="vjog"${v.ft < B.vjogPrice() ? ' disabled' : ''}>Vízjog · ${D.fmt(B.vjogPrice())} Ft</button></section>
    <section class="bo-card"><h3>🏦 Állami felvásárló</h3>${rows.length ? rows.map(k => `<div class="bo-line"><span>${em(k)} <b>${esc(R(k)[0])}</b> <small>${D.fmt(v.inv[k])} db · ${B.sellPrice(k).toLocaleString('hu-HU')} Ft/db</small></span>
      <form class="bo-form" data-f="sell" data-res="${k}"><input type="number" name="q" min="1" max="${Math.floor(v.inv[k])}" value="${Math.floor(v.inv[k])}" required><button class="btn sm primary">Eladom</button></form></div>`).join('') : '<p class="bo-muted">Nincs eladható árud.</p>'}</section></div>`;
}
function topTab() {
  const t = data.top; if (!t) return '<div class="spin" style="margin:2rem auto"></div>';
  return `<section class="bo-card">${t.map((p, i) => `<div class="bo-line${p.uid === B.me() ? ' me' : ''}"><span class="bo-row"><i class="bo-rank">${['🥇', '🥈', '🥉'][i] || i + 1}</i>${C.U(p.uid) ? avatar(C.U(p.uid), 30) : ''}<a href="#/profil/${esc(p.uid)}"><b>${esc(name(p.uid))}</b></a><small>${p.lv}. szint${p.inv?.alf ? ' · 🏆×' + p.inv.alf : ''}</small></span><b>${D.fmt(p.sc)} pont</b></div>`).join('') || '<p class="bo-muted">Még senki.</p>'}</section>`;
}
function councilTab(v) {
  const W = B.st.W, t = data.top || [], cands = [...new Set([...t.filter(p => p.cand).map(p => p.uid), ...Object.keys(W.cv || {})])].map(u => ({ u, prog: t.find(p => p.uid === u)?.prog || '', n: W.cv[u] || 0 })).sort((a, b) => b.n - a.n);
  return `<div class="bo-cols"><section class="bo-card"><h3>📜 Vízügyi Tanács</h3><p>${W.rule ? `Érvényben: <b>${esc(D.RULES[W.rule][0])}</b> – ${esc(D.RULES[W.rule][1])}` : 'Most nincs érvényben tanácsi szabály.'}</p>
      <p class="bo-muted">A választás a hónap ${D.VOTE_DAY}. napján nyílik. A legtöbb szavazatot kapott program lesz a következő szezon szabálya.</p>
      ${v.cand ? `<span class="bo-chip gold2">Jelölt vagy: ${esc(D.RULES[v.prog]?.[0] || '')}</span>` : `<form class="bo-form wrap" data-f="cand"><select name="prog" required>${Object.entries(D.RULES).map(([k, r]) => `<option value="${k}">${esc(r[0])} – ${esc(r[1])}</option>`).join('')}</select><button class="btn sm goldb">Indulok</button></form>`}</section>
    <section class="bo-card"><h3>Jelöltek</h3>${!data.top ? '<div class="spin"></div>' : cands.length ? cands.map(c => `<div class="bo-line"><span class="bo-row">${C.U(c.u) ? avatar(C.U(c.u), 30) : ''}<b>${esc(name(c.u))}</b><small>${esc(D.RULES[c.prog]?.[0] || '')}</small></span><span class="bo-row"><b>${c.n} szavazat</b>${!v.voted && B.canVote() && c.prog ? `<button class="btn sm primary" data-a="vote" data-u="${esc(c.u)}" data-prog="${c.prog}">Rá szavazok</button>` : ''}</span></div>`).join('') : '<p class="bo-muted">Még nincs jelölt.</p>'}${v.voted ? '<span class="bo-chip">Leadtad a szavazatodat.</span>' : ''}</section></div>`;
}
const GAME_N = { locsolo: 'Locsoló Mester', nyomas: 'Nyomásmester', vizagyu: 'Vízágyú', csepp: 'Csepp Futam', viztorony: 'Víztorony', drift: 'Drift Király', holtvaros: 'Holtváros' };
function dockTab(v) {
  const g = D.dockGame(), done = v.ad === D.dayStr();
  return `<section class="bo-card"><h3>🕹️ A nap gépe: ${esc(GAME_N[g])}</h3><p>Dönts ma rekordot rajta – jutalmad 1 📜 vízjog és 300 Ft.</p><div class="bo-row"><a class="btn sm primary" href="#/arcade/${g}"><i class="ic ic-play"></i> Játszom</a><button class="btn sm goldb" data-a="dock"${done ? ' disabled' : ''}>${done ? 'Ma már felvetted' : 'Jutalom felvétele'}</button></div></section>`;
}
const CIMER = ['💧', '🔱', '🌊', '🌻', '⚙️', '🛡️', '🐟', '🌵', '☁️', '🌙'];
function coopTab(v) {
  const c = B.st.coop, me = B.me(), inv = data.inv;
  if (!c) return `<div class="bo-cols">${inv?.id ? `<section class="bo-card"><h3>${esc(inv.cr)} ${esc(inv.n)}</h3><p>${inv.m.length} tag · alapító: ${esc(name(inv.o))}</p>${(inv.inv || []).includes(me) ? `<button class="btn sm goldb" data-a="cjoin" data-id="${esc(inv.id)}">Belépek</button>` : '<p class="bo-muted">Ide csak meghívóval lehet belépni.</p>'}</section>` : ''}
    <section class="bo-card"><h3>Szövetkezet alapítása</h3><form class="bo-form wrap" data-f="coop"><input name="n" minlength="3" maxlength="24" placeholder="Név" required><select name="cr">${CIMER.map(x => `<option>${x}</option>`).join('')}</select><button class="btn sm goldb"${v.lv < 3 ? ' disabled' : ''}>Megalapítom · ${D.fmt(D.COOP_FT)} Ft</button></form>${v.lv < 3 ? '<p class="bo-muted">A 3. szinttől.</p>' : ''}</section></div>`;
  const own = c.o === me, fr = Friends.friends().filter(u => !c.m.includes(u.id) && !(c.inv || []).includes(u.id)), act = c.m.length >= 4;
  const bl = (k, n, e, goal, what) => `<div class="bo-line"><span>${e} <b>${n}</b> <small>${what}</small></span><span class="bo-chip${(c.p[k] || 0) >= goal ? ' gold2' : ''}">${Math.min(goal, c.p[k] || 0)} / ${goal} ⚙️</span></div>${bar(c.p[k] || 0, goal, (c.p[k] || 0) >= goal ? 'ok' : '')}
    ${(c.p[k] || 0) < goal ? `<form class="bo-form" data-f="cgive" data-k="${k}"><input type="number" name="x" min="1" max="${Math.floor(v.inv.alk || 0)}" placeholder="alkatrész" required><button class="btn sm primary">Beadom</button></form>` : ''}`;
  return `<div class="bo-cols"><section class="bo-card"><h3>${esc(c.cr)} ${esc(c.n)} <small>${c.m.length} / 10 tag</small></h3>${act ? '' : '<p class="bo-muted">A közös építmények 4 tagtól működnek.</p>'}
      ${c.m.map(u => `<div class="bo-line"><span class="bo-row">${C.U(u) ? avatar(C.U(u), 30) : ''}<b>${esc(name(u))}</b>${u === c.o ? '<small>alapító</small>' : ''}</span>${own && u !== me ? `<button class="btn sm plain" data-a="ckick" data-u="${esc(u)}">Kizárom</button>` : ''}</div>`).join('')}
      ${(c.inv || []).length ? `<p class="bo-muted">Meghívva: ${c.inv.map(u => esc(name(u))).join(', ')}</p>` : ''}
      ${own && c.m.length < 10 ? `<form class="bo-form" data-f="cinv"><select name="u" required>${fr.map(u => `<option value="${esc(u.id)}">${esc(u.name)}</option>`).join('')}</select><button class="btn sm goldb"${fr.length ? '' : ' disabled'}>Meghívom</button></form>` : ''}
      <div class="bo-row end"><button class="btn sm danger" data-a="cleave">Kilépek</button></div></section>
    <section class="bo-card"><h3>Közös építmények</h3>${bl('torony', 'Víztorony', '🗼', 200, '+10% víz minden tag szivattyújára')}${bl('portal', 'Vízportál', '🌀', 500, 'út a Felhőszigetekre léghajó nélkül')}</section></div>`;
}

/* ---------- Szilárd erődje ---------- */
function raidPage(v) {
  const W = B.st.W, wk = D.weekOf(), dmg = B.raidNow(), mine = v.rd.wk === wk ? v.rd.d : 0, fell = dmg >= D.RAID_HP, lock = v.lv < D.REG.erod.lv, pendR = v.rd.wk && v.rd.wk < wk && !v.rd.cl;
  return `<section class="bo-reghead" style="--c:${D.REG.erod.c}"><div class="bo-rt"><span class="bo-big">🏰</span><div><h2>Szilárd erődje</h2><p>${esc(D.REG.erod.d)}</p></div></div></section>
    <div class="bo-cols"><section class="bo-card${fell ? '' : ' bad'}"><h3>${fell ? '🏳️ Az erőd elesett!' : '🦹 Az erőd áll'}</h3>${bar(dmg, D.RAID_HP, fell ? 'ok' : 'red')}<div class="bo-row"><b>${D.fmt(dmg)} / ${D.fmt(D.RAID_HP)} sebzés</b><span class="bo-chip">Te: ${D.fmt(mine)} · ${D.raidTier(mine)} 🔱</span></div>
      ${lock ? `<p class="bo-muted">🔒 A ${D.REG.erod.lv}. szinttől ostromolhatsz.</p>` : `<form class="bo-form wrap" data-f="raid"><input type="number" name="viz" min="0" max="${Math.floor(v.inv.viz || 0)}" placeholder="💧 liter"><input type="number" name="alk" min="0" max="${Math.floor(v.inv.alk || 0)}" placeholder="⚙️ alkatrész (×20)"><button class="btn sm danger">Ostrom!</button></form>`}</section>
    <section class="bo-card"><h3>🔱 Az Arany Locsolófej darabjai</h3><p>${v.inv.lfd || 0} darabod van${v.inv.alf ? ` · ${v.inv.alf} 🏆 Arany Locsolófej` : ''}.</p>${bar((v.inv.lfd || 0) % 7 || ((v.inv.lfd || 0) >= 7 ? 7 : 0), 7, 'ok')}
      <p class="bo-muted">Jutalom a hét végén, ha az erőd elesik: 100 / 600 / 2000 sebzésért 1 / 2 / 3 darab. Hét darabból a Gyárvárosban önthető ki.</p>
      ${W.rp?.wk ? `<span class="bo-chip">Múlt hét: ${W.rp.ok ? 'az erőd elesett' : 'Szilárd kitartott'}</span>` : ''}${pendR ? '<button class="btn sm goldb" data-a="claim">Jutalom felvétele</button>' : ''}</section></div>`;
}

/* ---------- események ---------- */
async function click(e) {
  const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; const a = b.dataset.a, rid = path[0], dl = id => [...(data.deals?.pub || []), ...(data.deals?.mine || []), ...(data.deals?.forMe || [])].find(d => d.id === id);
  const refresh = () => { loadTab(); };
  if (a === 'lvl') await run(B.levelUp(), 'Szintet léptél!');
  else if (a === 'open') openPlot(b.dataset.pid);
  else if (a === 'plot') { const k = b.dataset.k, e2 = B.st.regs[rid]?.plots?.[k], Rg = D.REG[rid];
    if (e2) return otherPlot(rid, k, e2);
    if (await confirmBox(`Megveszed a(z) ${+k + 1}. telket itt: ${Rg.n}? Ára ${D.fmt(Rg.p)} Ft.`, 'Megveszem', false)) { await run(B.buyPlot(rid, k), 'A telek a tiéd.'); if (B.st.P.pl[rid + '_' + k]) openPlot(rid + '_' + k); } }
  else if (a === 'forge') await run(B.forge(), '🏆 Kiöntötted az Arany Locsolófejet!');
  else if (a === 'airship') await run(B.airship(), '🎈 Elkészült a léghajód.');
  else if (a === 'cos') await run(B.buyCos(b.dataset.id), 'Megvetted.');
  else if (a === 'vjog') await run(B.buyVjog(1), '📜 Új vízjogot kaptál.');
  else if (a === 'buy') { await run(B.buyDeal(dl(b.dataset.id)), 'Megvetted.'); refresh(); }
  else if (a === 'cancel') { await run(B.cancelDeal(dl(b.dataset.id)), 'Visszavonva.'); refresh(); }
  else if (a === 'collect') { await run(B.collectDeal(dl(b.dataset.id)), 'Felvetted.'); refresh(); }
  else if (a === 'vote') await run(B.vote(b.dataset.u, b.dataset.prog), 'Szavazat leadva.');
  else if (a === 'dock') await run(B.dock(), '📜 +1 vízjog és 300 Ft.');
  else if (a === 'claim') await run(B.claimRaid());
  else if (a === 'cjoin') await run(B.coopJoin(b.dataset.id), 'Beléptél.');
  else if (a === 'ckick') await run(B.coopKick(b.dataset.u));
  else if (a === 'cleave') { if (await confirmBox('Biztosan kilépsz a szövetkezetből?', 'Kilépek')) await run(B.coopLeave()); }
}
async function submit(e) {
  const f = e.target.closest('[data-f]'); if (!f) return; e.preventDefault();
  const d = Object.fromEntries(new FormData(f)), k = f.dataset.f; document.activeElement?.blur();
  if (k === 'tower') await run(B.tower(+d.x), 'Köszi – a torony telik!');
  else if (k === 'import') await run(B.importWater(f.dataset.edge, +d.q), 'Megérkezett a víz.');
  else if (k === 'pipe') await run(B.pipeBuild(f.dataset.edge, +d.fee), 'Megépült a vezeték.');
  else if (k === 'fee') await run(B.pipeFee(f.dataset.edge, +d.fee), 'Díj átállítva.');
  else if (k === 'offer') { await run(B.offer(d.res, +d.q, +d.p, d.to || ''), 'Meghirdetve.'); loadTab(); }
  else if (k === 'sell') await run(B.sell(f.dataset.res, +d.q), got => `+${D.fmt(got)} Ft`);
  else if (k === 'cand') { await run(B.candidate(d.prog), 'Jelölt lettél.'); loadTab(); }
  else if (k === 'raid') await run(B.raid(+d.viz, +d.alk), dmg => `⚔️ ${D.fmt(dmg)} sebzés!`);
  else if (k === 'coop') await run(B.coopCreate(d.n.trim(), d.cr), 'Megalakult a szövetkezet.');
  else if (k === 'cinv') await run(B.coopInvite(d.u), 'Meghívó elküldve.');
  else if (k === 'cgive') await run(B.coopGive(f.dataset.k, +d.x), 'Beadva.');
  draw();
}
