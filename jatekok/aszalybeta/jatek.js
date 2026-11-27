/* Aszálytúlélő: Nagy Szárazság – játékmotor (béta)
   Egy pálya, 60 perc + finálé. Egyszerre legfeljebb egy boss. A pontszám NEM kerül ranglistára. */
import * as A from './rajz.js?v=202611272153';
import { FAM, FAM_T, FAM_N, EAI, HP_T, SP_T, DMG_T, XP_T, SIZE_T, WEAP, EVO, EVON, EVOD, PASS, CHARS, SIG, SIGEVO, BOSSQ, BOSS, RELIC, EVENTS, MAXLV, SIGLV } from './adat.js?v=202611272153';

const TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), pick = a => a[Math.floor(Math.random() * a.length)];
const fmtT = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const cv = document.getElementById('c'), cx = cv.getContext('2d');
const Q = new URLSearchParams(location.search), TESZT = Q.has('teszt');
let DPR = 1, VW = 0, VH = 0, SC = 1;
export const V = { hw: 0, hh: 0 };
let ZM = 1;
function setV() { V.hw = VW / 2 / (SC * ZM); V.hh = VH / 2 / (SC * ZM); }
function resize() { DPR = Math.min(2, devicePixelRatio || 1); VW = innerWidth; VH = innerHeight; cv.width = VW * DPR; cv.height = VH * DPR; SC = clamp(Math.min(VW, VH) / 620, .62, 1.35); setV(); }
addEventListener('resize', resize); resize();
const MOBILE = matchMedia('(pointer:coarse)').matches;

/* ---------- sprite-ok: az SVG rajzokból egyszer raszterizálva ---------- */
const SPR = new Map();
export function sprite(key, inner, vb, w, h) {
  let s = SPR.get(key); if (s) return s;
  s = { c: null, w, h }; SPR.set(key, s);
  const k = Math.min(2.2, DPR * 1.25), img = new Image();
  img.onload = () => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k)); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); s.c = c; };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(A.svgOf(inner, vb));
  return s;
}
function variant(s, key, col) { key = 'v_' + key; if (!s.c) return null; if (s[key]) return s[key]; const c = document.createElement('canvas'); c.width = s.c.width; c.height = s.c.height; const g = c.getContext('2d'); g.drawImage(s.c, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); return (s[key] = c); }
export const svgURL = (inner, vb) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(A.svgOf(inner, vb));
const ENA = Object.fromEntries(A.EN.map(e => [e[0], e]));
const enSprite = (k, D) => sprite('e_' + k, ENA[k][7], '0 0 120 120', D, D);
const ART = { kk: A.kk, hf: A.hf, stw: A.stw, ldm: A.ldm, wdk: A.wdk, szl: A.szl, god: A.god, pGh: A.pGh, pRl: A.pRl, pGt: A.pGt, pKt: A.pKt, pZr: A.pZr, pBt: A.pBt };
export const artOf = (n, v = 'f', e = 'calm') => ART[n](v, e);

/* ---------- hang ---------- */
let AC = null, muted = (() => { try { return localStorage.getItem('hgws_aszalybeta_mute') === '1'; } catch (_) { return false; } })();
const snd = (f, d = .08, type = 'square', v = .04, f2) => { if (muted) return; try { AC = AC || new AudioContext(); const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime; o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + .02); } catch (_) {} };
const Sfx = { shot: () => snd(880, .04, 'triangle', .012, 520), hit: () => snd(200, .05, 'square', .015, 120), lv: () => { snd(523, .12, 'triangle', .05); setTimeout(() => snd(784, .16, 'triangle', .05), 90); }, boom: () => snd(90, .35, 'sawtooth', .07, 40), pick: () => snd(1200, .03, 'sine', .015, 1600), boss: () => { snd(70, .9, 'sawtooth', .08, 50); }, warn: () => snd(440, .2, 'square', .03, 330) };
export const toggleMute = () => { muted = !muted; try { localStorage.setItem('hgws_aszalybeta_mute', muted ? '1' : '0'); } catch (_) {} return muted; };
export const isMuted = () => muted;

/* ---------- állapot ---------- */
export let S = null;
let hooks = {};
export function setHooks(h) { hooks = h; }
const GR = new Map(), CS = 64;
const gk = (a, b) => (a + 524288) * 1048576 + (b + 524288);
function gridBuild() { GR.clear(); for (const e of S.en) { if (e.dead || e.under) continue; const k = gk(Math.floor(e.x / CS), Math.floor(e.y / CS)); let l = GR.get(k); if (!l) GR.set(k, l = []); l.push(e); } }
function near(x, y, r, fn) { const x0 = Math.floor((x - r - 50) / CS), x1 = Math.floor((x + r + 50) / CS), y0 = Math.floor((y - r - 50) / CS), y1 = Math.floor((y + r + 50) / CS);
  for (let a = x0; a <= x1; a++) for (let b = y0; b <= y1; b++) { const l = GR.get(gk(a, b)); if (!l) continue; for (const e of l) { if (e.dead) continue; const dx = e.x - x, dy = e.y - y, q = r + e.r; if (dx * dx + dy * dy < q * q) fn(e, dx, dy); } } }
function nearest(range, from = S.P) { let b = null, bd = range * range; for (const e of S.en) { if (e.dead || e.under || e.fake || e.ally) continue; const d = (e.x - from.x) ** 2 + (e.y - from.y) ** 2; if (d < bd) { bd = d; b = e; } } return b; }
function nearestN(range, n) { const out = []; for (const e of S.en) { if (e.dead || e.under || e.fake || e.ally) continue; const d = (e.x - S.P.x) ** 2 + (e.y - S.P.y) ** 2; if (d > range * range) continue; out.push([d, e]); } out.sort((a, b) => a[0] - b[0]); return out.slice(0, n).map(o => o[1]); }
function randEnemy(range = 420) { const n = S.en.length; for (let i = 0; i < 16 && n; i++) { const e = S.en[Math.floor(Math.random() * n)]; if (!e.dead && !e.under && !e.fake && Math.abs(e.x - S.P.x) < Math.min(range, V.hw) && Math.abs(e.y - S.P.y) < Math.min(range, V.hh)) return e; } return null; }
const part = (x, y, n, c, v = 110, l = .45, sz = 3) => { for (let i = 0; i < n && S.pt.length < 260; i++) { const a = Math.random() * TAU, s = v * (.35 + Math.random() * .65); S.pt.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l, L: l, c, sz }); } };
const txt = (x, y, t, c = '#fff', big = 0) => { if (S.txt.length < 50) S.txt.push({ x, y, t, c, l: big ? 1.6 : .7, big }); };
export const banner = (t, sub = '', c = '#ffd27a', d = 3) => { S.banner = { t, sub, c, l: d, L: d }; };

const lv = k => S.w[k]?.lv || 0, pl = k => S.pass[k] || 0;
const META_DEF = { gold: 0, up: {}, flags: {}, best: {}, seal: '' };
export function loadMeta() { try { return Object.assign(structuredClone(META_DEF), JSON.parse(localStorage.getItem('hgws_aszalybeta') || '{}')); } catch (_) { return structuredClone(META_DEF); } }
export function saveMeta(m) { try { localStorage.setItem('hgws_aszalybeta', JSON.stringify(m)); } catch (_) {} }
export let META = loadMeta();
export const reloadMeta = () => { META = loadMeta(); return META; };
const mu = k => META.up[k] || 0;

function stats() {
  const c = S.ch.st || {}, rel = S.relic;
  S.st = {
    speed: 150 * (1 + .09 * pl('csizma') + .05 * mu('spd') + (c.speed || 0) + (rel.fog ? .1 : 0)), magnet: 90 * (1 + .35 * pl('magnes') + .2 * mu('magnet')),
    dmg: (1 + .12 * pl('nyomas') + .05 * mu('dmg') + (rel.korona ? .1 : 0)) * (S.ev.tilalom ? .8 : 1), cd: Math.max(.35, 1 - .07 * pl('idozito') - .05 * pl('hutoborda') - .03 * mu('cd') + (c.cd || 0) - .08 * pl('kave')),
    area: 1 + .1 * pl('fuvoka') + .05 * mu('area') + (c.area || 0), dur: 1 + .15 * pl('hosszabbito') + .1 * mu('dur'), armor: pl('kesztyu') + mu('armor') + (c.armor || 0),
    regen: (.3 * pl('gyujto') + .1 * mu('regen')) * (S.phase === 'wrath' ? .5 : 1) * (S.ev.hoseg ? 0 : 1), extra: pl('tartaly'), luck: 1 + .3 * pl('lohere') + .1 * mu('luck'),
    xp: 1 + .1 * pl('vizszuro') + .05 * mu('xp') + (c.xp || 0), crit: .05 + .08 * pl('napszem'), heal: 1 + .25 * pl('kulacs'), pspd: 1 + .15 * pl('szivattyu'), dred: 1 - .15 * pl('esernyo'), burn: 1 - .25 * pl('szalmakalap')
  };
  S.P.mhp = Math.round((100 + 20 * pl('vitamin') + (c.hp || 0)) * (1 + .1 * mu('hp')));
  S.P.hp = Math.min(S.P.hp, S.P.mhp);
}

/* ---------- térkép: végtelen, darabolt talaj, tájegységekkel ---------- */
const CH = 512, CHK = new Map();
const hsh = (a, b, s = 0) => { let h = (a * 374761393 + b * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const BIOME = [['#8a7a4e', '#6e6238', '#a8946a'], ['#d2aa68', '#b88a4a', '#e8c88a'], ['#8a7e70', '#6a6258', '#a89a88'], ['#7a6a52', '#5a4c3a', '#9a8a6a']];
const biomeAt = (wx, wy) => { const u = wx / 1400, v = wy / 1400, n = Math.sin(u * 1.3 + Math.cos(v * .9) * 1.7) + Math.cos(v * 1.1 - Math.sin(u * .7) * 1.3); return n > .8 ? 1 : n < -.8 ? 3 : Math.sin(u * 2.1) * Math.cos(v * 1.9) > .6 ? 2 : 0; };
const CELL = 128;
function chunk(a, b) {
  const k = a + ',' + b; let c = CHK.get(k); if (c) return c;
  if (CHK.size > 48) CHK.delete(CHK.keys().next().value);
  c = document.createElement('canvas'); c.width = c.height = CH; const g = c.getContext('2d'), X0 = a * CH, Y0 = b * CH;
  /* alapszín: négy sarok tájegységéből kevert színátmenet, így a darabok illeszkednek */
  const corner = (x, y) => BIOME[biomeAt(x, y)][0], gr = g.createLinearGradient(0, 0, CH, CH);
  gr.addColorStop(0, corner(X0, Y0)); gr.addColorStop(1, corner(X0 + CH, Y0 + CH)); g.fillStyle = gr; g.fillRect(0, 0, CH, CH);
  const gr2 = g.createLinearGradient(CH, 0, 0, CH); gr2.addColorStop(0, corner(X0 + CH, Y0) + '80'); gr2.addColorStop(1, corner(X0, Y0 + CH) + '80'); g.fillStyle = gr2; g.fillRect(0, 0, CH, CH);
  const c0 = Math.floor((X0 - CELL) / CELL), c1 = Math.floor((X0 + CH + CELL) / CELL), r0 = Math.floor((Y0 - CELL) / CELL), r1 = Math.floor((Y0 + CH + CELL) / CELL);
  for (let i = c0; i <= c1; i++) for (let j = r0; j <= r1; j++) { const bi = biomeAt(i * CELL, j * CELL), [, dark, light] = BIOME[bi];
    for (let q = 0; q < 3; q++) { const x = (i + hsh(i, j, q)) * CELL - X0, y = (j + hsh(j, i, q + 5)) * CELL - Y0; g.fillStyle = (q % 2 ? dark : light) + '50'; g.beginPath(); g.ellipse(x, y, 24 + hsh(i, q, j) * 50, 12 + hsh(q, i, j) * 24, hsh(q, q, i) * 3, 0, TAU); g.fill(); } }
  g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 2; g.lineCap = 'round';
  for (let i = c0; i <= c1; i++) for (let j = r0; j <= r1; j++) { if (hsh(i, j, 77) > .45) continue; let x = (i + hsh(i, j, 11)) * CELL - X0, y = (j + hsh(j, i, 12)) * CELL - Y0; g.beginPath(); g.moveTo(x, y); for (let t = 0; t < 4; t++) { x += (hsh(i, t, j) - .5) * 70; y += (hsh(t, j, i) - .5) * 70; g.lineTo(x, y); } g.stroke(); }
  for (let i = c0; i <= c1; i++) for (let j = r0; j <= r1; j++) { const bi = biomeAt(i * CELL, j * CELL); for (let q = 0; q < 2; q++) { const t = hsh(i, j, 300 + q), x = (i + hsh(i, j, 310 + q)) * CELL - X0, y = (j + hsh(j, i, 320 + q)) * CELL - Y0;
    if (bi === 2 && t < .4) { g.fillStyle = '#5a544a'; g.fillRect(x, y, 18 + t * 30, 10); g.fillStyle = '#7a7366'; g.fillRect(x, y - 3, 18 + t * 30, 4); }
    else if (t < .3) { g.strokeStyle = '#3a2a1a'; g.lineWidth = 1.5; g.beginPath(); for (let m = 0; m < 6; m++) { g.moveTo(x, y); g.lineTo(x + Math.cos(m) * 12, y - 6 - Math.sin(m * 1.3) * 10); } g.stroke(); }
    else if (t < .55) { g.fillStyle = 'rgba(70,60,50,.7)'; g.beginPath(); g.ellipse(x, y, 6 + t * 8, 4 + t * 4, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(x - 2, y - 2, 3, 2, 0, 0, TAU); g.fill(); }
    else if (t < .62 && bi === 3) { g.fillStyle = '#e8dcc4'; g.fillRect(x, y, 10, 2); g.fillRect(x + 4, y - 3, 2, 8); } } }
  CHK.set(k, c); return c;
}

/* ---------- indítás ---------- */
export function newRun(charId, seal = '') {
  const ch = CHARS.find(c => c.id === charId) || CHARS[0];
  S = {
    ch, seal, t: 0, diffT: 0, bclock: 0, bcool: 0, bq: 0, boss: null, phase: 'run', phT: 0, wrathMin: 0, god: null, arena: null, crystals: [],
    P: { x: 0, y: 0, hp: 100, mhp: 100, vx: 0, vy: 1, face: 1, inv: 0, shield: 0, shieldT: 0, lastHurt: 0, still: 0, revive: mu('revive') + 0, dirX: 1, dirY: 0 },
    en: [], pr: [], ep: [], fx: [], gems: [], items: [], props: [], pt: [], txt: [], tele: [], allies: [],
    w: {}, wo: [], pass: {}, po: [], xp: 0, lv: 1, kills: 0, score: 0, gold: 0, choose: null, pend: 0, chest: 0, sT: 0, eid: 0,
    rr: 1 + mu('reroll') + ((ch.st || {}).reroll || 0), skip: 1 + mu('skip'), ban: mu('banish'), banned: new Set(), relic: {}, wslots: 6,
    ev: {}, evDone: new Set(), banner: null, shake: 0, paused: false, over: false, win: false, dmgBy: {}, godDmg: 0, wdisable: 0, stolen: null, rule: null, ruleT: 0, hudHide: 0,
    evoMade: 0, flags: {}, bossKills: 0, lvlUps: 0
  };
  stats(); S.P.hp = S.P.mhp;
  addW(ch.w, true); if (mu('startlv')) S.w[ch.w].lv = 2;
  if (mu('vpajzs')) S.P.shield = 1;
  // a pálya kutai / öntözőfejei
  for (let i = 0; i < 6; i++) spawnProp(rnd(-900, 900), rnd(-900, 900));
  banner(ch.n, 'Túléld a Nagy Szárazságot!', '#9ad8ff', 3);
  preload();
  return S;
}
function preload() { for (const e of A.EN) enSprite(e[0], 96); for (const k in BOSS) bossSprite(k); for (const c of CHARS) charSprite(c); }
const charSprite = (c, e) => sprite('c_' + c.id + (e || ''), ART[c.art]('f', e || c.e), '20 0 160 300', 56, 105);
const bossSprite = k => { const B = BOSS[k]; return sprite('b_' + k, k === 'isten' ? A.god('f', 'calm') : ART[B.art]('f', k === 'szilard' ? 'smirk' : B.art === 'hf' ? 'calm' : 'calm'), k === 'kaktusz' ? '24 0 152 300' : '0 0 200 300', B.size, B.size * 1.5); };
const bossSpriteE = (k, e) => { const B = BOSS[k]; return sprite('b_' + k + e, k === 'isten' ? A.god('f', e) : ART[B.art]('f', e), k === 'kaktusz' ? '24 0 152 300' : '0 0 200 300', B.size, B.size * 1.5); };

/* ---------- fegyverek kezelése ---------- */
function addW(id, sig = false) { if (S.w[id]) { S.w[id].lv++; } else { S.w[id] = { lv: 1, t: rnd(0, .4), sig, st: {} }; S.wo.push(id); } }
function addP(id) { if (!S.pass[id]) S.po.push(id); S.pass[id] = (S.pass[id] || 0) + 1; stats(); if (id === 'vitamin') heal(20); }
const isEvo = id => !!EVON[id] || !!SIGEVO[id];
const maxOf = id => S.w[id]?.sig ? SIGLV : MAXLV;
function wName(id) { return WEAP[id]?.n || SIG[id]?.n || EVON[id] || SIGEVO[id]?.[0] || id; }
export function evoInfo(id) { const e = EVO.find(x => x[0] === id); if (e) return PASS[e[1]].n + ' → ' + EVON[e[2]]; const s = SIG[id]; if (s) return PASS[s.evoP].n + ' → ' + SIGEVO[s.evo][0]; return ''; }
function canEvolve() {
  for (const [w, p, ev] of EVO) if (S.w[w] && S.w[w].lv >= MAXLV && pl(p) && !S.w[ev]) return [w, ev];
  const sid = S.ch.w, sg = SIG[sid]; if (S.w[sid] && S.w[sid].lv >= SIGLV && pl(sg.evoP) && !S.w[sg.evo]) return [sid, sg.evo];
  return null;
}
function evolve(w, ev) { const i = S.wo.indexOf(w); delete S.w[w]; S.w[ev] = { lv: 1, t: 0, evo: true, sig: !!SIGEVO[ev], st: {} }; S.wo[i] = ev; S.evoMade++; banner('EVOLÚCIÓ!', EVON[ev] || SIGEVO[ev][0], '#ffd27a', 3); Sfx.lv(); hooks.flag?.('evo'); }

/* ---------- szintlépési kártyák ---------- */
function choices(n) {
  const pool = [], wN = S.wo.length, pN = S.po.length;
  for (const id of S.wo) if (!isEvo(id) && S.w[id].lv < maxOf(id)) pool.push({ k: 'w', id, w: S.w[id].sig ? 3 : 2.4 });
  for (const id of S.po) if (pl(id) < (PASS[id].mx || MAXLV)) pool.push({ k: 'p', id, w: 1.6 });
  if (wN < S.wslots) for (const id in WEAP) if (!S.w[id] && !S.banned.has(id) && !EVO.some(e => e[0] === id && S.w[e[2]])) pool.push({ k: 'w', id, w: 1 });
  if (pN < 6) for (const id in PASS) if (!S.pass[id] && !S.banned.has(id)) pool.push({ k: 'p', id, w: .8 });
  const out = []; while (out.length < n && pool.length) { let r = Math.random() * pool.reduce((a, x) => a + x.w, 0), i = 0; for (; i < pool.length; i++) if ((r -= pool[i].w) <= 0) break; out.push(pool.splice(Math.min(i, pool.length - 1), 1)[0]); }
  if (!out.length) out.push({ k: 'gold' }, { k: 'heal' });
  return out.map(c => {
    if (c.k === 'gold') return { ...c, n: 'Aranycsepp', d: '+25 aranycsepp', lvl: '' };
    if (c.k === 'heal') return { ...c, n: 'Friss víz', d: '+40 élet', lvl: '' };
    if (c.k === 'w') { const cur = lv(c.id), sig = S.w[c.id]?.sig, D = sig ? SIG[c.id].d : WEAP[c.id].d; return { ...c, n: wName(c.id), d: D[cur] || D[D.length - 1], lvl: cur ? (cur + 1) + '. szint' : 'ÚJ', evo: evoInfo(c.id), sig }; }
    const cur = pl(c.id); return { ...c, n: PASS[c.id].n, d: PASS[c.id].d, lvl: cur ? (cur + 1) + '. szint' : 'ÚJ' };
  });
}
function openChoose() { const n = 3 + (pl('lohere') >= 5 ? 1 : 0) + (S.seal === 'letra' && S.lv % 5 === 0 ? 1 : 0); S.choose = choices(n); hooks.choose?.(S.choose); }
export function pickChoice(i) {
  const c = S.choose?.[i]; if (!c) return;
  if (c.k === 'w') addW(c.id); else if (c.k === 'p') addP(c.id); else if (c.k === 'gold') S.gold += 25; else if (c.k === 'heal') heal(40);
  S.choose = null; hooks.choose?.(null); S.lvlUps++; if (S.pend > 0) { S.pend--; openChoose(); }
}
export function reroll() { if (S.rr <= 0 || !S.choose) return; S.rr--; openChoose(); }
export function skipChoice() { if (S.skip <= 0 || !S.choose) return; S.skip--; S.choose = null; hooks.choose?.(null); S.gold += 5; if (S.pend > 0) { S.pend--; openChoose(); } }
export function banishChoice(i) { const c = S.choose?.[i]; if (S.ban <= 0 || !c || !c.id || S.w[c.id] || S.pass[c.id]) return false; S.ban--; S.banned.add(c.id); openChoose(); return true; }

/* ---------- ellenségek ---------- */
function edgePos(m = 60) { const w = V.hw + m, h = V.hh + m, r = Math.random() * (w + h) * 2, s = Math.random() < .5 ? -1 : 1; const [ox, oy] = r < w * 2 ? [r - w, s * h] : [s * w, r - w * 2 - h]; return [S.P.x + ox, S.P.y + oy]; }
function hpMul() { const m = S.diffT / 60, heat = mu('heat'); let k = (1 + m * .11 + (m / 10) ** 2 * .35) * (1 + heat * .12) * (S.seal === 'arnyek' ? 1.25 : 1); if (S.phase === 'wrath') k *= 1.6 + .08 * S.wrathMin; return k; }
function dmgMul() { const m = S.diffT / 60; let k = (1 + m * .035) * (1 + mu('heat') * .06); if (S.phase === 'wrath') k *= 1.25 + .08 * S.wrathMin; return k; }
export function spawnEnemy(k, x, y, o = {}) {
  const E = ENA[k], T = EAI[k], tier = E[5], spT = E[6], hp = HP_T[tier] * hpMul() * (o.hpm || 1), elite = S.phase === 'wrath' || o.elite;
  const e = { id: ++S.eid, k, E, T, x, y, hp, mhp: hp, r: SIZE_T[tier] * .55 * (elite ? 1.12 : 1), sp: SP_T[spT] * rnd(.9, 1.1) * (1 + mu('curse') * .1) * (S.phase === 'wrath' ? 1 + .03 * S.wrathMin : 1), dmg: DMG_T[tier] * dmgMul(),
    xp: XP_T[tier], flash: 0, kx: 0, ky: 0, slow: 0, freeze: 0, t: rnd(0, 2), st: 0, face: 1, elite, ph: Math.random() * TAU, D: 96 * (SIZE_T[tier] / 30) * (elite ? 1.12 : 1), ...o };
  S.en.push(e); return e;
}
function familyPool() {
  const m = S.t / 60, fams = FAM.filter((f, i) => m >= FAM_T[i] || S.phase !== 'run'), newest = fams[fams.length - 1], pool = [];
  for (const e of A.EN) { if (!fams.includes(e[2])) continue; let w = EAI[e[0]].w; if (e[2] === newest && S.phase === 'run') w *= 1.7; pool.push([e[0], w]); }
  return pool;
}
function pickEnemy() { const pool = familyPool(); let r = Math.random() * pool.reduce((a, x) => a + x[1], 0); for (const [k, w] of pool) if ((r -= w) <= 0) return k; return 'ghoul'; }
function spawnWave(dt) {
  const cap = MOBILE ? 190 : 280;
  let rate = 1.1 + (S.diffT / 60) * .17 + mu('curse') * .2;
  if (S.phase === 'bloom') rate = Math.max(0, 2 * (1 - S.phT / 40));
  if (S.phase === 'wrath') rate = 7 + S.wrathMin * .5;
  if (S.phase === 'descent' || S.phase === 'god' || S.phase === 'win') rate = 0;
  if (S.boss) rate *= .55;
  S.sT += dt * rate;
  while (S.sT >= 1) { S.sT--; if (S.en.length >= cap) break; spawnOne(); }
}
function spawnOne(k = pickEnemy()) {
  const T = EAI[k], [x, y] = edgePos();
  if (T.ai === 'formation') { const a = Math.atan2(S.P.y - y, S.P.x - x), px = -Math.sin(a), py = Math.cos(a); for (let i = 0; i < 6; i++) spawnEnemy(k, x + px * (i - 2.5) * 34, y + py * (i - 2.5) * 34, { fdir: a }); return; }
  if (T.ai === 'mirage') { const r = spawnEnemy(k, x, y); for (let i = 0; i < 2; i++) spawnEnemy(k, x + rnd(-80, 80), y + rnd(-80, 80), { fake: 1, hp: 1, mhp: 1, xp: 0 }); return r; }
  if (T.ai === 'trap' || T.ai === 'turret' || T.ai === 'mine') { const a = Math.random() * TAU, d = rnd(180, Math.min(V.hw, V.hh) * .95); return spawnEnemy(k, S.P.x + Math.cos(a) * d, S.P.y + Math.sin(a) * d, { rise: .8 }); }
  const n = T.pack || 1; for (let i = 0; i < n; i++) spawnEnemy(k, x + rnd(-30, 30), y + rnd(-30, 30));
}

function hurtPlayer(d, src = '') {
  const P = S.P; if (P.inv > 0 || S.over || S.win) return;
  if (S.rule === 'immortal') return;
  if (P.shield > 0) { P.shield--; P.inv = .6; part(P.x, P.y, 14, '#9ad8ff', 160); Sfx.hit(); if (S.w.buborek || S.w.buborekvar) buborekPop(); return; }
  d = Math.max(1, (d - S.st.armor) * S.st.dred); if (src === 'burn') d *= S.st.burn;
  P.hp -= d; P.inv = .45; P.lastHurt = 0; S.shake = Math.max(S.shake, 5); Sfx.hit();
  if (P.hp <= 0) {
    if (S.relic.orzo && !S.relic.orzoUsed) { S.relic.orzoUsed = 1; P.hp = P.mhp * .5; P.inv = 2; banner('ŐRZŐ PAJZS', 'Túlélted a halálos ütést', '#9ad8ff'); return; }
    if (P.revive > 0) { P.revive--; P.hp = P.mhp; P.inv = 2.5; banner('FELTÁMADÁS', '', '#9ad8ff'); for (const e of S.en) if (!e.boss) e.kx += (e.x - P.x) * 2; return; }
    gameOver(false);
  }
}
const heal = h => { S.P.hp = Math.min(S.P.mhp, S.P.hp + h * (S.st?.heal || 1)); };

/* sebzés */
function hitE(e, dmg, o = {}) {
  if (e.dead || e.under || e.ally) return 0;
  if (e.fake) { e.dead = 1; part(e.x, e.y, 10, '#bfe8ff', 120); return 0; }
  if (e.immune) { if (Math.random() < .15) txt(e.x, e.y - e.r, 'VÉDETT', '#ffd27a'); return 0; }
  let d = dmg * S.st.dmg, crit = Math.random() < S.st.crit + (o.crit || 0);
  if (crit) d *= 2;
  if (e.boss) { if (e.resist && o.w === e.resist) d *= .7; if (e.dome && Math.hypot(e.x - S.P.x, e.y - S.P.y) > 120) d *= .25; if (e.link) d *= .5; if (e.vuln) d *= 1.15; if (e.godShield) d *= .02; if (e.bk === 'isten' && !e.godShield) d *= 2; }
  if (e.T?.ai === 'shield' && !o.top) { const fx = S.P.x - e.x, fy = S.P.y - e.y, hx = (o.sx ?? S.P.x) - e.x, hy = (o.sy ?? S.P.y) - e.y; if ((fx * hx + fy * hy) / (Math.hypot(fx, fy) * Math.hypot(hx, hy) + .01) > .55) d *= e.T.half ? .5 : .2; }
  if (e.vulnT > 0) d *= 1.15;
  e.hp -= d; if (!e.boss || e.flash < -.15) e.flash = .1; if (e.boss) { S.dmgBy[o.w || '?'] = (S.dmgBy[o.w || '?'] || 0) + d; e.lastHit = 0; if (e.bk === 'isten') S.godDmg += d; }
  if (o.kb && !e.boss) { const a = Math.atan2(e.y - (o.sy ?? S.P.y), e.x - (o.sx ?? S.P.x)); e.kx += Math.cos(a) * o.kb; e.ky += Math.sin(a) * o.kb; }
  if (o.slow) e.slow = Math.max(e.slow, o.slow); if (o.freeze && !e.boss) e.freeze = Math.max(e.freeze, o.freeze);
  if (crit && S.seal === 'szintaxis' && !o.chain) { const n = nearest(200, e); if (n && n !== e) hitE(n, dmg * .6, { ...o, chain: 1 }); }
  if (S.txt.length < 40 && (crit || e.boss)) txt(e.x + rnd(-8, 8), e.y - e.r, Math.round(d) + '', crit ? '#ffd27a' : '#fff');
  if (o.ls) heal(o.ls);
  if (e.hp <= 0) kill(e);
  return d;
}
function kill(e) {
  if (e.dead) return; e.dead = 1;
  if (e.boss) return bossDie(e);
  if (e.crystalLink) return;
  S.kills++; S.score += Math.round(e.xp * 10 * (S.seal === 'arnyek' ? 1.5 : 1) * (1 + mu('curse') * .1));
  part(e.x, e.y, 6, e.elite ? '#ff6a4a' : '#d8c8a8', 90);
  if (e.xp > 0) S.gems.push({ x: e.x, y: e.y, v: e.xp * (e.elite ? 2 : 1) });
  if (Math.random() < .004 * S.st.luck) S.items.push({ x: e.x, y: e.y, k: pick(['heal', 'magnet', 'gold']) });
  if (pl('komposzt') && Math.random() < .01 * pl('komposzt')) S.items.push({ x: e.x, y: e.y, k: 'heal' });
  if (e.T.cloud) S.fx.push({ k: 'dust', x: e.x, y: e.y, r: 70, t: 0, d: 4 });
  if (e.T.ai === 'mine' && !e.blown) mineBoom(e);
}

/* ---------- ellenség-viselkedés ---------- */
function eShot(x, y, a, sp, dmg, kind = 'orb', r = 7, o = {}) { S.ep.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r, dmg, kind, l: o.l || 4, ...o }); }
function mineBoom(e) { e.blown = 1; S.fx.push({ k: 'boom', x: e.x, y: e.y, r: 85, t: 0, d: .4, c: '#ff5a3a' }); Sfx.boom(); if (Math.hypot(S.P.x - e.x, S.P.y - e.y) < 85) hurtPlayer(e.dmg * 2); near(e.x, e.y, 85, o => { if (o !== e && !o.boss) hitE(o, 40, { top: 1 }); }); }
function updEnemy(e, dt) {
  const P = S.P, dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1, T = e.T;
  if (e.rise > 0) { e.rise -= dt; return; }
  if (e.freeze > 0) { e.freeze -= dt; return; }
  e.t += dt; e.vulnT = Math.max(0, (e.vulnT || 0) - dt);
  let sp = e.sp * (e.slow > 0 ? .5 : 1) * (S.stopT > 0 ? 0 : 1), mx = dx / d, my = dy / d;
  if (e.stopT > 0) { e.stopT -= dt; sp = 0; }
  switch (T.ai) {
    case 'swarm': { const s = Math.sin(e.t * 4 + e.ph) * .9; mx += -my * s; my += (dx / d) * s; break; }
    case 'flank': { const s = d > 140 ? .8 : 0, side = e.id % 2 ? 1 : -1; mx += -my * s * side; my += (dx / d) * s * side; if (T.shade && Math.hypot(P.vx, P.vy) < 5) e.alpha = .25; else e.alpha = 1; if (T.burn && Math.random() < dt * 3) S.fx.push({ k: 'fire', x: e.x, y: e.y, r: 16, t: 0, d: 3 }); break; }
    case 'charge': if (e.st === 0 && d < T.range) { e.st = 1; e.stT = .8; e.cx = mx; e.cy = my; } if (e.st === 1) { sp = 0; if ((e.stT -= dt) <= 0) { e.st = 2; e.stT = .55; } } else if (e.st === 2) { sp = e.sp * 3.4; mx = e.cx; my = e.cy; if ((e.stT -= dt) <= 0) { e.st = 3; e.stT = 1.4; } } else if (e.st === 3) { sp *= .4; if ((e.stT -= dt) <= 0) e.st = 0; } break;
    case 'ghost': if (T.lure) near(e.x, e.y, 120, o => { if (o !== e && !o.boss) { o.kx += (e.x - o.x) * .05; o.ky += (e.y - o.y) * .05; } }); break;
    case 'ranged': case 'lob': { const keep = T.keep || 240; if (d < keep - 40) { mx = -mx; my = -my; } else if (d < keep + 40) sp = 0; e.cd = (e.cd ?? rnd(1, 2.5)) - dt;
      if (e.cd <= 0 && d < 560) { e.cd = T.ai === 'lob' ? 3.2 : 2.4; const a = Math.atan2(dy, dx); if (T.ai === 'lob') S.tele.push({ k: 'circle', x: P.x, y: P.y, r: 50, t: 0, d: 1.1, c: '#9aff3a', fire: o => { S.fx.push({ k: 'poison', x: o.x, y: o.y, r: 50, t: 0, d: 4 }); } }); else eShot(e.x, e.y, a, T.shot === 'bolt' ? 420 : 300, e.dmg, T.shot, T.shot === 'bolt' ? 6 : 6, { pierce: T.pierce }); } break; }
    case 'turret': sp = 0; e.cd = (e.cd ?? rnd(2, 4)) - dt; if (e.cd <= 0 && d < 600) { e.cd = 4.5; const a = Math.atan2(dy, dx); S.tele.push({ k: 'beam', x: e.x, y: e.y, a, len: 700, w: 16, t: 0, d: 1, c: '#ff5a2a', fire: o => { if (lineHit(o, P.x, P.y, 16)) hurtPlayer(e.dmg * 1.6); } }); } break;
    case 'trap': sp = 0; if (d < e.r + 40) { e.cd = (e.cd || 0) - dt; if (e.cd <= 0) { e.cd = 1.2; if (T.root) { P.root = .8; } if (T.bite) hurtPlayer(e.dmg); } } break;
    case 'summon': sp *= d < 260 ? 0 : 1; e.cd = (e.cd ?? 3) - dt; if (e.cd <= 0) { e.cd = 7; for (let i = 0; i < 2; i++) { const a = Math.random() * TAU; spawnEnemy(T.summon, P.x + Math.cos(a) * 110, P.y + Math.sin(a) * 110, { rise: .8, xp: 0 }); } } break;
    case 'heal': sp *= d < 220 ? 0 : 1; e.cd = (e.cd ?? 2) - dt; if (e.cd <= 0) { e.cd = 2.5; near(e.x, e.y, 160, o => { if (o !== e && !o.boss) { o.hp = Math.min(o.mhp, o.hp + o.mhp * .25); o.flash = .1; } }); S.fx.push({ k: 'ring', x: e.x, y: e.y, r: 160, t: 0, d: .5, c: '#ff3a2a' }); } break;
    case 'pull': e.cd = (e.cd ?? 3) - dt; if (e.cd <= 0 && d < 300) { e.cd = 5; eShot(e.x, e.y, Math.atan2(dy, dx), 360, e.dmg * .5, 'chain', 7, { pull: 1 }); } break;
    case 'mine': sp = 0; if (e.st === 0 && d < 140) { e.st = 1; e.stT = 3; } if (e.st === 1) { e.stT -= dt; e.num = Math.ceil(e.stT); if (e.stT <= 0) { mineBoom(e); e.dead = 1; } } break;
    case 'leech': if (e.att) { e.x = P.x + e.ox; e.y = P.y + e.oy; sp = 0; e.dr = (e.dr || 0) + dt; if (e.dr > .5) { e.dr = 0; hurtPlayer(2); } if (Math.hypot(P.vx, P.vy) > 100) e.shakeOff = (e.shakeOff || 0) + dt; if (e.shakeOff > 1.6) { e.att = 0; e.shakeOff = 0; e.kx = rnd(-200, 200); e.ky = rnd(-200, 200); } } else if (d < e.r + 16) { e.att = 1; e.ox = -dx * .6; e.oy = -dy * .6; } break;
    case 'watch': if (Math.hypot(P.vx, P.vy) < 5) e.wt = (e.wt || 0) + dt; else e.wt = 0; if (e.wt > 3) { e.wt = 0; S.tele.push({ k: 'beam', x: e.x, y: e.y, a: Math.atan2(dy, dx), len: 600, w: 14, t: 0, d: .6, c: '#ff3a2a', fire: o => { if (lineHit(o, P.x, P.y, 14)) hurtPlayer(e.dmg * 2); } }); } break;
    case 'tele': e.cd = (e.cd ?? 3) - dt; if (e.cd <= 0) { e.cd = 3.5; const a = Math.random() * TAU; part(e.x, e.y, 10, '#ff3a2a'); e.x = P.x + Math.cos(a) * 110; e.y = P.y + Math.sin(a) * 110; e.stopT = .5; } break;
    case 'grow': e.r = Math.min(e.r * (1 + dt * .03), 40); e.D = e.r / .55 / 30 * 96; if (Math.random() < dt * 2) S.fx.push({ k: 'mud', x: e.x, y: e.y, r: 22, t: 0, d: 5 }); break;
    case 'burn': if (Math.random() < dt * 3) S.fx.push({ k: 'fire', x: e.x, y: e.y, r: 18, t: 0, d: 6 }); break;
    case 'roll': e.cd = (e.cd ?? 3) - dt; if (e.cd <= 0) { e.cd = 5; e.rollT = 1.4; } if (e.rollT > 0) { e.rollT -= dt; sp *= 2.6; e.immune = 1; } else e.immune = 0; break;
    case 'dive': if (P.hp / P.mhp > .4 && d < 230) { mx = -my; my = dx / d; } else sp *= 1.5; break;
    case 'sip': for (const f of S.fx) if ((f.k === 'puddle' || f.k === 'spring') && Math.hypot(f.x - e.x, f.y - e.y) < 60) { f.t += dt * 2; e.hp = Math.min(e.mhp * 2, e.hp + dt * 4); } break;
    case 'herald': case 'drain': case 'curse': break;
    case 'formation': if (e.fdir != null && d > 200) { mx = Math.cos(e.fdir); my = Math.sin(e.fdir); } break;
  }
  if (P.root > 0 && T.ai !== 'trap') {}
  e.x += (mx * sp + e.kx) * dt; e.y += (my * sp + e.ky) * dt; e.kx *= .86; e.ky *= .86; e.slow -= dt;
  if (Math.abs(mx) > .1) e.face = mx > 0 ? 1 : -1;
  if (d < e.r + 14 && !e.fake && T.ai !== 'trap' && T.ai !== 'leech' && T.ai !== 'mine') {
    S.lastAttacker = e; hurtPlayer(e.dmg);
    if (P.inv > .4 && !e.boss) {
      if (T.ai === 'herald') disableWeapon(4);
      if (T.ai === 'drain') { S.P.drain = Math.min(.4, (S.P.drain || 0) + .1); S.P.drainT = 10; }
      if (T.ai === 'curse') { S.P.curse = 4; }
    }
  }
  if (d > Math.max(V.hw, V.hh) * 2.4 && !e.boss) { const [x, y] = edgePos(); e.x = x; e.y = y; }
}
function disableWeapon(s) { const ids = S.wo.filter(id => !S.w[id].off); if (!ids.length) return; const id = pick(ids); S.w[id].off = s; txt(S.P.x, S.P.y - 40, 'LOCSOLNI TILOS!', '#ff6a4a', 1); }
function lineHit(o, px, py, w) { const ex = o.x + Math.cos(o.a) * o.len, ey = o.y + Math.sin(o.a) * o.len, vx = ex - o.x, vy = ey - o.y, t = clamp(((px - o.x) * vx + (py - o.y) * vy) / (vx * vx + vy * vy), 0, 1); return Math.hypot(o.x + vx * t - px, o.y + vy * t - py) < w + 12; }

/* ---------- pálya-tárgyak (kutak, öntözőfejek) ---------- */
function spawnProp(x, y) { S.props.push({ x, y, hp: 20, k: Math.random() < .5 ? 'kut' : 'fej', r: 16 }); }
function breakProp(p) { p.dead = 1; part(p.x, p.y, 12, '#bfe8ff', 120); const r = Math.random(); S.items.push({ x: p.x, y: p.y, k: r < .4 ? 'heal' : r < .55 ? 'magnet' : r < .85 ? 'gold' : r < .93 ? 'storm' : 'ice' }); }

/* ---------- játékos-fegyverek ---------- */
function shoot(x, y, a, sp, dmg, o = {}) { S.pr.push({ x, y, vx: Math.cos(a) * sp * S.st.pspd, vy: Math.sin(a) * sp * S.st.pspd, r: o.r || 6, dmg, pierce: o.pierce || 0, l: o.l || 1.4, hit: new Set(), kind: o.kind || 'drop', w: o.w, kb: o.kb || 0, crit: o.crit || 0, ls: o.ls || 0, slow: o.slow, freeze: o.freeze, boom: o.boom, bounce: o.bounce, c: o.c }); Sfx.shot(); }
const aimAt = (e, from = S.P) => Math.atan2(e.y - from.y, e.x - from.x);
function aoe(x, y, r, dmg, o = {}) { let n = 0; near(x, y, r, e => { hitE(e, dmg, { ...o, sx: x, sy: y, top: o.top ?? 1 }); n++; }); for (const p of S.props) if (!p.dead && Math.hypot(p.x - x, p.y - y) < r + p.r) { p.hp -= dmg; if (p.hp <= 0) breakProp(p); } return n; }
function buborekPop() { const L = Math.max(lv('buborek'), S.w.buborekvar ? 5 : 0); aoe(S.P.x, S.P.y, 110 * S.st.area * (1 + L * .08), 30 + L * 8, { kb: 300, w: 'buborek' }); S.fx.push({ k: 'boom', x: S.P.x, y: S.P.y, r: 110 * S.st.area, t: 0, d: .35, c: '#9ad8ff' }); }
function fireWeapons(dt) {
  const P = S.P, st = S.st, A2 = st.area;
  for (const id of S.wo) {
    const W = S.w[id]; if (!W) continue; const L = W.lv;
    if (W.off > 0) { W.off -= dt; continue; }
    if (S.wdisable > 0 || (S.stolen === id)) continue;
    W.t -= dt * (S.P.curse > 0 ? .6 : 1);
    const cd = (base) => base * st.cd;
    switch (id) {
      case 'pisztoly': if (W.t <= 0) { const n = 1 + (L >= 2) + (L >= 4) + st.extra, tg = nearestN(520, n); if (tg.length) { W.t = cd(L >= 5 ? .55 : .8); tg.forEach((e, i) => setTimeout(() => S && shoot(P.x, P.y, aimAt(e), 520, 10 + L * 2, { pierce: (L >= 3) + (L >= 5), w: id }), i * 70)); } } break;
      case 'vizagyu': if (W.t <= 0) { const e = nearest(600); if (e) { W.t = cd(.9); shoot(P.x, P.y, aimAt(e), 560, 55, { pierce: 99, r: 16, kb: 400, l: 2, w: id, kind: 'big' }); } } break;
      case 'szoro': case 'korforgo': { const n = id === 'korforgo' ? 10 : 2 + L + st.extra, R = (id === 'korforgo' ? 120 : 70 + L * 6) * A2; W.a = (W.a || 0) + dt * 3; W.hitT = (W.hitT || 0) - dt;
        if (W.hitT <= 0) { W.hitT = .25; for (let i = 0; i < n; i++) { const a = W.a * (id === 'korforgo' && i % 2 ? -1 : 1) + i * TAU / (id === 'korforgo' ? 5 : n), rr = id === 'korforgo' && i % 2 ? R * .6 : R; aoe(P.x + Math.cos(a) * rr, P.y + Math.sin(a) * rr, 14, 6 + L * 2 + (id === 'korforgo' ? 10 : 0), { kb: 60, w: id, top: 0 }); } } break; }
      case 'bomba': case 'bombazapor': if (W.t <= 0) { W.t = cd(id === 'bombazapor' ? 1.1 : 2.2); const n = id === 'bombazapor' ? 6 : 1 + (L >= 3) + (L >= 5); for (let i = 0; i < n; i++) { const e = randEnemy(); if (!e) break; const R = (id === 'bombazapor' ? 90 : 60 + (L >= 2) * 15 + (L >= 4) * 15) * A2;
          S.tele.push({ k: 'lob', x: e.x, y: e.y, r: R, t: 0, d: .55, sx: P.x, sy: P.y, fire: o => { aoe(o.x, o.y, o.r, 22 + L * 5, { kb: 200, w: id }); S.fx.push({ k: 'boom', x: o.x, y: o.y, r: o.r, t: 0, d: .3, c: '#6cc6ff' }); if (id === 'bombazapor' && Math.random() < .5) S.tele.push({ k: 'lob', x: o.x + rnd(-80, 80), y: o.y + rnd(-80, 80), r: o.r * .7, t: 0, d: .3, sx: o.x, sy: o.y, fire: o.fire }); }, player: 1 }); } } break;
      case 'felho': case 'zivatar': if (W.t <= 0) { W.t = cd(4); const n = id === 'zivatar' ? 3 : 1 + (L >= 4); for (let i = 0; i < n; i++) { const e = randEnemy() || { x: P.x + rnd(-150, 150), y: P.y + rnd(-150, 150) }; S.fx.push({ k: 'cloud', x: e.x, y: e.y, r: (70 + (L >= 3) * 20) * A2, t: 0, d: (3 + (L >= 2) + (L >= 5) * 2) * st.dur, dmg: 4 + L * 2, tick: 0, zap: id === 'zivatar' }); } } break;
      case 'pocsolya': case 'gyogyforras': { W.tk = (W.tk || 0) - dt; if (W.tk <= 0) { W.tk = .4; const R = (60 + L * 12 + (id === 'gyogyforras' ? 50 : 0)) * A2; aoe(P.x, P.y, R, 4 + L * 2.5 + (id === 'gyogyforras' ? 6 : 0), { w: id, slow: .5, top: 0 }); if (id === 'gyogyforras') heal(1.2); } break; }
      case 'rainbird': case 'ontozohid': { const arc = id === 'ontozohid' ? TAU : (1.4 + L * .45), R = (110 + L * 15 + (id === 'ontozohid' ? 90 : 0)) * A2; W.a = (W.a || 0) + dt * (id === 'ontozohid' ? 2.4 : 2); W.hitT = (W.hitT || 0) - dt;
        if (W.hitT <= 0) { W.hitT = .3; const a0 = W.a % TAU; near(P.x, P.y, R, e => { let a = Math.atan2(e.y - P.y, e.x - P.x) - a0; a = ((a % TAU) + TAU) % TAU; if (id === 'ontozohid' ? Math.abs(Math.sin(a * 1)) < .25 : a < arc * .25) hitE(e, 9 + L * 3 + (id === 'ontozohid' ? 14 : 0), { w: id, kb: 80, top: 0 }); }); } W.arc = arc; W.R = R; break; }
      case 'gejzir': case 'gejzirmezo': if (W.t <= 0) { W.t = cd(id === 'gejzirmezo' ? .5 : 1.6 - (L >= 5) * .4); const n = id === 'gejzirmezo' ? 3 : 1 + (L >= 2) + (L >= 4); for (let i = 0; i < n; i++) { const e = randEnemy(); if (!e) break; const R = (40 + (L >= 3) * 14) * A2; S.tele.push({ k: 'circle', x: e.x, y: e.y, r: R, t: 0, d: .45, c: '#6cc6ff', player: 1, fire: o => { aoe(o.x, o.y, o.r, 20 + L * 6, { w: id }); S.fx.push({ k: 'geyser', x: o.x, y: o.y, r: o.r, t: 0, d: .5 }); } }); } } break;
      case 'jegcsap': case 'jegkorszak': if (W.t <= 0) { W.t = cd(id === 'jegkorszak' ? 12 : 2.4 - (L >= 5) * .5); const n = id === 'jegkorszak' ? 40 : 2 + (L >= 2) + (L >= 4) * 2; for (let i = 0; i < n; i++) { const e = id === 'jegkorszak' ? { x: P.x + rnd(-V.hw, V.hw), y: P.y + rnd(-V.hh, V.hh) } : (randEnemy() || { x: P.x + rnd(-200, 200), y: P.y + rnd(-200, 200) });
          S.tele.push({ k: 'ice', x: e.x, y: e.y, r: 26 * A2, t: 0, d: .5 + Math.random() * .3, player: 1, fire: o => aoe(o.x, o.y, o.r, 14 + L * 4, { w: id, freeze: .8 + (L >= 3) * .8 }) }); } } break;
      case 'buborek': case 'buborekvar': if (P.shield < (id === 'buborekvar' ? 3 : L >= 5 ? 2 : 1)) { W.t -= 0; if (W.t <= 0) { W.t = cd(id === 'buborekvar' ? 6 : 14 - L * 1.6); P.shield++; } } break;
      case 'akna': case 'elokert': W.dd = (W.dd || 0) + Math.hypot(P.vx, P.vy) * dt; if (W.dd > (L >= 5 ? 70 : 110) && W.t <= 0) { W.dd = 0; W.t = cd(.3); S.fx.push({ k: 'mine', x: P.x, y: P.y, r: (50 + (L >= 2) * 15) * A2, t: 0, d: 12, dmg: 22 + L * 6, w: id, bloom: id === 'elokert' }); } break;
      case 'malomko': case 'malomvihar': { const n = id === 'malomvihar' ? 4 : 1 + (L >= 3) + (L >= 5); W.st.list = (W.st.list || []).filter(q => q.l > 0); if (W.st.list.length < n && W.t <= 0) { W.t = cd(.6); const a = Math.random() * TAU, q = { x: P.x, y: P.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, l: (5 + (L >= 4) * 3) * st.dur, hitT: 0 }; W.st.list.push(q); }
        for (const q of W.st.list) { q.l -= dt; q.x += q.vx * dt; q.y += q.vy * dt; if (Math.abs(q.x - P.x) > V.hw) { q.vx = -q.vx; q.x = P.x + Math.sign(q.x - P.x) * V.hw; } if (Math.abs(q.y - P.y) > V.hh) { q.vy = -q.vy; q.y = P.y + Math.sign(q.y - P.y) * V.hh; } q.hitT -= dt; if (q.hitT <= 0) { q.hitT = .15; aoe(q.x, q.y, 22 * A2, 14 + L * 4 + (id === 'malomvihar' ? 12 : 0), { w: id, kb: 140, top: 0 }); } } break; }
      case 'torony': case 'viztorony': { const n = id === 'viztorony' ? 1 : 1 + (L >= 4); const live = S.fx.filter(f => f.k === 'tower').length; if (live < n && W.t <= 0) { W.t = cd(id === 'viztorony' ? 999 : 4); S.fx.push({ k: 'tower', x: P.x + rnd(-40, 40), y: P.y + rnd(-40, 40), t: 0, d: id === 'viztorony' ? 1e9 : (15 + (L >= 3) * 8) * st.dur, cd: 0, L, w: id, follow: id === 'viztorony', pierce: (L >= 5) + (id === 'viztorony' ? 2 : 0) }); } break; }
      /* ----- saját fegyverek ----- */
      case 'aranyfej': case 'aranyfejevo': { const evo = id === 'aranyfejevo', n = evo ? 9 : 3 + (L >= 2) + (L >= 5) + (L >= 8 ? 1 : 0); W.a = (W.a || 0) + dt * (L >= 6 || evo ? 1.4 : .9);
        if (W.t <= 0) { W.t = cd(evo ? .45 : .7); for (let i = 0; i < n; i++) shoot(P.x, P.y, W.a + i * TAU / n, 420, 9 + L * 2.4 + (evo ? 10 : 0), { l: L >= 3 ? 1.1 : .75, pierce: L >= 8 || evo ? 3 : 0, crit: L >= 7 || evo ? .2 : L >= 4 ? .1 : 0, w: id, kind: 'gold' }); }
        if (evo) { W.wave = (W.wave || 10) - dt; if (W.wave <= 0) { W.wave = 10; S.fx.push({ k: 'goldwave', x: P.x, y: P.y, r: 10, t: 0, d: 1.2 }); heal(10); S.xp2 = 5; aoe(P.x, P.y, 260 * A2, 40, { w: id, kb: 200 }); } } break; }
      case 'rele': case 'releevo': { const evo = id === 'releevo', n = evo ? 5 : 1 + (L >= 2) + (L >= 5) + (L >= 7); W.a = (W.a || 0) + dt * 1.6; W.cubes = [...Array(n)].map((_, i) => ({ x: P.x + Math.cos(W.a + i * TAU / n) * 56, y: P.y + Math.sin(W.a + i * TAU / n) * 56 }));
        if (W.t <= 0) { W.t = cd(L >= 3 ? .55 : .8); const tg = (S.lastAttacker && !S.lastAttacker.dead && Math.hypot(S.lastAttacker.x - P.x, S.lastAttacker.y - P.y) < 500) ? S.lastAttacker : nearest(480); if (tg) for (const c of W.cubes) shoot(c.x, c.y, aimAt(tg, c), 480, 8 + L * 2.2 + (L >= 8) * 6, { w: id, kind: 'cube', ls: L >= 4 ? .3 : 0, pierce: L >= 6 ? 1 : 0, c: '#6cb8ff' }); }
        if (evo) { W.zt = (W.zt || 0) - dt; if (W.zt <= 0) { W.zt = .25; for (let i = 0; i < n; i++) { const a = W.cubes[i], b = W.cubes[(i + 1) % n]; for (let k = 1; k < 4; k++) aoe(a.x + (b.x - a.x) * k / 4, a.y + (b.y - a.y) * k / 4, 16, 10, { w: id, top: 0 }); } } } break; }
      case 'veszgomb': case 'veszevo': { const evo = id === 'veszevo'; if (W.t <= 0) { W.t = cd(L >= 6 ? 4 : 5.5); const n = L >= 8 || evo ? 2 : 1; for (let i = 0; i < n; i++) { const R = (95 + (L >= 2) * 25 + (L >= 7) * 30) * A2, c = i ? (nearest(400) || P) : P; S.fx.push({ k: 'stop', x: c.x, y: c.y, r: R, t: 0, d: L >= 5 ? 2 : 1.2, dmg: 6 + L * 3, w: id, vuln: L >= 4 }); } Sfx.warn(); }
        if (evo) { W.big = (W.big || 30) - dt; if (W.big <= 0) { W.big = 30; S.stopT = 3; banner('VÉSZLEÁLLÍTÁS', '', '#ff5a4a', 1.5); } } break; }
      case 'pid': case 'pidevo': { const evo = id === 'pidevo';
        if (evo) { W.a = (W.a || 0) + dt * 4; W.hitT = (W.hitT || 0) - dt; if (W.hitT <= 0) { W.hitT = .2; aoe(P.x, P.y, 140 * A2, 22, { w: id, top: 0 }); const strong = S.en.filter(e => !e.dead && !e.fake && Math.hypot(e.x - P.x, e.y - P.y) < 400).sort((a, b) => b.hp - a.hp)[0]; if (strong) hitE(strong, 30, { w: id }); } }
        else if (W.t <= 0) { W.t = cd(1.1); const n = 1 + (L >= 3) + (L >= 7), tg = nearest(360); const base = tg ? aimAt(tg) : Math.atan2(P.dirY, P.dirX); for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * .5, R = (150 + (L >= 5) * 40) * A2; S.fx.push({ k: 'wave', x: P.x, y: P.y, a, R, t: 0, d: .3 }); near(P.x, P.y, R, e => { let da = Math.atan2(e.y - P.y, e.x - P.x) - a; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < .5 + (L >= 5) * .2) { e.pidI = (L >= 2 ? Math.min((e.pidI || 0) + (L >= 6 ? 6 : 3), 60) : 0); const fast = e.sp > 90 && L >= 4 ? 1.3 : 1; hitE(e, (12 + L * 3 + e.pidI) * fast, { w: id, kb: 120, top: 0 }); } }); } } break; }
      case 'ak63': case 'ak63evo': { const evo = id === 'ak63evo'; if (W.t <= 0) { const tg = nearest(560); if (tg) { W.t = cd(L >= 4 ? 1.0 : 1.4); const n = 3 + (L >= 2) + (L >= 5) * 2 + (L >= 8) * 4 + (evo ? 3 : 0), a = aimAt(tg); for (let i = 0; i < n; i++) setTimeout(() => { if (!S) return; const t2 = tg.dead ? nearest(560) : tg; shoot(P.x, P.y, (t2 ? aimAt(t2) : a) + rnd(-.06, .06), 640, 11 + L * 2.5, { pierce: (L >= 3) + (L >= 7) * 2, kb: L >= 6 ? 120 : 0, w: id, kind: 'bullet', r: 4 }); }, i * 60);
          if (evo) setTimeout(() => { if (!S) return; S.fx.push({ k: 'broom', x: P.x, y: P.y, a, t: 0, d: .45, R: 200 * A2 }); near(P.x, P.y, 200 * A2, e => { let da = Math.atan2(e.y - P.y, e.x - P.x) - a; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < .9) hitE(e, 40, { w: id, kb: 300, top: 0 }); }); }, n * 60); } } break; }
      case 'pkm': case 'pkmevo': { const evo = id === 'pkmevo', mv = Math.hypot(P.vx, P.vy) > 10; if (W.t <= 0) { const tg = nearest(520); if (tg) { W.t = cd(evo ? .06 : .09); W.n = (W.n || 0) + 1; const spread = (mv && L < 4 ? .45 : .14) + (L >= 2) * .08 + (L >= 7) * .08, a = aimAt(tg) + rnd(-spread, spread), dirs = evo ? [0, Math.PI] : (L >= 5 ? [0, .12] : [0]);
          for (const off of dirs) shoot(P.x, P.y, a + off, 560, 4.5 + L * 1.2 + (L >= 3) * 2, { w: id, kind: 'bullet', r: 3.5, l: .9, slow: L >= 6 ? .4 : 0, pierce: evo ? 99 : 0, boom: L >= 8 && W.n % 50 === 0 }); } } break; }
    }
  }
  /* Zero aranyseprűje, Botond tartálya */
  if (S.ch.st?.broom) { S.broomT = (S.broomT ?? 8) - dt; if (S.broomT <= 0) { S.broomT = 8; S.fx.push({ k: 'broom', x: P.x, y: P.y, a: 0, full: 1, t: 0, d: .5, R: 150 * A2 }); aoe(P.x, P.y, 150 * A2, 18, { kb: 320, w: 'seprű', top: 0 }); } }
  if (S.ch.st?.tank) { S.tankT = (S.tankT ?? 10) - dt; if (S.tankT <= 0) { S.tankT = 10; heal(5); } }
}

/* ---------- bossok ---------- */
function spawnBoss(k) {
  const B = BOSS[k], [x, y] = k === 'isten' ? [S.P.x, S.P.y - 320] : edgePos(40);
  const hp = B.hp * (1 + mu('heat') * .1) * (S.seal === 'arnyek' ? 1.25 : 1);
  const e = { id: ++S.eid, boss: B, bk: k, x, y, hp, mhp: hp, r: B.r, sp: B.sp, dmg: B.dmg * dmgMul(), flash: 0, kx: 0, ky: 0, slow: 0, freeze: 0, t: 0, at: 2.5, step: 0, T: { ai: 'boss' }, face: 1, ph: 0, alive: 0, chestN: 1, lastHit: 0 };
  S.en.push(e); S.boss = e; Sfx.boss();
  banner(B.n.toUpperCase(), B.sub, k === 'isten' ? '#ff8a2a' : BOSS[k].flag && ['wd', 'ld', 'st'].includes(B.flag) ? '#9ad8ff' : '#ff6a4a', 3.5);
  if (S.seal === 'kut') heal(999);
  if (k === 'ladder') e.immune = 0;
  if (k === 'fereg') { e.st = 'under'; e.under = 1; e.stT = 3; }
  return e;
}
function bossDie(e) {
  S.boss = null; S.bcool = 30; S.bossKills++; S.score += 2000 * (S.bq + 1); Sfx.boom(); S.shake = 18;
  part(e.x, e.y, 60, '#ffd27a', 260, 1.2, 4);
  for (const x of S.en) if (x.summoned || x.crystalLink) x.dead = 1;
  S.stolen = null; S.rule = null; S.hudHide = 0; S.P.curse = 0;
  if (e.bk === 'isten') return victory();
  S.items.push({ x: e.x, y: e.y, k: 'chest', n: e.chestN });
  const B = e.boss; if (B.relic) { S.relic[B.relic] = 1; banner(RELIC[B.relic][0], RELIC[B.relic][1], '#ffd27a', 3); if (B.relic === 's7') S.wslots++; if (B.relic === 'tabla') S.rr += 2; if (B.relic === 'konyv') S.ban++; stats(); }
  if (B.flag) hooks.flag?.(B.flag);
  if (e.bk === 'szilard') { S.phase = 'bloom'; S.phT = 0; banner('SZILÁRD ELESETT', 'A kert kivirágzik…', '#8aff9a', 4); }
}
function openChest(n) {
  const ev = canEvolve(); if (ev) { evolve(...ev); return; }
  const got = []; const k = Math.min(5, n + (pl('lohere') >= 3 ? 1 : 0) + (S.relic.mesterkulcs ? 1 : 0) + pl('mesterkulcs'));
  for (let i = 0; i < k; i++) { const c = choices(1)[0]; if (c.k === 'w') addW(c.id); else if (c.k === 'p') addP(c.id); else S.gold += 25; got.push(c.n); }
  banner('KINCSESLÁDA', got.join(' · '), '#ffd27a', 3.5); Sfx.lv();
}
const tele = o => S.tele.push({ t: 0, ...o });
function bossAI(e, dt) {
  const P = S.P, dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1, k = e.bk;
  e.alive += dt; e.lastHit += dt; e.t += dt;
  if (e.alive > 120 * e.chestN && e.chestN < 4 && k !== 'isten') { e.chestN++; e.sp *= 1.1; e.dmg *= 1.1; txt(e.x, e.y - 90, 'DÜHÖDT!', '#ff5a3a', 1); }
  let sp = e.sp * (e.slow > 0 ? .7 : 1) * (S.stopT > 0 ? .2 : 1), mx = dx / d, my = dy / d;
  e.at -= dt;
  const hpF = e.hp / e.mhp;
  switch (k) {
    case 'watchdog':
      if (e.lastHit > 4 && e.hp < e.mhp) { e.hp = Math.min(e.mhp, e.hp + e.mhp * .02); e.lastHit = 0; txt(e.x, e.y - 80, 'RESET', '#9ad8ff'); for (let i = 0; i < 2; i++) spawnEnemy('runaszem', e.x + rnd(-60, 60), e.y + rnd(-60, 60), { summoned: 1, xp: 0 }); }
      e.dome = hpF < .5 && (e.t % 14) < 6;
      if (e.at <= 0) { e.step++; const s = e.step % 3;
        if (s === 0) { for (let i = 0; i < 4; i++) tele({ k: 'circle', x: P.x + rnd(-120, 120), y: P.y + rnd(-120, 120), r: 70, d: 1.2, c: '#ff3a2a', fire: o => { if (Math.hypot(P.x - o.x, P.y - o.y) < o.r) { S.wdisable = 3; txt(P.x, P.y - 40, 'VÉSZLEÁLLÍTÁS', '#ff3a2a', 1); } } }); e.at = 3; }
        else if (s === 1) { const a = Math.atan2(dy, dx); tele({ k: 'beam', x: e.x, y: e.y, a, len: 380, w: 30, d: .7, c: '#ff3a2a', fire: o => { e.x += Math.cos(a) * 340; e.y += Math.sin(a) * 340; if (lineHit(o, P.x, P.y, 30)) hurtPlayer(e.dmg * 1.4); } }); e.at = 2.5; }
        else { for (let i = 0; i < 3; i++) spawnEnemy('runaszem', e.x + rnd(-80, 80), e.y + rnd(-80, 80), { summoned: 1, xp: 0 }); e.at = 3; } }
      break;
    case 'kaktusz':
      if (hpF < .3) { sp *= 1.4; e.hp = Math.min(e.mhp, e.hp + e.mhp * .004 * dt); e.bloom = 1; }
      if (e.at <= 0) { e.step++; const s = e.step % 3;
        if (s !== 2) { const n = 28, gap = Math.floor(Math.random() * n), rot = Math.random() * TAU; for (let i = 0; i < n; i++) { if ((i - gap + n) % n < 4) continue; eShot(e.x, e.y, rot + i * TAU / n, 220, e.dmg * .6, 'thorn', 6); } e.at = 1.8; }
        else { for (let i = 0; i < 6; i++) { const a = i * TAU / 6; spawnEnemy('tovis', P.x + Math.cos(a) * 140, P.y + Math.sin(a) * 140, { rise: 1, summoned: 1, xp: 0 }); } e.at = 3; } }
      break;
    case 'ladder':
      e.immune = !!e.pylons?.some(p => !p.dead); if (e.pylons && !e.immune && !e.pyT) e.pyT = 15; if (e.pyT) { e.pyT -= dt; if (e.pyT <= 0) e.pyT = 0, e.pylons = null; }
      if (hpF < .5 && !e.reset) { e.reset = 1; e.hp += e.mhp * .08; S.P.shield = 0; txt(e.x, e.y - 80, 'RESET', '#ffd27a', 1); }
      if (e.at <= 0) { e.step++; const s = e.step % 4;
        if (s === 1) { const y0 = P.y - 140; for (let i = 0; i < 5; i++) { const y = y0 + i * 70, gap = P.x + rnd(-160, 160); tele({ k: 'rung', x: P.x, y, gap, w: V.hw * 2.2, d: 1.3, c: '#ffd23a', fire: o => { if (Math.abs(P.y - o.y) < 14 && Math.abs(P.x - o.gap) > 46) hurtPlayer(e.dmg); } }); } e.at = 3; }
        else if (s === 2) { for (let i = 0; i < 6; i++) { const a = i * TAU / 6; spawnEnemy('tonpecset', P.x + Math.cos(a) * 150, P.y + Math.sin(a) * 150, { summoned: 1, xp: 0, st: 1, stT: 3 }); } e.at = 3.5; }
        else if (s === 3 && !e.pylons) { e.pylons = [0, 1].map(i => spawnEnemy('obeliszk', e.x + (i ? 160 : -160), e.y + 40, { summoned: 1, xp: 0, hp: 400 * hpMul(), mhp: 400 * hpMul(), pylon: 1 })); banner('LOGIKAI KAPU', 'Döntsd le mindkét oszlopot!', '#ffd27a', 2); e.at = 2; }
        else { const n = 16; for (let i = 0; i < n; i++) eShot(e.x, e.y, i * TAU / n + e.t, 240, e.dmg * .5, 'rune', 6); e.at = 1.6; } }
      break;
    case 'fereg':
      if (e.st === 'under') { e.under = 1; sp *= 1.8; if (Math.random() < dt * 20) part(e.x, e.y, 1, '#d8b06a', 40); if ((e.stT -= dt) <= 0) { e.st = 'tele'; e.stT = 1.1; e.tx = P.x; e.ty = P.y; tele({ k: 'circle', x: P.x, y: P.y, r: 95, d: 1.1, c: '#ffb04a' }); } }
      else if (e.st === 'tele') { sp = 0; if ((e.stT -= dt) <= 0) { e.x = e.tx; e.y = e.ty; e.under = 0; e.st = 'up'; e.stT = 5; S.shake = 14; Sfx.boom(); if (Math.hypot(P.x - e.x, P.y - e.y) < 95) hurtPlayer(e.dmg * 1.5); part(e.x, e.y, 30, '#d8b06a', 220); } }
      else if (e.st === 'up') { sp *= .7; if ((e.stT -= dt) <= 0) { e.st = 'pull'; e.stT = 3; } }
      else if (e.st === 'pull') { sp = 0; const a = Math.atan2(e.y - P.y, e.x - P.x); P.pullX = Math.cos(a) * 110; P.pullY = Math.sin(a) * 110; if ((e.stT -= dt) <= 0) { e.st = 'under'; e.stT = 4; P.pullX = P.pullY = 0; } }
      break;
    case 'boszi': {
      const top = Object.entries(S.dmgBy).sort((a, b) => b[1] - a[1])[0]; if (top && e.t > 6 && e.resist !== top[0]) { e.resist = top[0]; txt(e.x, e.y - 90, 'HIBAELLENŐRZÉS: ' + wName(top[0]), '#c8a0ff', 1); }
      e.link = S.en.some(x => x.linkTo === e && !x.dead);
      if (e.at <= 0) { e.step++; const s = e.step % 4;
        if (s === 1) { for (let i = 0; i < 3; i++) { const a = Math.atan2(P.y - e.y, P.x - e.x) + (i - 1) * .35; tele({ k: 'beam', x: e.x, y: e.y, a, len: 800, w: 18, d: 1, c: '#b48aff', code: 1, fire: o => { if (lineHit(o, P.x, P.y, 18)) hurtPlayer(e.dmg); } }); } e.at = 2.4; }
        else if (s === 2) { const c = spawnEnemy('kodliderc', e.x + 60, e.y, { summoned: 1, xp: 0, hp: e.mhp * .06, mhp: e.mhp * .06, clone: 1 }); c.T = { ai: 'ranged', keep: 220, shot: 'orb' }; c.life = 10; e.at = 3; }
        else if (s === 3) { for (let i = 0; i < 4; i++) { const a = i * TAU / 4; const n = spawnEnemy('kodliderc', e.x + Math.cos(a) * 120, e.y + Math.sin(a) * 120, { summoned: 1, xp: 0, linkTo: e }); } banner('HÁLÓZATI SZINKRON', 'A lidércek osztoznak a sebzésen', '#c8a0ff', 2); e.at = 4; }
        else { const n = 12; for (let i = 0; i < n; i++) eShot(e.x, e.y, i * TAU / n, 260, e.dmg * .5, 'code', 6); e.at = 1.5; } }
      break; }
    case 'szilard': {
      if (hpF < .5 && !e.simDone) { e.simDone = 1; for (let i = 0; i < 2; i++) { const f = spawnEnemy('kultista', e.x + rnd(-150, 150), e.y + rnd(-100, 100), { fake: 1, summoned: 1, xp: 0, bossFake: 'szilard' }); f.T = { ai: 'chase' }; f.sp = e.sp; } banner('TILTOTT SZIMULÁCIÓ', 'Csak az igazi vet árnyékot', '#ff5a4a', 2.5); }
      if (hpF < .15 && !e.finalDone) { e.finalDone = 1; P.shield = 0; S.rule = 'noarmor'; S.ruleT = 10; banner('VÉGSŐ PROTOKOLL', '„A szabályokat újraírom…”', '#ff3a2a', 3); }
      if (e.at <= 0) { e.step++; const s = e.step % 5;
        if (s === 1) { for (let i = 0; i < 40; i++) setTimeout(() => S && S.boss === e && eShot(e.x, e.y, i * .5 + e.t, 210, e.dmg * .5, 'red', 7), i * 45); e.at = 3.2; }
        else if (s === 2) { S.hudHide = 5; for (let i = 0; i < 6; i++) { const f = spawnEnemy('arnyfarkas', ...edgePos(), { fake: 1, summoned: 1, xp: 0 }); } banner('NULLA-PROTOKOLL', '', '#ff3a2a', 1.5); e.at = 3; }
        else if (s === 3 && !S.stolen) { const best = [...S.wo].sort((a, b) => (isEvo(b) - isEvo(a)) || (S.w[b].lv - S.w[a].lv))[0]; if (best) { S.stolen = best; e.anchors = [0, 1, 2].map(i => { const a = i * TAU / 3; return spawnEnemy('lancoslovag', e.x + Math.cos(a) * 170, e.y + Math.sin(a) * 170, { summoned: 1, xp: 0, anchor: 1, hp: 300 * hpMul(), mhp: 300 * hpMul() }); }); banner('ÁRNYÉK-INTEGRÁCIÓ', wName(best) + ' elrabolva – üsd szét a láncokat!', '#ff3a2a', 3); } e.at = 3; }
        else if (s === 4) { S.rule = pick(['reverse', 'noregen', 'xpdrain', 'fast']); S.ruleT = 15; banner('RENDSZERFELTÖRÉS', { reverse: 'Fordított irányítás', noregen: 'Nincs gyógyulás', xpdrain: 'Fogy az XP', fast: 'Minden kétszer gyorsabb' }[S.rule], '#ff3a2a', 2.5); e.at = 4; }
        else { const a = Math.atan2(dy, dx); for (let i = -3; i <= 3; i++) eShot(e.x, e.y, a + i * .16, 300, e.dmg * .6, 'red', 7); e.at = 1.6; } }
      if (S.stolen && e.anchors && e.anchors.every(a => a.dead)) { S.stolen = null; e.anchors = null; banner('FEGYVER VISSZASZEREZVE', '', '#9ad8ff', 2); }
      break; }
    case 'isten': return godAI(e, dt);
  }
  if (!e.under || k === 'fereg') { e.x += (mx * sp + e.kx) * dt; e.y += (my * sp + e.ky) * dt; }
  e.kx *= .9; e.ky *= .9; e.slow -= dt; if (Math.abs(mx) > .1) e.face = mx > 0 ? 1 : -1;
  if (!e.under && d < e.r + 16) hurtPlayer(e.dmg);
  if (d > Math.max(V.hw, V.hh) * 2) { const [x, y] = edgePos(30); e.x = x; e.y = y; }
}

/* ---------- finálé: az Aszály Istene ---------- */
function startDescent() {
  S.phase = 'descent'; S.phT = 0; for (const e of S.en) if (!e.boss) { e.dead = 1; part(e.x, e.y, 4, '#8a6a44', 60); } S.ep.length = 0;
  S.arena = { x: S.P.x, y: S.P.y, R: 640 }; banner('AZ ÉG ELSÖTÉTÜL', 'Valami leszáll…', '#ff8a2a', 4);
}
function godAI(e, dt) {
  const P = S.P, Ar = S.arena, hpF = e.hp / e.mhp;
  if (e.desc > 0) { e.desc -= dt; e.y += 60 * dt; return; }
  const tx = Ar.x + Math.cos(e.t * .2) * 140, ty = Ar.y - 230 + Math.sin(e.t * .3) * 50; e.x += (tx - e.x) * dt * .5; e.y += (ty - e.y) * dt * .5;
  e.godShield = !(S.shieldDown > 0);
  // kristályok
  for (const c of S.crystals) { c.cool = Math.max(0, c.cool - dt); if (!c.cool && Math.hypot(P.x - c.x, P.y - c.y) < 70) { c.ch = Math.min(1, c.ch + dt / 5); if (c.ch >= 1) { c.ch = 0; c.cool = 25; S.shieldDown = 20; banner('A PAJZS LEHULLOTT', '20 mp – most sebezhető!', '#9ad8ff', 2.5); Sfx.lv(); } } }
  // szomjúság-árnyékok
  if (S.thirst > 0) { S.thirst -= dt; const inShade = S.shades.some(s => Math.hypot(P.x - s.x, P.y - s.y) < s.r); if (inShade) heal(4 * dt); else P.hp -= 3 * dt; for (const s of S.shades) s.r = Math.max(20, s.r - dt * 8); if (P.hp <= 0) gameOver(false); }
  // végső aszály: szűkülő aréna
  if (hpF < .15) { Ar.R = Math.max(300, Ar.R - dt * 10); }
  if (Math.hypot(P.x - Ar.x, P.y - Ar.y) > Ar.R) { P.hp -= 6 * dt; if (P.hp <= 0) gameOver(false); }
  if (e.at <= 0) { e.step++; const s = e.step % 5;
    if (s === 1) { const n = 6, rot = Math.random() * TAU, dir = Math.random() < .5 ? 1 : -1; tele({ k: 'eclipse', x: e.x, y: e.y, n, rot, dir, len: 900, d: 1.2, act: 5, c: '#ff3a2a' }); e.at = 7; }
    else if (s === 2) { const vert = Math.random() < .5, side = Math.random() < .5 ? -1 : 1, gap = rnd(-200, 200); tele({ k: 'sandwave', vert, side, gap, d: 1.4, act: 3.5, pos: 0, c: '#e8c88a' }); e.at = 5.5; }
    else if (s === 3) { S.thirst = 9; S.shades = [0, 1, 2, 3].map(() => ({ x: Ar.x + rnd(-350, 350), y: Ar.y + rnd(-250, 300), r: 90 })); banner('SZOMJÚSÁG', 'Csak az árnyékban gyógyulsz', '#ffb04a', 2); e.at = 9.5; }
    else if (s === 4) { const base = Math.atan2(P.y - e.y, P.x - e.x); for (let i = -2; i <= 2; i++) tele({ k: 'beam', x: e.x, y: e.y, a: base + i * .32, len: 900, w: 22, d: 1.5, c: '#ff8a2a', crack: 1, fire: o => { if (lineHit(o, P.x, P.y, 22)) hurtPlayer(e.dmg); } }); e.at = 3; }
    else { if (hpF < .5) { for (const k of ['kaktusz', 'ladder', 'fereg']) { const m = spawnEnemy('lancoslovag', Ar.x + rnd(-300, 300), Ar.y + rnd(-200, 200), { summoned: 1, xp: 0, mirageOf: k, hp: 3000, mhp: 3000, life: 12 }); m.T = { ai: 'chase' }; m.sp = 90; m.D = 140; m.r = 34; } banner('DÉLIBÁB-LÉGIÓ', '', '#ff5a3a', 2); }
      for (let i = 0; i < 24; i++) eShot(e.x, e.y, i * TAU / 24 + e.t, 200, e.dmg * .5, 'sun', 9); e.at = 3; } }
  if (Math.hypot(P.x - e.x, P.y - e.y) < e.r + 16) hurtPlayer(e.dmg);
}
function victory() { S.win = true; S.phase = 'win'; S.score += 50000; banner('AZ ASZÁLY VÉGET ÉRT', 'Esni kezd az eső…', '#9ad8ff', 6); hooks.flag?.('god'); setTimeout(() => S && hooks.end?.(true), 6000); }
function gameOver(win) { if (S.over) return; S.over = true; S.P.hp = 0; hooks.end?.(win); }

/* ---------- események ---------- */
function events(dt) {
  const m = S.t / 60;
  for (const E of EVENTS) { if (S.phase !== 'run') break; if (!S.evDone.has(E.id) && m >= E.t) { S.evDone.add(E.id); S.ev[E.id] = E.d; banner(E.n.toUpperCase(), { vihar: 'Szűkül a látótér', tilalom: '−20% sebzés – üsd le a hírnököket!', hoseg: 'Gyógyulás csak a kutaknál', hullam: 'Az áradás elsodorja a hordát', sotet: 'Csak a fényed világít' }[E.id], '#ffb04a', 3); stats();
      if (E.id === 'tilalom') for (let i = 0; i < 6; i++) { const [x, y] = edgePos(); spawnEnemy('hirnok', x, y, { herald: 1 }); }
      if (E.id === 'vihar') for (let i = 0; i < 8; i++) spawnOne('delibab');
      if (E.id === 'hullam') S.wave = { x: S.P.x - V.hw - 100, t: 0 }; } }
  for (const k in S.ev) { S.ev[k] -= dt; if (S.ev[k] <= 0) { delete S.ev[k]; stats(); if (k === 'tilalom' && !S.en.some(e => e.herald && !e.dead)) { S.rr++; banner('A TILALOM VÉGET ÉRT', '+1 újrasorsolás', '#9ad8ff', 2); } } }
  if (S.wave) { S.wave.x += 900 * dt; for (const e of S.en) if (!e.boss && Math.abs(e.x - S.wave.x) < 60) { e.kx += 600; hitE(e, 30, { top: 1, w: 'hullám' }); } if (S.wave.x > S.P.x + V.hw + 200) S.wave = null; }
}

/* ---------- fő ciklus ---------- */
export function update(dt) {
  if (!S || S.paused || S.choose || S.over) return;
  if (S.rule === 'fast') dt *= 1.5;
  { const zt = S.phase === 'god' || S.phase === 'descent' ? .58 : S.boss ? .88 : 1; ZM += (zt - ZM) * Math.min(1, dt * 1.5); setV(); }
  const P = S.P; S.t += dt; S.phT += dt;
  if (S.phase === 'run' && !S.boss) S.diffT += dt;
  /* fázisok */
  if (S.phase === 'run' && !S.boss) { if (S.bcool > 0) S.bcool -= dt; else S.bclock += dt / 60; const nx = BOSSQ[S.bq]; if (nx && S.bclock >= nx.t) { S.bq++; spawnBoss(nx.id); } }
  if (S.phase === 'bloom') { for (const e of S.en) if (!e.boss) e.hp -= e.mhp * .05 * dt, e.hp <= 0 && kill(e); if (S.phT > 60) { S.phase = 'wrath'; S.phT = 0; S.wrathMin = 0; banner('SZILÁRD HARAGJÁNAK ASZÁLYA ELINDULT', 'Minden elszárad…', '#ff3a2a', 5); Sfx.boss(); stats(); } }
  if (S.phase === 'wrath') { const m = Math.floor(S.phT / 60); if (m !== S.wrathMin) { S.wrathMin = m; banner('ASZÁLY-ERŐSÍTÉS ' + (m + 1) + '.', 'Az ellenségek erősebbek', '#ff6a3a', 1.6); } if (S.phT > 600) startDescent(); }
  if (S.phase === 'descent' && S.phT > 4 && !S.god) { S.phase = 'god'; S.phT = 0; const g = spawnBoss('isten'); g.desc = 3; S.god = g; const A2 = S.arena; S.crystals = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => ({ x: A2.x + a * 330, y: A2.y + b * 240, ch: 0, cool: 0 })); }
  if (S.shieldDown > 0) S.shieldDown -= dt;
  if (S.stopT > 0) S.stopT -= dt;
  if (S.ruleT > 0) { S.ruleT -= dt; if (S.ruleT <= 0) S.rule = null; }
  if (S.hudHide > 0) S.hudHide -= dt; if (S.wdisable > 0) S.wdisable -= dt; if (S.xp2 > 0) S.xp2 -= dt;
  if (P.curse > 0) P.curse -= dt; if (P.drainT > 0) { P.drainT -= dt; if (P.drainT <= 0) P.drain = 0; }
  /* mozgás */
  let ix = (K.R ? 1 : 0) - (K.L ? 1 : 0), iy = (K.D ? 1 : 0) - (K.U ? 1 : 0);
  if (joy) { const jx = joy.x - joy.ox, jy = joy.y - joy.oy, jl = Math.hypot(jx, jy); if (jl > 8) { ix = jx / Math.max(jl, 50); iy = jy / Math.max(jl, 50); } }
  if (pad) { if (Math.abs(pad.x) > .2 || Math.abs(pad.y) > .2) { ix = pad.x; iy = pad.y; } }
  if (S.rule === 'reverse') { ix = -ix; iy = -iy; }
  const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; }
  const spd = S.st.speed * (P.root > 0 ? .25 : 1) * (S.fx.some(f => f.k === 'mud' && Math.hypot(f.x - P.x, f.y - P.y) < f.r) ? .6 : 1);
  P.vx = ix * spd; P.vy = iy * spd; if (P.root > 0) P.root -= dt;
  P.x += (P.vx + (P.pullX || 0)) * dt; P.y += (P.vy + (P.pullY || 0)) * dt;
  if (il > .1) { P.dirX = ix; P.dirY = iy; if (Math.abs(ix) > .1) P.face = ix > 0 ? 1 : -1; }
  if (S.arena && S.phase !== 'win') { const dx = P.x - S.arena.x, dy = P.y - S.arena.y, dd = Math.hypot(dx, dy), lim = S.arena.R + 60; if (dd > lim) { P.x = S.arena.x + dx / dd * lim; P.y = S.arena.y + dy / dd * lim; } }
  P.inv -= dt; P.lastHurt += dt;
  if (S.seal === 'orzo' && P.lastHurt > 3 && P.shield < 1) { P.shield = 1; P.lastHurt = 0; }
  const effMhp = P.mhp * (1 - (P.drain || 0)); if (P.hp > effMhp) P.hp = effMhp;
  if (S.rule !== 'noregen') heal(S.st.regen * dt);
  if (S.rule === 'xpdrain') S.xp = Math.max(0, S.xp - dt * 2);
  if (S.ev.hoseg) for (const p of S.props) if (p.k === 'kut' && !p.dead && Math.hypot(p.x - P.x, p.y - P.y) < 80) heal(6 * dt);
  /* rács, spawn, ellenségek */
  gridBuild();
  if (S.phase !== 'god') spawnWave(dt);
  if (S.t < 1.5 && !S.en.length) for (let i = 0; i < 6; i++) spawnOne('ghoul');
  for (const e of S.en) { if (e.dead) continue; if (e.life != null) { e.life -= dt; if (e.life <= 0) { e.dead = 1; continue; } } if (e.boss) bossAI(e, dt); else updEnemy(e, dt); e.flash -= dt; }
  /* fegyverek */
  fireWeapons(dt);
  /* lövedékek */
  for (const p of S.pr) { p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt;
    near(p.x, p.y, p.r, e => { if (p.l <= 0 || p.hit.has(e.id)) return; p.hit.add(e.id); hitE(e, p.dmg, { w: p.w, kb: p.kb, sx: p.x - p.vx * .05, sy: p.y - p.vy * .05, crit: p.crit, ls: p.ls, slow: p.slow, top: 0 }); if (p.boom) { aoe(p.x, p.y, 70, 30, { w: p.w }); S.fx.push({ k: 'boom', x: p.x, y: p.y, r: 70, t: 0, d: .3, c: '#6cc6ff' }); }
      if (e === S.lastAttacker) {} if (p.pierce-- <= 0) p.l = 0; });
    for (const q of S.props) if (!q.dead && Math.hypot(q.x - p.x, q.y - p.y) < q.r + p.r) { q.hp -= p.dmg; p.l = 0; if (q.hp <= 0) breakProp(q); } }
  S.pr = S.pr.filter(p => p.l > 0);
  for (const p of S.ep) { p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt; if (Math.hypot(p.x - P.x, p.y - P.y) < p.r + 12) { hurtPlayer(p.dmg); if (p.pull) { P.pullX = (p.x - p.vx * .3 - P.x) * 0; const a = Math.atan2(-p.vy, -p.vx); P.x += Math.cos(a) * 60; P.y += Math.sin(a) * 60; } if (!p.pierce) p.l = 0; } }
  S.ep = S.ep.filter(p => p.l > 0);
  /* jelzések */
  for (const o of S.tele) { o.t += dt;
    if (o.k === 'eclipse' && o.t > o.d) { o.rot += o.dir * .55 * dt; o.x = S.god?.x ?? o.x; o.y = S.god?.y ?? o.y; for (let i = 0; i < o.n; i++) if (lineHit({ x: o.x, y: o.y, a: o.rot + i * TAU / o.n, len: o.len }, P.x, P.y, 16)) { hurtPlayer(S.god?.dmg || 30); break; } if (o.t > o.d + o.act) o.done = 1; continue; }
    if (o.k === 'sandwave' && o.t > o.d) { const Ar = S.arena; o.pos = (o.t - o.d) / o.act; const span = 900, cur = -o.side * span / 2 + o.side * span * o.pos; const coord = o.vert ? P.y - Ar.y : P.x - Ar.x, other = o.vert ? P.x - Ar.x : P.y - Ar.y; o.cur = cur; if (Math.abs(coord - cur) < 45 && Math.abs(other - o.gap) > 70) hurtPlayer(S.god?.dmg * .8 || 30); if (o.t > o.d + o.act) o.done = 1; continue; }
    if (o.t >= o.d && !o.done) { o.done = 1; o.fire?.(o); if (o.k === 'circle' && !o.player) S.fx.push({ k: 'boom', x: o.x, y: o.y, r: o.r, t: 0, d: .3, c: o.c }); if (o.k === 'beam' || o.k === 'rung') S.fx.push({ k: 'flash', ...o, t: 0, d: .25 }); } }
  S.tele = S.tele.filter(o => !o.done);
  /* területi hatások */
  for (const f of S.fx) { f.t += dt;
    if (f.k === 'cloud') { f.tick -= dt; if (f.tick <= 0) { f.tick = .5; aoe(f.x, f.y, f.r, f.dmg, { slow: .6, w: f.zap ? 'zivatar' : 'felho' }); if (f.zap) { const e = nearest(f.r * 1.6, f); if (e) { hitE(e, 30, { w: 'zivatar' }); S.fx.push({ k: 'zap', x: f.x, y: f.y - 40, x2: e.x, y2: e.y, t: 0, d: .15 }); } } } }
    else if (f.k === 'mine') { let hit = false; near(f.x, f.y, 18, () => { hit = true; }); if (hit || f.t > f.d) { if (hit) { aoe(f.x, f.y, f.r, f.dmg, { kb: 220, w: f.w }); S.fx.push({ k: 'boom', x: f.x, y: f.y, r: f.r, t: 0, d: .3, c: '#6cc6ff' }); if (f.bloom) S.fx.push({ k: 'flower', x: f.x, y: f.y, r: 40, t: 0, d: 6 }); } f.t = f.d + 1; } }
    else if (f.k === 'flower') { if (Math.hypot(P.x - f.x, P.y - f.y) < f.r) heal(3 * dt); }
    else if (f.k === 'tower') { if (f.follow) { f.x += (P.x + 50 - f.x) * dt * 2; f.y += (P.y - 30 - f.y) * dt * 2; } f.cd -= dt; if (f.cd <= 0) { const e = nearest(420, f); if (e) { f.cd = (f.L >= 2 ? .45 : .7) * S.st.cd; shoot(f.x, f.y - 20, aimAt(e, f), 500, 10 + f.L * 3 + (f.follow ? 12 : 0), { pierce: f.pierce, w: f.w }); } } }
    else if (f.k === 'stop') { if (f.t < .05) near(f.x, f.y, f.r, e => { if (!e.boss) e.stopT = f.d; else e.slow = 1; if (f.vuln) e.vulnT = f.d + 2; hitE(e, f.dmg, { w: f.w, top: 0 }); }); }
    else if (f.k === 'fire') { if (Math.hypot(P.x - f.x, P.y - f.y) < f.r + 10) { P.burnT = (P.burnT || 0) + dt; if (P.burnT > .5) { P.burnT = 0; hurtPlayer(3, 'burn'); } } }
    else if (f.k === 'poison') { if (Math.hypot(P.x - f.x, P.y - f.y) < f.r) { P.psT = (P.psT || 0) + dt; if (P.psT > .5) { P.psT = 0; hurtPlayer(4); } } }
    else if (f.k === 'dust') { if (Math.hypot(P.x - f.x, P.y - f.y) < f.r) P.root = Math.max(P.root || 0, .1); } }
  S.fx = S.fx.filter(f => f.t < f.d);
  /* felszedhetők */
  const mg = S.st.magnet;
  for (const g of S.gems) { const dx = P.x - g.x, dy = P.y - g.y, d = Math.hypot(dx, dy); if (g.pull || d < mg) { g.pull = 1; const s = 520 * dt; g.x += dx / d * Math.min(s, d); g.y += dy / d * Math.min(s, d); } if (d < 18) { g.got = 1; gainXP(g.v); } }
  S.gems = S.gems.filter(g => !g.got); if (S.gems.length > 500) { const t = S.gems.splice(0, 100).reduce((a, g) => a + g.v, 0); S.gems.push({ x: S.gems[0]?.x || P.x, y: S.gems[0]?.y || P.y, v: t }); }
  for (const it of S.items) { const d = Math.hypot(P.x - it.x, P.y - it.y); if (d < 26) { it.got = 1; useItem(it); } }
  S.items = S.items.filter(i => !i.got);
  if (S.props.filter(p => !p.dead).length < 5 && Math.random() < dt * .1) { const a = Math.random() * TAU; spawnProp(P.x + Math.cos(a) * 900, P.y + Math.sin(a) * 900); }
  S.props = S.props.filter(p => !p.dead && Math.hypot(p.x - P.x, p.y - P.y) < 2500);
  /* takarítás */
  if (S.en.length > 50 && S.en.some(e => e.dead)) S.en = S.en.filter(e => !e.dead);
  for (const p of S.pt) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .92; p.vy *= .92; p.l -= dt; } S.pt = S.pt.filter(p => p.l > 0);
  for (const t of S.txt) { t.y -= 30 * dt; t.l -= dt; } S.txt = S.txt.filter(t => t.l > 0);
  if (S.banner) { S.banner.l -= dt; if (S.banner.l <= 0) S.banner = null; }
  S.shake *= .88;
  if (S.score >= 5000) hooks.flag?.('pt5000'); if (S.t >= 600) hooks.flag?.('t600');
}
function gainXP(v) { S.xp += v * S.st.xp * (S.xp2 > 0 ? 2 : 1) * (S.seal === 'eso' && S.t < 60 ? 2 : 1); S.score += v; Sfx.pick(); while (S.xp >= needXP()) { S.xp -= needXP(); S.lv++; Sfx.lv(); if (S.choose) S.pend++; else openChoose(); } }
export const needXP = () => Math.floor(5 + S.lv * 5 + S.lv * S.lv * .2);
function useItem(it) { const P = S.P;
  if (it.k === 'heal') heal(30); else if (it.k === 'magnet') for (const g of S.gems) g.pull = 1; else if (it.k === 'gold') { S.gold += 10; txt(it.x, it.y, '+10 arany', '#ffd27a'); }
  else if (it.k === 'storm') { banner('FELHŐSZAKADÁS', '', '#9ad8ff', 1.5); for (const e of S.en) if (!e.boss && Math.abs(e.x - P.x) < V.hw && Math.abs(e.y - P.y) < V.hh) kill(e); }
  else if (it.k === 'ice') { banner('JÉGVERÉS', '', '#bfe8ff', 1.5); for (const e of S.en) if (!e.boss) e.freeze = 10; }
  else if (it.k === 'chest') openChest(it.n || 1);
  Sfx.pick(); }

/* ---------- irányítás ---------- */
const K = {}; let joy = null, pad = null;
const KEYS = { ArrowUp: 'U', w: 'U', W: 'U', ArrowDown: 'D', s: 'D', S: 'D', ArrowLeft: 'L', a: 'L', A: 'L', ArrowRight: 'R', d: 'R', D: 'R' };
addEventListener('keydown', e => { const k = KEYS[e.key]; if (k) { K[k] = 1; e.preventDefault(); } });
addEventListener('keyup', e => { const k = KEYS[e.key]; if (k) K[k] = 0; });
addEventListener('blur', () => { for (const k in K) K[k] = 0; joy = null; });
cv.addEventListener('pointerdown', e => { if (!S || S.choose) return; joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY }; cv.setPointerCapture?.(e.pointerId); });
cv.addEventListener('pointermove', e => { if (joy && e.pointerId === joy.id) { joy.x = e.clientX; joy.y = e.clientY; } });
const jEnd = e => { if (joy && e.pointerId === joy.id) joy = null; }; cv.addEventListener('pointerup', jEnd); cv.addEventListener('pointercancel', jEnd);
export function pollPad() { const g = navigator.getGamepads?.()[0]; pad = g ? { x: g.axes[0] || 0, y: g.axes[1] || 0, a: g.buttons[0]?.pressed, start: g.buttons[9]?.pressed } : null; return pad; }

/* ---------- rajzolás ---------- */
const DROPC = { drop: '#6cc6ff', gold: '#ffd23a', cube: '#6cb8ff', bullet: '#bfe8ff', big: '#4fb7ff' };
const EPC = { orb: '#c8a0ff', spear: '#a8784a', arrow: '#e8dcc8', bolt: '#e8dcc8', thorn: '#9cc070', rune: '#ffd23a', code: '#c8a0ff', red: '#ff3a2a', chain: '#9aa3ae', sun: '#ff8a2a' };
function drawSprite(s, x, y, w, h, flip, alpha = 1, flash = 0, tint = '') {
  if (!s.c) { cx.fillStyle = 'rgba(40,30,20,.6)'; cx.beginPath(); cx.arc(x, y - h * .3, w * .25, 0, TAU); cx.fill(); return; }
  let img = s.c; if (tint) img = variant(s, tint, tint === 'r' ? 'rgba(255,40,20,.38)' : tint === 'g' ? 'rgba(255,200,120,.35)' : 'rgba(20,0,30,.6)') || img;
  const fl = flash > 0 ? variant(s, 'w', '#fff') : null;
  const put = im => { if (flip) { cx.save(); cx.translate(x, 0); cx.scale(-1, 1); cx.drawImage(im, -w / 2, y - h, w, h); cx.restore(); } else cx.drawImage(im, x - w / 2, y - h, w, h); };
  cx.globalAlpha = alpha; put(img); if (fl) { cx.globalAlpha = alpha * Math.min(.55, flash * 5); put(fl); } cx.globalAlpha = 1;
}
export function render() {
  const g = cx; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#1a120c'; g.fillRect(0, 0, cv.width, cv.height);
  if (!S) return;
  const P = S.P, sh = S.shake > .5 ? [rnd(-S.shake, S.shake), rnd(-S.shake, S.shake)] : [0, 0];
  const k = DPR * SC * ZM, ox = cv.width / 2 - (P.x + sh[0]) * k, oy = cv.height / 2 - (P.y + sh[1]) * k;
  g.setTransform(k, 0, 0, k, ox, oy);
  /* talaj */
  const x0 = Math.floor((P.x - V.hw - 40) / CH), x1 = Math.floor((P.x + V.hw + 40) / CH), y0 = Math.floor((P.y - V.hh - 40) / CH), y1 = Math.floor((P.y + V.hh + 40) / CH);
  for (let a = x0; a <= x1; a++) for (let b = y0; b <= y1; b++) g.drawImage(chunk(a, b), a * CH, b * CH, CH + 1, CH + 1);
  /* fázis-színezés */
  const vx0 = P.x - V.hw - 10, vy0 = P.y - V.hh - 10, vw = V.hw * 2 + 20, vh = V.hh * 2 + 20;
  if (S.phase === 'bloom') { const a = Math.min(1, S.phT / 20); g.fillStyle = `rgba(70,150,50,${.35 * a})`; g.fillRect(vx0, vy0, vw, vh); drawFlowers(a); }
  if (S.phase === 'wrath') { g.fillStyle = `rgba(170,40,10,${Math.min(.28, .1 + S.phT / 600 * .2)})`; g.fillRect(vx0, vy0, vw, vh); }
  if (S.phase === 'descent' || S.phase === 'god') { g.fillStyle = `rgba(10,0,0,${S.phase === 'descent' ? Math.min(.55, S.phT / 4 * .55) : .5})`; g.fillRect(vx0, vy0, vw, vh); }
  if (S.phase === 'win') { g.fillStyle = 'rgba(60,110,160,.25)'; g.fillRect(vx0, vy0, vw, vh); }
  if (S.arena) { g.strokeStyle = 'rgba(255,120,40,.7)'; g.lineWidth = 6; g.setLineDash([18, 14]); g.beginPath(); g.arc(S.arena.x, S.arena.y, S.arena.R, 0, TAU); g.stroke(); g.setLineDash([]); }
  /* területi hatások (alul) */
  for (const f of S.fx) drawFx(f, true);
  for (const c of S.crystals) drawCrystal(c);
  if (S.thirst > 0) for (const s of S.shades) { g.fillStyle = 'rgba(30,60,90,.45)'; g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill(); g.strokeStyle = '#9ad8ff'; g.lineWidth = 2; g.stroke(); }
  /* jelzések */
  for (const o of S.tele) drawTele(o);
  /* tárgyak */
  for (const p of S.props) drawProp(p);
  for (const gm of S.gems) { const c = gm.v >= 20 ? '#ff6ab0' : gm.v >= 8 ? '#ffd23a' : gm.v >= 3 ? '#5ad8a0' : '#6cc6ff'; g.fillStyle = c; g.beginPath(); g.moveTo(gm.x, gm.y - 6); g.quadraticCurveTo(gm.x + 5, gm.y, gm.x, gm.y + 4); g.quadraticCurveTo(gm.x - 5, gm.y, gm.x, gm.y - 6); g.fill(); }
  for (const it of S.items) drawItem(it);
  /* entitások y szerint */
  const ents = []; for (const e of S.en) if (!e.dead) ents.push(e); ents.push(P); ents.sort((a, b) => a.y - b.y);
  for (const e of ents) { if (e === P) drawPlayer(); else drawEnemy(e); }
  /* lövedékek */
  for (const p of S.pr) { g.fillStyle = p.c || DROPC[p.kind] || '#6cc6ff'; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); if (p.kind !== 'bullet') { g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(p.x - p.r * .3, p.y - p.r * .3, p.r * .35, 0, TAU); g.fill(); } }
  for (const p of S.ep) { g.fillStyle = EPC[p.kind] || '#ff5a3a'; g.beginPath(); if (p.kind === 'arrow' || p.kind === 'bolt' || p.kind === 'spear') { const a = Math.atan2(p.vy, p.vx); g.save(); g.translate(p.x, p.y); g.rotate(a); g.fillRect(-12, -1.5, 24, 3); g.restore(); } else { g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1.5; g.stroke(); } }
  for (const f of S.fx) drawFx(f, false);
  for (const W of Object.values(S.w)) if (W.cubes) for (const c of W.cubes) { g.fillStyle = '#2a5ab8'; g.strokeStyle = '#bfe8ff'; g.lineWidth = 1.5; g.save(); g.translate(c.x, c.y); g.rotate(S.t * 2); g.fillRect(-7, -7, 14, 14); g.strokeRect(-4, -4, 8, 8); g.restore(); }
  drawOrbit();
  for (const p of S.pt) { g.globalAlpha = Math.max(0, p.l / p.L); g.fillStyle = p.c; g.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz); } g.globalAlpha = 1;
  if (S.wave) { g.fillStyle = 'rgba(80,170,255,.55)'; g.fillRect(S.wave.x - 50, P.y - V.hh - 20, 100, V.hh * 2 + 40); }
  if (S.phase === 'win') drawRain();
  g.font = 'bold 13px system-ui,sans-serif'; g.textAlign = 'center';
  for (const t of S.txt) { g.globalAlpha = Math.min(1, t.l * 2); g.font = (t.big ? 'bold 18px' : 'bold 12px') + ' system-ui,sans-serif'; g.fillStyle = '#000'; g.fillText(t.t, t.x + 1, t.y + 1); g.fillStyle = t.c; g.fillText(t.t, t.x, t.y); } g.globalAlpha = 1;
  /* képernyő-effektek */
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (S.ev.vihar) { const gr2 = g.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * .18, VW / 2, VH / 2, Math.max(VW, VH) * .6); gr2.addColorStop(0, 'rgba(200,160,90,0)'); gr2.addColorStop(1, 'rgba(200,160,90,.92)'); g.fillStyle = gr2; g.fillRect(0, 0, VW, VH); }
  if (S.ev.sotet) { const gr2 = g.createRadialGradient(VW / 2, VH / 2, 60 * SC * ZM, VW / 2, VH / 2, 260 * SC * ZM); gr2.addColorStop(0, 'rgba(0,0,0,0)'); gr2.addColorStop(1, 'rgba(0,0,0,.94)'); g.fillStyle = gr2; g.fillRect(0, 0, VW, VH); }
  if (S.ev.hoseg || S.phase === 'wrath') { g.fillStyle = `rgba(255,120,40,${.06 + Math.sin(S.t * 3) * .03})`; g.fillRect(0, 0, VW, VH); }
  if (P.hp / P.mhp < .3) { g.strokeStyle = `rgba(255,40,30,${.35 + Math.sin(S.t * 6) * .15})`; g.lineWidth = 16; g.strokeRect(0, 0, VW, VH); }
  if (joy) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(joy.ox, joy.oy, 50, 0, TAU); g.stroke(); g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.arc(joy.ox + clamp(joy.x - joy.ox, -50, 50), joy.oy + clamp(joy.y - joy.oy, -50, 50), 20, 0, TAU); g.fill(); }
  drawHUD();
}
function drawFlowers(a) { const g = cx, P = S.P; for (let i = 0; i < 90; i++) { const x = Math.floor(P.x / 80) * 80 + ((i * 97) % 23 - 11) * 80 + (hsh(i, 1) * 60), y = Math.floor(P.y / 80) * 80 + ((i * 53) % 17 - 8) * 80 + hsh(i, 2) * 60; const s = a * (2 + hsh(i, 3) * 3);
  g.fillStyle = 'rgba(90,170,60,.8)'; g.fillRect(x - .7, y - s * 2, 1.4, s * 2); g.fillStyle = ['#ff8ab8', '#ffd23a', '#fff', '#c8a0ff'][i % 4]; g.beginPath(); g.arc(x, y - s * 2, s, 0, TAU); g.fill(); } }
function drawRain() { const g = cx, P = S.P; g.strokeStyle = 'rgba(160,210,255,.55)'; g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i < 160; i++) { const x = P.x - V.hw + ((i * 137 + S.t * 300) % (V.hw * 2)), y = P.y - V.hh + ((i * 89 + S.t * 900) % (V.hh * 2)); g.moveTo(x, y); g.lineTo(x - 4, y + 14); } g.stroke(); }
function drawPlayer() {
  const P = S.P, g = cx, s = charSprite(S.ch), bob = Math.sin(S.t * 10) * (Math.hypot(P.vx, P.vy) > 10 ? 2 : .5);
  g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(P.x, P.y + 4, 16, 5, 0, 0, TAU); g.fill();
  drawSprite(s, P.x, P.y + 6 + bob, 56, 105, P.face < 0, P.inv > 0 && Math.floor(S.t * 20) % 2 ? .45 : 1);
  if (P.shield > 0) { g.strokeStyle = 'rgba(150,215,255,.8)'; g.lineWidth = 2.5; g.beginPath(); g.arc(P.x, P.y - 40, 46, 0, TAU); g.stroke(); }
  const hpw = 44; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(P.x - hpw / 2, P.y + 10, hpw, 5); g.fillStyle = '#ff5a4a'; g.fillRect(P.x - hpw / 2, P.y + 10, hpw * clamp(P.hp / P.mhp, 0, 1), 5);
  if (P.drain) { g.fillStyle = '#555'; g.fillRect(P.x + hpw / 2 - hpw * P.drain, P.y + 10, hpw * P.drain, 5); }
}
function drawEnemy(e) {
  const g = cx;
  if (e.boss) return drawBoss(e);
  if (e.under) return;
  const D = e.D, rs = e.rise > 0 ? 1 - e.rise / .8 : 1, s = e.mirageOf ? bossSprite(e.mirageOf) : enSprite(e.k, 96);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(e.x, e.y + 2, e.r * 1.1, e.r * .35, 0, 0, TAU); g.fill();
  const tint = e.mirageOf || e.bossFake ? 'r' : e.elite ? 'r' : e.fake && !e.bossFake ? '' : '';
  if (e.bossFake) { drawSprite(bossSprite('szilard'), e.x, e.y + 10, 160 * .9, 240 * .9, false, .95, e.flash); return; }
  const h = (e.mirageOf ? 1.5 : 1) * D * rs, w = D;
  drawSprite(s, e.x, e.y + D * .12, w, h, e.face < 0, (e.fake ? .55 : 1) * (e.alpha ?? 1), e.flash, tint);
  if (e.k === 'tonpecset' && e.st === 1) { g.fillStyle = '#ff5a3a'; g.font = 'bold 22px serif'; g.textAlign = 'center'; g.fillText(e.num, e.x, e.y - D * .45); }
  if (e.anchor || e.pylon) { g.strokeStyle = '#ff3a2a'; g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(e.x, e.y - 30); g.lineTo(S.boss?.x ?? e.x, (S.boss?.y ?? e.y) - 60); g.stroke(); g.setLineDash([]); }
  if (e.linkTo && !e.linkTo.dead) { g.strokeStyle = 'rgba(200,160,255,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(e.x, e.y - 30); g.lineTo(e.linkTo.x, e.linkTo.y - 60); g.stroke(); }
  if (e.hp < e.mhp && (e.anchor || e.pylon || e.clone || e.mhp > 200)) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(e.x - 20, e.y + 6, 40, 4); g.fillStyle = '#ff6a4a'; g.fillRect(e.x - 20, e.y + 6, 40 * e.hp / e.mhp, 4); }
}
function drawBoss(e) {
  const g = cx, B = e.boss, k = e.bk;
  if (e.under) { g.fillStyle = 'rgba(160,120,70,.5)'; g.beginPath(); g.ellipse(e.x, e.y, 60, 22, 0, 0, TAU); g.fill(); return; }
  const expr = k === 'isten' ? (e.hp / e.mhp < .3 ? 'angry' : e.godShield ? 'calm' : 'grin') : e.hp / e.mhp < .35 ? 'angry' : '';
  const s = expr ? bossSpriteE(k, expr) : bossSprite(k);
  const w = B.size, h = B.size * 1.5, lift = k === 'isten' ? 30 + Math.sin(S.t * 1.4) * 10 : 0;
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(e.x, e.y + (k === 'isten' ? h * .5 + 20 : 4), B.r * 1.2, B.r * .35, 0, 0, TAU); g.fill();
  if (k === 'isten' && !e.godShield) { g.strokeStyle = 'rgba(150,215,255,.0)'; }
  if (k === 'isten' && e.godShield) { g.fillStyle = 'rgba(255,190,90,.12)'; g.beginPath(); g.arc(e.x, e.y - lift, w * .55, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,210,120,.6)'; g.lineWidth = 3; g.stroke(); }
  if (e.dome) { g.strokeStyle = 'rgba(150,215,255,.8)'; g.lineWidth = 4; g.beginPath(); g.arc(e.x, e.y - h * .4, 110, 0, TAU); g.stroke(); }
  drawSprite(s, e.x, e.y + (k === 'isten' ? h * .55 : h * .04) - lift, w, h, false, e.desc > 0 ? clamp(1 - e.desc / 3, .2, 1) : 1, e.flash, e.immune ? 'g' : '');
  if (e.immune) { g.fillStyle = '#ffd27a'; g.font = 'bold 14px system-ui'; g.textAlign = 'center'; g.fillText('VÉDETT', e.x, e.y - h - 6); }
}
function drawProp(p) { const g = cx;
  if (p.k === 'kut') { g.fillStyle = '#7a7366'; g.fillRect(p.x - 16, p.y - 18, 32, 18); g.fillStyle = '#4a453e'; g.fillRect(p.x - 16, p.y - 20, 32, 5); g.fillStyle = '#3a8ad8'; g.fillRect(p.x - 12, p.y - 19, 24, 3); g.strokeStyle = '#5a3a1e'; g.lineWidth = 3; g.beginPath(); g.moveTo(p.x - 14, p.y - 18); g.lineTo(p.x - 14, p.y - 38); g.lineTo(p.x + 14, p.y - 38); g.lineTo(p.x + 14, p.y - 18); g.stroke(); }
  else { g.fillStyle = '#8a8f99'; g.fillRect(p.x - 3, p.y - 26, 6, 26); g.fillStyle = '#d8a030'; g.beginPath(); g.arc(p.x, p.y - 28, 7, 0, TAU); g.fill(); g.fillRect(p.x - 12, p.y - 30, 24, 3); } }
function drawItem(it) { const g = cx, b = Math.sin(S.t * 4 + it.x) * 3, y = it.y - 8 + b;
  const C = { heal: ['#4fb7ff', '+'], magnet: ['#ff5a5a', 'M'], gold: ['#ffd23a', '◆'], storm: ['#9ad8ff', '☂'], ice: ['#bfe8ff', '❄'], chest: ['#c8862a', '★'] }[it.k] || ['#fff', '?'];
  if (it.k === 'chest') { g.fillStyle = '#7a4a1e'; g.fillRect(it.x - 16, y - 12, 32, 22); g.fillStyle = '#d8a030'; g.fillRect(it.x - 16, y - 4, 32, 4); g.fillRect(it.x - 3, y - 6, 6, 8); g.shadowColor = '#ffd23a'; g.shadowBlur = 14; g.strokeStyle = '#ffd23a'; g.strokeRect(it.x - 16, y - 12, 32, 22); g.shadowBlur = 0; return; }
  g.fillStyle = C[0]; g.beginPath(); g.arc(it.x, y, 10, 0, TAU); g.fill(); g.fillStyle = '#10141c'; g.font = 'bold 12px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(C[1], it.x, y + 1); g.textBaseline = 'alphabetic'; }
function drawCrystal(c) { const g = cx, a = c.cool ? .35 : 1; g.globalAlpha = a; g.fillStyle = '#6ad8ff'; g.strokeStyle = '#e8f8ff'; g.lineWidth = 2; g.beginPath(); g.moveTo(c.x, c.y - 46); g.lineTo(c.x + 16, c.y - 16); g.lineTo(c.x, c.y); g.lineTo(c.x - 16, c.y - 16); g.closePath(); g.fill(); g.stroke(); g.globalAlpha = 1;
  g.strokeStyle = 'rgba(150,215,255,.6)'; g.lineWidth = 2; g.setLineDash([5, 5]); g.beginPath(); g.arc(c.x, c.y - 10, 70, 0, TAU); g.stroke(); g.setLineDash([]); if (c.ch > 0) { g.strokeStyle = '#9ad8ff'; g.lineWidth = 5; g.beginPath(); g.arc(c.x, c.y - 10, 70, -Math.PI / 2, -Math.PI / 2 + TAU * c.ch); g.stroke(); } }
function drawTele(o) { const g = cx, p = clamp(o.t / o.d, 0, 1);
  if (o.k === 'circle' || o.k === 'ice') { if (o.player) return; g.strokeStyle = o.c || '#ff3a2a'; g.lineWidth = 2; g.fillStyle = (o.c || '#ff3a2a') + '33'; g.beginPath(); g.arc(o.x, o.y, o.r, 0, TAU); g.fill(); g.stroke(); g.fillStyle = (o.c || '#ff3a2a') + '55'; g.beginPath(); g.arc(o.x, o.y, o.r * p, 0, TAU); g.fill(); }
  else if (o.k === 'lob') { const x = o.sx + (o.x - o.sx) * p, y = o.sy + (o.y - o.sy) * p - Math.sin(p * Math.PI) * 80; g.fillStyle = '#4fb7ff'; g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); }
  else if (o.k === 'beam') { g.save(); g.translate(o.x, o.y); g.rotate(o.a); g.fillStyle = (o.c || '#ff3a2a') + (p < 1 ? '30' : 'aa'); g.fillRect(0, -o.w * p, o.len, o.w * 2 * p); g.strokeStyle = o.c; g.lineWidth = 1; g.strokeRect(0, -o.w, o.len, o.w * 2); if (o.code) { g.fillStyle = '#e8d8ff'; g.font = '11px monospace'; g.fillText('IF  pos = Gergő  THEN  ÜTÉS();', 40, 4); } g.restore(); }
  else if (o.k === 'rung') { g.fillStyle = 'rgba(255,210,60,' + (.2 + p * .4) + ')'; g.fillRect(o.x - o.w / 2, o.y - 10, o.gap - 46 - (o.x - o.w / 2), 20); g.fillRect(o.gap + 46, o.y - 10, o.x + o.w / 2 - o.gap - 46, 20); }
  else if (o.k === 'eclipse') { g.save(); g.translate(o.x, o.y); for (let i = 0; i < o.n; i++) { g.save(); g.rotate(o.rot + i * TAU / o.n); g.fillStyle = o.t > o.d ? 'rgba(255,60,30,.75)' : 'rgba(255,60,30,.2)'; g.fillRect(0, -10, o.len, 20); g.restore(); } g.restore(); }
  else if (o.k === 'sandwave') { const Ar = S.arena, span = 900; g.fillStyle = o.t > o.d ? 'rgba(232,200,138,.85)' : 'rgba(232,200,138,.25)'; const cur = o.t > o.d ? o.cur : -o.side * span / 2;
    if (o.vert) { g.fillRect(Ar.x - span / 2, Ar.y + cur - 45, o.gap + span / 2 - 70, 90); g.fillRect(Ar.x + o.gap + 70, Ar.y + cur - 45, span / 2 - o.gap - 70, 90); } else { g.fillRect(Ar.x + cur - 45, Ar.y - span / 2, 90, o.gap + span / 2 - 70); g.fillRect(Ar.x + cur - 45, Ar.y + o.gap + 70, 90, span / 2 - o.gap - 70); } } }
function drawFx(f, under) { const g = cx, p = f.t / f.d;
  if (under) {
    if (f.k === 'cloud') { g.fillStyle = 'rgba(90,140,200,.25)'; g.beginPath(); g.arc(f.x, f.y, f.r, 0, TAU); g.fill(); }
    else if (f.k === 'fire') { g.fillStyle = `rgba(255,${100 + Math.random() * 60},30,${.5 * (1 - p)})`; g.beginPath(); g.arc(f.x, f.y, f.r, 0, TAU); g.fill(); }
    else if (f.k === 'poison') { g.fillStyle = 'rgba(140,255,60,.28)'; g.beginPath(); g.arc(f.x, f.y, f.r, 0, TAU); g.fill(); }
    else if (f.k === 'mud') { g.fillStyle = 'rgba(70,50,30,.45)'; g.beginPath(); g.arc(f.x, f.y, f.r, 0, TAU); g.fill(); }
    else if (f.k === 'dust') { g.fillStyle = `rgba(200,180,140,${.4 * (1 - p)})`; g.beginPath(); g.arc(f.x, f.y, f.r, 0, TAU); g.fill(); }
    else if (f.k === 'mine') { g.fillStyle = '#2a5a8a'; g.beginPath(); g.arc(f.x, f.y, 7, 0, TAU); g.fill(); g.fillStyle = Math.floor(S.t * 4) % 2 ? '#6cc6ff' : '#bfe8ff'; g.beginPath(); g.arc(f.x, f.y, 3, 0, TAU); g.fill(); }
    else if (f.k === 'flower') { g.fillStyle = '#ff8ab8'; g.beginPath(); g.arc(f.x, f.y, 8, 0, TAU); g.fill(); g.strokeStyle = 'rgba(120,220,120,.5)'; g.beginPath(); g.arc(f.x, f.y, f.r, 0, TAU); g.stroke(); }
    else if (f.k === 'stop') { g.strokeStyle = `rgba(255,50,40,${1 - p})`; g.lineWidth = 3; g.fillStyle = `rgba(255,50,40,${.15 * (1 - p)})`; g.beginPath(); g.arc(f.x, f.y, f.r, 0, TAU); g.fill(); g.stroke(); }
    else if (f.k === 'goldwave') { g.strokeStyle = `rgba(255,210,60,${1 - p})`; g.lineWidth = 8; g.beginPath(); g.arc(f.x, f.y, 20 + p * 260, 0, TAU); g.stroke(); }
    else if (f.k === 'ring') { g.strokeStyle = `rgba(255,60,40,${1 - p})`; g.lineWidth = 3; g.beginPath(); g.arc(f.x, f.y, f.r * p, 0, TAU); g.stroke(); }
    return; }
  if (f.k === 'boom' || f.k === 'geyser') { g.fillStyle = (f.c || '#6cc6ff') + Math.round((1 - p) * 160).toString(16).padStart(2, '0'); g.beginPath(); g.arc(f.x, f.y, f.r * (.5 + p * .5), 0, TAU); g.fill(); if (f.k === 'geyser') { g.fillStyle = `rgba(150,215,255,${1 - p})`; g.fillRect(f.x - 8, f.y - 70 * (1 - p), 16, 70 * (1 - p)); } }
  else if (f.k === 'cloud') { g.fillStyle = 'rgba(200,210,230,.85)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(f.x - 30 + i * 20, f.y - 60 + Math.sin(i * 2) * 6, 22, 0, TAU); g.fill(); } }
  else if (f.k === 'zap') { g.strokeStyle = '#fff8a0'; g.lineWidth = 3; g.beginPath(); g.moveTo(f.x, f.y); g.lineTo((f.x + f.x2) / 2 + rnd(-15, 15), (f.y + f.y2) / 2); g.lineTo(f.x2, f.y2); g.stroke(); }
  else if (f.k === 'tower') { g.fillStyle = '#7a7366'; g.fillRect(f.x - 10, f.y - 36, 20, 36); g.fillStyle = '#3a8ad8'; g.beginPath(); g.arc(f.x, f.y - 38, 9, 0, TAU); g.fill(); }
  else if (f.k === 'wave') { g.strokeStyle = `rgba(90,216,224,${1 - p})`; g.lineWidth = 10; g.beginPath(); g.arc(f.x, f.y, f.R * (.3 + p * .7), f.a - .6, f.a + .6); g.stroke(); }
  else if (f.k === 'broom') { g.strokeStyle = `rgba(255,210,60,${1 - p})`; g.lineWidth = 14; g.beginPath(); if (f.full) g.arc(f.x, f.y, f.R * (.4 + p * .6), 0, TAU); else g.arc(f.x, f.y, f.R * (.3 + p * .7), f.a - .9, f.a + .9); g.stroke(); }
  else if (f.k === 'flash') { g.save(); if (f.k0 === 'rung') {} g.restore(); } }
function drawOrbit() { const g = cx, P = S.P;
  for (const id of ['szoro', 'korforgo']) { const W = S.w[id]; if (!W) continue; const L = W.lv, n = id === 'korforgo' ? 10 : 2 + L + S.st.extra, R = (id === 'korforgo' ? 120 : 70 + L * 6) * S.st.area;
    for (let i = 0; i < n; i++) { const a = (W.a || 0) * (id === 'korforgo' && i % 2 ? -1 : 1) + i * TAU / (id === 'korforgo' ? 5 : n), rr = id === 'korforgo' && i % 2 ? R * .6 : R; g.fillStyle = '#6cc6ff'; g.beginPath(); g.arc(P.x + Math.cos(a) * rr, P.y + Math.sin(a) * rr, 8, 0, TAU); g.fill(); } }
  for (const id of ['rainbird', 'ontozohid']) { const W = S.w[id]; if (!W || !W.R) continue; g.strokeStyle = 'rgba(108,198,255,.35)'; g.lineWidth = 16; g.beginPath(); const a0 = (W.a || 0) % TAU; if (id === 'ontozohid') { for (const s of [0, Math.PI]) { g.moveTo(P.x, P.y); g.lineTo(P.x + Math.cos(a0 + s) * W.R, P.y + Math.sin(a0 + s) * W.R); } } else g.arc(P.x, P.y, W.R * .8, a0, a0 + W.arc * .25); g.stroke(); }
  for (const id of ['pocsolya', 'gyogyforras']) { const W = S.w[id]; if (!W) continue; const R = (60 + W.lv * 12 + (id === 'gyogyforras' ? 50 : 0)) * S.st.area; g.fillStyle = id === 'gyogyforras' ? 'rgba(120,230,160,.18)' : 'rgba(90,160,230,.18)'; g.beginPath(); g.ellipse(P.x, P.y, R, R * .7, 0, 0, TAU); g.fill(); }
  const ms = S.w.malomko || S.w.malomvihar; if (ms?.st.list) for (const q of ms.st.list) { g.fillStyle = '#8a8478'; g.beginPath(); g.arc(q.x, q.y, 14, 0, TAU); g.fill(); g.fillStyle = '#5a544a'; g.beginPath(); g.arc(q.x, q.y, 4, 0, TAU); g.fill(); }
  const pd = S.w.pidevo; if (pd) { g.strokeStyle = 'rgba(90,216,224,.5)'; g.lineWidth = 6; g.beginPath(); g.arc(P.x, P.y, 140 * S.st.area, pd.a, pd.a + 4); g.stroke(); } }
function drawHUD() {
  const g = cx, P = S.P, hide = S.hudHide > 0;
  g.textAlign = 'left';
  if (!hide) {
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, VW, 8); g.fillStyle = '#6cc6ff'; g.fillRect(0, 0, VW * clamp(S.xp / needXP(), 0, 1), 8);
    g.font = 'bold 15px system-ui,sans-serif'; g.fillStyle = '#fff'; g.textAlign = 'center';
    const tm = S.phase === 'wrath' ? 'HARAG ' + fmtT(Math.max(0, 600 - S.phT)) : S.phase === 'bloom' ? 'VIRÁGZÁS' : S.phase === 'god' || S.phase === 'descent' ? 'FINÁLÉ' : fmtT(S.t);
    g.fillText(tm, VW / 2, 30); g.font = '12px system-ui'; g.fillStyle = '#c8d0dc'; g.fillText(S.lv + '. szint · ' + S.kills + ' ölés · ' + S.score.toLocaleString('hu-HU') + ' pont · ' + S.gold + ' arany', VW / 2, 48);
    g.textAlign = 'left'; let y = 22; g.font = '11px system-ui';
    for (const id of S.wo) { const W = S.w[id]; g.fillStyle = W.off > 0 || S.wdisable > 0 || S.stolen === id ? '#ff6a4a' : isEvo(id) ? '#ffd27a' : W.sig ? '#9ad8ff' : '#e8eef6'; g.fillText((isEvo(id) ? '★ ' : '') + wName(id) + (isEvo(id) ? '' : ' ' + W.lv), 10, y); y += 15; }
    y += 4; g.fillStyle = '#b8c0cc'; for (const id of S.po) { g.fillText(PASS[id].n + ' ' + S.pass[id], 10, y); y += 14; }
    if (S.rule) { g.fillStyle = '#ff6a4a'; g.font = 'bold 13px system-ui'; g.textAlign = 'right'; g.fillText({ reverse: 'FORDÍTOTT IRÁNYÍTÁS', noregen: 'NINCS GYÓGYULÁS', xpdrain: 'FOGY AZ XP', fast: 'KÉTSZERES SEBESSÉG', noarmor: 'NINCS PÁNCÉL' }[S.rule] + ' ' + Math.ceil(S.ruleT), VW - 12, 30); }
    if (S.phase === 'wrath') { g.fillStyle = '#ff6a3a'; g.font = 'bold 13px system-ui'; g.textAlign = 'right'; g.fillText('ASZÁLY-ERŐSÍTÉS ×' + (S.wrathMin + 1), VW - 12, 48); }
  }
  if (S.boss && !S.boss.dead && !(S.boss.desc > 0)) { const b = S.boss, w = Math.min(560, VW - 40); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(VW / 2 - w / 2, VH - 44, w, 14); g.fillStyle = b.bk === 'isten' ? (b.godShield ? '#c89a40' : '#ff8a2a') : '#ff4a3a'; g.fillRect(VW / 2 - w / 2, VH - 44, w * clamp(b.hp / b.mhp, 0, 1), 14);
    g.fillStyle = '#fff'; g.font = 'bold 13px system-ui'; g.textAlign = 'center'; g.fillText(b.boss.n + (b.bk === 'isten' ? (b.godShield ? ' · ISTENI PAJZS' : ' · SEBEZHETŐ ' + Math.ceil(S.shieldDown)) : ''), VW / 2, VH - 50); }
  if (S.banner) { const b = S.banner, a = Math.min(1, b.l, (b.L - b.l) * 3); g.globalAlpha = a; g.textAlign = 'center'; g.font = '900 ' + Math.min(34, VW / 18) + 'px system-ui,sans-serif'; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillText(b.t, VW / 2 + 2, VH * .3 + 2); g.fillStyle = b.c; g.fillText(b.t, VW / 2, VH * .3); if (b.sub) { g.font = 'bold 16px system-ui'; g.fillStyle = '#fff'; g.fillText(b.sub, VW / 2, VH * .3 + 28); } g.globalAlpha = 1; }
}

/* ---------- teszt-hookok ---------- */
window.__ab = { get S() { return S; }, skip: m => { S.t += m * 60; S.diffT += m * 60; S.bclock += m; }, boss: k => spawnBoss(k), finale: () => { const sz = S.en.find(e => e.bk === 'szilard'); if (sz) kill(sz); else { S.phase = 'bloom'; S.phT = 0; } }, wrathEnd: () => { S.phT = 600; }, give: id => WEAP[id] ? addW(id) : PASS[id] ? addP(id) : 0, god: 1 };
export { addW, addP, stats, spawnBoss, openChest, canEvolve, wName, isEvo, fmtT };
