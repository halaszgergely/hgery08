/* HGWS Légi Öntözés – adatok: vetület, gépek, repülőterek, küldetések.
   Új gép felvétele: egy új elem a GEPEK listába (fizika: kind), és egy modell a modellek.js MODELLEK táblájába. */

// vetület: a Mozdonyvezető tájadataival egyező (x kelet, z dél, méterben; origó: k. h. 16°, é. sz. 48,65°)
export const KX = 111320 * Math.cos(47.2 * Math.PI / 180), KY = 111190, LON0 = 16, LAT0 = 48.65;
export const P = (lon, lat) => [(lon - LON0) * KX, (LAT0 - lat) * KY];
export const LL = (x, z) => [LON0 + x / KX, LAT0 - z / KY];
export const W_MAX = 527600, H_MAX = 329900;

export const SZIN = { sarga: 0xf2c230, zold: 0x2f9e4f, kek: 0x2aa7d9, feher: 0xf3f1ea, sotet: 0x2a2f36, fem: 0x9aa3ad, piros: 0xd9413a, fekete: 0x15181c, uveg: 0x7fd3f0 };

/* gépek
   kind: plane | gyro | glider | heli | coax | tandem | drone | airship | rocket
   tomeg: üres tömeg (kg) · tolo: max tolóerő (N) · szarny: szárnyfelület (m²) · ford: fordulékonyság (szorzó)
   vmax, vstall: m/s · tartaly: liter · perm: permetszélesség (m) · szoras: a permet szóródása (1 = pontos)
   felsz: mire szállhat le (fu = füves pálya, beton = betonpálya, nagy = csak nagy reptér, viz = vízfelszín, terep = sík terep)
   palya: minimális pályahossz (m) · tolt: hogyan töltődik (repter, szippant, szippantNagy, vizreSzall, zsak)
   pont: a feloldás ára küldetéspontban (0 = alapból elérhető) · k: pontszorzó a ranglistán (a nagy tartály ne nyerjen mindig) */
export const GEPEK = [
  { id: 'permetezo', nev: 'HGWS Permetező', tipus: 'Repülőgép', kind: 'plane', hang: 'prop', tomeg: 900, tolo: 5200, szarny: 16, ford: 1, vmax: 62, vstall: 21, tartaly: 600, perm: 18, szoras: .9,
    felsz: ['fu', 'beton', 'terep'], palya: 250, tolt: ['repter', 'szippant'], pont: 0, k: 1.15, leir: 'Lassú, stabil, könnyen vezethető kis légcsavaros gép. Keskeny, pontos permet, füves pályán is leszáll.' },
  { id: 'ancsa', nev: 'HGWS Ancsa', tipus: 'Repülőgép', kind: 'plane', hang: 'radial', tomeg: 3400, tolo: 11500, szarny: 71, ford: .8, vmax: 70, vstall: 16, tartaly: 1500, perm: 30, szoras: 1,
    felsz: ['fu', 'beton', 'terep'], palya: 180, tolt: ['repter', 'szippant'], pont: 0, k: 1.05, leir: 'Kétfedelű, csillagmotoros öreg mezőgazdasági gép. Nagyon lassan is repül, rövid pályáról is felszáll.' },
  { id: 'vadasz', nev: 'HGWS Vadászöntöző', tipus: 'Repülőgép', kind: 'plane', hang: 'jet', tomeg: 8500, tolo: 76000, szarny: 28, ford: 2.2, vmax: 300, vstall: 62, tartaly: 900, perm: 24, szoras: 2.4, uteg: 2,
    felsz: ['beton'], palya: 900, tolt: ['repter', 'szippant'], pont: 900, k: 1.1, leir: 'Sugárhajtású vadászöntöző utánégetővel (Tab). Nagyon gyors és fordulékony, de nagy sebességnél szétszóródik a permet.' },
  { id: 'concorde', nev: 'HGWS Szuperszonikus Locsoló', tipus: 'Repülőgép', kind: 'plane', hang: 'jet', tomeg: 52000, tolo: 330000, szarny: 300, ford: .45, vmax: 420, vstall: 85, tartaly: 9000, perm: 160, szoras: 2.2, felho: 1, uteg: 1.4,
    felsz: ['nagy'], palya: 2400, tolt: ['repter'], pont: 2600, k: .8, leir: 'Csőrös orrú delta. Egyenesben a leggyorsabb, de lomhán fordul. Nagy magasságból szórja szét a vizet – felhőöntözés.' },
  { id: 'jumbo', nev: 'HGWS 747 Öntöző Óriás', tipus: 'Repülőgép', kind: 'plane', hang: 'jet4', tomeg: 180000, tolo: 900000, szarny: 520, ford: .35, vmax: 260, vstall: 72, tartaly: 70000, perm: 260, szoras: 1.4,
    felsz: ['nagy'], palya: 2700, tolt: ['repter', 'szippantNagy'], pont: 3400, k: .62, leir: 'Négyhajtóműves óriás. Lassan reagál, de egy áthúzással egész mezősorokat öntöz. Vizet csak nagy tavon vesz fel.' },
  { id: 'herkules', nev: 'HGWS Teherszállító Öntöző', tipus: 'Repülőgép', kind: 'plane', hang: 'turboprop', tomeg: 36000, tolo: 160000, szarny: 162, ford: .55, vmax: 150, vstall: 46, tartaly: 15000, perm: 70, szoras: 1.2, ramp: 1,
    felsz: ['beton', 'fu'], palya: 1100, tolt: ['repter', 'szippant'], pont: 1700, k: .78, leir: 'Négy légcsavaros teherszállító. A 747-nél fordulékonyabb, rövidebb pályán is leszáll; a hátsó rámpán egy tömbben ömlik ki a víz.' },
  { id: 'ketelt', nev: 'HGWS Kétéltű', tipus: 'Repülőgép', kind: 'plane', hang: 'turboprop', tomeg: 12500, tolo: 52000, szarny: 100, ford: .75, vmax: 105, vstall: 33, tartaly: 6000, perm: 50, szoras: 1.1,
    felsz: ['beton', 'viz'], palya: 900, tolt: ['repter', 'szippant', 'vizreSzall'], pont: 1200, k: .85, leir: 'Kétéltű oltórepülő: vízre száll, siklás közben a tó felszínén töltődik. A tűzoltás legjobb gépe.' },
  { id: 'hidro', nev: 'HGWS Hidroplán', tipus: 'Repülőgép', kind: 'plane', hang: 'prop', tomeg: 1100, tolo: 6000, szarny: 18, ford: .95, vmax: 58, vstall: 22, tartaly: 450, perm: 16, szoras: 1,
    felsz: ['viz'], palya: 300, tolt: ['vizreSzall'], pont: 500, k: 1.1, leir: 'Úszótalpas kis gép, csak vízen száll fel és le – bármelyik tavon vagy a Dunán. Kényelmes felfedező gép.' },
  { id: 'vitorlazo', nev: 'HGWS Vitorlázó Locsoló', tipus: 'Repülőgép', kind: 'glider', hang: 'glider', tomeg: 300, tolo: 0, szarny: 13, ford: 1.1, vmax: 75, vstall: 19, tartaly: 120, perm: 12, szoras: .9,
    felsz: ['fu', 'beton', 'terep'], palya: 150, tolt: ['repter'], pont: 700, k: 1.3, leir: 'Motor nélküli vitorlázó. Termikekben emelkedik a dombok és meleg mezők felett. Csörlős indítás a reptéren (V).' },
  { id: 'kopter', nev: 'HGWS Locsolókopter', tipus: 'Helikopter', kind: 'heli', hang: 'rotor', tomeg: 2300, tolo: 46000, ford: 1, vmax: 72, tartaly: 1200, perm: 8, szoras: .7, zsak: 14,
    felsz: ['beton', 'fu', 'terep', 'heli'], tolt: ['repter', 'zsak'], pont: 0, k: 1.1, leir: 'Klasszikus helikopter lengő vízzsákkal. Lebeg, egy helyben fordul, bárhol leszáll. Pontszerű, precíz öntözés.' },
  { id: 'kamov', nev: 'HGWS Ka-26 „Kamov”', tipus: 'Helikopter', kind: 'coax', hang: 'coax', tomeg: 2100, tolo: 42000, ford: .9, vmax: 62, tartaly: 900, perm: 26, szoras: .8,
    felsz: ['beton', 'fu', 'terep', 'heli'], tolt: ['repter'], pont: 300, k: 1.15, leir: 'Koaxiális, farokrotor nélküli mezőgazdasági helikopter. Nagyon stabilan lebeg, permetezőkeretével széles, egyenletes sávban öntöz.' },
  { id: 'chinook', nev: 'HGWS Duplarotoros Vízhordó', tipus: 'Helikopter', kind: 'tandem', hang: 'tandem', tomeg: 10500, tolo: 210000, ford: .55, vmax: 80, tartaly: 9500, perm: 30, szoras: .9, zsak: 22,
    felsz: ['beton', 'fu', 'terep', 'heli'], tolt: ['repter', 'zsak'], pont: 2000, k: .8, leir: 'Két rotoros nehézhelikopter. Stabil, de lomha; a legnagyobb helikopteres vízzsák.' },
  { id: 'giro', nev: 'HGWS Autogiró', tipus: 'Forgószárnyas', kind: 'gyro', hang: 'prop', tomeg: 380, tolo: 2700, szarny: 7, ford: 1.2, vmax: 45, vstall: 9, tartaly: 180, perm: 10, szoras: .8,
    felsz: ['fu', 'beton', 'terep'], palya: 60, tolt: ['repter'], pont: 0, k: 1.25, leir: 'Nyitott kis forgószárnyas. Nem tud lebegni, de nagyon lassan repül, és nagyon rövid pályán is leszáll. Kezdőbarát.' },
  { id: 'dron', nev: 'HGWS Locsolódrón', tipus: 'Drón', kind: 'drone', hang: 'drone', tomeg: 60, tolo: 2200, ford: 1, vmax: 18, tartaly: 40, perm: 6, szoras: .4, akku: 360,
    felsz: ['beton', 'fu', 'terep', 'heli'], tolt: ['repter'], pont: 400, k: 1.35, leir: 'Multirotoros mezőgazdasági drón: nagyon stabil, centiméterre pontos, de kicsi a tartálya és rövid az akkuja.' },
  { id: 'leghajo', nev: 'HGWS Öntözőléghajó', tipus: 'Extrém', kind: 'airship', hang: 'airship', tomeg: 9000, tolo: 9000, ford: .3, vmax: 30, tartaly: 22000, perm: 40, szoras: 1,
    felsz: ['arboc'], tolt: ['repter'], pont: 2400, k: .75, leir: 'Lassú zeppelin hatalmas tartállyal. Egy helyben lebeg, de a szél sodorja. HGWS kikötőárbochoz köt ki.' },
  { id: 'slag', nev: 'HGWS Rakétás Kerti Slag', tipus: 'Extrém', kind: 'rocket', hang: 'rocket', tomeg: 120, tolo: 9000, szarny: 3, ford: 2.6, vmax: 380, vstall: 30, tartaly: 60, perm: 6, szoras: 3,
    felsz: ['beton', 'fu', 'terep'], palya: 100, tolt: ['repter'], pont: 5000, k: 0, csakSzabad: 1, leir: 'Rakétahajtású repülő locsolócső. Iszonyú gyors és kezelhetetlen. Csak szabad repülésben.' },
  { id: 'zero', nev: 'Zero különgépe', tipus: 'Titkos', kind: 'plane', hang: 'zero', tomeg: 2600, tolo: 26000, szarny: 26, ford: 1.5, vmax: 150, vstall: 26, tartaly: 2400, perm: 40, szoras: .9,
    felsz: ['fu', 'beton', 'terep', 'viz'], palya: 250, tolt: ['repter', 'szippant', 'vizreSzall'], pont: -1, titkos: 1, k: 1, leir: 'Valahol az ország felett, egy hatalmas felirat alatt rejtőzött. Kiegyensúlyozott mindenes.' },
];
export const GEP = Object.fromEntries(GEPEK.map(g => [g.id, g]));
export const FORGO = k => k === 'heli' || k === 'coax' || k === 'tandem' || k === 'drone';

/* repülőterek: hdg = futópálya iránya (fok, északtól az óra járásával), len/wid méterben
   tip: beton | fu | viz | heli | arboc · meret: nagy | kozep | kis · allomas: HGWS víztöltő */
// a repterek helye: lakott területen kívül, épület és út nélküli, sík terepen (a Holtváros OSM-adataiból és a domborzatból keresve)
export const REPTEREK = [
  { id: 'miskolc', nev: 'Miskolc – HGWS főbázis', lon: 20.8144, lat: 48.1449, hdg: 358, len: 1500, wid: 40, tip: 'beton', meret: 'kozep', allomas: 1, fo: 1, heli: 1, arboc: 1, fu2: 1 },
  { id: 'budapest', nev: 'Budapest – Alsónémedi', lon: 19.1413, lat: 47.2993, hdg: 135, len: 3200, wid: 55, tip: 'beton', meret: 'nagy', allomas: 1, heli: 1 },
  { id: 'debrecen', nev: 'Debrecen', lon: 21.6027, lat: 47.4494, hdg: 107, len: 2600, wid: 50, tip: 'beton', meret: 'nagy', allomas: 1, heli: 1, arboc: 1 },
  { id: 'sarmellek', nev: 'Sármellék (Balaton)', lon: 17.1917, lat: 46.6969, hdg: 105, len: 2500, wid: 45, tip: 'beton', meret: 'kozep', allomas: 1, heli: 1 },
  { id: 'pecs', nev: 'Pécs-Pogány', lon: 18.2748, lat: 45.955, hdg: 155, len: 1500, wid: 30, tip: 'beton', meret: 'kozep', allomas: 1 },
  { id: 'gyor', nev: 'Győr-Pér', lon: 17.8147, lat: 47.6259, hdg: 130, len: 1600, wid: 30, tip: 'beton', meret: 'kozep', allomas: 1 },
  { id: 'kecskemet', nev: 'Kecskemét', lon: 19.7374, lat: 46.8806, hdg: 80, len: 2500, wid: 45, tip: 'beton', meret: 'kozep', allomas: 1 },
  { id: 'hortobagy', nev: 'Hortobágy füves pálya', lon: 21.1336, lat: 47.5724, hdg: 150, len: 700, wid: 30, tip: 'fu', meret: 'kis', allomas: 1, heli: 1 },
  { id: 'nyireg', nev: 'Nyíregyháza', lon: 21.6903, lat: 47.9906, hdg: 315, len: 1000, wid: 30, tip: 'fu', meret: 'kis', allomas: 1 },
  { id: 'szeged', nev: 'Szeged', lon: 20.0574, lat: 46.2553, hdg: 250, len: 1100, wid: 30, tip: 'fu', meret: 'kis', allomas: 1, heli: 1 },
  { id: 'kiskun', nev: 'Kiskunfélegyháza füves', lon: 19.8783, lat: 46.7419, hdg: 320, len: 650, wid: 30, tip: 'fu', meret: 'kis', allomas: 1 },
  { id: 'zala', nev: 'Zalaegerszeg-Andráshida', lon: 16.7754, lat: 46.8802, hdg: 105, len: 800, wid: 30, tip: 'fu', meret: 'kis', allomas: 1 },
  { id: 'eger', nev: 'Eger – Bükki helipad', lon: 20.4274, lat: 47.9175, hdg: 60, len: 60, wid: 60, tip: 'heli', meret: 'kis', allomas: 1, heli: 1 },
  { id: 'lillafured', nev: 'Bükk (Lillafüred) – HGWS töltőállomás', lon: 20.5843, lat: 48.0595, hdg: 0, len: 60, wid: 60, tip: 'heli', meret: 'kis', allomas: 1, heli: 1 },
  { id: 'balaton', nev: 'Balaton – vízi leszálló (Siófok)', lon: 18.03, lat: 46.93, hdg: 60, len: 3000, wid: 200, tip: 'viz', meret: 'kozep', allomas: 1 },
  { id: 'tiszato', nev: 'Tisza-tó – vízi leszálló', lon: 20.6499, lat: 47.62, hdg: 0, len: 2200, wid: 200, tip: 'viz', meret: 'kozep', allomas: 1 },
  { id: 'duna', nev: 'Duna – vízi leszálló (Tököl)', lon: 18.9474, lat: 47.3277, hdg: 30, len: 2000, wid: 150, tip: 'viz', meret: 'kis', allomas: 1 },
];
for (const r of REPTEREK) { const [x, z] = P(r.lon, r.lat); r.x = x; r.z = z; const a = r.hdg * Math.PI / 180; r.dx = Math.sin(a); r.dz = -Math.cos(a); }
export const REPTER = Object.fromEntries(REPTEREK.map(r => [r.id, r]));

// nevezetességek és vizek (a vizeket a tájraszter adja; ezek csak a feliratok és a térkép)
export const VIZEK = [['Balaton', 17.75, 46.83], ['Velencei-tó', 18.6, 47.2], ['Tisza-tó', 20.65, 47.61], ['Fertő-tó', 16.75, 47.71], ['Duna', 18.95, 46.6], ['Tisza', 20.2, 46.75],
  ['Dráva', 17.55, 45.83], ['Rába', 17.3, 47.4], ['Sajó', 20.95, 48.2], ['Körösök', 20.9, 46.85]];
export const NEVEZETES = {
  parlament: [19.0457, 47.507, 18], diosgyor: [20.6929, 48.0961, 0],
  hidak: [[19.0437, 47.499, 19.0414, 47.4986, 19.0478, 47.4993], [19.0478, 47.4906, 19.0446, 47.4911, 19.0517, 47.4905], [19.0532, 47.4865, 19.0498, 47.4846, 19.0566, 47.4873], [19.0450, 47.5130, 19.0389, 47.5146, 19.0529, 47.5130], [19.0748, 47.4677, 19.0662, 47.4663, 19.0836, 47.4698]],
};
// a titkos felirat (Kiskunság, egy szántóföld mintázata)
export const ZERO_HELY = P(19.62, 46.62);

/* küldetések – mod: ontozes | tuz | precizio | verseny */
export const KULDETESEK = [
  { id: 'borsod', mod: 'ontozes', nev: 'Borsodi bemelegítés', leir: 'Az első bevetés a bázis közelében: néhány kiszáradt parcella a Sajó völgyében.', lon: 20.86, lat: 48.17, repter: 'miskolc', ido: 360, mezok: 4, haz: 4, ajanl: ['permetezo', 'ancsa'] },
  { id: 'hortobagy', mod: 'ontozes', nev: 'Hortobágyi szárazság', leir: 'A pusztán napok óta nem esett. Nagy, nyílt parcellák – ideális a nagyobb gépeknek is.', lon: 21.1, lat: 47.6, repter: 'hortobagy', ido: 480, mezok: 7, haz: 6, nagy: 1, ajanl: ['ancsa', 'herkules'] },
  { id: 'bacs', mod: 'ontozes', nev: 'Bács-Kiskun locsolási vészhelyzet', leir: 'Homokos, szétszórt mezők Kecskemét körül. Gyorsan kell dolgozni.', lon: 19.72, lat: 46.84, repter: 'kecskemet', ido: 480, mezok: 8, haz: 8, nagy: 1, ajanl: ['vadasz', 'ancsa'] },
  { id: 'zala', mod: 'ontozes', nev: 'Zalai dombok', leir: 'Kicsi, dombok közé szorult kertek és szőlők. Pontosság kell.', lon: 16.86, lat: 46.84, repter: 'zala', ido: 420, mezok: 6, haz: 8, kicsi: 1, ajanl: ['kamov', 'permetezo'] },
  { id: 'nyirseg', mod: 'ontozes', nev: 'Nyírségi homok', leir: 'A homok mindent elnyel – a tó és a reptér között ingázva kell tartani a tempót.', lon: 21.78, lat: 47.9, repter: 'nyireg', ido: 480, mezok: 7, haz: 6, ajanl: ['ancsa', 'ketelt'] },
  { id: 'bukktuz', mod: 'tuz', nev: 'Lángoló Bükk', leir: 'Erdőtűz a Bükkben, Lillafüred fölött. A szél terjeszti – oltsd el, mielőtt túl nagyra nő!', lon: 20.56, lat: 48.07, repter: 'miskolc', ido: 600, tuz: 14, ajanl: ['ketelt', 'kopter'] },
  { id: 'kiskuntuz', mod: 'tuz', nev: 'Kiskunsági mezőtűz', leir: 'A száraz fű gyorsan ég. Nyílt terep, erős szél.', lon: 19.6, lat: 46.65, repter: 'kiskun', ido: 540, tuz: 12, szel: 1, ajanl: ['herkules', 'ancsa'] },
  { id: 'kert', mod: 'precizio', nev: 'Kert a völgyben', leir: 'Egyetlen konyhakert egy szűk bükki völgyben. Ne áztasd el a szomszédot!', lon: 20.55, lat: 48.04, repter: 'lillafured', ido: 300, celok: [[20.552, 48.041, 18], [20.567, 48.031, 14], [20.541, 48.052, 14]], ajanl: ['dron', 'kopter'] },
  { id: 'park', mod: 'precizio', nev: 'Virágágyás a Margitszigeten', leir: 'A városi kertészet a Margitszigeten kér segítséget: három virágágyás, sok járókelő.', lon: 19.05, lat: 47.527, repter: 'budapest', ido: 420, celok: [[19.0505, 47.5265, 12], [19.0528, 47.5235, 10], [19.0462, 47.5305, 10]], ajanl: ['dron', 'kamov'] },
  { id: 'dunaverseny', mod: 'verseny', nev: 'Dunai karikák', leir: 'A Duna fölött, a pesti hidak között. Végig a karikákon, ahogy csak bírod!', repter: 'budapest', ido: 0, pontok: [[19.08, 47.40, 120], [19.067, 47.445, 90], [19.055, 47.478, 80], [19.0475, 47.497, 70], [19.042, 47.515, 80], [19.045, 47.54, 90], [19.068, 47.585, 110], [19.08, 47.63, 140]], ajanl: ['vadasz', 'permetezo'] },
  { id: 'bukkverseny', mod: 'verseny', nev: 'Bükki völgyek', leir: 'Miskolcról a Bükk völgyein keresztül a Szinva mentén. Szűk kanyarok!', repter: 'miskolc', ido: 0, pontok: [[20.73, 48.115, 90], [20.66, 48.105, 80], [20.62, 48.098, 70], [20.57, 48.085, 90], [20.5, 48.07, 110], [20.47, 48.03, 130], [20.55, 48.02, 110], [20.66, 48.06, 100]], ajanl: ['kopter', 'giro'] },
];
export const MODOK = { szabad: 'Szabad repülés', ontozes: 'Öntözés', tuz: 'Tűzoltás', precizio: 'Precíziós kihívás', verseny: 'Gyorsasági verseny' };
export const GAME = 'flightsim';
