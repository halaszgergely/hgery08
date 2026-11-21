// Az Átemelőtelep – a játék állapota, a telep szimulációja (medence, szivattyúk, PLC, gáz, áram), fejezetek, ellenőrzőpontok.
export const OVER = 3.6, LSL_H = .5, LSH_H = 3.0, PUMP_Q = .0095;
export const CHAPTERS = ['Kiérkezés', 'A szekrény', 'Az akna', 'A program', 'Szilárd', 'Hajnal'];
// a sorkapocs (X1) – a kapcsolási rajz szerint; a „?” a jelölés nélküli ér
export const X1 = [
  { n: 1, f: '+24 V', w: 'W101', to: 'LT1 +' }, { n: 2, f: 'AI0+ (4–20 mA)', w: 'W102', to: 'LT1 −' }, { n: 3, f: '0 V / AI0−', w: 'W103', to: 'AI0 közös' },
  { n: 4, f: 'DI0', w: 'W104', to: 'LSH1 (magas szint úszó)' }, { n: 5, f: 'DI1', w: 'W105', to: 'LSL1 (szárazfutás úszó)' }, { n: 6, f: '+24 V úszók', w: 'W106', to: 'Úszók közös' },
  { n: 7, f: 'DI2', w: 'W107', to: 'KM1 13–14 (P1 visszajelzés)' }, { n: 8, f: 'DI3', w: 'W108', to: 'KM2 13–14 (P2 visszajelzés)' }, { n: 9, f: 'DQ0', w: 'W109', to: 'KM1 A1 (P1 kontaktor)' }, { n: 10, f: 'DQ1', w: 'W110', to: 'KM2 A1 (P2 kontaktor)' }];
export const LOOSE = [{ id: 'W106', lab: 'W106', c: '#c0392b', ok: 6, dev: 'Úszók közös' }, { id: 'W104', lab: 'W104', c: '#222', ok: 4, dev: 'LSH1' }, { id: 'W102', lab: 'W102', c: '#8a5a2a', ok: 2, dev: 'LT1 −' }, { id: 'WX', lab: '?', c: '#222', ok: 7, dev: 'KM1 13' }, { id: 'W105', lab: 'W105', c: '#222', ok: 5, dev: 'LSL1' }];
export const PROG_OK = { code: [0, 0, 0, 0] };
export const CODE = [
  { n: 'Leállítás', o: ['IF LT1 <= P_STOP OR DRY THEN REQ1 := FALSE; REQ2 := FALSE; END_IF;', 'IF LT1 >= P_STOP OR DRY THEN REQ1 := FALSE; REQ2 := FALSE; END_IF;'], bad: 1 },
  { n: 'Szárazfutás', o: ['DRY := (LT1 < P_DRY) OR NOT LSL1;', 'DRY := (LT1 < P_DRY) AND NOT LSL1;'], bad: 1 },
  { n: 'Váltakozás', o: ['IF F_TRIG(REQ1) THEN LEAD := NOT LEAD; END_IF;', 'LEAD := FALSE;'], bad: 1 },
  { n: 'Riasztás', o: ['ALARM_HI := (LT1 >= P_ALARM) OR LSH1;', 'ALARM_HI := FALSE;'], bad: 1 }
];
export const PROG_BAD = { start1: 3.9, start2: .4, stop: 3.0, dry: 0, alarm: 5.0, code: [1, 1, 1, 1] };

/* ---------- PLC szintszabályozás (a terminál szimulációja és a telep ugyanezt futtatja) ---------- */
// m: { req1, req2, lead, prev1 }  →  { p1, p2, alarm, dry }
export function plcStep(pg, lt, lsl, lsh, m) {
  const dry = pg.code[1] === 0 ? (lt < pg.dry) || !lsl : (lt < pg.dry) && !lsl;
  if (lt >= pg.start1) m.req1 = true; if (lt >= pg.start2) m.req2 = true;
  const stop = pg.code[0] === 0 ? lt <= pg.stop : lt >= pg.stop; if (stop || dry) { m.req1 = false; m.req2 = false; }
  if (pg.code[2] === 0) { if (m.prev1 && !m.req1) m.lead = !m.lead; } else m.lead = false; m.prev1 = m.req1;
  const p1 = (m.req1 && !m.lead) || (m.req2 && m.lead), p2 = (m.req1 && m.lead) || (m.req2 && !m.lead);
  const alarm = pg.code[3] === 0 ? lt >= pg.alarm || lsh : false;
  return { p1, p2, alarm, dry };
}
// a terminál próbafuttatása: 40 perc szimulált idő változó hozzáfolyással; ellenőrzések listája
export function progTest(pg) {
  let h = 1.2, m = { req1: false, req2: false, lead: false, prev1: false }, maxH = 0, dryRun = 0, starts = 0, used = [0, 0], alarmAt = null, overAt = null, prev = [0, 0]; const tr = [];
  for (let s = 0; s < 2400; s++) { const qin = s < 600 ? .0045 : s < 1100 ? .0235 : s < 1500 ? .006 : .002; const o = plcStep(pg, h, h > LSL_H, h > LSH_H, m), run = [o.p1, o.p2];
    for (let i = 0; i < 2; i++) { if (run[i] && !prev[i]) starts++; if (run[i] && !run[1 - i]) used[i]++; if (run[i] && h < .45) dryRun++; } prev = run;
    h = Math.max(.15, h + qin - (run[0] ? PUMP_Q * 1.15 : 0) - (run[1] ? PUMP_Q * 1.15 : 0)); maxH = Math.max(maxH, h); if (o.alarm && alarmAt == null) alarmAt = h; if (h >= OVER && overAt == null) overAt = s;
    if (s % 8 === 0) tr.push([h, run[0], run[1], o.alarm]); }
  const ok = { over: overAt == null, dry: dryRun === 0 && pg.dry >= .45, hyst: pg.start1 - pg.stop >= .5 && starts <= 60, alt: used[0] > 0 && used[1] > 0, alarm: alarmAt != null && alarmAt < OVER - .2 && pg.alarm <= OVER - .3 && pg.alarm > pg.start2 };
  return { ok, all: Object.values(ok).every(Boolean), tr, maxH, starts };
}

/* ---------- állapot ---------- */
export function freshState() {
  return { v: 1, ch: 1, cp: 0, t: 0, lvl: 2.15, qin: .0032,
    mains: 1, gen: { fuel: .02, bat: 0, estop: 1, pre: 0, run: 0, warm: 0, crank: 0 }, ats: 'net',
    cab: { q0: 0, fuse: [1, 0, 1], q: [0, 0, 0, 0, 0], jumper: 1, short: 0, seenShort: 0 },
    mode: ['A', 'A'], run: [0, 0], pblock: 0, lock: [0, 0], clog: [1, 0], trip: [0, 0], dryT: [0, 0], clogT: [0, 0], press: 0, mem: { req1: false, req2: false, lead: false, prev1: false }, alarm: 0,
    wires: {}, wiredOK: 0, prog: { ...PROG_BAD, code: [...PROG_BAD.code] }, progTested: 0, progOK: 0,
    well: { hatch: 0, vent: 0, h2s: 0, in: 0, float: 0, p1up: 0, p1clean: 0, faintT: 0 },
    modem: { pwr: 0, ant: 0, boot: 0, online: 0 }, valve: 0, eastGate: 0, door: 0,
    inv: { lampa: 1, gaz: 1, kulcs: 1, elem: 0, multi: 0, csavar: 0, fogo: 0, laptop: 0, lakat: 0, biztositek: 0, ncsatl: 0, tkulcs: 0, kanna: 0, drot: 0 },
    bat: 1, flash: 1, docs: {}, f: {}, stats: { over: 0, gas: 0 }, done: [] };
}
export const ITEMN = { lampa: 'Zseblámpa', gaz: 'Gázérzékelő (H₂S)', kulcs: 'Kulcscsomó', elem: 'Tartalék elem', multi: 'Multiméter', csavar: 'Csavarhúzó', fogo: 'Oldalcsípő fogó', laptop: 'Szervizlaptop', lakat: 'Személyes lakat (LOTO)', biztositek: 'Biztosítóbetét 6 A gG', ncsatl: 'N-csatlakozó (antennakábelhez)', tkulcs: 'Tolózárkulcs (T-kulcs)', kanna: 'Gázolajos kanna (20 l)', drot: 'Drótdarab (bizonyíték)' };

/* ---------- a telep egy lépése ---------- */
export function supply(S) { return (S.mains && S.ats === 'net') || (S.gen.run && S.gen.warm >= 1 && S.ats === 'gen'); }
export const cabPow = S => supply(S) && S.cab.q0;
export const v24 = S => cabPow(S) && S.cab.fuse[1] && S.cab.q[1] && !S.cab.jumper;
export const plcRun = S => v24(S);
export const lightPow = S => cabPow(S) && S.cab.q[0];
export const wireAt = (S, t) => Object.keys(S.wires).find(k => S.wires[k] === t);
export const ltOK = S => S.wires.W102 === 2, lshOK = S => S.wires.W104 === 4 && S.wires.W106 === 6, lslOK = S => S.wires.W105 === 5 && S.wires.W106 === 6, fbOK = S => S.wires.WX === 7;
export function step(S, dt, ev) {
  const sup = supply(S), cp = cabPow(S), plc = plcRun(S), q = S.cab.q;
  // aggregát
  const G = S.gen; if (G.run) { G.fuel = Math.max(0, G.fuel - dt / 2400); G.warm = Math.min(1, G.warm + dt / 8); if (G.fuel <= 0 || G.estop) { G.run = 0; G.warm = 0; ev('gen_stop'); } } else G.warm = 0;
  // szint, úszók
  const lsl = S.lvl > LSL_H, lsh = !S.well.float ? true : S.lvl > LSH_H;   // a magas úszót felkötötték: mindig jelez
  const lt = plc && ltOK(S) ? S.lvl : 0;
  let auto = { p1: false, p2: false, alarm: false, dry: true };
  if (plc && ltOK(S)) auto = plcStep(S.prog, lt, lslOK(S) ? lsl : false, lshOK(S) ? lsh : false, S.mem);
  S.alarm = plc && auto.alarm ? 1 : 0;
  let out = 0; S.run = [0, 0]; if (S.pblock > 0) S.pblock -= dt;
  for (let i = 0; i < 2; i++) { const m = S.mode[i], br = cp && q[2 + i], want = m === 'K' ? 1 : m === 'A' ? (S.progOK && (i ? auto.p2 : auto.p1)) : 0, run = br && want && !S.lock[i] && !S.trip[i] && !(i === 0 && S.well.p1up > 0) && !(S.pblock > 0);
    S.run[i] = run ? 1 : 0; if (!run) { S.dryT[i] = 0; S.clogT[i] = 0; continue; }
    if (S.clog[i]) { if ((S.clogT[i] += dt) > 12) { S.trip[i] = 1; ev('trip_clog', i); } continue; }
    if (S.lvl < .45) { if ((S.dryT[i] += dt) > 4) { S.trip[i] = 1; ev('trip_dry', i); } }
    if (S.valve < .5 && S.f.valveShut) { S.press = Math.min(9, S.press + dt * .35); if (S.press > 6) { S.pblock = 25; ev('trip_press', i); } continue; }
    out += PUMP_Q * (S.valve < 1 && S.f.valveShut ? S.valve : 1); }
  if (!S.run[0] && !S.run[1]) S.press = Math.max(0, S.press - dt * .5); else if (!(S.valve < .5 && S.f.valveShut)) S.press = Math.max(1.2, Math.min(2.4, S.press + (1.8 - S.press) * dt));
  S.lvl = Math.max(.2, S.lvl + (S.qin - out) * dt);
  if (S.lvl >= OVER && !S.f.overNow) { S.f.overNow = 1; S.stats.over = (S.stats.over || 0) + 1; ev('overflow'); }
  // akna: gáz
  const W = S.well, vent = W.vent && lightPow(S);
  if (W.in) { W.h2s = vent ? Math.max(1.2, W.h2s - dt * 1.6) : Math.min(40, W.h2s + dt * (W.h2s < 5 ? .7 : .55)); } else W.h2s = Math.max(0, W.h2s - dt * 3);
  if (W.h2s >= 10 && !S.f.gasA2) { S.f.gasA2 = 1; S.stats.gas = (S.stats.gas || 0) + 1; } if (W.h2s < 8) S.f.gasA2 = 0;
  if (W.in && W.h2s >= 15) { if ((W.faintT += dt) > 14) { W.faintT = 0; ev('faint'); } } else W.faintT = Math.max(0, W.faintT - dt);
  // modem
  const M = S.modem; if (M.pwr && cp && q[4] && M.ant) { if (!M.online && (M.boot += dt) > 6) { M.online = 1; ev('online'); } } else { M.boot = 0; if (M.online) { M.online = 0; } }
  // zseblámpa elem
  if (S.flash) { S.bat = Math.max(0, S.bat - dt / 540); if (S.bat <= 0) S.flash = 0; }
  S.t += dt;
}

/* ---------- ellenőrzőpontok: mentett állapot (mély másolat) ---------- */
export const clone = o => JSON.parse(JSON.stringify(o));
