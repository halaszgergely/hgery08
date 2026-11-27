// Kohóvár – a játék adatai: anyagok, folyadékok, blokkok, egységek, kutatási fa, hullámok, szektorok.
// A játékmenet és a számértékek a Mindustry (Anuke) Serpulo-tartalmát követik: https://store.steampowered.com/app/1127400/Mindustry/
// Saját kód és saját rajzolt grafika.
import { EN } from './nevek.js?v=202611271522';

export const TS = 8;            // egy mező mérete világegységben
export const TPS = 60;          // szimulációs lépés másodpercenként

/* ---------- anyagok ---------- */
// h: keménység, cost: építési idő súlya, f: éghetőség, ex: robbanékonyság, rad: radioaktivitás
// (a sorrend elejét a régi mentések miatt nem szabad megváltoztatni)
export const ITEMS = {
  copper:     { n: 'Réz',           c: '#d99d73', c2: '#a8673f', h: 1, cost: .5 },
  lead:       { n: 'Ólom',          c: '#8c7fa9', c2: '#5e5478', h: 1, cost: .7 },
  sand:       { n: 'Homok',         c: '#e3c38b', c2: '#b8975d', h: 0, cost: 1 },
  coal:       { n: 'Szén',          c: '#3a3a3f', c2: '#222226', h: 2, cost: 1, f: 1, ex: .2 },
  scrap:      { n: 'Fémhulladék',   c: '#8b8174', c2: '#5d564d', h: 0, cost: .5 },
  titanium:   { n: 'Titán',         c: '#9da8d8', c2: '#6872a8', h: 3, cost: 1 },
  thorium:    { n: 'Tórium',        c: '#e57fa4', c2: '#a8506f', h: 4, cost: 1.1, rad: 1, ex: .2 },
  graphite:   { n: 'Grafit',        c: '#5f6c7e', c2: '#3c4553', h: 0, cost: 1 },
  silicon:    { n: 'Szilícium',     c: '#53565c', c2: '#2e3034', h: 0, cost: .8 },
  metaglass:  { n: 'Üvegfém',       c: '#ebeef5', c2: '#a9b3c4', h: 0, cost: 1.5 },
  plastanium: { n: 'Plasztánium',   c: '#cbd97f', c2: '#8a9a45', h: 0, cost: 1.3, f: .1, ex: .2 },
  phase:      { n: 'Fázisszövet',   c: '#f4ba6e', c2: '#b9803a', h: 0, cost: 1.3, rad: .6 },
  surge:      { n: 'Túlfeszötvözet', c: '#f3e979', c2: '#b8ad3f', h: 0, cost: 1.2 },
  spore:      { n: 'Spóratok',      c: '#7457ce', c2: '#4c3791', h: 0, cost: 1, f: 1.15 },
  blast:      { n: 'Robbanóanyag',  c: '#ff795e', c2: '#b84a36', h: 0, cost: 1, f: .4, ex: 1.2 },
  pyratite:   { n: 'Piratit',       c: '#ffaa5f', c2: '#b96f33', h: 0, cost: 1, f: 1.4, ex: .4 },
  // Erekir
  beryllium:  { n: 'Berillium',     c: '#3a8f64', c2: '#256446', h: 3, cost: 1.2, pl: 'e' },
  tungsten:   { n: 'Volfrám',       c: '#768a9a', c2: '#4f5f6c', h: 5, cost: 1.5, pl: 'e' },
  oxide:      { n: 'Oxid',          c: '#e4ffd6', c2: '#a9c49c', h: 0, cost: 1.2, pl: 'e' },
  carbide:    { n: 'Karbid',        c: '#89769a', c2: '#5e4f6c', h: 0, cost: 1.4, pl: 'e' },
};
// melyik bolygón jelenik meg az anyag (a raktár és a technológiafa fülei szerint); a közösek mindkettőn
export const ITEM_PL = { serpulo: ['copper', 'lead', 'metaglass', 'graphite', 'sand', 'coal', 'titanium', 'thorium', 'scrap', 'silicon', 'plastanium', 'phase', 'surge', 'spore', 'blast', 'pyratite'], erekir: ['beryllium', 'tungsten', 'graphite', 'sand', 'silicon', 'oxide', 'thorium', 'carbide', 'phase', 'surge'] };
export const ITEM_IDS = Object.keys(ITEMS);
export const LIQUIDS = {
  water: { n: 'Víz',          c: '#596ab8', hc: .4, st: 'wet' },
  slag:  { n: 'Salak',        c: '#ffa166', hc: 0,  st: 'melt', d: 1 },
  oil:   { n: 'Olaj',         c: '#313131', hc: .7, st: 'tar' },
  cryo:  { n: 'Kriofolyadék', c: '#6ecdec', hc: .9, st: 'freeze' },
  ozone:    { n: 'Ózon',       c: '#fc81dd', hc: 0, gas: 1 },
  hydrogen: { n: 'Hidrogén',   c: '#9eabf7', hc: 0, gas: 1 },
  nitrogen: { n: 'Nitrogén',   c: '#efe3ff', hc: 0, gas: 1 },
  cyanogen: { n: 'Ciánogén',   c: '#89e8b6', hc: 0, gas: 1 },
  arkycite: { n: 'Arkicit',    c: '#84a94b', hc: 0 },
};
// állapothatások: sp sebességszorzó, dps sebzés/lépés, dm kapott sebzés szorzója
export const STATUS = { burn: { dps: .167, c: '#ffaa5f' }, freeze: { sp: .6, dm: 1.25, c: '#6ecdec' }, wet: { sp: .94, c: '#596ab8' }, tar: { sp: .6, c: '#313131' }, melt: { sp: .8, dps: .3, c: '#ffa166' }, sap: { sp: .7, c: '#bf92f9' }, od: { sp: 1.15, dmg: 1.3, c: '#ffd37f' } };

/* ---------- talaj és szikla ---------- */
// ore: fúrható (homok), liq: szivattyúzható, heat/spores/oil: hőgenerátor, tenyésztő, olajkút szorzója
export const FLOORS = {
  stone:    { c: '#55565b', c2: '#4b4c51' },
  dark:     { c: '#3b3d44', c2: '#34363c' },
  sandf:    { c: '#b89a68', c2: '#a88c5c', ore: 'sand', oil: .7 },
  darksand: { c: '#6a5d4b', c2: '#5e5243', ore: 'sand', oil: 1.5 },
  snow:     { c: '#c9d4df', c2: '#bcc8d4' },
  ice:      { c: '#9cc3d9', c2: '#8db5cc' },
  grass:    { c: '#4f7042', c2: '#46663b' },
  metal:    { c: '#5d6470', c2: '#535a65' },
  water:    { c: '#2e6e9e', c2: '#2a6592', shallow: 1, liq: 'water' },
  deep:     { c: '#1d4a75', c2: '#1a446b', deep: 1, liq: 'water' },
  spawn:    { c: '#5a2d2d', c2: '#522929' },
  moss:     { c: '#3d5a3e', c2: '#365238', spores: .15 },
  spore:    { c: '#5c4576', c2: '#523c6a', spores: .3 },
  sporedark: { c: '#3b3049', c2: '#342a40' },
  shale:    { c: '#46504a', c2: '#3f4843', oil: 1.6 },
  basalt:   { c: '#33363f', c2: '#2d3038' },
  hotrock:  { c: '#7d5139', c2: '#704832', heat: .5 },
  magmarock: { c: '#95592f', c2: '#874f29', heat: .75 },
  ash:      { c: '#4a4340', c2: '#423c39' },
  magma:    { c: '#e8792b', c2: '#f09a3a', deep: 1, liq: 'slag', heat: .85, glow: 1 },
  tar:      { c: '#2a2a30', c2: '#232328', shallow: 1, liq: 'oil' },
  salt:     { c: '#c9c9c0', c2: '#bdbdb3' },
  // a Mindustry eredeti pályáinak további talajai (a nevük a Mindustry-név)
  'crater-stone': { c: '#57575c', c2: '#57575c' },
  'core-zone': { c: '#8b7662', c2: '#8b7662' },
  'dark-panel-1': { c: '#4f505c', c2: '#4f505c' },
  'dark-panel-2': { c: '#55505a', c2: '#55505a' },
  'dark-panel-3': { c: '#4d4e5a', c2: '#4d4e5a' },
  'dark-panel-4': { c: '#575966', c2: '#575966' },
  'dark-panel-5': { c: '#5b5762', c2: '#5b5762' },
  'dark-panel-6': { c: '#655a62', c2: '#655a62' },
  'darksand-tainted-water': { c: '#4b4160', c2: '#4b4160', shallow: 1, liq: 'water', spores: .1 },
  'darksand-water': { c: '#444869', c2: '#444869', shallow: 1, liq: 'water' },
  'sand-water': { c: '#97879f', c2: '#97879f', shallow: 1, liq: 'water' },
  'tainted-water': { c: '#604b94', c2: '#604b94', shallow: 1, liq: 'water', spores: .15 },
  'deep-tainted-water': { c: '#44356b', c2: '#44356b', deep: 1, liq: 'water', spores: .15 },
  'ice-snow': { c: '#cbcdf3', c2: '#cbcdf3' },
  'metal-floor-2': { c: '#686975', c2: '#686975' },
  'metal-floor-3': { c: '#747784', c2: '#747784' },
  'metal-floor-4': { c: '#797c8a', c2: '#797c8a' },
  'metal-floor-5': { c: '#8d7263', c2: '#8d7263' },
  'metal-floor-damaged': { c: '#6c6e7a', c2: '#6c6e7a' },
  'mud': { c: '#351f1b', c2: '#351f1b' },
  'metal-tiles-1': { c: '#44444d', c2: '#44444d', auto: 1 },
  'metal-tiles-2': { c: '#3a3a43', c2: '#3a3a43', auto: 1 },
  'metal-tiles-3': { c: '#73574b', c2: '#73574b', auto: 1 },
  'metal-tiles-4': { c: '#79444d', c2: '#79444d', auto: 1 },
  'metal-tiles-5': { c: '#3e3d47', c2: '#3e3d47', auto: 1 },
  'metal-tiles-6': { c: '#935555', c2: '#935555', auto: 1 },
  'metal-tiles-7': { c: '#42424b', c2: '#42424b', auto: 1 },
  'metal-tiles-8': { c: '#404049', c2: '#404049', auto: 1 },
  'metal-tiles-9': { c: '#3d3d46', c2: '#3d3d46', auto: 1 },
  'metal-tiles-10': { c: '#43434c', c2: '#43434c', auto: 1 },
  'metal-tiles-11': { c: '#44444d', c2: '#44444d', auto: 1 },
  'metal-tiles-12': { c: '#9c4b4f', c2: '#9c4b4f', auto: 1 },
  'metal-tiles-13': { c: '#50515a', c2: '#50515a', auto: 1 },
  // Erekir (a gőzkürtők 3×3-asak, steam: gőz-attribútum)
  'yellow-stone': { c: '#966446', c2: '#966446' },
  'rough-rhyolite': { c: '#6a4137', c2: '#6a4137' },
  'rhyolite': { c: '#764a3c', c2: '#764a3c' },
  'rhyolite-crater': { c: '#744739', c2: '#744739' },
  'carbon-stone': { c: '#2d3139', c2: '#2d3139' },
  'beryllic-stone': { c: '#363e39', c2: '#363e39' },
  'arkyic-stone': { c: '#496041', c2: '#496041' },
  'yellow-stone-plates': { c: '#a77949', c2: '#a77949' },
  'regolith': { c: '#946146', c2: '#946146' },
  'dense-red-stone': { c: '#be5d58', c2: '#be5d58' },
  'crystalline-stone': { c: '#3a333d', c2: '#3a333d' },
  'crystal-floor': { c: '#4c3d57', c2: '#4c3d57' },
  'red-stone': { c: '#b55055', c2: '#b55055' },
  'arkycite-floor': { c: '#6e924c', c2: '#6e924c', liq: 'arkycite', shallow: 1 },
  'rhyolite-vent': { c: '#562e27', c2: '#562e27', steam: 1, vent: 'rhyolite' },
  'yellow-stone-vent': { c: '#774931', c2: '#774931', steam: 1, vent: 'yellow-stone' },
  'carbon-vent': { c: '#1e2129', c2: '#1e2129', steam: 1, vent: 'carbon-stone' },
  'arkyic-vent': { c: '#354635', c2: '#354635', steam: 1, vent: 'arkyic-stone' },
  'crystalline-vent': { c: '#29242c', c2: '#29242c', steam: 1, vent: 'crystalline-stone' },
  'red-stone-vent': { c: '#8c3c48', c2: '#8c3c48', steam: 1, vent: 'dense-red-stone' },
};
export const WALLS = { rock: '#2e2f34', snowrock: '#7a8794', sandrock: '#7c6a4e', darkrock: '#25262b', mossrock: '#2a3a2c', sporerock: '#382b47', basaltrock: '#20222a', hotwall: '#4c2f22',
  'dune-wall': '#525050', 'ice-wall': '#c0bef6', 'salt-wall': '#dee1e9', 'shale-wall': '#686a91', 'red-ice-wall': '#e5c8ce', 'red-stone-wall': '#aa4c51', 'crystalline-stone-wall': '#615160', 'dark-metal': '#727582',
  'metal-wall-1': '#51515a', 'metal-wall-2': '#575760', 'metal-wall-3': '#504f58', 'snow-pine': '#d8e0eb', 'spore-pine': '#844686', 'white-tree': '#c2c7e2', 'white-tree-dead': '#ccd5e5', pine: '#529153',
  'yellow-stone-wall': '#956541', 'rhyolite-wall': '#6a3f34', 'carbon-wall': '#3e454a', 'beryllic-stone-wall': '#475449', 'arkyic-wall': '#5d784f', 'graphitic-wall': '#495261', 'regolith-wall': '#b78c51', 'red-stone-wall': '#aa4c51', 'crystalline-stone-wall': '#615160', 'crystal-orbs': '#718e59', 'crystal-blocks': '#bd9352', 'crystal-cluster': '#786376', 'vibrant-crystal-cluster': '#a872a3' };
export const TREES = new Set(['snow-pine', 'spore-pine', 'white-tree', 'white-tree-dead', 'pine', 'crystal-orbs', 'crystal-blocks', 'crystal-cluster', 'vibrant-crystal-cluster']);
// a falak homok-attribútuma (sziklazúzó) és a falból bányászható anyag (Mindustry StaticWall attributes / itemDrop)
export const WALL_SAND = { 'stone-wall': 1, 'sand-wall': 2, 'dune-wall': 1, 'regolith-wall': 1, 'yellow-stone-wall': 1.5, 'rhyolite-wall': 1, 'carbon-wall': .7, 'ferric-stone-wall': .5, 'beryllic-stone-wall': 1.2, 'red-stone-wall': 1.5, rock: 1, sandrock: 2, hotwall: .5, basaltrock: .7 };
export const WALL_DROP = { 'graphitic-wall': 'graphite' };
// a Mindustry-nevek → Kohóvár talaj- és faltípusok (az eredeti pályák betöltéséhez)
export const MFLOOR = { stone: 'stone', dacite: 'dark', 'sand-floor': 'sandf', darksand: 'darksand', snow: 'snow', ice: 'ice', grass: 'grass', 'metal-floor': 'metal', 'shallow-water': 'water', 'deep-water': 'deep', moss: 'moss', 'spore-moss': 'spore', dirt: 'sporedark', shale: 'shale', basalt: 'basalt', hotrock: 'hotrock', magmarock: 'magmarock', char: 'ash', 'molten-slag': 'magma', slag: 'magma', tar: 'tar', salt: 'salt' };
export const MWALL = { 'stone-wall': 'rock', 'snow-wall': 'snowrock', 'sand-wall': 'sandrock', 'dacite-wall': 'darkrock', 'dirt-wall': 'mossrock', 'spore-wall': 'sporerock', 'carbon-wall': 'basaltrock', 'ferric-stone-wall': 'hotwall', shrubs: 'mossrock', 'spore-pine': 'spore-pine', 'ice-snow-wall': 'snowrock', 'dark-panel-wall': 'dark-metal', cliff: 'rock' };
export const MPROP = new Set(['boulder', 'snow-boulder', 'sand-boulder', 'dacite-boulder', 'shale-boulder', 'basalt-boulder', 'spore-cluster', 'beryllic-boulder', 'arkyic-boulder', 'carbon-boulder', 'rhyolite-boulder', 'yellow-stone-boulder', 'red-stone-boulder', 'crystalline-boulder']);
// biomok: f: [alap, változat], wall, sand: fúrható homokos talaj, liq: [sekély, mély], x: [különleges talaj, gyakoriság]
export const BIO = {
  stone:  { f: ['stone', 'dark'], wall: 'rock', sand: 'sandf', liq: ['water', 'deep'] },
  snow:   { f: ['snow', 'ice'], wall: 'snowrock', sand: 'darksand', liq: ['water', 'deep'] },
  ice:    { f: ['ice', 'snow'], wall: 'snowrock', sand: 'darksand', liq: ['water', 'deep'] },
  sand:   { f: ['darksand', 'sandf'], wall: 'sandrock', sand: 'sandf', x: ['tar', .12] },
  dark:   { f: ['dark', 'metal'], wall: 'darkrock', sand: 'darksand', liq: ['water', 'deep'], x: ['shale', .3] },
  grass:  { f: ['grass', 'moss'], wall: 'mossrock', sand: 'sandf', liq: ['water', 'deep'] },
  moss:   { f: ['moss', 'shale'], wall: 'mossrock', sand: 'darksand', liq: ['water', 'deep'], x: ['tar', .1] },
  spore:  { f: ['spore', 'sporedark'], wall: 'sporerock', sand: 'darksand', liq: ['water', 'deep'], x: ['moss', .25] },
  basalt: { f: ['basalt', 'ash'], wall: 'basaltrock', sand: 'darksand', x: ['hotrock', .22] },
  magma:  { f: ['hotrock', 'magmarock'], wall: 'hotwall', sand: 'sandf', liq: ['magma', 'magma'], lq: .6, x: ['basalt', .3] },
};

/* ---------- blokkok ---------- */
export const CATS = [
  ['turret', 'Tornyok', '◎'], ['prod', 'Termelés', '⛏'], ['dist', 'Szállítás', '⇉'], ['liquid', 'Folyadék', '≈'], ['power', 'Áram', 'ϟ'],
  ['def', 'Falak', '▦'], ['craft', 'Gyártás', '⚙'], ['units', 'Egységek', '◭'], ['effect', 'Támogatás', '✚'],
];
const B = (n, kat, s, hp, cost, type, o) => ({ n, kat, s, hp, cost, type, ...o });
const TU = (n, s, hp, cost, o) => B(n, 'turret', s, hp, cost, 'turret', { air: 1, ground: 1, ...o });
const x4 = (c, m = 4) => Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v * m]));
const WALL = (n, s, hp1, c1, o) => B(n, 'def', s, hp1 * 4 * s * s, x4(c1, s * s), 'wall', o);
const art = (d, spl, splR, o) => ({ k: 'art', d, sp: 3, spl, splR, ...o });
export const BLOCKS = {
  /* szállítás */
  conveyor:   B('Szállítószalag', 'dist', 1, 45, { copper: 1 }, 'conveyor', { rot: 1, speed: 5, mv: .035 }),
  titancon:   B('Titánszalag', 'dist', 1, 65, { copper: 1, lead: 1, titanium: 1 }, 'conveyor', { rot: 1, speed: 10, mv: .08 }),
  plastcon:   B('Plasztánium-szalag', 'dist', 1, 90, { plastanium: 1, silicon: 1, graphite: 1 }, 'sconv', { rot: 1, speed: 40 }),
  armorcon:   B('Páncélozott szalag', 'dist', 1, 280, { plastanium: 1, thorium: 1, metaglass: 1 }, 'conveyor', { rot: 1, speed: 10, mv: .08, armored: 1 }),
  junction:   B('Kereszteződés', 'dist', 1, 30, { copper: 3 }, 'junction'),
  bridge:     B('Szalaghíd', 'dist', 1, 60, { lead: 6, copper: 6 }, 'bridge', { range: 4, cfg: 'link', tt: 4 }),
  phasecon:   B('Fázisszalag', 'dist', 1, 80, { phase: 5, silicon: 7, lead: 10, graphite: 10 }, 'bridge', { range: 12, cfg: 'link', power: .3, tt: 2 }),
  sorter:     B('Válogató', 'dist', 1, 45, { lead: 2, copper: 2 }, 'sorter', { cfg: 'item' }),
  invsorter:  B('Fordított válogató', 'dist', 1, 45, { lead: 2, copper: 2 }, 'sorter', { inv: 1, cfg: 'item' }),
  router:     B('Elosztó', 'dist', 1, 45, { copper: 3 }, 'router'),
  distributor: B('Nagy elosztó', 'dist', 2, 160, { lead: 4, copper: 4 }, 'router'),
  overflow:   B('Túlfolyókapu', 'dist', 1, 45, { lead: 2, copper: 4 }, 'overflow'),
  underflow:  B('Alulfolyókapu', 'dist', 1, 45, { lead: 2, copper: 4 }, 'overflow', { inv: 1 }),
  unloader:   B('Kirakodó', 'dist', 1, 70, { titanium: 25, silicon: 30 }, 'unloader', { cfg: 'item' }),
  driver:     B('Tömegvető', 'dist', 3, 430, { titanium: 125, silicon: 75, lead: 125, thorium: 50 }, 'driver', { range: 440, power: 1.75, cap: 120, reload: 200, cfg: 'link' }),
  /* folyadék */
  mpump:      B('Mechanikus szivattyú', 'liquid', 1, 60, { copper: 15, metaglass: 10 }, 'pump', { amt: 7 / 60, lcap: 20, float: 1 }),
  rpump:      B('Forgószivattyú', 'liquid', 2, 240, { copper: 70, metaglass: 50, silicon: 20, titanium: 35 }, 'pump', { amt: .2, lcap: 80, power: .3, float: 1 }),
  ipump:      B('Impulzusszivattyú', 'liquid', 3, 540, { copper: 80, metaglass: 90, silicon: 30, titanium: 40, thorium: 35 }, 'pump', { amt: .22, lcap: 200, power: 1.3, float: 1 }),
  conduit:    B('Cső', 'liquid', 1, 45, { metaglass: 1 }, 'conduit', { rot: 1, lcap: 20, lmove: 1 }),
  pconduit:   B('Impulzuscső', 'liquid', 1, 90, { titanium: 2, metaglass: 1 }, 'conduit', { rot: 1, lcap: 40, lmove: 1 }),
  plconduit:  B('Páncélozott cső', 'liquid', 1, 220, { thorium: 2, metaglass: 1, plastanium: 1 }, 'conduit', { rot: 1, lcap: 50, lmove: 1, armored: 1 }),
  lrouter:    B('Folyadékelosztó', 'liquid', 1, 60, { graphite: 4, metaglass: 2 }, 'lrouter', { lcap: 120, lmove: 1 }),
  lcontainer: B('Folyadéktároló', 'liquid', 2, 240, { titanium: 10, metaglass: 15 }, 'lrouter', { lcap: 700, lmove: 1 }),
  ltank:      B('Folyadéktartály', 'liquid', 3, 500, { titanium: 30, metaglass: 40 }, 'lrouter', { lcap: 1800, lmove: 1 }),
  ljunction:  B('Csőkereszteződés', 'liquid', 1, 60, { graphite: 4, metaglass: 8 }, 'ljunction'),
  lbridge:    B('Csőhíd', 'liquid', 1, 60, { graphite: 4, metaglass: 8 }, 'lbridge', { range: 4, lcap: 100, lmove: 1, cfg: 'link', float: 1 }),
  phaseconduit: B('Fáziscső', 'liquid', 1, 80, { phase: 5, silicon: 7, metaglass: 20, titanium: 10 }, 'lbridge', { range: 12, lcap: 100, lmove: 1, cfg: 'link', power: .3, float: 1 }),
  /* áram */
  node:       B('Áramcsomópont', 'power', 1, 40, { copper: 2, lead: 6 }, 'node', { range: 6, links: 10 }),
  nodeL:      B('Nagy áramcsomópont', 'power', 2, 160, { titanium: 5, lead: 10, silicon: 3 }, 'node', { range: 15, links: 15 }),
  surgetower: B('Távvezeték-torony', 'power', 2, 160, { titanium: 7, lead: 10, silicon: 15, surge: 15 }, 'node', { range: 40, links: 2 }),
  diode:      B('Dióda', 'power', 1, 40, { silicon: 10, plastanium: 5, metaglass: 10 }, 'diode', { rot: 1 }),
  battery:    B('Akkumulátor', 'power', 1, 70, { copper: 5, lead: 20 }, 'battery', { capP: 4000 }),
  batteryL:   B('Nagy akkumulátor', 'power', 3, 630, { titanium: 20, lead: 50, silicon: 30 }, 'battery', { capP: 50000 }),
  combust:    B('Égetőgenerátor', 'power', 1, 80, { copper: 25, lead: 15 }, 'generator', { gen: 1, mode: 'burn', dur: 120 }),
  thermal:    B('Hőgenerátor', 'power', 2, 320, { copper: 40, graphite: 35, lead: 50, silicon: 35, metaglass: 40 }, 'generator', { gen: 1.8, mode: 'thermal', float: 1 }),
  steam:      B('Gőzgenerátor', 'power', 2, 320, { copper: 35, graphite: 25, lead: 40, silicon: 30 }, 'generator', { gen: 5.5, mode: 'burn', dur: 90, inL: ['water', .1] }),
  diffgen:    B('Differenciálgenerátor', 'power', 3, 720, { copper: 70, titanium: 50, lead: 100, silicon: 65, metaglass: 50 }, 'generator', { gen: 18, mode: 'item', fuel: 'pyratite', dur: 220, inL: ['cryo', .1] }),
  rtg:        B('RTG-generátor', 'power', 2, 320, { lead: 100, silicon: 75, phase: 25, plastanium: 75, thorium: 50 }, 'generator', { gen: 4.5, mode: 'rtg', dur: 840 }),
  solar:      B('Napelem', 'power', 1, 60, { lead: 10, silicon: 8 }, 'generator', { gen: .12, mode: 'solar' }),
  lsolar:     B('Nagy napelem', 'power', 3, 540, { lead: 60, silicon: 70, phase: 15 }, 'generator', { gen: 1.6, mode: 'solar' }),
  reactor:    B('Tóriumreaktor', 'power', 3, 1400, { lead: 300, silicon: 200, graphite: 150, thorium: 150, metaglass: 50 }, 'generator', { gen: 15, mode: 'reactor', fuel: 'thorium', dur: 360, icap: 30, lcap: 30, inL: ['cryo', .04] }),
  impact:     B('Impaktreaktor', 'power', 4, 900, { lead: 500, silicon: 300, graphite: 400, thorium: 100, surge: 250, metaglass: 250 }, 'generator', { gen: 130, mode: 'impact', fuel: 'blast', dur: 140, power: 25, lcap: 80, inL: ['cryo', .25] }),
  /* termelés */
  mdrill:     B('Mechanikus fúró', 'prod', 2, 160, { copper: 12 }, 'drill', { tier: 2, time: 600, boostL: .05, boost: 1.6 }),
  pdrill:     B('Pneumatikus fúró', 'prod', 2, 160, { copper: 18, graphite: 10 }, 'drill', { tier: 3, time: 400, boostL: 3.5 / 60, boost: 1.6 }),
  ldrill:     B('Lézerfúró', 'prod', 3, 360, { copper: 35, graphite: 30, silicon: 30, titanium: 20 }, 'drill', { tier: 4, time: 280, power: 1.1, boostL: .08, boost: 1.6 }),
  bdrill:     B('Légsűrítéses fúró', 'prod', 4, 640, { copper: 65, silicon: 60, titanium: 50, thorium: 75 }, 'drill', { tier: 5, time: 280, power: 3, boostL: .1, boost: 1.8, icap: 20, warm: .01, rotS: 6 }),
  wextract:   B('Vízkinyerő', 'prod', 2, 160, { metaglass: 30, graphite: 30, lead: 30, copper: 30 }, 'crafter', { outL: ['water', .11], power: 1.5, lcap: 40 }),
  cultivator: B('Spóratenyésztő', 'prod', 2, 160, { copper: 25, lead: 25, silicon: 10 }, 'crafter', { out: { spore: 1 }, time: 100, power: 80 / 60, inL: ['water', .3], lcap: 80, attr: 'spores', aScale: 1, aMax: 2 }),
  oilext:     B('Olajkút', 'prod', 3, 360, { copper: 150, graphite: 175, lead: 115, thorium: 115, silicon: 75 }, 'crafter', { inp: { sand: 1 }, time: 60, outL: ['oil', .25], power: 3, inL: ['water', .15], lcap: 40, attr: 'oil', aBase: 0, aAvg: 1 }),
  /* gyártás */
  gpress:     B('Grafitprés', 'craft', 2, 160, { copper: 75, lead: 30 }, 'crafter', { inp: { coal: 2 }, out: { graphite: 1 }, time: 90 }),
  mpress:     B('Többfokozatú prés', 'craft', 3, 360, { titanium: 100, silicon: 25, lead: 100, graphite: 50 }, 'crafter', { inp: { coal: 3 }, out: { graphite: 2 }, time: 30, power: 1.8, inL: ['water', .1], icap: 20 }),
  smelter:    B('Szilíciumolvasztó', 'craft', 2, 160, { copper: 30, lead: 25 }, 'crafter', { inp: { coal: 1, sand: 2 }, out: { silicon: 1 }, time: 40, power: .5 }),
  crucible:   B('Szilíciumtégely', 'craft', 3, 360, { titanium: 120, metaglass: 80, plastanium: 35, silicon: 60 }, 'crafter', { inp: { coal: 4, sand: 6, pyratite: 1 }, out: { silicon: 8 }, time: 90, power: 4, icap: 30, attr: 'heat', aScale: .15, aMax: 1 }),
  kiln:       B('Kemence', 'craft', 2, 160, { copper: 60, graphite: 30, lead: 30 }, 'crafter', { inp: { lead: 1, sand: 1 }, out: { metaglass: 1 }, time: 30, power: .6 }),
  plastcomp:  B('Plasztánium-sűrítő', 'craft', 2, 320, { silicon: 80, lead: 115, graphite: 60, titanium: 80 }, 'crafter', { inp: { titanium: 2 }, out: { plastanium: 1 }, time: 60, power: 3, inL: ['oil', .25], lcap: 60 }),
  weaver:     B('Fázisszövő', 'craft', 2, 160, { silicon: 130, lead: 120, thorium: 75 }, 'crafter', { inp: { thorium: 4, sand: 10 }, out: { phase: 1 }, time: 120, power: 5, icap: 30 }),
  surgesm:    B('Ötvözetolvasztó', 'craft', 3, 360, { silicon: 80, lead: 80, thorium: 70 }, 'crafter', { inp: { copper: 3, lead: 4, titanium: 2, silicon: 3 }, out: { surge: 1 }, time: 75, power: 4, icap: 20 }),
  cryomix:    B('Kriofolyadék-keverő', 'craft', 2, 160, { lead: 65, silicon: 40, titanium: 60 }, 'crafter', { inp: { titanium: 1 }, time: 120, outL: ['cryo', .2], power: 1, inL: ['water', .2], lcap: 36 }),
  pyramix:    B('Piratitkeverő', 'craft', 2, 160, { copper: 50, lead: 25 }, 'crafter', { inp: { coal: 1, lead: 2, sand: 2 }, out: { pyratite: 1 }, time: 80, power: .2 }),
  blastmix:   B('Robbanóanyag-keverő', 'craft', 2, 160, { lead: 30, titanium: 20 }, 'crafter', { inp: { pyratite: 1, spore: 1 }, out: { blast: 1 }, time: 80, power: .4 }),
  melter:     B('Olvasztó', 'craft', 1, 200, { copper: 30, lead: 35, graphite: 45 }, 'crafter', { inp: { scrap: 1 }, time: 10, outL: ['slag', .2], power: 1, lcap: 20 }),
  separator:  B('Szeparátor', 'craft', 2, 160, { copper: 30, titanium: 25 }, 'crafter', { time: 35, power: 1.1, inL: ['slag', 4 / 60], sep: { copper: 5, lead: 3, graphite: 2, titanium: 2 } }),
  disass:     B('Szétbontó', 'craft', 3, 360, { plastanium: 40, titanium: 100, silicon: 150, thorium: 80 }, 'crafter', { inp: { scrap: 1 }, time: 15, power: 4, inL: ['slag', .12], icap: 20, sep: { sand: 2, graphite: 1, titanium: 1, thorium: 1 } }),
  sporepress: B('Spóraprés', 'craft', 2, 320, { lead: 35, silicon: 30 }, 'crafter', { inp: { spore: 1 }, time: 20, outL: ['oil', .3], power: .7, lcap: 60 }),
  pulver:     B('Őrlő', 'craft', 1, 40, { copper: 30, lead: 25 }, 'crafter', { inp: { scrap: 1 }, out: { sand: 1 }, time: 40, power: .5 }),
  centrifuge: B('Széncentrifuga', 'craft', 2, 160, { titanium: 20, graphite: 40, lead: 30 }, 'crafter', { out: { coal: 1 }, time: 30, power: .7, inL: ['oil', .1] }),
  incinerator: B('Égető', 'craft', 1, 90, { graphite: 5, lead: 15 }, 'incinerator', { power: .5 }),
  /* falak */
  cwall:      WALL('Rézfal', 1, 80, { copper: 6 }),
  cwallL:     WALL('Nagy rézfal', 2, 80, { copper: 6 }),
  twall:      WALL('Titánfal', 1, 110, { titanium: 6 }),
  twallL:     WALL('Nagy titánfal', 2, 110, { titanium: 6 }),
  plwall:     WALL('Plasztánium-fal', 1, 125, { plastanium: 5, metaglass: 2 }, { insul: 1 }),
  plwallL:    WALL('Nagy plasztánium-fal', 2, 125, { plastanium: 5, metaglass: 2 }, { insul: 1 }),
  thwall:     WALL('Tóriumfal', 1, 200, { thorium: 6 }),
  thwallL:    WALL('Nagy tóriumfal', 2, 200, { thorium: 6 }),
  phwall:     WALL('Fázisfal', 1, 150, { phase: 6 }, { deflect: 10 }),
  phwallL:    WALL('Nagy fázisfal', 2, 150, { phase: 6 }, { deflect: 10 }),
  swall:      WALL('Ötvözetfal', 1, 230, { surge: 6 }, { zap: .05 }),
  swallL:     WALL('Nagy ötvözetfal', 2, 230, { surge: 6 }, { zap: .05 }),
  door:       WALL('Ajtó', 1, 100, { titanium: 6, silicon: 4 }, { door: 1 }),
  doorL:      WALL('Nagy ajtó', 2, 100, { titanium: 6, silicon: 4 }, { door: 1 }),
  scwall:     WALL('Hulladékfal', 1, 60, { scrap: 6 }),
  scwallL:    WALL('Nagy hulladékfal', 2, 60, { scrap: 6 }),
  scwallH:    WALL('Hatalmas hulladékfal', 3, 60, { scrap: 6 }),
  scwallG:    WALL('Gigászi hulladékfal', 4, 60, { scrap: 6 }),
  /* támogatás, mag, tárolás */
  mender:     B('Javító', 'effect', 1, 80, { lead: 30, copper: 25 }, 'mender', { power: .3, reload: 200, range: 40, heal: 4, bItem: 'silicon', bHeal: 4, bRange: 20 }),
  mendproj:   B('Javítóvetítő', 'effect', 2, 320, { lead: 100, titanium: 25, silicon: 40, copper: 50 }, 'mender', { power: 1.5, reload: 250, range: 85, heal: 11, bItem: 'phase', bHeal: 15, bRange: 50 }),
  overdrive:  B('Gyorsítóvetítő', 'effect', 2, 320, { lead: 100, titanium: 75, silicon: 75, plastanium: 30 }, 'overdrive', { power: 3.5, range: 80, od: 1.5, bItem: 'phase', bOd: .75, bRange: 20 }),
  dome:       B('Gyorsítókupola', 'effect', 3, 720, { lead: 200, titanium: 130, silicon: 130, plastanium: 80, surge: 120 }, 'overdrive', { power: 10, range: 200, od: 2.5, need: { phase: 1, silicon: 1 }, useT: 300 }),
  forceproj:  B('Erőtérvetítő', 'effect', 3, 720, { lead: 100, titanium: 75, silicon: 125 }, 'shield', { power: 4, radius: 101.7, shp: 750, regen: 1.5, broken: .35, bItem: 'phase', bRadius: 80 }),
  lamp:       B('Megvilágító', 'effect', 1, 40, { graphite: 12, silicon: 8, lead: 8 }, 'lamp', { power: .05 }),
  mine:       B('Sokkoló akna', 'effect', 1, 50, { lead: 25, silicon: 12 }, 'mine', { d: 25, cnt: 4 }),
  core:       B('Mag: Szilánk', null, 3, 1100, { copper: 1000, lead: 800 }, 'core', { cap: 4000, tier: 1, unit: 'alpha', ucap: 8 }),
  foundation: B('Mag: Alapzat', 'effect', 4, 3500, { copper: 3000, lead: 3000, silicon: 2000 }, 'core', { cap: 9000, tier: 2, unit: 'beta', ucap: 16 }),
  nucleus:    B('Mag: Nukleusz', 'effect', 5, 6000, { copper: 8000, lead: 8000, silicon: 5000, thorium: 4000 }, 'core', { cap: 13000, tier: 3, unit: 'gamma', ucap: 24 }),
  container:  B('Tároló', 'effect', 2, 240, { titanium: 100 }, 'storage', { cap: 300 }),
  vault:      B('Széf', 'effect', 3, 540, { titanium: 250, thorium: 125 }, 'storage', { cap: 1000 }),
  launchpad:  B('Kilövőállás', 'effect', 3, 540, { copper: 350, silicon: 140, lead: 200, titanium: 150 }, 'launchpad', { power: 4, cap: 100, time: 1200 }),
  /* tornyok – ammo: lőszer szerinti lövedék; n: lövés / tárgy, rlm: tűzgyorsaság-szorzó, rg: hatótáv-többlet */
  duo:        TU('Ikerágyú', 1, 250, { copper: 35 }, { range: 160, reload: 20, alt: 1, cool: .1, coolM: 10, ammo: { copper: { d: 9, sp: 2.5 }, graphite: { d: 18, sp: 3.5, n: 4, rlm: .8, rg: 16 }, silicon: { d: 12, sp: 3, n: 5, rlm: 1.5, hom: .2 } } }),
  scatter:    TU('Szóró', 2, 800, { copper: 85, lead: 45 }, { range: 220, reload: 18, ground: 0, shots: 2, sd: 5, cool: .2, ammo: { scrap: { k: 'flak', d: 3, sp: 4, n: 5, rlm: .5, spl: 33, splR: 24 }, lead: { k: 'flak', d: 3, sp: 4.2, n: 4, spl: 40.5, splR: 15 }, metaglass: { k: 'flak', d: 3, sp: 4, n: 5, rlm: .8, spl: 45, splR: 20, frag: { n: 6, d: 5, sp: 3, life: 20, ground: 0 } } } }),
  scorch:     TU('Perzselő', 1, 400, { copper: 25, graphite: 22 }, { range: 60, reload: 6, air: 0, cool: .1, coolM: 1.5, ammo: { coal: { k: 'flame', d: 17, sp: 3.35, n: 3, st: 'burn', stT: 240 }, pyratite: { k: 'flame', d: 30, sp: 4, n: 10, st: 'burn', stT: 600 } } }),
  hail:       TU('Jégeső', 1, 260, { copper: 40, graphite: 17 }, { range: 235, reload: 60, air: 0, cool: .1, coolM: 10, ammo: { graphite: art(20, 33, 19), silicon: art(20, 33, 19, { rlm: 1.2, n: 3, hom: .08 }), pyratite: art(25, 45, 19, { n: 4, st: 'burn', stT: 720 }) } }),
  wave:       TU('Hullám', 2, 1000, { metaglass: 45, lead: 75, copper: 25 }, { range: 110, reload: 3, lcap: 10, lsp: 3.5, lam: 1, lammo: { water: 0, slag: 4, cryo: 0, oil: 0 } }),
  lancet:     TU('Lándzsa', 2, 1120, { copper: 60, lead: 70, silicon: 60, titanium: 30 }, { range: 165, reload: 80, air: 0, power: 6, cool: .2, laser: { d: 140, len: 173, charge: 40, pierce: 4 } }),
  arc:        TU('Villám', 1, 260, { copper: 50, lead: 50 }, { range: 90, reload: 35, air: 0, power: 3.3, cool: .1, coolM: 30, arcd: 12 }),
  parallax:   TU('Vonósugár', 2, 640, { silicon: 160, titanium: 110, graphite: 50 }, { range: 300, ground: 0, power: 3.3, tractor: { force: .35, d: .5 } }),
  swarmer:    TU('Raj', 2, 1200, { graphite: 35, titanium: 35, plastanium: 45, silicon: 30 }, { range: 240, reload: 34, shots: 4, sd: 4, each: 1, cool: .3, ammo: { blast: { k: 'missile', d: 10, sp: 3.7, n: 5, spl: 45, splR: 30 }, pyratite: { k: 'missile', d: 12, sp: 3.7, n: 5, spl: 45, splR: 20, st: 'burn', stT: 300 }, surge: { k: 'missile', d: 18, sp: 3.7, n: 4, spl: 35, splR: 25, zap: 2, zapD: 10 } } }),
  salvo:      TU('Sortűz', 2, 960, { copper: 100, graphite: 80, titanium: 50 }, { range: 190, reload: 29, shots: 4, sd: 3, each: 1, cool: .2, ammo: { copper: { d: 15, sp: 2.5, n: 5 }, graphite: { d: 31, sp: 3.5, n: 4, rlm: .8, rg: 32 }, pyratite: { d: 25, sp: 3.2, n: 5, spl: 15, splR: 22, st: 'burn', stT: 300 }, silicon: { d: 23, sp: 3, n: 5, rlm: 1.5, hom: .2 }, thorium: { d: 28, sp: 4, n: 4 } } }),
  segment:    TU('Szegmens', 2, 1000, { silicon: 130, thorium: 80, phase: 40, titanium: 40 }, { range: 180, reload: 8, power: 8, pd: 30 }),
  tsunami:    TU('Cunami', 3, 2250, { metaglass: 100, lead: 400, titanium: 250, thorium: 100 }, { range: 190, reload: 3, shots: 2, lcap: 40, lsp: 4, lam: .4, lammo: { water: .2, slag: 4.75, cryo: .2, oil: .2 } }),
  fuse:       TU('Repesz', 3, 1980, { copper: 225, graphite: 225, thorium: 100 }, { range: 90, reload: 35, cool: .3, spread: 3, ammo: { titanium: { k: 'shrap', d: 66, len: 100, n: 4, rlm: 1.3 }, thorium: { k: 'shrap', d: 105, len: 100, n: 5 } } }),
  ripple:     TU('Hullámverés', 3, 1170, { copper: 150, graphite: 135, titanium: 60 }, { range: 290, reload: 120, air: 0, shots: 4, sd: 0, cool: .3, scat: 14, ammo: { graphite: art(40, 70, 22.5), silicon: art(40, 70, 22.5, { rlm: 1.2, n: 3, hom: .08 }), pyratite: art(48, 90, 22.5, { n: 4, st: 'burn', stT: 720 }), blast: art(40, 90, 37.5, { sp: 2, n: 4 }), plastanium: art(40, 90, 30, { sp: 3.4, frag: { n: 15, d: 14, sp: 2.5, life: 15, air: 0 } }) } }),
  cyclone:    TU('Ciklon', 3, 1305, { copper: 200, titanium: 125, plastanium: 80 }, { range: 200, reload: 10, cool: .3, alt: 1, ammo: { metaglass: { k: 'flak', d: 6, sp: 4, n: 2, rlm: .8, spl: 45, splR: 25, gnd: 1, frag: { n: 4, d: 12, sp: 3, life: 20 } }, blast: { k: 'flak', d: 8, sp: 4, n: 5, spl: 45, splR: 60, gnd: 1 }, plastanium: { k: 'flak', d: 8, sp: 4, n: 4, spl: 37.5, splR: 40, gnd: 1, frag: { n: 6, d: 12, sp: 2.5, life: 15 } }, surge: { k: 'flak', d: 13, sp: 4.5, n: 5, spl: 75, splR: 38, gnd: 1, zap: 2, zapD: 13 } } }),
  foreshadow: TU('Előjel', 4, 2400, { copper: 1000, metaglass: 600, surge: 300, plastanium: 200, silicon: 600 }, { range: 500, reload: 200, power: 10, cool: 1, coolM: .4, maxAmmo: 40, ammo: { surge: { k: 'rail', d: 1350, n: 1 } } }),
  spectre:    TU('Kísértet', 4, 2560, { copper: 900, graphite: 300, surge: 250, plastanium: 175, thorium: 250 }, { range: 260, reload: 7, alt: 1, cool: 1, coolM: .5, ammo: { graphite: { d: 50, sp: 7.5, n: 4, rlm: 1.7 }, thorium: { d: 80, sp: 8, pierce: 2 }, pyratite: { d: 70, sp: 7, n: 3, pierce: 2, spl: 20, splR: 25, st: 'burn', stT: 300 } } }),
  meltdown:   TU('Olvadás', 4, 3200, { copper: 1200, lead: 350, graphite: 300, surge: 325, silicon: 325 }, { range: 195, reload: 90, power: 17, beam: { d: 78, len: 200, dur: 230 }, coolReq: .5, lcap: 30 }),
  /* egységek */
  gfactory:   B('Földi gyár', 'units', 3, 540, { copper: 50, lead: 120, silicon: 80 }, 'factory', { rot: 1, power: 1.2, plans: ['dagger', 'crawler', 'nova'] }),
  afactory:   B('Légi gyár', 'units', 3, 540, { copper: 60, lead: 70, silicon: 60 }, 'factory', { rot: 1, power: 1.2, plans: ['flare', 'mono'] }),
  navalf:     B('Vízi gyár', 'units', 3, 540, { copper: 150, lead: 130, metaglass: 120 }, 'factory', { rot: 1, power: 1.2, plans: ['risso', 'retusa'], water: 1, float: 1 }),
  additive:   B('Additív átépítő', 'units', 3, 540, { copper: 200, lead: 120, silicon: 90 }, 'recon', { rot: 1, power: 3, inp: { silicon: 40, graphite: 40 }, time: 600, up: { nova: 'pulsar', dagger: 'mace', crawler: 'atrax', flare: 'horizon', mono: 'poly', risso: 'minke', retusa: 'oxynoe' } }),
  multi:      B('Multiplikatív átépítő', 'units', 5, 1500, { lead: 650, silicon: 450, titanium: 350, thorium: 650 }, 'recon', { rot: 1, power: 6, inp: { silicon: 130, titanium: 80, metaglass: 40 }, time: 1800, up: { horizon: 'zenith', mace: 'fortress', poly: 'mega', pulsar: 'quasar', atrax: 'spiroct', minke: 'bryde', oxynoe: 'cyerce' } }),
  expo:       B('Exponenciális átépítő', 'units', 7, 2940, { lead: 2000, silicon: 1000, titanium: 2000, thorium: 750, plastanium: 450, phase: 600 }, 'recon', { rot: 1, power: 13, inp: { silicon: 850, titanium: 750, plastanium: 650 }, inL: ['cryo', 1], lcap: 120, time: 5400, up: { zenith: 'antumbra', spiroct: 'arkyid', fortress: 'scepter', mega: 'quad', quasar: 'vela', bryde: 'sei', cyerce: 'aegires' } }),
  tetra:      B('Tetratív átépítő', 'units', 9, 4860, { lead: 4000, silicon: 3000, thorium: 1000, plastanium: 600, phase: 600, surge: 800 }, 'recon', { rot: 1, power: 25, inp: { silicon: 1000, plastanium: 600, surge: 500, phase: 350 }, inL: ['cryo', 3], lcap: 360, time: 14400, up: { antumbra: 'eclipse', arkyid: 'toxopid', scepter: 'reign', quad: 'oct', vela: 'corvus', sei: 'omura', aegires: 'navanax' } }),
  repairpt:   B('Javítópont', 'units', 1, 80, { lead: 30, copper: 30, silicon: 20 }, 'repair', { power: 1, range: 60, rep: .45 }),
  repairtur:  B('Javítótorony', 'units', 2, 320, { silicon: 90, thorium: 80, plastanium: 60 }, 'repair', { power: 5, range: 145, rep: 3 }),
  /* ===== Erekir (pl: 'e') – a Mindustry Erekir-tartalma ===== */
  duct:       B('Csatorna', 'dist', 1, 90, { beryllium: 1 }, 'conveyor', { rot: 1, speed: 8, mv: .06, duct: 1, pl: 'e' }),
  aduct:      B('Páncélozott csatorna', 'dist', 1, 140, { beryllium: 2, tungsten: 1 }, 'conveyor', { rot: 1, speed: 8, mv: .06, duct: 1, armored: 1, pl: 'e' }),
  drouter:    B('Csatornaelosztó', 'dist', 1, 90, { beryllium: 10 }, 'router', { rot: 1, fwd: 1, pl: 'e' }),
  dbridge:    B('Csatornahíd', 'dist', 1, 90, { beryllium: 15 }, 'bridge', { range: 4, cfg: 'link', tt: 4, pl: 'e' }),
  oduct:      B('Túlfolyó csatorna', 'dist', 1, 90, { graphite: 8, beryllium: 8 }, 'overflow', { pl: 'e' }),
  uduct:      B('Alulfolyó csatorna', 'dist', 1, 90, { graphite: 8, beryllium: 8 }, 'overflow', { inv: 1, pl: 'e' }),
  dunloader:  B('Csatorna-kirakodó', 'dist', 1, 120, { graphite: 20, silicon: 20, tungsten: 10 }, 'unloader', { cfg: 'item', pl: 'e' }),
  pbore:      B('Plazmafúró', 'prod', 2, 160, { beryllium: 40 }, 'beamdrill', { rot: 1, tier: 3, time: 160, range: 5, power: .15, boostL: .25 / 60, boostLiq: 'hydrogen', boost: 2.5, icap: 10, lcap: 10, pl: 'e' }),
  lpbore:     B('Nagy plazmafúró', 'prod', 3, 360, { silicon: 100, oxide: 25, beryllium: 100, tungsten: 70 }, 'beamdrill', { rot: 1, tier: 5, time: 100, range: 6, power: .8, needL: ['hydrogen', .5 / 60], icap: 20, lcap: 20, pl: 'e' }),
  idrill:     B('Ütvefúró', 'prod', 4, 640, { silicon: 70, beryllium: 90, graphite: 60 }, 'drill', { tier: 6, time: 720, power: 160 / 60, needL: ['water', 10 / 60], icap: 40, lcap: 40, warm: .01, rotS: 0, burst: 1, block: 'thorium', pl: 'e' }),
  crusher:    B('Sziklazúzó', 'prod', 2, 160, { graphite: 25, beryllium: 20 }, 'wcrafter', { rot: 1, time: 110, power: 11 / 60, out: { sand: 1 }, icap: 10, pl: 'e' }),
  ventcond:   B('Gőzkondenzátor', 'prod', 3, 360, { graphite: 20, beryllium: 60 }, 'crafter', { outL: ['water', .5], power: .5, lcap: 60, attr: 'steam', aBase: 0, aScale: 1 / 9, aMin: 9, pl: 'e' }),
  turbine:    B('Turbinás kondenzátor', 'power', 3, 360, { beryllium: 60 }, 'generator', { gen: 1 / 3, mode: 'thermal', attr: 'steam', aMin: 9, outL: ['water', 5 / 60 / 9], lcap: 20, pl: 'e' }),
  bnode:      B('Sugárcsomópont', 'power', 1, 90, { beryllium: 8 }, 'node', { range: 10, links: 0, beam: 1, pl: 'e' }),
  btower:     B('Sugártorony', 'power', 3, 810, { beryllium: 30, oxide: 10, silicon: 10 }, 'node', { range: 23, links: 0, beam: 1, pl: 'e' }),
  chemcomb:   B('Vegyi égetőkamra', 'power', 3, 360, { graphite: 40, tungsten: 20, oxide: 40, silicon: 30 }, 'generator', { gen: 550 / 60, mode: 'liq', inL: ['arkycite', 40 / 60], inL2: ['ozone', 2 / 60], lcap: 40, pl: 'e' }),
  arcfurn:    B('Szilícium-ívkemence', 'craft', 3, 360, { beryllium: 70, graphite: 80 }, 'crafter', { inp: { graphite: 1, sand: 4 }, out: { silicon: 4 }, time: 50, power: 5, icap: 30, pl: 'e' }),
  electro:    B('Elektrolizáló', 'craft', 3, 360, { silicon: 50, graphite: 40, beryllium: 130, tungsten: 80 }, 'crafter', { inL: ['water', 10 / 60], outL: ['ozone', 4 / 60], outL2: ['hydrogen', 6 / 60], power: 1, time: 10, lcap: 50, pl: 'e' }),
  oxid:       B('Oxidációs kamra', 'craft', 3, 360, { tungsten: 120, graphite: 80, silicon: 100, beryllium: 120 }, 'crafter', { rot: 1, inp: { beryllium: 1 }, out: { oxide: 1 }, inL: ['ozone', 2 / 60], power: .5, time: 120, lcap: 30, heatOut: 5, pl: 'e' }),
  eheater:    B('Elektromos fűtő', 'craft', 2, 160, { tungsten: 30, oxide: 30, beryllium: 30 }, 'heater', { rot: 1, power: 100 / 60, heatOut: 3, pl: 'e' }),
  hredir:     B('Hőterelő', 'craft', 3, 360, { tungsten: 10, graphite: 10 }, 'heatcond', { rot: 1, pl: 'e' }),
  carbcruc:   B('Karbidtégely', 'craft', 3, 360, { tungsten: 110, thorium: 150, oxide: 60 }, 'crafter', { inp: { tungsten: 2, graphite: 3 }, out: { carbide: 1 }, time: 135 / 4, power: 2, icap: 20, heatReq: 40, heatMax: 1, pl: 'e' }),
  bwall:      WALL('Berilliumfal', 1, 130, { beryllium: 6 }, { armor: 2, pl: 'e' }),
  bwallL:     WALL('Nagy berilliumfal', 2, 130, { beryllium: 6 }, { armor: 2, pl: 'e' }),
  wwall:      WALL('Volfrámfal', 1, 180, { tungsten: 6 }, { armor: 14, pl: 'e' }),
  wwallL:     WALL('Nagy volfrámfal', 2, 180, { tungsten: 6 }, { armor: 14, pl: 'e' }),
  rconduit:   B('Megerősített cső', 'liquid', 1, 250, { beryllium: 2 }, 'conduit', { rot: 1, lcap: 50, lmove: 1, armored: 1, pl: 'e' }),
  rpumpE:     B('Megerősített szivattyú', 'liquid', 2, 160, { beryllium: 40, tungsten: 30, silicon: 20 }, 'pump', { amt: 80 / 60 / 4, lcap: 160, needL: ['hydrogen', 1.5 / 60], pl: 'e' }),
  rljunc:     B('Megerősített csőkereszteződés', 'liquid', 1, 250, { graphite: 4, beryllium: 8 }, 'ljunction', { pl: 'e' }),
  rlbridge:   B('Megerősített csőhíd', 'liquid', 1, 250, { graphite: 8, beryllium: 20 }, 'lbridge', { range: 4, lcap: 120, lmove: 1, cfg: 'link', float: 1, pl: 'e' }),
  rlrouter:   B('Megerősített folyadékelosztó', 'liquid', 1, 250, { graphite: 8, beryllium: 4 }, 'lrouter', { lcap: 150, lmove: 1, pl: 'e' }),
  rlcont:     B('Megerősített folyadéktároló', 'liquid', 2, 400, { tungsten: 10, beryllium: 16 }, 'lrouter', { lcap: 1000, lmove: 1, pl: 'e' }),
  rltank:     B('Megerősített folyadéktartály', 'liquid', 3, 900, { tungsten: 40, beryllium: 50 }, 'lrouter', { lcap: 2700, lmove: 1, pl: 'e' }),
  bastion:    B('Mag: Bástya', 'effect', 4, 4500, { graphite: 1000, silicon: 1000, beryllium: 800 }, 'core', { cap: 2000, tier: 1, unit: 'evoke', ucap: 15, zone: 1, armor: 5, pl: 'e' }),
  rcontainer: B('Megerősített tároló', 'effect', 2, 480, { tungsten: 30, graphite: 40 }, 'storage', { cap: 160, noMerge: 1, pl: 'e' }),
  rvault:     B('Megerősített széf', 'effect', 3, 1080, { tungsten: 125, thorium: 70, beryllium: 100 }, 'storage', { cap: 900, noMerge: 1, pl: 'e' }),
  regen:      B('Regeneráló vetítő', 'effect', 3, 360, { silicon: 80, tungsten: 60, oxide: 40, beryllium: 80 }, 'mender', { power: 1, reload: 60, range: 112, heal: 4, square: 1, pl: 'e' }),
  breach:     TU('Áttörés', 3, 1620, { beryllium: 150, silicon: 150, graphite: 125 }, { range: 190, reload: 40, cool: .25, coolM: 15, ammo: { beryllium: { d: 85, sp: 7.5, n: .5, pierce: 2, pb: 1, bdm: .3 }, tungsten: { d: 95, sp: 8, n: 1, pierce: 4, pb: 1, rg: 40, bdm: .3 }, carbide: { d: 433, sp: 12, n: 1, rlm: .2, rg: 56, bdm: .3, frag: { n: 3, d: 227, sp: 8.1, life: 8 } } }, ebase: 1, pl: 'e' }),
  diffuse:    TU('Szórólöveg', 3, 1890, { beryllium: 150, silicon: 200, graphite: 200, tungsten: 50 }, { range: 125, reload: 30, shots: 15, spr: 4, cool: .25, coolM: 15, ammo: { graphite: { d: 41, sp: 8, n: 1 / 3, bdm: .2, kb: 4 }, oxide: { d: 90, sp: 8, n: 2 / 3, bdm: .2, kb: 3 }, silicon: { d: 35, sp: 8, n: 1 / 3, hom: .045, bdm: .2 } }, ebase: 1, pl: 'e' }),
  sublimate:  TU('Szublimáló', 3, 1890, { tungsten: 150, silicon: 200, oxide: 40, beryllium: 400 }, { range: 130, reload: 5, lcap: 50, lammo: { ozone: 0, cyanogen: 0 }, lflame: { ozone: { d: 60, len: 130, pierce: 2, c: '#c88af5' }, cyanogen: { d: 130, len: 200, pierce: 3, c: '#89e8b6' } }, luse: 18 / 60, ebase: 1, pl: 'e' }),
  tankfab:    B('Lánctalpas-gyártó', 'units', 3, 540, { silicon: 200, beryllium: 150 }, 'factory', { rot: 1, power: 1.5, plans: ['stell'], pl: 'e' }),
  mechfab:    B('Lépegető-gyártó', 'units', 3, 540, { silicon: 200, beryllium: 250, tungsten: 10 }, 'factory', { rot: 1, power: 1.5, plans: ['merui'], pl: 'e' }),
  shipfab:    B('Hajógyártó', 'units', 3, 540, { silicon: 250, beryllium: 200 }, 'factory', { rot: 1, power: 1.5, plans: ['elude'], pl: 'e' }),
  tankrefab:  B('Lánctalpas-átépítő', 'units', 3, 540, { beryllium: 200, tungsten: 80, silicon: 100 }, 'recon', { rot: 1, power: 3, inp: { silicon: 40, tungsten: 30 }, inL: ['hydrogen', 3 / 60], lcap: 30, time: 1800, up: { stell: 'locus' }, pl: 'e' }),
  mechrefab:  B('Lépegető-átépítő', 'units', 3, 540, { beryllium: 250, tungsten: 175, silicon: 150 }, 'recon', { rot: 1, power: 2.5, inp: { silicon: 50, tungsten: 40 }, inL: ['hydrogen', 3 / 60], lcap: 30, time: 2700, up: { merui: 'cleroi' }, pl: 'e' }),
  shiprefab:  B('Hajóátépítő', 'units', 3, 540, { beryllium: 250, tungsten: 120, silicon: 150, oxide: 15 }, 'recon', { rot: 1, power: 2.5, inp: { silicon: 60, tungsten: 40 }, inL: ['hydrogen', 3 / 60], lcap: 30, time: 3000, up: { elude: 'avert' }, pl: 'e' }),
  /* Erekir – 2. kör */
  citadel:    B('Mag: Citadella', 'effect', 5, 16000, { silicon: 4000, beryllium: 4000, tungsten: 3000, oxide: 1000 }, 'core', { cap: 3000, tier: 2, unit: 'incite', ucap: 30, zone: 1, armor: 10, pl: 'e' }),
  acropolis:  B('Mag: Akropolisz', 'effect', 6, 30000, { beryllium: 6000, silicon: 5000, tungsten: 5000, carbide: 3000, oxide: 3000 }, 'core', { cap: 4000, tier: 3, unit: 'emanate', ucap: 45, zone: 1, armor: 15, pl: 'e' }),
  radar:      B('Radar', 'effect', 1, 60, { silicon: 60, graphite: 50, beryllium: 10 }, 'radar', { power: .6, range: 34, pl: 'e' }),
  btowerB:    B('Építőtorony', 'effect', 3, 360, { silicon: 150, oxide: 40, thorium: 60 }, 'btower', { power: 3, range: 200, build: 1.5, inL: ['nitrogen', 3 / 60], lcap: 30, pl: 'e' }),
  shockwave:  B('Lökéshullám-torony', 'effect', 3, 360, { surge: 50, silicon: 150, oxide: 30, tungsten: 100 }, 'shock', { power: 100 / 60, range: 170, reload: 80, bulletDmg: 160, inL: ['cyanogen', 1.5 / 60], lcap: 30, pl: 'e' }),
  lcrusher:   B('Nagy sziklazúzó', 'prod', 3, 360, { silicon: 80, surge: 15, beryllium: 100, tungsten: 50 }, 'wcrafter', { rot: 1, time: 48, power: 1, out: { sand: 1 }, icap: 20, needL: ['hydrogen', 1 / 60], lcap: 20, pl: 'e' }),
  edrill:     B('Kitörésfúró', 'prod', 5, 1000, { silicon: 300, oxide: 20, tungsten: 250, thorium: 150 }, 'drill', { tier: 7, time: 281.25, power: 6, needL: ['hydrogen', 4 / 60], icap: 60, lcap: 60, warm: .01, rotS: 0, burst: 1, pl: 'e' }),
  pyrolysis:  B('Pirolízis-generátor', 'power', 3, 360, { graphite: 100, carbide: 60, oxide: 60, silicon: 100 }, 'generator', { gen: 1400 / 60, mode: 'liq', inL: ['slag', 20 / 60], inL2: ['arkycite', 40 / 60], outL: ['water', 20 / 60], lcap: 150, pl: 'e' }),
  flux:       B('Fluxusreaktor', 'power', 5, 1000, { graphite: 240, carbide: 60, oxide: 80, silicon: 480, surge: 120 }, 'generator', { gen: 18000 / 60, mode: 'flux', heatReq: 150, inL: ['cyanogen', 9 / 60], lcap: 30, pl: 'e' }),
  neoplasia:  B('Neoplázia-reaktor', 'power', 5, 1000, { tungsten: 750, carbide: 300, oxide: 150, silicon: 500, phase: 150, surge: 200 }, 'generator', { gen: 140, mode: 'liq', inL: ['arkycite', 80 / 60], inL2: ['water', 10 / 60], fuel: 'phase', dur: 240, icap: 10, heatOut: 60, rot: 1, lcap: 80, pl: 'e' }),
  blink:      B('Sugárkapcsolat', 'power', 3, 810, { beryllium: 250, silicon: 250, oxide: 150, carbide: 75, surge: 75, phase: 75 }, 'node', { range: 120, links: 1, pl: 'e' }),
  surgecruc:  B('Ötvözettégely', 'craft', 3, 360, { silicon: 100, graphite: 80, tungsten: 80, oxide: 80 }, 'crafter', { inp: { silicon: 3 }, out: { surge: 1 }, time: 45, inL: ['slag', 160 / 60], lcap: 400, power: 1.5, heatReq: 40, icap: 20, pl: 'e' }),
  slagheat:   B('Salakfűtő', 'craft', 3, 360, { tungsten: 50, oxide: 20, beryllium: 20 }, 'heater', { rot: 1, heatOut: 8, inL: ['slag', 40 / 60], lcap: 120, pl: 'e' }),
  atmocon:    B('Légköri koncentrátor', 'craft', 3, 360, { oxide: 60, beryllium: 180, silicon: 150 }, 'crafter', { outL: ['nitrogen', 16 / 60], power: 2, heatReq: 24, lcap: 60, pl: 'e' }),
  cyanosyn:   B('Ciánogén-szintetizáló', 'craft', 3, 360, { carbide: 80, silicon: 120, beryllium: 140, oxide: 40 }, 'crafter', { inp: { graphite: 1 }, time: 20, inL: ['arkycite', 160 / 60], outL: ['cyanogen', 12 / 60], power: 2, heatReq: 20, lcap: 80, pl: 'e' }),
  phasesyn:   B('Fázisszintetizáló', 'craft', 3, 360, { carbide: 90, silicon: 100, thorium: 100, tungsten: 200 }, 'crafter', { inp: { thorium: 2, sand: 6 }, out: { phase: 1 }, time: 30, inL: ['ozone', 8 / 60], power: 8, heatReq: 32, icap: 40, lcap: 40, pl: 'e' }),
  phaseheat:  B('Fázisfűtő', 'craft', 2, 160, { oxide: 30, carbide: 30, beryllium: 30 }, 'heater', { rot: 1, heatOut: 15, fuel: 'phase', dur: 480, icap: 10, pl: 'e' }),
  hrouter:    B('Hőelosztó', 'craft', 3, 360, { tungsten: 15, graphite: 10 }, 'heatcond', { rot: 1, split: 1, pl: 'e' }),
  shredir:    B('Kis hőterelő', 'craft', 2, 160, { surge: 3, graphite: 8 }, 'heatcond', { rot: 1, pl: 'e' }),
  slaginc:    B('Salakégető', 'craft', 1, 90, { tungsten: 15 }, 'incinerator', { free: 1, pl: 'e' }),
  bdoor:      B('Robbanásálló ajtó', 'def', 2, 2800, { tungsten: 24, silicon: 24 }, 'wall', { door: 1, armor: 14, pl: 'e' }),
  rswall:     WALL('Megerősített ötvözetfal', 1, 250, { surge: 6, tungsten: 2 }, { armor: 20, pl: 'e' }),
  rswallL:    WALL('Nagy megerősített ötvözetfal', 2, 250, { surge: 6, tungsten: 2 }, { armor: 20, pl: 'e' }),
  shwall:     B('Pajzsos fal', 'def', 2, 4160, { phase: 20, surge: 12, beryllium: 12 }, 'wall', { armor: 15, power: 3 / 60, pl: 'e' }),
  cwallE:     WALL('Karbidfal', 1, 270, { thorium: 6, carbide: 6 }, { armor: 16, pl: 'e' }),
  cwallEL:    WALL('Nagy karbidfal', 2, 270, { thorium: 6, carbide: 6 }, { armor: 16, pl: 'e' }),
  surgecon:   B('Ötvözetszalag', 'dist', 1, 130, { surge: 1, tungsten: 1 }, 'sconv', { rot: 1, speed: 50, power: 1 / 60, pl: 'e' }),
  surgerouter: B('Ötvözetelosztó', 'dist', 1, 130, { surge: 5, tungsten: 1 }, 'router', { power: 3 / 60, pl: 'e' }),
  urepair:    B('Egységjavító torony', 'units', 2, 160, { graphite: 90, silicon: 90, tungsten: 80 }, 'repair', { power: 1, range: 100, rep: 1.5, pl: 'e' }),
  primerefab: B('Elsődleges átépítő', 'units', 5, 1500, { thorium: 250, oxide: 200, tungsten: 200, silicon: 400 }, 'recon', { rot: 1, power: 4.5, inp: { thorium: 80, silicon: 100 }, inL: ['nitrogen', 10 / 60], lcap: 60, time: 3600, up: { locus: 'precept', cleroi: 'anthicus', avert: 'obviate' }, pl: 'e' }),
  tankasm:    B('Lánctalpas-összeszerelő', 'units', 5, 1500, { thorium: 500, oxide: 150, carbide: 80, silicon: 650 }, 'factory', { rot: 1, power: 2.5, plans: ['vanquish', 'conquer'], pl: 'e' }),
  shipasm:    B('Hajó-összeszerelő', 'units', 5, 1500, { carbide: 100, oxide: 200, tungsten: 550, silicon: 900, thorium: 400 }, 'factory', { rot: 1, power: 2.5, plans: ['quell', 'disrupt'], pl: 'e' }),
  mechasm:    B('Lépegető-összeszerelő', 'units', 5, 1500, { carbide: 200, thorium: 600, oxide: 200, tungsten: 550, silicon: 1000 }, 'factory', { rot: 1, power: 3, plans: ['tecta', 'collaris'], pl: 'e' }),
  disperse:   TU('Szétszóró', 4, 4480, { thorium: 50, oxide: 50, silicon: 200, beryllium: 350 }, { range: 310, reload: 9, ground: 0, alt: 1, cool: .25, coolM: 15, ammo: { tungsten: { d: 65, sp: 8.5, n: 1 }, thorium: { d: 90, sp: 9.5, n: 1, pierce: 2 }, silicon: { d: 37, sp: 9, n: 1, hom: .1 }, surge: { d: 65, sp: 6, n: 1, zap: 3, zapD: 18 } }, ebase: 1, pl: 'e' }),
  titan:      TU('Titán', 4, 4000, { tungsten: 250, silicon: 300, thorium: 400 }, { range: 390, reload: 138, air: 0, cool: .5, coolM: 3.75, ammo: { thorium: art(350, 350, 65, { sp: 2.5 }), carbide: art(700, 750, 36, { sp: 3.25, frag: { n: 6, d: 50, sp: .5, life: 50, spl: 50, splR: 22 } }), oxide: art(300, 180, 110, { sp: 2.5, st: 'burn', stT: 300 }) }, ebase: 1, pl: 'e' }),
  afflict:    TU('Sújtó', 4, 3520, { surge: 100, silicon: 200, graphite: 250, oxide: 40 }, { range: 368, reload: 50, power: 5, pam: 1, ammo: { _p: { d: 180, sp: 5, pierce: 2, frag: { n: 4, d: 35, sp: 3, life: 10 } } }, ebase: 1, pl: 'e' }),
  lustre:     TU('Fénysugár', 4, 3360, { silicon: 250, graphite: 200, oxide: 50, carbide: 90 }, { range: 250, reload: 5, power: 200 / 60, pam: 1, lflame: { _p: { d: 35, len: 250, pierce: 1, c: '#ff9a6a' } }, ebase: 1, pl: 'e' }),
  smite:      TU('Villámcsapás', 5, 8750, { oxide: 200, surge: 400, silicon: 800, carbide: 500, phase: 300 }, { range: 300, reload: 100, shots: 5, sd: 4, cool: .25, coolM: 15, ammo: { surge: { d: 250, sp: 7, n: 1, pierce: 4, pb: 1, zap: 2, zapD: 30 } }, ebase: 1, pl: 'e' }),
  scathe:     TU('Pusztító', 4, 3520, { silicon: 450, graphite: 400, tungsten: 500, oxide: 100, carbide: 200 }, { range: 1350, reload: 600, air: 0, cool: .25, coolM: 15, ammo: { carbide: art(1000, 1000, 65, { sp: 4.6, frag: { n: 8, d: 32, sp: 3.4, life: 23, spl: 100, splR: 40 } }), phase: art(320, 320, 120, { sp: 2.5 }), surge: art(180, 180, 60, { sp: 4.4, zap: 6, zapD: 20 }) }, ebase: 1, pl: 'e' }),
  malign:     TU('Rosszindulat', 5, 9250, { carbide: 200, beryllium: 1000, silicon: 500, graphite: 500, phase: 200 }, { range: 410, reload: 3.5, power: 40, pam: 1, ammo: { _p: { k: 'flak', d: 70, sp: 8, spl: 30, splR: 20, gnd: 1, zap: 1, zapD: 18 } }, ebase: 1, pl: 'e' }),
};
export const BUILD_ORDER = {
  turret: ['breach', 'diffuse', 'sublimate', 'disperse', 'titan', 'afflict', 'lustre', 'smite', 'scathe', 'malign', 'duo', 'scatter', 'scorch', 'hail', 'wave', 'lancet', 'arc', 'parallax', 'swarmer', 'salvo', 'segment', 'tsunami', 'fuse', 'ripple', 'cyclone', 'foreshadow', 'spectre', 'meltdown'],
  prod: ['pbore', 'lpbore', 'idrill', 'edrill', 'crusher', 'lcrusher', 'ventcond', 'mdrill', 'pdrill', 'ldrill', 'bdrill', 'wextract', 'cultivator', 'oilext'],
  dist: ['duct', 'aduct', 'drouter', 'dbridge', 'oduct', 'uduct', 'dunloader', 'surgecon', 'surgerouter', 'conveyor', 'titancon', 'plastcon', 'armorcon', 'junction', 'bridge', 'phasecon', 'sorter', 'invsorter', 'router', 'distributor', 'overflow', 'underflow', 'unloader', 'driver'],
  liquid: ['rpumpE', 'rconduit', 'rljunc', 'rlbridge', 'rlrouter', 'rlcont', 'rltank', 'mpump', 'rpump', 'ipump', 'conduit', 'pconduit', 'plconduit', 'lrouter', 'lcontainer', 'ltank', 'ljunction', 'lbridge', 'phaseconduit'],
  power: ['bnode', 'btower', 'blink', 'turbine', 'chemcomb', 'pyrolysis', 'flux', 'neoplasia', 'node', 'nodeL', 'surgetower', 'diode', 'battery', 'batteryL', 'combust', 'thermal', 'steam', 'diffgen', 'rtg', 'solar', 'lsolar', 'reactor', 'impact'],
  def: ['bwall', 'bwallL', 'wwall', 'wwallL', 'bdoor', 'rswall', 'rswallL', 'shwall', 'cwallE', 'cwallEL', 'cwall', 'cwallL', 'twall', 'twallL', 'plwall', 'plwallL', 'thwall', 'thwallL', 'phwall', 'phwallL', 'swall', 'swallL', 'door', 'doorL', 'scwall', 'scwallL', 'scwallH', 'scwallG'],
  craft: ['arcfurn', 'electro', 'oxid', 'eheater', 'slagheat', 'phaseheat', 'hredir', 'shredir', 'hrouter', 'carbcruc', 'surgecruc', 'atmocon', 'cyanosyn', 'phasesyn', 'slaginc', 'gpress', 'mpress', 'smelter', 'crucible', 'kiln', 'plastcomp', 'weaver', 'surgesm', 'cryomix', 'pyramix', 'blastmix', 'melter', 'separator', 'disass', 'sporepress', 'pulver', 'centrifuge', 'incinerator'],
  units: ['tankfab', 'mechfab', 'shipfab', 'tankrefab', 'mechrefab', 'shiprefab', 'primerefab', 'tankasm', 'mechasm', 'shipasm', 'urepair', 'gfactory', 'afactory', 'navalf', 'additive', 'multi', 'expo', 'tetra', 'repairpt', 'repairtur'],
  effect: ['regen', 'radar', 'btowerB', 'shockwave', 'citadel', 'acropolis', 'bastion', 'rcontainer', 'rvault', 'mender', 'mendproj', 'overdrive', 'dome', 'forceproj', 'mine', 'lamp', 'foundation', 'nucleus', 'container', 'vault', 'launchpad'],
};

/* ---------- egységek ----------
   fam: mech (földi), legs (lábas – átlép a falakon), air; w: fegyverek (k: b, flame, art, laser, arc, missile, bomb, sap, bolt, beam, boom, shrap, flak, acid)
   ab: képességek – regen (pajzsosztás), ff (erőtér), rep (javítómező) */
const U = (n, fam, tier, hp, sp, r, armor, o) => ({ n, fam, tier, hp, sp, r, armor, air: fam === 'air' || fam === 'sup' ? 1 : 0, legs: fam === 'legs' ? 1 : 0, naval: fam === 'naval' ? 1 : 0, w: [], ...o });
const mis = (rl, d, spl, splR, o) => ({ k: 'missile', rl, d, spl, splR, sp: 3, life: 50, ...o });
export const UNITS = {
  alpha:    U('Alfa', 'air', 1, 350, 3, 4, 0, { core: 1, mine: 6.5, mineT: 1, icap: 30, build: .5, w: [{ rl: 17, d: 11, sp: 2.5, life: 60, hom: .02 }] }),
  beta:     U('Béta', 'air', 2, 500, 3.3, 4.5, 0, { core: 1, mine: 7, mineT: 1, icap: 50, build: .75, w: [{ rl: 20, n: 2, d: 11, sp: 3, life: 60, hom: .03 }] }),
  gamma:    U('Gamma', 'air', 3, 700, 3.55, 5.5, 0, { core: 1, mine: 8, mineT: 2, icap: 70, build: 1, w: [{ rl: 15, n: 2, d: 11, sp: 3.5, life: 70, hom: .04 }] }),
  dagger:   U('Tőr', 'mech', 1, 150, .5, 4, 0, { cost: { silicon: 10, lead: 10 }, time: 15, w: [{ rl: 13, d: 9, sp: 2.5, life: 60 }] }),
  mace:     U('Buzogány', 'mech', 2, 550, .5, 5, 4, { w: [{ k: 'flame', rl: 22, d: 74, sp: 4.2, life: 13, st: 'burn', stT: 240, air: 0 }] }),
  fortress: U('Erőd', 'mech', 3, 900, .43, 6.5, 9, { w: [{ k: 'art', rl: 60, d: 20, spl: 80, splR: 35, sp: 2, life: 106, air: 0 }] }),
  scepter:  U('Jogar', 'mech', 4, 9000, .36, 11, 20, { ab: { regen: [25, 250, 60, 60] }, w: [{ rl: 45, n: 3, d: 70, sp: 8, life: 27, zap: 2, zapD: 20 }, { rl: 12, d: 20, sp: 12, life: 17 }, { rl: 15, d: 20, sp: 12, life: 17 }] }),
  reign:    U('Uralom', 'mech', 5, 24000, .4, 15, 30, { w: [{ rl: 9, d: 80, sp: 13, life: 15, pierce: 10, spl: 18, splR: 13, frag: { n: 3, d: 20, sp: 9, life: 20, spl: 15, splR: 10 } }] }),
  nova:     U('Nóva', 'mech', 1, 200, .55, 4, 1, { cost: { silicon: 30, lead: 20, titanium: 20 }, time: 40, build: .3, ab: { rep: [20, 120, 100] }, w: [{ k: 'bolt', rl: 30, d: 13, sp: 5.2, life: 30, heal: 5 }] }),
  pulsar:   U('Pulzár', 'mech', 2, 320, .7, 5.5, 4, { build: .5, ab: { regen: [20, 40, 300, 60] }, w: [{ k: 'arc', rl: 36, n: 3, d: 15, len: 70, heal: 2 }] }),
  quasar:   U('Kvazár', 'mech', 3, 640, .5, 6.5, 9, { build: 1.1, ab: { ff: [60, .4, 500, 360] }, w: [{ k: 'laser', rl: 55, d: 45, len: 150, heal: 10 }] }),
  vela:     U('Vela', 'mech', 4, 8200, .44, 12, 16, { build: 3, w: [{ k: 'beam', rl: 155, d: 35, len: 180, dur: 160, heal: 1 }] }),
  corvus:   U('Corvus', 'legs', 5, 18000, .3, 14.5, 14, { w: [{ k: 'laser', rl: 350, d: 560, len: 460, heal: 25, wide: 1 }] }),
  crawler:  U('Mászó', 'mech', 1, 150, 1, 4, 0, { cost: { silicon: 8, coal: 10 }, time: 10, w: [{ k: 'boom', rl: 24, spl: 80, splR: 44, len: 10 }] }),
  atrax:    U('Atrax', 'legs', 2, 600, .6, 6.5, 3, { w: [{ k: 'acid', rl: 9, d: 13, sp: 2.5, life: 44, st: 'melt', stT: 120, air: 0 }] }),
  spiroct:  U('Spiroct', 'legs', 3, 1000, .54, 7.5, 9, { w: [{ k: 'sap', rl: 14, d: 23, len: 75, sap: .4 }, { k: 'sap', rl: 18, d: 18, len: 40, sap: .7 }] }),
  arkyid:   U('Arkyid', 'legs', 4, 8000, .62, 11.5, 14, { w: [{ k: 'sap', rl: 9, d: 40, len: 55, sap: .85 }, { k: 'sap', rl: 14, d: 40, len: 55, sap: .85 }, { k: 'sap', rl: 22, d: 40, len: 55, sap: .85 }, { k: 'art', rl: 45, d: 12, spl: 65, splR: 70, sp: 2, life: 70, air: 0, zap: 3, zapD: 12 }] }),
  toxopid:  U('Toxopid', 'legs', 5, 22000, .5, 13, 22, { w: [{ k: 'shrap', rl: 30, d: 110, len: 90 }, { k: 'art', rl: 210, d: 50, spl: 75, splR: 80, sp: 3, life: 80, air: 0, frag: { n: 9, k: 'art', d: 30, spl: 40, splR: 70, sp: 2.3, life: 30 } }] }),
  flare:    U('Fáklya', 'air', 1, 70, 2.7, 4.5, 0, { cost: { silicon: 15 }, time: 15, circle: 60, w: [{ rl: 80, n: 3, d: 9, sp: 2.5, life: 32 }] }),
  horizon:  U('Horizont', 'air', 2, 340, 1.65, 5.5, 3, { circle: 40, bomber: 1, w: [{ k: 'bomb', rl: 12, spl: 25, splR: 27, air: 0 }] }),
  zenith:   U('Zenit', 'air', 3, 700, 1.7, 10, 5, { w: [mis(40, 14, 15, 25, { n: 2 })] }),
  antumbra: U('Antumbra', 'air', 4, 7200, .8, 23, 17, { w: [mis(20, 18, 37, 20, { sp: 2.7 }), mis(35, 18, 37, 20, { sp: 2.7 }), { rl: 12, d: 55, sp: 7, life: 25 }] }),
  eclipse:  U('Napfogyatkozás', 'air', 5, 22000, .54, 29, 22, { w: [{ k: 'laser', rl: 45, d: 115, len: 230 }, { k: 'flak', rl: 9, d: 15, spl: 65, splR: 25, sp: 4, life: 47, gnd: 1 }, { k: 'flak', rl: 12, d: 15, spl: 65, splR: 25, sp: 4, life: 47, gnd: 1 }] }),
  mono:     U('Mono', 'sup', 1, 100, 1.5, 4, 0, { cost: { silicon: 30, lead: 15 }, time: 35, miner: 1, mine: 2.5, mineT: 1, icap: 20, range: 50 }),
  poly:     U('Poly', 'sup', 2, 400, 2.6, 4.5, 0, { build: .4, rebuild: 1, ab: { rep: [10, 480, 50] }, w: [mis(30, 12, 0, 0, { sp: 4, heal: 5.5 })] }),
  mega:     U('Mega', 'sup', 3, 460, 2.5, 8, 3, { build: 2.6, rebuild: 1, w: [{ k: 'bolt', rl: 24, d: 10, sp: 5.2, life: 35, heal: 5.5 }, { k: 'bolt', rl: 15, d: 8, sp: 5.2, life: 35, heal: 3 }] }),
  quad:     U('Quad', 'sup', 4, 6000, 1.2, 18, 10, { build: 2.5, rebuild: 1, bomber: 1, w: [{ k: 'bomb', rl: 55, spl: 220, splR: 80, heal: 15, air: 0 }] }),
  oct:      U('Oct', 'sup', 5, 24000, .8, 33, 20, { build: 4, rebuild: 1, ab: { ff: [140, 4, 7000, 480], rep: [130, 120, 140] } }),
  // vízi egységek: csak vízen mozognak
  risso:    U('Risso', 'naval', 1, 280, 1.1, 5, 2, { cost: { silicon: 20, metaglass: 35 }, time: 45, w: [{ rl: 13, d: 9, sp: 2.5, life: 60 }, mis(25, 12, 10, 25, { sp: 2.7, life: 65 })] }),
  minke:    U('Minke', 'naval', 2, 600, .9, 6.5, 4, { w: [{ k: 'flak', rl: 10, d: 3, spl: 27, splR: 15, sp: 4.2, life: 52, gnd: 1 }, { k: 'art', rl: 30, d: 20, spl: 40, splR: 30, sp: 3, life: 73, air: 0 }] }),
  bryde:    U('Bryde', 'naval', 3, 910, .85, 10, 7, { w: [{ k: 'art', rl: 65, d: 15, spl: 70, splR: 40, sp: 3.2, life: 84, air: 0 }, mis(20, 12, 10, 25, { n: 2, sp: 2.7, life: 70 })] }),
  sei:      U('Sei', 'naval', 4, 11000, .73, 19.5, 12, { w: [mis(45, 42, 45, 35, { n: 6, sp: 4.2, life: 62 }), { rl: 60, n: 3, d: 57, sp: 7, life: 35 }] }),
  omura:    U('Omura', 'naval', 5, 22000, .62, 29, 16, { w: [{ k: 'laser', rl: 110, d: 1250, len: 500, wide: 1 }] }),
  retusa:   U('Retusa', 'naval', 1, 270, .9, 5.5, 3, { cost: { silicon: 15, titanium: 20 }, time: 35, build: .5, ab: { rep: [20, 120, 60] }, w: [{ k: 'bolt', rl: 22, d: 12, sp: 5.2, life: 30, heal: 5.5 }] }),
  oxynoe:   U('Oxynoe', 'naval', 2, 560, .83, 7, 4, { ab: { rep: [30, 120, 70] }, w: [{ k: 'flame', rl: 5, d: 20, sp: 3.3, life: 18, heal: 1.5 }] }),
  cyerce:   U('Cyerce', 'naval', 3, 870, .86, 10, 6, { ab: { rep: [50, 120, 90] }, w: [{ k: 'flak', rl: 60, d: 25, spl: 25, splR: 30, sp: 2.5, life: 80, gnd: 1, heal: 2.8 }] }),
  aegires:  U('Aegires', 'naval', 4, 12000, .7, 22, 12, { ab: { rep: [100, 120, 180] }, w: [{ k: 'field', rl: 65, n: 25, d: 40, len: 180, heal: 6 }] }),
  navanax:  U('Navanax', 'naval', 5, 20000, .65, 29, 20, { w: [mis(65, 110, 110, 60, { sp: 5, life: 60, heal: 20 }), { k: 'beam', rl: 170, d: 27, len: 95, dur: 155, heal: .4 }] }),
  // Erekir: a magegység falból bányászik (mineW), nem lő, hanem javító sugara van
  evoke:    U('Evoke', 'air', 1, 300, 3.4, 4.5, 1, { core: 1, mine: 6, mineT: 3, mineW: 1, icap: 60, build: 1.2, pl: 'e', w: [{ k: 'laser', rl: 20, d: 0, len: 60, heal: 3, air: 0 }] }),
  stell:    U('Stell', 'mech', 1, 850, .75, 6, 6, { tank: 1, cost: { beryllium: 40, silicon: 50 }, time: 35, pl: 'e', w: [{ rl: 50, d: 40, sp: 4, life: 40 }] }),
  locus:    U('Locus', 'mech', 2, 2100, .7, 9, 8, { tank: 1, pl: 'e', w: [{ k: 'laser', rl: 18, d: 48, len: 160, wide: 0 }] }),
  merui:    U('Merui', 'legs', 1, 680, .72, 4.5, 4, { cost: { beryllium: 50, silicon: 70 }, time: 40, pl: 'e', w: [{ k: 'art', rl: 63, d: 0, spl: 30, splR: 19, sp: 3, life: 46, air: 0 }] }),
  cleroi:   U('Cleroi', 'legs', 2, 1100, .6, 7, 5, { pl: 'e', w: [{ rl: 33, d: 30, spl: 43, splR: 30, sp: 3.5, life: 40 }] }),
  elude:    U('Elude', 'mech', 1, 600, 1.8, 5.5, 1, { hov: 1, cost: { graphite: 50, silicon: 70 }, time: 40, pl: 'e', w: [{ rl: 40, n: 2, d: 16, sp: 5, life: 30 }] }),
  avert:    U('Avert', 'air', 2, 1100, 2, 6, 3, { pl: 'e', w: [{ rl: 35, d: 29, sp: 5, life: 18, frag: { n: 3, d: 10, sp: 3, life: 14 } }] }),
  incite:   U('Incite', 'air', 2, 500, 4, 5.5, 2, { core: 1, mine: 7, mineT: 3, mineW: 1, icap: 90, build: 1.4, pl: 'e', w: [{ k: 'laser', rl: 15, d: 0, len: 80, heal: 4, air: 0 }] }),
  emanate:  U('Emanate', 'air', 3, 700, 4.4, 6, 3, { core: 1, mine: 8, mineT: 3, mineW: 1, icap: 110, build: 1.5, pl: 'e', w: [{ k: 'laser', rl: 12, d: 0, len: 90, heal: 5, air: 0 }] }),
  precept:  U('Precept', 'mech', 3, 5000, .64, 12, 11, { tank: 1, pl: 'e', w: [{ rl: 80, d: 100, sp: 7, life: 30, pierce: 2, spl: 40, splR: 20 }] }),
  anthicus: U('Anthicus', 'legs', 3, 2700, .65, 10.5, 7, { pl: 'e', w: [mis(90, 60, 80, 30, { sp: 3.5, life: 60 })] }),
  obviate:  U('Obviate', 'air', 3, 2300, 1.8, 12.5, 6, { pl: 'e', w: [{ k: 'arc', rl: 40, d: 30, n: 3, len: 120 }] }),
  tecta:    U('Tecta', 'legs', 4, 6500, .6, 15, 5, { cost: { beryllium: 250, silicon: 350, tungsten: 288 }, time: 70, pl: 'e', ab: { ff: [60, .4, 2000, 300] }, w: [mis(60, 40, 60, 28, { sp: 4, life: 50, n: 2 })] }),
  collaris: U('Collaris', 'legs', 5, 18000, 1.1, 22, 9, { cost: { beryllium: 300, silicon: 720, tungsten: 240, thorium: 480, carbide: 480 }, time: 180, pl: 'e', w: [{ k: 'art', rl: 70, d: 80, spl: 120, splR: 40, sp: 4, life: 80, air: 0, n: 3 }] }),
  vanquish: U('Vanquish', 'mech', 4, 11000, .63, 14, 20, { tank: 1, cost: { beryllium: 160, silicon: 200, tungsten: 240 }, time: 50, pl: 'e', w: [{ rl: 60, d: 180, sp: 8, life: 30, pierce: 3, spl: 60, splR: 30 }] }),
  conquer:  U('Conquer', 'mech', 5, 22000, .48, 23, 26, { tank: 1, cost: { beryllium: 240, silicon: 540, tungsten: 180, thorium: 480, carbide: 480 }, time: 180, pl: 'e', w: [{ k: 'shrap', rl: 90, d: 400, len: 220 }] }),
  quell:    U('Quell', 'air', 4, 6000, 1.1, 18, 4, { cost: { graphite: 200, silicon: 280, beryllium: 288 }, time: 60, pl: 'e', w: [mis(70, 80, 100, 40, { sp: 4, life: 70, n: 2 })] }),
  disrupt:  U('Disrupt', 'air', 5, 12000, 1, 23, 9, { cost: { graphite: 300, silicon: 780, tungsten: 240, thorium: 480, carbide: 480 }, time: 180, pl: 'e', w: [mis(90, 140, 180, 50, { sp: 4, life: 80, n: 3 })] }),
};

/* ---------- kutatási fa (a Mindustry Serpulo-fája szerint) ---------- */
const TT = 'conveyor<core junction<conveyor router<junction launchpad<router distributor<router sorter<router invsorter<sorter overflow<sorter underflow<overflow container<router unloader<container vault<container bridge<router titancon<bridge driver<titancon phasecon<driver plastcon<titancon armorcon<plastcon foundation<core nucleus<foundation mdrill<core mpump<mdrill conduit<mpump ljunction<conduit lrouter<ljunction lcontainer<lrouter ltank<lcontainer lbridge<lrouter pconduit<lrouter phaseconduit<pconduit plconduit<pconduit rpump<pconduit ipump<rpump gpress<mdrill pdrill<gpress cultivator<pdrill ldrill<pdrill bdrill<ldrill wextract<ldrill oilext<wextract pyramix<gpress blastmix<pyramix smelter<gpress sporepress<smelter centrifuge<sporepress mpress<centrifuge crucible<mpress plastcomp<sporepress weaver<plastcomp kiln<smelter pulver<kiln incinerator<pulver melter<incinerator surgesm<melter separator<melter disass<separator cryomix<melter combust<mdrill node<combust nodeL<node diode<nodeL surgetower<diode battery<node batteryL<battery mender<node mendproj<mender forceproj<mendproj overdrive<forceproj dome<overdrive repairpt<mendproj repairtur<repairpt steam<node thermal<steam diffgen<thermal reactor<diffgen impact<reactor rtg<reactor solar<node lsolar<solar duo<core cwall<duo cwallL<cwall scwall<cwallL scwallL<scwall scwallH<scwallL scwallG<scwallH twall<cwallL twallL<twall door<twall doorL<door plwall<twall plwallL<plwall thwall<twall thwallL<thwall swall<thwall swallL<swall phwall<swall phwallL<phwall scatter<duo hail<scatter salvo<hail swarmer<salvo cyclone<swarmer spectre<cyclone ripple<salvo fuse<ripple arc<duo scorch<arc wave<scorch parallax<wave segment<parallax tsunami<wave lancet<scorch meltdown<lancet foreshadow<meltdown mine<lancet gfactory<core afactory<gfactory additive<gfactory multi<additive expo<multi tetra<expo lamp<battery'
  + ' u:dagger<gfactory u:mace<u:dagger u:fortress<u:mace u:scepter<u:fortress u:reign<u:scepter u:nova<u:dagger u:pulsar<u:nova u:quasar<u:pulsar u:vela<u:quasar u:corvus<u:vela u:crawler<u:dagger u:atrax<u:crawler u:spiroct<u:atrax u:arkyid<u:spiroct u:toxopid<u:arkyid'
  + ' u:flare<afactory u:horizon<u:flare u:zenith<u:horizon u:antumbra<u:zenith u:eclipse<u:antumbra u:mono<u:flare u:poly<u:mono u:mega<u:poly u:quad<u:mega u:oct<u:quad'
  + ' navalf<afactory u:risso<navalf u:minke<u:risso u:bryde<u:minke u:sei<u:bryde u:omura<u:sei u:retusa<u:risso u:oxynoe<u:retusa u:cyerce<u:oxynoe u:aegires<u:cyerce u:navanax<u:aegires'
  + ' s:zero<core s:erdo<s:zero s:krater<s:erdo s:titan<s:krater s:hasadek<s:titan s:roncs<s:krater s:dunek<s:roncs s:olvasztar<s:dunek s:vassziv<s:olvasztar s:fagyhid<s:erdo s:jegmezo<s:fagyhid s:sarkikoho<s:jegmezo s:feher<s:sarkikoho'
  + ' i:copper<core l:water<i:copper i:lead<i:copper i:titanium<i:lead l:cryo<i:titanium i:thorium<i:titanium i:surge<i:thorium i:phase<i:thorium i:metaglass<i:lead i:sand<i:copper i:scrap<i:sand l:slag<i:scrap i:coal<i:sand i:graphite<i:coal i:silicon<i:graphite i:pyratite<i:coal i:blast<i:pyratite i:spore<i:coal l:oil<i:spore i:plastanium<l:oil';
const FREE = ['core', 'conveyor', 'mdrill', 'duo'];
// kutatási ár: a Mindustry képlete (60 + mennyiség^1,11 · 20) negyedelve és anyagonként 10 000-nél levágva, mert itt nincs háttérben termelő szektor
export const rcost = c => Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.min(10000, Math.max(10, Math.round((15 + Math.pow(v, 1.11) * 5) / 10) * 10))]));
// csomópontfajták: b blokk, u egység (kutatni kell), i/l anyag és folyadék (magától nyílik, ha megtermelted), s szektor (elfoglalással)
// egység ára: a Mindustry képlete (mennyiség^1,1 · 50) negyedelve; need: az építő blokk, amelyet előbb ki kell kutatni
export const ucost = c => Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.min(10000, Math.max(10, Math.round(Math.pow(v, 1.1) * 12.5 / 10) * 10))]));
const maker = u => Object.keys(BLOCKS).find(b => (BLOCKS[b].plans || []).includes(u) || Object.values(BLOCKS[b].up || {}).includes(u));
export const TECH = [{ id: 'core', k: 'b', key: 'core', req: null, cost: {} }, ...TT.split(' ').map(s => {
  const [id, req] = s.split('<'), k = id[1] === ':' ? id[0] : 'b', key = k === 'b' ? id : id.slice(2);
  if (k === 'b') return { id, k, key, req, cost: FREE.includes(id) ? {} : rcost(BLOCKS[id].cost) };
  if (k === 'u') { const m = maker(key); return { id, k, key, req, need: m, cost: ucost(UNITS[key].cost || BLOCKS[m].inp) }; }
  return { id, k, key, req, cost: {} };
})];

/* ---------- hullámok: a Mindustry alap hullámtáblája ----------
   [egység, kezdet, vég, darab, skála, köz, max, pajzs, pajzsnövekmény, hatás] */
const INF = 1e9;
export const WAVES = [
  ['dagger', 0, 10, 1, 2, 1, 30, 0, 0], ['crawler', 4, 13, 2, 1.5, 1, INF, 0, 0], ['flare', 12, 16, 1, 1, 1, INF, 0, 0], ['dagger', 11, INF, 1, 1.7, 2, 4, 0, 25],
  ['pulsar', 13, INF, 1, .5, 3, 25, 0, 0], ['mace', 7, 30, 1, 2, 3, INF, 0, 0], ['dagger', 12, INF, 4, 1, 2, 14, 0, 20], ['mace', 28, 40, 1, 1, 3, INF, 0, 20],
  ['spiroct', 45, INF, 1, 1, 3, 10, 100, 30, 'od'], ['pulsar', 120, INF, 5, 3, 2, INF, 0, 0, 'od'], ['flare', 16, INF, 1, 1, 2, 20, 0, 20], ['quasar', 82, INF, 4, 3, 3, INF, 0, 30, 'od'],
  ['pulsar', 41, INF, 1, 3, 5, 25, 640, 0], ['fortress', 40, INF, 2, 2, 5, 20, 0, 30], ['nova', 35, 60, 4, 1, 3, INF, 0, 0, 'od'], ['dagger', 42, 130, 4, 1, 3, 30, 0, 0, 'od'],
  ['horizon', 40, INF, 2, 2, 2, INF, 0, 20], ['flare', 50, INF, 4, 3, 5, 20, 100, 10, 'od'], ['zenith', 50, INF, 2, 3, 5, 16, 0, 30], ['nova', 53, INF, 2, 3, 4, INF, 0, 30],
  ['atrax', 31, INF, 4, 1, 3, INF, 0, 10], ['scepter', 41, INF, 1, 1, 30, INF, 0, 30], ['reign', 81, INF, 1, 1, 40, INF, 0, 30], ['antumbra', 120, INF, 1, 1, 40, INF, 0, 30],
  ['vela', 100, INF, 1, 1, 30, INF, 0, 30], ['corvus', 145, INF, 1, 1, 35, INF, 100, 30], ['horizon', 90, INF, 2, 3, 4, INF, 40, 30], ['toxopid', 210, INF, 1, 1, 35, INF, 1000, 35],
];
// a w. hullám egységei: [típus, pajzs, hatás]; sec.wo: ennyivel előrébb jár a táblában, sec.threat: darabszorzó, air/gnd: légi/földi szorzó
export function waveUnits(w, sec) {
  const out = [], wi = w - 1 + (sec.wo || 0), mul = sec.threat * (sec.endless ? 1 + w / 80 : 1);
  for (const [t, begin, end, amt, scale, spacing, max, sh, shs, eff] of WAVES) {
    if (wi < begin || wi > end || (wi - begin) % spacing) continue;
    const base = Math.min(amt + Math.floor(((wi - begin) / spacing) / scale), max), U_ = UNITS[t];
    const n = Math.max(1, Math.min(60, Math.round(base * mul * (U_.air ? sec.air || 1 : sec.gnd || 1) * (U_.tier >= 4 ? Math.min(1, 1 / sec.threat + .5) : 1))));
    for (let i = 0; i < n; i++) out.push([t, Math.max(sh + shs * (wi - begin), 0), eff || null]);
  }
  return out;
}

/* ---------- kampányok és szektorok ---------- */
// biome: a régi mentések generátorának alapbiomja; biomes: az új, barlangos generátor biomjai
export const CAMPAIGNS = [
  { id: 'a', n: 'Első partraszállás', d: 'A kezdetek: réztől a tóriumig, öt szektoron át.', req: null },
  { id: 'b', n: 'Jeges perem', d: 'Fagyott síkságok, sok légi támadó.', req: 'erdo' },
  { id: 'c', n: 'Rozsdasivatag', d: 'Roncsmezők és dűnék, nehéz földi hadoszlopok.', req: 'krater' },
];
export const SECTORS = [
  { id: 'zero', camp: 'a', n: 'Nullpont', d: 'Az első partraszállás. Réz, ólom, homok és hulladék.', w: 170, h: 150, ores: { copper: 1, lead: .8, scrap: .5 }, sand: .25, biome: 'stone', biomes: ['stone', 'grass'], win: 15, wt: 120, threat: 1, wo: 0, req: null, start: { copper: 300 } },
  { id: 'erdo', camp: 'a', n: 'Fagyott erdő', d: 'Szén a hó alatt – itt kezdődik a grafit és az áram.', w: 210, h: 180, ores: { copper: 1, lead: .8, coal: .9 }, sand: .2, biome: 'snow', biomes: ['snow', 'moss'], win: 15, wt: 120, threat: 1.1, wo: 3, req: 'zero', start: { copper: 500, lead: 200 } },
  { id: 'krater', camp: 'a', n: 'A kráterek', d: 'Homokos mélyedések, légi támadók. Szilícium kell.', w: 240, h: 200, ores: { copper: 1, lead: .9, coal: .8, scrap: .6 }, sand: .55, biome: 'sand', biomes: ['sand', 'stone'], win: 20, wt: 115, threat: 1.2, wo: 8, air: 1.5, req: 'erdo', start: { copper: 700, lead: 400, graphite: 100 } },
  { id: 'titan', camp: 'a', n: 'Titánszirtek', d: 'Kemény kőzet titánnal. Erősebb hullámok, Buzogányok.', w: 280, h: 240, ores: { copper: 1, lead: .9, coal: .7, titanium: .8, scrap: .3 }, sand: .3, biome: 'dark', biomes: ['dark', 'basalt', 'spore'], win: 25, wt: 110, threat: 1.3, wo: 16, req: 'krater', start: { copper: 1000, lead: 700, graphite: 300, silicon: 200 } },
  { id: 'hasadek', camp: 'a', n: 'Tórium-hasadék', d: 'A legmélyebb lelőhely. Erődök és bombázók.', w: 340, h: 300, ores: { copper: 1, lead: .9, coal: .8, titanium: .9, thorium: .6, scrap: .4 }, sand: .35, biome: 'dark', biomes: ['dark', 'magma', 'basalt', 'spore'], win: 35, wt: 105, threat: 1.4, wo: 28, sp: 2, req: 'titan', start: { copper: 1500, lead: 1200, graphite: 500, silicon: 500, titanium: 300 } },

  { id: 'fagyhid', camp: 'b', n: 'Fagyhíd', d: 'Befagyott tavak között keskeny átjárók.', w: 210, h: 180, ores: { copper: 1, lead: .9, coal: .8 }, sand: .2, biome: 'snow', biomes: ['snow', 'ice'], water: 1.4, win: 15, wt: 115, threat: 1.1, wo: 9, air: 2, req: null, start: { copper: 600, lead: 300, graphite: 100 } },
  { id: 'jegmezo', camp: 'b', n: 'Jégmező', d: 'Nyílt jégsíkság, a fáklyák rajokban jönnek.', w: 250, h: 220, ores: { copper: 1, lead: .9, coal: .7, titanium: .7 }, sand: .25, biome: 'ice', biomes: ['ice', 'snow'], water: 1.2, win: 20, wt: 110, threat: 1.2, wo: 14, air: 2.4, req: 'fagyhid', start: { copper: 900, lead: 600, graphite: 200, silicon: 150 } },
  { id: 'sarkikoho', camp: 'b', n: 'Sarki kohó', d: 'Elhagyott olvasztó a gleccser szélén. Két irányból támadnak.', w: 290, h: 250, ores: { copper: 1, lead: .9, coal: .8, titanium: .8, scrap: .5 }, sand: .3, biome: 'snow', biomes: ['snow', 'basalt', 'magma'], win: 25, wt: 105, threat: 1.3, wo: 24, air: 1.8, sp: 2, req: 'jegmezo', start: { copper: 1300, lead: 900, graphite: 400, silicon: 350, titanium: 200 } },
  { id: 'feher', camp: 'b', n: 'Fehér csend', d: 'A perem vége. Bombázók és erődök hóviharban.', w: 360, h: 310, ores: { copper: 1, lead: .9, coal: .8, titanium: .9, thorium: .6 }, sand: .3, biome: 'ice', biomes: ['ice', 'snow', 'basalt', 'spore'], water: 1.3, win: 30, wt: 100, threat: 1.5, wo: 36, air: 2, sp: 3, req: 'sarkikoho', start: { copper: 2000, lead: 1500, graphite: 600, silicon: 600, titanium: 500 } },

  { id: 'roncs', camp: 'c', n: 'Roncstelep', d: 'Régi csatatér, tele fémhulladékkal.', w: 210, h: 180, ores: { copper: .8, lead: .8, scrap: 1.3, coal: .5 }, sand: .5, biome: 'sand', biomes: ['sand', 'dark'], win: 15, wt: 110, threat: 1.2, wo: 10, gnd: 1.3, req: null, start: { copper: 700, lead: 400, graphite: 150 } },
  { id: 'dunek', camp: 'c', n: 'Vándordűnék', d: 'Homoktenger, a Mászók falkákban rohannak.', w: 260, h: 220, ores: { copper: 1, lead: .9, coal: .8, titanium: .6, scrap: .8 }, sand: .7, biome: 'sand', biomes: ['sand', 'basalt'], win: 20, wt: 105, threat: 1.3, wo: 18, gnd: 1.5, req: 'roncs', start: { copper: 1000, lead: 700, graphite: 250, silicon: 200 } },
  { id: 'olvasztar', camp: 'c', n: 'Olvasztár', d: 'Sötét salakmező, minden érc megvan – az ellenség is tudja.', w: 310, h: 270, ores: { copper: 1, lead: .9, coal: .9, titanium: .9, thorium: .5, scrap: .6 }, sand: .4, biome: 'dark', biomes: ['magma', 'dark', 'basalt'], win: 25, wt: 100, threat: 1.4, wo: 30, gnd: 1.4, sp: 2, req: 'dunek', start: { copper: 1500, lead: 1200, graphite: 500, silicon: 500, titanium: 400 } },
  { id: 'vassziv', camp: 'c', n: 'Vasszív', d: 'A sivatag közepe. Negyven hullám, három irányból.', w: 400, h: 340, ores: { copper: 1, lead: 1, coal: .9, titanium: 1, thorium: .8, scrap: .6 }, sand: .4, biome: 'dark', biomes: ['magma', 'dark', 'sand', 'basalt', 'spore'], win: 40, wt: 95, threat: 1.6, wo: 42, gnd: 1.3, air: 1.2, sp: 3, req: 'olvasztar', start: { copper: 2500, lead: 2000, graphite: 800, silicon: 800, titanium: 700, thorium: 200 } },
];
// a korábbi verzió szektorméretei – csak a régi mentések visszatöltéséhez
export const LEGACY_SIZE = { zero: [110, 90], erdo: [130, 110], krater: [130, 120], titan: [150, 130], hasadek: [160, 140], fagyhid: [120, 100], jegmezo: [140, 115], sarkikoho: [150, 130], feher: [165, 145], roncs: [120, 100], dunek: [145, 115], olvasztar: [155, 130], vassziv: [170, 150] };

/* ---------- szabad játék ---------- */
const ALLORE = { copper: 1, lead: .9, coal: .8, titanium: .75, thorium: .5, scrap: .5 };
export const MAPS = [
  { id: 'vadon', n: 'Vegyes vadon', biome: 'stone', biomes: ['moss', 'spore', 'magma', 'basalt', 'grass', 'stone'], ores: ALLORE, sand: .3 },
  { id: 'komezo', n: 'Kőmező', biome: 'stone', biomes: ['stone', 'dark'], ores: ALLORE, sand: .3 },
  { id: 'homezo', n: 'Hómező', biome: 'snow', biomes: ['snow', 'ice'], ores: ALLORE, sand: .2, water: 1.2 },
  { id: 'jegtukor', n: 'Jégtükör', biome: 'ice', biomes: ['ice', 'snow'], ores: ALLORE, sand: .2, water: 1.6 },
  { id: 'dunek', n: 'Homokdűnék', biome: 'sand', biomes: ['sand'], ores: { ...ALLORE, scrap: 1 }, sand: .6 },
  { id: 'hasadek', n: 'Sötét hasadék', biome: 'dark', biomes: ['dark', 'basalt'], ores: { ...ALLORE, thorium: .8 }, sand: .3 },
  { id: 'volgy', n: 'Zöld völgy', biome: 'grass', biomes: ['grass', 'moss'], ores: ALLORE, sand: .3, water: 1.1 },
  { id: 'szigetek', n: 'Szigetvilág', biome: 'stone', biomes: ['stone', 'grass'], ores: ALLORE, sand: .4, water: 2.2 },
  { id: 'spora', n: 'Spóravadon', biome: 'dark', biomes: ['spore', 'moss', 'basalt'], ores: ALLORE, sand: .3 },
  { id: 'lava', n: 'Lávaföld', biome: 'dark', biomes: ['magma', 'basalt', 'dark'], ores: { ...ALLORE, thorium: .7 }, sand: .3 },
];
export const FREE_OPTS = {
  map: MAPS.map(m => [m.id, m.n]),
  size: [['s', 'Kicsi', [150, 130]], ['m', 'Közepes', [230, 200]], ['l', 'Nagy', [330, 290]], ['xl', 'Óriás', [460, 400]], ['xxl', 'Gigászi', [620, 540]], ['max', 'Kolosszális', [800, 700]]],
  diff: [['easy', 'Könnyű', .7, 0], ['norm', 'Normál', 1, 0], ['hard', 'Nehéz', 1.4, 12], ['brut', 'Brutális', 2, 30]],
  wt: [[60, '60 mp'], [90, '90 mp'], [120, '120 mp'], [180, '180 mp']],
  win: [[0, 'Végtelen'], [20, '20'], [40, '40'], [60, '60']],
  sp: [[1, '1'], [2, '2'], [3, '3']],
  ore: [[.6, 'Kevés'], [1, 'Normál'], [1.5, 'Sok']],
  start: [['base', 'Alap', { copper: 300, lead: 100 }], ['rich', 'Bőséges', { copper: 3000, lead: 2000, graphite: 800, silicon: 800, titanium: 500, metaglass: 200 }], ['max', 'Korlátlan', Object.fromEntries(ITEM_IDS.map(k => [k, 4000]))]],
  res: [['own', 'Saját kutatás'], ['all', 'Minden feloldva']],
  fog: [[1, 'Be'], [0, 'Ki']],
};
export const FREE_DEF = { map: 'vadon', size: 'l', diff: 'norm', wt: 120, win: 0, sp: 1, ore: 1, start: 'base', res: 'own', fog: 1 };
export const freeRanked = o => o.win === 0 && o.diff !== 'easy' && o.start === 'base' && o.res === 'own' && o.wt <= 120;
export const EXTRA_ORES = [];
export const MOD_ORE = {}, MOD_DECO = {};
export const ORE_P = {};   // a modok alapércei: OreFilter-paraméterek (oreThreshold, oreScale)   // a modok érc- és díszítő-overlayei a pályákhoz (név → anyag)
export function freeSector(o, seed) {
  const F = k => FREE_OPTS[k].find(x => x[0] === o[k]) || FREE_OPTS[k][0], M = MAPS.find(m => m.id === o.map) || MAPS[0], [w, h] = F('size')[2];
  const ores = {}; for (const k in M.ores) ores[k] = M.ores[k] * o.ore; for (const k of EXTRA_ORES) ores[k] = .7 * o.ore;   // a modok ércei a szabad játék térképein
  return { id: 'free_' + seed, free: 1, n: 'Szabad játék – ' + M.n, d: '', w, h, ores, sand: M.sand, biome: M.biome, biomes: M.biomes, water: M.water, win: o.win, wt: o.wt, threat: F('diff')[2], wo: F('diff')[3], sp: o.sp, start: F('start')[2], endless: o.win === 0, unlockAll: o.res === 'all', fog: o.fog, ranked: freeRanked(o) };
}

// a tartalom nevei angolul (eredeti Mindustry); a menük és a küldetésszövegek magyarok
for (const [T, o] of [[BLOCKS, EN.b], [ITEMS, EN.i], [LIQUIDS, EN.l], [UNITS, EN.u]]) for (const k in o) if (T[k]) T[k].n = o[k];
