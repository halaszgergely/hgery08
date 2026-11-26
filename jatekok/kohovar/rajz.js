// Kohóvár – kirajzolás. A blokkok, egységek, anyagok és a talaj képei a Mindustry (Anuke és közreműködők, GPLv3) sprite-jai,
// a kepek/atlasz.png atlaszból; a lövedékek, hatások, köd és kisérkép kódból rajzoltak.
import { TS, ITEMS, ITEM_IDS, LIQUIDS, STATUS, FLOORS, WALLS, TREES, BLOCKS, UNITS } from './adat.js?v=202611270059';
import { FL, WL, DX, DY, PLAYER, ENEMY, buildTime } from './vilag.js?v=202611270059';
import { SN, ISN, UW, LEG, FSPR, WSPR } from './kepadat.js?v=202611270059';

const TEAM = { [PLAYER]: '#ffd37f', [ENEMY]: '#f25555', 0: '#4d4e58' };
const NX = [1, 0, -1, 0, 1, 1, -1, -1], NY = [0, 1, 0, -1, 1, -1, 1, -1];
const hash = (x, y, s = 0) => { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const rgb = c => { const n = parseInt(c.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; };
const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };

/* ---------- atlasz ---------- */
let AT = null, IMG = null; const TC = new Map();
const AV = '?a=4';   // az atlasz verziója: újracsomagolás után növelni kell, hogy a kép és a térképe együtt frissüljön
export function loadAtlas(base = 'kepek/') {
  return fetch(base + 'atlasz.json' + AV).then(r => r.json()).then(j => new Promise((ok, no) => { const im = new Image(); im.onload = () => { AT = j; IMG = im; ok(); }; im.onerror = no; im.src = base + 'atlasz.png' + AV; }));
}
export const has = n => !!(AT && AT[n]);
// modbeli sprite: külön képként kerül az atlasz mellé ([x, y, w, h, kép, url])
const PEND = [];
export function addSprite(n, png) {
  const url = URL.createObjectURL(new Blob([png], { type: 'image/png' })), im = new Image();
  PEND.push(new Promise(ok => { im.onload = () => { AT[n] = [0, 0, im.naturalWidth, im.naturalHeight, im, url]; TC.clear(); ok(); }; im.onerror = () => ok(); im.src = url; }));
}
export const spritesReady = () => Promise.all(PEND.splice(0));
// n: atlasznév; x, y: középpont világegységben; rot: radián; sx, sy: tükrözés / nyújtás; w, h: méret (alap: képpont / 4)
export function spr(g, n, x, y, rot, sx, sy, w, h, src) {
  const r = AT[n]; if (!r) return; const im = src || r[4] || IMG, ox = src ? 0 : r[0], oy = src ? 0 : r[1], W_ = w ?? r[2] / 4, H_ = h ?? r[3] / 4;
  if (!rot && sx == null) { g.drawImage(im, ox, oy, r[2], r[3], x - W_ / 2, y - H_ / 2, W_, H_); return; }
  g.save(); g.translate(x, y); if (rot) g.rotate(rot); if (sx != null) g.scale(sx, sy ?? 1); g.drawImage(im, ox, oy, r[2], r[3], -W_ / 2, -H_ / 2, W_, H_); g.restore();
}
// átszínezett sprite (mul: szorzás – a fehér részek veszik fel a színt; különben egyszínű kitöltés), gyorsítótárazva
function tint(n, col, mul) {
  const key = n + col + (mul ? 'm' : ''); let c = TC.get(key); if (c !== undefined) return c; const r = AT[n]; if (!r) { TC.set(key, null); return null; }
  c = document.createElement('canvas'); c.width = r[2]; c.height = r[3]; const x = c.getContext('2d'); x.drawImage(r[4] || IMG, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]);
  x.globalCompositeOperation = mul ? 'multiply' : 'source-in'; x.fillStyle = col; x.fillRect(0, 0, r[2], r[3]);
  if (mul) { x.globalCompositeOperation = 'destination-in'; x.drawImage(r[4] || IMG, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]); }
  TC.set(key, c); return c;
}
const sprT = (g, n, col, mul, x, y, rot, sx, sy, w, h) => { const c = tint(n, col, mul); if (c) spr(g, n, x, y, rot, sx, sy, w, h, c); };
const glow = (g, n, x, y, a, rot) => { if (a <= .02 || !AT[n]) return; g.globalAlpha = Math.min(1, a); spr(g, n, x, y, rot); g.globalAlpha = 1; };
export function itemSq(g, it, x, y, s = 5) { spr(g, 'item-' + ISN[it], x, y, 0, null, null, s, s); }

/* ---------- talaj: igény szerint rajzolt szeletek két részletességgel, kisérkép-alap, köd ---------- */
const LOD = [{ P: 4, CH: 16 }, { P: 2, CH: 32 }];
export function makeTerrain(W) {
  const w = W.w, h = W.h, N = w * h, depth = new Uint8Array(N), cache = new Map();
  const isTree = i => W.wall[i] && TREES.has(WL[W.wall[i] - 1]);
  { const q = new Int32Array(N); let qh = 0, qt = 0; for (let i = 0; i < N; i++) if (!W.wall[i] || isTree(i)) q[qt++] = i; else depth[i] = 255;
    while (qh < qt) { const i = q[qh++], d = depth[i]; if (d >= 5) continue; const x = i % w, y = (i - x) / w; for (let k = 0; k < 8; k++) { const X = x + NX[k], Y = y + NY[k]; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = Y * w + X; if (depth[j] === 255) { depth[j] = d + 1; q[qt++] = j; } } } }
  const wname = i => WSPR[WL[W.wall[i] - 1]], img = (g, n, X, Y, T) => { const r = AT[n]; if (r) g.drawImage(r[4] || IMG, r[0], r[1], r[2], r[3], X, Y, T, T); };
  const big = (x, y) => { const i = y * w + x; return x + 1 < w && y + 1 < h && depth[i] && depth[i] < 4 && W.wall[i + 1] === W.wall[i] && W.wall[i + w] === W.wall[i] && W.wall[i + w + 1] === W.wall[i] && hash(x, y, 71) < .5; };
  function tile(g, x, y, X, Y, T) {
    const i = y * w + x, d = depth[i];
    if (d > 3) { g.fillStyle = '#000'; g.fillRect(X, Y, T, T); return; }
    if (d) {
      const lx = x & ~1, ly = y & ~1, n = wname(i);
      if (big(lx, ly)) { if (x === lx && y === ly) img(g, n + '-large', X, Y, T * 2); }
      else img(g, AT[n + '1'] ? n + (1 + (hash(x, y, 5) * (AT[n + '3'] ? 3 : 2) | 0)) : n, X, Y, T);
      const wo = W.ore[i]; if (wo) img(g, 'ore-wall-' + ISN[ITEM_IDS[wo - 1]] + (1 + (hash(x, y, 31) * 3 | 0)), X, Y, T);
      return;
    }
    const [fn, fv, fp] = FSPR[FL[W.floor[i]]] || FSPR.stone;
    if (fv === 'v') {          // gőzkürtő (Mindustry SteamVent): 3×3-as sprite, a közepe az a csempe, amelynek mind a 8 szomszédja kürtő
      const f = W.floor[i], vs = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && W.floor[yy * w + xx] === f, ctr = (xx, yy) => { for (let k = 0; k < 8; k++) if (!vs(xx + NX[k], yy + NY[k])) return false; return vs(xx, yy); };
      let dx = 9, dy = 9; for (let k = -1; k < 8 && dx === 9; k++) { const ox = k < 0 ? 0 : NX[k], oy = k < 0 ? 0 : NY[k]; if (ctr(x + ox, y + oy)) { dx = -ox; dy = -oy; } }
      const [pn, pv] = FSPR[fp] || FSPR.stone; img(g, pv ? pn + (1 + (hash(x, y) * pv | 0)) : pn, X, Y, T);
      if (dx !== 9) { const r = AT[fn + '1']; if (r) g.drawImage(r[4] || IMG, r[0] + (dx + 1) * r[2] / 3, r[1] + (dy + 1) * r[3] / 3, r[2] / 3, r[3] / 3, X, Y, T, T); }
    } else if (fv === 'a') {          // autotile (Mindustry Floor.autotile): a 4×4-es lap cellája a szomszédok szerint
      const f = W.floor[i], same = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && W.floor[yy * w + xx] === f, l = same(x - 1, y), r = same(x + 1, y), u = same(x, y - 1), d = same(x, y + 1);
      const cx = l && r ? 1 : !l && !r ? 3 : !l ? 0 : 2, cy = u && d ? 1 : !u && !d ? 3 : !u ? 0 : 2;
      img(g, cx === 3 && cy !== 3 ? `${fn}-a3${cy}` : cy === 3 && cx !== 3 ? `${fn}-a${cx}3` : `${fn}-a${cx}${cy}`, X, Y, T);
    } else img(g, fv ? fn + (1 + (hash(x, y) * fv | 0)) : fn, X, Y, T);
    const o = W.ore[i]; if (o) img(g, 'ore-' + ISN[ITEM_IDS[o - 1]] + (1 + (hash(x, y, 31) * 3 | 0)), X, Y, T);
    if (y > 0 && W.wall[i - w]) { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(X, Y, T, T * .3); }
  }
  function chunk(cx, cy, lod) {
    const key = lod * 16777216 + cy * 4096 + cx; let cv = cache.get(key);
    if (cv) { cache.delete(key); cache.set(key, cv); return cv; }
    const { P, CH } = LOD[lod], T = TS * P; cv = document.createElement('canvas'); cv.width = cv.height = CH * T; const g = cv.getContext('2d'); g.imageSmoothingEnabled = P < 4; g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
    for (let y = 0; y < CH; y++) for (let x = 0; x < CH; x++) { const X = cx * CH + x, Y = cy * CH + y; if (X < w && Y < h) tile(g, X, Y, x * T, y * T, T); }
    for (let y = 0; y < CH; y++) for (let x = 0; x < CH; x++) { const X = cx * CH + x, Y = cy * CH + y; if (X >= w || Y >= h) continue; const d = depth[Y * w + X]; if (d === 2 || d === 3) { g.fillStyle = d === 2 ? 'rgba(0,0,0,.5)' : 'rgba(0,0,0,.84)'; g.fillRect(x * T, y * T, T, T); } }
    cache.set(key, cv); if (cache.size > 110) cache.delete(cache.keys().next().value);
    return cv;
  }
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

/* ---------- épületek ---------- */
const OUT_T = new Set(['drill', 'crafter', 'router', 'sorter', 'overflow', 'junction', 'bridge', 'unloader', 'driver', 'core', 'storage']);
const GLOWTOP = new Set(['smelter', 'crucible', 'kiln', 'plastcomp', 'surgesm', 'combust', 'steam', 'diffgen', 'rtg', 'mender', 'mendproj', 'overdrive', 'dome', 'forceproj', 'lamp']);
const HEADS = {}; for (const k of ['duo', 'scatter', 'salvo', 'cyclone']) HEADS[k] = SN[k] + '-preview@o';
// szalag- és csőillesztés a Mindustry szabálya szerint: [típus, függőleges tükrözés]
function blend(W, b, liquid) {
  if (!W) return [0, 1]; if (b.blV === W.ver) return b.bl;
  const feeds = d => { const o = W.tb(b.x + DX[d], b.y + DY[d]); if (!o || o === b) return false; if (liquid) return o.B.type === 'conduit' ? W.front(o) === b : !!(o.B.lmove || o.B.type === 'pump' || o.B.type === 'ljunction' || o.B.outL); const T = o.B.type; return T === 'conveyor' || T === 'sconv' ? W.front(o) === b : OUT_T.has(T); };
  const back = feeds((b.rot + 2) % 4), l = feeds((b.rot + 3) % 4), r = feeds((b.rot + 1) % 4);
  b.bl = back && l && r ? [3, 1] : l && r ? [4, 1] : r && back ? [2, 1] : l && back ? [2, -1] : r ? [1, -1] : l ? [1, 1] : [0, 1]; b.blV = W.ver; return b.bl;
}
function bridgeLine(g, W, b, t) {
  const o = b.link >= 0 && W ? W.bt[b.link] : null; if (!o) return; const n = SN[b.t], ax = (b.x + .5) * TS, ay = (b.y + .5) * TS, bx = (o.x + .5) * TS, by = (o.y + .5) * TS, a = Math.atan2(by - ay, bx - ax), L = Math.hypot(bx - ax, by - ay);
  g.globalAlpha = .8; spr(g, n + '-bridge', (ax + bx) / 2, (ay + by) / 2, a, 1, 1, L - 4, 8);
  spr(g, n + '-end', ax, ay, a - Math.PI / 2); spr(g, n + '-end', bx, by, a + Math.PI / 2);
  const k = Math.max(1, Math.round(L / TS) - 1); for (let i = 0; i < k; i++) { const f = ((i + (t * .03) % 1) / k); g.globalAlpha = .8 * Math.sin(f * Math.PI); spr(g, n + '-arrow', ax + (bx - ax) * f, ay + (by - ay) * f, a); }
  g.globalAlpha = 1;
}
function drawB(g, W, b, t) {
  const B = b.B, s = B.s * TS, x = b.x * TS, y = b.y * TS, cx = x + s / 2, cy = y + s / 2, id = b.t, n = SN[id], R = b.rot * Math.PI / 2, wk = b.work || 0;
  const liqRect = (liq, a, inset = .12) => { if (!liq || a <= .02) return; g.globalAlpha = Math.min(1, a); g.fillStyle = LIQUIDS[liq].c; g.fillRect(x + s * inset, y + s * inset, s * (1 - 2 * inset), s * (1 - 2 * inset)); g.globalAlpha = 1; };
  switch (B.type) {
    case 'conveyor': { const [bt, sy] = blend(W, b); if (B.duct) { spr(g, 'duct-bottom-' + bt, cx, cy, R, 1, sy); spr(g, `${n}-top-${bt}`, cx, cy, R, 1, sy); break; } const fr = Math.floor(t * B.mv * 8) % 4; spr(g, `${n}-${bt}-${fr}`, cx, cy, R, 1, sy); break; }
    case 'sconv': {
      const start = W && !W.nbs(b).some(o => o.B.type === 'sconv' && W.front(o) === b), nx = W && W.tb(b.x + DX[b.rot], b.y + DY[b.rot]), end = W && !(nx && nx.B.type === 'sconv');
      spr(g, n + (start ? '-1' : end ? '-2' : '-0'), cx, cy, R); for (const d of [1, 3]) { const o = W && W.tb(b.x + DX[(b.rot + d) % 4], b.y + DY[(b.rot + d) % 4]); if (!(o && o.B.type === 'sconv' && W.front(o) === b)) spr(g, n + '-edge', cx, cy, R + (d === 1 ? Math.PI / 2 : -Math.PI / 2) - Math.PI / 2); }
      break;
    }
    case 'sorter': spr(g, n, cx, cy); if (b.cfg) { g.fillStyle = ITEMS[b.cfg].c; g.fillRect(cx - 1.5, cy - 1.5, 3, 3); } break;
    case 'unloader': spr(g, n, cx, cy); sprT(g, 'unloader-center', b.cfg ? ITEMS[b.cfg].c : '#ffffff', 0, cx, cy); break;
    case 'driver': spr(g, 'mass-driver-base', cx, cy); spr(g, 'mass-driver@o', cx, cy, (b.ang || 0) + Math.PI / 2); break;
    case 'drill': spr(g, n, cx, cy); if (id === 'bdrill') glow(g, n + '-rim', cx, cy, wk * .6); spr(g, n + '-rotator', cx, cy, b.rotA || 0); spr(g, n + '-top', cx, cy); if (b.dItem && W) { g.fillStyle = ITEMS[b.dItem].c; g.fillRect(cx - 1, cy - 1, 2, 2); } break;
    case 'pump': spr(g, n, cx, cy); if (b.pLiq && b.oq > .1) { g.globalAlpha = Math.min(1, .3 + b.oq / B.lcap); sprT(g, n + '-liquid', LIQUIDS[b.pLiq].c, 0, cx, cy); g.globalAlpha = 1; } break;
    case 'conduit': {
      const [bt, sy] = blend(W, b, 1); sprT(g, 'conduit-bottom-' + bt, '#565656', 1, cx, cy, R, 1, sy);
      if (b.lq > .05) { g.globalAlpha = Math.min(1, .25 + b.lq / B.lcap); sprT(g, 'conduit-bottom-' + bt, LIQUIDS[b.lt].c, 0, cx, cy, R, 1, sy); g.globalAlpha = 1; }
      spr(g, `${n}-top-${bt}`, cx, cy, R, 1, sy); break;
    }
    case 'lrouter': spr(g, n + '-bottom', cx, cy); liqRect(b.lt, b.lq / B.lcap); spr(g, n, cx, cy); break;
    case 'diode': spr(g, n, cx, cy); spr(g, n + '-arrow', cx, cy, R); break;
    case 'router': spr(g, n, cx, cy); if (B.fwd) spr(g, n + '-top', cx, cy, R); else if (has(n + '-top')) spr(g, n + '-top', cx, cy); break;
    case 'radar': spr(g, n + '-base', cx, cy); spr(g, n, cx, cy, b.rotA || 0); glow(g, n + '-glow', cx, cy, b.ps || 0, b.rotA || 0); break;
    case 'btower': { spr(g, n + '-base', cx, cy); const p = b.tgtP, a = p ? Math.atan2((p.y + p.B.s / 2) * TS - cy, (p.x + p.B.s / 2) * TS - cx) : (b.ang || 0); b.ang = a; spr(g, n, cx, cy, a + Math.PI / 2); glow(g, n + '-glow', cx, cy, wk, a + Math.PI / 2);
      if (p) { g.strokeStyle = 'rgba(255,211,127,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, cy); g.lineTo((p.x + p.B.s / 2) * TS, (p.y + p.B.s / 2) * TS); g.stroke(); } break; }
    case 'shock': spr(g, n, cx, cy); glow(g, n + '-heat', cx, cy, 1 - (b.prog || 0) / B.reload); break;
    case 'beamdrill': {
      spr(g, n, cx, cy); if (b.lasers && wk > .02) { g.strokeStyle = `rgba(255,140,110,${.35 + .4 * wk})`; g.lineWidth = 1.2; for (const [ax, ay, bx2, by2] of b.lasers) { g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx2, by2); g.stroke(); } }
      glow(g, n + '-glow', cx, cy, wk); spr(g, n + '-top', cx, cy, R); break;
    }
    case 'wcrafter': spr(g, n, cx, cy, R); spr(g, n + '-rotator-bottom', cx, cy, t * .05 * wk); spr(g, n + '-rotator', cx, cy, t * .05 * wk); spr(g, n + '-top', cx, cy, R); break;
    case 'heater': case 'heatcond': spr(g, n, cx, cy); spr(g, n + (b.rot % 2 ? '-top2' : '-top1'), cx, cy, b.rot >= 2 ? R - Math.PI : R); glow(g, n + '-heat', cx, cy, Math.min(1, (b.hOut || 0) / (B.heatOut || 10)), R); break;
    case 'battery': spr(g, n, cx, cy); sprT(g, n + '-top', ['#f8c266', '#f9b866', '#faab66', '#fa9f67', '#fb9567'][Math.min(4, Math.floor((b.pw || 0) / B.capP * 5))], 1, cx, cy); break;
    case 'generator': {
      const m = B.mode;
      if (m === 'impact') { spr(g, n + '-bottom', cx, cy); for (let k = 0; k < 4; k++) { g.globalAlpha = b.warm * (.4 + .15 * k); spr(g, n + '-plasma-' + k, cx, cy, t * (.02 + k * .013) * (k % 2 ? 1 : -1)); } g.globalAlpha = 1; spr(g, n, cx, cy); glow(g, n + '-light', cx, cy, b.warm); break; }
      spr(g, n, cx, cy);
      if (m === 'reactor') { if (b.heat > .02) { g.fillStyle = `rgba(255,70,50,${b.heat * .6})`; g.fillRect(x + 2, y + 2, s - 4, s - 4); } spr(g, n + '-top', cx, cy); if (b.heat > .46 && Math.sin(t * .5) > 0) spr(g, n + '-lights', cx, cy); break; }
      if (has(n + '-rotator')) spr(g, n + '-rotator', cx, cy, t * .1 * wk);
      if (id === 'steam') { spr(g, n + '-turbine', cx, cy, t * .08 * wk); spr(g, n + '-turbine', cx, cy, -t * .08 * wk + .6); spr(g, n + '-cap', cx, cy); }
      if (id === 'diffgen' && b.lq > .1) { g.globalAlpha = Math.min(1, b.lq / 10); sprT(g, n + '-liquid', LIQUIDS[b.lt].c, 0, cx, cy); g.globalAlpha = 1; }
      glow(g, n + '-top', cx, cy, wk * (.75 + .25 * Math.sin(t * .3))); break;
    }
    case 'crafter': case 'incinerator': {
      const lq = B.outL ? [B.outL[0], b.oq / (B.lcap || 10)] : B.inL ? [B.inL[0], b.lq / (B.lcap || 10)] : null, bot = has(n + '-bottom'), rotN = has(n + '-spinner') ? '-spinner' : has(n + '-rotator') ? '-rotator' : has(n + '-weave') ? '-weave' : null;
      const liq = () => { if (!lq) return; if (has(n + '-liquid')) { g.globalAlpha = Math.min(1, lq[1] + (wk > .1 ? .3 : 0)); sprT(g, n + '-liquid', LIQUIDS[lq[0]].c, 0, cx, cy); g.globalAlpha = 1; } else if (bot) liqRect(lq[0], lq[1]); };
      if (bot) { spr(g, n + '-bottom', cx, cy); liq(); if (rotN) spr(g, n + rotN, cx, cy, t * .06 * wk); spr(g, n, cx, cy); }
      else { spr(g, n, cx, cy); liq(); if (rotN) spr(g, n + rotN, cx, cy, t * .07 * wk); }
      if (has(n + '-middle')) glow(g, n + '-middle', cx, cy, wk);
      if (B.rot && has(n + '-top1')) spr(g, n + (b.rot % 2 ? '-top2' : '-top1'), cx, cy, b.rot >= 2 ? R - Math.PI : R);
      if (B.heatOut && has(n + '-heat')) glow(g, n + '-heat', cx, cy, Math.min(1, (b.hOut || 0) / B.heatOut));
      if (B.heatReq && has(n + '-heat')) glow(g, n + '-heat', cx, cy, Math.min(1, (b.hIn || 0) / B.heatReq));
      if (GLOWTOP.has(id)) glow(g, n + '-top', cx, cy, wk * (.7 + .3 * Math.sin(t * .25 + b.x))); else if (has(n + '-top')) spr(g, n + '-top', cx, cy);
      if (id === 'incinerator' && b.ps > .5) { g.fillStyle = `rgba(255,${150 + 60 * Math.sin(t * .3)},70,.9)`; circ(g, cx, cy, 1.6); }
      break;
    }
    case 'wall': {
      if (B.door && b.open) { spr(g, n + '-open', cx, cy); break; }
      if (id.startsWith('scwall')) { const v = { scwall: ['scrap-wall', 5], scwallL: ['scrap-wall-large', 4], scwallH: ['scrap-wall-huge', 3] }[id]; spr(g, v ? v[0] + (1 + (hash(b.x, b.y, 3) * v[1] | 0)) : 'scrap-wall-gigantic', cx, cy); break; }
      spr(g, n, cx, cy); break;
    }
    case 'mender': case 'overdrive': case 'shield': case 'lamp':
      spr(g, n, cx, cy); if (id === 'forceproj') sprT(g, n + '-team', TEAM[b.team ?? PLAYER], 1, cx, cy);
      glow(g, n + '-top', cx, cy, B.type === 'mender' ? b.ps * (.3 + .7 * b.prog / B.reload) : B.type === 'shield' ? (b.on ? .8 : 0) : (wk || b.ps) * (.6 + .4 * Math.sin(t * .1))); break;
    case 'mine': spr(g, n, cx, cy); sprT(g, n + '-team-top', b.cd > 0 ? '#777777' : TEAM[b.team ?? PLAYER], 1, cx, cy); break;
    case 'core': case 'storage': spr(g, n, cx, cy); sprT(g, n + '-team', TEAM[b.team ?? PLAYER], 1, cx, cy); break;
    case 'launchpad': spr(g, n, cx, cy); glow(g, n + '-light', cx, cy, b.prog / B.time); break;
    case 'factory': case 'recon': {
      spr(g, n, cx, cy); const ut = B.type === 'recon' ? (b.pay ? B.up[b.pay] : null) : W ? B.plans[b.cfg || 0] : null;
      if (b.pay) { g.globalAlpha = .5; drawUnit(g, b.pay, PLAYER, cx, cy, -Math.PI / 2, 0, Math.min(1, (s - 6) / (UNITS[b.pay].r * 2.6))); g.globalAlpha = 1; }
      if (ut && b.prog > 0) { g.save(); g.beginPath(); g.rect(x, y + s * (1 - b.prog), s, s * b.prog); g.clip(); drawUnit(g, ut, PLAYER, cx, cy, -Math.PI / 2, 0, Math.min(1, (s - 6) / (UNITS[ut].r * 2.6))); g.restore(); }
      if (has(n + '-top')) spr(g, n + '-top', cx, cy);
      g.fillStyle = TEAM[PLAYER]; g.fillRect(cx + DX[b.rot] * (s / 2 - .6) - (DX[b.rot] ? .4 : 3), cy + DY[b.rot] * (s / 2 - .6) - (DY[b.rot] ? .4 : 3), DX[b.rot] ? .8 : 6, DY[b.rot] ? .8 : 6);
      break;
    }
    case 'repair': if (id === 'urepair') { spr(g, n, cx, cy); glow(g, n + '-glow', cx, cy, b.ps || 0); break; } spr(g, id === 'repairpt' ? 'repair-point-base' : 'block-2', cx, cy); spr(g, n + '@o', cx, cy, (b.ang ?? -Math.PI / 2) + Math.PI / 2); break;
    case 'turret': {
      spr(g, (B.ebase ? 'reinforced-block-' : 'block-') + B.s, cx, cy); const a = (b.ang ?? -Math.PI / 2), rec = (b.heat || 0) * (B.s > 2 ? 2 : 1), hx = cx - Math.cos(a) * rec, hy = cy - Math.sin(a) * rec, hn = HEADS[id] || (B.ebase && has(n + '-preview@o') ? n + '-preview@o' : n + '@o');
      if (B.lammo && b.lq > .2) { g.globalAlpha = Math.min(1, b.lq / B.lcap + .2); sprT(g, n + '-liquid', LIQUIDS[b.lt].c, 0, hx, hy, a + Math.PI / 2); g.globalAlpha = 1; }
      spr(g, hn, hx, hy, a + Math.PI / 2); if (B.lammo) spr(g, n + '-top', hx, hy, a + Math.PI / 2);
      if (b.heat > .05 && has(n + '-heat')) { g.globalCompositeOperation = 'lighter'; glow(g, n + '-heat', hx, hy, b.heat, a + Math.PI / 2); g.globalCompositeOperation = 'source-over'; }
      break;
    }
    default: spr(g, n, cx, cy);
  }
  if (b.hit > 0) { g.fillStyle = `rgba(255,255,255,${b.hit / 16})`; g.fillRect(x, y, s, s); }
  if (b.heal > 0) { g.fillStyle = `rgba(132,244,145,${b.heal / 24})`; g.fillRect(x, y, s, s); b.heal--; }
  if (W && b.odT > W.tick) { g.fillStyle = 'rgba(255,170,90,.12)'; g.fillRect(x, y, s, s); }
}

/* ---------- egységek (a sprite-ok felfelé néznek) ---------- */
const seg = (g, n, x1, y1, x2, y2) => { const r = AT[n]; if (!r) return; g.save(); g.translate(x1, y1); g.rotate(Math.atan2(y2 - y1, x2 - x1)); g.drawImage(r[4] || IMG, r[0], r[1], r[2], r[3], 0, -r[3] / 8, Math.hypot(x2 - x1, y2 - y1), r[3] / 4); g.restore(); };
export function drawUnit(g, t, team, x, y, a, walk, sc = 1) {
  const U = UNITS[t], W_ = UW[t] || [];
  g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2); if (sc !== 1) g.scale(sc, sc);
  const weapons = top => { for (const [wn, wx, wy, mir, tp] of W_) { if (!!tp !== top || !wn) continue; spr(g, wn + '@o', wx, -wy); if (mir) spr(g, wn + '@o', -wx, -wy, 0, -1, 1); } };
  const L = LEG[t];
  if (L) {            // lábas egység: kétízületes lábak, a lépés fázisa lábanként eltolva
    const [cnt, len] = L, half = cnt / 2;
    for (let i = 0; i < cnt; i++) {
      const side = i < half ? -1 : 1, k = i % half, base = (k + .5) / half - .5, ph = walk * .12 + (i % 2 ? Math.PI : 0) + k, ang = base * 1.9 + Math.sin(ph) * .22, reach = len * (.9 + .12 * Math.cos(ph));
      const fx = side * Math.cos(ang) * reach, fy = Math.sin(ang) * reach, bx = side * U.r * .35, by = base * U.r * .9, jx = (bx + fx) / 2, jy = (by + fy) / 2 - len * .12;
      seg(g, t + '-leg-base@o', bx, by, jx, jy); seg(g, t + '-leg@o', jx, jy, fx, fy); spr(g, has(t + '-joint@o') ? t + '-joint@o' : t + '-joint-base@o', jx, jy); spr(g, t + '-foot@o', fx, fy, Math.atan2(fy - jy, fx - jx) + Math.PI / 2);
    }
  } else if (has(t + '-leg@o')) {   // lépegető: a két láb felváltva előre-hátra csúszik
    const e = Math.sin(walk * .22) * U.r * .45; spr(g, t + '-leg@o', 0, -e); spr(g, t + '-leg@o', 0, e, 0, -1, 1); spr(g, t + '-base@o', 0, 0);
  }
  if (has(t + '-treads')) spr(g, t + '-treads', 0, 0);
  weapons(false); spr(g, t + '@o', 0, 0);
  if (has(t + '-cell')) sprT(g, t + '-cell', TEAM[team], 1, 0, 0);
  weapons(true);
  g.restore();
}

/* ---------- fő rajzolás ---------- */
export function render(g, W, R) {
  const { cam, cw, ch, t, ter, ui } = R, z = cam.z, lod = z >= 2.5 ? 0 : 1, CH = LOD[lod].CH;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, cw, ch);
  const ox = cw / 2 - cam.x * z, oy = ch / 2 - cam.y * z;
  const vx0 = cam.x - cw / 2 / z, vy0 = cam.y - ch / 2 / z, vx1 = cam.x + cw / 2 / z, vy1 = cam.y + ch / 2 / z, cs = CH * TS;
  ter.update(); g.imageSmoothingEnabled = z !== 4 && z !== 2;
  for (let cy = Math.max(0, Math.floor(vy0 / cs)); cy <= Math.min(Math.ceil(W.h / CH) - 1, Math.floor(vy1 / cs)); cy++) for (let cx = Math.max(0, Math.floor(vx0 / cs)); cx <= Math.min(Math.ceil(W.w / CH) - 1, Math.floor(vx1 / cs)); cx++) {
    const X0 = Math.round(cx * cs * z + ox), Y0 = Math.round(cy * cs * z + oy), X1 = Math.round((cx + 1) * cs * z + ox), Y1 = Math.round((cy + 1) * cs * z + oy);
    g.drawImage(ter.chunk(cx, cy, lod), X0, Y0, X1 - X0, Y1 - Y0);
  }
  g.setTransform(z, 0, 0, z, ox, oy);
  if (W.props) for (const p of W.props) { if (!W.prop[p.i]) continue; const x = (p.x + .5) * TS, y = (p.y + .5) * TS; if (x < vx0 - 40 || x > vx1 + 40 || y < vy0 - 40 || y > vy1 + 40) continue; if (p.tree && AT[p.n + '-shadow']) { g.globalAlpha = .5; spr(g, p.n + '-shadow', x + 2, y - 2, p.r); g.globalAlpha = 1; } spr(g, p.n, x, y, p.r); }   // kövek, fák
  if (!W.hideSpawns) for (const sp of W.spawns) spr(g, 'spawn', (sp.x + .5) * TS, (sp.y + .5) * TS);
  for (const f of W.fx) if (f.k === 'rubble') { g.fillStyle = `rgba(20,18,16,${.45 * f.life / f.max})`; g.fillRect(f.x * TS + 1, f.y * TS + 1, f.s * TS - 2, f.s * TS - 2); }
  const vb = [], flat = [];
  for (const b of W.blds) if ((b.x + b.B.s) * TS >= vx0 && b.x * TS <= vx1 && (b.y + b.B.s) * TS >= vy0 && b.y * TS <= vy1) (b.cv || b.B.type === 'sconv' || b.B.type === 'conduit' ? flat : vb).push(b);
  for (const b of flat) drawB(g, W, b, t);
  for (const b of flat) {
    if (b.cv) for (const e of b.cv) { const p = e.p - .5; itemSq(g, e.it, (b.x + .5 + DX[b.rot] * p) * TS, (b.y + .5 + DY[b.rot] * p) * TS); }
    else if (b.st) { const p = b.cd > 0 ? -b.cd / 15 : 0, sx = (b.x + .5 + DX[b.rot] * p) * TS, sy = (b.y + .5 + DY[b.rot] * p) * TS; spr(g, 'plastanium-conveyor-stack', sx, sy, b.rot * Math.PI / 2); itemSq(g, b.st.it, sx, sy, 3 + b.st.n * .25); }
  }
  g.fillStyle = 'rgba(0,0,0,.28)'; for (const b of vb) if (b.B.type !== 'mine') g.fillRect(b.x * TS + .8, b.y * TS + 1.2, b.B.s * TS, b.B.s * TS);
  for (const b of vb) drawB(g, W, b, t);
  for (const b of vb) if (b.team !== undefined && b.team !== PLAYER) { g.fillStyle = b.team === ENEMY ? 'rgba(242,85,85,.13)' : 'rgba(20,20,28,.42)'; g.fillRect(b.x * TS, b.y * TS, b.B.s * TS, b.B.s * TS); }   // ellenséges / elhagyatott épület
  for (const b of vb) {
    if (b.B.type === 'bridge' || b.B.type === 'lbridge') bridgeLine(g, W, b, t);
    if (b.B.tractor && b.beam && !b.beam.dead) { const c = W.center(b); g.strokeStyle = 'rgba(191,146,249,.8)'; g.lineWidth = 1.4 + Math.sin(t * .4) * .4; g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(b.beam.x, b.beam.y); g.stroke(); }
    if (b.beamT > 0 && b.bx != null) { const c = W.center(b); g.strokeStyle = '#ff9a5a'; g.lineWidth = 5 + Math.sin(t * .6); g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(b.bx, b.by); g.stroke(); g.strokeStyle = '#fff3d0'; g.lineWidth = 2; g.stroke(); }
    if (b.B.type === 'repair' && b.tgt && !b.tgt.dead && b.ps > .1) { const c = W.center(b); g.strokeStyle = 'rgba(132,244,145,.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(b.tgt.x, b.tgt.y); g.stroke(); }
  }
  for (const b of W.blds) if (b.bml) for (const o of b.bml) { const a = W.center(b), c = W.center(o); if (Math.max(a.x, c.x) < vx0 || Math.min(a.x, c.x) > vx1 || Math.max(a.y, c.y) < vy0 || Math.min(a.y, c.y) > vy1) continue; g.strokeStyle = b.g && b.g.sat > .01 ? 'rgba(255,211,127,.7)' : 'rgba(150,150,150,.5)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(c.x, c.y); g.stroke(); }   // sugárcsomópontok (BeamNode)
  for (const b of W.blds) if (b.links) for (const o of b.links) { const a = W.center(b), c = W.center(o); if (Math.max(a.x, c.x) < vx0 || Math.min(a.x, c.x) > vx1 || Math.max(a.y, c.y) < vy0 || Math.min(a.y, c.y) > vy1) continue; const on = b.g && b.g.sat > 0 && b.g.prod + b.g.stored > 0; g.strokeStyle = on ? 'rgba(251,211,103,.55)' : 'rgba(110,104,96,.5)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(c.x, c.y); g.stroke(); g.strokeStyle = on ? 'rgba(255,255,255,.55)' : 'rgba(160,160,160,.3)'; g.lineWidth = .5; g.stroke(); }
  for (const b of vb) if (b.hp < b.B.hp) { const s = b.B.s * TS; g.fillStyle = '#2a0f0f'; g.fillRect(b.x * TS + 1, (b.y + b.B.s) * TS - 1.6, s - 2, 1.2); g.fillStyle = '#ff6b5a'; g.fillRect(b.x * TS + 1, (b.y + b.B.s) * TS - 1.6, (s - 2) * Math.max(0, b.hp / b.B.hp), 1.2); }
  for (const p of W.plans) {
    const s = p.B.s * TS, x = p.x * TS, y = p.y * TS; if (x + s < vx0 || x > vx1 || y + s < vy0 || y > vy1) continue;
    if (p.brk) { g.strokeStyle = '#ff5a4d'; g.lineWidth = 1; g.strokeRect(x + .5, y + .5, s - 1, s - 1); g.fillStyle = `rgba(255,90,77,${.15 + .3 * p.prog})`; g.fillRect(x, y, s, s * p.prog); continue; }
    g.globalAlpha = .4; drawB(g, null, ghostOf(p), t); g.globalAlpha = 1;
    g.fillStyle = 'rgba(255,211,127,.3)'; g.fillRect(x, y + s * (1 - p.prog), s, s * p.prog);
    g.strokeStyle = p.stall ? '#ff5a4d' : '#ffd37f'; g.lineWidth = .8; g.strokeRect(x + .4, y + .4, s - .8, s - .8);
  }
  for (const s of W.shields) if (s.on) { const c = W.center(s); g.fillStyle = `rgba(255,211,127,${.06 + (s.hit > 0 ? .1 : 0)})`; g.strokeStyle = `rgba(255,211,127,${.55 * (1 - s.sh / s.B.shp) + .2})`; g.lineWidth = 1; g.beginPath(); for (let k = 0; k <= 6; k++) g.lineTo(c.x + Math.cos(k * Math.PI / 3) * s.rad, c.y + Math.sin(k * Math.PI / 3) * s.rad); g.fill(); g.stroke(); }
  for (const pass of [0, 1]) for (const u of W.units) {
    if (u.dead || !!u.U.air !== !!pass) continue; const r = u.U.r;
    if (u.x < vx0 - 80 || u.x > vx1 + 80 || u.y < vy0 - 80 || u.y > vy1 + 80) continue;
    if (u.U.air) { g.globalAlpha = .25; sprT(g, u.t + '@o', '#000000', 0, u.x - 3 - r * .25, u.y + 3 + r * .25, u.rot + Math.PI / 2); g.globalAlpha = 1; }
    drawUnit(g, u.t, u.team, u.x, u.y, u.aim != null && !u.U.air ? u.aim : u.rot, u.walk);
    if (u.U.air && Math.hypot(u.vx, u.vy) > .3) { g.fillStyle = u.team === ENEMY ? 'rgba(255,120,100,.8)' : 'rgba(255,211,127,.8)'; circ(g, u.x - Math.cos(u.rot) * r, u.y - Math.sin(u.rot) * r, 1 + r * .08 + Math.random() * .6); }
    for (const k in u.st) if (k !== 'od') { g.fillStyle = STATUS[k].c; g.globalAlpha = .4; circ(g, u.x, u.y, r * .8); g.globalAlpha = 1; }
    if (u.hit > 0) { g.fillStyle = `rgba(255,255,255,${u.hit / 12})`; circ(g, u.x, u.y, r); }
    if (u.sh > 0) { g.strokeStyle = 'rgba(255,211,127,.8)'; g.lineWidth = .7; g.beginPath(); g.arc(u.x, u.y, r + 1.5, 0, 7); g.stroke(); }
    if (u.ffh > 0) { g.strokeStyle = 'rgba(132,244,145,.6)'; g.fillStyle = 'rgba(132,244,145,.06)'; g.lineWidth = .8; g.beginPath(); g.arc(u.x, u.y, u.U.ab.ff[0], 0, 7); g.fill(); g.stroke(); }
    if (u.hp < u.U.hp && (u.team === ENEMY || u !== W.player)) { g.fillStyle = '#2a0f0f'; g.fillRect(u.x - r, u.y + r + 2, r * 2, 1); g.fillStyle = u.team === ENEMY ? '#ff6b5a' : '#84f491'; g.fillRect(u.x - r, u.y + r + 2, r * 2 * Math.max(0, u.hp / u.U.hp), 1); }
    if (u.beam && u.beam.x != null) { g.strokeStyle = u.team === ENEMY ? '#ff7a6a' : '#84f491'; g.lineWidth = 4; g.beginPath(); g.moveTo(u.x, u.y); g.lineTo(u.beam.x, u.beam.y); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 1.4; g.stroke(); }
    if (u.mining && u.mine >= 0) { const mx = (u.mine % W.w + .5) * TS, my = (Math.floor(u.mine / W.w) + .5) * TS, it = W.mineItem(u.mine); g.strokeStyle = it ? ITEMS[it].c : '#fff'; g.globalAlpha = .6 + .3 * Math.sin(t * .3); g.lineWidth = .8; g.beginPath(); g.moveTo(u.x, u.y); g.lineTo(mx, my); g.stroke(); g.globalAlpha = 1; g.fillStyle = g.strokeStyle; g.fillRect(mx - 1, my - 1, 2, 2); }
    if (u.stack) itemSq(g, u.stack.it, u.x - Math.cos(u.rot) * r * 1.3, u.y - Math.sin(u.rot) * r * 1.3, 4);
    if (u.building && !u.building.done) { const q = u.building, qx = (q.x + q.B.s / 2) * TS, qy = (q.y + q.B.s / 2) * TS, h = q.B.s * 4; g.fillStyle = q.brk ? 'rgba(255,90,77,.25)' : 'rgba(255,211,127,.25)'; g.beginPath(); g.moveTo(u.x, u.y); g.lineTo(qx - h, qy - h); g.lineTo(qx + h, qy + h); g.fill(); g.beginPath(); g.moveTo(u.x, u.y); g.lineTo(qx + h, qy - h); g.lineTo(qx - h, qy + h); g.fill(); }
  }
  for (const b of W.bullets) {
    if (b.x < vx0 - 20 || b.x > vx1 + 20 || b.y < vy0 - 30 || b.y > vy1 + 20) continue;
    if (b.k === 'art') { const f = Math.max(0, Math.min(1, 1 - b.life / (Math.hypot(b.tx - b.sx, b.ty - b.sy) / Math.hypot(b.vx, b.vy) || 1))), hgt = Math.sin(f * Math.PI) * 14, sz = 1.6 + Math.sin(f * Math.PI) * 1.4; g.fillStyle = 'rgba(0,0,0,.3)'; circ(g, b.x, b.y, 1.4); g.fillStyle = b.c; circ(g, b.x, b.y - hgt, sz); g.fillStyle = '#fff'; circ(g, b.x, b.y - hgt, sz * .5); continue; }
    if (b.k === 'flame') { g.fillStyle = `rgba(255,${120 + Math.random() * 100},60,${.4 + .6 * Math.min(1, b.life / 6)})`; circ(g, b.x, b.y, 1.5 + Math.max(0, 1 - b.life / 14) * 2); continue; }
    if (b.k === 'liq' || b.k === 'acid') { g.fillStyle = b.k === 'acid' ? '#ffa166' : b.c; g.globalAlpha = .8; circ(g, b.x, b.y, 1.6); g.globalAlpha = 1; continue; }
    if (b.k === 'drv') { g.fillStyle = '#ffd37f'; circ(g, b.x, b.y, 3); g.fillStyle = '#fff'; circ(g, b.x, b.y, 1.4); continue; }
    const a = Math.atan2(b.vy, b.vx), big = b.d > 40 ? 1.6 : 1; g.save(); g.translate(b.x, b.y); g.rotate(a);
    if (b.k === 'missile') { g.fillStyle = '#c9cbd4'; g.fillRect(-2.5, -.9, 4.5, 1.8); g.fillStyle = b.c; g.fillRect(-4, -.6, 1.6, 1.2); }
    else { g.fillStyle = b.c; g.beginPath(); g.ellipse(0, 0, 3 * big, 1.1 * big, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(.4, 0, 1.8 * big, .55 * big, 0, 0, 7); g.fill(); }
    g.restore();
  }
  if (!R.nofx) for (const f of W.fx) {
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
  if (W.fog) { const tx0 = Math.max(0, Math.floor(vx0 / TS) - 1), ty0 = Math.max(0, Math.floor(vy0 / TS) - 1), tx1 = Math.min(W.w, Math.ceil(vx1 / TS) + 1), ty1 = Math.min(W.h, Math.ceil(vy1 / TS) + 1); if (tx1 > tx0 && ty1 > ty0) { g.imageSmoothingEnabled = true; g.drawImage(ter.fog, tx0, ty0, tx1 - tx0, ty1 - ty0, tx0 * TS, ty0 * TS, (tx1 - tx0) * TS, (ty1 - ty0) * TS); } }
  g.imageSmoothingEnabled = false;
  if (ui) ui(g, z);
}
export function ghostOf(p) { const B = BLOCKS[p.t]; return { t: p.t, B, x: p.x, y: p.y, rot: p.rot || 0, cfg: p.cfg, items: {}, cv: [], ang: -Math.PI / 2, work: 0, prog: 0, rotA: 0, ammo: [], heat: 0, ps: 0, pw: 0, lq: 0, oq: 0, hp: B.hp, buf: null, links: null, side: 1, rl: 0, warm: 0, link: -1 }; }
export { drawB, buildTime };

/* ---------- kisérkép ---------- */
export function minimap(c, W, ter, cam, vw, vh) {
  const g = c.getContext('2d'), sx = c.width / W.w, sy = c.height / W.h; g.imageSmoothingEnabled = sx < 1;
  g.drawImage(ter.mini, 0, 0, c.width, c.height);
  for (const b of W.blds) { g.fillStyle = TEAM[b.team ?? PLAYER]; g.fillRect(b.x * sx, b.y * sy, Math.max(1, b.B.s * sx), Math.max(1, b.B.s * sy)); }
  for (const u of W.units) { if (u.dead) continue; const big = u === W.player ? 3 : Math.max(2, u.U.r * sx / 4); g.fillStyle = u.team === ENEMY ? '#ff4a3d' : u === W.player ? '#fff' : '#ffd37f'; g.fillRect(u.x / TS * sx - big / 2, u.y / TS * sy - big / 2, big, big); }
  for (const sp of W.spawns) { g.strokeStyle = '#ff4a3d'; g.lineWidth = 1; g.strokeRect(sp.x * sx - 3, sp.y * sy - 3, 6, 6); }
  if (W.fog) { g.imageSmoothingEnabled = true; g.drawImage(ter.fog, 0, 0, c.width, c.height); }
  g.strokeStyle = '#fff'; g.lineWidth = 1; g.strokeRect((cam.x - vw / 2 / cam.z) / TS * sx, (cam.y - vh / 2 / cam.z) / TS * sy, vw / cam.z / TS * sx, vh / cam.z / TS * sy);
}
// CSS-háttér egy atlaszelemből (ikonokhoz a kezelőfelületen)
export const icoCss = (n, px = 16) => { const r = AT && AT[n]; if (!r) return ''; const k = px / r[2]; if (r[4]) return `width:${px}px;height:${Math.round(r[3] * k)}px;background:url(${r[5]}) 0 0 / 100% 100% no-repeat;border:0;image-rendering:pixelated`; return `width:${px}px;height:${Math.round(r[3] * k)}px;background:url(kepek/atlasz.png${AV}) ${-r[0] * k}px ${-r[1] * k}px / ${IMG.width * k}px ${IMG.height * k}px no-repeat;border:0;image-rendering:pixelated`; };
export const sprSize = n => AT && AT[n] ? [AT[n][2], AT[n][3]] : null;
