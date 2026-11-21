/* HGWS Arcade – Mozdonyvezető: táj a vasút alatt (domborzat, erdők, mezők, utak, települések épületei).
   Országos réteg: taj.jpg + taj_osztaly.png + taj.json (tools/vasut_taj.py). Közelről a Holtváros megyei térképeit tölti be
   (…/holtvaros/terkep/<megye>.json, .bin: utcák, .haz: épületek), a megyei helyi koordinátákat X = ax + x·sx, Y = ay + y alakítja országossá. */
'use strict';
window.Taj = (() => {
  const MDIR = '../holtvaros/terkep/';
  let T = null, IMG = null, CLS = null, CW = 0, CH = 0, R = 250, Z = null, ZC = 1000, ZX = 0, ZY = 0, ROADS = [], ready = false, ver = '';
  const CNT = new Map();
  const img = u => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = u; });
  const hsh = (a, b) => { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function load(v) { ver = v; const q = '?v=' + v;
    return Promise.all([fetch('taj.json' + q).then(r => r.json()), img('taj.jpg' + q), img('taj_osztaly.png' + q)]).then(([t, a, b]) => {
      T = t; R = t.R; IMG = a; const c = document.createElement('canvas'); c.width = b.width; c.height = b.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(b, 0, 0);
      const d = x.getImageData(0, 0, b.width, b.height).data; CW = b.width; CH = b.height; CLS = new Uint8Array(CW * CH); for (let i = 0; i < CLS.length; i++) CLS[i] = Math.round(d[i * 4] / 50);
      const zb = atob(t.z.b); Z = new Uint16Array(zb.length / 2); for (let i = 0; i < Z.length; i++) Z[i] = zb.charCodeAt(2 * i) | zb.charCodeAt(2 * i + 1) << 8; ZC = t.z.c; ZX = t.z.nx; ZY = t.z.ny;
      ROADS = t.r.map(r => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 1; i < r.length; i += 2) { x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); y0 = Math.min(y0, r[i + 1]); y1 = Math.max(y1, r[i + 1]); } return { t: r[0], p: r, b: [x0, y0, x1, y1] }; }).sort((a, b) => a.t - b.t);
      ready = true; }); }
  // tengerszint feletti magasság (m), bilineárisan
  function zAt(x, y) { if (!Z) return 100; const fx = Math.max(0, Math.min(ZX - 1.001, x / ZC)), fy = Math.max(0, Math.min(ZY - 1.001, y / ZC)), i = fx | 0, j = fy | 0, u = fx - i, w = fy - j, A = Z[j * ZX + i], B = Z[j * ZX + i + 1], C = Z[(j + 1) * ZX + i], D = Z[(j + 1) * ZX + i + 1];
    return (A * (1 - u) + B * u) * (1 - w) + (C * (1 - u) + D * u) * w; }
  const clsAt = (x, y) => { const i = Math.floor(x / R), j = Math.floor(y / R); return i < 0 || j < 0 || i >= CW || j >= CH ? 4 : CLS[j * CW + i]; };

  const CROPS = ['#8f8656', '#6f7a3e', '#55703a', '#7a6548', '#9c9447', '#80754d', '#4f6a3a', '#a08f5c', '#6a5a43'];
  /* ---------- megyei részletek ---------- */
  const pairs = f => f;
  function bboxF(f, b) { for (let i = 0; i < f.length; i += 2) { if (f[i] < b[0]) b[0] = f[i]; if (f[i] > b[2]) b[2] = f[i]; if (f[i + 1] < b[1]) b[1] = f[i + 1]; if (f[i + 1] > b[3]) b[3] = f[i + 1]; } return b; }
  function pathOf(rings, closed) { const p = new Path2D(), b = [1e9, 1e9, -1e9, -1e9]; for (const f of rings) { if (f.length < 4) continue; p.moveTo(f[0], f[1]); for (let i = 2; i < f.length; i += 2) p.lineTo(f[i], f[i + 1]); if (closed) p.closePath(); bboxF(f, b); } return { p, b }; }
  function county(id, need) { let c = CNT.get(id); if (c) { c.used = performance.now(); if (need > c.need) more(c, need); return c; }
    c = { id, st: 0, used: performance.now(), need: 0, md: null, bin: null, haz: null, BT: new Map(), HT: new Map() }; CNT.set(id, c); const q = '?v=' + ver;
    fetch(MDIR + id + '.json' + q).then(r => r.json()).then(md => { const p = T.m[id]; c.ax = p[0]; c.sx = p[1]; c.ay = p[2]; c.W = md.W; c.H = md.H;
      c.green = md.green.map(([k, rs]) => ({ k, ...pathOf(rs, true) })); c.wpoly = md.wpoly.map(rs => pathOf(rs, true)); c.water = md.water.map(([w, f]) => ({ w, ...pathOf([f]) }));
      c.roads = md.roads.map(([t, f]) => ({ t, ...pathOf([f]) })).sort((a, b) => a.t - b.t); c.st = 1; GEN++; }).catch(() => { c.st = -1; GEN++; });
    // csak a régóta nem használt megyét dobjuk el (megyehatárnál egyszerre 5–6 megye is látszhat)
    if (CNT.size > 6) { let o = null; const now = performance.now(); for (const v of CNT.values()) if (v !== c && now - v.used > 20000 && (!o || v.used < o.used)) o = v; if (o) CNT.delete(o.id); }
    more(c, need); return c; }
  function more(c, need) { if (need >= 2 && c.need < 2) { const q = '?v=' + ver; c.need = 2;
      fetch(MDIR + c.id + '.bin' + q).then(r => r.arrayBuffer()).then(b => { c.bin = new DataView(b); c.TXN = c.bin.getUint16(4, true); c.TYN = c.bin.getUint16(6, true); GEN++; }).catch(() => { c.fail2 = 1; GEN++; });
      fetch(MDIR + c.id + '.haz' + q).then(r => r.arrayBuffer()).then(b => { c.haz = new DataView(b); GEN++; }).catch(() => { c.fail2 = 1; GEN++; }); } }
  // utcák egy 2048 m-es csempében (a szomszéd csempe csomópontjaira is mutathat)
  function nodesOf(c, t) { const DV = c.bin, io = 8 + 12 * t, off = DV.getUint32(io, true), nn = DV.getUint16(io + 4, true), bx = Math.floor(t / c.TYN) * 2048, by = (t % c.TYN) * 2048, o = new Float32Array(nn * 2);
    for (let i = 0; i < nn; i++) { o[2 * i] = bx + DV.getUint16(off + i * 4, true) / 32; o[2 * i + 1] = by + DV.getUint16(off + i * 4 + 2, true) / 32; } return o; }
  function streets(c, t) { let r = c.BT.get(t); if (r) return r; const DV = c.bin, io = 8 + 12 * t, off = DV.getUint32(io, true), nn = DV.getUint16(io + 4, true), ne = DV.getUint32(io + 8, true);
    r = [new Path2D(), new Path2D()]; c.BT.set(t, r); if (!off) return r; const A = nodesOf(c, t), nb = new Map();
    for (let i = 0, o = off + nn * 4; i < ne; i++, o += 6) { const a = DV.getUint16(o, true), b = DV.getUint16(o + 2, true), cc = DV.getUint8(o + 4), f = DV.getUint8(o + 5), t2 = t + (Math.floor(cc / 3) - 1) * c.TYN + (cc % 3 - 1);
      let B = t2 === t ? A : nb.get(t2); if (!B) { B = nodesOf(c, t2); nb.set(t2, B); } const p = r[(f & 7) ? 1 : 0]; p.moveTo(A[2 * a], A[2 * a + 1]); p.lineTo(B[2 * b], B[2 * b + 1]); }
    return r; }
  function houses(c, t) { let r = c.HT.get(t); if (r) return r; const HV = c.haz, io = 8 + 12 * t, off = HV.getUint32(io, true), nr = HV.getUint32(io + 4, true), pb = HV.getUint32(io + 8, true); r = { p: new Path2D(), n: 0 }; c.HT.set(t, r); if (!off) return r;
    const bx = Math.floor(t / c.TYN) * 2048, by = (t % c.TYN) * 2048, p = r.p;
    for (let i = 0, o = off; i < nr; i++, o += 8) { const x = bx + HV.getUint16(o, true) / 32, y = by + HV.getUint16(o + 2, true) / 32, hw = HV.getUint8(o + 4) / 2, hd = HV.getUint8(o + 5) / 2, a = HV.getUint8(o + 6) / 256 * Math.PI, cs = Math.cos(a), sn = Math.sin(a);
      [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].forEach(([u, v], k) => { const X = x + cs * u - sn * v, Y = y + sn * u + cs * v; k ? p.lineTo(X, Y) : p.moveTo(X, Y); }); p.closePath(); r.n++; }
    for (let o = off + nr * 8, end = off + nr * 8 + pb; o < end;) { const x = bx + HV.getUint16(o, true) / 32, y = by + HV.getUint16(o + 2, true) / 32, n = HV.getUint8(o + 4); o += 6;
      for (let i = 0; i < n; i++, o += 4) { const px = x + HV.getInt16(o, true) / 4, py = y + HV.getInt16(o + 2, true) / 4; i ? p.lineTo(px, py) : p.moveTo(px, py); } p.closePath(); r.n++; }
    if (c.HT.size > 400) c.HT.delete(c.HT.keys().next().value); return r; }

  // lombkorona-minta (1 képpont = 1 m a megyei koordinátákban)
  let FPAT = null, PPAT = null;
  function canopy(g, n, base, dark, light) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); if (base) { x.fillStyle = base; x.fillRect(0, 0, 128, 128); }
    for (let i = 0; i < n; i++) { const h = hsh(i, 7 * n), px = hsh(i * 3, 11) * 128, py = hsh(i * 5, 13) * 128, r = 2.4 + 3.2 * hsh(i, 99);
      for (const [ox, oy] of [[0, 0], [128, 0], [-128, 0], [0, 128], [0, -128]]) { x.fillStyle = 'rgba(0,0,0,.28)'; x.beginPath(); x.arc(px + ox + 1.3, py + oy + 1.8, r, 0, 6.283); x.fill(); x.fillStyle = h > .55 ? light : dark; x.beginPath(); x.arc(px + ox, py + oy, r, 0, 6.283); x.fill(); x.fillStyle = 'rgba(170,210,130,.16)'; x.beginPath(); x.arc(px + ox - r * .3, py + oy - r * .35, r * .45, 0, 6.283); x.fill(); } }
    return g.createPattern(c, 'repeat'); }
  const RST = { 5: ['#d79a4e', 24, 2.4], 4: ['#d6b26a', 18, 2], 3: ['#cbbf98', 14, 1.6], 2: ['#aea78f', 10, 1.2], 1: ['#9c9686', 8, 1] };
  /* ---------- egy terület kirajzolása tetszőleges vászonra (csempékhez): X, Y a világ → képpont, s képpont/méter ---------- */
  function paint(g, s, d, x0, y0, x1, y1, X, Y) { let partial = false;
    // mezők (250 m-es osztályrács alapján)
    const i0 = Math.max(0, Math.floor(x0 / R)), i1 = Math.min(CW - 1, Math.floor(x1 / R)), j0 = Math.max(0, Math.floor(y0 / R)), j1 = Math.min(CH - 1, Math.floor(y1 / R)), P = R * s;
    for (let gx = i0; gx <= i1; gx++) for (let gy = j0; gy <= j1; gy++) { const cl = CLS[gy * CW + gx], px = X(gx * R), py = Y(gy * R);
      if (cl === 0 || cl === 1 || cl === 3) { const vert = hsh(Math.floor(gx / 6), Math.floor(gy / 6)) < .5, ns = 1 + Math.floor(hsh(gx, gy) * 4), seg = P / ns;
        for (let q = 0; q < ns; q++) { const h = hsh(gx * 7 + q, gy * 13 + (vert ? 1 : 2)); g.globalAlpha = .5; g.fillStyle = CROPS[Math.floor(h * CROPS.length)]; if (vert) g.fillRect(px + q * seg, py, seg + .5, P + .5); else g.fillRect(px, py + q * seg, P + .5, seg + .5);
          if (h > .55 && seg > 6) { g.globalAlpha = .12; g.fillStyle = '#000'; for (let r = 1; r < 8; r++) if (vert) g.fillRect(px + q * seg + r * seg / 8, py, Math.max(.6, .8 * s), P); else g.fillRect(px, py + q * seg + r * seg / 8, P, Math.max(.6, .8 * s)); } }
        g.globalAlpha = .35; g.fillStyle = '#2d3524'; if (vert) g.fillRect(px, py, Math.max(.8, 2 * s), P); else g.fillRect(px, py, P, Math.max(.8, 2 * s)); }
      else if (cl === 2) { g.globalAlpha = .4; g.fillStyle = '#56604a'; g.fillRect(px, py, P + .5, P + .5); g.globalAlpha = .25; for (let q = 0; q < 14; q++) { g.fillStyle = q & 1 ? '#3f5a35' : '#6b7458'; g.fillRect(px + hsh(gx * 3 + q, gy) * P, py + hsh(gx, gy * 5 + q) * P, (3 + 6 * hsh(q, gx)) * s * 4, (3 + 6 * hsh(gy, q)) * s * 4); } } }
    g.globalAlpha = 1; g.lineCap = 'round'; g.lineJoin = 'round';
    const detail = s >= .12 * d, loaded = [];
    for (const id in T.m) { const m = T.m[id]; if (m[5] < x0 || m[3] > x1 || m[6] < y0 || m[4] > y1) continue; const c = county(id, detail ? 2 : 1); if (c.st === 1) loaded.push(c); else if (c.st === 0) partial = true; if (detail && c.st === 1 && (!c.bin || !c.haz) && !c.fail2) partial = true; }
    // országos főutak, ahol nincs megyei részlet
    if (!loaded.length) for (const pass of [0, 1]) for (const r of ROADS) { const b = r.b; if (b[2] < x0 || b[0] > x1 || b[3] < y0 || b[1] > y1) continue; const st = RST[r.t], p = r.p;
      g.beginPath(); g.moveTo(X(p[1]), Y(p[2])); for (let i = 3; i < p.length; i += 2) g.lineTo(X(p[i]), Y(p[i + 1])); const w = Math.max(st[2] * d, st[1] * s); g.strokeStyle = pass ? st[0] : 'rgba(20,18,14,.55)'; g.lineWidth = pass ? w : w + 1.6 * d; g.stroke(); }
    if (!FPAT) { FPAT = canopy(g, 260, '#203c25', '#2b5130', '#3a6638'); PPAT = canopy(g, 40, '#47703f', '#2f5a31', '#3d6b3a'); }
    for (const c of loaded) { const lx0 = (x0 - c.ax) / c.sx, lx1 = (x1 - c.ax) / c.sx, ly0 = y0 - c.ay, ly1 = y1 - c.ay, vis = b => !(b[2] < lx0 || b[0] > lx1 || b[3] < ly0 || b[1] > ly1);
      g.save(); g.setTransform(s * c.sx, 0, 0, s, X(c.ax), Y(c.ay)); const px = 1 / s;
      for (const o of c.wpoly) if (vis(o.b)) { g.fillStyle = '#2b5577'; g.fill(o.p, 'evenodd'); }
      for (const o of c.water) if (vis(o.b)) { g.strokeStyle = '#2b5577'; g.lineWidth = Math.max(o.w, 1.5 * d * px); g.stroke(o.p); }
      for (const o of c.green) if (vis(o.b)) { g.fillStyle = s > .09 * d ? (o.k ? PPAT : FPAT) : o.k ? '#47703f' : '#25432a'; g.fill(o.p, 'evenodd'); }
      if (detail && c.bin) { const t0x = Math.max(0, Math.floor(lx0 / 2048)), t1x = Math.min(c.TXN - 1, Math.floor(lx1 / 2048)), t0y = Math.max(0, Math.floor(ly0 / 2048)), t1y = Math.min(c.TYN - 1, Math.floor(ly1 / 2048));
        const sts = []; for (let tx = t0x; tx <= t1x; tx++) for (let ty = t0y; ty <= t1y; ty++) sts.push(streets(c, tx * c.TYN + ty));
        g.strokeStyle = 'rgba(20,18,14,.6)'; g.lineWidth = Math.max(9, 2.4 * d * px); for (const r of sts) { g.stroke(r[0]); g.stroke(r[1]); }
        g.strokeStyle = '#8a857a'; g.lineWidth = Math.max(6.5, 1.3 * d * px); for (const r of sts) g.stroke(r[0]);
        g.strokeStyle = '#b3ac98'; g.lineWidth = Math.max(8, 1.6 * d * px); for (const r of sts) g.stroke(r[1]);
        if (c.haz) { const hs = []; for (let tx = t0x; tx <= t1x; tx++) for (let ty = t0y; ty <= t1y; ty++) hs.push(houses(c, tx * c.TYN + ty));
          g.save(); g.translate(1.6, 2.2); g.fillStyle = 'rgba(0,0,0,.35)'; for (const r of hs) g.fill(r.p); g.restore();
          g.fillStyle = '#b8a58a'; for (const r of hs) g.fill(r.p); if (s > .4 * d) { g.strokeStyle = 'rgba(70,52,40,.55)'; g.lineWidth = .6 * d * px; for (const r of hs) g.stroke(r.p); } } }
      for (const pass of [0, 1]) for (const o of c.roads) { if (!vis(o.b) || (o.t < 2 && s < .05 * d)) continue; const st = RST[o.t] || RST[1], w = Math.max(st[2] * d * px, st[1]); g.strokeStyle = pass ? st[0] : 'rgba(20,18,14,.6)'; g.lineWidth = pass ? w : w + 1.6 * d * px; g.stroke(o.p); }
      g.restore(); }
    return partial; }

  /* ---------- csempegyorsítótár: 512 px-es csempék 2-hatvány nagyításokon ---------- */
  const TPX = 512, TC = new Map(); let GEN = 0, frameBudget = 0;
  function tile(k, tx, ty, d, make) { const key = k + ':' + tx + ':' + ty; let t = TC.get(key);
    if (t && (!t.partial || t.gen === GEN)) { TC.delete(key); TC.set(key, t); return t; }
    if (!make || frameBudget <= 0) return t && t.c ? t : null; frameBudget--;
    const s = 2 ** k, wsz = TPX / s, x0 = tx * wsz, y0 = ty * wsz, c = (t && t.c) || document.createElement('canvas'); c.width = c.height = TPX; const g = c.getContext('2d');
    g.clearRect(0, 0, TPX, TPX); const partial = paint(g, s, d, x0, y0, x0 + wsz, y0 + wsz, v => (v - x0) * s, v => (v - y0) * s);
    t = { c, partial, gen: GEN }; TC.delete(key); TC.set(key, t); while (TC.size > 72) TC.delete(TC.keys().next().value); return t; }
  /* ---------- rajz: g a vászon, s = képpont/méter (d-vel együtt), cx, cy a kamera közepe ---------- */
  function draw(g, W, H, s, d, cx, cy) { if (!ready) return false; const x0 = cx - W / 2 / s, x1 = cx + W / 2 / s, y0 = cy - H / 2 / s, y1 = cy + H / 2 / s, X = v => (v - cx) * s + W / 2, Y = v => (v - cy) * s + H / 2;
    g.imageSmoothingEnabled = true; g.drawImage(IMG, X(0), Y(0), CW * R * s, CH * R * s); g.lineCap = 'round'; g.lineJoin = 'round';
    if (s < .028 * d || !CLS) { // országos nézet: csak a főutak
      if (s > .004 * d) for (const pass of [0, 1]) for (const r of ROADS) { if (r.t === 2 && s < .008 * d) continue; const b = r.b; if (b[2] < x0 || b[0] > x1 || b[3] < y0 || b[1] > y1) continue; const st = RST[r.t], p = r.p;
        g.beginPath(); g.moveTo(X(p[1]), Y(p[2])); for (let i = 3; i < p.length; i += 2) g.lineTo(X(p[i]), Y(p[i + 1])); const w = Math.max(st[2] * d * (s < .01 * d ? .6 : 1), st[1] * s);
        g.strokeStyle = pass ? st[0] : 'rgba(20,18,14,.55)'; g.lineWidth = pass ? w : w + 1.6 * d; g.stroke(); }
      return true; }
    frameBudget = 2; const k = Math.max(-6, Math.min(1, Math.ceil(Math.log2(s) - .3))), ts = 2 ** k, wsz = TPX / ts, sc = s / ts, al = Math.min(1, (s / d - .028) / .015);
    g.globalAlpha = al; const want = [];
    for (let tx = Math.floor(x0 / wsz); tx * wsz < x1; tx++) for (let ty = Math.floor(y0 / wsz); ty * wsz < y1; ty++) want.push([tx, ty, Math.hypot((tx + .5) * wsz - cx, (ty + .5) * wsz - cy)]);
    want.sort((a, b) => a[2] - b[2]);
    for (const [tx, ty] of want) { let t = tile(k, tx, ty, d, true), dx = X(tx * wsz), dy = Y(ty * wsz), sz = wsz * s;
      if (t) { g.drawImage(t.c, Math.floor(dx), Math.floor(dy), Math.ceil(sz + dx - Math.floor(dx)) + 1, Math.ceil(sz + dy - Math.floor(dy)) + 1); continue; }
      // még nincs kész: a szülő (kisebb nagyítású) vagy gyermek csempe ideiglenesen
      for (let up = 1; up <= 3; up++) { const pk = k - up, pw = TPX / 2 ** pk, ptx = Math.floor(tx * wsz / pw), pty = Math.floor(ty * wsz / pw), pt = tile(pk, ptx, pty, d, false); if (!pt) continue;
        const f = TPX / 2 ** up, sx = (tx * wsz - ptx * pw) / pw * TPX, sy = (ty * wsz - pty * pw) / pw * TPX; g.drawImage(pt.c, sx, sy, f, f, Math.floor(dx), Math.floor(dy), Math.ceil(sz) + 1, Math.ceil(sz) + 1); break; } }
    g.globalAlpha = 1; return true; }
  /* ---------- a 3D nézet (harom.js) számára ---------- */
  // egy csempe (2^k képpont/méter, 512 képpont) átlátszatlan képe: alap domborzatkép + a részletek; visszaad: { partial, gen }
  function compose(x, k, tx, ty) { const s = 2 ** k, w = TPX / s; frameBudget = 1; const t = tile(k, tx, ty, 1, true); x.imageSmoothingEnabled = true; x.fillStyle = '#3a4a34'; x.fillRect(0, 0, TPX, TPX);
    x.drawImage(IMG, tx * w / R, ty * w / R, w / R, w / R, 0, 0, TPX, TPX); if (t) x.drawImage(t.c, 0, 0); return { partial: !t || t.partial, gen: GEN }; }
  // a megadott terület (világ-koordináta) épületcsempéi: [{ key, list() → [{ p: [x0, y0, …] világ-koordináta, h }] }]
  function bldTiles(x0, y0, x1, y1) { const o = []; if (!ready) return o; for (const id in T.m) { const m = T.m[id]; if (m[5] < x0 || m[3] > x1 || m[6] < y0 || m[4] > y1) continue; const c = county(id, 2); if (c.st !== 1 || !c.haz || !c.TXN) continue;
      const a = Math.max(0, Math.floor((x0 - c.ax) / c.sx / 2048)), b = Math.min(c.TXN - 1, Math.floor((x1 - c.ax) / c.sx / 2048)), d = Math.max(0, Math.floor((y0 - c.ay) / 2048)), e = Math.min(c.TYN - 1, Math.floor((y1 - c.ay) / 2048));
      for (let tx = a; tx <= b; tx++) for (let ty = d; ty <= e; ty++) { const t = tx * c.TYN + ty; o.push({ key: id + ':' + t, cx: c.ax + (tx + .5) * 2048 * c.sx, cy: c.ay + (ty + .5) * 2048, list: () => bld(c, t) }); } } return o; }
  function bld(c, t) { const HV = c.haz, io = 8 + 12 * t, off = HV.getUint32(io, true), nr = HV.getUint32(io + 4, true), pb = HV.getUint32(io + 8, true), o = []; if (!off) return o; const bx = Math.floor(t / c.TYN) * 2048, by = (t % c.TYN) * 2048, WX = x => c.ax + x * c.sx, WY = y => c.ay + y;
    for (let i = 0, q = off; i < nr; i++, q += 8) { const x = bx + HV.getUint16(q, true) / 32, y = by + HV.getUint16(q + 2, true) / 32, hw = HV.getUint8(q + 4) / 2, hd = HV.getUint8(q + 5) / 2, a = HV.getUint8(q + 6) / 256 * Math.PI, cs = Math.cos(a), sn = Math.sin(a), p = [];
      for (const [u, v] of [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]]) p.push(WX(x + cs * u - sn * v), WY(y + sn * u + cs * v)); o.push({ p, h: HV.getUint8(q + 7) }); }
    for (let q = off + nr * 8, end = off + nr * 8 + pb; q < end;) { const x = bx + HV.getUint16(q, true) / 32, y = by + HV.getUint16(q + 2, true) / 32, n = HV.getUint8(q + 4), h = HV.getUint8(q + 5), p = []; q += 6; for (let i = 0; i < n; i++, q += 4) p.push(WX(x + HV.getInt16(q, true) / 4), WY(y + HV.getInt16(q + 2, true) / 4)); if (n >= 3) o.push({ p, h }); }
    return o; }
  return { load, draw, zAt, clsAt, compose, bldTiles, get gen() { return GEN; }, towns: () => (T && T.tw) || [], get ready() { return ready; } };
})();
