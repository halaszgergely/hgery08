/* HGWS Arcade – Holtváros: felülnézetes zombijárvány-stratégia szabad (nem rácsos) várostérképen.
   A játékmenetet a Jogamedev „Zombies Aren't Real” című játéka ihlette; a kód, a térképek és a grafika saját.
   Budapest térképe kézzel modellezett, stilizált (nem valódi térképadat). */
window.HGZombi = function (env) {
  'use strict';
  const { G, Sfx, rr, hud, store } = env;
  const STEAM = 'https://store.steampowered.com/app/5185890/Zombies_Arent_Real/';
  const MAPS = window.HGZMaps; let MD = MAPS[0], WW = MD.W, WH = MD.H, GEO = null;
  const RW = 15, R_START = 760, R_GROW = 520, HPZ = .32, DENS = .8, HP_WALL = 170, HP_GATE = 28, HP_BGATE = 110, gHP = g => g === 2 ? HP_BGATE : g ? HP_GATE : HP_WALL, barC = b => b.gate === 2 ? 300 : b.gate ? 160 : 520;
  const VEH = { jeep: { hp: 70, spd: 95, r: 130, cd: .3, sz: .8, col: '#7d8a55' }, apcu: { hp: 170, spd: 70, r: 150, cd: .2, sz: 1, col: '#56663f' }, tank: { hp: 360, spd: 46, r: 230, cd: .25, gun: 2.8, sz: 1.3, col: '#46523a' }, apc: { hp: 100, spd: 70, r: 140, cd: .27, sz: 1, col: '#4b5a3a' } }; // HPZ: egy zombi életereje; DENS: lakos / utcaképpont
  // u: melyik küldetéstől érhető el; on: 'b' épület, 'r' út, 'br' híd
  const TOOLS = [
    { k: 'zone', tab: 0, n: 'Fal', ic: '🧱', c: 0, u: 1, n2: 1, d: 'Húzz falat szabadon. Ami így el van vágva a várostól, az védett.' },
    { k: 'gate', tab: 0, n: 'Kapu', ic: '🚪', c: 20, u: 1, d: 'Koppints egy útzárra: a civilek bejutnak rajta, de ez a fal gyenge pontja.' },
    { k: 'bgate', tab: 0, n: 'Nagykapu', ic: '🏰', c: 70, u: 1, d: 'Szélesebb, jóval erősebb kapu. Sima kapura is ráépíthető.' },
    { k: 'gar', tab: 0, n: 'Őrség', ic: '🪖', c: 60, u: 1, on: 'b', r: 150, cd: .2, dmg: 1, d: 'Épületbe. Közepes hatótáv.' },
    { k: 'snp', tab: 0, n: 'Mesterlövész', ic: '🎯', c: 110, u: 2, on: 'b', r: 330, cd: 1.35, dmg: 3, d: 'Épületbe. Nagy hatótáv, lassú.' },
    { k: 'tur', tab: 0, n: 'Gépágyú', ic: '🔫', c: 150, u: 1, on: 'r', r: 170, cd: .09, dmg: 1, ammo: 900, d: 'Útra. Gyors tűz, 900 lőszer.' },
    { k: 'mor', tab: 0, n: 'Aknavető', ic: '💥', c: 200, u: 3, on: 'b', r: 420, rmin: 120, cd: 4.3, d: 'Épületbe. Területre lő – a civileket is eltalálja!' },
    { k: 'bld', tab: 3, n: 'Őrház', ic: '🏠', c: 45, u: 1, d: 'Út mellé építhető épület – őrség, mesterlövész vagy más kerülhet bele.' },
    { k: 'rail', tab: 3, n: 'Sín', ic: '🛤️', c: 0, u: 1, d: 'Húzz vasúti pályát szabadon; az ár a hosszától függ. A meglévő vasútvonalak ingyen használhatók.' },
    { k: 'sta', tab: 3, n: 'Állomás', ic: '🚉', c: 120, u: 1, R: 340, d: 'Sínre tehető. A környék civiljei ide gyűlnek, a vonat elviszi őket, és itt rakja ki a járműveket.' },
    { k: 'trn', tab: 3, n: 'Vonat', ic: '🚆', c: 0, u: 1, d: 'Koppints egy állomásos sínre, és állítsd össze a szerelvényt.' },
    { k: 'mine', tab: 3, n: 'Akna', ic: '💣', c: 25, u: 1, on: 'r', d: 'Útra. Zombira robban.' },
    { k: 'c4', tab: 3, n: 'C4', ic: '🧨', c: 80, u: 2, on: 'br', d: 'Hídra: a csata elején felrobban.' },
    { k: 'cor', tab: 1, n: 'Terelőút', ic: '➡️', c: 0, u: 1, d: 'Húzd végig az utakon: a civilek ezen át a zónába indulnak.' },
    { k: 'hold', tab: 1, n: 'Útzár', ic: '⛔', c: 30, u: 2, d: 'Kereszteződésre: a civilek nem mennek át rajta.' },
    { k: 'bro', tab: 1, n: 'Hangosbemondó', ic: '📢', c: 90, u: 1, on: 'b', R: 420, d: 'A környék civiljeit a zónába hívja.' },
    { k: 'pol', tab: 1, n: 'Rendőrség', ic: '🚓', c: 140, u: 2, on: 'b', R: 90, d: '4 rendőr védi a környéket.' },
    { k: 'mil', tab: 1, n: 'Milícia', ic: '🔧', c: 120, u: 3, on: 'b', R: 200, d: 'Felfegyverez 8 közeli civilt – ők már nem számítanak megmentettnek.' },
    { k: 'rep', tab: 1, n: 'Javítóbrigád', ic: '🛠️', c: 110, u: 3, on: 'b', R: 260, d: 'Javítja a közeli útzárakat.' },
    { k: 'rad', tab: 1, n: 'Rádiótorony', ic: '📡', c: 130, u: 4, on: 'b', R: 260, d: '+30% hatótáv a közeli egységeknek.' },
    { k: 'med', tab: 1, n: 'Mentőállomás', ic: '⛑️', c: 90, u: 4, on: 'b', R: 240, d: 'A közeli katonák túlélik az első harapást.' },
    { k: 'bud', tab: 1, n: 'Hivatal', ic: '🏛️', c: 100, u: 5, on: 'b', R: 260, d: '−25% a közelébe tett védelem árából.' },
    { k: 'lift', tab: 1, n: 'Légihíd', ic: '🚁', c: 220, u: 5, on: 'b', R: 280, d: 'Kimenekíti a közeli civileket.' },
    { k: 'up', tab: 0, n: 'Fejlesztés', ic: '⬆️', c: 0, u: 2, d: 'Koppints egy lövő egységre: gyorsabb tűz, nagyobb hatótáv (3. szintig).' },
    { k: 'del', tab: 2, n: 'Törlés', ic: '❌', c: 0, u: 1, d: 'Elem visszavétele, teljes áron.' }
  ];
  const TOOL = Object.fromEntries(TOOLS.map(t => [t.k, t]));
  const CARS = { pas: { n: 'Személykocsi', ic: '🚃', c: 40, u: 1, col: '#5b7fa6' }, arm: { n: 'Páncélkocsi', ic: '🔩', c: 60, u: 1, col: '#6d7480' }, mg: { n: 'Géppuskás', ic: '🔫', c: 90, u: 1, col: '#56663f' }, gun: { n: 'Ágyús', ic: '💥', c: 160, u: 2, col: '#46523a' },
    vjeep: { n: 'Terepjáró', ic: '🚙', c: 90, u: 1, veh: 'jeep', col: '#7a6a4a' }, vapc: { n: 'Páncélos', ic: '🚛', c: 170, u: 2, veh: 'apcu', col: '#7a6a4a' }, vtank: { n: 'Tank', ic: '🛡️', c: 320, u: 3, veh: 'tank', col: '#7a6a4a' } }, CAR_MAX = 8;
  const SHIP = { boat: { len: 55, r: 210, cd: .18, gun: 3.5, gr: 300, pw: 20, br: 40 }, ship: { len: 125, r: 260, cd: .12, gun: 2.2, gr: 560, pw: 46, br: 55 } };
  const ABIL = [{ k: 'air', n: 'Légicsapás', ic: '✈️', d: 'Húzz egy vonalat: 5 bomba.' }, { k: 'mis', n: 'Rakéta', ic: '🚀', d: 'Egy nagy robbanás.' }, { k: 'gas', n: 'Gáz', ic: '☣️', d: 'Mérgező felhő – a civileknek is!' },
    { k: 'heli', n: 'Helikopter', ic: '🚁', d: '25 mp-ig köröz és lő.' }, { k: 'para', n: 'Ejtőernyősök', ic: '🪂', d: '5 katona, akik felkutatják a zombikat.' }, { k: 'apc', n: 'Páncélos', ic: '🛡️', d: 'Behajt az utakon és lő – 45 mp-ig, a horda szétszedheti.' },
    { k: 'boat', n: 'Naszád', ic: '🚤', d: 'Koppints a vízre: odahajózik, megáll és onnan lő.' }, { k: 'ship', n: 'Hadihajó', ic: '🚢', d: 'Koppints a vízre: nagy hatótávú ágyúival onnan lő.' }];
  const UPG = [['boat', '+1 naszád', '🚤'], ['ship', '+1 hadihajó', '🚢'], ['air', '+1 légicsapás', '✈️'], ['mis', '+1 rakéta', '🚀'], ['gas', '+1 gáz', '☣️'], ['heli', '+1 helikopter', '🚁'], ['para', '+1 ejtőernyős osztag', '🪂'], ['apc', '+1 páncélos', '🛡️'], ['bud', '+15% keret', '💰'], ['rng', '+10% hatótáv', '📡']];
  let S = null, L = null, MAP = null, keyOn = 0, RUN = null;
  const PT = new Map(); let pinch = null, panS = null;

  const rng = seed => { let s = seed % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
  const dseg = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)); return [Math.hypot(px - ax - dx * t, py - ay - dy * t), t]; };
  const pip = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const segInt = (a, b, c, d) => { const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0]; if (Math.abs(den) < 1e-9) return -1; const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den; return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? u : -1; };

  /* ---------------- várostérkép ---------------- */
  function graph() { const N = [], E = []; return { N, E, node(x, y) { N.push({ x, y, all: [], adj: [], hold: 0, id: N.length }); return N.length - 1; },
    edge(a, b, o = {}) { if (a === b || N[a].all.some(q => q.n === b)) return; const e = { a, b, len: Math.hypot(N[a].x - N[b].x, N[a].y - N[b].y), bars: [], stain: 0, cor: 0, dead: 0, ...o }; E.push(e); N[a].all.push({ n: b, e }); N[b].all.push({ n: a, e }); return e; } }; }
  const pairs = f => { const o = []; for (let i = 0; i < f.length; i += 2) o.push([f[i], f[i + 1]]); return o; };
  const bbox = p => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const q of p) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; } return [x0, y0, x1, y1]; };
  function setMap(id) { MD = MAPS.find(m => m.id === id) || MAPS[0]; WW = MD.W; WH = MD.H; TILES.clear(); const poly = f => { const p = pairs(f); return { p, b: bbox(p) }; };
    GEO = { county: poly(MD.county), cities: MD.cities.map(c => ({ n: c[0], ...poly(c[1]) })), urban: MD.urban.map(poly), water: MD.water.map(w => { const p = pairs(w[1]); return { w: w[0], p, b: bbox(p) }; }), roads: MD.roads.map(r => ({ t: r[0], p: pairs(r[1]) })), rails: MD.rails.map(pairs) }; }
  const cityAt = (x, y) => GEO.cities.find(c => inPoly(c, x, y));
  const inPoly = (o, x, y) => x >= o.b[0] && x <= o.b[2] && y >= o.b[1] && y <= o.b[3] && pip(o.p, x, y);
  /* Valós léptékű megyetérkép (1 képpont = 1 méter). A megyehatár, a folyók, a főutak és a beépített területek valós adatok
     (Natural Earth). A főúthálózat előre elkészül; az utcák és a házak darabonként (chunk), igény szerint generálódnak. */
  function world(R) {
    const g = graph(), SC = MD.K / 180, SP = 135, CH = 15, CS = SP * CH, K4 = 4096;
    const NH = new Map(), SH = new Map(), EG = new Map(), SG = new Map(), eg = new Map(), BG = new Map(), bh = new Map(), LT = new Map(), own = new Map(), done = new Map();
    const hput = (H, c, x, y, v) => { const k = Math.floor(x / c) * K4 + Math.floor(y / c), l = H.get(k); if (l) l.push(v); else H.set(k, [v]); };
    const put = (x, y, sk) => { const n = g.node(x, y); hput(NH, 128, x, y, n); if (sk) hput(SH, 128, x, y, n); return n; };
    const nearIn = (H, x, y, r, f) => { let b = -1, bd = r; for (let gx = Math.floor((x - r) / 128); gx <= Math.floor((x + r) / 128); gx++) for (let gy = Math.floor((y - r) / 128); gy <= Math.floor((y + r) / 128); gy++) { const l = H.get(gx * K4 + gy); if (l) for (const n of l) { if (f && !f(n)) continue; const d = Math.hypot(g.N[n].x - x, g.N[n].y - y); if (d < bd) { bd = d; b = n; } } } return b; };
    const span = (H, c, ax, ay, bx, by, pad, v) => { for (let gx = Math.floor((Math.min(ax, bx) - pad) / c); gx <= Math.floor((Math.max(ax, bx) + pad) / c); gx++) for (let gy = Math.floor((Math.min(ay, by) - pad) / c); gy <= Math.floor((Math.max(ay, by) + pad) / c); gy++) { const k = gx * K4 + gy, l = H.get(k); if (l) l.push(v); else H.set(k, [v]); } };
    const reg = e => { if (!e) return e; const A = g.N[e.a], B = g.N[e.b]; span(EG, 512, A.x, A.y, B.x, B.y, 0, e); span(eg, 200, A.x, A.y, B.x, B.y, 40, e); if (e.sk) span(SG, 4096, A.x, A.y, B.x, B.y, 0, e); hput(own, CS, (A.x + B.x) / 2, (A.y + B.y) / 2, e); return e; };
    // vízrács
    const WG = new Map(); for (const w of GEO.water) for (let i = 1; i < w.p.length; i++) { const a = w.p[i - 1], b = w.p[i]; span(WG, 512, a[0], a[1], b[0], b[1], w.w / 2 + 90, [a[0], a[1], b[0], b[1], w.w]); }
    const wet = (x, y, pad) => { const l = WG.get(Math.floor(x / 512) * K4 + Math.floor(y / 512)); if (l) for (const q of l) if (dseg(x, y, q[0], q[1], q[2], q[3])[0] < q[4] / 2 + pad) return true; return false; };
    const crossW = (ax, ay, bx, by, minW = 0) => { for (let gx = Math.floor(Math.min(ax, bx) / 512); gx <= Math.floor(Math.max(ax, bx) / 512); gx++) for (let gy = Math.floor(Math.min(ay, by) / 512); gy <= Math.floor(Math.max(ay, by) / 512); gy++) { const l = WG.get(gx * K4 + gy); if (l) for (const q of l) if (q[4] >= minW && segInt([q[0], q[1]], [q[2], q[3]], [ax, ay], [bx, by]) >= 0) return true; } return false; };
    const parks = MD.parks, inPark = (x, y, pad = 0) => parks.some(h => ((x - h[0]) / (h[2] + pad)) ** 2 + ((y - h[1]) / (h[3] + pad)) ** 2 < 1);
    // települések: valós beépített terület + a kisebb helyek népesség szerinti köre
    const towns = MD.towns.map(t => ({ n: t[0], x: t[1], y: t[2], pop: t[3], r: (95 + 62 * Math.sqrt(t[3])) * SC })), TG = new Map();
    for (const t of towns) span(TG, 2048, t.x, t.y, t.x, t.y, t.r, t);
    const inC = (x, y) => inPoly(GEO.county, x, y) || !!cityAt(x, y);
    const inU = (x, y) => { if (cityAt(x, y)) return true; const l = TG.get(Math.floor(x / 2048) * K4 + Math.floor(y / 2048)); if (l) for (const t of l) if ((t.x - x) ** 2 + (t.y - y) ** 2 < t.r * t.r) return true; for (const u of GEO.urban) if (inPoly(u, x, y)) return true; return false; };
    const dan = GEO.water[0], C = MD.center, dX = y => { let best = null; for (let i = 1; i < dan.p.length; i++) { const a = dan.p[i - 1], b = dan.p[i]; if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) { const x = a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]); if (best == null || Math.abs(x - C[0]) < Math.abs(best - C[0])) best = x; } } return best; };
    const raw = (a, b, o) => reg(g.edge(a, b, o));
    const link = (a, b, o) => { const A = g.N[a], B = g.N[b]; if (a === b) return; if (crossW(A.x, A.y, B.x, B.y)) { if (!o || !o.hw) return; o = { ...o, bridge: 1 }; } return raw(a, b, o); };
    // főúthálózat: pontsorból csomópontok és élek (ok: hol vezethet az út)
    const road = (pts, t, gen, step = 300, ok = null) => { let last = -1; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.ceil(len / step));
        for (let k = i === 1 ? 0 : 1; k <= m; k++) { const x = a[0] + (b[0] - a[0]) * k / m, y = a[1] + (b[1] - a[1]) * k / m; if (x < 10 || y < 10 || x > WW - 10 || y > WH - 10 || (ok ? !ok(x, y) : !gen && !inC(x, y) && !inU(x, y))) { last = -1; continue; }
          let n = nearIn(SH, x, y, Math.min(60, step * .4)); if (n < 0) n = put(x, y, 1); if (last >= 0 && last !== n) { const A = g.N[last], mx = (A.x + x) / 2, my = (A.y + y) / 2; link(last, n, { big: 1, hw: t + 1, sk: 1, nob: inU(mx, my) ? 0 : 1 }); } last = n; } } };
    if (C) { // Budapest: körutak és sugárutak a pesti oldalon, rakpartok, hidak
      const pest = (x, y) => { const rx = dX(y); return rx != null && x > rx + dan.w / 2 + 60 && !wet(x, y, 50) && !inPark(x, y) && !!cityAt(x, y); }, D = Math.PI / 180;
      for (const r of [980, 1960, 3640, 6160, 9520]) { const st = 11.25 / Math.ceil(11.25 * D * r / 140), pts = []; for (let a = -112.5; a <= 112.5 + 1e-6; a += st) pts.push([C[0] + Math.cos(a * D) * r, C[1] + Math.sin(a * D) * r]); road(pts, -1, true, 150, pest); }
      for (let a = -101.25; a <= 101.25; a += 22.5) { const pts = []; for (let k = 3; k <= 68; k++) pts.push([C[0] + Math.cos(a * D) * k * 140, C[1] + Math.sin(a * D) * k * 140]); road(pts, -1, true, 150, pest); }
      const ys = MD.bridges.map(b => b[2]), y0 = Math.min(...ys) - 1500, y1 = Math.max(...ys) + 1500;
      for (const side of [-1, 1]) { const pts = []; for (let y = y0; y <= y1; y += 150) { const rx = dX(y); if (rx != null) pts.push([rx + side * (dan.w / 2 + 45), y]); } road(pts, 0, true, 160, (x, y) => !wet(x, y, 20)); }
      for (const b of MD.bridges) { const a = nearIn(SH, b[1] - dan.w / 2 - 45, b[2], 220), c = nearIn(SH, b[1] + dan.w / 2 + 45, b[2], 220); if (a >= 0 && c >= 0) raw(a, c, { bridge: 1, big: 1, hw: 1, sk: 1, nob: 1 }); } }
    for (const r of GEO.roads) road(r.p, r.t, false);
    for (let i = 0; i < towns.length; i++) for (let j = i + 1; j < towns.length; j++) { const a = towns[i], b = towns[j], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, r2 = ((a.x - b.x) ** 2 + (a.y - b.y) ** 2) / 4; if (r2 > (2600 * SC) ** 2) continue;
      if (towns.some(t => t !== a && t !== b && (t.x - mx) ** 2 + (t.y - my) ** 2 < r2) || crossW(a.x, a.y, b.x, b.y, 150) || (C && cityAt(mx, my))) continue;
      const pts = [[a.x, a.y]], m = Math.max(1, Math.round(Math.sqrt(r2) / 1600)), ox = -(b.y - a.y), oy = b.x - a.x, ol = Math.hypot(ox, oy); for (let k = 1; k < m; k++) { const w = (R() - .5) * 700; pts.push([a.x + (b.x - a.x) * k / m + ox / ol * w, a.y + (b.y - a.y) * k / m + oy / ol * w]); } pts.push([b.x, b.y]); road(pts, 0, true); }
    // utcák darabonként: minden rácspont helye és minden él léte csak a rácsindexből számolódik, így a sorrendtől független
    const hsh = (i, j, k) => { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    function genNodes(ci, cj) { const key = ci * K4 + cj; if (ci < 0 || cj < 0 || done.get(key)) return; done.set(key, 1); const made = [];
      for (let i = ci * CH; i < (ci + 1) * CH; i++) for (let j = cj * CH; j < (cj + 1) * CH; j++) { const x = (i + .5) * SP + (hsh(i, j, 1) - .5) * 62 + Math.sin(j * .55 + i * .13) * 30, y = (j + .5) * SP + (hsh(i, j, 2) - .5) * 62 + Math.cos(i * .5 + j * .11) * 30;
        if (x < 20 || y < 20 || x > WW - 20 || y > WH - 20 || !inU(x, y) || !inC(x, y) || wet(x, y, 45) || inPark(x, y)) continue; const sk = nearIn(SH, x, y, 92); if (sk >= 0) { LT.set(i * 65536 + j, sk); made.push([i, j, sk, 1]); continue; } // főút csomópontja közelében a rácspont arra olvad rá
        const n = put(x, y, 0); g.N[n].id = i + ',' + j; LT.set(i * 65536 + j, n); made.push([i, j, n, 0]); }
      for (const [i, j, n, al] of made) { const lk = (i2, j2, li, lj, dir) => { const o = LT.get(i2 * 65536 + j2); if (o != null && o !== n && hsh(li, lj, 3 + dir) > .08) link(n, o, { big: dir ? li % 9 === 4 : lj % 9 === 4 }); };
        lk(i + 1, j, i, j, 0); lk(i, j + 1, i, j, 1); lk(i - 1, j, i - 1, j, 0); lk(i, j - 1, i, j - 1, 1); if (!al) { const o = nearIn(SH, g.N[n].x, g.N[n].y, 170); if (o >= 0) link(n, o); } } }
    const Ball = [];
    function buildEdge(e) { if (e.bridge || e.nob) return; const A = g.N[e.a], B = g.N[e.b], dx = (B.x - A.x) / e.len, dy = (B.y - A.y) / e.len, Q = rng((Math.round(A.x * 7 + B.y * 13 + A.y * 31 + B.x * 3) % 2147483000) + 11);
      for (const side of [-1, 1]) { let s = 20; while (s < e.len - 34) { const w = 24 + Q() * 26, dp = 20 + Q() * 20, cx = A.x + dx * (s + w / 2) - dy * side * (RW / 2 + 4 + dp / 2), cy = A.y + dy * (s + w / 2) + dx * side * (RW / 2 + 4 + dp / 2), rad = Math.max(w, dp) / 2, hh = 8 + Q() * Q() * 46, sh = Q(); s += w + 5;
          if (cx < 12 || cy < 12 || cx > WW - 12 || cy > WH - 12 || wet(cx, cy, dp / 2 + 10) || inPark(cx, cy, 8)) continue;
          let ok = true; const gx = Math.floor(cx / 60), gy = Math.floor(cy / 60);
          for (let a = -1; a <= 1 && ok; a++) for (let b = -1; b <= 1 && ok; b++) { const l = bh.get((gx + a) * K4 + gy + b); if (l) for (const o of l) if (Math.hypot(o.x - cx, o.y - cy) < (o.rad + rad) * .82) { ok = false; break; } }
          if (ok) { const l = eg.get(Math.floor(cx / 200) * K4 + Math.floor(cy / 200)); if (l) for (const f of l) if (f !== e && dseg(cx, cy, g.N[f.a].x, g.N[f.a].y, g.N[f.b].x, g.N[f.b].y)[0] < RW / 2 + dp * .5 + 2) { ok = false; break; } }
          if (!ok) continue; const hw = w / 2, hd = dp / 2, poly = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([u, v]) => [cx + dx * u - dy * v, cy + dy * u + dx * v]);
          const b = { x: cx, y: cy, rad, poly, h: hh, sh }; Ball.push(b); hput(bh, 60, cx, cy, b); hput(BG, 512, cx, cy, b); } } }
    function genBld(ci, cj) { const key = ci * K4 + cj; if (ci < 0 || cj < 0 || done.get(key) === 2) return; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) genNodes(ci + a, cj + b); done.set(key, 2); const l = own.get(key); if (l) for (const e of l) buildEdge(e); }
    const ensure = (x0, y0, x1, y1) => { for (let ci = Math.floor(Math.max(0, x0) / CS); ci <= Math.floor(Math.min(WW, x1) / CS); ci++) for (let cj = Math.floor(Math.max(0, y0) / CS); cj <= Math.floor(Math.min(WH, y1) / CS); cj++) genBld(ci, cj); };
    const inCircle = (H, c, get, x, y, r) => { const o = []; for (let gx = Math.floor((x - r) / c); gx <= Math.floor((x + r) / c); gx++) for (let gy = Math.floor((y - r) / c); gy <= Math.floor((y + r) / c); gy++) { const l = H.get(gx * K4 + gy); if (l) for (const v of l) { const q = get(v); if ((q.x - x) ** 2 + (q.y - y) ** 2 < r * r) o.push(v); } } return o; };
    const labels = [...MD.labels, ...MD.parks.map(h => [h[0], h[1], h[4], 11]), ...(MD.bridges || []).map(b => [b[1], b[2] - 30, b[0], 10])];
    return { ...g, Efull: g.E, parks, wet, inPark, towns, townsByPop: towns.slice().sort((a, b) => b.pop - a.pop), labels, EG, SG, BG, ensure,
      nearAny: (x, y, r) => nearIn(NH, x, y, r), nodesIn: (x, y, r) => inCircle(NH, 128, n => g.N[n], x, y, r), bldIn: (x, y, r) => inCircle(BG, 512, b => b, x, y, r),
      nodeOf: k => typeof k === 'number' ? (k < g.N.length ? k : null) : (() => { const [i, j] = String(k).split(',').map(Number); const n = LT.get(i * 65536 + j); return n == null ? null : n; })() };
  }
  const fresh = () => ({ phase: 'plan', t: 0, speed: 1, tool: 'zone', tab: 0, abil: null, civs: [], zs: [], sol: [], apcs: [], fx: [], gas: [], helis: [], strikes: [], uses: { ...RUN.uses }, draw: null, hover: null, res: null, kills: 0, lost: 0, evac: 0, fT: 0, cT: 0, hist: [], broke: 0, wT: 8, sel: null, trains: [], ships: [], modal: null });
  function newMission(m, prev, mapId) {
    if (!prev) { setMap(mapId || MD.id); const c = world(rng(13));
      S = { ...c, ...fresh(), E: [], live: [], built: [], ptracks: [], tracks: [], railCfg: {}, name: MD.title, B: [], m: 1, phase: 'pick', budget: Math.round(1400 * RUN.bud), zones: [], units: [], mort: 0, start: null, box: [0, 0, WW, WH], n0: 1, obj: .1 };
      MAP = null; L = null; layout(true); return; }
    // megnyert kör után a védelem megmarad (falak kijavítva, hidak helyreállítva), a pálya pedig kijjebb tágul
    for (const e of prev.E) { e.dead = 0; e.stain = 0; } for (const z of prev.zones) for (const b of z.bars) b.hp = b.max;
    const units = prev.units.filter(u => !u.lost).map(u => ({ k: u.k, x: u.x, y: u.y, b: u.b, e: u.e, s: u.s, paid: u.paid, cd: Math.random(), ammo: TOOL[u.k].ammo || 0, lv: u.lv || 1 })), old = { s: L.s, cx: L.cam.cx, cy: L.cam.cy };
    S = { ...prev, ...fresh(), m, budget: prev.budget, units }; region(); spawn();
    { const inc = Math.max(Math.round((400 + 160 * m) * RUN.bud), Math.round(S.n0 * .022 * RUN.bud)); S.budget += inc; S.msg = { t: '+' + inc + ' keret a(z) ' + S.n0.toLocaleString('hu-HU') + ' lakos után', l: 4, ok: 1 }; } // a körönkénti keret a terület lakosságához igazodik L = null; layout(true); S.zin = { t: 0, ...old };
  }
  function region() { const [sx, sy] = S.start, R0 = R_START + R_GROW * (S.m - 1); S.R = R0; S.ensure(sx - R0 - 150, sy - R0 - 150, sx + R0 + 150, sy + R0 + 150);
    for (const i of S.live) S.N[i].adj = []; const inn = new Set(S.nodesIn(sx, sy, R0)); for (const i of inn) S.N[i].adj = S.N[i].all.filter(a => inn.has(a.n));
    const seen = new Set(); let best = []; for (const i of inn) { if (seen.has(i)) continue; const q = [i], o = [i]; seen.add(i); while (q.length) { const u = q.pop(); for (const a of S.N[u].adj) if (!seen.has(a.n)) { seen.add(a.n); q.push(a.n); o.push(a.n); } } if (o.length > best.length) best = o; }
    const keep = new Set(best); for (const i of inn) if (!keep.has(i)) S.N[i].adj = []; S.live = best; S.E = []; for (const i of best) for (const a of S.N[i].adj) if (i < a.n) S.E.push(a.e); S.B = S.bldIn(sx, sy, R0).concat(S.built || []); railsIn();
    S.box = [Math.max(0, sx - R0 - 20), Math.max(0, sy - R0 - 20), Math.min(WW, sx + R0 + 20), Math.min(WH, sy + R0 + 20)]; protCalc(); }
  function mkTrack(pts, o) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, cum, len: cum[cum.length - 1], cars: [], ...o }; }
  function trackPos(tr, p) { p = Math.max(0, Math.min(tr.len, p)); let i = 1; while (i < tr.cum.length - 1 && tr.cum[i] < p) i++; const a = tr.pts[i - 1], b = tr.pts[i], l = tr.cum[i] - tr.cum[i - 1] || 1, t = (p - tr.cum[i - 1]) / l; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])]; }
  function nearTrack(x, y, max) { let best = null, bd = max; for (const tr of S.tracks) for (let i = 1; i < tr.pts.length; i++) { const a = tr.pts[i - 1], b = tr.pts[i], [d0, t] = dseg(x, y, a[0], a[1], b[0], b[1]); if (d0 < bd) { bd = d0; best = { tr, p: tr.cum[i - 1] + t * (tr.cum[i] - tr.cum[i - 1]), d: d0, x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t }; } } return best; }
  // a régióba eső valós vasútvonalak is használható pályák; az állomások a hozzájuk legközelebbi sínhez tartoznak
  function railsIn() { const [sx, sy] = S.start, R0 = S.R, real = []; GEO.rails.forEach((pl, ri) => { let cur = [], k = 0; const flush = () => { if (cur.length > 1) { const tr = mkTrack(cur, { real: 1, rid: ri + ':' + k++ }); if (tr.len > 250) { tr.cars = S.railCfg[tr.rid] || (S.railCfg[tr.rid] = []); real.push(tr); } } cur = []; };
      for (let i = 1; i < pl.length; i++) { const a = pl[i - 1], b = pl[i], dx = b[0] - a[0], dy = b[1] - a[1], A = dx * dx + dy * dy, B = 2 * ((a[0] - sx) * dx + (a[1] - sy) * dy), Cc = (a[0] - sx) ** 2 + (a[1] - sy) ** 2 - R0 * R0, D = B * B - 4 * A * Cc; if (D <= 0 || !A) { flush(); continue; } const t0 = Math.max(0, (-B - Math.sqrt(D)) / (2 * A)), t1 = Math.min(1, (-B + Math.sqrt(D)) / (2 * A)); if (t0 >= t1) { flush(); continue; }
        const p0 = [a[0] + dx * t0, a[1] + dy * t0], p1 = [a[0] + dx * t1, a[1] + dy * t1]; if (!cur.length || t0 > 0) { flush(); cur.push(p0); } cur.push(p1); if (t1 < 1) flush(); } flush(); });
    S.tracks = (S.ptracks || []).concat(real); for (const u of S.units) if (u.k === 'sta') { const nt = nearTrack(u.x, u.y, 60); u.tr = nt ? nt.tr : null; u.tp = nt ? nt.p : 0; } }
  function makeTrack(raw) { const pts = [raw[0]]; for (const q of raw) { const l = pts[pts.length - 1]; if (Math.hypot(q[0] - l[0], q[1] - l[1]) >= 30) pts.push(q); } if (pts.length < 2) return; const tr = mkTrack(pts, {}); if (tr.len < 150) return say('Túl rövid sín.'); const c = Math.round(tr.len * .12); if (c > S.budget) return say('Nincs rá keret: ' + c + ' kellene.');
    tr.cost = c; S.budget -= c; S.ptracks.push(tr); S.tracks.push(tr); S.hist.push({ t: 't', tr }); Sfx.blip(420, .06, 'square', .05); }
  const carsCost = tr => tr.cars.reduce((a, k) => a + CARS[k].c, 0), staOf = tr => S.units.filter(u => u.k === 'sta' && u.tr === tr).sort((a, b) => a.tp - b.tp);
  function delTrack(tr) { if (staOf(tr).length) return say('Előbb az állomásokat töröld.'); S.budget += (tr.cost || 0) + carsCost(tr); S.ptracks = S.ptracks.filter(q => q !== tr); S.tracks = S.tracks.filter(q => q !== tr); }
  // a népesség a játszható terület utcahosszával arányos, felső határ nélkül; nagy tömegnél a csoportok nőnek, nem az egységek száma
  function spawn() { let pool = S.E.filter(e => !e.nob && !e.bridge); if (pool.length < 10) pool = S.E; const cum = []; let tot = 0; for (const e of pool) { tot += e.len; cum.push(tot); }
    const n = Math.max(400, Math.round(tot * DENS)), avg = Math.max(10, n / 3200), pickE = () => { const v = Math.random() * tot; let lo = 0, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < v) lo = m + 1; else hi = m; } return pool[lo]; };
    S.gmax = Math.round(avg * 2); S.civs = []; for (let left = n; left > 0;) { const a = agent(pickE()); a.n = Math.min(left, Math.max(1, Math.round(avg * (.6 + Math.random() * .8)))); left -= a.n; S.civs.push(a); } S.n0 = n; S.obj = Math.min(.4, .08 + .02 * S.m);
    S.goal = S.m % 3 === 0 ? 'hold' : S.m % 4 === 2 ? 'hosp' : 'clear'; S.holdT = 90 + 8 * S.m; S.hosp = null;
    if (S.goal === 'hosp') { const [sx, sy] = S.start, c = S.B.filter(b => { const d0 = Math.hypot(b.x - sx, b.y - sy); return d0 > 170 && d0 < Math.min(520, S.R * .6); }), l = c.length ? c : S.B; S.hosp = l[Math.floor(Math.random() * l.length)] || null; if (!S.hosp) S.goal = 'clear'; } }
  const SK = 'hgws_holtvaros_mentes', note = t => { S.msg = { t, l: 2.2, ok: 1 }; Sfx.blip(620, .08, 'triangle', .05); };
  let saved = false; try { saved = !!localStorage.getItem(SK); } catch (e) {}
  function nameIt() { let bt = null, bd = 1e9; for (const t of S.towns) { const d0 = Math.hypot(t.x - S.start[0], t.y - S.start[1]) - t.r; if (d0 < bd) { bd = d0; bt = t; } } const c0 = cityAt(S.start[0], S.start[1]), c = c0 && c0.n ? c0 : null; S.name = c && (c.n === 'Budapest' || !bt || bd > 0) ? c.n : bt ? bt.n : MD.title; }
  function saveGame(silent) { if (S.phase !== 'plan') return; const nk = i => S.N[i].id, ek = e => [nk(e.a), nk(e.b)];
    const o = { v: 3, map: MD.id, W: WW, m: S.m, start: S.start, budget: S.budget, mort: S.mort, run: RUN,
      zones: S.zones.map(z => ({ p: z.poly.map(q => [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10]), c: z.closed ? 1 : 0, cost: z.cost, bars: z.bars.map(b => [...ek(b.e), b.s, b.gate, b.pi]) })),
      tracks: S.ptracks.map(tr => ({ p: tr.pts.map(q => [Math.round(q[0]), Math.round(q[1])]), cars: tr.cars, cost: tr.cost })), railCfg: S.railCfg, built: S.built.map(b => [b.x, b.y, b.ang]), units: S.units.map(u => [u.k, u.x, u.y, u.paid, u.b ? (u.b.built ? -2 - S.built.indexOf(u.b) : 1) : -1, u.e ? ek(u.e) : null, u.s || 0, u.lv || 1]), hold: S.live.filter(i => S.N[i].hold).map(nk), cor: S.E.filter(e => e.cor).map(ek) };
    try { localStorage.setItem(SK, JSON.stringify(o)); saved = true; if (!silent) note('Mentve · ' + S.m + '. küldetés, ' + S.name); } catch (e) { say('Nem sikerült menteni.'); } }
  function loadGame() { let o = null; try { o = JSON.parse(localStorage.getItem(SK)); } catch (e) {} if (!o || !o.map) return say('Nincs betölthető mentés.'); if (o.map !== MD.id) newMission(1, null, o.map); if (o.v !== 3 || o.W !== WW) return say('A mentés régebbi térképhez készült.');
    for (const e of S.Efull) { if (e.bars.length) e.bars = []; e.cor = 0; e.dead = 0; e.stain = 0; } for (const n of S.N) n.hold = 0;
    const R0 = R_START + R_GROW * (o.m - 1); S.ensure(o.start[0] - R0 - 150, o.start[1] - R0 - 150, o.start[0] + R0 + 150, o.start[1] + R0 + 150);
    const edgeOf = (ka, kb) => { const a = S.nodeOf(ka), b = S.nodeOf(kb); if (a == null || b == null) return null; const q = S.N[a].all.find(v => v.n === b); return q ? q.e : null; };
    for (const k of o.hold) { const n = S.nodeOf(k); if (n != null) S.N[n].hold = 1; } for (const [ka, kb] of o.cor) { const e = edgeOf(ka, kb); if (e) e.cor = 1; }
    RUN = o.run; const zones = o.zones.map(q => { const z = { poly: q.p, closed: !!q.c, cost: q.cost, bars: [] }; for (const [ka, kb, s0, gate, pi] of q.bars) { const e = edgeOf(ka, kb); if (!e) continue; const A = S.N[e.a], B = S.N[e.b], hp = gHP(gate), b = { e, s: s0, hp, max: hp, gate, pi, z, x: A.x + (B.x - A.x) * s0 / e.len, y: A.y + (B.y - A.y) * s0 / e.len }; e.bars.push(b); z.bars.push(b); } return z; });
    const built = (o.built || []).map(b => mkBuilt(b[0], b[1], b[2])); let refund = 0;
    const ptracks = (o.tracks || []).map(t => { const tr = mkTrack(t.p, { cost: t.cost }); tr.cars = (t.cars || []).filter(k => CARS[k]); return tr; });
    const units = o.units.filter(u => TOOL[u[0]]).map(u => { const q = { k: u[0], x: u[1], y: u[2], paid: u[3], lv: u[7] || 1, cd: Math.random(), ammo: TOOL[u[0]].ammo || 0 };
      if (u[4] <= -2) q.b = built[-2 - u[4]]; else if (u[4] >= 0) { let bb = null, bd = 14; for (const c of S.bldIn(q.x, q.y, 40)) { const d0 = Math.hypot(c.x - q.x, c.y - q.y); if (d0 < bd) { bd = d0; bb = c; } } if (!bb) { refund += q.paid; return null; } q.b = bb; }
      if (u[5]) { const e = edgeOf(u[5][0], u[5][1]); if (!e) { refund += q.paid; return null; } q.e = e; q.s = u[6]; } return q; }).filter(Boolean);
    const old = { s: L.s, cx: L.cam.cx, cy: L.cam.cy }; S = { ...S, ...fresh(), m: o.m, start: o.start, budget: o.budget + refund, mort: units.filter(u => u.k === 'mor').length, zones, units, built, ptracks, railCfg: o.railCfg || {} }; G.score = RUN.total; hud(); region(); nameIt(); spawn(); L = null; layout(true); S.zin = { t: 0, ...old }; note('Betöltve · ' + S.m + '. küldetés, ' + S.name); }
  function setStart(x, y) { S.ensure(x - 900, y - 900, x + 900, y + 900); const n = S.nearAny(x, y, 700); if (n < 0) return say('Itt nincs település – válassz lakott helyet.'); S.start = [S.N[n].x, S.N[n].y]; region(); if (S.E.length < 30) { S.start = null; for (const i of S.live) S.N[i].adj = []; S.live = []; S.E = []; return say('Itt túl kevés az utca – válassz lakott helyet.'); } nameIt();
    spawn(); S.phase = 'plan'; const old = { s: L.s, cx: L.cam.cx, cy: L.cam.cy }; L = null; layout(true); S.zin = { t: 0, ...old }; Sfx.perfect(); }
  function agent(e, R = Math.random) { const a = { e, s: R() * e.len, dir: R() < .5 ? 1 : -1, off: (R() - .5) * (RW - 5), hp: 2, n: 1, ty: 0, hpp: HPZ, sp: .8 + Math.random() * .4, cd: R(), x: 0, y: 0, idle: 0 }; pos(a); return a; }
  function pos(a) { const A = S.N[a.e.a], B = S.N[a.e.b], t = a.s / a.e.len, dx = (B.x - A.x) / a.e.len, dy = (B.y - A.y) / a.e.len; a.x = A.x + (B.x - A.x) * t - dy * a.off; a.y = A.y + (B.y - A.y) * t + dx * a.off; }
  const cnt = l => { let n = 0; for (const a of l) n += a.n; return n; };
  const headN = a => a.dir > 0 ? a.e.b : a.e.a;
  function nearEdge(x, y, max = 40, f) { let b = null, bd = max; for (const e of S.E) { if (e.dead || (f && !f(e))) continue; const [d, t] = dseg(x, y, S.N[e.a].x, S.N[e.a].y, S.N[e.b].x, S.N[e.b].y); if (d < bd) { bd = d; b = { e, s: t * e.len, d }; } } return b; }
  const nearNode = (x, y, max = 1e9) => { let b = -1, bd = max; for (const i of S.live) { const d = Math.hypot(S.N[i].x - x, S.N[i].y - y); if (d < bd) { bd = d; b = i; } } return b; };
  function protCalc() { const cut = new Set(S.units.filter(u => u.k === 'c4').map(u => u.e)), id = new Int32Array(S.N.length).fill(-1), size = []; let big = 0;
    for (const s0 of S.live) { if (id[s0] >= 0) continue; const k = size.length, q = [s0]; id[s0] = k; let n = 0; while (q.length) { const u = q.pop(); n++; for (const a of S.N[u].adj) if (id[a.n] < 0 && !a.e.dead && !cut.has(a.e) && !liveBars(a.e)) { id[a.n] = k; q.push(a.n); } } size.push(n); if (n > size[big]) big = k; }
    S.prot = new Uint8Array(S.N.length); for (const i of S.live) if (id[i] !== big) S.prot[i] = 1; S.comp = id; S.big = big; }
  const sideN = a => { let lo = Infinity; for (const b of a.e.bars) if (b.hp > 0 && b.s < lo) lo = b.s; return a.s <= lo ? a.e.a : a.e.b; };

  /* ---------------- elrendezés, kamera ---------------- */
  const unlocked = t => S.m >= t.u;
  function barItems() {
    if (S.phase === 'pick') return [];
    if (S.phase === 'plan') return TOOLS.filter(t => t.tab === S.tab || t.k === 'del').map(t => ({ ...t, kind: 'tool' }));
    return [...ABIL.filter(a => RUN.uses[a.k] > 0).map(a => ({ ...a, kind: 'abil' })), { k: 'spd', kind: 'spd', n: '', ic: S.speed ? '⏩' : '⏸' }];
  }
  function layout(resetCam) {
    const d = G.d, its = barItems(), per = Math.max(4, Math.min(its.length, Math.floor((G.W - 12 * d) / (70 * d)))), rowsN = Math.ceil(its.length / per), bh = 54 * d, head = S.phase === 'plan' || S.phase === 'pick' ? 40 * d : 0, barH = head + rowsN * (bh + 6 * d) + 10 * d;
    const top = 96 * d, vw = G.W, vh = G.H - barH - top, [x0, y0, x1, y1] = S.box, fit = Math.min(vw / (x1 - x0), vh / (y1 - y0)), iw = Math.min(92 * d, (G.W - 12 * d) / per), cam = L && !resetCam ? L.cam : { z: 1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
    const tw = Math.min(120 * d, (G.W - 34 * d) / 4.15);
    L = { d, top, vw, vh, fit, cam, barY: G.H - barH, barH, W: G.W, H: G.H,
      tabs: S.phase === 'plan' ? [['VÉDELEM', 0], ['KÜLÖNLEGES', 1], ['ÉPÍTÉS', 3]].map(([n, k], j) => ({ n, k, x: 8 * d + j * (tw + 6 * d), y: G.H - barH + 6 * d, w: tw, h: 30 * d })) : S.phase === 'pick' ? MAPS.map((m, j) => { const w = Math.min(230 * d, (G.W - 16 * d - (MAPS.length - 1) * 6 * d) / MAPS.length); return { n: m.cap[0], k: m.id, map: 1, x: (G.W - MAPS.length * w - (MAPS.length - 1) * 6 * d) / 2 + j * (w + 6 * d), y: G.H - barH + 6 * d, w, h: 30 * d }; }) : [],
      go: S.phase === 'plan' ? { x: G.W - 8 * d - tw * 1.1, y: G.H - barH + 6 * d, w: tw * 1.1, h: 30 * d } : null,
      its: its.map((it, j) => { const row = Math.floor(j / per), inRow = Math.min(per, its.length - row * per); return { ...it, x: (G.W - iw * inRow) / 2 + (j % per) * iw, y: G.H - barH + head + 6 * d + row * (bh + 6 * d), w: iw, h: bh }; }) };
    clampCam();
  }
  const zLim = () => [Math.min(1, Math.min(L.vw / WW, L.vh / WH) / L.fit), Math.max(1, 2.3 * L.d / L.fit)];
  function clampCam() { const c = L.cam, zl = zLim(); c.z = Math.max(zl[0], Math.min(zl[1], c.z)); const x0 = 0, y0 = 0, x1 = WW, y1 = WH, s = L.fit * c.z, hw = L.vw / s / 2, hh = L.vh / s / 2; c.cx = hw >= (x1 - x0) / 2 ? (x0 + x1) / 2 : Math.max(x0 + hw, Math.min(x1 - hw, c.cx)); c.cy = hh >= (y1 - y0) / 2 ? (y0 + y1) / 2 : Math.max(y0 + hh, Math.min(y1 - hh, c.cy)); L.s = s; L.ox = L.vw / 2 - c.cx * s; L.oy = L.top + L.vh / 2 - c.cy * s; }
  const toW = (x, y) => [(x - L.ox) / L.s, (y - L.oy) / L.s];
  function zoomAt(x, y, f) { const [wx, wy] = toW(x, y); { const zl = zLim(); L.cam.z = Math.max(zl[0], Math.min(zl[1], L.cam.z * f)); } const s = L.fit * L.cam.z; L.cam.cx = wx - (x - L.vw / 2) / s; L.cam.cy = wy - (y - L.top - L.vh / 2) / s; clampCam(); }

  /* ---------------- útkeresés a hálózaton ---------------- */
  function dij(src, cost) { const n = S.N.length, F = new Float64Array(n).fill(Infinity), hd = [], hn = [];
    const push = (d0, k) => { let i = hd.length; hd.push(d0); hn.push(k); while (i > 0) { const p = (i - 1) >> 1; if (hd[p] <= d0) break; hd[i] = hd[p]; hn[i] = hn[p]; i = p; } hd[i] = d0; hn[i] = k; };
    const pop = () => { const top = hn[0], d0 = hd.pop(), k = hn.pop(), m = hd.length; if (m) { let i = 0; for (;;) { let c = 2 * i + 1; if (c >= m) break; if (c + 1 < m && hd[c + 1] < hd[c]) c++; if (hd[c] >= d0) break; hd[i] = hd[c]; hn[i] = hn[c]; i = c; } hd[i] = d0; hn[i] = k; } return top; };
    if (src instanceof Map) for (const [k, v] of src) { F[k] = v; push(v, k); } else for (const k of src) { F[k] = 0; push(0, k); }
    while (hd.length) { const d0 = hd[0], u = pop(); if (d0 > F[u]) continue; for (const a of S.N[u].adj) { if (a.e.dead) continue; const v = d0 + cost(a.e, u, a.n); if (v < F[a.n]) { F[a.n] = v; push(v, a.n); } } } return F; }
  const barCost = e => { let c = 0; for (const b of e.bars) if (b.hp > 0) c += barC(b); return c; };
  const liveBars = e => { let n = 0; for (const b of e.bars) if (b.hp > 0) n++; return n; }, wallBars = e => { let n = 0; for (const b of e.bars) if (b.hp > 0 && !b.gate) n++; return n; };
  const civCost = (e, u, v) => wallBars(e) || S.N[u].hold || S.N[v].hold ? Infinity : e.len * (e.cor ? .35 : 1);
  function fields() {
    // valódi legrövidebb út a legközelebbi emberhez: a forrás az ember pontos helye az úton, nem csak a kereszteződés
    const prey = new Map(), add = p => { const e = p.e; (e.ps || (e.ps = [])).push(p.s); if (!(prey.get(e.a) <= p.s)) prey.set(e.a, p.s); if (!(prey.get(e.b) <= e.len - p.s)) prey.set(e.b, e.len - p.s); };
    for (const e of S.E) e.ps = null; for (const c of S.civs) add(c); for (const s of S.sol) add(s);
    S.zF = prey.size ? dij(prey, e => e.len + barCost(e)) : null;
    const zn = new Set(); for (const z of S.zs) { zn.add(z.e.a); zn.add(z.e.b); } S.zD = zn.size ? dij(zn, e => e.len) : null;
    protCalc(); const ins = S.live.filter(i => S.prot[i]); S.cF = ins.length ? dij(ins, civCost) : null;
    for (const u of S.units) if (u.k === 'lift' || u.k === 'sta') u.F = dij([u.node], civCost);
  }
  // következő él a mező szerint; blocked(e): nem választható
  function pick(n, F, blocked, flee) { let best = null, bv = flee ? -Infinity : Infinity; for (const a of S.N[n].adj) { if (a.e.dead || (blocked && blocked(a.e, n, a.n))) continue; const v = F ? F[a.n] + (flee ? 0 : a.e.len) : Math.random(); if (flee ? v > bv : v < bv) { bv = v; best = a; } } return isFinite(bv) ? best : null; }
  function zPick(n) { let best = null, bv = Infinity; for (const a of S.N[n].adj) { const e = a.e; if (e.dead) continue; let v = e.len + barCost(e) + S.zF[a.n]; if (e.ps) for (const p of e.ps) { const d0 = e.a === n ? p : e.len - p; if (d0 < v) v = d0; } if (v < bv) { bv = v; best = a; } } return best; }
  function zTurn(z) { const e = z.e, hd = headN(z), tl = hd === e.a ? e.b : e.a, dF = z.dir > 0 ? e.len - z.s : z.s; let f = dF + S.zF[hd], b = e.len - dF + S.zF[tl];
    for (const q of e.bars) if (q.hp > 0) { { const pc = barC(q); if ((q.s - z.s) * z.dir > 0) f += pc; else b += pc; } } if (e.ps) for (const p of e.ps) { const d0 = (p - z.s) * z.dir; if (d0 >= 0) { if (d0 < f) f = d0; } else if (-d0 < b) b = -d0; } if (b + 25 < f) z.dir *= -1; }
  function take(a, adj, n) { a.e = adj.e; if (adj.e.a === n) { a.s = 0; a.dir = 1; } else { a.s = adj.e.len; a.dir = -1; } }
  // mozgás az élen; visszaadja az elzáró akadályt (ha a `stops` szerint megállítja) vagy 'node'-ot, ha csomóponthoz ért
  function advance(a, sp, dt, stops) {
    if (a.e.dead) { a.s = a.s < a.e.len / 2 ? 0 : a.e.len; a.dir = a.s ? 1 : -1; return 'node'; }
    let ds = sp * dt; for (const b of a.e.bars) if (b.hp > 0 && stops(b)) { const gap = (b.s - a.s) * a.dir; if (gap > -1 && gap <= ds + 4) { a.s = b.s - a.dir * 4; pos(a); return b; } }
    a.s += a.dir * ds; if (a.s <= 0 || a.s >= a.e.len) { a.s = Math.max(0, Math.min(a.e.len, a.s)); pos(a); return 'node'; } pos(a); return null;
  }

  /* ---------------- tervezés ---------------- */
  function say(t) { S.msg = { t, l: 2.5 }; Sfx.blip(150, .08, 'square', .05); }
  const discount = (k, x, y) => ['gar', 'snp', 'tur', 'mor', 'mine'].includes(k) && S.units.some(u => u.k === 'bud' && Math.hypot(u.x - x, u.y - y) < TOOL.bud.R) ? .75 : 1;
  function makeZone(pts) {
    if (pts.length < 2) return; const f = pts[0], l = pts[pts.length - 1], closed = pts.length > 6 && Math.hypot(f[0] - l[0], f[1] - l[1]) < 70, m = closed ? pts.length : pts.length - 1; let per = 0; for (let i = 0; i < m; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; per += Math.hypot(a[0] - b[0], a[1] - b[1]); }
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); if (per < 30) return;
    const cost = Math.round(per * .22); if (cost > S.budget) return say('Nincs rá keret: ' + cost + ' kellene.');
    const z = { poly: pts, closed, bars: [], cost, cx: xs.reduce((a, b) => a + b) / xs.length, cy: ys.reduce((a, b) => a + b) / ys.length };
    for (const e of S.E) { const A = [S.N[e.a].x, S.N[e.a].y], B = [S.N[e.b].x, S.N[e.b].y]; for (let i = 0; i < m; i++) { const u = segInt(pts[i], pts[(i + 1) % pts.length], A, B); if (u >= 0 && !e.bars.some(q => Math.abs(q.s - u * e.len) < 12)) { const b = { e, s: u * e.len, hp: HP_WALL, max: HP_WALL, gate: 0, x: A[0] + (B[0] - A[0]) * u, y: A[1] + (B[1] - A[1]) * u, z, pi: i }; e.bars.push(b); z.bars.push(b); } } }
    S.budget -= cost; S.zones.push(z); S.hist.push({ t: 'z', z }); protCalc(); Sfx.blip(420, .06, 'square', .05);
  }
  function delZone(z) { S.budget += z.cost; for (const b of z.bars) { if (b.gate) S.budget += TOOL.gate.c; b.e.bars = b.e.bars.filter(q => q !== b); } S.zones = S.zones.filter(q => q !== z); protCalc(); }
  const nearBar = (x, y, max = 26) => { let b = null, bd = max; for (const z of S.zones) for (const q of z.bars) { const d = Math.hypot(q.x - x, q.y - y); if (d < bd) { bd = d; b = q; } } return b; };
  function mkBuilt(x, y, ang) { const c = Math.cos(ang), sn = Math.sin(ang), hw = 14; return { x, y, ang, rad: 15, h: 16, sh: .7, built: 1, poly: [[-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]].map(([u, v]) => [x + c * u - sn * v, y + sn * u + c * v]) }; }
  function place(x, y) {
    const t = S.tool, T = TOOL[t]; if (!T) return; if (!unlocked(T)) return say(T.n + ': a(z) ' + T.u + '. küldetéstől érhető el.');
    if (t === 'del') { let u = null, ud = 24; for (const q of S.units) { const d = Math.hypot(q.x - x, q.y - y); if (d < ud) { ud = d; u = q; } }
      if (u) { S.budget += u.paid; if (u.k === 'mor') S.mort--; S.units = S.units.filter(q => q !== u); protCalc(); return Sfx.blip(250, .05, 'square', .05); }
      const b = nearBar(x, y); if (b && b.gate) { S.budget += b.gate === 2 ? TOOL.bgate.c : TOOL.gate.c; b.gate = 0; b.hp = b.max = HP_WALL; return; }
      { const nt = nearTrack(x, y, 16); if (nt && !nt.tr.real) return delTrack(nt.tr); }
      { const bb = S.built.find(q => Math.hypot(q.x - x, q.y - y) < q.rad + 6); if (bb) { S.built = S.built.filter(q => q !== bb); S.B = S.B.filter(q => q !== bb); S.budget += TOOL.bld.c; return; } }
      const hn = nearNode(x, y, 26); if (hn >= 0 && S.N[hn].hold) { S.N[hn].hold = 0; S.budget += TOOL.hold.c; return; }
      const ne = nearEdge(x, y, 14, e => e.cor); if (ne) { ne.e.cor = 0; S.budget += Math.round(ne.e.len * .04); return; }
      for (const z of S.zones) for (let i = 0; i < z.poly.length - (z.closed ? 0 : 1); i++) { const a = z.poly[i], c = z.poly[(i + 1) % z.poly.length]; if (dseg(x, y, a[0], a[1], c[0], c[1])[0] < 14) return delZone(z); } return; }
    if (t === 'up') { let u = null, ud = 26; for (const q of S.units) { const d0 = Math.hypot(q.x - x, q.y - y); if (d0 < ud && TOOL[q.k].r) { ud = d0; u = q; } } if (!u) return say('Lövő egységre koppints.'); const lv = u.lv || 1; if (lv >= 3) return say('Ez már a legmagasabb szint.');
      const c = Math.round(TOOL[u.k].c * .7 * lv); if (S.budget < c) return say('Nincs rá keret: ' + c + ' kellene.'); S.budget -= c; u.lv = lv + 1; u.paid += c; S.hist.push({ t: 'up', u, c }); return note(TOOL[u.k].n + ' → ' + u.lv + '. szint (−' + c + ')'); }
    if (t === 'gate' || t === 'bgate') { const b = nearBar(x, y), gk = t === 'bgate' ? 2 : 1; if (!b) return say('Kaput útzárra tehetsz (ahol a fal utat keresztez).'); if (b.gate === gk) return; if (b.gate === 2) return say('Itt már nagykapu áll.');
      const c = T.c - (b.gate === 1 ? TOOL.gate.c : 0); if (S.budget < c) return say('Nincs rá keret.'); S.budget -= c; S.hist.push({ t: 'g', b, c, pg: b.gate }); b.gate = gk; b.hp = b.max = gHP(gk); return Sfx.blip(520, .05, 'triangle', .05); }
    if (t === 'sta') { const nt = nearTrack(x, y, 45); if (!nt) return say('Állomást sínre tehetsz.'); if (S.units.some(u => u.k === 'sta' && Math.hypot(u.x - nt.x, u.y - nt.y) < 120)) return say('Túl közel van egy másik állomáshoz.'); if (S.budget < T.c) return say('Nincs rá keret.');
      S.budget -= T.c; const u = { k: 'sta', x: nt.x, y: nt.y, tr: nt.tr, tp: nt.p, cd: 0, ammo: 0, paid: T.c, lv: 1 }; S.units.push(u); S.hist.push({ t: 'u', u }); return Sfx.blip(600, .04, 'triangle', .05); }
    if (t === 'trn') { const nt = nearTrack(x, y, 70); if (!nt) return say('Koppints egy sínre.'); if (!staOf(nt.tr).length) return say('Előbb tegyél állomást erre a sínre.'); S.modal = { tr: nt.tr }; return; }
    if (t === 'bld') { const ne = nearEdge(x, y, 80); if (!ne) return say('Út mellé építhetsz.'); if (ne.d < RW / 2 + 15) return say('Az út mellé tedd, ne rá.'); if (S.B.some(q => Math.hypot(q.x - x, q.y - y) < q.rad + 17) || S.wet(x, y, 16)) return say('Itt nincs elég hely.'); if (S.budget < T.c) return say('Nincs rá keret.');
      const A = S.N[ne.e.a], B = S.N[ne.e.b], bb = mkBuilt(x, y, Math.atan2(B.y - A.y, B.x - A.x)); S.budget -= T.c; S.built.push(bb); S.B.push(bb); S.hist.push({ t: 'b', b: bb }); return Sfx.blip(600, .04, 'triangle', .05); }
    if (t === 'hold') { const n = nearNode(x, y, 34); if (n < 0) return say('Kereszteződésre tedd.'); if (S.N[n].hold) return; if (S.budget < T.c) return say('Nincs rá keret.'); S.budget -= T.c; S.N[n].hold = 1; S.hist.push({ t: 'h', n }); return Sfx.blip(520, .05, 'triangle', .05); }
    if (!T.on) return; let px = x, py = y, extra = {};
    if (T.on === 'b') { let b = null, bd = 1e9; for (const q of S.B) { const d = Math.hypot(q.x - x, q.y - y); if (d < q.rad + 8 && d < bd) { bd = d; b = q; } } if (!b) return say('Ezt épületbe kell tenni.'); if (S.units.some(u => u.b === b)) return say('Ez az épület már foglalt.'); px = b.x; py = b.y; extra.b = b; }
    else { const ne = nearEdge(x, y, 26, T.on === 'br' ? e => e.bridge : null); if (!ne) return say(T.on === 'br' ? 'Ezt hídra kell tenni.' : 'Ezt útra kell tenni.'); const A = S.N[ne.e.a], B = S.N[ne.e.b], k = ne.s / ne.e.len; px = A.x + (B.x - A.x) * k; py = A.y + (B.y - A.y) * k; extra.e = ne.e; extra.s = ne.s; }
    const cost = Math.round((T.c + (t === 'mor' ? 50 * S.mort : 0)) * discount(t, px, py)); if (S.budget < cost) return say('Nincs rá keret.');
    S.budget -= cost; if (t === 'mor') S.mort++; { const u = { k: t, x: px, y: py, cd: Math.random(), ammo: T.ammo || 0, paid: cost, lv: 1, ...extra }; S.units.push(u); S.hist.push({ t: 'u', u }); } if (t === 'c4') protCalc(); Sfx.blip(600, .04, 'triangle', .05);
  }
  function corridor(x, y) { const ne = nearEdge(x, y, 22, e => !e.cor); if (!ne) return; const c = Math.round(ne.e.len * .04); if (S.budget < c) return; S.budget -= c; ne.e.cor = 1; S.hist.push({ t: 'c', e: ne.e, c }); }
  function undo() { const h = S.hist.pop(); if (!h) return; Sfx.blip(300, .05, 'square', .05);
    if (h.t === 'z') { if (S.zones.includes(h.z)) delZone(h.z); } else if (h.t === 'u') { if (S.units.includes(h.u)) { S.budget += h.u.paid; if (h.u.k === 'mor') S.mort--; S.units = S.units.filter(q => q !== h.u); protCalc(); } }
    else if (h.t === 'g') { if (h.b.gate) { h.b.gate = h.pg || 0; h.b.hp = h.b.max = gHP(h.b.gate); S.budget += h.c; } } else if (h.t === 't') { if (S.ptracks.includes(h.tr) && !staOf(h.tr).length) delTrack(h.tr); } else if (h.t === 'b') { if (S.built.includes(h.b) && !S.units.some(u => u.b === h.b)) { S.built = S.built.filter(q => q !== h.b); S.B = S.B.filter(q => q !== h.b); S.budget += TOOL.bld.c; } } else if (h.t === 'h') { if (S.N[h.n].hold) { S.N[h.n].hold = 0; S.budget += TOOL.hold.c; } }
    else if (h.t === 'up') { if (S.units.includes(h.u) && h.u.lv > 1) { h.u.lv--; h.u.paid -= h.c; S.budget += h.c; } } else if (h.t === 'c') { if (h.e.cor) { h.e.cor = 0; S.budget += h.c; } } }

  /* ---------------- csata ---------------- */
  // zombifajták: 0 sima, 1 futó (gyors, törékeny), 2 behemót (lassú, szívós, faltörő), 3 robbanó (útzárnál felrobban)
  function setType(z, ty) { z.ty = ty; if (ty === 1) { z.sp *= 1.7; z.hpp = HPZ * .6; } else if (ty === 2) { z.sp *= .62; z.hpp = HPZ * 4; } else if (ty === 3) z.sp *= 1.15; z.hp = z.n * z.hpp; return z; }
  const rollType = () => { const r = Math.random(), m = S.m; return m >= 4 && r < .08 ? 3 : m >= 3 && r < .2 ? 2 : m >= 2 && r < .38 ? 1 : 0; };
  function wave() { const [sx, sy] = S.start, rim = S.live.filter(i => !S.prot[i] && Math.hypot(S.N[i].x - sx, S.N[i].y - sy) > S.R - 280 && S.N[i].adj.length); if (!rim.length) return; const zn = Math.max(8, Math.round(S.gmax * .4));
    for (let k = 0; k < 2 + Math.floor(S.m / 2); k++) { const n = S.N[rim[Math.floor(Math.random() * rim.length)]], a = n.adj[Math.floor(Math.random() * n.adj.length)]; if (a.e.dead || a.e.bars.length) continue; const z = agent(a.e); z.cd = 1; z.n = zn; setType(z, rollType()); S.zs.push(z); } }
  function blast(z, b) { b.hp = Math.max(0, b.hp - 34); S.fx.push({ k: 'boom', x: b.x, y: b.y, r: 30, l: .5 }); G.shake = Math.max(G.shake, 4 * G.d); Sfx.blip(90, .2, 'sawtooth', .07, .4); z.dead = 1; if (b.hp <= 0) S.broke++; }
  function soldier(x, y, o = {}) { const ne = nearEdge(x, y, 400); if (!ne) return; const a = agent(ne.e); a.s = ne.s; pos(a); Object.assign(a, { hp: 1, cd: Math.random() * .3, r: 110, ...o }); S.sol.push(a); if (S.phase === 'battle') toGate(a); return a; }
  // a katonák és rendőrök a legközelebbi ép kapu belső oldalára állnak
  function toGate(sd) { let best = null, bd = 1300; for (const z of S.zones) for (const b of z.bars) { if (!b.gate || b.hp <= 0) continue; const d0 = Math.hypot(b.x - sd.x, b.y - sd.y); if (d0 >= bd) continue; if (b.inN === undefined) { const pa = S.prot[b.e.a], pb = S.prot[b.e.b]; b.inN = pa && !pb ? b.e.a : pb && !pa ? b.e.b : -1; b.F = b.inN >= 0 ? dij([b.inN], e => wallBars(e) ? Infinity : e.len) : null; } if (b.inN < 0 || !isFinite(b.F[sd.e.a])) continue; bd = d0; best = b; } sd.gate = best; sd.posted = 0; }
  function begin() {
    saveGame(true); S.phase = 'battle'; S.speed = 1; S.tool = null; Sfx.perfect();
    for (const u of S.units.filter(u => u.k === 'c4')) { u.e.dead = 1; boom(u.x, u.y, 60, 0, false); } S.units = S.units.filter(u => u.k !== 'c4');
    const rm = (x, y) => (S.units.some(u => u.k === 'rad' && Math.hypot(u.x - x, u.y - y) < TOOL.rad.R) ? 1.3 : 1) * RUN.rng;
    for (const u of S.units) { u.rm = rm(u.x, u.y); if (u.k === 'tur') u.ammo = Math.round(TOOL.tur.ammo * (1 + .5 * ((u.lv || 1) - 1))); if (u.k === 'lift' || u.k === 'sta') u.node = nearNode(u.x, u.y); if (u.k === 'pol') for (let k = 0; k < 4; k++) soldier(u.x + (Math.random() - .5) * 60, u.y + (Math.random() - .5) * 60, { guard: 1, cop: 1 });
      if (u.k === 'mil') { const near = S.civs.map(c => [Math.hypot(c.x - u.x, c.y - u.y), c]).filter(q => q[0] < TOOL.mil.R).sort((a, b) => a[0] - b[0]); let need = 8; for (const [, c] of near) { while (need > 0 && c.n > 0) { c.n--; need--; soldier(c.x + (Math.random() - .5) * 30, c.y + (Math.random() - .5) * 30, { guard: 1, r: 90 }); } if (!c.n) c.gone = 1; if (!need) break; } S.civs = S.civs.filter(c => !c.gone); S.n0 -= 8 - need; } }
    for (const s of S.sol) if (S.units.some(u => u.k === 'med' && Math.hypot(u.x - s.x, u.y - s.y) < TOOL.med.R)) s.hp = 2;
    // kitörések a zónáktól távol
    protCalc(); const pn = S.live.filter(i => S.prot[i]).map(i => [S.N[i].x, S.N[i].y]), zc = pn.length ? pn : [[WW / 2, WH / 2]], mid = e => [(S.N[e.a].x + S.N[e.b].x) / 2, (S.N[e.a].y + S.N[e.b].y) / 2];
    const cand = S.E.filter(e => !e.dead && !e.bridge && !e.bars.length && !S.prot[e.a] && !S.prot[e.b] && (!S.hosp || Math.hypot(S.N[e.a].x - S.hosp.x, S.N[e.a].y - S.hosp.y) > 480)).map(e => { const [x, y] = mid(e); return [Math.min(...zc.map(z => Math.hypot(z[0] - x, z[1] - y))) + Math.random() * 200, e]; }).sort((a, b) => b[0] - a[0]);
    const sites = 2 + Math.min(5, Math.floor(S.m / 2)), per = 6 + 3 * S.m, zn = Math.max(8, Math.round(S.gmax * .4));
    for (let k = 0; k < sites && cand.length; k++) { const e = cand[Math.min(cand.length - 1, Math.floor(k * cand.length * .1 / sites + Math.random() * 6))][1]; const area = [e], seen = new Set([e]); for (let i = 0; i < area.length && area.length < 14; i++) for (const n of [area[i].a, area[i].b]) for (const q of S.N[n].adj) if (!seen.has(q.e) && !q.e.dead && !q.e.bars.length && !S.prot[q.n]) { seen.add(q.e); area.push(q.e); }
      for (let j = 0; j < per; j++) { const z = agent(area[Math.floor(Math.random() * area.length)]); z.cd = 1; z.n = zn; setType(z, rollType()); S.zs.push(z); } S.fx.push({ k: 'ring', x: mid(e)[0], y: mid(e)[1], l: 1.5 }); }
    for (const z of S.zones) for (const b of z.bars) b.inN = undefined; for (const tr of S.tracks) { const st = staOf(tr); if (!tr.cars.length || !st.length) continue; const hp = 140 + 30 * tr.cars.length + 220 * tr.cars.filter(k => k === 'arm').length; S.trains.push({ tr, st, p: 0, dir: 1, stop: 0, hp, max: hp, load: 0, cap: Math.round(400 * S.gmax / 20) * tr.cars.filter(k => k === 'pas').length, cd: tr.cars.map(() => Math.random()), del: new Set(), last: null }); }
    layout(); fields(); flags(); for (const sd of S.sol) toGate(sd);
  }
  function flags() { const bros = S.units.filter(u => u.k === 'bro'), lifts = S.units.filter(u => u.k === 'lift' || (u.k === 'sta' && u.tr && S.trains.some(t => t.tr === u.tr)));
    for (const c of S.civs) { c.safe = !!S.prot[sideN(c)]; if (!c.safe && !c.called && (c.e.cor || (S.cF && S.cF[c.e.a] < 420) || bros.some(u => Math.hypot(u.x - c.x, u.y - c.y) < TOOL.bro.R))) c.called = 1;
      c.lift = c.safe ? null : lifts.find(u => Math.hypot(u.x - c.x, u.y - c.y) < TOOL[u.k].R) || null; } }
  function boom(x, y, rad, pw = 0, hurtAll = true) {
    S.fx.push({ k: 'boom', x, y, r: rad, l: .5 }); G.shake = Math.max(G.shake, 6 * G.d); Sfx.blip(90, .25, 'sawtooth', .08, .4);
    const lim = pw * S.gmax / 20, inR = l => l.map(e => [Math.hypot(e.x - x, e.y - y), e]).filter(q => q[0] <= rad).sort((a, b) => a[0] - b[0]);
    let left = lim; for (const [, z] of inR(S.zs)) { if (left <= 0) break; if (z.dead) continue; const k = Math.min(left, z.n); hurtZ(z, k * z.hpp); left -= k; }
    if (hurtAll) { left = lim; for (const [, c] of inR(S.civs)) { if (left <= 0) break; const k = Math.min(left, c.n); c.n -= k; S.lost += k; left -= k; } S.civs = S.civs.filter(c => c.n > 0); S.sol = S.sol.filter(q => Math.hypot(q.x - x, q.y - y) > rad * .6); }
  }
  /* Megkerülés: a falnak ütköző horda letér az útról, és a fal mentén a legközelebbi kapuhoz, réshez vagy a fal végéhez megy. */
  function flank(z, b) {
    const zo = b.z, P = zo.poly, n = P.length; if (!zo.cum) { zo.cum = [0]; for (let i = 1; i <= n; i++) zo.cum.push(zo.cum[i - 1] + Math.hypot(P[i % n][0] - P[i - 1][0], P[i % n][1] - P[i - 1][1])); }
    const per = zo.cum[n], at = zo.cum[b.pi], opts = [], add = (i, o) => { const d0 = zo.cum[i] - at; if (zo.closed) { const f = ((d0 % per) + per) % per; opts.push(f <= per - f ? { d: f, dir: 1, i, ...o } : { d: per - f, dir: -1, i, ...o }); } else opts.push({ d: Math.abs(d0), dir: d0 >= 0 ? 1 : -1, i, ...o }); };
    for (const q of zo.bars) if (q !== b && (q.gate || q.hp <= 0)) add(q.pi, { bar: q }); if (!zo.closed) { add(0, { tip: -1 }); add(n - 1, { tip: 1 }); }
    let best = null; for (const o of opts) if (o.d > 10 && o.d < 950 && (!best || o.d - (o.bar && o.bar.hp > 0 ? 0 : 60) < best.d)) best = o; if (!best) return false;
    const A = P[b.pi], B = P[(b.pi + 1) % n], sgn = ((B[0] - A[0]) * (z.y - A[1]) - (B[1] - A[1]) * (z.x - A[0])) >= 0 ? 1 : -1, off = 13 + Math.random() * 16;
    const wp = i => { const a = P[((i % n) + n) % n], c = P[(((i + 1) % n) + n) % n], l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1; return [a[0] - (c[1] - a[1]) / l * sgn * off, a[1] + (c[0] - a[0]) / l * sgn * off]; };
    const pts = []; let last = [z.x, z.y], steps = 0; for (let i = b.pi; steps++ < n; i += best.dir) { const ii = ((i % n) + n) % n, w = wp(zo.closed || ii < n - 1 ? ii : n - 2); if (Math.hypot(w[0] - last[0], w[1] - last[1]) > 38) { pts.push(w); last = w; } if (ii === ((best.i % n) + n) % n) break; }
    if (best.bar) { const q = best.bar, w = wp(q.pi), o = P[q.pi], l = Math.hypot(w[0] - o[0], w[1] - o[1]) || 1, j = (Math.random() - .5) * 64, od = 6 + Math.random() * 30; pts.push([q.x + (w[0] - o[0]) / l * od - (w[1] - o[1]) / l * j, q.y + (w[1] - o[1]) / l * od + (w[0] - o[0]) / l * j]); z.atk = q; z.land = { e: q.e, s: q.s, dir: 1 }; }
    else { const e0 = best.tip < 0 ? P[0] : P[n - 1], e1 = best.tip < 0 ? P[1] : P[n - 2], l = Math.hypot(e0[0] - e1[0], e0[1] - e1[1]) || 1, tx = (e0[0] - e1[0]) / l, ty = (e0[1] - e1[1]) / l, nx = -ty * best.tip * -1, ny = tx * best.tip * -1, sd = ((nx * (last[0] - e0[0]) + ny * (last[1] - e0[1])) >= 0 ? 1 : -1);
      pts.push([e0[0] + tx * 26 + nx * sd * off, e0[1] + ty * 26 + ny * sd * off], [e0[0] + tx * 26 - nx * sd * 22, e0[1] + ty * 26 - ny * sd * 22], [e0[0] - tx * 30 - nx * sd * 34, e0[1] - ty * 30 - ny * sd * 34]); z.land = null; z.atk = null; }
    z.free = pts; return true;
  }
  function landZ(z) { z.free = null; z.atk = null; z.rt = 0; if (z.land) { z.e = z.land.e; z.s = z.land.s; z.dir = z.land.dir; z.land = null; } else { const ne = nearEdge(z.x, z.y, 320); if (ne) { z.e = ne.e; z.s = ne.s; } } z.off = (Math.random() - .5) * (RW - 5); z.tried = null; }
  function zGrid() { const h = new Map(); for (const z of S.zs) { const k = (z.x / 100 | 0) * 64 + (z.y / 100 | 0), l = h.get(k); if (l) l.push(z); else h.set(k, [z]); } S.zg = h; }
  function nearestZ(x, y, r, rmin = 0) { if (!S.zg) zGrid(); let b = null, bd = r * r; const x0 = Math.max(0, (x - r) / 100 | 0), x1 = (x + r) / 100 | 0, y0 = Math.max(0, (y - r) / 100 | 0), y1 = (y + r) / 100 | 0, m2 = rmin * rmin;
    for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) { const l = S.zg.get(gx * 64 + gy); if (!l) continue; for (const z of l) { if (z.dead) continue; const d2 = (z.x - x) ** 2 + (z.y - y) ** 2; if (d2 < bd && d2 >= m2) { bd = d2; b = z; } } } return b; }
  function hurtZ(z, dmg) { if (z.dead) return; z.hp -= dmg; const n1 = Math.max(0, Math.ceil(z.hp / z.hpp - 1e-6)); if (n1 < z.n) { S.kills += z.n - n1; z.n = n1; } if (!n1) z.dead = 1; }
  function shoot(x, y, z, dmg, col) { hurtZ(z, dmg * S.gmax / 20); S.fx.push({ k: 'shot', x, y, x2: z.x, y2: z.y, l: .08, col }); }
  const hashOf = list => { const h = new Map(); for (const a of list) { const k = (a.x / 24 | 0) * 512 + (a.y / 24 | 0), l = h.get(k); if (l) l.push(a); else h.set(k, [a]); } return h; };
  const grab = (h, x, y, r, ok) => { const gx = Math.floor(x / 24), gy = Math.floor(y / 24); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const l = h.get((gx + a) * 512 + gy + b); if (l) for (const o of l) if (!o.bit && Math.hypot(o.x - x, o.y - y) < r && (!ok || ok(o))) return o; } return null; };
  function tick(dt) {
    S.t += dt; if ((S.fT -= dt) <= 0) { S.fT = .5; fields(); } if ((S.cT -= dt) <= 0) { S.cT = .3; flags(); }
    if ((S.mT = (S.mT || 0) - dt) <= 0) { S.mT = 1; const by = new Map(); for (const z of S.zs) { if (z.n >= S.gmax || z.dead || z.free) continue; const l = by.get(z.e); if (l) l.push(z); else by.set(z.e, [z]); }
      for (const l of by.values()) if (l.length > 1) { l.sort((a, b) => a.s - b.s); for (let i = 1; i < l.length; i++) { const a = l[i - 1], b = l[i]; if (!a.dead && a.ty === b.ty && a.dir === b.dir && b.s - a.s < 16 && a.n + b.n <= S.gmax) { b.n += a.n; b.hp += a.hp; a.n = 0; a.dead = 1; } } } S.zs = S.zs.filter(z => !z.dead); }
    zGrid(); const mines = S.units.filter(u => u.k === 'mine'), ch = hashOf(S.civs), sh = hashOf(S.sol), zsp = Math.min(52, 34 + S.m * 2.2), born = [], hitBars = new Map(), barQ = new Map();
    for (const z of S.zs) { if (z.dead) continue; z.e.stain = Math.min(1, z.e.stain + dt * .08);
      for (const u of mines) if (!u.dead && Math.hypot(u.x - z.x, u.y - z.y) < 14) { u.dead = 1; boom(u.x, u.y, 55, 30); } if (z.dead) continue;
      if ((z.cd -= dt) <= 0) { const zc = z.free ? S.big : S.comp[sideN(z)], reach = o => S.comp[sideN(o)] === zc, v = grab(ch, z.x, z.y, 11, reach) || grab(sh, z.x, z.y, 11, reach); if (v) { z.cd = 2.2; if (v.r) { if (--v.hp > 0) continue; v.bit = 1; born.push([v, 1]); continue; } const k = Math.min(v.n, Math.ceil(z.n * .5)); v.n -= k; S.lost += k; if (!v.n) v.bit = 1; born.push([v, k]); continue; } }
      if (z.free) { if (!z.free.length) { if (z.atk && z.atk.hp > 0) { if (z.ty === 3) blast(z, z.atk); else hitBars.set(z.atk, (hitBars.get(z.atk) || 0) + z.n * (z.ty === 2 ? 3 : 1)); } else landZ(z); continue; }
        const w = z.free[0], dx = w[0] - z.x, dy = w[1] - z.y, dd = Math.hypot(dx, dy), st = zsp * z.sp * dt; if (dd <= st + 1) { z.x = w[0]; z.y = w[1]; z.free.shift(); } else { z.x += dx / dd * st; z.y += dy / dd * st; } continue; }
      { const d0 = z.dir; if (S.zF && (z.rt = (z.rt || Math.random() * .4) - dt) <= 0) { z.rt = .4; zTurn(z); } if (z.dir !== d0) z.q = null; }
      if (z.q) { if (z.q.hp > 0) { const k = barQ.get(z.q) || 0; barQ.set(z.q, k + 1); const row = Math.min(14, Math.floor(k / 3)); z.s = z.q.s - z.dir * (4 + row * 5.5); z.off = ((k % 3) - 1) * 4.6; pos(z); if (z.ty === 3) blast(z, z.q); else hitBars.set(z.q, (hitBars.get(z.q) || 0) + z.n * (z.ty === 2 ? 3 : 1)); continue; } z.q = null; }
      const r = advance(z, zsp * z.sp, dt, () => true); if (r === 'node') { const a = S.zF ? zPick(headN(z)) : pick(headN(z), null); if (a) take(z, a, headN(z)); else z.dir *= -1; }
      else if (r) { if (!r.gate && z.tried !== r) { z.tried = r; if (Math.random() < .75 && flank(z, r)) continue; } z.q = r; if (z.ty === 3) blast(z, r); else hitBars.set(r, (hitBars.get(r) || 0) + z.n * (z.ty === 2 ? 3 : 1)); } }
    for (const [b, n] of hitBars) { b.hp -= dt * .03 * Math.min(40, n * 20 / S.gmax); if (b.hp <= 0) { b.hp = 0; S.broke++; S.fx.push({ k: 'boom', x: b.x, y: b.y, r: 22, l: .4 }); Sfx.hit(); } }
    for (const u of S.units) if (u.k === 'rep') for (const z of S.zones) for (const b of z.bars) if (b.hp > 0 && b.hp < b.max && Math.hypot(b.x - u.x, b.y - u.y) < TOOL.rep.R) b.hp = Math.min(b.max, b.hp + 2 * dt);
    S.units = S.units.filter(u => !u.dead);
    if (born.length) { S.civs = S.civs.filter(c => !c.bit); S.sol = S.sol.filter(s => !s.bit); for (const [v, k] of born) { const z = agent(v.e); z.s = v.s; z.dir = v.dir; z.off = v.off; z.cd = 1.8; z.n = k; setType(z, S.m >= 2 && Math.random() < .2 ? rollType() : 0); pos(z); S.zs.push(z); } }
    // civilek
    const blockC = (e, u, v) => wallBars(e) > 0 || S.N[v].hold;
    for (const c of S.civs) { if (c.idle > 0) { c.idle -= dt; continue; }
      const n0 = headN(c), zd = S.zD ? S.zD[n0] : 1e9, panic = zd < 170;
      const r = advance(c, c.safe ? 12 : panic ? 27 : c.called || c.lift ? 30 : 16, dt, b => !b.gate); if (!r) continue; if (r !== 'node') { c.dir *= -1; continue; }
      const n = headN(c); let a = null;
      if (c.lift) { if (n === c.lift.node) { c.wait = c.lift; c.idle = .5; continue; } a = pick(n, c.lift.F, blockC); }
      else if (c.safe) { a = pick(n, null, (e, u, v) => blockC(e, u, v) || !S.prot[v]); if (!a) { c.idle = 1 + Math.random() * 2; c.dir *= -1; continue; } }
      else if (c.called && S.cF && isFinite(S.cF[n])) a = pick(n, S.cF, blockC);
      else if (panic && S.zD) a = pick(n, S.zD, blockC, true);
      else { if (Math.random() < .5) { c.idle = 1 + Math.random() * 3; c.dir *= -1; continue; } a = pick(n, null, blockC); }
      if (a) take(c, a, n); else { c.dir *= -1; c.idle = .4; } }
    // légihíd
    for (const u of S.units) if (u.k === 'lift' && (u.cd -= dt) <= 0) { const w = S.civs.filter(c => c.wait === u).slice(0, 10); u.cd = 6; if (w.length) { for (const c of w) c.gone = 1; S.civs = S.civs.filter(c => !c.gone); S.evac += cnt(w); S.fx.push({ k: 'lift', x: u.x, y: u.y, l: 1.6, n: cnt(w) }); Sfx.blip(520, .2, 'triangle', .05); } }
    // egységek
    for (const u of S.units) { const T = TOOL[u.k]; if (!T.r || (u.cd -= dt) > 0) continue; const lv = (u.lv || 1) - 1, R0 = T.r * (u.rm || 1) * (1 + .1 * lv), cdm = 1 / (1 + .3 * lv);
      if (u.k === 'mor') { const z = nearestZ(u.x, u.y, R0, T.rmin); if (z) { u.cd = T.cd * cdm; S.strikes.push({ x: z.x, y: z.y, t: .9, r: 50, pw: 28, from: [u.x, u.y] }); } continue; }
      if (u.k === 'tur' && u.ammo <= 0) continue; const z = nearestZ(u.x, u.y, R0); if (z) { u.cd = T.cd * cdm; if (u.k === 'tur') u.ammo--; shoot(u.x, u.y, z, T.dmg, u.k === 'snp' ? '255,255,255' : '255,220,120'); } }
    for (const s of S.sol) { if ((s.cd -= dt) <= 0) { s.tz = nearestZ(s.x, s.y, s.r * RUN.rng); s.cd = s.tz ? .44 : .15; if (s.tz) shoot(s.x, s.y, s.tz, 1, '255,240,150'); } if (s.tz) { if (s.tz.dead) s.tz = null; }
      else if (s.gate && !s.posted) { const b = s.gate; if (b.hp <= 0) s.gate = null; else { const r = advance(s, 42, dt, q => !q.gate); if (r === 'node') { const n = headN(s); if (n === b.inN) { const adj = S.N[n].adj.find(q => q.e === b.e); if (adj) { take(s, adj, n); s.s = b.e.a === n ? Math.max(0, b.s - 8 - Math.random() * 8) : Math.min(b.e.len, b.s + 8 + Math.random() * 8); s.off = (Math.random() - .5) * 11; s.posted = 1; s.guard = 1; pos(s); } else s.gate = null; } else { const a = pick(n, b.F, e => wallBars(e) > 0); if (a) take(s, a, n); else s.gate = null; } } else if (r) s.dir *= -1; } }
      else if (!s.guard && S.zD) { const r = advance(s, 34, dt, b => !b.gate); if (r === 'node') { const a = pick(headN(s), S.zD, (e) => wallBars(e) > 0); if (a) take(s, a, headN(s)); } else if (r) s.dir *= -1; } }
    for (const h of S.helis) { h.t -= dt; h.a += dt * 1.2; h.x = h.cx + Math.cos(h.a) * 70; h.y = h.cy + Math.sin(h.a) * 70; if ((h.cd -= dt) <= 0) { const z = nearestZ(h.x, h.y, 170); if (z) { h.cd = .125; shoot(h.x, h.y, z, 1, '255,160,90'); } } } S.helis = S.helis.filter(h => h.t > 0);
    for (const a of S.apcs) { if (a.path.length) { const T = S.N[a.path[0]], dx = T.x - a.x, dy = T.y - a.y, dd = Math.hypot(dx, dy); if (dd < 4) a.path.shift(); else { const sp = VEH[a.ty].spd; a.x += dx / dd * sp * dt; a.y += dy / dd * sp * dt; a.ang = Math.atan2(dy, dx); } }
      a.t -= dt; for (const z of S.zs) if (!z.dead && Math.hypot(z.x - a.x, z.y - a.y) < 14) { a.hp -= dt * .5 * Math.min(40, z.n * 20 / S.gmax); hurtZ(z, 5 * dt * HPZ * S.gmax / 20); } const V = VEH[a.ty]; if ((a.cd -= dt) <= 0) { const z = nearestZ(a.x, a.y, V.r * RUN.rng); if (z) { a.cd = V.cd; shoot(a.x, a.y, z, 1, '255,200,120'); } } if (V.gun && (a.gcd -= dt) <= 0) { const z = nearestZ(a.x, a.y, V.r + 50, 45); if (z) { a.gcd = V.gun; a.ang = Math.atan2(z.y - a.y, z.x - a.x); S.strikes.push({ x: z.x, y: z.y, t: .22, r: 42, pw: 20, from: [a.x, a.y] }); } } if (a.hp <= 0) { S.fx.push({ k: 'boom', x: a.x, y: a.y, r: 30, l: .5 }); if (a.u) a.u.lost = 1; if (S.sel === a) S.sel = null; } }
    S.apcs = S.apcs.filter(a => a.hp > 0 && a.t > 0);
    for (const T of S.trains) { const tr = T.tr;
      if (T.stop > 0) T.stop -= dt; else { const p0 = T.p; T.p += T.dir * 62 * dt; const u = T.st.find(q => q !== T.last && (q.tp - p0) * T.dir >= 0 && (q.tp - T.p) * T.dir <= 0);
        if (u) { T.p = u.tp; T.stop = 4; T.last = u; let room = T.cap - T.load, took = 0; for (const c of S.civs) { if (room <= 0) break; if (c.wait !== u) continue; const k = Math.min(c.n, room); c.n -= k; room -= k; took += k; } if (took) { S.civs = S.civs.filter(c => c.n > 0); T.load += took; S.evac += took; S.fx.push({ k: 'lift', x: u.x, y: u.y, l: 1.6, n: took, ic: '🚆' }); Sfx.blip(520, .2, 'triangle', .05); }
          tr.cars.forEach((k, i) => { const V = CARS[k].veh; if (V && !T.del.has(i) && u.node != null) { T.del.add(i); const n = S.N[u.node], W = VEH[V]; S.apcs.push({ ty: V, x: n.x + (Math.random() - .5) * 20, y: n.y + (Math.random() - .5) * 20, path: [], ang: 0, cd: 0, gcd: 1, hp: W.hp, max: W.hp, t: 1e9 }); S.fx.push({ k: 'ring', x: n.x, y: n.y, l: .8 }); } }); }
        else if (T.p <= 0 || T.p >= tr.len) { T.p = Math.max(0, Math.min(tr.len, T.p)); T.dir *= -1; T.load = 0; T.last = null; T.stop = 2; } }
      for (let i = -1; i < tr.cars.length; i++) { const [cx, cy] = trackPos(tr, T.p - T.dir * (i + 1) * 31), k = tr.cars[i]; const zn = nearestZ(cx, cy, 16); if (zn) { T.hp -= dt * .35 * Math.min(40, zn.n * 20 / S.gmax); hurtZ(zn, 4 * dt * HPZ * S.gmax / 20); }
        if (k === 'mg' && (T.cd[i] -= dt) <= 0) { const z = nearestZ(cx, cy, 160 * RUN.rng); if (z) { T.cd[i] = .2; shoot(cx, cy, z, 1, '255,200,120'); } else T.cd[i] = .1; }
        if (k === 'gun' && (T.cd[i] -= dt) <= 0) { const z = nearestZ(cx, cy, 280 * RUN.rng, 45); if (z) { T.cd[i] = 3; S.strikes.push({ x: z.x, y: z.y, t: .25, r: 42, pw: 24, from: [cx, cy] }); } else T.cd[i] = .3; } }
      if (T.hp <= 0) { const [bx, by] = trackPos(tr, T.p); boom(bx, by, 50, 0, false); tr.cars.length = 0; } }
    S.trains = S.trains.filter(T => T.hp > 0);
    for (const sh of S.ships) { const W = SHIP[sh.k]; if (Math.abs(sh.tp - sh.p) > 2) sh.p += Math.sign(sh.tp - sh.p) * Math.min(Math.abs(sh.tp - sh.p), 55 * dt); const q = trackPos(sh.w, sh.p); sh.x = q[0]; sh.y = q[1]; if (Math.abs(sh.tp - sh.p) > 2) sh.ang = q[2] + (sh.tp < sh.p ? Math.PI : 0);
      if ((sh.cd -= dt) <= 0) { const z = nearestZ(sh.x, sh.y, W.r * RUN.rng); if (z) { sh.cd = W.cd; shoot(sh.x, sh.y, z, 1, '200,230,255'); } else sh.cd = .1; }
      if ((sh.gcd -= dt) <= 0) { const z = nearestZ(sh.x, sh.y, W.gr * RUN.rng, 50); if (z) { sh.gcd = W.gun; S.strikes.push({ x: z.x, y: z.y, t: .35, r: W.br, pw: W.pw, from: [sh.x, sh.y] }); } else sh.gcd = .3; } }
    for (const q of S.gas) { q.t -= dt; for (const z of S.zs) if (!z.dead && Math.hypot(z.x - q.x, z.y - q.y) < q.r) hurtZ(z, z.n * z.hpp * dt / 1.5 + 1e-4);
      const c0 = cnt(S.civs); for (const c of S.civs) if (Math.hypot(c.x - q.x, c.y - q.y) < q.r) { c.hp -= .5 * dt; if (c.hp <= 0) c.gone = 1; } S.civs = S.civs.filter(c => !c.gone); S.lost += c0 - cnt(S.civs); } S.gas = S.gas.filter(q => q.t > 0);
    for (const st of S.strikes) if ((st.t -= dt) <= 0) boom(st.x, st.y, st.r, st.pw); S.strikes = S.strikes.filter(s => s.t > 0); S.zs = S.zs.filter(z => !z.dead);
    const alive = cnt(S.civs) + S.evac, need = Math.ceil(S.n0 * S.obj);
    if (alive < need) return finish(false, 'Túl kevés civil maradt életben.');
    if (S.hosp && nearestZ(S.hosp.x, S.hosp.y, 30)) return finish(false, 'A kórház elesett.');
    if (S.goal === 'hold') { if ((S.wT -= dt) <= 0) { S.wT = 12; wave(); } if (S.t >= S.holdT) finish(true); }
    else if (!S.zs.length && !S.strikes.length && S.t > 1) finish(true);
  }
  function finish(win, why) {
    const saved = cnt(S.civs) + S.evac, pct = saved / S.n0, pts = win ? Math.round(saved * .4 * S.m + S.budget + (pct > .8 ? 500 * S.m : pct > .6 ? 200 * S.m : 0)) : 0;
    const pool = UPG.slice().sort(() => Math.random() - .5).slice(0, 3);
    S.phase = 'res'; S.res = { win, why, saved, pct, pts, pool, medal: pct > .8 ? '💎 Gyémánt' : pct > .6 ? '🥇 Arany' : pct > .4 ? '🥈 Ezüst' : '🥉 Bronz' };
    if (win) { RUN.total += pts; G.score = RUN.total; hud(); Sfx.perfect(); try { if (store && G.score > store.get('best_holtvaros')) store.set('best_holtvaros', G.score); if (window.top !== window) parent.postMessage({ hgws: 'score', game: 'holtvaros', score: G.score }, location.origin); } catch (e) {} } else Sfx.hit();
  }
  // járműparancs: útvonal a kijelölt pontig (falon nem megy át, kapun igen)
  function order(a, x, y) { const tgt = nearNode(x, y), st = nearNode(a.x, a.y); if (tgt < 0 || st < 0) return; const F = dij([tgt], e => wallBars(e) ? Infinity : e.len); if (!isFinite(F[st])) return say('Oda nem vezet út.');
    const path = [st]; let cur = st, guard = 0; while (cur !== tgt && guard++ < 600) { let nb = -1, nv = Infinity; for (const q of S.N[cur].adj) if (!q.e.dead && !wallBars(q.e) && F[q.n] + q.e.len < nv) { nv = F[q.n] + q.e.len; nb = q.n; } if (nb < 0) break; path.push(nb); cur = nb; } a.path = path; S.fx.push({ k: 'ring', x: S.N[tgt].x, y: S.N[tgt].y, l: .8 }); Sfx.blip(520, .05, 'triangle', .05); }
  function vehTap(x, y) { let hit = null, hd = 20 + 14 * L.d / L.s; for (const a of S.apcs) { const d0 = Math.hypot(a.x - x, a.y - y); if (d0 < hd) { hd = d0; hit = a; } } if (hit) { S.sel = S.sel === hit ? null : hit; Sfx.blip(700, .03, 'sine', .04); } else if (S.sel) order(S.sel, x, y); }
  function callShip(k, x, y) { let best = null, bd = 1e9; for (const w of GEO.water) { if (w.w < 60 || x < w.b[0] - 400 || x > w.b[2] + 400 || y < w.b[1] - 400 || y > w.b[3] + 400) continue; for (let i = 1; i < w.p.length; i++) { const a = w.p[i - 1], b = w.p[i], [d0, t] = dseg(x, y, a[0], a[1], b[0], b[1]); if (d0 < bd) { bd = d0; best = { w, i, t }; } } }
    if (!best || bd > best.w.w / 2 + 40) { say('Hajót csak vízre hívhatsz.'); return false; } const w = best.w; if (!w.tk) w.tk = mkTrack(w.p, {}); const tp = w.tk.cum[best.i - 1] + best.t * (w.tk.cum[best.i] - w.tk.cum[best.i - 1]), from = tp > 1400 ? tp - 1400 : Math.min(w.tk.len, tp + 1400);
    S.ships.push({ k, w: w.tk, p: from, tp, x: 0, y: 0, ang: 0, cd: 0, gcd: 1 }); Sfx.blip(300, .3, 'sawtooth', .04, .5); return true; }
  function useAbil(x, y, x2, y2) {
    const a = S.abil; if (!a || S.uses[a] <= 0) return; if ((a === 'boat' || a === 'ship') && !callShip(a, x, y)) return; S.uses[a]--; S.abil = null;
    if (a === 'air') { let dx = x2 - x, dy = y2 - y, dl = Math.hypot(dx, dy); if (dl < 40) { dx = 1; dy = 0; dl = 1; x -= 120; } const len = Math.max(240, Math.min(520, dl)); for (let k = 0; k < 5; k++) S.strikes.push({ x: x + dx / dl * len * k / 4, y: y + dy / dl * len * k / 4, t: 1 + k * .16, r: 55, pw: 70, plane: k === 0 }); Sfx.blip(300, .4, 'sawtooth', .05, .5); }
    else if (a === 'mis') S.strikes.push({ x, y, t: .7, r: 95, pw: 240, mis: 1 });
    else if (a === 'gas') S.gas.push({ x, y, r: 95, t: 14 });
    else if (a === 'heli') S.helis.push({ cx: x, cy: y, x, y, a: 0, t: 25, cd: 0 });
    else if (a === 'para') { for (let k = 0; k < 5; k++) soldier(x + (Math.random() - .5) * 90, y + (Math.random() - .5) * 90, { hp: S.units.some(u => u.k === 'med' && Math.hypot(u.x - x, u.y - y) < TOOL.med.R) ? 2 : 1 }); Sfx.blip(700, .1, 'triangle', .05); }
    else if (a === 'apc') { const tgt = nearNode(x, y), F = dij([tgt], e => wallBars(e) ? Infinity : e.len); let st = -1, bv = Infinity; for (const i of S.live) { const n = S.N[i], edge = Math.min(n.x, n.y, WW - n.x, WH - n.y); if (edge < 140 && F[i] < bv) { bv = F[i]; st = i; } }
      if (st < 0) st = tgt; const path = [st]; let cur = st, guard = 0; while (cur !== tgt && guard++ < 400) { let nb = -1, nv = Infinity; for (const q of S.N[cur].adj) if (!q.e.dead && F[q.n] + q.e.len < nv && !wallBars(q.e)) { nv = F[q.n] + q.e.len; nb = q.n; } if (nb < 0) break; path.push(nb); cur = nb; }
      S.apcs.push({ ty: 'apc', x: S.N[st].x, y: S.N[st].y, path, ang: 0, cd: 0, hp: 100, max: 100, t: 45 }); }
  }

  /* ---------------- rajz ---------------- */
  /* A térkép csempékből áll (512 képpont, szintenként feleződő felbontás), igény szerint rajzolva és gyorsítótárazva. */
  const TILES = new Map(); let tUse = 0;
  let PAT = null; // 135 m-es háztömbrács stilizált képe: távolabbról ez jelzi a beépített területet
  function blockPat(x) { if (!PAT) { PAT = document.createElement('canvas'); PAT.width = PAT.height = 270; const c = PAT.getContext('2d'); c.fillStyle = '#292b31'; c.fillRect(0, 0, 270, 270); const cols = ['#b3a283', '#a39274', '#c2b091', '#998a6e'];
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 4; k++) { c.fillStyle = cols[(i * 2 + j + k) % 4]; const bx = i * 135 + 16 + (k % 2) * 54, by = j * 135 + 16 + (k >> 1) * 54; c.fillRect(bx, by, 44 + ((i + k) % 2) * 6, 42 + ((j + k) % 2) * 8); } }
    return x.createPattern(PAT, 'repeat'); }
  function tile(Lv, tx, ty) {
    const key = Lv * 1e6 + tx * 1000 + ty; let t = TILES.get(key); if (t) { t.u = ++tUse; return t.cv; }
    const cv = document.createElement('canvas'); cv.width = cv.height = 512; const x = cv.getContext('2d'), q = 1 / (1 << Lv), T = 512 << Lv, X0 = tx * T, Y0 = ty * T, X1 = X0 + T, Y1 = Y0 + T, hit = b => b[0] < X1 + 80 && b[2] > X0 - 80 && b[1] < Y1 + 80 && b[3] > Y0 - 80;
    x.fillStyle = '#131417'; x.fillRect(0, 0, 512, 512); x.scale(q, q); x.translate(-X0, -Y0); x.lineCap = 'round'; x.lineJoin = 'round';
    const fillP = (o, col) => { if (!hit(o.b)) return; x.fillStyle = col; x.beginPath(); o.p.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.fill(); };
    const urb = Lv <= 2 ? '#25272e' : Lv <= 4 ? blockPat(x) : '#4b463b';
    fillP(GEO.county, '#1d1f24'); for (const c of GEO.cities) fillP(c, c.n ? urb : '#1d1f24'); for (const u of GEO.urban) fillP(u, urb);
    x.fillStyle = urb; for (const t of S.towns) if (t.x + t.r > X0 && t.x - t.r < X1 && t.y + t.r > Y0 && t.y - t.r < Y1) { x.beginPath(); x.arc(t.x, t.y, t.r, 0, 6.283); x.fill(); }
    const ell = (h, col, pad) => { if (h[0] + h[2] + pad < X0 || h[0] - h[2] - pad > X1 || h[1] + h[3] + pad < Y0 || h[1] - h[3] - pad > Y1) return; x.fillStyle = col; x.beginPath(); x.ellipse(h[0], h[1], h[2] + pad, h[3] + pad, 0, 0, 6.283); x.fill(); };
    for (const h of MD.woods) ell(h, 'rgba(44,92,50,.45)', 0); for (const h of MD.parks) ell(h, '#2b4a2c', 55);
    const poly = (p, w, col) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); p.forEach((v, i) => i ? x.lineTo(v[0], v[1]) : x.moveTo(v[0], v[1])); x.stroke(); };
    for (const w of GEO.water) if (hit(w.b)) poly(w.p, Math.max(w.w + 14, 2 / q), '#3d8fd6'); for (const w of GEO.water) if (hit(w.b)) poly(w.p, Math.max(w.w, 1.4 / q), '#1f63b0'); if (Lv <= 3) for (const w of GEO.water) if (hit(w.b) && w.w > 30) poly(w.p, w.w * .5, '#1a4f97');
    for (const h of MD.parks) ell(h, '#3f7a3c', 0);
    if (Lv <= 5) { x.setLineDash([14 / Math.min(1, q * 4), 10 / Math.min(1, q * 4)]); for (const r of GEO.rails) poly(r, Math.max(3, 1 / q), 'rgba(20,16,22,.75)'); x.setLineDash([]); }
    const es = new Set(), bs = [], det = Lv <= 2, gc = det ? 512 : 4096, EGr = det ? S.EG : S.SG; if (det) S.ensure(X0 - 140, Y0 - 140, X1 + 140, Y1 + 140);
    for (let gx = Math.floor((X0 - 60) / gc); gx <= Math.floor((X1 + 60) / gc); gx++) for (let gy = Math.floor((Y0 - 60) / gc); gy <= Math.floor((Y1 + 60) / gc); gy++) { const l = EGr.get(gx * 4096 + gy); if (l) for (const e of l) es.add(e); if (det) { const l2 = S.BG.get(gx * 4096 + gy); if (l2) bs.push(l2.slice().sort((a, b) => a.y - b.y)); } }
    const line = (e, w, col) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.moveTo(S.N[e.a].x, S.N[e.a].y); x.lineTo(S.N[e.b].x, S.N[e.b].y); x.stroke(); };
    const wd = e => e.hw ? Math.max(RW + 3 + e.hw * 3, (e.hw > 1 ? 2.2 : 1.3) / q) : e.big ? Math.max(RW + 5, 1 / q) : RW, show = e => Lv <= 2 || (e.hw && (Lv <= 5 || e.hw > 1)) || (e.big && Lv <= 4);
    if (Lv <= 3) for (const e of es) if (show(e)) line(e, wd(e) + 4, '#0d0e11');
    for (const e of es) if (show(e)) line(e, wd(e), e.bridge ? '#8d9199' : e.hw > 2 ? '#6b6f78' : e.hw ? '#555962' : e.big ? '#444851' : '#383b43');
    if (Lv <= 1) { x.setLineDash([8, 10]); for (const e of es) if (e.big) line(e, 1.2, 'rgba(255,255,255,.2)'); x.setLineDash([]); }
    for (const l of bs) for (const b of l) { const ox = -b.h * .25, oy = -b.h * .62, cr = 172 + Math.floor(b.sh * 34), cg = 155 + Math.floor(b.sh * 32), cb = 124 + Math.floor(b.sh * 28), sh = k => `rgb(${Math.round(cr * k)},${Math.round(cg * k)},${Math.round(cb * k)})`;
      if (Lv === 0) { x.fillStyle = 'rgba(0,0,0,.34)'; x.beginPath(); b.poly.forEach((p, i) => i ? x.lineTo(p[0] + b.h * .3, p[1] + b.h * .25) : x.moveTo(p[0] + b.h * .3, p[1] + b.h * .25)); x.fill(); }
      if (Lv <= 1) for (let i = 0; i < 4; i++) { const p = b.poly[i], q2 = b.poly[(i + 1) % 4]; x.fillStyle = i % 2 ? sh(.55) : sh(.72); x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(q2[0], q2[1]); x.lineTo(q2[0] + ox, q2[1] + oy); x.lineTo(p[0] + ox, p[1] + oy); x.fill(); }
      x.fillStyle = sh(1); x.beginPath(); b.poly.forEach((p, i) => i ? x.lineTo(p[0] + ox, p[1] + oy) : x.moveTo(p[0] + ox, p[1] + oy)); x.closePath(); x.fill(); if (Lv === 0) { x.strokeStyle = 'rgba(255,248,225,.3)'; x.lineWidth = .8; x.stroke(); } }
    x.setLineDash([18 / q, 12 / q]); poly([...GEO.county.p, GEO.county.p[0]], 2 / q, 'rgba(255,226,154,.3)'); x.setLineDash([]);
    TILES.set(key, { cv, u: ++tUse }); if (TILES.size > 90) { const old = [...TILES.entries()].sort((a, b) => a[1].u - b[1].u).slice(0, 30); for (const [k] of old) TILES.delete(k); }
    return cv;
  }
  function draw(g, t) {
    if (!S) return; if (!L || L.W !== G.W || L.H !== G.H) layout(); if (!MAP) MAP = {};
    const d = L.d, s = L.s, X = v => L.ox + v * s, Y = v => L.oy + v * s; g.fillStyle = '#0c0a10'; g.fillRect(-20, -20, G.W + 40, G.H + 40);
    g.save(); g.beginPath(); g.rect(0, L.top - 4 * d, G.W, L.vh + 8 * d); g.clip();
    { // a látható térképrészlet képernyőméretű gyorsítótárba kerül, és csak kameramozgáskor rajzolódik újra
      const key = s + '|' + L.ox + '|' + L.oy + '|' + G.W + '|' + L.vh + '|' + (S.start ? S.R + '|' + S.start : ''), vh = Math.ceil(L.vh + 8 * d), y0 = Math.floor(L.top - 4 * d);
      if (!MAP.view) MAP.view = document.createElement('canvas'); const vc = MAP.view;
      if (MAP.key !== key) { MAP.key = key; if (vc.width !== G.W || vc.height !== vh) { vc.width = G.W; vc.height = vh; } const x = vc.getContext('2d'); x.fillStyle = '#0c0a10'; x.fillRect(0, 0, G.W, vh);
        const Lv = Math.max(0, Math.min(9, Math.floor(Math.log2(1 / s) + 1e-6))), T = 512 << Lv, wx0 = Math.max(0, -L.ox / s), wy0 = Math.max(0, (y0 - L.oy) / s), wx1 = Math.min(WW, (G.W - L.ox) / s), wy1 = Math.min(WH, (y0 + vh - L.oy) / s);
        x.imageSmoothingEnabled = true; for (let tx = Math.floor(wx0 / T); tx * T < wx1; tx++) for (let ty = Math.floor(wy0 / T); ty * T < wy1; ty++) x.drawImage(tile(Lv, tx, ty), Math.floor(L.ox + tx * T * s), Math.floor(L.oy + ty * T * s - y0), Math.ceil(T * s) + 1, Math.ceil(T * s) + 1);
        { const sun = x.createLinearGradient(0, 0, G.W, vh); sun.addColorStop(0, 'rgba(120,170,255,.05)'); sun.addColorStop(1, 'rgba(0,0,30,.14)'); x.fillStyle = sun; x.fillRect(0, 0, G.W, vh); }
        // feliratok: nagyítástól függően települések, városrészek, nevezetes helyek
        x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; const used = [], txt = (t, wx, wy, px, col, bold) => { const sx = L.ox + wx * s, sy = L.oy + wy * s - y0; if (sx < -60 || sy < -10 || sx > G.W + 60 || sy > vh + 10) return; x.font = `${bold ? 800 : 600} ${px * d}px Inter, sans-serif`; const hw = x.measureText(t).width / 2 + 4 * d, hh = px * d * .7; if (used.some(u => Math.abs(u[0] - sx) < u[2] + hw && Math.abs(u[1] - sy) < u[3] + hh)) return; used.push([sx, sy, hw, hh]); x.strokeStyle = 'rgba(0,0,0,.65)'; x.lineWidth = 3 * d; x.strokeText(t, sx, sy); x.fillStyle = col; x.fillText(t, sx, sy); };
        const sd = s / d * (MD.K / 180), thr = sd < .035 ? 15 : sd < .07 ? 7 : sd < .15 ? 2.4 : 0; if (sd < .12) txt(MD.cap[0], MD.cap[1], MD.cap[2], 15, '#ffe29a', 1);
        for (const t of S.townsByPop) if (t.pop >= thr) txt(t.n, t.x, t.y, t.pop > 25 ? 12 : t.pop > 8 ? 11 : 10, 'rgba(255,255,255,.85)');
        if (sd >= .12) for (const l of S.labels) if (l[3] > 20 ? sd < 4 : sd > .3) txt(l[2], l[0], l[1], l[3] > 20 ? 13 : 10, l[3] > 20 ? 'rgba(255,226,154,.75)' : 'rgba(255,255,255,.7)', l[3] > 20);
        if (S.start) { x.fillStyle = 'rgba(9,7,13,.5)'; x.beginPath(); x.rect(0, 0, G.W, vh); x.arc(X(S.start[0]), Y(S.start[1]) - y0, S.R * s, 0, 6.283); x.fill('evenodd'); } }
      g.drawImage(vc, 0, y0); }
    g.lineCap = 'round'; g.lineJoin = 'round';
    const ln = (e, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(X(S.N[e.a].x), Y(S.N[e.a].y)); g.lineTo(X(S.N[e.b].x), Y(S.N[e.b].y)); g.stroke(); };
    for (const e of S.E) { if (e.dead) { ln(e, (RW + 10) * s, '#1f63b0'); g.setLineDash([6 * s, 8 * s]); ln(e, 2.5 * s, 'rgba(255,120,90,.7)'); g.setLineDash([]); continue; } if (e.stain > .02) ln(e, (RW + 7) * s, `rgba(60,255,90,${e.stain * .42})`); if (e.cor) { g.setLineDash([10 * s, 8 * s]); g.lineDashOffset = -t * 30 * s; ln(e, 4 * s, 'rgba(108,198,255,.9)'); g.setLineDash([]); } }
    if (S.prot) for (const e of S.E) if (!e.dead && (S.prot[e.a] || S.prot[e.b])) { g.strokeStyle = 'rgba(108,198,255,.3)'; g.lineWidth = (RW + 4) * s; g.beginPath(); let ax = S.N[e.a].x, ay = S.N[e.a].y, bx = S.N[e.b].x, by = S.N[e.b].y; const lb = e.bars.find(b => b.hp > 0); if (lb) { if (S.prot[e.a]) { bx = lb.x; by = lb.y; } else { ax = lb.x; ay = lb.y; } } g.moveTo(X(ax), Y(ay)); g.lineTo(X(bx), Y(by)); g.stroke(); }
    for (const z of S.zones) { g.beginPath(); z.poly.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); if (z.closed) g.closePath(); g.strokeStyle = '#141018'; g.lineWidth = 7 * s; g.stroke(); g.strokeStyle = '#e8b656'; g.lineWidth = 4 * s; g.stroke();
      for (const b of z.bars) { const k = b.hp / b.max, EA = S.N[b.e.a], EB = S.N[b.e.b], ang = Math.atan2(EB.y - EA.y, EB.x - EA.x); g.save(); g.translate(X(b.x), Y(b.y)); g.rotate(ang);
        if (b.hp <= 0) { g.fillStyle = '#3a1512'; g.fillRect(-4 * s, -(RW / 2 + 5) * s, 8 * s, (RW + 10) * s); g.fillStyle = '#7a2a1c'; for (let j = -1; j <= 1; j++) g.fillRect((-2 + j * 2.5) * s, (j * 6 - 2) * s, 3.5 * s, 3.5 * s); g.restore(); continue; }
        if (b.gate) { const big = b.gate === 2, hw = (RW / 2 + (big ? 13 : 7)) * s; if (big) g.scale(1.45, 1); g.fillStyle = '#141018'; g.fillRect(-6.5 * s, -hw - 1.5 * s, 13 * s, hw * 2 + 3 * s); g.fillStyle = '#eafff0'; g.fillRect(-5 * s, -hw, 10 * s, hw * 2); g.fillStyle = big ? '#2f7fd6' : '#19b34d'; g.fillRect(-3.5 * s, -hw + 1.5 * s, 7 * s, hw - 2.2 * s); g.fillRect(-3.5 * s, .7 * s, 7 * s, hw - 2.2 * s); g.fillStyle = '#eafff0'; g.fillRect(-7.5 * s, -hw - 2 * s, 15 * s, 3.5 * s); g.fillRect(-7.5 * s, hw - 1.5 * s, 15 * s, 3.5 * s); }
        else { const hw = (RW / 2 + 4) * s; g.fillStyle = '#141018'; g.fillRect(-5 * s, -hw - 1.2 * s, 10 * s, hw * 2 + 2.4 * s); g.fillStyle = '#a8662a'; g.fillRect(-3.8 * s, -hw, 7.6 * s, hw * 2); g.fillStyle = '#6e3f17'; for (let j = -2; j <= 2; j++) g.fillRect(-3.8 * s, (j * hw / 2.5) - .5 * s, 7.6 * s, 1 * s); }
        g.restore(); if (b.gate && s > .5 * d) { g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${Math.min(15 * d, 13 * s) * (b.gate === 2 ? 1.25 : 1)}px sans-serif`; g.fillText(b.gate === 2 ? '🏰' : '🚪', X(b.x), Y(b.y) - (RW + 12) * s); }
        if (k < 1) { g.fillStyle = '#c0392b'; g.fillRect(X(b.x) - 9 * s, Y(b.y) + (RW / 2 + 9) * s, 18 * s, 3 * s); g.fillStyle = '#7dff4a'; g.fillRect(X(b.x) - 9 * s, Y(b.y) + (RW / 2 + 9) * s, 18 * s * k, 3 * s); } } }
    if (S.draw) { g.strokeStyle = S.draw.k === 'air' ? '#ff8a7a' : '#ffe29a'; g.lineWidth = 3 * d; g.setLineDash([6 * d, 5 * d]); g.beginPath(); S.draw.pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); g.stroke(); g.setLineDash([]);
      if ((S.draw.k === 'zone' || S.draw.k === 'rail') && S.draw.pts.length > 1) { const P0 = S.draw.pts; let per = 0; for (let i = 1; i < P0.length; i++) per += Math.hypot(P0[i][0] - P0[i - 1][0], P0[i][1] - P0[i - 1][1]); const c = Math.round(per * (S.draw.k === 'rail' ? .12 : .22)), q = P0[P0.length - 1], tx = (S.draw.k === 'rail' ? '🛤️ ' : '🧱 ') + c; g.font = `800 ${13 * d}px Inter, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; const tw = g.measureText(tx).width + 14 * d; g.fillStyle = 'rgba(4,7,14,.9)'; rr(X(q[0]) - tw / 2, Y(q[1]) - 40 * d, tw, 22 * d, 11 * d); g.fill(); g.fillStyle = c > S.budget ? '#ff8a7a' : '#7dff4a'; g.fillText(tx, X(q[0]), Y(q[1]) - 29 * d); } }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const i of S.live) if (S.N[i].hold) { g.font = `${18 * s + 6}px sans-serif`; g.fillText('⛔', X(S.N[i].x), Y(S.N[i].y)); }
    for (const q of S.gas) { const k = Math.min(1, q.t / 3); g.fillStyle = `rgba(170,230,60,${.28 * k})`; for (let j = 0; j < 5; j++) { g.beginPath(); g.arc(X(q.x + Math.cos(j * 1.3 + t) * q.r * .35), Y(q.y + Math.sin(j * 1.7 + t * .8) * q.r * .35), q.r * .7 * s, 0, 6.283); g.fill(); } }
    // egységek
    for (const tr of S.tracks) { const path = () => { g.beginPath(); tr.pts.forEach((q, i) => i ? g.lineTo(X(q[0]), Y(q[1])) : g.moveTo(X(q[0]), Y(q[1]))); }; g.lineCap = 'butt'; path(); g.strokeStyle = '#0d0e11'; g.lineWidth = 9 * s; g.stroke(); g.setLineDash([2.5 * s, 4 * s]); path(); g.strokeStyle = '#6b5a45'; g.lineWidth = 7.5 * s; g.stroke(); g.setLineDash([]); path(); g.strokeStyle = tr.real ? '#9aa0aa' : '#d7dbe2'; g.lineWidth = Math.max(1, 1.2 * s); g.save(); g.translate(0, 0); g.stroke(); g.restore(); g.lineCap = 'round'; }
    for (const b of S.built) { const ox = -b.h * .25 * s, oy = -b.h * .62 * s; g.fillStyle = '#6f7f52'; g.beginPath(); b.poly.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); g.closePath(); g.fill(); g.fillStyle = '#a9b97a'; g.strokeStyle = '#141018'; g.lineWidth = Math.max(1, 1.2 * s); g.beginPath(); b.poly.forEach((p, i) => i ? g.lineTo(X(p[0]) + ox, Y(p[1]) + oy) : g.moveTo(X(p[0]) + ox, Y(p[1]) + oy)); g.closePath(); g.fill(); g.stroke(); }
    for (const u of S.units) { const T = TOOL[u.k], r = (u.k === 'mine' ? 5 : 11) * Math.max(s, .55 * d); if (T.veh && S.phase !== 'plan') continue; g.fillStyle = u.k === 'mine' ? '#c0392b' : u.k === 'c4' ? '#e67e22' : T.tab === 1 ? '#10283a' : '#141018'; g.beginPath(); g.arc(X(u.x), Y(u.y), r, 0, 6.283); g.fill();
      if (u.k !== 'mine') { g.strokeStyle = u.k === 'tur' && u.ammo <= 0 ? '#666' : T.tab === 1 ? '#6cc6ff' : '#ffe29a'; g.lineWidth = Math.max(1.5, 2 * s); g.stroke(); g.font = `${r * 1.25}px sans-serif`; g.fillText(T.ic, X(u.x), Y(u.y) + 1); if (u.lv > 1) { g.font = `${r * .8}px sans-serif`; g.fillStyle = '#ffd84a'; g.fillText('★'.repeat(u.lv - 1), X(u.x), Y(u.y) - r * 1.25); } } }
    if (S.hosp) { const hx = X(S.hosp.x), hy = Y(S.hosp.y), r = Math.max(13 * d, 16 * s); g.strokeStyle = `rgba(255,90,90,${.55 + .35 * Math.sin(t * 4)})`; g.lineWidth = 2.5 * d; g.beginPath(); g.arc(hx, hy, r * 1.25, 0, 6.283); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(hx, hy, r * .9, 0, 6.283); g.fill(); g.font = `${r * 1.2}px sans-serif`; g.fillText('🏥', hx, hy + 1); }
    // hatótáv
    if (S.hover) { const [hx, hy] = S.hover; let u = null, ud = 22; for (const q of S.units) { const dd = Math.hypot(q.x - hx, q.y - hy); if (dd < ud) { ud = dd; u = q; } } const T = u ? TOOL[u.k] : S.phase === 'plan' ? TOOL[S.tool] : null, cx = u ? u.x : hx, cy = u ? u.y : hy, R0 = T && (T.r ? T.r * RUN.rng * (u && u.rm ? u.rm / RUN.rng : 1) : T.R);
      if (R0) { g.strokeStyle = T.r ? 'rgba(255,226,154,.7)' : 'rgba(108,198,255,.7)'; g.lineWidth = 1.5 * d; g.beginPath(); g.arc(X(cx), Y(cy), R0 * s, 0, 6.283); g.stroke(); g.fillStyle = T.r ? 'rgba(255,226,154,.06)' : 'rgba(108,198,255,.06)'; g.fill(); if (T.rmin) { g.beginPath(); g.arc(X(cx), Y(cy), T.rmin * s, 0, 6.283); g.stroke(); } }
      if (S.phase === 'battle' && S.abil && S.abil !== 'air') { g.strokeStyle = '#ff8a7a'; g.lineWidth = 2 * d; g.beginPath(); g.arc(X(hx), Y(hy), ({ mis: 95, gas: 95, heli: 170, para: 60, apc: 30, boat: 210, ship: 560 })[S.abil] * s, 0, 6.283); g.stroke(); } }
    // emberek, zombik
    const rs = Math.max(1.6 * d, 2.6 * s);
    const vx0 = -L.ox / s - 8, vx1 = (G.W - L.ox) / s + 8, vy0 = (L.top - L.oy) / s - 8, vy1 = (L.top + L.vh - L.oy) / s + 8, vis = a => a.x > vx0 && a.x < vx1 && a.y > vy0 && a.y < vy1;
    for (const [col, f] of [['#f3f5f8', c => !c.safe && !c.wait], ['#9fd6f5', c => c.safe], ['#ffd84a', c => !c.safe && c.wait]]) { g.fillStyle = col; g.beginPath(); for (const c of S.civs) if (f(c) && vis(c)) { const w = rs * (.55 + .3 * Math.sqrt(c.n)); g.rect(X(c.x) - w / 2, Y(c.y) - w / 2, w, w); } g.fill(); }
    g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(50,255,80,.16)'; g.beginPath(); for (const z of S.zs) if (vis(z)) { const w = rs * (.7 + .33 * Math.sqrt(z.n)) * 2.6; g.rect(X(z.x) - w / 2, Y(z.y) - w / 2, w, w); } g.fill(); g.globalCompositeOperation = 'source-over';
    for (let ty = 0; ty < 4; ty++) { g.fillStyle = ['#7dff4a', '#e6ff3a', '#1f8f3c', '#ff8c2a'][ty]; g.beginPath(); for (const z of S.zs) if (z.ty === ty && vis(z)) { const w = rs * (.7 + .33 * Math.sqrt(z.n)) * (ty === 2 ? 1.45 : 1); g.rect(X(z.x) - w / 2, Y(z.y) - w / 2, w, w); } g.fill(); if (ty === 2) { g.strokeStyle = '#0c2a12'; g.lineWidth = Math.max(1, s); g.stroke(); } }
    for (const q of S.sol) { g.fillStyle = q.cop ? '#5aa0ff' : '#ffd84a'; g.beginPath(); g.arc(X(q.x), Y(q.y), rs * .9, 0, 6.283); g.fill(); g.strokeStyle = '#141018'; g.lineWidth = 1; g.stroke(); }
    for (const a of S.apcs) { const V = VEH[a.ty], k = V.sz * Math.max(s, .5 * d), hx = X(a.x), hy = Y(a.y);
      if (S.sel === a) { g.strokeStyle = '#ffe29a'; g.lineWidth = 2 * d; g.beginPath(); g.arc(hx, hy, 17 * k + 4 * d, 0, 6.283); g.stroke(); if (a.path.length) { g.setLineDash([6 * d, 5 * d]); g.strokeStyle = 'rgba(255,226,154,.8)'; g.beginPath(); g.moveTo(hx, hy); for (const n of a.path) g.lineTo(X(S.N[n].x), Y(S.N[n].y)); g.stroke(); g.setLineDash([]); } }
      g.save(); g.translate(hx, hy); g.rotate(a.ang); g.fillStyle = '#141018'; rr(-12 * k, -7.5 * k, 24 * k, 15 * k, 3 * k); g.fill(); g.fillStyle = V.col; rr(-10.5 * k, -6 * k, 21 * k, 12 * k, 2.5 * k); g.fill();
      if (a.ty === 'tank') { g.fillStyle = '#2b3324'; g.fillRect(-10.5 * k, -7.5 * k, 21 * k, 2.6 * k); g.fillRect(-10.5 * k, 4.9 * k, 21 * k, 2.6 * k); g.fillStyle = '#5c6b49'; g.beginPath(); g.arc(-1 * k, 0, 4.6 * k, 0, 6.283); g.fill(); g.fillStyle = '#20261a'; g.fillRect(2 * k, -1.2 * k, 14 * k, 2.4 * k); }
      else { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(2 * k, -4.5 * k, 5 * k, 9 * k); g.fillStyle = '#20261a'; g.fillRect(-2 * k, -.9 * k, 9 * k, 1.8 * k); } g.restore();
      if (a.hp < a.max) { g.fillStyle = '#c0392b'; g.fillRect(hx - 12 * k, hy - 13 * k, 24 * k, 2.6 * k); g.fillStyle = '#7dff4a'; g.fillRect(hx - 12 * k, hy - 13 * k, 24 * k * Math.max(0, a.hp / a.max), 2.6 * k); } }
    g.strokeStyle = 'rgba(255,225,130,.8)'; g.lineWidth = Math.max(1, d); g.beginPath(); for (const f of S.fx) if (f.k === 'shot') { g.moveTo(X(f.x), Y(f.y)); g.lineTo(X(f.x2), Y(f.y2)); } g.stroke();
    for (const f of S.fx) { if (f.k === 'shot') continue;
      if (f.k === 'boom') { const k = 1 - f.l / .5; g.fillStyle = `rgba(255,${180 - k * 120},60,${.75 * (1 - k)})`; g.beginPath(); g.arc(X(f.x), Y(f.y), f.r * s * (.4 + k * .7), 0, 6.283); g.fill(); }
      else if (f.k === 'ring') { const k = 1 - f.l / 1.5; g.strokeStyle = `rgba(125,255,74,${1 - k})`; g.lineWidth = 3 * d; g.beginPath(); g.arc(X(f.x), Y(f.y), (30 + k * 160) * s, 0, 6.283); g.stroke(); }
      else if (f.k === 'lift') { const k = 1 - f.l / 1.6; g.font = `${22 * d}px sans-serif`; g.fillText(f.ic || '🚁', X(f.x), Y(f.y) - k * 50 * d); g.font = `800 ${12 * d}px Inter, sans-serif`; g.fillStyle = '#ffd84a'; g.fillText('+' + f.n, X(f.x) + 22 * d, Y(f.y) - k * 50 * d); } }
    for (const q of S.strikes) { g.strokeStyle = 'rgba(255,90,70,.9)'; g.lineWidth = 2 * d; g.beginPath(); g.arc(X(q.x), Y(q.y), q.r * s, 0, 6.283); g.stroke();
      if (q.plane) { g.font = `${26 * d}px sans-serif`; g.save(); g.translate(X(q.x) + (q.t - .2) * G.W * .8, Y(q.y) - 30 * d); g.scale(-1, 1); g.fillText('✈️', 0, 0); g.restore(); }
      else if (q.mis) { g.font = `${22 * d}px sans-serif`; g.fillText('🚀', X(q.x) + q.t * 240 * d, Y(q.y) - q.t * 240 * d); }
      else if (q.from) { const k = 1 - q.t / .9; g.fillStyle = '#ffb347'; g.beginPath(); g.arc(X(q.from[0] + (q.x - q.from[0]) * k), Y(q.from[1] + (q.y - q.from[1]) * k) - Math.sin(k * Math.PI) * 40 * d, 3 * d, 0, 6.283); g.fill(); } }
    for (const T of S.trains) { const tr = T.tr; for (let i = tr.cars.length - 1; i >= -1; i--) { const [cx, cy, ca] = trackPos(tr, T.p - T.dir * (i + 1) * 31), k = tr.cars[i], kk = Math.max(s, .45 * d) * 1.35; g.save(); g.translate(X(cx), Y(cy)); g.rotate(ca); g.fillStyle = '#0d0e11'; rr(-11 * kk, -5.5 * kk, 22 * kk, 11 * kk, 2 * kk); g.fill(); g.fillStyle = i < 0 ? '#b03a2e' : CARS[k].col; rr(-10 * kk, -4.5 * kk, 20 * kk, 9 * kk, 1.5 * kk); g.fill();
          if (i < 0) { g.fillStyle = '#2b2b2b'; g.fillRect(-8 * kk, -3 * kk, 5 * kk, 6 * kk); } else if (k === 'mg' || k === 'gun') { g.fillStyle = '#20261a'; g.beginPath(); g.arc(0, 0, (k === 'gun' ? 3.6 : 2.6) * kk, 0, 6.283); g.fill(); } else if (CARS[k].veh && !T.del.has(i)) { g.fillStyle = VEH[CARS[k].veh].col; g.fillRect(-6 * kk, -3 * kk, 12 * kk, 6 * kk); } else if (k === 'pas') { g.fillStyle = 'rgba(255,255,255,.55)'; for (let j = -2; j <= 2; j++) g.fillRect(j * 3.6 * kk - 1 * kk, -3.2 * kk, 2 * kk, 1.6 * kk); } g.restore(); }
      const [lx, ly] = trackPos(tr, T.p), kk = Math.max(s, .45 * d); if (T.hp < T.max) { g.fillStyle = '#c0392b'; g.fillRect(X(lx) - 12 * kk, Y(ly) - 11 * kk, 24 * kk, 2.6 * kk); g.fillStyle = '#7dff4a'; g.fillRect(X(lx) - 12 * kk, Y(ly) - 11 * kk, 24 * kk * Math.max(0, T.hp / T.max), 2.6 * kk); } }
    for (const sh of S.ships) { const W = SHIP[sh.k], kk = Math.max(s, .4 * d) * W.len / 30, moving = Math.abs(sh.tp - sh.p) > 2; g.save(); g.translate(X(sh.x), Y(sh.y)); g.rotate(sh.ang); if (moving) { g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.moveTo(-15 * kk, 0); g.lineTo(-34 * kk, -7 * kk); g.lineTo(-34 * kk, 7 * kk); g.fill(); }
      g.fillStyle = '#0d0e11'; g.beginPath(); g.moveTo(17 * kk, 0); g.lineTo(9 * kk, -6.5 * kk); g.lineTo(-15 * kk, -6.5 * kk); g.lineTo(-15 * kk, 6.5 * kk); g.lineTo(9 * kk, 6.5 * kk); g.closePath(); g.fill(); g.fillStyle = sh.k === 'ship' ? '#7f8a96' : '#9aa5b0'; g.beginPath(); g.moveTo(15 * kk, 0); g.lineTo(8 * kk, -5 * kk); g.lineTo(-13.5 * kk, -5 * kk); g.lineTo(-13.5 * kk, 5 * kk); g.lineTo(8 * kk, 5 * kk); g.closePath(); g.fill();
      g.fillStyle = '#4d5661'; g.fillRect(-7 * kk, -2.8 * kk, 9 * kk, 5.6 * kk); g.fillStyle = '#20262d'; g.fillRect(4 * kk, -.8 * kk, 8 * kk, 1.6 * kk); if (sh.k === 'ship') g.fillRect(-13 * kk, -.8 * kk, 6 * kk, 1.6 * kk); g.restore(); }
    for (const h of S.helis) { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(X(h.x) + 6 * d, Y(h.y) + 10 * d, 12 * d, 5 * d, 0, 0, 6.283); g.fill(); g.font = `${24 * d}px sans-serif`; g.fillText('🚁', X(h.x), Y(h.y)); }
    if (!S.start && S.hover) { g.strokeStyle = '#ffe29a'; g.lineWidth = 2 * d; g.setLineDash([8 * d, 6 * d]); g.beginPath(); g.arc(X(S.hover[0]), Y(S.hover[1]), R_START * s, 0, 6.283); g.stroke(); g.setLineDash([]); g.fillStyle = 'rgba(255,226,154,.08)'; g.fill(); }
    g.restore();
    // felső sáv
    const prot = S.civs.reduce((a, c) => a + (c.safe ? c.n : 0), 0), alive = cnt(S.civs) + S.evac;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 ${15 * d}px Inter, sans-serif`; g.fillStyle = '#ffe29a'; g.fillText(`${S.m}. küldetés · ${S.name}`, G.W / 2, 66 * d);
    g.font = `600 ${12 * d}px Inter, sans-serif`; g.fillStyle = 'rgba(255,255,255,.85)';
    g.fillText(S.phase === 'pick' ? 'Válaszd ki, honnan indulsz – koppints a térképre' : S.phase === 'plan' ? `💰 ${S.budget}   👥 ${alive} civil   🎯 cél: ${Math.round(S.obj * 100)}% életben${S.goal === 'hold' ? ' · ⏱ tarts ki ' + mmss(S.holdT) : S.goal === 'hosp' ? ' · 🏥 védd a kórházat' : ''}` : `👥 ${alive}/${S.n0} (${Math.round(alive / S.n0 * 100)}%, cél ${Math.round(S.obj * 100)}%)   🛡 ${prot}${S.evac ? '   🚁 ' + S.evac : ''}   🧟 ${cnt(S.zs)}${S.goal === 'hold' ? '   ⏱ ' + mmss(Math.max(0, S.holdT - S.t)) : S.goal === 'hosp' ? '   🏥' : ''}`, G.W / 2, 84 * d, G.W - 16 * d);
    if (S.start && (S.phase === 'plan' || S.phase === 'battle')) drawMini(g);
    for (const b of sideBtns()) { g.fillStyle = 'rgba(8,12,22,.88)'; g.strokeStyle = 'rgba(255,226,154,.5)'; g.lineWidth = 1.5 * d; rr(b.x, b.y, b.w, b.h, 9 * d); g.fill(); g.stroke(); g.font = `${17 * d}px sans-serif`; g.fillStyle = '#fff'; g.fillText(b.ic, b.x + b.w / 2, b.y + b.h / 2 + 1); }
    // alsó sáv
    g.fillStyle = 'rgba(10,8,14,.97)'; g.fillRect(0, L.barY, G.W, L.barH); g.fillStyle = 'rgba(125,255,74,.35)'; g.fillRect(0, L.barY, G.W, d);
    for (const tb of L.tabs) { const on = tb.map ? MD.id === tb.k : S.tab === tb.k; g.fillStyle = on ? 'rgba(232,182,86,.9)' : 'rgba(255,255,255,.07)'; rr(tb.x, tb.y, tb.w, tb.h, tb.h / 2); g.fill(); g.fillStyle = on ? '#1a1004' : '#fff'; g.font = `700 ${Math.min(11, tb.w / d / 9) * d}px Inter, sans-serif`; g.fillText(tb.n, tb.x + tb.w / 2, tb.y + tb.h / 2 + 1, tb.w - 12 * d); }
    if (L.go) { g.fillStyle = '#7dff4a'; rr(L.go.x, L.go.y, L.go.w, L.go.h, L.go.h / 2); g.fill(); g.fillStyle = '#0b1a05'; g.font = `800 ${12 * d}px Inter, sans-serif`; g.fillText('▶ INDÍTÁS', L.go.x + L.go.w / 2, L.go.y + L.go.h / 2 + 1); }
    for (const it of L.its) { const sel = (it.kind === 'tool' && S.tool === it.k) || (it.kind === 'abil' && S.abil === it.k), lock = it.kind === 'tool' && !unlocked(it), off = (it.kind === 'abil' && S.uses[it.k] <= 0) || lock;
      g.fillStyle = sel ? 'rgba(232,182,86,.28)' : 'rgba(255,255,255,.06)'; g.strokeStyle = sel ? '#e8b656' : 'rgba(255,255,255,.12)'; g.lineWidth = 1.5 * d; rr(it.x + 2 * d, it.y, it.w - 4 * d, it.h, 9 * d); g.fill(); g.stroke();
      g.globalAlpha = off ? .35 : 1; g.font = `${18 * d}px sans-serif`; g.fillStyle = '#fff'; g.fillText(it.ic, it.x + it.w / 2, it.y + 17 * d);
      g.font = `700 ${Math.min(10, it.w / d / 7.5) * d}px Inter, sans-serif`; g.fillText(it.kind === 'spd' ? (S.speed ? S.speed + '× sebesség' : 'Szünet') : it.n, it.x + it.w / 2, it.y + 34 * d, it.w - 6 * d);
      g.fillStyle = '#ffe29a'; g.fillText(lock ? '🔒 ' + it.u + '. küldetés' : it.kind === 'tool' ? (it.c ? (it.k === 'mor' ? it.c + 50 * S.mort : it.c) + '' : '') : it.kind === 'abil' ? '×' + S.uses[it.k] : '', it.x + it.w / 2, it.y + 46 * d, it.w - 6 * d); g.globalAlpha = 1; }
    const ab = S.abil && ABIL.find(a => a.k === S.abil), line = S.msg && S.msg.l > 0 ? S.msg.t : S.phase === 'plan' && TOOL[S.tool] ? TOOL[S.tool].n + ': ' + TOOL[S.tool].d : ab ? ab.n + ': ' + ab.d : S.phase === 'battle' && S.sel ? 'Jármű kijelölve – koppints, hová menjen' : '';
    if (line) { g.font = `600 ${11.5 * d}px Inter, sans-serif`; const w = Math.min(G.W - 12 * d, g.measureText(line).width + 24 * d); g.fillStyle = 'rgba(4,7,14,.9)'; rr((G.W - w) / 2, L.barY - 28 * d, w, 22 * d, 11 * d); g.fill(); g.fillStyle = S.msg && S.msg.l > 0 ? (S.msg.ok ? '#7dff4a' : '#ff8a7a') : '#fff'; g.fillText(line, G.W / 2, L.barY - 17 * d, w - 12 * d); }
    if (S.modal) { const M = modalBox(), tr = S.modal.tr; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, G.W, G.H); g.fillStyle = 'rgba(8,12,22,.98)'; g.strokeStyle = '#e8b656'; g.lineWidth = 2 * d; rr(M.x, M.y, M.w, M.h, 16 * d); g.fill(); g.stroke(); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffe29a'; g.font = `900 ${17 * d}px Inter, sans-serif`; g.fillText('Szerelvény összeállítása', G.W / 2, M.y + 24 * d); g.fillStyle = 'rgba(255,255,255,.75)'; g.font = `600 ${11 * d}px Inter, sans-serif`; g.fillText(`💰 ${S.budget} · életerő ${140 + 30 * tr.cars.length + 220 * tr.cars.filter(k => k === 'arm').length} · férőhely ${Math.round(400 * S.gmax / 20) * tr.cars.filter(k => k === 'pas').length} fő/forduló`, G.W / 2, M.y + 44 * d, M.w - 20 * d);
      g.font = `${20 * d}px sans-serif`; g.fillStyle = '#fff'; g.fillText('🚂', M.loco.x + M.loco.w / 2, M.loco.y + M.loco.h / 2); for (let i = 0; i < CAR_MAX; i++) { const b = M.slots[i], k = tr.cars[i]; g.fillStyle = k ? 'rgba(232,182,86,.2)' : 'rgba(255,255,255,.05)'; g.strokeStyle = k ? '#e8b656' : 'rgba(255,255,255,.15)'; g.lineWidth = 1.5 * d; rr(b.x, b.y, b.w, b.h, 7 * d); g.fill(); g.stroke(); if (k) { g.font = `${Math.min(18 * d, b.w * .6)}px sans-serif`; g.fillStyle = '#fff'; g.fillText(CARS[k].ic, b.x + b.w / 2, b.y + b.h / 2 + 1); } }
      for (const b of M.pal) { const C0 = CARS[b.k], lock = S.m < C0.u; g.globalAlpha = lock ? .4 : 1; g.fillStyle = 'rgba(255,255,255,.07)'; g.strokeStyle = 'rgba(255,255,255,.15)'; rr(b.x, b.y, b.w, b.h, 9 * d); g.fill(); g.stroke(); g.font = `${18 * d}px sans-serif`; g.fillStyle = '#fff'; g.fillText(C0.ic, b.x + b.w / 2, b.y + 17 * d); g.font = `700 ${10 * d}px Inter, sans-serif`; g.fillText(C0.n, b.x + b.w / 2, b.y + 35 * d, b.w - 6 * d); g.fillStyle = '#ffe29a'; g.fillText(lock ? '🔒 ' + C0.u + '. kör' : '' + C0.c, b.x + b.w / 2, b.y + 48 * d, b.w - 6 * d); g.globalAlpha = 1; }
      g.fillStyle = '#7dff4a'; rr(M.ok.x, M.ok.y, M.ok.w, M.ok.h, M.ok.h / 2); g.fill(); g.fillStyle = '#0b1a05'; g.font = `800 ${13 * d}px Inter, sans-serif`; g.fillText('Kész', M.ok.x + M.ok.w / 2, M.ok.y + M.ok.h / 2 + 1);
      if (S.msg && S.msg.l > 0) { g.fillStyle = '#ff8a7a'; g.font = `600 ${11 * d}px Inter, sans-serif`; g.fillText(S.msg.t, G.W / 2, M.y + M.h + 16 * d); } }
    if (S.phase === 'res') { const R0 = S.res, B0 = resBox(); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, G.W, G.H);
      g.fillStyle = 'rgba(8,12,22,.97)'; g.strokeStyle = R0.win ? '#7dff4a' : '#ff6a5a'; g.lineWidth = 2 * d; rr(B0.x, B0.y, B0.w, B0.h, 16 * d); g.fill(); g.stroke();
      g.fillStyle = R0.win ? '#7dff4a' : '#ff8a7a'; g.font = `900 ${22 * d}px Inter, sans-serif`; g.fillText(R0.win ? 'A VÁROS MEGMENEKÜLT' : 'A VÁROS ELESETT', G.W / 2, B0.y + 36 * d, B0.w - 20 * d);
      g.fillStyle = '#fff'; g.font = `600 ${13 * d}px Inter, sans-serif`; g.fillText(`Megmentett civilek: ${R0.saved} / ${S.n0} (${Math.round(R0.pct * 100)}%)`, G.W / 2, B0.y + 70 * d);
      g.fillText(R0.win ? R0.medal : R0.why, G.W / 2, B0.y + 92 * d, B0.w - 20 * d);
      g.fillStyle = 'rgba(255,255,255,.6)'; g.font = `600 ${10.5 * d}px Inter, sans-serif`; g.fillText(`Idő ${mmss(S.t)} · Kilőtt zombi: ${S.kills} · Elveszett civil: ${S.lost} · Áttört útzár: ${S.broke}`, G.W / 2, B0.y + 107 * d, B0.w - 20 * d);
      g.fillStyle = '#ffe29a'; g.font = `800 ${18 * d}px Inter, sans-serif`; g.fillText(R0.win ? '+' + R0.pts.toLocaleString('hu-HU') + ' pont' : 'Összesen: ' + RUN.total.toLocaleString('hu-HU') + ' pont', G.W / 2, B0.y + 122 * d);
      if (R0.win) { g.fillStyle = 'rgba(255,255,255,.7)'; g.font = `600 ${12 * d}px Inter, sans-serif`; g.fillText('Válassz fejlesztést a következő városhoz:', G.W / 2, B0.y + 152 * d);
        for (const b of B0.btns) { g.fillStyle = 'rgba(232,182,86,.16)'; g.strokeStyle = '#e8b656'; g.lineWidth = 1.5 * d; rr(b.x, b.y, b.w, b.h, 10 * d); g.fill(); g.stroke(); g.font = `${20 * d}px sans-serif`; g.fillStyle = '#fff'; g.fillText(b.u[2], b.x + b.w / 2, b.y + 20 * d); g.font = `700 ${10.5 * d}px Inter, sans-serif`; g.fillText(b.u[1], b.x + b.w / 2, b.y + 44 * d, b.w - 6 * d); } }
      else for (const b of B0.lose) { g.fillStyle = b.k === 'load' ? '#7dff4a' : 'rgba(255,255,255,.1)'; rr(b.x, b.y, b.w, b.h, b.h / 2); g.fill(); g.fillStyle = b.k === 'load' ? '#0b1a05' : '#fff'; g.font = `800 ${12.5 * d}px Inter, sans-serif`; g.fillText(b.k === 'load' ? '📂 Újra a mentésből' : 'Befejezés', b.x + b.w / 2, b.y + b.h / 2 + 1, b.w - 10 * d); } }
  }
  // rövid bevezető minden új játék elején, kihagyható
  const TUT_STEPS = [['🗺️', 'Válassz helyet', 'Alul megyét váltasz, a térképen pedig egy lakott részre koppintva kijelölöd, honnan indulsz. Görgővel vagy csípéssel nagyíthatsz.'],
    ['🧱', 'Húzz falat', 'Rajzolj falat az utcákon keresztül. Amit a fal elvág a város többi részétől, az védett terület – kékkel látod.'],
    ['🚪', 'Nyiss kaput', 'Kapun át jutnak be a civilek a védett részre. A kapu jóval gyengébb a falnál, a horda azt keresi meg és azt töri be először.'],
    ['🪖', 'Állíts védelmet', 'Őrséget és mesterlövészt épületbe, gépágyút és aknát útra tehetsz – főleg a kapuk köré. A Különleges fülön terelőút és hangosbemondó, az Építés fülön őrház és vasút van. A vonattal érkező járművet csatában kijelölöd, aztán koppintasz, hová menjen.'],
    ['🧟', 'Indítsd a kört', 'Indítás után kitör a járvány a védett részen kívül. Irtsd ki az összes zombit úgy, hogy a civilek előírt hányada életben marad. Lent légicsapást és más képességeket vethetsz be.'],
    ['🚆', 'Vasút és hajók', 'Az Építés fülön sínt húzhatsz és állomást tehetsz rá; a Vonat eszközzel összeállítod a szerelvényt (menekítő, fegyveres és járműszállító kocsik). Csatában naszádot és hadihajót hívhatsz a vízre.'],
    ['🏆', 'Kör után', 'Győzelemkor a védelmed megmarad, a pálya kitágul, és választhatsz egy fejlesztést. A jobb felső 💾 gombbal menthetsz a tervezés közben.']];
  let TUT = null;
  function wrap(g, t, w) { const out = []; let cur = ''; for (const word of t.split(' ')) { const nx = cur ? cur + ' ' + word : word; if (cur && g.measureText(nx).width > w) { out.push(cur); cur = word; } else cur = nx; } if (cur) out.push(cur); return out; }
  function tutBox() { const d = L.d, w = Math.min(G.W - 24 * d, 430 * d), h = 272 * d, x = (G.W - w) / 2, y = (G.H - h) / 2, bh = 38 * d, bw = (w - 36 * d) / 2; return { x, y, w, h, skip: { x: x + 12 * d, y: y + h - bh - 12 * d, w: bw, h: bh }, next: { x: x + 24 * d + bw, y: y + h - bh - 12 * d, w: bw, h: bh } }; }
  function drawTut(g) { const d = L.d, B = tutBox(), st = TUT_STEPS[TUT]; g.fillStyle = 'rgba(0,0,0,.62)'; g.fillRect(0, 0, G.W, G.H); g.fillStyle = 'rgba(8,12,22,.98)'; g.strokeStyle = '#e8b656'; g.lineWidth = 2 * d; rr(B.x, B.y, B.w, B.h, 16 * d); g.fill(); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${34 * d}px sans-serif`; g.fillStyle = '#fff'; g.fillText(st[0], G.W / 2, B.y + 38 * d); g.font = `900 ${19 * d}px Inter, sans-serif`; g.fillStyle = '#ffe29a'; g.fillText(st[1], G.W / 2, B.y + 76 * d);
    g.font = `500 ${13 * d}px Inter, sans-serif`; g.fillStyle = 'rgba(255,255,255,.88)'; wrap(g, st[2], B.w - 36 * d).slice(0, 6).forEach((l, i) => g.fillText(l, G.W / 2, B.y + 102 * d + i * 16.5 * d));
    for (let i = 0; i < TUT_STEPS.length; i++) { g.fillStyle = i === TUT ? '#e8b656' : 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(G.W / 2 + (i - (TUT_STEPS.length - 1) / 2) * 12 * d, B.skip.y - 12 * d, 3 * d, 0, 6.283); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.08)'; rr(B.skip.x, B.skip.y, B.skip.w, B.skip.h, B.skip.h / 2); g.fill(); g.fillStyle = '#fff'; g.font = `700 ${13 * d}px Inter, sans-serif`; g.fillText('Kihagyás', B.skip.x + B.skip.w / 2, B.skip.y + B.skip.h / 2 + 1);
    g.fillStyle = '#7dff4a'; rr(B.next.x, B.next.y, B.next.w, B.next.h, B.next.h / 2); g.fill(); g.fillStyle = '#0b1a05'; g.font = `800 ${13 * d}px Inter, sans-serif`; g.fillText(TUT === TUT_STEPS.length - 1 ? 'Kezdjük!' : 'Tovább ▶', B.next.x + B.next.w / 2, B.next.y + B.next.h / 2 + 1); }
  const mmss = v => Math.floor(v / 60) + ':' + String(Math.floor(v % 60)).padStart(2, '0');
  const mini = () => { const d = L.d, w = 104 * d; return { x: 8 * d, y: L.top + 8 * d, w, h: w, k: w / (2 * (S.R + 30)) }; };
  function drawMini(g) { const d = L.d, M = mini(), mx = v => M.x + M.w / 2 + (v - S.start[0]) * M.k, my = v => M.y + M.h / 2 + (v - S.start[1]) * M.k; g.save(); g.fillStyle = 'rgba(8,12,22,.86)'; rr(M.x, M.y, M.w, M.h, 10 * d); g.fill(); g.clip();
    g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.arc(mx(S.start[0]), my(S.start[1]), S.R * M.k, 0, 6.283); g.fill();
    g.fillStyle = 'rgba(108,198,255,.8)'; for (const i of S.live) if (S.prot[i]) g.fillRect(mx(S.N[i].x) - d, my(S.N[i].y) - d, 2 * d, 2 * d);
    g.strokeStyle = '#e8b656'; g.lineWidth = 1.5 * d; for (const z of S.zones) { g.beginPath(); z.poly.forEach((p, i) => i ? g.lineTo(mx(p[0]), my(p[1])) : g.moveTo(mx(p[0]), my(p[1]))); if (z.closed) g.closePath(); g.stroke(); }
    g.fillStyle = '#7dff4a'; const st = Math.max(1, Math.ceil(S.zs.length / 500)); for (let i = 0; i < S.zs.length; i += st) { const z = S.zs[i]; g.fillRect(mx(z.x) - d, my(z.y) - d, 2 * d, 2 * d); }
    if (S.hosp) { g.fillStyle = '#ff5a5a'; g.fillRect(mx(S.hosp.x) - 2.5 * d, my(S.hosp.y) - 2.5 * d, 5 * d, 5 * d); }
    g.strokeStyle = '#fff'; g.lineWidth = d; g.strokeRect(mx(-L.ox / L.s), my((L.top - L.oy) / L.s), L.vw / L.s * M.k, L.vh / L.s * M.k); g.restore(); g.strokeStyle = 'rgba(255,226,154,.5)'; g.lineWidth = 1.5 * d; rr(M.x, M.y, M.w, M.h, 10 * d); g.stroke(); }
  function modalBox() { const d = L.d, w = Math.min(G.W - 20 * d, 470 * d), keys = Object.keys(CARS), per = 4, pw = (w - 24 * d - (per - 1) * 6 * d) / per, ph = 56 * d, h = 118 * d + Math.ceil(keys.length / per) * (ph + 6 * d) + 50 * d, x = (G.W - w) / 2, y = (G.H - h) / 2, sw = (w - 24 * d - 8 * 4 * d) / 9;
    return { x, y, w, h, loco: { x: x + 12 * d, y: y + 60 * d, w: sw, h: 40 * d }, slots: Array.from({ length: CAR_MAX }, (_, i) => ({ x: x + 12 * d + (i + 1) * (sw + 4 * d), y: y + 60 * d, w: sw, h: 40 * d })), get cars() { return this.slots.slice(0, S.modal.tr.cars.length); }, pal: keys.map((k, i) => ({ k, x: x + 12 * d + (i % per) * (pw + 6 * d), y: y + 112 * d + Math.floor(i / per) * (ph + 6 * d), w: pw, h: ph })), ok: { x: x + w / 2 - 70 * d, y: y + h - 46 * d, w: 140 * d, h: 36 * d } }; }
  function sideBtns() { const d = L.d, o = []; if (S.phase === 'plan') o.push({ k: 'save', ic: '💾' }); if (S.phase === 'plan' && S.hist.length) o.push({ k: 'undo', ic: '↩️' }); if ((S.phase === 'plan' || S.phase === 'pick') && saved) o.push({ k: 'load', ic: '📂' }); if (S.start && S.phase !== 'res') o.push({ k: 'home', ic: '🎯' }); return o.map((b, j) => ({ ...b, x: G.W - 44 * d, y: L.top + 8 * d + j * 42 * d, w: 36 * d, h: 36 * d })); }
  function resBox() { const d = L.d, w = Math.min(G.W - 24 * d, 380 * d), h = 240 * d, x = (G.W - w) / 2, y = (G.H - h) / 2, bw = (w - 36 * d) / 3; const lk = saved ? ['load', 'end'] : ['end'], lw = (w - 24 * d - (lk.length - 1) * 8 * d) / lk.length; return { x, y, w, h, lose: lk.map((k, j) => ({ k, x: x + 12 * d + j * (lw + 8 * d), y: y + 172 * d, w: lw, h: 42 * d })), btns: S.res.pool.map((u, j) => ({ u, x: x + 12 * d + j * (bw + 6 * d), y: y + 168 * d, w: bw, h: 60 * d })) }; }
  const P2 = e => [e.clientX * G.d, e.clientY * G.d];
  window.__hv = () => ({ S, L, RUN, undo, order, vehTap, makeTrack, callShip, GEO: () => GEO, skipTut() { TUT = null; }, begin, makeZone, place, setStart, saveGame, loadGame });

  return {
    id: 'holtvaros', name: 'HOLTVÁROS', lives: 0, quit: true, sponsor: 'A Zerosites támogatásával', overTitle: 'A JÁRVÁNY GYŐZÖTT',
    desc: 'Válaszd ki, hol kezdesz Pest megyében vagy Budapesten, és készülj fel: húzz falakat, nyiss kapukat, tegyél őrséget az épületekbe, tereld a civileket – aztán kitör a járvány. Irtsd ki az összes zombit, és ments meg minél több civilt.',
    credit: 'A játékmenetet a Jogamedev „Zombies Aren\'t Real” című játéka ihlette.', link: { url: STEAM, label: 'Zombies Aren\'t Real a Steamen ↗' },
    how: 'SZÓKÖZ: INDÍTÁS / SZÜNET · GÖRGŐ / CSÍPÉS: NAGYÍTÁS · JOBB GOMB / KÉT UJJ: MOZGATÁS',
    ranks: [[0, 'Újonc'], [3000, 'Őrmester'], [10000, 'Százados'], [30000, 'Ezredes'], [80000, 'Karantén-parancsnok']],
    init() { RUN = { total: 0, uses: { air: 1, mis: 0, gas: 0, heli: 0, para: 1, apc: 0, boat: 1, ship: 0 }, bud: 1, rng: 1 }; PT.clear(); pinch = panS = null; TUT = 0; newMission(1);
      if (!keyOn) { keyOn = 1; const on = () => G.running && G.game && G.game.id === 'holtvaros' && S && L, gc = document.getElementById('gc');
        addEventListener('keydown', e => { if (!on()) return; const pan = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] }[e.key];
          if (TUT != null) { if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); TUT = TUT + 1 < TUT_STEPS.length ? TUT + 1 : null; } else if (e.key === 'Escape') TUT = null; return; }
          if (e.key === ' ') { e.preventDefault(); if (S.phase === 'plan') begin(); else if (S.phase === 'battle') S.speed = S.speed ? 0 : 1; }
          else if (pan) { e.preventDefault(); L.cam.cx += pan[0] * 80 / L.cam.z; L.cam.cy += pan[1] * 80 / L.cam.z; clampCam(); }
          else if (e.key === 'Tab' && S.phase === 'plan') { e.preventDefault(); S.tab = S.tab === 0 ? 1 : S.tab === 1 ? 3 : 0; S.tool = TOOLS.find(t => t.tab === S.tab).k; layout(); }
          else if (S.phase === 'plan' && e.key >= '1' && e.key <= '9') { const it = L.its[+e.key - 1]; if (it) S.tool = it.k; } });
        gc.addEventListener('wheel', e => { if (!on()) return; e.preventDefault(); const [x, y] = P2(e); if (y < L.barY) zoomAt(x, y, Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * .004)); }, { passive: false });
        gc.addEventListener('contextmenu', e => { if (on()) e.preventDefault(); }); } },
    resize() { if (S) { MAP = null; layout(); } },
    down(G2, x, y, e) {
      if (e === true || !S) return; const hit = o => o && x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h;
      if (S.modal) { const M = modalBox(); if (hit(M.ok) || !hit(M)) { S.modal = null; return; } const tr = S.modal.tr, ci = M.cars.findIndex(hit); if (ci >= 0) { S.budget += CARS[tr.cars[ci]].c; tr.cars.splice(ci, 1); Sfx.blip(300, .04, 'square', .04); return; }
        const pk = M.pal.find(hit); if (pk) { const C0 = CARS[pk.k]; if (S.m < C0.u) say(C0.n + ': a(z) ' + C0.u + '. küldetéstől.'); else if (tr.cars.length >= CAR_MAX) say('Legfeljebb ' + CAR_MAX + ' kocsi lehet.'); else if (S.budget < C0.c) say('Nincs rá keret.'); else { S.budget -= C0.c; tr.cars.push(pk.k); Sfx.blip(620, .04, 'triangle', .05); } } return; }
      if (TUT != null) { const B = tutBox(); if (hit(B.skip)) { TUT = null; Sfx.blip(500, .04, 'sine', .04); } else if (hit(B.next)) { TUT = TUT + 1 < TUT_STEPS.length ? TUT + 1 : null; Sfx.blip(700, .04, 'sine', .04); } return; }
      if (S.phase === 'res') { if (!S.res.win) { const lb = resBox().lose.find(hit); if (lb) { if (lb.k === 'load') loadGame(); else G.end(); } return; } const b = resBox().btns.find(hit); if (!b) return; const k = b.u[0]; if (k === 'bud') RUN.bud += .15; else if (k === 'rng') RUN.rng += .1; else RUN.uses[k]++; Sfx.perfect(); return newMission(S.m + 1, S); }
      if (S.start && (S.phase === 'plan' || S.phase === 'battle') && hit(mini())) { const M = mini(); L.cam.cx = S.start[0] + (x - M.x - M.w / 2) / M.k; L.cam.cy = S.start[1] + (y - M.y - M.h / 2) / M.k; clampCam(); return; }
      { const sb = sideBtns().find(hit); if (sb) { if (sb.k === 'save') saveGame(); else if (sb.k === 'undo') undo(); else if (sb.k === 'load') loadGame(); else { L.cam.z = 1; L.cam.cx = (S.box[0] + S.box[2]) / 2; L.cam.cy = (S.box[1] + S.box[3]) / 2; clampCam(); } return; } }
      if (y >= L.barY) { const tb = L.tabs.find(hit); if (tb) { if (tb.map) { if (tb.k !== MD.id) { Sfx.blip(700, .03, 'sine', .04); newMission(1, null, tb.k); } return; } S.tab = tb.k; S.tool = TOOLS.find(t => t.tab === tb.k).k; return layout(); } if (hit(L.go)) return begin();
        const it = L.its.find(hit); if (!it) return; if (it.kind === 'tool') { S.tool = it.k; Sfx.blip(700, .03, 'sine', .04); } else if (it.kind === 'abil') { if (S.uses[it.k] > 0) S.abil = S.abil === it.k ? null : it.k; } else if (it.kind === 'spd') S.speed = S.speed === 0 ? 1 : S.speed === 1 ? 2 : S.speed === 2 ? 4 : 0; return; }
      const id = e && e.pointerId != null ? e.pointerId : 0; PT.set(id, { x, y });
      if (PT.size >= 2) { const [a, b] = [...PT.values()]; S.draw = null; S.tap = null; panS = null; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; return; }
      const [wx, wy] = toW(x, y); S.hover = [wx, wy];
      if (e && (e.button === 1 || e.button === 2)) { panS = { x, y }; return; }
      if (S.phase === 'pick') S.tap = { x, y, wx, wy };
      else if (S.phase === 'plan') { if (S.tool === 'zone' || S.tool === 'rail') S.draw = { k: S.tool, pts: [[wx, wy]] }; else if (S.tool === 'cor') { S.draw = { k: 'cor', pts: [[wx, wy]] }; corridor(wx, wy); } else S.tap = { x, y, wx, wy }; }
      else if (S.phase === 'battle') { if (S.abil === 'air') S.draw = { k: 'air', pts: [[wx, wy]] }; else if (S.abil) useAbil(wx, wy); else S.tap = { x, y, wx, wy }; }
    },
    move(G2, x, y, btn, e) { if (!S || !L) return; const id = e && e.pointerId != null ? e.pointerId : 0; if (PT.has(id)) PT.set(id, { x, y });
      if (pinch && PT.size >= 2) { const [a, b] = [...PT.values()], dd = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; zoomAt(mx, my, dd / pinch.d); L.cam.cx -= (mx - pinch.mx) / L.s; L.cam.cy -= (my - pinch.my) / L.s; clampCam(); pinch = { d: dd, mx, my }; S.tap = null; return; }
      const [wx, wy] = toW(x, y); S.hover = y < L.barY ? [wx, wy] : null;
      if (panS && btn) { L.cam.cx -= (x - panS.x) / L.s; L.cam.cy -= (y - panS.y) / L.s; panS.x = x; panS.y = y; clampCam(); return; }
      if (S.tap && Math.hypot(x - S.tap.x, y - S.tap.y) > 10 * L.d) { panS = { x, y }; S.tap = null; }
      if (S.draw && btn) { const p = S.draw.pts, q = p[p.length - 1]; if (S.draw.k === 'air') p[1] = [wx, wy]; else if (Math.hypot(wx - q[0], wy - q[1]) > 10) { p.push([wx, wy]); if (S.draw.k === 'cor') corridor(wx, wy); } } },
    up(G2, x, y, e) { if (!S) return; const id = e && e.pointerId != null ? e.pointerId : 0; PT.delete(id); if (pinch) { if (PT.size < 2) pinch = null; S.draw = null; S.tap = null; return; } panS = null;
      if (S.tap) { const t = S.tap; S.tap = null; if (S.phase === 'plan') place(t.wx, t.wy); else if (S.phase === 'pick') setStart(t.wx, t.wy); else if (S.phase === 'battle') vehTap(t.wx, t.wy); }
      if (S.draw) { const dr = S.draw; S.draw = null; if (dr.k === 'zone') makeZone(dr.pts); else if (dr.k === 'rail') makeTrack(dr.pts); else if (dr.k === 'air') { const a = dr.pts[0], b = dr.pts[1] || a; useAbil(a[0], a[1], b[0], b[1]); } } },
    update(G2, dt) { if (!S) return; if (S.msg) S.msg.l -= dt;
      if (S.zin && L) { const z = S.zin; z.t += dt; clampCam(); if (z.t < 1.3) { const k = 1 - (1 - z.t / 1.3) ** 3, sc = z.s + (L.s - z.s) * k, cx = z.cx + (L.cam.cx - z.cx) * k, cy = z.cy + (L.cam.cy - z.cy) * k; L.s = sc; L.ox = L.vw / 2 - cx * sc; L.oy = L.top + L.vh / 2 - cy * sc; } else S.zin = null; }
      for (const f of S.fx) f.l -= dt * (S.speed || 1); S.fx = S.fx.filter(f => f.l > 0); if (S.fx.length > 220) S.fx.splice(0, S.fx.length - 220);
      if (S.phase === 'battle') for (let k = 0; k < S.speed && S.phase === 'battle'; k++) tick(dt); },
    draw(g, G2, t) { draw(g, t); if (TUT != null && S && L) drawTut(g); },
    leave() { TILES.clear(); },
    art(c, x, t) { const W = c.width, H = c.height; x.fillStyle = '#231f2a'; x.fillRect(0, 0, W, H); x.lineCap = 'round';
      x.strokeStyle = '#1e466b'; x.lineWidth = 26; x.beginPath(); x.moveTo(W * .38, -10); x.quadraticCurveTo(W * .3, H * .5, W * .42, H + 10); x.stroke();
      x.strokeStyle = '#48434f'; x.lineWidth = 5; for (let r = 30; r < 220; r += 38) { x.beginPath(); x.arc(W * .46, H * .5, r, -1.3, 1.3); x.stroke(); } for (let a = -1.2; a <= 1.2; a += .4) { x.beginPath(); x.moveTo(W * .46, H * .5); x.lineTo(W * .46 + Math.cos(a) * 230, H * .5 + Math.sin(a) * 230); x.stroke(); }
      x.strokeStyle = '#7b7f88'; x.lineWidth = 4; for (const y of [.25, .5, .75]) { x.beginPath(); x.moveTo(W * .26, H * y); x.lineTo(W * .46, H * y); x.stroke(); }
      x.strokeStyle = '#e8b656'; x.lineWidth = 3; x.beginPath(); x.ellipse(W * .72, H * .5, 46, 34, .3, 0, 6.283); x.stroke(); x.fillStyle = 'rgba(108,198,255,.12)'; x.fill();
      for (let j = 0; j < 26; j++) { const k = ((t * .1 + j * .04) % 1); x.fillStyle = '#7dff4a'; x.fillRect(W * .02 + k * W * .3 + Math.sin(j * 2.4) * 8, H * (.25 + (j % 3) * .25) + Math.cos(j) * 4, 4, 4); }
      for (let j = 0; j < 14; j++) { x.fillStyle = '#f3f5f8'; x.fillRect(W * .66 + (j * 37 % 100) / 100 * W * .12, H * .36 + (j * 53 % 100) / 100 * H * .28, 3, 3); } }
  };
};
