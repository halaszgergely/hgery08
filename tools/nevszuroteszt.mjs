// Névszűrő teszt: node tools/nevszuroteszt.mjs            (csak a böngészős szűrő)
//                 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node tools/nevszuroteszt.mjs --rules   (+ a firestore.rules is, emulátorral)
import { badHit } from '../js/nevszuro.js';

export const BAD = [
  'kurva', 'Kurva Béla', 'KURV4', 'k.u.r.v.a', 'kuuurva', 'qrva', 'qurva', 'kurwa', 'kúrva', 'kurvaanyád', 'kurvány',
  'fasz', 'F.a.S.z', 'f4sz', 'fa$z', 'faszom', 'faszkalap', 'phasz', 'fasssz', 'xXfaszXx', 'fasz123', 'f a s z', 'Nagy Fasz',
  'geci', 'GECIII', 'g3ci', 'geczi', 'gecis', 'picsa', 'picsába', 'pi.csa', 'punci', 'punc1', 'pina', 'pinás', 'Pina',
  'buzi', 'b u z i', 'buzeráns', 'köcsög', 'kocsog', 'k0cs0g', 'Köcsög Kft', 'segg', 'seggfej', 's3ggfej', 'segglyuk',
  'bazmeg', 'bazdmeg', 'b4zmeg', 'baszd meg', 'baszódj', 'baszki', 'basszam', 'kibaszott', 'elbaszta',
  'szarházi', 'szarfej', 'kutyaszar', 'anyád', 'anyádat', 'anyádba', 'ribanc', 'lotyó', 'ringyó', 'szajha', 'rohadék',
  'csicska', 'szopó', 'szopjál', 'leszopom', 'pöcs', 'pöcsfej', 'Füty Imre', 'fütyi', 'cigány', 'cigó', 'néger', 'nigger',
  'n1gg3r', 'nigga', 'n1gga', 'zsidózó', 'hitler', 'Hitler', 'Adolf Hitler', 'pedofil', 'pedo', 'náci', 'nazi', 'strici',
  'prosti', 'maszturbál', 'rejszol', 'húgyos', 'retardált', 'kefél', 'megdugom', 'heregolyó', 'tökfej', 'csöcs', 'cici',
  'fuck', 'Fuck_you', 'fvck', 'f u c k', 'FuCk', 'phuck', 'fuk', 'fck', 'fuq', 'shit', 'sh1t', 'sh!t', 'shiiit', 'bitch',
  'b1tch', 'biatch', 'cunt', 'whore', 'slut', 'pussy', 'asshole', 'dickhead', 'cock', 'cocksucker', 'faggot', 'fag',
  'motherfucker', 'porn', 'pornó', 'penis', 'pénisz', 'vagina', 'boobs', 'tits', 'titties', 'wanker', 'bastard', 'cum',
  'anal', 'rape', 'rapist', 'sex', 'sexy', 'szex', 'nude', 'milf', 'hentai', 'kkk', 'kys', 'killyourself', 'blowjob',
  'jizz', 'dildo', 'kurwa', 'blyat', 'cyka', 'pizda', 'scheisse', 'arschloch', 'hurensohn', 'putain', 'puta', 'mierda',
  // karaktertrükkök
  'kurvа', 'ｋｕｒｖａ', 'k​urva', 'Hgery‮', 'admin<script>', 'Иван', 'kurva 🐱', '🐱fasz🐱',
];
export const GOOD = [
  // a mostani tagok
  'Latinpapucs', 'The Final Boss', 'Barta Ádám Adrián', 'Zero Armageddon', 'Vitéz Gróf Dr. Öntöző Zsolt', 'Bálint Gombos',
  'Locsoló Botond', 'Borbély Zalán', 'Halász Gergely', 'oli', 'Hgery', 'Tag-bzKz3',
  // gyakori magyar vezeték- és keresztnevek
  'Nagy', 'Kovács', 'Tóth', 'Szabó', 'Horváth', 'Varga', 'Kiss', 'Molnár', 'Németh', 'Farkas', 'Balogh', 'Papp', 'Takács',
  'Juhász', 'Lakatos', 'Mészáros', 'Oláh', 'Simon', 'Rácz', 'Fekete', 'Szilágyi', 'Török', 'Fehér', 'Balázs', 'Gál', 'Kis',
  'Szűcs', 'Kocsis', 'Orsós', 'Pintér', 'Fodor', 'Szalai', 'Sipos', 'Magyar', 'Lukács', 'Gulyás', 'Biró', 'Király', 'Katona',
  'László', 'Jakab', 'Bogdán', 'Balog', 'Sándor', 'Boros', 'Fazekas', 'Kelemen', 'Antal', 'Orosz', 'Somogyi', 'Fülöp', 'Veres',
  'Budai', 'Vincze', 'Hegedűs', 'Deák', 'Pap', 'Bálint', 'Illés', 'Pál', 'Vass', 'Szőke', 'Fábián', 'Vörös', 'Lengyel', 'Bognár',
  'Bodnár', 'Jónás', 'Szücs', 'Hajdu', 'Halász', 'Máté', 'Székely', 'Gáspár', 'Kozma', 'Pásztor', 'Bakos', 'Dudás', 'Major',
  'Orbán', 'Hegyi', 'Virág', 'Barna', 'Novák', 'Soós', 'Tamás', 'Nemes', 'Pataki', 'Balla', 'Faragó', 'Kerekes', 'Borsos', 'Lázár',
  'Péter', 'Szekeres', 'Barta', 'Csonka', 'Mező', 'Szarka', 'Szarvas', 'Szarvas Péter', 'Geczy Zoltán', 'Gecse', 'Buzás', 'Buzsáki',
  'Bencze', 'Szántó', 'Buzinkai', 'Pöcze', 'Fehérvári', 'Kurucz', 'Kurtág', 'Csicsó', 'Szép', 'Pongrácz', 'Pusztai', 'Segesdi',
  'Bence', 'Máté', 'Levente', 'Dominik', 'Ádám', 'Dániel', 'Marcell', 'Olivér', 'Noel', 'Botond', 'Zalán', 'Milán', 'Benett',
  'Áron', 'Gergő', 'Gergely', 'Zsolt', 'Imre', 'Ferenc', 'Attila', 'Csaba', 'Hanna', 'Anna', 'Zoé', 'Luca', 'Léna', 'Emma', 'Lili',
  'Boglárka', 'Zsófia', 'Jázmin', 'Nóra', 'Dorina', 'Fanni', 'Réka', 'Petra', 'Dóra', 'Kitti', 'Kitty', 'Ghzer', 'Zero',
  // települések, szavak, amik közel vannak valamihez
  'Pornóapáti', 'Segesvár', 'Szeged', 'Debrecen', 'Szekszárd', 'Pécs', 'Tokaj', 'Putnok', 'Fót', 'Fonyód', 'Sukoró', 'Kunszállás',
  'Baszk', 'Basszus', 'Basszusgitáros', 'Szaros', 'Bassza', 'Pinatubo', 'Agrippina', 'Spinach', 'Szoprán', 'Cigaretta', 'Cigányzene',
  'Kaktusz', 'Locsolómester', 'Arany Locsolófej', 'Szikkadt Szilárd', 'Fosszília', 'Foszfor', 'Analóg', 'Kanalas', 'Fukuda',
  'Fukushima', 'Tetuan', 'Majomka', 'Paraszt Péter', 'Retardáló', 'Kurvenbauer', 'Titsch', 'Csöcsike', 'Picasso', 'Pisti',
  'Puttony', 'Kukorica', 'Kukac', 'Pocsolya', 'Hugó', 'Didier', 'Nacionál', 'Szukics', 'Anyag', 'Anyu', 'Anyós',
  // angol
  'Dickens', 'Hancock', 'Peacock', 'Cocktail', 'Cockpit', 'Assassin', 'Passion', 'Scunthorpe', 'Sussex', 'Essex', 'Shitake',
  'Penistone', 'Arsenal', 'Analysis', 'Grapefruit', 'Therapist', 'Sextant', 'Classic', 'Cucumber', 'Document', 'Basement',
  'Shift', 'Shirt', 'Michael', 'Dick Smith', 'Titan', 'Fukuoka', 'Pussycat Dolls', 'Bassist', 'Sniper', 'Kitten', 'Hunter',
  // gamer stílus
  '🐱', 'Cica 🐱', '🇭🇺 Magyar', '👨‍👩‍👧 Család', 'név😀', '🔥Zero🔥', '😀', '👍🏽 Béla', '★Zero★', 'xXSniperXx', 'Pro_Gamer_2008', 'Locsolo-Kiraly', "O'Brien", 'Dr. Víz', 'Gamer99', 'Ádám_07', 'ZeroSpace', 'MLG-Pro',
];

const fail = [];
for (const n of BAD) if (!badHit(n)) fail.push('ÁTCSÚSZOTT: ' + JSON.stringify(n));
for (const n of GOOD) { const h = badHit(n); if (h) fail.push(`TÉVESEN TILTOTT: ${n}  (${h})`); }
console.log(fail.join('\n') || 'kliens: minden rendben');
console.log(`kliens: ${BAD.length + GOOD.length - fail.length}/${BAD.length + GOOD.length}`);

if (process.argv.includes('--rules')) {
  const { readFileSync } = await import('node:fs');
  const { initializeTestEnvironment } = await import('@firebase/rules-unit-testing');
  const { doc, setDoc } = await import('firebase/firestore');
  const env = await initializeTestEnvironment({ projectId: 'demo-nev', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
  await env.clearFirestore();
  let i = 0; const rf = [];
  const tryName = async n => { const id = 'u' + (i++); try { await setDoc(doc(env.authenticatedContext(id, { email_verified: true }).firestore(), 'users', id), { name: n, nameLower: n.toLowerCase(), role: 'user', banned: false }); return true; } catch { return false; } };
  // a szabály sosem lehet szigorúbb a kliensnél: amit a kliens enged, azt a szabály is engedje
  const RESERVED = ['Halász Gergely', 'Hgery'];   // ezeket a tulaj fenntartott neve (reservedName) tiltja, nem a szűrő
  for (const n of GOOD) if (n.length <= 32 && !RESERVED.includes(n) && !(await tryName(n))) rf.push('SZABÁLY TÉVESEN TILT: ' + n);
  // amit a kliens tilt, azt a szabály lehetőleg szintén tiltsa (kivétel: egybetűs szavak összevonása, pl. „f u c k”)
  const merged = n => /(^|[^a-z])[a-z]([^a-z]+[a-z])+([^a-z]|$)/i.test(n);
  for (const n of BAD) if (!merged(n) && await tryName(n)) rf.push('SZABÁLY ÁTENGEDI: ' + JSON.stringify(n));
  console.log(rf.join('\n') || 'szabályok: minden rendben');
  await env.cleanup(); if (rf.length) fail.push(...rf);
}
process.exit(fail.length ? 1 : 0);
