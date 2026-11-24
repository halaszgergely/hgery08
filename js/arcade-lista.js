/* HGWS Arcade – listaoldal: kiemeltek, szűrők, kategóriasorok, részletező panel.
   Az adatok a js/arcade-manifest.js-ből jönnek; a ranglistát és a játékszámokat csak olvassa (a ctx függvényein át). */
import { JATEKOK, KATEGORIAK, UJ_NAPOK } from './arcade-manifest.js?v=202611242308';

const V = new URL(import.meta.url).search, RK = 'hgws_arc_recent';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fold = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const KN = Object.fromEntries(KATEGORIAK.map(k => [k.k, k]));
const ST = { uj: 'ÚJ', online: 'ONLINE', beta: 'ZÁRT BÉTA', closedbeta: 'CLOSED BETA', demo: 'DEMO' };
const SPON = 'Az Arcade a ZeroSites támogatásával készül';
if (!document.querySelector('link[data-arcl]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'css/arcade-lista.css' + V; l.dataset.arcl = '1'; document.head.appendChild(l); }

/* kedvencek: ezen az eszközön jegyezzük meg; mindenhol legelöl állnak */
const FK = 'hgws_arc_fav';
export function favs() { try { const a = JSON.parse(localStorage.getItem(FK) || '[]'); return Array.isArray(a) ? a.filter(x => typeof x === 'string') : []; } catch (_) { return []; } }
const isFav = id => favs().includes(id), favFirst = l => { const f = favs(); return l.slice().sort((a, b) => f.includes(b.id) - f.includes(a.id)); };
function toggleFav(id) { const f = favs(), n = f.includes(id) ? f.filter(x => x !== id) : [id, ...f]; try { localStorage.setItem(FK, JSON.stringify(n.slice(0, 60))); } catch (_) {} }
const zsChip = g => g.keszito === 'zerosites' ? '<span class="al-zs" title="A ZeroSites készítette">⚡ ZeroSites</span>' : '';
const favBtn = g => `<button class="al-fav${isFav(g.id) ? ' on' : ''}" data-fav="${esc(g.id)}" aria-label="Kedvenc" aria-pressed="${isFav(g.id)}">★</button>`;
const nowChip = g => `<span class="al-now" data-now="${esc(g.id)}" hidden></span>`;
const linkOf = g => g.link || '#/arcade/' + g.id;
export function recent() { try { const a = JSON.parse(localStorage.getItem(RK) || '[]'); return Array.isArray(a) ? a.filter(x => typeof x === 'string') : []; } catch (_) { return []; } }
export function played(id) { try { localStorage.setItem(RK, JSON.stringify([id, ...recent().filter(x => x !== id)].slice(0, 12))); } catch (_) {} }
const isNew = g => { const d = Date.parse(g.hozzaadva); return isFinite(d) && Date.now() - d < UJ_NAPOK * 864e5; };
const cover = (g, big) => `<span class="al-cov${big ? ' al-big' : ''}" style="--c:${esc(g.szin)}">${g.kepek && g.kepek.length ? g.kepek.map((u, i) => `<img src="${esc(u)}" alt="" loading="lazy" class="${i ? '' : 'on'}">`).join('') : `<span class="al-gen"><span>${esc(g.ikon)}</span></span>`}</span>`;
function statLine(g, ctx) { if (g.ranglista) { const b = ctx.best(g.id); if (b > 0) return 'Rekord: ' + (ctx.fmt(g.id, b) ?? (ctx.num(b) + (g.egyseg ? ' ' + g.egyseg : ''))); return ST[g.statusz] || 'Még nincs rekord – légy te az első!'; } return ST[g.statusz] || 'Játszható'; }
const card = (g, ctx, cls = '') => `<article class="acd ${cls}" data-g="${esc(g.id)}" tabindex="0" style="--c:${esc(g.szin)}">${cover(g)}${favBtn(g)}
  <span class="al-chips"><span class="al-kat">${esc(KN[g.kat]?.n || '')}</span>${ST[g.statusz] ? `<span class="al-st al-st-${esc(g.statusz)}">${ST[g.statusz]}</span>` : ''}${zsChip(g)}${nowChip(g)}</span>
  <b>${esc(g.cim)}</b><small>${esc(g.rovid)}</small><span class="al-af"><em>${esc(statLine(g, ctx))}</em><a class="al-pl" href="${esc(linkOf(g))}">Játék ▸</a></span></article>`;
const visible = ctx => JATEKOK.filter(g => !g.zart || ctx.beta());

/* a főoldal Arcade-sora: kiemeltek, aztán a többi */
export function homeRow(ctx) { const gs = favFirst(visible(ctx).slice().sort((a, b) => (b.kiemelt || 0) - (a.kiemelt || 0)));
  return `<section class="row arcl-home"><div class="rowh"><h2><i class="ic ic-gamepad-2"></i> HGWS Arcade</h2><a href="#/arcade">Mind ›</a></div><div class="arow">${gs.map(g => `<a class="acd" href="${esc(linkOf(g))}" style="--c:${esc(g.szin)}">${cover(g)}<span class="al-chips"><span class="al-kat">${esc(KN[g.kat]?.n || '')}</span>${ST[g.statusz] ? `<span class="al-st al-st-${esc(g.statusz)}">${ST[g.statusz]}</span>` : ''}${zsChip(g)}</span><b>${isFav(g.id) ? '<i class="al-favm">★</i> ' : ''}${esc(g.cim)}</b><small>${esc(g.rovid)}</small><span class="al-af"><em>${esc(statLine(g, ctx))}</em><span class="al-pl">Játék ▸</span></span></a>`).join('')}</div></section>`; }

const readQ = () => { const q = new URLSearchParams((location.hash.split('?')[1] || '')); return { kat: KN[q.get('kat')] ? q.get('kat') : '', q: q.get('q') || '', rend: ['uj', 'az', 'nepszeru'].includes(q.get('rend')) ? q.get('rend') : '' }; };
const writeQ = (s, push) => { const q = new URLSearchParams(); if (s.kat) q.set('kat', s.kat); if (s.q) q.set('q', s.q); if (s.rend) q.set('rend', s.rend); const h = '#/arcade' + (q.toString() ? '?' + q : ''); if (h !== location.hash) history[push ? 'pushState' : 'replaceState'](null, '', h); };

export function render(page, ctx) {
  const S = readQ(); let plays = ctx.playsNow() || {}; document.title = 'Arcade · HGWS';
  const all = () => visible(ctx), feat = all().filter(g => g.kiemelt).sort((a, b) => b.kiemelt - a.kiemelt), hero = feat[0], side = feat.slice(1, 4);
  page.innerHTML = `<div class="arclw"><div class="arcl">
    <header class="al-ah"><h1><i class="ic ic-gamepad-2"></i> HGWS Arcade</h1><button class="al-lbgo">🏆 Ranglista</button><span class="al-spon">${SPON}</span></header>
    ${hero ? `<section class="ahero"><article class="al-hbig" data-g="${esc(hero.id)}" tabindex="0" style="--c:${esc(hero.szin)}">${cover(hero, 1)}<div class="al-hb"><span class="al-chips"><span class="al-kat">${esc(KN[hero.kat]?.n || '')}</span>${ST[hero.statusz] ? `<span class="al-st al-st-${esc(hero.statusz)}">${ST[hero.statusz]}</span>` : ''}${zsChip(hero)}${nowChip(hero)}</span><h2>${esc(hero.cim)}</h2><p>${esc(hero.hosszu)}</p><span class="al-hbtn"><a class="al-pl al-big" href="${esc(linkOf(hero))}">▸ Játék</a><em>${esc(statLine(hero, ctx))}</em></span></div></article>
      <div class="al-hside">${side.map(g => card(g, ctx, 'al-mini')).join('')}</div></section>` : ''}
    <div class="fbar"><div class="fchips"><button data-k="">Összes</button>${KATEGORIAK.filter(k => all().some(g => g.kat === k.k)).map(k => `<button data-k="${k.k}">${esc(k.n)}</button>`).join('')}</div>
      <input type="search" class="fq" placeholder="Keresés cím vagy címke szerint" value="${esc(S.q)}" autocomplete="off"><select class="fs"><option value="">Kategóriák szerint</option><option value="uj">Újak elöl</option><option value="az">A–Z</option><option value="nepszeru">Legtöbbet játszott</option></select></div>
    <div class="abody"></div><section class="al-lb" id="al-lb"><div class="rowh"><h2>🏆 Ranglista</h2><span class="al-lbt"><button data-w="0" class="on">Mindenkori</button><button data-w="1">Heti</button></span></div><div class="al-lbg"><p class="al-none">Betöltés…</p></div></section><footer class="afoot">${SPON}</footer></div></div>`; const root = page.firstElementChild;
  document.querySelectorAll('body > .apnl').forEach(x => x.remove()); const pnl = document.createElement('div'); pnl.className = 'apnl'; pnl.hidden = true; document.body.appendChild(pnl);
  const body = page.querySelector('.abody'), sel = page.querySelector('.fs'); sel.value = S.rend;
  const sorted = l => { const r = S.rend || (S.kat || S.q ? 'uj' : ''); return l.slice().sort(r === 'az' ? (a, b) => a.cim.localeCompare(b.cim, 'hu') : r === 'nepszeru' ? (a, b) => (plays[b.id] || 0) - (plays[a.id] || 0) : (a, b) => String(b.hozzaadva).localeCompare(String(a.hozzaadva)) || (b.kiemelt || 0) - (a.kiemelt || 0)); };
  const rowH = (t, l) => l.length ? `<section class="row"><div class="rowh"><h2>${esc(t)}</h2></div><div class="arow">${favFirst(l).map(g => card(g, ctx)).join('')}</div></section>` : '';
  function draw() { page.querySelectorAll('.fchips button').forEach(b => b.classList.toggle('on', b.dataset.k === S.kat)); const gs = all();
    page.querySelector('.ahero')?.toggleAttribute('hidden', !!(S.kat || S.q || S.rend));
    if (!S.kat && !S.q && !S.rend) { const rec = recent().map(id => gs.find(g => g.id === id)).filter(Boolean), nw = gs.filter(isNew).sort((a, b) => String(b.hozzaadva).localeCompare(String(a.hozzaadva))).slice(0, 10);
      const fv = favs().map(id => gs.find(g => g.id === id)).filter(Boolean); body.innerHTML = rowH('★ Kedvencek', fv) + rowH('Legutóbb játszott', rec) + rowH('Újdonságok', nw) + KATEGORIAK.map(k => rowH(k.t, gs.filter(g => g.kat === k.k))).join(''); showNow(); return; }
    const q = fold(S.q), l = favFirst(sorted(gs.filter(g => (!S.kat || g.kat === S.kat) && (!q || fold(g.cim).includes(q) || (g.cimkek || []).some(c => fold(c).includes(q)) || fold(KN[g.kat]?.n).includes(q)))));
    body.innerHTML = `<section class="row"><div class="rowh"><h2>${esc(S.kat ? KN[S.kat].t : S.q ? 'Találatok' : 'Minden játék')}</h2><span class="al-cnt">${l.length} játék</span></div>${l.length ? `<div class="agridx">${l.map(g => card(g, ctx)).join('')}</div>` : '<p class="al-none">Nincs a szűrésnek megfelelő játék.</p>'}</section>`; showNow(); }
  // éppen játszók: a főoldal adja (percenként frissítjük, amíg a lista látszik)
  let act = {}; function showNow() { document.querySelectorAll('[data-now]').forEach(e => { const n = act[e.dataset.now] || 0, w = n && ctx.who ? ctx.who(e.dataset.now) : []; e.hidden = !n; e.textContent = n ? '● ' + n + ' játszik' : ''; if (w.length) e.title = w.join(', '); else e.removeAttribute('title'); });
    document.querySelectorAll('[data-who]').forEach(e => { const w = ctx.who ? ctx.who(e.dataset.who) : []; e.hidden = !w.length; e.textContent = w.length ? 'Most játszik: ' + w.join(', ') : ''; }); }
  const loadNow = () => { if (!ctx.active) return; ctx.active().then(a => { act = a || {}; showNow(); }).catch(() => {}); }; const nowT = setInterval(() => { if (!document.contains(root)) return clearInterval(nowT); if (!document.hidden) loadNow(); }, 60e3);
  draw(); loadNow();
  ctx.plays().then(p => { if (!document.contains(page.querySelector('.arcl'))) return; plays = p || plays; if (S.rend === 'nepszeru') draw(); }).catch(() => {});

  function detail(id) { const g = all().find(x => x.id === id); if (!g) return;
    pnl.innerHTML = `<div class="apc" role="dialog" aria-label="${esc(g.cim)}" style="--c:${esc(g.szin)}"><button class="al-ax" aria-label="Bezárás">✕</button>${cover(g, 1)}
      <div class="apb"><span class="al-chips"><span class="al-kat">${esc(KN[g.kat]?.n || '')}</span>${ST[g.statusz] ? `<span class="al-st al-st-${esc(g.statusz)}">${ST[g.statusz]}</span>` : ''}${zsChip(g)}${nowChip(g)}${(g.cimkek || []).map(c => `<span class="al-tg">${esc(c)}</span>`).join('')}</span>
        <h2>${esc(g.cim)} ${favBtn(g)}</h2><p class="al-who" data-who="${esc(g.id)}" hidden></p><p>${esc(g.hosszu)}</p><span class="al-hbtn"><a class="al-pl al-big" href="${esc(linkOf(g))}">▸ Játék</a><em>${esc(statLine(g, ctx))}</em></span>
        <div class="acols"><div><h3>Irányítás</h3><ul>${(g.iranyitas || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>${g.ranglista ? '<div><h3>Top 10</h3><ol class="al-top"><li class="al-ld">Betöltés…</li></ol></div>' : ''}</div>
        <p class="al-spon">${SPON}</p></div></div>`;
    pnl.hidden = false; showNow(); document.body.classList.add('arcl-lock'); pnl.querySelector('.al-ax').focus();
    if (g.ranglista) ctx.top(g.id).then(l => { const ol = pnl.querySelector('.al-top'); if (!ol || pnl.querySelector('.apc h2')?.textContent !== g.cim) return;
      ol.innerHTML = l.length ? l.map(r => `<li class="${r.me ? 'al-me' : ''}"><span>${esc(r.name)}</span><b>${esc(r.score)}</b></li>`).join('') : '<li class="al-ld">Még senki – légy te az első!</li>'; }).catch(() => { const ol = pnl.querySelector('.al-top'); if (ol) ol.innerHTML = '<li class="al-ld">A ranglista most nem érhető el.</li>'; }); }
  const closeP = () => { pnl.hidden = true; pnl.innerHTML = ''; document.body.classList.remove('arcl-lock'); };

  // központi ranglista: minden játék top 10-e, heti vagy mindenkori
  let lbW = 0, lbN = 0; const lbg = root.querySelector('.al-lbg');
  function loadLb() { const n = ++lbN; lbg.innerHTML = '<p class="al-none">Betöltés…</p>'; ctx.boards(!!lbW).then(bs => { if (n !== lbN || !document.contains(lbg)) return;
    lbg.innerHTML = bs.map(b => `<div class="al-lbc"><h4>${esc(b.icon || '')} ${esc(b.name)}</h4>${b.rows.length ? '<ol>' + b.rows.map((r, i) => `<li class="${r.me ? 'al-me' : ''}"><i>${['🥇', '🥈', '🥉'][i] || i + 1}</i><span data-prof="${esc(r.uid || '')}" data-pn="${esc(r.nick || '')}">${esc(r.name)}</span><b>${r.wins ? '🏆×' + r.wins + ' ' : ''}${esc(r.score)}</b></li>`).join('') + '</ol>' : '<p class="al-ld">Még senki – légy te az első!</p>'}</div>`).join(''); }).catch(() => { if (n === lbN) lbg.innerHTML = '<p class="al-none">A ranglista most nem érhető el.</p>'; }); }
  loadLb();
  const favClick = e => { const fb = e.target.closest('[data-fav]'); if (!fb) return false; e.preventDefault(); e.stopPropagation(); toggleFav(fb.dataset.fav); const on = isFav(fb.dataset.fav); document.querySelectorAll(`[data-fav="${fb.dataset.fav}"]`).forEach(x => { x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); if (!fb.closest('.apc')) draw(); else { const y = scrollY; draw(); scrollTo(0, y); } return true; };
  pnl.addEventListener('click', e => { if (favClick(e)) return; if (e.target.closest('a.al-pl') || e.target.closest('.al-ax') || e.target === pnl) closeP(); });
  root.addEventListener('click', e => { if (favClick(e)) return; const lt = e.target.closest('.al-lbt button'); if (lt) { lbW = +lt.dataset.w; root.querySelectorAll('.al-lbt button').forEach(b => b.classList.toggle('on', b === lt)); loadLb(); return; }
    if (e.target.closest('.al-lbgo')) { root.querySelector('#al-lb').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; } const pr = e.target.closest('[data-prof]'); if (pr && pr.dataset.prof) { ctx.profile(pr.dataset.prof, pr.dataset.pn); return; }
    const pl = e.target.closest('a.al-pl'); if (pl) { closeP(); return; }
    if (e.target.closest('.al-ax') || e.target === pnl) return closeP(); const ch = e.target.closest('.fchips button'); if (ch) { S.kat = ch.dataset.k; writeQ(S, true); draw(); return; }
    const c = e.target.closest('[data-g]'); if (c && !e.target.closest('.apc')) detail(c.dataset.g); });
  const onEsc = e => { if (e.key === 'Escape' && !pnl.hidden) closeP(); }; addEventListener('keydown', onEsc);
  root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches?.('[data-g]')) detail(e.target.dataset.g); });
  page.querySelector('.fq').addEventListener('input', e => { S.q = e.target.value.trim(); writeQ(S, false); draw(); });
  sel.addEventListener('change', () => { S.rend = sel.value; writeQ(S, true); draw(); });
  return () => { document.body.classList.remove('arcl-lock'); removeEventListener('keydown', onEsc); pnl.remove(); };
}
// több borítókép: 4 másodpercenként váltakoznak
setInterval(() => { if (document.hidden) return; document.querySelectorAll('.al-cov').forEach(c => { const im = c.querySelectorAll('img'); if (im.length < 2) return; const i = [...im].findIndex(x => x.classList.contains('on')); im[i < 0 ? 0 : i].classList.remove('on'); im[(i + 1) % im.length].classList.add('on'); }); }, 4000);
addEventListener('hashchange', () => { document.body.classList.remove('arcl-lock'); if (!document.querySelector('.arcl')) document.querySelectorAll('body > .apnl').forEach(x => x.remove()); else document.querySelectorAll('body > .apnl').forEach(x => { x.hidden = true; x.innerHTML = ''; }); });
