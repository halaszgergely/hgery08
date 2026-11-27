// A tartalom angol (eredeti Mindustry) neveinek táblája a bundle.properties-ből → nevek.js
// Használat: node eszkoz/nevek.mjs <mindustry forrás>
import fs from 'fs';
const root = process.argv[2];
const P = {}; for (const l of fs.readFileSync(root + '/core/assets/bundles/bundle.properties', 'utf8').split('\n')) { const m = l.match(/^\s*([^#=\s][^=]*?)\s*=\s*(.*)$/); if (m) P[m[1]] = m[2]; }
globalThis.Image = class { set src(v) {} }; globalThis.document = { createElement: () => ({ getContext: () => ({}) }) };
const A = await import(process.cwd() + '/adat.js'), K = await import(process.cwd() + '/kepadat.js');
const out = { b: {}, i: {}, l: {}, u: {} }, miss = [];
for (const k in A.BLOCKS) { const n = P[`block.${K.SN[k] || k}.name`]; if (n) out.b[k] = n; else miss.push('b:' + k); }
for (const k in A.ITEMS) { const n = P[`item.${K.ISN[k] || k}.name`]; if (n) out.i[k] = n; else miss.push('i:' + k); }
for (const k in A.LIQUIDS) { const n = P[`liquid.${K.LSN[k] || k}.name`]; if (n) out.l[k] = n; else miss.push('l:' + k); }
for (const k in A.UNITS) { const n = P[`unit.${k}.name`]; if (n) out.u[k] = n; else miss.push('u:' + k); }
fs.writeFileSync('nevek.js', '// A tartalom angol nevei (eredeti Mindustry bundle); az eszkoz/nevek.mjs generálja\nexport const EN = ' + JSON.stringify(out) + ';\n');
console.log('blokk', Object.keys(out.b).length, 'anyag', Object.keys(out.i).length, 'folyadék', Object.keys(out.l).length, 'egység', Object.keys(out.u).length, 'hiányzik', miss.join(' '));
