/* Alkalmazottak: felvehető sofőrök, akik a flotta egy járművével önállóan fuvaroznak.
   A fuvarok valós időben telnek (gyorsítva); a cég a díjból levonja a ballonokat, az üzemanyagot és a sofőr jutalékát. */
import { JARMU, GAZD } from './config.js?v=202611271028';
import { fuvarDij } from './gazdasag.js?v=202611271028';

export const MAX_DOLGOZO = 6;
const VNEV = ['Kovács', 'Szabó', 'Tóth', 'Nagy', 'Horváth', 'Varga', 'Kiss', 'Molnár', 'Németh', 'Farkas', 'Balogh', 'Papp', 'Takács', 'Juhász', 'Lakatos', 'Mészáros', 'Oláh', 'Simon', 'Rácz', 'Fekete'];
const KNEV = ['Béla', 'Jóska', 'Feri', 'Laci', 'Pista', 'Gyuri', 'Zoli', 'Tibi', 'Sanyi', 'Karcsi', 'Erzsi', 'Marika', 'Juci', 'Kati', 'Ildi', 'Panni', 'Gizi', 'Bözsi', 'Attila', 'Dezső'];
const IDO = .3;            // a fuvarok ennyiszer gyorsabban telnek a valós menetidőnél
const PIHENO = 25e3, CATCHUP = 30 * 60e3;
const pick = a => a[Math.floor(Math.random() * a.length)];

export function jeloltek(save, now = Date.now()) {
  if (save.jeloltek && now < (save.jeloltT || 0)) return save.jeloltek;
  save.jeloltek = Array.from({ length: 3 }, () => { const szint = 1 + Math.floor(Math.random() ** 1.6 * 5);
    return { id: 'd' + Math.floor(Math.random() * 1e9), nev: pick(VNEV) + ' ' + pick(KNEV), szint, jutalek: Math.round((.2 + szint * .04) * 100) / 100, felvetel: 1500 * szint }; });
  save.jeloltT = now + 15 * 60e3; return save.jeloltek; }

export const peldany = (save, id) => save.flotta.filter(f => f.id === id).length;
export const foglalt = (save, id, kiveve) => save.dolgozok.filter(d => d.jarmu === id && d !== kiveve).length;
/* szabad-e az adott jármű egy sofőrnek (a játékos járművét is beleszámolva) */
export const szabad = (save, id, kiveve) => peldany(save, id) - foglalt(save, id, kiveve) - (save.aktiv === id ? 1 : 0) > 0;

function indul(e, save, D, t) { const J = JARMU[e.jarmu], T = D.telephely, moped = J.fiz === 'moped', maxKm = moped ? 6 : 14;
  const jo = D.celok.filter(c => { const km = Math.hypot(c.px - T.x, c.pz - T.z) / 1000; return km > .4 && km <= maxKm; }); if (!jo.length) return;
  const c = pick(jo), km = Math.round(Math.hypot(c.px - T.x, c.pz - T.z) / 100) / 10, n = Math.max(1, Math.min(J.ballon, c.t === 'iroda' ? 1 + Math.floor(Math.random() * Math.min(J.ballon, 8)) : 1 + Math.floor(Math.random() * 3)));
  const ido = (2 * km / (moped ? 28 : 45) * 3600e3 * IDO + 60e3) * (1.15 - e.szint * .05);
  e.job = { nev: c.nev, px: c.px, pz: c.pz, km, n, start: t, vege: t + ido }; }

function vegez(e, save) { const j = e.job, J = JARMU[e.jarmu]; e.job = null;
  const hiba = Math.random() < .12 - e.szint * .02, uzem = j.km * 2 * J.fogy / 100 * (GAZD.benzinAr + (J.keverek ? GAZD.keverekFelar : 0)), ktg = j.n * GAZD.ballonAr + uzem;
  if (hiba) { const net = -Math.round(ktg); save.penz += net; save.hirnev = Math.max(0, save.hirnev - 1); e.bevetel += net; return { e, j, net, hiba: true }; }
  const dij = fuvarDij(j.km, j.n, save.hirnev) * (.85 + e.szint * .05), net = Math.round(dij * (1 - e.jutalek) - ktg);
  save.penz += net; e.fuvarok++; e.bevetel += net; save.dolgFuvar = (save.dolgFuvar || 0) + 1; return { e, j, net, hiba: false }; }

/* léptetés: lezárja a lejárt fuvarokat és újakat indít; kimaradt időt (pl. a játék bezárása után) legfeljebb 30 percig pótol */
export function lepes(save, D, now = Date.now()) { const kesz = [];
  for (const e of save.dolgozok || []) { if (!e.jarmu) continue; let t = Math.max(e.pihen || 0, now - CATCHUP);
    for (let g = 0; g < 40; g++) { if (e.job) { if (e.job.vege > now) break; t = Math.max(e.job.vege, now - CATCHUP); kesz.push(vegez(e, save)); e.pihen = t + PIHENO; t = e.pihen; }
      if (t > now) break; indul(e, save, D, t); if (!e.job) break; } }
  return kesz; }

/* hol jár most a sofőr (térképhez): oda-vissza egyenes vonalon */
export function hely(e, D, now = Date.now()) { const T = D.telephely; if (!e.job) return [T.x, T.z];
  const f = Math.min(1, Math.max(0, (now - e.job.start) / (e.job.vege - e.job.start))), k = f < .5 ? f * 2 : 2 - f * 2; return [T.x + (e.job.px - T.x) * k, T.z + (e.job.pz - T.z) * k]; }

export function allapot(e, now = Date.now()) { if (!e.jarmu) return 'Nincs járműve'; if (!e.job) return 'A telephelyen vár';
  const left = Math.max(0, e.job.vege - now) / 1000, f = (now - e.job.start) / (e.job.vege - e.job.start); return `${f < .5 ? 'Úton ide' : 'Visszafelé innen'}: ${e.job.nev} · ${e.job.n} ballon · még ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`; }
