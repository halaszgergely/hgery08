/* HGWS Arcade – Mozdonyvezető: felülnézetes teherfuvarozás Magyarország valódi vasúthálózatán (halo.json: tools/vasut_halo.py)
   A szerelvény egy útvonal a sínen (élek sorozata a hátsó végtől az elejéig); előre az eleje, hátrafelé a vége választ váltót. */
'use strict';
(() => {
  const $ = s => document.querySelector(s), cv = $('#c'), g = cv.getContext('2d');
  const KEY = 'hgws_vasut_v1', TS = 10, GAME = 'vasut'; // TS: időgyorsítás (a térkép valódi léptékű)
  const LOCOS = {
    m44: { n: 'M44 „Bobó”', kw: 600, f0: 180, m: 64, vmax: 80, fuel: 2500, len: 14, c: 0, col: '#4f7fbf' },
    m41: { n: 'M41 „Csörgő”', kw: 1320, f0: 200, m: 66, vmax: 100, fuel: 3000, len: 15.5, c: 2.5e6, col: '#c8452f' },
    m62: { n: 'M62 „Szergej”', kw: 1470, f0: 320, m: 116, vmax: 100, fuel: 4500, len: 17.6, c: 7e6, col: '#6b8f3a' },
    v43: { n: 'V43 „Szili”', kw: 3000, f0: 280, m: 80, vmax: 130, el: 1, len: 15.7, c: 14e6, col: '#2f6fb8' },
    taurus: { n: '1047 „Taurus”', kw: 6400, f0: 300, m: 86, vmax: 160, el: 1, len: 19.3, c: 45e6, col: '#d8d8d8' } };
  const CARGO = {
    szen: { n: 'Szén', w: 'Eas nyitott kocsi', m: 80, r: 85, col: '#3b3b3b' },
    kavics: { n: 'Kavics', w: 'Eas nyitott kocsi', m: 78, r: 75, col: '#8a8173' },
    fa: { n: 'Rönkfa', w: 'Roos rakoncás kocsi', m: 60, r: 105, col: '#8a5a2b' },
    aru: { n: 'Darabáru', w: 'Hbbins fedett kocsi', m: 45, r: 135, col: '#6d4a8f' },
    gabona: { n: 'Gabona', w: 'Uagps silókocsi', m: 72, r: 95, col: '#c9a24a' },
    kontener: { n: 'Konténer', w: 'Sgns pőrekocsi', m: 55, r: 120, col: '#2e7d6b' },
    uzemanyag: { n: 'Gázolaj', w: 'Zacns tartálykocsi', m: 70, r: 175, col: '#b8b8b8', haz: 1 } };
  const LEN_LIC = [6, 10, 16, 24, 34], LEN_C = [0, 1.2e6, 4e6, 12e6, 30e6], HAZ_C = 2.5e6, EL_C = 3e6, FUEL_P = 120, KWH_P = 60, CAR_L = 15;
  let H = null, NX, NY, E = [], ADJ = [], ST = [], S = null, cam = { x: 0, y: 0, s: .05, follow: 1 }, keys = {}, lastT = 0, toastT = 0;
  const fmt = n => Math.round(n).toLocaleString('hu-HU'), money = n => (Math.abs(n) >= 1e6 ? (n / 1e6).toLocaleString('hu-HU', { maximumFractionDigits: 2 }) + ' M' : fmt(n)) + ' Ft';
  const toast = (t, bad) => { const el = $('#toast'); el.textContent = t; el.style.color = bad ? '#ff8a7a' : ''; el.hidden = false; el.style.opacity = 1; toastT = 3; };

  /* ---------- hálózat ---------- */
  function build(h) {
    H = h; NX = h.n.map(p => p[0]); NY = h.n.map(p => p[1]); ADJ = h.n.map(() => []);
    E = h.e.map((q, i) => { const p = q[5], n = p.length / 2, cum = new Float32Array(n); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let k = 0; k < n; k++) { const x = p[2 * k], y = p[2 * k + 1]; if (k) cum[k] = cum[k - 1] + Math.hypot(x - p[2 * k - 2], y - p[2 * k - 1]); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      const e = { i, a: q[0], b: q[1], L: Math.max(1, cum[n - 1]), el: q[3], vm: q[4] || 60, p, cum, bb: [x0, y0, x1, y1] }; ADJ[e.a].push({ e: i, end: 0 }); ADJ[e.b].push({ e: i, end: 1 }); return e; });
    ST = h.s.map(q => { const e = E[q[2]], s = Math.min(e.L, q[3] * e.L / (h.e[q[2]][2] || e.L)), [x, y] = at(e, s); return { n: q[0], big: !q[1], e: q[2], s, x, y }; });
  }
  // pont az élen (s méter az „a” végtől)
  function at(e, s) { const p = e.p, c = e.cum, n = c.length; s = Math.max(0, Math.min(e.L, s)); let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
    const d = c[hi] - c[lo] || 1, t = (s - c[lo]) / d, x0 = p[2 * lo], y0 = p[2 * lo + 1], x1 = p[2 * hi], y1 = p[2 * hi + 1]; return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, Math.atan2(y1 - y0, x1 - x0)]; }
  // az élből a csomópontból kifelé mutató irány
  function outDir(e, end) { const p = e.p, n = p.length / 2; let i0 = end ? n - 1 : 0, k = end ? -1 : 1, j = i0 + k; while (j > 0 && j < n - 1 && Math.hypot(p[2 * j] - p[2 * i0], p[2 * j + 1] - p[2 * i0 + 1]) < 25) j += k;
    const dx = p[2 * j] - p[2 * i0], dy = p[2 * j + 1] - p[2 * i0 + 1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }
  // kijárat választása egy csomópontban; vin: érkezési irány. Visszaad: { e, fromA } vagy null (ütköző)
  function exits(node, inE, vin) { const o = []; for (const q of ADJ[node]) { if (q.e === inE && ADJ[node].filter(z => z.e === inE).length < 2) continue; const v = outDir(E[q.e], q.end), dot = v[0] * vin[0] + v[1] * vin[1]; o.push({ e: q.e, fromA: q.end === 0, dot }); } o.sort((a, b) => b.dot - a.dot); const lim = o.length && o[0].dot > .85 ? -.1 : -.6; return o.filter(q => q.dot > lim); }
  function choose(node, inE, vin) { const o = exits(node, inE, vin); if (!o.length) return null; const w = S.sw[node]; return o.find(q => q.e === w) || o[0]; }
  const segEnd = (sg, front) => { const e = E[sg.e]; return (sg.d > 0) === front ? e.b : e.a; };
  const arriveDir = (sg, front) => { const e = E[sg.e], atB = (sg.d > 0) === front, v = outDir(e, atB ? 1 : 0); return [-v[0], -v[1]]; };
  const sOf = (sg, u) => sg.d > 0 ? u : E[sg.e].L - u;

  /* ---------- szerelvény: útvonal a sínen ---------- */
  const trainLen = () => LOCOS[S.loco].len + S.cars.length * CAR_L;
  function fixRear() { // az elejétől visszafelé a szerelvény hosszával
    let rem = trainLen(), i = S.P.length - 1, u = S.fu;
    while (rem > u) { rem -= u; i--; if (i < 0) { const sg = S.P[0], c = choose(segEnd(sg, false), sg.e, arriveDir(sg, false)); if (!c) { S.ru = 0; return; } S.P.unshift({ e: c.e, d: c.fromA ? -1 : 1 }); i = 0; } u = E[S.P[i].e].L; }
    S.P = S.P.slice(i); S.ru = u - rem; }
  function fixFront() { let rem = trainLen(), i = 0, u = E[S.P[0].e].L - S.ru;
    while (rem > u) { rem -= u; i++; if (i >= S.P.length) { const sg = S.P[S.P.length - 1], nd = segEnd(sg, true), c = choose(nd, sg.e, arriveDir(sg, true)); if (!c) { i = S.P.length - 1; break; } S.P.push({ e: c.e, d: c.fromA ? 1 : -1 }); } u = E[S.P[i].e].L; }
    S.P = S.P.slice(0, i + 1); S.fu = Math.min(E[S.P[i].e].L, (i === 0 ? S.ru : 0) + rem); }
  // mozgatás: d > 0 előre (az eleje vezet), d < 0 hátra (a vége vezet); visszaad: ténylegesen megtett út
  function move(d) {
    if (d > 0) { S.fu += d; let done = d;
      while (S.fu > E[S.P[S.P.length - 1].e].L) { const sg = S.P[S.P.length - 1], nd = segEnd(sg, true), c = choose(nd, sg.e, arriveDir(sg, true));
        if (!c) { done -= S.fu - E[sg.e].L; S.fu = E[sg.e].L; S.stop = 1; break; } S.fu -= E[sg.e].L; S.P.push({ e: c.e, d: c.fromA ? 1 : -1 }); }
      fixRear(); return done; }
    if (d < 0) { S.ru += d; let done = -d; // ru: a hátsó vég helye az első szakaszon, előre-irányban mérve
      while (S.ru < 0) { const sg = S.P[0], c = choose(segEnd(sg, false), sg.e, arriveDir(sg, false));
        if (!c) { done -= -S.ru; S.ru = 0; S.stop = 1; break; } S.P.unshift({ e: c.e, d: c.fromA ? -1 : 1 }); S.ru += E[c.e].L; }
      fixFront(); return -done; }
    return 0; }
  // pont a szerelvényen: x méter a hátsó végtől
  function along(x) { let u = S.ru, i = 0; for (;;) { const L = E[S.P[i].e].L, rest = L - u; if (x <= rest || i === S.P.length - 1) { const sg = S.P[i], s = sOf(sg, Math.min(L, u + x)), p = at(E[sg.e], s); if (sg.d < 0) p[2] += Math.PI; return p; } x -= rest; i++; u = 0; } }
  const front = () => along(trainLen()), rear = () => along(0);

  /* ---------- útvonaltervezés (Dijkstra a csomópontokon) ---------- */
  function dijkstra(seeds, maxD = Infinity) { const n = NX.length, D = new Float64Array(n).fill(Infinity), PV = new Int32Array(n).fill(-1), PE = new Int32Array(n).fill(-1), hp = [];
    const push = (d, v) => { hp.push([d, v]); let i = hp.length - 1; while (i) { const p = (i - 1) >> 1; if (hp[p][0] <= hp[i][0]) break; [hp[p], hp[i]] = [hp[i], hp[p]]; i = p; } };
    const pop = () => { const t = hp[0], l = hp.pop(); if (hp.length) { hp[0] = l; let i = 0; for (;;) { let c = 2 * i + 1; if (c >= hp.length) break; if (c + 1 < hp.length && hp[c + 1][0] < hp[c][0]) c++; if (hp[i][0] <= hp[c][0]) break; [hp[c], hp[i]] = [hp[i], hp[c]]; i = c; } } return t; };
    for (const [v, d] of seeds) if (d < D[v]) { D[v] = d; push(d, v); }
    while (hp.length) { const [d, v] = pop(); if (d > D[v] || d > maxD) continue; for (const q of ADJ[v]) { const e = E[q.e], w = q.end ? e.a : e.b, nd = d + e.L; if (nd < D[w]) { D[w] = nd; PV[w] = v; PE[w] = q.e; push(nd, w); } } }
    return { D, PV, PE }; }
  const stSeeds = st => { const e = E[st.e]; return [[e.a, st.s], [e.b, e.L - st.s]]; };
  const stDist = (D, st) => { const e = E[st.e]; return Math.min(D[e.a] + st.s, D[e.b] + e.L - st.s); };
  // tervezett útvonal az eleje előtti csomóponttól a célállomásig, a váltók beállítása
  // irányhelyes útvonal: állapot = irányított él (e*2: a→b, e*2+1: b→a), továbblépni csak a váltó engedte kijáratokon lehet
  let SUCC = null;
  function succ(sid) { SUCC = SUCC || new Array(E.length * 2); if (SUCC[sid]) return SUCC[sid]; const e = sid >> 1, sg = { e, d: sid & 1 ? -1 : 1 };
    return SUCC[sid] = exits(segEnd(sg, true), e, arriveDir(sg, true)).map(q => q.e * 2 + (q.fromA ? 0 : 1)); }
  // D[v]: költség az irányított él végéig. Irányváltás: a csomópont után egy kijáraton kihúzunk (szerelvényhossz + 40 m), visszatolunk, és onnan megyünk tovább
  // ki lehet-e húzni a szerelvényt a w irányított élről indulva legalább T méterre (bármely ágon); visszaad: az állapotok sora vagy null
  const PULL = new Map();
  function canPull(w, T) { const k = w * 4096 + Math.round(T / 10); if (PULL.has(k)) return PULL.get(k); let n = 0;
    const dfs = (x, L, path) => { if (++n > 60) return null; path.push(x); L += E[x >> 1].L; if (L >= T) return path.slice(); for (const y of succ(x)) { const r = dfs(y, L, path); if (r) return r; } path.pop(); return null; };
    const r = dfs(w, 0, []); PULL.set(k, r); return r; }
  function routeTo(starts, st, Tl) { const n = E.length * 2, D = new Float64Array(n).fill(Infinity), PV = new Int32Array(n).fill(-1), RV = new Int32Array(n).fill(-1), hp = [], T = (Tl ?? trainLen()) + 40, PEN = 2500;
    const push = (d, v) => { hp.push([d, v]); let i = hp.length - 1; while (i) { const p = (i - 1) >> 1; if (hp[p][0] <= hp[i][0]) break; [hp[p], hp[i]] = [hp[i], hp[p]]; i = p; } };
    const pop = () => { const t = hp[0], l = hp.pop(); if (hp.length) { hp[0] = l; let i = 0; for (;;) { let c = 2 * i + 1; if (c >= hp.length) break; if (c + 1 < hp.length && hp[c + 1][0] < hp[c][0]) c++; if (hp[i][0] <= hp[c][0]) break; [hp[c], hp[i]] = [hp[i], hp[c]]; i = c; } } return t; };
    for (const [v, d] of starts) { D[v] = d; push(d, v); } let best = Infinity, bv = -1, bRV = -1;
    const relax = (v, w, d0, rv) => { const e = w >> 1, L = E[e].L;
      if (e === st.e) { const t = d0 + (w & 1 ? L - st.s : st.s); if (t < best) { best = t; bv = w; PV[w] = v; RV[w] = rv; } return; }
      const nd = d0 + L; if (nd < D[w]) { D[w] = nd; PV[w] = v; RV[w] = rv; push(nd, w); } };
    while (hp.length) { const [d, v] = pop(); if (d > D[v] || d >= best) continue; const ws = succ(v);
      for (const w of ws) relax(v, w, d, -1);
      for (const w of ws) { if ((w >> 1) === st.e || !canPull(w, T)) continue; for (const u of succ(w ^ 1)) if ((u >> 1) !== (w >> 1)) relax(v, u, d + 2 * T + PEN, w); } }
    if (bv < 0) return null; const path = [bv]; let rev = null; for (let x = bv; PV[x] >= 0;) { const p = PV[x]; if (RV[x] >= 0) { path.unshift(RV[x] ^ 1); path.unshift(RV[x]); rev = { w: RV[x], d: D[p] + T, pull: canPull(RV[x], T) }; } path.unshift(p); x = p; if (starts.some(q => q[0] === p)) break; }
    return { path, d: best, rev }; }
  function plan() { S.route = null; const j = S.jobs.find(q => q.id === S.nav); if (!j) return; const st = ST[j.state === 'taken' ? j.from : j.to];
    const f = S.P[S.P.length - 1], r = S.P[0], fs = f.e * 2 + (f.d > 0 ? 0 : 1), rs = r.e * 2 + (r.d > 0 ? 1 : 0), uOf = sg => sg.d > 0 ? st.s : E[sg.e].L - st.s;
    for (let i = 0; i < S.P.length; i++) { const sg = S.P[i]; if (sg.e !== st.e) continue; const u = uOf(sg), lo = i === 0 ? S.ru : 0, hi = i === S.P.length - 1 ? S.fu : E[sg.e].L;
      if (u >= lo - 5 && u <= hi + 5) { S.route = { edges: [st.e], st, back: false, km: 0 }; S.rlock = null; return; } }
    // elkötelezett irányváltás: amíg az eleje a kihúzó élen van és nem érte el a pontot, azt mutatjuk
    const K = S.rlock; if (K && K.st === st.n && f.e === K.w >> 1 && (f.d > 0) === !(K.w & 1)) { const X = K.u - S.fu;
      if (X > 3) { S.route = { edges: [f.e], st, back: false, km: (K.tot - K.revd + X) / 1000, rev: { x: K.x, y: K.y, dist: X } }; return; } }
    S.rlock = null;
    let A = routeTo([[fs, E[f.e].L - S.fu]], st), B = routeTo([[rs, S.ru]], st);
    if (f.e === st.e && uOf(f) > S.fu && (!A || uOf(f) - S.fu < A.d)) A = { path: [fs], d: uOf(f) - S.fu, rev: null };
    if (r.e === st.e && uOf(r) < S.ru && (!B || S.ru - uOf(r) < B.d)) B = { path: [rs], d: S.ru - uOf(r), rev: null };
    const pb = S.rev ? S.rev < 0 : !!(S.lastBack), o = !A ? B : !B ? A : pb ? (B.d <= A.d * 1.1 ? B : A) : (A.d <= B.d * 1.1 ? A : B); if (!o) return; S.lastBack = o === B;
    const back = o === B && o !== A; let rp = null;
    if (o.rev) { const w = o.rev.w, e = E[w >> 1], T = trainLen() + 40, p = at(e, w & 1 ? e.L - T : T); rp = { x: p[0], y: p[1], dist: o.rev.d }; if (o === A) S.rlock = { st: st.n, w, u: T, tot: o.d, revd: o.rev.d, x: p[0], y: p[1] }; if (S.auto && !(S.time < S.manualT)) { const pl = o.rev.pull || []; for (let k = 0; k + 1 < pl.length; k++) S.sw[segEnd({ e: pl[k] >> 1, d: pl[k] & 1 ? -1 : 1 }, true)] = pl[k + 1] >> 1; } }
    S.route = { edges: o.path.map(v => v >> 1), st, back, km: o.d / 1000, rev: rp };
    if (S.auto && !(S.time < S.manualT)) for (let k = 0; k + 1 < o.path.length; k++) { const v = o.path[k], sg = { e: v >> 1, d: v & 1 ? -1 : 1 }; if ((o.path[k + 1] ^ 1) === v) break; S.sw[segEnd(sg, true)] = o.path[k + 1] >> 1; } }
  // a következő valódi váltó a menetirányban (ahol több kijárat van)
  function nextSwitch() { const fw = S.v >= 0, P = S.P; let sg = fw ? P[P.length - 1] : P[0], dist = fw ? E[sg.e].L - S.fu : S.ru, nd = segEnd(sg, fw), vin = arriveDir(sg, fw);
    for (let k = 0; k < 12 && dist < 15000; k++) { const o = exits(nd, sg.e, vin); if (o.length > 1) return { nd, o, dist, cur: (o.find(q => q.e === S.sw[nd]) || o[0]).e, vin }; if (!o.length) return null;
      const c = o[0], d = fw ? (c.fromA ? 1 : -1) : (c.fromA ? -1 : 1); sg = { e: c.e, d }; dist += E[c.e].L; nd = segEnd(sg, fw); vin = arriveDir(sg, fw); }
    return null; }
  function flip() { const n = nextSwitch(); if (!n) return toast('Nincs váltó a közelben.'); const i = n.o.findIndex(q => q.e === n.cur), nx = n.o[(i + 1) % n.o.length]; S.sw[n.nd] = nx.e; S.manualT = S.time + 150; beep(880, .05); }
  const turnName = n => { const v = n.vin, q = n.o.find(o => o.e === n.cur), w = outDir(E[q.e], q.fromA ? 0 : 1), cr = v[0] * w[1] - v[1] * w[0]; return Math.abs(cr) < .12 ? 'egyenesen' : cr > 0 ? 'jobbra' : 'balra'; };

  /* ---------- munkák ---------- */
  let JID = 1;
  function board(si) { const b = S.boards[si], now = S.time; if (b && now - b.t < 3 * 3600) return b.jobs; // 3 játékóránként új tábla
    const R = dijkstra(stSeeds(ST[si]), 160000), cand = ST.map((st, i) => [i, stDist(R.D, st)]).filter(([i, d]) => i !== si && ST[i].big && d > 8000 && d < 160000);
    let h = (si * 2654435761 + Math.floor(now / 10800) * 97) >>> 0; const rnd = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
    const jobs = []; for (let k = 0; k < 14 && jobs.length < 6 && cand.length; k++) { const [to] = cand[Math.floor(rnd() * cand.length)], cks = Object.keys(CARGO), cg = cks[Math.floor(rnd() * cks.length)], C = CARGO[cg];
      const cap0 = rnd() < .25 ? LEN_LIC[Math.min(LEN_LIC.length - 1, S.lic.len + 1)] : licMax(), n = Math.max(2, Math.round(2 + rnd() * (cap0 - 2))), a = ST[si], tl = LOCOS.m62.len + n * CAR_L, ra = routeTo([[a.e * 2, E[a.e].L - a.s]], ST[to], tl), rb = routeTo([[a.e * 2 + 1, a.s]], ST[to], tl), d = Math.min(ra ? ra.d : Infinity, rb ? rb.d : Infinity); if (!isFinite(d) || d > 220000) continue; const km = d / 1000, pay = Math.round(n * km * C.r * 4 * (1 + .3 * rnd()) / 100) * 100;
      jobs.push({ id: JID++ + '_' + si + '_' + k + '_' + Math.floor(now), from: si, to, cg, n, km, pay, lim: Math.round(d / 13 + 1800), state: 'board' }); }
    S.boards[si] = { t: now, jobs }; return jobs; }
  const carsNow = () => S.cars.length, licMax = () => LEN_LIC[S.lic.len];
  function take(j) { if (S.jobs.length >= 4) return toast('Egyszerre legfeljebb 4 munkád lehet.', 1); if (CARGO[j.cg].haz && !S.lic.haz) return toast('Veszélyesáru-engedély kell hozzá (Depó).', 1);
    j.state = 'taken'; j.t0 = S.time; S.jobs.push(j); S.boards[j.from].jobs = S.boards[j.from].jobs.filter(q => q !== j); if (!S.nav) S.nav = j.id; plan(); ui(); toast('Munka felvéve: ' + j.n + ' × ' + CARGO[j.cg].n + ' → ' + ST[j.to].n); }
  const nearSt = () => { if (Math.abs(S.v) > .6) return -1; let best = -1, bd = 450; const L = trainLen(); for (let x = 0; x <= L; x += Math.max(10, L / 6)) { const p = along(x); for (const i of S.nearIdx) { const st = ST[i], d = Math.hypot(st.x - p[0], st.y - p[1]); if (d < bd) { bd = d; best = i; } } } return best; };
  function couple(j) { if (carsNow() + j.n > licMax()) return toast('Túl hosszú lenne a szerelvény: legfeljebb ' + licMax() + ' kocsi (Depó: engedély).', 1);
    for (let k = 0; k < j.n; k++) S.cars.push({ j: j.id, cg: j.cg }); j.state = 'loaded'; fixRear(); plan(); beep(300, .12); toast(j.n + ' kocsi felkapcsolva.'); ui(); }
  function uncouple(j) { const late = S.time - j.t0 > j.lim, pay = Math.round(j.pay * (late ? .7 : 1.25)); S.cars = S.cars.filter(c => c.j !== j.id); S.jobs = S.jobs.filter(q => q !== j); fixRear();
    S.money += pay; S.life += pay; S.done++; if (S.nav === j.id) S.nav = S.jobs[0] ? S.jobs[0].id : null; plan(); beep(1200, .15); toast((late ? 'Késve leszállítva: +' : 'Időben leszállítva: +') + money(pay)); score(); ui(); }
  function score() { try { if (window.top !== window && S.life > 0) parent.postMessage({ hgws: 'score', game: GAME, score: Math.floor(S.life) }, location.origin); } catch (_) {} }

  /* ---------- állapot, mentés ---------- */
  function fresh() { let si = ST.findIndex(s => s.big && /Kelenföld/.test(s.n)); if (si < 0) si = ST.findIndex(s => s.big);
    const st = ST[si]; S = { money: 150000, life: 0, time: 6 * 3600, loco: 'm44', own: ['m44'], fuel: LOCOS.m44.fuel, lic: { len: 0, haz: 0, el: 0 }, P: [{ e: st.e, d: 1 }], fu: Math.min(E[st.e].L, st.s + 30), ru: 0, v: 0, thr: 0, brk: 4, rev: 1, cars: [], jobs: [], boards: {}, sw: {}, nav: null, auto: 1, done: 0 };
    fixRear(); cam.x = st.x; cam.y = st.y; cam.s = .25; }
  function save() { if (!S) return; try { const { route, nearIdx, stop, manualT, rlock, lastBack, gr, ...o } = S; localStorage.setItem(KEY, JSON.stringify(o)); } catch (_) {} }
  function load() { try { const o = JSON.parse(localStorage.getItem(KEY)); if (!o || !o.P || o.P.some(sg => !E[sg.e])) return false; S = { ...o }; fixRear(); return true; } catch (_) { return false; } }

  /* ---------- fizika ---------- */
  let ovT = 0, nearT = 0, planT = 0;
  // emelkedő a szerelvény közepén, a szerelvény előre-irányában (a domborzati rácsból)
  function grade() { if (!window.Taj || !Taj.ready) return 0; const L = trainLen(), p = along(L / 2), q = along(Math.max(0, L / 2 - 80)), r = along(Math.min(L, L / 2 + 80)); let a = Math.atan2(r[1] - q[1], r[0] - q[0]); if (L < 170) a = p[2];
    const c = Math.cos(a), sn = Math.sin(a); return Math.max(-.022, Math.min(.022, .8 * (Taj.zAt(p[0] + c * 300, p[1] + sn * 300) - Taj.zAt(p[0] - c * 300, p[1] - sn * 300)) / 600)); }
  function step(dt) { const Lc = LOCOS[S.loco], M = (Lc.m + S.cars.reduce((a, c) => a + CARGO[c.cg].m + 22, 0)) * 1000, v = S.v, ad = Math.abs(v);
    const fe = E[S.P[S.P.length - 1].e], onEl = fe.el, power = Lc.el ? (onEl ? 1 : 0) : S.fuel > 0 ? 1 : 0;
    const Ft = S.rev && power ? Math.min(Lc.f0 * 1000, Lc.kw * 1000 / Math.max(ad, 1.5)) * S.thr / 8 * (ad * 3.6 >= Lc.vmax ? 0 : 1) : 0;
    const Fr = M * 9.81 * .0018 + 4 * v * v, Fb = (S.brk / 6) * M * 9.81 * .11 + (keys[' '] ? M * 9.81 * .11 : 0);
    const gr = grade(); S.gr = gr; let a = (S.rev * Ft) / M - 9.81 * gr, dec = (Fr + Fb) / M; let nv = v + a * dt; if (nv > 0) nv = Math.max(0, nv - dec * dt); else if (nv < 0) nv = Math.min(0, nv + dec * dt); S.v = nv;
    if (Lc.el) { const kwh = Lc.kw * S.thr / 8 * dt / 3600; if (power) S.money -= kwh * KWH_P; } else { S.fuel = Math.max(0, S.fuel - Lc.kw * .27 / 3600 * (S.thr / 8 + .03) * dt); }
    S.stop = 0; const moved = move(S.v * dt); if (S.stop) { if (Math.abs(S.v) * 3.6 > 15) toast('Ütközőbak! A szerelvény megállt.', 1); S.v = 0; }
    S.time += dt; const lim = fe.vm || 60; if (ad * 3.6 > lim + 10) { ovT += dt; if (ovT > 8 && ovT - dt <= 8) toast('Lassíts! ' + lim + ' km/h a pálya', 1); if (ovT > 40) { ovT = 8; S.money -= 2000; toast('Gyorshajtás: −2 000 Ft', 1); } } else ovT = 0;
    if ((nearT -= dt) <= 0) { nearT = 60; const p = front(); S.nearIdx = ST.map((s, i) => [i, Math.hypot(s.x - p[0], s.y - p[1])]).filter(q => q[1] < 6000).map(q => q[0]); }
    if ((planT -= dt) <= 0) { planT = 6; plan(); } }

  /* ---------- rajz ---------- */
  function draw() { const W = cv.width, Hh = cv.height, d = devicePixelRatio || 1, s = cam.s * d;
    if (cam.follow && S) { const p = front(); cam.x = p[0]; cam.y = p[1]; }
    const X = x => (x - cam.x) * s + W / 2, Y = y => (y - cam.y) * s + Hh / 2, x0 = cam.x - W / 2 / s, x1 = cam.x + W / 2 / s, y0 = cam.y - Hh / 2 / s, y1 = cam.y + Hh / 2 / s;
    g.fillStyle = '#101812'; g.fillRect(0, 0, W, Hh);
    g.lineJoin = 'round'; g.lineCap = 'round';
    const tj = window.Taj && Taj.draw(g, W, Hh, s, d, cam.x, cam.y);
    if (!tj) for (const r of H.o) { g.beginPath(); for (let i = 0; i < r.length; i += 2) i ? g.lineTo(X(r[i]), Y(r[i + 1])) : g.moveTo(X(r[i]), Y(r[i + 1])); g.closePath(); g.fillStyle = '#1b2a1c'; g.fill(); g.strokeStyle = 'rgba(160,190,140,.18)'; g.lineWidth = 1 * d; g.stroke(); }
    if (s < .03 * d) for (const r of H.w) { g.beginPath(); for (let i = 1; i < r.length; i += 2) i > 1 ? g.lineTo(X(r[i]), Y(r[i + 1])) : g.moveTo(X(r[i]), Y(r[i + 1])); g.strokeStyle = '#2f5f8f'; g.lineWidth = Math.max(r[0] ? 2 * d : 1 * d, (r[0] ? 300 : 40) * s); g.globalAlpha = tj ? .8 : 1; g.stroke(); g.globalAlpha = 1; }
    const vis = e => !(e.bb[2] < x0 || e.bb[0] > x1 || e.bb[3] < y0 || e.bb[1] > y1), path = e => { const p = e.p; g.moveTo(X(p[0]), Y(p[1])); for (let i = 2; i < p.length; i += 2) g.lineTo(X(p[i]), Y(p[i + 1])); };
    const rw = Math.max(1.3 * d, 4 * s);
    if (s > .25 * d) { g.beginPath(); for (const e of E) if (vis(e)) path(e); g.strokeStyle = 'rgba(78,72,64,.9)'; g.lineWidth = 6.5 * s; g.stroke(); }
    g.beginPath(); for (const e of E) if (vis(e) && !e.el) path(e); g.strokeStyle = '#7a7466'; g.lineWidth = rw; g.stroke();
    g.beginPath(); for (const e of E) if (vis(e) && e.el) path(e); g.strokeStyle = '#a9b4c2'; g.lineWidth = rw; g.stroke();
    if (s > .6 * d) { g.beginPath(); for (const e of E) if (vis(e)) path(e); g.strokeStyle = '#2a2a2a'; g.lineWidth = rw * .35; g.stroke(); }
    if (S.route) { g.beginPath(); for (const ei of S.route.edges) path(E[ei]); g.strokeStyle = 'rgba(94,224,138,.6)'; g.lineWidth = Math.max(rw * 2.2, 3.5 * d); g.stroke(); }
    if (S.route && S.route.rev) { const q = S.route.rev; g.fillStyle = '#ffb347'; g.strokeStyle = '#000'; g.lineWidth = 2 * d; g.beginPath(); g.arc(X(q.x), Y(q.y), 7 * d, 0, 6.283); g.fill(); g.stroke(); g.fillStyle = '#000'; g.font = `800 ${9 * d}px Inter`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⇄', X(q.x), Y(q.y)); }
    // állomások
    g.textAlign = 'center'; g.textBaseline = 'bottom';
    for (let i = 0; i < ST.length; i++) { const st = ST[i]; if (st.x < x0 - 500 || st.x > x1 + 500 || st.y < y0 - 500 || st.y > y1 + 500) continue; if (!st.big && s < .04 * d) continue; const tj = S.jobs.some(j => (j.state === 'taken' && j.from === i) || (j.state === 'loaded' && j.to === i));
      g.fillStyle = tj ? '#ffe29a' : st.big ? '#e8b656' : '#c8c8c8'; g.beginPath(); g.arc(X(st.x), Y(st.y), (st.big ? (s < .01 * d ? 2.6 : 4.5) : 3) * d + (tj ? 2 * d : 0), 0, 6.283); g.fill(); g.strokeStyle = '#000'; g.lineWidth = d; g.stroke();
      if (tj || (st.big && s > .02 * d) || s > .1 * d) { g.font = `${st.big || tj ? 700 : 500} ${(st.big ? 12 : 10.5) * d}px Inter, sans-serif`; g.lineWidth = 3 * d; g.strokeStyle = 'rgba(0,0,0,.8)'; g.strokeText(st.n, X(st.x), Y(st.y) - 6 * d); g.fillStyle = tj ? '#ffe29a' : '#e6e6e6'; g.fillText(st.n, X(st.x), Y(st.y) - 6 * d); } }
    // következő váltó
    const n = nextSwitch(); if (n && n.dist < 4000) { const px = X(NX[n.nd]), py = Y(NY[n.nd]); for (const q of n.o) { const w = outDir(E[q.e], q.fromA ? 0 : 1), sel = q.e === n.cur, L = 26 * d; g.strokeStyle = sel ? '#5ee08a' : 'rgba(255,255,255,.35)'; g.lineWidth = (sel ? 4 : 2) * d; g.beginPath(); g.moveTo(px, py); g.lineTo(px + w[0] * L, py + w[1] * L); g.stroke(); }
      g.fillStyle = '#ffe29a'; g.beginPath(); g.arc(px, py, 5 * d, 0, 6.283); g.fill(); }
    // szerelvény
    const Lc = LOCOS[S.loco], L = trainLen(), drawVeh = (x, len, col, loco) => { const a = along(x), b = along(Math.min(L, x + len)), cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2, an = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const lw = Math.max(len * s, loco ? 10 * d : 4 * d), wd = Math.max(3.1 * s, loco ? 6 * d : 4 * d); g.save(); g.translate(X(cx), Y(cy)); g.rotate(an); g.fillStyle = '#000'; g.fillRect(-lw / 2 - d, -wd / 2 - d, lw + 2 * d, wd + 2 * d); g.fillStyle = col; g.fillRect(-lw / 2, -wd / 2, lw, wd);
      if (loco) { g.fillStyle = '#ffe29a'; g.fillRect(lw / 2 - Math.max(2 * d, lw * .12), -wd / 2, Math.max(2 * d, lw * .12), wd); } g.restore(); };
    let x = 0; for (let k = S.cars.length - 1; k >= 0; k--) { drawVeh(x + .6, CAR_L - 1.2, CARGO[S.cars[k].cg].col); x += CAR_L; } drawVeh(x, Lc.len, Lc.col, 1);
    if (s < .02 * d) { const p = front(); g.strokeStyle = '#ffe29a'; g.lineWidth = 2 * d; g.beginPath(); g.arc(X(p[0]), Y(p[1]), 9 * d, 0, 6.283); g.stroke(); }
    // lépték
    const mpp = 1 / s * d, nice = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000].find(v => v / mpp > 60 * d) || 100000; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(W - 20 * d - nice / mpp * d, Hh - 16 * d, nice / mpp * d, 2 * d); g.font = `600 ${10 * d}px Inter`; g.textAlign = 'right'; g.fillText(nice >= 1000 ? nice / 1000 + ' km' : nice + ' m', W - 20 * d, Hh - 20 * d); }

  /* ---------- felület ---------- */
  let AC = '';
  function ui() { if (!S) return; const Lc = LOCOS[S.loco]; $('#money').textContent = '💰 ' + money(S.money); const hh = Math.floor(S.time / 3600) % 24, mm = Math.floor(S.time / 60) % 60; $('#clock').textContent = 'Nap ' + (Math.floor(S.time / 86400) + 1) + ' · ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    $('#spd').innerHTML = Math.round(Math.abs(S.v) * 3.6) + '<small>km/h</small>'; $('#lim').textContent = E[S.P[S.P.length - 1].e].vm || '–';
    $('#thr').innerHTML = Array.from({ length: 8 }, (_, i) => `<i class="${i < S.thr ? 'on' : ''}"></i>`).join(''); $('#thrT').textContent = S.thr + '/8';
    $('#brk').innerHTML = Array.from({ length: 6 }, (_, i) => `<i class="${i < S.brk || keys[' '] ? 'on' : ''}"></i>`).join('');
    document.querySelectorAll('#rev .b').forEach(b => b.classList.toggle('on', +b.dataset.r === S.rev));
    if (Lc.el) { const on = E[S.P[S.P.length - 1].e].el; $('#fuT').textContent = on ? '⚡ Felsővezeték: van' : '⚡ Nincs felsővezeték – nincs vonóerő'; $('#fuT').className = on ? '' : 'warn'; $('#fuB').style.width = on ? '100%' : '0'; }
    else { $('#fuT').textContent = '⛽ Gázolaj: ' + fmt(S.fuel) + ' / ' + fmt(Lc.fuel) + ' L'; $('#fuT').className = S.fuel < Lc.fuel * .15 ? 'warn' : ''; $('#fuB').style.width = (S.fuel / Lc.fuel * 100) + '%'; }
    $('#locoN').textContent = Lc.n + ' · ' + S.cars.length + ' kocsi · ' + Math.round((Lc.m + S.cars.reduce((a, c) => a + CARGO[c.cg].m + 22, 0))) + ' t' + (Math.abs(S.gr || 0) >= .001 ? ' · ' + (S.gr > 0 ? '↗ ' : '↘ ') + (Math.abs(S.gr) * 100).toFixed(1).replace('.', ',') + '%' : '');
    const n = nextSwitch(); const R = S.route, rv = R && R.rev ? R.rev.dist - 0 : 0; $('#swT').textContent = (R && R.rev ? '🔁 Irányváltás ' + (rv < 1000 ? Math.round(rv / 10) * 10 + ' m' : (rv / 1000).toFixed(1).replace('.', ',') + ' km') + ' múlva · ' : '') + (S.route ? (S.route.back ? '🔁 A cél mögötted van · ' : '') + (S.route.km ? S.route.km.toFixed(1).replace('.', ',') + ' km a célig · ' : '') : '') + (n ? 'Váltó ' + (n.dist < 1000 ? Math.round(n.dist / 10) * 10 + ' m' : (n.dist / 1000).toFixed(1).replace('.', ',') + ' km') + ': ' + turnName(n) : 'Nincs váltó előtted');
    // állomási műveletek
    const si = nearSt(); let h = ''; if (si >= 0) { h += `<span class="mut">📍 ${ST[si].n}</span>`;
      for (const j of S.jobs) { if (j.state === 'taken' && j.from === si) h += `<button class="b sm g" data-c="${j.id}">🔗 Felkapcsolás: ${j.n} × ${CARGO[j.cg].n}</button>`; if (j.state === 'loaded' && j.to === si) h += `<button class="b sm g" data-u="${j.id}">📦 Lekapcsolás: ${j.n} × ${CARGO[j.cg].n}</button>`; }
      if (ST[si].big && !Lc.el && S.fuel < Lc.fuel - 1) h += `<button class="b sm" data-f>⛽ Tankolás (${money((Lc.fuel - S.fuel) * FUEL_P)})</button>`; }
    if (h !== AC) { AC = h; $('#acts').innerHTML = h; }
    $('#bBoard').disabled = !(si >= 0 && ST[si].big); $('#bDepo').disabled = !(si >= 0 && ST[si].big); $('#bFollow').hidden = !!cam.follow;
    const jl = S.jobs.map(j => { const left = j.lim - (S.time - j.t0), tgt = ST[j.state === 'taken' ? j.from : j.to]; return `<div class="job${S.nav === j.id ? ' nav' : ''}" data-n="${j.id}"><b>${j.n} × ${CARGO[j.cg].n}</b> · ${money(j.pay)}<br><span class="mut">${j.state === 'taken' ? '🔗 Felvétel: ' : '📦 Cél: '}${tgt.n}</span><br><span class="${left < 0 ? 'warn' : 'mut'}">${left < 0 ? 'Késésben' : 'Határidő: ' + Math.floor(left / 3600) + ' ó ' + Math.floor(left % 3600 / 60) + ' p'}</span></div>`; }).join('');
    $('#jobs').hidden = !S.jobs.length; if ($('#jobs').dataset.h !== jl) { $('#jobs').dataset.h = jl; $('#jobs').innerHTML = '<div class="lab">Munkák · kattints a navigációhoz</div>' + jl; } }
  function panel(html) { $('#pc').innerHTML = html; $('#pnl').hidden = false; }
  const closeP = () => { $('#pnl').hidden = true; };
  function showBoard() { const si = nearSt(); if (si < 0 || !ST[si].big) return; const jobs = board(si);
    panel(`<div class="row"><h1 style="font-size:22px">📋 ${ST[si].n}</h1><div style="flex:1"></div><button class="b" data-x>✕</button></div><p class="mut">Teherfuvar-megbízások ebből az állomásból. A kocsik itt várnak: állj meg az állomáson és kapcsold fel őket.</p>` +
      (jobs.length ? jobs.map(j => { const C = CARGO[j.cg], lock = C.haz && !S.lic.haz, long = j.n > licMax(); return `<div class="it"><div class="grow"><b>${j.n} × ${C.n}</b> → ${ST[j.to].n}<small>${C.w} · ${j.km.toFixed(0)} km · ${Math.round(j.n * (C.m + 22))} t · határidő ${Math.floor(j.lim / 3600)} ó ${Math.floor(j.lim % 3600 / 60)} p${C.haz ? ' · ☣ veszélyes áru' : ''}</small></div><b style="color:var(--gold2)">${money(j.pay)}</b><button class="b sm g" data-t="${j.id}" ${lock || long ? 'disabled' : ''}>${lock ? 'Engedély kell' : long ? 'Max ' + licMax() + ' kocsi' : 'Elvállalom'}</button></div>`; }).join('') : '<p class="mut">Most nincs szabad munka – nézz vissza később.</p>')); }
  function showDepo() { const si = nearSt(); if (si < 0 || !ST[si].big) return; const L = LEN_LIC[S.lic.len + 1];
    panel(`<div class="row"><h1 style="font-size:22px">🏭 Depó · ${ST[si].n}</h1><div style="flex:1"></div><button class="b" data-x>✕</button></div><h2>Mozdonyok</h2>` +
      Object.entries(LOCOS).map(([k, Lc]) => { const own = S.own.includes(k), cur = S.loco === k, lock = Lc.el && !S.lic.el; return `<div class="it"><div class="grow"><b>${Lc.n}</b>${cur ? ' · <span style="color:var(--ok)">használatban</span>' : ''}<small>${Lc.kw} kW · ${Lc.f0} kN · ${Lc.vmax} km/h · ${Lc.m} t · ${Lc.el ? 'villamos (felsővezeték kell)' : 'dízel, ' + Lc.fuel + ' L'}</small></div>${own ? (cur ? '' : `<button class="b sm" data-l="${k}">Átszállás</button>`) : `<button class="b sm g" data-buy="${k}" ${lock || S.money < Lc.c ? 'disabled' : ''}>${lock ? 'Villamos engedély kell' : money(Lc.c)}</button>`}</div>`; }).join('') +
      `<h2>Engedélyek</h2><div class="it"><div class="grow"><b>Szerelvényhossz: ${licMax()} kocsi</b><small>${L ? 'Következő: ' + L + ' kocsi' : 'Elérted a legnagyobbat'}</small></div>${L ? `<button class="b sm g" data-lic="len" ${S.money < LEN_C[S.lic.len + 1] ? 'disabled' : ''}>${money(LEN_C[S.lic.len + 1])}</button>` : ''}</div>
      <div class="it"><div class="grow"><b>Veszélyes áru</b><small>Gázolaj-szállítás tartálykocsiban</small></div>${S.lic.haz ? '<span style="color:var(--ok)">megvan</span>' : `<button class="b sm g" data-lic="haz" ${S.money < HAZ_C ? 'disabled' : ''}>${money(HAZ_C)}</button>`}</div>
      <div class="it"><div class="grow"><b>Villamos vontatás</b><small>V43 és Taurus vezetése felsővezetékes vonalakon</small></div>${S.lic.el ? '<span style="color:var(--ok)">megvan</span>' : `<button class="b sm g" data-lic="el" ${S.money < EL_C ? 'disabled' : ''}>${money(EL_C)}</button>`}</div>`); }
  $('#pnl').addEventListener('click', e => { const t = e.target.closest('button'); if (e.target.id === 'pnl' || (t && t.dataset.x !== undefined)) return closeP(); if (!t) return;
    if (t.dataset.t) { const si = nearSt(), j = (S.boards[si] || { jobs: [] }).jobs.find(q => q.id === t.dataset.t); if (j) { take(j); showBoard(); } }
    if (t.dataset.buy) { const Lc = LOCOS[t.dataset.buy]; if (S.money >= Lc.c) { S.money -= Lc.c; S.own.push(t.dataset.buy); toast(Lc.n + ' megvásárolva.'); showDepo(); } }
    if (t.dataset.l) { if (S.cars.length) return toast('Előbb kapcsold le a kocsikat.', 1); S.loco = t.dataset.l; S.fuel = LOCOS[S.loco].fuel || 0; fixRear(); toast('Átszálltál: ' + LOCOS[S.loco].n); showDepo(); }
    if (t.dataset.lic) { const k = t.dataset.lic, c = k === 'len' ? LEN_C[S.lic.len + 1] : k === 'haz' ? HAZ_C : EL_C; if (S.money >= c) { S.money -= c; if (k === 'len') S.lic.len++; else S.lic[k] = 1; toast('Engedély megszerezve.'); showDepo(); } }
    ui(); save(); });
  $('#acts').addEventListener('click', e => { const t = e.target.closest('button'); if (!t) return; const j = S.jobs.find(q => q.id === (t.dataset.c || t.dataset.u));
    if (t.dataset.c && j) couple(j); if (t.dataset.u && j) uncouple(j);
    if (t.dataset.f !== undefined) { const Lc = LOCOS[S.loco], need = Lc.fuel - S.fuel, can = Math.min(need, S.money / FUEL_P); S.money -= can * FUEL_P; S.fuel += can; toast('Tankolás: ' + fmt(can) + ' L'); }
    AC = ''; ui(); save(); });
  $('#jobs').addEventListener('click', e => { const t = e.target.closest('[data-n]'); if (!t) return; S.nav = t.dataset.n; plan(); const j = S.jobs.find(q => q.id === S.nav), st = ST[j.state === 'taken' ? j.from : j.to]; toast('Navigáció: ' + st.n); ui(); });
  $('#rev').addEventListener('click', e => { const t = e.target.closest('[data-r]'); if (t) setRev(+t.dataset.r); });
  function setRev(r) { if (Math.abs(S.v) > .5 && r !== 0 && r !== S.rev) return toast('Irányváltás csak álló helyzetben.', 1); S.rev = r; beep(500, .05); plan(); ui(); }
  $('#bSw').onclick = flip; $('#bBoard').onclick = showBoard; $('#bDepo').onclick = showDepo; $('#bFollow').onclick = () => { cam.follow = 1; };
  $('#bMap').onclick = () => { if (cam.s > .003) { cam.prev = cam.s; cam.s = Math.min(cv.width, cv.height) / (devicePixelRatio || 1) / 560000; cam.follow = 0; } else { cam.s = cam.prev || .25; cam.follow = 1; } };
  $('#bMenu').onclick = () => { save(); $('#menu').hidden = false; $('#mPlay').textContent = '▶ Folytatás'; };
  const hold = (el, f) => { let iv = null; el.addEventListener('pointerdown', e => { e.preventDefault(); f(); iv = setInterval(f, 180); }); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(ev, () => { clearInterval(iv); iv = null; }); };
  hold($('#cUp'), () => { if (S.brk) S.brk--; else S.thr = Math.min(8, S.thr + 1); ui(); }); hold($('#cDn'), () => { if (S.thr) S.thr--; else S.brk = Math.min(6, S.brk + 1); ui(); });
  $('#cBr').addEventListener('pointerdown', () => { keys[' '] = 1; }); for (const ev of ['pointerup', 'pointerleave']) $('#cBr').addEventListener(ev, () => { keys[' '] = 0; }); $('#cSw').onclick = flip;

  addEventListener('keydown', e => { if (!S || !$('#menu').hidden) return; const k = e.key.toLowerCase(); if (e.key === ' ') e.preventDefault(); if (keys[k]) return; keys[k] = 1;
    if (k === 'w') { S.thr = Math.min(8, S.thr + 1); } if (k === 's') { S.thr = Math.max(0, S.thr - 1); } if (k === 'b') S.brk = Math.min(6, S.brk + 1); if (k === 'n') S.brk = Math.max(0, S.brk - 1);
    if (k === 'r') setRev(S.rev === 1 ? 0 : S.rev === 0 ? (S.v > .5 ? 1 : -1) : 0); if (k === 'v') flip(); if (k === 'm') $('#bMap').onclick(); if (k === 'escape') { if (!$('#pnl').hidden) closeP(); else $('#bMenu').onclick(); } ui(); });
  addEventListener('keyup', e => { keys[e.key.toLowerCase()] = 0; });
  // kamera: görgő, húzás, kattintás váltóra
  cv.addEventListener('wheel', e => { e.preventDefault(); const f = Math.exp(-Math.max(-80, Math.min(80, e.deltaY)) * .0025); cam.s = Math.max(.0012, Math.min(3, cam.s * f)); }, { passive: false });
  let drag = null; const PT = new Map();
  cv.addEventListener('pointerdown', e => { PT.set(e.pointerId, { x: e.clientX, y: e.clientY }); drag = { x: e.clientX, y: e.clientY, m: 0 }; if (PT.size === 2) { const [a, b] = [...PT.values()]; drag.pinch = Math.hypot(a.x - b.x, a.y - b.y); drag.s0 = cam.s; } });
  cv.addEventListener('pointermove', e => { if (!drag || !PT.has(e.pointerId)) return; PT.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (PT.size === 2 && drag.pinch) { const [a, b] = [...PT.values()]; cam.s = Math.max(.0012, Math.min(3, drag.s0 * Math.hypot(a.x - b.x, a.y - b.y) / drag.pinch)); drag.m = 99; return; }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.m += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY; if (drag.m > 6) { cam.follow = 0; cam.x -= dx / cam.s; cam.y -= dy / cam.s; } });
  cv.addEventListener('pointerup', e => { PT.delete(e.pointerId); if (drag && drag.m < 6 && S) { const r = cv.getBoundingClientRect(), wx = cam.x + (e.clientX - r.left - r.width / 2) / cam.s, wy = cam.y + (e.clientY - r.top - r.height / 2) / cam.s, n = nextSwitch();
      if (n && Math.hypot(NX[n.nd] - wx, NY[n.nd] - wy) < 40 / cam.s) flip(); } if (!PT.size) drag = null; });

  /* ---------- hang ---------- */
  let AX = null; function beep(f, d) { try { AX = AX || new AudioContext(); const o = AX.createOscillator(), gn = AX.createGain(); o.frequency.value = f; o.type = 'square'; gn.gain.value = .04; gn.gain.exponentialRampToValueAtTime(.0001, AX.currentTime + d); o.connect(gn).connect(AX.destination); o.start(); o.stop(AX.currentTime + d); } catch (_) {} }

  /* ---------- főciklus ---------- */
  function resize() { const d = devicePixelRatio || 1; cv.width = innerWidth * d; cv.height = innerHeight * d; } addEventListener('resize', resize); resize();
  let uiT = 0, saveT = 0, scT = 0;
  function loop(t) { requestAnimationFrame(loop); const dt = Math.min(.05, (t - lastT) / 1000 || 0); lastT = t; if (!H || !S) return;
    if ($('#menu').hidden && $('#pnl').hidden) { const sub = 4; for (let k = 0; k < sub; k++) step(dt * TS / sub); }
    draw(); if ((uiT -= dt) <= 0) { uiT = .15; ui(); } if ((saveT -= dt) <= 0) { saveT = 5; save(); } if ((scT -= dt) <= 0) { scT = 60; score(); }
    if (toastT > 0 && (toastT -= dt) <= 0) $('#toast').hidden = true; }
  requestAnimationFrame(loop);
  if (window.Taj) Taj.load('202611212100').catch(() => {});
  fetch('halo.json?v=202611212043').then(r => r.json()).then(h => { build(h); const ok = load(); if (!ok) fresh(); S.nearIdx = []; nearT = 0;
    $('#mLoad').textContent = (H.e.reduce((a, e) => a + e[2], 0) / 1000).toFixed(0) + ' km vasútvonal · ' + ST.length + ' állomás és megálló'; $('#mPlay').disabled = false; $('#mPlay').textContent = ok ? '▶ Folytatás' : '▶ Játék'; $('#mNew').hidden = !ok; })
    .catch(() => { $('#mLoad').textContent = 'Nem sikerült betölteni a vasúthálózatot.'; });
  $('#mPlay').onclick = () => { $('#menu').hidden = true; beep(660, .08); };
  $('#mNew').onclick = () => { if ($('#mNew').dataset.sure) { localStorage.removeItem(KEY); fresh(); S.nearIdx = []; nearT = 0; $('#menu').hidden = true; delete $('#mNew').dataset.sure; $('#mNew').textContent = 'Új játék'; } else { $('#mNew').dataset.sure = 1; $('#mNew').textContent = 'Biztos? Minden elvész'; } };
  addEventListener('pagehide', save);
  window.__vt = () => ({ S, E, ST, NX, NY, ADJ, dijkstra, exits, outDir, routeTo, succ, step, ui, move, plan, nextSwitch, flip, board, take, couple, uncouple, nearSt, front, along, cam });
})();
