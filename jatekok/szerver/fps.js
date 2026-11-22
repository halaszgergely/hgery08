/* HGWS Arcade – Szerverfarm: a bejárható 3D terem.
   Minden, amin port van, egy „felület”: a fali csatlakozótábla ('W'), a rackek előlapja ('R<i>') és a szabadon álló
   eszközök előlapja ('L<id>'). A felület rajza a szerver.js-ből jön textúraként (wallTo / rackTo / looseTo), a portok
   helye a felület saját rajzkoordinátáiban van; innen számoljuk térbe. A rackek rácsra (GR) illesztve, 90°-onként
   forgatva állnak, a szabad eszközök bárhol. Képkockánként kiszámoljuk, mire mutat a célkereszt (aim); a műveleteket
   a szerver.js doClick() végzi. Lépték: K méter / rajzegység (1U = 20 egység = 4,4 cm). */
import * as THREE from '../atemelotelep/lib/three.module.min.js?v=202611221437';

const REACH = 3, EYE = 1.62, MAXP = 2500, RD = .9, RWID = .6; // RD, RWID: a rack alapterülete
let A = null, K = .0022, cv = null, R = null, scene = null, cam = null, room = null, cabG = null, held = null, ghost = null, pts = null;
export let on = false;
const P = { x: 2.7, z: 4.2, yaw: 0, pitch: -.15 }, stick = { x: 0, y: 0 }, keys = {}, RT = new Map(), SF = new Map(), PL = [], FLOW = [], RC = new THREE.Raycaster();
let sig = '', gen = -1, ledT = 0, aim = {}, lastHover = '', rot = 0, clock = 0, site = -1;
const PC = ['#ff6bd6', '#7dffb0', '#ffe066', '#6bd6ff', '#ffffff'].map(c => new THREE.Color(c));
const L = (c, o) => new THREE.MeshLambertMaterial({ color: c, ...o }), V = (x, y, z) => new THREE.Vector3(x, y, z);
const room3 = () => A.ROOM[A.S.site], dH = d => A.DEV[d.t].u * A.U * K, dD = d => A.wallMount(d) ? .05 : A.DEV[d.t].k === 'tbl' ? .62 : .5, snapG = v => Math.round(Math.round(v / A.GR) * A.GR * 100) / 100;
// felület: { wx, wy, wz: az előlap alsó közepe, yaw, w, h: méret rajzegységben }
function surfaces() { SF.clear(); const W = A.wallDim(); SF.set('W', { wx: .75, wy: .55, wz: .02, yaw: 0, w: W.w, h: W.h }); A.S.racks.forEach((r, i) => SF.set('R' + i, { wx: r.x, wy: A.lift(i) * K, wz: r.z, yaw: r.rot * Math.PI / 2, w: A.RW + 28, h: A.RACK[r.t].u * A.U + 14 })); for (const d of A.S.loose) SF.set('L' + d.id, { wx: d.wx, wy: d.wy, wz: d.wz, yaw: d.yaw, w: A.RW, h: A.DEV[d.t].u * A.U }); }
const s3 = (f, lx, ly, out = .012) => { const s = Math.sin(f.yaw), c = Math.cos(f.yaw), a = (lx - f.w / 2) * K; return V(f.wx + c * a + s * out, f.wy + (f.h - ly) * K, f.wz - s * a + c * out); };
const port3 = (p, out) => s3(SF.get(p.sf), p.x, p.y, out), wp3 = w => V(w[0], w[1], w[2]);
// a rack alaprajza (tengelyekkel párhuzamos téglalap): [x0, z0, x1, z1]
const foot = (x, z, rt, dp = RD) => { const s = Math.round(Math.sin(rt * Math.PI / 2)), c = Math.round(Math.cos(rt * Math.PI / 2)), bx = x - s * dp, bz = z - c * dp, hw = RWID / 2; return [Math.min(x, bx) - Math.abs(c) * hw, Math.min(z, bz) - Math.abs(s) * hw, Math.max(x, bx) + Math.abs(c) * hw, Math.max(z, bz) + Math.abs(s) * hw]; };

function tex(w, h, k) { const c = document.createElement('canvas'); c.width = Math.ceil(w * k); c.height = Math.ceil(h * k); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { c, x: c.getContext('2d'), t, k }; }
function build() { if (room) { scene.remove(room); room.traverse(o => { o.geometry?.dispose(); if (o.material?.map) o.material.map.dispose(); o.material?.dispose?.(); }); } RT.clear(); PL.length = 0; surfaces(); room = new THREE.Group(); scene.add(room);
  const [W, D, H] = room3(), st = A.SITE[A.S.site], add = (geo, m, x, y, z, par) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); (par || room).add(o); return o; }, body = L('#16181c');
  const fl = add(new THREE.PlaneGeometry(W, D), L(st.bg[2]), W / 2, 0, D / 2); fl.rotation.x = -Math.PI / 2; const ce = add(new THREE.PlaneGeometry(W, D), L(A.S.site ? '#cfd3d8' : '#6d6a66'), W / 2, H, D / 2); ce.rotation.x = Math.PI / 2;
  const wm = L(st.bg[0]), wm2 = L(st.bg[1]); add(new THREE.PlaneGeometry(W, H), wm, W / 2, H / 2, 0); add(new THREE.PlaneGeometry(W, H), wm2, W / 2, H / 2, D).rotation.y = Math.PI; add(new THREE.PlaneGeometry(D, H), wm2, 0, H / 2, D / 2).rotation.y = Math.PI / 2; add(new THREE.PlaneGeometry(D, H), wm, W, H / 2, D / 2).rotation.y = -Math.PI / 2;
  if (!A.S.site) { const gm = L('#8f9499'); for (let i = 0; i < 7; i++) add(new THREE.BoxGeometry(Math.min(3, W - .6), .3, .03), gm, W / 2, .2 + i * .33, D - .02); }
  { const g = [], q = A.GR * 2; for (let x = 0; x <= W + .01; x += q) g.push(V(x, .004, 0), V(x, .004, D)); for (let z = 0; z <= D + .01; z += q) g.push(V(0, .004, z), V(W, .004, z)); room.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(g), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: .13 }))); }
  for (let z = 1.5; z < D; z += 3) for (let x = 1.4; x < W; x += 2.8) { add(new THREE.BoxGeometry(1.2, .04, .16), new THREE.MeshBasicMaterial({ color: '#f4f7ff' }), x, H - .03, z); const pl = new THREE.PointLight(0xdfe8ff, 9, 9, 1.6); pl.position.set(x, H - .25, z); room.add(pl); }
  const front = (g, key, f, k, extra) => { const t = tex(f.w, f.h, k), m = add(new THREE.PlaneGeometry(f.w * K, f.h * K), new THREE.MeshBasicMaterial({ map: t.t }), 0, f.h * K / 2 + (g === room ? f.wy : 0), .002, g); if (g === room) m.position.set(f.wx, f.wy + f.h * K / 2, f.wz + .002); m.userData = { sf: key, ...extra }; PL.push(m); RT.set(key, t); return m; };
  front(room, 'W', SF.get('W'), 4, {}); { const f = SF.get('W'); add(new THREE.BoxGeometry(f.w * K + .06, f.h * K + .06, .02), L('#5d6066'), f.wx, f.wy + f.h * K / 2, .008); }
  // rackek (a kicsik állványon), kábelkarral
  const k = A.S.racks.length > 16 ? 2 : 3; A.S.racks.forEach((r, i) => { const f = SF.get('R' + i), g = new THREE.Group(); g.position.set(r.x, 0, r.z); g.rotation.y = f.yaw; room.add(g); const rw = f.w * K, hh = f.h * K, lf = f.wy, dp = lf ? .55 : .85;
    if (lf) { add(new THREE.BoxGeometry(rw + .1, .04, .7), L('#6b4a2c'), 0, lf - .02, -.36, g).userData = { rk: i }; for (const q of [[-rw / 2 + .02, -.06], [rw / 2 - .02, -.06], [-rw / 2 + .02, -.66], [rw / 2 - .02, -.66]]) add(new THREE.BoxGeometry(.05, lf - .04, .05), L('#4e3620'), q[0], (lf - .04) / 2, q[1], g); }
    const bx = add(new THREE.BoxGeometry(rw, hh, dp), body, 0, lf + hh / 2, -dp / 2 - .001, g); bx.userData = { rk: i }; PL.push(bx); const fp = front(g, 'R' + i, f, k, { rk: i }); fp.position.y = lf + hh / 2;
    if (r.arm) { const top = lf + hh, wh = L('#eef1f4'), og = L('#ff8a2a'), sn = []; add(new THREE.BoxGeometry(.03, .28, .03), wh, 0, top + .14, -.06, g); const ar = add(new THREE.BoxGeometry(.03, .03, .72), wh, 0, top + .27, .28, g); for (const z of [.15, .3, .45, .6]) { add(new THREE.BoxGeometry(.05, .05, .022), og, 0, top + .3, z, g); sn.push(V(0, top + .31, z)); } g.updateMatrixWorld(true); ar.userData = { rk: i, snap: sn.map(v => v.applyMatrix4(g.matrixWorld)) }; PL.push(ar); } });
  // kábeltálcák a mennyezet alatt
  for (const t of A.S.trays) { const g = new THREE.Group(); g.position.set(t.x, A.TRAYH, t.z); g.rotation.y = t.rot * Math.PI / 2; room.add(g); const wh = L('#eef1f4'), og = L('#ff8a2a'); for (const dz of [-.12, .12]) add(new THREE.BoxGeometry(1.2, .025, .025), wh, 0, 0, dz, g); for (let x = -.5; x <= .51; x += .25) add(new THREE.BoxGeometry(.02, .02, .24), wh, x, 0, 0, g); for (let x = -.525; x <= .53; x += .15) add(new THREE.BoxGeometry(.022, .05, .035), og, x, .025, .12, g); for (const x of [-.55, .55]) add(new THREE.BoxGeometry(.015, H - A.TRAYH, .015), wh, x, (H - A.TRAYH) / 2, 0, g);
    const hb = add(new THREE.BoxGeometry(1.2, .06, .3), body, 0, 0, 0, g); hb.visible = false; g.updateMatrixWorld(true); hb.userData = { tray: t, line: [V(-.6, .03, 0).applyMatrix4(g.matrixWorld), V(.6, .03, 0).applyMatrix4(g.matrixWorld)] }; PL.push(hb); }
  // szabadon lerakott eszközök és asztalok
  for (const dv of A.S.loose) { const h = dH(dv), dp = dD(dv), g = new THREE.Group(); g.position.set(dv.wx, dv.wy, dv.wz); g.rotation.y = dv.yaw; room.add(g);
    if (A.DEV[dv.t].k === 'tbl') { const tw = A.RW * K + .1, tp = add(new THREE.BoxGeometry(tw, .04, dp), L('#6b4a2c'), 0, h - .02, -dp / 2 + .05, g); tp.userData = { dev: dv }; PL.push(tp); for (const q of [[-tw / 2 + .04, 0], [tw / 2 - .04, 0], [-tw / 2 + .04, -dp + .1], [tw / 2 - .04, -dp + .1]]) { const lg = add(new THREE.BoxGeometry(.05, h - .04, .05), L('#4e3620'), q[0], (h - .04) / 2, q[1], g); lg.userData = { dev: dv }; PL.push(lg); } continue; }
    const bx = add(new THREE.BoxGeometry(A.RW * K, h, dp), body, 0, h / 2, -dp / 2 - .001, g); bx.userData = { dev: dv }; PL.push(bx); front(g, 'L' + dv.id, SF.get('L' + dv.id), 4, { dev: dv }); }
  room.updateMatrixWorld(true); gen = -1; }
const paint = key => { const t = RT.get(key); if (!t) return; if (key === 'W') A.wallTo(t.x, t.k); else if (key[0] === 'R') { const i = +key.slice(1); if (!A.S.racks[i]) return; A.rackTo(t.x, i, t.k); } else { const d = A.S.loose.find(d => 'L' + d.id === key); if (!d) return; A.looseTo(t.x, d, t.k); } t.t.needsUpdate = true; };

/* ---------- kábelek, csatlakozók, adatforgalom ---------- */
function path(p, tight) { const o = []; for (let i = 1; i < p.length; i++) { const a = p[i - 1], b = p[i], len = a.distanceTo(b), stub = len < .06, sag = stub ? 0 : tight ? .004 + len * .035 : .03 + Math.min(.35, len * .2), n = stub ? 1 : 10; for (let j = i > 1 ? 1 : 0; j <= n; j++) { const t = j / n, v = a.clone().lerp(b, t); v.y = Math.max(.012, v.y - sag * 4 * t * (1 - t) * .75); o.push(v); } } return o; }
const fcol = sp => sp >= 100000 ? '#ff6bd6' : sp >= 40000 ? '#4fd8c8' : '#ffd43b';
function cables() { if (cabG) { scene.remove(cabG); cabG.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); }); } cabG = new THREE.Group(); scene.add(cabG); FLOW.length = 0; surfaces();
  const plugG = { n: new THREE.BoxGeometry(.012, .009, .024), f: new THREE.BoxGeometry(.011, .007, .034), p: new THREE.BoxGeometry(.024, .024, .04) }, plugM = { n: L('#dfe4ea'), f: L('#2f7fd6'), p: L('#0e0f11') };
  for (const c of A.S.cables) { const pa = A.PM.get(A.pkey(...c.a)), pb = A.PM.get(A.pkey(...c.b)); if (!pa || !pb) continue; const w = c.w || [], net = c.a[1] === 'n', fb = net && A.fib(pa.sp), ty = net ? (fb ? 'f' : 'n') : 'p', out = ty === 'p' ? .05 : .04;
    const v = path([port3(pa, .004), port3(pa, out), ...w.map(wp3), port3(pb, out), port3(pb, .004)], w.length > 0), g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v, false, 'centripetal'), Math.min(240, v.length * 2), net ? (fb ? .0026 : .0035) : .0055, 5);
    cabG.add(new THREE.Mesh(g, L(net ? (fb ? fcol(Math.min(pa.sp, pb.sp)) : A.NC[c.c % 6]) : '#1b1d20')));
    for (const p of [pa, pb]) { const m = new THREE.Mesh(plugG[ty], plugM[ty]); m.position.copy(port3(p, ty === 'p' ? .022 : .014)); m.rotation.y = SF.get(p.sf).yaw; cabG.add(m); }
    for (const q of w) { const m = new THREE.Mesh(new THREE.TorusGeometry(.011, .003, 5, 10), L(q[1] > A.TRAYH - .1 ? '#ff8a2a' : '#b9c0c8')); m.position.copy(wp3(q)); if (q[1] < .05) m.rotation.x = Math.PI / 2; cabG.add(m); }
    const load = net ? A.C.cl.get(c) || 0 : 0; if (load > 0) { const cu = g.parameters.path, len = cu.getLength(), n = Math.max(1, Math.min(70, Math.ceil((.6 + Math.sqrt(load) / 2.2) * Math.max(.6, len / 1.5)))), sp = (fb ? 1.3 : .7) + Math.min(1.5, load / 3000); for (let i = 0; i < n && FLOW.length < MAXP; i++) FLOW.push({ cu, len, ph: Math.random(), dir: i & 1 ? 1 : -1, sp: sp * (.7 + Math.random() * .6), col: PC[Math.random() * PC.length | 0] }); } }
  const col = pts.geometry.attributes.color; FLOW.forEach((f, i) => col.setXYZ(i, f.col.r, f.col.g, f.col.b)); col.needsUpdate = true; pts.geometry.setDrawRange(0, FLOW.length); }
function flow(dt) { clock += dt; const pos = pts.geometry.attributes.position, v = V(0, 0, 0); for (let i = 0; i < FLOW.length; i++) { const f = FLOW[i]; let t = (f.ph + f.dir * clock * f.sp / f.len) % 1; if (t < 0) t += 1; f.cu.getPoint(t, v); pos.setXYZ(i, v.x, v.y + .004, v.z); } pos.needsUpdate = true; }

/* ---------- célzás és lerakás ---------- */
function stackTop(d) { let top = d; for (let n = 0; n < 40; n++) { const up = A.S.loose.find(o => o !== top && Math.abs(o.wx - top.wx) < .02 && Math.abs(o.wz - top.wz) < .02 && Math.abs(o.wy - (top.wy + dH(top))) < .01); if (!up) break; top = up; } return top; }
const inRack = (x, z, m, skip) => A.S.racks.some((r, i) => { if (i === skip) return false; const f = foot(r.x, r.z, r.rot); return x > f[0] - m && x < f[2] + m && z > f[1] - m && z < f[3] + m; });
function looseOk(t, dev) { const [W, D] = room3(), h = dH(dev); if (t.wy + h > 2.15) return false; if (t.wall || t.stack) return true; const cx = t.wx - Math.sin(t.yaw) * .25, cz = t.wz - Math.cos(t.yaw) * .25; if (cx < .35 || cx > W - .35 || cz < .35 || cz > D - .35 || inRack(cx, cz, .25)) return false;
  return !A.S.loose.some(o => !A.wallMount(o) && o.wy < h && Math.hypot(o.wx - Math.sin(o.yaw) * .25 - cx, o.wz - Math.cos(o.yaw) * .25 - cz) < .55); }
function rackOk(x, z, rt, skip) { const [W, D] = room3(), f = foot(x, z, rt); if (f[0] < .05 || f[1] < .05 || f[2] > W - .05 || f[3] > D - .05) return false; if (A.S.racks.some((r, i) => { if (i === skip) return false; const g = foot(r.x, r.z, r.rot); return f[0] < g[2] - .02 && g[0] < f[2] - .02 && f[1] < g[3] - .02 && g[1] < f[3] - .02; })) return false;
  return !A.S.loose.some(o => { const cx = o.wx - Math.sin(o.yaw) * .25, cz = o.wz - Math.cos(o.yaw) * .25; return !A.wallMount(o) && cx > f[0] - .2 && cx < f[2] + .2 && cz > f[1] - .2 && cz < f[3] + .2; }); }
function pick() { const dir = V(0, 0, 0); cam.getWorldDirection(dir); const o = cam.position, [W, D, H] = room3(), pl = A.place, sel = A.sel, a = {};
  RC.set(o, dir); RC.far = REACH; const hit = RC.intersectObjects(PL, false)[0], u = hit ? hit.object.userData : {};
  const F = dir.y < -.02 && o.y / -dir.y < 4.5 ? { x: o.x + dir.x * o.y / -dir.y, z: o.z + dir.z * o.y / -dir.y, t: o.y / -dir.y } : null, face = Math.round(Math.atan2(o.x - (F ? F.x : o.x + dir.x), o.z - (F ? F.z : o.z + dir.z)) / (Math.PI / 2));
  if (hit) { if (u.rk != null) a.rk = u.rk; if (u.dev) a.d = u.dev; if (u.tray) a.tray = u.tray;
    if (u.sf && hit.uv) { const f = SF.get(u.sf), lx = hit.uv.x * f.w, ly = (1 - hit.uv.y) * f.h; let bd = u.sf === 'W' ? 13 : 8; for (const p of A.RP[u.sf] || []) { const dd = Math.hypot(p.x - lx, p.y - ly), lim = p.id ? 8 : 13; if (dd < bd && dd < lim) { bd = dd; a.p = p; } }
      if (u.rk != null) { const r = A.S.racks[u.rk], n = A.RACK[r.t].u, uu = Math.max(0, Math.min(n - 1, Math.floor((ly - 7) / A.U))); a.h = { ri: u.rk, u: uu, dev: r.dev.find(d => uu >= d.u && uu < d.u + A.DEV[d.t].u) }; a.d = a.h.dev; } }
    const nrm = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : V(0, 1, 0); a.pt = hit.point.clone().addScaledVector(nrm, .012).toArray();
    if (u.snap) { let b = null, bd = 9; for (const q of u.snap) { const dd = q.distanceTo(hit.point); if (dd < bd) { bd = dd; b = q; } } a.pt = b.toArray(); }
    if (u.line) { const [p0, p1] = u.line, ab = p1.clone().sub(p0), t = Math.max(0, Math.min(1, hit.point.clone().sub(p0).dot(ab) / ab.lengthSq())); a.pt = p0.clone().addScaledVector(ab, Math.round(t * 8) / 8).toArray(); } }
  else if (sel) { // fal, mennyezet vagy padló: oda is mehet rögzítő
    let bt = REACH + 1; const tryP = (t, n) => { if (t > .05 && t < bt) { const q = o.clone().addScaledVector(dir, t); if (q.x > -.01 && q.x < W + .01 && q.z > -.01 && q.z < D + .01 && q.y > -.01 && q.y < H + .01) { bt = t; a.pt = q.addScaledVector(n, .012).toArray(); } } };
    if (dir.y < 0) tryP(o.y / -dir.y, V(0, 1, 0)); else tryP((H - o.y) / dir.y, V(0, -1, 0)); if (dir.z < 0) tryP(o.z / -dir.z, V(0, 0, 1)); else tryP((D - o.z) / dir.z, V(0, 0, -1)); if (dir.x < 0) tryP(o.x / -dir.x, V(1, 0, 0)); else tryP((W - o.x) / dir.x, V(-1, 0, 0)); }
  if (!pl) return a;
  // lerakás
  const kd = pl.rk ? 'rack' : A.DEV[pl.t].k, yawOf = r => r * Math.PI / 2;
  if (kd === 'rack') { if (F) { const rt = ((face + rot) % 4 + 4) % 4, x = snapG(F.x), z = snapG(F.z), small = A.RACK[pl.rk].u <= 18, dp = small ? .55 : .85, hh = (A.RACK[pl.rk].u * A.U + 14) * K, lf = small ? 380 * K : 0, s = Math.sin(yawOf(rt)), c = Math.cos(yawOf(rt)); a.pl = { x, z, rot: rt, turn: 1, ok: rackOk(x, z, rt, pl.mv), box: [V(x - s * dp / 2, lf + hh / 2, z - c * dp / 2), yawOf(rt), [RWID, hh, dp]] }; } return a; }
  if (kd === 'tray') { if (dir.y > .05) { const t = (A.TRAYH - o.y) / dir.y; if (t < 5) { const x = snapG(o.x + dir.x * t), z = snapG(o.z + dir.z * t), rt = ((Math.abs(dir.x) > Math.abs(dir.z) ? 0 : 1) + rot) % 2 & 1; a.pl = { x, z, rot: rt, turn: 1, ok: x > .5 && x < W - .5 && z > .5 && z < D - .5 && !A.S.trays.some(q => q.x === x && q.z === z && q.rot === rt), box: [V(x, A.TRAYH, z), yawOf(rt), [1.2, .06, .3]] }; } } return a; }
  if (kd === 'arm') { if (a.rk != null) { const r = A.S.racks[a.rk], f = SF.get('R' + a.rk), s = Math.sin(f.yaw), c = Math.cos(f.yaw); a.pl = { arm: a.rk, ok: !r.arm, box: [V(r.x + s * .28, f.wy + f.h * K + .27, r.z + c * .28), f.yaw, [.05, .05, .72]] }; } return a; }
  const h = dH(pl), wm = A.wallMount(pl), dp = dD(pl);
  if (a.h && kd !== 'tbl') { const f = SF.get('R' + a.h.ri); a.pl = { rack: a.h, ok: A.free(a.h.ri, a.h.u, A.DEV[pl.t].u), box: [s3(f, f.w / 2, 7 + a.h.u * A.U + A.DEV[pl.t].u * A.U / 2, .02), f.yaw, [A.RW * K, h, .03]] }; return a; }
  if (a.d && A.S.loose.includes(a.d)) { const top = stackTop(a.d); a.pl = { wx: top.wx, wy: top.wy + dH(top), wz: top.wz, yaw: top.yaw, stack: 1 }; }
  else if (wm && !hit) { let bt = REACH; const tryW = (t, yaw) => { if (t > .1 && t < bt) { const q = o.clone().addScaledVector(dir, t); if (q.y > .1 && q.y < 2.1 && q.x > -.01 && q.x < W + .01 && q.z > -.01 && q.z < D + .01) { bt = t; a.pl = { wx: q.x + Math.sin(yaw) * .012, wy: Math.max(0, q.y - h / 2), wz: q.z + Math.cos(yaw) * .012, yaw, wall: 1 }; } } };
    if (dir.z < 0) tryW(o.z / -dir.z, 0); else tryW((D - o.z) / dir.z, Math.PI); if (dir.x < 0) tryW(o.x / -dir.x, Math.PI / 2); else tryW((W - o.x) / dir.x, -Math.PI / 2); }
  if (!a.pl && F && !hit) a.pl = { wx: F.x, wy: 0, wz: F.z, yaw: Math.round(Math.atan2(o.x - F.x, o.z - F.z) / (Math.PI / 12)) * (Math.PI / 12) + rot * Math.PI / 12, turn: 1 };
  if (a.pl) { const t = a.pl; t.ok = looseOk(t, pl); t.box = [V(t.wx - Math.sin(t.yaw) * dp / 2, t.wy + h / 2, t.wz - Math.cos(t.yaw) * dp / 2), t.yaw, [A.RW * K, h, dp]]; } return a; }
export function interact() { A.setAim(aim); A.doClick(); }

/* ---------- indítás ---------- */
export function init(canvas, api) { A = api; K = A.K; cv = canvas; R = new THREE.WebGLRenderer({ canvas, antialias: true }); R.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); scene = new THREE.Scene(); scene.background = new THREE.Color('#0b0e12'); cam = new THREE.PerspectiveCamera(72, 1, .03, 80); cam.rotation.order = 'YXZ'; scene.add(new THREE.HemisphereLight(0xeaf0ff, 0x4a4e55, 2.4));
  held = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x4cc9f0 })); held.frustumCulled = false; scene.add(held); ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: .4, depthWrite: false })); ghost.visible = false; scene.add(ghost);
  { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'), gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, '#fff'); gr.addColorStop(.35, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXP * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAXP * 3), 3)); g.setDrawRange(0, 0); pts = new THREE.Points(g, new THREE.PointsMaterial({ size: .035, map: new THREE.CanvasTexture(c), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); pts.frustumCulled = false; scene.add(pts); }
  cv.addEventListener('click', e => { if (e.pointerType && e.pointerType !== 'mouse') return; if (document.pointerLockElement !== cv) { try { const r = cv.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (_) {} return; } interact(); });
  cv.addEventListener('contextmenu', e => { e.preventDefault(); A.cancel(); });
  cv.addEventListener('wheel', e => { e.preventDefault(); if (A.place) rot += Math.sign(e.deltaY); }, { passive: false });
  document.addEventListener('mousemove', e => { if (!on || document.pointerLockElement !== cv) return; P.yaw -= e.movementX * .0022; P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch - e.movementY * .0022)); });
  // érintés: a bal oldalon húzva járás, a jobb oldalon nézelődés, koppintás: művelet
  const TP = new Map(); cv.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; cv.setPointerCapture(e.pointerId); TP.set(e.pointerId, { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, m: 0, mv: e.clientX < innerWidth * .4 }); });
  cv.addEventListener('pointermove', e => { const t = TP.get(e.pointerId); if (!t) return; const dx = e.clientX - t.x, dy = e.clientY - t.y; t.m += Math.abs(dx) + Math.abs(dy); t.x = e.clientX; t.y = e.clientY; if (t.mv) { stick.x = Math.max(-1, Math.min(1, (t.x - t.x0) / 60)); stick.y = Math.max(-1, Math.min(1, (t.y - t.y0) / 60)); } else { P.yaw -= dx * .005; P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch - dy * .005)); } });
  for (const ev of ['pointerup', 'pointercancel']) cv.addEventListener(ev, e => { const t = TP.get(e.pointerId); if (!t) return; TP.delete(e.pointerId); if (t.mv) stick.x = stick.y = 0; if (t.m < 8 && ev === 'pointerup') interact(); });
  addEventListener('keydown', e => { if (e.target.tagName !== 'INPUT') keys[e.code] = 1; }); addEventListener('keyup', e => { keys[e.code] = 0; }); addEventListener('blur', () => { for (const k in keys) keys[k] = 0; }); addEventListener('resize', size); document.addEventListener('fullscreenchange', size); }
function size() { if (!R) return; R.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
export function start() { on = true; size(); document.querySelector('#xh').hidden = false; sig = ''; }
export function stop() { on = false; document.querySelector('#xh').hidden = true; if (document.pointerLockElement === cv) document.exitPointerLock(); }
export const look = (x, z, yaw, pitch) => { P.x = x; P.z = z; P.yaw = yaw; P.pitch = pitch; };

export function frame(dt) { if (!on) return; const S = A.S, [W, D] = room3(), s2 = S.site + '|' + S.racks.map(r => [r.t, r.x, r.z, r.rot, r.arm ? 1 : 0].join(':')).join(',') + '|' + S.loose.map(d => [d.id, d.wx, d.wy, d.wz, d.yaw].join(':')).join(',') + '|' + S.trays.map(t => [t.x, t.z, t.rot].join(':')).join(',');
  if (s2 !== sig) { sig = s2; build(); if (site !== S.site) { site = S.site; P.x = W / 2; P.z = D - 1.2; P.yaw = 0; } }
  // mozgás, ütközés a falakkal és a rackekkel
  const busy = A.busy, f = busy ? 0 : (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - stick.y, sd = busy ? 0 : (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + stick.x; if (f || sd) { const v = (keys.ShiftLeft ? 4.2 : 2.2) * dt / Math.max(1, Math.hypot(f, sd)), sn = Math.sin(P.yaw), cs = Math.cos(P.yaw), cl = (q, m) => Math.max(.3, Math.min(m - .3, q)); let nx = cl(P.x + (-sn * f + cs * sd) * v, W), nz = cl(P.z + (-cs * f - sn * sd) * v, D);
    if (inRack(nx, nz, .22) && !inRack(P.x, P.z, .2)) { if (!inRack(nx, P.z, .22)) nz = P.z; else if (!inRack(P.x, nz, .22)) nx = P.x; else { nx = P.x; nz = P.z; } } P.x = nx; P.z = nz; }
  cam.position.set(P.x, keys.KeyC || keys.ControlLeft ? .85 : EYE, P.z); cam.rotation.set(P.pitch, P.yaw, 0); cam.updateMatrixWorld();
  // célzás
  const sel = A.sel, pl = A.place; if (!pl) rot = 0; aim = pick(); A.setAim(aim); document.querySelector('#xh').classList.toggle('hot', !!(aim.p || aim.d || aim.tray || aim.rk != null || (aim.pl && aim.pl.ok)));
  if (A.gen !== gen) { gen = A.gen; for (const k of RT.keys()) paint(k); cables(); }
  else { const hv = aim.h ? 'R' + aim.h.ri : ''; if (sel || pl) { if (lastHover && lastHover !== hv) paint(lastHover); if (hv) paint(hv); } lastHover = sel || pl ? hv : '';
    if ((ledT -= dt) <= 0) { ledT = .3; let n = 0; for (const k of RT.keys()) { if (k[0] !== 'R') { if (k !== 'W' || sel) paint(k); continue; } const r = S.racks[+k.slice(1)]; if (r && Math.hypot(r.x - P.x, r.z - P.z) < 5 && n++ < 6) paint(k); } } }
  // a lerakandó dolog körvonala
  const gp = aim.pl; ghost.visible = !!(gp && gp.box); if (ghost.visible) { const [c, yaw, d] = gp.box; ghost.position.copy(c); ghost.rotation.y = yaw; ghost.scale.set(d[0], d[1], d[2]); ghost.material.color.set(gp.ok ? 0x5ee08a : 0xff5a4d); }
  // a kézben tartott kábel
  if (sel && SF.get(sel.sf)) { const p = [port3(sel, .03), ...sel.w.map(wp3)], dir = V(0, 0, 0); cam.getWorldDirection(dir); p.push(aim.p ? port3(aim.p, .03) : aim.pt ? V(...aim.pt) : cam.position.clone().addScaledVector(dir, .8).add(V(0, -.25, 0))); held.geometry.setFromPoints(p); held.material.color.set(sel.k === 'n' ? 0x4cc9f0 : 0x888888); held.visible = true; } else held.visible = false;
  flow(A.S.spd ? dt : 0); R.render(scene, cam); }
