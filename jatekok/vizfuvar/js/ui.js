/* Menük: főmenü, új játék (Babettó vagy Rigó-13), cég / garázs, fuvarpiac, ranglista, beállítások, irányítás, készítők, titkos dev menü.
   Felugró böngészőablak helyett minden megerősítés a játékon belül jelenik meg. */
import { KIOSZTAS_NEV, ALAP_KIOSZTAS } from './iranyitas.js?v=202611230014';
const $ = s => document.querySelector(s), esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ft = n => Math.round(n).toLocaleString('hu-HU') + ' Ft';
const STAT = { babetto: [40, 1, .55, 2.0, .3], rigo: [38, 2, .62, 2.2, .35], trabo: [100, 12, .45, 7.2, .35] };   // végsebesség, kapacitás, kezelhetőség, fogyasztás, terepjárás
export function createUI(app) {
  let backTo = null; const sh = $('#sheet');
  function hideAll() { sh.hidden = true; $('#menu').hidden = true; if (app.state === 'sheet') app.state = 'menu'; }
  function sheet(title, html, back, extra = '') { $('#menu').hidden = true; sh.hidden = false; $('#shT').innerHTML = title; $('#shX').innerHTML = extra; $('#shB').innerHTML = html; backTo = back || menu; if (app.state === 'menu') app.state = 'sheet'; $('#shB').scrollTop = 0; return $('#shB'); }
  $('#shBack').onclick = () => { app.audio.fx.click(); (backTo || menu)(); };
  function menu() { sh.hidden = true; $('#menu').hidden = false; app.state = 'menu'; const s = app.save;
    $('#mStat').innerHTML = s.kezdes ? `<span>💰 <b>${ft(app.penz())}</b></span><span>📦 <b>${s.fuvarok}</b> fuvar</span><span>⭐ <b>${s.hirnev}</b> hírnév</span><span>🚗 <b>${s.flotta.length}</b> jármű</span>` : '<span>Még nincs mentett cég.</span>';
    const c = $('[data-go="folytat"]'); c.disabled = !s.kezdes; $('#mCont').textContent = s.kezdes ? (app.JARMU[s.aktiv]?.nev || '') : ''; }
  $('#menu').addEventListener('click', e => { const g = e.target.closest('[data-go]')?.dataset.go; if (!g) return; app.audio.init(); app.audio.fx.click();
    if (g === 'folytat') app.start(); else if (g === 'uj') uj(); else if (g === 'ceg') ceg(); else if (g === 'piac') piac(); else if (g === 'dolg') dolgozok(); else if (g === 'terkep') app.mapOpen(); else if (g === 'rang') rang(); else if (g === 'beall') beall(); else if (g === 'iranyit') iranyit(); else if (g === 'keszitok') keszitok();
    else if (g === 'vissza') { let top = null; try { top = window.top.document.querySelector('.arcframe') ? window.top : null; } catch (_) {}
      if (window.top !== window && top) { try { parent.postMessage({ hgws: 'close' }, location.origin); } catch (_) {} parent.document?.querySelector?.('#extX')?.click(); setTimeout(() => { try { if (top.location.hash !== '#/arcade') top.location.hash = '#/arcade'; } catch (_) {} }, 150); }
      else { try { window.top.location.href = new URL('../../#/arcade', location.href).href; } catch (_) { location.href = '../../#/arcade'; } } } });
  const bars = id => { const [s, k, h, f, t] = STAT[id] || [0, 0, 0, 0, 0]; const b = (l, v, txt) => `<span>${l}</span><div><i style="width:${Math.round(Math.min(1, v) * 100)}%"></i></div>`;
    return `<div class="bars">${b('Sebesség', s / 160)}${b('Kapacitás', k / 40)}${b('Kezelhetőség', h)}${b('Takarékosság', 1 - f / 40)}${b('Terepjárás', t)}</div>`; };
  /* új játék: kezdő moped választása */
  function uj(confirmed) { const s = app.save;
    if (s.kezdes && !confirmed) { const b = sheet('Új játék', `<p>A meglévő céged (${ft(s.penz)}, ${s.fuvarok} fuvar) elvész. Biztosan újrakezded?</p><div style="display:flex;gap:8px"><button class="btn pri" id="ujOk">Igen, újrakezdem</button><button class="btn" id="ujNo">Mégse</button></div>`); b.querySelector('#ujOk').onclick = () => uj(true); b.querySelector('#ujNo').onclick = menu; return; }
    const b = sheet('Válassz kezdő járművet', `<p class="mut">Egyetlen ballon vízzel indul a HGWS flottája. Később minden jármű megmarad a garázsban.</p><div class="grid">${['babetto', 'rigo'].map(id => { const J = app.JARMU[id];
      return `<div class="card" data-id="${id}"><h3>${J.nev}</h3><div class="meta">${J.tipus} · ${J.ballon} ballon · ${Math.round(J.vmax * 3.6)} km/h</div><div class="meta">${esc(J.leiras)}</div>${bars(id)}<button class="btn pri" data-s="${id}">Ezzel kezdek</button></div>`; }).join('')}</div>`);
    b.querySelectorAll('[data-id]').forEach(c => c.onmouseenter = () => app.preview(c.dataset.id));
    b.querySelectorAll('[data-s]').forEach(x => x.onclick = () => app.newGame(x.dataset.s)); }
  /* cég / garázs: járművek, vásárlás, fényezés */
  function ceg(back) { const s = app.save, inGame = !!back;
    const b = sheet('Cég – garázs', `<div class="stat"><span>💰 <b>${ft(app.penz())}</b></span><span>⭐ hírnév <b>${s.hirnev}</b></span><span>📦 <b>${s.fuvarok}</b> fuvar</span><span>🧾 vagyon <b>${ft(app.vagyon(s))}</b></span></div>
      <div class="grid">${app.JARMUVEK.map(J => { const own = app.owns(J.id), act = s.aktiv === J.id;
        return `<div class="card ${act ? 'on' : ''} ${own ? '' : 'lock'}" data-id="${J.id}"><h3>${J.nev}</h3><div class="meta">${J.tipus} · ${J.ag === 'retro' ? 'retró' : 'modern'} · ${J.ballon} ballon</div><div class="meta">${esc(J.leiras)}</div>${bars(J.id)}
        ${own ? `<div class="sw">${J.szinek.map((c, i) => `<button title="${esc(c[0])}" data-c="${i}" class="${(s.szin[J.id] ?? 0) === i ? 'on' : ''}" style="background:#${c[1].toString(16).padStart(6, '0')}"></button>`).join('')}</div>` : ''}
        ${own ? `<div class="meta">${app.DG.peldany(s, J.id)} db a flottában${app.DG.foglalt(s, J.id) ? ' · ' + app.DG.foglalt(s, J.id) + ' sofőrnél' : ''}</div>` : ''}
        ${act ? '<button class="btn" disabled>Ezt használod</button>' : own ? `<button class="btn pri" data-v="${J.id}">Kiválaszt</button>` : `<button class="btn pri" data-b="${J.id}" ${app.penz() < J.ar ? 'disabled' : ''}>${J.ar ? 'Megvesz · ' + ft(J.ar) : 'Ingyen elviheted'}</button>`}
        ${own ? `<button class="btn sm" data-m="${J.id}" ${app.penz() < (J.ar || 8000) ? 'disabled' : ''}>Még egy a sofőröknek · ${ft(J.ar || 8000)}</button>` : ''}</div>`; }).join('')}</div>
      <p class="mut" style="margin-top:12px">További járművek (Kispolszki, Vartburg, Lado, furgonok, tartálykocsik, kamionok, traktorok, a kétéltű és a tank) a következő fejlesztési fázisokban érkeznek.</p>`, back);
    b.querySelectorAll('[data-id]').forEach(c => c.onmouseenter = () => { if (!inGame) app.preview(c.dataset.id); });
    b.querySelectorAll('[data-b]').forEach(x => x.onclick = () => { if (app.vesz(x.dataset.b)) { app.audio.fx.coin(); ceg(back); } });
    b.querySelectorAll('[data-v]').forEach(x => x.onclick = () => { if (app.valaszt(x.dataset.v)) ceg(back); });
    b.querySelectorAll('[data-m]').forEach(x => x.onclick = () => { if (app.veszMeg(x.dataset.m)) { app.audio.fx.coin(); ceg(back); } });
    $('#shX').innerHTML = '<button class="btn sm" id="toDolg">👷 Alkalmazottak</button>'; $('#toDolg').onclick = () => dolgozok(back);
    b.querySelectorAll('[data-c]').forEach(x => x.onclick = () => { const id = x.closest('[data-id]').dataset.id; app.szin(id, +x.dataset.c); ceg(back); }); }
  /* alkalmazottak */
  let dolgTimer = 0, bizt = null;
  function dolgozok(back) { const s = app.save, DG = app.DG; s.dolgozok ||= []; clearInterval(dolgTimer); const owned = app.JARMUVEK.filter(J => app.owns(J.id));
    const stars = n => '<span class="y">' + '★'.repeat(n) + '</span><span style="opacity:.35">' + '★'.repeat(5 - n) + '</span>';
    const b = sheet('Alkalmazottak', `<div class="stat"><span>💰 <b>${ft(app.penz())}</b></span><span>👷 <b>${s.dolgozok.length} / ${DG.MAX_DOLGOZO}</b> sofőr</span><span>📦 <b>${s.dolgFuvar || 0}</b> sofőrfuvar</span></div>
      <div class="grid">${s.dolgozok.map(e => `<div class="card" data-d="${e.id}"><h3>${esc(e.nev)}</h3><div class="meta">${stars(e.szint)} · jutalék ${Math.round(e.jutalek * 100)}%</div>
        <div class="meta">${e.fuvarok} fuvar · ${ft(e.bevetel)} a cégnek</div><div class="meta y" data-st="${e.id}">${esc(DG.allapot(e))}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${owned.map(J => `<button class="btn sm ${e.jarmu === J.id ? 'on' : ''}" data-jr="${J.id}" ${e.jarmu === J.id || DG.szabad(s, J.id, e) ? '' : 'disabled'}>${esc(J.nev)}</button>`).join('')}</div>
        <button class="btn sm" data-el="${e.id}">${bizt === e.id ? 'Biztosan elbocsátod?' : 'Elbocsátás'}</button></div>`).join('') || '<p class="mut">Még nincs sofőröd.</p>'}</div>
      <h3 style="margin:16px 0 8px;font:800 16px Inter">Jelentkezők</h3>
      <div class="grid">${DG.jeloltek(s).map(j => `<div class="card"><h3>${esc(j.nev)}</h3><div class="meta">${stars(j.szint)} · jutalék ${Math.round(j.jutalek * 100)}%</div>
        <button class="btn pri" data-f="${j.id}" ${s.dolgozok.length >= DG.MAX_DOLGOZO || app.penz() < j.felvetel || !s.kezdes ? 'disabled' : ''}>Felvétel · ${ft(j.felvetel)}</button></div>`).join('')}</div>`, back);
    b.querySelectorAll('[data-f]').forEach(x => x.onclick = () => { if (app.felvesz(x.dataset.f)) { app.audio.fx.coin(); dolgozok(back); } });
    b.querySelectorAll('[data-el]').forEach(x => x.onclick = () => { const id = x.dataset.el; if (bizt === id) { bizt = null; app.elbocsat(id); } else bizt = id; dolgozok(back); });
    b.querySelectorAll('[data-jr]').forEach(x => x.onclick = () => { const id = x.closest('[data-d]').dataset.d; if (app.beoszt(id, x.dataset.jr)) dolgozok(back); });
    dolgTimer = setInterval(() => { if (sh.hidden || $('#shT').textContent !== 'Alkalmazottak') return clearInterval(dolgTimer); for (const e of s.dolgozok) { const el = b.querySelector(`[data-st="${e.id}"]`); if (el) el.textContent = DG.allapot(e); } }, 1000); }
  /* fuvarpiac */
  function piac(sel) { const s = app.save, back = app.state === 'pause' || app.state === 'drive' ? () => { hideAll(); $('#pause').hidden = false; } : menu; const list = app.piac(), cap = app.JARMU[s.aktiv || 'babetto'].ballon;
    const cur = s.munka ? `<div class="card on"><h3>Folyamatban: ${esc(s.munka.nev)}</h3><div class="meta">${s.munka.n} ballon · ${s.munka.km} km · ${ft(s.munka.dij)}</div><button class="btn" id="cancel">Fuvar lemondása (−3 hírnév)</button></div><br>` : '';
    const b = sheet('Fuvarpiac', cur + `<div class="grid">${list.map(j => `<div class="card ${sel === j.id ? 'on' : ''}"><h3>${j.t === 'iroda' ? '🏢' : '🏡'} ${esc(j.nev)}</h3><div class="meta">${j.n} ballon · kb. ${j.km} km · határidő ${Math.round(j.hatarido / 60)} perc</div>
      <div style="font:900 18px Inter" class="y">${ft(j.dij)}</div><button class="btn pri" data-j="${j.id}" ${s.munka || j.n > cap ? 'disabled' : ''}>${j.n > cap ? 'Nem fér el' : 'Elvállalom'}</button></div>`).join('')}</div>
      ${s.munka ? '' : '<div style="margin-top:12px"><button class="btn sm" id="fris">Új ajánlatok</button></div>'}`, back);
    b.querySelector('#cancel')?.addEventListener('click', () => { app.cancelJob(); piac(); }); b.querySelector('#fris')?.addEventListener('click', () => { app.frissitPiac(); piac(); });
    b.querySelectorAll('[data-j]').forEach(x => x.onclick = () => { if (!app.save.kezdes) { hideAll(); uj(); return; } if (app.acceptJob(x.dataset.j)) { if (app.state === 'pause') app.resume(); else if (app.state === 'menu' || app.state === 'sheet') app.start(); } }); }
  /* ranglista */
  let lbTab = 'vizfuvar';
  async function rang() { const tabs = [['vizfuvar', 'Vagyon'], ['vizfuvar_fuvarok', 'Fuvarok'], ['vizfuvar_legjobb', 'Legjobb fuvar'], ['vizfuvar_dolgozok', 'Sofőrök']];
    const b = sheet('Ranglista', `<div class="tabs">${tabs.map(([k, n]) => `<button class="btn sm ${lbTab === k ? 'on' : ''}" data-t="${k}">${n}</button>`).join('')}</div><div id="lbB" class="mut">Betöltés…</div>`);
    b.querySelectorAll('[data-t]').forEach(x => x.onclick = () => { lbTab = x.dataset.t; rang(); });
    const rows = await app.RL.top(lbTab, 15), el = b.querySelector('#lbB'); if (!el) return;
    if (rows === null) { el.textContent = 'A ranglista bejelentkezve érhető el (Arcade).'; return; } if (!rows.length) { el.textContent = 'Még senki sincs a listán – légy te az első!'; return; }
    el.innerHTML = `<table class="lb">${rows.map((r, i) => `<tr class="${r.me ? 'me' : ''}"><td>${i + 1}.</td><td>${esc(r.name)}${r.guest ? ' <span class="mut">(vendég)</span>' : ''}</td><td style="text-align:right">${lbTab === 'vizfuvar' ? ft(r.score) : Math.round(r.score).toLocaleString('hu-HU')}</td></tr>`).join('')}</table>`; }
  /* beállítások */
  function beall(back) { const S = app.SET, sel = (k, opts) => `<select data-k="${k}">${opts.map(([v, n]) => `<option value="${v}" ${String(S[k]) === String(v) ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
    const b = sheet('Beállítások', `<div class="row"><label>Grafika</label>${sel('q', [['alacsony', 'Alacsony'], ['kozepes', 'Közepes'], ['magas', 'Magas']])}</div>
      <div class="row"><label>Látótávolság</label>${sel('view', [[4, '4 km'], [6, '6 km'], [10, '10 km'], [16, '16 km']])}</div>
      <div class="row"><label>Napszak</label>${sel('napszak', [['ciklus', 'Változó (napszak-ciklus)'], ['reggel', 'Reggel'], ['nappal', 'Nappal'], ['este', 'Este']])}</div>
      <div class="row"><label>Váltó</label>${sel('valto', [['auto', 'Automata'], ['kezi', 'Kézi (Shift / Ctrl)']])}</div>
      <div class="row"><label>Döntéses kormányzás (telefon)</label>${sel('tilt', [[0, 'Ki'], [1, 'Be']])}</div>
      <div class="row"><label>Hangerő</label><input type="range" min="0" max="1" step=".05" data-k="vol" value="${S.vol}"></div>
      <div class="row"><label>Rádió hangereje</label><input type="range" min="0" max="1" step=".05" data-k="rvol" value="${S.rvol}"></div>`, back);
    b.querySelectorAll('[data-k]').forEach(x => x.oninput = x.onchange = () => { const k = x.dataset.k; S[k] = x.type === 'range' ? +x.value : (k === 'view' || k === 'tilt') ? +x.value : x.value; app.applySettings(k); app.persist(); }); }
  /* irányítás: átállítható kiosztás */
  function iranyit() { const S = app.SET, map = S.kiosztas || JSON.parse(JSON.stringify(ALAP_KIOSZTAS)); let wait = null;
    const draw = () => { const b = sheet('Irányítás', `<p class="mut">Kattints egy gombra, majd nyomd le az új billentyűt. Gamepad/kormány: bal kar/kormány – kormányzás, jobb ravasz – gáz, bal ravasz – fék, A – művelet, X – kamera, Y – rádió, LB/RB – váltás. Telefonon: kormány- és pedálgombok, vagy döntés (Beállítások).</p>
      ${Object.keys(KIOSZTAS_NEV).map(k => `<div class="row"><label>${KIOSZTAS_NEV[k]}</label><button class="key ${wait === k ? 'wait' : ''}" data-k="${k}">${wait === k ? 'Nyomj egy billentyűt…' : (map[k] || []).map(c => c.replace(/^Key|^Digit/, '').replace('Arrow', '↑').replace('Left', '').replace('Right', '')).join(' / ')}</button></div>`).join('')}
      <div style="margin-top:12px"><button class="btn sm" id="kAlap">Alapértelmezett kiosztás</button></div>`);
      b.querySelectorAll('[data-k]').forEach(x => x.onclick = () => { wait = x.dataset.k; draw(); }); b.querySelector('#kAlap').onclick = () => { S.kiosztas = null; app.ctl.setMap(ALAP_KIOSZTAS); app.persist(); iranyit(); }; };
    const onKey = e => { if (!wait || sh.hidden) return; e.preventDefault(); map[wait] = [e.code]; wait = null; S.kiosztas = map; app.ctl.setMap(map); app.persist(); draw(); };
    removeEventListener('keydown', iranyit.k || (() => {}), true); iranyit.k = onKey; addEventListener('keydown', onKey, true); draw(); }
  /* készítők */
  async function keszitok() { const st = app.radio.list();
    sheet('Készítők', `<p><b>HGWS Vízfuvar</b> – a Halász Gergely Watering Solutions játéka a HGWS Arcade-ban.</p>
      <h3>Térkép és domborzat</h3><p class="mut">Úthálózat, épületek, vizek, helynevek: © OpenStreetMap-közreműködők (ODbL), a Holtváros vármegyei térképeiből. Domborzat: Viewfinder Panoramas (J. de Ferranti) 3"-es adatai; az országhatáron túl: AWS Terrain Tiles (Mapzen, SRTM és mások).</p>
      <h3>3D modellek</h3><p class="mut">A járművek és a telephely jelenleg a játék saját, kódból épített ideiglenes modelljei (Babettó, Rigó-13, Trabó 601, figura, ballon, telephely, benzinkút). A végleges glTF-modellek helyét az assets/manifest.json írja le.</p>
      <h3>Rádió</h3><p class="mut">${st.map(s => `${esc(s.nev)}: ${s.stream ? 'élő adás – forrás: ' + esc(s.forras) + ' (' + esc(s.honlap) + ')' : s.mufaj === 'beszelgetos' ? 'saját, kitalált műsor (felolvasás: a böngésző magyar hangja)' : 'saját, a játékban generált zene (' + esc(s.mufaj) + ')'}`).join('<br>')}</p>
      <h3>Hangok</h3><p class="mut">A motorok, a duda, a víz és a többi hang a böngészőben, Web Audióval készül, felvett minta nélkül.</p>
      <p class="mut">Minden jármű, cég és szereplő kitalált; a valódi járművekre csak a formájuk és a hangulatuk utal.</p>`); }
  /* titkos fejlesztői menü – a valódi mentést soha nem módosítja */
  function dev(back) { const D = app.DEV, ck = (k, t) => `<label class="card" style="flex-direction:row;align-items:center;gap:10px;cursor:pointer"><input type="checkbox" data-d="${k}" ${D[k] ? 'checked' : ''}> ${t}</label>`;
    const b = sheet('DEV', `<div class="grid">${ck('penz', 'Végtelen pénz')}${ck('all', 'Minden jármű feloldva')}${ck('fuel', 'Végtelen üzemanyag')}${ck('god', 'Sérthetetlenség, a moped nem dől el')}${ck('fps', 'FPS-kijelző')}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn" id="dIdo">Időugrás +3 óra</button><button class="btn" id="dTel">Teleport a fuvarcélhoz</button><button class="btn" id="devOff" style="border-color:#e0322a">Dev mód kikapcsolása</button></div>`, back || menu, '<span class="devB">DEV</span>');
    b.querySelectorAll('[data-d]').forEach(x => x.onchange = () => { D[x.dataset.d] = x.checked ? 1 : 0; app.persistDev(); });
    b.querySelector('#dIdo').onclick = () => app.devIdo?.(); b.querySelector('#dTel').onclick = () => app.devTeleport?.();
    b.querySelector('#devOff').onclick = () => { app.setDev(0); (back || menu)(); }; }
  return { menu, uj, ceg, piac, dolgozok, rang, beall, iranyit, keszitok, dev, hideAll };
}
