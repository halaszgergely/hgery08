// Az Átemelőtelep – kódból generált (procedurális) textúrák és anyagok. Nincs letöltendő képfájl; minden textúra ≤ 512 px.
import * as THREE from 'three';

/* ---------- zaj ---------- */
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
// ismétlődő (csempézhető) értékzaj, több oktávval
function noiseField(n, cells, oct, seed) { const R = rng(seed), out = new Float32Array(n * n);
  for (let o = 0, amp = 1, c = cells, tot = 0; o < oct; o++, amp *= .5, c *= 2) { const g = new Float32Array(c * c); for (let i = 0; i < g.length; i++) g[i] = R(); tot += amp;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const fx = x / n * c, fy = y / n * c, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = g[(y0 % c) * c + x0 % c], b = g[(y0 % c) * c + (x0 + 1) % c], d = g[((y0 + 1) % c) * c + x0 % c], e = g[((y0 + 1) % c) * c + (x0 + 1) % c];
      out[y * n + x] += ((a + (b - a) * sx) + ((d + (e - d) * sx) - (a + (b - a) * sx)) * sy) * amp; }
    if (o === oct - 1) for (let i = 0; i < out.length; i++) out[i] /= tot; }
  return out; }
const cv = n => { const c = document.createElement('canvas'); c.width = c.height = n; return c; };
function fromPixels(n, fn, srgb = true) { const c = cv(n), x = c.getContext('2d', { willReadFrequently: true }), im = x.createImageData(n, n), d = im.data;
  for (let y = 0; y < n; y++) for (let i = 0; i < n; i++) { const [r, g, b, a = 255] = fn(i, y), k = (y * n + i) * 4; d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = a; }
  x.putImageData(im, 0, 0); return tex(c, srgb); }
function tex(c, srgb = true, rep = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.needsUpdate = true; return t; }
const mix = (a, b, t) => a + (b - a) * t, cl = v => Math.max(0, Math.min(255, v));

/* ---------- textúrák ---------- */
export function makeTextures(Q) {
  const N = Q >= 1 ? 512 : 256, T = {};
  // murva: szürke zúzottkő, sötét szemcsék, nedves foltok
  { const a = noiseField(N, 8, 5, 11), b = noiseField(N, 64, 2, 12), R = rng(5);
    T.gravel = fromPixels(N, (x, y) => { const k = y * N + x, g = b[k] > .62 ? .55 : b[k] < .3 ? 1.18 : 1, v = (92 + a[k] * 60) * g + (R() - .5) * 26; return [cl(v * .98), cl(v * .97), cl(v * .93)]; });
    T.wet = fromPixels(N >> 1, (x, y) => { const v = a[(y * 2) * N + x * 2]; return [cl((v - .45) * 900), 0, 0]; }, false); }   // nedvesség-maszk (tócsák a fényesség-térképhez)
  // fű: sötét, esőáztatta
  { const a = noiseField(256, 6, 4, 21), R = rng(7); T.grass = fromPixels(256, (x, y) => { const v = a[y * 256 + x], n = R() * 30; return [cl(28 + v * 30 + n * .4), cl(46 + v * 44 + n), cl(24 + v * 20 + n * .3)]; }); }
  // beton: foltos, pórusos
  { const a = noiseField(256, 4, 5, 31), b = noiseField(256, 48, 2, 32); T.concrete = fromPixels(256, (x, y) => { const k = y * 256 + x, v = 118 + a[k] * 52 - (b[k] > .7 ? 30 : 0); return [cl(v), cl(v * .99), cl(v * .95)]; }); }
  // aszfalt
  { const a = noiseField(256, 8, 4, 41), R = rng(9); T.asphalt = fromPixels(256, (x, y) => { const v = 34 + a[y * 256 + x] * 22 + R() * 14; return [cl(v), cl(v), cl(v * 1.05)]; }); }
  // szántó: barázdák
  { const a = noiseField(256, 6, 4, 51); T.field = fromPixels(256, (x, y) => { const f = .6 + .4 * Math.sin(y / 256 * Math.PI * 24), v = (44 + a[y * 256 + x] * 34) * f; return [cl(v * 1.15), cl(v * .9), cl(v * .65)]; }); }
  // rozsdás fém
  { const a = noiseField(256, 6, 5, 61), b = noiseField(256, 24, 3, 62); T.rust = fromPixels(256, (x, y) => { const k = y * 256 + x, r = Math.max(0, Math.min(1, (a[k] - .42) * 3 + b[k] * .3)); return [cl(mix(120, 128, r) + b[k] * 20), cl(mix(124, 70, r)), cl(mix(126, 40, r))]; }); }
  // festett fém: finom zaj + lefolyó koszcsíkok
  { const a = noiseField(256, 4, 4, 71), b = noiseField(256, 32, 2, 72); T.paint = fromPixels(256, (x, y) => { const k = y * 256 + x, s = Math.max(0, b[(x * 7) % 256] - .55) * (y / 256) * 1.6, v = 230 - a[k] * 26 - s * 120; return [cl(v), cl(v), cl(v)]; }); }
  // hullámlemez (konténer): függőleges bordák + kosz
  { const a = noiseField(256, 4, 4, 81); T.corr = fromPixels(256, (x, y) => { const rib = .78 + .22 * Math.sin(x / 256 * Math.PI * 2 * 8), v = (200 - a[y * 256 + x] * 46 - Math.max(0, (y - 200)) * .8) * rib; return [cl(v), cl(v), cl(v * .96)]; }); }
  // drótfonat (alfa-teszt): rombuszháló
  { const n = 128; T.chain = fromPixels(n, (x, y) => { const u = (x + y) % 32, v = (x - y + 128) % 32, on = u < 2.2 || v < 2.2; return on ? [170, 176, 172, 255] : [0, 0, 0, 0]; }); }
  // zsalus szellőzőrács
  { const n = 128; T.grill = fromPixels(n, (x, y) => { const s = y % 16, v = s < 3 ? 40 : s < 12 ? 180 - s * 6 : 70; return [cl(v), cl(v), cl(v)]; }); }
  // fa (íróasztal)
  { const a = noiseField(256, 4, 3, 91); T.wood = fromPixels(256, (x, y) => { const g = .5 + .5 * Math.sin((x / 256 * 40) + a[y * 256 + x] * 8), v = 120 + g * 50; return [cl(v * 1.1), cl(v * .78), cl(v * .5)]; }); }
  // rácspadló (akna)
  { const n = 64; T.grate = fromPixels(n, (x, y) => (x % 16 < 3 || y % 8 < 2) ? [150, 152, 150, 255] : [0, 0, 0, 0]); }
  // vízfelszín normáltérkép (két, eltolva mozgatott réteg)
  { const n = 256, a = noiseField(n, 8, 4, 101), h = (x, y) => a[((y + n) % n) * n + (x + n) % n]; T.waterN = fromPixels(n, (x, y) => { const dx = (h(x + 1, y) - h(x - 1, y)) * 6, dy = (h(x, y + 1) - h(x, y - 1)) * 6; return [cl(128 + dx * 127), cl(128 + dy * 127), 255]; }, false); }
  // zseblámpa-cookie: puha forrófolt + gyűrűk + reflektorszél
  { const n = 128; T.cookie = fromPixels(n, (x, y) => { const d = Math.hypot(x - n / 2, y - n / 2) / (n / 2), v = d > 1 ? 0 : (1 - d * d * .55) * (.92 + .08 * Math.cos(d * 26)) * (d > .82 ? 1 - (d - .82) * 4.5 : 1) + (d < .25 ? .25 * (1 - d / .25) : 0); return [cl(v * 255), cl(v * 248), cl(v * 232)]; }, true); T.cookie.wrapS = T.cookie.wrapT = THREE.ClampToEdgeWrapping; }
  return T;
}

/* ---------- feliratok, matricák (vászonra rajzolva) ---------- */
export function label(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d', { willReadFrequently: true }), w, h); const t = tex(c, true, false); t.anisotropy = 4; return t; }
export function decals() {
  const D = {};
  D.diesel = label(256, 128, (g, w, h) => { g.fillStyle = '#16181b'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = '#ffd23f'; g.font = '900 64px Inter, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DIESEL', w / 2, h / 2 - 8); g.font = '700 20px Inter, Arial'; g.fillText('GÁZOLAJ · EN 590', w / 2, h - 26); });
  D.hgws = label(512, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#e8b656'; g.font = '900 72px Cinzel, Georgia, serif'; g.textBaseline = 'middle'; g.fillText('HGWS', 12, h / 2 - 6); g.fillStyle = '#1d2a3a'; g.font = '700 22px Inter, Arial'; g.fillText('VÍZIKÖZMŰ ÜGYELET · 0–24', 236, h / 2 - 2); });
  D.s1 = label(128, 64, (g, w, h) => { g.fillStyle = '#f2f0e6'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.font = '800 28px Inter, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('=A3+S1', w / 2, h / 2); });
  D.volt = label(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#ffd23f'; g.strokeStyle = '#111'; g.lineWidth = 8; g.beginPath(); g.moveTo(w / 2, 10); g.lineTo(w - 8, h - 14); g.lineTo(8, h - 14); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#111'; g.beginPath(); g.moveTo(70, 40); g.lineTo(50, 78); g.lineTo(66, 78); g.lineTo(56, 104); g.lineTo(82, 66); g.lineTo(66, 66); g.lineTo(78, 40); g.fill(); });
  D.zart = label(256, 192, (g, w, h) => { g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, w, h); g.fillStyle = '#c62a1d'; g.fillRect(0, 0, w, 54); g.fillStyle = '#fff'; g.font = '900 30px Inter, Arial'; g.textAlign = 'center'; g.fillText('VIGYÁZAT!', w / 2, 38); g.fillStyle = '#111'; g.font = '800 22px Inter, Arial'; g.fillText('ZÁRT TÉR – H₂S', w / 2, 92); g.font = '600 16px Inter, Arial'; g.fillText('Belépés csak szellőztetés', w / 2, 128); g.fillText('és gázmérés után!', w / 2, 150); });
  D.atemelo = label(512, 128, (g, w, h) => { g.fillStyle = '#1a3a5c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = '#fff'; g.font = '800 40px Inter, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ÁTEMELŐ 3.', w / 2, 46); g.font = '600 20px Inter, Arial'; g.fillText('Szennyvíz-átemelő telep · Idegeneknek belépni tilos', w / 2, 90); });
  D.marker = label(64, 128, (g, w, h) => { g.fillStyle = '#ffd23f'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.fillRect(0, 22, w, 14); g.fillStyle = '#ddd'; g.fillRect(0, 44, w, 10); g.fillStyle = '#111'; g.font = '900 22px Inter, Arial'; g.textAlign = 'center'; g.fillText('NY', w / 2, 92); });
  D.card = label(128, 80, (g, w, h) => { g.fillStyle = '#f5efe0'; g.fillRect(0, 0, w, h); g.fillStyle = '#5a1a10'; g.font = '700 22px Caveat, cursive'; g.fillText('Sz. Sz.', 14, 46); g.fillStyle = '#e8b656'; g.fillRect(0, h - 8, w, 8); });
  D.screenOff = label(128, 64, (g, w, h) => { g.fillStyle = '#0a0f14'; g.fillRect(0, 0, w, h); });
  D.screenOn = label(256, 128, (g, w, h) => { g.fillStyle = '#04110a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#7fff9a'; g.lineWidth = 3; g.strokeRect(30, 26, 50, 80); g.fillStyle = '#2f7a5a'; g.fillRect(32, 66, 46, 38); g.fillStyle = '#7fff9a'; g.font = '700 14px Courier New, monospace'; ['ÁTEMELŐ 3.', 'LT1  2,1 m', 'P1  ÁLL', 'P2  ÁLL', 'PLC  RUN'].forEach((t, i) => g.fillText(t, 100, 34 + i * 20)); });
  return D;
}

/* ---------- anyagok ---------- */
export function makeMaterials(T, D) {
  const rep = (t, x, y = x) => { const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c; };
  const L = (o) => new THREE.MeshLambertMaterial(o), P = (o) => new THREE.MeshPhongMaterial(o);
  const M = {
    gravel: P({ map: T.gravel, color: 0xb8b8b4, specular: 0x2a2c30, shininess: 40, specularMap: T.wet }),
    grass: L({ map: T.grass, color: 0xffffff }),
    asphalt: P({ map: T.asphalt, color: 0xffffff, specular: 0x3a3e44, shininess: 60, specularMap: T.wet }),
    field: L({ map: T.field }),
    concrete: L({ map: T.concrete }),
    concreteWet: P({ map: T.concrete, color: 0x8a8c86, specular: 0x30343a, shininess: 30 }),
    rust: P({ map: T.rust, specular: 0x222222, shininess: 20 }),
    steel: P({ map: T.paint, color: 0x8d9298, specular: 0x666a70, shininess: 50 }),
    darkSteel: P({ map: T.paint, color: 0x3a3e44, specular: 0x444444, shininess: 40 }),
    galv: P({ map: T.paint, color: 0xa8aeb0, specular: 0x505458, shininess: 35 }),
    yellow: P({ map: T.paint, color: 0xe2a521, specular: 0x333333, shininess: 30 }),
    safety: P({ map: T.paint, color: 0xf2c21c, specular: 0x333333, shininess: 30 }),
    white: P({ map: T.paint, color: 0xe4e6e8, specular: 0x444444, shininess: 40 }),
    cabinet: P({ map: T.paint, color: 0xd6d8d4, specular: 0x333333, shininess: 30 }),
    corr: L({ map: T.corr, color: 0xc9cdb8 }),
    blue: P({ map: T.paint, color: 0x2f5c9a, specular: 0x333333, shininess: 40 }),
    red: P({ map: T.paint, color: 0xb3241a, specular: 0x444444, shininess: 40 }),
    black: P({ color: 0x15171a, specular: 0x222222, shininess: 20 }),
    rubber: L({ color: 0x111214 }),
    plastic: P({ color: 0x2a2e34, specular: 0x333333, shininess: 30 }),
    wood: L({ map: T.wood }),
    trunk: L({ color: 0x3a2a1c }),
    leaves: L({ color: 0x1c3220 }),
    chain: L({ map: T.chain, alphaTest: .5, side: THREE.DoubleSide, color: 0xb9c1bd }),
    grill: L({ map: T.grill, color: 0x6b6050 }),
    grate: L({ map: T.grate, alphaTest: .5, side: THREE.DoubleSide, color: 0x9a9c98 }),
    glass: P({ color: 0x0e151d, specular: 0x8899aa, shininess: 90 }),
    paper: L({ color: 0xe8e2cf }),
    binderR: L({ color: 0x8c2a22 }), binderB: L({ color: 0x23466e }), binderG: L({ color: 0x2f5a34 }),
    diesel: L({ map: D.diesel }), hgws: L({ map: D.hgws, transparent: true, alphaTest: .1 }), s1: L({ map: D.s1 }), volt: L({ map: D.volt, transparent: true, alphaTest: .4 }),
    zart: L({ map: D.zart }), atemelo: L({ map: D.atemelo }), marker: P({ map: D.marker, specular: 0x555555, shininess: 30 }), card: L({ map: D.card })
  };
  // a csempézett textúrák ismétlése (méterenként), hogy a világkoordinátás UV-k jó léptéket adjanak
  for (const k of ['gravel', 'asphalt', 'grass', 'field', 'concrete', 'concreteWet', 'rust', 'corr']) M[k].userData.worldUV = { gravel: .25, asphalt: .3, grass: .2, field: .15, concrete: .5, concreteWet: .5, rust: .7, corr: .6 }[k];
  M.chain.userData.worldUV = .55; M.grill.userData.worldUV = 2.2; M.grate.userData.worldUV = 2; M.wood.userData.worldUV = .8; for (const k of ['steel', 'darkSteel', 'galv', 'yellow', 'safety', 'white', 'cabinet', 'blue', 'red']) M[k].userData.worldUV = .5;
  void rep; return M;
}
