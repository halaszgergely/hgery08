// HGWS – trágár / sértő felhasználónevek szűrője.
// FONTOS: ha a listákat módosítod, futtasd:  node tools/nevszuro.mjs   (ez a firestore.rules-ba is beírja ugyanezt),
// utána:  node tools/nevszuroteszt.mjs   (jó és rossz nevek tesztje), és tedd közzé a szabályokat.
//
// Működés:
//  1. Csak betű (ékezetes is), szám, szóköz és . _ - ' engedett  → cirill/teljes szélességű/láthatatlan karakteres trükk kizárva.
//  2. Normalizálás: kisbetű, ékezet le, leet (4→a 3→e 1→i 0→o 5→s 7→t @→a $→s), q→k, ph→f, cz→c, w→v.
//  3. ANYWHERE: egyértelműen trágár tövek – a név BÁRMELY részén (a szóközöket/írásjeleket kihagyva, betűismétlést is elkapva: „kuuurva”, „f.a.s.z”).
//  4. WORD: kétértelmű rövid szavak – csak ÖNÁLLÓ szóként (+ többes szám), így „Fukuda”, „Sussex”, „Analóg” átmegy.
//  5. OK: ártatlan szavak, amik véletlenül tartalmaznak egy tiltott tövet – ezeket előbb kitakarjuk.
// A listák ÉKEZET NÉLKÜL, kisbetűvel, a normalizált alakban vannak (w helyett v, q helyett k). [..] betűosztály megengedett.

export const ANYWHERE = [
  // magyar
  'kurva', 'krva', 'kurvany', 'fasz', 'picsa', 'punci', 'pinas', 'pinaj', 'pinafej', 'pinanyalo', 'geci', 'buzi', 'buzeran', 'kocsog',
  'segg', 'bazmeg', 'bazdmeg', 'bazzeg', 'baszd', 'baszo', 'baszn', 'baszt', 'baszi', 'baszh', 'baszas', 'basszam', 'basszon', 'basszad',
  'baszki', 'kibasz', 'elbasz', 'megbasz', 'lebasz', 'szetbasz', 'felbasz', 'szarhazi', 'szarfej', 'szarzsak', 'szarcsimbok', 'kutyaszar',
  'fostalicska', 'fosfej', 'anyadat', 'anyadba', 'kurvaanyad', 'ribanc', 'lotyo', 'ringyo', 'szajha', 'cafka', 'rohadek', 'csicska',
  'szopo', 'szopj', 'szopd', 'szopas', 'szopat', 'leszop', 'pocsfej', 'futyi', 'cigany', 'neger', 'nigger', 'nigga', 'nigg', 'zsidozo',
  'faszom', 'megdug', 'meg[dk]ef', 'kefel', 'kurol', 'gennyes', 'tokfej', 'heregolyo', 'pedofil', 'hitler', 'strici', 'prosti',
  'maszturb', 'rejszol', 'seggfej', 'seggnyalo', 'segglyuk', 'hugyos', 'retardalt', 'buzizs', 'pinaszor',
  // angol és más nyelvek
  'fuck', 'fvck', 'shit', 'bitch', 'biatch', 'cunt', 'vhore', 'slut', 'pussy', 'asshole', 'arsehole', 'dickhead', 'cocksuck',
  'faggot', 'motherf', 'porn', 'penis', 'vagina', 'boob', 'titties', 'vank', 'bastard', 'jerkoff', 'blovjob', 'handjob', 'cumshot',
  'jizz', 'dildo', 'rapist', 'molest', 'hentai', 'pedophile', 'killyourself', 'schlampe', 'scheisse', 'arschloch', 'fotze',
  'hurensohn', 'vichser', 'pendejo', 'blyat', 'cyka', 'pizda', 'kurva', 'jebac', 'salope', 'putain'
];
export const WORD = [
  // magyar
  'pina', 'pocs', 'fos', 'kuki', 'anyad', 'cigo', 'csocs', 'cici', 'didi', 'pedo', 'naci', 'nyilas', 'szuka', 'hugy', 'ondo',
  'sperma', 'szex', 'porno', 'retard', 'kreten', 'kurafi', 'fattyu', 'geny',
  // angol
  'fuk', 'fck', 'cock', 'cum', 'anal', 'anus', 'rape', 'sex', 'sexy', 'nude', 'naked', 'horny', 'milf', 'tits',
  'tvat', 'prick', 'nazi', 'kkk', 'kys', 'negro', 'kike', 'chink', 'spic', 'tranny', 'fag', 'suka', 'puta', 'chuj', 'merde', 'mierda'
];
export const OK = [
  'scunthorpe', 'shitake', 'shiitake', 'hancock', 'peacock', 'cocktail', 'cockpit', 'dickens', 'dickson', 'assassin', 'passion',
  'compass', 'sussex', 'essex', 'pornoapati', 'spinach', 'pinatubo', 'basszus', 'cigaret', 'ciganyzene',
  'seggio', 'titsch', 'kurvenbau', 'retardalo', 'pussycat', 'penistone', 'arsenal', 'buzinkai', 'agrippina', 'szopran',
  'fosszil', 'foszfor', 'therapist', 'sukar', 'putnok', 'puttony'
];

// betűismétlést is elfogadó minta: kurva → k+u+r+v+a+
export function wordPattern(w) { return w.replace(/\[[^\]]+\]|[a-z]/g, ch => ch + '+'); }
const uniq = l => [...new Set(l)];
export const ANY_RE_SRC = '(' + uniq(ANYWHERE).map(wordPattern).join('|') + ')';
export const WORD_RE_SRC = '(' + uniq(WORD).map(wordPattern).join('|') + ')(s|k|ok|ek|ak)?';
export const OK_RE_SRC = '(' + uniq(OK).sort((a, b) => b.length - a.length).join('|') + ')';
// a név megengedett karakterei (a szabályokban is ugyanez)
export const CHARS_SRC = "^[A-Za-z0-9ÁÉÍÓÖŐÚÜŰáéíóöőúüűÄËÏäëïÀÈÌÒÙàèìòùÂÊÎÔÛâêîôûÇçÑñČčŠšŽžĆćŘřÝý .'_-]+$";
const ANY_RE = new RegExp(ANY_RE_SRC), WORD_RE = new RegExp('^' + WORD_RE_SRC + '$'), OK_RE = new RegExp(OK_RE_SRC, 'g'), CHARS_RE = new RegExp(CHARS_SRC);

// kisbetű + ékezet le + leet + hangtani trükkök; a szóközöket/írásjeleket SZÓKÖZRE cseréli (a szóhatárokhoz)
export function normSpaced(n) {
  return String(n || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[4@]/g, 'a').replace(/3/g, 'e').replace(/[1!|]/g, 'i').replace(/0/g, 'o').replace(/[5$]/g, 's').replace(/7/g, 't')
    .replace(/q/g, 'k').replace(/ph/g, 'f').replace(/cz/g, 'c').replace(/w/g, 'v')
    .replace(/[^a-z]+/g, ' ').trim();
}
export const normName = n => normSpaced(n).replace(/ /g, '');
// szavakra bontás; az egybetűs „szavak” sorozatát összevonja (f u c k → fuck)
function words(sp) {
  const out = []; let run = '';
  for (const t of sp.split(' ').filter(Boolean)) {
    if (t.length === 1) { run += t; continue; }
    if (run) { out.push(run); run = ''; }
    out.push(t);
  }
  if (run) out.push(run);
  return out;
}
export const charsOk = n => CHARS_RE.test(String(n || ''));
// mi akadt fenn (üres, ha semmi) – teszteléshez és az admin felülethez
export function badHit(n) {
  if (!charsOk(n)) return 'karakter';
  const sp = normSpaced(n);
  const m = sp.replace(/ /g, '').replace(OK_RE, '_').match(ANY_RE);
  if (m) return m[0];
  for (const w of words(sp)) if (WORD_RE.test(w.replace(OK_RE, '_'))) return w;
  return '';
}
export const badName = n => !!badHit(n);
export const BAD_MSG = "Ez a név nem megengedett: trágár vagy sértő szót tartalmaz, vagy olyan karaktert, ami nem lehet benne (csak betű, szám, szóköz és . _ - ' engedett).";
