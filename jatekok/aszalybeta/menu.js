/* Aszálytúlélő: Nagy Szárazság – menük, szintlépés, Tanácsi Kút, főciklus */
import * as J from './jatek.js?v=202611272153';
import { CHARS, SIG, SIGEVO, META as MDEF, AG_NEED, SEALS, PASS, WEAP, EVON } from './adat.js?v=202611272153';
const $ = s => document.querySelector(s), esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const scr = id => { for (const el of document.querySelectorAll('.scr')) el.hidden = el.id !== id; };
let M = J.META, selCh = M.lastCh || 'gh', selSeal = M.seal || '', banMode = false;

const unlocked = c => !c.req || M.flags[c.req] || M.flags.betaAll;
const flag = f => { if (!M.flags[f]) { M.flags[f] = 1; J.saveMeta(M); } };
J.setHooks({ flag, choose: showChoose, end });

/* ---------- főmenü ---------- */
function menu() {
  M = J.reloadMeta(); scr('menu');
  $('#gold').textContent = M.gold.toLocaleString('hu-HU');
  $('#chars').innerHTML = CHARS.map(c => { const ok = unlocked(c), w = SIG[c.w];
    return `<button class="ch${c.id === selCh ? ' on' : ''}${ok ? '' : ' lock'}" data-ch="${c.id}"${ok ? '' : ' aria-disabled="true"'}><img src="${J.svgURL(J.artOf(c.art, 'f', c.e), '20 0 160 300')}" alt=""><b>${esc(c.n)}</b><span>${esc(w.n)}</span><i>${ok ? esc(c.trait) : '🔒 ' + esc(c.reqT)}</i></button>`; }).join('');
  $('#seals').innerHTML = SEALS.map(s => { const ok = !s.need || M.flags[s.need] || M.flags.betaAll; return `<button class="seal${s.id === selSeal ? ' on' : ''}" data-seal="${s.id}"${ok ? '' : ' disabled'} title="${esc(s.d)}">${esc(s.n)}</button>`; }).join('');
  const sd = SEALS.find(s => s.id === selSeal); $('#sealD').textContent = sd ? sd.d : '';
  $('#allBtn').hidden = !!M.flags.betaAll;
}
$('#chars').addEventListener('click', e => { const b = e.target.closest('[data-ch]'); if (!b || b.classList.contains('lock')) return; selCh = b.dataset.ch; M.lastCh = selCh; J.saveMeta(M); menu(); });
$('#seals').addEventListener('click', e => { const b = e.target.closest('[data-seal]'); if (!b || b.disabled) return; selSeal = b.dataset.seal; M.seal = selSeal; J.saveMeta(M); menu(); });
$('#startBtn').onclick = start;
$('#kutBtn').onclick = kut;
$('#allBtn').onclick = () => { M.flags.betaAll = 1; J.saveMeta(M); menu(); };
$('#muteBtn').onclick = () => { $('#muteBtn').textContent = J.toggleMute() ? '🔇' : '🔊'; };
$('#muteBtn').textContent = J.isMuted() ? '🔇' : '🔊';
function start() { if (!unlocked(CHARS.find(c => c.id === selCh))) selCh = 'gh'; J.newRun(selCh, selSeal); scr(''); }

/* ---------- Tanácsi Kút ---------- */
const cost = m => { const L = M.up[m.id] || 0, bought = Object.entries(M.up).reduce((a, [k, v]) => a + (MDEF.find(x => x.id === k)?.free ? 0 : v), 0); return m.free ? 0 : Math.round(m.c * Math.pow(1.6, L) * (1 + .04 * bought)); };
const spent = () => { let s = 0; for (const m of MDEF) { const L = M.up[m.id] || 0; for (let i = 0; i < L; i++) s += m.free ? 0 : Math.round(m.c * Math.pow(1.6, i)); } return s; };
const flagOf = { 'Watchdog Lovag': 'wd', 'Structured Text Boszorkány': 'st', 'Szikkadt Szilárd': 'sz' };
function kut() {
  scr('kut'); $('#kgold').textContent = M.gold.toLocaleString('hu-HU');
  const ags = [...new Set(MDEF.map(m => m.ag))];
  $('#kutList').innerHTML = ags.map(ag => { const need = AG_NEED[ag], open = !need || M.flags[flagOf[need]] || M.flags.betaAll;
    return `<section class="ag${open ? '' : ' lock'}"><h3>${esc(ag)} ág${open ? '' : ` <small>🔒 ${esc(need)} legyőzése</small>`}</h3>${MDEF.filter(m => m.ag === ag).map(m => { const L = M.up[m.id] || 0, c = cost(m), max = L >= m.mx;
      return `<div class="up"><div><b>${esc(m.n)}</b> <em>${L}/${m.mx}</em><br><span>${esc(m.d)}</span></div><div class="ub">${L ? `<button data-dn="${m.id}" aria-label="Csökkentés">−</button>` : ''}<button data-up="${m.id}"${!open || max || (!m.free && M.gold < c) ? ' disabled' : ''}>${max ? 'MAX' : m.free ? '+' : c.toLocaleString('hu-HU') + ' ◆'}</button></div></div>`; }).join('')}</section>`; }).join('');
}
$('#kutList').addEventListener('click', e => {
  const u = e.target.closest('[data-up]'), d = e.target.closest('[data-dn]');
  if (u) { const m = MDEF.find(x => x.id === u.dataset.up), c = cost(m); if ((M.up[m.id] || 0) >= m.mx || M.gold < c) return; M.gold -= c; M.up[m.id] = (M.up[m.id] || 0) + 1; }
  if (d) { const m = MDEF.find(x => x.id === d.dataset.dn), L = M.up[m.id] || 0; if (!L) return; M.up[m.id] = L - 1; if (!m.free) M.gold += Math.round(m.c * Math.pow(1.6, L - 1)); }
  J.saveMeta(M); kut();
});
$('#refund').onclick = () => { M.gold += spent(); M.up = {}; J.saveMeta(M); kut(); };
$('#kutBack').onclick = menu;

/* ---------- szintlépés ---------- */
function showChoose(list) {
  if (!list) { $('#lvl').hidden = true; banMode = false; return; }
  const S = J.S; $('#lvl').hidden = false;
  $('#cards').innerHTML = list.map((c, i) => `<button class="card${c.sig ? ' sig' : ''}" data-i="${i}"><small>${esc(c.lvl)}</small><b>${esc(c.n)}</b><span>${esc(c.d)}</span>${c.evo ? `<em>Evolúció: ${esc(c.evo)}</em>` : ''}<kbd>${i + 1}</kbd></button>`).join('');
  $('#rrBtn').textContent = 'Újrasorsolás (' + S.rr + ')'; $('#rrBtn').disabled = S.rr <= 0;
  $('#skBtn').textContent = 'Kihagyás (' + S.skip + ')'; $('#skBtn').disabled = S.skip <= 0;
  $('#bnBtn').textContent = (banMode ? 'Mit száműzzek? ' : 'Száműzés ') + '(' + S.ban + ')'; $('#bnBtn').disabled = S.ban <= 0; $('#bnBtn').classList.toggle('on', banMode);
  $('#lvlT').textContent = S.lv + '. SZINT';
}
$('#cards').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; if (banMode) { banMode = false; J.banishChoice(+b.dataset.i) || showChoose(J.S.choose); } else J.pickChoice(+b.dataset.i); });
$('#rrBtn').onclick = () => J.reroll(); $('#skBtn').onclick = () => J.skipChoice(); $('#bnBtn').onclick = () => { banMode = !banMode; showChoose(J.S.choose); };

/* ---------- szünet és vége ---------- */
function pause(on) { const S = J.S; if (!S || S.over || S.choose) return; S.paused = on ?? !S.paused; $('#pause').hidden = !S.paused; if (S.paused) $('#pstat').innerHTML = buildStat(S); }
$('#goBtn').onclick = () => pause(false); $('#quitBtn').onclick = () => { pause(false); J.S.over = true; end(false); };
function buildStat(S) { return `<div>Idő <b>${J.fmtT(S.t)}</b></div><div>Szint <b>${S.lv}</b></div><div>Ölés <b>${S.kills.toLocaleString('hu-HU')}</b></div><div>Pont <b>${S.score.toLocaleString('hu-HU')}</b></div>` +
  `<div class="wl">${S.wo.map(id => `<span>${esc(J.wName(id))}${J.isEvo(id) ? ' ★' : ' ' + S.w[id].lv}</span>`).join('')}${S.po.map(id => `<span class="p">${esc(PASS[id].n)} ${S.pass[id]}</span>`).join('')}</div>`; }
function end(win) {
  const S = J.S; if (!S) return; M = J.reloadMeta();
  const mul = (1 + .1 * (M.up.greed || 0)) * (1 + .15 * (M.up.heat || 0)) * (S.seal === 'arnyek' ? 1.5 : 1);
  const earned = Math.round((S.gold + Math.floor(S.score / 200) + 50 * S.bossKills) * mul);
  M.gold += earned; const b = M.best[S.ch.id] || 0; if (S.score > b) M.best[S.ch.id] = S.score; J.saveMeta(M);
  $('#endT').textContent = win ? 'AZ ASZÁLY VÉGET ÉRT' : 'KISZÁRADTÁL'; $('#endT').className = win ? 'win' : '';
  $('#estat').innerHTML = buildStat(S) + `<div>Aranycsepp <b>+${earned.toLocaleString('hu-HU')}</b></div>` + (S.godDmg ? `<div>Sebzés az Istenre <b>${Math.round(S.godDmg).toLocaleString('hu-HU')}</b></div>` : '');
  $('#lvl').hidden = true; $('#pause').hidden = true; scr('end');
}
$('#againBtn').onclick = start; $('#menuBtn').onclick = menu;

/* ---------- billentyűk ---------- */
addEventListener('keydown', e => {
  const S = J.S;
  if (e.key === 'm' || e.key === 'M') { $('#muteBtn').textContent = J.toggleMute() ? '🔇' : '🔊'; return; }
  if (!S || S.over) { if ((e.key === 'Enter' || e.key === ' ') && !$('#menu').hidden) { e.preventDefault(); start(); } return; }
  if (S.choose) { if (/^[1-4]$/.test(e.key)) $('#cards').querySelectorAll('[data-i]')[+e.key - 1]?.click(); else if (e.key === 'r' || e.key === 'R') J.reroll(); else if (e.key === 'x' || e.key === 'X') J.skipChoice(); return; }
  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { e.preventDefault(); pause(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && J.S && !J.S.over && !J.S.choose) pause(true); });

/* ---------- főciklus ---------- */
let last = performance.now(), padStart = false;
function loop(now) {
  let rem = Math.min(.05, (now - last) / 1000) * (window.__abSpeed || 1); last = now;
  const p = J.pollPad(); if (p) { if (p.start && !padStart) pause(); padStart = p.start; }
  if (J.S && !J.S.over) { while (rem > 0) { const s = Math.min(.05, rem); J.update(s); rem -= s; } J.render(); }
  else if (J.S) J.render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
menu();
