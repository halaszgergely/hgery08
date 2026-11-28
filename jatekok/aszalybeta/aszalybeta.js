/* HGWS Arcade – Aszálytúlélő: A Nagy Szárazság (zárt béta, a régi Aszálytúlélő motorján; ranglista nélkül)
   új ellenségek (jatekok/aszalybeta/rajz.js), 6 karakter saját fegyverrel, egyórás menet, Szilárd haragja és az Aszály Istene
   (klasszikus szkript, az arcade.html tölti be; a közös keret a jatekok/arcade/mag.js) */
'use strict';
const AszalyBeta = (() => {
  const TAU = Math.PI * 2, MAXLV = 5, CS = 48, K = {}, V = { sc: 1, hw: 0, hh: 0, ring: 0 }, GR = new Map(), MAXW = 6, MAXP = 6;
  let ART = null, artMiss = 1, artDirty = 0;
  let S = null, joy = null, SPR = null, sprSc = 0, TILE = null, VIG = null, PORT = null, portD = 0;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmtT = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ellenségek: élet, sebesség, sebzés, sugár, csepp (XP), pont */
  /* ellenségek (a Nagy Szárazság öt családja): élet, sebesség, sebzés, sugár, csepp (XP), pont, család, viselkedés, súly */
  const ET = {
    ghoul: { hp: 5, sp: 60, dmg: 5, r: 13, xp: 1, pt: 10, f: 'kert', ai: 'chase', w: 3, n: 'Aszott földműves' },
    szalmabab: { hp: 12, sp: 80, dmg: 7, r: 15, xp: 2, pt: 22, f: 'kert', ai: 'charge', w: 2, n: 'Szalmabáb-őr' },
    tovis: { hp: 12, sp: 0, dmg: 7, r: 15, xp: 2, pt: 22, f: 'kert', ai: 'trap', w: 1, n: 'Tövisinda' },
    hollok: { hp: 5, sp: 132, dmg: 5, r: 13, xp: 1, pt: 10, f: 'kert', ai: 'wobble', w: 3, pack: 6, flap: 1, n: 'Hamuhollók' },
    farkas: { hp: 12, sp: 104, dmg: 7, r: 15, xp: 2, pt: 22, f: 'kert', ai: 'flank', w: 2, pack: 3, n: 'Szikkadt farkas' },
    vadkan: { hp: 52, sp: 80, dmg: 14, r: 20, xp: 5, pt: 70, f: 'kert', ai: 'charge', w: 1, n: 'Tövishátú vadkan' },
    porliderc: { hp: 12, sp: 60, dmg: 7, r: 15, xp: 2, pt: 22, f: 'kert', ai: 'wobble', w: 2, ghost: 1, n: 'Porlidérc' },
    banya: { hp: 26, sp: 42, dmg: 10, r: 16, xp: 3, pt: 42, f: 'kert', ai: 'summon', w: 1, sum: 'tovis', n: 'Gyökérbanya' },
    futo: { hp: 12, sp: 132, dmg: 7, r: 15, xp: 2, pt: 22, f: 'sivatag', ai: 'ranged', w: 2, n: 'Pusztai gyíkfutó' },
    sogolem: { hp: 110, sp: 42, dmg: 19, r: 23, xp: 8, pt: 106, f: 'sivatag', ai: 'chase', w: 1, n: 'Sókristály-gólem' },
    delibab: { hp: 12, sp: 104, dmg: 7, r: 15, xp: 2, pt: 22, f: 'sivatag', ai: 'wobble', w: 2, ghost: 1, n: 'Délibáb-lovas' },
    keselyuember: { hp: 12, sp: 104, dmg: 7, r: 15, xp: 2, pt: 22, f: 'sivatag', ai: 'charge', w: 2, n: 'Keselyű-dögész' },
    obeliszk: { hp: 52, sp: 0, dmg: 14, r: 20, xp: 5, pt: 70, f: 'sivatag', ai: 'ranged', w: 1, n: 'Napszem-obeliszk' },
    szkarabeusz: { hp: 26, sp: 80, dmg: 10, r: 16, xp: 3, pt: 42, f: 'sivatag', ai: 'charge', w: 2, spin: 1, n: 'Bronzszkarabeusz' },
    skorpio: { hp: 52, sp: 60, dmg: 14, r: 20, xp: 5, pt: 70, f: 'sivatag', ai: 'ranged', w: 1, n: 'Kőfarkú skorpió' },
    ijasz: { hp: 12, sp: 80, dmg: 7, r: 15, xp: 2, pt: 22, f: 'sivatag', ai: 'ranged', w: 2, n: 'Nomád íjász' },
    zsoldos: { hp: 26, sp: 60, dmg: 10, r: 16, xp: 3, pt: 42, f: 'varos', ai: 'chase', w: 3, n: 'Szomjas zsoldos' },
    adoszedo: { hp: 26, sp: 60, dmg: 10, r: 16, xp: 3, pt: 42, f: 'varos', ai: 'chase', w: 1, n: 'Vízadó-szedő' },
    mag: { hp: 26, sp: 60, dmg: 10, r: 16, xp: 3, pt: 42, f: 'varos', ai: 'chase', w: 2, n: 'Máglyapap' },
    kopo: { hp: 12, sp: 132, dmg: 7, r: 15, xp: 2, pt: 22, f: 'varos', ai: 'flank', w: 2, pack: 2, n: 'Parázskopó' },
    kutmimik: { hp: 52, sp: 0, dmg: 14, r: 20, xp: 5, pt: 70, f: 'varos', ai: 'trap', w: 1, n: 'Kútmimik' },
    szamszerij: { hp: 12, sp: 42, dmg: 7, r: 15, xp: 2, pt: 22, f: 'varos', ai: 'ranged', w: 2, n: 'Várfali számszeríjász' },
    hirnok: { hp: 26, sp: 80, dmg: 10, r: 16, xp: 3, pt: 42, f: 'varos', ai: 'summon', w: 1, n: 'Tilalmi hírnök' },
    pajzsfal: { hp: 110, sp: 42, dmg: 19, r: 23, xp: 8, pt: 106, f: 'varos', ai: 'chase', w: 1, n: 'Pajzsfal-őr' },
    csontnaga: { hp: 52, sp: 80, dmg: 14, r: 20, xp: 5, pt: 70, f: 'meder', ai: 'chase', w: 2, n: 'Csontnaga' },
    iszap: { hp: 26, sp: 60, dmg: 10, r: 16, xp: 3, pt: 42, f: 'meder', ai: 'split', w: 2, n: 'Iszapkísértet' },
    raklovag: { hp: 52, sp: 60, dmg: 14, r: 20, xp: 5, pt: 70, f: 'meder', ai: 'chase', w: 1, n: 'Rákpáncélos lovag' },
    zsilip: { hp: 110, sp: 42, dmg: 19, r: 23, xp: 8, pt: 106, f: 'meder', ai: 'chase', w: 1, n: 'Zsilipőr' },
    reves: { hp: 12, sp: 60, dmg: 7, r: 15, xp: 2, pt: 22, f: 'meder', ai: 'wobble', w: 2, ghost: 1, n: 'Fulladt révész' },
    nimfa: { hp: 26, sp: 60, dmg: 10, r: 16, xp: 3, pt: 42, f: 'meder', ai: 'chase', w: 1, n: 'Szikkadt nimfa' },
    pioca: { hp: 12, sp: 60, dmg: 7, r: 15, xp: 2, pt: 22, f: 'meder', ai: 'chase', w: 2, n: 'Óriáspióca' },
    kultista: { hp: 26, sp: 60, dmg: 10, r: 16, xp: 3, pt: 42, f: 'halo', ai: 'heal', w: 1, n: 'Árnyprotokoll-kultista' },
    lancoslovag: { hp: 52, sp: 60, dmg: 14, r: 20, xp: 5, pt: 70, f: 'halo', ai: 'chase', w: 1, n: 'Láncra vert lovag' },
    runaszem: { hp: 12, sp: 80, dmg: 7, r: 15, xp: 2, pt: 22, f: 'halo', ai: 'ranged', w: 2, n: 'Megfigyelő rúnaszem' },
    hibagolem: { hp: 52, sp: 60, dmg: 14, r: 20, xp: 5, pt: 70, f: 'halo', ai: 'tele', w: 1, n: 'Hibakód-gólem' },
    letraor: { hp: 12, sp: 60, dmg: 7, r: 15, xp: 2, pt: 22, f: 'halo', ai: 'chase', w: 2, n: 'Bukott létraőr' },
    kodliderc: { hp: 12, sp: 80, dmg: 7, r: 15, xp: 2, pt: 22, f: 'halo', ai: 'wobble', w: 2, n: 'Kódlidérc' },
    tonpecset: { hp: 5, sp: 0, dmg: 5, r: 13, xp: 1, pt: 10, f: 'halo', ai: 'trap', w: 1, n: 'TON-pecsét' },
    arnyfarkas: { hp: 26, sp: 132, dmg: 10, r: 16, xp: 3, pt: 42, f: 'halo', ai: 'flank', w: 2, pack: 3, n: 'Árnyfarkas' },
    watchdog: { hp: 2600, sp: 74, dmg: 20, r: 34, xp: 0, pt: 1500, boss: 1, art: 'wdk', sz: 120, n: 'Watchdog Lovag' },
    kiraly: { hp: 5800, sp: 60, dmg: 24, r: 38, xp: 0, pt: 2500, boss: 1, art: 'kk', sz: 130, n: 'Kaktuszkirály' },
    ladder: { hp: 9000, sp: 58, dmg: 24, r: 34, xp: 0, pt: 3500, boss: 1, art: 'ldm', sz: 120, n: 'Ladder Mester' },
    fereg: { hp: 14500, sp: 150, dmg: 30, r: 40, xp: 0, pt: 4500, boss: 1, art: 'hf', sz: 150, n: 'Homokféreg' },
    boszi: { hp: 20000, sp: 68, dmg: 28, r: 34, xp: 0, pt: 6000, boss: 1, art: 'stw', sz: 120, n: 'Structured Text Boszorkány' },
    szilard: { hp: 32000, sp: 54, dmg: 32, r: 36, xp: 0, pt: 10000, boss: 1, final: 1, art: 'szl', sz: 130, n: 'Szikkadt Szilárd' },
    isten: { hp: 380000, sp: 30, dmg: 40, r: 95, xp: 0, pt: 0, boss: 1, god: 1, art: 'god', sz: 420, n: 'Szikkadt Szilárd, az Aszály Istene' }
  };
  const FAMS = ['kert', 'sivatag', 'varos', 'meder', 'halo'], FAM_T = [0, 6, 12, 18, 24];
  const FCOL = { kert: '150,160,80', sivatag: '207,174,116', varos: '160,120,100', meder: '110,150,140', halo: '150,90,170' };
  const BOSSQ = [[5, 'watchdog'], [10, 'kiraly'], [15, 'ladder'], [20, 'fereg'], [25, 'boszi'], [30, 'szilard']];

  /* fejlesztések: w = fegyver (szintenkénti leírás), a többi passzív; evo = fejlődött fegyver; mx = szintkorlát */
  const UP = {
    pisztoly: { n: 'Vízpisztoly', w: 1, d: ['A legközelebbi ellenségre lő', '+1 lövedék', 'Átüt még egy ellenségen', '+1 lövedék', 'Gyorsabb tüzelés, +1 átütés'] },
    szoro: { n: 'Szórófej', w: 1, d: ['Körülötted keringő vízcseppek', '+1 csepp, erősebb', '+1 csepp, erősebb', '+1 csepp, erősebb', '+1 csepp, erősebb'] },
    kasza: { n: 'Aszálykasza', w: 1, d: ['Széles kaszacsapás előtted', 'Nagyobb ív, erősebb', 'Gyorsabb', 'Szinte körbe arat', 'Kettős csapás'] },
    kalapacs: { n: 'Szivattyúkalapács', w: 1, d: ['Lecsapó kalapács: lökéshullám és kábítás', 'Nagyobb hullám', 'Erősebb, tovább kábít', 'Gyakoribb', 'Két becsapódás'] },
    kard: { n: 'Vízpenge', w: 1, d: ['Hármas kardkombó a legközelebbire', 'Nagyobb pengeív', 'Gyorsabb kombó', 'Négyes kombó', 'Erősebb, a végén szúrás'] },
    lanc: { n: 'Láncos csőgolyó', w: 1, d: ['Nehéz golyó pörög láncon körülötted', 'Nagyobb golyó, erősebb', 'Gyorsabban pörög', 'Hosszabb lánc', 'Hatalmas lökés'] },
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
    csizma: { n: 'Gumicsizma', d: '+12% mozgási sebesség' },
    vitamin: { n: 'Tápoldat', d: '+25 max. élet és gyógyulás' },
    magnes: { n: 'Cseppmágnes', d: '+45% gyűjtési távolság' },
    nyomas: { n: 'Nyomásfokozó', d: '+15% sebzés' },
    idozito: { n: 'Öntözőóra', d: '−8% töltési idő' },
    fuvoka: { n: 'Széles fúvóka', d: '+13% hatóterület' },
    kesztyu: { n: 'Kerti kesztyű', d: '−1,5 kapott sebzés' },
    gyujto: { n: 'Esővíz-gyűjtő', d: '+0,45 élet/mp' },
    tartaly: { n: 'Tartalék tartály', d: '+1 lövedék a lövedékes fegyverekre', mx: 2 },
    lohere: { n: 'Négylevelű lóhere', d: 'Több ritka csepp, 5. szinten 4 kártya' },
    hosszabbito: { n: 'Hosszabbító', d: '+20% időtartam' },
    pajzs: { n: 'Vízpajzs', d: '+20 pajzs: elnyeli a sebzést, 3 mp nyugalom után visszatöltődik' },
    vert: { n: 'Bádogvért', d: '+2 páncél, −3% sebesség', mx: 3 },
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
    csatorna: { n: 'ÖNTÖZŐCSATORNA', w: 1, evo: 1, from: 'cso', d: 'Széles, hosszan sebző és lassító vízcsatorna' },
    /* saját fegyverek: csak a saját karakterük kapja meg */
    aranyfej: { n: 'Arany locsolófej', w: 1, mx: 8, sig: 'gh', d: ['Forgó, átütő aranysugarak', '+1 sugár', 'Messzebb ér, gyorsabban forog', '+1 sugár, erősebb', 'Kritikus találatok', '+1 sugár', 'Gyorsabb forgás, erősebb', 'Átütőbb, nagyobb kritikus esély'] },
    rele: { n: 'Relékocka', w: 1, mx: 8, sig: 'rl', d: ['Keringő kocka, ami rálő a legközelebbire', '+1 kocka', 'Gyorsabb tüzelés', '+1 kocka, átütés', '+1 kocka, erősebb', 'Erősebb lövések', 'Gyorsabb tüzelés', 'Átütő lövések, erősebb'] },
    veszgomb: { n: 'Vészleállító', w: 1, mx: 8, sig: 'gt', d: ['Megállító mező: sebez és megfagyaszt', 'Nagyobb mező', 'Erősebb, tovább fagyaszt', 'Gyakoribb', 'Egyszerre két mező', 'Nagyobb mező', 'Gyakoribb, erősebb', 'Három mező egyszerre'] },
    pid: { n: 'PID-örvény', w: 1, mx: 8, sig: 'kt', d: ['Vízörvény-legyező; ismételt találatnál erősödik', 'Gyorsabban erősödik', '+1 legyező', 'Szélesebb, messzebb ér', '+1 legyező, erősebb', 'Gyorsabb örvény', 'Szélesebb legyező', '+1 legyező, erősebb'] },
    ak63: { n: 'Magas nyomású AK63', w: 1, mx: 8, sig: 'zr', d: ['Gyors sorozat a legközelebbire', '+2 lövés a sorozatban', 'Átüt egy ellenségen', 'Gyakoribb sorozat', '+3 lövés, hátralökés', '+2 lövés', 'Gyorsabb sorozat', 'Átütőbb, erősebb'] },
    pkm: { n: 'Magas nyomású PKM', w: 1, mx: 8, sig: 'bt', d: ['Folyamatos géppuskatűz', 'Erősebb lövedékek', 'Pontosabb, gyorsabb', 'Két csőből tüzel', 'Lassító, átütő lövedékek', 'Erősebb lövedékek', 'Gyorsabb tűz', 'Három csőből tüzel'] },
    aratas: { n: 'NAGY ARATÁS', w: 1, evo: 1, from: 'kasza', d: 'Két teljes körű aranykasza-csapás, ami mindent letarol' },
    foldindulas: { n: 'FÖLDINDULÁS', w: 1, evo: 1, from: 'kalapacs', d: 'Hármas becsapódás egyre nagyobb rengéshullámokkal' },
    hullampenge: { n: 'HULLÁMPENGE', w: 1, evo: 1, from: 'kard', d: 'Minden vágás repülő vízsarlót is kilő' },
    orveny_lanc: { n: 'ÖRVÉNYLÁNC', w: 1, evo: 1, from: 'lanc', d: 'Két óriási golyó és behúzó örvény' },
    aranyfejevo: { n: 'AZ ARANY LOCSOLÓFEJ', w: 1, evo: 1, from: 'aranyfej', d: 'Kilenc aranysugár, 10 mp-enként gyógyító aranyhullám' },
    releevo: { n: 'ZÁRT SZABÁLYKÖR', w: 1, evo: 1, from: 'rele', d: 'Öt kocka, köztük sebző áramvonalak' },
    veszevo: { n: 'VÉSZLEÁLLÍTÓ HÁLÓZAT', w: 1, evo: 1, from: 'veszgomb', d: 'Három óriási mező, 30 mp-enként minden megáll' },
    pidevo: { n: 'TÖKÉLETES SZABÁLYOZÁS', w: 1, evo: 1, from: 'pid', d: 'Állandó örvény körülötted, a legerősebbet külön sebzi' },
    ak63evo: { n: 'ARANYSEPRŰ', w: 1, evo: 1, from: 'ak63', d: 'Hosszú sorozatok, utánuk söprő aranyseprű-csapás' },
    pkmevo: { n: 'GOLYÓZÁPOR', w: 1, evo: 1, from: 'pkm', d: 'Előre-hátra tüzel, minden lövedék mindenen átüt' }
  };
  /* evolúciók: fegyver (5. szint) + passzív (≥1) + boss kincse */
  const EVOR = [['pisztoly', 'nyomas', 'vizagyu'], ['por', 'nyomas', 'vizagyu'], ['szoro', 'fuvoka', 'korforgo'], ['ostor', 'csizma', 'tuzolto'], ['bomba', 'idozito', 'bombazapor'],
    ['felho', 'magnes', 'zivatar'], ['pocsolya', 'vitamin', 'gyogyforras'], ['sugar', 'kesztyu', 'hidromonitor'], ['rainbird', 'gyujto', 'ontozohid'], ['kanna', 'tartaly', 'kannavihar'],
    ['gejzir', 'hosszabbito', 'gejzirmezo'], ['jeg', 'lohere', 'jegeso'], ['heli', 'tartaly', 'legiflotta'], ['cso', 'hosszabbito', 'csatorna'],
    ['kasza', 'kesztyu', 'aratas'], ['kalapacs', 'vitamin', 'foldindulas'], ['kard', 'nyomas', 'hullampenge'], ['lanc', 'csizma', 'orveny_lanc'],
    ['aranyfej', 'lohere', 'aranyfejevo'], ['rele', 'idozito', 'releevo'], ['veszgomb', 'kesztyu', 'veszevo'], ['pid', 'fuvoka', 'pidevo'], ['ak63', 'nyomas', 'ak63evo'], ['pkm', 'tartaly', 'pkmevo']];
  /* karakterek */
  const CH = [
    { id: 'gh', n: 'Gergő, a HGWS-től', w: 'aranyfej', b: '+10% XP' },
    { id: 'rl', n: 'Relé', w: 'rele', b: '+10% hatóterület' },
    { id: 'gt', n: 'Gergő, a Tanácsból', w: 'veszgomb', b: '+1 páncél, +20 max. élet' },
    { id: 'kt', n: 'Kitty', w: 'pid', b: '+8% mozgási sebesség' },
    { id: 'zr', n: 'Zero', w: 'ak63', b: '−10% töltési idő' },
    { id: 'bt', n: 'Botond', w: 'pkm', b: '+30 max. élet, −6% sebesség' }
  ];
  /* Tanácsi Kút: maradandó fejlesztések aranyért (az arany ritkán esik a pályán) */
  const META = [
    { id: 'hp', n: 'Mélyebb kút', d: '+10 max. élet', mx: 5, c: 8 }, { id: 'dmg', n: 'Erősebb nyomás', d: '+5% sebzés', mx: 5, c: 10 },
    { id: 'spd', n: 'Könnyű csizma', d: '+3% sebesség', mx: 5, c: 8 }, { id: 'mag', n: 'Vízérzék', d: '+10% gyűjtési távolság', mx: 5, c: 6 },
    { id: 'arm', n: 'Vastag kesztyű', d: '+1 páncél', mx: 3, c: 18 }, { id: 'reg', n: 'Esővíz-tároló', d: '+0,2 élet/mp', mx: 3, c: 14 },
    { id: 'cd', n: 'Pontos óra', d: '−3% töltési idő', mx: 5, c: 12 }, { id: 'xp', n: 'Tapasztalat', d: '+5% XP', mx: 5, c: 10 },
    { id: 'rr', n: 'Új sorsolás', d: '+1 újrasorsolás körönként', mx: 3, c: 15 }, { id: 'gold', n: 'Aranyér', d: '+25% arany', mx: 3, c: 20 },
    { id: 'area', n: 'Széles permet', d: '+5% hatóterület', mx: 2, c: 25 }, { id: 'dur', n: 'Lassú párolgás', d: '+10% időtartam', mx: 2, c: 22 },
    { id: 'amt', n: 'Ikerfúvóka', d: '+1 lövedék a lövedékes fegyverekre', mx: 1, c: 120 }, { id: 'luck', n: 'Négylevelű kert', d: '+10% szerencse', mx: 3, c: 16 },
    { id: 'cap', n: 'Mesterfok', d: '+1 maximális szint minden fegyvernek és tárgynak', mx: 2, c: 120 },
    { id: 'shield', n: 'Kútpajzs', d: '+15 visszatöltődő pajzs', mx: 3, c: 20 },
    { id: 'rev', n: 'Forrásvíz', d: 'Egyszer feltámadsz fél élettel', mx: 1, c: 150 }, { id: 'curse', n: 'Szilárd átka', d: '+10% ellenség, +5% XP és arany', mx: 5, c: 6 }
  ];
  const metaGet = () => { try { return JSON.parse(localStorage.getItem('hgws_aszb_meta') || '{}') || {}; } catch (_) { return {}; } };
  const metaSet = m => { try { localStorage.setItem('hgws_aszb_meta', JSON.stringify(m)); } catch (_) {} };
  const ml = k => (S && S.meta ? S.meta : metaGet())[k] || 0;
  const mCost = (u, l) => Math.round(u.c * 2.5 * (l + 1) * (1 + l * .25));
  function buyMeta(i) { const u = META[i]; if (!u) return; const m = metaGet(), l = m[u.id] || 0, g = store.get('aszb_gold'), c = mCost(u, l);
    if (l >= u.mx || g < c) { S.shop.shake = .3; S.shop.i = i; Sfx.blip(150, .15, 'square', .05, .7); return; }
    m[u.id] = l + 1; metaSet(m); store.set('aszb_gold', g - c); S.meta = m; S.shop.i = i; stats(); Sfx.coin(); }
  const chOpen = () => true;
  /* mentés: a kör állása időnként a böngészőbe kerül; kilépés vagy összeomlás után a karakterválasztóban folytatható */
  const SAVE = 'hgws_aszb_save';
  const saveGet = () => { try { const d = JSON.parse(localStorage.getItem(SAVE) || 'null'); return d && d.v === 1 ? d : null; } catch (_) { return null; } };
  const clearSave = () => { try { localStorage.removeItem(SAVE); } catch (_) {} };
  function saveRun(G) {
    if (!S || S.sel || !S.started || S.over || S.ph === 'win' || S.ph === 'descent' || !(S.P.hp > 0)) return;
    const b = S.bossE && !S.bossE.dead ? S.bossE : null, P = S.P, c = S.choose;
    const d = { v: 1, at: Date.now(), score: G.score, ch: S.ch, t: S.t, P: { x: P.x, y: P.y, hp: P.hp, lvl: P.lvl, xp: P.xp, need: P.need },
      up: S.up, evd: S.evd, evoN: S.evoN, rr: S.rr, rev: S.rev, gold: S.gold, kills: S.kills, bossN: S.bossN, bi: S.bi, bossCD: S.bossCD, minute: S.minute,
      ph: S.ph, phT: S.phT, szN: S.szN, szKill: S.szKill, dmgBy: S.dmgBy, fused: S.fused, fz: S.fz, fzW: S.fzW, pending: S.pending + (c && !c.evo ? 1 : 0), evoQ: S.evoQ.concat(c && c.evo ? [c.evo] : []),
      boss: b ? { k: b.type, f: b.hp / b.mhp, shN: b.shN || 0, sh: b.shield ? 1 : 0 } : null };
    try { localStorage.setItem(SAVE, JSON.stringify(d)); } catch (_) {}
  }
  function loadRun(G) {
    const d = saveGet(); if (!d) return;
    Object.assign(S, { ch: d.ch, t: d.t, up: d.up, evd: d.evd || {}, evoN: d.evoN || 0, rr: d.rr, rev: d.rev || 0, gold: d.gold || 0, kills: d.kills || 0, bossN: d.bossN || 0, bi: d.bi || 0, bossCD: d.bossCD || 0,
      minute: d.minute || 0, ph: d.ph || 'run', phT: d.phT || 0, szN: d.szN || 0, szKill: d.szKill || 0, dmgBy: d.dmgBy || {}, fused: d.fused || [], fz: d.fz || '', fzW: d.fzW || '', pending: d.pending || 0, evoQ: d.evoQ || [], sel: null, shop: null, started: 1, meta: metaGet() });
    Object.assign(S.P, d.P); S.sigK = sigKeys(); stats(); S.P.hp = Math.min(S.P.mhp, d.P.hp); G.score = d.score || 0; S.dirty = 1;
    if (S.ph === 'wrath') S.wk = clamp(1 - S.phT / 240, 0, 1);
    if (S.ph === 'god' || (d.boss && d.boss.k === 'isten')) { godSpawn(G); const e = S.bossE; e.dsc = 0; e.hp = e.mhp * d.boss.f; e.shN = d.boss.sh ? Math.max(0, d.boss.shN - 1) : d.boss.shN; S.banner = null; S.say = null; }
    else if (d.boss) { if (d.boss.k === 'szilard') szSpawn(G); else spawnBoss(G, d.boss.k); const e = S.bossE; if (e) e.hp = e.mhp * d.boss.f; S.banner = null; S.say = null; }
    S.paused = 1; S.saveT = 10; Sfx.coin(); hud();
  }
  const contBtn = G => { const k = kutBtn(G); return { x: k.x, y: k.y + k.h + 10 * G.d, w: k.w, h: k.h }; }; /* zárt béta: minden karakter elérhető */
  const TAUNT = ['Ez a kert az enyém lesz!', 'Még mindig locsolsz? Nevetséges.', 'A víz elfogy. Én maradok.', 'Minden virág elszárad egyszer!'];

  const lv = k => S.up[k] || 0;
  const bmx = k => UP[k].mx || MAXLV, mxl = k => bmx(k) + (UP[k].evo || UP[k].sp ? 0 : (S && S.meta && S.meta.cap) || 0);
  const isW = k => !!UP[k].w;
  const chr = () => S.ch;
  function stats() {
    const c = chr();
    const M = S.meta || {}, mv = k => M[k] || 0;
    S.st = { speed: 150 * (1 + .12 * lv('csizma') + .03 * mv('spd') - .03 * lv('vert')) * (c === 'bt' ? .94 : c === 'kt' ? 1.08 : 1), magnet: 62 * (1 + .45 * lv('magnes') + .1 * mv('mag') + (S.fz === 'heli' ? .5 : 0)), dmg: 1 + .15 * lv('nyomas') + .05 * mv('dmg'),
      cd: (1 - .08 * lv('idozito') - .03 * mv('cd')) * (c === 'zr' ? .9 : 1), area: (1 + .13 * lv('fuvoka') + .05 * mv('area')) * (c === 'rl' ? 1.1 : 1), dur: 1 + .2 * lv('hosszabbito') + .1 * mv('dur'),
      armor: 1.5 * lv('kesztyu') + 2 * lv('vert') + (c === 'gt' ? 1 : 0) + mv('arm'), regen: .45 * lv('gyujto') + .2 * mv('reg'), extra: lv('tartaly') + mv('amt'), luck: 1 + .3 * lv('lohere') + .1 * mv('luck'), xp: (c === 'gh' ? 1.1 : 1) + .05 * mv('xp') + (S.fz === 'heli' ? .2 : 0) + .05 * mv('curse'), gold: 1 + .25 * mv('gold') + .05 * mv('curse'), curse: 1 + .1 * mv('curse') };
    S.P.msh = 20 * lv('pajzs') + 15 * mv('shield'); S.P.sh = Math.min(S.P.sh || 0, S.P.msh);
    S.P.mhp = 100 + 25 * lv('vitamin') + (c === 'gt' ? 20 : c === 'bt' ? 30 : 0) + 10 * mv('hp');
  }
  function view(G) { V.sc = G.d * clamp(Math.min(G.W, G.H) / G.d / 640, .6, 1.15); V.hw = G.W / 2 / V.sc; V.hh = G.H / 2 / V.sc; V.ring = Math.hypot(V.hw, V.hh) + 50; }

  /* ---------- irányítás ---------- */
  const KEYS = { ArrowUp: 'U', w: 'U', W: 'U', ArrowDown: 'D', s: 'D', S: 'D', ArrowLeft: 'L', a: 'L', A: 'L', ArrowRight: 'R', d: 'R', D: 'R' };
  const mine = () => gEl.classList.contains('open') && G.game === me && S;
  // Esc/P: szünet (a keret Esc = bezárás kezelője elé fut)
  addEventListener('keydown', e => { if (mine() && G.running && S.shop && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); S.shop = null; return; } if (!mine() || !G.running || S.sel || S.over) return;
    if (e.key === 'Escape' || ((e.key === 'p' || e.key === 'P') && !e.repeat)) { e.preventDefault(); e.stopImmediatePropagation(); togglePause(); } }, true);
  addEventListener('keydown', e => { if (!mine()) return; const k = KEYS[e.key];
    if (S.shop) { if (/^[0-9]$/.test(e.key)) buyMeta((+e.key + 9) % 10); return; }
    if (S.sel && G.running && S.hasSave && (e.key === 'f' || e.key === 'F')) return loadRun(G);
    if (S.sel && G.running && (e.key === 'k' || e.key === 'K')) { S.shop = { t: 0, i: -1, shake: 0 }; S.meta = metaGet(); return; }
    if (S.sel && G.running) { const n = CH.length, cols = selCols(G);
      if (/^[1-6]$/.test(e.key)) return selPick(G, +e.key - 1);
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); return selPick(G, S.sel.i); }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') S.sel.i = (S.sel.i + 1) % n; else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') S.sel.i = (S.sel.i + n - 1) % n;
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') S.sel.i = (S.sel.i + cols) % n; else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') S.sel.i = (S.sel.i + n - cols % n) % n;
      if (k) e.preventDefault(); return; }
    if (k) { K[k] = 1; if (G.running) e.preventDefault(); }
    else if (G.running && S.fuse) { if (S.fuse.t >= .4) { if (/^[1-9]$/.test(e.key) && S.fuse.o[+e.key - 1]) doFuse(G, S.fuse.o[+e.key - 1]); else if (e.key === 'x' || e.key === 'X') { S.fuse = null; S.fzLater = S.P.lvl + 3; } } }
    else if (G.running && S.choose) { if (/^[1-4]$/.test(e.key)) pick(G, +e.key - 1); else if ((e.key === 'r' || e.key === 'R') && !e.repeat) reroll(); else if ((e.key === 'x' || e.key === 'X') && !e.repeat) skip(); } });
  addEventListener('keyup', e => { const k = KEYS[e.key]; if (k) K[k] = 0; });
  addEventListener('pagehide', () => { if (mine() && G.running) saveRun(G); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && mine() && G.running) saveRun(G); });
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
    const T = ET[type], P = S.P, m = S.t / 40, hm = (1 + Math.pow(m, 1.15) * .2) * (S.ph === 'wrath' ? 1.25 + S.wk * 1.25 : S.ph === 'god' ? 2.4 : 1);
    const hp = (T.boss ? T.hp * (1 + S.bossN * .04) : T.hp * hm) * mul;
    const e = { id: ++S.eid, type, T, x: P.x + ox, y: P.y + oy, hp, mhp: hp, r: T.r, sp: T.sp * (.9 + Math.random() * .2), flash: 0, kx: 0, ky: 0, slow: 0, freeze: 0, air: 0, oT: 0, rbT: 0, csT: 0, ph: Math.random() * 6, at: 1 + Math.random() * 2, side: Math.random() < .5 ? -1 : 1 };
    S.en.push(e); return e;
  }
  function pickType() {
    const m = S.t / 60, w = [];
    FAMS.forEach((f, i) => { const age = m - FAM_T[i]; if (age < 0 && S.ph === 'run') return; const fw = S.ph !== 'run' ? 1 : age < 6 ? 3 : age < 12 ? 1.4 : .6;
      for (const k in ET) { const T = ET[k]; if (T.f !== f || T.boss) continue; if (S.ph === 'run' && (T.hp >= 110 && age < 4 || T.hp >= 52 && age < 2)) continue; w.push([k, T.w * fw * (T.ai === 'ranged' ? .35 : 1)]); } });
    let r = Math.random() * w.reduce((a, x) => a + x[1], 0); for (const [k, v] of w) if ((r -= v) <= 0) return k; return 'ghoul';
  }
  function spawnOne(cap) {
    const k = pickType(), T = ET[k], n = T.pack || 1;
    if (T.ai === 'trap') { if (S.en.filter(o => o.T.ai === 'trap').length > 14) return; const a = Math.random() * TAU, R = 160 + Math.random() * Math.min(V.hw, V.hh) * .7, e = spawn(k, Math.cos(a) * R, Math.sin(a) * R); e.life = 25; return; }
    const [ox, oy] = edge(); for (let i = 0; i < n && S.en.length < cap; i++) spawn(k, ox + rnd(-30, 30), oy + rnd(-30, 30));
  }
  function banner(t, l = 2.6, c) { S.banner = { t, l, c }; }
  function spawnBoss(G, k) {
    if (k === 'szilard') return szSpawn(G);
    const e = spawn(k, ...edge()); if (k === 'fereg') { e.st = 'under'; e.stT = 2; e.under = 1; }
    S.bossE = e; banner(ET[k].n.toUpperCase() + '!', 3); G.shake = 12 * G.d; Sfx.boom(); [196, 147].forEach((f, i) => setTimeout(() => Sfx.blip(f, .35, 'sawtooth', .06, .8), i * 220));
  }
  function spawner(G, dt) {
    if (S.ph === 'descent' || S.ph === 'win') return;
    const cap = Math.round(clamp(Math.round(V.hw * V.hh / 420), 150, 300) * S.st.curse * (S.ph === 'bloom' ? .25 : S.ph === 'god' ? .45 : 1));
    S.sT -= dt;
    const rate = S.ph === 'bloom' ? 1.4 : S.ph === 'wrath' ? Math.max(.09, .2 - S.wk * .1) : S.ph === 'god' ? .55 : Math.max(.16, .5 - S.t * .0009);
    while (S.sT <= 0) { S.sT += rate / S.st.curse; for (let i = 0, n = 1 + Math.floor(Math.min(S.t, 2000) / 200); i < n && S.en.length < cap; i++) spawnOne(cap); }
    if (S.ph !== 'run' && S.ph !== 'wrath') return;
    // varjúraj
    if (S.t > 60 && (S.batT -= dt) <= 0) { S.batT = 26 + Math.random() * 10; const [ox, oy] = edge(); for (let i = 0, n = 8 + Math.floor(S.t / 120); i < n && S.en.length < cap + 20; i++) spawn('hollok', ox + rnd(-40, 40), oy + rnd(-40, 40)); }
    // bossok sorban: egyszerre csak egy, a következő a halála után legalább 30 mp-cel jön
    if (S.ph === 'run') { S.bossCD -= dt; if (!S.bossE && S.bossCD <= 0 && S.bi < BOSSQ.length && S.t >= BOSSQ[S.bi][0] * 60) spawnBoss(G, BOSSQ[S.bi++][1]); }
    const m = Math.floor(S.t / 60);
    if (m > S.minute) { S.minute = m;
      if (!S.bossE) { const fi = FAMS.reduce((a, f, i) => S.t / 60 >= FAM_T[i] ? i : a, 0), ks = Object.keys(ET).filter(k => ET[k].f === FAMS[fi] && ET[k].ai !== 'trap' && ET[k].hp <= 26), ty = ks[m % ks.length] || 'ghoul', n = 12 + Math.min(m, 40) * 2, a0 = Math.random() * TAU;
        for (let i = 0; i < n; i++) { const a = a0 + i / n * TAU; spawn(ty, Math.cos(a) * (V.hw + 40) * 1.42, Math.sin(a) * (V.hh + 40) * 1.42); } }
      if (S.ph === 'run' && (m === 3 || m === 8) && !S.szE) { S.taunt = { l: 3.2, txt: TAUNT[m === 3 ? 0 : 1], puff: 0 }; Sfx.blip(110, .5, 'sawtooth', .06, .5); }
      if (S.ph === 'run' && m >= 1 && m % 3 === 1) { if (Math.random() < .5) { S.heat = 20; banner('HŐHULLÁM!', 2.2); Sfx.blip(300, .6, 'sawtooth', .05, .4); }
        else { S.zapor = 20; S.rainT = Math.max(S.rainT, 4); for (const q of S.gems) q.pull = 1; banner('ZÁPOR! +10% XP', 2.2, '#6cc6ff'); Sfx.splash(); } } }
  }
  /* szakaszok: virágzás (1 perc) → Szilárd haragja (10 perc) → leereszkedés → az Aszály Istene */
  function phases(G, dt) {
    if (S.ph === 'bloom') { S.phT -= dt; S.green = Math.max(S.green, 1.5); if (S.phT <= 0) { S.ph = 'wrath'; S.phT = 240; S.wk = 0; S.green = 0; banner('SZILÁRD HARAGJÁNAK ASZÁLYA ELINDULT!', 5, '#ff7a2a'); G.shake = 14 * G.d; Sfx.boom(); [220, 185, 147, 110].forEach((f, i) => setTimeout(() => Sfx.blip(f, .4, 'sawtooth', .07, .7), i * 240)); } }
    else if (S.ph === 'wrath') { S.phT -= dt; S.wk = clamp(1 - S.phT / 240, 0, 1); S.dry = Math.max(S.dry, .4); if (S.phT <= 0) descent(G); }
    else if (S.ph === 'descent') { S.phT -= dt; S.dry = Math.max(S.dry, .4); if (S.phT <= 0) godSpawn(G); }
    for (const w of S.warns) { w.t += dt; if (w.t >= w.d) { w.dead = 1; blast(G, w); } }
    for (const b of S.bq) if ((b.t -= dt) <= 0) { b.dead = 1; b.f(); } S.bq = S.bq.filter(b => !b.dead);
    { const P = S.P; for (const w of S.waves) { w.r += w.sp * dt; if (w.r >= w.max) { w.dead = 1; continue; } if (!w.hit && P.inv <= 0 && G.running && Math.abs(Math.hypot(P.x - w.x, P.y - w.y) - w.r) < w.w + 8) { w.hit = 1; hitPlayer(G, null, w.dmg); } } S.waves = S.waves.filter(w => !w.dead); }
    for (const f of S.blasts) f.l -= dt;
    S.warns = S.warns.filter(w => !w.dead); S.blasts = S.blasts.filter(f => f.l > 0);
  }
  function blast(G, w) { const P = S.P; if (!w.dmg) return; S.blasts.push(Object.assign({}, w, { l: .45, d: .45 })); G.shake = Math.max(G.shake || 0, 6 * G.d);
    let hit = false; if (w.line) { const dx = P.x - w.x, dy = P.y - w.y, ca = Math.cos(w.a), sa = Math.sin(w.a), t = dx * ca + dy * sa; hit = t > 0 && t < w.L && Math.abs(dx * sa - dy * ca) < w.w + 10; }
    else hit = Math.hypot(P.x - w.x, P.y - w.y) < w.R + 8;
    if (hit && w.dmg && P.inv <= 0 && G.running) hitPlayer(G, null, w.dmg); Sfx.noise(.25, .1, 600); }
  function descent(G) { S.ph = 'descent'; S.phT = 4.5; S.bossE = null;
    for (const e of S.en) { if (e.dead) continue; e.dead = 1; part(e.x, e.y, 3, FCOL[e.T.f] || '207,174,116', 120); if (!e.T.boss) S.gems.push({ k: 'x', x: e.x, y: e.y, v: e.T.xp, pull: 1 }); }
    for (const o of S.ep) o.dead = 1; S.warns = []; S.waves = []; S.bq = []; banner('A PÁLYA KIÜRÜLT… AZ ÉG MEGNYÍLIK', 4.2, '#ffd23f'); G.shake = 10 * G.d; Sfx.blip(90, 1.4, 'sawtooth', .07, .4); }
  function godSpawn(G) { const e = spawn('isten', 0, -Math.min(260, V.hh * .55)); e.dsc = 3; e.at = 4; e.shN = 0; S.bossE = e; S.ph = 'god'; S.crystals = [];
    banner('SZIKKADT SZILÁRD, AZ ASZÁLY ISTENE', 4.5, '#ffd23f'); S.say = { t: 'TÉRDRE, KERTÉSZ. ÉN VAGYOK A SZÁRAZSÁG.', l: 4 };
    setTimeout(() => { if (!S) return; G.shake = 22 * G.d; Sfx.boom(); }, 2900); [110, 98, 82, 73].forEach((f, i) => setTimeout(() => Sfx.blip(f, .7, 'sawtooth', .08, .6), i * 500)); }
  function godAI(G, e, dt) {
    const P = S.P, dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1, k = e.hp / e.mhp, rage = k < .33 ? 2 : k < .66 ? 1 : 0;
    if (e.dsc > 0) { e.dsc -= dt; return; }
    // pajzs: a 66% és 33% élet alatt, a három vízkristály aktiválásával tűnik el
    if (!e.shield && e.shN < rage) { e.shN = rage; e.shield = 1; S.crystals = [0, 1, 2].map(i => { const a = Math.random() * TAU + i * TAU / 3, R = 260 + Math.random() * 80; return { x: P.x + Math.cos(a) * R, y: P.y + Math.sin(a) * R, p: 0, on: 0 }; });
      banner('ISTENI PAJZS – ÁLLJ A VÍZKRISTÁLYOKRA!', 3.2, '#6cc6ff'); S.say = { t: rage > 1 ? 'MÉG MINDIG ÁLLSZ?!' : 'A VIZED SEMMIT SEM ÉR!', l: 3 }; }
    if (e.shield) { for (const c of S.crystals) if (!c.on) { if (Math.hypot(P.x - c.x, P.y - c.y) < 40) { c.p += dt / 1.6; if (c.p >= 1) { c.on = 1; c.p = 0; Sfx.coin(); part(c.x, c.y, 14, '150,215,255', 160); } } else c.p = Math.max(0, c.p - dt * .5); }
      if (S.crystals.every(c => c.on)) { e.shield = 0; S.crystals = []; banner('A PAJZS LEOMLOTT!', 2.4, '#7ef0a4'); G.shake = 12 * G.d; Sfx.boom(); } }
    if (Math.abs(dx) > V.hw * 2 + 300 || Math.abs(dy) > V.hh * 2 + 300) { e.x = P.x - dx / d * 300; e.y = P.y - dy / d * 300; }
    const sp = e.sp * (1 + rage * .3) * (e.slow > 0 ? .7 : 1); e.slow -= dt;
    if (d > 280) { e.x += dx / d * sp * dt; e.y += dy / d * sp * dt; } else if (d < 170) { e.x -= dx / d * sp * .6 * dt; e.y -= dy / d * sp * .6 * dt; }
    if ((e.at -= dt) <= 0) { const pat = ['nova', 'pillars', 'spiral', 'beams', 'napkorong', 'summon', 'sweep', 'homing', 'grid', 'meteor'][e.pat = ((e.pat || 0) + 1) % 10];
      e.at = 2.4 - rage * .5;
      if (pat === 'nova') { sandWave(e, 22 + rage * 6, 165 + rage * 20, S.t); if (rage > 1) later(.45, () => !e.dead && sandWave(e, 22, 190, S.t + .15)); }
      else if (pat === 'pillars') { for (let i = 0, n = 5 + rage * 2; i < n; i++) { const a = Math.random() * TAU, R = i ? 40 + Math.random() * 190 : 0; S.warns.push({ x: P.x + Math.cos(a) * R, y: P.y + Math.sin(a) * R, R: 58, t: -i * .12, d: 1.1, dmg: 24 }); } }
      else if (pat === 'beams') { const a0 = Math.atan2(dy, dx); for (let i = 0, n = 3 + rage; i < n; i++) S.warns.push({ line: 1, x: e.x, y: e.y, a: a0 + (i - (n - 1) / 2) * .32, L: 1100, w: 20, t: 0, d: 1, dmg: 28 }); Sfx.blip(160, .6, 'sawtooth', .05, 1.6); }
      else if (pat === 'spiral') { spiral(e, 40, 5 + rage, 150, 16, '255,200,90', .17, .05); Sfx.noise(.6, .08, 1500); }
      else if (pat === 'napkorong') { for (let i = 0; i < 3 + rage; i++) later(i * .4, () => { if (!e.dead) { wave(e.x, e.y, 520, 300, 22, '255,170,60', 18); G.shake = 8 * G.d; } }); S.say = { t: 'ÉGJ EL!', l: 1.5 }; }
      else if (pat === 'sweep') { const b = Math.atan2(dy, dx); sweep(e, b - 1.6, 3.2, 16, 1000, 22, 26); sweep(e, b + Math.PI - 1.6, 3.2, 16, 1000, 22, 26); }
      else if (pat === 'homing') homing(e, 8 + rage * 3, 150, 18, '255,120,40', 1.5);
      else if (pat === 'grid') { grid(3 + rage, 130, 1.15, 26); banner('A SZÁRAZSÁG HÁLÓJA', 1.3, '#ffb060'); }
      else if (pat === 'meteor') { rain(14 + rage * 4, 300, 62, 1.25, 26, .09); banner('NAPHULLÁS!', 1.2, '#ffd23f'); }
      else { for (let i = 0; i < 8 + rage * 4; i++) { const a = i / (8 + rage * 4) * TAU; spawn(pickType(), e.x - P.x + Math.cos(a) * 90, e.y - P.y + Math.sin(a) * 90); } } }
    if (d < e.r * .8 + 10 && P.inv <= 0) hitPlayer(G, e);
  }
  /* a tanácsi próbák és a Kaktuszkirály: üldözés + saját támadássorozat */
  function bossAI(G, e, dt) {
    const P = S.P, dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1, k = e.hp / e.mhp, mad = k < .4 ? 1.35 : 1;
    if (Math.abs(dx) > V.hw * 2 + 260 || Math.abs(dy) > V.hh * 2 + 260) { const p = edge(); e.x = P.x + p[0]; e.y = P.y + p[1]; }
    if (e.slow > 0) e.slow -= dt; if (e.freeze > 0) { e.freeze -= dt; return; }
    if (e.dash) { e.dash.t -= dt; if (e.dash.t > 0) { e.x += Math.cos(e.dash.a) * e.sp * 4.6 * dt; e.y += Math.sin(e.dash.a) * e.sp * 4.6 * dt; if (S.pt.length < 160) part(e.x, e.y, 1, '170,200,255', 60, .3); if (d < e.r + 12 && P.inv <= 0) hitPlayer(G, e, e.T.dmg * 1.3); return; }
      e.dash = null; if (e.combo > 0) { e.combo--; const a = Math.atan2(P.y - e.y, P.x - e.x); e.wind = { a, t: .45 }; S.warns.push({ line: 1, x: e.x, y: e.y, a, L: e.sp * 4.6 * .6 + 40, w: e.r * .8, t: 0, d: .45, dmg: 0 }); } else wave(e.x, e.y, 260, 300, e.T.dmg * .6, '170,200,255'); }
    if (e.wind) { e.wind.t -= dt; if (e.wind.t <= 0) { e.dash = { a: e.wind.a, t: .6 }; e.wind = null; Sfx.noise(.2, .1, 900); } return; }
    if (e.cast > 0) { e.cast -= dt; return; }
    const sp = e.sp * mad * (e.slow > 0 ? .6 : 1) * (S.heat > 0 ? 1.2 : 1); if (d > 110) { e.x += dx / d * sp * dt; e.y += dy / d * sp * dt; }
    if ((e.at -= dt) > 0) { if (d < e.r + 10 && P.inv <= 0) hitPlayer(G, e); return; }
    const a = Math.atan2(dy, dx), ty = e.type, pats = BPAT[ty], pat = pats[e.pi = ((e.pi ?? -1) + 1) % pats.length], dm = e.T.dmg * .7;
    e.at = (BCD[ty] || 3) / mad; e.cast = .35; S.say = null; G.shake = Math.max(G.shake || 0, 3 * G.d);
    switch (pat) {
      // Watchdog Lovag: hármas roham, ugatás-hullámok, időtúllépés-ketrec, pajzscsapás
      case 'roham': e.combo = mad > 1 ? 3 : 2; e.wind = { a, t: .6 }; S.warns.push({ line: 1, x: e.x, y: e.y, a, L: e.sp * 4.6 * .6 + 40, w: e.r * .8, t: 0, d: .6, dmg: 0 }); Sfx.blip(320, .5, 'sawtooth', .05, 1.6); break;
      case 'ugatas': for (let i = 0; i < 3; i++) later(i * .35, () => { if (!e.dead) { wave(e.x, e.y, 340, 230, dm, '170,200,255', 12); Sfx.blip(180, .2, 'square', .05, .6); } }); break;
      case 'ketrec': cage(P.x, P.y, 10, 120, 46, 1.3, dm * 1.3); later(1.35, () => { if (!e.dead) wave(P.x, P.y, 90, 120, dm, '120,180,255', 18); }); banner('IDŐTÚLLÉPÉS!', 1.2, '#9fdcff'); break;
      case 'pajzs': for (let i = -2; i <= 2; i++) shotAt(e, a + i * .22, 260, dm, '200,220,255'); later(.4, () => { if (!e.dead) for (let i = -3; i <= 3; i++) shotAt(e, a + i * .17, 220, dm, '200,220,255'); }); break;
      // Kaktuszkirály: tüskespirál, tövisketrec, tüskeeső, földrengés
      case 'tuskespiral': spiral(e, 26, 3, 170, dm * .8, '120,200,90', .27, .06); Sfx.noise(.4, .1, 1800); break;
      case 'toviskert': for (let i = 0; i < 9; i++) { const b = i / 9 * TAU; const t = spawn('tovis', Math.cos(b) * 110, Math.sin(b) * 110); t.life = 9; } banner('TÖVISKERT!', 1.2, '#7ef0a4'); break;
      case 'tuskeeso': rain(12, 210, 50, 1, dm * 1.2, .08); break;
      case 'rengés': for (let i = 0; i < 3; i++) later(i * .45, () => { if (!e.dead) { wave(e.x, e.y, 380, 260, dm, '140,200,90', 16); sandWave(e, 16, 150, S.t + i, '120,200,90'); G.shake = 10 * G.d; } }); Sfx.boom(); break;
      // Ladder Mester: létrarács, alakzat, söprő fok, sorozat
      case 'racs': grid(3, 120, 1.1, dm * 1.2); banner('LÉTRARÁCS!', 1.1, '#ffd27a'); break;
      case 'alakzat': for (let i = 0; i < 9; i++) spawn('letraor', e.x - P.x + Math.cos(a + Math.PI / 2) * (i - 4) * 28, e.y - P.y + Math.sin(a + Math.PI / 2) * (i - 4) * 28); break;
      case 'sopres': sweep(e, a - 1.3, 2.6, 12, 520, 16, dm); Sfx.blip(220, .9, 'sawtooth', .05, 1.4); break;
      case 'sorozat': for (let w = 0; w < 4; w++) later(w * .22, () => { if (!e.dead) { const b = Math.atan2(P.y - e.y, P.x - e.x); for (let i = -2; i <= 2; i++) shotAt(e, b + i * .13, 260, dm, '255,210,90'); } }); break;
      // Structured Text Boszorkány: kódspirál, követő átkok, rúnakör, teleport
      case 'kodspiral': spiral(e, 34, 2, 160, dm * .8, '190,110,255', .21, .05); later(.2, () => spiral(e, 34, 2, 160, dm * .8, '255,120,220', -.21, .05)); break;
      case 'atok': homing(e, 6 + (mad > 1 ? 3 : 0), 140, dm, '200,120,255', 1.9); Sfx.blip(700, .4, 'sine', .05, .5); break;
      case 'runakor': cage(P.x, P.y, 12, 150, 40, 1.2, dm * 1.2); later(.6, () => rain(5, 100, 46, 1, dm * 1.2)); break;
      case 'teleport': { const b = Math.random() * TAU; part(e.x, e.y, 18, '170,90,220', 160); e.x = P.x + Math.cos(b) * 210; e.y = P.y + Math.sin(b) * 210; part(e.x, e.y, 18, '170,90,220', 160); Sfx.blip(900, .2, 'sine', .05, .4);
        later(.3, () => { if (!e.dead) { const c = Math.atan2(P.y - e.y, P.x - e.x); for (let i = 0; i < 11; i++) shotAt(e, c + (i - 5) * .14, 210, dm, '190,110,255'); } }); break; }
    }
    if (d < e.r + 10 && P.inv <= 0) hitPlayer(G, e);
  }
  const BPAT = { watchdog: ['roham', 'ugatas', 'pajzs', 'ketrec'], kiraly: ['tuskespiral', 'toviskert', 'rengés', 'tuskeeso'], ladder: ['racs', 'sorozat', 'alakzat', 'sopres'], boszi: ['kodspiral', 'teleport', 'atok', 'runakor'] };
  const BCD = { watchdog: 3, kiraly: 3.2, ladder: 3.2, boszi: 2.8 };
  /* látványos támadás-építőkockák: késleltetett sor, spirál, lökéshullám, követő gömb, ketrec, eső, rács, söprés */
  const later = (t, f) => S.bq.push({ t, f });
  function spiral(e, n, arms, sp, dmg, c, rot = .33, gap = .07) { e.spA = e.spA || 0; for (let i = 0; i < n; i++) later(i * gap, () => { if (e.dead) return; for (let a = 0; a < arms; a++) shotAt(e, e.spA + a * TAU / arms, sp, dmg, c); e.spA += rot; }); }
  const wave = (x, y, max, sp, dmg, c, w = 14) => S.waves.push({ x, y, r: 12, max, sp, w, dmg, c, hit: 0 });
  function homing(e, n, sp, dmg, c, turn = 1.7) { for (let i = 0; i < n && S.ep.length < 240; i++) { const a = i / n * TAU; S.ep.push({ x: e.x + Math.cos(a) * 30, y: e.y + Math.sin(a) * 30, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, l: 5, dmg, c, hm: turn, big: 1 }); } }
  function cage(cx, cy, n, R, r, d, dmg) { for (let i = 0; i < n; i++) { const a = i / n * TAU; S.warns.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, R: r, t: -i * .04, d, dmg }); } }
  function rain(n, spread, r, d, dmg, gap = .1) { const P = S.P; for (let i = 0; i < n; i++) { const a = Math.random() * TAU, R = i ? Math.random() * spread : 0; S.warns.push({ x: P.x + Math.cos(a) * R + (i ? 0 : P.vx || 0), y: P.y + Math.sin(a) * R, R: r, t: -i * gap, d, dmg }); } }
  function grid(n, gap, d, dmg, w = 18) { const P = S.P, L = 900; for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * gap; S.warns.push({ line: 1, x: P.x - L / 2, y: P.y + o, a: 0, L, w, t: -i * .08, d, dmg }); S.warns.push({ line: 1, x: P.x + o, y: P.y - L / 2, a: Math.PI / 2, L, w, t: -i * .08 - .4, d, dmg }); } }
  function sweep(e, a0, span, steps, L, w, dmg, d = .55) { for (let i = 0; i <= steps; i++) later(i * .09, () => { if (!e.dead) S.warns.push({ line: 1, x: e.x, y: e.y, a: a0 + span * i / steps, L, w, t: 0, d, dmg }); }); }
  const shotAt = (e, a, sp, dmg, c) => { if (S.ep.length < 220) S.ep.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, l: 3.4, dmg, c }); };
  function hurt(G, e, dmg, kx, ky, src) {
    if (e.dead || e.under || e.dsc > 0 || e.hp <= 0) return; dmg *= S.st.dmg; if (e.wet > S.t) dmg *= 1.2; if (src && UP[src] && lv(src) > bmx(src)) dmg *= 1 + .2 * (lv(src) - bmx(src)); const sigH = S.fz && src && (src === S.sigK[0] || src === S.sigK[1]); if (sigH && S.fz === 'pisztoly') { dmg *= 1.35; kx *= 2; ky *= 2; } if (e.shield) dmg *= .02;
    if (e.type === 'szilard' && (src === 'zivatar' || src === 'gyogyforras')) dmg *= 1.25;
    e.hp -= dmg; if (!e.T.boss || e.flash < -.25) e.flash = .1; if (src) S.dmgBy[src] = (S.dmgBy[src] || 0) + Math.min(dmg, dmg + e.hp);
    if (!e.T.boss) { e.kx += kx; e.ky += ky; }
    if (sigH) fuseHit(G, e, dmg);
    if (S.nums.length < 28) S.nums.push({ x: e.x + (Math.random() - .5) * 10, y: e.y - e.r, v: Math.max(1, Math.round(dmg)), l: .6 });
    if (e.hp > 0) return;
    e.dead = 1; S.kills++; G.score += e.T.pt; S.dirty = 1;
    part(e.x, e.y, e.T.boss ? 30 : 5, FCOL[e.T.f] || '207,174,116', 150);
    if (e.T.god) return godDeath(G, e);
    if (e.type === 'szilard') return szDeath(G, e);
    if (e.T.boss) { goldPile(e.x, e.y, 10 + S.bossN * 4); S.gems.push({ k: 'c', x: e.x, y: e.y, v: 0 }); Sfx.boom(); G.shake = 14 * G.d; if (S.bossE === e) { S.bossE = null; S.bossCD = 30; } S.bossN++; banner(e.T.n.toUpperCase() + ' LEGYŐZVE!', 2.6, '#7ef0a4'); }
    else { S.gems.push({ k: 'x', x: e.x, y: e.y, v: e.T.xp }); if (Math.random() < (e.T.hp >= 52 ? .012 : .004) * S.st.luck) S.gems.push({ k: 'g', x: e.x, y: e.y - 6, v: 1 }); const r = Math.random(), lk = S.st.luck; if (r < .005 * lk) S.gems.push({ k: 'h', x: e.x + 8, y: e.y, v: 0 }); else if (r < .0145 * lk) S.gems.push({ k: 'm', x: e.x - 8, y: e.y, v: 0 }); }
    if (e.T.ai === 'split') for (let i = 0; i < 2; i++) spawn('pioca', e.x - S.P.x + rnd(-14, 14), e.y - S.P.y + rnd(-14, 14), .5);
    if (S.gems.length > 340) { const o = S.gems.findIndex(q => q.k === 'x' && !q.pull); if (o >= 0) { const v = S.gems[o].v; S.gems.splice(o, 1); const n = S.gems.find(q => q.k === 'x' && !q.pull); if (n) n.v += v; } }
    if (S.t - S.sndT > .07) { S.sndT = S.t; Sfx.blip(260 + Math.random() * 180, .05, 'triangle', .035, .6); }
  }
  function hitPlayer(G, e, dm) {
    const P = S.P; let hd = Math.max(1, (dm != null ? dm : e.T.dmg) * (1 + S.t / 1600) * (S.ph === 'wrath' ? 1 + S.wk * .6 : S.ph === 'god' ? 1.2 : 1) - S.st.armor); P.shT = S.t;
    if (P.sh > 0) { const a = Math.min(P.sh, hd); P.sh -= a; hd -= a; part(P.x, P.y, 6, '120,200,255', 120, .35); if (hd <= 0) { P.inv = .45; Sfx.blip(900, .08, 'sine', .04, .6); return; } }
    P.hp -= hd; P.inv = .6; G.shake = 10 * G.d; Sfx.hit(); if (navigator.vibrate) navigator.vibrate(40);
    part(P.x, P.y, 8, '255,90,77', 120, .4);
    if (P.hp <= 0 && S.rev > 0) { S.rev--; P.hp = P.mhp * .5; P.inv = 3; S.flash = .5; banner('FORRÁSVÍZ: FELTÁMADTÁL!', 2.6, '#6cc6ff'); S.rings.push({ x: P.x, y: P.y, R: 260, l: 1, w: 1 });
      near(P.x, P.y, 260, (o, dx, dy) => { const d = Math.hypot(dx, dy) || 1; if (!o.T.boss) { o.kx += dx / d * 600; o.ky += dy / d * 600; } }); for (const o of S.ep) o.dead = 1; Sfx.perfect(); return; }
    if (P.hp <= 0) { P.hp = 0; me.overTitle = (S.ph === 'god' ? 'AZ ISTEN GYŐZÖTT · ' : 'KISZÁRADTÁL · ') + fmtT(S.t); G.end(); }
  }
  function enemies(G, dt) {
    const P = S.P, kd = Math.pow(.002, dt), hot = (S.heat > 0 || S.szRage ? 1.35 : 1) * (S.ph === 'wrath' ? 1.1 + S.wk * .35 : 1);
    for (const e of S.en) {
      e.flash -= dt;
      if (e.type === 'fereg') { wormAI(G, e, dt); continue; }
      if (e.type === 'szilard') { szAI(G, e, dt); continue; }
      if (e.T.god) { godAI(G, e, dt); continue; }
      if (e.T.boss) { bossAI(G, e, dt); continue; }
      const dx = P.x - e.x, dy = P.y - e.y, dd = Math.hypot(dx, dy) || 1;
      if (e.life != null && (e.life -= dt) <= 0) { e.dead = 1; part(e.x, e.y, 5, FCOL[e.T.f], 80); continue; }
      if (Math.abs(dx) > V.hw * 2 + 220 || Math.abs(dy) > V.hh * 2 + 220) { if (!e.T.sp) { e.dead = 1; continue; } const p = edge(); e.x = P.x + p[0]; e.y = P.y + p[1]; continue; }
      if (e.air > 0) { e.air -= dt; continue; }
      if (e.freeze > 0) { e.freeze -= dt; e.kx *= kd; e.ky *= kd; continue; }
      const ai = e.T.ai, v = e.sp * (e.slow > 0 ? .5 : 1) * hot; e.slow -= dt; e.at -= dt;
      let mx = dx / dd * v, my = dy / dd * v;
      if (ai === 'wobble') { const w = Math.sin(S.t * (e.T.flap ? 7 : 4.5) + e.ph) * v * (e.T.flap ? .45 : .9); mx += -dy / dd * w; my += dx / dd * w; }
      else if (ai === 'flank' && dd > 110) { const o = e.side * Math.min(1, (dd - 110) / 260) * 1.1, c = Math.cos(o), sn = Math.sin(o); mx = (dx * c - dy * sn) / dd * v; my = (dx * sn + dy * c) / dd * v; }
      else if (ai === 'ranged') { const keep = 250; if (dd < keep - 50) { mx = -mx * .7; my = -my * .7; } else if (dd < keep + 30) { mx = -dy / dd * v * .4 * e.side; my = dx / dd * v * .4 * e.side; }
        if (e.at <= 0 && dd < 520) { e.at = 3.6 + Math.random() * 1.5; shotAt(e, Math.atan2(dy, dx), 190, e.T.dmg, e.T.f === 'halo' ? '190,110,255' : e.T.f === 'varos' ? '255,200,120' : null); } }
      else if (ai === 'charge') { if (!e.chg) e.chg = { st: 'walk' }; const c = e.chg;
        if (c.st === 'walk' && dd < 260 && e.at <= 0) { c.st = 'wind'; c.t = .5; c.a = Math.atan2(dy, dx); }
        if (c.st === 'wind') { mx = my = 0; if ((c.t -= dt) <= 0) { c.st = 'dash'; c.t = .55; } }
        else if (c.st === 'dash') { mx = Math.cos(c.a) * v * 3.2; my = Math.sin(c.a) * v * 3.2; if ((c.t -= dt) <= 0) { c.st = 'walk'; e.at = 2.5; } } }
      else if (ai === 'summon') { if (dd < 220) { mx = -mx * .5; my = -my * .5; } if (e.at <= 0 && dd < 520 && S.en.length < 320) { e.at = 7; for (let i = 0; i < 2; i++) spawn(e.T.sum || 'ghoul', e.x - P.x + rnd(-30, 30), e.y - P.y + rnd(-30, 30), .7); part(e.x, e.y, 8, '170,90,220', 90); } }
      else if (ai === 'heal') { if (e.at <= 0) { e.at = 3; near(e.x, e.y, 120, o => { if (o !== e && !o.T.boss) o.hp = Math.min(o.mhp, o.hp + o.mhp * .15); }); part(e.x, e.y, 8, '120,230,120', 110); } }
      else if (ai === 'tele') { if (e.at <= 0 && dd < 600) { e.at = 4 + Math.random() * 2; part(e.x, e.y, 10, '150,90,170', 120); const b = Math.random() * TAU, R = 120 + Math.random() * 70; e.x = P.x + Math.cos(b) * R; e.y = P.y + Math.sin(b) * R; part(e.x, e.y, 10, '150,90,170', 120); } }
      e.x += (mx + e.kx) * dt; e.y += (my + e.ky) * dt; e.kx *= kd; e.ky *= kd;
      if (dd < e.r + 10 && P.inv <= 0 && G.running) hitPlayer(G, e);
    }
    // ne csússzanak egymásba
    const f = Math.min(1, dt * 10);
    for (const l of GR.values()) { const n = Math.min(l.length, 8); for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const a = l[i], b = l[j]; if (a.T.boss || b.T.boss) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, q = (a.r + b.r) * .85; if (d2 < q * q && d2 > .01) { const d = Math.sqrt(d2), p = (q - d) / d * .5 * f; a.x -= dx * p; a.y -= dy * p; b.x += dx * p; b.y += dy * p; } } }
    // ellenséges lövedékek (homokhullám)
    for (const p of S.ep) { if (p.hm) { const sp = Math.hypot(p.vx, p.vy), cur = Math.atan2(p.vy, p.vx); let da = Math.atan2(P.y - p.y, P.x - p.x) - cur; da = Math.atan2(Math.sin(da), Math.cos(da)); const na = cur + clamp(da, -p.hm * dt, p.hm * dt); p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp; }
      p.x += p.vx * dt; p.y += p.vy * dt; if ((p.l -= dt) <= 0) { p.dead = 1; continue; }
      if (P.inv <= 0 && Math.abs(p.x - P.x) < 13 && Math.abs(p.y - P.y) < 13 && G.running) { p.dead = 1; hitPlayer(G, null, p.dmg); } }
  }
  /* homokféreg: a föld alatt közelít, figyelmeztető kör után feltör, aztán sebezhetően kint marad */
  function wormAI(G, e, dt) {
    const P = S.P; e.stT -= dt;
    if (e.st === 'under') { e.under = 1; const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1; e.x += dx / d * e.sp * dt; e.y += dy / d * e.sp * dt;
      if ((S.t * 20 | 0) % 2 === 0 && S.pt.length < 150) part(e.x, e.y, 1, '160,125,80', 40, .5);
      if (e.stT <= 0 || d < 30) { e.st = 'warn'; e.stT = .75; e.wx = P.x; e.wy = P.y; Sfx.blip(220, .3, 'sawtooth', .05, .6); } }
    else if (e.st === 'warn') { if (e.stT <= 0) { e.st = 'up'; e.stT = 2.4; e.under = 0; e.x = e.wx; e.y = e.wy; G.shake = 12 * G.d; Sfx.boom(); part(e.x, e.y, 26, '207,174,116', 240, .6); wave(e.x, e.y, 300, 280, e.T.dmg * .6, '220,180,120', 16); sandWave(e, 20, 170, S.t); e.spit = .6; e.surf = (e.surf || 0) + 1; if (e.surf % 3 === 0) rain(8, 220, 48, 1.1, e.T.dmg * .8, .1);
        if (Math.hypot(P.x - e.x, P.y - e.y) < 58 && P.inv <= 0) hitPlayer(G, e); } }
    else { e.under = 0; if ((e.spit -= dt) <= 0) { e.spit = .7; const b = Math.atan2(P.y - e.y, P.x - e.x); for (let i = -2; i <= 2; i++) shotAt(e, b + i * .2, 230, e.T.dmg * .6, '230,190,120'); }
      if (Math.hypot(P.x - e.x, P.y - e.y) < e.r + 10 && P.inv <= 0) hitPlayer(G, e, e.T.dmg * .6); if (e.stT <= 0) { e.st = 'under'; e.stT = 2.4; part(e.x, e.y, 14, '207,174,116', 160); } }
  }

  /* ---------- Szikkadt Szilárd ---------- */
  function szSpawn(G) {
    const back = S.szN > 0, e = spawn('szilard', ...edge(), 1 + S.szN * .7); S.bossE = e; e.wT = 2.5; e.sumT = 5; e.ph2 = 0; e.st = 'walk'; e.stT = 0; S.szE = e;
    banner(back ? 'SZIKKADT SZILÁRD VISSZATÉRT!' : 'SZIKKADT SZILÁRD!', 3.4); G.shake = 12 * G.d;
    [196, 185, 147, 110].forEach((f, i) => setTimeout(() => Sfx.blip(f, .38, 'sawtooth', .07, .8), i * 230)); setTimeout(() => Sfx.boom(), 950);
    S.say = { t: back ? 'Azt hitted, végeztél velem?' : 'Végre személyesen! Kiszárítalak!', l: 3 };
  }
  function sandWave(e, n, sp, off = 0, c) { for (let i = 0; i < n && S.ep.length < 220; i++) { const a = off + i / n * TAU; S.ep.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, l: 3.2, dmg: e.T.god ? 18 : 10 + S.bossN, c }); } Sfx.noise(.35, .14, 700); }
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
      if ((e.xT = (e.xT ?? 4) - dt) <= 0) { e.xT = ph === 3 ? 3.2 : 4.5; const q = (e.xq = (e.xq || 0) + 1) % 4, b = Math.atan2(dy, dx);
        if (q === 0) { homing(e, ph === 3 ? 8 : 5, 130, 16, '230,90,60', 1.6); S.say = { t: 'A szárazság megtalál.', l: 1.8 }; }
        else if (q === 1) sweep(e, b - 1.4, 2.8, 14, 560, 18, 20);
        else if (q === 2) { rain(10, 220, 54, 1.05, 22); banner('HOMOKOSZLOPOK!', 1.1, '#e8b656'); }
        else spiral(e, 30, 4, 150, 12, '216,185,138', .19, .06); }
      if (e.sumT <= 0) { e.sumT = ph === 3 ? 5 : 6.5; for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + S.t; spawn('arnyfarkas', e.x - P.x + Math.cos(a) * 60, e.y - P.y + Math.sin(a) * 60); } } }
    if (d < e.r + 10 && P.inv <= 0 && !e.under) hitPlayer(G, e);
  }
  function szDeath(G, e) {
    S.szE = null; S.bossE = null; S.szN++; S.szKill = 1; S.szRage = 0; S.dry = 0; S.heat = 0; S.bossN++;
    G.score += 5000; S.dirty = 1; G.float(G.W / 2, G.H / 2 - 60 * G.d, '+5000');
    banner('A KERT KIVIRÁGZOTT!', 4.2, '#7ef0a4'); S.melt = { x: e.x, y: e.y, l: 2.6 }; S.rainT = 12; S.green = 60; S.say = null; S.ph = 'bloom'; S.phT = 60;
    goldPile(e.x, e.y, 40); S.gems.push({ k: 'c', x: e.x - 22, y: e.y + 8, v: 0, dbl: 1 }, { k: 'c', x: e.x + 22, y: e.y + 8, v: 0, dbl: 1 });
    for (const o of S.ep) o.dead = 1; G.shake = 16 * G.d; Sfx.boom(); setTimeout(() => Sfx.perfect(), 300);
  }
  function godDeath(G, e) {
    S.bossE = null; S.gold += Math.round(150 * S.st.gold); store.set('aszb_gold', store.get('aszb_gold') + Math.round(150 * S.st.gold)); G.score += 50000; S.dirty = 1; S.green = 30; S.rainT = 20; S.dry = 0; S.warns = []; for (const o of S.ep) o.dead = 1; for (const o of S.en) o.dead = 1;
    banner('AZ ASZÁLY VÉGET ÉRT!', 6, '#7ef0a4'); G.shake = 24 * G.d; Sfx.boom(); setTimeout(() => Sfx.perfect(), 400); part(e.x, e.y, 60, '255,220,140', 260, .9);
    me.overTitle = 'AZ ASZÁLY VÉGET ÉRT · ' + fmtT(S.t); G.win = true; S.ph = 'win'; setTimeout(() => { if (S && G.running) G.end(); }, 3500);
  }


  /* ---------- fegyverek ---------- */
  const SND = {
    sugar: () => Sfx.noise(.12, .035, 3200), rainbird: () => Sfx.blip(2300, .018, 'square', .014), kanna: () => Sfx.blip(420, .18, 'triangle', .035, 1.8),
    gejzirW: () => Sfx.blip(260, .08, 'sine', .03, 1.4), gejzir: () => { Sfx.noise(.38, .16, 650); Sfx.blip(170, .32, 'sine', .07, 2.4); }, jeg: () => Sfx.blip(1750, .07, 'triangle', .035, .5),
    heli: () => Sfx.blip(72, .06, 'sawtooth', .02, .8), cso: () => Sfx.blip(1200 + Math.random() * 400, .03, 'sine', .02, .6), zivatar: () => { Sfx.noise(.18, .22, 2400); Sfx.blip(70, .3, 'sawtooth', .07, .5); },
    gold: () => Sfx.blip(1320, .05, 'triangle', .025, 1.3), cube: () => Sfx.blip(980, .04, 'square', .02, .8), ak: () => Sfx.noise(.05, .06, 2600), pkm: () => Sfx.noise(.04, .05, 2000),
    vizagyu: () => { Sfx.noise(.12, .14, 900); Sfx.blip(140, .14, 'square', .05, .5); }, tuzolto: () => Sfx.noise(.28, .15, 1500)
  };
  let sndT = {};
  const snd = (k, gap = .08) => { if ((S.t - (sndT[k] || -9)) < gap) return; sndT[k] = S.t; SND[k](); };
  function ready(k, base, dt) { S.wt[k] = (S.wt[k] || 0) - dt; if (S.wt[k] > 0) return false; S.wt[k] = Math.max(0, S.wt[k] + base * S.st.cd * (S.fz === 'rainbird' && (k === S.sigK[0]) ? .7 : 1)); return true; }
  const puddleR = () => { const L = lv('pocsolya'), E = lv('gyogyforras'); return (E ? 121 : L ? 52 + L * 9 : 0) * S.st.area * (S.dry > 0 ? .62 : 1); };
  function weapons(G, dt) {
    const lvW = k => Math.min(lv(k), UP[k] ? bmx(k) : MAXLV);
    const P = S.P, ar = S.st.area, du = S.st.dur, ex = S.st.extra; let L;
    // vízpisztoly / porszóró / vízágyú
    for (const k of ['pisztoly', 'por']) if ((L = lvW(k)) && ready(k, L >= 5 ? .5 : L >= 3 ? .68 : .72, dt)) {
      const e = nearest(Math.max(V.hw, V.hh) * .95);
      if (!e) S.wt[k] = .12;
      else { const a0 = Math.atan2(e.y - P.y, e.x - P.x), n = [1, 2, 2, 3, 3][L - 1] + ex;
        for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * .15; S.pr.push({ x: P.x, y: P.y - 4, vx: Math.cos(a) * 430, vy: Math.sin(a) * 430, r: 6, dmg: 7 + L * 2, pierce: [1, 1, 2, 2, 3][L - 1], life: 1.1, hit: [], src: k, sand: k === 'por' }); }
        k === 'por' ? Sfx.noise(.07, .07, 1400) : Sfx.shoot(); }
    }
    if (lvW('vizagyu') && ready('vizagyu', .62, dt)) { const e = nearest(Math.max(V.hw, V.hh) * .95);
      if (!e) S.wt.vizagyu = .12; else { const a0 = Math.atan2(e.y - P.y, e.x - P.x), n = 2 + ex; for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * .2;
        S.pr.push({ x: P.x, y: P.y - 4, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, r: 14, dmg: 46, pierce: 99, life: 1.3, hit: [], src: 'vizagyu', big: 1, kb: 1.1 }); } snd('vizagyu'); } }
    // szórófej / körforgó esőztető
    if ((L = lvW('szoro'))) {
      S.orb += dt * 2.8; const n = L + 1, R = (56 + L * 4) * ar;
      for (let i = 0; i < n; i++) { const a = S.orb + i / n * TAU, ox = P.x + Math.cos(a) * R, oy = P.y + Math.sin(a) * R;
        near(ox, oy, 9, e => { if (S.t < e.oT) return; e.oT = S.t + .5; hurt(G, e, 5 + L * 2, Math.cos(a) * 150, Math.sin(a) * 150, 'szoro'); }); }
    }
    if (lvW('korforgo')) { S.orb += dt * 2.8;
      for (const [R, s] of [[70 * ar, 1], [124 * ar, -1]]) for (let i = 0; i < 6; i++) { const a = s * S.orb * (s > 0 ? 1 : .8) + i / 6 * TAU, ox = P.x + Math.cos(a) * R, oy = P.y + Math.sin(a) * R;
        near(ox, oy, 12, e => { if (S.t < e.oT) return; e.oT = S.t + .4; hurt(G, e, 22, Math.cos(a) * 200, Math.sin(a) * 200, 'korforgo'); }); } }
    // slagostor / tűzoltócső
    if ((L = lvW('ostor')) && ready('ostor', [1.3, 1.3, 1.2, 1.1, .9][L - 1], dt)) {
      const len = [110, 125, 125, 145, 170][L - 1] * ar, hw = 26 * ar;
      for (const dir of L >= 3 ? [P.face, -P.face] : [P.face]) { S.slashes.push({ x: P.x, y: P.y, dir, len, l: .22 });
        for (const e of S.en) { if (e.under) continue; const dx = (e.x - P.x) * dir, dy = e.y - P.y; if (dx > -e.r && dx < len + e.r && Math.abs(dy) < hw + e.r) hurt(G, e, 9 + L * 4, dir * 170, 0, 'ostor'); } }
      Sfx.blip(180, .12, 'sawtooth', .04, 2.5);
    }
    if (lvW('tuzolto') && ready('tuzolto', .85, dt)) { const R = 185 * ar; S.rings.push({ x: P.x, y: P.y, R, l: 1, w: 1 });
      near(P.x, P.y, R, (e, dx, dy) => { const d = Math.hypot(dx, dy) || 1; hurt(G, e, 40, dx / d * 260, dy / d * 260, 'tuzolto'); }); snd('tuzolto'); }
    // vízibomba / bombazápor
    if ((L = lvW('bomba')) && ready('bomba', 2.6, dt)) {
      for (let i = 0, n = [1, 1, 2, 2, 3][L - 1] + ex; i < n; i++) { const e = randEnemy(330); if (!e) { if (!i) S.wt.bomba = .3; break; }
        S.bombs.push({ x0: P.x, y0: P.y, tx: e.x + rnd(-10, 10), ty: e.y + rnd(-10, 10), t: -i * .12, R: (50 + L * 7) * ar, dmg: 12 + L * 5, src: 'bomba' }); }
    }
    if (lvW('bombazapor') && ready('bombazapor', 1.8, dt)) {
      for (let i = 0, n = 4 + ex; i < n; i++) { const e = randEnemy(360); if (!e) { if (!i) S.wt.bombazapor = .3; break; }
        S.bombs.push({ x0: P.x, y0: P.y, tx: e.x + rnd(-10, 10), ty: e.y + rnd(-10, 10), t: -i * .1, R: 95 * ar, dmg: 42, chain: 1, src: 'bombazapor' }); }
    }
    // esőfelhő / zivatar
    if ((L = lvW('felho')) && ready('felho', 4.2, dt)) {
      for (let i = 0, n = L >= 4 ? 2 : 1; i < n; i++) { const e = randEnemy(300), a = Math.random() * TAU;
        S.clouds.push({ x: e ? e.x : P.x + Math.cos(a) * 90, y: e ? e.y : P.y + Math.sin(a) * 90, R: (58 + L * 6) * ar, life: [2.5, 3, 3.5, 3.5, 4.5][L - 1] * du, l0: 0, tk: 0, dmg: 3 + L * 1.6, src: 'felho' }); }
    }
    if (lvW('zivatar') && ready('zivatar', 3.6, dt)) {
      for (let i = 0; i < 2; i++) { const e = randEnemy(300), a = Math.random() * TAU;
        S.clouds.push({ x: e ? e.x : P.x + Math.cos(a) * 90, y: e ? e.y : P.y + Math.sin(a) * 90, R: 110 * ar, life: 6 * du, l0: 0, tk: 0, dmg: 10, src: 'zivatar', storm: 1, bt: rnd(0, .5) }); }
    }
    // pocsolya / gyógyforrás
    if ((L = lvW('pocsolya') || lvW('gyogyforras')) && ready('pocsolya', .45, dt)) { const E = lvW('gyogyforras');
      near(P.x, P.y, puddleR(), (e, dx, dy) => { const d = Math.hypot(dx, dy) || 1; hurt(G, e, E ? 13 : 2 + L * 1.3, dx / d * 40, dy / d * 40, E ? 'gyogyforras' : 'pocsolya'); }); }
    if (lvW('gyogyforras')) P.hp = Math.min(P.mhp, P.hp + 2.5 * dt);
    // nagynyomású sugár / hidromonitor
    if (((L = lvW('sugar')) || lvW('hidromonitor')) && ready('sugar', .2, dt)) { const E = lvW('hidromonitor'), R = (E ? 340 : 240 + L * 14) * ar, n = E ? 3 : L >= 3 ? 2 : 1, dm = E ? 17 : 2.5 + L * 1.6, all = E || L >= 5, src = E ? 'hidromonitor' : 'sugar';
      const tg = nearestN(R, n); S.beams = [];
      for (const e of tg) { const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, x2 = all ? P.x + ux * R : e.x, y2 = all ? P.y + uy * R : e.y;
        S.beams.push({ x2, y2, w: E ? 1 : 0 });
        if (all) for (const o of S.en) { if (o.dead || o.under) continue; const px = o.x - P.x, py = o.y - P.y, t = px * ux + py * uy; if (t < 0 || t > R) continue; if (Math.abs(px * uy - py * ux) < o.r + (E ? 10 : 5)) hurt(G, o, dm, ux * 30, uy * 30, src); }
        else hurt(G, e, dm, ux * 20, uy * 20, src); }
      if (!tg.length) S.wt.sugar = .1; else snd('sugar', .3); }
    // rain bird / öntözőhíd
    if ((L = lvW('rainbird'))) { S.rbBase += dt * .45; const sw = [1.6, 2.2, 2.6, 3.4, 4.6][L - 1];
      if (ready('rainbird', .1, dt)) { S.rbA += .16 * S.rbDir; if (Math.abs(S.rbA) > sw / 2) { S.rbDir *= -1; S.rbA = clamp(S.rbA, -sw / 2, sw / 2); }
        const a = S.rbBase + S.rbA, R = (120 + L * 12) * ar, ca = Math.cos(a), sa = Math.sin(a); S.rbJet = a;
        near(P.x, P.y, R, (e, dx, dy) => { if (S.t < e.rbT) return; const t = dx * ca + dy * sa; if (t < 0) return; if (Math.abs(dx * sa - dy * ca) < e.r + 12 + t * .08) { e.rbT = S.t + .3; hurt(G, e, 4 + L * 2.2, ca * 90, sa * 90, 'rainbird'); } });
        if ((S.rbN = (S.rbN || 0) + 1) % 2 === 0) snd('rainbird', .05); } }
    if (lvW('ontozohid')) { S.rbA += dt * 1.5; S.rbJet = S.rbA; const R = 250 * ar;
      if (ready('ontozohid', .1, dt)) { const ca = Math.cos(S.rbA), sa = Math.sin(S.rbA);
        near(P.x, P.y, R, (e, dx, dy) => { if (S.t < e.rbT) return; if (Math.abs(dx * sa - dy * ca) < e.r + 18) { e.rbT = S.t + .3; const s = Math.sign(dx * ca + dy * sa) || 1; hurt(G, e, 18, -sa * 140 * s, ca * 140 * s, 'ontozohid'); } }); } }
    // locsolókanna / kannavihar
    { const E = lvW('kannavihar'); L = lvW('kanna');
      if ((L || E) && ready('kanna', E ? 1.25 : 1.6, dt)) { const e = nearest(320), a0 = e ? Math.atan2(e.y - P.y, e.x - P.x) : (P.face > 0 ? 0 : Math.PI), n = E ? 6 : (L >= 5 ? 3 : L >= 3 ? 2 : 1) + ex;
        for (let i = 0; i < n; i++) { const a = E ? a0 + i / n * TAU : a0 + (i - (n - 1) / 2) * .5, sp = E ? 470 : 340 + L * 22; S.cans.push({ x: P.x, y: P.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ret: 0, hit: new Set(), rot: 0, dmg: E ? 30 : 7 + L * 3, src: E ? 'kannavihar' : 'kanna', big: E }); }
        snd('kanna'); } }
    for (const c of S.cans) { c.rot += dt * 14;
      if (!c.ret) { const s = Math.hypot(c.vx, c.vy), ns = s - 620 * dt; if (ns <= 0) { c.ret = 1; c.hit.clear(); c.vx = c.vy = 0; } else { c.vx *= ns / s; c.vy *= ns / s; } }
      else { const dx = P.x - c.x, dy = P.y - c.y, d = Math.hypot(dx, dy) || 1, s = Math.min(560, Math.hypot(c.vx, c.vy) + 900 * dt); c.vx = dx / d * s; c.vy = dy / d * s; if (d < 18) { c.dead = 1; continue; } }
      c.x += c.vx * dt; c.y += c.vy * dt;
      near(c.x, c.y, c.big ? 15 : 11, e => { if (c.hit.has(e.id)) return; c.hit.add(e.id); hurt(G, e, c.dmg, c.vx * .2, c.vy * .2, c.src); }); }
    // gejzír / gejzírmező
    { const E = lvW('gejzirmezo'); L = lvW('gejzir');
      if ((L || E) && ready('gejzir', E ? 1.1 : [2.4, 2.3, 2.1, 2, 1.6][L - 1], dt)) { const n = E ? 5 : [1, 2, 2, 3, 3][L - 1]; let any = 0;
        for (let i = 0; i < n; i++) { const e = randEnemy(360); if (!e) break; any = 1; S.geys.push({ x: e.x, y: e.y, t: -.4, R: (E ? 62 : 34 + L * 5) * ar, dmg: E ? 48 : 13 + L * 4.5, life: (E ? 1.6 : .55) * du, tk: 0, src: E ? 'gejzirmezo' : 'gejzir', E }); }
        if (any) snd('gejzirW', .2); else S.wt.gejzir = .3; } }
    for (const q of S.geys) { q.t += dt; if (q.t < 0) continue; if (q.t >= q.life) { q.dead = 1; continue; }
      if ((q.tk -= dt) <= 0) { const first = q.tk < -50 || q.t < dt * 1.5; q.tk = q.E ? .5 : 99;
        near(q.x, q.y, q.R, e => { hurt(G, e, q.dmg * (first ? 1 : .5), 0, 0, q.src); if (!e.T.boss) e.air = Math.max(e.air, .55); else e.slow = .8; });
        if (first) { snd('gejzir', .15); part(q.x, q.y, 10, '150,215,255', 160, .5); } } }
    // jégkocka-szóró / jégeső
    if ((L = lvW('jeg')) && ready('jeg', 1.5, dt)) { const e = nearest(340);
      if (!e) S.wt.jeg = .15; else { const a0 = Math.atan2(e.y - P.y, e.x - P.x), n = [3, 4, 4, 5, 5][L - 1] + ex, fz = [.7, .7, 1, 1, 1.3][L - 1] * du;
        for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * .19; S.pr.push({ x: P.x, y: P.y - 4, vx: Math.cos(a) * 360, vy: Math.sin(a) * 360, r: 6, dmg: 4 + L * 1.8, pierce: 1, life: .9, hit: [], src: 'jeg', ice: fz }); }
        snd('jeg'); } }
    if (lvW('jegeso') && ready('jegeso', .8, dt)) { for (let i = 0; i < 10; i++) { const e = randEnemy(400); if (!e) break; S.hail.push({ x: e.x + rnd(-8, 8), y: e.y + rnd(-8, 8), t: .35 }); } snd('jeg', .1); }
    for (const h of S.hail) { if ((h.t -= dt) > 0) continue; h.dead = 1; near(h.x, h.y, 22, e => { hurt(G, e, 24, 0, 0, 'jegeso'); if (e.T.boss) e.slow = 1.5; else e.freeze = Math.max(e.freeze, 1.4 * du); }); part(h.x, h.y, 4, '200,240,255', 90, .3); }
    // Ka-26 helikopter / légiflotta
    { const E = lvW('legiflotta'); L = lvW('heli');
      if (L || E) { const n = E ? 4 : L >= 4 ? 2 : 1; S.heliA += dt * .9; while (S.heli.length < n) S.heli.push({ x: P.x, y: P.y - 40 });
        S.heli.length = n; S.heli.forEach((h, i) => { const a = S.heliA + i / n * TAU, R = E ? 88 : 58, tx = P.x + Math.cos(a) * R, ty = P.y + Math.sin(a) * R * .7 - 10, k = Math.min(1, dt * 3); h.x += (tx - h.x) * k; h.y += (ty - h.y) * k; });
        if (ready('heli', .3, dt)) { const R = (E ? 64 : 24 + L * 6) * ar, dm = E ? 13 : 2.5 + L * 1.4; for (const h of S.heli) near(h.x, h.y + 8, R, e => { hurt(G, e, dm, 0, 0, E ? 'legiflotta' : 'heli'); e.slow = Math.max(e.slow, .35); }); snd('heli', .35); } }
      else S.heli.length = 0; }
    // csepegtető cső / öntözőcsatorna
    { const E = lvW('csatorna'); L = lvW('cso');
      if (L || E) { const life = (E ? 6 : 2.2 + L * .35) * du, mx = E ? 60 : 40, last = S.trail[S.trail.length - 1];
        if (!last || Math.hypot(P.x - last.x, P.y - last.y) > 14) { S.trail.push({ x: P.x, y: P.y + 10, l: life }); if (S.trail.length > mx) S.trail.shift(); }
        if (ready('cso', .35, dt)) { const R = (E ? 24 : 11 + L * 1.6) * ar, dm = E ? 9 : 1.6 + L, src = E ? 'csatorna' : 'cso';
          for (const p of S.trail) near(p.x, p.y, R, e => { if (S.t < e.csT) return; e.csT = S.t + .3; hurt(G, e, dm, 0, 0, src); if (E) e.slow = Math.max(e.slow, .5); });
          if (S.trail.length) snd('cso', .5); } }
      for (const p of S.trail) p.l -= dt; while (S.trail.length && S.trail[0].l <= 0) S.trail.shift(); }

    // ---- közelharc: kasza, kalapács, penge, lánc ----
    const sector = (x, y, a, R, w, f) => near(x, y, R, (e, dx, dy) => { let da = Math.atan2(dy, dx) - a; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < w + .15) f(e, dx, dy); });
    const aimA = R => { const e = nearest(R); return e ? Math.atan2(e.y - P.y, e.x - P.x) : (P.face > 0 ? 0 : Math.PI); };
    { const Ev = lvW('aratas'); L = lvW('kasza');
      if (Ev && ready('kasza', 1.1, dt)) { for (let i = 0; i < 2; i++) later(i * .18, () => { const R = 175 * ar, a = S.t * 3; S.mel.push({ k: 'kasza', x: P.x, y: P.y, a, R, w: Math.PI, l: .34, d: .34, gold: 1, dir: i ? -1 : 1 }); near(P.x, P.y, R, (e, dx, dy) => { const d = Math.hypot(dx, dy) || 1; hurt(G, e, 58, dx / d * 260, dy / d * 260, 'aratas'); }); G.shake = Math.max(G.shake || 0, 4 * G.d); }); Sfx.noise(.25, .12, 1400); }
      else if (L && ready('kasza', [1.6, 1.5, 1.3, 1.25, 1.1][L - 1], dt)) { const R = (95 + L * 9) * ar, w = L >= 4 ? 1.75 : L >= 2 ? 1.25 : 1.05, a0 = aimA(R + 60);
        for (const [i, a] of (L >= 5 ? [[0, a0], [1, a0 + Math.PI]] : [[0, a0]])) later(i * .15, () => { S.mel.push({ k: 'kasza', x: P.x, y: P.y, a, R, w, l: .3, d: .3, dir: i ? -1 : 1 }); sector(P.x, P.y, a, R, w, (e, dx, dy) => { const d = Math.hypot(dx, dy) || 1; hurt(G, e, 14 + L * 6, dx / d * 200, dy / d * 200, 'kasza'); }); });
        Sfx.noise(.18, .1, 1700); } }
    { const Ev = lvW('foldindulas'); L = lvW('kalapacs');
      if ((L || Ev) && ready('kalapacs', Ev ? 2 : [2.4, 2.3, 2.1, 1.8, 1.7][L - 1], dt)) { const hits = Ev ? 1 : L >= 5 ? 2 : 1;
        for (let h = 0; h < hits; h++) { const e = h ? randEnemy(220) : nearest(230), tx = e ? e.x : P.x + P.face * 60, ty = e ? e.y : P.y;
          S.hams.push({ x: tx, y: ty, t: 0, d: .32 + h * .15, a: Math.random() < .5 ? -1 : 1 });
          later(.32 + h * .15, () => { const n = Ev ? 3 : 1; for (let j = 0; j < n; j++) later(j * .28, () => { const R = (Ev ? 90 + j * 55 : 70 + L * 11) * ar, dm = Ev ? 52 : 20 + L * 8, st = Ev ? 1 : L >= 3 ? .8 : .5;
            S.rings.push({ x: tx, y: ty, R, l: 1, c: '150,215,255' }); S.cracks.push({ x: tx, y: ty, R: R * .9, l: 1.6, s: Math.random() * 99 }); part(tx, ty, 14, '150,215,255', 200, .5); part(tx, ty, 8, '207,174,116', 160, .6); G.shake = Math.max(G.shake || 0, (Ev ? 9 : 6) * G.d);
            near(tx, ty, R, (o, dx, dy) => { const d = Math.hypot(dx, dy) || 1; hurt(G, o, dm, dx / d * 240, dy / d * 240, Ev ? 'foldindulas' : 'kalapacs'); if (o.T.boss) o.slow = Math.max(o.slow, st * 1.5); else o.freeze = Math.max(o.freeze, st); }); Sfx.boom(); }); }); } } }
    { const Ev = lvW('hullampenge'); L = lvW('kard');
      if ((L || Ev) && ready('kard', Ev ? .75 : [1, .95, .8, .8, .72][L - 1], dt)) { const n = Ev || L >= 4 ? 4 : 3, R = (Ev ? 120 : 78 + (L >= 2) * 14) * ar;
        for (let i = 0; i < n; i++) later(i * .09, () => { const a = aimA(R + 80) + (i % 2 ? .35 : -.35) * (i === n - 1 ? 0 : 1), last = i === n - 1, dm = (Ev ? 30 : 9 + L * 3.5) * (last ? 2 : 1);
          S.mel.push({ k: 'kard', x: P.x, y: P.y, a, R: R * (last ? 1.2 : 1), w: last ? .45 : .85, l: .16, d: .16, dir: i % 2 ? -1 : 1, last });
          sector(P.x, P.y, a, R * (last ? 1.2 : 1), last ? .45 : .85, (e, dx, dy) => { const d = Math.hypot(dx, dy) || 1; hurt(G, e, dm, dx / d * (last ? 260 : 90), dy / d * (last ? 260 : 90), Ev ? 'hullampenge' : 'kard'); });
          if (Ev) S.pr.push({ x: P.x, y: P.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, r: 16, dmg: 18, pierce: 6, life: .6, hit: [], src: 'hullampenge', kind: 'crescent' });
          Sfx.blip(last ? 700 : 1100 + i * 120, .05, 'triangle', .035, 1.8); }); } }
    { const Ev = lvW('orveny_lanc'); L = lvW('lanc');
      if (L || Ev) { const n = Ev ? 2 : 1, R = (Ev ? 135 : 72 + (L >= 4) * 22) * ar, br = Ev ? 19 : 11 + (L >= 2) * 3, dm = Ev ? 62 : 16 + L * 6, kb = Ev || L >= 5 ? 420 : 240;
        S.lA = (S.lA || 0) + dt * (Ev ? 3.2 : L >= 3 ? 3 : 2.3); S.balls = [];
        for (let i = 0; i < n; i++) { const a = S.lA + i * Math.PI, bx = P.x + Math.cos(a) * R, by = P.y + Math.sin(a) * R; S.balls.push({ x: bx, y: by, r: br, a });
          near(bx, by, br + 4, e => { if (S.t < (e.lT || 0)) return; e.lT = S.t + .45; hurt(G, e, dm, -Math.sin(a) * kb + Math.cos(a) * kb * .5, Math.cos(a) * kb + Math.sin(a) * kb * .5, Ev ? 'orveny_lanc' : 'lanc'); part(bx, by, 3, '200,235,255', 90, .25); }); }
        if (Ev) near(P.x, P.y, R * 1.6, (e, dx, dy) => { if (e.T.boss) return; const d = Math.hypot(dx, dy) || 1; e.kx -= dx / d * 80 * dt * 10; e.ky -= dy / d * 80 * dt * 10; });
        S.ltrail.push(...S.balls.map(b => ({ x: b.x, y: b.y, l: .22 }))); }
      else S.balls = null;
      for (const q of S.ltrail) q.l -= dt; S.ltrail = S.ltrail.filter(q => q.l > 0).slice(-40); }
    for (const m of S.mel) m.l -= dt; S.mel = S.mel.filter(m => m.l > 0);
    for (const h of S.hams) h.t += dt; S.hams = S.hams.filter(h => h.t < h.d + .25);
    for (const c of S.cracks) c.l -= dt; S.cracks = S.cracks.filter(c => c.l > 0);

    // ---- saját fegyverek ----
    const shoot = (x, y, a, sp, dmg, o) => S.pr.push(Object.assign({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 5, dmg, pierce: 1, life: .9, hit: [] }, o)), SG = S.sig;
    { const Ev = lvW('aranyfejevo'); L = lvW('aranyfej');
      if ((L || Ev) && ready('aranyfej', Ev ? .45 : L >= 7 ? .5 : L >= 3 ? .6 : .72, dt)) { SG.ga = (SG.ga || 0) + (Ev ? .5 : .32); const n = Ev ? 9 : 3 + (L >= 2) + (L >= 4) + (L >= 6), cr = Ev ? .25 : L >= 8 ? .3 : L >= 5 ? .2 : 0;
        for (let i = 0; i < n; i++) shoot(P.x, P.y - 4, SG.ga + i * TAU / n, 400, (Ev ? 26 : 8 + L * 3) * (Math.random() < cr ? 2 : 1), { r: 6, pierce: Ev ? 4 : L >= 8 ? 3 : 2, life: L >= 3 || Ev ? 1.1 : .8, src: Ev ? 'aranyfejevo' : 'aranyfej', kind: 'gold' });
        snd('gold', .25); }
      if (Ev && (SG.wave = (SG.wave ?? 10) - dt) <= 0) { SG.wave = 10; const R = 240 * ar; S.rings.push({ x: P.x, y: P.y, R, l: 1, w: 1, c: '255,210,63' }); P.hp = Math.min(P.mhp, P.hp + 12);
        near(P.x, P.y, R, (e, dx, dy) => { const d = Math.hypot(dx, dy) || 1; hurt(G, e, 40, dx / d * 200, dy / d * 200, 'aranyfejevo'); }); Sfx.perfect(); } }
    { const Ev = lvW('releevo'); L = lvW('rele');
      if (L || Ev) { const n = Ev ? 5 : 1 + (L >= 2) + (L >= 4) + (L >= 5); SG.ra = (SG.ra || 0) + dt * 1.6; SG.cubes = []; for (let i = 0; i < n; i++) { const a = SG.ra + i * TAU / n; SG.cubes.push({ x: P.x + Math.cos(a) * 52, y: P.y + Math.sin(a) * 52 }); }
        if (ready('rele', Ev ? .4 : L >= 7 ? .42 : L >= 3 ? .55 : .8, dt)) { const tg = nearest(460); if (tg) { for (const c of SG.cubes) shoot(c.x, c.y, Math.atan2(tg.y - c.y, tg.x - c.x), 460, Ev ? 22 : 7 + L * 2.5 + (L >= 6) * 4, { r: 5, pierce: Ev || L >= 8 ? 3 : L >= 4 ? 2 : 1, src: Ev ? 'releevo' : 'rele', kind: 'cube' }); snd('cube', .2); } else S.wt.rele = .1; }
        if (Ev && (SG.zt = (SG.zt || 0) - dt) <= 0) { SG.zt = .25; for (let i = 0; i < n; i++) { const a = SG.cubes[i], b = SG.cubes[(i + 1) % n]; for (let k = 1; k < 4; k++) near(a.x + (b.x - a.x) * k / 4, a.y + (b.y - a.y) * k / 4, 14, e => hurt(G, e, 9, 0, 0, 'releevo')); } } }
      else SG.cubes = null; }
    { const Ev = lvW('veszevo'); L = lvW('veszgomb');
      if ((L || Ev) && ready('veszgomb', Ev ? 3.5 : L >= 7 ? 3.6 : L >= 4 ? 4.2 : 5.5, dt)) { const n = Ev || L >= 8 ? 3 : L >= 5 ? 2 : 1;
        for (let i = 0; i < n; i++) { const c = i ? (randEnemy(320) || P) : P, R = (Ev ? 160 : 90 + (L >= 2) * 25 + (L >= 3) * 10 + (L >= 6) * 25) * ar, fz = Ev ? 2 : L >= 3 ? 1.6 : 1.1;
          S.rings.push({ x: c.x, y: c.y, R, l: 1, w: 1, c: '255,80,60' }); near(c.x, c.y, R, e => { hurt(G, e, Ev ? 40 : 8 + L * 5, 0, 0, Ev ? 'veszevo' : 'veszgomb'); if (e.T.boss) e.slow = Math.max(e.slow, fz); else e.freeze = Math.max(e.freeze, fz); }); }
        Sfx.blip(520, .25, 'square', .05, .5); }
      if (Ev && (SG.big = (SG.big ?? 30) - dt) <= 0) { SG.big = 30; for (const e of S.en) { if (e.dead || e.under) continue; if (e.T.boss) e.slow = 3; else e.freeze = Math.max(e.freeze, 3); } for (const o of S.ep) o.dead = 1; banner('VÉSZLEÁLLÍTÁS!', 1.6, '#ff5a4d'); } }
    { const Ev = lvW('pidevo'); L = lvW('pid');
      if (Ev) { SG.pa = (SG.pa || 0) + dt * 4; if (ready('pid', .2, dt)) { near(P.x, P.y, 140 * ar, e => hurt(G, e, 14, 0, 0, 'pidevo')); let b = null; for (const e of S.en) if (!e.dead && !e.under && Math.abs(e.x - P.x) < V.hw && Math.abs(e.y - P.y) < V.hh && (!b || e.hp > b.hp)) b = e; if (b) hurt(G, b, 30, 0, 0, 'pidevo'); } }
      else if (L && ready('pid', L >= 6 ? .8 : 1.1, dt)) { const tg = nearest(360), base = tg ? Math.atan2(tg.y - P.y, tg.x - P.x) : (P.face > 0 ? 0 : Math.PI), n = 1 + (L >= 3) + (L >= 5) + (L >= 8), R = (150 + (L >= 4) * 40 + (L >= 7) * 30) * ar, wd = .5 + (L >= 4) * .2 + (L >= 7) * .15;
        for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * .9; S.cones.push({ x: P.x, y: P.y, a, R, w: wd, l: .3 });
          near(P.x, P.y, R, (e, dx, dy) => { let da = Math.atan2(dy, dx) - a; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < wd) { e.pidI = Math.min((e.pidI || 0) + (L >= 2 ? 6 : 3), 60); hurt(G, e, 12 + L * 3 + e.pidI, Math.cos(a) * 120, Math.sin(a) * 120, 'pid'); } }); }
        Sfx.noise(.15, .06, 2200); } }
    { const Ev = lvW('ak63evo'); L = lvW('ak63');
      if ((L || Ev) && ready('ak63', Ev ? .9 : L >= 7 ? .8 : L >= 4 ? 1 : 1.4, dt)) { const tg = nearest(560); if (!tg) S.wt.ak63 = .15; else { const n = Ev ? 12 : 3 + (L >= 2) * 2 + (L >= 5) * 3 + (L >= 6) * 2; for (let i = 0; i < n; i++) S.burst.push({ t: i * .06, k: 'ak', L, Ev }); if (Ev) S.burst.push({ t: n * .06 + .05, k: 'broom' }); } } }
    for (const b of S.burst) { if ((b.t -= dt) > 0) continue; b.dead = 1;
      if (b.k === 'ak') { const tg = nearest(560); if (tg) { shoot(P.x, P.y - 4, Math.atan2(tg.y - P.y, tg.x - P.x) + rnd(-.06, .06), 640, b.Ev ? 24 : 10 + b.L * 3, { r: 4, pierce: b.Ev ? 3 : b.L >= 8 ? 3 : b.L >= 3 ? 2 : 1, kb: b.L >= 5 || b.Ev ? 1.6 : 1, src: b.Ev ? 'ak63evo' : 'ak63', kind: 'bullet', life: .8 }); snd('ak', .05); } }
      else { const tg = nearest(400), a = tg ? Math.atan2(tg.y - P.y, tg.x - P.x) : 0, R = 200 * ar; S.cones.push({ x: P.x, y: P.y, a, R, w: .9, l: .45, gold: 1 }); Sfx.noise(.2, .1, 1200);
        near(P.x, P.y, R, (e, dx, dy) => { let da = Math.atan2(dy, dx) - a; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < .9) hurt(G, e, 45, Math.cos(a) * 300, Math.sin(a) * 300, 'ak63evo'); }); } }
    S.burst = S.burst.filter(b => !b.dead);
    { const Ev = lvW('pkmevo'); L = lvW('pkm');
      if ((L || Ev) && ready('pkm', Ev ? .06 : L >= 7 ? .065 : L >= 3 ? .08 : .1, dt)) { const tg = nearest(520); if (!tg) S.wt.pkm = .1; else { const sp = P.mov && L < 3 ? .4 : .15, a = Math.atan2(tg.y - P.y, tg.x - P.x) + rnd(-sp, sp), dirs = Ev ? [0, Math.PI] : L >= 8 ? [-.1, 0, .1] : L >= 4 ? [-.06, .06] : [0];
        for (const o of dirs) shoot(P.x, P.y - 2, a + o, 580, Ev ? 12 : 4 + L * 1.4 + (L >= 2) * 2, { r: 3.5, pierce: Ev ? 99 : L >= 5 ? 2 : 1, slow: L >= 5 || Ev ? .4 : 0, src: Ev ? 'pkmevo' : 'pkm', kind: 'bullet', life: .85 }); snd('pkm', .07); } } }
    for (const c of S.cones) c.l -= dt; S.cones = S.cones.filter(c => c.l > 0);
    if (S.fz === 'szoro') { S.fzA = (S.fzA || 0) + dt * 2.2; for (let i = 0; i < 2; i++) { const a = S.fzA + i * Math.PI, ox = P.x + Math.cos(a) * 92 * ar, oy = P.y + Math.sin(a) * 92 * ar; near(ox, oy, 16, e => { if (S.t < (e.fzT || 0)) return; e.fzT = S.t + .35; hurt(G, e, 34, Math.cos(a) * 220, Math.sin(a) * 220, 'fuzio'); }); } }
    else if (S.fz === 'ostor' && ready('fzO', 2, dt)) { const R = 160 * ar; S.rings.push({ x: P.x, y: P.y, R, l: 1, w: 1, c: '120,220,140' }); near(P.x, P.y, R, (e, dx, dy) => { const d = Math.hypot(dx, dy) || 1; hurt(G, e, 34, dx / d * 220, dy / d * 220, 'fuzio'); }); snd('tuzolto'); }
    else if (S.fz === 'felho' && ready('fzF', 1, dt)) { if (!S.fzC || S.fzC.life <= .4) { S.fzC = { x: P.x, y: P.y, R: 100 * ar, life: 99, l0: 0, tk: 0, dmg: 9, src: 'fuzio' }; S.clouds.push(S.fzC); } }
    else if (S.fz === 'kard' && ready('fzKd', 2, dt)) { for (let i = 0; i < 4; i++) later(i * .09, () => { const e = nearest(220), a = e ? Math.atan2(e.y - P.y, e.x - P.x) : 0; S.mel.push({ k: 'kard', x: P.x, y: P.y, a, R: 110, w: .8, l: .16, d: .16, dir: i % 2 ? -1 : 1, last: i === 3 }); sector(P.x, P.y, a, 110, .8, o => hurt(G, o, i === 3 ? 50 : 25, 0, 0, 'fuzio')); }); }
    else if (S.fz === 'lanc') { S.fzL = (S.fzL || 0) + dt * 2.6; const a = S.fzL + 1.5, bx = P.x + Math.cos(a) * 105 * ar, by = P.y + Math.sin(a) * 105 * ar; S.fzBall = { x: bx, y: by, r: 15, a }; near(bx, by, 19, e => { if (S.t < (e.lT2 || 0)) return; e.lT2 = S.t + .45; hurt(G, e, 45, Math.cos(a) * 300, Math.sin(a) * 300, 'fuzio'); }); }
    else if (S.fz === 'kanna' && ready('fzK', 3, dt)) { for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + S.t; S.cans.push({ x: P.x, y: P.y, vx: Math.cos(a) * 430, vy: Math.sin(a) * 430, ret: 0, hit: new Set(), rot: 0, dmg: 28, src: 'fuzio', big: 1 }); } snd('kanna'); }
    if (S.fzC) { S.fzC.x += (P.x - S.fzC.x) * Math.min(1, dt * 3); S.fzC.y += (P.y - S.fzC.y) * Math.min(1, dt * 3); S.fzC.life = 99; }

    for (const p of S.pr) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) { p.dead = 1; continue; }
      near(p.x, p.y, p.r, e => { if (p.dead || p.hit.includes(e.id)) return; p.hit.push(e.id); hurt(G, e, p.dmg, p.vx * .25 * (p.kb || 1), p.vy * .25 * (p.kb || 1), p.src);
        if (p.ice) { if (e.T.boss) e.slow = Math.max(e.slow, p.ice * 1.5); else e.freeze = Math.max(e.freeze, p.ice); } if (p.slow) e.slow = Math.max(e.slow, p.slow);
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
  function goldPile(x, y, n) { for (let i = 0, k = Math.min(n, 12); i < k; i++) { const a = i / k * TAU; S.gems.push({ k: 'g', x: x + Math.cos(a) * 26, y: y + Math.sin(a) * 18, v: Math.round(n / k) }); } }
  function collect(G, q) {
    if (q.k === 'g') { const v = Math.max(1, Math.round(q.v * S.st.gold)); S.gold += v; store.set('aszb_gold', store.get('aszb_gold') + v); S.dirty = 1; if (S.t - (S.gcT || -9) > .08) { S.gcT = S.t; Sfx.blip(1560, .07, 'triangle', .04, 1.4); } return; }
    const P = S.P;
    if (q.k === 'x') { P.xp += q.v * S.st.xp * (S.zapor > 0 ? 1.1 : 1); while (P.xp >= P.need) { P.xp -= P.need; P.lvl++; P.need = Math.floor(4 + P.lvl * 3.5 + P.lvl * P.lvl * .45); S.pending++; }
      if (S.t - S.gsT > .05) { S.gsT = S.t; Sfx.blip(900 + Math.random() * 300, .04, 'sine', .03); } }
    else if (q.k === 'h') { P.hp = Math.min(P.mhp, P.hp + 25); G.float(G.W / 2, G.H / 2 - 40 * G.d, '+25 ❤'); Sfx.coin(); }
    else if (q.k === 'm') { for (const o of S.gems) o.pull = 1; Sfx.perfect(); }
    else { for (let i = 0, n = q.dbl ? 2 : 1; i < n; i++) { const ev = evoAvail(); if (ev) S.evoQ.push(ev); else S.pending++; }
      P.hp = Math.min(P.mhp, P.hp + 30); G.score += q.dbl ? 500 : 250; S.dirty = 1; G.float(G.W / 2, G.H / 2 - 40 * G.d, q.dbl ? 'DUPLA KINCS! +500' : 'KINCS! +250'); }
  }
  function evoAvail() { for (const r of EVOR) if (lv(r[0]) >= bmx(r[0]) && lv(r[1]) >= 1 && !S.up[r[2]] && !S.evoQ.some(q => q[2] === r[2])) return r; return null; }

  /* ---------- karakterek feloldása ---------- */
  function checkUnlocks() {}

  /* ---------- szintlépés ---------- */
  /* fúzió: körönként egyszer; a kimaxolt (vagy evolvált) saját fegyver egy kimaxolt fegyverrel egyedi képességet kap.
     A társfegyver tovább működik, de nem foglal helyet. */
  const FZ = {
    pisztoly: { n: 'Nyomásmag', d: 'A saját fegyvered +35% sebzést és kétszeres hátralökést kap' },
    szoro: { n: 'Arany körforgás', d: 'Két nehéz aranycsepp kering körülötted, és mindent elsöpör' },
    ostor: { n: 'Pörgő csapás', d: '2 mp-enként vízcsapás söpör körbe körülötted' },
    bomba: { n: 'Robbanó találat', d: 'A saját fegyvered találatai 18% eséllyel felrobbannak' },
    felho: { n: 'Saját vihar', d: 'Lassító esőfelhő kísér mindenhová' },
    pocsolya: { n: 'Gyógyító víz', d: 'A saját fegyvered minden találata gyógyít egy keveset' },
    sugar: { n: 'Láncvillám', d: 'A találatok 35% eséllyel átugranak egy közeli ellenségre' },
    rainbird: { n: 'Szaporított ütem', d: 'A saját fegyvered 30%-kal gyorsabban tüzel' },
    kanna: { n: 'Kannazápor', d: '3 mp-enként négy kanna repül szét körülötted' },
    gejzir: { n: 'Feltörő forrás', d: 'A találatok 12% eséllyel gejzírt fakasztanak' },
    jeg: { n: 'Fagyos mag', d: 'A saját fegyvered találatai megfagyasztanak' },
    heli: { n: 'Légi felderítés', d: '+50% gyűjtési távolság és +20% XP' },
    kasza: { n: 'Aratóél', d: 'A találatok 20% eséllyel kaszacsapást váltanak ki a célpont körül' },
    kalapacs: { n: 'Rengető ütés', d: 'A találatok 10% eséllyel kábító rengéshullámot keltenek' },
    kard: { n: 'Pengetánc', d: '2 mp-enként négyes vízpenge-kombó vág a legközelebbire' },
    lanc: { n: 'Láncgömb', d: 'Egy nehéz golyó pörög körülötted láncon' },
    cso: { n: 'Átáztatás', d: 'A találat átáztat: lassít, és +20% sebzést kap mindentől' }
  };
  UP.fuzio = { n: 'Fúzió', sp: 1, hid: 1, d: '' };
  const sigKeys = () => { const w = (CH.find(c => c.id === S.ch) || CH[0]).w, r = EVOR.find(r => r[0] === w); return [w, r ? r[2] : '']; };
  const baseW = k => UP[k] && UP[k].evo ? UP[k].from : k;
  function fuseCands() { if (S.fz) return []; const [w, e] = sigKeys(); if (!(lv(w) >= mxl(w) || lv(e))) return [];
    return Object.keys(S.up).filter(k => isW(k) && k !== w && k !== e && FZ[baseW(k)] && (UP[k].evo || lv(k) >= mxl(k))); }
  function fuseRows(G) { const d = G.d, o = S.fuse.o, cols = G.W / d > 760 && o.length > 3 ? 2 : 1, cw = Math.min((G.W - 30 * d) / cols, 420 * d), rh = Math.min(84 * d, (G.H - 290 * d) / Math.ceil(o.length / cols)), x0 = (G.W - cols * cw) / 2;
    return o.map((k, i) => ({ k, x: x0 + (i % cols) * cw + 5 * d, y: 190 * d + Math.floor(i / cols) * rh, w: cw - 10 * d, h: rh - 10 * d })); }
  const fuseLater = G => ({ x: G.W / 2 - 90 * G.d, y: G.H - 72 * G.d, w: 180 * G.d, h: 44 * G.d, t: 'KÉSŐBB' });
  function doFuse(G, k) { const P = S.P; S.fz = baseW(k); S.fzW = k; S.fused = [k]; S.fuse = null; P.inv = Math.max(P.inv, 1); S.flash = .5; stats();
    banner('FÚZIÓ: ' + FZ[S.fz].n.toUpperCase(), 3, '#ff8a2a'); Sfx.boom(); setTimeout(() => Sfx.perfect(), 220); }
  function fuseHit(G, e, dmg) { const f = S.fz, P = S.P;
    if (f === 'bomba' && Math.random() < .18) { S.rings.push({ x: e.x, y: e.y, R: 64, l: 1, c: '255,170,60' }); near(e.x, e.y, 64, (o, dx, dy) => { const d = Math.hypot(dx, dy) || 1; hurt(G, o, 26, dx / d * 160, dy / d * 160, 'fuzio'); }); }
    else if (f === 'sugar' && Math.random() < .35) { let b = null, bd = 140 * 140; near(e.x, e.y, 140, (o, dx, dy) => { const q = dx * dx + dy * dy; if (o !== e && q < bd) { bd = q; b = o; } }); if (b) { S.bolts.push({ x1: e.x, y1: e.y, x2: b.x, y2: b.y, l: .2, s: Math.random() * 99 }); hurt(G, b, dmg * .5, 0, 0, 'fuzio'); } }
    else if (f === 'gejzir' && Math.random() < .12) S.geys.push({ x: e.x, y: e.y, t: -.3, R: 42, dmg: 30, life: .55, tk: 0, src: 'fuzio' });
    else if (f === 'kasza' && Math.random() < .2) { S.mel.push({ k: 'kasza', x: e.x, y: e.y, a: Math.random() * TAU, R: 70, w: Math.PI, l: .26, d: .26, dir: 1 }); near(e.x, e.y, 70, o => hurt(G, o, 22, 0, 0, 'fuzio')); }
    else if (f === 'kalapacs' && Math.random() < .1) { S.rings.push({ x: e.x, y: e.y, R: 85, l: 1, c: '150,215,255' }); S.cracks.push({ x: e.x, y: e.y, R: 70, l: 1.2, s: Math.random() * 99 }); near(e.x, e.y, 85, o => { hurt(G, o, 30, 0, 0, 'fuzio'); if (o.T.boss) o.slow = 1; else o.freeze = Math.max(o.freeze, .6); }); }
    else if (f === 'jeg') { if (e.T.boss) e.slow = Math.max(e.slow, 1); else e.freeze = Math.max(e.freeze, .6); }
    else if (f === 'pocsolya') P.hp = Math.min(P.mhp, P.hp + .35);
    else if (f === 'cso') { e.wet = S.t + 2.5; e.slow = Math.max(e.slow, 1); } }
  const nW = () => Object.keys(S.up).filter(k => isW(k) && !S.fused.includes(k)).length, nP = () => Object.keys(S.up).filter(k => !isW(k)).length;
  function offer() {
    const av = Object.keys(UP).filter(k => { const u = UP[k], c = lv(k); if (u.sp || u.evo || c >= mxl(k) || S.evd[k]) return false; if (u.hid && !c) return false; if (u.sig && u.sig !== S.ch) return false;
      if (!c && (isW(k) ? nW() >= MAXW : nP() >= MAXP)) return false; if (k === 'pisztoly' && S.up.por) return false; return true; });
    for (let i = av.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[av[i], av[j]] = [av[j], av[i]]; }
    const sg = av.findIndex(k => UP[k].sig); if (sg > 0 && Math.random() < .55) av.unshift(av.splice(sg, 1)[0]);
    const n = lv('lohere') >= 5 ? 4 : 3, o = av.slice(0, n); for (const k of ['gyogy', 'pont']) if (o.length < 3) o.push(k); return o;
  }
  function openChoice() { S.choose = { o: offer(), t: 0 }; joy = null; Sfx.perfect(); }
  function openEvo(r) { S.choose = { o: [r[2]], t: 0, evo: r }; joy = null; S.flash = .6; Sfx.perfect(); setTimeout(() => Sfx.blip(1568, .3, 'triangle', .07, 1.5), 260); }
  function pick(G, i) {
    const c = S.choose; if (!c || c.t < .35 || !c.o[i]) return; const k = c.o[i], P = S.P;
    if (c.evo) { const [from] = c.evo; delete S.up[from]; S.up[k] = MAXLV; S.evd[from] = 1; S.evoN++; stats(); S.choose = null; P.inv = Math.max(P.inv, .9); Sfx.boom(); return; }
    if (k === 'gyogy') P.hp = Math.min(P.mhp, P.hp + 40); else if (k === 'pont') { G.score += 500; S.dirty = 1; }
    else { S.up[k] = lv(k) + 1; stats(); if (k === 'vitamin') P.hp = Math.min(P.mhp, P.hp + 25); }
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
  function selCards(G) { const d = G.d, cols = selCols(G), rows = Math.ceil(CH.length / cols), gap = 10 * d, w = Math.min((G.W - 24 * d - (cols - 1) * gap) / cols, 220 * d), h = Math.min(160 * d, (G.H - 270 * d - (rows - 1) * gap) / rows);
    const x0 = (G.W - (cols * w + (cols - 1) * gap)) / 2, y0 = Math.max(96 * d, (G.H - (rows * h + (rows - 1) * gap)) / 2 - 10 * d);
    return CH.map((c, i) => ({ c, i, x: x0 + (i % cols) * (w + gap), y: y0 + Math.floor(i / cols) * (h + gap), w, h })); }
  function kutBtn(G) { const cs = selCards(G), l = cs[cs.length - 1], d = G.d, w = Math.min(300 * d, G.W - 40 * d); return { x: (G.W - w) / 2, y: l.y + l.h + 16 * d, w, h: 44 * d }; }
  function shopRows(G) { const d = G.d, cols = G.W / d > 700 ? 2 : 1, cw = Math.min((G.W - 30 * d) / cols, 400 * d), rh = Math.min(58 * d, (G.H - 200 * d) / Math.ceil(META.length / cols)), x0 = (G.W - cols * cw) / 2;
    return META.map((u, i) => ({ u, i, x: x0 + (i % cols) * cw + 4 * d, y: 112 * d + Math.floor(i / cols) * rh, w: cw - 8 * d, h: rh - 6 * d })); }
  const shopClose = G => ({ x: G.W / 2 - 90 * G.d, y: G.H - 70 * G.d, w: 180 * G.d, h: 44 * G.d, t: 'VISSZA' });
  function selPick(G, i) { const c = CH[i]; if (!c || S.sel.t < .25) return; S.sel.i = i; if (!chOpen(c)) { S.sel.shake = .35; Sfx.blip(150, .15, 'square', .05, .7); return; }
    S.ch = c.id; S.up = { [c.w]: 1 }; S.sigK = sigKeys(); S.sel = null; S.shop = null; S.meta = metaGet(); S.rr = 3 + (S.meta.rr || 0); S.rev = S.meta.rev || 0; stats(); S.P.hp = S.P.mhp; Sfx.coin(); S.started = 1; }

  /* ---------- statisztika a kör végén ---------- */
  function showStats() {
    const ov = document.querySelector('#pOver > div'), row = ov && ov.querySelector('.row'); if (!row) return; let el = document.getElementById('aszbStat');
    if (!el) { el = document.createElement('div'); el.id = 'aszbStat'; el.style.cssText = 'margin:.6rem auto .9rem;max-width:340px;font:600 .82rem Inter,sans-serif;color:#c9d6e6;text-align:left'; ov.insertBefore(el, row); }
    const c = CH.find(c => c.id === S.ch) || CH[0], tot = Object.values(S.dmgBy).reduce((a, b) => a + b, 0) || 1, list = Object.entries(S.dmgBy).sort((a, b) => b[1] - a[1]).slice(0, 8);
    el.innerHTML = `<div style="display:flex;justify-content:space-between;gap:.6rem;flex-wrap:wrap;margin-bottom:.5rem"><span>⏱ ${fmtT(S.t)}</span><span>💀 ${S.kills.toLocaleString('hu-HU')}</span><span>⭐ ${S.P.lvl}. szint</span><span>👤 ${c.n}</span><span style="color:#ffd23f">◉ ${S.gold} arany</span></div>`
      + list.map(([k, v]) => `<div style="display:flex;align-items:center;gap:.5rem;margin:.18rem 0"><span style="flex:0 0 46%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${UP[k] ? UP[k].n : k}</span><span style="flex:1;height:.5rem;border-radius:.25rem;background:rgba(255,255,255,.08);overflow:hidden"><span style="display:block;height:100%;width:${Math.max(2, v / tot * 100).toFixed(1)}%;background:${UP[k] && UP[k].evo ? '#ffd23f' : '#3aa6f5'}"></span></span><span style="flex:0 0 3.6rem;text-align:right">${Math.round(v).toLocaleString('hu-HU')}</span></div>`).join('');
    el.hidden = false;
  }
  const hideStats = () => { const el = document.getElementById('aszbStat'); if (el) el.hidden = true; };

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
    pont(g) { g.fillStyle = '#ffd23f'; drop(g, 0, 1, 7.5); g.fillStyle = 'rgba(255,255,255,.75)'; circ(g, -2.5, 1.5, 1.8); },
    /* saját fegyverek */
    kasza(g) { g.strokeStyle = '#7a4a24'; g.lineWidth = 2.4; g.lineCap = 'round'; ln(g, -6, 10, 4, -9); g.fillStyle = '#c9d3de'; g.beginPath(); g.moveTo(4, -9); g.quadraticCurveTo(-8, -12, -11, -2); g.quadraticCurveTo(-5, -7, 3, -6); g.closePath(); g.fill(); g.strokeStyle = '#6cc6ff'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-10, -3); g.quadraticCurveTo(-6, -9, 2, -8); g.stroke(); },
    kalapacs(g) { g.save(); g.rotate(-.5); g.fillStyle = '#7a4a24'; g.fillRect(-1.5, -2, 3, 13); g.fillStyle = '#5a6672'; rrp(g, -8, -9, 16, 8, 1.5); g.fillStyle = '#8c98a6'; g.fillRect(-8, -9, 16, 2.5); g.fillStyle = '#3aa6f5'; circ(g, 0, -5, 1.8); g.restore(); },
    kard(g) { g.save(); g.rotate(-.75); g.fillStyle = '#bfe9ff'; g.beginPath(); g.moveTo(-2, 4); g.lineTo(-2, -10); g.lineTo(0, -13); g.lineTo(2, -10); g.lineTo(2, 4); g.fill(); g.fillStyle = '#e8b656'; g.fillRect(-6, 4, 12, 2.4); g.fillStyle = '#7a4a24'; g.fillRect(-1.3, 6, 2.6, 6); g.restore(); g.strokeStyle = 'rgba(108,198,255,.7)'; g.lineWidth = 1.4; g.beginPath(); g.arc(0, 0, 10, -2.6, -.3); g.stroke(); },
    lanc(g) { g.strokeStyle = '#8c98a6'; g.lineWidth = 1.6; g.setLineDash([2, 1.5]); ln(g, -9, 9, 2, -2); g.setLineDash([]); g.fillStyle = '#46525f'; circ(g, 4, -4, 6); g.fillStyle = '#8c98a6'; for (let i = 0; i < 6; i++) { const a = i * TAU / 6; g.beginPath(); g.moveTo(4 + Math.cos(a) * 5.5, -4 + Math.sin(a) * 5.5); g.lineTo(4 + Math.cos(a + .26) * 8.5, -4 + Math.sin(a + .26) * 8.5); g.lineTo(4 + Math.cos(a + .52) * 5.5, -4 + Math.sin(a + .52) * 5.5); g.fill(); } g.fillStyle = '#3aa6f5'; circ(g, 4, -4, 1.8); },
    pajzs(g) { g.fillStyle = 'rgba(108,198,255,.3)'; circ(g, 0, 0, 10); g.strokeStyle = '#6cc6ff'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.stroke(); g.fillStyle = '#bfe9ff'; g.beginPath(); g.moveTo(0, -6); g.lineTo(5, -3.5); g.lineTo(4, 3); g.lineTo(0, 7); g.lineTo(-4, 3); g.lineTo(-5, -3.5); g.closePath(); g.fill(); g.fillStyle = '#3aa6f5'; drop(g, 0, 0, 2.4); },
    vert(g) { g.fillStyle = '#9aa3ae'; g.beginPath(); g.moveTo(-8, -8); g.lineTo(8, -8); g.lineTo(9, 2); g.quadraticCurveTo(0, 11, -9, 2); g.closePath(); g.fill(); g.fillStyle = '#c9d3de'; g.fillRect(-1.2, -8, 2.4, 15); g.fillStyle = '#5a6672'; for (const [x, y] of [[-5, -5], [5, -5], [-5, 1], [5, 1]]) circ(g, x, y, 1); },
    aranyfej(g) { g.strokeStyle = '#7a4a24'; g.lineWidth = 2.6; g.lineCap = 'round'; ln(g, -6, 10, 2, -2); g.fillStyle = '#ffd23f'; rrp(g, -1, -7, 8, 6, 1.5); g.fillRect(-6, -6, 18, 2.4); g.fillStyle = 'rgba(255,236,150,.6)'; circ(g, 3, -5, 7); g.fillStyle = '#ffd23f'; circ(g, 3, -5, 2.4); },
    rele(g) { g.save(); g.rotate(.3); g.fillStyle = '#2a5ab8'; rrp(g, -7, -7, 14, 14, 2); g.strokeStyle = '#bfe8ff'; g.lineWidth = 1.6; g.strokeRect(-3.5, -3.5, 7, 7); g.restore(); g.fillStyle = 'rgba(108,198,255,.5)'; circ(g, 8, -8, 2.4); },
    veszgomb(g) { g.fillStyle = '#e8c030'; rrp(g, -9, -1, 18, 10, 2); g.fillStyle = '#d8342a'; g.beginPath(); g.ellipse(0, -1, 7.5, 5, 0, Math.PI, 0); g.fill(); g.fillRect(-7.5, -2, 15, 2.5); g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(-2.5, -4, 2.4, 1.2, 0, 0, TAU); g.fill(); },
    pid(g) { g.strokeStyle = '#5ad8e0'; g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath(); for (let i = 0; i < 40; i++) { const a = i * .3, r = 1 + i * .23; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.stroke(); g.fillStyle = '#bff4f8'; circ(g, 0, 0, 1.8); },
    ak63(g) { g.fillStyle = '#7a4a24'; g.beginPath(); g.moveTo(-11, -1); g.lineTo(-5, -3); g.lineTo(-4, 2); g.lineTo(-10, 4); g.fill(); g.fillStyle = '#3a3a40'; g.fillRect(-5, -3, 11, 4); g.fillRect(6, -2.4, 6, 2); g.fillStyle = '#ffd23f'; g.fillRect(11, -3, 2, 3); g.fillStyle = '#4fb7ff'; g.beginPath(); g.moveTo(-1, 1); g.quadraticCurveTo(1, 7, -3, 10); g.lineTo(1, 10); g.quadraticCurveTo(4, 6, 2, 1); g.fill(); },
    pkm(g) { g.fillStyle = '#7a4a24'; g.fillRect(-12, -2, 6, 4); g.fillStyle = '#2a2a30'; g.fillRect(-6, -4, 12, 6); g.fillRect(6, -2.5, 7, 2.4); g.fillStyle = '#ffd23f'; g.fillRect(12, -3.4, 2, 3.4); g.fillStyle = '#e8b656'; for (let i = 0; i < 4; i++) g.fillRect(-4 + i * 2.6, -7, 1.6, 3); g.fillStyle = '#4fb7ff'; rrp(g, -4, 2, 8, 7, 1.5); }
  };
  function ico(g, k, x, y, s) { g.save(); g.translate(x, y); g.scale(s / 24, s / 24); const u = UP[k];
    if (u && u.evo) { g.fillStyle = 'rgba(255,210,63,.3)'; circ(g, 0, 0, 12); g.strokeStyle = u.fz ? '#ff8a2a' : '#ffd23f'; g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, 11.5, 0, TAU); g.stroke(); IC[u.from](g);
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
  const LOOK = {
    gh: { pants: '#2a2a32', boot: '#6a4a2a', shirt: '#1e1e24', shirt2: '#2a3a8a', skin: '#f1c9a0', hair: '#5a3a24', cape: '#2a3a8a', trim: '#d8a030' },
    rl: { pants: '#4a3e30', boot: '#2a2420', shirt: '#8a8478', shirt2: '#5a3a24', skin: '#f1c9a0', hair: '#6a4428' },
    gt: { pants: '#141418', boot: '#1c2450', shirt: '#1c2450', shirt2: '#5a3a24', skin: '#f1c9a0', hair: '#e8c060', cape: '#1c2450', trim: '#d8a030' },
    kt: { pants: '#1e1e2a', boot: '#1c2450', shirt: '#1c2450', shirt2: '#5ad8e0', skin: '#f1c9a0', hair: '#4a2e1c', cape: '#1c2450', trim: '#5ad8e0' },
    zr: { pants: '#6a7040', boot: '#5a4632', shirt: '#8a8478', shirt2: '#5a3a24', skin: '#f1c9a0', hair: '#18161c', cape: '#2e6226' },
    bt: { pants: '#6a7040', boot: '#6a5a44', shirt: '#6a7040', shirt2: '#4e5a2e', skin: '#f1c9a0', hair: '#2a1a10' }
  };
  function drawHero(g, id, mov, walk, t) {
    const L = LOOK[id] || LOOK.gh, b = mov ? Math.sin(walk) : 0, bob = mov ? Math.abs(Math.cos(walk)) * 1.5 : 0;
    /* hátsó rétegek: köpeny, tartály, seprű */
    if (L.cape) { g.fillStyle = L.cape; g.beginPath(); g.moveTo(-7, -6 - bob); g.lineTo(7, -6 - bob); g.lineTo(9, 12); g.lineTo(-11, 13); g.closePath(); g.fill(); if (L.trim) { g.strokeStyle = L.trim; g.lineWidth = 1; ln(g, -11, 13, 9, 12); } }
    if (id === 'zr') { g.strokeStyle = '#7a4a24'; g.lineWidth = 1.6; g.lineCap = 'round'; ln(g, -9, 8 - bob, 3, -22 - bob); g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(1, -21 - bob); g.lineTo(7, -29 - bob); g.lineTo(9, -25 - bob); g.lineTo(4, -19 - bob); g.fill(); g.fillStyle = 'rgba(255,236,150,.35)'; circ(g, 5, -24 - bob, 6); }
    if (id === 'bt') { g.fillStyle = '#9aa3ae'; rrp(g, -14, -10 - bob, 9, 17, 3); g.fillStyle = '#4fb7ff'; rrp(g, -13, -6 - bob, 7, 9, 2); g.fillStyle = '#5a5f68'; g.fillRect(-12, -12 - bob, 4, 3); }
    /* lábak */
    g.fillStyle = L.pants; g.fillRect(-6, 6, 5, 8 + b * 2.5); g.fillRect(1, 6, 5, 8 - b * 2.5);
    g.fillStyle = L.boot; g.fillRect(-7, 13 + b * 2.5, 7, 3); g.fillRect(0, 13 - b * 2.5, 7, 3);
    g.translate(0, -bob);
    /* törzs */
    g.fillStyle = L.shirt; rrp(g, -8, -6, 16, 14, 4); g.fillStyle = L.shirt2; g.fillRect(-8, 3, 16, 2);
    if (id === 'gh') { g.fillStyle = '#4fb7ff'; drop(g, 3, -2, 1.6); g.fillStyle = L.cape; g.fillRect(-8, -6, 3, 13); g.fillStyle = L.trim; g.fillRect(-5.5, -6, 1, 13); }
    else if (id === 'rl') { g.fillStyle = '#3a3a44'; rrp(g, -4, -4, 7, 5, 1); g.fillStyle = '#4fb7ff'; g.fillRect(-3, -3, 5, 3); g.strokeStyle = '#c42a20'; g.lineWidth = 1; ln(g, -6, -4, -4, 4); }
    else if (id === 'gt') { g.fillStyle = '#f0f0f4'; g.fillRect(-2, -6, 4, 14); g.fillStyle = '#d8342a'; circ(g, 0, -3, 1.8); g.fillStyle = '#c4c8d0'; rrp(g, -10, -7, 6, 4, 2); rrp(g, 4, -7, 6, 4, 2); }
    else if (id === 'kt') { g.fillStyle = '#f0f0f4'; g.fillRect(-2, -6, 4, 6); g.fillStyle = '#5ad8e0'; drop(g, 0, -4, 1.3); }
    else if (id === 'zr') { g.fillStyle = '#ffd23f'; drop(g, 0, -2, 1.8); g.fillStyle = '#4e5a2e'; g.fillRect(-8, -6, 3, 3); g.fillRect(4, 0, 4, 3); }
    else if (id === 'bt') { g.fillStyle = '#4e5a2e'; g.fillRect(-6, -4, 4, 3); g.fillRect(2, 1, 5, 3); g.fillStyle = '#ffd23f'; drop(g, 4, -3, 1.2); g.strokeStyle = '#2e6226'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-10, 2); g.quadraticCurveTo(-8, 12, 2, 6); g.stroke(); }
    /* fegyver a kézben */
    if (id === 'gh') { g.strokeStyle = '#7a4a24'; g.lineWidth = 1.6; g.lineCap = 'round'; ln(g, 9, 14, 11, -16); g.fillStyle = '#ffd23f'; rrp(g, 8, -20, 6, 4, 1); g.fillRect(5, -19, 12, 1.6); g.fillStyle = `rgba(255,236,150,${.35 + .15 * Math.sin(t * 5)})`; circ(g, 11, -18, 5); }
    else if (id === 'rl') { g.save(); g.translate(14, -6 + Math.sin(t * 3) * 1.5); g.rotate(t); g.fillStyle = '#2a5ab8'; rrp(g, -3, -3, 6, 6, 1); g.strokeStyle = '#bfe8ff'; g.lineWidth = .8; g.strokeRect(-1.5, -1.5, 3, 3); g.restore(); }
    else if (id === 'gt') { g.fillStyle = '#e8c030'; rrp(g, 8, -1, 6, 4, 1); g.fillStyle = '#d8342a'; g.beginPath(); g.ellipse(11, -1, 2.6, 1.8, 0, Math.PI, 0); g.fill(); }
    else if (id === 'kt') { g.strokeStyle = 'rgba(90,216,224,.85)'; g.lineWidth = 1.4; g.beginPath(); for (let i = 0; i < 18; i++) { const a = i * .5 + t * 4, r = 1 + i * .25; g.lineTo(13 + Math.cos(a) * r, Math.sin(a) * r); } g.stroke(); }
    else if (id === 'zr') { g.fillStyle = '#7a4a24'; g.fillRect(2, -1, 5, 3); g.fillStyle = '#3a3a40'; g.fillRect(6, -2, 9, 3); g.fillRect(14, -1.5, 4, 1.6); g.fillStyle = '#4fb7ff'; rrp(g, 8, 1, 2.4, 5, 1); g.fillStyle = '#ffd23f'; g.fillRect(17.5, -2, 1.4, 2.4); }
    else if (id === 'bt') { g.fillStyle = '#7a4a24'; g.fillRect(0, 0, 5, 3); g.fillStyle = '#2a2a30'; g.fillRect(4, -1, 12, 4); g.fillRect(15, 0, 5, 2); g.fillStyle = '#e8b656'; for (let i = 0; i < 3; i++) g.fillRect(6 + i * 2, -3, 1.2, 2); g.fillStyle = '#4fb7ff'; rrp(g, 6, 3, 5, 4, 1); g.fillStyle = '#ffd23f'; g.fillRect(19.5, -.5, 1.4, 3); }
    /* kéz, fej */
    g.fillStyle = L.skin; circ(g, 8, 1, 2.7); circ(g, 0, -12, 7);
    if (id === 'kt') { g.fillStyle = L.hair; rrp(g, -10, -14, 4, 14, 2); circ(g, -8, -16, 3); }
    g.fillStyle = id === 'gt' ? '#2a6ab8' : id === 'kt' ? '#1a8aa8' : '#1a0d05'; circ(g, 3.2, -11.5, 1.2);
    /* haj / fejfedő */
    if (id === 'bt') { g.fillStyle = '#6a7040'; g.beginPath(); g.arc(0, -13, 8, Math.PI * 1.02, -.02); g.fill(); g.fillRect(-9, -14, 18, 2.4); g.fillStyle = '#4e5a2e'; circ(g, -3, -17, 2); circ(g, 3, -18, 1.6); g.strokeStyle = '#3a4a24'; g.lineWidth = .8; ln(g, 6, -12, 6, -6); }
    else { g.fillStyle = L.hair; g.beginPath(); g.arc(0, -13, 7.6, Math.PI * 1.05, -.1); g.fill();
      const sp = id === 'kt' ? [] : [[-6, -18, -9, -22], [-2, -20, -3, -25], [2, -20, 5, -24], [5, -17, 9, -20]];
      for (const [a, c, e, f] of sp) { g.beginPath(); g.moveTo(a - 2, c + 2); g.lineTo(e, f); g.lineTo(a + 2.5, c + 1); g.fill(); }
      if (id === 'kt') { g.beginPath(); g.moveTo(-7, -14); g.quadraticCurveTo(0, -24, 7, -13); g.lineTo(5, -10); g.quadraticCurveTo(0, -16, -6, -10); g.fill(); g.fillStyle = '#5ad8e0'; g.fillRect(-6, -19, 3, 2); }
      else { g.fillRect(-7, -14, 4, 3); } }
    if (id === 'rl') { g.fillStyle = '#5a3a24'; g.fillRect(-7, -17, 14, 2); g.fillStyle = '#9fdcff'; circ(g, -1, -17, 2.4); circ(g, 4, -17, 2.4); }
    if (id === 'zr') { g.strokeStyle = '#2a2a30'; g.lineWidth = .9; g.strokeRect(1.4, -13.4, 4, 3.4); ln(g, 1.4, -12, -2, -12); }
    if (id === 'gh') { g.fillStyle = 'rgba(90,60,40,.45)'; for (const [x, y] of [[2, -7], [4, -8], [6, -9], [0, -6.5]]) circ(g, x, y, .5); }
  }
  /* az új ellenségek és bossok rajzai (rajz.js, modulként töltődik be: window.ABR) */
  let artReq = 0;
  function loadArt() { if (ART) return;
    if (!window.ABR) { if (!artReq) { artReq = 1; import('./rajz.js?v=' + Date.now().toString(36).slice(0, 6)).then(R => { window.ABR = window.ABR || R; artDirty = 1; }).catch(() => { artReq = 0; }); } return; }
    const R = window.ABR; ART = {};
    const add = (k, inner, vb, ar) => { const im = new Image(); im.onload = () => { artDirty = 1; }; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(R.svgOf(inner, vb)); ART[k] = { im, ar }; };
    for (const e of R.EN) add(e[0], e[7], '0 0 120 120', 1);
    const BA = { watchdog: R.wdk('f', 'calm'), kiraly: R.kk('f', 'calm'), ladder: R.ldm('f', 'calm'), fereg: R.hf('f', 'calm'), boszi: R.stw('f', 'calm'), szilard: R.szl('f', 'smirk'), isten: R.god('f', 'calm') };
    for (const k in BA) add(k, BA[k], k === 'kiraly' ? '24 0 152 300' : '0 0 200 300', k === 'kiraly' ? 152 / 300 : 2 / 3); }
  function buildSpr() { loadArt(); let miss = 0;
    for (const k in ET) { const T = ET[k], A = ART && ART[k]; if (!A || !A.im.complete || !A.im.naturalWidth) { miss = 1; continue; }
      const sh = (T.boss ? T.sz * 1.15 : T.r * 3.4), sw = T.boss ? sh * A.ar : sh, c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(sw * V.sc)); c.height = Math.max(1, Math.ceil(sh * V.sc)); c.getContext('2d').drawImage(A.im, 0, 0, c.width, c.height);
      const w = document.createElement('canvas'); w.width = c.width; w.height = c.height; const y = w.getContext('2d'); y.drawImage(c, 0, 0); y.globalCompositeOperation = 'source-atop'; y.fillStyle = 'rgba(255,255,255,.8)'; y.fillRect(0, 0, w.width, w.height);
      SPR[k] = { c, w, sw: c.width, sh: c.height, sz: Math.max(c.width, c.height), oy: (T.r * .9 - sh * (T.boss ? .42 : .383)) * V.sc }; }
    artMiss = miss;
  }
  function build() {
    sprSc = V.sc; SPR = {};
    if (!VIG) { VIG = document.createElement('canvas'); VIG.width = VIG.height = 128; const v = VIG.getContext('2d'), vg = v.createRadialGradient(64, 64, 34, 64, 64, 92); vg.addColorStop(0, 'rgba(20,8,0,0)'); vg.addColorStop(1, 'rgba(20,8,0,.55)'); v.fillStyle = vg; v.fillRect(0, 0, 128, 128); }
    buildSpr();
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
    g.scale(P.face, 1); drawHero(g, S.ch || 'gh', P.mov, P.walk, t);
    g.restore();
  }
  function btn(g, G, b, gold) { const d = G.d; g.fillStyle = b.off ? 'rgba(40,46,58,.8)' : gold ? '#e8b656' : 'rgba(30,48,80,.95)'; rrp(g, b.x, b.y, b.w, b.h, 10 * d);
    g.strokeStyle = b.off ? 'rgba(255,255,255,.1)' : 'rgba(120,190,255,.45)'; g.lineWidth = 1.4 * d; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 10 * d); g.stroke();
    g.font = `800 ${12.5 * d}px Inter, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = b.off ? 'rgba(255,255,255,.35)' : gold ? '#1a1004' : '#e6f2ff'; g.fillText(b.t, b.x + b.w / 2, b.y + b.h / 2 + .5 * d, b.w - 10 * d); }
  const inR = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

  const me = {
    id: 'aszalybeta', name: 'ASZÁLYTÚLÉLŐ: A NAGY SZÁRAZSÁG', lock: 1, nolb: 1, tag: 'ZÁRT BÉTA', lives: 0, quit: true, sponsor: 'A Zerosites támogatásával', overTitle: 'KISZÁRADTÁL',
    desc: 'Az Aszálytúlélő nagy frissítése zárt bétában: hat karakter saját fegyverrel, 39 új ellenség öt családban, a Tanács próbái, Szikkadt Szilárd haragja és az Aszály Istene. A pontszám nem kerül ranglistára.',
    how: 'WASD / NYILAK VAGY HÚZÁS = MOZGÁS · P / ESC = SZÜNET · 🏁 = BEFEJEZÉS',
    ranks: [[0, 'Szomjas palánta'], [5000, 'Kerti túlélő'], [25000, 'Aszályvadász'], [60000, 'Esőcsináló'], [110000, 'Az Aszály Legyőzője']],
    init(G) {
      S = { t: 0, P: { x: 0, y: 0, hp: 100, mhp: 100, inv: 0, face: 1, walk: 0, mov: 0, lvl: 1, xp: 0, need: 7 }, up: { pisztoly: 1 }, wt: {}, en: [], pr: [], gems: [], bombs: [], clouds: [], rings: [], slashes: [], pt: [], nums: [],
        eid: 0, sT: .6, minute: 0, bossN: 0, kills: 0, pending: 0, choose: null, orb: 0, sndT: -1, gsT: -1, hudT: 0, dirty: 0, banner: null,
        ch: 'gh', fused: [], fz: '', fzW: '', fuse: null, fzLater: 0, sigK: ['', ''], gold: 0, gcT: -9, meta: metaGet(), shop: null, sel: { i: 0, t: 0, shake: 0 }, started: 0, over: 0, paused: 0, dmgBy: {}, evd: {}, evoQ: [], evoN: 0, rr: 3, kingK: 0,
        ep: [], cans: [], geys: [], hail: [], heli: [], trail: [], bolts: [], beams: [], heliA: 0, rbA: 0, rbDir: 1, rbBase: 0, rbJet: 0,
        heat: 0, zapor: 0, rainT: 0, green: 0, dry: 0, flash: 0, batT: 30, szE: null, szN: 0, szKill: 0, ph: 'run', phT: 0, wk: 0, bi: 0, bossCD: 0, bossE: null, warns: [], blasts: [], waves: [], bq: [], mel: [], hams: [], cracks: [], ltrail: [], balls: null, crystals: [], burst: [], cones: [], sig: {}, szRage: 0, taunt: null, say: null, melt: null, note: null, unT: 0 };
      S.hasSave = saveGet(); sndT = {}; S.rr = 3 + (S.meta.rr || 0); stats(); view(G); joy = null; this.overTitle = 'KISZÁRADTÁL'; hideStats();
      const last = Math.round(store.get('aszb_last', 0)); if (CH[last] && chOpen(CH[last])) S.sel.i = last;
    },
    down(G, x, y, e) {
      if (!e || e === true) return;
      if (S.shop) { const r = shopRows(G).find(r => inR(r, x, y)); if (r) buyMeta(r.i); else if (inR(shopClose(G), x, y)) { S.shop = null; Sfx.blip(500, .06, 'square', .04); } return; }
      if (S.sel) { if (S.hasSave && inR(contBtn(G), x, y)) return loadRun(G); if (inR(kutBtn(G), x, y)) { S.shop = { t: 0, i: -1, shake: 0 }; S.meta = metaGet(); Sfx.blip(700, .07, 'square', .04); return; } const c = selCards(G).find(c => inR(c, x, y)); if (c) selPick(G, c.i); return; }
      if (S.paused) { const b = pauseBtns(G).find(b => inR(b, x, y)); if (b) { if (b.id === 'go') togglePause(); else { S.paused = 0; G.end(); } } return; }
      if (S.fuse) { if (S.fuse.t < .4) return; const r = fuseRows(G).find(r => inR(r, x, y)); if (r) return doFuse(G, r.k); if (inR(fuseLater(G), x, y)) { S.fuse = null; S.fzLater = S.P.lvl + 3; } return; }
      if (S.choose) { const c = cards(G).findIndex(c => inR(c, x, y)); if (c >= 0) return pick(G, c); const b = cardBtns(G).find(b => inR(b, x, y)); if (b) b.id === 'rr' ? reroll() : skip(); return; }
      const pb = pauseBtn(G); if (Math.hypot(x - pb.x, y - pb.y) < pb.r * 1.4) return togglePause();
      try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
      joy = { id: e.pointerId, ox: x, oy: y, x, y, touch: e.pointerType !== 'mouse' };
    },
    move(G, x, y, pressed, e) { if (joy && pressed && (!e || e.pointerId === joy.id)) { joy.x = x; joy.y = y; } },
    up(G, x, y, e) { if (joy && (!e || e === true || e.pointerId === joy.id)) joy = null; },
    _S: () => S, /* tesztekhez */
    leave(G) { joy = null; K.U = K.D = K.L = K.R = 0; hideStats(); if (S && G && G.running) { saveRun(G); S.left = 1; } },
    update(G, dt) {
      view(G); const P = S.P;
      if (S.shop) { S.shop.t += dt; S.shop.shake = Math.max(0, S.shop.shake - dt); }
      if (S.sel) { S.sel.t += dt; S.sel.shake = Math.max(0, S.sel.shake - dt); return; }
      if (S.paused) return;
      if (S.fuse) { S.fuse.t += dt; return; }
      if (S.choose) { S.choose.t += dt; S.flash = Math.max(0, S.flash - dt); return; }
      if (S.evoQ.length) return openEvo(S.evoQ.shift());
      if (S.pending > 0 && !S.fz && S.P.lvl >= S.fzLater && fuseCands().length) { S.fuse = { o: fuseCands(), t: 0 }; joy = null; Sfx.perfect(); setTimeout(() => Sfx.blip(988, .3, 'triangle', .06, 1.5), 200); return; }
      if (S.pending > 0) { S.pending--; return openChoice(); }
      S.t += dt; const st = S.st;
      if (S.t < .02) store.set('aszb_last', CH.findIndex(c => c.id === S.ch));
      if ((S.saveT = (S.saveT ?? 10) - dt) <= 0) { S.saveT = 10; saveRun(G); }
      let mx = (K.R ? 1 : 0) - (K.L ? 1 : 0), my = (K.D ? 1 : 0) - (K.U ? 1 : 0);
      if (mx && my) { mx *= .7071; my *= .7071; }
      else if (!mx && !my && joy) { const dx = joy.x - joy.ox, dy = joy.y - joy.oy, m = Math.hypot(dx, dy), dz = 8 * G.d, mr = 46 * G.d;
        if (m > dz) { const k = Math.min(1, (m - dz) / (mr - dz)) / m; mx = dx * k; my = dy * k; if (m > mr) { joy.ox = joy.x - dx / m * mr; joy.oy = joy.y - dy / m * mr; } } }
      const mm = Math.hypot(mx, my);
      if (mm > .05) { P.x += mx * st.speed * dt; P.y += my * st.speed * dt; if (Math.abs(mx) > .15) P.face = mx > 0 ? 1 : -1; P.walk += dt * mm * 11; P.mov = 1; } else P.mov = 0;
      if (P.msh > 0 && S.t - (P.shT || -9) > 3) P.sh = Math.min(P.msh, (P.sh || 0) + P.msh * .3 * dt);
      P.inv = Math.max(0, P.inv - dt); if (st.regen) P.hp = Math.min(P.mhp, P.hp + st.regen * dt);
      for (const k of ['heat', 'zapor', 'rainT', 'green', 'dry', 'flash']) if (S[k] > 0) S[k] = Math.max(0, S[k] - dt);
      spawner(G, dt); phases(G, dt); gridBuild(); enemies(G, dt); if (!G.running) return; weapons(G, dt);
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
      view(G); if (sprSc !== V.sc) build(); else if (artMiss && (artDirty || (!ART && window.ABR) || ((t * 2 | 0) % 6 === 0 && (t * 60 | 0) % 30 === 0))) { artDirty = 0; buildSpr(); } if (portD !== G.d) portraits(G.d);
      if (!G.running && S.started && !S.over && G.score >= 0 && UI.pStart.hidden) { S.over = 1; if (!S.left) clearSave(); showStats(); checkUnlocks(G); }
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
        else if (q.k === 'g') { const yy = y + Math.sin(t * 4 + q.x) * 1.5 * sc, sq = Math.abs(Math.cos(t * 3 + q.y)); g.fillStyle = '#b8860b'; g.beginPath(); g.ellipse(x, yy + .8 * sc, 6 * sc * (.35 + .65 * sq), 6 * sc, 0, 0, TAU); g.fill(); g.fillStyle = '#ffd23f'; g.beginPath(); g.ellipse(x, yy, 5.4 * sc * (.35 + .65 * sq), 5.4 * sc, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.8)'; circ(g, x - 1.6 * sc * sq, yy - 1.8 * sc, 1.3 * sc); }
        else { const k = (1 + .08 * Math.sin(t * 6)) * (q.dbl ? 1.25 : 1); if (q.dbl) { g.fillStyle = `rgba(255,210,63,${.25 + .15 * Math.sin(t * 8)})`; circ(g, x, y, 24 * sc); }
          g.fillStyle = q.dbl ? '#b8860b' : '#8a5a1e'; rrp(g, x - 13 * sc * k, y - 9 * sc * k, 26 * sc * k, 18 * sc * k, 3 * sc); g.fillStyle = q.dbl ? '#ffd23f' : '#e8b656'; g.fillRect(x - 13 * sc * k, y - 3 * sc, 26 * sc * k, 3 * sc); circ(g, x, y - 1 * sc, 3 * sc); } }
      // Szilárd olvadása
      if (S.melt && SPR.szilard) { const m = S.melt, k = 1 - m.l / 2.6, x = X(m.x), y = Y(m.y), sp = SPR.szilard; g.fillStyle = `rgba(40,140,255,${.45 * Math.min(1, k * 2)})`; g.beginPath(); g.ellipse(x, y + 20 * sc, (20 + k * 50) * sc, (7 + k * 18) * sc, 0, 0, TAU); g.fill();
        if (k < .85) { g.save(); g.globalAlpha = 1 - k; g.translate(x, y + 26 * sc); g.scale(1 + k * .6, 1 - k); g.drawImage(sp.c, -sp.sw / 2, -sp.sh / 2 + sp.oy - 26 * sc); g.restore(); } }
      // támadások figyelmeztetései (az isten és a bossok)
      for (const w of S.warns) { const k = clamp(w.t / w.d, 0, 1), x = X(w.x), y = Y(w.y);
        if (w.line) { const x2 = X(w.x + Math.cos(w.a) * w.L), y2 = Y(w.y + Math.sin(w.a) * w.L); g.strokeStyle = `rgba(255,90,40,${.25 + .45 * k})`; g.lineWidth = w.w * 2 * sc * (.4 + .6 * k); g.lineCap = 'round'; ln(g, x, y, x2, y2); continue; }
        g.fillStyle = `rgba(200,80,20,${.12 + .25 * k})`; g.beginPath(); g.ellipse(x, y, w.R * sc, w.R * .6 * sc, 0, 0, TAU); g.fill(); g.strokeStyle = `rgba(255,140,60,${.4 + .5 * k})`; g.lineWidth = 2 * d; g.beginPath(); g.ellipse(x, y, w.R * sc * k, w.R * .6 * sc * k, 0, 0, TAU); g.stroke(); }
      for (const f of S.blasts) { const k = f.l / f.d, x = X(f.x), y = Y(f.y);
        if (f.line) { const x2 = X(f.x + Math.cos(f.a) * f.L), y2 = Y(f.y + Math.sin(f.a) * f.L); g.lineCap = 'round'; g.strokeStyle = `rgba(255,170,60,${.7 * k})`; g.lineWidth = f.w * 2 * sc; ln(g, x, y, x2, y2); g.strokeStyle = `rgba(255,240,190,${k})`; g.lineWidth = f.w * .7 * sc; ln(g, x, y, x2, y2); continue; }
        const gr = g.createRadialGradient(x, y, 0, x, y, f.R * sc); gr.addColorStop(0, `rgba(255,230,160,${.85 * k})`); gr.addColorStop(.6, `rgba(230,120,40,${.55 * k})`); gr.addColorStop(1, 'rgba(160,60,10,0)'); g.fillStyle = gr; circ(g, x, y, f.R * sc); }
      // ellenségek
      S.en.sort((a, b) => a.y - b.y);
      g.fillStyle = 'rgba(0,0,0,.22)'; for (const e of S.en) { if (e.under || e.T.god) continue; const x = X(e.x), y = Y(e.y); if (!vis(x, y, 60 * sc)) continue; g.beginPath(); g.ellipse(x, y + e.r * .95 * sc, e.r * .85 * sc, e.r * .28 * sc, 0, 0, TAU); g.fill(); }
      let szDraw = null, godDraw = null;
      for (const e of S.en) { if (e.under) continue; const x = X(e.x), y = Y(e.y), sp = SPR[e.type]; if (e.T.god) { godDraw = [e, x, y]; continue; } if (!vis(x, y, (sp ? sp.sh : 60) + 20)) continue;
        const ay = e.air > 0 ? -Math.sin(e.air / .55 * Math.PI) * 26 * sc : 0;
        if (!sp) { g.fillStyle = `rgba(${FCOL[e.T.f] || '120,90,60'},.9)`; circ(g, x, y + ay, e.r * sc); continue; }
        if (e.type === 'szilard') { szDraw = [e, x, y]; continue; }
        const fl = S.P.x < e.x ? -1 : 1, bob = Math.sin(t * 8 + e.ph) * 1.2 * sc;
        g.save(); g.translate(Math.round(x), Math.round(y + ay + bob)); if (e.T.ghost) g.globalAlpha = .62 + .2 * Math.sin(t * 3 + e.ph);
        if (e.T.flap) g.scale(1, .8 + .2 * Math.abs(Math.sin(t * 14 + e.ph))); if (e.T.spin && e.chg) g.rotate(Math.sin(t * 20) * .25);
        g.scale(fl, 1); g.drawImage(sp.c, -sp.sw / 2, -sp.sh / 2 + sp.oy); if (e.flash > 0) { g.globalAlpha *= .55; g.drawImage(sp.w, -sp.sw / 2, -sp.sh / 2 + sp.oy); } g.restore();
        if (e.chg && e.chg.st === 'wind') { g.strokeStyle = `rgba(255,90,60,${.5 + .5 * Math.sin(t * 30)})`; g.lineWidth = 2 * d; g.beginPath(); g.arc(x, y, e.r * 1.4 * sc, 0, TAU); g.stroke(); }
        if (e.freeze > 0) { g.fillStyle = 'rgba(140,215,255,.45)'; circ(g, x, y + ay, e.r * 1.05 * sc); g.strokeStyle = 'rgba(235,250,255,.9)'; g.lineWidth = 1.5 * d; g.beginPath(); g.arc(x, y + ay, e.r * 1.05 * sc, 0, TAU); g.stroke(); }
        else if (e.slow > 0) { g.fillStyle = 'rgba(108,198,255,.85)'; drop(g, x, y + sp.oy - sp.sh / 2 - 4 * sc, 3 * sc); }
        if (e.T.boss) { const w = 70 * sc, yy = y + sp.oy - sp.sh / 2 - 10 * sc; g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x - w / 2, yy, w, 6 * sc); g.fillStyle = '#ff5a4d'; g.fillRect(x - w / 2, yy, w * Math.max(0, e.hp / e.mhp), 6 * sc); } }
      // Szikkadt Szilárd: homokpergés körülötte
      const drawSz = (x, y, a, fl = 0) => { const sp = SPR.szilard; if (!sp) return; const r = 36 * sc;
        g.globalAlpha = a; const sy = Math.round(y - sp.sh / 2 + sp.oy + Math.sin(t * 3) * 2 * sc); g.drawImage(sp.c, Math.round(x - sp.sw / 2), sy); if (fl) { g.globalAlpha = a * .5; g.drawImage(sp.w, Math.round(x - sp.sw / 2), sy); g.globalAlpha = a; }
        g.fillStyle = 'rgba(216,185,138,.85)'; for (let i = 0; i < 7; i++) { const k = (t * 1.3 + i * .37) % 1; circ(g, x + (Math.sin(i * 3.1) * .7) * r, y + (.7 + k * .5) * r, 1.4 * sc); }
        for (let i = 0; i < 8; i++) { const k = (t * 1.6 + i * .21) % 1, a2 = i * .8 + t; g.fillStyle = `rgba(200,170,120,${.7 * (1 - k)})`; circ(g, x + Math.cos(a2) * (1.1 + k * .6) * r, y + Math.sin(a2) * .5 * r - k * r, (1.2 + k * 2.5) * sc); }
        const gl = .55 + .45 * Math.sin(t * 6); g.fillStyle = `rgba(255,40,30,${.22 * gl})`; circ(g, x, y - sp.sh * .5 + sp.oy + sp.sh * .2, 14 * sc); g.globalAlpha = 1; };
      if (szDraw) { const [e, x, y] = szDraw; drawSz(x, y, 1, e.flash > 0); }
      // az Aszály Istene: aura, lebegés, leereszkedés
      if (godDraw && SPR.isten) { const [e, x, y0] = godDraw, sp = SPR.isten, dn = e.dsc > 0 ? e.dsc / 3 : 0, y = y0 - dn * dn * H * .9 + Math.sin(t * 1.4) * 6 * sc;
        const gr = g.createRadialGradient(x, y - sp.sh * .2, 0, x, y - sp.sh * .2, sp.sh * .75); gr.addColorStop(0, `rgba(255,200,90,${.35 + .1 * Math.sin(t * 3)})`); gr.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = gr; circ(g, x, y - sp.sh * .2, sp.sh * .75);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y0 + e.r * .6 * sc, e.r * 1.2 * sc * (1 - dn * .6), e.r * .35 * sc * (1 - dn * .6), 0, 0, TAU); g.fill();
        if (e.shield) { g.strokeStyle = `rgba(255,220,120,${.5 + .3 * Math.sin(t * 8)})`; g.lineWidth = 4 * d; g.beginPath(); g.arc(x, y - sp.sh * .2, sp.sh * .48, 0, TAU); g.stroke(); }
        g.drawImage(sp.c, Math.round(x - sp.sw / 2), Math.round(y - sp.sh / 2 + sp.oy)); if (e.flash > 0) { g.globalAlpha = .4; g.drawImage(sp.w, Math.round(x - sp.sw / 2), Math.round(y - sp.sh / 2 + sp.oy)); g.globalAlpha = 1; }
        for (const c of S.crystals) { const cx = X(c.x), cy = Y(c.y), on = c.on; g.fillStyle = on ? 'rgba(108,198,255,.35)' : 'rgba(108,198,255,.15)'; g.beginPath(); g.ellipse(cx, cy, 34 * sc, 18 * sc, 0, 0, TAU); g.fill(); g.fillStyle = on ? '#bfe9ff' : '#6cc6ff'; g.beginPath(); g.moveTo(cx, cy - 26 * sc); g.lineTo(cx + 9 * sc, cy - 6 * sc); g.lineTo(cx, cy + 4 * sc); g.lineTo(cx - 9 * sc, cy - 6 * sc); g.fill();
          if (c.p > 0) { g.strokeStyle = '#fff'; g.lineWidth = 3 * d; g.beginPath(); g.arc(cx, cy - 10 * sc, 20 * sc, -Math.PI / 2, -Math.PI / 2 + TAU * c.p); g.stroke(); } } }
      // képernyőn kívüli boss jelzése a szélen
      { const b = S.bossE && !S.bossE.dead && !(S.bossE.dsc > 0) ? S.bossE : null; if (b) { const bx = X(b.x), by = Y(b.y), m = 40 * d;
        if (bx < -10 || by < -10 || bx > W + 10 || by > H + 10) { const ang = Math.atan2(by - H / 2, bx - W / 2), cx = W / 2, cy = H / 2, hw = W / 2 - m, hh = H / 2 - m - 50 * d, kx = Math.abs(Math.cos(ang)) > 1e-3 ? hw / Math.abs(Math.cos(ang)) : 1e9, ky = Math.abs(Math.sin(ang)) > 1e-3 ? hh / Math.abs(Math.sin(ang)) : 1e9, r = Math.min(kx, ky), ix = clamp(cx + Math.cos(ang) * r, m, W - m), iy = clamp(cy + 25 * d + Math.sin(ang) * r, 150 * d, H - m), pl = 1 + .08 * Math.sin(t * 6);
          g.save(); g.translate(ix, iy); g.rotate(ang); g.fillStyle = '#ff5a4d'; g.beginPath(); g.moveTo(34 * d * pl, 0); g.lineTo(20 * d, -10 * d); g.lineTo(20 * d, 10 * d); g.closePath(); g.fill(); g.restore();
          g.fillStyle = 'rgba(20,6,4,.88)'; circ(g, ix, iy, 21 * d * pl); g.strokeStyle = '#ff5a4d'; g.lineWidth = 2.2 * d; g.beginPath(); g.arc(ix, iy, 21 * d * pl, 0, TAU); g.stroke();
          const sp = SPR[b.type]; if (sp) { const sc2 = 32 * d / Math.max(sp.sw, sp.sh); g.save(); g.beginPath(); g.arc(ix, iy, 19 * d, 0, TAU); g.clip(); g.drawImage(sp.c, ix - sp.sw * sc2 / 2, iy - sp.sh * sc2 / 2, sp.sw * sc2, sp.sh * sc2); g.restore(); }
          g.font = `800 ${10 * d}px Inter, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3 * d; g.strokeStyle = 'rgba(0,0,0,.7)'; const dist = Math.round(Math.hypot(b.x - P.x, b.y - P.y) / 10) + ' m'; g.strokeText(dist, ix, iy + 30 * d); g.fillStyle = '#ffb0a0'; g.fillText(dist, ix, iy + 30 * d); } } }
      // előzetes megjelenés a képernyő szélén
      if (S.taunt) { const k = S.taunt.l, a = Math.min(1, (3.2 - k) * 3, k * 3), x = W - 46 * sc, y = H / 2 - 20 * sc; drawSz(x, y, a); }
      // közelharc: repedések, kalapácsok, kasza- és pengeívek, láncgolyók
      for (const c of S.cracks) { const k = Math.min(1, c.l / .6), x = X(c.x), y = Y(c.y); g.strokeStyle = `rgba(60,38,18,${.6 * k})`; g.lineWidth = 2.2 * sc; g.lineCap = 'round'; g.lineJoin = 'round';
        for (let i = 0; i < 7; i++) { let a = c.s + i * .9, px = x, py = y; g.beginPath(); g.moveTo(px, py); for (let j = 1; j <= 4; j++) { a += Math.sin(c.s * 3 + i * 5 + j) * .5; px += Math.cos(a) * c.R * .25 * sc; py += Math.sin(a) * c.R * .16 * sc; g.lineTo(px, py); } g.stroke(); }
        g.fillStyle = `rgba(108,198,255,${.25 * k})`; g.beginPath(); g.ellipse(x, y, c.R * .45 * sc, c.R * .27 * sc, 0, 0, TAU); g.fill(); }
      for (const h of S.hams) { const k = Math.min(1, h.t / h.d), x = X(h.x), y = Y(h.y), up = (1 - k) * (1 - k) * 110 * sc, after = h.t > h.d ? 1 - (h.t - h.d) / .25 : 1;
        if (k < 1) { g.fillStyle = `rgba(0,0,0,${.15 + .25 * k})`; g.beginPath(); g.ellipse(x, y, 20 * sc * (.5 + k * .5), 7 * sc * (.5 + k * .5), 0, 0, TAU); g.fill(); }
        g.save(); g.globalAlpha = Math.max(0, after); g.translate(x, y - up - 14 * sc); g.rotate(h.a * (1 - k) * 1.2); const z = sc * 1.25;
        g.fillStyle = '#7a4a24'; g.fillRect(-2 * z, -26 * z, 4 * z, 26 * z); g.fillStyle = '#5a6672'; rrp(g, -13 * z, -8 * z, 26 * z, 15 * z, 3 * z); g.fillStyle = '#8c98a6'; rrp(g, -13 * z, -8 * z, 26 * z, 5 * z, 2 * z);
        g.fillStyle = '#3aa6f5'; circ(g, 0, 0, 3.5 * z); g.fillStyle = '#e8b656'; g.fillRect(-13 * z, 5 * z, 26 * z, 2 * z); g.restore();
        if (h.t > h.d && h.t < h.d + .12) { g.fillStyle = `rgba(255,255,255,${.6 * (1 - (h.t - h.d) / .12)})`; circ(g, x, y, 36 * sc); } }
      for (const m of S.mel) { const p = 1 - m.l / m.d, x = X(m.x), y = Y(m.y), R = m.R * sc, a0 = m.a - m.w * m.dir, a1 = a0 + m.w * 2 * m.dir * Math.min(1, p * 1.6), fade = Math.min(1, m.l / m.d * 2);
        g.save(); if (m.k === 'kasza') { const gr = g.createRadialGradient(x, y, R * .45, x, y, R); gr.addColorStop(0, 'rgba(108,198,255,0)'); gr.addColorStop(.75, m.gold ? `rgba(255,210,63,${.45 * fade})` : `rgba(120,200,255,${.45 * fade})`); gr.addColorStop(1, `rgba(255,255,255,${.85 * fade})`);
            g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, a0, a1, m.dir < 0); g.arc(x, y, R * .5, a1, a0, m.dir > 0); g.closePath(); g.fill();
            g.strokeStyle = m.gold ? `rgba(255,236,150,${fade})` : `rgba(230,248,255,${fade})`; g.lineWidth = 3.5 * sc; g.beginPath(); g.arc(x, y, R, a0, a1, m.dir < 0); g.stroke();
            g.fillStyle = `rgba(255,255,255,${fade})`; for (let i = 0; i < 6; i++) { const b = a0 + (a1 - a0) * (i / 5), rr = R * (.8 + .25 * Math.sin(i * 7 + m.a * 9)); circ(g, x + Math.cos(b) * rr, y + Math.sin(b) * rr, 2 * sc); } }
          else { g.shadowColor = '#6cc6ff'; g.shadowBlur = 12 * sc; g.strokeStyle = `rgba(200,240,255,${fade})`; g.lineWidth = (m.last ? 7 : 4.5) * sc; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, R * .82, a0, a1, m.dir < 0); g.stroke();
            g.strokeStyle = `rgba(255,255,255,${fade})`; g.lineWidth = 1.6 * sc; g.stroke(); if (m.last) { g.fillStyle = `rgba(160,225,255,${.35 * fade})`; g.beginPath(); g.moveTo(x, y); g.arc(x, y, R, m.a - m.w, m.a + m.w); g.closePath(); g.fill(); } }
        g.restore(); }
      for (const q of S.ltrail) { const k = q.l / .22; g.fillStyle = `rgba(150,215,255,${.28 * k})`; circ(g, X(q.x), Y(q.y), (lv('orveny_lanc') ? 17 : 10) * sc * k); }
      for (const b of [...(S.balls || []), ...(S.fzBall && S.fz === 'lanc' ? [S.fzBall] : [])]) { const x = X(b.x), y = Y(b.y); g.strokeStyle = '#5a6672'; g.lineWidth = 2.2 * sc; g.setLineDash([4 * sc, 3 * sc]); ln(g, W / 2, H / 2 - 2 * sc, x, y); g.setLineDash([]);
        if (lv('orveny_lanc')) { g.strokeStyle = 'rgba(108,198,255,.35)'; g.lineWidth = 3 * sc; g.beginPath(); g.arc(x, y, b.r * 1.7 * sc, S.t * 8, S.t * 8 + 4); g.stroke(); }
        g.fillStyle = '#46525f'; circ(g, x, y, b.r * sc); g.fillStyle = '#6a7684'; circ(g, x - b.r * .3 * sc, y - b.r * .3 * sc, b.r * .55 * sc); g.fillStyle = '#3aa6f5'; circ(g, x, y, b.r * .32 * sc);
        g.fillStyle = '#8c98a6'; for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + b.a; g.beginPath(); g.moveTo(x + Math.cos(a) * b.r * .9 * sc, y + Math.sin(a) * b.r * .9 * sc); g.lineTo(x + Math.cos(a + .25) * b.r * 1.35 * sc, y + Math.sin(a + .25) * b.r * 1.35 * sc); g.lineTo(x + Math.cos(a + .5) * b.r * .9 * sc, y + Math.sin(a + .5) * b.r * .9 * sc); g.fill(); } }
      // PID-legyező, aranyseprű, PID-örvény, relékockák
      for (const c of S.cones) { const k = c.l / (c.gold ? .45 : .3), x = X(c.x), y = Y(c.y), R = c.R * sc * (1.05 - k * .3); g.fillStyle = c.gold ? `rgba(255,210,63,${.4 * k})` : `rgba(90,216,224,${.35 * k})`; g.beginPath(); g.moveTo(x, y); g.arc(x, y, R, c.a - c.w, c.a + c.w); g.closePath(); g.fill();
        g.strokeStyle = c.gold ? `rgba(255,240,170,${k})` : `rgba(200,250,255,${k})`; g.lineWidth = 2 * d; g.beginPath(); g.arc(x, y, R, c.a - c.w, c.a + c.w); g.stroke(); }
      if (lv('pidevo')) { const R = 140 * ar * sc; g.strokeStyle = 'rgba(90,216,224,.55)'; g.lineWidth = 3 * d; g.lineCap = 'round'; for (let j = 0; j < 3; j++) { g.beginPath(); for (let i = 0; i < 30; i++) { const a = S.sig.pa + j * 2.09 + i * .14, r = R * (.25 + i / 40); g.lineTo(W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r * .8); } g.stroke(); } }
      if (S.sig.cubes) { const cs = S.sig.cubes; if (lv('releevo')) { g.strokeStyle = `rgba(120,200,255,${.5 + .3 * Math.sin(t * 20)})`; g.lineWidth = 2 * d; g.beginPath(); cs.forEach((c, i) => i ? g.lineTo(X(c.x), Y(c.y)) : g.moveTo(X(c.x), Y(c.y))); g.closePath(); g.stroke(); }
        for (const c of cs) { g.save(); g.translate(X(c.x), Y(c.y)); g.rotate(t * 2); g.fillStyle = '#2a5ab8'; rrp(g, -6 * sc, -6 * sc, 12 * sc, 12 * sc, 2 * sc); g.strokeStyle = '#bfe8ff'; g.lineWidth = 1.2 * sc; g.strokeRect(-3 * sc, -3 * sc, 6 * sc, 6 * sc); g.restore(); } }
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
      { const w = 36 * sc, x = W / 2 - w / 2, y = H / 2 + 23 * sc; g.fillStyle = 'rgba(0,0,0,.55)'; rrp(g, x - 1, y - 1, w + 2, 5 * sc + 2, 2 * sc); g.fillStyle = P.hp / P.mhp > .35 ? '#5ee08a' : '#ff5a4d'; rrp(g, x, y, w * Math.max(0, P.hp / P.mhp), 5 * sc, 2 * sc);
        if (P.msh > 0) { g.fillStyle = 'rgba(0,0,0,.55)'; rrp(g, x - 1, y + 6 * sc, w + 2, 3.5 * sc + 2, 2 * sc); if (P.sh > 0) { g.fillStyle = '#6cc6ff'; rrp(g, x, y + 6 * sc + 1, w * P.sh / P.msh, 3.5 * sc, 1.5 * sc); }
          if (P.sh > 1) { g.strokeStyle = `rgba(140,210,255,${.25 + .35 * P.sh / P.msh})`; g.lineWidth = 2 * d; g.beginPath(); g.arc(W / 2, H / 2 - 2 * sc, 24 * sc, 0, TAU); g.stroke(); } } }
      // szórófej cseppjei / körforgó
      let L;
      if ((L = lv('szoro'))) { const n = L + 1, R = (56 + L * 4) * ar * sc; for (let i = 0; i < n; i++) { const a = S.orb + i / n * TAU, x = W / 2 + Math.cos(a) * R, y = H / 2 + Math.sin(a) * R;
        g.strokeStyle = 'rgba(108,198,255,.35)'; g.lineWidth = 6 * sc; g.lineCap = 'round'; g.beginPath(); g.arc(W / 2, H / 2, R, a - .45, a); g.stroke(); g.fillStyle = '#8fd4ff'; circ(g, x, y, 7 * sc); g.fillStyle = '#fff'; circ(g, x - 2 * sc, y - 2 * sc, 2.2 * sc); } }
      if (lv('korforgo')) for (const [R0, s] of [[70, 1], [124, -1]]) { const R = R0 * ar * sc; for (let i = 0; i < 6; i++) { const a = s * S.orb * (s > 0 ? 1 : .8) + i / 6 * TAU, x = W / 2 + Math.cos(a) * R, y = H / 2 + Math.sin(a) * R;
        g.strokeStyle = s > 0 ? 'rgba(108,198,255,.4)' : 'rgba(255,210,63,.35)'; g.lineWidth = 7 * sc; g.lineCap = 'round'; g.beginPath(); s > 0 ? g.arc(W / 2, H / 2, R, a - .4, a) : g.arc(W / 2, H / 2, R, a, a + .4); g.stroke(); g.fillStyle = s > 0 ? '#8fd4ff' : '#bfe6ff'; circ(g, x, y, 8.5 * sc); g.fillStyle = '#fff'; circ(g, x - 2 * sc, y - 2 * sc, 2.6 * sc); } }
      // lövedékek, kannák, bombák
      g.lineCap = 'round'; for (const p of S.pr) { const x = X(p.x), y = Y(p.y);
        if (p.ice) { g.save(); g.translate(x, y); g.rotate(t * 9 + p.x); g.fillStyle = '#d6f3ff'; rrp(g, -4.5 * sc, -4.5 * sc, 9 * sc, 9 * sc, 2 * sc); g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(-2.5 * sc, -2.5 * sc, 2.5 * sc, 2.5 * sc); g.restore(); continue; }
        if (p.kind === 'crescent') { const a = Math.atan2(p.vy, p.vx), k = Math.min(1, p.life / .3); g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = `rgba(150,220,255,${.8 * k})`; g.beginPath(); g.arc(0, 0, 18 * sc, -1.2, 1.2); g.arc(-6 * sc, 0, 15 * sc, 1.1, -1.1, true); g.closePath(); g.fill(); g.strokeStyle = `rgba(255,255,255,${k})`; g.lineWidth = 2 * sc; g.beginPath(); g.arc(0, 0, 18 * sc, -1.1, 1.1); g.stroke(); g.restore(); continue; }
        if (p.kind === 'bullet') { g.strokeStyle = 'rgba(255,220,120,.85)'; g.lineWidth = 2.6 * sc; ln(g, x, y, x - p.vx * .025 * sc, y - p.vy * .025 * sc); g.fillStyle = '#fff3c4'; circ(g, x, y, 2.2 * sc); continue; }
        if (p.kind === 'cube') { g.save(); g.translate(x, y); g.rotate(t * 8); g.fillStyle = '#3a7ae0'; rrp(g, -4 * sc, -4 * sc, 8 * sc, 8 * sc, 1.5 * sc); g.strokeStyle = '#bfe8ff'; g.lineWidth = 1 * sc; g.strokeRect(-2 * sc, -2 * sc, 4 * sc, 4 * sc); g.restore(); continue; }
        if (p.kind === 'gold') { g.strokeStyle = 'rgba(255,210,63,.5)'; g.lineWidth = 5 * sc; ln(g, x, y, x - p.vx * .035 * sc, y - p.vy * .035 * sc); g.fillStyle = '#ffe27a'; circ(g, x, y, 4.5 * sc); g.fillStyle = '#fff'; circ(g, x - 1.2 * sc, y - 1.2 * sc, 1.6 * sc); continue; }
        const c = p.sand ? 'rgba(216,185,138,.6)' : 'rgba(108,198,255,.55)', r = (p.big ? 11 : 4.5) * sc; g.strokeStyle = c; g.lineWidth = (p.big ? 14 : 5) * sc; ln(g, x, y, x - p.vx * .035 * sc, y - p.vy * .035 * sc); g.fillStyle = p.sand ? '#e8d2a6' : '#bfe6ff'; circ(g, x, y, r); if (p.big) { g.fillStyle = '#fff'; circ(g, x - 3 * sc, y - 3 * sc, 3.5 * sc); } }
      for (const c of S.cans) { const x = X(c.x), y = Y(c.y); g.save(); g.translate(x, y); g.rotate(c.rot); g.scale(sc * (c.big ? 1.4 : 1.05), sc * (c.big ? 1.4 : 1.05)); canShape(g, c.big ? '#e8b656' : '#2f9e4f', c.big ? '#b8860b' : '#1d6b33'); g.restore(); }
      for (const b of S.bombs) { if (b.t < 0) continue; const k = b.t / .55, wx = b.x0 + (b.tx - b.x0) * k, wy = b.y0 + (b.ty - b.y0) * k, x = X(wx), y = Y(wy), h = Math.sin(k * Math.PI) * 70 * sc;
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y, 8 * sc, 3 * sc, 0, 0, TAU); g.fill(); g.fillStyle = '#3aa6f5'; circ(g, x, y - h, 9 * sc); g.fillStyle = 'rgba(255,255,255,.7)'; circ(g, x - 3 * sc, y - h - 3 * sc, 2.5 * sc); }
      for (const r of S.rings) { const k = 1 - r.l, x = X(r.x), y = Y(r.y), R = r.w ? r.R * sc * (.3 + k * .7) : r.R * sc * (.5 + k * .5); g.fillStyle = `rgba(${r.c || '120,200,255'},${r.l * (r.w ? .18 : .35)})`; circ(g, x, y, R); g.strokeStyle = r.c ? `rgba(${r.c},${r.l})` : `rgba(220,245,255,${r.l})`; g.lineWidth = (r.w ? 8 : 4) * sc * r.l + 1; g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke(); }
      // gejzír-oszlopok
      for (const q of S.geys) { if (q.t < 0) continue; const x = X(q.x), y = Y(q.y), R = q.R * sc, k = q.t / q.life, h = (q.E ? 90 : 70) * sc * Math.sin(Math.min(1, k * 3) * Math.PI / 2) * (1 - k * .6), a = 1 - k * .7;
        g.fillStyle = `rgba(120,200,255,${.28 * a})`; g.beginPath(); g.ellipse(x, y, R, R * .55, 0, 0, TAU); g.fill();
        const gr = g.createLinearGradient(0, y - h, 0, y); gr.addColorStop(0, `rgba(230,248,255,${.9 * a})`); gr.addColorStop(1, `rgba(80,170,255,${.75 * a})`); g.fillStyle = gr;
        g.beginPath(); g.moveTo(x - R * .35, y); g.quadraticCurveTo(x - R * .25, y - h * .6, x - R * .12, y - h); g.quadraticCurveTo(x, y - h * 1.12, x + R * .12, y - h); g.quadraticCurveTo(x + R * .25, y - h * .6, x + R * .35, y); g.fill(); }
      // jégeső
      for (const h of S.hail) { const x = X(h.x), y = Y(h.y), k = h.t / .35; g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(x, y, 5 * sc, 2 * sc, 0, 0, TAU); g.fill(); g.fillStyle = '#e6f7ff'; rrp(g, x - 4 * sc, y - k * 120 * sc - 4 * sc, 8 * sc, 8 * sc, 2 * sc); }
      // ellenséges homokhullám
      for (const w of S.waves) { const k = 1 - w.r / w.max, x = X(w.x), y = Y(w.y); g.strokeStyle = `rgba(${w.c},${.25 * k})`; g.lineWidth = w.w * 2.6 * sc; g.beginPath(); g.arc(x, y, w.r * sc, 0, TAU); g.stroke(); g.strokeStyle = `rgba(255,250,230,${.85 * k})`; g.lineWidth = w.w * .5 * sc; g.stroke(); }
      for (const p of S.ep) { const x = X(p.x), y = Y(p.y); if (!vis(x, y, 20)) continue; if (p.big) { g.fillStyle = `rgba(${p.c},${.22 + .12 * Math.sin(t * 12 + p.x)})`; circ(g, x, y, 15 * sc); g.fillStyle = '#fff'; circ(g, x, y, 3 * sc); } g.fillStyle = p.c ? `rgba(${p.c},.4)` : 'rgba(160,120,60,.45)'; circ(g, x, y, 8 * sc); g.fillStyle = p.c ? `rgb(${p.c})` : '#e0c38f'; circ(g, x, y, 4.5 * sc); }
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
      { const se = S.szE || (S.bossE && S.bossE.T.god && !(S.bossE.dsc > 0) ? S.bossE : null), sp = se && SPR[se.type]; if (S.say && se && !se.under) bubble(X(se.x), Y(se.y) + (sp ? sp.oy - sp.sh / 2 : -44 * sc), S.say.t); }
      // felső sáv: XP, szint, idő, fejlesztések
      const bx = 12 * d, by = 60 * d, bw = W - 24 * d, bh = 9 * d; g.fillStyle = 'rgba(4,7,14,.7)'; rrp(g, bx, by, bw, bh, bh / 2); g.fillStyle = '#3aa6f5'; if (P.xp > 0) rrp(g, bx, by, Math.max(bh, bw * Math.min(1, P.xp / P.need)), bh, bh / 2);
      g.font = `800 ${13 * d}px Inter, sans-serif`; g.textBaseline = 'middle'; g.lineWidth = 3.5 * d; g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineJoin = 'round';
      const ty = by + bh + 15 * d; g.textAlign = 'right'; const info = P.lvl + '. SZINT · ' + fmtT(S.t) + (S.ph === 'bloom' ? ' · VIRÁGZÁS' : ''); g.strokeText(info, W - 12 * d, ty); g.fillStyle = '#ffe29a'; g.fillText(info, W - 12 * d, ty);
      g.font = `800 ${9 * d}px Inter, sans-serif`; g.textAlign = 'center';
      const row = (keys, yy) => { let ix = 12 * d + 11 * d; for (const k of keys) { g.fillStyle = UP[k].evo ? 'rgba(80,60,4,.75)' : 'rgba(4,7,14,.6)'; circ(g, ix, yy, 12 * d); ico(g, k, ix, yy, 17 * d); const s = UP[k].evo ? '★' : S.up[k];
        g.fillStyle = S.up[k] >= mxl(k) ? '#ffd23f' : '#fff'; g.strokeText(s, ix + 9 * d, yy + 8 * d); g.fillText(s, ix + 9 * d, yy + 8 * d); ix += 27 * d; } };
      const ks = Object.keys(S.up); row(ks.filter(isW), ty); row(ks.filter(k => !isW(k)), ty + 27 * d);
      if (S.gold || S.st.armor) { g.font = `800 ${12 * d}px Inter, sans-serif`; g.textAlign = 'right'; const gt = (S.st.armor ? '🛡 ' + (Math.round(S.st.armor * 10) / 10) + '  ' : '') + (S.gold ? S.gold + ' ARANY' : ''); g.strokeText(gt, W - 12 * d, ty + 18 * d); g.fillStyle = '#ffd23f'; g.fillText(gt, W - 12 * d, ty + 18 * d); }
      // szünet gomb
      if (G.running && !S.sel) { const pb = pauseBtn(G); g.fillStyle = 'rgba(4,7,14,.6)'; circ(g, pb.x, pb.y, pb.r); g.fillStyle = '#e6edf5'; g.fillRect(pb.x - 5 * d, pb.y - 6 * d, 3.5 * d, 12 * d); g.fillRect(pb.x + 1.5 * d, pb.y - 6 * d, 3.5 * d, 12 * d); }
      // főellenség HP-sávja
      if (S.bossE && !S.bossE.dead && !(S.bossE.dsc > 0)) { const e = S.bossE, nm = e.T.n.toUpperCase() + (e.shield ? ' · PAJZS' : ''), w = Math.min(W - 40 * d, 460 * d), x = (W - w) / 2, y = ty + 60 * d; g.fillStyle = 'rgba(4,7,14,.75)'; rrp(g, x - 3 * d, y - 3 * d, w + 6 * d, 16 * d, 8 * d);
        g.fillStyle = e.shield ? '#6cc6ff' : e.hp / e.mhp > .6 ? '#d9a441' : e.hp / e.mhp > .25 ? '#e5772a' : '#e5432a'; rrp(g, x, y, Math.max(0, w * e.hp / e.mhp), 10 * d, 5 * d); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + w * .6, y, 1.5 * d, 10 * d); g.fillRect(x + w * .25, y, 1.5 * d, 10 * d);
        g.font = `900 ${12 * d}px Cinzel, serif`; g.textAlign = 'center'; g.strokeText(nm, W / 2, y + 24 * d, W - 20 * d); g.fillStyle = e.shield ? '#9fdcff' : '#ffd23f'; g.fillText(nm, W / 2, y + 24 * d, W - 20 * d); }
      // kiszáradás: Szilárd haragja alatt töltődik, ha megtelik, jön az Aszály Istene
      if (S.ph === 'wrath' || S.ph === 'descent') { const k = S.ph === 'descent' ? 1 : S.wk, w = Math.min(W - 40 * d, 460 * d), x = (W - w) / 2, y = ty + 60 * d, hot = .5 + .5 * Math.sin(t * (4 + k * 8));
        g.fillStyle = 'rgba(4,7,14,.78)'; rrp(g, x - 3 * d, y - 3 * d, w + 6 * d, 16 * d, 8 * d);
        const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, '#c9a24f'); gr.addColorStop(.6, '#e5772a'); gr.addColorStop(1, '#e5432a'); g.fillStyle = gr; if (k > 0) rrp(g, x, y, Math.max(10 * d, w * k), 10 * d, 5 * d);
        if (k > .85) { g.fillStyle = `rgba(255,220,150,${.35 * hot})`; rrp(g, x, y, w * k, 10 * d, 5 * d); }
        g.strokeStyle = 'rgba(40,20,6,.55)'; g.lineWidth = 1.2 * d; for (let i = 1; i < 8; i++) { const cx = x + w * i / 8; ln(g, cx - 3 * d, y, cx + 2 * d, y + 10 * d); }
        g.font = `900 ${12 * d}px Cinzel, serif`; g.textAlign = 'center'; g.lineWidth = 3.5 * d; g.strokeStyle = 'rgba(0,0,0,.65)'; const lb = 'KISZÁRADÁS · ' + Math.floor(k * 100) + '%'; g.strokeText(lb, W / 2, y + 24 * d); g.fillStyle = k > .85 ? `rgb(255,${Math.round(140 + 80 * hot)},90)` : '#e8b656'; g.fillText(lb, W / 2, y + 24 * d); }
      if (S.banner && !S.choose && !S.paused && !S.sel) { g.globalAlpha = Math.min(1, S.banner.l * 2); const fs = Math.min(34 * d, W / (S.banner.t.length > 22 ? 22 : 13)); g.font = `900 ${fs}px Cinzel, serif`; g.textAlign = 'center'; g.lineWidth = 6 * d; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(S.banner.t, W / 2, H * .3, W - 20 * d); g.fillStyle = S.banner.c || '#ff5a4d'; g.fillText(S.banner.t, W / 2, H * .3, W - 20 * d); g.globalAlpha = 1; }
      if (S.note) { g.globalAlpha = Math.min(1, S.note.l * 2); g.font = `800 ${14 * d}px Inter, sans-serif`; g.textAlign = 'center'; const w = g.measureText(S.note.t).width + 28 * d; g.fillStyle = 'rgba(60,44,4,.92)'; rrp(g, (W - w) / 2, H * .38, w, 30 * d, 15 * d); g.fillStyle = '#ffd23f'; g.fillText(S.note.t, W / 2, H * .38 + 15 * d); g.globalAlpha = 1; }
      if (S.flash > 0) { g.fillStyle = `rgba(255,236,170,${Math.min(.85, S.flash * 1.4)})`; g.fillRect(0, 0, W, H); }
      // szintlépés / evolúció: választás
      if (S.choose && G.running) { const a = Math.min(1, S.choose.t * 5), ev = S.choose.evo; g.fillStyle = `rgba(2,4,9,${.72 * a})`; g.fillRect(0, 0, W, H); const cs = cards(G); g.globalAlpha = a;
        g.font = `900 ${Math.min(30 * d, W / 13)}px Cinzel, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = ev ? '#ffd23f' : '#ffe29a'; g.fillText(ev ? 'FEJLŐDÉS!' : 'SZINTLÉPÉS!', W / 2, cs[0].y - 30 * d);
        for (const c of cs) { const u = UP[c.k], cur = lv(c.k), nw = !u.sp && !cur && !ev;
          if (ev || u.fz) { g.save(); g.shadowColor = u.fz ? '#ff8a2a' : '#ffd23f'; g.shadowBlur = (14 + 8 * Math.sin(t * 6)) * d; g.fillStyle = 'rgba(40,30,6,.97)'; rrp(g, c.x, c.y, c.w, c.h, 14 * d); g.restore(); g.strokeStyle = '#ffd23f'; g.lineWidth = 3 * d; g.beginPath(); g.roundRect(c.x, c.y, c.w, c.h, 14 * d); g.stroke(); g.strokeStyle = '#b8860b'; g.lineWidth = 1 * d; g.beginPath(); g.roundRect(c.x + 5 * d, c.y + 5 * d, c.w - 10 * d, c.h - 10 * d, 10 * d); g.stroke(); }
          else { g.fillStyle = 'rgba(14,24,44,.96)'; rrp(g, c.x, c.y, c.w, c.h, 14 * d); g.strokeStyle = nw ? '#e8b656' : 'rgba(120,190,255,.4)'; g.lineWidth = (nw ? 2 : 1.5) * d; g.beginPath(); g.roundRect(c.x, c.y, c.w, c.h, 14 * d); g.stroke(); }
          g.fillStyle = ev ? 'rgba(255,210,63,.16)' : 'rgba(108,198,255,.12)'; circ(g, c.x + 41 * d, c.y + c.h / 2, 27 * d); ico(g, c.k, c.x + 41 * d, c.y + c.h / 2, 40 * d);
          g.textAlign = 'left'; g.font = `800 ${16 * d}px Inter, sans-serif`; g.fillStyle = ev || u.fz ? '#ffd23f' : '#fff'; g.fillText(u.n, c.x + 80 * d, c.y + c.h / 2 - (ev ? 16 : 12) * d, c.w - (ev ? 92 : 150) * d);
          g.font = `500 ${12.5 * d}px Inter, sans-serif`; g.fillStyle = '#c9c3b5';
          if (ev) { g.fillText(u.d, c.x + 80 * d, c.y + c.h / 2 + 8 * d, c.w - 92 * d); g.font = `700 ${11 * d}px Inter, sans-serif`; g.fillStyle = '#e8b656'; g.fillText(UP[ev[0]].n + ' + ' + UP[ev[1]].n, c.x + 80 * d, c.y + c.h / 2 + 28 * d, c.w - 92 * d); }
          else g.fillText(u.w && !u.evo ? (u.d[cur] || 'Mesterfok: +20% sebzés') : u.d, c.x + 80 * d, c.y + c.h / 2 + 11 * d, c.w - 92 * d);
          if (!u.sp && !ev) { const tag = nw ? (isW(c.k) ? 'ÚJ FEGYVER' : 'ÚJ') : (cur + 1) + '. SZINT'; g.font = `800 ${10.5 * d}px Inter, sans-serif`; const tw = g.measureText(tag).width + 14 * d; g.fillStyle = nw ? '#e8b656' : 'rgba(120,190,255,.22)'; rrp(g, c.x + c.w - tw - 10 * d, c.y + 10 * d, tw, 18 * d, 9 * d); g.fillStyle = nw ? '#1a1004' : '#bfe6ff'; g.textAlign = 'center'; g.fillText(tag, c.x + c.w - tw / 2 - 10 * d, c.y + 19.5 * d); } }
        for (const b of cardBtns(G)) btn(g, G, b);
        g.globalAlpha = 1; }
      // fúzió
      if (S.fuse && G.running) { const a = Math.min(1, S.fuse.t * 5), [sk, se] = sigKeys(), sg = lv(se) ? se : sk; g.fillStyle = `rgba(12,5,2,${.9 * a})`; g.fillRect(0, 0, W, H); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = `900 ${Math.min(32 * d, W / 11)}px Cinzel, serif`; g.fillStyle = '#ff8a2a'; g.fillText('FÚZIÓ', W / 2, 74 * d);
        g.save(); g.shadowColor = '#ff8a2a'; g.shadowBlur = (12 + 6 * Math.sin(t * 5)) * d; g.fillStyle = 'rgba(60,26,6,.95)'; circ(g, W / 2, 128 * d, 30 * d); g.restore(); ico(g, sg, W / 2, 128 * d, 42 * d);
        g.font = `800 ${13 * d}px Inter, sans-serif`; g.fillStyle = '#ffd23f'; g.fillText(UP[sg].n, W / 2, 170 * d, W - 20 * d);
        fuseRows(G).forEach((r, i) => { const f = FZ[baseW(r.k)]; g.fillStyle = 'rgba(40,18,6,.96)'; rrp(g, r.x, r.y, r.w, r.h, 12 * d); g.strokeStyle = '#ff8a2a'; g.lineWidth = 1.6 * d; g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, 12 * d); g.stroke();
          const cy = r.y + r.h / 2; g.fillStyle = 'rgba(255,138,42,.15)'; circ(g, r.x + 32 * d, cy, 22 * d); ico(g, r.k, r.x + 32 * d, cy, 30 * d);
          g.textAlign = 'left'; g.font = `800 ${14.5 * d}px Inter, sans-serif`; g.fillStyle = '#ffd23f'; g.fillText(f.n, r.x + 64 * d, cy - 11 * d, r.w - 96 * d);
          g.font = `500 ${11.5 * d}px Inter, sans-serif`; g.fillStyle = '#e8d6c0'; g.fillText(f.d, r.x + 64 * d, cy + 9 * d, r.w - 76 * d);
          g.font = `700 ${10 * d}px Inter, sans-serif`; g.fillStyle = 'rgba(255,220,180,.55)'; g.textAlign = 'right'; g.fillText(UP[r.k].n, r.x + r.w - 10 * d, r.y + 12 * d, r.w * .4); });
        g.textAlign = 'center'; btn(g, G, fuseLater(G)); g.globalAlpha = 1; }
      // szünet: build lista
      if (S.paused && G.running) { g.fillStyle = 'rgba(2,4,9,.86)'; g.fillRect(0, 0, W, H); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${Math.min(30 * d, W / 13)}px Cinzel, serif`; g.fillStyle = '#ffe29a'; g.fillText('SZÜNET', W / 2, 92 * d);
        const ks = Object.keys(S.up).sort((a, b) => isW(b) - isW(a)), cols = W / d > 700 ? 2 : 1, cw = Math.min((W - 30 * d) / cols, 420 * d), rh = Math.min(48 * d, (H - 230 * d) / Math.ceil(ks.length / cols)), x0 = (W - cols * cw) / 2;
        ks.forEach((k, i) => { const cx = x0 + (i % cols) * cw, cy = 125 * d + Math.floor(i / cols) * rh, u = UP[k], cur = S.up[k];
          g.fillStyle = u.evo ? 'rgba(60,44,4,.9)' : 'rgba(14,24,44,.9)'; rrp(g, cx + 4 * d, cy, cw - 8 * d, rh - 6 * d, 10 * d); ico(g, k, cx + 26 * d, cy + (rh - 6 * d) / 2, 26 * d);
          g.textAlign = 'left'; g.font = `800 ${13 * d}px Inter, sans-serif`; g.fillStyle = u.evo ? '#ffd23f' : '#fff'; g.fillText(u.n + (u.evo ? '' : ' · ' + cur + '. szint'), cx + 48 * d, cy + (rh - 6 * d) / 2 - 8 * d, cw - 60 * d);
          g.font = `500 ${11 * d}px Inter, sans-serif`; g.fillStyle = '#b9c4d2'; g.fillText(u.w && !u.evo ? (u.d[cur - 1] || 'Mesterfok: +' + (cur - bmx(k)) * 20 + '% sebzés') : u.d, cx + 48 * d, cy + (rh - 6 * d) / 2 + 9 * d, cw - 60 * d); });
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
        const kb = kutBtn(G); btn(g, G, Object.assign({ t: 'TANÁCSI KÚT · ' + store.get('aszb_gold') + ' ARANY' }, kb), true);
        if (S.hasSave) { const sv = S.hasSave, cc = CH.find(c => c.id === sv.ch); btn(g, G, Object.assign({ t: 'FOLYTATÁS · ' + (cc ? cc.n : '') + ' · ' + fmtT(sv.t) }, contBtn(G))); }
        g.globalAlpha = 1;
        if (S.shop) { const sh = S.shop, b = Math.min(1, sh.t * 6); g.fillStyle = `rgba(2,4,9,${.94 * b})`; g.fillRect(0, 0, W, H); g.globalAlpha = b; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.font = `900 ${Math.min(28 * d, W / 14)}px Cinzel, serif`; g.fillStyle = '#ffe29a'; g.fillText('TANÁCSI KÚT', W / 2, 70 * d);
          const gold = store.get('aszb_gold'); g.font = `800 ${14 * d}px Inter, sans-serif`; g.fillStyle = '#ffd23f'; g.fillText(gold + ' ARANY', W / 2, 98 * d);
          for (const r of shopRows(G)) { const l = (S.meta[r.u.id] || 0), mx = l >= r.u.mx, c = mCost(r.u, l), ok = !mx && gold >= c, x = r.x + (sh.i === r.i && sh.shake > 0 ? Math.sin(sh.shake * 60) * 4 * d : 0);
            g.fillStyle = mx ? 'rgba(60,44,4,.92)' : 'rgba(14,24,44,.95)'; rrp(g, x, r.y, r.w, r.h, 10 * d); g.strokeStyle = ok ? '#e8b656' : 'rgba(120,190,255,.3)'; g.lineWidth = (ok ? 1.8 : 1.2) * d; g.beginPath(); g.roundRect(x, r.y, r.w, r.h, 10 * d); g.stroke();
            const fz = Math.min(1, r.h / (46 * d)); g.textAlign = 'left'; g.font = `800 ${13 * d * fz}px Inter, sans-serif`; g.fillStyle = mx ? '#ffd23f' : '#fff'; g.fillText(r.u.n, x + 12 * d, r.y + r.h / 2 - 8 * d * fz, r.w * .5);
            g.font = `500 ${11 * d * Math.max(.85, fz)}px Inter, sans-serif`; g.fillStyle = '#b9c4d2'; g.fillText(r.u.d, x + 12 * d, r.y + r.h / 2 + 8 * d * fz, r.w * .58);
            for (let j = 0; j < r.u.mx; j++) { g.fillStyle = j < l ? '#ffd23f' : 'rgba(255,255,255,.15)'; circ(g, x + r.w * .64 + j * 9 * d, r.y + r.h / 2, 3 * d); }
            g.textAlign = 'right'; g.font = `800 ${12 * d}px Inter, sans-serif`; g.fillStyle = mx ? '#ffd23f' : ok ? '#ffe29a' : 'rgba(255,255,255,.4)'; g.fillText(mx ? 'MAX' : c + ' ARANY', x + r.w - 12 * d, r.y + r.h / 2); }
          g.textAlign = 'center'; btn(g, G, shopClose(G)); g.globalAlpha = 1; } }
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
