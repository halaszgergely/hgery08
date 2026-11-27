// Teljes modellű szereplők: vízügyi ellenőrök gyalog, Szilárd emberei, a történet alakjai, taxiutasok.
import * as THREE from 'three';
import * as W from './world.js?v=202611271857';
import { buildHuman, pose, LOOKS, buildWeapon } from './player.js?v=202611271857';
import { WEAPONS } from './weapons.js?v=202611271857';

export function createActors(ctx) {
  const list = [], V = new THREE.Vector3();
  const api = { list,
    spawn(o) { const look = typeof o.look === 'string' ? LOOKS[o.look] : o.look, m = buildHuman(look || LOOKS.goon); ctx.scene.add(m);
      const a = { model: m, pos: new THREE.Vector3(o.x, W.surfaceY(o.x, o.z, o.y ?? 99, o.y !== undefined ? .6 : 0), o.z), yaw: o.yaw || 0, vel: new THREE.Vector3(), vy: 0, hp: o.hp ?? 60, maxHp: o.hp ?? 60, team: o.team || 'npc', ai: o.ai || 'idle',
        weapon: o.weapon ?? (o.team === 'cop' || o.team === 'goon' ? 1 : 0), cool: Math.random(), state: 'idle', downT: 0, tag: o.tag || '', name: o.name || '', anim: o.anim || 'idle', speed: o.speed || 4.2, target: o.target || null, range: o.range || 40, onDown: o.onDown, life: o.life || 0, held: 0 };
      m.position.copy(a.pos); m.rotation.y = a.yaw; if (a.weapon) addGun(m, a.team, a.weapon); list.push(a); return a; },
    remove(a) { ctx.scene.remove(a.model); const i = list.indexOf(a); if (i >= 0) list.splice(i, 1); },
    clear(tag) { for (const a of [...list]) if (!tag || a.tag === tag) api.remove(a); },
    damage(a, k, fx, fz, src) { if (a.hp <= 0) return; a.hp -= k; a.hitT = .3; if (a.ai === 'idle' && a.team !== 'npc') a.ai = 'hunt';
      if (src === ctx.player && a.team === 'cop') ctx.crime('cop', a.pos.x, a.pos.z);
      if (a.hp <= 0) { a.downT = 9999; a.state = 'down'; a.yaw = Math.atan2(a.pos.x - fx, a.pos.z - fz); ctx.fx.splash(a.pos.x, a.pos.y + .5, a.pos.z, 14, 1); a.onDown?.(a); a.life = a.life || 25; } },
    update(dt) {
      const pl = ctx.player, tp = pl.veh ? pl.veh.pos : pl.pos;
      for (const a of [...list]) {
        if (a.life && a.hp <= 0) { a.life -= dt; if (a.life <= 0 && Math.hypot(a.pos.x - tp.x, a.pos.z - tp.z) > 30) { api.remove(a); continue; } }
        let st = 'idle', sp = 0;
        if (a.hp <= 0) { st = 'down'; }
        else if (a.ai === 'hunt' && (a.team !== 'cop' || ctx.wanted.level > 0)) {
          const dx = tp.x - a.pos.x, dz = tp.z - a.pos.z, d = Math.hypot(dx, dz), see = d < a.range && W.lineOfSight(a.pos.x, a.pos.y + 1.6, a.pos.z, tp.x, tp.y + 1.2, tp.z);
          a.yaw = Math.atan2(-dx, -dz);
          const want = a.team === 'cop' && !pl.veh ? 1.3 : 10;
          if (d > want || !see) { sp = d > 25 ? a.speed : a.speed * .6; st = sp > 3.5 ? 'run' : 'walk'; }
          if (see && d < a.range && a.weapon) { a.cool -= dt; if (a.cool <= 0) { const w = WEAPONS[a.weapon]; a.cool = 1 / w.rate * (1.6 + Math.random()); const mx = a.pos.x - Math.sin(a.yaw) * .5, my = a.pos.y + 1.4, mz = a.pos.z - Math.cos(a.yaw) * .5;
              V.set(tp.x - mx + (Math.random() - .5) * 2.4, tp.y + 1 - my, tp.z - mz + (Math.random() - .5) * 2.4).normalize(); ctx.weapons.shoot(a, w, mx, my, mz, V.x, V.y, V.z, a); ctx.audio?.shot(w.id, a.pos); } }
          if (a.team === 'cop' && !pl.veh && d < 1.6 && Math.hypot(pl.vel.x, pl.vel.z) < 3) { a.held += dt; if (a.held > 1.6) ctx.bust(); } else a.held = Math.max(0, a.held - dt);
        }
        else if (a.ai === 'flee') { const dx = a.pos.x - tp.x, dz = a.pos.z - tp.z; a.yaw = Math.atan2(-dx, -dz) + Math.PI; sp = a.speed * 1.2; st = 'run'; }
        else if (a.ai === 'goto' && a.target) { const dx = a.target.x - a.pos.x, dz = a.target.z - a.pos.z, d = Math.hypot(dx, dz); if (d > .6) { a.yaw = Math.atan2(-dx, -dz); sp = a.target.run ? a.speed : 1.6; st = sp > 3 ? 'run' : 'walk'; } else { a.ai = 'idle'; a.target.done?.(a); } }
        else { st = a.anim; if (a.face) { const dx = tp.x - a.pos.x, dz = tp.z - a.pos.z; if (Math.hypot(dx, dz) < 12) a.yaw = Math.atan2(-dx, -dz); } }
        if (sp) { a.pos.x += -Math.sin(a.yaw) * sp * dt; a.pos.z += -Math.cos(a.yaw) * sp * dt; W.pushCircle(a.pos, .35, a.pos.y + .1, 1.7); }
        const g = W.surfaceY(a.pos.x, a.pos.z, a.pos.y + .3, .65); a.vy -= 9.81 * dt; a.pos.y += a.vy * dt; if (a.pos.y < g) { a.pos.y = g; a.vy = 0; }
        if (W.inRiver(a.pos.x, a.pos.z)) a.pos.y = Math.max(a.pos.y, -1.1);
        a.model.position.copy(a.pos); a.model.rotation.y = a.yaw; pose(a.model, st, sp, dt, a.hp > 0 && a.ai === 'hunt' && st === 'idle' ? 1 : 0);
      }
    } };
  return api;
}
function addGun(m, team, w) { m.userData.gun.add(buildWeapon(w === 4 ? 'puska' : 'pisztoly', team === 'cop' ? 0x1f8fd6 : 0xff6b2a)); }
