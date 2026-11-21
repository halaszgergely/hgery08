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
| `js/bo-data.js`, `js/bo.js`, `js/bo-ui.js`, `css/bo.css` | Öntöző Birodalom Online (`#/birodalom`): adatok + szimuláció, Firestore-műveletek, felület |
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

## Öntöző Birodalom Online

Közös, régiókra osztott világ (`#/birodalom`). A telek a kliensen szimulálódik (`js/bo-data.js`), a Firestore csak az eredményt tárolja:
`bo/{szezon}` (világ), `bo/{szezon}/players|regions|deals|coops|votes`, `bohall/{szezon}`. A szezon az UTC naptári hónap.

- A `firestore.rules` „Öntöző Birodalom Online” szakaszának számai (korlátok, árak, élek) a `js/bo-data.js` táblázataival egyeznek – együtt kell módosítani.
- Szabályteszt: `firebase emulators:exec --only firestore --project demo-hgws "node tools/birodalomteszt.mjs"`
- Szezonzáráskor a „Vízmester” nevű taget kapják a legjobbak, ha létezik ilyen tag (Kezelés → Tagek).
