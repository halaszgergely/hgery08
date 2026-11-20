// HGWS – trágár / sértő felhasználónevek szűrője.
// A lista ÉKEZET NÉLKÜL, kisbetűvel van megadva. A név ellenőrzés előtt normalizálódik:
// kisbetű → ékezetek le → leet (4→a, 3→e, 1→i, 0→o, 5→s, 7→t, @→a, $→s) → minden nem-betű kiesik,
// és a betűk ismétlése is számít (pl. „kuuurva”, „f.a.s.z”, „F4SZ” is fennakad), plusz a hasonló (elírt) alak is.
// FONTOS: ha a listát módosítod, futtasd: node tools/nevszuro.mjs  (ez a firestore.rules-ba is beírja)
export const BAD_WORDS = [
  // magyar
  'kurva', 'kurvany', 'kurvak', 'fasz', 'pina$', 'pinaj', 'pinas', 'pinad', 'pinafej', 'pinanyalo', 'punci', 'picsa', 'picsaba', 'geci', 'gecis', 'buzi', 'buzerans', 'kocsog', 'segg', 'basz[dmoaq]', 'bassz',
  'szaros', 'szarhazi', 'szarfej', 'szarzsak', 'szarcsimbok', 'szarrago', 'fos$', 'fosos', 'fostalicska', 'fosfej', 'anyad', 'anyadat', 'kurvaanyad', 'ribanc', 'lotyo', 'ringyo', 'szajha', 'cafka', 'rohadek', 'csicska', 'nyomorek',
  'hulye', 'idiota', 'retard', 'debil', 'kretén', 'kreten', 'szopo', 'szopj', 'szopd', 'szopas', 'szopat', 'leszop', 'pocsfej', 'pocsom', 'futyi', 'fukk', 'tetu', 'cigany', 'cigo$', 'neger', 'nigger', 'nigga', 'zsidozo', 'buzizs',
  'majom', 'barom', 'paraszt', 'kutyaszar', 'bazmeg', 'bazdmeg', 'bazzeg', 'baszki', 'baszas', 'kibasz', 'elbasz', 'megbasz', 'szetbasz', 'faszkalap', 'faszfej', 'faszszopo', 'faszom', 'faszopo', 'fasszopo',
  'kuki$', 'kukis', 'pocs$', 'dug[jo]', 'megdug', 'kefel', 'kur[oe]l', 'geny', 'gennyes', 'tokfej', 'tokom', 'heregolyo', 'heres', 'csocs', 'cici', 'didi$', 'pedofil', 'pedo$', 'naci', 'hitler', 'nyilas$',
  'koszos', 'buda?oskurva', 'szuka', 'mocskos', 'tahó', 'taho$', 'bunko', 'tetves', 'rohadj', 'dogolj', 'megolle', 'megollek', 'nyald', 'nyalj', 'nyalo', 'seggfej', 'seggnyalo', 'segglyuk', 'valagad', 'valag',
  'fogyatekos', 'elmebeteg', 'nyomi', 'szarjal', 'szarok', 'hugyos', 'hugy', 'pisis', 'okador', 'ondo', 'sperma', 'geci[a-z]', 'kurafi', 'fattyu', 'korcs', 'strici', 'prosti', 'orgia', 'szex', 'porno', 'maszturb', 'rejszol', 'kiver[eo]', 'qurva', 'geczi', 'pussi',
  // angol
  'fuck', 'fuk', 'fck', 'fuq', 'phuck', 'shit', 'sh1t', 'bitch', 'biatch', 'cunt', 'whore', 'slut', 'pussy', 'asshole', 'arsehole', 'dickhead', 'dick$', 'dicks', 'cock$', 'cocks', 'cocksuck', 'faggot', 'fagot', 'retard',
  'motherf', 'porn', 'penis', 'vagina', 'boob', 'tits', 'titties', 'wank', 'bastard', 'nigg', 'negro', 'jerkoff', 'blowjob', 'handjob', 'cumshot', 'cum$', 'jizz', 'dildo', 'anal$', 'anus', 'rape', 'rapist', 'molest',
  'hentai', 'milf', 'horny', 'nude', 'naked', 'sexy', 'sex$', 'xxx', 'kike', 'chink', 'spic$', 'tranny', 'twat', 'bollock', 'bugger', 'wanker', 'prick', 'douche', 'scumbag', 'pedophile', 'nazi', 'kkk', 'killyourself', 'kys$', 'suicide',
  'schlampe', 'scheisse', 'arschloch', 'fotze', 'hurensohn', 'wichser', 'puta', 'mierda', 'pendejo', 'cabron', 'blyat', 'suka', 'cyka', 'pizda', 'kurwa', 'chuj', 'jebac', 'merde', 'salope', 'putain'
].map(w => w.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

// HASONLÓSÁG: a 5+ betűs szavaknál az elírt / egy-két betűben eltérő változat is fennakad
// (a szó hosszának kb. 30%-a térhet el: 5–6 betű → 1, 7–9 → 2, 10+ → 3 betű; az első betűnek egyeznie kell).
// Ezt a firestore.rules nem tudja (ott csak a pontos + betűismétléses minta megy, ugyanazzal a kivétellistával), a kliens és az admin igen.

// ártatlan szavak, amik túl közel esnek valamelyik tiltotthoz
const OK_WORDS = ['kurta', 'kurtag', 'murva', 'durva', 'turbo', 'nigeria', 'niger', 'barbar', 'baromfi', 'barometer', 'majomkenyer', 'paradicsom', 'parazs', 'paratlan', 'gecse', 'gecso', 'picasso', 'pisa', 'retro', 'debrecen',
  'debora', 'szexard', 'szekszard', 'bitcoin', 'shift', 'shirt', 'whole', 'where', 'pusztai', 'puszta', 'dicso', 'titan', 'naked', 'cigar', 'ciganyzene', 'tetris', 'tetra', 'koszonom', 'koszoru', 'kocsis', 'kocsi', 'kocsma', 'bunker',
  'hunor', 'huszar', 'hulya', 'idill', 'ideal', 'marton', 'martin', 'baron', 'barna', 'barany', 'baratom', 'barat', 'major', 'maja', 'mojo', 'ribizli', 'porta', 'porto', 'portal', 'punch', 'punk', 'penisz', 'pentek', 'vaginal',
  'ringo', 'bingo', 'ringlo', 'szuper', 'szikra', 'szoke', 'szopran', 'buziness', 'business', 'busz', 'buli', 'bukta', 'segit', 'segito', 'sziget', 'anyag', 'anyu', 'anya', 'anyos', 'rohan', 'rohanas', 'csicsoka', 'csiga',
  'fucsia', 'shine', 'slot', 'slug', 'whale', 'white', 'horse', 'horny', 'honey', 'nurse', 'sexton', 'essex', 'sussex', 'pedro', 'pedal', 'nazim', 'nazar', 'anubis', 'analog', 'analiz', 'kanal', 'banal', 'csatorna', 'grape', 'drape',
  'trapez', 'skype', 'scrape', 'therapist', 'pricker', 'price', 'prince', 'print', 'cumulus', 'dokumentum', 'document', 'circum', 'hercules', 'herceg', 'heros', 'hero', 'tokio', 'tokaj', 'tokes', 'korcsolya', 'recska', 'mocsar',
  'tahiti', 'kefir', 'kefe', 'dugo', 'dugasz', 'kuria', 'kuruc', 'nyalanksag', 'nyalanka', 'nyaloka', 'fosszilis', 'foszfor', 'hugo', 'hugi', 'pisti', 'pista', 'orban', 'hitel', 'cicia', 'cica', 'didier', 'kukac', 'kukorica',
  'pocsolya', 'pocok', 'szukit', 'szukseg', 'mocsok', 'tetovalt', 'tetovalas', 'teto', 'dogos', 'valaki', 'valami', 'valasz', 'nyomoz', 'nyomozo', 'nyomda', 'szarvas', 'szarka', 'szarny', 'szarnyas', 'okos', 'spermium',
  'strand', 'prosit', 'organ', 'orgona', 'szexta', 'pornic', 'master', 'retek', 'retes', 'kreta', 'kredit', 'suzuki', 'sukar', 'putter', 'putnok', 'merida', 'cabrio', 'kurir', 'jebuz', 'salop', 'chuck', 'chunk', 'duck', 'luck',
  'buck', 'puck', 'tuck', 'truck', 'stuck', 'fuchs', 'fukusima', 'fukushima', 'shite', 'bitcher', 'butcher', 'pitch', 'witch', 'switch', 'twitch', 'stitch', 'hunt', 'count', 'country', 'whose', 'shore', 'chore', 'slum', 'slat',
  'slit', 'pushy', 'passy', 'fussy', 'penny', 'venis', 'tenis', 'tenisz', 'denis', 'boom', 'boot', 'book', 'bob', 'titus', 'tank', 'wink', 'wonka', 'basta', 'bastya', 'custard', 'mustard', 'jazz', 'jizzy', 'dido', 'aldo',
  'venus', 'janus', 'bonus', 'manus', 'minus', 'sinus', 'mike', 'bike', 'nike', 'kiki', 'think', 'china', 'chin', 'spice', 'granny', 'twas', 'twin', 'rocket', 'pocket', 'locker', 'docker', 'cocktail', 'cockpit', 'coco',
  'bagger', 'bigger', 'trigger', 'tiger', 'tigger', 'digger', 'logger', 'jogger', 'nugget', 'nagger', 'dagger', 'ginger', 'finger', 'singer', 'ringer', 'banker', 'tanker', 'hacker', 'backer', 'packer', 'pick', 'brick', 'trick',
  'crick', 'rick', 'dickens', 'dickson', 'richard', 'touche', 'dutch', 'school', 'schlamm', 'arsenal', 'photo', 'futo', 'foto', 'pizza', 'pizzas', 'cyklon', 'ciklon', 'curva', 'curve', 'curry', 'merce', 'mercedes',
  'salome', 'puttony', 'putyin', 'putin', 'mierlo', 'pendulum', 'penge', 'cabrera', 'blat', 'szuka', 'hentes', 'henter', 'milk', 'mill', 'horvat', 'horn', 'nudli', 'node', 'nuke', 'noodle', 'neked', 'nakama', 'sexta', 'kilo',
  'debut', 'debug', 'rebel', 'devil', 'debi', 'hulk', 'hully', 'holy', 'julie', 'idol', 'idomar', 'kreator', 'creator', 'kretai', 'zopo', 'szobor', 'szoba', 'szopogat', 'futar', 'futas', 'futo', 'tetel', 'cigi', 'negyes', 'negy',
  'nagger', 'maja', 'majoros', 'majonez', 'baromi', 'kutya', 'buzavirag', 'buza', 'buzas', 'segges', 'seged', 'lottyo', 'lotto', 'rohadt', 'robot', 'csicsa',
  'meszaros', 'pasztor', 'captain', 'scunthorpe', 'skyscraper', 'drapery', 'canal', 'peacock', 'hancock', 'shitake', 'shiitake', 'snake', 'pinatubo', 'spinach', 'opinion', 'tapinat', 'baszk', 'basszus', 'basszusgitar',
  'fukar', 'viktoria', 'victoria', 'sniper', 'pizzeria', 'szomoru', 'analysis', 'manual', 'annual', 'cassidy', 'classic', 'assassin', 'passion', 'compass', 'assist', 'cucumber', 'cumin', 'sextant', 'titanic', 'institute',
  'constitution', 'competition', 'nudel', 'pineapple', 'kapitany', 'lapina', 'szarazfold', 'szaraz', 'gepfegyver', 'vizagyu', 'kukta', 'heren', 'tokmag', 'tokeletes', 'geniusz', 'genius', 'general', 'genetika',
  'valaga', 'valogat', 'nyomas', 'nyomasmester', 'hugyosi', 'szexton', 'dugattyu', 'kurultaj', 'tetuk', 'cicoma', 'didergo', 'nacional', 'nacio', 'koszorus', 'mocsari', 'tahok', 'bunkos', 'ondolal', 'korcsma', 'prostata'];
// ezeknél nincs hasonlóság-keresés (ragozott / túl rövid tövű alakok – ott túl sok ártatlan nevet fogna)
const NOFUZZY = ['pinaj', 'pinas', 'pinad', 'cocks', 'dicks', 'kukis', 'naked', 'orgia', 'lotyo', 'pizda', 'putain', 'baszas', 'baszki', 'nigger', 'heres', 'valag', 'nyalo', 'nyald', 'nyalj', 'nyomi', 'tokom', 'fosos', 'koszos',
  'szuka', 'cyka', 'puta', 'suka', 'blyat', 'merde', 'jebac', 'gecis', 'kurvak', 'anyad', 'szopj', 'szopd', 'pisis', 'hugyos', 'szarok', 'korcs', 'bunko', 'horny', 'chink', 'kefel', 'rapist', 'titties', 'negro', 'dildo'];
export const OK_RE_SRC = '(' + [...new Set(OK_WORDS)].filter(o => !BAD_WORDS.some(w => w.includes(o) || w.replace(/(.)\1+/g, '$1').includes(o))).sort((x, y) => y.length - x.length).join('|') + ')';
const OK_RE = new RegExp(OK_RE_SRC, 'g');
const squash = s => s.replace(/(.)\1+/g, '$1');
const FZ = [...new Set(BAD_WORDS.filter(w => /^[a-z]+$/.test(w) && !NOFUZZY.includes(w)).map(squash))].filter(w => w.length >= 5).map(w => [w, w.length >= 10 ? 3 : w.length >= 7 ? 2 : 1]);
// van-e a szövegben olyan részlet, ami legfeljebb k szerkesztésre van a szótól (az első betű kötött)
function near(t, w, k) {
  const m = w.length;
  for (let st = 0; st < t.length; st++) {
    if (t[st] !== w[0]) continue;
    let prev = Array.from({ length: m + 1 }, (_, i) => i), pp = null;
    const end = Math.min(t.length, st + m + k);
    for (let j = st; j < end; j++) {
      const cur = [j - st + 1];
      for (let i = 1; i <= m; i++) {
        cur[i] = Math.min(prev[i - 1] + (t[j] === w[i - 1] ? 0 : 1), prev[i] + 1, cur[i - 1] + 1);
        if (pp && i > 1 && j > st && t[j] === w[i - 2] && t[j - 1] === w[i - 1]) cur[i] = Math.min(cur[i], pp[i - 2] + 1);   // felcserélt szomszédos betűk
      }
      pp = prev; prev = cur;
      if (j - st + 1 >= m - k && prev[m] <= k) return true;
    }
  }
  return false;
}
const mask = norm => norm.replace(OK_RE, '_');
const FZI = {};
for (const e of FZ) (FZI[e[0][0]] = FZI[e[0][0]] || []).push(e);
export function fuzzyBad(norm) {
  for (const part of mask(squash(norm)).split('_')) {
    if (part.length < 4) continue;
    for (const ch of new Set(part)) for (const [w, k] of FZI[ch] || []) if (part.length >= w.length - k && near(part, w, k)) return w;
  }
  return '';
}

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
const CACHE = new Map();
export const badName = n => {
  const s = normName(n); let r = CACHE.get(s);
  if (r === undefined) { r = BAD_RE.test(mask(s)) || !!fuzzyBad(s); if (CACHE.size > 5000) CACHE.clear(); CACHE.set(s, r); }
  return r;
};
export const BAD_MSG = 'Ez a név nem megengedett (trágár vagy sértő szót tartalmaz). Válassz másikat!';
