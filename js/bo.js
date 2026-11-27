// HGWS – Öntöző Birodalom Online: állapot és műveletek.
// A telek a kliensen szimulálódik (js/bo-data.js), a Firestore csak az eredményt tárolja:
//   bo/{szezon}                 – világ (víztorony, ostrom, vezetékek, szavazatok) – élő figyelés, 1 dokumentum
//   bo/{szezon}/players/{uid}   – saját állás: betöltéskor 1 olvasás, utána ritka írások (elszámolás + műveletek)
//   bo/{szezon}/regions/{régió} – régiónként EGY összesítő; mindig csak az éppen nézett régiót figyeljük
//   bo/{szezon}/deals, coops, votes · bohall/{szezon}
// Elszámolás (sync): az időarányos termelés jóváírása – a szabályok a szint és az eltelt idő alapján korlátozzák.
// Művelet (act): az „at” időbélyeg nem változik, ezért ott nincs időarányos jóváírás, csak költés / kötött ügylet.
import { FB, db, toast, errText, notify, OWNER_UID } from './core.js?v=202611271824';
import * as D from './bo-data.js?v=202611271824';

let C = null;
export const st = { sid: '', P: null, base: 0, t0: 0, W: null, coop: null, regs: {}, ready: false, busy: false, err: '', hall: null, watching: '' };
const subs = [], listeners = new Set();
let regUnsub = null;
export const on = f => (listeners.add(f), () => listeners.delete(f));
const emit = () => listeners.forEach(f => { try { f(); } catch (e) { console.warn('birodalom', e); } });
export function init(ctx) { C = ctx; }
export const me = () => C.uid();
const wRef = () => FB.doc(db, 'bo', st.sid), pRef = (u = me()) => FB.doc(db, 'bo', st.sid, 'players', u), rRef = r => FB.doc(db, 'bo', st.sid, 'regions', r),
  dCol = () => FB.collection(db, 'bo', st.sid, 'deals'), dRef = id => FB.doc(db, 'bo', st.sid, 'deals', id), cRef = c => FB.doc(db, 'bo', st.sid, 'coops', c);
export const ms = t => t?.toMillis ? t.toMillis() : t instanceof Date ? +t : +t || 0;
const clone = o => JSON.parse(JSON.stringify(o)), ts = () => FB.serverTimestamp();
const FIELDS = ['lv', 'ft', 'inv', 'pl', 'sc', 'coop', 'cos', 'rd', 'ad', 'cand', 'prog', 'voted'];
const pick = d => { const f = D.freshPlayer(), P = {}; for (const k of FIELDS) P[k] = d[k] ?? f[k]; if (d.adg) P.adg = d.adg; return clone(P); };
const body = (P, tx = '', txp = '', txk = '') => ({ ...Object.fromEntries(FIELDS.map(k => [k, P[k]])), ...(P.adg ? { adg: P.adg } : {}), tx, txp, txk });
const tidy = P => { for (const k in P.inv) P.inv[k] = Math.floor(P.inv[k] * 100) / 100; P.ft = Math.floor(P.ft * 100) / 100; P.sc = D.score(P); return P; };
export const cx = () => ({ sid: st.sid, W: st.W, coop: st.coop });
export const rule = () => st.W?.rule || '';
/* a pillanatnyi állás: az utolsó elszámolás + az azóta (helyben) megtermelt mennyiség */
export function view(f = 1) { const v = clone(st.P); D.advance(v, cx(), st.base, Math.max(0, (Date.now() - st.base) / 1000 * f - (f < 1 ? 1 : 0))); return v; }
export const portalOn = () => !!st.coop && (st.coop.m || []).length >= 4 && (st.coop.p?.portal || 0) >= 500;
export const canEnter = (P, rid) => rid !== 'felho' || (P.inv.hajo || 0) >= 1 || portalOn();
export const pumps = P => Object.values(P.pl).reduce((a, pl) => a + Object.keys(pl.b || {}).filter(b => D.BLD[b]?.pump && pl.b[b] > 0).length, 0);
export const isDry = e => !!e && Date.now() - ms(e.wt) > D.DRY_H * 3600e3;

/* ---------- elszámolás ---------- */
let syncing = null;
export function sync(force) {
  if (syncing) return syncing;
  if (!st.P || (!force && Date.now() - st.base < 20e3)) return Promise.resolve();
  return syncing = (async () => {
    // ha az óránk előrébb jár a szerverénél, a szabály elutasítja a jóváírást: kisebb igénnyel újrapróbáljuk, végül csak az időbélyeget frissítjük
    for (const f of [.98, .5, 0]) {
      const n = tidy(view(f));
      try { await FB.updateDoc(pRef(), { ...body(n), at: ts() }); st.P = n; st.base = Date.now(); st.err = ''; emit(); return; }
      catch (e) { if (e?.code !== 'permission-denied' || f === 0) { st.err = errText(e); emit(); throw e; } }
    }
  })().finally(() => { syncing = null; });
}
/* egy művelet: előtte elszámolás, aztán egy kötegben a játékos + a többi érintett dokumentum */
async function act(txk, mut, ops, tx = '', txp = '') {
  if (st.busy) throw 'Egy művelet még folyamatban van.';
  st.busy = true;
  try {
    await sync(Date.now() - st.base > 15e3);
    const n = clone(st.P), r = mut(n); n.sc = D.score(n);
    const b = FB.writeBatch(db); b.update(pRef(), body(n, tx, txp, txk)); if (ops) ops(b, n);
    await b.commit(); st.P = n; return r;
  } finally { st.busy = false; emit(); }
}
function need(P, c) {
  if ((P.ft || 0) < (c.ft || 0)) throw `Nincs elég pénzed – ${D.fmt(c.ft)} Ft kell.`;
  for (const k of ['alk', 'gep', 'viz', 'hir', 'lfd', 'szv']) if (c[k] && (P.inv[k] || 0) < c[k]) throw `Kevés: ${D.RES[k][0].toLowerCase()} (${D.fmt(c[k])} kell).`;
  P.ft -= c.ft || 0; for (const k of ['alk', 'gep', 'viz', 'hir', 'lfd', 'szv']) if (c[k]) P.inv[k] -= c[k];
}
const add = (P, k, v) => { P.inv[k] = (P.inv[k] || 0) + v; };

/* ---------- betöltés ---------- */
export async function open() {
  const sid = D.seasonId();
  if (st.ready && st.sid === sid) return;
  close(); st.sid = sid;
  let w = await FB.getDoc(wRef());
  if (!w.exists()) {
    // az új szezon első látogatója hozza létre a világot; a szezon szabálya az előző tanácsválasztás győztes programja
    let r = ''; try { const p = await FB.getDoc(FB.doc(db, 'bo', D.prevSeason(sid))), rv = p.exists() ? p.data().rv || {} : {}; r = Object.keys(rv).sort((a, b) => rv[b] - rv[a])[0] || ''; } catch (_) {}
    const wk = D.weekOf();
    try { await FB.setDoc(wRef(), { t0: ts(), tw: { wk, v: 0 }, raid: { wk, dmg: 0 }, rp: { wk: 0, ok: false }, kosz: { wk, v: 0 }, pipes: {}, cv: {}, rv: {}, rule: r, op: '', lk: '' }); } catch (e) { console.warn('világ', e); }
    w = await FB.getDoc(wRef());
  }
  st.W = w.data() || null;
  subs.push(FB.onSnapshot(wRef(), s => { if (s.exists()) { st.W = s.data({ serverTimestamps: 'estimate' }); emit(); } }, e => console.warn('világ', e)));
  let p = await FB.getDoc(pRef());
  if (!p.exists()) { await FB.setDoc(pRef(), { ...D.freshPlayer(), tx: '', txp: '', txk: '', t0: ts(), at: ts() }); p = await FB.getDoc(pRef()); }
  const d = p.data({ serverTimestamps: 'estimate' });
  st.t0 = ms(d.t0); st.base = Math.min(Date.now(), ms(d.at) || Date.now()); st.P = pick(d);
  if (st.P.coop) await loadCoop();
  st.ready = true; emit();
  try { await sync(true); } catch (e) { console.warn('elszámolás', e); }
  housekeeping().catch(e => console.warn('birodalom', e));
}
export function close() { subs.splice(0).forEach(u => u()); if (regUnsub) regUnsub(); regUnsub = null; st.ready = false; st.P = null; st.W = null; st.coop = null; st.regs = {}; st.watching = ''; }
export async function loadCoop() {
  if (!st.P.coop) { st.coop = null; return; }
  const s = await FB.getDoc(cRef(st.P.coop));
  st.coop = s.exists() && (s.data().m || []).includes(me()) ? { id: s.id, ...s.data() } : null;
  if (!st.coop) await act('', P => { P.coop = ''; }).catch(() => {});   // közben kizártak vagy megszűnt
}
export async function loadRegion(rid) { const s = await FB.getDoc(rRef(rid)); return st.regs[rid] = { exists: s.exists(), plots: s.data({ serverTimestamps: 'estimate' })?.plots || {} }; }
export function watchRegion(rid) {
  if (st.watching === rid) return; if (regUnsub) regUnsub(); st.watching = rid;
  regUnsub = FB.onSnapshot(rRef(rid), s => { st.regs[rid] = { exists: s.exists(), plots: s.data({ serverTimestamps: 'estimate' })?.plots || {} }; emit(); }, e => console.warn('régió', e));
}
/* belépéskor: elveszett (kiszáradt és felvásárolt) telkek kivezetése, napi öntözés, ostromjutalom, szezonzárás */
async function housekeeping() {
  const rids = [...new Set(Object.values(st.P.pl).map(p => p.r))];
  for (const rid of rids) {
    const reg = await loadRegion(rid), lost = [], thirsty = [];
    for (const pid in st.P.pl) { const [r, k] = pid.split('_'); if (r !== rid) continue; const e = reg.plots[k];
      if (!e || e.u !== me()) lost.push(pid); else if (Date.now() - ms(e.wt) > 20 * 3600e3) thirsty.push(pid); }
    if (lost.length) { await act('', P => { for (const pid of lost) delete P.pl[pid]; }); toast(`🥀 ${lost.length} telked kiszáradt, és másé lett (${D.REG[rid].n}).`, true); }
    for (const pid of thirsty) { if ((st.P.inv.viz || 0) < D.WATER_COST) { toast('💧 Nincs elég vized a telkek öntözéséhez – 72 óra után kiszáradnak!', true); break; } await waterPlot(pid).catch(e => console.warn('öntözés', e)); }
  }
  await claimRaid(true).catch(e => console.warn('ostrom', e));
  await closeSeason().catch(e => console.warn('szezonzárás', e));
  emit();
}

/* ---------- telek ---------- */
export async function buyPlot(rid, k) {
  const R = D.REG[rid], reg = st.regs[rid] || await loadRegion(rid), old = reg.plots[k], dried = old && old.u !== me() && isDry(old);
  if (old && !dried) throw 'Ez a telek foglalt.';
  const pid = rid + '_' + k;
  await act('plot', P => {
    if (P.lv < R.lv) throw `Ez a régió a ${R.lv}. szinten nyílik meg.`;
    if (!canEnter(P, rid)) throw 'Ide csak léghajóval vagy a szövetkezet Vízportáljával juthatsz el.';
    if (Object.keys(P.pl).length >= D.plotMax(P.lv)) throw `Ezen a szinten legfeljebb ${D.plotMax(P.lv)} telked lehet.`;
    need(P, { ft: dried ? R.p / 4 : R.p }); P.pl[pid] = { r: rid, lv: 1, b: {}, g: 0 };
  }, b => { const e = { u: me(), wt: ts(), lv: 1 }; reg.exists ? b.update(rRef(rid), { ['plots.' + k]: e, lk: k, op: 'buy' }) : b.set(rRef(rid), { plots: { [k]: e }, lk: k, op: 'buy' }); }, rid, k);
  if (dried) notify(old.u, 'birodalom', `🥀 Kiszáradt telkedet (${R.n}) felvásárolta ${C.S.me?.name || 'valaki'}.`, '#/birodalom/' + rid);
}
export function waterPlot(pid) {
  const [rid, k] = pid.split('_');
  return act('water', P => need(P, { viz: D.WATER_COST }), b => b.update(rRef(rid), { ['plots.' + k + '.wt']: ts(), lk: k, op: 'water' }));
}
export function leavePlot(pid) {
  const [rid, k] = pid.split('_');
  return act('', P => { delete P.pl[pid]; }, b => b.update(rRef(rid), { ['plots.' + k]: FB.deleteField(), lk: k, op: 'leave' }));
}
export function build(pid, bid) {
  return act('', P => {
    const pl = P.pl[pid], B = D.BLD[bid], L = pl.b[bid] || 0;
    if (!pl || B.r !== pl.r) throw 'Ide ez nem építhető.';
    if (L >= (B.max || D.BLD_MAX)) throw 'Ez már a legmagasabb szint.';
    if (B.pump && !L && pumps(P) >= (P.inv.vjog || 0)) throw 'Szivattyút csak vízjoggal köthetsz a vízre – vegyél vízjogot a Vízvári bankban.';
    need(P, D.bldCost(bid, L + 1)); pl.b[bid] = L + 1;
  });
}
export function upPlot(pid) {
  const [rid, k] = pid.split('_'); let L;
  return act('', P => { const pl = P.pl[pid]; L = (pl.lv || 1) + 1; if (L > 10) throw 'A telek már a legmagasabb szinten van.'; need(P, D.plotUpCost(L)); pl.lv = L; },
    b => b.update(rRef(rid), { ['plots.' + k + '.lv']: L, lk: k, op: 'up' }));
}
export function levelUp() {
  return act('', P => { const L = P.lv + 1; if (L > D.MAX_LV) throw 'Elérted a legmagasabb szintet.';
    const wait = st.t0 + D.lvlWait(L) - Date.now(); if (wait > 0) throw `A ${L}. szint ${Math.ceil(wait / 60e3)} perc múlva érhető el.`;
    need(P, { ft: D.lvlCost(L) }); P.lv = L; });
}
export function setGarden(pid, g) { return act('', P => { if (P.pl[pid]) P.pl[pid].g = g; }); }

/* ---------- bank, piac ---------- */
export const sellPrice = k => D.RES[k][2] * (rule() === 'bopiac' ? 1.2 : 1);
export const vjogPrice = () => rule() === 'olcsoviz' ? D.VJOG_PRICE / 2 : D.VJOG_PRICE;
export function sell(res, q) {
  q = Math.floor(q);
  return act('sell', P => { if (!(q > 0) || (P.inv[res] || 0) < q) throw 'Nincs ennyi belőle.'; P.inv[res] -= q; const got = Math.floor(q * sellPrice(res)); P.ft += got; return got; }, null, res);
}
export function buyVjog(n = 1) { return act('', P => { need(P, { ft: n * vjogPrice() }); add(P, 'vjog', n); }); }
export function offer(res, q, p, to = '') {
  q = Math.floor(q); p = Math.floor(p); const id = FB.doc(dCol()).id;
  return act('offer', P => { if (!(q > 0) || (P.inv[res] || 0) < q) throw 'Nincs ennyi belőle.'; if (!(p >= 0)) throw 'Adj meg árat.'; P.inv[res] -= q; },
    b => b.set(dRef(id), { k: 'offer', s: me(), to, pub: !to, res, q, p, st: 'open', b: '', at: ts() }), id)
    .then(() => { if (to) notify(to, 'birodalom', `🤝 ${C.S.me?.name || 'Egy barátod'} ajánlatot tett: ${D.fmt(q)} ${D.RES[res][0].toLowerCase()} ${p ? D.fmt(p) + ' Ft-ért' : 'ajándékba'}.`, '#/birodalom/vizvar/piac'); });
}
export function buyDeal(d) {
  return act('buy', P => { need(P, { ft: d.p }); add(P, d.res, d.q); }, b => b.update(dRef(d.id), { st: 'sold', b: me(), pub: false }), d.id)
    .then(() => { if (d.p) notify(d.s, 'birodalom', `💰 Elkelt az ajánlatod: ${D.fmt(d.q)} ${D.RES[d.res][0].toLowerCase()} – ${D.fmt(d.p)} Ft vár a piacon.`, '#/birodalom/vizvar/piac'); });
}
export const cancelDeal = d => act('cancel', P => add(P, d.res, d.q), b => b.delete(dRef(d.id)), d.id);
export const collectDeal = d => act('collect', P => { P.ft += d.p; }, b => b.delete(dRef(d.id)), d.id);
export async function loadDeals() {
  const get = async q => { try { return (await FB.getDocs(q)).docs.map(x => ({ id: x.id, ...x.data({ serverTimestamps: 'estimate' }) })); } catch (e) { console.warn('piac', e); return []; } };
  const [pub, mine, forMe] = await Promise.all([get(FB.query(dCol(), FB.where('pub', '==', true), FB.limit(40))), get(FB.query(dCol(), FB.where('s', '==', me()), FB.limit(40))), get(FB.query(dCol(), FB.where('to', '==', me()), FB.limit(20)))]);
  return { pub: pub.filter(d => d.s !== me()).sort((a, b) => ms(b.at) - ms(a.at)), mine, forMe: forMe.filter(d => d.st === 'open') };
}

/* ---------- vezetékek, víztorony ---------- */
export const myRegs = P => [...new Set(Object.values(P.pl).map(p => p.r))];
export function pipeBuild(edge, fee) {
  return act('pipe', P => { if (st.W.pipes[edge]) throw 'Ezt a vezetéket már megépítették.'; need(P, { ft: D.PIPE_FT, alk: D.PIPE_ALK }); },
    b => b.update(wRef(), { ['pipes.' + edge]: { o: me(), fee }, lk: edge, op: 'pipe' }));
}
export const pipeFee = (edge, fee) => FB.updateDoc(wRef(), { ['pipes.' + edge + '.fee']: fee, lk: edge, op: 'fee' });
export function importWater(edge, q) {
  q = Math.floor(q); const p = st.W.pipes[edge], id = FB.doc(dCol()).id; if (!p) throw 'Nincs ilyen vezeték.';
  return act('import', P => { if (!(q > 0)) throw 'Mennyi vizet kérsz?'; need(P, { ft: q * (D.VIZ_BASE + p.fee) }); add(P, 'viz', q); },
    b => b.set(dRef(id), { k: 'toll', s: p.o, b: me(), pipe: edge, q, p: q * p.fee, st: 'sold', at: ts() }), id);
}
export function tower(x) {
  x = Math.floor(x); const wk = D.weekOf();
  return act('tw', P => { if (!(x > 0)) throw 'Mennyi vizet adsz be?'; need(P, { viz: x }); },
    b => b.update(wRef(), st.W.tw.wk === wk ? { 'tw.v': FB.increment(x), op: 'tw' } : { tw: { wk, v: x }, op: 'tw' }));
}

/* ---------- Szilárd erődje: heti ostrom ---------- */
export const raidNow = () => { const wk = D.weekOf(); return st.W.raid.wk === wk ? st.W.raid.dmg : 0; };
export async function raid(viz, alk) {
  viz = Math.floor(viz) || 0; alk = Math.floor(alk) || 0; const wk = D.weekOf(), dmg = Math.floor((viz + 20 * alk) * (rule() === 'eros' ? 1.25 : 1));
  if (!(dmg > 0)) throw 'Adj be vizet vagy alkatrészt az ostromhoz.';
  await claimRaid(true);
  return act('raid', P => { need(P, { viz, alk }); const same = P.rd.wk === wk; P.rd = { wk, d: (same ? P.rd.d : 0) + dmg, cl: same ? P.rd.cl : false }; return dmg; },
    b => b.update(wRef(), st.W.raid.wk === wk ? { 'raid.dmg': FB.increment(dmg), op: 'raid' } : { raid: { wk, dmg }, rp: { wk: st.W.raid.wk, ok: st.W.raid.dmg >= D.RAID_HP }, op: 'raid' }));
}
/* az előző heti ostrom jutalma (Locsolófej-darabok) – ha a hét még nincs lezárva a világ-dokumentumban, előbb lezárjuk */
export async function claimRaid(quiet) {
  const P = st.P, wk = D.weekOf(); if (!P || !P.rd.wk || P.rd.wk >= wk || P.rd.cl) return 0;
  if (st.W.raid.wk === P.rd.wk) { await FB.updateDoc(wRef(), { raid: { wk, dmg: 0 }, rp: { wk: st.W.raid.wk, ok: st.W.raid.dmg >= D.RAID_HP }, op: 'roll' }); st.W = (await FB.getDoc(wRef())).data(); }
  const ok = st.W.rp.wk === P.rd.wk && st.W.rp.ok, n = ok ? D.raidTier(P.rd.d) : 0;
  await act('', p => { p.rd.cl = true; if (n) add(p, 'lfd', n); });
  if (n) toast(`🔱 Az erőd elesett! ${n} Locsolófej-darabot kaptál.`); else if (!quiet) toast('Ezen a héten nem járt jutalom.');
  return n;
}

/* ---------- szövetkezetek ---------- */
export function coopCreate(n, cr) {
  const id = FB.doc(FB.collection(db, 'bo', st.sid, 'coops')).id;
  return act('coop', P => { if (P.coop) throw 'Már tagja vagy egy szövetkezetnek.'; if (P.lv < 3) throw 'Szövetkezetet a 3. szinttől alapíthatsz.'; need(P, { ft: D.COOP_FT }); P.coop = id; },
    b => b.set(cRef(id), { n, cr, o: me(), m: [me()], inv: [], p: { torony: 0, portal: 0 }, op: '', at: ts() })).then(loadCoop);
}
export async function coopInvite(uid) {
  await FB.updateDoc(cRef(st.coop.id), { inv: FB.arrayUnion(uid), op: 'own' }); await loadCoop();
  notify(uid, 'birodalom', `🛡️ ${C.S.me?.name || 'Valaki'} meghívott a(z) „${st.coop.n}” szövetkezetbe.`, '#/birodalom/vizvar/szovetkezet/' + st.coop.id);
}
export async function coopKick(uid) { await FB.updateDoc(cRef(st.coop.id), { m: FB.arrayRemove(uid), op: 'own' }); await loadCoop(); }
export function coopJoin(cid) {
  return act('', P => { if (P.coop) throw 'Előbb lépj ki a mostani szövetkezetedből.'; P.coop = cid; }, b => b.update(cRef(cid), { m: FB.arrayUnion(me()), inv: FB.arrayRemove(me()), op: 'join' })).then(loadCoop);
}
export function coopLeave() {
  const c = st.coop, alone = c.o === me() && c.m.length === 1;
  if (c.o === me() && !alone) throw 'Alapítóként csak akkor léphetsz ki, ha már nincs más tag.';
  return act('', P => { P.coop = ''; }, b => alone ? b.delete(cRef(c.id)) : b.update(cRef(c.id), { m: FB.arrayRemove(me()), op: 'leave' })).then(() => { st.coop = null; emit(); });
}
export function coopGive(kind, x) {
  x = Math.floor(x);
  return act('give', P => { if (!(x > 0)) throw 'Mennyit adsz be?'; need(P, { alk: x }); }, b => b.update(cRef(st.coop.id), { ['p.' + kind]: FB.increment(x), op: 'give' })).then(loadCoop);
}
export const getCoop = async cid => { const s = await FB.getDoc(cRef(cid)); return s.exists() ? { id: s.id, ...s.data() } : null; };

/* ---------- negyedek ---------- */
export const buyCos = id => act('', P => { if (P.cos.includes(id)) throw 'Ez már megvan.'; need(P, { hir: D.COS[id][2] }); P.cos.push(id); });
export const forge = () => act('', P => { need(P, { lfd: 7, alk: 50 }); add(P, 'alf', 1); });
export const airship = () => act('', P => { if ((P.inv.hajo || 0) >= 1) throw 'Már van léghajód.'; need(P, { gep: 10 }); add(P, 'hajo', 1); });
/* Átemelőtelep: a szivattyúvezérlő minijáték eredménye 6 órára javítja a tisztítás hatásfokát; túlcsordulásnál a mocsár koszosabb lesz */
export function pumpResult(pid, score, overflow) {
  const wk = D.weekOf(), spill = overflow && (st.P.inv.szv || 0) >= 50;
  return act(spill ? 'kosz' : '', P => { P.pl[pid].mg = Math.round(score * 100) / 100; P.pl[pid].mgT = Date.now(); if (spill) P.inv.szv -= 50; },
    b => spill && b.update(wRef(), st.W.kosz.wk === wk ? { 'kosz.v': FB.increment(1), op: 'kosz' } : { kosz: { wk, v: 1 }, op: 'kosz' }));
}
/* Arcade-dokk: ha az elmúlt 24 órában rekordot döntöttél a nap játékában, naponta egyszer vízjog + 300 Ft jár */
export async function dock() {
  const g = D.dockGame(), day = D.dayStr(); if (st.P.ad === day) throw 'A mai jutalmat már felvetted.';
  const s = await FB.getDoc(FB.doc(db, 'leaderboards', g, 'scores', me()));
  if (!s.exists() || Date.now() - ms(s.data().at) > 864e5) throw 'Előbb dönts rekordot a mai játékban!';
  return act('dock', P => { P.ad = day; P.adg = g; add(P, 'vjog', 1); P.ft += 300; });
}

/* ---------- szezon: ranglista, tanács, zárás ---------- */
export async function loadTop(sid = st.sid, n = 20) {
  try { return (await FB.getDocs(FB.query(FB.collection(db, 'bo', sid, 'players'), FB.orderBy('sc', 'desc'), FB.limit(n)))).docs.map(d => ({ uid: d.id, ...d.data() })); } catch (e) { console.warn('ranglista', e); return []; }
}
export const visit = async uid => { const s = await FB.getDoc(pRef(uid)); return s.exists() ? pick(s.data()) : null; };
export const candidate = prog => act('', P => { if (!D.RULES[prog]) throw 'Válassz programot.'; P.cand = true; P.prog = prog; });
export const canVote = () => new Date().getUTCDate() >= D.VOTE_DAY;
export function vote(c, prog) {
  return act('', P => { if (P.voted) throw 'Már szavaztál ebben a szezonban.'; if (!canVote()) throw `Szavazni a hónap ${D.VOTE_DAY}. napjától lehet.`; P.voted = true; },
    b => { b.set(FB.doc(db, 'bo', st.sid, 'votes', me()), { c, at: ts() }); b.update(wRef(), { ['cv.' + c]: FB.increment(1), ['rv.' + prog]: FB.increment(1), lk: c, op: 'vote' }); });
}
export async function loadHall() {
  if (st.hall) return st.hall;
  try { const s = await FB.getDoc(FB.doc(db, 'bohall', D.prevSeason(st.sid))); st.hall = s.exists() ? s.data() : {}; } catch (_) { st.hall = {}; }
  return st.hall;
}
/* szezonzárás (aki tagokat kezelhet): az előző szezon legjobbjai a csarnokba kerülnek, és megkapják a „Vízmester” taget, ha van ilyen */
async function closeSeason() {
  if (!C.can || !C.can('manageTags')) return;
  const prev = D.prevSeason(st.sid), ref = FB.doc(db, 'bohall', prev);
  if ((await FB.getDoc(ref)).exists()) return;
  const pw = await FB.getDoc(FB.doc(db, 'bo', prev)); if (!pw.exists()) return;
  const top = (await loadTop(prev, 3)).map(p => ({ u: p.uid, sc: p.sc, lv: p.lv })), cv = pw.data().cv || {}, council = Object.keys(cv).sort((a, b) => cv[b] - cv[a]).slice(0, 3);
  await FB.setDoc(ref, { top, council, rule: pw.data().rule || '', at: ts() });
  const tag = (C.S.tags || []).find(t => /v[ií]zmester/i.test(t.name));
  for (const [i, w] of top.entries()) {
    const u = C.S.users.get(w.u); if (!u) continue;
    if (tag && !(u.tags || []).includes(tag.id) && (u.tags || []).length < 10 && (w.u !== OWNER_UID || C.isOwner())) await FB.updateDoc(FB.doc(db, 'users', w.u), { tags: FB.arrayUnion(tag.id) }).catch(() => {});
    notify(w.u, 'birodalom', `🏆 Az Öntöző Birodalom ${prev} szezonjának ${i + 1}. helyezettje lettél – szobrod áll Vízvár főterén!`, '#/birodalom/studio');
  }
}

/* a kertből (iframe) érkező állás → a telek kertszintje */
addEventListener('message', e => {
  if (e.origin !== location.origin || e.data?.hgws !== 'bo' || !st.P) return;
  const [sid, ...rest] = String(e.data.key || '').split('__'), pid = rest.join('__'), pl = st.P.pl[pid]; if (sid !== st.sid || !pl) return;
  const g = Math.min(40, Math.floor(Math.log10((+e.data.life || 0) + 1) * 2));
  if (g > (pl.g || 0) && !st.busy) setGarden(pid, g).then(() => toast(`🌱 A kerted ${g}. szintű lett – többet terem a telek.`)).catch(() => {});
});
