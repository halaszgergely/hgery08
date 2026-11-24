/* ---------- kézi pályamódosítások (palya.json) betöltése a generált világra ----------
   Formátum: { v: 1, terr: [[i, j, eltolás], …] (64-es rács), del: [uid, …], mod: { uid: [x, y, szög, méret] }, add: [{ id, t, x, y, a, s, …paraméterek }] }
   A generált tárgyak azonosítója a létrehozásuk sorszáma, a szórt növényzeté 's<cx>_<cy>_<i>', a lerakottaké a saját id-jük. */
const MED = { add: [], del: new Set(), mod: new Map(), nid: 1 };
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
function bldBase(b) { if (b.pad) b.base = b.pad[4] + terrDelta(b.x, b.y); }
/* egyszerű tárgy helyzete, forgatása, mérete – az eredeti méreteket megőrzi, így a módosítás mindig az eredetihez képest számol */
function setTr(o, x, y, a, s) { if (isGroup(o)) return moveBld(o, x, y); if (!o.o0) o.o0 = { x: o.x, y: o.y, w: o.w, d: o.d, r: o.r, h: o.h, s: o.s || 1 };
  const ox = o.x, oy = o.y; if (!o.sc) gridDel(o); o.x = x; o.y = y; const k = s || 1;
  if (o.t === 'wall') { const q = Math.round((a || 0) / (Math.PI / 2)) & 1; o.w = (q ? o.o0.d : o.o0.w) * k; o.d = (q ? o.o0.w : o.o0.d) * k; if (o.o0.h) o.h = o.o0.h * k; o.ea = 0; }
  else if (o.t === 'tree' || o.t === 'rock' || o.t === 'bush') { o.rot = a || 0; o.s = k; if (o.o0.r) o.r = o.o0.r / (o.o0.s || 1) * k; }
  else { o.ea = a || 0; o.es = k; if (o.o0.r) o.r = o.o0.r * k; } o.edt = 1;
  if (o.t === 'fire' && o.i != null && FIRES[o.i]) { FIRES[o.i][0] = x; FIRES[o.i][1] = y; }
  if (!o.sc) gridAdd(o); edDyn(o); const m = Math.max(o.w || 0, o.d || 0, o.r || 0, 120) + 200; edDirty(Math.min(ox, x) - m, Math.min(oy, y) - m, Math.max(ox, x) + m, Math.max(oy, y) + m); }
function delObj(o) { if (o.sc) { SDEL.add(o.uid); SCM.forEach(l => { const i = l.indexOf(o); if (i >= 0) l.splice(i, 1); }); } else { gridDel(o); o.del = 1; if (isGroup(o)) for (const c of OBJ) if (c.b === o.id && c !== o) { gridDel(c); c.del = 1; edDyn(c); } } edDyn(o); edDirty(o.x - 300, o.y - 300, o.x + 300, o.y + 300); }
function undelObj(o) { if (o.sc) { SDEL.delete(o.uid); SCM.clear(); } else { o.del = 0; gridAdd(o); if (isGroup(o)) for (const c of OBJ) if (c.b === o.id && c !== o) { c.del = 0; gridAdd(c); } } edDirty(o.x - 300, o.y - 300, o.x + 300, o.y + 300); }
/* lerakott elem: egyszerű kellék, vagy egész épület/rom (ruin) */
function createAdd(sp) { const n0 = OBJ.length; let made = [];
  if (sp.t === '@rom') { ruin(sp.x, sp.y, sp.k || biomeW(sp.x, sp.y).k, 5000 + (parseInt(String(sp.id).slice(1)) || 0), { tp: sp.tp, dm: sp.dm != null ? sp.dm : .4, cd: sp.cd }); made = OBJ.slice(n0); const nb = made.filter(o => o.t === 'bld'); for (const p of PADS) if (p[5] && !p[6]) { p[4] = Hcalc(p[0], p[1]) - terrDelta(p[0], p[1]); p[6] = 1; } nb.forEach(b => { if (b.pad) { b.pad[6] = 0; b.pad[4] = Hcalc(b.pad[0], b.pad[1]) - terrDelta(b.pad[0], b.pad[1]); b.pad[6] = 1; } bldBase(b); }); }
  else { const o = { ...sp, uid: undefined }; delete o.id; delete o.a; delete o.s; if (o.r == null) o.r = EDR[o.t] != null ? EDR[o.t] : 0; if (o.t === 'tree' || o.t === 'rock' || o.t === 'bush') { o.rot = sp.a || 0; o.s = sp.s || 1; if (o.t === 'rock') o.solid = 1; if (o.t === 'tree') o.solid = o.v !== 9 && o.v !== 2 ? 1 : 0; if (o.t === 'tree' && sp.r == null) o.r = 14 * (sp.s || 1); } if (o.t === 'fire') { o.i = FIRES.length; FIRES.push([o.x, o.y]); FIRE_N.push(sp.n || 'Tábortűz'); } if (o.t === 'chest' && !o.id) o.id = 'e' + sp.id; addO(o); made = [o]; if (o.t !== 'tree' && o.t !== 'rock' && o.t !== 'bush') { o.ea = sp.a || 0; o.es = sp.s || 1; o.o0 = { x: o.x, y: o.y, r: o.r / (sp.s || 1), w: o.w, d: o.d, h: o.h }; if (o.t === 'wall') setTr(o, o.x, o.y, sp.a || 0, sp.s || 1); } }
  made.forEach((o, i) => { UIDS.delete(String(o.uid)); o.uid = i ? sp.id + '_' + i : sp.id; UIDS.set(String(o.uid), o); o.added = sp.id; }); edDirty(sp.x - 400, sp.y - 400, sp.x + 400, sp.y + 400); return made; }
/* alap ütközési sugár a lerakható kellékekhez */
const EDR = { pillar: 22, statue: 28, brazier: 14, lamp: 8, crate: 15, barrel: 12, altar: 24, anvil: 16, forge: 34, tent: 40, stall: 26, ctower: 70, obelisk: 24, chest: 18, fire: 22, cart: 30, sarc: 0, well: 30 };
function applyMapEdits(m) { if (!m || m.v !== 1) return; try {
  if (m.terr) for (const [i, j, d] of m.terr) TED.set(tek(i, j), d);
  if (m.add) for (const sp of m.add) { MED.add.push(sp); MED.nid = Math.max(MED.nid, (parseInt(String(sp.id).slice(1)) || 0) + 1); createAdd(sp); }
  if (m.del) for (const u of m.del) { MED.del.add(String(u)); if (String(u)[0] === 's') SDEL.add(String(u)); else { const o = UIDS.get(String(u)); if (o) delObj(o); } }
  if (m.mod) for (const u in m.mod) { const o = UIDS.get(u), v = m.mod[u]; if (!o) continue; MED.mod.set(u, v); setTr(o, v[0], v[1], v[2], v[3]); }
  if (TED.size || m.mod) { HTL.clear(); for (const b of BLDS) bldBase(b); } } catch (e) { console.warn('palya.json', e); } }
