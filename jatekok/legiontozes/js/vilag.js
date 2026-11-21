/* A világ a terepen túl: égbolt és napszak, felhők, városok (low-poly épületcsoportok névfelirattal), Budapest (Duna, hidak,
   Parlament), Miskolc (Diósgyőri vár), repülőterek (pálya, hangár, torony, helipadok, HGWS víztöltő, kikötőárboc), vízfeliratok,
   a titkos ZERO felirat, termikek és szél. */
import * as THREE from 'three';
import { P, REPTEREK, VIZEK, NEVEZETES, ZERO_HELY, SZIN } from './config.js?v=202611212346';
import { ground, cls, hash2, townList, heightAt } from './geo.js?v=202611212346';

const MC = new Map(); const M = (c, o = {}) => { const k = c + JSON.stringify(o); if (!MC.has(k)) MC.set(k, new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o })); return MC.get(k); };
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
export function label(text, sub, color = '#fff', size = 1) {
  const t = canvasTex(512, 128, (x, w, h) => { x.font = '800 56px Inter, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 10; x.strokeStyle = 'rgba(0,0,0,.65)'; x.strokeText(text, w / 2, sub ? 48 : 64); x.fillStyle = color; x.fillText(text, w / 2, sub ? 48 : 64);
    if (sub) { x.font = '700 30px Inter, Arial'; x.strokeText(sub, w / 2, 100); x.fillStyle = '#cfe6ff'; x.fillText(sub, w / 2, 100); } });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, sizeAttenuation: false, depthTest: true, transparent: true, fog: false })); s.scale.set(.22 * size, .055 * size, 1); s.renderOrder = 5; return s; }

export function createWorld(scene, opt) {
  const W = new THREE.Group(); scene.add(W);
  /* ---- égbolt, fények, köd ---- */
  const hemi = new THREE.HemisphereLight(0xcfe7ff, 0x5b6b45, .9), sun = new THREE.DirectionalLight(0xfff1d8, 2.2); scene.add(hemi, sun, sun.target);
  sun.castShadow = false; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = sc.bottom = -120; sc.right = sc.top = 120; sc.near = 10; sc.far = 1200; sun.shadow.bias = -.0006;
  scene.fog = new THREE.Fog(0xbcd6ea, 2000, 40000);
  const skyU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 top, hor, sunDir, sunCol; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); float h = max(d.y, 0.); vec3 c = mix(hor, top, pow(h, .55)); if (d.y < 0.) c = hor * .82;
        float s = max(dot(d, sunDir), 0.); c += sunCol * (pow(s, 600.) * 2.5 + pow(s, 12.) * .25); gl_FragColor = vec4(c, 1.); }` }));
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  const stars = (() => { const n = 900, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, z = Math.random() * .95 + .05, r = Math.sqrt(1 - z * z); p.set([Math.cos(a) * r, z, Math.sin(a) * r], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const s = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, color: 0xffffff, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    s.frustumCulled = false; s.renderOrder = -9; scene.add(s); return s; })();
  let tod = 13, todSpeed = 0;
  const C1 = new THREE.Color(), C2 = new THREE.Color(), SUNV = new THREE.Vector3();
  function setTime(h) { tod = (h % 24 + 24) % 24; const a = (tod - 6) / 12 * Math.PI, el = Math.sin(a), az = (tod / 24) * Math.PI * 2 + Math.PI;
    SUNV.set(Math.cos(az) * Math.cos(Math.asin(Math.max(-1, Math.min(1, el)))), el, Math.sin(az) * .6).normalize(); skyU.sunDir.value.copy(SUNV);
    const day = THREE.MathUtils.smoothstep(el, -.12, .25), dusk = Math.max(0, 1 - Math.abs(el - .02) / .22) * (el > -.2 ? 1 : 0);
    C1.setHex(0x0b1324).lerp(C2.setHex(0x3f86d6), day); skyU.top.value.copy(C1);
    C1.setHex(0x1a2236).lerp(C2.setHex(0xbcd8ee), day).lerp(C2.setHex(0xf2a35e), dusk * .7); skyU.hor.value.copy(C1); scene.fog.color.copy(C1);
    skyU.sunCol.value.setHex(0xfff0d0).lerp(C2.setHex(0xff8a40), dusk).multiplyScalar(day > .05 ? 1 : 0);
    sun.intensity = 2.4 * day + .05; sun.color.setHex(0xfff1d8).lerp(C2.setHex(0xffa060), dusk); hemi.intensity = .25 + .75 * day; hemi.color.setHex(0x8ea6d8).lerp(C2.setHex(0xcfe7ff), day);
    stars.material.opacity = Math.max(0, 1 - day * 1.6); lampsOn = day < .35; }
  let lampsOn = false;

  /* ---- felhők: egyetlen instancolt, kamera felé forduló sík ---- */
  const cloudTex = canvasTex(128, 128, (x, w) => { const g = x.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.55, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  const CN = 420, cGeo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1)); const cOff = new Float32Array(CN * 4); cGeo.setAttribute('off', new THREE.InstancedBufferAttribute(cOff, 4)); cGeo.instanceCount = 0;
  const cU = { map: { value: cloudTex }, fogC: { value: scene.fog.color }, fogF: { value: 40000 }, lit: { value: 1 } };
  const clouds = new THREE.Mesh(cGeo, new THREE.ShaderMaterial({ uniforms: cU, transparent: true, depthWrite: false, fog: false,
    vertexShader: 'attribute vec4 off; varying vec2 vU; varying float vF; void main(){ vU = uv; vec4 mv = viewMatrix * vec4(off.xyz, 1.); mv.xy += position.xy * off.w; vF = clamp(-mv.z / 1., 0., 1e9); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform sampler2D map; uniform vec3 fogC; uniform float fogF, lit; varying vec2 vU; varying float vF; void main(){ vec4 t = texture2D(map, vU); float f = smoothstep(fogF * .45, fogF, vF); vec3 c = mix(vec3(lit), fogC, f * .8); gl_FragColor = vec4(c, t.a * .82 * (1. - f)); if (gl_FragColor.a < .01) discard; }' }));
  clouds.frustumCulled = false; clouds.renderOrder = 2; scene.add(clouds);
  let cloudCover = .5, cloudLast = [1e9, 1e9];
  function placeClouds(cx, cz) { const R = 36000, cell = 5200; let n = 0;
    for (let gz = Math.floor((cz - R) / cell); gz <= Math.floor((cz + R) / cell); gz++) for (let gx = Math.floor((cx - R) / cell); gx <= Math.floor((cx + R) / cell); gx++) {
      if (hash2(gx * 3 + 1, gz * 5 + 2) > cloudCover) continue; const x0 = (gx + hash2(gx, gz)) * cell, z0 = (gz + hash2(gz, gx)) * cell, y0 = 1500 + hash2(gx + 7, gz) * 900, parts = 3 + Math.floor(hash2(gz + 3, gx) * 5);
      for (let p = 0; p < parts && n < CN; p++) { const s = 500 + hash2(gx + p, gz - p) * 700; cOff.set([x0 + (hash2(p, gx) - .5) * 900, y0 + hash2(gz, p) * 160, z0 + (hash2(gz, p + 9) - .5) * 600, s], n * 4); n++; } }
    cGeo.instanceCount = n; cGeo.attributes.off.needsUpdate = true; cloudLast = [cx, cz]; }

  /* ---- városok ---- */
  const bGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0), rGeo = new THREE.ConeGeometry(.75, .6, 4).rotateY(Math.PI / 4).translate(0, .3, 0);
  const bMat = new THREE.MeshLambertMaterial({ flatShading: true }), rMat = new THREE.MeshLambertMaterial({ flatShading: true });
  const towns = [], tMat = new THREE.Matrix4(), tQ = new THREE.Quaternion(), tS = new THREE.Vector3(), tP = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), tCol = new THREE.Color();
  const WALL = [0xe9e2d2, 0xd8cfbd, 0xf1ecde, 0xcfc6b8, 0xe2d6bf, 0xbfc3c6], ROOF = [0xa4523a, 0x8f4433, 0xb3643f, 0x6d6a66, 0x7b3b2c];
  for (const [n, x, z, pop] of townList()) if (pop >= 2.5) towns.push({ n, x, z, pop, r: 300 + Math.sqrt(pop) * 140, g: null, lab: null });
  function buildTown(t) { const big = t.pop > 100, cnt = Math.min(1400, Math.round(40 + t.pop * (big ? 3 : 5))), bm = new THREE.InstancedMesh(bGeo, bMat, cnt), rm = new THREE.InstancedMesh(rGeo, rMat, cnt); let k = 0;
    for (let i = 0; i < cnt * 3 && k < cnt; i++) { const a = hash2(i, t.x | 0) * 6.283, d = Math.pow(hash2(t.z | 0, i), .75) * t.r, x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d, c = cls(x, z);
      if (c === 3 || c === 4 || nearRunway(x, z)) continue; const core = 1 - d / t.r, tall = big && core > .55 ? 14 + hash2(i, 3) * 26 : 5 + hash2(i, 5) * (big ? 10 : 5) + core * 5;
      const w = 8 + hash2(i, 7) * (big && core > .4 ? 26 : 10), l = 8 + hash2(i, 8) * 14, h = ground(x, z);
      tQ.setFromAxisAngle(Y, Math.round(hash2(i, 9) * 4) * Math.PI / 2 + a * .15); tS.set(w, tall, l); tP.set(x - t.x, h - 2, z - t.z); tMat.compose(tP, tQ, tS); bm.setMatrixAt(k, tMat);
      tCol.setHex(WALL[Math.floor(hash2(i, 11) * WALL.length)]); bm.setColorAt(k, tCol);
      const flat = big && core > .55; tS.set(w, flat ? .01 : Math.min(w, l) * .9, l); tP.y = h - 2 + tall; tMat.compose(tP, tQ, tS); rm.setMatrixAt(k, tMat); tCol.setHex(ROOF[Math.floor(hash2(i, 13) * ROOF.length)]); rm.setColorAt(k, tCol); k++; }
    bm.count = rm.count = k; const g = new THREE.Group(); g.position.set(t.x, 0, t.z); g.add(bm, rm); bm.computeBoundingSphere(); rm.computeBoundingSphere(); W.add(g); t.g = g; }
  function nearRunway(x, z) { for (const r of REPTEREK) { const dx = x - r.x, dz = z - r.z; if (Math.abs(dx) < 2500 && Math.abs(dz) < 2500) { const a = dx * r.dx + dz * r.dz, b = -dx * r.dz + dz * r.dx; if (Math.abs(a) < r.len / 2 + 500 && Math.abs(b) < r.wid / 2 + 350) return true; } } return false; }
  const fixList = []; const fix = (o, x, z, off) => { o.userData.fy = [x, z, off]; fixList.push(o); };
  const labels = []; function addLabel(s, x, y, z, maxD, minD = 0) { s.position.set(x, y, z); s.userData = { maxD, minD }; W.add(s); labels.push(s); return s; }
  for (const t of towns) if (t.pop >= 18) addLabel(label(t.n), t.x, ground(t.x, t.z) + 160 + Math.sqrt(t.pop) * 8, t.z, t.pop > 90 ? 90000 : 38000);
  for (const [n, lon, lat] of VIZEK) { const [x, z] = P(lon, lat); addLabel(label(n, null, '#9fdcff'), x, heightAt(x, z) + 140, z, 60000); }

  /* ---- nevezetességek ---- */
  function parlament() { const [lon, lat] = NEVEZETES.parlament, [x, z] = P(lon, lat), g = new THREE.Group(), h = ground(x, z), w = M(0xe9e1cf), r = M(0x8b2f25), gr = M(0x5c7c68);
    // a Duna-parton, É–D irányban hosszan
    const add = (geo, m, px, py, pz) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); g.add(o); return o; };
    add(new THREE.BoxGeometry(34, 22, 260), w, 0, 11, 0); add(new THREE.BoxGeometry(70, 18, 120), w, -30, 9, 0); add(new THREE.BoxGeometry(36, 6, 262).translate(0, 25, 0), r, 0, 0, 0);
    add(new THREE.CylinderGeometry(20, 24, 26, 12), w, -10, 34, 0); add(new THREE.SphereGeometry(20, 12, 8, 0, 6.283, 0, Math.PI / 2), gr, -10, 47, 0); add(new THREE.ConeGeometry(4, 30, 8), gr, -10, 80, 0);
    for (const s of [-1, 1]) for (const k of [40, 95]) { add(new THREE.BoxGeometry(8, 40, 8), w, 10, 20, s * k); add(new THREE.ConeGeometry(5.5, 20, 4), r, 10, 50, s * k); }
    g.position.set(x, h - 1, z); g.rotation.y = .12; W.add(g); fix(g, x, z, -1); addLabel(label('Parlament', 'Budapest', '#ffe29a', .8), x, h + 130, z, 9000); }
  function hidak() { const m = M(0x4c5660), t = M(0x8a8f96);
    for (const [, , aLon, aLat, bLon, bLat] of NEVEZETES.hidak.map(b => [b[0], b[1], b[2], b[3], b[4], b[5]])) { const [ax, az] = P(aLon, aLat), [bx, bz] = P(bLon, bLat), mx = (ax + bx) / 2, mz = (az + bz) / 2, len = Math.hypot(bx - ax, bz - az) + 60, w = Math.min(ground(ax, az), ground(bx, bz)) + 14;
      const g = new THREE.Group(); g.position.set(mx, 0, mz); g.rotation.y = -Math.atan2(bz - az, bx - ax);
      const d = new THREE.Mesh(new THREE.BoxGeometry(len, 2, 22), m); d.position.y = w; g.add(d);
      for (const s of [-.28, .28]) { const p = new THREE.Mesh(new THREE.BoxGeometry(8, 46, 26), t); p.position.set(s * len, w + 12, 0); g.add(p); const p2 = new THREE.Mesh(new THREE.BoxGeometry(10, 30, 14), t); p2.position.set(s * len, w - 18, 0); g.add(p2); }
      W.add(g); } }
  function diosgyor() { const [lon, lat] = NEVEZETES.diosgyor, [x, z] = P(lon, lat), h = ground(x, z), g = new THREE.Group(), s = M(0xb9ac93), r = M(0x7f4a33);
    const add = (geo, m, px, py, pz) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); g.add(o); };
    add(new THREE.BoxGeometry(60, 18, 60), s, 0, 9, 0); add(new THREE.BoxGeometry(44, 4, 44), M(0x6f7b55), 0, 18.5, 0);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { add(new THREE.BoxGeometry(14, 30, 14), s, a * 30, 15, b * 30); add(new THREE.ConeGeometry(10.5, 10, 4).rotateY(Math.PI / 4), r, a * 30, 35, b * 30); }
    add(new THREE.BoxGeometry(80, 5, 80), M(0x58704a), 0, 1, 0); g.position.set(x, h - 2, z); W.add(g); fix(g, x, z, -2); addLabel(label('Diósgyőri vár', 'Miskolc', '#ffe29a', .8), x, h + 90, z, 9000); }

  /* ---- repülőterek ---- */
  const runTex = canvasTex(64, 512, (x, w, h) => { x.fillStyle = '#3c3f43'; x.fillRect(0, 0, w, h); x.fillStyle = '#e8e8e8'; for (let y = 40; y < h - 40; y += 34) x.fillRect(w / 2 - 1.5, y, 3, 18); x.fillRect(3, 0, 2, h); x.fillRect(w - 5, 0, 2, h);
    for (let i = 0; i < 6; i++) { x.fillRect(8 + i * 8, 6, 4, 26); x.fillRect(8 + i * 8, h - 32, 4, 26); } });
  const grassTex = canvasTex(64, 256, (x, w, h) => { x.fillStyle = '#6d9a45'; x.fillRect(0, 0, w, h); x.fillStyle = '#7aa84f'; for (let y = 0; y < h; y += 32) x.fillRect(0, y, w, 16); x.fillStyle = '#f2f2f2'; for (let y = 0; y < h; y += 64) { x.fillRect(0, y, 4, 10); x.fillRect(w - 4, y, 4, 10); } });
  const hgwsTex = canvasTex(1024, 128, (x, w, h) => { x.fillStyle = '#2f9e4f'; x.fillRect(0, 0, w, h); x.fillStyle = '#f2c230'; x.fillRect(0, h - 18, w, 18); x.fillStyle = '#fff'; x.font = '900 60px Inter, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('HALÁSZ GERGELY WATERING SOLUTIONS', w / 2, 56); });
  const logoTex = canvasTex(256, 256, (x, w) => { x.fillStyle = '#f2c230'; x.fillRect(0, 0, w, w); x.fillStyle = '#2aa7d9'; x.beginPath(); x.arc(128, 100, 70, 0, 6.3); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(128, 40); x.quadraticCurveTo(178, 110, 128, 150); x.quadraticCurveTo(78, 110, 128, 40); x.fill(); x.fillStyle = '#15181c'; x.font = '900 64px Inter, Arial'; x.textAlign = 'center'; x.fillText('HGWS', 128, 225); });
  const helTex = canvasTex(256, 256, (x, w) => { x.fillStyle = '#3c3f43'; x.fillRect(0, 0, w, w); x.strokeStyle = '#f2c230'; x.lineWidth = 12; x.beginPath(); x.arc(128, 128, 110, 0, 6.3); x.stroke(); x.fillStyle = '#fff'; x.font = '900 150px Inter, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('H', 128, 136); });
  const stations = [], masts = [], pads = [];
  function airport(r) { const g = new THREE.Group(), e = r.elev; g.position.set(r.x, 0, r.z); g.rotation.y = -r.hdg * Math.PI / 180; W.add(g);
    const toW = (lx, lz) => { const th = -r.hdg * Math.PI / 180; return [r.x + lx * Math.cos(th) + lz * Math.sin(th), r.z - lx * Math.sin(th) + lz * Math.cos(th)]; };
    const add = (geo, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; g.add(o); return o; };
    // a csoport helyi tengelyei: −Z a pálya iránya (hdg), +X jobbra
    if (r.tip === 'beton' || r.tip === 'fu') { const t = (r.tip === 'beton' ? runTex : grassTex).clone(); t.needsUpdate = true; t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, Math.max(1, r.len / 600));
      add(new THREE.BoxGeometry(r.wid, .6, r.len), new THREE.MeshLambertMaterial({ map: t }), 0, e + .05, 0);
      if (r.tip === 'beton') { add(new THREE.BoxGeometry(18, .5, r.len * .7), M(0x4a4d52), r.wid / 2 + 60, e, 0); add(new THREE.BoxGeometry(260, .5, 160), M(0x50545a), r.wid / 2 + 190, e, -r.len * .12); } }
    if (r.tip === 'viz') { for (let i = -4; i <= 4; i++) for (const s of [-1, 1]) add(new THREE.SphereGeometry(1.4, 6, 4), M(SZIN.sarga, { emissive: 0x403000 }), s * r.wid / 2, e + .6, i * r.len / 9);
      add(new THREE.BoxGeometry(12, 2, 50), M(0x8a6a48), r.wid / 2 + 30, e + .6, 0); }
    const side = r.tip === 'heli' ? 0 : r.wid / 2 + 150;
    if (r.heli || r.tip === 'heli') for (let i = 0; i < (r.fo ? 3 : 1); i++) { const p = add(new THREE.CylinderGeometry(15, 15, .8, 24), new THREE.MeshLambertMaterial({ map: helTex }), side + (r.tip === 'heli' ? 0 : 80), e + .3, (r.tip === 'heli' ? 0 : r.len * .2) + i * 45); p.rotation.y = 0; const [px, pz] = toW(p.position.x, p.position.z); pads.push({ r, x: px, z: pz }); }
    if (r.allomas) { // HGWS víztöltő: víztorony + tömlő
      const tx = r.tip === 'heli' ? 40 : side + 40, tz = r.tip === 'heli' ? 30 : -r.len * .05; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(new THREE.BoxGeometry(.8, 18, .8), M(SZIN.fem), tx + a * 4, e + 9, tz + b * 4);
      add(new THREE.CylinderGeometry(7, 7, 9, 14), [new THREE.MeshLambertMaterial({ map: logoTex }), M(SZIN.zold), M(SZIN.zold)], tx, e + 22, tz); const [sx, sz] = toW(tx, tz); r.station = { x: sx, z: sz };
      add(new THREE.ConeGeometry(7.4, 3, 14), M(SZIN.zold), tx, e + 28, tz); stations.push(r); }
    if (r.tip === 'beton' || r.fo) { add(new THREE.BoxGeometry(9, 28, 9), M(0xdedad2), side + 220, e + 14, r.len * .1); add(new THREE.BoxGeometry(14, 6, 14), M(0x1b3a4e, { emissive: 0x0a1a24 }), side + 220, e + 31, r.len * .1); }
    if (r.fo) { // a HGWS főbázis nagy hangárja
      const hg = new THREE.Group(); hg.position.set(side + 150, e, -r.len * .18); g.add(hg); const hm = M(0xd9dde2);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(42, 42, 120, 20, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), M(0xc8ccd2, { side: THREE.DoubleSide })); body.position.y = 0; hg.add(body);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(124, 22, 2), hm); wall.position.set(0, 11, 60); hg.add(wall);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(110, 13.75), new THREE.MeshLambertMaterial({ map: hgwsTex })); sign.position.set(0, 30, -60.6); sign.rotation.y = Math.PI; hg.add(sign);
      const sign2 = sign.clone(); sign2.position.z = 61.2; sign2.rotation.y = 0; hg.add(sign2);
      const door = new THREE.Mesh(new THREE.BoxGeometry(84, 26, 1), M(0x55606b)); door.position.set(0, 13, -60.2); hg.add(door);
      for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(40, 9, 22), M([SZIN.sarga, SZIN.zold, SZIN.feher][i])); b.position.set(-130 + i * 44, 4.5, -20); hg.add(b); }
      g.userData.hangar = hg; }
    if (r.arboc) { const mx = r.wid / 2 + 120, mz = r.len * .32; add(new THREE.CylinderGeometry(1, 2.5, 30, 8), M(SZIN.zold), mx, e + 15, mz); add(new THREE.SphereGeometry(2.2, 8, 6), M(SZIN.sarga), mx, e + 31, mz); const [wx, wz] = toW(mx, mz); masts.push({ r, x: wx, z: wz, y: e + 31 }); r.mast = { x: wx, z: wz }; }
    addLabel(label(r.nev, r.tip === 'viz' ? 'vízi leszálló' : r.tip === 'heli' ? 'helipad' : r.tip === 'fu' ? 'füves pálya' : 'repülőtér', '#ffe29a', .85), r.x, e + 70, r.z, 26000, 400);
    r.group = g; }

  /* ---- a titkos ZERO felirat: egy szántóföld mintázata ---- */
  function zero() { const [x, z] = ZERO_HELY, W2 = 2400, H2 = 1000, t = canvasTex(1024, 432, (c, w, h) => { c.fillStyle = '#8a6a48'; c.fillRect(0, 0, w, h); c.fillStyle = '#93704c'; for (let i = 0; i < w; i += 24) c.fillRect(i, 0, 10, h);
      c.fillStyle = '#4f8f3a'; c.font = '900 380px Inter, Arial Black, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ZERO', w / 2, h / 2 + 20); });
    const geo = new THREE.PlaneGeometry(W2, H2, 40, 18).rotateX(-Math.PI / 2), p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, ground(x + p.getX(i), z + p.getZ(i)) + 1.2); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: t, polygonOffset: true, polygonOffsetFactor: -4 })); m.position.set(x, 0, z); W.add(m);
    m.userData.redrape = () => { const p2 = m.geometry.attributes.position; for (let i = 0; i < p2.count; i++) p2.setY(i, ground(x + p2.getX(i), z + p2.getZ(i)) + 1.2); p2.needsUpdate = true; m.geometry.computeVertexNormals(); }; return m; }

  /* ---- szél és termikek ---- */
  let windSpd = 4, windDir = .6, gustT = 0; const WV = new THREE.Vector3();
  function wind(pos, gep, t = gustT) { const s = windSpd * (1 + .25 * Math.sin(t * .7 + pos.x * .0007) + .15 * Math.sin(t * 2.3 + pos.z * .001));
    const light = gep ? Math.min(2.2, Math.max(.6, Math.sqrt(3000 / gep.tomeg))) : 1, gust = (Math.sin(t * 3.1 + pos.z * .01) * .5) * windSpd * .15 * light;
    WV.set(Math.sin(windDir) * (s + gust), thermal(pos.x, pos.z, pos.y), Math.cos(windDir) * (s + gust)); return WV; }
  function thermal(x, z, y) { if (y > 2400) return 0; const cell = 2600, gx = Math.floor(x / cell), gz = Math.floor(z / cell); let up = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const cx = gx + a, cz = gz + b; if (hash2(cx * 7, cz * 3) > .55) continue;
      const tx = (cx + .2 + hash2(cx, cz) * .6) * cell, tz = (cz + .2 + hash2(cz, cx) * .6) * cell, d = Math.hypot(x - tx, z - tz), r = 260 + hash2(cx + 1, cz) * 200; if (d < r * 1.6) { const c = cls(tx, tz), k = c === 0 ? 1 : c === 2 ? 1.2 : .5; up += (2 + hash2(cz, cx + 5) * 2.5) * k * Math.exp(-(d * d) / (r * r)) - (d > r ? .4 : 0); } }
    // lejtőn fellökődő szél
    const gh = ground(x, z), sx = ground(x + 60, z) - ground(x - 60, z), sz = ground(x, z + 60) - ground(x, z - 60), agl = y - gh;
    if (agl < 400) up += Math.max(0, (Math.sin(windDir) * sx + Math.cos(windDir) * sz) / 120) * windSpd * .9 * (1 - agl / 400);
    return up * (1 - Math.max(0, (y - 1800) / 600)); }

  // építés
  REPTEREK.forEach(airport); parlament(); hidak(); diosgyor(); const zeroMesh = zero();
  setTime(tod);
  return {
    W, sun, hemi, sky, stations, masts, pads, wind, thermal, labels, towns,
    setTime, get tod() { return tod; }, setTimeSpeed(v) { todSpeed = v; }, setWind(s, d) { windSpd = s; if (d !== undefined) windDir = d; }, get windDir() { return windDir; }, get windSpd() { return windSpd; },
    setClouds(c) { cloudCover = c; cloudLast = [1e9, 1e9]; },
    setShadows(on) { sun.castShadow = on; },
    update(cam, dt, far) { gustT += dt; if (todSpeed) setTime(tod + dt * todSpeed / 3600);
      sky.position.copy(cam.position); sky.scale.setScalar(far * .92); stars.position.copy(cam.position); stars.scale.setScalar(far * .9);
      sun.position.copy(cam.position).addScaledVector(SUNV, 600); sun.target.position.copy(cam.position);
      cU.fogF.value = scene.fog.far; cU.lit.value = .45 + .55 * Math.max(0, Math.min(1, SUNV.y * 3 + .3));
      if (Math.hypot(cam.position.x - cloudLast[0], cam.position.z - cloudLast[1]) > 3000) placeClouds(cam.position.x, cam.position.z);
      const p = cam.position;
      for (const t of towns) { const d = Math.hypot(p.x - t.x, p.z - t.z) - t.r; if (d < 24000 && !t.g) buildTown(t); else if (t.g) { t.g.visible = d < 34000; if (d > 45000) { W.remove(t.g); t.g.children.forEach(m => m.dispose()); t.g = null; } } }
      for (const s of labels) { const d = s.position.distanceTo(p); s.visible = d < s.userData.maxD && d > s.userData.minD; }
      zeroMesh.visible = Math.hypot(p.x - ZERO_HELY[0], p.z - ZERO_HELY[1]) < 60000; },
    fixGround(bd) { for (const o of fixList) { const [x, z, off] = o.userData.fy; if (x > bd[0] - 100 && x < bd[2] + 100 && z > bd[1] - 100 && z < bd[3] + 100) o.position.y = ground(x, z) + off; }
      if (ZERO_HELY[0] > bd[0] - 1500 && ZERO_HELY[0] < bd[2] + 1500 && ZERO_HELY[1] > bd[1] - 1500 && ZERO_HELY[1] < bd[3] + 1500) zeroMesh.userData.redrape(); },
    rebuildTowns(b) { for (const t of towns) if (t.g && t.x + t.r > b[0] && t.x - t.r < b[2] && t.z + t.r > b[1] && t.z - t.r < b[3]) { W.remove(t.g); t.g = null; } },
  };
}
