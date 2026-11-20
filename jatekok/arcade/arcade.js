/* HGWS Arcade – játéklista, kártyák, mélylinkek és online ranglista (klasszikus szkript, az arcade.html tölti be; a közös keret a jatekok/arcade/mag.js) */
'use strict';
const ZeroSpace = { id: 'zerospace', name: 'ZERO SPACE DEMO', ext: 'jatekok/zerospace/index.html', tag: 'DEMO',
  desc: 'Tervezd meg a saját űrhajódat modulról modulra, és vezesd csatába a végtelen űrben. Korai demó – az egyjátékos sandbox már elérhető.' };
const AranyLocsolofej = { id: 'aranylocsolofej', name: 'AZ ARANY LOCSOLÓFEJ', ext: 'jatekok/aranylocsolofej/index.html', tag: 'ÚJ',
  desc: 'Szikkadt Szilárd ellopta az Arany Locsolófejet! Hívd össze a csapatot, foglald el a víztornyot, és szerezd vissza a filmes kalandjátékban.' };
const ZeroChip = { id: 'zerochip', name: 'ZERO CHIP', ext: 'jatekok/zerochip/index.html', tag: 'ÚJ',
  desc: 'Építs áramköröket a tranzisztortól a processzor számlálójáig. 29 küldetés: szilícium, logikai kapuk, összeadók, memória.' };
/* zárt béta: csak adminok és „Béta-tesztelő” taggel rendelkezők látják és indíthatják (a jogosultságot a főoldal küldi) */
const ZeroQuest = { id: 'zeroquest', name: 'ZERO QUEST', ext: 'jatekok/zeroquest/index.html', tag: 'ZÁRT BÉTA', lock: 1,
  desc: 'Felülnézetes akció-szerepjáték Hajnalrév völgyében: küldetések, szintlépés, felszerelés és egy ébredő őr a romok alatt. Zárt béta.' };
const Drift = window.HGDrift ? window.HGDrift({ G, Sfx, rr, store, hud }) : null;
const Zombi = window.HGZombi ? window.HGZombi({ G, Sfx, rr, store, hud }) : null;
const GAMES = [Locsolo, Nyomas, Vizagyu, Csepp, Ugro, Torony, Birodalom, ...(Drift ? [Drift] : []), ...(Zombi ? [Zombi] : []), AranyLocsolofej, ZeroSpace, ZeroChip, ZeroQuest];
const EXT = $('#ext'), EXF = $('#extf');
let zqWait = false;
function openExt(gm) { if (gm.lock && !window.HGZQ_OK) { zqWait = !window.HGZQ_SEEN; return; } EXF.src = gm.ext + '?v=' + Date.now().toString(36).slice(0, 5); EXT.hidden = false; document.body.classList.add('locked'); setTimeout(() => { try { EXF.focus(); } catch (_) {} }, 300); }
function closeExt() { EXT.hidden = true; EXF.src = 'about:blank'; document.body.classList.remove('locked'); }
$('#extX').onclick = closeExt;
const ARTS = {
  drift: (c, x, t) => Drift && Drift.art(c, x, t),
  holtvaros: (c, x, t) => Zombi && Zombi.art(c, x, t),
  birodalom: (c, x, t) => { const W = c.width, H = c.height, s = 22, ox = (W - s * 11) / 2, oy = (H - s * 5) / 2; x.fillStyle = '#0f2a1a'; x.fillRect(0, 0, W, H);
    for (let r = 0; r < 5; r++) for (let q = 0; q < 11; q++) { x.fillStyle = (q + r) & 1 ? '#3b7a33' : '#367230'; x.fillRect(ox + q * s, oy + r * s, s, s); }
    x.fillStyle = 'rgba(40,110,170,.3)'; x.fillRect(ox + 2 * s, oy, s * 3, s * 3); x.fillRect(ox + 6 * s, oy + 2 * s, s * 3, s * 3);
    x.fillStyle = '#6f8fae'; x.fillRect(ox - 8, oy + 2.4 * s, s * 7.5 + 8, s * .22); x.fillRect(ox + 3.4 * s, oy + 1.5 * s, s * .22, s);
    for (const [q, r] of [[3, 1], [7, 3]]) { const cx = ox + q * s + s / 2, cy = oy + r * s + s / 2; x.fillStyle = '#e8b656'; x.beginPath(); x.arc(cx, cy, 4, 0, 6.283); x.fill();
      x.strokeStyle = `rgba(150,215,255,${.35 + .2 * Math.sin(t * 6)})`; for (let j = 0; j < 8; j++) { const a = j * .785, rr2 = s * (.6 + .6 * ((t + j * .3) % 1)); x.beginPath(); x.arc(cx, cy, rr2, a - .2, a + .2); x.stroke(); } }
    for (const [q, r, col] of [[2, 0, '#e5533d'], [4, 0, '#e5533d'], [2, 2, '#ff6fa8'], [4, 1, '#9be36a'], [6, 3, '#ffa531'], [8, 4, '#8e5bd6'], [6, 2, '#ffa531'], [8, 2, '#8e5bd6']]) {
      const cx = ox + q * s + s / 2, cy = oy + r * s + s / 2, k = .7 + .3 * Math.sin(t * 2 + q); x.fillStyle = '#4fae46'; x.beginPath(); x.arc(cx, cy, 7 * k, 0, 6.283); x.fill(); x.fillStyle = col; x.beginPath(); x.arc(cx + 2, cy - 2, 2.6 * k, 0, 6.283); x.fill(); } },
  zeroquest: (c, x, t) => { const W = c.width, H = c.height, g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#14261c'); g.addColorStop(1, '#2f5a34'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) { const px = (i * 41 + 12) % W, py = 30 + (i * 53) % (H - 50); x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(px + 3, py + 14, 13, 4, 0, 0, 6.283); x.fill(); x.fillStyle = i & 1 ? '#2f6b34' : '#3f8a3f'; x.beginPath(); x.arc(px, py, 13, 0, 6.283); x.fill(); x.fillStyle = 'rgba(160,220,120,.35)'; x.beginPath(); x.arc(px - 4, py - 4, 6, 0, 6.283); x.fill(); }
    const cx = W / 2, cy = H / 2 + 8, a = Math.sin(t * 3) * 1.2; x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(cx, cy + 18, 14, 5, 0, 0, 6.283); x.fill(); x.fillStyle = '#3f6fb5'; x.beginPath(); x.ellipse(cx, cy + 2, 10, 13, 0, 0, 6.283); x.fill(); x.fillStyle = '#f0c9a4'; x.beginPath(); x.arc(cx, cy - 15, 8, 0, 6.283); x.fill(); x.fillStyle = '#6b3f1f'; x.beginPath(); x.arc(cx, cy - 17, 8, 3.14, 6.283); x.fill();
    x.save(); x.translate(cx + 10, cy + 2); x.rotate(a - .6); x.fillStyle = '#e3ebf2'; x.fillRect(2, -1.6, 30, 3.2); x.fillStyle = '#e8b656'; x.fillRect(0, -5, 3, 10); x.restore(); x.strokeStyle = `rgba(255,255,255,${.5 + .4 * Math.sin(t * 3)})`; x.lineWidth = 3; x.beginPath(); x.arc(cx + 10, cy + 2, 34, a - 1.2, a - .2); x.stroke();
    const sx = cx + 70, sy = cy + 10 - Math.abs(Math.sin(t * 5)) * 6; x.fillStyle = '#6fc24a'; x.beginPath(); x.moveTo(sx - 15, sy + 10); x.bezierCurveTo(sx - 16, sy - 14, sx + 16, sy - 14, sx + 15, sy + 10); x.fill(); x.fillStyle = '#12301a'; x.fillRect(sx - 6, sy - 2, 3, 5); x.fillRect(sx + 3, sy - 2, 3, 5); },
  aranylocsolofej: (c, x, t) => { const W = c.width, H = c.height, g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b1430'); g.addColorStop(.7, '#3a2a5a'); g.addColorStop(1, '#a8552e'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 22; i++) x.fillRect((i * 73) % W, (i * 37) % 70, 1.5, 1.5);
    x.fillStyle = '#0a0f1c'; x.beginPath(); x.moveTo(40, H); x.lineTo(46, 62); x.lineTo(66, 62); x.lineTo(72, H); x.fill(); x.beginPath(); x.roundRect(24, 26, 64, 38, 8); x.fill(); x.beginPath(); x.moveTo(22, 28); x.lineTo(56, 8); x.lineTo(90, 28); x.fill(); x.fillRect(0, H - 14, W, 14);
    const cx = W / 2 + 10, cy = 96, gl = x.createRadialGradient(cx, cy - 26, 2, cx, cy - 26, 70); gl.addColorStop(0, `rgba(255,226,154,${.55 + .15 * Math.sin(t * 3)})`); gl.addColorStop(1, 'rgba(255,226,154,0)'); x.fillStyle = gl; x.fillRect(cx - 80, cy - 100, 160, 150);
    x.strokeStyle = 'rgba(255,243,196,.55)'; x.lineWidth = 1.5; for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283 + t * .5; x.beginPath(); x.moveTo(cx + Math.cos(a) * 30, cy - 26 + Math.sin(a) * 30); x.lineTo(cx + Math.cos(a) * 44, cy - 26 + Math.sin(a) * 44); x.stroke(); }
    const G = x.createLinearGradient(cx - 18, 0, cx + 18, 0); G.addColorStop(0, '#a8702a'); G.addColorStop(.4, '#fff3c4'); G.addColorStop(1, '#a8702a'); x.fillStyle = G; x.fillRect(cx - 5, cy - 22, 10, 22); x.fillRect(cx - 13, cy - 2, 26, 6); x.beginPath(); x.moveTo(cx - 8, cy - 22); x.lineTo(cx + 8, cy - 22); x.lineTo(cx + 15, cy - 36); x.lineTo(cx - 15, cy - 36); x.fill(); x.beginPath(); x.ellipse(cx, cy - 38, 18, 7, 0, 0, 6.283); x.fill();
    x.fillStyle = '#7a2f3a'; x.fillRect(cx - 34, cy + 4, 68, 30); x.fillStyle = '#e8b656'; x.fillRect(cx - 38, cy, 76, 5); x.strokeStyle = 'rgba(200,235,255,.8)'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - 30, cy); x.lineTo(cx - 30, cy - 46); x.arc(cx, cy - 46, 30, Math.PI, 0); x.lineTo(cx + 30, cy); x.stroke();
    for (let k = 0; k < 6; k++) { const o = (t * .5 + k / 6) % 1, px = cx - 110 + k * 44 + Math.sin(k * 3) * 10, py = 20 + o * 100; x.fillStyle = `rgba(108,198,255,${.9 - o * .6})`; x.beginPath(); x.moveTo(px, py - 7); x.bezierCurveTo(px + 6, py, px + 5, py + 6, px, py + 6); x.bezierCurveTo(px - 5, py + 6, px - 6, py, px, py - 7); x.fill(); } },
  zerochip: (c, x, t) => { const W = c.width, H = c.height; x.fillStyle = '#0a3324'; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(160,230,190,.25)'; for (let i = 8; i < W; i += 16) for (let j = 8; j < H; j += 16) x.fillRect(i, j, 1.5, 1.5);
    x.lineWidth = 3; x.lineCap = 'round'; const on = k => Math.sin(t * 3 - k * .9) > 0; for (const [k, pts] of [[0, [[20, 40], [90, 40], [90, 56], [128, 56]]], [1, [[20, 104], [90, 104], [90, 84], [128, 84]]], [2, [[192, 70], [250, 70], [250, 40], [300, 40]]], [3, [[250, 70], [250, 104], [300, 104]]]]) { x.strokeStyle = on(k) ? '#ffd35a' : '#3f6f9a'; x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.stroke(); }
    x.fillStyle = '#1b222d'; x.beginPath(); x.roundRect(128, 44, 64, 52, 7); x.fill(); x.strokeStyle = '#6f8196'; x.lineWidth = 1.5; x.stroke(); x.fillStyle = '#ffe29a'; x.font = '800 15px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('NAND', 160, 71); x.fillStyle = on(2) ? '#ff5a4d' : '#4a1f1c'; x.beginPath(); x.arc(304, 40, 9, 0, 6.283); x.fill(); x.fillStyle = on(3) ? '#ff5a4d' : '#4a1f1c'; x.beginPath(); x.arc(304, 104, 9, 0, 6.283); x.fill(); },
  zerospace: (c, x, t) => { const W = c.width, H = c.height; x.fillStyle = '#07070a'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { const sx = (i * 97.3 + t * (6 + i % 4 * 6)) % W, sy = (i * 53.7) % H; x.fillStyle = `rgba(230,224,208,${.25 + (i % 5) * .12})`; x.fillRect(W - sx, sy, i % 7 ? 1 : 2, i % 7 ? 1 : 2); }
    const cx = W * .5 + Math.sin(t * .7) * 30, cy = H * .5 + Math.sin(t * 1.1) * 8; x.save(); x.translate(cx, cy);
    x.fillStyle = '#33496b'; x.fillRect(-34, -8, 52, 16); x.fillStyle = '#17253f'; x.fillRect(-26, -16, 30, 32); x.fillStyle = '#b2382a'; x.fillRect(18, -5, 14, 10); x.fillStyle = '#c9a24a'; x.fillRect(-8, -3, 10, 6);
    x.fillStyle = `rgba(95,176,200,${.6 + .4 * Math.sin(t * 20)})`; x.fillRect(-44 - Math.random() * 8, -5, 10, 10); x.restore();
    x.fillStyle = '#e4614a'; for (let k = 0; k < 3; k++) { const bx = (t * 160 + k * 110) % (W + 40); x.fillRect(cx + 34 + bx, cy - 1, 8, 2); } },
  viztorony: (c, x, t) => { const W = c.width, H = c.height; const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#251c3e'); gr.addColorStop(1, '#0a1a10'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    x.fillStyle = '#1c1712'; x.fillRect(0, 0, 26, H); x.fillRect(W - 26, 0, 26, H); x.fillStyle = 'rgba(232,182,86,.4)'; x.fillRect(25, 0, 2, H); x.fillRect(W - 27, 0, 2, H);
    const pl = [[60, 118, 70], [150, 88, 54], [222, 58, 48], [120, 30, 42]]; x.fillStyle = '#6b4a2a'; for (const [px, py, w] of pl) { x.fillRect(px, py, w, 8); } x.fillStyle = '#c8964a'; for (const [px, py, w] of pl) x.fillRect(px, py, w, 3);
    const k = (t * .55) % 1, sx = 95 + 82 * k, sy = 118 - 30 * k - Math.sin(k * Math.PI) * 42; x.fillStyle = '#2f8fe0'; x.fillRect(sx - 5, sy - 13, 10, 8); x.fillStyle = '#f1c9a0'; x.fillRect(sx - 4, sy - 18, 8, 6); x.fillStyle = '#e8b656'; x.fillRect(sx - 5, sy - 20, 10, 3);
    x.fillStyle = '#ffd77a'; x.save(); x.translate(141, 18); x.rotate(t * 3); x.fillRect(-8, -2, 16, 4); x.restore(); },
  locsolo: (c, x, t) => { const W = c.width, H = c.height; const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#3a2410'); gr.addColorStop(1, '#140b04'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 4; i++) { const px = W * (.14 + i * .24), py = H * .62, w = (Math.sin(t + i) + 1) / 2; x.fillStyle = '#7a4325'; x.fillRect(px - 14, py, 28, 22); x.strokeStyle = `hsl(${30 + 90 * w},60%,40%)`; x.lineWidth = 3; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (1 - w) * 10, py - 30); x.stroke();
      x.fillStyle = w > .4 ? '#ffd23f' : '#9a7a3a'; x.beginPath(); x.arc(px + (1 - w) * 10, py - 32, 7, 0, 6.283); x.fill(); }
    for (let i = 0; i < 14; i++) { const k = (t * 1.5 + i / 14) % 1; x.fillStyle = `rgba(150,215,255,${1 - k})`; x.beginPath(); x.arc(W * .5 + Math.sin(i * 7) * W * .3 * k, H * .1 + k * H * .5, 2, 0, 6.283); x.fill(); } },
  nyomas: (c, x, t) => { const W = c.width, H = c.height; x.fillStyle = '#0b1424'; x.fillRect(0, 0, W, H); const cx = W / 2, cy = H * .85, R = H * .65;
    x.lineWidth = 12; x.strokeStyle = '#1e2b40'; x.beginPath(); x.arc(cx, cy, R, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
    x.strokeStyle = '#5ee08a'; x.beginPath(); x.arc(cx, cy, R, Math.PI * 1.45, Math.PI * 1.55); x.stroke();
    const a = Math.PI * 1.1 + Math.PI * .8 * ((Math.sin(t * 2) + 1) / 2); x.strokeStyle = '#ffd77a'; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * R * 1.05, cy + Math.sin(a) * R * 1.05); x.stroke(); },
  vizagyu: (c, x, t) => { const W = c.width, H = c.height; const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#4a2810'); gr.addColorStop(1, '#1a0d05'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 3; i++) { const ex = W * (.25 + i * .25), ey = ((t * 30 + i * 40) % (H + 20)) - 10; x.fillStyle = i === 1 ? '#ff9a2e' : '#3f8a3a'; x.beginPath(); x.arc(ex, ey, 9, 0, 6.283); x.fill(); }
    const cx = W / 2 + Math.sin(t) * W * .25; x.fillStyle = '#9fdcff'; for (let k = 0; k < 6; k++) { x.fillRect(cx - 2, H - 30 - ((t * 200 + k * 22) % H), 4, 8); }
    x.fillStyle = '#e8b656'; x.fillRect(cx - 5, H - 34, 10, 20); x.fillStyle = '#2d3b52'; x.fillRect(cx - 18, H - 16, 36, 16); },
  ugro: (c, x, t) => { const W = c.width, H = c.height; const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0c3046'); gr.addColorStop(1, '#0a2a1c'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    const s = H / 120, off = (t * 26) % 40; for (let i = -1; i < 5; i++) { const y = (i * 40 + off) * s, px = W * (.25 + .5 * (((i * 7 + Math.floor(t * 26 / 40) * 3) % 5 + 5) % 5) / 4); x.fillStyle = '#2f8f3f'; x.beginPath(); x.roundRect(px - 22 * s, y, 44 * s, 8 * s, 4 * s); x.fill(); x.fillStyle = '#5ee08a'; x.fillRect(px - 18 * s, y + 1.5 * s, 36 * s, 2 * s); }
    const b = Math.abs(Math.sin(t * 3.2)), dx = W / 2 + Math.sin(t * 1.1) * W * .18, dy = H * .78 - b * H * .42, r = 10 * s; x.fillStyle = '#6cc6ff'; x.beginPath(); x.moveTo(dx, dy - r * 1.75); x.quadraticCurveTo(dx + r * 1.05, dy - r * .5, dx + r, dy + .1 * r); x.arc(dx, dy + .1 * r, r, 0, Math.PI); x.quadraticCurveTo(dx - r * 1.05, dy - r * .5, dx, dy - r * 1.75); x.fill(); x.fillStyle = '#04121f'; x.beginPath(); x.arc(dx - 3 * s, dy, 1.6 * s, 0, 6.283); x.arc(dx + 3 * s, dy, 1.6 * s, 0, 6.283); x.fill(); },
  csepp: (c, x, t) => { const W = c.width, H = c.height; x.fillStyle = '#0c2238'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 3; i++) { const px = ((W + 60) - ((t * 50 + i * 90) % (W + 60))) - 30, gap = H * .28 + 40 + Math.sin(i * 3) * 10; const top = H * (.2 + .15 * Math.sin(i * 5));
      x.fillStyle = '#aab6c2'; x.fillRect(px, 0, 22, top); x.fillRect(px, top + gap, 22, H); x.fillStyle = '#b5873a'; x.fillRect(px - 3, top - 8, 28, 8); x.fillRect(px - 3, top + gap, 28, 8); }
    const y = H * .5 + Math.sin(t * 4) * 14; x.fillStyle = '#6cc6ff'; x.beginPath(); x.arc(W * .25, y, 9, 0, 6.283); x.fill(); }
};

function renderCards() {
  const wrap = $('#games');
  if (!wrap.children.length) {
    GAMES.forEach((gm, i) => {
      const el = document.createElement('article'); el.className = 'card reveal'; el.tabIndex = 0; el.setAttribute('role', 'button');
      el.innerHTML = `<span class="tag">${String(i + 1).padStart(2, '0')}</span><div class="art"><canvas width="320" height="140"></canvas></div><h3>${gm.name}</h3>${gm.sponsor ? `<span class="spon">${gm.sponsor}</span>` : ''}<p>${gm.desc.split('.')[0]}.</p><div class="foot"><span class="best" data-id="${gm.id}"${gm.ext ? ' data-ext="1"' : ''}></span><span class="play">JÁTÉK ▶</span></div>`;
      el.addEventListener('click', () => openGame(gm)); el.addEventListener('keydown', e => { if (e.key === 'Enter') openGame(gm); });
      if (gm.lock) { el.hidden = true; el.dataset.lock = '1'; } wrap.appendChild(el); io.observe(el);
    });
    const arts = [...wrap.querySelectorAll('canvas')];
    let vis = false; new IntersectionObserver(e => vis = e[0].isIntersecting).observe(wrap);
    (function anim(now) { requestAnimationFrame(anim); if (!vis || document.hidden || gEl.classList.contains('open')) return;
      arts.forEach((c, i) => ARTS[GAMES[i].id](c, c.getContext('2d'), now / 1000)); })(0);
  }
  wrap.querySelectorAll('.best').forEach(b => { if (b.dataset.ext) { const eg = GAMES.find(x => x.id === b.dataset.id); b.textContent = (eg && eg.tag) || 'DEMO'; return; } const v = store.get('best_' + b.dataset.id), gm = GAMES.find(x => x.id === b.dataset.id), w = store.get('wins_' + b.dataset.id); b.textContent = 'REKORD: ' + bigNum(v) + (gm.lb ? ' ' + gm.lb : '') + (w ? ' · 🏆×' + w : ''); });
}
renderCards();
$('#yr').textContent = new Date().getFullYear();
startHero();
function deep() { const m = location.hash.match(/^#play=(\w+)/); const gm = m && GAMES.find(x => x.id === m[1]); if (gm) { openGame(gm); history.replaceState(null, '', location.pathname + location.search); } }
deep(); addEventListener('hashchange', deep);
/* online ranglista: az adatokat a HGWS főoldal küldi (ott van a bejelentkezés) */
let LB = null, lbt = 'week';
function lbDraw() {
  if (!LB) return;
  $('#lbw').hidden = false;
  const esc = t => String(t).replace(/[<>&"]/g, '');
  const base = lbt === 'week' ? `E heti verseny (${LB.week}) – a hét végén a legjobb regisztrált játékosok megkapják az „Arcade-bajnok” taget! 🏆` : 'Minden idők legjobbjai.';
  $('#lbn').innerHTML = LB.guest
    ? `Vendégként <b>${esc(LB.nick)}</b> néven szerepelsz a ranglistán. <button class="lbnick" data-nick>✏️ Becenév módosítása</button>`
    : base;
  $('#lbg').innerHTML = GAMES.filter(g => !g.ext).map(g => { const l = (LB.boards[g.id] || {})[lbt] || [];
    return `<div class="lbc${g.unit ? ' wide' : ''}"><h4>${g.icon || ''} ${g.name}</h4>${l.length ? l.map((r, i) => `<div class="lbr${r.me ? ' me' : ''}${LB.admin && r.uid ? ' adm' : ''}"><i>${['🥇', '🥈', '🥉'][i] || i + 1}</i><span${r.uid ? ` class="lbu" data-prof="${esc(r.uid)}" data-pn="${r.guest ? esc(r.name) : ''}"` : ''}>${esc(r.name)}${r.guest ? '<em class="lbg2">VENDÉG</em>' : ''}</span><b>${r.wins ? `<em class="lbw2" title="Arany Locsolófej">🏆×${r.wins}</em>` : ''}${bigNum(r.score)}${g.lb ? ' ' + g.lb : ''}</b>${LB.admin && r.uid ? `<button class="lbdel" data-del="${g.id}|${esc(r.uid)}" title="Eredmény törlése">🗑</button>` : ''}</div>`).join('') : '<p class="lbe">Még senki – légy te az első!</p>'}</div>`; }).join('');
}
$('#lbw').addEventListener('click', e => { if (e.target.closest('[data-nick]')) { parent.postMessage({ hgws: 'nickreq' }, location.origin); return; }
  const pr = e.target.closest('[data-prof]'); if (pr) { parent.postMessage({ hgws: 'lbprof', uid: pr.dataset.prof, nick: pr.dataset.pn || '' }, location.origin); return; }
  const del = e.target.closest('[data-del]');
  if (del) { if (!del.classList.contains('sure')) { document.querySelectorAll('.lbdel.sure').forEach(x => { x.classList.remove('sure'); x.textContent = '🗑'; }); del.classList.add('sure'); del.textContent = 'Biztos?'; clearTimeout(del._t); del._t = setTimeout(() => { del.classList.remove('sure'); del.textContent = '🗑'; }, 3000); return; }
    const [game, uid] = del.dataset.del.split('|'); del.disabled = true; del.textContent = '…'; parent.postMessage({ hgws: 'lbdel', game, uid }, location.origin); return; } const b = e.target.closest('[data-lbt]'); if (!b) return; lbt = b.dataset.lbt; document.querySelectorAll('[data-lbt]').forEach(x => x.classList.toggle('on', x === b)); lbDraw(); });
addEventListener('message', e => { if (e.origin !== location.origin || e.data?.hgws !== 'lb') return; LB = e.data; lbDraw();
  window.HGZQ_SEEN = true; window.HGZQ_OK = LB.beta === true; document.querySelectorAll('#games [data-lock]').forEach(el => { el.hidden = !window.HGZQ_OK; }); if (zqWait) { zqWait = false; if (window.HGZQ_OK) openExt(ZeroQuest); } });
if (window.top !== window) parent.postMessage({ hgws: 'lbreq' }, location.origin);
// a helyi rekordok felszinkronizálása a ranglistára: betöltéskor (a játékok a kör/játék végén maguk küldik az új eredményt)
if (window.top !== window) { const sent = {}; const syncB = () => { const bests = {}; for (const gm of GAMES) if (!gm.ext) { const v = store.get('best_' + gm.id); if (v > 0 && v !== sent[gm.id]) bests[gm.id] = sent[gm.id] = v; } if (Object.keys(bests).length) parent.postMessage({ hgws: 'sync', bests }, location.origin); };
  syncB();
  // a tábla frissítése mások eredményeivel: kétpercenként, csak ha a ranglista látszik és nincs nyitva játék
  let lbVis = false; new IntersectionObserver(e => { lbVis = e[0].isIntersecting; }).observe($('#lbw')); setInterval(() => { if (lbVis && !document.hidden && !gEl.classList.contains('open') && EXT.hidden) parent.postMessage({ hgws: 'lbreq' }, location.origin); }, 120000); }
