// Barátrendszer + névszűrő szabályteszt a Firebase Emulatorral.
//   firebase emulators:exec --only firestore --project demo-hgws "node tools/baratteszt.mjs"
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { badName } from '../js/nevszuro.js';

const env = await initializeTestEnvironment({ projectId: 'demo-hgws', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
await env.clearFirestore();   // tiszta lappal (egy előző futás adatai ne zavarjanak)
const people = ['anna', 'bela', 'csaba', 'dora', 'mod', 'tiltott', ...Array.from({ length: 10 }, (_, i) => 'f' + i)];
await env.withSecurityRulesDisabled(async c => {
  const db = c.firestore();
  for (const p of people) await setDoc(doc(db, 'users', p), { name: p, role: p === 'mod' ? 'moderator' : 'user', banned: p === 'tiltott' });
  await setDoc(doc(db, 'users', 'csunya'), { name: 'Kurva Béla', role: 'user', banned: false });
  await setDoc(doc(db, 'conversations', 'anna_dora'), { type: 'dm', members: ['anna', 'dora'], reads: {}, lastMessage: null });   // régi, nem barát
  for (let i = 0; i < 10; i++) await setDoc(doc(db, 'friends', ['anna', 'f' + i].sort().join('_')), { users: ['anna', 'f' + i].sort(), from: 'anna', to: 'f' + i, status: 'accepted' });
});
const as = id => env.authenticatedContext(id, { email_verified: true }).firestore();
let n = 0, bad = 0;
const t = async (name, p) => { n++; try { await p; console.log('✅', name); } catch (e) { bad++; console.log('❌', name, '–', e.message?.split('\n')[0]); } };
const fr = (db, from, to, x = {}) => setDoc(doc(db, 'friends', [from, to].sort().join('_')), { users: [from, to].sort(), from, to, status: 'pending', createdAt: serverTimestamp(), ...x });
const anna = as('anna'), bela = as('bela'), csaba = as('csaba'), dora = as('dora');
const msg = (db, cid, u) => { const b = writeBatch(db); b.set(doc(collection(db, 'conversations', cid, 'messages')), { uid: u, text: 'szia', createdAt: serverTimestamp() }); b.update(doc(db, 'conversations', cid), { lastMessage: { text: 'szia', uid: u, at: serverTimestamp() }, updatedAt: serverTimestamp() }); return b.commit(); };
const dm = (db, a, b) => setDoc(doc(db, 'conversations', [a, b].sort().join('_')), { type: 'dm', members: [a, b].sort(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(), reads: {}, lastMessage: null });

console.log('--- barátkérelem');
await t('DM indítása nem barátnak', assertFails(dm(bela, 'bela', 'csaba')));
await t('kérelem más nevében', assertFails(fr(bela, 'csaba', 'bela')));
await t('kérelem rögtön elfogadva', assertFails(fr(bela, 'bela', 'csaba', { status: 'accepted' })));
await t('kérelem saját magának', assertFails(setDoc(doc(bela, 'friends', 'bela_bela'), { users: ['bela', 'bela'], from: 'bela', to: 'bela', status: 'pending', createdAt: serverTimestamp() })));
await t('kérelem rossz azonosítóval', assertFails(setDoc(doc(bela, 'friends', 'x'), { users: ['bela', 'csaba'], from: 'bela', to: 'csaba', status: 'pending', createdAt: serverTimestamp() })));
await t('kérelem kitiltottnak', assertFails(fr(bela, 'bela', 'tiltott')));
await t('kérelem nem létező tagnak', assertFails(fr(bela, 'bela', 'senki')));
await t('kérelem elküldése', assertSucceeds(fr(bela, 'bela', 'csaba')));
await t('dupla kérelem (fordított irányban)', assertFails(fr(csaba, 'csaba', 'bela')));
await t('küldő maga fogadja el', assertFails(updateDoc(doc(bela, 'friends', 'bela_csaba'), { status: 'accepted', acceptedAt: serverTimestamp() })));
await t('kívülálló olvassa', assertFails(getDoc(doc(dora, 'friends', 'bela_csaba'))));
await t('saját kapcsolatok lekérdezése', assertSucceeds(getDocs(query(collection(csaba, 'friends'), where('users', 'array-contains', 'csaba')))));
await t('mások kapcsolatainak lekérdezése', assertFails(getDocs(query(collection(dora, 'friends'), where('users', 'array-contains', 'csaba')))));
await t('DM még függő kérelemnél', assertFails(dm(bela, 'bela', 'csaba')));
await t('címzett elfogadja', assertSucceeds(updateDoc(doc(csaba, 'friends', 'bela_csaba'), { status: 'accepted', acceptedAt: serverTimestamp() })));
await t('DM indítása barátnak', assertSucceeds(dm(bela, 'bela', 'csaba')));
await t('üzenet barátnak', assertSucceeds(msg(csaba, 'bela_csaba', 'csaba')));
await t('barát eltávolítása', assertSucceeds(deleteDoc(doc(bela, 'friends', 'bela_csaba'))));
await t('üzenet volt barátnak', assertFails(msg(csaba, 'bela_csaba', 'csaba')));
await t('olvasottság jelölése volt barátnál', assertSucceeds(updateDoc(doc(csaba, 'conversations', 'bela_csaba'), { 'reads.csaba': serverTimestamp() })));
await t('régi nem-baráti DM: üzenet', assertFails(msg(anna, 'anna_dora', 'anna')));
await t('régi nem-baráti DM: olvasás marad', assertSucceeds(getDoc(doc(dora, 'conversations', 'anna_dora'))));
await t('kívülálló nem törölheti a kapcsolatot', assertFails(deleteDoc(doc(dora, 'friends', 'anna_f0'))));
console.log('--- csoportok');
const grp = (db, id, members) => setDoc(doc(db, 'conversations', id), { type: 'group', name: 'x', owner: 'anna', members, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), reads: {}, lastMessage: null });
await t('csoport 8 baráttal', assertSucceeds(grp(anna, 'g1', ['anna', 'f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7'])));
await t('csoport nem baráttal', assertFails(grp(anna, 'g2', ['anna', 'f0', 'bela'])));
await t('csoport 9 taggal egyszerre', assertFails(grp(anna, 'g3', ['anna', 'f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8'])));
const g1 = ['anna', 'f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7'];
await t('barát hozzáadása csoporthoz', assertSucceeds(updateDoc(doc(anna, 'conversations', 'g1'), { members: [...g1, 'f8'] })));
await t('nem barát hozzáadása csoporthoz', assertFails(updateDoc(doc(anna, 'conversations', 'g1'), { members: [...g1, 'f8', 'bela'] })));
await t('üzenet csoportban', assertSucceeds(msg(as('f3'), 'g1', 'f3')));
await t('csoport átnevezése', assertSucceeds(updateDoc(doc(as('f1'), 'conversations', 'g1'), { name: 'új' })));
await t('kilépés csoportból', assertSucceeds(updateDoc(doc(as('f8'), 'conversations', 'g1'), { members: g1 })));
console.log('--- névszűrő');
await t('regisztráció trágár névvel', assertFails(setDoc(doc(as('uj1'), 'users', 'uj1'), { name: 'F4sz.Kalap', nameLower: 'f4sz.kalap', role: 'user', banned: false })));
await t('regisztráció rendes névvel', assertSucceeds(setDoc(doc(as('uj2'), 'users', 'uj2'), { name: 'Locsolómester', nameLower: 'locsolómester', role: 'user', banned: false })));
await t('átnevezés trágárra', assertFails(updateDoc(doc(bela, 'users', 'bela'), { name: 'kuuurva anyád', nameLower: 'x' })));
await t('átnevezés rendesre', assertSucceeds(updateDoc(doc(bela, 'users', 'bela'), { name: 'Béla 2', nameLower: 'béla 2' })));
await t('trágár nevű tag tud lastSeen-t írni', assertSucceeds(updateDoc(doc(as('csunya'), 'users', 'csunya'), { lastSeen: serverTimestamp() })));
await t('trágár nevű tag átnevezi magát', assertSucceeds(updateDoc(doc(as('csunya'), 'users', 'csunya'), { name: 'Béla', nameLower: 'béla' })));
await t('moderátor trágárra nevez', assertFails(updateDoc(doc(as('mod'), 'users', 'dora'), { name: 'geci', nameLower: 'geci' })));

console.log('--- névszűrő (kliens)');
const yes = ['Füty Imre', 'kurva', 'F.a.S.z', 'GECIII', 'kuuurvaanyád', 'b@sz0m', 'Fuck_you', 'sh1t', 'Pöcsfej', 'n1gg3r', 'Szarházi', 'Köcsög Kft', 'bazdmeg'];
const no = ['Hgery', 'Locsolómester', 'Szarvas Péter', 'Szarka', 'Zero', 'Botond', 'Ghzer', 'Kitty', 'Spinat', 'Basketball', 'Kovács Anna', 'Dickens', 'Hancock', 'Assassin', 'Scunthorpe'];
for (const x of yes) await t(`tiltott: ${x}`, badName(x) ? Promise.resolve() : Promise.reject(new Error('átment')));
for (const x of no) await t(`engedett: ${x}`, !badName(x) ? Promise.resolve() : Promise.reject(new Error('fennakadt')));
console.log(`\n${n - bad}/${n} rendben`);
await env.cleanup(); process.exit(bad ? 1 : 0);
