// Kezelőfelület: HUD (forgó minitérkép útvonallal, élet/páncél, pénz, csillagok), nagy térkép (zoom, útpont), telefon (küldetések, névjegyek, HGWS Banki App),
// fegyverkerék, menük (főmenü HGWS STUDIOS intróval, szünet, beállítások, irányítás), átvezetők feliratai, értesítések.
import * as W from './world.js?v=202611271126';
import { WEAPONS } from './weapons.js?v=202611271126';
import { MAIN } from './missions.js?v=202611271126';
import { VEH } from './vehicles.js?v=202611271126';

const $ = (h, p) => { const d = document.createElement('div'); d.innerHTML = h.trim(); const e = d.firstChild; p && p.appendChild(e); return e; };
const fmt = n => Math.round(n).toLocaleString('hu') + ' Ft';
const MAPS = 2048, M0 = -1024;   // térkép-textúra: 1 px = 1 m
export function createUI(ctx) {
  const root = document.getElementById('ui'), S = ctx.save;
  const hud = $(`<div id="hud" class="hide">
    <div id="wet"></div><div id="dmg"></div>
    <div id="toasts"></div>
    <div id="tr"><div id="clock"></div><div id="weap"><div class="i"></div><div><div class="n"></div><div class="a"></div></div></div><div id="money"></div><div id="stars">${'<span>★</span>'.repeat(5)}</div></div>
    <div id="timer" class="hide"></div>
    <div id="mmw"><canvas id="mm" width="440" height="440"></canvas><div id="bars"><div class="bar" id="hpb"><i></i></div><div class="bar" id="arb"><i></i></div></div></div>
    <div id="dist"></div><div id="speed" class="hide"></div><div id="vehn"></div><div id="zone"></div>
    <div id="obj"></div><div id="prompt" class="hide"></div><div id="prog" class="hide"><i></i></div><div id="cross" class="hide"></div>
    <div id="banner"><b></b><span></span></div><div id="devb" class="hide">FEJLESZTŐI MÓD – MENTÉS KIKAPCSOLVA</div></div>`, root);
  const cine = $(`<div id="cine"><div id="sub"></div><div id="skip" class="hide">Enter – átugrás</div></div>`, root);
  const q = s => root.querySelector(s), E = { money: q('#money'), stars: q('#stars'), clock: q('#clock'), wi: q('#weap .i'), wn: q('#weap .n'), wa: q('#weap .a'), hp: q('#hpb i'), ar: q('#arb i'), obj: q('#obj'), prompt: q('#prompt'), timer: q('#timer'), prog: q('#prog'), progI: q('#prog i'), toasts: q('#toasts'), banner: q('#banner'), cross: q('#cross'), zone: q('#zone'), vehn: q('#vehn'), speed: q('#speed'), dist: q('#dist'), wet: q('#wet'), dmg: q('#dmg'), devb: q('#devb'), sub: q('#sub'), skip: q('#skip') };
  const mm = q('#mm'), mx = mm.getContext('2d');
  /* ---------- térkép-alap ---------- */
  const base = document.createElement('canvas'); base.width = base.height = MAPS; const bx = base.getContext('2d');
  { const DC = { belvaros: '#3c4046', panel: '#3a3e3a', ipari: '#47423a', kertes: '#2f4430', avas: '#2c4a2c', folyo: '#33503a' };
    bx.fillStyle = '#26382a'; bx.fillRect(0, 0, MAPS, MAPS);
    for (const B of W.BLOCKS) { bx.fillStyle = DC[B.dist] || '#333'; bx.fillRect(B.cx - 50 - M0, B.cz - 50 - M0, 100, 100); }
    bx.fillStyle = '#2a6fa8'; bx.fillRect(0, W.RIV0 - M0, MAPS, W.RIV1 - W.RIV0);
    bx.strokeStyle = '#8d939a'; bx.lineCap = 'square'; for (const r of W.ROADS) { bx.lineWidth = r.hw ? 22 : 14; bx.strokeStyle = r.hw ? '#c8a43a' : '#8d939a'; bx.beginPath(); bx.moveTo(r.a[0] - M0, r.a[1] - M0); bx.lineTo(r.b[0] - M0, r.b[1] - M0); bx.stroke(); }
    bx.strokeStyle = '#c8b25a'; bx.lineWidth = 2; bx.beginPath(); bx.moveTo(-700 - M0, -M0); bx.lineTo(700 - M0, -M0); bx.stroke();
    for (const B of W.BLOCKS) for (const o of B.b) { if (o.pipes) continue; bx.fillStyle = o.style === 'hgws' || o.style === 'hgwsg' ? '#2a9bd8' : o.tank ? '#7a8288' : o.style === 'szerviz' ? '#d8a82a' : o.style === 'house' || o.style === 'villa' ? '#7a6a5a' : '#5a5f66';
      if (o.tank) { bx.beginPath(); bx.arc(o.x - M0, o.z - M0, o.r, 0, 6.3); bx.fill(); } else if (o.w) bx.fillRect(o.x - o.w / 2 - M0, o.z - o.d / 2 - M0, o.w, o.d); else if (o.tower) { bx.beginPath(); bx.arc(o.x - M0, o.z - M0, 5, 0, 6.3); bx.fill(); } }
    bx.font = '900 30px Arial'; bx.textAlign = 'center'; bx.fillStyle = 'rgba(255,255,255,.28)';
    for (const [n, x, z] of [['BELVÁROS', 0, -150], ['PANELNEGYED', -560, 0], ['IPARI ZÓNA', 560, 120], ['AVAS', 500, -560], ['SAJÓ', -300, 452], ['KERTVÁROS', 0, 650], ['KERTVÁROS', -500, -600], ['AUTÓPÁLYA', -860, -300]]) bx.fillText(n, x - M0, z - M0); }
  /* ---------- állapot ---------- */
  const U = { menuOpen: false, mapOpen: false, phoneOpen: false, wheelOpen: false, screen: null, waypoint: null, routeT: 0, route: [], toastQ: [], zoneT: 0, lastZone: '', bannerT: 0 };
  let menuSel = 0, menuItems = [], menuClose = null;
  /* ---------- HUD apróságok ---------- */
  U.toast = (t, cls = '') => { const e = $(`<div class="toast ${cls}">${t}</div>`, E.toasts); setTimeout(() => e.remove(), cls === 'ad' ? 9000 : 4500); while (E.toasts.children.length > 4) E.toasts.firstChild.remove(); };
  U.banner = (t, s = '', fail) => { E.banner.querySelector('b').textContent = t; E.banner.querySelector('span').textContent = s; E.banner.classList.toggle('fail', !!fail); E.banner.style.opacity = 1; U.bannerT = 4; };
  U.passed = (n, r) => U.banner('KÜLDETÉS TELJESÍTVE', n + (r ? ` · +${fmt(r)}` : ''));
  U.failed = r => U.banner('KÜLDETÉS SIKERTELEN', r, true);
  U.objective = t => { E.obj.textContent = t || ''; };
  U.timer = s => { if (s < 0) return E.timer.classList.add('hide'); E.timer.classList.remove('hide'); E.timer.classList.toggle('low', s < 15); E.timer.textContent = `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; };
  U.progress = k => { if (k < 0) return E.prog.classList.add('hide'); E.prog.classList.remove('hide'); E.progI.style.width = Math.min(100, k * 100) + '%'; };
  U.subtitle = (who, txt) => { E.sub.innerHTML = txt ? (who ? `<b>${who}:</b>` : '') + txt : ''; };
  U.cine = on => { cine.classList.toggle('on', on); E.skip.classList.toggle('hide', !on); hud.style.opacity = on ? 0 : 1; if (!on) U.subtitle('', ''); };
  U.dev = on => E.devb.classList.toggle('hide', !on);
  U.showHud = on => hud.classList.toggle('hide', !on);
  /* ---------- minitérkép ---------- */
  const blipCol = { mission: '#ffd23a', obj: '#ffd23a', job: '#37e07a', prop: '#3a9bff', shop: '#ff8a2a', enemy: '#ff3a3a', race: '#ff3ad2', way: '#a86bff' };
  function target() { const L = ctx.markers.list, m = L.find(m => m.kind === 'obj' || m.kind === 'enemy') || L.find(m => m.kind === 'race' && !m.label); if (m) return m; if (U.waypoint) return U.waypoint; return L.find(m => m.kind === 'mission') || null; }
  function drawMini(dt) {
    const pl = ctx.player, p = pl.veh ? pl.veh.pos : pl.pos, yaw = ctx.cam.yaw, R = 220, sc = pl.veh && pl.veh.speed > 20 ? 1.1 : 1.6, c = mx;
    c.save(); c.clearRect(0, 0, 440, 440); c.beginPath(); c.arc(R, R, R, 0, 6.3); c.clip(); c.fillStyle = '#1c2a1f'; c.fillRect(0, 0, 440, 440);
    c.translate(R, R); c.rotate(yaw); c.scale(sc, sc); c.translate(-(p.x - M0), -(p.z - M0)); c.drawImage(base, 0, 0);
    // útvonal
    U.routeT -= dt; const tg = target(); if (U.routeT <= 0) { U.routeT = 1; U.route = tg ? W.route(p.x, p.z, tg.x, tg.z) : []; }
    if (U.route.length > 1 && tg) { c.strokeStyle = tg.kind === 'way' ? '#b27bff' : '#ffd23a'; c.lineWidth = 6 / sc * 1.6; c.lineJoin = 'round'; c.beginPath(); c.moveTo(p.x - M0, p.z - M0); for (const [x, z] of U.route.slice(1)) c.lineTo(x - M0, z - M0); c.stroke(); }
    // blipek
    const blip = (x, z, col, r = 5, sh = 'c', txt) => { c.save(); c.translate(x - M0, z - M0); c.rotate(-yaw); c.scale(1 / sc, 1 / sc); c.fillStyle = col; c.strokeStyle = '#000'; c.lineWidth = 2;
      if (sh === 's') { c.fillRect(-r, -r, r * 2, r * 2); c.strokeRect(-r, -r, r * 2, r * 2); } else { c.beginPath(); c.arc(0, 0, r, 0, 6.3); c.fill(); c.stroke(); }
      if (txt) { c.fillStyle = '#111'; c.font = `900 ${r * 1.3}px Arial`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, 0, 1); } c.restore(); };
    for (const m of ctx.markers.list) if (m.blip) blip(m.x, m.z, blipCol[m.kind] || '#fff', m.kind === 'obj' || m.kind === 'mission' ? 9 : 7, m.kind === 'prop' || m.kind === 'shop' ? 's' : 'c', m.icon && m.icon.length === 1 && /[A-Z$]/.test(m.icon) ? m.icon : '');
    blip(150, 50, '#2a9bd8', 9, 's', 'H');
    if (U.waypoint) blip(U.waypoint.x, U.waypoint.z, '#b27bff', 8);
    const fl = Math.floor(ctx.t * 4) % 2; for (const v of ctx.vehicles) if (v.J.cop && v.siren) blip(v.pos.x, v.pos.z, fl ? '#3a7bff' : '#ff3a3a', 6);
    for (const a of ctx.actors.list) if (a.hp > 0 && (a.team === 'goon' || a.team === 'cop')) blip(a.pos.x, a.pos.z, a.team === 'cop' ? '#3a7bff' : '#ff3a3a', 4);
    c.restore();
    // játékos-nyíl (mindig felfelé a kamera irányához képest)
    c.save(); c.translate(R, R); c.rotate(-(pl.veh ? pl.veh.yaw : pl.yaw) + yaw); c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -14); c.lineTo(10, 11); c.lineTo(0, 6); c.lineTo(-10, 11); c.closePath(); c.stroke(); c.fill(); c.restore();
    // észak-jel
    c.save(); c.translate(R, R); c.rotate(yaw); c.translate(0, -R + 20); c.rotate(-yaw); c.fillStyle = '#fff'; c.font = '900 22px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeStyle = '#000'; c.lineWidth = 4; c.strokeText('É', 0, 0); c.fillText('É', 0, 0); c.restore();
    if (ctx.wanted.level) { c.strokeStyle = fl ? 'rgba(58,123,255,.8)' : 'rgba(255,58,58,.8)'; c.lineWidth = 10; c.beginPath(); c.arc(R, R, R - 5, 0, 6.3); c.stroke(); }
  }
  /* ---------- nagy térkép ---------- */
  const mapEl = $(`<div id="map" class="hide"><canvas></canvas><div id="maptl">LOCSOLÓ VÁROS</div><div id="maplg">
    <div><i style="background:#ffd23a"></i>Küldetés / cél</div><div><i style="background:#37e07a"></i>HGWS mellékmunka</div><div><i style="background:#3a9bff"></i>Garázs / ingatlan</div><div><i style="background:#ff8a2a"></i>Locsolófej Szerviz</div><div><i style="background:#ff3ad2"></i>Verseny / ugrató</div><div><i style="background:#b27bff"></i>Útpont</div></div></div>`, root);
  const mc = mapEl.querySelector('canvas'), mcx = mc.getContext('2d'); let mz = 1, mpx = 0, mpz = 0, drag = null;
  const m2w = (sx, sy) => { const s = Math.min(innerWidth, innerHeight) / 1700 * mz; return [mpx + (sx - innerWidth / 2) / s, mpz + (sy - innerHeight / 2) / s]; };
  mc.addEventListener('wheel', e => { mz = Math.max(.6, Math.min(6, mz * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); e.preventDefault(); }, { passive: false });
  mc.addEventListener('mousedown', e => { drag = { x: e.clientX, y: e.clientY, px: mpx, pz: mpz, moved: 0, b: e.button }; });
  addEventListener('mousemove', e => { if (!drag || !U.mapOpen) return; const s = Math.min(innerWidth, innerHeight) / 1700 * mz; mpx = drag.px - (e.clientX - drag.x) / s; mpz = drag.pz - (e.clientY - drag.y) / s; drag.moved += Math.abs(e.movementX) + Math.abs(e.movementY); });
  addEventListener('mouseup', e => { if (!drag || !U.mapOpen) return; if (drag.moved < 6) { const [x, z] = m2w(e.clientX, e.clientY); if (U.waypoint && Math.hypot(U.waypoint.x - x, U.waypoint.z - z) < 30 / mz) U.waypoint = null; else U.waypoint = { x, z, kind: 'way' }; U.routeT = 0; ctx.audio.blip(); } drag = null; });
  mc.addEventListener('contextmenu', e => { e.preventDefault(); U.waypoint = null; });
  function drawMap() {
    mc.width = innerWidth; mc.height = innerHeight; const s = Math.min(innerWidth, innerHeight) / 1700 * mz, c = mcx, pl = ctx.player, p = pl.veh ? pl.veh.pos : pl.pos;
    c.fillStyle = '#0a1018'; c.fillRect(0, 0, mc.width, mc.height); c.save(); c.translate(innerWidth / 2, innerHeight / 2); c.scale(s, s); c.translate(-mpx + M0, -mpz + M0); c.drawImage(base, 0, 0);
    if (U.route.length > 1) { c.strokeStyle = '#ffd23a'; c.lineWidth = 5; c.beginPath(); U.route.forEach(([x, z], i) => i ? c.lineTo(x - M0, z - M0) : c.moveTo(x - M0, z - M0)); c.stroke(); }
    const dot = (x, z, col, r, t) => { c.save(); c.translate(x - M0, z - M0); c.scale(1 / s, 1 / s); c.fillStyle = col; c.strokeStyle = '#000'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, r, 0, 6.3); c.fill(); c.stroke(); if (t) { c.fillStyle = '#fff'; c.font = '700 13px Arial'; c.textAlign = 'left'; c.strokeStyle = 'rgba(0,0,0,.8)'; c.lineWidth = 3; c.strokeText(t, r + 5, 4); c.fillText(t, r + 5, 4); } c.restore(); };
    for (const m of ctx.markers.list) if (m.blip) dot(m.x, m.z, blipCol[m.kind] || '#fff', m.kind === 'mission' || m.kind === 'obj' ? 9 : 6, mz > 1.6 || m.kind === 'mission' || m.kind === 'obj' ? m.label : '');
    dot(150, 50, '#2a9bd8', 10, 'HGWS-központ'); if (U.waypoint) dot(U.waypoint.x, U.waypoint.z, '#b27bff', 9, 'Útpont');
    c.save(); c.translate(p.x - M0, p.z - M0); c.scale(1 / s, 1 / s); c.rotate(-(pl.veh ? pl.veh.yaw : pl.yaw)); c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -16); c.lineTo(11, 12); c.lineTo(0, 6); c.lineTo(-11, 12); c.closePath(); c.stroke(); c.fill(); c.restore();
    c.restore();
  }
  U.toggleMap = on => { U.mapOpen = on ?? !U.mapOpen; mapEl.classList.toggle('hide', !U.mapOpen); if (U.mapOpen) { const p = ctx.player.veh ? ctx.player.veh.pos : ctx.player.pos; mpx = p.x; mpz = p.z; mz = 1.4; document.exitPointerLock?.(); } };
  /* ---------- telefon ---------- */
  const phone = $(`<div id="phone" class="hide"><div class="scr"><div class="top"><span id="ptime"></span><span>HGWS Mobil ▮▮▮</span></div><div class="body" style="flex:1;display:flex;flex-direction:column"></div></div></div>`, root);
  const pbody = phone.querySelector('.body'); let papp = null, psel = 0, prow = [];
  const APPS = [['kuld', 'Küldetések', '📋', '#e8862a'], ['nev', 'Névjegyek', '👤', '#2ecc71'], ['bank', 'HGWS Bank', '💳', '#1f8fd6'], ['stat', 'Statisztika', '📈', '#8e44ad'], ['terk', 'Térkép', '🗺', '#16a085'], ['radio', 'Rádió', '📻', '#c0392b']];
  function pRender() {
    if (!papp) { pbody.innerHTML = `<div class="apps">${APPS.map((a, i) => `<div class="app ${i === psel ? 'sel' : ''}" data-i="${i}"><div class="ic" style="background:${a[3]}">${a[2]}</div>${a[1]}</div>`).join('')}</div>`; pbody.querySelectorAll('.app').forEach(e => e.onclick = () => { psel = +e.dataset.i; pOpen(); }); return; }
    let h = `<div class="back">‹ Vissza</div><div class="pg">`; prow = [];
    if (papp === 'kuld') { h += '<h3>Küldetések</h3>'; MAIN.forEach((m, i) => { h += `<div class="row"><span>${i + 1}. ${i <= S.mission ? m.n : '???'}</span><small>${i < S.mission ? '✔' : i === S.mission ? 'aktuális' : ''}</small></div>`; });
      h += `<h3>Mellék</h3><div class="row"><span>Ugratók</span><small>${Object.keys(S.jumps).length}/${W.JUMPS.length}</small></div><div class="row"><span>ZERO titok</span><small>${S.zero ? '✔' : '?'}</small></div>`; }
    if (papp === 'nev') { h += '<h3>Névjegyek</h3>'; const C = [['Anna (HGWS iroda)', 'Mellékmunka-tipp', () => { ctx.ui.toast('Anna: „A garázs mellett, a zöld jelnél vár a kiszállítás. Medence vagy kert, te döntesz!”'); }],
        ['Feri bácsi (szerelő)', 'Javítás helyben – 600 Ft', () => { const v = ctx.player.veh; if (!v) return U.toast('Feri bácsi: „Előbb ülj be valamibe, fiam.”'); if (S.money < 600) return U.toast('Nincs elég pénzed'); ctx.money(-600, 'Feri bácsi javítás'); ctx.repairVehicle(v); U.toast('Feri bácsi: „Kalapács, drót, kész is!”'); }],
        ['Taxiközpont', 'Taxi hívása – 200 Ft', () => { if (S.money < 200) return U.toast('Nincs elég pénzed'); ctx.money(-200, 'Taxi hívás'); ctx.callTaxi(); U.toast('Taxiközpont: „Kocsi úton!”'); }],
        ['Vízügyi „barát”', 'Körözés elsimítása – 2500 Ft', () => { if (!ctx.wanted.level) return U.toast('„Nincs mit elsimítani, Gergely.”'); if (S.money < 2500) return U.toast('Nincs elég pénzed'); ctx.money(-2500, 'Vízügyi „szívesség”'); ctx.wanted.clear(); U.toast('„Elsimítva. Nem ismerjük egymást.”'); }]];
      C.forEach(([n, d, f], i) => { h += `<div class="row ${i === psel ? 'sel' : ''}" data-i="${i}"><span>${n}<br><small>${d}</small></span><small>📞</small></div>`; prow.push(f); }); }
    if (papp === 'bank') { const inc = Object.keys(S.props).reduce((a, k) => a + (W.PROPS_FOR_SALE.find(p => p.id === k)?.inc || 0), 0);
      h += `<h3>HGWS Banki App</h3><div style="opacity:.7">Egyenleg</div><div class="bal">${fmt(S.money)}</div><div class="row"><span>Ingatlanbevétel</span><small>${fmt(inc)}/nap</small></div>`;
      for (const p of W.PROPS_FOR_SALE) h += `<div class="row"><span>${p.n}</span><small>${S.props[p.id] ? 'saját' : fmt(p.price)}</small></div>`;
      h += '<h3>Tranzakciók</h3>' + (S.log.slice(-12).reverse().map(l => `<div class="row"><span>${l[1]}</span><small style="color:${l[0] < 0 ? '#ff8a7a' : '#7cf08a'}">${l[0] > 0 ? '+' : ''}${fmt(l[0])}</small></div>`).join('') || '<div style="opacity:.6">Még nincs tranzakció.</div>'); }
    if (papp === 'stat') { const st = S.stats; h += `<h3>Statisztika</h3>${[['Játékidő', `${Math.floor(st.time / 3600)} ó ${Math.floor(st.time / 60 % 60)} p`], ['Megtett út', `${(st.dist / 1000).toFixed(1)} km`], ['Fő küldetések', `${S.mission}/${MAIN.length}`], ['Taxifuvarok', st.fares || 0], ['HGWS-munkák', st.jobs || 0], ['Megnyert versenyek', st.races || 0], ['Ugrások', st.jumps || 0], ['Eláztatott járókelők', st.soaked || 0], ['Összetört járművek', st.wrecks || 0], ['Legnagyobb körözés', '★'.repeat(st.maxWanted || 0) || '–']].map(([a, b]) => `<div class="row"><span>${a}</span><small>${b}</small></div>`).join('')}`; }
    if (papp === 'radio') { h += '<h3>Rádió</h3>'; ['Kikapcsolva', ...ctx.audio.STATIONS.map(s => s.n)].forEach((n, i) => { h += `<div class="row ${i === psel ? 'sel' : ''}" data-i="${i}"><span>${n}</span><small>${ctx.audio.station === i - 1 ? '▶' : ''}</small></div>`; prow.push(() => { ctx.audio.radio(i - 1); pRender(); }); }); }
    pbody.innerHTML = h + '</div>'; pbody.querySelector('.back').onclick = () => { papp = null; psel = 0; pRender(); }; pbody.querySelectorAll('.row[data-i]').forEach(e => e.onclick = () => { psel = +e.dataset.i; prow[psel]?.(); });
  }
  function pOpen() { const a = APPS[psel][0]; if (a === 'terk') { U.togglePhone(false); U.toggleMap(true); return; } papp = a; psel = 0; ctx.audio.blip(); pRender(); }
  U.togglePhone = on => { U.phoneOpen = on ?? !U.phoneOpen; phone.classList.toggle('hide', !U.phoneOpen); papp = null; psel = 0; if (U.phoneOpen) pRender(); };
  U.phoneKey = k => { if (!U.phoneOpen) return; if (!papp) { if (k === 'ArrowRight') psel = (psel + 1) % APPS.length; if (k === 'ArrowLeft') psel = (psel + APPS.length - 1) % APPS.length; if (k === 'ArrowDown') psel = Math.min(APPS.length - 1, psel + 3); if (k === 'ArrowUp') psel = Math.max(0, psel - 3); if (k === 'Enter') return pOpen(); pRender(); }
    else { if (k === 'Backspace' || k === 'ArrowLeft') { papp = null; psel = 0; return pRender(); } if (k === 'ArrowDown') psel = Math.min(prow.length - 1, psel + 1); if (k === 'ArrowUp') psel = Math.max(0, psel - 1); if (k === 'Enter') prow[psel]?.(); pRender(); } };
  /* ---------- fegyverkerék ---------- */
  const wheel = $(`<div id="wheel" class="hide">${WEAPONS.map((w, i) => { const a = i / WEAPONS.length * Math.PI * 2 - Math.PI / 2; return `<div class="s" data-i="${i}" style="left:${210 + Math.cos(a) * 150}px;top:${210 + Math.sin(a) * 150}px"><div class="i">${w.icon}</div>${w.n}</div>`; }).join('')}<div class="c"></div></div>`, root);
  let wsel = 0, wvx = 0, wvy = 0;
  U.wheel = (on, dx = 0, dy = 0) => { if (on && !U.wheelOpen) { wsel = ctx.weapons.st.cur; wvx = wvy = 0; } U.wheelOpen = on; wheel.classList.toggle('hide', !on);
    if (on) { wvx += dx; wvy += dy; const l = Math.hypot(wvx, wvy); if (l > 40) { wvx *= 40 / l; wvy *= 40 / l; } if (l > 12) { let a = Math.atan2(wvy, wvx) + Math.PI / 2; if (a < 0) a += Math.PI * 2; const i = Math.round(a / (Math.PI * 2 / WEAPONS.length)) % WEAPONS.length; if (ctx.weapons.st.owned[i] || i === 0) wsel = i; }
      wheel.querySelectorAll('.s').forEach(e => { const i = +e.dataset.i; e.classList.toggle('sel', i === wsel); e.classList.toggle('no', !ctx.weapons.st.owned[i] && i !== 0); }); wheel.querySelector('.c').innerHTML = `${WEAPONS[wsel].n}<br><small>${ammoTxt(wsel)}</small>`; }
    return wsel; };
  const ammoTxt = i => { const st = ctx.weapons.st, w = WEAPONS[i]; return i === 0 ? '' : w.clip ? `${st.clip[i]} / ${st.ammo[i] - st.clip[i]}` : `${st.ammo[i]}`; };
  /* ---------- általános menü (szerviz, munkák) ---------- */
  const m2 = $(`<div id="menu2" class="hide"></div>`, root);
  U.menu = (title, items, onClose) => { U.menuOpen = true; menuItems = items; menuClose = onClose; menuSel = Math.min(menuSel, items.length - 1); if (menuSel < 0) menuSel = 0; document.exitPointerLock?.();
    m2.innerHTML = `<h2>${title}</h2>${items.map((it, i) => `<div class="it ${i === menuSel ? 'sel' : ''} ${it.ok ? '' : 'no'}" data-i="${i}"><span>${it.label}</span><span>${it.price ? fmt(it.price) : ''}</span></div>`).join('')}<div class="it" data-i="-1"><span>Bezárás</span><span>Esc</span></div>`;
    m2.classList.remove('hide'); m2.querySelectorAll('.it').forEach(e => e.onclick = () => { const i = +e.dataset.i; if (i < 0) U.closeMenu(); else { menuSel = i; menuItems[i].act(); } }); };
  U.closeMenu = () => { if (!U.menuOpen) return; U.menuOpen = false; m2.classList.add('hide'); menuClose?.(); menuClose = null; };
  U.menuKey = k => { if (!U.menuOpen) return; if (k === 'ArrowDown') menuSel = (menuSel + 1) % menuItems.length; if (k === 'ArrowUp') menuSel = (menuSel + menuItems.length - 1) % menuItems.length; if (k === 'Enter') return menuItems[menuSel]?.act(); if (k === 'Escape' || k === 'Backspace') return U.closeMenu();
    m2.querySelectorAll('.it').forEach((e, i) => e.classList.toggle('sel', i === menuSel)); };
  /* ---------- képernyők: főmenü, szünet, beállítások, irányítás ---------- */
  const scr = $(`<div class="scrn hide"><div class="box"></div></div>`, root), sbox = scr.querySelector('.box'); let sItems = [], sSel = 0;
  const KEYS = [['Mozgás / vezetés', 'W A S D', 'bal kar'], ['Kamera', 'egér', 'jobb kar'], ['Futás', 'Shift', 'A'], ['Ugrás', 'Szóköz', 'X'], ['Be- / kiszállás', 'F', 'Y'], ['Cselekvés', 'E', 'B (gyalog) / X (járműben)'], ['Tüzelés', 'bal egérgomb', 'RT'], ['Célzás', 'jobb egérgomb', 'LT'], ['Fegyverkerék', 'Tab (nyomva)', 'LB (nyomva)'], ['Fegyverváltás', '1–6 / görgő', 'D-pad ← →'], ['Térkép', 'M', 'Back'], ['Telefon', '↑', 'D-pad ↑'], ['Szünet', 'Esc', 'Start'], ['Kamera távolság', 'C', 'R3'],
    ['Gáz / fék, hátramenet', 'W / S', 'RT / LT'], ['Kézifék', 'Szóköz', 'A'], ['Rádióadó váltás', 'Q / E', 'D-pad ← →'], ['Kürt / sziréna', 'H', 'B'], ['Fényszóró', 'L', '–'], ['Jármű-fecskendő (locsolókocsi, tank)', 'bal egérgomb', 'RB'],
    ['Helikopter: emelkedés / süllyedés', 'Szóköz / Shift', 'RB / LB'], ['Helikopter: előre, fordulás', 'W S / A D', 'bal kar'], ['Helikopter: oldalazás', 'Q / E', 'jobb kar'], ['Teljes képernyő', 'F11', '–']];
  function screen(kind) {
    U.screen = kind; scr.classList.toggle('hide', !kind); if (!kind) return; document.exitPointerLock?.(); sSel = 0; const st = ctx.settings; let h = '', it = [];
    const has = ctx.hasSave();
    if (kind === 'main' || kind === 'pause') {
      h = `<div class="logo"><small>HGWS STUDIOS</small>LOCSOLÓ<br>VÁROS</div><div class="btns"></div>`;
      if (kind === 'main') { if (has) it.push(['Folytatás', () => ctx.start(false)]); it.push(['Új játék', () => { if (has && !U.confirmNew) { U.confirmNew = 1; it[has ? 1 : 0][0] = 'Új játék – a mentés törlődik! Biztos?'; render(); return; } U.confirmNew = 0; ctx.start(true); }]); }
      else { it.push(['Folytatás', () => ctx.resume()]); if (ctx.missions.cur) it.push(['Küldetés feladása', () => { ctx.missions.abort('Feladtad'); ctx.resume(); }]); it.push(['Mentés most', () => { ctx.autosave(true); U.toast(ctx.dev.on ? 'Fejlesztői módban nincs mentés' : 'Mentve'); }]); }
      it.push(['Beállítások', () => screen(kind === 'main' ? 'set-main' : 'set')], ['Irányítás', () => screen(kind === 'main' ? 'keys-main' : 'keys')], ['Teljes képernyő', () => ctx.fullscreen()]);
      if (kind === 'pause') it.push(['Kilépés a főmenübe', () => ctx.toMenu()]); it.push(['Vissza az Arcade-ba', () => { ctx.autosave?.(true); let top = null; try { top = window.top.document.querySelector('.arcframe') ? window.top : null; } catch (_) {}
        if (window.top !== window && top) { try { parent.postMessage({ hgws: 'close' }, location.origin); } catch (_) {} parent.document?.querySelector?.('#extX')?.click(); setTimeout(() => { try { if (top.location.hash !== '#/arcade') top.location.hash = '#/arcade'; } catch (_) {} }, 150); }
        else { try { window.top.location.href = new URL('../../#/arcade', location.href).href; } catch (_) { location.href = '../../#/arcade'; } } }]);
    } else if (kind.startsWith('set')) {
      const back = kind === 'set' ? 'pause' : 'main';
      h = `<div class="logo" style="font-size:40px">BEÁLLÍTÁSOK</div><div style="margin-top:20px">
        <div class="set"><span>Grafika</span><div class="opts" data-k="quality">${[['alacsony', 'Alacsony'], ['kozepes', 'Közepes'], ['magas', 'Magas']].map(([v, n]) => `<div class="o ${st.quality === v ? 'on' : ''}" data-v="${v}">${n}</div>`).join('')}</div></div>
        <div class="set"><span>SSAO (környezeti takarás)</span><div class="opts" data-k="ssao">${[[1, 'Be'], [0, 'Ki']].map(([v, n]) => `<div class="o ${+st.ssao === v ? 'on' : ''}" data-v="${v}">${n}</div>`).join('')}</div></div>
        <div class="set"><span>Eső</span><div class="opts" data-k="rain">${[['auto', 'Időjárás'], ['off', 'Soha']].map(([v, n]) => `<div class="o ${st.rain === v ? 'on' : ''}" data-v="${v}">${n}</div>`).join('')}</div></div>
        ${[['master', 'Fő hangerő'], ['sfx', 'Effektek'], ['music', 'Rádió']].map(([k, n]) => `<div class="set"><span>${n}</span><input type="range" min="0" max="1" step=".05" value="${st[k]}" data-r="${k}"></div>`).join('')}
        <div class="set"><span>Egér érzékenység</span><input type="range" min=".3" max="2.5" step=".05" value="${st.sens}" data-r="sens"></div>
        <div class="set"><span>Függőleges tengely</span><div class="opts" data-k="invert">${[[0, 'Normál'], [1, 'Fordított']].map(([v, n]) => `<div class="o ${+st.invert === v ? 'on' : ''}" data-v="${v}">${n}</div>`).join('')}</div></div>
        </div><div class="btns"></div>`; it.push(['Vissza', () => screen(back)]);
    } else { const back = kind === 'keys' ? 'pause' : 'main'; h = `<div class="logo" style="font-size:40px">IRÁNYÍTÁS</div><div class="keys"><h4>BILLENTYŰZET · GAMEPAD</h4>${KEYS.map(([a, k, p]) => `<span>${a}</span><kbd>${k}</kbd><span class="pad">${p}</span>`).join('')}</div><div class="btns"></div>`; it.push(['Vissza', () => screen(back)]); }
    sbox.innerHTML = h; sItems = it; render();
    sbox.querySelectorAll('.opts').forEach(o => o.querySelectorAll('.o').forEach(e => e.onclick = () => { const k = o.dataset.k, v = e.dataset.v; ctx.setSetting(k, k === 'ssao' || k === 'invert' ? +v : v); screen(kind); }));
    sbox.querySelectorAll('input[type=range]').forEach(r => r.oninput = () => ctx.setSetting(r.dataset.r, +r.value));
    function render() { const b = sbox.querySelector('.btns'); b.innerHTML = sItems.map(([n], i) => `<div class="btn ${i === sSel ? 'sel' : ''}" data-i="${i}">${n}</div>`).join(''); b.querySelectorAll('.btn').forEach(e => { e.onclick = () => sItems[+e.dataset.i][1](); e.onmouseenter = () => { sSel = +e.dataset.i; b.querySelectorAll('.btn').forEach((x, j) => x.classList.toggle('sel', j === sSel)); }; }); }
    U._render = render;
  }
  U.screenKey = k => { if (!U.screen) return; if (k === 'ArrowDown') sSel = (sSel + 1) % sItems.length; if (k === 'ArrowUp') sSel = (sSel + sItems.length - 1) % sItems.length; if (k === 'Enter') return sItems[sSel]?.[1](); if (k === 'Escape' && U.screen !== 'main') { if (U.screen === 'pause') return ctx.resume(); const b = sItems[sItems.length - 1]; return b[1](); } U._render?.(); };
  U.showScreen = screen;
  /* ---------- intro: HGWS STUDIOS ---------- */
  U.intro = () => new Promise(res => { const el = $(`<div id="intro"><canvas></canvas></div>`, root), cv = el.querySelector('canvas'), x = cv.getContext('2d'); let t = 0, done = false, last = performance.now();
    const end = () => { if (done) return; done = true; el.style.transition = 'opacity .6s'; el.style.opacity = 0; setTimeout(() => { el.remove(); res(); }, 600); removeEventListener('keydown', end); el.removeEventListener('click', end); };
    addEventListener('keydown', end); el.addEventListener('click', end); ctx.audio.init?.();
    const drops = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), v: .3 + Math.random() * .6 }));
    (function fr(now) { if (done) return; const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt; cv.width = innerWidth; cv.height = innerHeight; const w = cv.width, h = cv.height, cx = w / 2, cy = h / 2;
      x.fillStyle = '#000'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(63,182,232,.35)'; for (const d of drops) { d.y += d.v * dt; if (d.y > 1) d.y = 0; x.fillRect(d.x * w, d.y * h, 2, 14); }
      const k = Math.min(1, t / 1.2), drop = cy - 160 + Math.min(1, t / .9) ** 2 * 120;
      x.save(); x.globalAlpha = Math.min(1, t * 2); x.fillStyle = '#3fb6e8'; x.beginPath(); x.moveTo(cx, drop - 60); x.quadraticCurveTo(cx + 44, drop, cx, drop + 30); x.quadraticCurveTo(cx - 44, drop, cx, drop - 60); x.fill(); x.restore();
      if (t > .9) { const r = (t - .9) * 420; x.strokeStyle = `rgba(63,182,232,${Math.max(0, 1 - (t - .9) / 1.4)})`; x.lineWidth = 4; for (const m of [1, .66, .33]) { x.beginPath(); x.ellipse(cx, cy - 10, r * m, r * m * .25, 0, 0, 6.3); x.stroke(); } }
      if (t > 1.1) { const a = Math.min(1, (t - 1.1) / .6); x.globalAlpha = a; x.fillStyle = '#ffd23a'; x.font = `900 ${Math.min(120, w * .1)}px 'Arial Black', Impact, Arial`; x.textAlign = 'center'; x.fillText('HGWS', cx, cy + 90);
        x.fillStyle = '#fff'; x.font = `800 ${Math.min(34, w * .03)}px Arial`; x.fillText('S  T  U  D  I  O  S', cx, cy + 140); x.globalAlpha = a * .6; x.font = '600 14px Arial'; x.fillText('bemutatja', cx, cy + 180); x.globalAlpha = 1; }
      if (t > 4.2) end(); requestAnimationFrame(fr); })(last); });
  /* ---------- frissítés ---------- */
  let acc = 0;
  U.update = (dt, A) => {
    if (U.bannerT > 0) { U.bannerT -= dt; if (U.bannerT <= 0) E.banner.style.opacity = 0; }
    if (U.mapOpen) drawMap();
    if (hud.classList.contains('hide')) return;
    drawMini(dt); acc += dt; if (acc < .1) return; acc = 0;
    const pl = ctx.player, st = ctx.weapons.st, w = WEAPONS[st.cur];
    E.money.textContent = fmt(S.money);
    E.stars.querySelectorAll('span').forEach((s, i) => s.classList.toggle('on', i < ctx.wanted.level)); E.stars.classList.toggle('blink', ctx.wanted.level > 0 && !ctx.wanted.seen);
    const h = ctx.tod; E.clock.textContent = `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor(h % 1 * 60)).padStart(2, '0')}`;
    E.wi.textContent = w.icon; E.wn.textContent = w.n; E.wa.textContent = st.reloadT > 0 ? 'töltés…' : ammoTxt(st.cur);
    E.hp.style.width = Math.max(0, pl.hp) + '%'; E.ar.style.width = pl.armor + '%';
    E.prompt.textContent = ctx.jobs.prompt || ctx.prompt || ''; E.prompt.classList.toggle('hide', !(ctx.jobs.prompt || ctx.prompt));
    E.cross.classList.toggle('hide', !!pl.veh || !(A.aim || pl.aimT > 0) || st.cur === 0);
    const v = pl.veh; if (v) { E.vehn.innerHTML = `${VEH[v.id]?.n || 'Villamos'}<small>${v.J.radio === 0 ? '' : ctx.audio.station >= 0 ? '📻 ' + ctx.audio.STATIONS[ctx.audio.station].n : '📻 kikapcsolva'}${v.hp < v.maxHp * .5 ? ' · ⚠ sérült' : ''}</small>`; E.speed.classList.remove('hide'); E.speed.innerHTML = `${Math.round(v.speed * 3.6)}<small>km/h${v.kind === 'heli' ? ` · ${Math.round(v.pos.y - W.groundY(v.pos.x, v.pos.z))} m` : ''}</small>`; }
    else { E.vehn.innerHTML = ''; E.speed.classList.add('hide'); }
    const tg = target(), p = v ? v.pos : pl.pos; E.dist.textContent = tg ? `${Math.round(Math.hypot(tg.x - p.x, tg.z - p.z))} m` : '';
    const z = W.districtAt(p.x, p.z); if (z !== U.lastZone) { U.lastZone = z; E.zone.innerHTML = `${W.DNAME[z] || ''}<small>Locsoló Város</small>`; E.zone.style.opacity = 1; U.zoneT = 3; } if (U.zoneT > 0) { U.zoneT -= .1; if (U.zoneT <= 0) E.zone.style.opacity = 0; }
    E.wet.style.opacity = Math.min(1, pl.wetT || 0); E.dmg.style.boxShadow = `inset 0 0 160px rgba(255,40,40,${Math.max(0, .5 - pl.hp / 100) * .8})`;
    q('#ptime') && (q('#ptime').textContent = E.clock.textContent);
  };
  return U;
}
