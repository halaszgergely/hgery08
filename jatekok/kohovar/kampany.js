// Kohóvár – a Serpulo-hadjárat: az eredeti szektorok (SectorPresets), a bolygórács (PlanetGrid) és a technológiafa (SerpuloTechTree).
// Az adatok: palyak/serpulo.json (eszkoz/serpulo.py generálja) és palyak/serpulo/*.msav (az eredeti pályák).
import { BLOCKS, UNITS, ITEMS, LIQUIDS, TECH, rcost, ucost } from './adat.js?v=202611271006';
import { LSN, SECSPR } from './kepadat.js?v=202611271006';
import { readMsav, blockOf, itemOf } from './msav.js?v=202611271006';

async function bytes(p) {
  const u = new URL(p, import.meta.url);
  if (u.protocol === 'file:') { const fs = await import('fs'); return fs.readFileSync(u); }
  const r = await fetch(u); if (!r.ok) throw new Error(p + ': ' + r.status); return new Uint8Array(await r.arrayBuffer());
}
export const SERP = JSON.parse(new TextDecoder().decode(await bytes('./palyak/serpulo.json')));
export const EREK = JSON.parse(new TextDecoder().decode(await bytes('./palyak/erekir.json')));
export const TXT = { ...EREK.txt, ...SERP.txt };
export const GRID = SERP.grid;
export const GRIDS = { serpulo: SERP.grid, erekir: EREK.grid };

// tartalom-hivatkozás ('content:duo', 'item:copper', 'liquid:water', 'sector:frontier') → [fajta, kulcs]
export function contentOf(c) {
  if (!c) return null; if (c.indexOf(':') < 0) return contentOf('content:' + c) || contentOf('item:' + c) || contentOf('liquid:' + c);   // a pályák célkitűzéseiben előtag nélküli név
  const i = c.indexOf(':'), k = c.slice(0, i), n = c.slice(i + 1);
  if (k === 'content') { if (n === 'core-shard') return ['b', 'core']; const b = blockOf(n); if (b) return ['b', b]; if (Object.hasOwn(UNITS, n)) return ['u', n]; const it = itemOf(n); if (it) return ['i', it]; return null; }
  if (k === 'item') { const it = itemOf(n); return it ? ['i', it] : null; }
  if (k === 'liquid') { for (const q in LSN) if (LSN[q] === n && LIQUIDS[q]) return ['l', q]; return null; }
  if (k === 'sector') return ['s', n];
  return null;
}
const nodeId = ([k, key]) => k === 'b' ? key : k + ':' + key;

/* ----- szektorok ----- */
const mkSec = pl => p => ({ planet: pl, id: p.id, n: TXT[`sector.${p.id}.name`] || p.id, d: TXT[`sector.${p.id}.description`] || '', gi: p.sector, win: p.captureWave || 0, diff: p.difficulty || 0, p, camp: 'serpulo' });
export const SECTORS = [...SERP.presets.map(mkSec('serpulo')), ...EREK.presets.map(mkSec('erekir'))];
for (const s of SECTORS) SECSPR[s.id] = s.id;
// a rácson nem szereplő (−1) szektor egy szabad csempére kerül
{ const used = new Set(SECTORS.map(s => s.planet + s.gi)); for (const s of SECTORS) if (s.gi < 0) { let g = 200; while (used.has(s.planet + g)) g++; s.gi = g; used.add(s.planet + g); } }

/* ----- technológiafa a Mindustry SerpuloTechTree szerint ----- */
const maker = u => Object.keys(BLOCKS).find(b => (BLOCKS[b].plans || []).includes(u) || Object.values(BLOCKS[b].up || {}).includes(u));
function buildTree(tree, pl, pre, old) {
  const out = [], seen = new Set();
  const walk = (n, parent) => {
    const c = contentOf(n.c); let id = parent;
    if (c && (c[0] !== 'b' || BLOCKS[c[1]]) && (c[0] !== 'u' || UNITS[c[1]])) {
      const rid = nodeId(c); id = pre + rid;
      if (!seen.has(id)) {
        seen.add(id); const [k, key] = c, o = old[rid];
        const need = []; for (const [t, ref] of n.req || []) { if (t === 'OnSector') continue; const r = contentOf(ref); if (r) need.push(pre + nodeId(r)); }
        if (o && o.need && !need.includes(o.need)) need.push(o.need); if (k === 'u' && !o) { const m = maker(key); if (m && !need.includes(pre + m)) need.push(pre + m); }
        out.push({ id, rid, pl, k, key, req: parent, need, cost: k === 'b' ? (o ? o.cost : rcost(BLOCKS[key].cost)) : k === 'u' ? (o ? o.cost : ucost(UNITS[key].cost || {})) : {} });
      }
    }
    for (const ch of n.ch || []) walk(ch, id);
  };
  walk(tree, null); if (out[0]) out[0].req = null;
  return { out, seen };
}
export function buildTech() {
  const old = Object.fromEntries(TECH.map(t => [t.id, t])), { out, seen } = buildTree(SERP.tree, 'serpulo', '', old), er = buildTree(EREK.tree, 'erekir', 'E/', {}).out;
  // ami csak a Kohóvárban (vagy modban) van, a régi helyére kerül
  for (const t of TECH) if (!seen.has(t.id) && t.k !== 's') { seen.add(t.id); out.push({ ...t, req: seen.has(t.req) ? t.req : 'core', need: t.need ? [t.need] : [] }); }
  TECH.length = 0; TECH.push(...out, ...er);
}
export const TECH_ROOT = { serpulo: 'core', erekir: 'E/bastion' };
buildTech();

/* ----- pálya betöltése ----- */
export const PLANETS = [{ id: 'serpulo', n: TXT['planet.serpulo.name'] || 'Serpulo', col: '#7f9cc8' }, { id: 'erekir', n: TXT['planet.erekir.name'] || 'Erekir', col: '#ed6542' }];
// a modok szektorai: a megadott bolygóra (vagy a Serpulóra) kerülnek, a rács szabad csempéjére
export function addModSectors(list, planets) {
  for (const p of planets) if (!PLANETS.some(q => q.id === p.id)) PLANETS.push(p);
  for (const s of list) {
    if (SECTORS.some(q => q.id === s.id)) continue; if (!PLANETS.some(p => p.id === s.planet)) PLANETS.push({ id: s.planet, n: s.planet, col: '#9c7fc8' });
    const used = new Set(SECTORS.filter(q => (q.planet || 'serpulo') === s.planet).map(q => q.gi)); let g = s.gi >= 0 && s.gi < GRID.length && !used.has(s.gi) ? s.gi : 0; while (used.has(g)) g = (g + 37) % GRID.length;
    SECTORS.push({ ...s, gi: g }); SECSPR[s.id] = s.id;
  }
}
const MAPS = {};
export async function loadMap(id) { const s = SECTORS.find(q => q.id === id); return MAPS[id] || (MAPS[id] = await readMsav(s && s.mapBytes ? s.mapBytes : await bytes(`./palyak/${s && s.planet === 'erekir' ? 'erekir' : 'serpulo'}/${id}.msav`))); }
// a pályához tartozó szövegek: az alapnyelv, a mod nyelvi fájlja, a pálya saját fordításai (MapLocales)
export function textsFor(s, m) { const o = { ...TXT, ...(s.txt || {}) }; try { const L = JSON.parse(m.meta.locales || '{}'); Object.assign(o, L.en || {}, L.hu || {}); } catch (_) { } return o; }
// a szektorleíró a World számára
export function sectorFor(s, m) {
  const R = m.rules, P = s.p, ws = R.waveSpacing || 7200;
  return {
    id: s.id, n: s.n, d: s.d, camp: 'serpulo', planet: s.planet || 'serpulo', map: m, w: m.w, h: m.h, fog: R.fog ? 1 : 0, rules: { ...R, objectives: undefined, spawns: undefined },
    groups: R.spawns || [], win: P.captureWave || R.winWave || 0, attack: !!R.attackMode, wsm: 1,
    wt0: R.initialWaveSpacing > 0 ? R.initialWaveSpacing : ws * (P.startWaveTimeMultiplier ?? 2), wt: ws / 60,
    start: Object.fromEntries((R.loadout || []).map(l => [itemOf(l.item) || l.item, l.amount]).filter(([k]) => ITEMS[k])),
  };
}
