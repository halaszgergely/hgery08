// HGWS – közös Firebase-indítás és segédfüggvények
import { firebaseConfig, notConfigured, useEmulator } from '../firebase-config.js?v=202611222147';
import * as FB from './firebase.js?v=202611222147';

export { FB, notConfigured };

export let app = null, auth = null, db = null;
if (!notConfigured) {
  app = FB.initializeApp(firebaseConfig);
  auth = FB.getAuth(app);
  db = FB.getFirestore(app);
  if (useEmulator) {
    FB.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    FB.connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
}

/* ---------- apróságok ---------- */
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- rangok és jogosultságok ----------
   A tulaj fiókja be van égetve (a Firestore-szabályokba is): őt senki nem tilthatja, némíthatja, nem veheti el a rangját.
   A többi rang adatai (név, szín, szint, jogok) a Firestore „roles” gyűjteményéből jönnek – a tulaj szerkeszti őket a Kezelés → Rangok oldalon.
   Ha egy rangnak még nincs dokumentuma, az alábbi alapértékek érvényesek (a szabályokban ugyanezek vannak). */
export const OWNER_UID = 'bzKz3gAS55hLmf3pru7Ljw0NETN2';
export const PERMS = [
  ['moderate', 'Némítás, kitiltás, átnevezés', 'csak az alacsonyabb rangúaknál'],
  ['deleteMessages', 'Üzenetek és hozzászólások törlése', 'csatornákban és a filmeknél'],
  ['announce', 'Írás a bejelentés-csatornákba', ''],
  ['manageTags', 'Tagek létrehozása és kiosztása', ''],
  ['tickets', 'Ötletek (ticketek) megválaszolása', 'státusz állítása is'],
  ['submitMedia', 'Film és zene beküldése', 'egy admin hagyja jóvá'],
  ['publishMedia', 'Filmek, zenék közvetlen kezelése', 'és a beküldések jóváhagyása'],
  ['manageChannels', 'Csatornák kezelése', ''],
  ['assignRoles', 'Rangok kiosztásának kérelmezése', 'alacsonyabb rangokra, a tulaj hagyja jóvá']
];
const ALL = Object.fromEntries(PERMS.map(p => [p[0], true]));
const MOD = { moderate: true, deleteMessages: true, announce: true, manageTags: true, tickets: true };
export const SYSTEM_ROLES = ['owner', 'admin', 'szerkeszto', 'moderator', 'user'];
export const DEFAULT_ROLES = {
  owner: { label: 'Tulaj', color: '#ff7847', rank: 100, perms: ALL },
  admin: { label: 'Admin', color: '#e8b656', rank: 80, perms: ALL },
  szerkeszto: { label: 'Szerkesztő', color: '#c79bff', rank: 60, perms: { ...MOD, submitMedia: true } },
  moderator: { label: 'Moderátor', color: '#6cc6ff', rank: 40, perms: MOD },
  user: { label: 'Tag', color: '#c9c3b5', rank: 10, perms: {} }
};
export const ROLES = JSON.parse(JSON.stringify(DEFAULT_ROLES));
export const roleOf = r => ROLES[r] || ROLES.user;
/* a Firestore „roles” gyűjtemény alkalmazása (alapértékek + egyedi rangok) */
export function applyRoles(docs) {
  Object.keys(ROLES).forEach(k => delete ROLES[k]);
  Object.assign(ROLES, JSON.parse(JSON.stringify(DEFAULT_ROLES)));
  docs.forEach(d => { if (d.id === 'owner') return; ROLES[d.id] = { ...(ROLES[d.id] || {}), label: d.name || ROLES[d.id]?.label || d.id, color: d.color || '#c9c3b5', rank: d.rank ?? 10, perms: d.perms || {} }; });
}
export const rolesSorted = () => Object.entries(ROLES).sort((a, b) => b[1].rank - a[1].rank);
export const COLORS = ['#e8b656', '#6cc6ff', '#5ee08a', '#ff7a6e', '#c79bff', '#ffa94d', '#4dd6c7', '#ff8fc7'];
export const pickColor = s => COLORS[[...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % COLORS.length];

export function initials(name) {
  const p = String(name || '?').trim().split(/\s+/);
  return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}
export function avatar(u, size = 40) {
  const name = u?.name || '?', color = u?.color || pickColor(name);
  // második szín a névből (mindig eltér az elsőtől) – egyedi színátmenet minden tagnak
  const h = [...String(u?.id || name)].reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5381);
  let c2 = COLORS[h % COLORS.length]; if (c2 === color) c2 = COLORS[(h + 3) % COLORS.length];
  const img = u?.photoURL ? `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : '';
  return `<span class="av" style="--s:${size}px;--c:${color};--c2:${c2}">${esc(initials(name))}${img}</span>`;
}

export const toDate = t => t?.toDate ? t.toDate() : t instanceof Date ? t : t ? new Date(t) : null;
export function timeLabel(t) {
  const d = toDate(t); if (!d) return '';
  const now = new Date(), same = d.toDateString() === now.toDateString();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  const hm = d.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
  if (same) return 'ma ' + hm;
  if (d.toDateString() === y.toDateString()) return 'tegnap ' + hm;
  return d.toLocaleDateString('hu-HU', { year: now.getFullYear() === d.getFullYear() ? undefined : 'numeric', month: 'short', day: 'numeric' }) + ' ' + hm;
}
export function shortTime(t) {
  const d = toDate(t); if (!d) return '';
  const diff = Date.now() - d;
  if (diff < 60e3) return 'most';
  if (diff < 3600e3) return Math.floor(diff / 60e3) + ' p';
  if (diff < 86400e3 && d.getDate() === new Date().getDate()) return d.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
  if (diff < 7 * 86400e3) return d.toLocaleDateString('hu-HU', { weekday: 'short' });
  return d.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
}
export const huDate = d => { try { return new Date(d + 'T00:00:00').toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' }); } catch (_) { return d; } };
export const isOnline = u => { const d = toDate(u?.lastSeen); return !!d && Date.now() - d < 3 * 60e3; };

export function ytId(s) {
  s = (s || '').trim(); if (!s) return '';
  const m = s.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})/);
  return m ? m[1] : (/^[\w-]{11}$/.test(s) ? s : '');
}

let tt;
export function toast(msg, err) {
  let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.toggle('err', !!err); t.classList.add('on');
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), err ? 6000 : 2600);
}

/* nagy számok rövidítve (idle-játékos jelölés): 1,5 M · 12,3 B (milliárd) · 4 T · 2 Qa … */
/* Ranglista-pontszám tömörítve: a hatalmas számok (Öntöző Birodalom) nem férnek el egész számként, ezért 8·10^15 fölött
   a nagyságrendjüket (logaritmusukat) tároljuk. A tárolt érték így mindig biztonságos egész, a sorrend pedig megmarad. */
const LB_T = 8e15, LB_K = 1e12, LB_MAX = 8.3e15;
/* 8,3·10^15 fölött egy második, ritkább sáv jön (10^-9 nagyságrend / egység): így ~10^700000-ig is sorba rendezhető
   (a nagy számos játék a pontszám mellé a log10-et is elküldi). Ilyenkor lbDec szöveget ad ("1.23e450"). */
const LB_LG = Math.log10(LB_T), LB_SEG = LB_LG + (LB_MAX - LB_T) / LB_K, LB_K2 = 1e9, LB_TOP = 9e15;
export const lbEnc = (v, lg) => { v = Math.floor(v || 0); if (typeof lg === 'number' && isFinite(lg) && lg > 15) { if (lg >= LB_SEG) return Math.min(LB_TOP, LB_MAX + Math.round((lg - LB_SEG) * LB_K2)); return Math.min(LB_MAX, LB_T + Math.round((lg - LB_LG) * LB_K)); }
  if (!(v > 0)) return 0; if (!isFinite(v)) v = 1e300; return v < LB_T ? v : Math.min(LB_MAX, LB_T + Math.round(Math.log10(v / LB_T) * LB_K)); };
export const lbDec = s => { s = +s || 0; if (s < LB_T) return s; const lg = s > LB_MAX ? LB_SEG + (s - LB_MAX) / LB_K2 : LB_LG + (s - LB_T) / LB_K;
  if (lg < 300) return 10 ** lg; let e = Math.floor(lg), m = 10 ** (lg - e); if (m >= 9.99995) { m = 1; e++; } return m.toFixed(4) + 'e' + e; };
export const bigNum = n => { n = Math.floor(n || 0); if (!isFinite(n)) return '∞'; if (n < 1e6) return n.toLocaleString('hu-HU');
  const k = Math.floor(Math.log10(n) / 3) - 1, m = n / 10 ** (3 * (k + 1)), num = m.toLocaleString('hu-HU', { maximumFractionDigits: m < 10 ? 2 : m < 100 ? 1 : 0 });
  const U = ['', 'U', 'D', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No'], T = ['', 'Dc', 'Vg', 'Tg', 'Qag', 'Qig', 'Sxg', 'Spg', 'Ocg', 'Nog'], F = ['', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No'];
  return k >= 100 ? num + ' × 10^' + 3 * (k + 1) : num + ' ' + (k < 10 ? F[k] : U[k % 10] + T[Math.floor(k / 10)]); };

export const errText = e => ({
  'auth/invalid-email': 'Érvénytelen e-mail-cím.',
  'auth/missing-password': 'Add meg a jelszót.',
  'auth/invalid-credential': 'Hibás e-mail-cím vagy jelszó.',
  'auth/wrong-password': 'Hibás e-mail-cím vagy jelszó.',
  'auth/user-not-found': 'Ezzel az e-mail-címmel nincs fiók.',
  'auth/email-already-in-use': 'Ezzel az e-mail-címmel már regisztráltak.',
  'auth/weak-password': 'Túl gyenge jelszó (legalább 6 karakter).',
  'auth/too-many-requests': 'Túl sok próbálkozás. Várj egy kicsit, és próbáld újra.',
  'auth/network-request-failed': 'Nincs internetkapcsolat.',
  'auth/popup-blocked': 'A böngésző letiltotta a felugró ablakot.',
  'auth/invalid-login-credentials': 'Hibás e-mail-cím vagy jelszó.',
  'auth/user-disabled': 'Ez a fiók le van tiltva.',
  'auth/account-exists-with-different-credential': 'Ezzel az e-mail-címmel már van fiók – lépj be e-maillel és jelszóval.',
  'auth/unauthorized-domain': 'Erről a címről a Google-belépés nincs engedélyezve (Firebase → Authentication → Authorized domains).',
  'auth/missing-email': 'Add meg az e-mail-címed.',
  'auth/password-does-not-meet-requirements': 'Az új jelszó nem elég erős: legyen benne kisbetű, nagybetű, szám és legalább 8 karakter.',
  'auth/user-mismatch': 'A megadott adatok nem ehhez a fiókhoz tartoznak.',
  'auth/user-token-expired': 'Lejárt a bejelentkezésed, lépj be újra.',
  'auth/operation-not-allowed': 'Az e-mail/jelszavas belépés nincs engedélyezve (Firebase → Authentication → Sign-in method).',
  'auth/requires-recent-login': 'Ehhez újra be kell jelentkezned.',
  'permission-denied': 'Ehhez nincs jogosultságod.'
}[e?.code] || (e?.message || String(e)));

/* Foglalt nevek – ugyanaz a szabály, mint a firestore.rules-ban (ott is ellenőrizve van) */
import { badName } from './nevszuro.js?v=202611222147';
export function reservedName(n) {
  const s = String(n || '').toLowerCase(), A = '[aáà4@]', E = '[eéè3]', sep = '[^a-z0-9áéíóöőúüű]*';
  const full = r => new RegExp('^(?:' + r + ')$').test(s);
  const gergely = '.*[g69]' + sep + E + sep + 'r' + sep + '[g69]' + sep + E + sep + 'l' + sep + '[yií1].*';
  return full('.*h' + sep + '[g69]' + sep + E + sep + 'r' + sep + '[yií1].*')
    || (full('.*h' + sep + A + sep + 'l' + sep + A + sep + 's' + sep + 'z.*') && full(gergely))
    || full('(.*[^a-z]|)h[^a-z]+[g69]' + sep + E + sep + 'r' + sep + '[g69]' + sep + E + sep + 'l' + sep + '[yií1].*')
    || full('.*h' + sep + A + sep + 'l' + sep + A + sep + 's' + sep + 'z[^a-z]+[g69]([^a-z].*|)');
}
export { badName, BAD_MSG, badMsg, badReason } from './nevszuro.js?v=202611222147';
export const RESERVED_MSG = 'Ez a név foglalt (a HGWS tulajdonosáé). Válassz másikat!';

/* Bejelentkezett felhasználó profiljának létrehozása (ha még nincs) */
export async function ensureProfile(user) {
  const ref = FB.doc(db, 'users', user.uid);
  const snap = await FB.getDoc(ref);
  if (snap.exists()) return { id: user.uid, ...snap.data() };
  let name = (user.displayName || (user.email || 'Tag').split('@')[0]).slice(0, 32).padEnd(2, '_');
  if (reservedName(name)) {
    let owner = null; try { owner = (await FB.getDoc(FB.doc(db, 'meta', 'owner'))).data()?.uid; } catch (_) {}
    if (owner && owner !== user.uid) name = 'Tag-' + user.uid.slice(0, 5);
  }
  if (badName(name)) name = 'Tag-' + user.uid.slice(0, 5);
  const data = { name, nameLower: name.toLowerCase(), color: pickColor(user.uid), role: 'user', banned: false,
    createdAt: FB.serverTimestamp(), lastSeen: FB.serverTimestamp(), photoURL: user.photoURL || '', bio: '' };
  await FB.setDoc(ref, data);
  return { id: user.uid, ...data };
}

/* Kis hangjelzés új üzenetnél */
let ac;
export function blip() {
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = 'sine'; o.frequency.setValueAtTime(880, t); o.frequency.exponentialRampToValueAtTime(1320, t + .08);
    g.gain.setValueAtTime(.08, t); g.gain.exponentialRampToValueAtTime(.0001, t + .25);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + .26);
  } catch (_) {}
}

/* ---------- értesítések: users/{uid}/notifs ----------
   type: mention | idea | approve | role | tag | premiere | party
   Mindig a cselekvő tag írja a címzettnek (szerver nélkül). Saját magának nem küld. */
export function notify(to, type, text, link = '') {
  const me = auth?.currentUser?.uid;
  if (!to || !me || (to === me && type !== 'premiere' && type !== 'badge')) return Promise.resolve();
  return FB.addDoc(FB.collection(db, 'users', to, 'notifs'), { type, text: String(text).slice(0, 200), link: String(link).slice(0, 200), by: me, at: FB.serverTimestamp(), read: false })
    .catch(e => console.warn('értesítés', e));
}

/* ---------- napló (audit log): ki mit csinált a kezelőfelületen ---------- */
export function audit(action, target = '', detail = '') {
  const me = auth?.currentUser?.uid; if (!me) return Promise.resolve();
  return FB.addDoc(FB.collection(db, 'audit'), { by: me, action, target: String(target).slice(0, 120), detail: String(detail).slice(0, 300), at: FB.serverTimestamp() })
    .catch(e => console.warn('napló', e));
}
