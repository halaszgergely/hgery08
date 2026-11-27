// Víz-fegyverek: vízpisztoly, locsolótömlő, vízbomba, öntözőpuska, vízágyú (+ a locsolókocsi és a tank fecskendője). Találat: elázás, nem vér.
import * as THREE from 'three';
import * as W from './world.js?v=202611271126';
import { hurt } from './physics.js?v=202611271126';

export const WEAPONS = [
  { id: 'kez', n: 'Puszta kéz', icon: '✋', rate: 2, ammo: Infinity },
  { id: 'pisztoly', n: 'Vízpisztoly', icon: '🔫', rate: 4.5, speed: 40, n1: 1, spread: .012, size: .32, dmg: 20, ammo: 120, clip: 12, reload: 1.1 },
  { id: 'tomlo', n: 'Locsolótömlő', icon: '〰', rate: 34, speed: 21, n1: 1, spread: .05, size: .26, dmg: 3.2, ammo: 600, auto: 1, push: 1.2 },
  { id: 'bomba', n: 'Vízbomba', icon: '💧', rate: 1.1, speed: 15, n1: 1, spread: 0, size: .55, dmg: 1, ammo: 8, bomb: 1 },
  { id: 'puska', n: 'Öntözőpuska', icon: '⋔', rate: 1.2, speed: 30, n1: 9, spread: .09, size: .24, dmg: 9, ammo: 30, clip: 6, reload: 1.8 },
  { id: 'agyu', n: 'Vízágyú', icon: '⛲', rate: 22, speed: 34, n1: 2, spread: .025, size: .42, dmg: 8, ammo: 800, auto: 1, push: 5 }
];
export function createWeapons(ctx) {
  const fx = ctx.fx, V = new THREE.Vector3();
  const st = { cur: 1, owned: [1, 1, 0, 0, 0, 0], ammo: [Infinity, 120, 0, 0, 0, 0], clip: [0, 12, 0, 0, 6, 0], cool: 0, reloadT: 0 };
  function shoot(o, w, mx, my, mz, dx, dy, dz, owner) {
    if (w.bomb) { fx.emit({ x: mx, y: my, z: mz, vx: dx * w.speed, vy: dy * w.speed + 5, vz: dz * w.speed, life: 3, size: .55, grow: .55, r: .25, g: .6, b: 1, a: 1, a1: 1, dmg: 1, owner, kind: 'bomb' }); return; }
    for (let i = 0; i < w.n1; i++) fx.water(mx, my, mz, dx * w.speed, dy * w.speed + (w.auto ? 1.2 : .3), dz * w.speed, 1, w.spread, w.size, w.dmg, owner, w.id);
  }
  function bombBurst(x, y, z, owner) {
    fx.splash(x, y, z, 60, 2.2); for (let i = 0; i < 24; i++) fx.steam(x + (Math.random() - .5) * 4, y + Math.random() * 2, z + (Math.random() - .5) * 4); ctx.audio?.splashBig(x, y, z);
    const R = 7; for (const p of ctx.peds.list) { const d = Math.hypot(p.x - x, p.z - z); if (d < R) { ctx.peds.soak(p, p.x - x, p.z - z, 3); if (owner === ctx.player) ctx.crime('ped', p.x, p.z); } }
    ctx.peds.scare(x, z, 30);
    for (const a of ctx.actors.list) { const d = Math.hypot(a.pos.x - x, a.pos.z - z); if (d < R) ctx.actors.damage(a, 80 * (1 - d / R) + 20, x, z, owner); }
    for (const b of ctx.vehicles) { if (b.tram) continue; const d = Math.hypot(b.pos.x - x, b.pos.z - z); if (d < R + 1) { hurt(b, 260 * (1 - d / (R + 1)), ctx.env); const k = 6 * (1 - d / (R + 1)) * 2000 / Math.max(800, b.J.m); b.vel.x += (b.pos.x - x) / (d || 1) * k; b.vel.z += (b.pos.z - z) / (d || 1) * k; if (owner === ctx.player && b.J.cop) ctx.crime('copcar', x, z); } }
    if (owner !== ctx.player) { const d = Math.hypot(ctx.player.pos.x - x, ctx.player.pos.z - z); if (d < R) ctx.hurtPlayer(40 * (1 - d / R), 'vízbomba'); }
  }
  fx.onHit = (p, _, gy) => {
    if (p.kind === 'bomb') { if (gy !== undefined) { bombBurst(p.x, gy, p.z, p.owner); return true; }
      // tárgyon / emberen is robban
      for (const q of ctx.peds.list) if (Math.abs(q.x - p.x) < .6 && Math.abs(q.z - p.z) < .6 && p.y - q.y < 1.9) { bombBurst(p.x, p.y, p.z, p.owner); return true; }
      for (const b of ctx.vehicles) if (Math.abs(b.pos.x - p.x) < b.J.w / 2 + .3 && Math.abs(b.pos.z - p.z) < b.J.l / 2 && p.y - b.pos.y < b.J.h && b !== p.owner?.veh) { bombBurst(p.x, p.y, p.z, p.owner); return true; }
      return false; }
    if (gy !== undefined) { ctx.onWaterGround?.(p.x, p.z, p); return true; }
    const pl = ctx.player, own = p.owner, k = p.dmg;
    // gyalogosok
    for (const q of ctx.peds.list) { if (Math.abs(q.x - p.x) > .5 || Math.abs(q.z - p.z) > .5 || p.y < q.y || p.y > q.y + 1.85) continue;
      q.hits = (q.hits || 0) + k; q.soak = Math.min(1, q.soak + k * .02); if (q.hits > 14 || p.kind === 'agyu') { q.hits = 0; ctx.peds.soak(q, p.vx, p.vz); } else if (q.st === 'walk') { q.st = 'flee'; q.t = 7; q.fleeX = p.vx; q.fleeZ = p.vz; }
      if (own === pl) ctx.crime('ped', q.x, q.z); ctx.peds.scare(q.x, q.z, 18); fx.splash(p.x, p.y, p.z, 3, .5); return true; }
    // szereplők (rendőr, verőember)
    for (const a of ctx.actors.list) { if (a === own || a.hp <= 0 || Math.abs(a.pos.x - p.x) > .5 || Math.abs(a.pos.z - p.z) > .5 || p.y < a.pos.y || p.y > a.pos.y + 1.85) continue; if (own && own !== pl && own.team === a.team) continue;
      ctx.actors.damage(a, k, p.x - p.vx, p.z - p.vz, own); if (p.kind === 'agyu' || p.kind === 'tomlo') { a.pos.x += p.vx * .004 * (p.kind === 'agyu' ? 3 : 1); a.pos.z += p.vz * .004 * (p.kind === 'agyu' ? 3 : 1); } fx.splash(p.x, p.y, p.z, 3, .5); return true; }
    // játékos
    if (own !== pl && !pl.veh && Math.abs(pl.pos.x - p.x) < .5 && Math.abs(pl.pos.z - p.z) < .5 && p.y > pl.pos.y && p.y < pl.pos.y + 1.85) { ctx.hurtPlayer(k * .5, 'víz'); fx.splash(p.x, p.y, p.z, 3, .5); return true; }
    // járművek
    for (const b of ctx.vehicles) { if (b === own?.veh || b === own) continue; const c = Math.cos(b.yaw), s = Math.sin(b.yaw), dx = p.x - b.pos.x, dz = p.z - b.pos.z, lx = dx * c - dz * s, lz = dx * s + dz * c;
      if (Math.abs(lx) > b.J.w / 2 || Math.abs(lz) > b.J.l / 2 || p.y < b.pos.y || p.y > b.pos.y + b.J.h) continue;
      if (b.hp < b.maxHp * .12 && !b.wrecked) { b.burnT = Math.max(0, b.burnT - .25); b.hp = Math.min(b.maxHp * .13, b.hp + 4); if (Math.random() < .3) fx.steam(p.x, p.y, p.z); return true; }
      if (!b.tram) { hurt(b, k * (p.kind === 'pisztoly' || p.kind === 'puska' ? .9 : .25), ctx.env); if (p.kind === 'agyu') { const m = 900 / Math.max(900, b.J.m); b.vel.x += p.vx * .012 * m; b.vel.z += p.vz * .012 * m; } }
      if (own === pl) b.lastDamager = pl;
      if (own === pl && b.J.cop) ctx.crime('copcar', b.pos.x, b.pos.z); if (b.onShot) b.onShot(p); fx.splash(p.x, p.y, p.z, 2, .4); return true; }
    return false;
  };
  const api = { st, WEAPONS, shoot, bombBurst,
    give(i, n) { st.owned[i] = 1; st.ammo[i] = Math.min(9999, (st.ammo[i] || 0) + n); if (WEAPONS[i].clip && !st.clip[i]) st.clip[i] = Math.min(WEAPONS[i].clip, st.ammo[i]); },
    select(i) { if (st.owned[i]) { st.cur = i; st.reloadT = 0; ctx.audio?.click(); } },
    cycle(d) { for (let k = 1; k <= 6; k++) { const i = (st.cur + d * k + 60) % 6; if (st.owned[i]) { api.select(i); return; } } },
    refill() { for (let i = 1; i < 6; i++) if (st.owned[i]) { const w = WEAPONS[i]; st.ammo[i] = Math.max(st.ammo[i], w.ammo); if (w.clip) st.clip[i] = w.clip; } },
    /* játékos tüzelése gyalog */
    update(dt, A, cam, pl) {
      st.cool = Math.max(st.cool - dt, -dt); if (st.reloadT > 0) { st.reloadT -= dt; if (st.reloadT <= 0) { const w = WEAPONS[st.cur]; st.clip[st.cur] = Math.min(w.clip, st.ammo[st.cur]); } return; }
      const w = WEAPONS[st.cur]; if (!A.fire || st.cool > 0 || pl.veh || pl.swim || pl.downT > 0) return;
      if (w.id === 'kez') { st.cool = .5; pl.aimT = .4; const fx2 = -Math.sin(pl.yaw), fz2 = -Math.cos(pl.yaw);
        for (const q of ctx.peds.list) if (Math.hypot(q.x - pl.pos.x - fx2, q.z - pl.pos.z - fz2) < 1.2) { ctx.peds.soak(q, fx2, fz2, .3); ctx.crime('ped', q.x, q.z); }
        for (const a of ctx.actors.list) if (Math.hypot(a.pos.x - pl.pos.x - fx2, a.pos.z - pl.pos.z - fz2) < 1.2) ctx.actors.damage(a, 15, pl.pos.x, pl.pos.z, pl); return; }
      if (st.ammo[st.cur] <= 0) { if (st.cool <= 0) { ctx.audio?.click(); st.cool = .4; } return; }
      if (w.clip && st.clip[st.cur] <= 0) { st.reloadT = w.reload; ctx.audio?.reload(); return; }
      const shots = w.auto ? Math.max(1, Math.min(6, Math.round(-st.cool * w.rate) + 1)) : 1; st.cool = Math.max(-.2, st.cool) + 1 / w.rate * shots; pl.aimT = .6; pl.yaw = Math.atan2(-cam.dir.x, -cam.dir.z);
      const rx = Math.cos(pl.yaw), rz = -Math.sin(pl.yaw), mx = pl.pos.x + rx * .3 - Math.sin(pl.yaw) * .5, my = pl.pos.y + 1.4, mz = pl.pos.z + rz * .3 - Math.cos(pl.yaw) * .5;
      // célpont: a kamera irányában 70 m-re
      const tx = cam.pos.x + cam.dir.x * 70, ty = cam.pos.y + cam.dir.y * 70, tz = cam.pos.z + cam.dir.z * 70; V.set(tx - mx, ty - my, tz - mz).normalize();
      for (let k = 0; k < shots && st.ammo[st.cur] > 0; k++) { shoot(pl, w, mx, my, mz, V.x, V.y, V.z, pl); st.ammo[st.cur]--; if (w.clip) st.clip[st.cur]--; }
      ctx.audio?.shot(w.id); ctx.peds.scare(pl.pos.x, pl.pos.z, w.auto ? 12 : 22);
    },
    /* jármű-fecskendő (locsolókocsi, tank) */
    vehicleSpray(b, dt, fire, cam) {
      if (!fire) { b.sprayT = 0; return; } b.sprayT = (b.sprayT || 0) + dt * 26; let n = Math.min(8, Math.floor(b.sprayT)); b.sprayT -= n; if (!n) return;
      let mx, my, mz, d;
      if (b.kind === 'tank') { const yaw = b.yaw + b.turretYaw, p = b.gunPitch; d = V.set(-Math.sin(yaw) * Math.cos(p), Math.sin(-p) * -1, -Math.cos(yaw) * Math.cos(p)); const L = 4.9; mx = b.pos.x - Math.sin(yaw) * L; my = b.pos.y + 1.75; mz = b.pos.z - Math.cos(yaw) * L; d.set(-Math.sin(yaw), Math.sin(p) + .02, -Math.cos(yaw)).normalize(); }
      else { const yaw = b.yaw + (b.nozzleYaw || 0); mx = b.pos.x - Math.sin(b.yaw) * (b.J.l / 2 + .4); my = b.pos.y + 2.7; mz = b.pos.z - Math.cos(b.yaw) * (b.J.l / 2 + .4); d = V.set(-Math.sin(yaw), .12 + (cam ? Math.max(-.2, cam.dir.y) : 0), -Math.cos(yaw)).normalize(); }
      const w = WEAPONS[5]; for (let i = 0; i < 2 * n; i++) fx.water(mx, my, mz, d.x * w.speed + b.vel.x, d.y * w.speed, d.z * w.speed + b.vel.z, 1, w.spread, w.size, w.dmg, ctx.player, 'agyu');
      ctx.audio?.spray(true);
    }
  };
  return api;
}
