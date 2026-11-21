/* HGWS Arcade – Öntöző Birodalom (klasszikus szkript, az arcade.html tölti be; a közös keret a jatekok/arcade/mag.js) */
'use strict';
const Birodalom = (() => {
  const B = Nagy.N, ZERO = Nagy.ZERO, ONE = Nagy.ONE, pw = (a, k, n) => B(k).pow(n).mul(a); // nagy számok (jatekok/birodalom/nagyszam.js)
  /* Öntöző Birodalom Online: a közös világ egy telkének kertje – külön mentés, a régió vízbősége szorozza a vízhozamot,
     a pontszám nem megy az egyjátékos rekordba / ranglistára / felhőmentésbe, az állást a szülőoldal (js/bo.js) kapja meg */
  const BOQ = new URLSearchParams(location.search), BO = /^[\w-]{3,40}$/.test(BOQ.get('bo') || '') ? BOQ.get('bo') : '', BOW = BO ? Math.max(.2, Math.min(3, +BOQ.get('bw') || 1)) : 1;
  const COLS = 64, ROWS = 40, SRC = [0, 2], KEY = BO ? 'hgws_bo_' + BO : 'hgws_birodalom_v1', CAP = 1e300, MOIST = 6;
  // hálózat: w = vízigény, r = sugár, nb = szomszédok, q = vízhozam, wm = locsolás-szorzó, mob = mozgó (tengely)
  // aura: nem hálózati, bónusz a környékre; fok/szuro: hálózati, globális bónusz; valve: zárható
  const MOD = {
    pipe: { n: 'Cső', c: 4, u: 0, m: 1 },
    spr: { n: 'Szórófej', c: 30, u: 0, r: 1, w: 1, m: 1.06 },
    mikro: { n: 'Mikroszórófej', c: 90, u: 120, nb: 1, w: .15, wm: 1.08, m: 1.05 },
    pump: { n: 'Szivattyú', c: 150, u: 250, q: 6, m: 1.3 },
    drip: { n: 'Csepegtető', c: 15, u: 400, nb: 1, w: .3, wm: 1.15, m: 1.04 },
    szelep: { n: 'Szelep', c: 50, u: 1000, valve: 1, m: 1.02 },
    rot: { n: 'Esőztető', c: 400, u: 2500, r: 2, w: 2.5, m: 1.15 },
    hordo: { n: 'Esővízgyűjtő', c: 900, u: 4000, q: 3, m: 1.2 },
    turbo: { n: 'Turbó szórófej', c: 1800, u: 9000, r: 1, w: 1.6, wm: 1.25, m: 1.08 },
    komp: { n: 'Komposztáló', c: 3000, u: 15000, aura: 1, gb: .3, m: 1.25 },
    fok: { n: 'Nyomásfokozó', c: 5000, u: 20000, fok: .15, m: 1.45 },
    kod: { n: 'Ködölő', c: 8000, u: 40000, r: 1, w: 2, wm: 1.35, m: 1.2 },
    madar: { n: 'Madárijesztő', c: 10000, u: 60000, aura: 1, yb: .2, m: 1.25 },
    szuro: { n: 'Szűrő', c: 12000, u: 50000, szuro: .08, m: 1.5 },
    linx: { n: 'Lineáris ↔', c: 20000, u: 80000, mob: 'x', w: 3, wm: 1.1, m: 1.5 },
    liny: { n: 'Lineáris ↕', c: 20000, u: 80000, mob: 'y', w: 3, wm: 1.1, m: 1.5 },
    meh: { n: 'Méhkaptár', c: 25000, u: 120000, aura: 2, yb: .25, hive: .02, m: 1.3 },
    szelk: { n: 'Szélkerék', c: 35000, u: 180000, q: 9, m: 1.3 },
    kut: { n: 'Mélykút', c: 60000, u: 400000, q: 14, m: 1.35 },
    napel: { n: 'Napelemes szivattyú', c: 180000, u: 1.2e6, q: 18, m: 1.32 },
    piv: { n: 'Körforgó öntöző', c: 400000, u: 3e6, r: 3, w: 6, m: 1.3 },
    torony: { n: 'Víztorony', c: 1.2e6, u: 8e6, q: 30, m: 1.4 },
    to: { n: 'Kerti tó', c: 3.5e6, u: 2.5e7, q: 45, m: 1.38 },
    giga: { n: 'Óriás esőztető', c: 9e6, u: 7e7, r: 4, w: 14, m: 1.3 },
    sotal: { n: 'Sótalanító üzem', c: 4e7, u: 3e8, q: 120, m: 1.4 },
    gomba: { n: 'Gombatelep', c: 250000, u: 1.8e6, aura: 1, gb: .5, m: 1.3 },
    mehtelep: { n: 'Méhtelep', c: 5e9, ck: 50, u: 3e10, sz: 2, aura: 3, yb: .4, hive: .6, m: 1.45 },
    katica: { n: 'Katicaház', c: 1.1e6, u: 7e6, aura: 2, yb: .3, m: 1.3 },
    arany: { n: 'Arany Locsolófej', c: 3e8, u: 2e9, r: 2, w: 8, wm: 2, m: 2.5 },
    lampa: { n: 'Növénylámpa', c: 2.5e9, u: 1.5e10, aura: 1, gb: 1, m: 1.35 },
    szivv: { n: 'Szivárványkút', c: 6e9, u: 4e10, q: 300, m: 1.4 },
    kristr: { n: 'Kristályszórófej', c: 1.5e10, u: 1e11, r: 3, w: 10, wm: 1.6, m: 1.35 },
    felho: { n: 'Felhőgép', c: 6e10, u: 4e11, r: 5, w: 30, wm: 1.3, m: 1.35 },
    gejzir: { n: 'Gejzír', c: 2e11, u: 1.5e12, q: 900, m: 1.4 },
    obel: { n: 'Termékenység-obeliszk', c: 1e12, u: 8e12, aura: 3, yb: .6, gb: .4, m: 1.5 },
    jeg: { n: 'Jéghegy-olvasztó', c: 5e12, u: 4e13, q: 3000, m: 1.4 },
    portal: { n: 'Vízportál', c: 4e13, u: 3e14, q: 12000, m: 1.45 },
    // nagy (több mezős), sok vizet fogyasztó, nagyon erős elemek
    mega: { n: 'Mega-esőztető', ck: 20, c: 3e11, u: 2e12, sz: 2, r: 6, w: 80, wm: 1.8, m: 1.4 },
    hidro: { n: 'Hidropónia-torony', ck: 40, c: 8e11, u: 5e12, sz: 2, boost: 3, gb: 2, yb: 1, w: 150, m: 1.45 },
    tenger: { n: 'Tengervíz-erőmű', ck: 60, c: 2e13, u: 1.5e14, sz: 3, q: 60000, m: 1.5 },
    ciklon: { n: 'Ciklon-öntöző', ck: 120, c: 5e13, u: 4e14, sz: 3, r: 10, w: 500, wm: 2.5, m: 1.5 },
    mehgyar: { n: 'Ipari méhfarm', c: 1e14, ck: 600, u: 8e14, sz: 3, aura: 4, yb: .6, hive: 8, m: 1.5 },
    robotmeh: { n: 'Robotméh-központ', c: 1e22, ck: 8000, u: 8e22, sz: 3, aura: 5, yb: 1, hive: 120, m: 1.6 },
    csillkut: { n: 'Csillagkút', ck: 200, c: 5e15, u: 4e16, q: 250000, m: 1.5 },
    galobel: { n: 'Galaktikus obeliszk', ck: 300, c: 8e16, u: 6e17, sz: 2, aura: 4, yb: 2, gb: 1.5, m: 1.6 },
    nebula2: { n: 'Nebula-esőztető', ck: 500, c: 1e18, u: 8e18, sz: 3, r: 14, w: 4000, wm: 4, m: 1.55 },
    flyuk: { n: 'Fekete lyuk-szivattyú', ck: 800, c: 2e19, u: 1.5e20, sz: 3, q: 3e6, m: 1.6 },
    idoforr: { n: 'Időforrás', ck: 1500, c: 5e22, u: 4e23, sz: 3, q: 5e7, m: 1.7 },
    aurora: { n: 'Aurora-ködölő', ck: 2500, c: 1e24, u: 8e24, sz: 2, r: 8, w: 2e5, wm: 6, m: 1.6 },
    vegtszor: { n: 'Végtelen szórófej', ck: 3000, c: 1e25, u: 8e25, sz: 3, r: 20, w: 60000, wm: 8, m: 1.8 },
    csillagh: { n: 'Csillagház', ck: 5000, c: 1e28, u: 8e28, sz: 3, boost: 5, gb: 6, yb: 4, w: 1e6, m: 1.7 },
    esokir: { n: 'Esőkirály', ck: 1e4, c: 1e33, u: 8e33, sz: 3, r: 26, w: 5e6, wm: 15, m: 1.75 },
    genezis: { n: 'Genezis-gép', ck: 2.5e4, c: 1e40, u: 8e40, sz: 3, boost: 8, gb: 20, yb: 10, w: 3e7, m: 1.8 },
    univont: { n: 'Univerzum-öntöző', ck: 6e4, c: 1e48, u: 8e48, sz: 3, r: 40, w: 2e8, wm: 50, m: 1.9 },
    vizrec: { n: 'Víz-visszanyerő', loc: 'station', look: 'sotal', c: 2e20, ck: 0, u: 0, q: 2e6, m: 1.5 },
    urspr: { n: 'Mikrogravitációs szórófej', loc: 'station', look: 'kristr', c: 6e20, ck: 40, u: 0, r: 2, w: 5e4, wm: 3, m: 1.5 },
    urgyuru: { n: 'Gyűrűs öntözőrendszer', loc: 'station', look: 'mega', c: 3e22, ck: 300, u: 0, sz: 2, r: 6, w: 6e5, wm: 6, m: 1.5 },
    ledk: { n: 'LED-kamra', loc: 'station', look: 'hidro', c: 2e23, ck: 600, u: 0, sz: 2, boost: 3, gb: 4, yb: 2, w: 4e5, m: 1.5 },
    jegbanya: { n: 'Jégbánya', loc: 'hold', look: 'jeg', c: 3e28, ck: 0, u: 0, q: 6e7, m: 1.5 },
    holdspr: { n: 'Holdporos esőztető', loc: 'hold', look: 'giga', c: 8e28, ck: 3000, u: 0, r: 4, w: 2e6, wm: 5, m: 1.5 },
    kratero: { n: 'Kráter-öntöző', loc: 'hold', look: 'ciklon', c: 5e30, ck: 2e4, u: 0, sz: 3, r: 12, w: 3e7, wm: 9, m: 1.5 },
    tukor: { n: 'Napfénytükör', loc: 'hold', look: 'lampa', c: 2e31, ck: 4e4, u: 0, aura: 2, gb: 3, m: 1.5 },
    sarkijeg: { n: 'Sarki jégolvasztó', loc: 'mars', look: 'gejzir', c: 3e36, ck: 0, u: 0, q: 2e9, m: 1.5 },
    marsspr: { n: 'Mars-szórófej', loc: 'mars', look: 'turbo', c: 9e36, ck: 4e4, u: 0, r: 3, w: 6e7, wm: 8, m: 1.5 },
    terraf: { n: 'Terraformáló', loc: 'mars', look: 'nebula2', c: 6e38, ck: 3e5, u: 0, sz: 3, r: 16, w: 8e8, wm: 14, m: 1.5 },
    kupola: { n: 'Üvegkupola', loc: 'mars', look: 'csillagh', c: 3e39, ck: 6e5, u: 0, sz: 2, boost: 4, gb: 8, yb: 5, w: 5e8, m: 1.5 },
    oceanf: { n: 'Mélyóceán-fúró', loc: 'europa', look: 'flyuk', c: 3e46, ck: 0, u: 0, sz: 2, q: 8e10, m: 1.5 },
    jegkod: { n: 'Jégköd-szóró', loc: 'europa', look: 'kod', c: 9e46, ck: 6e5, u: 0, r: 3, w: 3e9, wm: 12, m: 1.5 },
    oceano: { n: 'Óceán-öntöző', loc: 'europa', look: 'esokir', c: 6e48, ck: 5e6, u: 0, sz: 3, r: 20, w: 4e10, wm: 22, m: 1.5 },
    bioreak: { n: 'Bioreaktor', loc: 'europa', look: 'genezis', c: 3e49, ck: 1e7, u: 0, sz: 2, boost: 5, gb: 12, yb: 8, w: 3e10, m: 1.5 },
    metanto: { n: 'Metántó-szivattyú', loc: 'titan', look: 'to', c: 3e56, ck: 0, u: 0, q: 4e12, m: 1.5 },
    kodkor: { n: 'Ködkoszorú', loc: 'titan', look: 'felho', c: 9e56, ck: 1e7, u: 0, r: 6, w: 1.5e11, wm: 18, m: 1.5 },
    titcikl: { n: 'Titán-ciklon', loc: 'titan', look: 'ciklon', c: 6e58, ck: 8e7, u: 0, sz: 3, r: 24, w: 2e12, wm: 30, m: 1.5 },
    szervgy: { n: 'Szerves gyár', loc: 'titan', look: 'hidro', c: 3e59, ck: 1.5e8, u: 0, sz: 2, boost: 6, gb: 18, yb: 12, w: 1.5e12, m: 1.5 },
    kettkut: { n: 'Kettős-nap kút', loc: 'kepler', look: 'szivv', c: 5e68, ck: 0, u: 0, q: 2e14, m: 1.5 },
    fenyperm: { n: 'Fénypermet', loc: 'kepler', look: 'arany', c: 1.5e69, ck: 2e8, u: 0, r: 5, w: 8e12, wm: 30, m: 1.5 },
    vilagont: { n: 'Világöntöző', loc: 'kepler', look: 'univont', c: 1e71, ck: 1.5e9, u: 0, sz: 3, r: 32, w: 1e14, wm: 60, m: 1.5 },
    eletfak: { n: 'Életfa-kamra', loc: 'kepler', look: 'genezis', c: 5e71, ck: 3e9, u: 0, sz: 3, boost: 8, gb: 30, yb: 20, w: 8e13, m: 1.5 },
    napvit: { n: 'Napvitorla-gyűjtő', loc: 'station', look: 'napel', c: 4e20, ck: 100, u: 0, cp: 0.05, m: 1.5 },
    urmeh: { n: 'Űrkaptár', loc: 'station', look: 'hive', c: 2e21, ck: 400, cc: 10, u: 0, sz: 2, aura: 2, yb: 0.6, hive: 30, m: 1.5 },
    gravgen: { n: 'Gravitációs generátor', loc: 'station', look: 'obel', c: 8e21, ck: 600, cc: 30, u: 0, aura: 2, gb: 2, m: 1.5 },
    plazmaszo: { n: 'Plazmaszóró', loc: 'station', look: 'turbo', c: 4e22, ck: 800, cc: 60, u: 0, r: 3, w: 2e5, wm: 4, m: 1.5 },
    orbfarm: { n: 'Orbitális farmgyűrű', loc: 'station', look: 'csillagh', c: 5e24, ck: 3000, cc: 300, u: 0, sz: 3, boost: 4, gb: 6, yb: 4, w: 3e6, m: 1.5 },
    regolit: { n: 'Regolit-bánya', loc: 'hold', look: 'sotal', c: 5e28, ck: 4000, u: 0, cp: 0.6, m: 1.5 },
    holdmeh: { n: 'Holdkaptár', loc: 'hold', look: 'hive', c: 2e29, ck: 8000, cc: 150, u: 0, sz: 2, aura: 3, yb: 0.8, hive: 400, m: 1.5 },
    krioter: { n: 'Kriogén terem', loc: 'hold', look: 'lampa', c: 8e29, ck: 1.2e4, cc: 400, u: 0, sz: 2, aura: 3, gb: 4, m: 1.5 },
    holdkod: { n: 'Holdköd-szóró', loc: 'hold', look: 'kod', c: 4e30, ck: 1.6e4, cc: 800, u: 0, r: 5, w: 6e6, wm: 7, m: 1.5 },
    holdkut: { n: 'Mélykráter-kút', loc: 'hold', look: 'to', c: 2e31, ck: 2e4, cc: 1500, u: 0, q: 5e8, m: 1.5 },
    marsfuro: { n: 'Mars-fúrótorony', loc: 'mars', look: 'szelk', c: 5e36, ck: 5e4, u: 0, cp: 7, m: 1.5 },
    marsmeh: { n: 'Vörös kaptár', loc: 'mars', look: 'hive', c: 2e37, ck: 1e5, cc: 2000, u: 0, sz: 2, aura: 3, yb: 1, hive: 5000, m: 1.5 },
    porpajzs: { n: 'Porvihar-pajzs', loc: 'mars', look: 'obel', c: 8e37, ck: 1.5e5, cc: 5000, u: 0, sz: 2, aura: 4, gb: 5, yb: 2, m: 1.5 },
    marsrot: { n: 'Mars-esőztető', loc: 'mars', look: 'giga', c: 4e38, ck: 2e5, cc: 1e4, u: 0, r: 6, w: 2e8, wm: 10, m: 1.5 },
    jegsapka: { n: 'Jégsapka-olvasztó', loc: 'mars', look: 'gejzir', c: 2e39, ck: 2.5e5, cc: 2e4, u: 0, sz: 2, q: 3e10, m: 1.5 },
    jegmag: { n: 'Jégmag-fúró', loc: 'europa', look: 'jeg', c: 5e46, ck: 6e5, u: 0, cp: 90, m: 1.5 },
    europmeh: { n: 'Mélytengeri kaptár', loc: 'europa', look: 'hive', c: 2e47, ck: 1.2e6, cc: 3e4, u: 0, sz: 2, aura: 3, yb: 1.2, hive: 7e4, m: 1.5 },
    hoforr: { n: 'Hőforrás-kamra', loc: 'europa', look: 'csillagh', c: 8e47, ck: 1.8e6, cc: 8e4, u: 0, sz: 3, boost: 5, gb: 14, yb: 9, w: 8e10, m: 1.5 },
    jegszo: { n: 'Jégkristály-szóró', loc: 'europa', look: 'kristr', c: 4e48, ck: 2.4e6, cc: 1.5e5, u: 0, r: 7, w: 6e9, wm: 14, m: 1.5 },
    aramlas: { n: 'Áramlás-turbina', loc: 'europa', look: 'szivv', c: 2e49, ck: 3e6, cc: 3e5, u: 0, q: 5e12, m: 1.5 },
    metfin: { n: 'Metán-finomító', loc: 'titan', look: 'sotal', c: 5e56, ck: 8e6, u: 0, cp: 1200, m: 1.5 },
    titmeh: { n: 'Ködkaptár', loc: 'titan', look: 'hive', c: 2e57, ck: 1.5e7, cc: 5e5, u: 0, sz: 2, aura: 3, yb: 1.5, hive: 1e6, m: 1.5 },
    borkupola: { n: 'Borostyán-kupola', loc: 'titan', look: 'genezis', c: 8e57, ck: 2.2e7, cc: 1.2e6, u: 0, sz: 3, boost: 6, gb: 20, yb: 14, w: 3e12, m: 1.5 },
    narszo: { n: 'Narancsköd-szóró', loc: 'titan', look: 'felho', c: 4e58, ck: 3e7, cc: 2.5e6, u: 0, r: 8, w: 4e11, wm: 20, m: 1.5 },
    krioforr: { n: 'Kriovulkán', loc: 'titan', look: 'gejzir', c: 2e59, ck: 4e7, cc: 5e6, u: 0, sz: 3, q: 4e14, m: 1.5 },
    kvantgy: { n: 'Kvantumgyűjtő', loc: 'kepler', look: 'portal', c: 5e68, ck: 2e8, u: 0, cp: 1.6e4, m: 1.5 },
    kepmeh: { n: 'Fénykaptár', loc: 'kepler', look: 'hive', c: 2e69, ck: 4e8, cc: 8e6, u: 0, sz: 3, aura: 5, yb: 2.5, hive: 2e7, m: 1.5 },
    eletmag: { n: 'Életmag-reaktor', loc: 'kepler', look: 'galobel', c: 8e69, ck: 6e8, cc: 2e7, u: 0, sz: 2, aura: 5, gb: 12, yb: 6, m: 1.5 },
    kettszo: { n: 'Kettős-nap szóró', loc: 'kepler', look: 'arany', c: 4e70, ck: 8e8, cc: 4e7, u: 0, r: 9, w: 2e13, wm: 40, m: 1.5 },
    csillforr: { n: 'Csillagforrás', loc: 'kepler', look: 'flyuk', c: 2e71, ck: 1e9, cc: 8e7, u: 0, sz: 3, q: 2e16, m: 1.5 },
    // igény-modulok: nem kell rájuk cső, a körzetükben biztosítják a különleges növények igényét
    futo: { n: 'Futórács', c: 600, u: 12000, aura: 1, prov: 'tamasz', m: 1.12 },
    arnyekh: { n: 'Árnyékoló háló', c: 6000, u: 200000, aura: 2, prov: 'arnyek', m: 1.2 },
    futagy: { n: 'Fűtött ágyás', c: 50000, u: 2e6, aura: 1, prov: 'meleg', m: 1.2 },
    parasit: { n: 'Párásító', c: 600000, u: 1e7, aura: 2, prov: 'para', m: 1.2 },
    gyokst: { n: 'Gyökérserkentő', c: 5e8, u: 3e9, aura: 2, prov: 'gyoker', m: 1.25 },
    krracs: { n: 'Kristályrács', c: 3e13, u: 2e14, aura: 3, prov: 'kristaly', m: 1.3 },
    // vízkezelés: helyszínenként egy, csőre kötve az egész kertre hat; rákoppintva szintet lép (nem kell több darab)
    lagyito: { sz: 2, n: 'Vízlágyító', c: 20000, u: 100000, wq: { g: .12 }, one: 1, m: 1 },
    tapado: { sz: 2, n: 'Tápoldat-adagoló', c: 200000, u: 1e6, wq: { y: .1 }, one: 1, m: 1 },
    uvster: { sz: 2, n: 'UV-sterilizáló', c: 3e6, u: 2e7, wq: { g: .03, gold: .005 }, one: 1, m: 1 },
    oxig: { sz: 2, n: 'Oxigénező', c: 5e7, u: 4e8, wq: { g: .08, y: .08 }, one: 1, m: 1 },
    asvany: { sz: 2, n: 'Ásványi dúsító', c: 1e10, u: 8e10, wq: { y: .15 }, one: 1, m: 1 },
    kvantviz: { sz: 2, n: 'Kvantumvíz-reaktor', c: 1e16, u: 8e16, wq: { g: .2, y: .2 }, one: 1, m: 1 },
    del: { n: 'Bontás', c: 0, u: 0, m: 1 }
  };
  const RQ = { tamasz: { b: 1, ic: '🪜', n: 'Támasz' }, arnyek: { b: 2, ic: '⛱️', n: 'Árnyék' }, beporz: { b: 4, ic: '🐝', n: 'Beporzás (kaptár)' }, meleg: { b: 8, ic: '🔥', n: 'Meleg' }, para: { b: 16, ic: '💨', n: 'Pára' }, gyoker: { b: 32, ic: '🌱', n: 'Gyökérserkentés' }, kristaly: { b: 64, ic: '💎', n: 'Kristályrács' } };
  const WQI = { lagyito: '💧', tapado: '🧪', uvster: '☀️', oxig: '🫧', asvany: '⛰️', kvantviz: '⚛️' }, WQMAX = 40;
  const rqBits = p => (p.rq || []).reduce((a, k) => a | RQ[k].b, 0);
  const wqLv = k => Math.max(1, (S.wq || {})[k] || 0), wqCost = k => pw(MOD[k].c, 2.6, wqLv(k)).round();
  const PL = {
    fu: { n: 'Fű', c: 2, t: 6, v: 3, u: 0, m: 1.03, s: 'grass', col: '#6fcf6a' },
    hagy: { n: 'Hagyma', c: 7, t: 10, v: 6.5, u: 40, m: 1.04, s: 'root', col: '#e8c27a' },
    spenot: { n: 'Spenót', c: 11, t: 12, v: 9.5, u: 75, m: 1.04, s: 'rosette', col: '#3f9d3a' },
    sal: { n: 'Saláta', c: 15, t: 15, v: 14, u: 120, m: 1.05, s: 'rosette', col: '#9be36a' },
    bab: { n: 'Bab', c: 28, t: 18, v: 22, u: 260, m: 1.05, s: 'stake', col: '#7fd04a' },
    borso: { n: 'Borsó', c: 36, t: 19, v: 26, u: 360, m: 1.05, s: 'stake', col: '#9be36a' },
    ret: { n: 'Retek', c: 45, t: 20, v: 30, u: 500, m: 1.06, s: 'root', col: '#e2496b' },
    repa: { n: 'Sárgarépa', c: 75, t: 24, v: 50, u: 1000, m: 1.06, s: 'root', col: '#ff8c2e' },
    cekla: { n: 'Cékla', c: 95, t: 27, v: 63, u: 1400, m: 1.06, s: 'root', col: '#a01a4a' },
    eper: { n: 'Eper', c: 120, t: 30, v: 78, u: 2000, m: 1.06, s: 'bush', col: '#ff3b4a' },
    malna: { n: 'Málna', c: 160, t: 32, v: 99, u: 2700, m: 1.06, s: 'bush', col: '#e0245e' },
    afon: { n: 'Áfonya', c: 200, t: 34, v: 120, u: 3500, m: 1.06, s: 'bush', col: '#4f6cff' },
    par: { n: 'Paradicsom', c: 320, t: 40, v: 184, u: 6000, m: 1.07, s: 'stake', col: '#e5533d' },
    cukk: { n: 'Cukkini', c: 420, t: 43, v: 235, u: 9000, m: 1.07, s: 'gourd', col: '#2f7d32', hl: '#9be36a' },
    ubor: { n: 'Uborka', c: 550, t: 46, v: 290, u: 12000, m: 1.07, s: 'gourd', col: '#3f9d3a', hl: '#a8e07a' },
    padl: { n: 'Padlizsán', c: 700, t: 50, v: 365, u: 16000, m: 1.07, s: 'stake', col: '#6a2c91' },
    komlo: { n: 'Komló', c: 1020, t: 53, v: 650, u: 18000, m: 1.08, s: 'vine', col: '#9ccc65', rq: ['tamasz'] },
    papr: { n: 'Paprika', c: 900, t: 55, v: 440, u: 20000, m: 1.07, s: 'stake', col: '#ffcf2e' },
    brok: { n: 'Brokkoli', c: 1200, t: 58, v: 560, u: 28000, m: 1.08, s: 'rosette', col: '#2f7d32' },
    kuk: { n: 'Kukorica', c: 1500, t: 60, v: 680, u: 35000, m: 1.08, s: 'corn', col: '#ffd84a' },
    lev: { n: 'Levendula', c: 2400, t: 70, v: 980, u: 60000, m: 1.08, s: 'lav', col: '#a07be0' },
    szeder: { n: 'Szeder', c: 3100, t: 75, v: 1230, u: 85000, m: 1.08, s: 'bush', col: '#3a1f5c' },
    kivi: { n: 'Kivi', c: 4200, t: 76, v: 2070, u: 90000, m: 1.08, s: 'vine', col: '#8d6e3f', rq: ['tamasz'] },
    napr: { n: 'Napraforgó', c: 4000, t: 80, v: 1550, u: 110000, m: 1.08, s: 'sunf', col: '#ffcc00' },
    roz: { n: 'Rózsa', c: 6000, t: 90, v: 2160, u: 200000, m: 1.08, s: 'flower', col: '#ff6fa8' },
    pipacs: { n: 'Pipacs', c: 7600, t: 95, v: 2700, u: 300000, m: 1.09, s: 'flower', col: '#e5333d' },
    ginzeng: { n: 'Ginzeng', c: 10200, t: 96, v: 4530, u: 320000, m: 1.08, s: 'root', col: '#e8d29a', rq: ['arnyek'] },
    tul: { n: 'Tulipán', c: 9500, t: 100, v: 3350, u: 400000, m: 1.09, s: 'flower', col: '#ff4d4d' },
    tok: { n: 'Tök', c: 15000, t: 120, v: 5040, u: 700000, m: 1.09, s: 'gourd', col: '#ff9d2e' },
    aliget: { n: 'Áfonyaliget', c: 214000, t: 165, v: 108000, u: 1.2e6, m: 1.1, s: 'bush', col: '#4f6cff', sz: 2, pw: 2, rq: ['arnyek', 'beporz'] },
    diny: { n: 'Görögdinnye', c: 25000, t: 135, v: 8000, u: 1.4e6, m: 1.1, s: 'melon', col: '#2f8a34' },
    szo: { n: 'Szőlő', c: 40000, t: 150, v: 11100, u: 2.5e6, m: 1.1, s: 'vine', col: '#8e5bd6' },
    ananasz: { n: 'Ananász', c: 59500, t: 158, v: 20900, u: 3e6, m: 1.08, s: 'rosette', col: '#ffc93c', rq: ['meleg'] },
    kave: { n: 'Kávécserje', c: 65000, t: 175, v: 18500, u: 4.5e6, m: 1.1, s: 'bush', col: '#b3261e', lc: ['#2f8a3a', '#1f6a2a'] },
    fa: { n: 'Gyümölcsfa', c: 100000, t: 200, v: 26000, u: 8e6, m: 1.11, s: 'tree', col: '#ffa531' },
    banan: { n: 'Banánliget', c: 1.3e6, t: 274, v: 514000, u: 1.2e7, m: 1.1, s: 'tree', col: '#ffe135', lc: ['#5fbf4a', '#2f8a34'], sz: 2, pw: 3, rq: ['meleg', 'para'] },
    citrom: { n: 'Citromfa', c: 160000, t: 230, v: 40000, u: 1.5e7, m: 1.11, s: 'tree', col: '#fff176' },
    olaj: { n: 'Olajfa', c: 250000, t: 260, v: 60000, u: 2.5e7, m: 1.12, s: 'olive', col: '#3b3f2a' },
    granat: { n: 'Gránátalma', c: 400000, t: 290, v: 95000, u: 4.2e7, m: 1.12, s: 'tree', col: '#c2185b' },
    tea: { n: 'Teaültetvény', c: 1.25e7, t: 450, v: 5.45e6, u: 5e7, m: 1.12, s: 'bush', col: '#2f7d32', lc: ['#6fcf6a', '#2f7d32'], sz: 3, pw: 5, rq: ['arnyek', 'para'] },
    kakao: { n: 'Kakaófa', c: 650000, t: 320, v: 145000, u: 7e7, m: 1.12, s: 'tree', col: '#a0522d', lc: ['#3f9d4a', '#2a7a36'] },
    van: { n: 'Vanília', c: 1.7e6, t: 380, v: 340000, u: 2e8, m: 1.13, s: 'vine', col: '#f3e3b0' },
    viktoria: { n: 'Viktória-tündérrózsa', c: 5.49e7, t: 591, v: 2.01e7, u: 2.5e8, m: 1.12, s: 'flower', col: '#ffc1e3', sz: 3, pw: 8, rq: ['para', 'meleg'] },
    saf: { n: 'Sáfrány', c: 4.5e6, t: 450, v: 800000, u: 6e8, m: 1.13, s: 'lav', col: '#c084fc' },
    kaktusz: { n: 'Kaktuszkert', c: 4.73e7, t: 589, v: 1.28e7, u: 8e8, m: 1.1, s: 'corn', col: '#4caf50', sz: 2, pw: 4, rq: ['meleg'] },
    sakura: { n: 'Japáncseresznye', c: 1.2e7, t: 540, v: 1.9e6, u: 2e9, m: 1.14, s: 'tree', col: '#ff8fc0', lc: ['#ffc4dd', '#f59ac2'] },
    orch: { n: 'Orchidea', c: 3.2e7, t: 640, v: 4.5e6, u: 6e9, m: 1.14, s: 'flower', col: '#e879f9' },
    szgomba: { n: 'Szarvasgomba-erdő', c: 1.79e9, t: 1120, v: 5.51e8, u: 6e9, m: 1.14, s: 'tree', col: '#6d4c41', lc: ['#4e7d3a', '#2d5a22'], sz: 4, pw: 15, rq: ['arnyek', 'gyoker'] },
    aalma: { n: 'Aranyalma', c: 9e7, t: 760, v: 1.1e7, u: 2e10, m: 1.15, s: 'tree', col: '#ffd700', glow: 1 },
    hold: { n: 'Holdvirág', c: 2.5e8, t: 900, v: 2.7e7, u: 6e10, m: 1.15, s: 'flower', col: '#bfe9ff', glow: 1 },
    oriastok: { n: 'Óriástök', c: 3e10, t: 1500, v: 2.4e10, u: 7e12, m: 1.18, s: 'gourd', col: '#ff9d2e', sz: 2, pw: 40 },
    lotusz: { n: 'Lótusz', c: 7e8, t: 1010, v: 6.62e7, u: 1.68e11, m: 1.15, s: 'flower', col: '#ffb3d1' },
    szekvoja: { n: 'Óriás szekvoja-liget', c: 9.33e10, t: 1930, v: 1.72e10, u: 4e11, m: 1.14, s: 'tree', col: '#8d4a2a', lc: ['#3f8f4a', '#1f5a2a'], sz: 4, pw: 40, rq: ['gyoker', 'tamasz'] },
    bambusz: { n: 'Bambusz', c: 1.96e9, t: 1120, v: 1.62e8, u: 4.7e11, m: 1.15, s: 'corn', col: '#a8e07a' },
    mango: { n: 'Mangófa', c: 5.49e9, t: 1230, v: 3.97e8, u: 1.32e12, m: 1.15, s: 'tree', col: '#ffb347' },
    krist: { n: 'Kristályvirág', c: 1.54e10, t: 1340, v: 9.73e8, u: 3.69e12, m: 1.15, s: 'flower', col: '#9fe0ff', glow: 1 },
    tuz: { n: 'Tűzliliom', c: 4.3e10, t: 1450, v: 2.38e9, u: 1.03e13, m: 1.15, s: 'flower', col: '#ff5a1f', glow: 1 },
    cstok: { n: 'Csillagtök', c: 1.2e11, t: 1560, v: 5.84e9, u: 2.89e13, m: 1.15, s: 'gourd', col: '#c084fc', glow: 1, hl: '#f0d4ff' },
    jegfa: { n: 'Jégfa', c: 3.37e11, t: 1670, v: 1.43e10, u: 8.1e13, m: 1.15, s: 'tree', col: '#d6f3ff', glow: 1, lc: ['#e6f8ff', '#a9dcf2'] },
    rizs: { n: 'Rizsterasz', c: 6e11, t: 1700, v: 1.9e11, u: 1.4e14, m: 1.18, s: 'grass', col: '#c9e27a', sz: 3, pw: 400 },
    napv: { n: 'Napvirág', c: 9.45e11, t: 1780, v: 3.51e10, u: 2.27e14, m: 1.15, s: 'sunf', col: '#ffe066', glow: 1 },
    kristkert: { n: 'Kristálybarlang-kert', c: 1.16e14, t: 3263, v: 8.54e12, u: 5e14, m: 1.14, s: 'flower', col: '#9fe0ff', glow: 1, sz: 4, pw: 800, rq: ['kristaly', 'arnyek'] },
    smar: { n: 'Smaragdszőlő', c: 2.64e12, t: 1890, v: 8.59e10, u: 6.35e14, m: 1.15, s: 'vine', col: '#50e3a4', glow: 1 },
    fonix: { n: 'Főnixpálma', c: 7.4e12, t: 2000, v: 2.1e11, u: 1.78e15, m: 1.15, s: 'tree', col: '#ff7a2e', glow: 1, lc: ['#ffb347', '#e8742e'] },
    mamut: { n: 'Mamutfenyő', c: 1e13, t: 2050, v: 1.1e12, u: 2.4e15, m: 1.18, s: 'tree', col: '#7a4a2a', lc: ['#3f8f4a', '#1f5a2a'], sz: 2, pw: 200 },
    vilagfa: { n: 'Világfa', c: 2.07e13, t: 2110, v: 5.15e11, u: 4.98e15, m: 1.15, s: 'tree', col: '#ffe29a', glow: 1, lc: ['#9be36a', '#4fae46'] },
    lotuszto: { n: 'Lótuszmező', c: 1.5e14, t: 2400, v: 2.3e13, u: 3.6e16, m: 1.2, s: 'flower', col: '#ffb3d1', glow: 1, sz: 3, pw: 1500 },
    alvir: { n: 'Locsolófej-virág', c: 5.81e13, t: 2220, v: 1.26e12, u: 1.39e16, m: 1.15, s: 'flower', col: '#ffd700', glow: 1 },
    cspor: { n: 'Csillagpor-búza', c: 3e14, t: 2300, v: 6e12, u: 7.2e16, m: 1.2, s: 'grass', col: '#fff3b0', glow: 1 },
    sarkvir: { n: 'Sárkányvirág-mező', c: 1.43e17, t: 4823, v: 5.79e15, u: 3e17, m: 1.16, s: 'flower', col: '#ff5a3d', glow: 1, sz: 5, pw: 8000, rq: ['meleg', 'kristaly', 'beporz'] },
    meteor: { n: 'Meteorszőlő', c: 1.8e15, t: 2440, v: 2.76e13, u: 4.32e17, m: 1.2, s: 'vine', col: '#ff9a5a', glow: 1 },
    nebula: { n: 'Nebulavirág', c: 1.08e16, t: 2580, v: 1.27e14, u: 2.59e18, m: 1.2, s: 'flower', col: '#c77dff', glow: 1 },
    ustokos: { n: 'Üstökösfa', c: 6.48e16, t: 2720, v: 5.84e14, u: 1.56e19, m: 1.2, s: 'tree', col: '#9fe0ff', glow: 1, lc: ['#b8c7ff', '#7a8cff'] },
    holdker: { n: 'Holdkráter-kert', c: 2e17, t: 2800, v: 1.6e17, u: 5e19, m: 1.22, s: 'flower', col: '#d6e4ff', glow: 1, sz: 3, pw: 25000 },
    galrozsa: { n: 'Galaxisrózsa', c: 3.89e17, t: 2860, v: 2.69e15, u: 9.33e19, m: 1.2, s: 'flower', col: '#ff5fa2', glow: 1 },
    paszuly: { n: 'Égig érő paszuly', c: 2.38e20, t: 5982, v: 3.22e18, u: 5e20, m: 1.16, s: 'vine', col: '#7ad06c', glow: 1, sz: 5, pw: 1e5, rq: ['tamasz', 'gyoker', 'para'] },
    napkit: { n: 'Napkitörés-tök', c: 2.33e18, t: 3000, v: 1.24e16, u: 5.6e20, m: 1.2, s: 'gourd', col: '#ff6a00', glow: 1, hl: '#ffe066' },
    kvazar: { n: 'Kvazárnád', c: 1.4e19, t: 3140, v: 5.68e16, u: 3.36e21, m: 1.2, s: 'corn', col: '#7af0ff', glow: 1 },
    feketel: { n: 'Fekete lyuk-lótusz', c: 8.4e19, t: 3280, v: 2.61e17, u: 2.02e22, m: 1.2, s: 'flower', col: '#6a3dff', glow: 1 },
    vilagfa2: { n: 'Kozmikus Világfa', c: 5e20, t: 3400, v: 4e20, u: 1.2e23, m: 1.22, s: 'tree', col: '#ffe29a', glow: 1, lc: ['#9fe0ff', '#6cc6ff'], sz: 3, pw: 400000 },
    idofa: { n: 'Időfa', c: 5.04e20, t: 3420, v: 1.2e18, u: 1.21e23, m: 1.2, s: 'tree', col: '#ffe29a', glow: 1, lc: ['#d0b0ff', '#9a6ad6'] },
    multiv: { n: 'Multiverzum-virág', c: 3.02e21, t: 3560, v: 5.53e18, u: 7.26e23, m: 1.2, s: 'flower', col: '#ffffff', glow: 1 },
    csillab: { n: 'Csillagkert-labirintus', c: 5.31e23, t: 7170, v: 2.32e21, u: 1e24, m: 1.16, s: 'flower', col: '#ffe29a', glow: 1, sz: 5, pw: 1.5e6, rq: ['kristaly', 'meleg', 'gyoker', 'para'] },
    vegtelen: { n: 'Végtelen Locsolófej-fa', c: 1.81e22, t: 3700, v: 2.55e19, u: 4.35e24, m: 1.2, s: 'tree', col: '#ffd700', glow: 1, lc: ['#ffe29a', '#e8b656'] },
    sarkany: { n: 'Sárkánygyümölcs', c: 1e23, t: 3800, v: 6.4e20, u: 2.4e25, m: 1.22, s: 'tree', col: '#ff3d7f', glow: 1, lc: ['#7ad06c', '#3f9d3a'], pw: 5e3 },
    fonixv: { n: 'Főnixvirág', c: 4e24, t: 3950, v: 1.92e22, u: 9.6e26, m: 1.22, s: 'flower', col: '#ff7a2e', glow: 1, pw: 8e3 },
    kbamb: { n: 'Kristálybambusz', c: 1.6e26, t: 4100, v: 5.76e23, u: 3.84e28, m: 1.22, s: 'corn', col: '#bff4ff', glow: 1, pw: 1.28e4 },
    plazma: { n: 'Plazmatök', c: 3.2e28, t: 4250, v: 8.64e25, u: 1.54e30, m: 1.22, s: 'gourd', col: '#ff4dff', glow: 1, hl: '#ffd6ff', pw: 4.1e5, sz: 2 },
    kodszo: { n: 'Csillagköd-szőlő', c: 2.56e29, t: 4400, v: 5.18e26, u: 6.14e31, m: 1.22, s: 'vine', col: '#8a7aff', glow: 1, pw: 3.28e4 },
    napkor: { n: 'Napkorona', c: 1.02e31, t: 4550, v: 1.56e28, u: 2.46e33, m: 1.22, s: 'sunf', col: '#ffb300', glow: 1, pw: 5.24e4 },
    hliliom: { n: 'Holdfény-liliom', c: 4.1e32, t: 4700, v: 4.67e29, u: 9.83e34, m: 1.22, s: 'flower', col: '#e6f0ff', glow: 1, pw: 8.39e4 },
    aurpaf: { n: 'Aurora-páfrány', c: 1.97e35, t: 4850, v: 1.68e32, u: 3.93e36, m: 1.22, s: 'grass', col: '#7affc4', glow: 1, pw: 1.45e7, sz: 3 },
    szupern: { n: 'Szupernóva-rózsa', c: 6.55e35, t: 5000, v: 4.2e32, u: 1.57e38, m: 1.22, s: 'flower', col: '#ff2a2a', glow: 1, pw: 2.15e5 },
    pulzar: { n: 'Pulzártölgy', c: 2.62e37, t: 5150, v: 1.26e34, u: 6.29e39, m: 1.22, s: 'tree', col: '#9fe0ff', glow: 1, lc: ['#6c9cff', '#3a5acc'], pw: 3.44e5 },
    antialma: { n: 'Antianyag-alma', c: 1.05e39, t: 5300, v: 3.78e35, u: 2.52e41, m: 1.22, s: 'tree', col: '#00e5ff', glow: 1, lc: ['#2a2a4a', '#141428'], pw: 5.5e5 },
    graviton: { n: 'Gravitonbogyó', c: 2.1e41, t: 5450, v: 5.67e37, u: 1.01e43, m: 1.22, s: 'bush', col: '#b388ff', glow: 1, pw: 1.76e7, sz: 2 },
    kvdiny: { n: 'Kvantumdinnye', c: 1.68e42, t: 5600, v: 3.4e38, u: 4.03e44, m: 1.22, s: 'melon', col: '#00c2a8', glow: 1, pw: 1.41e6 },
    fereg: { n: 'Féreglyuk-orchidea', c: 6.71e43, t: 5750, v: 1.02e40, u: 1.61e46, m: 1.22, s: 'flower', col: '#7c4dff', glow: 1, pw: 2.25e6 },
    sotetfa: { n: 'Sötét anyag-fa', c: 3.22e46, t: 5900, v: 3.67e42, u: 6.44e47, m: 1.22, s: 'tree', col: '#2a1a4a', glow: 1, lc: ['#3a2a6a', '#1a0f3a'], pw: 3.89e8, sz: 3 },
    osrobb: { n: 'Ősrobbanás-virág', c: 1.07e47, t: 6050, v: 9.18e42, u: 2.58e49, m: 1.22, s: 'flower', col: '#fff59d', glow: 1, pw: 5.76e6 },
    entnad: { n: 'Entrópia-nád', c: 4.29e48, t: 6200, v: 2.75e44, u: 1.03e51, m: 1.22, s: 'corn', col: '#ff8a65', glow: 1, pw: 9.22e6 },
    idokrist: { n: 'Időkristály-fa', c: 8.59e50, t: 6350, v: 4.13e46, u: 4.12e52, m: 1.22, s: 'tree', col: '#80deea', glow: 1, lc: ['#b2ebf2', '#4dd0e1'], pw: 2.95e8, sz: 2 },
    univmag: { n: 'Univerzum-mag', c: 6.87e51, t: 6500, v: 2.48e47, u: 1.65e54, m: 1.22, s: 'gourd', col: '#ffffff', glow: 1, hl: '#e1bee7', pw: 2.36e7 },
    alfa: { n: 'Az Arany Locsolófej Fája', c: 3.3e54, t: 6650, v: 8.93e49, u: 6.6e55, m: 1.22, s: 'tree', col: '#ffd700', glow: 1, lc: ['#ffe29a', '#e8b656'], pw: 4.08e9, sz: 3 },
    ursal: { n: 'Űrsaláta', loc: 'station', c: 1e20, ck: 0, t: 500, v: 3e18, u: 0, m: 1.15, s: 'rosette', col: '#9be36a', glow: 1, pw: 2e4, nkx: 1 },
    gravep: { n: 'Súlytalan eper', loc: 'station', c: 1.2e21, ck: 30, t: 640, v: 3.6e19, u: 0, m: 1.15, s: 'bush', col: '#ff3b4a', glow: 1, pw: 3.4e4, nkx: 1 },
    hidrpar: { n: 'Hidropóniás paradicsom', loc: 'station', c: 1.44e22, ck: 60, t: 780, v: 4.32e20, u: 0, m: 1.15, s: 'stake', col: '#e5533d', glow: 1, pw: 5.78e4, nkx: 1 },
    csbab: { n: 'Csillagbab', loc: 'station', c: 1.73e23, ck: 90, t: 920, v: 5.18e21, u: 0, m: 1.15, s: 'stake', col: '#9fe0ff', glow: 1, pw: 9.83e4, nkx: 1 },
    orbor: { n: 'Orbitális orchidea', loc: 'station', c: 1.04e25, ck: 120, t: 1060, v: 3.11e23, u: 0, m: 1.15, s: 'flower', col: '#e879f9', glow: 1, pw: 8.35e5, nkx: 1, sz: 2 },
    holdbuza: { n: 'Holdbúza', loc: 'hold', c: 1e28, ck: 0, t: 500, v: 3e26, u: 0, m: 1.15, s: 'grass', col: '#e6e6d6', glow: 1, pw: 5e5, nkx: 8 },
    kraternad: { n: 'Kráternád', loc: 'hold', c: 1.2e29, ck: 240, t: 640, v: 3.6e27, u: 0, m: 1.15, s: 'corn', col: '#cfd8e2', glow: 1, pw: 8.5e5, nkx: 8 },
    holdtok: { n: 'Holdporos tök', loc: 'hold', c: 1.44e30, ck: 480, t: 780, v: 4.32e28, u: 0, m: 1.15, s: 'gourd', col: '#c0c8d0', glow: 1, pw: 1.44e6, nkx: 8 },
    ezrozsa: { n: 'Ezüstrózsa', loc: 'hold', c: 1.73e31, ck: 720, t: 920, v: 5.18e29, u: 0, m: 1.15, s: 'flower', col: '#e8eef4', glow: 1, pw: 2.46e6, nkx: 8 },
    holdfa: { n: 'Holdfa', loc: 'hold', c: 3.11e33, ck: 960, t: 1060, v: 9.33e31, u: 0, m: 1.15, s: 'tree', col: '#f5f5ff', glow: 1, pw: 6.26e7, nkx: 8, sz: 3 },
    vburg: { n: 'Vörös burgonya', loc: 'mars', c: 1e36, ck: 0, t: 500, v: 3e34, u: 0, m: 1.15, s: 'root', col: '#c0392b', glow: 1, pw: 1.5e7, nkx: 60 },
    marskuk: { n: 'Mars-kukorica', loc: 'mars', c: 1.2e37, ck: 1800, t: 640, v: 3.6e35, u: 0, m: 1.15, s: 'corn', col: '#ff7043', glow: 1, pw: 2.55e7, nkx: 60 },
    porbokor: { n: 'Porvihar-bokor', loc: 'mars', c: 1.44e38, ck: 3600, t: 780, v: 4.32e36, u: 0, m: 1.15, s: 'bush', col: '#e64a19', glow: 1, pw: 4.33e7, nkx: 60 },
    vdiny: { n: 'Vörös dinnye', loc: 'mars', c: 1.73e39, ck: 5400, t: 920, v: 5.18e37, u: 0, m: 1.15, s: 'melon', col: '#8b1a1a', glow: 1, pw: 7.37e7, nkx: 60 },
    olympus: { n: 'Olympus-fa', loc: 'mars', c: 3.11e41, ck: 7200, t: 1060, v: 9.33e39, u: 0, m: 1.15, s: 'tree', col: '#ff5722', glow: 1, pw: 1.88e9, nkx: 60, sz: 3 },
    jegsal: { n: 'Jégsaláta', loc: 'europa', c: 1e46, ck: 0, t: 500, v: 3e44, u: 0, m: 1.15, s: 'rosette', col: '#b3e5fc', glow: 1, pw: 4e8, nkx: 500 },
    fagyv: { n: 'Fagyvirág', loc: 'europa', c: 1.2e47, ck: 1.5e4, t: 640, v: 3.6e45, u: 0, m: 1.15, s: 'flower', col: '#e1f5fe', glow: 1, pw: 6.8e8, nkx: 500 },
    hinar: { n: 'Mélytengeri hínár', loc: 'europa', c: 1.44e48, ck: 3e4, t: 780, v: 4.32e46, u: 0, m: 1.15, s: 'vine', col: '#26c6da', glow: 1, pw: 1.16e9, nkx: 500 },
    kbogyo: { n: 'Kristálybogyó', loc: 'europa', c: 1.73e49, ck: 4.5e4, t: 920, v: 5.18e47, u: 0, m: 1.15, s: 'bush', col: '#80deea', glow: 1, pw: 1.97e9, nkx: 500 },
    jegfeny: { n: 'Jégfenyő', loc: 'europa', c: 3.11e51, ck: 6e4, t: 1060, v: 9.33e49, u: 0, m: 1.15, s: 'tree', col: '#e0f7fa', glow: 1, pw: 5.01e10, nkx: 500, sz: 3 },
    metnad: { n: 'Metánnád', loc: 'titan', c: 1e56, ck: 0, t: 500, v: 3e54, u: 0, m: 1.15, s: 'corn', col: '#ffb74d', glow: 1, pw: 1e10, nkx: 4000 },
    nkodv: { n: 'Narancsködvirág', loc: 'titan', c: 1.2e57, ck: 1.2e5, t: 640, v: 3.6e55, u: 0, m: 1.15, s: 'flower', col: '#ff9800', glow: 1, pw: 1.7e10, nkx: 4000 },
    szhtok: { n: 'Szénhidrogén-tök', loc: 'titan', c: 1.44e58, ck: 2.4e5, t: 780, v: 4.32e56, u: 0, m: 1.15, s: 'gourd', col: '#e65100', glow: 1, pw: 2.89e10, nkx: 4000 },
    titpaf: { n: 'Titán-páfrány', loc: 'titan', c: 1.73e59, ck: 3.6e5, t: 920, v: 5.18e57, u: 0, m: 1.15, s: 'grass', col: '#ffcc80', glow: 1, pw: 4.91e10, nkx: 4000 },
    borostyan: { n: 'Borostyánfa', loc: 'titan', c: 3.11e61, ck: 4.8e5, t: 1060, v: 9.33e59, u: 0, m: 1.15, s: 'tree', col: '#ffa000', glow: 1, pw: 1.25e12, nkx: 4000, sz: 3 },
    idgyongy: { n: 'Idegen gyöngy', loc: 'kepler', c: 1e68, ck: 0, t: 500, v: 3e66, u: 0, m: 1.15, s: 'bush', col: '#ea80fc', glow: 1, pw: 3e11, nkx: 30000.0 },
    kettnap: { n: 'Kettős-nap virág', loc: 'kepler', c: 1.2e69, ck: 9e5, t: 640, v: 3.6e67, u: 0, m: 1.15, s: 'sunf', col: '#ffd54f', glow: 1, pw: 5.1e11, nkx: 30000.0 },
    lebdiny: { n: 'Lebegő dinnye', loc: 'kepler', c: 1.44e70, ck: 1.8e6, t: 780, v: 4.32e68, u: 0, m: 1.15, s: 'melon', col: '#7c4dff', glow: 1, pw: 8.67e11, nkx: 30000.0 },
    osszolo: { n: 'Ősidegen szőlő', loc: 'kepler', c: 1.73e71, ck: 2.7e6, t: 920, v: 5.18e69, u: 0, m: 1.15, s: 'vine', col: '#b388ff', glow: 1, pw: 1.47e12, nkx: 30000.0 },
    vilagokf: { n: 'Világok Fája', loc: 'kepler', c: 3.11e73, ck: 3.6e6, t: 1060, v: 9.33e71, u: 0, m: 1.15, s: 'tree', col: '#ffd700', glow: 1, pw: 3.76e13, nkx: 30000.0, sz: 3 },
    rezbab: { n: 'Rézbab', loc: 'station', c: 3e21, ck: 50, t: 600, v: 3e19, u: 0, m: 1.12, s: 'stake', col: '#d9822b', glow: 1, met: 'rez', ma: 0.2 },
    titanmoha: { n: 'Titánmoha', loc: 'hold', c: 3e29, ck: 50, t: 600, v: 3e27, u: 0, m: 1.12, s: 'grass', col: '#cfd8dc', glow: 1, met: 'tit', ma: 0.15 },
    vasvirag: { n: 'Vasvirág', loc: 'mars', c: 3e37, ck: 50, t: 600, v: 3e35, u: 0, m: 1.12, s: 'flower', col: '#8d6e63', glow: 1, met: 'vas', ma: 2 },
    iridorch: { n: 'Irídium-orchidea', loc: 'europa', c: 3e47, ck: 50, t: 600, v: 3e45, u: 0, m: 1.12, s: 'flower', col: '#80d8ff', glow: 1, met: 'iri', ma: 0.1 },
    vasnad: { n: 'Vasnád', loc: 'titan', c: 3e57, ck: 50, t: 600, v: 3e55, u: 0, m: 1.12, s: 'corn', col: '#a1887f', glow: 1, met: 'vas', ma: 30 },
    neutmag: { n: 'Neutrónium-mag', loc: 'kepler', c: 3e69, ck: 50, t: 600, v: 3e67, u: 0, m: 1.12, s: 'gourd', col: '#37474f', glow: 1, met: 'neu', ma: 0.05 },
    napelev: { n: 'Napelem-levél', loc: 'station', c: 2.49e25, ck: 150, cc: 15, t: 1200, v: 7.46e23, u: 0, m: 1.15, s: 'rosette', col: '#7ad06c', glow: 1, pw: 2.84e5, nkx: 1 },
    mgomba: { n: 'Mikrogravitációs gomba', loc: 'station', c: 2.99e26, ck: 180, cc: 30, t: 1340, v: 8.96e24, u: 0, m: 1.15, s: 'bush', col: '#e8c27a', glow: 1, pw: 4.83e5, nkx: 1 },
    kozkuk: { n: 'Kozmikus kukorica', loc: 'station', c: 3.58e27, ck: 210, cc: 45, t: 1480, v: 1.07e26, u: 0, m: 1.15, s: 'corn', col: '#ffe066', glow: 1, pw: 8.21e5, nkx: 1 },
    fenymoha: { n: 'Fénymoha', loc: 'station', c: 4.3e28, ck: 240, cc: 60, t: 1620, v: 1.29e27, u: 0, m: 1.15, s: 'grass', col: '#a8ffb0', glow: 1, pw: 1.4e6, nkx: 1 },
    orbitfa: { n: 'Orbitfa', loc: 'station', c: 2.58e30, ck: 270, cc: 75, t: 1760, v: 7.74e28, u: 0, m: 1.15, s: 'tree', col: '#9fe0ff', glow: 1, pw: 1.19e7, nkx: 1, sz: 2 },
    holdgomba: { n: 'Holdgomba', loc: 'hold', c: 2.49e33, ck: 1200, cc: 180, t: 1200, v: 7.46e31, u: 0, m: 1.15, s: 'bush', col: '#cfd8e2', glow: 1, pw: 7.1e6, nkx: 8 },
    szliliom: { n: 'Szürke liliom', loc: 'hold', c: 2.99e34, ck: 1440, cc: 360, t: 1340, v: 8.96e32, u: 0, m: 1.15, s: 'flower', col: '#b0b8c0', glow: 1, pw: 1.21e7, nkx: 8 },
    arapaly: { n: 'Árapály-szőlő', loc: 'hold', c: 3.58e35, ck: 1680, cc: 540, t: 1480, v: 1.07e34, u: 0, m: 1.15, s: 'vine', col: '#90a4ae', glow: 1, pw: 2.05e7, nkx: 8 },
    holdkodiny: { n: 'Holdkő-dinnye', loc: 'hold', c: 4.3e36, ck: 1920, cc: 720, t: 1620, v: 1.29e35, u: 0, m: 1.15, s: 'melon', col: '#78909c', glow: 1, pw: 3.49e7, nkx: 8 },
    ezfeny: { n: 'Ezüstfenyő', loc: 'hold', c: 7.74e38, ck: 2160, cc: 900, t: 1760, v: 2.32e37, u: 0, m: 1.15, s: 'tree', col: '#eceff1', glow: 1, pw: 8.89e8, nkx: 8, sz: 3 },
    rozsrepa: { n: 'Rozsdarépa', loc: 'mars', c: 2.49e41, ck: 9000, cc: 2400, t: 1200, v: 7.46e39, u: 0, m: 1.15, s: 'root', col: '#d84315', glow: 1, pw: 2.13e8, nkx: 60 },
    vnapr: { n: 'Vörös napraforgó', loc: 'mars', c: 2.99e42, ck: 1.08e4, cc: 4800, t: 1340, v: 8.96e40, u: 0, m: 1.15, s: 'sunf', col: '#ff5722', glow: 1, pw: 3.62e8, nkx: 60 },
    kraterbab: { n: 'Kráterbab', loc: 'mars', c: 3.58e43, ck: 1.26e4, cc: 7200, t: 1480, v: 1.07e42, u: 0, m: 1.15, s: 'stake', col: '#bf360c', glow: 1, pw: 6.16e8, nkx: 60 },
    homokfu: { n: 'Homokvihar-fű', loc: 'mars', c: 4.3e44, ck: 1.44e4, cc: 9600, t: 1620, v: 1.29e43, u: 0, m: 1.15, s: 'grass', col: '#ff8a65', glow: 1, pw: 1.05e9, nkx: 60 },
    voriasfa: { n: 'Vörös óriásfa', loc: 'mars', c: 7.74e46, ck: 1.62e4, cc: 1.2e4, t: 1760, v: 2.32e45, u: 0, m: 1.15, s: 'tree', col: '#c62828', glow: 1, pw: 2.67e10, nkx: 60, sz: 3 },
    jegvirag: { n: 'Jégvirág', loc: 'europa', c: 2.49e51, ck: 7.5e4, cc: 3e4, t: 1200, v: 7.46e49, u: 0, m: 1.15, s: 'flower', col: '#e1f5fe', glow: 1, pw: 5.68e9, nkx: 500 },
    gejzbab: { n: 'Gejzírbab', loc: 'europa', c: 2.99e52, ck: 9e4, cc: 6e4, t: 1340, v: 8.96e50, u: 0, m: 1.15, s: 'stake', col: '#4fc3f7', glow: 1, pw: 9.66e9, nkx: 500 },
    fagyrepa: { n: 'Fagyrépa', loc: 'europa', c: 3.58e53, ck: 1.05e5, cc: 9e4, t: 1480, v: 1.07e52, u: 0, m: 1.15, s: 'root', col: '#81d4fa', glow: 1, pw: 1.64e10, nkx: 500 },
    krtok: { n: 'Kristálytök', loc: 'europa', c: 4.3e54, ck: 1.2e5, cc: 1.2e5, t: 1620, v: 1.29e53, u: 0, m: 1.15, s: 'gourd', col: '#b3e5fc', glow: 1, pw: 2.79e10, nkx: 500 },
    oceanfa: { n: 'Óceánfa', loc: 'europa', c: 2.58e56, ck: 1.35e5, cc: 1.5e5, t: 1760, v: 7.74e54, u: 0, m: 1.15, s: 'tree', col: '#29b6f6', glow: 1, pw: 2.37e11, nkx: 500, sz: 2 },
    kodgomba: { n: 'Ködgomba', loc: 'titan', c: 2.49e61, ck: 6e5, cc: 4.5e5, t: 1200, v: 7.46e59, u: 0, m: 1.15, s: 'bush', col: '#ffcc80', glow: 1, pw: 1.42e11, nkx: 4000 },
    metlil: { n: 'Metánliliom', loc: 'titan', c: 2.99e62, ck: 7.2e5, cc: 9e5, t: 1340, v: 8.96e60, u: 0, m: 1.15, s: 'flower', col: '#ffb74d', glow: 1, pw: 2.41e11, nkx: 4000 },
    narnad: { n: 'Narancsnád', loc: 'titan', c: 3.58e63, ck: 8.4e5, cc: 1.35e6, t: 1480, v: 1.07e62, u: 0, m: 1.15, s: 'corn', col: '#ff9800', glow: 1, pw: 4.1e11, nkx: 4000 },
    szdiny: { n: 'Szerves dinnye', loc: 'titan', c: 4.3e64, ck: 9.6e5, cc: 1.8e6, t: 1620, v: 1.29e63, u: 0, m: 1.15, s: 'melon', col: '#e65100', glow: 1, pw: 6.98e11, nkx: 4000 },
    titfeny: { n: 'Titánfenyő', loc: 'titan', c: 7.74e66, ck: 1.08e6, cc: 2.25e6, t: 1760, v: 2.32e65, u: 0, m: 1.15, s: 'tree', col: '#ff6f00', glow: 1, pw: 1.78e13, nkx: 4000, sz: 3 },
    csmoha: { n: 'Csillagmoha', loc: 'kepler', c: 2.49e73, ck: 4.5e6, cc: 6e6, t: 1200, v: 7.46e71, u: 0, m: 1.15, s: 'grass', col: '#ce93d8', glow: 1, pw: 4.26e12, nkx: 30000.0 },
    kettszolo: { n: 'Kettős szőlő', loc: 'kepler', c: 2.99e74, ck: 5.4e6, cc: 1.2e7, t: 1340, v: 8.96e72, u: 0, m: 1.15, s: 'vine', col: '#ab47bc', glow: 1, pw: 7.24e12, nkx: 30000.0 },
    idnapr: { n: 'Idegen napraforgó', loc: 'kepler', c: 3.58e75, ck: 6.3e6, cc: 1.8e7, t: 1480, v: 1.07e74, u: 0, m: 1.15, s: 'sunf', col: '#e040fb', glow: 1, pw: 1.23e13, nkx: 30000.0 },
    lebtok: { n: 'Lebegő tök', loc: 'kepler', c: 4.3e76, ck: 7.2e6, cc: 2.4e7, t: 1620, v: 1.29e75, u: 0, m: 1.15, s: 'gourd', col: '#7e57c2', glow: 1, pw: 2.09e13, nkx: 30000.0 },
    osfa: { n: 'Ősfa', loc: 'kepler', c: 7.74e78, ck: 8.1e6, cc: 3e7, t: 1760, v: 2.32e77, u: 0, m: 1.15, s: 'tree', col: '#ffd700', glow: 1, pw: 5.34e14, nkx: 30000.0, sz: 3 },
  };
  // helyszínek: mindegyiknek saját kertje és kínálata van; a nem látott helyszínek a háttérben termelnek
  const LOCS = {
    earth: { n: 'Föld', ic: '🌍', cost: 0, nk: 0 },
    station: { n: 'Űrállomás', ic: '🛰️', cost: 5e20, nk: 1500, tm: 1e17, pal: ['#4a5262', '#323a48'], sky: ['#0b1020', '#02040a'], ff: ['#5b6370', '#3a4250'], stars: 1, kind: 'metal' },
    hold: { n: 'Hold', ic: '🌙', cost: 1e28, nk: 2e4, tm: 1e25, pal: ['#a3a8b0', '#82878f'], sky: ['#05070c', '#000000'], ff: ['#6b7280', '#4b5563'], stars: 1, kind: 'crater' },
    mars: { n: 'Mars', ic: '🔴', cost: 1e36, cc: 500, nk: 3e5, tm: 1e33, pal: ['#bb5a30', '#974222'], sky: ['#40200f', '#140805'], ff: ['#6a3a22', '#4a2414'], stars: 0, kind: 'crater' },
    europa: { n: 'Európa', ic: '🧊', cost: 1e46, cc: 1e4, nk: 5e6, tm: 1e43, pal: ['#dcf0fa', '#b5d7ea'], sky: ['#061025', '#02040a'], ff: ['#7aa0b8', '#4a7088'], stars: 1, kind: 'ice' },
    titan: { n: 'Titán', ic: '🟠', cost: 1e56, cc: 2e5, nk: 8e7, tm: 1e53, pal: ['#cf8f3c', '#a96d29'], sky: ['#4a2a0a', '#1a0e02'], ff: ['#7a5230', '#4a3018'], stars: 0, kind: 'dust' },
    kepler: { n: 'Kepler-22b', ic: '🪐', cost: 1e68, cc: 4e6, nk: 1.5e9, tm: 1e65, pal: ['#4f2d82', '#3a1f5c'], sky: ['#120828', '#05020c'], ff: ['#6a4a9a', '#3a2a5a'], stars: 1, kind: 'alien' }
  };
  const LORD = Object.keys(LOCS);
  const SIZES = [[8, 6], [10, 7], [12, 8], [14, 9], [16, 10], [18, 11], [20, 12], [23, 14], [26, 15], [29, 17], [32, 19], [36, 21], [40, 24], [44, 27], [48, 30], [52, 32], [56, 35], [60, 37], [64, 40]];
  const SIZEC = [500, 4000, 25000, 150000, 1e6, 6e6, 4e7, 2.5e8, 1.5e9, 8e9, 4e10, 2e11, 1.5e12, 1e13, 7e13, 5e14, 3e15, 2e16];
  const UP = {
    nyomas: { n: 'Nyomás', ic: '💧', cost: n => pw(150, 1.9, n), max: Infinity },
    hatas: { n: 'Hatásfok', ic: '⚙️', cost: n => pw(2000, 2.4, n), max: Infinity, u: 3000 },
    tap: { n: 'Tápoldat', ic: '🧪', cost: n => pw(250, 2.1, n), max: Infinity },
    piac: { n: 'Piac', ic: '🧺', cost: n => pw(400, 2.25, n), max: Infinity },
    talaj: { n: 'Talajjavítás', ic: '🪱', cost: n => pw(1200, 2.5, n), max: Infinity, u: 1500 },
    vetomag: { n: 'Nemesítés', ic: '🌱', cost: n => pw(3000, 3, n), max: 10, u: 5000 },
    kombajn: { n: 'Kombájn', ic: '🚜', cost: n => pw(600, 2.8, n), max: 20, u: 800 },
    motor: { n: 'Motor', ic: '🔥', cost: n => pw(4000, 2.3, n), max: Infinity, u: 6000 },
    kertesz: { n: 'Kertész', ic: '🧑‍🌾', cost: n => pw(800, 3, n), max: 6 },
    ido: { n: 'Időzítő', ic: '⏱️', cost: n => pw(5000, 3.2, n), max: 40, u: 10000 },
    takarek: { n: 'Víztakarékosság', ic: '♻️', cost: n => pw(8000, 2.7, n), max: 10, u: 20000 },
    szerencse: { n: 'Szerencse', ic: '🍀', cost: n => pw(25000, 3, n), max: 10, u: 60000 },
    uveghaz: { n: 'Üvegház', ic: '🏠', cost: n => pw(60000, 3.5, n), max: 12, u: 150000 },
    tartaly: { n: 'Gyűjtőtartály', ic: '🛢️', cost: n => pw(90000, 2.8, n), max: Infinity, u: 250000 },
    raktar: { n: 'Hűtőház', ic: '❄️', cost: n => pw(2e5, 3.2, n), max: 12, u: 5e5 },
    dron: { n: 'Aratódrón', ic: '🚁', cost: n => pw(1.5e6, 4, n), max: 20, u: 2e6 },
    export: { n: 'Exportpiac', ic: '🚢', cost: n => pw(5e8, 4.5, n), max: Infinity, u: 5e8 },
    fuzio: { n: 'Fúziós szivattyú', ic: '⚛️', ck: n => pw(50, 2.2, n), cost: n => pw(2e9, 15, n), max: Infinity, u: 2e9 },
    klima: { n: 'Klímakontroll', ic: '🌡️', ck: n => pw(80, 2.3, n), cost: n => pw(1e10, 18, n), max: Infinity, u: 1e10 },
    genlab: { n: 'Génlabor', ic: '🧬', ck: n => pw(120, 2.4, n), cost: n => pw(5e10, 20, n), max: Infinity, u: 5e10 },
    robot: { n: 'Robotflotta', ic: '🤖', ck: n => pw(150, 2.5, n), cost: n => pw(2e11, 12, n), max: Infinity, u: 2e11 },
    kvantum: { n: 'Kvantumöntözés', ic: '🌀', ck: n => pw(2000, 6, n), cost: n => pw(1e13, 150, n), max: 6, u: 1e13 },
    urpiac: { n: 'Bolygóközi piac', ic: '🪐', ck: n => pw(500, 2.6, n), cost: n => pw(1e14, 30, n), max: Infinity, u: 1e14 },
    csillag: { n: 'Csillagenergia', ic: '☀️', ck: n => pw(3000, 2.8, n), cost: n => pw(1e18, 800, n), max: Infinity, u: 1e18 },
    idohurok: { n: 'Időhurok', ic: '⏳', ck: n => pw(1e4, 3, n), cost: n => pw(1e21, 1500, n), max: Infinity, u: 1e21 },
    multiv: { n: 'Multiverzum-piac', ic: '🌌', ck: n => pw(5e4, 3.5, n), cost: n => pw(1e25, 1e5, n), max: Infinity, u: 1e25 },
    nektar: { n: 'Méhészet', ic: '🍯', cost: n => pw(5e4, 3.2, n), max: Infinity, u: 5e4 },
    kaptar: { n: 'Kaptárfejlesztés', ic: '🐝', ck: n => pw(20, 2.2, n), cost: n => pw(1e7, 4, n), max: Infinity, u: 1e7 },
    raketa: { n: 'Rakéta', ic: '🚀', ck: n => B(1000), cost: n => B(1e20), max: 1, u: 1e19 },
    hajtomu: { n: 'Ionhajtómű', sp: 1, ic: '🔋', ck: n => pw(2000, 8, n), cost: n => pw(2e21, 50, n), max: 5, u: 1e20 },
    szemelyzet: { n: 'Űrszemélyzet', sp: 1, ic: '👩‍🚀', ck: n => pw(1500, 6, n), cost: n => pw(1e21, 40, n), max: 4, u: 1e20 },
    cpgy: { n: 'Gyűjtőhálózat', ic: '📡', sp: 1, cc: n => pw(50, 2.5, n), cost: n => pw(1e21, 30, n), max: Infinity, u: 1e20 },
    kozar: { n: 'Kozmikus kereslet', ic: '💫', sp: 1, cc: n => pw(100, 3, n), cost: n => pw(1e22, 60, n), max: Infinity, u: 1e20 },
    gravk: { n: 'Gravitációs kertészet', ic: '🌀', sp: 1, cc: n => pw(200, 3, n), cost: n => pw(1e23, 80, n), max: Infinity, u: 1e20 },
    csmot: { n: 'Csillagmotor', ic: '☄️', sp: 1, cc: n => pw(80, 2.6, n), cost: n => pw(1e22, 50, n), max: Infinity, u: 1e20 },
    telek: { n: 'Telek', ic: '🏡', cost: n => B(SIZEC[n]).mul(LOCS[S.loc].tm || 1), max: SIZEC.length }
  };
  // állandó fejlesztések hírnév-csillagokért; új birtok után is megmaradnak (c: ár a következő szintre)
  const PERK = {
    ptap: { n: 'Örök tápoldat', ic: '🌿', c: n => pw(3, 1.55, n).mul((1 + n) ** 2).round(), max: Infinity },
    ppiac: { n: 'Híres márka', ic: '🏷️', c: n => pw(3, 1.55, n).mul((1 + n) ** 2).round(), max: Infinity },
    pviz: { n: 'Örök forrás', ic: '⛲', c: n => pw(2, 1.5, n).mul((1 + n) ** 2).round(), max: Infinity },
    pkezd: { n: 'Kezdőtőke', ic: '💰', c: n => pw(2, 3, n).mul((1 + n) ** 2).round(), max: 30 },
    ptelek: { n: 'Örökölt telek', ic: '🗺️', c: n => pw(4, 2.2, n).mul((1 + n) ** 2).round(), max: 12 },
    pup: { n: 'Örökölt tudás', ic: '📚', c: n => pw(5, 1.9, n).mul((1 + n) ** 2).round(), max: Infinity },
    pauto: { n: 'Örökölt kertész', ic: '🧑‍🌾', c: n => pw(2, 2.5, n).mul((1 + n) ** 2).round(), max: 6 },
    pgep: { n: 'Gépház', ic: '🚜', c: n => pw(6, 2.5, n).mul((1 + n) ** 2).round(), max: 20 },
    pgyors: { n: 'Turbómotorok', ic: '⚡', c: n => pw(4, 1.8, n).mul((1 + n) ** 2).round(), max: Infinity },
    poff: { n: 'Éjjeliőr', ic: '🌙', c: n => pw(3, 2, n).mul((1 + n) ** 2).round(), max: 20 },
    pszer: { n: 'Szerencsecsillag', ic: '🌟', c: n => pw(8, 2, n).mul((1 + n) ** 2).round(), max: 40 },
    pkedv: { n: 'Törzsvásárló', ic: '🧾', c: n => pw(5, 2.2, n).mul((1 + n) ** 2).round(), max: 8 },
    pcsill: { n: 'Csillagász', ic: '🔭', c: n => pw(10, 2.4, n).mul((1 + n) ** 2).round(), max: Infinity },
    phir: { n: 'Hírnév ereje', ic: '👑', c: n => pw(20, 2.2, n).mul((1 + n) ** 2).round(), max: Infinity },
    pszorz: { n: 'Örök szorzó', ic: '✖️', c: n => pw(50, 3, n).mul((1 + n) ** 2).round(), max: Infinity },
    halo: { n: 'Megmaradó hálózat', ic: '🔧', c: n => B(5), max: 1 }
  };
  const pk = k => +(S.perk[k] || 0);

  const TABS0 = [['mod', 'MODULOK'], ['pl', 'NÖVÉNYEK'], ['up', 'FEJLESZTÉS'], ['bir', 'BIRTOK']], GTABS = [['gsys', 'CSILLAGRENDSZER'], ['ggal', 'GALAXISOK']];
  const COND = { src: 1, pipe: 1, pump: 1, spr: 1, drip: 1, rot: 1, hordo: 1, kod: 1, kut: 1, piv: 1, szelep: 1, fok: 1, szuro: 1, linx: 1, liny: 1, torony: 1,
    mikro: 1, turbo: 1, szelk: 1, napel: 1, to: 1, giga: 1, sotal: 1, arany: 1, szivv: 1, kristr: 1, felho: 1, gejzir: 1, jeg: 1, portal: 1, mega: 1, hidro: 1, tenger: 1, ciklon: 1, csillkut: 1, nebula2: 1, flyuk: 1, idoforr: 1, vegtszor: 1, aurora: 1, csillagh: 1, esokir: 1, genezis: 1, univont: 1, vizrec: 1, urspr: 1, urgyuru: 1, ledk: 1, jegbanya: 1, holdspr: 1, kratero: 1, sarkijeg: 1, marsspr: 1, terraf: 1, kupola: 1, oceanf: 1, jegkod: 1, oceano: 1, bioreak: 1, metanto: 1, kodkor: 1, titcikl: 1, szervgy: 1, kettkut: 1, fenyperm: 1, vilagont: 1, eletfak: 1 , plazmaszo: 1, orbfarm: 1, holdkod: 1, holdkut: 1, marsrot: 1, jegsapka: 1, hoforr: 1, jegszo: 1, aramlas: 1, borkupola: 1, narszo: 1, krioforr: 1, kettszo: 1, csillforr: 1 , lagyito: 1, tapado: 1, uvster: 1, oxig: 1, asvany: 1, kvantviz: 1 };
  // több mezős elemek: a bal felső mező az „anyamező”, a többin '#<anyamező indexe>' jelölő áll
  const anc = i => { const k = S.k[i]; return k && k[0] === '#' ? +k.slice(1) : i; }, kAt = i => S.k[anc(i)], condAt = i => !!COND[kAt(i)];
  const szOf = k => (MOD[k] || PL[k] || {}).sz || 1;
  const cells = (i, sz = szOf(S.k[i])) => { const c = i % COLS, r = Math.floor(i / COLS), o = []; for (let y = 0; y < sz; y++) for (let x = 0; x < sz; x++) o.push(idx(c + x, r + y)); return o; };
  const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // tudományos jelölés 1 millió fölött (pl. 1,23E45); a túlcsordult érték is olvasható marad
  const sci = Nagy.sci;
  const fmt = sci;
  /* készletek nagy számként; a régi, túlcsordult (végtelen / NaN / negatív) mentések javítása */
  const GOOD = {}; // az utolsó ép érték készletenként: ha futás közben valami végtelenre / NaN-ra futna, ahhoz térünk vissza (nincs plafon)
  function sanit(full) { if (!S) return; const ok = v => v instanceof Nagy.D && v.finite && !v.neg;
    if (full) { const fix = (v, hi) => { if (v === null || v === undefined || (typeof v === 'number' && !(v >= 0))) return hi ? B(1e300) : ZERO; const d = B(v); return d.finite && !d.neg ? d : hi ? B(1e300) : ZERO; };
      S.life = fix(S.life, true); const big = S.life.gte(1e250); for (const k of ['money', 'nek', 'cp']) S[k] = fix(S[k], big); for (const k of ['star', 'starT', 'sent']) S[k] = fix(S[k], false);
      if (S.met) for (const k in S.met) S.met[k] = fix(S.met[k], big);
      for (let i = 0; i < S.g.length; i++) if (typeof S.g[i] !== 'number' || !(S.g[i] >= 0) || !isFinite(S.g[i])) S.g[i] = 0; }
    for (const k of ['life', 'money', 'nek', 'cp', 'star', 'starT']) { if (ok(S[k])) GOOD[k] = S[k]; else S[k] = GOOD[k] || ZERO; }
    if (S.met) for (const k in S.met) { if (ok(S.met[k])) GOOD['m' + k] = S.met[k]; else S.met[k] = GOOD['m' + k] || ZERO; } }
  let GR = { ft: 0, nek: 0, cp: 0, met: {}, gal: [] }, S = null, L = null, NET = null, drag = null, lastTile = -1, fl = [], dust = [], confirmT = 0, CB = [], DR = [], MO = null, RP = null, panS = null, pinch = null, pend = null, wheelOn = 0;
  const CAM = { z: 0, cx: null, cy: null }, PT = new Map(), MMC = { t: -9 };
  const MOB = new Map(), TEX = { ts: 0, c: [] };

  const idx = (c, r) => r * COLS + c;
  const size = () => SIZES[S.up.telek];
  const inside = (c, r) => c >= 0 && r >= 0 && c < size()[0] && r < size()[1];
  // a szorzók nagy számok (a hatványok korlátlanul nőhetnek)
  const speed = () => B((1 + .2 * S.up.tap) * (1 + .25 * pk('ptap')) * NET.fg * (NET.wg || 1)).mul(B(1.25).pow(S.up.klima)).mul(B(1.8).pow(S.up.idohurok)).mul(B(1.3).pow(S.up.gravk)),
    price = () => B((NET && NET.wy || 1) * (1 + .25 * S.up.piac) * (1 + .15 * S.up.talaj) * (1 + .3 * pk('ppiac'))).mul(B(1.3).pow(pk('pszorz'))).mul(B(1.25).pow(S.up.export)).mul(B(1.5).pow(S.up.genlab)).mul(B(1.8).pow(S.up.urpiac)).mul(B(2.5).pow(S.up.csillag)).mul(B(5).pow(S.up.multiv)).mul(B(1.4).pow(S.up.kozar)).mul(B(S.star).mul(.1 + .02 * pk('phir')).add(1));
  const goldP = () => Math.min(.6, .02 * S.up.szerencse + .01 * pk('pszer') + (NET && NET.wgold || 0)), goldX = () => 5 + pk('pszer'), luck = () => 1 + goldP() * (goldX() - 1), ghW = () => .08 * S.up.uveghaz, cbBonus = () => 1.25 + .1 * S.up.tartaly;
  const auto = () => S.up.kertesz > 0 || S.up.kombajn > 0 || S.up.dron > 0;
  const offF = () => !auto() ? 0 : Math.min(.99, (S.up.kertesz ? .3 + .12 * (S.up.kertesz - 1) : 0) + .08 * S.up.kombajn + .06 * S.up.dron + .05 * S.up.raktar + .05 * pk('poff'));
  const offMax = () => (8 + 2 * S.up.ido + (S.perk.hosszu ? 16 : 0) + 8 * pk('poff')) * 3600;
  const unlocked = it => S.life.gte(it.u || 0);
  const own = k => { let n = 0; for (const x of S.k) if (x === k) n++; return n; };
  const ccOf = k => { const it = MOD[k] || PL[k]; return it && it.cc ? pw(it.cc, 1.08, own(k)).round() : ZERO; };
  const ckOf = k => { const it = MOD[k] || PL[k]; return it && it.ck ? pw(it.ck, 1.08, own(k)).round() : ZERO; };
  const costOf = (k, n = own(k)) => { const it = MOD[k] || PL[k]; return pw(it.c, it.m, n).mul((1 - .06 * (S.up.vetomag || 0)) * (1 - .05 * pk('pkedv'))).round(); };
  const starsAt = life => B(life).div(1e5).cbrt().floor();
  const starGain = () => starsAt(S.life).mul(1 + .15 * pk('pcsill')).floor().sub(S.starT).max(ZERO);

  function fresh(keep) {
    const s = { money: B(60), life: ZERO, up: Object.fromEntries(Object.keys(UP).map(k => [k, 0])), k: Array(COLS * ROWS).fill(''), g: Array(COLS * ROWS).fill(0), t: Date.now(), sent: ZERO, star: ZERO, starT: ZERO, perk: {}, runs: 0, vc: {}, nek: ZERO, cp: ZERO, met: { vas: ZERO, rez: ZERO, tit: ZERO, iri: ZERO, neu: ZERO }, gx: { gals: [], cur: 0, sel: 0, up: {}, won: {} }, gv: false, loc: 'earth', locs: {}, unl: ['earth'], v3: 1 };
    s.k[idx(...SRC)] = 'src';
    if (keep) Object.assign(s, keep);
    return s;
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.k) {
        const f = fresh();
        // régebbi, kisebb rácsú mentések átültetése
        const oc = { 160: 16, 240: 20, 960: 40 }[s.k.length];
        if (oc) { const k = Array(COLS * ROWS).fill(''), g = Array(COLS * ROWS).fill(0), vc = {}, at = i => idx(i % oc, Math.floor(i / oc));
          s.k.forEach((v, i) => { k[at(i)] = v; g[at(i)] = (s.g || [])[i] || 0; }); for (const [i, v] of Object.entries(s.vc || {})) vc[at(+i)] = v; s.k = k; s.g = g; s.vc = vc; }
        // a hírnév-csillag új (lassabb) képlete: a már megszerzetteket nem vesszük el, de innen az új ütemben jár
        if (!s.v3) { s.v3 = 1; s.starT = starsAt(B(s.life || 0)); }
        // a vízkezelők 2×2-esek lettek: a régi 1×1-esek kibővülnek, ha van hely, különben lekerülnek (a szintjük megmarad)
        const wqFix = k => { for (let i = 0; i < k.length; i++) { const v = k[i]; if (!v || !MOD[v] || !MOD[v].wq) continue; const c = i % COLS, r = Math.floor(i / COLS), cs = [i + 1, i + COLS, i + COLS + 1];
            if (c + 1 < COLS && r + 1 < ROWS && cs.every(j => !k[j] || k[j] === '#' + i)) cs.forEach(j => { k[j] = '#' + i; }); else if (!cs.every(j => k[j] === '#' + i)) { k[i] = ''; s.money = (s.money || 0) + MOD[v].c; } } };
        if (s.k.length === COLS * ROWS) { wqFix(s.k); for (const l of Object.values(s.locs || {})) if (l && l.k && l.k.length === COLS * ROWS) wqFix(l.k); }
        for (const k of ['money', 'life', 'nek', 'cp', 'star', 'starT', 'sent']) if (k in s) s[k] = s[k] === null ? s[k] : B(s[k]); if (s.met) for (const k in s.met) s.met[k] = s.met[k] === null ? null : B(s.met[k]);
        if (s.k.length === COLS * ROWS) return { ...f, ...s, up: { ...f.up, ...s.up }, perk: { ...(s.perk || {}) }, vc: { ...(s.vc || {}) }, locs: { ...(s.locs || {}) }, unl: [...(s.unl || ['earth'])] };
      }
    } catch (_) {}
    return fresh();
  }
  function save() { if (!S) return; S.t = Date.now(); try { localStorage.setItem(KEY, ser()); } catch (_) {} if (BO && window.top !== window) try { parent.postMessage({ hgws: 'bo', key: BO, life: Math.min(1e300, S.life.toNumber()) }, location.origin); } catch (_) {} }
  function ser() { const { bgMsg, lr, gxT, rt, away, saveT, syncT, hudT, info, hover, tip, lp, anim, linc, lincT, cloudT, ...o } = S; if (o.gx) o.gx = { ...o.gx, pick: null }; return JSON.stringify(o); }
  /* felhőmentés (bejelentkezve): a főoldal tárolja a Firestore-ban. Mindig a legnagyobb összbevételű (life) mentés győz:
     betöltéskor a nagyobbik marad meg, feltöltés csak akkor megy, ha a helyi legalább akkora, mint a felhőben lévő. */
  let CL = { asked: 0, life: -1, lg: -1, at: Date.now() }, GG = null; const lgOf = d => { const l = B(d).log10(); return isFinite(l) ? l : -1; };
  const inFrame = () => { try { return window.top !== window; } catch (_) { return false; } };
  function cloudPush(force, manual) { const say = t => { if (manual && S) S.bgMsg = { t, l: 3.5 }; }; if (BO) return;
    if (!S || !inFrame() || CL.life < 0) return say('☁️ Felhőmentés csak bejelentkezve érhető el'); if (lgOf(S.life) < CL.lg - 1e-9) return say('☁️ A felhőben nagyobb mentés van (' + fmt(B(10).pow(CL.lg)) + ' Ft) – az marad meg');
    const now = Date.now(); if (!manual && (lgOf(S.life) === CL.lg || now - CL.at < (force ? 5 : 15) * 60e3)) return; // automatikusan ritkán: 15 percenként, kilépéskor csak ha 5 perce nem volt if (now - CL.at < 11e3) return say('☁️ Pár másodperc múlva próbáld újra'); CL.at = now; S.t = now; save();
    const st = ser(); if (st.length > 900000) return say('☁️ A mentés túl nagy'); CL.lg = lgOf(S.life); CL.man = manual ? 1 : 0; if (manual) say('☁️ Mentés folyamatban…'); parent.postMessage({ hgws: 'cssave', game: 'birodalom', life: Math.min(9e15, S.life.toNumber()), lg: CL.lg, st, ack: 1 }, location.origin); }
  const cloudBtn = () => !BO && inFrame() && CL.life >= 0 && L ? { x: L.fx + L.fw - 42 * L.d, y: L.fy + 6 * L.d, w: 36 * L.d, h: 30 * L.d } : null;
  if (typeof addEventListener === 'function') addEventListener('message', e => { if (BO || e.origin !== location.origin || e.source !== parent || !e.data || e.data.hgws !== 'cs' || e.data.game !== 'birodalom') return;
    const d = e.data; if (d.ack) { if (CL.man && S) S.bgMsg = { t: d.ok ? '☁️ Felhőbe mentve' : '☁️ Nem sikerült menteni' + (d.err ? ' (' + d.err + ')' : ''), l: 3.5 }; CL.man = 0; if (!d.ok) CL.at = 0; return; }
    if (d.none) { CL.life = -1; return; } CL.life = 0; CL.lg = typeof d.lg === 'number' ? d.lg : lgOf(Math.min(1e300, +d.life || 0)); // régi mentésnél a life-ból (a végtelen plafonnak számít)
    if (d.st && CL.lg > (S ? lgOf(S.life) : -1) + 1e-9) { try { JSON.parse(d.st); localStorage.setItem(KEY, d.st); } catch (_) { return; } if (GG && GG.game && GG.game.id === 'birodalom') { Birodalom.init(GG); S.bgMsg = { t: '☁️ Felhőmentés betöltve – ' + fmt(S.life) + ' Ft összbevétel', l: 4 }; } }
    else if (S && lgOf(S.life) > CL.lg && !CL.first) { CL.first = 1; CL.at = 0; cloudPush(true); } });

  function net() {
    const [cw, rh] = size(), N = COLS * ROWS, on = new Uint8Array(N), dist = new Int16Array(N).fill(-1), q = [SRC];
    on[idx(...SRC)] = 1; dist[idx(...SRC)] = 0;
    while (q.length) { const [c, r] = q.shift(), i0 = idx(c, r); if (S.k[i0] === 'szelep' && S.vc[i0]) continue;
      for (const [dc, dr] of D4) { const x = c + dc, y = r + dr, i = idx(x, y);
        if (x < 0 || y < 0 || x >= cw || y >= rh || on[i] || !condAt(i)) continue; on[i] = 1; dist[i] = dist[i0] + 1; q.push([x, y]); } }
    let cap = 4 + 3 * S.up.nyomas, dem = 0, fok = 1, fg = 1; const tk = 1 - .06 * S.up.takarek; const pm = 1 + .15 * S.up.hatas;
    for (let i = 0; i < N; i++) if (on[i]) { const k = S.k[i], m = MOD[k]; if (!m) continue;
      if (m.q) cap += m.q * (k === 'pump' || k === 'kut' || k === 'napel' ? pm : 1); if (m.w) dem += m.w * tk; if (m.fok) fok += m.fok; if (m.szuro) fg += m.szuro; }
    const capD = B(cap * BOW * fok * (1 + .15 * pk('pviz'))).mul(B(2).pow(S.up.fuzio)); cap = capD.lt(1e15) ? Math.round(capD.toNumber() * 10) / 10 : capD.toNumber();
    let hiveN = 0, cpR = 0; const wet = new Float32Array(N), mwet = new Float32Array(N), gb = new Float32Array(N).fill(1), yb = new Float32Array(N).fill(1), mobs = [], prov = new Uint8Array(N); let wg = 1, wy = 1, wgold = 0;
    // terület egy (akár több mezős) elem körül, saját mezői nélkül
    const area = (c, r, R, f, sz = 1) => { for (let y = r - R; y < r + sz + R; y++) for (let x = c - R; x < c + sz + R; x++) { if (x >= c && x < c + sz && y >= r && y < r + sz) continue; if (x >= 0 && y >= 0 && x < cw && y < rh) f(idx(x, y)); } };
    // 1. lefedettség a teljes vízhozammal, 2. vízigény (a locsolt óriásnövényekkel), 3. visszaskálázás a hatásfokkal
    for (let r = 0; r < rh; r++) for (let c = 0; c < cw; c++) {
      const i = idx(c, r), m = MOD[S.k[i]]; if (!m) continue; const sz = m.sz || 1;
      if (m.hive) { let pl = 0; area(c, r, m.aura || 2, j => { if (PL[kAt(j)]) pl++; }, sz); hiveN += m.hive * (1 + .05 * pl); }
      if (m.cp) cpR += m.cp;
      if (m.prov || m.hive) area(c, r, m.aura || 2, j => { prov[j] |= m.prov ? RQ[m.prov].b : RQ.beporz.b; }, sz);
      if (m.prov) continue;
      if (m.wq && on[i]) { const lv = wqLv(S.k[i]); wg *= 1 + (m.wq.g || 0) * lv; wy *= 1 + (m.wq.y || 0) * lv; wgold += (m.wq.gold || 0) * lv; continue; }
      if (m.aura) { area(c, r, m.aura, j => { if (m.gb) gb[j] += m.gb; if (m.yb) yb[j] += m.yb; }, sz); continue; }
      if (!on[i]) continue;
      if (m.boost) { area(c, r, m.boost, j => { gb[j] += m.gb; yb[j] += m.yb; }, sz); continue; }
      if (!m.w) continue;
      const v = m.wm || 1;
      if (m.mob) {
        const len = m.mob === 'x' ? cw : rh, st = MOB.get(i) || { p: m.mob === 'x' ? c : r, dir: 1 }; MOB.set(i, st);
        const cc = Math.max(1, Math.min(cw - 2, c)), rc = Math.max(1, Math.min(rh - 2, r));
        mobs.push({ i, c, r, cc, rc, ax: m.mob, len, v, st });
        const duty = Math.min(1, (3 + MOIST * 1.2) / (2 * len));
        for (let p = 0; p < len; p++) for (let o = -1; o <= 1; o++) { const x = m.mob === 'x' ? p : cc + o, y = m.mob === 'x' ? rc + o : p;
          if (x >= 0 && y >= 0 && x < cw && y < rh) mwet[idx(x, y)] = Math.max(mwet[idx(x, y)], v * duty); }
        continue;
      }
      if (m.nb) { for (const [dx, dy] of D4) { const x = c + dx, y = r + dy; if (x >= 0 && y >= 0 && x < cw && y < rh) wet[idx(x, y)] = Math.max(wet[idx(x, y)], v); } }
      else area(c, r, m.r + S.up.kvantum, j => { wet[j] = Math.max(wet[j], v); }, sz);
    }
    for (let i = 0; i < N; i++) { const p = PL[S.k[i]]; if (!p || !p.pw) continue; if (cells(i, p.sz).some(j => wet[j] || mwet[j])) dem += p.pw * tk; }
    dem = Math.round(dem * 100) / 100;
    const eff = dem ? (capD.gte(dem) ? 1 : capD.div(dem).toNumber()) : 1;
    if (eff < 1) { for (let i = 0; i < N; i++) { wet[i] *= eff; mwet[i] *= eff; } for (const o of mobs) o.v *= eff; }
    for (const k of [...MOB.keys()]) if (!mobs.some(o => o.i === k)) MOB.delete(k);
    const rq = new Uint8Array(N); for (let i = 0; i < N; i++) { const p = PL[S.k[i]]; if (!p || !p.rq) continue; let h = 0; for (const j of cells(i, p.sz || 1)) h |= prov[j]; const need = rqBits(p); rq[i] = (h & need) === need ? 1 : 0; }
    NET = { on, dist, cap, capD, dem, eff, wet, mwet, gb, yb, mobs, fg, inc: 0, prov, rq, wg, wy, wgold };
    let inc = ZERO; const PR = price(), SP = speed(), LK = luck();
    for (let i = 0; i < N; i++) { const p = PL[S.k[i]]; if (!p) continue; const w = netW(i); if (w && rqOK(i)) inc = inc.add(B(p.v).mul(yb[i] * w * gb[i] / p.t * LK)); }
    NET.inc = inc.mul(PR).mul(SP); let nek = 0;
    for (let i = 0; i < N; i++) { const p = PL[S.k[i]]; if (!p) continue; const w = netW(i); if (w && rqOK(i)) nek += nekOf(S.k[i]) * w * gb[i] / p.t; }
    NET.nek = SP.mul(nek); const metR = {};
    for (let i = 0; i < N; i++) { const p = PL[S.k[i]]; if (!p || !p.met) continue; const w = netW(i); if (w && rqOK(i)) metR[p.met] = (metR[p.met] || 0) + p.ma * metMul() * w * gb[i] / p.t; }
    for (const k in metR) metR[k] = SP.mul(metR[k]); NET.met = metR; NET.nekH = hiveN * (1 + .25 * S.up.nektar) * (1 + .5 * S.up.kaptar); NET.cpR = cpR * (1 + .5 * S.up.cpgy);
  }
  // egy növény (több mezősnél a legjobban locsolt mezője) víz-ellátottsága a hálózat alapján
  const netW = i => { let w = ghW(); for (const j of cells(i)) w = Math.max(w, NET.wet[j], NET.mwet[j]); return w; };

  const wetVis = i => Math.max(NET.wet[i], MO && MO[i] > 0 ? MO[i] : 0), wetNow = i => { let w = ghW(); for (const j of cells(i)) w = Math.max(w, wetVis(j)); return w; };
  const rqOK = i => !PL[S.k[i]].rq || (NET.rq && NET.rq[i]);
  const rate = (i, w) => rqOK(i) ? speed().mul(w * NET.gb[i] / PL[S.k[i]].t) : ZERO; // nagy szám
  const val = i => B(PL[S.k[i]].v).mul(price()).mul(NET.yb[i]).round();
  /* a mezőre ható bónuszok a növény-tooltiphez */
  const xf = v => { const d = B(v); return '×' + (d.lt(100) ? (+d.toNumber().toFixed(2)).toLocaleString('hu-HU') : fmt(d.round())); };
  function bonusLines(i, w) { const o = [], [cw, rh] = size(), c0 = i % COLS, r0 = Math.floor(i / COLS), mods = {};
    for (let r = 0; r < rh; r++) for (let c = 0; c < cw; c++) { const j = idx(c, r), k = S.k[j], m = MOD[k]; if (!m || !(m.aura || (m.boost && NET.on[j]))) continue; const R = m.aura || m.boost, sz = m.sz || 1;
      if (c0 >= c - R && c0 < c + sz + R && r0 >= r - R && r0 < r + sz + R && !(c0 >= c && c0 < c + sz && r0 >= r && r0 < r + sz) && (m.gb || m.yb)) { const q = mods[k] || (mods[k] = { n: m.n, gb: 0, yb: 0, db: 0 }); q.gb += m.gb || 0; q.yb += m.yb || 0; q.db++; } }
    const sp = speed().div(NET.fg || 1), upS = [['Tápoldat', B((1 + .2 * S.up.tap) * (1 + .25 * pk('ptap')))], ['Klíma', B(1.25).pow(S.up.klima)], ['Időhurok', B(1.8).pow(S.up.idohurok)], ['Gravitáció', B(1.3).pow(S.up.gravk)], ['Szűrők', B(NET.fg || 1)]].filter(q => q[1].gt(1.001));
    o.push('Növekedés ' + xf(rqOK(i) ? sp.mul((NET.fg || 1) * NET.gb[i] * (w || 0)) : 0) + (w ? '' : ' (nincs víz)') + (rqOK(i) ? '' : ' (hiányzó igény)'));
    if (upS.length) o.push('   ' + upS.map(q => q[0] + ' ' + xf(q[1])).join(' · '));
    o.push('Ár ' + xf(price().mul(NET.yb[i])) + '   (fejlesztések, csillagok ' + xf(price()) + (NET.yb[i] > 1.001 ? ', modulok ' + xf(NET.yb[i]) : '') + ')');
    const ml = Object.values(mods); if (ml.length) o.push('Hat rá: ' + ml.map(q => q.n + (q.db > 1 ? ' ×' + q.db : '') + ' (' + [q.gb ? '+' + Math.round(q.gb * 100) + '% növ.' : '', q.yb ? '+' + Math.round(q.yb * 100) + '% ár' : ''].filter(Boolean).join(', ') + ')').join(' · '));
    if (BM[i].gte(1.5)) o.push('Tételes aratás ' + xf(BM[i]) + ' (10 mp-es ciklus)');
    if (goldP() > 0) o.push('Aranytermés: ' + Math.round(goldP() * 100) + '% esély, ×' + goldX());
    if (S.up.kombajn || S.up.dron) o.push('Kombájnos aratás ' + xf(cbBonus()));
    return o; }

  function earn(v) { v = B(v); if (!v.gt(0) || !v.finite) return; S.money = S.money.add(v); S.life = S.life.add(v); }
  // nektár: minden aratás ad egy keveset; a magasabb szintű növény többet
  const PLI = {}; Object.keys(PL).forEach((k, j) => { PLI[k] = j; });
  const nekOf = k => .004 * (1 + PLI[k]) * (PL[k].nkx || 1) * (PL[k].sz ? PL[k].sz * PL[k].sz : 1) * (1 + .25 * S.up.nektar);
  const scoreOf = () => BO ? 0 : Math.floor(Math.min(1e300, S.life.toNumber()));
  const nfmt = n => { const d = B(n); return d.lt(100) ? d.toNumber().toLocaleString('hu-HU', { maximumFractionDigits: d.lt(10) ? 2 : 1 }) : fmt(d); };
  /* tételes növekedés: egy ciklus legalább MINC másodperc; ha a növény ennél gyorsabban nőne, ritkábban érik be,
     de annyi termést ad, ahányszor közben beérett volna (a növekedési bónuszok ezt a szorzót növelik) */
  const MINC = 10, BM = Array(COLS * ROWS).fill(ONE);
  function harvest(G, i, how) {
    const bm = BM[i].gt(1) ? BM[i] : ONE, gold = Math.random() < goldP(), v = val(i).mul(bm).mul((how === 'cb' ? cbBonus() : 1) * (gold ? goldX() : 1)).round(); earn(v); S.nek = S.nek.add(bm.mul(nekOf(S.k[i]))); { const P0 = PL[S.k[i]]; if (P0.met) S.met[P0.met] = S.met[P0.met].add(bm.mul(P0.ma * metMul())); } S.g[i] = 0; RP[i] = 0;
    const [x, y] = tileXY(i); if (fl.length < 40) fl.push({ x: x + L.ts / 2, y: y + L.ts * .2, t: (gold ? '✨ +' : '+') + fmt(v) + (bm.gte(1.5) ? '  ×' + fmt(bm.round()) : ''), l: 1, gold });
    if (gold) G.splash(x + L.ts / 2, y + L.ts / 2, '255,230,120', 18, 4);
    if (!how) { Sfx.coin(); G.splash(x + L.ts / 2, y + L.ts / 2, '255,215,120', 10, 3); }
    else if (Math.random() < .2) Sfx.blip(how === 'cb' ? 900 : 1200, .04, 'sine', .02);
    for (let j = 0; j < (how === 'cb' ? 6 : 0); j++) dust.push({ x: x + L.ts / 2, y: y + L.ts / 2, vx: (Math.random() - .5) * 40 * L.d, vy: (Math.random() - .5) * 40 * L.d, l: 1, c: PL[S.k[i]] ? PL[S.k[i]].col : '#e8d27a' });
  }
  if (typeof addEventListener === 'function') { addEventListener('pagehide', save); document.addEventListener('visibilitychange', () => { if (document.hidden) save(); }); }

  /* ---------- elrendezés ---------- */
  function layout(G) {
    const d = G.d, [c0, r0] = size(), top = 112 * d, barH = 132 * d, bot = G.H - barH - 44 * d; // alul hely a leírás-sávnak
    const fx = 16 * d, fw = G.W - 32 * d, fy = top, fh = bot - top, pad = 14 * d;
    const fit = (a, b) => Math.min((fw - 2 * pad) / a, (fh - 2 * pad) / b), tr = fit(r0, c0) > fit(c0, r0) * 1.15, vw = tr ? r0 : c0, vh = tr ? c0 : r0;
    const fitTs = Math.max(6 * d, Math.floor(fit(vw, vh))), maxTs = Math.max(Math.round(fitTs * 2), 56 * d);
    if (!CAM.z) CAM.z = Math.max(fitTs, Math.min(maxTs, 28 * d)) / d;
    const ts = Math.round(Math.max(fitTs, Math.min(maxTs, CAM.z * d)));
    // kamera: a látott terület közepe mezőkben; ha a kert kisebb a képernyőnél, középre kerül
    if (CAM.cx == null) { CAM.cx = 0; CAM.cy = 0; }
    const cl = (v, n, span) => { const h = span / ts / 2 - pad / ts; return n * ts <= span - 2 * pad + 1 ? n / 2 : Math.max(h, Math.min(n - h, v)); };
    CAM.cx = cl(CAM.cx, vw, fw); CAM.cy = cl(CAM.cy, vh, fh);
    L = { d, ts, tr, vw, vh, fx, fy, fw, fh, fitTs, maxTs, bx: Math.round(fx + fw / 2 - CAM.cx * ts), by: Math.round(fy + fh / 2 - CAM.cy * ts), barY: G.H - barH, barH, W: G.W, H: G.H };
  }
  const canZoom = () => L.maxTs > L.fitTs;
  // helyszín-választó a kert tetején (rakéta után)
  const locPill = G => (S.up.raketa || S.unl.length > 1) ? { x: G.W / 2 - 80 * L.d, y: L.fy + 6 * L.d, w: 160 * L.d, h: 30 * L.d } : null;
  const locRows = G => { const p = locPill(G); if (!p || !S.lp) return []; const nx = nextLoc(), w = Math.min(G.W - 24 * L.d, 300 * L.d);
    const ids = LORD.filter(id => S.unl.includes(id) || id === nx); if (S.unl.includes('kepler')) ids.push('gal');
    return ids.map((id, j) => ({ id, x: G.W / 2 - w / 2, y: p.y + p.h + 6 * L.d + j * 44 * L.d, w, h: 40 * L.d })); };
  function zoomAt(G, x, y, f) {
    const vx = (x - L.bx) / L.ts, vy = (y - L.by) / L.ts, ts2 = Math.max(L.fitTs, Math.min(L.maxTs, L.ts * f));
    CAM.z = ts2 / G.d; CAM.cx = (L.fx + L.fw / 2 - x) / ts2 + vx; CAM.cy = (L.fy + L.fh / 2 - y) / ts2 + vy; layout(G);
  }
  function pan(G, dx, dy) { CAM.cx -= dx / L.ts; CAM.cy -= dy / L.ts; layout(G); }
  const tileXY = i => { const c = i % COLS, r = Math.floor(i / COLS); return L.tr ? [L.bx + r * L.ts, L.by + c * L.ts] : [L.bx + c * L.ts, L.by + r * L.ts]; };
  const posXY = (c, r) => L.tr ? [L.bx + (r + .5) * L.ts, L.by + (c + .5) * L.ts] : [L.bx + (c + .5) * L.ts, L.by + (r + .5) * L.ts];
  const tileAt = (x, y) => { if (y < L.fy - 8 * L.d || y > L.fy + L.fh + 8 * L.d) return -1; let c = Math.floor((x - L.bx) / L.ts), r = Math.floor((y - L.by) / L.ts); if (L.tr) [c, r] = [r, c]; return inside(c, r) ? idx(c, r) : -1; };
  const zoomBtns = G => { if (!canZoom()) return []; const y = L.fy + 6 * L.d, x = L.fx + L.fw - 6 * L.d; return [{ f: 1 / 1.25, x: x - 76 * L.d, y, w: 36 * L.d, h: 36 * L.d, t: '−' }, { f: 1.25, x: x - 36 * L.d, y, w: 36 * L.d, h: 36 * L.d, t: '+' }]; };
  // minitérkép (csak ha a kert nagyobb a képernyőnél); koppintásra oda ugrik a nézet
  const miniMap = () => { if (L.ts * L.vw <= L.fw + 4 * L.d && L.ts * L.vh <= L.fh + 4 * L.d) return null; const mw = Math.min(56, 900 / Math.max(L.vw, L.vh) * 2.6) * L.d, mh = mw * L.vh / L.vw; return { x: L.fx + 6 * L.d, y: L.fy + 6 * L.d, w: mw, h: mh }; };

  // előre rajzolt fű-textúrák
  function locTex(ts) {
    const Lc = LOCS[S.loc]; if (S.loc === 'earth') return grassTex(ts);
    ts = Math.max(16, 2 ** Math.ceil(Math.log2(ts))); const key = ts + S.loc; if (TEX.key === key) return TEX.c; TEX.key = key; TEX.ts = 0; TEX.c = [];
    for (let v = 0; v < 6; v++) {
      const cv = document.createElement('canvas'); cv.width = cv.height = ts; const x = cv.getContext('2d');
      let sd = v * 977 + 31; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      const gr = x.createLinearGradient(0, 0, ts, ts); gr.addColorStop(0, Lc.pal[0]); gr.addColorStop(1, Lc.pal[1]); x.fillStyle = gr; x.fillRect(0, 0, ts, ts);
      if (Lc.kind === 'metal') { x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = Math.max(1, ts / 24); x.strokeRect(.5, .5, ts - 1, ts - 1); x.fillStyle = 'rgba(255,255,255,.18)'; for (const [a, b] of [[.12, .12], [.88, .12], [.12, .88], [.88, .88]]) { x.beginPath(); x.arc(a * ts, b * ts, ts * .035, 0, 6.283); x.fill(); } if (v % 3 === 0) { x.fillStyle = 'rgba(108,198,255,.12)'; x.fillRect(ts * .2, ts * .45, ts * .6, ts * .1); } }
      else { for (let j = 0; j < 8; j++) { x.fillStyle = R() < .5 ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.07)'; x.beginPath(); x.ellipse(R() * ts, R() * ts, ts * (.08 + R() * .2), ts * (.05 + R() * .12), R() * 3, 0, 6.283); x.fill(); }
        if (Lc.kind === 'crater' && R() < .6) { const cx = R() * ts, cy = R() * ts, r = ts * (.08 + R() * .14); x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.arc(cx, cy, r, 0, 6.283); x.fill(); x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = Math.max(1, ts / 40); x.beginPath(); x.arc(cx, cy, r, 3.6, 5.8); x.stroke(); }
        if (Lc.kind === 'ice') { x.strokeStyle = 'rgba(70,140,190,.35)'; x.lineWidth = Math.max(1, ts / 50); x.beginPath(); let px = R() * ts, py = 0; x.moveTo(px, py); for (let q = 0; q < 4; q++) { px += (R() - .5) * ts * .5; py += ts * .3; x.lineTo(px, py); } x.stroke(); }
        if (Lc.kind === 'alien') for (let j = 0; j < 5; j++) { x.fillStyle = `rgba(${R() < .5 ? '234,128,252' : '128,222,234'},.5)`; x.beginPath(); x.arc(R() * ts, R() * ts, Math.max(1, ts * .03), 0, 6.283); x.fill(); } }
      TEX.c.push(cv);
    }
    return TEX.c;
  }
  function grassTex(ts) {
    ts = Math.max(16, 2 ** Math.ceil(Math.log2(ts))); if (TEX.ts === ts && TEX.key === 'earth') return TEX.c; TEX.ts = ts; TEX.key = 'earth'; TEX.c = [];
    for (let v = 0; v < 6; v++) {
      const cv = document.createElement('canvas'); cv.width = cv.height = Math.ceil(ts); const x = cv.getContext('2d');
      let sd = v * 977 + 13; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      const gr = x.createLinearGradient(0, 0, ts, ts); gr.addColorStop(0, v & 1 ? '#3f8236' : '#3a7a32'); gr.addColorStop(1, v & 1 ? '#367430' : '#32702c'); x.fillStyle = gr; x.fillRect(0, 0, ts, ts);
      for (let j = 0; j < 7; j++) { x.fillStyle = `rgba(${R() < .5 ? '20,60,20' : '90,150,70'},${.08 + R() * .08})`; x.beginPath(); x.ellipse(R() * ts, R() * ts, ts * (.1 + R() * .2), ts * (.06 + R() * .1), R() * 3, 0, 6.283); x.fill(); }
      x.lineWidth = Math.max(1, ts / 40);
      for (let j = 0; j < ts * .9; j++) { const bx = R() * ts, by = R() * ts, h = ts * (.04 + R() * .07); x.strokeStyle = R() < .5 ? 'rgba(110,190,90,.55)' : 'rgba(30,80,30,.45)'; x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + (R() - .5) * h * .6, by - h); x.stroke(); }
      if (R() < .5) for (let j = 0; j < 2; j++) { x.fillStyle = ['#fff6d6', '#ffd84a', '#c9a9ff'][Math.floor(R() * 3)]; x.beginPath(); x.arc(R() * ts, R() * ts, Math.max(1, ts * .025), 0, 6.283); x.fill(); }
      TEX.c.push(cv);
    }
    return TEX.c;
  }

  const tabsNow = () => galView() ? GTABS : TABS0;
  function items() {
    if (galView()) return galItems();
    const here = it => (it.loc || 'earth') === S.loc;
    if (S.tab === 'mod') return Object.keys(MOD).filter(k => k !== 'del' && (here(MOD[k]) || k === 'pipe' || k === 'szelep')).map(k => ({ k, kind: 'mod', ...MOD[k], c: costOf(k), ck: ckOf(k), cc: ccOf(k) }));
    if (S.tab === 'pl') return Object.keys(PL).filter(k => here(PL[k])).map(k => ({ k, kind: 'pl', ...PL[k], c: costOf(k), ck: ckOf(k), cc: ccOf(k) }));
    if (S.tab === 'up') return Object.keys(UP).filter(k => !UP[k].sp || S.up.raketa).map(k => { const u = UP[k], n = S.up[k]; return { k, kind: 'up', n: u.n, ic: u.ic, lvl: n, u: u.u, c: n >= u.max ? Infinity : B(u.cost(n)).round(), ck: n >= u.max || !u.ck ? ZERO : B(u.ck(n)).round(), cc: n >= u.max || !u.cc ? ZERO : B(u.cc(n)) }; });
    const sg = starGain();
    return [{ k: 'reset', kind: 'reset', n: confirmT > 0 ? 'Biztos? Még egyszer!' : 'Új birtok', ic: '🌅', lbl: '+' + fmt(sg) + ' ⭐', ok: true },
      ...Object.keys(PERK).map(k => { const P = PERK[k], lv = pk(k), max = lv >= P.max, c = max ? ZERO : B(P.c(lv));
        return { k, kind: 'perk', n: P.max > 1 ? P.n + ' ' + lv : P.n, ic: P.ic, lv, c, lbl: max ? (P.max > 1 ? 'MAX' : 'MEGVAN') : fmt(c) + ' ⭐', ok: !max && S.star.gte(c), have: max }; })];
  }
  function bar(G) {
    const d = L.d, dw = Math.min(104 * d, (G.W - 16 * d) * .2), tw = Math.min(140 * d, (G.W - 16 * d - dw - 6 * d) / tabsNow().length), tx = (G.W - tw * tabsNow().length - dw - 6 * d) / 2, ty = L.barY + 8 * d, th = 30 * d;
    const its = items(), per = Math.max(3, Math.min(its.length, Math.floor((G.W - 16 * d) / (92 * d)))), pages = Math.ceil(its.length / per);
    S.pg = S.pg || {}; const pg = Math.min(S.pg[S.tab] || 0, pages - 1), arr = pages > 1 ? 26 * d : 0;
    const vis = its.slice(pg * per, pg * per + per), iw = Math.min(110 * d, (G.W - 16 * d - arr * 2) / per), ix = (G.W - iw * vis.length) / 2, iy = ty + th + 8 * d, ih = L.barH - th - 24 * d;
    return { pg, pages, tabs: tabsNow().map(([k, n], i) => ({ k, n, x: tx + i * tw, y: ty, w: tw, h: th })), del: { x: tx + tw * tabsNow().length + 6 * d, y: ty, w: dw, h: th }, its: vis.map((it, i) => ({ ...it, x: ix + i * iw, y: iy, w: iw, h: ih })),
      arr: pages > 1 ? [{ dir: -1, x: ix - arr - 2 * d, y: iy, w: arr, h: ih }, { dir: 1, x: ix + iw * vis.length + 2 * d, y: iy, w: arr, h: ih }] : [] };
  }

  // középső gomb (görgő) kattintás: a mezőn lévő elem a kézbe kerül, mint a Minecraftban
  function pick(i) { if (galView() || i < 0) return; const k = kAt(i), it = MOD[k] || PL[k]; if (!it || k === 'src' || k === 'del') return;
    if (!unlocked(it) || ((it.loc || 'earth') !== S.loc && k !== 'pipe' && k !== 'szelep')) return Sfx.blip(140, .1, 'square', .05);
    S.tool = k; S.tab = PL[k] ? 'pl' : 'mod'; const its = items(), j = its.findIndex(o => o.k === k), per = Math.max(1, bar(GG).its.length || 1); if (j >= 0) { S.pg = S.pg || {}; S.pg[S.tab] = Math.floor(j / per); }
    S.info = { it: { k, kind: PL[k] ? 'pl' : 'mod', ...it, c: costOf(k) }, l: 4 }; Sfx.blip(700, .04, 'sine', .05); }
  let RDEL = false; // jobb klikkes bontás előtti eszköz
  const DN = { n: 0, c: 0, k: '', t: 0, x: 0, y: 0, last: -1 }; // húzásos lerakás számlálója
  // hatótávos modulok húzása (mint a villanypóznák): a következő ott kerül le, ahol a körzetek épp nem fednek át
  const rangeOf = k => { const m = MOD[k]; if (!m || m.mob || m.wq || m.one || m.q || m.cp || m.valve) return 0; return m.r ? m.r + S.up.kvantum : m.nb ? 1 : m.aura || m.boost || 0; };
  function poleDrag(G, i) { const R = rangeOf(S.tool); if (!R || DN.last < 0 || i < 0) return; const sz = szOf(S.tool), sp = 2 * R + sz;
    for (let guard = 0; guard < 20; guard++) { const c0 = DN.last % COLS, r0 = Math.floor(DN.last / COLS), c = i % COLS, r = Math.floor(i / COLS), dx = c - c0, dy = r - r0, hz = Math.abs(dx) >= Math.abs(dy), dist = Math.abs(hz ? dx : dy), dir = Math.sign(hz ? dx : dy);
      if (dist < sp) return; let ok = false;
      for (let s2 = sp; s2 <= dist; s2++) { const tc = hz ? c0 + dir * s2 : c0, tr = hz ? r0 : r0 + dir * s2; if (!inside(tc, tr)) break; const n0 = DN.n; place(G, idx(tc, tr), false); if (DN.n > n0) { ok = true; break; } }
      if (!ok) return; } }
  function place(G, i, first) {
    i = anc(i); const k = S.k[i], tool = S.tool;
    if (PL[k] && S.g[i] >= 1 && tool !== 'del') return harvest(G, i);
    if (MOD[k] && MOD[k].wq && first && tool !== 'del') { const lv = wqLv(k), c = wqCost(k);
      if (lv >= WQMAX) { S.info = { it: { k, kind: 'mod', n: MOD[k].n, warn: 'Elérte a legmagasabb szintet (' + WQMAX + ').' }, l: 3 }; return; }
      if (S.money.lt(c)) { Sfx.blip(140, .1, 'square', .05); S.info = { it: { k, kind: 'mod', n: MOD[k].n, warn: 'A következő szint ' + fmt(c) + ' Ft.' }, l: 3 }; return; }
      S.money = S.money.sub(c); S.wq = S.wq || {}; S.wq[k] = lv + 1; net(); Sfx.perfect(); const [x, y] = tileXY(i); fl.push({ x: x + L.ts / 2, y, t: WQI[k] + ' ' + (lv + 1) + '. szint', l: 1.3 }); save(); return; }
    if (k === 'szelep' && first && tool !== 'del') { S.vc[i] = S.vc[i] ? 0 : 1; if (!S.vc[i]) delete S.vc[i]; net(); Sfx.blip(S.vc[i] ? 260 : 520, .07, 'square', .05); return; }
    if (!tool) return;
    if (tool === 'del') { if (!k || k === 'src') return; const back = costOf(k).div(2).floor(); for (const j of cells(i)) { S.k[j] = ''; S.g[j] = 0; delete S.vc[j]; } S.money = S.money.add(back); net(); Sfx.blip(220, .06, 'square', .05, .6); return; }
    if (k) return;
    const it = MOD[tool] || PL[tool], c = costOf(tool), sz = it.sz || 1; if (!unlocked(it)) return;
    if (it.one && own(tool) >= 1) { if (first) { Sfx.blip(140, .1, 'square', .05); S.info = { it: { k: tool, kind: 'mod', n: it.n, warn: 'Ebből helyszínenként egy kell – koppints a meglévőre a szintlépéshez.' }, l: 4 }; } return; }
    const c0 = i % COLS, r0 = Math.floor(i / COLS);
    if (sz > 1 && (!inside(c0 + sz - 1, r0 + sz - 1) || cells(i, sz).some(j => S.k[j]))) { if (first) { Sfx.blip(140, .1, 'square', .05); S.info = { it: { k: tool, kind: MOD[tool] ? 'mod' : 'pl', n: it.n, warn: 'Nincs elég szabad hely: ' + sz + '×' + sz + ' mező kell.' }, l: 3 }; } return; }
    const ck = ckOf(tool), cc = ccOf(tool); if (!canPay({ c, ck, cc })) { Sfx.blip(140, .1, 'square', .05); return; }
    pay({ c, ck, cc }); for (const j of cells(i, sz)) { S.k[j] = j === i ? tool : '#' + i; S.g[j] = 0; } if (it.wq) { S.wq = S.wq || {}; S.wq[tool] = Math.max(1, S.wq[tool] || 0); } DN.n++; DN.c = B(DN.c).add(c); DN.k = tool; DN.last = i; net();
    PL[tool] ? Sfx.blip(520, .05, 'triangle', .06, 1.3) : Sfx.blip(380, .05, 'square', .04, 1.2);
  }

  function rebirth(G) {
    const sg = starGain();
    if (S.loc !== 'earth') { stash(); unstash('earth'); }
    const keep = { life: S.life, sent: S.sent, star: S.star.add(sg), starT: S.starT.add(sg), perk: S.perk, runs: (S.runs || 0) + 1, tab: 'mod', tool: 'pipe' };
    const n = fresh(keep);
    if (S.perk.toke) n.money = B(5000);
    if (pk('pkezd')) n.money = n.money.max(pw(5000, 10, pk('pkezd') - 1));
    if (S.perk.orok) n.up.kertesz = 1;
    n.up.kertesz = Math.max(n.up.kertesz, Math.min(UP.kertesz.max, pk('pauto')));
    n.up.telek = Math.max(n.up.telek, Math.min(UP.telek.max, pk('ptelek')));
    n.up.kombajn = Math.max(n.up.kombajn, Math.min(UP.kombajn.max, pk('pgep'))); n.up.dron = Math.max(n.up.dron, Math.min(UP.dron.max, Math.floor(pk('pgep') / 2)));
    for (const k of ['nyomas', 'tap', 'piac', 'talaj']) n.up[k] = Math.max(n.up[k], 3 * pk('pup'));
    if (S.perk.halo) { n.up.telek = Math.max(n.up.telek, S.up.telek); S.k.forEach((v, i) => { if (MOD[v] || v === 'src' || (v && v[0] === '#' && MOD[S.k[+v.slice(1)]])) n.k[i] = v; }); n.vc = { ...S.vc }; }
    S = n; MO = new Float32Array(COLS * ROWS); RP = new Float32Array(COLS * ROWS); DR = []; syncCB(); layout(G); net(); save(); Sfx.perfect(); G.splash(G.W / 2, G.H / 2, '255,215,120', 90, 10);
    S.away = { got: 0, sec: 0, l: 3.5, msg: sg.gt(0) ? '⭐ +' + fmt(sg) + ' hírnév' : '🌅 Új birtok' };
  }
  const newLoc = () => { const k = Array(COLS * ROWS).fill(''); k[idx(...SRC)] = 'src'; return { k, g: Array(COLS * ROWS).fill(0), vc: {}, telek: 0 }; };
  function stash() { S.locs[S.loc] = { k: S.k, g: S.g, vc: S.vc, telek: S.up.telek }; }
  function unstash(id) { const L0 = S.locs[id] || newLoc(); S.k = L0.k; S.g = L0.g; S.vc = L0.vc || {}; S.up.telek = L0.telek || 0; S.loc = id; delete S.locs[id]; }
  function goLoc(G, id) {
    if (id === S.loc) return; payBg(S.bgT || 0); S.bgT = 0; stash(); unstash(id);
    MO.fill(0); RP.fill(0); MOB.clear(); for (const u of [...CB, ...DR]) { u.x = SRC[0] + .5; u.y = SRC[1] + .5; u.tgt = -1; }
    CAM.z = 0; CAM.cx = null; MMC.t = -9; TEX.ts = 0; if (S.tool && S.tool !== 'del' && S.tool !== 'pipe' && S.tool !== 'szelep') S.tool = null; S.pg = {};
    layout(G); net(); lincAll(); save();
  }
  // egy másik helyszín bevétele és nektárja (a háttérben)
  function locRate(id) {
    const keep = { k: S.k, g: S.g, vc: S.vc, telek: S.up.telek, loc: S.loc }, mob = new Map(MOB), n0 = NET, L0 = S.locs[id]; if (!L0) return [0, 0, 0, {}];
    S.k = L0.k; S.g = L0.g; S.vc = L0.vc || {}; S.up.telek = L0.telek || 0; S.loc = id; net(); const r = [NET.inc, NET.nek.add(NET.nekH), B(NET.cpR), NET.met || {}];
    S.k = keep.k; S.g = keep.g; S.vc = keep.vc; S.up.telek = keep.telek; S.loc = keep.loc; MOB.clear(); mob.forEach((v, k) => MOB.set(k, v)); NET = n0; return r;
  }
  const crew = () => 1 + .1 * S.up.szemelyzet;
  function lincAll() { let a = ZERO, b = ZERO, q = ZERO; const mt = {}; S.lr = {};
    for (const id of S.unl) if (id !== S.loc) { const [x, y, z, m] = locRate(id), c = crew(); S.lr[id] = [x.mul(c), y.mul(c), z.mul(c)]; a = a.add(x); b = b.add(y); q = q.add(z); for (const k in m) mt[k] = B(mt[k] || 0).add(m[k]); }
    const c = crew(); for (const k in mt) mt[k] = mt[k].mul(c); S.linc = [a.mul(c), b.mul(c), q.mul(c), mt]; }
  // a nem látott helyszínek termelése: nincs szimuláció, 30 másodpercenként jóváírjuk a kiszámolt ütemet
  function payBg(sec) { if (!S.linc || sec <= 0) return ZERO; const v = B(S.linc[0]).mul(sec); earn(v); S.nek = S.nek.add(B(S.linc[1]).mul(sec)); S.cp = S.cp.add(B(S.linc[2] || 0).mul(sec)); for (const k in S.linc[3] || {}) S.met[k] = S.met[k].add(B(S.linc[3][k]).mul(sec)); return v; }
  const launchCost = id => B(LOCS[id].cost).mul(1 - .1 * S.up.hajtomu), launchNek = id => B(LOCS[id].nk).mul(1 - .1 * S.up.hajtomu), launchCp = id => B(LOCS[id].cc || 0).mul(1 - .1 * S.up.hajtomu);
  const nextLoc = () => LORD.find(id => !S.unl.includes(id));
  function syncCB() { while (CB.length < S.up.kombajn) CB.push({ x: SRC[0] + .5, y: SRC[1] + .5, a: 0, tgt: -1, run: 0 }); CB.length = S.up.kombajn;
    while (DR.length < S.up.dron) DR.push({ x: SRC[0] + .5, y: SRC[1] + .5, a: 0, tgt: -1, run: 0, fly: 1 }); DR.length = S.up.dron; }
  const DESC = {
    pipe: 'Összeköti a főcsapot a többi elemmel. Húzással egyszerre többet is lerakhatsz.',
    spr: 'A körülötte lévő 8 mezőt locsolja. 1 L/s vizet fogyaszt.',
    pump: '+6 L/s vízhozam a hálózatnak, ha csőre van kötve.',
    drip: 'Csak a 4 szomszédos mezőt locsolja, de takarékos (0,3 L/s), és +15% növekedést ad.',
    szelep: 'Koppintásra elzárja vagy kinyitja a vizet mögötte.',
    rot: '2 mezős sugárban locsol (5×5 terület). 2,5 L/s.',
    hordo: '+3 L/s vízhozam, ha csőre van kötve.',
    komp: 'Nem kell rá cső. A körülötte lévő mezőkön +30% gyorsabb a növekedés.',
    fok: '+15% a teljes hálózat vízhozamára. Csőre kell kötni.',
    kod: 'A körülötte lévő 8 mezőt párásítja: +35% növekedés. 2 L/s.',
    szuro: '+8% növekedés az egész kertben. Csőre kell kötni.',
    linx: 'Mozgó öntöző: tömlőn húzva oda-vissza járja a sort, 3 mező széles sávban. 3 L/s.',
    liny: 'Mozgó öntöző: tömlőn húzva oda-vissza járja az oszlopot, 3 mező széles sávban. 3 L/s.',
    meh: n => autoDesc(MOD.meh),
    kut: '+14 L/s vízhozam (a Hatásfok is növeli), ha csőre van kötve.',
    piv: '3 mezős sugárban locsol egy forgó karral (7×7 terület). 6 L/s.',
    torony: '+30 L/s vízhozam, ha csőre van kötve.',
    gomba: 'Nem kell rá cső. A körülötte lévő 8 mezőn +50% gyorsabb a növekedés.',
    katica: 'Nem kell rá cső. 2 mezős körzetben +30% termés: a katicák megeszik a kártevőket.',
    lampa: 'Nem kell rá cső. A körülötte lévő 8 mezőn dupla gyorsan nőnek a növények.',
    szivv: '+300 L/s vízhozam, ha csőre van kötve.',
    kristr: '3 mezős sugárban locsol (7×7 terület), +60% növekedéssel. 10 L/s.',
    felho: 'Esőfelhőt kelt: 5 mezős sugárban locsol (11×11 terület). 30 L/s.',
    gejzir: '+900 L/s vízhozam, ha csőre van kötve.',
    obel: 'Nem kell rá cső. 3 mezős körzetben +60% termés és +40% növekedés.',
    jeg: '+3000 L/s vízhozam, ha csőre van kötve.',
    portal: '+12 000 L/s vízhozam egy másik világból, ha csőre van kötve.',
    fuzio: n => 'Duplázza a hálózat teljes vízhozamát szintenként. Most: ' + xf(B(2).pow(n)) + '.',
    klima: n => '×1,25 növekedési sebesség szintenként (szorzódik). Most: ' + xf(B(1.25).pow(n)) + '.',
    genlab: n => '×1,5 termésár szintenként (szorzódik). Most: ' + xf(B(1.5).pow(n)) + '.',
    robot: n => '+60% sebesség a kombájnoknak és drónoknak szintenként (szorzódik).',
    kvantum: n => '+1 mező sugár minden szórófejnek és esőztetőnek szintenként. Most: +' + n + '.',
    urpiac: n => '×1,8 termésár szintenként (szorzódik). Most: ' + xf(B(1.8).pow(n)) + '.',
    ptap: n => 'Állandó: +25% növekedés szintenként. Most: +' + 25 * n + '%.',
    ppiac: n => 'Állandó: +30% termésár szintenként. Most: +' + 30 * n + '%.',
    pviz: n => 'Állandó: +15% vízhozam szintenként. Most: +' + 15 * n + '%.',
    pkezd: n => 'Új birtok után ennyivel kezdesz: ' + fmt(pw(5000, 10, Math.max(0, n))) + ' Ft (a következő szinten).',
    ptelek: n => 'Új birtok után rögtön nagyobb telekkel kezdesz. Most: ' + SIZES[Math.min(SIZES.length - 1, n)].join('×') + '.',
    pup: n => 'Új birtok után a Nyomás, Tápoldat, Piac és Talajjavítás ' + 3 * n + '. szinten kezd (szintenként +3).',
    pauto: n => 'Új birtok után ' + n + ' szintű kertészed van.',
    pgep: n => 'Új birtok után ' + n + ' kombájnnal és ' + Math.floor(n / 2) + ' drónnal kezdesz.',
    pgyors: n => 'Állandó: +20% kombájn- és drónsebesség szintenként. Most: +' + 20 * n + '%.',
    poff: n => 'Állandó: +8 óra távolléti termelés és +5% hatékonyság szintenként.',
    pszer: n => 'Állandó: +1% aranytermés-esély, és az aranytermés +1× többet ér szintenként. Most: ' + Math.round(goldP() * 1000) / 10 + '%, ×' + goldX() + '.',
    pkedv: n => 'Állandó: −5% a modulok és növények árára szintenként. Most: −' + 5 * n + '%.',
    pcsill: n => 'Állandó: +15% hírnév-csillag új birtoknál szintenként. Most: +' + 15 * n + '%.',
    mega: '6 mezős sugárban locsol (14×14 terület), +80% növekedéssel. Nagyon vízigényes: 80 L/s.',
    hidro: 'Csőre kell kötni. 3 mezős körzetben háromszoros növekedés és dupla termés. Nagyon vízigényes: 150 L/s.',
    tenger: '+60 000 L/s vízhozam, ha csőre van kötve.',
    ciklon: '10 mezős sugárban locsol (23×23 terület), +150% növekedéssel. Rengeteg vizet eszik: 500 L/s.',
    csillkut: '+250 000 L/s vízhozam, ha csőre van kötve.',
    galobel: 'Nem kell rá cső. 4 mezős körzetben háromszoros termés és +150% növekedés.',
    nebula2: '14 mezős sugárban locsol (31×31 terület), ötszörös növekedéssel. Rengeteg vizet eszik: 4000 L/s.',
    flyuk: '+3 millió L/s vízhozam, ha csőre van kötve.',
    idoforr: '+50 millió L/s vízhozam, ha csőre van kötve.',
    vegtszor: '20 mezős sugárban locsol (43×43 terület), kilencszeres növekedéssel. 60 000 L/s.',
    csillag: n => '×2,5 termésár szintenként (szorzódik). Most: ' + xf(B(2.5).pow(n)) + '.',
    idohurok: n => '×1,8 növekedés szintenként (szorzódik). Most: ' + xf(B(1.8).pow(n)) + '.',
    multiv: n => 'Ötszörözi minden termés árát szintenként. Most: ' + xf(B(5).pow(n)) + '.',
    phir: n => 'Állandó: minden hírnév-csillag +2%-kal többet ér szintenként. Most: +' + (10 + 2 * n) + '% csillagonként.',
    pszorz: n => 'Állandó: ×1,3 termésár szintenként (szorzódik). Most: ' + xf(B(1.3).pow(n)) + '.',
    aurora: '8 mezős sugárban locsol (18×18 terület), hétszeres növekedéssel. Vízigény: 200 000 L/s.',
    csillagh: 'Csőre kell kötni. 5 mezős körzetben hétszeres növekedés és ötszörös termés. Vízigény: 1 millió L/s.',
    esokir: '26 mezős sugárban locsol (55×55 terület), tizenhatszoros növekedéssel. Vízigény: 5 millió L/s.',
    genezis: 'Csőre kell kötni. 8 mezős körzetben huszonegyszeres növekedés és tizenegyszeres termés. Vízigény: 30 millió L/s.',
    univont: '40 mezős sugárban locsol: az egész kertet. Ötvenegyszeres növekedés. Vízigény: 200 millió L/s.',
    nektar: n => '+25% nektár minden aratásból szintenként. Most: +' + 25 * n + '%.',
    raketa: n => n ? 'Kész! Fent, a kert tetején választhatsz helyszínt, és kilőheted a következőt.' : 'Megépíted az első rakétát: utána kilőheted az Űrállomást, majd a Holdat, a Marsot és tovább. Mindegyik új kert, saját modulokkal és növényekkel.',
    hajtomu: n => '−10% a kilövések árára (pénz és nektár) szintenként. Most: −' + 10 * n + '%.',
    szemelyzet: n => 'A nem látott helyszínek 30 másodpercenként jóváírják a kiszámolt termelésüket. Szintenként +10% ehhez. Most: ' + Math.round(crew() * 100) + '%.',
    mehtelep: n => autoDesc(MOD.mehtelep),
    mehgyar: n => autoDesc(MOD.mehgyar),
    robotmeh: n => autoDesc(MOD.robotmeh),
    kaptar: n => '+50% nektár a kaptárakból szintenként. Most: +' + 50 * n + '%.',
    cpgy: n => '+50% csillagpor a bányákból szintenként. Most: +' + 50 * n + '%.',
    kozar: n => '×1,4 termésár szintenként (szorzódik). Most: ' + xf(B(1.4).pow(n)) + '.',
    gravk: n => '×1,3 növekedés szintenként (szorzódik). Most: ' + xf(B(1.3).pow(n)) + '.',
    csmot: n => '×1,5 kombájn- és drónsebesség szintenként (szorzódik).',
    del: 'Lebont egy elemet vagy növényt, az ára felét visszakapod. Húzással többet is lebonthatsz.',
    mikro: 'A 4 szomszédos mezőt finom permettel locsolja: nagyon takarékos (0,15 L/s), +8% növekedés.',
    turbo: 'Erősebb szórófej: a körülötte lévő 8 mezőt locsolja, +25% növekedéssel. 1,6 L/s.',
    madar: 'Nem kell rá cső. Elriasztja a madarakat: a körülötte lévő 8 mezőn +20% termés.',
    szelk: '+9 L/s vízhozam, ha csőre van kötve. A szél hajtja, nem kell hozzá semmi más.',
    napel: '+18 L/s vízhozam (a Hatásfok is növeli), ha csőre van kötve.',
    to: '+45 L/s vízhozam, ha csőre van kötve. Ráadásnak gyönyörű.',
    giga: '4 mezős sugárban locsol (9×9 terület). 14 L/s.',
    sotal: '+120 L/s vízhozam a tenger vizéből, ha csőre van kötve.',
    arany: 'A legenda. 2 mezős sugárban (5×5) locsol, és dupla gyorsan nőnek tőle a növények. 8 L/s.',
    talaj: n => '+15% termés minden növényre szintenként. Most: +' + 15 * n + '%.',
    vetomag: n => '−6% a modulok és növények árára szintenként. Most: −' + 6 * n + '%.',
    takarek: n => '−6% vízigény az egész hálózaton szintenként. Most: −' + 6 * n + '%.',
    szerencse: n => 'Szintenként 2% esély, hogy egy aratás aranytermés: ötszörös ár. Most: ' + 2 * n + '%.',
    uveghaz: n => 'Locsolatlan mezőn is nőnek a növények, szintenként 8%-os sebességgel. Most: ' + 8 * n + '%.',
    tartaly: n => '+10% a kombájnok és drónok aratási bónuszához szintenként. Most: +' + Math.round((cbBonus() - 1) * 100) + '%.',
    raktar: n => '+5% hatékonyság a távollét alatti termelésre szintenként. Most: ' + Math.round(offF() * 100) + '%.',
    dron: n => 'Egy újabb aratódrón: a kert fölött repülve, gyorsabban arat, mint a kombájn. Most: ' + n + ' db.',
    export: n => 'Szintenként +25% (szorzódik) minden termés árára. Most: ' + xf(B(1.25).pow(n)) + '.',
    nyomas: n => '+3 L/s alap vízhozam szintenként. Most: +' + 3 * n + ' L/s.',
    hatas: n => '+15% a szivattyúk és mélykutak vízhozamára szintenként. Most: +' + 15 * n + '%.',
    tap: n => '+20% növekedési sebesség szintenként. Most: +' + 20 * n + '%.',
    piac: n => '+25% eladási ár minden termésre szintenként. Most: +' + 25 * n + '%.',
    kombajn: n => 'Egy újabb kombájn: magától járja a kertet és learatja az érett termést +25% bónusszal. Most: ' + n + ' db.',
    motor: n => 'Gyorsabbak a kombájnok. Most: +' + Math.round(35 * n / 1.8) + '%.',
    kertesz: n => 'Learatja az érett termést, és amíg nem vagy itt, akkor is termel a kert (' + (n ? Math.round(offF() * 100) + '%-os hatékonysággal' : 'kertész nélkül csak megérik és vár') + ').',
    ido: n => '+2 óra a távollét alatti termelés felső határához. Most: ' + (offMax() / 3600) + ' óra.',
    telek: n => (S.loc !== 'earth' ? LOCS[S.loc].n + ': ' : '') + 'Nagyobb kert. Most: ' + SIZES[n].join('×') + (SIZES[n + 1] ? ', következő: ' + SIZES[n + 1].join('×') : '') + '.',
    reset: 'Elölről kezded a kertet (pénz, fejlesztések és növények nullázódnak), cserébe hírnév-csillagokat kapsz. Minden csillag +10% bevétel, és a csillagokból állandó fejlesztéseket vehetsz. A ranglista-pontod megmarad.',
    halo: 'Új birtok után a csövek, a modulok és a telekméret megmaradnak.'
  };
  function autoDesc(m) {
    if (m.prov) return 'Nem kell rá cső. ' + m.aura + ' mezős körzetben biztosítja: ' + RQ[m.prov].ic + ' ' + RQ[m.prov].n + ' – a különleges növények igénye.';
    if (m.wq) return 'Csőre kell kötni, helyszínenként egy. Az egész kertre hat: ' + wqTxt(m, 1) + ' szintenként. Rákoppintva szintet lép (max ' + WQMAX + ').';
    if (m.cp) return 'Csillagport bányászik: ' + nfmt(m.cp * (1 + .5 * S.up.cpgy)) + ' ✨/mp. Nem kell rá cső.';
    if (m.hive) return 'Kaptár: nektárt termel (alap ' + nfmt(m.hive) + ' 🍯/mp, minden növény a körzetében +5%), és ' + m.aura + ' mezős körzetben +' + Math.round(m.yb * 100) + '% termés.';
    if (m.q) return '+' + fmt(m.q) + ' L/s vízhozam, ha csőre van kötve.';
    if (m.boost) return 'Csőre kell kötni. ' + m.boost + ' mezős körzetben ×' + (1 + m.gb) + ' növekedés és ×' + (1 + m.yb) + ' termés. Vízigény: ' + fmt(m.w) + ' L/s.';
    if (m.aura) return 'Nem kell rá cső. ' + m.aura + ' mezős körzetben' + (m.gb ? ' ×' + (1 + m.gb) + ' növekedés' : '') + (m.yb ? ' ×' + (1 + m.yb) + ' termés' : '') + '.';
    if (m.r) { const a = 2 * m.r + (m.sz || 1); return m.r + ' mezős sugárban locsol (' + a + '×' + a + ' terület), ×' + (m.wm || 1) + ' növekedéssel. Vízigény: ' + fmt(m.w) + ' L/s.'; }
    return '';
  }
  const wqTxt = (m, lv) => [m.wq.g ? '+' + Math.round(m.wq.g * lv * 100) + '% növekedés' : '', m.wq.y ? '+' + Math.round(m.wq.y * lv * 100) + '% ár' : '', m.wq.gold ? '+' + (+(m.wq.gold * lv * 100).toFixed(1)) + '% aranytermés' : ''].filter(Boolean).join(', ');
  function descOf(it) {
    if (galView() && it.kind !== 'x') return galDesc(it);
    if (it.warn) return it.warn;
    const big = it.sz ? 'Méret: ' + it.sz + '×' + it.sz + ' mező. ' : '';
    if (it.kind === 'pl') return (it.rq ? 'Igény: ' + it.rq.map(k => RQ[k].ic + ' ' + RQ[k].n).join(', ') + ' – enélkül nem nő. ' : '') + (it.met ? 'Fémet is terem: aratásonként ' + nfmt(it.ma * metMul()) + ' ' + MET[it.met].ic + ' ' + MET[it.met].n + '. ' : '') + big + (it.pw ? 'Vízigény: ' + fmt(it.pw) + ' L/s (locsolva). ' : '') + (it.ck && B(it.ck).gt(0) ? 'Ültetéshez nektár is kell: ' + nfmt(it.ck) + ' 🍯. ' : '') + (it.cc && B(it.cc).gt(0) ? 'Csillagpor is kell: ' + nfmt(it.cc) + ' ✨. ' : '') + 'Aratásonként ' + nfmt(nekOf(it.k)) + ' 🍯. Locsolt mezőn ' + (it.t >= 120 ? (Math.round(it.t / 6) / 10).toLocaleString('hu-HU') + ' perc' : it.t + ' mp') + ' alatt érik be, és ' + fmt(B(it.v).mul(price()).round()) + ' Ft termést hoz. ' + (S.up.uveghaz ? 'Víz nélkül csak lassan nő.' : 'Víz nélkül nem nő.');
    const d = DESC[it.k] || (MOD[it.k] ? autoDesc(MOD[it.k]) : ''), txt = typeof d === 'function' ? d(it.kind === 'perk' ? pk(it.k) : S.up[it.k]) : d || '';
    const has = v => v && B(v).gt(0), nk = (has(it.ck) ? ' Nektár is kell hozzá: ' + nfmt(it.ck) + ' 🍯.' : '') + (has(it.cc) ? ' Csillagpor is kell: ' + nfmt(it.cc) + ' ✨.' : ''); return (it.kind === 'mod' ? big + txt : txt) + nk;
  }
  function buy(G, it) {
    if (galView()) return galBuy(G, it);
    S.info = { it, l: 5 };
    if (it.kind === 'mod' || it.kind === 'pl') { S.tool = S.tool === it.k ? null : it.k; Sfx.blip(700, .04, 'sine', .05); return; }
    if (it.kind === 'reset') { if (!it.ok) return Sfx.blip(140, .1, 'square', .05); if (confirmT > 0) { confirmT = 0; rebirth(G); } else { confirmT = 3; Sfx.blip(500, .05, 'square', .05); } return; }
    if (it.kind === 'perk') { if (!it.ok) return Sfx.blip(140, .1, 'square', .05); S.star = S.star.sub(it.c); S.perk[it.k] = pk(it.k) + 1; syncCB(); net(); Sfx.perfect(); save(); return; }
    if (!unlocked(it) || it.c === Infinity || !canPay(it)) { Sfx.blip(140, .1, 'square', .05); return; }
    pay(it); S.up[it.k]++; if (it.k === 'telek') layout(G); if (it.k === 'kombajn' || it.k === 'dron') syncCB(); net(); Sfx.perfect(); save();
  }

  /* ---------- rajz ---------- */
  const shadow = (g, x, y, rx, ry, a = .28) => { g.fillStyle = `rgba(0,0,0,${a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 6.283); g.fill(); };
  function drawPlant(g, k, s, x, y, ts, t) {
    const p = PL[k], cx = x + ts / 2, by = y + ts * .86, h = ts * (.25 + .55 * s), st = p.s, ripe = s > .55, sw = Math.sin(t * 1.6 + x * .05) * ts * .015;
    const dot = (dx, dy, r, col = p.col) => { g.fillStyle = col; g.beginPath(); g.arc(cx + dx, by + dy, r, 0, 6.283); g.fill(); if (r > 2.5 && col === p.col) { g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(cx + dx - r * .3, by + dy - r * .3, r * .3, 0, 6.283); g.fill(); } };
    const leaf = (dx, dy, r, c1 = '#4fae46', c2 = '#3a8a34') => { g.fillStyle = c2; g.beginPath(); g.arc(cx + dx, by + dy, r, 0, 6.283); g.fill(); g.fillStyle = c1; g.beginPath(); g.arc(cx + dx - r * .15, by + dy - r * .18, r * .78, 0, 6.283); g.fill(); };
    g.fillStyle = '#3e2614'; rr(x + ts * .12, y + ts * .6, ts * .76, ts * .32, ts * .12); g.fill(); g.fillStyle = '#5e3c21'; rr(x + ts * .12, y + ts * .6, ts * .76, ts * .17, ts * .1); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = Math.max(1, ts * .02); for (let j = 1; j < 3; j++) { g.beginPath(); g.moveTo(x + ts * .2, y + ts * (.62 + j * .09)); g.lineTo(x + ts * .8, y + ts * (.62 + j * .09)); g.stroke(); }
    shadow(g, cx + ts * .04, by - ts * .02, ts * .22 * (.5 + s * .6), ts * .06, .22);
    g.strokeStyle = '#3f8f3a'; g.fillStyle = '#4fae46'; g.lineWidth = Math.max(1, ts * .05);
    g.save(); g.translate(sw, 0);
    if (st === 'grass') { for (let j = -3; j <= 3; j++) { g.strokeStyle = j & 1 ? '#5cbf52' : '#3f8f3a'; g.beginPath(); g.moveTo(cx + j * ts * .06, by); g.quadraticCurveTo(cx + j * ts * .1, by - h * .6, cx + j * ts * .14 + Math.sin(t * 2 + j) * ts * .03, by - h); g.stroke(); } }
    else if (st === 'rosette') { for (let j = 0; j < 6; j++) { const a = j / 6 * 6.283; g.fillStyle = j & 1 ? '#7fd65a' : '#a8ec75'; g.beginPath(); g.ellipse(cx + Math.cos(a) * h * .28, by - h * .35 + Math.sin(a) * h * .14, h * .32, h * .2, a, 0, 6.283); g.fill(); } leaf(0, -h * .38, h * .16, '#d4f7a4', '#8bd65a'); }
    else if (st === 'root') { for (let j = -1; j <= 1; j++) { g.fillStyle = j ? '#4fae46' : '#62c35a'; g.beginPath(); g.ellipse(cx + j * h * .2, by - h * .6, h * .12, h * .3, j * .5, 0, 6.283); g.fill(); } if (ripe) dot(0, -h * .1, h * .22); }
    else if (st === 'bush') { for (let j = -1; j <= 1; j++) leaf(j * h * .25, -h * .35, h * .26, p.lc ? p.lc[0] : undefined, p.lc ? p.lc[1] : undefined); if (ripe) for (const [a, b] of [[-.3, -.2], [.25, -.25], [0, -.5]]) dot(a * h, b * h, h * .1); }
    else if (st === 'stake') { g.strokeStyle = '#a07a4e'; g.beginPath(); g.moveTo(cx + ts * .12, by); g.lineTo(cx + ts * .12, by - h); g.stroke(); leaf(0, -h * .5, h * .3); leaf(-h * .12, -h * .78, h * .2, '#7ad06c');
      if (ripe) for (const [a, b] of [[-.2, -.4], [.15, -.6], [-.05, -.85]]) dot(a * h, b * h, h * .11); }
    else if (st === 'lav') { for (let j = -2; j <= 2; j++) { g.strokeStyle = '#6b8f5e'; g.beginPath(); g.moveTo(cx + j * ts * .07, by); g.lineTo(cx + j * ts * .1, by - h); g.stroke(); if (ripe) { g.fillStyle = j & 1 ? p.col : '#b896f0'; rr(cx + j * ts * .1 - ts * .03, by - h, ts * .06, h * .38, ts * .03); g.fill(); } } }
    else if (st === 'flower') { g.beginPath(); g.moveTo(cx, by); g.lineTo(cx, by - h * .7); g.stroke(); leaf(0, -h * .55, h * .32); if (ripe) { for (const [a, b, r] of [[-.15, -.8, .16], [.18, -.7, .14], [0, -.95, .13]]) { dot(a * h, b * h, r * h); dot(a * h, b * h, r * h * .45, '#c2185b'); } } }
    else if (st === 'gourd') { g.beginPath(); g.moveTo(cx - ts * .3, by - ts * .05); g.quadraticCurveTo(cx, by - h, cx + ts * .3, by - ts * .1); g.stroke(); leaf(-ts * .15, -h * .55, h * .2);
      if (ripe) { const gr = g.createRadialGradient(cx, by - ts * .16, 1, cx + ts * .05, by - ts * .12, ts * .25 * s); gr.addColorStop(0, p.hl || '#ffc46b'); gr.addColorStop(1, p.col); g.fillStyle = gr; g.beginPath(); g.ellipse(cx + ts * .05, by - ts * .12, ts * .22 * s, ts * .15 * s, 0, 0, 6.283); g.fill(); g.strokeStyle = 'rgba(160,80,10,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx + ts * .05, by - ts * .26 * s); g.lineTo(cx + ts * .05, by + ts * .02 * s); g.stroke(); } }
    else if (st === 'vine') { g.strokeStyle = '#a07a4e'; g.beginPath(); g.moveTo(cx - ts * .3, by); g.lineTo(cx - ts * .3, by - ts * .7); g.moveTo(cx + ts * .3, by); g.lineTo(cx + ts * .3, by - ts * .7); g.moveTo(cx - ts * .35, by - ts * .62); g.lineTo(cx + ts * .35, by - ts * .62); g.stroke();
      for (let j = -1; j <= 1; j++) leaf(j * ts * .2, -h * .75, h * .2); if (ripe) for (const [a, b] of [[0, -.55], [.05, -.48], [-.05, -.48], [0, -.42], [.03, -.36]]) dot(a * ts * 1.5, b * h * 1.4, ts * .05); }
    else if (st === 'corn') { g.strokeStyle = '#6fae3e'; g.lineWidth = Math.max(1, ts * .06); g.beginPath(); g.moveTo(cx, by); g.lineTo(cx, by - h * 1.05); g.stroke();
      g.fillStyle = '#5cbf52'; for (const [a, b] of [[-1, .35], [1, .55], [-1, .75]]) { g.beginPath(); g.moveTo(cx, by - h * b); g.quadraticCurveTo(cx + a * ts * .3, by - h * (b + .2), cx + a * ts * .36, by - h * (b - .05)); g.quadraticCurveTo(cx + a * ts * .2, by - h * b, cx, by - h * (b - .06)); g.fill(); }
      if (ripe) { g.fillStyle = '#a7c46a'; g.beginPath(); g.ellipse(cx + ts * .08, by - h * .6, ts * .07, h * .2, .25, 0, 6.283); g.fill(); g.fillStyle = p.col; g.beginPath(); g.ellipse(cx + ts * .1, by - h * .64, ts * .05, h * .15, .25, 0, 6.283); g.fill();
        g.strokeStyle = '#e8d07a'; g.lineWidth = Math.max(1, ts * .02); g.beginPath(); g.moveTo(cx + ts * .14, by - h * .78); g.lineTo(cx + ts * .2, by - h * .9); g.stroke(); } }
    else if (st === 'sunf') { g.strokeStyle = '#5c9a3a'; g.lineWidth = Math.max(1, ts * .055); g.beginPath(); g.moveTo(cx, by); g.lineTo(cx, by - h * .95); g.stroke(); leaf(-ts * .12, -h * .45, h * .16); leaf(ts * .12, -h * .6, h * .14);
      if (ripe) { const fr = ts * .2 * Math.min(1, s * 1.1), fy = by - h * .98; g.fillStyle = p.col; for (let j = 0; j < 12; j++) { const a = j / 12 * 6.283 + t * .2; g.beginPath(); g.ellipse(cx + Math.cos(a) * fr, fy + Math.sin(a) * fr, fr * .45, fr * .2, a, 0, 6.283); g.fill(); }
        g.fillStyle = '#5a3414'; g.beginPath(); g.arc(cx, fy, fr * .7, 0, 6.283); g.fill(); g.fillStyle = 'rgba(0,0,0,.25)'; for (let j = 0; j < 5; j++) { g.beginPath(); g.arc(cx + Math.cos(j * 2.4) * fr * .35, fy + Math.sin(j * 2.4) * fr * .35, fr * .08, 0, 6.283); g.fill(); } }
      else leaf(0, -h * .95, h * .12, '#8fd06a'); }
    else if (st === 'melon') { leaf(-ts * .22, -h * .2, h * .2); leaf(ts * .24, -h * .28, h * .18); g.strokeStyle = '#3f8f3a'; g.lineWidth = Math.max(1, ts * .03); g.beginPath(); g.moveTo(cx - ts * .3, by - ts * .05); g.bezierCurveTo(cx - ts * .1, by - ts * .25, cx + ts * .1, by, cx + ts * .32, by - ts * .12); g.stroke();
      if (ripe) { const rx = ts * .27 * s, ry = ts * .17 * s, my = by - ts * .12; g.fillStyle = p.col; g.beginPath(); g.ellipse(cx, my, rx, ry, -.1, 0, 6.283); g.fill(); g.save(); g.beginPath(); g.ellipse(cx, my, rx, ry, -.1, 0, 6.283); g.clip();
        g.fillStyle = '#1d5a22'; for (let j = -3; j <= 3; j++) { g.beginPath(); g.ellipse(cx + j * rx * .3, my, rx * .07, ry * 1.1, -.1, 0, 6.283); g.fill(); } g.restore(); g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(cx - rx * .35, my - ry * .4, rx * .25, ry * .2, -.3, 0, 6.283); g.fill(); } }
    else { const ol = st === 'olive', lc = p.lc; g.fillStyle = ol ? '#5a4632' : '#6b4423'; g.fillRect(cx - ts * .05, by - h * .55, ts * .1, h * .55);
      leaf(0, -h * .7, h * .42, lc ? lc[0] : ol ? '#a6bf94' : '#5cc062', lc ? lc[1] : ol ? '#6a875a' : '#2f8a3a'); leaf(-h * .14, -h * .82, h * .24, lc ? lc[0] : ol ? '#b9cfa8' : '#72d070', lc ? lc[1] : ol ? '#7c9a6a' : '#3d9a45');
      if (ripe) for (const [a, b] of [[-.15, -.6], [.15, -.65], [0, -.85], [.2, -.85], [-.05, -.7]]) dot(a * ts, b * h, ts * (ol ? .035 : .05)); }
    g.restore();
    if (p.glow && ripe) { const a = .25 + .15 * Math.sin(t * 2 + x), gr = g.createRadialGradient(cx, by - h * .6, 1, cx, by - h * .6, ts * .55); gr.addColorStop(0, `rgba(255,240,180,${a})`); gr.addColorStop(1, 'rgba(255,240,180,0)'); g.fillStyle = gr; g.fillRect(x, y, ts, ts); }
    if (s >= 1) { const a = .45 + .35 * Math.sin(t * 5 + x); g.strokeStyle = `rgba(255,215,120,${a})`; g.lineWidth = Math.max(1.5, ts * .05); rr(x + 2, y + 2, ts - 4, ts - 4, ts * .2); g.stroke();
      const sp = (t * 1.5 + x * .01) % 1; g.fillStyle = `rgba(255,240,180,${1 - sp})`; g.beginPath(); g.arc(cx + ts * .28, y + ts * (.3 - sp * .2), ts * .03, 0, 6.283); g.fill(); }
    else { g.fillStyle = 'rgba(0,0,0,.45)'; rr(x + ts * .15, y + ts * .935, ts * .7, ts * .045, ts * .02); g.fill(); g.fillStyle = '#9fe0ff'; rr(x + ts * .15, y + ts * .935, ts * .7 * s, ts * .045, ts * .02); g.fill(); }
  }
  // csőszakasz árnyalással + áramló víz
  function seg(g, cx, cy, dx, dy, len, pw, on, flow, t) {
    const x0 = dx > 0 ? cx : dx < 0 ? cx - len : cx - pw / 2, y0 = dy > 0 ? cy : dy < 0 ? cy - len : cy - pw / 2, w = dx ? len : pw, h = dy ? len : pw;
    g.fillStyle = on ? '#6f8fae' : '#5d636d'; g.fillRect(x0, y0, w, h);
    g.fillStyle = 'rgba(255,255,255,.28)'; if (dx) g.fillRect(x0, y0 + pw * .12, w, pw * .18); else g.fillRect(x0 + pw * .12, y0, pw * .18, h);
    g.fillStyle = 'rgba(0,0,0,.28)'; if (dx) g.fillRect(x0, y0 + pw * .75, w, pw * .25); else g.fillRect(x0 + pw * .75, y0, pw * .25, h);
    if (on && flow) { const ph = ((t * 1.6) % 1 + 1) % 1, k = flow > 0 ? ph : 1 - ph; g.fillStyle = 'rgba(170,225,255,.85)';
      for (const f of [k * .5, k * .5 + .5]) { const p = f * len; if (dx) g.fillRect(dx > 0 ? cx + p - pw * .2 : cx - p - pw * .2, cy - pw * .1, pw * .4, pw * .2); else g.fillRect(cx - pw * .1, dy > 0 ? cy + p - pw * .2 : cy - p - pw * .2, pw * .2, pw * .4); } }
  }
  function drops(g, cx, cy, R, n, t, i, a0 = 0, arc = 6.283) {
    for (let j = 0; j < n; j++) { const ph = (t * 1.1 + j * .618 + i * .13) % 1, a = a0 + (j / n) * arc + Math.sin(j * 7.1) * .2, r = R * ph, hgt = Math.sin(ph * Math.PI) * R * .35;
      g.fillStyle = `rgba(175,225,255,${.85 * (1 - ph * .7)})`; g.beginPath(); g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r - hgt, Math.max(1, L.ts * .028), 0, 6.283); g.fill(); }
  }
  /* vízkezelő üzem (2×2): betonalap, két átlátszó tartály buborékokkal, összekötő csövek, vezérlőpult */
  const WQC = { lagyito: ['#5fb4ff', '#1d5d9c'], tapado: ['#7be07a', '#2e7d32'], uvster: ['#c18cff', '#5b2a9c'], oxig: ['#7ff0ff', '#1b7f8f'], asvany: ['#e0b77a', '#8a5a2a'], kvantviz: ['#ff8cf0', '#6a1f8f'] };
  function drawWQ(g, k, i, x, y, ts, t, on) { const [c1, c2] = WQC[k] || WQC.lagyito, live = on || i < 0, u = ts / 2;
    shadow(g, x + ts * .52, y + ts * .9, ts * .44, ts * .08, .3);
    g.fillStyle = '#5d636c'; rr(x + ts * .04, y + ts * .1, ts * .92, ts * .84, ts * .06); g.fill(); g.fillStyle = '#767d87'; rr(x + ts * .06, y + ts * .12, ts * .88, ts * .78, ts * .05); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = Math.max(1, ts * .006); for (let q = 1; q < 4; q++) { g.beginPath(); g.moveTo(x + ts * (.06 + .22 * q), y + ts * .12); g.lineTo(x + ts * (.06 + .22 * q), y + ts * .9); g.stroke(); }
    // összekötő cső
    const pg = g.createLinearGradient(0, y + ts * .64, 0, y + ts * .72); pg.addColorStop(0, '#cfd8e2'); pg.addColorStop(1, '#6c7a8a'); g.fillStyle = pg; g.fillRect(x + ts * .18, y + ts * .64, ts * .64, ts * .08);
    if (live) { g.fillStyle = c1; for (let q = 0; q < 4; q++) { const px = x + ts * (.2 + ((t * .35 + q * .25) % 1) * .6); g.globalAlpha = .7; g.fillRect(px, y + ts * .665, ts * .05, ts * .03); } g.globalAlpha = 1; }
    for (const [tx, h] of [[.26, .5], [.62, .42]]) { const tw = ts * .26, tX = x + ts * tx - tw / 2, tY = y + ts * (.66 - h), tH = ts * h;
      g.fillStyle = 'rgba(0,0,0,.25)'; rr(tX + ts * .015, tY + ts * .02, tw, tH, tw * .3); g.fill();
      const gg = g.createLinearGradient(tX, 0, tX + tw, 0); gg.addColorStop(0, 'rgba(255,255,255,.55)'); gg.addColorStop(.35, 'rgba(220,235,250,.25)'); gg.addColorStop(1, 'rgba(120,140,170,.45)'); g.fillStyle = gg; rr(tX, tY, tw, tH, tw * .3); g.fill();
      const lv = live ? .62 + Math.sin(t * 1.3 + tx * 9) * .04 : .3, wY = tY + tH * (1 - lv); g.save(); rr(tX, tY, tw, tH, tw * .3); g.clip();
      const wg = g.createLinearGradient(0, wY, 0, tY + tH); wg.addColorStop(0, c1); wg.addColorStop(1, c2); g.fillStyle = wg; g.fillRect(tX, wY, tw, tH);
      g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(tX, wY, tw, Math.max(1, ts * .008));
      if (live) for (let q = 0; q < 6; q++) { const ph = (t * (.5 + q * .13) + q * .37 + tx) % 1, bx = tX + tw * (.2 + ((q * .41) % .6)), by = tY + tH - ph * (tY + tH - wY); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(bx + Math.sin(t * 3 + q) * tw * .05, by, Math.max(1, tw * (.04 + (q % 3) * .015)), 0, 6.283); g.fill(); }
      g.restore(); g.strokeStyle = 'rgba(30,40,55,.8)'; g.lineWidth = Math.max(1, ts * .012); rr(tX, tY, tw, tH, tw * .3); g.stroke();
      g.fillStyle = '#9aa6b4'; rr(tX - tw * .08, tY - ts * .03, tw * 1.16, ts * .05, ts * .02); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(tX + tw * .12, tY + tH * .08, tw * .1, tH * .8); }
    if (k === 'uvster' && live) { g.fillStyle = `rgba(200,140,255,${.18 + .1 * Math.sin(t * 5)})`; g.beginPath(); g.arc(x + ts * .44, y + ts * .38, ts * .3, 0, 6.283); g.fill(); }
    if (k === 'kvantviz' && live) { g.strokeStyle = 'rgba(255,140,240,.6)'; g.lineWidth = Math.max(1, ts * .01); for (let q = 0; q < 3; q++) { g.beginPath(); g.ellipse(x + ts * .44, y + ts * .4, ts * .3, ts * .1, t * (1 + q * .4) + q, 0, 6.283); g.stroke(); } }
    // vezérlőpult
    const px = x + ts * .76, py = y + ts * .2; g.fillStyle = '#2b3442'; rr(px, py, ts * .16, ts * .36, ts * .03); g.fill(); g.fillStyle = '#10161f'; g.fillRect(px + ts * .025, py + ts * .03, ts * .11, ts * .08);
    g.fillStyle = c1; g.font = `${ts * .09}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(WQI[k], px + ts * .08, py + ts * .072);
    for (let q = 0; q < 3; q++) { g.fillStyle = live ? (q === Math.floor(t * 2) % 3 ? '#7dff9a' : '#2f6a3a') : '#5a2020'; g.beginPath(); g.arc(px + ts * (.04 + q * .04), py + ts * .17, ts * .014, 0, 6.283); g.fill(); }
    g.fillStyle = '#c0392b'; g.beginPath(); g.arc(px + ts * .08, py + ts * .27, ts * .035, 0, 6.283); g.fill();
    if (i >= 0) { const lv = wqLv(k); g.fillStyle = '#ffe29a'; g.beginPath(); g.arc(x + ts * .88, y + ts * .82, ts * .085, 0, 6.283); g.fill(); g.strokeStyle = '#7a5a1e'; g.lineWidth = Math.max(1, ts * .01); g.stroke(); g.fillStyle = '#1a1206'; g.font = `800 ${ts * .1}px Inter, sans-serif`; g.fillText(lv, x + ts * .88, y + ts * .825); }
  }
  function drawMod(g, k, i, x, y, ts, t, on, eff) {
    const c = i % COLS, r = Math.floor(i / COLS), cx = x + ts / 2, cy = y + ts / 2, pw = ts * .26, m = MOD[k], ef = eff == null ? NET.eff : eff;
    if (m && m.wq) return drawWQ(g, k, i, x, y, ts, t, on);
    if (m && (m.prov || m.wq)) { // igény- és vízkezelő modulok: saját tábla ikonnal
      shadow(g, cx + ts * .04, cy + ts * .32, ts * .36, ts * .09); const wq = !!m.wq, gr = g.createLinearGradient(x, y, x, y + ts);
      gr.addColorStop(0, wq ? '#4a7fb0' : '#7a6a4a'); gr.addColorStop(1, wq ? '#22456a' : '#4a3e28'); g.fillStyle = gr; rr(x + ts * .1, y + ts * .12, ts * .8, ts * .76, ts * .14); g.fill();
      g.strokeStyle = wq ? (on || i < 0 ? '#9fd6f5' : 'rgba(159,214,245,.35)') : '#e8d29a'; g.lineWidth = Math.max(1, ts * .04); g.stroke();
      if (wq && on && i >= 0) { g.fillStyle = 'rgba(159,214,245,.35)'; const lv = (Math.sin(t * 2 + i) + 1) / 2; rr(x + ts * .16, y + ts * (.62 - lv * .08), ts * .68, ts * (.2 + lv * .08), ts * .08); g.fill(); }
      g.font = `${ts * .44}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(wq ? WQI[k] : RQ[m.prov].ic, cx, cy - ts * .02);
      if (wq && i >= 0) { const lv = wqLv(k); g.fillStyle = '#ffe29a'; g.beginPath(); g.arc(x + ts * .8, y + ts * .2, ts * .17, 0, 6.283); g.fill(); g.fillStyle = '#1a1206'; g.font = `800 ${ts * .2}px Inter, sans-serif`; g.fillText(lv, x + ts * .8, y + ts * .21); }
      return; }
    if (m && m.sz) return drawBig(g, k, i, x, y, ts, t, on || ((m.aura || m.cp) && 1));
    if (m && m.look) k = m.look;
    if (m && m.cp) on = 1;
    if (m && m.aura) {
      shadow(g, cx + ts * .05, cy + ts * .3, ts * .36, ts * .1);
      if (k === 'komp') { const gr = g.createLinearGradient(x, y, x, y + ts); gr.addColorStop(0, '#7a5230'); gr.addColorStop(1, '#4a2f18'); g.fillStyle = gr; rr(x + ts * .15, y + ts * .25, ts * .7, ts * .6, ts * .08); g.fill(); g.fillStyle = '#3d2814'; for (let j = 0; j < 3; j++) g.fillRect(x + ts * .2, y + ts * (.35 + j * .16), ts * .6, ts * .05); g.fillStyle = '#6fcf6a'; g.fillRect(x + ts * .28, y + ts * .18, ts * .44, ts * .1); g.fillStyle = '#a0522d'; g.fillRect(x + ts * .4, y + ts * .2, ts * .08, ts * .06); }
      else if (k === 'gomba') { g.fillStyle = '#5b3a22'; rr(x + ts * .12, y + ts * .58, ts * .76, ts * .28, ts * .08); g.fill();
        for (const [dx, dy, r, c2] of [[-.18, .05, .17, '#c0392b'], [.16, .1, .13, '#e0b080'], [0, -.08, .2, '#d9533d']]) { g.fillStyle = '#f2e6cf'; g.fillRect(cx + dx * ts - ts * .04, cy + dy * ts, ts * .08, ts * .2); g.fillStyle = c2; g.beginPath(); g.ellipse(cx + dx * ts, cy + dy * ts, r * ts, r * ts * .7, 0, Math.PI, 0); g.fill(); if (c2 !== '#e0b080') { g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + dx * ts - r * ts * .3, cy + dy * ts - r * ts * .35, ts * .025, 0, 6.283); g.arc(cx + dx * ts + r * ts * .25, cy + dy * ts - r * ts * .3, ts * .02, 0, 6.283); g.fill(); } } }
      else if (k === 'katica') { g.fillStyle = '#8a5a2b'; rr(x + ts * .2, y + ts * .25, ts * .6, ts * .6, ts * .08); g.fill(); g.fillStyle = '#c0392b'; g.beginPath(); g.moveTo(x + ts * .14, y + ts * .3); g.lineTo(cx, y + ts * .06); g.lineTo(x + ts * .86, y + ts * .3); g.fill(); g.fillStyle = '#2b1a0e'; g.beginPath(); g.arc(cx, cy + ts * .08, ts * .08, 0, 6.283); g.fill();
        if (i >= 0) for (let j = 0; j < 3; j++) { const a = t * 1.5 + j * 2.1 + i; const bx = cx + Math.cos(a) * ts * .55, by2 = cy + Math.sin(a * 1.2) * ts * .45; g.fillStyle = '#e5333d'; g.beginPath(); g.arc(bx, by2, ts * .05, 0, 6.283); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(bx, by2 - ts * .04, ts * .025, 0, 6.283); g.fill(); g.fillRect(bx - ts * .003, by2 - ts * .05, ts * .006, ts * .1); } }
      else if (k === 'lampa') { const a = .35 + .15 * Math.sin(t * 2 + i), gl = g.createRadialGradient(cx, cy, 1, cx, cy, ts * 1.2); gl.addColorStop(0, `rgba(255,120,220,${a})`); gl.addColorStop(1, 'rgba(255,120,220,0)'); g.fillStyle = gl; g.fillRect(x - ts, y - ts, ts * 3, ts * 3);
        g.strokeStyle = '#4b5563'; g.lineWidth = ts * .05; g.beginPath(); g.moveTo(cx, y + ts * .9); g.lineTo(cx, y + ts * .3); g.stroke(); g.fillStyle = '#2b3442'; rr(cx - ts * .3, y + ts * .16, ts * .6, ts * .16, ts * .05); g.fill(); g.fillStyle = '#ff7ad9'; g.fillRect(cx - ts * .26, y + ts * .28, ts * .52, ts * .04); }
      else if (k === 'obel') { const a = .4 + .2 * Math.sin(t * 1.5), gl = g.createRadialGradient(cx, cy, 1, cx, cy, ts * 1.6); gl.addColorStop(0, `rgba(255,226,154,${a})`); gl.addColorStop(1, 'rgba(255,226,154,0)'); g.fillStyle = gl; g.fillRect(x - ts * 1.5, y - ts * 1.5, ts * 4, ts * 4);
        const gr = g.createLinearGradient(cx - ts * .2, 0, cx + ts * .2, 0); gr.addColorStop(0, '#6b5a3a'); gr.addColorStop(.5, '#c9b07a'); gr.addColorStop(1, '#5a4a2e'); g.fillStyle = gr; g.beginPath(); g.moveTo(cx - ts * .2, y + ts * .9); g.lineTo(cx - ts * .13, y + ts * .12); g.lineTo(cx, y - ts * .04); g.lineTo(cx + ts * .13, y + ts * .12); g.lineTo(cx + ts * .2, y + ts * .9); g.fill();
        g.fillStyle = '#ffe29a'; g.beginPath(); g.moveTo(cx, y + ts * .3); g.lineTo(cx + ts * .05, y + ts * .42); g.lineTo(cx, y + ts * .54); g.lineTo(cx - ts * .05, y + ts * .42); g.fill(); }
      else if (k === 'madar') { g.strokeStyle = '#7a5530'; g.lineWidth = ts * .06; g.beginPath(); g.moveTo(cx, cy + ts * .4); g.lineTo(cx, cy - ts * .2); g.moveTo(cx - ts * .34, cy - ts * .02); g.lineTo(cx + ts * .34, cy - ts * .02); g.stroke();
        g.fillStyle = '#3a6fb0'; g.beginPath(); g.moveTo(cx - ts * .2, cy - ts * .08); g.lineTo(cx + ts * .2, cy - ts * .08); g.lineTo(cx + ts * .16, cy + ts * .22); g.lineTo(cx - ts * .16, cy + ts * .22); g.fill();
        g.fillStyle = '#e8c27a'; g.beginPath(); g.arc(cx, cy - ts * .22, ts * .12, 0, 6.283); g.fill(); g.fillStyle = '#8a5a1a'; g.beginPath(); g.ellipse(cx, cy - ts * .31, ts * .2, ts * .05, 0, 0, 6.283); g.fill(); g.fillRect(cx - ts * .09, cy - ts * .42, ts * .18, ts * .1);
        g.fillStyle = '#222'; g.fillRect(cx - ts * .06, cy - ts * .24, ts * .03, ts * .03); g.fillRect(cx + ts * .03, cy - ts * .24, ts * .03, ts * .03);
        if (i >= 0) { const ph = (t * .5 + i * .3) % 4; if (ph < 1) { g.fillStyle = '#222'; const bx = cx + ts * (.4 + ph * 1.2), by2 = cy - ts * (.3 + ph * .8); g.beginPath(); g.moveTo(bx - ts * .08, by2); g.quadraticCurveTo(bx, by2 - ts * .06 * Math.abs(Math.sin(t * 20)), bx + ts * .08, by2); g.lineTo(bx, by2 + ts * .02); g.fill(); } } }
      else { const gr = g.createLinearGradient(cx - ts * .3, 0, cx + ts * .3, 0); gr.addColorStop(0, '#f5cd6a'); gr.addColorStop(1, '#c99434'); g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy + ts * .1, ts * .3, ts * .32, 0, Math.PI, 0); g.fill(); g.fillRect(cx - ts * .3, cy + ts * .1, ts * .6, ts * .25); g.fillStyle = '#8a5a1a'; for (let j = 0; j < 3; j++) g.fillRect(cx - ts * .3, cy - ts * .08 + j * ts * .12, ts * .6, ts * .025); g.fillStyle = '#3a2410'; g.beginPath(); g.arc(cx, cy + ts * .28, ts * .06, 0, 6.283); g.fill();
        if (i >= 0) for (let j = 0; j < 4; j++) { const a = t * 3 + j * 1.6 + i; const bx = cx + Math.cos(a) * ts * .6, by2 = cy + Math.sin(a * 1.3) * ts * .45; g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(bx, by2 - ts * .03, ts * .04, ts * .025, Math.sin(t * 40) , 0, 6.283); g.fill(); g.fillStyle = '#ffd93b'; g.beginPath(); g.arc(bx, by2, ts * .035, 0, 6.283); g.fill(); g.fillStyle = '#222'; g.fillRect(bx - ts * .01, by2 - ts * .035, ts * .02, ts * .07); } }
      return;
    }
    const nb = i < 0 ? (k === 'pipe' || k === 'szelep' || k === 'fok' || k === 'szuro' ? [[1, 0], [-1, 0]] : []) : D4.filter(([dx, dy]) => inside(c + dx, r + dy) && condAt(idx(c + dx, r + dy))).map(v => [...v]);
    if (k === 'src') nb.push([-1, 0]);
    const myD = i >= 0 ? NET.dist[i] : 0;
    const flows = nb.map(([dx, dy]) => { if (i < 0) return 1; if (k === 'src' && dx < 0) return -1; const j = idx(c + dx, r + dy); return NET.on[j] && NET.dist[j] >= 0 ? (NET.dist[j] > myD ? 1 : NET.dist[j] < myD ? -1 : 0) : 0; });
    const closed = k === 'szelep' && i >= 0 && S.vc[i];
    nb.forEach(([dx, dy], j) => { let [ddx, ddy] = L.tr && i >= 0 ? [dy, dx] : [dx, dy]; seg(g, cx, cy, ddx, ddy, ts / 2 + 1, pw, on, closed && flows[j] > 0 ? 0 : flows[j], t + i * .07); });
    if (nb.length) { g.fillStyle = on ? '#7f9fbe' : '#6b7280'; g.beginPath(); g.arc(cx, cy, pw * .62, 0, 6.283); g.fill(); g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(cx - pw * .15, cy - pw * .15, pw * .25, 0, 6.283); g.fill(); }
    if (k === 'pipe') { if (nb.length > 2 || nb.length === 1) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = Math.max(1, ts * .03); g.beginPath(); g.arc(cx, cy, pw * .64, 0, 6.283); g.stroke(); } return; }
    if (k !== 'src') shadow(g, cx + ts * .05, cy + ts * .28, ts * .3, ts * .09, .22);
    if (k === 'src') { g.save(); g.translate(cx, cy); g.rotate(t * .8); g.strokeStyle = '#e8b656'; g.lineWidth = ts * .08; g.beginPath(); g.arc(0, 0, ts * .3, 0, 6.283); g.stroke();
      for (let j = 0; j < 4; j++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(0, 0); g.lineTo(ts * .3, 0); g.stroke(); } g.fillStyle = '#ffe29a'; g.beginPath(); g.arc(0, 0, ts * .08, 0, 6.283); g.fill(); g.restore(); }
    else if (k === 'szelep') { g.fillStyle = '#3a4250'; rr(cx - ts * .2, cy - ts * .2, ts * .4, ts * .4, ts * .06); g.fill(); g.save(); g.translate(cx, cy); g.rotate(closed ? Math.PI / 2 : 0);
      g.fillStyle = closed ? '#e5533d' : '#4caf50'; rr(-ts * .3, -ts * .06, ts * .6, ts * .12, ts * .06); g.fill(); g.restore(); g.fillStyle = '#d9d9d9'; g.beginPath(); g.arc(cx, cy, ts * .06, 0, 6.283); g.fill(); }
    else if (k === 'fok') { const gr = g.createLinearGradient(x, y, x + ts, y + ts); gr.addColorStop(0, '#ff8a3d'); gr.addColorStop(1, '#c4521a'); g.fillStyle = on ? gr : '#5b5b5b'; rr(x + ts * .18, y + ts * .22, ts * .64, ts * .56, ts * .1); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = ts * .05; g.beginPath(); g.arc(cx, cy, ts * .15, Math.PI * .8, Math.PI * 2.2); g.stroke(); g.save(); g.translate(cx, cy); g.rotate(-Math.PI * .8 + (on ? (Math.sin(t * 3) * .3 + .9) : 0) * Math.PI * .7); g.fillStyle = '#fff'; g.fillRect(0, -ts * .015, ts * .13, ts * .03); g.restore(); }
    else if (k === 'szuro') { const gr = g.createLinearGradient(x, 0, x + ts, 0); gr.addColorStop(0, '#9fb6c9'); gr.addColorStop(.5, '#e8f1f8'); gr.addColorStop(1, '#8aa3b8'); g.fillStyle = gr; rr(cx - ts * .17, y + ts * .14, ts * .34, ts * .72, ts * .14); g.fill();
      g.fillStyle = on ? 'rgba(80,170,230,.7)' : 'rgba(80,90,100,.6)'; rr(cx - ts * .12, y + ts * (.5 - (on ? .05 * Math.sin(t * 2) : 0)), ts * .24, ts * .3, ts * .08); g.fill(); g.fillStyle = '#3a4250'; g.fillRect(cx - ts * .2, y + ts * .14, ts * .4, ts * .07); }
    else if (k === 'pump') { const gr = g.createLinearGradient(x, y, x, y + ts); gr.addColorStop(0, on ? '#4aa8f0' : '#6b7280'); gr.addColorStop(1, on ? '#1f6fb8' : '#4b5563'); g.fillStyle = gr; rr(x + ts * .14, y + ts * .14, ts * .72, ts * .72, ts * .14); g.fill();
      g.fillStyle = 'rgba(255,255,255,.2)'; rr(x + ts * .18, y + ts * .17, ts * .64, ts * .12, ts * .06); g.fill();
      g.save(); g.translate(cx, cy); g.rotate(on ? t * 8 : 0); g.fillStyle = '#d6ecff'; for (let j = 0; j < 3; j++) { g.rotate(2.094); rr(-ts * .045, 0, ts * .09, ts * .25, ts * .04); g.fill(); } g.restore(); g.fillStyle = '#123'; g.beginPath(); g.arc(cx, cy, ts * .06, 0, 6.283); g.fill(); }
    else if (k === 'kut') { const gr = g.createRadialGradient(cx - ts * .1, cy - ts * .1, 1, cx, cy, ts * .42); gr.addColorStop(0, '#a3a3a3'); gr.addColorStop(1, '#5e5e5e'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, ts * .42, 0, 6.283); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1; for (let j = 0; j < 10; j++) { const a = j * .628; g.beginPath(); g.moveTo(cx + Math.cos(a) * ts * .28, cy + Math.sin(a) * ts * .28); g.lineTo(cx + Math.cos(a) * ts * .42, cy + Math.sin(a) * ts * .42); g.stroke(); }
      const wg = g.createRadialGradient(cx, cy, 1, cx, cy, ts * .27); wg.addColorStop(0, on ? '#7fd0ff' : '#2b3442'); wg.addColorStop(1, on ? '#1d5f9c' : '#111827'); g.fillStyle = wg; g.beginPath(); g.arc(cx, cy, ts * .27, 0, 6.283); g.fill();
      if (on) { g.strokeStyle = `rgba(255,255,255,${.3 + .2 * Math.sin(t * 3)})`; g.beginPath(); g.arc(cx, cy, ts * (.08 + .15 * ((t * .6) % 1)), 0, 6.283); g.stroke(); } }
    else if (k === 'torony') { g.strokeStyle = '#7a6a55'; g.lineWidth = ts * .05; g.beginPath(); g.moveTo(cx - ts * .3, y + ts * .9); g.lineTo(cx - ts * .18, y + ts * .4); g.moveTo(cx + ts * .3, y + ts * .9); g.lineTo(cx + ts * .18, y + ts * .4); g.moveTo(cx - ts * .25, y + ts * .7); g.lineTo(cx + ts * .25, y + ts * .7); g.stroke();
      const gr = g.createLinearGradient(cx - ts * .35, 0, cx + ts * .35, 0); gr.addColorStop(0, '#9aa7b4'); gr.addColorStop(.4, '#e7eef4'); gr.addColorStop(1, '#7a8794'); g.fillStyle = gr; rr(cx - ts * .35, y + ts * .08, ts * .7, ts * .36, ts * .1); g.fill();
      g.fillStyle = '#c8964a'; g.beginPath(); g.moveTo(cx - ts * .38, y + ts * .1); g.lineTo(cx, y - ts * .08); g.lineTo(cx + ts * .38, y + ts * .1); g.fill(); if (on) { g.fillStyle = 'rgba(60,150,220,.6)'; g.fillRect(cx - ts * .3, y + ts * (.3 - .04 * Math.sin(t)), ts * .6, ts * .12); } }
    else if (k === 'hordo') { const gr = g.createLinearGradient(x + ts * .22, 0, x + ts * .78, 0); gr.addColorStop(0, '#6b4220'); gr.addColorStop(.45, '#a8733d'); gr.addColorStop(1, '#5a3618'); g.fillStyle = gr; rr(x + ts * .22, y + ts * .14, ts * .56, ts * .72, ts * .12); g.fill(); g.fillStyle = '#4a4a4a'; g.fillRect(x + ts * .2, y + ts * .3, ts * .6, ts * .06); g.fillRect(x + ts * .2, y + ts * .64, ts * .6, ts * .06);
      g.fillStyle = on ? '#6cc6ff' : '#2b3442'; g.beginPath(); g.ellipse(cx, y + ts * .18, ts * .24, ts * .06, 0, 0, 6.283); g.fill(); }
    else if (k === 'szelk') { g.strokeStyle = '#8a95a3'; g.lineWidth = ts * .05; g.beginPath(); g.moveTo(cx - ts * .22, y + ts * .9); g.lineTo(cx, y + ts * .3); g.lineTo(cx + ts * .22, y + ts * .9); g.moveTo(cx - ts * .14, y + ts * .66); g.lineTo(cx + ts * .14, y + ts * .66); g.stroke();
      g.save(); g.translate(cx, y + ts * .3); g.rotate(t * (on ? 3 : .4)); g.fillStyle = '#e7eef4'; for (let j = 0; j < 4; j++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(0, 0); g.lineTo(ts * .36, -ts * .05); g.lineTo(ts * .36, ts * .06); g.closePath(); g.fill(); } g.restore();
      g.fillStyle = '#c0392b'; g.beginPath(); g.arc(cx, y + ts * .3, ts * .05, 0, 6.283); g.fill(); }
    else if (k === 'napel') { g.fillStyle = '#3a4250'; g.fillRect(cx - ts * .04, cy, ts * .08, ts * .38); g.save(); g.translate(cx, cy - ts * .02); g.transform(1, 0, -.25, .75, 0, 0);
      const gr = g.createLinearGradient(-ts * .4, -ts * .3, ts * .4, ts * .3); gr.addColorStop(0, on ? '#2a5fb0' : '#3a4250'); gr.addColorStop(1, on ? '#0f2f63' : '#232a35'); g.fillStyle = gr; g.fillRect(-ts * .38, -ts * .3, ts * .76, ts * .56);
      g.strokeStyle = 'rgba(180,210,255,.45)'; g.lineWidth = Math.max(1, ts * .015); for (let j = 1; j < 4; j++) { g.beginPath(); g.moveTo(-ts * .38 + j * ts * .19, -ts * .3); g.lineTo(-ts * .38 + j * ts * .19, ts * .26); g.stroke(); } g.beginPath(); g.moveTo(-ts * .38, -ts * .02); g.lineTo(ts * .38, -ts * .02); g.stroke();
      if (on) { g.fillStyle = `rgba(255,255,255,${.15 + .12 * Math.sin(t * 1.5)})`; g.fillRect(-ts * .38, -ts * .3, ts * .2, ts * .56); } g.restore(); }
    else if (k === 'to') { const gr = g.createRadialGradient(cx - ts * .1, cy - ts * .1, 1, cx, cy, ts * .45); gr.addColorStop(0, on ? '#7fd0ff' : '#4a5a6a'); gr.addColorStop(1, on ? '#1d6fb0' : '#2b3442');
      g.fillStyle = '#8a7a62'; g.beginPath(); g.ellipse(cx, cy, ts * .46, ts * .4, 0, 0, 6.283); g.fill(); g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, ts * .4, ts * .34, 0, 0, 6.283); g.fill();
      g.fillStyle = '#3f9d3a'; g.beginPath(); g.arc(cx + ts * .14, cy + ts * .06, ts * .08, 0, 6.283); g.fill(); g.fillStyle = '#ff9ec7'; g.beginPath(); g.arc(cx + ts * .15, cy + ts * .04, ts * .03, 0, 6.283); g.fill();
      if (on) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = Math.max(1, ts * .02); const ph = (t * .5 + i * .1) % 1; g.beginPath(); g.ellipse(cx - ts * .12, cy - ts * .06, ts * .2 * ph, ts * .12 * ph, 0, 0, 6.283); g.stroke();
        if (i >= 0) { g.fillStyle = '#ff8a2e'; const fa = t * .9 + i; g.beginPath(); g.ellipse(cx + Math.cos(fa) * ts * .2, cy + Math.sin(fa) * ts * .15, ts * .05, ts * .025, fa + 1.57, 0, 6.283); g.fill(); } } }
    else if (k === 'sotal') { const gr = g.createLinearGradient(x, y, x + ts, y); gr.addColorStop(0, '#cfd8e2'); gr.addColorStop(.5, '#ffffff'); gr.addColorStop(1, '#9fb0c2'); g.fillStyle = gr; rr(x + ts * .1, y + ts * .3, ts * .8, ts * .55, ts * .08); g.fill();
      for (const ox of [.28, .5, .72]) { g.fillStyle = '#8aa3b8'; rr(x + ts * (ox - .07), y + ts * .12, ts * .14, ts * .3, ts * .05); g.fill(); g.fillStyle = on ? '#6cc6ff' : '#4b5563'; g.fillRect(x + ts * (ox - .05), y + ts * (.36 - (on ? .1 * ((Math.sin(t * 2 + ox * 9) + 1) / 2) : 0)), ts * .1, ts * .06); }
      g.fillStyle = on ? '#4caf50' : '#6b7280'; g.beginPath(); g.arc(x + ts * .8, y + ts * .4, ts * .04, 0, 6.283); g.fill(); g.fillStyle = '#3a4250'; g.fillRect(x + ts * .2, y + ts * .62, ts * .6, ts * .06); }
    else if (k === 'szivv') { const gr = g.createRadialGradient(cx, cy, 1, cx, cy, ts * .42); gr.addColorStop(0, '#e0f7ff'); gr.addColorStop(1, on ? '#4aa8f0' : '#4b5563'); g.fillStyle = '#9aa7b4'; g.beginPath(); g.arc(cx, cy, ts * .44, 0, 6.283); g.fill(); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, ts * .36, 0, 6.283); g.fill();
      if (on) { const cols = ['#ff5d5d', '#ffb347', '#ffe066', '#7ad06c', '#6cc6ff', '#a07be0']; g.lineWidth = ts * .045; cols.forEach((c2, j) => { g.strokeStyle = c2; g.globalAlpha = .7; g.beginPath(); g.arc(cx, cy + ts * .1, ts * (.42 - j * .05), Math.PI * 1.08, Math.PI * 1.92); g.stroke(); }); g.globalAlpha = 1; } }
    else if (k === 'gejzir') { g.fillStyle = '#7a6a55'; g.beginPath(); g.ellipse(cx, cy + ts * .2, ts * .4, ts * .22, 0, 0, 6.283); g.fill(); g.fillStyle = on ? '#4aa8f0' : '#2b3442'; g.beginPath(); g.ellipse(cx, cy + ts * .2, ts * .2, ts * .1, 0, 0, 6.283); g.fill();
      if (on) { const ph = (t * .35 + i * .17) % 1, hgt = ph < .35 ? Math.sin(ph / .35 * Math.PI) : 0; if (hgt > 0) { const gr = g.createLinearGradient(0, cy + ts * .2, 0, cy - ts * 1.3 * hgt); gr.addColorStop(0, 'rgba(160,220,255,.9)'); gr.addColorStop(1, 'rgba(230,248,255,.2)'); g.fillStyle = gr; g.beginPath(); g.moveTo(cx - ts * .12, cy + ts * .2); g.lineTo(cx - ts * .05, cy - ts * 1.3 * hgt); g.lineTo(cx + ts * .05, cy - ts * 1.3 * hgt); g.lineTo(cx + ts * .12, cy + ts * .2); g.fill(); }
        else { g.fillStyle = 'rgba(230,240,250,.35)'; g.beginPath(); g.arc(cx + Math.sin(t * 2) * ts * .05, cy - ts * .1 - ((t * .8) % 1) * ts * .3, ts * .1, 0, 6.283); g.fill(); } } }
    else if (k === 'jeg') { const gr = g.createLinearGradient(x, y, x, y + ts); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#9fd3f2'); g.fillStyle = gr; g.beginPath(); g.moveTo(x + ts * .1, y + ts * .85); g.lineTo(x + ts * .3, y + ts * .25); g.lineTo(x + ts * .45, y + ts * .4); g.lineTo(x + ts * .6, y + ts * .1); g.lineTo(x + ts * .9, y + ts * .85); g.fill();
      g.strokeStyle = 'rgba(80,150,200,.5)'; g.lineWidth = Math.max(1, ts * .02); g.beginPath(); g.moveTo(x + ts * .6, y + ts * .1); g.lineTo(x + ts * .55, y + ts * .5); g.stroke(); if (on) for (let j = 0; j < 3; j++) { const ph = (t * .8 + j / 3) % 1; g.fillStyle = `rgba(150,215,255,${1 - ph})`; g.beginPath(); g.arc(x + ts * (.3 + j * .2), y + ts * (.85 + ph * .12), ts * .03, 0, 6.283); g.fill(); } }
    else if (k === 'portal') { g.save(); g.translate(cx, cy); g.rotate(t * (on ? 2 : .3)); for (let j = 0; j < 4; j++) { g.rotate(Math.PI / 2); const gr = g.createLinearGradient(0, 0, ts * .42, 0); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, on ? 'rgba(108,198,255,0)' : 'rgba(100,100,120,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(ts * .3, -ts * .25, ts * .42, 0); g.quadraticCurveTo(ts * .2, -ts * .05, 0, 0); g.fill(); } g.restore();
      g.strokeStyle = on ? '#c084fc' : '#4b5563'; g.lineWidth = ts * .06; g.beginPath(); g.arc(cx, cy, ts * .4, 0, 6.283); g.stroke(); }
    else if (k === 'linx' || k === 'liny') { g.fillStyle = '#2b3442'; rr(cx - ts * .22, cy - ts * .22, ts * .44, ts * .44, ts * .08); g.fill(); g.fillStyle = on ? '#e8b656' : '#6b7280'; g.font = `700 ${ts * .34}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(k === 'linx' ? '↔' : '↕', cx, cy + 1); }
    else if (k === 'spr' || k === 'rot' || k === 'kod' || k === 'piv' || k === 'turbo' || k === 'giga' || k === 'arany' || k === 'kristr' || k === 'felho') {
      const big = k === 'rot' || k === 'piv' || k === 'giga' || k === 'arany' || k === 'kristr' || k === 'felho';
      if (k === 'arany') { const gl = g.createRadialGradient(cx, cy, 1, cx, cy, ts * .5); gl.addColorStop(0, `rgba(255,226,154,${.5 + .2 * Math.sin(t * 3)})`); gl.addColorStop(1, 'rgba(255,226,154,0)'); g.fillStyle = gl; g.fillRect(x, y, ts, ts); }
      const gr = g.createRadialGradient(cx - ts * .05, cy - ts * .05, 1, cx, cy, ts * (big ? .26 : .2)); gr.addColorStop(0, '#5b6678'); gr.addColorStop(1, '#1f2632'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, ts * (big ? .26 : .2), 0, 6.283); g.fill();
      g.fillStyle = on ? (k === 'kod' ? '#9fe0ff' : k === 'turbo' ? '#ff8a3d' : k === 'giga' ? '#6cc6ff' : k === 'arany' ? '#ffe29a' : k === 'kristr' ? '#e0b0ff' : k === 'felho' ? '#ffffff' : '#e8b656') : '#6b7280'; g.beginPath(); g.arc(cx, cy, ts * (big ? .12 : .09), 0, 6.283); g.fill();
      if (k === 'arany') { g.fillStyle = '#b27a22'; for (let j = 0; j < 6; j++) { const a = j * 1.047 + t; g.beginPath(); g.arc(cx + Math.cos(a) * ts * .2, cy + Math.sin(a) * ts * .2, ts * .025, 0, 6.283); g.fill(); } }
      if (k === 'turbo' || k === 'giga') { g.strokeStyle = k === 'turbo' ? '#ff8a3d' : '#6cc6ff'; g.lineWidth = Math.max(1, ts * .03); g.beginPath(); g.arc(cx, cy, ts * (big ? .3 : .24), 0, 6.283); g.stroke(); }
      if (!on) return;
      if (k === 'piv') { const a = t * .6; g.save(); g.translate(cx, cy); g.rotate(a); const al = ts * (i < 0 ? .45 : 3.3); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(ts * .05, ts * .08, al, ts * .08);
          g.strokeStyle = '#c3ced9'; g.lineWidth = ts * .04; g.beginPath(); g.moveTo(0, 0); g.lineTo(al, 0); g.stroke(); for (let s2 = ts * .5; s2 < al; s2 += ts * .5) { g.beginPath(); g.moveTo(s2, -ts * .06); g.lineTo(s2 + ts * .25, ts * .06); g.stroke(); }
          if (i >= 0) { g.fillStyle = '#333'; g.fillRect(al - ts * .1, -ts * .12, ts * .2, ts * .24); for (let s2 = ts * .4; s2 < al; s2 += ts * .35) { const ph = (t * 2 + s2) % 1; g.fillStyle = `rgba(175,225,255,${1 - ph})`; g.beginPath(); g.arc(s2, ts * .12 * ph + ts * .05, ts * .03, 0, 6.283); g.fill(); } }
          g.restore(); }
      else if (k === 'kod') { for (let j = 0; j < 7; j++) { const k2 = (t * .45 + j / 7) % 1; g.fillStyle = `rgba(225,242,255,${.28 * (1 - k2)})`; g.beginPath(); g.arc(cx + Math.cos(j * 1.3) * ts * .6 * k2, cy + Math.sin(j * 2.1) * ts * .6 * k2, ts * (.18 + .55 * k2), 0, 6.283); g.fill(); } }
      else if (k === 'rot' || k === 'giga') { const a = t * (k === 'giga' ? 1.4 : 2.2); drops(g, cx, cy, ts * (k === 'giga' ? 4.4 : 2.4) * ef, i < 0 ? 4 : k === 'giga' ? 26 : 14, t, i, a, .5); g.strokeStyle = 'rgba(175,225,255,.5)'; g.lineWidth = Math.max(1, ts * .03); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a + .25) * ts * .6, cy + Math.sin(a + .25) * ts * .6); g.stroke(); }
      else if (k === 'kristr') { drops(g, cx, cy, ts * 3.4 * ef, i < 0 ? 6 : 24, t, i); g.fillStyle = 'rgba(224,176,255,.8)'; for (let j = 0; j < 4; j++) { const a = j * 1.57 + t; g.beginPath(); g.moveTo(cx + Math.cos(a) * ts * .14, cy + Math.sin(a) * ts * .14); g.lineTo(cx + Math.cos(a + .3) * ts * .3, cy + Math.sin(a + .3) * ts * .3); g.lineTo(cx + Math.cos(a - .3) * ts * .3, cy + Math.sin(a - .3) * ts * .3); g.fill(); } }
      else if (k === 'felho') { if (i >= 0) { for (let j = 0; j < 30; j++) { const ph = (t * 1.6 + j * .37) % 1, a = j * 2.4, r = ts * 5 * Math.sqrt((j * .618) % 1); g.strokeStyle = `rgba(175,225,255,${.7 * (1 - ph)})`; g.lineWidth = Math.max(1, ts * .025); const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r - ts * .6 + ph * ts * .6; g.beginPath(); g.moveTo(px, py); g.lineTo(px - ts * .03, py + ts * .15); g.stroke(); }
          g.fillStyle = 'rgba(0,10,20,.12)'; g.beginPath(); g.ellipse(cx, cy + ts * .2, ts * 1.6, ts * .5, 0, 0, 6.283); g.fill(); }
        g.fillStyle = 'rgba(235,242,250,.95)'; for (const [dx, dy, r] of [[-.25, -.25, .25], [.05, -.38, .3], [.3, -.22, .22], [0, -.15, .3]]) { g.beginPath(); g.arc(cx + dx * ts, cy + dy * ts, r * ts, 0, 6.283); g.fill(); } }
      else if (k === 'arany') { drops(g, cx, cy, ts * 2.4 * ef, i < 0 ? 6 : 22, t, i); if (i >= 0) for (let j = 0; j < 3; j++) { const ph = (t * .7 + j / 3) % 1, a = j * 2.1 + t * .3; g.fillStyle = `rgba(255,236,170,${1 - ph})`; g.beginPath(); g.arc(cx + Math.cos(a) * ts * 1.6 * ph, cy + Math.sin(a) * ts * 1.6 * ph, ts * .04, 0, 6.283); g.fill(); } }
      else drops(g, cx, cy, ts * 1.4 * ef, i < 0 ? 6 : k === 'turbo' ? 20 : 14, t, i);
    }
    else if (k === 'mikro') { g.fillStyle = '#1f2937'; g.beginPath(); g.arc(cx, cy, ts * .12, 0, 6.283); g.fill(); g.fillStyle = on ? '#6cc6ff' : '#6b7280'; g.beginPath(); g.arc(cx, cy, ts * .05, 0, 6.283); g.fill();
      if (on) for (let j = 0; j < 8; j++) { const k2 = (t * .9 + j / 8) % 1, a = j * .785; g.fillStyle = `rgba(210,240,255,${.6 * (1 - k2)})`; g.beginPath(); g.arc(cx + Math.cos(a) * ts * .5 * k2, cy + Math.sin(a) * ts * .5 * k2, ts * (.03 + .05 * k2), 0, 6.283); g.fill(); } }
    else if (k === 'drip') { g.fillStyle = '#1f2937'; g.beginPath(); g.arc(cx, cy, ts * .14, 0, 6.283); g.fill();
      if (on) for (let j = 0; j < 4; j++) { const k2 = (t * 1.3 + j * .25) % 1, [dx, dy] = D4[j]; g.fillStyle = `rgba(150,215,255,${1 - k2})`; g.beginPath(); g.arc(cx + dx * ts * .38 * k2, cy + dy * ts * .38 * k2, ts * .05, 0, 6.283); g.fill(); } }
  }
  function drawMob(g, o, t, ts) {
    const along = o.ax === 'x', [cw, rh] = size(), [px, py] = along ? posXY(o.st.p, o.rc) : posXY(o.cc, o.st.p), [ax, ay] = posXY(o.c, o.r), d = L.d;
    // tömlő a horgonyhoz
    g.strokeStyle = 'rgba(30,40,55,.8)'; g.lineWidth = Math.max(1.5, ts * .05); g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo((ax + px) / 2, (ay + py) / 2 + ts * .3, px, py); g.stroke();
    const vert = L.tr ? along : !along, len = ts * 2.6;
    g.save(); g.translate(px, py); if (vert) g.rotate(Math.PI / 2);
    // keret (tartó híd) a mozgásirányra merőlegesen
    shadow(g, ts * .06, ts * .08, ts * .3, len * .55, .22);
    g.strokeStyle = '#b8c4d0'; g.lineWidth = ts * .05; g.beginPath(); g.moveTo(0, -len / 2); g.lineTo(0, len / 2); g.stroke();
    for (let s2 = -len / 2; s2 < len / 2; s2 += ts * .3) { g.beginPath(); g.moveTo(-ts * .08, s2); g.lineTo(ts * .08, s2 + ts * .15); g.stroke(); }
    for (const e of [-1, 1]) { g.fillStyle = '#2b3442'; rr(-ts * .14, e * len / 2 - ts * .12, ts * .28, ts * .24, ts * .06); g.fill(); g.fillStyle = '#111'; g.fillRect(-ts * .18, e * len / 2 - ts * .1, ts * .06, ts * .2); g.fillRect(ts * .12, e * len / 2 - ts * .1, ts * .06, ts * .2); }
    g.fillStyle = '#e8b656'; rr(-ts * .14, -ts * .14, ts * .28, ts * .28, ts * .06); g.fill();
    for (let s2 = -len / 2 + ts * .2; s2 < len / 2; s2 += ts * .26) { const ph = (t * 2.4 + s2 * .07) % 1; g.fillStyle = `rgba(175,225,255,${.9 - ph * .8})`; g.beginPath(); g.arc((o.st.dir || 1) * ts * (.15 + ph * .35), s2, ts * .03, 0, 6.283); g.fill(); }
    g.restore();
  }
  function drawCB(g, cb, t, ts) {
    const [px, py] = posXY(cb.x - .5, cb.y - .5); let a = cb.a; if (L.tr) a = Math.PI / 2 - a;
    g.save(); g.translate(px, py); g.rotate(a);
    shadow(g, ts * .06, ts * .08, ts * .5, ts * .34, .3);
    g.fillStyle = '#1f1f1f'; for (const [wx, wy] of [[-.3, -.32], [-.3, .22], [.18, -.3], [.18, .22]]) rr(wx * ts, wy * ts, ts * .2, ts * .1, ts * .03), g.fill();
    const gr = g.createLinearGradient(0, -ts * .3, 0, ts * .3); gr.addColorStop(0, '#f2d15a'); gr.addColorStop(1, '#b9901c'); g.fillStyle = gr; rr(-ts * .4, -ts * .26, ts * .66, ts * .52, ts * .08); g.fill();
    g.fillStyle = '#2f7d32'; rr(-ts * .38, -ts * .24, ts * .14, ts * .48, ts * .04); g.fill();
    g.fillStyle = 'rgba(160,220,255,.85)'; rr(-ts * .02, -ts * .14, ts * .18, ts * .28, ts * .04); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(ts * .02, -ts * .1, ts * .04, ts * .18);
    g.fillStyle = '#8a7020'; rr(ts * .26, -ts * .44, ts * .14, ts * .88, ts * .04); g.fill();
    g.strokeStyle = '#3a2e0c'; g.lineWidth = Math.max(1, ts * .025); for (let j = 0; j < 5; j++) { const o = ((t * 3 + j / 5) % 1) * ts * .82 - ts * .41; g.beginPath(); g.moveTo(ts * .27, o); g.lineTo(ts * .39, o + ts * .04); g.stroke(); }
    g.fillStyle = '#444'; g.fillRect(-ts * .3, -ts * .32, ts * .06, ts * .12);
    g.restore();
  }

  // nagy (több mezős) modulok; ts itt a teljes elem mérete
  function drawBig(g, k0, i, x, y, ts, t, on) {
    const M0 = MOD[k0], k = M0.look || k0;
    const cx = x + ts / 2, cy = y + ts / 2;
    if (M0.hive) { const n = M0.sz * M0.sz; shadow(g, cx + ts * .04, cy + ts * .32, ts * .42, ts * .1, .25);
      for (let j = 0; j < Math.min(n, 9); j++) { const gx = x + ts * (.12 + (j % M0.sz) * (.76 / M0.sz)), gy = y + ts * (.12 + Math.floor(j / M0.sz) * (.76 / M0.sz)), w = ts * .76 / M0.sz * .86;
        const gr = g.createLinearGradient(gx, 0, gx + w, 0); gr.addColorStop(0, '#f5cd6a'); gr.addColorStop(1, '#c99434'); g.fillStyle = gr; g.beginPath(); g.ellipse(gx + w / 2, gy + w * .45, w * .45, w * .42, 0, Math.PI, 0); g.fill(); g.fillRect(gx + w * .05, gy + w * .45, w * .9, w * .45);
        g.fillStyle = '#8a5a1a'; for (let q = 0; q < 3; q++) g.fillRect(gx + w * .05, gy + w * (.32 + q * .16), w * .9, w * .03); g.fillStyle = '#3a2410'; g.beginPath(); g.arc(gx + w / 2, gy + w * .78, w * .07, 0, 6.283); g.fill(); }
      if (i >= 0) for (let j = 0; j < 4 + M0.sz * 3; j++) { const a = t * 2.4 + j * 1.3 + i, bx = cx + Math.cos(a) * ts * .6, by2 = cy + Math.sin(a * 1.4) * ts * .5; g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(bx, by2 - ts * .012, ts * .014, ts * .008, 0, 0, 6.283); g.fill(); g.fillStyle = '#ffd93b'; g.beginPath(); g.arc(bx, by2, ts * .012, 0, 6.283); g.fill(); }
      return; }
    shadow(g, cx + ts * .04, cy + ts * .32, ts * .4, ts * .1, .3);
    g.fillStyle = '#2b3442'; rr(x + ts * .04, y + ts * .04, ts * .92, ts * .92, ts * .1); g.fill(); g.fillStyle = '#3a4250'; rr(x + ts * .08, y + ts * .08, ts * .84, ts * .84, ts * .08); g.fill();
    if (k === 'mega' || k === 'ciklon') {
      const R = M0.r + S.up.kvantum, cyc = k === 'ciklon';
      if (on && i >= 0) { const tsz = ts / M0.sz, reach = (R + M0.sz / 2) * tsz * Math.min(1, NET.eff + .1);
        if (cyc) { for (let j = 0; j < 3; j++) { const a = t * 1.2 + j * 2.09; g.strokeStyle = `rgba(175,225,255,${.25 - j * .05})`; g.lineWidth = tsz * .5; g.beginPath(); g.arc(cx, cy, reach * (.45 + j * .2), a, a + 2.4); g.stroke(); } }
        drops(g, cx, cy, reach, cyc ? 60 : 36, t, i); }
      g.save(); g.translate(cx, cy); g.rotate(t * (on ? (cyc ? 3 : 1.6) : .2));
      for (let j = 0; j < (cyc ? 6 : 3); j++) { g.rotate(6.283 / (cyc ? 6 : 3)); const gr = g.createLinearGradient(0, 0, ts * .45, 0); gr.addColorStop(0, '#c3ced9'); gr.addColorStop(1, cyc ? 'rgba(108,198,255,.3)' : '#8a95a3'); g.fillStyle = gr;
        g.beginPath(); g.moveTo(0, -ts * .04); g.quadraticCurveTo(ts * .3, -ts * (cyc ? .16 : .06), ts * .44, 0); g.lineTo(0, ts * .04); g.fill(); }
      g.restore(); const hub = g.createRadialGradient(cx - ts * .03, cy - ts * .03, 1, cx, cy, ts * .14); hub.addColorStop(0, '#ffe29a'); hub.addColorStop(1, '#b27a22'); g.fillStyle = on ? hub : '#6b7280'; g.beginPath(); g.arc(cx, cy, ts * .13, 0, 6.283); g.fill(); return; }
    if (k === 'hidro' || k === 'csillagh' || k === 'genezis') {
      if (on && i >= 0) { const gl = g.createRadialGradient(cx, cy, ts * .2, cx, cy, ts * 2.2); gl.addColorStop(0, `rgba(120,255,160,${.18 + .06 * Math.sin(t * 2)})`); gl.addColorStop(1, 'rgba(120,255,160,0)'); g.fillStyle = gl; g.fillRect(x - ts * 1.5, y - ts * 1.5, ts * 4, ts * 4); }
      const gr = g.createLinearGradient(x, 0, x + ts, 0); gr.addColorStop(0, 'rgba(180,230,255,.35)'); gr.addColorStop(.5, 'rgba(240,250,255,.6)'); gr.addColorStop(1, 'rgba(160,210,240,.35)'); g.fillStyle = gr; rr(x + ts * .2, y + ts * .1, ts * .6, ts * .8, ts * .08); g.fill();
      for (let j = 0; j < 4; j++) { const yy = y + ts * (.2 + j * .18); g.fillStyle = '#e7eef4'; g.fillRect(x + ts * .22, yy + ts * .1, ts * .56, ts * .02); for (let q = 0; q < 4; q++) { g.fillStyle = q % 2 ? '#5cc062' : '#7ad06c'; g.beginPath(); g.arc(x + ts * (.3 + q * .135), yy + ts * .07, ts * .05, 0, 6.283); g.fill(); } }
      if (on) { const ph = (t * .5) % 1; g.fillStyle = 'rgba(108,198,255,.7)'; g.fillRect(x + ts * .74, y + ts * (.85 - ph * .7), ts * .03, ts * .08); } return; }
    if (k === 'csillkut' || k === 'flyuk' || k === 'idoforr') {
      const col = k === 'flyuk' ? ['#1a0f2e', '#6a3dff'] : k === 'idoforr' ? ['#3a2a0a', '#ffe29a'] : ['#0f2f63', '#9fe0ff'];
      g.save(); g.translate(cx, cy); for (let j = 0; j < 3; j++) { g.rotate(t * (on ? (k === 'flyuk' ? -1.5 : 1) : .1) * (j + 1) * .3); const gr = g.createRadialGradient(0, 0, 1, 0, 0, ts * (.42 - j * .1)); gr.addColorStop(0, col[1]); gr.addColorStop(1, col[0]); g.fillStyle = gr; g.beginPath();
        for (let q = 0; q < 6; q++) { const a = q / 6 * 6.283, a2 = a + .5; g.lineTo(Math.cos(a) * ts * (.42 - j * .1), Math.sin(a) * ts * (.42 - j * .1)); g.lineTo(Math.cos(a2) * ts * (.3 - j * .08), Math.sin(a2) * ts * (.3 - j * .08)); } g.fill(); } g.restore();
      if (on) for (let j = 0; j < 8; j++) { const ph = (t * .6 + j / 8) % 1, a = j * .785 + t * .4, r = ts * (k === 'flyuk' ? .6 * (1 - ph) : .15 + .45 * ph); g.fillStyle = `rgba(255,255,255,${.8 * (k === 'flyuk' ? ph : 1 - ph)})`; g.beginPath(); g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, ts * .015, 0, 6.283); g.fill(); }
      return; }
    if (k === 'galobel') { const a = .4 + .2 * Math.sin(t * 1.5), gl = g.createRadialGradient(cx, cy, 1, cx, cy, ts * 2.4); gl.addColorStop(0, `rgba(200,160,255,${a})`); gl.addColorStop(1, 'rgba(200,160,255,0)'); g.fillStyle = gl; g.fillRect(x - ts * 2, y - ts * 2, ts * 5, ts * 5);
      const gr = g.createLinearGradient(cx - ts * .2, 0, cx + ts * .2, 0); gr.addColorStop(0, '#2a1a4a'); gr.addColorStop(.5, '#8a6ad6'); gr.addColorStop(1, '#1a0f2e'); g.fillStyle = gr; g.beginPath(); g.moveTo(cx - ts * .2, y + ts * .92); g.lineTo(cx - ts * .12, y + ts * .14); g.lineTo(cx, y - ts * .04); g.lineTo(cx + ts * .12, y + ts * .14); g.lineTo(cx + ts * .2, y + ts * .92); g.fill();
      for (let j = 0; j < 4; j++) { g.fillStyle = `rgba(255,240,180,${.5 + .5 * Math.sin(t * 3 + j)})`; g.beginPath(); g.arc(cx, y + ts * (.3 + j * .15), ts * .025, 0, 6.283); g.fill(); } return; }
    if (k === 'nebula2' || k === 'vegtszor' || k === 'aurora' || k === 'esokir' || k === 'univont') { const R = M0.r + S.up.kvantum, tsz = ts / M0.sz;
      if (on && i >= 0) { const reach = (R + 1.5) * tsz * Math.min(1, NET.eff + .1); for (let j = 0; j < 4; j++) { const a = t * .5 + j * 1.57; g.strokeStyle = k === 'vegtszor' || k === 'univont' ? `rgba(255,226,154,${.18 - j * .03})` : k === 'aurora' ? `rgba(122,255,196,${.2 - j * .04})` : k === 'esokir' ? `rgba(108,198,255,${.2 - j * .04})` : `rgba(199,125,255,${.2 - j * .04})`; g.lineWidth = tsz * .6; g.beginPath(); g.arc(cx, cy, reach * (.3 + j * .18), a, a + 3); g.stroke(); } drops(g, cx, cy, reach, 70, t, i); }
      const gr = g.createRadialGradient(cx, cy, 1, cx, cy, ts * .4); gr.addColorStop(0, '#ffffff'); const oc = { vegtszor: ['#ffe29a', 'rgba(232,182,86,0)'], univont: ['#fff6c8', 'rgba(255,215,0,0)'], aurora: ['#7affc4', 'rgba(0,200,150,0)'], esokir: ['#6cc6ff', 'rgba(30,110,200,0)'] }[k] || ['#c77dff', 'rgba(106,61,255,0)']; gr.addColorStop(.4, oc[0]); gr.addColorStop(1, oc[1]); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, ts * .42, 0, 6.283); g.fill(); return; }
    if (k === 'tenger') {
      const gr = g.createLinearGradient(x, y, x, y + ts); gr.addColorStop(0, on ? '#4aa8f0' : '#4b5563'); gr.addColorStop(1, on ? '#0f3f70' : '#2b3442'); g.fillStyle = gr; rr(x + ts * .1, y + ts * .5, ts * .8, ts * .38, ts * .06); g.fill();
      if (on) { g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = Math.max(1, ts * .012); for (let j = 0; j < 3; j++) { g.beginPath(); for (let q = 0; q <= 20; q++) { const xx = x + ts * (.12 + q * .038), yy = y + ts * (.6 + j * .09) + Math.sin(t * 2 + q * .8 + j) * ts * .012; q ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); } }
      g.fillStyle = '#cfd8e2'; rr(x + ts * .18, y + ts * .14, ts * .3, ts * .36, ts * .04); g.fill(); rr(x + ts * .56, y + ts * .22, ts * .24, ts * .28, ts * .04); g.fill();
      g.fillStyle = '#8a95a3'; g.fillRect(x + ts * .26, y + ts * .04, ts * .06, ts * .14); g.fillRect(x + ts * .64, y + ts * .1, ts * .05, ts * .12);
      if (on) for (let j = 0; j < 2; j++) { const ph = (t * .4 + j * .5) % 1; g.fillStyle = `rgba(235,242,250,${.5 * (1 - ph)})`; g.beginPath(); g.arc(x + ts * (.29 + j * .37), y + ts * (.02 - ph * .15), ts * (.04 + ph * .06), 0, 6.283); g.fill(); } }
  }

  /* ===================== GALAXISOK (Stellaris-szerű réteg) ===================== */
  const MET = { vas: { n: 'vas', ic: '🔩' }, rez: { n: 'réz', ic: '🥉' }, tit: { n: 'titán', ic: '🔘' }, iri: { n: 'irídium', ic: '💠' }, neu: { n: 'neutrónium', ic: '⚫' } };
  const PCLS = { szikla: { n: 'Sziklás', ic: '🪨', al: ['banya'], met: 'vas', col: '#8d7a6a' }, vulk: { n: 'Vulkanikus', ic: '🌋', al: ['banya', 'ener'], met: 'rez', col: '#d9532f' },
    jeg: { n: 'Jeges', ic: '🧊', al: ['aqua'], met: 'tit', col: '#bfe3f5' }, ocean: { n: 'Óceán', ic: '🌊', al: ['aqua', 'agri'], met: 'tit', col: '#2f7fd0' },
    kert: { n: 'Kertvilág', ic: '🌳', al: ['agri'], met: 'vas', col: '#3f9d3a' }, gaz: { n: 'Gázóriás', ic: '🪐', al: ['ener'], met: 'tit', col: '#d9a35f' },
    krist: { n: 'Kristály', ic: '💎', al: ['banya', 'cp'], met: 'iri', col: '#9fe0ff' }, virag: { n: 'Virágzó', ic: '🌸', al: ['meh', 'agri'], met: 'vas', col: '#ff9ec7' },
    deg: { n: 'Degenerált', ic: '⚫', al: ['banya', 'ener'], met: 'neu', col: '#455a64' }, por: { n: 'Porfelhős', ic: '✨', al: ['cp'], met: 'iri', col: '#c084fc' } };
  const DES = { agri: { n: 'Agri', ic: '🌾', d: 'Csak pénzt termel. Vizet és energiát fogyaszt.' }, aqua: { n: 'Aqua', ic: '💧', d: 'Vizet ad a galaxisnak.' },
    ener: { n: 'Energia', ic: '⚡', d: 'Energiát ad a galaxisnak.' }, banya: { n: 'Bánya', ic: '⛏️', d: 'A bolygó fémét bányássza. Energiát fogyaszt.' },
    meh: { n: 'Méhvilág', ic: '🐝', d: 'Nektárt termel. Vizet fogyaszt.' }, cp: { n: 'Porgyűjtő', ic: '✨', d: 'Csillagport gyűjt. Energiát fogyaszt.' } };
  const STY = { sarga: { n: 'Sárga csillag', col: '#ffe066', e: 1.5 }, voros: { n: 'Vörös törpe', col: '#ff7a5a', e: 1 }, kek: { n: 'Kék óriás', col: '#8ec5ff', e: 3 },
    feher: { n: 'Fehér törpe', col: '#f0f4ff', e: .6 }, neutron: { n: 'Neutroncsillag', col: '#c8b8ff', e: 4 }, flyuk: { n: 'Fekete lyuk', col: '#7a4dff', e: 8 } };
  const WON = { glocs: { n: 'Galaktikus Locsolófej', ic: '🏆', c: 1e90, mt: { neu: 5e4, iri: 2e5 }, d: '×3 minden galaxis-termelés.' },
    hiper: { n: 'Hipertér-csőhálózat', ic: '🌐', c: 1e85, mt: { tit: 2e5, rez: 5e5 }, d: '+100% víz minden galaxisban.' },
    koho: { n: 'Csillagkohó', ic: '🔥', c: 1e86, mt: { vas: 1e6, iri: 5e4 }, d: '×2 fémtermelés (bolygók és fém-növények).' },
    dysraj: { n: 'Dyson-raj', ic: '🛰️', c: 1e88, mt: { neu: 2e4, tit: 5e5 }, d: '×2 energia minden Dyson-gömbből.' },
    ido: { n: 'Időtorzító', ic: '⌛', c: 1e95, mt: { neu: 3e5, iri: 1e6 }, d: '×5 Agri-termelés, de minden bolygó +50% vizet és energiát kér.' } };
  const GUP = { gviz: { n: 'Víztisztító flotta', ic: '🚿', d: '+40% víz a galaxisokban', c: n => pw(1e76, 40, n), mt: n => ({ rez: pw(200, 2.5, n) }) },
    gen: { n: 'Fúziós hálózat', ic: '⚛️', d: '+40% energia a galaxisokban', c: n => pw(1e76, 40, n), mt: n => ({ tit: pw(200, 2.5, n) }) },
    gagri: { n: 'Galaktikus piac', ic: '📈', d: '×1,5 Agri-termelés', c: n => pw(1e77, 60, n), mt: n => ({ vas: pw(400, 2.6, n) }) },
    gbanya: { n: 'Mélyfúró flotta', ic: '⛏️', d: '+50% bánya-termelés', c: n => pw(1e77, 50, n), mt: n => ({ vas: pw(300, 2.5, n), rez: pw(150, 2.5, n) }) },
    gkol: { n: 'Gyarmatosító flotta', ic: '🚀', d: '−8% gyarmatosítási ár (legfeljebb 10 szint)', max: 10, c: n => pw(1e78, 80, n), mt: n => ({ iri: pw(50, 3, n) }) } };
  const metMul = () => (S.gx && S.gx.won.koho ? 2 : 1);
  const SYL = ['Ar', 'Bel', 'Cor', 'Dra', 'Eld', 'Fen', 'Gal', 'Hyd', 'Ix', 'Jor', 'Kel', 'Lum', 'Mor', 'Nex', 'Or', 'Pyr', 'Qua', 'Rho', 'Syl', 'Tor', 'Ul', 'Vex', 'Wyr', 'Xan', 'Yl', 'Zet'];
  const SYL2 = ['a', 'on', 'is', 'ux', 'ara', 'eon', 'ia', 'or', 'ys', 'um', 'eth', 'ion'];
  const GNAMES = ['Tejút-peremvidék', 'Androméda-kar', 'Örvény-galaxis', 'Napraforgó-galaxis', 'Sombrero-galaxis', 'Kocsikerék-galaxis', 'Szivar-galaxis', 'Fekete Szem', 'Bodé-galaxis', 'A Végtelen Kert'];
  const ROM = ['I', 'II', 'III', 'IV', 'V'];
  function genGal(gi) {
    let sd = 12345 + gi * 7919; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647, stars = [], n = 10 + Math.min(6, gi * 2);
    const types = Object.keys(STY), cls = Object.keys(PCLS);
    for (let j = 0; j < n; j++) { const arm = j % 2, f = (j / n) * .85 + .1, a = arm * Math.PI + f * 4.2 + (R() - .5) * .5, r = .08 + f * .38;
      const ty = j === 0 ? 'sarga' : types[Math.floor(R() * types.length)], name = SYL[Math.floor(R() * SYL.length)] + SYL2[Math.floor(R() * SYL2.length)];
      const np = ty === 'flyuk' ? 1 : 2 + Math.floor(R() * 3), pl = [];
      for (let q = 0; q < np; q++) { let c = cls[Math.floor(R() * cls.length)]; if (ty === 'neutron' && R() < .6) c = 'deg'; if (j === 0 && q === 0) c = 'kert'; pl.push({ c, own: 0, des: PCLS[c].al[0], lvl: 0 }); }
      stars.push({ name, x: .5 + Math.cos(a) * r * 1.25, y: .5 + Math.sin(a) * r, ty, dy: 0, pl }); }
    stars[0].pl[0].own = 1; stars[0].pl[0].des = 'agri';
    return { name: GNAMES[gi % GNAMES.length] + (gi >= GNAMES.length ? ' ' + (Math.floor(gi / GNAMES.length) + 1) : ''), stars };
  }
  const galCost = gi => ({ c: pw(1e75, 1e15, gi), ck: pw(1e8, 100, gi), cc: pw(1e7, 100, gi), mt: gi ? { neu: pw(2e3, 20, gi), iri: pw(1e4, 20, gi) } : { vas: B(300), rez: B(100) } });
  const gmul = gi => B(1e6).pow(gi);
  const ownedN = gal => gal.stars.reduce((a, st) => a + st.pl.filter(p => p.own).length, 0);
  const colCost = (gi, gal) => { const n = ownedN(gal), f = B(1e15).pow(gi).mul(1 - .08 * (S.gx.up.gkol || 0)); return { c: pw(1e74, 3, n).mul(f), mt: { vas: pw(50, 2, n).mul((1 + gi) ** 3) } }; };
  const DMT = { agri: 'vas', aqua: 'rez', ener: 'tit', banya: 'rez', meh: 'vas', cp: 'iri' };
  const lvlCost = (gi, p) => ({ c: pw(1e74, 2.6, p.lvl).mul(B(1e15).pow(gi)), mt: { [DMT[p.des] || 'vas']: pw(40, 2.2, p.lvl).mul((1 + gi) ** 3) } });
  const dyCost = (gi, st) => ({ c: pw(1e78, 30, st.dy).mul(B(1e15).pow(gi)), mt: { neu: pw(20, 3, st.dy).mul((1 + gi) ** 3), iri: pw(100, 2.5, st.dy).mul((1 + gi) ** 3) } });
  const canPay = o => S.money.gte(o.c || 0) && S.nek.gte(o.ck || 0) && S.cp.gte(o.cc || 0) && Object.entries(o.mt || {}).every(([k, v]) => S.met[k].gte(v));
  const pay = o => { S.money = S.money.sub(o.c || 0); S.nek = S.nek.sub(o.ck || 0); S.cp = S.cp.sub(o.cc || 0); for (const [k, v] of Object.entries(o.mt || {})) S.met[k] = S.met[k].sub(v); };
  const costTxt = o => [o.c && B(o.c).gt(0) ? fmt(o.c) + ' Ft' : '', o.ck && B(o.ck).gt(0) ? nfmt(o.ck) + ' 🍯' : '', o.cc && B(o.cc).gt(0) ? nfmt(o.cc) + ' ✨' : '', ...Object.entries(o.mt || {}).map(([k, v]) => nfmt(v) + ' ' + MET[k].ic)].filter(Boolean).join(' + ');
  // galaxis-termelés másodpercenként (minden galaxisra külön víz- és energiakerettel)
  // egy bolygó termelése másodpercenként: [erőforrás, mennyiség] (a galaxis víz/energia-hatásfokával)
  function pOut(gi, st, p, eff) {
    const W = S.gx.won, U = S.gx.up, L1 = B(1.6).pow(p.lvl), k = L1.mul(eff * (W.glocs ? 3 : 1)), GM = gmul(gi);
    if (p.des === 'agri') return ['ft', GM.mul(k).mul(1e70 * (W.ido ? 5 : 1)).mul(B(1.5).pow(U.gagri || 0))];
    if (p.des === 'aqua') return ['viz', L1.mul(300 * (1 + .4 * (U.gviz || 0)) * (W.hiper ? 2 : 1))];
    if (p.des === 'ener') return ['en', L1.mul(250 * STY[st.ty].e * (1 + .4 * (U.gen || 0)))];
    if (p.des === 'banya') return [PCLS[p.c].met, k.mul(2 * (1 + gi) ** 2 * (1 + .5 * (U.gbanya || 0)) * metMul())];
    if (p.des === 'meh') return ['nek', GM.sqrt().mul(k).mul(1e6)];
    if (p.des === 'cp') return ['cp', GM.sqrt().mul(k).mul(1e5)];
    return ['', ZERO];
  }
  const RES = { ft: ['💰', 'Ft'], viz: ['💧', 'víz'], en: ['⚡', 'energia'], nek: ['🍯', 'nektár'], cp: ['✨', 'csillagpor'] };
  const resIc = r => RES[r] ? RES[r][0] : MET[r] ? MET[r].ic : '', resN = r => RES[r] ? RES[r][1] : MET[r] ? MET[r].n : '';
  const outTxt = o => resIc(o[0]) + ' +' + (o[0] === 'ft' ? fmt(o[1]) + ' Ft' : nfmt(o[1])) + '/mp'; // o[1] lehet nagy szám
  function gnet() {
    const r = { ft: ZERO, nek: ZERO, cp: ZERO, met: { vas: ZERO, rez: ZERO, tit: ZERO, iri: ZERO, neu: ZERO }, gal: [], pl: {} }; if (!S.gx) return r;
    const W = S.gx.won, U = S.gx.up, tw = W.ido ? 1.5 : 1;
    S.gx.gals.forEach((gal, gi) => {
      let wc = B(100), ec = B(100), wd = ZERO, ed = ZERO;
      for (const st of gal.stars) { if (st.dy) ec = ec.add(B(2).pow(st.dy).mul(5000 * STY[st.ty].e * (W.dysraj ? 2 : 1) * (1 + .4 * (U.gen || 0))));
        for (const p of st.pl) { if (!p.own || !p.des) continue; const L1 = B(1.6).pow(p.lvl).mul(tw);
          if (p.des === 'aqua') wc = wc.add(pOut(gi, st, p, 1)[1]); else if (p.des === 'ener') ec = ec.add(pOut(gi, st, p, 1)[1]);
          else if (p.des === 'agri') { wd = wd.add(L1.mul(60)); ed = ed.add(L1.mul(40)); } else if (p.des === 'banya') ed = ed.add(L1.mul(80)); else if (p.des === 'meh') wd = wd.add(L1.mul(50)); else if (p.des === 'cp') ed = ed.add(L1.mul(70)); } }
      const eff = Math.min(1, wd.gt(0) ? wc.div(wd).toNumber() : 1, ed.gt(0) ? ec.div(ed).toNumber() : 1);
      gal.stars.forEach((st, si) => st.pl.forEach((p, pi) => { if (!p.own || !p.des) return; const o = pOut(gi, st, p, eff); r.pl[gi + '|' + si + '|' + pi] = o;
        if (o[0] === 'ft') r.ft = r.ft.add(o[1]); else if (o[0] === 'nek') r.nek = r.nek.add(o[1]); else if (o[0] === 'cp') r.cp = r.cp.add(o[1]); else if (MET[o[0]]) r.met[o[0]] = r.met[o[0]].add(o[1]); }));
      r.gal.push({ wc, ec, wd, ed, eff }); });
    return r;
  }

  const galView = () => S.gx && S.gv && S.gx.gals.length;
  const curGal = () => S.gx.gals[S.gx.cur];
  function galItems() {
    const gal = curGal(), gi = S.gx.cur;
    if (S.tab === 'gsys') { const st = gal.stars[S.gx.sel] || gal.stars[0];
      return [{ k: 'dy', kind: 'dyson', n: 'Dyson-gömb ' + st.dy, ic: '🌞', cost: dyCost(gi, st) },
        ...st.pl.map((p, j) => { const P = PCLS[p.c], o = GR.pl[gi + '|' + S.gx.sel + '|' + j];
          return { k: 'p' + j, kind: 'planet', j, n: st.name + ' ' + ROM[j] + ' · ' + (p.own ? DES[p.des].n + ' ' + p.lvl : P.al.map(a => a === 'banya' ? MET[P.met].ic : DES[a].ic).join('')), ic: p.own ? DES[p.des].ic : P.ic,
            cost: p.own ? undefined : colCost(gi, gal), prod: p.own, lbl: p.own ? (o ? outTxt(o) : '…') : null }; })]; }
    const n = S.gx.gals.length;
    return [...S.gx.gals.map((g2, j) => ({ k: 'g' + j, kind: 'galaxy', j, n: g2.name, ic: '🌌', lbl: j === S.gx.cur ? 'Itt vagy' : 'Átváltás' })),
      { k: 'gnew', kind: 'galaxy', j: n, n: 'Új galaxis', ic: '✨', cost: galCost(n) },
      ...Object.keys(GUP).map(k => { const u = GUP[k], lv = S.gx.up[k] || 0, mx = lv >= (u.max || Infinity); return { k, kind: 'gup', n: u.n + ' ' + lv, ic: u.ic, cost: mx ? null : { c: u.c(lv), mt: u.mt(lv) }, lbl: mx ? 'MAX' : null }; }),
      ...Object.keys(WON).map(k => { const w = WON[k]; return { k, kind: 'wonder', n: w.n, ic: w.ic, cost: S.gx.won[k] ? null : { c: w.c, mt: w.mt }, lbl: S.gx.won[k] ? 'MEGÉPÜLT' : null, have: !!S.gx.won[k] }; })];
  }
  function galDesc(it) {
    const gal = curGal(), st = gal.stars[S.gx.sel] || gal.stars[0];
    if (it.kind === 'dyson') return 'A ' + STY[st.ty].n.toLowerCase() + ' köré épülő Dyson-gömb rengeteg energiát ad (×' + STY[st.ty].e + ' a csillag típusa miatt). Következő szint: ' + costTxt(it.cost) + '.';
    if (it.kind === 'planet') { const p = st.pl[it.j], P = PCLS[p.c];
      const can = P.al.map(a => a === 'banya' ? 'Bánya (' + MET[P.met].ic + ' ' + MET[P.met].n + ')' : DES[a].n + ' (' + DES[a].ic + ')').join(' vagy ');
      if (!p.own) return P.n + ' bolygó. Ezt termelheti: ' + can + '. Gyarmatosítás: ' + costTxt(it.cost) + '.';
      const o = GR.pl[S.gx.cur + '|' + S.gx.sel + '|' + it.j]; return P.n + ' · ' + DES[p.des].n + ' ' + p.lvl + '. szint: ' + (o ? outTxt(o) : '–') + ', folyamatosan. ' + (P.al.length > 1 ? 'Választható: ' + can + '. ' : '') + 'Koppints a fejlesztéshez (' + costTxt(lvlCost(S.gx.cur, p)) + ').'; }
    if (it.kind === 'galaxy') return it.cost ? 'Egy teljes új galaxis, több csillaggal, milliószoros termeléssel. Ára: ' + costTxt(it.cost) + '.' : 'Átváltás erre a galaxisra.';
    if (it.kind === 'gup') return GUP[it.k].d + '. ' + (it.cost ? 'Ára: ' + costTxt(it.cost) + '.' : '');
    if (it.kind === 'wonder') return WON[it.k].d + ' ' + (it.cost ? 'Ára: ' + costTxt(it.cost) + '.' : 'Megépült.');
    return '';
  }
  function galBuy(G, it) {
    S.info = { it, l: 5 }; const gal = curGal(), gi = S.gx.cur, st = gal.stars[S.gx.sel] || gal.stars[0];
    const no = () => Sfx.blip(140, .1, 'square', .05), yes = () => { Sfx.perfect(); GR = gnet(); save(); };
    if (it.kind === 'planet') { const p = st.pl[it.j]; if (!p.own) { if (!canPay(it.cost)) return no(); pay(it.cost); p.own = 1; if (!PCLS[p.c].al.includes(p.des)) p.des = PCLS[p.c].al[0]; return yes(); } S.gx.pick = { j: it.j }; return Sfx.blip(700, .04, 'sine', .05); }
    if (it.kind === 'dyson') { if (!canPay(it.cost)) return no(); pay(it.cost); st.dy++; return yes(); }
    if (it.kind === 'galaxy') { if (it.j < S.gx.gals.length) { S.gx.cur = it.j; S.gx.sel = 0; return Sfx.blip(600, .04, 'sine', .05); } if (!canPay(it.cost)) return no(); pay(it.cost); S.gx.gals.push(genGal(it.j)); S.gx.cur = it.j; S.gx.sel = 0; return yes(); }
    if (it.kind === 'gup') { if (!it.cost || !canPay(it.cost)) return no(); pay(it.cost); S.gx.up[it.k] = (S.gx.up[it.k] || 0) + 1; return yes(); }
    if (it.kind === 'wonder') { if (!it.cost || !canPay(it.cost)) return no(); pay(it.cost); S.gx.won[it.k] = 1; return yes(); }
  }
  // kijelölés-választó egy bolygóhoz
  const pickRect = G => { const w = Math.min(G.W - 24 * L.d, 420 * L.d), h = 250 * L.d; return { x: (G.W - w) / 2, y: Math.max(L.fy, (L.barY - h) / 2), w, h }; };
  const pickBtns = G => { const R0 = pickRect(G), d = L.d, st0 = curGal().stars[S.gx.sel], p0 = S.gx.pick ? st0.pl[S.gx.pick.j] : null, ks = p0 ? PCLS[p0.c].al : [], bw = (R0.w - 24 * d - 6 * d * (ks.length - 1)) / Math.max(1, ks.length), out = ks.map((k, j) => ({ k, x: R0.x + 12 * d + j * (bw + 6 * d), y: R0.y + 84 * d, w: bw, h: 70 * d }));
    out.push({ k: 'up', x: R0.x + 12 * d, y: R0.y + R0.h - 62 * d, w: R0.w - 24 * d, h: 50 * d }); out.push({ k: 'x', x: R0.x + R0.w - 40 * d, y: R0.y + 8 * d, w: 32 * d, h: 32 * d }); return out; };
  function galDown(G, x, y) {
    const hit = o => x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h, gal = curGal(), gi = S.gx.cur, st = gal.stars[S.gx.sel] || gal.stars[0];
    if (S.gx.pick) { const b = pickBtns(G).find(hit), p = st.pl[S.gx.pick.j]; if (!b) { if (!hit(pickRect(G))) S.gx.pick = null; return true; }
      if (b.k === 'x') { S.gx.pick = null; return true; }
      if (b.k === 'up') { if (!p.des) return true; const c = lvlCost(gi, p); if (!canPay(c)) { Sfx.blip(140, .1, 'square', .05); return true; } pay(c); p.lvl++; Sfx.perfect(); GR = gnet(); save(); return true; }
      if (p.des !== b.k) { p.des = b.k; Sfx.blip(600, .05, 'sine', .05); GR = gnet(); save(); } return true; }
    if (y >= L.barY) return false;
    let best = -1, bd = 40 * L.d; gal.stars.forEach((s2, j) => { const [sx, sy] = starXY(G, s2), dd = Math.hypot(sx - x, sy - y); if (dd < bd) { bd = dd; best = j; } });
    if (best >= 0) { S.gx.sel = best; S.tab = 'gsys'; S.pg = {}; Sfx.blip(650, .03, 'sine', .04); }
    return true;
  }
  const starXY = (G, st) => { const m = Math.min(L.fw, L.fh * 1.6); return [L.fx + L.fw / 2 + (st.x - .5) * m, L.fy + L.fh / 2 + (st.y - .5) * m / 1.6 * 1.25]; };
  const GALC = { key: '', cv: null };
  function drawGal(g, G, t) {
    const d = L.d, gal = curGal(), gi = S.gx.cur, gs = GR.gal[gi] || {};
    // spirálkarok előre rajzolva
    const key = gi + '|' + G.W + 'x' + G.H; if (GALC.key !== key) { GALC.key = key; const cv = GALC.cv = GALC.cv || document.createElement('canvas'); cv.width = G.W; cv.height = G.H; const x = cv.getContext('2d');
      let sd = 99 + gi * 31; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647, m = Math.min(L.fw, L.fh * 1.6), cx = L.fx + L.fw / 2, cy = L.fy + L.fh / 2;
      const core = x.createRadialGradient(cx, cy, 1, cx, cy, m * .22); core.addColorStop(0, 'rgba(255,240,210,.55)'); core.addColorStop(1, 'rgba(255,200,150,0)'); x.fillStyle = core; x.fillRect(0, 0, G.W, G.H);
      for (let j = 0; j < 2600; j++) { const arm = j % 2, f = R(), a = arm * Math.PI + f * 4.2 + (R() - .5) * (.9 - f * .4), r = .03 + f * .44 + (R() - .5) * .05;
        x.fillStyle = `rgba(${200 + R() * 55},${190 + R() * 50},${230 + R() * 25},${.08 + R() * .35 * (1 - f * .6)})`; const px = cx + Math.cos(a) * r * m * 1.25 * .5 * 2 * .5 * 2, py = cy + Math.sin(a) * r * m / 1.6 * 1.25;
        x.fillRect(cx + Math.cos(a) * r * m * 1.25, py, d * (R() < .1 ? 2 : 1), d * (R() < .1 ? 2 : 1)); } }
    g.drawImage(GALC.cv, 0, 0);
    gal.stars.forEach((st, j) => { const [x, y] = starXY(G, st), S0 = STY[st.ty], sel = j === S.gx.sel, own = st.pl.filter(p => p.own).length, rad = (st.ty === 'kek' ? 7 : st.ty === 'voros' || st.ty === 'feher' ? 4 : 5.5) * d;
      const gl = g.createRadialGradient(x, y, 1, x, y, rad * 4); gl.addColorStop(0, S0.col); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = .55; g.fillStyle = gl; g.fillRect(x - rad * 4, y - rad * 4, rad * 8, rad * 8); g.globalAlpha = 1;
      if (st.ty === 'flyuk') { g.fillStyle = '#000'; g.beginPath(); g.arc(x, y, rad * 1.1, 0, 6.283); g.fill(); g.strokeStyle = '#b388ff'; g.lineWidth = 2 * d; g.beginPath(); g.ellipse(x, y, rad * 2.2, rad * .7, t * .3, 0, 6.283); g.stroke(); }
      else { g.fillStyle = S0.col; g.beginPath(); g.arc(x, y, rad, 0, 6.283); g.fill(); }
      if (st.dy) { g.strokeStyle = `rgba(255,226,154,${.5 + .3 * Math.sin(t * 2 + j)})`; g.lineWidth = 1.5 * d; for (let q = 0; q < Math.min(6, st.dy + 1); q++) { g.beginPath(); g.arc(x, y, rad * (1.8 + q * .35), t * (q % 2 ? .6 : -.4) + q, t * (q % 2 ? .6 : -.4) + q + 4.2); g.stroke(); } }
      if (own) { g.fillStyle = '#7ad06c'; g.beginPath(); g.arc(x + rad * 1.6, y - rad * 1.6, 3 * d, 0, 6.283); g.fill(); }
      if (sel) { g.strokeStyle = '#ffe29a'; g.lineWidth = 1.5 * d; g.setLineDash([4 * d, 4 * d]); g.beginPath(); g.arc(x, y, rad * 3.2, 0, 6.283); g.stroke(); g.setLineDash([]);
        st.pl.forEach((p, q) => { const a = t * (.5 - q * .08) + q * 1.7, rr2 = rad * (4.2 + q * 1.3); g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = d; g.beginPath(); g.arc(x, y, rr2, 0, 6.283); g.stroke();
          g.fillStyle = PCLS[p.c].col; g.beginPath(); g.arc(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2, 3.5 * d, 0, 6.283); g.fill(); if (p.own) { g.strokeStyle = '#ffe29a'; g.lineWidth = 1.2 * d; g.stroke(); } });
        g.textAlign = 'left'; g.font = `600 ${10 * d}px Inter, sans-serif`; st.pl.forEach((p, q) => { const o = GR.pl[gi + '|' + j + '|' + q], ly = y - (st.pl.length - 1) * 7 * d + q * 14 * d; g.fillStyle = p.own ? '#ffe29a' : 'rgba(255,255,255,.5)'; g.fillText(ROM[q] + ' ' + (p.own ? outTxt(o || ['', 0]) : PCLS[p.c].al.map(a2 => a2 === 'banya' ? MET[PCLS[p.c].met].ic : DES[a2].ic).join('') + ' ' + PCLS[p.c].n), x + rad * 9, ly); }); g.textAlign = 'center'; }
      g.font = `${sel ? 800 : 600} ${(sel ? 12 : 10) * d}px Inter, sans-serif`; g.textAlign = 'center'; g.fillStyle = sel ? '#ffe29a' : 'rgba(255,255,255,.65)'; g.fillText(st.name, x, y + rad + 13 * d); });
    // galaxis-állapot
    g.font = `600 ${11 * d}px Inter, sans-serif`; g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,.75)';
    const st = gal.stars[S.gx.sel] || gal.stars[0]; g.fillText('🌌 ' + gal.name + ' · ' + st.name + ' (' + STY[st.ty].n + ')', L.fx + 4 * d, L.fy + 50 * d);
    g.fillStyle = B(gs.wd || 0).gt(gs.wc || 0) ? '#ff8a7a' : '#9fd6f5'; g.fillText('💧 ' + nfmt(gs.wd || 0) + ' / ' + nfmt(gs.wc || 0), L.fx + 4 * d, L.fy + 66 * d);
    g.fillStyle = B(gs.ed || 0).gt(gs.ec || 0) ? '#ff8a7a' : '#ffe066'; g.fillText('⚡ ' + nfmt(gs.ed || 0) + ' / ' + nfmt(gs.ec || 0), L.fx + 4 * d, L.fy + 82 * d);
    g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText('Hatásfok: ' + Math.round((gs.eff == null ? 1 : gs.eff) * 100) + '%', L.fx + 4 * d, L.fy + 98 * d);
    // kijelölés-választó
    if (S.gx.pick) { const R0 = pickRect(G), p = st.pl[S.gx.pick.j], P = PCLS[p.c]; g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, 0, G.W, L.barY);
      g.fillStyle = 'rgba(8,12,22,.97)'; g.strokeStyle = '#e8b656'; g.lineWidth = 1.5 * d; rr(R0.x, R0.y, R0.w, R0.h, 14 * d); g.fill(); g.stroke();
      g.textAlign = 'left'; g.fillStyle = '#ffe29a'; g.font = `800 ${15 * d}px Inter, sans-serif`; g.fillText(P.ic + ' ' + st.name + ' ' + ROM[S.gx.pick.j] + ' · ' + P.n, R0.x + 14 * d, R0.y + 26 * d);
      { const o = GR.pl[gi + '|' + S.gx.sel + '|' + S.gx.pick.j]; g.font = `600 ${12 * d}px Inter, sans-serif`; g.fillStyle = 'rgba(255,255,255,.8)'; g.fillText('Termel: ' + (o ? outTxt(o) : '–') + (PCLS[p.c].al.length > 1 ? ' · válthat:' : ''), R0.x + 14 * d, R0.y + 52 * d, R0.w - 28 * d); }
      for (const b of pickBtns(G)) { if (b.k === 'x') { g.fillStyle = 'rgba(255,255,255,.7)'; g.font = `700 ${16 * d}px Inter, sans-serif`; g.textAlign = 'center'; g.fillText('✕', b.x + b.w / 2, b.y + b.h / 2); continue; }
        if (b.k === 'up') { const c = p.des ? lvlCost(gi, p) : null, ok = c && canPay(c); g.fillStyle = ok ? 'rgba(232,182,86,.9)' : 'rgba(255,255,255,.08)'; rr(b.x, b.y, b.w, b.h, 10 * d); g.fill(); g.textAlign = 'center'; g.fillStyle = ok ? '#1a1004' : 'rgba(255,255,255,.6)';
          g.font = `800 ${12 * d}px Inter, sans-serif`; g.fillText(p.des ? 'Fejlesztés → ' + (p.lvl + 1) + '. szint' : 'Előbb válassz kijelölést', b.x + b.w / 2, b.y + 18 * d, b.w - 16 * d); if (c) { g.font = `600 ${11 * d}px Inter, sans-serif`; g.fillText(costTxt(c), b.x + b.w / 2, b.y + 36 * d, b.w - 16 * d); } continue; }
        const D = DES[b.k], on = p.des === b.k, fit = false; g.fillStyle = on ? 'rgba(232,182,86,.28)' : 'rgba(255,255,255,.05)'; g.strokeStyle = on ? '#e8b656' : fit ? 'rgba(122,208,108,.8)' : 'rgba(255,255,255,.12)'; rr(b.x, b.y, b.w, b.h, 10 * d); g.fill(); g.stroke();
        g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `${16 * d}px sans-serif`; g.fillText(D.ic, b.x + b.w / 2, b.y + 18 * d); g.font = `700 ${11 * d}px Inter, sans-serif`; g.fillText(D.n + (b.k === 'banya' ? ': ' + MET[P.met].ic + ' ' + MET[P.met].n : ''), b.x + b.w / 2, b.y + 40 * d, b.w - 8 * d);
        { const o = pOut(gi, st, { ...p, des: b.k }, (GR.gal[gi] || {}).eff == null ? 1 : GR.gal[gi].eff); g.font = `600 ${10 * d}px Inter, sans-serif`; g.fillStyle = on ? '#ffe29a' : 'rgba(255,255,255,.6)'; g.fillText((on ? 'most: ' : '') + outTxt(o), b.x + b.w / 2, b.y + 58 * d, b.w - 8 * d); } }
      g.textAlign = 'center'; }
  }
  function drawDrone(g, u, t, ts) {
    const [px, py] = posXY(u.x - .5, u.y - .5), hz = ts * (.55 + .06 * Math.sin(t * 3 + u.run));
    shadow(g, px + ts * .2, py + ts * .25, ts * .3, ts * .14, .22);
    g.save(); g.translate(px, py - hz); g.rotate(Math.sin(t * 2 + u.run) * .08);
    g.strokeStyle = '#2b3442'; g.lineWidth = ts * .06; g.beginPath(); g.moveTo(-ts * .3, -ts * .3); g.lineTo(ts * .3, ts * .3); g.moveTo(ts * .3, -ts * .3); g.lineTo(-ts * .3, ts * .3); g.stroke();
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.fillStyle = 'rgba(200,220,240,.35)'; g.beginPath(); g.ellipse(a * ts * .3, b * ts * .3, ts * .2, ts * .2 * Math.abs(Math.sin(t * 40 + a + b)) + ts * .04, 0, 0, 6.283); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(a * ts * .3, b * ts * .3, ts * .04, 0, 6.283); g.fill(); }
    const gr = g.createLinearGradient(0, -ts * .15, 0, ts * .15); gr.addColorStop(0, '#ffe29a'); gr.addColorStop(1, '#c9902c'); g.fillStyle = gr; rr(-ts * .16, -ts * .13, ts * .32, ts * .26, ts * .07); g.fill();
    g.fillStyle = (t * 2 % 1) < .5 ? '#ff5d5d' : '#6cc6ff'; g.beginPath(); g.arc(0, ts * .08, ts * .03, 0, 6.283); g.fill(); g.fillStyle = '#123'; g.beginPath(); g.arc(0, -ts * .02, ts * .05, 0, 6.283); g.fill();
    g.restore();
  }

  if (typeof window !== 'undefined') window.__bir = () => ({ S, items, buy, place, harvest, net, rebirth, save, val, price, speed, costOf, canPay, genGal, gnet, galBuy, galItems }); // teszt
  return {
    sfmt: n => (S && n >= 1e300 ? sci(S.life) : sci(n)), fmt: n => sci(n),
    id: 'birodalom', name: 'ÖNTÖZŐ BIRODALOM', lives: 0, quit: false, idle: true, unit: ' FT', lb: 'Ft', sponsor: 'A Zerosites támogatásával',
    desc: 'Vegyél modulokat, építs csőhálózatot, ültess kertet és ültetvényt – a víz hozza a termést, a termés a pénzt. A kerted akkor is dolgozik, amikor nem vagy itt.',
    how: 'VÁLASSZ ESZKÖZT · ÉRINTSD A MEZŐT · ARATÁS: ÉRETT NÖVÉNYRE KOPPINTS · GÖRGETÉS: HÚZÁS ESZKÖZ NÉLKÜL, NAGYÍTÁS: GÖRGŐ / CSÍPÉS',
    ranks: [[0, 'Palántanevelő'], [1000, 'Kiskertész'], [50000, 'Kertész'], [1e6, 'Ültetvényes'], [5e7, 'Vízmester'], [1e9, 'Öntöző Birodalom ura'], [1e11, 'Vízcsászár'], [1e13, 'Bolygóöntöző'], [1e15, 'A Víz Istene']],
    init(G) {
      GG = G; if (inFrame() && !CL.asked) { CL.asked = 1; parent.postMessage({ hgws: 'csreq', game: 'birodalom' }, location.origin); }
      S = load(); sanit(true); S.tab = S.tab || 'mod'; S.tool = S.tool === undefined ? 'pipe' : S.tool; fl = []; dust = []; drag = null; confirmT = 0;
      MO = new Float32Array(COLS * ROWS); RP = new Float32Array(COLS * ROWS); CB = []; DR = []; syncCB(); panS = null; pinch = null; PT.clear();
      S.nek = B(S.nek || 0); S.cp = B(S.cp || 0); S.met = { vas: ZERO, rez: ZERO, tit: ZERO, iri: ZERO, neu: ZERO, ...(S.met || {}) }; for (const k in S.met) S.met[k] = B(S.met[k]); S.gx = { gals: [], cur: 0, sel: 0, up: {}, won: {}, ...(S.gx || {}) }; S.gx.pick = null; for (const gal of S.gx.gals) for (const st of gal.stars) for (const p of st.pl) if (!PCLS[p.c].al.includes(p.des)) p.des = PCLS[p.c].al[0]; GR = gnet(); S.loc = S.loc || 'earth'; S.locs = S.locs || {}; S.unl = S.unl || ['earth']; S.anim = null; S.lp = false;
      layout(G); net(); G.score = scoreOf();
      if (!wheelOn) { wheelOn = 1; const on = () => G.running && G.game && G.game.id === 'birodalom' && L;
        gc.addEventListener('wheel', e => { if (!on()) return; e.preventDefault(); const [x, y] = P(e); if (y < L.barY) zoomAt(G, x, y, Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * .004)); }, { passive: false });
        gc.addEventListener('contextmenu', e => { if (on()) e.preventDefault(); });
        addEventListener('keydown', e => { if (!on()) return; const v = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1], a: [1, 0], d: [-1, 0], w: [0, 1], s: [0, -1] }[e.key]; if (v) { e.preventDefault(); pan(G, v[0] * L.ts * 2, v[1] * L.ts * 2); }
          else if (e.key === '+' || e.key === '-') zoomAt(G, L.fx + L.fw / 2, L.fy + L.fh / 2, e.key === '+' ? 1.25 : .8); else if (e.key === 'x' || e.key === 'Delete') { S.tool = S.tool === 'del' ? null : 'del'; S.info = { it: { k: 'del', kind: 'del', n: 'Bontás' }, l: 4 }; } }); }
      const away = Math.min(offMax(), Math.max(0, (Date.now() - S.t) / 1000)); S.away = null;
      if (away > 30) {
        let got = ZERO;
        for (let i = 0; i < S.k.length; i++) { const p = PL[S.k[i]]; if (!p) continue; const w = netW(i); if (!w) continue;
          const grow = rate(i, w).mul(away).add(S.g[i]);
          if (auto()) { const n = grow.floor(), fr = grow.lt(1e15) ? grow.toNumber() - n.toNumber() : 0; got = got.add(n.mul(val(i)).mul(offF() * luck())); S.nek = S.nek.add(n.mul(nekOf(S.k[i]) * offF())); if (p.met) S.met[p.met] = S.met[p.met].add(n.mul(p.ma * metMul() * offF())); S.g[i] = fr; } else S.g[i] = Math.min(1, grow.toNumber()); }
        lincAll(); GR = gnet(); got = got.add(GR.ft.mul(away)); payBg(away); S.nek = S.nek.add(GR.nek.mul(away)); S.cp = S.cp.add(GR.cp.mul(away)); for (const k in GR.met) S.met[k] = S.met[k].add(GR.met[k].mul(away)); S.nek = S.nek.add(B(S.linc[1]).add(NET.nekH).mul(away)); S.cp = S.cp.add(B(S.linc[2] || 0).add(NET.cpR).mul(away));
        got = got.floor(); if (got.gt(0)) { earn(got); G.score = scoreOf(); }
        S.away = { got, sec: away, l: 6 };
      }
      S.saveT = 0; S.syncT = 0; S.hudT = 0; S.rt = 0;
    },
    resize(G) { if (S) layout(G); },
    leave(G) { save(); this.sync(G, true); cloudPush(true); },
    sync(G) { const sc = scoreOf(); if (BO) return; if (S.life.gt(S.sent || 0)) { S.sent = S.life; save(); store.set('best_' + this.id, Math.max(store.get('best_' + this.id), sc));
      if (window.top !== window) parent.postMessage({ hgws: 'score', game: this.id, score: sc, lg: S.life.log10() }, location.origin); } },
    down(G, x, y, e) {
      if (e === true) return;
      if (S.anim) return;
      if (S.away && S.away.l > 0) { S.away.l = 0; return; }
      if (galView() && S.gx.pick && y < L.barY) { galDown(G, x, y); return; }
      const hit = o => x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h;
      if (y >= L.barY) { const b = bar(G);
        if (hit(b.del) && galView()) { S.gv = false; S.tab = 'mod'; S.pg = {}; Sfx.blip(500, .05, 'sine', .05); return; }
        if (hit(b.del)) { S.tool = S.tool === 'del' ? null : 'del'; S.info = { it: { k: 'del', kind: 'del', n: 'Bontás' }, l: 5 }; Sfx.blip(S.tool ? 300 : 600, .05, 'square', .05); return; }
        const tb = b.tabs.find(hit); if (tb) { S.tab = tb.k; confirmT = 0; Sfx.blip(600, .03, 'sine', .04); return; }
        const ar = b.arr.find(hit); if (ar) { S.pg[S.tab] = (b.pg + ar.dir + b.pages) % b.pages; Sfx.blip(650, .03, 'sine', .04); return; }
        const it = b.its.find(hit); if (it) buy(G, it); return; }
      if (S.anim) return;
      const cbt = cloudBtn(); if (cbt && hit(cbt)) { cloudPush(true, true); Sfx.blip(760, .05, 'sine', .05); return; }
      const lpb = locPill(G); if (lpb && hit(lpb)) { S.lp = !S.lp; Sfx.blip(600, .03, 'sine', .04); return; }
      if (S.lp) { const row = locRows(G).find(hit); S.lp = false;
        if (row && row.id === 'gal') { if (S.gx.gals.length) { S.gv = true; S.tab = 'gsys'; S.pg = {}; Sfx.blip(600, .05, 'sine', .05); return; }
          const c = galCost(0); if (!canPay(c)) { Sfx.blip(140, .1, 'square', .05); S.info = { it: { k: 'x', kind: 'x', n: 'Galaxis', warn: 'Az első galaxis ára: ' + costTxt(c) + '.' }, l: 4 }; return; }
          pay(c); S.gx.gals.push(genGal(0)); S.gx.cur = 0; S.gx.sel = 0; S.gv = true; S.tab = 'gsys'; S.pg = {}; GR = gnet(); Sfx.perfect(); save(); return; }
        if (row && galView()) { S.gv = false; S.tab = 'mod'; S.pg = {}; if (row.id === S.loc) return; }
        if (row) {
          if (S.unl.includes(row.id)) { if (row.id !== S.loc) { S.anim = { t: 0, dur: .7, to: row.id }; Sfx.blip(500, .06, 'sine', .05); } }
          else { const c = launchCost(row.id), nk = launchNek(row.id), cq = launchCp(row.id);
            if (canPay({ c, ck: nk, cc: cq })) { pay({ c, ck: nk, cc: cq }); S.unl.push(row.id); S.locs[row.id] = newLoc(); S.anim = { t: 0, dur: 2.8, to: row.id, launch: 1 }; Sfx.perfect(); save(); }
            else { Sfx.blip(140, .1, 'square', .05); S.info = { it: { k: 'x', kind: 'x', n: 'Kilövés', warn: LOCS[row.id].n + ': ' + fmt(c) + ' Ft, ' + nfmt(nk) + ' 🍯' + (cq.gt(0) ? ' és ' + nfmt(cq) + ' ✨' : '') + ' kell hozzá.' }, l: 3 }; } } }
        return; }
      if (galView()) { galDown(G, x, y); return; }
      const zb = zoomBtns(G).find(hit); if (zb) { zoomAt(G, L.fx + L.fw / 2, L.fy + L.fh / 2, zb.f); Sfx.blip(700, .03, 'sine', .04); return; }
      const mm = miniMap(); if (mm && hit(mm)) { CAM.cx = (x - mm.x) / mm.w * L.vw; CAM.cy = (y - mm.y) / mm.h * L.vh; layout(G); Sfx.blip(650, .03, 'sine', .04); return; }
      const id = e && e.pointerId != null ? e.pointerId : 0; PT.set(id, { x, y });
      if (PT.size >= 2) { const [a, b] = [...PT.values()]; drag = null; panS = null; pend = null; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; return; }
      const i = tileAt(x, y);
      // eszköz nélkül (vagy jobb/középső gombbal) húzva a kertet görgeti; koppintásra arat / szelepet kapcsol
      if (e && e.button === 2 && i >= 0 && !galView()) { RDEL = S.tool === undefined ? null : S.tool; S.tool = 'del'; DN.n = 0; DN.c = 0; place(G, i, true); lastTile = i; drag = 1; return; } // jobb klikk = bontás (húzva is)
      if (!S.tool || i < 0 || (e && (e.button === 1 || e.button === 2))) { panS = { x, y, moved: 0, i: e && e.button ? -1 : i, mid: e && e.button === 1 ? i : -1 }; return; }
      // érintésnél kicsit várunk: ha jön a második ujj (csípés), nem rakunk le semmit
      if (e && e.pointerType === 'touch') { pend = { i, x, y, t: performance.now() }; return; }
      DN.n = 0; DN.c = 0; DN.x = x; DN.y = y; DN.last = -1; place(G, i, true); lastTile = i; drag = S.tool === 'pipe' || S.tool === 'del' || PL[S.tool] ? 1 : rangeOf(S.tool) ? 'r' : null;
    },
    commit(G) { if (!pend) return; const i = pend.i; DN.n = 0; DN.c = 0; DN.x = pend.x; DN.y = pend.y; DN.last = -1; pend = null; place(G, i, true); lastTile = i; drag = S.tool === 'pipe' || S.tool === 'del' || PL[S.tool] ? 1 : rangeOf(S.tool) ? 'r' : null; },
    move(G, x, y, btn, e) { if (!btn && L && y >= L.barY) { const b = bar(G); S.hover = b.its.find(o => x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h) || null; } else if (!btn) S.hover = null;
      S.tip = !galView() && !btn && L && y < L.barY && (!e || e.pointerType === 'mouse') ? { i: tileAt(x, y), x, y } : null;
      const id = e && e.pointerId != null ? e.pointerId : 0; if (PT.has(id)) PT.set(id, { x, y });
      if (pinch && PT.size >= 2) { const [a, b] = [...PT.values()], dd = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        zoomAt(G, mx, my, dd / pinch.d); pan(G, mx - pinch.mx, my - pinch.my); pinch = { d: dd, mx, my }; return; }
      if (pend && btn && Math.hypot(x - pend.x, y - pend.y) > 6 * L.d) this.commit(G);
      if (panS && btn) { const dx = x - panS.x, dy = y - panS.y; panS.moved += Math.abs(dx) + Math.abs(dy); panS.x = x; panS.y = y; pan(G, dx, dy); return; }
      if (!drag || !btn) return; DN.x = x; DN.y = y; DN.t = 1.2; if (drag === 'r') return poleDrag(G, tileAt(x, y)); const i = tileAt(x, y); if (i >= 0 && i !== lastTile) { lastTile = i; place(G, i, false); } },
    up(G, x, y, e) { const id = e && e.pointerId != null ? e.pointerId : 0; PT.delete(id);
      if (pinch) { if (PT.size < 2) pinch = null; panS = null; drag = null; pend = null; lastTile = -1; return; }
      if (pend) this.commit(G);
      if (panS && panS.moved < 10 * L.d && panS.mid >= 0) pick(panS.mid);
      if (panS && panS.moved < 10 * L.d && panS.i >= 0) place(G, panS.i, true);
      if (drag) DN.t = 1.2; if (RDEL !== false) { S.tool = RDEL; RDEL = false; } panS = null; drag = null; lastTile = -1; },
    update(G, fdt) {
      DN.t = Math.max(0, DN.t - fdt);
      if (pend && PT.size === 1 && performance.now() - pend.t > 110) this.commit(G);
      const now = performance.now(), dt = S.rt ? Math.min(600, Math.max(0, (now - S.rt) / 1000)) : fdt; S.rt = now;
      const [cw, rh] = size();
      // mozgó öntözők
      for (let i = 0; i < MO.length; i++) if (MO[i] > 0) MO[i] = Math.max(0, MO[i] - dt / MOIST);
      for (const o of NET.mobs) { const st = o.st, sp = 1.2 * Math.min(1, NET.eff + .2); st.p += st.dir * sp * Math.min(dt, .5);
        if (st.p >= o.len - 1) { st.p = o.len - 1; st.dir = -1; } if (st.p <= 0) { st.p = 0; st.dir = 1; }
        const pc = Math.round(st.p);
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const x = o.ax === 'x' ? pc + a : o.cc + b, y = o.ax === 'x' ? o.rc + b : pc + a;
          if (x >= 0 && y >= 0 && x < cw && y < rh) { const j = idx(x, y); MO[j] = Math.max(MO[j], o.v); } } }
      if (dt > 3) for (let i = 0; i < MO.length; i++) MO[i] = Math.max(MO[i], NET.mwet[i]);
      // növekedés
      const kert = S.up.kertesz > 0;
      for (let i = 0; i < S.k.length; i++) { const p = PL[S.k[i]]; if (!p) continue; const w = wetNow(i);
        if (S.g[i] < 1 && w) { const r = rate(i, w); BM[i] = r.mul(MINC).max(ONE); S.g[i] += dt * Math.min(r.toNumber(), 1 / MINC); }
        if (S.g[i] >= 1) { RP[i] += dt; const n = Math.floor(S.g[i]);
          if (n > 1 && auto()) { earn(val(i).mul(n - 1)); S.g[i] = 1 + (S.g[i] - n); }
          else if (n > 1) S.g[i] = 1;
          if (kert && RP[i] > (S.up.kombajn ? 12 : 1.5)) { const rest = S.g[i] - 1; harvest(G, i, 'k'); S.g[i] = rest; } } }
      // kombájnok
      const cs0 = (1.8 + .35 * S.up.motor) * (1 + .2 * pk('pgyors')) * 1.6 ** S.up.robot * 1.5 ** S.up.csmot * Math.min(dt, .5), UN = [...CB, ...DR], taken = new Set(UN.map(c => c.tgt));
      for (const cb of UN) { const cs = cs0 * (cb.fly ? 1.9 : 1);
        if (cb.tgt < 0 || !PL[S.k[cb.tgt]] || S.g[cb.tgt] < 1) {
          taken.delete(cb.tgt); cb.tgt = -1; let best = 1e9;
          for (let i = 0; i < S.k.length; i++) if (PL[S.k[i]] && S.g[i] >= 1 && !taken.has(i)) { const dx = i % COLS + .5 - cb.x, dy = Math.floor(i / COLS) + .5 - cb.y, dd = dx * dx + dy * dy; if (dd < best) { best = dd; cb.tgt = i; } }
          if (cb.tgt >= 0) taken.add(cb.tgt);
        }
        let tx, ty; if (cb.tgt >= 0) { tx = cb.tgt % COLS + .5; ty = Math.floor(cb.tgt / COLS) + .5; } else { tx = SRC[0] + (cb.fly ? 2.5 + DR.indexOf(cb) * .8 : 1.5); ty = SRC[1] + (cb.fly ? -1.2 : 1.5 + CB.indexOf(cb) * .9); tx = Math.min(tx, cw - .5); ty = Math.max(.5, ty); ty = Math.min(ty, rh - .5); }
        const dx = tx - cb.x, dy = ty - cb.y, dd = Math.hypot(dx, dy);
        if (dd > .05) { const st = Math.min(dd, cs); cb.x += dx / dd * st; cb.y += dy / dd * st; const ta = Math.atan2(dy, dx); let da = ta - cb.a; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; cb.a += da * Math.min(1, dt * 8); cb.run += dt;
          if (!cb.fly && Math.random() < dt * 14) { const [px, py] = posXY(cb.x - .5, cb.y - .5); dust.push({ x: px - Math.cos(cb.a) * L.ts * .4, y: py - Math.sin(cb.a) * L.ts * .4, vx: (Math.random() - .5) * 10 * L.d, vy: (Math.random() - .5) * 10 * L.d, l: .8, c: '#c8b48a' }); } }
        else if (cb.tgt >= 0 && S.g[cb.tgt] >= 1) { const rest = S.g[cb.tgt] - 1; harvest(G, cb.tgt, 'cb'); S.g[cb.tgt] = rest; cb.tgt = -1; }
      }
      if (!S.linc) lincAll();
      if ((S.bgT = (S.bgT || 0) + dt) >= 30) { const v = payBg(S.bgT); S.bgT = 0; lincAll(); if (v.gt(0)) S.bgMsg = { t: '🛰️ A többi helyszín: +' + fmt(v) + ' Ft', l: 3 }; }
      if (S.bgMsg) S.bgMsg.l -= dt;
      S.nek = S.nek.add(NET.nekH * dt); S.cp = S.cp.add(NET.cpR * dt);
      if ((S.gxT = (S.gxT || 0) + dt) > 1) { S.gxT = 0; GR = gnet(); }
      if (GR.ft.gt(0) || GR.nek.gt(0) || GR.cp.gt(0)) { earn(GR.ft.mul(dt)); S.nek = S.nek.add(GR.nek.mul(dt)); S.cp = S.cp.add(GR.cp.mul(dt)); } for (const k in GR.met) S.met[k] = S.met[k].add(GR.met[k].mul(dt));
      if (S.anim) { S.anim.t += dt; if (!S.anim.done && S.anim.t >= S.anim.dur * .55) { S.anim.done = 1; goLoc(G, S.anim.to); } if (S.anim.t >= S.anim.dur) S.anim = null; }
      const sc = scoreOf();
      S.hudT -= dt; if (sc !== G.score && S.hudT <= 0) { G.score = sc; S.hudT = .25; if (sc > store.get('best_' + this.id)) store.set('best_' + this.id, sc); hud(); }
      sanit(); if ((S.saveT += dt) > 5) { S.saveT = 0; save(); }
      if ((S.syncT += dt) > 60) { S.syncT = 0; this.sync(G); cloudPush(); }
      if (S.away) S.away.l -= dt; if (S.info) S.info.l -= dt;
      if (confirmT > 0) confirmT -= dt;
      for (const f of fl) { f.y -= 22 * L.d * dt; f.l -= dt * .9; } fl = fl.filter(f => f.l > 0);
      for (const p of dust) { p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt * 1.4; } dust = dust.filter(p => p.l > 0); if (dust.length > 200) dust.splice(0, dust.length - 200);
    },
    draw(g, G, t) {
      if (!S) return;
      if (!L || L.W !== G.W || L.H !== G.H) layout(G);
      const d = L.d, ts = L.ts, [cw, rh] = size();
      if (L.vw !== (L.tr ? rh : cw)) layout(G);
      const LC = galView() ? { sky: ['#0a0618', '#010104'], stars: 1 } : LOCS[S.loc], sky = g.createLinearGradient(0, 0, 0, G.H); sky.addColorStop(0, LC.sky ? LC.sky[0] : '#16351f'); sky.addColorStop(1, LC.sky ? LC.sky[1] : '#07140c'); g.fillStyle = sky; g.fillRect(-20, -20, G.W + 40, G.H + 40);
      if (LC.stars) { for (let j = 0; j < 90; j++) { const sx = (j * 7919 % 1000) / 1000 * G.W, sy = (j * 104729 % 1000) / 1000 * G.H; g.fillStyle = `rgba(255,255,255,${.25 + .5 * ((Math.sin(t * 1.3 + j) + 1) / 2) * ((j % 5) / 5)})`; g.fillRect(sx, sy, d * (j % 7 ? 1 : 2), d * (j % 7 ? 1 : 2)); } }
      if (galView()) drawGal(g, G, t); else {
      const BW = ts * L.vw, BH = ts * L.vh, vis = (x, y, m = 0) => x + ts + m > 0 && x - m < G.W && y + ts + m > L.fy - 16 * d && y - m < L.fy + L.fh + 16 * d;
      g.save(); g.beginPath(); g.rect(0, L.fy - 8 * d, G.W, L.fh + 22 * d); g.clip();
      // kerítés
      shadow(g, L.bx + BW / 2, L.by + BH + 10 * d, BW * .55, 14 * d, .35);
      g.fillStyle = LC.ff ? LC.ff[1] : '#5a3d22'; rr(L.bx - 10 * d, L.by - 10 * d, BW + 20 * d, BH + 20 * d, 8 * d); g.fill();
      g.fillStyle = LC.ff ? LC.ff[0] : '#7a5530'; rr(L.bx - 7 * d, L.by - 7 * d, BW + 14 * d, BH + 14 * d, 6 * d); g.fill();
      g.fillStyle = LC.ff ? 'rgba(0,0,0,.35)' : '#3e2914'; for (let s2 = 0; s2 <= L.vw; s2++) { g.fillRect(L.bx + s2 * ts - 3 * d, L.by - 12 * d, 6 * d, 6 * d); g.fillRect(L.bx + s2 * ts - 3 * d, L.by + BH + 6 * d, 6 * d, 6 * d); }
      for (let s2 = 0; s2 <= L.vh; s2++) { g.fillRect(L.bx - 12 * d, L.by + s2 * ts - 3 * d, 6 * d, 6 * d); g.fillRect(L.bx + BW + 6 * d, L.by + s2 * ts - 3 * d, 6 * d, 6 * d); }
      const tex = locTex(Math.ceil(ts));
      for (let r = 0; r < rh; r++) for (let c = 0; c < cw; c++) {
        const i = idx(c, r), [x, y] = tileXY(i); if (!vis(x, y)) continue; const w = wetVis(i);
        g.drawImage(tex[(c * 7 + r * 13) % tex.length], x, y, ts + .5, ts + .5);
        if (w) { g.fillStyle = `rgba(25,70,110,${.16 + .12 * Math.min(1.3, w)})`; g.fillRect(x, y, ts + .5, ts + .5);
          const gl = (t * .7 + c * .37 + r * .61) % 3; if (gl < 1) { g.fillStyle = `rgba(200,235,255,${.25 * Math.sin(gl * Math.PI)})`; g.beginPath(); g.ellipse(x + ts * ((c * 31 % 7) / 9 + .15), y + ts * ((r * 17 % 7) / 9 + .15), ts * .08, ts * .03, 0, 0, 6.283); g.fill(); } }
        if (NET.gb[i] > 1 || NET.yb[i] > 1) { g.fillStyle = NET.yb[i] > 1 ? 'rgba(255,217,59,.07)' : 'rgba(120,80,30,.12)'; g.fillRect(x, y, ts + .5, ts + .5); }
      }
      g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 1; g.beginPath(); for (let s2 = 1; s2 < L.vw; s2++) { g.moveTo(L.bx + s2 * ts, L.by); g.lineTo(L.bx + s2 * ts, L.by + BH); } for (let s2 = 1; s2 < L.vh; s2++) { g.moveTo(L.bx, L.by + s2 * ts); g.lineTo(L.bx + BW, L.by + s2 * ts); } g.stroke();
      { const [x, y] = tileXY(idx(...SRC)); if (L.tr) seg(g, x + ts / 2, y, 0, -1, 12 * d, ts * .26, 1, -1, t); else seg(g, x, y + ts / 2, -1, 0, 12 * d, ts * .26, 1, -1, t); }
      for (let r = 0; r < rh; r++) for (let c = 0; c < cw; c++) {
        const i = idx(c, r), k = S.k[i]; if (!k || PL[k] || k[0] === '#') continue; const [x, y] = tileXY(i), sz = szOf(k); if (!vis(x, y, ts * (sz > 1 ? 11 : 4.5))) continue; drawMod(g, k, i, x, y, sz > 1 ? ts * sz : ts, t, NET.on[i]);
      }
      for (let r = 0; r < rh; r++) for (let c = 0; c < cw; c++) {
        const i = idx(c, r), k = S.k[i]; if (!PL[k]) continue; const [x, y] = tileXY(i), sz = szOf(k); if (!vis(x, y, ts * sz)) continue;
        if (sz > 1) { g.fillStyle = 'rgba(62,38,20,.28)'; rr(x + ts * .05, y + ts * .05, ts * sz - ts * .1, ts * sz - ts * .1, ts * .18); g.fill(); }
        drawPlant(g, k, Math.min(1, S.g[i]), x, y, ts * sz, t);
        if (sz > 1) { g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = Math.max(3, ts * .1); rr(x + ts * .05, y + ts * .05, ts * sz - ts * .1, ts * sz - ts * .1, ts * .18); g.stroke(); g.strokeStyle = '#ffe29a'; g.globalAlpha = .85; g.lineWidth = Math.max(2, ts * .05); g.setLineDash([ts * .22, ts * .12]); rr(x + ts * .05, y + ts * .05, ts * sz - ts * .1, ts * sz - ts * .1, ts * .18); g.stroke(); g.setLineDash([]);
          g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = Math.max(1, ts * .02); g.globalAlpha = 1; rr(x + ts * .02, y + ts * .02, ts * sz - ts * .04, ts * sz - ts * .04, ts * .2); g.stroke(); }
        if (PL[k].rq && !rqOK(i)) { const miss = PL[k].rq.filter(q => !cells(i, sz).some(j => NET.prov[j] & RQ[q].b)), u = ts * .42, bw = u * miss.length + ts * .08, bx = x + ts * sz - bw - ts * .06, by = y + ts * .06;
          g.fillStyle = 'rgba(200,40,40,.92)'; rr(bx, by, bw, u + ts * .04, ts * .12); g.fill(); g.font = `${ts * .28}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; miss.forEach((q, n) => g.fillText(RQ[q].ic, bx + ts * .04 + u * (n + .5), by + u / 2 + ts * .03)); }
      }
      for (const o of NET.mobs) drawMob(g, o, t, ts);
      for (const p of dust) { g.fillStyle = p.c; g.globalAlpha = Math.max(0, p.l) * .7; g.beginPath(); g.arc(p.x, p.y, Math.max(1, ts * .04), 0, 6.283); g.fill(); } g.globalAlpha = 1;
      for (const cb of CB) drawCB(g, cb, t, ts);
      for (const u of DR) drawDrone(g, u, t, ts);
      if (S.tool === 'del') { g.strokeStyle = 'rgba(255,110,90,.55)'; g.lineWidth = 3 * d; g.setLineDash([10 * d, 8 * d]); g.strokeRect(L.bx + 1.5 * d, L.by + 1.5 * d, BW - 3 * d, BH - 3 * d); g.setLineDash([]); }
      // felhőárnyékok
      g.save(); g.beginPath(); g.rect(L.bx, L.by, BW, BH); g.clip();
      for (let j = 0; j < 3; j++) { const span = BW + 400 * d, cx = L.bx - 200 * d + ((t * 14 * d + j * span / 3) % span), cy = L.by + BH * (.2 + .3 * j); g.fillStyle = 'rgba(0,10,20,.07)'; g.beginPath(); g.ellipse(cx, cy, 140 * d, 60 * d, .3, 0, 6.283); g.ellipse(cx + 80 * d, cy + 20 * d, 90 * d, 45 * d, 0, 0, 6.283); g.fill(); }
      g.restore();
      for (const f of fl) { g.font = `700 ${Math.max(10, ts * .32)}px Inter, sans-serif`; g.textAlign = 'center'; g.lineWidth = 3 * d; g.strokeStyle = `rgba(0,0,0,${Math.max(0, f.l) * .5})`; g.strokeText(f.t, f.x, f.y); g.fillStyle = f.gold ? `rgba(255,246,190,${Math.max(0, f.l)})` : `rgba(255,225,140,${Math.max(0, f.l)})`; g.fillText(f.t, f.x, f.y); }
      g.restore();
      // nagyítás és a kert áttekintése (ha nagyobb a képernyőnél)
      for (const z of zoomBtns(G)) { g.fillStyle = 'rgba(4,7,14,.75)'; g.strokeStyle = 'rgba(232,182,86,.5)'; g.lineWidth = d; rr(z.x, z.y, z.w, z.h, 9 * d); g.fill(); g.stroke(); g.fillStyle = '#ffe29a'; g.font = `800 ${18 * d}px Inter, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(z.t, z.x + z.w / 2, z.y + z.h / 2 + d); }
      { const mm = miniMap(); if (mm) { const { x: mx, y: my, w: mw, h: mh } = mm, sx = mw / BW, sy = mh / BH;
        g.fillStyle = 'rgba(4,7,14,.75)'; rr(mx - 3 * d, my - 3 * d, mw + 6 * d, mh + 6 * d, 6 * d); g.fill(); g.fillStyle = 'rgba(70,140,70,.7)'; g.fillRect(mx, my, mw, mh);
        if (!MMC.cv || MMC.t < t - .5 || MMC.w !== Math.round(mw) || MMC.h !== Math.round(mh)) { MMC.t = t; MMC.w = Math.round(mw); MMC.h = Math.round(mh); MMC.cv = MMC.cv || document.createElement('canvas'); MMC.cv.width = MMC.w; MMC.cv.height = MMC.h;
          const mg = MMC.cv.getContext('2d'); for (let r = 0; r < rh; r++) for (let c = 0; c < cw; c++) { const k = kAt(idx(c, r)); if (!k) continue; mg.fillStyle = PL[k] ? PL[k].col : COND[k] ? '#9fd6f5' : '#e8b656'; const [vx, vy] = L.tr ? [r, c] : [c, r]; mg.fillRect(vx * MMC.w / L.vw, vy * MMC.h / L.vh, Math.max(1, MMC.w / L.vw), Math.max(1, MMC.h / L.vh)); } }
        g.drawImage(MMC.cv, mx, my, mw, mh);
        g.strokeStyle = '#ffe29a'; g.lineWidth = 1.5 * d; g.strokeRect(mx + Math.max(0, (L.fx - L.bx) * sx), my + Math.max(0, (L.fy - L.by) * sy), Math.min(mw, L.fw * sx), Math.min(mh, L.fh * sy)); } }
      }
      // felső sáv
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `800 ${20 * d}px Inter, sans-serif`; g.fillStyle = '#ffe29a'; g.fillText('💰 ' + fmt(S.money) + ' Ft' + (S.star.gt(0) ? '   ⭐ ' + fmt(S.star) : '') + (S.nek.gte(.01) || S.life.gt(5e4) ? '   🍯 ' + nfmt(S.nek) : '') + (S.cp.gt(0) || S.unl.length > 1 ? '   ✨ ' + nfmt(S.cp) : ''), G.W / 2, 70 * d);
      g.font = `600 ${12 * d}px Inter, sans-serif`;
      { const totInc = B(NET.inc).add(S.linc ? S.linc[0] : 0).add(GR.ft), t1 = `+${totInc.lt(1e4) ? totInc.toNumber().toLocaleString('hu-HU', { maximumFractionDigits: 1 }) : fmt(totInc)} Ft/s   ·   `, t2 = `💧 ${NET.dem < 1e6 ? NET.dem.toLocaleString('hu-HU', { maximumFractionDigits: 1 }) : fmt(NET.dem)} / ${NET.capD.lt(1e6) ? NET.cap.toLocaleString('hu-HU') : fmt(NET.capD)} L/s`, w1 = g.measureText(t1).width, w2 = g.measureText(t2).width, x0 = G.W / 2 - (w1 + w2) / 2;
        g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText(t1, x0, 89 * d); g.fillStyle = NET.capD.lt(NET.dem) ? '#ff8a7a' : '#9fd6f5'; g.fillText(t2, x0 + w1, 89 * d); g.textAlign = 'center'; }
      if (S.gx.gals.length || Object.values(S.met).some(v => B(v).gt(0))) { g.font = `600 ${10 * d}px Inter, sans-serif`; g.fillStyle = 'rgba(255,255,255,.6)'; g.textAlign = 'center';
        g.fillText(Object.keys(MET).map(k => MET[k].ic + ' ' + nfmt(S.met[k])).join('   '), G.W / 2, 104 * d, G.W - 20 * d); }
      // alsó sáv
      const b = bar(G);
      const bg2 = g.createLinearGradient(0, L.barY, 0, G.H); bg2.addColorStop(0, 'rgba(12,18,28,.96)'); bg2.addColorStop(1, 'rgba(4,7,14,.98)'); g.fillStyle = bg2; g.fillRect(0, L.barY, G.W, G.H - L.barY); g.fillStyle = 'rgba(232,182,86,.35)'; g.fillRect(0, L.barY, G.W, 1 * d);
      for (const tb of b.tabs) { const on = S.tab === tb.k; g.fillStyle = on ? 'rgba(232,182,86,.9)' : 'rgba(255,255,255,.06)'; rr(tb.x + 3 * d, tb.y, tb.w - 6 * d, tb.h, tb.h / 2); g.fill();
        g.fillStyle = on ? '#1a1004' : tb.k === 'bir' && starGain() ? '#ffe29a' : 'rgba(255,255,255,.75)'; g.font = `700 ${Math.min(12, tb.w / d / 9.5) * d}px Inter, sans-serif`; g.fillText(tb.n, tb.x + tb.w / 2, tb.y + tb.h / 2 + 1); }
      if (galView()) { const z = b.del; g.fillStyle = 'rgba(122,208,108,.18)'; g.strokeStyle = 'rgba(122,208,108,.7)'; g.lineWidth = 1.5 * d; rr(z.x, z.y, z.w, z.h, z.h / 2); g.fill(); g.stroke(); g.fillStyle = '#b9f27a'; g.font = `800 ${Math.min(12, z.w / d / 8) * d}px Inter, sans-serif`; g.fillText('🌱 KERT', z.x + z.w / 2, z.y + z.h / 2 + 1, z.w - 8 * d); }
      else { const z = b.del, on = S.tool === 'del'; g.fillStyle = on ? 'rgba(229,83,61,.92)' : 'rgba(229,83,61,.16)'; g.strokeStyle = on ? '#ff8a7a' : 'rgba(255,138,122,.55)'; g.lineWidth = 1.5 * d; rr(z.x, z.y, z.w, z.h, z.h / 2); g.fill(); g.stroke();
        g.fillStyle = on ? '#fff' : '#ffb4a8'; g.font = `800 ${Math.min(12, z.w / d / 8) * d}px Inter, sans-serif`; g.fillText('🪓 BONTÁS', z.x + z.w / 2, z.y + z.h / 2 + 1, z.w - 8 * d); }
      for (const a of b.arr) { g.fillStyle = 'rgba(255,255,255,.06)'; rr(a.x, a.y, a.w, a.h, 8 * d); g.fill(); g.fillStyle = '#ffe29a'; g.font = `700 ${14 * d}px Inter, sans-serif`; g.fillText(a.dir < 0 ? '‹' : '›', a.x + a.w / 2, a.y + a.h / 2 - 6 * d);
        if (a.dir > 0) { g.font = `600 ${9 * d}px Inter, sans-serif`; g.fillStyle = 'rgba(255,255,255,.5)'; g.fillText((b.pg + 1) + '/' + b.pages, a.x + a.w / 2, a.y + a.h / 2 + 12 * d); } }
      for (const it of b.its) {
        const shop = it.kind === 'mod' || it.kind === 'pl', lock = (shop || it.kind === 'up') && !galView() && !unlocked(it), sel = shop && S.tool === it.k;
        const can = it.prod ? true : it.cost !== undefined ? !!it.cost && canPay(it.cost) : it.kind === 'reset' || it.kind === 'perk' ? it.ok : it.c !== Infinity && canPay(it);
        g.fillStyle = sel || (it.kind === 'reset' && confirmT > 0) ? 'rgba(232,182,86,.22)' : 'rgba(255,255,255,.05)'; g.strokeStyle = sel ? '#e8b656' : 'rgba(255,255,255,.1)'; g.lineWidth = 1.5 * d;
        rr(it.x + 3 * d, it.y, it.w - 6 * d, it.h, 10 * d); g.fill(); g.stroke();
        const ix = it.x + it.w / 2, ic = Math.min(it.w * .42, it.h * .42), iy = it.y + 4 * d;
        g.save(); g.beginPath(); g.rect(it.x + 3 * d, it.y, it.w - 6 * d, it.h); g.clip(); if (lock || it.have) g.globalAlpha = .35;
        if (it.kind === 'pl') drawPlant(g, it.k, 1, ix - ic / 2, iy, ic, 0);
        else if (it.kind === 'mod' && it.k !== 'del') drawMod(g, it.k, -1, ix - ic / 2, iy, ic, t, 1, .5);
        else { g.font = `${ic * .7}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(it.k === 'del' ? '🪓' : it.ic, ix, iy + ic / 2); }
        g.restore(); g.textAlign = 'center'; g.textBaseline = 'middle';
        if (it.sz) { g.font = `800 ${9 * d}px Inter, sans-serif`; g.fillStyle = 'rgba(108,198,255,.95)'; g.textAlign = 'right'; g.fillText(it.sz + '×' + it.sz, it.x + it.w - 8 * d, it.y + 9 * d); g.textAlign = 'center'; }
        const fs = Math.min(11, it.w / d / 8.5) * d; g.font = `700 ${fs}px Inter, sans-serif`; g.fillStyle = 'rgba(255,255,255,.85)';
        g.fillText(it.kind === 'up' ? `${it.n} ${it.lvl}` : it.n, ix, it.y + it.h - 26 * d, it.w - 8 * d);
        let lbl, col;
        if (lock) { lbl = '🔒 ' + fmt(it.u); col = 'rgba(255,255,255,.4)'; }
        else if (it.cost !== undefined && !it.lbl) { lbl = it.cost ? costTxt(it.cost) : '–'; col = can ? '#ffe29a' : '#ff8a7a'; }
        else if (it.lbl) { lbl = it.lbl; col = it.have ? '#86b86c' : can ? '#ffe29a' : 'rgba(255,255,255,.4)'; }
        else if (it.c === Infinity) { lbl = 'MAX'; col = '#86b86c'; }
        else { const has = v => v && B(v).gt(0); lbl = has(it.c) ? fmt(it.c) + ' Ft' + (has(it.ck) ? ' + ' + nfmt(it.ck) + '🍯' : '') + (has(it.cc) ? ' + ' + nfmt(it.cc) + '✨' : '') : '–'; col = can || !has(it.c) ? '#ffe29a' : '#ff8a7a'; }
        g.fillStyle = col; g.fillText(lbl, ix, it.y + it.h - 11 * d, it.w - 8 * d);
      }
      { const shownIt = S.hover || (S.info && S.info.l > 0 ? S.info.it : null) || (S.tool === 'del' ? { k: 'del', kind: 'del', n: 'Bontás' } : S.tool ? items().find(o => o.k === S.tool && (o.kind === 'mod' || o.kind === 'pl')) : null);
        if (shownIt) { const fresh = shownIt.warn ? shownIt : items().find(o => o.k === shownIt.k && o.kind === shownIt.kind) || shownIt, txt = descOf(fresh);
          if (txt) { g.font = `600 ${12 * d}px Inter, sans-serif`; g.textAlign = 'left'; const title = fresh.n + '  ', tw = g.measureText(title).width; g.font = `500 ${12 * d}px Inter, sans-serif`;
            const maxW = Math.min(G.W - 24 * d, 760 * d), words = txt.split(' '), lines = []; let ln = '', first = true;
            for (const wd of words) { const tryL = ln ? ln + ' ' + wd : wd, lim = maxW - 24 * d - (first ? tw : 0); if (g.measureText(tryL).width > lim && ln) { lines.push(ln); ln = wd; first = false; } else ln = tryL; } lines.push(ln);
            const lh = 16 * d, bh = lines.length * lh + 12 * d, bx = (G.W - maxW) / 2, by = L.barY - bh - 6 * d;
            g.fillStyle = 'rgba(4,7,14,.88)'; g.strokeStyle = 'rgba(232,182,86,.45)'; g.lineWidth = d; rr(bx, by, maxW, bh, 10 * d); g.fill(); g.stroke();
            g.textBaseline = 'middle'; lines.forEach((t2, i) => { let x = bx + 12 * d; const y = by + 6 * d + lh * (i + .5); if (!i) { g.font = `800 ${12 * d}px Inter, sans-serif`; g.fillStyle = '#ffe29a'; g.fillText(title, x, y); x += tw; } g.font = `500 ${12 * d}px Inter, sans-serif`; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText(t2, x, y); });
            g.textAlign = 'center'; } } }
      if (!galView() && S.tip && S.tip.i >= 0 && !S.hover && !(S.away && S.away.l > 0)) { const i = anc(S.tip.i), k = S.k[i];
        if (k) { const P = PL[k], M = MOD[k], lines = [];
          if (P) { const gr = Math.min(1, S.g[i]), w = wetNow(i); lines.push(P.n + (P.sz ? ' (' + P.sz + '×' + P.sz + ')' : ''));
            lines.push(gr >= 1 ? 'Érett · kattints az aratáshoz' : Math.floor(gr * 100) + '% · ' + (w ? 'locsolva' : 'nincs víz')); lines.push('Termés: ' + fmt(val(i).mul(BM[i].max(ONE))) + ' Ft' + (BM[i].gte(1.5) ? ' (×' + fmt(BM[i].round()) + ' tétel)' : '')); if (P.rq) lines.push('Igény: ' + P.rq.map(q => RQ[q].ic + ' ' + RQ[q].n + ' ' + ((NET.prov && cells(i, P.sz || 1).some(j => NET.prov[j] & RQ[q].b)) ? '✔' : '✖')).join(' · ') + (rqOK(i) ? '' : ' – nem nő!')); lines.push(...bonusLines(i, w)); }
          else if (k === 'src') lines.push('Főcsap', 'Innen indul a víz.');
          else if (M && M.wq) { const lv = wqLv(k); lines.push(M.n + ' · ' + lv + '. szint', NET.on[i] ? 'Hatás: ' + wqTxt(M, lv) : 'Nincs bekötve – nem hat', lv < WQMAX ? 'Következő szint: ' + fmt(wqCost(k)) + ' Ft (koppints rá)' : 'Legmagasabb szint'); }
          else if (M && M.prov) lines.push(M.n, 'Biztosítja: ' + RQ[M.prov].ic + ' ' + RQ[M.prov].n + ' (' + M.aura + ' mezős körzet)');
          else if (M) { lines.push(M.n + (M.sz ? ' (' + M.sz + '×' + M.sz + ')' : ''));
            if (k === 'szelep') lines.push(S.vc[i] ? 'Zárva · kattints a nyitáshoz' : 'Nyitva · kattints a záráshoz');
            else if (!M.aura) lines.push(NET.on[i] ? (M.q ? '+' + fmt(M.q) + ' L/s vízhozam' : M.w ? 'Bekötve · ' + fmt(M.w) + ' L/s' : 'Bekötve') : 'Nincs bekötve a hálózatba');
            else lines.push('Nem kell rá cső'); }
          const fs = 12 * d, pad = 8 * d; g.font = `600 ${fs}px Inter, sans-serif`; const w = Math.max(...lines.map(l => g.measureText(l).width)) + pad * 2, h = lines.length * fs * 1.35 + pad * 1.4;
          let bx = S.tip.x + 16 * d, by = S.tip.y + 14 * d; if (bx + w > G.W - 6 * d) bx = S.tip.x - w - 12 * d; if (by + h > L.barY - 4 * d) by = S.tip.y - h - 10 * d;
          g.fillStyle = 'rgba(4,7,14,.92)'; g.strokeStyle = 'rgba(232,182,86,.55)'; g.lineWidth = d; rr(bx, by, w, h, 8 * d); g.fill(); g.stroke();
          g.textAlign = 'left'; g.textBaseline = 'middle'; lines.forEach((l, j) => { g.font = `${j ? 500 : 800} ${fs}px Inter, sans-serif`; g.fillStyle = j ? 'rgba(255,255,255,.82)' : '#ffe29a'; g.fillText(l, bx + pad, by + pad * .7 + fs * 1.35 * (j + .5)); }); g.textAlign = 'center'; } }
      { const cbt = cloudBtn(); if (cbt) { g.fillStyle = 'rgba(4,7,14,.82)'; g.strokeStyle = 'rgba(159,214,245,.6)'; g.lineWidth = d; rr(cbt.x, cbt.y, cbt.w, cbt.h, 9 * d); g.fill(); g.stroke(); g.font = `${15 * d}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText('☁️', cbt.x + cbt.w / 2, cbt.y + cbt.h / 2 + d); } }
      { const lpb = locPill(G); if (lpb) { const LCc = LOCS[S.loc]; g.fillStyle = 'rgba(4,7,14,.82)'; g.strokeStyle = 'rgba(232,182,86,.6)'; g.lineWidth = d; rr(lpb.x, lpb.y, lpb.w, lpb.h, lpb.h / 2); g.fill(); g.stroke();
          g.fillStyle = '#ffe29a'; g.font = `800 ${12 * d}px Inter, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText((galView() ? '🌌 ' + curGal().name : LCc.ic + ' ' + LCc.n) + (S.lp ? '  ▴' : '  ▾'), lpb.x + lpb.w / 2, lpb.y + lpb.h / 2 + d);
          for (const r of locRows(G)) { if (r.id === 'gal') { const own = S.gx.gals.length, c = galCost(0), ok = own || canPay(c), cur = galView();
              g.fillStyle = cur ? 'rgba(232,182,86,.25)' : 'rgba(10,6,30,.95)'; g.strokeStyle = cur ? '#e8b656' : 'rgba(192,132,252,.5)'; rr(r.x, r.y, r.w, r.h, 10 * d); g.fill(); g.stroke();
              g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `700 ${13 * d}px Inter, sans-serif`; g.fillText('🌌  Galaxisok', r.x + 12 * d, r.y + r.h / 2 + d);
              g.textAlign = 'right'; g.font = `700 ${11 * d}px Inter, sans-serif`; g.fillStyle = cur ? '#ffe29a' : own ? '#c084fc' : ok ? '#ffe29a' : '#ff8a7a'; g.fillText(cur ? 'Itt vagy' : own ? 'Megnyitás' : costTxt(c), r.x + r.w - 12 * d, r.y + r.h / 2 + d, r.w * .62); g.textAlign = 'center'; continue; }
            const L2 = LOCS[r.id], have = S.unl.includes(r.id), cur = r.id === S.loc, c = launchCost(r.id), nk = launchNek(r.id), cq = launchCp(r.id), ok = have || canPay({ c, ck: nk, cc: cq });
            const curL = cur && !galView(); g.fillStyle = curL ? 'rgba(232,182,86,.25)' : 'rgba(4,7,14,.92)'; g.strokeStyle = cur ? '#e8b656' : 'rgba(255,255,255,.15)'; rr(r.x, r.y, r.w, r.h, 10 * d); g.fill(); g.stroke();
            g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `700 ${13 * d}px Inter, sans-serif`; g.fillText(L2.ic + '  ' + L2.n, r.x + 12 * d, r.y + r.h / 2 + d);
            g.textAlign = 'right'; g.font = `700 ${11 * d}px Inter, sans-serif`; g.fillStyle = cur ? '#ffe29a' : have ? '#9fd6f5' : ok ? '#ffe29a' : '#ff8a7a';
            g.fillText(cur && !galView() ? 'Itt vagy · +' + fmt(NET.inc) + ' Ft/mp' : have ? '+' + fmt((S.lr && S.lr[r.id] ? S.lr[r.id][0] : 0)) + ' Ft/mp · Átváltás' : '🚀 ' + fmt(c) + ' Ft + ' + nfmt(nk) + '🍯' + (cq.gt(0) ? ' + ' + nfmt(cq) + '✨' : ''), r.x + r.w - 12 * d, r.y + r.h / 2 + d, r.w * .62); g.textAlign = 'center'; } } }
      if (DN.n > 0 && (drag || DN.t > 0)) { const lab = (DN.k === 'pipe' ? DN.n + '. cső' : DN.n + ' db' + (rangeOf(DN.k) ? ' · ' + (2 * rangeOf(DN.k) + szOf(DN.k)) + ' mezőnként' : '')) + ' · ' + fmt(DN.c) + ' Ft'; g.save(); g.globalAlpha = drag ? 1 : Math.min(1, DN.t); g.font = `800 ${13 * d}px Inter, sans-serif`; const tw3 = g.measureText(lab).width + 18 * d, lx = Math.min(G.W - tw3 - 6 * d, DN.x + 18 * d), ly = Math.max(6 * d, DN.y - 40 * d);
        g.fillStyle = 'rgba(4,7,14,.9)'; g.strokeStyle = '#e8b656'; g.lineWidth = d; rr(lx, ly, tw3, 24 * d, 12 * d); g.fill(); g.stroke(); g.fillStyle = '#ffe29a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(lab, lx + tw3 / 2, ly + 12 * d + d); g.restore(); }
      if (S.bgMsg && S.bgMsg.l > 0) { g.globalAlpha = Math.min(1, S.bgMsg.l); g.font = `700 ${12 * d}px Inter, sans-serif`; const tw2 = g.measureText(S.bgMsg.t).width + 24 * d, bx = (G.W - tw2) / 2, by = L.barY - 70 * d;
        g.fillStyle = 'rgba(4,7,14,.88)'; g.strokeStyle = 'rgba(159,214,245,.6)'; g.lineWidth = d; rr(bx, by, tw2, 26 * d, 13 * d); g.fill(); g.stroke(); g.fillStyle = '#9fd6f5'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(S.bgMsg.t, G.W / 2, by + 13 * d + d); g.globalAlpha = 1; }
      if (S.anim) { const a = S.anim, k = a.t / a.dur, fade = Math.max(0, 1 - Math.abs(k - .55) / .3);
        if (a.launch) { const ry = G.H * 1.05 - (k ** 2.2) * (G.H * 1.4), rx = G.W / 2, s2 = 40 * d;
          g.fillStyle = `rgba(2,4,10,${Math.min(.85, k * 1.2)})`; g.fillRect(0, 0, G.W, G.H);
          for (let j = 0; j < 26; j++) { const ph = (j / 26 + a.t * 1.7) % 1; g.fillStyle = `rgba(220,220,230,${.35 * (1 - ph)})`; g.beginPath(); g.arc(rx + Math.sin(j * 2.3) * s2 * ph * 1.4, ry + s2 * 1.6 + ph * s2 * 5, s2 * (.3 + ph * .9), 0, 6.283); g.fill(); }
          const fl = g.createLinearGradient(0, ry + s2 * .9, 0, ry + s2 * 2.6); fl.addColorStop(0, '#fff6c8'); fl.addColorStop(.4, '#ffb347'); fl.addColorStop(1, 'rgba(255,90,30,0)'); g.fillStyle = fl; g.beginPath(); g.moveTo(rx - s2 * .28, ry + s2 * .9); g.lineTo(rx, ry + s2 * (2.2 + .4 * Math.sin(a.t * 40))); g.lineTo(rx + s2 * .28, ry + s2 * .9); g.fill();
          g.fillStyle = '#e7eef4'; g.beginPath(); g.moveTo(rx, ry - s2 * 1.3); g.quadraticCurveTo(rx + s2 * .45, ry - s2 * .6, rx + s2 * .38, ry + s2 * .9); g.lineTo(rx - s2 * .38, ry + s2 * .9); g.quadraticCurveTo(rx - s2 * .45, ry - s2 * .6, rx, ry - s2 * 1.3); g.fill();
          g.fillStyle = '#e5533d'; g.beginPath(); g.moveTo(rx, ry - s2 * 1.3); g.quadraticCurveTo(rx + s2 * .3, ry - s2 * 1, rx + s2 * .32, ry - s2 * .7); g.lineTo(rx - s2 * .32, ry - s2 * .7); g.quadraticCurveTo(rx - s2 * .3, ry - s2 * 1, rx, ry - s2 * 1.3); g.fill();
          for (const sg of [-1, 1]) { g.beginPath(); g.moveTo(rx + sg * s2 * .36, ry + s2 * .3); g.lineTo(rx + sg * s2 * .75, ry + s2 * 1.05); g.lineTo(rx + sg * s2 * .36, ry + s2 * .85); g.fill(); }
          g.fillStyle = '#6cc6ff'; g.beginPath(); g.arc(rx, ry - s2 * .25, s2 * .16, 0, 6.283); g.fill(); g.strokeStyle = '#e8b656'; g.lineWidth = 2 * d; g.stroke();
          g.fillStyle = '#ffe29a'; g.font = `800 ${20 * d}px Inter, sans-serif`; g.fillText('🚀 Úti cél: ' + LOCS[a.to].n, G.W / 2, G.H * .3); }
        g.fillStyle = `rgba(0,0,0,${fade})`; g.fillRect(0, 0, G.W, G.H); }
      if (S.away && S.away.l > 0) {
        const a = Math.min(1, S.away.l), w = Math.min(340 * d, G.W - 40 * d), h = 92 * d, x = (G.W - w) / 2, y = L.by + 20 * d;
        g.globalAlpha = a; g.fillStyle = 'rgba(4,7,14,.92)'; g.strokeStyle = '#e8b656'; g.lineWidth = 1.5 * d; rr(x, y, w, h, 14 * d); g.fill(); g.stroke();
        const hh = Math.floor(S.away.sec / 3600), mm = Math.floor(S.away.sec % 3600 / 60);
        g.fillStyle = 'rgba(255,255,255,.7)'; g.font = `600 ${12 * d}px Inter, sans-serif`; g.fillText(S.away.msg ? 'Új birtok' : `Távol voltál: ${hh ? hh + ' ó ' : ''}${mm} perc`, G.W / 2, y + 24 * d);
        g.fillStyle = '#ffe29a'; g.font = `800 ${22 * d}px Inter, sans-serif`; g.fillText(S.away.msg || (S.away.got && B(S.away.got).gt(0) ? '+' + fmt(S.away.got) + ' Ft' : 'A termés vár rád 🌾'), G.W / 2, y + 56 * d);
        g.globalAlpha = 1;
      }
    }
  };
})();

