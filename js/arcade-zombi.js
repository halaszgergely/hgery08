/* HGWS Arcade – Holtváros: felülnézetes zombijárvány-stratégia (klasszikus szkript, az arcade.html tölti be).
   A játékmenetet a Jogamedev „Zombies Aren't Real” című játéka ihlette; a kód és a grafika saját. */
window.HGZombi = function (env) {
  'use strict';
  const { G, Sfx, rr, hud } = env;
  const STEAM = 'https://store.steampowered.com/app/5185890/Zombies_Arent_Real/';
  const ROAD = 0, BLD = 1, WATER = 2, BRIDGE = 3, PARK = 4;
  const CITIES = ['Csaptelep', 'Szikkadtfalva', 'Öntözőváros', 'Slagliget', 'Szórófej-telep', 'Vízmű-negyed', 'Kútfő', 'Locsolóhalom', 'Csőtörés', 'Aranyváros'];
  const TOOLS = [
    { k: 'zone', n: 'Zóna', ic: '🧱', c: 12, d: 'Húzz téglalapot: fal épül köré. Ár faldarabonként.' },
    { k: 'gate', n: 'Kapu', ic: '🚪', c: 20, d: 'Falra tedd: a civilek bejutnak rajta.' },
    { k: 'gar', n: 'Őrség', ic: '🪖', c: 60, d: 'Épületbe. Közepes hatótáv.', on: BLD, r: 5, cd: .25, dmg: 1 },
    { k: 'snp', n: 'Mesterlövész', ic: '🎯', c: 110, d: 'Épületbe. Nagy hatótáv, lassú.', on: BLD, r: 10, cd: 1.1, dmg: 3 },
    { k: 'tur', n: 'Gépágyú', ic: '🔫', c: 150, d: 'Utcára. Gyors tűz, 400 lőszer.', on: ROAD, r: 5.5, cd: .1, dmg: 1, ammo: 400 },
    { k: 'mor', n: 'Aknavető', ic: '💥', c: 200, d: 'Épületbe. Területre lő – a civileket is eltalálja!', on: BLD, r: 13, rmin: 4, cd: 3.5 },
    { k: 'mine', n: 'Akna', ic: '💣', c: 25, d: 'Utcára. Zombira robban.', on: ROAD },
    { k: 'c4', n: 'C4', ic: '🧨', c: 80, d: 'Hídra: a csata elején felrobban.', on: BRIDGE },
    { k: 'del', n: 'Törlés', ic: '❌', c: 0, d: 'Elem visszavétele, teljes áron.' }
  ];
  const TOOL = Object.fromEntries(TOOLS.map(t => [t.k, t]));
  const ABIL = [{ k: 'air', n: 'Légicsapás', ic: '✈️' }, { k: 'heli', n: 'Helikopter', ic: '🚁' }, { k: 'para', n: 'Ejtőernyősök', ic: '🪂' }];
  let S = null, L = null, MAP = null, keyOn = 0, total = 0, mission = 1;

  const rng = seed => { let s = seed % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
  const idx = (c, r) => r * S.cols + c, inb = (c, r) => c >= 0 && r >= 0 && c < S.cols && r < S.rows;
  const walk = t => t === ROAD || t === BRIDGE || t === PARK;
  const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  /* ---------------- város ---------------- */
  function gen(m) {
    const land = G.W >= G.H, cols = land ? 46 : 26, rows = land ? 26 : 40, R = rng(m * 7919 + 13), T = new Uint8Array(cols * rows).fill(BLD), sh = new Float32Array(cols * rows);
    const ix = (c, r) => r * cols + c, av = [], st = [];
    for (let c = 1 + Math.floor(R() * 2); c < cols - 1; c += 3 + Math.floor(R() * 3)) av.push(c);
    for (let r = 1 + Math.floor(R() * 2); r < rows - 1; r += 3 + Math.floor(R() * 3)) st.push(r);
    for (const c of av) for (let r = 0; r < rows; r++) T[ix(c, r)] = ROAD;
    for (const r of st) for (let c = 0; c < cols; c++) T[ix(c, r)] = ROAD;
    for (let i = 0; i < T.length; i++) sh[i] = R();
    // parkok
    for (let k = 0; k < 4 + Math.floor(R() * 3); k++) { const c0 = Math.floor(R() * (cols - 4)), r0 = Math.floor(R() * (rows - 4)); for (let r = r0; r < r0 + 3; r++) for (let c = c0; c < c0 + 3; c++) if (T[ix(c, r)] === BLD) T[ix(c, r)] = PARK; }
    // folyó a rövidebb irányban, hidak csak néhány sugárúton
    const longN = land ? cols : rows, shortN = land ? rows : cols, base = Math.floor(longN * (.35 + R() * .3)), ph = R() * 6, lines = land ? st : av;
    const keep = new Set(); const sel = lines.slice().sort(() => R() - .5).slice(0, Math.max(2, Math.min(3, lines.length))); sel.forEach(v => keep.add(v));
    for (let s = 0; s < shortN; s++) { const o = Math.round(Math.sin(s * .32 + ph) * 1.6); for (let w = 0; w < 2; w++) { const l = base + o + w, c = land ? l : s, r = land ? s : l; if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
        T[ix(c, r)] = keep.has(s) && T[ix(c, r)] !== BLD && T[ix(c, r)] !== PARK ? BRIDGE : WATER; } }
    return { cols, rows, T, sh };
  }
  function newMission(m) {
    const g = gen(m), R = rng(m * 31 + 5);
    S = { ...g, m, phase: 'plan', t: 0, speed: 1, tool: 'zone', abil: null, budget: 600 + 150 * m, W: new Float32Array(g.cols * g.rows), gate: new Uint8Array(g.cols * g.rows), inZ: new Uint8Array(g.cols * g.rows),
      zone: null, units: [], civs: [], zs: [], sol: [], fx: [], stain: new Float32Array(g.cols * g.rows), zF: null, cF: null, fT: 0, uses: { air: 2 + Math.floor(m / 3), heli: 1 + Math.floor(m / 4), para: 1 + Math.floor(m / 2) },
      helis: [], strikes: [], drag: null, hover: -1, res: null, kills: 0, lost: 0, mort: 0 };
    const spots = []; for (let i = 0; i < S.T.length; i++) if (walk(S.T[i])) spots.push(i);
    const n = Math.min(520, 200 + 45 * m);
    for (let k = 0; k < n; k++) { const i = spots[Math.floor(R() * spots.length)], c = i % S.cols, r = Math.floor(i / S.cols); S.civs.push(mk(c, r, R)); }
    S.n0 = n; S.obj = Math.min(.6, .2 + .04 * m); MAP = null; layout();
  }
  const mk = (c, r, R = Math.random) => ({ x: c + .5, y: r + .5, tx: c + .5, ty: r + .5, ox: (R() - .5) * .6, oy: (R() - .5) * .6, hp: 2, cd: R() });

  /* ---------------- elrendezés ---------------- */
  function barItems() {
    if (S.phase === 'plan') return [...TOOLS.map(t => ({ ...t, kind: 'tool' })), { k: 'go', kind: 'go', n: 'INDÍTÁS', ic: '▶' }];
    return [...ABIL.map(a => ({ ...a, kind: 'abil' })), { k: 'spd', kind: 'spd', n: S.speed ? S.speed + '×' : 'Szünet', ic: S.speed ? '⏩' : '⏸' }];
  }
  function layout() {
    const d = G.d, its = barItems(), per = Math.max(4, Math.min(its.length, Math.floor((G.W - 12 * d) / (70 * d)))), rowsN = Math.ceil(its.length / per), bh = 54 * d, barH = rowsN * (bh + 6 * d) + 10 * d;
    const top = 96 * d, availW = G.W - 12 * d, availH = G.H - barH - top - 32 * d, ts = Math.max(4, Math.floor(Math.min(availW / S.cols, availH / S.rows)));
    const iw = Math.min(92 * d, (G.W - 12 * d) / per);
    L = { d, ts, ox: Math.round((G.W - ts * S.cols) / 2), oy: Math.round(top + (availH - ts * S.rows) / 2), barY: G.H - barH, barH, W: G.W, H: G.H,
      its: its.map((it, j) => { const row = Math.floor(j / per), inRow = Math.min(per, its.length - row * per); return { ...it, x: (G.W - iw * inRow) / 2 + (j % per) * iw, y: G.H - barH + 6 * d + row * (bh + 6 * d), w: iw, h: bh }; }) };
    if (MAP && MAP.ts !== ts) MAP = null;
  }
  const tileAt = (x, y) => { const c = Math.floor((x - L.ox) / L.ts), r = Math.floor((y - L.oy) / L.ts); return inb(c, r) ? [c, r] : null; };
  const px = v => L.ox + v * L.ts, py = v => L.oy + v * L.ts;

  /* ---------------- útkeresés ---------------- */
  // többforrású legrövidebb út; wallCost: a falon átjutás költsége (0 = nem járható)
  function field(src, wallCost, gatesOpen) {
    const n = S.cols * S.rows, F = new Float32Array(n).fill(1e9), bk = [[]]; let maxB = 0;
    for (const i of src) if (F[i] > 0) { F[i] = 0; bk[0].push(i); }
    for (let b = 0; b <= maxB; b++) { const q = bk[b]; if (!q) continue;
      for (let h = 0; h < q.length; h++) { const i = q[h]; if (F[i] !== b) continue; const c = i % S.cols, r = (i - c) / S.cols;
        for (const [dc, dr] of D4) { const x = c + dc, y = r + dr; if (!inb(x, y)) continue; const j = idx(x, y); if (!walk(S.T[j])) continue;
          let w = 1; if (S.W[j] > 0) { if (gatesOpen && S.gate[j]) w = 1; else if (wallCost) w = wallCost; else continue; }
          const nb = b + w; if (nb < F[j]) { F[j] = nb; (bk[nb] = bk[nb] || []).push(j); if (nb > maxB) maxB = nb; } } } }
    return F;
  }
  function step(e, F, sp, dt, canPass) {
    const dx = e.tx - e.x, dy = e.ty - e.y, dd = Math.hypot(dx, dy);
    if (dd < .06) { const c = Math.floor(e.x), r = Math.floor(e.y), i0 = idx(c, r); let best = F ? F[i0] : 1e9, cand = [];
      for (const [dc, dr] of D4) { const x = c + dc, y = r + dr; if (!inb(x, y)) continue; const j = idx(x, y); if (!walk(S.T[j])) continue; const v = F ? F[j] : 1e9;
        if (F) { if (v < best - 1e-6) { best = v; cand = [j]; } else if (v === best && cand.length && v < 1e9) cand.push(j); } else cand.push(j); }
      if (!cand.length) return -1; const j = cand[Math.floor(Math.random() * cand.length)];
      if (S.W[j] > 0 && !canPass(j)) return j; e.tx = j % S.cols + .5; e.ty = Math.floor(j / S.cols) + .5; return -1; }
    const st = Math.min(dd, sp * dt); e.x += dx / dd * st; e.y += dy / dd * st; return -1;
  }

  /* ---------------- tervezés ---------------- */
  const ring = (z) => { const o = []; for (let c = z.c0; c <= z.c1; c++) { o.push(idx(c, z.r0)); o.push(idx(c, z.r1)); } for (let r = z.r0 + 1; r < z.r1; r++) { o.push(idx(z.c0, r)); o.push(idx(z.c1, r)); } return o; };
  function clearZone() { if (!S.zone) return; for (const i of ring(S.zone)) if (S.W[i] > 0) { S.budget += TOOL.zone.c + (S.gate[i] ? TOOL.gate.c : 0); S.W[i] = 0; S.gate[i] = 0; } S.inZ.fill(0); S.zone = null; }
  function setZone(z) {
    if (z.c1 - z.c0 < 2 || z.r1 - z.r0 < 2) return say('Legalább 3×3 mező kell.');
    const old = S.zone, oldW = S.W.slice(), oldG = S.gate.slice(), ob = S.budget; clearZone();
    const tiles = ring(z).filter(i => walk(S.T[i])), cost = tiles.length * TOOL.zone.c;
    if (cost > S.budget) { S.W = oldW; S.gate = oldG; S.budget = ob; S.zone = old; if (old) markZone(old); return say('Nincs rá keret: ' + cost + ' kellene.'); }
    S.budget -= cost; for (const i of tiles) S.W[i] = 60; S.zone = z; markZone(z); Sfx.blip(420, .06, 'square', .05);
  }
  function markZone(z) { S.inZ.fill(0); for (let r = z.r0 + 1; r < z.r1; r++) for (let c = z.c0 + 1; c < z.c1; c++) S.inZ[idx(c, r)] = 1; }
  function say(t) { S.msg = { t, l: 2.5 }; Sfx.blip(150, .08, 'square', .05); }
  function place(c, r) {
    const i = idx(c, r), t = S.tool, T = TOOL[t], here = S.units.findIndex(u => u.i === i);
    if (t === 'del') { if (here >= 0) { S.budget += S.units[here].paid; S.units.splice(here, 1); Sfx.blip(250, .05, 'square', .05); } else if (S.gate[i]) { S.gate[i] = 0; S.W[i] = 60; S.budget += TOOL.gate.c; } else if (S.W[i] > 0) clearZone(); return; }
    if (t === 'gate') { if (!(S.W[i] > 0)) return say('Kaput csak falra tehetsz.'); if (S.gate[i]) return; if (S.budget < T.c) return say('Nincs rá keret.'); S.budget -= T.c; S.gate[i] = 1; S.W[i] = 25; return Sfx.blip(520, .05, 'triangle', .05); }
    if (here >= 0) return; const tt = S.T[i];
    const ok = T.on === BLD ? tt === BLD : T.on === BRIDGE ? tt === BRIDGE : (tt === ROAD || tt === PARK || tt === BRIDGE) && !(S.W[i] > 0);
    if (!ok) return say(T.on === BLD ? 'Ezt épületbe kell tenni.' : T.on === BRIDGE ? 'Ezt hídra kell tenni.' : 'Ezt utcára kell tenni.');
    const cost = T.c + (t === 'mor' ? 50 * S.mort : 0); if (S.budget < cost) return say('Nincs rá keret.');
    S.budget -= cost; if (t === 'mor') S.mort++; S.units.push({ k: t, i, x: c + .5, y: r + .5, cd: Math.random(), ammo: T.ammo || 0, paid: cost }); Sfx.blip(600, .04, 'triangle', .05);
  }

  /* ---------------- csata ---------------- */
  function begin() {
    S.phase = 'battle'; S.speed = 1; S.tool = null; Sfx.perfect();
    for (const u of S.units.filter(u => u.k === 'c4')) { for (const [dc, dr] of [[0, 0], ...D4]) { const c = u.i % S.cols + dc, r = Math.floor(u.i / S.cols) + dr; if (inb(c, r) && S.T[idx(c, r)] === BRIDGE) S.T[idx(c, r)] = WATER; } boom(u.x, u.y, 1.6, false); }
    S.units = S.units.filter(u => u.k !== 'c4'); MAP = null;
    // a vízbe került civilek partra kerülnek (nem vesznek el)
    S.civs = S.civs.filter(c => walk(S.T[idx(Math.floor(c.x), Math.floor(c.y))]));
    const gates = []; for (let i = 0; i < S.gate.length; i++) if (S.gate[i]) gates.push(i); const inside = []; for (let i = 0; i < S.inZ.length; i++) if (S.inZ[i] && walk(S.T[i])) inside.push(i);
    S.cF = gates.length && inside.length ? field(inside, 0, true) : null;
    // kitörések: a zónától távol
    const zc = S.zone ? [(S.zone.c0 + S.zone.c1) / 2, (S.zone.r0 + S.zone.r1) / 2] : [S.cols / 2, S.rows / 2], cand = [];
    for (let i = 0; i < S.T.length; i++) if (walk(S.T[i]) && !S.inZ[i] && !(S.W[i] > 0)) { const c = i % S.cols, r = Math.floor(i / S.cols); cand.push([Math.hypot(c - zc[0], r - zc[1]) + Math.random() * 6, c, r]); }
    cand.sort((a, b) => b[0] - a[0]); const sites = 2 + Math.min(4, Math.floor(S.m / 2)), per = 5 + 2 * S.m;
    for (let k = 0; k < sites; k++) { const [, c, r] = cand[Math.floor(k * cand.length * .12 / sites + Math.random() * 8)] || cand[0];
      for (let j = 0; j < per; j++) S.zs.push(mk(c, r)); S.fx.push({ k: 'ring', x: c + .5, y: r + .5, l: 1.5 }); }
    layout(); refield();
  }
  function refield() { const src = new Set(); for (const c of S.civs) src.add(idx(Math.floor(c.x), Math.floor(c.y))); for (const s of S.sol) src.add(idx(Math.floor(s.x), Math.floor(s.y))); S.zF = src.size ? field(src, 12, false) : null; }
  function boom(x, y, rad, hurtAll = true) {
    S.fx.push({ k: 'boom', x, y, r: rad, l: .5 }); G.shake = Math.max(G.shake, 6 * G.d); Sfx.boom && Sfx.blip(90, .25, 'sawtooth', .08, .4);
    const hit = e => Math.hypot(e.x - x, e.y - y) <= rad; for (const z of S.zs) if (!z.dead && hit(z)) { z.dead = 1; S.kills++; }
    if (hurtAll) { const c0 = S.civs.length; S.civs = S.civs.filter(c => !hit(c)); S.lost += c0 - S.civs.length; S.sol = S.sol.filter(s => !hit(s)); }
  }
  function nearestZ(x, y, r, rmin = 0) { let b = null, bd = r * r; for (const z of S.zs) { if (z.dead) continue; const d2 = (z.x - x) ** 2 + (z.y - y) ** 2; if (d2 < bd && d2 >= rmin * rmin) { bd = d2; b = z; } } return b; }
  function shoot(x, y, z, dmg, col) { z.hp -= dmg; S.fx.push({ k: 'shot', x, y, x2: z.x + z.ox * .5, y2: z.y + z.oy * .5, l: .08, col }); if (z.hp <= 0) { z.dead = 1; S.kills++; } }
  function tick(dt) {
    S.t += dt; if ((S.fT -= dt) <= 0) { S.fT = .4; refield(); }
    const buckets = new Map(); for (const c of S.civs) { const i = idx(Math.floor(c.x), Math.floor(c.y)); (buckets.get(i) || buckets.set(i, []).get(i)).push(c); }
    const sb = new Map(); for (const s of S.sol) { const i = idx(Math.floor(s.x), Math.floor(s.y)); (sb.get(i) || sb.set(i, []).get(i)).push(s); }
    // zombik
    const born = [], wd = new Map();
    for (const z of S.zs) { if (z.dead) continue; const i = idx(Math.floor(z.x), Math.floor(z.y)); S.stain[i] = Math.min(1, S.stain[i] + dt * .15);
      const m = S.units.find(u => u.k === 'mine' && u.i === i && !u.dead); if (m) { m.dead = 1; boom(m.x, m.y, 1.5); if (z.dead) continue; }
      if ((z.cd -= dt) <= 0) { const vict = buckets.get(i); if (vict && vict.length) { const v = vict.pop(); v.bit = 1; born.push(v); z.cd = .9; continue; }
        const sv = sb.get(i); if (sv && sv.length) { const v = sv.pop(); v.bit = 1; born.push(v); z.cd = .9; continue; } }
      const blk = step(z, S.zF, Math.min(1.7, 1.16 + S.m * .05), dt, () => false); if (blk >= 0) wd.set(blk, (wd.get(blk) || 0) + 1); }
    for (const [blk, n] of wd) { S.W[blk] -= dt * .6 * Math.min(4, n); if (S.W[blk] <= 0) { S.W[blk] = 0; S.gate[blk] = 0; S.fx.push({ k: 'boom', x: blk % S.cols + .5, y: Math.floor(blk / S.cols) + .5, r: .8, l: .4 }); Sfx.hit(); } }
    S.zs = S.zs.filter(z => !z.dead); S.units = S.units.filter(u => !u.dead);
    if (born.length) { S.civs = S.civs.filter(c => !c.bit); S.sol = S.sol.filter(s => !s.bit); for (const v of born) { S.lost++; S.zs.push({ ...mk(Math.floor(v.x), Math.floor(v.y)), x: v.x, y: v.y, cd: 1.2 }); } }
    // civilek
    for (const c of S.civs) { const i = idx(Math.floor(c.x), Math.floor(c.y)), safe = S.inZ[i];
      if (safe) { if ((c.cd -= dt) <= 0) { c.cd = 1 + Math.random() * 3; const o = D4[Math.floor(Math.random() * 4)], x = Math.floor(c.x) + o[0], y = Math.floor(c.y) + o[1]; if (inb(x, y) && S.inZ[idx(x, y)] && walk(S.T[idx(x, y)])) { c.tx = x + .5; c.ty = y + .5; } } const dx = c.tx - c.x, dy = c.ty - c.y, dd = Math.hypot(dx, dy); if (dd > .06) { c.x += dx / dd * Math.min(dd, .5 * dt); c.y += dy / dd * Math.min(dd, .5 * dt); } }
      else if (S.cF && S.cF[i] < 1e9) step(c, S.cF, S.zF && S.zF[i] !== undefined && nearZ(c) ? 1.3 : .9, dt, j => S.gate[j]);
      else if (nearZ(c)) fleeStep(c, dt); }
    // egységek
    for (const u of S.units) { const T = TOOL[u.k]; if (!T.r || (u.cd -= dt) > 0) continue;
      if (u.k === 'mor') { const z = nearestZ(u.x, u.y, T.r, T.rmin); if (z) { u.cd = T.cd; S.strikes.push({ x: z.x, y: z.y, t: .9, r: 1.6, from: [u.x, u.y] }); } continue; }
      if (u.k === 'tur' && u.ammo <= 0) continue; const z = nearestZ(u.x, u.y, T.r); if (z) { u.cd = T.cd; if (u.k === 'tur') u.ammo--; shoot(u.x, u.y, z, T.dmg, u.k === 'snp' ? '255,255,255' : '255,220,120'); } }
    for (const s of S.sol) if ((s.cd -= dt) <= 0) { const z = nearestZ(s.x, s.y, 3.5); if (z) { s.cd = .35; shoot(s.x, s.y, z, 1, '255,240,150'); } }
    for (const h of S.helis) { h.t -= dt; h.a += dt * 1.2; h.x = h.cx + Math.cos(h.a) * 2.2; h.y = h.cy + Math.sin(h.a) * 2.2; if ((h.cd -= dt) <= 0) { const z = nearestZ(h.x, h.y, 5.5); if (z) { h.cd = .1; shoot(h.x, h.y, z, 1, '255,160,90'); } } }
    S.helis = S.helis.filter(h => h.t > 0);
    for (const st of S.strikes) if ((st.t -= dt) <= 0) boom(st.x, st.y, st.r);
    S.strikes = S.strikes.filter(s => s.t > 0); S.zs = S.zs.filter(z => !z.dead);
    // vége?
    const alive = S.civs.length, need = Math.ceil(S.n0 * S.obj);
    if (alive < need) return finish(false, 'Túl kevés civil maradt életben.');
    if (!S.zs.length && !S.strikes.length && S.t > 1) finish(true);
  }
  const nearZ = c => { const i = idx(Math.floor(c.x), Math.floor(c.y)); return S.zF && S.zF[i] !== undefined && zDist(c) < 5; };
  function zDist(c) { let b = 99; for (const z of S.zs) { const d = Math.abs(z.x - c.x) + Math.abs(z.y - c.y); if (d < b) { b = d; if (b < 2) break; } } return b; }
  function fleeStep(c, dt) { const dx = c.tx - c.x, dy = c.ty - c.y, dd = Math.hypot(dx, dy);
    if (dd < .06) { let best = -1, bj = -1; const cc = Math.floor(c.x), cr = Math.floor(c.y); for (const [dc, dr] of D4) { const x = cc + dc, y = cr + dr; if (!inb(x, y)) continue; const j = idx(x, y); if (!walk(S.T[j]) || S.W[j] > 0) continue; let near = 99; for (const z of S.zs) { const d = Math.abs(z.x - x - .5) + Math.abs(z.y - y - .5); if (d < near) near = d; } if (near > best) { best = near; bj = j; } }
      if (bj >= 0) { c.tx = bj % S.cols + .5; c.ty = Math.floor(bj / S.cols) + .5; } return; }
    const st = Math.min(dd, 1.25 * dt); c.x += dx / dd * st; c.y += dy / dd * st; }
  function finish(win, why) {
    const saved = S.civs.length, pct = saved / S.n0, pts = win ? Math.round(saved * 10 * S.m + S.budget + (pct > .8 ? 500 * S.m : pct > .6 ? 200 * S.m : 0)) : 0;
    S.phase = 'res'; S.res = { win, why, saved, pct, pts, medal: pct > .8 ? '💎 Gyémánt' : pct > .6 ? '🥇 Arany' : pct > .4 ? '🥈 Ezüst' : '🥉 Bronz' };
    if (win) { total += pts; G.score = total; hud(); Sfx.perfect(); } else Sfx.hit();
  }
  function useAbil(c, r) {
    const a = S.abil; if (!a || S.uses[a] <= 0) return; S.uses[a]--; S.abil = null;
    if (a === 'air') { S.strikes.push({ x: c + .5, y: r + .5, t: 1.1, r: 2.6, plane: 1 }); Sfx.blip(300, .4, 'sawtooth', .05, .5); }
    else if (a === 'heli') S.helis.push({ cx: c + .5, cy: r + .5, x: c + .5, y: r + .5, a: 0, t: 25, cd: 0 });
    else { let n = 0; for (let k = 0; k < 30 && n < 5; k++) { const x = c + Math.round((Math.random() - .5) * 4), y = r + Math.round((Math.random() - .5) * 4); if (inb(x, y) && walk(S.T[idx(x, y)]) && !(S.W[idx(x, y)] > 0)) { S.sol.push(mk(x, y)); n++; } } Sfx.blip(700, .1, 'triangle', .05); }
  }

  /* ---------------- rajz ---------------- */
  function buildMap() {
    const ts = L.ts, cv = document.createElement('canvas'); cv.width = ts * S.cols; cv.height = ts * S.rows; const x = cv.getContext('2d');
    for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) { const i = idx(c, r), t = S.T[i], X = c * ts, Y = r * ts, s = S.sh[i];
      if (t === BLD) { const v = 46 + Math.floor(s * 34); x.fillStyle = '#14181f'; x.fillRect(X, Y, ts, ts); x.fillStyle = `rgb(${v + 8},${v + 12},${v + 22})`; x.fillRect(X + 1, Y + 1, ts - 2, ts - 2);
        x.fillStyle = 'rgba(255,255,255,.1)'; x.fillRect(X + 1, Y + 1, ts - 2, Math.max(1, ts * .14)); x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(X + 1, Y + ts - 1 - Math.max(1, ts * .16), ts - 2, Math.max(1, ts * .16));
        if (ts >= 10 && s > .5) { x.fillStyle = 'rgba(255,226,154,.35)'; x.fillRect(X + ts * .25, Y + ts * .4, ts * .14, ts * .14); x.fillRect(X + ts * .6, Y + ts * .4, ts * .14, ts * .14); } }
      else if (t === WATER) { x.fillStyle = s > .5 ? '#16395c' : '#143454'; x.fillRect(X, Y, ts, ts); if (s > .7) { x.fillStyle = 'rgba(160,210,255,.12)'; x.fillRect(X + ts * .2, Y + ts * .5, ts * .5, Math.max(1, ts * .08)); } }
      else if (t === PARK) { x.fillStyle = s > .5 ? '#1f4a2a' : '#1b4226'; x.fillRect(X, Y, ts, ts); if (s > .6) { x.fillStyle = '#2f6b3a'; x.beginPath(); x.arc(X + ts * .5, Y + ts * .5, ts * .28, 0, 6.283); x.fill(); } }
      else { x.fillStyle = t === BRIDGE ? '#5a5f68' : '#1d222a'; x.fillRect(X, Y, ts, ts); if (t === BRIDGE) { x.fillStyle = '#8a9099'; x.fillRect(X, Y, ts, Math.max(1, ts * .12)); x.fillRect(X, Y + ts - Math.max(1, ts * .12), ts, Math.max(1, ts * .12)); } else if (ts >= 8) { x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(X + ts * .45, Y + ts * .45, ts * .1, ts * .1); } } }
    MAP = { cv, ts };
  }
  function draw(g, t) {
    if (!S) return; if (!L || L.W !== G.W || L.H !== G.H) layout(); if (!MAP) buildMap();
    const d = L.d, ts = L.ts; g.fillStyle = '#080b10'; g.fillRect(-20, -20, G.W + 40, G.H + 40);
    g.drawImage(MAP.cv, L.ox, L.oy);
    for (let i = 0; i < S.stain.length; i++) { const v = S.stain[i]; if (v > .02) { g.fillStyle = `rgba(110,220,60,${v * .3})`; g.fillRect(px(i % S.cols), py(Math.floor(i / S.cols)), ts, ts); } }
    if (S.zone) { const z = S.zone; g.fillStyle = 'rgba(108,198,255,.1)'; g.fillRect(px(z.c0 + 1), py(z.r0 + 1), (z.c1 - z.c0 - 1) * ts, (z.r1 - z.r0 - 1) * ts); }
    for (let i = 0; i < S.W.length; i++) if (S.W[i] > 0) { const X = px(i % S.cols), Y = py(Math.floor(i / S.cols)), k = S.W[i] / (S.gate[i] ? 25 : 60); g.fillStyle = S.gate[i] ? `rgba(110,220,130,${.5 + .5 * k})` : `rgba(232,182,86,${.45 + .55 * k})`; g.fillRect(X + 1, Y + 1, ts - 2, ts - 2); g.strokeStyle = '#0b0e13'; g.lineWidth = 1; g.strokeRect(X + 1.5, Y + 1.5, ts - 3, ts - 3); }
    if (S.drag) { const z = S.drag; g.strokeStyle = '#ffe29a'; g.lineWidth = 2 * d; g.setLineDash([6 * d, 4 * d]); g.strokeRect(px(Math.min(z.c0, z.c1)), py(Math.min(z.r0, z.r1)), (Math.abs(z.c1 - z.c0) + 1) * ts, (Math.abs(z.r1 - z.r0) + 1) * ts); g.setLineDash([]); }
    // egységek
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const u of S.units) { const X = px(u.x), Y = py(u.y), T = TOOL[u.k]; g.fillStyle = u.k === 'mine' ? '#c0392b' : u.k === 'c4' ? '#e67e22' : '#0b0e13'; g.beginPath(); g.arc(X, Y, ts * (u.k === 'mine' ? .22 : .42), 0, 6.283); g.fill();
      if (u.k !== 'mine') { g.strokeStyle = u.k === 'tur' && u.ammo <= 0 ? '#666' : '#ffe29a'; g.lineWidth = Math.max(1, ts * .1); g.stroke(); g.font = `${Math.max(7, ts * .55)}px sans-serif`; g.fillText(T.ic, X, Y + 1); } }
    // hatótáv a kijelölt eszközhöz / egységhez
    if (S.hover >= 0) { const hc = S.hover % S.cols + .5, hr = Math.floor(S.hover / S.cols) + .5, u = S.units.find(u => u.i === S.hover), T = u ? TOOL[u.k] : S.phase === 'plan' ? TOOL[S.tool] : null;
      if (T && T.r) { g.strokeStyle = 'rgba(255,226,154,.6)'; g.lineWidth = 1.5 * d; g.beginPath(); g.arc(px(hc), py(hr), T.r * ts, 0, 6.283); g.stroke(); g.fillStyle = 'rgba(255,226,154,.06)'; g.fill(); if (T.rmin) { g.beginPath(); g.arc(px(hc), py(hr), T.rmin * ts, 0, 6.283); g.stroke(); } }
      if (S.phase === 'battle' && S.abil) { g.strokeStyle = '#ff8a7a'; g.lineWidth = 2 * d; g.beginPath(); g.arc(px(hc), py(hr), (S.abil === 'air' ? 2.6 : S.abil === 'heli' ? 5.5 : 2) * ts, 0, 6.283); g.stroke(); } }
    // emberek, zombik
    const rs = Math.max(1.2, ts * .16);
    for (const c of S.civs) { g.fillStyle = S.inZ[idx(Math.floor(c.x), Math.floor(c.y))] ? '#9fd6f5' : '#f3f5f8'; g.fillRect(px(c.x + c.ox * .5) - rs / 2, py(c.y + c.oy * .5) - rs / 2, rs, rs); }
    g.fillStyle = '#7dff4a'; for (const z of S.zs) { g.fillRect(px(z.x + z.ox * .5) - rs * .65, py(z.y + z.oy * .5) - rs * .65, rs * 1.3, rs * 1.3); }
    for (const s of S.sol) { g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(px(s.x), py(s.y), rs, 0, 6.283); g.fill(); g.strokeStyle = '#0b0e13'; g.lineWidth = 1; g.stroke(); }
    // effektek
    for (const f of S.fx) { if (f.k === 'shot') { g.strokeStyle = `rgba(${f.col},.8)`; g.lineWidth = Math.max(1, d); g.beginPath(); g.moveTo(px(f.x), py(f.y)); g.lineTo(px(f.x2), py(f.y2)); g.stroke(); }
      else if (f.k === 'boom') { const k = 1 - f.l / .5; g.fillStyle = `rgba(255,${180 - k * 120},60,${.75 * (1 - k)})`; g.beginPath(); g.arc(px(f.x), py(f.y), f.r * ts * (.4 + k * .7), 0, 6.283); g.fill(); }
      else if (f.k === 'ring') { const k = 1 - f.l / 1.5; g.strokeStyle = `rgba(125,255,74,${1 - k})`; g.lineWidth = 3 * d; g.beginPath(); g.arc(px(f.x), py(f.y), ts * (1 + k * 5), 0, 6.283); g.stroke(); } }
    for (const s of S.strikes) { g.strokeStyle = 'rgba(255,90,70,.9)'; g.lineWidth = 2 * d; g.beginPath(); g.arc(px(s.x), py(s.y), s.r * ts, 0, 6.283); g.stroke(); g.beginPath(); g.moveTo(px(s.x) - 6 * d, py(s.y)); g.lineTo(px(s.x) + 6 * d, py(s.y)); g.moveTo(px(s.x), py(s.y) - 6 * d); g.lineTo(px(s.x), py(s.y) + 6 * d); g.stroke();
      if (s.plane) { const X = px(s.x) + (s.t - .2) * G.W * .9, Y = py(s.y) - 30 * d; g.font = `${26 * d}px sans-serif`; g.save(); g.translate(X, Y); g.scale(-1, 1); g.fillText('✈️', 0, 0); g.restore(); }
      else if (s.from) { const k = 1 - s.t / .9, X = px(s.from[0] + (s.x - s.from[0]) * k), Y = py(s.from[1] + (s.y - s.from[1]) * k) - Math.sin(k * Math.PI) * 40 * d; g.fillStyle = '#ffb347'; g.beginPath(); g.arc(X, Y, 3 * d, 0, 6.283); g.fill(); } }
    for (const h of S.helis) { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(px(h.x) + 6 * d, py(h.y) + 10 * d, 12 * d, 5 * d, 0, 0, 6.283); g.fill(); g.font = `${24 * d}px sans-serif`; g.fillText('🚁', px(h.x), py(h.y)); }
    // felső sáv
    const prot = S.civs.reduce((a, c) => a + (S.inZ[idx(Math.floor(c.x), Math.floor(c.y))] ? 1 : 0), 0), alive = S.civs.length;
    g.font = `800 ${15 * d}px Inter, sans-serif`; g.fillStyle = '#ffe29a'; g.fillText(`${S.m}. küldetés · ${CITIES[(S.m - 1) % CITIES.length]}`, G.W / 2, 66 * d);
    g.font = `600 ${12 * d}px Inter, sans-serif`; g.fillStyle = 'rgba(255,255,255,.85)';
    g.fillText(S.phase === 'plan' ? `💰 ${S.budget}   👥 ${alive} civil   🎯 cél: ${Math.round(S.obj * 100)}% életben` : `👥 ${alive}/${S.n0} (${Math.round(alive / S.n0 * 100)}%, cél ${Math.round(S.obj * 100)}%)   🛡 ${prot}   🧟 ${S.zs.length}`, G.W / 2, 84 * d, G.W - 16 * d);
    // alsó sáv
    g.fillStyle = 'rgba(8,11,16,.96)'; g.fillRect(0, L.barY, G.W, L.barH); g.fillStyle = 'rgba(125,255,74,.35)'; g.fillRect(0, L.barY, G.W, d);
    for (const it of L.its) { const sel = (it.kind === 'tool' && S.tool === it.k) || (it.kind === 'abil' && S.abil === it.k), off = it.kind === 'abil' && S.uses[it.k] <= 0;
      g.fillStyle = it.kind === 'go' ? 'rgba(125,255,74,.85)' : sel ? 'rgba(232,182,86,.28)' : 'rgba(255,255,255,.06)'; g.strokeStyle = sel ? '#e8b656' : 'rgba(255,255,255,.12)'; g.lineWidth = 1.5 * d; rr(it.x + 2 * d, it.y, it.w - 4 * d, it.h, 9 * d); g.fill(); g.stroke();
      g.globalAlpha = off ? .35 : 1; g.font = `${18 * d}px sans-serif`; g.fillStyle = it.kind === 'go' ? '#0b1a05' : '#fff'; g.fillText(it.ic, it.x + it.w / 2, it.y + 17 * d);
      g.font = `700 ${Math.min(10, it.w / d / 7.5) * d}px Inter, sans-serif`; g.fillText(it.kind === 'spd' ? (S.speed ? S.speed + '× sebesség' : 'Szünet') : it.n, it.x + it.w / 2, it.y + 34 * d, it.w - 6 * d);
      g.fillStyle = it.kind === 'go' ? '#0b1a05' : '#ffe29a'; g.fillText(it.kind === 'tool' ? (it.c ? (it.k === 'mor' ? it.c + 50 * S.mort : it.c) + '' : '') : it.kind === 'abil' ? '×' + S.uses[it.k] : '', it.x + it.w / 2, it.y + 46 * d); g.globalAlpha = 1; }
    const line = S.msg && S.msg.l > 0 ? S.msg.t : S.phase === 'plan' && TOOL[S.tool] ? TOOL[S.tool].n + ': ' + TOOL[S.tool].d : S.phase === 'battle' && S.abil ? 'Koppints a térképre a bevetéshez.' : '';
    if (line) { g.font = `600 ${11.5 * d}px Inter, sans-serif`; const w = Math.min(G.W - 12 * d, g.measureText(line).width + 24 * d); g.fillStyle = 'rgba(4,7,14,.9)'; rr((G.W - w) / 2, L.barY - 28 * d, w, 22 * d, 11 * d); g.fill(); g.fillStyle = S.msg && S.msg.l > 0 ? '#ff8a7a' : '#fff'; g.fillText(line, G.W / 2, L.barY - 17 * d, w - 12 * d); }
    if (S.phase === 'res') { const R0 = S.res, w = Math.min(G.W - 30 * d, 360 * d), h = 210 * d, X = (G.W - w) / 2, Y = (G.H - h) / 2; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, G.W, G.H);
      g.fillStyle = 'rgba(8,12,22,.97)'; g.strokeStyle = R0.win ? '#7dff4a' : '#ff6a5a'; g.lineWidth = 2 * d; rr(X, Y, w, h, 16 * d); g.fill(); g.stroke();
      g.fillStyle = R0.win ? '#7dff4a' : '#ff8a7a'; g.font = `900 ${22 * d}px Inter, sans-serif`; g.fillText(R0.win ? 'A VÁROS MEGMENEKÜLT' : 'A VÁROS ELESETT', G.W / 2, Y + 36 * d, w - 20 * d);
      g.fillStyle = '#fff'; g.font = `600 ${13 * d}px Inter, sans-serif`; g.fillText(`Megmentett civilek: ${R0.saved} / ${S.n0} (${Math.round(R0.pct * 100)}%)`, G.W / 2, Y + 72 * d);
      g.fillText(R0.win ? `${R0.medal} · Kilőtt zombik: ${S.kills}` : R0.why, G.W / 2, Y + 96 * d, w - 20 * d);
      g.fillStyle = '#ffe29a'; g.font = `800 ${18 * d}px Inter, sans-serif`; g.fillText(R0.win ? '+' + R0.pts.toLocaleString('hu-HU') + ' pont' : 'Összesen: ' + total.toLocaleString('hu-HU') + ' pont', G.W / 2, Y + 130 * d);
      g.fillStyle = 'rgba(255,255,255,.7)'; g.font = `600 ${12 * d}px Inter, sans-serif`; g.fillText(R0.win ? 'Koppints a következő városhoz' : 'Koppints a befejezéshez', G.W / 2, Y + 176 * d); }
  }

  window.__hv = () => S;
  return {
    id: 'holtvaros', name: 'HOLTVÁROS', lives: 0, quit: true, sponsor: 'A Zerosites támogatásával', overTitle: 'A JÁRVÁNY GYŐZÖTT',
    desc: 'Felülről látod a várost, és van egy kis időd felkészülni: húzz védett zónát, nyiss kapukat, tegyél őrséget az épületekbe – aztán kitör a járvány. Irtsd ki az összes zombit, és ments meg minél több civilt.',
    credit: 'A játékmenetet a Jogamedev „Zombies Aren\'t Real” című játéka ihlette.', link: { url: STEAM, label: 'Zombies Aren\'t Real a Steamen ↗' },
    how: 'TERVEZZ · SZÓKÖZ: INDÍTÁS / SZÜNET · 1–9: ESZKÖZÖK',
    ranks: [[0, 'Újonc'], [3000, 'Őrmester'], [10000, 'Százados'], [30000, 'Ezredes'], [80000, 'Karantén-parancsnok']],
    init() { total = 0; mission = 1; newMission(1);
      if (!keyOn) { keyOn = 1; addEventListener('keydown', e => { if (!G.running || !G.game || G.game.id !== 'holtvaros' || !S) return;
        if (e.key === ' ') { e.preventDefault(); if (S.phase === 'plan') begin(); else if (S.phase === 'battle') S.speed = S.speed ? 0 : 1; }
        else if (S.phase === 'plan' && e.key >= '1' && e.key <= '9') S.tool = TOOLS[+e.key - 1].k; }); } },
    resize() { if (S) layout(); }, dbg: () => S,
    down(G2, x, y, e) {
      if (e === true || !S) return;
      if (S.phase === 'res') { if (S.res.win) { mission++; newMission(mission); } else G.end(); return; }
      if (y >= L.barY) { const it = L.its.find(o => x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h); if (!it) return;
        if (it.kind === 'tool') { S.tool = it.k; Sfx.blip(700, .03, 'sine', .04); } else if (it.kind === 'go') begin();
        else if (it.kind === 'abil') { if (S.uses[it.k] > 0) S.abil = S.abil === it.k ? null : it.k; } else if (it.kind === 'spd') S.speed = S.speed === 0 ? 1 : S.speed === 1 ? 2 : S.speed === 2 ? 4 : 0;
        return; }
      const tl = tileAt(x, y); if (!tl) return; const [c, r] = tl; S.hover = idx(c, r);
      if (S.phase === 'plan') { if (S.tool === 'zone') S.drag = { c0: c, r0: r, c1: c, r1: r }; else place(c, r); }
      else if (S.phase === 'battle' && S.abil) useAbil(c, r);
    },
    move(G2, x, y, btn) { if (!S || !L) return; const tl = y < L.barY ? tileAt(x, y) : null; S.hover = tl ? idx(tl[0], tl[1]) : -1; if (S.drag && btn && tl) { S.drag.c1 = tl[0]; S.drag.r1 = tl[1]; } },
    up() { if (S && S.drag) { const z = S.drag; S.drag = null; setZone({ c0: Math.min(z.c0, z.c1), c1: Math.max(z.c0, z.c1), r0: Math.min(z.r0, z.r1), r1: Math.max(z.r0, z.r1) }); } },
    update(G2, dt) { if (!S) return; if (S.msg) S.msg.l -= dt;
      for (const f of S.fx) f.l -= dt * (S.speed || 1); S.fx = S.fx.filter(f => f.l > 0); if (S.fx.length > 400) S.fx.splice(0, S.fx.length - 400);
      if (S.phase === 'battle') for (let k = 0; k < S.speed && S.phase === 'battle'; k++) tick(dt); },
    draw(g, G2, t) { draw(g, t); },
    art(c, x, t) { const W = c.width, H = c.height; x.fillStyle = '#0b0e13'; x.fillRect(0, 0, W, H); const s = 20;
      for (let r = 0; r < H / s; r++) for (let q = 0; q < W / s; q++) { const road = q % 4 === 1 || r % 3 === 1; x.fillStyle = road ? '#1d222a' : `rgb(${52 + (q * 7 + r * 13) % 30},${58 + (q * 7 + r * 13) % 30},${70 + (q * 7 + r * 13) % 30})`; x.fillRect(q * s + 1, r * s + 1, s - 2, s - 2); }
      x.strokeStyle = '#e8b656'; x.lineWidth = 3; x.strokeRect(W * .55, H * .2, W * .3, H * .5); x.fillStyle = 'rgba(108,198,255,.12)'; x.fillRect(W * .55, H * .2, W * .3, H * .5);
      for (let j = 0; j < 26; j++) { const a = j * 2.4, k = ((t * .12 + j * .04) % 1); x.fillStyle = '#7dff4a'; x.fillRect(W * .05 + k * W * .45 + Math.sin(a) * 14, H * .5 + Math.cos(a * 1.7) * H * .3, 4, 4); }
      for (let j = 0; j < 14; j++) { x.fillStyle = '#f3f5f8'; x.fillRect(W * .58 + (j * 37 % 100) / 100 * W * .24, H * .25 + (j * 53 % 100) / 100 * H * .4, 3, 3); } }
  };
};
