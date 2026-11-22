/* HGWS Arcade – Szerverfarm: belső (FPS) nézet.
   A 2D elölnézet síkját teszi térbe: a rackek előlapja a 2D rajz textúrája, a kábelek valódi csövek.
   A célkereszt találata visszaszámolódik 2D koordinátára, így minden művelet a 2D nézet click() függvényén megy át.
   Lépték: K méter / 2D egység (1U = 20 egység = 4,4 cm). Az r-edik sor előlapja a z = -r·ROWZ síkban van. */
import * as THREE from '../atemelotelep/lib/three.module.min.js?v=202611220336';

const K = .0022, ROWZ = 3.2, DEPTH = .85, REACH = 2.8, EYE = 1.62;
let A = null, cv = null, R = null, scene = null, cam = null, room = null, cabG = null, held = null;
export let on = false;
const P = { x: .35, z: 1.25, yaw: 0, pitch: -.3 }, keys = {}, RT = new Map(); let sig = '', gen = -1, wallT = null, ledT = 0, aim = null, lastHover = -2;
const rowOf = y => Math.max(0, Math.floor((y + 940) / A.RY)), to3 = (x, y, dz = 0) => { const r = rowOf(y); return new THREE.Vector3(x * K, Math.max(.015, (r * A.RY - y) * K), -r * ROWZ + dz); };
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
  gen = -1; }
const paint = i => { const t = RT.get(i); if (t && A.S.racks[i]) { A.rackTo(t.x, i, t.k); t.t.needsUpdate = true; } };
function path(pts, tight) { const o = []; for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], sag = A.sagOf(ax, ay, bx, by, tight), n = 10; for (let j = i > 1 ? 1 : 0; j <= n; j++) { const t = j / n, f = 4 * t * (1 - t) * .75, a = to3(ax, ay), b = to3(bx, by), v = a.lerp(b, t); v.y = Math.max(.012, v.y - sag * f * K); v.z += .012 + f * (tight ? .02 : .07); o.push(v); } } return o; }
function cables() { if (cabG) { scene.remove(cabG); cabG.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); }); } cabG = new THREE.Group(); scene.add(cabG);
  for (const c of A.S.cables) { const p = A.cpts(c); if (!p) continue; const net = c.a[1] === 'n', v = path(p, p.length > 2), g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v, false, 'centripetal'), Math.min(160, v.length * 2), net ? .0035 : .0055, 5); cabG.add(new THREE.Mesh(g, L(net ? A.NC[c.c % A.NC.length] : '#1b1d20')));
    for (let i = 1; i < p.length - 1; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(.011, .003, 5, 10), L('#b9c0c8')); m.position.copy(to3(p[i][0], p[i][1], .014)); cabG.add(m); } } }

// a célkereszt sugara → 2D pont (a legközelebbi sor síkjában)
function pick() { const dir = new THREE.Vector3(); cam.getWorldDirection(dir); const o = cam.position, rows = dims().rows; let best = null; if (Math.abs(dir.z) < 1e-4) return null;
  for (let r = 0; r < rows; r++) { const t = (-r * ROWZ - o.z) / dir.z; if (t <= .05 || t > REACH || (best && t > best.t)) continue; const X = o.x + dir.x * t, Y = o.y + dir.y * t; if (Y < 0 || Y > 3) continue; best = { t, x: X / K, y: r * A.RY - Y / K }; } return best; }
export function interact() { if (aim) { A.setMouse(aim.x, aim.y); A.click(aim.x, aim.y); } }

export function init(canvas, api) { A = api; cv = canvas; R = new THREE.WebGLRenderer({ canvas, antialias: true }); R.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); scene = new THREE.Scene(); scene.background = new THREE.Color('#0b0e12'); cam = new THREE.PerspectiveCamera(72, 1, .03, 80); cam.rotation.order = 'YXZ'; scene.add(new THREE.HemisphereLight(0xeaf0ff, 0x4a4e55, 2.4));
  held = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x4cc9f0 })); held.frustumCulled = false; scene.add(held);
  cv.addEventListener('click', () => { if (document.pointerLockElement !== cv) { cv.requestPointerLock?.(); return; } interact(); });
  cv.addEventListener('contextmenu', e => { e.preventDefault(); A.cancel(); });
  document.addEventListener('mousemove', e => { if (!on || document.pointerLockElement !== cv) return; P.yaw -= e.movementX * .0022; P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch - e.movementY * .0022)); });
  // érintés / zár nélküli egér: húzással nézelődés, koppintással művelet
  let dr = null; cv.addEventListener('pointerdown', e => { if (document.pointerLockElement === cv || e.pointerType === 'mouse') return; dr = { x: e.clientX, y: e.clientY, m: 0 }; }); cv.addEventListener('pointermove', e => { if (!dr) return; const dx = e.clientX - dr.x, dy = e.clientY - dr.y; dr.m += Math.abs(dx) + Math.abs(dy); P.yaw += dx * .005; P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch + dy * .005)); dr.x = e.clientX; dr.y = e.clientY; }); cv.addEventListener('pointerup', () => { if (dr && dr.m < 8) interact(); dr = null; });
  addEventListener('keydown', e => { if (e.target.tagName !== 'INPUT') keys[e.code] = 1; }); addEventListener('keyup', e => { keys[e.code] = 0; }); addEventListener('blur', () => { for (const k in keys) keys[k] = 0; }); addEventListener('resize', size); }
function size() { if (!R) return; R.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
export function start() { on = true; size(); document.querySelector('#xh').hidden = false; sig = ''; }
export function stop() { on = false; document.querySelector('#xh').hidden = true; if (document.pointerLockElement === cv) document.exitPointerLock(); }
export const look = (x, z, yaw, pitch) => { P.x = x; P.z = z; P.yaw = yaw; P.pitch = pitch; };

export function frame(dt) { if (!on) return; const S = A.S, D = dims(), s2 = S.site + '|' + S.racks.map(r => r ? r.t : '-').join(',');
  if (s2 !== sig) { sig = s2; build(); P.x = Math.max(D.x0 + .3, Math.min(D.x1 - .3, P.x)); P.z = Math.max(D.z0 + .3, Math.min(D.z1 - .3, P.z)); }
  // mozgás
  const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0), sd = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0); if (f || sd) { const v = (keys.ShiftLeft ? 4.2 : 2.2) * dt / Math.hypot(f, sd), sn = Math.sin(P.yaw), cs = Math.cos(P.yaw); let nx = P.x + (-sn * f + cs * sd) * v, nz = P.z + (-cs * f - sn * sd) * v;
    nx = Math.max(D.x0 + .3, Math.min(D.x1 - .3, nx)); nz = Math.max(D.z0 + .3, Math.min(D.z1 - .3, nz)); const rw = D.cols * A.RX * K;
    for (let r = 0; r < D.rows; r++) { const zf = -r * ROWZ, xa = r ? -.25 : D.x0, inX = x => x > xa && x < rw + .15, inZ = z => z > zf - DEPTH - .3 && z < zf + .35; if (inX(nx) && inZ(nz)) { if (!inZ(P.z)) nz = P.z; else if (!inX(P.x)) nx = P.x; else nz = P.z > zf - DEPTH / 2 ? zf + .35 : zf - DEPTH - .3; } } P.x = nx; P.z = nz; }
  cam.position.set(P.x, keys.KeyC || keys.ControlLeft ? .85 : EYE, P.z); cam.rotation.set(P.pitch, P.yaw, 0);
  // célzás
  aim = pick(); const sel = A.sel, pl = A.place, hp = aim && A.hitPort(aim.x, aim.y), hu = aim && A.hitU(aim.x, aim.y); if (aim) A.setMouse(aim.x, aim.y); document.querySelector('#xh').classList.toggle('hot', !!(hp || (hu && (hu.dev || pl))));
  if (A.gen !== gen) { gen = A.gen; for (const i of RT.keys()) paint(i); A.wallTo(wallT.x, wallT.k); wallT.t.needsUpdate = true; cables(); }
  else { const hv = hu ? hu.ri : -1; if ((sel || pl) && (hv >= 0 || lastHover >= 0)) { if (lastHover >= 0 && lastHover !== hv) paint(lastHover); if (hv >= 0) paint(hv); } lastHover = sel || pl ? hv : -1;
    if ((ledT -= dt) <= 0) { ledT = .3; let n = 0; for (const i of RT.keys()) { const [x] = A.rackXY(i), zf = -Math.floor(i / A.ROW) * ROWZ; if (Math.hypot(x * K + .3 - P.x, zf - P.z) < 5 && n++ < 6) paint(i); } if (sel) { A.wallTo(wallT.x, wallT.k); wallT.t.needsUpdate = true; } } }
  // a kézben tartott kábel
  if (sel) { const pts = [[sel.x, sel.y], ...sel.w].map(q => to3(q[0], q[1], .03)); const dir = new THREE.Vector3(); cam.getWorldDirection(dir); pts.push(aim ? to3(aim.x, aim.y, .03) : cam.position.clone().addScaledVector(dir, .8).add(new THREE.Vector3(0, -.25, 0))); held.geometry.setFromPoints(pts); held.material.color.set(sel.k === 'n' ? 0x4cc9f0 : 0x888888); held.visible = true; } else held.visible = false;
  R.render(scene, cam); }
