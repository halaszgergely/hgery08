/* HUD: sebesség, fokozat, fordulatszám, üzemanyag, rakomány, pénz, fuvar, célnyíl, üzenetek, rádiófelirat, minitérkép,
   valamint a fülkenézet műszerfala (retró analóg órák: sebességmérő, fordulatszámmérő, üzemanyag, ballonszám, papírtérkép-stílusú GPS, csöves rádió). */
const $ = s => document.querySelector(s);
export function createHud() {
  const el = { spd: $('#hSpd'), gear: $('#hGear'), rpm: $('#hRpm i'), fuel: $('#hFuel i'), fuelT: $('#hFuelT'), cargo: $('#hCargo'), money: $('#money'), job: $('#hJob'), jobT: $('#hJobT'), jobS: $('#hJobS'), msg: $('#msg'), sub: $('#sub'), arrow: $('#arrow'), arrowB: $('#arrow b'), mini: $('#mini'), dash: $('#dash'), act: $('#act') };
  const cache = new Map(), set = (e, k, v) => { if (cache.get(k) !== v) { cache.set(k, v); e.innerHTML = v; } };
  let msgT = 0, subT = 0;
  const say = (t, cls = '', ms = 2600) => { el.msg.innerHTML = t; el.msg.className = 'on ' + cls; msgT = ms / 1000; };
  const subtitle = (t, ms = 5000) => { el.sub.textContent = t; el.sub.classList.toggle('on', !!t); subT = ms / 1000; };
  /* ---- minitérkép: a közeli utak a betöltött OSM-csonkokból ---- */
  const mx = el.mini.getContext('2d');
  function drawMini(p, yaw, segs, target, base, others, route) { const W = el.mini.width, R = 420, k = W / 2 / R; mx.setTransform(1, 0, 0, 1, 0, 0); mx.fillStyle = 'rgba(14,20,18,.92)'; mx.fillRect(0, 0, W, W);
    mx.save(); mx.translate(W / 2, W / 2); mx.rotate(yaw); mx.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < segs.length; i += 8) { const cl = segs[i + 5], dirt = !cl && !(segs[i + 6] & 32);
      mx.strokeStyle = pass ? (dirt ? '#8a7a5a' : cl >= 4 ? '#f0a040' : cl >= 2 ? '#f6e3a0' : '#e8e8e8') : 'rgba(0,0,0,.6)'; mx.lineWidth = Math.max(1.6, segs[i + 4] * k) + (pass ? 0 : 2);
      mx.beginPath(); mx.moveTo((segs[i] - p.x) * k, (segs[i + 1] - p.z) * k); mx.lineTo((segs[i + 2] - p.x) * k, (segs[i + 3] - p.z) * k); mx.stroke(); }
    const dot = (x, z, c, r = 6, clamp = true) => { let dx = (x - p.x) * k, dz = (z - p.z) * k; const d = Math.hypot(dx, dz), m = W / 2 - 10; if (d > m) { if (!clamp) return; dx *= m / d; dz *= m / d; } mx.fillStyle = c; mx.strokeStyle = '#000'; mx.lineWidth = 2; mx.beginPath(); mx.arc(dx, dz, r, 0, 6.3); mx.fill(); mx.stroke(); };
    if (route && route.length > 1) { mx.lineJoin = 'round'; for (const [c, w] of [['rgba(0,0,0,.55)', 9], ['#2aa7d9', 5]]) { mx.strokeStyle = c; mx.lineWidth = w; mx.beginPath(); route.forEach((q, i) => i ? mx.lineTo((q[0] - p.x) * k, (q[1] - p.z) * k) : mx.moveTo((q[0] - p.x) * k, (q[1] - p.z) * k)); mx.stroke(); } }
    if (base) dot(base[0], base[1], '#2f9e4f', 7); for (const o of others || []) dot(o[0], o[1], o[2], 5, false); if (target) dot(target[0], target[1], '#2aa7d9', 8);
    mx.restore(); mx.fillStyle = '#f2c230'; mx.strokeStyle = '#000'; mx.lineWidth = 2; mx.beginPath(); mx.moveTo(W / 2, W / 2 - 12); mx.lineTo(W / 2 - 8, W / 2 + 9); mx.lineTo(W / 2 + 8, W / 2 + 9); mx.closePath(); mx.fill(); mx.stroke(); }
  /* ---- műszerfal (fülkenézet) ---- */
  const dx = el.dash.getContext('2d');
  function gauge(cx, cy, r, v, max, lab, unit, ticks, red) { const a0 = Math.PI * .75, a1 = Math.PI * 2.25, ang = a0 + (a1 - a0) * Math.min(1.02, Math.max(0, v / max));
    const g = dx.createRadialGradient(cx, cy - r * .3, r * .1, cx, cy, r); g.addColorStop(0, '#f4efe2'); g.addColorStop(1, '#d6ccb3'); dx.fillStyle = g; dx.beginPath(); dx.arc(cx, cy, r, 0, 6.3); dx.fill();
    dx.lineWidth = r * .09; dx.strokeStyle = '#2b2722'; dx.stroke(); dx.fillStyle = '#1d1a16'; dx.strokeStyle = '#1d1a16'; dx.textAlign = 'center'; dx.textBaseline = 'middle';
    for (let i = 0; i <= ticks; i++) { const a = a0 + (a1 - a0) * i / ticks, big = true; dx.lineWidth = big ? 2 : 1; dx.beginPath(); dx.moveTo(cx + Math.cos(a) * r * .86, cy + Math.sin(a) * r * .86); dx.lineTo(cx + Math.cos(a) * r * .72, cy + Math.sin(a) * r * .72); dx.stroke();
      dx.font = `700 ${Math.round(r * .15)}px Inter, Arial`; dx.fillText(String(Math.round(max * i / ticks / (unit === 'x1000' ? 1000 : 1))), cx + Math.cos(a) * r * .56, cy + Math.sin(a) * r * .56); }
    if (red) { dx.strokeStyle = '#c0281f'; dx.lineWidth = r * .07; dx.beginPath(); dx.arc(cx, cy, r * .8, a0 + (a1 - a0) * red, a1); dx.stroke(); }
    dx.font = `700 ${Math.round(r * .12)}px Inter, Arial`; dx.fillStyle = '#5a5246'; dx.fillText(lab, cx, cy + r * .38); dx.fillText(unit, cx, cy + r * .55);
    dx.strokeStyle = '#c0281f'; dx.lineWidth = r * .045; dx.beginPath(); dx.moveTo(cx - Math.cos(ang) * r * .12, cy - Math.sin(ang) * r * .12); dx.lineTo(cx + Math.cos(ang) * r * .8, cy + Math.sin(ang) * r * .8); dx.stroke();
    dx.fillStyle = '#2b2722'; dx.beginPath(); dx.arc(cx, cy, r * .07, 0, 6.3); dx.fill(); }
  function drawDash(s) { const W = el.dash.width = el.dash.clientWidth * 1.5, H = el.dash.height = el.dash.clientHeight * 1.5; dx.clearRect(0, 0, W, H); if (!s) return;
    if (s.moped) { const r = H * .32, cx = W / 2, cy = H * .55; gauge(cx, cy, r, s.kmh, 60, 'km/h', '', 6); dx.fillStyle = '#d9d2bf'; dx.font = `700 ${r * .2}px Inter`; dx.textAlign = 'center'; dx.fillText(s.fuelL.toFixed(1) + ' l', cx + r * 1.7, cy); return; }
    // műszerfal-panel
    const g = dx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3a332c'); g.addColorStop(1, '#221d18'); dx.fillStyle = g; dx.beginPath(); dx.roundRect(W * .03, H * .08, W * .94, H * .9, 26); dx.fill();
    const r = H * .3; gauge(W * .2, H * .48, r, s.kmh, 120, 'km/h', '', 6); gauge(W * .43, H * .48, r * .82, s.rpm, 6000, 'ford/perc', 'x1000', 6, 4600 / 6000);
    // üzemanyag és ballonok kis órái
    const sr = r * .42; gauge(W * .57, H * .3, sr, s.fuel, 1, 'BENZIN', '', 2); dx.fillStyle = '#e8dcc0'; dx.font = `700 ${sr * .4}px Inter`; dx.textAlign = 'center'; dx.fillText(s.gearT, W * .57, H * .72);
    dx.fillStyle = '#0c1410'; dx.fillRect(W * .62, H * .55, W * .1, H * .2); dx.fillStyle = '#7ef0a4'; dx.font = `700 ${H * .1}px "DejaVu Sans Mono", monospace`; dx.fillText(s.cargo, W * .67, H * .66); dx.fillStyle = '#9a8f7b'; dx.font = `700 ${H * .05}px Inter`; dx.fillText('BALLON', W * .67, H * .8);
    // papírtérkép-stílusú GPS: irány és távolság
    const gx = W * .79, gy = H * .45, gr = H * .3; dx.fillStyle = '#e9dfc4'; dx.beginPath(); dx.roundRect(gx - gr, gy - gr, gr * 2, gr * 2, 8); dx.fill(); dx.strokeStyle = 'rgba(120,90,50,.35)'; dx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) { dx.beginPath(); dx.moveTo(gx - gr, gy + i * gr * .4); dx.lineTo(gx + gr, gy + i * gr * .4); dx.moveTo(gx + i * gr * .4, gy - gr); dx.lineTo(gx + i * gr * .4, gy + gr); dx.stroke(); }
    if (s.navA !== null) { dx.save(); dx.translate(gx, gy); dx.rotate(s.navA); dx.fillStyle = '#b5321f'; dx.beginPath(); dx.moveTo(0, -gr * .62); dx.lineTo(gr * .28, gr * .1); dx.lineTo(0, -gr * .05); dx.lineTo(-gr * .28, gr * .1); dx.closePath(); dx.fill(); dx.restore();
      dx.fillStyle = '#3a2a18'; dx.font = `700 ${gr * .2}px Inter`; dx.textAlign = 'center'; dx.fillText(s.navD, gx, gy + gr * .7); }
    // csöves rádió skálája
    const rx = W * .5, ry = H * .9; dx.fillStyle = '#c9b98f'; dx.fillRect(rx - W * .16, ry - H * .07, W * .32, H * .09); dx.fillStyle = '#3a2a18'; dx.font = `700 ${H * .045}px Inter`; dx.textAlign = 'center';
    dx.fillText(s.radio || 'RÁDIÓ KI', rx, ry - H * .025); if (s.radioF) { const f = (parseFloat(s.radioF.replace(',', '.')) - 87.5) / 20.5; dx.fillStyle = '#c0281f'; dx.fillRect(rx - W * .15 + f * W * .3, ry - H * .07, 3, H * .09); }
    // visszajelzők
    const L = (x, on, c) => { dx.fillStyle = on ? c : '#2a2622'; dx.beginPath(); dx.arc(x, H * .16, H * .025, 0, 6.3); dx.fill(); };
    L(W * .1, s.indL && s.blink, '#7ef0a4'); L(W * .3, s.indR && s.blink, '#7ef0a4'); L(W * .38, s.lights, '#5aa8ff'); L(W * .46, s.hand, '#ff4a3a'); L(W * .54, s.fuel < .12, '#ffb020'); }
  return { say, subtitle, drawMini, drawDash,
    update(dt, s) { set(el.spd, 'spd', String(Math.round(s.kmh))); set(el.gear, 'gear', s.gearT); el.rpm.style.width = Math.min(100, s.rpm / s.rpmMax * 100) + '%'; el.fuel.style.width = Math.round(s.fuel * 100) + '%';
      set(el.fuelT, 'fuelT', s.fuelL.toFixed(1) + ' l'); set(el.cargo, 'cargo', s.cargoT); set(el.money, 'money', s.money); el.fuel.parentElement.classList.toggle('low', s.fuel < .15);
      if (s.job) { el.job.hidden = false; set(el.jobT, 'jobT', s.job.t); set(el.jobS, 'jobS', s.job.s); } else el.job.hidden = true;
      if (s.act) { el.act.hidden = false; set(el.act, 'act', s.act); } else el.act.hidden = true;
      if (s.arrow !== null) { el.arrow.hidden = false; el.arrow.style.transform = `translateX(-50%) rotate(${s.arrow}rad)`; set(el.arrowB, 'arrB', s.arrowD); } else el.arrow.hidden = true;
      if (msgT > 0) { msgT -= dt; if (msgT <= 0) el.msg.className = ''; } if (subT > 0) { subT -= dt; if (subT <= 0) el.sub.classList.remove('on'); } } };
}
