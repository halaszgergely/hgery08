// A js/nevszuro.js szólistájából legenerálja a firestore.rules badName() függvényét.
// Futtatás a repó gyökeréből:  node tools/nevszuro.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { BAD_RE_SRC, OK_RE_SRC } from '../js/nevszuro.js';
const f = 'firestore.rules', s = readFileSync(f, 'utf8');
const fn = `    // NEVSZURO-START – generálva a js/nevszuro.js listájából (node tools/nevszuro.mjs), kézzel ne írd át
    function badName(n) {
      let s = n.lower().replace('[áàâä]', 'a').replace('[éèêë]', 'e').replace('[íìîï]', 'i').replace('[óòôöő]', 'o').replace('[úùûüű]', 'u')
        .replace('[4@]', 'a').replace('3', 'e').replace('[1!|]', 'i').replace('0', 'o').replace('[5$]', 's').replace('7', 't')
        .replace('[^a-z]', '').replace('${OK_RE_SRC}', '_');
      return s.matches('.*${BAD_RE_SRC}.*');
    }
    // NEVSZURO-END`;
const re = /    \/\/ NEVSZURO-START[\s\S]*?\/\/ NEVSZURO-END/;
const out = re.test(s) ? s.replace(re, fn) : s.replace(/(    \/\/ a név akkor jó)/, fn + '\n$1');
writeFileSync(f, out); console.log(out === s ? 'nincs változás' : 'firestore.rules frissítve');
