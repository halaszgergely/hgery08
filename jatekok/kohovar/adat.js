// Kohóvár – a játék adatai: anyagok, blokkok, egységek, kutatási fa, szektorok.
// A játékmenet a Mindustry (Anuke) alapján készült: https://store.steampowered.com/app/1127400/Mindustry/
// Saját kód és saját rajzolt grafika; az értékek a játék korai szakaszát követik, egyszerűsítve.

export const TS = 8;            // egy mező mérete világegységben
export const TPS = 60;          // szimulációs lépés másodpercenként

/* ---------- anyagok ---------- */
// h: keménység (a fúró szintje legalább ennyi kell), c: szín, f: éghető (generátor), cost: építési idő súlya
export const ITEMS = {
  copper:    { n: 'Réz',          c: '#d99d73', c2: '#a8673f', h: 1, cost: .5 },
  lead:      { n: 'Ólom',         c: '#8c7fa9', c2: '#5e5478', h: 1, cost: .7 },
  sand:      { n: 'Homok',        c: '#e3c38b', c2: '#b8975d', h: 0, cost: .3 },
  coal:      { n: 'Szén',         c: '#3a3a3f', c2: '#222226', h: 2, cost: .5, f: 1 },
  scrap:     { n: 'Fémhulladék',  c: '#8b8174', c2: '#5d564d', h: 0, cost: .5 },
  titanium:  { n: 'Titán',        c: '#9da8d8', c2: '#6872a8', h: 3, cost: 1 },
  thorium:   { n: 'Tórium',       c: '#e57fa4', c2: '#a8506f', h: 4, cost: 1.1 },
  graphite:  { n: 'Grafit',       c: '#5f6c7e', c2: '#3c4553', h: 0, cost: 1 },
  silicon:   { n: 'Szilícium',    c: '#53565c', c2: '#2e3034', h: 0, cost: .8 },
  metaglass: { n: 'Üvegfém',      c: '#ebeef5', c2: '#a9b3c4', h: 0, cost: 1.5 },
};
export const ITEM_IDS = Object.keys(ITEMS);

/* ---------- talaj és érc ---------- */
export const FLOORS = {
  stone:    { c: '#55565b', c2: '#4b4c51' },
  dark:     { c: '#3b3d44', c2: '#34363c' },
  sandf:    { c: '#b89a68', c2: '#a88c5c', ore: 'sand' },     // homokos talaj: a fúró homokot termel
  darksand: { c: '#6a5d4b', c2: '#5e5243', ore: 'sand' },
  snow:     { c: '#c9d4df', c2: '#bcc8d4' },
  ice:      { c: '#9cc3d9', c2: '#8db5cc' },
  grass:    { c: '#4f7042', c2: '#46663b' },
  metal:    { c: '#5d6470', c2: '#535a65' },
  water:    { c: '#2e6e9e', c2: '#2a6592', shallow: 1 },
  deep:     { c: '#1d4a75', c2: '#1a446b', deep: 1 },        // mély víz: földi egység nem megy át, építeni sem lehet
  spawn:    { c: '#5a2d2d', c2: '#522929' },
};
export const WALLS = { rock: '#2e2f34', snowrock: '#7a8794', sandrock: '#7c6a4e', darkrock: '#25262b' };

/* ---------- blokkok ----------
   kat: kategória, s: méret (mezőben), cost: építési költség, hp
   rot: forgatható; type: viselkedés (vilag.js) */
export const CATS = [
  ['turret', 'Védelem – tornyok', '◎'], ['prod', 'Termelés', '⛏'], ['dist', 'Szállítás', '⇉'], ['craft', 'Gyártás', '⚙'],
  ['power', 'Áram', 'ϟ'], ['def', 'Falak', '▦'], ['units', 'Egységek', '◭'],
];
export const BLOCKS = {
  // szállítás
  conveyor:   { n: 'Szállítószalag', kat: 'dist', s: 1, cost: { copper: 1 }, hp: 45, rot: 1, type: 'conveyor', speed: 4.2, desc: 'Tárgyakat szállít előre. Oldalról és hátulról is fogad.' },
  titancon:   { n: 'Titánszalag', kat: 'dist', s: 1, cost: { copper: 1, lead: 1, titanium: 1 }, hp: 65, rot: 1, type: 'conveyor', speed: 11, desc: 'Gyors szállítószalag.' },
  junction:   { n: 'Kereszteződés', kat: 'dist', s: 1, cost: { copper: 2 }, hp: 30, type: 'junction', desc: 'Két szalag keresztezése: a tárgy egyenesen halad át rajta.' },
  router:     { n: 'Elosztó', kat: 'dist', s: 1, cost: { copper: 3 }, hp: 45, type: 'router', desc: 'A beérkező tárgyakat felváltva minden irányba továbbadja.' },
  sorter:     { n: 'Válogató', kat: 'dist', s: 1, cost: { lead: 2, copper: 2 }, hp: 45, type: 'sorter', cfg: 'item', desc: 'A kiválasztott anyagot továbbengedi, a többit oldalra.' },
  invsorter:  { n: 'Fordított válogató', kat: 'dist', s: 1, cost: { lead: 2, copper: 2 }, hp: 45, type: 'sorter', inv: 1, cfg: 'item', desc: 'A kiválasztott anyagot oldalra, a többit tovább.' },
  overflow:   { n: 'Túlfolyókapu', kat: 'dist', s: 1, cost: { lead: 2, copper: 4 }, hp: 45, type: 'overflow', desc: 'Előre ad, ha ott tele van, oldalra.' },
  bridge:     { n: 'Szalaghíd', kat: 'dist', s: 1, cost: { graphite: 6, lead: 6 }, hp: 60, type: 'bridge', range: 4, cfg: 'link', desc: 'Legfeljebb 3 mezőt átugorva szállít egy másik hídhoz.' },
  unloader:   { n: 'Kirakodó', kat: 'dist', s: 1, cost: { titanium: 25, silicon: 30 }, hp: 70, type: 'unloader', cfg: 'item', desc: 'Kiveszi a kiválasztott anyagot a szomszédos tárolóból vagy magból.' },
  // termelés
  mdrill:     { n: 'Mechanikus fúró', kat: 'prod', s: 2, cost: { copper: 12 }, hp: 160, type: 'drill', tier: 2, time: 600, desc: 'Ércre téve lassan bányászik. Rezet, ólmot, homokot, szenet, hulladékot.' },
  pdrill:     { n: 'Pneumatikus fúró', kat: 'prod', s: 2, cost: { copper: 18, graphite: 10 }, hp: 190, type: 'drill', tier: 3, time: 400, desc: 'Gyorsabb fúró, titánt is bányászik.' },
  ldrill:     { n: 'Lézerfúró', kat: 'prod', s: 3, cost: { copper: 35, graphite: 30, silicon: 30, titanium: 20 }, hp: 420, type: 'drill', tier: 4, time: 280, power: 1.1, desc: 'Árammal működő nagy fúró, tóriumot is bányászik.' },
  // gyártás
  gpress:     { n: 'Grafitprés', kat: 'craft', s: 2, cost: { copper: 75, lead: 25 }, hp: 180, type: 'crafter', inp: { coal: 2 }, out: { graphite: 1 }, time: 90, desc: '2 szénből 1 grafit.' },
  smelter:    { n: 'Szilíciumolvasztó', kat: 'craft', s: 2, cost: { copper: 30, lead: 25 }, hp: 200, type: 'crafter', inp: { coal: 1, sand: 2 }, out: { silicon: 1 }, time: 40, power: .5, desc: 'Szénből és homokból szilícium. Áram kell.' },
  kiln:       { n: 'Kemence', kat: 'craft', s: 2, cost: { copper: 60, graphite: 30, lead: 30 }, hp: 200, type: 'crafter', inp: { lead: 1, sand: 1 }, out: { metaglass: 1 }, time: 30, power: .6, desc: 'Ólomból és homokból üvegfém. Áram kell.' },
  pulver:     { n: 'Őrlő', kat: 'craft', s: 1, cost: { copper: 30, lead: 25 }, hp: 80, type: 'crafter', inp: { scrap: 1 }, out: { sand: 1 }, time: 40, power: .5, desc: 'Fémhulladékból homok. Áram kell.' },
  container:  { n: 'Tároló', kat: 'craft', s: 2, cost: { titanium: 100 }, hp: 400, type: 'storage', cap: 300, desc: 'Anyagokat tárol (300 / fajta). Ha a maghoz ér, a mag része lesz.' },
  // áram
  combust:    { n: 'Égetőgenerátor', kat: 'power', s: 1, cost: { copper: 28, lead: 15 }, hp: 80, type: 'generator', gen: 1, burn: 120, desc: 'Szenet éget, áramot termel.' },
  solar:      { n: 'Napelem', kat: 'power', s: 1, cost: { silicon: 10 }, hp: 60, type: 'generator', gen: .1, desc: 'Kevés, de ingyen áram.' },
  lsolar:     { n: 'Nagy napelem', kat: 'power', s: 3, cost: { lead: 80, silicon: 110, metaglass: 15 }, hp: 300, type: 'generator', gen: 1.3, desc: 'Nagy napelemtábla.' },
  node:       { n: 'Áramcsomópont', kat: 'power', s: 1, cost: { copper: 1, lead: 3 }, hp: 40, type: 'node', range: 6, links: 10, desc: 'Lerakáskor összeköti a közeli áramos épületeket (6 mező).' },
  battery:    { n: 'Akkumulátor', kat: 'power', s: 1, cost: { copper: 5, lead: 50 }, hp: 70, type: 'battery', capP: 1000, desc: 'Tárolja a fölösleges áramot.' },
  // tornyok
  duo:        { n: 'Ikerágyú', kat: 'turret', s: 1, cost: { copper: 35 }, hp: 250, type: 'turret', range: 110, reload: 20, ground: 1, air: 1, ammo: { copper: { d: 9, n: 2, sp: 2.5 }, graphite: { d: 18, n: 4, sp: 3.5, rl: 1.2, rg: 16 }, silicon: { d: 12, n: 5, sp: 3, rl: .66, hom: 1 } }, alt: 1, desc: 'Két csövű kis torony. Lőszer: réz, grafit, szilícium.' },
  scatter:    { n: 'Szóró', kat: 'turret', s: 2, cost: { copper: 85, lead: 45 }, hp: 650, type: 'turret', range: 220, reload: 18, air: 1, ammo: { scrap: { d: 3, n: 5, sp: 5, fl: 22 }, lead: { d: 6, n: 4, sp: 5, fl: 26 }, metaglass: { d: 8, n: 5, sp: 5, fl: 32 } }, flak: 1, desc: 'Légvédelmi repeszágyú. Lőszer: hulladék, ólom, üvegfém.' },
  hail:       { n: 'Jégeső', kat: 'turret', s: 1, cost: { copper: 40, graphite: 17 }, hp: 260, type: 'turret', range: 235, reload: 60, ground: 1, ammo: { graphite: { d: 33, n: 1, sp: 2.2, spl: 20 }, silicon: { d: 33, n: 1, sp: 2.2, spl: 20, hom: 1 } }, art: 1, desc: 'Tüzérségi torony, csak földi célokra. Lőszer: grafit, szilícium.' },
  lancet:     { n: 'Lándzsa', kat: 'turret', s: 2, cost: { copper: 100, lead: 50, silicon: 45 }, hp: 700, type: 'turret', range: 165, reload: 80, ground: 1, power: 6, laser: { d: 140 }, desc: 'Átütő lézer, áramból tölt. Csak földi célokra.' },
  arc:        { n: 'Villám', kat: 'turret', s: 1, cost: { copper: 50, lead: 50 }, hp: 300, type: 'turret', range: 90, reload: 35, ground: 1, power: 3.3, arcd: 20, desc: 'Rövid hatótávú villám, áramból. Csak földi célokra.' },
  salvo:      { n: 'Sortűz', kat: 'turret', s: 2, cost: { copper: 100, graphite: 50, titanium: 25 }, hp: 900, type: 'turret', range: 190, reload: 38, ground: 1, burst: 4, ammo: { copper: { d: 11, n: 5, sp: 3.4 }, graphite: { d: 20, n: 4, sp: 3.6, rg: 32 }, silicon: { d: 15, n: 5, sp: 3.4, hom: 1 }, thorium: { d: 29, n: 4, sp: 4 } }, desc: 'Négyes sorozatokat lő. Csak földi célokra.' },
  // falak, javítás
  cwall:      { n: 'Rézfal', kat: 'def', s: 1, cost: { copper: 6 }, hp: 320, type: 'wall', desc: '' },
  cwallL:     { n: 'Nagy rézfal', kat: 'def', s: 2, cost: { copper: 24 }, hp: 1280, type: 'wall', desc: '' },
  twall:      { n: 'Titánfal', kat: 'def', s: 1, cost: { titanium: 6 }, hp: 440, type: 'wall', desc: '' },
  twallL:     { n: 'Nagy titánfal', kat: 'def', s: 2, cost: { titanium: 24 }, hp: 1760, type: 'wall', desc: '' },
  thwall:     { n: 'Tóriumfal', kat: 'def', s: 1, cost: { thorium: 6 }, hp: 800, type: 'wall', desc: '' },
  mender:     { n: 'Javító', kat: 'def', s: 1, cost: { lead: 30, silicon: 1 }, hp: 80, type: 'mender', range: 12, power: .3, desc: 'Időnként javítja a közeli épületeket.' },
  // egységek
  gfactory:   { n: 'Földi gyár', kat: 'units', s: 3, cost: { copper: 50, lead: 130, silicon: 80 }, hp: 600, type: 'factory', power: 1.2, plans: ['dagger', 'nova', 'crawler'], desc: 'Földi egységeket gyárt.' },
  afactory:   { n: 'Légi gyár', kat: 'units', s: 3, cost: { copper: 60, lead: 70 }, hp: 600, type: 'factory', power: 1.2, plans: ['flare', 'mono'], desc: 'Légi egységeket gyárt; a Bányász magától hordja a rezet és az ólmot.' },
  // mag (nem építhető)
  core:       { n: 'Mag: Szilánk', kat: null, s: 3, cost: {}, hp: 1100, type: 'core', cap: 4000 },
};
export const BUILD_ORDER = {
  turret: ['duo', 'scatter', 'hail', 'arc', 'lancet', 'salvo'],
  prod: ['mdrill', 'pdrill', 'ldrill'],
  dist: ['conveyor', 'titancon', 'junction', 'router', 'sorter', 'invsorter', 'overflow', 'bridge', 'unloader'],
  craft: ['gpress', 'smelter', 'kiln', 'pulver', 'container'],
  power: ['combust', 'node', 'battery', 'solar', 'lsolar'],
  def: ['cwall', 'cwallL', 'twall', 'twallL', 'thwall', 'mender'],
  units: ['gfactory', 'afactory'],
};

/* ---------- egységek ----------
   hp, sp: sebesség (világegység/lépés), air: repül, r: sugár, rng: lőtáv, d: sebzés, rl: újratöltés (lépés) */
export const UNITS = {
  alpha:   { n: 'Alfa', hp: 350, sp: 2.6, air: 1, r: 6, rng: 70, d: 18, rl: 22, mine: 1, build: .55, cost: null },
  dagger:  { n: 'Tőr', hp: 130, sp: .55, r: 5, rng: 60, d: 20, rl: 40, cost: { silicon: 10, lead: 10 }, time: 15 },
  mace:    { n: 'Buzogány', hp: 550, sp: .5, r: 7, rng: 34, d: 8, rl: 6, flame: 1, cost: null },
  fortress:{ n: 'Erőd', hp: 900, sp: .43, r: 9, rng: 200, d: 22, rl: 90, art: 1, cost: null },
  crawler: { n: 'Mászó', hp: 190, sp: 1.0, r: 4, rng: 12, d: 80, rl: 1, boom: 1, cost: { silicon: 8, coal: 10 }, time: 10 },
  nova:    { n: 'Nóva', hp: 120, sp: .6, r: 5, rng: 90, d: 13, rl: 30, air: 0, cost: { silicon: 30, lead: 20, titanium: 20 }, time: 30 },
  flare:   { n: 'Fáklya', hp: 70, sp: 2.2, air: 1, r: 4, rng: 50, d: 9, rl: 20, cost: { silicon: 15 }, time: 10 },
  horizon: { n: 'Horizont', hp: 340, sp: 1.7, air: 1, r: 7, rng: 10, d: 25, rl: 12, bomber: 1, cost: null },
  mono:    { n: 'Bányász', hp: 100, sp: 1.5, air: 1, r: 5, rng: 0, d: 0, rl: 0, miner: 1, cost: { silicon: 30, lead: 15 }, time: 35 },
};

/* ---------- kutatási fa ----------
   req: szülő; cost: a kutatás ára az „adatbázisból” (a szektorok magjaiból hazahozott anyag) */
export const TECH = [
  { id: 'core', req: null, cost: {} },
  { id: 'conveyor', req: 'core', cost: {} }, { id: 'mdrill', req: 'conveyor', cost: {} }, { id: 'duo', req: 'conveyor', cost: {} },
  { id: 'junction', req: 'conveyor', cost: { copper: 30 } }, { id: 'router', req: 'junction', cost: { copper: 40 } },
  { id: 'cwall', req: 'duo', cost: { copper: 40 } }, { id: 'cwallL', req: 'cwall', cost: { copper: 150 } },
  { id: 'scatter', req: 'duo', cost: { copper: 250, lead: 150 } }, { id: 'gpress', req: 'mdrill', cost: { copper: 300, lead: 100 } },
  { id: 'sorter', req: 'router', cost: { copper: 60, lead: 60 } }, { id: 'invsorter', req: 'sorter', cost: { copper: 80, lead: 80 } }, { id: 'overflow', req: 'sorter', cost: { copper: 120, lead: 60 } },
  { id: 'bridge', req: 'router', cost: { graphite: 60, lead: 60 } },
  { id: 'hail', req: 'scatter', cost: { copper: 200, graphite: 80 } }, { id: 'pdrill', req: 'gpress', cost: { copper: 300, graphite: 150 } },
  { id: 'combust', req: 'gpress', cost: { copper: 200, lead: 120 } }, { id: 'node', req: 'combust', cost: { copper: 40, lead: 120 } }, { id: 'battery', req: 'node', cost: { copper: 60, lead: 400 } },
  { id: 'smelter', req: 'combust', cost: { copper: 250, lead: 200 } }, { id: 'kiln', req: 'smelter', cost: { copper: 300, graphite: 150, lead: 200 } }, { id: 'pulver', req: 'smelter', cost: { copper: 200, lead: 150 } },
  { id: 'arc', req: 'node', cost: { copper: 300, lead: 300 } }, { id: 'lancet', req: 'arc', cost: { copper: 600, lead: 300, silicon: 250 } },
  { id: 'solar', req: 'smelter', cost: { silicon: 120 } }, { id: 'lsolar', req: 'solar', cost: { silicon: 600, lead: 400, metaglass: 100 } },
  { id: 'mender', req: 'smelter', cost: { lead: 200, silicon: 100 } },
  { id: 'gfactory', req: 'smelter', cost: { copper: 400, lead: 600, silicon: 400 } }, { id: 'afactory', req: 'gfactory', cost: { copper: 400, lead: 400, silicon: 300 } },
  { id: 'titancon', req: 'pdrill', cost: { copper: 300, lead: 300, titanium: 150 } }, { id: 'twall', req: 'pdrill', cost: { titanium: 120 } }, { id: 'twallL', req: 'twall', cost: { titanium: 400 } },
  { id: 'container', req: 'pdrill', cost: { titanium: 500 } }, { id: 'unloader', req: 'container', cost: { titanium: 300, silicon: 300 } },
  { id: 'salvo', req: 'hail', cost: { copper: 1000, graphite: 600, titanium: 300 } }, { id: 'ldrill', req: 'pdrill', cost: { copper: 600, graphite: 500, silicon: 400, titanium: 300 } },
  { id: 'thwall', req: 'twall', cost: { thorium: 200 } },
];

/* ---------- kampányok és szektorok ---------- */
// ores: érc → gyakoriság; win: ennyi hullám túlélése az elfoglalás; wt: hullámidő (mp); threat: erősség; air/gnd: légi/földi szorzó; sp: kezdőpontok száma
export const CAMPAIGNS = [
  { id: 'a', n: 'Első partraszállás', d: 'A kezdetek: réztől a tóriumig, öt szektoron át.', req: null },
  { id: 'b', n: 'Jeges perem', d: 'Fagyott síkságok, sok légi támadó.', req: 'erdo' },
  { id: 'c', n: 'Rozsdasivatag', d: 'Roncsmezők és dűnék, nehéz földi hadoszlopok.', req: 'krater' },
];
export const SECTORS = [
  { id: 'zero', camp: 'a', n: 'Nullpont', d: 'Az első partraszállás. Réz, ólom, homok és hulladék.', w: 110, h: 90, ores: { copper: 1, lead: .8, scrap: .5 }, sand: .25, biome: 'stone', win: 15, wt: 110, threat: 1, req: null, start: { copper: 200 } },
  { id: 'erdo', camp: 'a', n: 'Fagyott erdő', d: 'Szén a hó alatt – itt kezdődik a grafit és az áram.', w: 130, h: 110, ores: { copper: 1, lead: .8, coal: .9 }, sand: .2, biome: 'snow', win: 15, wt: 120, threat: 1.3, req: 'zero', start: { copper: 300, lead: 100 } },
  { id: 'krater', camp: 'a', n: 'A kráterek', d: 'Homokos mélyedések, légi támadók. Szilícium kell.', w: 130, h: 120, ores: { copper: 1, lead: .9, coal: .8, scrap: .6 }, sand: .55, biome: 'sand', win: 20, wt: 105, threat: 1.7, req: 'erdo', start: { copper: 400, lead: 200, graphite: 50 } },
  { id: 'titan', camp: 'a', n: 'Titánszirtek', d: 'Kemény kőzet titánnal. Erősebb hullámok, Buzogányok.', w: 150, h: 130, ores: { copper: 1, lead: .9, coal: .7, titanium: .8, scrap: .3 }, sand: .3, biome: 'dark', win: 25, wt: 100, threat: 2.3, req: 'krater', start: { copper: 600, lead: 400, graphite: 150, silicon: 100 } },
  { id: 'hasadek', camp: 'a', n: 'Tórium-hasadék', d: 'A legmélyebb lelőhely. Erődök és bombázók.', w: 160, h: 140, ores: { copper: 1, lead: .9, coal: .8, titanium: .9, thorium: .6, scrap: .4 }, sand: .35, biome: 'dark', win: 35, wt: 95, threat: 3.2, req: 'titan', start: { copper: 1000, lead: 800, graphite: 300, silicon: 300, titanium: 200 } },

  { id: 'fagyhid', camp: 'b', n: 'Fagyhíd', d: 'Befagyott tavak között keskeny átjárók.', w: 120, h: 100, ores: { copper: 1, lead: .9, coal: .8 }, sand: .2, biome: 'snow', water: 1.4, win: 15, wt: 115, threat: 1.5, air: 1.8, req: null, start: { copper: 400, lead: 200, graphite: 50 } },
  { id: 'jegmezo', camp: 'b', n: 'Jégmező', d: 'Nyílt jégsíkság, a fáklyák rajokban jönnek.', w: 140, h: 115, ores: { copper: 1, lead: .9, coal: .7, titanium: .7 }, sand: .25, biome: 'ice', water: 1.2, win: 20, wt: 110, threat: 2, air: 2.2, req: 'fagyhid', start: { copper: 600, lead: 400, graphite: 120, silicon: 80 } },
  { id: 'sarkikoho', camp: 'b', n: 'Sarki kohó', d: 'Elhagyott olvasztó a gleccser szélén. Két irányból támadnak.', w: 150, h: 130, ores: { copper: 1, lead: .9, coal: .8, titanium: .8, scrap: .5 }, sand: .3, biome: 'snow', win: 25, wt: 105, threat: 2.6, air: 1.8, sp: 2, req: 'jegmezo', start: { copper: 900, lead: 600, graphite: 250, silicon: 200, titanium: 100 } },
  { id: 'feher', camp: 'b', n: 'Fehér csend', d: 'A perem vége. Bombázók és erődök hóviharban.', w: 165, h: 145, ores: { copper: 1, lead: .9, coal: .8, titanium: .9, thorium: .6 }, sand: .3, biome: 'ice', water: 1.3, win: 30, wt: 100, threat: 3.4, air: 2, sp: 3, req: 'sarkikoho', start: { copper: 1400, lead: 1000, graphite: 400, silicon: 400, titanium: 300 } },

  { id: 'roncs', camp: 'c', n: 'Roncstelep', d: 'Régi csatatér, tele fémhulladékkal.', w: 120, h: 100, ores: { copper: .8, lead: .8, scrap: 1.3, coal: .5 }, sand: .5, biome: 'sand', win: 15, wt: 110, threat: 1.8, gnd: 1.3, req: null, start: { copper: 500, lead: 300, graphite: 80 } },
  { id: 'dunek', camp: 'c', n: 'Vándordűnék', d: 'Homoktenger, a Mászók falkákban rohannak.', w: 145, h: 115, ores: { copper: 1, lead: .9, coal: .8, titanium: .6, scrap: .8 }, sand: .7, biome: 'sand', win: 20, wt: 105, threat: 2.3, gnd: 1.5, req: 'roncs', start: { copper: 700, lead: 500, graphite: 150, silicon: 100 } },
  { id: 'olvasztar', camp: 'c', n: 'Olvasztár', d: 'Sötét salakmező, minden érc megvan – az ellenség is tudja.', w: 155, h: 130, ores: { copper: 1, lead: .9, coal: .9, titanium: .9, thorium: .5, scrap: .6 }, sand: .4, biome: 'dark', win: 25, wt: 100, threat: 3, gnd: 1.4, sp: 2, req: 'dunek', start: { copper: 1000, lead: 800, graphite: 300, silicon: 300, titanium: 200 } },
  { id: 'vassziv', camp: 'c', n: 'Vasszív', d: 'A sivatag közepe. Negyven hullám, három irányból.', w: 170, h: 150, ores: { copper: 1, lead: 1, coal: .9, titanium: 1, thorium: .8, scrap: .6 }, sand: .4, biome: 'dark', win: 40, wt: 95, threat: 3.8, gnd: 1.3, air: 1.2, sp: 3, req: 'olvasztar', start: { copper: 1600, lead: 1200, graphite: 500, silicon: 500, titanium: 400, thorium: 100 } },
];

/* ---------- szabad játék ---------- */
const ALLORE = { copper: 1, lead: .9, coal: .8, titanium: .75, thorium: .5, scrap: .5 };
export const MAPS = [
  { id: 'komezo', n: 'Kőmező', biome: 'stone', ores: ALLORE, sand: .3 },
  { id: 'homezo', n: 'Hómező', biome: 'snow', ores: ALLORE, sand: .2, water: 1.2 },
  { id: 'jegtukor', n: 'Jégtükör', biome: 'ice', ores: ALLORE, sand: .2, water: 1.6 },
  { id: 'dunek', n: 'Homokdűnék', biome: 'sand', ores: { ...ALLORE, scrap: 1 }, sand: .6 },
  { id: 'hasadek', n: 'Sötét hasadék', biome: 'dark', ores: { ...ALLORE, thorium: .8 }, sand: .3 },
  { id: 'volgy', n: 'Zöld völgy', biome: 'grass', ores: ALLORE, sand: .3, water: 1.1 },
  { id: 'szigetek', n: 'Szigetvilág', biome: 'stone', ores: ALLORE, sand: .4, water: 2.2 },
];
export const FREE_OPTS = {
  map: MAPS.map(m => [m.id, m.n]),
  size: [['s', 'Kicsi', [100, 80]], ['m', 'Közepes', [130, 110]], ['l', 'Nagy', [170, 140]]],
  diff: [['easy', 'Könnyű', .7], ['norm', 'Normál', 1.2], ['hard', 'Nehéz', 1.9], ['brut', 'Brutális', 2.8]],
  wt: [[60, '60 mp'], [90, '90 mp'], [120, '120 mp'], [180, '180 mp']],
  win: [[0, 'Végtelen'], [20, '20'], [40, '40'], [60, '60']],
  sp: [[1, '1'], [2, '2'], [3, '3']],
  ore: [[.6, 'Kevés'], [1, 'Normál'], [1.5, 'Sok']],
  start: [['base', 'Alap', { copper: 300, lead: 100 }], ['rich', 'Bőséges', { copper: 3000, lead: 2000, graphite: 800, silicon: 800, titanium: 500, metaglass: 200 }], ['max', 'Korlátlan', { copper: 4000, lead: 4000, graphite: 4000, silicon: 4000, titanium: 4000, metaglass: 4000, coal: 4000, sand: 4000, thorium: 4000, scrap: 4000 }]],
  res: [['own', 'Saját kutatás'], ['all', 'Minden feloldva']],
};
export const FREE_DEF = { map: 'komezo', size: 'm', diff: 'norm', wt: 120, win: 0, sp: 1, ore: 1, start: 'base', res: 'own' };
export const freeRanked = o => o.win === 0 && o.diff !== 'easy' && o.start === 'base' && o.res === 'own' && o.wt <= 120;
export function freeSector(o, seed) {
  const F = (k) => FREE_OPTS[k].find(x => x[0] === o[k]), M = MAPS.find(m => m.id === o.map), [w, h] = F('size')[2];
  const ores = {}; for (const k in M.ores) ores[k] = M.ores[k] * o.ore;
  return { id: 'free_' + seed, free: 1, n: 'Szabad játék – ' + M.n, d: '', w, h, ores, sand: M.sand, biome: M.biome, water: M.water, win: o.win, wt: o.wt, threat: F('diff')[2], sp: o.sp, start: F('start')[2], endless: o.win === 0, unlockAll: o.res === 'all', ranked: freeRanked(o) };
}

/* ---------- hullámok ---------- */
// a hullám összetétele: a szektor fenyegetettsége és a hullám sorszáma alapján
export function waveUnits(w, sec) {
  const threat = sec.threat, A = sec.air || 1, G = sec.gnd || 1;
  const out = [], f = threat * (sec.endless ? 1 + w / 30 : 1), add = (t, n) => { for (let i = 0; i < Math.round(n); i++) out.push(t); };
  add('dagger', Math.min(40, (1 + w * .55) * f * G));
  if (w >= 2) add('flare', Math.min(18 * A, (w - 1) * .4 * f * A * (w % 2 ? 1 : .5)));
  if (w >= 5) add('crawler', Math.min(20 * G, (w - 4) * .45 * f * G * (w % 3 === 0 ? 1.5 : .6)));
  if (w >= 8 && threat > 1.2) add('mace', Math.min(12, (w - 7) * .18 * f));
  if (w >= 10 && threat > 1.6) add('horizon', Math.min(10 * A, (w - 9) * .2 * f * A * (w % 2 ? 1 : 0)));
  if (w >= 14 && threat > 2.2) add('fortress', Math.min(8, (w - 13) * .12 * f));
  if (w % 10 === 0 && w > 0) add(threat > 2 ? 'fortress' : 'mace', 1 + w / 20);   // őrző-hullám
  return out;
}
