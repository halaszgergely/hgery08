/* ---------- kézi pályamódosítások (palya.json) betöltése a generált világra ----------
   Formátum: { v: 1, terr: [[i, j, eltolás], …] (64-es rács), del: [uid, …], mod: { uid: [x, y, szög, méret] }, add: [{ id, t, x, y, a, s, …paraméterek }] }
   A generált tárgyak azonosítója a létrehozásuk sorszáma, a szórt növényzeté 's<cx>_<cy>_<i>', a lerakottaké a saját id-jük. */
const MED = { add: [], del: new Set(), mod: new Map(), nid: 1, dun: [] };
/* ---------- saját kazamaták: külön zóna a világ keleti szélén túl, domborzattal (a peremén fal), kijárattal ---------- */
function dunZone(d) { const hc = 64, hw = Math.ceil(d.w / hc) + 1, hh = Math.ceil(d.h / hc) + 1, hm = new Float32Array(hw * hh);
  for (let j = 0; j < hh; j++) for (let i = 0; i < hw; i++) { const e = Math.min(i, j, hw - 1 - i, hh - 1 - j); hm[i + j * hw] = e === 0 ? 420 : e === 1 ? 260 : 0; }
  const z = { id: d.id, n: d.n || 'KAZAMATA', th: d.th || 'ko', t: d.t || 2, kind: 'cu', cu: 1, x: d.x, y: d.y, w: d.w, h: d.h, cells: [], hc, hw, hh, hm, hm0: hm.slice(), in: [d.x + 330, d.y + d.h / 2], at: d.at || [HUB[0], HUB[1] + 200] }; z.far = z.in;
  ZONES.push(z); ZK[z.id] = z; WW = Math.max(WW, d.x + d.w + 2000);
  const ex = addO({ t: 'door', x: d.x + 190, y: d.y + d.h / 2, r: 0, z: d.id, out: 1, up: 1, dk: 'stairs', uid: 'x' + d.id }); z.exit = ex; return z; }
function dunRemove(d) { const z = ZK[d.id]; if (!z) return; const i = ZONES.indexOf(z); if (i >= 0) ZONES.splice(i, 1); delete ZK[d.id]; if (z.exit && !z.exit.del) delObj(z.exit); edDirty(z.x, z.y, z.x + z.w, z.y + z.h); }
function dunNext() { let x = 0; for (const z of ZONES) x = Math.max(x, z.x + z.w); return { x: Math.round(x + 2500), y: 600 }; }
/* zónadomborzat (barlangok, saját kazamaták): eltérés az eredetihez képest */
function zoneHm(z, idx, v) { if (!z.hm0) z.hm0 = z.hm.slice(); z.hm[idx] = v; }
const isGroup = o => o.t === 'bld';
function padMove(p, dx, dy) { const R0 = p[2] + p[3], cells = (x, y) => { const r = []; for (let gx = Math.floor((x - R0) / PGC); gx <= Math.floor((x + R0) / PGC); gx++) for (let gy = Math.floor((y - R0) / PGC); gy <= Math.floor((y + R0) / PGC); gy++) r.push(gx * 4096 + gy); return r; };
  for (const k of cells(p[0], p[1])) { const l = PADG.get(k); if (l) { const i = l.indexOf(p); if (i >= 0) l.splice(i, 1); } } p[0] += dx; p[1] += dy; for (const k of cells(p[0], p[1])) { let l = PADG.get(k); if (!l) PADG.set(k, l = []); l.push(p); } }
function edDirty(x0, y0, x1, y1) { invalH(x0 - 600, y0 - 600, x1 + 600, y1 + 600); if (GL3 && GL3.rebuild) GL3.rebuild(x0 - 300, y0 - 300, x1 + 300, y1 + 300); }
function edDyn(o) { if (GL3 && GL3.dropDyn) GL3.dropDyn(o); }
/* épület áthelyezése: a falai, kellékei, lépcsője és telke vele együtt mozog */
function moveBld(b, nx, ny) { const dx = nx - b.x, dy = ny - b.y; if (!dx && !dy) return; const ox = b.x, oy = b.y; gridDel(b); b.x = nx; b.y = ny; gridAdd(b);
  if (b.stairs) { b.stairs.x += dx; b.stairs.y += dy; } for (const s of b.segs || []) { s.x0 += dx; s.x1 += dx; s.y0 += dy; s.y1 += dy; }
  for (const o of OBJ) if (o !== b && o.b === b.id) { gridDel(o); o.x += dx; o.y += dy; gridAdd(o); edDyn(o); }
  if (b.pad) { padMove(b.pad, dx, dy); const p = b.pad; p[6] = 0; if (p[5] !== 0 || b.kind !== 'aqua') p[4] = Hcalc(p[0], p[1]) - terrDelta(p[0], p[1]); p[6] = 1; }
  for (const r of RUINS) if (r[3] && r[3].b === b) { r[0] += dx; r[1] += dy; }
  bldBase(b); const m = Math.max(b.w, b.d) / 2 + 400; edDirty(Math.min(ox, nx) - m, Math.min(oy, ny) - m, Math.max(ox, nx) + m, Math.max(oy, ny) + m); }
function bldBase(b) { if (b.pad) b.base = b.pad[4] + terrDelta(b.x, b.y) + (b.edz || 0); else if (b.base0 != null) b.base = b.base0 + (b.edz || 0); }
/* transzformáció: [x, y, forgatás (függőleges tengely), méret, magasság a talajhoz képest, dőlés X, dőlés Y, nyújtás X, Y (fel), Z] */
const TRD = [0, 0, 0, 1, 0, 0, 0, 1, 1, 1], VEG = t => t === 'tree' || t === 'bush' || t === 'rock';
const trN = t => TRD.map((d, i) => t && t[i] != null && isFinite(t[i]) ? +t[i] : d);
function setTr(o, x, y, a, s) { return setTrA(o, [x, y, a, s]); }
/* épület: mozgatás, forgatás a közepe körül (falai, kellékei, lépcsője vele fordul), emelés/süllyesztés */
function rotBld(b, a) { const da = a - (b.ea || 0); if (Math.abs(da) < 1e-6) return; const c = Math.cos(da), s = Math.sin(da);
  for (const o of OBJ) if (o !== b && o.b === b.id && o.t !== 'bld') { gridDel(o); const dx = o.x - b.x, dy = o.y - b.y; o.x = b.x + dx * c - dy * s; o.y = b.y + dx * s + dy * c; o.ca = (o.ca || 0) + da; if (o.w) o.gr = Math.hypot(o.w, o.d) / 2; gridAdd(o); edDyn(o); }
  gridDel(b); b.ea = b.ca = a; b.gr = a ? Math.hypot(b.w, b.d) / 2 : 0; gridAdd(b); }
function trBld(b, x, y, a, z) { const ox = b.x, oy = b.y; moveBld(b, x, y); rotBld(b, a); if (!b.pad && b.base0 == null) b.base0 = b.base; b.edz = z; bldBase(b); b.edt = 1;
  for (const o of OBJ) if (o !== b && o.b === b.id) edDyn(o); edDyn(b); const m = Math.max(b.w, b.d) + 400; edDirty(Math.min(ox, x) - m, Math.min(oy, y) - m, Math.max(ox, x) + m, Math.max(oy, y) + m); }
function setTrA(o, tr) { const [x, y, a, s, z, rx, rz, sx, sy, sz] = trN(tr); if (isGroup(o)) return trBld(o, x, y, a, z);
  if (!o.o0) o.o0 = { x: o.x, y: o.y, w: o.w, d: o.d, r: o.r, h: o.h, s: o.s || 1 }; const q = o.o0, ox = o.x, oy = o.y; if (!o.sc) gridDel(o);
  o.x = x; o.y = y; o.X = { a, s, z, rx, rz, sx, sy, sz }; o.ea = 0; o.es = 1; o.edt = 1;
  if (q.w) { o.w = q.w * s * sx; o.d = q.d * s * sz; if (q.h) o.h = q.h * s * sy; o.ca = a; o.gr = a ? Math.hypot(o.w, o.d) / 2 : 0; }
  else if (q.r != null) o.r = q.r / (VEG(o.t) && o.t !== 'rock' ? q.s : 1) * s * Math.max(sx, sz);
  const hg = (q.h || (o.t === 'tree' ? 260 : 90)) * s * sy; o.nz = z > 70 || z + hg < 10 ? 1 : 0;
  if (o.t === 'fire' && o.i != null && FIRES[o.i]) { FIRES[o.i][0] = x; FIRES[o.i][1] = y; }
  if (o.t === 'door' && o.z && ZK[o.z]) { const zz = ZK[o.z]; if (!o.out) zz.at = [x, y]; else if (zz.cu) zz.in = [x + 140, y]; }
  if (!o.sc) gridAdd(o); edDyn(o); const m = Math.max(o.w || 0, o.d || 0, o.r || 0, 120) * Math.max(s * sx, s * sz, s * sy, 1) + 300; edDirty(Math.min(ox, x) - m, Math.min(oy, y) - m, Math.max(ox, x) + m, Math.max(oy, y) + m); }
function delObj(o) { if (o.sc) { SDEL.add(o.uid); SCM.forEach(l => { const i = l.indexOf(o); if (i >= 0) l.splice(i, 1); }); } else { gridDel(o); o.del = 1; if (isGroup(o)) for (const c of OBJ) if (c.b === o.id && c !== o) { gridDel(c); c.del = 1; edDyn(c); } } edDyn(o); edDirty(o.x - 300, o.y - 300, o.x + 300, o.y + 300); }
function undelObj(o) { if (o.sc) { SDEL.delete(o.uid); SCM.clear(); } else { o.del = 0; gridAdd(o); if (isGroup(o)) for (const c of OBJ) if (c.b === o.id && c !== o) { c.del = 0; gridAdd(c); } } edDirty(o.x - 300, o.y - 300, o.x + 300, o.y + 300); }
/* lerakott elem: egyszerű kellék, vagy egész épület/rom (ruin) */
function createAdd(sp) { const n0 = OBJ.length; let made = [];
  if (sp.t === '@rom') { ruin(sp.x, sp.y, sp.k || biomeW(sp.x, sp.y).k, 5000 + (parseInt(String(sp.id).slice(1)) || 0), { tp: sp.tp, dm: sp.dm != null ? sp.dm : .4, cd: sp.cd }); made = OBJ.slice(n0); const nb = made.filter(o => o.t === 'bld'); for (const p of PADS) if (p[5] && !p[6]) { p[4] = Hcalc(p[0], p[1]) - terrDelta(p[0], p[1]); p[6] = 1; } nb.forEach(b => { if (b.pad) { b.pad[6] = 0; b.pad[4] = Hcalc(b.pad[0], b.pad[1]) - terrDelta(b.pad[0], b.pad[1]); b.pad[6] = 1; } bldBase(b); }); }
  else { const o = { ...sp, uid: undefined }; delete o.id; delete o.a; delete o.s; if (o.r == null) o.r = EDR[o.t] != null ? EDR[o.t] : 0; if (VEG(o.t)) { o.rot = 0; o.s = 1; if (o.t === 'rock') o.solid = 1; if (o.t === 'tree') o.solid = o.v !== 9 && o.v !== 2 ? 1 : 0; if (o.t === 'tree' && sp.r == null) o.r = 14; } for (const k of ['ez', 'rx', 'rz', 'sx', 'sy', 'sz']) delete o[k]; if (o.t === 'fire') { o.i = FIRES.length; FIRES.push([o.x, o.y]); FIRE_N.push(sp.n || 'Tábortűz'); } if (o.t === 'chest' && !o.id) o.id = 'e' + sp.id; addO(o); made = [o]; setTrA(o, [sp.x, sp.y, sp.a, sp.s, sp.ez, sp.rx, sp.rz, sp.sx, sp.sy, sp.sz]); }
  made.forEach((o, i) => { UIDS.delete(String(o.uid)); o.uid = i ? sp.id + '_' + i : sp.id; UIDS.set(String(o.uid), o); o.added = sp.id; }); edDirty(sp.x - 400, sp.y - 400, sp.x + 400, sp.y + 400); return made; }
/* alap ütközési sugár a lerakható kellékekhez */
const EDR = { kocka: 0, henger: 50, kup: 50, pillar: 22, statue: 28, brazier: 14, lamp: 8, crate: 15, barrel: 12, altar: 24, anvil: 16, forge: 34, tent: 40, stall: 26, ctower: 70, obelisk: 24, chest: 18, fire: 22, cart: 30, sarc: 0, well: 30 };
function applyMapEdits(m) { if (!m || m.v !== 1) return; try {
  if (m.dun) for (const d of m.dun) { MED.dun.push(d); dunZone(d); }
  if (m.zt) for (const id in m.zt) { const z = ZK[id]; if (!z || !z.hm) continue; for (const [k, d] of m.zt[id]) if (k < z.hm.length) zoneHm(z, k, (z.hm0 || z.hm)[k] + d); }
  if (m.terr) for (const [i, j, d] of m.terr) TED.set(tek(i, j), d);
  if (m.add) for (const sp of m.add) { MED.add.push(sp); MED.nid = Math.max(MED.nid, (parseInt(String(sp.id).slice(1)) || 0) + 1); createAdd(sp); }
  if (m.del) for (const u of m.del) { MED.del.add(String(u)); if (String(u)[0] === 's') SDEL.add(String(u)); else { const o = UIDS.get(String(u)); if (o) delObj(o); } }
  if (m.mod) for (const u in m.mod) { const o = UIDS.get(u), v = m.mod[u]; if (!o) continue; MED.mod.set(u, v); setTrA(o, v); }
  if (TED.size || m.mod) { HTL.clear(); for (const b of BLDS) bldBase(b); } } catch (e) { console.warn('palya.json', e); } }
