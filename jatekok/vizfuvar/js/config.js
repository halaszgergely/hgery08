/* HGWS Vízfuvar – állandók, járművek, gazdaság. Koordináták: a Légi Öntözés országos vetülete (méter; x kelet, z dél, y fel). */
export const GAME = 'vizfuvar';
export const SZIN = { sarga: 0xf2c230, zold: 0x2f9e4f, kek: 0x2aa7d9, feher: 0xf3f1ea, sotet: 0x2a2f36, fem: 0x9aa3ad, krom: 0xd9dde2, piros: 0xd9413a, fekete: 0x15181c, gumi: 0x1b1c1e };
export const BALLON_KG = 20.5;   // egy 20 literes ballon tömege (víz + palack)

/* Járművek. fiz: 'moped' (saját kétkerekű) | 'auto' (raycast kerekes).
   Motor: nyomatékgörbe [ford/perc, Nm], áttételek, főáttétel; fék: maximális fékerő tengelyenként (N); kormány: max. szög (rad) és sebesség (rad/s).
   A gyári színek a korhű választék; az első szín a HGWS fényezés. */
export const JARMUVEK = [
  { id: 'babetto', nev: 'Babettó', tipus: 'Moped', ag: 'retro', ar: 0, kezdo: 1, fiz: 'moped', tomeg: 46, ballon: 1, tank: 3.5, fogy: 2.0, keverek: 1,
    teljesitmeny: 1300, vmax: 40 / 3.6, leiras: 'Jawa Babetta jellegű kétütemű moped. A csomagtartón egyetlen ballon fér el. Emelkedőn segíts pedálozással!',
    szinek: [['HGWS', 0xf2c230, 0x2f9e4f], ['Piros', 0xb8322b, 0xe9e2d2], ['Kék', 0x2f5f9e, 0xe9e2d2], ['Zöld', 0x3e7a3a, 0xe9e2d2]] },
  { id: 'rigo', nev: 'Rigó-13', tipus: 'Moped', ag: 'retro', ar: 0, kezdo: 1, fiz: 'moped', tomeg: 52, ballon: 2, tank: 4.5, fogy: 2.2, keverek: 1,
    teljesitmeny: 1200, vmax: 38 / 3.6, leiras: 'Riga jellegű moped kis oldalkosárral: két ballon fér rá. Kicsit lassabb, de stabilabb.',
    szinek: [['HGWS', 0xf2c230, 0x2f9e4f], ['Bordó', 0x7a2430, 0xd8d2c2], ['Világoskék', 0x6fa3c8, 0xd8d2c2], ['Narancs', 0xd9762b, 0xd8d2c2]] },
  { id: 'trabo', nev: 'Trabó 601', tipus: 'Személyautó', ag: 'retro', ar: 85000, fiz: 'auto', tomeg: 615, ballon: 12, tank: 24, fogy: 7.2, keverek: 1,
    leiras: 'Trabant jellegű kétütemű kisautó: ballonok a hátsó ülésen és a csomagtartóban. Rugózik a tehertől, gyengén fékez, nincs szervókormány.',
    meret: [1.5, 1.44, 3.56], tengelytav: 2.02, nyomtav: 1.22, kerekR: .28, sulypont: .52,
    motor: { gorbe: [[800, 30], [1500, 42], [2500, 52], [3000, 54], [3800, 50], [4200, 45], [4700, 30]], alap: 850, piros: 4600, gears: [4.08, 2.32, 1.52, 1.103], hatra: 3.83, fo: 4.33, kezi: 1, hajt: 'elso', motorfek: 18 },
    fek: { max: 5200, elso: .62, abs: 0, kezifek: 2400 }, kormany: { max: .58, seb: 1.6, szervo: 0 }, rugo: { frek: 1.25, csill: .32, ut: .2 }, gumi: { mu: .95 }, legellenallas: .5 * 1.2 * .5 * 1.8,
    szinek: [['HGWS', 0xf2c230, 0x2f9e4f], ['Papyrusweiß', 0xe8e2cf, 0xe8e2cf], ['Delfinkék', 0x6f93b5, 0xe8e2cf], ['Tundragrün', 0x7f8f63, 0xe8e2cf], ['Bordó', 0x7a2430, 0xe8e2cf]] },
];
export const JARMU = Object.fromEntries(JARMUVEK.map(j => [j.id, j]));

/* Gazdaság (Ft) */
export const GAZD = {
  kezdoPenz: 3000,
  ballonAr: 120,              // a telephelyen egy ballon töltése
  benzinAr: 620, keverekFelar: 40,   // Ft/l; a kétüteműhöz olaj is kell a keverékhez
  fuvarAlap: 650, fuvarKm: 260, fuvarBallon: 520,   // díj: alap + km·tarifa + ballononként
  keses: .35, serules: .5,   // levonások aránya
  elsoFuvar: 2500,
};
/* a fizika rögzített időlépése */
export const DT = 1 / 120;
