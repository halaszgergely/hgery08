// Kohóvár – kirajzolás (saját, kódból rajzolt pixeles grafika): szeletelt talajréteg, felfedezési köd, épületek, egységek, lövedékek.
import { TS, ITEMS, ITEM_IDS, LIQUIDS, STATUS, FLOORS, WALLS, BLOCKS, UNITS } from './adat.js?v=202611261712';
import { FL, WL, DX, DY, PLAYER, ENEMY, buildTime } from './vilag.js?v=202611261712';

const P = 2, CH = 32;        // a talajréteg felbontása (képpont / világegység) és a szeletek mérete mezőben
const TEAM = { [PLAYER]: '#ffd37f', [ENEMY]: '#f25555' };
const NX = [1, 0, -1, 0, 1, 1, -1, -1], NY = [0, 1, 0, -1, 1, -1, 1, -1];
const hash = (x, y, s = 0) => { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function shade(c, f) { const n = parseInt(c.slice(1), 16); const m = v => Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)))); return '#' + ((1 << 24) | (m(n >> 16) << 16) | (m(n >> 8 & 255) << 8) | m(n & 255)).toString(16).slice(1); }
const rgb = c => { const n = parseInt(c.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; };

/* ---------- talaj: igény szerint rajzolt szeletek, kisérkép-alap, köd ---------- */
export function makeTerrain(W) {
  const w = W.w, h = W.h, N = w * h, depth = new Uint8Array(N), T = TS * P, cache = new Map();
  { const q = new Int32Array(N); let qh = 0, qt = 0; for (let i = 0; i < N; i++) if (!W.wall[i]) q[qt++] = i; else depth[i] = 255;
    while (qh < qt) { const i = q[qh++], d = depth[i]; if (d >= 5) continue; const x = i % w, y = (i - x) / w; for (let k = 0; k < 8; k++) { const X = x + NX[k], Y = y + NY[k]; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = Y * w + X; if (depth[j] === 255) { depth[j] = d + 1; q[qt++] = j; } } } }
  function tile(g, x, y, X, Y) {
    const i = y * w + x, d = depth[i];
    if (d) {
      if (d > 3) { g.fillStyle = '#060607'; g.fillRect(X, Y, T, T); return; }
      const c = WALLS[WL[W.wall[i] - 1]];
      if (d > 1) { g.fillStyle = shade(c, d === 2 ? -.5 : -.82); g.fillRect(X, Y, T, T); return; }
      const below = y + 1 < h && !W.wall[i + w];
      g.fillStyle = shade(c, hash(x, y, 2) * .08); g.fillRect(X, Y, T, T);
      g.fillStyle = shade(c, .12); if (hash(x, y, 4) > .5) g.fillRect(X + 3, Y + 3, 5, 4); if (hash(x, y, 5) > .6) g.fillRect(X + 9, Y + 9, 4, 3);
      if (below) { g.fillStyle = shade(c, -.35); g.fillRect(X, Y + T - 5, T, 5); }
      if (y > 0 && !W.wall[i - w]) { g.fillStyle = shade(c, .22); g.fillRect(X, Y, T, 2); }
      return;
    }
    const f = FLOORS[FL[W.floor[i]]];
    g.fillStyle = hash(x, y) < .5 ? f.c : f.c2; g.fillRect(X, Y, T, T);
    for (let k = 0; k < 3; k++) { const r = hash(x, y, k + 3); if (r < .55) continue; g.fillStyle = shade(f.c, r < .8 ? -.08 : .06); g.fillRect(X + Math.floor(hash(x, y, k + 9) * (T - 4)), Y + Math.floor(hash(x, y, k + 19) * (T - 4)), 4, 4); }
    if (f.liq) { g.fillStyle = f.glow ? 'rgba(255,230,150,.35)' : 'rgba(255,255,255,.07)'; if (hash(x, y, 7) > .55) g.fillRect(X + 3, Y + 6 + Math.floor(hash(x, y, 8) * 6), 8, 2); }
    if (f.heat && !f.liq && hash(x, y, 12) > .8) { g.fillStyle = 'rgba(255,150,60,.5)'; g.fillRect(X + 4 + Math.floor(hash(x, y, 13) * 6), Y + 5, 2, 6); }
    if (f.spores && hash(x, y, 14) > .7) { g.fillStyle = 'rgba(190,150,255,.45)'; g.fillRect(X + 3 + Math.floor(hash(x, y, 15) * 9), Y + 3 + Math.floor(hash(x, y, 16) * 9), 2, 2); }
    const o = W.ore[i];
    if (o) { const it = ITEMS[ITEM_IDS[o - 1]]; for (let k = 0; k < 4; k++) { const ox = X + 1 + Math.floor(hash(x, y, k + 31) * (T - 7)), oy = Y + 1 + Math.floor(hash(x, y, k + 41) * (T - 7)), s = 4 + Math.floor(hash(x, y, k + 51) * 3); g.fillStyle = it.c2; g.fillRect(ox, oy + 2, s, s - 1); g.fillStyle = it.c; g.fillRect(ox, oy, s, s - 1); g.fillStyle = shade(it.c, .35); g.fillRect(ox + 1, oy, 2, 2); } }
    if (y > 0 && W.wall[i - w]) { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(X, Y, T, 5); }
  }
  function chunk(cx, cy) {
    const key = cy * 4096 + cx; let cv = cache.get(key);
    if (cv) { cache.delete(key); cache.set(key, cv); return cv; }
    cv = document.createElement('canvas'); cv.width = cv.height = CH * T; const g = cv.getContext('2d'); g.fillStyle = '#060607'; g.fillRect(0, 0, cv.width, cv.height);
    for (let y = 0; y < CH; y++) for (let x = 0; x < CH; x++) { const X = cx * CH + x, Y = cy * CH + y; if (X < w && Y < h) tile(g, X, Y, x * T, y * T); }
    cache.set(key, cv); if (cache.size > 80) cache.delete(cache.keys().next().value);
    return cv;
  }
  // kisérkép-alap: egy képpont / mező
  const mini = document.createElement('canvas'); mini.width = w; mini.height = h;
  { const g = mini.getContext('2d'), im = g.createImageData(w, h), D = im.data, fc = FL.map(k => rgb(FLOORS[k].c)), wc = WL.map(k => rgb(WALLS[k])), oc = ITEM_IDS.map(k => rgb(ITEMS[k].c));
    for (let i = 0; i < N; i++) { const d = depth[i]; let c; if (!d) c = W.ore[i] ? oc[W.ore[i] - 1] : fc[W.floor[i]]; else if (d > 3) c = [6, 6, 7]; else { const b = wc[W.wall[i] - 1], m = d === 1 ? 1 : d === 2 ? .5 : .2; c = [b[0] * m, b[1] * m, b[2] * m]; } D[i * 4] = c[0]; D[i * 4 + 1] = c[1]; D[i * 4 + 2] = c[2]; D[i * 4 + 3] = 255; }
    g.putImageData(im, 0, 0); }
  // köd: a felfedezetlen rész szürkén látszik (csak a körvonalak), a felfedezett átlátszó
  const fog = document.createElement('canvas'); fog.width = w; fog.height = h; const fg = fog.getContext('2d'), fim = fg.createImageData(w, h), FD = fim.data;
  for (let i = 0; i < N; i++) { const d = depth[i], f = FLOORS[FL[W.floor[i]]], c = !d ? (f.liq ? [43, 47, 55] : [56, 57, 62]) : d <= 2 ? [36, 37, 41] : [15, 15, 17], n = (hash(i % w, (i / w) | 0, 99) - .5) * 5; FD[i * 4] = c[0] + n; FD[i * 4 + 1] = c[1] + n; FD[i * 4 + 2] = c[2] + n; FD[i * 4 + 3] = W.seen && W.seen[i] ? 0 : 255; }
  fg.putImageData(fim, 0, 0); if (W.seenNew) W.seenNew.length = 0;
  function update() {
    const L = W.seenNew; if (!L || !L.length) return; let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (const i of L) { FD[i * 4 + 3] = 0; const x = i % w, y = (i - x) / w; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    L.length = 0; fg.putImageData(fim, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  }
  return { chunk, mini, fog, update, depth };
}

/* ---------- alap formák ---------- */
function panel(g, x, y, s, c = '#6e7080') {
  g.fillStyle = shade(c, -.45); g.fillRect(x, y, s, s);
  g.fillStyle = c; g.fillRect(x + .75, y + .75, s - 1.5, s - 1.5);
  g.fillStyle = shade(c, .18); g.fillRect(x + .75, y + .75, s - 1.5, .75); g.fillRect(x + .75, y + .75, .75, s - 1.5);
  g.fillStyle = shade(c, -.2); g.fillRect(x + .75, y + s - 1.5, s - 1.5, .75);
}
function itemSq(g, it, x, y, s = 3.2) { const I = ITEMS[it]; g.fillStyle = I.c2; g.fillRect(x - s / 2, y - s / 2 + .5, s, s); g.fillStyle = I.c; g.fillRect(x - s / 2, y - s / 2, s, s - .5); }
const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
const WALLC = { cwall: '#c07b4f', twall: '#8790c7', plwall: '#b3c26a', thwall: '#c9739a', phwall: '#e0a55a', swall: '#e0d661', door: '#7d86b3', scwall: '#857b6f' };
const CRAFT = { gpress: 'press', mpress: 'press', plastcomp: 'press', sporepress: 'press', pulver: 'spin', centrifuge: 'spin', separator: 'spin', disass: 'spin', cryomix: 'spin', wextract: 'well', oilext: 'well', cultivator: 'grow' };
const TLOOK = {     // torony feje: [szélesség, hossz, csövek, csőhossz, csőszélesség]
  duo: [5.2, 5, 2, 4.5, 1], scatter: [10, 9, 2, 6, 2], scorch: [5, 5, 1, 3.5, 2.2], hail: [5.6, 5, 1, 4, 3], wave: [9, 9, 1, 5, 3.4], swarmer: [10, 10, 0, 0, 0], salvo: [10, 9, 4, 6, 1.4],
  tsunami: [15, 14, 2, 8, 3.6], fuse: [16, 12, 3, 6, 3.2], ripple: [16, 14, 4, 7, 2.6], cyclone: [15, 14, 3, 9, 2.4], foreshadow: [14, 18, 1, 20, 3.4], spectre: [20, 18, 2, 14, 4.2], meltdown: [16, 20, 1, 12, 6], segment: [9, 8, 1, 4, 2],
};

/* ---------- épületek ---------- */
function drawB(g, W, b, t) {
  const B = b.B, s = B.s * TS, x = b.x * TS, y = b.y * TS, cx = x + s / 2, cy = y + s / 2, id = b.t;
  const liqFill = (c, a) => { g.fillStyle = c; g.globalAlpha = a; };
  switch (B.type) {
    case 'conveyor': case 'sconv': {
      g.save(); g.translate(cx, cy); g.rotate(b.rot * Math.PI / 2);
      g.fillStyle = '#2c2d33'; g.fillRect(-4, -4, 8, 8);
      g.fillStyle = id === 'titancon' ? '#7c86b8' : id === 'plastcon' ? '#a9b860' : id === 'armorcon' ? '#55586a' : '#77798a'; g.fillRect(-4, -4, 8, 1.2); g.fillRect(-4, 2.8, 8, 1.2);
      if (id === 'armorcon') { g.fillStyle = '#a9b860'; g.fillRect(-4, -4, 8, .5); g.fillRect(-4, 3.5, 8, .5); }
      g.fillStyle = '#3f4048'; const off = (t * (B.mv || .07) * 4) % 2;
      if (B.type === 'sconv') { g.fillRect(-3.4, -2.6, 6.8, 5.2); g.fillStyle = '#2c2d33'; g.beginPath(); g.moveTo(2.4, 0); g.lineTo(.4, -1.8); g.lineTo(.4, 1.8); g.fill(); }
      else for (let k = -4 + off; k < 4; k += 2) g.fillRect(k, -2.6, .7, 5.2);
      g.restore(); break;
    }
    case 'junction': panel(g, x, y, s, '#686a76'); g.fillStyle = '#3a3b42'; g.fillRect(x + 3.3, y + 1, 1.4, 6); g.fillRect(x + 1, y + 3.3, 6, 1.4); break;
    case 'router': panel(g, x, y, s, '#686a76'); g.fillStyle = '#3a3b42'; g.fillRect(x + s * .25, y + s * .25, s / 2, s / 2); g.fillStyle = b.buf ? ITEMS[b.buf].c : '#ffb347'; g.fillRect(cx - s / 8, cy - s / 8, s / 4, s / 4); break;
    case 'sorter': panel(g, x, y, s, B.inv ? '#585a66' : '#686a76'); g.fillStyle = b.cfg ? ITEMS[b.cfg].c : '#2c2d33'; g.fillRect(x + 2, y + 2, 4, 4); if (B.inv) { g.strokeStyle = '#2c2d33'; g.lineWidth = .8; g.strokeRect(x + 2.4, y + 2.4, 3.2, 3.2); } break;
    case 'overflow': panel(g, x, y, s, '#686a76'); g.fillStyle = B.inv ? '#6ab0ff' : '#ffb347'; g.fillRect(x + 3.3, y + 1.5, 1.4, 5); g.fillRect(x + 1.5, y + 3.3, 5, 1.4); g.fillStyle = '#3a3b42'; g.fillRect(x + 3.3, y + 3.3, 1.4, 1.4); break;
    case 'bridge': case 'lbridge': { const ph = !!B.power, lq = B.type === 'lbridge'; g.fillStyle = '#3a3b42'; g.fillRect(x + .5, y + .5, 7, 7); g.fillStyle = ph ? '#c9a15e' : lq ? '#8590a8' : '#7d7f8c'; g.fillRect(x + 1.2, y + 1.2, 5.6, 5.6); g.fillStyle = lq && b.lq > .1 ? LIQUIDS[b.lt].c : '#2c2d33'; g.fillRect(x + 2.5, y + 2.5, 3, 3); break; }
    case 'unloader': panel(g, x, y, s, '#6b7386'); g.fillStyle = b.cfg ? ITEMS[b.cfg].c : '#c9cbd4'; g.fillRect(x + 2.5, y + 2.5, 3, 3); break;
    case 'driver': panel(g, x, y, s, '#62677a'); g.save(); g.translate(cx, cy); g.rotate(b.ang || 0); g.fillStyle = '#8b8d99'; g.fillRect(-6, -5, 12, 10); g.fillStyle = '#4a4c57'; g.fillRect(2, -3, 9, 6); g.fillStyle = b.ps > .5 ? '#ffd37f' : '#555'; g.fillRect(-4, -1.5, 5, 3); g.restore(); break;
    case 'drill': {
      panel(g, x, y, s, { mdrill: '#6e7080', pdrill: '#717a90', ldrill: '#7a7590', bdrill: '#8a6d6d' }[id]);
      g.fillStyle = '#34353c'; circ(g, cx, cy, s * .32);
      g.fillStyle = b.dItem ? ITEMS[b.dItem].c : '#555'; g.globalAlpha = .55 + .45 * b.work; circ(g, cx, cy, s * .18); g.globalAlpha = 1;
      g.save(); g.translate(cx, cy); g.rotate(b.rotA || 0); g.fillStyle = '#9b9dab'; const arms = id === 'bdrill' ? 4 : 3; for (let k = 0; k < arms; k++) { g.rotate(Math.PI * 2 / arms); g.fillRect(-.6, -s * .32, 1.2, s * .2); } g.restore();
      if (b.lq > 1) { g.fillStyle = LIQUIDS.water.c; g.fillRect(x + 1.5, y + 1.5, 1.5, 1.5); }
      break;
    }
    case 'pump': panel(g, x, y, s, '#5d6b85'); g.fillStyle = '#2c2d33'; circ(g, cx, cy, s * .34); if (b.pLiq) { liqFill(LIQUIDS[b.pLiq].c, .5 + .5 * Math.min(1, b.oq / B.lcap)); circ(g, cx, cy, s * .26); g.globalAlpha = 1; } g.save(); g.translate(cx, cy); g.rotate(t * .06 * (b.work || 0)); g.fillStyle = '#aab3c9'; g.fillRect(-s * .3, -.5, s * .6, 1); g.fillRect(-.5, -s * .3, 1, s * .6); g.restore(); break;
    case 'conduit': {
      g.save(); g.translate(cx, cy); g.rotate(b.rot * Math.PI / 2);
      g.fillStyle = id === 'plconduit' ? '#4f5263' : id === 'pconduit' ? '#77819f' : '#8a8f9e'; g.fillRect(-4, -2.6, 8, 5.2); g.fillStyle = '#23242a'; g.fillRect(-4, -1.6, 8, 3.2);
      if (b.lq > .05) { liqFill(LIQUIDS[b.lt].c, Math.min(1, .35 + b.lq / B.lcap)); g.fillRect(-4, -1.6, 8, 3.2); g.globalAlpha = 1; }
      g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(1.6, 0); g.lineTo(.2, -1); g.lineTo(.2, 1); g.fill();
      g.restore(); break;
    }
    case 'lrouter': panel(g, x, y, s, '#77819f'); g.fillStyle = '#23242a'; g.fillRect(x + s * .2, y + s * .2, s * .6, s * .6); if (b.lq > .05) { const f = Math.min(1, b.lq / B.lcap); liqFill(LIQUIDS[b.lt].c, 1); g.fillRect(x + s * .2, y + s * .2 + s * .6 * (1 - f), s * .6, s * .6 * f); } break;
    case 'ljunction': panel(g, x, y, s, '#77819f'); g.fillStyle = '#23242a'; g.fillRect(x + 3, y + 1, 2, 6); g.fillRect(x + 1, y + 3, 6, 2); break;
    case 'crafter': {
      const look = CRAFT[id] || 'furn', oc = B.out ? ITEMS[Object.keys(B.out)[0]].c : B.outL ? LIQUIDS[B.outL[0]].c : B.sep ? '#ffa166' : '#888';
      panel(g, x, y, s, look === 'well' || look === 'grow' ? '#5f6f6a' : look === 'press' ? '#5c6170' : look === 'spin' ? '#666a78' : '#6a5a50');
      if (look === 'press') { const p = Math.abs(Math.sin(t * .08)) * b.work * s * .12; g.fillStyle = '#3a3c44'; g.fillRect(x + 2, y + 2 + p, s - 4, s * .2); g.fillRect(x + 2, y + s - 2 - s * .2 - p, s - 4, s * .2); g.fillStyle = oc; g.fillRect(cx - s * .1, cy - s * .1, s * .2, s * .2); }
      else if (look === 'spin') { g.fillStyle = '#2a2c33'; circ(g, cx, cy, s * .34); g.save(); g.translate(cx, cy); g.rotate(t * .1 * b.work); g.fillStyle = oc; g.fillRect(-s * .3, -.7, s * .6, 1.4); g.fillRect(-.7, -s * .3, 1.4, s * .6); g.restore(); }
      else if (look === 'well') { g.fillStyle = '#2a2c33'; circ(g, cx, cy, s * .36); liqFill(oc, .4 + .6 * Math.min(1, b.oq / (B.lcap || 10))); circ(g, cx, cy, s * .26); g.globalAlpha = 1; g.fillStyle = '#9ba3b5'; circ(g, cx, cy, s * (.08 + .04 * Math.sin(t * .1) * b.work)); }
      else if (look === 'grow') { g.fillStyle = '#263329'; g.fillRect(x + 2.5, y + 2.5, s - 5, s - 5); g.fillStyle = oc; for (let k = 0; k < 4; k++) { const r = (b.prog + k / 4) % 1; circ(g, x + 4 + (k % 2) * (s - 8), y + 4 + (k >> 1) * (s - 8), .6 + r * 1.6 * b.work); } }
      else { g.fillStyle = '#2a2420'; g.fillRect(x + s * .2, y + s * .2, s * .6, s * .6); g.globalAlpha = .3 + .7 * b.work * (.7 + .3 * Math.sin(t * .2)); g.fillStyle = oc; g.fillRect(x + s * .26, y + s * .26, s * .48, s * .48); g.globalAlpha = 1; }
      break;
    }
    case 'incinerator': panel(g, x, y, s, '#5a4f4f'); g.fillStyle = `rgba(255,${120 + 60 * Math.sin(t * .3)},60,${b.ps > .5 ? 1 : .2})`; g.fillRect(x + 2.5, y + 2.5, 3, 3); break;
    case 'storage': panel(g, x, y, s, id === 'vault' ? '#8e7f9c' : '#7c8296'); g.fillStyle = '#545868'; g.fillRect(x + 2, cy - .5, s - 4, 1); g.fillRect(cx - .5, y + 2, 1, s - 4); break;
    case 'launchpad': panel(g, x, y, s, '#6a6f7e'); g.fillStyle = '#2c2d33'; circ(g, cx, cy, s * .36); g.fillStyle = '#ffd37f'; g.globalAlpha = .3 + .7 * (b.prog / B.time); circ(g, cx, cy, s * .22); g.globalAlpha = 1; break;
    case 'generator': {
      const m = B.mode;
      if (m === 'solar') { g.fillStyle = '#26314a'; g.fillRect(x, y, s, s); g.fillStyle = '#3d5d94'; for (let yy = 0; yy < B.s * 2; yy++) for (let xx = 0; xx < B.s * 2; xx++) g.fillRect(x + .6 + xx * 4, y + .6 + yy * 4, 3, 3); break; }
      panel(g, x, y, s, m === 'thermal' ? '#75584a' : m === 'rtg' ? '#5f6a5c' : m === 'reactor' ? '#5c6a62' : m === 'impact' ? '#5a5f78' : '#6a5f5a');
      g.fillStyle = '#2a2420'; circ(g, cx, cy, s * .32);
      if (m === 'reactor') { g.fillStyle = `rgb(${Math.round(120 + 135 * b.heat)},${Math.round(200 - 150 * b.heat)},${Math.round(160 - 120 * b.heat)})`; g.globalAlpha = .4 + .6 * Math.min(1, (b.items.thorium || 0) / 30); circ(g, cx, cy, s * .24); g.globalAlpha = 1; }
      else if (m === 'impact') { g.strokeStyle = `rgba(160,200,255,${.2 + .8 * b.warm})`; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, s * .26, t * .1 * b.warm, t * .1 * b.warm + 5); g.stroke(); g.fillStyle = `rgba(255,255,255,${b.warm})`; circ(g, cx, cy, s * .1); }
      else if (b.work > .05) { g.fillStyle = m === 'rtg' ? `rgba(160,255,170,${b.work})` : m === 'item' ? `rgba(140,200,255,${b.work})` : `rgba(255,${150 + 60 * Math.sin(t * .4)},70,${b.work})`; circ(g, cx, cy, s * .22); }
      break;
    }
    case 'node': { const r = id === 'surgetower' ? s * .3 : s * .28; g.fillStyle = '#3a3b42'; g.fillRect(cx - r - 1, cy - r - 1, r * 2 + 2, r * 2 + 2); g.fillStyle = id === 'surgetower' ? '#b5ad55' : '#8e909c'; g.fillRect(cx - r, cy - r, r * 2, r * 2); g.fillStyle = b.ps > 0 || (b.g && b.g.prod > 0) ? '#ffd37f' : '#555'; g.fillRect(cx - 1, cy - 1, 2, 2); break; }
    case 'diode': panel(g, x, y, s, '#6e7080'); g.save(); g.translate(cx, cy); g.rotate(b.rot * Math.PI / 2); g.fillStyle = '#ffd37f'; g.beginPath(); g.moveTo(2.5, 0); g.lineTo(-1.5, -2.2); g.lineTo(-1.5, 2.2); g.fill(); g.restore(); break;
    case 'battery': panel(g, x, y, s, '#6e7080'); g.fillStyle = '#2c2d33'; g.fillRect(x + s * .25, y + s * .2, s * .5, s * .6); g.fillStyle = '#ffd37f'; { const f = b.pw / B.capP; g.fillRect(x + s * .31, y + s * .25 + s * .5 * (1 - f), s * .38, s * .5 * f); } break;
    case 'wall': {
      const col = WALLC[id.replace(/[LHG]$/, '')] || '#888';
      if (B.door && b.open) { g.fillStyle = '#23242a'; g.fillRect(x, y, s, s); g.fillStyle = col; g.fillRect(x, y, s, 1.2); g.fillRect(x, y + s - 1.2, s, 1.2); break; }
      panel(g, x, y, s, col); g.fillStyle = shade(col, -.25);
      if (B.door) { g.fillRect(cx - .4, y + 1, .8, s - 2); }
      else for (let k = 1; k < B.s; k++) { g.fillRect(x + k * TS - .3, y + 1, .6, s - 2); g.fillRect(x + 1, y + k * TS - .3, s - 2, .6); }
      break;
    }
    case 'mender': panel(g, x, y, s, '#62706a'); g.fillStyle = `rgba(132,244,145,${.4 + .6 * b.ps * (b.prog / B.reload)})`; g.fillRect(cx - s * .09, cy - s * .28, s * .18, s * .56); g.fillRect(cx - s * .28, cy - s * .09, s * .56, s * .18); break;
    case 'overdrive': panel(g, x, y, s, '#74685a'); g.fillStyle = `rgba(255,170,90,${.35 + .65 * (b.work || 0)})`; for (let k = 0; k < 2; k++) { const oy = cy - s * .2 + k * s * .22; g.beginPath(); g.moveTo(cx - s * .22, oy + s * .14); g.lineTo(cx, oy); g.lineTo(cx + s * .22, oy + s * .14); g.lineTo(cx, oy + s * .07); g.fill(); } break;
    case 'shield': panel(g, x, y, s, '#5a6a7e'); g.fillStyle = b.broken ? '#7a3a3a' : `rgba(150,200,255,${.4 + .6 * b.ps})`; g.beginPath(); for (let k = 0; k < 6; k++) g.lineTo(cx + Math.cos(k * Math.PI / 3) * s * .28, cy + Math.sin(k * Math.PI / 3) * s * .28); g.fill(); break;
    case 'mine': g.fillStyle = 'rgba(40,42,50,.8)'; g.fillRect(x + 1.5, y + 1.5, 5, 5); g.fillStyle = b.cd > 0 ? '#555' : '#a9d8ff'; g.fillRect(x + 3.2, y + 3.2, 1.6, 1.6); break;
    case 'factory': case 'recon': {
      panel(g, x, y, s, B.type === 'recon' ? '#655e78' : '#5e6474'); g.fillStyle = '#2c2d33'; g.fillRect(x + 3, y + 3, s - 6, s - 6);
      const ut = B.type === 'recon' ? (b.pay ? B.up[b.pay] : null) : B.plans[b.cfg || 0];
      if (ut) { g.save(); g.beginPath(); g.rect(x + 3, y + 3 + (s - 6) * (1 - b.prog), s - 6, (s - 6) * b.prog); g.clip(); drawUnitShape(g, ut, PLAYER, cx, cy, -Math.PI / 2, 0, Math.min(1, (s - 8) / (UNITS[ut].r * 2.4))); g.restore(); if (b.pay) { g.globalAlpha = .35; drawUnitShape(g, b.pay, PLAYER, cx, cy, -Math.PI / 2, 0, Math.min(1, (s - 8) / (UNITS[b.pay].r * 2.4))); g.globalAlpha = 1; } }
      g.fillStyle = TEAM[PLAYER]; g.fillRect(cx + DX[b.rot] * (s / 2 - 1) - (DX[b.rot] ? .5 : 3), cy + DY[b.rot] * (s / 2 - 1) - (DY[b.rot] ? .5 : 3), DX[b.rot] ? 1 : 6, DY[b.rot] ? 1 : 6);
      break;
    }
    case 'repair': panel(g, x, y, s, '#62706a'); g.save(); g.translate(cx, cy); g.rotate(b.ang || 0); g.fillStyle = '#8b8d99'; g.fillRect(-s * .2, -s * .2, s * .4, s * .4); g.fillStyle = '#84f491'; g.fillRect(0, -.6, s * .4, 1.2); g.restore(); break;
    case 'core': {
      panel(g, x, y, s, ['#5e6170', '#646a7c', '#6b6a82'][B.tier - 1]); g.fillStyle = '#3a3b42'; g.fillRect(x + 4, y + 4, s - 8, s - 8);
      g.fillStyle = TEAM[PLAYER]; for (const [ax, ay] of [[0, 0], [1, 0], [0, 1], [1, 1]]) g.fillRect(x + 1.5 + ax * (s - 6), y + 1.5 + ay * (s - 6), 3, 3);
      g.save(); g.translate(cx, cy); g.rotate(Math.PI / 6); g.fillStyle = '#ffb347'; g.beginPath(); for (let k = 0; k < 6; k++) g.lineTo(Math.cos(k * Math.PI / 3) * s * .19, Math.sin(k * Math.PI / 3) * s * .19); g.fill(); g.restore();
      g.fillStyle = `rgba(255,220,150,${.4 + .2 * Math.sin(t * .05)})`; g.fillRect(cx - 1.5, cy - 1.5, 3, 3);
      break;
    }
    case 'turret': drawTurret(g, b, cx, cy, s, t); break;
  }
  if (b.hit > 0) { g.fillStyle = `rgba(255,255,255,${b.hit / 16})`; g.fillRect(x, y, s, s); }
  if (b.heal > 0) { g.fillStyle = `rgba(132,244,145,${b.heal / 24})`; g.fillRect(x, y, s, s); b.heal--; }
  if (W && b.odT > W.tick) { g.fillStyle = 'rgba(255,170,90,.12)'; g.fillRect(x, y, s, s); }
}
function drawTurret(g, b, cx, cy, s, t) {
  const B = b.B, id = b.t, rec = (b.heat || 0) * 1.2, am = b.ammo && b.ammo[b.ammo.length - 1];
  panel(g, cx - s / 2, cy - s / 2, s, '#5f616d');
  g.save(); g.translate(cx, cy); g.rotate((b.ang ?? -Math.PI / 2) + Math.PI / 2);
  const L = TLOOK[id];
  if (id === 'arc') { g.fillStyle = '#8b8d99'; circ(g, 0, 0, 2.8); g.fillStyle = '#a9d8ff'; g.fillRect(-.7, -4.5, 1.4, 3); }
  else if (id === 'lancet') { g.fillStyle = '#8b8d99'; g.beginPath(); g.moveTo(0, -11 + rec); g.lineTo(4.5, 3); g.lineTo(-4.5, 3); g.fill(); g.fillStyle = `rgba(169,216,255,${.3 + .7 * Math.max(b.chg ? b.chg / B.laser.charge : 0, 1 - Math.min(1, (b.rl || 0) / B.reload))})`; g.fillRect(-1, -6, 2, 6); }
  else if (id === 'parallax') { g.fillStyle = '#8b8d99'; circ(g, 0, 0, 5); g.fillStyle = '#3a3b42'; circ(g, 0, -1, 3.2); g.fillStyle = b.beam ? '#bf92f9' : '#6f6a8a'; circ(g, 0, -1.5, 1.6); }
  else if (L) {
    const [hw, hl, nb, bl, bw] = L; g.fillStyle = '#6b6d79';
    for (let k = 0; k < nb; k++) { const bx = nb === 1 ? 0 : (k / (nb - 1) - .5) * (hw - bw - 1); g.fillRect(bx - bw / 2, -hl / 2 - bl + rec * (B.alt ? ((k % 2 ? 1 : -1) === b.side ? 1 : 0) : 1), bw, bl + 1); }
    g.fillStyle = id === 'meltdown' || id === 'foreshadow' ? '#7f8496' : '#8b8d99'; g.fillRect(-hw / 2, -hl / 2, hw, hl);
    g.fillStyle = '#5a5c66'; g.fillRect(-hw / 2, hl / 2 - 1.4, hw, 1);
    if (id === 'swarmer') { g.fillStyle = '#3a3b42'; for (let k = 0; k < 4; k++) g.fillRect(-3.5 + (k % 2) * 4.4, -3.8 + (k >> 1) * 4.2, 2.6, 2.6); }
    if (B.lammo && b.lq > .2) { g.fillStyle = LIQUIDS[b.lt].c; g.fillRect(-hw * .25, -hl * .2, hw * .5, hl * .45); }
    else if (am) { g.fillStyle = ITEMS[am.it].c; g.fillRect(-hw * .16, hl * .05, hw * .32, hl * .28); }
    if (id === 'meltdown') { g.fillStyle = `rgba(255,150,90,${b.beamT > 0 ? 1 : .25})`; g.fillRect(-1.5, -hl / 2 - bl, 3, bl); }
    if (id === 'foreshadow') { g.fillStyle = `rgba(243,233,121,${1 - Math.min(1, (b.rl || 0) / B.reload)})`; g.fillRect(-.8, -hl / 2 - bl, 1.6, bl + 6); }
  }
  if (b.heat > 0 && !B.power) { g.fillStyle = `rgba(255,${120 + 80 * (1 - b.heat)},80,${b.heat * .8})`; g.fillRect(-2, -s / 2 - 1, 4, 2); }
  g.restore();
}

/* ---------- egységek ---------- */
const SUPLOOK = new Set(['nova', 'pulsar', 'quasar', 'vela', 'corvus']);
function drawUnitShape(g, t, team, x, y, a, walk, sc = 1) {
  const U = UNITS[t], tc = TEAM[team], r = U.r * sc, md = '#6b6d79', dk = '#4a4b55', T = U.tier;
  g.save(); g.translate(x, y); g.rotate(a);
  if (U.core) { g.fillStyle = '#5b5d68'; g.beginPath(); g.moveTo(r * 1.2, 0); g.lineTo(-r * .8, r * .9); g.lineTo(-r * .4, 0); g.lineTo(-r * .8, -r * .9); g.fill(); g.fillStyle = tc; g.beginPath(); g.moveTo(r * .9, 0); g.lineTo(-r * .3, r * .45); g.lineTo(-r * .3, -r * .45); g.fill(); if (T > 1) { g.fillStyle = '#84f491'; g.fillRect(-r * .7, -r * .15, r * .35, r * .3); } }
  else if (U.fam === 'legs') {
    const n = T >= 5 ? 8 : T >= 3 ? 6 : 4; g.strokeStyle = dk; g.lineWidth = Math.max(.7, r * .16);
    for (let k = 0; k < n; k++) { const side = k % 2 ? 1 : -1, f = (Math.floor(k / 2) + .5) / (n / 2) - .5, sw = Math.sin(walk * .25 + k * 1.7) * r * .25, bx = f * r * 1.5, ex = bx + f * r * 1.2 + sw, ey = side * r * 1.75; g.beginPath(); g.moveTo(bx, side * r * .4); g.lineTo((bx + ex) / 2, side * r * 1.25); g.lineTo(ex, ey); g.stroke(); }
    g.fillStyle = t === 'crawler' ? tc : SUPLOOK.has(t) ? '#5f7a72' : '#5d5370'; g.beginPath(); g.ellipse(0, 0, r, r * .78, 0, 0, 7); g.fill();
    g.fillStyle = SUPLOOK.has(t) ? '#84f491' : '#bf92f9'; g.fillRect(r * .3, -r * .18, r * .5, r * .36); g.fillStyle = tc; circ(g, -r * .25, 0, r * .32);
  }
  else if (U.fam === 'mech') {
    const sw = Math.sin(walk * .35) * r * .55; g.fillStyle = '#3a3b42'; g.fillRect(-r * .4 + sw, -r * .95, r * .8, r * .4); g.fillRect(-r * .4 - sw, r * .55, r * .8, r * .4);
    if (t === 'crawler') { g.fillStyle = dk; for (let k = 0; k < 6; k++) { const aa = k * Math.PI / 3 + walk * .2; g.fillRect(Math.cos(aa) * r * .9 - .6, Math.sin(aa) * r * .9 - .6, 1.2, 1.2); } g.fillStyle = tc; circ(g, 0, 0, r * .75); }
    else if (SUPLOOK.has(t)) { g.fillStyle = '#5f7a72'; circ(g, 0, 0, r * .92); g.fillStyle = tc; g.fillRect(-r * .25, -r * .5, r * .8, r); g.fillStyle = '#84f491'; g.fillRect(r * .45, -r * .16, r * .75, r * .32); if (T >= 3) { g.strokeStyle = '#84f491'; g.lineWidth = .6; g.beginPath(); g.arc(0, 0, r * .7, 0, 7); g.stroke(); } }
    else { g.fillStyle = md; g.fillRect(-r * .8, -r * .8, r * 1.6, r * 1.6); g.fillStyle = tc; g.fillRect(-r * .45, -r * .45, r * .9, r * .9); g.fillStyle = dk; const gl = .8 + T * .15; g.fillRect(r * .2, -r * .98, r * gl, r * .36); g.fillRect(r * .2, r * .62, r * gl, r * .36); if (T >= 4) { g.fillRect(-r * .2, -r * .2, r * 1.3, r * .4); g.fillStyle = '#ffb347'; g.fillRect(-r * .7, -r * .7, r * .3, r * 1.4); } }
  }
  else if (U.fam === 'air') {
    g.fillStyle = '#5b5d68'; const wspan = 1 + (T - 1) * .12;
    g.beginPath(); g.moveTo(r * 1.25, 0); g.lineTo(r * .1, r * .45); g.lineTo(-r * .95, r * wspan); g.lineTo(-r * .55, 0); g.lineTo(-r * .95, -r * wspan); g.lineTo(r * .1, -r * .45); g.fill();
    if (T >= 3) { g.fillStyle = dk; g.fillRect(-r * .5, -r * .75, r * .9, r * .22); g.fillRect(-r * .5, r * .53, r * .9, r * .22); }
    if (T >= 4) { g.fillStyle = md; g.fillRect(-r * .3, -r * .32, r * 1.1, r * .64); }
    g.fillStyle = tc; g.fillRect(-r * .25, -r * .2, r * .8, r * .4);
  }
  else {
    g.fillStyle = '#5f7a72'; circ(g, 0, 0, r); g.fillStyle = '#4a5f59'; if (T >= 3) for (let k = 0; k < 4; k++) circ(g, Math.cos(k * 1.571 + .785) * r * .85, Math.sin(k * 1.571 + .785) * r * .85, r * .32);
    g.fillStyle = tc; circ(g, r * .15, 0, r * .45); g.fillStyle = '#84f491'; g.fillRect(r * .5, -r * .12, r * .4, r * .24);
  }
  g.restore();
}

/* ---------- fő rajzolás ---------- */
export function render(g, W, R) {
  const { cam, cw, ch, t, ter, ui } = R, z = cam.z;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#060607'; g.fillRect(0, 0, cw, ch);
  const ox = cw / 2 - cam.x * z, oy = ch / 2 - cam.y * z;
  const vx0 = cam.x - cw / 2 / z, vy0 = cam.y - ch / 2 / z, vx1 = cam.x + cw / 2 / z, vy1 = cam.y + ch / 2 / z, cs = CH * TS;
  ter.update(); g.imageSmoothingEnabled = z < 2;
  for (let cy = Math.max(0, Math.floor(vy0 / cs)); cy <= Math.min(Math.ceil(W.h / CH) - 1, Math.floor(vy1 / cs)); cy++) for (let cx = Math.max(0, Math.floor(vx0 / cs)); cx <= Math.min(Math.ceil(W.w / CH) - 1, Math.floor(vx1 / cs)); cx++) {
    const X0 = Math.round(cx * cs * z + ox), Y0 = Math.round(cy * cs * z + oy), X1 = Math.round((cx + 1) * cs * z + ox), Y1 = Math.round((cy + 1) * cs * z + oy);
    g.drawImage(ter.chunk(cx, cy), X0, Y0, X1 - X0, Y1 - Y0);
  }
  g.imageSmoothingEnabled = false; g.setTransform(z, 0, 0, z, ox, oy);
  for (const f of W.fx) if (f.k === 'rubble') { g.fillStyle = `rgba(20,18,16,${.45 * f.life / f.max})`; g.fillRect(f.x * TS + 1, f.y * TS + 1, f.s * TS - 2, f.s * TS - 2); }
  const vb = [], flat = [];
  for (const b of W.blds) if ((b.x + b.B.s) * TS >= vx0 && b.x * TS <= vx1 && (b.y + b.B.s) * TS >= vy0 && b.y * TS <= vy1) (b.cv || b.B.type === 'sconv' || b.B.type === 'conduit' ? flat : vb).push(b);
  g.fillStyle = 'rgba(0,0,0,.25)'; for (const b of vb) if (b.B.type !== 'mine') g.fillRect(b.x * TS + 1, b.y * TS + 1.5, b.B.s * TS, b.B.s * TS);
  for (const b of flat) drawB(g, W, b, t);
  for (const b of flat) {
    if (b.cv) for (const e of b.cv) { const p = e.p - .5; itemSq(g, e.it, (b.x + .5 + DX[b.rot] * p) * TS, (b.y + .5 + DY[b.rot] * p) * TS); }
    else if (b.st) { const p = b.cd > 0 ? -b.cd / 15 : 0; itemSq(g, b.st.it, (b.x + .5 + DX[b.rot] * p) * TS, (b.y + .5 + DY[b.rot] * p) * TS, 3 + b.st.n * .22); }
  }
  for (const b of vb) drawB(g, W, b, t);
  for (const b of vb) {
    if ((b.B.type === 'bridge' || b.B.type === 'lbridge') && b.link >= 0) { const o = W.bt[b.link]; if (!o) continue; const ax = (b.x + .5) * TS, ay = (b.y + .5) * TS, bx = (o.x + .5) * TS, by = (o.y + .5) * TS, lq = b.B.type === 'lbridge'; g.strokeStyle = b.B.power ? 'rgba(244,186,110,.7)' : lq ? 'rgba(140,155,190,.75)' : 'rgba(160,165,185,.7)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); if (lq && b.lq > .1) { g.strokeStyle = LIQUIDS[b.lt].c; g.lineWidth = 1; g.stroke(); } else if (!lq && b.buf.length) { const f = (t % 30) / 30; itemSq(g, b.buf[0], ax + (bx - ax) * f, ay + (by - ay) * f, 2.6); } }
    if (b.B.tractor && b.beam && !b.beam.dead) { const c = W.center(b); g.strokeStyle = 'rgba(191,146,249,.8)'; g.lineWidth = 1.4 + Math.sin(t * .4) * .4; g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(b.beam.x, b.beam.y); g.stroke(); }
    if (b.beamT > 0 && b.bx != null) { const c = W.center(b); g.strokeStyle = '#ff9a5a'; g.lineWidth = 5 + Math.sin(t * .6); g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(b.bx, b.by); g.stroke(); g.strokeStyle = '#fff3d0'; g.lineWidth = 2; g.stroke(); }
    if (b.B.type === 'repair' && b.tgt && !b.tgt.dead && b.ps > .1) { const c = W.center(b); g.strokeStyle = 'rgba(132,244,145,.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(b.tgt.x, b.tgt.y); g.stroke(); }
  }
  g.lineWidth = .9;
  for (const b of W.blds) if (b.links) for (const o of b.links) { const a = W.center(b), c = W.center(o); if (Math.max(a.x, c.x) < vx0 || Math.min(a.x, c.x) > vx1 || Math.max(a.y, c.y) < vy0 || Math.min(a.y, c.y) > vy1) continue; g.strokeStyle = b.g && b.g.sat > 0 && b.g.prod + b.g.stored > 0 ? 'rgba(255,211,127,.75)' : 'rgba(180,140,90,.5)'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(c.x, c.y); g.stroke(); }
  for (const b of vb) if (b.hp < b.B.hp) { const s = b.B.s * TS; g.fillStyle = '#2a0f0f'; g.fillRect(b.x * TS + 1, (b.y + b.B.s) * TS - 1.6, s - 2, 1.2); g.fillStyle = '#ff6b5a'; g.fillRect(b.x * TS + 1, (b.y + b.B.s) * TS - 1.6, (s - 2) * Math.max(0, b.hp / b.B.hp), 1.2); }
  for (const p of W.plans) {
    const s = p.B.s * TS, x = p.x * TS, y = p.y * TS; if (x + s < vx0 || x > vx1 || y + s < vy0 || y > vy1) continue;
    if (p.brk) { g.strokeStyle = '#ff5a4d'; g.lineWidth = 1; g.strokeRect(x + .5, y + .5, s - 1, s - 1); g.fillStyle = `rgba(255,90,77,${.15 + .3 * p.prog})`; g.fillRect(x, y, s, s * p.prog); continue; }
    g.globalAlpha = .38; drawB(g, null, ghostOf(p), t); g.globalAlpha = 1;
    g.fillStyle = 'rgba(106,176,255,.35)'; g.fillRect(x, y + s * (1 - p.prog), s, s * p.prog);
    g.strokeStyle = p.stall ? '#ff5a4d' : '#6ab0ff'; g.lineWidth = .8; g.strokeRect(x + .4, y + .4, s - .8, s - .8);
  }
  for (const s of W.shields) if (s.on) { const c = W.center(s); g.fillStyle = `rgba(150,200,255,${.07 + (s.hit > 0 ? .1 : 0)})`; g.strokeStyle = `rgba(150,200,255,${.55 * (1 - s.sh / s.B.shp) + .2})`; g.lineWidth = 1; g.beginPath(); for (let k = 0; k <= 6; k++) g.lineTo(c.x + Math.cos(k * Math.PI / 3) * s.rad, c.y + Math.sin(k * Math.PI / 3) * s.rad); g.fill(); g.stroke(); }
  for (const pass of [0, 1]) for (const u of W.units) {
    if (u.dead || !!u.U.air !== !!pass) continue; const r = u.U.r;
    if (u.x < vx0 - 60 || u.x > vx1 + 60 || u.y < vy0 - 60 || u.y > vy1 + 60) continue;
    if (u.U.air) { g.fillStyle = 'rgba(0,0,0,.22)'; circ(g, u.x + 4, u.y + 6, r * .9); }
    drawUnitShape(g, u.t, u.team, u.x, u.y, u.aim != null && !u.U.air ? u.aim : u.rot, u.walk);
    if (u.U.air && Math.hypot(u.vx, u.vy) > .3) { g.fillStyle = u.team === ENEMY ? 'rgba(255,120,100,.8)' : 'rgba(255,211,127,.8)'; circ(g, u.x - Math.cos(u.rot) * r, u.y - Math.sin(u.rot) * r, 1.2 + r * .08 + Math.random() * .6); }
    for (const k in u.st) if (k !== 'od') { g.fillStyle = STATUS[k].c; g.globalAlpha = .45; circ(g, u.x, u.y, r * .8); g.globalAlpha = 1; }
    if (u.hit > 0) { g.fillStyle = `rgba(255,255,255,${u.hit / 10})`; circ(g, u.x, u.y, r); }
    if (u.sh > 0) { g.strokeStyle = 'rgba(255,211,127,.8)'; g.lineWidth = .7; g.beginPath(); g.arc(u.x, u.y, r + 1.5, 0, 7); g.stroke(); }
    if (u.ffh > 0) { g.strokeStyle = 'rgba(132,244,145,.6)'; g.fillStyle = 'rgba(132,244,145,.06)'; g.lineWidth = .8; g.beginPath(); g.arc(u.x, u.y, u.U.ab.ff[0], 0, 7); g.fill(); g.stroke(); }
    if (u.hp < u.U.hp && (u.team === ENEMY || u !== W.player)) { g.fillStyle = '#2a0f0f'; g.fillRect(u.x - r, u.y + r + 2, r * 2, 1); g.fillStyle = u.team === ENEMY ? '#ff6b5a' : '#84f491'; g.fillRect(u.x - r, u.y + r + 2, r * 2 * Math.max(0, u.hp / u.U.hp), 1); }
    if (u.beam && u.beam.x != null) { g.strokeStyle = u.team === ENEMY ? '#ff7a6a' : '#84f491'; g.lineWidth = 4; g.beginPath(); g.moveTo(u.x, u.y); g.lineTo(u.beam.x, u.beam.y); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 1.4; g.stroke(); }
    if (u.mining && u.mine >= 0) { const mx = (u.mine % W.w + .5) * TS, my = (Math.floor(u.mine / W.w) + .5) * TS, it = W.mineItem(u.mine); g.strokeStyle = it ? ITEMS[it].c : '#fff'; g.globalAlpha = .6 + .3 * Math.sin(t * .3); g.lineWidth = .8; g.beginPath(); g.moveTo(u.x, u.y); g.lineTo(mx, my); g.stroke(); g.globalAlpha = 1; g.fillStyle = g.strokeStyle; g.fillRect(mx - 1, my - 1, 2, 2); }
    if (u.stack) itemSq(g, u.stack.it, u.x - Math.cos(u.rot) * r * 1.3, u.y - Math.sin(u.rot) * r * 1.3, 2.6);
    if (u.building && !u.building.done) { const q = u.building, qx = (q.x + q.B.s / 2) * TS, qy = (q.y + q.B.s / 2) * TS; g.strokeStyle = q.brk ? 'rgba(255,90,77,.7)' : 'rgba(255,211,127,.7)'; g.lineWidth = .7; for (const k of [-1, 1]) { g.beginPath(); g.moveTo(u.x, u.y); g.lineTo(qx + k * q.B.s * 3 * Math.sin(t * .15), qy + k * q.B.s * 3 * Math.cos(t * .11)); g.stroke(); } }
  }
  for (const b of W.bullets) {
    if (b.x < vx0 - 20 || b.x > vx1 + 20 || b.y < vy0 - 30 || b.y > vy1 + 20) continue;
    if (b.k === 'art') { const f = 1 - b.life / (Math.hypot(b.tx - b.sx, b.ty - b.sy) / Math.hypot(b.vx, b.vy) || 1), hgt = Math.sin(Math.max(0, Math.min(1, f)) * Math.PI) * 14; g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(b.x - 1, b.y - 1, 2, 2); g.fillStyle = b.c; g.fillRect(b.x - 1.4, b.y - hgt - 1.4, 2.8, 2.8); continue; }
    if (b.k === 'flame') { g.fillStyle = `rgba(255,${120 + Math.random() * 100},60,${.4 + .6 * Math.min(1, b.life / 6)})`; circ(g, b.x, b.y, 1.5 + Math.max(0, 1 - b.life / 14) * 2); continue; }
    if (b.k === 'liq' || b.k === 'acid') { g.fillStyle = b.k === 'acid' ? '#ffa166' : b.c; g.globalAlpha = .8; circ(g, b.x, b.y, 1.6); g.globalAlpha = 1; continue; }
    if (b.k === 'drv') { g.fillStyle = '#ffd37f'; circ(g, b.x, b.y, 3); g.fillStyle = '#fff'; circ(g, b.x, b.y, 1.4); continue; }
    const a = Math.atan2(b.vy, b.vx), big = b.d > 40 ? 1.6 : 1; g.save(); g.translate(b.x, b.y); g.rotate(a);
    if (b.k === 'missile') { g.fillStyle = '#c9cbd4'; g.fillRect(-2.5, -.9, 4.5, 1.8); g.fillStyle = b.c; g.fillRect(-4, -.6, 1.6, 1.2); }
    else if (b.bolt) { g.fillStyle = b.c; g.fillRect(-3, -.6, 6, 1.2); }
    else { g.fillStyle = b.c; g.fillRect(-2.5 * big, -.8 * big, 4 * big, 1.6 * big); g.fillStyle = '#fff'; g.fillRect(.5, -.4 * big, 1.2 * big, .8 * big); }
    g.restore();
  }
  for (const f of W.fx) {
    const k = f.life / f.max;
    switch (f.k) {
      case 'boom': g.fillStyle = f.c; g.globalAlpha = k * .7; circ(g, f.x, f.y, f.r * (1.2 - k * .6)); g.globalAlpha = k; g.fillStyle = '#fff3d0'; circ(g, f.x, f.y, f.r * .35 * k); g.globalAlpha = 1; break;
      case 'hit': g.fillStyle = f.c; g.globalAlpha = k; for (let q = 0; q < 4; q++) { const aa = q * 1.6 + f.x; g.fillRect(f.x + Math.cos(aa) * (1 - k) * 4 - .5, f.y + Math.sin(aa) * (1 - k) * 4 - .5, 1, 1); } g.globalAlpha = 1; break;
      case 'flash': g.fillStyle = f.c; g.globalAlpha = k; circ(g, f.x, f.y, 1.5 * k + .5); g.globalAlpha = 1; break;
      case 'laser': g.strokeStyle = f.c; g.globalAlpha = k; g.lineWidth = (f.w || 3) * k; g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x2, f.y2); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = (f.w || 3) * k / 3; g.stroke(); g.globalAlpha = 1; break;
      case 'bolt': g.strokeStyle = f.c; g.globalAlpha = k; g.lineWidth = 1; g.beginPath(); f.pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.globalAlpha = 1; break;
      case 'ring': g.strokeStyle = f.c; g.globalAlpha = k; g.lineWidth = 1; g.beginPath(); g.arc(f.x, f.y, f.r * (1 - k * .5), 0, 7); g.stroke(); g.globalAlpha = 1; break;
      case 'puff': g.fillStyle = f.c; g.globalAlpha = k * .7; circ(g, f.x, f.y - (1 - k) * 6, 1.2 + (1 - k) * 2); g.globalAlpha = 1; break;
      case 'xfer': { const x = f.x + (f.x2 - f.x) * (1 - k), y = f.y + (f.y2 - f.y) * (1 - k); g.fillStyle = f.c; g.fillRect(x - 1, y - 1, 2, 2); break; }
      case 'launch': g.fillStyle = f.c; g.globalAlpha = k; circ(g, f.x, f.y - (1 - k) * 90, 3 + k * 3); g.fillRect(f.x - 1, f.y - (1 - k) * 90, 2, (1 - k) * 60); g.globalAlpha = 1; break;
    }
  }
  for (const sp of W.spawns) { g.strokeStyle = 'rgba(242,85,85,.55)'; g.lineWidth = 1; g.setLineDash([3, 3]); g.beginPath(); g.arc((sp.x + .5) * TS, (sp.y + .5) * TS, 6 * TS, 0, 7); g.stroke(); g.setLineDash([]); }
  if (W.fog) { const tx0 = Math.max(0, Math.floor(vx0 / TS) - 1), ty0 = Math.max(0, Math.floor(vy0 / TS) - 1), tx1 = Math.min(W.w, Math.ceil(vx1 / TS) + 1), ty1 = Math.min(W.h, Math.ceil(vy1 / TS) + 1); if (tx1 > tx0 && ty1 > ty0) { g.imageSmoothingEnabled = true; g.drawImage(ter.fog, tx0, ty0, tx1 - tx0, ty1 - ty0, tx0 * TS, ty0 * TS, (tx1 - tx0) * TS, (ty1 - ty0) * TS); g.imageSmoothingEnabled = false; } }
  if (ui) ui(g, z);
}
export function ghostOf(p) { const B = BLOCKS[p.t]; return { t: p.t, B, x: p.x, y: p.y, rot: p.rot || 0, cfg: p.cfg, items: {}, cv: [], ang: -Math.PI / 2, work: 0, prog: 0, rotA: 0, ammo: [], heat: 0, ps: 0, pw: 0, lq: 0, oq: 0, hp: B.hp, buf: null, links: null, side: 1, rl: 0, warm: 0, link: -1 }; }
export { drawB, drawUnitShape, panel, itemSq, shade, buildTime };

/* ---------- kisérkép ---------- */
export function minimap(c, W, ter, cam, vw, vh) {
  const g = c.getContext('2d'), sx = c.width / W.w, sy = c.height / W.h; g.imageSmoothingEnabled = sx < 1;
  g.drawImage(ter.mini, 0, 0, c.width, c.height);
  g.fillStyle = TEAM[PLAYER]; for (const b of W.blds) g.fillRect(b.x * sx, b.y * sy, Math.max(1, b.B.s * sx), Math.max(1, b.B.s * sy));
  for (const u of W.units) { if (u.dead) continue; const big = u === W.player ? 3 : Math.max(2, u.U.r * sx / 4); g.fillStyle = u.team === ENEMY ? '#ff4a3d' : u === W.player ? '#fff' : '#ffd37f'; g.fillRect(u.x / TS * sx - big / 2, u.y / TS * sy - big / 2, big, big); }
  for (const sp of W.spawns) { g.strokeStyle = '#ff4a3d'; g.lineWidth = 1; g.strokeRect(sp.x * sx - 3, sp.y * sy - 3, 6, 6); }
  if (W.fog) { g.imageSmoothingEnabled = true; g.drawImage(ter.fog, 0, 0, c.width, c.height); }
  g.strokeStyle = '#fff'; g.lineWidth = 1; g.strokeRect((cam.x - vw / 2 / cam.z) / TS * sx, (cam.y - vh / 2 / cam.z) / TS * sy, vw / cam.z / TS * sx, vh / cam.z / TS * sy);
}
