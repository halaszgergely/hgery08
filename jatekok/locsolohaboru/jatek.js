// Locsolóháború – hiteles szimuláció (a gazda futtatja 30 ütemmel), botok, ellenfelek, bináris állapot.
import { mapOf, movePlayer, raycast, overlap, pointSolid, inZone, eyeH, cactusHit, PR, PH, CH, B_JUMP, B_CROUCH, B_RUN, B_FIRE, B_RELOAD, B_AIM } from './vilag.js?v=202611230454';
export const TICK = 1 / 30, HIST = 32;
export const MODES = [
  { id: 'ffa', n: 'Mindenki mindenki ellen', d: '15 kiütésig vagy 5 percig.', goal: 15, tmax: 300 },
  { id: 'tdm', n: 'Csapat-deathmatch', d: 'Két csapat, 25 kiütésig vagy 6 percig.', teams: 1, goal: 25, tmax: 360 },
  { id: 'ctf', n: 'Locsolófej-rablás', d: 'Hozd el az ellenfél Arany Locsolófejét a saját bázisodra – 3 pontig.', teams: 1, goal: 3, tmax: 420 },
  { id: 'coop', n: 'Szilárd ellen', d: 'Együtt a kaktuszhullámok és Szikkadt Szilárd ellen.', coop: 1, tmax: 0 }
];
export const WEAPONS = [
  { n: 'Kerti pisztoly', mag: 20, cd: .16, dmg: 8, range: 32, spread: .012, cost: 1, reload: 1.1, pel: 1, spd: 28 },
  { n: 'Szórófej-shotgun', mag: 6, cd: .85, dmg: 5.5, range: 13, spread: .085, cost: 3, reload: 1.6, pel: 9, spd: 19 },
  { n: 'Nagynyomású mesterlövész', mag: 4, cd: 1.15, dmg: 48, range: 90, spread: .03, aimSpread: .0015, cost: 6, reload: 2, pel: 1, spd: 75 },
  { n: 'Locsolótömlő', mag: 80, cd: .045, dmg: 2.4, range: 15, spread: .03, cost: .6, reload: 1.6, pel: 1, spd: 19 },
  { n: 'Vízibomba', mag: 3, cd: .9, dmg: 60, range: 0, cost: 12, reload: 1.4, bomb: 1 }
];
export const GOLD = { dmg: 7, cd: .05, range: 36, t: 8 };
export const COLORS = ['#6cc6ff', '#ff7a6e', '#5ee08a', '#e8b656', '#c79bff', '#ffa94d', '#4dd6c7', '#ff8fc7'], TEAMC = ['#4aa8ff', '#ff5a4d'];
const BOTN = ['Locsi', 'Csepi', 'Slagos', 'Párás Pista', 'Zuhany', 'Tócsa', 'Harmat', 'Öntöző Ödön'];
export const ENT = [{ n: 'Kaktusz', r: .45, h: 2, hp: 55, sp: 3.4 }, { n: 'Köpködő kaktusz', r: .45, h: 1.8, hp: 40, sp: 2.8 }, { n: 'Szikkadt Szilárd', r: 1.3, h: 4, hp: 1500, sp: 2.4 }];

const dirOf = (yaw, pitch) => [-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
function rayBox(ox, oy, oz, d, a0, a1, a2, b0, b1, b2, maxT) { let t0 = 0, t1 = maxT; const o = [ox, oy, oz], A = [a0, a1, a2], B = [b0, b1, b2];
  for (let i = 0; i < 3; i++) { if (Math.abs(d[i]) < 1e-9) { if (o[i] < A[i] || o[i] > B[i]) return -1; continue; } let ta = (A[i] - o[i]) / d[i], tb = (B[i] - o[i]) / d[i]; if (ta > tb) { const q = ta; ta = tb; tb = q; } if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) return -1; } return t0; }

/* ---------- világ ---------- */
// cfg: { mode, map, slots: [{ uid, name, color, bot }] } – a slot sorszáma a játékos azonosítója
export function newWorld(cfg) {
  const M = mapOf(cfg.map), mi = Math.max(0, MODES.findIndex(m => m.id === cfg.mode)), md = MODES[mi];
  const W = { cfg, M, mode: mi, md, tick: 0, t: 0, over: 0, P: [], pr: [], en: [], ev: [], score: [0, 0], wave: 0, waveT: 4, boss: null, eid: 1, gold: { up: 1, rt: 0 }, res: null, rng: 1,
    flags: M.bases.map(b => ({ st: 0, s: -1, x: b[0], y: 0, z: b[1], rt: 0 })), hist: Array.from({ length: HIST }, () => ({ tick: -1, p: new Float32Array(32) })) };
  cfg.slots.forEach((s, i) => { const team = md.coop ? 0 : md.teams ? i % 2 : i;
    const p = { slot: i, uid: s.uid, name: s.name || BOTN[i % BOTN.length], color: s.color || COLORS[i % 8], bot: !!s.bot, team, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 1, cr: 0, yaw: 0, pitch: 0, wet: 0, tank: 100, w: 0, ammo: WEAPONS.map(x => x.mag), cd: 0, rl: 0, alive: 1, rsp: 0, dry: 0, gold: 0, prot: 0, carry: -1, hm: 0, ccd: 0,
      kills: 0, deaths: 0, st: { hits: 0, kos: 0, water: 0, caps: 0 }, inp: { mx: 0, my: 0, b: 0, w: 0, yaw: 0, pitch: 0 }, q: [], ack: 0, vt: 0, ai: { t: 0, sk: .5 + Math.random() * .4, see: null, seeT: 0, goal: null, side: 1, stuck: 0, turn: 0, role: i >> 1 & 1 }, gone: 0 };
    spawn(W, p, true); W.P.push(p); });
  return W;
}
function spawn(W, p, first) { const M = W.M, l = W.md.teams ? M.spawns.filter(s => s[2] === p.team) : M.spawns; let best = l[p.slot % l.length], bv = -1;
  if (!first && !W.md.teams) for (const s of l) { let dmin = 1e9; for (const q of W.P) if (q !== p && q.alive && !q.gone) dmin = Math.min(dmin, Math.hypot(q.x - s[0], q.z - s[1])); const v = dmin + Math.random() * 6; if (v > bv) { bv = v; best = s; } }
  else if (!first) best = l[Math.floor(Math.random() * l.length)];
  p.x = best[0] + (Math.random() - .5) * 1.5; p.z = best[1] + (Math.random() - .5) * 1.5; p.y = 0; for (let k = 0; k < 8 && overlap(M, p.x, p.y, p.z, PR, PH); k++) p.y += .5;
  Object.assign(p, { vx: 0, vy: 0, vz: 0, wet: 0, tank: 100, alive: 1, gold: 0, prot: first ? 0 : 1.5, rl: 0, cd: .3, carry: -1, cr: 0 }); p.ammo = WEAPONS.map(x => x.mag);
  p.yaw = p.inp.yaw = Math.atan2(p.x, p.z); p.pitch = 0; }
const foe = (W, a, b) => a !== b && !W.md.coop && (!W.md.teams || a.team !== b.team);

function hurt(W, p, dmg, by, k, w = 0) { if (!p.alive || p.gold > 0 || p.prot > 0 || W.over) return false; const o = by != null ? W.P[by] : null; if (o && o !== p && !foe(W, o, p)) return false;
  p.wet += dmg; p.dry = 3; if (k) { p.vx += k[0]; p.vy += k[1]; p.vz += k[2]; if (k[1] > 2) p.g = 0; }
  if (o && o !== p) { o.hm = (o.hm + 1) & 255; o.st.hits++; }
  if (p.wet >= 100) { p.wet = 100; p.alive = 0; p.deaths++; p.rsp = W.md.coop ? 6 : 3.5; dropFlag(W, p);
    if (o && o !== p) { o.kills++; o.st.kos++; if (W.md.teams && W.md.id === 'tdm') W.score[o.team]++; }
    W.ev.push({ e: 'ko', a: o && o !== p ? o.slot : 255, b: p.slot, w }); }
  return true; }
function dropFlag(W, p) { if (p.carry < 0) return; const f = W.flags[p.carry]; f.st = 2; f.s = -1; f.x = p.x; f.y = p.y; f.z = p.z; f.rt = 20; p.carry = -1; W.ev.push({ e: 'flag', t: W.flags.indexOf(f), ev: 'drop', s: p.slot }); }

/* lövés visszatekeréssel: a célpontok helye abban az ütemben, amit a lövő a képernyőjén látott */
function aimed(W, p) { const rt = Math.max(W.tick - 12, Math.min(W.tick, p.vt | 0)), h = W.hist[rt % HIST]; return h.tick === rt ? h.p : null; }
function shoot(W, p, w) { const W0 = WEAPONS[w], gold = p.gold > 0, M = W.M, eh = eyeH(p), ox = p.x, oy = p.y + eh, oz = p.z, back = aimed(W, p);
  const pel = gold ? 1 : W0.pel, sp = gold ? .008 : w === 2 && p.inp.b & B_AIM && Math.hypot(p.vx, p.vz) < 2 ? W0.aimSpread : W0.spread * (p.g ? 1 : 1.6), range = gold ? GOLD.range : W0.range, dmg0 = gold ? GOLD.dmg : W0.dmg;
  for (let k = 0; k < pel; k++) { const d = dirOf(p.yaw + (Math.random() - .5) * 2 * sp, p.pitch + (Math.random() - .5) * 2 * sp); const wh = raycast(M, ox, oy, oz, d[0], d[1], d[2], range); let best = wh ? wh.t : range, tgt = null, head = 0;
    for (const q of W.P) { if (q === p || !q.alive || q.gone || !foe(W, p, q) && !W.md.coop) continue; if (W.md.coop) continue;
      let qx = q.x, qy = q.y, qz = q.z, qh = q.cr ? CH : PH; if (back) { const i = q.slot * 4; if (back[i + 3] > 0) { qx = back[i]; qy = back[i + 1]; qz = back[i + 2]; qh = back[i + 3]; } }
      const t = rayBox(ox, oy, oz, d, qx - PR - .05, qy, qz - PR - .05, qx + PR + .05, qy + qh + .05, qz + PR + .05, best); if (t >= 0 && t < best) { best = t; tgt = q; head = oy + d[1] * t > qy + qh - .34 ? 1 : 0; } }
    for (const e of W.en) { const E = ENT[e.ty], t = rayBox(ox, oy, oz, d, e.x - E.r, e.y, e.z - E.r, e.x + E.r, e.y + E.h, e.z + E.r, best); if (t >= 0 && t < best) { best = t; tgt = e; head = 0; } }
    if (!tgt) continue; let dmg = dmg0; if (!gold && best > range * .6) dmg *= Math.max(.35, 1 - (best - range * .6) / (range * .4) * .65); if (head) dmg *= w === 2 ? 2 : 1.5; const kb = gold ? 2.5 : w === 2 ? 3 : w === 1 ? 1.1 : .5;
    if (tgt.ty != null) { tgt.hp -= dmg; p.hm = (p.hm + 1) & 255; p.st.hits++; if (tgt.ty !== 2) { tgt.vx += d[0] * kb * 2; tgt.vz += d[2] * kb * 2; } if (tgt.hp <= 0 && !tgt.dead) { tgt.dead = 1; p.kills++; p.st.kos++; W.ev.push({ e: 'eko', a: p.slot, ty: tgt.ty, x: tgt.x, y: tgt.y, z: tgt.z }); } }
    else hurt(W, tgt, dmg, p.slot, [d[0] * kb, Math.max(0, d[1]) * kb + (w === 2 ? 1.5 : 0), d[2] * kb], w); } }
function weapon(W, p, dt) { const inp = p.inp; if (inp.w !== p.w && inp.w >= 0 && inp.w < 5) { p.w = inp.w; p.rl = 0; p.cd = Math.max(p.cd, .25); }
  p.cd -= dt; const w = p.w, W0 = WEAPONS[w];
  if (p.rl > 0) { if ((p.rl -= dt) <= 0) { const need = W0.mag - p.ammo[w], can = Math.min(need, Math.floor(p.tank / W0.cost + 1e-6)); p.ammo[w] += can; p.tank -= can * W0.cost; } return; }
  if (p.gold > 0) { if (inp.b & B_FIRE && p.cd <= 0) { p.cd = GOLD.cd; shoot(W, p, w === 4 ? 0 : w); } return; }
  if ((inp.b & B_RELOAD || (inp.b & B_FIRE && p.ammo[w] <= 0)) && p.ammo[w] < W0.mag && p.tank >= W0.cost) { p.rl = W0.reload; return; }
  if (!(inp.b & B_FIRE) || p.cd > 0 || p.ammo[w] <= 0) return; p.cd = W0.cd; p.ammo[w]--; p.st.water += W0.cost;
  if (W0.bomb) { const d = dirOf(p.yaw, p.pitch), e = eyeH(p); W.pr.push({ k: 0, x: p.x + d[0] * .6, y: p.y + e + d[1] * .6, z: p.z + d[2] * .6, vx: d[0] * 14 + p.vx * .5, vy: d[1] * 14 + 3.5 + p.vy * .3, vz: d[2] * 14 + p.vz * .5, o: p.slot, t: 2.6 }); }
  else shoot(W, p, w); }
function boom(W, x, y, z, o) { W.ev.push({ e: 'boom', x: +x.toFixed(2), y: +y.toFixed(2), z: +z.toFixed(2) }); const R = 4.6;
  for (const q of W.P) { if (!q.alive || q.gone) continue; const cy = q.y + .9, dx = q.x - x, dy = cy - y, dz = q.z - z, d = Math.hypot(dx, dy, dz); if (d > R) continue; const ry = raycast(W.M, x, y + .05, z, dx / (d || 1), dy / (d || 1), dz / (d || 1), d); if (ry && ry.t < d - .4) continue;
    const k = 1 - d / R, n = d || 1; hurt(W, q, 60 * k * (q.slot === o ? .5 : 1), o, [dx / n * 9 * k, 4 + 4 * k, dz / n * 9 * k], 4); }
  for (const e of W.en) { const d = Math.hypot(e.x - x, e.y + 1 - y, e.z - z); if (d < R + ENT[e.ty].r) { e.hp -= 60 * (1 - Math.min(1, d / (R + ENT[e.ty].r))) + 5; const p = W.P[o]; if (e.hp <= 0 && !e.dead && p) { e.dead = 1; p.kills++; p.st.kos++; W.ev.push({ e: 'eko', a: o, ty: e.ty, x: e.x, y: e.y, z: e.z }); } } } }

export function step(W) {
  const dt = TICK, M = W.M; W.tick++; if (W.over) { W.over += dt; return; } W.t += dt;
  for (const p of W.P) { if (p.gone) continue;
    if (p.bot) think(W, p); else if (p.q.length) { const i = p.q.shift(); p.inp = i; p.ack = i.seq; p.vt = i.vt; if (p.q.length > 4) p.q.splice(0, p.q.length - 2); }
    if (!p.alive) { if ((p.rsp -= dt) <= 0) spawn(W, p); continue; }
    p.yaw = p.inp.yaw; p.pitch = Math.max(-1.5, Math.min(1.5, p.inp.pitch));
    const pool = movePlayer(p, p.inp, dt, M);
    if (p.prot > 0) p.prot -= dt; if (p.gold > 0) p.gold -= dt; if (p.ccd > 0) p.ccd -= dt;
    if (p.dry > 0) p.dry -= dt; else p.wet = Math.max(0, p.wet - 4 * dt);
    let tap = false; for (const q of M.taps) if ((p.x - q[0]) ** 2 + (p.z - q[1]) ** 2 < 2.4 * 2.4 && p.y < 1.5) tap = true; p.tank = Math.min(100, p.tank + (tap ? 45 : pool ? 14 : 0) * dt);
    if (p.ccd <= 0 && cactusHit(M, p.x, p.y, p.z)) { p.ccd = .6; const a = Math.atan2(p.x, p.z); hurt(W, p, 9, null, [Math.sin(a) * -3, 2.5, Math.cos(a) * -3]); }
    weapon(W, p, dt);
    if (W.gold.up && Math.hypot(p.x - M.gold[0], p.z - M.gold[2]) < 1.3 && Math.abs(p.y - M.gold[1]) < 1.2) { W.gold.up = 0; W.gold.rt = 45; p.gold = GOLD.t; p.wet = 0; W.ev.push({ e: 'gold', s: p.slot }); } }
  if (!W.gold.up && (W.gold.rt -= dt) <= 0) W.gold.up = 1;
  // játékosok egymásnak ütközése (vízszintesen)
  for (let i = 0; i < W.P.length; i++) for (let j = i + 1; j < W.P.length; j++) { const a = W.P[i], b = W.P[j]; if (!a.alive || !b.alive || a.gone || b.gone || Math.abs(a.y - b.y) > 1.5) continue; const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz); if (d < PR * 2 && d > .01) { const k = (PR * 2 - d) / d / 2; if (!overlap(M, a.x - dx * k, a.y, a.z - dz * k, PR, a.cr ? CH : PH)) { a.x -= dx * k; a.z -= dz * k; } if (!overlap(M, b.x + dx * k, b.y, b.z + dz * k, PR, b.cr ? CH : PH)) { b.x += dx * k; b.z += dz * k; } } }
  // lövedékek: 0 vízibomba, 1 tűzgolyó
  for (const q of W.pr) { if (q.dead) continue; q.t -= dt; q.vy -= (q.k ? 3 : 18) * dt; const nx = q.x + q.vx * dt, ny = q.y + q.vy * dt, nz = q.z + q.vz * dt; let hit = q.t <= 0 || pointSolid(M, nx, ny, nz) || Math.abs(nx) > M.W / 2 || Math.abs(nz) > M.D / 2;
    if (!hit) for (const p of W.P) if (p.alive && !p.gone && (q.k || p.slot !== q.o) && nx > p.x - PR - .15 && nx < p.x + PR + .15 && nz > p.z - PR - .15 && nz < p.z + PR + .15 && ny > p.y && ny < p.y + PH + .1) { hit = p; break; }
    if (hit) { q.dead = 1; if (q.k === 0) boom(W, q.x, Math.max(.1, q.y), q.z, q.o); else if (hit !== true && hit.slot != null) { hurt(W, hit, 14, null, [q.vx * .2, 2, q.vz * .2]); } continue; }
    q.x = nx; q.y = ny; q.z = nz; }
  W.pr = W.pr.filter(q => !q.dead);
  if (W.md.id === 'ctf') flagsStep(W, dt); if (W.md.coop) coop(W, dt);
  const h = W.hist[W.tick % HIST]; h.tick = W.tick; h.p.fill(0); for (const p of W.P) if (p.alive && !p.gone) { const i = p.slot * 4; h.p[i] = p.x; h.p[i + 1] = p.y; h.p[i + 2] = p.z; h.p[i + 3] = p.cr ? CH : PH; }
  rules(W);
}
function flagsStep(W, dt) { const M = W.M;
  for (const [t, f] of W.flags.entries()) { if (f.st === 1) { const c = W.P[f.s]; if (!c || !c.alive || c.gone) { f.st = 2; f.rt = 20; f.s = -1; } else { f.x = c.x; f.y = c.y; f.z = c.z; } } if (f.st === 2 && (f.rt -= dt) <= 0) { f.st = 0; f.x = M.bases[t][0]; f.y = 0; f.z = M.bases[t][1]; W.ev.push({ e: 'flag', t, ev: 'ret', s: 255 }); } }
  for (const p of W.P) { if (!p.alive || p.gone) continue; const ef = W.flags[1 - p.team], of = W.flags[p.team];
    if (ef.st !== 1 && p.carry < 0 && Math.hypot(p.x - ef.x, p.z - ef.z) < 1.4 && Math.abs(p.y - ef.y) < 1.5) { ef.st = 1; ef.s = p.slot; p.carry = 1 - p.team; W.ev.push({ e: 'flag', t: 1 - p.team, ev: 'take', s: p.slot }); }
    if (of.st === 2 && Math.hypot(p.x - of.x, p.z - of.z) < 1.4 && Math.abs(p.y - of.y) < 1.5) { of.st = 0; of.x = M.bases[p.team][0]; of.y = 0; of.z = M.bases[p.team][1]; W.ev.push({ e: 'flag', t: p.team, ev: 'ret', s: p.slot }); }
    if (p.carry >= 0 && of.st === 0 && Math.hypot(p.x - M.bases[p.team][0], p.z - M.bases[p.team][1]) < 2) { const f = W.flags[p.carry]; f.st = 0; f.s = -1; f.x = M.bases[p.carry][0]; f.y = 0; f.z = M.bases[p.carry][1]; p.carry = -1; W.score[p.team]++; p.st.caps++; p.kills += 2; W.ev.push({ e: 'flag', t: 1 - p.team, ev: 'cap', s: p.slot }); } } }
function addEnemy(W, ty, x, z) { if (W.en.length >= 30) return; const n = W.P.filter(p => !p.gone).length, E = ENT[ty], hp = ty === 2 ? 1500 + 450 * n : E.hp + 6 * W.wave;
  const e = { id: W.eid++ & 255 || W.eid++ & 255, ty, x, y: 0, z, vx: 0, vz: 0, yaw: 0, hp, max: hp, cd: 1 + Math.random() * 2, st: 0 }; for (let k = 0; k < 6 && overlap(W.M, e.x, 0, e.z, E.r, E.h); k++) { e.x *= .9; e.z *= .9; } W.en.push(e); if (ty === 2) W.boss = e; }
function coop(W, dt) { const M = W.M, live = W.P.filter(p => !p.gone), alive = live.filter(p => p.alive);
  if (!W.en.length && !W.boss && (W.waveT -= dt) <= 0) { W.wave++; W.waveT = 6; W.ev.push({ e: 'wave', n: W.wave }); const sp = () => M.ens[Math.floor(Math.random() * M.ens.length)];
    if (W.wave >= 5) { const s = sp(); addEnemy(W, 2, s[0] * .8, s[1] * .8); for (let i = 0; i < 4; i++) addEnemy(W, 0, ...sp()); } else { const n = 3 + W.wave * 2 + Math.floor(live.length * 1.5); for (let i = 0; i < n; i++) { const s = sp(); addEnemy(W, W.wave >= 2 && i % 3 === 2 ? 1 : 0, s[0] + (Math.random() - .5) * 4, s[1] + (Math.random() - .5) * 4); } } }
  for (const e of W.en) { if (e.dead) continue; const E = ENT[e.ty]; let t = null, td = 1e9; for (const p of alive) { const d = Math.hypot(p.x - e.x, p.z - e.z); if (d < td) { td = d; t = p; } }
    let mx = 0, mz = 0; if (t) { const dx = (t.x - e.x) / (td || 1), dz = (t.z - e.z) / (td || 1); e.yaw = Math.atan2(-dx, -dz); const keep = e.ty === 1 ? 12 : e.ty === 2 ? 7 : 0, dir = td > keep ? 1 : td < keep - 4 ? -1 : 0; mx = dx * dir; mz = dz * dir;
      if (e.st > 0) { e.st -= dt; const a = e.side || 1; const ox = mx, oz = mz; mx = -oz * a; mz = ox * a; }
      if (e.ty === 0 && td < E.r + PR + .5 && Math.abs(t.y - e.y) < 1.5 && (e.cd -= dt) <= 0) { e.cd = 1; hurt(W, t, 16, null, [dx * 5, 3, dz * 5]); }
      else if (e.ty && (e.cd -= dt) <= 0) { const sy = e.y + E.h * .75; if (e.ty === 1) { e.cd = 2.4; const dy = t.y + 1 - sy, l = Math.hypot(t.x - e.x, dy, t.z - e.z) || 1; W.pr.push({ k: 1, x: e.x, y: sy, z: e.z, vx: (t.x - e.x) / l * 15, vy: dy / l * 15 + td * .1, vz: (t.z - e.z) / l * 15, t: 3 }); }
        else { e.cd = 3; const a0 = Math.random() * 6.28; for (let i = 0; i < 10; i++) W.pr.push({ k: 1, x: e.x, y: sy, z: e.z, vx: Math.cos(a0 + i * .628) * 11, vy: 1, vz: Math.sin(a0 + i * .628) * 11, t: 3 }); if (W.en.length < 12) { const s = M.ens[Math.floor(Math.random() * M.ens.length)]; addEnemy(W, 0, s[0], s[1]); } } } }
    e.vx *= Math.exp(-4 * dt); e.vz *= Math.exp(-4 * dt); const sp = E.sp * (1 + W.wave * .04), nx = e.x + (mx * sp + e.vx) * dt, nz = e.z + (mz * sp + e.vz) * dt; let moved = 0;
    if (!overlap(M, nx, .05, e.z, E.r, E.h)) { e.x = nx; moved++; } if (!overlap(M, e.x, .05, nz, E.r, E.h)) { e.z = nz; moved++; } if ((mx || mz) && moved < 2 && e.st <= 0) { e.st = 1 + Math.random(); const free = sd => !overlap(M, e.x - mz * sd * 1.2, .05, e.z + mx * sd * 1.2, E.r, E.h); e.side = free(1) && !free(-1) ? 1 : free(-1) && !free(1) ? -1 : Math.random() < .5 ? 1 : -1; }
    // ha sokáig nem jut közelebb, a pálya szélén (a játékosoktól távol) újra feltűnik
    if (t) { if (td < (e.best ?? 1e9) - 1) { e.best = td; e.prog = 0; } else if ((e.prog = (e.prog || 0) + dt) > 9) { const s = M.ens.slice().sort((a, b) => Math.hypot(b[0] - t.x, b[1] - t.z) - Math.hypot(a[0] - t.x, a[1] - t.z))[Math.floor(Math.random() * 2)]; if (!overlap(M, s[0], .05, s[1], E.r, E.h)) { e.x = s[0]; e.z = s[1]; } e.best = 1e9; e.prog = 0; } } }
  for (let i = 0; i < W.en.length; i++) for (let j = i + 1; j < W.en.length; j++) { const a = W.en[i], b = W.en[j], R = ENT[a.ty].r + ENT[b.ty].r, dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz); if (d < R && d > .01) { const k = (R - d) / d / 2; a.x -= dx * k; a.z -= dz * k; b.x += dx * k; b.z += dz * k; } }
  const bossDead = W.boss && W.boss.dead; W.en = W.en.filter(e => !e.dead); if (bossDead) { W.boss = null; return end(W, live.map(p => p.slot), 1); }
  if (!alive.length && W.t > 3) end(W, [], 0); }
function rules(W) { if (W.over) return; const md = W.md, live = W.P.filter(p => !p.gone);
  if (md.id === 'ffa') { const top = live.slice().sort((a, b) => b.kills - a.kills)[0]; if (top && top.kills >= md.goal || W.t >= md.tmax) return end(W, top && (live.filter(p => p.kills === top.kills).length === 1) ? [top.slot] : []); }
  else if (md.teams) { const g = md.goal; if (W.score[0] >= g || W.score[1] >= g || W.t >= md.tmax) return end(W, W.score[0] === W.score[1] ? [] : live.filter(p => p.team === (W.score[0] > W.score[1] ? 0 : 1)).map(p => p.slot)); } }
function end(W, win, boss) { if (W.over) return; W.over = 1e-3; const pl = W.P.filter(p => !p.gone), sc = p => p.kills * 3 + p.st.hits * .02 + p.st.caps * 5 + (win.includes(p.slot) ? 2 : 0) - p.deaths * .5;
  const mvp = pl.slice().sort((a, b) => sc(b) - sc(a))[0];
  W.res = { e: 'end', win, boss: boss ? 1 : 0, mode: W.md.id, map: W.M.id, t: Math.round(W.t), mvp: mvp ? mvp.slot : -1, score: W.score.slice(), wave: W.wave,
    pl: pl.map(p => ({ s: p.slot, uid: p.uid, n: p.name, c: p.color, team: p.team, bot: p.bot ? 1 : 0, kos: p.st.kos, deaths: p.deaths, hits: p.st.hits, water: Math.round(p.st.water), caps: p.st.caps })) }; W.ev.push(W.res); }

/* ---------- botok ---------- */
function think(W, p) { const a = p.ai, M = W.M, I = p.inp; p.vt = W.tick; I.b = 0; if (!p.alive) return;
  const eye = p.y + eyeH(p); let tgt = a.see, td = tgt ? Math.hypot(tgt.x - p.x, tgt.z - p.z) : 1e9;
  if ((W.tick + p.slot) % 5 === 0) { a.see = null; let bd = 1e9; const list = W.md.coop ? W.en : W.P.filter(q => q.alive && !q.gone && foe(W, p, q) && !(q.gold > 0 && Math.random() < .5));
    for (const q of list) { const ty = q.ty != null, qh = ty ? ENT[q.ty].h * .6 : 1.2, dx = q.x - p.x, dy = q.y + qh - eye, dz = q.z - p.z, d = Math.hypot(dx, dy, dz); if (d > 60 || d > bd) continue; const r = raycast(M, p.x, eye, p.z, dx / d, dy / d, dz / d, d); if (!r || r.t > d - .3) { bd = d; a.see = q; } }
    if (a.see) a.last = [a.see.x, a.see.z]; tgt = a.see; td = tgt ? Math.hypot(tgt.x - p.x, tgt.z - p.z) : 1e9; }
  const ammo = p.ammo[p.w], low = p.tank < 18 && ammo < WEAPONS[p.w].mag * .3;
  // cél kiválasztása
  let goal = null; if (W.md.id === 'ctf') { const ef = W.flags[1 - p.team], of = W.flags[p.team], base = M.bases[p.team];
    if (p.carry >= 0) goal = base; else if (of.st === 1) { const c = W.P[of.s]; goal = c ? [c.x, c.z] : base; } else if (of.st === 2) goal = [of.x, of.z]; else if (a.role || !tgt) goal = ef.st === 1 ? null : [ef.x, ef.z]; }
  if (!goal && W.gold.up && Math.hypot(M.gold[0] - p.x, M.gold[2] - p.z) < 14) goal = [M.gold[0], M.gold[2]];
  if (low) { let bd = 1e9; for (const q of M.taps) { const d = Math.hypot(q[0] - p.x, q[1] - p.z); if (d < bd) { bd = d; goal = q; } } if (bd < 1.6) goal = null; }
  if (!goal && !tgt) { if (!a.goal || Math.hypot(a.goal[0] - p.x, a.goal[1] - p.z) < 3 || (a.t -= TICK) <= 0) { a.t = W.md.coop ? 2 : 8; a.goal = a.last && Math.random() < .6 ? a.last : (W.md.coop ? (W.en.length ? (e => [e.x, e.z])(W.en.reduce((b, e) => Math.hypot(e.x - p.x, e.z - p.z) < Math.hypot(b.x - p.x, b.z - p.z) ? e : b)) : [0, 0]) : M.spawns[Math.floor(Math.random() * M.spawns.length)].slice(0, 2)); a.last = null; } goal = a.goal; }
  // fegyver
  if (tgt && !low) { const want = td < 6 ? 1 : td > 24 ? 2 : td < 11 && p.tank > 40 ? 3 : 0; if (td > 7 && td < 16 && p.ammo[4] > 0 && Math.random() < .004) I.w = 4; else if (I.w === 4 && p.cd > 0) I.w = 4; else if (p.ammo[want] > 0 || p.tank > 10) I.w = want; }
  if (p.ammo[p.w] <= 0 && p.rl <= 0) I.b |= B_RELOAD;
  // mozgás
  let face = null, mx = 0, my = 0;
  if (goal) { const dx = goal[0] - p.x, dz = goal[1] - p.z; face = Math.atan2(-dx, -dz); mx = 1; I.b |= Math.hypot(dx, dz) > 10 ? B_RUN : 0; }
  if (tgt) { const want = W0range(p) * .55; mx = goal && (p.carry >= 0 || low) ? 1 : td > want ? .8 : td < want * .5 ? -.6 : 0; my = a.side * .8; if ((a.t2 = (a.t2 || 0) - TICK) <= 0) { a.t2 = .6 + Math.random() * 1.2; a.side = -a.side; } }
  const moveYaw = goal && !(tgt && !(p.carry >= 0 || low)) ? face : tgt ? Math.atan2(-(tgt.x - p.x), -(tgt.z - p.z)) : face ?? I.yaw;
  // akadály: előre szondázunk, ha kell, ugrunk vagy kitérünk
  const fwx = -Math.sin(moveYaw), fwz = -Math.cos(moveYaw), r = raycast(M, p.x, p.y + .3, p.z, fwx, 0, fwz, 1.3);
  if (r && mx > 0) { const r2 = raycast(M, p.x, p.y + 1.35, p.z, fwx, 0, fwz, 1.3); if (!r2) I.b |= B_JUMP; else { a.stuck += TICK; } } else a.stuck = Math.max(0, a.stuck - TICK);
  if (a.stuck > .4) { a.turn = .9; a.tside = Math.random() < .5 ? 1 : -1; a.stuck = 0; } if (a.turn > 0) { a.turn -= TICK; my = a.tside; mx = .3; }
  // célzás (a test a mozgás irányát, a tekintet a célpontot követi – a mozgásvektort a nézéshez képest fordítjuk)
  let aimYaw = moveYaw, aimPitch = 0; if (tgt) { const ty = tgt.ty != null, qh = ty ? ENT[tgt.ty].h * .55 : (tgt.cr ? CH : PH) * .6, lead = td / (WEAPONS[p.w].spd || 20) * a.sk; const tx = tgt.x + (tgt.vx || 0) * lead, tz = tgt.z + (tgt.vz || 0) * lead, dy = tgt.y + qh - eye;
    aimYaw = Math.atan2(-(tx - p.x), -(tz - p.z)) + Math.sin(W.t * 1.7 + p.slot) * (1 - a.sk) * .08; aimPitch = Math.atan2(dy, Math.hypot(tx - p.x, tz - p.z)) + (p.w === 4 ? .18 + td * .012 : 0); }
  let dy = aimYaw - I.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); I.yaw += dy * Math.min(1, TICK * (4 + 9 * a.sk)); I.pitch += (aimPitch - I.pitch) * Math.min(1, TICK * 8);
  const rel = moveYaw - I.yaw, c = Math.cos(rel), s = Math.sin(rel); I.mx = mx * c - my * s * 0; I.my = 0; if (mx || my) { const vx = -Math.sin(moveYaw) * mx + Math.cos(moveYaw) * my, vz = -Math.cos(moveYaw) * mx - Math.sin(moveYaw) * my, fx = -Math.sin(I.yaw), fz = -Math.cos(I.yaw), rx = Math.cos(I.yaw), rz = -Math.sin(I.yaw); I.mx = vx * fx + vz * fz; I.my = vx * rx + vz * rz; }
  if (tgt && Math.abs(dy) < .1 && td < W0range(p) * .95 && !low) { I.b |= B_FIRE; if (p.w === 2) I.b |= B_AIM; }
}
const W0range = p => p.gold > 0 ? GOLD.range : p.w === 4 ? 18 : WEAPONS[p.w].range;

/* ---------- bináris üzenetek ---------- */
const clampI16 = v => Math.max(-32767, Math.min(32767, Math.round(v))), U16 = a => Math.round((((a % 6.2832) + 6.2832) % 6.2832) / 6.2832 * 65535) & 65535;
export function encodeSnap(W) { const pl = W.P.filter(p => !p.gone), n = 32 + pl.length * 30 + W.en.length * 10 + W.pr.length * 7, b = new ArrayBuffer(n), v = new DataView(b); let o = 0;
  v.setUint8(o++, 1); v.setUint32(o, W.tick, true); o += 4; v.setUint8(o++, W.mode | (W.over ? 128 : 0)); v.setUint16(o, Math.max(0, Math.round((W.md.tmax ? W.md.tmax - W.t : W.t) * 10)), true); o += 2;
  v.setUint8(o++, W.score[0]); v.setUint8(o++, W.score[1]); v.setUint8(o++, W.wave); v.setUint8(o++, W.boss ? Math.max(1, Math.round(W.boss.hp / W.boss.max * 255)) : 0); v.setUint8(o++, W.gold.up);
  for (let t = 0; t < 2; t++) { const f = W.flags[t] || { st: 0, s: 255, x: 0, y: 0, z: 0 }; v.setUint8(o++, f.st); v.setUint8(o++, f.s < 0 ? 255 : f.s); v.setInt16(o, clampI16(f.x * 100), true); v.setInt16(o + 2, clampI16(f.y * 100), true); v.setInt16(o + 4, clampI16(f.z * 100), true); o += 6; }
  v.setUint8(o++, pl.length);
  for (const p of pl) { let f = (p.alive ? 1 : 0) | (p.inp.b & B_FIRE && p.alive && p.rl <= 0 && (p.ammo[p.w] > 0 || p.gold > 0) && p.cd > (p.gold > 0 ? 0 : WEAPONS[p.w].cd - .1) ? 2 : 0) | (p.cr ? 4 : 0) | (p.gold > 0 ? 8 : 0) | (p.carry >= 0 ? 16 : 0) | (p.g ? 32 : 0) | (p.inp.b & B_AIM ? 64 : 0) | (p.bot ? 128 : 0);
    v.setUint8(o++, p.slot); v.setUint8(o++, f); v.setUint8(o++, p.w | (p.rl > 0 ? 16 : 0) | (p.prot > 0 ? 32 : 0) | (p.inp.b & B_FIRE ? 64 : 0));
    for (const x of [p.x, p.y, p.z, p.vx, p.vy, p.vz]) { v.setInt16(o, clampI16(x * 100), true); o += 2; }
    v.setUint16(o, U16(p.yaw), true); v.setInt16(o + 2, clampI16(p.pitch * 10000), true); o += 4;
    v.setUint8(o++, Math.round(p.wet * 2.55)); v.setUint8(o++, Math.round(p.tank * 2.55)); v.setUint8(o++, Math.min(255, p.ammo[p.w])); v.setUint8(o++, Math.min(255, p.kills)); v.setUint8(o++, Math.min(255, p.deaths)); v.setUint8(o++, p.hm); v.setUint16(o, p.ack & 65535, true); o += 2; }
  v.setUint8(o++, W.en.length); for (const e of W.en) { v.setUint8(o++, e.id); v.setUint8(o++, e.ty); v.setInt16(o, clampI16(e.x * 100), true); v.setInt16(o + 2, clampI16(e.y * 100), true); v.setInt16(o + 4, clampI16(e.z * 100), true); o += 6; v.setUint8(o++, U16(e.yaw) >> 8); v.setUint8(o++, Math.max(1, Math.round(Math.max(0, e.hp) / e.max * 255))); }
  const pn = Math.min(255, W.pr.length); v.setUint8(o++, pn); for (let i = 0; i < pn; i++) { const q = W.pr[i]; v.setUint8(o++, q.k); v.setInt16(o, clampI16(q.x * 100), true); v.setInt16(o + 2, clampI16(q.y * 100), true); v.setInt16(o + 4, clampI16(q.z * 100), true); o += 6; }
  return b.slice(0, o); }
export function decodeSnap(buf) { const v = new DataView(buf); let o = 1; const S = { tick: v.getUint32(o, true) }; o += 4; const m = v.getUint8(o++); S.mode = m & 127; S.over = m >> 7; S.time = v.getUint16(o, true) / 10; o += 2;
  S.score = [v.getUint8(o++), v.getUint8(o++)]; S.wave = v.getUint8(o++); S.boss = v.getUint8(o++) / 255; S.gold = v.getUint8(o++); S.flags = [];
  for (let t = 0; t < 2; t++) { S.flags.push({ st: v.getUint8(o), s: v.getUint8(o + 1), x: v.getInt16(o + 2, true) / 100, y: v.getInt16(o + 4, true) / 100, z: v.getInt16(o + 6, true) / 100 }); o += 8; }
  S.P = []; for (let n = v.getUint8(o++); n > 0; n--) { const p = { slot: v.getUint8(o), f: v.getUint8(o + 1) }; const w = v.getUint8(o + 2); o += 3; p.w = w & 15; p.rl = w >> 4 & 1; p.prot = w >> 5 & 1; p.trig = w >> 6 & 1;
    const r = []; for (let i = 0; i < 6; i++) { r.push(v.getInt16(o, true) / 100); o += 2; } [p.x, p.y, p.z, p.vx, p.vy, p.vz] = r; p.yaw = v.getUint16(o, true) / 65535 * 6.2832; p.pitch = v.getInt16(o + 2, true) / 10000; o += 4;
    p.wet = v.getUint8(o++) / 2.55; p.tank = v.getUint8(o++) / 2.55; p.ammo = v.getUint8(o++); p.kills = v.getUint8(o++); p.deaths = v.getUint8(o++); p.hm = v.getUint8(o++); p.ack = v.getUint16(o, true); o += 2;
    p.alive = p.f & 1; p.cr = p.f >> 2 & 1; p.gold = p.f >> 3 & 1; p.carry = p.f >> 4 & 1; p.g = p.f >> 5 & 1; S.P.push(p); }
  S.en = []; for (let n = v.getUint8(o++); n > 0; n--) { S.en.push({ id: v.getUint8(o), ty: v.getUint8(o + 1), x: v.getInt16(o + 2, true) / 100, y: v.getInt16(o + 4, true) / 100, z: v.getInt16(o + 6, true) / 100, yaw: v.getUint8(o + 8) / 255 * 6.2832, hp: v.getUint8(o + 9) / 255 }); o += 10; }
  S.pr = []; for (let n = v.getUint8(o++); n > 0; n--) { S.pr.push({ k: v.getUint8(o), x: v.getInt16(o + 1, true) / 100, y: v.getInt16(o + 3, true) / 100, z: v.getInt16(o + 5, true) / 100 }); o += 7; }
  return S; }
export const encodeInput = i => { const b = new ArrayBuffer(15), v = new DataView(b); v.setUint8(0, 2); v.setUint16(1, i.seq & 65535, true); v.setUint8(3, i.b); v.setUint8(4, i.w); v.setInt8(5, Math.round(Math.max(-1, Math.min(1, i.mx)) * 127)); v.setInt8(6, Math.round(Math.max(-1, Math.min(1, i.my)) * 127)); v.setUint16(7, U16(i.yaw), true); v.setInt16(9, clampI16(i.pitch * 10000), true); v.setUint32(11, i.vt >>> 0, true); return b; };
export const decodeInput = buf => { const v = new DataView(buf); return { seq: v.getUint16(1, true), b: v.getUint8(3), w: v.getUint8(4), mx: v.getInt8(5) / 127, my: v.getInt8(6) / 127, yaw: v.getUint16(7, true) / 65535 * 6.2832, pitch: v.getInt16(9, true) / 10000, vt: v.getUint32(11, true) }; };

/* gazdaváltás: az utolsó pillanatképből építjük újra a világot */
export function worldFromSnap(cfg, S, stats = {}) { const W = newWorld(cfg); W.tick = S.tick; W.score = S.score.slice(); W.wave = S.wave; W.t = W.md.tmax ? Math.max(0, W.md.tmax - S.time) : S.time; W.waveT = 3; W.gold.up = S.gold; W.gold.rt = 20;
  S.flags.forEach((f, t) => { if (W.flags[t]) Object.assign(W.flags[t], { st: f.st === 1 ? 2 : f.st, s: -1, x: f.x, y: f.y, z: f.z, rt: 15 }); });
  for (const p of W.P) { const s = S.P.find(q => q.slot === p.slot); if (!s) { p.gone = 1; p.alive = 0; continue; } Object.assign(p, { x: s.x, y: s.y, z: s.z, vx: s.vx, vy: s.vy, vz: s.vz, yaw: s.yaw, pitch: s.pitch, wet: s.wet, tank: s.tank, alive: s.alive, kills: s.kills, deaths: s.deaths, w: s.w, cr: s.cr, ack: s.ack, carry: -1, gold: s.gold ? 3 : 0 });
    p.inp.yaw = s.yaw; p.inp.pitch = s.pitch; p.inp.w = s.w; if (!s.alive) p.rsp = 3; if (stats[p.slot]) Object.assign(p.st, stats[p.slot]); }
  for (const e of S.en) { const E = ENT[e.ty], max = e.ty === 2 ? 1500 + 450 * W.P.length : E.hp + 6 * W.wave, n = { id: e.id, ty: e.ty, x: e.x, y: e.y, z: e.z, vx: 0, vz: 0, yaw: e.yaw, hp: max * e.hp, max, cd: 2, st: 0 }; W.en.push(n); if (e.ty === 2) W.boss = n; } W.eid = 128;
  return W; }
