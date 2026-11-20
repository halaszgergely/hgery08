/* HGWS Arcade – Torony (klasszikus szkript, az arcade.html tölti be; a közös keret a jatekok/arcade/mag.js) */
'use strict';
const Torony = (() => {
  const T = 12, COLS = 40, ROWS = 30, WW = T * COLS, SH = T * ROWS, PW = 14, PH = 18, S2 = Math.SQRT1_2,
    GRAV = 1500, MAXF = 1000, WALK = 95, CHMAX = .62, JV0 = 260, JV1 = 760, JVX = 175, BOUNCE = .5, STEP = 1 / 240, WIND = 240;
  const ZONES = [
    { n: 'A KERT', b: ['#17391e', '#08140b'], p: '#5a3a1e', t: '#4f9a3f' },
    { n: 'PINCECSÖVEK', b: ['#1b222c', '#0a0e14'], p: '#46525f', t: '#c3ced9' },
    { n: 'SZIVATTYÚHÁZ', b: ['#0f1b30', '#060c17'], p: '#2d3b52', t: '#e8b656' },
    { n: 'SZÉLJÁRTA ERKÉLY', b: ['#2a2238', '#120e1c'], p: '#4a3d5c', t: '#b9a6d6', wind: 1 },
    { n: 'JEGES TARTÁLY', b: ['#0d2c4c', '#06101e'], p: '#3d5a78', t: '#9fd6f5' },
    { n: 'A TORONY CSÚCSA', b: ['#3a2410', '#140b04'], p: '#6b4a2a', t: '#c8964a' }
  ];
  // képernyők alulról felfelé; [sor, oszlop, minta, ismétlés lefelé]
  const LV = [
    [[1, 18, '######'], [6, 30, '######'], [12, 24, '######'], [13, 35, '#####'], [18, 12, '########'], [19, 0, '#####'], [19, 14, '####', 10], [24, 4, '######'], [29, 0, '#'.repeat(40)]],
    [[1, 26, '#####'], [6, 14, '#####'], [13, 6, '#'.repeat(28), 2], [16, 36, '####'], [17, 0, '####'], [20, 26, '######'], [24, 8, '#####']],
    [[1, 24, '#####'], [3, 14, '##', 20], [6, 14, '######'], [8, 30, '##', 19], [12, 26, '######'], [18, 14, '######'], [24, 20, '#####']],
    [[1, 6, '#####'], [4, 18, '####'], [10, 6, '#'.repeat(34), 2], [13, 0, '###'], [17, 0, '#'.repeat(28), 2], [23, 33, '#######']],
    [[1, 22, '######'], [6, 36, '####'], [12, 30, '######'], [18, 18, '/###\\'], [19, 17, '/#####\\'], [20, 16, '/#######\\'], [21, 15, '/#########\\'], [22, 14, '/###########\\'], [23, 14, '#############'], [20, 8, '###'], [24, 0, '######']],
    [[2, 32, '######'], [8, 22, '#####'], [14, 4, '###########', 2], [19, 0, '####'], [25, 10, '#####']],
    [[1, 28, '####'], [7, 16, '####'], [13, 4, '####'], [15, 10, '##', 6], [19, 14, '####'], [25, 26, '####']],
    [[1, 12, '#####'], [5, 0, '####'], [11, 12, '###'], [12, 26, '#########', 2], [17, 22, '####'], [24, 36, '####']],
    [[1, 14, '========'], [5, 5, '#', 2], [7, 5, '#========'], [13, 22, '###'], [19, 34, '======'], [25, 18, '========']],
    [[1, 20, '#####'], [6, 34, '######'], [7, 34, '##', 6], [12, 26, '========'], [18, 12, '###'], [24, 2, '======']],
    [[1, 26, '####'], [6, 12, '##'], [12, 0, '####'], [18, 12, '######\\'], [19, 12, '#######\\'], [20, 12, '########\\'], [21, 12, '#########\\'], [22, 12, '##########\\'], [23, 12, '###########'], [21, 26, '###'], [25, 30, '###']],
    [[7, 28, 'GGGGGG'], [10, 18, '##'], [14, 6, '####'], [18, 22, '###'], [24, 36, '####']]
  ];
  const SCREENS = LV.length, NR = SCREENS * ROWS, OFF = NR * T, TOP = SCREENS * SH;
  const GR = Array.from({ length: NR }, () => Array(COLS).fill('.'));
  LV.forEach((scr, s) => scr.forEach(([r, c, str, n = 1]) => { for (let k = 0; k < n; k++) for (let i = 0; i < str.length; i++) GR[(SCREENS - 1 - s) * ROWS + r + k][c + i] = str[i]; }));
  const at = (c, R) => c < 0 || c >= COLS || R >= NR ? '#' : R < 0 ? '.' : GR[R][c];
  const SOLID = { '#': 1, '=': 1, 'G': 1 };
  const zi = y => Math.min(ZONES.length - 1, Math.floor(Math.max(0, -y - .01) / SH / 2));
  let gx = 0, gn = 0, gy = 0; GR.forEach((row, R) => row.forEach((ch, c) => { if (ch === 'G') { gx += c * T + T / 2; gn++; gy = R * T - OFF; } }));
  const GOAL = { x: gx / gn, y: gy };

  function tiles(x, y, w, h, f) {
    const o = [];
    for (let R = Math.floor((y + OFF) / T); R <= Math.floor((y + h - 1e-6 + OFF) / T); R++)
      for (let c = Math.floor(x / T); c <= Math.floor((x + w - 1e-6) / T); c++) { const ch = at(c, R); if (f(ch)) o.push({ x: c * T, y: R * T - OFF, ch }); }
    return o;
  }
  const solids = p => tiles(p.x, p.y, PW, PH, ch => SOLID[ch]);
  function slopes(p) {
    let hit = 0;
    for (const t of tiles(p.x, p.y, PW, PH, ch => ch === '/' || ch === '\\')) {
      const r = t.ch === '/', cx = r ? Math.min(p.x + PW, t.x + T) : Math.max(p.x, t.x);
      if (r ? cx <= t.x : cx >= t.x + T) continue;
      const surf = r ? t.y + T - (cx - t.x) : t.y + (cx - t.x), d = p.y + PH - surf;
      if (d > .001 && d < T + 4) { p.y = surf - PH; const nx = r ? -S2 : S2, ny = -S2, vn = p.vx * nx + p.vy * ny; if (vn < 0) { p.vx -= vn * nx; p.vy -= vn * ny; } hit = 1; }
    }
    if (hit && p.ground) { p.ground = 0; p.peak = p.from = p.y; }
    return hit;
  }
  function jump(p, k, dir) { p.vy = -(JV0 + (JV1 - JV0) * k); p.vx = dir * JVX; p.ground = 0; p.peak = p.from = p.y; }
  function step(p, h, walk, wind) {
    p.bonk = 0;
    if (p.ground) {
      if (p.ice) p.vx = walk ? Math.max(-150, Math.min(150, p.vx + walk * 600 * h)) : p.vx * Math.max(0, 1 - 1.4 * h);
      else p.vx = walk * WALK;
    } else { p.vy = Math.min(MAXF, p.vy + GRAV * h); if (wind) p.vx = Math.max(-260, Math.min(260, p.vx + wind * h)); }
    const sx = Math.sign(p.vx); p.x += p.vx * h;
    if (sx) { const hs = solids(p); if (hs.length) { p.x = sx > 0 ? Math.min(...hs.map(t => t.x)) - PW : Math.max(...hs.map(t => t.x)) + T;
      if (p.ground) p.vx = 0; else { p.vx = -sx * Math.abs(p.vx) * BOUNCE; p.bonk = 1; } } }
    let landed = null;
    if (!p.ground) {
      const sy = Math.sign(p.vy); p.y += p.vy * h;
      const hs = solids(p);
      if (hs.length) {
        if (sy > 0) { const top = Math.min(...hs.map(t => t.y)); p.y = top - PH; landed = hs.find(t => t.y === top); }
        else if (sy < 0) { p.y = Math.max(...hs.map(t => t.y)) + T; p.vy = 0; p.bonk = 2; }
      }
      if (!landed) slopes(p);
      p.peak = Math.min(p.peak, p.y);
      if (landed) { const sup = tiles(p.x, p.y + PH, PW, 1, ch => SOLID[ch]); p.ground = 1; p.vy = 0; p.ice = sup.some(t => t.ch === '=') && !sup.some(t => t.ch !== '='); p.vx = p.ice ? p.vx * .6 : 0; }
    } else if (!slopes(p)) {
      const sup = tiles(p.x, p.y + PH, PW, 1, ch => SOLID[ch]);
      if (sup.length) p.ice = !sup.some(t => t.ch !== '='); else { p.ground = 0; p.peak = p.from = p.y; }
    }
    return landed;
  }
  const windAt = (y, t) => ZONES[zi(y)].wind ? WIND * Math.sin(t * Math.PI / 3) : 0;
  function rng(s) { return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------- bemenet ---------- */
  const K = { L: 0, R: 0, J: 0 }, TP = new Map(); let mouseJ = 0, mx = 0, touchUI = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches, S = null, V = { sc: 1, ox: 0, oy: 0 };
  const has = r => [...TP.values()].includes(r);
  const active = () => typeof G !== 'undefined' && G.game === Torony && G.running;
  const walkDir = () => (K.R || has('R') ? 1 : 0) - (K.L || has('L') ? 1 : 0);
  const charging = () => !!(K.J || mouseJ || has('J'));
  function aimDir(G) {
    let d = walkDir();
    if (!d && mouseJ) { const px = V.ox + (S.p.x + PW / 2) * V.sc, dx = mx - px; if (Math.abs(dx) > 26 * G.d) d = Math.sign(dx); }
    return d;
  }
  const KEYS = { ArrowLeft: 'L', a: 'L', A: 'L', ArrowRight: 'R', d: 'R', D: 'R', ' ': 'J', ArrowUp: 'J', w: 'J', W: 'J' };
  if (typeof addEventListener === 'function') {
    addEventListener('keydown', e => { const k = KEYS[e.key]; if (!k || !active()) return; K[k] = 1; if (k === 'J') e.preventDefault(); });
    addEventListener('keyup', e => { const k = KEYS[e.key]; if (k) K[k] = 0; });
    addEventListener('blur', () => { K.L = K.R = K.J = 0; mouseJ = 0; TP.clear(); });
  }
  function btns(G) {
    const d = G.d, r = 40 * d, y = G.H - 26 * d - r;
    return [{ id: 'L', x: 22 * d + r, y, r }, { id: 'R', x: 22 * d + r * 3 + 14 * d, y, r }, { id: 'J', x: G.W - 22 * d - r * 1.35, y: y - r * .35, r: r * 1.35 }];
  }
  const fmtT = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const toScreen = (x, y) => [V.ox + x * V.sc, V.oy + (y - S.cam) * V.sc];

  return {
    id: 'viztorony', name: 'VÍZTORONY', lives: 0, quit: true, unit: ' M', lb: 'm', sponsor: 'A Zerosites támogatásával', overTitle: 'A TORONY GYŐZÖTT',
    desc: 'Mássz fel a víztorony tetejére az Arany Locsolófejért! Minél tovább tartod az ugrást, annál nagyobbat ugrasz – egy rossz mozdulat, és a legaljáig zuhanhatsz.',
    how: '← → JÁRÁS · SZÓKÖZ TARTVA = UGRÁS · 🏁 = BEFEJEZÉS',
    ranks: [[0, 'Lépcsőjáró'], [70, 'Csőmászó'], [140, 'Szivattyúházi'], [215, 'Szélkakas'], [290, 'Jégtörő'], [360, 'Toronyőr'], [Math.floor(-GOAL.y / 10), 'Az Arany Locsolófej ura']],
    _step: step, _jump: jump, _C: { T, COLS, WW, SH, TOP, PW, PH, CHMAX, STEP, WIND, NR, OFF, SCREENS }, _at: at, _zi: zi, _zones: ZONES,
    init(G) {
      K.L = K.R = K.J = 0; mouseJ = 0; TP.clear(); this.overTitle = 'A TORONY GYŐZÖTT';
      const y0 = -T - PH;
      S = { p: { x: 26 * T, y: y0, vx: 0, vy: 0, ground: 1, ice: 0, peak: y0, from: y0, face: -1 },
        c: 0, aim: 0, stun: 0, falls: 0, zone: 0, banner: { t: ZONES[0].n, l: 2.2 }, cam: -SH, won: 0, walkT: 0, wo: 0 };
    },
    down(G, x, y, e) {
      if (!e || e === true) return; mx = x;
      try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
      if (e.pointerType === 'mouse') { mouseJ = 1; return; }
      touchUI = true;
      const b = btns(G).find(b => Math.hypot(b.x - x, b.y - y) < b.r * 1.25);
      TP.set(e.pointerId, b ? b.id : 'J');
    },
    move(G, x) { mx = x; },
    up(G, x, y, e) { if (!e || e === true) return; if (e.pointerType === 'mouse') mouseJ = 0; TP.delete(e.pointerId); },
    update(G, dt) {
      const p = S.p, n = Math.ceil(dt / STEP), h = dt / n;
      for (let i = 0; i < n && G.running; i++) {
        let walk = 0;
        if (S.stun > 0) S.stun -= h;
        else if (p.ground) {
          if (charging()) { S.c += h; S.aim = aimDir(G); if (S.c >= CHMAX) this.leap(); }
          else if (S.c > 0) this.leap();
          else walk = walkDir();
          if (walk) p.face = walk;
        }
        const was = p.ground, landed = step(p, h, p.ground && !S.c ? walk : 0, windAt(p.y, G.t));
        if (p.bonk === 1) Sfx.blip(320, .06, 'square', .05, .7);
        if (p.bonk === 2) Sfx.blip(200, .07, 'square', .06, .6);
        if (!was && landed) this.land(G, landed);
        if (p.ground && walk) S.walkT += h;
      }
      const scr = Math.max(0, Math.floor(-(p.y + PH / 2) / SH));
      S.cam += (-(scr + 1) * SH - S.cam) * Math.min(1, dt * 14);
      S.wo += windAt(S.cam + SH / 2, G.t) * dt * 1.6;
      if (S.banner) { S.banner.l -= dt; if (S.banner.l <= 0) S.banner = null; }
    },
    leap() { const p = S.p; jump(p, Math.min(1, S.c / CHMAX), S.aim); if (S.aim) p.face = S.aim; S.c = 0; Sfx.flap(); },
    land(G, t) {
      const p = S.p, fall = p.y - p.peak, [sx, sy] = toScreen(p.x + PW / 2, p.y + PH);
      if (p.y > p.from + 30) S.falls++;
      if (fall > SH * .75) { S.stun = .6; G.shake = 16 * G.d; Sfx.hit(); G.float(sx, sy - 40 * G.d, 'PLATTY!', true); G.splash(sx, sy, '150,215,255', 26, 5); if (navigator.vibrate) navigator.vibrate(50); }
      else { Sfx.blip(180, .05, 'triangle', .08); if (fall > 40) G.splash(sx, sy, '150,215,255', 6, 2); }
      const m = Math.floor(-t.y / 10);
      if (m > G.score) { G.score = m; hud(); }
      const z = zi(t.y); if (z > S.zone) { S.zone = z; S.banner = { t: ZONES[z].n, l: 2.4 }; Sfx.coin(); }
      if (t.ch === 'G' && !S.won) {
        S.won = 1; G.win = 1; this.overTitle = 'CSÚCSON VAGY!';
        G.float(sx, sy - 60 * G.d, 'ARANY LOCSOLÓFEJ!'); G.splash(sx, sy - 30 * G.d, '255,215,120', 80, 9);
        Sfx.perfect(); setTimeout(() => G.end(), 1400);
      }
    },
    draw(g, G, t) {
      if (!S) return;
      const d = G.d, sc = V.sc = Math.min(G.W / WW, G.H / SH) * (G.W / d < 700 ? 1 : .96);
      V.ox = (G.W - WW * sc) / 2; V.oy = (G.H - SH * sc) / 2;
      const p = S.p, Z = ZONES[zi(S.cam + SH / 2)];
      bg(Z.b[0], Z.b[1]);
      const y0 = S.cam - V.oy / sc - 20, y1 = S.cam + (G.H - V.oy) / sc + 20;
      g.save(); g.translate(V.ox, V.oy); g.scale(sc, sc); g.translate(0, -S.cam);
      // háttér-díszlet képernyőnként
      for (let s = Math.max(0, Math.floor(-y1 / SH)); s <= Math.min(SCREENS - 1, Math.floor(-y0 / SH)); s++) {
        const R = rng(s * 97 + 5), zz = Math.min(ZONES.length - 1, s >> 1), top = -(s + 1) * SH;
        if (zz === 0) { g.fillStyle = 'rgba(255,200,120,.05)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(R() * WW, top + R() * SH, 30 + R() * 60, 0, 6.283); g.fill(); } }
        else if (zz <= 2) { g.fillStyle = zz === 1 ? 'rgba(195,206,217,.05)' : 'rgba(232,182,86,.045)'; for (let i = 0; i < 4; i++) g.fillRect(R() * WW, top, 10 + R() * 14, SH);
          g.fillStyle = 'rgba(255,255,255,.035)'; for (let i = 0; i < 6; i++) g.fillRect(R() * WW, top + R() * SH, 60 + R() * 120, 6); }
        else if (zz === 3) { g.fillStyle = 'rgba(255,255,255,.04)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(R() * WW, top + R() * SH, 80, 20, 0, 0, 6.283); g.fill(); } }
        else { for (let i = 0; i < 26; i++) { const tw = .3 + .7 * Math.abs(Math.sin(t * 1.3 + i)); g.fillStyle = `rgba(230,245,255,${(zz === 5 ? .3 : .5) * tw})`; g.fillRect(R() * WW, top + R() * SH, 2, 2); } }
      }
      // falak
      const ww = V.ox / sc + 2;
      for (const [x0, x1] of [[-ww, 0], [WW, WW + ww]]) {
        g.fillStyle = '#1c1712'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
        g.fillStyle = 'rgba(255,255,255,.035)';
        for (let y = Math.floor(y0 / 18) * 18; y < y1; y += 18) for (let x = x0 - ((y / 18) & 1) * 16; x < x1; x += 32) g.fillRect(x + 1, y + 1, 30, 16);
        g.fillStyle = 'rgba(232,182,86,.35)'; g.fillRect(x0 < 0 ? -3 : WW, y0, 3, y1 - y0);
      }
      // csempék
      const r0 = Math.max(0, Math.floor((y0 + OFF) / T)), r1 = Math.min(NR - 1, Math.floor((y1 + OFF) / T));
      for (let R = r0; R <= r1; R++) {
        const ty = R * T - OFF, z = ZONES[zi(ty)];
        for (let c = 0; c < COLS; c++) {
          const ch = GR[R][c]; if (ch === '.') continue;
          const x = c * T, open = !SOLID[at(c, R - 1)] && at(c, R - 1) !== '/' && at(c, R - 1) !== '\\';
          if (ch === '/' || ch === '\\') {
            g.fillStyle = z.p; g.beginPath();
            if (ch === '/') { g.moveTo(x, ty + T); g.lineTo(x + T, ty); g.lineTo(x + T, ty + T); } else { g.moveTo(x, ty); g.lineTo(x + T, ty + T); g.lineTo(x, ty + T); }
            g.closePath(); g.fill();
            g.strokeStyle = z.t; g.lineWidth = 2.5; g.beginPath(); if (ch === '/') { g.moveTo(x, ty + T); g.lineTo(x + T, ty); } else { g.moveTo(x, ty); g.lineTo(x + T, ty + T); } g.stroke();
            continue;
          }
          if (ch === 'G') { g.fillStyle = '#a8702a'; g.fillRect(x, ty, T + .4, T + .4); if (open) { g.fillStyle = '#ffe29a'; g.fillRect(x, ty, T + .4, 3); } continue; }
          const ice = ch === '=';
          g.fillStyle = ice ? '#5f8fb8' : z.p; g.fillRect(x, ty, T + .4, T + .4);
          if ((c + R) & 1) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x, ty + T - 2, T, 2); }
          if (open) { g.fillStyle = ice ? '#eaf8ff' : z.t; g.fillRect(x, ty, T + .4, ice ? 3 : 4); if (ice && c % 3 === 0) { g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x + 3, ty + 5, 5, 1.5); } }
        }
      }
      // szél
      const wv = windAt(S.cam + SH / 2, G.t);
      if (ZONES[zi(S.cam + SH / 2)].wind) {
        g.strokeStyle = `rgba(230,220,255,${.12 + Math.abs(wv) / WIND * .25})`; g.lineWidth = 1.5;
        for (let i = 0; i < 34; i++) { const yy = S.cam + ((i * 53) % SH), xx = (((i * 97 + S.wo) % (WW + 60)) + WW + 60) % (WW + 60) - 30, l = 8 + Math.abs(wv) / WIND * 26;
          g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx - Math.sign(wv || 1) * l, yy); g.stroke(); }
      }
      // cél: Arany Locsolófej
      if (GOAL.y > y0 - 80 && GOAL.y < y1 + 80) {
        const cx = GOAL.x, cy = GOAL.y;
        g.fillStyle = '#c99a45'; g.fillRect(cx - 3, cy - 26, 6, 26);
        const gl = g.createRadialGradient(cx, cy - 32, 0, cx, cy - 32, 40); gl.addColorStop(0, 'rgba(255,215,120,.55)'); gl.addColorStop(1, 'rgba(255,215,120,0)'); g.fillStyle = gl; g.fillRect(cx - 40, cy - 72, 80, 80);
        g.save(); g.translate(cx, cy - 32); g.rotate(t * 3); g.fillStyle = '#ffd77a'; rr(-12, -3, 24, 6, 3); g.fill(); g.restore();
        g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(cx, cy - 32, 4, 0, 6.283); g.fill();
        for (let i = 0; i < 16; i++) { const k = (t * .9 + i / 16) % 1, a = i / 16 * 6.283 + t; g.fillStyle = `rgba(150,215,255,${1 - k})`; g.beginPath(); g.arc(cx + Math.cos(a) * 46 * k, cy - 32 - Math.sin(k * Math.PI) * 20 + k * 20 * Math.abs(Math.sin(a)), 1.8, 0, 6.283); g.fill(); }
      }
      // játékos
      const k = S.c / CHMAX, sqx = p.ground ? 1 + .22 * k : 1 - Math.min(.15, Math.abs(p.vy) / 4000), sqy = p.ground ? 1 - .3 * k - (S.stun > 0 ? .25 : 0) : 1 + Math.min(.2, Math.abs(p.vy) / 3000);
      g.save(); g.translate(p.x + PW / 2, p.y + PH); g.scale(sqx * p.face, sqy);
      g.fillStyle = 'rgba(0,0,0,.3)'; if (p.ground) { g.beginPath(); g.ellipse(0, 0, 9, 2.2, 0, 0, 6.283); g.fill(); }
      const st = p.ground && Math.abs(p.vx) > 1 ? Math.sin(S.walkT * 18) * 2 : 0;
      g.fillStyle = '#1d3b66'; g.fillRect(-6, -6, 5, 6 + st * .3); g.fillRect(1, -6, 5, 6 - st * .3);
      g.fillStyle = '#2f8fe0'; rr(-7, -14, 14, 9, 3); g.fill();
      g.fillStyle = '#e8b656'; g.fillRect(-5, -12, 2, 6); g.fillRect(3, -12, 2, 6);
      g.fillStyle = '#f1c9a0'; rr(-6, -20, 12, 8, 3); g.fill();
      g.fillStyle = '#e8b656'; g.beginPath(); g.arc(0, -19, 7, Math.PI, 0); g.fill(); g.fillRect(0, -20, 9, 2);
      g.fillStyle = '#10141c'; if (S.stun > 0) { g.fillRect(-1, -17, 3, 1); g.fillRect(3, -17, 3, 1); } else { g.fillRect(0, -18, 2, 2); g.fillRect(3.5, -18, 2, 2); }
      g.restore();
      // töltés-csík + irány
      if (S.c > 0) {
        const bx = p.x + PW / 2 - 13, by = p.y - 14;
        g.fillStyle = 'rgba(0,0,0,.55)'; rr(bx - 1, by - 13, 28, 6, 3); g.fill();
        g.fillStyle = k > .85 ? '#ff5a4d' : k > .5 ? '#ffc34d' : '#6cc6ff'; rr(bx, by - 12, 26 * k, 4, 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,.85)'; g.save(); g.translate(p.x + PW / 2, by - 22); g.rotate(S.aim * .6);
        g.beginPath(); g.moveTo(0, -5); g.lineTo(4, 1); g.lineTo(-4, 1); g.closePath(); g.fill(); g.restore();
      }
      g.restore();
      // HUD
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `600 ${13 * d}px Inter, sans-serif`; g.fillStyle = 'rgba(255,255,255,.75)';
      g.fillText(`${Math.max(0, Math.floor(-(p.y + PH) / 10))} M  ·  ⏱ ${fmtT(G.t)}  ·  ESÉS ${S.falls}`, G.W / 2, 74 * d);
      g.font = `600 ${10 * d}px Inter, sans-serif`; g.fillStyle = 'rgba(232,182,86,.55)'; g.fillText('A ZEROSITES TÁMOGATÁSÁVAL', G.W / 2, G.H - 12 * d);
      if (S.banner) { const a = Math.min(1, S.banner.l * 1.5); g.font = `900 ${Math.min(40, G.W / d / 14) * d}px Cinzel, serif`;
        g.fillStyle = `rgba(255,226,154,${a})`; g.strokeStyle = `rgba(0,0,0,${a * .5})`; g.lineWidth = 5 * d; g.strokeText(S.banner.t, G.W / 2, G.H * .3); g.fillText(S.banner.t, G.W / 2, G.H * .3); }
      if (touchUI && G.running) for (const b of btns(G)) {
        const on = has(b.id); g.fillStyle = on ? 'rgba(232,182,86,.35)' : 'rgba(4,7,14,.45)'; g.strokeStyle = 'rgba(232,182,86,.5)'; g.lineWidth = 2 * d;
        g.beginPath(); g.arc(b.x, b.y, b.r, 0, 6.283); g.fill(); g.stroke();
        g.fillStyle = '#ffe29a'; g.save(); g.translate(b.x, b.y); g.rotate(b.id === 'L' ? -Math.PI / 2 : b.id === 'R' ? Math.PI / 2 : 0); const s = b.r * .38;
        g.beginPath(); g.moveTo(0, -s); g.lineTo(s * .9, s * .6); g.lineTo(-s * .9, s * .6); g.closePath(); g.fill(); g.restore();
      }
    }
  };
})();

/* =================== GAME 6: Öntöző Birodalom – idle kertépítő =================== */
