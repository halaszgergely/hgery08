/* ---------- kézi pályamódosítások (palya.json) betöltése a generált világra ----------
   Formátum: { v: 1, terr: [[i, j, eltolás], …] (64-es rács), del: [uid, …], mod: { uid: [x, y, szög, méret] }, add: [{ id, t, x, y, a, s, …paraméterek }] }
   A generált tárgyak azonosítója a létrehozásuk sorszáma, a szórt növényzeté 's<cx>_<cy>_<i>', a lerakottaké a saját id-jük. */
const MED = { add: [], del: new Set(), mod: new Map(), nid: 1, dun: [], pre: [], npc: new Map(), en: { mod: new Map(), del: new Set(), add: [] } };
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
/* z: abszolút magasság (rel: régi, talajhoz mért eltolás); null: marad */
function trBld(b, x, y, a, z, rel) { const ox = b.x, oy = b.y; moveBld(b, x, y); rotBld(b, a); if (!b.pad && b.base0 == null) b.base0 = b.base - (b.edz || 0); if (z != null) { const g0 = b.pad ? b.pad[4] + terrDelta(b.x, b.y) : b.base0; b.edz = rel ? z : z - g0; } bldBase(b); b.edt = 1;
  for (const o of OBJ) if (o !== b && o.b === b.id) edDyn(o); edDyn(b); const m = Math.max(b.w, b.d) + 400; edDirty(Math.min(ox, x) - m, Math.min(oy, y) - m, Math.max(ox, x) + m, Math.max(oy, y) + m); }
/* tr[4]: abszolút magasság (központi 0); rel: régi mentés, a talajhoz mérve; hiányzik: a talajon */
function setTrA(o, tr, rel) { const [x, y, a, s, z0, rx, rz, sx, sy, sz] = trN(tr), zin = tr && tr[4] != null && isFinite(tr[4]) ? +tr[4] : null; if (isGroup(o)) return trBld(o, x, y, a, zin, rel); const gw = gzW(x, y), z = zin == null ? gw : rel ? zin + gw : zin;
  if (!o.o0) o.o0 = { x: o.x, y: o.y, w: o.w, d: o.d, r: o.r, h: o.h, s: o.s || 1 }; const q = o.o0, ox = o.x, oy = o.y; if (!o.sc) gridDel(o);
  o.x = x; o.y = y; o.X = { a, s, z, rx, rz, sx, sy, sz }; o.ea = 0; o.es = 1; o.edt = 1;
  if (q.w) { o.w = q.w * s * sx; o.d = q.d * s * sz; if (q.h) o.h = q.h * s * sy; o.ca = a; o.gr = a ? Math.hypot(o.w, o.d) / 2 : 0; }
  else if (q.r != null) o.r = q.r / (VEG(o.t) && o.t !== 'rock' ? q.s : 1) * s * Math.max(sx, sz);
  if (o.t === 'lepcso' || o.t === 'kocka' || o.t === 'henger') { const flat = Math.abs(rx) < .02 && Math.abs(rz) < .02, g = z, top = g + (q.h || 100) * s * sy; o.wk = !flat ? null : o.t === 'lepcso' ? 'ramp' : 'flat'; o.wb = g; o.wt = top; }
  const zr = z - gw;
  const hg = (q.h || (o.t === 'tree' ? 260 : 90)) * s * sy; o.nz = zr > 70 || zr + hg < 10 ? 1 : 0; o.zb = z; o.zt = o.zb + hg;
  if (o.t === 'fire' && o.i != null && FIRES[o.i]) { FIRES[o.i][0] = x; FIRES[o.i][1] = y; }
  if (o.t === 'door' && o.z && ZK[o.z]) { const zz = ZK[o.z]; if (!o.out) zz.at = [x, y]; else if (zz.cu) zz.in = [x + 140, y]; }
  o.ri = o.t === 'henger' && o.pat === 'tegla' && o.r >= 70 ? o.r - (o.th || 40) : 0; if (o.ri) o.wk = null;
  if (!o.sc) gridAdd(o); edDyn(o); if (o.t === 'kocka' || o.t === 'henger' || o.inw) rehost(o, ox, oy); const m = Math.max(o.w || 0, o.d || 0, o.r || 0, 120) * Math.max(s * sx, s * sz, s * sy, 1) + 300; edDirty(Math.min(ox, x) - m, Math.min(oy, y) - m, Math.max(ox, x) + m, Math.max(oy, y) + m); }
function delObj(o) { if (o.inw) setTimeout(() => rehost(o), 0); if (o.sc) { SDEL.add(o.uid); SCM.forEach(l => { const i = l.indexOf(o); if (i >= 0) l.splice(i, 1); }); } else { gridDel(o); o.del = 1; if (isGroup(o)) for (const c of OBJ) if (c.b === o.id && c !== o) { gridDel(c); c.del = 1; edDyn(c); } } edDyn(o); edDirty(o.x - 300, o.y - 300, o.x + 300, o.y + 300); }
function undelObj(o) { if (o.inw) setTimeout(() => rehost(o), 0); if (o.sc) { SDEL.delete(o.uid); SCM.clear(); } else { o.del = 0; gridAdd(o); if (isGroup(o)) for (const c of OBJ) if (c.b === o.id && c !== o) { c.del = 0; gridAdd(c); } } edDirty(o.x - 300, o.y - 300, o.x + 300, o.y + 300); }
/* saját objektum (több elemből mentve): elemei a középponthoz képest, forgatással, méretezéssel */
const gzW = (x, y) => { const z = zoneAt(x, y); return z ? zoneH(z, x, y) : GH(x, y); };
function preItems(sp, rel) { const P = MED.pre.find(p => p.id === sp.p); if (!P) return []; const A = sp.a || 0, S = sp.s || 1, c = Math.cos(A), s = Math.sin(A), g0 = sp.ez == null ? gzW(sp.x, sp.y) : rel ? gzW(sp.x, sp.y) + sp.ez : sp.ez;
  return P.items.map(it => { const x = sp.x + S * (it.lx * c - it.ly * s), y = sp.y + S * (it.lx * s + it.ly * c), q = { ...it, x, y, a: (it.a || 0) + A, s: (it.s || 1) * S, ez: g0 + S * (it.lh || 0) }; delete q.lx; delete q.ly; delete q.lh; return q; }); }
function mk1(sp, rel) { const o = { ...sp, uid: undefined }; delete o.id; delete o.a; delete o.s; if (o.r == null) o.r = EDR[o.t] != null ? EDR[o.t] : 0; if (VEG(o.t)) { o.rot = 0; o.s = 1; if (o.t === 'rock') o.solid = 1; if (o.t === 'tree') o.solid = o.v !== 9 && o.v !== 2 ? 1 : 0; if (o.t === 'tree' && sp.r == null) o.r = 14; } for (const k of ['ez', 'rx', 'rz', 'sx', 'sy', 'sz']) delete o[k]; if (o.t === 'fire') { o.i = FIRES.length; FIRES.push([o.x, o.y]); FIRE_N.push(sp.n || 'Tábortűz'); } if (o.t === 'chest' && !o.id) o.id = 'e' + sp.id; addO(o); setTrA(o, [sp.x, sp.y, sp.a, sp.s, sp.ez, sp.rx, sp.rz, sp.sx, sp.sy, sp.sz], rel); return o; }
/* lerakott elem: egyszerű kellék, vagy egész épület/rom (ruin) */
function createAdd(sp, rel) { const n0 = OBJ.length; let made = [];
  if (sp.t === '@rom') { ruin(sp.x, sp.y, sp.k || biomeW(sp.x, sp.y).k, 5000 + (parseInt(String(sp.id).slice(1)) || 0), { tp: sp.tp, dm: sp.dm != null ? sp.dm : .4, cd: sp.cd }); made = OBJ.slice(n0); const nb = made.filter(o => o.t === 'bld'); for (const p of PADS) if (p[5] && !p[6]) { p[4] = Hcalc(p[0], p[1]) - terrDelta(p[0], p[1]); p[6] = 1; } nb.forEach(b => { if (b.pad) { b.pad[6] = 0; b.pad[4] = Hcalc(b.pad[0], b.pad[1]) - terrDelta(b.pad[0], b.pad[1]); b.pad[6] = 1; } bldBase(b); }); }
  else if (sp.t === '@pre') { made = preItems(sp, rel).map((it, i) => mk1({ ...it, id: sp.id + '_' + i })); if (rel) sp.ez = (sp.ez || 0) + gzW(sp.x, sp.y); }
  else { made = [mk1(sp, rel)]; if (rel && made[0].X) sp.ez = Math.round(made[0].X.z); }
  made.forEach((o, i) => { UIDS.delete(String(o.uid)); o.uid = i ? sp.id + '_' + i : sp.id; UIDS.set(String(o.uid), o); o.added = sp.id; }); let m = 400; for (const o of made) m = Math.max(m, hyp(o.x - sp.x, o.y - sp.y) + 400); edDirty(sp.x - m, sp.y - m, sp.x + m, sp.y + m); return made; }
/* ---------- falnyílás: a falba tett boltív/ajtó/kapu lyukat vág a fal köveibe és az ütközésébe ---------- */
const WALLT = o => o.t === 'kocka' && o.X && !o.del && Math.abs(o.X.rx) < .03 && Math.abs(o.X.rz) < .03;
/* üreges bástya (kőfal mintájú, legalább 70-es sugarú henger) */
const CYLT = o => o.t === 'henger' && o.X && !o.del && o.ri > 0 && Math.abs(o.X.rx) < .03 && Math.abs(o.X.rz) < .03;
function cylHoles(w) { const out = [], rm = (w.r + w.ri) / 2, th = w.r - w.ri; near(w.x, w.y, w.r + 300, q => { if (!q.inw || q.del || !q.X || out.some(h => h.q === q)) return; const dx = q.x - w.x, dy = q.y - w.y, d = hyp(dx, dy); if (Math.abs(d - rm) > th / 2 + 30) return; const k = q.X.s || 1, gw = (q.gw || 100) * k; out.push({ q, ang: Math.atan2(dy, dx) - (w.X.a || 0), hw: gw / 2, y0: q.X.z - w.X.z, hh: (q.gh || 150) * k, r: q.arch ? gw / 2 : 0 }); }); return out.map(({ q, ...h }) => h); }
/* a fal nyílásai a fal saját keretében: { x: közép, hw: fél szélesség, y0: alja a fal aljától, hh: egyenes rész, r: ív sugara } */
function wallHoles(w) { const out = [], c = Math.cos(w.ca || 0), s = Math.sin(w.ca || 0), R = Math.hypot(w.w, w.d) / 2 + 400;
  near(w.x, w.y, R, q => { if (!q.inw || q.del || !q.X) return; const dx = q.x - w.x, dy = q.y - w.y, lx = dx * c + dy * s, lz = -dx * s + dy * c; if (Math.abs(lz) > w.d / 2 + 20 || Math.abs(lx) > w.w / 2 + 10) return; if (Math.abs(Math.sin((q.X.a || 0) - (w.ca || 0))) > .1) return; const k = q.X.s || 1, gw = (q.gw || 100) * k;
    if (!out.some(h => h.q === q)) out.push({ q, x: lx, hw: gw / 2, y0: q.X.z - w.X.z, hh: (q.gh || 150) * k, r: q.arch ? gw / 2 : 0 }); }); return out.map(({ q, ...h }) => h); }
/* a környező falak nyílásait újraszámolja (ütközéshez, rajzhoz), és újrarajzolja őket */
function rehost(o, ox, oy) { const pts = [[o.x, o.y]]; if (ox != null) pts.push([ox, oy]); const seen = new Set();
  for (const [px, py] of pts) near(px, py, o.t === 'kocka' || o.t === 'henger' ? 10 : 900, w => { if (!(WALLT(w) || CYLT(w)) || seen.has(w)) return; seen.add(w); const prev = JSON.stringify(w.hl || []); w.hl = CYLT(w) ? cylHoles(w) : wallHoles(w); if (JSON.stringify(w.hl) !== prev && o.t !== 'kocka' && o.t !== 'henger') { const m = Math.hypot(w.w, w.d) / 2 + 100; edDirty(w.x - m, w.y - m, w.x + m, w.y + m); } });
  if (o.t === 'kocka' && WALLT(o)) o.hl = wallHoles(o); if (CYLT(o)) o.hl = cylHoles(o); }
/* alap ütközési sugár a lerakható kellékekhez */
const EDR = { kocka: 0, henger: 50, kup: 50, lepcso: 0, kapu: 0, pillar: 22, statue: 28, brazier: 14, lamp: 8, crate: 15, barrel: 12, altar: 24, anvil: 16, forge: 34, tent: 40, stall: 26, ctower: 70, obelisk: 24, chest: 18, fire: 22, cart: 30, sarc: 0, well: 30 };
function applyMapEdits(m) { SPAWN.forEach((s, i) => { if (s.si == null) s.si = i; }); if (!m || m.v !== 1) return; try {
  if (m.pre) MED.pre.push(...m.pre);
  if (m.npc) for (const id in m.npc) { const n = NPCS.find(q => q.id === id), v = m.npc[id]; if (!n) continue; n.x = v[0]; n.y = v[1]; if (v[2] != null) n.a = v[2]; MED.npc.set(id, v); }
  if (m.dun) for (const d of m.dun) { MED.dun.push(d); dunZone(d); }
  if (m.zt) for (const id in m.zt) { const z = ZK[id]; if (!z || !z.hm) continue; for (const [k, d] of m.zt[id]) if (k < z.hm.length) zoneHm(z, k, (z.hm0 || z.hm)[k] + d); }
  if (m.terr) for (const [i, j, d] of m.terr) TED.set(tek(i, j), d);
  if (m.add) for (const sp of m.add) { MED.add.push(sp); MED.nid = Math.max(MED.nid, (parseInt(String(sp.id).slice(1)) || 0) + 1); createAdd(sp, !m.za); }
  if (m.del) for (const u of m.del) { MED.del.add(String(u)); if (String(u)[0] === 's') SDEL.add(String(u)); else { const o = UIDS.get(String(u)); if (o) delObj(o); } }
  if (m.mod) for (const u in m.mod) { const o = UIDS.get(u), v = m.mod[u]; if (!o) continue; setTrA(o, v, !m.za); const w = trN(v); w[4] = o.t === 'bld' ? Math.round(o.base) : o.X ? Math.round(o.X.z) : w[4]; MED.mod.set(u, w); }
  if (m.en) { const E = m.en; for (const k in E.mod || {}) { const s = SPAWN[+k]; if (s) { const v = E.mod[k]; s.x = v[0]; s.y = v[1]; if (v[2] != null) s.lv = v[2]; if (v[3]) s.t = v[3]; if (v[4] != null) s.z = v[4]; MED.en.mod.set(+k, v); } } for (const k of E.del || []) { const s = SPAWN[+k]; if (s) { s.off = 1; MED.en.del.add(+k); } }
    for (const a of E.add || []) { MED.en.add.push(a); MED.nid = Math.max(MED.nid, (parseInt(String(a.id).slice(1)) || 0) + 1); SPAWN.push({ t: a.t, x: a.x, y: a.y, lv: a.lv || 3, eid: a.id, z: a.z }); } }
  if (TED.size || m.mod) { HTL.clear(); for (const b of BLDS) bldBase(b); }
  for (const o of OBJ) if (o.inw && !o.del) rehost(o); } catch (e) { console.warn('palya.json', e); } }
