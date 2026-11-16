// HGWS – közös Firebase-indítás és segédfüggvények
import { firebaseConfig, notConfigured, useEmulator } from '../firebase-config.js';
import * as FB from './firebase.js';

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

export const ROLES = {
  admin: { label: 'Admin', color: '#e8b656', rank: 3 },
  moderator: { label: 'Moderátor', color: '#6cc6ff', rank: 2 },
  user: { label: 'Tag', color: '#c9c3b5', rank: 1 }
};
export const COLORS = ['#e8b656', '#6cc6ff', '#5ee08a', '#ff7a6e', '#c79bff', '#ffa94d', '#4dd6c7', '#ff8fc7'];
export const pickColor = s => COLORS[[...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % COLORS.length];

export function initials(name) {
  const p = String(name || '?').trim().split(/\s+/);
  return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}
export function avatar(u, size = 40) {
  const name = u?.name || '?', color = u?.color || pickColor(name);
  const img = u?.photoURL ? `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : '';
  return `<span class="av" style="--s:${size}px;--c:${color}">${esc(initials(name))}${img}</span>`;
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
  'auth/requires-recent-login': 'Ehhez újra be kell jelentkezned.',
  'permission-denied': 'Ehhez nincs jogosultságod.'
}[e?.code] || (e?.message || String(e)));

/* Foglalt nevek – ugyanaz a szabály, mint a firestore.rules-ban (ott is ellenőrizve van) */
export function reservedName(n) {
  const s = String(n || '').toLowerCase(), A = '[aáà4@]', E = '[eéè3]', sep = '[^a-z0-9áéíóöőúüű]*';
  const full = r => new RegExp('^(?:' + r + ')$').test(s);
  const gergely = '.*[g69]' + sep + E + sep + 'r' + sep + '[g69]' + sep + E + sep + 'l' + sep + '[yií1].*';
  return full('.*h' + sep + '[g69]' + sep + E + sep + 'r' + sep + '[yií1].*')
    || (full('.*h' + sep + A + sep + 'l' + sep + A + sep + 's' + sep + 'z.*') && full(gergely))
    || full('(.*[^a-z]|)h[^a-z]+[g69]' + sep + E + sep + 'r' + sep + '[g69]' + sep + E + sep + 'l' + sep + '[yií1].*')
    || full('.*h' + sep + A + sep + 'l' + sep + A + sep + 's' + sep + 'z[^a-z]+[g69]([^a-z].*|)');
}
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
