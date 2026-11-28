// Procedurális textúrák (vásznon): homlokzatok éjszakai ablakfénnyel, tetők, aszfalt, útburkolati jelek, járda, fű, víz
import * as THREE from 'three';
import { rng } from './world.js?v=202611281235';

const cv = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const tex = (c, rep = true, srgb = true) => { const t = new THREE.CanvasTexture(c); if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; };
function noise(x, w, h, a, col, n = 3000, r = rng(5)) { for (let i = 0; i < n; i++) { x.fillStyle = col(r()); x.globalAlpha = a * r(); x.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } x.globalAlpha = 1; }

/* homlokzat: 4 ablakoszlop × 4 emelet egy csempén (13.6 m × 12.8 m) */
export const FACADE = { w: 13.6, h: 12.8 };
const STY = {
  office: { bg: '#5d7387', win: '#2a4a6a', frame: '#c7d3dc', glass: 1 },
  hgws: { bg: '#e9eef2', win: '#1e5f9c', frame: '#ffffff', glass: 1, stripe: '#1f8fd6' },
  panel: { bg: '#b7b3a8', win: '#3a4652', frame: '#e4e0d6', panel: 1 },
  old: { bg: '#d9b36a', win: '#3a3a40', frame: '#f2e6c8', old: 1 },
  old2: { bg: '#c99a8a', win: '#383840', frame: '#f0e2d2', old: 1 },
  brick: { bg: '#8f4a34', win: '#2d3238', frame: '#c9b8a2', brick: 1 },
  warehouse: { bg: '#8a9298', win: '#2f363c', frame: '#c2c8cc', corr: 1 },
  house: { bg: '#e8e0cf', win: '#3c4650', frame: '#ffffff', house: 1 },
  szerviz: { bg: '#2c6fa8', win: '#1b2a36', frame: '#f2c230', corr: 1 },
  hgwsg: { bg: '#d9dee2', win: '#2b3238', frame: '#1f8fd6', corr: 1 },
  garage: { bg: '#a7a39a', win: '#2b3238', frame: '#d8d2c4', corr: 1 },
  villa: { bg: '#f1ece2', win: '#2f3d4a', frame: '#7a5a3a', old: 1 }
};
function facade(name) {
  const S = STY[name], [c, x] = cv(256), [e, y] = cv(256), r = rng(name.length * 977);
  x.fillStyle = S.bg; x.fillRect(0, 0, 256, 256); y.fillStyle = '#000'; y.fillRect(0, 0, 256, 256);
  if (S.brick) { for (let j = 0; j < 64; j++) for (let i = 0; i < 17; i++) { x.fillStyle = `hsl(${12 + r() * 8},${40 + r() * 15}%,${30 + r() * 10}%)`; x.fillRect(((i * 16 + (j % 2) * 8) % 272) - 8, j * 4, 15, 3); } }
  if (S.corr) { for (let i = 0; i < 256; i += 4) { x.fillStyle = i % 8 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.1)'; x.fillRect(i, 0, 2, 256); } }
  if (S.panel) { x.strokeStyle = 'rgba(0,0,0,.22)'; x.lineWidth = 1.5; for (let j = 0; j <= 4; j++) { x.beginPath(); x.moveTo(0, j * 64); x.lineTo(256, j * 64); x.stroke(); } for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, 256); x.stroke(); } }
  noise(x, 256, 256, .12, v => v < .5 ? '#000' : '#fff', 2500, r);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const X = i * 64, Y = j * 64, lit = r() < .32, lc = `hsl(${38 + r() * 18},${60 + r() * 30}%,${55 + r() * 20}%)`;
    let wx, wy, ww, wh;
    if (S.glass) { wx = X + 3; wy = Y + 6; ww = 58; wh = 52; }
    else if (S.panel) { wx = X + 12; wy = Y + 14; ww = 40; wh = 30; if (i === 1 || i === 2) { x.fillStyle = 'rgba(70,70,70,.55)'; x.fillRect(X + 4, Y + 46, 56, 14); x.fillStyle = r() < .5 ? '#8fa7b8' : '#c9a27a'; x.fillRect(X + 4, Y + 46, 56, 3); } }
    else if (S.old) { wx = X + 18; wy = Y + 10; ww = 28; wh = 40; x.fillStyle = S.frame; x.fillRect(X + 12, Y + 6, 40, 4); x.fillRect(X + 14, Y + 50, 36, 4); }
    else if (S.corr) { if ((i + j) % 3) continue; wx = X + 14; wy = Y + 12; ww = 36; wh = 14; }
    else if (S.house) { if (i % 2) continue; wx = X + 20; wy = Y + 16; ww = 30; wh = 30; }
    else { wx = X + 16; wy = Y + 14; ww = 32; wh = 30; }
    x.fillStyle = S.frame; x.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
    const g = x.createLinearGradient(wx, wy, wx + ww, wy + wh); g.addColorStop(0, S.win); g.addColorStop(1, S.glass ? '#7fa6c4' : '#5b6672'); x.fillStyle = g; x.fillRect(wx, wy, ww, wh);
    if (!S.glass) { x.fillStyle = S.frame; x.fillRect(wx + ww / 2 - 1, wy, 2, wh); x.fillRect(wx, wy + wh * .35, ww, 2); }
    else { x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(wx, wy, ww * .4, wh); }
    if (lit) { y.fillStyle = lc; y.fillRect(wx, wy, ww, wh); if (!S.glass) { y.fillStyle = '#000'; y.fillRect(wx + ww / 2 - 1, wy, 2, wh); } }
  }
  if (S.stripe) { x.fillStyle = S.stripe; x.fillRect(0, 60, 256, 4); x.fillRect(0, 188, 256, 4); }
  return { map: tex(c), emissive: tex(e) };
}
const cache = {};
export function facadeMat(name) {
  if (cache[name]) return cache[name];
  const f = facade(name), S = STY[name];
  return cache[name] = new THREE.MeshStandardMaterial({ map: f.map, emissiveMap: f.emissive, emissive: 0xffffff, emissiveIntensity: 0, roughness: S.glass ? .35 : .85, metalness: S.glass ? .35 : S.corr ? .4 : 0 });
}
export const FACADES = Object.keys(STY);

function simple(w, draw, rep = true) { const [c, x] = cv(w); draw(x, w); return tex(c, rep); }
export const TEX = {};
export function initTextures() {
  TEX.asphalt = simple(256, (x, w) => { x.fillStyle = '#3d3f43'; x.fillRect(0, 0, w, w); noise(x, w, w, .25, v => v < .5 ? '#202124' : '#6a6c70', 9000); });
  // útszakasz: 14 m széles, a textúra 14 m × 14 m; u a szélesség, v a hossz
  TEX.road = simple(512, (x, w) => { x.fillStyle = '#3b3d41'; x.fillRect(0, 0, w, w); noise(x, w, w, .25, v => v < .5 ? '#1e1f22' : '#6a6c70', 16000);
    x.fillStyle = '#e8e6dc'; x.fillRect(w * .02, 0, w * .012, w); x.fillRect(w * .968, 0, w * .012, w);
    x.fillStyle = '#f2c230'; x.fillRect(w * .493, 0, w * .014, w * .55); x.fillStyle = '#e8e6dc'; for (const k of [.25, .75]) x.fillRect(w * k - 2, 0, 4, w * .4); });
  TEX.hw = simple(512, (x, w) => { x.fillStyle = '#36383c'; x.fillRect(0, 0, w, w); noise(x, w, w, .25, v => v < .5 ? '#1e1f22' : '#6a6c70', 16000);
    x.fillStyle = '#e8e6dc'; x.fillRect(w * .02, 0, w * .01, w); x.fillRect(w * .97, 0, w * .01, w); x.fillRect(w * .49, 0, w * .02, w); for (const k of [.26, .74]) x.fillRect(w * k - 2, 0, 4, w * .45); });
  TEX.cross = simple(256, (x, w) => { x.fillStyle = '#3b3d41'; x.fillRect(0, 0, w, w); noise(x, w, w, .25, v => v < .5 ? '#1e1f22' : '#6a6c70', 6000); x.fillStyle = 'rgba(232,230,220,.9)'; for (let i = 0; i < 8; i++) { x.fillRect(i * 32 + 6, 0, 18, 26); x.fillRect(i * 32 + 6, w - 26, 18, 26); x.fillRect(0, i * 32 + 6, 26, 18); x.fillRect(w - 26, i * 32 + 6, 26, 18); } });
  TEX.walk = simple(256, (x, w) => { x.fillStyle = '#a7a59e'; x.fillRect(0, 0, w, w); for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { x.fillStyle = `hsl(40,6%,${58 + Math.random() * 10}%)`; x.fillRect(i * 32 + 1, j * 32 + 1, 30, 30); } });
  TEX.grass = simple(256, (x, w) => { x.fillStyle = '#5e7f3a'; x.fillRect(0, 0, w, w); noise(x, w, w, .35, v => v < .4 ? '#3f5f26' : v < .8 ? '#7c9a48' : '#8f8a52', 14000); });
  TEX.dirt = simple(256, (x, w) => { x.fillStyle = '#7a6a52'; x.fillRect(0, 0, w, w); noise(x, w, w, .3, v => v < .5 ? '#5a4a36' : '#9a8a6e', 12000); });
  TEX.gravel = simple(128, (x, w) => { x.fillStyle = '#7d7c78'; x.fillRect(0, 0, w, w); noise(x, w, w, .5, v => v < .5 ? '#55544f' : '#a5a39c', 4000); });
  TEX.tile = simple(128, (x, w) => { x.fillStyle = '#9c3f2c'; x.fillRect(0, 0, w, w); for (let j = 0; j < 8; j++) { x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, j * 16 + 13, w, 3); for (let i = 0; i < 8; i++) { x.fillStyle = `rgba(255,${120 + Math.random() * 60},90,.12)`; x.fillRect(i * 16 + (j % 2) * 8, j * 16, 14, 13); } } });
  TEX.metal = simple(128, (x, w) => { x.fillStyle = '#8f979c'; x.fillRect(0, 0, w, w); for (let i = 0; i < w; i += 8) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(i, 0, 3, w); } });
  TEX.water = simple(256, (x, w) => { x.fillStyle = '#2c5a6a'; x.fillRect(0, 0, w, w); noise(x, w, w, .3, v => v < .5 ? '#1d4452' : '#5a8f9c', 6000); });
}
export function groundMats() {
  const M = (map, rough = .95, col = 0xffffff, extra = {}) => new THREE.MeshStandardMaterial({ map, roughness: rough, color: col, ...extra });
  return { road: M(TEX.road, .9), hw: M(TEX.hw, .9), cross: M(TEX.cross, .9), walk: M(TEX.walk, .92), grass: M(TEX.grass, 1), dirt: M(TEX.dirt, 1), gravel: M(TEX.gravel, 1), roofTile: M(TEX.tile, .8), roofMetal: M(TEX.metal, .5, 0xffffff, { metalness: .5 }), asphalt: M(TEX.asphalt, .9),
    water: new THREE.MeshStandardMaterial({ map: TEX.water, color: 0x7fb0c0, roughness: .12, metalness: .3, transparent: true, opacity: .88 }) };
}
/* felirat-textúra (cégtáblák) */
export function signTex(text, bg = '#1f8fd6', fg = '#fff', w = 512, h = 96) {
  const [c, x] = cv(w, h); x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = fg; x.font = `900 ${h * .55}px Inter, Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + 2, w - 20); return tex(c, false);
}
export function graffitiTex() {
  const [c, x] = cv(512, 256); x.clearRect(0, 0, 512, 256); x.lineJoin = 'round';
  x.font = '900 150px Impact, Arial Black, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 22; x.strokeStyle = '#111'; x.strokeText('ZERO', 256, 132); const g = x.createLinearGradient(0, 40, 0, 220); g.addColorStop(0, '#ff3fd2'); g.addColorStop(.5, '#7c3aed'); g.addColorStop(1, '#22d3ee'); x.fillStyle = g; x.fillText('ZERO', 256, 132);
  x.lineWidth = 4; x.strokeStyle = '#fff'; x.strokeText('ZERO', 252, 126); return tex(c, false);
}
