// Az Átemelőtelep – a telep pályája kódból: ütközők, látvány, interakciós pontok, fényforrások, zónák.
import { Geo } from './motor.js?v=202611211432';
export const PR = .3, PH = 1.75, EYE = 1.62;
const WELL = { x0: 4, x1: 12, z0: -12, z1: -4, floor: -5, plat: -2.2, platZ: -9.6 };   // szivattyúakna (nedves akna)
export { WELL };

export function buildLevel() {
  const L = { boxes: [], it: [], lamps: {}, indoor: [], g: new Geo(), W: 120, D: 110 };
  const box = (x0, y0, z0, x1, y1, z1, c, solid = 1, e = 0) => { L.g.box([x0, y0, z0], [x1, y1, z1], c, e); if (solid) L.boxes.push({ a: [x0, y0, z0], b: [x1, y1, z1] }); };
  const col = (x0, y0, z0, x1, y1, z1) => L.boxes.push({ a: [x0, y0, z0], b: [x1, y1, z1] });
  const it = (id, x0, y0, z0, x1, y1, z1, label) => L.it.push({ id, a: [x0, y0, z0], b: [x1, y1, z1], label });
  // talaj (a kút alaprajzában lyuk), út, murva
  const G = L.g, gr = [.16, .2, .13], gv = [.27, .27, .26];
  for (let x = -60; x < 60; x += 6) for (let z = -60; z < 50; z += 6) { if (x + 6 > WELL.x0 && x < WELL.x1 && z + 6 > WELL.z0 && z < WELL.z1) continue; const site = x >= -30 && x < 30 && z >= -30 && z < 18, k = .9 + ((Math.sin(x * 3.1 + z * 7.7) * 999) % 1 + 1) % 1 * .16; G.quad([x, 0, z], [x, 0, z + 6], [x + 6, 0, z + 6], [x + 6, 0, z], (site ? gv : gr).map(v => v * k)); }
  // a kút körüli talajrész pontosan a lyukig
  for (const [x0, z0, x1, z1] of [[0, -12, 4, -4], [12, -12, 18, -4], [0, -18, 18, -12], [0, -4, 18, 0]]) G.quad([x0, .001, z0], [x0, .001, z1], [x1, .001, z1], [x1, .001, z0], gv);
  for (let z = 18; z < 50; z += 4) G.quad([-2.5, .01, z], [-2.5, .01, z + 4], [2.5, .01, z + 4], [2.5, .01, z], [.12, .12, .13]);
  // kerítés (2,2 m), déli kapu nyitva, keleti kapu zárva
  const fence = (x0, z0, x1, z1) => { const c = [.42, .46, .44]; box(Math.min(x0, x1) - .04, 0, Math.min(z0, z1) - .04, Math.max(x0, x1) + .04, 2.2, Math.max(z0, z1) + .04, c.map(v => v * .7), 1); const len = Math.hypot(x1 - x0, z1 - z0); for (let k = 0; k <= len; k += 3) { const t = k / len; box(x0 + (x1 - x0) * t - .05, 0, z0 + (z1 - z0) * t - .05, x0 + (x1 - x0) * t + .05, 2.4, z0 + (z1 - z0) * t + .05, [.3, .32, .32], 0); } };
  fence(-30, 18, -2.5, 18); fence(2.5, 18, 30, 18); fence(-30, -30, 30, -30); fence(-30, -30, -30, 18); fence(30, -30, 30, -24); fence(30, -20, 30, 18);
  box(-2.5, 0, 18, -2.3, 2.1, 22, [.36, .4, .38], 1); box(2.3, 0, 18, 2.5, 2.1, 22, [.36, .4, .38], 1);   // kitárt kapuszárnyak
  it('lanc', -.6, 0, 18.6, .6, 1.2, 19.4, 'Elvágott lánc megvizsgálása');
  // keleti kapu (a szántó felé) – kulccsal nyitható
  L.eastGate = { a: [29.9, 0, -24], b: [30.1, 2.1, -20] }; col(29.9, 0, -24, 30.1, 2.1, -20); L.gateCol = L.boxes.length - 1; it('keletikapu', 29.4, 0, -24, 30.6, 2.1, -20, 'Keleti kapu');
  // szolgálati kisbusz a kapu előtt
  box(1.2, .3, 24, 4, 2.4, 29.5, [.85, .86, .88], 1); box(1.25, 1.4, 24.05, 3.95, 2.2, 24.9, [.15, .2, .26], 0, .05); box(1.2, 0, 24.4, 1.6, .55, 25.4, [.08, .08, .08], 0); box(3.6, 0, 24.4, 4, .55, 25.4, [.08, .08, .08], 0); box(1.2, 0, 28.2, 1.6, .55, 29.2, [.08, .08, .08], 0); box(3.6, 0, 28.2, 4, .55, 29.2, [.08, .08, .08], 0);
  box(1.3, 1.6, 25.6, 1.25, 1.7, 28, [.95, .62, .18], 0, .3); it('busz', .6, .3, 25.5, 1.4, 2.2, 29, 'Szolgálati kisbusz – szerszámok');
  // vezérlőkonténer (ajtó kelet felől)
  const cx0 = -16, cx1 = -8, cz0 = -4, cz1 = 2, ch = 2.6, w = .15, cc = [.78, .8, .72];
  box(cx0, 0, cz0, cx1, ch, cz0 + w, cc); box(cx0, 0, cz1 - w, cx1, ch, cz1, cc); box(cx0, 0, cz0, cx0 + w, ch, cz1, cc); box(cx1 - w, 0, cz0, cx1, ch, -1.6, cc); box(cx1 - w, 0, -.4, cx1, ch, cz1, cc); box(cx1 - w, 2.1, -1.6, cx1, ch, -.4, cc);
  box(cx0 - .1, ch, cz0 - .1, cx1 + .1, ch + .18, cz1 + .1, [.55, .57, .52]); G.box([cx0 + w, .02, cz0 + w], [cx1 - w, .04, cz1 - w], [.3, .28, .26]); L.indoor.push([cx0, cz0, cx1, cz1]);
  L.door = { hinge: [cx1, -1.6], w: 1.2 }; col(cx1 - .05, 0, -1.6, cx1 + .05, 2.1, -.4); L.doorCol = L.boxes.length - 1; it('ajto', cx1 - .3, 0, -1.6, cx1 + .3, 2.1, -.4, 'Konténerajtó');
  // kapcsolószekrény (a hátsó falnál), modem, asztal, fiók, polc, napló
  box(-15.6, 0, -3.85, -13.8, 2.0, -3.35, [.86, .86, .84]); box(-15.55, .1, -3.36, -13.85, 1.95, -3.33, [.78, .78, .76], 0); it('szekreny', -15.7, 0, -3.9, -13.7, 2, -3.1, 'Kapcsolószekrény (+S1)');
  box(-13.4, 1.4, -3.85, -12.8, 1.75, -3.7, [.2, .22, .26]); it('modem', -13.5, 1.35, -3.9, -12.7, 1.8, -3.4, 'VPN-modem');
  box(-12.3, 0, 1.25, -9.3, .76, 1.85, [.55, .4, .26]); box(-11.6, .76, 1.55, -10.4, 1.2, 1.65, [.08, .09, .1]); L.screen = { a: [-11.55, .82, 1.53], b: [-10.45, 1.16, 1.55] }; it('terminal', -11.8, .7, 1.1, -10.2, 1.3, 1.85, 'SCADA-terminál');
  it('fiok', -9.9, .3, 1.15, -9.4, .7, 1.85, 'Íróasztal fiókja'); box(-10, .78, 1.3, -9.6, .82, 1.6, [.7, .2, .15]); it('naplo', -10.1, .76, 1.25, -9.5, .9, 1.65, 'Műszaknapló');
  box(-15.85, 0, -2.6, -15.4, 2.0, .6, [.4, .42, .44]); for (let y = .4; y < 2; y += .5) box(-15.85, y, -2.6, -15.4, y + .03, .6, [.3, .3, .3], 0); box(-15.8, .43, -2.4, -15.45, .75, -1.6, [.62, .46, .28], 0); box(-15.8, .93, -.8, -15.45, 1.2, .2, [.2, .4, .7], 0);
  it('rajz', -15.9, .9, -1.6, -15.3, 1.4, -.4, 'Kapcsolási rajzok (dosszié)');
  L.lamps.cont = [-12, 2.45, -1, 7, 1, .97, .9]; box(-12.6, 2.5, -1.06, -11.4, 2.58, -.94, [.9, .9, .95], 0); L.tube = { a: [-12.55, 2.47, -1.04], b: [-11.45, 2.5, -.96] };
  // szivattyúakna (nedves akna): födém búvónyílással, szellőztető, belső pihenő
  const K = WELL, kc = [.55, .55, .52];
  box(K.x0, -5, K.z0, K.x1, .25, K.z0 + .25, kc); box(K.x0, -5, K.z1 - .25, K.x1, .25, K.z1, kc); box(K.x0, -5, K.z0, K.x0 + .25, .25, K.z1, kc); box(K.x1 - .25, -5, K.z0, K.x1, .25, K.z1, kc);
  box(K.x0, 0, K.z0, 5.4, .25, K.z1, kc); box(6.6, 0, K.z0, K.x1, .25, K.z1, kc); box(5.4, 0, K.z0, 6.6, .25, -11.2, kc); box(5.4, 0, -10, 6.6, .25, K.z1, kc);   // födém, lyuk 5,4–6,6 × -11,2…-10
  box(K.x0, -5.02, K.z0, K.x1, -5, K.z1, [.25, .26, .24]); for (const s of [[K.x0, -5, K.z0, K.x1, 0, K.z0 + .26], [K.x0, -5, K.z1 - .26, K.x1, 0, K.z1], [K.x0, -5, K.z0, K.x0 + .26, 0, K.z1], [K.x1 - .26, -5, K.z0, K.x1, 0, K.z1]]) G.box(s.slice(0, 3), s.slice(3), [.42, .43, .4]);
  box(K.x0 + .25, K.plat - .2, K.z0 + .25, K.x1 - .25, K.plat, K.platZ, [.5, .5, .48]); for (let x = K.x0 + .4; x < K.x1 - .2; x += 1.2) box(x, K.plat, K.platZ - .05, x + .05, K.plat + 1, K.platZ, [.85, .7, .1], 0); box(K.x0 + .25, K.plat + .95, K.platZ - .05, K.x1 - .25, K.plat + 1.02, K.platZ, [.85, .7, .1], 1); col(K.x0 + .25, K.plat, K.platZ - .05, K.x1 - .25, K.plat + 1.4, K.platZ);
  for (let y = K.plat; y < .2; y += .3) box(5.7, y, -11.7, 6.3, y + .04, -11.62, [.7, .72, .7], 0); box(5.68, K.plat, -11.75, 5.72, .9, -11.62, [.7, .72, .7], 0); box(6.28, K.plat, -11.75, 6.32, .9, -11.62, [.7, .72, .7], 0);
  it('fedel', 5.3, 0, -11.3, 6.7, .5, -9.9, 'Búvónyílás'); it('letra_le', 5.4, .1, -11.3, 6.6, .6, -10, 'Lemászás az aknába'); it('letra_fel', 5.4, K.plat, -11.8, 6.6, K.plat + 2, -11.2, 'Felmászás');
  L.lamps.well = [8, -1, -8, 9, .9, .95, 1]; box(7.7, -.6, -11.75, 8.3, -.4, -11.6, [.9, .9, .9], 0); L.wellLamp = { a: [7.72, -.58, -11.62], b: [8.28, -.42, -11.58] };
  box(10.2, .25, -5.8, 11.4, 1.1, -4.6, [.3, .45, .6]); G.hcyl([10.2, .8, -5.2], [6.6, .4, -10.4], .15, [.15, .15, .15]); it('vent', 10, .25, -6, 11.6, 1.3, -4.4, 'Akna szellőztető ventilátor');
  // úszókapcsolók konzolja, szivattyúk vezetősínei, láncos emelő
  box(4.6, K.plat, -9.7, 4.75, K.plat + 1.4, -9.55, [.6, .6, .6], 0); it('uszo', 4.4, K.plat, -9.9, 5.3, K.plat + 1.6, -9.4, 'Úszókapcsolók (LSH1, LSL1)');
  for (const [x, id] of [[7, 'p1'], [10, 'p2']]) { box(x - .35, K.plat, -9.7, x - .3, K.plat + 1.6, -9.6, [.6, .6, .6], 0); box(x + .3, K.plat, -9.7, x + .35, K.plat + 1.6, -9.6, [.6, .6, .6], 0); box(x - .35, K.plat + 1.55, -9.7, x + .35, K.plat + 1.62, -9.6, [.6, .6, .6], 0); it('emelo_' + id, x - .6, K.plat, -10.2, x + .6, K.plat + 1.8, -9.5, id.toUpperCase() + ' szivattyú – láncos emelő');
    G.box([x - .03, -5, -7.05], [x + .03, K.plat, -6.95], [.6, .6, .6]); G.hcyl([x, -4.3, -7], [x, .25, -7], .08, [.4, .42, .45]); }
  // szelepakna és a nyomóvezeték jelzőoszlopai
  box(13.5, 0, -11, 17, .3, -5, kc); box(14.6, .3, -8.6, 15.4, .35, -7.4, [.2, .2, .2]); G.hcyl([12, .15, -7], [13.5, .15, -7], .12, [.4, .42, .45]);
  for (const [x, z] of [[20, -8], [26, -14], [34, -20], [42, -22]]) box(x - .06, 0, z - .06, x + .06, 1, z + .06, [.95, .8, .1], 1, .15);
  // generátor, átkapcsoló, tartály, antenna
  box(-26, 0, -22, -20, 2.2, -17, [.86, .58, .12]); box(-25.8, 2.2, -21.8, -20.2, 2.3, -17.2, [.5, .4, .2]); box(-20.02, .9, -20.2, -19.95, 1.6, -19.2, [.15, .16, .18]); it('generator', -20.4, .8, -20.5, -19.5, 1.8, -18.9, 'Aggregát vezérlőpanel'); it('tank', -23.6, .5, -17.1, -22.4, 1.4, -16.6, 'Üzemanyag-betöltő');
  box(-17.6, 0, -19.4, -17.4, 1.3, -19.2, [.4, .4, .4]); box(-17.9, 1.1, -19.6, -17.1, 1.9, -19.0, [.8, .8, .78]); it('ats', -18.1, 1, -19.8, -16.9, 2, -18.8, 'Hálózat–generátor átkapcsoló');
  box(-17.1, 0, -5.1, -16.9, 6, -4.9, [.6, .6, .6]); box(-17.05, 5.6, -5.4, -16.95, 6.3, -5.3, [.9, .9, .9], 0); box(-17.3, .4, -5.4, -16.7, 1.2, -4.9, [.5, .5, .5]); it('antenna', -17.5, .3, -5.6, -16.5, 1.3, -4.7, 'Antenna-csatlakozódoboz');
  // gázolajos kanna, lámpaoszlopok, fák, tolózár a szántón
  it('kanna', -6.6, 0, 3.4, -6, .5, 4, 'Gázolajos kanna');
  for (const [x, z, k] of [[0, 10, 'l1'], [-5, -7, 'l2'], [15, -15, 'l3']]) { box(x - .07, 0, z - .07, x + .07, 5, z + .07, [.4, .42, .44]); box(x - .3, 4.9, z - .1, x + .3, 5, z + .1, [.9, .9, .85], 0); L.lamps[k] = [x, 4.6, z, 16, 1, .85, .6]; }
  for (const [x, z] of [[-36, 22], [-40, -8], [-34, -34], [38, 24], [40, 4], [-12, 30], [14, 34], [46, -40], [60, -10], [36, -36]]) { G.cyl(x, z, .25, 3, 0, [.25, .18, .12], 6); G.cyl(x, z, 1.6, 2.6, 2.6, [.12, .2, .12], 7); col(x - .25, 0, z - .25, x + .25, 3, z + .25); }
  box(51.5, 0, -22.5, 52.5, .15, -21.5, [.18, .18, .2]); G.cyl(52, -22, .18, .16, .15, [.1, .1, .1], 8); it('tolozar', 51, 0, -23, 53, 1, -21, 'Tolózár a nyomóvezetéken (DN150)');
  for (let x = 32; x < 52; x += 2) G.quad([x, .012, -23], [x, .012, -21], [x + 2, .012, -21], [x + 2, .012, -23], [.2, .17, .12]);
  // kerítéslyuk (Szilárd erre jött)
  it('lyuk', -30.5, 0, -11, -29.5, 2, -9, 'Átvágott kerítés');
  L.spots = { start: [0, 0, 33, 0], gate: [0, 0, 16, 0], cont: [-9.2, 0, -1, -Math.PI / 2], well: [6, 0, -9, Math.PI], wellIn: [6, WELL.plat, -10.6, 0], gen: [-19, 0, -19.6, Math.PI / 2], valve: [50, 0, -22, -Math.PI / 2] };
  index(L); return L;
}

/* ---------- ütközés (rács a gyors lekérdezéshez) ---------- */
const CS = 4;
function index(L) { L.gw = Math.ceil(L.W / CS) + 2; L.gd = Math.ceil(L.D / CS) + 2; L.grid = Array.from({ length: L.gw * L.gd }, () => []); L.st = 0; L.boxes.forEach(b => { b.s = 0; for (let x = cx(L, b.a[0]); x <= cx(L, b.b[0]); x++) for (let z = cz(L, b.a[2]); z <= cz(L, b.b[2]); z++) L.grid[z * L.gw + x].push(b); }); }
const cx = (L, x) => Math.max(0, Math.min(L.gw - 1, Math.floor((x + 60) / CS) + 1)), cz = (L, z) => Math.max(0, Math.min(L.gd - 1, Math.floor((z + 60) / CS) + 1));
function near(L, x0, z0, x1, z1, fn) { const st = ++L.st; for (let x = cx(L, x0); x <= cx(L, x1); x++) for (let z = cz(L, z0); z <= cz(L, z1); z++) for (const b of L.grid[z * L.gw + x]) { if (b.s === st || b.off) continue; b.s = st; if (fn(b)) return b; } return null; }
export const overlap = (L, x, y, z) => near(L, x - PR, z - PR, x + PR, z + PR, b => x + PR > b.a[0] && x - PR < b.b[0] && z + PR > b.a[2] && z - PR < b.b[2] && y + PH > b.a[1] + 1e-3 && y < b.b[1] - 1e-3);
export const inWellXZ = (x, z) => x > WELL.x0 && x < WELL.x1 && z > WELL.z0 && z < WELL.z1;
export function move(L, p, mx, my, run, dt) {
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw); let wx = fx * mx + rx * my, wz = fz * mx + rz * my; const wl = Math.hypot(wx, wz); if (wl > 1) { wx /= wl; wz /= wl; }
  const sp = run ? 4.6 : 2.6, k = Math.min(1, dt * 10); p.vx += (wx * sp - p.vx) * k; p.vz += (wz * sp - p.vz) * k; p.vy -= 20 * dt;
  for (const ax of [0, 2]) { const v = ax ? p.vz : p.vx; if (!v) continue; const old = ax ? p.z : p.x; if (ax) p.z += v * dt; else p.x += v * dt; const h = overlap(L, p.x, p.y, p.z); if (!h) continue;
    if (h.b[1] - p.y <= .32 && !overlap(L, p.x, h.b[1] + .001, p.z)) { p.y = h.b[1] + .001; continue; } if (ax) { p.z = old; p.vz = 0; } else { p.x = old; p.vx = 0; } }
  p.y += p.vy * dt; const floor = inWellXZ(p.x, p.z) && p.y < -.5 ? -99 : 0;
  if (p.y <= floor) { p.y = floor; p.vy = 0; } else { const h = overlap(L, p.x, p.y, p.z); if (h) { if (p.vy <= 0) { p.y = h.b[1] + .001; p.vy = 0; } else { p.y = h.a[1] - PH - .001; p.vy = 0; } } }
  p.x = Math.max(-59, Math.min(59, p.x)); p.z = Math.max(-59, Math.min(49, p.z));
}
// sugár az interakciós dobozokra (a legközelebbi, ami nincs fal mögött)
export function pick(L, ox, oy, oz, d, maxT, ok) { let best = null, bt = maxT;
  for (const o of L.it) { if (ok && !ok(o)) continue; const t = slab(ox, oy, oz, d, o.a, o.b, bt); if (t >= 0 && t < bt) { bt = t; best = o; } }
  if (best) { const w = near(L, Math.min(ox, ox + d[0] * bt), Math.min(oz, oz + d[2] * bt), Math.max(ox, ox + d[0] * bt), Math.max(oz, oz + d[2] * bt), b => { const t = slab(ox, oy, oz, d, b.a, b.b, bt); return t >= 0 && t < bt - .25; }); if (w) return null; }
  return best; }
function slab(ox, oy, oz, d, a, b, maxT) { let t0 = 0, t1 = maxT; const o = [ox, oy, oz]; for (let i = 0; i < 3; i++) { if (Math.abs(d[i]) < 1e-9) { if (o[i] < a[i] || o[i] > b[i]) return -1; continue; } let ta = (a[i] - o[i]) / d[i], tb = (b[i] - o[i]) / d[i]; if (ta > tb) { const q = ta; ta = tb; tb = q; } if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) return -1; } return t0; }
