# Holtváros – térképadat

A játék térképei Magyarország OpenStreetMap-kivonatából készülnek (© OpenStreetMap-közreműködők, ODbL; forrás: download.geofabrik.de).

| Fájl | Mi ez |
|---|---|
| `megyek.js` | országos áttekintő: vármegyehatárok és székhelyek (a megyeválasztó képernyő) |
| `<megye>.json` | áttekintő rétegek: határ, vizek, erdők, parkok, főutak, vasút, települések, beépítettség |
| `<megye>.bin` | a vármegye teljes úthálózata 2048 m-es csempékben (a játék ezt tölti le megyeválasztáskor) |
| `hungary-261119.osm.pbf.part1…4` | a nyers OSM-kivonat 4 részben (a GitHub 100 MB-os fájlkorlátja miatt) |

Újragenerálás:

```
python3 tools/terkep_osszefuz.py        # a 4 részből összefűzi a .osm.pbf-et (nem kerül a repóba)
python3 tools/holtvaros_terkep.py       # kb. 6 perc; csak numpy és PIL kell hozzá
```
