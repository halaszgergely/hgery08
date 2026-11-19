/* HGWS Arcade – Holtváros: felülnézetes zombijárvány-stratégia szabad (nem rácsos) várostérképen.
   A játékmenetet a Jogamedev „Zombies Aren't Real” című játéka ihlette; a kód, a térképek és a grafika saját.
   Budapest térképe kézzel modellezett, stilizált (nem valódi térképadat). */
window.HGZombi = function (env) {
  'use strict';
  const { G, Sfx, rr, hud } = env;
  const STEAM = 'https://store.steampowered.com/app/5185890/Zombies_Arent_Real/';
  const WW = 2400, WH = 1500, RW = 15, TOWNS = ['Csaptelep', 'Szikkadtfalva', 'Öntözőváros', 'Slagliget', 'Kútfő', 'Locsolóhalom'];
  // u: melyik küldetéstől érhető el; on: 'b' épület, 'r' út, 'br' híd
  const TOOLS = [
    { k: 'zone', tab: 0, n: 'Fal', ic: '🧱', c: 0, u: 1, n2: 1, d: 'Húzz falat szabadon. Ami így el van vágva a várostól, az védett.' },
    { k: 'gate', tab: 0, n: 'Kapu', ic: '🚪', c: 20, u: 1, d: 'Koppints egy útzárra: a civilek bejutnak rajta.' },
    { k: 'gar', tab: 0, n: 'Őrség', ic: '🪖', c: 60, u: 1, on: 'b', r: 150, cd: .25, dmg: 1, d: 'Épületbe. Közepes hatótáv.' },
    { k: 'snp', tab: 0, n: 'Mesterlövész', ic: '🎯', c: 110, u: 2, on: 'b', r: 330, cd: 1.1, dmg: 3, d: 'Épületbe. Nagy hatótáv, lassú.' },
    { k: 'tur', tab: 0, n: 'Gépágyú', ic: '🔫', c: 150, u: 1, on: 'r', r: 170, cd: .1, dmg: 1, ammo: 400, d: 'Útra. Gyors tűz, 400 lőszer.' },
    { k: 'mor', tab: 0, n: 'Aknavető', ic: '💥', c: 200, u: 3, on: 'b', r: 420, rmin: 120, cd: 3.5, d: 'Épületbe. Területre lő – a civileket is eltalálja!' },
    { k: 'mine', tab: 0, n: 'Akna', ic: '💣', c: 25, u: 1, on: 'r', d: 'Útra. Zombira robban.' },
    { k: 'c4', tab: 0, n: 'C4', ic: '🧨', c: 80, u: 2, on: 'br', d: 'Hídra: a csata elején felrobban.' },
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
    { k: 'del', tab: 2, n: 'Törlés', ic: '❌', c: 0, u: 1, d: 'Elem visszavétele, teljes áron.' }
  ];
  const TOOL = Object.fromEntries(TOOLS.map(t => [t.k, t]));
  const ABIL = [{ k: 'air', n: 'Légicsapás', ic: '✈️', d: 'Húzz egy vonalat: 5 bomba.' }, { k: 'mis', n: 'Rakéta', ic: '🚀', d: 'Egy nagy robbanás.' }, { k: 'gas', n: 'Gáz', ic: '☣️', d: 'Mérgező felhő – a civileknek is!' },
    { k: 'heli', n: 'Helikopter', ic: '🚁', d: '25 mp-ig köröz és lő.' }, { k: 'para', n: 'Ejtőernyősök', ic: '🪂', d: '5 katona, akik felkutatják a zombikat.' }, { k: 'apc', n: 'Páncélos', ic: '🛡️', d: 'Behajt az utakon, lő és gázol.' }];
  const UPG = [['air', '+1 légicsapás', '✈️'], ['mis', '+1 rakéta', '🚀'], ['gas', '+1 gáz', '☣️'], ['heli', '+1 helikopter', '🚁'], ['para', '+1 ejtőernyős osztag', '🪂'], ['apc', '+1 páncélos', '🛡️'], ['bud', '+15% keret', '💰'], ['rng', '+10% hatótáv', '📡']];
  let S = null, L = null, MAP = null, keyOn = 0, RUN = null;
  const PT = new Map(); let pinch = null, panS = null;

  const rng = seed => { let s = seed % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
  const dseg = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)); return [Math.hypot(px - ax - dx * t, py - ay - dy * t), t]; };
  const pip = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const segInt = (a, b, c, d) => { const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0]; if (Math.abs(den) < 1e-9) return -1; const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den; return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? u : -1; };

  /* ---------------- várostérkép ---------------- */
  function graph() { const N = [], E = []; return { N, E, node(x, y) { N.push({ x, y, adj: [], hold: 0 }); return N.length - 1; },
    edge(a, b, o = {}) { if (a === b || N[a].adj.some(q => q.n === b)) return; const e = { a, b, len: Math.hypot(N[a].x - N[b].x, N[a].y - N[b].y), bars: [], stain: 0, cor: 0, dead: 0, ...o }; E.push(e); N[a].adj.push({ n: b, e }); N[b].adj.push({ n: a, e }); return e; } }; }
  const riverX = (rv, y) => { for (let i = 1; i < rv.length; i++) if (y <= rv[i][1]) { const a = rv[i - 1], b = rv[i], t = (y - a[1]) / (b[1] - a[1] || 1); return a[0] + (b[0] - a[0]) * t; } return rv[rv.length - 1][0]; };
  function budapest(R) {
    const g = graph(), rv = [[985, -20], [935, 250], [885, 520], [900, 800], [975, 1100], [1060, 1520]], rw = 92, C = [1125, 760], labels = [], parks = [];
    // Pest: körutak és sugárutak
    const rings = [85, 170, 275, 385, 505, 635, 770, 915], angs = []; for (let a = -88; a <= 88; a += 13.5) angs.push(a * Math.PI / 180);
    const P = rings.map(() => []);
    rings.forEach((r, i) => angs.forEach((a, j) => { const x = C[0] + Math.cos(a) * r + (R() - .5) * 22, y = C[1] + Math.sin(a) * r * .95 + (R() - .5) * 22;
      P[i][j] = x > riverX(rv, y) + rw / 2 + 55 && x < WW - 30 && y > 30 && y < WH - 30 ? g.node(x, y) : -1; }));
    rings.forEach((r, i) => angs.forEach((a, j) => { const n = P[i][j]; if (n < 0) return;
      if (j + 1 < angs.length && P[i][j + 1] >= 0 && (i % 2 === 1 || R() > .25)) g.edge(n, P[i][j + 1], { big: i === 1 || i === 3 });
      if (i + 1 < rings.length && P[i + 1][j] >= 0 && (j % 2 === 0 || R() > .3)) g.edge(n, P[i + 1][j], { big: j % 3 === 1 }); }));
    // Buda: szabálytalan utcák, hegyek
    const hills = [[800, 965, 78, 95, 'Gellért-hegy'], [330, 330, 150, 120, 'Budai-hegyek']], B = [];
    for (let i = 0; i < 6; i++) { B[i] = []; for (let j = 0; j < 11; j++) { const y = 70 + j * 136 + (R() - .5) * 60, x = 70 + i * 135 + (R() - .5) * 64 + Math.sin(j * .9) * 26;
        B[i][j] = x < riverX(rv, y) - rw / 2 - 55 && !hills.some(h => ((x - h[0]) / h[2]) ** 2 + ((y - h[1]) / h[3]) ** 2 < 1) ? g.node(x, y) : -1; } }
    for (let i = 0; i < 6; i++) for (let j = 0; j < 11; j++) { const n = B[i][j]; if (n < 0) continue; if (i < 5 && B[i + 1][j] >= 0 && R() > .14) g.edge(n, B[i + 1][j]); if (j < 10 && B[i][j + 1] >= 0 && R() > .14) g.edge(n, B[i][j + 1]); }
    // rakpartok és hidak
    const br = [[120, 'Árpád híd'], [395, 'Margit híd'], [640, 'Lánchíd'], [765, 'Erzsébet híd'], [890, 'Szabadság híd'], [1085, 'Petőfi híd'], [1320, 'Rákóczi híd']];
    const ys = [...br.map(b => b[0]), 30, 260, 520, 985, 1200, 1450].sort((a, b) => a - b), quay = side => { let prev = -1; const out = {}, mine = new Set();
      for (const y of ys) { const x = riverX(rv, y) + side * (rw / 2 + 26), n = g.node(x, y); out[y] = n; mine.add(n); if (prev >= 0) g.edge(prev, n, { big: 1 }); prev = n;
        let best = -1, bd = 230; g.N.forEach((q, k) => { if (mine.has(k) || (q.x - x) * side < 20) return; const d = Math.hypot(q.x - x, q.y - y); if (d < bd) { bd = d; best = k; } }); if (best >= 0) g.edge(n, best); } return out; };
    const qb = quay(-1), qp = quay(1);
    for (const [y, name] of br) { g.edge(qb[y], qp[y], { bridge: 1, big: 1 }); labels.push([riverX(rv, y), y - 12, name, 9]); }
    parks.push([925, 235, 24, 150], [1790, 380, 95, 75], ...hills.map(h => h.slice(0, 4)));
    labels.push([420, 760, 'BUDA', 34], [1560, 800, 'PEST', 34], [925, 235, 'Margit-sziget', 9], [1790, 380, 'Városliget', 10], [800, 965, 'Gellért-hegy', 9], [760, 640, 'Vár', 10], [1010, 560, 'Parlament', 9]);
    return { ...g, rv, rw, parks, labels, name: 'Budapest' };
  }
  function town(R, m) {
    const g = graph(), nx = 14, ny = 9, P = [], x0 = 500 + R() * 1400, rv = [[x0, -20], [x0 + (R() - .5) * 500, 400], [x0 + (R() - .5) * 500, 800], [x0 + (R() - .5) * 500, 1150], [x0 + (R() - .5) * 400, 1520]], rw = 70;
    for (let i = 0; i < nx; i++) { P[i] = []; for (let j = 0; j < ny; j++) { const x = 90 + i * 171 + (R() - .5) * 95 + Math.sin(j * .8 + m) * 40, y = 80 + j * 167 + (R() - .5) * 90 + Math.cos(i * .7 + m) * 36; P[i][j] = Math.abs(x - riverX(rv, y)) > rw / 2 + 45 ? g.node(x, y) : -1; } }
    const cross = (a, b) => (g.N[a].x - riverX(rv, g.N[a].y)) * (g.N[b].x - riverX(rv, g.N[b].y)) < 0; let nb = 0;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { const n = P[i][j]; if (n < 0) continue;
      for (const [di, dj] of [[1, 0], [0, 1], [2, 0]]) { const q = (P[i + di] || [])[j + dj]; if (q == null || q < 0) continue; if (di === 2 && P[i + 1][j] >= 0) continue;
        if (cross(n, q)) { if (j % 3 === 1 && nb < 4) { g.edge(n, q, { bridge: 1, big: 1 }); nb++; } } else if (R() > .13) g.edge(n, q, { big: j === 4 || i === 6 }); } }
    return { ...g, rv, rw, parks: [[300 + R() * 1800, 300 + R() * 900, 90, 70]], labels: [], name: TOWNS[Math.floor(m / 2 - 1 + TOWNS.length) % TOWNS.length] };
  }
  function buildings(c, R) {
    const out = [], hash = new Map(), key = (x, y) => (Math.floor(x / 60)) + '|' + Math.floor(y / 60);
    const inPark = (x, y) => c.parks.some(p => ((x - p[0]) / (p[2] + 8)) ** 2 + ((y - p[1]) / (p[3] + 8)) ** 2 < 1);
    for (const e of c.E) { if (e.bridge) continue; const A = c.N[e.a], B = c.N[e.b], dx = (B.x - A.x) / e.len, dy = (B.y - A.y) / e.len;
      for (const side of [-1, 1]) { let s = 20; while (s < e.len - 34) { const w = 24 + R() * 26, dp = 20 + R() * 20, cx = A.x + dx * (s + w / 2) - dy * side * (RW / 2 + 4 + dp / 2), cy = A.y + dy * (s + w / 2) + dx * side * (RW / 2 + 4 + dp / 2), rad = Math.max(w, dp) / 2; s += w + 5;
          if (cx < 12 || cy < 12 || cx > WW - 12 || cy > WH - 12 || Math.abs(cx - riverX(c.rv, cy)) < c.rw / 2 + dp / 2 + 10 || inPark(cx, cy)) continue;
          let ok = true; const gx = Math.floor(cx / 60), gy = Math.floor(cy / 60);
          for (let a = -1; a <= 1 && ok; a++) for (let b = -1; b <= 1 && ok; b++) for (const o of hash.get((gx + a) + '|' + (gy + b)) || []) if (Math.hypot(o.x - cx, o.y - cy) < (o.rad + rad) * .82) { ok = false; break; }
          if (ok) for (const f of c.E) if (f !== e && dseg(cx, cy, c.N[f.a].x, c.N[f.a].y, c.N[f.b].x, c.N[f.b].y)[0] < RW / 2 + dp * .5 + 2) { ok = false; break; }
          if (!ok) continue; const hw = w / 2, hd = dp / 2, poly = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([u, v]) => [cx + dx * u - dy * v, cy + dy * u + dx * v]);
          const b = { x: cx, y: cy, rad, poly, h: 5 + R() * R() * 30, sh: R() }; out.push(b); const k = key(cx, cy); (hash.get(k) || hash.set(k, []).get(k)).push(b); } } }
    out.sort((a, b) => a.y - b.y); return out;
  }
  function newMission(m, prev) {
    // megnyert város után a felépített védelem megmarad: falak kijavítva, hidak helyreállítva, új keret érkezik
    if (prev) { for (const e of prev.E) { e.dead = 0; e.stain = 0; } for (const z of prev.zones) for (const b of z.bars) b.hp = b.max;
      const units = prev.units.map(u => ({ k: u.k, x: u.x, y: u.y, b: u.b, e: u.e, s: u.s, paid: u.paid, cd: Math.random(), ammo: TOOL[u.k].ammo || 0 }));
      S = { ...prev, m, phase: 'plan', t: 0, speed: 1, tool: 'zone', tab: 0, abil: null, budget: prev.budget + Math.round((300 + 110 * m) * RUN.bud), units, civs: [], zs: [], sol: [], apcs: [], fx: [], gas: [], helis: [], strikes: [], uses: { ...RUN.uses }, draw: null, hover: null, res: null, kills: 0, lost: 0, evac: 0, fT: 0, cT: 0, msg: { t: 'A védelmed megmaradt – erősítsd meg, nagyobb horda jön!', l: 4 } };
      const n = Math.min(520, 220 + 40 * m); for (let k = 0; k < n; k++) S.civs.push(agent(S.E[Math.floor(Math.random() * S.E.length)])); S.n0 = n; S.obj = Math.min(.6, .2 + .04 * m); protCalc(); MAP = null; const cam = L.cam; L = null; layout(true); L.cam = cam; clampCam(); return; }
    const R = rng(13), c = budapest(R);
    // csak az összefüggő hálózat marad
    const seen = new Set(), comp = s => { const q = [s], o = [s]; seen.add(s); while (q.length) { const u = q.pop(); for (const a of c.N[u].adj) if (!seen.has(a.n)) { seen.add(a.n); q.push(a.n); o.push(a.n); } } return o; };
    let best = []; c.N.forEach((_, i) => { if (!seen.has(i)) { const o = comp(i); if (o.length > best.length) best = o; } }); const keep = new Set(best);
    c.E = c.E.filter(e => keep.has(e.a) && keep.has(e.b)); c.N.forEach((n, i) => { if (!keep.has(i)) n.adj = []; }); c.live = best;
    S = { ...c, m, phase: 'plan', t: 0, speed: 1, tool: 'zone', tab: 0, abil: null, budget: Math.round((650 + 150 * m) * RUN.bud), B: buildings(c, R), zones: [], units: [], civs: [], zs: [], sol: [], apcs: [], fx: [], gas: [], helis: [], strikes: [],
      uses: { ...RUN.uses }, draw: null, hover: null, res: null, kills: 0, lost: 0, evac: 0, mort: 0, fT: 0, cT: 0, sT: 0 };
    const n = Math.min(520, 220 + 40 * m); for (let k = 0; k < n; k++) S.civs.push(agent(S.E[Math.floor(R() * S.E.length)], R));
    S.n0 = n; S.obj = Math.min(.6, .2 + .04 * m); protCalc(); MAP = null; L = null; layout(true);
  }
  function agent(e, R = Math.random) { const a = { e, s: R() * e.len, dir: R() < .5 ? 1 : -1, off: (R() - .5) * (RW - 5), hp: 2, cd: R(), x: 0, y: 0, idle: 0 }; pos(a); return a; }
  function pos(a) { const A = S.N[a.e.a], B = S.N[a.e.b], t = a.s / a.e.len, dx = (B.x - A.x) / a.e.len, dy = (B.y - A.y) / a.e.len; a.x = A.x + (B.x - A.x) * t - dy * a.off; a.y = A.y + (B.y - A.y) * t + dx * a.off; }
  const headN = a => a.dir > 0 ? a.e.b : a.e.a;
  function nearEdge(x, y, max = 40, f) { let b = null, bd = max; for (const e of S.E) { if (e.dead || (f && !f(e))) continue; const [d, t] = dseg(x, y, S.N[e.a].x, S.N[e.a].y, S.N[e.b].x, S.N[e.b].y); if (d < bd) { bd = d; b = { e, s: t * e.len, d }; } } return b; }
  const nearNode = (x, y, max = 1e9) => { let b = -1, bd = max; for (const i of S.live) { const d = Math.hypot(S.N[i].x - x, S.N[i].y - y); if (d < bd) { bd = d; b = i; } } return b; };
  function protCalc() { const cut = new Set(S.units.filter(u => u.k === 'c4').map(u => u.e)), id = new Int32Array(S.N.length).fill(-1), size = []; let big = 0;
    for (const s0 of S.live) { if (id[s0] >= 0) continue; const k = size.length, q = [s0]; id[s0] = k; let n = 0; while (q.length) { const u = q.pop(); n++; for (const a of S.N[u].adj) if (id[a.n] < 0 && !a.e.dead && !cut.has(a.e) && !liveBars(a.e)) { id[a.n] = k; q.push(a.n); } } size.push(n); if (n > size[big]) big = k; }
    S.prot = new Uint8Array(S.N.length); for (const i of S.live) if (id[i] !== big) S.prot[i] = 1; }
  const sideN = a => { let lo = Infinity; for (const b of a.e.bars) if (b.hp > 0 && b.s < lo) lo = b.s; return a.s <= lo ? a.e.a : a.e.b; };

  /* ---------------- elrendezés, kamera ---------------- */
  const unlocked = t => S.m >= t.u;
  function barItems() {
    if (S.phase === 'plan') return TOOLS.filter(t => t.tab === S.tab || t.k === 'del').map(t => ({ ...t, kind: 'tool' }));
    return [...ABIL.filter(a => RUN.uses[a.k] > 0).map(a => ({ ...a, kind: 'abil' })), { k: 'spd', kind: 'spd', n: '', ic: S.speed ? '⏩' : '⏸' }];
  }
  function layout(resetCam) {
    const d = G.d, its = barItems(), per = Math.max(4, Math.min(its.length, Math.floor((G.W - 12 * d) / (70 * d)))), rowsN = Math.ceil(its.length / per), bh = 54 * d, head = S.phase === 'plan' ? 40 * d : 0, barH = head + rowsN * (bh + 6 * d) + 10 * d;
    const top = 96 * d, vw = G.W, vh = G.H - barH - top, fit = Math.min(vw / WW, vh / WH), iw = Math.min(92 * d, (G.W - 12 * d) / per), cam = L && !resetCam ? L.cam : { z: G.W < G.H ? Math.min(3, vh / WH / fit * .8) : 1, cx: G.W < G.H ? 1125 : WW / 2, cy: WH / 2 };
    const tw = Math.min(120 * d, (G.W - 16 * d) / 3.4);
    L = { d, top, vw, vh, fit, cam, barY: G.H - barH, barH, W: G.W, H: G.H,
      tabs: S.phase === 'plan' ? [['VÉDELEM', 0], ['KÜLÖNLEGES', 1]].map(([n, k], j) => ({ n, k, x: 8 * d + j * (tw + 6 * d), y: G.H - barH + 6 * d, w: tw, h: 30 * d })) : [],
      go: S.phase === 'plan' ? { x: G.W - 8 * d - tw * 1.1, y: G.H - barH + 6 * d, w: tw * 1.1, h: 30 * d } : null,
      its: its.map((it, j) => { const row = Math.floor(j / per), inRow = Math.min(per, its.length - row * per); return { ...it, x: (G.W - iw * inRow) / 2 + (j % per) * iw, y: G.H - barH + head + 6 * d + row * (bh + 6 * d), w: iw, h: bh }; }) };
    clampCam();
  }
  function clampCam() { const c = L.cam; c.z = Math.max(1, Math.min(5, c.z)); const s = L.fit * c.z, hw = L.vw / s / 2, hh = L.vh / s / 2; c.cx = hw >= WW / 2 ? WW / 2 : Math.max(hw, Math.min(WW - hw, c.cx)); c.cy = hh >= WH / 2 ? WH / 2 : Math.max(hh, Math.min(WH - hh, c.cy)); L.s = s; L.ox = L.vw / 2 - c.cx * s; L.oy = L.top + L.vh / 2 - c.cy * s; }
  const toW = (x, y) => [(x - L.ox) / L.s, (y - L.oy) / L.s];
  function zoomAt(x, y, f) { const [wx, wy] = toW(x, y); L.cam.z = Math.max(1, Math.min(5, L.cam.z * f)); const s = L.fit * L.cam.z; L.cam.cx = wx - (x - L.vw / 2) / s; L.cam.cy = wy - (y - L.top - L.vh / 2) / s; clampCam(); }

  /* ---------------- útkeresés a hálózaton ---------------- */
  function dij(src, cost) { const n = S.N.length, F = new Float64Array(n).fill(Infinity), done = new Uint8Array(n); for (const s of src) F[s] = 0;
    for (;;) { let u = -1, bv = Infinity; for (const i of S.live) if (!done[i] && F[i] < bv) { bv = F[i]; u = i; } if (u < 0) break; done[u] = 1;
      for (const a of S.N[u].adj) { if (a.e.dead || done[a.n]) continue; const c = cost(a.e, u, a.n); if (F[u] + c < F[a.n]) F[a.n] = F[u] + c; } } return F; }
  const liveBars = e => { let n = 0; for (const b of e.bars) if (b.hp > 0) n++; return n; }, wallBars = e => { let n = 0; for (const b of e.bars) if (b.hp > 0 && !b.gate) n++; return n; };
  const civCost = (e, u, v) => wallBars(e) || S.N[u].hold || S.N[v].hold ? Infinity : e.len * (e.cor ? .35 : 1);
  function fields() {
    const prey = new Set(); for (const c of S.civs) { prey.add(c.e.a); prey.add(c.e.b); } for (const s of S.sol) { prey.add(s.e.a); prey.add(s.e.b); }
    S.zF = prey.size ? dij(prey, e => e.len + 500 * liveBars(e)) : null;
    const zn = new Set(); for (const z of S.zs) { zn.add(z.e.a); zn.add(z.e.b); } S.zD = zn.size ? dij(zn, e => e.len) : null;
    protCalc(); const ins = S.live.filter(i => S.prot[i]); S.cF = ins.length ? dij(ins, civCost) : null;
    for (const u of S.units) if (u.k === 'lift') u.F = dij([u.node], civCost);
  }
  // következő él a mező szerint; blocked(e): nem választható
  function pick(n, F, blocked, flee) { let best = null, bv = flee ? -Infinity : Infinity; for (const a of S.N[n].adj) { if (a.e.dead || (blocked && blocked(a.e, n, a.n))) continue; const v = F ? F[a.n] + (flee ? 0 : a.e.len) : Math.random(); if (flee ? v > bv : v < bv) { bv = v; best = a; } } return isFinite(bv) ? best : null; }
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
    for (const e of S.E) { const A = [S.N[e.a].x, S.N[e.a].y], B = [S.N[e.b].x, S.N[e.b].y]; for (let i = 0; i < m; i++) { const u = segInt(pts[i], pts[(i + 1) % pts.length], A, B); if (u >= 0 && !e.bars.some(q => Math.abs(q.s - u * e.len) < 12)) { const b = { e, s: u * e.len, hp: 60, max: 60, gate: 0, x: A[0] + (B[0] - A[0]) * u, y: A[1] + (B[1] - A[1]) * u, z }; e.bars.push(b); z.bars.push(b); } } }
    S.budget -= cost; S.zones.push(z); protCalc(); Sfx.blip(420, .06, 'square', .05);
  }
  function delZone(z) { S.budget += z.cost; for (const b of z.bars) { if (b.gate) S.budget += TOOL.gate.c; b.e.bars = b.e.bars.filter(q => q !== b); } S.zones = S.zones.filter(q => q !== z); protCalc(); }
  const nearBar = (x, y, max = 26) => { let b = null, bd = max; for (const z of S.zones) for (const q of z.bars) { const d = Math.hypot(q.x - x, q.y - y); if (d < bd) { bd = d; b = q; } } return b; };
  function place(x, y) {
    const t = S.tool, T = TOOL[t]; if (!T) return; if (!unlocked(T)) return say(T.n + ': a(z) ' + T.u + '. küldetéstől érhető el.');
    if (t === 'del') { let u = null, ud = 24; for (const q of S.units) { const d = Math.hypot(q.x - x, q.y - y); if (d < ud) { ud = d; u = q; } }
      if (u) { S.budget += u.paid; if (u.k === 'mor') S.mort--; S.units = S.units.filter(q => q !== u); protCalc(); return Sfx.blip(250, .05, 'square', .05); }
      const b = nearBar(x, y); if (b && b.gate) { b.gate = 0; b.hp = b.max = 60; S.budget += TOOL.gate.c; return; }
      const hn = nearNode(x, y, 26); if (hn >= 0 && S.N[hn].hold) { S.N[hn].hold = 0; S.budget += TOOL.hold.c; return; }
      const ne = nearEdge(x, y, 14, e => e.cor); if (ne) { ne.e.cor = 0; S.budget += Math.round(ne.e.len * .04); return; }
      for (const z of S.zones) for (let i = 0; i < z.poly.length - (z.closed ? 0 : 1); i++) { const a = z.poly[i], c = z.poly[(i + 1) % z.poly.length]; if (dseg(x, y, a[0], a[1], c[0], c[1])[0] < 14) return delZone(z); } return; }
    if (t === 'gate') { const b = nearBar(x, y); if (!b) return say('Kaput útzárra tehetsz (ahol a fal utat keresztez).'); if (b.gate) return; if (S.budget < T.c) return say('Nincs rá keret.'); S.budget -= T.c; b.gate = 1; b.hp = b.max = 30; return Sfx.blip(520, .05, 'triangle', .05); }
    if (t === 'hold') { const n = nearNode(x, y, 34); if (n < 0) return say('Kereszteződésre tedd.'); if (S.N[n].hold) return; if (S.budget < T.c) return say('Nincs rá keret.'); S.budget -= T.c; S.N[n].hold = 1; return Sfx.blip(520, .05, 'triangle', .05); }
    if (!T.on) return; let px = x, py = y, extra = {};
    if (T.on === 'b') { let b = null, bd = 1e9; for (const q of S.B) { const d = Math.hypot(q.x - x, q.y - y); if (d < q.rad + 8 && d < bd) { bd = d; b = q; } } if (!b) return say('Ezt épületbe kell tenni.'); if (S.units.some(u => u.b === b)) return say('Ez az épület már foglalt.'); px = b.x; py = b.y; extra.b = b; }
    else { const ne = nearEdge(x, y, 26, T.on === 'br' ? e => e.bridge : null); if (!ne) return say(T.on === 'br' ? 'Ezt hídra kell tenni.' : 'Ezt útra kell tenni.'); const A = S.N[ne.e.a], B = S.N[ne.e.b], k = ne.s / ne.e.len; px = A.x + (B.x - A.x) * k; py = A.y + (B.y - A.y) * k; extra.e = ne.e; extra.s = ne.s; }
    const cost = Math.round((T.c + (t === 'mor' ? 50 * S.mort : 0)) * discount(t, px, py)); if (S.budget < cost) return say('Nincs rá keret.');
    S.budget -= cost; if (t === 'mor') S.mort++; S.units.push({ k: t, x: px, y: py, cd: Math.random(), ammo: T.ammo || 0, paid: cost, ...extra }); if (t === 'c4') protCalc(); Sfx.blip(600, .04, 'triangle', .05);
  }
  function corridor(x, y) { const ne = nearEdge(x, y, 22, e => !e.cor); if (!ne) return; const c = Math.round(ne.e.len * .04); if (S.budget < c) return; S.budget -= c; ne.e.cor = 1; }

  /* ---------------- csata ---------------- */
  function soldier(x, y, o = {}) { const ne = nearEdge(x, y, 400); if (!ne) return; const a = agent(ne.e); a.s = ne.s; pos(a); Object.assign(a, { hp: 1, cd: Math.random() * .3, r: 110, ...o }); S.sol.push(a); return a; }
  function begin() {
    S.phase = 'battle'; S.speed = 1; S.tool = null; Sfx.perfect();
    for (const u of S.units.filter(u => u.k === 'c4')) { u.e.dead = 1; boom(u.x, u.y, 60, false); } S.units = S.units.filter(u => u.k !== 'c4'); MAP = null;
    const rm = (x, y) => (S.units.some(u => u.k === 'rad' && Math.hypot(u.x - x, u.y - y) < TOOL.rad.R) ? 1.3 : 1) * RUN.rng;
    for (const u of S.units) { u.rm = rm(u.x, u.y); if (u.k === 'lift') u.node = nearNode(u.x, u.y); if (u.k === 'pol') for (let k = 0; k < 4; k++) soldier(u.x + (Math.random() - .5) * 60, u.y + (Math.random() - .5) * 60, { guard: 1, cop: 1 });
      if (u.k === 'mil') { const near = S.civs.map(c => [Math.hypot(c.x - u.x, c.y - u.y), c]).filter(q => q[0] < TOOL.mil.R).sort((a, b) => a[0] - b[0]).slice(0, 8); for (const [, c] of near) { c.gone = 1; soldier(c.x, c.y, { guard: 1, r: 90 }); } S.civs = S.civs.filter(c => !c.gone); S.n0 -= near.length; } }
    for (const s of S.sol) if (S.units.some(u => u.k === 'med' && Math.hypot(u.x - s.x, u.y - s.y) < TOOL.med.R)) s.hp = 2;
    // kitörések a zónáktól távol
    protCalc(); const pn = S.live.filter(i => S.prot[i]).map(i => [S.N[i].x, S.N[i].y]), zc = pn.length ? pn : [[WW / 2, WH / 2]], mid = e => [(S.N[e.a].x + S.N[e.b].x) / 2, (S.N[e.a].y + S.N[e.b].y) / 2];
    const cand = S.E.filter(e => !e.dead && !e.bridge && !e.bars.length && !S.prot[e.a] && !S.prot[e.b]).map(e => { const [x, y] = mid(e); return [Math.min(...zc.map(z => Math.hypot(z[0] - x, z[1] - y))) + Math.random() * 200, e]; }).sort((a, b) => b[0] - a[0]);
    const sites = 2 + Math.min(4, Math.floor(S.m / 2)), per = 5 + 2 * S.m;
    for (let k = 0; k < sites && cand.length; k++) { const e = cand[Math.min(cand.length - 1, Math.floor(k * cand.length * .1 / sites + Math.random() * 6))][1]; for (let j = 0; j < per; j++) { const z = agent(e); z.cd = 1; S.zs.push(z); } S.fx.push({ k: 'ring', x: mid(e)[0], y: mid(e)[1], l: 1.5 }); }
    MAP = null; layout(); fields(); flags();
  }
  function flags() { const bros = S.units.filter(u => u.k === 'bro'), lifts = S.units.filter(u => u.k === 'lift');
    for (const c of S.civs) { c.safe = !!S.prot[sideN(c)]; if (!c.safe && !c.called && (c.e.cor || (S.cF && S.cF[c.e.a] < 420) || bros.some(u => Math.hypot(u.x - c.x, u.y - c.y) < TOOL.bro.R))) c.called = 1;
      c.lift = c.safe ? null : lifts.find(u => Math.hypot(u.x - c.x, u.y - c.y) < TOOL.lift.R) || null; } }
  function boom(x, y, rad, hurtAll = true) {
    S.fx.push({ k: 'boom', x, y, r: rad, l: .5 }); G.shake = Math.max(G.shake, 6 * G.d); Sfx.blip(90, .25, 'sawtooth', .08, .4);
    const hit = e => Math.hypot(e.x - x, e.y - y) <= rad; for (const z of S.zs) if (!z.dead && hit(z)) { z.dead = 1; S.kills++; }
    if (hurtAll) { const c0 = S.civs.length; S.civs = S.civs.filter(c => !hit(c)); S.lost += c0 - S.civs.length; S.sol = S.sol.filter(s => !hit(s)); }
  }
  function nearestZ(x, y, r, rmin = 0) { let b = null, bd = r * r; for (const z of S.zs) { if (z.dead) continue; const d2 = (z.x - x) ** 2 + (z.y - y) ** 2; if (d2 < bd && d2 >= rmin * rmin) { bd = d2; b = z; } } return b; }
  function shoot(x, y, z, dmg, col) { z.hp -= dmg; S.fx.push({ k: 'shot', x, y, x2: z.x, y2: z.y, l: .08, col }); if (z.hp <= 0 && !z.dead) { z.dead = 1; S.kills++; } }
  const hashOf = list => { const h = new Map(); for (const a of list) { const k = Math.floor(a.x / 24) + '|' + Math.floor(a.y / 24); (h.get(k) || h.set(k, []).get(k)).push(a); } return h; };
  const grab = (h, x, y, r) => { const gx = Math.floor(x / 24), gy = Math.floor(y / 24); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const o of h.get((gx + a) + '|' + (gy + b)) || []) if (!o.bit && Math.hypot(o.x - x, o.y - y) < r) return o; return null; };
  function tick(dt) {
    S.t += dt; if ((S.fT -= dt) <= 0) { S.fT = .5; fields(); } if ((S.cT -= dt) <= 0) { S.cT = .3; flags(); }
    const ch = hashOf(S.civs), sh = hashOf(S.sol), zsp = Math.min(52, 34 + S.m * 2.2), born = [], hitBars = new Map();
    for (const z of S.zs) { if (z.dead) continue; z.e.stain = Math.min(1, z.e.stain + dt * .08);
      for (const u of S.units) if (u.k === 'mine' && !u.dead && Math.hypot(u.x - z.x, u.y - z.y) < 14) { u.dead = 1; boom(u.x, u.y, 55); } if (z.dead) continue;
      if ((z.cd -= dt) <= 0) { const v = grab(ch, z.x, z.y, 9) || grab(sh, z.x, z.y, 9); if (v) { z.cd = .9; if (v.r && --v.hp > 0) continue; v.bit = 1; born.push(v); continue; } }
      const r = advance(z, zsp, dt, () => true); if (r === 'node') { const a = pick(headN(z), S.zF); if (a) take(z, a, headN(z)); else z.dir *= -1; } else if (r) hitBars.set(r, (hitBars.get(r) || 0) + 1); }
    for (const [b, n] of hitBars) { b.hp -= dt * .6 * Math.min(4, n); if (b.hp <= 0) { b.hp = 0; S.fx.push({ k: 'boom', x: b.x, y: b.y, r: 22, l: .4 }); Sfx.hit(); } }
    for (const u of S.units) if (u.k === 'rep') for (const z of S.zones) for (const b of z.bars) if (b.hp > 0 && b.hp < b.max && Math.hypot(b.x - u.x, b.y - u.y) < TOOL.rep.R) b.hp = Math.min(b.max, b.hp + 2 * dt);
    S.units = S.units.filter(u => !u.dead);
    if (born.length) { S.civs = S.civs.filter(c => !c.bit); S.sol = S.sol.filter(s => !s.bit); for (const v of born) { if (!v.r) S.lost++; const z = agent(v.e); z.s = v.s; z.dir = v.dir; z.cd = 1.2; pos(z); S.zs.push(z); } }
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
    for (const u of S.units) if (u.k === 'lift' && (u.cd -= dt) <= 0) { const w = S.civs.filter(c => c.wait === u).slice(0, 10); u.cd = 6; if (w.length) { for (const c of w) c.gone = 1; S.civs = S.civs.filter(c => !c.gone); S.evac += w.length; S.fx.push({ k: 'lift', x: u.x, y: u.y, l: 1.6, n: w.length }); Sfx.blip(520, .2, 'triangle', .05); } }
    // egységek
    for (const u of S.units) { const T = TOOL[u.k]; if (!T.r || (u.cd -= dt) > 0) continue; const R0 = T.r * (u.rm || 1);
      if (u.k === 'mor') { const z = nearestZ(u.x, u.y, R0, T.rmin); if (z) { u.cd = T.cd; S.strikes.push({ x: z.x, y: z.y, t: .9, r: 50, from: [u.x, u.y] }); } continue; }
      if (u.k === 'tur' && u.ammo <= 0) continue; const z = nearestZ(u.x, u.y, R0); if (z) { u.cd = T.cd; if (u.k === 'tur') u.ammo--; shoot(u.x, u.y, z, T.dmg, u.k === 'snp' ? '255,255,255' : '255,220,120'); } }
    for (const s of S.sol) { const z = nearestZ(s.x, s.y, s.r * RUN.rng); if (z) { if ((s.cd -= dt) <= 0) { s.cd = .35; shoot(s.x, s.y, z, 1, '255,240,150'); } }
      else if (!s.guard && S.zD) { const r = advance(s, 34, dt, b => !b.gate); if (r === 'node') { const a = pick(headN(s), S.zD, (e) => wallBars(e) > 0); if (a) take(s, a, headN(s)); } else if (r) s.dir *= -1; } }
    for (const h of S.helis) { h.t -= dt; h.a += dt * 1.2; h.x = h.cx + Math.cos(h.a) * 70; h.y = h.cy + Math.sin(h.a) * 70; if ((h.cd -= dt) <= 0) { const z = nearestZ(h.x, h.y, 170); if (z) { h.cd = .1; shoot(h.x, h.y, z, 1, '255,160,90'); } } } S.helis = S.helis.filter(h => h.t > 0);
    for (const a of S.apcs) { if (a.path.length) { const T = S.N[a.path[0]], dx = T.x - a.x, dy = T.y - a.y, dd = Math.hypot(dx, dy); if (dd < 4) a.path.shift(); else { a.x += dx / dd * 70 * dt; a.y += dy / dd * 70 * dt; a.ang = Math.atan2(dy, dx); } }
      for (const z of S.zs) if (!z.dead && Math.hypot(z.x - a.x, z.y - a.y) < 13) { z.dead = 1; S.kills++; } if ((a.cd -= dt) <= 0) { const z = nearestZ(a.x, a.y, 170); if (z) { a.cd = .09; shoot(a.x, a.y, z, 1, '255,200,120'); } } }
    for (const q of S.gas) { q.t -= dt; for (const z of S.zs) if (!z.dead && Math.hypot(z.x - q.x, z.y - q.y) < q.r) { z.hp -= 1.3 * dt; if (z.hp <= 0) { z.dead = 1; S.kills++; } }
      const c0 = S.civs.length; for (const c of S.civs) if (Math.hypot(c.x - q.x, c.y - q.y) < q.r) { c.hp -= .5 * dt; if (c.hp <= 0) c.gone = 1; } S.civs = S.civs.filter(c => !c.gone); S.lost += c0 - S.civs.length; } S.gas = S.gas.filter(q => q.t > 0);
    for (const st of S.strikes) if ((st.t -= dt) <= 0) boom(st.x, st.y, st.r); S.strikes = S.strikes.filter(s => s.t > 0); S.zs = S.zs.filter(z => !z.dead);
    const alive = S.civs.length + S.evac, need = Math.ceil(S.n0 * S.obj);
    if (alive < need) return finish(false, 'Túl kevés civil maradt életben.');
    if (!S.zs.length && !S.strikes.length && S.t > 1) finish(true);
  }
  function finish(win, why) {
    const saved = S.civs.length + S.evac, pct = saved / S.n0, pts = win ? Math.round(saved * 10 * S.m + S.budget + (pct > .8 ? 500 * S.m : pct > .6 ? 200 * S.m : 0)) : 0;
    const pool = UPG.slice().sort(() => Math.random() - .5).slice(0, 3);
    S.phase = 'res'; S.res = { win, why, saved, pct, pts, pool, medal: pct > .8 ? '💎 Gyémánt' : pct > .6 ? '🥇 Arany' : pct > .4 ? '🥈 Ezüst' : '🥉 Bronz' };
    if (win) { RUN.total += pts; G.score = RUN.total; hud(); Sfx.perfect(); } else Sfx.hit();
  }
  function useAbil(x, y, x2, y2) {
    const a = S.abil; if (!a || S.uses[a] <= 0) return; S.uses[a]--; S.abil = null;
    if (a === 'air') { let dx = x2 - x, dy = y2 - y, dl = Math.hypot(dx, dy); if (dl < 40) { dx = 1; dy = 0; dl = 1; x -= 120; } const len = Math.max(240, Math.min(520, dl)); for (let k = 0; k < 5; k++) S.strikes.push({ x: x + dx / dl * len * k / 4, y: y + dy / dl * len * k / 4, t: 1 + k * .16, r: 55, plane: k === 0 }); Sfx.blip(300, .4, 'sawtooth', .05, .5); }
    else if (a === 'mis') S.strikes.push({ x, y, t: .7, r: 95, mis: 1 });
    else if (a === 'gas') S.gas.push({ x, y, r: 95, t: 14 });
    else if (a === 'heli') S.helis.push({ cx: x, cy: y, x, y, a: 0, t: 25, cd: 0 });
    else if (a === 'para') { for (let k = 0; k < 5; k++) soldier(x + (Math.random() - .5) * 90, y + (Math.random() - .5) * 90, { hp: S.units.some(u => u.k === 'med' && Math.hypot(u.x - x, u.y - y) < TOOL.med.R) ? 2 : 1 }); Sfx.blip(700, .1, 'triangle', .05); }
    else if (a === 'apc') { const tgt = nearNode(x, y), F = dij([tgt], e => wallBars(e) ? Infinity : e.len); let st = -1, bv = Infinity; for (const i of S.live) { const n = S.N[i], edge = Math.min(n.x, n.y, WW - n.x, WH - n.y); if (edge < 140 && F[i] < bv) { bv = F[i]; st = i; } }
      if (st < 0) st = tgt; const path = [st]; let cur = st, guard = 0; while (cur !== tgt && guard++ < 400) { let nb = -1, nv = Infinity; for (const q of S.N[cur].adj) if (!q.e.dead && F[q.n] + q.e.len < nv && !wallBars(q.e)) { nv = F[q.n] + q.e.len; nb = q.n; } if (nb < 0) break; path.push(nb); cur = nb; }
      S.apcs.push({ x: S.N[st].x, y: S.N[st].y, path, ang: 0, cd: 0 }); }
  }

  /* ---------------- rajz ---------------- */
  function buildMap() {
    const q = Math.min(2.2, Math.max(1, L.fit * 2.4)), cv = document.createElement('canvas'); cv.width = Math.round(WW * q); cv.height = Math.round(WH * q); const x = cv.getContext('2d'); x.scale(q, q);
    const gr = x.createLinearGradient(0, 0, WW, WH); gr.addColorStop(0, '#2b2733'); gr.addColorStop(1, '#231f2a'); x.fillStyle = gr; x.fillRect(0, 0, WW, WH);
    for (const p of S.parks) { x.fillStyle = '#24402c'; x.beginPath(); x.ellipse(p[0], p[1], p[2] + 60, p[3] + 60, 0, 0, 6.283); x.fill(); }
    // folyó
    x.lineCap = 'round'; x.lineJoin = 'round'; const path = () => { x.beginPath(); S.rv.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); };
    path(); x.strokeStyle = '#1b3145'; x.lineWidth = S.rw + 10; x.stroke(); path(); x.strokeStyle = '#1e466b'; x.lineWidth = S.rw; x.stroke(); path(); x.strokeStyle = 'rgba(140,200,255,.08)'; x.lineWidth = S.rw * .5; x.stroke();
    for (const p of S.parks) { x.fillStyle = '#2c5a37'; x.beginPath(); x.ellipse(p[0], p[1], p[2], p[3], 0, 0, 6.283); x.fill(); x.fillStyle = '#3a7045'; for (let k = 0; k < 12; k++) { x.beginPath(); x.arc(p[0] + Math.cos(k * 2.4) * p[2] * .6 * ((k % 3 + 1) / 3), p[1] + Math.sin(k * 2.4) * p[3] * .6 * ((k % 3 + 1) / 3), 7, 0, 6.283); x.fill(); } }
    // utak
    const line = (e, w, col) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.moveTo(S.N[e.a].x, S.N[e.a].y); x.lineTo(S.N[e.b].x, S.N[e.b].y); x.stroke(); };
    for (const e of S.E) if (!e.dead) line(e, (e.big ? RW + 5 : RW) + 4, e.bridge ? '#15161b' : '#1a181f');
    for (const e of S.E) if (!e.dead) line(e, e.big ? RW + 5 : RW, e.bridge ? '#7b7f88' : e.big ? '#56515d' : '#48434f');
    x.setLineDash([8, 10]); for (const e of S.E) if (!e.dead && e.big) line(e, 1.2, 'rgba(255,226,154,.35)'); x.setLineDash([]);
    for (const e of S.E) if (e.dead) { x.setLineDash([6, 8]); line(e, 3, 'rgba(255,120,90,.5)'); x.setLineDash([]); }
    // épületek (áltérhatású tetőkkel)
    for (const b of S.B) { const ox = -b.h * .22, oy = -b.h * .5, v = 96 + Math.floor(b.sh * 46);
      x.fillStyle = 'rgba(0,0,0,.28)'; x.beginPath(); b.poly.forEach((p, i) => i ? x.lineTo(p[0] + b.h * .3, p[1] + b.h * .25) : x.moveTo(p[0] + b.h * .3, p[1] + b.h * .25)); x.fill();
      for (let i = 0; i < 4; i++) { const p = b.poly[i], q2 = b.poly[(i + 1) % 4]; x.fillStyle = i % 2 ? `rgb(${v - 52},${v - 54},${v - 40})` : `rgb(${v - 36},${v - 38},${v - 24})`; x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(q2[0], q2[1]); x.lineTo(q2[0] + ox, q2[1] + oy); x.lineTo(p[0] + ox, p[1] + oy); x.fill(); }
      x.fillStyle = `rgb(${v + 8},${v + 2},${v + 10})`; x.beginPath(); b.poly.forEach((p, i) => i ? x.lineTo(p[0] + ox, p[1] + oy) : x.moveTo(p[0] + ox, p[1] + oy)); x.closePath(); x.fill(); x.strokeStyle = 'rgba(255,240,220,.18)'; x.lineWidth = .8; x.stroke(); }
    // naplemente-fény és feliratok
    const sun = x.createLinearGradient(0, 0, WW, WH); sun.addColorStop(0, 'rgba(255,170,90,.13)'); sun.addColorStop(1, 'rgba(60,40,120,.12)'); x.fillStyle = sun; x.fillRect(0, 0, WW, WH);
    x.textAlign = 'center'; x.textBaseline = 'middle'; for (const [lx, ly, t, sz] of S.labels) { x.font = `${sz > 20 ? 800 : 600} ${sz}px Inter, sans-serif`; x.fillStyle = sz > 20 ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.6)'; if (sz <= 20) { x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 2.5; x.strokeText(t, lx, ly); } x.fillText(t, lx, ly); }
    MAP = { cv };
  }
  function draw(g, t) {
    if (!S) return; if (!L || L.W !== G.W || L.H !== G.H) layout(); if (!MAP) buildMap();
    const d = L.d, s = L.s, X = v => L.ox + v * s, Y = v => L.oy + v * s; g.fillStyle = '#0c0a10'; g.fillRect(-20, -20, G.W + 40, G.H + 40);
    g.save(); g.beginPath(); g.rect(0, L.top - 4 * d, G.W, L.vh + 8 * d); g.clip();
    g.drawImage(MAP.cv, L.ox, L.oy, WW * s, WH * s); g.lineCap = 'round'; g.lineJoin = 'round';
    const ln = (e, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(X(S.N[e.a].x), Y(S.N[e.a].y)); g.lineTo(X(S.N[e.b].x), Y(S.N[e.b].y)); g.stroke(); };
    for (const e of S.E) { if (e.stain > .02 && !e.dead) ln(e, (RW + 6) * s, `rgba(110,230,60,${e.stain * .38})`); if (e.cor) { g.setLineDash([10 * s, 8 * s]); g.lineDashOffset = -t * 30 * s; ln(e, 4 * s, 'rgba(108,198,255,.9)'); g.setLineDash([]); } }
    if (S.prot) for (const e of S.E) if (!e.dead && (S.prot[e.a] || S.prot[e.b])) { g.strokeStyle = 'rgba(108,198,255,.3)'; g.lineWidth = (RW + 4) * s; g.beginPath(); let ax = S.N[e.a].x, ay = S.N[e.a].y, bx = S.N[e.b].x, by = S.N[e.b].y; const lb = e.bars.find(b => b.hp > 0); if (lb) { if (S.prot[e.a]) { bx = lb.x; by = lb.y; } else { ax = lb.x; ay = lb.y; } } g.moveTo(X(ax), Y(ay)); g.lineTo(X(bx), Y(by)); g.stroke(); }
    for (const z of S.zones) { g.beginPath(); z.poly.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); if (z.closed) g.closePath(); g.strokeStyle = '#141018'; g.lineWidth = 7 * s; g.stroke(); g.strokeStyle = '#e8b656'; g.lineWidth = 4 * s; g.stroke();
      for (const b of z.bars) { const k = b.hp / b.max; if (b.hp <= 0) { g.fillStyle = '#3a1512'; g.beginPath(); g.arc(X(b.x), Y(b.y), 9 * s, 0, 6.283); g.fill(); continue; } g.fillStyle = b.gate ? '#3ddc6e' : '#ffcf6b'; g.strokeStyle = '#141018'; g.lineWidth = 2 * s; g.beginPath(); g.arc(X(b.x), Y(b.y), (b.gate ? 10 : 8.5) * s, 0, 6.283); g.fill(); g.stroke(); if (k < 1) { g.fillStyle = '#c0392b'; g.fillRect(X(b.x) - 9 * s, Y(b.y) - 15 * s, 18 * s, 3 * s); g.fillStyle = '#7dff4a'; g.fillRect(X(b.x) - 9 * s, Y(b.y) - 15 * s, 18 * s * k, 3 * s); } } }
    if (S.draw) { g.strokeStyle = S.draw.k === 'air' ? '#ff8a7a' : '#ffe29a'; g.lineWidth = 3 * d; g.setLineDash([6 * d, 5 * d]); g.beginPath(); S.draw.pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); g.stroke(); g.setLineDash([]); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const i of S.live) if (S.N[i].hold) { g.font = `${18 * s + 6}px sans-serif`; g.fillText('⛔', X(S.N[i].x), Y(S.N[i].y)); }
    for (const q of S.gas) { const k = Math.min(1, q.t / 3); g.fillStyle = `rgba(170,230,60,${.28 * k})`; for (let j = 0; j < 5; j++) { g.beginPath(); g.arc(X(q.x + Math.cos(j * 1.3 + t) * q.r * .35), Y(q.y + Math.sin(j * 1.7 + t * .8) * q.r * .35), q.r * .7 * s, 0, 6.283); g.fill(); } }
    // egységek
    for (const u of S.units) { const T = TOOL[u.k], r = (u.k === 'mine' ? 5 : 11) * Math.max(s, .55 * d); g.fillStyle = u.k === 'mine' ? '#c0392b' : u.k === 'c4' ? '#e67e22' : T.tab === 1 ? '#10283a' : '#141018'; g.beginPath(); g.arc(X(u.x), Y(u.y), r, 0, 6.283); g.fill();
      if (u.k !== 'mine') { g.strokeStyle = u.k === 'tur' && u.ammo <= 0 ? '#666' : T.tab === 1 ? '#6cc6ff' : '#ffe29a'; g.lineWidth = Math.max(1.5, 2 * s); g.stroke(); g.font = `${r * 1.25}px sans-serif`; g.fillText(T.ic, X(u.x), Y(u.y) + 1); } }
    // hatótáv
    if (S.hover) { const [hx, hy] = S.hover; let u = null, ud = 22; for (const q of S.units) { const dd = Math.hypot(q.x - hx, q.y - hy); if (dd < ud) { ud = dd; u = q; } } const T = u ? TOOL[u.k] : S.phase === 'plan' ? TOOL[S.tool] : null, cx = u ? u.x : hx, cy = u ? u.y : hy, R0 = T && (T.r ? T.r * RUN.rng * (u && u.rm ? u.rm / RUN.rng : 1) : T.R);
      if (R0) { g.strokeStyle = T.r ? 'rgba(255,226,154,.7)' : 'rgba(108,198,255,.7)'; g.lineWidth = 1.5 * d; g.beginPath(); g.arc(X(cx), Y(cy), R0 * s, 0, 6.283); g.stroke(); g.fillStyle = T.r ? 'rgba(255,226,154,.06)' : 'rgba(108,198,255,.06)'; g.fill(); if (T.rmin) { g.beginPath(); g.arc(X(cx), Y(cy), T.rmin * s, 0, 6.283); g.stroke(); } }
      if (S.phase === 'battle' && S.abil && S.abil !== 'air') { g.strokeStyle = '#ff8a7a'; g.lineWidth = 2 * d; g.beginPath(); g.arc(X(hx), Y(hy), ({ mis: 95, gas: 95, heli: 170, para: 60, apc: 30 })[S.abil] * s, 0, 6.283); g.stroke(); } }
    // emberek, zombik
    const rs = Math.max(1.6 * d, 2.6 * s);
    for (const c of S.civs) { g.fillStyle = c.safe ? '#9fd6f5' : c.wait ? '#ffd84a' : '#f3f5f8'; g.fillRect(X(c.x) - rs / 2, Y(c.y) - rs / 2, rs, rs); }
    g.fillStyle = '#7dff4a'; for (const z of S.zs) g.fillRect(X(z.x) - rs * .65, Y(z.y) - rs * .65, rs * 1.3, rs * 1.3);
    for (const q of S.sol) { g.fillStyle = q.cop ? '#5aa0ff' : '#ffd84a'; g.beginPath(); g.arc(X(q.x), Y(q.y), rs * .9, 0, 6.283); g.fill(); g.strokeStyle = '#141018'; g.lineWidth = 1; g.stroke(); }
    for (const a of S.apcs) { g.save(); g.translate(X(a.x), Y(a.y)); g.rotate(a.ang); g.fillStyle = '#4b5a3a'; g.strokeStyle = '#141018'; g.lineWidth = 1.5; rr(-11 * s - 3, -6 * s - 2, 22 * s + 6, 12 * s + 4, 3); g.fill(); g.stroke(); g.fillStyle = '#2f3a24'; g.fillRect(0, -1.5 * s, 14 * s + 3, 3 * s); g.restore(); }
    for (const f of S.fx) { if (f.k === 'shot') { g.strokeStyle = `rgba(${f.col},.8)`; g.lineWidth = Math.max(1, d); g.beginPath(); g.moveTo(X(f.x), Y(f.y)); g.lineTo(X(f.x2), Y(f.y2)); g.stroke(); }
      else if (f.k === 'boom') { const k = 1 - f.l / .5; g.fillStyle = `rgba(255,${180 - k * 120},60,${.75 * (1 - k)})`; g.beginPath(); g.arc(X(f.x), Y(f.y), f.r * s * (.4 + k * .7), 0, 6.283); g.fill(); }
      else if (f.k === 'ring') { const k = 1 - f.l / 1.5; g.strokeStyle = `rgba(125,255,74,${1 - k})`; g.lineWidth = 3 * d; g.beginPath(); g.arc(X(f.x), Y(f.y), (30 + k * 160) * s, 0, 6.283); g.stroke(); }
      else if (f.k === 'lift') { const k = 1 - f.l / 1.6; g.font = `${22 * d}px sans-serif`; g.fillText('🚁', X(f.x), Y(f.y) - k * 50 * d); g.font = `800 ${12 * d}px Inter, sans-serif`; g.fillStyle = '#ffd84a'; g.fillText('+' + f.n, X(f.x) + 22 * d, Y(f.y) - k * 50 * d); } }
    for (const q of S.strikes) { g.strokeStyle = 'rgba(255,90,70,.9)'; g.lineWidth = 2 * d; g.beginPath(); g.arc(X(q.x), Y(q.y), q.r * s, 0, 6.283); g.stroke();
      if (q.plane) { g.font = `${26 * d}px sans-serif`; g.save(); g.translate(X(q.x) + (q.t - .2) * G.W * .8, Y(q.y) - 30 * d); g.scale(-1, 1); g.fillText('✈️', 0, 0); g.restore(); }
      else if (q.mis) { g.font = `${22 * d}px sans-serif`; g.fillText('🚀', X(q.x) + q.t * 240 * d, Y(q.y) - q.t * 240 * d); }
      else if (q.from) { const k = 1 - q.t / .9; g.fillStyle = '#ffb347'; g.beginPath(); g.arc(X(q.from[0] + (q.x - q.from[0]) * k), Y(q.from[1] + (q.y - q.from[1]) * k) - Math.sin(k * Math.PI) * 40 * d, 3 * d, 0, 6.283); g.fill(); } }
    for (const h of S.helis) { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(X(h.x) + 6 * d, Y(h.y) + 10 * d, 12 * d, 5 * d, 0, 0, 6.283); g.fill(); g.font = `${24 * d}px sans-serif`; g.fillText('🚁', X(h.x), Y(h.y)); }
    g.restore();
    // felső sáv
    const prot = S.civs.reduce((a, c) => a + (c.safe ? 1 : 0), 0), alive = S.civs.length + S.evac;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 ${15 * d}px Inter, sans-serif`; g.fillStyle = '#ffe29a'; g.fillText(`${S.m}. küldetés · ${S.name}`, G.W / 2, 66 * d);
    g.font = `600 ${12 * d}px Inter, sans-serif`; g.fillStyle = 'rgba(255,255,255,.85)';
    g.fillText(S.phase === 'plan' ? `💰 ${S.budget}   👥 ${alive} civil   🎯 cél: ${Math.round(S.obj * 100)}% életben` : `👥 ${alive}/${S.n0} (${Math.round(alive / S.n0 * 100)}%, cél ${Math.round(S.obj * 100)}%)   🛡 ${prot}${S.evac ? '   🚁 ' + S.evac : ''}   🧟 ${S.zs.length}`, G.W / 2, 84 * d, G.W - 16 * d);
    // alsó sáv
    g.fillStyle = 'rgba(10,8,14,.97)'; g.fillRect(0, L.barY, G.W, L.barH); g.fillStyle = 'rgba(125,255,74,.35)'; g.fillRect(0, L.barY, G.W, d);
    for (const tb of L.tabs) { const on = S.tab === tb.k; g.fillStyle = on ? 'rgba(232,182,86,.9)' : 'rgba(255,255,255,.07)'; rr(tb.x, tb.y, tb.w, tb.h, tb.h / 2); g.fill(); g.fillStyle = on ? '#1a1004' : '#fff'; g.font = `700 ${Math.min(11, tb.w / d / 9) * d}px Inter, sans-serif`; g.fillText(tb.n, tb.x + tb.w / 2, tb.y + tb.h / 2 + 1); }
    if (L.go) { g.fillStyle = '#7dff4a'; rr(L.go.x, L.go.y, L.go.w, L.go.h, L.go.h / 2); g.fill(); g.fillStyle = '#0b1a05'; g.font = `800 ${12 * d}px Inter, sans-serif`; g.fillText('▶ INDÍTÁS', L.go.x + L.go.w / 2, L.go.y + L.go.h / 2 + 1); }
    for (const it of L.its) { const sel = (it.kind === 'tool' && S.tool === it.k) || (it.kind === 'abil' && S.abil === it.k), lock = it.kind === 'tool' && !unlocked(it), off = (it.kind === 'abil' && S.uses[it.k] <= 0) || lock;
      g.fillStyle = sel ? 'rgba(232,182,86,.28)' : 'rgba(255,255,255,.06)'; g.strokeStyle = sel ? '#e8b656' : 'rgba(255,255,255,.12)'; g.lineWidth = 1.5 * d; rr(it.x + 2 * d, it.y, it.w - 4 * d, it.h, 9 * d); g.fill(); g.stroke();
      g.globalAlpha = off ? .35 : 1; g.font = `${18 * d}px sans-serif`; g.fillStyle = '#fff'; g.fillText(it.ic, it.x + it.w / 2, it.y + 17 * d);
      g.font = `700 ${Math.min(10, it.w / d / 7.5) * d}px Inter, sans-serif`; g.fillText(it.kind === 'spd' ? (S.speed ? S.speed + '× sebesség' : 'Szünet') : it.n, it.x + it.w / 2, it.y + 34 * d, it.w - 6 * d);
      g.fillStyle = '#ffe29a'; g.fillText(lock ? '🔒 ' + it.u + '. küldetés' : it.kind === 'tool' ? (it.c ? (it.k === 'mor' ? it.c + 50 * S.mort : it.c) + '' : '') : it.kind === 'abil' ? '×' + S.uses[it.k] : '', it.x + it.w / 2, it.y + 46 * d, it.w - 6 * d); g.globalAlpha = 1; }
    const ab = S.abil && ABIL.find(a => a.k === S.abil), line = S.msg && S.msg.l > 0 ? S.msg.t : S.phase === 'plan' && TOOL[S.tool] ? TOOL[S.tool].n + ': ' + TOOL[S.tool].d : ab ? ab.n + ': ' + ab.d : '';
    if (line) { g.font = `600 ${11.5 * d}px Inter, sans-serif`; const w = Math.min(G.W - 12 * d, g.measureText(line).width + 24 * d); g.fillStyle = 'rgba(4,7,14,.9)'; rr((G.W - w) / 2, L.barY - 28 * d, w, 22 * d, 11 * d); g.fill(); g.fillStyle = S.msg && S.msg.l > 0 ? '#ff8a7a' : '#fff'; g.fillText(line, G.W / 2, L.barY - 17 * d, w - 12 * d); }
    if (S.phase === 'res') { const R0 = S.res, B0 = resBox(); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, G.W, G.H);
      g.fillStyle = 'rgba(8,12,22,.97)'; g.strokeStyle = R0.win ? '#7dff4a' : '#ff6a5a'; g.lineWidth = 2 * d; rr(B0.x, B0.y, B0.w, B0.h, 16 * d); g.fill(); g.stroke();
      g.fillStyle = R0.win ? '#7dff4a' : '#ff8a7a'; g.font = `900 ${22 * d}px Inter, sans-serif`; g.fillText(R0.win ? 'A VÁROS MEGMENEKÜLT' : 'A VÁROS ELESETT', G.W / 2, B0.y + 36 * d, B0.w - 20 * d);
      g.fillStyle = '#fff'; g.font = `600 ${13 * d}px Inter, sans-serif`; g.fillText(`Megmentett civilek: ${R0.saved} / ${S.n0} (${Math.round(R0.pct * 100)}%)`, G.W / 2, B0.y + 70 * d);
      g.fillText(R0.win ? `${R0.medal} · Kilőtt zombik: ${S.kills}` : R0.why, G.W / 2, B0.y + 92 * d, B0.w - 20 * d);
      g.fillStyle = '#ffe29a'; g.font = `800 ${18 * d}px Inter, sans-serif`; g.fillText(R0.win ? '+' + R0.pts.toLocaleString('hu-HU') + ' pont' : 'Összesen: ' + RUN.total.toLocaleString('hu-HU') + ' pont', G.W / 2, B0.y + 122 * d);
      if (R0.win) { g.fillStyle = 'rgba(255,255,255,.7)'; g.font = `600 ${12 * d}px Inter, sans-serif`; g.fillText('Válassz fejlesztést a következő városhoz:', G.W / 2, B0.y + 152 * d);
        for (const b of B0.btns) { g.fillStyle = 'rgba(232,182,86,.16)'; g.strokeStyle = '#e8b656'; g.lineWidth = 1.5 * d; rr(b.x, b.y, b.w, b.h, 10 * d); g.fill(); g.stroke(); g.font = `${20 * d}px sans-serif`; g.fillStyle = '#fff'; g.fillText(b.u[2], b.x + b.w / 2, b.y + 20 * d); g.font = `700 ${10.5 * d}px Inter, sans-serif`; g.fillText(b.u[1], b.x + b.w / 2, b.y + 44 * d, b.w - 6 * d); } }
      else { g.fillStyle = 'rgba(255,255,255,.7)'; g.font = `600 ${12 * d}px Inter, sans-serif`; g.fillText('Koppints a befejezéshez', G.W / 2, B0.y + 176 * d); } }
  }
  function resBox() { const d = L.d, w = Math.min(G.W - 24 * d, 380 * d), h = 240 * d, x = (G.W - w) / 2, y = (G.H - h) / 2, bw = (w - 36 * d) / 3; return { x, y, w, h, btns: S.res.pool.map((u, j) => ({ u, x: x + 12 * d + j * (bw + 6 * d), y: y + 168 * d, w: bw, h: 60 * d })) }; }
  const P2 = e => [e.clientX * G.d, e.clientY * G.d];
  window.__hv = () => ({ S, L, RUN, begin, makeZone, place });

  return {
    id: 'holtvaros', name: 'HOLTVÁROS', lives: 0, quit: true, sponsor: 'A Zerosites támogatásával', overTitle: 'A JÁRVÁNY GYŐZÖTT',
    desc: 'Felülről látod Budapestet, és van egy kis időd felkészülni: rajzolj védett zónát, nyiss kapukat, tegyél őrséget az épületekbe, tereld a civileket – aztán kitör a járvány. Irtsd ki az összes zombit, és ments meg minél több civilt.',
    credit: 'A játékmenetet a Jogamedev „Zombies Aren\'t Real” című játéka ihlette.', link: { url: STEAM, label: 'Zombies Aren\'t Real a Steamen ↗' },
    how: 'SZÓKÖZ: INDÍTÁS / SZÜNET · GÖRGŐ / CSÍPÉS: NAGYÍTÁS · JOBB GOMB / KÉT UJJ: MOZGATÁS',
    ranks: [[0, 'Újonc'], [3000, 'Őrmester'], [10000, 'Százados'], [30000, 'Ezredes'], [80000, 'Karantén-parancsnok']],
    init() { RUN = { total: 0, uses: { air: 1, mis: 0, gas: 0, heli: 0, para: 1, apc: 0 }, bud: 1, rng: 1 }; PT.clear(); pinch = panS = null; newMission(1);
      if (!keyOn) { keyOn = 1; const on = () => G.running && G.game && G.game.id === 'holtvaros' && S && L, gc = document.getElementById('gc');
        addEventListener('keydown', e => { if (!on()) return; const pan = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] }[e.key];
          if (e.key === ' ') { e.preventDefault(); if (S.phase === 'plan') begin(); else if (S.phase === 'battle') S.speed = S.speed ? 0 : 1; }
          else if (pan) { e.preventDefault(); L.cam.cx += pan[0] * 80 / L.cam.z; L.cam.cy += pan[1] * 80 / L.cam.z; clampCam(); }
          else if (e.key === 'Tab' && S.phase === 'plan') { e.preventDefault(); S.tab = 1 - S.tab; S.tool = TOOLS.find(t => t.tab === S.tab).k; layout(); }
          else if (S.phase === 'plan' && e.key >= '1' && e.key <= '9') { const it = L.its[+e.key - 1]; if (it) S.tool = it.k; } });
        gc.addEventListener('wheel', e => { if (!on()) return; e.preventDefault(); const [x, y] = P2(e); if (y < L.barY) zoomAt(x, y, Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * .004)); }, { passive: false });
        gc.addEventListener('contextmenu', e => { if (on()) e.preventDefault(); }); } },
    resize() { if (S) { MAP = null; layout(); } },
    down(G2, x, y, e) {
      if (e === true || !S) return; const hit = o => o && x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h;
      if (S.phase === 'res') { if (!S.res.win) return G.end(); const b = resBox().btns.find(hit); if (!b) return; const k = b.u[0]; if (k === 'bud') RUN.bud += .15; else if (k === 'rng') RUN.rng += .1; else RUN.uses[k]++; Sfx.perfect(); return newMission(S.m + 1, S); }
      if (y >= L.barY) { const tb = L.tabs.find(hit); if (tb) { S.tab = tb.k; S.tool = TOOLS.find(t => t.tab === tb.k).k; return layout(); } if (hit(L.go)) return begin();
        const it = L.its.find(hit); if (!it) return; if (it.kind === 'tool') { S.tool = it.k; Sfx.blip(700, .03, 'sine', .04); } else if (it.kind === 'abil') { if (S.uses[it.k] > 0) S.abil = S.abil === it.k ? null : it.k; } else if (it.kind === 'spd') S.speed = S.speed === 0 ? 1 : S.speed === 1 ? 2 : S.speed === 2 ? 4 : 0; return; }
      const id = e && e.pointerId != null ? e.pointerId : 0; PT.set(id, { x, y });
      if (PT.size >= 2) { const [a, b] = [...PT.values()]; S.draw = null; S.tap = null; panS = null; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; return; }
      const [wx, wy] = toW(x, y); S.hover = [wx, wy];
      if (e && (e.button === 1 || e.button === 2)) { panS = { x, y }; return; }
      if (S.phase === 'plan') { if (S.tool === 'zone') S.draw = { k: 'zone', pts: [[wx, wy]] }; else if (S.tool === 'cor') { S.draw = { k: 'cor', pts: [[wx, wy]] }; corridor(wx, wy); } else S.tap = { x, y, wx, wy }; }
      else if (S.phase === 'battle') { if (S.abil === 'air') S.draw = { k: 'air', pts: [[wx, wy]] }; else if (S.abil) useAbil(wx, wy); else panS = { x, y }; }
    },
    move(G2, x, y, btn, e) { if (!S || !L) return; const id = e && e.pointerId != null ? e.pointerId : 0; if (PT.has(id)) PT.set(id, { x, y });
      if (pinch && PT.size >= 2) { const [a, b] = [...PT.values()], dd = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; zoomAt(mx, my, dd / pinch.d); L.cam.cx -= (mx - pinch.mx) / L.s; L.cam.cy -= (my - pinch.my) / L.s; clampCam(); pinch = { d: dd, mx, my }; S.tap = null; return; }
      const [wx, wy] = toW(x, y); S.hover = y < L.barY ? [wx, wy] : null;
      if (panS && btn) { L.cam.cx -= (x - panS.x) / L.s; L.cam.cy -= (y - panS.y) / L.s; panS.x = x; panS.y = y; clampCam(); return; }
      if (S.tap && Math.hypot(x - S.tap.x, y - S.tap.y) > 10 * L.d) { panS = { x, y }; S.tap = null; }
      if (S.draw && btn) { const p = S.draw.pts, q = p[p.length - 1]; if (S.draw.k === 'air') p[1] = [wx, wy]; else if (Math.hypot(wx - q[0], wy - q[1]) > 10) { p.push([wx, wy]); if (S.draw.k === 'cor') corridor(wx, wy); } } },
    up(G2, x, y, e) { if (!S) return; const id = e && e.pointerId != null ? e.pointerId : 0; PT.delete(id); if (pinch) { if (PT.size < 2) pinch = null; S.draw = null; S.tap = null; return; } panS = null;
      if (S.tap) { const t = S.tap; S.tap = null; if (S.phase === 'plan') place(t.wx, t.wy); }
      if (S.draw) { const dr = S.draw; S.draw = null; if (dr.k === 'zone') makeZone(dr.pts); else if (dr.k === 'air') { const a = dr.pts[0], b = dr.pts[1] || a; useAbil(a[0], a[1], b[0], b[1]); } } },
    update(G2, dt) { if (!S) return; if (S.msg) S.msg.l -= dt;
      for (const f of S.fx) f.l -= dt * (S.speed || 1); S.fx = S.fx.filter(f => f.l > 0); if (S.fx.length > 400) S.fx.splice(0, S.fx.length - 400);
      if (S.phase === 'battle') for (let k = 0; k < S.speed && S.phase === 'battle'; k++) tick(dt); },
    draw(g, G2, t) { draw(g, t); },
    art(c, x, t) { const W = c.width, H = c.height; x.fillStyle = '#231f2a'; x.fillRect(0, 0, W, H); x.lineCap = 'round';
      x.strokeStyle = '#1e466b'; x.lineWidth = 26; x.beginPath(); x.moveTo(W * .38, -10); x.quadraticCurveTo(W * .3, H * .5, W * .42, H + 10); x.stroke();
      x.strokeStyle = '#48434f'; x.lineWidth = 5; for (let r = 30; r < 220; r += 38) { x.beginPath(); x.arc(W * .46, H * .5, r, -1.3, 1.3); x.stroke(); } for (let a = -1.2; a <= 1.2; a += .4) { x.beginPath(); x.moveTo(W * .46, H * .5); x.lineTo(W * .46 + Math.cos(a) * 230, H * .5 + Math.sin(a) * 230); x.stroke(); }
      x.strokeStyle = '#7b7f88'; x.lineWidth = 4; for (const y of [.25, .5, .75]) { x.beginPath(); x.moveTo(W * .26, H * y); x.lineTo(W * .46, H * y); x.stroke(); }
      x.strokeStyle = '#e8b656'; x.lineWidth = 3; x.beginPath(); x.ellipse(W * .72, H * .5, 46, 34, .3, 0, 6.283); x.stroke(); x.fillStyle = 'rgba(108,198,255,.12)'; x.fill();
      for (let j = 0; j < 26; j++) { const k = ((t * .1 + j * .04) % 1); x.fillStyle = '#7dff4a'; x.fillRect(W * .02 + k * W * .3 + Math.sin(j * 2.4) * 8, H * (.25 + (j % 3) * .25) + Math.cos(j) * 4, 4, 4); }
      for (let j = 0; j < 14; j++) { x.fillStyle = '#f3f5f8'; x.fillRect(W * .66 + (j * 37 % 100) / 100 * W * .12, H * .36 + (j * 53 % 100) / 100 * H * .28, 3, 3); } }
  };
};
