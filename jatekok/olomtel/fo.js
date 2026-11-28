/* ÓLOMTÉL – kezelőfelület, bevitel, játékhurok, mentés. Zárt béta: csak helyi mentés, ranglista nélkül. */
import { Sim, W, H } from './sim.js?v=202611282048';
import { Rajz } from './rajz.js?v=202611282048';
import { M, U, KAT, TECH, REAKTOR, GOZ_NEVL, TORVENY, IMPORT, NAPOK, HOSZINT, kovBetores } from './adat.js?v=202611282048';
import { DONTES } from './sim.js?v=202611282048';

const KULCS = 'hgws-olomtel-v1', $ = s => document.querySelector(s), ui = $('#ui'), cv = $('#c');
const f0 = v => Math.round(v).toLocaleString('hu-HU'), f1 = v => (Math.round(v * 10) / 10).toLocaleString('hu-HU');
const ANYAG = { acel: 'Acél', beton: 'Beton', alk: 'Alkatrész', elelem: 'Élelem' };
const ar = c => Object.entries(c || {}).map(([k, v]) => ANYAG[k] + ' ' + v).join(' · ');
let sim, rajz, seb = 1, sebElott = 1, eszk = null, kiv = null, kivL = null, lap = '', hoNez = false, kat = 'ol', fut = false, hang = localStorage.getItem('hgws-olomtel-hang') !== '0';
let utolsoNap = 0, panelKulcs = '', lenyomva = false, leir = '';

/* ---------- hang: szél és rövid jelzések ---------- */
let AC = null, szelG = null;
function hangInd() { if (AC || !hang) return; try { AC = new (window.AudioContext || window.webkitAudioContext)(); const n = AC.sampleRate * 3, b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0); let v = 0; for (let i = 0; i < n; i++) { v = v * .985 + (Math.random() * 2 - 1) * .015; d[i] = v * 6; }
  const s = AC.createBufferSource(); s.buffer = b; s.loop = true; const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = .6; szelG = AC.createGain(); szelG.gain.value = .0; s.connect(f).connect(szelG).connect(AC.destination); s.start(); } catch (_) {} }
function pitty(fr = 520, h = .06, t = 'square', g = .04) { if (!AC || !hang) return; const o = AC.createOscillator(), a = AC.createGain(); o.type = t; o.frequency.value = fr; a.gain.setValueAtTime(g, AC.currentTime); a.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + h); o.connect(a).connect(AC.destination); o.start(); o.stop(AC.currentTime + h); }

/* ---------- váz ---------- */
ui.innerHTML = `
<div id="fent" class="p">
  <div class="cs"><b id="nap"></b><span id="seb"></span></div>
  <div class="cs"><span id="ho"></span><small id="elore" class="lab"></small></div>
  <div class="cs"><span class="lab">Remény</span><div class="sav r"><i id="sRem"></i></div></div>
  <div class="cs"><span class="lab">Elégedetlenség</span><div class="sav e"><i id="sEl"></i></div></div>
  <div class="cs"><span class="lab">Nép</span><b id="nep"></b></div>
  <div class="cs"><span class="lab">Munkás</span><b id="mun"></b></div>
  <div class="cs"><span class="lab">Áram</span><b id="aram"></b></div>
  <div class="cs"><span class="lab">Acél</span><b id="kAcel"></b></div>
  <div class="cs"><span class="lab">Beton</span><b id="kBeton"></b></div>
  <div class="cs"><span class="lab">Alkatrész</span><b id="kAlk"></b></div>
  <div class="cs"><span class="lab">Élelem</span><b id="kEl"></b></div>
  <div class="cs"><span class="lab">Kiutalás</span><b id="kPont"></b></div>
  <div id="jobbf"><button data-lap="rend">Ellátás<kbd>F1</kbd></button><button data-lap="kut">Tervezés<kbd>F2</kbd></button><button data-lap="torv">Rendeletek<kbd>F3</kbd></button><button data-act="hang" id="bHang"></button></div>
</div>
<div id="bal"><div id="fel" class="p"></div><div id="naplo"></div></div>
<div id="jobb" class="p" hidden></div>
<div id="toast" class="p"></div>
<div id="lent" class="p"><div id="leir"></div><div id="kat"></div><div id="elem"></div></div>
<div id="mod" class="p" hidden></div>
<div id="menu"></div>`;
$('#seb').innerHTML = [['⏸', 0, 'Space'], ['1×', 1, '1'], ['2×', 2, '2'], ['4×', 4, '3']].map(([t, v, k]) => `<button data-seb="${v}">${t}<kbd>${k}</kbd></button>`).join('');

function toast(s) { const t = $('#toast'); t.textContent = s; t.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => t.style.display = 'none', 2600); pitty(180, .12, 'square', .05); }
const hiba = e => { if (typeof e === 'string' && e) { toast(e); return true; } return false; };

/* ---------- menü, mentés ---------- */
function mentes() { if (!sim || !fut) return; try { localStorage.setItem(KULCS, JSON.stringify(sim.ment())); } catch (_) {} }
function vanMentes() { try { return !!localStorage.getItem(KULCS); } catch (_) { return false; } }
function menu() {
  fut = false; const m = $('#menu'); m.hidden = false;
  m.innerHTML = `<div class="al">Vardán Népköztársaság · a háború utáni harmadik tél</div><h1>ÓLOMTÉL</h1><div class="beta">ZÁRT BÉTA</div>
  <p>Az Ólomhegyi 4. számú ipari körzet a Dnyeszter felső folyásánál. A VR-2 reaktorblokk találatot kapott, de még működik. A Főigazgatóság üzemanyagot és acélt vár, a tél pedig egyre mélyebb.</p>
  ${vanMentes() ? '<button data-act="folyt">Folytatás</button>' : ''}<button data-act="uj">Új körzet</button>`;
}
function indit(uj) {
  let s = null; if (!uj) try { s = JSON.parse(localStorage.getItem(KULCS)); } catch (_) {}
  try { sim = new Sim(s); } catch (e) { console.warn(e); sim = new Sim(); }
  if (!rajz) rajz = new Rajz(cv, sim); else { for (const e of rajz.egys.values()) rajz.torol(e.o); rajz.egys.clear(); rajz.sim = sim; rajz.csoKulcs = '?'; rajz.romok(); }
  kiv = null; eszk = null; lap = ''; seb = 1; utolsoNap = sim.nap; fut = true; $('#menu').hidden = true; hangInd(); epitoSav(); panel(true); hud(); if (hoNez) rajz.hoterkep(true);
}

/* ---------- felső sáv, feladatok, napló ---------- */
function hud() {
  const s = sim, T = s.T, o = Math.floor(s.ora), p = Math.floor((s.ora % 1) * 60);
  $('#nap').textContent = `${s.nap}. nap ${String(o).padStart(2, '0')}:${String(p - p % 10).padStart(2, '0')}`;
  const h = $('#ho'); h.textContent = Math.round(T) + ' °C'; h.className = T < -50 ? 'h3' : T < -32 ? 'h2' : '';
  const b = kovBetores(Math.floor(s.t / 24), s.t % 24); $('#elore').textContent = !b ? '' : b.nap > 0 ? `hidegbetörés ${f1(b.nap)} nap múlva (${b.d} °C)` : `hidegbetörés · még ${f1(b.vege)} nap`;
  $('#sRem').style.width = s.remeny + '%'; $('#sEl').style.width = s.eleg + '%';
  $('#nep').textContent = `${f0(s.nep)}${s.beteg >= 1 ? ' (' + f0(s.beteg) + ' beteg)' : ''}`; $('#mun').textContent = `${s.szabad} szabad / ${s.munkaero}`;
  const a = $('#aram'); a.textContent = `${f0(s.aramI)} / ${f0(s.aramT)} MW`; a.style.color = s.pf < .99 ? '#ff9a8a' : '';
  $('#kAcel').textContent = f0(s.stock.acel); $('#kBeton').textContent = f0(s.stock.beton); $('#kAlk').textContent = f0(s.stock.alk); const el = $('#kEl'); el.textContent = f0(s.stock.elelem); el.style.color = s.stock.elelem < s.nep ? '#ff9a8a' : ''; $('#kPont').textContent = f0(s.kredit);
  document.querySelectorAll('[data-seb]').forEach(x => x.classList.toggle('on', +x.dataset.seb === seb));
  document.querySelectorAll('[data-lap]').forEach(x => x.classList.toggle('on', x.dataset.lap === lap));
  $('#bHang').textContent = hang ? 'Hang: be' : 'Hang: ki';
  const gy = document.documentElement.style; gy.setProperty('--ft', $('#fent').offsetHeight + 'px'); gy.setProperty('--lt', $('#lent').offsetHeight + 'px'); $('#bal').style.display = innerWidth < 760 && (kiv || lap) ? 'none' : '';
  $('#fel').innerHTML = `<span class="lab">Feladatok</span>` + s.feladatok().map(n => `<div>${n}</div>`).join('');
  const most = s.t; $('#naplo').innerHTML = s.naplo.filter(n => most - n.t < 14).slice(-5).map(n => `<div class="${n.k}">${n.s}</div>`).join('');
}

/* ---------- építősáv ---------- */
function recept(d) { const be = (d.be || []).filter(p => p.r).map(p => (p.acc.length > 1 ? p.n : M[p.acc[0]].n) + ' ' + f1(p.r)), ki = (d.ki || []).filter(p => p.r).map(p => M[p.m].n + ' ' + f1(p.r));
  const r = [be.join(' + '), ki.length ? '→ ' + ki.join(', ') : ''].filter(Boolean).join(' '); return [r && r + ' t/óra', d.gen && d.gen + ' MW áram', d.lak && d.lak + ' férőhely', d.agy && d.agy + ' ágy', d.ho && 'fűtött övezet', d.tar && 'tároló ' + d.cap + ' t', d.fo && d.fo + ' fő', d.pw && d.pw + ' MW', d.mel && 'felfűtés ' + d.mel + ' óra'].filter(Boolean).join(' · '); }
function epitoSav() {
  $('#kat').innerHTML = Object.entries(KAT).map(([k, n]) => `<button data-kat="${k}" class="${k === kat ? 'on' : ''}">${n}</button>`).join('') +
    `<span style="flex:1"></span><button data-act="bont" class="${eszk && eszk.m === 'bont' ? 'on' : ''}">Bontás<kbd>B</kbd></button><button data-act="ho" class="${hoNez ? 'on' : ''}">Hőtérkép<kbd>H</kbd></button><button data-act="forgK">⟲<kbd>Q</kbd></button><button data-act="forgE">⟳<kbd>E</kbd></button>`;
  $('#elem').innerHTML = Object.entries(U).filter(([, d]) => d.kat === kat).map(([t, d]) => { const zar = d.tech && !sim.tech[d.tech], nincs = !sim.vanRa(d.c);
    return `<button class="kar${zar ? ' zar' : ''}${nincs ? ' nincs' : ''}${eszk && eszk.t === t ? ' on' : ''}" data-ep="${t}"><b>${d.n}</b><span>${zar ? 'Tervezés: ' + TECH[d.tech].n : ar(d.c)}</span></button>`; }).join('');
  $('#leir').textContent = leir;
}

/* ---------- jobb oldali lap: egység vagy listák ---------- */
const ALL = { epul: 'Épül', ki: 'Leállítva', serult: 'Sérült – javítani kell', ember: 'Nincs munkás', aram: 'Áramhiány', felfut: 'Felfűtés', uzemel: 'Üzemel', var: 'Várakozik', scram: 'Vészleállás' };
function allTxt(u) { const a = u.all || ''; if (a.startsWith('var:')) return ['Hiányzik: ' + a.slice(4), 'baj']; if (a.startsWith('tele:')) return ['Megtelt: ' + a.slice(5), 'baj']; if (a === 'epul') return ['Épül ' + Math.round(u.ep * 100) + '%', '']; if (a === 'felfut') return ['Felfűtés ' + Math.round(u.mel * 100) + '%', '']; if (a === 'uzemel') return ['Üzemel ' + Math.round(u.fut * 100) + '%', 'ok']; return [ALL[a] || a, a === 'var' ? '' : 'baj']; }
const sav = (v, o = '') => `<div class="sav ${o}"><i style="width:${Math.max(0, Math.min(100, v * 100))}%"></i></div>`;
function kapSor(L, masik, be) { const m = L.m ? M[L.m] : null, fagyhat = m && sim.T < m.thr; return `<div class="kap${L.dug ? ' dug' : ''}">${be ? '←' : '→'} ${U[masik.t].n} · ${L.dug ? 'BEFAGYOTT' : f1(L.aram) + ' t/óra'}${L.fagy > .05 && !L.dug ? ' · dermed ' + Math.round(L.fagy * 100) + '%' : ''}
  <span style="float:right"><button data-act="futes" data-id="${L.id}" class="${L.trace ? 'on' : ''}"${fagyhat || L.trace ? '' : ''}>Fűtés</button> <button data-act="lold" data-id="${L.id}" class="v">✕</button></span></div>`; }
function egysegLap(u) {
  const s = sim, d = U[u.t], [at, ak] = allTxt(u); let h = `<h2>${d.n}<button data-act="zar">✕</button></h2><div class="all ${ak}">${at}</div>`;
  if (u.hp < 1) h += `<div class="sor"><span class="n">Állapot</span>${sav(u.hp, 'e')}<button data-act="javit">Javítás</button></div>`;
  if (d.mel && u.ep >= 1) h += `<div class="sor"><span class="n">Üzemmeleg</span>${sav(u.mel)}</div>`;
  if (d.fo) h += `<div class="sor"><span class="n">Munkások</span><b>${u.fo} / ${d.fo}</b></div>`;
  if (d.pw) h += `<div class="sor"><span class="n">Áramigény</span><b>${d.pw} MW</b></div>`;
  if (u.t === 'turbina') h += `<div class="sor"><span class="n">Termelés</span><b>${f1(u.fut * d.gen)} MW</b></div>`;
  if (u.t === 'szallo') h += `<div class="sor"><span class="n">Hőérzet</span><b>${HOSZINT[u.komf ?? s.komfort(u)]}</b></div>`;
  if (u.t === 'reaktor') h += reaktorLap(u);
  if (u.t === 'allomas') h += ellatasLap();
  else {
    const be = d.tar ? [] : d.be; if (be.length) h += '<h3>Bemenet</h3>';
    be.forEach((p, i) => { const b = u.b[i]; h += `<div class="sor"><span class="n">${p.acc.length > 1 ? (p.n || 'Vegyes') + (b.m && b.q > .01 ? ': ' + M[b.m].n : '') : M[p.acc[0]].n}${p.opt ? ' <small>(nem kötelező)</small>' : ''}</span><small>${f0(b.q)} t</small>${sav(b.q / s.beCap(u, i))}</div>`; for (const L of s.links) if (L.b === u.id && L.bp === i) h += kapSor(L, s.get(L.a), 1); });
    const ki = d.tar ? [{ tar: 1 }] : d.ki; if (ki.length) h += `<h3>${d.tar ? 'Tartalom' : 'Kimenet'}</h3>`;
    ki.forEach((p, j) => { const b = u.k[j], m = p.tar ? (b.q > .01 ? b.m : null) : p.m, kozut = m && M[m].k === 'r';
      h += `<div class="sor"><span class="n">${m ? M[m].n : 'Üres'}</span>${kozut ? '<small>a raktárba</small>' : `<small>${f0(b.q)} t</small>${sav(b.q / s.kiCap(u, j))}<button data-act="kot" data-ap="${j}" class="${eszk && eszk.m === 'kot' && eszk.ap === j ? 'on' : ''}">Bekötés</button>`}</div>`;
      if (p.tar) for (const L of s.links) if (L.b === u.id) h += kapSor(L, s.get(L.a), 1);
      for (const L of s.links) if (L.a === u.id && L.ap === j) h += kapSor(L, s.get(L.b), 0); });
  }
  if (!d.fix || d.fo) h += `<div class="gsor">${d.fix ? '' : `<button data-act="uzem" class="${u.on ? '' : 'on'}">${u.on ? 'Leállítás' : 'Indítás'}</button>`}${d.fo ? `<button data-act="prio">Fontosság: ${['', 'alacsony', 'közepes', 'magas'][u.prio]}</button>` : ''}${d.fix ? '' : '<button data-act="bontEgy" class="v">Bontás</button>'}</div>`;
  return h;
}
function reaktorLap(u) {
  const R = sim.r, f = REAKTOR[R.lvl], k = REAKTOR[R.lvl + 1]; let h = `<h3>Reaktor · ${f.n}</h3>
  <div class="sor"><span class="n">Hőteljesítmény</span><b>${Math.round(f.telj * R.set * 100)}%</b></div><input type="range" min="20" max="100" value="${Math.round(R.set * 100)}" data-inp="rset">
  <div class="sor"><span class="n">Gőz</span><b>${f1(GOZ_NEVL * f.telj * R.set * (R.tul ? 1.3 : 1) * (R.korlat ? 1 : 1.15))} t/óra</b></div>
  <div class="sor"><span class="n">Zónaterhelés</span>${sav(R.stressz / 100, 'e')}</div>
  ${f.sug ? '<div class="all baj">Sugárzik: a személyzet megbetegszik</div>' : ''}${R.korlat ? '' : '<div class="all baj">Védelmi korlátok kiiktatva</div>'}
  <div class="gsor"><button data-act="tul" class="${R.tul ? 'on' : ''}">Túlterhelés</button></div>`;
  if (k) h += `<h3>Helyreállítás</h3><div class="sor"><span class="n"><b>${k.n}</b><br><small>${ar(k.c)} · ${k.ora} óra${k.tech && !sim.tech[k.tech] ? ' · tervezés: ' + TECH[k.tech].n : ''}</small></span>${R.jav ? sav(R.jav.h / k.ora, 'k') : '<button data-act="rjav">Indítás</button>'}</div>`;
  return h;
}
function ellatasLap() {
  const s = sim, q = s.kvota(); let h = '';
  if (q) { h += `<h3>Rendelés · határidő: ${q.nap}. nap reggel</h3>`; for (const m in q.k) { const t = q.t[m] || 0, r = s.rak[m] || 0; h += `<div class="sor"><span class="n">${M[m].n}</span><small>${f0(t)}${r >= 1 ? ' + ' + f0(r) : ''} / ${q.k[m]} t</small>${sav((t + r) / q.k[m], 'r')}</div>`; }
    h += `<div class="sor"><small>Teljesítésért: +${q.jut} kiutalási pont</small></div>`; if (q.k.acel) h += `<div class="gsor"><button data-act="atad" data-q="50">Acéláru átadása: 50 t</button></div>`; }
  const rak = Object.entries(s.rak).filter(e => e[1] >= 1); h += '<h3>Rakodó · a reggeli vonat viszi el</h3>' + (rak.length ? rak.map(([m, v]) => `<div class="sor"><span class="n">${M[m].n}</span><small>${f0(v)} t · ${f0(v * (M[m].ar || 0))} pont</small></div>`).join('') : '<div class="sor"><small>Üres</small></div>');
  h += '<h3>Kiutalás · a következő vonattal érkezik</h3>'; for (const m in IMPORT) h += `<div class="sor"><span class="n">${M[m].n} <small>${IMPORT[m]} pont/t</small></span><b>${s.megr[m] || 0} t</b><button data-act="rend" data-m="${m}" data-q="-20">−20</button><button data-act="rend" data-m="${m}" data-q="20">+20</button></div>`;
  return h;
}
function listaLap() {
  const s = sim; if (lap === 'rend') return `<h2>Ellátás<button data-act="zar">✕</button></h2>` + ellatasLap();
  if (lap === 'kut') { const van = s.units.some(u => u.t === 'kutato' && u.ep >= 1); return `<h2>Tervezés<button data-act="zar">✕</button></h2>${van ? '' : '<div class="all baj">Tervezőintézet kell hozzá</div>'}<div class="lista">` + Object.entries(TECH).map(([k, t]) => `<div class="t"><div class="sor"><span class="n"><b>${t.n}</b><small>${Object.values(U).filter(d => d.tech === k).map(d => d.n).join(', ') || { szigeteles: 'Fele akkora fűtési igény, lassabb dermedés', panel: 'Melegebb szállók', reaktorfiz: 'A reaktor további helyreállítása' }[k]}${t.kell && !s.tech[t.kell] ? ' · előbb: ' + TECH[t.kell].n : ''}</small></span>${s.tech[k] ? '<small>kész</small>' : s.kut === k ? sav(s.kutP / t.p, 'k') : `<small>${t.p} óra</small><button data-act="kut" data-k="${k}">Indítás</button>`}</div></div>`).join('') + '</div>'; }
  if (lap === 'torv') { const var_ = Math.max(0, s.torvT - s.t); return `<h2>Rendeletek<button data-act="zar">✕</button></h2>${var_ > 0 ? `<div class="all">Új rendelet ${f0(var_)} óra múlva hozható</div>` : ''}<div class="lista">` + Object.entries(TORVENY).map(([k, t]) => `<div class="t"><div class="sor"><span class="n"><b>${t.n}</b><small>${t.le}</small></span>${s.torv[k] ? '<small>érvényben</small>' : `<button data-act="torv" data-k="${k}"${var_ > 0 ? ' disabled' : ''}>Kihirdetés</button>`}</div></div>`).join('') + '</div>'; }
  return '';
}
function panel(kenyszer) {
  const j = $('#jobb'), u = kiv ? sim.get(kiv) : null; if (kiv && !u) kiv = null;
  if (!u && !lap) { j.hidden = true; panelKulcs = ''; return; }
  if (lenyomva && !kenyszer) return;
  const h = u ? egysegLap(u) : listaLap(); if (h !== panelKulcs) { const st = j.scrollTop; j.innerHTML = h; j.scrollTop = st; panelKulcs = h; } j.hidden = false;
}
function modal() {
  const m = $('#mod'), s = sim; if (s.dontes) { const D = DONTES[s.dontes]; const h = `<h2>${D.c}</h2><p>${D.s}</p><div class="gsor"><button data-act="dontA">${D.a}</button><button data-act="dontB">${D.b}</button></div>`; if (m.dataset.k !== s.dontes) { m.innerHTML = h; m.dataset.k = s.dontes; pitty(330, .3, 'triangle', .06); } m.hidden = false; return; }
  if (s.vege) { const sz = { gyozelem: ['A Mélypont elmúlt', `A körzet kitartott ${NAPOK} napig. ${f0(s.nep)} ember él, ${s.halott} halt meg. A kémények füstölnek, a vonatok járnak.`], lazadas: ['A körzet fellázadt', 'A munkások megszállták az igazgatóságot. A Főigazgatóság új vezetőt nevez ki.'], kihalt: ['A körzet elnéptelenedett', 'Nem maradt, aki üzemben tartsa a gyárakat.'] }[s.vege];
    const h = `<h2>${sz[0]}</h2><p>${sz[1]}</p><div class="gsor">${s.vege === 'gyozelem' ? '<button data-act="tovabb">Tovább játszom</button>' : ''}<button data-act="ujra">Új körzet</button></div>`; if (m.dataset.k !== s.vege) { m.innerHTML = h; m.dataset.k = s.vege; } m.hidden = false; return; }
  m.hidden = true; m.dataset.k = '';
}

/* ---------- eszközök ---------- */
function eszkoz(e) { eszk = e; if (!e || e.m !== 'kot') rajz.celpontok([]); if (!e || e.m !== 'epit') rajz.szellem(null); cv.style.cursor = e ? 'crosshair' : ''; leir = e && e.m === 'epit' ? U[e.t].n + ' — ' + recept(U[e.t]) : e && e.m === 'kot' ? 'Bekötés: ' + (M[sim.kiAnyag(sim.get(e.a), e.ap)[0]] || {}).n + ' →' : e && e.m === 'bont' ? 'Bontás' : ''; epitoSav(); panel(true); }
function kotInd(u, ap) { if (eszk && eszk.m === 'kot' && eszk.a === u.id && eszk.ap === ap) return eszkoz(null); eszkoz({ m: 'kot', a: u.id, ap }); rajz.celpontok(sim.units.filter(b => sim.celPort(u, ap, b) >= 0)); }
function csempe(e, t, rot) { const p = rajz.talajPont(e.clientX, e.clientY), [w, h] = t ? sim.meret(t, rot) : [1, 1]; return [Math.floor(p.x - w / 2 + .5), Math.floor(p.z - h / 2 + .5)]; }
function katt(e) {
  const s = sim; if (eszk && eszk.m === 'epit') { const [x, y] = csempe(e, eszk.t, eszk.rot), r = s.epit(eszk.t, x, y, eszk.rot); if (hiba(r)) return; pitty(140, .12, 'sawtooth', .06); if (!e.shiftKey) { kiv = r.id; lap = ''; eszkoz(null); } else epitoSav(); return; }
  if (eszk && eszk.m === 'bont') { const u = rajz.egysegAlatt(e.clientX, e.clientY); if (u) { if (!hiba(s.bont(u))) pitty(110, .15, 'sawtooth', .06); } else { const [x, y] = csempe(e); if (x >= 0 && y >= 0 && x < W && y < H && s.romBont(x, y)) { rajz.romok(); pitty(110, .1, 'sawtooth', .05); } } epitoSav(); return; }
  const u = rajz.egysegAlatt(e.clientX, e.clientY);
  if (eszk && eszk.m === 'kot') { if (!u) return eszkoz(null); const L = s.kot(eszk.a, eszk.ap, u.id); if (hiba(L)) return; if (L.m && s.T < M[L.m].thr) L.trace = 1; pitty(620, .06); kiv = eszk.a; eszkoz(null); return; }
  kiv = u ? u.id : null; if (u) { lap = ''; pitty(440, .04); } panel(true);
}

/* ---------- események ---------- */
ui.addEventListener('pointerdown', e => { lenyomva = true; });
addEventListener('pointerup', () => { lenyomva = false; });
ui.addEventListener('input', e => { if (e.target.dataset.inp === 'rset') { sim.r.set = +e.target.value / 100; sim.hoTerkep(); if (hoNez) rajz.hoterkep(true); } });
ui.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; hangInd(); const d = b.dataset, s = sim, u = kiv && s ? s.get(kiv) : null;
  if (d.seb != null) { seb = +d.seb; return hud(); }
  if (d.lap) { lap = lap === d.lap ? '' : d.lap; kiv = null; panel(true); return hud(); }
  if (d.kat) { kat = d.kat; return epitoSav(); }
  if (d.ep) { const D = U[d.ep]; if (D.tech && !s.tech[D.tech]) return toast('Előbb ki kell fejleszteni: ' + TECH[D.tech].n); return eszkoz(eszk && eszk.t === d.ep ? null : { m: 'epit', t: d.ep, rot: 0 }); }
  switch (d.act) {
    case 'uj': indit(true); break; case 'folyt': indit(false); break; case 'ujra': localStorage.removeItem(KULCS); indit(true); break; case 'tovabb': s.folytat(); break;
    case 'hang': hang = !hang; localStorage.setItem('hgws-olomtel-hang', hang ? '1' : '0'); if (hang) hangInd(); else if (szelG) szelG.gain.value = 0; hud(); break;
    case 'bont': eszkoz(eszk && eszk.m === 'bont' ? null : { m: 'bont' }); break;
    case 'ho': hoNez = !hoNez; rajz.hoterkep(hoNez); epitoSav(); break;
    case 'forgK': rajz.irany--; break; case 'forgE': rajz.irany++; break;
    case 'zar': kiv = null; lap = ''; eszkoz(null); break;
    case 'kot': if (u) kotInd(u, +d.ap); break;
    case 'futes': { const L = s.links.find(L => L.id === +d.id); if (L) L.trace = L.trace ? 0 : 1; break; }
    case 'lold': s.old(+d.id); break;
    case 'uzem': if (u) u.on = u.on ? 0 : 1; break;
    case 'prio': if (u) u.prio = u.prio % 3 + 1; break;
    case 'bontEgy': if (u && !hiba(s.bont(u))) kiv = null; break;
    case 'javit': if (u) hiba(s.javit(u)); break;
    case 'tul': s.r.tul = s.r.tul ? 0 : 1; s.hoTerkep(); break;
    case 'rjav': hiba(s.reaktorJavit()); break;
    case 'rend': hiba(s.rendel(d.m, +d.q)); break;
    case 'atad': s.atad('acel', +d.q); break;
    case 'kut': hiba(s.kutat(d.k)); break;
    case 'torv': hiba(s.torveny(d.k)); break;
    case 'dontA': s.dont(true); break; case 'dontB': s.dont(false); break;
  }
  pitty(480, .04); panel(true); hud(); modal();
});
ui.addEventListener('pointerover', e => { const b = e.target.closest('[data-ep]'); if (b && !(eszk && eszk.m)) { leir = U[b.dataset.ep].n + ' — ' + recept(U[b.dataset.ep]); $('#leir').textContent = leir; } });

// térkép: húzás = mozgatás, kattintás = művelet, görgő / csípés = nagyítás
const mut = new Map(); let huzas = 0, csip = 0;
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); mut.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, g: e.button }); huzas = 0; if (mut.size === 2) { const [a, b] = [...mut.values()]; csip = Math.hypot(a.x - b.x, a.y - b.y); } hangInd(); });
cv.addEventListener('pointermove', e => {
  const m = mut.get(e.pointerId);
  if (m && fut) { const dx = e.clientX - m.x, dy = e.clientY - m.y; m.x = e.clientX; m.y = e.clientY;
    if (mut.size === 2) { const [a, b] = [...mut.values()], t = Math.hypot(a.x - b.x, a.y - b.y); if (csip > 0) rajz.nagyit(csip / t); csip = t; huzas = 99; }
    else { if (Math.hypot(e.clientX - m.x0, e.clientY - m.y0) > 7) huzas = 99; if (huzas) rajz.huz(dx, dy); } }
  if (fut && eszk && eszk.m === 'epit' && (e.pointerType === 'mouse' || m)) { const [x, y] = csempe(e, eszk.t, eszk.rot); rajz.szellem(eszk.t, x, y, eszk.rot, !sim.lehet(eszk.t, x, y, eszk.rot) && sim.vanRa(U[eszk.t].c)); }
});
const fel = e => { const m = mut.get(e.pointerId); mut.delete(e.pointerId); if (mut.size < 2) csip = 0; if (!m || !fut || sim.dontes || sim.vege) return; if (!huzas && m.g === 0) katt(e); else if (!huzas && m.g === 2) { if (eszk) eszkoz(null); else { kiv = null; panel(true); } } };
cv.addEventListener('pointerup', fel); cv.addEventListener('pointercancel', e => { mut.delete(e.pointerId); });
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('wheel', e => { e.preventDefault(); if (fut) rajz.nagyit(e.deltaY > 0 ? 1.12 : 1 / 1.12); }, { passive: false });
addEventListener('keydown', e => {
  if (!fut || e.target.tagName === 'INPUT' && e.key !== 'Escape') return; const k = e.key.toLowerCase();
  if (k === ' ') { e.preventDefault(); if (seb) { sebElott = seb; seb = 0; } else seb = sebElott || 1; }
  else if (k === '1') seb = 1; else if (k === '2') seb = 2; else if (k === '3') seb = 4;
  else if (k === 'q') rajz.irany--; else if (k === 'e') rajz.irany++;
  else if (k === 'r' && eszk && eszk.m === 'epit') { eszk.rot = (eszk.rot + 1) % 4; }
  else if (k === 'h') { hoNez = !hoNez; rajz.hoterkep(hoNez); epitoSav(); }
  else if (k === 'b') eszkoz(eszk && eszk.m === 'bont' ? null : { m: 'bont' });
  else if (k === 'escape') { if (eszk) eszkoz(null); else { kiv = null; lap = ''; panel(true); } }
  else if (k === 'f1' || k === 'f2' || k === 'f3') { e.preventDefault(); const l = { f1: 'rend', f2: 'kut', f3: 'torv' }[k]; lap = lap === l ? '' : l; kiv = null; panel(true); }
  else if ('wasd'.includes(k) || k.startsWith('arrow')) { const v = 40; rajz.huz(k === 'a' || k === 'arrowleft' ? v : k === 'd' || k === 'arrowright' ? -v : 0, k === 'w' || k === 'arrowup' ? v : k === 's' || k === 'arrowdown' ? -v : 0); }
  else return; hud();
});
addEventListener('resize', () => rajz && rajz.meret());
addEventListener('pagehide', mentes); document.addEventListener('visibilitychange', () => { if (document.hidden) mentes(); });

/* ---------- hurok: 1 játékóra = 3 másodperc 1× sebességen ---------- */
let elozo = performance.now(), uiT = 0;
function kor(most) {
  requestAnimationFrame(kor); const dt = Math.min(.1, (most - elozo) / 1000); elozo = most; if (!rajz) return;
  if (fut && seb > 0) { let ora = dt * seb / 3; while (ora > 0) { const l = Math.min(.05, ora); sim.step(l); ora -= l; } }
  if (fut) { rajz.kivL = null; rajz.kijelol(kiv ? sim.get(kiv) : null); uiT += dt; if (uiT > .25) { uiT = 0; hud(); panel(); modal(); if (hoNez) rajz.hoterkep(true); if (sim.nap !== utolsoNap) { utolsoNap = sim.nap; mentes(); epitoSav(); }
      if (szelG) szelG.gain.value = hang ? .05 + Math.max(0, Math.min(1, (-25 - sim.T) / 40)) * .22 : 0; } }
  rajz.rajzol(most / 1000, dt);
}
// a menü mögött is látszik a körzet
sim = new Sim(); rajz = new Rajz(cv, sim); menu(); requestAnimationFrame(kor);
ui.querySelectorAll('#fent,#bal,#lent').forEach(x => x.style.visibility = 'hidden');
new MutationObserver(() => { const v = $('#menu').hidden ? '' : 'hidden'; ui.querySelectorAll('#fent,#bal,#lent').forEach(x => x.style.visibility = v); }).observe($('#menu'), { attributes: true });
if (typeof window !== 'undefined') window.__OT = { get sim() { return sim; }, get rajz() { return rajz; }, indit };
