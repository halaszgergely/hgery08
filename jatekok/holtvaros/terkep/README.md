# Holtváros – nyers térképadat

Magyarország OpenStreetMap-kivonata: `hungary-261119.osm.pbf` (forrás: download.geofabrik.de, © OpenStreetMap-közreműködők, ODbL).

A GitHub 100 MB-os fájlkorlátja miatt 4 részben van itt (`.part1` … `.part4`, egyenként kb. 79 MB).
Összefűzés: `python3 tools/terkep_osszefuz.py` (ellenőrzőösszeggel), vagy kézzel: `cat hungary-261119.osm.pbf.part1 … part4 > hungary-261119.osm.pbf`.
Az összefűzött fájl nincs a repóban (`.gitignore`).

A játék nem ezt tölti be: a `tools/holtvaros_terkep.py` készít belőle kicsi, játékba való adatot (`jatekok/holtvaros/terkepadat.js`).
