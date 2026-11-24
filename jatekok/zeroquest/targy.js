/* ZERO QUEST – tárgyak: fegyverek, pajzsok, páncélok, végtelen tarisznya, felszerelés, teherbírás */
'use strict';
/* s: hely (wep, sh, head, body, hand, leg); d sebzés; wt súly; req erő-igény; sp ütés tempója (több = lassabb); rch hatótáv-többlet; blk pajzs-elnyelés; stab állóképesség-költség; def védelem */
const IT = {
  kertkes: { n: 'Kertészkés', s: 'wep', d: 10, wt: 1.5, req: 0, sp: .85, kind: 'kes', col: '#8f9498', t: 0, txt: 'Ezzel metszetted a rózsákat. Most mást metszel vele.' },
  kalmartor: { n: 'Kalmártőr', s: 'wep', d: 13, wt: 1, req: 0, sp: .72, kind: 'kes', col: '#b8bcc0', t: 1 },
  sarlo: { n: 'Rozsdás sarló', s: 'wep', d: 15, wt: 3, req: 1, sp: .95, kind: 'sarlo', col: '#a08a70', t: 1 },
  fejsze: { n: 'Favágó fejsze', s: 'wep', d: 20, wt: 7, req: 4, sp: 1.15, kind: 'fejsze', col: '#8a8a8a', t: 2 },
  landzsa: { n: 'Harmatőr-lándzsa', s: 'wep', d: 19, wt: 6, req: 3, sp: 1.05, rch: 34, kind: 'landzsa', col: '#c8ccd0', t: 2 },
  lovagkard: { n: 'Öntöző-lovagkard', s: 'wep', d: 22, wt: 5, req: 3, sp: 1, kind: 'kard', col: '#cfd8e0', t: 3 },
  buzogany: { n: 'Hóhérbuzogány', s: 'wep', d: 27, wt: 10, req: 6, sp: 1.25, kind: 'buzogany', col: '#6a6660', t: 3 },
  napkard: { n: 'A Napkatona pengéje', s: 'wep', d: 30, wt: 6, req: 5, sp: 1, kind: 'kard', col: '#ffd98a', glow: '#ffcf70', t: 4 },
  kasza: { n: 'Gáspár kaszája', s: 'wep', d: 34, wt: 11, req: 7, sp: 1.3, rch: 28, kind: 'kasza', col: '#b8a070', glow: '#ff8a3a', t: 4 },
  pallos: { n: 'Kőszívű pallos', s: 'wep', d: 36, wt: 15, req: 9, sp: 1.4, rch: 18, kind: 'pallos', col: '#bcc4cc', t: 5 },
  sokard: { n: 'Lőrinc sókardja', s: 'wep', d: 40, wt: 8, req: 8, sp: 1.02, kind: 'kard', col: '#f4ecea', glow: '#fff4e8', t: 6 },
  fagytu: { n: 'Klára fagytűje', s: 'wep', d: 33, wt: 4, req: 5, sp: .8, kind: 'kes', col: '#cfeeff', glow: '#9fdcff', t: 6 },
  tuskekard: { n: 'Tüskekirály ága', s: 'wep', d: 44, wt: 13, req: 10, sp: 1.2, kind: 'buzogany', col: '#4f6a3a', t: 7 },
  fapajzs: { n: 'Korhadt fapajzs', s: 'sh', blk: .55, wt: 3, req: 0, stab: 1.25, col: '#6a4a2c', shape: 'kor', t: 0 },
  kannapajzs: { n: 'Kannafedő-pajzs', s: 'sh', blk: .65, wt: 4, req: 1, stab: 1.1, col: '#8a7a68', shape: 'kor', t: 1 },
  kerekpajzs: { n: 'Vasalt kerek pajzs', s: 'sh', blk: .72, wt: 6, req: 3, stab: 1, col: '#5a4a3a', rim: '#9aa0a6', shape: 'kor', t: 2 },
  cimeres: { n: 'Öntöző-címeres pajzs', s: 'sh', blk: .86, wt: 9, req: 5, stab: .82, col: '#3a5a7a', rim: '#e8b656', shape: 'cimer', t: 3 },
  napvert: { n: 'Napőr tükörpajzsa', s: 'sh', blk: .8, wt: 7, req: 4, stab: .85, col: '#d8c070', rim: '#fff0c0', shape: 'cimer', t: 4 },
  jegpajzs: { n: 'Fagyott kolostorkapu', s: 'sh', blk: .92, wt: 11, req: 7, stab: .74, col: '#9ab8d0', rim: '#e8f4ff', shape: 'torony', t: 6 },
  toronypajzs: { n: 'Sókatona toronypajzsa', s: 'sh', blk: 1, wt: 19, req: 10, stab: .6, col: '#d8ccc6', rim: '#8f8480', shape: 'torony', t: 7 },
  kotenye: { n: 'Kertészkötény', s: 'body', def: .02, wt: 1, col: '#4a5a44', t: 0 },
  csuklya: { n: 'Vándorcsuklya', s: 'head', def: .02, wt: .5, col: '#3a3a30', hood: 1, t: 0 },
  borsapka: { n: 'Bőrsapka', s: 'head', def: .03, wt: 1.5, col: '#6a4a30', t: 1 }, borvert: { n: 'Bőrvért', s: 'body', def: .08, wt: 4, col: '#6a4a30', t: 1 }, borkesztyu: { n: 'Bőrkesztyű', s: 'hand', def: .03, wt: 1, col: '#5a3a24', t: 1 }, borcsizma: { n: 'Bőrcsizma', s: 'leg', def: .05, wt: 2.5, col: '#4a3020', t: 1 },
  lancsisak: { n: 'Láncsisak', s: 'head', def: .05, wt: 3, col: '#7a848e', t: 2 }, lancing: { n: 'Láncing', s: 'body', def: .13, wt: 8, col: '#7a848e', t: 2 }, lanckeszt: { n: 'Láncos kesztyű', s: 'hand', def: .04, wt: 2, col: '#6a747e', t: 2 }, lancnadrag: { n: 'Láncnadrág', s: 'leg', def: .08, wt: 5, col: '#6a747e', t: 2 },
  ontsisak: { n: 'Öntöző-sisak', s: 'head', def: .08, wt: 5, col: '#9aa4ae', plate: 1, t: 3 }, ontvert: { n: 'Öntöző-vért', s: 'body', def: .2, wt: 14, col: '#9aa4ae', plate: 1, t: 3 }, ontkeszt: { n: 'Öntöző-vaskesztyű', s: 'hand', def: .06, wt: 3.5, col: '#8a949e', plate: 1, t: 3 }, ontlab: { n: 'Öntöző-lábvért', s: 'leg', def: .12, wt: 8, col: '#8a949e', plate: 1, t: 3 },
  napmaszk: { n: 'Napőr-maszk', s: 'head', def: .06, wt: 2, col: '#e8d8a0', mask: 1, t: 4 }, napkopeny: { n: 'Napőr-palást', s: 'body', def: .14, wt: 6, col: '#c8a84a', cape: '#e8e2d2', t: 4 },
  vakkendo: { n: 'Vak zarándok kendője', s: 'head', def: .01, wt: .3, col: '#e8e2d2', hood: 1, mask: 1, t: 2 },
  jegsisak: { n: 'Megfagyott sisak', s: 'head', def: .09, wt: 4, col: '#9ab8d0', plate: 1, t: 6 }, jegvert: { n: 'Jégpáncél', s: 'body', def: .22, wt: 12, col: '#9ab8d0', plate: 1, t: 6 },
  sosisak: { n: 'Sókatona sisakja', s: 'head', def: .11, wt: 6, col: '#d8ccc6', plate: 1, t: 7 }, sovert: { n: 'Sókatona mellvértje', s: 'body', def: .26, wt: 18, col: '#d8ccc6', plate: 1, cape: '#8a5a5a', t: 7 }, solab: { n: 'Sókatona lábvértje', s: 'leg', def: .14, wt: 10, col: '#c8bcb6', plate: 1, t: 7 }, sokeszt: { n: 'Sós vaskesztyű', s: 'hand', def: .07, wt: 4, col: '#c8bcb6', plate: 1, t: 7 },
  udvarvert: { n: 'Udvari őr páncélja', s: 'body', def: .18, wt: 11, col: '#4a4a56', plate: 1, cape: '#5a2a2a', t: 4 }, udvarsisak: { n: 'Udvari őr sisakja', s: 'head', def: .07, wt: 4, col: '#33333c', plate: 1, t: 4 },
  hajoskabat: { n: 'Hajóskabát', s: 'body', def: .1, wt: 5, col: '#2f3f5a', t: 5 }, kaktuszleg: { n: 'Tüskés lábszárvédő', s: 'leg', def: .1, wt: 4, col: '#34502e', t: 6 },
  /* egyéb */
  ko: { n: 'Érckő', s: 'misc', txt: 'Bence ezzel kovácsolja élesebbre a fegyvered.', t: 0 }, olaj: { n: 'Lámpaolaj', s: 'misc', txt: 'Kristóf a Világítótoronyban várja.', t: 0 }
};
const SLOTS = [['wep', 'Fegyver'], ['sh', 'Pajzs'], ['head', 'Fej'], ['body', 'Test'], ['hand', 'Kéz'], ['leg', 'Láb']];
const LOOT = Object.keys(IT).filter(k => IT[k].s !== 'misc' && k !== 'kertkes' && k !== 'kotenye' && !['kasza', 'sokard', 'fagytu', 'tuskekard', 'jegpajzs'].includes(k));
const BOSSLOOT = { gaspar: 'kasza', iszap: 'kannapajzs', denes: 'napvert', rozalia: 'fagytu', fereg: 'hajoskabat', kaktusz: 'tuskekard', klara: 'jegpajzs', lorinc: 'sokard', zsig: 'buzogany', molnar: 'fejsze' };
/* a játékos felszerelése és teherbírása */
function eqItem(s) { const k = P.eq && P.eq[s]; return k ? IT[k] : null; }
function invAdd(k, n = 1) { P.inv[k] = (P.inv[k] || 0) + n; }
function eqLoad() { let w = 0; for (const [s] of SLOTS) { const it = eqItem(s); if (it) w += it.wt || 0; } return w; }
const capOf = () => 22 + P.end * 6 + P.str * 2 + P.lv * .4;
/* könnyű (≤70%): fürge; közepes (≤100%): kicsit lassabb; túlterhelt: erősen lassul a mozgás, az ütés és az állóképesség */
function loadK() { const r = eqLoad() / capOf(); return { r, mv: r <= .7 ? 1 : r <= 1 ? .9 : Math.max(.42, .9 / (1 + 2.2 * (r - 1))), at: r <= 1 ? 1 : 1 + 1.4 * (r - 1), st: r <= .7 ? 1 : r <= 1 ? .85 : .6 / (1 + (r - 1)), roll: r <= .7 ? 1 : r <= 1 ? .85 : .55 }; }
function wepK() { const w = eqItem('wep') || IT.kertkes, lack = Math.max(0, (w.req || 0) - P.str); return { w, dm: lack ? Math.max(.45, 1 - .12 * lack) : 1, sp: (w.sp || 1) * (lack ? 1 + .1 * lack : 1) * loadK().at }; }
function defOf() { let d = 0; for (const s of ['head', 'body', 'hand', 'leg']) { const it = eqItem(s); if (it) d += it.def || 0; } return Math.min(.75, d); }
function equip(k) { const it = IT[k]; if (!it || it.s === 'misc' || !P.inv[k]) return; const cur = P.eq[it.s]; if (cur === k) { if (it.s !== 'wep') P.eq[it.s] = null; } else P.eq[it.s] = k; sfx(520, .08, 'triangle', .04); save(); }
/* zsákmány: tájszinthez illő tárgy, a gyűjtött tárgyakat ritkábban ismétli */
function lootFor(tier, q) { const pool = LOOT.filter(k => Math.abs(IT[k].t - tier) <= 1 && IT[k].t <= tier + 1); if (!pool.length) return null; const fresh = pool.filter(k => !P.inv[k]); const src = fresh.length && q < .75 ? fresh : pool; return src[Math.floor(q * 997) % src.length]; }
function gainItem(k, quiet) { if (!IT[k]) return; const neu = !P.inv[k]; invAdd(k); if (!quiet) { banner(neu ? 'ÚJ TÁRGY' : IT[k].n.toUpperCase(), neu ? IT[k].n + itemLine(IT[k]) : 'a tarisznyába került', 2.8); sfx(880, .4, 'triangle', .05, 300); } }
function itemLine(it) { if (it.s === 'wep') return ` · ${it.d} sebzés · ${it.wt} súly · ${it.req} erő`; if (it.s === 'sh') return ` · ${Math.round(it.blk * 100)}% védés · ${it.wt} súly`; if (it.def != null) return ` · ${Math.round(it.def * 100)}% védelem · ${it.wt} súly`; return ''; }
