/* Gazdaság: mentés, fuvarpiac, díjazás, tankolás, ballontöltés, járművásárlás. Tiszta függvények + a mentés objektum. */
import { GAZD, JARMU } from './config.js?v=202611231328';

export const UJ_MENTES = () => ({ v: 1, penz: GAZD.kezdoPenz, flotta: [], aktiv: null, szin: {}, uzemanyag: {}, fuvarok: 0, legjobb: 0, kiomlott: 0, km: 0, elso: false, hirnev: 50, kezdes: null, set: {}, piac: null, munka: null, dolgozok: [], dolgFuvar: 0 });
const rnd = Math.random;
export function fuvarDij(km, n, hirnev = 50) { return Math.round((GAZD.fuvarAlap + km * GAZD.fuvarKm + n * GAZD.fuvarBallon) * (.85 + hirnev / 333) / 10) * 10; }
/* fuvarpiac: 6 ajánlat a célok közül; az első fuvar mindig a HGWS iroda */
export function ujPiac(D, save, maxBallon) { const T = D.telephely, out = [];
  if (!save.elso) return [{ id: 'elso', nev: D.hgwsIroda.nev, t: 'iroda', n: 1, px: D.hgwsIroda.px, pz: D.hgwsIroda.pz, x: D.hgwsIroda.x, z: D.hgwsIroda.z, km: Math.round(dist(T, D.hgwsIroda) / 100) / 10, dij: GAZD.elsoFuvar, hatarido: 600, elso: 1 }];
  const pool = D.celok.slice().sort(() => rnd() - .5);
  for (const c of pool) { if (out.length >= 6) break; const km = dist(T, c) / 1000; if (maxBallon <= 2 && km > 6) continue;
    const n = c.t === 'iroda' ? Math.max(1, Math.min(maxBallon, 1 + Math.floor(rnd() * Math.min(maxBallon, 8)))) : Math.max(1, Math.min(maxBallon, 1 + Math.floor(rnd() * 3)));
    out.push({ id: 'f' + Math.floor(rnd() * 1e9), nev: c.nev, t: c.t, n, px: c.px, pz: c.pz, x: c.x, z: c.z, km: Math.round(km * 10) / 10, dij: fuvarDij(km, n, save.hirnev), hatarido: Math.round(120 + km * 140 + n * 20) }); }
  return out.sort((a, b) => a.km - b.km); }
const dist = (a, b) => Math.hypot((a.px ?? a.x) - (b.px ?? b.x), (a.pz ?? a.z) - (b.pz ?? b.z)) * 1.3;   // úthossz becslés: légvonal × 1,3
/* kifizetés lerakáskor: késés és sérülés levonással; a pontszám a legjobb-fuvar listához */
export function elszamol(job, eltelt, serules) { let dij = job.dij, lev = []; if (eltelt > job.hatarido) { const k = Math.round(dij * GAZD.keses); dij -= k; lev.push(['Késés', k]); }
  if (serules > .02) { const k = Math.round(job.dij * GAZD.serules * Math.min(1, serules)); dij -= k; lev.push(['Sérült rakomány / jármű', k]); }
  dij = Math.max(Math.round(job.dij * .15), dij); const pont = Math.round(dij * (eltelt <= job.hatarido ? 1.2 : .8) * (1 - Math.min(.8, serules)));
  return { dij, lev, pont }; }
export const tankolasAr = (J, liter) => Math.round(liter * (GAZD.benzinAr + (J.keverek ? GAZD.keverekFelar : 0)));
export function vagyon(save) { return Math.max(0, Math.round(save.penz + save.flotta.reduce((s, f) => s + (JARMU[f.id]?.ar || 0) * .6, 0))); }
