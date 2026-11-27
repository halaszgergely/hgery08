/* A Légi Öntözés világa más játékoknak (HGWS Vízfuvar): domborzat, terep, égbolt és fények, OSM-utak és -épületek, utófeldolgozás.
   Egyetlen belépési pont, hogy a modulok verziója mindig összetartozzon (a hívó verziószám nélkül, dinamikusan importálja). */
export * as GEO from './geo.js?v=202611271009';
export { createTerrain } from './terep.js?v=202611271009';
export { createWorld } from './vilag.js?v=202611271009';
export { createOSM } from './osm.js?v=202611271009';
export { createPost } from './utofeldolgozas.js?v=202611271009';
export { SU } from './kozos.js?v=202611271009';
