// Küldetésmotor (async lépések, figyelők, időzítő, jelölők) és a 8 fő küldetés átvezető jelenetekkel.
import * as THREE from 'three';
import * as W from './world.js?v=202611261601';

/* ---------- világ-jelölők: fényoszlop + földi gyűrű ---------- */
export function createMarkers(scene) {
  const list = [], beamG = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true), ringG = new THREE.RingGeometry(.86, 1, 40).rotateX(-Math.PI / 2);
  const beamMat = c => new THREE.ShaderMaterial({ uniforms: { c: { value: new THREE.Color(c) }, t: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 c; uniform float t; varying vec2 vU; void main(){ float a=(1.-vU.y)*.55*(.75+.25*sin(t*3.+vU.y*8.)); gl_FragColor=vec4(c*a,a); }' });
  const COL = { mission: 0xffd23a, obj: 0xffd23a, job: 0x37e07a, prop: 0x3a9bff, shop: 0xff8a2a, enemy: 0xff3a3a, race: 0xff3ad2, way: 0xa86bff };
  return { list,
    add(o) { const m = { x: o.x, z: o.z, r: o.r || 3, kind: o.kind || 'obj', label: o.label || '', icon: o.icon || '', y: o.y, beam: o.beam !== false, blip: o.blip !== false, ent: o.ent || null, g: new THREE.Group() };
      if (m.beam) { const mt = beamMat(COL[m.kind] || 0xffffff), b = new THREE.Mesh(beamG, mt); b.scale.set(m.r * .9, m.kind === 'obj' || (m.kind === 'race' && !m.label) ? 60 : 7, m.r * .9); b.position.y = b.scale.y / 2; m.g.add(b);
        const ring = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: COL[m.kind] || 0xffffff, transparent: true, opacity: .8, depthWrite: false })); ring.scale.setScalar(m.r); ring.position.y = .12; m.g.add(ring); m.mt = mt; }
      m.g.position.set(m.x, m.y ?? W.surfaceY(m.x, m.z, 999, 0), m.z); scene.add(m.g); list.push(m); return m; },
    remove(m) { if (!m) return; scene.remove(m.g); const i = list.indexOf(m); if (i >= 0) list.splice(i, 1); },
    update(t, cam) { for (const m of list) { if (m.mt && cam) m.g.children[0].visible = Math.hypot(cam.x - m.x, cam.z - m.z) > m.r + 2.5; if (m.ent) { const p = m.ent.pos || m.ent; m.x = p.x; m.z = p.z; m.g.position.set(p.x, (p.y ?? 0) + (m.ent.J ? m.ent.J.h + 1 : 2.2), p.z); } if (m.mt) m.mt.uniforms.t.value = t; m.g.rotation.y = t * .5; } }, COL };
}

/* ---------- küldetés-futtató ---------- */
export function createMissions(ctx) {
  let cur = null;
  const S = ctx.save;
  function makeM(def) {
    const M = { def, made: [], marks: [], watches: [], step: null, deadline: 0, text: '', failed: false, data: {} };
    const pl = () => ctx.player, ppos = () => pl().veh ? pl().veh.pos : pl().pos;
    M.wait = (cond, text, mk) => new Promise((res, rej) => { if (M.failed) return rej(new Error('fail')); M.text = text || M.text; if (mk) M.marks.push(mk); M.step = { cond, res: v => { if (mk) { ctx.markers.remove(mk); M.marks.splice(M.marks.indexOf(mk), 1); } res(v); }, rej, mk }; ctx.ui.objective(M.text); });
    M.sleep = s => M.wait(dt => (s -= dt) <= 0);
    M.cut = shots => ctx.cine.play(shots).then(() => { if (M.failed) throw new Error('fail'); });
    M.vehicle = (id, x, z, yaw, o = {}) => { const b = ctx.addVehicle(id, x, z, yaw, o.color); b.keep = 1; b.tag = o.tag || ''; M.made.push(b); if (o.locked) b.locked = 1; return b; };
    M.actor = o => { const a = ctx.actors.spawn({ ...o, tag: 'm' }); M.made.push(a); return a; };
    M.mark = o => ctx.markers.add(o);
    M.goto = (x, z, r, text, o = {}) => M.wait(() => { const p = ppos(); if (o.veh && pl().veh !== o.veh) return false; if (o.anyVeh && !pl().veh) return false; if (o.foot && pl().veh) return false; if (o.slow && pl().veh && pl().veh.speed > 4) return false; return Math.hypot(p.x - x, p.z - z) < r && (o.y === undefined || Math.abs(p.y - o.y) < 4); }, text, M.mark({ x, z, r, y: o.y, kind: 'obj' }));
    M.enter = (b, text) => M.wait(() => pl().veh === b, text, M.mark({ x: b.pos.x, z: b.pos.z, r: 2, ent: b, beam: false, kind: 'obj' }));
    M.hold = (x, z, secs, text, o = {}) => { let t = 0; return M.wait(dt => { const p = ppos(); const inside = Math.hypot(p.x - x, p.z - z) < (o.r || 3) && !pl().veh && (o.y === undefined || Math.abs(p.y - o.y) < 3); if (inside && ctx.input.down('KeyE') || inside && ctx.input.pad?.bb > .5) { t += dt; ctx.ui.progress(t / secs); } else if (t > 0) ctx.ui.progress(t / secs); return t >= secs; }, text, M.mark({ x, z, r: o.r || 3, y: o.y, kind: 'obj' })).then(() => ctx.ui.progress(-1)); };
    M.kill = (list, text) => M.wait(() => list.every(a => a.hp <= 0), text);
    M.stopCar = (b, text, hp) => M.wait(() => b.hp <= (hp ?? b.maxHp * .35) || b.wrecked || b.sink > .3, text, M.mark({ x: b.pos.x, z: b.pos.z, ent: b, beam: false, kind: 'enemy' }));
    M.spray = (pts, text, need = 70) => { const fill = pts.map(() => 0), mks = pts.map(p => M.mark({ x: p.x, z: p.z, r: p.r || 7, kind: 'obj' }));
      M.data.onWater = (x, z) => pts.forEach((p, i) => { if (fill[i] < need && Math.hypot(x - p.x, z - p.z) < (p.r || 7)) { fill[i]++; if (fill[i] >= need) { ctx.markers.remove(mks[i]); ctx.audio.blip(); ctx.ui.toast(`Kész: ${fill.filter(f => f >= need).length}/${pts.length}`); } } });
      return M.wait(() => { ctx.ui.progress(fill.reduce((a, f) => a + Math.min(f, need), 0) / (need * pts.length)); return fill.every(f => f >= need); }, text).then(() => { M.data.onWater = null; ctx.ui.progress(-1); mks.forEach(m => ctx.markers.remove(m)); }); };
    M.checkpoints = (pts, text, o = {}) => { let i = 0, mk = null; const place = () => { ctx.markers.remove(mk); mk = M.mark({ x: pts[i].x, z: pts[i].z, y: pts[i].y, r: pts[i].r || 8, kind: o.kind || 'race' }); M.marks.push(mk); };
      place(); return M.wait(() => { const p = ppos(), c = pts[i]; if (Math.hypot(p.x - c.x, p.z - c.z) < (c.r || 8) && (c.y === undefined || Math.abs(p.y - c.y) < (c.ry || 8))) { ctx.audio.blip(); i++; if (i >= pts.length) { ctx.markers.remove(mk); return true; } place(); } M.cpi = i; ctx.ui.objective(`${text} (${i}/${pts.length})`); return false; }, text); };
    M.timer = s => { M.deadline = s; }; M.noTimer = () => { M.deadline = 0; ctx.ui.timer(-1); };
    M.watch = fn => M.watches.push(fn);
    M.loseWanted = text => M.wait(() => ctx.wanted.level === 0, text);
    M.fail = reason => { if (M.failed) return; M.failed = true; M.reason = reason; M.step?.rej(new Error('fail')); };
    M.cleanup = () => { for (const o of M.made) { if (o.model?.isObject3D || o.model?.g) { if (o.J) { if (ctx.player.veh !== o) ctx.removeVehicle(o); else o.keep = 0; } else ctx.actors.remove(o); } } M.marks.forEach(m => ctx.markers.remove(m)); M.marks.length = 0; ctx.ui.objective(''); ctx.ui.timer(-1); ctx.ui.progress(-1); };
    return M;
  }
  async function run(def, kind = 'main') {
    if (cur) return; const M = makeM(def); cur = M; ctx.ui.banner(def.n, kind === 'main' ? `${def.i + 1}. küldetés` : 'Mellékmunka'); ctx.audio.blip();
    try { await def.run(M, ctx); M.cleanup(); cur = null; if (kind === 'main') { S.mission = Math.max(S.mission, def.i + 1); } def.reward && ctx.money(def.reward, def.n); ctx.audio.pass(); ctx.ui.passed(def.n, def.reward); def.after?.(ctx); ctx.autosave(true); }
    catch (e) { if (!M.failed) console.error(e); M.cleanup(); cur = null; ctx.cine.stop(); ctx.audio.fail(); ctx.ui.failed(M.reason || 'Megszakítva'); }
  }
  const api = { get cur() { return cur; }, run, makeM,
    update(dt) {
      if (!cur) return; const M = cur;
      if (M.deadline > 0) { M.deadline -= dt; ctx.ui.timer(M.deadline); if (M.deadline <= 0) { M.fail('Lejárt az idő'); return; } }
      for (const w of M.watches) { const r = w(dt); if (r) { M.fail(r); return; } }
      if (M.step && !ctx.cine.active) { const s = M.step; if (s.cond(dt)) { M.step = null; s.res(); } }
    },
    abort(reason) { cur?.fail(reason); },
    onWater(x, z) { cur?.data.onWater?.(x, z); }
  };
  return api;
}

/* ---------- a történet ---------- */
const HQ = { x: 136, z: 38 }, GAR = { x: 174, z: 30 }, PAD = { x: 174, z: 58 };
const say = (who, txt, from, look, dur = 4.2, to, lookTo) => ({ from, to, look, lookTo, dur, say: [who, txt] });
export function gardens(n, near) { // kertvárosi telkek (kerítés-közép) a ponthoz legközelebb, egymástól távol
  const out = [], all = W.BLOCKS.filter(B => B.dist === 'kertes').flatMap(B => B.props.filter(p => p.t === 'fence')).sort((a, b) => Math.hypot(a.x - near.x, a.z - near.z) - Math.hypot(b.x - near.x, b.z - near.z));
  for (const f of all) { if (out.every(o => Math.hypot(o.x - f.x, o.z - f.z) > 60)) out.push({ x: f.x, z: f.z, r: 9 }); if (out.length >= n) break; } return out;
}
export function pools(n, near) { return W.BLOCKS.flatMap(B => B.props.filter(p => p.t === 'pool')).sort((a, b) => Math.hypot(a.x - near.x, a.z - near.z) - Math.hypot(b.x - near.x, b.z - near.z)).slice(0, n).map(p => ({ x: p.x, z: p.z, r: 4.5 })); }
const yOf = (x, z) => W.groundY(x, z);
export const MAIN = [
  { n: 'Első munkanap', start: HQ, reward: 1500, async run(M, c) {
      const anna = M.actor({ x: HQ.x - 2, z: HQ.z - 2, look: 'anna', anim: 'talk', yaw: -Math.PI / 2, name: 'Anna' });
      await M.cut([
        say('Anna', 'Gergely! Végre. A HGWS ma reggel óta csak a te nevedet kiabálja.', [HQ.x - 8, yOf(HQ.x, HQ.z) + 2.2, HQ.z - 6], [HQ.x - 1, yOf(HQ.x, HQ.z) + 1.6, HQ.z - 1]),
        say('Gergely', 'Halász Gergely Watering Solutions. A nevem van a cégtáblán, Anna – hova máshova kiabálnának?', [HQ.x + 4, yOf(HQ.x, HQ.z) + 1.9, HQ.z - 5], [HQ.x, yOf(HQ.x, HQ.z) + 1.6, HQ.z]),
        say('Anna', 'Nézd csak a tetőt. Az Arany Locsolófej. A város legjobb vízügyi cégének jár – és ezt valaki nagyon irigyli.', [HQ.x - 20, yOf(HQ.x, HQ.z) + 6, HQ.z - 40], [136, 30, 58], 5, [HQ.x - 10, yOf(HQ.x, HQ.z) + 18, HQ.z - 30]),
        say('Anna', 'A Városháza téren megint elakadt a szökőkút. Vidd a szervizbuszt, és mutasd meg, miért mi vagyunk az elsők.', [HQ.x - 6, yOf(HQ.x, HQ.z) + 1.9, HQ.z - 4], [HQ.x - 2, yOf(HQ.x, HQ.z) + 1.6, HQ.z - 2])]);
      anna.anim = 'idle'; anna.face = 1;
      const van = M.vehicle('hgwsvan', GAR.x, GAR.z, Math.PI);
      await M.enter(van, 'Szállj be a HGWS szervizbuszba!');
      M.watch(() => van.wrecked ? 'A szervizbusz tönkrement' : null);
      await M.goto(-50, -66, 7, 'Hajts a Városháza térre, a szökőkúthoz!', { slow: false, anyVeh: false });
      await M.hold(-50, -62, 3.5, 'Tartsd lenyomva az E-t a szökőkút megjavításához', { r: 6.5 });
      c.fountainOn = 1; c.audio.money();
      const sz = M.vehicle('modern', -20, -96, Math.PI / 2, { color: 0 }); sz.driver = { npc: 1 }; const szil = M.actor({ x: -30, z: -90, look: 'szilard', anim: 'talk', name: 'Szilárd' }); szil.face = 1;
      await M.cut([
        say('Szilárd', 'Ügyes, Halász. Megjavítottál egy szökőkutat. Gratulálok… a vízvezeték-szerelő kitüntetéshez.', [-40, yOf(-40, -80) + 2, -78], [-30, yOf(-30, -90) + 1.6, -90], 4.6),
        say('Gergely', 'Szilárd. A Szilárd Vízművektől. Mi szél hozott a tisztességes vízhez?', [-46, yOf(-46, -70) + 2, -64], [-50, yOf(-50, -66) + 1.5, -70]),
        say('Szilárd', 'Ez a város az enyém lesz. A szerződések, a csövek, az a nevetséges arany locsoló a tetőtökön. Minden.', [-34, yOf(-34, -94) + 1.7, -95], [-30, yOf(-30, -90) + 1.7, -90], 5, [-33, yOf(-33, -93) + 1.7, -94])]);
      c.actors.remove(szil); szil.hp = 0; sz.driver = null;
      await M.goto(HQ.x, HQ.z, 6, 'Menj vissza a HGWS-központba!');
    }, after(c) { c.weapons.give(2, 600); c.ui.toast('Új fegyver: Locsolótömlő (Tab)'); } },

  { n: 'Kiszáradt kertek', start: HQ, reward: 2500, async run(M, c) {
      await M.cut([say('Anna', 'Szilárd emberei éjjel elzárták a Kertváros főcsapját. Harminc kert szárad ki a napon!', [HQ.x - 7, yOf(HQ.x, HQ.z) + 2, HQ.z - 5], [HQ.x - 2, yOf(HQ.x, HQ.z) + 1.6, HQ.z - 2]),
        say('Anna', 'Vidd a locsolókocsit. Bal egérgombbal spriccel. Öt kert, négy perc – a nyugdíjasok órával a kezükben várnak.', [GAR.x - 10, yOf(GAR.x, GAR.z) + 4, GAR.z - 12], [GAR.x, yOf(GAR.x, GAR.z) + 1.5, GAR.z], 5)]);
      const t = M.vehicle('locsolo', GAR.x, GAR.z, Math.PI); await M.enter(t, 'Szállj be a locsolókocsiba!'); M.watch(() => t.wrecked ? 'A locsolókocsi tönkrement' : null);
      M.timer(240); const g = gardens(5, { x: 150, z: 600 }); await M.spray(g, 'Locsold meg a kiszáradt kerteket (bal egérgomb)!', 60); M.noTimer();
      await M.cut([say('Feri bácsi', 'Hát ez az, fiam! A paradicsomom már azt hitte, Szilárd győzött.', [g[4].x + 8, yOf(g[4].x, g[4].z) + 2.5, g[4].z + 8], [g[4].x, yOf(g[4].x, g[4].z) + 1, g[4].z])]);
    } },

  { n: 'Csőtörés a piacon', start: { x: -250, z: -168 }, reward: 3000, async run(M, c) {
      const feri = M.actor({ x: -252, z: -172, look: 'feri', anim: 'talk', name: 'Feri bácsi' });
      await M.cut([say('Feri bácsi', 'Gergely, a Városháza téren Szilárd verőemberei a csapokat szerelik le – és a járókelőket locsolják!', [-244, yOf(-244, -176) + 1.8, -178], [-252, yOf(-252, -172) + 1.6, -172]),
        say('Feri bácsi', 'Itt egy vízpisztoly-töltet. Mutasd meg nekik, mi az a nedves ellenállás.', [-258, yOf(-258, -178) + 1.8, -178], [-252, yOf(-252, -172) + 1.6, -172])]);
      feri.anim = 'idle'; c.weapons.give(1, 60);
      await M.goto(-50, -40, 24, 'Menj a Városháza térre!');
      const g = []; for (let i = 0; i < 5; i++) g.push(M.actor({ x: -70 + i * 10, z: -40 + (i % 2) * 8, look: 'goon', team: 'goon', ai: 'hunt', hp: 60, range: 38 }));
      g.forEach(a => M.marks.push(M.mark({ ent: a, x: a.pos.x, z: a.pos.z, kind: 'enemy', beam: false })));
      await M.kill(g, 'Áztasd el Szilárd verőembereit!'); M.marks.forEach(m => c.markers.remove(m)); M.marks.length = 0;
      const car = M.vehicle('lada', -20, -7, -Math.PI / 2, { color: 1 }); car.driver = { npc: 1 }; car.ai = { mode: 'flee', tx: 650, tz: 250, path: [] }; car.maxHp = 1000;
      c.ui.toast('A főnökük elmenekül egy Ladával!');
      M.watch(() => Math.hypot(car.pos.x - c.player.pos.x, car.pos.z - c.player.pos.z) > 280 && Math.hypot(car.pos.x - (c.player.veh?.pos.x ?? 1e9), car.pos.z - (c.player.veh?.pos.z ?? 1e9)) > 280 ? 'Elszökött a Lada' : null);
      await M.stopCar(car, 'Állítsd meg a menekülő Ladát (lökd, áztasd)!');
      car.ai = null; car.driver = null;
    }, after(c) { c.weapons.give(4, 30); c.ui.toast('Új fegyver: Öntözőpuska'); } },

  { n: 'Átemelő-szabotázs', start: HQ, reward: 4000, async run(M, c) {
      await M.cut([say('Anna', 'Riasztás az 1-es szennyvízátemelőből! Szilárd szerkezeteket szerelt a szivattyúkra. Ha leállnak, a belváros elúszik… nem vízben.', [HQ.x - 7, yOf(HQ.x, HQ.z) + 2, HQ.z - 5], [HQ.x - 2, yOf(HQ.x, HQ.z) + 1.6, HQ.z - 2], 5.2),
        say('Anna', 'Három perced van. Kapcsold ki mindhármat!', [520, yOf(520, 110) + 25, 90], [550, yOf(550, 150), 150], 4, [540, yOf(540, 110) + 18, 100])]);
      M.timer(180); await M.goto(550, 112, 14, 'Siess az 1-es szennyvízátemelőhöz!');
      for (const [i, [x, z]] of [[553, 127], [578, 145], [540, 182]].entries()) await M.hold(x, z, 2.2, `Hatástalanítsd a szabotázs-szerkezetet (${i + 1}/3) – tartsd az E-t`, { r: 2.6 });
      M.noTimer(); c.ui.toast('Mind a három hatástalanítva!'); const g = []; for (const [x, z] of [[510, 112], [590, 112], [600, 185], [505, 190]]) g.push(M.actor({ x, z, look: 'goon', team: 'goon', ai: 'hunt', hp: 70 }));
      c.wanted.set(2); c.ui.toast('A vízügyesek téged gyanúsítanak!'); await M.loseWanted('Rázd le a Vízügyi Ellenőrzést!');
    }, after(c) { c.weapons.give(3, 8); c.ui.toast('Új fegyver: Vízbomba'); } },

  { n: 'Futár az Avasról', start: { x: 488, z: -486 }, reward: 5000, async run(M, c) {
      const y0 = yOf(500, -500), inf = M.actor({ x: 492, z: -488, look: 'feri', anim: 'talk', name: 'Informátor' });
      await M.cut([say('Informátor', 'Szilárd futára mindjárt indul a kilátótól egy aktatáskával. Abban vannak a hamis vízügyi szerződések.', [482, y0 + 3, -476], [492, y0 + 1.7, -488], 4.8),
        say('Informátor', 'Az a barna Wartburg. Ha eléri a raktárat, mindennek vége.', [470, y0 + 20, -470], [520, y0 + 2, -470], 4, [480, y0 + 26, -480])]);
      inf.anim = 'idle'; const car = M.vehicle('wartburg', 512, -470, Math.PI, { color: 1 }); car.driver = { npc: 1 }; car.ai = { mode: 'flee', tx: 650, tz: 250, path: [] };
      M.watch(() => Math.hypot(car.pos.x - 650, car.pos.z - 250) < 40 ? 'A futár elérte a raktárat' : null);
      await M.stopCar(car, 'Állítsd meg a futár Wartburgját!'); car.ai = null; car.driver = null;
      await M.goto(car.pos.x, car.pos.z, 3.5, 'Vedd el az aktatáskát (gyalog)!', { foot: true });
      c.audio.money(); await M.goto(HQ.x, HQ.z, 6, 'Vidd az aktatáskát a HGWS-központba!');
    } },

  { n: 'Légi felderítés', start: HQ, reward: 6000, async run(M, c) {
      await M.cut([say('Anna', 'A szerződésekből kiderül: Szilárd az ipari zónában rejteget valamit. Repülj fölé a Ka-26-tal!', [HQ.x - 7, yOf(HQ.x, HQ.z) + 2, HQ.z - 5], [HQ.x - 2, yOf(HQ.x, HQ.z) + 1.6, HQ.z - 2], 4.6),
        say('Anna', 'A helikopter a garázs tetején áll. Szóköz: emelkedés, Shift: süllyedés. És ne a szökőkútba landolj.', [PAD.x - 18, 22, PAD.z - 22], [PAD.x, 10, PAD.z], 4.8)]);
      const h = c.ka26 || M.vehicle('ka26', PAD.x, PAD.z, 0); h.pos.y = W.surfaceY(PAD.x, PAD.z, 20, 0);
      await M.goto(PAD.x - 4, PAD.z + 6, 3, 'Menj fel a garázs tetejére a rámpán!', { y: h.pos.y });
      await M.enter(h, 'Szállj be a helikopterbe!'); M.watch(() => h.wrecked ? 'A helikopter lezuhant' : null);
      const cp = [[300, 50, 40], [500, 100, 45], [600, 200, 45], [700, 300, 50], [620, 380, 40], [450, 300, 45], [300, 150, 40]].map(([x, z, y]) => ({ x, z, y: W.groundY(x, z) + y, r: 12, ry: 10 }));
      await M.checkpoints(cp, 'Repülj át a felderítő pontokon');
      await M.goto(PAD.x, PAD.z, 7, 'Szállj le a HGWS helipadjára!', { veh: h, y: h.model ? W.surfaceY(PAD.x, PAD.z, 20, 0) : undefined, slow: true });
      await M.wait(() => !c.player.veh, 'Szállj ki a helikopterből (F)');
    } },

  { n: 'Raktárbetörés', start: HQ, reward: 8000, async run(M, c) {
      await M.cut([say('Anna', 'A légi fotókon tisztán látszik: Szilárd raktárában a mi ellopott tervrajzaink vannak. Itt a vízágyú. Ne kímélj senkit… szárazon.', [HQ.x - 7, yOf(HQ.x, HQ.z) + 2, HQ.z - 5], [HQ.x - 2, yOf(HQ.x, HQ.z) + 1.6, HQ.z - 2], 5.4)]);
      c.weapons.give(5, 800); c.ui.toast('Új fegyver: Vízágyú');
      await M.goto(600, 220, 25, 'Menj Szilárd raktárához az ipari zónában!');
      const w1 = [[620, 215], [640, 215], [600, 240], [610, 265], [700, 225]].map(([x, z]) => M.actor({ x, z, look: 'goon', team: 'goon', ai: 'hunt', hp: 80 }));
      await M.kill(w1, 'Áztasd el az őröket!');
      const w2 = [[690, 285], [700, 260], [612, 290]].map(([x, z]) => M.actor({ x, z, look: 'goon', team: 'goon', ai: 'hunt', hp: 90, weapon: 4 }));
      await M.kill(w2, 'Jön az erősítés – áztasd el őket is!');
      await M.goto(650, 228, 3, 'Szerezd meg a tervrajzokat a raktár előtt!', { foot: true });
      c.wanted.set(3); await M.loseWanted('Rázd le a Vízügyi Ellenőrzést!');
    } },

  { n: 'Az Arany Locsolófej', start: HQ, reward: 20000, async run(M, c) {
      const top = 47 + 23;   // a főépület teteje körül
      c.city.setStatueVisible(false);
      const k = M.vehicle('kamaz', 126, 16, -Math.PI / 2, { color: 2 }); k.driver = { npc: 1 }; k.maxHp = 2600; k.hp = 2600;
      const st = c.city.statueModel(); st.scale.setScalar(.8); st.position.set(0, 2.6, 2); k.model.body.add(st);
      await M.cut([say('Anna', 'Gergely! A TETŐ! Szilárd daruval leemelte az Arany Locsolófejet!', [HQ.x - 7, yOf(HQ.x, HQ.z) + 2, HQ.z - 5], [HQ.x - 2, yOf(HQ.x, HQ.z) + 1.6, HQ.z - 2], 4),
        say('Szilárd', 'Köszönöm a vendéglátást, Halász! Ez a locsoló mostantól a Szilárd Vízműveket díszíti!', [110, yOf(110, 10) + 3, 30], [126, yOf(126, 16) + 2, 16], 4.6, [100, yOf(100, 10) + 5, 34]),
        say('Gergely', 'Azt a locsolót a nagyapám kapta. Le fogod tenni, Szilárd. Ha kell, vízágyúval.', [140, yOf(140, 30) + 1.9, 34], [136, yOf(136, 38) + 1.6, 38])]);
      k.ai = { mode: 'flee', tx: W.MOTOR_X, tz: -760, path: [] }; const esc = [M.vehicle('modern', 140, 22, -Math.PI / 2, { color: 0 }), M.vehicle('modern', 108, 10, -Math.PI / 2, { color: 0 })];
      esc.forEach(e => { e.driver = { npc: 1 }; e.ai = { mode: 'ram' }; });
      M.watch(() => Math.hypot(k.pos.x - W.MOTOR_X, k.pos.z + 760) < 30 ? 'Szilárd elmenekült az autópályán' : null);
      await M.stopCar(k, 'Állítsd meg Szilárd Kamazát!', 700);
      k.ai = null; k.driver = null; const sx = k.pos.x + Math.cos(k.yaw) * 3, sz = k.pos.z - Math.sin(k.yaw) * 3; const szil = M.actor({ x: sx, z: sz, look: 'szilard', anim: 'idle', name: 'Szilárd' });
      const cop = M.vehicle('vizugy', sx + 10, sz + 10, 0); cop.siren = true;
      await M.cut([say('Szilárd', 'Jó, jó! Csurom víz vagyok! Vidd a vacak locsolódat!', [sx + 5, yOf(sx, sz) + 1.8, sz + 4], [sx, yOf(sx, sz) + 1.6, sz], 4),
        say('Vízügyi ellenőr', 'Szilárd úr, a Vízügyi Ellenőrzés nevében: hamis szerződések, lopás, és egy egész kertváros kiszárítása. Velünk jön.', [sx - 6, yOf(sx, sz) + 2, sz - 4], [sx, yOf(sx, sz) + 1.5, sz], 5),
        say('Gergely', 'Az Arany Locsolófej hazamegy. És a város vize is.', [sx + 12, yOf(sx, sz) + 6, sz + 12], [k.pos.x, k.pos.y + 3, k.pos.z], 4, [sx + 16, yOf(sx, sz) + 12, sz + 16])]);
      c.city.setStatueVisible(true);
      await M.cut([{ from: [100, 40, -40], to: [120, 60, 10], look: [136, 47, 58], dur: 6, say: ['', 'Az Arany Locsolófej visszakerült a HGWS-központ tetejére. A város fellélegzett – és alaposan meglocsolta magát.'] },
        { from: [60, 120, -200], to: [-100, 160, -300], look: [0, 0, 0], dur: 6, say: ['', 'HGWS: LOCSOLÓ VÁROS – Vége. A város a tiéd: mellékmunkák, ingatlanok, ugratók… és talán egy titok a panelek tetején.'] }]);
    }, after(c) { c.ui.toast('Gratulálunk! Minden fő küldetés kész.'); } }
];
MAIN.forEach((m, i) => { m.i = i; });
