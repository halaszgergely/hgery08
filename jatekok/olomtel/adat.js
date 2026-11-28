/* ÓLOMTÉL – adatok: anyagok, egységek, kutatás, törvények, rendelések, időjárás.
   Mennyiségek tonnában, ütemek óránként (játékóra), áram MW-ban. */

// k: f = folyadék (cső), g = gáz (cső), s = szilárd (szalag), r = közúton megy a raktárba
// thr: e hőmérséklet (°C) alatt a fűtetlen vezeték dermedni kezd; ar: átvételi ár (kiutalási pont / t)
export const M = {
  viz:      { n: 'Víz', k: 'f', c: 0x4f8fd0, thr: 0 },
  goz:      { n: 'Gőz', k: 'g', c: 0xe8e8e8, thr: -999 },
  nyersolaj:{ n: 'Nyersolaj', k: 'f', c: 0x2b2118, thr: -12 },
  sotalan:  { n: 'Sótalanított olaj', k: 'f', c: 0x3a2c1c, thr: -12 },
  forro:    { n: 'Forró olaj', k: 'f', c: 0x8a4a1c, thr: -30 },
  gaz:      { n: 'Fűtőgáz', k: 'g', c: 0xd8c860, thr: -999, ar: 0 },
  benzin:   { n: 'Benzin', k: 'f', c: 0xe0b040, thr: -70, ar: 2 },
  kerozin:  { n: 'Kerozin', k: 'f', c: 0xc8d0a0, thr: -47, ar: 2.5 },
  nygazolaj:{ n: 'Nyers gázolaj', k: 'f', c: 0x9a8a40, thr: -10, ar: 1 },
  dizel:    { n: 'Dízel', k: 'f', c: 0xb89a30, thr: -28, ar: 3 },
  pakura:   { n: 'Fűtőolaj (pakura)', k: 'f', c: 0x1a1512, thr: 15, ar: .6 },
  vgo:      { n: 'Vákuumgázolaj', k: 'f', c: 0x6a5a30, thr: 5 },
  bitumen:  { n: 'Bitumen', k: 'f', c: 0x0c0c0c, thr: 40, ar: 1.5 },
  szen:     { n: 'Szén', k: 's', c: 0x1c1c1e, thr: -38, ar: 0.5 },
  erc:      { n: 'Vasérc', k: 's', c: 0x8a4630, thr: -38 },
  meszko:   { n: 'Mészkő', k: 's', c: 0xc8c4b4, thr: -55 },
  koksz:    { n: 'Koksz', k: 's', c: 0x3a3a3e, thr: -55, ar: 1.5 },
  nyersvas: { n: 'Nyersvas', k: 's', c: 0x7a7068, thr: -999, ar: 2.5 },
  nyacel:   { n: 'Nyersacél', k: 's', c: 0x98a0a8, thr: -999, ar: 3.5 },
  salak:    { n: 'Salak', k: 's', c: 0x5a5650, thr: -55 },
  acel:     { n: 'Acéláru', k: 'r', c: 0xb0b8c0, ar: 5 },
  beton:    { n: 'Beton', k: 'r', c: 0x9a9a96 },
  alk:      { n: 'Alkatrész', k: 'r', c: 0xd0a040 },
  elelem:   { n: 'Élelem', k: 'r', c: 0x70b060 }
};
export const FOLY = Object.keys(M).filter(k => M[k].k === 'f' || M[k].k === 'g');
export const SZIL = Object.keys(M).filter(k => M[k].k === 's');
export const MIND = [...FOLY, ...SZIL];
export const KESZLET = ['acel', 'beton', 'alk', 'elelem'];
export const IMPORT = { beton: 2, acel: 7, alk: 9, elelem: 1.5 };   // rendelési ár / t

/* Egységek. be: bemenő csatlakozók {acc: anyagok, r: t/óra, cap, opt}, ki: kimenők {m, r, cap}.
   fo: létszám, pw: áramigény, bt: építési idő (óra), mel: felfűtési idő (óra), tor: hősokkra érzékeny,
   kell: 'olaj' | 'szen' | 'erc' | 'mesz' lelőhely vagy 'folyo' part, tech: kutatás, fix: nem építhető/bontható */
export const U = {
  reaktor:  { n: 'VR-2 reaktorblokk', kat: 'x', w: 5, h: 5, fo: 8, fix: 1, be: [{ acc: ['viz'], r: 0, cap: 120 }], ki: [{ m: 'goz', r: 0, cap: 60 }] },
  allomas:  { n: 'Rendező pályaudvar', kat: 'x', w: 6, h: 3, fo: 4, fix: 1, be: [{ acc: MIND, r: 0, cap: 1e9, n: 'Rakodó' }], ki: [] },

  vizkivet: { n: 'Vízkivételi mű', kat: 'en', w: 2, h: 2, c: { acel: 15, beton: 20, alk: 4 }, bt: 6, fo: 3, pw: 1, kell: 'folyo', be: [], ki: [{ m: 'viz', r: 40 }] },
  turbina:  { n: 'Turbinacsarnok', kat: 'en', w: 4, h: 3, c: { acel: 50, beton: 60, alk: 20 }, bt: 14, fo: 6, gen: 30, mel: 2, be: [{ acc: ['goz'], r: 10 }], ki: [] },
  kazan:    { n: 'Kazánház', kat: 'en', w: 3, h: 3, c: { acel: 30, beton: 40, alk: 10 }, bt: 10, fo: 5, pw: 1, mel: 3, be: [{ acc: ['gaz', 'pakura', 'szen', 'nygazolaj'], r: 2, n: 'Tüzelő' }], ki: [{ m: 'goz', r: 12 }] },
  hokozp:   { n: 'Hőközpont', kat: 'en', w: 2, h: 2, c: { acel: 20, beton: 25, alk: 6 }, bt: 6, fo: 2, pw: 1, be: [{ acc: ['goz'], r: 3 }], ki: [], ho: 6 },

  olajkut:  { n: 'Olajkút', kat: 'ol', w: 2, h: 2, c: { acel: 20, beton: 10, alk: 8 }, bt: 6, fo: 4, pw: 2, kell: 'olaj', be: [], ki: [{ m: 'nyersolaj', r: 20 }] },
  sotalan:  { n: 'Sótalanító', kat: 'ol', w: 2, h: 2, c: { acel: 20, beton: 15, alk: 6 }, bt: 6, fo: 3, pw: 2, be: [{ acc: ['nyersolaj'], r: 20 }, { acc: ['viz'], r: 2 }], ki: [{ m: 'sotalan', r: 20 }] },
  kemence:  { n: 'Csőkemence', kat: 'ol', w: 2, h: 3, c: { acel: 30, beton: 20, alk: 8 }, bt: 8, fo: 3, pw: 1, mel: 4, tor: 1, be: [{ acc: ['sotalan'], r: 20 }, { acc: ['gaz'], r: 1.2, opt: 1 }], ki: [{ m: 'forro', r: 20 }] },
  atm:      { n: 'Atmoszférikus torony', kat: 'ol', w: 3, h: 3, c: { acel: 60, beton: 40, alk: 15 }, bt: 14, fo: 6, pw: 2, mel: 6, tor: 1, be: [{ acc: ['forro'], r: 20 }, { acc: ['goz'], r: 3 }],
              ki: [{ m: 'gaz', r: 1.6 }, { m: 'benzin', r: 4 }, { m: 'kerozin', r: 2 }, { m: 'nygazolaj', r: 5 }, { m: 'pakura', r: 7.4 }] },
  vakuum:   { n: 'Vákuumtorony', kat: 'ol', w: 3, h: 3, c: { acel: 60, beton: 40, alk: 20 }, bt: 14, fo: 5, pw: 3, mel: 6, tor: 1, tech: 'vakuum', be: [{ acc: ['pakura'], r: 7.4 }, { acc: ['goz'], r: 2 }], ki: [{ m: 'vgo', r: 4.2 }, { m: 'bitumen', r: 3.2 }] },
  krakk:    { n: 'Katalitikus krakkoló', kat: 'ol', w: 3, h: 4, c: { acel: 90, beton: 50, alk: 35 }, bt: 18, fo: 6, pw: 4, mel: 8, tor: 1, tech: 'krakk', be: [{ acc: ['vgo'], r: 4.2 }], ki: [{ m: 'benzin', r: 2.3 }, { m: 'gaz', r: 0.9 }, { m: 'nygazolaj', r: 0.8 }] },
  kenment:  { n: 'Kénmentesítő', kat: 'ol', w: 2, h: 3, c: { acel: 40, beton: 25, alk: 15 }, bt: 10, fo: 4, pw: 2, mel: 3, tech: 'kenment', be: [{ acc: ['nygazolaj'], r: 6 }, { acc: ['gaz'], r: 0.3, opt: 1 }], ki: [{ m: 'dizel', r: 6 }] },
  faklya:   { n: 'Fáklya', kat: 'ol', w: 1, h: 1, c: { acel: 8, beton: 4 }, bt: 2, fo: 0, be: [{ acc: ['gaz'], r: 6 }], ki: [] },
  tartaly:  { n: 'Tartály', kat: 'lo', w: 2, h: 2, c: { acel: 25, beton: 10 }, bt: 4, fo: 0, tar: 'f', cap: 600 },

  szenbany: { n: 'Szénbánya', kat: 'ba', w: 3, h: 3, c: { acel: 30, beton: 30, alk: 8 }, bt: 10, fo: 10, pw: 2, kell: 'szen', be: [], ki: [{ m: 'szen', r: 8 }] },
  ercbany:  { n: 'Vasércbánya', kat: 'ba', w: 3, h: 3, c: { acel: 30, beton: 30, alk: 8 }, bt: 10, fo: 10, pw: 2, kell: 'erc', be: [], ki: [{ m: 'erc', r: 8 }] },
  meszbany: { n: 'Mészkőfejtő', kat: 'ba', w: 3, h: 2, c: { acel: 20, beton: 15, alk: 5 }, bt: 8, fo: 6, pw: 1, kell: 'mesz', be: [], ki: [{ m: 'meszko', r: 4 }] },
  depo:     { n: 'Ömlesztettáru-depó', kat: 'lo', w: 3, h: 2, c: { acel: 10, beton: 30 }, bt: 4, fo: 0, tar: 's', cap: 500 },

  kokszolo: { n: 'Kokszolómű', kat: 'ac', w: 4, h: 2, c: { acel: 60, beton: 60, alk: 15 }, bt: 16, fo: 6, pw: 1, mel: 10, tor: 1, tech: 'kohaszat', be: [{ acc: ['szen'], r: 8 }], ki: [{ m: 'koksz', r: 5.6 }, { m: 'gaz', r: 1.2 }] },
  koho:     { n: 'Nagyolvasztó', kat: 'ac', w: 4, h: 4, c: { acel: 120, beton: 100, alk: 30 }, bt: 24, fo: 10, pw: 5, mel: 14, tor: 1, tech: 'kohaszat', be: [{ acc: ['erc'], r: 8 }, { acc: ['koksz'], r: 4 }, { acc: ['meszko'], r: 2 }],
              ki: [{ m: 'nyersvas', r: 5 }, { m: 'salak', r: 2.5 }, { m: 'gaz', r: 2 }] },
  konverter:{ n: 'Konverteres acélmű', kat: 'ac', w: 3, h: 3, c: { acel: 80, beton: 60, alk: 30 }, bt: 18, fo: 6, pw: 3, mel: 4, tech: 'acelgy', be: [{ acc: ['nyersvas'], r: 5 }], ki: [{ m: 'nyacel', r: 4.5 }] },
  hengermu: { n: 'Hengermű', kat: 'ac', w: 5, h: 2, c: { acel: 80, beton: 70, alk: 35 }, bt: 18, fo: 8, pw: 6, tech: 'acelgy', be: [{ acc: ['nyacel'], r: 4.5 }], ki: [{ m: 'acel', r: 4.2 }] },
  betonuz:  { n: 'Salakbeton-üzem', kat: 'ac', w: 2, h: 2, c: { acel: 20, beton: 10, alk: 6 }, bt: 8, fo: 4, pw: 1, tech: 'hatter', be: [{ acc: ['salak'], r: 2.5 }, { acc: ['meszko'], r: 1 }], ki: [{ m: 'beton', r: 3 }] },
  gepmuh:   { n: 'Gépműhely', kat: 'ac', w: 3, h: 2, c: { acel: 40, beton: 30, alk: 5 }, bt: 10, fo: 6, pw: 2, tech: 'hatter', rakt: { acel: 1 }, be: [], ki: [{ m: 'alk', r: 0.6 }] },

  szallo:   { n: 'Panel munkásszálló', kat: 'va', w: 3, h: 2, c: { acel: 15, beton: 50 }, bt: 8, fo: 0, lak: 40, be: [], ki: [] },
  rendelo:  { n: 'Üzemi rendelő', kat: 'va', w: 2, h: 2, c: { acel: 10, beton: 30, alk: 5 }, bt: 8, fo: 4, pw: 1, agy: 12, be: [], ki: [] },
  kultur:   { n: 'Kultúrház', kat: 'va', w: 3, h: 2, c: { acel: 15, beton: 40 }, bt: 8, fo: 2, pw: 1, be: [], ki: [] },
  kutato:   { n: 'Tervezőintézet', kat: 'va', w: 3, h: 2, c: { acel: 20, beton: 40, alk: 8 }, bt: 10, fo: 6, pw: 1, kut: 1, be: [], ki: [] },
  uveghaz:  { n: 'Fűtött üvegház', kat: 'va', w: 4, h: 2, c: { acel: 30, beton: 15, alk: 5 }, bt: 8, fo: 8, pw: 1, tech: 'uveghaz', be: [{ acc: ['goz'], r: 2 }], ki: [{ m: 'elelem', r: 1.6 }] }
};
export const KAT = { en: 'Energia', ol: 'Olaj', ba: 'Bánya', ac: 'Kohászat', lo: 'Tárolás', va: 'Város' };

export const TECH = {
  kenment: { n: 'Kénmentesítés', p: 12 },
  szigeteles: { n: 'Csőszigetelés', p: 18 },
  vakuum: { n: 'Vákuumdesztilláció', p: 24 },
  uveghaz: { n: 'Fűtött üvegház', p: 18 },
  kohaszat: { n: 'Kohászat', p: 30 },
  hatter: { n: 'Háttéripar', p: 20, kell: 'kohaszat' },
  acelgy: { n: 'Acélgyártás', p: 36, kell: 'kohaszat' },
  krakk: { n: 'Katalitikus krakkolás', p: 40, kell: 'vakuum' },
  panel: { n: 'Szigetelt panel', p: 28 },
  reaktorfiz: { n: 'Reaktorfizika', p: 36 }
};

// a reaktor helyreállítási fokozatai: telj = a névleges hőteljesítmény hányada, sug = sugárzik-e, r = fűtött sugár (csempe)
export const REAKTOR = [
  { n: 'Sérült blokk', telj: .3, r: 6, sug: 1 },
  { n: 'Főkeringtető szivattyú', telj: .5, r: 7, sug: 1, c: { acel: 40, alk: 20 }, ora: 12 },
  { n: 'Hermetikus védőépület', telj: .7, r: 8, sug: 0, c: { beton: 150, acel: 60 }, ora: 24 },
  { n: 'Második gőzfejlesztő', telj: .85, r: 9, sug: 0, c: { acel: 120, alk: 50 }, ora: 24, tech: 'reaktorfiz' },
  { n: 'Szabályozórudak cseréje', telj: 1, r: 10, sug: 0, c: { alk: 80, acel: 40 }, ora: 24, tech: 'reaktorfiz' },
  { n: 'A második zóna újraindítása', telj: 1.5, r: 12, sug: 0, c: { acel: 300, beton: 200, alk: 120 }, ora: 48, tech: 'reaktorfiz' }
];
export const GOZ_NEVL = 40;   // t/óra gőz névleges teljesítményen

export const TORVENY = {
  muszak:   { n: 'Meghosszabbított műszak', le: '+25% munkaerő · nő az elégedetlenség' },
  fejadag:  { n: 'Csökkentett fejadag', le: '−40% élelemfogyasztás · több beteg, elégedetlenség' },
  gyerek:   { n: 'Tanoncmunka', le: '+15% munkaerő · remény −12' },
  potlek:   { n: 'Veszélyességi pótlék', le: 'remény +10, lassabb elégedetlenség · napi 25 kiutalási pont' },
  onkentes: { n: 'Sugárvédelmi önkéntesek', le: 'kétszer gyorsabb reaktorjavítás · fokozatonként 2 halott' },
  statarium:{ n: 'Statárium', le: 'az elégedetlenség gyorsan csökken · remény −20, legfeljebb 60' }
};

// ötnapos rendelések az Ellátási Főigazgatóságtól
export const RENDELES = [
  { k: { pakura: 300, benzin: 150 }, jut: 150 },
  { k: { dizel: 350, benzin: 350 }, jut: 250 },
  { k: { dizel: 450, bitumen: 200, koksz: 250 }, jut: 350 },
  { k: { nyersvas: 350, dizel: 450, kerozin: 200 }, jut: 450 },
  { k: { acel: 250, benzin: 550 }, jut: 600 },
  { k: { acel: 350, dizel: 550 }, jut: 800 }
];
export const NAPOK = 30;

// külső hőmérséklet (°C) a nap és óra függvényében; a hidegbetörések egyre mélyebbek, a 26–29. nap a Mélypont
const BETORES = [[4.5, 6.5, -12], [10.5, 13, -20], [17.5, 20.5, -27], [25.5, 29.5, -40]];
export function homerseklet(nap, ora) {
  const t = nap + ora / 24; let T;
  T = -18 - Math.min(t, 30) * .5 + 3.5 * Math.cos((ora - 14) / 24 * 2 * Math.PI);
  for (const [a, b, d] of BETORES) { const k = Math.max(0, Math.min(1, (t - a) / .5, (b - t) / .7)); T += d * k * k * (3 - 2 * k); }
  return T;
}
export const kovBetores = (nap, ora) => { const t = nap + ora / 24; for (const [a, b, d] of BETORES) { if (t < a) return { nap: a - t, d }; if (t < b) return { nap: 0, d, vege: b - t }; } return null; };
export const HOSZINT = ['Fagyos', 'Dermesztő', 'Hideg', 'Élhető', 'Meleg'];
