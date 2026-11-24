/* HGWS Arcade – Mozdonyvezető: 3D nézet (külső követő kamera és vezetőállás).
   A vonat körüli ~2,5 km-t rajzolja: valódi domborzat (dem/*.png, tools/vasut_dem.py), a 2D térkép csempéi talajtextúraként (Taj.compose),
   épületek a megyei .haz fájlokból, fák az erdőkben, sínek töltéssel, peronok, állomásépületek, vonatok.
   Koordináták: jelenet x = világ x − OX, z = világ y − OY, y = magasság (m). */
import * as THREE from '../atemelotelep/lib/three.module.min.js?v=202611241055';

const V = new URL(import.meta.url).search, CH = 1024, CN = 32, RAD = 2600, BRAD = 1700, TRAD = 1500;
let A = null, cv = null, R = null, scene = null, camera = null, OX = 0, OY = 0, raf = 0;
export let on = false;
const cam = { az: 0, el: .38, dist: 90, cab: false, tx: 0, ty: 0, tz: 0, hd: 0 };
const hsh = (a, b) => { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/* ---------- domborzat ---------- */
let DI = null, demGen = 0; const DT = new Map();
function demTile(tx, ty) { const k = tx + '_' + ty; let t = DT.get(k); if (t !== undefined) return t; if (!DI || !DI.set.has(k)) { DT.set(k, null); return null; } DT.set(k, null);
  const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = DI.n + 1; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, DI.n + 1, DI.n + 1).data, a = new Float32Array((DI.n + 1) ** 2); for (let i = 0; i < a.length; i++) a[i] = (d[i * 4] * 256 + d[i * 4 + 1]) / 10; DT.set(k, a); demGen++; };
  im.src = 'dem/' + k + '.png' + V; return null; }
function Hraw(x, y) { if (DI) { const T = DI.c * DI.n, tx = Math.floor(x / T), ty = Math.floor(y / T), a = demTile(tx, ty); if (a) { const fx = (x - tx * T) / DI.c, fy = (y - ty * T) / DI.c, i = Math.min(DI.n - 1, fx | 0), j = Math.min(DI.n - 1, fy | 0), u = fx - i, w = fy - j, n = DI.n + 1, p = j * n + i; return (a[p] * (1 - u) + a[p + 1] * u) * (1 - w) + (a[p + n] * (1 - u) + a[p + n + 1] * u) * w; } } return window.Taj.zAt(x, y); }
// simított magasság: ezen fut a pálya (töltés és bevágás), így nincs hullámvasút
function Hs(x, y) { const d = 120; return (4 * Hraw(x, y) + 2 * (Hraw(x - d, y) + Hraw(x + d, y) + Hraw(x, y - d) + Hraw(x, y + d)) + Hraw(x - d, y - d) + Hraw(x + d, y - d) + Hraw(x - d, y + d) + Hraw(x + d, y + d)) / 16; }
const RC = 64, RG = new Set(), rk = (cx, cy) => cx * 65536 + cy;
function railGrid() { for (const e of A.E) { const p = e.p; for (let i = 0; i + 2 < p.length; i += 2) { const ax = p[i], ay = p[i + 1], bx = p[i + 2], by = p[i + 3], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 30)); for (let k = 0; k <= n; k++) RG.add(rk(Math.floor((ax + (bx - ax) * k / n) / RC), Math.floor((ay + (by - ay) * k / n) / RC))); } } }
function railW(x, y) { const cx = Math.floor(x / RC), cy = Math.floor(y / RC); let r2 = false; for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) if (RG.has(rk(cx + a, cy + b))) { if (Math.abs(a) < 2 && Math.abs(b) < 2) return 1; r2 = true; } return r2 ? .5 : 0; }
const Hg = (x, y) => { const w = railW(x, y); return w === 0 ? Hraw(x, y) : w === 1 ? Hs(x, y) : (Hraw(x, y) + Hs(x, y)) / 2; };
const Ht = (x, y) => Hs(x, y) + .55;

/* ---------- segédek ---------- */
const jobs = []; // időszeletelt építés: függvények, képkockánként néhány ms
const mat = { }; let treeGeo = null;
function prism(out, p, y0, y1, wall, roof) { // p: [x0, z0, …] jelenet-koordináta; out: { pos, col }
  const n = p.length / 2; let ar = 0; for (let i = 0; i < n; i++) { const j = (i + 1) % n; ar += p[2 * i] * p[2 * j + 1] - p[2 * j] * p[2 * i + 1]; } const cw = ar > 0, P = out.pos, C = out.col;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n, ax = p[2 * i], az = p[2 * i + 1], bx = p[2 * j], bz = p[2 * j + 1], sh = .72 + .28 * Math.abs((bx - ax) / (Math.hypot(bx - ax, bz - az) || 1));
    const q = !cw ? [ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y0, az, bx, y1, bz, ax, y1, az] : [bx, y0, bz, ax, y0, az, ax, y1, az, bx, y0, bz, ax, y1, az, bx, y1, bz]; for (let k = 0; k < 18; k++) P.push(q[k]); for (let k = 0; k < 6; k++) C.push(wall[0] * sh, wall[1] * sh, wall[2] * sh); }
  const pts = []; for (let i = 0; i < n; i++) pts.push(new THREE.Vector2(p[2 * i], p[2 * i + 1])); let tr; try { tr = THREE.ShapeUtils.triangulateShape(pts, []); } catch (_) { tr = []; }
  for (const t of tr) { const o = cw ? [t[0], t[2], t[1]] : t; for (const i of o) { P.push(p[2 * i], y1, p[2 * i + 1]); C.push(roof[0], roof[1], roof[2]); } } }
function meshOf(out, m) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(out.col, 3)); g.computeVertexNormals(); const me = new THREE.Mesh(g, m || mat.vc); me.matrixAutoUpdate = false; return me; }
const drop = o => { if (!o) return; scene.remove(o); o.traverse?.(x => { if (x.geometry && !x.geometry.userData.shared) x.geometry.dispose(); if (x.material?.map && x.userData.ownMap) x.material.map.dispose(); if (x.userData.ownMat) x.material.dispose(); }); };

/* ---------- talaj: 1024 m-es darabok a 2D térkép csempéjével ---------- */
const CHK = new Map();
function chunkGeo(c) { const n = CN + 1, pos = c.geo.attributes.position.array; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const wx = c.cx * CH + i * CH / CN, wy = c.cy * CH + j * CH / CN, k = (j * n + i) * 3; pos[k] = wx - OX; pos[k + 1] = Hg(wx, wy); pos[k + 2] = wy - OY; } c.geo.attributes.position.needsUpdate = true; c.geo.computeVertexNormals(); c.geo.computeBoundingSphere(); c.dg = demGen; }
function chunkTex(c) { const r = window.Taj.compose(c.x2, -1, c.cx, c.cy); c.tex.needsUpdate = true; c.tg = r.gen; c.partial = r.partial; if (c.trees) { drop(c.trees); c.trees = null; } if (!r.partial) jobs.push(() => chunkTrees(c)); }
function mkChunk(cx, cy) { const n = CN + 1, geo = new THREE.BufferGeometry(), uv = new Float32Array(n * n * 2), idx = []; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { uv[(j * n + i) * 2] = i / CN; uv[(j * n + i) * 2 + 1] = 1 - j / CN; }
  for (let j = 0; j < CN; j++) for (let i = 0; i < CN; i++) { const a = j * n + i; idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1); } geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * n * 3), 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = 512; const tex = new THREE.CanvasTexture(cvs); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const c = { cx, cy, geo, cvs, x2: cvs.getContext('2d', { willReadFrequently: true }), tex, mesh: null, trees: null }; c.mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex })); c.mesh.userData.ownMap = c.mesh.userData.ownMat = true; c.mesh.matrixAutoUpdate = false; chunkGeo(c); chunkTex(c); scene.add(c.mesh); CHK.set(cx + ':' + cy, c); }
function chunkTrees(c) { if (!CHK.has(c.cx + ':' + c.cy) || c.trees) return; const d = c.x2.getImageData(0, 0, 512, 512).data, M = [], st = 19; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), sc = new THREE.Vector3(), cols = [];
  for (let a = 0; a < CH / st; a++) for (let b = 0; b < CH / st; b++) { const gx = c.cx * 53 + a, gy = c.cy * 53 + b, lx = (a + hsh(gx, gy)) * st, ly = (b + hsh(gy + 7, gx)) * st; if (lx >= CH || ly >= CH) continue; const p = ((ly / 2 | 0) * 512 + (lx / 2 | 0)) * 4, r = d[p], g = d[p + 1], bl = d[p + 2];
      if (!(g > r * 1.5 && g > bl * 1.25 && r < 80)) continue; const wx = c.cx * CH + lx, wy = c.cy * CH + ly; if (railW(wx, wy) === 1 && hsh(gx + 3, gy) < .85) continue; const s = .7 + .8 * hsh(gx, gy + 11); v.set(wx - OX, Hg(wx, wy) - .2, wy - OY); q.setFromAxisAngle(up, hsh(gx + 1, gy + 1) * 6.28); sc.set(s, s * (.85 + .4 * hsh(gy, gx + 5)), s); M.push(m4.compose(v, q, sc).clone()); cols.push(.75 + .5 * hsh(gx + 9, gy + 2)); }
  if (!M.length) return; const im = new THREE.InstancedMesh(treeGeo, mat.tree, M.length); const col = new THREE.Color(); M.forEach((m, i) => { im.setMatrixAt(i, m); im.setColorAt(i, col.setScalar(cols[i])); }); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); c.trees = im; scene.add(im); }

/* ---------- épületek ---------- */
const BLD = new Map();
function bldBuild(t) { const g = new THREE.Group(); g.matrixAutoUpdate = false; BLD.set(t.key, g); scene.add(g); let list; try { list = t.list(); } catch (_) { return; } let i = 0;
  const step = () => { if (BLD.get(t.key) !== g) return; const out = { pos: [], col: [] }, end = Math.min(list.length, i + 900); for (; i < end; i++) { const b = list[i], n = b.p.length / 2, p = new Array(b.p.length); let sx = 0, sy = 0; for (let k = 0; k < n; k++) { sx += b.p[2 * k]; sy += b.p[2 * k + 1]; p[2 * k] = b.p[2 * k] - OX; p[2 * k + 1] = b.p[2 * k + 1] - OY; } sx /= n; sy /= n;
      const y = Hg(sx, sy), h = Math.max(3, b.h), r = hsh(sx * 3, sy * 3), r2 = hsh(sy * 5, sx * 7), wall = [.74 + .16 * r, .68 + .14 * r, .56 + .14 * r2], roof = h > 14 ? [.42 + .1 * r2, .42 + .1 * r2, .44 + .1 * r2] : r2 < .6 ? [.56 + .12 * r, .27 + .08 * r, .2 + .06 * r] : [.36 + .1 * r, .33 + .08 * r, .31 + .08 * r]; prism(out, p, y - 2, y + h, wall, roof); }
    if (out.pos.length) g.add(meshOf(out)); if (i < list.length) jobs.push(step); }; jobs.push(step); }

/* ---------- sínek ---------- */
const RAIL = new Map(), PIECE = 1200;
function railPiece(e, k) { const s0 = k * PIECE, s1 = Math.min(e.L, s0 + PIECE), n = Math.max(1, Math.ceil((s1 - s0) / 14)), top = { pos: [], uv: [] }, sk = { pos: [], col: [] }, rl = { pos: [], col: [] }; let prev = null;
  for (let i = 0; i <= n; i++) { const s = s0 + (s1 - s0) * i / n, p = A.at(e, s), nx = -Math.sin(p[2]), nz = Math.cos(p[2]), x = p[0] - OX, z = p[1] - OY, y = Ht(p[0], p[1]), cur = { x, y, z, nx, nz, s };
    if (prev) { const a = prev, b = cur, P = (o, yy, q) => [q.x + q.nx * o, q.y + yy, q.z + q.nz * o], quad = (A1, A2, B1, B2, arr) => { arr.push(...A1, ...B1, ...A2, ...A2, ...B1, ...B2); };
      quad(P(-2.3, 0, a), P(2.3, 0, a), P(-2.3, 0, b), P(2.3, 0, b), top.pos); const ua = a.s / 2.4, ub = b.s / 2.4; top.uv.push(ua, 0, ub, 0, ua, 1, ua, 1, ub, 0, ub, 1);
      quad(P(-4.6, -1.7, a), P(-2.3, 0, a), P(-4.6, -1.7, b), P(-2.3, 0, b), sk.pos); quad(P(2.3, 0, a), P(4.6, -1.7, a), P(2.3, 0, b), P(4.6, -1.7, b), sk.pos); for (let q = 0; q < 12; q++) sk.col.push(.42, .4, .36);
      for (const o of [-.72, .72]) { quad(P(o - .07, .2, a), P(o + .07, .2, a), P(o - .07, .2, b), P(o + .07, .2, b), rl.pos); quad(P(o - .07, 0, a), P(o - .07, .2, a), P(o - .07, 0, b), P(o - .07, .2, b), rl.pos); quad(P(o + .07, .2, a), P(o + .07, 0, a), P(o + .07, .2, b), P(o + .07, 0, b), rl.pos); for (let q = 0; q < 18; q++) rl.col.push(.74, .76, .8); } }
    prev = cur; }
  const g = new THREE.Group(); g.matrixAutoUpdate = false; const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(top.pos, 3)); tg.setAttribute('uv', new THREE.Float32BufferAttribute(top.uv, 2)); tg.computeVertexNormals(); const tm = new THREE.Mesh(tg, mat.ballast); tm.matrixAutoUpdate = false; g.add(tm, meshOf(sk, mat.vc2), meshOf(rl, mat.vc2)); return g; }

/* ---------- peronok, állomásépületek, feliratok ---------- */
const MISC = new Map();
function miscBuild(key, f, h, wall, roof) { const p = [], n = f.length / 2 - (f[0] === f[f.length - 2] && f[1] === f[f.length - 1] ? 1 : 0); if (n < 3) return null; let sx = 0, sy = 0; for (let i = 0; i < n; i++) { p.push(f[2 * i] - OX, f[2 * i + 1] - OY); sx += f[2 * i]; sy += f[2 * i + 1]; } const y = Ht(sx / n, sy / n) - .5, out = { pos: [], col: [] }; prism(out, p, y - 1.5, y + h, wall, roof); const m = meshOf(out); scene.add(m); MISC.set(key, m); return m; }
function label(key, text, wx, wy, col) { const c = document.createElement('canvas'), x = c.getContext('2d'); x.font = '700 30px Inter, sans-serif'; const w = Math.ceil(x.measureText(text).width) + 24; c.width = w; c.height = 46; x.font = '700 30px Inter, sans-serif'; x.fillStyle = 'rgba(8,12,18,.75)'; x.beginPath(); x.roundRect(0, 0, w, 46, 10); x.fill(); x.fillStyle = col; x.textBaseline = 'middle'; x.fillText(text, 12, 24);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, sizeAttenuation: false, depthTest: false, transparent: true })); sp.userData.ownMap = sp.userData.ownMat = true; sp.scale.set(w / 46 * .035, .035, 1); sp.position.set(wx - OX, Ht(wx, wy) + 22, wy - OY); sp.renderOrder = 5; scene.add(sp); MISC.set(key, sp); }

/* ---------- vonatok ---------- */
const TR = new Map(); let boxG = null, cylG = null;
const mm = hex => { const k = 'c' + hex; return mat[k] || (mat[k] = new THREE.MeshLambertMaterial({ color: hex })); };
function part(g, geo, col, sx, sy, sz, x, y, z, rz) { const m = new THREE.Mesh(geo, mm(col)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); if (rz) m.rotation.z = rz; g.add(m); return m; }
function vehicle(u, name) { const g = new THREE.Group(); g.rotation.order = 'YZX';
  if (u.l) { const L = A.LOCOS[u.l], len = L.len - .8, col = name ? '#22b8cf' : L.col; part(g, boxG, '#1b1b1b', len, .9, 2.4, 0, .75, 0);
    if (L.st) { part(g, cylG, '#262626', 1.5, len * .55, 1.5, len * .1, 2.5, 0, Math.PI / 2); part(g, boxG, '#1c1c1c', len * .2, 2.6, 2.9, -len * .12, 2.7, 0); part(g, boxG, '#3a2a1a', len * .26, 2, 2.8, -len * .36, 2.3, 0); part(g, cylG, '#0c0c0c', .35, 1, .35, len * .42, 3.9, 0); part(g, cylG, '#b08d2a', .35, .5, .35, len * .1, 3.6, 0); }
    else { part(g, boxG, col, len, 2.5, 2.9, 0, 2.45, 0); part(g, boxG, L.stripe || '#eee', len + .02, .25, 2.94, 0, 1.6, 0); part(g, boxG, '#2a2f36', len - 1.6, .3, 2.5, 0, 3.85, 0); part(g, boxG, '#141a22', .12, .9, 2.3, len / 2 - .02, 3, 0); if (L.cab2) part(g, boxG, '#141a22', .12, .9, 2.3, -len / 2 + .02, 3, 0); part(g, boxG, '#ffe29a', .1, .25, 1.6, len / 2, 1.9, 0);
      if (L.el) for (const px of [-len * .28, len * .28]) { part(g, boxG, '#333', 1.6, .08, .08, px, 4.6, 0); part(g, boxG, '#333', .08, .7, .08, px, 4.3, 0); } }
    return g; }
  const C = A.CARGO[u.cg], len = A.CAR_L - 1.2, t = C.t; part(g, boxG, '#1b1b1b', len, .7, 2.3, 0, .8, 0);
  if (t === 'open') { part(g, boxG, C.body || '#6b3f2a', len, 1.7, 2.8, 0, 2, 0); part(g, boxG, C.col, len - .4, .3, 2.4, 0, 2.8, 0); }
  else if (t === 'box') part(g, boxG, C.col, len, 2.7, 2.8, 0, 2.5, 0);
  else if (t === 'hopper') { part(g, boxG, '#8f8c84', len, 2.3, 2.8, 0, 2.3, 0); part(g, boxG, C.col, len - 1, .25, 1.2, 0, 3.55, 0); }
  else if (t === 'tank') { part(g, cylG, C.col === '#2a2a2a' ? '#2a2a2a' : '#c4c4c4', 1.4, len - .6, 1.4, 0, 2.55, 0, Math.PI / 2); part(g, cylG, '#555', .4, .4, .4, 0, 4, 0); }
  else if (t === 'logs') { for (const [yy, zz] of [[1.6, -.7], [1.6, .7], [2.6, 0]]) part(g, cylG, '#8a5a2b', .55, len - 1, .55, 0, yy, zz, Math.PI / 2); for (const px of [-len / 2 + .5, 0, len / 2 - .5]) { part(g, boxG, '#222', .12, 2.2, .12, px, 2.2, -1.3); part(g, boxG, '#222', .12, 2.2, .12, px, 2.2, 1.3); } }
  else if (t === 'cont') { const cc = ['#2e7d6b', '#b5462f', '#2f5fa0', '#c9a24a']; for (const s of [-1, 1]) part(g, boxG, cc[(s + 1 + (u.cg.length)) % 4 | 0], len / 2 - .3, 2.5, 2.5, s * len / 4, 2.45, 0); }
  else if (t === 'coil') { for (const px of [-len * .3, 0, len * .3]) part(g, cylG, '#c3cad2', 1.1, 1.6, 1.1, px, 2.2, 0, 0).rotation.x = Math.PI / 2; }
  else if (t === 'cars') { const cc = ['#b5462f', '#e8e8e8', '#2f5fa0']; for (let i = 0; i < 3; i++) { part(g, boxG, cc[i], 3.6, .7, 1.7, (i - 1) * 4.4, 1.6, 0); part(g, boxG, '#222b36', 2, .55, 1.5, (i - 1) * 4.4, 2.2, 0); } }
  else part(g, boxG, C.col, len, 2.4, 2.8, 0, 2.3, 0);
  return g; }
function trainSync(id, cons, pt, name) { const sig = cons.map(u => u.l || u.cg).join(','); let t = TR.get(id); if (!t || t.sig !== sig) { if (t) drop(t.g); const g = new THREE.Group(); t = { g, sig, v: [] }; for (let k = cons.length - 1; k >= 0; k--) { const u = cons[k], len = u.l ? A.LOCOS[u.l].len : A.CAR_L, m = vehicle(u, name); g.add(m); t.v.push({ m, len, rev: k > 0 && k === cons.length - 1 && !!u.l }); } scene.add(g); TR.set(id, t); }
  let x = 0; for (const v of t.v) { const a = pt(x + .4), b = pt(x + v.len - .4), ya = Ht(a[0], a[1]), yb = Ht(b[0], b[1]), dx = b[0] - a[0], dz = b[1] - a[1]; v.m.position.set((a[0] + b[0]) / 2 - OX, (ya + yb) / 2 + .2, (a[1] + b[1]) / 2 - OY); v.m.rotation.y = -Math.atan2(dz, dx) + (v.rev ? Math.PI : 0); v.m.rotation.z = Math.atan2(yb - ya, Math.hypot(dx, dz) || 1) * (v.rev ? -1 : 1); x += v.len; } t.seen = frameN; }

/* ---------- a jelenet karbantartása ---------- */
let frameN = 0, scanT = 0;
function rebase(p) { for (const c of CHK.values()) { drop(c.mesh); drop(c.trees); c.tex.dispose(); } CHK.clear(); for (const g of BLD.values()) drop(g); BLD.clear(); for (const g of RAIL.values()) drop(g); RAIL.clear(); for (const g of MISC.values()) drop(g); MISC.clear(); for (const t of TR.values()) drop(t.g); TR.clear(); jobs.length = 0; OX = Math.round(p[0] / CH) * CH; OY = Math.round(p[1] / CH) * CH; }
let sGen = -1;
function scan(p) { const px = p[0], py = p[1], want = [];
  if (sGen !== demGen) { sGen = demGen; for (const g of BLD.values()) drop(g); BLD.clear(); for (const g of RAIL.values()) drop(g); RAIL.clear(); for (const g of MISC.values()) drop(g); MISC.clear(); for (const c of CHK.values()) if (c.trees) { drop(c.trees); c.trees = null; jobs.push(() => chunkTrees(c)); } }
  for (let cx = Math.floor((px - RAD) / CH); cx <= Math.floor((px + RAD) / CH); cx++) for (let cy = Math.floor((py - RAD) / CH); cy <= Math.floor((py + RAD) / CH); cy++) { const d = Math.hypot((cx + .5) * CH - px, (cy + .5) * CH - py); if (d < RAD + CH * .7) want.push([d, cx, cy]); }
  want.sort((a, b) => a[0] - b[0]); const keep = new Set(want.map(w => w[1] + ':' + w[2])); for (const [k, c] of CHK) if (!keep.has(k)) { drop(c.mesh); drop(c.trees); c.tex.dispose(); CHK.delete(k); }
  let made = 0; for (const [, cx, cy] of want) { const c = CHK.get(cx + ':' + cy); if (!c) { if (made++ < 2) mkChunk(cx, cy); continue; } if (c.dg !== demGen) chunkGeo(c); if (c.partial && c.tg !== window.Taj.gen) chunkTex(c); }
  // épületek
  const bt = window.Taj.bldTiles(px - BRAD, py - BRAD, px + BRAD, py + BRAD), bk = new Set(bt.map(t => t.key)); for (const [k, g] of BLD) if (!bk.has(k)) { drop(g); BLD.delete(k); } bt.sort((a, b) => Math.hypot(a.cx - px, a.cy - py) - Math.hypot(b.cx - px, b.cy - py)); for (const t of bt) if (!BLD.has(t.key)) { bldBuild(t); break; }
  // sínek
  const rk2 = new Set(), x0 = px - RAD, x1 = px + RAD, y0 = py - RAD, y1 = py + RAD; let rb = 0;
  for (const e of A.E) { if (e.bb[2] < x0 || e.bb[0] > x1 || e.bb[3] < y0 || e.bb[1] > y1 || e.tt >= 0) continue; for (let k = 0; k * PIECE < e.L; k++) { const m = A.at(e, Math.min(e.L, (k + .5) * PIECE)); if (Math.hypot(m[0] - px, m[1] - py) > RAD + PIECE * .6) continue; const key = e.i + ':' + k; rk2.add(key); if (!RAIL.has(key) && rb++ < 12) { const g = railPiece(e, k); scene.add(g); RAIL.set(key, g); } } }
  for (const [k, g] of RAIL) if (!rk2.has(k)) { drop(g); RAIL.delete(k); }
  // peronok, állomásépületek, feliratok
  const mk = new Set(), near = b => !(b[2] < px - TRAD || b[0] > px + TRAD || b[3] < py - TRAD || b[1] > py + TRAD);
  A.PL.forEach((q, i) => { if (!q.c || !near(q.bb)) return; const k = 'p' + i; mk.add(k); if (!MISC.has(k)) miscBuild(k, q.p, .95, [.62, .6, .56], [.66, .64, .6]); });
  A.SB.forEach((q, i) => { if (!near(q.bb)) return; const k = 's' + i; mk.add(k); if (!MISC.has(k)) miscBuild(k, q.p, 7.5, [.78, .52, .38], [.45, .22, .17]); });
  A.ST.forEach((st, i) => { if (!(st.big || st.ind) || Math.hypot(st.x - px, st.y - py) > RAD) return; const k = 'l' + i; mk.add(k); if (!MISC.has(k)) label(k, (st.ind ? A.IND[st.ind].i + ' ' : '') + st.n, st.x, st.y, st.ind ? '#f0d9a8' : '#ffffff'); });
  for (const [k, g] of MISC) if (!mk.has(k)) { drop(g); MISC.delete(k); } }

/* ---------- indítás, képkocka ---------- */
export function init(canvas, api) { A = api; cv = canvas; R = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); R.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  scene = new THREE.Scene(); const sky = new THREE.Color('#a8c6e6'); scene.background = sky; scene.fog = new THREE.Fog(sky, RAD * .35, RAD * .98); camera = new THREE.PerspectiveCamera(55, 1, 1, RAD * 1.6);
  scene.add(new THREE.HemisphereLight(0xdcecff, 0x5a5646, 1.15)); const sun = new THREE.DirectionalLight(0xfff1d6, 1.9); sun.position.set(-.55, 1, -.45); scene.add(sun);
  mat.vc = new THREE.MeshLambertMaterial({ vertexColors: true }); mat.tree = new THREE.MeshLambertMaterial({ vertexColors: true });
  { const c = document.createElement('canvas'); c.width = 64; c.height = 32; const x = c.getContext('2d'); x.fillStyle = '#77726a'; x.fillRect(0, 0, 64, 32); for (let i = 0; i < 260; i++) { x.fillStyle = i % 2 ? '#8a857c' : '#615c55'; x.fillRect(Math.random() * 64, Math.random() * 32, 2, 2); } x.fillStyle = '#4c3b2c'; for (let k = 0; k < 4; k++) x.fillRect(k * 16 + 4, 3, 7, 26); const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; mat.ballast = new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide }); mat.vc2 = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }); }
  boxG = new THREE.BoxGeometry(1, 1, 1); cylG = new THREE.CylinderGeometry(1, 1, 1, 12); boxG.userData.shared = cylG.userData.shared = true;
  { const parts = [[new THREE.CylinderGeometry(.22, .3, 3, 5), 1.5, [.36, .26, .16]], [new THREE.ConeGeometry(2.6, 5.5, 6), 5.2, [.2, .42, .2]], [new THREE.ConeGeometry(1.9, 4, 6), 7.6, [.25, .5, .24]]], pos = [], nor = [], col = []; for (const [g0, y, c] of parts) { const g = g0.toNonIndexed(); g.translate(0, y, 0); pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); for (let i = 0; i < g.attributes.position.count; i++) col.push(...c); }
    treeGeo = new THREE.BufferGeometry(); treeGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); treeGeo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); treeGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); treeGeo.userData.shared = true; }
  railGrid(); fetch('dem/index.json' + V).then(r => r.json()).then(j => { j.set = new Set(j.t); DI = j; demGen++; }).catch(() => {});
  // kamera: húzás – körbeforgatás, görgő – távolság
  let dr = null; cv.addEventListener('pointerdown', e => { dr = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; }); cv.addEventListener('pointermove', e => { if (!dr) return; cam.az += (e.clientX - dr.x) * .006; cam.el = Math.max(-.05, Math.min(1.45, cam.el + (e.clientY - dr.y) * .005)); dr.x = e.clientX; dr.y = e.clientY; });
  for (const ev of ['pointerup', 'pointercancel']) cv.addEventListener(ev, () => { dr = null; cv.style.cursor = 'grab'; }); cv.addEventListener('wheel', e => { e.preventDefault(); cam.dist = Math.max(12, Math.min(900, cam.dist * Math.exp(Math.max(-80, Math.min(80, e.deltaY)) * .0022))); }, { passive: false });
  addEventListener('resize', size); size(); }
function size() { if (!R) return; const w = innerWidth, h = innerHeight; R.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
export function start() { on = true; size(); const p = A.front(); rebase(p); cam.tx = p[0]; cam.tz = p[1]; cam.ty = Ht(p[0], p[1]); cam.hd = p[2]; scanT = 0; }
export function stop() { on = false; }
export function cab() { cam.cab = !cam.cab; cam.az = 0; cam.el = .38; }
export const _dbg = () => ({ scene, camera, THREE, MISC, BLD, RAIL, CHK });
export function frame(dt) { if (!on) return; frameN++; const S = A.S, L = A.trainLen(), f = A.front(), pm = A.along(Math.max(0, L - 8));
  if (Math.hypot(f[0] - OX, f[1] - OY) > 40000) rebase(f);
  if ((scanT -= dt) <= 0) { scanT = .25; scan(f); }
  const t0 = performance.now(); while (jobs.length && performance.now() - t0 < 7) jobs.shift()();
  trainSync('me', S.cons, x => A.along(Math.max(0, Math.min(L, x))), '');
  for (const a of A.agents()) { const q = a.pt(a.tl); if (Math.hypot(q[0] - f[0], q[1] - f[1]) < RAD) trainSync(a.id, a.cons, a.pt, a.name); }
  for (const [k, t] of TR) if (t.seen !== frameN) { drop(t.g); TR.delete(k); }
  // kamera
  const hd = Math.atan2(f[1] - pm[1], f[0] - pm[0]) + (S.v < -.5 ? 0 : 0), k = Math.min(1, dt * 6); let dh = hd - cam.hd; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); cam.hd += dh * Math.min(1, dt * 3);
  cam.tx += (f[0] - cam.tx) * k; cam.tz += (f[1] - cam.tz) * k; cam.ty += (Ht(f[0], f[1]) - cam.ty) * k; const X = cam.tx - OX, Z = cam.tz - OY, Y = cam.ty;
  if (cam.cab) { const c = Math.cos(hd), s = Math.sin(hd); camera.position.set(X + c * .4, Y + 3.3, Z + s * .4); const la = cam.az, pitch = -(cam.el - .38) * .8; camera.lookAt(X + Math.cos(hd + la) * 60, Y + 3.4 + pitch * 60, Z + Math.sin(hd + la) * 60); }
  else { const a = cam.hd + Math.PI + cam.az, ce = Math.cos(cam.el), cx = X - 6 * Math.cos(cam.hd) + Math.cos(a) * cam.dist * ce, cz = Z - 6 * Math.sin(cam.hd) + Math.sin(a) * cam.dist * ce; let cy = Y + 2.5 + Math.sin(cam.el) * cam.dist; cy = Math.max(cy, Hraw(cx + OX, cz + OY) + 2.5); camera.position.set(cx, cy, cz); camera.lookAt(X - 6 * Math.cos(cam.hd), Y + 2.5, Z - 6 * Math.sin(cam.hd)); }
  R.render(scene, camera); }
export const dbg = () => ({ chunks: CHK.size, bld: BLD.size, rail: RAIL.size, misc: MISC.size, trains: TR.size, jobs: jobs.length, dem: DT.size, demGen, tris: R.info.render.triangles, calls: R.info.render.calls });
