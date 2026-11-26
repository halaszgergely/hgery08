# HGWS: Locsoló Város

Nyitott világú, harmadik személyű akciójáték egy kitalált, Miskolc ihlette városban. Halász Gergelyként, a HGWS (Halász Gergely Watering Solutions) vezetőjeként kell megállítanod Szilárdot, aki a város vizét és az Arany Locsolófejet akarja. A fegyverek mind vízfegyverek, vér nincs: aki eltalálod, elázik, elesik, feláll és elfut.

Böngészőben fut, buildelés nélkül (ES modulok, three.js r170, import map). GitHub Pages-en közvetlenül kiszolgálható.

## Indítás

- Élesben: `jatekok/locsolovaros/index.html`, vagy az Arcade-ban a „HGWS: Locsoló Város” kártya.
- Helyben: a repó gyökeréből `python3 -m http.server`, majd `http://localhost:8000/jatekok/locsolovaros/`.
- A `?lassu` paraméter nagyobb időlépést enged nagyon gyenge gépen (szoftveres renderelés).

## Irányítás

| Művelet | Billentyűzet / egér | Gamepad |
|---|---|---|
| Mozgás, vezetés | W A S D | bal kar, RT / LT |
| Kamera | egér | jobb kar |
| Futás / kézifék | Shift / Szóköz | A |
| Ugrás | Szóköz | X |
| Be- és kiszállás | F | Y |
| Cselekvés (küldetés, vásárlás, szerviz) | E | B gyalog, X járműben |
| Tüzelés / célzás | bal / jobb egérgomb | RT / LT |
| Fegyverkerék | Tab (nyomva) | LB (nyomva) |
| Fegyverváltás | 1–6, görgő | D-pad ← → |
| Rádióadó | Q / E (járműben) | D-pad ← → |
| Kürt / sziréna | H | B |
| Fényszóró | L | – |
| Helikopter emelkedés / süllyedés | Szóköz / Shift | RB / LB |
| Helikopter oldalazás | Q / E | jobb kar |
| Térkép (zoom: görgő, útpont: kattintás) | M | Back |
| Telefon | ↑ | D-pad ↑ |
| Kamera-távolság | C | R3 |
| Szünet | Esc | Start |
| Teljes képernyő | F11 vagy a menü | – |

Fejlesztői menü: ↑ ↑ ↓ ↓ ← → ← → B A. Repülés, isten mód, körözés tiltása, jármű lehívása, időjárás, napszak, teleport. Az aktiválás után a mentés a munkamenet végéig kikapcsol, ezt egy piros felirat jelzi.

## Tartalom

- **Város:** 16 × 16 tömb (1,6 × 1,6 km): Belváros a Városházával, panelnegyed, ipari zóna két szennyvízátemelővel és Szilárd raktárával, Avas-domb kilátóval, Sajó-part négy híddal, kertváros (kerítéses házak, medencék), autópálya lehajtóval. HGWS-központ garázzsal, irodával, helipaddal és az Arany Locsolófej szobrával a tetőn.
- **Élő város:** járókelők a járdahálózaton (zebrán kelnek át), forgalom sávkövetéssel és működő jelzőlámpákkal, Ikarus buszok, két villamos a Fő utcán megállókkal.
- **Járművek:** Trabant 601, Lada 1200 (taxi is), Wartburg 353, Babetta, Riga moped, Ikarus 260, IFA W50, Kamaz, modern autó, HGWS szervizkisbusz, HGWS locsolókocsi (fecskendővel), Ka-26 helikopter a garázs tetején, titkos vízágyús tank. Horpadás, berepedő szélvédő, füst, tűz, robbanás.
- **Fegyverek:** vízpisztoly, locsolótömlő, vízbomba, öntözőpuska, vízágyú.
- **Körözés:** 1–5 csillag. A Vízügyi Ellenőrzés autókkal üldöz, gyalog is lekapcsol. 3 csillagtól útzár, 4-től helikopter keresőfénnyel, 5-nél vízágyús páncélautók. Ha egyik egység sem lát, a csillagok egyenként elfogynak. A Locsolófej Szervizben átfestéssel eltűnik a körözés.
- **Történet:** 8 fő küldetés átvezető jelenetekkel (kameramozgás és feliratok): Első munkanap, Kiszáradt kertek, Csőtörés a piacon, Átemelő-szabotázs, Futár az Avasról, Légi felderítés, Raktárbetörés, Az Arany Locsolófej.
- **Mellékmunkák:** taxi (bármelyik taxiban), HGWS-kiszállítás (medencetöltés, kertlocsolás időre), utcai verseny 3 ellenféllel, 8 kaszkadőrugrató.
- **Gazdaság:** 4 megvásárolható ingatlan napi bevétellel és garázzsal, tuning (motor, fék, gumi, páncél), HGWS Banki App a telefonon.
- **ZERO-titok:** egy graffiti a panelnegyed egyik tetején. A ház oldalán rámpa visz fel.
- **Kezelőfelület:** forgó minitérkép útvonallal, élet- és páncélcsík, pénz, csillagok, nagy térkép, telefon (küldetések, névjegyek, bank, statisztika, rádió), főmenü HGWS STUDIOS intróval, beállítások, irányítás.
- **Rádió:** három procedurális adó (Retró Rádió 87.6, Sajó FM 94.2, Ipari Hullám 101.5) generált dalokkal és szöveges reklámokkal.
- **Mentés:** automatikus, a böngésző localStorage-ába: pénz, küldetések, ingatlanok, garázsok, fegyverek, ugratók, statisztika.

## Grafika

PBR anyagok, környezeti tükröződés (napszakhoz igazított PMREM), napszakciklus csillagokkal és holddal, köd, eső, bloom, választható SSAO (GTAO). Árnyék: a kamerát követő, rácshoz igazított irányított fény (nem villódzik). Minőség: Alacsony / Közepes / Magas, ez a felbontást, az árnyékot, a részletességi távolságot és a forgalom sűrűségét állítja.

Teljesítmény:
- A város tömbönként épül fel a játékos körül.
- A távoli tömbök egyetlen összevont hálóban vannak, ablakmintás árnyalóval; a láthatóságot adattextúra vezérli, így egy rajzolási hívás az egész.
- Az utcabútor és a járókelők példányosítva (instancing) rajzolódnak.
- A járműhálók anyagonként össze vannak vonva.
- Frustum culling.

## Felépítés

```
index.html          import map (three → ../atemelotelep/lib/three.module.min.js), vászon, UI-gyökér
ui.css              a kezelőfelület stílusa
lib/addons/         three.js r170 kiegészítők (utófeldolgozás, BufferGeometryUtils, SimplexNoise)
src/main.js         főciklus, összekötés, mentés, be- és kiszállás, robbanás, halál / elkapás
src/world.js        a város adatai: domborzat, folyó, utak, kereszteződések, lámpafázisok, épületek, ütközők, rámpák, A* útkeresés
src/city.js         megjelenítés: domborzat, utak, járdák, hidak, épülethomlokzatok, tetők, LOD, utcabútor, jelzőlámpák
src/textures.js     procedurális textúrák (homlokzatok éjszakai ablakokkal, aszfalt, burkolat, tábla, graffiti)
src/render.js       renderer, ég, nap / hold, köd, eső, bloom, GTAO, minőségi szintek
src/vehicles.js     járműadatok és procedurális modellek, horpadás
src/physics.js      saját járműfizika (autó, moped, helikopter, tank), ütközések, sérülés
src/traffic.js      forgalmi AI, sávok, lámpák, villamos, „vezess oda” AI
src/npc.js          példányosított járókelők
src/actors.js       teljes modellű szereplők (rendőr, verőember, történeti alakok)
src/player.js       emberalak-modell és animáció, gyalogos irányítás
src/weapons.js      vízfegyverek, lövedékek találata
src/fx.js           részecskék (víz, füst, tűz, szikra)
src/wanted.js       körözés és a Vízügyi Ellenőrzés
src/missions.js     küldetésmotor, jelölők, a 8 fő küldetés
src/jobs.js         mellékmunkák, ingatlanok, garázsok, szerviz, ugratók, ZERO
src/ui.js           HUD, minitérkép, térkép, telefon, fegyverkerék, menük, intró
src/cine.js         követő kamera és átvezető jelenetek
src/audio.js        hangeffektek és procedurális rádió
src/input.js        billentyűzet, egér, gamepad, Konami-kód
src/dev.js          fejlesztői menü
```

## Eltérések a specifikációtól

- **Rapier helyett saját fizika.** A fejlesztőkörnyezet nem érte el a csomagregisztert és a CDN-eket, a Rapier WASM-fájlja pedig nincs a repóban. Ezért a fizika saját kód: autómodell tapadási határral és sodródással, ballisztikus ugrás, impulzusos ütközés jármű–jármű és jármű–épület között, moped dőléssel, helikopter, lánctalpas tank. Külső függőség és nagy fájl nem került be.
- **Kaszkádolt árnyék (CSM) helyett egy kaszkád.** A three.js r170 kiegészítők között, amelyek elérhetők voltak, nincs CSM. Helyette egy, a kamerát követő és a rácshoz igazított árnyékkaszkád van, a felbontása a minőségtől függ (1024 vagy 2048).
- **Nincs külső modell.** Minden jármű, épület és alak kódból készül; a részletek a CREDITS.md-ben.
