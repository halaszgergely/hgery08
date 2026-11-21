// HGWS – Öntöző Birodalom Online: adatok és a kliensoldali szimuláció (tiszta függvények, Firebase nélkül).
// A firestore.rules „Öntöző Birodalom Online” szakaszának korlátai (CAP, PRICE, telekárak, élek) ezekkel egyeznek – együtt kell módosítani.

/* ---------- nyersanyagok: [név, jel, állami felvásárlási ár (Ft/db)] ---------- */
export const RES = {
  viz: ['Víz', '💧', .2], buza: ['Búza', '🌾', 2], virag: ['Virág', '🌻', 3], gomba: ['Gomba', '🍄', 4], gyogy: ['Gyógynövény', '🌿', 5],
  so: ['Só', '🧂', 5], hal: ['Hal', '🐟', 6], krist: ['Kristály', '💎', 12], kaktusz: ['Kaktuszgyümölcs', '🌵', 9], goz: ['Gőz', '♨️', 10],
  asvany: ['Ásvány', '🪨', 12], jeg: ['Jég', '🧊', 10], eso: ['Esővíz', '🌧️', 14], sziv: ['Szivárványkristály', '🌈', 28],
  holdpor: ['Holdpor', '🌑', 32], csviz: ['Csillagvíz', '✨', 45], alk: ['Alkatrész', '⚙️', 60], gep: ['Gép', '🤖', 500],
  szv: ['Szennyvíz', '🟤', 0], hir: ['Hírnév', '⭐', 0], vjog: ['Vízjog', '📜', 0], lfd: ['Locsolófej-darab', '🔱', 0], alf: ['Arany Locsolófej', '🏆', 0], hajo: ['Léghajó', '🎈', 0]
};
export const RAW = ['buza', 'virag', 'gomba', 'gyogy', 'so', 'hal', 'krist', 'kaktusz', 'goz', 'asvany', 'jeg', 'eso', 'sziv', 'holdpor', 'csviz'];
export const TRADE = ['viz', ...RAW, 'alk', 'gep', 'szv'];   // piacon adható-vehető
/* termelési felső korlát / mp / szint (a szabályokban ugyanez) */
export const CAP = { viz: .6, szv: .3, alk: .004, gep: .0004, hir: .01 };
export const capOf = (k, lv) => (CAP[k] ?? (RAW.includes(k) ? .04 : 0)) * lv;
export const FT_CAP = .3, OFFLINE = 43200, INV_MAX = 1e7, FT_MAX = 1e9;
export const VJOG_PRICE = 400, VIZ_BASE = 1, TW_GOAL = 3000, RAID_HP = 4000, PIPE_FT = 3000, PIPE_ALK = 20, COOP_FT = 2000, DRY_H = 72, WATER_COST = 20, MAX_LV = 30;
export const lvlCost = L => 150 * L * L, lvlWait = L => (L - 1) * 1800e3, plotMax = lv => 1 + Math.floor(lv / 2);

/* ---------- régiók ---------- */
// lv: megnyitási szint · p: telekár · wq: vízbőség (a szivattyúk szorzója) · base: a kert alapterménye · x,y: hely a térképen (1000×620)
export const REG = {
  vizvar: { n: 'Vízvár', e: '🏛️', kind: 'varos', lv: 1, x: 500, y: 300, c: '#e8b656', d: 'A főváros: piac, bank, ranglista-csarnok és a Vízügyi Tanács.' },
  volgy: { n: 'Locsolóvölgy', e: '🌾', kind: 'term', lv: 1, p: 300, wq: 1, base: 'buza', x: 330, y: 380, c: '#5ee08a', d: 'Termékeny föld, nyugodt folyó.' },
  atemelo: { n: 'Átemelőtelep', e: '🚰', kind: 'hgws', lv: 2, p: 1200, wq: 0, x: 215, y: 300, c: '#8fb3c9', d: 'A használt víz itt tisztul meg, és megy vissza a hálózatba.' },
  mocsar: { n: 'Ködös mocsár', e: '🍄', kind: 'term', lv: 2, p: 800, wq: 1.4, base: 'gomba', x: 120, y: 190, c: '#7fa878', d: 'Sok a víz, de koszos.' },
  obol: { n: 'Sósvíz-öböl', e: '🐟', kind: 'term', lv: 3, p: 1500, wq: 2, base: 'so', x: 400, y: 540, c: '#4dd6c7', d: 'Végtelen sós víz.' },
  gyar: { n: 'HGWS Gyárváros', e: '🏭', kind: 'hgws', lv: 3, p: 2000, wq: 0, x: 640, y: 410, c: '#c9a24a', d: 'A nyersanyagból itt lesz alkatrész és gép.' },
  studio: { n: 'HGWS Studios-negyed', e: '🎬', kind: 'hgws', lv: 3, p: 2000, wq: 0, x: 600, y: 180, c: '#ff8fc7', d: 'Itt hírnév terem, nem víz.' },
  aszaly: { n: 'Aszályföld', e: '🏜️', kind: 'term', lv: 4, p: 2500, wq: 0, base: 'kaktusz', x: 800, y: 480, c: '#e0a05a', d: 'A legnagyobb jutalmak – víz nélkül.' },
  erod: { n: 'Szilárd erődje', e: '🏰', kind: 'raid', lv: 4, x: 900, y: 530, c: '#ff5a4d', d: 'Szikkadt Szilárd főhadiszállása. Hetente közös ostrom.' },
  gejzir: { n: 'Gejzírhegység', e: '♨️', kind: 'term', lv: 5, p: 4000, wq: .8, base: 'goz', x: 850, y: 300, c: '#ffa94d', d: 'Forró források, gőz és ásványok.' },
  eszak: { n: 'Fagyos észak', e: '🧊', kind: 'term', lv: 6, p: 6000, wq: .6, base: 'jeg', x: 420, y: 70, c: '#9fd6f5', d: 'A víz itt jégként vár.' },
  felho: { n: 'Felhőszigetek', e: '☁️', kind: 'term', lv: 7, p: 9000, wq: 1, base: 'eso', x: 790, y: 120, c: '#c79bff', d: 'Lebegő szigetek – csak léghajóval vagy Vízportállal.' },
  hold: { n: 'Holdkolónia', e: '🌑', kind: 'term', lv: 8, p: 15000, wq: .3, base: 'holdpor', x: 930, y: 50, c: '#bfc7d6', d: 'Holdpor, csillagvíz és átjáró a Zero Space felé.' }
};
export const PLOT_REGS = Object.keys(REG).filter(r => REG[r].p);
export const GRID = [8, 6], PLOTS = GRID[0] * GRID[1];
/* szomszédságok (vezeték ezekre építhető; az azonosító a két régió ábécérendben) */
export const EDGES = [['vizvar', 'volgy'], ['gyar', 'vizvar'], ['studio', 'vizvar'], ['atemelo', 'volgy'], ['atemelo', 'mocsar'], ['obol', 'volgy'], ['gyar', 'obol'], ['aszaly', 'gyar'],
  ['aszaly', 'erod'], ['aszaly', 'gejzir'], ['eszak', 'mocsar'], ['eszak', 'studio'], ['felho', 'gejzir'], ['felho', 'hold']];
export const edgeId = (a, b) => [a, b].sort().join('-');
export const PIPE_EDGES = EDGES.filter(e => !e.includes('erod')).map(e => edgeId(...e));

/* ---------- épületek ----------
   c: Ft · a: alkatrész · g: gép · out/use: darab/mp az 1. szinten · pump: vízjog kell hozzá · boost: a telek többi épületét erősíti
   guard: melyik veszélyt hárítja el · nat: természeti (a kert szintje is szorozza) */
export const BLD = {
  szorofej: { n: 'Szórófej', e: '💦', r: 'volgy', c: 120, out: { buza: .016 }, use: { viz: .05 }, nat: 1 },
  szivattyu: { n: 'Szivattyú', e: '⛽', r: 'volgy', c: 150, out: { viz: .5 }, pump: 1 },
  csepegteto: { n: 'Csepegtető', e: '🚿', r: 'volgy', c: 400, out: { virag: .012 }, use: { viz: .025 }, nat: 1 },
  szuro: { n: 'Szűrő', e: '🧪', r: 'mocsar', c: 600, out: { viz: .6 }, pump: 1, guard: 'rothadas' },
  gombatelep: { n: 'Gombatelep', e: '🍄', r: 'mocsar', c: 700, out: { gomba: .014 }, use: { viz: .03 }, nat: 1 },
  katicahaz: { n: 'Katicaház', e: '🐞', r: 'mocsar', c: 900, out: { gyogy: .009 }, use: { viz: .02 }, nat: 1, guard: 'kartevo' },
  sotalanito: { n: 'Sótalanító üzem', e: '🏗️', r: 'obol', c: 1400, a: 2, out: { viz: .9, so: .008 }, pump: 1 },
  tengeromu: { n: 'Tengervíz-erőmű', e: '🌊', r: 'obol', c: 1800, a: 4, out: { so: .008 }, boost: .08, guard: 'vihar' },
  halaszsteg: { n: 'Halászstég', e: '🎣', r: 'obol', c: 1200, out: { hal: .013 }, nat: 1 },
  melykut: { n: 'Mélykút', e: '🕳️', r: 'aszaly', c: 2600, a: 6, out: { viz: .25 }, pump: 1 },
  napszivattyu: { n: 'Napelemes szivattyú', e: '☀️', r: 'aszaly', c: 3200, a: 8, out: { viz: .35 }, pump: 1, guard: 'hoseg' },
  kristalybanya: { n: 'Kristálybánya', e: '💎', r: 'aszaly', c: 3000, a: 5, out: { krist: .011 }, use: { viz: .06 }, nat: 1 },
  gejzirkut: { n: 'Gejzír', e: '♨️', r: 'gejzir', c: 4500, a: 10, out: { goz: .012, viz: .3 }, pump: 1 },
  nyomasfokozo: { n: 'Nyomásfokozó', e: '🎛️', r: 'gejzir', c: 5000, a: 12, boost: .1, guard: 'kitores' },
  esozteto: { n: 'Óriás esőztető', e: '⛲', r: 'gejzir', c: 5500, a: 10, out: { asvany: .011 }, use: { viz: .08 }, nat: 1 },
  jegbanya: { n: 'Jégbánya', e: '⛏️', r: 'eszak', c: 6500, a: 14, out: { jeg: .016 }, nat: 1 },
  olvaszto: { n: 'Jéghegy-olvasztó', e: '🔥', r: 'eszak', c: 7500, a: 16, g: 1, out: { viz: .7 }, use: { jeg: .004 }, pump: 1 },
  csofutes: { n: 'Csőfűtés', e: '🌡️', r: 'eszak', c: 5000, a: 12, boost: .04, guard: 'fagy' },
  felhogep: { n: 'Felhőgép', e: '☁️', r: 'felho', c: 10000, a: 20, g: 1, out: { eso: .013, viz: .5 }, pump: 1 },
  szivarvanykut: { n: 'Szivárványkút', e: '🌈', r: 'felho', c: 12000, a: 24, g: 2, out: { sziv: .006 }, use: { viz: .05 }, nat: 1 },
  kikoto: { n: 'Léghajókikötő', e: '⚓', r: 'felho', c: 9000, a: 18, boost: .08, guard: 'szelvihar' },
  holdesozteto: { n: 'Holdporos esőztető', e: '🌑', r: 'hold', c: 16000, a: 30, g: 2, out: { holdpor: .008 }, use: { viz: .1 }, nat: 1 },
  csillagkut: { n: 'Csillagkút', e: '✨', r: 'hold', c: 20000, a: 36, g: 3, out: { csviz: .004, viz: .2 }, pump: 1 },
  feketelyuk: { n: 'Fekete lyuk-szivattyú', e: '🕳️', r: 'hold', c: 40000, a: 60, g: 6, out: { viz: 1.6 }, pump: 1, guard: 'napszel' },
  csillagkapu: { n: 'Csillagkapu', e: '🚀', r: 'hold', c: 25000, a: 40, g: 4, boost: .05, gate: 1, max: 1 },
  futoszalag: { n: 'Futószalag', e: '⚙️', r: 'gyar', c: 2200, out: { alk: .0016 }, use: { so: .003, krist: .002 } },
  presgep: { n: 'Présgép', e: '🔩', r: 'gyar', c: 3500, a: 6, out: { alk: .0018 }, use: { asvany: .002, jeg: .002 } },
  minoseg: { n: 'Minőségellenőrző', e: '🔍', r: 'gyar', c: 3000, a: 8, boost: .1, guard: 'gepleallas' },
  gepsor: { n: 'Gépsor', e: '🤖', r: 'gyar', c: 6000, a: 20, out: { gep: .00012 }, use: { alk: .0012 } },
  ontomuhely: { n: 'Arany Locsolófej öntőműhely', e: '🏆', r: 'gyar', c: 8000, a: 30, g: 2, forge: 1, max: 1 },
  akna: { n: 'Átemelő akna', e: '🕳️', r: 'atemelo', c: 900, out: { szv: .08 } },
  ulepito: { n: 'Ülepítő', e: '🫧', r: 'atemelo', c: 1500, out: { viz: .28 }, use: { szv: .4 }, clean: 1 },
  szivattyuhaz: { n: 'Szivattyúház', e: '🏚️', r: 'atemelo', c: 1800, a: 3, boost: .12 },
  plc: { n: 'PLC-szekrény', e: '🗄️', r: 'atemelo', c: 2400, a: 6, boost: .08, plc: 1 },
  scada: { n: 'SCADA-irányítóterem', e: '🖥️', r: 'atemelo', c: 4000, a: 12, g: 1, boost: .1, guard: 'tulcsordulas', max: 1 },
  mozi: { n: 'Mozi', e: '🍿', r: 'studio', c: 2500, a: 4, out: { hir: .004 } },
  hangstudio: { n: 'Hangstúdió', e: '🎙️', r: 'studio', c: 2200, a: 4, out: { hir: .003 } },
  szinpad: { n: 'Színpad', e: '🎭', r: 'studio', c: 3000, a: 6, out: { hir: .005 }, use: { viz: .02 }, guard: 'aramszunet' }
};
export const bldOf = r => Object.keys(BLD).filter(b => BLD[b].r === r);
export const BLD_MAX = 5;
export const bldCost = (b, L) => { const B = BLD[b], k = L * L; return { ft: B.c * k, alk: (B.a || 0) * k, gep: (B.g || 0) * L }; };   // L = az elérendő szint
export const plotUpCost = L => ({ ft: 400 * L * L, alk: L > 3 ? (L - 3) * 5 : 0 });

/* ---------- időjárás és veszélyek régiónként ---------- */
export const EV = {
  volgy: [{ id: 'szel', n: 'Száraz szél', e: '🍃', m: .85, bad: 1 }, { id: 'napsutes', n: 'Napsütés', e: '🌤️', m: 1.2 }],
  mocsar: [{ id: 'kartevo', n: 'Kártevők', e: '🐛', m: .5, bad: 1 }, { id: 'rothadas', n: 'Rothadás', e: '🦠', m: .6, bad: 1 }, { id: 'langyoseso', n: 'Langyos eső', e: '🌦️', m: 1.25 }],
  obol: [{ id: 'vihar', n: 'Vihar', e: '⛈️', m: .5, bad: 1 }, { id: 'dagaly', n: 'Dagály', e: '🌊', m: .6, bad: 1 }, { id: 'halraj', n: 'Halraj', e: '🐟', m: 1.3 }],
  aszaly: [{ id: 'hoseg', n: 'Hőség', e: '🥵', m: .6, bad: 1 }, { id: 'homokvihar', n: 'Homokvihar', e: '🌪️', m: .4, bad: 1 }, { id: 'szilard', n: 'Szilárd emberei', e: '🦹', m: .5, bad: 1 }, { id: 'oazis', n: 'Oázis', e: '🌴', m: 1.3 }],
  gejzir: [{ id: 'kitores', n: 'Kitörés', e: '🌋', m: .5, bad: 1 }, { id: 'foldrenges', n: 'Földrengés', e: '💢', m: .6, bad: 1 }, { id: 'aradat', n: 'Forró áradat', e: '♨️', m: 1.3 }],
  eszak: [{ id: 'fagy', n: 'Fagy', e: '🥶', m: .5, bad: 1 }, { id: 'befagy', n: 'Befagyó csövek', e: '🧊', m: .7, bad: 1, pump: .3 }, { id: 'sarkifeny', n: 'Sarki fény', e: '🌌', m: 1.2 }],
  felho: [{ id: 'szelvihar', n: 'Szélvihar', e: '💨', m: .6, bad: 1 }, { id: 'szivarvany', n: 'Szivárvány', e: '🌈', m: 1.4 }],
  hold: [{ id: 'napszel', n: 'Napszél', e: '☄️', m: .6, bad: 1 }, { id: 'meteor', n: 'Meteorzápor', e: '🌠', m: 1.5 }],
  gyar: [{ id: 'tulterheles', n: 'Túlterhelés', e: '⚡', m: .6, bad: 1 }, { id: 'gepleallas', n: 'Gépleállás', e: '🛑', m: .5, bad: 1 }, { id: 'sztrajk', n: 'Sztrájk', e: '🪧', m: .3, bad: 1 }],
  atemelo: [{ id: 'tulcsordulas', n: 'Túlcsordulás', e: '🚨', m: .6, bad: 1 }, { id: 'esozes', n: 'Esőzés', e: '🌧️', m: 1.2 }],
  studio: [{ id: 'aramszunet', n: 'Áramszünet', e: '🔌', m: .5, bad: 1 }, { id: 'premier', n: 'Premier', e: '🎬', m: 1.5 }]
};
export const EV_SLOT = 6 * 3600e3;
export const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
/* az adott régió aktuális eseménye (mindenkinél ugyanaz, írás nélkül): 6 óránként váltakozik, az idő ~45%-ában nyugalom */
export function eventOf(sid, rid, now) {
  const l = EV[rid]; if (!l) return null; const slot = Math.floor(now / EV_SLOT), h = hash(sid + '|' + rid + '|' + slot) % 100;
  if (h < 45) return null; const e = l[(h - 45) % l.length]; return { ...e, until: (slot + 1) * EV_SLOT };
}

/* ---------- idő: szezon, hét, Szilárd aszálya ---------- */
export const seasonId = (t = Date.now()) => { const d = new Date(t); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0'); };
export const prevSeason = sid => { const [y, m] = sid.split('-').map(Number); return m === 1 ? (y - 1) + '-12' : y + '-' + String(m - 1).padStart(2, '0'); };
export const seasonEnd = sid => { const [y, m] = sid.split('-').map(Number); return Date.UTC(y, m, 1); };
export const weekOf = (t = Date.now()) => Math.floor(t / 6048e5), dayOf = (t = Date.now()) => Math.floor(t / 864e5);
export const dayStr = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
/* aszály: minden (epoch-)hét 4. napján, vasárnap; előtte csütörtöktől tölthető a közös víztorony */
export const droughtDay = t => dayOf(t) % 7 === 3;
export function drought(W, now) {
  const wk = weekOf(now), v = W && W.tw && W.tw.wk === wk ? W.tw.v : 0, on = droughtDay(now);
  const d = dayOf(now), start = (d + ((3 - d % 7) + 7) % 7) * 864e5;
  return { on, v, goal: TW_GOAL, saved: v >= TW_GOAL, start };
}
export const VOTE_DAY = 22;   // a hónap ettől a napjától lehet szavazni
export const RULES = {
  olcsoviz: ['Olcsó vízjog', 'A vízjog fél áron kapható.'], bopiac: ['Bő piac', 'Az állami felvásárló 20%-kal többet fizet.'],
  gyorsno: ['Termő esztendő', 'A kertek és bányák 15%-kal többet teremnek.'], eros: ['Ostromláz', 'Az erőd elleni sebzés 25%-kal nagyobb.'], hirnev: ['Fényes szezon', '25%-kal több hírnév.']
};
export const COS = {
  cimer1: ['Vízcsepp-címer', '💧', 150], cimer2: ['Arany címer', '🔱', 600], disz1: ['Virágágyás', '🌷', 100], disz2: ['Szökőkút', '⛲', 400], disz3: ['Lampionsor', '🏮', 250],
  szobor1: ['Kerti törpe', '🧙', 200], szobor2: ['Locsoló szobor', '🗿', 800], szobor3: ['Arany Szilárd-bábu', '🦹', 1500]
};
export const DOCK = ['locsolo', 'nyomas', 'vizagyu', 'csepp', 'viztorony', 'drift', 'holtvaros'];   // az Arcade-dokk gépei (naponta más)
export const dockGame = (t = Date.now()) => DOCK[dayOf(t) % DOCK.length];
export const raidTier = d => d >= 2000 ? 3 : d >= 600 ? 2 : d >= 100 ? 1 : 0;
export const score = P => Math.floor(P.lv * 1000 + (P.ft || 0) / 10 + (P.inv?.hir || 0) * 5 + (P.inv?.lfd || 0) * 500 + (P.inv?.alf || 0) * 5000 + Object.keys(P.pl || {}).length * 200);

/* ---------- termelés ----------
   ctx: { sid, W (világ-dokumentum), coop (a szövetkezet dokumentuma vagy null) } */
export function rates(P, ctx, now) {
  const W = ctx.W || {}, rule = W.rule || '', dr = drought(W, now), items = [], pls = Object.values(P.pl || {}), lv = P.lv || 1;
  const coopOn = ctx.coop && (ctx.coop.m || []).length >= 4, tower = coopOn && (ctx.coop.p?.torony || 0) >= 200 ? 1.1 : 1;
  const kosz = W.kosz && W.kosz.wk === weekOf(now) ? W.kosz.v : 0;
  for (const pl of pls) {
    const R = REG[pl.r]; if (!R) continue;
    const ev = eventOf(ctx.sid, pl.r, now), b = pl.b || {}, plm = 1 + .25 * ((pl.lv || 1) - 1), gm = 1 + .05 * (pl.g || 0);
    let boost = 1; for (const k in b) if (BLD[k]?.boost) boost += BLD[k].boost * b[k];
    const guarded = ev && ev.bad && Object.keys(b).some(k => BLD[k]?.guard === ev.id);
    const em = !ev ? 1 : ev.bad ? (guarded ? .92 : ev.m) : ev.m, pm = ev && ev.pump && !guarded ? ev.pump : 1;
    const day = dr.on ? (dr.saved ? 1.2 : 1) : 1, dry = dr.on && !dr.saved ? .3 : 1, mg = pl.r === 'atemelo' ? .5 + (pl.mgT > now - 6 * 3600e3 ? (pl.mg || 0) : 0) : 1;
    if (R.base) items.push({ out: { [R.base]: .02 * plm * gm * em * day * (rule === 'gyorsno' ? 1.15 : 1) }, use: { viz: .02 * plm } });
    for (const k in b) { const B = BLD[k], L = b[k]; if (!B || !L || !B.out) continue; const out = {}, use = {};
      for (const r in B.out) { let v = B.out[r] * L * plm * boost;
        if (r === 'viz' && B.pump) v *= R.wq * pm * dry * tower / (pl.r === 'mocsar' ? 1 + kosz * .08 : 1);
        else if (r === 'viz') v *= em * mg;
        else v *= em * day * (B.nat ? gm * (rule === 'gyorsno' ? 1.15 : 1) : 1) * (r === 'hir' && rule === 'hirnev' ? 1.25 : 1) * (B.clean ? mg : 1);
        out[r] = v; }
      for (const r in B.use || {}) use[r] = B.use[r] * L * plm;
      items.push({ out, use }); }
  }
  const G = {}, U = {}; for (const it of items) { for (const r in it.out) G[r] = (G[r] || 0) + it.out[r]; for (const r in it.use) U[r] = (U[r] || 0) + it.use[r]; }
  const f = {}; for (const r in U) f[r] = (P.inv?.[r] || 0) > .5 || U[r] <= (G[r] || 0) ? 1 : (G[r] || 0) / U[r];
  const net = {}; let wuse = 0;
  for (const it of items) { let k = 1; for (const r in it.use) k = Math.min(k, f[r]); for (const r in it.out) net[r] = (net[r] || 0) + it.out[r] * k; for (const r in it.use) { net[r] = (net[r] || 0) - it.use[r] * k; if (r === 'viz') wuse += it.use[r] * k; } }
  net.szv = (net.szv || 0) + wuse * .3;
  for (const r in net) net[r] = Math.min(net[r], capOf(r, lv));
  const ft = Math.min(FT_CAP * lv, .08 * lv * pls.length);
  return { net, ft, thirst: f.viz !== undefined && f.viz < 1 ? f.viz : 1, wuse };
}
/* a készlet léptetése dt másodperccel (legfeljebb 30 perces lépésekben, hogy a kifogyó készlet megállítsa a ráépülő termelést) */
export function advance(P, ctx, from, dt) {
  dt = Math.max(0, Math.min(OFFLINE, dt)); const gain = {}; let ft = 0, t = from, left = dt; P.inv = P.inv || {};
  while (left > 0) { const s = Math.min(left, 1800), r = rates(P, ctx, t);
    for (const k in r.net) { const o = P.inv[k] || 0, n = Math.max(0, Math.min(INV_MAX, o + r.net[k] * s)); P.inv[k] = n; gain[k] = (gain[k] || 0) + n - o; }
    ft += r.ft * s; left -= s; t += s * 1000; }
  P.ft = Math.min(FT_MAX, (P.ft || 0) + ft); return { gain, ft };
}
export const fmt = n => { n = +n || 0; const a = Math.abs(n); return a >= 1e9 ? (n / 1e9).toFixed(1).replace('.', ',') + ' Mrd' : a >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' M' : a >= 1e4 ? Math.round(n / 1e3) + ' e' : Math.floor(n).toLocaleString('hu-HU'); };
export const perH = v => { const h = v * 3600, a = Math.abs(h); return (h > 0 ? '+' : h < 0 ? '−' : '') + (a >= 100 ? Math.round(a) : a >= 10 ? a.toFixed(1) : a.toFixed(2)).toString().replace('.', ',') + '/ó'; };
export const freshPlayer = () => ({ lv: 1, ft: 500, inv: { viz: 200, vjog: 1 }, pl: {}, sc: 1050, coop: '', cos: [], rd: { wk: 0, d: 0, cl: false }, ad: '', cand: false, prog: '', voted: false });
