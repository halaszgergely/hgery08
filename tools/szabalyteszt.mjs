// Firestore-szabályok tesztje (matricák, saját emojik, reakciók) a Firebase Emulatorral.
// Futtatás a repó gyökeréből:
//   npm i --no-save @firebase/rules-unit-testing firebase
//   firebase emulators:exec --only firestore --project demo-hgws "node tools/szabalyteszt.mjs"
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc, collection, writeBatch, serverTimestamp, arrayUnion, FieldPath, Timestamp } from 'firebase/firestore';

const OWNER = 'bzKz3gAS55hLmf3pru7Ljw0NETN2';
const env = await initializeTestEnvironment({ projectId: 'demo-hgws', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
await env.withSecurityRulesDisabled(async c => {
  const db = c.firestore(), u = (id, x = {}) => setDoc(doc(db, 'users', id), { name: id, role: 'user', banned: false, ...x });
  await u('anna'); await u('mod', { role: 'moderator' }); await u(OWNER, { role: 'owner' });
  await u('nema', { mutedUntil: Timestamp.fromMillis(Date.now() + 3600e3) });
  await setDoc(doc(db, 'channels', 'c'), { name: 'általános', type: 'text', order: 0 });
  await setDoc(doc(db, 'channels', 'c', 'messages', 'stk1'), { uid: 'anna', text: '', sticker: 'gg', createdAt: Timestamp.now() });
  await setDoc(doc(db, 'channels', 'c', 'messages', 'own'), { uid: OWNER, text: '', sticker: 'gg', createdAt: Timestamp.now() });
  await setDoc(doc(db, 'conversations', 'anna_mod'), { type: 'dm', members: ['anna', 'mod'], reads: {}, lastMessage: null });
});
const as = id => env.authenticatedContext(id, { email_verified: true }).firestore();
const msgs = db => collection(db, 'channels', 'c', 'messages');
const msg = (db, data) => setDoc(doc(msgs(db)), { createdAt: serverTimestamp(), ...data });
let n = 0, bad = 0;
const t = async (name, p) => { n++; try { await p; console.log('✅', name); } catch (e) { bad++; console.log('❌', name, '–', e.message?.split('\n')[0]); } };

const anna = as('anna'), mod = as('mod'), nema = as('nema');
await t('matrica küldése', assertSucceeds(msg(anna, { uid: 'anna', text: '', sticker: 'szilard_nevet' })));
await t('szöveg :kód:-dal', assertSucceeds(msg(anna, { uid: 'anna', text: 'szia :csepp: :hgws:' })));
await t('ismeretlen matrica-id', assertFails(msg(anna, { uid: 'anna', text: '', sticker: 'nincs_ilyen' })));
await t('külső kép-URL matricaként', assertFails(msg(anna, { uid: 'anna', text: '', sticker: 'https://example.com/x.png' })));
await t('külső kép külön mezőben', assertFails(msg(anna, { uid: 'anna', text: 'x', img: 'https://example.com/x.png' })));
await t('matrica + szöveg együtt', assertFails(msg(anna, { uid: 'anna', text: 'hi', sticker: 'gg' })));
await t('matrica + film együtt', assertFails(msg(anna, { uid: 'anna', text: '', sticker: 'gg', film: 'f1' })));
await t('némított felhasználó matricát küld', assertFails(msg(nema, { uid: 'nema', text: '', sticker: 'gg' })));
await t('matrica szerkesztése', assertFails(updateDoc(doc(msgs(anna), 'stk1'), { text: 'átírva', editedAt: serverTimestamp() })));
await t('reakció saját emojival', assertSucceeds(updateDoc(doc(msgs(mod), 'stk1'), new FieldPath('reactions', ':csepp_szivszem:'), arrayUnion('mod'))));
await t('reakció sima emojival', assertSucceeds(updateDoc(doc(msgs(mod), 'stk1'), new FieldPath('reactions', '👍'), arrayUnion('mod'))));
await t('reakció ismeretlen kóddal', assertFails(updateDoc(doc(msgs(mod), 'stk1'), new FieldPath('reactions', ':hacker:'), arrayUnion('mod'))));
await t('reakció URL-lel', assertFails(updateDoc(doc(msgs(mod), 'stk1'), new FieldPath('reactions', 'https://example.com/x.png'), arrayUnion('mod'))));
await t('moderátor törli más matricáját', assertSucceeds(deleteDoc(doc(msgs(mod), 'stk1'))));
await t('moderátor nem törli a tulaj matricáját', assertFails(deleteDoc(doc(msgs(mod), 'own'))));
const b = writeBatch(anna), r = doc(collection(anna, 'conversations', 'anna_mod', 'messages'));
b.set(r, { uid: 'anna', text: '', sticker: 'locsolofej_megvan', createdAt: serverTimestamp() });
b.update(doc(anna, 'conversations', 'anna_mod'), { lastMessage: { text: 'Matricát küldött', uid: 'anna', at: serverTimestamp() }, updatedAt: serverTimestamp(), 'reads.anna': serverTimestamp() });
await t('privát matrica + „Matricát küldött” előnézet', assertSucceeds(b.commit()));

await env.cleanup();
console.log(`\n${n - bad}/${n} zöld`); process.exit(bad ? 1 : 0);
