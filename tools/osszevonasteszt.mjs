// Vendégfiók-összevonás szabálytesztje a Firebase Emulatorral.
//   npm i --no-save @firebase/rules-unit-testing firebase
//   firebase emulators:exec --only firestore --project demo-hgws "node tools/osszevonasteszt.mjs"
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, deleteDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
const env = await initializeTestEnvironment({ projectId: 'demo-hgws', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
await env.clearFirestore();
await env.withSecurityRulesDisabled(async c => { const db = c.firestore(), u = (id, x = {}) => setDoc(doc(db, 'users', id), { name: id, role: 'user', banned: false, ...x });
  await u('anna'); await u('mod', { role: 'moderator' });
  await setDoc(doc(db, 'leaderboards', 'flappy', 'scores', 'vendeg1'), { best: 500, at: Timestamp.now(), nick: 'Pistike' });
  await setDoc(doc(db, 'leaderboards', 'flappy', 'scores', 'anna'), { best: 300, at: Timestamp.now() });
  await setDoc(doc(db, 'guests', 'vendeg1'), { nick: 'Pistike', lastSeen: Timestamp.now() }); });
const as = id => env.authenticatedContext(id, { email_verified: true }).firestore(), mod = as('mod'), anna = as('anna'), guest = env.authenticatedContext('vendeg1', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
let n = 0, bad = 0; const t = async (name, p) => { n++; try { await p; console.log('✅', name); } catch (e) { bad++; console.log('❌', name, '–', e.message?.split('\n')[0]); } };
const sc = (db, id) => doc(db, 'leaderboards', 'flappy', 'scores', id);
await t('moderátor: a fiók eredményét növeli', assertSucceeds(setDoc(sc(mod, 'anna'), { best: 500, at: serverTimestamp(), merged: 'vendeg1' })));
await t('moderátor: csökkenteni nem tudja', assertFails(setDoc(sc(mod, 'anna'), { best: 10, at: serverTimestamp(), merged: 'vendeg1' })));
await t('moderátor: a vendég eredményét törli', assertSucceeds(deleteDoc(sc(mod, 'vendeg1'))));
await t('moderátor: regisztrált eredményét nem törli', assertFails(deleteDoc(sc(mod, 'anna'))));
await t('sima tag nem vonhat össze', assertFails(setDoc(sc(anna, 'anna'), { best: 900, at: serverTimestamp(), merged: 'x' })));
await t('a tag utána a sajátját írhatja', assertSucceeds(setDoc(sc(anna, 'anna'), { best: 600, at: serverTimestamp() })));
await t('moderátor: összevonás jelzése', assertSucceeds(setDoc(doc(mod, 'merges', 'vendeg1'), { into: 'anna', by: 'mod', at: serverTimestamp() })));
await t('a vendég olvassa a jelzést', assertSucceeds(getDoc(doc(guest, 'merges', 'vendeg1'))));
await t('más nem olvassa', assertFails(getDoc(doc(anna, 'merges', 'vendeg1'))));
await t('moderátor: vendég jelenlétét törli', assertSucceeds(deleteDoc(doc(mod, 'guests', 'vendeg1'))));
console.log(`\n${n - bad}/${n} rendben`); await env.cleanup(); process.exit(bad ? 1 : 0);
