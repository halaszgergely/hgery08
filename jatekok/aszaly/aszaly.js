/* HGWS Arcade – Aszálytúlélő: hordatúlélő (automata fegyverek, szintlépés, evolúciók, karakterek, Szikkadt Szilárd)
   (klasszikus szkript, az arcade.html tölti be; a közös keret a jatekok/arcade/mag.js) */
'use strict';
const Aszaly = (() => {
  const TAU = Math.PI * 2, MAXLV = 5, CS = 48, K = {}, V = { sc: 1, hw: 0, hh: 0, ring: 0 }, GR = new Map(), MAXW = 6, MAXP = 6;
  let S = null, joy = null, SPR = null, sprSc = 0, TILE = null, VIG = null, PORT = null, portD = 0;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmtT = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ellenségek: élet, sebesség, sebzés, sugár, csepp (XP), pont */
  const ET = {
    kaktusz: { hp: 8, sp: 46, dmg: 8, r: 13, xp: 1, pt: 10 },
    szeker: { hp: 4, sp: 98, dmg: 5, r: 10, xp: 1, pt: 12, spin: 1 },
    tuz: { hp: 15, sp: 68, dmg: 10, r: 12, xp: 2, pt: 20 },
    skorpio: { hp: 28, sp: 86, dmg: 13, r: 13, xp: 3, pt: 35 },
    golem: { hp: 80, sp: 33, dmg: 18, r: 21, xp: 6, pt: 60 },
    orveny: { hp: 11, sp: 118, dmg: 7, r: 12, xp: 2, pt: 18, spin: 1 },
    denever: { hp: 3, sp: 132, dmg: 4, r: 9, xp: 1, pt: 8, flap: 1 },
    repedt: { hp: 44, sp: 27, dmg: 14, r: 18, xp: 4, pt: 40 },
    rog: { hp: 8, sp: 62, dmg: 6, r: 9, xp: 1, pt: 8 },
    kiraly: { hp: 420, sp: 52, dmg: 26, r: 36, xp: 0, pt: 500, boss: 1 },
    fereg: { hp: 380, sp: 140, dmg: 22, r: 30, xp: 0, pt: 600, boss: 1 },
    szilard: { hp: 1100, sp: 42, dmg: 26, r: 36, xp: 0, pt: 0, boss: 1, final: 1 }
  };
  /* fejlesztések: w = fegyver (szintenkénti leírás), a többi passzív; evo = fejlődött fegyver; mx = szintkorlát */
  const UP = {
    pisztoly: { n: 'Vízpisztoly', w: 1, d: ['A legközelebbi ellenségre lő', '+1 lövedék', 'Átüt még egy ellenségen', '+1 lövedék', 'Gyorsabb tüzelés, +1 átütés'] },
    szoro: { n: 'Szórófej', w: 1, d: ['Körülötted keringő vízcseppek', '+1 csepp, erősebb', '+1 csepp, erősebb', '+1 csepp, erősebb', '+1 csepp, erősebb'] },
    ostor: { n: 'Slagostor', w: 1, d: ['Végigcsap előtted a slag', 'Hosszabb és erősebb', 'Hátrafelé is csap', 'Hosszabb és gyorsabb', 'Sokkal gyorsabb és hosszabb'] },
    bomba: { n: 'Vízibomba', w: 1, d: ['Felrobbanó vízibombát dob', 'Nagyobb robbanás', '+1 bomba', 'Nagyobb robbanás', '+1 bomba'] },
    felho: { n: 'Esőfelhő', w: 1, d: ['Áztat és lelassít egy területet', 'Tovább tart', 'Nagyobb és erősebb', '+1 felhő', 'Sokkal tovább tart'] },
    pocsolya: { n: 'Pocsolya', w: 1, d: ['Sebző tócsa a lábad körül', 'Nagyobb és erősebb', 'Nagyobb és erősebb', 'Nagyobb és erősebb', 'Nagyobb és erősebb'] },
    sugar: { n: 'Nagynyomású sugár', w: 1, d: ['Folyamatos sugár a legközelebbi ellenségre', 'Erősebb sugár', '+1 sugár', 'Erősebb, messzebb ér', 'Átüt mindenen'] },
    rainbird: { n: 'Rain Bird szektorszóró', w: 1, d: ['Körbe söprő vízív', 'Szélesebb söprés, erősebb', 'Szélesebb söprés', 'Erősebb, messzebb ér', 'Szinte teljes kör, erősebb'] },
    kanna: { n: 'Visszatérő locsolókanna', w: 1, d: ['Kidobod, visszajön, oda-vissza sebez', 'Erősebb, messzebb repül', '+1 kanna', 'Erősebb és gyorsabb', '+1 kanna'] },
    gejzir: { n: 'Gejzír', w: 1, d: ['Vízoszlop tör fel az ellenség alatt', '+1 gejzír', 'Nagyobb és erősebb', '+1 gejzír', 'Sűrűbb kitörések'] },
    jeg: { n: 'Jégkocka-szóró', w: 1, d: ['Legyezőben szórt, fagyasztó jégkockák', '+1 jégkocka', 'Hosszabb fagyasztás', '+1 jégkocka', 'Erősebb, hosszabb fagyasztás'] },
    heli: { n: 'HGWS Ka-26 mini helikopter', w: 1, d: ['Követ és permetez alattad', 'Szélesebb permetsáv', 'Erősebb permet', '+1 helikopter', 'Szélesebb, erősebb permet'] },
    cso: { n: 'Csepegtető cső', w: 1, d: ['Sebző vízcsík a nyomodban', 'Erősebb', 'Hosszabb nyom', 'Erősebb', 'Szélesebb, hosszabb nyom'] },
    por: { n: 'Porszóró kanna', w: 1, hid: 1, d: ['Homokot szór a legközelebbi ellenségre', '+1 lövedék', 'Átüt még egy ellenségen', '+1 lövedék', 'Gyorsabb szórás, +1 átütés'] },
    csizma: { n: 'Gumicsizma', d: '+9% mozgási sebesség' },
    vitamin: { n: 'Tápoldat', d: '+20 max. élet és gyógyulás' },
    magnes: { n: 'Cseppmágnes', d: '+35% gyűjtési távolság' },
    nyomas: { n: 'Nyomásfokozó', d: '+12% sebzés' },
    idozito: { n: 'Öntözőóra', d: '−7% töltési idő' },
    fuvoka: { n: 'Széles fúvóka', d: '+10% hatóterület' },
    kesztyu: { n: 'Kerti kesztyű', d: '−1 kapott sebzés' },
    gyujto: { n: 'Esővíz-gyűjtő', d: '+0,3 élet/mp' },
    tartaly: { n: 'Tartalék tartály', d: '+1 lövedék a lövedékes fegyverekre', mx: 2 },
    lohere: { n: 'Négylevelű lóhere', d: 'Több ritka csepp, 5. szinten 4 kártya' },
    hosszabbito: { n: 'Hosszabbító', d: '+15% időtartam' },
    gyogy: { n: 'Friss víz', sp: 1, d: '+40 élet' },
    pont: { n: 'Aranycsepp', sp: 1, d: '+500 pont' },
    vizagyu: { n: 'VÍZÁGYÚ', w: 1, evo: 1, from: 'pisztoly', d: 'Hatalmas, mindenen átütő lövedék, hátralökéssel' },
    korforgo: { n: 'KÖRFORGÓ ESŐZTETŐ', w: 1, evo: 1, from: 'szoro', d: 'Két ellentétes irányban forgó cseppgyűrű' },
    tuzolto: { n: 'TŰZOLTÓCSŐ', w: 1, evo: 1, from: 'ostor', d: '360°-os vízcsapás körös-körül' },
    bombazapor: { n: 'BOMBAZÁPOR', w: 1, evo: 1, from: 'bomba', d: 'Bombaeső, a robbanások láncban folytatódnak' },
    zivatar: { n: 'ZIVATAR', w: 1, evo: 1, from: 'felho', d: 'Villám csap le a felhőkből a közeli ellenségekre' },
    gyogyforras: { n: 'GYÓGYFORRÁS', w: 1, evo: 1, from: 'pocsolya', d: 'Sebez, és gyógyít, amíg benne állsz' },
    hidromonitor: { n: 'HIDROMONITOR', w: 1, evo: 1, from: 'sugar', d: '3 mindenen átütő, hatalmas nyomású sugár' },
    ontozohid: { n: 'KÖRFORGÓ ÖNTÖZŐHÍD', w: 1, evo: 1, from: 'rainbird', d: 'Hosszú, körbeforgó öntözőkar, ami mindent elsöpör' },
    kannavihar: { n: 'KANNAVIHAR', w: 1, evo: 1, from: 'kanna', d: 'Hat kanna repül szét minden irányba' },
    gejzirmezo: { n: 'GEJZÍRMEZŐ', w: 1, evo: 1, from: 'gejzir', d: 'Sorozatos, tartós kitörések az egész képernyőn' },
    jegeso: { n: 'JÉGESŐ', w: 1, evo: 1, from: 'jeg', d: 'Fagyasztó jégeső zúdul az ellenségekre' },
    legiflotta: { n: 'HGWS LÉGIFLOTTA', w: 1, evo: 1, from: 'heli', d: 'Négy helikopter, széles permetsávval' },
    csatorna: { n: 'ÖNTÖZŐCSATORNA', w: 1, evo: 1, from: 'cso', d: 'Széles, hosszan sebző és lassító vízcsatorna' }
  };
  /* evolúciók: fegyver (5. szint) + passzív (≥1) + boss kincse */
  const EVOR = [['pisztoly', 'nyomas', 'vizagyu'], ['por', 'nyomas', 'vizagyu'], ['szoro', 'fuvoka', 'korforgo'], ['ostor', 'csizma', 'tuzolto'], ['bomba', 'idozito', 'bombazapor'],
    ['felho', 'magnes', 'zivatar'], ['pocsolya', 'vitamin', 'gyogyforras'], ['sugar', 'kesztyu', 'hidromonitor'], ['rainbird', 'gyujto', 'ontozohid'], ['kanna', 'tartaly', 'kannavihar'],
    ['gejzir', 'hosszabbito', 'gejzirmezo'], ['jeg', 'lohere', 'jegeso'], ['heli', 'tartaly', 'legiflotta'], ['cso', 'hosszabbito', 'csatorna']];
  /* karakterek */
  const CH = [
    { id: 'gergely', n: 'Gergely, a kertész', w: 'pisztoly', b: 'Nincs bónusz' },
    { id: 'zero', n: 'Zero', w: 'heli', b: '−10% töltési idő', req: '5000 pont egy körben' },
    { id: 'kati', n: 'Kertész Kati', w: 'ostor', b: '+20% sebzés közelre', req: '10 perc túlélés' },
    { id: 'pista', n: 'Pumpás Pista', w: 'bomba', b: '+20 max. élet, −5% sebesség', req: '3 Kaktuszkirály egy körben' },
    { id: 'eso', n: 'Esőcsináló', w: 'felho', b: '+15% hatóterület', req: 'Készíts egy evolúciót', secret: 1 },
    { id: 'szilard', n: 'Szilárd, a megtért', w: 'por', b: '+30% XP, −20 max. élet', req: 'Győzd le Szikkadt Szilárdot', secret: 1 }
  ];
  const chOpen = c => c.id === 'gergely' || store.get('aszaly_ch_' + c.id) > 0;
  const TAUNT = ['Ez a kert az enyém lesz!', 'Még mindig locsolsz? Nevetséges.', 'A víz elfogy. Én maradok.', 'Minden virág elszárad egyszer!'];

  const lv = k => S.up[k] || 0;
  const mxl = k => UP[k].mx || MAXLV;
  const isW = k => !!UP[k].w;
  const chr = () => S.ch;
  function stats() {
    const c = chr();
    S.st = { speed: 150 * (1 + .09 * lv('csizma')) * (c === 'pista' ? .95 : 1), magnet: 62 * (1 + .35 * lv('magnes')), dmg: 1 + .12 * lv('nyomas'),
      cd: (1 - .07 * lv('idozito')) * (c === 'zero' ? .9 : 1), area: (1 + .1 * lv('fuvoka')) * (c === 'eso' ? 1.15 : 1), dur: 1 + .15 * lv('hosszabbito'),
      armor: lv('kesztyu'), regen: .3 * lv('gyujto'), extra: lv('tartaly'), luck: 1 + .3 * lv('lohere'), xp: c === 'szilard' ? 1.3 : 1 };
    S.P.mhp = 100 + 20 * lv('vitamin') + (c === 'pista' ? 20 : c === 'szilard' ? -20 : 0);
  }
  function view(G) { V.sc = G.d * clamp(Math.min(G.W, G.H) / G.d / 440, .85, 1.6); V.hw = G.W / 2 / V.sc; V.hh = G.H / 2 / V.sc; V.ring = Math.hypot(V.hw, V.hh) + 50; }

  /* ---------- irányítás ---------- */
  const KEYS = { ArrowUp: 'U', w: 'U', W: 'U', ArrowDown: 'D', s: 'D', S: 'D', ArrowLeft: 'L', a: 'L', A: 'L', ArrowRight: 'R', d: 'R', D: 'R' };
  const mine = () => gEl.classList.contains('open') && G.game === me && S;
  // Esc/P: szünet (a keret Esc = bezárás kezelője elé fut)
  addEventListener('keydown', e => { if (!mine() || !G.running || S.sel || S.over) return;
    if (e.key === 'Escape' || ((e.key === 'p' || e.key === 'P') && !e.repeat)) { e.preventDefault(); e.stopImmediatePropagation(); togglePause(); } }, true);
  addEventListener('keydown', e => { if (!mine()) return; const k = KEYS[e.key];
    if (S.sel && G.running) { const n = CH.length, cols = selCols(G);
      if (/^[1-6]$/.test(e.key)) return selPick(G, +e.key - 1);
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); return selPick(G, S.sel.i); }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') S.sel.i = (S.sel.i + 1) % n; else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') S.sel.i = (S.sel.i + n - 1) % n;
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') S.sel.i = (S.sel.i + cols) % n; else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') S.sel.i = (S.sel.i + n - cols % n) % n;
      if (k) e.preventDefault(); return; }
    if (k) { K[k] = 1; if (G.running) e.preventDefault(); }
    else if (G.running && S.choose) { if (/^[1-4]$/.test(e.key)) pick(G, +e.key - 1); else if ((e.key === 'r' || e.key === 'R') && !e.repeat) reroll(); else if ((e.key === 'x' || e.key === 'X') && !e.repeat) skip(); } });
  addEventListener('keyup', e => { const k = KEYS[e.key]; if (k) K[k] = 0; });
  addEventListener('blur', () => { K.U = K.D = K.L = K.R = 0; joy = null; });

  /* ---------- rács a közelségi keresésekhez ---------- */
  const gk = (cx, cy) => (cx + 524288) * 1048576 + (cy + 524288);
  function gridBuild() { GR.clear(); for (const e of S.en) { if (e.under) continue; const k = gk(Math.floor(e.x / CS), Math.floor(e.y / CS)); let l = GR.get(k); if (!l) GR.set(k, l = []); l.push(e); } }
  function near(x, y, r, fn) {
    const x0 = Math.floor((x - r - 38) / CS), x1 = Math.floor((x + r + 38) / CS), y0 = Math.floor((y - r - 38) / CS), y1 = Math.floor((y + r + 38) / CS);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) { const l = GR.get(gk(cx, cy)); if (!l) continue;
      for (const e of l) { if (e.dead) continue; const dx = e.x - x, dy = e.y - y, q = r + e.r; if (dx * dx + dy * dy < q * q) fn(e, dx, dy); } }
  }
  function nearest(range) { const P = S.P; let b = null, bd = range * range; for (const e of S.en) { if (e.dead || e.under) continue; const dx = e.x - P.x, dy = e.y - P.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; b = e; } } return b; }
  function nearestN(range, n) { const P = S.P, out = []; for (const e of S.en) { if (e.dead || e.under) continue; const d = (e.x - P.x) ** 2 + (e.y - P.y) ** 2; if (d > range * range) continue;
      if (out.length < n) { out.push([d, e]); out.sort((a, b) => a[0] - b[0]); } else if (d < out[n - 1][0]) { out[n - 1] = [d, e]; out.sort((a, b) => a[0] - b[0]); } } return out.map(o => o[1]); }
  function randEnemy(range) { const P = S.P, n = S.en.length; for (let i = 0; i < 14 && n; i++) { const e = S.en[Math.floor(Math.random() * n)]; if (!e.dead && !e.under && Math.abs(e.x - P.x) < Math.min(range, V.hw) && Math.abs(e.y - P.y) < Math.min(range, V.hh)) return e; } return null; }
  const part = (x, y, n, c, v = 110, l = .45) => { for (let i = 0; i < n && S.pt.length < 170; i++) { const a = Math.random() * TAU, s = v * (.35 + Math.random() * .65); S.pt.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l, c }); } };

  /* ---------- ellenségek ---------- */
  function edge() { const w = V.hw + 34, h = V.hh + 34, r = Math.random() * (w + h) * 2, s = Math.random() < .5 ? -1 : 1; return r < w * 2 ? [r - w, s * h] : [s * w, r - w * 2 - h]; }
  function spawn(type, ox, oy, mul = 1) {
    const T = ET[type], P = S.P, hm = 1 + Math.pow(S.t / 60, 1.3) * .3, hp = T.hp * hm * (T.boss ? 1 + S.bossN * .8 : 1) * mul;
    const e = { id: ++S.eid, type, T, x: P.x + ox, y: P.y + oy, hp, mhp: hp, r: T.r, sp: T.sp * (.9 + Math.random() * .2), flash: 0, kx: 0, ky: 0, slow: 0, freeze: 0, air: 0, oT: 0, rbT: 0, csT: 0, ph: Math.random() * 6 };
    S.en.push(e); return e;
  }
  function pickType() {
    const t = S.t, w = [['kaktusz', t > 300 ? 2 : 5]]; if (t > 40) w.push(['szeker', 3]); if (t > 90) w.push(['tuz', 3]); if (t > 120) w.push(['orveny', 2.2]); if (t > 150) w.push(['denever', 1.6]);
    if (t > 180) w.push(['golem', 1.4]); if (t > 240) w.push(['skorpio', 3]); if (t > 300) w.push(['repedt', 1.2]);
    let r = Math.random() * w.reduce((a, x) => a + x[1], 0); for (const [k, v] of w) if ((r -= v) <= 0) return k; return 'kaktusz';
  }
  function banner(t, l = 2.6, c) { S.banner = { t, l, c }; }
  function spawner(G, dt) {
    const cap = clamp(Math.round(V.hw * V.hh / 420), 150, 260);
    S.sT -= dt;
    while (S.sT <= 0) { S.sT += Math.max(.16, .5 - S.t * .001);
      for (let i = 0, n = 1 + Math.floor(S.t / 150); i < n && S.en.length < cap; i++) spawn(pickType(), ...edge()); }
    // szárazságdenevér-raj
    if (S.t > 150 && (S.batT -= dt) <= 0) { S.batT = 26 + Math.random() * 10; const [ox, oy] = edge(); for (let i = 0, n = 10 + Math.floor(S.t / 90); i < n && S.en.length < cap + 20; i++) spawn('denever', ox + rnd(-40, 40), oy + rnd(-40, 40)); }
    const m = Math.floor(S.t / 60);
    if (m > S.minute) { S.minute = m;
      if (m === S.szNext && !S.szE) szSpawn(G);
      else if (m % 3 === 0) { const worm = S.bossN % 2 === 1, ty = worm ? 'fereg' : 'kiraly', nm = worm ? 'HOMOKFÉREG' : 'KAKTUSZKIRÁLY';
        const e = spawn(ty, ...edge()); if (worm) { e.st = 'under'; e.stT = 2; e.under = 1; } S.bossN++; banner(Math.random() < .5 ? 'SZIKKADT SZILÁRD KÜLDI: ' + nm + '!' : nm + '!'); Sfx.boom(); }
      else { const n = 12 + m * 2, ty = m < 2 ? 'kaktusz' : m < 5 ? 'szeker' : m % 2 ? 'orveny' : 'skorpio', a0 = Math.random() * TAU; for (let i = 0; i < n; i++) { const a = a0 + i / n * TAU; spawn(ty, Math.cos(a) * (V.hw + 40) * 1.42, Math.sin(a) * (V.hh + 40) * 1.42); } }
      if ((m === 5 || m === 10) && !S.szE && !S.szKill) { S.taunt = { l: 3.2, txt: TAUNT[m === 5 ? 0 : 1], puff: 0 }; Sfx.blip(110, .5, 'sawtooth', .06, .5); }
      if (m >= 1 && m % 3 !== 0 && m !== S.szNext) { if (Math.random() < .5) { S.heat = 20; banner('HŐHULLÁM!', 2.2); Sfx.blip(300, .6, 'sawtooth', .05, .4); }
        else { S.zapor = 20; S.rainT = Math.max(S.rainT, 4); for (const q of S.gems) q.pull = 1; banner('ZÁPOR! +10% XP', 2.2, '#6cc6ff'); Sfx.splash(); } } }
  }
  function hurt(G, e, dmg, kx, ky, src) {
    if (e.dead || e.under) return; dmg *= S.st.dmg;
    if (e.type === 'szilard' && (src === 'zivatar' || src === 'gyogyforras')) dmg *= 1.25;
    if (S.ch === 'kati' && Math.abs(e.x - S.P.x) + Math.abs(e.y - S.P.y) < 150) dmg *= 1.2;
    e.hp -= dmg; e.flash = .1; if (src) S.dmgBy[src] = (S.dmgBy[src] || 0) + Math.min(dmg, dmg + e.hp);
    if (!e.T.boss) { e.kx += kx; e.ky += ky; }
    if (S.nums.length < 28) S.nums.push({ x: e.x + (Math.random() - .5) * 10, y: e.y - e.r, v: Math.max(1, Math.round(dmg)), l: .6 });
    if (e.hp > 0) return;
    e.dead = 1; S.kills++; G.score += e.T.pt; S.dirty = 1;
    part(e.x, e.y, e.T.boss ? 30 : 5, e.type === 'tuz' ? '255,150,60' : e.type === 'golem' || e.type === 'repedt' || e.type === 'rog' || e.type === 'orveny' || e.type === 'fereg' ? '207,174,116' : e.type === 'denever' ? '140,100,70' : '110,190,110', 150);
    if (e.type === 'szilard') return szDeath(G, e);
    if (e.T.boss) { S.gems.push({ k: 'c', x: e.x, y: e.y, v: 0 }); Sfx.boom(); G.shake = 14 * G.d; if (e.type === 'kiraly') S.kingK++; }
    else { S.gems.push({ k: 'x', x: e.x, y: e.y, v: e.T.xp }); const r = Math.random(), lk = S.st.luck; if (r < .011 * lk) S.gems.push({ k: 'h', x: e.x + 8, y: e.y, v: 0 }); else if (r < .0145 * lk) S.gems.push({ k: 'm', x: e.x - 8, y: e.y, v: 0 }); }
    if (e.type === 'repedt') for (let i = 0; i < 3; i++) spawn('rog', e.x - S.P.x + rnd(-14, 14), e.y - S.P.y + rnd(-14, 14));
    if (S.gems.length > 340) { const o = S.gems.findIndex(q => q.k === 'x' && !q.pull); if (o >= 0) { const v = S.gems[o].v; S.gems.splice(o, 1); const n = S.gems.find(q => q.k === 'x' && !q.pull); if (n) n.v += v; } }
    if (S.t - S.sndT > .07) { S.sndT = S.t; Sfx.blip(260 + Math.random() * 180, .05, 'triangle', .035, .6); }
  }
  function hitPlayer(G, e, dm) {
    const P = S.P; P.hp -= Math.max(1, (dm != null ? dm : e.T.dmg) * (1 + S.t / 600) - S.st.armor); P.inv = .6; G.shake = 10 * G.d; Sfx.hit(); if (navigator.vibrate) navigator.vibrate(40);
    part(P.x, P.y, 8, '255,90,77', 120, .4);
    if (P.hp <= 0) { P.hp = 0; me.overTitle = 'KISZÁRADTÁL · ' + fmtT(S.t); G.end(); }
  }
  function enemies(G, dt) {
    const P = S.P, kd = Math.pow(.002, dt), hot = S.heat > 0 || S.szRage ? 1.35 : 1;
    for (const e of S.en) {
      e.flash -= dt;
      if (e.type === 'fereg') { wormAI(G, e, dt); continue; }
      if (e.type === 'szilard') { szAI(G, e, dt); continue; }
      const dx = P.x - e.x, dy = P.y - e.y, dd = Math.hypot(dx, dy) || 1;
      if (Math.abs(dx) > V.hw * 2 + 220 || Math.abs(dy) > V.hh * 2 + 220) { const p = edge(); e.x = P.x + p[0]; e.y = P.y + p[1]; continue; }
      if (e.air > 0) { e.air -= dt; continue; }
      if (e.freeze > 0) { e.freeze -= dt; e.kx *= kd; e.ky *= kd; continue; }
      const v = e.sp * (e.slow > 0 ? .5 : 1) * hot; e.slow -= dt;
      let mx = dx / dd * v, my = dy / dd * v;
      if (e.type === 'orveny') { const w = Math.sin(S.t * 4.5 + e.ph) * v * .9; mx += -dy / dd * w; my += dx / dd * w; }
      else if (e.type === 'denever') { const w = Math.sin(S.t * 7 + e.ph) * v * .4; mx += -dy / dd * w; my += dx / dd * w; }
      e.x += (mx + e.kx) * dt; e.y += (my + e.ky) * dt; e.kx *= kd; e.ky *= kd;
      if (dd < e.r + 10 && P.inv <= 0 && G.running) hitPlayer(G, e);
    }
    // ne csússzanak egymásba
    const f = Math.min(1, dt * 10);
    for (const l of GR.values()) { const n = Math.min(l.length, 8); for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const a = l[i], b = l[j]; if (a.T.boss || b.T.boss) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, q = (a.r + b.r) * .85; if (d2 < q * q && d2 > .01) { const d = Math.sqrt(d2), p = (q - d) / d * .5 * f; a.x -= dx * p; a.y -= dy * p; b.x += dx * p; b.y += dy * p; } } }
    // ellenséges lövedékek (homokhullám)
    for (const p of S.ep) { p.x += p.vx * dt; p.y += p.vy * dt; if ((p.l -= dt) <= 0) { p.dead = 1; continue; }
      if (P.inv <= 0 && Math.abs(p.x - P.x) < 13 && Math.abs(p.y - P.y) < 13 && G.running) { p.dead = 1; hitPlayer(G, null, p.dmg); } }
  }
  /* homokféreg: a föld alatt közelít, figyelmeztető kör után feltör, aztán sebezhetően kint marad */
  function wormAI(G, e, dt) {
    const P = S.P; e.stT -= dt;
    if (e.st === 'under') { e.under = 1; const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1; e.x += dx / d * e.sp * dt; e.y += dy / d * e.sp * dt;
      if ((S.t * 20 | 0) % 2 === 0 && S.pt.length < 150) part(e.x, e.y, 1, '160,125,80', 40, .5);
      if (e.stT <= 0 || d < 30) { e.st = 'warn'; e.stT = .75; e.wx = P.x; e.wy = P.y; Sfx.blip(220, .3, 'sawtooth', .05, .6); } }
    else if (e.st === 'warn') { if (e.stT <= 0) { e.st = 'up'; e.stT = 2; e.under = 0; e.x = e.wx; e.y = e.wy; G.shake = 9 * G.d; Sfx.boom(); part(e.x, e.y, 22, '207,174,116', 220, .6);
        if (Math.hypot(P.x - e.x, P.y - e.y) < 58 && P.inv <= 0) hitPlayer(G, e); } }
    else { e.under = 0; if (Math.hypot(P.x - e.x, P.y - e.y) < e.r + 10 && P.inv <= 0) hitPlayer(G, e, e.T.dmg * .6); if (e.stT <= 0) { e.st = 'under'; e.stT = 2.4; part(e.x, e.y, 14, '207,174,116', 160); } }
  }

  /* ---------- Szikkadt Szilárd ---------- */
  function szSpawn(G) {
    const back = S.szN > 0, e = spawn('szilard', ...edge(), 1 + S.szN * .7); e.wT = 2.5; e.sumT = 5; e.ph2 = 0; e.st = 'walk'; e.stT = 0; S.szE = e;
    banner(back ? 'SZIKKADT SZILÁRD VISSZATÉRT!' : 'SZIKKADT SZILÁRD!', 3.4); G.shake = 12 * G.d;
    [196, 185, 147, 110].forEach((f, i) => setTimeout(() => Sfx.blip(f, .38, 'sawtooth', .07, .8), i * 230)); setTimeout(() => Sfx.boom(), 950);
    S.say = { t: back ? 'Azt hitted, végeztél velem?' : 'Végre személyesen! Kiszárítalak!', l: 3 };
  }
  function sandWave(e, n, sp, off = 0) { for (let i = 0; i < n && S.ep.length < 160; i++) { const a = off + i / n * TAU; S.ep.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, l: 3.2, dmg: 10 }); } Sfx.noise(.35, .14, 700); }
  function szAI(G, e, dt) {
    const P = S.P, k = e.hp / e.mhp, ph = k > .6 ? 1 : k > .25 ? 2 : 3, dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1;
    if (ph !== e.ph2) { e.ph2 = ph;
      if (ph === 2) { S.say = { t: 'A föld az enyém!', l: 2.5 }; e.st = 'under'; e.stT = 1; }
      if (ph === 3) { e.under = 0; e.st = 'walk'; S.szRage = 1; S.say = { t: 'ELÉG! HŐHULLÁM!', l: 2.5 }; banner('HŐHULLÁM!', 2.4); Sfx.blip(240, .8, 'sawtooth', .07, .3); } }
    if (Math.abs(dx) > V.hw * 2 + 260 || Math.abs(dy) > V.hh * 2 + 260) { const p = edge(); e.x = P.x + p[0]; e.y = P.y + p[1]; }
    e.wT -= dt; e.sumT -= dt; if (e.slow > 0) e.slow -= dt;
    if (ph === 2) { S.dry = .4;
      if (e.st === 'under') { e.under = 1; e.x += dx / d * 170 * dt; e.y += dy / d * 170 * dt; if ((e.stT -= dt) <= 0) { e.st = 'warn'; e.stT = .9; e.wx = P.x; e.wy = P.y; Sfx.blip(180, .4, 'sawtooth', .06, .6); } return; }
      if (e.st === 'warn') { e.under = 1; if ((e.stT -= dt) <= 0) { e.st = 'up'; e.stT = 2.6; e.under = 0; e.x = e.wx; e.y = e.wy; G.shake = 12 * G.d; Sfx.boom(); part(e.x, e.y, 26, '207,174,116', 240, .6);
          if (Math.hypot(P.x - e.x, P.y - e.y) < 62 && P.inv <= 0) hitPlayer(G, e, 28); e.wT = .6; } return; }
      e.under = 0; if (e.wT <= 0) { e.wT = 1.3; sandWave(e, 18, 160, S.t); } if ((e.stT -= dt) <= 0) { e.st = 'under'; e.stT = 1.2; part(e.x, e.y, 16, '207,174,116', 160); }
    } else { e.under = 0; const sp = (ph === 3 ? 92 : e.sp) * (e.slow > 0 ? .6 : 1);
      if (d > 120 || ph === 3) { e.x += dx / d * sp * dt; e.y += dy / d * sp * dt; }
      if (e.wT <= 0) { e.wT = ph === 3 ? 1.9 : 3.2; sandWave(e, ph === 3 ? 22 : 16, ph === 3 ? 185 : 150, S.t * .7); }
      if (e.sumT <= 0) { e.sumT = ph === 3 ? 5 : 6.5; for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + S.t; spawn('kaktusz', e.x - P.x + Math.cos(a) * 60, e.y - P.y + Math.sin(a) * 60); } } }
    if (d < e.r + 10 && P.inv <= 0 && !e.under) hitPlayer(G, e);
  }
  function szDeath(G, e) {
    S.szE = null; S.szN++; S.szKill = 1; S.szNext = S.minute + 20; S.szRage = 0; S.dry = 0; S.heat = 0;
    G.score += 5000; S.dirty = 1; G.float(G.W / 2, G.H / 2 - 60 * G.d, '+5000');
    banner('A KERT MEGMENEKÜLT!', 4.2, '#7ef0a4'); S.melt = { x: e.x, y: e.y, l: 2.6 }; S.rainT = 10; S.green = 10; S.say = null;
    S.gems.push({ k: 'c', x: e.x - 22, y: e.y + 8, v: 0, dbl: 1 }, { k: 'c', x: e.x + 22, y: e.y + 8, v: 0, dbl: 1 });
    for (const o of S.ep) o.dead = 1; G.shake = 16 * G.d; Sfx.boom(); setTimeout(() => Sfx.perfect(), 300); unlock('szilard');
  }

  /* ---------- fegyverek ---------- */
  const SND = {
    sugar: () => Sfx.noise(.12, .035, 3200), rainbird: () => Sfx.blip(2300, .018, 'square', .014), kanna: () => Sfx.blip(420, .18, 'triangle', .035, 1.8),
    gejzirW: () => Sfx.blip(260, .08, 'sine', .03, 1.4), gejzir: () => { Sfx.noise(.38, .16, 650); Sfx.blip(170, .32, 'sine', .07, 2.4); }, jeg: () => Sfx.blip(1750, .07, 'triangle', .035, .5),
    heli: () => Sfx.blip(72, .06, 'sawtooth', .02, .8), cso: () => Sfx.blip(1200 + Math.random() * 400, .03, 'sine', .02, .6), zivatar: () => { Sfx.noise(.18, .22, 2400); Sfx.blip(70, .3, 'sawtooth', .07, .5); },
    vizagyu: () => { Sfx.noise(.12, .14, 900); Sfx.blip(140, .14, 'square', .05, .5); }, tuzolto: () => Sfx.noise(.28, .15, 1500)
  };
  let sndT = {};
  const snd = (k, gap = .08) => { if ((S.t - (sndT[k] || -9)) < gap) return; sndT[k] = S.t; SND[k](); };
  function ready(k, base, dt) { S.wt[k] = (S.wt[k] || 0) - dt; if (S.wt[k] > 0) return false; S.wt[k] = Math.max(0, S.wt[k] + base * S.st.cd); return true; }
  const puddleR = () => { const L = lv('pocsolya'), E = lv('gyogyforras'); return (E ? 121 : L ? 52 + L * 9 : 0) * S.st.area * (S.dry > 0 ? .62 : 1); };
  function weapons(G, dt) {
    const P = S.P, ar = S.st.area, du = S.st.dur, ex = S.st.extra; let L;
    // vízpisztoly / porszóró / vízágyú
    for (const k of ['pisztoly', 'por']) if ((L = lv(k)) && ready(k, L >= 5 ? .5 : L >= 3 ? .68 : .72, dt)) {
      const e = nearest(Math.max(V.hw, V.hh) * .95);
      if (!e) S.wt[k] = .12;
      else { const a0 = Math.atan2(e.y - P.y, e.x - P.x), n = [1, 2, 2, 3, 3][L - 1] + ex;
        for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * .15; S.pr.push({ x: P.x, y: P.y - 4, vx: Math.cos(a) * 430, vy: Math.sin(a) * 430, r: 6, dmg: 7 + L * 2, pierce: [1, 1, 2, 2, 3][L - 1], life: 1.1, hit: [], src: k, sand: k === 'por' }); }
        k === 'por' ? Sfx.noise(.07, .07, 1400) : Sfx.shoot(); }
    }
    if (lv('vizagyu') && ready('vizagyu', .62, dt)) { const e = nearest(Math.max(V.hw, V.hh) * .95);
      if (!e) S.wt.vizagyu = .12; else { const a0 = Math.atan2(e.y - P.y, e.x - P.x), n = 2 + ex; for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * .2;
        S.pr.push({ x: P.x, y: P.y - 4, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, r: 14, dmg: 46, pierce: 99, life: 1.3, hit: [], src: 'vizagyu', big: 1, kb: 1.1 }); } snd('vizagyu'); } }
    // szórófej / körforgó esőztető
    if ((L = lv('szoro'))) {
      S.orb += dt * 2.8; const n = L + 1, R = (56 + L * 4) * ar;
      for (let i = 0; i < n; i++) { const a = S.orb + i / n * TAU, ox = P.x + Math.cos(a) * R, oy = P.y + Math.sin(a) * R;
        near(ox, oy, 9, e => { if (S.t < e.oT) return; e.oT = S.t + .5; hurt(G, e, 5 + L * 2, Math.cos(a) * 150, Math.sin(a) * 150, 'szoro'); }); }
    }
    if (lv('korforgo')) { S.orb += dt * 2.8;
      for (const [R, s] of [[70 * ar, 1], [124 * ar, -1]]) for (let i = 0; i < 6; i++) { const a = s * S.orb * (s > 0 ? 1 : .8) + i / 6 * TAU, ox = P.x + Math.cos(a) * R, oy = P.y + Math.sin(a) * R;
        near(ox, oy, 12, e => { if (S.t < e.oT) return; e.oT = S.t + .4; hurt(G, e, 22, Math.cos(a) * 200, Math.sin(a) * 200, 'korforgo'); }); } }
    // slagostor / tűzoltócső
    if ((L = lv('ostor')) && ready('ostor', [1.3, 1.3, 1.2, 1.1, .9][L - 1], dt)) {
      const len = [110, 125, 125, 145, 170][L - 1] * ar, hw = 26 * ar;
      for (const dir of L >= 3 ? [P.face, -P.face] : [P.face]) { S.slashes.push({ x: P.x, y: P.y, dir, len, l: .22 });
        for (const e of S.en) { if (e.under) continue; const dx = (e.x - P.x) * dir, dy = e.y - P.y; if (dx > -e.r && dx < len + e.r && Math.abs(dy) < hw + e.r) hurt(G, e, 9 + L * 4, dir * 170, 0, 'ostor'); } }
      Sfx.blip(180, .12, 'sawtooth', .04, 2.5);
    }
    if (lv('tuzolto') && ready('tuzolto', .85, dt)) { const R = 185 * ar; S.rings.push({ x: P.x, y: P.y, R, l: 1, w: 1 });
      near(P.x, P.y, R, (e, dx, dy) => { const d = Math.hypot(dx, dy) || 1; hurt(G, e, 40, dx / d * 260, dy / d * 260, 'tuzolto'); }); snd('tuzolto'); }
    // vízibomba / bombazápor
    if ((L = lv('bomba')) && ready('bomba', 2.6, dt)) {
      for (let i = 0, n = [1, 1, 2, 2, 3][L - 1] + ex; i < n; i++) { const e = randEnemy(330); if (!e) { if (!i) S.wt.bomba = .3; break; }
        S.bombs.push({ x0: P.x, y0: P.y, tx: e.x + rnd(-10, 10), ty: e.y + rnd(-10, 10), t: -i * .12, R: (50 + L * 7) * ar, dmg: 12 + L * 5, src: 'bomba' }); }
    }
    if (lv('bombazapor') && ready('bombazapor', 1.8, dt)) {
      for (let i = 0, n = 4 + ex; i < n; i++) { const e = randEnemy(360); if (!e) { if (!i) S.wt.bombazapor = .3; break; }
        S.bombs.push({ x0: P.x, y0: P.y, tx: e.x + rnd(-10, 10), ty: e.y + rnd(-10, 10), t: -i * .1, R: 95 * ar, dmg: 42, chain: 1, src: 'bombazapor' }); }
    }
    // esőfelhő / zivatar
    if ((L = lv('felho')) && ready('felho', 4.2, dt)) {
      for (let i = 0, n = L >= 4 ? 2 : 1; i < n; i++) { const e = randEnemy(300), a = Math.random() * TAU;
        S.clouds.push({ x: e ? e.x : P.x + Math.cos(a) * 90, y: e ? e.y : P.y + Math.sin(a) * 90, R: (58 + L * 6) * ar, life: [2.5, 3, 3.5, 3.5, 4.5][L - 1] * du, l0: 0, tk: 0, dmg: 3 + L * 1.6, src: 'felho' }); }
    }
    if (lv('zivatar') && ready('zivatar', 3.6, dt)) {
      for (let i = 0; i < 2; i++) { const e = randEnemy(300), a = Math.random() * TAU;
        S.clouds.push({ x: e ? e.x : P.x + Math.cos(a) * 90, y: e ? e.y : P.y + Math.sin(a) * 90, R: 110 * ar, life: 6 * du, l0: 0, tk: 0, dmg: 10, src: 'zivatar', storm: 1, bt: rnd(0, .5) }); }
    }
    // pocsolya / gyógyforrás
    if ((L = lv('pocsolya') || lv('gyogyforras')) && ready('pocsolya', .45, dt)) { const E = lv('gyogyforras');
      near(P.x, P.y, puddleR(), (e, dx, dy) => { const d = Math.hypot(dx, dy) || 1; hurt(G, e, E ? 13 : 2 + L * 1.3, dx / d * 40, dy / d * 40, E ? 'gyogyforras' : 'pocsolya'); }); }
    if (lv('gyogyforras')) P.hp = Math.min(P.mhp, P.hp + 2.5 * dt);
    // nagynyomású sugár / hidromonitor
    if (((L = lv('sugar')) || lv('hidromonitor')) && ready('sugar', .2, dt)) { const E = lv('hidromonitor'), R = (E ? 340 : 240 + L * 14) * ar, n = E ? 3 : L >= 3 ? 2 : 1, dm = E ? 17 : 2.5 + L * 1.6, all = E || L >= 5, src = E ? 'hidromonitor' : 'sugar';
      const tg = nearestN(R, n); S.beams = [];
      for (const e of tg) { const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, x2 = all ? P.x + ux * R : e.x, y2 = all ? P.y + uy * R : e.y;
        S.beams.push({ x2, y2, w: E ? 1 : 0 });
        if (all) for (const o of S.en) { if (o.dead || o.under) continue; const px = o.x - P.x, py = o.y - P.y, t = px * ux + py * uy; if (t < 0 || t > R) continue; if (Math.abs(px * uy - py * ux) < o.r + (E ? 10 : 5)) hurt(G, o, dm, ux * 30, uy * 30, src); }
        else hurt(G, e, dm, ux * 20, uy * 20, src); }
      if (!tg.length) S.wt.sugar = .1; else snd('sugar', .3); }
    // rain bird / öntözőhíd
    if ((L = lv('rainbird'))) { S.rbBase += dt * .45; const sw = [1.6, 2.2, 2.6, 3.4, 4.6][L - 1];
      if (ready('rainbird', .1, dt)) { S.rbA += .16 * S.rbDir; if (Math.abs(S.rbA) > sw / 2) { S.rbDir *= -1; S.rbA = clamp(S.rbA, -sw / 2, sw / 2); }
        const a = S.rbBase + S.rbA, R = (120 + L * 12) * ar, ca = Math.cos(a), sa = Math.sin(a); S.rbJet = a;
        near(P.x, P.y, R, (e, dx, dy) => { if (S.t < e.rbT) return; const t = dx * ca + dy * sa; if (t < 0) return; if (Math.abs(dx * sa - dy * ca) < e.r + 12 + t * .08) { e.rbT = S.t + .3; hurt(G, e, 4 + L * 2.2, ca * 90, sa * 90, 'rainbird'); } });
        if ((S.rbN = (S.rbN || 0) + 1) % 2 === 0) snd('rainbird', .05); } }
    if (lv('ontozohid')) { S.rbA += dt * 1.5; S.rbJet = S.rbA; const R = 250 * ar;
      if (ready('ontozohid', .1, dt)) { const ca = Math.cos(S.rbA), sa = Math.sin(S.rbA);
        near(P.x, P.y, R, (e, dx, dy) => { if (S.t < e.rbT) return; if (Math.abs(dx * sa - dy * ca) < e.r + 18) { e.rbT = S.t + .3; const s = Math.sign(dx * ca + dy * sa) || 1; hurt(G, e, 18, -sa * 140 * s, ca * 140 * s, 'ontozohid'); } }); } }
    // locsolókanna / kannavihar
    { const E = lv('kannavihar'); L = lv('kanna');
      if ((L || E) && ready('kanna', E ? 1.25 : 1.6, dt)) { const e = nearest(320), a0 = e ? Math.atan2(e.y - P.y, e.x - P.x) : (P.face > 0 ? 0 : Math.PI), n = E ? 6 : (L >= 5 ? 3 : L >= 3 ? 2 : 1) + ex;
        for (let i = 0; i < n; i++) { const a = E ? a0 + i / n * TAU : a0 + (i - (n - 1) / 2) * .5, sp = E ? 470 : 340 + L * 22; S.cans.push({ x: P.x, y: P.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ret: 0, hit: new Set(), rot: 0, dmg: E ? 30 : 7 + L * 3, src: E ? 'kannavihar' : 'kanna', big: E }); }
        snd('kanna'); } }
    for (const c of S.cans) { c.rot += dt * 14;
      if (!c.ret) { const s = Math.hypot(c.vx, c.vy), ns = s - 620 * dt; if (ns <= 0) { c.ret = 1; c.hit.clear(); c.vx = c.vy = 0; } else { c.vx *= ns / s; c.vy *= ns / s; } }
      else { const dx = P.x - c.x, dy = P.y - c.y, d = Math.hypot(dx, dy) || 1, s = Math.min(560, Math.hypot(c.vx, c.vy) + 900 * dt); c.vx = dx / d * s; c.vy = dy / d * s; if (d < 18) { c.dead = 1; continue; } }
      c.x += c.vx * dt; c.y += c.vy * dt;
      near(c.x, c.y, c.big ? 15 : 11, e => { if (c.hit.has(e.id)) return; c.hit.add(e.id); hurt(G, e, c.dmg, c.vx * .2, c.vy * .2, c.src); }); }
    // gejzír / gejzírmező
    { const E = lv('gejzirmezo'); L = lv('gejzir');
      if ((L || E) && ready('gejzir', E ? 1.1 : [2.4, 2.3, 2.1, 2, 1.6][L - 1], dt)) { const n = E ? 5 : [1, 2, 2, 3, 3][L - 1]; let any = 0;
        for (let i = 0; i < n; i++) { const e = randEnemy(360); if (!e) break; any = 1; S.geys.push({ x: e.x, y: e.y, t: -.4, R: (E ? 62 : 34 + L * 5) * ar, dmg: E ? 48 : 13 + L * 4.5, life: (E ? 1.6 : .55) * du, tk: 0, src: E ? 'gejzirmezo' : 'gejzir', E }); }
        if (any) snd('gejzirW', .2); else S.wt.gejzir = .3; } }
    for (const q of S.geys) { q.t += dt; if (q.t < 0) continue; if (q.t >= q.life) { q.dead = 1; continue; }
      if ((q.tk -= dt) <= 0) { const first = q.tk < -50 || q.t < dt * 1.5; q.tk = q.E ? .5 : 99;
        near(q.x, q.y, q.R, e => { hurt(G, e, q.dmg * (first ? 1 : .5), 0, 0, q.src); if (!e.T.boss) e.air = Math.max(e.air, .55); else e.slow = .8; });
        if (first) { snd('gejzir', .15); part(q.x, q.y, 10, '150,215,255', 160, .5); } } }
    // jégkocka-szóró / jégeső
    if ((L = lv('jeg')) && ready('jeg', 1.5, dt)) { const e = nearest(340);
      if (!e) S.wt.jeg = .15; else { const a0 = Math.atan2(e.y - P.y, e.x - P.x), n = [3, 4, 4, 5, 5][L - 1] + ex, fz = [.7, .7, 1, 1, 1.3][L - 1] * du;
        for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * .19; S.pr.push({ x: P.x, y: P.y - 4, vx: Math.cos(a) * 360, vy: Math.sin(a) * 360, r: 6, dmg: 4 + L * 1.8, pierce: 1, life: .9, hit: [], src: 'jeg', ice: fz }); }
        snd('jeg'); } }
    if (lv('jegeso') && ready('jegeso', .8, dt)) { for (let i = 0; i < 10; i++) { const e = randEnemy(400); if (!e) break; S.hail.push({ x: e.x + rnd(-8, 8), y: e.y + rnd(-8, 8), t: .35 }); } snd('jeg', .1); }
    for (const h of S.hail) { if ((h.t -= dt) > 0) continue; h.dead = 1; near(h.x, h.y, 22, e => { hurt(G, e, 24, 0, 0, 'jegeso'); if (e.T.boss) e.slow = 1.5; else e.freeze = Math.max(e.freeze, 1.4 * du); }); part(h.x, h.y, 4, '200,240,255', 90, .3); }
    // Ka-26 helikopter / légiflotta
    { const E = lv('legiflotta'); L = lv('heli');
      if (L || E) { const n = E ? 4 : L >= 4 ? 2 : 1; S.heliA += dt * .9; while (S.heli.length < n) S.heli.push({ x: P.x, y: P.y - 40 });
        S.heli.length = n; S.heli.forEach((h, i) => { const a = S.heliA + i / n * TAU, R = E ? 88 : 58, tx = P.x + Math.cos(a) * R, ty = P.y + Math.sin(a) * R * .7 - 10, k = Math.min(1, dt * 3); h.x += (tx - h.x) * k; h.y += (ty - h.y) * k; });
        if (ready('heli', .3, dt)) { const R = (E ? 64 : 24 + L * 6) * ar, dm = E ? 13 : 2.5 + L * 1.4; for (const h of S.heli) near(h.x, h.y + 8, R, e => { hurt(G, e, dm, 0, 0, E ? 'legiflotta' : 'heli'); e.slow = Math.max(e.slow, .35); }); snd('heli', .35); } }
      else S.heli.length = 0; }
    // csepegtető cső / öntözőcsatorna
    { const E = lv('csatorna'); L = lv('cso');
      if (L || E) { const life = (E ? 6 : 2.2 + L * .35) * du, mx = E ? 60 : 40, last = S.trail[S.trail.length - 1];
        if (!last || Math.hypot(P.x - last.x, P.y - last.y) > 14) { S.trail.push({ x: P.x, y: P.y + 10, l: life }); if (S.trail.length > mx) S.trail.shift(); }
        if (ready('cso', .35, dt)) { const R = (E ? 24 : 11 + L * 1.6) * ar, dm = E ? 9 : 1.6 + L, src = E ? 'csatorna' : 'cso';
          for (const p of S.trail) near(p.x, p.y, R, e => { if (S.t < e.csT) return; e.csT = S.t + .3; hurt(G, e, dm, 0, 0, src); if (E) e.slow = Math.max(e.slow, .5); });
          if (S.trail.length) snd('cso', .5); } }
      for (const p of S.trail) p.l -= dt; while (S.trail.length && S.trail[0].l <= 0) S.trail.shift(); }

    for (const p of S.pr) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) { p.dead = 1; continue; }
      near(p.x, p.y, p.r, e => { if (p.dead || p.hit.includes(e.id)) return; p.hit.push(e.id); hurt(G, e, p.dmg, p.vx * .25 * (p.kb || 1), p.vy * .25 * (p.kb || 1), p.src);
        if (p.ice) { if (e.T.boss) e.slow = Math.max(e.slow, p.ice * 1.5); else e.freeze = Math.max(e.freeze, p.ice); }
        if (--p.pierce <= 0) p.dead = 1; }); }
    for (const b of S.bombs) { b.t += dt; if (b.t < .55) continue; b.dead = 1; S.rings.push({ x: b.tx, y: b.ty, R: b.R, l: 1 });
      near(b.tx, b.ty, b.R, (e, dx, dy) => { const d = Math.hypot(dx, dy) || 1; hurt(G, e, b.dmg, dx / d * 220, dy / d * 220, b.src); });
      part(b.tx, b.ty, 12, '150,215,255', 220, .5);
      if (b.chain) for (let i = 0; i < 3; i++) { const a = Math.random() * TAU; S.bombs.push({ x0: b.tx, y0: b.ty, tx: b.tx + Math.cos(a) * 60, ty: b.ty + Math.sin(a) * 60, t: .25 + i * .05, R: b.R * .6, dmg: b.dmg * .5, src: b.src }); }
      Sfx.splash(); }
    for (const c of S.clouds) { c.life -= dt; c.l0 += dt; c.tk -= dt; if (c.life <= 0) { c.dead = 1; continue; } if (c.tk <= 0) { c.tk = .35; near(c.x, c.y, c.R, e => { e.slow = .6; hurt(G, e, c.dmg, 0, 0, c.src); }); }
      if (c.storm && (c.bt -= dt) <= 0) { c.bt = .55; let tg = null, bd = (c.R * 1.5) ** 2; near(c.x, c.y, c.R * 1.5, (e, dx, dy) => { const d = dx * dx + dy * dy; if (d < bd) { bd = d; tg = e; } });
        if (tg) { hurt(G, tg, 45, 0, 0, 'zivatar'); S.bolts.push({ x1: c.x + rnd(-20, 20), y1: c.y - c.R * 1.05, x2: tg.x, y2: tg.y, l: .2, s: Math.random() * 99 }); part(tg.x, tg.y, 6, '255,250,200', 140, .3); snd('zivatar', .25); } } }
  }
  function collect(G, q) {
    const P = S.P;
    if (q.k === 'x') { P.xp += q.v * S.st.xp * (S.zapor > 0 ? 1.1 : 1); while (P.xp >= P.need) { P.xp -= P.need; P.lvl++; P.need = Math.floor(4 + P.lvl * 3.5 + P.lvl * P.lvl * .45); S.pending++; }
      if (S.t - S.gsT > .05) { S.gsT = S.t; Sfx.blip(900 + Math.random() * 300, .04, 'sine', .03); } }
    else if (q.k === 'h') { P.hp = Math.min(P.mhp, P.hp + 25); G.float(G.W / 2, G.H / 2 - 40 * G.d, '+25 ❤'); Sfx.coin(); }
    else if (q.k === 'm') { for (const o of S.gems) o.pull = 1; Sfx.perfect(); }
    else { for (let i = 0, n = q.dbl ? 2 : 1; i < n; i++) { const ev = evoAvail(); if (ev) S.evoQ.push(ev); else S.pending++; }
      P.hp = Math.min(P.mhp, P.hp + 30); G.score += q.dbl ? 500 : 250; S.dirty = 1; G.float(G.W / 2, G.H / 2 - 40 * G.d, q.dbl ? 'DUPLA KINCS! +500' : 'KINCS! +250'); }
  }
  function evoAvail() { for (const r of EVOR) if (lv(r[0]) >= MAXLV && lv(r[1]) >= 1 && !S.up[r[2]] && !S.evoQ.some(q => q[2] === r[2])) return r; return null; }

  /* ---------- karakterek feloldása ---------- */
  function unlock(id) { if (store.get('aszaly_ch_' + id) > 0) return; store.set('aszaly_ch_' + id, 1); const c = CH.find(c => c.id === id); S.note = { t: 'ÚJ KARAKTER: ' + c.n.toUpperCase(), l: 3.5 }; Sfx.perfect(); }
  function checkUnlocks(G) { if (G.score >= 5000) unlock('zero'); if (S.t >= 600) unlock('kati'); if (S.kingK >= 3) unlock('pista'); if (S.evoN > 0) unlock('eso'); }

  /* ---------- szintlépés ---------- */
  const nW = () => Object.keys(S.up).filter(isW).length, nP = () => Object.keys(S.up).filter(k => !isW(k)).length;
  function offer() {
    const av = Object.keys(UP).filter(k => { const u = UP[k], c = lv(k); if (u.sp || u.evo || c >= mxl(k) || S.evd[k]) return false; if (u.hid && !c) return false;
      if (!c && (isW(k) ? nW() >= MAXW : nP() >= MAXP)) return false; if (k === 'pisztoly' && S.up.por) return false; return true; });
    for (let i = av.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[av[i], av[j]] = [av[j], av[i]]; }
    const n = lv('lohere') >= 5 ? 4 : 3, o = av.slice(0, n); for (const k of ['gyogy', 'pont']) if (o.length < 3) o.push(k); return o;
  }
  function openChoice() { S.choose = { o: offer(), t: 0 }; joy = null; Sfx.perfect(); }
  function openEvo(r) { S.choose = { o: [r[2]], t: 0, evo: r }; joy = null; S.flash = .6; Sfx.perfect(); setTimeout(() => Sfx.blip(1568, .3, 'triangle', .07, 1.5), 260); }
  function pick(G, i) {
    const c = S.choose; if (!c || c.t < .35 || !c.o[i]) return; const k = c.o[i], P = S.P;
    if (c.evo) { const [from] = c.evo; delete S.up[from]; S.up[k] = MAXLV; S.evd[from] = 1; S.evoN++; stats(); unlock('eso'); S.choose = null; P.inv = Math.max(P.inv, .9); Sfx.boom(); return; }
    if (k === 'gyogy') P.hp = Math.min(P.mhp, P.hp + 40); else if (k === 'pont') { G.score += 500; S.dirty = 1; }
    else { S.up[k] = lv(k) + 1; stats(); if (k === 'vitamin') P.hp = Math.min(P.mhp, P.hp + 20); }
    S.choose = null; P.inv = Math.max(P.inv, .7); Sfx.coin();
  }
  function reroll() { const c = S.choose; if (!c || c.evo || c.t < .35 || S.rr <= 0) return; S.rr--; c.o = offer(); c.t = .2; Sfx.blip(700, .08, 'square', .05, 1.3); }
  function skip() { const c = S.choose; if (!c || c.evo || c.t < .35) return; S.choose = null; S.P.inv = Math.max(S.P.inv, .7); Sfx.blip(400, .08, 'triangle', .04, .7); }
  function cards(G) {
    const d = G.d, n = S.choose.o.length, w = Math.min(G.W - 28 * d, 380 * d), h = (S.choose.evo ? 112 : 82) * d, gap = 12 * d, y0 = (G.H - (n * h + (n - 1) * gap)) / 2 + (S.choose.evo ? 0 : -10 * d);
    return S.choose.o.map((k, i) => ({ k, x: (G.W - w) / 2, y: y0 + i * (h + gap), w, h }));
  }
  function cardBtns(G) { if (S.choose.evo) return []; const cs = cards(G), l = cs[cs.length - 1], d = G.d, w = (l.w - 12 * d) / 2, y = l.y + l.h + 14 * d, h = 40 * d;
    return [{ id: 'rr', x: l.x, y, w, h, t: 'ÚJRASORSOLÁS (' + S.rr + ')', off: S.rr <= 0 }, { id: 'skip', x: l.x + w + 12 * d, y, w, h, t: 'KIHAGYÁS' }]; }

  /* ---------- szünet ---------- */
  function togglePause() { if (!S || S.sel) return; S.paused = !S.paused; K.U = K.D = K.L = K.R = 0; joy = null; Sfx.blip(S.paused ? 500 : 700, .07, 'square', .04); }
  const pauseBtn = G => ({ x: G.W - 28 * G.d, y: 120 * G.d, r: 16 * G.d });
  function pauseBtns(G) { const d = G.d, w = Math.min(170 * d, (G.W - 40 * d) / 2), h = 46 * d, y = G.H - 76 * d; return [{ id: 'go', x: G.W / 2 - w - 6 * d, y, w, h, t: 'FOLYTATÁS' }, { id: 'end', x: G.W / 2 + 6 * d, y, w, h, t: 'BEFEJEZÉS' }]; }

  /* ---------- karakterválasztó ---------- */
  const selCols = G => G.W / G.d > 640 ? 3 : 2;
  function selCards(G) { const d = G.d, cols = selCols(G), rows = Math.ceil(CH.length / cols), gap = 10 * d, w = Math.min((G.W - 24 * d - (cols - 1) * gap) / cols, 220 * d), h = Math.min(160 * d, (G.H - 150 * d - (rows - 1) * gap) / rows);
    const x0 = (G.W - (cols * w + (cols - 1) * gap)) / 2, y0 = Math.max(100 * d, (G.H - (rows * h + (rows - 1) * gap)) / 2 + 20 * d);
    return CH.map((c, i) => ({ c, i, x: x0 + (i % cols) * (w + gap), y: y0 + Math.floor(i / cols) * (h + gap), w, h })); }
  function selPick(G, i) { const c = CH[i]; if (!c || S.sel.t < .25) return; S.sel.i = i; if (!chOpen(c)) { S.sel.shake = .35; Sfx.blip(150, .15, 'square', .05, .7); return; }
    S.ch = c.id; S.up = { [c.w]: 1 }; S.sel = null; stats(); S.P.hp = S.P.mhp; Sfx.coin(); S.started = 1; }

  /* ---------- statisztika a kör végén ---------- */
  function showStats() {
    const ov = document.querySelector('#pOver > div'), row = ov && ov.querySelector('.row'); if (!row) return; let el = document.getElementById('aszStat');
    if (!el) { el = document.createElement('div'); el.id = 'aszStat'; el.style.cssText = 'margin:.6rem auto .9rem;max-width:340px;font:600 .82rem Inter,sans-serif;color:#c9d6e6;text-align:left'; ov.insertBefore(el, row); }
    const c = CH.find(c => c.id === S.ch) || CH[0], tot = Object.values(S.dmgBy).reduce((a, b) => a + b, 0) || 1, list = Object.entries(S.dmgBy).sort((a, b) => b[1] - a[1]).slice(0, 8);
    el.innerHTML = `<div style="display:flex;justify-content:space-between;gap:.6rem;flex-wrap:wrap;margin-bottom:.5rem"><span>⏱ ${fmtT(S.t)}</span><span>💀 ${S.kills.toLocaleString('hu-HU')}</span><span>⭐ ${S.P.lvl}. szint</span><span>👤 ${c.n}</span></div>`
      + list.map(([k, v]) => `<div style="display:flex;align-items:center;gap:.5rem;margin:.18rem 0"><span style="flex:0 0 46%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${UP[k] ? UP[k].n : k}</span><span style="flex:1;height:.5rem;border-radius:.25rem;background:rgba(255,255,255,.08);overflow:hidden"><span style="display:block;height:100%;width:${Math.max(2, v / tot * 100).toFixed(1)}%;background:${UP[k] && UP[k].evo ? '#ffd23f' : '#3aa6f5'}"></span></span><span style="flex:0 0 3.6rem;text-align:right">${Math.round(v).toLocaleString('hu-HU')}</span></div>`).join('');
    el.hidden = false;
  }
  const hideStats = () => { const el = document.getElementById('aszStat'); if (el) el.hidden = true; };

  /* ---------- rajz: ikonok ---------- */
  const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  const rrp = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
  const ln = (g, a, b, c, d) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); };
  function heart(g, x, y, s) { g.beginPath(); g.moveTo(x, y + s * .9); g.bezierCurveTo(x - s * 1.4, y - s * .1, x - s * .7, y - s * 1.1, x, y - s * .35); g.bezierCurveTo(x + s * .7, y - s * 1.1, x + s * 1.4, y - s * .1, x, y + s * .9); g.fill(); }
  function drop(g, x, y, s) { g.beginPath(); g.moveTo(x, y - s * 1.3); g.bezierCurveTo(x + s * 1.1, y - s * .1, x + s * .95, y + s, x, y + s); g.bezierCurveTo(x - s * .95, y + s, x - s * 1.1, y - s * .1, x, y - s * 1.3); g.fill(); }
  function canShape(g, c1, c2) { g.fillStyle = c1; rrp(g, -7, -4, 11, 10, 2); g.strokeStyle = c1; g.lineWidth = 2.2; g.lineCap = 'round'; ln(g, 3, 0, 10, -6); g.beginPath(); g.arc(-1.5, -5, 4, Math.PI, 0); g.stroke(); g.fillStyle = c2; g.fillRect(-7, 1, 11, 2); }
  const IC = {
    pisztoly(g) { g.fillStyle = '#2f8fe0'; rrp(g, -9, -6, 15, 7, 2); g.fillRect(-7, 0, 5, 8); g.fillStyle = '#e8b656'; g.fillRect(6, -4.5, 4, 4); g.fillStyle = '#9fdcff'; circ(g, -3, -2.5, 2); },
    por(g) { canShape(g, '#8a6a3c', '#5a3f1e'); g.fillStyle = '#d8b98a'; for (const [x, y] of [[11, -8], [9, -10], [12, -11]]) circ(g, x, y, 1.3); },
    szoro(g) { g.fillStyle = '#e8b656'; g.fillRect(-2, 1, 4, 9); rrp(g, -6, -2, 12, 4, 2); g.fillStyle = '#6cc6ff'; for (const a of [-2.4, -1.57, -.74]) circ(g, Math.cos(a) * 9, -1 + Math.sin(a) * 9, 1.9); },
    ostor(g) { g.strokeStyle = '#2fa24a'; g.lineWidth = 3.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(-9, 7); g.bezierCurveTo(-9, -10, 6, 8, 9, -7); g.stroke(); g.fillStyle = '#e8b656'; circ(g, 9, -7, 2.6); },
    bomba(g) { g.fillStyle = '#1a6fb8'; g.fillRect(-1.5, -10.5, 3, 4); g.fillStyle = '#3aa6f5'; circ(g, 0, 1, 8); g.fillStyle = 'rgba(255,255,255,.7)'; circ(g, -3, -2, 2.2); },
    felho(g) { g.fillStyle = '#c9d3de'; circ(g, -4, -3, 5); circ(g, 3, -5, 6); circ(g, 7, -1, 4); g.fillRect(-8, -3, 16, 5); g.strokeStyle = '#6cc6ff'; g.lineWidth = 1.8; g.lineCap = 'round'; for (const i of [-5, 0, 5]) ln(g, i, 5, i - 2, 10); },
    pocsolya(g) { g.fillStyle = '#3aa6f5'; g.beginPath(); g.ellipse(0, 3, 10, 5.5, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(0, 3, 5, 2.4, 0, 0, TAU); g.stroke(); },
    sugar(g) { g.fillStyle = '#46525f'; rrp(g, -10, -3, 8, 6, 2); g.strokeStyle = '#8fd4ff'; g.lineWidth = 3; g.lineCap = 'round'; ln(g, -2, 0, 10, 0); g.strokeStyle = '#fff'; g.lineWidth = 1; ln(g, 0, 0, 10, 0); g.fillStyle = '#8fd4ff'; circ(g, 10, -3, 1.2); circ(g, 9, 3, 1.2); },
    rainbird(g) { g.fillStyle = '#46525f'; g.fillRect(-1.5, 2, 3, 8); g.fillStyle = '#2f9e4f'; rrp(g, -5, -2, 10, 5, 2); g.strokeStyle = 'rgba(108,198,255,.9)'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.arc(0, 0, 9, -2.6, -.5); g.stroke(); g.fillStyle = '#e8b656'; g.fillRect(3, -4, 5, 2); },
    kanna(g) { canShape(g, '#2f9e4f', '#1d6b33'); g.strokeStyle = '#6cc6ff'; g.lineWidth = 1.4; g.beginPath(); g.arc(0, 0, 11, .3, 1.4); g.stroke(); },
    gejzir(g) { g.fillStyle = '#7a5a30'; g.beginPath(); g.ellipse(0, 7, 10, 3, 0, 0, TAU); g.fill(); g.fillStyle = '#6cc6ff'; g.beginPath(); g.moveTo(-4, 7); g.quadraticCurveTo(-5, -4, -1, -9); g.quadraticCurveTo(0, -11, 1, -9); g.quadraticCurveTo(5, -4, 4, 7); g.fill(); g.fillStyle = '#fff'; circ(g, -1, -2, 1.3); },
    jeg(g) { g.fillStyle = '#bfe9ff'; for (const [x, y, a] of [[-5, 2, .3], [3, -3, -.4], [5, 5, .9]]) { g.save(); g.translate(x, y); g.rotate(a); rrp(g, -3.5, -3.5, 7, 7, 1.5); g.restore(); } g.fillStyle = '#fff'; circ(g, 2, -5, 1); },
    heli(g) { g.fillStyle = '#e8833a'; rrp(g, -7, -3, 12, 8, 3); g.fillStyle = '#fff'; g.fillRect(-7, 0, 12, 1.6); g.fillStyle = '#9fdcff'; rrp(g, 1, -2, 4, 4, 1.5); g.strokeStyle = '#46525f'; g.lineWidth = 1.6; ln(g, -11, -6, 9, -6); ln(g, -9, -8, 7, -8); ln(g, -1, -8, -1, -3); g.fillStyle = '#46525f'; g.fillRect(-6, 5, 1.5, 3); g.fillRect(2, 5, 1.5, 3); g.fillRect(-8, 7.5, 12, 1.4); },
    cso(g) { g.strokeStyle = '#2b2f36'; g.lineWidth = 3.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-10, -5); g.bezierCurveTo(-2, -8, 2, 6, 10, 2); g.stroke(); g.fillStyle = '#6cc6ff'; for (const [x, y] of [[-6, 0], [0, 4], [6, 7]]) drop(g, x, y, 1.8); },
    csizma(g) { g.fillStyle = '#ffd23f'; rrp(g, -5, -10, 7, 15, 2); rrp(g, -5, 1, 13, 7, 3); g.fillStyle = '#b8860b'; g.fillRect(-5, 7, 13, 1.8); },
    vitamin(g) { g.fillStyle = '#ff5a4d'; heart(g, 0, 0, 8.5); g.fillStyle = '#fff'; g.fillRect(-1.2, -4, 2.4, 8); g.fillRect(-4, -1.2, 8, 2.4); },
    magnes(g) { g.strokeStyle = '#ff5a4d'; g.lineWidth = 5; g.lineCap = 'butt'; g.beginPath(); g.moveTo(-6, 7); g.lineTo(-6, -1); g.arc(0, -1, 6, Math.PI, 0); g.lineTo(6, 7); g.stroke(); g.fillStyle = '#e6edf5'; g.fillRect(-8.5, 5, 5, 4); g.fillRect(3.5, 5, 5, 4); },
    nyomas(g) { g.fillStyle = '#e6edf5'; circ(g, 0, 0, 9); g.strokeStyle = '#46525f'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.stroke(); g.strokeStyle = '#ff5a4d'; g.lineCap = 'round'; ln(g, 0, 0, 5, -5); g.fillStyle = '#46525f'; circ(g, 0, 0, 1.8); },
    idozito(g) { g.fillStyle = '#0b1a2a'; circ(g, 0, 0, 9); g.strokeStyle = '#e8b656'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.stroke(); ln(g, 0, 0, 0, -6); ln(g, 0, 0, 4, 2); },
    fuvoka(g) { g.fillStyle = 'rgba(108,198,255,.85)'; g.beginPath(); g.moveTo(-4, 0); g.lineTo(10, -9); g.lineTo(10, 9); g.fill(); g.fillStyle = '#e8b656'; g.fillRect(-10, -2.5, 7, 5); },
    kesztyu(g) { g.fillStyle = '#3fa34d'; rrp(g, -6, -4, 11, 12, 3); for (let i = 0; i < 4; i++) rrp(g, -6 + i * 2.8, -10, 2.4, 8, 1.2); rrp(g, 4, -3, 5, 3, 1.5); g.fillStyle = '#e8b656'; g.fillRect(-7, 6, 13, 3); },
    gyujto(g) { g.fillStyle = '#5a6b7c'; rrp(g, -7, -4, 14, 13, 2); g.fillStyle = '#3aa6f5'; g.fillRect(-6, 1, 12, 7); g.fillStyle = '#46525f'; g.fillRect(-9, -6, 18, 2.5); g.fillStyle = '#6cc6ff'; drop(g, 0, -9, 2); },
    tartaly(g) { g.fillStyle = '#c9d3de'; rrp(g, -6, -9, 12, 18, 5); g.fillStyle = '#3aa6f5'; rrp(g, -6, -1, 12, 10, 4); g.fillStyle = '#46525f'; g.fillRect(-2, -11, 4, 3); g.fillStyle = '#fff'; g.fillRect(-1, 2, 2, 5); g.fillRect(-2.5, 3.5, 5, 2); },
    lohere(g) { g.fillStyle = '#3fbf5a'; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + .785; heart(g, Math.cos(a) * 4.5, Math.sin(a) * 4.5, 3.6); } g.strokeStyle = '#2a7d3a'; g.lineWidth = 1.8; ln(g, 0, 0, 4, 10); },
    hosszabbito(g) { g.fillStyle = '#e6edf5'; rrp(g, -9, -5, 12, 10, 2); g.fillStyle = '#46525f'; circ(g, -6, -1, 1.2); circ(g, -2, -1, 1.2); g.strokeStyle = '#ff7a1a'; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(3, 0); g.bezierCurveTo(9, 0, 6, 8, 10, 8); g.stroke(); },
    gyogy(g) { g.fillStyle = '#3aa6f5'; drop(g, 0, 1, 7.5); g.fillStyle = '#fff'; g.fillRect(-1.2, -2, 2.4, 8); g.fillRect(-4, .8, 8, 2.4); },
    pont(g) { g.fillStyle = '#ffd23f'; drop(g, 0, 1, 7.5); g.fillStyle = 'rgba(255,255,255,.75)'; circ(g, -2.5, 1.5, 1.8); }
  };
  function ico(g, k, x, y, s) { g.save(); g.translate(x, y); g.scale(s / 24, s / 24); const u = UP[k];
    if (u && u.evo) { g.fillStyle = 'rgba(255,210,63,.3)'; circ(g, 0, 0, 12); g.strokeStyle = '#ffd23f'; g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, 11.5, 0, TAU); g.stroke(); IC[u.from](g);
      g.fillStyle = '#ffd23f'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2 : 4.4; g.lineTo(8 + Math.cos(a) * r, -8 + Math.sin(a) * r); } g.fill(); }
    else IC[k](g); g.restore(); }

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
  function clod(x, s, eyes) { x.fillStyle = '#9c7a4c'; x.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + .2, r = s * (.85 + (i % 3) * .08); x.lineTo(Math.cos(a) * r, Math.sin(a) * r * .9); } x.closePath(); x.fill();
    x.fillStyle = '#b9965c'; x.beginPath(); x.ellipse(-s * .15, -s * .3, s * .5, s * .3, -.2, 0, TAU); x.fill();
    x.strokeStyle = '#4a3018'; x.lineWidth = .07; x.lineCap = 'round'; x.beginPath(); x.moveTo(-s * .7, -s * .1); x.lineTo(-s * .2, s * .05); x.lineTo(-s * .05, s * .5); x.moveTo(-s * .2, s * .05); x.lineTo(s * .4, -s * .25); x.lineTo(s * .75, -s * .05); x.moveTo(s * .4, -s * .25); x.lineTo(s * .3, -s * .75); x.stroke();
    if (eyes) { x.fillStyle = '#ff7a1a'; x.beginPath(); x.ellipse(-s * .32, -s * .32, s * .14, s * .09, .3, 0, TAU); x.ellipse(s * .32, -s * .32, s * .14, s * .09, -.3, 0, TAU); x.fill();
      x.strokeStyle = '#2a1808'; x.lineWidth = .08; ln(x, -s * .55, -s * .55, -s * .15, -s * .42); ln(x, s * .55, -s * .55, s * .15, -s * .42); x.beginPath(); x.arc(0, s * .25, s * .22, Math.PI + .5, -.5); x.stroke(); } }
  function szilardShape(x, converted) {
    // köpeny
    x.fillStyle = '#7d5f37'; x.beginPath(); x.moveTo(-.42, -.55); x.lineTo(.42, -.55); x.lineTo(.72, 1.05); for (let i = 0; i <= 8; i++) x.lineTo(.72 - i * .18, 1.05 + (i % 2 ? .12 : -.02)); x.lineTo(-.72, 1.05); x.closePath(); x.fill();
    x.fillStyle = '#9a7746'; x.beginPath(); x.moveTo(-.2, -.5); x.lineTo(.2, -.5); x.lineTo(.08, 1.05); x.lineTo(-.18, 1.05); x.fill();
    x.strokeStyle = '#5a4022'; x.lineWidth = .05; for (const [a, b, c, d] of [[-.4, .2, -.25, .7], [.35, 0, .5, .6], [-.1, .5, .05, .95]]) ln(x, a, b, c, d);
    // karok, kanna
    x.strokeStyle = '#b98b55'; x.lineWidth = .11; x.lineCap = 'round'; ln(x, -.38, -.4, -.66, .25); ln(x, .38, -.4, .62, .02);
    x.fillStyle = converted ? '#5a7d9a' : '#7a6a52'; rrp(x, .48, -.02, .5, .4, .08); x.strokeStyle = x.fillStyle; x.lineWidth = .08; ln(x, .95, .08, 1.3, -.22); x.beginPath(); x.arc(.73, -.02, .16, Math.PI, 0); x.stroke();
    if (!converted) { x.strokeStyle = '#6b4a22'; x.lineWidth = .04; for (const [a, b] of [[.6, -.45], [.75, -.52], [.88, -.4]]) { ln(x, a, -.02, a + .02, b); } x.fillStyle = '#8d5a2b'; for (const [a, b] of [[.62, -.45], [.77, -.52], [.9, -.4]]) { x.beginPath(); x.ellipse(a, b, .07, .04, .6, 0, TAU); x.fill(); } }
    // fej
    x.fillStyle = '#b98b55'; x.beginPath(); x.ellipse(0, -.82, .29, .34, 0, 0, TAU); x.fill(); x.fillStyle = '#8f6a3c'; x.beginPath(); x.ellipse(-.14, -.7, .07, .12, 0, 0, TAU); x.ellipse(.14, -.7, .07, .12, 0, 0, TAU); x.fill();
    x.strokeStyle = '#5a3f1e'; x.lineWidth = .035; x.beginPath(); x.moveTo(-.2, -1.02); x.lineTo(-.1, -.92); x.lineTo(-.16, -.84); x.moveTo(.22, -.6); x.lineTo(.12, -.55); x.moveTo(.05, -.98); x.lineTo(.12, -.88); x.stroke();
    x.fillStyle = converted ? '#7ef0a4' : '#ffd23f'; x.beginPath(); x.ellipse(-.11, -.85, .07, .05, .25, 0, TAU); x.ellipse(.11, -.85, .07, .05, -.25, 0, TAU); x.fill();
    x.strokeStyle = '#3a2410'; x.lineWidth = .05; x.beginPath(); if (converted) x.arc(0, -.68, .1, .3, Math.PI - .3); else { x.moveTo(-.14, -.62); x.lineTo(-.07, -.66); x.lineTo(0, -.61); x.lineTo(.07, -.66); x.lineTo(.14, -.62); } x.stroke();
    // szalmakalap
    x.fillStyle = '#c9a24f'; x.beginPath(); x.ellipse(0, -1.08, .68, .15, 0, 0, TAU); x.fill(); rrp(x, -.3, -1.42, .6, .36, .12); x.fillStyle = '#8b2f22'; x.fillRect(-.3, -1.17, .6, .07);
    x.strokeStyle = '#a07e34'; x.lineWidth = .03; for (let i = 0; i < 7; i++) ln(x, -.6 + i * .2, -1.05, -.66 + i * .2 + (i % 2) * .08, -.92);
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
      x.fillStyle = '#ff7a1a'; rrp(x, -.52, -.5, .34, .2, .05); rrp(x, .18, -.5, .34, .2, .05); x.fillStyle = '#ffe29a'; x.fillRect(-.42, -.45, .14, .1); x.fillRect(.28, -.45, .14, .1); x.fillStyle = '#5a3f1e'; x.fillRect(-.3, .0, .6, .12); },
    orveny(x) { x.lineCap = 'round'; for (let i = 0; i < 4; i++) { x.strokeStyle = ['#c9a46a', '#a8834f', '#e0c38f', '#8a6a3c'][i]; x.lineWidth = .16 - i * .02; x.beginPath(); for (let k = 0; k <= 26; k++) { const a = i * 1.57 + k * .24, r = .1 + k * .034; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.stroke(); }
      x.fillStyle = '#ffd23f'; circ(x, -.16, -.05, .07); circ(x, .16, -.05, .07); },
    denever(x) { x.fillStyle = '#6b4a2e'; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * .2, -.15); x.lineTo(s * 1.15, -.55); x.lineTo(s * 1.05, -.1); x.lineTo(s * .85, .05); x.lineTo(s * .7, -.08); x.lineTo(s * .5, .12); x.lineTo(s * .25, .15); x.fill(); }
      x.strokeStyle = '#3e2814'; x.lineWidth = .05; for (const s of [-1, 1]) { ln(x, s * .3, -.1, s * 1.05, -.5); ln(x, s * .7, -.3, s * .72, .02); }
      x.fillStyle = '#8a6440'; x.beginPath(); x.ellipse(0, .02, .3, .38, 0, 0, TAU); x.fill(); x.beginPath(); x.moveTo(-.22, -.25); x.lineTo(-.15, -.55); x.lineTo(-.05, -.3); x.moveTo(.22, -.25); x.lineTo(.15, -.55); x.lineTo(.05, -.3); x.fill();
      x.fillStyle = '#ff4d2a'; circ(x, -.1, -.08, .06); circ(x, .1, -.08, .06); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(-.07, .12); x.lineTo(-.04, .22); x.lineTo(-.01, .12); x.moveTo(.07, .12); x.lineTo(.04, .22); x.lineTo(.01, .12); x.fill(); },
    repedt: x => clod(x, 1, 1), rog: x => clod(x, .95, 1),
    fereg(x) { for (let i = 3; i >= 0; i--) { x.fillStyle = i % 2 ? '#b08a55' : '#c9a46a'; circ(x, Math.sin(i) * .12, .7 - i * .32 + .3, .55 - i * .04); }
      x.fillStyle = '#c9a46a'; circ(x, 0, -.55, .62); x.fillStyle = '#3a1a0a'; circ(x, 0, -.5, .4); x.fillStyle = '#f3e6c8';
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; x.beginPath(); x.moveTo(Math.cos(a) * .4, -.5 + Math.sin(a) * .4); x.lineTo(Math.cos(a + .2) * .2, -.5 + Math.sin(a + .2) * .2); x.lineTo(Math.cos(a + .3) * .4, -.5 + Math.sin(a + .3) * .4); x.fill(); }
      x.fillStyle = '#ffd23f'; circ(x, -.45, -.95, .08); circ(x, .45, -.95, .08); },
    szilard: x => szilardShape(x, 0)
  };
  /* a játszható karakterek (a régi drawPlayer mintájára) */
  const LOOK = {
    gergely: { shirt: '#2f8fe0', shirt2: '#1f6fb8', pants: '#22324d', hat: 'straw' },
    zero: { shirt: '#2a2f3a', shirt2: '#22d3ee', pants: '#1a1d24', hat: 'cap' },
    kati: { shirt: '#c8433a', shirt2: '#3fa34d', pants: '#3b3f6b', hat: 'scarf' },
    pista: { shirt: '#e8833a', shirt2: '#b9601f', pants: '#2c4a7a', hat: 'pump' },
    eso: { shirt: '#3b5bdb', shirt2: '#2b3fa8', pants: '#1f2a66', hat: 'hood' },
    szilard: { shirt: '#7d5f37', shirt2: '#5a4022', pants: '#4a3a24', hat: 'szilard' }
  };
  function drawHero(g, id, mov, walk, t) {
    const L = LOOK[id] || LOOK.gergely, b = mov ? Math.sin(walk) : 0, bob = mov ? Math.abs(Math.cos(walk)) * 1.5 : 0, big = id === 'pista' ? 1.12 : 1, thin = id === 'szilard' ? .82 : 1;
    if (L.hat === 'pump') { g.fillStyle = '#8c98a6'; rrp(g, -13, -8 - bob, 6, 15, 3); g.fillStyle = '#5a6672'; g.fillRect(-12, -11 - bob, 4, 3); }
    g.fillStyle = L.pants; g.fillRect(-6, 6, 5, 8 + b * 2.5); g.fillRect(1, 6, 5, 8 - b * 2.5);
    g.fillStyle = id === 'szilard' ? '#5a3f1e' : '#e8b656'; g.fillRect(-7, 13 + b * 2.5, 7, 3); g.fillRect(0, 13 - b * 2.5, 7, 3);
    g.translate(0, -bob);
    g.fillStyle = L.shirt; rrp(g, -8 * big * thin, -6, 16 * big * thin, 14, 4); g.fillStyle = L.shirt2; g.fillRect(-8 * big * thin, 3, 16 * big * thin, 2);
    if (id === 'kati') { g.fillStyle = '#3fa34d'; rrp(g, -6, -3, 12, 11, 2); g.fillStyle = '#ffd23f'; circ(g, 0, 2, 1.6); }
    else if (id === 'zero') { g.fillStyle = '#22d3ee'; g.fillRect(-1, -6, 2, 9); } else if (id === 'eso') { g.fillStyle = '#9fdcff'; circ(g, 0, -1, 1.6); circ(g, -4, 2, 1.2); circ(g, 4, 2, 1.2); }
    else if (id !== 'szilard') { g.fillStyle = '#ffe29a'; circ(g, -3, -1, 2); }
    if (id === 'szilard') { g.fillStyle = '#7a6a52'; rrp(g, 7, -2, 8, 6, 1.5); g.strokeStyle = '#7a6a52'; g.lineWidth = 1.6; ln(g, 14, 0, 19, -4); g.fillStyle = '#d8b98a'; for (let i = 0; i < 3; i++) circ(g, 19 + ((t * 30 + i * 4) % 10), -4 + ((t * 20 + i * 3) % 6), .9); }
    else { g.fillStyle = '#e8b656'; g.fillRect(8, -.5, 8, 3.2); g.fillStyle = '#8a5a1e'; g.fillRect(15, -1.5, 2, 5); }
    g.fillStyle = id === 'szilard' ? '#b98b55' : '#f1c9a0'; circ(g, 8, 1, 2.7); circ(g, 0, -12, 7);
    if (id === 'kati') { g.fillStyle = '#7a4a22'; circ(g, -6, -10, 3); rrp(g, -10, -10, 4, 9, 2); } if (id === 'pista') { g.fillStyle = '#5a3a1c'; rrp(g, 1, -9, 7, 2, 1); }
    g.fillStyle = id === 'szilard' ? '#7ef0a4' : '#1a0d05'; circ(g, 3.2, -11.5, 1.2);
    if (L.hat === 'straw') { g.fillStyle = '#d9ad4e'; g.beginPath(); g.ellipse(0, -15.5, 11.5, 3.3, 0, 0, TAU); g.fill(); g.fillStyle = '#edc970'; rrp(g, -6, -22.5, 12, 7.5, 3); g.fillStyle = '#b2382a'; g.fillRect(-6, -17.6, 12, 1.9); }
    else if (L.hat === 'cap') { g.fillStyle = '#22d3ee'; rrp(g, -7, -20, 13, 6, 3); g.fillRect(-12, -16, 7, 2.2); g.fillStyle = '#1a1d24'; g.fillRect(-7, -13.5, 14, 2.4); g.fillStyle = '#9fdcff'; rrp(g, 1, -14.5, 6, 3.6, 1.5); }
    else if (L.hat === 'scarf') { g.fillStyle = '#e5432a'; g.beginPath(); g.arc(0, -13, 7.6, Math.PI * 1.05, -.05); g.fill(); g.fillStyle = '#fff'; for (const [x, y] of [[-4, -17], [0, -19], [4, -17]]) circ(g, x, y, 1); }
    else if (L.hat === 'pump') { g.fillStyle = '#2c4a7a'; rrp(g, -7, -20, 14, 6, 3); g.fillRect(2, -16, 9, 2.2); }
    else if (L.hat === 'hood') { g.fillStyle = '#2b3fa8'; g.beginPath(); g.arc(0, -12, 8.6, Math.PI * 1.02, -.02); g.lineTo(6, -12); g.lineTo(-8, -9); g.fill(); g.fillStyle = '#d6dee8'; const cy = -27 + Math.sin(t * 2) * 1.5; circ(g, -4, cy, 4); circ(g, 2, cy - 2, 5); circ(g, 6, cy, 3.5); g.strokeStyle = '#6cc6ff'; g.lineWidth = 1.2; for (const i of [-3, 1, 5]) { const k = (t * 3 + i) % 1; ln(g, i, cy + 4 + k * 5, i - 1, cy + 6 + k * 5); } }
    else if (L.hat === 'szilard') { g.fillStyle = '#c9a24f'; g.beginPath(); g.ellipse(0, -15.5, 12, 3.2, 0, 0, TAU); g.fill(); rrp(g, -6, -22.5, 12, 7.5, 3); g.fillStyle = '#3fa34d'; g.fillRect(-6, -17.6, 12, 1.9); }
  }
  function build() {
    sprSc = V.sc; SPR = {};
    if (!VIG) { VIG = document.createElement('canvas'); VIG.width = VIG.height = 128; const v = VIG.getContext('2d'), vg = v.createRadialGradient(64, 64, 34, 64, 64, 92); vg.addColorStop(0, 'rgba(20,8,0,0)'); vg.addColorStop(1, 'rgba(20,8,0,.55)'); v.fillStyle = vg; v.fillRect(0, 0, 128, 128); }
    for (const k in ET) { const r = ET[k].r, sz = Math.ceil(r * 3.3 * V.sc), c = document.createElement('canvas'); c.width = c.height = sz; const x = c.getContext('2d'); x.translate(sz / 2, sz / 2); x.scale(r * V.sc, r * V.sc); DRAW[k](x);
      const w = document.createElement('canvas'); w.width = w.height = sz; const y = w.getContext('2d'); y.drawImage(c, 0, 0); y.globalCompositeOperation = 'source-atop'; y.fillStyle = 'rgba(255,255,255,.85)'; y.fillRect(0, 0, sz, sz); SPR[k] = { c, w, sz }; }
    // talaj: kiszáradt, repedezett föld (ismétlődő csempe)
    const T = 512, sz = Math.round(T * V.sc); TILE = document.createElement('canvas'); TILE.width = TILE.height = sz; const x = TILE.getContext('2d'); x.scale(sz / T, sz / T);
    let seed = 20261121; const rn = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const wrap = fn => { for (const ox of [-T, 0, T]) for (const oy of [-T, 0, T]) { x.save(); x.translate(ox, oy); fn(); x.restore(); } };
    x.fillStyle = '#9c7a4c'; x.fillRect(0, 0, T, T);
    for (let i = 0; i < 90; i++) { const px = rn() * T, py = rn() * T, r = 22 + rn() * 70, c = i % 3 ? 'rgba(122,92,54,.22)' : 'rgba(186,152,100,.22)'; wrap(() => { x.fillStyle = c; x.beginPath(); x.ellipse(px, py, r, r * .7, 0, 0, TAU); x.fill(); }); }
    for (let i = 0; i < 26; i++) { let px = rn() * T, py = rn() * T, a = rn() * TAU; const pts = [[px, py]]; for (let j = 0, n = 3 + Math.floor(rn() * 4); j < n; j++) { a += (rn() - .5) * 1.5; const l = 10 + rn() * 22; px += Math.cos(a) * l; py += Math.sin(a) * l; pts.push([px, py]); }
      wrap(() => { x.strokeStyle = 'rgba(64,42,20,.3)'; x.lineWidth = 1.3; x.lineJoin = 'round'; x.beginPath(); pts.forEach((p, j) => j ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.stroke(); }); }
    for (let i = 0; i < 46; i++) { const px = rn() * T, py = rn() * T, r = 1.5 + rn() * 3; wrap(() => { x.fillStyle = 'rgba(70,56,40,.55)'; x.beginPath(); x.ellipse(px, py, r, r * .7, 0, 0, TAU); x.fill(); x.fillStyle = 'rgba(210,190,150,.35)'; x.beginPath(); x.ellipse(px - r * .2, py - r * .2, r * .5, r * .3, 0, 0, TAU); x.fill(); }); }
    for (let i = 0; i < 40; i++) { const px = rn() * T, py = rn() * T, c = i % 3 ? '#b9a25a' : '#7f8c3c', a = [rn(), rn(), rn(), rn()]; wrap(() => { x.strokeStyle = c; x.lineWidth = 1.3; x.lineCap = 'round'; for (let j = 0; j < 4; j++) ln(x, px + (j - 1.5) * 1.6, py, px + (j - 1.5) * 4, py - 5 - a[j] * 5); }); }
  }
  /* karakterportrék a választóhoz (a zárolt titkos karakter fekete sziluett) */
  function portraits(d) { portD = d; PORT = {}; const sz = Math.round(80 * d);
    for (const c of CH) { const cv = document.createElement('canvas'); cv.width = cv.height = sz; const x = cv.getContext('2d'); x.translate(sz / 2, sz * .66); x.scale(sz / 50, sz / 50); drawHero(x, c.id, 0, 0, 0);
      const s = document.createElement('canvas'); s.width = s.height = sz; const y = s.getContext('2d'); y.drawImage(cv, 0, 0); y.globalCompositeOperation = 'source-atop'; y.fillStyle = '#07090d'; y.fillRect(0, 0, sz, sz); PORT[c.id] = { c: cv, s, sz }; } }

  function drawPlayer(g, G, t) {
    const P = S.P; g.save(); g.translate(G.W / 2, G.H / 2); g.scale(V.sc, V.sc);
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(0, 16, 11, 4, 0, 0, TAU); g.fill();
    if (P.inv > 0 && Math.sin(t * 40) > 0) g.globalAlpha = .45;
    g.scale(P.face, 1); drawHero(g, S.ch || 'gergely', P.mov, P.walk, t);
    g.restore();
  }
  function btn(g, G, b, gold) { const d = G.d; g.fillStyle = b.off ? 'rgba(40,46,58,.8)' : gold ? '#e8b656' : 'rgba(30,48,80,.95)'; rrp(g, b.x, b.y, b.w, b.h, 10 * d);
    g.strokeStyle = b.off ? 'rgba(255,255,255,.1)' : 'rgba(120,190,255,.45)'; g.lineWidth = 1.4 * d; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 10 * d); g.stroke();
    g.font = `800 ${12.5 * d}px Inter, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = b.off ? 'rgba(255,255,255,.35)' : gold ? '#1a1004' : '#e6f2ff'; g.fillText(b.t, b.x + b.w / 2, b.y + b.h / 2 + .5 * d, b.w - 10 * d); }
  const inR = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

  const me = {
    id: 'aszaly', name: 'ASZÁLYTÚLÉLŐ', lives: 0, quit: true, sponsor: 'A Zerosites támogatásával', overTitle: 'KISZÁRADTÁL',
    desc: 'Szikkadt Szilárd serege elözönlötte a kiszáradt kertet! A fegyvereid maguktól tüzelnek – te csak mozogj, gyűjtsd a vízcseppeket, és minden szintlépésnél válassz új fegyvert vagy fejlesztést. Meddig bírod?',
    how: 'WASD / NYILAK VAGY HÚZÁS = MOZGÁS · P / ESC = SZÜNET · 🏁 = BEFEJEZÉS',
    ranks: [[0, 'Szomjas palánta'], [1500, 'Kerti túlélő'], [6000, 'Aszályvadász'], [15000, 'Esőcsináló'], [40000, 'A Monszun Ura']],
    init(G) {
      S = { t: 0, P: { x: 0, y: 0, hp: 100, mhp: 100, inv: 0, face: 1, walk: 0, mov: 0, lvl: 1, xp: 0, need: 7 }, up: { pisztoly: 1 }, wt: {}, en: [], pr: [], gems: [], bombs: [], clouds: [], rings: [], slashes: [], pt: [], nums: [],
        eid: 0, sT: .6, minute: 0, bossN: 0, kills: 0, pending: 0, choose: null, orb: 0, sndT: -1, gsT: -1, hudT: 0, dirty: 0, banner: null,
        ch: 'gergely', sel: { i: 0, t: 0, shake: 0 }, started: 0, over: 0, paused: 0, dmgBy: {}, evd: {}, evoQ: [], evoN: 0, rr: 3, kingK: 0,
        ep: [], cans: [], geys: [], hail: [], heli: [], trail: [], bolts: [], beams: [], heliA: 0, rbA: 0, rbDir: 1, rbBase: 0, rbJet: 0,
        heat: 0, zapor: 0, rainT: 0, green: 0, dry: 0, flash: 0, batT: 30, szE: null, szN: 0, szNext: 15, szKill: 0, szRage: 0, taunt: null, say: null, melt: null, note: null, unT: 0 };
      sndT = {}; stats(); view(G); joy = null; this.overTitle = 'KISZÁRADTÁL'; hideStats();
      const last = Math.round(store.get('aszaly_last', 0)); if (CH[last] && chOpen(CH[last])) S.sel.i = last;
    },
    down(G, x, y, e) {
      if (!e || e === true) return;
      if (S.sel) { const c = selCards(G).find(c => inR(c, x, y)); if (c) selPick(G, c.i); return; }
      if (S.paused) { const b = pauseBtns(G).find(b => inR(b, x, y)); if (b) { if (b.id === 'go') togglePause(); else { S.paused = 0; G.end(); } } return; }
      if (S.choose) { const c = cards(G).findIndex(c => inR(c, x, y)); if (c >= 0) return pick(G, c); const b = cardBtns(G).find(b => inR(b, x, y)); if (b) b.id === 'rr' ? reroll() : skip(); return; }
      const pb = pauseBtn(G); if (Math.hypot(x - pb.x, y - pb.y) < pb.r * 1.4) return togglePause();
      try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
      joy = { id: e.pointerId, ox: x, oy: y, x, y, touch: e.pointerType !== 'mouse' };
    },
    move(G, x, y, pressed, e) { if (joy && pressed && (!e || e.pointerId === joy.id)) { joy.x = x; joy.y = y; } },
    up(G, x, y, e) { if (joy && (!e || e === true || e.pointerId === joy.id)) joy = null; },
    _S: () => S, /* tesztekhez */
    leave() { joy = null; K.U = K.D = K.L = K.R = 0; hideStats(); },
    update(G, dt) {
      view(G); const P = S.P;
      if (S.sel) { S.sel.t += dt; S.sel.shake = Math.max(0, S.sel.shake - dt); return; }
      if (S.paused) return;
      if (S.choose) { S.choose.t += dt; S.flash = Math.max(0, S.flash - dt); return; }
      if (S.evoQ.length) return openEvo(S.evoQ.shift());
      if (S.pending > 0) { S.pending--; return openChoice(); }
      S.t += dt; const st = S.st;
      if (S.t < .02) store.set('aszaly_last', CH.findIndex(c => c.id === S.ch));
      let mx = (K.R ? 1 : 0) - (K.L ? 1 : 0), my = (K.D ? 1 : 0) - (K.U ? 1 : 0);
      if (mx && my) { mx *= .7071; my *= .7071; }
      else if (!mx && !my && joy) { const dx = joy.x - joy.ox, dy = joy.y - joy.oy, m = Math.hypot(dx, dy), dz = 8 * G.d, mr = 46 * G.d;
        if (m > dz) { const k = Math.min(1, (m - dz) / (mr - dz)) / m; mx = dx * k; my = dy * k; if (m > mr) { joy.ox = joy.x - dx / m * mr; joy.oy = joy.y - dy / m * mr; } } }
      const mm = Math.hypot(mx, my);
      if (mm > .05) { P.x += mx * st.speed * dt; P.y += my * st.speed * dt; if (Math.abs(mx) > .15) P.face = mx > 0 ? 1 : -1; P.walk += dt * mm * 11; P.mov = 1; } else P.mov = 0;
      P.inv = Math.max(0, P.inv - dt); if (st.regen) P.hp = Math.min(P.mhp, P.hp + st.regen * dt);
      for (const k of ['heat', 'zapor', 'rainT', 'green', 'dry', 'flash']) if (S[k] > 0) S[k] = Math.max(0, S[k] - dt);
      spawner(G, dt); gridBuild(); enemies(G, dt); if (!G.running) return; weapons(G, dt);
      for (const q of S.gems) { const dx = P.x - q.x, dy = P.y - q.y, d2 = dx * dx + dy * dy; if (!q.pull && d2 < st.magnet * st.magnet) q.pull = 1;
        if (q.pull) { q.sp = (q.sp || 140) + 900 * dt; const d = Math.sqrt(d2) || 1; q.x += dx / d * q.sp * dt; q.y += dy / d * q.sp * dt; if (d < 16) { q.dead = 1; collect(G, q); } } }
      for (const p of S.pt) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .92; p.vy *= .92; p.l -= dt; }
      for (const n of S.nums) { n.y -= 26 * dt; n.l -= dt; } for (const r of S.rings) r.l -= dt * 3; for (const s of S.slashes) s.l -= dt; for (const b of S.bolts) b.l -= dt;
      if (S.banner && (S.banner.l -= dt) <= 0) S.banner = null;
      for (const k of ['taunt', 'say', 'melt', 'note']) if (S[k] && (S[k].l -= dt) <= 0) { if (k === 'taunt') { const x = S.P.x + V.hw - 46, y = S.P.y - 20; part(x, y, 22, '190,160,110', 160, .7); Sfx.noise(.4, .12, 500); } S[k] = null; }
      if (!lv('sugar') && !lv('hidromonitor')) S.beams = [];
      const live = a => a.filter(o => !o.dead); S.en = live(S.en); S.pr = live(S.pr); S.gems = live(S.gems); S.bombs = live(S.bombs); S.clouds = live(S.clouds);
      S.ep = live(S.ep); S.cans = live(S.cans); S.geys = live(S.geys); S.hail = live(S.hail);
      S.pt = S.pt.filter(p => p.l > 0); S.nums = S.nums.filter(n => n.l > 0); S.rings = S.rings.filter(r => r.l > 0); S.slashes = S.slashes.filter(s => s.l > 0); S.bolts = S.bolts.filter(b => b.l > 0);
      if ((S.unT -= dt) <= 0) { S.unT = .5; checkUnlocks(G); }
      if ((S.hudT -= dt) <= 0 && S.dirty) { S.hudT = .25; S.dirty = 0; hud(); }
    },
    draw(g, G, t) {
      view(G); if (sprSc !== V.sc) build(); if (portD !== G.d) portraits(G.d);
      if (!G.running && S.started && !S.over && G.score >= 0 && UI.pStart.hidden) { S.over = 1; showStats(); checkUnlocks(G); }
      const P = S.P, sc = V.sc, d = G.d, W = G.W, H = G.H, X = wx => (wx - P.x) * sc + W / 2, Y = wy => (wy - P.y) * sc + H / 2, vis = (x, y, m) => x > -m && y > -m && x < W + m && y < H + m, ar = S.st.area;
      // talaj
      const ts = TILE.width, mod = (a, n) => ((a % n) + n) % n, sx0 = -Math.round(mod(P.x * sc - W / 2, ts)), sy0 = -Math.round(mod(P.y * sc - H / 2, ts));
      for (let x = sx0; x < W; x += ts) for (let y = sy0; y < H; y += ts) g.drawImage(TILE, x, y);
      if (S.green > 0) { g.fillStyle = `rgba(70,160,60,${.34 * Math.min(1, S.green / 2)})`; g.fillRect(0, 0, W, H); }
      if (S.dry > 0) { g.fillStyle = `rgba(180,120,50,${.14 * Math.min(1, S.dry * 3)})`; g.fillRect(0, 0, W, H); }
      // csepegtető nyom
      if (S.trail.length) { const E = lv('csatorna'), w = (E ? 24 : 11 + lv('cso') * 1.6) * ar * sc; g.lineCap = 'round'; g.lineJoin = 'round';
        for (const [c, k] of [[E ? 'rgba(25,120,230,.4)' : 'rgba(25,120,230,.32)', 2], ['rgba(150,215,255,.5)', .7]]) { g.strokeStyle = c; g.lineWidth = w * k; g.beginPath(); S.trail.forEach((p, i) => i ? g.lineTo(X(p.x), Y(p.y)) : g.moveTo(X(p.x), Y(p.y))); g.stroke(); } }
      // tócsa és felhők árnyéka
      const pr = puddleR();
      if (pr) { const R = pr * sc, E = lv('gyogyforras'); g.fillStyle = E ? 'rgba(40,200,170,.36)' : 'rgba(25,135,255,.34)'; g.beginPath(); g.ellipse(W / 2, H / 2 + 6 * sc, R, R * .92, 0, 0, TAU); g.fill(); g.strokeStyle = E ? 'rgba(170,255,220,.6)' : 'rgba(150,215,255,.55)'; g.lineWidth = 2 * d; g.stroke();
        g.strokeStyle = 'rgba(190,230,255,.4)'; g.lineWidth = 1.5 * d; for (let i = 0; i < 2; i++) { const k = (t * .7 + i * .5) % 1; g.globalAlpha = 1 - k; g.beginPath(); g.ellipse(W / 2, H / 2 + 6 * sc, R * k, R * .92 * k, 0, 0, TAU); g.stroke(); } g.globalAlpha = 1;
        if (E) { g.fillStyle = 'rgba(126,240,164,.8)'; for (let i = 0; i < 5; i++) { const k = (t * .8 + i * .2) % 1, a = i * 1.3; g.globalAlpha = 1 - k; heart(g, W / 2 + Math.cos(a) * R * .5, H / 2 + Math.sin(a) * R * .4 - k * 30 * sc, 3 * sc); } g.globalAlpha = 1; } }
      for (const c of S.clouds) { const a = Math.min(1, c.l0 * 4, c.life * 3), x = X(c.x), y = Y(c.y), R = c.R * sc; g.fillStyle = c.storm ? `rgba(40,60,140,${.32 * a})` : `rgba(20,110,235,${.3 * a})`; g.beginPath(); g.ellipse(x, y, R, R * .9, 0, 0, TAU); g.fill(); }
      // gejzírek figyelmeztetése, féreg/Szilárd repedései
      for (const q of S.geys) { const x = X(q.x), y = Y(q.y), R = q.R * sc; if (q.t < 0) { g.strokeStyle = `rgba(150,215,255,${.5 + .5 * Math.sin(t * 30)})`; g.lineWidth = 2 * d; g.setLineDash([5 * d, 4 * d]); g.beginPath(); g.ellipse(x, y, R, R * .6, 0, 0, TAU); g.stroke(); g.setLineDash([]); } }
      for (const e of S.en) { if (e.st === 'warn') { const x = X(e.wx), y = Y(e.wy), R = (e.type === 'szilard' ? 62 : 58) * sc, k = 1 - e.stT / (e.type === 'szilard' ? .9 : .75);
          g.fillStyle = `rgba(120,60,20,${.25 + .25 * k})`; g.beginPath(); g.ellipse(x, y, R, R * .55, 0, 0, TAU); g.fill(); g.strokeStyle = '#3a1a0a'; g.lineWidth = 2.5 * d; g.lineCap = 'round';
          for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + e.id; ln(g, x, y, x + Math.cos(a) * R * k, y + Math.sin(a) * R * .55 * k); } }
        else if (e.under) { const x = X(e.x), y = Y(e.y); if (!vis(x, y, 60)) continue; g.fillStyle = 'rgba(120,90,50,.55)'; g.beginPath(); g.ellipse(x, y, 22 * sc, 9 * sc, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(200,170,120,.6)'; for (let i = 0; i < 3; i++) circ(g, x + Math.sin(t * 9 + i * 2) * 14 * sc, y - Math.abs(Math.cos(t * 7 + i)) * 6 * sc, 2.4 * sc); } }
      // cseppek és tárgyak
      for (const q of S.gems) { const x = X(q.x), y = Y(q.y); if (!vis(x, y, 20)) continue;
        if (q.k === 'x') { g.fillStyle = q.v >= 6 ? '#ffd23f' : q.v >= 3 ? '#5ee08a' : '#6cc6ff'; drop(g, x, y, (4 + Math.min(3, q.v * .4)) * sc); g.fillStyle = 'rgba(255,255,255,.7)'; circ(g, x - 1.4 * sc, y + .5 * sc, 1.1 * sc); }
        else if (q.k === 'h') { g.fillStyle = '#ff5a4d'; heart(g, x, y + Math.sin(t * 5) * 2 * sc, 8 * sc); }
        else if (q.k === 'm') ico(g, 'magnes', x, y + Math.sin(t * 5) * 2 * sc, 22 * sc);
        else { const k = (1 + .08 * Math.sin(t * 6)) * (q.dbl ? 1.25 : 1); if (q.dbl) { g.fillStyle = `rgba(255,210,63,${.25 + .15 * Math.sin(t * 8)})`; circ(g, x, y, 24 * sc); }
          g.fillStyle = q.dbl ? '#b8860b' : '#8a5a1e'; rrp(g, x - 13 * sc * k, y - 9 * sc * k, 26 * sc * k, 18 * sc * k, 3 * sc); g.fillStyle = q.dbl ? '#ffd23f' : '#e8b656'; g.fillRect(x - 13 * sc * k, y - 3 * sc, 26 * sc * k, 3 * sc); circ(g, x, y - 1 * sc, 3 * sc); } }
      // Szilárd olvadása
      if (S.melt) { const m = S.melt, k = 1 - m.l / 2.6, x = X(m.x), y = Y(m.y), sp = SPR.szilard; g.fillStyle = `rgba(40,140,255,${.45 * Math.min(1, k * 2)})`; g.beginPath(); g.ellipse(x, y + 20 * sc, (20 + k * 50) * sc, (7 + k * 18) * sc, 0, 0, TAU); g.fill();
        if (k < .85) { g.save(); g.globalAlpha = 1 - k; g.translate(x, y + 26 * sc); g.scale(1 + k * .6, 1 - k); g.drawImage(sp.c, -sp.sz / 2, -sp.sz / 2 - 26 * sc); g.restore(); } }
      // ellenségek
      S.en.sort((a, b) => a.y - b.y);
      g.fillStyle = 'rgba(0,0,0,.22)'; for (const e of S.en) { if (e.under) continue; const x = X(e.x), y = Y(e.y); if (!vis(x, y, 60 * sc)) continue; g.beginPath(); g.ellipse(x, y + e.r * 1.02 * sc, e.r * .85 * sc, e.r * .28 * sc, 0, 0, TAU); g.fill(); }
      let szDraw = null;
      for (const e of S.en) { if (e.under) continue; const x = X(e.x), y = Y(e.y); if (!vis(x, y, 60 * sc)) continue; const sp = SPR[e.type], im = e.flash > 0 ? sp.w : sp.c, ay = e.air > 0 ? -Math.sin(e.air / .55 * Math.PI) * 26 * sc : 0;
        if (e.type === 'szilard') { szDraw = [e, x, y]; continue; }
        if (e.T.spin) { g.save(); g.translate(x, y + ay); g.rotate(t * 7 + e.ph); g.drawImage(im, -sp.sz / 2, -sp.sz / 2); g.restore(); }
        else if (e.T.flap) { const f = .55 + .45 * Math.abs(Math.sin(t * 14 + e.ph)); g.save(); g.translate(x, y + ay); g.scale(1, f); g.drawImage(im, -sp.sz / 2, -sp.sz / 2); g.restore(); }
        else g.drawImage(im, Math.round(x - sp.sz / 2), Math.round(y - sp.sz / 2 + ay + Math.sin(t * 8 + e.ph) * 1.5 * sc));
        if (e.freeze > 0) { g.fillStyle = 'rgba(140,215,255,.45)'; circ(g, x, y + ay, e.r * 1.05 * sc); g.strokeStyle = 'rgba(235,250,255,.9)'; g.lineWidth = 1.5 * d; g.beginPath(); g.arc(x, y + ay, e.r * 1.05 * sc, 0, TAU); g.stroke(); }
        else if (e.slow > 0) { g.fillStyle = 'rgba(108,198,255,.85)'; drop(g, x, y - e.r * 1.5 * sc, 3 * sc); }
        if (e.T.boss) { const w = 70 * sc, yy = y - e.r * 1.9 * sc; g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x - w / 2, yy, w, 6 * sc); g.fillStyle = '#ff5a4d'; g.fillRect(x - w / 2, yy, w * Math.max(0, e.hp / e.mhp), 6 * sc); } }
      // Szikkadt Szilárd: hőség-vibrálás, homokpergés, porzó kanna, izzó szemek
      const drawSz = (x, y, a) => { const sp = SPR.szilard, r = 36 * sc;
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0); const sw = Math.round(r * 4), sh = Math.round(r * 4.4), sx = Math.round(x - sw / 2), sy = Math.round(y - sh * .58), n = 12, hh = sh / n;
        if (sx > 0 && sy > 0 && sx + sw < W && sy + sh < H) for (let i = 0; i < n; i++) { const o = Math.sin(t * 13 + i * 1.7) * 2.2 * d; g.drawImage(g.canvas, sx, sy + i * hh, sw, hh, sx + o, sy + i * hh, sw, hh); } g.restore();
        g.globalAlpha = a; g.drawImage(sp.c, Math.round(x - sp.sz / 2), Math.round(y - sp.sz / 2 + Math.sin(t * 3) * 2 * sc));
        g.fillStyle = 'rgba(216,185,138,.85)'; for (let i = 0; i < 7; i++) { const k = (t * 1.3 + i * .37) % 1; circ(g, x + (Math.sin(i * 3.1) * .6) * r, y + (1.05 + k * .5) * r, 1.4 * sc); }
        for (let i = 0; i < 6; i++) { const k = (t * 1.6 + i * .21) % 1; g.fillStyle = `rgba(200,170,120,${.8 * (1 - k)})`; circ(g, x + (1.3 + k * .5) * r, y + (-.22 + k * 1.1) * r, (1.2 + k * 2.5) * sc); }
        const gl = .55 + .45 * Math.sin(t * 6); g.fillStyle = `rgba(255,210,63,${.35 * gl})`; circ(g, x - .11 * r, y - .85 * r, 5 * sc); circ(g, x + .11 * r, y - .85 * r, 5 * sc); g.globalAlpha = 1; };
      if (szDraw) { const [e, x, y] = szDraw; drawSz(x, y, 1); if (e.flash > 0) { g.globalAlpha = .6; g.drawImage(SPR.szilard.w, Math.round(x - SPR.szilard.sz / 2), Math.round(y - SPR.szilard.sz / 2)); g.globalAlpha = 1; } }
      // előzetes megjelenés a képernyő szélén
      if (S.taunt) { const k = S.taunt.l, a = Math.min(1, (3.2 - k) * 3, k * 3), x = W - 46 * sc, y = H / 2 - 20 * sc; drawSz(x, y, a); }
      // slagostor
      for (const s of S.slashes) { const a = s.l / .22, x = X(s.x), y = Y(s.y), len = s.len * sc * (1 - a * .25); g.globalAlpha = a; g.lineCap = 'round';
        g.strokeStyle = '#1d7a36'; g.lineWidth = 9 * sc; g.beginPath(); g.moveTo(x + s.dir * 10 * sc, y); g.quadraticCurveTo(x + s.dir * len * .5, y - 28 * sc * a, x + s.dir * len, y + 4 * sc); g.stroke();
        g.strokeStyle = '#49c468'; g.lineWidth = 5 * sc; g.stroke(); g.fillStyle = 'rgba(200,235,255,.9)'; for (let i = 0; i < 5; i++) circ(g, x + s.dir * (len + (i * 7 - 6) * sc), y + (Math.sin(i * 2.4) * 16 - 4) * sc * (1 - a), 3 * sc); g.globalAlpha = 1; }
      // nagynyomású sugár
      if (S.beams.length) { g.lineCap = 'round'; for (const b of S.beams) { const x2 = X(b.x2), y2 = Y(b.y2), x1 = W / 2 + 10 * sc, y1 = H / 2 - 2 * sc;
        g.strokeStyle = b.w ? 'rgba(80,170,255,.45)' : 'rgba(80,170,255,.35)'; g.lineWidth = (b.w ? 14 : 8) * sc; ln(g, x1, y1, x2, y2); g.strokeStyle = 'rgba(220,245,255,.9)'; g.lineWidth = (b.w ? 5 : 3) * sc; ln(g, x1, y1, x2, y2);
        g.fillStyle = 'rgba(200,235,255,.8)'; for (let i = 0; i < 3; i++) circ(g, x2 + Math.sin(t * 40 + i * 2) * 6 * sc, y2 + Math.cos(t * 33 + i) * 6 * sc, 2.2 * sc); } }
      // rain bird / öntözőhíd
      if (lv('rainbird')) { const a = S.rbJet, R = (120 + lv('rainbird') * 12) * ar * sc, cx = W / 2, cy = H / 2;
        g.strokeStyle = 'rgba(150,215,255,.55)'; g.lineWidth = 3 * sc; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(cx + Math.cos(a) * R * .5, cy + Math.sin(a) * R * .5 - 18 * sc, cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke();
        g.fillStyle = 'rgba(200,235,255,.85)'; for (let i = 0; i < 6; i++) { const k = .45 + i * .1; circ(g, cx + Math.cos(a + Math.sin(i * 7) * .06) * R * k, cy + Math.sin(a + Math.sin(i * 7) * .06) * R * k - Math.sin(k * Math.PI) * 18 * sc * .5, 2.2 * sc); } }
      if (lv('ontozohid')) { const a = S.rbJet, R = 250 * ar * sc, cx = W / 2, cy = H / 2, ca = Math.cos(a), sa = Math.sin(a);
        g.strokeStyle = '#8c98a6'; g.lineWidth = 4 * sc; g.lineCap = 'butt'; ln(g, cx - ca * R, cy - sa * R, cx + ca * R, cy + sa * R); g.strokeStyle = '#5a6672'; g.lineWidth = 1.5 * sc;
        for (let i = -6; i <= 6; i++) { const px = cx + ca * R * i / 6, py = cy + sa * R * i / 6; ln(g, px, py, px - sa * 7 * sc, py + ca * 7 * sc); g.fillStyle = 'rgba(150,215,255,.55)'; circ(g, px - sa * 12 * sc + Math.sin(t * 30 + i) * 3 * sc, py + ca * 12 * sc, 6 * sc); } }
      drawPlayer(g, G, t);
      // élet a játékos alatt
      { const w = 36 * sc, x = W / 2 - w / 2, y = H / 2 + 23 * sc; g.fillStyle = 'rgba(0,0,0,.55)'; rrp(g, x - 1, y - 1, w + 2, 5 * sc + 2, 2 * sc); g.fillStyle = P.hp / P.mhp > .35 ? '#5ee08a' : '#ff5a4d'; rrp(g, x, y, w * Math.max(0, P.hp / P.mhp), 5 * sc, 2 * sc); }
      // szórófej cseppjei / körforgó
      let L;
      if ((L = lv('szoro'))) { const n = L + 1, R = (56 + L * 4) * ar * sc; for (let i = 0; i < n; i++) { const a = S.orb + i / n * TAU, x = W / 2 + Math.cos(a) * R, y = H / 2 + Math.sin(a) * R;
        g.strokeStyle = 'rgba(108,198,255,.35)'; g.lineWidth = 6 * sc; g.lineCap = 'round'; g.beginPath(); g.arc(W / 2, H / 2, R, a - .45, a); g.stroke(); g.fillStyle = '#8fd4ff'; circ(g, x, y, 7 * sc); g.fillStyle = '#fff'; circ(g, x - 2 * sc, y - 2 * sc, 2.2 * sc); } }
      if (lv('korforgo')) for (const [R0, s] of [[70, 1], [124, -1]]) { const R = R0 * ar * sc; for (let i = 0; i < 6; i++) { const a = s * S.orb * (s > 0 ? 1 : .8) + i / 6 * TAU, x = W / 2 + Math.cos(a) * R, y = H / 2 + Math.sin(a) * R;
        g.strokeStyle = s > 0 ? 'rgba(108,198,255,.4)' : 'rgba(255,210,63,.35)'; g.lineWidth = 7 * sc; g.lineCap = 'round'; g.beginPath(); s > 0 ? g.arc(W / 2, H / 2, R, a - .4, a) : g.arc(W / 2, H / 2, R, a, a + .4); g.stroke(); g.fillStyle = s > 0 ? '#8fd4ff' : '#bfe6ff'; circ(g, x, y, 8.5 * sc); g.fillStyle = '#fff'; circ(g, x - 2 * sc, y - 2 * sc, 2.6 * sc); } }
      // lövedékek, kannák, bombák
      g.lineCap = 'round'; for (const p of S.pr) { const x = X(p.x), y = Y(p.y);
        if (p.ice) { g.save(); g.translate(x, y); g.rotate(t * 9 + p.x); g.fillStyle = '#d6f3ff'; rrp(g, -4.5 * sc, -4.5 * sc, 9 * sc, 9 * sc, 2 * sc); g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(-2.5 * sc, -2.5 * sc, 2.5 * sc, 2.5 * sc); g.restore(); continue; }
        const c = p.sand ? 'rgba(216,185,138,.6)' : 'rgba(108,198,255,.55)', r = (p.big ? 11 : 4.5) * sc; g.strokeStyle = c; g.lineWidth = (p.big ? 14 : 5) * sc; ln(g, x, y, x - p.vx * .035 * sc, y - p.vy * .035 * sc); g.fillStyle = p.sand ? '#e8d2a6' : '#bfe6ff'; circ(g, x, y, r); if (p.big) { g.fillStyle = '#fff'; circ(g, x - 3 * sc, y - 3 * sc, 3.5 * sc); } }
      for (const c of S.cans) { const x = X(c.x), y = Y(c.y); g.save(); g.translate(x, y); g.rotate(c.rot); g.scale(sc * (c.big ? 1.4 : 1.05), sc * (c.big ? 1.4 : 1.05)); canShape(g, c.big ? '#e8b656' : '#2f9e4f', c.big ? '#b8860b' : '#1d6b33'); g.restore(); }
      for (const b of S.bombs) { if (b.t < 0) continue; const k = b.t / .55, wx = b.x0 + (b.tx - b.x0) * k, wy = b.y0 + (b.ty - b.y0) * k, x = X(wx), y = Y(wy), h = Math.sin(k * Math.PI) * 70 * sc;
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y, 8 * sc, 3 * sc, 0, 0, TAU); g.fill(); g.fillStyle = '#3aa6f5'; circ(g, x, y - h, 9 * sc); g.fillStyle = 'rgba(255,255,255,.7)'; circ(g, x - 3 * sc, y - h - 3 * sc, 2.5 * sc); }
      for (const r of S.rings) { const k = 1 - r.l, x = X(r.x), y = Y(r.y), R = r.w ? r.R * sc * (.3 + k * .7) : r.R * sc * (.5 + k * .5); g.fillStyle = `rgba(120,200,255,${r.l * (r.w ? .18 : .35)})`; circ(g, x, y, R); g.strokeStyle = `rgba(220,245,255,${r.l})`; g.lineWidth = (r.w ? 8 : 4) * sc * r.l + 1; g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke(); }
      // gejzír-oszlopok
      for (const q of S.geys) { if (q.t < 0) continue; const x = X(q.x), y = Y(q.y), R = q.R * sc, k = q.t / q.life, h = (q.E ? 90 : 70) * sc * Math.sin(Math.min(1, k * 3) * Math.PI / 2) * (1 - k * .6), a = 1 - k * .7;
        g.fillStyle = `rgba(120,200,255,${.28 * a})`; g.beginPath(); g.ellipse(x, y, R, R * .55, 0, 0, TAU); g.fill();
        const gr = g.createLinearGradient(0, y - h, 0, y); gr.addColorStop(0, `rgba(230,248,255,${.9 * a})`); gr.addColorStop(1, `rgba(80,170,255,${.75 * a})`); g.fillStyle = gr;
        g.beginPath(); g.moveTo(x - R * .35, y); g.quadraticCurveTo(x - R * .25, y - h * .6, x - R * .12, y - h); g.quadraticCurveTo(x, y - h * 1.12, x + R * .12, y - h); g.quadraticCurveTo(x + R * .25, y - h * .6, x + R * .35, y); g.fill(); }
      // jégeső
      for (const h of S.hail) { const x = X(h.x), y = Y(h.y), k = h.t / .35; g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(x, y, 5 * sc, 2 * sc, 0, 0, TAU); g.fill(); g.fillStyle = '#e6f7ff'; rrp(g, x - 4 * sc, y - k * 120 * sc - 4 * sc, 8 * sc, 8 * sc, 2 * sc); }
      // ellenséges homokhullám
      for (const p of S.ep) { const x = X(p.x), y = Y(p.y); if (!vis(x, y, 20)) continue; g.fillStyle = 'rgba(160,120,60,.45)'; circ(g, x, y, 8 * sc); g.fillStyle = '#e0c38f'; circ(g, x, y, 4.5 * sc); }
      // esőfelhők, villámok
      for (const c of S.clouds) { const a = Math.min(1, c.l0 * 4, c.life * 3), x = X(c.x), y = Y(c.y), R = c.R * sc; g.globalAlpha = a; g.strokeStyle = 'rgba(160,215,255,.7)'; g.lineWidth = 1.6 * sc;
        for (let i = 0; i < 12; i++) { const px = x + Math.sin(i * 5.3) * R * .85, k = (t * 2.2 + i * .37) % 1, py = y - R * .9 + k * R * 1.5; ln(g, px, py, px - 3 * sc, py + 9 * sc); }
        g.fillStyle = c.storm ? 'rgba(96,104,128,.94)' : 'rgba(214,222,232,.92)'; const cy = y - R * 1.05; circ(g, x - R * .42, cy + R * .06, R * .3); circ(g, x, cy - R * .08, R * .4); circ(g, x + R * .45, cy + R * .08, R * .28); rrp(g, x - R * .62, cy, R * 1.24, R * .32, R * .16); g.globalAlpha = 1; }
      for (const b of S.bolts) { const x1 = X(b.x1), y1 = Y(b.y1), x2 = X(b.x2), y2 = Y(b.y2); g.globalAlpha = b.l / .2; g.strokeStyle = '#fff6b0'; g.lineWidth = 3 * sc; g.lineJoin = 'miter'; g.beginPath(); g.moveTo(x1, y1);
        for (let i = 1; i < 6; i++) { const k = i / 6; g.lineTo(x1 + (x2 - x1) * k + Math.sin(b.s + i * 3.7) * 12 * sc, y1 + (y2 - y1) * k); } g.lineTo(x2, y2); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1.2 * sc; g.stroke(); g.globalAlpha = 1; }
      // helikopterek
      for (const h of S.heli) { const x = X(h.x), y = Y(h.y), E = lv('legiflotta'), R = (E ? 64 : 24 + lv('heli') * 6) * ar * sc;
        g.fillStyle = 'rgba(80,170,255,.16)'; g.beginPath(); g.ellipse(x, y + 8 * sc + 34 * sc, R, R * .55, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(160,215,255,.5)'; g.lineWidth = 1.3 * sc;
        for (let i = 0; i < 7; i++) { const k = (t * 3 + i * .17) % 1, px = x + Math.sin(i * 4.1) * R * .7; ln(g, px, y + 4 * sc + k * 38 * sc, px, y + 9 * sc + k * 38 * sc); }
        g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(x, y + 42 * sc, 12 * sc, 4 * sc, 0, 0, TAU); g.fill();
        g.save(); g.translate(x, y); g.scale(sc * 1.3, sc * 1.3); g.fillStyle = '#e8833a'; rrp(g, -8, -4, 14, 9, 4); g.fillStyle = '#fff'; g.fillRect(-8, 0, 14, 1.8); g.fillStyle = '#9fdcff'; rrp(g, 2, -3, 4.5, 4.5, 1.6);
        g.fillStyle = '#46525f'; g.fillRect(-7, 5, 1.4, 3); g.fillRect(2, 5, 1.4, 3); g.fillRect(-9, 7.6, 13, 1.3); g.fillRect(-1.5, -9, 1.6, 5);
        g.strokeStyle = 'rgba(40,46,58,.75)'; g.lineWidth = 1.4; for (const [o, s] of [[-9, 1], [-7, -1]]) { const a = t * 40 * s; ln(g, -.7 - Math.cos(a) * 14, o - Math.sin(a) * 2, -.7 + Math.cos(a) * 14, o + Math.sin(a) * 2); } g.restore(); }
      for (const p of S.pt) { g.fillStyle = `rgba(${p.c},${Math.min(1, p.l * 2.5)})`; circ(g, X(p.x), Y(p.y), 2.6 * sc); }
      g.font = `700 ${11 * sc}px Inter, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; for (const n of S.nums) { g.fillStyle = `rgba(255,255,255,${Math.min(1, n.l * 2.5)})`; g.fillText(n.v, X(n.x), Y(n.y)); }
      // eső (zápor, Szilárd legyőzése)
      if (S.rainT > 0) { g.strokeStyle = `rgba(170,215,255,${.5 * Math.min(1, S.rainT)})`; g.lineWidth = 1.4 * d; for (let i = 0; i < 70; i++) { const px = ((i * 137.5 + t * 90) % (W + 40)) - 20, py = ((i * 71.3 + t * 900) % (H + 60)) - 30; ln(g, px, py, px - 4 * d, py + 14 * d); } }
      // sötétítés a szélek felé
      g.drawImage(VIG, 0, 0, W, H);
      if (S.heat > 0 || S.szRage) { g.fillStyle = `rgba(255,110,30,${.08 + .04 * Math.sin(t * 4)})`; g.fillRect(0, 0, W, H); }
      if (joy && joy.touch && !S.choose && G.running) { g.fillStyle = 'rgba(255,255,255,.1)'; circ(g, joy.ox, joy.oy, 46 * d); g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2 * d; g.beginPath(); g.arc(joy.ox, joy.oy, 46 * d, 0, TAU); g.stroke(); g.fillStyle = 'rgba(255,226,154,.55)'; circ(g, joy.x, joy.y, 20 * d); }
      // Szilárd szövegbuboréka
      const bubble = (x, y, txt) => { g.font = `800 ${13 * d}px Inter, sans-serif`; const w = Math.min(W - 20 * d, g.measureText(txt).width + 22 * d), bx = clamp(x - w / 2, 10 * d, W - w - 10 * d), by = y - 34 * d;
        g.fillStyle = 'rgba(255,244,214,.96)'; rrp(g, bx, by, w, 28 * d, 12 * d); g.beginPath(); g.moveTo(clamp(x, bx + 14 * d, bx + w - 14 * d) - 6 * d, by + 27 * d); g.lineTo(clamp(x, bx + 14 * d, bx + w - 14 * d), by + 37 * d); g.lineTo(clamp(x, bx + 14 * d, bx + w - 14 * d) + 6 * d, by + 27 * d); g.fill();
        g.fillStyle = '#5a2c0e'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, bx + w / 2, by + 14 * d, w - 12 * d); };
      if (S.taunt) { const k = S.taunt.l; g.globalAlpha = Math.min(1, (3.2 - k) * 3, k * 3); bubble(W - 46 * sc, H / 2 - 64 * sc, S.taunt.txt); g.globalAlpha = 1; }
      if (S.say && S.szE && !S.szE.under) bubble(X(S.szE.x), Y(S.szE.y) - 44 * sc, S.say.t);
      // felső sáv: XP, szint, idő, fejlesztések
      const bx = 12 * d, by = 60 * d, bw = W - 24 * d, bh = 9 * d; g.fillStyle = 'rgba(4,7,14,.7)'; rrp(g, bx, by, bw, bh, bh / 2); g.fillStyle = '#3aa6f5'; if (P.xp > 0) rrp(g, bx, by, Math.max(bh, bw * Math.min(1, P.xp / P.need)), bh, bh / 2);
      g.font = `800 ${13 * d}px Inter, sans-serif`; g.textBaseline = 'middle'; g.lineWidth = 3.5 * d; g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineJoin = 'round';
      const ty = by + bh + 15 * d; g.textAlign = 'right'; const info = P.lvl + '. SZINT · ' + fmtT(S.t); g.strokeText(info, W - 12 * d, ty); g.fillStyle = '#ffe29a'; g.fillText(info, W - 12 * d, ty);
      g.font = `800 ${9 * d}px Inter, sans-serif`; g.textAlign = 'center';
      const row = (keys, yy) => { let ix = 12 * d + 11 * d; for (const k of keys) { g.fillStyle = UP[k].evo ? 'rgba(80,60,4,.75)' : 'rgba(4,7,14,.6)'; circ(g, ix, yy, 12 * d); ico(g, k, ix, yy, 17 * d); const s = UP[k].evo ? '★' : S.up[k];
        g.fillStyle = S.up[k] >= mxl(k) ? '#ffd23f' : '#fff'; g.strokeText(s, ix + 9 * d, yy + 8 * d); g.fillText(s, ix + 9 * d, yy + 8 * d); ix += 27 * d; } };
      const ks = Object.keys(S.up); row(ks.filter(isW), ty); row(ks.filter(k => !isW(k)), ty + 27 * d);
      // szünet gomb
      if (G.running && !S.sel) { const pb = pauseBtn(G); g.fillStyle = 'rgba(4,7,14,.6)'; circ(g, pb.x, pb.y, pb.r); g.fillStyle = '#e6edf5'; g.fillRect(pb.x - 5 * d, pb.y - 6 * d, 3.5 * d, 12 * d); g.fillRect(pb.x + 1.5 * d, pb.y - 6 * d, 3.5 * d, 12 * d); }
      // főellenség HP-sávja
      if (S.szE) { const e = S.szE, w = Math.min(W - 40 * d, 460 * d), x = (W - w) / 2, y = ty + 60 * d; g.fillStyle = 'rgba(4,7,14,.75)'; rrp(g, x - 3 * d, y - 3 * d, w + 6 * d, 16 * d, 8 * d);
        g.fillStyle = e.hp / e.mhp > .6 ? '#d9a441' : e.hp / e.mhp > .25 ? '#e5772a' : '#e5432a'; rrp(g, x, y, Math.max(0, w * e.hp / e.mhp), 10 * d, 5 * d); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + w * .6, y, 1.5 * d, 10 * d); g.fillRect(x + w * .25, y, 1.5 * d, 10 * d);
        g.font = `900 ${12 * d}px Cinzel, serif`; g.textAlign = 'center'; g.strokeText('SZIKKADT SZILÁRD', W / 2, y + 24 * d); g.fillStyle = '#ffd23f'; g.fillText('SZIKKADT SZILÁRD', W / 2, y + 24 * d); }
      if (S.banner && !S.choose && !S.paused && !S.sel) { g.globalAlpha = Math.min(1, S.banner.l * 2); const fs = Math.min(34 * d, W / (S.banner.t.length > 22 ? 22 : 13)); g.font = `900 ${fs}px Cinzel, serif`; g.textAlign = 'center'; g.lineWidth = 6 * d; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(S.banner.t, W / 2, H * .3, W - 20 * d); g.fillStyle = S.banner.c || '#ff5a4d'; g.fillText(S.banner.t, W / 2, H * .3, W - 20 * d); g.globalAlpha = 1; }
      if (S.note) { g.globalAlpha = Math.min(1, S.note.l * 2); g.font = `800 ${14 * d}px Inter, sans-serif`; g.textAlign = 'center'; const w = g.measureText(S.note.t).width + 28 * d; g.fillStyle = 'rgba(60,44,4,.92)'; rrp(g, (W - w) / 2, H * .38, w, 30 * d, 15 * d); g.fillStyle = '#ffd23f'; g.fillText(S.note.t, W / 2, H * .38 + 15 * d); g.globalAlpha = 1; }
      if (S.flash > 0) { g.fillStyle = `rgba(255,236,170,${Math.min(.85, S.flash * 1.4)})`; g.fillRect(0, 0, W, H); }
      // szintlépés / evolúció: választás
      if (S.choose && G.running) { const a = Math.min(1, S.choose.t * 5), ev = S.choose.evo; g.fillStyle = `rgba(2,4,9,${.72 * a})`; g.fillRect(0, 0, W, H); const cs = cards(G); g.globalAlpha = a;
        g.font = `900 ${Math.min(30 * d, W / 13)}px Cinzel, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = ev ? '#ffd23f' : '#ffe29a'; g.fillText(ev ? 'FEJLŐDÉS!' : 'SZINTLÉPÉS!', W / 2, cs[0].y - 30 * d);
        for (const c of cs) { const u = UP[c.k], cur = lv(c.k), nw = !u.sp && !cur && !ev;
          if (ev) { g.save(); g.shadowColor = '#ffd23f'; g.shadowBlur = (14 + 8 * Math.sin(t * 6)) * d; g.fillStyle = 'rgba(40,30,6,.97)'; rrp(g, c.x, c.y, c.w, c.h, 14 * d); g.restore(); g.strokeStyle = '#ffd23f'; g.lineWidth = 3 * d; g.beginPath(); g.roundRect(c.x, c.y, c.w, c.h, 14 * d); g.stroke(); g.strokeStyle = '#b8860b'; g.lineWidth = 1 * d; g.beginPath(); g.roundRect(c.x + 5 * d, c.y + 5 * d, c.w - 10 * d, c.h - 10 * d, 10 * d); g.stroke(); }
          else { g.fillStyle = 'rgba(14,24,44,.96)'; rrp(g, c.x, c.y, c.w, c.h, 14 * d); g.strokeStyle = nw ? '#e8b656' : 'rgba(120,190,255,.4)'; g.lineWidth = (nw ? 2 : 1.5) * d; g.beginPath(); g.roundRect(c.x, c.y, c.w, c.h, 14 * d); g.stroke(); }
          g.fillStyle = ev ? 'rgba(255,210,63,.16)' : 'rgba(108,198,255,.12)'; circ(g, c.x + 41 * d, c.y + c.h / 2, 27 * d); ico(g, c.k, c.x + 41 * d, c.y + c.h / 2, 40 * d);
          g.textAlign = 'left'; g.font = `800 ${16 * d}px Inter, sans-serif`; g.fillStyle = ev ? '#ffd23f' : '#fff'; g.fillText(u.n, c.x + 80 * d, c.y + c.h / 2 - (ev ? 16 : 12) * d, c.w - (ev ? 92 : 150) * d);
          g.font = `500 ${12.5 * d}px Inter, sans-serif`; g.fillStyle = '#c9c3b5';
          if (ev) { g.fillText(u.d, c.x + 80 * d, c.y + c.h / 2 + 8 * d, c.w - 92 * d); g.font = `700 ${11 * d}px Inter, sans-serif`; g.fillStyle = '#e8b656'; g.fillText(UP[ev[0]].n + ' + ' + UP[ev[1]].n, c.x + 80 * d, c.y + c.h / 2 + 28 * d, c.w - 92 * d); }
          else g.fillText(u.w && !u.evo ? u.d[cur] : u.d, c.x + 80 * d, c.y + c.h / 2 + 11 * d, c.w - 92 * d);
          if (!u.sp && !ev) { const tag = nw ? (isW(c.k) ? 'ÚJ FEGYVER' : 'ÚJ') : (cur + 1) + '. SZINT'; g.font = `800 ${10.5 * d}px Inter, sans-serif`; const tw = g.measureText(tag).width + 14 * d; g.fillStyle = nw ? '#e8b656' : 'rgba(120,190,255,.22)'; rrp(g, c.x + c.w - tw - 10 * d, c.y + 10 * d, tw, 18 * d, 9 * d); g.fillStyle = nw ? '#1a1004' : '#bfe6ff'; g.textAlign = 'center'; g.fillText(tag, c.x + c.w - tw / 2 - 10 * d, c.y + 19.5 * d); } }
        for (const b of cardBtns(G)) btn(g, G, b);
        g.globalAlpha = 1; }
      // szünet: build lista
      if (S.paused && G.running) { g.fillStyle = 'rgba(2,4,9,.86)'; g.fillRect(0, 0, W, H); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${Math.min(30 * d, W / 13)}px Cinzel, serif`; g.fillStyle = '#ffe29a'; g.fillText('SZÜNET', W / 2, 92 * d);
        const ks = Object.keys(S.up).sort((a, b) => isW(b) - isW(a)), cols = W / d > 700 ? 2 : 1, cw = Math.min((W - 30 * d) / cols, 420 * d), rh = Math.min(48 * d, (H - 230 * d) / Math.ceil(ks.length / cols)), x0 = (W - cols * cw) / 2;
        ks.forEach((k, i) => { const cx = x0 + (i % cols) * cw, cy = 125 * d + Math.floor(i / cols) * rh, u = UP[k], cur = S.up[k];
          g.fillStyle = u.evo ? 'rgba(60,44,4,.9)' : 'rgba(14,24,44,.9)'; rrp(g, cx + 4 * d, cy, cw - 8 * d, rh - 6 * d, 10 * d); ico(g, k, cx + 26 * d, cy + (rh - 6 * d) / 2, 26 * d);
          g.textAlign = 'left'; g.font = `800 ${13 * d}px Inter, sans-serif`; g.fillStyle = u.evo ? '#ffd23f' : '#fff'; g.fillText(u.n + (u.evo ? '' : ' · ' + cur + '. szint'), cx + 48 * d, cy + (rh - 6 * d) / 2 - 8 * d, cw - 60 * d);
          g.font = `500 ${11 * d}px Inter, sans-serif`; g.fillStyle = '#b9c4d2'; g.fillText(u.w && !u.evo ? u.d[cur - 1] : u.d, cx + 48 * d, cy + (rh - 6 * d) / 2 + 9 * d, cw - 60 * d); });
        for (const b of pauseBtns(G)) btn(g, G, b, b.id === 'go'); }
      // karakterválasztó
      if (S.sel && G.running) { const a = Math.min(1, S.sel.t * 5); g.fillStyle = `rgba(2,4,9,${.82 * a})`; g.fillRect(0, 0, W, H); g.globalAlpha = a; const cs = selCards(G);
        g.font = `900 ${Math.min(28 * d, W / 14)}px Cinzel, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffe29a'; g.fillText('VÁLASSZ KERTÉSZT', W / 2, cs[0].y - 28 * d);
        for (const c of cs) { const open = chOpen(c.c), on = S.sel.i === c.i, secret = c.c.secret && !open, sh = on && S.sel.shake > 0 ? Math.sin(S.sel.shake * 60) * 4 * d : 0, x = c.x + sh;
          g.fillStyle = open ? 'rgba(14,24,44,.97)' : 'rgba(18,20,26,.97)'; rrp(g, x, c.y, c.w, c.h, 14 * d); g.strokeStyle = on ? '#ffd23f' : open ? 'rgba(120,190,255,.4)' : 'rgba(255,255,255,.12)'; g.lineWidth = (on ? 2.5 : 1.3) * d; g.beginPath(); g.roundRect(x, c.y, c.w, c.h, 14 * d); g.stroke();
          const pt = PORT[c.c.id], ps = Math.min(c.h * .5, 70 * d); g.globalAlpha = a * (open ? 1 : secret ? 1 : .45); g.drawImage(secret ? pt.s : pt.c, x + c.w / 2 - ps / 2, c.y + 6 * d, ps, ps); g.globalAlpha = a;
          g.font = `800 ${Math.min(13.5 * d, c.w / 13)}px Inter, sans-serif`; g.fillStyle = open ? '#fff' : '#8b95a3'; g.fillText(secret ? '???' : c.c.n, x + c.w / 2, c.y + ps + 16 * d, c.w - 12 * d);
          g.font = `500 ${Math.min(11 * d, c.w / 16)}px Inter, sans-serif`;
          if (open) { ico(g, c.c.w, x + 18 * d, c.y + ps + 36 * d, 18 * d); g.textAlign = 'left'; g.fillStyle = '#bfe6ff'; g.fillText(UP[c.c.w].n, x + 31 * d, c.y + ps + 36 * d, c.w - 40 * d); g.textAlign = 'center'; g.fillStyle = '#c9c3b5'; g.fillText(c.c.b, x + c.w / 2, c.y + ps + 54 * d, c.w - 12 * d); }
          else { g.fillStyle = '#8b95a3'; g.fillText('🔒 ' + (secret ? 'Titkos karakter' : c.c.req), x + c.w / 2, c.y + ps + 40 * d, c.w - 12 * d); }
          g.font = `800 ${10 * d}px Inter, sans-serif`; g.fillStyle = 'rgba(255,255,255,.3)'; g.fillText(c.i + 1, x + 12 * d, c.y + 13 * d); }
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
