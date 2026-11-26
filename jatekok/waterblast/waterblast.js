/* HGWS Water Blast – blokk-kirakós 8×8-as táblán: húzd a három elemet a táblára, a teli sorok és oszlopok kiürülnek (vízzé válnak).
   Kombó, sorozat, táblaürítés-bónusz; az állás és a rekord helyben mentődik, a pontszám az Arcade-ranglistára megy. */
(() => {
  'use strict';
  const N = 8, GAME = 'waterblast', KS = 'hgws_waterblast_state', KB = 'hgws_waterblast_best', KM = 'hgws_waterblast_mute';
  const cv = document.getElementById('c'), x = cv.getContext('2d');
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} } };
  /* ---------- HGWS blokkszínek ---------- */
  const COLS = [null,
    { n: 'Víz', b: '#2a8fe0', l: '#7fd0ff', d: '#14518f' }, { n: 'Arany', b: '#e8b656', l: '#fff0b8', d: '#9a6a1c' }, { n: 'Locsoló', b: '#3fbf63', l: '#a6f0b8', d: '#1d6e36' },
    { n: 'Türkiz', b: '#22c6c0', l: '#9ff5ef', d: '#0f6f6c' }, { n: 'Szivattyú', b: '#ff8a2a', l: '#ffd0a0', d: '#a3480c' }, { n: 'Szilárd', b: '#9b6bff', l: '#d6c4ff', d: '#4f2fa3' }, { n: 'Szelep', b: '#ff5a4d', l: '#ffb4ac', d: '#9c241b' }];
  /* ---------- formák (Block Blast-készlet) ---------- */
  const R = s => s.trim().split('/').flatMap((r, y) => [...r].map((c, x) => c === '#' ? [x, y] : null).filter(Boolean));
  const SH = [['#', 3], ['##', 5], ['#/#', 5], ['###', 6], ['#/#/#', 6], ['####', 5], ['#/#/#/#', 5], ['#####', 3], ['#/#/#/#/#', 3], ['##/##', 8], ['###/###/###', 3], ['###/###', 4], ['##/##/##', 4],
    ['#./##', 4], ['.#/##', 4], ['##/#.', 4], ['##/.#', 4], ['#../#../###', 3], ['..#/..#/###', 3], ['###/#../#..', 3], ['###/..#/..#', 3], ['#./#./##', 4], ['.#/.#/##', 4], ['##/#./#.', 4], ['##/.#/.#', 4],
    ['###/#..', 4], ['###/..#', 4], ['#../###', 4], ['..#/###', 4], ['###/.#.', 4], ['.#./###', 4], ['#./##/#.', 4], ['.#/##/.#', 4], ['##./.##', 3], ['.##/##.', 3], ['#./##/.#', 3], ['.#/##/#.', 3], ['#./.#', 2], ['.#/#.', 2], ['#../.#./..#', 1], ['..#/.#./#..', 1]]
    .map(([s, w]) => { const c = R(s); return { c, w: Math.max(...c.map(p => p[0])) + 1, h: Math.max(...c.map(p => p[1])) + 1, wt: w }; });
  const TW = SH.reduce((a, s) => a + s.wt, 0);
  const pick = () => { let r = Math.random() * TW; for (const s of SH) if ((r -= s.wt) <= 0) return s; return SH[0]; };
  /* ---------- állapot ---------- */
  let S = null, best = store.get(KB, 0), mute = store.get(KM, false);
  const newPiece = () => { const s = pick(); return { s: SH.indexOf(s), col: 1 + Math.floor(Math.random() * 7) }; };
  function newGame() { S = { b: Array(N * N).fill(0), tray: [], score: 0, combo: 0, idle: 0, moves: 0, over: false }; refill(); save(); }
  const shape = p => SH[p.s];
  const fits = (b, sh, cx, cy) => sh.c.every(([dx, dy]) => { const X = cx + dx, Y = cy + dy; return X >= 0 && Y >= 0 && X < N && Y < N && !b[Y * N + X]; });
  const anyFit = (b, sh) => { for (let y = 0; y <= N - sh.h; y++) for (let X = 0; X <= N - sh.w; X++) if (fits(b, sh, X, y)) return true; return false; };
  function refill() { // legalább egy elem férjen be (de nem mindig mind)
    for (let t = 0; t < 30; t++) { const tr = [newPiece(), newPiece(), newPiece()]; if (tr.some(p => anyFit(S.b, shape(p))) || t === 29) { S.tray = tr; return; } } }
  function save() { store.set(KS, S); }
  function load() { const s = store.get(KS, null); if (s && Array.isArray(s.b) && s.b.length === N * N && Array.isArray(s.tray) && !s.over) { S = s; return true; } return false; }
  /* ---------- hang ---------- */
  let ac = null; const au = () => { if (mute) return null; if (!ac) try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; } if (ac.state === 'suspended') ac.resume(); return ac; };
  function tone(f, d = .12, type = 'sine', v = .12, f2) { const a = au(); if (!a) return; const t = a.currentTime, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0008, t + d); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + .02); }
  function splash(k = 1) { const a = au(); if (!a) return; const t = a.currentTime, len = .35 + k * .1, buf = a.createBuffer(1, a.sampleRate * len, a.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); s.buffer = buf; f.type = 'bandpass'; f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(500, t + len); g.gain.value = .25 * Math.min(1.6, k); s.connect(f); f.connect(g); g.connect(a.destination); s.start(t); }
  const sPlace = () => tone(220, .09, 'triangle', .14, 160), sPick = () => tone(520, .05, 'sine', .06), sBad = () => tone(150, .12, 'square', .04);
  const sClear = n => { splash(n); [523, 659, 784, 1046].slice(0, Math.min(4, n + 1)).forEach((f, i) => setTimeout(() => tone(f, .18, 'triangle', .09), i * 70)); };
  /* ---------- elrendezés ---------- */
  let W = 0, H = 0, dpr = 1, cs = 40, bx = 0, by = 0, bs = 0, trayY = 0, slotW = 0, hdr = 0;
  function layout() { dpr = Math.min(2.5, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
    hdr = Math.max(96, Math.min(140, H * .16)); bs = Math.min(W * .92, (H - hdr - 24) / 1.45, 560); cs = bs / N; bx = (W - bs) / 2; by = hdr; trayY = by + bs + Math.max(18, cs * .55); slotW = bs / 3; BC.clear(); }
  addEventListener('resize', layout);
  /* ---------- blokk-rajzolás (gyorsítótárazva) ---------- */
  const BC = new Map();
  function blockCanvas(ci, s) {
    const key = ci + '|' + Math.round(s * dpr); if (BC.has(key)) return BC.get(key);
    const c = COLS[ci], p = Math.round(s * dpr), o = document.createElement('canvas'); o.width = o.height = p; const g = o.getContext('2d'), r = p * .16, m = p * .04;
    const rr = (a, b, w, h, rad) => { g.beginPath(); g.roundRect(a, b, w, h, rad); };
    // alap: függőleges színátmenet, sötét perem
    let gr = g.createLinearGradient(0, 0, 0, p); gr.addColorStop(0, c.l); gr.addColorStop(.42, c.b); gr.addColorStop(1, c.d); rr(m, m, p - 2 * m, p - 2 * m, r); g.fillStyle = gr; g.fill();
    // belső „víztükör”: hullámos sáv a blokk alsó részén
    g.save(); rr(m, m, p - 2 * m, p - 2 * m, r); g.clip(); g.beginPath(); g.moveTo(0, p * .58); for (let i = 0; i <= 20; i++) { const t = i / 20; g.lineTo(t * p, p * (.58 + Math.sin(t * Math.PI * 2.2) * .045)); } g.lineTo(p, p); g.lineTo(0, p); g.closePath();
    gr = g.createLinearGradient(0, p * .55, 0, p); gr.addColorStop(0, 'rgba(255,255,255,.28)'); gr.addColorStop(.12, 'rgba(255,255,255,.08)'); gr.addColorStop(1, 'rgba(0,0,0,.18)'); g.fillStyle = gr; g.fill();
    // fényes üveg-csillanás felül
    gr = g.createLinearGradient(0, m, 0, p * .5); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); rr(p * .12, p * .09, p * .76, p * .32, r * .7); g.fillStyle = gr; g.fill(); g.restore();
    // HGWS-csepp embléma középen
    g.save(); g.translate(p / 2, p * .53); const d = p * .17; g.beginPath(); g.moveTo(0, -d * 1.35); g.bezierCurveTo(d * .9, -d * .2, d * .95, d * .9, 0, d * .95); g.bezierCurveTo(-d * .95, d * .9, -d * .9, -d * .2, 0, -d * 1.35); g.fillStyle = 'rgba(255,255,255,.3)'; g.fill();
    g.lineWidth = Math.max(1, p * .02); g.strokeStyle = 'rgba(255,255,255,.45)'; g.stroke(); g.beginPath(); g.arc(-d * .3, d * .15, d * .22, 0, 6.3); g.fillStyle = 'rgba(255,255,255,.55)'; g.fill(); g.restore();
    // arany belső keret (HGWS)
    rr(m + p * .035, m + p * .035, p - 2 * m - p * .07, p - 2 * m - p * .07, r * .8); g.lineWidth = Math.max(1, p * .025); g.strokeStyle = 'rgba(255,226,150,.45)'; g.stroke();
    rr(m, m, p - 2 * m, p - 2 * m, r); g.lineWidth = Math.max(1, p * .03); g.strokeStyle = 'rgba(0,0,0,.35)'; g.stroke();
    BC.set(key, o); return o;
  }
  const drawBlock = (ci, X, Y, s, a = 1, sc = 1) => { if (!ci) return; x.globalAlpha = a; const o = s * (1 - sc) / 2; x.drawImage(blockCanvas(ci, s), X + o, Y + o, s * sc, s * sc); x.globalAlpha = 1; };
  /* ---------- effektek ---------- */
  const parts = [], texts = [], clearing = []; let shake = 0, flash = 0;
  function burst(cx, cy, ci, n = 10) { const c = COLS[ci]; for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 260; parts.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 140, r: 2 + Math.random() * 4.5, life: 0, max: .6 + Math.random() * .5, c: Math.random() < .55 ? c.l : '#bfe8ff' }); } }
  const say = (t, X, Y, col = '#fff', size = 28, dur = 1.2) => texts.push({ t, x: X, y: Y, col, size, life: 0, max: dur });
  /* ---------- lerakás ---------- */
  const PRAISE = ['Szép!', 'Csobbanás!', 'Remek!', 'Vízesés!', 'Áradás!', 'HGWS-szint!'];
  function place(i, cx, cy) {
    const p = S.tray[i], sh = shape(p); if (!fits(S.b, sh, cx, cy)) return false;
    for (const [dx, dy] of sh.c) S.b[(cy + dy) * N + cx + dx] = p.col;
    S.tray[i] = null; S.moves++; let pts = sh.c.length; sPlace();
    const rows = [], cols = []; for (let k = 0; k < N; k++) { let r = true, c = true; for (let j = 0; j < N; j++) { if (!S.b[k * N + j]) r = false; if (!S.b[j * N + k]) c = false; } if (r) rows.push(k); if (c) cols.push(k); }
    const lines = rows.length + cols.length;
    if (lines) { const cells = new Set(); rows.forEach(r => { for (let j = 0; j < N; j++) cells.add(r * N + j); }); cols.forEach(c => { for (let j = 0; j < N; j++) cells.add(j * N + c); });
      let k = 0; for (const id of cells) { const X = id % N, Y = (id / N) | 0, ci = S.b[id]; clearing.push({ X, Y, ci, t: -(Math.abs(X - (cx + sh.w / 2)) + Math.abs(Y - (cy + sh.h / 2))) * .025 }); S.b[id] = 0; k++; }
      S.combo++; S.idle = 0; const gain = Math.round(10 * lines * (lines + 1) / 2 * 2 * (1 + (S.combo - 1) * .5)); pts += gain;
      const mx = bx + (cx + sh.w / 2) * cs, my = by + (cy + sh.h / 2) * cs; say('+' + gain, mx, my - cs * .3, '#fff3c4', 30 + lines * 4);
      if (S.combo > 1) say(`KOMBÓ ×${S.combo}`, W / 2, by - 14 + bs * .12, '#7fd0ff', 26, 1.4);
      if (lines >= 2) say(PRAISE[Math.min(PRAISE.length - 1, lines - 2 + (S.combo > 3 ? 1 : 0))], W / 2, by + bs * .42, '#e8b656', 40 + lines * 4, 1.5);
      if (S.b.every(v => !v)) { pts += 300; say('TISZTA TÁBLA! +300', W / 2, by + bs * .58, '#5ee08a', 34, 1.8); flash = .6; }
      sClear(lines); shake = Math.min(14, 4 + lines * 3); }
    else if (++S.idle >= 3) { S.combo = 0; }
    S.score += pts; if (S.score > best) { best = S.score; store.set(KB, best); }
    if (S.tray.every(t => !t)) refill();
    if (!S.tray.some(t => t && anyFit(S.b, shape(t)))) { S.over = true; overT = 0; postScore(); }
    save(); return true;
  }
  let overT = 0, newBest = false;
  function postScore() { newBest = S.score >= best && S.score > 0; try { if (window.top !== window && S.score > 0) parent.postMessage({ hgws: 'score', game: GAME, score: S.score }, location.origin); } catch (_) {} store.set(KS, null); }
  /* ---------- bemenet ---------- */
  let drag = null, confirm = false; const pos = e => ({ X: e.clientX, Y: e.clientY });
  const btns = [];
  function trayPiece(i) { const p = S.tray[i]; if (!p) return null; const sh = shape(p), ts = Math.min(cs * .6, slotW * .86 / Math.max(sh.w, sh.h)), cx = bx + slotW * (i + .5), cy = trayY + cs * 1.35; return { sh, ts, x0: cx - sh.w * ts / 2, y0: cy - sh.h * ts / 2 }; }
  function dropCell(px, py) { const p = S.tray[drag.i], sh = shape(p); const gx = px - drag.ox * cs, gy = py - drag.oy * cs; return [Math.round((gx - bx) / cs), Math.round((gy - by) / cs)]; }
  cv.addEventListener('pointerdown', e => { au(); const { X, Y } = pos(e);
    for (const b of btns) if (X > b.x && X < b.x + b.w && Y > b.y && Y < b.y + b.h) { b.f(); return; }
    if (S.over || confirm) return;
    for (let i = 0; i < 3; i++) { const t = trayPiece(i); if (!t) continue; const sx = bx + slotW * i; if (X > sx && X < sx + slotW && Y > trayY - cs * .2 && Y < trayY + cs * 2.9) {
        const touch = e.pointerType !== 'mouse'; drag = { i, x: X, y: Y, ox: t.sh.w / 2, oy: t.sh.h / 2 + (touch ? 1.6 : .3), touch }; sPick(); cv.setPointerCapture(e.pointerId); return; } } });
  cv.addEventListener('pointermove', e => { if (!drag) return; const { X, Y } = pos(e); drag.x = X; drag.y = Y; });
  const up = e => { if (!drag) return; const [cx, cy] = dropCell(drag.x, drag.y); if (!place(drag.i, cx, cy) && drag.y < trayY - cs * .3) sBad(); drag = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', () => { drag = null; });
  addEventListener('keydown', e => { if (e.key === 'r' && S.over) newGame(); if (e.key === 'm') { mute = !mute; store.set(KM, mute); } });
  /* ---------- rajzolás ---------- */
  const rrect = (X, Y, w, h, r) => { x.beginPath(); x.roundRect(X, Y, w, h, r); };
  function btn(X, Y, w, h, label, f, style = 'y') { btns.push({ x: X, y: Y, w, h, f }); rrect(X, Y, w, h, h / 2); if (style === 'y') { const g = x.createLinearGradient(0, Y, 0, Y + h); g.addColorStop(0, '#f6cf4a'); g.addColorStop(1, '#d9a51c'); x.fillStyle = g; } else x.fillStyle = 'rgba(255,255,255,.1)'; x.fill();
    x.fillStyle = style === 'y' ? '#1a1204' : '#eef3f8'; x.font = `900 ${h * .42}px Inter,Arial`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, X + w / 2, Y + h / 2 + 1); }
  function drop(X, Y, s, col) { x.beginPath(); x.moveTo(X, Y - s * 1.35); x.bezierCurveTo(X + s * .9, Y - s * .2, X + s * .95, Y + s * .9, X, Y + s * .95); x.bezierCurveTo(X - s * .95, Y + s * .9, X - s * .9, Y - s * .2, X, Y - s * 1.35); x.fillStyle = col; x.fill(); }
  let last = performance.now(), T = 0;
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now; T += dt; btns.length = 0;
    // háttér: sötét HGWS-kék, lassan hullámzó víz alul
    let g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b1a33'); g.addColorStop(.6, '#071226'); g.addColorStop(1, '#040912'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(0, H); for (let i = 0; i <= 40; i++) { const t = i / 40; x.lineTo(t * W, H - 40 - k * 26 + Math.sin(t * 6 + T * (.6 + k * .2) + k) * 10); } x.lineTo(W, H); x.closePath(); x.fillStyle = `rgba(42,143,224,${.05 + k * .03})`; x.fill(); }
    let sx = 0, sy = 0; if (shake > 0) { sx = (Math.random() - .5) * shake; sy = (Math.random() - .5) * shake; shake = Math.max(0, shake - dt * 40); } x.save(); x.translate(sx, sy);
    // fejléc
    x.textAlign = 'center'; x.textBaseline = 'alphabetic'; const ty = Math.max(30, hdr * .3);
    x.font = `900 ${Math.min(26, bs * .06)}px Inter,Arial`; drop(W / 2 - x.measureText('WATER BLAST').width / 2 - 13, ty - 8, 8, '#2a8fe0'); const tg = x.createLinearGradient(0, ty - 22, 0, ty); tg.addColorStop(0, '#fff3c4'); tg.addColorStop(1, '#e8b656'); x.fillStyle = tg; x.fillText('WATER BLAST', W / 2, ty);
    x.font = '800 10px Inter,Arial'; x.fillStyle = '#5f7f9f'; x.fillText('H G W S', W / 2, ty + 15);
    x.font = `900 ${Math.min(48, hdr * .38)}px Inter,Arial`; x.fillStyle = '#fff'; x.fillText(S.score.toLocaleString('hu-HU'), W / 2, hdr - 14);
    x.textAlign = 'left'; x.font = '800 14px Inter,Arial'; x.fillStyle = '#e8b656'; x.fillText('🏆 ' + best.toLocaleString('hu-HU'), bx, ty);
    btns.push({ x: bx + bs - 44, y: ty - 26, w: 44, h: 36, f() { mute = !mute; store.set(KM, mute); } }); x.textAlign = 'right'; x.font = '18px Arial'; x.fillText(mute ? '🔇' : '🔊', bx + bs, ty);
    btns.push({ x: bx + bs - 92, y: ty - 26, w: 42, h: 36, f() { if (!S.over) confirm = true; } }); x.fillStyle = '#93a3b6'; x.font = '900 20px Arial'; x.fillText('↻', bx + bs - 58, ty);
    // tábla
    rrect(bx - 8, by - 8, bs + 16, bs + 16, 16); x.fillStyle = 'rgba(8,18,36,.92)'; x.fill(); x.lineWidth = 2; x.strokeStyle = 'rgba(232,182,86,.55)'; x.stroke();
    for (let Y = 0; Y < N; Y++) for (let X = 0; X < N; X++) { rrect(bx + X * cs + cs * .05, by + Y * cs + cs * .05, cs * .9, cs * .9, cs * .14); x.fillStyle = (X + Y) % 2 ? 'rgba(42,143,224,.07)' : 'rgba(42,143,224,.11)'; x.fill(); }
    // előnézet (árnyék + kiürülő sorok)
    let ghost = null, hiRows = [], hiCols = [];
    if (drag) { const p = S.tray[drag.i], sh = shape(p), [cx, cy] = dropCell(drag.x, drag.y); if (fits(S.b, sh, cx, cy)) { ghost = { sh, cx, cy, col: p.col }; const b2 = S.b.slice(); for (const [dx, dy] of sh.c) b2[(cy + dy) * N + cx + dx] = 1;
        for (let k = 0; k < N; k++) { let r = true, c = true; for (let j = 0; j < N; j++) { if (!b2[k * N + j]) r = false; if (!b2[j * N + k]) c = false; } if (r) hiRows.push(k); if (c) hiCols.push(k); } } }
    for (let Y = 0; Y < N; Y++) for (let X = 0; X < N; X++) { const v = S.b[Y * N + X]; if (!v) continue; const hl = hiRows.includes(Y) || hiCols.includes(X); drawBlock(hl ? ghost.col : v, bx + X * cs, by + Y * cs, cs, 1); if (hl) { rrect(bx + X * cs + 2, by + Y * cs + 2, cs - 4, cs - 4, cs * .16); x.fillStyle = `rgba(255,255,255,${.15 + .12 * Math.sin(T * 10)})`; x.fill(); } }
    if (ghost) for (const [dx, dy] of ghost.sh.c) drawBlock(ghost.col, bx + (ghost.cx + dx) * cs, by + (ghost.cy + dy) * cs, cs, .42);
    // kiürülő blokkok: felpattannak és vízcseppekké válnak
    for (let i = clearing.length - 1; i >= 0; i--) { const c = clearing[i]; c.t += dt; if (c.t < 0) { drawBlock(c.ci, bx + c.X * cs, by + c.Y * cs, cs); continue; } if (!c.b) { c.b = 1; burst(bx + (c.X + .5) * cs, by + (c.Y + .5) * cs, c.ci, 7); }
      const k = c.t / .28; if (k >= 1) { clearing.splice(i, 1); continue; } drawBlock(c.ci, bx + c.X * cs, by + c.Y * cs, cs, 1 - k, 1 + k * .35); }
    if (flash > 0) { flash -= dt; x.fillStyle = `rgba(127,208,255,${flash * .5})`; x.fillRect(bx, by, bs, bs); }
    // tálca
    for (let i = 0; i < 3; i++) { const t = trayPiece(i); if (!t || (drag && drag.i === i)) continue; const ok = anyFit(S.b, t.sh); for (const [dx, dy] of t.sh.c) drawBlock(ok ? S.tray[i].col : 0, t.x0 + dx * t.ts, t.y0 + dy * t.ts, t.ts, 1);
      if (!ok) for (const [dx, dy] of t.sh.c) { rrect(t.x0 + dx * t.ts + 1, t.y0 + dy * t.ts + 1, t.ts - 2, t.ts - 2, t.ts * .16); x.fillStyle = 'rgba(120,135,155,.45)'; x.fill(); } }
    // húzott elem
    if (drag) { const p = S.tray[drag.i], sh = shape(p), X0 = drag.x - drag.ox * cs, Y0 = drag.y - drag.oy * cs; x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 18; x.shadowOffsetY = 8; for (const [dx, dy] of sh.c) drawBlock(p.col, X0 + dx * cs, Y0 + dy * cs, cs, 1, .96); x.shadowColor = 'transparent'; x.shadowBlur = 0; x.shadowOffsetY = 0; }
    // részecskék és feliratok
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life += dt; if (p.life > p.max) { parts.splice(i, 1); continue; } p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; x.globalAlpha = 1 - p.life / p.max; drop(p.x, p.y, p.r, p.c); x.globalAlpha = 1; }
    x.textAlign = 'center'; x.textBaseline = 'middle'; for (let i = texts.length - 1; i >= 0; i--) { const t = texts[i]; t.life += dt; if (t.life > t.max) { texts.splice(i, 1); continue; } const k = t.life / t.max, s = t.size * (k < .15 ? .6 + k / .15 * .4 : 1);
      x.globalAlpha = k > .7 ? (1 - k) / .3 : 1; x.font = `900 ${s}px Inter,Arial`; x.lineWidth = 5; x.strokeStyle = 'rgba(4,10,20,.85)'; x.strokeText(t.t, t.x, t.y - k * 40); x.fillStyle = t.col; x.fillText(t.t, t.x, t.y - k * 40); x.globalAlpha = 1; }
    x.restore();
    // megerősítés: új játék
    if (confirm) { x.fillStyle = 'rgba(3,7,14,.75)'; x.fillRect(0, 0, W, H); x.textAlign = 'center'; x.fillStyle = '#fff'; x.font = '900 26px Inter,Arial'; x.fillText('Új játékot kezdesz?', W / 2, H * .42);
      x.font = '600 14px Inter,Arial'; x.fillStyle = '#93a3b6'; x.fillText('A mostani állás elvész.', W / 2, H * .42 + 28); btn(W / 2 - 150, H * .5, 140, 50, 'Igen', () => { confirm = false; postScore(); newGame(); }); btn(W / 2 + 10, H * .5, 140, 50, 'Mégse', () => { confirm = false; }, 'g'); }
    // játék vége
    if (S.over) { overT += dt; const a = Math.min(1, overT / .6); x.fillStyle = `rgba(3,7,14,${.78 * a})`; x.fillRect(0, 0, W, H); if (overT > .4) { x.globalAlpha = Math.min(1, (overT - .4) / .4); x.textAlign = 'center';
        drop(W / 2, H * .25, 26, '#2a8fe0'); x.fillStyle = '#e8b656'; x.font = '900 34px Inter,Arial'; x.fillText('ELFOGYOTT A HELY', W / 2, H * .36);
        x.fillStyle = '#93a3b6'; x.font = '800 12px Inter,Arial'; x.fillText('P O N T S Z Á M', W / 2, H * .43); x.fillStyle = '#fff'; x.font = '900 54px Inter,Arial'; x.fillText(S.score.toLocaleString('hu-HU'), W / 2, H * .5);
        x.fillStyle = newBest ? '#5ee08a' : '#e8b656'; x.font = '800 16px Inter,Arial'; x.fillText(newBest ? '🏆 ÚJ REKORD!' : '🏆 Rekord: ' + best.toLocaleString('hu-HU'), W / 2, H * .56);
        btn(W / 2 - 100, H * .62, 200, 54, 'ÚJRA', () => { newBest = false; newGame(); }); x.globalAlpha = 1; } }
    requestAnimationFrame(frame);
  }
  layout(); if (!load()) newGame(); requestAnimationFrame(frame);
  window.__wb = { get S() { return S; }, place, fits, shape, newGame };
})();
