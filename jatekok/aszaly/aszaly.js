/* HGWS Arcade – Aszálytúlélő: hordatúlélő (automata fegyverek, szintlépés, végtelen hullámok)
   (klasszikus szkript, az arcade.html tölti be; a közös keret a jatekok/arcade/mag.js) */
'use strict';
const Aszaly = (() => {
  const TAU = Math.PI * 2, MAXLV = 5, CS = 48, K = {}, V = { sc: 1, hw: 0, hh: 0, ring: 0 }, GR = new Map();
  let S = null, joy = null, SPR = null, sprSc = 0, TILE = null, VIG = null;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmtT = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  /* ellenségek: élet, sebesség, sebzés, sugár, csepp (XP), pont */
  const ET = {
    kaktusz: { hp: 8, sp: 46, dmg: 8, r: 13, xp: 1, pt: 10 },
    szeker: { hp: 4, sp: 98, dmg: 5, r: 10, xp: 1, pt: 12, spin: 1 },
    tuz: { hp: 15, sp: 68, dmg: 10, r: 12, xp: 2, pt: 20 },
    skorpio: { hp: 28, sp: 86, dmg: 13, r: 13, xp: 3, pt: 35 },
    golem: { hp: 80, sp: 33, dmg: 18, r: 21, xp: 6, pt: 60 },
    kiraly: { hp: 420, sp: 52, dmg: 26, r: 36, xp: 0, pt: 500, boss: 1 }
  };
  /* fejlesztések: w = fegyver (szintenkénti leírás), a többi passzív */
  const UP = {
    pisztoly: { n: 'Vízpisztoly', w: 1, d: ['A legközelebbi ellenségre lő', '+1 lövedék', 'Átüt még egy ellenségen', '+1 lövedék', 'Gyorsabb tüzelés, +1 átütés'] },
    szoro: { n: 'Szórófej', w: 1, d: ['Körülötted keringő vízcseppek', '+1 csepp, erősebb', '+1 csepp, erősebb', '+1 csepp, erősebb', '+1 csepp, erősebb'] },
    ostor: { n: 'Slagostor', w: 1, d: ['Végigcsap előtted a slag', 'Hosszabb és erősebb', 'Hátrafelé is csap', 'Hosszabb és gyorsabb', 'Sokkal gyorsabb és hosszabb'] },
    bomba: { n: 'Vízibomba', w: 1, d: ['Felrobbanó vízibombát dob', 'Nagyobb robbanás', '+1 bomba', 'Nagyobb robbanás', '+1 bomba'] },
    felho: { n: 'Esőfelhő', w: 1, d: ['Áztat és lelassít egy területet', 'Tovább tart', 'Nagyobb és erősebb', '+1 felhő', 'Sokkal tovább tart'] },
    pocsolya: { n: 'Pocsolya', w: 1, d: ['Sebző tócsa a lábad körül', 'Nagyobb és erősebb', 'Nagyobb és erősebb', 'Nagyobb és erősebb', 'Nagyobb és erősebb'] },
    csizma: { n: 'Gumicsizma', d: '+9% mozgási sebesség' },
    vitamin: { n: 'Tápoldat', d: '+20 max. élet és gyógyulás' },
    magnes: { n: 'Cseppmágnes', d: '+35% gyűjtési távolság' },
    nyomas: { n: 'Nyomásfokozó', d: '+12% sebzés' },
    idozito: { n: 'Öntözőóra', d: '−7% töltési idő' },
    fuvoka: { n: 'Széles fúvóka', d: '+10% hatóterület' },
    gyogy: { n: 'Friss víz', sp: 1, d: '+40 élet' },
    pont: { n: 'Aranycsepp', sp: 1, d: '+500 pont' }
  };
  const lv = k => S.up[k] || 0;
  function stats() {
    S.st = { speed: 150 * (1 + .09 * lv('csizma')), magnet: 62 * (1 + .35 * lv('magnes')), dmg: 1 + .12 * lv('nyomas'), cd: 1 - .07 * lv('idozito'), area: 1 + .1 * lv('fuvoka') };
    S.P.mhp = 100 + 20 * lv('vitamin');
  }
  function view(G) { V.sc = G.d * clamp(Math.min(G.W, G.H) / G.d / 440, .85, 1.6); V.hw = G.W / 2 / V.sc; V.hh = G.H / 2 / V.sc; V.ring = Math.hypot(V.hw, V.hh) + 50; }

  /* ---------- irányítás ---------- */
  const KEYS = { ArrowUp: 'U', w: 'U', W: 'U', ArrowDown: 'D', s: 'D', S: 'D', ArrowLeft: 'L', a: 'L', A: 'L', ArrowRight: 'R', d: 'R', D: 'R' };
  addEventListener('keydown', e => { if (!gEl.classList.contains('open') || G.game !== me) return; const k = KEYS[e.key];
    if (k) { K[k] = 1; if (G.running) e.preventDefault(); } else if (G.running && S && S.choose && '123'.includes(e.key)) pick(G, +e.key - 1); });
  addEventListener('keyup', e => { const k = KEYS[e.key]; if (k) K[k] = 0; });
  addEventListener('blur', () => { K.U = K.D = K.L = K.R = 0; joy = null; });

  /* ---------- rács a közelségi keresésekhez ---------- */
  const gk = (cx, cy) => (cx + 524288) * 1048576 + (cy + 524288);
  function gridBuild() { GR.clear(); for (const e of S.en) { const k = gk(Math.floor(e.x / CS), Math.floor(e.y / CS)); let l = GR.get(k); if (!l) GR.set(k, l = []); l.push(e); } }
  function near(x, y, r, fn) {
    const x0 = Math.floor((x - r - 38) / CS), x1 = Math.floor((x + r + 38) / CS), y0 = Math.floor((y - r - 38) / CS), y1 = Math.floor((y + r + 38) / CS);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) { const l = GR.get(gk(cx, cy)); if (!l) continue;
      for (const e of l) { if (e.dead) continue; const dx = e.x - x, dy = e.y - y, q = r + e.r; if (dx * dx + dy * dy < q * q) fn(e, dx, dy); } }
  }
  function nearest(range) { const P = S.P; let b = null, bd = range * range; for (const e of S.en) { if (e.dead) continue; const dx = e.x - P.x, dy = e.y - P.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; b = e; } } return b; }
  function randEnemy(range) { const P = S.P, n = S.en.length; for (let i = 0; i < 14 && n; i++) { const e = S.en[Math.floor(Math.random() * n)]; if (!e.dead && Math.abs(e.x - P.x) < Math.min(range, V.hw) && Math.abs(e.y - P.y) < Math.min(range, V.hh)) return e; } return null; }

  /* ---------- ellenségek ---------- */
  function edge() { const w = V.hw + 34, h = V.hh + 34, r = Math.random() * (w + h) * 2, s = Math.random() < .5 ? -1 : 1; return r < w * 2 ? [r - w, s * h] : [s * w, r - w * 2 - h]; }
  function spawn(type, ox, oy) {
    const T = ET[type], P = S.P, hm = 1 + Math.pow(S.t / 60, 1.3) * .3, hp = T.hp * hm * (T.boss ? 1 + S.bossN * .8 : 1);
    S.en.push({ id: ++S.eid, type, T, x: P.x + ox, y: P.y + oy, hp, mhp: hp, r: T.r, sp: T.sp * (.9 + Math.random() * .2), flash: 0, kx: 0, ky: 0, slow: 0, oT: 0, ph: Math.random() * 6 });
  }
  function pickType() {
    const t = S.t, w = [['kaktusz', t > 300 ? 2 : 5]]; if (t > 40) w.push(['szeker', 3]); if (t > 90) w.push(['tuz', 3]); if (t > 180) w.push(['golem', 1.4]); if (t > 240) w.push(['skorpio', 3]);
    let r = Math.random() * w.reduce((a, x) => a + x[1], 0); for (const [k, v] of w) if ((r -= v) <= 0) return k; return 'kaktusz';
  }
  function spawner(G, dt) {
    const cap = clamp(Math.round(V.hw * V.hh / 420), 150, 260);
    S.sT -= dt;
    while (S.sT <= 0) { S.sT += Math.max(.16, .5 - S.t * .001);
      for (let i = 0, n = 1 + Math.floor(S.t / 150); i < n && S.en.length < cap; i++) spawn(pickType(), ...edge()); }
    const m = Math.floor(S.t / 60);
    if (m > S.minute) { S.minute = m;
      if (m % 3 === 0) { spawn('kiraly', ...edge()); S.bossN++; S.banner = { t: 'KAKTUSZKIRÁLY!', l: 2.6 }; Sfx.boom(); }
      else { const n = 12 + m * 2, ty = m < 2 ? 'kaktusz' : m < 5 ? 'szeker' : 'skorpio', a0 = Math.random() * TAU; for (let i = 0; i < n; i++) { const a = a0 + i / n * TAU; spawn(ty, Math.cos(a) * (V.hw + 40) * 1.42, Math.sin(a) * (V.hh + 40) * 1.42); } } }
  }
  function hurt(G, e, dmg, kx, ky) {
    if (e.dead) return; dmg *= S.st.dmg; e.hp -= dmg; e.flash = .1;
    if (!e.T.boss) { e.kx += kx; e.ky += ky; }
    if (S.nums.length < 28) S.nums.push({ x: e.x + (Math.random() - .5) * 10, y: e.y - e.r, v: Math.max(1, Math.round(dmg)), l: .6 });
    if (e.hp > 0) return;
    e.dead = 1; S.kills++; G.score += e.T.pt; S.dirty = 1;
    for (let i = 0, n = e.T.boss ? 30 : 5; i < n && S.pt.length < 170; i++) { const a = Math.random() * TAU, v = 40 + Math.random() * 110; S.pt.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: .45, c: e.type === 'tuz' ? '255,150,60' : e.type === 'golem' ? '207,174,116' : '110,190,110' }); }
    if (e.T.boss) { S.gems.push({ k: 'c', x: e.x, y: e.y, v: 0 }); Sfx.boom(); G.shake = 14 * G.d; }
    else { S.gems.push({ k: 'x', x: e.x, y: e.y, v: e.T.xp }); const r = Math.random(); if (r < .011) S.gems.push({ k: 'h', x: e.x + 8, y: e.y, v: 0 }); else if (r < .0145) S.gems.push({ k: 'm', x: e.x - 8, y: e.y, v: 0 }); }
    if (S.gems.length > 340) { const o = S.gems.findIndex(q => q.k === 'x' && !q.pull); if (o >= 0) { const v = S.gems[o].v; S.gems.splice(o, 1); const n = S.gems.find(q => q.k === 'x' && !q.pull); if (n) n.v += v; } }
    if (S.t - S.sndT > .07) { S.sndT = S.t; Sfx.blip(260 + Math.random() * 180, .05, 'triangle', .035, .6); }
  }
  function hitPlayer(G, e) {
    const P = S.P; P.hp -= e.T.dmg * (1 + S.t / 600); P.inv = .6; G.shake = 10 * G.d; Sfx.hit(); if (navigator.vibrate) navigator.vibrate(40);
    for (let i = 0; i < 8 && S.pt.length < 170; i++) { const a = Math.random() * TAU; S.pt.push({ x: P.x, y: P.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, l: .4, c: '255,90,77' }); }
    if (P.hp <= 0) { P.hp = 0; me.overTitle = 'KISZÁRADTÁL · ' + fmtT(S.t); G.end(); }
  }
  function enemies(G, dt) {
    const P = S.P, kd = Math.pow(.002, dt);
    for (const e of S.en) {
      const dx = P.x - e.x, dy = P.y - e.y, dd = Math.hypot(dx, dy) || 1;
      if (Math.abs(dx) > V.hw * 2 + 220 || Math.abs(dy) > V.hh * 2 + 220) { const p = edge(); e.x = P.x + p[0]; e.y = P.y + p[1]; continue; }
      const v = e.sp * (e.slow > 0 ? .5 : 1); e.slow -= dt; e.flash -= dt;
      e.x += (dx / dd * v + e.kx) * dt; e.y += (dy / dd * v + e.ky) * dt; e.kx *= kd; e.ky *= kd;
      if (dd < e.r + 10 && P.inv <= 0 && G.running) hitPlayer(G, e);
    }
    // ne csússzanak egymásba
    const f = Math.min(1, dt * 10);
    for (const l of GR.values()) { const n = Math.min(l.length, 8); for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const a = l[i], b = l[j]; if (a.T.boss || b.T.boss) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, q = (a.r + b.r) * .85; if (d2 < q * q && d2 > .01) { const d = Math.sqrt(d2), p = (q - d) / d * .5 * f; a.x -= dx * p; a.y -= dy * p; b.x += dx * p; b.y += dy * p; } } }
  }

  /* ---------- fegyverek ---------- */
  function ready(k, base, dt) { S.wt[k] = (S.wt[k] || 0) - dt; if (S.wt[k] > 0) return false; S.wt[k] = Math.max(0, S.wt[k] + base * S.st.cd); return true; }
  function weapons(G, dt) {
    const P = S.P, ar = S.st.area; let L;
    if ((L = lv('pisztoly')) && ready('pisztoly', L >= 5 ? .5 : L >= 3 ? .68 : .72, dt)) {
      const e = nearest(Math.max(V.hw, V.hh) * .95);
      if (!e) S.wt.pisztoly = .12;
      else { const a0 = Math.atan2(e.y - P.y, e.x - P.x), n = [1, 2, 2, 3, 3][L - 1];
        for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * .15; S.pr.push({ x: P.x, y: P.y - 4, vx: Math.cos(a) * 430, vy: Math.sin(a) * 430, r: 6, dmg: 7 + L * 2, pierce: [1, 1, 2, 2, 3][L - 1], life: 1.1, hit: [] }); }
        Sfx.shoot(); }
    }
    if ((L = lv('szoro'))) {
      S.orb += dt * 2.8; const n = L + 1, R = (56 + L * 4) * ar;
      for (let i = 0; i < n; i++) { const a = S.orb + i / n * TAU, ox = P.x + Math.cos(a) * R, oy = P.y + Math.sin(a) * R;
        near(ox, oy, 9, e => { if (S.t < e.oT) return; e.oT = S.t + .5; hurt(G, e, 5 + L * 2, Math.cos(a) * 150, Math.sin(a) * 150); }); }
    }
    if ((L = lv('ostor')) && ready('ostor', [1.3, 1.3, 1.2, 1.1, .9][L - 1], dt)) {
      const len = [110, 125, 125, 145, 170][L - 1] * ar, hw = 26 * ar;
      for (const dir of L >= 3 ? [P.face, -P.face] : [P.face]) { S.slashes.push({ x: P.x, y: P.y, dir, len, l: .22 });
        for (const e of S.en) { const dx = (e.x - P.x) * dir, dy = e.y - P.y; if (dx > -e.r && dx < len + e.r && Math.abs(dy) < hw + e.r) hurt(G, e, 9 + L * 4, dir * 170, 0); } }
      Sfx.blip(180, .12, 'sawtooth', .04, 2.5);
    }
    if ((L = lv('bomba')) && ready('bomba', 2.6, dt)) {
      for (let i = 0, n = [1, 1, 2, 2, 3][L - 1]; i < n; i++) { const e = randEnemy(330); if (!e) { if (!i) S.wt.bomba = .3; break; }
        S.bombs.push({ x0: P.x, y0: P.y, tx: e.x + (Math.random() - .5) * 20, ty: e.y + (Math.random() - .5) * 20, t: -i * .12, R: (50 + L * 7) * ar, dmg: 12 + L * 5 }); }
    }
    if ((L = lv('felho')) && ready('felho', 4.2, dt)) {
      for (let i = 0, n = L >= 4 ? 2 : 1; i < n; i++) { const e = randEnemy(300), a = Math.random() * TAU;
        S.clouds.push({ x: e ? e.x : P.x + Math.cos(a) * 90, y: e ? e.y : P.y + Math.sin(a) * 90, R: (58 + L * 6) * ar, life: [2.5, 3, 3.5, 3.5, 4.5][L - 1], l0: 0, tk: 0, dmg: 3 + L * 1.6 }); }
    }
    if ((L = lv('pocsolya')) && ready('pocsolya', .45, dt)) near(P.x, P.y, (52 + L * 9) * ar, (e, dx, dy) => { const d = Math.hypot(dx, dy) || 1; hurt(G, e, 2 + L * 1.3, dx / d * 40, dy / d * 40); });

    for (const p of S.pr) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) { p.dead = 1; continue; }
      near(p.x, p.y, p.r, e => { if (p.dead || p.hit.includes(e.id)) return; p.hit.push(e.id); hurt(G, e, p.dmg, p.vx * .25, p.vy * .25); if (--p.pierce <= 0) p.dead = 1; }); }
    for (const b of S.bombs) { b.t += dt; if (b.t < .55) continue; b.dead = 1; S.rings.push({ x: b.tx, y: b.ty, R: b.R, l: 1 });
      near(b.tx, b.ty, b.R, (e, dx, dy) => { const d = Math.hypot(dx, dy) || 1; hurt(G, e, b.dmg, dx / d * 220, dy / d * 220); });
      for (let i = 0; i < 12 && S.pt.length < 170; i++) { const a = Math.random() * TAU, v = 60 + Math.random() * 160; S.pt.push({ x: b.tx, y: b.ty, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: .5, c: '150,215,255' }); }
      Sfx.splash(); }
    for (const c of S.clouds) { c.life -= dt; c.l0 += dt; c.tk -= dt; if (c.life <= 0) { c.dead = 1; continue; } if (c.tk <= 0) { c.tk = .35; near(c.x, c.y, c.R, e => { e.slow = .6; hurt(G, e, c.dmg, 0, 0); }); } }
  }
  function collect(G, q) {
    const P = S.P;
    if (q.k === 'x') { P.xp += q.v; while (P.xp >= P.need) { P.xp -= P.need; P.lvl++; P.need = Math.floor(4 + P.lvl * 3.5 + P.lvl * P.lvl * .45); S.pending++; }
      if (S.t - S.gsT > .05) { S.gsT = S.t; Sfx.blip(900 + Math.random() * 300, .04, 'sine', .03); } }
    else if (q.k === 'h') { P.hp = Math.min(P.mhp, P.hp + 25); G.float(G.W / 2, G.H / 2 - 40 * G.d, '+25 ❤'); Sfx.coin(); }
    else if (q.k === 'm') { for (const o of S.gems) o.pull = 1; Sfx.perfect(); }
    else { S.pending++; P.hp = Math.min(P.mhp, P.hp + 30); G.score += 250; S.dirty = 1; G.float(G.W / 2, G.H / 2 - 40 * G.d, 'KINCS! +250'); }
  }

  /* ---------- szintlépés ---------- */
  function openChoice() {
    const av = Object.keys(UP).filter(k => !UP[k].sp && lv(k) < MAXLV);
    for (let i = av.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[av[i], av[j]] = [av[j], av[i]]; }
    const o = av.slice(0, 3); for (const k of ['gyogy', 'pont']) if (o.length < 3) o.push(k);
    S.choose = { o, t: 0 }; joy = null; Sfx.perfect();
  }
  function pick(G, i) {
    const c = S.choose; if (!c || c.t < .35 || !c.o[i]) return; const k = c.o[i], P = S.P;
    if (k === 'gyogy') P.hp = Math.min(P.mhp, P.hp + 40); else if (k === 'pont') { G.score += 500; S.dirty = 1; }
    else { S.up[k] = lv(k) + 1; stats(); if (k === 'vitamin') P.hp = Math.min(P.mhp, P.hp + 20); }
    S.choose = null; P.inv = Math.max(P.inv, .7); Sfx.coin();
  }
  function cards(G) {
    const d = G.d, n = S.choose.o.length, w = Math.min(G.W - 28 * d, 380 * d), h = 82 * d, gap = 12 * d, y0 = (G.H - (n * h + (n - 1) * gap)) / 2 + 18 * d;
    return S.choose.o.map((k, i) => ({ k, x: (G.W - w) / 2, y: y0 + i * (h + gap), w, h }));
  }

  /* ---------- rajz: ikonok ---------- */
  const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  const rrp = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
  const ln = (g, a, b, c, d) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); };
  function heart(g, x, y, s) { g.beginPath(); g.moveTo(x, y + s * .9); g.bezierCurveTo(x - s * 1.4, y - s * .1, x - s * .7, y - s * 1.1, x, y - s * .35); g.bezierCurveTo(x + s * .7, y - s * 1.1, x + s * 1.4, y - s * .1, x, y + s * .9); g.fill(); }
  function drop(g, x, y, s) { g.beginPath(); g.moveTo(x, y - s * 1.3); g.bezierCurveTo(x + s * 1.1, y - s * .1, x + s * .95, y + s, x, y + s); g.bezierCurveTo(x - s * .95, y + s, x - s * 1.1, y - s * .1, x, y - s * 1.3); g.fill(); }
  const IC = {
    pisztoly(g) { g.fillStyle = '#2f8fe0'; rrp(g, -9, -6, 15, 7, 2); g.fillRect(-7, 0, 5, 8); g.fillStyle = '#e8b656'; g.fillRect(6, -4.5, 4, 4); g.fillStyle = '#9fdcff'; circ(g, -3, -2.5, 2); },
    szoro(g) { g.fillStyle = '#e8b656'; g.fillRect(-2, 1, 4, 9); rrp(g, -6, -2, 12, 4, 2); g.fillStyle = '#6cc6ff'; for (const a of [-2.4, -1.57, -.74]) circ(g, Math.cos(a) * 9, -1 + Math.sin(a) * 9, 1.9); },
    ostor(g) { g.strokeStyle = '#2fa24a'; g.lineWidth = 3.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(-9, 7); g.bezierCurveTo(-9, -10, 6, 8, 9, -7); g.stroke(); g.fillStyle = '#e8b656'; circ(g, 9, -7, 2.6); },
    bomba(g) { g.fillStyle = '#1a6fb8'; g.fillRect(-1.5, -10.5, 3, 4); g.fillStyle = '#3aa6f5'; circ(g, 0, 1, 8); g.fillStyle = 'rgba(255,255,255,.7)'; circ(g, -3, -2, 2.2); },
    felho(g) { g.fillStyle = '#c9d3de'; circ(g, -4, -3, 5); circ(g, 3, -5, 6); circ(g, 7, -1, 4); g.fillRect(-8, -3, 16, 5); g.strokeStyle = '#6cc6ff'; g.lineWidth = 1.8; g.lineCap = 'round'; for (const i of [-5, 0, 5]) ln(g, i, 5, i - 2, 10); },
    pocsolya(g) { g.fillStyle = '#3aa6f5'; g.beginPath(); g.ellipse(0, 3, 10, 5.5, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(0, 3, 5, 2.4, 0, 0, TAU); g.stroke(); },
    csizma(g) { g.fillStyle = '#ffd23f'; rrp(g, -5, -10, 7, 15, 2); rrp(g, -5, 1, 13, 7, 3); g.fillStyle = '#b8860b'; g.fillRect(-5, 7, 13, 1.8); },
    vitamin(g) { g.fillStyle = '#ff5a4d'; heart(g, 0, 0, 8.5); g.fillStyle = '#fff'; g.fillRect(-1.2, -4, 2.4, 8); g.fillRect(-4, -1.2, 8, 2.4); },
    magnes(g) { g.strokeStyle = '#ff5a4d'; g.lineWidth = 5; g.lineCap = 'butt'; g.beginPath(); g.moveTo(-6, 7); g.lineTo(-6, -1); g.arc(0, -1, 6, Math.PI, 0); g.lineTo(6, 7); g.stroke(); g.fillStyle = '#e6edf5'; g.fillRect(-8.5, 5, 5, 4); g.fillRect(3.5, 5, 5, 4); },
    nyomas(g) { g.fillStyle = '#e6edf5'; circ(g, 0, 0, 9); g.strokeStyle = '#46525f'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.stroke(); g.strokeStyle = '#ff5a4d'; g.lineCap = 'round'; ln(g, 0, 0, 5, -5); g.fillStyle = '#46525f'; circ(g, 0, 0, 1.8); },
    idozito(g) { g.fillStyle = '#0b1a2a'; circ(g, 0, 0, 9); g.strokeStyle = '#e8b656'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.stroke(); ln(g, 0, 0, 0, -6); ln(g, 0, 0, 4, 2); },
    fuvoka(g) { g.fillStyle = 'rgba(108,198,255,.85)'; g.beginPath(); g.moveTo(-4, 0); g.lineTo(10, -9); g.lineTo(10, 9); g.fill(); g.fillStyle = '#e8b656'; g.fillRect(-10, -2.5, 7, 5); },
    gyogy(g) { g.fillStyle = '#3aa6f5'; drop(g, 0, 1, 7.5); g.fillStyle = '#fff'; g.fillRect(-1.2, -2, 2.4, 8); g.fillRect(-4, .8, 8, 2.4); },
    pont(g) { g.fillStyle = '#ffd23f'; drop(g, 0, 1, 7.5); g.fillStyle = 'rgba(255,255,255,.75)'; circ(g, -2.5, 1.5, 1.8); }
  };
  function ico(g, k, x, y, s) { g.save(); g.translate(x, y); g.scale(s / 24, s / 24); IC[k](g); g.restore(); }

  /* ---------- rajz: előre kirajzolt ellenségek és talaj ---------- */
  function cactus(x, king) {
    x.fillStyle = king ? '#2f7d3a' : '#3f9c49'; rrp(x, -.55, -1.1, 1.1, 2.1, .5); rrp(x, -1.1, -.45, .38, .8, .19); x.fillRect(-.9, .1, .45, .26); rrp(x, .72, -.7, .38, .8, .19); x.fillRect(.45, -.15, .45, .26);
    x.strokeStyle = king ? '#1d5a27' : '#2a7434'; x.lineWidth = .07; for (const i of [-.26, 0, .26]) ln(x, i, -.85, i, .85);
    x.strokeStyle = 'rgba(235,255,210,.75)'; x.lineWidth = .045; for (let i = 0; i < 5; i++) { ln(x, -.55, -.7 + i * .36, -.7, -.76 + i * .36); ln(x, .55, -.6 + i * .36, .7, -.66 + i * .36); }
    x.fillStyle = '#fff'; x.beginPath(); x.ellipse(-.22, -.4, .15, .17, 0, 0, TAU); x.ellipse(.22, -.4, .15, .17, 0, 0, TAU); x.fill();
    x.fillStyle = king ? '#e5432a' : '#1a0d05'; circ(x, -.19, -.37, .075); circ(x, .19, -.37, .075);
    x.strokeStyle = '#12301a'; x.lineWidth = .09; x.lineCap = 'round'; ln(x, -.42, -.68, -.08, -.55); ln(x, .42, -.68, .08, -.55);
    x.lineWidth = .07; x.beginPath(); x.moveTo(-.22, -.03); x.lineTo(-.1, .07); x.lineTo(0, -.03); x.lineTo(.1, .07); x.lineTo(.22, -.03); x.stroke();
    if (king) { x.fillStyle = '#e8b656'; x.beginPath(); x.moveTo(-.46, -1.02); x.lineTo(-.52, -1.5); x.lineTo(-.23, -1.24); x.lineTo(0, -1.56); x.lineTo(.23, -1.24); x.lineTo(.52, -1.5); x.lineTo(.46, -1.02); x.fill(); x.fillStyle = '#ff5a4d'; circ(x, 0, -1.16, .08); }
    else { x.fillStyle = '#ff6fa8'; circ(x, 0, -1.12, .16); x.fillStyle = '#ffe29a'; circ(x, 0, -1.12, .06); }
  }
  const DRAW = {
    kaktusz: x => cactus(x, 0), kiraly: x => cactus(x, 1),
    szeker(x) { x.lineWidth = .1; x.lineCap = 'round'; for (let i = 0; i < 11; i++) { const a = i * 1.9; x.strokeStyle = i % 2 ? '#b08a55' : '#8a6a3c'; x.beginPath(); x.arc(Math.cos(a) * .22, Math.sin(a) * .22, .74, a, a + 2.4); x.stroke(); }
      x.strokeStyle = '#d8b98a'; x.lineWidth = .06; for (let i = 0; i < 5; i++) { const a = i * 2.3; x.beginPath(); x.arc(Math.cos(a) * .15, Math.sin(a) * .15, .42, a, a + 2); x.stroke(); } },
    tuz(x) { const gr = x.createRadialGradient(0, .3, .1, 0, .2, 1.3); gr.addColorStop(0, '#fff3a0'); gr.addColorStop(.45, '#ffb02e'); gr.addColorStop(1, '#e5432a'); x.fillStyle = gr;
      x.beginPath(); x.moveTo(0, -1.35); x.bezierCurveTo(.25, -.7, 1, -.35, .95, .25); x.arc(0, .25, .95, 0, Math.PI); x.bezierCurveTo(-1, -.35, -.25, -.7, 0, -1.35); x.fill();
      x.fillStyle = 'rgba(255,243,160,.75)'; x.beginPath(); x.ellipse(0, .55, .45, .48, 0, 0, TAU); x.fill();
      x.fillStyle = '#3a0d05'; x.beginPath(); x.ellipse(-.32, .1, .12, .19, .35, 0, TAU); x.ellipse(.32, .1, .12, .19, -.35, 0, TAU); x.fill();
      x.strokeStyle = '#3a0d05'; x.lineWidth = .08; x.lineCap = 'round'; x.beginPath(); x.arc(0, .72, .2, Math.PI + .35, -.35); x.stroke(); ln(x, -.5, -.22, -.18, -.06); ln(x, .5, -.22, .18, -.06); },
    skorpio(x) { x.strokeStyle = '#6e1f18'; x.lineWidth = .09; x.lineCap = 'round'; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) ln(x, s * .4, .15 + i * .22, s * 1.02, .32 + i * .3);
      x.lineWidth = .15; for (const s of [-1, 1]) ln(x, s * .3, -.3, s * .85, -.62);
      x.fillStyle = '#b23a2c'; x.beginPath(); x.ellipse(0, .32, .62, .5, 0, 0, TAU); x.fill(); x.beginPath(); x.ellipse(0, -.2, .42, .34, 0, 0, TAU); x.fill();
      x.strokeStyle = '#7d241b'; x.lineWidth = .06; for (const yy of [.2, .42]) { x.beginPath(); x.arc(0, yy - .3, .6, .7, Math.PI - .7); x.stroke(); }
      x.fillStyle = '#c9483a'; for (const s of [-1, 1]) circ(x, s * .93, -.8, .25); x.fillStyle = '#6e1f18'; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * .93, -.82); x.lineTo(s * .8, -1.1); x.lineTo(s * 1.04, -1.08); x.fill(); }
      x.strokeStyle = '#b23a2c'; x.lineWidth = .2; x.beginPath(); x.moveTo(0, .72); x.bezierCurveTo(1.5, .9, 1.5, -1.25, .38, -1.22); x.stroke();
      x.fillStyle = '#ffd23f'; x.beginPath(); x.moveTo(.42, -1.38); x.lineTo(.42, -1.06); x.lineTo(.04, -1.1); x.fill(); circ(x, -.15, -.25, .08); circ(x, .15, -.25, .08); },
    golem(x) { x.fillStyle = '#b08f58'; rrp(x, -1.25, -.4, .45, 1, .15); rrp(x, .8, -.4, .45, 1, .15); x.fillStyle = '#cfae74'; rrp(x, -.85, -1, 1.7, 2, .28);
      x.fillStyle = '#b9965c'; rrp(x, -.7, .25, .6, .5, .1); rrp(x, .15, -.9, .5, .32, .1);
      x.strokeStyle = '#7a5a30'; x.lineWidth = .06; x.lineCap = 'round'; x.beginPath(); x.moveTo(-.3, -1); x.lineTo(-.1, -.72); x.lineTo(-.35, -.62); x.moveTo(.55, .95); x.lineTo(.3, .5); x.lineTo(.6, .2); x.stroke();
      x.fillStyle = '#ff7a1a'; rrp(x, -.52, -.5, .34, .2, .05); rrp(x, .18, -.5, .34, .2, .05); x.fillStyle = '#ffe29a'; x.fillRect(-.42, -.45, .14, .1); x.fillRect(.28, -.45, .14, .1); x.fillStyle = '#5a3f1e'; x.fillRect(-.3, .0, .6, .12); }
  };
  function build() {
    sprSc = V.sc; SPR = {};
    if (!VIG) { VIG = document.createElement('canvas'); VIG.width = VIG.height = 128; const v = VIG.getContext('2d'), vg = v.createRadialGradient(64, 64, 34, 64, 64, 92); vg.addColorStop(0, 'rgba(20,8,0,0)'); vg.addColorStop(1, 'rgba(20,8,0,.55)'); v.fillStyle = vg; v.fillRect(0, 0, 128, 128); }
    for (const k in ET) { const r = ET[k].r, sz = Math.ceil(r * 3.3 * V.sc), c = document.createElement('canvas'); c.width = c.height = sz; const x = c.getContext('2d'); x.translate(sz / 2, sz / 2); x.scale(r * V.sc, r * V.sc); DRAW[k](x);
      const w = document.createElement('canvas'); w.width = w.height = sz; const y = w.getContext('2d'); y.drawImage(c, 0, 0); y.globalCompositeOperation = 'source-atop'; y.fillStyle = 'rgba(255,255,255,.85)'; y.fillRect(0, 0, sz, sz); SPR[k] = { c, w, sz }; }
    // talaj: kiszáradt, repedezett föld (ismétlődő csempe)
    const T = 512, sz = Math.round(T * V.sc); TILE = document.createElement('canvas'); TILE.width = TILE.height = sz; const x = TILE.getContext('2d'); x.scale(sz / T, sz / T);
    let seed = 20261121; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const wrap = fn => { for (const ox of [-T, 0, T]) for (const oy of [-T, 0, T]) { x.save(); x.translate(ox, oy); fn(); x.restore(); } };
    x.fillStyle = '#9c7a4c'; x.fillRect(0, 0, T, T);
    for (let i = 0; i < 90; i++) { const px = rnd() * T, py = rnd() * T, r = 22 + rnd() * 70, c = i % 3 ? 'rgba(122,92,54,.22)' : 'rgba(186,152,100,.22)'; wrap(() => { x.fillStyle = c; x.beginPath(); x.ellipse(px, py, r, r * .7, 0, 0, TAU); x.fill(); }); }
    for (let i = 0; i < 26; i++) { let px = rnd() * T, py = rnd() * T, a = rnd() * TAU; const pts = [[px, py]]; for (let j = 0, n = 3 + Math.floor(rnd() * 4); j < n; j++) { a += (rnd() - .5) * 1.5; const l = 10 + rnd() * 22; px += Math.cos(a) * l; py += Math.sin(a) * l; pts.push([px, py]); }
      wrap(() => { x.strokeStyle = 'rgba(64,42,20,.3)'; x.lineWidth = 1.3; x.lineJoin = 'round'; x.beginPath(); pts.forEach((p, j) => j ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.stroke(); }); }
    for (let i = 0; i < 46; i++) { const px = rnd() * T, py = rnd() * T, r = 1.5 + rnd() * 3; wrap(() => { x.fillStyle = 'rgba(70,56,40,.55)'; x.beginPath(); x.ellipse(px, py, r, r * .7, 0, 0, TAU); x.fill(); x.fillStyle = 'rgba(210,190,150,.35)'; x.beginPath(); x.ellipse(px - r * .2, py - r * .2, r * .5, r * .3, 0, 0, TAU); x.fill(); }); }
    for (let i = 0; i < 40; i++) { const px = rnd() * T, py = rnd() * T, c = i % 3 ? '#b9a25a' : '#7f8c3c', a = [rnd(), rnd(), rnd(), rnd()]; wrap(() => { x.strokeStyle = c; x.lineWidth = 1.3; x.lineCap = 'round'; for (let j = 0; j < 4; j++) ln(x, px + (j - 1.5) * 1.6, py, px + (j - 1.5) * 4, py - 5 - a[j] * 5); }); }
  }

  function drawPlayer(g, G, t) {
    const P = S.P; g.save(); g.translate(G.W / 2, G.H / 2); g.scale(V.sc, V.sc);
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(0, 16, 11, 4, 0, 0, TAU); g.fill();
    if (P.inv > 0 && Math.sin(t * 40) > 0) g.globalAlpha = .45;
    const b = P.mov ? Math.sin(P.walk) : 0, bob = P.mov ? Math.abs(Math.cos(P.walk)) * 1.5 : 0; g.scale(P.face, 1);
    g.fillStyle = '#22324d'; g.fillRect(-6, 6, 5, 8 + b * 2.5); g.fillRect(1, 6, 5, 8 - b * 2.5);
    g.fillStyle = '#e8b656'; g.fillRect(-7, 13 + b * 2.5, 7, 3); g.fillRect(0, 13 - b * 2.5, 7, 3);
    g.translate(0, -bob);
    g.fillStyle = '#2f8fe0'; rrp(g, -8, -6, 16, 14, 4); g.fillStyle = '#1f6fb8'; g.fillRect(-8, 3, 16, 2); g.fillStyle = '#ffe29a'; circ(g, -3, -1, 2);
    g.fillStyle = '#e8b656'; g.fillRect(8, -.5, 8, 3.2); g.fillStyle = '#8a5a1e'; g.fillRect(15, -1.5, 2, 5); g.fillStyle = '#f1c9a0'; circ(g, 8, 1, 2.7);
    circ(g, 0, -12, 7); g.fillStyle = '#1a0d05'; circ(g, 3.2, -11.5, 1.2);
    g.fillStyle = '#d9ad4e'; g.beginPath(); g.ellipse(0, -15.5, 11.5, 3.3, 0, 0, TAU); g.fill(); g.fillStyle = '#edc970'; rrp(g, -6, -22.5, 12, 7.5, 3); g.fillStyle = '#b2382a'; g.fillRect(-6, -17.6, 12, 1.9);
    g.restore();
  }

  const me = {
    id: 'aszaly', name: 'ASZÁLYTÚLÉLŐ', lives: 0, quit: true, sponsor: 'A Zerosites támogatásával', overTitle: 'KISZÁRADTÁL',
    desc: 'Szikkadt Szilárd serege elözönlötte a kiszáradt kertet! A fegyvereid maguktól tüzelnek – te csak mozogj, gyűjtsd a vízcseppeket, és minden szintlépésnél válassz új fegyvert vagy fejlesztést. Meddig bírod?',
    how: 'WASD / NYILAK VAGY HÚZÁS = MOZGÁS · 🏁 = BEFEJEZÉS',
    ranks: [[0, 'Szomjas palánta'], [1500, 'Kerti túlélő'], [6000, 'Aszályvadász'], [15000, 'Esőcsináló'], [40000, 'A Monszun Ura']],
    init(G) {
      S = { t: 0, P: { x: 0, y: 0, hp: 100, mhp: 100, inv: 0, face: 1, walk: 0, mov: 0, lvl: 1, xp: 0, need: 7 }, up: { pisztoly: 1 }, wt: {}, en: [], pr: [], gems: [], bombs: [], clouds: [], rings: [], slashes: [], pt: [], nums: [],
        eid: 0, sT: .6, minute: 0, bossN: 0, kills: 0, pending: 0, choose: null, orb: 0, sndT: -1, gsT: -1, hudT: 0, dirty: 0, banner: null };
      stats(); view(G); joy = null; this.overTitle = 'KISZÁRADTÁL';
    },
    down(G, x, y, e) {
      if (!e || e === true) return;
      if (S.choose) { const c = cards(G).findIndex(c => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h); if (c >= 0) pick(G, c); return; }
      try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
      joy = { id: e.pointerId, ox: x, oy: y, x, y, touch: e.pointerType !== 'mouse' };
    },
    move(G, x, y, pressed, e) { if (joy && pressed && (!e || e.pointerId === joy.id)) { joy.x = x; joy.y = y; } },
    up(G, x, y, e) { if (joy && (!e || e === true || e.pointerId === joy.id)) joy = null; },
    _S: () => S, /* tesztekhez */
    leave() { joy = null; K.U = K.D = K.L = K.R = 0; },
    update(G, dt) {
      view(G); const P = S.P, st = S.st;
      if (S.choose) { S.choose.t += dt; return; }
      if (S.pending > 0) { S.pending--; return openChoice(); }
      S.t += dt;
      let mx = (K.R ? 1 : 0) - (K.L ? 1 : 0), my = (K.D ? 1 : 0) - (K.U ? 1 : 0);
      if (mx && my) { mx *= .7071; my *= .7071; }
      else if (!mx && !my && joy) { const dx = joy.x - joy.ox, dy = joy.y - joy.oy, m = Math.hypot(dx, dy), dz = 8 * G.d, mr = 46 * G.d;
        if (m > dz) { const k = Math.min(1, (m - dz) / (mr - dz)) / m; mx = dx * k; my = dy * k; if (m > mr) { joy.ox = joy.x - dx / m * mr; joy.oy = joy.y - dy / m * mr; } } }
      const mm = Math.hypot(mx, my);
      if (mm > .05) { P.x += mx * st.speed * dt; P.y += my * st.speed * dt; if (Math.abs(mx) > .15) P.face = mx > 0 ? 1 : -1; P.walk += dt * mm * 11; P.mov = 1; } else P.mov = 0;
      P.inv = Math.max(0, P.inv - dt);
      spawner(G, dt); gridBuild(); enemies(G, dt); if (!G.running) return; weapons(G, dt);
      for (const q of S.gems) { const dx = P.x - q.x, dy = P.y - q.y, d2 = dx * dx + dy * dy; if (!q.pull && d2 < st.magnet * st.magnet) q.pull = 1;
        if (q.pull) { q.sp = (q.sp || 140) + 900 * dt; const d = Math.sqrt(d2) || 1; q.x += dx / d * q.sp * dt; q.y += dy / d * q.sp * dt; if (d < 16) { q.dead = 1; collect(G, q); } } }
      for (const p of S.pt) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .92; p.vy *= .92; p.l -= dt; }
      for (const n of S.nums) { n.y -= 26 * dt; n.l -= dt; } for (const r of S.rings) r.l -= dt * 3; for (const s of S.slashes) s.l -= dt;
      if (S.banner && (S.banner.l -= dt) <= 0) S.banner = null;
      const live = a => a.filter(o => !o.dead); S.en = live(S.en); S.pr = live(S.pr); S.gems = live(S.gems); S.bombs = live(S.bombs); S.clouds = live(S.clouds);
      S.pt = S.pt.filter(p => p.l > 0); S.nums = S.nums.filter(n => n.l > 0); S.rings = S.rings.filter(r => r.l > 0); S.slashes = S.slashes.filter(s => s.l > 0);
      if ((S.hudT -= dt) <= 0 && S.dirty) { S.hudT = .25; S.dirty = 0; hud(); }
    },
    draw(g, G, t) {
      view(G); if (sprSc !== V.sc) build();
      const P = S.P, sc = V.sc, d = G.d, W = G.W, H = G.H, X = wx => (wx - P.x) * sc + W / 2, Y = wy => (wy - P.y) * sc + H / 2, vis = (x, y, m) => x > -m && y > -m && x < W + m && y < H + m, ar = S.st.area;
      // talaj
      const ts = TILE.width, mod = (a, n) => ((a % n) + n) % n, sx0 = -Math.round(mod(P.x * sc - W / 2, ts)), sy0 = -Math.round(mod(P.y * sc - H / 2, ts));
      for (let x = sx0; x < W; x += ts) for (let y = sy0; y < H; y += ts) g.drawImage(TILE, x, y);
      // tócsa és felhők árnyéka
      let L = lv('pocsolya');
      if (L) { const R = (52 + L * 9) * ar * sc; g.fillStyle = 'rgba(25,135,255,.34)'; g.beginPath(); g.ellipse(W / 2, H / 2 + 6 * sc, R, R * .92, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(150,215,255,.55)'; g.lineWidth = 2 * d; g.stroke();
        g.strokeStyle = 'rgba(190,230,255,.4)'; g.lineWidth = 1.5 * d; for (let i = 0; i < 2; i++) { const k = (t * .7 + i * .5) % 1; g.globalAlpha = 1 - k; g.beginPath(); g.ellipse(W / 2, H / 2 + 6 * sc, R * k, R * .92 * k, 0, 0, TAU); g.stroke(); } g.globalAlpha = 1; }
      for (const c of S.clouds) { const a = Math.min(1, c.l0 * 4, c.life * 3), x = X(c.x), y = Y(c.y), R = c.R * sc; g.fillStyle = `rgba(20,110,235,${.3 * a})`; g.beginPath(); g.ellipse(x, y, R, R * .9, 0, 0, TAU); g.fill(); }
      // cseppek és tárgyak
      for (const q of S.gems) { const x = X(q.x), y = Y(q.y); if (!vis(x, y, 20)) continue;
        if (q.k === 'x') { g.fillStyle = q.v >= 6 ? '#ffd23f' : q.v >= 3 ? '#5ee08a' : '#6cc6ff'; drop(g, x, y, (4 + Math.min(3, q.v * .4)) * sc); g.fillStyle = 'rgba(255,255,255,.7)'; circ(g, x - 1.4 * sc, y + .5 * sc, 1.1 * sc); }
        else if (q.k === 'h') { g.fillStyle = '#ff5a4d'; heart(g, x, y + Math.sin(t * 5) * 2 * sc, 8 * sc); }
        else if (q.k === 'm') ico(g, 'magnes', x, y + Math.sin(t * 5) * 2 * sc, 22 * sc);
        else { const k = 1 + .08 * Math.sin(t * 6); g.fillStyle = '#8a5a1e'; rrp(g, x - 13 * sc * k, y - 9 * sc * k, 26 * sc * k, 18 * sc * k, 3 * sc); g.fillStyle = '#e8b656'; g.fillRect(x - 13 * sc * k, y - 3 * sc, 26 * sc * k, 3 * sc); circ(g, x, y - 1 * sc, 3 * sc); } }
      // ellenségek
      S.en.sort((a, b) => a.y - b.y);
      g.fillStyle = 'rgba(0,0,0,.22)'; for (const e of S.en) { const x = X(e.x), y = Y(e.y); if (!vis(x, y, 60 * sc)) continue; g.beginPath(); g.ellipse(x, y + e.r * 1.02 * sc, e.r * .85 * sc, e.r * .28 * sc, 0, 0, TAU); g.fill(); }
      for (const e of S.en) { const x = X(e.x), y = Y(e.y); if (!vis(x, y, 60 * sc)) continue; const sp = SPR[e.type], im = e.flash > 0 ? sp.w : sp.c;
        if (e.T.spin) { g.save(); g.translate(x, y); g.rotate(t * 7 + e.ph); g.drawImage(im, -sp.sz / 2, -sp.sz / 2); g.restore(); }
        else g.drawImage(im, Math.round(x - sp.sz / 2), Math.round(y - sp.sz / 2 + Math.sin(t * 8 + e.ph) * 1.5 * sc));
        if (e.slow > 0) { g.fillStyle = 'rgba(108,198,255,.85)'; drop(g, x, y - e.r * 1.5 * sc, 3 * sc); }
        if (e.T.boss) { const w = 70 * sc, yy = y - e.r * 1.9 * sc; g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x - w / 2, yy, w, 6 * sc); g.fillStyle = '#ff5a4d'; g.fillRect(x - w / 2, yy, w * Math.max(0, e.hp / e.mhp), 6 * sc); } }
      // slagostor
      for (const s of S.slashes) { const a = s.l / .22, x = X(s.x), y = Y(s.y), len = s.len * sc * (1 - a * .25); g.globalAlpha = a; g.lineCap = 'round';
        g.strokeStyle = '#1d7a36'; g.lineWidth = 9 * sc; g.beginPath(); g.moveTo(x + s.dir * 10 * sc, y); g.quadraticCurveTo(x + s.dir * len * .5, y - 28 * sc * a, x + s.dir * len, y + 4 * sc); g.stroke();
        g.strokeStyle = '#49c468'; g.lineWidth = 5 * sc; g.stroke(); g.fillStyle = 'rgba(200,235,255,.9)'; for (let i = 0; i < 5; i++) circ(g, x + s.dir * (len + (i * 7 - 6) * sc), y + (Math.sin(i * 2.4) * 16 - 4) * sc * (1 - a), 3 * sc); g.globalAlpha = 1; }
      drawPlayer(g, G, t);
      // élet a játékos alatt
      { const w = 36 * sc, x = W / 2 - w / 2, y = H / 2 + 23 * sc; g.fillStyle = 'rgba(0,0,0,.55)'; rrp(g, x - 1, y - 1, w + 2, 5 * sc + 2, 2 * sc); g.fillStyle = P.hp / P.mhp > .35 ? '#5ee08a' : '#ff5a4d'; rrp(g, x, y, w * Math.max(0, P.hp / P.mhp), 5 * sc, 2 * sc); }
      // szórófej cseppjei
      if ((L = lv('szoro'))) { const n = L + 1, R = (56 + L * 4) * ar * sc; for (let i = 0; i < n; i++) { const a = S.orb + i / n * TAU, x = W / 2 + Math.cos(a) * R, y = H / 2 + Math.sin(a) * R;
        g.strokeStyle = 'rgba(108,198,255,.35)'; g.lineWidth = 6 * sc; g.lineCap = 'round'; g.beginPath(); g.arc(W / 2, H / 2, R, a - .45, a); g.stroke(); g.fillStyle = '#8fd4ff'; circ(g, x, y, 7 * sc); g.fillStyle = '#fff'; circ(g, x - 2 * sc, y - 2 * sc, 2.2 * sc); } }
      // lövedékek, bombák
      g.lineCap = 'round'; for (const p of S.pr) { const x = X(p.x), y = Y(p.y); g.strokeStyle = 'rgba(108,198,255,.55)'; g.lineWidth = 5 * sc; ln(g, x, y, x - p.vx * .035 * sc, y - p.vy * .035 * sc); g.fillStyle = '#bfe6ff'; circ(g, x, y, 4.5 * sc); }
      for (const b of S.bombs) { if (b.t < 0) continue; const k = b.t / .55, wx = b.x0 + (b.tx - b.x0) * k, wy = b.y0 + (b.ty - b.y0) * k, x = X(wx), y = Y(wy), h = Math.sin(k * Math.PI) * 70 * sc;
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y, 8 * sc, 3 * sc, 0, 0, TAU); g.fill(); g.fillStyle = '#3aa6f5'; circ(g, x, y - h, 9 * sc); g.fillStyle = 'rgba(255,255,255,.7)'; circ(g, x - 3 * sc, y - h - 3 * sc, 2.5 * sc); }
      for (const r of S.rings) { const k = 1 - r.l, x = X(r.x), y = Y(r.y); g.fillStyle = `rgba(120,200,255,${r.l * .35})`; circ(g, x, y, r.R * sc * (.5 + k * .5)); g.strokeStyle = `rgba(220,245,255,${r.l})`; g.lineWidth = 4 * sc * r.l + 1; g.beginPath(); g.arc(x, y, r.R * sc * (.5 + k * .5), 0, TAU); g.stroke(); }
      // esőfelhők
      for (const c of S.clouds) { const a = Math.min(1, c.l0 * 4, c.life * 3), x = X(c.x), y = Y(c.y), R = c.R * sc; g.globalAlpha = a; g.strokeStyle = 'rgba(160,215,255,.7)'; g.lineWidth = 1.6 * sc;
        for (let i = 0; i < 12; i++) { const px = x + Math.sin(i * 5.3) * R * .85, k = (t * 2.2 + i * .37) % 1, py = y - R * .9 + k * R * 1.5; ln(g, px, py, px - 3 * sc, py + 9 * sc); }
        g.fillStyle = 'rgba(214,222,232,.92)'; const cy = y - R * 1.05; circ(g, x - R * .42, cy + R * .06, R * .3); circ(g, x, cy - R * .08, R * .4); circ(g, x + R * .45, cy + R * .08, R * .28); rrp(g, x - R * .62, cy, R * 1.24, R * .32, R * .16); g.globalAlpha = 1; }
      for (const p of S.pt) { g.fillStyle = `rgba(${p.c},${Math.min(1, p.l * 2.5)})`; circ(g, X(p.x), Y(p.y), 2.6 * sc); }
      g.font = `700 ${11 * sc}px Inter, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; for (const n of S.nums) { g.fillStyle = `rgba(255,255,255,${Math.min(1, n.l * 2.5)})`; g.fillText(n.v, X(n.x), Y(n.y)); }
      // sötétítés a szélek felé
      g.drawImage(VIG, 0, 0, W, H);
      if (joy && joy.touch && !S.choose && G.running) { g.fillStyle = 'rgba(255,255,255,.1)'; circ(g, joy.ox, joy.oy, 46 * d); g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2 * d; g.beginPath(); g.arc(joy.ox, joy.oy, 46 * d, 0, TAU); g.stroke(); g.fillStyle = 'rgba(255,226,154,.55)'; circ(g, joy.x, joy.y, 20 * d); }
      // felső sáv: XP, szint, idő, fejlesztések
      const bx = 12 * d, by = 60 * d, bw = W - 24 * d, bh = 9 * d; g.fillStyle = 'rgba(4,7,14,.7)'; rrp(g, bx, by, bw, bh, bh / 2); g.fillStyle = '#3aa6f5'; if (P.xp > 0) rrp(g, bx, by, Math.max(bh, bw * Math.min(1, P.xp / P.need)), bh, bh / 2);
      g.font = `800 ${13 * d}px Inter, sans-serif`; g.textBaseline = 'middle'; g.lineWidth = 3.5 * d; g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineJoin = 'round';
      const ty = by + bh + 15 * d; g.textAlign = 'right'; const info = P.lvl + '. SZINT · ' + fmtT(S.t); g.strokeText(info, W - 12 * d, ty); g.fillStyle = '#ffe29a'; g.fillText(info, W - 12 * d, ty);
      let ix = 12 * d + 11 * d; g.font = `800 ${9 * d}px Inter, sans-serif`; g.textAlign = 'center';
      for (const k in S.up) { g.fillStyle = 'rgba(4,7,14,.6)'; circ(g, ix, ty, 12 * d); ico(g, k, ix, ty, 17 * d); g.fillStyle = S.up[k] >= MAXLV ? '#ffd23f' : '#fff'; g.strokeText(S.up[k], ix + 9 * d, ty + 8 * d); g.fillText(S.up[k], ix + 9 * d, ty + 8 * d); ix += 27 * d; if (ix > W - 130 * d) break; }
      if (S.banner) { g.globalAlpha = Math.min(1, S.banner.l * 2); g.font = `900 ${Math.min(34 * d, W / 13)}px Cinzel, serif`; g.textAlign = 'center'; g.lineWidth = 6 * d; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(S.banner.t, W / 2, H * .3); g.fillStyle = '#ff5a4d'; g.fillText(S.banner.t, W / 2, H * .3); g.globalAlpha = 1; }
      // szintlépés: választás
      if (S.choose && G.running) { const a = Math.min(1, S.choose.t * 5); g.fillStyle = `rgba(2,4,9,${.72 * a})`; g.fillRect(0, 0, W, H); const cs = cards(G); g.globalAlpha = a;
        g.font = `900 ${Math.min(30 * d, W / 13)}px Cinzel, serif`; g.textAlign = 'center'; g.fillStyle = '#ffe29a'; g.fillText('SZINTLÉPÉS!', W / 2, cs[0].y - 30 * d);
        for (const c of cs) { const u = UP[c.k], cur = lv(c.k), nw = !u.sp && !cur;
          g.fillStyle = 'rgba(14,24,44,.96)'; rrp(g, c.x, c.y, c.w, c.h, 14 * d); g.strokeStyle = nw ? '#e8b656' : 'rgba(120,190,255,.4)'; g.lineWidth = (nw ? 2 : 1.5) * d; g.beginPath(); g.roundRect(c.x, c.y, c.w, c.h, 14 * d); g.stroke();
          g.fillStyle = 'rgba(108,198,255,.12)'; circ(g, c.x + 41 * d, c.y + c.h / 2, 27 * d); ico(g, c.k, c.x + 41 * d, c.y + c.h / 2, 40 * d);
          g.textAlign = 'left'; g.font = `800 ${16 * d}px Inter, sans-serif`; g.fillStyle = '#fff'; g.fillText(u.n, c.x + 80 * d, c.y + c.h / 2 - 12 * d);
          g.font = `500 ${12.5 * d}px Inter, sans-serif`; g.fillStyle = '#c9c3b5'; g.fillText(u.w ? u.d[cur] : u.d, c.x + 80 * d, c.y + c.h / 2 + 11 * d, c.w - 92 * d);
          if (!u.sp) { const tag = nw ? 'ÚJ' : (cur + 1) + '. SZINT'; g.font = `800 ${10.5 * d}px Inter, sans-serif`; const tw = g.measureText(tag).width + 14 * d; g.fillStyle = nw ? '#e8b656' : 'rgba(120,190,255,.22)'; rrp(g, c.x + c.w - tw - 10 * d, c.y + 10 * d, tw, 18 * d, 9 * d); g.fillStyle = nw ? '#1a1004' : '#bfe6ff'; g.textAlign = 'center'; g.fillText(tag, c.x + c.w - tw / 2 - 10 * d, c.y + 19.5 * d); } }
        g.globalAlpha = 1; }
    },
    /* kártyakép az Arcade listájához */
    art(c, x, t) { const W = c.width, H = c.height, cx = W / 2, cy = H / 2 + 6; x.fillStyle = '#9c7a4c'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(64,42,20,.4)'; x.lineWidth = 1.2; for (let i = 0; i < 9; i++) { const px = (i * 71) % W, py = (i * 47) % H; ln(x, px, py, px + 22, py + 9); ln(x, px + 22, py + 9, px + 30, py - 8); }
      for (let i = 0; i < 9; i++) { const a = i * .7 + 1, k = 1 - ((t * .12 + i * .37) % 1), ex = cx + Math.cos(a) * (40 + k * 150), ey = cy + Math.sin(a) * (30 + k * 70); x.save(); x.translate(ex, ey); x.scale(9, 9); cactus(x, 0); x.restore(); }
      x.fillStyle = 'rgba(25,135,255,.38)'; circ(x, cx, cy + 4, 30); for (let i = 0; i < 4; i++) { const a = t * 2.6 + i * 1.5708; x.fillStyle = '#8fd4ff'; circ(x, cx + Math.cos(a) * 34, cy + Math.sin(a) * 34, 4.5); }
      x.fillStyle = '#22324d'; x.fillRect(cx - 5, cy + 6, 4, 8); x.fillRect(cx + 1, cy + 6, 4, 8); x.fillStyle = '#2f8fe0'; rrp(x, cx - 8, cy - 6, 16, 14, 4); x.fillStyle = '#f1c9a0'; circ(x, cx, cy - 12, 7); x.fillStyle = '#d9ad4e'; x.beginPath(); x.ellipse(cx, cy - 15.5, 11.5, 3.3, 0, 0, TAU); x.fill(); x.fillStyle = '#edc970'; rrp(x, cx - 6, cy - 22.5, 12, 7.5, 3);
      x.strokeStyle = 'rgba(191,230,255,.9)'; x.lineWidth = 3; x.lineCap = 'round'; const k = (t * 2) % 1; ln(x, cx + 16 + k * 60, cy, cx + 26 + k * 60, cy - 2); }
  };
  return me;
})();
