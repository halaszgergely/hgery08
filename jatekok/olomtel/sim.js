/* ÓLOMTÉL – szimuláció (DOM nélkül, node-ban is fut). Idő: játékóra; a step(dt) dt-je is óra. */
import { M, U, FOLY, SZIL, KESZLET, IMPORT, TECH, REAKTOR, GOZ_NEVL, RENDELES, NAPOK, homerseklet } from './adat.js?v=202611282048';

export const W = 60, H = 60;
export const CSOKAP = 60;                 // egy vezeték áteresztése, t/óra
const AGGREGATOR = 6;                     // tartalék dízelaggregátor, MW – ettől soha nem áll le minden
const KAZAN_TUZ = { gaz: 2, pakura: 2, nygazolaj: 2, szen: 3 };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const mkRnd = s => () => (s = (s * 16807) % 2147483647) / 2147483647;

const FELADAT = [
  { n: 'Olajkút üzembe állítása', ok: s => s.units.some(u => u.t === 'olajkut' && u.fut > .3) },
  { n: 'Atmoszférikus torony beindítása', ok: s => s.units.some(u => u.t === 'atm' && u.fut > .3) },
  { n: 'Első üzemanyag-szállítmány', ok: s => (s.leadva.benzin || 0) + (s.leadva.pakura || 0) > 0 },
  { n: 'Tervezőintézet', ok: s => s.units.some(u => u.t === 'kutato' && u.ep >= 1) },
  { n: 'Reaktor: főkeringtető szivattyú', ok: s => s.r.lvl >= 1 },
  { n: 'Hőközpont a lakótelepen', ok: s => s.units.some(u => u.t === 'hokozp' && u.fut > .5) },
  { n: 'Dízel gyártása', ok: s => s.units.some(u => u.t === 'kenment' && u.fut > .3) },
  { n: 'Reaktor: hermetikus védőépület', ok: s => s.r.lvl >= 2 },
  { n: 'Nyersvas csapolása', ok: s => s.units.some(u => u.t === 'koho' && u.fut > .3) },
  { n: 'Acéláru hengerlése', ok: s => s.units.some(u => u.t === 'hengermu' && u.fut > .3) },
  { n: 'A Mélypont túlélése', ok: s => s.nap > NAPOK }
];
export const DONTES = {
  menekult: { nap: 3, ora: 12, c: 'Menekültek a peronon', s: 'Egy leállt szerelvényről negyven ember kér bebocsátást. Szállás és élelem nincs elég.', a: 'Befogadjuk őket', b: 'Továbbküldjük őket' },
  kvota:    { nap: 9, ora: 10, c: 'Távirat a Főigazgatóságtól', s: 'A front üzemanyagot kér. Másfélszeres rendelés a mostani időszakra, cserébe soron kívüli kiutalás.', a: 'Vállaljuk', b: 'Nem bírjuk' },
  fosztog:  { nap: 16, ora: 22, c: 'Feltört vagonok', s: 'Éjjel megdézsmálták az élelmiszervagont. A tetteseket ismerik a szállón.', a: 'Példát statuálunk', b: 'Szemet hunyunk' },
  mernok:   { nap: 22, ora: 9, c: 'A főmérnök javaslata', s: 'A Mélypont előtt a blokk védelmi korlátait ki lehetne iktatni. Több hő, nagyobb kockázat.', a: 'Kiiktatjuk', b: 'Marad a korlát' }
};

export class Sim {
  constructor(save) { this.naplo = []; if (save) this.betolt(save); else this.uj(); }

  /* ---------- új játék, térkép ---------- */
  uj() {
    this.seed = 20261128; this.t = 6; this.nid = 1; this.units = []; this.links = [];
    this.stock = { acel: 340, beton: 320, alk: 90, elelem: 400 }; this.kredit = 150; this.rak = {}; this.megr = {}; this.leadva = {};
    this.nep = 80; this.beteg = 2; this.halott = 0; this.remeny = 50; this.eleg = 20; this.lazad = 0;
    this.tech = {}; this.kut = null; this.kutP = 0; this.torv = {}; this.torvT = 0;
    this.r = { lvl: 0, set: 1, tul: 0, stressz: 0, all: 0, jav: null, korlat: 1, scram: 0 };
    this.rend = { i: 0, t: {}, szorzo: 1 }; this.fel = 0; this.dontes = null; this.dontve = {}; this.vege = null; this.gyozott = 0;
    this.genTerkep(); this.kezdo(); this.hoTerkep(); this.allapot(0);
  }
  genTerkep() {
    const R = mkRnd(this.seed), N = W * H; this.terr = new Uint8Array(N); this.dep = new Uint8Array(N); this.occ = new Int32Array(N); this.ho = new Int8Array(N);
    for (let y = 0; y < H; y++) { const cx = Math.round(6 + 2.5 * Math.sin(y / 8) + 1.5 * Math.sin(y / 3.1)); for (let x = cx - 1; x <= cx + 1; x++) this.terr[y * W + x] = 1; }   // folyó
    for (let x = 0; x < W; x++) if (this.terr[55 * W + x] !== 1) this.terr[55 * W + x] = 2;                                                                                   // vasút
    const folt = (cx, cy, r, d) => { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (x >= 0 && y >= 0 && x < W && y < H && Math.hypot(x - cx, y - cy) <= r + R() * .8 - .4 && !this.terr[y * W + x]) this.dep[y * W + x] = d; };
    folt(45, 13, 3, 1); folt(51, 31, 3, 1); folt(40, 22, 2, 1);          // olaj
    folt(47, 44, 4, 2); folt(17, 46, 4, 3); folt(21, 9, 3, 4);            // szén, vasérc, mészkő
    for (let i = 0; i < 26; i++) {                                         // romok: a háború előtti város maradványai
      const x = 10 + Math.floor(R() * 44), y = 3 + Math.floor(R() * 48), w = 1 + Math.floor(R() * 3), h = 1 + Math.floor(R() * 2);
      if (Math.hypot(x - 29, y - 29) < 11) continue;
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { const k = yy * W + xx; if (xx < W && yy < H && !this.terr[k] && !this.dep[k] && yy < 52) this.terr[k] = 3; }
    }
  }
  kezdo() {
    const kesz = (t, x, y, rot = 0) => { const u = this.mk(t, x, y, rot); u.ep = 1; return u; };
    const re = kesz('reaktor', 27, 27), al = kesz('allomas', 26, 51), tu = kesz('turbina', 27, 34); tu.mel = 1; tu.volt = 1;
    let fx = 0; while (this.terr[29 * W + fx] !== 1 || this.terr[29 * W + fx + 1] === 1) fx++;
    const vk = kesz('vizkivet', fx + 1, 29); kesz('szallo', 34, 27); kesz('szallo', 34, 30);
    this.kot(vk.id, 0, re.id, 1).trace = 1; this.kot(re.id, 0, tu.id, 1);
    re.b[0].m = 'viz'; re.b[0].q = 60;
  }

  /* ---------- egységek ---------- */
  meret(t, rot) { const d = U[t]; return rot & 1 ? [d.h, d.w] : [d.w, d.h]; }
  mk(t, x, y, rot = 0) {
    const d = U[t], u = { id: this.nid++, t, x, y, rot, hp: 1, ep: 0, on: 1, prio: 2, mel: 0, volt: 0, fut: 0, fo: 0, all: 'epul' };
    if (d.tar) { const b = { m: null, q: 0 }; u.b = [b]; u.k = [b]; }
    else { u.b = d.be.map(() => ({ m: null, q: 0 })); u.k = d.ki.map(p => ({ m: p.m, q: 0 })); }
    const [w, h] = this.meret(t, rot); for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.occ[yy * W + xx] = u.id;
    this.units.push(u); return u;
  }
  get(id) { return this.units.find(u => u.id === id); }
  kozep(u) { const [w, h] = this.meret(u.t, u.rot); return [u.x + w / 2, u.y + h / 2]; }
  beCap(u, i) { const d = U[u.t]; if (d.tar) return d.cap; const p = d.be[i]; return p.cap || Math.max(20, p.r * 8); }
  kiCap(u, i) { const d = U[u.t]; if (d.tar) return d.cap; return Math.max(20, d.ki[i].r * 8); }
  // lerakható-e: '' ha igen, különben az ok
  lehet(t, x, y, rot = 0) {
    const d = U[t], [w, h] = this.meret(t, rot); let lel = false, part = false; const kod = { olaj: 1, szen: 2, erc: 3, mesz: 4 }[d.kell];
    if (x < 0 || y < 0 || x + w > W || y + h > H) return 'A térképen kívül';
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { const k = yy * W + xx; if (this.terr[k] || this.occ[k]) return 'Foglalt terület'; if (kod && this.dep[k] === kod) lel = true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = xx + dx, ny = yy + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && this.terr[ny * W + nx] === 1) part = true; } }
    if (kod && !lel) return 'Lelőhelyre kell építeni'; if (d.kell === 'folyo' && !part) return 'A folyópartra kell építeni';
    return '';
  }
  vanRa(c, sz = 1) { return Object.entries(c || {}).every(([k, v]) => this.stock[k] >= v * sz); }
  fizet(c, sz = 1) { for (const [k, v] of Object.entries(c || {})) this.stock[k] -= v * sz; }
  epit(t, x, y, rot = 0) {
    const d = U[t]; if (d.fix) return 'Nem építhető'; if (d.tech && !this.tech[d.tech]) return 'Előbb ki kell fejleszteni';
    const e = this.lehet(t, x, y, rot); if (e) return e; if (!this.vanRa(d.c)) return 'Nincs elég építőanyag';
    this.fizet(d.c); return this.mk(t, x, y, rot);
  }
  bont(u) {
    const d = U[u.t]; if (d.fix) return 'Nem bontható';
    for (const L of this.links.filter(L => L.a === u.id || L.b === u.id)) this.old(L.id);
    for (const [k, v] of Object.entries(d.c || {})) this.stock[k] += Math.floor(v * .5 * Math.min(1, u.ep + .2));
    const [w, h] = this.meret(u.t, u.rot); for (let yy = u.y; yy < u.y + h; yy++) for (let xx = u.x; xx < u.x + w; xx++) this.occ[yy * W + xx] = 0;
    this.units.splice(this.units.indexOf(u), 1); this.hoTerkep(); return '';
  }
  romBont(x, y) { const k = y * W + x; if (this.terr[k] !== 3) return false; this.terr[k] = 0; this.stock.acel += 3; this.stock.beton += 4; return true; }
  javit(u) { const ar = { alk: Math.ceil(2 + (1 - u.hp) * ((U[u.t].c || {}).alk || 10) * .6) }; if (u.hp >= 1) return ''; if (!this.vanRa(ar)) return 'Nincs elég alkatrész (' + ar.alk + ')'; this.fizet(ar); u.hp = 1; return ''; }

  /* ---------- vezetékek ---------- */
  // a kimenő csatlakozó anyaga (tartálynál a benne lévő, üresen bármi a fajtájából)
  kiAnyag(u, ap) { const d = U[u.t]; if (d.tar) return u.k[0].q > .01 && u.k[0].m ? [u.k[0].m] : (d.tar === 'f' ? FOLY : SZIL); return [d.ki[ap].m]; }
  beAcc(u, i) { const d = U[u.t]; return d.tar ? (d.tar === 'f' ? FOLY : SZIL) : d.be[i].acc; }
  // melyik bemenetre köthető az a egység ap kimenete a b egységen (−1: sehova)
  celPort(a, ap, b) {
    if (a === b || M[this.kiAnyag(a, ap)[0]].k === 'r') return -1; const ms = this.kiAnyag(a, ap), n = U[b.t].tar ? 1 : U[b.t].be.length; let jo = -1;
    for (let i = 0; i < n; i++) { if (!ms.some(m => this.beAcc(b, i).includes(m))) continue; if (this.links.some(L => L.a === a.id && L.ap === ap && L.b === b.id && L.bp === i)) continue;
      if (!this.links.some(L => L.b === b.id && L.bp === i)) return i; if (jo < 0) jo = i; }
    return jo;
  }
  kotAr(a, b) { const [ax, ay] = this.kozep(a), [bx, by] = this.kozep(b); return Math.max(1, Math.ceil((Math.abs(ax - bx) + Math.abs(ay - by)) * .25)); }
  kot(aId, ap, bId, ingyen) {
    const a = this.get(aId), b = this.get(bId); if (!a || !b) return 'Nincs ilyen egység'; const bp = this.celPort(a, ap, b); if (bp < 0) return 'Ide nem köthető';
    const ar = this.kotAr(a, b); if (!ingyen) { if (this.stock.acel < ar) return 'Nincs elég acél (' + ar + ')'; this.stock.acel -= ar; }
    const [ax, ay] = this.kozep(a), [bx, by] = this.kozep(b), L = { id: this.nid++, a: aId, ap, b: bId, bp, len: Math.abs(ax - bx) + Math.abs(ay - by), trace: 0, fagy: 0, dug: 0, aram: 0, m: this.kiAnyag(a, ap).length === 1 ? this.kiAnyag(a, ap)[0] : null };
    this.links.push(L); return L;
  }
  old(id) { const i = this.links.findIndex(L => L.id === id); if (i >= 0) this.links.splice(i, 1); }

  /* ---------- idő ---------- */
  get nap() { return Math.floor(this.t / 24) + 1; }
  get ora() { return this.t % 24; }
  get T() { return homerseklet(Math.floor(this.t / 24), this.t % 24) - (this.r.melyebb || 0); }
  log(s, k = '') { this.naplo.push({ s, k, t: this.t }); if (this.naplo.length > 60) this.naplo.shift(); }

  step(dt) {
    if (this.vege || this.dontes) return; const t0 = this.t; this.t += dt;
    this.allapot(dt);
    if (Math.floor(this.t) !== Math.floor(t0)) this.orankent();
    if (Math.floor((this.t - 6) / 24) !== Math.floor((t0 - 6) / 24)) this.vonat();
  }

  /* munkaerő, áram, termelés, vezetékek, építés */
  allapot(dt) {
    const T = this.T, S = this.stock, R = this.r;
    // munkaerő kiosztása fontosság szerint
    let szabad = Math.floor(Math.max(0, this.nep - this.beteg) * .8 * (1 + (this.torv.muszak ? .25 : 0) + (this.torv.gyerek ? .15 : 0))); this.munkaero = szabad;
    const sor = this.units.filter(u => U[u.t].fo && u.ep >= 1 && u.on && u.hp > .01).sort((a, b) => b.prio - a.prio || a.id - b.id);
    for (const u of this.units) u.fo = 0;
    for (const u of sor) { const n = Math.min(szabad, U[u.t].fo); u.fo = n; szabad -= n; }
    this.szabad = szabad;
    // áram: az előző lépés termelése a mostani igényhez
    let igeny = 0; for (const u of this.units) { const d = U[u.t]; if (d.pw && u.ep >= 1 && u.on && (u.fo > 0 || !d.fo)) igeny += d.pw; }
    let futes = 0; for (const L of this.links) if (L.trace && L.m && T < M[L.m].thr) futes += L.len * .04 * clamp((M[L.m].thr - T) / 30, .2, 2) * (this.tech.szigeteles ? .5 : 1);
    igeny += futes; this.futesMW = futes;
    let term = AGGREGATOR, ntu = 0; for (const u of this.units) if (u.t === 'turbina') { term += u.fut * U.turbina.gen; if (u.ep >= 1 && u.on) ntu++; }
    this.terheles = ntu ? clamp(igeny * 1.15 / (ntu * U.turbina.gen), .15, 1) : 1;   // a turbinák a fogyasztáshoz igazodnak, a fölös gőz megmarad
    this.aramT = term; this.aramI = igeny; const pf = this.pf = igeny > 0 ? Math.min(1, term / igeny) : 1;

    if (dt > 0) for (const u of this.units) this.futtat(u, dt, T, pf);
    else for (const u of this.units) if (u.ep >= 1) u.all = u.all === 'epul' ? 'var' : u.all;

    // vezetékek: szállítás és fagyás
    if (dt > 0) { this.kor = (this.kor || 0) + 1; const n = this.links.length;
      for (let q = 0; q < n; q++) { const L = this.links[(q + this.kor) % n], a = this.get(L.a), b = this.get(L.b); L.aram = 0; if (!a || !b) continue;
        const src = a.k[L.ap], m = src.m;
        if (m && src.q > 1e-6 && a.ep >= 1 && b.ep >= 1 && !L.dug) {
          let hely; const al = b.t === 'allomas', dst = al ? null : b.b[L.bp];
          if (al) hely = 1e9; else if (!this.beAcc(b, L.bp).includes(m) || (dst.m && dst.m !== m && dst.q > .01)) hely = 0; else hely = this.beCap(b, L.bp) - dst.q;
          if (b.t === 'faklya') hely = Math.min(hely, src.q - this.kiCap(a, L.ap) * .5);   // a fáklya csak a fölösleget égeti el
          const v = Math.max(0, Math.min(CSOKAP * dt, src.q, hely));
          if (v > 0) { src.q -= v; if (al) this.rak[m] = (this.rak[m] || 0) + v; else { dst.m = m; dst.q += v; } L.aram = v / dt; L.m = m; }
        }
        if (L.m) { const thr = M[L.m].thr;
          if (L.trace && pf > .3) L.fagy = Math.max(0, L.fagy - dt * .5);
          else if (T < thr) L.fagy = Math.min(1, L.fagy + dt * (thr - T) / 30 * (L.aram > .5 ? .25 : 1) * (this.tech.szigeteles ? .5 : 1));
          else L.fagy = Math.max(0, L.fagy - dt * .2);
          if (L.fagy >= 1 && !L.dug) { L.dug = 1; this.log('Befagyott egy vezeték: ' + M[L.m].n + ' (' + U[a.t].n + ' → ' + U[b.t].n + ')', 'baj'); }
          if (L.dug && L.fagy < .2) L.dug = 0; }
      }
    }
    // építkezés: a szabad munkások építenek, sorban
    if (dt > 0) { let ep = Math.max(1.5, Math.min(14, szabad)); for (const u of this.units) { if (u.ep >= 1 || ep <= 0) continue; const k = Math.min(ep, 8); ep -= k; u.ep = Math.min(1, u.ep + dt * k / 8 / U[u.t].bt); if (u.ep >= 1) { u.all = 'var'; this.log('Elkészült: ' + U[u.t].n, 'jo'); this.hoTerkep(); } }
      if (R.jav) { const k = clamp(szabad, 2, 12) / 12 * (this.torv.onkentes ? 2 : 1); R.jav.h += dt * k; if (R.jav.h >= REAKTOR[R.lvl + 1].ora) { R.lvl++; R.jav = null; this.remeny = Math.min(100, this.remeny + 6); if (this.torv.onkentes) { this.meghal(2); }
        this.log('Reaktor: elkészült – ' + REAKTOR[R.lvl].n, 'jo'); this.hoTerkep(); } }
      if (this.kut) { let e = 0; for (const u of this.units) if (u.t === 'kutato') e += u.fut; this.kutP += e * dt; if (this.kutP >= TECH[this.kut].p) { this.tech[this.kut] = 1; this.log('Kifejlesztve: ' + TECH[this.kut].n, 'jo'); this.kut = null; this.kutP = 0; this.hoTerkep(); } }
    }
  }

  futtat(u, dt, T, pf) {
    const d = U[u.t], S = this.stock, R = this.r;
    if (u.ep < 1) { u.fut = 0; u.all = 'epul'; return; }
    if (d.tar || u.t === 'allomas') { u.fut = 1; u.all = 'uzemel'; if (u.t === 'allomas') u.fut = d.fo ? u.fo / d.fo : 1; return; }
    let eff = (d.fo ? u.fo / d.fo : 1) * (d.pw ? pf : 1) * (u.hp < .3 ? 0 : u.hp < .65 ? .6 : 1) * (u.t === 'turbina' ? this.terheles : 1);
    if (!u.on) eff = 0;
    if (u.t === 'reaktor') return this.reaktor(u, dt, eff);
    // bemenetek
    const van = i => u.b[i].q > 1e-6;
    let hiany = null; for (let i = 0; i < d.be.length; i++) if (!d.be[i].opt && !van(i)) { hiany = d.be[i].acc.length > 1 ? (d.be[i].n || 'bemenet') : M[d.be[i].acc[0]].n; break; }
    if (d.rakt) for (const k in d.rakt) if (S[k] < 1) hiany = M[k].n;
    // felfűtés / lehűlés
    if (d.mel) {
      if (eff > 0 && !hiany) u.mel = Math.min(1, u.mel + dt / d.mel);
      else { const elott = u.mel; u.mel = Math.max(0, u.mel - dt / (4 + Math.max(0, 40 + T) * .15));
        if (elott > 0 && u.mel === 0 && u.volt) { u.volt = 0; if (d.tor && u.on && T < -22) { u.hp = Math.max(0, u.hp - .4); this.log('Hősokk: ' + d.n + ' megrepedt a hirtelen lehűléstől', 'baj'); } } }
      if (u.mel >= 1) u.volt = 1;
      if (u.mel < 1) { u.fut = 0; u.all = !u.on ? 'ki' : u.hp < .3 ? 'serult' : d.fo && !u.fo ? 'ember' : hiany ? 'var:' + hiany : 'felfut'; return; }
    }
    let f = eff, tele = null;
    for (let i = 0; i < d.be.length; i++) { const p = d.be[i]; if (p.opt) continue; const r = u.t === 'kazan' ? KAZAN_TUZ[u.b[i].m] || 2 : p.r; f = Math.min(f, u.b[i].q / (r * dt)); }
    for (let j = 0; j < d.ki.length; j++) { const p = d.ki[j]; if (M[p.m].k === 'r') continue; const h = (this.kiCap(u, j) - u.k[j].q) / (p.r * dt); if (h < f) { f = h; if (h < .05) tele = M[p.m].n; } }
    if (d.rakt) for (const k in d.rakt) f = Math.min(f, S[k] / (d.rakt[k] * dt));
    f = Math.max(0, f);
    let hozam = 1;
    for (let i = 0; i < d.be.length; i++) { const p = d.be[i], r = u.t === 'kazan' ? KAZAN_TUZ[u.b[i].m] || 2 : p.r, kell = r * dt * f;
      if (p.opt) { if (u.b[i].q >= kell && kell > 0) u.b[i].q -= kell; else hozam = .92; } else u.b[i].q = Math.max(0, u.b[i].q - kell); if (u.b[i].q < 1e-6) u.b[i].q = 0; }
    if (d.rakt) for (const k in d.rakt) S[k] = Math.max(0, S[k] - d.rakt[k] * dt * f);
    for (let j = 0; j < d.ki.length; j++) { const p = d.ki[j], v = p.r * dt * f * hozam; if (M[p.m].k === 'r') S[p.m] += v; else u.k[j].q += v; }
    u.fut = f;
    u.all = !u.on ? 'ki' : u.hp < .3 ? 'serult' : d.fo && !u.fo ? 'ember' : d.pw && pf < .5 ? 'aram' : hiany ? 'var:' + hiany : tele ? 'tele:' + tele : f > .02 ? 'uzemel' : 'var';
  }

  reaktor(u, dt, eff) {
    const R = this.r, fok = REAKTOR[R.lvl];
    if (R.all > 0) { R.all -= dt; u.fut = 0; u.all = 'scram'; if (R.all <= 0) { this.log('A reaktor újraindult', 'jo'); this.hoTerkep(); } return; }
    const szorzo = (R.tul ? 1.3 : 1) * (R.korlat ? 1 : 1.15), akar = GOZ_NEVL * fok.telj * R.set * szorzo * (.4 + .6 * eff), viz = akar * .5;
    const fv = viz > 0 ? Math.min(1, u.b[0].q / (viz * dt)) : 1; u.b[0].q = Math.max(0, u.b[0].q - viz * dt * fv);
    u.k[0].q = Math.min(this.kiCap(u, 0), u.k[0].q + akar * (.25 + .75 * fv) * dt);
    const no = ((R.tul ? 2.2 : 0) + (R.korlat ? 0 : .9) + (fv < .5 ? 3 : 0)) * (R.lvl >= 4 ? .6 : 1);
    R.stressz = clamp(R.stressz + dt * (no > 0 ? no : -1.2), 0, 100); R.vizhiany = fv < .5;
    if (R.stressz >= 100) { R.stressz = 40; R.all = 12; R.tul = 0; R.scram++; this.remeny = Math.max(0, this.remeny - 10); this.eleg = Math.min(100, this.eleg + 6); this.log('VÉSZLEÁLLÁS – a reaktor 12 órára leállt', 'baj'); this.hoTerkep(); }
    u.fut = R.set * (.25 + .75 * fv); u.all = fv < .5 ? 'var:Víz' : 'uzemel';
  }
  reaktorJavit() { const R = this.r, k = REAKTOR[R.lvl + 1]; if (!k || R.jav) return 'Nem indítható'; if (k.tech && !this.tech[k.tech]) return 'Előbb ki kell fejleszteni: ' + TECH[k.tech].n; if (!this.vanRa(k.c)) return 'Nincs elég anyag'; this.fizet(k.c); R.jav = { h: 0 }; return ''; }

  /* fűtött övezetek: 0–4 szint csempénként */
  hoTerkep() {
    const ho = this.ho; ho.fill(0); const kor = (cx, cy, r, v) => { for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(H - 1, Math.ceil(cy + r)); y++) for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(W - 1, Math.ceil(cx + r)); x++) if (Math.hypot(x + .5 - cx, y + .5 - cy) <= r) ho[y * W + x] += v; };
    const re = this.units.find(u => u.t === 'reaktor'); if (re && this.r.all <= 0) { const [cx, cy] = this.kozep(re), r = REAKTOR[this.r.lvl].r * (.55 + .45 * this.r.set) * (this.r.tul ? 1.15 : 1); kor(cx, cy, r, 1); kor(cx, cy, r * .72, 1); }
    for (const u of this.units) if (u.t === 'hokozp' && u.fut > .5) { const [cx, cy] = this.kozep(u); kor(cx, cy, 9, 1); kor(cx, cy, 6, 1); }
    for (let i = 0; i < ho.length; i++) if (ho[i] > 4) ho[i] = 4;
  }
  // egy szálló komfortja: 0 fagyos … 4 meleg
  komfort(u) { const [cx, cy] = this.kozep(u), l = this.ho[Math.floor(cy) * W + Math.floor(cx)], e = this.T + 5 + 12 * l + (this.tech.panel ? 10 : 0); return e >= -5 ? 4 : e >= -15 ? 3 : e >= -27 ? 2 : e >= -40 ? 1 : 0; }
  meghal(n) { n = Math.min(n, this.nep); if (n <= 0) return; this.nep -= n; this.halott += n; this.beteg = Math.min(this.beteg, this.nep); this.remeny = Math.max(0, this.remeny - .6 * n); this.eleg = Math.min(100, this.eleg + .35 * n); }

  orankent() {
    this.hoTerkep(); const T = this.T, S = this.stock, tv = this.torv;
    // lakhatás
    const szallok = this.units.filter(u => u.t === 'szallo' && u.ep >= 1); let hely = 0, hideg = 0, ujBeteg = 0, fagy = 0; this.komf = [0, 0, 0, 0, 0];
    const BR = [.03, .012, .004, .0006, 0], HS = [1.5, 1, .5, 0, 0]; let marad = this.nep;
    for (const u of szallok) { const n = Math.min(marad, U.szallo.lak); marad -= n; hely += U.szallo.lak; const c = this.komfort(u); u.komf = c; this.komf[c] += n; ujBeteg += n * BR[c]; hideg += n * HS[c]; if (c === 0) fagy += n * .004; }
    if (marad > 0) { const c = T > -15 ? 2 : T > -30 ? 1 : 0; this.komf[c] += marad; ujBeteg += marad * BR[c] * 1.5; hideg += marad * HS[c] * 1.3; fagy += marad * (c === 0 ? .008 : .001); }
    this.hely = hely; this.hajlektalan = Math.max(0, marad); const hf = this.nep > 0 ? hideg / this.nep : 0;
    // élelem
    const esz = this.nep / 24 * (tv.fejadag ? .6 : 1); let ehes = 0; if (S.elelem >= esz) S.elelem -= esz; else { S.elelem = 0; ehes = 1; }
    if (tv.fejadag) ujBeteg += this.nep * .0015; if (ehes) { ujBeteg += this.nep * .01; fagy += this.nep * .002; }
    // sugárzás a reaktor személyzetén, amíg nincs védőépület
    const re = this.units.find(u => u.t === 'reaktor'); if (re && REAKTOR[this.r.lvl].sug) ujBeteg += re.fo * .012 * (tv.potlek ? .7 : 1);
    // gyógyulás
    let agy = 0; for (const u of this.units) if (u.t === 'rendelo') agy += U.rendelo.agy * u.fut;
    const kezelt = Math.min(this.beteg, agy), kezeletlen = this.beteg - kezelt;
    this.beteg = clamp(this.beteg - kezelt * .06 - kezeletlen * .012 + ujBeteg, 0, this.nep);
    this.haldokl = (this.haldokl || 0) + fagy + kezeletlen * .0025; const h = Math.floor(this.haldokl); if (h > 0) { this.haldokl -= h; this.meghal(h); this.log(h + ' ember meghalt', 'baj'); }
    // hangulat
    let kult = 0; for (const u of this.units) if (u.t === 'kultur') kult += u.fut;
    this.eleg = clamp(this.eleg + hf * 1.3 + ehes * 1 + (tv.muszak ? .1 : 0) + (tv.fejadag ? .08 : 0) + (tv.gyerek ? .04 : 0) + (this.hajlektalan > 0 ? .15 : 0) - .14 - (tv.statarium ? .45 : 0) - (tv.potlek ? .08 : 0) - Math.min(1, kult) * .05, 0, 100);
    this.remeny = clamp(this.remeny + Math.min(1.5, kult) * .1 - hf * .7 - ehes * .5 + (hf < .05 && !ehes ? .015 : 0) - (this.eleg > 75 ? .1 : 0), 0, tv.statarium ? 60 : 100);
    if (this.eleg >= 100) { this.lazad++; if (this.lazad === 1) this.log('A körzet a lázadás szélén áll', 'baj'); if (this.lazad >= 24) this.vege = 'lazadas'; } else this.lazad = Math.max(0, this.lazad - 2);
    if (this.nep < 10) this.vege = 'kihalt';
    // feladatok, döntések
    while (this.fel < FELADAT.length && FELADAT[this.fel].ok(this)) { this.log('Teljesítve: ' + FELADAT[this.fel].n + ' · +30 kiutalási pont', 'jo'); this.kredit += 30; this.fel++; }
    for (const [k, D] of Object.entries(DONTES)) if (!this.dontve[k] && (this.nap > D.nap || (this.nap === D.nap && this.ora >= D.ora))) { this.dontes = k; break; }
  }
  feladatok() { return FELADAT.slice(this.fel, this.fel + 3).map(f => f.n); }
  dont(a) {
    const k = this.dontes; if (!k) return; this.dontve[k] = a ? 'a' : 'b'; this.dontes = null;
    if (k === 'menekult') { if (a) { this.nep += 40; this.beteg += 6; this.remeny = Math.min(100, this.remeny + 5); this.log('Negyven menekült érkezett a körzetbe', 'jo'); } else { this.remeny = Math.max(0, this.remeny - 8); this.log('A menekülteket továbbküldték', ''); } }
    if (k === 'kvota') { if (a) { this.rend.szorzo = 1.5; this.kredit += 200; this.log('Másfélszeres rendelés vállalva · +200 kiutalási pont', ''); } else { this.remeny = Math.max(0, this.remeny - 3); } }
    if (k === 'fosztog') { if (a) { this.meghal(2); this.eleg = Math.max(0, this.eleg - 12); this.remeny = Math.max(0, this.remeny - 6); this.log('A tetteseket kivégezték', 'baj'); } else { this.stock.elelem = Math.max(0, this.stock.elelem - 60); this.eleg = Math.min(100, this.eleg + 6); this.log('Hatvan tonna élelem eltűnt', ''); } }
    if (k === 'mernok') { if (a) { this.r.korlat = 0; this.log('A reaktor védelmi korlátait kiiktatták', 'baj'); } }
  }

  /* törvények, kutatás, rendelés */
  torveny(k) { if (this.torv[k]) return 'Már érvényben van'; if (this.t < this.torvT) return 'Még nem hozható új rendelet'; this.torv[k] = 1; this.torvT = this.t + 36;
    if (k === 'gyerek') this.remeny = Math.max(0, this.remeny - 12); if (k === 'statarium') this.remeny = Math.max(0, Math.min(60, this.remeny - 20)); if (k === 'potlek') this.remeny = Math.min(100, this.remeny + 10); if (k === 'muszak') this.eleg = Math.min(100, this.eleg + 5); return ''; }
  kutat(k) { const t = TECH[k]; if (this.tech[k]) return 'Már megvan'; if (t.kell && !this.tech[t.kell]) return 'Előbb: ' + TECH[t.kell].n; if (!this.units.some(u => u.t === 'kutato' && u.ep >= 1)) return 'Tervezőintézet kell hozzá'; if (this.kut !== k) { this.kut = k; this.kutP = 0; } return ''; }
  rendel(m, q) { const ar = IMPORT[m] * q; if (q > 0 && this.kredit < ar) return 'Nincs elég kiutalási pont'; if (q < 0 && (this.megr[m] || 0) < -q) return ''; this.kredit -= ar; this.megr[m] = (this.megr[m] || 0) + q; return ''; }
  kvota() { const r = RENDELES[this.rend.i]; if (!r) return null; const k = {}; for (const m in r.k) k[m] = Math.round(r.k[m] * this.rend.szorzo); return { k, jut: r.jut, t: this.rend.t, nap: (this.rend.i + 1) * 5 + 1 }; }
  // acéláru átadása a raktárból a rendelésre
  atad(m, q) { q = Math.min(q, Math.floor(this.stock[m] || 0)); if (q <= 0) return; this.stock[m] -= q; this.rak[m] = (this.rak[m] || 0) + q; }

  vonat() {
    const S = this.stock; let bev = 0; const vitt = [];
    for (const m in this.rak) { const q = this.rak[m]; if (q < .5) continue; const p = M[m].ar || 0; bev += q * p; this.leadva[m] = (this.leadva[m] || 0) + q; this.rend.t[m] = (this.rend.t[m] || 0) + q; vitt.push(Math.round(q) + ' t ' + M[m].n.toLowerCase()); this.rak[m] = 0; }
    this.kredit += bev;
    for (const m in this.megr) { S[m] += this.megr[m]; } this.megr = {};
    S.elelem += Math.round(this.nep * .7); S.acel += 6; S.beton += 10;
    if (this.remeny > 35 && this.nap <= NAPOK) { const ures = Math.max(0, (this.hely || 0) - this.nep), n = Math.min(ures, 6); if (n > 0) { this.nep += n; } }
    this.log('Vonat: ' + (vitt.length ? vitt.join(', ') + ' · +' + Math.round(bev) + ' pont' : 'üresen ment el'), bev ? 'jo' : '');
    this.ujVonat = (this.ujVonat || 0) + 1;
    // időszak vége: a (5k+1). nap reggelén
    if ((this.nap - 1) % 5 === 0 && this.nap > 1 && this.rend.i < RENDELES.length) { const q = this.kvota(); let ok = true; for (const m in q.k) if ((this.rend.t[m] || 0) < q.k[m]) ok = false;
      if (ok) { this.kredit += q.jut; this.remeny = Math.min(100, this.remeny + 10); this.eleg = Math.max(0, this.eleg - 6); this.log('A rendelés teljesítve · +' + q.jut + ' kiutalási pont', 'jo'); }
      else { this.eleg = Math.min(100, this.eleg + 18); this.remeny = Math.max(0, this.remeny - 14); this.log('A rendelés nem teljesült – a Főigazgatóság csökkenti az ellátmányt', 'baj'); S.elelem = Math.max(0, S.elelem - 30); }
      this.rend.i++; this.rend.t = {}; this.rend.szorzo = 1; }
    if (this.torv.potlek) this.kredit = Math.max(0, this.kredit - 25);
    if (this.nap > NAPOK && !this.gyozott) { this.gyozott = 1; this.vege = 'gyozelem'; }
  }
  folytat() { if (this.vege === 'gyozelem') this.vege = null; }

  /* ---------- mentés ---------- */
  ment() { const o = {}; for (const k of ['seed', 't', 'nid', 'units', 'links', 'stock', 'kredit', 'rak', 'megr', 'leadva', 'nep', 'beteg', 'halott', 'remeny', 'eleg', 'lazad', 'tech', 'kut', 'kutP', 'torv', 'torvT', 'r', 'rend', 'fel', 'dontes', 'dontve', 'vege', 'gyozott', 'haldokl']) o[k] = this[k];
    o.v = 1; o.terr = Array.from(this.terr).join(''); return JSON.parse(JSON.stringify(o)); }
  betolt(o) {
    this.uj(); const terr = o.terr; for (const k in o) if (k !== 'terr' && k !== 'v') this[k] = o[k];
    this.genTerkep(); if (terr && terr.length === W * H) for (let i = 0; i < W * H; i++) this.terr[i] = +terr[i];
    for (const u of this.units) { if (U[u.t].tar) u.k = u.b; const [w, h] = this.meret(u.t, u.rot); for (let yy = u.y; yy < u.y + h; yy++) for (let xx = u.x; xx < u.x + w; xx++) this.occ[yy * W + xx] = u.id; }
    this.hoTerkep(); this.allapot(0);
  }
}
