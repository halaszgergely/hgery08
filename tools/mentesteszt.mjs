// Játékmentések (gamesaves) szabálytesztje a Firebase Emulatorral.
//   firebase emulators:exec --only firestore --project demo-hgws "node tools/mentesteszt.mjs"
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
const env = await initializeTestEnvironment({ projectId: 'demo-hgws', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
await env.withSecurityRulesDisabled(async c => { for (const p of ['anna', 'bela']) await setDoc(doc(c.firestore(), 'users', p), { name: p, role: 'user', banned: false }); });
const as = id => env.authenticatedContext(id, { email_verified: true }).firestore(), anna = as('anna'), bela = as('bela');
let n = 0, bad = 0; const t = async (name, p) => { n++; try { await p; console.log('✅', name); } catch (e) { bad++; console.log('❌', name, '–', e.message?.split('\n')[0]); } };
const save = (db, uid, a = {}, x = {}) => setDoc(doc(db, 'gamesaves', uid), { atemelo: { ch: 2, t: 340, done: [1], best: 0, nospill: 0, nogas: 0, st: '{"S":{}}', ...a }, updatedAt: serverTimestamp(), ...x });
await t('saját mentés', assertSucceeds(save(anna, 'anna')));
await t('más mentését nem írhatja', assertFails(save(bela, 'anna')));
await env.withSecurityRulesDisabled(c => updateDoc(doc(c.firestore(), 'gamesaves', 'anna'), { updatedAt: new Date(Date.now() - 60e3) }));
await t('ismeretlen mező', assertFails(save(anna, 'anna', { cheat: 1 })));
await t('túl nagy állapot', assertFails(save(anna, 'anna', { st: 'x'.repeat(12001) })));
await t('érvénytelen fejezet', assertFails(save(anna, 'anna', { ch: 9 })));
await t('extra gyökérmező', assertFails(save(anna, 'anna', {}, { admin: true })));
await t('szabályos frissítés', assertSucceeds(save(anna, 'anna', { ch: 3, t: 700, done: [1, 2] })));
await t('10 mp-en belül nem írható újra', assertFails(save(anna, 'anna', { ch: 4 })));
await t('más is olvashatja (kitüntetések)', assertSucceeds(getDoc(doc(bela, 'gamesaves', 'anna'))));
await t('más nem törölheti', assertFails(deleteDoc(doc(bela, 'gamesaves', 'anna'))));
await t('a sajátját törölheti', assertSucceeds(deleteDoc(doc(anna, 'gamesaves', 'anna'))));
console.log(`\n${n - bad} / ${n} rendben`); await env.cleanup(); process.exit(bad ? 1 : 0);
