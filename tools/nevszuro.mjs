// A js/nevszuro.js listáiból legenerálja a firestore.rules badName() függvényét (ugyanaz a logika, mint a böngészőben,
// kivéve az egybetűs szavak összevonását – „f u c k” –, azt csak a böngésző nézi; a szabály így sosem szigorúbb a kliensnél).
// Futtatás a repó gyökeréből:  node tools/nevszuro.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { ANY_RE_SRC, WORD_RE_SRC, OK_RE_SRC, CHARS_RULES } from '../js/nevszuro.js';
if (CHARS_RULES.includes('"')) throw new Error('A karakterlista nem tartalmazhat idézőjelet');
const CHARS = CHARS_RULES.replace(/\\/g, '\\\\');   // a rules-szövegben a \ escape-elendő
const f = 'firestore.rules', s = readFileSync(f, 'utf8');
const fn = `    // NEVSZURO-START – generálva a js/nevszuro.js listáiból (node tools/nevszuro.mjs), kézzel ne írd át
    function nameNorm(n) {
      return n.lower().replace('[áàâä]', 'a').replace('[éèêë]', 'e').replace('[íìîï]', 'i').replace('[óòôöő]', 'o').replace('[úùûüű]', 'u')
        .replace('[çčć]', 'c').replace('ñ', 'n').replace('š', 's').replace('ž', 'z').replace('ř', 'r').replace('ý', 'y')
        .replace('[4@]', 'a').replace('3', 'e').replace('[1!|]', 'i').replace('0', 'o').replace('[5$]', 's').replace('7', 't')
        .replace('q', 'k').replace('ph', 'f').replace('cz', 'c').replace('w', 'v')
        .replace('[^a-z]+', ' ').trim();
    }
    function badName(n) {
      let sp = ' ' + nameNorm(n).replace('${OK_RE_SRC}', '_') + ' ';
      return !n.matches("${CHARS}")
        || sp.replace(' ', '').matches('.*${ANY_RE_SRC}.*')
        || sp.matches('.* ${WORD_RE_SRC} .*');
    }
    // NEVSZURO-END`;
const re = /    \/\/ NEVSZURO-START[\s\S]*?\/\/ NEVSZURO-END/;
if (!re.test(s)) throw new Error('Nem találom a NEVSZURO blokkot a firestore.rules-ban');
const out = s.replace(re, () => fn);
writeFileSync(f, out); console.log(out === s ? 'nincs változás' : 'firestore.rules frissítve');
