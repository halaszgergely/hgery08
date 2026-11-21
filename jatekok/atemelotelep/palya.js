// Az Átemelőtelep – a telep alaprajza: ütköző dobozok, interakciós pontok, fényforrások, zónák, kezdőpontok.
// Megjelenítés nincs benne (azt a latvany.js építi ugyanezekre a koordinátákra), ezért Node-ból is betölthető (tesztek).
export const PR = .3, PH = 1.75, EYE = 1.62;
export const WELL = { x0: 4, x1: 12, z0: -12, z1: -4, floor: -5, plat: -2.2, platZ: -9.6 };   // szivattyúakna (nedves akna)
export const CONT = { x0: -16, x1: -8, z0: -4, z1: 2, h: 2.6, w: .15 };                        // vezérlőkonténer
export const GEN = { x0: -26, x1: -20, z0: -22, z1: -17, h: 2.2 };                             // aggregát
export const VAN = { x0: 1.2, x1: 4, z0: 24, z1: 29.5 };                                         // szolgálati kisbusz
export const TREES = [[-36, 22], [-40, -8], [-34, -34], [38, 24], [40, 4], [-12, 30], [14, 34], [46, -40], [60, -10], [36, -36]];
export const POLES = [[0, 10, 'l1'], [-5, -7, 'l2'], [15, -15, 'l3']];
export const MARKERS = [[20, -8], [26, -14], [34, -20], [42, -22]];
export const HOLE = { x: -30, z0: -10.5, z1: -9.5 };                                             // Szilárd kerítéslyuka
export const FENCES = [[-30, 18, -2.5, 18], [2.5, 18, 30, 18], [-30, -30, 30, -30], [-30, -30, -30, HOLE.z0], [-30, HOLE.z1, -30, 18], [30, -30, 30, -24], [30, -20, 30, 18]];

export function buildLevel() {
  const L = { boxes: [], it: [], lamps: {}, indoor: [], W: 120, D: 110 };
  const col = (x0, y0, z0, x1, y1, z1, tag) => { L.boxes.push({ a: [x0, y0, z0], b: [x1, y1, z1], tag }); return L.boxes.length - 1; };
  const it = (id, x0, y0, z0, x1, y1, z1, label) => L.it.push({ id, a: [x0, y0, z0], b: [x1, y1, z1], label });
  // kerítés (2,2 m); a nyugati oldalon emberméretű lyuk, déli kapu nyitva, keleti kapu zárva
  for (const [x0, z0, x1, z1] of FENCES) col(Math.min(x0, x1) - .04, 0, Math.min(z0, z1) - .04, Math.max(x0, x1) + .04, 2.2, Math.max(z0, z1) + .04, 'fence');
  col(-2.5, 0, 18, -2.3, 2.1, 22, 'gateleaf'); col(2.3, 0, 18, 2.5, 2.1, 22, 'gateleaf');
  it('lanc', -.6, 0, 18.6, .6, 1.2, 19.4, 'Elvágott lánc megvizsgálása');
  L.eastGate = { a: [29.9, 0, -24], b: [30.1, 2.1, -20] }; L.gateCol = col(29.9, 0, -24, 30.1, 2.1, -20, 'gate'); it('keletikapu', 29.4, 0, -24, 30.6, 2.1, -20, 'Keleti kapu');
  // szolgálati kisbusz (tolóajtó a bal, nyugati oldalon)
  col(VAN.x0, .3, VAN.z0, VAN.x1, 2.4, VAN.z1, 'van'); it('busz', .6, .3, 25.5, 1.4, 2.2, 29, 'Szolgálati kisbusz – szerszámok');
  // vezérlőkonténer (ajtó kelet felől)
  const { x0: cx0, x1: cx1, z0: cz0, z1: cz1, h: ch, w } = CONT;
  col(cx0, 0, cz0, cx1, ch, cz0 + w); col(cx0, 0, cz1 - w, cx1, ch, cz1); col(cx0, 0, cz0, cx0 + w, ch, cz1); col(cx1 - w, 0, cz0, cx1, ch, -1.6); col(cx1 - w, 0, -.4, cx1, ch, cz1); col(cx1 - w, 2.1, -1.6, cx1, ch, -.4);
  col(cx0 - .1, ch, cz0 - .1, cx1 + .1, ch + .18, cz1 + .1); L.indoor.push([cx0, cz0, cx1, cz1]);
  L.door = { hinge: [cx1, -1.6], w: 1.2 }; L.doorCol = col(cx1 - .05, 0, -1.6, cx1 + .05, 2.1, -.4, 'door'); it('ajto', cx1 - .3, 0, -1.6, cx1 + .3, 2.1, -.4, 'Konténerajtó');
  col(-15.6, 0, -3.85, -13.8, 2.0, -3.35); it('szekreny', -15.7, 0, -3.9, -13.7, 2, -3.1, 'Kapcsolószekrény (+S1)');
  col(-13.4, 1.4, -3.85, -12.8, 1.75, -3.7); it('modem', -13.5, 1.35, -3.9, -12.7, 1.8, -3.4, 'VPN-modem');
  col(-12.3, 0, 1.25, -9.3, .76, 1.85); col(-11.6, .76, 1.55, -10.4, 1.2, 1.65); L.screen = { a: [-11.55, .82, 1.53], b: [-10.45, 1.16, 1.55] }; it('terminal', -11.8, .7, 1.1, -10.2, 1.3, 1.85, 'SCADA-terminál');
  it('fiok', -9.9, .3, 1.15, -9.4, .7, 1.85, 'Íróasztal fiókja'); it('naplo', -10.1, .76, 1.25, -9.5, .9, 1.65, 'Műszaknapló');
  col(-15.85, 0, -2.6, -15.4, 2.0, .6); it('rajz', -15.9, .9, -1.6, -15.3, 1.4, -.4, 'Kapcsolási rajzok (dosszié)');
  L.lamps.cont = [-12, 2.45, -1, 7, 1, .97, .9]; L.tube = { a: [-12.55, 2.47, -1.04], b: [-11.45, 2.5, -.96] };
  // szivattyúakna: falak, födém búvónyílással (5,4–6,6 × −11,2…−10), belső pihenő korláttal, létra
  const K = WELL;
  col(K.x0, -5, K.z0, K.x1, .25, K.z0 + .25); col(K.x0, -5, K.z1 - .25, K.x1, .25, K.z1); col(K.x0, -5, K.z0, K.x0 + .25, .25, K.z1); col(K.x1 - .25, -5, K.z0, K.x1, .25, K.z1);
  col(K.x0, 0, K.z0, 5.4, .25, K.z1); col(6.6, 0, K.z0, K.x1, .25, K.z1); col(5.4, 0, K.z0, 6.6, .25, -11.2); col(5.4, 0, -10, 6.6, .25, K.z1);
  col(K.x0, -5.02, K.z0, K.x1, -5, K.z1); col(K.x0 + .25, K.plat - .2, K.z0 + .25, K.x1 - .25, K.plat, K.platZ);
  col(K.x0 + .25, K.plat + .95, K.platZ - .05, K.x1 - .25, K.plat + 1.02, K.platZ); col(K.x0 + .25, K.plat, K.platZ - .05, K.x1 - .25, K.plat + 1.4, K.platZ);
  // a fedél: zárva a nyílás fölött, nyitva függőlegesen áll a nyílás északi szélén – így nyitott állapotban a létra külön célozható
  it('fedel', 5.3, 0, -11.3, 6.7, .5, -9.9, 'Búvónyílás fedele');
  it('fedel_le', 5.35, .25, -11.45, 6.65, 1.5, -11.1, 'Búvónyílás fedelének lecsukása');
  it('letra_le', 5.4, .05, -11.1, 6.6, .45, -10, 'Lemászás az aknába');
  it('letra_fel', 5.4, K.plat, -11.8, 6.6, K.plat + 2, -11.2, 'Felmászás');
  L.lamps.well = [8, -1, -8, 9, .9, .95, 1]; L.wellLamp = { a: [7.72, -.58, -11.62], b: [8.28, -.42, -11.58] };
  col(10.2, .25, -5.8, 11.4, 1.1, -4.6); it('vent', 10, .25, -6, 11.6, 1.3, -4.4, 'Akna szellőztető ventilátor');
  it('uszo', 4.4, K.plat, -9.9, 5.3, K.plat + 1.6, -9.4, 'Úszókapcsolók (LSH1, LSL1)');
  for (const [x, id] of [[7, 'p1'], [10, 'p2']]) it('emelo_' + id, x - .6, K.plat, -10.2, x + .6, K.plat + 1.8, -9.5, id.toUpperCase() + ' szivattyú – láncos emelő');
  // szelepakna, a nyomóvezeték sárga jelzőoszlopai
  col(13.5, 0, -11, 17, .3, -5); for (const [x, z] of MARKERS) col(x - .06, 0, z - .06, x + .06, 1, z + .06);
  // aggregát (a betöltőnyílás a déli, +z oldalon), átkapcsoló, antenna
  col(GEN.x0, 0, GEN.z0, GEN.x1, GEN.h, GEN.z1); col(-25.8, 2.2, -21.8, -20.2, 2.3, -17.2); col(-20.02, .9, -20.2, -19.95, 1.6, -19.2);
  it('generator', -20.4, .8, -20.5, -19.5, 1.8, -18.9, 'Aggregát vezérlőpanel'); it('tank', -23.6, .5, -17.1, -22.4, 1.4, -16.6, 'Üzemanyag-betöltő');
  col(-17.6, 0, -19.4, -17.4, 1.3, -19.2); col(-17.9, 1.1, -19.6, -17.1, 1.9, -19.0); it('ats', -18.1, 1, -19.8, -16.9, 2, -18.8, 'Hálózat–generátor átkapcsoló');
  col(-17.1, 0, -5.1, -16.9, 6, -4.9); col(-17.3, .4, -5.4, -16.7, 1.2, -4.9); it('antenna', -17.5, .3, -5.6, -16.5, 1.3, -4.7, 'Antenna-csatlakozódoboz');
  it('kanna', -6.6, 0, 3.4, -6, .5, 4, 'Gázolajos kanna');
  for (const [x, z, k] of POLES) { col(x - .07, 0, z - .07, x + .07, 5, z + .07); L.lamps[k] = [x, 4.6, z, 16, 1, .85, .6]; }
  for (const [x, z] of TREES) col(x - .25, 0, z - .25, x + .25, 3, z + .25);
  col(51.5, 0, -22.5, 52.5, .15, -21.5); it('tolozar', 51, 0, -23, 53, 1, -21, 'Tolózár a nyomóvezetéken (DN150)');
  it('kartya', 51.2, 0, -22.8, 52.8, .6, -21.2, 'Névjegy a tolózár fedelén');
  it('lyuk', -30.5, 0, -11, -29.5, 2, -9, 'Átvágott kerítés');
  L.spots = { start: [0, 0, 33, 0], gate: [0, 0, 16, 0], cont: [-9.2, 0, -1, -Math.PI / 2], well: [6, 0, -9, Math.PI], wellIn: [6, WELL.plat, -10.6, 0], gen: [-19, 0, -19.6, Math.PI / 2], valve: [50, 0, -22, -Math.PI / 2] };
  index(L); return L;
}

/* ---------- melyik interakciós pont használható az adott állapotban ---------- */
export function itVisible(o, S) { const inW = S.well.in;
  if (['letra_fel', 'uszo', 'emelo_p1', 'emelo_p2'].includes(o.id)) return !!inW; if (inW) return false;
  switch (o.id) {
    case 'fedel': return !S.well.hatch; case 'fedel_le': case 'letra_le': return !!S.well.hatch;
    case 'kanna': return !S.f.tookKanna; case 'kartya': return S.ch === 6; case 'tolozar': return S.ch !== 6;
  } return true; }

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
  for (let ax = 0; ax <= 2; ax += 2) { const v = ax ? p.vz : p.vx; if (!v) continue; const old = ax ? p.z : p.x; if (ax) p.z += v * dt; else p.x += v * dt; const h = overlap(L, p.x, p.y, p.z); if (!h) continue;
    if (h.b[1] - p.y <= .32 && !overlap(L, p.x, h.b[1] + .001, p.z)) { p.y = h.b[1] + .001; continue; } if (ax) { p.z = old; p.vz = 0; } else { p.x = old; p.vx = 0; } }
  p.y += p.vy * dt; const floor = inWellXZ(p.x, p.z) && p.y < -.5 ? -99 : 0;
  if (p.y <= floor) { p.y = floor; p.vy = 0; } else { const h = overlap(L, p.x, p.y, p.z); if (h) { if (p.vy <= 0) { p.y = h.b[1] + .001; p.vy = 0; } else { p.y = h.a[1] - PH - .001; p.vy = 0; } } }
  p.x = Math.max(-59, Math.min(59, p.x)); p.z = Math.max(-59, Math.min(49, p.z));
}
// sugár az interakciós dobozokra (a legközelebbi, ami nincs fal mögött); d: [x, y, z] egységvektor
export function pick(L, ox, oy, oz, d, maxT, ok) { let best = null, bt = maxT;
  for (const o of L.it) { if (ok && !ok(o)) continue; const t = slab(ox, oy, oz, d, o.a, o.b, bt); if (t >= 0 && t < bt) { bt = t; best = o; } }
  if (best) { const ex = ox + d[0] * bt, ez = oz + d[2] * bt, w = near(L, Math.min(ox, ex), Math.min(oz, ez), Math.max(ox, ex), Math.max(oz, ez), b => { const t = slab(ox, oy, oz, d, b.a, b.b, bt); return t >= 0 && t < bt - .25; }); if (w) return null; }
  return best; }
export function slab(ox, oy, oz, d, a, b, maxT) { let t0 = 0, t1 = maxT;
  for (let i = 0; i < 3; i++) { const o = i === 0 ? ox : i === 1 ? oy : oz; if (Math.abs(d[i]) < 1e-9) { if (o < a[i] || o > b[i]) return -1; continue; } let ta = (a[i] - o) / d[i], tb = (b[i] - o) / d[i]; if (ta > tb) { const q = ta; ta = tb; tb = q; } if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) return -1; } return t0; }
