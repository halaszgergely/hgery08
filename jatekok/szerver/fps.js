/* HGWS Arcade – Szerverfarm: a bejárható 3D terem.
   A rackek és a fali csatlakozók a soruk síkjában vannak (2D rajz textúraként, lásd szerver.js: rackTo / wallTo),
   a szabadon lerakott eszközök bárhol állhatnak a teremben, elforgatva is ({ wx, wy, wz, yaw } méterben).
   Minden képkockában kiszámoljuk, mire mutat a célkereszt (aim), a műveleteket a szerver.js doClick() végzi.
   Lépték: K méter / rajzegység (1U = 20 egység = 4,4 cm). Az r-edik sor előlapja a z = -r·ROWZ síkban van. */
import * as THREE from '../atemelotelep/lib/three.module.min.js?v=202611221413';

const DEPTH = .85, REACH = 2.9, EYE = 1.62, MAXP = 1500;
let A = null, K = .0022, ROWZ = 3.2, cv = null, R = null, scene = null, cam = null, room = null, cabG = null, held = null, ghost = null, pts = null, wallT = null;
export let on = false;
const P = { x: .35, z: 1.25, yaw: 0, pitch: -.3 }, stick = { x: 0, y: 0 }, keys = {}, RT = new Map(), LM = [], FLOW = [], RC = new THREE.Raycaster();
let sig = '', gen = -1, ledT = 0, aim = {}, lastHover = -1, rot = 0, clock = 0;
const PC = ['#ff6bd6', '#7dffb0', '#ffe066', '#6bd6ff', '#ffffff'].map(c => new THREE.Color(c));
const L = (c, o) => new THREE.MeshLambertMaterial({ color: c, ...o });
const rowOf = y => Math.max(0, Math.floor((y + 990) / A.RY)), to3 = (x, y, dz = 0) => { const r = rowOf(y); return new THREE.Vector3(x * K, Math.max(.012, (r * A.RY - y) * K), -r * ROWZ + dz); };
const dims = () => { const st = A.SITE[A.S.site], cols = Math.min(A.ROW, st.racks), rows = Math.ceil(st.racks / A.ROW); return { st, cols, rows, x0: -.95, x1: cols * A.RX * K + 1.3, z0: -(rows - 1) * ROWZ - DEPTH - .7, z1: 2.9, h: A.S.site ? 3.3 : 2.7 }; };
const dH = d => A.DEV[d.t].u * A.U * K, dD = d => A.wallMount(d) ? .05 : A.DEV[d.t].k === 'tbl' ? .62 : .5;
// szabadon álló eszköz előlapjának pontja (lx, ly: rajzegység a bal felső saroktól) → térbeli pont
const loose3 = (d, lx, ly, out = .012) => { const s = Math.sin(d.yaw), c = Math.cos(d.yaw), a = (lx - A.RW / 2) * K; return new THREE.Vector3(d.wx + c * a + s * out, d.wy + dH(d) - ly * K, d.wz - s * a + c * out); };
const port3 = (p, out) => p.L ? loose3(p.dev, p.x, p.y, out) : to3(p.x, p.y, out === undefined ? .012 : out), wp3 = w => w.length === 3 ? new THREE.Vector3(w[0], w[1], w[2]) : to3(w[0], w[1], .012);

function tex(w, h, k) { const c = document.createElement('canvas'); c.width = Math.ceil(w * k); c.height = Math.ceil(h * k); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { c, x: c.getContext('2d'), t, k }; }
function build() { if (room) { scene.remove(room); room.traverse(o => { o.geometry?.dispose(); if (o.material?.map) o.material.map.dispose(); o.material?.dispose?.(); }); } RT.clear(); LM.length = 0; room = new THREE.Group(); scene.add(room);
  const D = dims(), st = D.st, w = D.x1 - D.x0, d = D.z1 - D.z0, add = (geo, m, x, y, z, par) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); (par || room).add(o); return o; };
  const fl = add(new THREE.PlaneGeometry(w, d), L(st.bg[2]), (D.x0 + D.x1) / 2, 0, (D.z0 + D.z1) / 2); fl.rotation.x = -Math.PI / 2; const ce = add(new THREE.PlaneGeometry(w, d), L(A.S.site ? '#cfd3d8' : '#6d6a66'), (D.x0 + D.x1) / 2, D.h, (D.z0 + D.z1) / 2); ce.rotation.x = Math.PI / 2;
  const wm = L(st.bg[0]), wm2 = L(st.bg[1]); add(new THREE.PlaneGeometry(w, D.h), wm, (D.x0 + D.x1) / 2, D.h / 2, D.z0); add(new THREE.PlaneGeometry(w, D.h), wm2, (D.x0 + D.x1) / 2, D.h / 2, D.z1).rotation.y = Math.PI; add(new THREE.PlaneGeometry(d, D.h), wm2, D.x0, D.h / 2, (D.z0 + D.z1) / 2).rotation.y = Math.PI / 2; add(new THREE.PlaneGeometry(d, D.h), wm, D.x1, D.h / 2, (D.z0 + D.z1) / 2).rotation.y = -Math.PI / 2;
  if (!A.S.site) { const gm = L('#8f9499'); for (let i = 0; i < 7; i++) add(new THREE.BoxGeometry(Math.min(3, w - .6), .3, .03), gm, (D.x0 + D.x1) / 2, .2 + i * .33, D.z1 - .02); }
  for (let r = 0; r < D.rows; r++) for (let x = D.x0 + 1.2; x < D.x1; x += 2.6) { add(new THREE.BoxGeometry(1.2, .04, .16), new THREE.MeshBasicMaterial({ color: '#f4f7ff' }), x, D.h - .03, -r * ROWZ + 1.1); const pl = new THREE.PointLight(0xdfe8ff, 9, 9, 1.6); pl.position.set(x, D.h - .25, -r * ROWZ + 1.1); room.add(pl); }
  // fali csatlakozótábla (a 0. sor síkjában, egy pilléren)
  const b = A.wallBox(), bw = (b[2] - b[0]) * K, bh = (b[3] - b[1]) * K; add(new THREE.BoxGeometry(bw + .08, D.h, DEPTH), L('#5d6066'), (b[0] + b[2]) / 2 * K, D.h / 2, -DEPTH / 2 - .01); wallT = tex(b[2] - b[0], b[3] - b[1], 4); add(new THREE.PlaneGeometry(bw, bh), new THREE.MeshBasicMaterial({ map: wallT.t }), (b[0] + b[2]) / 2 * K, -(b[1] + b[3]) / 2 * K, .002);
  // rackek (a kicsik asztalon)
  const body = L('#16181c'), k = st.racks > 16 ? 2 : 3; for (let i = 0; i < st.racks; i++) { const r = A.S.racks[i], [x] = A.rackXY(i), row = Math.floor(i / A.ROW), zf = -row * ROWZ, rw = (A.RW + 28) * K;
    if (!r) { const g = new THREE.BufferGeometry().setFromPoints([[0, 0], [rw, 0], [rw, -DEPTH], [0, -DEPTH], [0, 0]].map(q => new THREE.Vector3(x * K + q[0], .01, zf + q[1]))); room.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .25 }))); continue; }
    const hh = (A.RACK[r.t].u * A.U + 14) * K, lf = A.lift(i) * K, dp = lf ? .55 : DEPTH; if (lf) { add(new THREE.BoxGeometry(rw + .12, .04, .7), L('#6b4a2c'), x * K + rw / 2, lf - .02, zf - .36); for (const q of [[.02, -.06], [rw - .02, -.06], [.02, -.66], [rw - .02, -.66]]) add(new THREE.BoxGeometry(.05, lf - .04, .05), L('#4e3620'), x * K + q[0], (lf - .04) / 2, zf + q[1]); }
    add(new THREE.BoxGeometry(rw, hh, dp), body, x * K + rw / 2, lf + hh / 2, zf - dp / 2 - .001); const t = tex(A.RW + 28, A.RACK[r.t].u * A.U + 14, k); add(new THREE.PlaneGeometry(rw, hh), new THREE.MeshBasicMaterial({ map: t.t }), x * K + rw / 2, lf + hh / 2, zf + .002); RT.set(i, t); }
  // kábeltálcák: soronként egy létra a rackek fölött, a sorok között átkötők
  { const ty = A.TRAY * K, wh = L('#eef1f4'), og = L('#ff8a2a'), xs = A.trayXs().map(x => x * K), xa = -.6, xb = xs[1] + .15, len = xb - xa, rung = [], clip = [], M = new THREE.Matrix4();
    for (let r = 0; r < D.rows; r++) { const zf = -r * ROWZ; for (const dz of [-.03, -.27]) add(new THREE.BoxGeometry(len, .025, .025), wh, (xa + xb) / 2, ty - .02, zf + dz); for (let x = xa + .1; x < xb; x += .3) rung.push(M.makeTranslation(x, ty - .02, zf - .15).clone()); for (let x = xa + .05; x < xb; x += .15) clip.push(M.makeTranslation(x, ty + .005, zf - .03).clone()); for (let x = xa + .3; x < xb; x += 1.8) for (const dz of [-.03, -.27]) add(new THREE.BoxGeometry(.015, D.h - ty, .015), wh, x, (D.h + ty) / 2, zf + dz);
      if (r) for (const x of xs) { for (const dx of [-.12, .12]) add(new THREE.BoxGeometry(.025, .025, ROWZ), wh, x + dx, ty - .02, zf + ROWZ / 2); for (let z = zf + .2; z < zf + ROWZ; z += .3) { const m = M.makeTranslation(x, ty - .02, z).clone(); m.multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)); rung.push(m); } } }
    const ri = new THREE.InstancedMesh(new THREE.BoxGeometry(.02, .02, .24), wh, rung.length); rung.forEach((m, i) => ri.setMatrixAt(i, m)); room.add(ri); const ci = new THREE.InstancedMesh(new THREE.BoxGeometry(.022, .05, .035), og, clip.length); clip.forEach((m, i) => ci.setMatrixAt(i, m)); room.add(ci); }
  // szabadon lerakott eszközök: csoport a helyén elforgatva; a doboz és az előlap célozható
  for (const dv of A.S.loose) { const h = dH(dv), dp = dD(dv), g = new THREE.Group(); g.position.set(dv.wx, dv.wy, dv.wz); g.rotation.y = dv.yaw; room.add(g); if (A.DEV[dv.t].k === 'tbl') { const tw = A.RW * K + .1, tp = add(new THREE.BoxGeometry(tw, .04, dp), L('#6b4a2c'), 0, h - .02, -dp / 2 + .05, g); tp.userData = { dev: dv }; LM.push(tp); for (const q of [[-tw / 2 + .04, 0], [tw / 2 - .04, 0], [-tw / 2 + .04, -dp + .1], [tw / 2 - .04, -dp + .1]]) { const lg = add(new THREE.BoxGeometry(.05, h - .04, .05), L('#4e3620'), q[0], (h - .04) / 2, q[1], g); lg.userData = { dev: dv }; LM.push(lg); } continue; }
    const bx = add(new THREE.BoxGeometry(A.RW * K, h, dp), body, 0, h / 2, -dp / 2 - .001, g); bx.userData = { dev: dv };
    if (A.wallMount(dv) && dv.wy > .1) add(new THREE.BoxGeometry(.03, dv.wy, .03), L('#3a3f46'), 0, -dv.wy / 2, -.07, g); const t = tex(A.RW, A.DEV[dv.t].u * A.U, 4), fp = add(new THREE.PlaneGeometry(A.RW * K, h), new THREE.MeshBasicMaterial({ map: t.t }), 0, h / 2, .002, g); fp.userData = { dev: dv, front: 1 }; LM.push(bx, fp); RT.set('L' + dv.id, t); }
  room.updateMatrixWorld(true); gen = -1; }
const paint = i => { const t = RT.get(i); if (!t) return; if (typeof i === 'number') { if (!A.S.racks[i]) return; A.rackTo(t.x, i, t.k); } else { const d = A.S.loose.find(d => 'L' + d.id === i); if (!d) return; A.looseTo(t.x, d, t.k); } t.t.needsUpdate = true; };

/* ---------- kábelek és adatforgalom ---------- */
// pts: [{ v: Vector3, pl: a sor síkjában van-e }] → belógó vonal pontjai
function path(pts, tight) { const o = []; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], len = a.v.distanceTo(b.v), sag = tight ? .006 + len * .04 : .03 + Math.min(.35, len * .2), n = 10, bulge = a.pl && b.pl ? (tight ? .02 : .07) : 0;
    for (let j = i > 1 ? 1 : 0; j <= n; j++) { const t = j / n, f = 4 * t * (1 - t) * .75, v = a.v.clone().lerp(b.v, t); v.y = Math.max(.012, v.y - sag * f); v.z += f * bulge; o.push(v); } } return o; }
const alive = id => { if (!id) return true; const o = A.C.d[id]; return !!o && (o.k === 'srv' ? o.st === 'ok' : !!o.live && o.bw > 0); };
function cables() { if (cabG) { scene.remove(cabG); cabG.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); }); } cabG = new THREE.Group(); scene.add(cabG); FLOW.length = 0;
  for (const c of A.S.cables) { const pa = A.PM.get(A.pkey(...c.a)), pb = A.PM.get(A.pkey(...c.b)); if (!pa || !pb) continue; const w = c.w || [], net = c.a[1] === 'n', p = [{ v: port3(pa), pl: !pa.L }, ...w.map(q => ({ v: wp3(q), pl: q.length === 2 })), { v: port3(pb), pl: !pb.L }], v = path(p, w.length > 0);
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v, false, 'centripetal'), Math.min(200, v.length * 2), net ? .0035 : .0055, 5); cabG.add(new THREE.Mesh(g, L(net ? A.NC[c.c % A.NC.length] : '#1b1d20')));
    for (const q of w) { const tr = q.length === 2 && Math.abs(rowOf(q[1]) * A.RY - A.TRAY - q[1]) < 1, m = new THREE.Mesh(new THREE.TorusGeometry(.011, .003, 5, 10), L(tr ? '#ff8a2a' : '#b9c0c8')); m.position.copy(wp3(q)); if (q.length === 3 && q[1] < .05) m.rotation.x = Math.PI / 2; cabG.add(m); }
    if (net && alive(c.a[0]) && alive(c.b[0])) { const cu = g.parameters.path, len = cu.getLength(), n = Math.max(2, Math.min(16, Math.ceil(len / .4))); for (let i = 0; i < n && FLOW.length < MAXP; i++) FLOW.push({ cu, len, ph: Math.random(), dir: i & 1 ? 1 : -1, sp: .5 + Math.random() * .5, col: PC[Math.random() * PC.length | 0] }); } }
  const col = pts.geometry.attributes.color; FLOW.forEach((f, i) => col.setXYZ(i, f.col.r, f.col.g, f.col.b)); col.needsUpdate = true; pts.geometry.setDrawRange(0, FLOW.length); }
function flow(dt) { clock += dt; const pos = pts.geometry.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < FLOW.length; i++) { const f = FLOW[i]; let t = (f.ph + f.dir * clock * f.sp / f.len) % 1; if (t < 0) t += 1; f.cu.getPoint(t, v); pos.setXYZ(i, v.x, v.y, v.z + .004); } pos.needsUpdate = true; }

/* ---------- célzás ---------- */
function stackTop(d) { let top = d; for (let n = 0; n < 40; n++) { const up = A.S.loose.find(o => o !== top && Math.abs(o.wx - top.wx) < .02 && Math.abs(o.wz - top.wz) < .02 && Math.abs(o.wy - (top.wy + dH(top))) < .01); if (!up) break; top = up; } return top; }
function looseOk(t, dev) { const D = dims(), h = dH(dev); if (t.wy + h > 2.1) return false; if (t.wall) return true; const s = Math.sin(t.yaw), c = Math.cos(t.yaw), cx = t.wx - s * .25, cz = t.wz - c * .25; if (cx < D.x0 + .3 || cx > D.x1 - .3 || cz < D.z0 + .3 || cz > D.z1 - .3) return false;
  if (!t.stack) { for (let i = 0; i < D.st.racks; i++) { if (!A.S.racks[i]) continue; const x = A.rackXY(i)[0] * K, zf = -Math.floor(i / A.ROW) * ROWZ; if (cz > zf - DEPTH - .3 && cz < zf + .3 && cx > x - .3 && cx < x + (A.RW + 28) * K + .3) return false; } if (cx < -.15 && cz < .3 && cz > -DEPTH - .3) return false; if (A.S.loose.some(o => !A.wallMount(o) && o.wy < h && Math.hypot(o.wx - Math.sin(o.yaw) * .25 - cx, o.wz - Math.cos(o.yaw) * .25 - cz) < .55)) return false; } return true; }
function pick() { const dir = new THREE.Vector3(); cam.getWorldDirection(dir); const o = cam.position, D = dims(), pl = A.place, sel = A.sel, a = {};
  // a sorok síkja
  let Pn = null; if (Math.abs(dir.z) > 1e-4) for (let r = 0; r < D.rows; r++) { const t = (-r * ROWZ - o.z) / dir.z; if (t <= .05 || t > REACH || (Pn && t > Pn.t)) continue; const X = o.x + dir.x * t, Y = o.y + dir.y * t; if (Y < 0 || Y > 3) continue; Pn = { t, x: X / K, y: r * A.RY - Y / K, r }; }
  if (Pn) { Pn.p = A.hitPort(Pn.x, Pn.y); Pn.h = A.hitU(Pn.x, Pn.y); const b = A.wallBox(); Pn.solid = !!(Pn.p || Pn.h || (!Pn.r && Pn.x > b[0] && Pn.x < b[2] && Pn.y > b[1] && Pn.y < b[3]) || Math.abs(Pn.r * A.RY - A.TRAY - Pn.y) < 45); }
  // szabadon álló eszközök
  RC.set(o, dir); RC.far = REACH; const hit = RC.intersectObjects(LM, false)[0], Lh = hit ? { t: hit.distance, d: hit.object.userData.dev, front: hit.object.userData.front, uv: hit.uv, pt: hit.point } : null;
  // padló
  let F = null; if (dir.y < -.02) { const t = o.y / -dir.y; if (t < 4) F = { t, x: o.x + dir.x * t, z: o.z + dir.z * t }; }
  if (pl) { const wm = A.wallMount(pl), h = dH(pl);
    if (Pn && Pn.h && A.DEV[pl.t].k !== 'tbl' && (!Lh || Pn.t < Lh.t)) { const [rx, ry] = A.rackXY(Pn.h.ri); a.pl = { rack: Pn.h, ok: A.free(Pn.h.ri, Pn.h.u, A.DEV[pl.t].u), box: [to3(rx + 14 + A.RW / 2, ry + 7 + Pn.h.u * A.U + A.DEV[pl.t].u * A.U / 2, .02), 0, .03] }; }
    else if (Lh) { const top = stackTop(Lh.d); a.pl = { wx: top.wx, wy: top.wy + dH(top), wz: top.wz, yaw: top.yaw, stack: 1 }; }
    else if (wm && Pn && (!F || Pn.t < F.t)) a.pl = { wx: Pn.x * K, wy: Math.max(0, (Pn.r * A.RY - Pn.y) * K - h / 2), wz: -Pn.r * ROWZ, yaw: 0, wall: 1 };
    else if (F) a.pl = { wx: F.x, wy: 0, wz: F.z, yaw: Math.round(Math.atan2(o.x - F.x, o.z - F.z) / (Math.PI / 12)) * (Math.PI / 12) + rot };
    if (a.pl && !a.pl.rack) { const t = a.pl; t.ok = looseOk(t, pl); const s = Math.sin(t.yaw), c = Math.cos(t.yaw), dp = dD(pl); t.box = [new THREE.Vector3(t.wx - s * dp / 2, t.wy + h / 2, t.wz - c * dp / 2), t.yaw, dp]; } return a; }
  const useP = Pn && (Pn.solid || sel), c = [useP && ['P', Pn.t], Lh && ['L', Lh.t], sel && F && ['F', F.t]].filter(Boolean).sort((x, y) => x[1] - y[1])[0];
  if (!c) return a; if (c[0] === 'P') { a.x = Pn.x; a.y = Pn.y; a.p = Pn.p; a.h = Pn.h; a.d = Pn.h && Pn.h.dev; }
  else if (c[0] === 'L') { a.d = Lh.d; a.pt = [Lh.pt.x, Lh.pt.y + .01, Lh.pt.z]; if (Lh.front && Lh.uv) { const lx = Lh.uv.x * A.RW, ly = (1 - Lh.uv.y) * A.DEV[Lh.d.t].u * A.U; let bd = 9; for (const p of A.RP['L' + Lh.d.id] || []) { const dd = Math.hypot(p.x - lx, p.y - ly); if (dd < bd) { bd = dd; a.p = p; } } } }
  else a.pt = [F.x, .012, F.z]; return a; }
export function interact() { A.setAim(aim); A.doClick(); }

/* ---------- indítás ---------- */
export function init(canvas, api) { A = api; K = A.K; ROWZ = A.ROWZ; cv = canvas; R = new THREE.WebGLRenderer({ canvas, antialias: true }); R.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); scene = new THREE.Scene(); scene.background = new THREE.Color('#0b0e12'); cam = new THREE.PerspectiveCamera(72, 1, .03, 80); cam.rotation.order = 'YXZ'; scene.add(new THREE.HemisphereLight(0xeaf0ff, 0x4a4e55, 2.4));
  held = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x4cc9f0 })); held.frustumCulled = false; scene.add(held); ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: .4, depthWrite: false })); ghost.visible = false; scene.add(ghost);
  { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'), gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, '#fff'); gr.addColorStop(.35, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXP * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAXP * 3), 3)); g.setDrawRange(0, 0); pts = new THREE.Points(g, new THREE.PointsMaterial({ size: .035, map: new THREE.CanvasTexture(c), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); pts.frustumCulled = false; scene.add(pts); }
  cv.addEventListener('click', e => { if (e.pointerType && e.pointerType !== 'mouse') return; if (document.pointerLockElement !== cv) { try { const r = cv.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (_) {} return; } interact(); });
  cv.addEventListener('contextmenu', e => { e.preventDefault(); A.cancel(); });
  cv.addEventListener('wheel', e => { e.preventDefault(); if (A.place) rot += Math.sign(e.deltaY) * Math.PI / 12; }, { passive: false });
  document.addEventListener('mousemove', e => { if (!on || document.pointerLockElement !== cv) return; P.yaw -= e.movementX * .0022; P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch - e.movementY * .0022)); });
  // érintés: a bal oldalon húzva járás, a jobb oldalon nézelődés, koppintás: művelet
  const TP = new Map(); cv.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; cv.setPointerCapture(e.pointerId); TP.set(e.pointerId, { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, m: 0, mv: e.clientX < innerWidth * .4 }); });
  cv.addEventListener('pointermove', e => { const t = TP.get(e.pointerId); if (!t) return; const dx = e.clientX - t.x, dy = e.clientY - t.y; t.m += Math.abs(dx) + Math.abs(dy); t.x = e.clientX; t.y = e.clientY; if (t.mv) { stick.x = Math.max(-1, Math.min(1, (t.x - t.x0) / 60)); stick.y = Math.max(-1, Math.min(1, (t.y - t.y0) / 60)); } else { P.yaw -= dx * .005; P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch - dy * .005)); } });
  for (const ev of ['pointerup', 'pointercancel']) cv.addEventListener(ev, e => { const t = TP.get(e.pointerId); if (!t) return; TP.delete(e.pointerId); if (t.mv) stick.x = stick.y = 0; if (t.m < 8 && ev === 'pointerup') interact(); });
  addEventListener('keydown', e => { if (e.target.tagName !== 'INPUT') keys[e.code] = 1; }); addEventListener('keyup', e => { keys[e.code] = 0; }); addEventListener('blur', () => { for (const k in keys) keys[k] = 0; }); addEventListener('resize', size); }
function size() { if (!R) return; R.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
export function start() { on = true; size(); document.querySelector('#xh').hidden = false; sig = ''; }
export function stop() { on = false; document.querySelector('#xh').hidden = true; if (document.pointerLockElement === cv) document.exitPointerLock(); }
export const look = (x, z, yaw, pitch) => { P.x = x; P.z = z; P.yaw = yaw; P.pitch = pitch; };

export function frame(dt) { if (!on) return; const S = A.S, D = dims(), s2 = S.site + '|' + S.racks.map(r => r ? r.t : '-').join(',') + '|' + S.loose.map(d => [d.id, d.wx, d.wy, d.wz, d.yaw].join(':')).join(',');
  if (s2 !== sig) { sig = s2; build(); P.x = Math.max(D.x0 + .3, Math.min(D.x1 - .3, P.x)); P.z = Math.max(D.z0 + .3, Math.min(D.z1 - .3, P.z)); }
  // mozgás
  const busy = A.busy, f = busy ? 0 : (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - stick.y, sd = busy ? 0 : (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + stick.x; if (f || sd) { const v = (keys.ShiftLeft ? 4.2 : 2.2) * dt / Math.max(1, Math.hypot(f, sd)), sn = Math.sin(P.yaw), cs = Math.cos(P.yaw); let nx = P.x + (-sn * f + cs * sd) * v, nz = P.z + (-cs * f - sn * sd) * v;
    nx = Math.max(D.x0 + .3, Math.min(D.x1 - .3, nx)); nz = Math.max(D.z0 + .3, Math.min(D.z1 - .3, nz)); const rw = D.cols * A.RX * K;
    for (let r = 0; r < D.rows; r++) { const zf = -r * ROWZ, xa = r ? -.25 : D.x0, inX = x => x > xa && x < rw + .15, inZ = z => z > zf - DEPTH - .3 && z < zf + .35; if (inX(nx) && inZ(nz)) { if (!inZ(P.z)) nz = P.z; else if (!inX(P.x)) nx = P.x; else nz = P.z > zf - DEPTH / 2 ? zf + .35 : zf - DEPTH - .3; } } P.x = nx; P.z = nz; }
  cam.position.set(P.x, keys.KeyC || keys.ControlLeft ? .85 : EYE, P.z); cam.rotation.set(P.pitch, P.yaw, 0); cam.updateMatrixWorld();
  // célzás
  const sel = A.sel, pl = A.place; if (!pl) rot = 0; aim = pick(); A.setAim(aim); A.setMouse(aim.x != null ? aim.x : 1e9, aim.x != null ? aim.y : 1e9);
  document.querySelector('#xh').classList.toggle('hot', !!(aim.p || aim.d || (aim.pl && aim.pl.ok)));
  if (A.gen !== gen) { gen = A.gen; for (const i of RT.keys()) paint(i); A.wallTo(wallT.x, wallT.k); wallT.t.needsUpdate = true; cables(); }
  else { const hv = aim.h ? aim.h.ri : -1; if (sel || pl) { if (lastHover >= 0 && lastHover !== hv) paint(lastHover); if (hv >= 0) paint(hv); } lastHover = sel || pl ? hv : -1;
    if ((ledT -= dt) <= 0) { ledT = .3; let n = 0; for (const i of RT.keys()) { if (typeof i !== 'number') { paint(i); continue; } const [x] = A.rackXY(i), zf = -Math.floor(i / A.ROW) * ROWZ; if (Math.hypot(x * K + .3 - P.x, zf - P.z) < 5 && n++ < 6) paint(i); } if (sel) { A.wallTo(wallT.x, wallT.k); wallT.t.needsUpdate = true; } } }
  // a lerakandó eszköz körvonala
  const gp = aim.pl; ghost.visible = !!gp; if (gp) { const [c, yaw, dp] = gp.box; ghost.position.copy(c); ghost.rotation.y = yaw; ghost.scale.set(A.RW * K, gp.rack ? dH(pl) : dH(pl), dp); ghost.material.color.set(gp.ok ? 0x5ee08a : 0xff5a4d); }
  // a kézben tartott kábel
  if (sel) { const p = [port3(sel, .03), ...sel.w.map(wp3)], dir = new THREE.Vector3(); cam.getWorldDirection(dir); p.push(aim.x != null ? to3(aim.x, aim.y, .03) : aim.pt ? new THREE.Vector3(...aim.pt) : cam.position.clone().addScaledVector(dir, .8).add(new THREE.Vector3(0, -.25, 0))); held.geometry.setFromPoints(p); held.material.color.set(sel.k === 'n' ? 0x4cc9f0 : 0x888888); held.visible = true; } else held.visible = false;
  flow(A.S.spd ? dt : 0); R.render(scene, cam); }
