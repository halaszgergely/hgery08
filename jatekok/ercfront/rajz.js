// Ércfront – kirajzolás (saját, kódból rajzolt pixeles grafika)
import { TS, ITEMS, ITEM_IDS, FLOORS, WALLS, BLOCKS, UNITS } from './adat.js?v=202611261553';
import { FL, WL, DX, DY, PLAYER, ENEMY, buildTime } from './vilag.js?v=202611261553';

const P = 2;                 // a talajréteg felbontása: 2 képpont / világegység
const TEAM = { [PLAYER]: '#ffd37f', [ENEMY]: '#f25555' };
const hash = (x, y, s = 0) => { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function shade(c, f) { const n = parseInt(c.slice(1), 16); let r = n >> 16, g = n >> 8 & 255, b = n & 255; const m = v => Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)))); return '#' + ((1 << 24) | (m(r) << 16) | (m(g) << 8) | m(b)).toString(16).slice(1); }

/* ---------- talajréteg (egyszer rajzolva) ---------- */
export function floorLayer(W) {
  const cv = document.createElement('canvas'); cv.width = W.w * TS * P; cv.height = W.h * TS * P;
  const g = cv.getContext('2d'), T = TS * P;
  for (let y = 0; y < W.h; y++) for (let x = 0; x < W.w; x++) {
    const i = y * W.w + x, f = FLOORS[FL[W.floor[i]]], X = x * T, Y = y * T;
    g.fillStyle = hash(x, y) < .5 ? f.c : f.c2; g.fillRect(X, Y, T, T);
    for (let k = 0; k < 3; k++) { const r = hash(x, y, k + 3); if (r < .55) continue; g.fillStyle = shade(f.c, r < .8 ? -.08 : .06); g.fillRect(X + Math.floor(hash(x, y, k + 9) * (T - 4)), Y + Math.floor(hash(x, y, k + 19) * (T - 4)), 4, 4); }
    if (f.shallow || f.deep) { g.fillStyle = 'rgba(255,255,255,.06)'; if (hash(x, y, 7) > .6) g.fillRect(X + 3, Y + 6 + Math.floor(hash(x, y, 8) * 6), 8, 2); }
    const o = W.ore[i];
    if (o && !W.wall[i]) { const it = ITEMS[ITEM_IDS[o - 1]]; for (let k = 0; k < 4; k++) { const ox = X + 1 + Math.floor(hash(x, y, k + 31) * (T - 7)), oy = Y + 1 + Math.floor(hash(x, y, k + 41) * (T - 7)), s = 4 + Math.floor(hash(x, y, k + 51) * 3); g.fillStyle = it.c2; g.fillRect(ox, oy + 2, s, s - 1); g.fillStyle = it.c; g.fillRect(ox, oy, s, s - 1); g.fillStyle = shade(it.c, .35); g.fillRect(ox + 1, oy, 2, 2); } }
  }
  // sziklák: a fal teteje világosabb, alul árnyék
  for (let y = 0; y < W.h; y++) for (let x = 0; x < W.w; x++) {
    const i = y * W.w + x; if (!W.wall[i]) continue;
    const c = WALLS[WL[W.wall[i] - 1]], X = x * T, Y = y * T, below = y + 1 < W.h && !W.wall[i + W.w];
    g.fillStyle = shade(c, hash(x, y, 2) * .08); g.fillRect(X, Y, T, T);
    g.fillStyle = shade(c, .12); if (hash(x, y, 4) > .5) g.fillRect(X + 3, Y + 3, 5, 4); if (hash(x, y, 5) > .6) g.fillRect(X + 9, Y + 9, 4, 3);
    if (below) { g.fillStyle = shade(c, -.35); g.fillRect(X, Y + T - 5, T, 5); g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(X, Y + T, T, 5); }
    if (y > 0 && !W.wall[i - W.w]) { g.fillStyle = shade(c, .22); g.fillRect(X, Y, T, 2); }
  }
  for (const sp of W.spawns) { g.strokeStyle = 'rgba(242,85,85,.55)'; g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); g.arc((sp.x + .5) * T, (sp.y + .5) * T, 6 * T, 0, 7); g.stroke(); g.setLineDash([]); }
  return cv;
}

/* ---------- alap formák ---------- */
function panel(g, x, y, s, c = '#6e7080') {
  g.fillStyle = shade(c, -.45); g.fillRect(x, y, s, s);
  g.fillStyle = c; g.fillRect(x + .75, y + .75, s - 1.5, s - 1.5);
  g.fillStyle = shade(c, .18); g.fillRect(x + .75, y + .75, s - 1.5, .75); g.fillRect(x + .75, y + .75, .75, s - 1.5);
  g.fillStyle = shade(c, -.2); g.fillRect(x + .75, y + s - 1.5, s - 1.5, .75);
}
function itemSq(g, it, x, y, s = 3.2) { const I = ITEMS[it]; g.fillStyle = I.c2; g.fillRect(x - s / 2, y - s / 2 + .5, s, s); g.fillStyle = I.c; g.fillRect(x - s / 2, y - s / 2, s, s - .5); }

/* ---------- épületek ---------- */
function drawB(g, W, b, t) {
  const B = b.B, s = B.s * TS, x = b.x * TS, y = b.y * TS, cx = x + s / 2, cy = y + s / 2;
  switch (B.type) {
    case 'conveyor': {
      g.save(); g.translate(cx, cy); g.rotate(b.rot * Math.PI / 2);
      const ti = b.t === 'titancon';
      g.fillStyle = '#2c2d33'; g.fillRect(-4, -4, 8, 8);
      g.fillStyle = ti ? '#7c86b8' : '#77798a'; g.fillRect(-4, -4, 8, 1.2); g.fillRect(-4, 2.8, 8, 1.2);
      g.fillStyle = '#3f4048'; const off = (t * B.speed * .3 * .5) % 2;
      for (let k = -4 + off; k < 4; k += 2) g.fillRect(k, -2.6, .7, 5.2);
      g.restore(); break;
    }
    case 'junction': panel(g, x, y, s, '#686a76'); g.fillStyle = '#3a3b42'; g.fillRect(x + 3.3, y + 1, 1.4, 6); g.fillRect(x + 1, y + 3.3, 6, 1.4); break;
    case 'router': panel(g, x, y, s, '#686a76'); g.fillStyle = '#3a3b42'; g.fillRect(x + 2, y + 2, 4, 4); g.fillStyle = b.buf ? ITEMS[b.buf].c : '#ffb347'; g.fillRect(x + 3, y + 3, 2, 2); break;
    case 'sorter': panel(g, x, y, s, B.inv ? '#585a66' : '#686a76'); g.fillStyle = b.cfg ? ITEMS[b.cfg].c : '#2c2d33'; g.fillRect(x + 2, y + 2, 4, 4); if (B.inv) { g.strokeStyle = '#2c2d33'; g.lineWidth = .8; g.strokeRect(x + 2.4, y + 2.4, 3.2, 3.2); } break;
    case 'overflow': panel(g, x, y, s, '#686a76'); g.fillStyle = '#ffb347'; g.fillRect(x + 3.3, y + 1.5, 1.4, 5); g.fillRect(x + 1.5, y + 3.3, 5, 1.4); g.fillStyle = '#3a3b42'; g.fillRect(x + 3.3, y + 3.3, 1.4, 1.4); break;
    case 'bridge': g.fillStyle = '#3a3b42'; g.fillRect(x + .5, y + .5, 7, 7); g.fillStyle = '#7d7f8c'; g.fillRect(x + 1.2, y + 1.2, 5.6, 5.6); g.fillStyle = '#2c2d33'; g.fillRect(x + 2.5, y + 2.5, 3, 3); break;
    case 'unloader': panel(g, x, y, s, '#6b7386'); g.fillStyle = b.cfg ? ITEMS[b.cfg].c : '#c9cbd4'; g.fillRect(x + 2.5, y + 2.5, 3, 3); break;
    case 'drill': {
      panel(g, x, y, s, b.t === 'mdrill' ? '#6e7080' : b.t === 'pdrill' ? '#717a90' : '#7a7590');
      g.fillStyle = '#34353c'; g.beginPath(); g.arc(cx, cy, s * .32, 0, 7); g.fill();
      const ic = b.dItem ? ITEMS[b.dItem].c : '#555'; g.fillStyle = ic; g.globalAlpha = .55 + .45 * b.work; g.beginPath(); g.arc(cx, cy, s * .18, 0, 7); g.fill(); g.globalAlpha = 1;
      g.save(); g.translate(cx, cy); g.rotate(b.rotA); g.fillStyle = '#9b9dab'; for (let k = 0; k < 3; k++) { g.rotate(Math.PI * 2 / 3); g.fillRect(-.6, -s * .32, 1.2, s * .2); } g.restore();
      if (b.t === 'ldrill' && b.work > .1) { g.fillStyle = `rgba(255,120,120,${b.work * .5})`; g.fillRect(cx - 1, cy - 1, 2, 2); }
      break;
    }
    case 'crafter': {
      const col = { gpress: '#5c6170', smelter: '#6a5a50', kiln: '#7a5546', pulver: '#666' }[b.t] || '#666';
      panel(g, x, y, s, col);
      if (b.t === 'gpress') { const p = Math.abs(Math.sin(t * .08)) * b.work * 2; g.fillStyle = '#3a3c44'; g.fillRect(x + 2, y + 2 + p, s - 4, 3); g.fillRect(x + 2, y + s - 5 - p, s - 4, 3); itemSq(g, 'graphite', cx, cy, 3); }
      else if (b.t === 'pulver') { g.save(); g.translate(cx, cy); g.rotate(t * .1 * b.work); g.fillStyle = '#3a3c44'; g.fillRect(-2.5, -.6, 5, 1.2); g.fillRect(-.6, -2.5, 1.2, 5); g.restore(); }
      else { g.fillStyle = '#2a2420'; g.fillRect(x + 3, y + 3, s - 6, s - 6); const gl = b.work * (.7 + .3 * Math.sin(t * .2)); g.fillStyle = b.t === 'kiln' ? `rgba(255,140,90,${gl})` : `rgba(255,190,110,${gl})`; g.fillRect(x + 4, y + 4, s - 8, s - 8); }
      break;
    }
    case 'storage': panel(g, x, y, s, '#7c8296'); g.fillStyle = '#545868'; g.fillRect(x + 2, y + s / 2 - .5, s - 4, 1); g.fillRect(x + s / 2 - .5, y + 2, 1, s - 4); break;
    case 'generator':
      if (b.t === 'combust') { panel(g, x, y, s, '#6a5f5a'); g.fillStyle = '#2a2420'; g.fillRect(x + 2, y + 2, 4, 4); if (b.work > .05) { g.fillStyle = `rgba(255,${150 + 60 * Math.sin(t * .4)},70,${b.work})`; g.fillRect(x + 2.6, y + 2.6, 2.8, 2.8); } }
      else { g.fillStyle = '#26314a'; g.fillRect(x, y, s, s); g.fillStyle = '#3d5d94'; for (let yy = 0; yy < B.s * 2; yy++) for (let xx = 0; xx < B.s * 2; xx++) g.fillRect(x + .6 + xx * 4, y + .6 + yy * 4, 3, 3); }
      break;
    case 'node': g.fillStyle = '#3a3b42'; g.fillRect(x + 1, y + 1, 6, 6); g.fillStyle = '#8e909c'; g.fillRect(x + 1.7, y + 1.7, 4.6, 4.6); g.fillStyle = b.ps > 0 || (b.g && b.g.prod > 0) ? '#ffd37f' : '#555'; g.fillRect(x + 3, y + 3, 2, 2); break;
    case 'battery': panel(g, x, y, s, '#6e7080'); g.fillStyle = '#2c2d33'; g.fillRect(x + 2, y + 1.6, 4, 4.8); g.fillStyle = '#ffd37f'; { const f = b.pw / B.capP; g.fillRect(x + 2.5, y + 2 + 4 * (1 - f), 3, 4 * f); } break;
    case 'wall': { const col = b.t.startsWith('c') ? '#c07b4f' : b.t.startsWith('th') ? '#b06485' : '#8790c7'; panel(g, x, y, s, col); if (B.s > 1) { g.fillStyle = shade(col, -.25); g.fillRect(x + s / 2 - .3, y + 1, .6, s - 2); g.fillRect(x + 1, y + s / 2 - .3, s - 2, .6); } break; }
    case 'mender': panel(g, x, y, s, '#62706a'); g.fillStyle = `rgba(132,244,145,${.4 + .6 * b.ps * (b.prog / 200)})`; g.fillRect(x + 3.3, y + 1.8, 1.4, 4.4); g.fillRect(x + 1.8, y + 3.3, 4.4, 1.4); break;
    case 'factory': {
      panel(g, x, y, s, '#5e6474'); g.fillStyle = '#2c2d33'; g.fillRect(x + 3, y + 3, s - 6, s - 6);
      const ut = B.plans[b.cfg || 0]; g.save(); g.beginPath(); g.rect(x + 3, y + 3 + (s - 6) * (1 - b.prog), s - 6, (s - 6) * b.prog); g.clip(); drawUnitShape(g, ut, PLAYER, cx, cy, -Math.PI / 2, 0, .9); g.restore();
      g.fillStyle = TEAM[PLAYER]; g.fillRect(cx + DX[b.rot] * (s / 2 - 1) - (DX[b.rot] ? .5 : 3), cy + DY[b.rot] * (s / 2 - 1) - (DY[b.rot] ? .5 : 3), DX[b.rot] ? 1 : 6, DY[b.rot] ? 1 : 6);
      break;
    }
    case 'core': {
      panel(g, x, y, s, '#5e6170'); g.fillStyle = '#3a3b42'; g.fillRect(x + 4, y + 4, s - 8, s - 8);
      g.fillStyle = TEAM[PLAYER]; for (const [ax, ay] of [[0, 0], [1, 0], [0, 1], [1, 1]]) g.fillRect(x + 1.5 + ax * (s - 6), y + 1.5 + ay * (s - 6), 3, 3);
      g.save(); g.translate(cx, cy); g.rotate(Math.PI / 6); g.fillStyle = '#ffb347'; g.beginPath(); for (let k = 0; k < 6; k++) g.lineTo(Math.cos(k * Math.PI / 3) * 4.5, Math.sin(k * Math.PI / 3) * 4.5); g.fill(); g.restore();
      g.fillStyle = `rgba(255,220,150,${.4 + .2 * Math.sin(t * .05)})`; g.fillRect(cx - 1.5, cy - 1.5, 3, 3);
      break;
    }
    case 'turret': drawTurret(g, b, cx, cy, s, t); break;
  }
  if (b.hit > 0) { g.fillStyle = `rgba(255,255,255,${b.hit / 16})`; g.fillRect(x, y, s, s); }
}
function drawTurret(g, b, cx, cy, s, t) {
  const B = b.B, x = cx - s / 2, y = cy - s / 2;
  panel(g, x, y, s, '#5f616d');
  g.save(); g.translate(cx, cy); g.rotate(b.ang + Math.PI / 2);
  const rec = b.heat * 1.2, hc = `rgba(255,${120 + 80 * (1 - b.heat)},80,${b.heat})`;
  const am = b.ammo && b.ammo[b.ammo.length - 1];
  switch (b.t) {
    case 'duo': g.fillStyle = '#8b8d99'; g.fillRect(-2.6, -2.2, 5.2, 5); for (const sx of [-1.6, .6]) { g.fillStyle = '#6b6d79'; g.fillRect(sx, -6 + rec * (sx < 0 ? b.side < 0 : b.side > 0), 1, 4.5); } if (am) { g.fillStyle = ITEMS[am.it].c; g.fillRect(-1, 0, 2, 2); } break;
    case 'scatter': g.fillStyle = '#8b8d99'; g.fillRect(-5, -4, 10, 9); g.fillStyle = '#6b6d79'; g.fillRect(-3.5, -9 + rec, 2, 6); g.fillRect(1.5, -9 + rec, 2, 6); g.fillStyle = '#5a5c66'; g.fillRect(-5, 2, 10, 1); break;
    case 'hail': g.fillStyle = '#8b8d99'; g.fillRect(-2.8, -1.5, 5.6, 5); g.fillStyle = '#6b6d79'; g.fillRect(-1.5, -5 + rec, 3, 4); break;
    case 'arc': g.fillStyle = '#8b8d99'; g.beginPath(); g.arc(0, 0, 2.8, 0, 7); g.fill(); g.fillStyle = '#a9d8ff'; g.fillRect(-.7, -4.5, 1.4, 3); break;
    case 'lancet': g.fillStyle = '#8b8d99'; g.beginPath(); g.moveTo(0, -11 + rec); g.lineTo(4.5, 3); g.lineTo(-4.5, 3); g.fill(); g.fillStyle = `rgba(169,216,255,${.3 + .7 * (1 - Math.min(1, b.rl / B.reload))})`; g.fillRect(-1, -6, 2, 6); break;
    case 'salvo': g.fillStyle = '#8b8d99'; g.fillRect(-5, -4, 10, 9); g.fillStyle = '#6b6d79'; for (const sx of [-4, -1.8, .4, 2.6]) g.fillRect(sx, -9 + rec, 1.4, 6); break;
  }
  if (b.heat > 0) { g.fillStyle = hc; g.fillRect(-2, -s / 2 - 1, 4, 2); }
  g.restore();
}

/* ---------- egységek ---------- */
function drawUnitShape(g, t, team, x, y, a, walk, sc = 1) {
  const U = UNITS[t], tc = TEAM[team], r = U.r * sc;
  g.save(); g.translate(x, y); g.rotate(a);
  if (!U.air) { const sw = Math.sin(walk * .35) * r * .55; g.fillStyle = '#3a3b42'; g.fillRect(-r * .4 + sw, -r * .95, r * .8, r * .4); g.fillRect(-r * .4 - sw, r * .55, r * .8, r * .4); }
  switch (t) {
    case 'alpha': g.fillStyle = '#5b5d68'; g.beginPath(); g.moveTo(r * 1.2, 0); g.lineTo(-r * .8, r * .9); g.lineTo(-r * .4, 0); g.lineTo(-r * .8, -r * .9); g.fill(); g.fillStyle = tc; g.beginPath(); g.moveTo(r * .9, 0); g.lineTo(-r * .3, r * .45); g.lineTo(-r * .3, -r * .45); g.fill(); break;
    case 'flare': g.fillStyle = '#5b5d68'; g.beginPath(); g.moveTo(r * 1.3, 0); g.lineTo(-r, r); g.lineTo(-r * .5, 0); g.lineTo(-r, -r); g.fill(); g.fillStyle = tc; g.fillRect(-r * .3, -r * .2, r * .8, r * .4); break;
    case 'horizon': g.fillStyle = '#5b5d68'; g.fillRect(-r * .8, -r, r * 1.6, r * 2); g.fillStyle = tc; g.fillRect(-r * .2, -r * .7, r * .9, r * .3); g.fillRect(-r * .2, r * .4, r * .9, r * .3); break;
    case 'mono': g.fillStyle = '#5b5d68'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.fillStyle = tc; g.beginPath(); g.arc(r * .2, 0, r * .45, 0, 7); g.fill(); break;
    case 'crawler': g.fillStyle = '#4a4b55'; for (let k = 0; k < 6; k++) { const aa = k * Math.PI / 3 + walk * .2; g.fillRect(Math.cos(aa) * r * .9 - .6, Math.sin(aa) * r * .9 - .6, 1.2, 1.2); } g.fillStyle = tc; g.beginPath(); g.arc(0, 0, r * .75, 0, 7); g.fill(); break;
    case 'nova': g.fillStyle = '#6b6d79'; g.beginPath(); g.arc(0, 0, r * .9, 0, 7); g.fill(); g.fillStyle = tc; g.fillRect(-r * .2, -r * .5, r * .9, r); g.fillStyle = '#9ec9ff'; g.fillRect(r * .5, -r * .15, r * .7, r * .3); break;
    default: {
      g.fillStyle = '#6b6d79'; g.fillRect(-r * .8, -r * .8, r * 1.6, r * 1.6);
      g.fillStyle = tc; g.fillRect(-r * .45, -r * .45, r * .9, r * .9);
      g.fillStyle = '#4a4b55'; const gl = t === 'fortress' ? 1.4 : t === 'mace' ? 1.1 : 1; g.fillRect(r * .2, -r * .95, r * gl, r * .35); g.fillRect(r * .2, r * .6, r * gl, r * .35);
    }
  }
  g.restore();
}

/* ---------- fő rajzolás ---------- */
export function render(g, W, R) {
  const { cam, cw, ch, t, floor, ui } = R, z = cam.z;
  g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
  g.fillStyle = '#111216'; g.fillRect(0, 0, cw, ch);
  const ox = cw / 2 - cam.x * z, oy = ch / 2 - cam.y * z;
  g.setTransform(z, 0, 0, z, ox, oy);
  const vx0 = cam.x - cw / 2 / z, vy0 = cam.y - ch / 2 / z, vx1 = cam.x + cw / 2 / z, vy1 = cam.y + ch / 2 / z;
  g.drawImage(floor, 0, 0, floor.width, floor.height, 0, 0, W.w * TS, W.h * TS);
  // romok
  for (const f of W.fx) if (f.k === 'rubble') { g.fillStyle = `rgba(20,18,16,${.45 * f.life / f.max})`; g.fillRect(f.x * TS + 1, f.y * TS + 1, f.s * TS - 2, f.s * TS - 2); }
  const vis = b => (b.x + b.B.s) * TS >= vx0 && b.x * TS <= vx1 && (b.y + b.B.s) * TS >= vy0 && b.y * TS <= vy1;
  // árnyék + épületek
  g.fillStyle = 'rgba(0,0,0,.25)';
  for (const b of W.blds) if (b.B.type !== 'conveyor' && vis(b)) g.fillRect(b.x * TS + 1, b.y * TS + 1.5, b.B.s * TS, b.B.s * TS);
  for (const b of W.blds) if (b.B.type === 'conveyor' && vis(b)) drawB(g, W, b, t);
  // szalagok tárgyai
  for (const b of W.blds) {
    if (!vis(b)) continue;
    if (b.cv) for (const e of b.cv) { const p = e.p - .5; itemSq(g, e.it, (b.x + .5 + DX[b.rot] * p) * TS, (b.y + .5 + DY[b.rot] * p) * TS); }
  }
  for (const b of W.blds) if (b.B.type !== 'conveyor' && vis(b)) drawB(g, W, b, t);
  for (const b of W.blds) if (b.B.type === 'bridge' && b.link >= 0) { const o = W.bt[b.link]; if (!o) continue; const ax = (b.x + .5) * TS, ay = (b.y + .5) * TS, bx = (o.x + .5) * TS, by = (o.y + .5) * TS; g.strokeStyle = 'rgba(160,165,185,.7)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); if (b.buf.length) { const f = (t % 30) / 30; itemSq(g, b.buf[0], ax + (bx - ax) * f, ay + (by - ay) * f, 2.6); } }
  // áramvezetékek
  g.lineWidth = .9;
  for (const b of W.blds) if (b.links) for (const o of b.links) { const a = W.center(b), c = W.center(o); if (Math.max(a.x, c.x) < vx0 || Math.min(a.x, c.x) > vx1 || Math.max(a.y, c.y) < vy0 || Math.min(a.y, c.y) > vy1) continue; g.strokeStyle = b.g && b.g.sat > 0 && b.g.prod + b.g.stored > 0 ? 'rgba(255,211,127,.75)' : 'rgba(180,140,90,.5)'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(c.x, c.y); g.stroke(); }
  // sérült épületek csíkja
  for (const b of W.blds) if (b.hp < b.B.hp && vis(b)) { const s = b.B.s * TS; g.fillStyle = '#2a0f0f'; g.fillRect(b.x * TS + 1, (b.y + b.B.s) * TS - 1.6, s - 2, 1.2); g.fillStyle = '#ff6b5a'; g.fillRect(b.x * TS + 1, (b.y + b.B.s) * TS - 1.6, (s - 2) * Math.max(0, b.hp / b.B.hp), 1.2); }
  // tervek
  for (const p of W.plans) {
    const s = p.B.s * TS, x = p.x * TS, y = p.y * TS;
    if (p.brk) { g.strokeStyle = '#ff5a4d'; g.lineWidth = 1; g.strokeRect(x + .5, y + .5, s - 1, s - 1); g.fillStyle = `rgba(255,90,77,${.15 + .3 * p.prog})`; g.fillRect(x, y, s, s * p.prog); continue; }
    g.globalAlpha = .38; drawB(g, W, ghostOf(p), t); g.globalAlpha = 1;
    g.fillStyle = 'rgba(106,176,255,.35)'; g.fillRect(x, y + s * (1 - p.prog), s, s * p.prog);
    g.strokeStyle = p.stall ? '#ff5a4d' : '#6ab0ff'; g.lineWidth = .8; g.strokeRect(x + .4, y + .4, s - .8, s - .8);
  }
  // egységek – földi, aztán légi
  for (const pass of [0, 1]) for (const u of W.units) {
    if (u.dead || !!u.U.air !== !!pass) continue;
    if (u.x < vx0 - 20 || u.x > vx1 + 20 || u.y < vy0 - 20 || u.y > vy1 + 20) continue;
    if (u.U.air) { g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.arc(u.x + 4, u.y + 6, u.U.r * .9, 0, 7); g.fill(); }
    drawUnitShape(g, u.t, u.team, u.x, u.y, u.aim != null && !u.U.air ? u.aim : u.rot, u.walk);
    if (u.U.air && Math.hypot(u.vx, u.vy) > .3) { g.fillStyle = u.team === ENEMY ? 'rgba(255,120,100,.8)' : 'rgba(255,211,127,.8)'; g.beginPath(); g.arc(u.x - Math.cos(u.rot) * u.U.r, u.y - Math.sin(u.rot) * u.U.r, 1.2 + Math.random() * .6, 0, 7); g.fill(); }
    if (u.hit > 0) { g.fillStyle = `rgba(255,255,255,${u.hit / 10})`; g.beginPath(); g.arc(u.x, u.y, u.U.r, 0, 7); g.fill(); }
    if (u.hp < u.U.hp && u.team === ENEMY) { g.fillStyle = '#2a0f0f'; g.fillRect(u.x - u.U.r, u.y + u.U.r + 2, u.U.r * 2, 1); g.fillStyle = '#ff6b5a'; g.fillRect(u.x - u.U.r, u.y + u.U.r + 2, u.U.r * 2 * u.hp / u.U.hp, 1); }
    if (u.mining && u.mine >= 0) { const mx = (u.mine % W.w + .5) * TS, my = (Math.floor(u.mine / W.w) + .5) * TS, it = W.mineItem(u.mine); g.strokeStyle = it ? ITEMS[it].c : '#fff'; g.globalAlpha = .6 + .3 * Math.sin(t * .3); g.lineWidth = .8; g.beginPath(); g.moveTo(u.x, u.y); g.lineTo(mx, my); g.stroke(); g.globalAlpha = 1; g.fillStyle = g.strokeStyle; g.fillRect(mx - 1, my - 1, 2, 2); }
    if (u.stack) itemSq(g, u.stack.it, u.x - Math.cos(u.rot) * u.U.r * 1.3, u.y - Math.sin(u.rot) * u.U.r * 1.3, 2.6);
  }
  // építősugár
  const p = W.player;
  if (p && !p.dead && p.building) { const q = p.building, qx = (q.x + q.B.s / 2) * TS, qy = (q.y + q.B.s / 2) * TS; g.strokeStyle = q.brk ? 'rgba(255,90,77,.7)' : 'rgba(255,211,127,.7)'; g.lineWidth = .7; for (const k of [-1, 1]) { g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(qx + k * q.B.s * 3 * Math.sin(t * .15), qy + k * q.B.s * 3 * Math.cos(t * .11)); g.stroke(); } }
  // lövedékek
  for (const b of W.bullets) {
    if (b.art) { const f = 1 - b.life / (Math.hypot(b.tx - b.sx, b.ty - b.sy) / Math.hypot(b.vx, b.vy) || 1), hgt = Math.sin(Math.max(0, Math.min(1, f)) * Math.PI) * 14; g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(b.x - 1, b.y - 1, 2, 2); g.fillStyle = b.c; g.fillRect(b.x - 1.4, b.y - hgt - 1.4, 2.8, 2.8); continue; }
    if (b.flame) { g.fillStyle = `rgba(255,${120 + Math.random() * 100},60,${.4 + .6 * Math.min(1, b.life / 6)})`; g.beginPath(); g.arc(b.x, b.y, 1.5 + (1 - b.life / 14) * 2, 0, 7); g.fill(); continue; }
    const a = Math.atan2(b.vy, b.vx); g.save(); g.translate(b.x, b.y); g.rotate(a); g.fillStyle = b.c; g.fillRect(-2.5, -.8, 4, 1.6); g.fillStyle = '#fff'; g.fillRect(.5, -.4, 1.2, .8); g.restore();
  }
  // effektek
  for (const f of W.fx) {
    const k = f.life / f.max;
    switch (f.k) {
      case 'boom': g.fillStyle = f.c; g.globalAlpha = k * .7; g.beginPath(); g.arc(f.x, f.y, f.r * (1.2 - k * .6), 0, 7); g.fill(); g.globalAlpha = k; g.fillStyle = '#fff3d0'; g.beginPath(); g.arc(f.x, f.y, f.r * .35 * k, 0, 7); g.fill(); g.globalAlpha = 1; break;
      case 'hit': g.fillStyle = f.c; g.globalAlpha = k; for (let q = 0; q < 4; q++) { const aa = q * 1.6 + f.x; g.fillRect(f.x + Math.cos(aa) * (1 - k) * 4 - .5, f.y + Math.sin(aa) * (1 - k) * 4 - .5, 1, 1); } g.globalAlpha = 1; break;
      case 'flash': g.fillStyle = f.c; g.globalAlpha = k; g.beginPath(); g.arc(f.x, f.y, 1.5 * k + .5, 0, 7); g.fill(); g.globalAlpha = 1; break;
      case 'laser': g.strokeStyle = f.c; g.globalAlpha = k; g.lineWidth = 3 * k; g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x2, f.y2); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 1 * k; g.stroke(); g.globalAlpha = 1; break;
      case 'bolt': g.strokeStyle = f.c; g.globalAlpha = k; g.lineWidth = 1; g.beginPath(); f.pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.globalAlpha = 1; break;
      case 'ring': g.strokeStyle = f.c; g.globalAlpha = k; g.lineWidth = 1; g.beginPath(); g.arc(f.x, f.y, f.r * (1 - k * .5), 0, 7); g.stroke(); g.globalAlpha = 1; break;
      case 'puff': g.fillStyle = f.c; g.globalAlpha = k * .7; g.beginPath(); g.arc(f.x, f.y - (1 - k) * 6, 1.2 + (1 - k) * 2, 0, 7); g.fill(); g.globalAlpha = 1; break;
      case 'xfer': { const x = f.x + (f.x2 - f.x) * (1 - k), y = f.y + (f.y2 - f.y) * (1 - k); g.fillStyle = f.c; g.fillRect(x - 1, y - 1, 2, 2); break; }
    }
  }
  if (ui) ui(g, z);
}
export function ghostOf(p) { const B = BLOCKS[p.t]; return { t: p.t, B, x: p.x, y: p.y, rot: p.rot, cfg: p.cfg, items: {}, cv: [], ang: [-Math.PI / 2, Math.PI / 2, Math.PI, -Math.PI / 2][0], work: 0, prog: 0, rotA: 0, ammo: [], heat: 0, ps: 0, pw: 0, hp: B.hp, buf: null, links: null, side: 1, rl: 0 }; }
export { drawB, drawUnitShape, panel, itemSq, shade };

/* ---------- kisérkép ---------- */
export function minimap(c, W, floor) {
  const g = c.getContext('2d'); g.imageSmoothingEnabled = true;
  g.drawImage(floor, 0, 0, c.width, c.height);
  const sx = c.width / W.w, sy = c.height / W.h;
  g.fillStyle = TEAM[PLAYER]; for (const b of W.blds) g.fillRect(b.x * sx, b.y * sy, Math.max(1, b.B.s * sx), Math.max(1, b.B.s * sy));
  for (const u of W.units) { if (u.dead) continue; g.fillStyle = u.team === ENEMY ? '#ff4a3d' : u === W.player ? '#fff' : '#ffd37f'; g.fillRect(u.x / TS * sx - 1, u.y / TS * sy - 1, u === W.player ? 3 : 2, u === W.player ? 3 : 2); }
}
export { buildTime };
