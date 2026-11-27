/* Aszálytúlélő: Nagy Szárazság – játékadatok (ellenségek, fegyverek, passzívok, karakterek, bossok, Kút) */

/* ---------- ellenségek ----------
   ai: chase | swarm | flank | charge | ghost | ranged | turret | trap | summon | shield | tele | heal | pull | mine | leech | watch | curse | herald | drain | burn | grow | roll | mirage | formation | lob | dive | sip
   extra: kör alakú egyedi paraméterek */
export const FAM = ['kert', 'sivatag', 'varos', 'meder', 'halo'];
export const FAM_T = [0, 10, 20, 30, 40]; // perc, amikor a család megjelenik
export const FAM_N = { kert: 'Völgy átkai', sivatag: 'Puszta népe', varos: 'Aszályvár serege', meder: 'Halott folyó', halo: 'Szilárd árnyai' };
export const EAI = {
  ghoul: { ai: 'chase', w: 3 }, szalmabab: { ai: 'charge', w: 2, range: 170 }, tovis: { ai: 'trap', w: 1, root: 1 }, hollok: { ai: 'swarm', w: 3, pack: 6 },
  farkas: { ai: 'flank', w: 2, pack: 3 }, vadkan: { ai: 'charge', w: 1, range: 320 }, porliderc: { ai: 'ghost', w: 2, cloud: 1 }, banya: { ai: 'summon', w: 1, summon: 'tovis' },
  futo: { ai: 'ranged', w: 2, keep: 260, shot: 'spear' }, sogolem: { ai: 'shield', w: 1 }, delibab: { ai: 'mirage', w: 2 }, keselyuember: { ai: 'dive', w: 2 },
  obeliszk: { ai: 'turret', w: 1, beam: 1 }, szkarabeusz: { ai: 'roll', w: 2 }, skorpio: { ai: 'lob', w: 1 }, ijasz: { ai: 'ranged', w: 2, keep: 300, shot: 'arrow' },
  zsoldos: { ai: 'chase', w: 3, reach: 1 }, adoszedo: { ai: 'drain', w: 1 }, mag: { ai: 'burn', w: 2 }, kopo: { ai: 'flank', w: 2, pack: 2, burn: 1 },
  kutmimik: { ai: 'trap', w: 1, bite: 1 }, szamszerij: { ai: 'ranged', w: 2, keep: 340, shot: 'bolt', pierce: 1 }, hirnok: { ai: 'herald', w: 1 }, pajzsfal: { ai: 'shield', w: 1 },
  csontnaga: { ai: 'chase', w: 2, reach: 1 }, iszap: { ai: 'grow', w: 2 }, raklovag: { ai: 'shield', w: 1, half: 1 }, zsilip: { ai: 'shield', w: 1 },
  reves: { ai: 'ghost', w: 2, lure: 1 }, nimfa: { ai: 'sip', w: 1 }, pioca: { ai: 'leech', w: 2 },
  kultista: { ai: 'heal', w: 1 }, lancoslovag: { ai: 'pull', w: 1 }, runaszem: { ai: 'watch', w: 2 }, hibagolem: { ai: 'tele', w: 1 },
  letraor: { ai: 'formation', w: 2 }, kodliderc: { ai: 'curse', w: 2 }, tonpecset: { ai: 'mine', w: 1 }, arnyfarkas: { ai: 'flank', w: 2, pack: 3, shade: 1 }
};
export const HP_T = [0, 5, 12, 26, 52, 110], SP_T = [0, 42, 60, 80, 104, 132], DMG_T = [0, 5, 7, 10, 14, 19], XP_T = [0, 1, 2, 3, 5, 8], SIZE_T = [0, 26, 30, 34, 40, 48];

/* ---------- fegyverek ---------- */
export const MAXLV = 5, SIGLV = 8;
export const WEAP = {
  pisztoly: { n: 'Vízpisztoly', d: ['A legközelebbi ellenségre lő', '+1 lövedék', 'Átüt még egy ellenségen', '+1 lövedék', 'Gyorsabb tüzelés, +1 átütés'] },
  szoro: { n: 'Szórófej', d: ['Körülötted keringő vízcseppek', '+1 csepp, erősebb', '+1 csepp, erősebb', '+1 csepp, erősebb', '+1 csepp, erősebb'] },
  bomba: { n: 'Vízibomba', d: ['Felrobbanó vízibombát dob', 'Nagyobb robbanás', '+1 bomba', 'Nagyobb robbanás', '+1 bomba'] },
  felho: { n: 'Esőfelhő', d: ['Áztat és lelassít egy területet', 'Tovább tart', 'Nagyobb és erősebb', '+1 felhő', 'Sokkal tovább tart'] },
  pocsolya: { n: 'Pocsolya', d: ['Sebző tócsa a lábad körül', 'Nagyobb és erősebb', 'Nagyobb és erősebb', 'Nagyobb és erősebb', 'Nagyobb és erősebb'] },
  rainbird: { n: 'Rain Bird szektorszóró', d: ['Körbe söprő vízív', 'Szélesebb, erősebb', 'Szélesebb söprés', 'Erősebb, messzebb ér', 'Szinte teljes kör'] },
  gejzir: { n: 'Gejzír', d: ['Vízoszlop tör fel az ellenség alatt', '+1 gejzír', 'Nagyobb és erősebb', '+1 gejzír', 'Sűrűbb kitörések'] },
  jegcsap: { n: 'Jégcsapeső', d: ['Fentről hulló, fagyasztó jégcsapok', '+1 jégcsap', 'Hosszabb fagyasztás', '+2 jégcsap', 'Erősebb, sűrűbb'] },
  buborek: { n: 'Buborékpajzs', d: ['Elnyel egy ütést, majd szétpukkan', 'Gyorsabban újratölt', 'Nagyobb pukkanás', 'Gyorsabban újratölt', 'Két ütést nyel el'] },
  akna: { n: 'Harmatakna', d: ['Vízaknákat hagysz magad után', 'Nagyobb robbanás', '+1 akna', 'Erősebb', 'Sűrűbb aknák'] },
  malomko: { n: 'Malomkő-korong', d: ['Pattogó nehéz kőkorong', 'Erősebb', '+1 korong', 'Gyorsabb, tovább tart', '+1 korong'] },
  torony: { n: 'Szökőkút-torony', d: ['Lerakható torony, 15 mp-ig tüzel', 'Gyorsabb tüzelés', 'Tovább áll', '+1 torony', 'Átütő lövések'] }
};
/* evolúciók: [fegyver, passzív, evolúció] */
export const EVO = [['pisztoly', 'nyomas', 'vizagyu'], ['szoro', 'fuvoka', 'korforgo'], ['bomba', 'idozito', 'bombazapor'], ['felho', 'magnes', 'zivatar'], ['pocsolya', 'vitamin', 'gyogyforras'],
  ['rainbird', 'gyujto', 'ontozohid'], ['gejzir', 'hosszabbito', 'gejzirmezo'], ['jegcsap', 'hutoborda', 'jegkorszak'], ['buborek', 'esernyo', 'buborekvar'], ['akna', 'komposzt', 'elokert'],
  ['malomko', 'kesztyu', 'malomvihar'], ['torony', 'szivattyu', 'viztorony']];
export const EVON = { vizagyu: 'VÍZÁGYÚ', korforgo: 'KÖRFORGÓ ESŐZTETŐ', bombazapor: 'BOMBAZÁPOR', zivatar: 'ZIVATAR', gyogyforras: 'GYÓGYFORRÁS', ontozohid: 'KÖRFORGÓ ÖNTÖZŐHÍD', gejzirmezo: 'GEJZÍRMEZŐ',
  jegkorszak: 'JÉGKORSZAK', buborekvar: 'BUBORÉKVÁR', elokert: 'ÉLŐ KERT', malomvihar: 'MALOMKŐ-VIHAR', viztorony: 'VÍZTORONY' };
export const EVOD = { vizagyu: 'Hatalmas, mindenen átütő lövedék, hátralökéssel', korforgo: 'Két ellentétes irányban forgó cseppgyűrű', bombazapor: 'Bombaeső láncrobbanással', zivatar: 'Villám csap a felhőkből',
  gyogyforras: 'Sebez, és gyógyít, amíg benne állsz', ontozohid: 'Hosszú, körbeforgó öntözőkar', gejzirmezo: 'Tartós kitörések az egész képernyőn', jegkorszak: 'Fagyasztó jégeső a teljes képernyőn',
  buborekvar: 'Három keringő pajzsbuborék', elokert: 'Az aknák helyén gyógyító virágok nőnek', malomvihar: 'Négy pattogó korong, lökéshullámmal', viztorony: 'Állandó torony, ami veled tüzel' };

/* ---------- passzívok ---------- */
export const PASS = {
  csizma: { n: 'Gumicsizma', d: '+9% mozgási sebesség' }, vitamin: { n: 'Tápoldat', d: '+20 max. élet és gyógyulás' }, magnes: { n: 'Cseppmágnes', d: '+35% gyűjtési távolság' },
  nyomas: { n: 'Nyomásfokozó', d: '+12% sebzés' }, idozito: { n: 'Öntözőóra', d: '−7% töltési idő' }, fuvoka: { n: 'Széles fúvóka', d: '+10% hatóterület' },
  kesztyu: { n: 'Kerti kesztyű', d: '−1 kapott sebzés' }, gyujto: { n: 'Esővíz-gyűjtő', d: '+0,3 élet/mp' }, tartaly: { n: 'Tartalék tartály', d: '+1 lövedék', mx: 2 },
  lohere: { n: 'Négylevelű lóhere', d: '+30% szerencse' }, hosszabbito: { n: 'Hosszabbító', d: '+15% időtartam' }, napszem: { n: 'Napszemüveg', d: '+8% kritikus esély' },
  kulacs: { n: 'Kulacs', d: '+25% gyógyulás' }, szivattyu: { n: 'Szivattyúmotor', d: '+15% lövedéksebesség' }, esernyo: { n: 'Esernyő', d: '−15% kapott sebzés' },
  komposzt: { n: 'Komposzt', d: 'Ölésenként esély gyógycseppre' }, hutoborda: { n: 'Hűtőborda', d: '−5% töltési idő' }, vizszuro: { n: 'Vízszűrő', d: '+10% XP' },
  szalmakalap: { n: 'Szalmakalap', d: '−25% égés- és hősebzés' }, kave: { n: 'Kávésbögre', d: '+8% támadási sebesség' }
};

/* ---------- karakterek és saját fegyverek ---------- */
export const CHARS = [
  { id: 'gh', n: 'Gergő, a HGWS-től', art: 'pGh', e: 'calm', w: 'aranyfej', req: null, reqT: 'Alapból elérhető', trait: '+1 újrasorsolás', st: { reroll: 1 } },
  { id: 'rl', n: 'Gyakornok Relé', art: 'pRl', e: 'smile', w: 'rele', req: 'evo', reqT: 'Készíts egy evolúciót', trait: '+15% XP, −10 max. élet', st: { xp: .15, hp: -10 } },
  { id: 'gt', n: 'Gergő, a Biztonsági Körök Őre', art: 'pGt', e: 'calm', w: 'veszgomb', req: 'wd', reqT: 'Győzd le a Watchdog Lovagot', trait: '+1 páncél', st: { armor: 1 } },
  { id: 'kt', n: 'Kitty', art: 'pKt', e: 'smirk', w: 'pid', req: 'st', reqT: 'Győzd le a Structured Text Boszorkányt', trait: '+10% hatóterület', st: { area: .1 } },
  { id: 'zr', n: 'Zero', art: 'pZr', e: 'calm', w: 'ak63', req: 'pt5000', reqT: 'Érj el 5000 pontot egy körben', trait: '−10% töltési idő, aranyseprű 8 mp-enként', st: { cd: -.1, broom: 1 } },
  { id: 'bt', n: 'Botond', art: 'pBt', e: 'smile', w: 'pkm', req: 't600', reqT: 'Élj túl 10 percet', trait: '+20 élet, −5% sebesség, a tartály gyógyít', st: { hp: 20, speed: -.05, tank: 1 } }
];
export const SIG = {
  aranyfej: { n: 'Aranylocsolófej-bot', evoP: 'idozito', evo: 'aranyfejevo', d: ['3 forgó sugár', '+1 sugár', 'Messzebb ér', '10% aranycsepp: 2× sebzés', '+1 sugár', 'Gyorsabb forgás', 'Aranycsepp 20%', 'A sugarak átütnek'] },
  rele: { n: 'Visszacsatoló relékocka', evoP: 'tartaly', evo: 'releevo', d: ['1 keringő kocka', '+1 kocka', 'Gyorsabb tüzelés', 'A találatok gyógyítanak', '+1 kocka', 'Láncolódó lövés', '+1 kocka', 'Erősebb lövések'] },
  veszgomb: { n: 'Vészleállító gomb', evoP: 'kesztyu', evo: 'veszevo', d: ['Megállító kör 1,2 mp', 'Nagyobb kör', 'Erősebb', 'A körben +15% sebzést kapnak', 'Kör 2 mp', 'Rövidebb töltés', 'Nagyobb kör', 'Két kör egyszerre'] },
  pid: { n: 'PID-vízhullám', evoP: 'fuvoka', evo: 'pidevo', d: ['Vízhullám előre', 'I-tag: halmozódó sebzés', '+1 hullám', 'D-tag: gyors célok +30%', 'Szélesebb', 'I-tag gyorsabban nő', '+1 hullám', 'Soha nem téveszt célt'] },
  ak63: { n: 'Magas nyomású AK-63', evoP: 'nyomas', evo: 'ak63evo', d: ['3 lövéses sorozat', '+1 lövés', 'Átüt még egy ellenségen', 'Gyorsabb tüzelés', '+2 lövés', 'Hátralök', 'Átüt még kettőn', 'Hosszú sorozat'] },
  pkm: { n: 'Magas nyomású PKM', evoP: 'kesztyu', evo: 'pkmevo', d: ['Folyamatos tűz állva', 'Szélesebb ív', 'Erősebb', 'Mozgás közben is pontos', '+1 cső', 'Lassító permet', 'Szélesebb ív', 'Minden 50. lövés robban'] }
};
export const SIGEVO = { aranyfejevo: ['AZ ARANY LOCSOLÓFEJ', '10 mp-enként gyógyító aranyhullám, dupla XP'], releevo: ['ZÁRT SZABÁLYKÖR', 'Áramvonalak a kockák között'], veszevo: ['VÉSZLEÁLLÍTÓ HÁLÓZAT', '30 mp-enként minden megáll'],
  pidevo: ['TÖKÉLETES EGYENSÚLY', 'Állandó, önhangoló vízörvény'], ak63evo: ['AZ ARANYSEPRŰ', 'Minden sorozat után seprűhullám'], pkmevo: ['VÍZÁGYÚ-ÜTEG', 'Két irányba tüzel, átüt mindenen'] };

/* ---------- bossok ---------- */
export const BOSSQ = [
  { t: 8, id: 'watchdog' }, { t: 16, id: 'kaktusz' }, { t: 24, id: 'ladder' }, { t: 32, id: 'fereg' }, { t: 40, id: 'boszi' }, { t: 50, id: 'szilard' }];
export const BOSS = {
  watchdog: { n: 'Watchdog Lovag', sub: 'Tanácsi próba', hp: 2600, sp: 70, dmg: 16, r: 46, art: 'wdk', size: 150, relic: 'orzo', flag: 'wd' },
  kaktusz: { n: 'Kaktuszkirály', sub: 'A Tüskés Trón Ura', hp: 6000, sp: 56, dmg: 20, r: 54, art: 'kk', size: 170, relic: 'korona' },
  ladder: { n: 'Ladder Mester', sub: 'Tanácsi próba', hp: 9500, sp: 54, dmg: 20, r: 46, art: 'ldm', size: 150, relic: 's7', flag: 'ld' },
  fereg: { n: 'Homokféreg', sub: 'A Puszta Falója', hp: 15000, sp: 120, dmg: 26, r: 60, art: 'hf', size: 190, relic: 'fog' },
  boszi: { n: 'Structured Text Boszorkány', sub: 'Tanácsi próba', hp: 21000, sp: 64, dmg: 24, r: 44, art: 'stw', size: 150, relic: 'tabla', flag: 'st' },
  szilard: { n: 'Szikkadt Szilárd', sub: 'A Tanács Árnyéka', hp: 34000, sp: 66, dmg: 30, r: 46, art: 'szl', size: 160, relic: 'konyv', flag: 'sz' },
  isten: { n: 'Szikkadt Szilárd, az Aszály Istene', sub: 'A Végső Szárazság', hp: 900000, sp: 34, dmg: 40, r: 120, art: 'god', size: 520, flag: 'god' }
};
export const RELIC = {
  orzo: ['Őrző pajzs', 'Egyszer túléled a halálos ütést'], s7: ['Siemens S7-300', '+1 fegyverhely'], tabla: ['Kódoló varázstábla', '+2 újrasorsolás'], konyv: ['A Fekete Könyv lapja', '+1 száműzés'],
  korona: ['Kaktuszkorona', '+10% sebzés'], fog: ['Féregfog', '+10% mozgási sebesség']
};
export const SEALS = [
  { id: '', n: 'Nincs pecsét', d: 'Alap kör' },
  { id: 'orzo', n: 'Őrző pecsét', d: 'Ha 3 mp-ig nem sérülsz, pajzsot kapsz', need: 'wd' },
  { id: 'letra', n: 'Létrapecsét', d: 'Minden 5. szintlépésnél egy extra kártya', need: 'ld' },
  { id: 'szintaxis', n: 'Szintaxispecsét', d: 'A kritikus találatok átugranak a legközelebbi ellenségre', need: 'st' },
  { id: 'arnyek', n: 'Árnyékpecsét', d: '+50% pont és aranycsepp, de az ellenségek 25%-kal erősebbek', need: 'sz' },
  { id: 'eso', n: 'Esőpecsét', d: 'A kör első 60 mp-ében dupla XP' },
  { id: 'kut', n: 'Kútpecsét', d: 'Minden boss megjelenésekor teli gyógyulás' }
];

/* ---------- Tanácsi Kút (permanens fejlesztések) ---------- */
export const META = [
  { id: 'hp', n: 'Élet', ag: 'Alap', d: '+10% max. élet', mx: 5, c: 200 }, { id: 'dmg', n: 'Erő', ag: 'Alap', d: '+5% sebzés', mx: 5, c: 300 },
  { id: 'spd', n: 'Gyorsaság', ag: 'Alap', d: '+5% mozgás', mx: 3, c: 250 }, { id: 'area', n: 'Hatóterület', ag: 'Alap', d: '+5% terület', mx: 2, c: 400 },
  { id: 'dur', n: 'Időtartam', ag: 'Alap', d: '+10% időtartam', mx: 2, c: 300 }, { id: 'cd', n: 'Töltési idő', ag: 'Alap', d: '−3% töltési idő', mx: 2, c: 600 },
  { id: 'armor', n: 'Páncél', ag: 'Védelmi', d: '+1 páncél', mx: 3, c: 500, need: 'wd' }, { id: 'regen', n: 'Regeneráció', ag: 'Védelmi', d: '+0,1 élet/mp', mx: 5, c: 300, need: 'wd' },
  { id: 'revive', n: 'Feltámadás', ag: 'Védelmi', d: '+1 újraéledés körönként', mx: 1, c: 5000, need: 'wd' }, { id: 'vpajzs', n: 'Vészpajzs', ag: 'Védelmi', d: 'Kör elején 1 ütésnyi pajzs', mx: 1, c: 1500, need: 'wd' },
  { id: 'magnet', n: 'Mágnes', ag: 'Szimulációs', d: '+20% gyűjtési távolság', mx: 2, c: 300, need: 'st' }, { id: 'luck', n: 'Szerencse', ag: 'Szimulációs', d: '+10% szerencse', mx: 3, c: 600, need: 'st' },
  { id: 'reroll', n: 'Újrasorsolás', ag: 'Szimulációs', d: '+1 újrasorsolás', mx: 5, c: 800, need: 'st' }, { id: 'skip', n: 'Kihagyás', ag: 'Szimulációs', d: '+1 kihagyás', mx: 3, c: 400, need: 'st' },
  { id: 'banish', n: 'Száműzés', ag: 'Szimulációs', d: '+1 száműzés', mx: 3, c: 1000, need: 'st' }, { id: 'xp', n: 'Bölcsesség', ag: 'Szimulációs', d: '+5% XP', mx: 5, c: 900, need: 'st' },
  { id: 'greed', n: 'Kapzsiság', ag: 'Kockázati', d: '+10% aranycsepp', mx: 5, c: 300, need: 'sz' }, { id: 'heat', n: 'Hőségfokozat', ag: 'Kockázati', d: 'Erősebb horda, +15% aranycsepp fokonként', mx: 10, c: 0, need: 'sz', free: 1 },
  { id: 'startlv', n: 'Kezdő szint', ag: 'Kockázati', d: 'A saját fegyver 2. szinten indul', mx: 1, c: 4000, need: 'sz' }, { id: 'curse', n: 'Átok', ag: 'Kockázati', d: '+10% ellenség és sebesség, +10% pont', mx: 5, c: 0, need: 'sz', free: 1 }
];
export const AG_NEED = { Alap: null, Védelmi: 'Watchdog Lovag', Szimulációs: 'Structured Text Boszorkány', Kockázati: 'Szikkadt Szilárd' };

/* ---------- események (perc) ---------- */
export const EVENTS = [
  { t: 13, id: 'vihar', n: 'Homokvihar', d: 40 }, { t: 22, id: 'tilalom', n: 'Locsolási tilalom', d: 30 }, { t: 34, id: 'hoseg', n: 'Hőhullám', d: 40 },
  { t: 44, id: 'hullam', n: 'Visszatérő hullám', d: 8 }, { t: 47, id: 'sotet', n: 'Árnyékfogyatkozás', d: 40 }];
