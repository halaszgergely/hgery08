# Kohóvár – forrás és licenc

A Kohóvár a [Mindustry](https://github.com/Anuken/Mindustry) (© Anuke és közreműködők) alapján készült játék.
Az eredeti játék: https://store.steampowered.com/app/1127400/Mindustry/

## Licenc

Ez a mappa (`jatekok/kohovar/`) a **GNU General Public License 3-as verziója** alatt áll – lásd a `LICENSE` fájlt.

## Mi származik a Mindustryból

- `kepek/atlasz.png`, `kepek/atlasz.json`: a Mindustry nyers sprite-jai (`core/assets-raw/sprites`, 19a0f40 commit, 2026-11-18),
  egy atlaszba csomagolva (2026-11-26). Módosítások: a tornyok fejei, az egységek és a fegyverek körvonalat kaptak (a Mindustry saját
  csomagolója is ezt teszi), a szektorikonok 64×64-re kicsinyítve. A csomagoló: `eszkoz/pack.py`.
- Számértékek és szerkezet: a blokkok, tornyok, egységek adatai, a kutatási fa és az alap hullámtábla a Mindustry
  forrásának adatait követik (`adat.js`).

- A térképgenerátor (`terkep.js`) a Mindustry `SerpuloPlanetGenerator` lépéseit követi (ridged zaj, sejtautomata, termek és A*-utak, folyók, zajalapú ércek, medián simítás); a kód saját.
- A modbetöltő (`modok.js`) a Mindustry modformátumát (mod.hjson, content/, sprites/, bundles/) olvassa és a Kohóvár blokkfajtáira fordítja.

## Mi saját

A játék teljes programkódja (`*.js`, `index.html`) saját, nulláról írt megvalósítás; a Mindustry kódjából nem tartalmaz részletet.
A felfedezési köd, a lövedékek és hatások rajza, a kezelőfelület és a kampány szektorai saját munka.
A forráskód ebben a mappában olvasható formában érhető el, és a GPLv3 feltételei szerint szabadon továbbadható és módosítható.
