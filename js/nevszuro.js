// HGWS – trágár / sértő felhasználónevek szűrője.
// A lista ÉKEZET NÉLKÜL, kisbetűvel van megadva. A név ellenőrzés előtt normalizálódik:
// kisbetű → ékezetek le → leet (4→a, 3→e, 1→i, 0→o, 5→s, 7→t, @→a, $→s) → minden nem-betű kiesik,
// és a betűk ismétlése is számít (pl. „kuuurva”, „f.a.s.z”, „F4SZ” is fennakad).
// FONTOS: ha a listát módosítod, futtasd: node tools/nevszuro.mjs  (ez a firestore.rules-ba is beírja)
export const BAD_WORDS = [
  // magyar
  'kurva', 'kurvany', 'fasz', 'pina$', 'pinaj', 'pinas', 'pinad', 'pinafej', 'punci', 'picsa', 'geci', 'buzi', 'kocsog', 'segg', 'basz[dmoaq]', 'bassz',
  'szaros', 'szarhazi', 'szarfej', 'szarzsak', 'anyad', 'anyadat', 'ribanc', 'lotyo', 'rohadek', 'csicska', 'nyomorek',
  'hulye', 'idiota', 'retard', 'debil', 'szopo', 'szopj', 'szopd', 'pocsfej', 'futyi', 'tetu', 'cigany', 'neger', 'nigger', 'nigga',
  'majom', 'barom', 'paraszt', 'kutyaszar', 'bazmeg', 'bazdmeg', 'baszki', 'kibasz', 'elbasz', 'faszkalap', 'faszfej',
  // angol
  'fuck', 'fuk', 'shit', 'bitch', 'cunts', 'cunty', 'whore', 'slut', 'pussy', 'asshole', 'dickhead', 'faggot', 'fagot', 'retard',
  'motherf', 'porn', 'penis', 'vagina', 'boob', 'tits', 'wank', 'bastard', 'nigg'
];

// egy szóból olyan minta, ami a betűk ismétlését is elkapja: kurva → k+u+r+v+a+
export function wordPattern(w) {
  return w.replace(/\[[^\]]+\]|[a-z]/g, ch => ch + '+');
}
export const BAD_RE_SRC = '(' + BAD_WORDS.map(wordPattern).join('|') + ')';
const BAD_RE = new RegExp(BAD_RE_SRC);

export function normName(n) {
  return String(n || '').toLowerCase()
    .replace(/[áàâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i').replace(/[óòôöő]/g, 'o').replace(/[úùûüű]/g, 'u')
    .replace(/[4@]/g, 'a').replace(/3/g, 'e').replace(/[1!|]/g, 'i').replace(/0/g, 'o').replace(/[5$]/g, 's').replace(/7/g, 't')
    .replace(/[^a-z]/g, '');
}
export const badName = n => BAD_RE.test(normName(n));
export const BAD_MSG = 'Ez a név nem megengedett (trágár vagy sértő szót tartalmaz). Válassz másikat!';
