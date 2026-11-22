/* Nagy, nagyítható Magyarország-térkép: a domborzati háttérkép, közelítéskor a vármegyei OSM-adatokból rajzolt utak, vizek, erdők, helynevek;
   rajta a telephely, a fuvarok, a benzinkutak és a jármű. Görgő/csippentés: nagyítás, húzás: mozgatás, koppintás egy fuvarra: kijelölés. */
let megyek = () => ({}); export function setGeo(G) { megyek = G.megyek; }
const W_MAX = 527600, H_MAX = 329900;
let MAP = null; export function setMapImage(img) { MAP = img; }
const VEC = new Map(); let redrawCb = null;
function county(id) { let c = VEC.get(id); if (c) return c; c = { st: 0 }; VEC.set(id, c); const m = megyek()[id], ax = m[0], sx = m[1], ay = m[2];
  const conv = f => { const a = new Float32Array(f.length); let x0 = 1e12, z0 = 1e12, x1 = -1e12, z1 = -1e12; for (let i = 0; i < f.length; i += 2) { const X = ax + f[i] * sx, Z = ay + f[i + 1]; a[i] = X; a[i + 1] = Z; if (X < x0) x0 = X; if (X > x1) x1 = X; if (Z < z0) z0 = Z; if (Z > z1) z1 = Z; } a.bb = [x0, z0, x1, z1]; return a; };
  fetch('../holtvaros/terkep/' + id + '.json').then(r => r.json()).then(d => { c.green = d.green.map(([k, r]) => ({ k, r: r.map(conv) })); c.wpoly = d.wpoly.map(r => r.map(conv)); c.water = d.water.map(([w, f]) => ({ w, f: conv(f) }));
    c.rails = d.rails.map(conv); c.roads = d.roads.map(([k, f]) => ({ k, f: conv(f) })).sort((a, b) => a.k - b.k); c.labels = (d.labels || []).map(([lx, ly, n]) => [ax + lx * sx, ay + ly, n]).concat((d.towns || []).map(([n, lx, ly]) => [ax + lx * sx, ay + ly, n, 1])); c.st = 1; redrawCb?.(); }).catch(() => { c.st = -1; });
  return c; }
const RC = ['#ffffff', '#ffffff', '#fff3b8', '#ffd76a', '#ffb347', '#f08a3c'], RW = [5, 6, 8, 11, 15, 22], RMIN = [.6, .7, .9, 1.3, 1.7, 2.2];
const MV = { z: 1, cx: 0, cz: 0, init: false };
export function drawMap(cv, s, onPick) { const W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(2, devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; const x = cv.getContext('2d');
  const fit = Math.min(W / W_MAX, H / H_MAX) * .96; if (!MV.init) { MV.init = true; MV.z = 18; } if (s.follow) { MV.cx = s.p.x; MV.cz = s.p.z; }
  let k, ox, oy, hits = []; const X = wx => ox + wx * k, Y = wz => oy + wz * k, toW = (px, py) => [(px - ox) / k, (py - oy) / k];
  function draw() { MV.z = Math.max(1, Math.min(220, MV.z)); k = fit * MV.z; ox = W / 2 - MV.cx * k; oy = H / 2 - MV.cz * k; x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.fillStyle = '#0a0f14'; x.fillRect(0, 0, W, H); if (MAP) { x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(MAP, ox, oy, W_MAX * k, H_MAX * k); }
    const vx0 = -ox / k, vz0 = -oy / k, vx1 = (W - ox) / k, vz1 = (H - oy) / k, vis = bb => bb[2] >= vx0 && bb[0] <= vx1 && bb[3] >= vz0 && bb[1] <= vz1, path = (f, cl) => { x.moveTo(ox + f[0] * k, oy + f[1] * k); for (let i = 2; i < f.length; i += 2) x.lineTo(ox + f[i] * k, oy + f[i + 1] * k); if (cl) x.closePath(); };
    const cs = []; for (const id in megyek()) { const m = megyek()[id]; if (m[5] < vx0 || m[3] > vx1 || m[6] < vz0 || m[4] > vz1) continue; const c = county(id); if (c.st === 1) cs.push(c); }
    const a = Math.min(1, (k * 250 - 1.2) / 1.5); if (a > 0) { x.save(); x.globalAlpha = a; x.lineJoin = x.lineCap = 'round';
      for (const [kind, col] of [[0, 'rgba(46,96,52,.55)'], [1, 'rgba(98,160,84,.45)']]) { x.fillStyle = col; x.beginPath(); for (const c of cs) for (const g of c.green) if (g.k === kind) for (const r of g.r) if (vis(r.bb)) path(r, 1); x.fill('evenodd'); }
      x.fillStyle = '#3f86b5'; x.beginPath(); for (const c of cs) for (const rs of c.wpoly) if (rs[0] && vis(rs[0].bb)) for (const r of rs) path(r, 1); x.fill('evenodd');
      x.strokeStyle = '#3f86b5'; for (const c of cs) for (const w of c.water) if (vis(w.f.bb)) { x.lineWidth = Math.max(1, w.w * k); x.beginPath(); path(w.f); x.stroke(); }
      const minK = k * 250 > 6 ? 0 : k * 250 > 3.5 ? 2 : 3;
      for (let pass = 0; pass < 2; pass++) for (const c of cs) for (const r of c.roads) { if (r.k < minK || !vis(r.f.bb)) continue; const w = Math.max(RMIN[r.k], RW[r.k] * k); x.strokeStyle = pass ? RC[r.k] : 'rgba(40,30,20,.55)'; x.lineWidth = pass ? w : w + 1.6; x.beginPath(); path(r.f); x.stroke(); }
      x.strokeStyle = '#4b4038'; x.lineWidth = Math.max(1.4, 4 * k); x.beginPath(); for (const c of cs) for (const r of c.rails) if (vis(r.bb)) path(r); x.stroke();
      // a betöltött közeli utcák (a teljes úthálózat a jármű körül)
      if (s.segs && k * 250 > 4) { x.strokeStyle = '#f4f1ea'; for (let i = 0; i < s.segs.length; i += 8) { x.lineWidth = Math.max(1, s.segs[i + 4] * k); x.beginPath(); x.moveTo(X(s.segs[i]), Y(s.segs[i + 1])); x.lineTo(X(s.segs[i + 2]), Y(s.segs[i + 3])); x.stroke(); } }
      x.textAlign = 'center'; x.font = '600 11px Inter'; x.fillStyle = 'rgba(255,255,255,.9)'; x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 3;
      for (const c of cs) for (const [lx, lz, n, town] of c.labels) { if (!town && k * 250 < 9) continue; const px = X(lx), py = Y(lz); if (px < -40 || py < -10 || px > W + 40 || py > H + 10) continue; x.strokeText(n, px, py); x.fillText(n, px, py); }
      x.restore(); }
    if (s.route && s.route.length > 1) { x.lineJoin = x.lineCap = 'round'; for (const [c, w] of [['rgba(0,0,0,.6)', 8], ['#2aa7d9', 4.5]]) { x.strokeStyle = c; x.lineWidth = w; x.beginPath(); s.route.forEach((q, i) => i ? x.lineTo(X(q[0]), Y(q[1])) : x.moveTo(X(q[0]), Y(q[1]))); x.stroke(); } }
    hits = [];
    const pin = (wx, wz, c, r, lab, obj) => { const px = X(wx), py = Y(wz); if (px < -20 || py < -20 || px > W + 20 || py > H + 20) return; x.fillStyle = c; x.strokeStyle = '#000'; x.lineWidth = 2; x.beginPath(); x.arc(px, py, r, 0, 6.3); x.fill(); x.stroke();
      if (lab) { x.font = '800 11px Inter'; x.textAlign = 'center'; x.fillStyle = '#fff'; x.strokeStyle = 'rgba(0,0,0,.7)'; x.lineWidth = 3; x.strokeText(lab, px, py - r - 5); x.fillText(lab, px, py - r - 5); } if (obj) hits.push([px, py, obj]); };
    for (const k2 of s.kutak || []) pin(k2.x, k2.z, '#d9413a', 5, MV.z > 60 ? 'Benzinkút' : '');
    for (const j of s.jobs || []) pin(j.px, j.pz, j.sel ? '#2aa7d9' : '#9fd7ef', j.sel ? 8 : 6, j.sel || MV.z > 80 ? j.nev : '', j);
    for (const [ex, ez, en] of s.emps || []) pin(ex, ez, '#f08a24', 6, MV.z > 40 ? en : '');
    pin(s.base[0], s.base[1], '#2f9e4f', 9, 'HGWS telephely');
    const px = X(s.p.x), py = Y(s.p.z); x.save(); x.translate(px, py); x.rotate(-s.yaw); x.fillStyle = '#f2c230'; x.strokeStyle = '#000'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -12); x.lineTo(-8, 9); x.lineTo(8, 9); x.closePath(); x.fill(); x.stroke(); x.restore();
    const p10 = Math.pow(10, Math.floor(Math.log10(100 / k))), sk = [1, 2, 5, 10].map(f => f * p10).find(v => v * k >= 60) || 10 * p10, L = sk * k;
    x.fillStyle = 'rgba(9,14,20,.75)'; x.fillRect(10, H - 30, L + 20, 22); x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(20, H - 14); x.lineTo(20 + L, H - 14); x.stroke(); x.fillStyle = '#fff'; x.font = '700 10px Inter'; x.textAlign = 'left'; x.fillText(sk >= 1000 ? sk / 1000 + ' km' : sk + ' m', 22, H - 18); }
  draw(); redrawCb = () => { if (!cv.closest('[hidden]')) requestAnimationFrame(draw); }; cv._redraw = draw;
  const P2 = new Map(); let moved = 0, pinch = null;
  const zoomAt = (px, py, f) => { const [wx, wz] = toW(px, py); MV.z *= f; MV.z = Math.max(1, Math.min(220, MV.z)); const k2 = fit * MV.z; MV.cx = wx - (px - W / 2) / k2; MV.cz = wz - (py - H / 2) / k2; s.follow = false; draw(); };
  cv.onwheel = e => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.pow(1.0015, -e.deltaY * (e.deltaMode ? 30 : 1))); };
  cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); P2.set(e.pointerId, [e.clientX, e.clientY]); if (P2.size === 1) moved = 0; if (P2.size === 2) { const [a, b] = [...P2.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); moved = 99; } };
  cv.onpointermove = e => { const p = P2.get(e.pointerId); if (!p) return; const r = cv.getBoundingClientRect();
    if (P2.size === 1) { const ddx = e.clientX - p[0], ddy = e.clientY - p[1]; moved += Math.abs(ddx) + Math.abs(ddy); if (moved > 6) { MV.cx -= ddx / k; MV.cz -= ddy / k; s.follow = false; draw(); } }
    P2.set(e.pointerId, [e.clientX, e.clientY]); if (P2.size === 2 && pinch) { const [a, b] = [...P2.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); zoomAt((a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top, d / pinch); pinch = d; } };
  cv.onpointerup = cv.onpointercancel = e => { if (!P2.has(e.pointerId)) return; P2.delete(e.pointerId); if (P2.size < 2) pinch = null; if (e.type !== 'pointerup' || moved > 6 || P2.size) return;
    const r = cv.getBoundingClientRect(), cx = e.clientX - r.left, cy = e.clientY - r.top; let best = null, bd = 16; for (const [px, py, o] of hits) { const d = Math.hypot(px - cx, py - cy); if (d < bd) { bd = d; best = o; } } if (best && onPick) { onPick(best); draw(); } }; }
