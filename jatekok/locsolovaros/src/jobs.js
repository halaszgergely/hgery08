// Mellékmunkák (taxi, HGWS-kiszállítás, utcai verseny, kaszkadőrugrás), ingatlanok és garázsok, Locsolófej Szerviz (átfestés, tuning), ZERO-titok.
import * as THREE from 'three';
import * as W from './world.js?v=202611271920';
import { MAIN, gardens, pools } from './missions.js?v=202611271920';
import { steerTo } from './traffic.js?v=202611271920';
import { stepVehicle } from './physics.js?v=202611271920';
import { VEH, repair } from './vehicles.js?v=202611271920';

export const TUNE = { eng: ['Motor', [2500, 6000, 12000]], brake: ['Fék', [1200, 3000, 6000]], grip: ['Gumik', [1500, 3500, 7000]], armor: ['Páncél', [3000, 7000, 14000]] };
export const SHOPS = [{ id: 'szerviz1', ...W.PLACES.szerviz1, mx: -250, mz: -162 }, { id: 'szerviz2', ...W.PLACES.szerviz2, mx: 350, mz: -362 }];
export const GARAGES = [{ id: 'hgws', n: 'HGWS garázs', x: 174, z: 36, own: 1, slots: 3 }, ...W.PROPS_FOR_SALE.map(p => ({ id: p.id, n: p.n, x: p.x, z: p.z - 6, slots: 1, price: p.price }))];
export function createJobs(ctx) {
  const S = ctx.save, mk = ctx.markers, J = { active: null, prompt: '' };
  /* állandó jelölők */
  let startMk = null, staticMks = [];
  function refreshMarkers() {
    staticMks.forEach(m => mk.remove(m)); staticMks = []; mk.remove(startMk); startMk = null;
    if (!ctx.missions.cur && S.mission < MAIN.length) { const m = MAIN[S.mission]; startMk = mk.add({ x: m.start.x, z: m.start.z, r: 2.2, kind: 'mission', label: m.n, icon: 'H' }); }
    for (const s of SHOPS) staticMks.push(mk.add({ x: s.mx, z: s.mz, r: 4, kind: 'shop', label: 'Locsolófej Szerviz', icon: '🔧', beam: true }));
    for (const g of GARAGES) staticMks.push(mk.add({ x: g.x, z: g.z, r: 3.5, kind: 'prop', label: (S.props[g.id] || g.own ? '' : 'Eladó: ') + g.n, icon: S.props[g.id] || g.own ? 'G' : '$' }));
    staticMks.push(mk.add({ x: 160, z: 38, r: 2, kind: 'job', label: 'HGWS mellékmunkák', icon: 'J' }));
    staticMks.push(mk.add({ x: -40, z: 12, r: 3, kind: 'race', label: 'Utcai verseny', icon: '🏁' }));
    for (const j of W.JUMPS) if (!S.jumps[j.id]) staticMks.push(mk.add({ x: j.x, z: j.z, r: 1, kind: 'race', beam: false, label: 'Ugrató', icon: '↗' }));
  }
  J.refresh = refreshMarkers;
  /* garázsban tárolt járművek kirakása a közelben */
  const parked = new Map();
  function parkSpawn(px, pz) {
    for (const g of GARAGES) { if (!(S.props[g.id] || g.own)) continue; const list = S.garage[g.id] || [], near = Math.hypot(g.x - px, g.z - pz) < 220;
      list.forEach((v, i) => { const k = g.id + i; if (near && !parked.has(k) && v) { const off = (i - (list.length - 1) / 2) * 6, b = ctx.addVehicle(v.id, g.x + off, g.z - 8, Math.PI, v.color); Object.assign(b.tune, v.tune || {}); b.keep = 1; b.garaged = k; parked.set(k, b); }
        else if (!near && parked.has(k)) { const b = parked.get(k); if (ctx.player.veh !== b && ctx.vehicles.includes(b)) ctx.removeVehicle(b); parked.delete(k); } }); }
    if (S.zero && !ctx.vehicles.some(b => b.id === 'tank')) { if (Math.hypot(-525 - px, 140 - pz) < 220) { const t = ctx.addVehicle('tank', -525, 140, 0); t.keep = 1; } }
    if (!ctx.ka26 || !ctx.vehicles.includes(ctx.ka26)) { if (Math.hypot(174 - px, 58 - pz) < 250) { const h = ctx.addVehicle('ka26', 174, 58, 0); h.pos.y = W.surfaceY(174, 58, 20, 0); h.keep = 1; ctx.ka26 = h; } }
  }
  /* ---------- Locsolófej Szerviz ---------- */
  function shopMenu(b) {
    const items = [{ t: `Átfestés + javítás${ctx.wanted.level ? ' (körözés törlése)' : ''}`, p: 400, f() { b.color = (b.color + 1 + Math.floor(Math.random() * 3)) % 9; const c = VEH[b.id].cols; b.model.paint.color.setHex(c[b.color % c.length]); repair(b.model); b.hp = b.maxHp; b.wrecked = false; b.burnT = 0; if (ctx.wanted.level) { ctx.wanted.clear(); ctx.ui.toast('Új szín – a vízügyesek nem ismernek fel'); } } }];
    for (const k in TUNE) { const lv = b.tune[k] || 0; if (lv < 3) items.push({ t: `${TUNE[k][0]} ${'I'.repeat(lv + 1)}. fokozat`, p: TUNE[k][1][lv], f() { b.tune[k] = lv + 1; if (k === 'armor') b.maxHp = 1000 * (1 + .25 * b.tune.armor); } }); }
    ctx.ui.menu('Locsolófej Szerviz – ' + VEH[b.id].n, items.map(i => ({ label: i.t, price: i.p, ok: S.money >= i.p, act() { if (S.money < i.p) return; ctx.money(-i.p, 'Szerviz: ' + i.t); i.f(); ctx.audio.money(); shopMenu(b); } })), () => { J.cool = 2; });
  }
  /* ---------- HGWS-mellékmunkák ---------- */
  function jobMenu() {
    ctx.ui.menu('HGWS kiszállítás', [{ label: 'Medencetöltés (locsolókocsi, időre)', price: 0, ok: true, act() { ctx.ui.closeMenu(); ctx.missions.run(poolJob(), 'job'); } },
      { label: 'Kertlocsolás (locsolókocsi, időre)', price: 0, ok: true, act() { ctx.ui.closeMenu(); ctx.missions.run(gardenJob(), 'job'); } }], () => { J.cool = 2; });
  }
  const tanker = M => { const near = ctx.vehicles.find(b => b.id === 'locsolo' && Math.hypot(b.pos.x - 174, b.pos.z - 30) < 40 && !b.wrecked); return near || M.vehicle('locsolo', 174, 30, Math.PI); };
  const poolJob = () => ({ n: 'Medencetöltés', reward: 0, async run(M, c) { const t = tanker(M); await M.enter(t, 'Szállj be a locsolókocsiba!'); M.watch(() => t.wrecked ? 'A locsolókocsi tönkrement' : null);
      const p = pools(8, { x: (Math.random() - .5) * 1200, z: 650 }).sort(() => Math.random() - .5).slice(0, 2); M.timer(70 + Math.hypot(p[0].x - 174, p[0].z - 30) / 9);
      await M.spray(p, 'Töltsd fel a medencéket vízzel!', 80); const pay = 1200 + Math.round(M.deadline * 15); M.noTimer(); c.money(pay, 'Medencetöltés'); c.stat('jobs'); } });
  const gardenJob = () => ({ n: 'Kertlocsolás', reward: 0, async run(M, c) { const t = tanker(M); await M.enter(t, 'Szállj be a locsolókocsiba!'); M.watch(() => t.wrecked ? 'A locsolókocsi tönkrement' : null);
      const g = gardens(3, { x: (Math.random() - .5) * 1400, z: Math.random() < .5 ? 650 : -650 }); M.timer(60 + Math.hypot(g[0].x - 174, g[0].z - 30) / 8);
      await M.spray(g, 'Locsold meg a kerteket!', 55); const pay = 900 + Math.round(M.deadline * 12); M.noTimer(); c.money(pay, 'Kertlocsolás'); c.stat('jobs'); } });
  /* ---------- taxi ---------- */
  const taxiJob = taxi => ({ n: 'Taxi', reward: 0, async run(M, c) { let fares = 0;
      M.watch(() => c.player.veh !== taxi ? (fares ? null : 'Kiszálltál a taxiból') : null);
      while (c.player.veh === taxi) {
        const n = W.NODES.get([...W.NODES.keys()][Math.floor(Math.random() * W.NODES.size)]); if (n.hw || Math.hypot(n.x - taxi.pos.x, n.z - taxi.pos.z) > 450 || Math.hypot(n.x - taxi.pos.x, n.z - taxi.pos.z) < 90) continue;
        const px = n.x + 10.2, pz = n.z + 10.2, pas = M.actor({ x: px, z: pz, look: { skin: 0xe0b08a, shirt: [0xc0392b, 0x27ae60, 0x8e44ad, 0xe8e8e8][fares % 4], pants: 0x2c3440, hair: 0x3b2a1c }, anim: 'wave' }); pas.face = 1;
        await M.goto(px, pz, 9, 'Vedd fel az utast!', { veh: taxi, slow: true }); c.actors.remove(pas);
        let d; for (let k = 0; k < 40; k++) { d = [...W.NODES.values()][Math.floor(Math.random() * W.NODES.size)]; const L = Math.hypot(d.x - px, d.z - pz); if (!d.hw && L > 250 && L < 900) break; }
        const L = Math.hypot(d.x - px, d.z - pz); M.timer(15 + L / 10); await M.goto(d.x + 10.2, d.z - 10.2, 9, 'Vidd el az utast a célhoz!', { veh: taxi, slow: true });
        const pay = Math.round(150 + L * 1.2 + M.deadline * 8); M.noTimer(); c.money(pay, 'Taxi fuvar'); c.audio.money(); c.ui.toast(`Fuvardíj: ${pay.toLocaleString('hu')} Ft`); fares++; c.stat('fares'); }
    } });
  /* ---------- utcai verseny ---------- */
  const RACE = [[-40, 0], [100, 0], [300, 0], [300, -200], [100, -200], [-100, -200], [-300, -200], [-300, 0], [-300, 200], [-100, 200], [-100, 0], [-40, 0]].map(([x, z]) => ({ x, z: z + 3.5, r: 10 }));
  const raceJob = () => ({ n: 'Utcai verseny', reward: 0, async run(M, c) {
      const pv = c.player.veh; if (!pv || pv.kind === 'heli' || pv.kind === 'tank') { M.fail('Autóval indulj!'); throw new Error('fail'); }
      const rv = [0, 1, 2].map(i => { const b = M.vehicle('modern', -60 - i * 9, -3.5 + (i % 2) * 7, -Math.PI / 2, { color: i + 2 }); b.driver = { npc: 1 }; b.ai = { mode: 'race', i: 0, pts: RACE, done: 0 }; return b; });
      pv.pos.set(-60, pv.pos.y, 10.5); pv.yaw = -Math.PI / 2; pv.vel.set(0, 0, 0);
      await M.cut([{ from: [-30, 6, 20], look: [-60, 1, 4], dur: 2.5, say: ['', '3… 2… 1… RAJT!'] }]);
      await M.checkpoints(RACE.slice(1), 'Verseny: érj elsőként a célba!'); const place = 1 + rv.filter(b => b.ai.done).length;
      const pay = [0, 3000, 1200, 500, 0][place]; c.ui.toast(`${place}. hely!`); if (pay) c.money(pay, 'Utcai verseny'); if (place === 1) c.stat('races'); } });
  /* ---------- mellék-AI-k ---------- */
  J.driveAI = (b, dt) => { const ai = b.ai, pl = ctx.player, tp = pl.veh ? pl.veh.pos : pl.pos;
    if (ai.mode === 'race') { const c = ai.pts[Math.min(ai.i + 1, ai.pts.length - 1)]; if (Math.hypot(c.x - b.pos.x, c.z - b.pos.z) < 12) { ai.i++; if (ai.i >= ai.pts.length - 1) { ai.done = 1; ai.mode = 'stop'; } } stepVehicle(b, steerTo(b, c.x, c.z, 28), dt, ctx.env); return; }
    if (ai.mode === 'stop') { stepVehicle(b, { thr: 0, brk: 1, steer: 0 }, dt, ctx.env); return; }
    if (ai.mode === 'flee') { ai.re = (ai.re || 0) - dt; if (ai.re <= 0 || !ai.path.length) { ai.re = 4; ai.path = W.route(b.pos.x, b.pos.z, ai.tx, ai.tz).slice(1); }
      while (ai.path.length > 1 && Math.hypot(ai.path[0][0] - b.pos.x, ai.path[0][1] - b.pos.z) < 12) ai.path.shift(); const p = ai.path[0] || [ai.tx, ai.tz]; const I = steerTo(b, p[0], p[1], b.J.vmax * (b.hp < b.maxHp * .5 ? .6 : .82));
      if (b.speed < 1 && I.thr > .3) { ai.stuck = (ai.stuck || 0) + dt; if (ai.stuck > 2) { ai.rev = 1.3; ai.stuck = 0; } } if (ai.rev > 0) { ai.rev -= dt; I.thr = 0; I.brk = 1; I.steer = -I.steer; } stepVehicle(b, I, dt, ctx.env); return; }
    if (ai.mode === 'ram') { const I = steerTo(b, tp.x + (pl.veh?.vel.x || 0) * .5, tp.z + (pl.veh?.vel.z || 0) * .5, 30); stepVehicle(b, I, dt, ctx.env); return; }
  };
  /* ---------- frissítés: interakciók ---------- */
  J.cool = 0;
  J.update = dt => {
    const pl = ctx.player, p = pl.veh ? pl.veh.pos : pl.pos; J.cool -= dt; J.prompt = ''; parkSpawn(p.x, p.z);
    const E = ctx.input.hit('KeyE') || (pl.veh ? ctx.input.pad?.px : ctx.input.pad?.pb); if (ctx.ui.menuOpen || ctx.cine.active) return;
    const busy = !!ctx.missions.cur;
    // fő küldetés indítása
    if (!busy && S.mission < MAIN.length) { const m = MAIN[S.mission]; if (Math.hypot(p.x - m.start.x, p.z - m.start.z) < 2.6 && !pl.veh) { J.prompt = `[E] ${m.n}`; if (E) { ctx.missions.run(m); refreshMarkers(); return; } } }
    // mellékmunkák
    if (!busy && !pl.veh && Math.hypot(p.x - 160, p.z - 38) < 2.4) { J.prompt = '[E] HGWS mellékmunkák'; if (E) jobMenu(); }
    if (!busy && pl.veh && Math.hypot(p.x + 40, p.z - 12) < 4 && pl.veh.speed < 2) { J.prompt = '[E] Utcai verseny (3 000 Ft díj)'; if (E) ctx.missions.run(raceJob(), 'job'); }
    if (!busy && pl.veh?.J.taxi && pl.veh.speed < 1) { J.prompt = '[E] Taxizás'; if (E) ctx.missions.run(taxiJob(pl.veh), 'job'); }
    // szerviz
    for (const s of SHOPS) if (pl.veh && pl.veh.kind !== 'heli' && Math.hypot(p.x - s.mx, p.z - s.mz) < 5 && J.cool <= 0) { if (pl.veh.speed < 1.5) { J.prompt = '[E] Locsolófej Szerviz'; if (E) shopMenu(pl.veh); } }
    // garázsok és ingatlanok
    for (const g of GARAGES) { if (Math.hypot(p.x - g.x, p.z - g.z) > 4) continue; const owned = g.own || S.props[g.id];
      if (!owned && !pl.veh) { J.prompt = `[E] ${g.n} megvétele – ${g.price.toLocaleString('hu')} Ft`; if (E) { if (S.money >= g.price) { ctx.money(-g.price, 'Ingatlan: ' + g.n); S.props[g.id] = 1; ctx.audio.money(); ctx.ui.toast(`Megvetted: ${g.n}`); refreshMarkers(); ctx.autosave(true); } else ctx.ui.toast('Nincs elég pénzed'); } }
      else if (owned && pl.veh && pl.veh.kind !== 'heli' && pl.veh.speed < 1.5 && !pl.veh.J.cop) { J.prompt = '[E] Jármű tárolása a garázsban'; if (E) { const list = S.garage[g.id] = S.garage[g.id] || []; const v = pl.veh;
          if (v.garaged) { const [gid, idx] = [v.garaged.replace(/\d+$/, ''), +v.garaged.match(/\d+$/)[0]]; if (S.garage[gid]) S.garage[gid][idx] = null; parked.delete(v.garaged); }
          const free = list.findIndex(x => !x); const slot = free >= 0 ? free : list.length < g.slots ? list.length : 0; list[slot] = { id: v.id, color: v.color, tune: { ...v.tune } };
          ctx.exitVehicle(true); ctx.removeVehicle(v); for (const k of [...parked.keys()]) if (k.startsWith(g.id)) { const b = parked.get(k); if (ctx.vehicles.includes(b)) ctx.removeVehicle(b); parked.delete(k); }
          ctx.ui.toast('Jármű elmentve a garázsba'); ctx.autosave(true); } } }
    // ZERO titok
    const z = W.BLOCKS.find(B => B.zero)?.zero; if (z && !pl.veh && Math.hypot(p.x - z.x, p.z - z.z) < 5 && p.y > z.y - 3 && !S.zero) { S.zero = 1; ctx.money(10000, 'ZERO titok'); for (let i = 1; i < 6; i++) ctx.weapons.give(i, 999); ctx.audio.pass();
      ctx.ui.banner('ZERO TITOK FELOLDVA', 'A panel tetején egy kulcs várt: a HGWS titkos vízágyús tankja a ház tövében áll.'); ctx.autosave(true); }
  };
  /* ---------- kaszkadőrugrás ---------- */
  J.onLand = (b, imp, airT) => { if (b !== ctx.player.veh || !b.jumpFrom) return; const j = b.jumpFrom; b.jumpFrom = null; const dist = Math.hypot(b.pos.x - j.x, b.pos.z - j.z);
    if (airT > 1 && dist > 25) { const first = !S.jumps[j.id]; S.jumps[j.id] = 1; const pay = first ? 1000 : 150; ctx.money(pay, 'Kaszkadőrugrás'); ctx.ui.banner(first ? 'EGYEDI UGRÁS!' : 'Ugrás', `${Math.round(dist)} m · ${airT.toFixed(1)} s · +${pay} Ft`); ctx.stat('jumps'); if (first) refreshMarkers(); } };
  return J;
}
