/* Ranglista a meglévő HGWS Arcade-ranglistán (Firestore: leaderboards/<lb>/scores/<uid>).
   - A fő lista game = "vizfuvar": a cég vagyona (Ft); az Arcade szülőoldala menti (mindenkori + heti), ugyanúgy, mint a többi játéknál.
   - Allisták: vizfuvar_fuvarok (teljesített fuvarok), vizfuvar_legjobb (a legjobb fuvar pontszáma), vizfuvar_dolgozok (alkalmazottak száma).
   - Vendég: becenévvel (nick mező), bejelentkezett felhasználó: a profil neve.
   - Mentés bejelentkezve: cloudsaves/<uid>/g/vizfuvar (ha a szabályok engedik; különben csak helyben). */
import { GAME } from './config.js?v=202611240622';

let core = null, user = null, ready = null; const names = new Map();
export function init() { if (ready) return ready; ready = (async () => { try { const v = new URL(import.meta.url).searchParams.get('v') || ''; core = await import('../../../js/core.js?v=202611240622' + (v ? '?v=' + v : '')); if (!core || core.notConfigured || !core.auth) { core = null; return; }
    await new Promise(ok => { const un = core.FB.onAuthStateChanged(core.auth, u => { user = u; ok(); un && un(); }); setTimeout(ok, 4000); }); core.FB.onAuthStateChanged(core.auth, u => { user = u; }); } catch (e) { console.info('ranglista nem érhető el', e); core = null; } })(); return ready; }
export const status = () => ({ on: !!core, user: !!user, guest: !!user?.isAnonymous, uid: user?.uid || null });
export const getNick = () => { try { return localStorage.getItem('hgws_nick') || ''; } catch (_) { return ''; } };
export function nickError(n) { n = String(n || '').trim(); if (n.length < 2) return 'Legalább 2 karakter legyen.'; if (n.length > 16) return 'Legfeljebb 16 karakter.'; if (/[<>&"]/.test(n)) return 'Nem használható karakter.';
  if (core && (core.reservedName?.(n))) return core.RESERVED_MSG || 'Ez a név foglalt.'; if (core && core.badName?.(n)) return core.BAD_MSG || 'Ez a név nem megengedett.'; return ''; }
export function setNick(n) { try { localStorage.setItem('hgws_nick', String(n).trim().slice(0, 16)); } catch (_) {} }
const okId = s => /^[a-z0-9_]{2,40}$/.test(s);
export async function submit(list, score) { score = Math.floor(score); if (!(score > 0)) return { ok: false };
  try { if (list === GAME && window.top !== window) parent.postMessage({ hgws: 'score', game: GAME, score }, location.origin); } catch (_) {}
  await init(); if (!core || !user) return { ok: false, why: 'Jelentkezz be az Arcade-ban, hogy felkerülj a ranglistára.' };
  if (list === GAME && window.top !== window) return { ok: true };
  const extra = user.isAnonymous ? { nick: getNick() || 'Vendég sofőr' } : {};
  try { const ref = core.FB.doc(core.db, 'leaderboards', list, 'scores', user.uid), s = await core.FB.getDoc(ref), o = s.data() || {};
    if (score > (o.best || 0) || (user.isAnonymous && o.nick !== extra.nick)) await core.FB.setDoc(ref, { best: Math.max(score, o.best || 0), at: core.FB.serverTimestamp(), ...(o.wins ? { wins: o.wins } : {}), ...extra }); return { ok: true }; }
  catch (e) { console.warn('ranglista', list, e?.code || e); return { ok: false }; } }
export async function top(lb, n = 10) { await init(); if (!core || !user) return null;
  try { const s = await core.FB.getDocs(core.FB.query(core.FB.collection(core.db, 'leaderboards', lb, 'scores'), core.FB.orderBy('best', 'desc'), core.FB.limit(n)));
    const rows = s.docs.map(d => ({ uid: d.id, score: core.lbDec ? core.lbDec(d.data().best) : d.data().best, nick: d.data().nick || null, me: d.id === user.uid }));
    await Promise.all(rows.filter(r => !r.nick && !names.has(r.uid)).map(async r => { try { const u = await core.FB.getDoc(core.FB.doc(core.db, 'users', r.uid)); names.set(r.uid, u.exists() ? (u.data().name || 'Sofőr') : 'Sofőr'); } catch (_) { names.set(r.uid, 'Sofőr'); } }));
    return rows.map(r => ({ ...r, name: r.nick || names.get(r.uid) || 'Sofőr', guest: !!r.nick })); } catch (e) { console.warn('ranglista olvasás', e?.code || e); return []; } }
// feloldások: helyben mindig, bejelentkezve a felhőben is
export async function cloudLoad() { await init(); if (!core || !user || user.isAnonymous) return null; try { const d = await core.FB.getDoc(core.FB.doc(core.db, 'cloudsaves', user.uid, 'g', GAME)); return d.exists() ? JSON.parse(d.data().st || 'null') : null; } catch (_) { return null; } }
let lastCloud = 0, pend = null; // felhőmentés: legfeljebb 30 percenként, plusz kilépéskor (kézi mentés nincs)
export async function cloudSave(save, exit) { pend = save; await init(); if (!core || !user || user.isAnonymous) return; if (Date.now() - lastCloud < (exit ? 15000 : 30 * 60e3)) return; lastCloud = Date.now(); pend = null;
  try { await core.FB.setDoc(core.FB.doc(core.db, 'cloudsaves', user.uid, 'g', GAME), { life: Math.min(9e15, Math.max(0, Math.floor(save.penz || 0))), lg: 0, st: JSON.stringify(save), updatedAt: core.FB.serverTimestamp() }); } catch (e) { console.info('felhőmentés', e?.code || e); } }
if (typeof addEventListener === 'function') { const flush = () => { if (pend) cloudSave(pend, true); }; addEventListener('pagehide', flush); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); }); }
