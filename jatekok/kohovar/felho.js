// Kohóvár – felhőmentés a HGWS-fiókhoz kötve (az Arcade kerete, js/browse.js írja és olvassa: cloudsaves/<uid>/g/kohovar).
// A felhőbe az előrehaladás kerül: kutatás, bank, elfoglalt szektorok, rekord és a futó játékok. A mentéshelyek (IndexedDB) csak helyben maradnak.
// Szabály (minden felhőmentéses Arcade-játékra): automatikusan legfeljebb 30 percenként + kilépéskor; kézi felhőmentést csak moderátor vagy
// magasabb rang indíthat. A szerver csak nagyobb vagy egyenlő előrehaladású mentést enged felülírni (lg).
const GAME = 'kohovar', GAP = 30 * 60e3, MAX = 900000;
const C = { on: 0, admin: 0, lg: 0, err: '', at: Date.now(), ex: 0, wAt: 0, sent: 0, enc: null, encLg: 0, encT: 0, pending: null, man: 0 };
let H = null;   // { getS, applyS, note, onAdmin }
const inFrame = () => { try { return window.top !== window; } catch (_) { return false; } };

// előrehaladás: csak nőhet (kutatás, elfoglalt szektorok, rekord) – a szerver ezt veti össze
export const progress = S => (S.research || []).length * 100 + Object.keys(S.cap || {}).filter(k => S.cap[k]).length * 1000 + Math.min(999, S.best || 0);

async function gz(str) { const s = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip')); const u8 = new Uint8Array(await new Response(s).arrayBuffer()); let b = ''; for (let i = 0; i < u8.length; i += 0x8000) b += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return 'gz:' + btoa(b); }
async function ungz(st) {
  if (!st.startsWith('gz:')) return JSON.parse(st);
  const bin = atob(st.slice(3)), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return JSON.parse(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
}
// a feltöltendő mentés előre elkészítve (kilépéskor nincs idő tömöríteni); ha túl nagy, a futó játékok nélkül
async function encode() {
  const S = H.getS(); let st = await gz(JSON.stringify(S));
  if (st.length > MAX) st = await gz(JSON.stringify({ ...S, runs: {} }));
  C.enc = st.length <= MAX ? st : null; C.encLg = progress(S); C.encT = Date.now();
}
// mentés után hívandó: a tömörített változat frissítése (legfeljebb 2 mp-enként), és az automatikus feltöltés, ha letelt a 30 perc
export function changed() {
  if (!H || !inFrame()) return;
  clearTimeout(C.pending); C.pending = setTimeout(async () => { try { await encode(); if (C.on && Date.now() - C.at >= GAP) push('auto'); } catch (_) {} }, 2000);
}
export function push(kind) {
  if (!H || !inFrame()) return false;
  if (!C.on) { if (kind === 'man') H.note('A felhő most nem érhető el' + (C.err ? ' (' + C.err + ')' : ''), 'bad'); return false; }
  const now = Date.now();
  if ((kind === 'auto' && now - C.at < GAP) || (kind === 'exit' && now - C.ex < 60e3)) return false;
  if (now - C.wAt < 11e3) { if (kind === 'man') { H.note('Felhőmentés folyamatban…'); clearTimeout(C.mt); C.mt = setTimeout(() => push('man'), 11e3 - (now - C.wAt) + 300); } return false; }   // a szerver 10 mp-en belül nem enged két írást
  if (!C.enc) { if (kind === 'man') H.note('A mentés túl nagy a felhőhöz, csak helyben marad meg', 'bad'); return false; }
  if (C.encLg < C.lg) { if (kind === 'man') H.note('A felhőben előrébb tartó mentés van – az marad meg', 'bad'); return false; }
  C.at = now; C.ex = now; C.wAt = now; C.sent = C.encLg; C.man = kind === 'man' ? 1 : 0;
  try { parent.postMessage({ hgws: 'cssave', game: GAME, life: C.encLg, lg: C.encLg, st: C.enc, ack: 1, man: C.man, exit: kind === 'exit' ? 1 : 0 }, location.origin); } catch (_) { return false; }
  return true;
}
export const isAdmin = () => !!C.admin;
// azonnali feltöltés a legfrissebb állapottal (lap elrejtésekor, mentés és kilépéskor, kézi mentéskor)
export async function flush(kind = 'exit') { if (!H || !inFrame()) return; clearTimeout(C.pending); try { await encode(); } catch (_) {} push(kind); }

export async function initCloud(h) {
  H = h; if (!inFrame()) return;
  try { await encode(); } catch (_) {}
  addEventListener('message', async e => {
    if (e.origin !== location.origin || e.source !== parent || !e.data || e.data.hgws !== 'cs' || e.data.game !== GAME) return;
    const d = e.data;
    if (d.ack) { if (d.ok) { C.lg = Math.max(C.lg, C.sent); C.err = ''; if (C.man) H.note('Felhőbe mentve'); } else if (d.err && !/30 percenként/.test(d.err)) { C.err = d.err; if (C.man) H.note('Felhőmentés: ' + d.err, 'bad'); } C.man = 0; return; }
    C.admin = d.admin ? 1 : 0; H.onAdmin(!!C.admin);
    if (d.none) { C.on = 0; C.err = d.err || ''; return; }
    C.on = 1; C.lg = typeof d.lg === 'number' ? d.lg : +d.life || 0;
    const local = progress(H.getS());
    if (d.st && C.lg > local) {   // a felhőben előrébb tartó mentés van (másik eszköz): azt töltjük be
      try { const S = await ungz(d.st); if (S && S.research && H.applyS(S)) { await encode(); H.note('Felhőmentés betöltve'); } } catch (_) { C.err = 'a felhőmentés nem olvasható'; }
    } else if (local > C.lg) { C.ex = 0; push('exit'); }   // itt tartunk előrébb: feltöltjük
  });
  addEventListener('pagehide', () => push('exit'));
  try { parent.postMessage({ hgws: 'csreq', game: GAME }, location.origin); } catch (_) {}
}
