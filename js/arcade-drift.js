/* HGWS Arcade – Drift Király: felülnézetes drift-verseny (klasszikus szkript, az arcade.html tölti be) */
window.HGDrift = function (env) {
  'use strict';
  const { G, Sfx, rr, store, hud } = env;
  const WW = 4800, WH = 3200, LAPS = 3, GS = 1 / 15, HK = 260;
  const LSK = 'hgws_drift_';
  const ls = { get(k, d) { try { const v = localStorage.getItem(LSK + k); return v ? JSON.parse(v) : d; } catch (_) { return d; } }, set(k, v) { try { localStorage.setItem(LSK + k, JSON.stringify(v)); } catch (_) {} } };

  /* ---------------- autók ---------------- */
  const CARS = {
    utcai: { n: 'Utcai', col: '#2f8fe0', c2: '#1b5c99', len: 34, w: 17, acc: 520, top: 560, grip: 7.5, slide: .42, turn: 3.2, off: 1, mu: 640, eng: 430, cg: .53, B: 9, steer: .55, I: 1.1 },
    izom: { n: 'Izomautó', col: '#e5533d', c2: '#8f2a1d', len: 38, w: 19, acc: 610, top: 600, grip: 5.6, slide: .3, turn: 2.9, off: .9, stripe: '#fff', mu: 590, eng: 540, cg: .52, B: 8, steer: .55, I: 1.25 },
    rally: { n: 'Rally', col: '#f2f2f2', c2: '#9aa3ad', len: 33, w: 17, acc: 570, top: 540, grip: 8, slide: .45, turn: 3.4, off: 1.8, stripe: '#2f8fe0', mu: 660, eng: 480, cg: .54, B: 10, steer: .6, I: 1, awd: .4 },
    gokart: { n: 'Gokart', col: '#6fcf6a', c2: '#2f7d32', len: 26, w: 16, acc: 660, top: 470, grip: 10, slide: .55, turn: 4, off: .8, kart: 1, mu: 780, eng: 500, cg: .5, B: 12, steer: .5, I: .8 },
    szuper: { n: 'Szuperautó', col: '#ffcf2e', c2: '#b88a00', len: 36, w: 18, acc: 650, top: 700, grip: 7, slide: .38, turn: 3, off: .7, wing: 1, mu: 720, eng: 580, cg: .5, B: 11, steer: .5, I: 1.05 }
  };
  const CK = Object.keys(CARS);

  /* ---------------- pályák ---------------- */
  const SURF = {
    city: { road: '#3b3f46', edge: '#c9ced6', off: '#8d939b', ground: ['#2b3038', '#343a43'], drag: .7, grip: .85 },
    country: { road: '#4a4a4a', edge: '#f2f2f2', off: '#6f5a3a', ground: ['#4f8a3a', '#5d9a44'], drag: 1.9, grip: .55 },
    mountain: { road: '#45474a', edge: '#f0f0f0', off: '#7b7466', ground: ['#556b3b', '#6b7b45'], drag: 2.3, grip: .5 },
    snow: { road: '#6b7480', edge: '#ffffff', off: '#dfe8f0', ground: ['#e9f0f6', '#d5e2ec'], drag: 2.6, grip: .35, ice: .55 },
    desert: { road: '#5a4e44', edge: '#f5e6c4', off: '#d9b779', ground: ['#e3c48a', '#d4b073'], drag: 2, grip: .5 }
  };
  // loop: körpálya (LAPS kör), különben A→B sprint. br: alternatív útvonalak (a/b: a fő útvonal szakaszainak indexe, a felezőpontjuknál ágazik el / csatlakozik vissza)
  const TR = [
    { id: 'belvaros', n: 'Belváros', th: 'city', tod: 'day', r: 120, w: 110, pts: [[300, 500], [1700, 500], [1700, 1400], [3000, 1400], [3000, 500], [4400, 500], [4400, 2200], [3300, 2200], [3300, 2900], [1700, 2900], [1700, 2200], [400, 2200]],
      br: [{ a: 0, b: 2, pts: [[1000, 1000], [2350, 1000]] }, { a: 5, b: 8, pts: [[3800, 1350], [3800, 1750], [2500, 1750]] }] },
    { id: 'neon', n: 'Neon éjszaka', th: 'city', tod: 'night', loop: 1, r: 130, w: 110, pts: [[670, 800], [2000, 800], [2000, 400], [3200, 400], [3200, 1470], [4000, 1470], [4000, 2670], [2530, 2670], [2530, 2000], [1600, 2000], [1600, 2800], [530, 2800], [530, 1870], [1070, 1870], [1070, 1330], [670, 1330]],
      br: [{ a: 4, b: 6, w: 84, pts: [[3600, 2050], [3265, 2050]] }] },
    { id: 'kikoto', n: 'Kikötő', th: 'city', tod: 'dusk', r: 150, w: 110, pts: [[300, 300], [4400, 300], [4400, 900], [800, 900], [800, 1500], [4400, 1500], [4400, 2300], [3000, 2300], [3000, 2900], [300, 2900]],
      br: [{ a: 2, b: 4, w: 80, dirt: 1, pts: [] }, { a: 6, b: 8, pts: [[3700, 2600], [1650, 2600]] }] },
    { id: 'csillag', n: 'Csillag', th: 'desert', tod: 'day', loop: 1, r: 130, w: 110, pts: Array.from({ length: 10 }, (_, k) => { const a = -Math.PI / 2 + k * Math.PI / 5, R = k & 1 ? 640 : 1450; return [2400 + Math.cos(a) * R * 1.25, 1650 + Math.sin(a) * R]; }) },
    { id: 'kigyo', n: 'Kígyó', th: 'country', tod: 'dusk', loop: 1, r: 260, w: 105, pts: [[600, 1600], [900, 600], [1500, 1100], [2100, 500], [2700, 1100], [3300, 500], [4200, 700], [4300, 1600], [3900, 2700], [3300, 2100], [2700, 2700], [2100, 2100], [1500, 2700], [900, 2600]],
      br: [{ a: 3, b: 10, dirt: 1, w: 90, pts: [[2400, 1600], [3000, 1600]] }] },
    { id: 'szoloheggy', n: 'Szőlőhegy', th: 'country', tod: 'day', r: 300, w: 105, pts: [[300, 2800], [1000, 2000], [600, 1200], [1300, 500], [2300, 900], [2100, 1800], [3000, 2600], [3900, 2200], [3600, 1300], [4500, 500]],
      br: [{ a: 0, b: 2, dirt: 1, w: 90, pts: [[200, 1600]] }, { a: 4, b: 7, pts: [[3000, 1350]] }] },
    { id: 'erdei', n: 'Erdei ösvény', th: 'country', tod: 'night', r: 280, w: 100, pts: [[300, 600], [1300, 300], [2000, 1000], [1500, 1800], [2300, 2600], [3300, 2200], [3000, 1300], [3800, 700], [4500, 1400], [4300, 2800]],
      br: [{ a: 1, b: 3, dirt: 1, w: 90, pts: [[900, 1400], [1100, 2300]] }, { a: 5, b: 8, pts: [[3900, 2400]] }] },
    { id: 'nyolcas', n: 'Jeges nyolcas', th: 'snow', tod: 'day', loop: 1, r: 300, w: 110, pts: [[700, 1600], [1300, 700], [2000, 700], [2800, 2500], [3500, 2500], [4100, 1600], [3500, 700], [2800, 700], [2000, 2500], [1300, 2500]] },
    { id: 'szerpentin', n: 'Szerpentin', th: 'mountain', tod: 'day', r: 180, w: 100, hills: [[2400, 600, 1500, 1]], pts: [[300, 3000], [1600, 3000], [4400, 2800], [2600, 2450], [4400, 2050], [2600, 1700], [4200, 1300], [2700, 1050], [2400, 500]],
      br: [{ a: 1, b: 5, dirt: 1, w: 90, pts: [[1500, 2300], [1700, 1500]] }] },
    { id: 'csucstamadas', n: 'Csúcstámadás', th: 'mountain', tod: 'dusk', r: 180, w: 100, hills: [[3800, 500, 1400, 1], [1000, 900, 800, .4]], pts: [[300, 2900], [2000, 2950], [900, 2350], [2800, 2300], [1500, 1750], [3400, 1700], [2400, 1200], [4100, 1200], [3800, 400]],
      br: [{ a: 1, b: 3, pts: [[3300, 2700]] }, { a: 5, b: 7, dirt: 1, w: 90, pts: [[4400, 1500]] }] },
    { id: 'teli', n: 'Téli hágó', th: 'snow', tod: 'day', r: 180, w: 105, hills: [[2400, 2600, 1500, 1]], pts: [[2400, 2700], [2700, 2150], [4400, 2350], [2600, 1750], [4300, 1400], [2400, 1100], [700, 1500], [2200, 900], [400, 400], [4500, 300]],
      br: [{ a: 5, b: 7, dirt: 1, w: 90, pts: [] }] },
    { id: 'sivatag', n: 'Sivatagi rali', th: 'desert', tod: 'dusk', r: 320, w: 110, pts: [[300, 1600], [1100, 600], [2000, 1300], [2700, 400], [3700, 900], [3300, 1800], [4400, 2300], [3200, 2900], [2000, 2300], [900, 2900]],
      br: [{ a: 1, b: 4, dirt: 1, w: 95, pts: [[2400, 2000]] }, { a: 5, b: 8, dirt: 1, w: 95, pts: [[2600, 1900]] }] }
  ];
  const TOD = { day: '☀️', dusk: '🌆', night: '🌙' };

  function fillet(pts, R, loop) {
    const out = [], n = pts.length, corners = [];
    for (let i = 0; i < n; i++) {
      if (!loop && (i === 0 || i === n - 1)) { corners.push(null); continue; }
      const P = pts[i], A = pts[(i - 1 + n) % n], B = pts[(i + 1) % n];
      let ux = A[0] - P[0], uy = A[1] - P[1], vx = B[0] - P[0], vy = B[1] - P[1]; const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy); ux /= lu; uy /= lu; vx /= lv; vy /= lv;
      const th = Math.acos(Math.max(-1, Math.min(1, ux * vx + uy * vy)));
      if (th > 3.1) { corners.push({ t1: P, t2: P, c: P, r: 0 }); continue; }
      let r = R, t = r / Math.tan(th / 2); const tm = Math.min(lu, lv) * .48; if (t > tm) { t = tm; r = t * Math.tan(th / 2); }
      const bx = ux + vx, by = uy + vy, bl = Math.hypot(bx, by) || 1, dc = r / Math.sin(th / 2);
      corners.push({ t1: [P[0] + ux * t, P[1] + uy * t], t2: [P[0] + vx * t, P[1] + vy * t], c: [P[0] + bx / bl * dc, P[1] + by / bl * dc], r });
    }
    const add = (x, y) => { const l = out[out.length - 1]; if (!l || Math.hypot(x - l[0], y - l[1]) > 1) out.push([x, y]); };
    const line = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.round(L / 8)); for (let j = 1; j <= k; j++) add(a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k); };
    const arc = C => { if (!C.r) { add(C.c[0], C.c[1]); return; } let a1 = Math.atan2(C.t1[1] - C.c[1], C.t1[0] - C.c[0]), a2 = Math.atan2(C.t2[1] - C.c[1], C.t2[0] - C.c[0]), da = a2 - a1;
      while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      const k = Math.max(2, Math.ceil(Math.abs(da) * C.r / 8)); for (let j = 0; j <= k; j++) add(C.c[0] + Math.cos(a1 + da * j / k) * C.r, C.c[1] + Math.sin(a1 + da * j / k) * C.r); };
    if (!loop) { add(pts[0][0], pts[0][1]); for (let i = 1; i < n; i++) { const C = corners[i]; line(out[out.length - 1], C ? C.t1 : pts[i]); if (C) arc(C); } return out; }
    let s0 = 0, e0 = 0;
    for (let i = 0; i < n; i++) { arc(corners[i]); if (!i) s0 = out.length; line(corners[i].t2, corners[(i + 1) % n].t1); if (!i) e0 = out.length; }
    const mid = Math.floor((s0 + e0) / 2);
    return out.slice(mid).concat(out.slice(0, mid));
  }
  function rng(s) { return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const hash = s => { let h = 7; for (const c of s) h = h * 31 + c.charCodeAt(0) | 0; return h; };
  const plen = (raw, loop) => { let L = 0; for (let i = 1; i < raw.length; i++) L += Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]); if (loop) L += Math.hypot(raw[0][0] - raw[raw.length - 1][0], raw[0][1] - raw[raw.length - 1][1]); return L; };

  // geometria (textúra nélkül): fő útvonal + elágazások, par-idő
  const GEO = {};
  function geo(T) {
    if (GEO[T.id]) return GEO[T.id];
    const RW = 1.4, main = fillet(T.pts, T.r, T.loop), mlen = plen(main, T.loop), paths = [{ raw: main, w: T.w * RW, dirt: 0, main: 1 }];
    const mid = i => { const a = T.pts[i % T.pts.length], b = T.pts[(i + 1) % T.pts.length]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
    for (const br of T.br || []) paths.push({ raw: fillet([mid(br.a), ...br.pts, mid(br.b)], br.r || Math.min(T.r, 200), false), w: (br.w || T.w) * RW, dirt: br.dirt || 0 });
    const par = Math.round((T.loop ? LAPS : 1) * mlen / 410 * 1000);
    return GEO[T.id] = { paths, mlen, par };
  }

  const BUILT = {};
  function build(T) {
    if (BUILT[T.id]) return BUILT[T.id];
    const GE = geo(T), loop = !!T.loop;
    const hf = T.hills ? (x, y) => { let h = 0; for (const [hx, hy, hr, ha] of T.hills) h += ha * Math.exp(-((x - hx) ** 2 + (y - hy) ** 2) / (2 * hr * hr * .55)); return Math.max(0, Math.min(1, h + .04 * Math.sin(x * .004) * Math.cos(y * .005))); } : () => 0;
    // minták: fő útvonal progresszió 0..1, elágazásnál a csatlakozási pontok közt
    const P = [], main = GE.paths[0].raw, nm = main.length;
    const pathSamples = (raw, pi, w, dirt, p0, p1, isLoop) => { const n = raw.length, L = plen(raw, isLoop); let s = 0;
      for (let i = 0; i < n; i++) { const a = raw[Math.max(0, i - 1)], b = raw[Math.min(n - 1, i + 1)], A = isLoop ? raw[(i - 1 + n) % n] : a, Bp = isLoop ? raw[(i + 1) % n] : b, tx = Bp[0] - A[0], ty = Bp[1] - A[1], tl = Math.hypot(tx, ty) || 1;
        if (i) s += Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]);
        let pr = p0 + (p1 - p0) * s / L; if (loop) pr = ((pr % 1) + 1) % 1;
        P.push({ x: raw[i][0], y: raw[i][1], tx: tx / tl, ty: ty / tl, prog: pr, h: hf(raw[i][0], raw[i][1]), pi, hw: w / 2, dirt }); } };
    pathSamples(main, 0, GE.paths[0].w, 0, 0, 1, loop);
    const mprog = (x, y) => { let b = 1e18, bp = 0; for (let i = 0; i < nm; i++) { const d = (P[i].x - x) ** 2 + (P[i].y - y) ** 2; if (d < b) { b = d; bp = P[i].prog; } } return bp; };
    GE.paths.slice(1).forEach((pa, k) => { const r = pa.raw, p0 = mprog(...r[0]); let p1 = mprog(...r[r.length - 1]); if (loop && p1 < p0) p1 += 1; pathSamples(r, k + 1, pa.w, pa.dirt, p0, p1, false); });
    const n = P.length, CELL = 128, grid = new Map();
    P.forEach((p, i) => { const k = Math.floor(p.x / CELL) + ',' + Math.floor(p.y / CELL); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
    const R = rng(hash(T.id)), hw = GE.paths[0].w / 2, obs = [], deco = [], lamps = [];
    const near = (x, y, m) => { const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), rr2 = Math.ceil(m / CELL); for (let a = -rr2; a <= rr2; a++) for (let b = -rr2; b <= rr2; b++) { const l = grid.get((cx + a) + ',' + (cy + b)); if (l) for (const i of l) if ((P[i].x - x) ** 2 + (P[i].y - y) ** 2 < (m + P[i].hw - hw) ** 2) return true; } return false; };
    const S = SURF[T.th];
    if (T.th === 'city') {
      for (let gx = 0; gx < WW; gx += 170) for (let gy = 0; gy < WH; gy += 170) {
        const w = 90 + R() * 60, h = 90 + R() * 60, x = gx + 10 + R() * (160 - w), y = gy + 10 + R() * (160 - h);
        let ok = true; for (const [px, py] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h], [x + w / 2, y + h / 2], [x + w / 2, y], [x + w / 2, y + h], [x, y + h / 2], [x + w, y + h / 2]]) if (near(px, py, hw + 38)) { ok = false; break; }
        if (ok && R() < .9) obs.push({ k: 'b', x, y, w, h, col: ['#5c6470', '#6f6a63', '#4c5866', '#7a7064', '#59606a', '#69737f'][Math.floor(R() * 6)], ht: 40 + R() * 100, rf: R(), win: Math.floor(R() * 1e6) });
      }
      for (let i = 0; i < n; i += 26) { const p = P[i], sd = (i / 26) & 1 ? 1 : -1; lamps.push({ x: p.x - p.ty * (p.hw + 22) * sd, y: p.y + p.tx * (p.hw + 22) * sd }); }
    } else {
      const cnt = T.th === 'desert' ? 130 : T.th === 'country' ? 520 : 420;
      for (let j = 0; j < cnt * 3 && obs.length < cnt; j++) { const x = R() * WW, y = R() * WH; if (near(x, y, hw + 30 + R() * 40)) continue;
        const k = T.th === 'desert' ? (R() < .6 ? 'cactus' : 'rock') : T.th === 'country' ? (R() < .85 ? 'tree' : 'bush') : (R() < .8 ? 'pine' : 'rock');
        obs.push({ k, x, y, r: k === 'rock' ? 10 + R() * 14 : k === 'bush' ? 9 + R() * 6 : k === 'cactus' ? 8 + R() * 4 : 13 + R() * 12, s: R() }); }
      if (T.th === 'country') for (let j = 0; j < 60; j++) { const x = R() * WW, y = R() * WH; if (!near(x, y, hw + 40)) deco.push({ k: 'bale', x, y, a: R() * 3 }); }
      if (T.tod === 'night') for (let i = 0; i < n; i += 40) { const p = P[i], sd = (i / 40) & 1 ? 1 : -1; lamps.push({ x: p.x - p.ty * (p.hw + 20) * sd, y: p.y + p.tx * (p.hw + 20) * sd }); }
    }
    // talaj előrenderelés (fél felbontás)
    const sc = .5, cv = document.createElement('canvas'); cv.width = WW * sc; cv.height = WH * sc; const g = cv.getContext('2d'); g.scale(sc, sc);
    g.fillStyle = S.ground[0]; g.fillRect(0, 0, WW, WH);
    if (T.hills) {
      const step = 8, img = g.createImageData(WW / step, WH / step), D = img.data, snow = T.th === 'snow';
      for (let y = 0; y < WH / step; y++) for (let x = 0; x < WW / step; x++) {
        const wx = x * step, wy = y * step, h = hf(wx, wy), gx = hf(wx + 8, wy) - h, gy = hf(wx, wy + 8) - h, sh = Math.max(.45, Math.min(1.35, 1 + (gx + gy) * 60));
        const cols = snow ? [[180, 196, 210], [215, 226, 236], [240, 245, 250]] : [[74, 104, 52], [112, 120, 72], [150, 140, 120], [220, 220, 214]];
        const f = h * (cols.length - 1), i0 = Math.floor(f), k = f - i0, c0 = cols[i0], c1 = cols[Math.min(cols.length - 1, i0 + 1)];
        let r = (c0[0] + (c1[0] - c0[0]) * k) * sh, gg = (c0[1] + (c1[1] - c0[1]) * k) * sh, b = (c0[2] + (c1[2] - c0[2]) * k) * sh;
        const fr = (h * 14) % 1, gm = Math.hypot(gx, gy) * 14 + 1e-6; if (Math.min(fr, 1 - fr) / gm < .6) { r *= .84; gg *= .84; b *= .84; }
        const o = (y * WW / step + x) * 4; D[o] = r; D[o + 1] = gg; D[o + 2] = b; D[o + 3] = 255;
      }
      const tc = document.createElement('canvas'); tc.width = WW / step; tc.height = WH / step; tc.getContext('2d').putImageData(img, 0, 0);
      g.imageSmoothingEnabled = true; g.drawImage(tc, 0, 0, WW, WH);
    } else {
      for (let j = 0; j < 420; j++) { g.fillStyle = S.ground[j & 1]; g.globalAlpha = .35 + R() * .4; const x = R() * WW, y = R() * WH; g.beginPath(); g.ellipse(x, y, 60 + R() * 200, 40 + R() * 120, R() * 3, 0, 6.283); g.fill(); }
      g.globalAlpha = 1;
      if (T.th === 'country') for (let j = 0; j < 36; j++) { const x = R() * WW, y = R() * WH, w = 300 + R() * 400, h = 200 + R() * 300, a = R() * .6 - .3, col = ['#c9b33a', '#8bb04a', '#a8c45a', '#d7c06a', '#e8d14a'][Math.floor(R() * 5)];
        g.save(); g.translate(x, y); g.rotate(a); g.globalAlpha = .55; g.fillStyle = col; g.fillRect(-w / 2, -h / 2, w, h); g.globalAlpha = .25; g.fillStyle = '#3a5a26'; for (let k = -h / 2; k < h / 2; k += 14) g.fillRect(-w / 2, k, w, 5); g.restore(); }
      if (T.th === 'city') { g.fillStyle = '#272b31'; for (let x = 0; x < WW; x += 170) g.fillRect(x, 0, 3, WH); for (let y = 0; y < WH; y += 170) g.fillRect(0, y, WW, 3); }
      if (T.th === 'desert') { g.strokeStyle = 'rgba(160,120,60,.25)'; g.lineWidth = 6; for (let j = 0; j < 120; j++) { const x = R() * WW, y = R() * WH; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 80, y - 30, x + 160, y + 30, x + 240, y); g.stroke(); } }
      if (T.th === 'snow') { g.fillStyle = 'rgba(160,190,215,.25)'; for (let j = 0; j < 120; j++) { g.beginPath(); g.ellipse(R() * WW, R() * WH, 30 + R() * 90, 8 + R() * 20, R() * 3, 0, 6.283); g.fill(); } }
    }
    for (const d of deco) { g.save(); g.translate(d.x, d.y); g.rotate(d.a); g.fillStyle = '#d8b34a'; g.beginPath(); g.ellipse(0, 0, 16, 11, 0, 0, 6.283); g.fill(); g.strokeStyle = '#a8862a'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, 9, 6, 0, 0, 6.283); g.stroke(); g.restore(); }
    const paths = GE.paths.map((pa, k) => { const p2 = new Path2D(); pa.raw.forEach((q, i) => i ? p2.lineTo(q[0], q[1]) : p2.moveTo(q[0], q[1])); if (k === 0 && loop) p2.closePath(); return { p2, hw: pa.w / 2, dirt: pa.dirt, main: !k }; });
    const iStart = loop ? 0 : 12, iFin = loop ? 0 : nm - 14;
    return BUILT[T.id] = { T, P, n, nm, loop, hw, obs, lamps, tex: cv, paths, hf, S, grid, CELL, par: GE.par, iStart, iFin, finProg: P[iFin].prog };
  }
  const pointsFor = (B, ms) => ms ? Math.round(1000 * B.par / ms) : 0;

  /* ---------------- állapot ---------------- */
  let M = null, S = null, B = null, AC = null, touchUI = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const K = {}, TP = new Map();
  let NETG = {}, netGuest = true;
  const sel = ls.get('sel', { t: 0, c1: 'utcai', c2: 'izom', two: 0 });

  if (typeof addEventListener === 'function') {
    addEventListener('keydown', e => { if (!active()) return; K[e.code] = 1; if (/^(Arrow|Space|Numpad)/.test(e.code)) e.preventDefault();
      if (S && (e.code === 'KeyR' || e.code === 'KeyT') && S.phase !== 'over') { if (e.code === 'KeyR') startRace(); else { S = null; silence(); } return; }
      if (S && S.phase === 'race') { if (e.code === 'KeyQ') toggleL(S.cars[0]); if (e.code === 'KeyF') respawn(S.cars[0]); if (S.cars[1]) { if (e.code === 'Slash' || e.code === 'Numpad1') toggleL(S.cars[1]); if (e.code === 'Period' || e.code === 'Numpad2') respawn(S.cars[1]); } }
      if (!S && M && e.code === 'Enter') startRace(); });
    addEventListener('keyup', e => { K[e.code] = 0; });
    addEventListener('blur', () => { for (const k in K) K[k] = 0; TP.clear(); });
    addEventListener('message', e => { if (e.origin !== location.origin || !e.data || e.data.hgws !== 'ghosts') return; NETG = e.data.data || {}; netGuest = !!e.data.guest; });
  }
  const active = () => G.game && G.game.id === 'drift' && G.running;
  function reqGhosts() { if (window.top !== window) parent.postMessage({ hgws: 'ghostreq', tracks: TR.map(t => t.id) }, location.origin); }

  /* ---------------- szellemek ---------------- */
  function enc(arr) { let o = [], p = [0, 0, 0]; for (let i = 0; i < arr.length; i += 3) for (let k = 0; k < 3; k++) { const v = arr[i + k]; o.push((v - p[k]).toString(36)); p[k] = v; } return o.join(','); }
  function dec(s) { if (!s) return null; const a = s.split(','), out = new Float32Array(a.length), p = [0, 0, 0]; for (let i = 0; i < a.length; i++) { const k = i % 3; p[k] += parseInt(a[i], 36); out[i] = k === 2 ? p[k] / 100 : p[k]; } return out; }
  function ghostAt(gd, t) { const f = t / GS, i = Math.floor(f), k = f - i, n = gd.length / 3; if (i >= n - 1) return null; const o = i * 3, q = o + 3;
    let da = gd[q + 2] - gd[o + 2]; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283;
    return { x: gd[o] + (gd[q] - gd[o]) * k, y: gd[o + 1] + (gd[q + 1] - gd[o + 1]) * k, a: gd[o + 2] + da * k }; }
  const bestKey = (t, c) => 'g_' + t + '_' + c;
  const myBestRace = t => { let b = ls.get('r_' + t, 0); const s = (NETG[t] || []).find(r => r.me); if (s && s.rms && (!b || s.rms < b)) b = s.rms; return b; };
  function totalPoints() { let s = 0; for (const T of TR) s += pointsFor(geo(T), myBestRace(T.id)); return s; }

  /* ---------------- hang ---------------- */
  function audio() {
    if (AC) return AC; try { const C = new (window.AudioContext || window.webkitAudioContext)(), mk = () => { const o = C.createOscillator(), g = C.createGain(); g.gain.value = 0; return { o, g }; };
      const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(C.destination);
      const e = [mk(), mk()]; e[0].o.type = 'sawtooth'; e[1].o.type = 'square'; for (const x of e) { x.o.connect(x.g).connect(lp); x.o.start(); }
      const nb = C.createBuffer(1, C.sampleRate, C.sampleRate), ch = nb.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
      const ns = C.createBufferSource(); ns.buffer = nb; ns.loop = true; const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 3; const sg = C.createGain(); sg.gain.value = 0; ns.connect(bp).connect(sg).connect(C.destination); ns.start();
      AC = { C, e, sg }; } catch (_) { AC = null; } return AC;
  }
  function sound(rpm, slip) { if (!AC) return; const mute = store.get('mute', 0), t = AC.C.currentTime;
    AC.e[0].o.frequency.setTargetAtTime(55 + rpm * 140, t, .05); AC.e[1].o.frequency.setTargetAtTime(27 + rpm * 70, t, .05);
    AC.e[0].g.gain.setTargetAtTime(mute ? 0 : .035 + rpm * .03, t, .05); AC.e[1].g.gain.setTargetAtTime(mute ? 0 : .02, t, .05); AC.sg.gain.setTargetAtTime(mute ? 0 : Math.min(.09, slip * .12), t, .04); }
  function silence() { if (AC) sound(0, 0), AC.e.forEach(x => x.g.gain.setTargetAtTime(0, AC.C.currentTime, .05)); }

  /* ---------------- verseny ---------------- */
  function makeCar(ci, k, idx, lane, ctrl) {
    const p = B.P[idx], c = CARS[k];
    return { ci, k, c, ctrl, x: p.x - p.ty * lane * 28, y: p.y + p.tx * lane * 28, vx: 0, vy: 0, a: Math.atan2(p.ty, p.tx), st: 0, ti: idx, lap: 0, cp: 0, pr: p.prog, laps: [], lapT0: 0, done: 0, light: B.T.tod !== 'day', drift: 0, dTime: 0, dCalm: 0, dTotal: 0, rec: [], recT: 0, skid: 0, brake: 0, z: 0, last: idx, prog: 0 };
  }
  function startRace() {
    const T = TR[sel.t]; B = build(T); ls.set('sel', sel);
    const st = B.loop ? B.nm - 12 : B.iStart, cars = [makeCar(0, sel.c1, st, sel.two ? -1 : 0, 1)];
    if (sel.two) cars.push(makeCar(1, sel.c2, st - 7, 1, 2));
    const ghosts = [];
    const glist = (NETG[T.id] || []).filter(r => r.p && r.ms).sort((a, b) => a.ms - b.ms);
    glist.filter(r => !r.me).slice(0, 3).forEach((r, i) => { const d = dec(r.p); if (d) ghosts.push({ d, k: CARS[r.car] ? r.car : 'utcai', name: r.name + ' · ' + fmtT(r.ms), col: ['#ffd84a', '#c0c0c0', '#cd7f32'][i] }); });
    for (const ck of CK) { const own = ls.get(bestKey(T.id, ck), null); if (own) { const d = dec(own.p); if (d) ghosts.push({ d, k: ck, name: (ck === sel.c1 ? 'Te' : 'Te · ' + CARS[ck].n) + ' · ' + fmtT(own.ms), col: '#9fe0ff', own: 1 }); } }
    S = { phase: 'race', t: 0, cars, ghosts, skids: [], smoke: [], cam: { x: cars[0].x, y: cars[0].y, z: 1 }, msg: [], end: 0, res: null };
    audio(); if (AC && AC.C.state === 'suspended') AC.C.resume();
    G.score = 0; hud();
  }
  function toggleL(c) { c.light = !c.light; Sfx.blip(c.light ? 880 : 440, .04, 'square', .04); }
  function respawn(c) { const p = B.P[c.ti]; c.x = p.x; c.y = p.y; c.vx = c.vy = 0; c.w = 0; c.a = Math.atan2(p.ty, p.tx); c.drift = 0; c.dTime = 0; }
  function nearest(c) {
    const cx = Math.floor(c.x / B.CELL), cy = Math.floor(c.y / B.CELL), P = B.P;
    let best = 1e18, bi = -1, on = -1, onD = 1e18;
    for (let R = 1; R <= 4 && bi < 0; R += 3) for (let a = -R; a <= R; a++) for (let b = -R; b <= R; b++) { const l = B.grid.get((cx + a) + ',' + (cy + b)); if (!l) continue;
      for (const i of l) { const p = P[i], d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2; if (d < best) { best = d; bi = i; }
        if (d < onD && d < (p.hw + 40) ** 2) { let dp = Math.abs(p.prog - c.pr); if (B.loop) dp = Math.min(dp, 1 - dp); if (dp < .06) { onD = d; on = i; } } } }
    if (bi < 0) { for (let i = 0; i < P.length; i += 3) { const d = (P[i].x - c.x) ** 2 + (P[i].y - c.y) ** 2; if (d < best) { best = d; bi = i; } } }
    const i = on >= 0 ? on : bi; return [i, Math.sqrt((P[i].x - c.x) ** 2 + (P[i].y - c.y) ** 2)];
  }
  function inputs(c) {
    if (c.ctrl === 1) { const two = S.cars.length > 1;
      let l = K.KeyA || (!two && K.ArrowLeft), r = K.KeyD || (!two && K.ArrowRight), u = K.KeyW || (!two && K.ArrowUp), d = K.KeyS || (!two && K.ArrowDown), hb = K.Space;
      if (touchUI) { for (const v of TP.values()) { if (v === 'L') l = 1; if (v === 'R') r = 1; if (v === 'G') u = 1; if (v === 'B') d = 1; if (v === 'H') hb = 1; } }
      return { s: (r ? 1 : 0) - (l ? 1 : 0), thr: !!u, brk: !!d, hb: !!hb }; }
    return { s: (K.ArrowRight ? 1 : 0) - (K.ArrowLeft ? 1 : 0), thr: !!K.ArrowUp, brk: !!K.ArrowDown, hb: !!(K.ShiftRight || K.Numpad0 || K.ControlRight) };
  }
  // jármű-dinamika: kéttengelyes (bicikli) modell, kúszási szög alapú gumierő telítődéssel, tapadási kör a hajtott tengelyen,
  // tengelyterhelés-áthelyeződés, perdület (tehetetlenségi nyomaték) – innen jön a túlkormányzás és a drift
  const tire = (al, N, Bk) => -N * Math.sin(1.38 * Math.atan(Bk * al));
  function physics(c, h, inp) {
    const C = c.c;
    const [ti, dist] = nearest(c), sp0 = B.P[ti]; c.ti = ti; const off = dist > sp0.hw + 4, Sf = B.S, dirt = !off && sp0.dirt;
    const gf = off ? Sf.grip * Math.min(1.6, C.off) * 1.15 : dirt ? .7 * Math.min(1.4, C.off) * (Sf.ice || 1) : (Sf.ice || 1), drag = off ? Sf.drag / Math.min(1.8, C.off) : dirt ? .3 / Math.min(1.8, C.off) : 0;
    let ca = Math.cos(c.a), sa = Math.sin(c.a), vx = c.vx * ca + c.vy * sa, vy = -c.vx * sa + c.vy * ca, w = c.w || 0;
    const L = C.len * .62, a = L * C.cg, b = L - a, G = C.mu * gf, dir = vx >= 0 ? 1 : -1, avx = Math.max(Math.abs(vx), 100);
    // kormány: simított bemenet; ha nem kormányzol, enyhe automatikus ellenkormány (kerék-visszatérítés)
    const beta = Math.atan2(vy, Math.max(Math.abs(vx), 1));
    // drift mód: csak a SZÓKÖZ lenyomásakor indul; ha az autó kiegyenesedett, véget ér – újra le kell nyomni
    const hbEdge = inp.hb && !c.hbPrev; c.hbPrev = inp.hb;
    if (hbEdge && Math.abs(vx) > 90 && S.phase === 'race' && !c.done) { c.dm = 1; c.dmT = 0; c.dmCalm = 0; if (inp.s) w += inp.s * Math.min(1.1, Math.abs(vx) / 380) * dir; }
    if (c.dm) { c.dmT += h; if (c.dmT > .8 && Math.abs(beta) < .06) c.dmCalm += h; else c.dmCalm = 0; if (c.dmCalm > .3 || Math.abs(vx) < 70 || c.done) c.dm = 0; }
    // ellenkormány: a forgással ellentétes kormány driftben gyorsan és erősen hat – könnyű korrigálni
    const cs = c.dm && inp.s && inp.s * w * dir < 0;
    let target = inp.s; if (!inp.s && c.dm && Math.abs(vx) > 60 && Math.abs(beta) > .08) target = Math.max(-1, Math.min(1, beta / C.steer * 1.2)) * .6;
    c.st += (target - c.st) * Math.min(1, h * (cs ? 7 : inp.s ? (c.dm ? 3 : 7) : 5));
    const delta = (c.st * C.steer / (1 + Math.abs(vx) / 85) * (c.dm && !cs ? .5 : 1) + (c.st * beta > 0 ? Math.sign(c.st) * Math.min(cs ? .4 : .25, Math.abs(beta)) * Math.abs(c.st) : 0)) * dir;
    // hosszirányú erők
    let Fd = 0, Fb = 0;
    if (S.phase === 'race' && !c.done) {
      if (inp.thr) { const tp = C.top * (off ? .75 : 1); Fd = C.eng * Math.min(1, 170 / Math.max(1, vx)) * Math.max(0, 1 - (Math.max(0, vx) / tp) ** 2); }
      if (inp.brk) { if (vx > 20) Fb = -1100; else if (vx > -150) Fd = -260; }
    } else if (c.done) Fb = -dir * 300;
    const Fres = -vx * (.06 + drag) - .00015 * vx * Math.abs(vx);
    // terhelés-áthelyeződés
    const wt = Math.max(-.3 * G, Math.min(.3 * G, (c.ax || 0) * .11));
    const Nf = Math.max(.15 * G, G * b / L - wt), Nr = Math.max(.15 * G, G * a / L + wt);
    const fr = C.awd || 0;
    let FxF = Fd * fr + Fb * .6, FxR = Fd * (1 - fr) + Fb * .4;
    const kick = c.dm && inp.hb && c.dmT < .45, muF = Nf, muR = Nr * (kick ? .38 : c.dm && inp.hb ? .7 : 1);
    if (c.dm && inp.hb) FxR += -dir * Math.min(Math.abs(vx) * 2, .02 * G);
    FxF = Math.max(-muF, Math.min(muF * .7, FxF)); FxR = Math.max(-muR, Math.min(muR * (c.dm ? 1 : .55), FxR));
    // driftben gázzal pörög a hátsó kerék – a far kint marad; gáz nélkül visszatapad
    let latR = Math.sqrt(Math.max(0, muR * muR - FxR * FxR)); if (c.dm && inp.thr && !kick && !cs && vx > 100 && fr < .5) { FxR = Math.max(FxR, Math.min(C.eng * Math.max(0, 1 - (vx / C.top) ** 2), muR * .58)); latR = muR * .66; }
    // oldalerők (tapadási kör: a hosszirányú erő elveszi az oldaltapadást – gázzal kicsúszik a far)
    const aF = Math.atan2(vy + w * a, avx) - delta, aR = Math.atan2(vy - w * b, avx);
    const FyF = tire(aF, Math.sqrt(Math.max(0, muF * muF - FxF * FxF)), C.B), FyR = tire(aR, latR, C.B);
    const cd = Math.cos(delta), sd = Math.sin(delta);
    const Fx = FxR + FxF * cd - FyF * sd + Fres, Fy = FyR + FxF * sd + FyF * cd, tq = a * (FyF * cd + FxF * sd) - b * FyR;
    vx += (Fx + w * vy) * h; vy += (Fy - w * vx) * h; w += tq / (C.I * a * b * (c.dm ? 3 : 2.6)) * h; w *= 1 - (cs ? 2.6 : c.dm ? 1.9 : 1) * h; if (cs) w += inp.s * dir * 1.2 * h;
    // driftszög-határoló (játszhatóság): 40° fölött a perdület és az oldalsebesség visszafogva – kipörgés helyett tartható drift
    { const bb = Math.atan2(vy, Math.max(1, Math.abs(vx))), ex = Math.abs(bb) - .5; if (ex > 0 && Math.abs(vx) > 80) { if (w * bb < 0) w -= Math.sign(w) * Math.min(Math.abs(w), ex * 14 * h * 10); vy *= 1 - Math.min(.5, ex * 3 * h * 10); } }
    // kis sebességnél kinematikus kormányzás (nincs csúszás)
    if (Math.abs(vx) < 80) { const k = Math.abs(vx) / 80; w = w * k + (vx * Math.tan(delta) / L) * (1 - k); vy *= 1 - (1 - k) * Math.min(1, h * 12); }
    if (B.T.hills) { const gx = (B.hf(c.x + 6, c.y) - B.hf(c.x - 6, c.y)) / 12, gy = (B.hf(c.x, c.y + 6) - B.hf(c.x, c.y - 6)) / 12, k = HK * 260 * h; vx -= (gx * ca + gy * sa) * k; vy -= (-gx * sa + gy * ca) * k; c.z = B.hf(c.x, c.y); }
    c.ax = Fx; c.w = w; c.aR = Math.abs(aR); c.a += w * h; ca = Math.cos(c.a); sa = Math.sin(c.a);
    c.vx = ca * vx - sa * vy; c.vy = sa * vx + ca * vy;
    c.x += c.vx * h; c.y += c.vy * h;
    c.slip = Math.min(1.5, Math.abs(Math.atan2(vy, Math.max(1, Math.abs(vx))))); c.spd = Math.hypot(c.vx, c.vy); c.off = off; c.brake = inp.brk && vx > 0; c.vf = vx;
    c.sliding = c.dm && Math.abs(beta) > .05 || Math.abs(aR) > .13 && c.spd > 50 ? 1 : 0; c.hb = inp.hb && c.dm;
    // ütközés
    const cr = C.len * .42;
    for (const o of B.obs) {
      if (o.k === 'b') { if (c.x < o.x - cr || c.x > o.x + o.w + cr || c.y < o.y - cr || c.y > o.y + o.h + cr) continue;
        const qx = Math.max(o.x, Math.min(o.x + o.w, c.x)), qy = Math.max(o.y, Math.min(o.y + o.h, c.y)), dx = c.x - qx, dy = c.y - qy, d = Math.hypot(dx, dy);
        if (d < cr) { const nx = d ? dx / d : 1, ny = d ? dy / d : 0; hit(c, nx, ny, cr - d); } }
      else { const dx = c.x - o.x, dy = c.y - o.y, rr2 = cr + o.r * .6; if (Math.abs(dx) > rr2 || Math.abs(dy) > rr2) continue; const d = Math.hypot(dx, dy); if (d < rr2) hit(c, dx / (d || 1), dy / (d || 1), rr2 - d); }
    }
    if (c.x < 20 || c.x > WW - 20) { c.x = Math.max(20, Math.min(WW - 20, c.x)); c.vx *= -.4; }
    if (c.y < 20 || c.y > WH - 20) { c.y = Math.max(20, Math.min(WH - 20, c.y)); c.vy *= -.4; }
  }
  function hit(c, nx, ny, pen) {
    c.x += nx * pen; c.y += ny * pen; const vn = c.vx * nx + c.vy * ny;
    if (vn < 0) { c.vx -= 1.4 * vn * nx; c.vy -= 1.4 * vn * ny; c.vx *= .7; c.vy *= .7; c.w = (c.w || 0) * .5; if (vn < -120) { G.shake = Math.min(14, -vn / 30) * G.d; Sfx.hit(); if (c.drift > 0) { flash(c, 'ELVESZETT', 1); c.drift = 0; c.dTime = 0; } } }
  }
  function flash(c, t, bad) { S.msg.push({ c, t, l: 1.4, bad }); }
  function lapLogic(c, now) {
    const p = B.P[c.ti], pr = p.prog, onRoad = !c.off, prev = c.pr;
    if (onRoad || Math.abs(pr - prev) < .03 || (B.loop && Math.abs(pr - prev) > .97)) c.pr = pr;
    const pr2 = c.pr, NC = 5;
    if (c.cp < NC - 1 && pr2 >= (c.cp + 1) / NC && pr2 < (c.cp + 1) / NC + .12) c.cp++;
    const tid = B.T.id;
    const saveGhost = (ms, lapMsg) => { if (c.ctrl !== 1) return; const key = bestKey(tid, c.k), prv = ls.get(key, null);
      if (!prv || ms < prv.ms) { const pp = enc(c.rec); if (pp.length < 90000) ls.set(key, { ms, p: pp }); if (lapMsg) { flash(c, 'ÚJ KÖRREKORD ' + fmtT(ms)); Sfx.perfect(); } }
      const gb = Math.min(...(NETG[tid] || []).filter(r => r.me && r.ms).map(r => r.ms), 1e12);
      if (ms < gb && window.top !== window) { const pp = enc(c.rec); if (pp.length < 90000) { parent.postMessage({ hgws: 'ghostsave', track: tid, ms, car: c.k, path: pp }, location.origin); (NETG[tid] = NETG[tid] || []).push({ me: true, ms }); } } };
    if (B.loop) {
      if (c.cp >= NC - 1 && prev > .85 && pr2 < .15) {
        c.cp = 0; const lt = now - c.lapT0; c.laps.push(lt); c.lapT0 = now; c.lap++;
        saveGhost(Math.round(lt * 1000), true); c.rec = []; c.recT = 0;
        if (c.lap >= LAPS) { c.done = now; c.total = c.laps.reduce((a, b) => a + b, 0); flash(c, 'CÉL!'); Sfx.coin(); } else flash(c, (c.lap + 1) + '. KÖR');
      }
      c.prog = c.lap + c.pr;
    } else {
      c.prog = c.pr;
      if (c.cp >= NC - 1 && c.pr >= B.finProg && onRoad && p.pi === 0) { c.done = now; c.total = now; c.laps = [now]; saveGhost(Math.round(now * 1000), false); flash(c, 'CÉL!'); Sfx.coin(); }
    }
  }
  function finish() {
    const c = S.cars[0], tid = B.T.id; S.phase = 'res'; silence();
    let pts = 0, newBest = false;
    if (c.done) { const ms = Math.round(c.total * 1000), old = myBestRace(tid); if (!old || ms < old) { ls.set('r_' + tid, ms); newBest = true;
        if (window.top !== window) parent.postMessage({ hgws: 'ghostsave', track: tid, rms: ms }, location.origin); }
      pts = pointsFor(B, ms); }
    const tot = totalPoints();
    S.res = { pts, tot, newBest, best: myBestRace(tid) };
    G.score = tot; hud(); setTimeout(() => { if (S && S.phase === 'res') { S.phase = 'over'; G.end(); } }, 3600);
  }

  /* ---------------- rajz ---------------- */
  /* ---- 2.5D: enyhén döntött felülnézet (sprite-stacking) ---- */
  const K3 = 1 / 1100, TILT = .34; let CV = { x: 0, y: 0 };
  const lift = (x, y, h) => [x + (x - CV.x) * h * K3, y + (y - CV.y) * h * K3 - h * TILT];
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16), c = v => Math.max(0, Math.min(255, Math.round(v * f))); return `rgb(${c(n >> 16)},${c(n >> 8 & 255)},${c(n & 255)})`; };
  const LAYERS = {}, LS = 3;
  function carLayers(k) {
    if (LAYERS[k]) return LAYERS[k];
    const C = CARS[k], L = C.len, W = C.w, cw = Math.ceil((L + 8) * LS), ch = Math.ceil((W + 8) * LS), out = [];
    const mk = f => { const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const x = cv.getContext('2d'); x.translate(cw / 2, ch / 2); x.scale(LS, LS); f(x); out.push(cv); };
    const box = (x, x0, y0, w, h, col, rad = 2) => { x.fillStyle = col; x.beginPath(); x.roundRect ? x.roundRect(x0, y0, w, h, rad) : x.rect(x0, y0, w, h); x.fill(); };
    const wheels = x => { for (const [wx, wy] of [[L * .28, -W / 2 - .5], [L * .28, W / 2 + .5], [-L * .3, -W / 2 - .5], [-L * .3, W / 2 + .5]]) box(x, wx - L * .1, wy - 2.2, L * .2, 4.4, '#141414', 1.2); };
    if (C.kart) {
      mk(x => { wheels(x); box(x, -L * .42, -W * .3, L * .84, W * .6, '#333', 2); });
      mk(x => { wheels(x); box(x, -L * .45, -W * .38, L * .9, W * .76, C.c2, 4); });
      mk(x => { box(x, -L * .45, -W * .38, L * .9, W * .76, C.col, 4); box(x, L * .36, -W * .45, L * .1, W * .9, C.c2, 1); });
      mk(x => { box(x, -L * .16, -W * .26, L * .34, W * .52, '#222', 3); });
      mk(x => { x.fillStyle = '#ffd84a'; x.beginPath(); x.arc(-L * .02, 0, W * .2, 0, 6.283); x.fill(); });
      mk(x => { x.fillStyle = '#fff3a0'; x.beginPath(); x.arc(-L * .04, -1, W * .13, 0, 6.283); x.fill(); });
    } else {
      mk(x => { wheels(x); box(x, -L / 2 + 2, -W / 2 + 1.5, L - 4, W - 3, '#1b1b1f', 4); });
      mk(x => { wheels(x); box(x, -L / 2, -W / 2, L, W, C.c2, W * .32); });
      mk(x => { box(x, -L / 2, -W / 2, L, W, C.col, W * .32); x.fillStyle = '#fffbe0'; x.fillRect(L / 2 - 2.5, -W / 2 + 2, 2.5, 3.5); x.fillRect(L / 2 - 2.5, W / 2 - 5.5, 2.5, 3.5); x.fillStyle = '#b3160c'; x.fillRect(-L / 2, -W / 2 + 2, 2.2, 3.5); x.fillRect(-L / 2, W / 2 - 5.5, 2.2, 3.5); });
      mk(x => { box(x, -L / 2 + .5, -W / 2 + .5, L - 1, W - 1, C.col, W * .3); if (C.stripe) { x.fillStyle = C.stripe; x.fillRect(-L / 2 + 1, -W * .12, L - 2, W * .08); x.fillRect(-L / 2 + 1, W * .04, L - 2, W * .08); } });
      mk(x => { box(x, -L * .36, -W * .42, L * .66, W * .84, '#1d2836', 4); box(x, -L * .24, -W * .36, L * .38, W * .72, C.col, 3); });
      mk(x => { box(x, -L * .32, -W * .38, L * .56, W * .76, '#243246', 4); x.fillStyle = 'rgba(160,200,240,.35)'; x.fillRect(L * .1, -W * .32, L * .1, W * .64); });
      mk(x => { box(x, -L * .26, -W * .34, L * .42, W * .68, shade(C.col, 1.12), 4); if (C.stripe) { x.fillStyle = C.stripe; x.fillRect(-L * .26, -W * .12, L * .42, W * .08); x.fillRect(-L * .26, W * .04, L * .42, W * .08); } x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(-L * .2, -W * .3, L * .3, W * .1); });
      if (C.wing) mk(x => { box(x, -L / 2 - 1, -W / 2, 4, W, C.c2, 1); });
    }
    return LAYERS[k] = { cv: out, cw: cw / LS, ch: ch / LS };
  }
  function drawCar(g, c, x, y, a, z, alpha, light) {
    const k = c.k || c, C = CARS[k], Lr = carLayers(k), zz = (z || 0) * 60, LH = C.kart ? 1.5 : 1.7;
    g.save(); g.globalAlpha = alpha;
    const [sx, sy] = lift(x, y, zz); g.save(); g.translate(sx + 3 + zz * .15, sy + 4 + zz * .1); g.rotate(a); g.fillStyle = 'rgba(0,0,0,.38)'; rr(-C.len / 2 - 1, -C.w / 2 - 1, C.len + 2, C.w + 2, 6); g.fill(); g.restore();
    Lr.cv.forEach((cv, i) => { const [px, py] = lift(x, y, zz + i * LH); g.save(); g.translate(px, py); g.rotate(a); g.drawImage(cv, -Lr.cw / 2, -Lr.ch / 2, Lr.cw, Lr.ch);
      if (i === 2 && c.brake) { g.fillStyle = '#ff3a22'; g.fillRect(-C.len / 2 - .5, -C.w / 2 + 2, 2.6, 3.5); g.fillRect(-C.len / 2 - .5, C.w / 2 - 5.5, 2.6, 3.5); }
      g.restore(); });
    g.restore();
  }
  function drawBShadow(g, o) { const s = o.ht * .55; g.fillStyle = 'rgba(0,0,0,.32)'; g.beginPath(); g.moveTo(o.x, o.y + o.h); g.lineTo(o.x + s * .6, o.y + o.h + s * .5); g.lineTo(o.x + o.w + s * .6, o.y + o.h + s * .5); g.lineTo(o.x + o.w + s * .6, o.y + s * .5); g.lineTo(o.x + o.w, o.y); g.closePath(); g.fill(); }
  function drawBuilding(g, o) {
    const h = o.ht, B0 = [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]], T0 = B0.map(([x, y]) => lift(x, y, h));
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2, [tcx, tcy] = lift(cx, cy, h), ox = tcx - cx, oy = tcy - cy, night = B.T.tod !== 'day';
    const hide = S && S.cars.some(c => c.y < o.y + o.h && c.y > o.y - h * TILT - 40 && c.x > Math.min(o.x, o.x + ox) - 30 && c.x < Math.max(o.x + o.w, o.x + o.w + ox) + 30);
    g.save(); if (hide) g.globalAlpha = .45;
    const N = [[0, -1, .62], [1, 0, .78], [0, 1, .9], [-1, 0, .7]];
    for (let i = 0; i < 4; i++) { const [nx, ny, f] = N[i]; if (nx * ox + ny * oy >= 0) continue; const a = B0[i], b = B0[(i + 1) % 4], ta = T0[i], tb = T0[(i + 1) % 4];
      g.fillStyle = shade(o.col, f); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(tb[0], tb[1]); g.lineTo(ta[0], ta[1]); g.closePath(); g.fill();
      const fl = Math.max(2, Math.floor(h / 16)), cols = Math.max(2, Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]) / 14));
      for (let r2 = 1; r2 < fl; r2++) { const t = r2 / fl, t2 = (r2 + .55) / fl; for (let c2 = 0; c2 < cols; c2++) { const u = (c2 + .25) / cols, u2 = (c2 + .75) / cols;
        const P = (uu, tt) => [a[0] + (b[0] - a[0]) * uu + (ta[0] - a[0]) * tt, a[1] + (b[1] - a[1]) * uu + (ta[1] - a[1]) * tt];
        const lit = ((o.win >> ((r2 * 7 + c2 * 3 + i) % 20)) & 1) === 1;
        g.fillStyle = night ? (lit ? 'rgba(255,214,130,.85)' : 'rgba(10,14,24,.55)') : 'rgba(30,45,65,.45)';
        const p1 = P(u, t), p2 = P(u2, t), p3 = P(u2, t2), p4 = P(u, t2); g.beginPath(); g.moveTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.lineTo(p3[0], p3[1]); g.lineTo(p4[0], p4[1]); g.closePath(); g.fill(); } } }
    g.fillStyle = shade(o.col, 1.08); g.beginPath(); T0.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
    g.strokeStyle = shade(o.col, .55); g.lineWidth = 1.5; g.stroke();
    const tl = (u, v, hh) => lift(o.x + o.w * u, o.y + o.h * v, h + hh);
    if (o.rf < .45) { const q = [tl(.25, .25, 0), tl(.5, .25, 0), tl(.5, .45, 0), tl(.25, .45, 0)], q2 = [tl(.25, .25, 9), tl(.5, .25, 9), tl(.5, .45, 9), tl(.25, .45, 9)];
      g.fillStyle = '#7b828c'; g.beginPath(); [q[3], q[2], q2[2], q2[3]].forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.fill(); g.fillStyle = '#a3abb5'; g.beginPath(); q2.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.fill(); }
    else if (o.rf < .6) { g.fillStyle = '#4c7a46'; const q = [tl(.12, .12, 0), tl(.88, .12, 0), tl(.88, .88, 0), tl(.12, .88, 0)]; g.beginPath(); q.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.fill(); }
    else if (night && o.rf > .9) { const [x, y] = tl(.5, .5, 2); g.fillStyle = ['#ff3ea5', '#3ee8ff', '#ffe23e'][o.win % 3]; g.fillRect(x - 10, y - 3, 20, 6); }
    g.restore();
  }
  function drawObs3(g, o, t) {
    if (o.k === 'b') return drawBuilding(g, o);
    const r = o.r, snow = B.T.th === 'snow';
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(o.x + r * .7, o.y + r * .5, r * 1.1, r * .75, .3, 0, 6.283); g.fill();
    const disc = (hh, rad, col) => { const [x, y] = lift(o.x, o.y, hh); g.fillStyle = col; g.beginPath(); g.arc(x, y, rad, 0, 6.283); g.fill(); };
    if (o.k === 'tree') { const H = r * 2.4, [tx, ty] = lift(o.x, o.y, H * .45); g.strokeStyle = '#5a3d22'; g.lineWidth = 4; g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(tx, ty); g.stroke();
      disc(H * .45, r, '#2a6326'); disc(H * .65, r * .9, '#347a2f'); disc(H * .82, r * .7, '#3f8f38'); disc(H, r * .42, '#56a64b'); }
    else if (o.k === 'bush') { disc(4, r * .9, '#3f7a30'); disc(9, r * .65, '#4b8c3a'); disc(13, r * .35, '#5fa84a'); }
    else if (o.k === 'pine') { const H = r * 3; for (let i = 0; i < 5; i++) { const hh = H * (.2 + i * .19), rad = r * (1.05 - i * .2), [x, y] = lift(o.x, o.y, hh);
        g.fillStyle = snow && i === 4 ? '#f4f8fb' : ['#1d4a29', '#235a31', '#2a6338', '#30703f', '#357a44'][i]; g.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283 + o.s, rr2 = rad * (k & 1 ? .62 : 1); g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2 * .9); } g.fill();
        if (snow && i < 4) { g.fillStyle = 'rgba(244,248,251,.7)'; g.beginPath(); g.arc(x - rad * .25, y - rad * .2, rad * .3, 0, 6.283); g.fill(); } } }
    else if (o.k === 'rock') { const col = B.T.th === 'desert' ? '#a8865a' : '#7d7a74'; for (let i = 0; i < 3; i++) { const [x, y] = lift(o.x, o.y, i * 4); g.fillStyle = shade(col, .8 + i * .12); g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283 + o.s * 3; g.lineTo(x + Math.cos(a) * r * (1 - i * .2) * (.8 + .2 * ((k * 7 + o.s * 10) % 1)), y + Math.sin(a) * r * .8 * (1 - i * .2)); } g.fill(); } }
    else if (o.k === 'cactus') { const H = r * 4; for (let i = 0; i <= 8; i++) disc(H * i / 8, r * .55, i === 8 ? '#6aad55' : '#4f8f3c'); for (const sd of [-1, 1]) { for (let i = 0; i <= 4; i++) { const [x, y] = lift(o.x + sd * r * 1.3, o.y, H * (.35 + i * .1)); g.fillStyle = i === 4 ? '#6aad55' : '#4f8f3c'; g.beginPath(); g.arc(x, y, r * .4, 0, 6.283); g.fill(); } } }
  }
  function drawLamp(g, l) { const [x, y] = lift(l.x, l.y, 70); g.strokeStyle = '#3a4048'; g.lineWidth = 3; g.beginPath(); g.moveTo(l.x, l.y); g.lineTo(x, y); g.stroke();
    g.fillStyle = B.T.tod === 'day' ? '#aab2bc' : '#fff1c8'; g.beginPath(); g.arc(x, y, 5, 0, 6.283); g.fill(); }
  const fmtT = ms => { const t = ms / 1000, m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); };
  const fmtS = s => fmtT(s * 1000);
  let NC = null, LRC = null;
  function nightLayer(g, cam, z, LW, LH) {
    const tod = B.T.tod; if (tod === 'day') return;
    if (!NC || NC.width !== LW || NC.height !== LH) { NC = document.createElement('canvas'); NC.width = LW; NC.height = LH; }
    const n = NC.getContext('2d'); n.setTransform(1, 0, 0, 1, 0, 0); n.globalCompositeOperation = 'source-over'; n.clearRect(0, 0, LW, LH);
    n.fillStyle = tod === 'night' ? 'rgba(4,8,22,.86)' : 'rgba(40,18,48,.42)'; n.fillRect(0, 0, LW, LH);
    n.setTransform(z, 0, 0, z, LW / 2 - cam.x * z, LH / 2 - cam.y * z); n.globalCompositeOperation = 'destination-out';
    const cut = (x, y, r, a = 1) => { const gr = n.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); n.fillStyle = gr; n.beginPath(); n.arc(x, y, r, 0, 6.283); n.fill(); };
    for (const l of B.lamps) cut(l.x, l.y, 120, .85);
    for (const o of B.obs) if (o.k === 'b' && Math.abs(o.x - cam.x) < LW / z && Math.abs(o.y - cam.y) < LH / z) { const [x, y] = lift(o.x + o.w / 2, o.y + o.h / 2, o.ht); cut(x, y, Math.max(o.w, o.h) * .7, .35); }
    for (const c of S.cars) { cut(c.x, c.y, 40, .7); if (c.light) { const fx = c.x + Math.cos(c.a) * c.c.len * .5, fy = c.y + Math.sin(c.a) * c.c.len * .5, gr = n.createRadialGradient(fx, fy, 0, fx, fy, 430);
        gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(.6, 'rgba(0,0,0,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); n.fillStyle = gr; n.beginPath(); n.moveTo(fx, fy); n.arc(fx, fy, 430, c.a - .36, c.a + .36); n.closePath(); n.fill(); } }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(NC, 0, 0); g.restore();
  }
  function lightGlow(g) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const c of S.cars) { if (!c.light) continue; const fx = c.x + Math.cos(c.a) * c.c.len * .5, fy = c.y + Math.sin(c.a) * c.c.len * .5, gr = g.createRadialGradient(fx, fy, 0, fx, fy, 380);
      gr.addColorStop(0, `rgba(255,240,190,${B.T.tod === 'day' ? .12 : .22})`); gr.addColorStop(1, 'rgba(255,240,190,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(fx, fy); g.arc(fx, fy, 380, c.a - .34, c.a + .34); g.closePath(); g.fill();
      if (B.T.tod !== 'day') { const bx = c.x - Math.cos(c.a) * c.c.len * .5, by = c.y - Math.sin(c.a) * c.c.len * .5, rg = g.createRadialGradient(bx, by, 0, bx, by, c.brake ? 50 : 26); rg.addColorStop(0, 'rgba(255,40,20,.5)'); rg.addColorStop(1, 'rgba(255,40,20,0)'); g.fillStyle = rg; g.beginPath(); g.arc(bx, by, 50, 0, 6.283); g.fill(); } }
    if (B.T.tod !== 'day') for (const l of B.lamps) { const gr = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, 110); gr.addColorStop(0, 'rgba(255,200,120,.22)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.beginPath(); g.arc(l.x, l.y, 110, 0, 6.283); g.fill(); }
    g.restore();
  }
  function drawRoad(g, cam, t) {
    const T = B.T, Sf = B.S, PS = [...B.paths].sort((a, b) => b.dirt - a.dirt), mt = T.th === 'mountain' || T.th === 'snow';
    g.lineJoin = 'round'; g.lineCap = 'round';
    const each = (f) => { for (const pa of PS) f(pa); };
    each(pa => { g.strokeStyle = Sf.off; g.lineWidth = pa.hw * 2 + (T.th === 'city' ? 34 : 22); g.stroke(pa.p2); });
    if (mt) each(pa => { if (pa.dirt) return; g.strokeStyle = '#c9ced6'; g.lineWidth = pa.hw * 2 + 10; g.setLineDash([3, 14]); g.stroke(pa.p2); g.setLineDash([]); });
    each(pa => { g.strokeStyle = pa.dirt ? '#8a6a44' : Sf.road; g.lineWidth = pa.hw * 2; g.stroke(pa.p2); });
    each(pa => { if (pa.dirt) return; g.strokeStyle = Sf.edge; g.lineWidth = pa.hw * 2 - 4; g.globalAlpha = .9; g.stroke(pa.p2); g.globalAlpha = 1; });
    each(pa => { g.strokeStyle = pa.dirt ? '#9a7a52' : Sf.road; g.lineWidth = pa.hw * 2 - 10; g.stroke(pa.p2); });
    each(pa => { if (!pa.dirt) return; g.strokeStyle = 'rgba(60,40,20,.35)'; g.lineWidth = 6; g.setLineDash([1, 9]); g.stroke(pa.p2); g.setLineDash([]); });
    if (T.hills) { g.lineCap = 'butt'; const P = B.P; for (let i = 0; i + 10 < B.n; i += 10) { const a = P[i], b = P[i + 10]; if (a.pi !== b.pi) continue; g.lineWidth = a.hw * 2 - 10; g.strokeStyle = `rgba(255,255,255,${(a.h + b.h) * .09})`; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); } g.lineCap = 'round'; }
    each(pa => { if (pa.dirt) return; g.strokeStyle = T.th === 'city' ? '#e8c34a' : 'rgba(255,255,255,.75)'; g.lineWidth = 3; g.setLineDash([22, 26]); g.stroke(pa.p2); g.setLineDash([]); });
    const line = (i, fin) => { const p = B.P[i], hw = p.hw; g.save(); g.translate(p.x, p.y); g.rotate(Math.atan2(p.tx, -p.ty));
      for (let k = -hw; k < hw; k += 10) for (let j = 0; j < 2; j++) { g.fillStyle = ((k / 10 + j) & 1) ? '#111' : '#fff'; g.fillRect(k, -10 + j * 10, 10, 10); }
      if (fin) { g.fillStyle = '#2b2f36'; g.fillRect(-hw - 16, -6, 10, 12); g.fillRect(hw + 6, -6, 10, 12); g.fillStyle = '#ff5a4d'; g.fillRect(-hw - 12, -16, hw * 2 + 24, 8); g.fillStyle = '#fff'; g.font = '700 7px Inter, sans-serif'; g.textAlign = 'center'; g.fillText('CÉL', 0, -11); }
      g.restore(); };
    line(B.iStart, false); if (!B.loop) line(B.iFin, true);
    g.lineCap = 'round';
    for (const [ty, al, col] of [[0, 1, 'rgba(12,12,14,.55)'], [0, .5, 'rgba(12,12,14,.3)'], [1, 1, 'rgba(70,48,26,.5)'], [1, .5, 'rgba(70,48,26,.28)']]) {
      g.strokeStyle = col; g.lineWidth = al === 1 ? 5 : 4; g.beginPath(); for (const sk of S.skids) if (sk[4] === ty && sk[5] === al) { g.moveTo(sk[0], sk[1]); g.lineTo(sk[2], sk[3]); } g.stroke(); }
  }
  function minimap(g, x, y, w, h) {
    const d = G.d; g.save(); g.fillStyle = 'rgba(4,7,14,.6)'; rr(x, y, w, h, 10 * d); g.fill();
    const s = Math.min((w - 16 * d) / WW, (h - 16 * d) / WH), ox = x + (w - WW * s) / 2, oy = y + (h - WH * s) / 2;
    g.translate(ox, oy); g.scale(s, s); for (const pa of B.paths) { g.strokeStyle = pa.dirt ? 'rgba(200,160,110,.7)' : 'rgba(255,255,255,.75)'; g.lineWidth = pa.main ? 60 : 40; g.stroke(pa.p2); }
    if (!B.loop) { const f = B.P[B.iFin]; g.fillStyle = '#ff5a4d'; g.beginPath(); g.arc(f.x, f.y, 90, 0, 6.283); g.fill(); }
    for (const gh of S.ghosts) { const p = ghostAt(gh.d, Math.max(0, S.t - (S.cars[0].lapT0 || 0))); if (p) { g.fillStyle = gh.col; g.globalAlpha = .7; g.beginPath(); g.arc(p.x, p.y, 45, 0, 6.283); g.fill(); g.globalAlpha = 1; } }
    for (const c of S.cars) { g.fillStyle = c.c.col; g.strokeStyle = '#000'; g.lineWidth = 16; g.beginPath(); g.arc(c.x, c.y, 70, 0, 6.283); g.fill(); g.stroke(); }
    g.restore();
  }
  function btns() { const d = G.d, r = 38 * d, y = G.H - 24 * d - r;
    return [{ id: 'L', x: 22 * d + r, y, r, t: '◀' }, { id: 'R', x: 22 * d + r * 3 + 12 * d, y, r, t: '▶' }, { id: 'G', x: G.W - 22 * d - r, y, r: r * 1.15, t: 'GÁZ' }, { id: 'B', x: G.W - 22 * d - r * 3.4, y, r, t: 'FÉK' }, { id: 'H', x: G.W - 22 * d - r, y: y - r * 2.6, r: r * .85, t: 'KÉZI' }, { id: 'X', x: G.W - 22 * d - r * 3.4, y: y - r * 2.4, r: r * .65, t: '💡' }]; }

  /* ---------------- menü ---------------- */
  function menuLayout() {
    const d = G.d, W = G.W, H = G.H, pad = 14 * d, top = 114 * d;
    const cols = W / d > 1000 ? 5 : W / d > 640 ? 4 : 2, gw = Math.min(W - pad * 2, 1180 * d), cw = (gw - (cols - 1) * 10 * d) / cols, rows = Math.ceil(TR.length / cols);
    const bottomH = 200 * d, ch = Math.max(56 * d, Math.min(cw * .62, (H - top - bottomH - (rows - 1) * 10 * d - 20 * d) / rows));
    const x0 = (W - gw) / 2, cards = TR.map((T, i) => ({ i, x: x0 + (i % cols) * (cw + 10 * d), y: top + Math.floor(i / cols) * (ch + 10 * d), w: cw, h: ch }));
    const by = top + rows * (ch + 10 * d) + 8 * d, two = sel.two && !touchUI, sw = Math.min(two ? (gw - 10 * d) / 2 : gw, 420 * d);
    const sels = [{ p: 1, x: two ? W / 2 - sw - 5 * d : (W - sw) / 2, y: by, w: sw, h: 96 * d }]; if (two) sels.push({ p: 2, x: W / 2 + 5 * d, y: by, w: sw, h: 96 * d });
    const ry = by + 104 * d, bw = Math.min(gw, 420 * d), buttons = [];
    if (!touchUI) { buttons.push({ id: 'm1', x: W / 2 - bw / 2, y: ry, w: bw / 2 - 4 * d, h: 34 * d, t: '1 JÁTÉKOS' }, { id: 'm2', x: W / 2 + 4 * d, y: ry, w: bw / 2 - 4 * d, h: 34 * d, t: '2 JÁTÉKOS' }); }
    buttons.push({ id: 'go', x: W / 2 - bw / 2, y: ry + (touchUI ? 0 : 42 * d), w: bw, h: 44 * d, t: 'START ▶' });
    return { cards, sels, buttons };
  }
  function trackPreview(g, T, x, y, w, h, col) {
    const GE = geo(T), s = Math.min(w / WW, h / WH) * .92, ox = x + (w - WW * s) / 2, oy = y + (h - WH * s) / 2;
    GE.paths.forEach((pa, k) => { g.beginPath(); pa.raw.forEach((q, i) => i ? g.lineTo(ox + q[0] * s, oy + q[1] * s) : g.moveTo(ox + q[0] * s, oy + q[1] * s)); if (!k && T.loop) g.closePath();
      g.strokeStyle = pa.dirt ? 'rgba(230,190,130,.85)' : col; g.lineWidth = Math.max(1.5, (k ? 2 : 3) * G.d * s * 25); g.stroke(); });
    if (!T.loop) { const m = GE.paths[0].raw, a = m[0], b = m[m.length - 1]; g.fillStyle = '#6fcf6a'; g.beginPath(); g.arc(ox + a[0] * s, oy + a[1] * s, 3 * G.d, 0, 6.283); g.fill(); g.fillStyle = '#ff5a4d'; g.beginPath(); g.arc(ox + b[0] * s, oy + b[1] * s, 3 * G.d, 0, 6.283); g.fill(); }
  }

  const THC = { city: ['#2b3340', '#3d4757'], country: ['#2f5a24', '#46803a'], mountain: ['#4a5236', '#6b6a52'], snow: ['#6f8496', '#a9bccb'], desert: ['#8a6a3a', '#b8935a'] };
  function drawMenu(g, t) {
    const d = G.d, L = menuLayout();
    const bgr = g.createLinearGradient(0, 0, 0, G.H); bgr.addColorStop(0, '#120c1c'); bgr.addColorStop(1, '#05060c'); g.fillStyle = bgr; g.fillRect(0, 0, G.W, G.H);
    g.strokeStyle = 'rgba(255,90,77,.08)'; g.lineWidth = 2 * d; for (let i = 0; i < 12; i++) { const y = ((t * 60 + i * 90) % (G.H + 200)) - 100; g.beginPath(); g.moveTo(0, y); g.lineTo(G.W, y - 200 * d); g.stroke(); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${Math.min(30, G.W / d / 14) * d}px Cinzel, serif`; g.fillStyle = '#ffe29a'; g.fillText('DRIFT KIRÁLY', G.W / 2, 72 * d);
    for (const c of L.cards) {
      const T = TR[c.i], on = sel.t === c.i, cc = THC[T.th], gr = g.createLinearGradient(c.x, c.y, c.x + c.w, c.y + c.h); gr.addColorStop(0, cc[0]); gr.addColorStop(1, cc[1]);
      g.fillStyle = gr; rr(c.x, c.y, c.w, c.h, 10 * d); g.fill(); if (T.tod !== 'day') { g.fillStyle = T.tod === 'night' ? 'rgba(4,8,22,.5)' : 'rgba(60,20,50,.3)'; rr(c.x, c.y, c.w, c.h, 10 * d); g.fill(); }
      g.lineWidth = on ? 3 * d : 1 * d; g.strokeStyle = on ? '#ffd84a' : 'rgba(255,255,255,.15)'; rr(c.x, c.y, c.w, c.h, 10 * d); g.stroke();
      trackPreview(g, T, c.x + c.w * .45, c.y + 4 * d, c.w * .53, c.h - 8 * d, 'rgba(255,255,255,.85)');
      g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `800 ${Math.min(13, c.w / d / 12) * d}px Inter, sans-serif`; g.fillText(TOD[T.tod] + ' ' + T.n, c.x + 8 * d, c.y + 14 * d, c.w * .55); g.font = `700 ${Math.min(9, c.w / d / 18) * d}px Inter, sans-serif`; g.fillStyle = T.loop ? '#9fe0ff' : '#ffb36b'; if (c.h > 44 * d) g.fillText(T.loop ? '🔁 KÖRPÁLYA' : '🏁 SPRINT' + ((T.br || []).length ? ' · ' + (T.br.length + 1) + ' ÚTVONAL' : ''), c.x + 8 * d, c.y + 30 * d, c.w * .5);
      const mb = myBestRace(T.id), top1 = (NETG[T.id] || []).filter(r => r.rms).sort((a, b) => a.rms - b.rms)[0];
      g.font = `600 ${Math.min(11, c.w / d / 14) * d}px Inter, sans-serif`; g.fillStyle = 'rgba(255,255,255,.75)';
      if (c.h > 50 * d) g.fillText(mb ? '⏱ ' + fmtT(mb) + ' · ' + pointsFor(geo(T), mb) + ' p' : '–', c.x + 8 * d, c.y + c.h - 30 * d, c.w * .5);
      g.fillStyle = '#ffd84a'; if (top1) g.fillText('🏆 ' + fmtT(top1.rms) + ' ' + top1.name, c.x + 8 * d, c.y + c.h - 13 * d, c.w * .9);
      g.textAlign = 'center';
    }
    for (const s of L.sels) {
      const k = s.p === 1 ? sel.c1 : sel.c2, C = CARS[k];
      g.fillStyle = 'rgba(255,255,255,.05)'; rr(s.x, s.y, s.w, s.h, 12 * d); g.fill(); g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = d; rr(s.x, s.y, s.w, s.h, 12 * d); g.stroke();
      g.font = `700 ${18 * d}px Inter, sans-serif`; g.fillStyle = '#ffe29a'; g.fillText('‹', s.x + 18 * d, s.y + s.h / 2); g.fillText('›', s.x + s.w - 18 * d, s.y + s.h / 2);
      g.save(); g.translate(s.x + 74 * d, s.y + s.h / 2); g.scale(1.9 * d, 1.9 * d); drawCar(g, { k, st: Math.sin(t * 2) }, 0, 0, -Math.PI / 2 + Math.sin(t) * .2, 0, 1, true); g.restore();
      g.textAlign = 'left'; g.font = `800 ${14 * d}px Inter, sans-serif`; g.fillStyle = '#fff'; g.fillText((sel.two && !touchUI ? 'P' + s.p + ' · ' : '') + C.n, s.x + 120 * d, s.y + 18 * d);
      const st = [['GYORS.', C.eng / 600], ['VÉGSEB.', C.top / 720], ['TAPADÁS', C.mu / 800], ['DRIFT', Math.min(1, (C.eng / C.mu) * 1.05 + (C.awd ? -.15 : 0))]];
      st.forEach(([n, v], i) => { const yy = s.y + 38 * d + i * 14 * d, bx = s.x + 186 * d, bw = s.w - 210 * d; g.font = `600 ${9 * d}px Inter, sans-serif`; g.fillStyle = 'rgba(255,255,255,.55)'; g.fillText(n, s.x + 120 * d, yy);
        g.fillStyle = 'rgba(255,255,255,.1)'; rr(bx, yy - 3 * d, bw, 6 * d, 3 * d); g.fill(); g.fillStyle = C.col; rr(bx, yy - 3 * d, bw * Math.min(1, v), 6 * d, 3 * d); g.fill(); });
      g.textAlign = 'center';
    }
    for (const b of L.buttons) { const on = (b.id === 'm1' && !sel.two) || (b.id === 'm2' && sel.two) || b.id === 'go';
      g.fillStyle = b.id === 'go' ? '#ff5a4d' : on ? 'rgba(255,216,74,.9)' : 'rgba(255,255,255,.07)'; rr(b.x, b.y, b.w, b.h, b.h / 2); g.fill();
      g.font = `800 ${(b.id === 'go' ? 16 : 12) * d}px Inter, sans-serif`; g.fillStyle = b.id === 'go' ? '#fff' : on ? '#1a1004' : 'rgba(255,255,255,.75)'; g.fillText(b.t, b.x + b.w / 2, b.y + b.h / 2 + 1); }
    g.font = `700 ${12 * d}px Inter, sans-serif`; g.fillStyle = 'rgba(255,226,154,.8)'; g.fillText('ÖSSZPONTSZÁM: ' + totalPoints().toLocaleString('hu-HU'), G.W / 2, 98 * d);
  }
  function menuClick(x, y) {
    const L = menuLayout(), hitR = o => x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h;
    const c = L.cards.find(hitR); if (c) { sel.t = c.i; Sfx.blip(660, .04, 'sine', .05); return; }
    for (const s of L.sels) if (hitR(s)) { const key = s.p === 1 ? 'c1' : 'c2', i = CK.indexOf(sel[key]); sel[key] = CK[(i + (x < s.x + s.w / 2 ? -1 : 1) + CK.length) % CK.length]; Sfx.blip(540, .04, 'square', .04); return; }
    const b = L.buttons.find(hitR); if (!b) return;
    if (b.id === 'm1') sel.two = 0; if (b.id === 'm2') sel.two = 1; if (b.id === 'go') startRace(); Sfx.blip(700, .04, 'sine', .05);
  }

  /* ---------------- játék objektum ---------------- */
  const game = {
    id: 'drift', name: 'DRIFT KIRÁLY', lives: 0, quit: true, sponsor: 'A Zerosites támogatásával', overTitle: 'ÖSSZPONTSZÁM',
    desc: 'Felülnézetes drift-verseny 10 pályán: város, vidék, hegyek, hó és sivatag – nappal, alkonyatkor és éjjel. Versenyezz a legjobbak szellemautói ellen; minél gyorsabban érsz célba, annál több pontot kapsz.',
    how: 'W GÁZ · S FÉK · A/D KORMÁNY · SZÓKÖZ DRIFT · Q LÁMPA · R ÚJRA · T MENÜ  |  2P: NYILAK + JOBB SHIFT',
    ranks: [[0, 'Vasárnapi sofőr'], [3000, 'Csúszkáló'], [6000, 'Driftelő'], [9000, 'Gumiégető'], [11000, 'Drift király']],
    init() { S = null; M = 1; for (const k in K) K[k] = 0; TP.clear(); reqGhosts(); },
    leave() { silence(); },
    down(G2, x, y, e) {
      if (e === true || !e) return;
      if (e.pointerType !== 'mouse') touchUI = true;
      if (!S) return menuClick(x, y);
      if (S.phase === 'res') { S.phase = 'over'; G.end(); return; }
      if (touchUI) { const b = btns().find(b => Math.hypot(b.x - x, b.y - y) < b.r * 1.25); if (b) { if (b.id === 'X') toggleL(S.cars[0]); else TP.set(e.pointerId, b.id); try { e.target.setPointerCapture(e.pointerId); } catch (_) {} } }
    },
    up(G2, x, y, e) { if (e && e !== true) TP.delete(e.pointerId); },
    update(G2, dt) {
      if (!S) return;
      if (S.phase === 'over') return;
      const n = Math.ceil(dt / (1 / 120)), h = dt / n;
      for (let it = 0; it < n; it++) {
        if (!S.go && S.cars.some(c => c.spd > 3)) S.go = true; if (S.go) S.t += h;
        if (S.phase === 'count' && S.t >= 0) { S.phase = 'race'; S.t = 0; for (const c of S.cars) c.lapT0 = 0; Sfx.perfect(); }
        for (const c of S.cars) { physics(c, h, inputs(c)); if (S.phase === 'race' && !c.done) lapLogic(c, S.t); }
      }
      if (S.phase !== 'race') { sound(0, 0); if (S.phase === 'count') { const k = Math.ceil(-S.t); if (k !== S.cd) { S.cd = k; if (k > 0) Sfx.blip(440, .12, 'square', .07); } } return; }
      // drift-pontozás, nyomok, felvétel
      for (const c of S.cars) {
        const drifting = c.spd > 130 && c.sliding && c.slip > .15 && !c.off && !c.done;
        if (drifting) { c.dTime += dt; c.dCalm = 0; c.drift += c.spd * c.slip * dt * .12 * (1 + Math.min(4, c.dTime * .8)); }
        else if (c.drift > 0) { c.dCalm += dt; if (c.dCalm > .5) { const p = Math.round(c.drift); if (p > 20) { c.dTotal += p; flash(c, '+' + p + ' DRIFT'); } c.drift = 0; c.dTime = 0; } }
        const marks = (c.hb && c.spd > 12) || (c.sliding && c.slip > .1 && c.spd > 50) || (c.brake && c.vf > 220);
        if (marks) { const ca = Math.cos(c.a), sa = Math.sin(c.a), L = c.c.len * .3, W = c.c.w * .45, ty = c.off || B.P[c.ti].dirt ? 1 : 0, fr = c.slip > .45;
          for (const s of [-1, 1]) for (const f of fr ? [-1, 1] : [-1]) { const x = c.x + ca * L * f - sa * W * s, y = c.y + sa * L * f + ca * W * s, pk = 'sk' + s + f; if (c[pk]) S.skids.push([c[pk][0], c[pk][1], x, y, ty, f > 0 ? .5 : 1]); c[pk] = [x, y]; }
          if (!fr) c['sk-11'] = c['sk11'] = null;
          if (c.slip > .2 && Math.random() < dt * 30) S.smoke.push({ x: c.x - ca * c.c.len * .5, y: c.y - sa * c.c.len * .5, r: 6, l: 1, vx: (Math.random() - .5) * 30, vy: (Math.random() - .5) * 30 }); }
        else c['sk-1-1'] = c['sk1-1'] = c['sk-11'] = c['sk11'] = null;
        if (c.off && c.spd > 120 && Math.random() < dt * 20) S.smoke.push({ x: c.x, y: c.y, r: 5, l: .8, vx: 0, vy: 0, dirt: 1 });
        if (S.go) c.recT += dt; if (c.ctrl === 1 && !c.done) while (c.recT >= GS) { c.recT -= GS; c.rec.push(Math.round(c.x), Math.round(c.y), Math.round(c.a * 100)); }
      }
      if (S.skids.length > 12000) S.skids.splice(0, S.skids.length - 12000);
      for (const s of S.smoke) { s.x += s.vx * dt; s.y += s.vy * dt; s.r += 30 * dt; s.l -= dt * .9; } S.smoke = S.smoke.filter(s => s.l > 0); if (S.smoke.length > 160) S.smoke.splice(0, S.smoke.length - 160);
      for (const m of S.msg) m.l -= dt; S.msg = S.msg.filter(m => m.l > 0);
      // 2P felzárkóztatás
      if (S.cars.length > 1) { const [a, b] = S.cars, far = Math.hypot(a.x - b.x, a.y - b.y); if (far > 1500 && !a.done && !b.done) { const tr = a.prog < b.prog ? a : b, ld = tr === a ? b : a; let ii = ld.ti - 14; if (ii < 0 || B.P[ii].pi !== B.P[ld.ti].pi) ii = ld.ti; const p = B.P[ii];
        tr.x = p.x; tr.y = p.y; tr.a = Math.atan2(p.ty, p.tx); tr.vx = p.tx * ld.spd * .7; tr.vy = p.ty * ld.spd * .7; tr.w = 0; tr.ti = ii; tr.pr = p.prog; tr.lap = ld.lap; tr.cp = ld.cp; tr.prog = ld.prog - .001; flash(tr, 'FELZÁRKÓZTATVA', 1); } }
      const c0 = S.cars[0]; sound(Math.min(1.2, Math.max(...S.cars.map(c => c.spd)) / 600), Math.max(...S.cars.map(c => c.sliding && c.slip > .1 && c.spd > 60 ? c.slip + .2 : 0)));
      const doneAll = S.cars.every(c => c.done), first = Math.min(...S.cars.filter(c => c.done).map(c => c.done));
      if (doneAll || (S.cars.length > 1 && isFinite(first) && S.t - first > 15)) finish();
      if (c0.done || S.cars.some(c => c.dTotal)) { /* nothing */ }
    },
    draw(g, G2, t) {
      const d = G.d;
      if (!S) { CV = { x: 0, y: 0 }; return drawMenu(g, t); }
      const cs = S.cars, cam = S.cam;
      // kamera
      let tx, ty, tz; const base = Math.max(G.W, G.H * 1.1) / 980;
      if (cs.length === 1) { const c = cs[0]; tx = c.x + c.vx * .35; ty = c.y + c.vy * .35; tz = base * (1 - Math.min(.28, c.spd / 700 * .28)); }
      else { const [a, b] = cs; tx = (a.x + b.x) / 2; ty = (a.y + b.y) / 2; tz = Math.max(base * .42, Math.min(base, (G.W - 260 * d) / (Math.abs(a.x - b.x) + 1), (G.H - 260 * d) / (Math.abs(a.y - b.y) + 1))); }
      const k = Math.min(1, (S.lastDraw ? (t - S.lastDraw) : 1) * 5); S.lastDraw = t;
      cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; cam.z += (tz - cam.z) * Math.min(1, k * .6);
      { const hw = G.W / 2 / cam.z, hh = G.H / 2 / cam.z; cam.x = hw * 2 >= WW ? WW / 2 : Math.max(hw, Math.min(WW - hw, cam.x)); cam.y = hh * 2 >= WH ? WH / 2 : Math.max(hh, Math.min(WH - hh, cam.y)); }
      // világ: alacsony felbontású (pixeles) pufferbe, 2.5D mélységrendezéssel
      const PX = Math.max(1, Math.round(2 * d)), LW = Math.ceil(G.W / PX), LH = Math.ceil(G.H / PX);
      if (!LRC || LRC.width !== LW || LRC.height !== LH) { LRC = document.createElement('canvas'); LRC.width = LW; LRC.height = LH; }
      const lg = LRC.getContext('2d'), z = cam.z / PX; CV = cam;
      lg.setTransform(z, 0, 0, z, LW / 2 - cam.x * z + (Math.random() - .5) * (G.shake || 0) / PX, LH / 2 - cam.y * z);
      lg.fillStyle = B.S.ground[0]; lg.fillRect(-400, -400, WW + 800, WH + 800);
      lg.imageSmoothingEnabled = true; lg.drawImage(B.tex, 0, 0, WW, WH);
      drawRoad(lg, cam, t);
      const vx0 = cam.x - G.W / 2 / cam.z - 200, vx1 = cam.x + G.W / 2 / cam.z + 200, vy0 = cam.y - G.H / 2 / cam.z - 120, vy1 = cam.y + G.H / 2 / cam.z + 320;
      for (const sm of S.smoke) { lg.fillStyle = sm.dirt ? `rgba(140,110,70,${sm.l * .35})` : `rgba(230,230,230,${sm.l * .35})`; const [sx, sy] = lift(sm.x, sm.y, 6 + (1 - sm.l) * 20); lg.beginPath(); lg.arc(sx, sy, sm.r, 0, 6.283); lg.fill(); }
      const items = [], vis = [];
      for (const o of B.obs) { const rr2 = o.k === 'b' ? Math.max(o.w, o.h) : o.r; if (o.x + rr2 < vx0 || o.x - rr2 > vx1 || o.y + rr2 < vy0 || o.y - rr2 > vy1) continue; vis.push(o); items.push({ y: o.k === 'b' ? o.y + o.h : o.y, f: () => drawObs3(lg, o, t) }); }
      for (const o of vis) if (o.k === 'b') drawBShadow(lg, o);
      for (const l of B.lamps) { if (l.x < vx0 || l.x > vx1 || l.y < vy0 || l.y > vy1) continue; items.push({ y: l.y, f: () => drawLamp(lg, l) }); }
      const lt = S.phase === 'race' ? S.t - cs[0].lapT0 : 0, gp = [];
      for (const gh of S.ghosts) { const p = ghostAt(gh.d, Math.max(0, lt)); if (!p || cs[0].done) continue; gp.push([gh, p]); items.push({ y: p.y, f: () => drawCar(lg, { k: gh.k }, p.x, p.y, p.a, B.T.hills ? B.hf(p.x, p.y) : 0, .38, false) }); }
      for (const c of cs) items.push({ y: c.y, f: () => drawCar(lg, c, c.x, c.y, c.a, c.z, 1, c.light) });
      items.sort((a, b) => a.y - b.y); for (const it of items) it.f();
      lightGlow(lg);
      nightLayer(lg, cam, z, LW, LH);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false; g.drawImage(LRC, 0, 0, LW * PX, LH * PX); g.imageSmoothingEnabled = true; g.restore();
      // szellem-nevek (teljes felbontás)
      g.save(); g.setTransform(cam.z, 0, 0, cam.z, G.W / 2 - cam.x * cam.z, G.H / 2 - cam.y * cam.z); g.textAlign = 'center';
      for (const [gh, p] of gp) { const [x, y] = lift(p.x, p.y, 20); g.font = '600 11px Inter, sans-serif'; g.fillStyle = gh.col; g.globalAlpha = .85; g.fillText(gh.name, x, y - 22); g.globalAlpha = 1; }
      g.restore();
      // feliratok
      g.save(); g.setTransform(cam.z, 0, 0, cam.z, G.W / 2 - cam.x * cam.z, G.H / 2 - cam.y * cam.z); g.textAlign = 'center';
      for (const m of S.msg) { const a = Math.min(1, m.l); g.font = '900 22px Inter, sans-serif'; g.lineWidth = 4; g.strokeStyle = `rgba(0,0,0,${a * .6})`; g.strokeText(m.t, m.c.x, m.c.y - 40 - (1.4 - m.l) * 30); g.fillStyle = m.bad ? `rgba(255,110,90,${a})` : `rgba(255,226,154,${a})`; g.fillText(m.t, m.c.x, m.c.y - 40 - (1.4 - m.l) * 30); }
      for (const c of cs) if (c.drift > 20) { g.font = '800 15px Inter, sans-serif'; g.fillStyle = '#9fe0ff'; g.fillText(Math.round(c.drift) + ' ×' + (1 + Math.min(4, c.dTime * .8)).toFixed(1), c.x, c.y + 42); }
      if (cs.length > 1) for (const c of cs) { g.font = '800 13px Inter, sans-serif'; g.fillStyle = c.c.col; g.fillText('P' + (c.ci + 1), c.x, c.y - 26); }
      g.restore();
      // HUD
      g.textBaseline = 'middle';
      cs.forEach((c, i) => {
        const right = i === 1, x = right ? G.W - 16 * d : 16 * d, al = right ? 'right' : 'left', y0 = 78 * d; g.textAlign = al;
        const lt = S.phase === 'race' && !c.done ? S.t - c.lapT0 : 0, best = c.laps.length ? Math.min(...c.laps) : 0;
        g.font = `800 ${20 * d}px Inter, sans-serif`; g.fillStyle = cs.length > 1 ? c.c.col : '#fff'; g.fillText((cs.length > 1 ? 'P' + (i + 1) + '  ' : '') + (B.loop ? 'KÖR ' + Math.min(LAPS, c.lap + 1) + '/' + LAPS : Math.min(100, Math.round(Math.max(0, c.pr) / B.finProg * 100)) + '%'), x, y0);
        g.font = `700 ${15 * d}px Inter, sans-serif`; g.fillStyle = '#ffe29a'; g.fillText(c.done ? 'CÉL ' + fmtS(c.total) : fmtS(Math.max(0, lt)), x, y0 + 24 * d);
        g.font = `600 ${12 * d}px Inter, sans-serif`; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText((best ? 'LEGJOBB ' + fmtS(best) + '  ·  ' : '') + Math.round(c.spd * .36) + ' km/h', x, y0 + 44 * d);
        g.fillText('DRIFT ' + c.dTotal.toLocaleString('hu-HU'), x, y0 + 62 * d);
        if (B.T.hills) g.fillText('▲ ' + Math.round(c.z * 1200) + ' m', x, y0 + 80 * d);
      });
      if (cs.length === 1 || G.W / d > 700) minimap(g, cs.length > 1 ? G.W / 2 - 70 * d : G.W - 166 * d, cs.length > 1 ? G.H - 120 * d : 70 * d, 150 * d, 104 * d);
      if (touchUI && S.phase !== 'res') for (const b of btns()) { const on = [...TP.values()].includes(b.id); g.fillStyle = on ? 'rgba(255,216,74,.35)' : 'rgba(4,7,14,.45)'; g.strokeStyle = 'rgba(255,216,74,.5)'; g.lineWidth = 2 * d;
        g.beginPath(); g.arc(b.x, b.y, b.r, 0, 6.283); g.fill(); g.stroke(); g.fillStyle = '#ffe29a'; g.textAlign = 'center'; g.font = `800 ${b.t.length > 2 ? 12 * d : 20 * d}px Inter, sans-serif`; g.fillText(b.t, b.x, b.y + 1); }
      if (S.res) {
        const w = Math.min(420 * d, G.W - 30 * d), h = 210 * d, x = (G.W - w) / 2, y = (G.H - h) / 2, c = cs[0];
        g.fillStyle = 'rgba(4,7,14,.92)'; g.strokeStyle = '#ffd84a'; g.lineWidth = 2 * d; rr(x, y, w, h, 16 * d); g.fill(); g.stroke(); g.textAlign = 'center';
        g.font = `900 ${24 * d}px Cinzel, serif`; g.fillStyle = '#ffe29a'; g.fillText(cs.length > 1 ? (cs.filter(c => c.done).sort((a, b) => a.total - b.total)[0] || cs[0]).ci === 0 ? 'P1 NYERT!' : 'P2 NYERT!' : 'CÉLBA ÉRTÉL', G.W / 2, y + 32 * d);
        g.font = `700 ${16 * d}px Inter, sans-serif`; g.fillStyle = '#fff'; g.fillText(c.done ? 'IDŐ ' + fmtS(c.total) + (S.res.newBest ? '  🏆 ÚJ REKORD' : '') : 'NEM ÉRTÉL CÉLBA', G.W / 2, y + 72 * d);
        g.fillStyle = 'rgba(255,255,255,.75)'; g.font = `600 ${13 * d}px Inter, sans-serif`; g.fillText('Legjobb kör: ' + (c.laps.length ? fmtS(Math.min(...c.laps)) : '–') + '   ·   Drift: ' + c.dTotal.toLocaleString('hu-HU'), G.W / 2, y + 100 * d);
        g.fillText('Pálya pontszám: ' + pointsFor(B, S.res.best).toLocaleString('hu-HU') + (S.res.pts && S.res.pts < pointsFor(B, S.res.best) ? '  (most: ' + S.res.pts + ')' : ''), G.W / 2, y + 124 * d);
        g.font = `800 ${20 * d}px Inter, sans-serif`; g.fillStyle = '#ffd84a'; g.fillText('ÖSSZPONTSZÁM: ' + S.res.tot.toLocaleString('hu-HU'), G.W / 2, y + 166 * d);
      }
    },
    art(c, x, t) {
      const W = c.width, H = c.height; x.fillStyle = '#2b3038'; x.fillRect(0, 0, W, H);
      x.strokeStyle = '#3b3f46'; x.lineWidth = 46; x.lineCap = 'round'; x.beginPath(); x.ellipse(W / 2, H / 2, W * .36, H * .3, 0, 0, 6.283); x.stroke();
      x.strokeStyle = 'rgba(232,195,74,.8)'; x.lineWidth = 2; x.setLineDash([10, 12]); x.beginPath(); x.ellipse(W / 2, H / 2, W * .36, H * .3, 0, 0, 6.283); x.stroke(); x.setLineDash([]);
      const a = t * 1.3, px = W / 2 + Math.cos(a) * W * .36, py = H / 2 + Math.sin(a) * H * .3, h = Math.atan2(Math.cos(a) * H * .3, -Math.sin(a) * W * .36) + .5;
      x.fillStyle = 'rgba(230,230,230,.25)'; for (let i = 1; i < 6; i++) { const b = a - i * .08; x.beginPath(); x.arc(W / 2 + Math.cos(b) * W * .36, H / 2 + Math.sin(b) * H * .3, 4 + i * 2, 0, 6.283); x.fill(); }
      x.save(); x.translate(px, py); x.rotate(h); x.fillStyle = '#ff5a4d'; x.fillRect(-14, -7, 28, 14); x.fillStyle = '#1a2432'; x.fillRect(2, -6, 7, 12); x.fillStyle = '#fffbe0'; x.fillRect(12, -6, 2, 3); x.fillRect(12, 3, 2, 3); x.restore();
    }
  };
  return game;
};
