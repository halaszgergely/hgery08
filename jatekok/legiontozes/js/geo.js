/* Domborzat és felszín.
   - Országos alap: a Mozdonyvezető tájadatai (../vasut/taj.json 1 km-es domborzat, taj_osztaly.png 250 m-es felszínosztály:
     0 mező, 1 erdő, 2 beépített, 3 víz, 4 országon kívül).
   - Részletes domborzat: AWS Terrain Tiles (Terrarium PNG, kulcs nélkül), a gép körül dinamikusan, memóriás LRU-cache-sel.
   - Ha egy csempe nem tölthető be, az alap domborzat + determinisztikus zaj a tartalék.
   - A repülőterek környéke kisimítva (fix magasság), hogy a pálya sík legyen. */
import { KX, KY, LON0, LAT0, REPTEREK, W_MAX, H_MAX } from './config.js?v=202611241921';

// saját domborzati csempék (tools/legi_dem.py, Viewfinder Panoramas 3") Magyarországra; azon kívül az AWS Terrain Tiles
const TZ = 10, LOCAL = [557, 577, 352, 365], TILE_URL = (z, x, y) => x >= LOCAL[0] && x <= LOCAL[1] && y >= LOCAL[2] && y <= LOCAL[3] ? new URL(`../dem/${z}/${x}/${y}.png`, import.meta.url).href : `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
let Z = null, ZN = 0, ZM = 0, ZC = 1000, CLS = null, CW = 0, CH = 0, CR = 250, towns = [];
export const G = 125;   // a közeli rács lépésköze (m) – a fizika ugyanezen a rácson számolja a talajt, mint amit a terep kirajzol

export function hash2(a, b) { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, z) { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1); return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz; }

export async function load(base) {
  const [t, img] = await Promise.all([fetch(base + 'taj.json').then(r => r.json()), new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = base + 'taj_osztaly.png'; })]);
  const bin = atob(t.z.b), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  Z = new Uint16Array(u.buffer); ZN = t.z.nx; ZM = t.z.ny; ZC = t.z.c; CR = t.R;
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data; CW = c.width; CH = c.height; CLS = new Uint8Array(CW * CH); for (let i = 0; i < CLS.length; i++) CLS[i] = Math.round(d[i * 4] / 50);
  towns = t.tw; MEGYE = t.m; for (const r of REPTEREK) r.elev = Math.round(demBase(r.x, r.z)) + (r.tip === 'viz' ? 0 : 1);
  return { towns };
}
export const ready = () => !!Z;
let MEGYE = {}; export const megyek = () => MEGYE;
export const townList = () => towns;

function demBase(x, z) { if (!Z) return 100;
  const fx = Math.max(0, Math.min(ZN - 1.001, x / ZC)), fz = Math.max(0, Math.min(ZM - 1.001, z / ZC)), ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, i = iz * ZN + ix;
  return (Z[i] * (1 - tx) + Z[i + 1] * tx) * (1 - tz) + (Z[i + ZN] * (1 - tx) + Z[i + ZN + 1] * tx) * tz; }
export function cls(x, z) { if (!CLS) return 0; const ix = Math.floor(x / CR), iz = Math.floor(z / CR); if (ix < 0 || iz < 0 || ix >= CW || iz >= CH) return 4; return CLS[iz * CW + ix]; }
export const isWater = (x, z) => cls(x, z) === 3;
// a vízfelület mérete (nagy tó: Balaton, Tisza-tó, Velencei-tó, Fertő) – a 747 csak nagy tavon vesz fel vizet
export function bigWater(x, z) { if (!isWater(x, z)) return false; let n = 0; for (let a = 0; a < 8; a++) { const r = 2600, s = Math.sin(a * .785), c = Math.cos(a * .785); if (isWater(x + s * r, z + c * r)) n++; } return n >= 5; }

/* ---- Terrarium csempék ---- */
const tiles = new Map(); let inflight = 0; const listeners = []; export const onTile = f => listeners.push(f);
const lon2t = (lon, n) => (lon + 180) / 360 * n, lat2t = (lat, n) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n; };
export let tileStats = { ok: 0, fail: 0, req: 0 }, tilesOn = true;
export function setTilesOn(v) { tilesOn = !!v; }
function tileKey(tx, ty) { return tx * 4096 + ty; }
export function tileBounds(tx, ty) { const n = 1 << TZ, lonA = tx / n * 360 - 180, lonB = (tx + 1) / n * 360 - 180, t2l = t => Math.atan(Math.sinh(Math.PI * (1 - 2 * t / n))) * 180 / Math.PI;
  const latA = t2l(ty), latB = t2l(ty + 1); return [(lonA - LON0) * KX, (LAT0 - latA) * KY, (lonB - LON0) * KX, (LAT0 - latB) * KY]; }
function fetchTile(tx, ty) { const k = tileKey(tx, ty); if (tiles.has(k)) { const t = tiles.get(k); t.used = performance.now(); return; }
  const t = { st: 0, used: performance.now(), h: null }; tiles.set(k, t); inflight++; tileStats.req++;
  const img = new Image(); img.crossOrigin = 'anonymous';
  img.onload = () => { try { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, 256, 256).data, h = new Float32Array(65536); for (let i = 0; i < 65536; i++) h[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768;
      t.h = h; t.st = 1; tileStats.ok++; } catch (_) { t.st = -1; tileStats.fail++; } inflight--; const b = tileBounds(tx, ty); for (const f of listeners) f(b); };
  img.onerror = () => { t.st = -1; tileStats.fail++; inflight--; };
  img.src = TILE_URL(TZ, tx, ty); }
// a gép körüli csempék kérése (r méteres sugárban), a távoliak kidobása a memóriából
export function requestAround(x, z, r) { if (!tilesOn) return; const n = 1 << TZ;
  const [lA, aA] = [LON0 + (x - r) / KX, LAT0 - (z - r) / KY], [lB, aB] = [LON0 + (x + r) / KX, LAT0 - (z + r) / KY];
  const x0 = Math.floor(lon2t(lA, n)), x1 = Math.floor(lon2t(lB, n)), y0 = Math.floor(lat2t(aA, n)), y1 = Math.floor(lat2t(aB, n));
  const cx = lon2t(LON0 + x / KX, n), cy = lat2t(LAT0 - z / KY, n), want = [];
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) want.push([Math.hypot(tx + .5 - cx, ty + .5 - cy), tx, ty]);
  want.sort((a, b) => a[0] - b[0]); for (const [, tx, ty] of want) { if (inflight >= 4) break; fetchTile(tx, ty); }
  for (const [, tx, ty] of want) { const t = tiles.get(tileKey(tx, ty)); if (t) t.used = performance.now(); }
  if (tiles.size > 72) { const arr = [...tiles.entries()].sort((a, b) => a[1].used - b[1].used); for (let i = 0; i < arr.length - 60; i++) if (arr[i][1].st !== 0) tiles.delete(arr[i][0]); } }
export const tileCount = () => tiles.size;
// betöltődött-e már (vagy véglegesen hiányzik-e) a pont alatti domborzati csempe – az utak, épületek csak utána épülnek
export function tileReady(x, z) { if (!tilesOn) return true; const n = 1 << TZ, tx = Math.floor(lon2t(LON0 + x / KX, n)), ty = Math.floor(lat2t(LAT0 - z / KY, n)), t = tiles.get(tileKey(tx, ty)); return !!t && t.st !== 0; }
function tileH(x, z) { const n = 1 << TZ, lon = LON0 + x / KX, lat = LAT0 - z / KY, fx = lon2t(lon, n), fy = lat2t(lat, n), tx = Math.floor(fx), ty = Math.floor(fy);
  const t = tiles.get(tileKey(tx, ty)); if (!t || t.st !== 1) return null;
  const px = Math.min(254.999, Math.max(0, (fx - tx) * 256 - .5)), py = Math.min(254.999, Math.max(0, (fy - ty) * 256 - .5)), ix = px | 0, iy = py | 0, ax = px - ix, ay = py - iy, h = t.h, i = iy * 256 + ix;
  return (h[i] * (1 - ax) + h[i + 1] * ax) * (1 - ay) + (h[i + 256] * (1 - ax) + h[i + 257] * ax) * ay; }

/* ---- a nyers magasság egy pontban (a repterek kisimítva) ---- */
function rawH(x, z) {
  let h = tileH(x, z);
  if (h === null || h < -50) { h = demBase(x, z); const hill = Math.max(0, Math.min(1, (h - 120) / 250)); h += (vnoise(x / 900, z / 900) - .5) * 30 * hill + (vnoise(x / 260 + 9, z / 260) - .5) * 9 * hill; }
  if (x < 0 || z < 0 || x > W_MAX || z > H_MAX) h = Math.max(h, 80);
  return h; }
export function heightAt(x, z) {
  let h = rawH(x, z);
  for (let i = 0; i < REPTEREK.length; i++) { const r = REPTEREK[i]; const dx = x - r.x, dz = z - r.z; if (dx > 4000 || dx < -4000 || dz > 4000 || dz < -4000) continue;
    const a = dx * r.dx + dz * r.dz, b = -dx * r.dz + dz * r.dx, hl = r.len / 2 + (r.tip === 'heli' ? 90 : 450), hw = r.fo ? 600 : r.tip === 'beton' ? r.wid / 2 + 430 : r.tip === 'heli' ? 90 : Math.max(r.wid / 2 + 200, 230);
    const ex = Math.max(0, Math.abs(a) - hl), ey = Math.max(0, Math.abs(b) - hw), d = Math.hypot(ex, ey);
    if (d < 700) { const k = d / 700, s = k * k * (3 - 2 * k), e = r.tip === 'viz' ? Math.min(h, r.elev) : r.elev; h = e + (h - e) * s; } }
  return h; }

/* a rács szerinti talajmagasság: pontosan az, amit a terep-háló mutat (két háromszög egy cellában, a / átló mentén) */
const gcache = new Map(); let gcN = 0;
function gridH(ix, iz) { const k = ix * 100000 + iz; let v = gcache.get(k); if (v === undefined) { v = heightAt(ix * G, iz * G); if (++gcN > 60000) { gcache.clear(); gcN = 0; } gcache.set(k, v); } return v; }
export function clearGridCache(b) { if (!b) { gcache.clear(); gcN = 0; return; } for (const k of gcache.keys()) { const ix = Math.floor(k / 100000), iz = k - ix * 100000, x = ix * G, z = iz * G; if (x >= b[0] - G && x <= b[2] + G && z >= b[1] - G && z <= b[3] + G) gcache.delete(k); } }
export function ground(x, z) { const fx = x / G, fz = z / G, ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
  const a = gridH(ix, iz), b = gridH(ix + 1, iz), c = gridH(ix, iz + 1), d = gridH(ix + 1, iz + 1);
  return tx + tz < 1 ? a + (b - a) * tx + (c - a) * tz : d + (c - d) * (1 - tx) + (b - d) * (1 - tz); }
export function groundNormal(x, z, out) { const e = 20, hx = ground(x + e, z) - ground(x - e, z), hz = ground(x, z + e) - ground(x, z - e); out.set(-hx, 2 * e, -hz).normalize(); return out; }

// melyik reptér, és milyen felszín van egy pontban (fizika: hol lehet leszállni)
export function surfaceAt(x, z) {
  for (const r of REPTEREK) { const dx = x - r.x, dz = z - r.z; if (Math.abs(dx) > 3000 || Math.abs(dz) > 3000) continue;
    const a = dx * r.dx + dz * r.dz, b = -dx * r.dz + dz * r.dx;
    if (r.tip === 'heli' || r.tip === 'arboc') { if (Math.hypot(dx, dz) < 60) return { tip: 'heli', r }; continue; }
    if (Math.abs(a) < r.len / 2 + 30 && Math.abs(b) < r.wid / 2 + 8) return { tip: r.tip === 'viz' ? 'viz' : r.tip, r, nagy: r.meret === 'nagy', a, b };
    if (r.heli && Math.abs(a) < r.len / 2 + 400 && Math.abs(b) < r.wid / 2 + 300) return { tip: 'apron', r }; }
  const c = cls(x, z); return { tip: c === 3 ? 'viz' : c === 1 ? 'erdo' : c === 2 ? 'varos' : 'terep' };
}
export function inAirport(x, z) { for (const r of REPTEREK) { if (r.tip === 'viz') continue; const dx = x - r.x, dz = z - r.z; if (dx > 3000 || dx < -3000 || dz > 3000 || dz < -3000) continue;
  const a = dx * r.dx + dz * r.dz, b = -dx * r.dz + dz * r.dx; if (Math.abs(a) < r.len / 2 + (r.tip === 'heli' ? 60 : 380) && Math.abs(b) < (r.fo ? 560 : r.tip === 'beton' ? r.wid / 2 + 400 : r.tip === 'heli' ? 60 : Math.max(r.wid / 2 + 150, 190))) return true; } return false; }
export function nearestAirport(x, z, ok) { let best = null, bd = 1e18; for (const r of REPTEREK) { if (ok && !ok(r)) continue; const d = Math.hypot(x - r.x, z - r.z); if (d < bd) { bd = d; best = r; } } return best; }
