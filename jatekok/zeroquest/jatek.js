/* ZERO QUEST – játékmenet: hős, ellenfelek, harc, küldetések, kezelőfelület */
'use strict';
const cv = document.getElementById('c'), c = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, SC = 1, U = 1, CSC = 1, SS = 1, T = 0, ST = 'title', TOUCH = false;
const CH = new Map(), SPR = new Map(), CS = 512, SAVE = 'hgws_zeroquest_v1';
function resize() { DPR = Math.min(2, devicePixelRatio || 1); W = cv.width = Math.round(innerWidth * DPR); H = cv.height = Math.round(innerHeight * DPR); SC = Math.sqrt(W * H / 800000); U = DPR * clamp(Math.min(innerWidth / 1100, innerHeight / 640), .6, 1.3); CSC = Math.min(SC, 1.5); SS = Math.min(SC * 1.15, 2.6); CH.clear(); SPR.clear(); }
addEventListener('resize', resize); resize();
const shade = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgb(${clamp((n >> 16) + a, 0, 255)},${clamp((n >> 8 & 255) + a, 0, 255)},${clamp((n & 255) + a, 0, 255)})`; };
const angD = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

/* ---------- hang ---------- */
let AC = null;
function sfx(f = 440, d = .08, type = 'square', v = .05, slide = 0) { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime; o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d); } catch (_) {} }
function hiss(d = .12, v = .08, hp = 900) { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const n = AC.sampleRate * d | 0, b = AC.createBuffer(1, n, AC.sampleRate), a = b.getChannelData(0); for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n); const s = AC.createBufferSource(), g = AC.createGain(), f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; s.buffer = b; g.gain.value = v; s.connect(f); f.connect(g); g.connect(AC.destination); s.start(); } catch (_) {} }

/* ---------- adatok ---------- */
const WEP = [{ n: 'Rozsdás kard', d: 10, col: '#a3a7a8' }, { n: 'Acélkard', d: 18, col: '#e3ebf2' }, { n: 'Lángpenge', d: 28, col: '#ffb45c' }];
const ARM = [{ n: 'Vászoning', def: 0, col: '#3f6fb5' }, { n: 'Bőrvért', def: .15, col: '#8a5a34' }, { n: 'Láncing', def: .3, col: '#8e99a6' }];
const SHOP = [{ k: 'pot', n: 'Gyógyital', d: 'Visszatölt 60 életet', p: 25 }, { k: 'arm', v: 1, n: 'Bőrvért', d: '15% védelem', p: 120 }, { k: 'arm', v: 2, n: 'Láncing', d: '30% védelem', p: 350 }, { k: 'wep', v: 2, n: 'Lángpenge', d: '28 sebzés, lángoló él', p: 420 }];
const ET = {
  slime: { n: 'Nyálka', hp: 28, d: 7, sp: 62, r: 16, ag: 250, xp: 12, g: [2, 6], rng: 120, wind: .5, rec: .8, cd: 1.3, lunge: 250 },
  wolf: { n: 'Farkas', hp: 44, d: 11, sp: 150, r: 17, ag: 340, xp: 22, g: [0, 4], rng: 150, wind: .42, rec: .7, cd: 1.5, lunge: 430 },
  bandit: { n: 'Haramia', hp: 70, d: 14, sp: 100, r: 16, ag: 330, xp: 35, g: [8, 18], rng: 56, wind: .5, rec: .6, cd: 1.1 },
  archer: { n: 'Íjász', hp: 46, d: 12, sp: 88, r: 16, ag: 430, xp: 35, g: [8, 18], rng: 360, wind: .75, rec: .5, cd: 1.9, ranged: 1 },
  skel: { n: 'Csontváz', hp: 95, d: 18, sp: 88, r: 16, ag: 320, xp: 55, g: [10, 22], rng: 58, wind: .55, rec: .6, cd: 1.1 },
  chief: { n: 'Varjú, a haramiavezér', hp: 340, d: 20, sp: 112, r: 19, ag: 460, xp: 250, g: [120, 120], rng: 64, wind: .42, rec: .45, cd: .8, boss: 1 },
  golem: { n: 'Hamvak Őre', hp: 950, d: 26, sp: 58, r: 44, ag: 9999, xp: 800, g: [300, 300], boss: 2 }
};
const SPAWN = [];
(() => { const S = (t, x, y, id) => SPAWN.push({ t, x, y, id });
  for (const [x, y] of [[760, 2620], [620, 2760], [880, 2820], [700, 2980], [520, 2900], [980, 2700], [840, 3080], [440, 2640], [1040, 2960], [1180, 1420], [1420, 1400]]) S('slime', x, y);
  for (const [x, y] of [[2560, 2140], [2700, 2380], [2940, 2260], [3120, 2480], [2820, 2700], [3350, 2300], [2640, 1560], [2760, 1440], [3420, 2660], [3520, 2400], [2500, 2900], [3050, 3000]]) S('wolf', x, y);
  for (const [x, y] of [[3130, 1480], [3200, 1540], [3470, 800], [3560, 930], [3700, 900]]) S('bandit', x, y); for (const [x, y] of [[3260, 1420], [3520, 690], [3760, 820]]) S('archer', x, y);
  S('chief', 3620, 720, 'chief');
  for (const [x, y] of [[3920, 1800], [4060, 1640], [4380, 1620], [4640, 1780], [4000, 2460], [4300, 2560], [4620, 2400]]) S('skel', x, y);
  S('golem', RUIN[0] + 120, RUIN[1], 'golem'); })();
const NPCS = [{ id: 'elder', n: 'Öreg Bodza', x: 1050, y: 1792, skin: '#e0b48c', tunic: '#7a4fa0', hair: '#e8e6e0', a: 1.57 }, { id: 'smith', n: 'Kova, a kovács', x: 1500, y: 1790, skin: '#c98f66', tunic: '#5a4a3e', hair: '#2a1d14', a: 1.4 }, { id: 'shop', n: 'Zsófi, a kalmár', x: 1040, y: 2160, skin: '#f0c9a4', tunic: '#2f8f84', hair: '#b5532a', a: 1.2 }];

/* ---------- állapot ---------- */
let P, R, EN = [], PRJ = [], AOE = [], FX = [], PICK = [], DLG = null, BAN = null, MSG = null, BOSS = null, CAM = { x: 1200, y: 1900, sh: 0 }, newSure = 0, bossOn = false;
const newP = () => ({ x: 1185, y: 1985, hp: 100, mhp: 100, mp: 50, mmp: 50, lv: 1, xp: 0, gold: 15, pot: 2, wep: 0, arm: 0, pelt: 0, q: 0, sl: 0, fire: 0, dead: {}, chest: {}, time: 0, kills: 0 });
const newR = () => ({ a: 1.57, walk: 0, atk: null, cd: 0, dodge: 0, dx: 0, dy: 0, inv: 0, hurt: 0, combo: 0, comboT: 9, spin: 0, vx: 0, vy: 0, st: 100, alive: 1, moving: 0, deadT: 0, potCd: 0, saveT: 0 });
const need = lv => Math.round(60 * Math.pow(lv, 1.5)), dmgOf = () => WEP[P.wep].d + (P.lv - 1) * 2;
function save() { try { localStorage.setItem(SAVE, JSON.stringify(P)); } catch (_) {} }
function load() { try { const o = JSON.parse(localStorage.getItem(SAVE)); return o && o.mhp ? { ...newP(), ...o } : null; } catch (_) { return null; } }
function spawnAll() { EN = SPAWN.filter(s => !(s.id && P.dead[s.id])).map((s, i) => ({ ...s, hx: s.x, hy: s.y, hp: ET[s.t].hp, st: 'idle', tm: 0, a: rnd(i, 3, 5) * TAU, vx: 0, vy: 0, cd: rnd(i, 1, 2), ph: rnd(i, 7, 7) * 9, wt: 0, tx: s.x, ty: s.y, hurt: 0, n: 0, walk: 0 })); BOSS = null; bossOn = false; GATE.off = P.q >= 7 ? 1 : 0; PRJ = []; AOE = []; }
function start(fresh) { P = fresh ? newP() : load() || newP(); R = newR(); if (!fresh) { const f = FIRES[P.fire] || FIRES[0]; if (P.q > 0) { P.x = f[0] - 50; P.y = f[1] + 40; } } spawnAll(); PICK = []; FX = []; CAM.x = P.x; CAM.y = P.y; ST = 'play'; if (fresh) { save(); banner('HAJNALRÉV', 'A folyó partra vetett. Valaki vár a faluban.'); } }
function banner(t, s, d = 3.4) { BAN = { t, s, l: d, d }; }
function say(t) { MSG = { t, l: 2.6 }; }

/* ---------- bevitel ---------- */
const K = new Set(), M = { x: 0, y: 0, used: 0 }, JOY = { id: null, ox: 0, oy: 0, dx: 0, dy: 0 }, BTN = [], Q = [];
addEventListener('keydown', e => { if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); if (!e.repeat) { K.add(e.code); Q.push(e.code); } });
addEventListener('keyup', e => K.delete(e.code)); addEventListener('blur', () => K.clear()); cv.addEventListener('contextmenu', e => e.preventDefault());
const hitBtn = (x, y) => { for (let i = BTN.length - 1; i >= 0; i--) { const b = BTN[i]; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b; } return null; };
cv.addEventListener('pointerdown', e => { const x = e.clientX * DPR, y = e.clientY * DPR; TOUCH = e.pointerType === 'touch'; M.x = x; M.y = y; const b = hitBtn(x, y); if (b) { b.fn(); return; }
  if (ST === 'dialog') return Q.push('KeyE'); if (ST !== 'play') return;
  if (TOUCH) { if (x < W * .5 && JOY.id == null) { JOY.id = e.pointerId; JOY.ox = x; JOY.oy = y; JOY.dx = JOY.dy = 0; } } else { M.used = 1; Q.push(e.button === 2 ? 'KeyF' : 'Atk'); } });
cv.addEventListener('pointermove', e => { const x = e.clientX * DPR, y = e.clientY * DPR; if (e.pointerId === JOY.id) { const dx = x - JOY.ox, dy = y - JOY.oy, d = hyp(dx, dy), m = 60 * U; JOY.dx = d > 8 * U ? dx / Math.max(d, m) : 0; JOY.dy = d > 8 * U ? dy / Math.max(d, m) : 0; } else if (e.pointerType !== 'touch') { M.x = x; M.y = y; M.used = 1; } });
const pup = e => { if (e.pointerId === JOY.id) { JOY.id = null; JOY.dx = JOY.dy = 0; } }; cv.addEventListener('pointerup', pup); cv.addEventListener('pointercancel', pup);

/* ---------- rajz-segédek ---------- */
function sprite(key, w, h, ax, ay, fn) { let s = SPR.get(key); if (!s) { const k = document.createElement('canvas'); k.width = Math.ceil(w * SS); k.height = Math.ceil(h * SS); const x = k.getContext('2d'); x.scale(SS, SS); x.translate(ax, ay); fn(x); SPR.set(key, s = { k, w, h, ax, ay }); } return s; }
function drawSprite(s, x, y, sc = 1) { c.drawImage(s.k, x - s.ax * sc, y - s.ay * sc, s.w * sc, s.h * sc); }
function drawMan(x, y, o) { const s = o.s || 1, a = o.a, ca = Math.cos(a), sa = Math.sin(a), wk = Math.sin(o.walk || 0), bob = Math.abs(wk) * 2, by = -19 - bob, hy = by - 20;
  c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(0, 1, 17, 7, 0, 0, TAU); c.fill();
  if (o.roll) { c.translate(0, -18); c.rotate(o.roll); c.translate(0, 18); } if (o.alpha != null) c.globalAlpha = o.alpha;
  c.fillStyle = o.boot || '#3a2a1c'; c.beginPath(); c.ellipse(-6 + ca * wk * 5, -3 + sa * wk * 3, 5.5, 4, 0, 0, TAU); c.ellipse(6 - ca * wk * 5, -3 - sa * wk * 3, 5.5, 4, 0, 0, TAU); c.fill();
  const weapon = () => { const hx = ca * 13, hY = by + 4 + sa * 8, wa = a + (o.sw != null ? o.sw : -.95); c.save(); c.translate(hx, hY); c.rotate(wa);
    if (o.bow) { c.strokeStyle = '#6b4a2c'; c.lineWidth = 3; c.beginPath(); c.arc(-2, 0, 17, -1.25, 1.25); c.stroke(); c.strokeStyle = 'rgba(240,240,230,.8)'; c.lineWidth = 1; c.beginPath(); c.moveTo(3.4, -16); c.lineTo(o.draw ? -6 : 3.4, 0); c.lineTo(3.4, 16); c.stroke(); if (o.draw) { c.strokeStyle = '#d9d2bd'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-6, 0); c.lineTo(22, 0); c.stroke(); } }
    else if (o.wep) { const L = o.long || 36; c.fillStyle = '#5b3a1e'; c.fillRect(-7, -2, 9, 4); c.fillStyle = '#e8b656'; c.fillRect(1, -6.5, 3.4, 13); c.fillStyle = o.wep; c.beginPath(); c.moveTo(4, -2.6); c.lineTo(L - 5, -1.9); c.lineTo(L, 0); c.lineTo(L - 5, 1.9); c.lineTo(4, 2.6); c.fill(); c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(5, -1.6, L - 11, 1.2);
      if (o.flame) { c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(255,${120 + 60 * Math.sin(T * 14) | 0},40,.45)`; c.beginPath(); c.ellipse(L * .55, 0, L * .5, 4.5 + Math.sin(T * 20) * 1.2, 0, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over'; } }
    c.restore(); c.fillStyle = o.skin; c.beginPath(); c.arc(hx, hY, 4.2, 0, TAU); c.fill(); };
  if (sa < -.2) weapon();
  const g = c.createLinearGradient(-13, 0, 13, 0); g.addColorStop(0, shade(o.tunic, -22)); g.addColorStop(.45, shade(o.tunic, 14)); g.addColorStop(1, shade(o.tunic, -44)); c.fillStyle = g; c.beginPath(); c.ellipse(0, by, 12.5, 15, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1.5; c.stroke();
  c.fillStyle = o.trim || '#4b3320'; c.fillRect(-12, by + 3, 24, 3.6); c.fillStyle = '#e8b656'; c.fillRect(-2, by + 2.6, 4, 4.4);
  if (o.cape) { c.fillStyle = o.cape; c.beginPath(); c.moveTo(-ca * 4 - 10, by - 9); c.quadraticCurveTo(-ca * 16, by + 8 + wk * 2, -ca * 9 - 6, by + 16); c.lineTo(-ca * 9 + 6, by + 16); c.quadraticCurveTo(-ca * 14 + 4, by + 6, -ca * 4 + 10, by - 9); c.globalAlpha *= sa > .3 ? .0 : .95; c.fill(); c.globalAlpha = o.alpha != null ? o.alpha : 1; }
  c.fillStyle = o.skin; c.beginPath(); c.arc(-ca * 2 - sa * 13, by + 3 + ca * 5, 4, 0, TAU); c.fill();
  c.fillStyle = o.hair; c.beginPath(); c.arc(0, hy, 10.6, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.45)'; c.stroke();
  if (sa > -.4) { c.fillStyle = o.skin; c.beginPath(); c.ellipse(ca * 3, hy + 2 + Math.max(0, sa) * 2, 8.4, 7.8, 0, 0, TAU); c.fill(); c.fillStyle = o.hair; c.beginPath(); c.ellipse(-ca * 2.5, hy - 5.5, 10, 5.6, 0, Math.PI, TAU); c.fill();
    c.fillStyle = o.eye || '#1c1410'; c.beginPath(); c.arc(ca * 5.2 - 3.3 * Math.max(.35, sa), hy + 2.6 + sa * 2.4, 1.5, 0, TAU); c.arc(ca * 5.2 + 3.3 * Math.max(.35, sa), hy + 2.6 + sa * 2.4, 1.5, 0, TAU); c.fill();
    if (o.mask) { c.fillStyle = o.mask; c.beginPath(); c.ellipse(ca * 3, hy + 6.5 + Math.max(0, sa) * 2, 8.2, 4.4, 0, 0, Math.PI); c.fill(); } }
  if (o.hood) { c.fillStyle = o.hood; c.beginPath(); c.arc(0, hy - 1, 11.6, Math.PI * .92, TAU * 1.04); c.lineTo(-ca * 3, hy - 15); c.fill(); }
  if (sa >= -.2) weapon(); if (o.flash) { c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(255,255,255,${o.flash})`; c.beginPath(); c.ellipse(0, by - 6, 15, 26, 0, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over'; }
  c.restore(); }
function drawSlime(e) { const mv = e.st === 'chase' || e.st === 'atk', hop = Math.abs(Math.sin(T * (mv ? 7 : 3) + e.ph)), w = e.st === 'wind' ? 1.25 : 1 + (1 - hop) * .14, h = e.st === 'wind' ? .7 : .86 + hop * .22, x = e.x, y = e.y - (mv ? hop * 9 : 0);
  c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(e.x, e.y + 2, 19 * w, 7, 0, 0, TAU); c.fill(); const g = c.createRadialGradient(x - 5, y - 20 * h, 2, x, y - 12 * h, 24); g.addColorStop(0, '#c9f58a'); g.addColorStop(.5, '#6fc24a'); g.addColorStop(1, '#2f7a2c'); c.fillStyle = g;
  c.beginPath(); c.moveTo(x - 19 * w, y); c.bezierCurveTo(x - 21 * w, y - 30 * h, x + 21 * w, y - 30 * h, x + 19 * w, y); c.quadraticCurveTo(x, y + 6, x - 19 * w, y); c.fill(); c.strokeStyle = 'rgba(16,60,20,.7)'; c.lineWidth = 1.6; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(x - 7 * w, y - 17 * h, 4.5, 2.6, -.5, 0, TAU); c.fill(); const ex = Math.cos(e.a) * 3.5; c.fillStyle = '#12301a'; c.beginPath(); c.ellipse(x - 5 + ex, y - 10 * h, 2.4, 3.4, 0, 0, TAU); c.ellipse(x + 6 + ex, y - 10 * h, 2.4, 3.4, 0, 0, TAU); c.fill();
  if (e.hurt > 0 || e.st === 'wind') { c.globalCompositeOperation = 'lighter'; c.fillStyle = e.hurt > 0 ? 'rgba(255,255,255,.5)' : `rgba(255,80,60,${.25 + .25 * Math.sin(T * 30)})`; c.beginPath(); c.ellipse(x, y - 10 * h, 19 * w, 13 * h, 0, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over'; } }
function drawWolf(e) { const run = e.st === 'chase' || e.st === 'atk' ? 1 : .3, wk = Math.sin(e.walk) * run, fl = Math.cos(e.a) < 0 ? -1 : 1, tilt = Math.sin(e.a) * .35; c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(e.x, e.y + 2, 24, 7, 0, 0, TAU); c.fill();
  c.save(); c.translate(e.x, e.y - 15 - Math.abs(wk) * 2); c.scale(fl, 1); c.rotate(tilt * fl * .6 + (e.st === 'wind' ? -.18 : 0)); c.strokeStyle = '#3c3f47'; c.lineWidth = 5; c.lineCap = 'round'; for (const [lx, ph] of [[-13, 0], [-8, 2], [10, 1], [15, 3]]) { c.beginPath(); c.moveTo(lx, 4); c.lineTo(lx + Math.sin(e.walk + ph) * 6 * run, 15); c.stroke(); }
  c.strokeStyle = '#555a66'; c.lineWidth = 6; c.beginPath(); c.moveTo(-19, -2); c.quadraticCurveTo(-30, -8 + wk * 3, -32, 4); c.stroke();
  const g = c.createLinearGradient(0, -12, 0, 10); g.addColorStop(0, '#7b808d'); g.addColorStop(1, '#474a54'); c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 22, 11, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1.5; c.stroke();
  c.fillStyle = '#6a6f7c'; c.beginPath(); c.ellipse(21, -7, 10, 8.5, .3, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#585c68'; c.beginPath(); c.moveTo(27, -5); c.lineTo(38, -1); c.lineTo(27, 1); c.fill(); c.fillStyle = '#3c3f47'; c.beginPath(); c.moveTo(15, -13); c.lineTo(17, -22); c.lineTo(22, -14); c.moveTo(22, -14); c.lineTo(26, -21); c.lineTo(28, -12); c.fill();
  c.fillStyle = e.st === 'wind' || e.st === 'atk' ? '#ff5340' : '#ffd35a'; c.beginPath(); c.arc(24, -8, 1.8, 0, TAU); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(38, -1, 1.8, 0, TAU); c.fill();
  if (e.hurt > 0) { c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(4, -2, 30, 14, 0, 0, TAU); c.fill(); } c.restore(); c.globalCompositeOperation = 'source-over'; }
function drawGolem(e) { const b = Math.sin(T * 2.2) * 3, glow = .55 + .45 * Math.sin(T * 4), rage = e.hp < ET.golem.hp / 2, gc = rage ? '255,80,50' : '255,170,60', x = e.x, y = e.y; c.fillStyle = 'rgba(0,0,0,.36)'; c.beginPath(); c.ellipse(x, y + 4, 62, 20, 0, 0, TAU); c.fill();
  const rock = (pts, col) => { c.fillStyle = col; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(x + p[0], y + p[1] + b) : c.moveTo(x + p[0], y + p[1] + b)); c.closePath(); c.fill(); c.strokeStyle = 'rgba(14,12,12,.75)'; c.lineWidth = 2.5; c.stroke(); };
  const sw = e.st === 'wind' ? -18 : 0, ar = Math.sin(T * 2.2) * 4;
  rock([[-74, -70 + sw + ar], [-50, -86 + sw + ar], [-40, -40 + ar], [-52, -8 + ar], [-76, -16 + ar]], '#514b47'); rock([[74, -70 + sw - ar], [50, -86 + sw - ar], [40, -40 - ar], [52, -8 - ar], [76, -16 - ar]], '#474240');
  rock([[-40, 0], [-48, -50], [-30, -92], [28, -94], [48, -52], [40, 0], [0, 8]], '#5d5752'); rock([[-30, -92], [28, -94], [14, -60], [-18, -58]], '#787068'); rock([[-18, -96], [-12, -122], [14, -122], [20, -96]], '#6a635c');
  c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(${gc},${.5 + glow * .5})`; c.lineWidth = 3; c.lineCap = 'round'; c.shadowColor = `rgb(${gc})`; c.shadowBlur = 16; c.beginPath(); for (const [x0, y0, x1, y1] of [[-22, -48, -6, -30], [-6, -30, -14, -10], [8, -52, 20, -34], [20, -34, 10, -16], [-4, -70, 4, -56]]) { c.moveTo(x + x0, y + y0 + b); c.lineTo(x + x1, y + y1 + b); } c.stroke();
  c.fillStyle = `rgba(${gc},1)`; c.beginPath(); c.arc(x - 6, y - 108 + b, 3.4, 0, TAU); c.arc(x + 8, y - 108 + b, 3.4, 0, TAU); c.fill(); c.shadowBlur = 0; if (e.hurt > 0) { c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(x, y - 56, 60, 70, 0, 0, TAU); c.fill(); } c.globalCompositeOperation = 'source-over'; }
const LOOK = { bandit: { skin: '#d6a57c', tunic: '#5c4a3a', hair: '#231a14', mask: '#7a2f2a', wep: '#b9bec4' }, archer: { skin: '#d6a57c', tunic: '#4a5a3c', hair: '#3a2a1c', hood: '#33402a', bow: 1 }, skel: { skin: '#e9e4d2', tunic: '#b9b29c', hair: '#e9e4d2', eye: '#7df0ff', wep: '#9aa3a8', boot: '#c9c3ae', trim: '#6a6454' }, chief: { skin: '#c99670', tunic: '#2b2630', hair: '#15121a', mask: '#111', wep: '#dfe6ee', cape: '#7a1f24', s: 1.22, long: 44 } };
function drawEnemy(e) { if (e.st === 'dead') c.globalAlpha = clamp(1 - e.tm * 2.2, 0, 1); if (e.t === 'slime') drawSlime(e); else if (e.t === 'wolf') drawWolf(e); else if (e.t === 'golem') drawGolem(e);
  else { const L = LOOK[e.t], T0 = ET[e.t]; let sw = null; if (e.st === 'wind') sw = -1.5 - .5 * (1 - e.tm / T0.wind); else if (e.st === 'rec' && e.tm > T0.rec - .16) sw = -1.9 + 3.2 * (1 - (e.tm - (T0.rec - .16)) / .16); else if (e.st === 'rec') sw = 1.2;
    drawMan(e.x, e.y, { ...L, a: e.a, walk: e.walk, sw: L.bow ? 0 : sw, draw: e.st === 'wind', flash: e.hurt > 0 ? .5 : e.st === 'wind' && !L.bow ? .12 + .12 * Math.sin(T * 30) : 0 }); }
  c.globalAlpha = 1; if (e.st !== 'dead' && !ET[e.t].boss && e.hp < ET[e.t].hp) { const w = 34, y = e.y - (e.t === 'slime' ? 40 : e.t === 'wolf' ? 46 : 62); c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(e.x - w / 2 - 1, y - 1, w + 2, 6); c.fillStyle = '#d7483c'; c.fillRect(e.x - w / 2, y, w * e.hp / ET[e.t].hp, 4); }
  if (e.alert > 0) { c.fillStyle = '#ffd35a'; c.font = '900 22px Georgia'; c.textAlign = 'center'; c.fillText('!', e.x, e.y - 66 - (1 - e.alert) * 10); } }

/* ---------- harc ---------- */
function fxNum(x, y, t, col = '#fff', big = 0) { FX.push({ k: 'num', x: x + (Math.random() - .5) * 16, y, t, col, l: .8, big }); }
function sparks(x, y, n, col, sp = 160) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = sp * (.3 + Math.random()); FX.push({ k: 'sp', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, l: .25 + Math.random() * .3, col }); } }
function hitEnemy(e, d, ang, kb, crit) { if (e.st === 'dead') return; d = Math.round(d * (.9 + Math.random() * .2)); e.hp -= d; e.hurt = .14; const B = ET[e.t].boss; e.vx += Math.cos(ang) * kb * (B ? .25 : 1); e.vy += Math.sin(ang) * kb * (B ? .25 : 1);
  fxNum(e.x, e.y - 50, d, crit ? '#ffd35a' : '#fff', crit); sparks(e.x, e.y - 20, 6, e.t === 'slime' ? '#9be36a' : e.t === 'skel' ? '#e9e4d2' : e.t === 'golem' ? '#ffb45c' : '#ff6a5a'); CAM.sh = Math.max(CAM.sh, crit ? 7 : 4); hiss(.07, .07, 1400); sfx(190, .06, 'square', .04, -80);
  if (e.st === 'idle' || e.st === 'back') { e.st = 'chase'; } if (!B && (e.st === 'wind' || e.st === 'chase')) { e.st = 'hurt'; e.tm = .22; }
  if (e.hp <= 0) { e.st = 'dead'; e.tm = 0; const E = ET[e.t]; P.kills++; gainXp(E.xp); const g = E.g[0] + Math.floor(Math.random() * (E.g[1] - E.g[0] + 1)); for (let i = 0; i < Math.min(8, Math.ceil(g / 4)); i++) drop('gold', e.x, e.y, Math.ceil(g / Math.min(8, Math.ceil(g / 4))));
    if (e.t === 'wolf' && P.q >= 3 && Math.random() < .8) drop('pelt', e.x, e.y, 1); if (Math.random() < (B ? 1 : .09)) drop('pot', e.x, e.y, 1); if (e.t === 'slime' && P.q === 1) { P.sl++; if (P.sl === 6) say('Megvan a hat nyálka – irány Bodza!'); }
    sparks(e.x, e.y - 16, 16, '#fff', 220); sfx(120, .25, 'sawtooth', .05, -80);
    if (e.id) { P.dead[e.id] = 1; if (e.id === 'chief') { P.q = Math.max(P.q, 6); drop('key', e.x, e.y, 1); banner('VARJÚ ELESETT', 'Nála volt a romok kulcsa.'); } if (e.id === 'golem') { P.q = 8; GATE.off = 1; bossOn = false; BOSS = null; AOE = []; PRJ = []; banner('A HAMVAK ŐRE LEDŐLT', 'A zúgás elhallgatott.', 4); setTimeout(() => { if (ST === 'play') ST = 'end'; }, 4200); } save(); } } }
function drop(k, x, y, n) { const a = Math.random() * TAU, v = 60 + Math.random() * 120; PICK.push({ k, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, n }); }
function gainXp(n) { P.xp += n; while (P.xp >= need(P.lv)) { P.xp -= need(P.lv); P.lv++; P.mhp += 12; P.mmp += 5; P.hp = P.mhp; P.mp = P.mmp; banner('SZINTLÉPÉS', P.lv + '. szint' + (P.lv === 2 ? ' · Új képesség: Örvényvágás' : P.lv === 4 ? ' · Új képesség: Tűzlövedék' : ''), 2.6); sfx(520, .5, 'triangle', .07, 500); FX.push({ k: 'ring', x: P.x, y: P.y, l: .7, r: 120, col: '255,211,90' }); save(); } }
function hurtP(d, ang, kb = 260) { if (!R.alive || R.inv > 0 || R.dodge > 0 || ST !== 'play') return; d = Math.max(1, Math.round(d * (1 - ARM[P.arm].def))); P.hp -= d; R.inv = .55; R.hurt = .25; R.vx += Math.cos(ang) * kb; R.vy += Math.sin(ang) * kb; R.atk = null; CAM.sh = 9; fxNum(P.x, P.y - 60, d, '#ff6a5a'); sfx(140, .16, 'sawtooth', .07, -60); hiss(.1, .08, 500);
  if (P.hp <= 0) { P.hp = 0; R.alive = 0; R.deadT = 0; ST = 'dead'; sfx(200, .9, 'sawtooth', .07, -160); } }
function tryAtk() { if (R.atk || R.cd > 0 || R.dodge > 0) return; R.combo = R.comboT < .55 ? (R.combo + 1) % 3 : 0; const heavy = R.combo === 2; if (TOUCH || !M.used) { let b = null, bd = 230; for (const e of EN) if (e.st !== 'dead') { const d = hyp(e.x - P.x, e.y - P.y); if (d < bd) { bd = d; b = e; } } if (b) R.a = Math.atan2(b.y - P.y, b.x - P.x); }
  R.atk = { t: 0, T: heavy ? .34 : .24, a: R.a, hit: new Set(), heavy, dir: R.combo === 1 ? -1 : 1 }; R.vx += Math.cos(R.a) * (heavy ? 240 : 130); R.vy += Math.sin(R.a) * (heavy ? 240 : 130); hiss(.11, .05, 2400); sfx(heavy ? 300 : 420, .08, 'triangle', .03, 260); }
function trySpin() { if (P.lv < 2) return say('Örvényvágás: 2. szinttől'); if (R.atk || R.spin > 0 || R.dodge > 0 || P.mp < 25) return; P.mp -= 25; R.spin = .42; R.spinHit = new Set(); hiss(.3, .07, 1600); sfx(260, .3, 'sawtooth', .04, 400); }
function tryBolt() { if (P.lv < 4) return say('Tűzlövedék: 4. szinttől'); if (R.atk || R.dodge > 0 || R.cd > 0 || P.mp < 18) return; P.mp -= 18; R.cd = .35; PRJ.push({ x: P.x + Math.cos(R.a) * 22, y: P.y - 22 + Math.sin(R.a) * 22, vx: Math.cos(R.a) * 520, vy: Math.sin(R.a) * 520, d: dmgOf() * 1.5, r: 9, l: 1.1, k: 'bolt' }); sfx(700, .2, 'sawtooth', .05, -400); }
function tryDodge(mx, my) { if (R.dodge > 0 || R.st < 28) return; R.st -= 28; const a = mx || my ? Math.atan2(my, mx) : R.a; R.dodge = .34; R.dx = Math.cos(a); R.dy = Math.sin(a); R.atk = null; hiss(.14, .04, 700); for (let i = 0; i < 5; i++) FX.push({ k: 'dust', x: P.x, y: P.y, l: .4, vx: (Math.random() - .5) * 60, vy: (Math.random() - .5) * 30 }); }
function tryPot() { if (P.pot < 1 || P.hp >= P.mhp || R.potCd > 0) return; P.pot--; P.hp = Math.min(P.mhp, P.hp + 60); R.potCd = 1; fxNum(P.x, P.y - 60, '+60', '#7dff8a'); sfx(500, .25, 'sine', .07, 300); FX.push({ k: 'ring', x: P.x, y: P.y, l: .5, r: 60, col: '125,255,138' }); }

/* ---------- ellenfelek ---------- */
function moveE(e, a, sp, dt) { e.x += Math.cos(a) * sp * dt; e.y += Math.sin(a) * sp * dt; e.walk += sp * dt * .11; }
function ai(e, dt) { const E = ET[e.t]; e.x += e.vx * dt; e.y += e.vy * dt; e.vx *= Math.pow(.002, dt); e.vy *= Math.pow(.002, dt); if (e.hurt > 0) e.hurt -= dt; if (e.alert > 0) e.alert -= dt * 1.4; if (e.st === 'dead') { e.tm += dt; return; }
  if (e.t === 'golem') return golem(e, dt); const dx = P.x - e.x, dy = P.y - e.y, d = hyp(dx, dy), toP = Math.atan2(dy, dx), home = hyp(e.x - e.hx, e.y - e.hy); e.cd -= dt;
  if (e.st === 'idle') { e.wt -= dt; if (e.wt <= 0) { e.wt = 1.5 + Math.random() * 3; const a = Math.random() * TAU; e.tx = e.hx + Math.cos(a) * 70; e.ty = e.hy + Math.sin(a) * 70; } const td = hyp(e.tx - e.x, e.ty - e.y); if (td > 6) { e.a = Math.atan2(e.ty - e.y, e.tx - e.x); moveE(e, e.a, E.sp * .35, dt); } if (d < E.ag && R.alive) { e.st = 'chase'; e.alert = 1; if (E.boss) BOSS = e; } }
  else if (e.st === 'chase') { e.a = toP; if (!R.alive || d > E.ag * 1.8 || home > 760) { e.st = 'back'; if (BOSS === e) BOSS = null; }
    else if (E.ranged) { if (d < 180) moveE(e, toP + Math.PI, E.sp, dt); else if (d > 310) moveE(e, toP, E.sp, dt); else moveE(e, toP + 1.57 * (e.ph > 4.5 ? 1 : -1), E.sp * .5, dt); if (e.cd <= 0 && d < E.rng) { e.st = 'wind'; e.tm = E.wind; } }
    else { const hop = e.t === 'slime' ? .35 + Math.abs(Math.sin(T * 7 + e.ph)) : 1; if (d > (E.lunge ? E.rng * .75 : E.rng - 6)) moveE(e, toP + (E.lunge ? Math.sin(T * 1.3 + e.ph) * .5 : 0), E.sp * hop, dt); if (d < E.rng + 14 && e.cd <= 0) { e.st = 'wind'; e.tm = E.wind; e.aa = toP; } } }
  else if (e.st === 'wind') { e.tm -= dt; if (e.tm > E.wind * .35) e.aa = toP; e.a = E.ranged ? toP : e.aa; if (e.tm <= 0) { e.cd = E.cd; e.n++;
      if (E.ranged) { PRJ.push({ x: e.x + Math.cos(toP) * 20, y: e.y - 24 + Math.sin(toP) * 20, vx: Math.cos(toP) * 430, vy: Math.sin(toP) * 430, d: E.d, r: 6, l: 1.4, k: 'arrow', foe: 1 }); sfx(900, .07, 'triangle', .04, -500); e.st = 'rec'; e.tm = E.rec; }
      else if (E.lunge) { e.st = 'atk'; e.tm = .34; e.hitd = 0; sfx(e.t === 'wolf' ? 240 : 320, .12, 'sawtooth', .04, 120); }
      else { e.st = 'rec'; e.tm = E.rec; hiss(.1, .05, 1800); FX.push({ k: 'arc', x: e.x, y: e.y - 20, a: e.aa, r: E.rng + 12, l: .16, foe: 1 }); if (d < E.rng + 22 && angD(toP, e.aa) < 1.05) hurtP(E.d, e.aa);
        if (e.t === 'chief' && e.n % 3 === 0) for (let k = -2; k <= 2; k++) { const a = toP + k * .2; PRJ.push({ x: e.x, y: e.y - 24, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, d: 12, r: 6, l: 1.2, k: 'knife', foe: 1 }); } } } }
  else if (e.st === 'atk') { e.tm -= dt; moveE(e, e.aa, E.lunge, dt); if (!e.hitd && d < E.r + 16) { e.hitd = 1; hurtP(E.d, e.aa); } if (e.tm <= 0) { e.st = 'rec'; e.tm = E.rec; } }
  else if (e.st === 'rec' || e.st === 'hurt') { e.tm -= dt; if (e.tm <= 0) e.st = 'chase'; }
  else if (e.st === 'back') { e.a = Math.atan2(e.hy - e.y, e.hx - e.x); moveE(e, e.a, E.sp, dt); e.hp = Math.min(E.hp, e.hp + E.hp * .3 * dt); if (home < 30) e.st = 'idle'; else if (d < E.ag * .6 && home < 500 && R.alive) e.st = 'chase'; }
  collide(e, E.r); }
function golem(e, dt) { const E = ET.golem, dx = P.x - e.x, dy = P.y - e.y, d = hyp(dx, dy), toP = Math.atan2(dy, dx), rage = e.hp < E.hp / 2; e.cd -= dt;
  if (!bossOn) { if (P.q >= 7 && hyp(P.x - RUIN[0], P.y - RUIN[1]) < ARENA_R - 70) { bossOn = true; BOSS = e; GATE.off = 0; e.cd = 1.6; banner('HAMVAK ŐRE', 'A romok ébredő őrzője', 3); sfx(70, 1.2, 'sawtooth', .08, 60); CAM.sh = 14; } return; }
  if (!R.alive) return;
  if (rage && !e.sum) { e.sum = 1; banner('AZ ŐR FELIZZIK', '', 2); for (const k of [-1, 1]) { const s = { t: 'skel', x: e.x, y: e.y + k * 120, hx: e.x, hy: e.y + k * 120, hp: ET.skel.hp, st: 'chase', tm: 0, a: 0, vx: 0, vy: 0, cd: 1, ph: k + 3, wt: 0, hurt: 0, n: 0, walk: 0, sum: 1 }; EN.push(s); FX.push({ k: 'ring', x: s.x, y: s.y, l: .6, r: 70, col: '125,240,255' }); } }
  if (e.st === 'idle' || e.st === 'chase') { e.st = 'chase'; e.a = toP; if (d > 110) moveE(e, toP, E.sp * (rage ? 1.35 : 1), dt);
    if (e.cd <= 0) { const k = (e.n++) % 3; if (d < 150 && k !== 1) { e.st = 'wind'; e.tm = .7; e.mode = 'slam'; AOE.push({ x: e.x, y: e.y, r: 170, t: .7, T: .7, d: E.d }); }
      else if (k === 0) { e.mode = 'rain'; e.st = 'wind'; e.tm = .5; const n = rage ? 6 : 4; for (let i = 0; i < n; i++) AOE.push({ x: P.x + (i ? (Math.random() - .5) * 260 : 0), y: P.y + (i ? (Math.random() - .5) * 260 : 0), r: 84, t: .9 + i * .28, T: .9 + i * .28, d: E.d * .8 }); }
      else if (k === 1) { e.mode = 'charge'; e.st = 'wind'; e.tm = .85; e.aa = toP; }
      else { e.mode = 'ring'; e.st = 'wind'; e.tm = .6; } } }
  else if (e.st === 'wind') { e.tm -= dt; if (e.mode === 'charge' && e.tm > .3) e.aa = toP; if (e.tm <= 0) { if (e.mode === 'charge') { e.st = 'atk'; e.tm = .62; e.hitd = 0; sfx(90, .5, 'sawtooth', .08, 120); }
      else { if (e.mode === 'ring') { const n = rage ? 20 : 14, o = Math.random(); for (let i = 0; i < n; i++) { const a = (i + o) / n * TAU; PRJ.push({ x: e.x, y: e.y - 30, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, d: E.d * .6, r: 11, l: 2.4, k: 'rock', foe: 1 }); } sfx(110, .3, 'square', .07, -40); CAM.sh = 8; } e.st = 'rec'; e.tm = rage ? .5 : .8; e.cd = rage ? 1.1 : 1.7; } } }
  else if (e.st === 'atk') { e.tm -= dt; moveE(e, e.aa, 560, dt); if (Math.random() < .5) FX.push({ k: 'dust', x: e.x, y: e.y, l: .5, vx: (Math.random() - .5) * 90, vy: (Math.random() - .5) * 40 }); if (!e.hitd && d < E.r + 22) { e.hitd = 1; hurtP(E.d * 1.2, e.aa, 520); } const q = hyp(e.x - RUIN[0], e.y - RUIN[1]); if (q > ARENA_R - 70) { e.x = RUIN[0] + (e.x - RUIN[0]) / q * (ARENA_R - 70); e.y = RUIN[1] + (e.y - RUIN[1]) / q * (ARENA_R - 70); e.tm = 0; CAM.sh = 12; hiss(.25, .1, 200); }
    if (e.tm <= 0) { e.st = 'rec'; e.tm = rage ? .6 : 1; e.cd = 1.2; } }
  else if (e.st === 'rec' || e.st === 'hurt') { e.tm -= dt; if (e.tm <= 0) e.st = 'chase'; } }

/* ---------- párbeszédek, küldetések ---------- */
function talk(n, lines, done) { DLG = { n, lines, i: 0, ch: 0, done }; ST = 'dialog'; }
function npcTalk(id) { const q = P.q;
  if (id === 'elder') { if (q === 0) talk('Öreg Bodza', ['Hát felébredtél, vándor! Három napja sodort partra a folyó.', 'Hajnalrév bajban van. A déli réten elszaporodtak a nyálkák, az erdőben farkasok járnak, a keleti romok felől pedig éjjelente zúgást hallani.', 'Ha segítenél… kezdd a nyálkákkal. Hat is elég, hogy a gyerekek újra kimehessenek a rétre.'], () => { P.q = 1; P.sl = 0; save(); });
    else if (q === 1 && P.sl < 6) talk('Öreg Bodza', [`A déli réten találod őket – eddig ${P.sl} van meg a hatból. Vigyázz, ugranak!`]);
    else if (q === 1) talk('Öreg Bodza', ['Szép munka! Fogadd el ezt a pár aranyat és két üveg gyógyitalt.', 'Kova, a kovács keresett. A műhelye a tábortűz mellett áll.'], () => { P.q = 2; P.gold += 40; P.pot += 2; gainXp(50); save(); });
    else if (q === 2 || q === 3) talk('Öreg Bodza', ['Kova a műhelyénél vár. Jó kard nélkül ne menj az erdőn túlra.']);
    else if (q === 4) talk('Öreg Bodza', ['Acélkard… akkor most elmondom az igazat.', 'Az erdőn túl, északkeleten egy Varjú nevű haramia vert tábort. Nála van a romok kapujának kulcsa.', 'Szerezd meg, és megtudjuk végre, mi zúg a romok alatt.'], () => { P.q = 5; save(); });
    else if (q === 5) talk('Öreg Bodza', ['Varjú tábora az erdő északkeleti szélén áll. Az erdei úton fölfelé találod.']);
    else if (q < 8) talk('Öreg Bodza', ['Nálad a kulcs… A romok keleten várnak. Pihenj meg a tábortűznél, mielőtt belépsz.']);
    else talk('Öreg Bodza', ['Elhallgatott a zúgás. Hajnalrév nem felejti el a neved, vándor.']); }
  else if (id === 'smith') { if (q < 2) talk('Kova', ['Jó acél kéne ide, nem beszéd. Előbb Bodzával beszélj.']);
    else if (q === 2) talk('Kova', ['Te vagy az új? Azzal a rozsdás vassal sokra nem mész.', 'Hozz öt farkasbundát az erdőből a fújtatómhoz, és kovácsolok neked egy rendes kardot.'], () => { P.q = 3; save(); });
    else if (q === 3 && P.pelt < 5) talk('Kova', [`Öt bunda kell. Eddig ${P.pelt} van.`]);
    else if (q === 3) talk('Kova', ['Ez az! Ebből kitelik a fújtató.', 'Tessék – Acélkard. Forgasd egészséggel, és nézz be Bodzához.'], () => { P.q = 4; P.pelt -= 5; P.wep = Math.max(P.wep, 1); gainXp(120); banner('ÚJ FEGYVER', 'Acélkard', 2.4); save(); });
    else talk('Kova', ['Vigyázz arra a pengére. Nem magától lett éles.']); }
  else talk('Zsófi', ['Nézz körül! Bájital, vért, penge – minden van, ami egy vándornak kell.'], () => { ST = 'shop'; }); }
function interact() { const t = target(); if (!t) return; if (t.npc) return npcTalk(t.npc.id);
  const o = t.o; if (o.t === 'fire') { P.hp = P.mhp; P.mp = P.mmp; if (o.i >= 0) P.fire = o.i; spawnAll(); save(); banner('MEGPIHENTÉL', 'Állás mentve · az ellenfelek visszatértek', 2.2); sfx(330, .5, 'sine', .06, 200); FX.push({ k: 'ring', x: o.x, y: o.y, l: .8, r: 140, col: '255,180,90' }); }
  else if (o.t === 'chest') { P.chest[o.id] = 1; const L = { c1: [60, 2], c2: [120, 3], c3: [180, 2] }[o.id]; for (let i = 0; i < 8; i++) drop('gold', o.x, o.y, Math.ceil(L[0] / 8)); for (let i = 0; i < L[1]; i++) drop('pot', o.x, o.y, 1); sfx(600, .3, 'triangle', .06, 400); save(); }
  else if (o.t === 'gate') { if (P.q < 6) talk('', ['Zárt vaskapu. Súlyos lakat lóg rajta – kulcs nélkül nem nyílik.']); else { P.q = 7; GATE.off = 1; save(); talk('', ['A kulcs elfordul. A kapu nyikorogva kitárul…']); sfx(90, .8, 'sawtooth', .06, 40); } } }
function target() { let b = null, bd = 78; for (const n of NPCS) { const d = hyp(n.x - P.x, n.y - P.y); if (d < bd) { bd = d; b = { npc: n, x: n.x, y: n.y - 70 }; } }
  near(P.x, P.y, 120, o => { if (o.t !== 'fire' && o.t !== 'chest' && o.t !== 'gate') return; if (o.t === 'chest' && P.chest[o.id]) return; if (o.t === 'gate' && (o.off || bossOn)) return; const d = hyp(o.x - P.x, o.y - P.y) - (o.t === 'gate' ? 50 : 0); if (d < bd) { bd = d; b = { o, x: o.x, y: o.y - (o.t === 'gate' ? 110 : 62) }; } }); return b; }
const QPOS = () => [[1050, 1792], P.sl >= 6 ? [1050, 1792] : [760, 2800], [1500, 1790], P.pelt >= 5 ? [1500, 1790] : [2900, 2300], [1050, 1792], [3620, 760], [GATE.x, GATE.y], RUIN, null][P.q];
const QTXT = () => ['Beszélj Bodzával a faluban', P.sl >= 6 ? 'Térj vissza Bodzához' : `Irtsd a nyálkákat a déli réten  ${P.sl}/6`, 'Keresd fel Kovát, a kovácsot', P.pelt >= 5 ? 'Vidd a bundákat Kovának' : `Gyűjts farkasbundát az erdőben  ${P.pelt}/5`, 'Beszélj Bodzával', 'Győzd le Varjút a haramiatáborban', 'Nyisd ki a romok kapuját', 'Győzd le a Hamvak Őrét', 'A völgy biztonságban van'][P.q];

/* ---------- frissítés ---------- */
function update(dt) { T += dt; if (BAN && (BAN.l -= dt) <= 0) BAN = null; if (MSG && (MSG.l -= dt) <= 0) MSG = null; for (const f of FX) { f.l -= dt; if (f.vx != null) { f.x += f.vx * dt; f.y += f.vy * dt; if (f.k === 'sp') f.vy += 500 * dt; } if (f.k === 'num') f.y -= 46 * dt; } FX = FX.filter(f => f.l > 0);
  const keys = Q.splice(0);
  if (ST === 'title') { CAM.x = 1200 + Math.sin(T * .08) * 420; CAM.y = 1880 + Math.cos(T * .06) * 160; return; }
  if (ST === 'dialog') { DLG.ch += dt * 55; if (keys.some(k => k === 'KeyE' || k === 'Space' || k === 'Enter' || k === 'Atk')) { if (DLG.ch < DLG.lines[DLG.i].length) DLG.ch = 999; else if (++DLG.i >= DLG.lines.length) { const d = DLG.done; DLG = null; ST = 'play'; if (d) d(); } else DLG.ch = 0; } return; }
  if (ST === 'shop' || ST === 'menu' || ST === 'end') { if (keys.some(k => k === 'Escape' || k === 'Tab' || k === 'KeyI')) ST = 'play'; return; }
  if (ST === 'dead') { R.deadT += dt; if (R.deadT > 2.6) { const f = FIRES[P.fire] || FIRES[0], lost = Math.floor(P.gold * .2); P.gold -= lost; P.x = f[0] - 50; P.y = f[1] + 40; P.hp = P.mhp; P.mp = P.mmp; R = newR(); spawnAll(); ST = 'play'; banner('ÚJRAÉLEDTÉL', lost ? `${lost} arany odaveszett` : '', 2.4); save(); } return; }
  P.time += dt; for (const k of keys) { if (k === 'Escape' || k === 'Tab' || k === 'KeyI') { ST = 'menu'; return; } if (k === 'Atk' || k === 'KeyJ') tryAtk(); if (k === 'KeyQ') trySpin(); if (k === 'KeyF') tryBolt(); if (k === 'KeyE') interact(); if (k === 'Digit1' || k === 'KeyR') tryPot(); }
  if (ST !== 'play') return;
  let mx = (K.has('KeyD') || K.has('ArrowRight') ? 1 : 0) - (K.has('KeyA') || K.has('ArrowLeft') ? 1 : 0), my = (K.has('KeyS') || K.has('ArrowDown') ? 1 : 0) - (K.has('KeyW') || K.has('ArrowUp') ? 1 : 0); if (JOY.id != null) { mx = JOY.dx; my = JOY.dy; } const ml = hyp(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
  if (keys.includes('Space') || keys.includes('ShiftLeft')) tryDodge(mx, my);
  if (!TOUCH && M.used) R.a = Math.atan2((M.y - H / 2) / SC + CAM.y - (P.y - 22), (M.x - W / 2) / SC + CAM.x - P.x); else if (ml > .2 && !R.atk) R.a = Math.atan2(my, mx);
  R.cd -= dt; R.inv -= dt; R.hurt -= dt; R.comboT += dt; R.potCd -= dt; R.st = Math.min(100, R.st + 30 * dt); P.mp = Math.min(P.mmp, P.mp + 2.2 * dt);
  let sp = 195; if (R.dodge > 0) { R.dodge -= dt; P.x += R.dx * 540 * dt; P.y += R.dy * 540 * dt; sp = 0; } else if (R.atk || R.spin > 0) sp = 70; if (R.hurt > 0) sp *= .4;
  P.x += mx * sp * dt + R.vx * dt; P.y += my * sp * dt + R.vy * dt; R.vx *= Math.pow(.0005, dt); R.vy *= Math.pow(.0005, dt); R.moving = ml > .1 && sp > 0; if (R.moving) { R.walk += dt * 11 * ml; if (Math.random() < dt * 5) FX.push({ k: 'dust', x: P.x, y: P.y, l: .35, vx: 0, vy: -8 }); }
  collide(P, 14); if (bossOn) { const q = hyp(P.x - RUIN[0], P.y - RUIN[1]); if (q > ARENA_R - 40) { P.x = RUIN[0] + (P.x - RUIN[0]) / q * (ARENA_R - 40); P.y = RUIN[1] + (P.y - RUIN[1]) / q * (ARENA_R - 40); } }
  const D = dmgOf();
  if (R.atk) { const A = R.atk; A.t += dt; const k = A.t / A.T; if (k > .2 && k < .85) for (const e of EN) if (e.st !== 'dead' && !A.hit.has(e)) { const d = hyp(e.x - P.x, e.y - P.y), E = ET[e.t]; if (d < (A.heavy ? 88 : 74) + E.r && (d < E.r + 20 || angD(Math.atan2(e.y - P.y, e.x - P.x), A.a) < (A.heavy ? 1.25 : 1.05))) { A.hit.add(e); hitEnemy(e, D * (A.heavy ? 1.6 : 1), A.a, A.heavy ? 380 : 220, A.heavy); } } if (A.t >= A.T) { R.atk = null; R.cd = A.heavy ? .2 : .05; R.comboT = 0; } }
  if (R.spin > 0) { R.spin -= dt; for (const e of EN) if (e.st !== 'dead' && !R.spinHit.has(e) && hyp(e.x - P.x, e.y - P.y) < 104 + ET[e.t].r) { R.spinHit.add(e); hitEnemy(e, D * 1.4, Math.atan2(e.y - P.y, e.x - P.x), 420, 1); } }
  for (const e of EN) if (e.st !== 'dead' || e.tm < .6) { if (hyp(e.x - P.x, e.y - P.y) < 1250 || e === BOSS || e.st === 'back') ai(e, dt); } EN = EN.filter(e => e.st !== 'dead' || e.tm < .6);
  for (let i = 0; i < EN.length; i++) { const a = EN[i]; if (a.st === 'dead') continue; for (let j = i + 1; j < EN.length; j++) { const b = EN[j]; if (b.st === 'dead') continue; const dx = b.x - a.x, dy = b.y - a.y, d = hyp(dx, dy), m = ET[a.t].r + ET[b.t].r; if (d < m && d > .01) { const p = (m - d) / 2; a.x -= dx / d * p; a.y -= dy / d * p; b.x += dx / d * p; b.y += dy / d * p; } }
    if (a.st !== 'atk' && R.dodge <= 0) { const dx = P.x - a.x, dy = P.y - a.y, d = hyp(dx, dy), m = ET[a.t].r + 12; if (d < m && d > .01) { P.x += dx / d * (m - d) * .6; P.y += dy / d * (m - d) * .6; } } }
  for (const p of PRJ) { p.l -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.foe) { if (hyp(p.x - P.x, p.y - (P.y - 22)) < p.r + 13) { p.l = 0; hurtP(p.d, Math.atan2(p.vy, p.vx), 160); } }
    else for (const e of EN) if (e.st !== 'dead' && hyp(p.x - e.x, p.y - (e.y - 20)) < p.r + ET[e.t].r + 6) { p.l = 0; hitEnemy(e, p.d, Math.atan2(p.vy, p.vx), 260, 1); FX.push({ k: 'ring', x: p.x, y: p.y + 20, l: .3, r: 46, col: '255,150,60' }); break; }
    if (p.l > 0 && p.k !== 'rock') { let hit = 0; near(p.x, p.y + 22, 30, o => { if (o.solid && !o.off && !o.w && o.t !== 'fire' && hyp(o.x - p.x, o.y - p.y - 22) < o.r) hit = 1; }); if (hit) { p.l = 0; sparks(p.x, p.y, 4, '#ddd', 90); } } if (p.k === 'bolt' && Math.random() < .7) FX.push({ k: 'sp', x: p.x, y: p.y, vx: (Math.random() - .5) * 60, vy: -40, l: .25, col: '#ffb45c' }); }
  PRJ = PRJ.filter(p => p.l > 0);
  for (const z of AOE) { z.t -= dt; if (z.t <= 0) { if (hyp(P.x - z.x, P.y - z.y) < z.r) hurtP(z.d, Math.atan2(P.y - z.y, P.x - z.x), 320); FX.push({ k: 'ring', x: z.x, y: z.y, l: .4, r: z.r * 1.25, col: '255,140,60' }); for (let i = 0; i < 8; i++) FX.push({ k: 'dust', x: z.x + (Math.random() - .5) * z.r, y: z.y + (Math.random() - .5) * z.r * .5, l: .6, vx: (Math.random() - .5) * 120, vy: -30 }); CAM.sh = Math.max(CAM.sh, 7); hiss(.2, .08, 150); sfx(70, .25, 'square', .06, -20); } } AOE = AOE.filter(z => z.t > 0);
  for (const k of PICK) { k.t += dt; k.x += k.vx * dt; k.y += k.vy * dt; k.vx *= Math.pow(.01, dt); k.vy *= Math.pow(.01, dt); const d = hyp(P.x - k.x, P.y - k.y); if (k.t > .35 && d < 130) { k.x += (P.x - k.x) / d * 420 * dt; k.y += (P.y - k.y) / d * 420 * dt; }
    if (k.t > .35 && d < 24) { k.got = 1; if (k.k === 'gold') { P.gold += k.n; sfx(1200, .05, 'square', .025); } else if (k.k === 'pelt') { P.pelt++; fxNum(P.x, P.y - 60, 'Farkasbunda', '#e8d9b5'); sfx(500, .08, 'triangle', .04); if (P.pelt === 5 && P.q === 3) say('Megvan az öt bunda – irány Kova!'); } else if (k.k === 'pot') { P.pot++; fxNum(P.x, P.y - 60, 'Gyógyital', '#ff8fa0'); sfx(700, .08, 'triangle', .04); } else { fxNum(P.x, P.y - 60, 'A romok kulcsa', '#ffd35a', 1); sfx(880, .4, 'triangle', .06, 300); } } }
  PICK = PICK.filter(k => !k.got); if ((R.saveT += dt) > 30) { R.saveT = 0; save(); }
  CAM.x = lerp(CAM.x, clamp(P.x + Math.cos(R.a) * 30, W / SC / 2, WW - W / SC / 2), 1 - Math.pow(.002, dt)); CAM.y = lerp(CAM.y, clamp(P.y - 20 + Math.sin(R.a) * 20, H / SC / 2, WH - H / SC / 2), 1 - Math.pow(.002, dt)); CAM.sh *= Math.pow(.004, dt); }
