# HGWS Vízfuvar – készítők, források, licencek

## Térkép és domborzat
- Úthálózat, épületek, vizek, helynevek: © OpenStreetMap-közreműködők, ODbL – a Holtváros vármegyei térképeiből (`jatekok/holtvaros/terkep`).
- Domborzat: Viewfinder Panoramas 3" (J. de Ferranti) – `jatekok/legiontozes/dem`; a határon túl AWS Terrain Tiles (Mapzen; SRTM, GMTED és mások).
- A fuvarcélok, a telephely és a benzinkutak helye: `tools/vizfuvar_celok.py` számolja az OSM-adatokból (`adat/celok.json`).

## 3D modellek
Jelenleg minden modell a játék saját, kódból épített **ideiglenes** modellje (licencgond nélkül):
Babettó, Rigó-13, Trabó 601, motoros figura, 20 literes ballon, a miskolci telephely épületei, benzinkút.
A beszerzendő glTF-modellek listája és a keresőszavak: `assets/manifest.json` → `hianyzik`.

## Rádió
Az állomáslista: `radio/allomasok.json`. Ha egy állomásnak van `stream` címe, a forrásállomás élő adása szól, a nevével és honlapjával feltüntetve.
Üres `stream` esetén a játék saját, a böngészőben generált zenét játszik az állomás stílusában (jogvédett felvétel nélkül).
A Locsoló Info műsora (hírek, reklámok, Csöpi bácsi meséi) saját, kitalált szöveg; felolvasás a böngésző magyar beszédhangjával.

## Hangok
Motor, duda, index, víz, csattanás: Web Audióval, a böngészőben előállítva.

Minden jármű, cég és szereplő kitalált; a valódi járművekre csak a formájuk és a hangulatuk utal, márkanév és logó nélkül.
