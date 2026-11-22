/* HGWS Arcade – Szerverfarm: belső (FPS) nézet.
   A 2D elölnézet síkját teszi térbe: a rackek előlapja a 2D rajz textúrája, a kábelek valódi csövek.
   A célkereszt találata visszaszámolódik 2D koordinátára, így minden művelet a 2D nézet click() függvényén megy át.
   Lépték: K méter / 2D egység (1U = 20 egység = 4,4 cm). Az r-edik sor előlapja a z = -r·ROWZ síkban van. */
import * as THREE from '../atemelotelep/lib/three.module.min.js?v=202611221400';

const K = .0022, ROWZ = 3.2, DEPTH = .85, REACH = 2.8, EYE = 1.62;
let A = null, cv = null, R = null, scene = null, cam = null, room = null, cabG = null, held = null;
export let on = false;
const stick = { x: 0, y: 0 }; let ghost = null;
const P = { x: .35, z: 1.25, yaw: 0, pitch: -.3 }, keys = {}, RT = new Map(); let sig = '', gen = -1, wallT = null, ledT = 0, aim = null, lastHover = -2;
const rowOf = y => Math.max(0, Math.floor((y + 990) / A.RY)), to3 = (x, y, dz = 0) => { const r = rowOf(y); return new THREE.Vector3(x * K, Math.max(.015, (r * A.RY - y) * K), -r * ROWZ + dz); };
const dims = () => { const st = A.SITE[A.S.site], cols = Math.min(A.ROW, st.racks), rows = Math.ceil(st.racks / A.ROW); return { st, cols, rows, x0: -.95, x1: cols * A.RX * K + 1.3, z0: -(rows - 1) * ROWZ - DEPTH - .7, z1: 2.9, h: A.S.site ? 3.3 : 2.7 }; };
const L = (c, o) => new THREE.MeshLambertMaterial({ color: c, ...o });

function tex(w, h, k) { const c = document.createElement('canvas'); c.width = Math.ceil(w * k); c.height = Math.ceil(h * k); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { c, x: c.getContext('2d'), t, k }; }
function build() { if (room) { scene.remove(room); room.traverse(o => { o.geometry?.dispose(); if (o.material?.map) o.material.map.dispose(); o.material?.dispose?.(); }); } RT.clear(); room = new THREE.Group(); scene.add(room);
  const D = dims(), st = D.st, w = D.x1 - D.x0, d = D.z1 - D.z0, add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); room.add(o); return o; };
  const fl = add(new THREE.PlaneGeometry(w, d), L(st.bg[2]), (D.x0 + D.x1) / 2, 0, (D.z0 + D.z1) / 2); fl.rotation.x = -Math.PI / 2; const ce = add(new THREE.PlaneGeometry(w, d), L(A.S.site ? '#cfd3d8' : '#6d6a66'), (D.x0 + D.x1) / 2, D.h, (D.z0 + D.z1) / 2); ce.rotation.x = Math.PI / 2;
  const wm = L(st.bg[0]), wm2 = L(st.bg[1]); add(new THREE.PlaneGeometry(w, D.h), wm, (D.x0 + D.x1) / 2, D.h / 2, D.z0); add(new THREE.PlaneGeometry(w, D.h), wm2, (D.x0 + D.x1) / 2, D.h / 2, D.z1).rotation.y = Math.PI; add(new THREE.PlaneGeometry(d, D.h), wm2, D.x0, D.h / 2, (D.z0 + D.z1) / 2).rotation.y = Math.PI / 2; add(new THREE.PlaneGeometry(d, D.h), wm, D.x1, D.h / 2, (D.z0 + D.z1) / 2).rotation.y = -Math.PI / 2;
  if (!A.S.site) { const gm = L('#8f9499'); for (let i = 0; i < 7; i++) add(new THREE.BoxGeometry(Math.min(3, w - .6), .3, .03), gm, (D.x0 + D.x1) / 2, .2 + i * .33, D.z1 - .02); add(new THREE.BoxGeometry(.9, .75, .5), L('#6b4a2c'), D.x1 - .6, .375, D.z1 - .5); add(new THREE.BoxGeometry(.5, .35, .35), L('#b08d4a'), D.x1 - .65, .93, D.z1 - .5); }
  // lámpák
  for (let r = 0; r < D.rows; r++) for (let x = D.x0 + 1.2; x < D.x1; x += 2.6) { add(new THREE.BoxGeometry(1.2, .04, .16), new THREE.MeshBasicMaterial({ color: '#f4f7ff' }), x, D.h - .03, -r * ROWZ + 1.1); const pl = new THREE.PointLight(0xdfe8ff, 9, 9, 1.6); pl.position.set(x, D.h - .25, -r * ROWZ + 1.1); room.add(pl); }
  // fali csatlakozótábla (a 0. sor síkjában, egy pilléren)
  const b = A.wallBox(), bw = (b[2] - b[0]) * K, bh = (b[3] - b[1]) * K; add(new THREE.BoxGeometry(bw + .08, D.h, DEPTH), L('#5d6066'), (b[0] + b[2]) / 2 * K, D.h / 2, -DEPTH / 2 - .01); wallT = tex(b[2] - b[0], b[3] - b[1], 4); add(new THREE.PlaneGeometry(bw, bh), new THREE.MeshBasicMaterial({ map: wallT.t }), (b[0] + b[2]) / 2 * K, -(b[1] + b[3]) / 2 * K, .002);
  // rackek
  const body = L('#16181c'), k = st.racks > 16 ? 2 : 3; for (let i = 0; i < st.racks; i++) { const r = A.S.racks[i], [x, y] = A.rackXY(i), row = Math.floor(i / A.ROW), zf = -row * ROWZ, rw = (A.RW + 28) * K;
    if (!r) { const g = new THREE.BufferGeometry().setFromPoints([[0, 0], [rw, 0], [rw, -DEPTH], [0, -DEPTH], [0, 0]].map(q => new THREE.Vector3(x * K + q[0], .01, zf + q[1]))); room.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .25 }))); continue; }
    const hh = (A.RACK[r.t].u * A.U + 14) * K, lf = A.lift(i) * K, dp = lf ? .55 : DEPTH; if (lf) { add(new THREE.BoxGeometry(rw + .12, .04, .7), L('#6b4a2c'), x * K + rw / 2, lf - .02, zf - .36); for (const q of [[.02, -.06], [rw - .02, -.06], [.02, -.66], [rw - .02, -.66]]) add(new THREE.BoxGeometry(.05, lf - .04, .05), L('#4e3620'), x * K + q[0], (lf - .04) / 2, zf + q[1]); } add(new THREE.BoxGeometry(rw, hh, dp), body, x * K + rw / 2, lf + hh / 2, zf - dp / 2 - .001); const t = tex(A.RW + 28, A.RACK[r.t].u * A.U + 14, k); add(new THREE.PlaneGeometry(rw, hh), new THREE.MeshBasicMaterial({ map: t.t }), x * K + rw / 2, lf + hh / 2, zf + .002); RT.set(i, t); }
  // kábeltálcák: soronként egy létra a rackek fölött, a sorok között átkötők
  { const ty = A.TRAY * K, wh = L('#eef1f4'), og = L('#ff8a2a'), xs = A.trayXs().map(x => x * K), xa = -.6, xb = xs[1] + .15, len = xb - xa, rung = [], clip = [], M = new THREE.Matrix4();
    for (let r = 0; r < D.rows; r++) { const zf = -r * ROWZ; for (const dz of [-.03, -.27]) add(new THREE.BoxGeometry(len, .025, .025), wh, (xa + xb) / 2, ty - .02, zf + dz); for (let x = xa + .1; x < xb; x += .3) rung.push(M.makeTranslation(x, ty - .02, zf - .15).clone()); for (let x = xa + .05; x < xb; x += .15) clip.push(M.makeTranslation(x, ty + .005, zf - .03).clone()); for (let x = xa + .3; x < xb; x += 1.8) for (const dz of [-.03, -.27]) add(new THREE.BoxGeometry(.015, D.h - ty, .015), wh, x, (D.h + ty) / 2, zf + dz);
      if (r) for (const x of xs) { for (const dx of [-.12, .12]) add(new THREE.BoxGeometry(.025, .025, ROWZ), wh, x + dx, ty - .02, zf + ROWZ / 2); for (let z = zf + .2; z < zf + ROWZ; z += .3) { const m = M.makeTranslation(x, ty - .02, z).clone(); m.multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)); rung.push(m); } } }
    const ri = new THREE.InstancedMesh(new THREE.BoxGeometry(.02, .02, .24), wh, rung.length); rung.forEach((m, i) => ri.setMatrixAt(i, m)); room.add(ri); const ci = new THREE.InstancedMesh(new THREE.BoxGeometry(.022, .05, .035), og, clip.length); clip.forEach((m, i) => ci.setMatrixAt(i, m)); room.add(ci); }
  // szabadon lerakott eszközök
  for (const d of A.S.loose) { const h = A.DEV[d.t].u * A.U, wm = A.wallMount(d), dp = wm ? .05 : .5, c = to3(d.x + A.RW / 2, d.y + h / 2), zf = c.z; add(new THREE.BoxGeometry(A.RW * K, h * K, dp), body, c.x, c.y, zf - dp / 2 - .001); if (wm && c.y > .1) add(new THREE.BoxGeometry(.03, c.y, .03), L('#3a3f46'), c.x, c.y / 2, zf - .07);
    const t = tex(A.RW, h, 4); add(new THREE.PlaneGeometry(A.RW * K, h * K), new THREE.MeshBasicMaterial({ map: t.t }), c.x, c.y, zf + .002); RT.set('L' + d.id, t); }
  gen = -1; }
const paint = i => { const t = RT.get(i); if (!t) return; if (typeof i === 'number') { if (!A.S.racks[i]) return; A.rackTo(t.x, i, t.k); } else { const d = A.S.loose.find(d => 'L' + d.id === i); if (!d) return; A.looseTo(t.x, d, t.k); } t.t.needsUpdate = true; };
function path(pts, tight) { const o = []; for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], sag = A.sagOf(ax, ay, bx, by, tight), n = 10; for (let j = i > 1 ? 1 : 0; j <= n; j++) { const t = j / n, f = 4 * t * (1 - t) * .75, a = to3(ax, ay), b = to3(bx, by), v = a.lerp(b, t); v.y = Math.max(.012, v.y - sag * f * K); v.z += .012 + f * (tight ? .02 : .07); o.push(v); } } return o; }
function cables() { if (cabG) { scene.remove(cabG); cabG.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); }); } cabG = new THREE.Group(); scene.add(cabG); FLOW.length = 0;
  for (const c of A.S.cables) { const p = A.cpts(c); if (!p) continue; const net = c.a[1] === 'n', v = path(p, p.length > 2), g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v, false, 'centripetal'), Math.min(160, v.length * 2), net ? .0035 : .0055, 5); cabG.add(new THREE.Mesh(g, L(net ? A.NC[c.c % A.NC.length] : '#1b1d20')));
    for (let i = 1; i < p.length - 1; i++) { const tr = Math.abs(rowOf(p[i][1]) * A.RY - A.TRAY - p[i][1]) < 1, m = new THREE.Mesh(new THREE.TorusGeometry(.011, .003, 5, 10), L(tr ? '#ff8a2a' : '#b9c0c8')); m.position.copy(to3(p[i][0], p[i][1], .014)); cabG.add(m); }
    if (net && alive(c.a[0]) && alive(c.b[0])) { const cu = g.parameters.path, len = cu.getLength(), n = Math.max(2, Math.min(16, Math.ceil(len / .4))); for (let i = 0; i < n && FLOW.length < MAXP; i++) FLOW.push({ cu, len, ph: Math.random(), dir: i & 1 ? 1 : -1, sp: .5 + Math.random() * .5, col: PC[Math.random() * PC.length | 0] }); } }
  const col = pts.geometry.attributes.color; FLOW.forEach((f, i) => col.setXYZ(i, f.col.r, f.col.g, f.col.b)); col.needsUpdate = true; pts.geometry.setDrawRange(0, FLOW.length); }
// adatforgalom: világító pontok futnak az élő hálózati kábeleken
const MAXP = 1500, FLOW = [], PC = ['#ff6bd6', '#7dffb0', '#ffe066', '#6bd6ff', '#ffffff'].map(c => new THREE.Color(c)); let pts = null, clock = 0;
const alive = id => { if (!id) return !0; const o = A.C.d[id]; return !!o && (o.k === 'srv' ? o.st === 'ok' : !!o.live && o.bw > 0); };
function flow(dt) { clock += dt; const pos = pts.geometry.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < FLOW.length; i++) { const f = FLOW[i]; let t = (f.ph + f.dir * clock * f.sp / f.len) % 1; if (t < 0) t += 1; f.cu.getPoint(t, v); pos.setXYZ(i, v.x, v.y, v.z + .004); } pos.needsUpdate = true; }

// a célkereszt sugara → 2D pont (a legközelebbi sor síkjában)
function pick() { const dir = new THREE.Vector3(); cam.getWorldDirection(dir); const o = cam.position, rows = dims().rows; let best = null; if (Math.abs(dir.z) < 1e-4) return null;
  for (let r = 0; r < rows; r++) { const t = (-r * ROWZ - o.z) / dir.z; if (t <= .05 || t > REACH || (best && t > best.t)) continue; const X = o.x + dir.x * t, Y = o.y + dir.y * t; if (Y < 0 || Y > 3) continue; best = { t, x: X / K, y: r * A.RY - Y / K }; } return best; }
export function interact() { if (aim) { A.setMouse(aim.x, aim.y); A.click(aim.x, aim.y); } }

export function init(canvas, api) { A = api; cv = canvas; R = new THREE.WebGLRenderer({ canvas, antialias: true }); R.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); scene = new THREE.Scene(); scene.background = new THREE.Color('#0b0e12'); cam = new THREE.PerspectiveCamera(72, 1, .03, 80); cam.rotation.order = 'YXZ'; scene.add(new THREE.HemisphereLight(0xeaf0ff, 0x4a4e55, 2.4));
  held = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x4cc9f0 })); held.frustumCulled = false; scene.add(held); ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: .4, depthWrite: false })); ghost.visible = false; scene.add(ghost);
  { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'), gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, '#fff'); gr.addColorStop(.35, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXP * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAXP * 3), 3)); g.setDrawRange(0, 0); pts = new THREE.Points(g, new THREE.PointsMaterial({ size: .035, map: new THREE.CanvasTexture(c), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); pts.frustumCulled = false; scene.add(pts); }
  cv.addEventListener('click', e => { if (e.pointerType && e.pointerType !== 'mouse') return; if (document.pointerLockElement !== cv) { try { const r = cv.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (_) {} return; } interact(); });
  cv.addEventListener('contextmenu', e => { e.preventDefault(); A.cancel(); });
  document.addEventListener('mousemove', e => { if (!on || document.pointerLockElement !== cv) return; P.yaw -= e.movementX * .0022; P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch - e.movementY * .0022)); });
  // érintés / zár nélküli egér: húzással nézelődés, koppintással művelet
  // érintés: a bal oldalon húzva járás, a jobb oldalon nézelődés, koppintás: művelet
  const TP = new Map(); cv.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; cv.setPointerCapture(e.pointerId); TP.set(e.pointerId, { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, m: 0, mv: e.clientX < innerWidth * .4 }); });
  cv.addEventListener('pointermove', e => { const t = TP.get(e.pointerId); if (!t) return; const dx = e.clientX - t.x, dy = e.clientY - t.y; t.m += Math.abs(dx) + Math.abs(dy); t.x = e.clientX; t.y = e.clientY; if (t.mv) { stick.x = Math.max(-1, Math.min(1, (t.x - t.x0) / 60)); stick.y = Math.max(-1, Math.min(1, (t.y - t.y0) / 60)); } else { P.yaw -= dx * .005; P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch - dy * .005)); } });
  for (const ev of ['pointerup', 'pointercancel']) cv.addEventListener(ev, e => { const t = TP.get(e.pointerId); if (!t) return; TP.delete(e.pointerId); if (t.mv) stick.x = stick.y = 0; if (t.m < 8 && ev === 'pointerup') interact(); });
  addEventListener('keydown', e => { if (e.target.tagName !== 'INPUT') keys[e.code] = 1; }); addEventListener('keyup', e => { keys[e.code] = 0; }); addEventListener('blur', () => { for (const k in keys) keys[k] = 0; }); addEventListener('resize', size); }
function size() { if (!R) return; R.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
export function start() { on = true; size(); document.querySelector('#xh').hidden = false; sig = ''; }
export function stop() { on = false; document.querySelector('#xh').hidden = true; if (document.pointerLockElement === cv) document.exitPointerLock(); }
export const look = (x, z, yaw, pitch) => { P.x = x; P.z = z; P.yaw = yaw; P.pitch = pitch; };

export function frame(dt) { if (!on) return; const S = A.S, D = dims(), s2 = S.site + '|' + S.racks.map(r => r ? r.t : '-').join(',') + '|' + S.loose.map(d => d.id + ':' + d.x + ':' + d.y).join(',');
  if (s2 !== sig) { sig = s2; build(); P.x = Math.max(D.x0 + .3, Math.min(D.x1 - .3, P.x)); P.z = Math.max(D.z0 + .3, Math.min(D.z1 - .3, P.z)); }
  // mozgás
  const busy = A.busy, f = busy ? 0 : (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - stick.y, sd = busy ? 0 : (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + stick.x; if (f || sd) { const v = (keys.ShiftLeft ? 4.2 : 2.2) * dt / Math.max(1, Math.hypot(f, sd)), sn = Math.sin(P.yaw), cs = Math.cos(P.yaw); let nx = P.x + (-sn * f + cs * sd) * v, nz = P.z + (-cs * f - sn * sd) * v;
    nx = Math.max(D.x0 + .3, Math.min(D.x1 - .3, nx)); nz = Math.max(D.z0 + .3, Math.min(D.z1 - .3, nz)); const rw = D.cols * A.RX * K;
    for (let r = 0; r < D.rows; r++) { const zf = -r * ROWZ, xa = r ? -.25 : D.x0, inX = x => x > xa && x < rw + .15, inZ = z => z > zf - DEPTH - .3 && z < zf + .35; if (inX(nx) && inZ(nz)) { if (!inZ(P.z)) nz = P.z; else if (!inX(P.x)) nx = P.x; else nz = P.z > zf - DEPTH / 2 ? zf + .35 : zf - DEPTH - .3; } } P.x = nx; P.z = nz; }
  cam.position.set(P.x, keys.KeyC || keys.ControlLeft ? .85 : EYE, P.z); cam.rotation.set(P.pitch, P.yaw, 0);
  // célzás
  aim = pick(); const sel = A.sel, pl = A.place, hp = aim && A.hitPort(aim.x, aim.y), hu = aim && A.hitU(aim.x, aim.y); A.setMouse(aim ? aim.x : 1e9, aim ? aim.y : 1e9); document.querySelector('#xh').classList.toggle('hot', !!(hp || (hu && (hu.dev || pl))));
  if (A.gen !== gen) { gen = A.gen; for (const i of RT.keys()) paint(i); A.wallTo(wallT.x, wallT.k); wallT.t.needsUpdate = true; cables(); }
  else { const hv = hu ? hu.ri : -1; if ((sel || pl) && (hv >= 0 || lastHover >= 0)) { if (lastHover >= 0 && lastHover !== hv) paint(lastHover); if (hv >= 0) paint(hv); } lastHover = sel || pl ? hv : -1;
    if ((ledT -= dt) <= 0) { ledT = .3; let n = 0; for (const i of RT.keys()) { if (typeof i !== 'number') { paint(i); continue; } const [x] = A.rackXY(i), zf = -Math.floor(i / A.ROW) * ROWZ; if (Math.hypot(x * K + .3 - P.x, zf - P.z) < 5 && n++ < 6) paint(i); } if (sel) { A.wallTo(wallT.x, wallT.k); wallT.t.needsUpdate = true; } } }
  // a lerakandó eszköz körvonala
  const gp = pl && aim ? A.placeAt(aim.x, aim.y) : null; ghost.visible = !!gp; if (gp) { const c = to3(gp.x + gp.w / 2, gp.y + gp.h / 2, .02); ghost.position.set(c.x, c.y, c.z - (gp.rack ? 0 : .2)); ghost.scale.set(gp.w * K, gp.h * K, gp.rack ? .03 : .45); ghost.material.color.set(gp.ok ? 0x5ee08a : 0xff5a4d); }
  // a kézben tartott kábel
  if (sel) { const pts = [[sel.x, sel.y], ...sel.w].map(q => to3(q[0], q[1], .03)); const dir = new THREE.Vector3(); cam.getWorldDirection(dir); pts.push(aim ? to3(aim.x, aim.y, .03) : cam.position.clone().addScaledVector(dir, .8).add(new THREE.Vector3(0, -.25, 0))); held.geometry.setFromPoints(pts); held.material.color.set(sel.k === 'n' ? 0x4cc9f0 : 0x888888); held.visible = true; } else held.visible = false;
  if (!A.busy || true) flow(A.S.spd ? dt : 0);
  R.render(scene, cam); }
