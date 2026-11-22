/* HUD: sebesség, magasság, emelkedés, gáz/kollektív, víz, akku, mesterséges horizont + iránytű, minitérkép, szélirány,
   átesés-figyelmeztetés, küldetés-időzítő és célnyíl. Nagy térkép (M): nagyítás, mozgatás, útpontok, gyorsutazás. A DOM-írások gyorsítótárazva. */
import { REPTEREK, VIZEK, P, FORGO, W_MAX, H_MAX } from './config.js?v=202611220336';

const $ = s => document.querySelector(s);
const cache = new Map(); const setH = (el, k, v) => { if (cache.get(k) !== v) { cache.set(k, v); el.innerHTML = v; } };
let MAP = null; export function setMapImage(img) { MAP = img; }
const R = 250;   // a térképkép felbontása (m / px)

export function createHud() {
  const tele = $('#tele'), bars = $('#bars'), flags = $('#flags'), att = $('#att'), ax = att.getContext('2d'), mini = $('#mini'), mx = mini.getContext('2d');
  const warn = $('#warn'), msg = $('#msg'), mis = $('#mis'), misT = $('#misT'), misS = $('#misS'), arrow = $('#arrow'), arrI = arrow.querySelector('i'), arrB = arrow.querySelector('b'), aim = $('#aim'), cross = $('#cross'), cock = $('#cock');
  let miniT = 0;
  function say(t, k = '', ms = 2600) { const d = document.createElement('div'); d.textContent = t; if (k) d.className = k; msg.appendChild(d); while (msg.children.length > 3) msg.firstChild.remove(); setTimeout(() => d.remove(), ms); }
  function update(s, dt) { const b = s.b, gep = b.gep, kind = gep.kind, kmh = Math.round(b.spd * 3.6);
    const alt = Math.round(b.pos.y), agl = Math.max(0, Math.round(b.agl)), vs = b.vel.y;
    setH(tele, 'tele', `<span class="lab">Sebesség</span><span class="v">${kmh}<small>km/h</small></span><span class="lab">Magasság</span><span class="v">${agl}<small>m</small></span>` +
      `<span class="lab">Tengerszint</span><span class="v" style="font-size:15px">${alt}<small>m</small></span><span class="lab">Emelkedés</span><span class="v" style="font-size:15px;color:${vs < -6 ? 'var(--bad)' : 'inherit'}">${vs >= 0 ? '+' : ''}${vs.toFixed(1)}<small>m/s</small></span>`);
    const pct = v => Math.round(v * 100), wf = b.water / gep.tartaly;
    let h = '';
    if (FORGO(kind) && kind !== 'drone') h += `<div class="hb"><span>KOLL.</span><i><b style="width:${pct(b.col)}%"></b></i><span>${pct(b.col)}%</span></div><div class="hb bt"><span>ROTOR</span><i><b style="width:${pct(b.rotor)}%"></b></i><span>${pct(b.rotor)}%</span></div>`;
    else if (kind === 'drone') h += `<div class="hb bt"><span>AKKU</span><i><b style="width:${pct(b.battery)}%;background:${b.battery < .2 ? 'var(--bad)' : ''}"></b></i><span>${pct(b.battery)}%</span></div>`;
    else if (kind !== 'glider') h += `<div class="hb"><span>${kind === 'airship' ? 'HAJTÁS' : 'GÁZ'}</span><i><b style="width:${pct(Math.abs(b.thr))}%"></b></i><span>${pct(b.thr)}%</span></div>`;
    h += `<div class="hb w"><span>VÍZ</span><i><b style="width:${pct(wf)}%"></b></i><span>${Math.round(b.water) >= 10000 ? Math.round(b.water / 1000) + 'k' : Math.round(b.water)}</span></div>`;
    setH(bars, 'bars', h);
    const fl = []; if (!FORGO(kind) && kind !== 'airship' && !b.model?.noGear) fl.push(['FUTÓMŰ', b.gearT > .5]); if (b.model?.flap?.length) fl.push(['FÉKSZÁRNY', b.flapT > 0]); if (gep.uteg) fl.push(['UTÁNÉGETŐ', b.burner]);
    if (s.timeK > 1) fl.push([s.timeK + '×', true]); if (b.surf?.tip === 'viz' && b.onGround) fl.push(['VÍZEN', true]); if (s.refill) fl.push(['TÖLTÉS', true]); if (b.moored) fl.push(['KIKÖTVE', true]);
    setH(flags, 'flags', fl.map(([t, on]) => `<span class="${on ? 'on' : ''}">${t}</span>`).join(''));
    // figyelmeztetés
    let w = ''; if (b.stall && !b.onGround) w = 'ÁTESÉS!'; else if (!b.onGround && b.agl < 60 && vs < -12) w = 'EMELKEDJ!'; else if (kind === 'drone' && b.battery < .15) w = 'AKKU!'; else if (s.lowWater) w = '';
    warn.hidden = !w; if (w) setH(warn, 'warn', w);
    drawAtt(b, s); miniT -= dt; if (miniT <= 0) { miniT = .1; drawMini(s); }
    // küldetés
    if (s.m) { mis.hidden = false; const t = s.m.limit ? Math.max(0, s.m.limit - s.m.t) : s.m.t; setH(misT, 'misT', `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')} · ${Math.max(0, Math.round(s.score || 0)).toLocaleString('hu-HU')} p`); setH(misS, 'misS', s.m.def.nev + ' — ' + s.m.progress()); } else mis.hidden = true;
    // célnyíl
    const tg = s.target; if (tg && s.camDir) { const dx = tg[0] - b.pos.x, dz = tg[2] - b.pos.z, d = Math.hypot(dx, dz), a = Math.atan2(dx, -dz) - s.camDir; arrow.hidden = d < 60;
      if (!arrow.hidden) { const rr = Math.min(innerWidth, innerHeight) * .28; arrow.style.transform = `translate(${Math.sin(a) * rr}px,${-Math.cos(a) * rr}px)`; arrI.style.transform = `rotate(${a * 57.3 - 45}deg)`; setH(arrB, 'arrB', d > 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m'); } } else arrow.hidden = true;
    // alsó kamera célzója / pilótafülke
    cross.hidden = s.cam !== 'also'; aim.hidden = !s.aim; if (s.aim) { aim.style.left = s.aim[0] + 'px'; aim.style.top = s.aim[1] + 'px'; }
    cock.hidden = s.cam !== 'pilota'; if (!cock.hidden) setH(cock, 'cock', cockpit(b, s)); }
  function cockpit(b, s) { const g = (t, v, u) => `<div class="g"><div><small>${t}</small>${v}<small>${u}</small></div></div>`, k = b.gep.kind;
    const hdg = Math.round(((s.hdg % 360) + 360) % 360);
    if (FORGO(k) && k !== 'drone') return g('SEB.', Math.round(b.spd * 3.6), 'km/h') + g('MAG.', Math.max(0, Math.round(b.agl)), 'm') + g('KOLL.', Math.round(b.col * 100), '%') + g('ROTOR', Math.round(b.rotor * 100), '%') + g('IRÁNY', hdg, '°') + g('VÍZ', Math.round(b.water / b.gep.tartaly * 100), '%');
    if (k === 'drone') return g('SEB.', Math.round(b.spd * 3.6), 'km/h') + g('MAG.', Math.max(0, Math.round(b.agl)), 'm') + g('AKKU', Math.round(b.battery * 100), '%') + g('VÍZ', Math.round(b.water / b.gep.tartaly * 100), '%');
    return g('SEB.', Math.round(b.spd * 3.6), 'km/h') + g('MAG.', Math.max(0, Math.round(b.agl)), 'm') + g('EMELK.', b.vel.y.toFixed(1), 'm/s') + g('GÁZ', Math.round(b.thr * 100), '%') + g('IRÁNY', hdg, '°') + g('VÍZ', Math.round(b.water / b.gep.tartaly * 100), '%') + (b.gep.uteg ? g('MACH', b.mach.toFixed(2), '') : ''); }
  function drawAtt(b, s) { const W = att.width, c = W / 2, x = ax; x.clearRect(0, 0, W, W);
    const pitch = s.pitch, roll = s.roll; x.save(); x.beginPath(); x.arc(c, c, c * .78, 0, 6.283); x.clip(); x.translate(c, c); x.rotate(-roll); const off = pitch * c * 1.4;
    x.fillStyle = '#3a7fc0'; x.fillRect(-W, -W * 2 + off, W * 2, W * 2); x.fillStyle = '#7a5a34'; x.fillRect(-W, off, W * 2, W * 2); x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.moveTo(-W, off); x.lineTo(W, off); x.stroke();
    x.lineWidth = 2; x.font = '700 18px Inter'; x.fillStyle = '#fff'; x.textAlign = 'center'; for (let d = -30; d <= 30; d += 10) { if (!d) continue; const y = off - d / 57.3 * c * 1.4; x.beginPath(); x.moveTo(-26, y); x.lineTo(26, y); x.stroke(); x.fillText(Math.abs(d), 44, y + 6); }
    x.restore(); x.strokeStyle = '#f2c230'; x.lineWidth = 6; x.beginPath(); x.moveTo(c - 62, c); x.lineTo(c - 18, c); x.lineTo(c - 8, c + 12); x.moveTo(c + 62, c); x.lineTo(c + 18, c); x.lineTo(c + 8, c + 12); x.stroke(); x.fillStyle = '#f2c230'; x.beginPath(); x.arc(c, c, 5, 0, 6.3); x.fill();
    // iránytű-gyűrű
    x.save(); x.translate(c, c); x.fillStyle = 'rgba(9,14,20,.9)'; x.beginPath(); x.arc(0, 0, c, 0, 6.283); x.moveTo(c * .78, 0); x.arc(0, 0, c * .78, 0, 6.283); x.fill('evenodd'); x.rotate(-s.hdg / 57.3); x.font = '800 20px Inter'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let d = 0; d < 360; d += 15) { const a = d / 57.3; x.save(); x.rotate(a); if (d % 90 === 0) { x.fillStyle = d === 0 ? '#ff6b5e' : '#fff'; x.fillText('ÉKDN'[d / 90], 0, -c * .89); } else { x.fillStyle = '#8fa0ae'; x.fillRect(-1.5, -c * .97, 3, d % 45 ? 8 : 14); } x.restore(); }
    // szélirány
    const wa = Math.atan2(s.wind.x, -s.wind.z); x.rotate(wa); x.fillStyle = '#9fdcff'; x.beginPath(); x.moveTo(0, c * .76); x.lineTo(-9, c * .62); x.lineTo(9, c * .62); x.fill(); x.restore();
    x.fillStyle = '#9fdcff'; x.font = '700 16px Inter'; x.textAlign = 'center'; x.fillText(`szél ${Math.round(Math.hypot(s.wind.x, s.wind.z) * 3.6)} km/h`, c, W - 26); }
  function drawMini(s) { const W = mini.width, x = mx, b = s.b, sc = 1 / 45; x.fillStyle = '#10161d'; x.fillRect(0, 0, W, W); x.save(); x.translate(W / 2, W / 2); x.rotate(-s.hdg / 57.3);
    if (MAP) { const px = b.pos.x / R, pz = b.pos.z / R, k = R * sc; x.drawImage(MAP, px - W / k, pz - W / k, 2 * W / k, 2 * W / k, -W, -W, 2 * W, 2 * W); }
    const dot = (wx, wz, col, r = 5) => { const dx = (wx - b.pos.x) * sc, dz = (wz - b.pos.z) * sc; if (Math.abs(dx) > W || Math.abs(dz) > W) return; x.fillStyle = col; x.beginPath(); x.arc(dx, dz, r, 0, 6.3); x.fill(); };
    for (const r of REPTEREK) dot(r.x, r.z, r.tip === 'viz' ? '#2aa7d9' : '#f2c230', 6);
    if (s.marks) for (const [mx2, mz, k] of s.marks) dot(mx2, mz, k === 'ok' ? '#3fbf63' : k === 'tuz' ? '#ff6b2e' : '#ff5a4d', 7);
    if (WP.length) { x.strokeStyle = '#d36bff'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 0); for (const [wx, wz] of WP) x.lineTo((wx - b.pos.x) * sc, (wz - b.pos.z) * sc); x.stroke(); for (const [wx, wz] of WP) dot(wx, wz, '#d36bff', 6); }
    x.restore(); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(W / 2, W / 2 - 12); x.lineTo(W / 2 - 8, W / 2 + 9); x.lineTo(W / 2 + 8, W / 2 + 9); x.fill();
    { const q = W / 170 * 1.4, cx = W - 20 * q, cy = 20 * q, e = 5 * q; x.fillStyle = 'rgba(9,14,20,.7)'; x.beginPath(); x.arc(cx, cy, 13 * q, 0, 6.3); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 1.6 * q; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx - e, cy - e + 3 * q); x.lineTo(cx - e, cy - e); x.lineTo(cx - e + 3 * q, cy - e); x.moveTo(cx + e, cy + e - 3 * q); x.lineTo(cx + e, cy + e); x.lineTo(cx + e - 3 * q, cy + e); x.moveTo(cx - e, cy - e); x.lineTo(cx + e, cy + e); x.stroke(); }
    x.fillStyle = 'rgba(9,14,20,.8)'; x.fillRect(0, W - 26, W, 26); x.fillStyle = '#cfe6ff'; x.font = '700 15px Inter'; x.textAlign = 'center'; x.fillText(s.place || '', W / 2, W - 8); }
  return { update, say, show(v) { $('#hud').hidden = !v; } };
}

/* nagy térkép: Magyarország, repterek, városok, vizek, küldetéscélok; kattintás egy reptérre = gyorsutazás */
/* nagy térkép: görgővel / csippentéssel nagyítható, húzással mozgatható; koppintás: útpont (meglévőre: törlés), szabad repülésben reptérre: gyorsutazás */
export const WP = []; export let wpVer = 0; export function wpClear() { WP.length = 0; wpVer++; } export function wpShift() { WP.shift(); wpVer++; }
const MV = { z: 1, cx: W_MAX / 2, cz: H_MAX / 2, init: false };
export function drawMap(cv, s, towns, onPick, onEmpty) { const W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(2, devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; const x = cv.getContext('2d');
  const fit = Math.min(W / W_MAX, H / H_MAX) * .96; if (!MV.init && s.b) { MV.init = true; MV.z = 3; MV.cx = s.b.pos.x; MV.cz = s.b.pos.z; }
  const clampV = () => { MV.z = Math.max(1, Math.min(40, MV.z)); const k = fit * MV.z, hw = W / 2 / k, hh = H / 2 / k; MV.cx = Math.max(Math.min(hw, W_MAX / 2), Math.min(W_MAX - Math.min(hw, W_MAX / 2), MV.cx)); MV.cz = Math.max(Math.min(hh, H_MAX / 2), Math.min(H_MAX - Math.min(hh, H_MAX / 2), MV.cz)); };
  let k, ox, oy; const X = wx => ox + wx * k, Y = wz => oy + wz * k, toW = (px, py) => [(px - ox) / k, (py - oy) / k];
  let hits = [];
  function draw() { clampV(); k = fit * MV.z; ox = W / 2 - MV.cx * k; oy = H / 2 - MV.cz * k; x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.fillStyle = '#0a0f14'; x.fillRect(0, 0, W, H); if (MAP) { x.imageSmoothingEnabled = MV.z < 8; x.drawImage(MAP, ox, oy, W_MAX * k, H_MAX * k); }
    x.textAlign = 'center'; const tmin = MV.z > 14 ? 0 : MV.z > 7 ? 4 : MV.z > 3.5 ? 12 : MV.z > 1.6 ? 25 : 45;
    for (const [n, tx, tz, pop] of towns) if (pop > tmin) { const px = X(tx), py = Y(tz); if (px < -50 || py < -20 || px > W + 50 || py > H + 20) continue; x.font = `700 ${pop > 90 ? 12 : 11}px Inter`; x.fillStyle = '#fff'; x.beginPath(); x.arc(px, py, 2.5, 0, 6.3); x.fill(); x.fillStyle = 'rgba(255,255,255,.85)'; x.fillText(n, px, py - 6); }
    x.font = 'italic 700 12px Inter'; x.fillStyle = '#9fdcff'; for (const [n, lon, lat] of VIZEK) { const [wx, wz] = P(lon, lat); x.fillText(n, X(wx), Y(wz)); }
    hits = [];
    for (const r of REPTEREK) { const px = X(r.x), py = Y(r.z); x.fillStyle = r.tip === 'viz' ? '#2aa7d9' : r.tip === 'heli' ? '#3fbf63' : '#f2c230'; x.beginPath(); x.arc(px, py, r.fo ? 8 : 6, 0, 6.3); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 1.5; x.stroke();
      x.fillStyle = '#ffe29a'; x.font = '800 11px Inter'; x.fillText(r.nev.split(' – ')[0].split(' (')[0], px, py + 18); hits.push([px, py, r]); }
    if (s.marks) for (const [mx, mz, kk] of s.marks) { x.fillStyle = kk === 'ok' ? '#3fbf63' : kk === 'tuz' ? '#ff6b2e' : '#ff5a4d'; x.beginPath(); x.arc(X(mx), Y(mz), 5, 0, 6.3); x.fill(); }
    // útvonal
    if (WP.length) { x.strokeStyle = '#d36bff'; x.lineWidth = 2.5; x.setLineDash([8, 6]); x.beginPath(); if (s.b) x.moveTo(X(s.b.pos.x), Y(s.b.pos.z)); else x.moveTo(X(WP[0][0]), Y(WP[0][1])); for (const [wx, wz] of WP) x.lineTo(X(wx), Y(wz)); x.stroke(); x.setLineDash([]);
      WP.forEach(([wx, wz], i) => { const px = X(wx), py = Y(wz); x.fillStyle = '#d36bff'; x.strokeStyle = '#000'; x.lineWidth = 1.5; x.beginPath(); x.arc(px, py, 9, 0, 6.3); x.fill(); x.stroke(); x.fillStyle = '#fff'; x.font = '900 11px Inter'; x.fillText(String(i + 1), px, py + 4); }); }
    if (s.b) { const px = X(s.b.pos.x), py = Y(s.b.pos.z); x.save(); x.translate(px, py); x.rotate(s.hdg / 57.3); x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.beginPath(); x.moveTo(0, -12); x.lineTo(-8, 9); x.lineTo(8, 9); x.closePath(); x.fill(); x.stroke(); x.restore(); }
    // lépték
    const p10 = Math.pow(10, Math.floor(Math.log10(100 / k))), sk = [1, 2, 5, 10].map(f => f * p10).find(v => v * k >= 60) || 10 * p10, L = sk * k;
    x.fillStyle = 'rgba(9,14,20,.75)'; x.fillRect(10, H - 30, L + 20, 22); x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(20, H - 14); x.lineTo(20 + L, H - 14); x.stroke(); x.fillStyle = '#fff'; x.font = '700 10px Inter'; x.textAlign = 'left'; x.fillText(sk >= 1000 ? sk / 1000 + ' km' : sk + ' m', 22, H - 18); }
  draw(); cv._redraw = draw;
  // nagyítás, mozgatás, koppintás
  const P2 = new Map(); let moved = 0, pinch = null;
  const zoomAt = (px, py, f) => { const [wx, wz] = toW(px, py); MV.z *= f; clampV(); const k2 = fit * MV.z; MV.cx = wx - (px - W / 2) / k2; MV.cz = wz - (py - H / 2) / k2; draw(); };
  cv.onwheel = e => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.pow(1.0015, -e.deltaY * (e.deltaMode ? 30 : 1))); };
  cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); P2.set(e.pointerId, [e.clientX, e.clientY]); if (P2.size === 1) moved = 0; if (P2.size === 2) { const [a, b2] = [...P2.values()]; pinch = Math.hypot(a[0] - b2[0], a[1] - b2[1]); moved = 99; } };
  cv.onpointermove = e => { const p = P2.get(e.pointerId); if (!p) return; const r = cv.getBoundingClientRect();
    if (P2.size === 1) { const dx = e.clientX - p[0], dy = e.clientY - p[1]; moved += Math.abs(dx) + Math.abs(dy); if (moved > 6) { MV.cx -= dx / k; MV.cz -= dy / k; draw(); } }
    P2.set(e.pointerId, [e.clientX, e.clientY]);
    if (P2.size === 2 && pinch) { const [a, b2] = [...P2.values()], d = Math.hypot(a[0] - b2[0], a[1] - b2[1]); zoomAt((a[0] + b2[0]) / 2 - r.left, (a[1] + b2[1]) / 2 - r.top, d / pinch); pinch = d; } };
  cv.onpointerup = cv.onpointercancel = e => { if (!P2.has(e.pointerId)) return; P2.delete(e.pointerId); if (P2.size < 2) pinch = null; if (e.type !== 'pointerup' || moved > 6 || P2.size) return;
    const r = cv.getBoundingClientRect(), cx = e.clientX - r.left, cy = e.clientY - r.top, [wx, wz] = toW(cx, cy);
    const wi = WP.findIndex(([px, pz]) => Math.hypot(X(px) - cx, Y(pz) - cy) < 12); if (wi >= 0) { WP.splice(wi, 1); wpVer++; draw(); return; }
    let best = null, bd = 16; for (const [px, py, ap] of hits) { const d = Math.hypot(px - cx, py - cy); if (d < bd) { bd = d; best = ap; } }
    if (best && onPick) { onPick(best, wx, wz); return; }
    if (onEmpty && onEmpty(wx, wz)) return;
    if (WP.length < 20) { WP.push([wx, wz]); wpVer++; draw(); } };
  cv.onclick = null; }
