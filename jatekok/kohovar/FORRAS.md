# Kohóvár – forrás és licenc

A Kohóvár a [Mindustry](https://github.com/Anuken/Mindustry) (© Anuke és közreműködők) alapján készült játék.
Az eredeti játék: https://store.steampowered.com/app/1127400/Mindustry/

## Licenc

Ez a mappa (`jatekok/kohovar/`) a **GNU General Public License 3-as verziója** alatt áll – lásd a `LICENSE` fájlt.

## Mi származik a Mindustryból

- `kepek/atlasz.png`, `kepek/atlasz.json`: a Mindustry nyers sprite-jai (`core/assets-raw/sprites`, 19a0f40 commit, 2026-11-18),
  egy atlaszba csomagolva (2026-11-26). Módosítások: a tornyok fejei, az egységek és a fegyverek körvonalat kaptak (a Mindustry saját
  csomagolója is ezt teszi), a szektorikonok 64×64-re kicsinyítve. A csomagoló: `eszkoz/pack.py`.
- `kepek/ui/*.png`, `kepek/betu.woff`, `kepek/ikon.woff`: a Mindustry kezelőfelületének 9-patch keretei (a vezetővonalak levágva),
  betűtípusa (`core/assets/fonts/font.woff`, a latin és magyar karakterekre szűkítve) és ikonbetűkészlete (`icon.ttf`, a felhasznált ikonokra szűkítve, márkajelzések nélkül).
  Előállító: `eszkoz/ui.py`. A menük és párbeszédablakok elrendezése a Mindustry `ui/` forrását követi (saját HTML/CSS megvalósítás).
- Számértékek és szerkezet: a blokkok, tornyok, egységek adatai, a kutatási fa és az alap hullámtábla a Mindustry
  forrásának adatait követik (`adat.js`).

- A térképgenerátor (`terkep.js`) a Mindustry `SerpuloPlanetGenerator` lépéseit követi (ridged zaj, sejtautomata, termek és A*-utak, folyók, zajalapú ércek, medián simítás); a kód saját.
- A modbetöltő (`modok.js`) a Mindustry modformátumát (mod.hjson, content/, sprites/, bundles/) olvassa és a Kohóvár blokkfajtáira fordítja;
  a modok JSON-ban megadott bolygóit és szektorait (content/planets, content/sectors, maps/*.msav) is betölti.
- `palyak/serpulo/*.msav`: a Mindustry Serpulo-hadjáratának eredeti pályái (`core/assets/maps/serpulo`, változatlanul).
- `palyak/serpulo.json`: a bolygórács (a `PlanetGrid` algoritmusával 3-as szinten előállítva), a szektorok adatai (`SectorPresets`),
  a technológiafa (`SerpuloTechTree`) és a hadjárat szövegei a Mindustry magyar (és angol) nyelvi fájljából (`bundle_hu.properties`).
  Előállító: `eszkoz/serpulo.py`.
- A pályaolvasó (`msav.js`) a Mindustry mentésformátumát (`SaveVersion`, `MapIO`) olvassa; a célkitűzések (`logika.js`) a `MapObjectives`,
  a világprocesszorok értelmezője az mlog utasításkészlet (`LExecutor`) viselkedését követi. A kód saját.

## Mi saját

A játék teljes programkódja (`*.js`, `index.html`) saját, nulláról írt megvalósítás; a Mindustry kódjából nem tartalmaz részletet.
A felfedezési köd, a lövedékek és hatások rajza és a kezelőfelület saját munka.
A forráskód ebben a mappában olvasható formában érhető el, és a GPLv3 feltételei szerint szabadon továbbadható és módosítható.
