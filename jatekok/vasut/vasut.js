/* HGWS Arcade – Mozdonyvezető: felülnézetes teherfuvarozás Magyarország valódi vasúthálózatán (halo.json: tools/vasut_halo.py)
   A szerelvény egy útvonal a sínen (élek sorozata a hátsó végtől az elejéig); előre az eleje, hátrafelé a vége választ váltót. */
'use strict';
(() => {
  const $ = s => document.querySelector(s), cv = $('#c'), g = cv.getContext('2d');
  const KEY = 'hgws_vasut_v1', TS = 10, GAME = 'vasut'; // TS: időgyorsítás (a térkép valódi léptékű)
  const LOCOS = {
    m44: { n: 'M44 „Bobó”', kw: 600, f0: 180, m: 64, vmax: 80, fuel: 2500, len: 14, c: 0, col: '#4f7fbf', stripe: '#e8d25a', grill: 6, cab2: 0 },
    m41: { n: 'M41 „Csörgő”', kw: 1320, f0: 200, m: 66, vmax: 100, fuel: 3000, len: 15.5, c: 2.5e6, col: '#c8452f', stripe: '#f0e6d0', grill: 7, cab2: 1 },
    m62: { n: 'M62 „Szergej”', kw: 1470, f0: 320, m: 116, vmax: 100, fuel: 4500, len: 17.6, c: 7e6, col: '#3d6b3a', stripe: '#e8c547', grill: 9, cab2: 1 },
    v43: { n: 'V43 „Szili”', kw: 3000, f0: 280, m: 80, vmax: 130, el: 1, len: 15.7, c: 14e6, col: '#2f6fb8', stripe: '#f2f2f2', grill: 0, cab2: 1 },
    taurus: { n: '1047 „Taurus”', kw: 6400, f0: 300, m: 86, vmax: 160, el: 1, len: 19.3, c: 45e6, col: '#c8ccd2', stripe: '#2f6fb8', grill: 0, cab2: 1 } };
  const CARGO = {
    szen: { n: 'Szén', w: 'Eas nyitott kocsi', m: 80, r: 85, col: '#2b2b2b', t: 'open', body: '#6b3f2a', wt: 'eas' },
    kavics: { n: 'Kavics', w: 'Eas nyitott kocsi', m: 78, r: 75, col: '#8a8173', t: 'open', body: '#6b3f2a', wt: 'eas' },
    fa: { n: 'Rönkfa', w: 'Roos rakoncás kocsi', m: 60, r: 105, col: '#8a5a2b', t: 'logs', wt: 'roos' },
    aru: { n: 'Darabáru', w: 'Hbbins fedett kocsi', m: 45, r: 135, col: '#7d5a3f', t: 'box', wt: 'hbbins' },
    gabona: { n: 'Gabona', w: 'Uagps silókocsi', m: 72, r: 95, col: '#6c6a64', t: 'hopper', wt: 'uagps' },
    kontener: { n: 'Konténer', w: 'Sgns pőrekocsi', m: 55, r: 120, col: '#2e7d6b', t: 'cont', wt: 'sgns' },
    uzemanyag: { n: 'Gázolaj', w: 'Zacns tartálykocsi', m: 70, r: 175, col: '#b8b8b8', haz: 1, t: 'tank', wt: 'zacns' },
    vaserc: { n: 'Vasérc', w: 'Eas nyitott kocsi', m: 85, r: 90, col: '#7a3f2a', t: 'open', body: '#6b3f2a', wt: 'eas', x: 1 },
    ocskavas: { n: 'Ócskavas', w: 'Eas nyitott kocsi', m: 60, r: 70, col: '#5f5752', t: 'open', body: '#6b3f2a', wt: 'eas', x: 1 },
    acel: { n: 'Acéltekercs', w: 'Shimmns tekercsszállító', m: 70, r: 160, col: '#9aa3ad', t: 'coil', wt: 'shimmns', x: 1 },
    cement: { n: 'Cement', w: 'Uagps silókocsi', m: 75, r: 100, col: '#b9b6ad', t: 'hopper', wt: 'uagps', x: 1 },
    nyersolaj: { n: 'Nyersolaj', w: 'Zacns tartálykocsi', m: 70, r: 170, col: '#2a2a2a', haz: 1, t: 'tank', wt: 'zacns', x: 1 },
    vegyszer: { n: 'Vegyszer', w: 'Zacns tartálykocsi', m: 65, r: 190, col: '#d8d27a', haz: 1, t: 'tank', wt: 'zacns', x: 1 },
    auto: { n: 'Új autók', w: 'Laaers autószállító', m: 25, r: 210, col: '#3a5fa8', t: 'cars', wt: 'laaers', x: 1 } };
  // ipari rakodók: mit fogadnak (be) és mit adnak fel (ki)
  const IND = { acel: { n: 'Acélmű', i: '🔥', be: ['szen', 'vaserc', 'ocskavas'], ki: ['acel'] }, cement: { n: 'Cementgyár', i: '🏗️', be: ['szen', 'kavics'], ki: ['cement'] }, finomito: { n: 'Olajfinomító', i: '🛢️', be: ['nyersolaj'], ki: ['uzemanyag'] },
    vegyi: { n: 'Vegyi üzem', i: '⚗️', be: ['nyersolaj', 'uzemanyag'], ki: ['vegyszer'] }, eromu: { n: 'Erőmű', i: '⚡', be: ['szen', 'fa'], ki: [] }, banya: { n: 'Bánya', i: '⛏️', be: [], ki: ['kavics'] }, auto: { n: 'Autógyár', i: '🚗', be: ['acel', 'aru'], ki: ['auto'] },
    fa: { n: 'Fafeldolgozó', i: '🪵', be: ['fa'], ki: ['aru'] }, malom: { n: 'Élelmiszeripar', i: '🌾', be: ['gabona'], ki: ['aru', 'gabona'] }, hulladek: { n: 'Hulladéktelep', i: '♻️', be: [], ki: ['ocskavas'] },
    logisz: { n: 'Logisztikai központ', i: '📦', be: ['kontener', 'aru'], ki: ['kontener', 'aru'] }, tegla: { n: 'Téglagyár', i: '🧱', be: ['szen'], ki: ['aru'] }, gyar: { n: 'Üzem', i: '🏭', be: ['aru'], ki: ['aru'] } };
  const WAGONS = { eas: { n: 'Eas nyitott kocsi', c: 6e5 }, roos: { n: 'Roos rakoncás kocsi', c: 5e5 }, hbbins: { n: 'Hbbins fedett kocsi', c: 7e5 }, uagps: { n: 'Uagps silókocsi', c: 8e5 }, sgns: { n: 'Sgns konténerszállító', c: 6.5e5 }, shimmns: { n: 'Shimmns tekercsszállító', c: 8.5e5 }, laaers: { n: 'Laaers autószállító', c: 9.5e5 }, zacns: { n: 'Zacns tartálykocsi', c: 9e5, haz: 1 } };
  const DEPOT_C = 2e6, RENT_DEP = 2e4, RENT_H = 1200, NETV = 4;
  const LEN_LIC = [6, 10, 16, 24, 34], LEN_C = [0, 1.2e6, 4e6, 12e6, 30e6], HAZ_C = 2.5e6, EL_C = 3e6, FUEL_P = 120, KWH_P = 60, CAR_L = 15;
  let SLP = null, IPS = [], TT = [], TTN = new Set(), H = null, NX, NY, E = [], ADJ = [], ST = [], PL = [], SB = [], S = null, cam = { x: 0, y: 0, s: .05, follow: 1 }, keys = {}, lastT = 0, toastT = 0;
  const fmt = n => Math.round(n).toLocaleString('hu-HU'), money = n => (Math.abs(n) >= 1e6 ? (n / 1e6).toLocaleString('hu-HU', { maximumFractionDigits: 2 }) + ' M' : fmt(n)) + ' Ft';
  const toast = (t, bad) => { const el = $('#toast'); el.textContent = t; el.style.color = bad ? '#ff8a7a' : ''; el.hidden = false; el.style.opacity = 1; toastT = 3; };

  /* ---------- hálózat ---------- */
  function build(h) {
    H = h; NX = h.n.map(p => p[0]); NY = h.n.map(p => p[1]); ADJ = h.n.map(() => []);
    E = h.e.map((q, i) => { const p = q[5], n = p.length / 2, cum = new Float32Array(n); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let k = 0; k < n; k++) { const x = p[2 * k], y = p[2 * k + 1]; if (k) cum[k] = cum[k - 1] + Math.hypot(x - p[2 * k - 2], y - p[2 * k - 1]); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      const e = { i, a: q[0], b: q[1], L: Math.max(1, cum[n - 1]), el: q[3], vm: q[4] || (q[6] ? 30 : 60), svc: q[6] || 0, p, cum, bb: [x0, y0, x1, y1] }; ADJ[e.a].push({ e: i, end: 0 }); ADJ[e.b].push({ e: i, end: 1 }); return e; });
    const bbOf = f => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < f.length; i += 2) { x0 = Math.min(x0, f[i]); x1 = Math.max(x1, f[i]); y0 = Math.min(y0, f[i + 1]); y1 = Math.max(y1, f[i + 1]); } return [x0, y0, x1, y1]; };
    PL = (h.pl || []).map(q => ({ c: q[0], p: q.slice(1), bb: bbOf(q.slice(1)) })); SB = (h.sb || []).map(p => ({ p, bb: bbOf(p) }));
    IPS = h.ip || [];
    TT = (h.tt || []).map(([x, y, r, c, pairs, stubs], k) => { const arms = pairs.flat(); for (const ei of arms) { const e = E[ei], o = e.a === c ? e.b : e.a; e.tt = k; e.virt = stubs.includes(ei); e.ta = Math.atan2(NY[o] - y, NX[o] - x); TTN.add(o); } TTN.add(c);
      const pm = pairs.map(p => ((E[p[0]].ta % Math.PI) + Math.PI) % Math.PI), ord = pairs.map((_, i) => i).sort((a, b) => pm[a] - pm[b]); return { x, y, r, c, pairs, arms, pm, ord }; });
    ST = h.s.map(q => { const e = E[q[2]], s = Math.min(e.L, q[3] * e.L / (h.e[q[2]][2] || e.L)), [x, y] = at(e, s); return { n: q[0], big: !q[1], e: q[2], s, x, y }; });
    for (const q of IPS) { const e = E[q[2]]; if (!e) continue; const sp = Math.min(e.L, q[3] * e.L / (h.e[q[2]][2] || e.L)), [x, y] = at(e, sp); let nn = '', bd = 1e9; for (const st of ST) { if (st.ind) continue; const dd = Math.hypot(st.x - x, st.y - y); if (dd < bd) { bd = dd; nn = st.n; } }
      ST.push({ n: q[0] || IND[q[1]].n + ' · ' + nn, ind: q[1], e: q[2], s: sp, x, y, poly: q[4] }); }
  }
  // pont az élen (s méter az „a” végtől)
  function at(e, s) { const p = e.p, c = e.cum, n = c.length; s = Math.max(0, Math.min(e.L, s)); let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
    const d = c[hi] - c[lo] || 1, t = (s - c[lo]) / d, x0 = p[2 * lo], y0 = p[2 * lo + 1], x1 = p[2 * hi], y1 = p[2 * hi + 1]; return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, Math.atan2(y1 - y0, x1 - x0)]; }
  // az élből a csomópontból kifelé mutató irány
  function outDir(e, end) { const p = e.p, n = p.length / 2; let i0 = end ? n - 1 : 0, k = end ? -1 : 1, j = i0 + k; while (j > 0 && j < n - 1 && Math.hypot(p[2 * j] - p[2 * i0], p[2 * j + 1] - p[2 * i0 + 1]) < 25) j += k;
    const dx = p[2 * j] - p[2 * i0], dy = p[2 * j + 1] - p[2 * i0 + 1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }
  // kijárat választása egy csomópontban; vin: érkezési irány. Visszaad: { e, fromA } vagy null (ütköző)
  function exits(node, inE, vin) { const o = []; for (const q of ADJ[node]) { if (q.e === inE && ADJ[node].filter(z => z.e === inE).length < 2) continue; if (E[q.e].tt >= 0 && !aligned(E[q.e])) continue; const v = outDir(E[q.e], q.end), dot = v[0] * vin[0] + v[1] * vin[1]; o.push({ e: q.e, fromA: q.end === 0, dot }); } o.sort((a, b) => b.dot - a.dot); const lim = o.length && o[0].dot > .85 ? -.1 : -.6; return o.filter(q => q.dot > lim); }
  // fordítókorong: a híd szöge (S.tt[k]); egy kar akkor járható, ha a híd valamelyik vége felé néz
  const curP = k => S.ttp && S.ttp[k] != null ? S.ttp[k] : 0, brAng = k => TT[k].pm[curP(k)];
  const aligned = e => TT[e.tt].pairs[curP(e.tt)].includes(e.i);
  function onTT() { if (Math.abs(S.v) > .15 || S.ttAnim) return -1; const k = E[S.P[0].e].tt; if (!(k >= 0) || S.P.some(sg => E[sg.e].tt !== k) || trainLen() > 2 * TT[k].r + 1) return -1; return k; }
  function rotTT(dir) { const k = onTT(); if (k < 0) return; const T = TT[k], i = T.ord.indexOf(curP(k)), np = T.ord[(i + dir + T.ord.length) % T.ord.length], b = T.pm[curP(k)]; let dlt = T.pm[np] - b; if (dir > 0 && dlt <= 0) dlt += Math.PI; if (dir < 0 && dlt >= 0) dlt -= Math.PI;
    S.ttAnim = { k, np, from: b, to: b + dlt, t: 0, dur: Math.max(1.2, Math.abs(dlt) / (Math.PI / 6)) }; S.thr = 0; beep(180, .3); }
  function ttDone() { const A = S.ttAnim, T = TT[A.k], f = front(), f1 = f[2], fd = (f[0] - T.x) * Math.cos(f1) + (f[1] - T.y) * Math.sin(f1), f2 = f1 + A.to - A.from;
    S.ttp = S.ttp || {}; S.ttp[A.k] = A.np; SUCC = null; S.ttAnim = null; const angDiff = (a, b) => Math.abs(((a - b) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
    const pr = T.pairs[A.np], fc = angDiff(E[pr[0]].ta, f2) < angDiff(E[pr[1]].ta, f2) ? pr[0] : pr[1]; const e = E[fc]; S.P = [{ e: fc, d: e.a === T.c ? 1 : -1 }]; S.fu = Math.max(.1, Math.min(e.L, fd)); S.v = 0; fixRear(); plan(); ui(); }
  function choose(node, inE, vin) { const o = exits(node, inE, vin); if (!o.length) return null; const w = S.sw[node]; return o.find(q => q.e === w) || (E[o[0].e].svc && o.find(q => !E[q.e].svc && q.dot > o[0].dot - .1)) || o[0]; }
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

  // a sínszálak eltolt vonala (oldaleltolás méterben), élenként gyorsítótárazva
  function offs(e, sd) { const k = sd < 0 ? 'oL' : 'oR'; if (e[k]) return e[k]; const p = e.p, n = p.length / 2, o = new Float32Array(p.length);
    for (let i = 0; i < n; i++) { const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1), dx = p[2 * b] - p[2 * a], dy = p[2 * b + 1] - p[2 * a + 1], l = Math.hypot(dx, dy) || 1; o[2 * i] = p[2 * i] - dy / l * sd; o[2 * i + 1] = p[2 * i + 1] + dx / l * sd; }
    return e[k] = o; }
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
  function succ(sid) { SUCC = SUCC || new Array(E.length * 2); if (SUCC[sid]) return SUCC[sid]; const e = sid >> 1, sg = { e, d: sid & 1 ? -1 : 1 }, nd = segEnd(sg, true), r = exits(nd, e, arriveDir(sg, true)).map(q => q.e * 2 + (q.fromA ? 0 : 1));
    if (!TTN.has(nd)) SUCC[sid] = r; return r; }
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
    const K = S.rlock, fsid = f.e * 2 + (f.d > 0 ? 0 : 1), pi = K ? K.pull.indexOf(fsid) : -1; let forceB = false;
    if (K && K.st === st.n && pi >= 0) { let X = K.u - S.fu; for (let q = 0; q < pi; q++) X -= E[K.pull[q] >> 1].L;
      if (X > 3 && !K.done) { S.route = { edges: [f.e], st, back: false, km: (K.tot - K.revd + X) / 1000, rev: { x: K.x, y: K.y, dist: X } }; return; }
      forceB = true; K.done = 1; } // elérte (vagy kicsit túlfutott) az irányváltási pontot: innen hátrafelé
    let A = routeTo([[fs, E[f.e].L - S.fu]], st), B = routeTo([[rs, S.ru]], st);
    if (f.e === st.e && uOf(f) > S.fu && (!A || uOf(f) - S.fu < A.d)) A = { path: [fs], d: uOf(f) - S.fu, rev: null };
    if (r.e === st.e && uOf(r) < S.ru && (!B || S.ru - uOf(r) < B.d)) B = { path: [rs], d: S.ru - uOf(r), rev: null };
    if (forceB && B) A = null; else if (!forceB) S.rlock = null;
    const pb = S.rev ? S.rev < 0 : !!(S.lastBack), o = !A ? B : !B ? A : pb ? (B.d <= A.d * 1.1 ? B : A) : (A.d <= B.d * 1.1 ? A : B); if (!o) return; S.lastBack = o === B;
    const back = o === B && o !== A; let rp = null;
    if (o.rev) { const w = o.rev.w, T = trainLen() + 40, pull = o.rev.pull || [w]; let rem = T, p = null; for (const q of pull) { const e = E[q >> 1]; if (rem <= e.L) { p = at(e, q & 1 ? e.L - rem : rem); break; } rem -= e.L; } if (!p) { const q = pull[pull.length - 1], e = E[q >> 1]; p = at(e, q & 1 ? 0 : e.L); }
      rp = { x: p[0], y: p[1], dist: o.rev.d }; if (o === A) S.rlock = { st: st.n, w, pull, u: T, tot: o.d, revd: o.rev.d, x: p[0], y: p[1] }; if (S.auto && !(S.time < S.manualT)) { const pl = o.rev.pull || []; for (let k = 0; k + 1 < pl.length; k++) S.sw[segEnd({ e: pl[k] >> 1, d: pl[k] & 1 ? -1 : 1 }, true)] = pl[k + 1] >> 1; } }
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
    const me = ST[si], R = dijkstra(stSeeds(me), 160000), near = ST.map((st, i) => [i, stDist(R.D, st)]).filter(([i, d]) => i !== si && (ST[i].big || ST[i].ind) && d > 8000 && d < 160000), bigs = near.filter(q => ST[q[0]].big);
    let h = (si * 2654435761 + Math.floor(now / 10800) * 97) >>> 0; const rnd = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; }, pick = a => a[Math.floor(rnd() * a.length)], base = Object.keys(CARGO).filter(k => !CARGO[k].x);
    const jobs = []; for (let k = 0; k < 18 && jobs.length < 6 && near.length; k++) { let to, cg;
      if (me.ind) { const out = IND[me.ind].ki; if (!out.length) break; cg = pick(out); const cons = near.filter(q => ST[q[0]].ind && IND[ST[q[0]].ind].be.includes(cg)); to = (cons.length && rnd() < .65 ? pick(cons) : pick(bigs.length ? bigs : near))[0]; }
      else { const cons = near.filter(q => ST[q[0]].ind && IND[ST[q[0]].ind].be.length); if (cons.length && rnd() < .5) { to = pick(cons)[0]; cg = pick(IND[ST[to].ind].be); } else { if (!bigs.length) continue; to = pick(bigs)[0]; cg = pick(base); } }
      if (jobs.some(j => j.to === to)) continue; const C = CARGO[cg];
      const cap0 = rnd() < .25 ? LEN_LIC[Math.min(LEN_LIC.length - 1, S.lic.len + 1)] : licMax(), n = Math.max(2, Math.round(2 + rnd() * (cap0 - 2))), a = me, tl = LOCOS.m62.len + n * CAR_L, ra = routeTo([[a.e * 2, E[a.e].L - a.s]], ST[to], tl), rb = routeTo([[a.e * 2 + 1, a.s]], ST[to], tl), d = Math.min(ra ? ra.d : Infinity, rb ? rb.d : Infinity); if (!isFinite(d) || d > 220000) continue; const km = d / 1000, pay = Math.round(n * km * C.r * 4 * (1 + .3 * rnd()) / 100) * 100;
      jobs.push({ id: JID++ + '_' + si + '_' + k + '_' + Math.floor(now), from: si, to, cg, n, km, pay, lim: Math.round(d / 13 + 1800), state: 'board' }); }
    S.boards[si] = { t: now, jobs }; return jobs; }
  const carsNow = () => S.cars.length, licMax = () => LEN_LIC[S.lic.len];
  function take(j) { if (S.jobs.length >= 4) return toast('Egyszerre legfeljebb 4 munkád lehet.', 1); if (CARGO[j.cg].haz && !S.lic.haz) return toast('Veszélyesáru-engedély kell hozzá (Depó).', 1);
    j.state = 'taken'; j.t0 = S.time; S.jobs.push(j); S.boards[j.from].jobs = S.boards[j.from].jobs.filter(q => q !== j); if (!S.nav) S.nav = j.id; plan(); ui(); toast('Munka felvéve: ' + j.n + ' × ' + CARGO[j.cg].n + ' → ' + ST[j.to].n); }
  const nearSt = () => { if (Math.abs(S.v) > .6) return -1; let best = -1, bd = 450; const L = trainLen(); for (let x = 0; x <= L; x += Math.max(10, L / 6)) { const p = along(x); for (const i of S.nearIdx) { const st = ST[i], d = Math.hypot(st.x - p[0], st.y - p[1]); if (d < bd) { bd = d; best = i; } } } return best; };
  const isDepot = si => si >= 0 && ST[si].big && S.depots.includes(ST[si].n);
  // own: saját kocsik a központi tárolóból (csak saját depóban), különben bérelt kocsik kaucióval
  function couple(j, own) { if (carsNow() + j.n > licMax()) return toast('Túl hosszú lenne a szerelvény: legfeljebb ' + licMax() + ' kocsi (Depó: engedély).', 1); const wt = CARGO[j.cg].wt;
    if (own) { if (!isDepot(j.from) || (S.wag[wt] || 0) < j.n) return toast('Nincs elég saját ' + WAGONS[wt].n + ' a tárolóban.', 1); S.wag[wt] -= j.n; }
    else { const dep = j.n * RENT_DEP; if (S.money < dep) return toast('A kaucióra nincs elég pénzed (' + money(dep) + ').', 1); S.money -= dep; j.dep = dep; j.rt = S.time; }
    j.own = own ? 1 : 0; for (let k = 0; k < j.n; k++) S.cars.push({ j: j.id, cg: j.cg, own: j.own }); j.state = 'loaded'; fixRear(); plan(); beep(300, .12); toast(j.n + (own ? ' saját' : ' bérelt') + ' kocsi felkapcsolva' + (own ? '.' : ' · kaució: ' + money(j.dep))); ui(); }
  function uncouple(j) { const late = S.time - j.t0 > j.lim, pay = Math.round(j.pay * (late ? .7 : 1.25)); S.cars = S.cars.filter(c => c.j !== j.id); S.jobs = S.jobs.filter(q => q !== j); fixRear();
    let extra = ''; if (j.own) { const wt = CARGO[j.cg].wt; S.wag[wt] = (S.wag[wt] || 0) + j.n; extra = ' · kocsik vissza a tárolóba'; }
    else if (j.dep) { const fee = Math.min(j.dep, j.n * RENT_H * Math.max(1, Math.ceil((S.time - j.rt) / 3600))); S.money += j.dep - fee; extra = ' · bérleti díj: −' + money(fee); }
    S.money += pay; S.life += pay; S.done++; if (S.nav === j.id) S.nav = S.jobs[0] ? S.jobs[0].id : null; plan(); beep(1200, .15); toast((late ? 'Késve leszállítva: +' : 'Időben leszállítva: +') + money(pay) + extra); score(); ui(); }
  function score() { try { if (window.top !== window && S.life > 0) parent.postMessage({ hgws: 'score', game: GAME, score: Math.floor(S.life) }, location.origin); } catch (_) {} }

  /* ---------- állapot, mentés ---------- */
  function fresh() { let si = ST.findIndex(s => s.big && /Kelenföld/.test(s.n)); if (si < 0) si = ST.findIndex(s => s.big);
    const st = ST[si]; S = { money: 300000, life: 0, time: 6 * 3600, loco: 'm44', own: ['m44'], fuel: LOCOS.m44.fuel, lic: { len: 0, haz: 0, el: 0 }, P: [{ e: st.e, d: 1 }], fu: Math.min(E[st.e].L, st.s + 30), ru: 0, v: 0, thr: 0, brk: 0, park: 1, rev: 1, cars: [], jobs: [], boards: {}, sw: {}, nav: null, auto: 1, done: 0, depots: [st.n], wag: {}, nv: NETV };
    fixRear(); cam.x = st.x; cam.y = st.y; cam.s = .25; }
  function place(S0) { let si = ST.findIndex(s => s.big && /Kelenföld/.test(s.n)); if (si < 0) si = ST.findIndex(s => s.big); const st = ST[si]; S0.P = [{ e: st.e, d: 1 }]; S0.fu = Math.min(E[st.e].L, st.s + 30); S0.ru = 0; S0.v = 0; S0.brk = 0; S0.park = 1; S0.thr = 0; return st; }
  function save() { if (!S) return; try { const { route, nearIdx, stop, manualT, rlock, lastBack, gr, migr, ttAnim, ...o } = S; localStorage.setItem(KEY, JSON.stringify(o)); } catch (_) {} }
  function load() { try { const o = JSON.parse(localStorage.getItem(KEY)); if (!o || !o.P) return false; S = { ...o }; S.wag = S.wag || {};
    if (S.nv !== NETV || S.P.some(sg => !E[sg.e])) { // a hálózat frissült: a régi élek és állomássorszámok érvénytelenek
      for (const j of S.jobs || []) { if (j.dep) S.money += j.dep; if (j.own) { const wt = CARGO[j.cg].wt; S.wag[wt] = (S.wag[wt] || 0) + j.n; } }
      const st = place(S); S.cars = []; S.jobs = []; S.boards = {}; S.sw = {}; S.nav = null; S.nv = NETV; S.depots = S.depots && S.depots.length ? S.depots : [st.n]; S.migr = 1; }
    if (!S.depots || !S.depots.length) { const si = ST.findIndex(s => s.big && /Kelenföld/.test(s.n)); S.depots = [ST[si].n]; }
    fixRear(); return true; } catch (_) { return false; } }

  /* ---------- fizika ---------- */
  let ovT = 0, nearT = 0, planT = 0;
  // emelkedő a szerelvény közepén, a szerelvény előre-irányában (a domborzati rácsból)
  function grade() { if (!window.Taj || !Taj.ready) return 0; const L = trainLen(), p = along(L / 2), q = along(Math.max(0, L / 2 - 80)), r = along(Math.min(L, L / 2 + 80)); let a = Math.atan2(r[1] - q[1], r[0] - q[0]); if (L < 170) a = p[2];
    const c = Math.cos(a), sn = Math.sin(a); return Math.max(-.022, Math.min(.022, .8 * (Taj.zAt(p[0] + c * 300, p[1] + sn * 300) - Taj.zAt(p[0] - c * 300, p[1] - sn * 300)) / 600)); }
  function step(dt) { const Lc = LOCOS[S.loco], M = (Lc.m + S.cars.reduce((a, c) => a + CARGO[c.cg].m + 22, 0)) * 1000, v = S.v, ad = Math.abs(v);
    const fe = E[S.P[S.P.length - 1].e], onEl = fe.el, power = Lc.el ? (onEl ? 1 : 0) : S.fuel > 0 ? 1 : 0;
    const Ft = S.rev && power ? Math.min(Lc.f0 * 1000, Lc.kw * 1000 / Math.max(ad, 1.5)) * S.thr / 8 * (ad * 3.6 >= Lc.vmax ? 0 : 1) : 0;
    const Fr = M * 9.81 * .0018 + 4 * v * v, Fb = (S.brk / 6) * M * 9.81 * .11 + (keys[' '] ? M * 9.81 * .11 : 0);
    if (S.ttAnim) { S.ttAnim.t += dt / TS; S.v = 0; S.time += dt; if (S.ttAnim.t >= S.ttAnim.dur) ttDone(); return; }
    const gr = grade(); S.gr = gr; let a = (S.rev * Ft) / M - 9.81 * gr, dec = (Fr + Fb) / M; let nv = v + a * dt; if (nv > 0) nv = Math.max(0, nv - dec * dt); else if (nv < 0) nv = Math.min(0, nv + dec * dt); S.v = S.park ? 0 : nv;
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
    const vis = e => !(e.bb[2] < x0 || e.bb[0] > x1 || e.bb[3] < y0 || e.bb[1] > y1), mg = 60 / s * d, cx0 = x0 - mg, cx1 = x1 + mg, cy0 = y0 - mg, cy1 = y1 + mg;
    // vonal kirajzolása a látótérre vágva (a hosszú élek képen kívüli része nem kerül a vászonra)
    const pathP = p => { let pen = false; for (let i = 0; i + 2 < p.length; i += 2) { const ax = p[i], ay = p[i + 1], bx = p[i + 2], by = p[i + 3];
        if ((ax < cx0 && bx < cx0) || (ax > cx1 && bx > cx1) || (ay < cy0 && by < cy0) || (ay > cy1 && by > cy1)) { pen = false; continue; }
        // Liang–Barsky: csak a látható darab
        let t0 = 0, t1 = 1; const dx = bx - ax, dy = by - ay, cl = (pp, q) => { if (pp === 0) return q >= 0; const r = q / pp; if (pp < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } return true; };
        if (!(cl(-dx, ax - cx0) && cl(dx, cx1 - ax) && cl(-dy, ay - cy0) && cl(dy, cy1 - ay))) { pen = false; continue; }
        if (!pen || t0 > 0) g.moveTo(X(ax + dx * t0), Y(ay + dy * t0)); g.lineTo(X(ax + dx * t1), Y(ay + dy * t1)); pen = t1 >= 1; } }, path = e => pathP(e.p);
    const rw = Math.max(1.3 * d, 4 * s), sv = E.filter(e => vis(e) && !(e.tt >= 0));
    // peronok és állomásépületek
    if (s > .08 * d) { const poly = f => { g.beginPath(); g.moveTo(X(f[0]), Y(f[1])); for (let i = 2; i < f.length; i += 2) g.lineTo(X(f[i]), Y(f[i + 1])); }, vb = b => !(b[2] < x0 || b[0] > x1 || b[3] < y0 || b[1] > y1);
      for (const q of PL) if (vb(q.bb)) { poly(q.p); if (q.c) { g.fillStyle = '#9d968a'; g.fill(); g.strokeStyle = '#d9cfb8'; g.lineWidth = Math.max(.6 * d, .5 * s); g.stroke(); } else { g.strokeStyle = '#d9cfb8'; g.lineWidth = Math.max(1.5 * d, 5 * s); g.stroke(); g.strokeStyle = '#9d968a'; g.lineWidth = Math.max(1 * d, 4 * s); g.stroke(); }
        if (s > .5 * d) { g.setLineDash([.6 * s, .6 * s]); g.strokeStyle = '#e8c547'; g.lineWidth = .25 * s; g.stroke(); g.setLineDash([]); } }
      for (const q of SB) if (vb(q.bb)) { g.save(); g.translate(2.5 * s, 3.5 * s); poly(q.p); g.closePath(); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill(); g.restore(); poly(q.p); g.closePath(); g.fillStyle = '#c47f5a'; g.fill(); g.strokeStyle = '#6e3f2a'; g.lineWidth = Math.max(.8 * d, .5 * s); g.stroke(); } }
    if (s > .25 * d) { // közelről: zúzottkő-ágy, talpfák, két sínszál, felsővezeték
      g.beginPath(); for (const e of sv) path(e); g.strokeStyle = '#5d5850'; g.lineWidth = 5.2 * s; g.stroke(); g.strokeStyle = 'rgba(120,112,100,.5)'; g.lineWidth = 3.6 * s; g.stroke();
      g.strokeStyle = 'rgba(74,58,44,.55)'; g.lineWidth = 2.6 * s; g.stroke();
      if (s > .9 * d) { if (!SLP) { const c = document.createElement('canvas'); c.width = 60; c.height = 260; const x = c.getContext('2d'); x.fillStyle = '#4a3a2c'; x.fillRect(17, 0, 26, 260); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(17, 0, 5, 260); SLP = g.createPattern(c, 'repeat'); }
        g.lineWidth = 2.6 * s; g.lineCap = 'butt'; g.strokeStyle = SLP;
        for (const e of sv) { const p = e.p; for (let i = 0; i + 2 < p.length; i += 2) { const ax = p[i], ay = p[i + 1], bx = p[i + 2], by = p[i + 3];
          if ((ax < cx0 && bx < cx0) || (ax > cx1 && bx > cx1) || (ay < cy0 && by < cy0) || (ay > cy1 && by > cy1)) continue;
          SLP.setTransform(new DOMMatrix().translate(X(ax), Y(ay)).rotate(Math.atan2(by - ay, bx - ax) * 57.29578).scale(s / 100).translate(0, -130));
          g.beginPath(); g.moveTo(X(ax), Y(ay)); g.lineTo(X(bx), Y(by)); g.stroke(); } }
        g.lineCap = 'round'; }
      for (const sd of [-.72, .72]) { g.beginPath(); for (const e of sv) pathP(offs(e, sd)); g.strokeStyle = '#c9ced6'; g.lineWidth = Math.max(.7 * d, .16 * s); g.stroke(); }
      if (s > .6 * d) { g.beginPath(); for (const e of sv) if (e.el) path(e); g.strokeStyle = 'rgba(30,30,30,.7)'; g.lineWidth = Math.max(.6 * d, .06 * s); g.stroke();
        const pp = new Path2D(), pl = new Path2D(); for (const e of sv) if (e.el) for (let u = 30; u < e.L; u += 60) { const p = at(e, u); if (p[0] < cx0 || p[0] > cx1 || p[1] < cy0 || p[1] > cy1) continue; const c = Math.cos(p[2]), sn = Math.sin(p[2]), ox = -sn * 3.4, oy = c * 3.4; pp.rect(X(p[0] + ox) - .3 * s, Y(p[1] + oy) - .3 * s, .6 * s, .6 * s); pl.moveTo(X(p[0] + ox), Y(p[1] + oy)); pl.lineTo(X(p[0]), Y(p[1])); }
        g.fillStyle = '#3a3a3a'; g.fill(pp); g.strokeStyle = 'rgba(40,40,40,.8)'; g.lineWidth = .15 * s; g.stroke(pl); } }
    else { g.beginPath(); for (const e of sv) if (!e.el && !e.svc) path(e); g.strokeStyle = '#7a7466'; g.lineWidth = rw; g.stroke();
      g.beginPath(); for (const e of sv) if (e.el && !e.svc) path(e); g.strokeStyle = '#a9b4c2'; g.lineWidth = rw; g.stroke();
      if (s > .02 * d) { g.beginPath(); for (const e of sv) if (e.svc) path(e); g.strokeStyle = '#8b8578'; g.lineWidth = Math.max(1 * d, 3 * s); g.stroke(); } }
    if (s > .04 * d) for (let k = 0; k < TT.length; k++) { const T = TT[k]; if (T.x < x0 - 50 || T.x > x1 + 50 || T.y < y0 - 50 || T.y > y1 + 50) continue; const r = T.r * s, cx = X(T.x), cy = Y(T.y), an = S.ttAnim && S.ttAnim.k === k ? S.ttAnim.from + (S.ttAnim.to - S.ttAnim.from) * Math.min(1, S.ttAnim.t / S.ttAnim.dur) : brAng(k);
      g.fillStyle = '#2a2622'; g.beginPath(); g.arc(cx, cy, r + 1.2 * s, 0, 6.283); g.fill(); g.strokeStyle = '#6d665c'; g.lineWidth = Math.max(1 * d, .8 * s); g.stroke(); g.strokeStyle = 'rgba(200,200,200,.25)'; g.lineWidth = Math.max(.6 * d, .2 * s); g.beginPath(); g.arc(cx, cy, r * .97, 0, 6.283); g.stroke();
      g.save(); g.translate(cx, cy); g.rotate(an); g.fillStyle = '#4a4540'; g.fillRect(-r, -2.2 * s, 2 * r, 4.4 * s); g.fillStyle = '#5e4a38'; for (let u = -T.r + .4; u < T.r; u += .6) g.fillRect(u * s, -1.3 * s, .26 * s, 2.6 * s);
      g.fillStyle = '#c9ced6'; g.fillRect(-r, -.8 * s, 2 * r, Math.max(.5 * d, .16 * s)); g.fillRect(-r, .64 * s, 2 * r, Math.max(.5 * d, .16 * s)); g.fillStyle = '#e8c547'; g.fillRect(-r, -2.2 * s, Math.max(1, .5 * s), 4.4 * s); g.fillRect(r - Math.max(1, .5 * s), -2.2 * s, Math.max(1, .5 * s), 4.4 * s); g.restore(); }
    if (S.route) { g.beginPath(); for (const ei of S.route.edges) path(E[ei]); g.strokeStyle = s > .25 * d ? 'rgba(94,224,138,.35)' : 'rgba(94,224,138,.6)'; g.lineWidth = s > .25 * d ? Math.max(3 * d, 1.4 * s) : Math.max(rw * 2.2, 3.5 * d); g.stroke(); }
    if (S.route && S.route.rev) { const q = S.route.rev; g.fillStyle = '#ffb347'; g.strokeStyle = '#000'; g.lineWidth = 2 * d; g.beginPath(); g.arc(X(q.x), Y(q.y), 7 * d, 0, 6.283); g.fill(); g.stroke(); g.fillStyle = '#000'; g.font = `800 ${9 * d}px Inter`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⇄', X(q.x), Y(q.y)); }
    // állomások
    g.textAlign = 'center'; g.textBaseline = 'bottom';
    for (let i = 0; i < ST.length; i++) { const st = ST[i]; if (st.ind) continue; if (st.x < x0 - 500 || st.x > x1 + 500 || st.y < y0 - 500 || st.y > y1 + 500) continue; if (!st.big && s < .04 * d) continue; const tj = S.jobs.some(j => (j.state === 'taken' && j.from === i) || (j.state === 'loaded' && j.to === i));
      g.fillStyle = tj ? '#ffe29a' : st.big ? '#e8b656' : '#c8c8c8'; g.beginPath(); g.arc(X(st.x), Y(st.y), (st.big ? (s < .01 * d ? 2.6 : 4.5) : 3) * d + (tj ? 2 * d : 0), 0, 6.283); g.fill(); g.strokeStyle = '#000'; g.lineWidth = d; g.stroke();
      if (tj || (st.big && s > .02 * d) || s > .1 * d) { g.font = `${st.big || tj ? 700 : 500} ${(st.big ? 12 : 10.5) * d}px Inter, sans-serif`; g.lineWidth = 3 * d; g.strokeStyle = 'rgba(0,0,0,.8)'; g.strokeText(st.n, X(st.x), Y(st.y) - 6 * d); g.fillStyle = tj ? '#ffe29a' : '#e6e6e6'; g.fillText(st.n, X(st.x), Y(st.y) - 6 * d); } }
    // ipari rakodók
    if (s > .004 * d) for (let i = 0; i < ST.length; i++) { const st = ST[i]; if (!st.ind || st.x < x0 - 3000 || st.x > x1 + 3000 || st.y < y0 - 3000 || st.y > y1 + 3000) continue; const I = IND[st.ind], tj = S.jobs.some(j => (j.state === 'taken' && j.from === i) || (j.state === 'loaded' && j.to === i));
      if (s > .04 * d && st.poly && st.poly.length > 4) { const p = st.poly; g.beginPath(); g.moveTo(X(p[0]), Y(p[1])); for (let k = 2; k < p.length; k += 2) g.lineTo(X(p[k]), Y(p[k + 1])); g.closePath(); g.fillStyle = 'rgba(232,182,86,.06)'; g.fill(); g.setLineDash([6 * d, 5 * d]); g.strokeStyle = tj ? 'rgba(255,226,154,.8)' : 'rgba(232,182,86,.45)'; g.lineWidth = 1.5 * d; g.stroke(); g.setLineDash([]); }
      if (!tj && s < .025 * d && st.ind === 'gyar') continue; const z = (tj ? 11 : 9) * d, px = X(st.x), py = Y(st.y);
      g.fillStyle = tj ? '#ffe29a' : 'rgba(24,22,20,.85)'; g.strokeStyle = tj ? '#000' : '#e8b656'; g.lineWidth = 1.2 * d; g.beginPath(); g.roundRect(px - z, py - z, 2 * z, 2 * z, 4 * d); g.fill(); g.stroke();
      g.font = `${z * 1.1}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(I.i, px, py + .5 * d);
      if (tj || s > .05 * d || (st.ind !== 'gyar' && s > .015 * d)) { g.font = `700 ${11 * d}px Inter, sans-serif`; g.textBaseline = 'top'; g.lineWidth = 3 * d; g.strokeStyle = 'rgba(0,0,0,.8)'; g.strokeText(st.n, px, py + z + 2 * d); g.fillStyle = tj ? '#ffe29a' : '#f0d9a8'; g.fillText(st.n, px, py + z + 2 * d); } }
    // következő váltó
    const n = nextSwitch(); if (n && n.dist < 4000) { const px = X(NX[n.nd]), py = Y(NY[n.nd]); for (const q of n.o) { const w = outDir(E[q.e], q.fromA ? 0 : 1), sel = q.e === n.cur, L = 26 * d; g.strokeStyle = sel ? '#5ee08a' : 'rgba(255,255,255,.35)'; g.lineWidth = (sel ? 4 : 2) * d; g.beginPath(); g.moveTo(px, py); g.lineTo(px + w[0] * L, py + w[1] * L); g.stroke(); }
      g.fillStyle = '#ffe29a'; g.beginPath(); g.arc(px, py, 5 * d, 0, 6.283); g.fill(); }
    // szerelvény
    const Lc = LOCOS[S.loco], L = trainLen();
    const rotP = p => { const A = S.ttAnim; if (!A) return p; const T = TT[A.k], q = (A.to - A.from) * Math.min(1, A.t / A.dur), c = Math.cos(q), sn = Math.sin(q), dx = p[0] - T.x, dy = p[1] - T.y; return [T.x + dx * c - dy * sn, T.y + dx * sn + dy * c, p[2] + q]; };
    const drawVeh = (x, len, kind, loco) => { const a = rotP(along(x)), b = rotP(along(Math.min(L, x + len))), cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2, an = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const lw = Math.max(len * s, loco ? 10 * d : 4 * d), wd = Math.max(3 * s, loco ? 6 * d : 4 * d), hl = lw / 2, hw = wd / 2, det = s > .3 * d; g.save(); g.translate(X(cx), Y(cy)); g.rotate(an);
      if (det) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-hl + .5 * s, -hw + .8 * s, lw, wd); }
      g.fillStyle = '#111'; g.fillRect(-hl - d * .5, -hw - d * .5, lw + d, wd + d);
      if (loco) { const c = kind; g.fillStyle = c.col; g.fillRect(-hl, -hw, lw, wd);
        if (det) { const u = s; g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(-hl, -hw, lw, wd * .28); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(-hl, hw - wd * .22, lw, wd * .22);
          g.fillStyle = '#1d2733'; g.fillRect(hl - 1.6 * u, -hw + .35 * u, .9 * u, wd - .7 * u); if (c.cab2) g.fillRect(-hl + .7 * u, -hw + .35 * u, .9 * u, wd - .7 * u);
          g.fillStyle = 'rgba(0,0,0,.28)'; for (let k = 0; k < c.grill; k++) g.fillRect(-hl + (2.6 + k * 1.1) * u, -hw + .6 * u, .5 * u, wd - 1.2 * u);
          if (c.el) { g.strokeStyle = '#222'; g.lineWidth = .18 * u; for (const px of [-lw * .28, lw * .28]) { g.beginPath(); g.moveTo(px - 1.1 * u, -.9 * u); g.lineTo(px + 1.1 * u, .9 * u); g.moveTo(px - 1.1 * u, .9 * u); g.lineTo(px + 1.1 * u, -.9 * u); g.stroke(); } }
          else { g.fillStyle = '#2a2a2a'; g.beginPath(); g.arc(-lw * .1, 0, .35 * u, 0, 6.283); g.fill(); }
          g.fillStyle = c.stripe; g.fillRect(-hl, -hw, lw, .3 * u); g.fillRect(-hl, hw - .3 * u, lw, .3 * u); }
        g.fillStyle = '#ffe29a'; g.fillRect(hl - Math.max(1.5 * d, lw * .06), -hw, Math.max(1.5 * d, lw * .06), wd); g.restore(); return; }
      const C = CARGO[kind], u = s; g.fillStyle = C.body || '#5a5048'; g.fillRect(-hl, -hw, lw, wd);
      if (det) { const t = C.t;
        if (t === 'open') { g.fillStyle = '#2a2520'; g.fillRect(-hl + .35 * u, -hw + .35 * u, lw - .7 * u, wd - .7 * u); g.fillStyle = C.col; g.fillRect(-hl + .5 * u, -hw + .5 * u, lw - 1 * u, wd - 1 * u); g.fillStyle = 'rgba(255,255,255,.1)'; for (let k = 0; k < 10; k++) { g.beginPath(); g.arc(-hl + (1 + k * 1.3) * u, ((k * 37) % 7 / 7 - .5) * wd * .5, .45 * u, 0, 6.283); g.fill(); } g.fillStyle = 'rgba(0,0,0,.25)'; for (let k = 1; k < 5; k++) g.fillRect(-hl + k * lw / 5, -hw, .2 * u, wd); }
        else if (t === 'logs') { g.fillStyle = '#3c3a36'; g.fillRect(-hl, -hw, lw, wd); for (let k = 0; k < 5; k++) { g.fillStyle = k % 2 ? '#8a5a2b' : '#9b6a38'; g.fillRect(-hl + .4 * u, -hw + (.35 + k * .48) * u, lw - .8 * u, .44 * u); } g.fillStyle = '#222'; for (let k = 0; k <= 4; k++) g.fillRect(-hl + .3 * u + k * (lw - .9 * u) / 4, -hw, .3 * u, wd); }
        else if (t === 'box') { g.fillStyle = C.col; g.fillRect(-hl, -hw, lw, wd); g.fillStyle = 'rgba(0,0,0,.2)'; for (let k = 1; k < 10; k++) g.fillRect(-hl + k * lw / 10, -hw, .12 * u, wd); g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(-hl, -.12 * u, lw, .24 * u); }
        else if (t === 'hopper') { g.fillStyle = '#8f8c84'; g.fillRect(-hl, -hw, lw, wd); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-hl, -.1 * u, lw, .2 * u); g.fillStyle = C.col; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(-hl + (k + .5) * lw / 4, 0, .55 * u, 0, 6.283); g.fill(); } }
        else if (t === 'cont') { g.fillStyle = '#3a3a3a'; g.fillRect(-hl, -hw, lw, wd); const cc = ['#2e7d6b', '#b5462f', '#2f5fa0', '#c9a24a']; for (let k = 0; k < 2; k++) { const cx2 = -hl + .3 * u + k * (lw - .6 * u) / 2; g.fillStyle = cc[(k + Math.round(x)) % 4]; g.fillRect(cx2, -hw + .2 * u, (lw - .6 * u) / 2 - .2 * u, wd - .4 * u); g.fillStyle = 'rgba(0,0,0,.18)'; for (let r = 1; r < 8; r++) g.fillRect(cx2 + r * (lw - .6 * u) / 16, -hw + .2 * u, .08 * u, wd - .4 * u); } }
        else if (t === 'coil') { g.fillStyle = '#3a3a3a'; g.fillRect(-hl, -hw, lw, wd); for (let k = 0; k < 3; k++) { const cx2 = -hl + (k + .5) * lw / 3; g.fillStyle = '#c3cad2'; g.beginPath(); g.ellipse(cx2, 0, lw / 7.5, hw * .85, 0, 0, 6.283); g.fill(); g.strokeStyle = '#6f7780'; g.lineWidth = .12 * u; for (let r = 1; r < 4; r++) { g.beginPath(); g.ellipse(cx2, 0, lw / 7.5 * r / 4, hw * .85 * r / 4, 0, 0, 6.283); g.stroke(); } } g.fillStyle = 'rgba(180,90,40,.6)'; g.fillRect(-hl, -hw, lw, .25 * u); g.fillRect(-hl, hw - .25 * u, lw, .25 * u); }
        else if (t === 'cars') { g.fillStyle = '#2f3a48'; g.fillRect(-hl, -hw, lw, wd); const cc = ['#b5462f', '#e8e8e8', '#2f5fa0', '#1d1d1d', '#9a9a9a']; for (let k = 0; k < 3; k++) { const cx2 = -hl + .4 * u + k * (lw - .8 * u) / 3, w2 = (lw - .8 * u) / 3 - .4 * u; g.fillStyle = cc[(k + Math.round(x * 7)) % 5]; g.beginPath(); g.roundRect(cx2, -hw + .45 * u, w2, wd - .9 * u, .5 * u); g.fill(); g.fillStyle = 'rgba(120,170,220,.55)'; g.fillRect(cx2 + w2 * .3, -hw + .6 * u, w2 * .35, wd - 1.2 * u); } g.strokeStyle = '#8899aa'; g.lineWidth = .12 * u; g.strokeRect(-hl + .1 * u, -hw + .1 * u, lw - .2 * u, wd - .2 * u); }
        else if (t === 'tank') { const gr = g.createLinearGradient(0, -hw, 0, hw); gr.addColorStop(0, '#e6e6e6'); gr.addColorStop(.45, '#b8b8b8'); gr.addColorStop(1, '#6e6e6e'); g.fillStyle = '#3a3a3a'; g.fillRect(-hl, -hw, lw, wd); g.fillStyle = gr; g.beginPath(); g.roundRect(-hl + .3 * u, -hw + .15 * u, lw - .6 * u, wd - .3 * u, wd / 2); g.fill(); g.fillStyle = '#c33'; g.fillRect(-hl + .8 * u, -.15 * u, lw - 1.6 * u, .3 * u); g.fillStyle = '#555'; g.beginPath(); g.arc(0, 0, .45 * u, 0, 6.283); g.fill(); } }
      else { g.fillStyle = C.col; g.fillRect(-hl + 1, -hw + 1, lw - 2, wd - 2); }
      g.restore(); };
    let x = 0; for (let k = S.cars.length - 1; k >= 0; k--) { drawVeh(x + .6, CAR_L - 1.2, S.cars[k].cg); x += CAR_L; } drawVeh(x, Lc.len, Lc, 1);
    if (s < .02 * d) { const p = front(); g.strokeStyle = '#ffe29a'; g.lineWidth = 2 * d; g.beginPath(); g.arc(X(p[0]), Y(p[1]), 9 * d, 0, 6.283); g.stroke(); }
    if (PIN) { const px = X(PIN.x), py = Y(PIN.y); g.fillStyle = '#ff5a4a'; g.strokeStyle = '#000'; g.lineWidth = 1.5 * d; g.beginPath(); g.arc(px, py - 14 * d, 7 * d, Math.PI * .85, Math.PI * .15); g.lineTo(px, py); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(px, py - 14 * d, 2.6 * d, 0, 6.283); g.fill();
      g.font = `800 ${13 * d}px Inter, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.lineWidth = 3.5 * d; g.strokeStyle = 'rgba(0,0,0,.85)'; g.strokeText(PIN.n, px, py - 24 * d); g.fillStyle = '#fff'; g.fillText(PIN.n, px, py - 24 * d); }
    // lépték
    const mpp = 1 / s * d, nice = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000].find(v => v / mpp > 60 * d) || 100000; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(W - 20 * d - nice / mpp * d, Hh - 16 * d, nice / mpp * d, 2 * d); g.font = `600 ${10 * d}px Inter`; g.textAlign = 'right'; g.fillText(nice >= 1000 ? nice / 1000 + ' km' : nice + ' m', W - 20 * d, Hh - 20 * d); }

  /* ---------- felület ---------- */
  let AC = '';
  function ui() { if (!S) return; const Lc = LOCOS[S.loco]; $('#money').textContent = '💰 ' + money(S.money); const hh = Math.floor(S.time / 3600) % 24, mm = Math.floor(S.time / 60) % 60; $('#clock').textContent = 'Nap ' + (Math.floor(S.time / 86400) + 1) + ' · ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    $('#spd').innerHTML = Math.round(Math.abs(S.v) * 3.6) + '<small>km/h</small>'; $('#lim').textContent = E[S.P[S.P.length - 1].e].vm || '–';
    $('#thr').innerHTML = Array.from({ length: 8 }, (_, i) => `<i class="${i < S.thr ? 'on' : ''}"></i>`).join(''); $('#thrT').textContent = S.thr + '/8';
    $('#brk').innerHTML = Array.from({ length: 6 }, (_, i) => `<i class="${i < S.brk || keys[' '] ? 'on' : ''}"></i>`).join('');
    $('#bPark').classList.toggle('on', !!S.park); $('#cPk').classList.toggle('on', !!S.park);
    document.querySelectorAll('#rev .b').forEach(b => b.classList.toggle('on', +b.dataset.r === S.rev));
    if (Lc.el) { const on = E[S.P[S.P.length - 1].e].el; $('#fuT').textContent = on ? '⚡ Felsővezeték: van' : '⚡ Nincs felsővezeték – nincs vonóerő'; $('#fuT').className = on ? '' : 'warn'; $('#fuB').style.width = on ? '100%' : '0'; }
    else { $('#fuT').textContent = '⛽ Gázolaj: ' + fmt(S.fuel) + ' / ' + fmt(Lc.fuel) + ' L'; $('#fuT').className = S.fuel < Lc.fuel * .15 ? 'warn' : ''; $('#fuB').style.width = (S.fuel / Lc.fuel * 100) + '%'; }
    $('#locoN').textContent = Lc.n + ' · ' + S.cars.length + ' kocsi · ' + Math.round((Lc.m + S.cars.reduce((a, c) => a + CARGO[c.cg].m + 22, 0))) + ' t' + (Math.abs(S.gr || 0) >= .001 ? ' · ' + (S.gr > 0 ? '↗ ' : '↘ ') + (Math.abs(S.gr) * 100).toFixed(1).replace('.', ',') + '%' : '');
    const n = nextSwitch(); const R = S.route, rv = R && R.rev ? R.rev.dist - 0 : 0; $('#swT').textContent = (R && R.rev ? '🔁 Irányváltás ' + (rv < 1000 ? Math.round(rv / 10) * 10 + ' m' : (rv / 1000).toFixed(1).replace('.', ',') + ' km') + ' múlva · ' : '') + (S.route ? (S.route.back ? '🔁 A cél mögötted van · ' : '') + (S.route.km ? S.route.km.toFixed(1).replace('.', ',') + ' km a célig · ' : '') : '') + (n ? 'Váltó ' + (n.dist < 1000 ? Math.round(n.dist / 10) * 10 + ' m' : (n.dist / 1000).toFixed(1).replace('.', ',') + ' km') + ': ' + turnName(n) : 'Nincs váltó előtted');
    // állomási műveletek
    const si = nearSt(); let h = ''; { const k = onTT(); if (k >= 0) h += `<span class="mut">🔄 Fordítókorong</span><button class="b sm g" data-rot="-1">⟲ Forgatás</button><button class="b sm g" data-rot="1">Forgatás ⟳</button>`; else if (S.ttAnim) h += '<span class="mut">🔄 Forog…</span>'; } if (si >= 0) { h += `<span class="mut">📍 ${ST[si].n}</span>`;
      for (const j of S.jobs) { if (j.state === 'taken' && j.from === si) { const wt = CARGO[j.cg].wt; if (isDepot(si) && (S.wag[wt] || 0) >= j.n) h += `<button class="b sm g" data-c="${j.id}" data-own="1">🔗 Saját kocsik: ${j.n} × ${CARGO[j.cg].n}</button>`; h += `<button class="b sm${isDepot(si) && (S.wag[wt] || 0) >= j.n ? '' : ' g'}" data-c="${j.id}">🔗 Bérelt kocsik: ${j.n} × ${CARGO[j.cg].n} · kaució ${money(j.n * RENT_DEP)}</button>`; } if (j.state === 'loaded' && j.to === si) h += `<button class="b sm g" data-u="${j.id}">📦 Lekapcsolás: ${j.n} × ${CARGO[j.cg].n}</button>`; }
      if (ST[si].big && !Lc.el && S.fuel < Lc.fuel - 1) h += `<button class="b sm" data-f>⛽ Tankolás (${money((Lc.fuel - S.fuel) * FUEL_P)})</button>`; }
    if (h !== AC) { AC = h; $('#acts').innerHTML = h; }
    $('#bBoard').disabled = !(si >= 0 && (ST[si].big || ST[si].ind)); $('#bDepo').disabled = !(si >= 0 && ST[si].big); $('#bFollow').hidden = !!cam.follow;
    const jl = S.jobs.map(j => { const left = j.lim - (S.time - j.t0), tgt = ST[j.state === 'taken' ? j.from : j.to]; return `<div class="job${S.nav === j.id ? ' nav' : ''}" data-n="${j.id}"><b>${j.n} × ${CARGO[j.cg].n}</b> · ${money(j.pay)}<br><span class="mut">${j.state === 'taken' ? '🔗 Felvétel: ' : '📦 Cél: '}${tgt.n}</span><br><span class="${left < 0 ? 'warn' : 'mut'}">${left < 0 ? 'Késésben' : 'Határidő: ' + Math.floor(left / 3600) + ' ó ' + Math.floor(left % 3600 / 60) + ' p'}</span></div>`; }).join('');
    $('#jobs').hidden = !S.jobs.length; if ($('#jobs').dataset.h !== jl) { $('#jobs').dataset.h = jl; $('#jobs').innerHTML = '<div class="lab">Munkák · kattints a navigációhoz</div>' + jl; } }
  function panel(html) { $('#pc').innerHTML = html; $('#pnl').hidden = false; }
  const closeP = () => { $('#pnl').hidden = true; };
  function showBoard() { const si = nearSt(); if (si < 0 || !(ST[si].big || ST[si].ind)) return; const jobs = board(si);
    panel(`<div class="row"><h1 style="font-size:22px">📋 ${ST[si].n}</h1><div style="flex:1"></div><button class="b" data-x>✕</button></div>${ST[si].ind ? `<p class="mut">${IND[ST[si].ind].i} ${IND[ST[si].ind].n}${IND[ST[si].ind].be.length ? ' · fogad: ' + IND[ST[si].ind].be.map(c => CARGO[c].n).join(', ') : ''}${IND[ST[si].ind].ki.length ? ' · felad: ' + IND[ST[si].ind].ki.map(c => CARGO[c].n).join(', ') : ''}</p>` : ''}` +
      (jobs.length ? jobs.map(j => { const C = CARGO[j.cg], lock = C.haz && !S.lic.haz, long = j.n > licMax(); return `<div class="it"><div class="grow"><b>${j.n} × ${C.n}</b> → ${ST[j.to].n}<small>${C.w} · ${j.km.toFixed(0)} km · ${Math.round(j.n * (C.m + 22))} t · határidő ${Math.floor(j.lim / 3600)} ó ${Math.floor(j.lim % 3600 / 60)} p${C.haz ? ' · ☣ veszélyes áru' : ''}</small></div><b style="color:var(--gold2)">${money(j.pay)}</b><button class="b sm g" data-t="${j.id}" ${lock || long ? 'disabled' : ''}>${lock ? 'Engedély kell' : long ? 'Max ' + licMax() + ' kocsi' : 'Elvállalom'}</button></div>`; }).join('') : '<p class="mut">Most nincs szabad munka – nézz vissza később.</p>')); }
  function showDepo() { const si = nearSt(); if (si < 0 || !ST[si].big) return; const L = LEN_LIC[S.lic.len + 1], head = `<div class="row"><h1 style="font-size:22px">🏭 Depó · ${ST[si].n}</h1><div style="flex:1"></div><button class="b" data-x>✕</button></div>`;
    if (!isDepot(si)) return panel(head + `<p class="mut">Ezen az állomáson nincs saját depód. Depóban érheted el a központi járműtárolót: mozdonyt válthatsz, saját kocsikat vehetsz fel, járművet és engedélyt vásárolhatsz.</p><p class="mut">Saját depóid: ${S.depots.join(', ')}</p><div class="it"><div class="grow"><b>Depó építése itt</b><small>${ST[si].n}</small></div><button class="b sm g" data-depot="${si}" ${S.money < DEPOT_C ? 'disabled' : ''}>${money(DEPOT_C)}</button></div>`);
    panel(head + `<p class="mut">Központi tároló – minden saját depódból elérhető. Saját depóid: ${S.depots.join(', ')}</p><h2>Mozdonyok</h2>` +
      Object.entries(LOCOS).map(([k, Lc]) => { const own = S.own.includes(k), cur = S.loco === k, lock = Lc.el && !S.lic.el; return `<div class="it"><div class="grow"><b>${Lc.n}</b>${cur ? ' · <span style="color:var(--ok)">használatban</span>' : ''}<small>${Lc.kw} kW · ${Lc.f0} kN · ${Lc.vmax} km/h · ${Lc.m} t · ${Lc.el ? 'villamos (felsővezeték kell)' : 'dízel, ' + Lc.fuel + ' L'}</small></div>${own ? (cur ? '' : `<button class="b sm" data-l="${k}">Átszállás</button>`) : `<button class="b sm g" data-buy="${k}" ${lock || S.money < Lc.c ? 'disabled' : ''}>${lock ? 'Villamos engedély kell' : money(Lc.c)}</button>`}</div>`; }).join('') +
      `<h2>Saját kocsik</h2>` + Object.entries(WAGONS).map(([k, w]) => { const use = S.cars.filter(c => c.own && CARGO[c.cg].wt === k).length, lock = w.haz && !S.lic.haz; return `<div class="it"><div class="grow"><b>${w.n}</b><small>${Object.values(CARGO).filter(c => c.wt === k).map(c => c.n).join(', ')} · tárolóban: ${S.wag[k] || 0}${use ? ' · úton: ' + use : ''}</small></div><button class="b sm g" data-wag="${k}" ${lock || S.money < w.c ? 'disabled' : ''}>${lock ? 'Engedély kell' : '+1 · ' + money(w.c)}</button></div>`; }).join('') +
      `<h2>Engedélyek</h2><div class="it"><div class="grow"><b>Szerelvényhossz: ${licMax()} kocsi</b><small>${L ? 'Következő: ' + L + ' kocsi' : 'Elérted a legnagyobbat'}</small></div>${L ? `<button class="b sm g" data-lic="len" ${S.money < LEN_C[S.lic.len + 1] ? 'disabled' : ''}>${money(LEN_C[S.lic.len + 1])}</button>` : ''}</div>
      <div class="it"><div class="grow"><b>Veszélyes áru</b><small>Gázolaj-szállítás tartálykocsiban</small></div>${S.lic.haz ? '<span style="color:var(--ok)">megvan</span>' : `<button class="b sm g" data-lic="haz" ${S.money < HAZ_C ? 'disabled' : ''}>${money(HAZ_C)}</button>`}</div>
      <div class="it"><div class="grow"><b>Villamos vontatás</b><small>V43 és Taurus vezetése felsővezetékes vonalakon</small></div>${S.lic.el ? '<span style="color:var(--ok)">megvan</span>' : `<button class="b sm g" data-lic="el" ${S.money < EL_C ? 'disabled' : ''}>${money(EL_C)}</button>`}</div>`); }
  $('#pnl').addEventListener('click', e => { const t = e.target.closest('button'); if (e.target.id === 'pnl' || (t && t.dataset.x !== undefined)) return closeP(); if (!t) return;
    if (t.dataset.t) { const si = nearSt(), j = (S.boards[si] || { jobs: [] }).jobs.find(q => q.id === t.dataset.t); if (j) { take(j); showBoard(); } }
    if (t.dataset.depot) { const si = +t.dataset.depot; if (S.money >= DEPOT_C && !S.depots.includes(ST[si].n)) { S.money -= DEPOT_C; S.depots.push(ST[si].n); toast('Depó elkészült: ' + ST[si].n); showDepo(); } }
    if (t.dataset.wag) { const w = WAGONS[t.dataset.wag]; if (S.money >= w.c) { S.money -= w.c; S.wag[t.dataset.wag] = (S.wag[t.dataset.wag] || 0) + 1; toast(w.n + ' a tárolóban.'); showDepo(); } }
    if (t.dataset.buy) { const Lc = LOCOS[t.dataset.buy]; if (S.money >= Lc.c) { S.money -= Lc.c; S.own.push(t.dataset.buy); toast(Lc.n + ' megvásárolva.'); showDepo(); } }
    if (t.dataset.l) { if (S.cars.length) return toast('Előbb kapcsold le a kocsikat.', 1); S.loco = t.dataset.l; S.fuel = LOCOS[S.loco].fuel || 0; fixRear(); toast('Átszálltál: ' + LOCOS[S.loco].n); showDepo(); }
    if (t.dataset.lic) { const k = t.dataset.lic, c = k === 'len' ? LEN_C[S.lic.len + 1] : k === 'haz' ? HAZ_C : EL_C; if (S.money >= c) { S.money -= c; if (k === 'len') S.lic.len++; else S.lic[k] = 1; toast('Engedély megszerezve.'); showDepo(); } }
    ui(); save(); });
  $('#acts').addEventListener('click', e => { const t = e.target.closest('button'); if (!t) return; const j = S.jobs.find(q => q.id === (t.dataset.c || t.dataset.u));
    if (t.dataset.rot) rotTT(+t.dataset.rot);
    if (t.dataset.c && j) couple(j, !!t.dataset.own); if (t.dataset.u && j) uncouple(j);
    if (t.dataset.f !== undefined) { const Lc = LOCOS[S.loco], need = Lc.fuel - S.fuel, can = Math.min(need, S.money / FUEL_P); S.money -= can * FUEL_P; S.fuel += can; toast('Tankolás: ' + fmt(can) + ' L'); }
    AC = ''; ui(); save(); });
  $('#jobs').addEventListener('click', e => { const t = e.target.closest('[data-n]'); if (!t) return; S.nav = t.dataset.n; plan(); const j = S.jobs.find(q => q.id === S.nav), st = ST[j.state === 'taken' ? j.from : j.to]; toast('Navigáció: ' + st.n); ui(); });
  $('#rev').addEventListener('click', e => { const t = e.target.closest('[data-r]'); if (t) setRev(+t.dataset.r); });
  function park() { if (!S.park && Math.abs(S.v) * 3.6 > 3) return toast('A rögzítőfék csak megállva húzható be.', 1); S.park = !S.park; if (S.park) { S.thr = 0; S.v = 0; } beep(S.park ? 220 : 440, .1); ui(); }
  $('#bPark').onclick = park; $('#cPk').onclick = park;
  function setRev(r) { if (Math.abs(S.v) > .5 && r !== 0 && r !== S.rev) return toast('Irányváltás csak álló helyzetben.', 1); S.rev = r; beep(500, .05); plan(); ui(); }
  $('#bSw').onclick = flip; $('#bBoard').onclick = showBoard; $('#bDepo').onclick = showDepo; $('#bFollow').onclick = () => { cam.follow = 1; PIN = null; };
  $('#bMap').onclick = () => { if (cam.s > .003) { cam.prev = cam.s; cam.s = Math.min(cv.width, cv.height) / (devicePixelRatio || 1) / 560000; cam.follow = 0; } else { cam.s = cam.prev || .25; cam.follow = 1; } };
  $('#bMenu').onclick = () => { save(); $('#menu').hidden = false; $('#mPlay').textContent = '▶ Folytatás'; };
  const hold = (el, f) => { let iv = null; el.addEventListener('pointerdown', e => { e.preventDefault(); f(); iv = setInterval(f, 180); }); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(ev, () => { clearInterval(iv); iv = null; }); };
  hold($('#cUp'), () => { if (S.brk) S.brk--; else S.thr = Math.min(8, S.thr + 1); ui(); }); hold($('#cDn'), () => { if (S.thr) S.thr--; else S.brk = Math.min(6, S.brk + 1); ui(); });
  $('#cBr').addEventListener('pointerdown', () => { keys[' '] = 1; }); for (const ev of ['pointerup', 'pointerleave']) $('#cBr').addEventListener(ev, () => { keys[' '] = 0; }); $('#cSw').onclick = flip;

  addEventListener('keydown', e => { if (!S || !$('#menu').hidden || e.target.tagName === 'INPUT') return; if (e.key === '/') { e.preventDefault(); $('#q').focus(); return; } const k = e.key.toLowerCase(); if (e.key === ' ') e.preventDefault(); if (keys[k]) return; keys[k] = 1;
    if (k === 'w') { if (S.park) toast('Old ki a rögzítőféket (P).', 1); S.thr = Math.min(8, S.thr + 1); } if (k === 's') { S.thr = Math.max(0, S.thr - 1); } if (k === 'b') S.brk = Math.min(6, S.brk + 1); if (k === 'n') S.brk = Math.max(0, S.brk - 1);
    if (k === 'p') park(); if (k === 'r') setRev(S.rev === 1 ? 0 : S.rev === 0 ? (S.v > .5 ? 1 : -1) : 0); if (k === 'v') flip(); if (k === 'm') $('#bMap').onclick(); if (k === 'escape') { if (!$('#pnl').hidden) closeP(); else $('#bMenu').onclick(); } ui(); });
  addEventListener('keyup', e => { keys[e.key.toLowerCase()] = 0; });
  // kamera: görgő, húzás, kattintás váltóra
  cv.addEventListener('wheel', e => { e.preventDefault(); const f = Math.exp(-Math.max(-80, Math.min(80, e.deltaY)) * .0025); cam.s = Math.max(.0012, Math.min(8, cam.s * f)); }, { passive: false });
  let drag = null; const PT = new Map();
  cv.addEventListener('pointerdown', e => { PT.set(e.pointerId, { x: e.clientX, y: e.clientY }); drag = { x: e.clientX, y: e.clientY, m: 0 }; if (PT.size === 2) { const [a, b] = [...PT.values()]; drag.pinch = Math.hypot(a.x - b.x, a.y - b.y); drag.s0 = cam.s; } });
  cv.addEventListener('pointermove', e => { if (!drag || !PT.has(e.pointerId)) return; PT.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (PT.size === 2 && drag.pinch) { const [a, b] = [...PT.values()]; cam.s = Math.max(.0012, Math.min(8, drag.s0 * Math.hypot(a.x - b.x, a.y - b.y) / drag.pinch)); drag.m = 99; return; }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.m += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY; if (drag.m > 6) { cam.follow = 0; cam.x -= dx / cam.s; cam.y -= dy / cam.s; } });
  cv.addEventListener('pointerup', e => { PT.delete(e.pointerId); if (drag && drag.m < 6 && S) { const r = cv.getBoundingClientRect(), wx = cam.x + (e.clientX - r.left - r.width / 2) / cam.s, wy = cam.y + (e.clientY - r.top - r.height / 2) / cam.s, n = nextSwitch();
      if (n && Math.hypot(NX[n.nd] - wx, NY[n.nd] - wy) < 40 / cam.s) flip(); } if (!PT.size) drag = null; });

  /* ---------- kereső: települések, városrészek, állomások, ipari rakodók ---------- */
  const fold = t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let QI = null, QS = [], QA = 0, PIN = null;
  function qIndex() { if (QI && QI.full) return QI; QI = []; const tw = window.Taj && Taj.towns ? Taj.towns() : []; QI.full = tw.length > 0;
    for (const q of tw) QI.push({ n: q[0], k: fold(q[0]), x: q[1], y: q[2], t: q[3] < 0 ? 'városrész' : 'település', w: q[3] < 0 ? 1 : 3 + Math.log10(1 + q[3]), z: q[3] < 0 ? .06 : q[3] > 100 ? .006 : q[3] > 10 ? .015 : .03 });
    for (const st of ST) QI.push({ n: st.n, k: fold(st.n), x: st.x, y: st.y, t: st.ind ? IND[st.ind].i + ' ' + IND[st.ind].n : st.big ? '🚉 állomás' : 'megálló', w: st.big ? 2.5 : st.ind && st.n.includes(' · ') ? -2 : 1.5, z: .12 });
    return QI; }
  function qRun() { const v = fold($('#q').value.trim()), box = $('#qr'); if (!v) { box.hidden = true; QS = []; return; }
    QS = qIndex().map(q => { const i = q.k.indexOf(v); return i < 0 ? null : [q, (i === 0 ? 10 : q.k[i - 1] === ' ' || q.k[i - 1] === '-' ? 6 : 0) + q.w - q.k.length / 40]; }).filter(Boolean).sort((a, b) => b[1] - a[1]).map(q => q[0]).filter((q, i, a) => a.findIndex(o => o.n === q.n && o.t === q.t) === i).slice(0, 12); QA = 0;
    box.innerHTML = QS.length ? QS.map((q, i) => `<div data-i="${i}" class="${i ? '' : 'on'}">${q.n.replace(/[<>&]/g, '')}<small>${q.t}</small></div>`).join('') : '<div style="cursor:default;color:#999">Nincs találat</div>'; box.hidden = false; }
  function qGo(i) { const q = QS[i]; if (!q) return; cam.follow = 0; cam.x = q.x; cam.y = q.y; cam.s = q.z; PIN = { x: q.x, y: q.y, n: q.n, t: 6 }; $('#qr').hidden = true; $('#q').blur(); }
  $('#q').addEventListener('input', qRun); $('#q').addEventListener('focus', () => { if ($('#q').value) qRun(); });
  $('#q').addEventListener('keydown', e => { e.stopPropagation(); const box = $('#qr'); if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!QS.length) return; QA = (QA + (e.key === 'ArrowDown' ? 1 : -1) + QS.length) % QS.length; box.querySelectorAll('[data-i]').forEach((el, i) => el.classList.toggle('on', i === QA)); }
    else if (e.key === 'Enter') qGo(QA); else if (e.key === 'Escape') { box.hidden = true; $('#q').blur(); } });
  $('#q').addEventListener('keyup', e => e.stopPropagation());
  $('#qr').addEventListener('pointerdown', e => { const t = e.target.closest('[data-i]'); if (t) { e.preventDefault(); qGo(+t.dataset.i); } });
  $('#q').addEventListener('blur', () => setTimeout(() => { $('#qr').hidden = true; }, 150));

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
  if (window.Taj) Taj.load('202611212210').catch(() => {});
  fetch('halo.json?v=202611212210').then(r => r.json()).then(h => { build(h); const ok = load(); if (!ok) fresh(); S.nearIdx = []; nearT = 0;
    $('#mLoad').textContent = (H.e.reduce((a, e) => a + e[2], 0) / 1000).toFixed(0) + ' km vasútvonal · ' + ST.length + ' állomás és megálló'; $('#mPlay').disabled = false; $('#mPlay').textContent = ok ? '▶ Folytatás' : '▶ Játék'; $('#mNew').hidden = !ok; })
    .catch(() => { $('#mLoad').textContent = 'Nem sikerült betölteni a vasúthálózatot.'; });
  $('#mPlay').onclick = () => { $('#menu').hidden = true; beep(660, .08); if (S && S.migr) { delete S.migr; toast('A vasúthálózat bővült (állomási vágányok): a vonatod Kelenföldre került, a futó munkák lezárultak, a kauciókat visszakaptad.'); } };
  $('#mNew').onclick = () => { if ($('#mNew').dataset.sure) { localStorage.removeItem(KEY); fresh(); S.nearIdx = []; nearT = 0; $('#menu').hidden = true; delete $('#mNew').dataset.sure; $('#mNew').textContent = 'Új játék'; } else { $('#mNew').dataset.sure = 1; $('#mNew').textContent = 'Biztos? Minden elvész'; } };
  addEventListener('pagehide', save);
  window.__vt = () => ({ S, E, ST, TT, aligned, onTT, fixRear, NX, NY, ADJ, dijkstra, exits, outDir, routeTo, succ, step, ui, move, plan, nextSwitch, flip, board, take, couple, uncouple, nearSt, front, along, cam });
})();
