#!/usr/bin/env python3
"""A darabokra bontott OSM-térkép összefűzése (a GitHub 100 MB-os fájlkorlátja miatt van 4 részben).
Futtatás:  python3 tools/terkep_osszefuz.py   →  jatekok/holtvaros/terkep/hungary-261119.osm.pbf"""
import hashlib, pathlib
d = pathlib.Path(__file__).resolve().parent.parent / 'jatekok' / 'holtvaros' / 'terkep'
nev, sha = 'hungary-261119.osm.pbf', '4f6a9761144390d900a88d260773a7700d2bf044c2194bf9a240686d52e3dae3'
reszek = sorted(d.glob(nev + '.part*'), key=lambda p: int(p.suffix[5:]))
h = hashlib.sha256()
with open(d / nev, 'wb') as out:
    for p in reszek:
        b = p.read_bytes(); h.update(b); out.write(b)
print(len(reszek), 'rész →', d / nev, '· ellenőrzőösszeg', 'RENDBEN' if h.hexdigest() == sha else 'HIBÁS!')
