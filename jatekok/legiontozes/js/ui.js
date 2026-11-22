/* Menük: főmenü, hangár (3D előnézet a bázison), küldetések, ranglista, beállítások, irányítás-súgó, szünet, küldetés vége. */
import { GEPEK, GEP, KULDETESEK, MODOK, REPTEREK, FORGO } from './config.js?v=202611220224';
import * as RL from './ranglista.js?v=202611220224';

const $ = s => document.querySelector(s), esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KONNYU = { permetezo: .92, ancsa: .85, vadasz: .38, concorde: .28, jumbo: .22, herkules: .42, ketelt: .55, hidro: .8, vitorlazo: .6, kopter: .5, kamov: .72, chinook: .45, giro: .88, dron: .96, leghajo: .7, slag: .04, zero: .82 };
export const statsOf = g => [['Sebesség', Math.min(1, Math.log10(g.vmax) / Math.log10(420))], ['Fordulékonyság', Math.min(1, g.ford / 2.4)], ['Tartály', Math.min(1, Math.log10(g.tartaly) / Math.log10(70000))], ['Könnyű kezelés', KONNYU[g.id] ?? .5]];

export function createUI(app) {
  const scr = ['#menu', '#hangar', '#sheet', '#end', '#crash'];
  let backTo = null;
  function show(id) { for (const s of scr) $(s).hidden = s !== id; }
  function hideAll() { for (const s of scr) $(s).hidden = true; }
  document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { app.audio.fx.click(); (backTo || menu)(); });
  $('#menu').querySelectorAll('[data-go]').forEach(b => b.onclick = () => { app.audio.init(); app.audio.fx.click(); const g = b.dataset.go;
    if (g === 'szabad') freePick(); if (g === 'kuldetes') missions(); if (g === 'hangar') hangar(); if (g === 'rang') leaderboard(); if (g === 'beall') settings(menu); if (g === 'sugo') help(menu);
    if (g === 'vissza') {   // vissza az oldal új Arcade-listájára (#/arcade); beágyazva az Arcade bezárja a játékot és ő navigál
      let top = null; try { top = window.top.document.querySelector('.arcframe') ? window.top : null; } catch (_) {}
      if (window.top !== window && top) { try { parent.postMessage({ hgws: 'close' }, location.origin); } catch (_) {} const x = parent.document?.querySelector?.('#extX'); if (x) x.click(); setTimeout(() => { try { if (top.location.hash !== '#/arcade') top.location.hash = '#/arcade'; } catch (_) {} }, 150); }
      else { try { window.top.location.href = new URL('../../#/arcade', location.href).href; } catch (_) { location.href = '../../#/arcade'; } } } });
  function menu() { backTo = null; app.toMenu(); show('#menu'); const st = RL.status(); $('#who').textContent = st.user ? (st.guest ? 'Vendégként: ' + (RL.getNick() || 'Vendég pilóta') : 'Bejelentkezve – a feloldások a fiókodhoz mentődnek') : 'Az eredményekhez jelentkezz be az Arcade-ban.'; }
  function sheet(title, html, extra = '') { show('#sheet'); $('#shT').textContent = title; $('#shB').innerHTML = html; $('#shX').innerHTML = extra; return $('#shB'); }

  /* ---- repülési modell: arcade / realisztikus (+50% küldetéspont) ---- */
  const fmHtml = () => `<div class="tabs fm"><button class="btn ${app.SET.real ? '' : 'on'}" data-fm="0">Arcade</button><button class="btn ${app.SET.real ? 'on' : ''}" data-fm="1">Realisztikus · +50% pont</button></div>`;
  const fmBind = (b, again) => b.querySelectorAll('[data-fm]').forEach(x => x.onclick = () => { app.SET.real = +x.dataset.fm; app.persist(); again(); });
  /* ---- szabad repülés: reptér választása ---- */
  function freePick() { backTo = menu; const g = GEP[app.save.gep], ok = REPTEREK.filter(r => app.canUse(g, r));
    const b = sheet('Szabad repülés – honnan indulsz?', `<div class="mut" style="margin-bottom:10px">Gép: <b>${esc(g.nev)}</b> · <a href="#" id="chg" class="y">másik gép</a></div>${fmHtml()}<div class="grid">${ok.map(r => `<div class="card"><h3>${esc(r.nev)}</h3><div class="meta">${r.tip === 'viz' ? 'Vízi leszálló' : r.tip === 'heli' ? 'Helipad' : r.tip === 'fu' ? 'Füves pálya' : 'Betonpálya'} · ${r.len >= 300 ? r.len + ' m' : ''}${r.allomas ? ' · HGWS töltőállomás' : ''}</div><div class="row"><button class="btn ${r.fo ? 'y' : ''} sm" data-r="${r.id}">Indulás</button>${r.fo ? '<span class="tag y">főbázis</span>' : ''}</div></div>`).join('')}</div>`);
    b.querySelector('#chg').onclick = e => { e.preventDefault(); hangar(freePick); }; fmBind(b, freePick);
    b.querySelectorAll('[data-r]').forEach(x => x.onclick = () => { hideAll(); app.start({ mode: 'szabad', repter: x.dataset.r }); }); }

  /* ---- küldetések ---- */
  let misTab = 'ontozes';
  function missions() { backTo = menu; const g = GEP[app.save.gep];
    const tabs = ['ontozes', 'tuz', 'precizio', 'verseny'].map(m => `<button class="btn ${m === misTab ? 'on' : ''}" data-t="${m}">${MODOK[m]}</button>`).join('');
    const list = KULDETESEK.filter(k => k.mod === misTab).map(k => { const best = app.save.best[k.id]; const rec = k.ajanl.map(a => GEP[a]?.nev.replace('HGWS ', '')).join(', ');
      return `<div class="card"><h3>${esc(k.nev)}</h3><div class="meta">${esc(k.leir)}</div><div class="meta">Ajánlott: ${esc(rec)}${k.ido ? ' · ' + Math.round(k.ido / 60) + ' perc' : ''}</div>
        <div class="row"><button class="btn y sm" data-k="${k.id}">Indulás – ${esc(g.nev.replace('HGWS ', ''))}</button>${best ? `<span class="tag g">rekord: ${best.toLocaleString('hu-HU')}</span>` : ''}</div></div>`; }).join('');
    const b = sheet('Küldetések', `<div class="tabs">${tabs}</div>${fmHtml()}${g.csakSzabad ? '<div class="card" style="margin-bottom:10px"><b class="y">A Rakétás Kerti Slag csak szabad repülésben használható.</b></div>' : ''}<div class="grid">${list}</div>`, `<button class="btn sm" id="mHg">🛩 ${esc(g.nev.replace('HGWS ', ''))}</button>`);
    b.querySelectorAll('[data-t]').forEach(x => x.onclick = () => { misTab = x.dataset.t; missions(); }); fmBind(b, missions);
    b.querySelectorAll('[data-k]').forEach(x => { x.disabled = !!g.csakSzabad; x.onclick = () => { hideAll(); app.start({ mode: KULDETESEK.find(k => k.id === x.dataset.k).mod, mission: x.dataset.k }); }; });
    $('#mHg').onclick = () => hangar(missions); }

  /* ---- hangár ---- */
  let hSel = null;
  function hangar(ret) { backTo = ret || menu; show('#hangar'); hSel = app.save.gep; app.preview(hSel); drawHangar(); }
  function drawHangar() { const s = app.save; $('#pts').textContent = `${s.pont.toLocaleString('hu-HU')} küldetéspont`;
    $('#hList').innerHTML = GEPEK.filter(g => !g.titkos || app.unlocked(g)).map(g => `<button class="pl ${g.id === hSel ? 'on' : ''} ${app.unlocked(g) ? '' : 'lock'}" data-g="${g.id}"><b>${esc(g.nev.replace('HGWS ', ''))}</b><small>${esc(g.tipus)}${app.unlocked(g) ? '' : ' · 🔒 ' + g.pont}</small></button>`).join('') + (app.unlocked(GEP.zero) ? '' : '<button class="pl lock" disabled><b>???</b><small>Titkos</small></button>');
    $('#hList').querySelectorAll('[data-g]').forEach(b => b.onclick = () => { app.audio.fx.click(); hSel = b.dataset.g; app.preview(hSel); drawHangar(); });
    const g = GEP[hSel], un = app.unlocked(g), cur = s.gep === g.id;
    $('#hInfo').innerHTML = `<div class="lab">${esc(g.tipus)}</div><h3>${esc(g.nev)}</h3><p>${esc(g.leir)}</p>${statsOf(g).map(([n, v]) => `<div class="stat">${n}<i><b style="width:${Math.round(v * 100)}%"></b></i></div>`).join('')}
      <div class="kv"><span>Tartály <b>${g.tartaly.toLocaleString('hu-HU')} l</b></span><span>Max. <b>${Math.round(g.vmax * 3.6)} km/h</b></span><span>Permet <b>${g.perm} m</b></span>${g.palya ? `<span>Pálya <b>${g.palya} m</b></span>` : ''}<span>Leszállás <b>${leszall(g)}</b></span><span>Töltés <b>${tolt(g)}</b></span></div>
      <div style="display:flex;gap:8px;margin-top:12px">${un ? `<button class="btn ${cur ? '' : 'y'}" id="hPick" ${cur ? 'disabled' : ''}>${cur ? 'Kiválasztva' : 'Kiválasztás'}</button>` : `<button class="btn" disabled>🔒 ${g.pont > 0 ? g.pont.toLocaleString('hu-HU') + ' pont kell' : 'titkos'}</button>`}</div>`;
    const pk = $('#hPick'); if (pk) pk.onclick = () => { app.audio.fx.ok(); s.gep = g.id; app.persist(); drawHangar(); }; }
  const leszall = g => g.felsz.map(f => ({ fu: 'füves', beton: 'beton', nagy: 'csak nagy reptér', viz: 'víz', terep: 'sík terep', heli: 'helipad', arboc: 'kikötőárboc' }[f])).filter(Boolean).join(', ');
  const tolt = g => g.tolt.map(f => ({ repter: 'reptéren', szippant: 'vízfelszedés', szippantNagy: 'nagy tavon', vizreSzall: 'vízen siklva', zsak: 'vízzsák' }[f])).join(', ');

  /* ---- ranglista ---- */
  let lbMode = 'all', lbPlane = '';
  async function leaderboard() { backTo = menu; const tabs = [['all', 'Összesített'], ['ontozes', 'Öntözés'], ['tuz', 'Tűzoltás'], ['precizio', 'Precíziós'], ['verseny', 'Verseny']].map(([m, n]) => `<button class="btn ${m === lbMode ? 'on' : ''}" data-m="${m}">${n}</button>`).join('');
    const sel = lbMode === 'all' ? '' : `<select id="lbP"><option value="">Minden gép</option>${GEPEK.filter(g => !g.csakSzabad).map(g => `<option value="${g.id}" ${g.id === lbPlane ? 'selected' : ''}>${esc(g.nev)}</option>`).join('')}</select>`;
    const b = sheet('Ranglista – Top 10', `<div class="tabs">${tabs}</div><div style="margin-bottom:10px">${sel}</div><div id="lbL" class="mut">Betöltés…</div>`);
    b.querySelectorAll('[data-m]').forEach(x => x.onclick = () => { lbMode = x.dataset.m; leaderboard(); }); const ps = b.querySelector('#lbP'); if (ps) ps.onchange = () => { lbPlane = ps.value; leaderboard(); };
    const rows = await RL.top(lbMode, lbMode === 'all' ? '' : lbPlane); const L = $('#lbL'); if (!L) return;
    if (rows === null) { L.innerHTML = 'A ranglista az Arcade-ban, bejelentkezve érhető el.'; return; }
    L.innerHTML = rows.length ? `<table class="lb">${rows.map((r, i) => `<tr class="${r.me ? 'me' : ''}"><td>${i + 1}.</td><td>${esc(r.name)}${r.guest ? ' <span class="tag">vendég</span>' : ''}</td><td>${Math.round(r.score).toLocaleString('hu-HU')}</td></tr>`).join('')}</table>` : 'Még nincs eredmény. Légy az első!'; }

  /* ---- beállítások ---- */
  function settings(ret) { backTo = ret; const S = app.SET, o = (v, l, cur) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${l}</option>`;
    const b = sheet('Beállítások', `<div class="set">
      <label>Grafika</label><select data-s="q">${o('alacsony', 'Alacsony', S.q)}${o('kozepes', 'Közepes', S.q)}${o('magas', 'Magas', S.q)}</select>
      <label>Látótávolság <span class="mut" id="vV">${S.view} km</span></label><input type="range" min="12" max="80" step="2" value="${S.view}" data-s="view">
      <label>Hangerő</label><input type="range" min="0" max="1" step=".05" value="${S.vol}" data-s="vol">
      <label>Irányítás érzékenysége</label><input type="range" min=".4" max="1.8" step=".05" value="${S.sens}" data-s="sens">
      <label>Invertált pitch</label><select data-s="inv">${o(0, 'Ki', S.inv)}${o(1, 'Be', S.inv)}</select>
      <label>Szél</label><select data-s="wind">${o(0, 'Szélcsend', S.wind)}${o(1, 'Gyenge', S.wind)}${o(2, 'Közepes', S.wind)}${o(3, 'Erős', S.wind)}</select>
      <label>Napszak</label><select data-s="tod">${o('hajnal', 'Hajnal', S.tod)}${o('nappal', 'Nappal', S.tod)}${o('alkony', 'Alkony', S.tod)}${o('ejszaka', 'Éjszaka', S.tod)}${o('ciklus', 'Ciklus (1 óra = 1 perc)', S.tod)}</select>
      <label>Felhők</label><select data-s="cloud">${o(0, 'Derült', S.cloud)}${o(1, 'Fátyolfelhős', S.cloud)}${o(2, 'Felhős', S.cloud)}</select>
      <label>Részletes domborzat (internetről)</label><select data-s="tiles">${o(1, 'Be', S.tiles)}${o(0, 'Ki', S.tiles)}</select>
      ${app.touch ? `<label>Döntéses irányítás (giroszkóp)</label><select data-s="gyro">${o(0, 'Ki', S.gyro)}${o(1, 'Be', S.gyro)}</select>` : ''}
      <label>FPS-kijelző</label><select data-s="fps">${o(0, 'Ki', S.fps)}${o(1, 'Be', S.fps)}</select></div>`);
    b.querySelectorAll('[data-s]').forEach(el => { const k = el.dataset.s; const f = () => { let v = el.value; if (['view', 'vol', 'sens', 'inv', 'wind', 'cloud', 'tiles', 'gyro', 'fps'].includes(k)) v = +v; S[k] = v; if (k === 'view') $('#vV').textContent = v + ' km'; app.applySettings(k); app.persist(); };
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', f); }); }

  /* ---- súgó ---- */
  const HELP = {
    'Repülőgép': [['W / S', 'orr le / fel (pitch)'], ['A / D', 'dőlés balra / jobbra (roll)'], ['Q / E', 'oldalkormány (yaw)'], ['Shift / Ctrl (vagy Z)', 'gáz fel / le, álló helyzetben fék'], ['Space', 'vízpermet'], ['G', 'futómű'], ['F', 'fékszárny'], ['Tab', 'utánégető (sugárhajtású)'], ['B', 'fék']],
    'Helikopter': [['Shift / Ctrl (vagy Z)', 'kollektív fel / le'], ['W / S', 'ciklikus előre / hátra'], ['A / D', 'ciklikus oldalra'], ['Q / E', 'farokrotor – forgás'], ['Space', 'víz kiengedése (zsák / tartály)'], ['', 'A vízzsákot lebegve merítsd a tóba'], ['', 'A Locsolókopter főrotor-nyomatékát pedállal kell ellensúlyozni']],
    'Ka-26 és Duplarotoros': [['Shift / Ctrl', 'kollektív'], ['W / S / A / D', 'ciklikus'], ['Q / E', 'forgás (Ka-26: a két rotor eltérő szöge; Duplarotoros: a rotorok ellentétes dőlése)'], ['', 'Nincs farokrotor és nyomatékhatás – nagyon stabilan lebeg'], ['Space', 'permetezőkeret / vízzsák']],
    'Drón': [['W / S', 'előre / hátra'], ['A / D', 'oldalazás'], ['Q / E', 'forgás'], ['Shift / Ctrl', 'emelkedés / süllyedés'], ['Space', 'permet'], ['', 'Elengedve helyben lebeg. Az akku a reptéren töltődik.']],
    'Autogiró és Vitorlázó': [['W / S / A / D / Q / E', 'mint a repülőgépnél'], ['Shift / Ctrl', 'gáz (autogiró)'], ['V', 'csörlős indítás a pályán (vitorlázó)'], ['', 'A vitorlázó termikekben (meleg mezők, lejtők) emelkedik']],
    'Léghajó': [['Shift / Ctrl', 'előre / hátra hajtás'], ['W / S', 'emelkedés / süllyedés (ballaszt)'], ['Q / E (A / D)', 'fordulás'], ['Space', 'víz kiengedése'], ['', 'A szél erősen sodorja. Kikötni a HGWS kikötőárbocnál lehet.']],
    'Általános': [['C', 'kamera: külső / pilótafülke / alsó (célzó)'], ['M', 'térkép, gyorsutazás (szabad repülésben)'], ['P / Esc', 'szünet (egérrel forgatható kamera)'], ['T', 'időgyorsítás 1× / 2× / 4× (szabad repülés)'], ['N', 'némítás'], ['Gamepad', 'bal kar: dőlés/pitch · jobb kar: forgás és gáz · RT/LT: gáz · A: permet · Y: kamera · RB: utánégető'], ['Mobil', 'bal joystick, jobb oldalt gázkar és VÍZ gomb, ◀ ▶ forgás']],
  };
  function help(ret) { backTo = ret; sheet('Irányítás', `<div class="help">${Object.entries(HELP).map(([t, rows]) => `<div class="card"><h3>${t}</h3><table>${rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table></div>`).join('')}</div>`); }

  /* ---- szünet ---- */
  function pause() { backTo = () => { hideAll(); app.resume(); }; const free = app.mode === 'szabad';
    const b = sheet('Szünet', `<div style="display:flex;flex-direction:column;gap:9px;max-width:340px">
      <button class="btn y" data-p="go">Folytatás</button>${free ? '' : '<button class="btn" data-p="re">Küldetés újrakezdése</button>'}<button class="btn" data-p="ap">Újraindulás a legközelebbi reptéren</button>
      ${document.fullscreenEnabled || document.webkitFullscreenEnabled ? '<button class="btn" data-p="fs">Teljes képernyő</button>' : ''}<button class="btn" data-p="set">Beállítások</button><button class="btn" data-p="help">Irányítás</button><button class="btn" data-p="menu">Kilépés a menübe</button></div>`);
    b.querySelectorAll('[data-p]').forEach(x => x.onclick = () => { const p = x.dataset.p; app.audio.fx.click();
      if (p === 'go') { hideAll(); app.resume(); } if (p === 're') { hideAll(); app.restart(); } if (p === 'ap') { hideAll(); app.respawn(); app.resume(); } if (p === 'set') settings(pause); if (p === 'help') help(pause); if (p === 'menu') menu(); if (p === 'fs') document.querySelector('#hudFs').click(); }); }

  /* ---- küldetés vége ---- */
  function end(res, m, gep, newly) { show('#end'); const st = RL.status(), dev = !!app.DEV.on, ranked = !gep.csakSzabad && !dev;
    $('#endT').textContent = (m.lost ? 'Elveszett küldetés – ' : m.allDone ? 'Küldetés teljesítve – ' : 'Lejárt az idő – ') + m.def.nev;
    const row = (a, b) => `<span>${a}</span><b>${b}</b>`;
    $('#endB').innerHTML = `<div class="rows">${row(m.mode === 'verseny' ? 'Idő' : 'Teljesítés', m.mode === 'verseny' ? Math.round(m.t) + ' s' : Math.round((m.frac || 0) * 100) + '%')}${row('Alappont', res.base.toLocaleString('hu-HU'))}${row('Pontosság', Math.round(res.acc * 100) + '%')}${row('Időbónusz', '+' + res.time)}${row('Landolás', res.land ? '+' + res.land + (res.land >= 600 ? ' (sima)' : '') : '–')}${res.pen ? row('Büntetés', '−' + res.pen) : ''}${row('Gépszorzó', '×' + res.k.toFixed(2))}</div>
      <div class="tot">${res.total.toLocaleString('hu-HU')}</div><div class="mut" style="text-align:center;margin-bottom:10px">${dev ? '<span class="devB">DEV</span> nincs pont, rekord és ranglista' : '+' + res.xp + ' küldetéspont' + (res.real ? ' (realisztikus ×1,5)' : '')}${newly.length ? ' · Feloldva: <b class="y">' + newly.map(esc).join(', ') + '</b>' : ''}</div>
      ${ranked && res.total > 0 && st.guest ? `<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><span>Beceneved:</span><input type="text" id="nick" maxlength="16" value="${esc(RL.getNick())}" style="flex:1"></div><div id="nickE" class="mut" style="color:var(--bad);font-size:12px"></div>` : ''}
      <div id="sub" class="mut" style="font-size:12px;margin-bottom:10px"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${ranked && res.total > 0 ? '<button class="btn y" id="eSave">Mentés a ranglistára</button>' : ''}<button class="btn" id="eAgain">Újra</button><button class="btn" id="eMenu">Menü</button></div>`;
    $('#eAgain').onclick = () => { hideAll(); app.restart(); }; $('#eMenu').onclick = () => menu();
    const sv = $('#eSave'); if (sv) { const go = async () => { const n = $('#nick'); if (n) { const e = RL.nickError(n.value); if (e) { $('#nickE').textContent = e; return; } RL.setNick(n.value.trim()); }
        sv.disabled = true; $('#sub').textContent = 'Mentés…'; const r = await RL.submit(res.total, m.mode, gep.id); $('#sub').textContent = r.ok ? 'Felkerültél a ranglistára!' : (r.why || 'A mentés nem sikerült.'); if (r.ok) app.audio.fx.ok(); };
      sv.onclick = go; if (!st.guest && st.user) go(); } }
  /* titkos fejlesztői menü */
  function dev() { backTo = menu; const D = app.DEV, ck = (k, t) => `<label class="card" style="flex-direction:row;align-items:center;gap:10px;cursor:pointer"><input type="checkbox" data-d="${k}" ${D[k] ? 'checked' : ''}> ${t}</label>`;
    const b = sheet('DEV', `<div class="grid">${ck('all', 'Minden gép feloldása (Zero gépével együtt)')}${ck('water', 'Végtelen víz')}${ck('god', 'Sérthetetlen gép')}${ck('fps', 'FPS és teljesítmény kijelző')}
      <div class="card"><b>Teleport</b><div class="meta">Térkép (M) → kattintás bárhová, küldetés közben is.</div></div></div>
      <div style="margin-top:14px"><button class="btn" id="devOff" style="border-color:#e0322a">Dev mód kikapcsolása</button></div>`, '<span class="devB">DEV</span>');
    b.querySelectorAll('[data-d]').forEach(x => x.onchange = () => { D[x.dataset.d] = x.checked ? 1 : 0; app.persistDev(); app.applySettings('fps'); });
    b.querySelector('#devOff').onclick = () => { app.setDev(0); menu(); }; }
  function crash(why, onR, onM) { show('#crash'); $('#crashW').textContent = why || ''; $('#crashR').onclick = () => { hideAll(); onR(); }; $('#crashM').onclick = () => menu(); }
  return { menu, hangar, missions, pause, end, crash, dev, hideAll, settings, help, refreshHangar: drawHangar };
}
