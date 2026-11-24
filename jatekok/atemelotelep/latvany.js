// Az Átemelőtelep – Three.js megjelenítő (r170). A statikus pálya anyagonként EGY összefűzött geometria; külön draw call csak a mozgó/kapcsolt tárgyaké.
// Képkockánként nincs memóriafoglalás: minden vektor, tömb és fényforrás-rekord előre lefoglalt, és újrahasznosul.
import * as THREE from 'three';
import { mergeGeometries } from './lib/addons/utils/BufferGeometryUtils.js?v=202611242137';
import { EffectComposer } from './lib/addons/postprocessing/EffectComposer.js?v=202611242137';
import { RenderPass } from './lib/addons/postprocessing/RenderPass.js?v=202611242137';
import { UnrealBloomPass } from './lib/addons/postprocessing/UnrealBloomPass.js?v=202611242137';
import { ShaderPass } from './lib/addons/postprocessing/ShaderPass.js?v=202611242137';
import { makeTextures, decals, makeMaterials } from './anyag.js?v=202611242137';
import { WELL, CONT, GEN, VAN, TREES, POLES, MARKERS, FENCES, HOLE } from './palya.js?v=202611242137';

// minőségi szintek: alap pixelarány-plafon, pontfények száma, esőcseppek, csobbanások, utófeldolgozás, árnyék, köd
export const QUAL = [
  { dpr: 1, np: 3, rain: 1500, splash: 160, comp: false, bloom: false, shadow: false, fog: .052, msaa: 0, name: 'Alacsony' },
  { dpr: 1.5, np: 5, rain: 2800, splash: 320, comp: true, bloom: true, shadow: false, fog: .044, msaa: 0, name: 'Közepes' },
  { dpr: 2, np: 8, rain: 4500, splash: 520, comp: true, bloom: true, shadow: true, fog: .038, msaa: 4, name: 'Magas' }
];
const RAIN_MAX = 4500, SPLASH_MAX = 520, NP_MAX = 8;

export function createWorld(canvas, L, opt = {}) {
  let renderer; try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false }); } catch (e) { return null; }
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = true; renderer.info.autoReset = false;
  const qi = Math.max(0, Math.min(2, opt.q ?? 1));
  const T = makeTextures(qi), D = decals(), M = makeMaterials(T, D), U = { time: { value: 0 }, wind: { value: .6 } };
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(75, 1, .05, 160); cam.rotation.order = 'YXZ'; scene.add(cam);
  const fogC = new THREE.Color(0x05070b); scene.fog = new THREE.FogExp2(fogC.getHex(), .045); scene.background = fogC.clone();

  /* ---------- statikus geometria-gyűjtő ---------- */
  const bins = new Map(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _up = new THREE.Vector3(0, 1, 0);
  function worldUV(g, sc) { const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i) * sc, p.getZ(i) * sc); else if (ax >= az) uv.setXY(i, p.getZ(i) * sc, p.getY(i) * sc); else uv.setXY(i, p.getX(i) * sc, p.getY(i) * sc); } uv.needsUpdate = true; }
  function put(key, g, own = false) { if (g.index) g = g.toNonIndexed(); g.clearGroups(); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    const sc = M[key].userData.worldUV; if (sc && !own) worldUV(g, sc); (bins.get(key) || bins.set(key, []).get(key)).push(g); return g; }
  const box = (key, x0, y0, z0, x1, y1, z1, own) => put(key, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), own);
  const cyl = (key, x, y0, z, r, h, seg = 10, r2 = r) => put(key, new THREE.CylinderGeometry(r2, r, h, seg).translate(x, y0 + h / 2, z));
  const cone = (key, x, y0, z, r, h, seg = 9) => put(key, new THREE.ConeGeometry(r, h, seg).translate(x, y0 + h / 2, z));
  function tube(key, a, b, r, seg = 8) { _v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const l = _v.length(); const g = new THREE.CylinderGeometry(r, r, l, seg, 1, true); _q.setFromUnitVectors(_up, _v.normalize()); _m.compose(_v.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q, _s); g.applyMatrix4(_m); return put(key, g); }
  // téglalap felület: c = középpont, w × h, n = normál ('+x', '-x', '+y', '+z', '-z'), saját UV (matricákhoz)
  function quad(key, c, w, h, n, own = true) { const g = new THREE.PlaneGeometry(w, h); if (n === '+y') g.rotateX(-Math.PI / 2); else if (n === '-y') g.rotateX(Math.PI / 2); else if (n === '+x') g.rotateY(Math.PI / 2); else if (n === '-x') g.rotateY(-Math.PI / 2); else if (n === '-z') g.rotateY(Math.PI); g.translate(c[0], c[1], c[2]); return put(key, g, own); }
  const rect = (key, x0, z0, x1, z1, y = 0) => quad(key, [(x0 + x1) / 2, y, (z0 + z1) / 2], x1 - x0, z1 - z0, '+y', false);

  /* ---------- talaj ---------- */
  const S0 = [-30, -30, 30, 18];   // a telep (murva)
  for (const [x0, z0, x1, z1] of [[-60, -60, 60, S0[1]], [-60, S0[3], 60, 50], [-60, S0[1], S0[0], S0[3]], [S0[2], S0[1], 60, S0[3]]]) rect('grass', x0, z0, x1, z1, -.002);
  for (const [x0, z0, x1, z1] of [[S0[0], S0[1], S0[2], WELL.z0], [S0[0], WELL.z1, S0[2], S0[3]], [S0[0], WELL.z0, WELL.x0, WELL.z1], [WELL.x1, WELL.z0, S0[2], WELL.z1]]) rect('gravel', x0, z0, x1, z1, 0);
  rect('asphalt', -2.6, 18, 2.6, 50, .006); rect('asphalt', -2.6, 10, 2.6, 18, .004); rect('field', 31, -46, 60, 2, .003);
  // tócsák (közös, hullámzó normáltérképes anyag)
  M.puddle = new THREE.MeshPhongMaterial({ color: 0x0b0f14, specular: 0x9aa8b8, shininess: 140, normalMap: T.waterN, normalScale: new THREE.Vector2(.25, .25), transparent: true, opacity: .9, depthWrite: false });
  for (const [x, z, rx, rz] of [[.8, 21, 1.6, .9], [-6, 8, 1.2, .8], [9, 4, 1.8, 1.1], [-18, -9, 1.4, 1], [-3, -19, 2, 1.2], [19, 9, 1.3, .9], [-1, 30, 1.1, .7], [-22, 6, 1, .6]]) { const g = new THREE.CircleGeometry(1, 18).rotateX(-Math.PI / 2).scale(rx, 1, rz).translate(x, .012, z); put('puddle', g, true); }

  /* ---------- kerítés: oszlopok, felső cső, drótfonat; kapuk; lyuk ---------- */
  for (const [x0, z0, x1, z1] of FENCES) { const len = Math.hypot(x1 - x0, z1 - z0), dx = (x1 - x0) / len, dz = (z1 - z0) / len;
    for (let k = 0; k <= len + .01; k += 3) cyl('galv', x0 + dx * k, 0, z0 + dz * k, .045, 2.4, 8);
    tube('galv', [x0, 2.15, z0], [x1, 2.15, z1], .024, 6); tube('galv', [x0, .08, z0], [x1, .08, z1], .012, 4);
    const g = new THREE.PlaneGeometry(len, 2.06); g.rotateY(-Math.atan2(dz, dx)); g.translate((x0 + x1) / 2, 1.1, (z0 + z1) / 2); put('chain', g); }
  for (const s of [-1, 1]) { const x = s * 2.4; for (const [a, b] of [[[x, .08, 18], [x, .08, 22]], [[x, 2.05, 18], [x, 2.05, 22]], [[x, .08, 22], [x, 2.05, 22]], [[x, .08, 18.05], [x, 2.05, 18.05]]]) tube('galv', a, b, .03, 6);
    const g = new THREE.PlaneGeometry(3.9, 1.95).rotateY(Math.PI / 2).translate(x, 1.06, 20); put('chain', g); }
  // a lyuk szélein kifelé hajlított drótfonat-darabok
  for (const [z, s] of [[HOLE.z0, -1], [HOLE.z1, 1]]) { const g = new THREE.PlaneGeometry(.45, 1.9).translate(.22 * s, 0, 0).rotateY(Math.PI / 2 + s * .9).translate(HOLE.x - .1, 1.05, z); put('chain', g); }
  quad('atemelo', [7.8, 1.45, 18.06], 2.4, .6, '+z'); box('galv', 6.55, 1.13, 18.02, 9.05, 1.77, 18.04);

  /* ---------- vezérlőkonténer ---------- */
  { const { x0, x1, z0, z1, h, w } = CONT;
    for (const b of [[x0, 0, z0, x1, h, z0 + w], [x0, 0, z1 - w, x1, h, z1], [x0, 0, z0, x0 + w, h, z1], [x1 - w, 0, z0, x1, h, -1.6], [x1 - w, 0, -.4, x1, h, z1], [x1 - w, 2.1, -1.6, x1, h, -.4]]) box('corr', ...b);
    box('darkSteel', x0 - .1, h, z0 - .1, x1 + .1, h + .18, z1 + .1); box('darkSteel', x0 - .12, 0, z0 - .12, x1 + .12, .12, z1 + .12);
    for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) box('darkSteel', cx - .14, 0, cz - .14, cx + .14, h + .2, cz + .14);
    rect('plastic', x0 + w, z0 + w, x1 - w, z1 - w, .02); box('white', x0 + w, h - .02, z0 + w, x1 - w, h, z1 - w);
    box('darkSteel', x1 - .02, 0, -1.68, x1 + .04, 2.18, -1.6); box('darkSteel', x1 - .02, 0, -.4, x1 + .04, 2.18, -.32); box('darkSteel', x1 - .02, 2.1, -1.68, x1 + .04, 2.18, -.32);
    box('darkSteel', x1, 0, -1.9, x1 + .9, .18, -.1); quad('volt', [x1 + .005, 1.75, -.15], .22, .22, '+x');
    // kapcsolószekrény (+S1), lábazat, fogantyú, matricák
    box('cabinet', -15.6, .1, -3.85, -13.8, 2, -3.35); box('black', -15.62, 0, -3.87, -13.78, .1, -3.33); box('cabinet', -15.55, .14, -3.36, -13.85, 1.95, -3.32);
    box('darkSteel', -14.05, .95, -3.33, -13.98, 1.2, -3.29); quad('s1', [-14.7, 1.78, -3.315], .32, .16, '+z'); quad('volt', [-14.7, 1.5, -3.315], .2, .2, '+z');
    // VPN-modem (a LED-ek mozgó tárgyak), antennakábel
    box('plastic', -13.4, 1.4, -3.85, -12.8, 1.75, -3.7); tube('black', [-13.1, 1.4, -3.78], [-13.1, .05, -3.78], .008, 4);
    // íróasztal, fiókos szekrény, monitor, billentyűzet, napló
    box('wood', -12.3, .72, 1.25, -9.3, .76, 1.85); for (const [lx, lz] of [[-12.25, 1.3], [-12.25, 1.8]]) box('darkSteel', lx - .03, 0, lz - .03, lx + .03, .72, lz + .03);
    box('cabinet', -9.92, 0, 1.27, -9.36, .72, 1.83); for (const y of [.08, .3, .5]) { box('steel', -9.93, y, 1.29, -9.9, y + .18, 1.81); box('darkSteel', -9.95, y + .07, 1.45, -9.93, y + .1, 1.65); }
    box('plastic', -11.6, .76, 1.55, -10.4, 1.2, 1.65); box('plastic', -11.08, .76, 1.62, -10.92, .9, 1.75); box('plastic', -11.45, .765, 1.3, -10.55, .785, 1.45);
    box('red', -10, .78, 1.3, -9.6, .82, 1.6); box('paper', -9.98, .815, 1.32, -9.62, .823, 1.58);
    // polc dossziékkal
    for (const z of [-2.58, .58]) box('darkSteel', -15.85, 0, z - .02, -15.4, 2, z + .02); for (let y = .4; y < 2; y += .5) box('galv', -15.85, y, -2.6, -15.4, y + .03, .6);
    const BC = ['binderB', 'binderR', 'binderG', 'binderB', 'binderB', 'binderR']; for (let i = 0; i < 12; i++) box(BC[i % 6], -15.82, .93, -1.58 + i * .1, -15.48, 1.25 + (i % 3) * .03, -1.5 + i * .1);
    box('paper', -15.8, .43, -2.4, -15.45, .75, -1.6); box('binderB', -15.8, 1.43, -.8, -15.45, 1.7, .2); box('wood', -15.8, 1.93, -2.3, -15.45, 2.2, -1.2);
    box('white', -12.65, 2.5, -1.08, -11.35, 2.58, -.92); }

  /* ---------- szivattyúakna ---------- */
  { const K = WELL;
    for (const b of [[K.x0, -5, K.z0, K.x1, .25, K.z0 + .25], [K.x0, -5, K.z1 - .25, K.x1, .25, K.z1], [K.x0, -5, K.z0, K.x0 + .25, .25, K.z1], [K.x1 - .25, -5, K.z0, K.x1, .25, K.z1]]) box('concreteWet', ...b);
    for (const b of [[K.x0, 0, K.z0, 5.4, .25, K.z1], [6.6, 0, K.z0, K.x1, .25, K.z1], [5.4, 0, K.z0, 6.6, .25, -11.2], [5.4, 0, -10, 6.6, .25, K.z1]]) box('concrete', ...b);
    box('concreteWet', K.x0, -5.02, K.z0, K.x1, -5, K.z1);
    for (const b of [[5.32, .25, -11.28, 6.68, .29, -11.2], [5.32, .25, -10, 6.68, .29, -9.92], [5.32, .25, -11.2, 5.4, .29, -10], [6.6, .25, -11.2, 6.68, .29, -10]]) box('darkSteel', ...b);
    // pihenő: rácspadló, sárga korlát
    const pz0 = K.z0 + .25, pz1 = K.platZ; box('darkSteel', K.x0 + .25, K.plat - .2, pz1 - .08, K.x1 - .25, K.plat, pz1); rect('grate', K.x0 + .25, pz0, K.x1 - .25, pz1 - .08, K.plat + .002);
    box('darkSteel', K.x0 + .25, K.plat - .22, pz0, K.x1 - .25, K.plat - .2, pz1);
    for (let x = K.x0 + .4; x < K.x1 - .2; x += 1.2) box('safety', x, K.plat, pz1 - .05, x + .05, K.plat + 1, pz1);
    box('safety', K.x0 + .25, K.plat + .95, pz1 - .05, K.x1 - .25, K.plat + 1.02, pz1); box('safety', K.x0 + .25, K.plat + .48, pz1 - .04, K.x1 - .25, K.plat + .52, pz1);
    // létra
    for (let y = K.plat + .3; y < .2; y += .3) tube('galv', [5.7, y, -11.66], [6.3, y, -11.66], .016, 6);
    for (const x of [5.7, 6.3]) box('galv', x - .02, K.plat, -11.74, x + .02, .95, -11.62);
    // vezetősínek, nyomócsövek, láncos emelő keretei
    for (const x of [7, 10]) { for (const s of [-1, 1]) box('galv', x + s * .33 - .02, -5, -7.05, x + s * .33 + .02, K.plat, -6.97); tube('steel', [x, -4.3, -7], [x, -.6, -7], .08, 10); tube('steel', [x, -.6, -7], [x, .25, -7], .08, 10); cyl('darkSteel', x, -4.45, -7, .12, .1, 10);
      for (const s of [-1, 1]) box('galv', x + s * .33 - .025, K.plat, -9.7, x + s * .33 + .025, K.plat + 1.6, -9.6); box('galv', x - .36, K.plat + 1.55, -9.7, x + .36, K.plat + 1.62, -9.6); box('darkSteel', x - .08, K.plat + 1.42, -9.71, x + .08, K.plat + 1.55, -9.59); }
    // úszókapcsolók konzolja, kábelek
    box('galv', 4.6, K.plat, -9.7, 4.75, K.plat + 1.4, -9.55); tube('black', [4.68, K.plat + 1.35, -9.6], [5.2, K.plat + .3, -9.25], .008, 4); tube('black', [4.7, K.plat + 1.3, -9.6], [5.5, -4.2, -9.2], .008, 4);
    // szellőztető (a lapát mozgó tárgy), légcsatorna, figyelmeztető tábla
    box('blue', 10.2, .25, -5.8, 11.4, 1.1, -4.6); quad('grill', [10.8, .68, -4.59], .9, .6, '+z', false); tube('galv', [10.2, .8, -5.2], [6.7, .4, -10.3], .15, 12);
    quad('zart', [10.8, .7, -5.81], .9, .6, '-z');
    // szelepakna, nyomóvezeték
    box('concrete', 13.5, 0, -11, 17, .3, -5); box('rust', 14.6, .3, -8.6, 15.4, .35, -7.4); tube('steel', [12, .15, -7], [13.5, .15, -7], .12, 10); }
  for (const [x, z] of MARKERS) { box('marker', x - .06, 0, z - .06, x + .06, 1, z + .06, true); }

  /* ---------- aggregát: ház, alváz, zsalus rácsok, kipufogó, vezérlőpanel, ÜZEMANYAG-BETÖLTŐ ---------- */
  { const { x0, x1, z0, z1, h } = GEN;
    box('black', x0 - .06, 0, z0 - .06, x1 + .06, .14, z1 + .06); box('yellow', x0, .14, z0, x1, h, z1); box('yellow', -25.8, 2.2, -21.8, -20.2, 2.3, -17.2);
    for (const z of [z0 - .004, z1 + .004]) for (const [a, b] of [[-25.6, -24.1], [-21.9, -20.4]]) quad('grill', [(a + b) / 2, 1.15, z], b - a, 1.25, z < -19 ? '-z' : '+z', false);
    quad('grill', [x0 - .004, 1.2, -19.5], 3.6, 1.3, '-x', false);
    for (const [a, b, c] of [[-25.95, .7, z1 + .002], [-25.95, .7, z0 - .002]]) box('black', a, b, c - .004, a + .04, 1.9, c + .004);   // ajtóhézag-sávok
    // kipufogó esővédő sapkával, emelőfülek
    tube('rust', [-21, 2.3, -18], [-21, 3.15, -18], .07, 10); box('rust', -21.12, 3.15, -18.12, -20.88, 3.18, -17.88); for (const [ex, ez] of [[-25.4, -21.4], [-20.6, -17.6]]) box('darkSteel', ex - .06, 2.3, ez - .02, ex + .06, 2.42, ez + .02);
    // vezérlőpanel a keleti oldalon (a kijelző mozgó tárgy)
    box('black', -20.02, .9, -20.2, -19.95, 1.6, -19.2); box('red', -19.96, 1.05, -19.4, -19.93, 1.15, -19.3); box('safety', -19.965, 1.03, -19.42, -19.955, 1.17, -19.28);
    for (let i = 0; i < 3; i++) box('plastic', -19.96, 1.05, -20.05 + i * .14, -19.93, 1.12, -19.97 + i * .14);
    // ÜZEMANYAG-BETÖLTŐ a déli (+z) oldalon: süllyesztett lemez, csonk, sapka sárga gyűrűvel, „DIESEL” matrica
    box('black', -23.42, .58, z1 - .01, -22.58, 1.24, z1 + .015); tube('galv', [-23, .88, z1], [-23, .88, z1 + .17], .065, 12); tube('black', [-23, .88, z1 + .17], [-23, .88, z1 + .24], .085, 14);
    tube('safety', [-23, .88, z1 + .155], [-23, .88, z1 + .175], .088, 14); box('galv', -23.34, 1.02, z1 + .015, -23.28, 1.18, z1 + .05);
    quad('diesel', [-23, 1.33, z1 + .018], .46, .23, '+z'); quad('volt', [-21.2, 1.85, z1 + .006], .2, .2, '+z');
    // vezeték az átkapcsolóhoz
    tube('black', [-20, .3, -18.4], [-17.5, .3, -19.3], .03, 6); }
  // átkapcsoló oszlopon, forgókapcsolóval
  box('darkSteel', -17.6, 0, -19.4, -17.4, 1.3, -19.2); box('cabinet', -17.9, 1.1, -19.6, -17.1, 1.9, -19.0); box('safety', -17.75, 1.3, -19.0, -17.25, 1.7, -18.985); cyl('red', -17.5, 0, -18.95, .07, .06, 12); quad('volt', [-17.5, 1.8, -18.984], .12, .12, '+z');
  { const g = new THREE.CylinderGeometry(.07, .07, .06, 12).rotateX(Math.PI / 2).translate(-17.5, 1.5, -18.95); put('red', g); }
  // antennaárboc, csatlakozódoboz, koaxkábel a konténerig
  cyl('galv', -17, 0, -5, .06, 6, 8); cyl('galv', -17, 6, -5, .015, .8, 6); for (let i = 0; i < 4; i++) tube('galv', [-17.25, 5.5 + i * .12, -5], [-16.75, 5.5 + i * .12, -5], .01, 4);
  box('cabinet', -17.3, .4, -5.4, -16.7, 1.2, -4.9); tube('black', [-17, .4, -4.9], [-16, .9, -4.0], .012, 4); tube('black', [-17.02, 1.2, -5.1], [-17.02, 5.5, -5.1], .01, 4);
  // lámpaoszlopok (a lámpafej és a fénykúp mozgó tárgy)
  for (const [x, z] of POLES) { cyl('galv', x, 0, z, .075, 5, 10, .06); tube('galv', [x, 4.85, z], [x, 4.95, z], .05, 6); box('darkSteel', x - .32, 4.95, z - .12, x + .32, 5.06, z + .12); cyl('concrete', x, 0, z, .22, .25, 10); }
  // fák (törzs + három lombkúp; a lomb a szélben ring – shaderben)
  for (const [x, z] of TREES) { const k = .85 + ((Math.sin(x * 12.9 + z * 78.2) * 43758.5) % 1 + 1) % 1 * .4; cyl('trunk', x, 0, z, .25, 3.2, 7, .18);
    for (let i = 0; i < 3; i++) cone('leaves', x, 1.6 + i * 1.25 * k, z, (1.9 - i * .5) * k, 2.4 * k, 9); }
  M.leaves.onBeforeCompile = sh => { sh.uniforms.uTime = U.time; sh.uniforms.uWind = U.wind; sh.vertexShader = 'uniform float uTime; uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat hh = max(0., position.y - 1.4); transformed.x += sin(uTime * 1.7 + position.x * .3 + position.z * .2) * hh * .035 * uWind; transformed.z += cos(uTime * 1.3 + position.x * .2) * hh * .025 * uWind;'); };
  // szolgálati kisbusz: kihúzott (extrudált) oldalprofil, kerekek, ablakok, tolóajtó nyitva, HGWS felirat
  { const sh = new THREE.Shape(), P = [[24, .42], [24, 1.12], [24.12, 1.36], [24.6, 1.48], [25.05, 2.28], [25.35, 2.4], [29.4, 2.4], [29.5, 2.3], [29.5, .42]];
    P.forEach(([z, y], i) => i ? sh.lineTo(-z, y) : sh.moveTo(-z, y));
    const g = new THREE.ExtrudeGeometry(sh, { depth: VAN.x1 - VAN.x0 - .08, bevelEnabled: true, bevelThickness: .04, bevelSize: .04, bevelSegments: 2 }); g.rotateY(Math.PI / 2); g.translate(VAN.x0 + .04, 0, 0); put('white', g, true);
    for (const z of [24.85, 28.7]) for (const x of [VAN.x0 + .1, VAN.x1 - .1]) { const w = new THREE.CylinderGeometry(.33, .33, .24, 16).rotateZ(Math.PI / 2).translate(x, .33, z); put('rubber', w); const r = new THREE.CylinderGeometry(.17, .17, .25, 10).rotateZ(Math.PI / 2).translate(x, .33, z); put('galv', r); }
    const ws = new THREE.PlaneGeometry(VAN.x1 - VAN.x0 - .2, .9); ws.rotateX(-Math.atan2(.45, .8) - Math.PI / 2 + Math.PI); ws.rotateY(Math.PI); ws.rotateX(0); ws.translate((VAN.x0 + VAN.x1) / 2, 1.88, 24.82); put('glass', ws, true);
    for (const [x, n] of [[VAN.x0 - .005, '-x'], [VAN.x1 + .005, '+x']]) { quad('glass', [x, 1.85, 25.45], .7, .6, n); quad('hgws', [x, 1.0, 27.2], 2.4, .6, n); quad('glass', [x, 1.85, 29], .7, .5, n); box('safety', Math.min(x, x + (n === '-x' ? -.002 : .002)) - .001, 1.28, 24.3, Math.max(x, x + (n === '-x' ? -.002 : .002)) + .001, 1.33, 29.4); }
    quad('glass', [(VAN.x0 + VAN.x1) / 2, 1.9, 29.505], 2.2, .55, '+z');
    box('black', VAN.x0, .3, 23.9, VAN.x1, .55, 24.02); box('black', VAN.x0, .3, 29.48, VAN.x1, .55, 29.6);
    box('safety', 1.9, 2.4, 25.6, 3.3, 2.5, 25.9);
    // nyitott tolóajtó (hátratolva) és a raktér
    box('white', VAN.x0 - .1, .45, 27.25, VAN.x0 - .04, 2.1, 28.75); quad('black', [VAN.x0 + .01, 1.25, 26.35], 1.5, 1.6, '-x');
    box('darkSteel', VAN.x0 + .1, .45, 25.65, VAN.x0 + .75, .5, 27.1); box('red', VAN.x0 + .15, .5, 25.8, VAN.x0 + .6, .85, 26.4); box('plastic', VAN.x0 + .15, .5, 26.5, VAN.x0 + .6, .75, 27); box('darkSteel', VAN.x0 + .1, 1.2, 25.65, VAN.x0 + .7, 1.24, 27.1); box('safety', VAN.x0 + .15, 1.24, 25.8, VAN.x0 + .55, 1.5, 26.3); }
  // elvágott lánc a kapuban
  { const R = n => ((Math.sin(n * 91.7) * 4375.5) % 1 + 1) % 1; for (let i = 0; i < 11; i++) { const t = new THREE.TorusGeometry(.035, .009, 5, 8); t.rotateX(Math.PI / 2); t.rotateY(i * .9 + R(i)); t.translate(-.45 + i * .085, .012, 19 + Math.sin(i * .8) * .12); put('galv', t); }
    box('galv', .5, 0, 18.92, .62, .1, 19.08); box('steel', .52, .1, 18.97, .6, .15, 19.03); }
  // tolózár a szántón: betonalap, öntöttvas fedél
  box('concrete', 51.5, 0, -22.5, 52.5, .12, -21.5); cyl('rust', 52, .12, -22, .19, .04, 14); cyl('darkSteel', 52, .16, -22, .07, .02, 8);

  // összefűzés anyagonként
  const statics = [];
  for (const [key, list] of bins) { const g = mergeGeometries(list, false); list.forEach(x => x.dispose()); g.computeBoundingSphere(); const m = new THREE.Mesh(g, M[key]); m.matrixAutoUpdate = false; m.updateMatrix();
    m.receiveShadow = !['puddle', 'chain', 'leaves', 'grate'].includes(key); m.castShadow = !['grass', 'gravel', 'asphalt', 'field', 'puddle'].includes(key); scene.add(m); statics.push(m); }

  /* ---------- mozgó / kapcsolt tárgyak ---------- */
  const emis = (c, i = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), toneMapped: true });
  const mk = (geo, mat, x = 0, y = 0, z = 0, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(1, 1, 1, 14), SPH = new THREE.SphereGeometry(1, 12, 8);
  const dyn = {};
  // konténerajtó (zsanér: x = −8, z = −1,6)
  dyn.door = new THREE.Group(); dyn.door.position.set(CONT.x1, 0, -1.6); scene.add(dyn.door);
  { const d = mk(BOX, M.corr, .03, 1.05, .6, dyn.door); d.scale.set(.05, 2.08, 1.18); mk(BOX, M.darkSteel, .07, 1.0, 1.05, dyn.door).scale.set(.04, .04, .14); const s = mk(new THREE.PlaneGeometry(.22, .22), M.volt, .058, 1.6, .6, dyn.door); s.rotation.y = Math.PI / 2; }
  // keleti kapu (zsanér: x = 30, z = −24)
  dyn.gate = new THREE.Group(); dyn.gate.position.set(30, 0, -24); scene.add(dyn.gate);
  { for (const [a, b, c, d] of [[0, .08, 0, 4], [0, 2.05, 0, 4]]) { const t = mk(CYL, M.galv, 0, a + (b - a) * 0, 2, dyn.gate); t.scale.set(.03, 4, .03); t.rotation.x = Math.PI / 2; t.position.y = b; void c; void d; }
    for (const z of [.03, 3.97]) { const t = mk(CYL, M.galv, 0, 1.06, z, dyn.gate); t.scale.set(.03, 1.97, .03); } const p = mk(new THREE.PlaneGeometry(3.94, 1.95), M.chain, 0, 1.06, 2, dyn.gate); p.rotation.y = Math.PI / 2;
    const lk = mk(BOX, M.darkSteel, 0, 1.0, 3.92, dyn.gate); lk.scale.set(.1, .14, .06); }
  // búvónyílás fedele (zsanér az északi peremen)
  dyn.hatch = new THREE.Group(); dyn.hatch.position.set(6, .27, -11.2); scene.add(dyn.hatch);
  { const l = mk(BOX, M.rust, 0, .02, .6, dyn.hatch); l.scale.set(1.18, .04, 1.18); const hd = mk(BOX, M.darkSteel, 0, .07, 1.0, dyn.hatch); hd.scale.set(.3, .04, .04); }
  // világító felületek
  dyn.tube = mk(BOX, emis(0xfff4e0, 3), -12, 2.485, -1); dyn.tube.scale.set(1.1, .035, .07);
  dyn.wellLamp = mk(BOX, emis(0xffffff, 2.5), 8, -.5, -11.62); dyn.wellLamp.scale.set(.56, .16, .04); mk(BOX, M.darkSteel, 8, -.5, -11.7).scale.set(.62, .22, .1);
  dyn.heads = POLES.map(([x, z]) => { const m = mk(BOX, emis(0xffc070, 4), x, 4.935, z); m.scale.set(.5, .02, .18); return m; });
  { const g = new THREE.ConeGeometry(2.6, 4.9, 20, 1, true); g.translate(0, -2.45, 0); const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      uniforms: { uI: { value: 1 }, uC: { value: new THREE.Color(0xffb26a) } }, vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = -position.y / 4.9; vec4 w = modelViewMatrix * vec4(position,1.); vV = normalize(-w.xyz); vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * w; }',
      fragmentShader: 'uniform float uI; uniform vec3 uC; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float e = pow(abs(dot(vN, vV)), 1.6); gl_FragColor = vec4(uC * (1. - vY) * (1. - vY) * e * .085 * uI, 1.); }' });
    dyn.cones = POLES.map(([x, z]) => { const m = mk(g, mat, x, 4.93, z); m.renderOrder = 5; return m; }); dyn.coneMat = mat; }
  dyn.screen = mk(new THREE.PlaneGeometry(1.1, .34), new THREE.MeshBasicMaterial({ map: D.screenOff }), -11, .99, 1.545); dyn.screen.rotation.y = Math.PI; dyn.screenOn = D.screenOn; dyn.screenOff = D.screenOff;
  dyn.leds = [0, 1, 2].map(i => mk(BOX, new THREE.MeshBasicMaterial({ color: 0x222222 }), -13.3 + i * .08, 1.65, -3.695)); dyn.leds.forEach(l => l.scale.set(.025, .015, .01));
  dyn.beacon = mk(CYL, new THREE.MeshBasicMaterial({ color: 0x400806 }), -12, 2.88, -1); dyn.beacon.scale.set(.1, .2, .1); mk(CYL, M.black, -12, 2.79, -1).scale.set(.13, .03, .13);
  dyn.genDisp = mk(BOX, new THREE.MeshBasicMaterial({ color: 0x111111 }), -19.94, 1.38, -19.75); dyn.genDisp.scale.set(.01, .12, .26);
  // víz a medencében (hullámzó normáltérkép), pára
  M.water = new THREE.MeshPhongMaterial({ color: 0x1d2a1c, specular: 0x6f7f70, shininess: 70, normalMap: T.waterN, normalScale: new THREE.Vector2(.5, .5), transparent: true, opacity: .93 });
  const wn = T.waterN; dyn.water = mk(new THREE.PlaneGeometry(WELL.x1 - WELL.x0 - .5, WELL.z1 - WELL.z0 - .5), M.water, 8, -3, -8); dyn.water.rotation.x = -Math.PI / 2; wn.repeat.set(3, 3);
  // szivattyúk (P1 kiemelhető), rongykoszorú
  dyn.pumps = [7, 10].map(x => { const g = new THREE.Group(); g.position.set(x, -5, -7); scene.add(g); mk(CYL, M.blue, 0, .37, 0, g).scale.set(.3, .75, .3); mk(CYL, M.darkSteel, 0, .9, 0, g).scale.set(.22, .32, .22); mk(BOX, M.blue, 0, .2, .32, g).scale.set(.18, .2, .3); mk(CYL, M.galv, 0, 1.1, 0, g).scale.set(.05, .1, .05); return g; });
  dyn.rag = mk(SPH, M.paper, 0, .1, .35, dyn.pumps[0]); dyn.rag.scale.set(.24, .1, .14);
  dyn.chain = mk(CYL, M.galv, 7, -3.4, -9.65); dyn.chain.scale.set(.012, 2.8, .012);
  dyn.lsh = mk(SPH, M.safety, 4.7, WELL.plat + .9, -9.62); dyn.lsh.scale.set(.09, .14, .09); dyn.lsl = mk(SPH, M.red, 5.5, -4.4, -9.2); dyn.lsl.scale.set(.09, .14, .09);
  dyn.fan = mk(BOX, M.darkSteel, 10.8, .68, -4.57); dyn.fan.scale.set(.7, .06, .02);
  // gázolajos kanna, névjegy, alak
  dyn.kanna = new THREE.Group(); dyn.kanna.position.set(-6.3, 0, 3.7); scene.add(dyn.kanna); mk(BOX, M.red, 0, .24, 0, dyn.kanna).scale.set(.34, .46, .17); mk(BOX, M.red, -.06, .5, 0, dyn.kanna).scale.set(.16, .05, .04); mk(CYL, M.black, .12, .5, 0, dyn.kanna).scale.set(.03, .05, .03);
  dyn.card = mk(new THREE.PlaneGeometry(.3, .19), M.card, 52, .186, -22); dyn.card.rotation.x = -Math.PI / 2; dyn.card.rotation.z = .4;
  dyn.figure = new THREE.Group(); scene.add(dyn.figure); { const k = new THREE.MeshBasicMaterial({ color: 0x010102 }); mk(BOX, k, 0, .95, 0, dyn.figure).scale.set(.46, 1.1, .26); mk(SPH, k, 0, 1.68, 0, dyn.figure).scale.set(.13, .16, .14); mk(BOX, k, 0, .25, 0, dyn.figure).scale.set(.34, .5, .2); mk(BOX, k, 0, 1.12, 0, dyn.figure).scale.set(.6, .5, .3); const h = mk(CYL, k, 0, 1.86, 0, dyn.figure); h.scale.set(.2, .03, .2); }
  // kipufogófüst, pára az aknában (kis, előre lefoglalt pontfelhők)
  const smokeG = new THREE.BufferGeometry(); smokeG.setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * 3), 3)); smokeG.setAttribute('aK', new THREE.BufferAttribute(new Float32Array(16).map((_, i) => i / 16), 1));
  const softPt = (col, size, rise) => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: U.time, uPx: { value: 1 }, uC: { value: new THREE.Color(col) }, uA: { value: 1 } }, fog: false,
    vertexShader: `uniform float uT; uniform float uPx; attribute float aK; varying float vA; void main(){ float k = fract(uT * ${rise.toFixed(3)} + aK); vec3 p = position + vec3(sin(aK * 40. + uT) * .25 * k, k * 2.6, cos(aK * 30.) * .2 * k); vA = (1. - k) * smoothstep(0., .15, k); vec4 mv = modelViewMatrix * vec4(p, 1.); gl_PointSize = (${size.toFixed(1)} + k * ${size.toFixed(1)}) * uPx / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'uniform vec3 uC; uniform float uA; varying float vA; void main(){ vec2 c = gl_PointCoord - .5; float d = dot(c, c); if (d > .25) discard; gl_FragColor = vec4(uC, (1. - d * 4.) * vA * .35 * uA); }' });
  dyn.smoke = new THREE.Points(smokeG, softPt(0x50545a, 60, .22)); dyn.smoke.position.set(-21, 3.2, -18); dyn.smoke.frustumCulled = false; scene.add(dyn.smoke);
  const mistG = new THREE.BufferGeometry(), mp = new Float32Array(24 * 3); for (let i = 0; i < 24; i++) { mp[i * 3] = 4.6 + Math.random() * 6.8; mp[i * 3 + 1] = 0; mp[i * 3 + 2] = -11.4 + Math.random() * 6.8; }
  mistG.setAttribute('position', new THREE.BufferAttribute(mp, 3)); mistG.setAttribute('aK', new THREE.BufferAttribute(new Float32Array(24).map(() => Math.random()), 1));
  dyn.mist = new THREE.Points(mistG, softPt(0x9aa8a0, 140, .05)); dyn.mist.frustumCulled = false; scene.add(dyn.mist);

  /* ---------- eső: statikus puffer, a shader mozgatja és a kamera köré tekeri ---------- */
  const RB = 26, RH = 14;
  const rainG = new THREE.BufferGeometry(), rp = new Float32Array(RAIN_MAX * 2 * 3), re = new Float32Array(RAIN_MAX * 2);
  for (let i = 0; i < RAIN_MAX; i++) { const x = Math.random() * RB, y = Math.random() * RH, z = Math.random() * RB; for (let j = 0; j < 2; j++) { rp.set([x, y, z], (i * 2 + j) * 3); re[i * 2 + j] = j; } }
  rainG.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rainG.setAttribute('aE', new THREE.BufferAttribute(re, 1));
  const rainM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false,
    uniforms: { uT: U.time, uCam: { value: new THREE.Vector3() }, uA: { value: .4 }, uFlash: { value: 0 }, uIn: { value: new THREE.Vector4(CONT.x0, CONT.z0, CONT.x1, CONT.z1) }, uWind: U.wind },
    vertexShader: `uniform float uT; uniform vec3 uCam; uniform vec4 uIn; uniform float uWind; attribute float aE; varying float vA;
      void main(){ vec3 p = position; p.y = mod(p.y - uT * 15.0, ${RH.toFixed(1)}); p.x = mod(p.x - uCam.x + uT * uWind * 1.6, ${RB.toFixed(1)}) - ${(RB / 2).toFixed(1)} + uCam.x; p.z = mod(p.z - uCam.z, ${RB.toFixed(1)}) - ${(RB / 2).toFixed(1)} + uCam.z;
        p.y += uCam.y - 4.0; p -= vec3(uWind * .04, -0.32, 0.) * aE; p.y = max(p.y, 0.0);
        float inside = step(uIn.x, p.x) * step(p.x, uIn.z) * step(uIn.y, p.z) * step(p.z, uIn.w) * step(p.y, 2.8);
        vec4 mv = modelViewMatrix * vec4(p, 1.); vA = (1. - inside) * smoothstep(${(RB / 2).toFixed(1)}, 4.0, length(p.xz - uCam.xz)) * (aE * .7 + .3); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'uniform float uA; uniform float uFlash; varying float vA; void main(){ gl_FragColor = vec4(vec3(.62, .68, .78) + uFlash * .6, vA * uA); }' });
  dyn.rain = new THREE.LineSegments(rainG, rainM); dyn.rain.frustumCulled = false; dyn.rain.renderOrder = 6; scene.add(dyn.rain);
  // csobbanások a talajon (pontok, a shader rajzolja a gyűrűt)
  const spG = new THREE.BufferGeometry(), sp = new Float32Array(SPLASH_MAX * 3); for (let i = 0; i < SPLASH_MAX; i++) { sp[i * 3] = Math.random(); sp[i * 3 + 1] = Math.random(); sp[i * 3 + 2] = Math.random(); }
  spG.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const spM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, uniforms: { uT: U.time, uCam: { value: new THREE.Vector3() }, uPx: { value: 1 }, uA: { value: .5 }, uIn: rainM.uniforms.uIn, uW: { value: new THREE.Vector4(WELL.x0, WELL.z0, WELL.x1, WELL.z1) } },
    vertexShader: `uniform float uT; uniform vec3 uCam; uniform float uPx; uniform vec4 uIn; uniform vec4 uW; varying float vK; varying float vA;
      void main(){ float ph = uT * 1.9 + position.z * 7.0; float cyc = floor(ph); vK = fract(ph); float a = fract(sin(dot(position.xy + cyc, vec2(12.9898, 78.233))) * 43758.5) * 6.2832; float r = sqrt(fract(sin(position.x * 91.3 + cyc * 1.7) * 3758.5)) * 11.0;
        vec3 p = vec3(uCam.x + cos(a) * r, 0.04, uCam.z + sin(a) * r); float hide = step(uIn.x, p.x) * step(p.x, uIn.z) * step(uIn.y, p.z) * step(p.z, uIn.w);
        hide = max(hide, step(uW.x, p.x) * step(p.x, uW.z) * step(uW.y, p.z) * step(p.z, uW.w)); p.y += step(uW.x, p.x) * step(p.x, uW.z) * step(uW.y, p.z) * step(p.z, uW.w) * .23;
        vA = (1. - hide) * (1. - smoothstep(6., 11., r)); vec4 mv = modelViewMatrix * vec4(p, 1.); gl_PointSize = (.03 + vK * .11) * uPx / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'uniform float uA; varying float vK; varying float vA; void main(){ vec2 c = gl_PointCoord - .5; float d = length(c) * 2.; float ring = smoothstep(.65, .85, d) * (1. - smoothstep(.85, 1., d)); gl_FragColor = vec4(vec3(.7, .76, .85), ring * (1. - vK) * vA * uA); }' });
  dyn.splash = new THREE.Points(spG, spM); dyn.splash.frustumCulled = false; dyn.splash.renderOrder = 4; scene.add(dyn.splash);

  /* ---------- égbolt-kupola (színátmenet, hajnalban derengés keleten) ---------- */
  const sky = new THREE.Mesh(new THREE.SphereGeometry(120, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uD: { value: 0 }, uF: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }',
    fragmentShader: `uniform float uD; uniform float uF; varying vec3 vP; void main(){ vec3 d = normalize(vP); float h = clamp(d.y, -.1, 1.);
      vec3 night = mix(vec3(.018, .024, .036), vec3(.004, .006, .012), smoothstep(0., .6, h)); vec3 dawnC = mix(vec3(.95, .55, .32), vec3(.25, .38, .6), smoothstep(0., .5, h));
      float east = pow(max(0., d.x * .7 + .3), 2.); vec3 c = mix(night, dawnC * (.4 + .6 * east), uD) + uF * vec3(.25, .27, .32) * (1. - h * .5); gl_FragColor = vec4(c, 1.); }` }));
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);

  /* ---------- fények ---------- */
  const hemi = new THREE.HemisphereLight(0x6d82a6, 0x1a1c16, .5); scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x8fa4cf, .2); moon.position.set(-30, 60, 25); scene.add(moon); scene.add(moon.target);
  const flash = new THREE.SpotLight(0xfff1dc, 0, 30, .48, .6, 1.15); flash.position.set(.18, -.12, 0); cam.add(flash); flash.target.position.set(.05, -.08, -4); cam.add(flash.target);
  flash.shadow.mapSize.set(512, 512); flash.shadow.bias = -.0006; flash.shadow.normalBias = .02; flash.shadow.camera.near = .2; flash.shadow.camera.far = 30;
  const pool = []; function setPool(n) { while (pool.length > n) { const l = pool.pop(); scene.remove(l); l.dispose(); } while (pool.length < n) { const l = new THREE.PointLight(0xffffff, 0, 10, 2); scene.add(l); pool.push(l); } }
  // fényforrás-rekordok (előre lefoglalva): x, y, z, hatótáv, szín, intenzitás, aktív
  const SRC = Array.from({ length: 10 }, () => ({ x: 0, y: 0, z: 0, r: 1, c: new THREE.Color(), i: 0, on: false, d: 0 })), order = SRC.slice();

  /* ---------- kézben tartott tárgyak (külön jelenet, mindig a pálya előtt) ---------- */
  const hscene = new THREE.Scene(), hcam = new THREE.PerspectiveCamera(62, 1, .01, 5); hscene.add(new THREE.HemisphereLight(0x8899bb, 0x111111, 1.4)); const hdir = new THREE.DirectionalLight(0xffffff, .8); hdir.position.set(.5, 1, .6); hscene.add(hdir);
  const hand = new THREE.Group(); hscene.add(hand);
  const torch = new THREE.Group(); hand.add(torch); torch.position.set(.2, -.2, -.44); torch.scale.setScalar(.85); torch.rotation.set(.08, .06, 0);
  { const body = mk(CYL, M.darkSteel, 0, 0, 0, torch); body.scale.set(.026, .2, .026); body.rotation.x = Math.PI / 2; const head = mk(CYL, M.darkSteel, 0, 0, -.12, torch); head.scale.set(.036, .05, .036); head.rotation.x = Math.PI / 2;
    const grip = mk(CYL, M.rubber, 0, 0, .04, torch); grip.scale.set(.028, .08, .028); grip.rotation.x = Math.PI / 2; dyn.lens = mk(CYL, new THREE.MeshBasicMaterial({ color: 0xfff6dd }), 0, 0, -.146, torch); dyn.lens.scale.set(.03, .004, .03); dyn.lens.rotation.x = Math.PI / 2; }
  const det = new THREE.Group(); hand.add(det); det.position.set(-.22, -.23, -.46); det.rotation.set(.35, .5, 0); det.scale.setScalar(.75);
  { mk(BOX, M.safety, 0, 0, 0, det).scale.set(.07, .11, .03); dyn.detScr = mk(BOX, new THREE.MeshBasicMaterial({ color: 0x66ff88 }), 0, .02, .016, det); dyn.detScr.scale.set(.05, .035, .004); dyn.detLed = mk(BOX, new THREE.MeshBasicMaterial({ color: 0x331111 }), .022, .046, .016, det); dyn.detLed.scale.set(.01, .008, .004); }

  /* ---------- utófeldolgozás ---------- */
  const FinalShader = { uniforms: { tDiffuse: { value: null }, uE: { value: 1.05 }, uT: { value: 0 }, uD: { value: 0 }, uV: { value: 1 }, uG: { value: .06 }, uH: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uT; uniform float uD; uniform float uV; uniform float uG; uniform float uH; uniform float uE; varying vec2 vUv;
      vec3 aces(vec3 c){ const mat3 I = mat3(vec3(.59719, .07600, .02840), vec3(.35458, .90834, .13383), vec3(.04823, .01566, .83777)); const mat3 O = mat3(vec3(1.60475, -.10208, -.00327), vec3(-.53108, 1.10813, -.07276), vec3(-.07367, -.00605, 1.07602));
        c *= uE / .6; c = I * c; vec3 a = c * (c + .0245786) - .000090537, b = c * (.983729 * c + .4329510) + .238081; return clamp(O * (a / b), 0., 1.); }
      vec3 srgb(vec3 c){ return mix(c * 12.92, pow(c, vec3(.41666)) * 1.055 - .055, step(.0031308, c)); }
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = dot(c, vec3(.299, .587, .114));
        vec3 night = mix(c, vec3(l) * vec3(.85, .95, 1.12), .18) * vec3(.96, 1., 1.05); vec3 dawn = c * vec3(1.08, 1., .9) + vec3(.012, .006, 0.); c = mix(night, dawn, uD);
        c = mix(c, c * vec3(.75, 1.2, .55), uH);
        vec2 q = vUv - .5; c *= mix(1., smoothstep(.85, .25, length(q * vec2(1.1, 1.))), uV * .7);
        c = srgb(aces(max(c, 0.))); c += (h(vUv * 917. + fract(uT) * 31.) - .5) * uG * (.4 + l) * .5; gl_FragColor = vec4(c, 1.); }` };
  let composer = null, bloom = null, finalP = null, cur = -1;
  function buildComposer(q) { if (composer) { composer.renderTarget1.dispose(); composer.renderTarget2.dispose(); composer = null; } if (!q.comp) return;
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: q.msaa }); composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, cam)); const hp = new RenderPass(hscene, hcam); hp.clear = false; hp.clearDepth = true; composer.addPass(hp);
    if (q.bloom) { bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .55, .5, .9); composer.addPass(bloom); } else bloom = null;
    finalP = new ShaderPass(FinalShader); composer.addPass(finalP); }   // a tónusleképezés és az sRGB-átalakítás is a végső menetben történik: egy teljes képernyős menettel kevesebb

  /* ---------- méretezés, minőség, dinamikus felbontás ---------- */
  let resScale = 1, autoRes = true, userRes = 1, W = 1, H = 1, pr = 1, Qc = QUAL[1], vigEl = opt.vignette || null;
  function applySize() { W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight; const dpr = Math.min(devicePixelRatio || 1, Qc.dpr); pr = Math.max(.35, dpr * (autoRes ? resScale : userRes));
    renderer.setPixelRatio(pr); renderer.setSize(W, H, false); cam.aspect = hcam.aspect = W / H; cam.updateProjectionMatrix(); hcam.updateProjectionMatrix();
    if (composer) { composer.setPixelRatio(pr); composer.setSize(W, H); if (bloom) bloom.resolution.set(W * pr / 2, H * pr / 2); }
    const ps = H * pr / 2; spM.uniforms.uPx.value = H * pr / (2 * Math.tan(cam.fov * Math.PI / 360)); dyn.smoke.material.uniforms.uPx.value = ps / 30; dyn.mist.material.uniforms.uPx.value = ps / 30; }
  function setQuality(q) { q = Math.max(0, Math.min(2, q)); if (q === cur) return; cur = q; Qc = QUAL[q]; setPool(Qc.np);
    for (let i = 0; i < statics.length; i++) { const m = statics[i], u = m.userData; if (!u.hi) { u.hi = m.material; if (u.hi.isMeshPhongMaterial && !u.hi.transparent) u.lo = new THREE.MeshLambertMaterial({ map: u.hi.map, color: u.hi.color, side: u.hi.side, alphaTest: u.hi.alphaTest }); }
      if (u.lo) m.material = q === 0 ? u.lo : u.hi; }
    const an = q === 0 ? 1 : q === 1 ? 4 : 8; for (let i = 0; i < statics.length; i++) { const h = statics[i].userData.hi; for (const k of ['map', 'specularMap', 'normalMap']) { const t = h[k]; if (t && t.anisotropy !== an) { t.anisotropy = an; t.needsUpdate = true; } } }
    const sh = Qc.shadow; if (flash.castShadow !== sh) { flash.castShadow = sh; flash.map = sh ? T.cookie : null; statics.forEach(m => { m.material.needsUpdate = true; }); }
    scene.fog.density = Qc.fog; rainG.setDrawRange(0, Qc.rain * 2); spG.setDrawRange(0, Qc.splash); buildComposer(Qc); if (vigEl) vigEl.hidden = !!Qc.comp; applySize(); }
  const ft = new Float32Array(24); let fti = 0, ftN = 0, adjT = 0;
  function dynRes(dtms) { ft[fti] = dtms; fti = (fti + 1) % ft.length; ftN = Math.min(ftN + 1, ft.length); if (!autoRes || ftN < ft.length) return; if ((adjT -= dtms) > 0) return; adjT = 700;
    let s = 0; for (let i = 0; i < ftN; i++) s += ft[i]; const avg = s / ftN; let n = resScale;
    if (avg > 19.5) n = Math.max(.5, resScale - (avg > 45 ? .25 : avg > 30 ? .15 : .08)); else if (avg < 17.4 && resScale < 1) n = Math.min(1, resScale + .05);
    if (Math.abs(n - resScale) > .001) { resScale = n; applySize(); ftN = 0; } }

  /* ---------- képkockánkénti frissítés ---------- */
  const lastCam = new THREE.Vector3(); let srcT = 0, nSrc = 0; const byD = (a, b) => a.d - b.d;
  function add(x, y, z, r, c, i) { const s = SRC[nSrc++]; s.x = x; s.y = y; s.z = z; s.r = r; s.c.setHex(c); s.i = i; s.on = true; }
  function frame(F) {
    const t = F.t; U.time.value = t; U.wind.value = F.wind;
    cam.position.set(F.x, F.y, F.z); cam.rotation.set(F.pitch, F.yaw, F.roll || 0); if (cam.fov !== F.fov) { cam.fov = F.fov; cam.updateProjectionMatrix(); }
    const S = F.S, dawn = F.dawn, fl = F.flash;
    // ég, köd, környezeti fények (villámláskor felvillan a jelenet)
    fogC.setRGB(.012 + .42 * dawn + fl * .1, .016 + .38 * dawn + fl * .11, .026 + .42 * dawn + fl * .13); scene.fog.color.copy(fogC); scene.background.copy(fogC); scene.fog.density = Qc.fog * (1 - .72 * dawn) * (S && S.well.in ? .5 : 1);
    sky.material.uniforms.uD.value = dawn; sky.material.uniforms.uF.value = fl; sky.position.copy(cam.position);
    hemi.intensity = .5 + 1.4 * dawn + fl * 2.6; hemi.color.setRGB(.42 + .5 * dawn, .5 + .35 * dawn, .65 + .2 * dawn); moon.intensity = .12 + 1.6 * dawn + fl * 1.8; moon.color.setRGB(.56 + .44 * dawn, .64 + .26 * dawn, .82 - .1 * dawn);
    renderer.toneMappingExposure = 1.05 - .15 * dawn; if (finalP) finalP.uniforms.uE.value = renderer.toneMappingExposure;
    // zseblámpa
    flash.intensity = F.torch * 5.5; dyn.lens.material.color.setScalar(F.torch > 0 ? 1.6 : .15); torch.visible = true; det.visible = !!F.detector;
    hand.position.set(F.bobX, F.bobY, 0); hand.rotation.set(F.swayP, F.swayY, 0);
    if (F.detector) { const g = F.gas; dyn.detScr.material.color.setHex(g >= 10 ? 0xff3322 : g >= 5 ? 0xffcc33 : 0x66ff88); dyn.detLed.material.color.setHex(g >= 5 && (t * (g >= 10 ? 6 : 2)) % 1 < .5 ? 0xff2211 : 0x331111); }
    if (!S) { finish(); return; }
    const lp = F.lightPow, cp = F.cabPow, lampsOn = lp && S.cab.q[0];
    // ajtók, kapu, fedél (lágy mozgással)
    dyn.door.rotation.y += ((S.door ? Math.PI / 2 : 0) - dyn.door.rotation.y) * Math.min(1, F.dt * 6);
    dyn.gate.rotation.y += ((S.eastGate ? Math.PI / 2 : 0) - dyn.gate.rotation.y) * Math.min(1, F.dt * 4);
    dyn.hatch.rotation.x += ((S.well.hatch ? Math.PI / 2 : 0) - dyn.hatch.rotation.x) * Math.min(1, F.dt * 5);
    // lámpák, kijelzők
    const flick = S.f.flick != null && Math.random() < .3 ? .2 : 1;
    dyn.tube.visible = !!lampsOn; dyn.tube.material.color.setRGB(3 * flick, 2.9 * flick, 2.7 * flick); dyn.wellLamp.visible = !!lampsOn; for (let i = 0; i < 3; i++) { dyn.heads[i].visible = !!lampsOn; dyn.cones[i].visible = !!lampsOn && !S.well.in; } dyn.coneMat.uniforms.uI.value = 1 - dawn * .8;
    dyn.screen.material.map = cp ? (F.plcRun ? dyn.screenOn : dyn.screenOff) : dyn.screenOff; dyn.screen.material.color.setScalar(cp ? (F.plcRun ? 1.6 : .5) : .25);
    const mo = S.modem; dyn.leds[0].material.color.setHex(mo.pwr && cp && S.cab.q[4] ? 0x33ff66 : 0x1a1a1a); dyn.leds[1].material.color.setHex(mo.pwr && cp && S.cab.q[4] && mo.ant ? (mo.online ? 0x33ff66 : ((t * 2) % 1 < .5 ? 0xffcc22 : 0x332200)) : 0x1a1a1a); dyn.leds[2].material.color.setHex(mo.online ? 0x44aaff : 0x1a1a1a);
    const alarm = (S.alarm || S.lvl > 3.2) && cp; dyn.beacon.material.color.setRGB(alarm ? 2.5 + Math.sin(t * 12) : .25, alarm ? .15 : .03, alarm ? .08 : .02);
    dyn.genDisp.material.color.setHex(S.gen.run ? 0x55ff99 : S.gen.bat ? 0x334433 : 0x111111);
    // víz, szivattyúk, úszók, ventilátor
    const wy = WELL.floor + S.lvl; dyn.water.position.y = wy; wn.offset.set(t * .015, t * .01); T.waterN.offset.x = t * .015;
    const up = S.well.p1up; dyn.pumps[0].position.set(7, -5 + up * 3.0, -7 - up * 2.2); dyn.rag.visible = !!(up > 0 && !S.well.p1clean);
    const vib = (S.run[0] ? 1 : 0); dyn.pumps[0].rotation.z = vib * Math.sin(t * 90) * .004; dyn.pumps[1].rotation.z = (S.run[1] ? 1 : 0) * Math.sin(t * 87) * .004;
    dyn.chain.position.y = (WELL.plat + 1.42 + (-5 + up * 3 + 1.2)) / 2; dyn.chain.scale.y = Math.max(.1, WELL.plat + 1.42 - (-5 + up * 3 + 1.2)); dyn.chain.position.z = -9.65 + (1 - up) * 0 - 0; dyn.chain.visible = !!(up > 0 || S.well.in);
    if (!S.well.float) dyn.lsh.position.set(4.7, WELL.plat + .9, -9.62); else dyn.lsh.position.set(5.2, Math.min(-5 + 3.0, wy + .06), -9.2); dyn.lsl.position.y = Math.max(-4.5, Math.min(wy + .06, -4.4));
    if (S.well.vent && lp) dyn.fan.rotation.z += F.dt * 22;
    dyn.kanna.visible = !S.f.tookKanna; dyn.card.visible = S.ch === 6;
    dyn.figure.visible = !!S.f.figure; if (S.f.figure) { dyn.figure.position.set(S.f.figure.x, 0, S.f.figure.z); dyn.figure.rotation.y = Math.atan2(F.x - S.f.figure.x, F.z - S.f.figure.z); }
    dyn.smoke.visible = !!S.gen.run; dyn.mist.visible = !!(S.well.in || (S.well.hatch && Math.hypot(F.x - 6, F.z + 10.6) < 10));
    // eső és csobbanások
    const rainOn = !!(F.rain > 0 && !S.well.in); dyn.rain.visible = dyn.splash.visible = rainOn; rainM.uniforms.uCam.value.set(F.x, F.y, F.z); rainM.uniforms.uA.value = .36 * F.rain; rainM.uniforms.uFlash.value = fl; spM.uniforms.uCam.value.set(F.x, 0, F.z); spM.uniforms.uA.value = .55 * F.rain;
    // pontfény-készlet: a kamerához legközelebbi aktív források (4-szer másodpercenként rendezve)
    nSrc = 0;
    if (lampsOn) { add(-12, 2.35, -1, 7.5, 0xfff1dd, 4 * flick); if (S.well.in || Math.hypot(F.x - 8, F.z + 8) < 14) add(8, -.3, -11.3, 11, 0xeef4ff, 4.5); for (let i = 0; i < 3; i++) add(POLES[i][0], 4.6, POLES[i][1], 18, 0xffb46a, 34 * (1 - dawn * .7)); }
    if (alarm) { const a = t * 4; add(-12 + Math.cos(a) * 1.5, 3.1, -1 + Math.sin(a) * 1.5, 12, 0xff2010, 14); }
    if (S.gen.run) add(-19.6, 2, -19.6, 7, 0xffc080, 3); if (F.plcRun) add(-11, 1, 1.0, 2.6, 0x30ff70, 1.2);
    for (let i = nSrc; i < SRC.length; i++) SRC[i].on = false;
    if ((srcT -= F.dt) <= 0 || lastCam.distanceToSquared(cam.position) > 4) { srcT = .25; lastCam.copy(cam.position);
      for (let i = 0; i < SRC.length; i++) { const s = SRC[i]; s.d = s.on ? Math.hypot(s.x - F.x, s.y - F.y, s.z - F.z) - s.r * .5 : 1e9; } order.sort(byD); }
    for (let i = 0; i < pool.length; i++) { const s = order[i], l = pool[i]; if (s && s.on) { l.position.set(s.x, s.y, s.z); l.distance = s.r; l.color.copy(s.c); l.intensity = s.i; } else l.intensity = 0; }
    finish(F.hurt);
  }
  function finish(hurt = 0) { renderer.info.reset();
    if (composer) { finalP.uniforms.uT.value = U.time.value; finalP.uniforms.uD.value = cam.userData.dawn || 0; finalP.uniforms.uH.value = hurt; composer.render(); }
    else { renderer.autoClear = false; renderer.clear(); renderer.render(scene, cam); renderer.clearDepth(); renderer.render(hscene, hcam); renderer.autoClear = true; } }

  setQuality(qi);
  addEventListener('resize', applySize);
  return {
    renderer, scene, cam, setQuality, applySize, dynRes, frame,
    setRes(auto, user) { autoRes = auto; userRes = user; resScale = auto ? resScale : 1; applySize(); },
    setDawn(d) { cam.userData.dawn = d; },
    get quality() { return cur; }, get pixelRatio() { return pr; }, get resScale() { return autoRes ? resScale : userRes; },
    info() { const i = renderer.info; return { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures, progs: i.programs ? i.programs.length : 0 }; },
    // képernyő-koordináta egy világpontból (célpontjelölőhöz); visszaad: [x, y, előtte-e]
    project(x, y, z, out) { _v.set(x, y, z).project(cam); out[0] = (_v.x * .5 + .5) * W; out[1] = (-_v.y * .5 + .5) * H; out[2] = _v.z < 1 ? 1 : 0; return out; }
  };
}
