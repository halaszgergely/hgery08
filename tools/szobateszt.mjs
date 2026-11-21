// Többjátékos szobák (rooms, rooms/*/sig) és statisztika (mpstats) szabálytesztje a Firebase Emulatorral.
//   firebase emulators:exec --only firestore --project demo-hgws "node tools/szobateszt.mjs"
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, addDoc, query, where, collection, serverTimestamp, arrayUnion, arrayRemove, increment } from 'firebase/firestore';

const env = await initializeTestEnvironment({ projectId: 'demo-hgws', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
await env.withSecurityRulesDisabled(async c => { const db = c.firestore();
  for (const p of ['anna', 'bela', 'csaba', 'dora']) await setDoc(doc(db, 'users', p), { name: p, role: 'user', banned: false });
  for (const f of ['bela', 'csaba']) await setDoc(doc(db, 'friends', ['anna', f].sort().join('_')), { users: ['anna', f].sort(), from: 'anna', to: f, status: 'accepted' }); });
const as = id => env.authenticatedContext(id, { email_verified: true }).firestore();
let n = 0, bad = 0; const t = async (name, p) => { n++; try { await p; console.log('✅', name); } catch (e) { bad++; console.log('❌', name, '–', e.message?.split('\n')[0]); } };
const anna = as('anna'), bela = as('bela'), csaba = as('csaba'), dora = as('dora');
const room = (host, x = {}) => ({ host, hostName: host, game: 'vizagyuio', mode: 'ffa', map: 'volgy', max: 4, open: true, state: 'lobby', members: [host], vis: ['bela'], createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...x });
const R = (db, id = 'r1') => doc(db, 'rooms', id);

console.log('--- szoba létrehozása');
await t('szoba más nevében', assertFails(setDoc(R(bela, 'x1'), room('anna'))));
await t('szoba idegen taggal a listában', assertFails(setDoc(R(anna, 'x2'), room('anna', { members: ['anna', 'dora'] }))));
await t('szoba rögtön „play” állapotban', assertFails(setDoc(R(anna, 'x3'), room('anna', { state: 'play' }))));
await t('szoba ismeretlen mezővel', assertFails(setDoc(R(anna, 'x4'), room('anna', { admin: true }))));
await t('szoba 9 fős létszámmal', assertFails(setDoc(R(anna, 'x5'), room('anna', { max: 9 }))));
await t('szabályos szoba', assertSucceeds(setDoc(R(anna), room('anna'))));

console.log('--- belépés, kilépés');
const joinAs = (db, uid) => updateDoc(R(db), { members: arrayUnion(uid), updatedAt: serverTimestamp() });
await t('nem barát nem léphet be', assertFails(joinAs(dora, 'dora')));
await t('barát, de nincs a vis listán', assertFails(joinAs(csaba, 'csaba')));
await t('barát más nevében nem léptethet be', assertFails(joinAs(bela, 'csaba')));
await t('a listán lévő barát beléphet', assertSucceeds(joinAs(bela, 'bela')));
await t('a belépő a beállításokat nem írhatja át', assertFails(updateDoc(R(bela), { mode: 'tdm', updatedAt: serverTimestamp() })));
await t('a gazda meghív (vis bővítése)', assertSucceeds(updateDoc(R(anna), { vis: ['bela', 'csaba'], updatedAt: serverTimestamp() })));
await t('a meghívott barát beléphet', assertSucceeds(joinAs(csaba, 'csaba')));
await t('a szobát a listában látja, akinek szól', assertSucceeds(getDocs(query(collection(bela, 'rooms'), where('vis', 'array-contains', 'bela')))));
await t('más nevében nem listázhat', assertFails(getDocs(query(collection(dora, 'rooms'), where('vis', 'array-contains', 'bela')))));
await t('a gazda indít (állapot, mód, pálya)', assertSucceeds(updateDoc(R(anna), { state: 'play', mode: 'tdm', map: 'gyar', updatedAt: serverTimestamp() })));
await t('a gazda nem vehet fel tagot a tudta nélkül', assertFails(updateDoc(R(anna), { members: arrayUnion('dora'), updatedAt: serverTimestamp() })));
await t('tag kilép', assertSucceeds(updateDoc(R(csaba), { members: arrayRemove('csaba'), updatedAt: serverTimestamp() })));
await t('tag mást nem rúghat ki', assertFails(updateDoc(R(bela), { members: arrayRemove('anna'), updatedAt: serverTimestamp() })));

console.log('--- bemutatkozás (sig)');
const sig = (db, from, to, x = {}) => addDoc(collection(db, 'rooms', 'r1', 'sig'), { from, to, k: 'offer', n: 1, d: 'v=0', name: from, at: serverTimestamp(), ...x });
await t('tag ajánlatot küld a gazdának', assertSucceeds(sig(bela, 'bela', 'anna')));
await t('ajánlat más nevében', assertFails(sig(bela, 'anna', 'bela')));
await t('kívülálló nem küldhet', assertFails(sig(dora, 'dora', 'anna')));
await t('nem tagnak nem küldhető', assertFails(sig(bela, 'bela', 'dora')));
await t('túl nagy csomag', assertFails(sig(bela, 'bela', 'anna', { d: 'x'.repeat(13000) })));
await t('a címzett olvassa a neki szólót', assertSucceeds(getDocs(query(collection(anna, 'rooms', 'r1', 'sig'), where('to', '==', 'anna')))));
await t('más nem olvashatja', assertFails(getDocs(query(collection(dora, 'rooms', 'r1', 'sig'), where('to', '==', 'anna')))));

console.log('--- gazdaváltás, törlés');
await t('kívülálló nem veheti át a szobát', assertFails(updateDoc(R(dora), { host: 'dora', hostName: 'dora', updatedAt: serverTimestamp() })));
await t('tag nem adhatja másnak a gazdaszerepet', assertFails(updateDoc(R(bela), { host: 'csaba', hostName: 'csaba', updatedAt: serverTimestamp() })));
await t('bent lévő tag átveszi a gazdaszerepet', assertSucceeds(updateDoc(R(bela), { host: 'bela', hostName: 'bela', updatedAt: serverTimestamp() })));
await t('a volt gazda már nem törölheti', assertFails(deleteDoc(R(anna))));
await t('az új gazda törölheti', assertSucceeds(deleteDoc(R(bela))));

console.log('--- statisztika (mpstats)');
const st = (db, uid, d) => setDoc(doc(db, 'mpstats', uid), { ...d, updatedAt: serverTimestamp() }, { merge: true });
await t('első meccs', assertSucceeds(st(anna, 'anna', { games: increment(1), wins: increment(1), kos: increment(7), boss: increment(0), m_volgy: increment(1) })));
await t('más statisztikáját nem írhatja', assertFails(st(bela, 'anna', { games: increment(1) })));
await t('45 mp-en belül nem növelhető újra', assertFails(st(anna, 'anna', { games: increment(1), wins: increment(1) })));
await env.withSecurityRulesDisabled(c => updateDoc(doc(c.firestore(), 'mpstats', 'anna'), { updatedAt: new Date(Date.now() - 120e3) }));
await t('egy meccs = legfeljebb 1 győzelem', assertFails(st(anna, 'anna', { games: increment(1), wins: increment(2) })));
await t('egy meccs = legfeljebb 40 kiütés', assertFails(st(anna, 'anna', { games: increment(1), kos: increment(41) })));
await t('a meccsszám csak eggyel nőhet', assertFails(st(anna, 'anna', { games: increment(5) })));
await t('érték nem csökkenthető', assertFails(st(anna, 'anna', { games: increment(1), kos: increment(-3) })));
await t('szabályos második meccs', assertSucceeds(st(anna, 'anna', { games: increment(1), wins: increment(0), kos: increment(12), boss: increment(1), m_gyar: increment(1) })));
await t('bárki (bejelentkezve) olvashatja', assertSucceeds(getDoc(doc(dora, 'mpstats', 'anna'))));

console.log('--- Locsolóháború');
await t('locsolóháborús szoba', assertSucceeds(setDoc(R(anna, 'lh1'), room('anna', { game: 'locsolohaboru', mode: 'ctf', map: 'gyar' }))));
await t('ismeretlen játék szobája', assertFails(setDoc(R(anna, 'lh2'), room('anna', { game: 'mas' }))));
const fs = (db, uid, d) => setDoc(doc(db, 'fpsstats', uid), { ...d, updatedAt: serverTimestamp() }, { merge: true });
await t('első FPS-meccs', assertSucceeds(fs(bela, 'bela', { games: increment(1), wins: increment(1), kos: increment(18), caps: increment(2), boss: increment(0), m_gyar: increment(1) })));
await t('FPS: más nevében nem', assertFails(fs(anna, 'bela', { games: increment(1) })));
await env.withSecurityRulesDisabled(c => updateDoc(doc(c.firestore(), 'fpsstats', 'bela'), { updatedAt: new Date(Date.now() - 120e3) }));
await t('FPS: legfeljebb 60 kiütés meccsenként', assertFails(fs(bela, 'bela', { games: increment(1), kos: increment(61) })));
await t('FPS: legfeljebb 5 hazavitt locsolófej', assertFails(fs(bela, 'bela', { games: increment(1), caps: increment(6) })));
await t('FPS: ismeretlen pálya mező', assertFails(fs(bela, 'bela', { games: increment(1), m_hold: increment(1) })));
await t('FPS: szabályos második meccs', assertSucceeds(fs(bela, 'bela', { games: increment(1), kos: increment(9), boss: increment(1), m_kert: increment(1) })));

console.log(`\n${n - bad} / ${n} rendben`); await env.cleanup(); process.exit(bad ? 1 : 0);
