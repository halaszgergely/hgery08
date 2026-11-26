// Kohóvár – a játék adatai: anyagok, folyadékok, blokkok, egységek, kutatási fa, hullámok, szektorok.
// A játékmenet és a számértékek a Mindustry (Anuke) Serpulo-tartalmát követik: https://store.steampowered.com/app/1127400/Mindustry/
// Saját kód és saját rajzolt grafika.

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
};
export const ITEM_IDS = Object.keys(ITEMS);
export const LIQUIDS = {
  water: { n: 'Víz',          c: '#596ab8', hc: .4, st: 'wet' },
  slag:  { n: 'Salak',        c: '#ffa166', hc: 0,  st: 'melt', d: 1 },
  oil:   { n: 'Olaj',         c: '#313131', hc: .7, st: 'tar' },
  cryo:  { n: 'Kriofolyadék', c: '#6ecdec', hc: .9, st: 'freeze' },
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
};
export const WALLS = { rock: '#2e2f34', snowrock: '#7a8794', sandrock: '#7c6a4e', darkrock: '#25262b', mossrock: '#2a3a2c', sporerock: '#382b47', basaltrock: '#20222a', hotwall: '#4c2f22' };
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
  bdrill:     B('Légsűrítéses fúró', 'prod', 4, 640, { copper: 65, silicon: 60, titanium: 50, thorium: 75 }, 'drill', { tier: 5, time: 280, power: 3, boostL: .1, boost: 1.8, icap: 20 }),
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
  additive:   B('Additív átépítő', 'units', 3, 540, { copper: 200, lead: 120, silicon: 90 }, 'recon', { rot: 1, power: 3, inp: { silicon: 40, graphite: 40 }, time: 600, up: { nova: 'pulsar', dagger: 'mace', crawler: 'atrax', flare: 'horizon', mono: 'poly' } }),
  multi:      B('Multiplikatív átépítő', 'units', 5, 1500, { lead: 650, silicon: 450, titanium: 350, thorium: 650 }, 'recon', { rot: 1, power: 6, inp: { silicon: 130, titanium: 80, metaglass: 40 }, time: 1800, up: { horizon: 'zenith', mace: 'fortress', poly: 'mega', pulsar: 'quasar', atrax: 'spiroct' } }),
  expo:       B('Exponenciális átépítő', 'units', 7, 2940, { lead: 2000, silicon: 1000, titanium: 2000, thorium: 750, plastanium: 450, phase: 600 }, 'recon', { rot: 1, power: 13, inp: { silicon: 850, titanium: 750, plastanium: 650 }, inL: ['cryo', 1], lcap: 120, time: 5400, up: { zenith: 'antumbra', spiroct: 'arkyid', fortress: 'scepter', mega: 'quad', quasar: 'vela' } }),
  tetra:      B('Tetratív átépítő', 'units', 9, 4860, { lead: 4000, silicon: 3000, thorium: 1000, plastanium: 600, phase: 600, surge: 800 }, 'recon', { rot: 1, power: 25, inp: { silicon: 1000, plastanium: 600, surge: 500, phase: 350 }, inL: ['cryo', 3], lcap: 360, time: 14400, up: { antumbra: 'eclipse', arkyid: 'toxopid', scepter: 'reign', quad: 'oct', vela: 'corvus' } }),
  repairpt:   B('Javítópont', 'units', 1, 80, { lead: 30, copper: 30, silicon: 20 }, 'repair', { power: 1, range: 60, rep: .45 }),
  repairtur:  B('Javítótorony', 'units', 2, 320, { silicon: 90, thorium: 80, plastanium: 60 }, 'repair', { power: 5, range: 145, rep: 3 }),
};
export const BUILD_ORDER = {
  turret: ['duo', 'scatter', 'scorch', 'hail', 'wave', 'lancet', 'arc', 'parallax', 'swarmer', 'salvo', 'segment', 'tsunami', 'fuse', 'ripple', 'cyclone', 'foreshadow', 'spectre', 'meltdown'],
  prod: ['mdrill', 'pdrill', 'ldrill', 'bdrill', 'wextract', 'cultivator', 'oilext'],
  dist: ['conveyor', 'titancon', 'plastcon', 'armorcon', 'junction', 'bridge', 'phasecon', 'sorter', 'invsorter', 'router', 'distributor', 'overflow', 'underflow', 'unloader', 'driver'],
  liquid: ['mpump', 'rpump', 'ipump', 'conduit', 'pconduit', 'plconduit', 'lrouter', 'lcontainer', 'ltank', 'ljunction', 'lbridge', 'phaseconduit'],
  power: ['node', 'nodeL', 'surgetower', 'diode', 'battery', 'batteryL', 'combust', 'thermal', 'steam', 'diffgen', 'rtg', 'solar', 'lsolar', 'reactor', 'impact'],
  def: ['cwall', 'cwallL', 'twall', 'twallL', 'plwall', 'plwallL', 'thwall', 'thwallL', 'phwall', 'phwallL', 'swall', 'swallL', 'door', 'doorL', 'scwall', 'scwallL', 'scwallH', 'scwallG'],
  craft: ['gpress', 'mpress', 'smelter', 'crucible', 'kiln', 'plastcomp', 'weaver', 'surgesm', 'cryomix', 'pyramix', 'blastmix', 'melter', 'separator', 'disass', 'sporepress', 'pulver', 'centrifuge', 'incinerator'],
  units: ['gfactory', 'afactory', 'additive', 'multi', 'expo', 'tetra', 'repairpt', 'repairtur'],
  effect: ['mender', 'mendproj', 'overdrive', 'dome', 'forceproj', 'mine', 'foundation', 'nucleus', 'container', 'vault', 'launchpad'],
};

/* ---------- egységek ----------
   fam: mech (földi), legs (lábas – átlép a falakon), air; w: fegyverek (k: b, flame, art, laser, arc, missile, bomb, sap, bolt, beam, boom, shrap, flak, acid)
   ab: képességek – regen (pajzsosztás), ff (erőtér), rep (javítómező) */
const U = (n, fam, tier, hp, sp, r, armor, o) => ({ n, fam, tier, hp, sp, r, armor, air: fam === 'air' || fam === 'sup' ? 1 : 0, legs: fam === 'legs' ? 1 : 0, w: [], ...o });
const mis = (rl, d, spl, splR, o) => ({ k: 'missile', rl, d, spl, splR, sp: 3, life: 50, ...o });
export const UNITS = {
  alpha:    U('Alfa', 'air', 1, 350, 3, 4, 0, { core: 1, mine: 6.5, mineT: 1, build: .5, w: [{ rl: 17, d: 11, sp: 2.5, life: 60, hom: .02 }] }),
  beta:     U('Béta', 'air', 2, 500, 3.3, 4.5, 0, { core: 1, mine: 7, mineT: 1, build: .75, w: [{ rl: 20, n: 2, d: 11, sp: 3, life: 60, hom: .03 }] }),
  gamma:    U('Gamma', 'air', 3, 700, 3.55, 5.5, 0, { core: 1, mine: 8, mineT: 2, build: 1, w: [{ rl: 15, n: 2, d: 11, sp: 3.5, life: 70, hom: .04 }] }),
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
  mono:     U('Mono', 'sup', 1, 100, 1.5, 4, 0, { cost: { silicon: 30, lead: 15 }, time: 35, miner: 1, mine: 2.5, mineT: 1 }),
  poly:     U('Poly', 'sup', 2, 400, 2.6, 4.5, 0, { build: .4, rebuild: 1, ab: { rep: [10, 480, 50] }, w: [mis(30, 12, 0, 0, { sp: 4, heal: 5.5 })] }),
  mega:     U('Mega', 'sup', 3, 460, 2.5, 8, 3, { build: 2.6, rebuild: 1, w: [{ k: 'bolt', rl: 24, d: 10, sp: 5.2, life: 35, heal: 5.5 }, { k: 'bolt', rl: 15, d: 8, sp: 5.2, life: 35, heal: 3 }] }),
  quad:     U('Quad', 'sup', 4, 6000, 1.2, 18, 10, { build: 2.5, rebuild: 1, bomber: 1, w: [{ k: 'bomb', rl: 55, spl: 220, splR: 80, heal: 15, air: 0 }] }),
  oct:      U('Oct', 'sup', 5, 24000, .8, 33, 20, { build: 4, rebuild: 1, ab: { ff: [140, 4, 7000, 480], rep: [130, 120, 140] } }),
};

/* ---------- kutatási fa (a Mindustry Serpulo-fája szerint) ---------- */
const TT = 'conveyor<core junction<conveyor router<junction launchpad<router distributor<router sorter<router invsorter<sorter overflow<sorter underflow<overflow container<router unloader<container vault<container bridge<router titancon<bridge driver<titancon phasecon<driver plastcon<titancon armorcon<plastcon foundation<core nucleus<foundation mdrill<core mpump<mdrill conduit<mpump ljunction<conduit lrouter<ljunction lcontainer<lrouter ltank<lcontainer lbridge<lrouter pconduit<lrouter phaseconduit<pconduit plconduit<pconduit rpump<pconduit ipump<rpump gpress<mdrill pdrill<gpress cultivator<pdrill ldrill<pdrill bdrill<ldrill wextract<ldrill oilext<wextract pyramix<gpress blastmix<pyramix smelter<gpress sporepress<smelter centrifuge<sporepress mpress<centrifuge crucible<mpress plastcomp<sporepress weaver<plastcomp kiln<smelter pulver<kiln incinerator<pulver melter<incinerator surgesm<melter separator<melter disass<separator cryomix<melter combust<mdrill node<combust nodeL<node diode<nodeL surgetower<diode battery<node batteryL<battery mender<node mendproj<mender forceproj<mendproj overdrive<forceproj dome<overdrive repairpt<mendproj repairtur<repairpt steam<node thermal<steam diffgen<thermal reactor<diffgen impact<reactor rtg<reactor solar<node lsolar<solar duo<core cwall<duo cwallL<cwall scwall<cwallL scwallL<scwall scwallH<scwallL scwallG<scwallH twall<cwallL twallL<twall door<twall doorL<door plwall<twall plwallL<plwall thwall<twall thwallL<thwall swall<thwall swallL<swall phwall<swall phwallL<phwall scatter<duo hail<scatter salvo<hail swarmer<salvo cyclone<swarmer spectre<cyclone ripple<salvo fuse<ripple arc<duo scorch<arc wave<scorch parallax<wave segment<parallax tsunami<wave lancet<scorch meltdown<lancet foreshadow<meltdown mine<lancet gfactory<core afactory<gfactory additive<gfactory multi<additive expo<multi tetra<expo';
const FREE = ['core', 'conveyor', 'mdrill', 'duo'];
// kutatási ár: a Mindustry képlete (60 + mennyiség^1,11 · 20) negyedelve és anyagonként 10 000-nél levágva, mert itt nincs háttérben termelő szektor
const rcost = c => Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.min(10000, Math.max(10, Math.round((15 + Math.pow(v, 1.11) * 5) / 10) * 10))]));
export const TECH = [{ id: 'core', req: null, cost: {} }, ...TT.split(' ').map(s => { const [id, req] = s.split('<'); return { id, req, cost: FREE.includes(id) ? {} : rcost(BLOCKS[id].cost) }; })];

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
export function freeSector(o, seed) {
  const F = k => FREE_OPTS[k].find(x => x[0] === o[k]) || FREE_OPTS[k][0], M = MAPS.find(m => m.id === o.map) || MAPS[0], [w, h] = F('size')[2];
  const ores = {}; for (const k in M.ores) ores[k] = M.ores[k] * o.ore;
  return { id: 'free_' + seed, free: 1, n: 'Szabad játék – ' + M.n, d: '', w, h, ores, sand: M.sand, biome: M.biome, biomes: M.biomes, water: M.water, win: o.win, wt: o.wt, threat: F('diff')[2], wo: F('diff')[3], sp: o.sp, start: F('start')[2], endless: o.win === 0, unlockAll: o.res === 'all', fog: o.fog, ranked: freeRanked(o) };
}
