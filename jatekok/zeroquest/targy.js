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
/* ---------- tulajdonságok (Dark Souls mintára) és követelmények ---------- */
/* k, név, leírás, alapérték, árszorzó */
const STATS = [['vig', 'Életerő', 'Több életerő', 10, 1, 'Életerő'], ['mnd', 'Ráhangolódás', 'Több mana, több képességhely', 8, .95, 'Ráhangol.'], ['end', 'Állóképesség', 'Több erőnlét, gyorsabb töltődés', 10, .9, 'Állókép.'], ['vit', 'Teherbírás', 'Nagyobb teherbírás', 10, .8, 'Teherbír.'],
  ['str', 'Erő', 'Erő-fegyverek, nehéz páncélok', 10, 1, 'Erő'], ['dex', 'Ügyesség', 'Ügyességi fegyverek, gyorsaság', 10, 1, 'Ügyesség'], ['res', 'Ellenállás', 'Nagyobb védelem', 8, .75, 'Ellenáll.'], ['int', 'Értelem', 'Mágikus képességek ereje', 8, 1, 'Értelem'], ['fth', 'Hit', 'Csodák és gyógyítás ereje', 8, 1, 'Hit']];
const SBASE = Object.fromEntries(STATS.map(s => [s[0], s[3]]));
const statCost = k => { const s = STATS.find(q => q[0] === k), n = Math.max(0, (P[k] || s[3]) - s[3]); return Math.round(s[4] * 55 * (1 + .17 * n + .014 * n * n)); };
const charLv = () => 1 + STATS.reduce((a, s) => a + Math.max(0, (P[s[0]] || s[3]) - s[3]), 0);
const abSlots = () => clamp(1 + Math.floor((P.mnd - 8) / 6), 1, 4);
/* a származtatott értékek mindig a tulajdonságokból számolódnak */
function recalc() { const v = P.vig - 10; P.mhp = Math.round(100 + Math.min(v, 30) * 16 + Math.max(0, v - 30) * 6 + (P.hpB || 0)); P.mmp = Math.round(50 + (P.mnd - 8) * 7); P.mst = Math.round(100 + (P.end - 10) * 6); P.lv = charLv(); P.hp = Math.min(P.hp, P.mhp); P.mp = Math.min(P.mp, P.mmp); }
const SCL = { S: 1.1, A: .85, B: .62, C: .42, D: .26, E: .12 };
/* követelmények és skálázás: rq = tulajdonság-igény, sc = melyik tulajdonsággal erősödik */
const RQ = { kertkes: [{ str: 7, dex: 8 }, { dex: 'C', str: 'E' }], kalmartor: [{ str: 7, dex: 12 }, { dex: 'B' }], sarlo: [{ str: 10, dex: 10 }, { str: 'D', dex: 'D' }], fejsze: [{ str: 16, dex: 8 }, { str: 'C' }], landzsa: [{ str: 12, dex: 14 }, { dex: 'C', str: 'D' }],
  lovagkard: [{ str: 12, dex: 12 }, { str: 'C', dex: 'C' }], buzogany: [{ str: 18 }, { str: 'B' }], napkard: [{ str: 14, dex: 12, fth: 12 }, { str: 'D', dex: 'D', fth: 'C' }], kasza: [{ str: 16, dex: 18 }, { dex: 'B', str: 'D' }], pallos: [{ str: 24, dex: 10 }, { str: 'A' }],
  sokard: [{ str: 20, dex: 16 }, { str: 'C', dex: 'C' }], fagytu: [{ str: 8, dex: 20, int: 14 }, { dex: 'B', int: 'C' }], tuskekard: [{ str: 28 }, { str: 'S' }], nagykard: [{ str: 22, dex: 14 }, { str: 'B', dex: 'D' }], varjukarom: [{ str: 9, dex: 18 }, { dex: 'A' }], kutbot: [{ str: 8, int: 12 }, { int: 'B' }], csengo: [{ str: 6, fth: 12 }, { fth: 'B' }],
  fapajzs: [{ str: 8 }], kannapajzs: [{ str: 10 }], kerekpajzs: [{ str: 12 }], cimeres: [{ str: 16 }], napvert: [{ str: 14, fth: 10 }], jegpajzs: [{ str: 20 }], toronypajzs: [{ str: 28 }], varjupajzs: [{ str: 12, dex: 12 }], kutorpajzs: [{ str: 24 }],
  lancsisak: [{ str: 10 }], lancing: [{ str: 12 }], lanckeszt: [{ str: 10 }], lancnadrag: [{ str: 11 }], ontsisak: [{ str: 14 }], ontvert: [{ str: 18 }], ontkeszt: [{ str: 13 }], ontlab: [{ str: 15 }], udvarvert: [{ str: 16 }], udvarsisak: [{ str: 13 }],
  jegsisak: [{ str: 15, int: 10 }], jegvert: [{ str: 18, int: 10 }], jegkeszt: [{ str: 14 }], jeglab: [{ str: 15 }], sosisak: [{ str: 20 }], sovert: [{ str: 26 }], solab: [{ str: 22 }], sokeszt: [{ str: 20 }], napmaszk: [{ fth: 10 }], napkopeny: [{ str: 12, fth: 12 }], napkeszt: [{ str: 11 }], naplab: [{ str: 12 }],
  kutorsisak: [{ str: 22 }], kutorvert: [{ str: 28 }], kutorkeszt: [{ str: 20 }], kutorlab: [{ str: 24 }], varjusisak: [{ dex: 14 }], varjuvert: [{ str: 12, dex: 16 }], varjukeszt: [{ dex: 12 }], varjulab: [{ dex: 13 }],
  kmsuveg: [{ int: 12 }], kmkontos: [{ int: 14 }], kmkeszt: [{ int: 10 }], kmcsizma: [{ int: 10 }], zarkontos: [{ fth: 14 }], zarcsizma: [{ fth: 10 }], vakkendo: [{ fth: 10 }] };
Object.assign(IT, {
  nagykard: { n: 'Szárazvári nagykard', s: 'wep', d: 32, wt: 12, sp: 1.3, rch: 14, kind: 'pallos', col: '#c4ccd4', t: 4 }, varjukarom: { n: 'Varjúkarom', s: 'wep', d: 20, wt: 2.5, sp: .7, kind: 'kes', col: '#2a2a30', glow: '#a03040', t: 3 },
  kutbot: { n: 'A kútmester botja', s: 'wep', d: 9, wt: 3, sp: 1.05, kind: 'staff', col: '#7fd0ff', cat: 'int', t: 2, txt: 'Varázsbot. Az Értelemmel erősödő képességeket erősíti.' }, csengo: { n: 'Harmatcsengő', s: 'wep', d: 8, wt: 1.5, sp: .95, kind: 'kanna', col: '#e8d8a0', cat: 'fth', t: 2, txt: 'Szent csengő. A Hittel erősödő képességeket erősíti.' },
  varjupajzs: { n: 'Varjúlovag-pajzs', s: 'sh', blk: .74, wt: 5, stab: .95, col: '#24242a', rim: '#7a2a30', shape: 'cimer', t: 3 }, kutorpajzs: { n: 'Kútőr-falpajzs', s: 'sh', blk: .96, wt: 15, stab: .66, col: '#3a4a5e', rim: '#c8a050', shape: 'torony', t: 6 },
  jegkeszt: { n: 'Fagyott kesztyű', s: 'hand', def: .06, wt: 3, col: '#9ab8d0', plate: 1, t: 6 }, jeglab: { n: 'Fagyott lábvért', s: 'leg', def: .1, wt: 7, col: '#9ab8d0', plate: 1, t: 6 },
  napkeszt: { n: 'Napőr-kesztyű', s: 'hand', def: .05, wt: 2.5, col: '#d8b860', plate: 1, t: 4 }, naplab: { n: 'Napőr-lábvért', s: 'leg', def: .08, wt: 5, col: '#d8b860', plate: 1, t: 4 },
  kutorsisak: { n: 'Kútőr nagysisak', s: 'head', def: .12, wt: 7, col: '#5a6a7e', plate: 1, helmStyle: 'great', plume: '#2a4a7a', t: 6 }, kutorvert: { n: 'Kútőr-vért', s: 'body', def: .28, wt: 22, col: '#5a6a7e', plate: 1, tabard: '#2a4a7a', cape: '#1e2e48', t: 6 }, kutorkeszt: { n: 'Kútőr-vaskesztyű', s: 'hand', def: .08, wt: 5, col: '#5a6a7e', plate: 1, bulky: 1, t: 6 }, kutorlab: { n: 'Kútőr-lábvért', s: 'leg', def: .15, wt: 12, col: '#5a6a7e', plate: 1, bulky: 1, t: 6 },
  varjusisak: { n: 'Varjúlovag-sisak', s: 'head', def: .07, wt: 3, col: '#24242a', helmStyle: 'beak', t: 3 }, varjuvert: { n: 'Varjúlovag-vért', s: 'body', def: .17, wt: 10, col: '#24242a', plate: 1, feathers: 1, cape: '#16161a', t: 3 }, varjukeszt: { n: 'Varjúlovag-kesztyű', s: 'hand', def: .05, wt: 2.5, col: '#2a2a30', t: 3 }, varjulab: { n: 'Varjúlovag-csizma', s: 'leg', def: .08, wt: 5, col: '#2a2a30', t: 3 },
  kmsuveg: { n: 'Kútmester-süveg', s: 'head', def: .03, wt: 1, col: '#2e4a7a', helmStyle: 'hat', t: 3 }, kmkontos: { n: 'Kútmester-köntös', s: 'body', def: .08, wt: 4, col: '#2e4a7a', robe: 1, tabard: '#c8a050', t: 3 }, kmkeszt: { n: 'Kútmester-kesztyű', s: 'hand', def: .02, wt: .8, col: '#1e2e48', t: 3 }, kmcsizma: { n: 'Kútmester-saru', s: 'leg', def: .03, wt: 1.2, col: '#3a2a1c', t: 3 },
  zarkontos: { n: 'Zarándokköntös', s: 'body', def: .07, wt: 3.5, col: '#e8e2d2', robe: 1, tabard: '#a89070', t: 2 }, zarcsizma: { n: 'Zarándoksaru', s: 'leg', def: .02, wt: 1, col: '#8a7a5a', t: 2 } });
for (const k in RQ) if (IT[k]) { IT[k].rq = RQ[k][0]; if (RQ[k][1]) IT[k].sc = RQ[k][1]; }
for (const k of ['ontsisak', 'udvarsisak', 'jegsisak', 'lancsisak']) IT[k].helmStyle = IT[k].helmStyle || (k === 'udvarsisak' ? 'plume' : 'kettle'); IT.sosisak.helmStyle = 'great'; IT.sovert.tabard = '#7a2a2a'; IT.ontvert.tabard = '#2a5a8a'; IT.udvarvert.tabard = '#5a2a2a'; IT.napmaszk.helmStyle = 'sun'; IT.sokeszt.bulky = 1; IT.solab.bulky = 1; IT.ontlab.bulky = 1;
const lacks = it => it && it.rq ? Object.entries(it.rq).filter(([k, v]) => (P[k] || 0) < v) : [];
const SNM = Object.fromEntries(STATS.map(s => [s[0], s[1]]));
/* ellenfelek ritkán a saját felszerelésüket ejtik */
const EDROP = { ksz: ['kalmartor', 'borsapka'], szalma: ['sarlo'], lapi: ['sarlo', 'kannapajzs'], vak: ['vakkendo', 'zarkontos', 'zarcsizma', 'csengo'], napor: ['landzsa', 'napmaszk', 'napkopeny', 'napkeszt', 'naplab', 'napvert'], fenyv: ['kutbot', 'kmsuveg'],
  szobor: ['lovagkard'], udvar: ['lovagkard', 'udvarvert', 'udvarsisak', 'cimeres', 'nagykard'], homoksz: ['kmkontos', 'kmkeszt', 'kmcsizma', 'kutbot'], hajos: ['hajoskabat', 'kalmartor', 'fejsze'], hivo: ['kaktuszleg', 'csengo'], tuskev: ['kaktuszleg'],
  fagy: ['fejsze', 'jegsisak', 'jeglab'], jegm: ['jegkeszt', 'kutbot', 'kmsuveg'], sokat: ['sosisak', 'sovert', 'solab', 'sokeszt', 'toronypajzs'], sopap: ['kmkontos'], vadasz: ['varjusisak', 'varjuvert', 'varjukeszt', 'varjulab', 'varjukarom', 'varjupajzs'], kutor: ['kutorsisak', 'kutorvert', 'kutorkeszt', 'kutorlab', 'kutorpajzs'] };
/* ---------- képességek: tekercsként találhatók, és a fegyverekhez hasonlóan kell felvenni őket ---------- */
const AB = {
  orveny: { n: 'Örvényvágás', mp: 25, sch: 'str', rq: { str: 10 }, ic: '🌀', txt: 'Körbevágsz a fegyvereddel. Az Erő élesíti.' },
  viz: { n: 'Harmatlövedék', mp: 18, sch: 'int', rq: { int: 10 }, ic: '💧', txt: 'Egy csepp, sebesen. Az Értelem erősíti.' },
  dofes: { n: 'Rohamdöfés', mp: 20, sch: 'dex', rq: { dex: 14 }, ic: '➹', txt: 'Előrevetődsz, és átdöfsz mindenen, ami az utadba áll.' },
  renges: { n: 'Földrenges', mp: 32, sch: 'str', rq: { str: 18 }, ic: '⛰', txt: 'A földbe sújtasz; a közelben mindenki megtántorodik.' },
  tuske: { n: 'Tüskezápor', mp: 24, sch: 'int', rq: { int: 14 }, ic: '✳', txt: 'A Kaktuszkirály tanítása: hét tüske, legyezőben.' },
  fagy: { n: 'Fagyos lehelet', mp: 28, sch: 'int', rq: { int: 18 }, ic: '❄', txt: 'Klára jege: megsebzi és lelassítja az előtted állókat.' },
  gyogy: { n: 'Gyógyító harmat', mp: 34, sch: 'fth', rq: { fth: 12 }, ic: '✚', txt: 'Harmat hull rád, és lassan visszaadja az erődet.' },
  burok: { n: 'Harmatburok', mp: 30, sch: 'fth', rq: { fth: 14 }, ic: '◍', txt: 'Vízburok: egy ideig kevesebb sebzést kapsz.' },
  arnyek: { n: 'Árnyéklépés', mp: 16, sch: 'dex', rq: { dex: 16 }, ic: '⇢', txt: 'Pál árnyéka: egy pillanatra eltűnsz, és arrébb bukkansz fel.' },
  nap: { n: 'Napkorong', mp: 40, sch: 'fth', rq: { fth: 20 }, ic: '☀', txt: 'Dénes ítélete: egy nap zuhan oda, ahová nézel.' },
  kialtas: { n: 'Harci kiáltás', mp: 20, sch: 'str', rq: { str: 14 }, ic: '📯', txt: 'Ambrus lovag csatakiáltása: egy ideig erősebben ütsz.' } };
const ABLOOT = Object.keys(AB).filter(k => k !== 'orveny' && k !== 'viz');
const BOSSAB = { gaspar: 'kialtas', iszap: 'gyogy', denes: 'nap', rozalia: 'arnyek', fereg: 'renges', kaktusz: 'tuske', klara: 'fagy', lorinc: 'dofes' };
function abPow(k) { const a = AB[k], s = P[a.sch] || 10, w = eqItem('wep'), cat = w && w.cat === a.sch ? 1.3 : 1; return (1 + Math.max(0, s - 10) * .045) * cat * (lacks(a).length ? .6 : 1); }
function gainScroll(k, quiet) { if (!AB[k]) return; const neu = !P.scr[k]; P.scr[k] = 1; if (!quiet) { banner(neu ? 'ÚJ TEKERCS' : 'TEKERCS', AB[k].n + ' · ' + AB[k].mp + ' mana', 3); sfx(990, .5, 'triangle', .05, 300); } if (neu) { const i = P.ab.indexOf(null); if (i >= 0 && i < abSlots()) P.ab[i] = k; } save(); }
function equipAb(k) { if (!P.scr[k]) return; const i = P.ab.indexOf(k); if (i >= 0) { P.ab[i] = null; } else { let j = P.ab.slice(0, abSlots()).indexOf(null); if (j < 0) j = abSlots() - 1; P.ab[j] = k; } sfx(520, .08, 'triangle', .04); save(); }

const SLOTS = [['wep', 'Fegyver'], ['sh', 'Pajzs'], ['head', 'Fej'], ['body', 'Test'], ['hand', 'Kéz'], ['leg', 'Láb']];
const LOOT = Object.keys(IT).filter(k => IT[k].s !== 'misc' && k !== 'kertkes' && k !== 'kotenye' && !['kasza', 'sokard', 'fagytu', 'tuskekard', 'jegpajzs'].includes(k));
const BOSSLOOT = { gaspar: 'kasza', iszap: 'kannapajzs', denes: 'napvert', rozalia: 'fagytu', fereg: 'hajoskabat', kaktusz: 'tuskekard', klara: 'jegpajzs', lorinc: 'sokard', zsig: 'buzogany', molnar: 'fejsze' };
/* a játékos felszerelése és teherbírása */
function eqItem(s) { const k = P.eq && P.eq[s]; return k ? IT[k] : null; }
function invAdd(k, n = 1) { P.inv[k] = (P.inv[k] || 0) + n; }
function eqLoad() { let w = 0; for (const [s] of SLOTS) { const it = eqItem(s); if (it) w += it.wt || 0; } return w; }
const capOf = () => 30 + (P.vit - 10) * 2.6 + (P.end - 10) * .4;
/* könnyű (≤70%): fürge; közepes (≤100%): kicsit lassabb; túlterhelt: erősen lassul a mozgás, az ütés és az állóképesség */
function loadK() { const r = eqLoad() / capOf(); return { r, mv: r <= .7 ? 1 : r <= 1 ? .9 : Math.max(.42, .9 / (1 + 2.2 * (r - 1))), at: r <= 1 ? 1 : 1 + 1.4 * (r - 1), st: r <= .7 ? 1 : r <= 1 ? .85 : .6 / (1 + (r - 1)), roll: r <= .7 ? 1 : r <= 1 ? .85 : .55 }; }
function wepK() { const w = eqItem('wep') || IT.kertkes, lk = lacks(w), lack = lk.reduce((a, [k, v]) => a + v - (P[k] || 0), 0); let sc = 1; for (const k in w.sc || {}) sc += SCL[w.sc[k]] * clamp(((P[k] || 10) - 10) / 40, 0, 1.2); return { w, dm: (lack ? Math.max(.4, 1 - .06 * lack) : 1) * sc, sp: (w.sp || 1) * (lack ? 1 + .05 * lack : 1) * (1 - clamp((P.dex - 10) * .004, 0, .15)) * loadK().at }; }
function defOf() { let d = 0; for (const s of ['head', 'body', 'hand', 'leg']) { const it = eqItem(s); if (it) d += (it.def || 0) * (lacks(it).length ? .5 : 1); } d += clamp((P.res - 8) * .004, 0, .12); if (R && R.burok > 0) d += .35; return Math.min(.8, d); }
function equip(k) { if (k[0] === '@') return equipAb(k.slice(1)); const it = IT[k]; if (!it || it.s === 'misc' || !P.inv[k]) return; const lk = lacks(it); if (lk.length) say('Nem elég: ' + lk.map(([q, v]) => SNM[q] + ' ' + v).join(', ') + ' – gyengébben működik.'); const cur = P.eq[it.s]; if (cur === k) { if (it.s !== 'wep') P.eq[it.s] = null; } else P.eq[it.s] = k; sfx(520, .08, 'triangle', .04); save(); }
/* zsákmány: tájszinthez illő tárgy, a gyűjtött tárgyakat ritkábban ismétli */
function lootFor(tier, q) { const pool = LOOT.filter(k => Math.abs(IT[k].t - tier) <= 1 && IT[k].t <= tier + 1); if (!pool.length) return null; const fresh = pool.filter(k => !P.inv[k]); const src = fresh.length && q < .75 ? fresh : pool; return src[Math.floor(q * 997) % src.length]; }
function gainItem(k, quiet) { if (!IT[k]) return; const neu = !P.inv[k]; invAdd(k); if (!quiet) { banner(neu ? 'ÚJ TÁRGY' : IT[k].n.toUpperCase(), neu ? IT[k].n + itemLine(IT[k]) : 'a tarisznyába került', 2.8); sfx(880, .4, 'triangle', .05, 300); } }
const rqTxt = it => it.rq ? Object.entries(it.rq).map(([k, v]) => SNM[k].slice(0, 3) + ' ' + v).join(' ') : '';
function itemLine(it) { if (it.s === 'wep') return ` · ${it.d} sebzés · ${it.wt} súly · ${rqTxt(it)}`; if (it.s === 'sh') return ` · ${Math.round(it.blk * 100)}% védés · ${it.wt} súly`; if (it.def != null) return ` · ${Math.round(it.def * 100)}% védelem · ${it.wt} súly`; return ''; }
