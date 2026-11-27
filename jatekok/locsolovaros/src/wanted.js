// Körözés (1–5 csillag): a Vízügyi Ellenőrzés autókkal üldöz, 3 csillagtól útzárat épít, 4-től helikopter, 5-nél páncélautók.
// Ha egy egység sem látja a játékost, a csillagok egyenként elfogynak. Átfestés a Locsolófej Szervizben.
import * as THREE from 'three';
import * as W from './world.js?v=202611271440';
import { stepVehicle } from './physics.js?v=202611271440';
import { steerTo, laneOff } from './traffic.js?v=202611271440';

const TH = [0, 1, 8, 20, 40, 70], PTS = { ped: 1, runover: 3, cop: 6, copcar: 2, theft: 2, wreck: 5, mission: 0 };
export function createWanted(ctx) {
  const W_ = { level: 0, pts: 0, unseen: 0, seen: false, units: [], heli: null, blockT: 0, flash: 0, cool: 0,
    crime(type, x, z) { if (ctx.dev?.noWanted) return; const k = PTS[type] ?? 1; W_.pts += k;
      let lv = 0; for (let i = 1; i <= 5; i++) if (W_.pts >= TH[i]) lv = i; if (type === 'cop' || type === 'copcar') lv = Math.max(lv, W_.level ? W_.level : 1); if (lv > W_.level) { W_.level = Math.min(5, lv); W_.unseen = 0; ctx.audio?.alert(); } W_.pts = Math.max(W_.pts, TH[W_.level]); },
    set(lv) { W_.level = lv; W_.pts = TH[lv]; if (!lv) W_.clear(); },
    clear() { W_.level = 0; W_.pts = 0; for (const u of W_.units) { u.siren = false; if (u.ai) u.ai.mode = 'leave'; } W_.units.length = 0; if (W_.heli) W_.heli.ai = { mode: 'leave' }; W_.heli = null; ctx.actors.clear('cop'); },
    update(dt) {
      const pl = ctx.player, tp = pl.veh ? pl.veh.pos : pl.pos; W_.flash += dt;
      // távozó egységek eltávolítása
      for (const b of [...ctx.vehicles]) if (b.ai?.mode === 'leave') { const d = Math.hypot(b.pos.x - tp.x, b.pos.z - tp.z); if (d > 150) ctx.removeVehicle(b); else if (b.kind === 'heli') { b.driver = b.driver || { npc: 1 }; stepVehicle(b, { thr: 1, brk: 0, steer: 0, up: 1, down: 0 }, dt, ctx.env); } else if (!b.wrecked) stepVehicle(b, steerTo(b, b.pos.x - Math.sin(b.yaw) * 30, b.pos.z - Math.cos(b.yaw) * 30, 10), dt, ctx.env); }
      if (!W_.level) return;
      const lv = W_.level, want = [0, 2, 3, 4, 5, 6][lv];
      for (let i = W_.units.length - 1; i >= 0; i--) { const u = W_.units[i]; if (!ctx.vehicles.includes(u) || u.wrecked || Math.hypot(u.pos.x - tp.x, u.pos.z - tp.z) > 320) { if (ctx.vehicles.includes(u) && !u.wrecked) ctx.removeVehicle(u); W_.units.splice(i, 1); } }
      W_.cool -= dt; if (W_.units.filter(u => !u.block).length < want && W_.cool <= 0) { W_.cool = 2.5; spawnUnit(lv >= 5 && W_.units.filter(u => u.id === 'pancel').length < 2 ? 'pancel' : 'vizugy'); }
      if (lv >= 3) { W_.blockT -= dt; if (W_.blockT <= 0) { W_.blockT = 28; roadblock(); } }
      if (lv >= 4 && !W_.heli) { const h = ctx.addVehicle('vizheli', tp.x + 120, tp.z + 120, 0); h.pos.y = tp.y + 60; h.rotor = 1; h.driver = { npc: 1 }; h.ai = { mode: 'heli' }; h.siren = true; W_.heli = h; }
      // látják-e?
      let seen = false; const R = 55 + lv * 15;
      for (const u of W_.units) { if (u.wrecked) continue; const d = Math.hypot(u.pos.x - tp.x, u.pos.z - tp.z); if (d < R && W.lineOfSight(u.pos.x, u.pos.y + 1.4, u.pos.z, tp.x, tp.y + 1, tp.z)) seen = true; drive(u, dt, d); }
      for (const a of ctx.actors.list) if (a.team === 'cop' && a.hp > 0 && Math.hypot(a.pos.x - tp.x, a.pos.z - tp.z) < 40) seen = true;
      if (W_.heli) { const h = W_.heli; const d = Math.hypot(h.pos.x - tp.x, h.pos.z - tp.z); if (d < 70 && !(pl.veh && pl.veh.inside)) seen = true; flyHeli(h, dt); if (h.wrecked) W_.heli = null; }
      W_.seen = seen; if (seen) W_.unseen = 0; else { W_.unseen += dt; if (W_.unseen > 7 + lv * 3) { W_.unseen = 0; W_.level--; W_.pts = TH[W_.level]; if (!W_.level) { W_.clear(); ctx.ui.toast('Leráztad a Vízügyi Ellenőrzést'); } } }
    }
  };
  function spawnUnit(type) {
    const pl = ctx.player, tp = pl.veh ? pl.veh.pos : pl.pos;
    for (let t = 0; t < 14; t++) { const r = W.ROADS[Math.floor(Math.random() * W.ROADS.length)]; if (!r.A || !r.B) continue; const k = Math.random(), x = r.A.x + (r.B.x - r.A.x) * k, z = r.A.z + (r.B.z - r.A.z) * k, d = Math.hypot(x - tp.x, z - tp.z);
      if (d < 110 || d > 220) continue; const u = ctx.addVehicle(type, x, z, Math.atan2(-(tp.x - x), -(tp.z - z))); u.siren = true; u.driver = { npc: 1, cop: 1 }; u.ai = { mode: 'chase', path: [], repath: 0, stuck: 0 }; W_.units.push(u); return u; }
  }
  function roadblock() { // a játékos haladási irányában, 120–160 m-re, keresztben két autó
    const pl = ctx.player, b = pl.veh; if (!b || b.speed < 8) return; const fx = b.vel.x / b.speed, fz = b.vel.z / b.speed, ax = b.pos.x + fx * 140, az = b.pos.z + fz * 140;
    const onX = Math.abs(fx) > Math.abs(fz), L = Math.round((onX ? az : ax) + W.HALF) / W.PITCH, line = Math.round(L) * W.PITCH - W.HALF, along = onX ? ax : az;
    if (!W.roadAt(onX ? along : line, onX ? line : along)) return;
    for (const s of [-1, 1]) { const x = onX ? along : line + s * 3.2, z = onX ? line + s * 3.2 : along; const u = ctx.addVehicle('vizugy', x, z, onX ? 0 : Math.PI / 2); u.siren = true; u.block = 1; u.driver = { npc: 1, cop: 1 }; u.ai = { mode: 'block' }; W_.units.push(u); }
    ctx.ui.toast('Útzár előtted!');
  }
  function drive(u, dt, d) {
    const pl = ctx.player, tp = pl.veh ? pl.veh.pos : pl.pos, ai = u.ai;
    if (ai.mode === 'block') { stepVehicle(u, { thr: 0, brk: 1, steer: 0, hand: 1 }, dt, ctx.env); if (!pl.veh && d < 30 && !u.dropped) { u.dropped = 1; dropCops(u); } return; }
    let tx = tp.x, tz = tp.z, vDes = u.J.vmax;
    if (d > 70) { ai.repath -= dt; if (ai.repath <= 0 || !ai.path.length) { ai.repath = 3; ai.path = W.route(u.pos.x, u.pos.z, tp.x, tp.z).slice(1); }
      while (ai.path.length > 1 && Math.hypot(ai.path[0][0] - u.pos.x, ai.path[0][1] - u.pos.z) < 12) ai.path.shift(); if (ai.path.length) { tx = ai.path[0][0]; tz = ai.path[0][1]; } }
    else if (pl.veh) { tx += pl.veh.vel.x * .6; tz += pl.veh.vel.z * .6; vDes = Math.max(14, pl.veh.speed + 6); }
    else { vDes = d > 25 ? 16 : Math.max(0, (d - 9) * 1.2); if (d < 26 && u.speed < 2 && !u.dropped) { u.dropped = 1; dropCops(u); } }
    const I = steerTo(u, tx, tz, vDes);
    if (u.speed < 1 && I.thr > .3) { ai.stuck += dt; if (ai.stuck > 2.5) { ai.rev = 1.4; ai.stuck = 0; } } if (ai.rev > 0) { ai.rev -= dt; I.thr = 0; I.brk = 1; I.steer = -I.steer; }
    stepVehicle(u, I, dt, ctx.env);
    if (u.id === 'pancel' && d < 45 && W.lineOfSight(u.pos.x, u.pos.y + 3, u.pos.z, tp.x, tp.y + 1, tp.z)) { u.turretYaw = Math.atan2(-(tp.x - u.pos.x), -(tp.z - u.pos.z)) - u.yaw; if (u.model.turret) u.model.turret.rotation.y = u.turretYaw; u.cannon = (u.cannon || 0) - dt;
      if (u.cannon <= 0) { u.cannon = .06; const y = u.yaw + u.turretYaw, dx = tp.x - u.pos.x, dz = tp.z - u.pos.z, dd = Math.hypot(dx, dz); ctx.fx.water(u.pos.x - Math.sin(y) * 1.5, u.pos.y + 3, u.pos.z - Math.cos(y) * 1.5, dx / dd * 30, 2 + (tp.y - u.pos.y) / dd * 30, dz / dd * 30, 1, .03, .45, 7, u, 'agyu'); } }
  }
  function dropCops(u) { for (let i = 0; i < 2; i++) { const s = i ? 1 : -1, x = u.pos.x + Math.cos(u.yaw) * s * 1.6, z = u.pos.z - Math.sin(u.yaw) * s * 1.6;
      ctx.actors.spawn({ x, z, look: 'cop', team: 'cop', ai: 'hunt', hp: 70, tag: 'cop', range: 35, speed: 5 }); } }
  function flyHeli(h, dt) { const pl = ctx.player, tp = pl.veh ? pl.veh.pos : pl.pos, t = ctx.t * .25, tx = tp.x + Math.cos(t) * 28, tz = tp.z + Math.sin(t) * 28, ty = Math.max(tp.y, W.groundY(tp.x, tp.z)) + 38;
    const dx = tx - h.pos.x, dz = tz - h.pos.z, fx = -Math.sin(h.yaw), fz = -Math.cos(h.yaw), ang = Math.atan2(fz * (tp.x - h.pos.x) - fx * (tp.z - h.pos.z), fx * (tp.x - h.pos.x) + fz * (tp.z - h.pos.z));
    const fwd = dx * fx + dz * fz, side = dx * Math.cos(h.yaw) - dz * Math.sin(h.yaw);
    stepVehicle(h, { thr: Math.max(0, Math.min(1, fwd / 30)), brk: Math.max(0, Math.min(1, -fwd / 30)), strafe: Math.max(-1, Math.min(1, side / 30)), steer: Math.max(-1, Math.min(1, ang)), up: ty > h.pos.y + 1 ? 1 : 0, down: ty < h.pos.y - 1 ? 1 : 0 }, dt, ctx.env);
    if (h.model.search) h.model.search.target.position.set(0, -38, -6); }
  return W_;
}
