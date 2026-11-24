/* ZERO QUEST – a világ: a sziget domborzata, tájai, utak, zónák, ütközés (a 3D megjelenítés és a játékmenet közös alapja) */
'use strict';
const OW = 36000, OH = 24000, TAU = Math.PI * 2, hyp = Math.hypot, FH = 120, SEA = 0, LAPW = 46;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function rnd(a, b, c = 0) { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1103515245); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
/* gyors értékzaj egy előre kitöltött táblából */
const NT = new Float32Array(65536); for (let i = 0; i < 65536; i++) NT[i] = rnd(i, 7, 13);
function noise(x, y) { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), a = ix & 255, b = (ix + 1) & 255, c = (iy & 255) << 8, d = ((iy + 1) & 255) << 8;
  return NT[a + c] + (NT[b + c] - NT[a + c]) * u + (NT[a + d] - NT[a + c]) * v + (NT[a + c] - NT[b + c] - NT[a + d] + NT[b + d]) * u * v; }
function fbm(x, y, o = 4) { let s = 0, a = .5, t = 0; for (let i = 0; i < o; i++) { s += a * noise(x + i * 17.3, y - i * 9.1); t += a; a *= .5; const nx = x * 1.62 + y * 1.18, ny = -x * 1.18 + y * 1.62; x = nx; y = ny; } return s / t; }
function ridged(x, y, o = 4) { let s = 0, a = .5, t = 0; for (let i = 0; i < o; i++) { const n = 1 - Math.abs(noise(x + i * 31.7, y + i * 5.3) * 2 - 1); s += a * n * n; t += a; a *= .5; const nx = x * 1.7 + y * 1.1, ny = -x * 1.1 + y * 1.7; x = nx; y = ny; } return s / t; }
const terrace = (h, s, k = .3) => { const f = Math.floor(h / s), r = h / s - f; return s * (f + sstep(.5 - k, .5 + k, r)); };
function smooth(p, step = 60) { const o = []; for (let i = 0; i < p.length - 1; i++) { const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], d = p[Math.min(p.length - 1, i + 2)], n = Math.max(1, Math.ceil(hyp(c[0] - b[0], c[1] - b[1]) / step));
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; o.push([.5 * (2 * b[0] + (-a[0] + c[0]) * t + (2 * a[0] - 5 * b[0] + 4 * c[0] - d[0]) * t2 + (-a[0] + 3 * b[0] - 3 * c[0] + d[0]) * t3), .5 * (2 * b[1] + (-a[1] + c[1]) * t + (2 * a[1] - 5 * b[1] + 4 * c[1] - d[1]) * t2 + (-a[1] + 3 * b[1] - 3 * c[1] + d[1]) * t3)]); } } o.push(p[p.length - 1]); return o; }
function polyD(pts, x, y) { let bd = 1e9; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1, t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l, 0, 1), d = hyp(x - a[0] - dx * t, y - a[1] - dy * t); if (d < bd) bd = d; } return bd; }
/* a 3D réteg tölti ki: kameraforgás, célzás, vetítés */
let CAMYAW = 0, CAMPITCH = .3, AIMF = null, PROJF = null, GL3 = null, LOCKE = null, CAMD = null;
/* kameramód: 'souls' = a hős háta mögött, egérrel forgatva; 'top' = felülnézet */
let CMODE = (() => { try { return localStorage.getItem('zq_cam') || 'souls'; } catch (e) { return 'souls'; } })();
const camFwd = () => Math.atan2(-Math.cos(CAMYAW), -Math.sin(CAMYAW));

/* ---------- tájak (a rajzolt térkép szerint) ---------- */
const REGS = [
  { k: 'mez', n: 'A SZIKKADT MEZŐK', c: [11300, 6100], col: [140, 120, 66], t: 1 }, { k: 'lap', n: 'A RÉZLÁPA', c: [12400, 9900], col: [74, 84, 56], t: 2 },
  { k: 'nap', n: 'NAPSZÚRT FENNSÍK', c: [23800, 6500], col: [190, 166, 120], t: 3 }, { k: 'var', n: 'SZÁRAZVÁR', c: [18100, 13700], col: [108, 98, 86], t: 4 },
  { k: 'cso', n: 'A CSONTPARTI SIVATAG', c: [5300, 10900], col: [184, 160, 116], t: 5 }, { k: 'kak', n: 'KAKTUSZERDŐ', c: [26000, 16100], col: [112, 98, 62], t: 6 },
  { k: 'jeg', n: 'JÉGOROM', c: [17000, 3000], col: [162, 174, 190], t: 7 }, { k: 'so', n: 'AZ ÉGŐ PARTVIDÉK', c: [30200, 10200], col: [104, 62, 48], t: 8 },
  { k: 'mely', n: 'A MÉLY', c: [11900, 18400], col: [62, 54, 60], t: 9 }];
const RK = Object.fromEntries(REGS.map(r => [r.k, r]));
const HUB = [18700, 10200], HUBR = 2250;
/* a régi tervrajz koordinátái → az új sziget: a legközelebbi régi tájközponthoz viszonyított helyzet, felnagyítva */
const OLDC = { mez: [8200, 3700], lap: [5100, 6100], nap: [4800, 1050], var: [4400, 3450], cso: [1700, 6000], kak: [8000, 1150], jeg: [1600, 1150], so: [1450, 3600], hub: [6400, 3600] };
const sc = p => { let bk = 'mez', bd = 1e9; for (const k in OLDC) { const d = hyp(p[0] - OLDC[k][0], p[1] - OLDC[k][1]) * (k === 'hub' ? 1.7 : 1); if (d < bd) { bd = d; bk = k; } }
  const o = OLDC[bk], n = bk === 'hub' ? HUB : RK[bk].c; let dx = (p[0] - o[0]) * 2.15, dy = (p[1] - o[1]) * 2.15; const l = hyp(dx, dy), m = bk === 'hub' ? 1900 : 3600; if (l > m) { dx *= m / l; dy *= m / l; } return [n[0] + dx, n[1] + dy, ...p.slice(2)]; };
const START = sc([9250, 3700]), KWELL = [RK.mely.c[0] + 200, RK.mely.c[1] + 300], BEKA = sc([5900, 6550]);
/* a Szárazurak arénái: [x, y, sugár] */
const LORD = { gaspar: [7600, 2850, 380], iszap: [4650, 6400, 400], denes: [4300, 780, 380], rozalia: [3800, 3280, 340], fereg: [1300, 6250, 440], kaktusz: [8550, 780, 380], klara: [1100, 800, 380], lorinc: [800, 4050, 400] }; for (const k in LORD) LORD[k] = sc(LORD[k]);
/* pihenőhelyek (tábortüzek): az első 12 sorrendje kötött (mentések, történet) */
const FIRES = [[9250, 3700], [8230, 3900], [6400, 3600], [5350, 3620], [4250, 3470], [5330, 5660], [4980, 1760], [7650, 2080], [2320, 1560], [1560, 3330], [2330, 5520]].map(sc);
const FIRE_N = ['A Halottak Kútja', 'Kalászvég', 'Az Utolsó Kút', 'Szárazvár kapuja', 'A Porszobrok Piaca', 'Kannaváros', 'Az Árnyékárusok tábora', 'A Kaktuszerdő széle', 'Csepegő falu', 'A Világítótorony', 'A Rakpart-temető', 'A Mély'];
FIRES[2] = [HUB[0], HUB[1]];
/* térképkutak: minden táj kútja felrajzolja a táj térképét */
const WELLS = [];

/* ---------- a sziget alakja ---------- */
function land(x, y) { const ex = (x - OW / 2) / (OW * .475), ey = (y - OH / 2) / (OH * .47); let e = Math.sqrt(ex * ex + ey * ey);
  e -= (fbm(x / 3400, y / 3400, 3) - .5) * .5 + (fbm(x / 900 + 40, y / 900, 3) - .5) * .14;
  let L = 1 - e; for (const r of REGS) { const d = hyp(x - r.c[0], y - r.c[1]); L += .32 * Math.exp(-(d * d) / (5200 * 5200)); } return L - .2; }

/* ---------- utak: a térképen bejelölt fő- és mellékutak ---------- */
const ROADS = [], RDG = 100, RDW = Math.ceil(OW / RDG) + 1, RDH = Math.ceil(OH / RDG) + 1, RDGRID = new Float32Array(RDW * RDH).fill(9999);
function stampRoad(pts, off = 0) { for (const p of pts) { const gx = Math.round(p[0] / RDG), gy = Math.round(p[1] / RDG); for (let j = -9; j <= 9; j++) for (let i = -9; i <= 9; i++) { const x = gx + i, y = gy + j; if (x < 0 || y < 0 || x >= RDW || y >= RDH) continue; const d = hyp(x * RDG - p[0], y * RDG - p[1]) + off, k = x + y * RDW; if (d < RDGRID[k]) RDGRID[k] = d; } } }
const roadD = (x, y) => { const fx = clamp(x / RDG, 0, RDW - 1.001), fy = clamp(y / RDG, 0, RDH - 1.001), ix = fx | 0, iy = fy | 0, u = fx - ix, v = fy - iy, k = ix + iy * RDW, a = RDGRID[k], b = RDGRID[k + 1], c = RDGRID[k + RDW], d = RDGRID[k + RDW + 1]; return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v; };

/* ---------- elegyengetett telkek (épületek, arénák, táborhelyek) ---------- */
const PADS = [], PADG = new Map(), PGC = 1024;
function addPad(x, y, r, fall = 180, h) { const p = [x, y, r, fall, h == null ? Hraw(x, y) : h, h == null ? 1 : 0, 1]; PADS.push(p); const R0 = r + fall; for (let gx = Math.floor((x - R0) / PGC); gx <= Math.floor((x + R0) / PGC); gx++) for (let gy = Math.floor((y - R0) / PGC); gy <= Math.floor((y + R0) / PGC); gy++) { const k = gx * 4096 + gy; let l = PADG.get(k); if (!l) PADG.set(k, l = []); l.push(p); } return p; }
const padsAt = (x, y) => PADG.get(Math.floor(x / PGC) * 4096 + Math.floor(y / PGC));

/* ---------- tájak súlya ---------- */
function regW(x, y, out) { const wx = x + (fbm(x / 2600, y / 2600, 3) - .5) * 2600, wy = y + (fbm(x / 2600 + 50, y / 2600 + 50, 3) - .5) * 2600; let dm = 1e9;
  for (let i = 0; i < REGS.length; i++) { const c = REGS[i].c, d = hyp(wx - c[0], (wy - c[1]) * 1.1); out[i] = d; if (d < dm) dm = d; } let s = 0; for (let i = 0; i < REGS.length; i++) { const w = out[i] - dm > 2600 ? 0 : Math.exp(-(out[i] - dm) / 520); out[i] = w; s += w; } for (let i = 0; i < REGS.length; i++) out[i] /= s; return out; }
const RW = new Float32Array(REGS.length);
function biomeW(x, y) { const z = zoneAt(x, y); if (z) return { k: 'd' + z.th, k2: 'd' + z.th, b: 0, ku: 0, bk: 0, z, in: x > z.x && x < z.x + z.w && y > z.y && y < z.y + z.h };
  regW(x, y, RW); let i1 = 0, i2 = 1; for (let i = 0; i < REGS.length; i++) { if (RW[i] > RW[i1]) { i2 = i1; i1 = i; } else if (i !== i1 && RW[i] > RW[i2]) i2 = i; } if (i2 === i1) i2 = (i1 + 1) % REGS.length;
  return { k: REGS[i1].k, k2: REGS[i2].k, b: clamp(RW[i2] / (RW[i1] + 1e-6), 0, 1) * .5, ku: 1 - sstep(HUBR - 500, HUBR + 200, hyp(x - HUB[0], y - HUB[1])), bk: 1 - sstep(180, 320, hyp(x - BEKA[0], y - BEKA[1])), w: RW }; }

/* ---------- domborzat ---------- */
function regH(k, x, y, rc, rw) { const a = fbm(x / 2600, y / 2600, 3), b = fbm(x / 640 + 11, y / 640 - 7, 3), d = noise(x / 130, y / 130) - .5;
  switch (k) {
    case 'mez': return 150 + 190 * a + 60 * b * (1 - .6 * rw) + 9 * d;
    case 'lap': return 22 + 70 * a + 30 * b * (1 - .5 * rw) + 6 * d;
    case 'nap': { const base = 300 + 260 * a, m = terrace(base + 300 * fbm(x / 1500 - 3, y / 1500 + 9, 3), 170, .18); return lerp(m, base + 120, rc * .92) + 12 * b + 5 * d; }
    case 'var': return 250 + 120 * a + 30 * b * (1 - .6 * rw) + 6 * d;
    case 'cso': { const dn = 1 - Math.abs(Math.sin((x * .8 + y * .35) / 520 + fbm(x / 1700, y / 1700, 2) * 6)); return 70 + 110 * a + 70 * dn * dn * (1 - .8 * rw) + 8 * d; }
    case 'kak': { const m = ridged(x / 2300 + 4, y / 2300 - 2, 3); return 220 + 140 * a + 420 * sstep(.52, .62, m) * (1 - rc * .95) + 30 * b + 8 * d; }
    case 'jeg': { const m = ridged(x / 3600, y / 3600, 5); return 520 + 280 * a + 2300 * Math.pow(m, 1.7) * (1 - rc * .9) + 50 * b + 10 * d; }
    case 'so': { const m = ridged(x / 2500 - 9, y / 2500 + 3, 4), lv = ridged(x / 1100 + 6, y / 1100, 2); return 150 + 170 * a + 520 * m * m * (1 - rc * .85) + 30 * b - 70 * sstep(.86, .97, lv) * (1 - rw) + 8 * d; }
    case 'mely': { const r = hyp(x - RK.mely.c[0], y - RK.mely.c[1]), dp = 780 * (1 - sstep(900, 4200, r)); return 860 + 160 * a + 40 * b * (1 - .6 * rw) - lerp(terrace(dp, 130, .25), dp, rc) + 8 * d; }
  } return 100; }
const RWH = new Float32Array(REGS.length);
function Hraw(x, y) { const L = land(x, y); if (L < 0) return Math.max(-420, -30 + L * 900);
  const rd = roadD(x, y), rw = 1 - sstep(50, 200, rd), rc = 1 - sstep(120, 900, rd); regW(x, y, RWH); let h = 0;
  for (let i = 0; i < REGS.length; i++) if (RWH[i] > .002) h += RWH[i] * regH(REGS[i].k, x, y, rc, rw);
  /* a kráter: perem és lapos medence az Utolsó Kút körül */
  const r = hyp(x - HUB[0], y - HUB[1]); if (r < HUBR + 1800) { h = lerp(170 + 25 * fbm(x / 500, y / 500, 2), h, sstep(HUBR - 700, HUBR + 100, r)); h += 430 * Math.exp(-Math.pow((r - HUBR - 120) / 480, 2)) * (1 - .8 * rc); }
  return lerp(10 + 6 * noise(x / 200, y / 200), h, sstep(.015, .16, L)); }
function Hcalc(x, y) { let h = Hraw(x, y); const l = padsAt(x, y); if (l) for (const p of l) { if (!p[6]) continue; const d = hyp(x - p[0], y - p[1]); if (d < p[2] + p[3]) h = lerp(h, p[4], 1 - sstep(p[2], p[2] + p[3], d)); } return h + terrDelta(x, y); }
/* a magasság-gyorsítótár érvénytelenítése egy téglalapon (szerkesztés után) */
function invalH(x0, y0, x1, y1) { const S = HT * HG; for (let tx = Math.floor(x0 / S); tx <= Math.floor(x1 / S); tx++) for (let ty = Math.floor(y0 / S); ty <= Math.floor(y1 / S); ty++) HTL.delete(tx * 1024 + ty); }
/* magasság-gyorsítótár: 32 egységes rács, 2048-as csempékben */
const HG = 32, HT = 64, HTL = new Map(); let HREADY = false;
function htile(tx, ty) { const k = tx * 1024 + ty; let t = HTL.get(k); if (t) return t; t = new Float32Array((HT + 1) * (HT + 1)); const x0 = tx * HT * HG, y0 = ty * HT * HG; for (let j = 0; j <= HT; j++) for (let i = 0; i <= HT; i++) t[i + j * (HT + 1)] = Hcalc(x0 + i * HG, y0 + j * HG); HTL.set(k, t); return t; }
function hgrid(ix, iy) { const tx = Math.floor(ix / HT), ty = Math.floor(iy / HT); return htile(tx, ty)[(ix - tx * HT) + (iy - ty * HT) * (HT + 1)]; }
function GH(x, y) { const z = zoneAt(x, y); if (z) return zoneH(z, x, y); if (!HREADY) return Hcalc(x, y); x = clamp(x, -4000, OW + 3900); y = clamp(y, -4000, OH + 4000); const fx = x / HG, fy = y / HG, ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy;
  const a = hgrid(ix, iy), b = hgrid(ix + 1, iy), c = hgrid(ix, iy + 1), d = hgrid(ix + 1, iy + 1); return u + v < 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v); }
const slopeAt = (x, y) => hyp(GH(x + 24, y) - GH(x - 24, y), GH(x, y + 24) - GH(x, y - 24)) / 48;

/* ---------- zónák: a felszínen kívül fekvő pincék, kazamaták, barlangok, tornyok és a Mély ---------- */
const DCOL = { ko: [78, 74, 70], fa: [96, 76, 54], jeg: [112, 132, 152], so: [154, 146, 144], sar: [60, 66, 48], gy: [70, 56, 42], mely: [48, 40, 42], rez: [70, 80, 62] };
/* kind: kat = kazamata, bar = barlang, tor = torony (felfelé), open = a Mély; par: melyik zóna mélyéből nyílik */
const ZDEF = [
  { id: 'malom', n: 'AZ ÖREG MALOM PINCÉJE', th: 'fa', at: [8700, 3060], t: 1, g: [5, 4], kind: 'kat' }, { id: 'magtar', n: 'GÁSPÁR MAGTÁRA', th: 'fa', at: [7450, 3150], t: 2, g: [6, 4], kind: 'kat' },
  { id: 'varjuodu', n: 'A VARJÚDOMB ÜREGEI', th: 'gy', at: [8960, 3180], t: 2, g: [7, 5], kind: 'bar' },
  { id: 'bazilika', n: 'A SÜLLYEDT BAZILIKA', th: 'sar', at: [4330, 5880], t: 3, g: [7, 5], kind: 'kat' }, { id: 'ciszterna', n: 'KANNAVÁROS RAKTÁRAI', th: 'ko', at: [5560, 5560], t: 3, g: [6, 4], kind: 'kat' },
  { id: 'rezbarlang', n: 'A RÉZBARLANG', th: 'rez', at: [4700, 6900], t: 3, g: [8, 6], kind: 'bar' },
  { id: 'naptorony', n: 'A NAPÓRÁK TORNYA', th: 'ko', at: [4560, 620], t: 4, g: [4, 4], kind: 'tor', lv: 4 }, { id: 'vakok', n: 'A VAKOK KATAKOMBÁJA', th: 'ko', at: [5300, 2050], t: 4, g: [7, 5], kind: 'kat' },
  { id: 'vakok2', n: 'A VAKOK KATAKOMBÁJA · ALSÓ SZINT', th: 'ko', par: 'vakok', t: 5, g: [8, 6], kind: 'kat' },
  { id: 'kollegium', n: 'A KÚTMESTEREK KOLLÉGIUMA', th: 'fa', at: [4830, 3075], t: 5, g: [4, 4], kind: 'tor', lv: 3 }, { id: 'csatorna', n: 'SZÁRAZVÁR CSATORNÁI', th: 'ko', at: [3900, 3640], t: 5, g: [8, 5], kind: 'kat' },
  { id: 'ciszt2', n: 'A SZÁRAZ CISZTERNA', th: 'ko', par: 'csatorna', t: 6, g: [8, 6], kind: 'bar' },
  { id: 'roncs', n: 'A ROSTÁS HASÚ GÁLYA', th: 'fa', at: [900, 6760], t: 6, g: [6, 3], kind: 'kat' }, { id: 'fenek', n: 'FENÉKVÁROS KRIPTÁI', th: 'ko', at: [2200, 6230], t: 6, g: [7, 5], kind: 'kat' },
  { id: 'gyoker', n: 'A GYÖKÉRVEREM', th: 'gy', at: [7500, 1350], t: 7, g: [8, 6], kind: 'bar' }, { id: 'gyoker2', n: 'A GYÖKÉRVEREM MÉLYE', th: 'gy', par: 'gyoker', t: 7, g: [7, 5], kind: 'kat' },
  { id: 'jegtorony', n: 'A JÉGVARÁZSLÓK TORNYA', th: 'jeg', at: [1350, 620], t: 8, g: [4, 4], kind: 'tor', lv: 4 },
  { id: 'csepego', n: 'A CSEPEGŐ BARLANG', th: 'jeg', at: [2330, 1280], t: 8, g: [8, 6], kind: 'bar' }, { id: 'jegsziv', n: 'A JÉGSZÍV-ÜREG', th: 'jeg', par: 'csepego', t: 8, g: [7, 5], kind: 'bar' },
  { id: 'vilagito', n: 'A VILÁGÍTÓTORONY', th: 'ko', at: [1500, 3260], t: 8, g: [3, 3], kind: 'tor', lv: 5 },
  { id: 'sobanya', n: 'A SÓKATEDRÁLIS ALTEMPLOMA', th: 'so', at: [1150, 4300], t: 9, g: [8, 5], kind: 'kat' },
  { id: 'kiserlet', n: 'A KÍSÉRLETEZŐK KRIPTÁJA', th: 'mely', at: null, t: 9, g: [8, 6], kind: 'kat' },
  ...['BEOMLOTT PINCE', 'ELFELEDETT KRIPTA', 'A SZOMJAS ÜREG', 'A REMETE PINCÉJE', 'AZ ÖNTÖZŐK RAKTÁRA', 'A NÉMA KRIPTA', 'A HOMOKBA FULLADT TEMPLOM', 'A KISZÁRADT FORRÁSÉR', 'A KANNÁSOK SZENTÉLYE', 'A CSONTOK PINCÉJE', 'A HAMUS JÁRAT', 'A SÓFOLYOSÓ', 'A FAGYOTT KAMRA', 'AZ ÁRNYÉK-CISZTERNA', 'A GYÖKERES PINCE', 'A TÖRT KÚTAKNA'].map((n, i) => ({ id: 'p' + i, n, th: 'ko', at: null, t: 1, g: i % 3 === 2 ? [6, 5] : [5, 4], kind: i % 3 === 2 ? 'bar' : 'kat', proc: 1 })),
  { id: 'k_gaspar', n: 'A VARJÚVÁR TÖMLÖCE', th: 'ko', at: null, t: 2, g: [7, 5], kind: 'kat', kas: 1 }, { id: 'k_denes', n: 'A NAPERŐD ALAGSORA', th: 'ko', at: null, t: 4, g: [8, 5], kind: 'kat', kas: 1 },
  { id: 'k_palota', n: 'A PALOTA KAZAMATÁI', th: 'ko', at: null, t: 5, g: [8, 6], kind: 'kat', kas: 1 }, { id: 'k_klara', n: 'A JÉGKOLOSTOR KRIPTÁJA', th: 'jeg', at: null, t: 8, g: [7, 6], kind: 'kat', kas: 1 }, { id: 'k_lorinc', n: 'A SÓERŐD BÖRTÖNE', th: 'so', at: null, t: 9, g: [8, 6], kind: 'kat', kas: 1 }, { id: 'u_gaspar', n: 'A VARJÚVÁR FELSŐ TERMEI', th: 'ko', at: null, t: 3, g: [4, 4], kind: 'tor', kast: 1, kas: 1, lv: 4, ls: 2200, lvls: ['hall', 'gal', 'cath', 'terr'] }, { id: 'u_denes', n: 'A NAPERŐD PALOTÁJA', th: 'feher', at: null, t: 5, g: [4, 4], kind: 'tor', kast: 1, kas: 1, lv: 4, ls: 2200, lvls: ['hall', 'gal', 'cath', 'terr'] }, { id: 'u_klara', n: 'A JÉGKOLOSTOR CSARNOKAI', th: 'jeg', at: null, t: 8, g: [4, 4], kind: 'tor', kast: 1, kas: 1, lv: 4, ls: 2200, lvls: ['hall', 'gal', 'cath', 'terr'] }, { id: 'u_lorinc', n: 'A SÓERŐD TERMEI', th: 'so', at: null, t: 9, g: [4, 4], kind: 'tor', kast: 1, kas: 1, lv: 4, ls: 2200, lvls: ['hall', 'gal', 'cath', 'terr'] },
  { id: 'mely', n: 'A MÉLY', th: 'mely', at: null, t: 10, open: 1, kind: 'open' }, { id: 'csillag', n: 'A CSILLAGMÉLYI VÁROS', th: 'ko', par: 'fenek', t: 7, kind: 'star', g: [22, 18], rg: 'mely', kas: 1 }];
const ZONES = [], ZK = {}, ZC = 430, ZX0 = OW + 6000;
let WW = 0, WH = OH;
(() => { let x = ZX0, y = 0, colW = 0; for (const z of ZDEF) { const w = z.open ? 2400 : z.kind === 'tor' ? (z.lv || 3) * (z.ls || 1200) : z.g[0] * ZC, h = z.open ? 3200 : z.kast ? 1300 : z.kind === 'tor' ? 1100 : z.g[1] * ZC; if (y + h > OH) { y = 0; x += colW + 1500; colW = 0; }
    z.x = x; z.y = y; z.w = w; z.h = h; if (z.at) z.at = sc(z.at); colW = Math.max(colW, w); y += h + 1500; ZONES.push(z); ZK[z.id] = z; } WW = x + colW + 2000; })();
ZK.kiserlet.at = [RK.mely.c[0] - 1500, RK.mely.c[1] - 900]; ZK.mely.at = KWELL;
const zoneAt = (x, y) => { if (x < ZX0 - 2000) return null; for (const z of ZONES) if (x > z.x - 700 && x < z.x + z.w + 700 && y > z.y - 700 && y < z.y + z.h + 700) return z; return ZONES[0]; };
/* zónák magassága: barlangban a falak magasba szöknek, a tornyokban szintenként emelkedik */
function zoneH(z, x, y) { if (z.hm) { const fx = clamp((x - z.x) / z.hc, 0, z.hw - 1.001), fy = clamp((y - z.y) / z.hc, 0, z.hh - 1.001), ix = fx | 0, iy = fy | 0, u = fx - ix, v = fy - iy, k = ix + iy * z.hw, m = z.hm;
    return (m[k] * (1 - u) + m[k + 1] * u) * (1 - v) + (m[k + z.hw] * (1 - u) + m[k + z.hw + 1] * u) * v; }
  if (z.kind === 'tor') return clamp(Math.floor((x - z.x) / (z.ls || 1200)), 0, (z.lv || 3) - 1) * 420; return 0; }
const HEART = [ZK.mely.x + 1200, ZK.mely.y + 2500]; LORD.szil = [HEART[0], HEART[1], 430]; FIRES.push([ZK.mely.x + 1200, ZK.mely.y + 340]);

/* ---------- tereptárgyak rácsa ---------- */
const OBJ = [], GRID = new Map(), GC = 128, gk = (x, y) => (x + 64) * 8192 + y + 64;
/* kézi pályaszerkesztés: minden tárgynak állandó azonosítója van (a generálás sorrendje), a domborzat-módosítás 64-es rácson tárolt eltolás */
const UIDS = new Map(), TED = new Map(), TEC = 64, SDEL = new Set(), tek = (i, j) => i * 100000 + j;
function terrDelta(x, y) { if (!TED.size) return 0; const fx = x / TEC, fy = y / TEC, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, g = (a, b) => TED.get(tek(a, b)) || 0; return (g(i, j) * (1 - u) + g(i + 1, j) * u) * (1 - v) + (g(i, j + 1) * (1 - u) + g(i + 1, j + 1) * u) * v; }
function gridDel(o) { const hw = o.w ? o.w / 2 : o.r || 0, hd = o.w ? o.d / 2 : o.r || 0; for (let gx = Math.floor((o.x - hw) / GC); gx <= Math.floor((o.x + hw) / GC); gx++) for (let gy = Math.floor((o.y - hd) / GC); gy <= Math.floor((o.y + hd) / GC); gy++) { const l = GRID.get(gk(gx, gy)); if (l) { const i = l.indexOf(o); if (i >= 0) l.splice(i, 1); } } }
function gridAdd(o) { const hw = o.w ? o.w / 2 : o.r || 0, hd = o.w ? o.d / 2 : o.r || 0; for (let gx = Math.floor((o.x - hw) / GC); gx <= Math.floor((o.x + hw) / GC); gx++) for (let gy = Math.floor((o.y - hd) / GC); gy <= Math.floor((o.y + hd) / GC); gy++) { const k = gk(gx, gy); let l = GRID.get(k); if (!l) GRID.set(k, l = []); if (!l.includes(o)) l.push(o); } }
function addO(o) { if (o.uid == null) o.uid = OBJ.length; UIDS.set(String(o.uid), o); OBJ.push(o); const hw = o.w ? o.w / 2 : o.r || 0, hd = o.w ? o.d / 2 : o.r || 0;
  for (let gx = Math.floor((o.x - hw) / GC); gx <= Math.floor((o.x + hw) / GC); gx++) for (let gy = Math.floor((o.y - hd) / GC); gy <= Math.floor((o.y + hd) / GC); gy++) { const k = gk(gx, gy); let l = GRID.get(k); if (!l) GRID.set(k, l = []); l.push(o); } return o; }
/* szórt növényzet, sziklák: cellánként, igény szerint, mindig ugyanúgy */
const SCC = 512, SCM = new Map(), BLDS = [];
const SCAT = { mez: [[.16, 'tree', 0], [.1, 'tree', 3], [.08, 'rock'], [.18, 'bush']], lap: [[.22, 'tree', 12], [.08, 'tree', 10], [.06, 'rock'], [.22, 'bush']], nap: [[.12, 'tree', 5], [.2, 'rock']], var: [[.08, 'tree', 0], [.16, 'rock'], [.06, 'tree', 8]], cso: [[.05, 'tree', 9], [.14, 'rock'], [.08, 'tree', 2], [.12, 'bush']],
  kak: [[.4, 'tree', 1], [.2, 'tree', 2], [.06, 'rock'], [.1, 'bush']], jeg: [[.22, 'tree', 11], [.1, 'tree', 6], [.18, 'rock']], so: [[.14, 'tree', 7], [.12, 'tree', 13], [.16, 'rock']], mely: [[.12, 'tree', 14], [.1, 'tree', 15], [.2, 'rock']] };
const inPad = (x, y, m = 0) => { const l = padsAt(x, y); if (l) for (const p of l) if (hyp(x - p[0], y - p[1]) < p[2] + m) return true; return false; };
function scatterOf(cx, cy) { const k = cx * 4096 + cy; let l = SCM.get(k); if (l) return l; l = []; SCM.set(k, l); if (cx < 0 || cy < 0 || cx * SCC > OW || cy * SCC > OH) return l;
  for (let i = 0; i < 34; i++) { const x = (cx + rnd(cx, cy, i * 3 + 1)) * SCC, y = (cy + rnd(cx, cy, i * 3 + 2)) * SCC; if (land(x, y) < .04) continue; const w = biomeW(x, y); if (w.ku > .1 || w.bk > .5) continue;
    const dens = sstep(.3, .68, fbm(x / 1500 + 3, y / 1500, 3)) * 1.6 + .25; let p = rnd(cx, cy, i * 3 + 3) / dens; if (roadD(x, y) < 150 || inPad(x, y, 90)) continue; const sl = slopeAt(x, y); if (sl > .85) continue;
    for (const [pr, t, v] of SCAT[w.k] || []) { if (p < pr) { const s = .8 + rnd(cx, cy, i + 90) * .6, rot = rnd(cx, cy, i + 91) * TAU;
        if (t === 'rock') l.push({ t, x, y, r: (16 + rnd(cx, cy, i + 92) * 30) * s, v: rnd(cx, cy, i + 93), rg: w.k, solid: 1, s, rot });
        else if (t === 'bush') l.push({ t, x, y, r: 0, v: rnd(cx, cy, i + 93), rg: w.k, s, rot });
        else if (!(w.k === 'lap' && GH(x, y) < LAPW - 6 && v !== 12)) l.push({ t, v, x, y, r: v === 5 ? 22 : v === 1 ? 17 : v === 3 ? 18 : v === 9 ? 0 : 14, s, rot, solid: v !== 9 && v !== 2 ? 1 : 0, rg: w.k }); break; } p -= pr; } }
  l.forEach((o, i) => { o.uid = 's' + cx + '_' + cy + '_' + i; o.sc = 1; }); if (SDEL.size) { const k2 = l.filter(o => !SDEL.has(o.uid)); l.length = 0; l.push(...k2); } return l; }
function near(x, y, r, fn) { for (let gx = Math.floor((x - r) / GC); gx <= Math.floor((x + r) / GC); gx++) for (let gy = Math.floor((y - r) / GC); gy <= Math.floor((y + r) / GC); gy++) { const l = GRID.get(gk(gx, gy)); if (l) for (const o of l) fn(o); }
  if (x < OW + 400) for (let cx = Math.floor((x - r) / SCC); cx <= Math.floor((x + r) / SCC); cx++) for (let cy = Math.floor((y - r) / SCC); cy <= Math.floor((y + r) / SCC); cy++) for (const o of scatterOf(cx, cy)) if (Math.abs(o.x - x) < r + 30 && Math.abs(o.y - y) < r + 30) fn(o); }
/* melyik épület alaprajzán áll (az emeletekhez) */
function bldAt(x, y) { let b = null; const l = GRID.get(gk(Math.floor(x / GC), Math.floor(y / GC))); if (l) for (const o of l) if (o.t === 'bld' && Math.abs(x - o.x) < o.w / 2 && Math.abs(y - o.y) < o.d / 2) b = o; return b; }
const floorAt = (b, x, y) => { if (!b.tiles) return false; const i = Math.floor((x - b.x + b.w / 2) / b.ts), j = Math.floor((y - b.y + b.d / 2) / b.ts); return i >= 0 && j >= 0 && i < b.tw && j < b.th && b.tiles[i + j * b.tw] === 1; };
function stairT(s, x, y) { if (Math.abs(x - s.x) > s.w / 2 || Math.abs(y - s.y) > s.d / 2) return -1; const t = s.dir === 0 ? (x - s.x + s.w / 2) / s.w : s.dir === 1 ? (s.x + s.w / 2 - x) / s.w : s.dir === 2 ? (y - s.y + s.d / 2) / s.d : (s.y + s.d / 2 - y) / s.d; return clamp(t, 0, 1); }
/* a talaj magassága egy szereplő alatt (épület, emelet, lépcső, zóna, terep) */
function elev(e) { const z = zoneAt(e.x, e.y); if (z) return zoneH(z, e.x, e.y); const b = e.bld || bldAt(e.x, e.y); if (b && b.base != null) { const fh = b.fh || FH; if (e.sz != null) return b.base + e.sz * fh; if (b.kind === 'aqua' && !e.fz) return GH(e.x, e.y); return b.base + (e.fz ? fh : 0); } return GH(e.x, e.y) + (e.alt || 0); }

/* ---------- ütközés: falak, oszlopok, fák, emeletek, meredek lejtők, tenger ---------- */
function collide(e, r) { const fz = e.fz | 0;
  for (let it = 0; it < 2; it++) near(e.x, e.y, r + 30, o => { if (!o.solid || o.off || (o.fz | 0) !== fz) return;
    if (o.w) { const cx = clamp(e.x, o.x - o.w / 2, o.x + o.w / 2), cy = clamp(e.y, o.y - o.d / 2, o.y + o.d / 2), dx = e.x - cx, dy = e.y - cy, d = hyp(dx, dy); if (d < r) { if (d < .01) { const px = o.w / 2 + r - Math.abs(e.x - o.x), py = o.d / 2 + r - Math.abs(e.y - o.y); if (px < py) e.x += Math.sign(e.x - o.x || 1) * px; else e.y += Math.sign(e.y - o.y || 1) * py; } else { e.x = cx + dx / d * r; e.y = cy + dy / d * r; } } }
    else { const dx = e.x - o.x, dy = e.y - o.y, d = hyp(dx, dy), m = r + o.r * (o.t === 'tree' || o.t === 'rock' ? .75 : 1); if (d < m && d > .01) { e.x = o.x + dx / d * m; e.y = o.y + dy / d * m; } } });
  const z = zoneAt(e.x, e.y);
  if (z) { e.bld = null; e.sz = null; e.x = clamp(e.x, z.x + 30, z.x + z.w - 30); e.y = clamp(e.y, z.y + 30, z.y + z.h - 30); if (z.hm && e.lx != null && zoneAt(e.lx, e.ly) === z) { const h0 = zoneH(z, e.lx, e.ly), h1 = zoneH(z, e.x, e.y), dd = hyp(e.x - e.lx, e.y - e.ly); if (h1 - h0 > Math.max(12, dd * 1.4) || z.star && e !== P && h0 - h1 > 40) { e.x = e.lx; e.y = e.ly; } }
    /* a Csillagmélyi Városban a szakadékba lépni zuhanás */ if (z.star && e === P) { const h = zoneH(z, e.x, e.y); if (h > -25) { if (!e.safe || hyp(e.safe[0] - e.x, e.safe[1] - e.y) > 90) e.safe = [e.x, e.y]; } else if (h < -500 && e.safe) { e.x = e.safe[0]; e.y = e.safe[1]; e.abyss = 1; } } }
  else {
    const b = bldAt(e.x, e.y); e.bld = b; let st = null;
    if (b && b.stairs) { const t = stairT(b.stairs, e.x, e.y); if (t >= 0) { st = t; e.fz = t > .5 ? 1 : 0; } } e.sz = st;
    if (e.fz && st == null) { if (!b || !floorAt(b, e.x, e.y)) { if (e === P) { e.fz = 0; e.fall = 1; } else if (e.lx != null) { e.x = e.lx; e.y = e.ly; e.fz = 1; } } }
    if (!e.fz && (!b || b.kind === 'aqua') && e.sz == null && e.lx != null && !zoneAt(e.lx, e.ly)) { const dd = hyp(e.x - e.lx, e.y - e.ly); if (dd > .01) { const h0 = GH(e.lx, e.ly), h1 = GH(e.x, e.y);
        if (h1 - h0 > dd * 1.05 + .5 || h1 < SEA + 3) { const hx = GH(e.x, e.ly), hy = GH(e.lx, e.y); if (hx - h0 <= Math.abs(e.x - e.lx) * 1.05 + .5 && hx >= SEA + 3) e.y = e.ly; else if (hy - h0 <= Math.abs(e.y - e.ly) * 1.05 + .5 && hy >= SEA + 3) e.x = e.lx; else { e.x = e.lx; e.y = e.ly; } } } }
    e.x = clamp(e.x, 60, OW - 60); e.y = clamp(e.y, 60, OH - 60); }
  e.lx = e.x; e.ly = e.y; }

/* ---------- kőbe vésett sorok, naplólapok, harmatgyűjtők, ládák ---------- */
const MSGS = [[9120, 3640, 'Ide dobták le az utolsó Öntözőket, hogy legalább a víz közelében nyugodjanak.'], [8960, 3180, 'Varjúdomb. Akik vizet loptak.'], [8320, 2380, 'Itt a Rend kapuja állt. Zárva, amíg a Mesterek vissza nem térnek.'], [6330, 3460, '„A víz nem a miénk. Mi csak az útja vagyunk.” – az Öntözők Rendje'],
  [4420, 3620, 'A Királyi Kút. A Forrás legközelebbi ere – egykor.'], [4320, 3180, 'A Porszobrok Piaca. Ott száradtak ki, ahol álltak. Néha egyikük megmozdul.'],
  [4640, 1900, 'Vakok Útja. Akik a napba néztek, hogy ne lássák a pusztulást.'], [4520, 1120, 'A csillagászok feljegyzése: a harmadik nap már a kútmester előtt is ott volt. Minden évben fényesebb.'], [8280, 1900, 'A kaktuszok elmondják halottaik utolsó szavait: „…csak egy kortyot…”'],
  [2620, 1380, 'A Csepp-sorsolás tere. Naponta egy csepp. Egy falunak.'], [900, 1050, 'A varázslók megfagytak a saját varázslatukban.'], [640, 3420, 'Az Elsüllyedt Flotta. A Rend utolsó hajóhada a tengerrel együtt szállt le a fenékre.'],
  [2080, 5360, 'A hajósok a hajóik alá temetkeztek.'], [2260, 6000, 'Fenékváros. Lakói a felszínt égnek nevezik.'], [4400, 5700, 'A Süllyedt Bazilika. Csak a tornya áll ki a sárból.']].map(sc);
MSGS.push([KWELL[0] + 160, KWELL[1] + 220, 'A Mély szája. Szilárd ezen a lépcsőn ment le, egyedül, egy kannával a kezében.'], [RK.mely.c[0] - 1300, RK.mely.c[1] - 700, 'A Kísérletezők lejárata. Ők akartak a Forrás után menni. Ők jutottak a legmesszebb.'], [HUB[0] + 520, HUB[1] - 330, 'A kráter a Forrás első ütése. Itt tört fel a víz, amikor a világ még nedves volt.']);
const PAGES = [[8600, 4250, 'Ma lementem az első aknába. A víz szintje három arasszal lejjebb van, mint nagyapám jegyzeteiben.'], ['magtar', 'A mesterek tudják. Régóta tudják. Azt mondják, a lassú halál kíméletesebb, mint a pánik.'], [5600, 6350, 'Rozália ma virágot kért az ablakba. Elültettem. Minden reggel megöntözöm, a saját adagomból.'], ['bazilika', 'A lápon megromlott a víz. Egy gyógyítóasszony azt mondja, megtisztítja. Nem fogja.'],
  ['naptorony', 'A csillagászok szerint az égen valami fényesedik. Nem hiszek nekik. Elég bajom van idelent.'], ['kollegium', 'Lányom, ha ezt olvasod: nem tudtam, mit tegyek. Senki nem mondta meg. Csak azt, hogy mit ne.'], ['csatorna', 'Rozália szomjas. Azt mondja, nem baj. Azt mondja, megvár. Három nap az út a Forrásig és vissza.'], [1250, 5650, 'A Sóvár elapadt. A hajósok még mindig a parton állnak, és nézik.'],
  ['gyoker', 'Egy remete azt hirdeti, hogy a szárazság béke. Irigylem, hogy el tudja hinni.'], ['jegtorony', 'A varázslók jégbe zárják, ami maradt. Hogy senkié se legyen. Ez is egy módja a birtoklásnak.'], ['sobanya', 'Lőrinc tengervízzel öntöz. Könyörögtem neki, hogy ne tegye. Azt felelte: valamit tenni kell.'], ['mely', 'Azt mondják, a víz nem lehet senkié. De a víz most a halálé. Inkább legyen az enyém. Én legalább sírok miatta.']];
const DEWS = [[7900, 4100], [6900, 2700], [5900, 5300], [5350, 2300], [3000, 3900], [3200, 1700], [2900, 4800], [7300, 1500]].map(sc);
const CHESTS = [['c1', 8950, 3060], ['c2', 7350, 4450], ['c3', 5750, 5850], ['c5', 5500, 900], ['c6', 3900, 2000], ['c7', 4950, 3900], ['c8', 3550, 3050], ['c10', 2900, 6500], ['c11', 9100, 1450], ['c12', 7300, 600], ['c13', 600, 320], ['c14', 2800, 700], ['c15', 500, 2900], ['c16', 2300, 4250]].map(c => [c[0], ...sc([c[1], c[2]])]);
const CLEAR = [], RUINS = [];
