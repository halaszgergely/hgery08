# HGWS – Halász Gergely Watering Solutions

Statikus oldal (GitHub Pages + Cloudflare), háttér: Firebase (`hgws-7629e`).

## Mappaszerkezet

| Hely | Mi van benne |
|---|---|
| `index.html`, `app.html`, `belepes.html`, `admin.html` | a közösségi oldal belépési pontjai |
| `arcade.html` | a HGWS Arcade (az oldal iframe-ben tölti be) |
| `404.html`, `offline.html`, `sw.js`, `manifest.webmanifest` | hibaoldal, offline oldal, telepíthető alkalmazás |
| `css/`, `img/` | stílusok, ikonok, logók, matricák |
| `js/` | a közösségi oldal moduljai (chat, profil, admin, Firebase…) |
| `jatekok/` | az Arcade játékai, mindegyik a saját mappájában |
| `jatekok/arcade/` | az Arcade közös kerete (`mag.js`) és a játéklista, ranglista (`arcade.js`) |
| `jatekok/holtvaros/terkep/` | a Holtváros térképei vármegyénként (OpenStreetMap-ból generálva) és a nyers OSM-kivonat 4 részben |
| `oldalak/` | önálló oldalak (Ma miért igyál?, vizsgagyakorló) |
| `adat/` | kezdő adatok (filmlista) |
| `zene/` | feltöltött mp3-ak (az admin innen listázza) |
| `tools/` | segédszkriptek: verziózás, matricák, térképadat, szabályteszt |
| `firestore.rules` | adatbázis-szabályok – módosítás után a Firebase Console-ban is közzé kell tenni |

## Minden módosítás után

```
python3 tools/verzio.py
```

Ez frissíti a `?v=` verziót a CSS/JS hivatkozások mögött, hogy a böngésző ne a régi fájlt adja.
