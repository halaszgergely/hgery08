/* HGWS Arcade – a játéklista adatai (csak a listaoldal használja; a játékokhoz és a pontmentéshez nincs köze).
   ÚJ JÁTÉK FELVÉTELE: egy új bejegyzés a JATEKOK tömbbe. Mezők:
     id         – a játék azonosítója (a ranglistáé is ez); a Játék gomb alapból a #/arcade/<id> címre visz
     cim        – a játék neve
     rovid      – rövid leírás a kártyára (legfeljebb kb. 90 karakter)
     hosszu     – hosszú leírás a részletező panelre
     iranyitas  – az irányítás sorai (tömb)
     kat        – kategória kulcsa (lásd KATEGORIAK)
     cimkek     – keresőszavak (tömb)
     ikon, szin – a generált borító emojija és színe (akkor látszik, ha nincs kép)
     kepek      – borítóképek útvonalai (tömb); ha több van, a kártyán váltakoznak. Üresen a generált borító látszik.
     statusz    – 'uj' | 'online' | 'beta' | 'closedbeta' | 'demo' | '' (a kártya jelvénye)
     hozzaadva  – ÉÉÉÉ-HH-NN (az „Újdonságok” sorhoz és az „Újak elöl” rendezéshez)
     kiemelt    – 2: a nagy kiemelt kártya, 1: kis kiemelt, 0: nem kiemelt
     egyseg     – a rekord mértékegysége (pont, m, Ft…)
     ranglista  – true, ha van online ranglistája (a panel top 10-et mutat, a kártya rekordot)
     link       – csak ha nem a #/arcade/<id> címen indul
     zart       – true: csak a béta-tesztelők látják */
export const KATEGORIAK = [
  { k: 'szimulator', n: 'Szimulátor', t: 'Szimulátorok' }, { k: 'akcio', n: 'Akció', t: 'Akció' }, { k: 'ugyessegi', n: 'Ügyességi', t: 'Ügyességi' },
  { k: 'verseny', n: 'Verseny', t: 'Verseny' }, { k: 'strategia', n: 'Stratégia', t: 'Stratégia és építés' }, { k: 'tobbjatekos', n: 'Többjátékos', t: 'Többjátékos' },
  { k: 'logikai', n: 'Logikai', t: 'Logikai' }, { k: 'ur', n: 'Űr', t: 'Űr' }, { k: 'kaland', n: 'Kaland', t: 'Kaland' }];
export const UJ_NAPOK = 30; // ennyi napig számít újdonságnak egy játék
export const JATEKOK = [
  { id: 'szerver', cim: 'Szerverfarm', rovid: 'Garázsszervertől az adatközpontig: építs, kábelezz, szerezz ügyfeleket, bányássz.', kat: 'szimulator', cimkek: ['szerver', 'adatközpont', 'rack', 'kábelezés', 'kripto', 'tycoon', 'egyjátékos'], ikon: '🖥️', szin: '#4cc9f0', kepek: [], statusz: 'uj', hozzaadva: '2026-11-22', kiemelt: 1, egyseg: 'Ft', ranglista: true,
    hosszu: 'Egy garázsban indulsz némi megtakarítással. Vegyél racket, rakj össze szervert alkatrészekből (processzor, memória, lemezek, videókártyák, táp), szereld be, és kábelezd rá az áramra meg az internetre. A szervert kiadhatod weboldalaknak, hálózati tárhelynek, játékszervernek, adatbázisnak vagy MI-tanításra, a videókártyákkal pedig kriptót bányászhatsz. Figyelj a biztosítékokra, a hőmérsékletre, az áramszünetekre és a meghibásodó lemezekre. A bevételből jöhet nagyobb rack, switchek, szünetmentes táp, klíma – aztán pinceiroda, szerverterem és végül saját adatközpont-csarnok.',
    iranyitas: ['Kattintás egy portra, majd egy másikra: kábel', 'Kattintás bekötött portra: kábel kihúzása', 'Kattintás eszközre: részletek és alkatrészek', 'Húzás: nézet mozgatása · görgő: nagyítás', 'Szóköz: szünet'] },
  { id: 'vasut', cim: 'Derail Hungary', rovid: 'Teherfuvarozás Magyarország valódi, 14 000 km-es vasúthálózatán.', kat: 'szimulator', cimkek: ['vonat', 'vasút', 'térkép', 'magyarország', 'fuvarozás', 'egyjátékos'], ikon: '🚂', szin: '#a9b4c2', kepek: ['img/arcade/vasut-1.webp', 'img/arcade/vasut-2.webp', 'img/arcade/vasut-3.webp'], statusz: 'uj', hozzaadva: '2026-11-21', kiemelt: 2, egyseg: 'Ft', ranglista: true,
    hosszu: 'Felülnézetes mozdonyvezető-szimulátor az ország teljes vasúthálózatán: állomási vágányok, fordítókorongok, domborzat, valódi települések. Vállalj fuvarokat állomásoktól és üzemektől, állítsd össze a szerelvényt, vegyél mozdonyokat, kocsikat és engedélyeket, építs depókat, és vegyél fel sofőröket, akik helyetted is fuvaroznak. A rekord az összes megkeresett fuvardíj.',
    iranyitas: ['W / S vagy a kar – sebesség', 'B / N – fék, Szóköz – vészfék', 'R – irányváltó, P – rögzítőfék', 'X – automata tempomat, C – sebesség tartása', 'V – váltó, M – térkép, / – kereső'] },
  { id: 'flightsim', cim: 'HGWS Légi Öntözés', rovid: '3D repülőszimulátor Magyarország felett: öntözés, tűzoltás, precíziós célok.', kat: 'szimulator', cimkek: ['repülő', '3d', 'öntözés', 'tűzoltás', 'magyarország', 'egyjátékos'], ikon: '✈️', szin: '#2aa7d9', kepek: ['img/arcade/flightsim-1.webp', 'img/arcade/flightsim-2.webp', 'img/arcade/flightsim-3.webp'], statusz: 'uj', hozzaadva: '2026-11-21', kiemelt: 1, egyseg: 'p', ranglista: true,
    hosszu: 'Ülj be az öntözőgép pilótafülkéjébe, és repülj küldetéseket Magyarország felett: táblák öntözése, tűzoltás, precíziós célok és vízikarikák. A rekord a legjobb küldetéspontszám.',
    iranyitas: ['Az irányítást a játék indításkor mutatja', 'Billentyűzettel és érintéssel is játszható'] },
  { id: 'boonline', cim: 'Öntöző Birodalom Online', rovid: 'Közös világ 13 régióval: telkek, piac, vezetékek, szövetkezetek, heti ostrom.', kat: 'strategia', cimkek: ['online', 'közös világ', 'piac', 'szövetkezet', 'építős'], ikon: '🌍', szin: '#e8b656', kepek: ['img/arcade/boonline-1.webp', 'img/arcade/boonline-2.webp', 'img/arcade/boonline-3.webp'], statusz: 'closedbeta', hozzaadva: '2026-11-20', kiemelt: 1, egyseg: '', ranglista: false, link: '#/birodalom',
    hosszu: 'Az Öntöző Birodalom közös, állandó világa: 13 régióban foglalhatsz telket, kereskedhetsz a piacon, vezetékeket építhetsz, szövetkezetbe léphetsz, és hetente ostrom dönt a régiók sorsáról.',
    iranyitas: ['Egér vagy érintés', 'Bejelentkezés kell hozzá'] },
  { id: 'holtvaros', cim: 'Holtváros', rovid: 'Védd meg a várost a zombijárványtól: zónák, kapuk, őrség, légicsapás.', kat: 'strategia', cimkek: ['zombi', 'járvány', 'védekezés', 'térkép', 'magyarország', 'egyjátékos'], ikon: '🧟', szin: '#7dff4a', kepek: ['img/arcade/holtvaros-1.webp', 'img/arcade/holtvaros-2.webp', 'img/arcade/holtvaros-3.webp'], statusz: '', hozzaadva: '2026-11-20', kiemelt: 1, egyseg: 'pont', ranglista: true,
    hosszu: 'Felülnézetes járványstratégia valódi magyar várostérképeken. Jelölj ki zónákat, zárd le a kapukat, állíts őrséget, és vess be tankokat, helikoptert vagy légicsapást, mielőtt a fertőzés elnyeli a várost. Fedezz fel kórházakat, rendőrségeket és laktanyákat a bónuszokért.',
    iranyitas: ['Egér – kijelölés, építés, egységek', 'Görgő – nagyítás, húzás – térkép mozgatása'] },
  { id: 'birodalom', cim: 'Öntöző Birodalom', rovid: 'Építs csőhálózatot és kertet – akkor is termel, amikor nem vagy itt.', kat: 'strategia', cimkek: ['idle', 'építős', 'kert', 'csövek', 'felhőmentés', 'egyjátékos'], ikon: '🌱', szin: '#6fcf6a', kepek: ['img/arcade/birodalom-1.webp', 'img/arcade/birodalom-2.webp', 'img/arcade/birodalom-3.webp'], statusz: '', hozzaadva: '2026-11-20', kiemelt: 0, egyseg: 'Ft', ranglista: true,
    hosszu: 'Idle építős játék: húzz csöveket a főcsaptól, telepíts szórófejeket és modulokat, ültess egyre értékesebb növényeket, fejleszd a vizet és a birtokot, majd terjeszkedj az űrbe és a galaxisba. A kert távollétedben is termel, a mentésed a felhőbe is felkerül.',
    iranyitas: ['Bal gomb – lerakás (húzva többet)', 'Jobb gomb – bontás, középső gomb – elem kézbe vétele', 'Görgő – nagyítás, nyilak / WASD – kamera'] },
  { id: 'aszaly', cim: 'Aszálytúlélő', rovid: 'Hordatúlélő: a fegyvereid maguktól tüzelnek, te mozogsz és szintet lépsz.', kat: 'akcio', cimkek: ['túlélő', 'horda', 'roguelike', 'egyjátékos'], ikon: '🌵', szin: '#ff9a3c', kepek: ['img/arcade/aszaly-1.webp', 'img/arcade/aszaly-2.webp', 'img/arcade/aszaly-3.webp'], statusz: 'uj', hozzaadva: '2026-11-21', kiemelt: 0, egyseg: 'pont', ranglista: true,
    hosszu: 'Szikkadt Szilárd serege minden irányból jön. A fegyvereid maguktól tüzelnek – te mozogsz, cseppeket gyűjtesz, szintet lépsz és fejlesztést választasz. Meddig bírod?',
    iranyitas: ['WASD / nyilak vagy érintés – mozgás', 'A fegyverek automatikusan tüzelnek'] },
  { id: 'vizagyu', cim: 'Vízágyú', rovid: 'Kaktuszok és tűzgolyók zúdulnak a kertre. Célozz a vízágyúval!', kat: 'akcio', cimkek: ['lövöldözős', 'klasszikus', 'egyjátékos'], ikon: '💦', szin: '#ff7a6e', kepek: ['img/arcade/vizagyu-1.webp', 'img/arcade/vizagyu-2.webp', 'img/arcade/vizagyu-3.webp'], statusz: '', hozzaadva: '2026-11-17', kiemelt: 0, egyseg: 'pont', ranglista: true,
    hosszu: 'Védd meg a kertet: lődd le vízágyúval a lezúduló kaktuszokat és tűzgolyókat, mielőtt földet érnek.',
    iranyitas: ['Egér vagy érintés – célzás és lövés'] },
  { id: 'zeroquest', cim: 'Zero Quest', rovid: 'Felülnézetes akció-szerepjáték Hajnalrév völgyében.', kat: 'akcio', cimkek: ['rpg', 'szerepjáték', 'kaland', 'béta'], ikon: '⚔️', szin: '#e8b656', kepek: ['img/arcade/zeroquest-1.webp', 'img/arcade/zeroquest-2.webp', 'img/arcade/zeroquest-3.webp'], statusz: 'beta', hozzaadva: '2026-11-20', kiemelt: 0, egyseg: '', ranglista: false, zart: true,
    hosszu: 'Felülnézetes akció-szerepjáték Hajnalrév völgyében. Zárt béta: csak a béta-tesztelők érik el.',
    iranyitas: ['WASD – mozgás', 'Egér – támadás és interakció'] },
  { id: 'locsolo', cim: 'Locsoló Mester', rovid: 'Locsold meg a hervadó virágokat, mielőtt Szikkadt Szilárd kiszárítja a kertet!', kat: 'ugyessegi', cimkek: ['klasszikus', 'reflex', 'egyjátékos'], ikon: '🌻', szin: '#5ee08a', kepek: ['img/arcade/locsolo-1.webp', 'img/arcade/locsolo-2.webp', 'img/arcade/locsolo-3.webp'], statusz: '', hozzaadva: '2026-11-17', kiemelt: 0, egyseg: 'pont', ranglista: true,
    hosszu: 'Az első HGWS-játék: a virágok hervadnak, neked pedig időben meg kell locsolnod mindet, mielőtt Szikkadt Szilárd kiszárítja a kertet.',
    iranyitas: ['Egér vagy érintés – locsolás'] },
  { id: 'nyomas', cim: 'Nyomásmester', rovid: 'Állítsd meg a mutatót a zöld zónában – a PLC rád bízta a szivattyút.', kat: 'ugyessegi', cimkek: ['időzítés', 'reflex', 'egyjátékos'], ikon: '🎛️', szin: '#6cc6ff', kepek: ['img/arcade/nyomas-1.webp', 'img/arcade/nyomas-2.webp', 'img/arcade/nyomas-3.webp'], statusz: '', hozzaadva: '2026-11-17', kiemelt: 0, egyseg: 'pont', ranglista: true,
    hosszu: 'Időzítős ügyességi játék: a nyomásmérő mutatója egyre gyorsabb, a zöld zóna egyre szűkebb. A sorozatos találat szorzót ad, a hibáktól szivárogni kezd az üzem.',
    iranyitas: ['Szóköz, kattintás vagy érintés – a mutató megállítása'] },
  { id: 'csepp', cim: 'Csepp Futam', rovid: 'Repülj át a csövek között egy bátor vízcseppel – egy ütközés és vége!', kat: 'ugyessegi', cimkek: ['klasszikus', 'reflex', 'egyjátékos'], ikon: '💧', szin: '#e8b656', kepek: ['img/arcade/csepp-1.webp', 'img/arcade/csepp-2.webp', 'img/arcade/csepp-3.webp'], statusz: '', hozzaadva: '2026-11-17', kiemelt: 0, egyseg: 'pont', ranglista: true,
    hosszu: 'Tartsd a levegőben a vízcseppet, és vezesd át a csövek közti réseken. Egyetlen ütközés, és vége.',
    iranyitas: ['Szóköz, kattintás vagy érintés – felfelé'] },
  { id: 'ugro', cim: 'Cseppugró', rovid: 'Pattogj levélről levélre egyre magasabbra!', kat: 'ugyessegi', cimkek: ['ugrálós', 'reflex', 'egyjátékos'], ikon: '🫧', szin: '#5ee08a', kepek: ['img/arcade/ugro-1.webp', 'img/arcade/ugro-2.webp', 'img/arcade/ugro-3.webp'], statusz: '', hozzaadva: '2026-11-21', kiemelt: 0, egyseg: 'm', ranglista: true,
    hosszu: 'Végtelen ugrálós: pattogj levélről levélre egyre magasabbra. A száraz levél letörik alattad, a locsolófej viszont messzire fellő.',
    iranyitas: ['Nyilak / A és D vagy döntés – irányítás'] },
  { id: 'viztorony', cim: 'Víztorony', rovid: 'Mássz fel a víztorony tetejére az Arany Locsolófejért!', kat: 'ugyessegi', cimkek: ['platform', 'mászás', 'egyjátékos'], ikon: '🗼', szin: '#b48cff', kepek: ['img/arcade/viztorony-1.webp', 'img/arcade/viztorony-2.webp', 'img/arcade/viztorony-3.webp'], statusz: '', hozzaadva: '2026-11-20', kiemelt: 0, egyseg: 'm', ranglista: true,
    hosszu: 'Platformjáték egyetlen hosszú mászással: juss fel a víztorony tetejére az Arany Locsolófejért. Egy rossz ugrás, és zuhansz.',
    iranyitas: ['Nyilak / WASD – mozgás', 'Szóköz – ugrás'] },
  { id: 'drift', cim: 'Drift Király', rovid: 'Felülnézetes drift-verseny 10 pályán, szellemautókkal és kétjátékos móddal.', kat: 'verseny', cimkek: ['autó', 'drift', 'szellemautó', 'kétjátékos'], ikon: '🏎️', szin: '#ff5a4d', kepek: ['img/arcade/drift-1.webp', 'img/arcade/drift-2.webp', 'img/arcade/drift-3.webp'], statusz: '', hozzaadva: '2026-11-20', kiemelt: 0, egyseg: 'pont', ranglista: true,
    hosszu: 'Felülnézetes drift-verseny 10 pályán. Versenyezz a többiek legjobb köreinek szellemautói ellen, vagy hívj ki valakit kétjátékos módban egy gépen.',
    iranyitas: ['Nyilak / WASD – gáz, fék, kormány', 'Kétjátékos módban a második játékos a másik billentyűkiosztást használja'] },
  { id: 'locsolohaboru', cim: 'Locsolóháború', rovid: 'Első személyű vízipisztoly-aréna 2–8 játékosnak – barátokkal vagy botok ellen.', kat: 'tobbjatekos', cimkek: ['online', 'fps', '3d', 'aréna', 'botok'], ikon: '💦', szin: '#4aa8ff', kepek: ['img/arcade/locsolohaboru-1.webp', 'img/arcade/locsolohaboru-2.webp', 'img/arcade/locsolohaboru-3.webp'], statusz: 'online', hozzaadva: '2026-11-21', kiemelt: 0, egyseg: '', ranglista: false,
    hosszu: 'Első személyű vízipisztoly-csata 2–8 játékosnak. Nyiss szobát a barátaidnak, vagy tölts fel a helyeket botokkal.',
    iranyitas: ['WASD – mozgás, egér – célzás és lövés', 'Szóköz – ugrás'] },
  { id: 'vizagyuio', cim: 'Vízágyú.io', rovid: 'Valós idejű locsolóaréna 2–8 játékosnak – barátokkal vagy botok ellen.', kat: 'tobbjatekos', cimkek: ['online', 'io', 'aréna', 'botok', 'felülnézetes'], ikon: '🔫', szin: '#6cc6ff', kepek: ['img/arcade/vizagyuio-1.webp', 'img/arcade/vizagyuio-2.webp', 'img/arcade/vizagyuio-3.webp'], statusz: 'online', hozzaadva: '2026-11-21', kiemelt: 0, egyseg: '', ranglista: false,
    hosszu: 'Felülnézetes, valós idejű aréna 2–8 játékosnak, több pályával és játékmóddal. Barátokkal szobában, vagy botok ellen gyakorlásként.',
    iranyitas: ['WASD – mozgás', 'Egér – célzás és lövés'] },
  { id: 'zerochip', cim: 'Zero Chip', rovid: 'Építs áramköröket a tranzisztortól a processzorig – 61 küldetés.', kat: 'logikai', cimkek: ['áramkör', 'logika', 'fejtörő', 'egyjátékos'], ikon: '🔌', szin: '#3ecf8e', kepek: ['img/arcade/zerochip-1.webp', 'img/arcade/zerochip-2.webp', 'img/arcade/zerochip-3.webp'], statusz: '', hozzaadva: '2026-11-20', kiemelt: 0, egyseg: '', ranglista: false,
    hosszu: 'Logikai építős játék: 61 küldetésen át jutsz el az egyszerű tranzisztortól a kapukon, összeadókon és memórián keresztül egy működő processzorig.',
    iranyitas: ['Egér – alkatrészek lerakása és huzalozás'] },
  { id: 'zerospace', cim: 'Zero Space Demo', rovid: 'Építs űrhajót modulról modulra, és vezesd csatába.', kat: 'ur', cimkek: ['űrhajó', 'építős', 'sandbox', 'demó'], ikon: '🚀', szin: '#b2382a', kepek: ['img/arcade/zerospace-1.webp', 'img/arcade/zerospace-2.webp', 'img/arcade/zerospace-3.webp'], statusz: 'demo', hozzaadva: '2026-11-20', kiemelt: 0, egyseg: '', ranglista: false,
    hosszu: 'Korai demó: egyjátékos sandbox, amelyben modulról modulra építed meg az űrhajódat, aztán csatába vezeted.',
    iranyitas: ['Egér – építés', 'Az irányítást a játék súgója mutatja'] },
  { id: 'aranylocsolofej', cim: 'Az Arany Locsolófej', rovid: 'Filmes kalandjáték: szerezd vissza az Arany Locsolófejet Szikkadt Szilárdtól!', kat: 'kaland', cimkek: ['történet', 'filmes', 'egyjátékos'], ikon: '🏆', szin: '#e8b656', kepek: ['img/arcade/aranylocsolofej-1.webp', 'img/arcade/aranylocsolofej-2.webp', 'img/arcade/aranylocsolofej-3.webp'], statusz: 'uj', hozzaadva: '2026-11-20', kiemelt: 0, egyseg: '', ranglista: false,
    hosszu: 'Történetvezérelt, filmes kalandjáték a HGWS világában: Szikkadt Szilárd ellopta az Arany Locsolófejet, neked kell visszaszerezned.',
    iranyitas: ['Egér vagy érintés', 'A jeleneteket a játék vezeti'] },
  { id: 'atemelotelep', cim: 'Az Átemelőtelep', rovid: 'Éjszakai ügyelet egy szabotált szennyvízátemelőn – mielőtt túlcsordul a medence.', kat: 'kaland', cimkek: ['3d', 'fejtörő', 'időre', 'plc', 'egyjátékos'], ikon: '🏭', szin: '#e8b656', kepek: ['img/arcade/atemelotelep-1.webp', 'img/arcade/atemelotelep-2.webp', 'img/arcade/atemelotelep-3.webp'], statusz: 'uj', hozzaadva: '2026-11-21', kiemelt: 0, egyseg: '', ranglista: true,
    hosszu: 'Éjszaka van, a telepet szabotálták, a medence telik. Járd be a kapcsolószekrényt, az aknát és az aggregátot, javítsd meg a PLC-programot, mielőtt túlcsordul. A rekord a leggyorsabb teljes idő.',
    iranyitas: ['WASD – mozgás, egér – körülnézés', 'E / kattintás – interakció'] }
];
