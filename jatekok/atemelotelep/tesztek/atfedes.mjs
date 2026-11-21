// Az Átemelőtelep – interakciós pontok ellenőrzése minden fejezetállapotban.
//   node jatekok/atemelotelep/tesztek/atfedes.mjs
// 1) Két egyszerre használható pont doboza nem lehet egymásba ágyazva (a kisebbet a pick() sosem választaná).
// 2) Minden használható pont legalább egy reális nézőpontból célozható legyen (1–2 m-ről, szemmagasságból, falon át nem).
import { buildLevel, itVisible, pick, overlap, inWellXZ, EYE, WELL } from '../palya.js';
const L = buildLevel(), fails = [], warns = [];
L.boxes[L.doorCol].off = true; L.boxes[L.gateCol].off = true;   // az ajtók nyitva (zárva szándékosan nem érhetők el a belső pontok)
const states = [];
for (let ch = 1; ch <= 6; ch++) for (const inW of [0, 1]) for (const hatch of [0, 1]) for (const took of [0, 1]) { if (inW && !hatch) continue; states.push({ ch, well: { in: inW, hatch }, f: { tookKanna: took } }); }
const inside = (A, B, e = 1e-6) => [0, 1, 2].every(i => A.a[i] >= B.a[i] - e && A.b[i] <= B.b[i] + e);
const name = S => `${S.ch}. fejezet${S.well.in ? ', aknában' : ''}${S.well.hatch ? ', nyitott fedél' : ''}${S.f.tookKanna ? ', kanna elvéve' : ''}`;
const seen = new Set(), reach = new Map();
function viewpoints(o, S) {
  const cx = (o.a[0] + o.b[0]) / 2, cz = (o.a[2] + o.b[2]) / 2, out = [];
  for (let r = .9; r <= 2.0; r += .275) for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; let y;
    if (S.well.in) { if (!(inWellXZ(x, z) && z > WELL.z0 + .3 && z < WELL.platZ - .1)) continue; y = WELL.plat; }
    else if (inWellXZ(x, z)) { if (x > 5.4 && x < 6.6 && z > -11.2 && z < -10) continue; y = .251; }   // a födémen, a búvónyíláson kívül
    else y = 0;
    if (overlap(L, x, y, z)) continue; out.push([x, y, z]); }
  return out;
}
function aimPoints(o) { const c = i => (o.a[i] + o.b[i]) / 2, q = (i, t) => o.a[i] + (o.b[i] - o.a[i]) * t; return [[c(0), c(1), c(2)], [q(0, .3), c(1), q(2, .3)], [q(0, .7), c(1), q(2, .7)], [c(0), q(1, .8), c(2)]]; }
for (const S of states) {
  const vis = L.it.filter(o => itVisible(o, S));
  for (const A of vis) for (const B of vis) if (A !== B && inside(A, B)) { const k = A.id + '<' + B.id; if (!seen.has(k)) { seen.add(k); fails.push(`ÁTFEDÉS: „${A.id}” teljesen „${B.id}” dobozában van (${name(S)})`); } }
  for (const o of vis) { let ok = false;
    for (const [x, y, z] of viewpoints(o, S)) { for (const [tx, ty, tz] of aimPoints(o)) { const ey = y + EYE, d = [tx - x, ty - ey, tz - z], l = Math.hypot(...d); d[0] /= l; d[1] /= l; d[2] /= l; if (Math.abs(d[1]) > .995) continue; if (pick(L, x, ey, z, d, 2.3, q => itVisible(q, S)) === o) { ok = true; break; } } if (ok) break; }
    const k = o.id + '|' + S.ch + S.well.in + S.well.hatch + S.f.tookKanna; reach.set(k, ok); if (!ok) fails.push(`NEM CÉLOZHATÓ: „${o.id}” (${name(S)})`); }
}
const uniq = [...new Set(fails)];
console.log(`${states.length} állapot, ${L.it.length} interakciós pont`);
for (const f of uniq) console.log('✗', f); for (const w of warns) console.log('!', w);
console.log(uniq.length ? `${uniq.length} hiba` : '✓ nincs átfedés, minden pont célozható');
process.exit(uniq.length ? 1 : 0);
