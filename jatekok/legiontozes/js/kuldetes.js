/* Játékmódok: öntözés (kiszáradt mezők), tűzoltás (terjedő tűz), precíziós kihívás (apró célok), gyorsasági verseny (vízikarikák).
   Minden mód ugyanazt az interfészt adja: update(dt, b), hit(x, z, liter), target() → [x, y, z] | null, status(), finish(landing) → eredmény. */
import * as THREE from 'three';
import { P, REPTER, SZIN } from './config.js?v=202611222133';
import { ground, cls, hash2, isWater } from './geo.js?v=202611222133';
import { LOGV_PARS, LOGV, LOGF_PARS, LOGF } from './kozos.js?v=202611222133';

const CELL = 8;   // a mezők nedvességrácsa (m)
function canvasTex(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; return [c, c.getContext('2d', { willReadFrequently: true }), t]; }
function drape(x, z, w, l, a, segW, segL, lift = .8) { const geo = new THREE.PlaneGeometry(w, l, segW, segL).rotateX(-Math.PI / 2), p = geo.attributes.position, ca = Math.cos(a), sa = Math.sin(a);
  for (let i = 0; i < p.count; i++) { const lx = p.getX(i), lz = p.getZ(i), rx = lx * ca + lz * sa, rz = -lx * sa + lz * ca; p.setX(i, rx); p.setZ(i, rz); p.setY(i, ground(x + rx, z + rz) + lift); } geo.computeVertexNormals(); return geo; }

export function createMission(def, scene, gep, rnd = Math.random) {
  const G = new THREE.Group(); scene.add(G); const st = { def, mode: def.mod, t: 0, limit: def.ido || 0, used: 0, onTarget: 0, pen: 0, msgs: [], done: false, allDone: false, score: 0, houseHits: 0 };
  const [cx, cz] = def.lon ? P(def.lon, def.lat) : [0, 0]; const say = (t, k = 'info') => st.msgs.push([t, k]);
  let api = null;

  /* ---------- öntözés ---------- */
  if (def.mod === 'ontozes') { const fields = [], houses = [];
    const fw = def.nagy ? 420 : def.kicsi ? 130 : 260, fl = def.nagy ? 260 : def.kicsi ? 90 : 160;
    for (let tries = 0; fields.length < def.mezok && tries < 900; tries++) { const ang = rnd() * 6.283, d = 600 + rnd() * (def.nagy ? 6500 : 4200), x = cx + Math.cos(ang) * d, z = cz + Math.sin(ang) * d;
      if (cls(x, z) !== 0 || cls(x + 200, z) !== 0 || cls(x - 200, z + 150) !== 0) continue; const h0 = ground(x, z); if (Math.abs(ground(x + 120, z) - h0) > 9 || Math.abs(ground(x, z + 120) - h0) > 9) continue;
      if (fields.some(f => Math.hypot(f.x - x, f.z - z) < 650)) continue; const r = REPTER[def.repter]; if (r && Math.hypot(r.x - x, r.z - z) < 1400) continue;
      const w = fw * (.8 + rnd() * .45), l = fl * (.8 + rnd() * .45), a = rnd() * Math.PI, nx = Math.ceil(w / CELL), nz = Math.ceil(l / CELL);
      const [c, x2, tex] = canvasTex(nx, nz); x2.fillStyle = '#8f6a3c'; x2.fillRect(0, 0, nx, nz); x2.fillStyle = '#7d5c34'; for (let i = 0; i < nz; i += 3) x2.fillRect(0, i, nx, 1);
      const segW = Math.max(2, Math.round(w / 40)), segL = Math.max(2, Math.round(l / 40)), mesh = new THREE.Mesh(drape(x, z, w, l, a, segW, segL), new THREE.MeshLambertMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -3 })); mesh.position.set(x, 0, z); mesh.userData.dr = [x, z, w, l, a, segW, segL]; G.add(mesh);
      // a mező széle: sárga karók a sarkokon
      const ca = Math.cos(a), sa = Math.sin(a); for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const wx = x + px * w / 2 * ca + pz * l / 2 * sa, wz = z - px * w / 2 * sa + pz * l / 2 * ca; const s = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, 9, 6), new THREE.MeshLambertMaterial({ color: SZIN.sarga, emissive: 0x403000 })); s.position.set(wx, ground(wx, wz) + 4.5, wz); s.userData.gy = [wx, wz, 4.5]; G.add(s); }
      fields.push({ x, z, w, l, a, ca, sa, nx, nz, wet: new Float32Array(nx * nz), c, x2, tex, wetN: 0, dirty: false });
      // házak a mező mellett (rájuk nem szabad vizet önteni)
      for (let k = 0; k < (def.haz / def.mezok) + rnd(); k++) { const side = rnd() < .5 ? -1 : 1, off = (w / 2 + 40 + rnd() * 50) * side, along = (rnd() - .5) * l, hx = x + off * ca + along * sa, hz = z - off * sa + along * ca;
        if (cls(hx, hz) === 3) continue; const hg = new THREE.Group(); hg.position.set(hx, ground(hx, hz), hz); hg.rotation.y = rnd() * 3;
        const wall = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 8).translate(0, 2.5, 0), new THREE.MeshLambertMaterial({ color: 0xf1ecde, flatShading: true })); const roof = new THREE.Mesh(new THREE.ConeGeometry(7.5, 4, 4).rotateY(Math.PI / 4).translate(0, 7, 0).scale(1, 1, .82), new THREE.MeshLambertMaterial({ color: 0xa4523a, flatShading: true }));
        hg.add(wall, roof); hg.userData.gy = [hx, hz, 0]; G.add(hg); houses.push({ x: hx, z: hz, t: -99 }); } }
    const total = fields.reduce((s, f) => s + f.nx * f.nz, 0), NEED = .012 * CELL * CELL;   // liter / cella a teljes zöldhöz
    function local(f, x, z) { const dx = x - f.x, dz = z - f.z; return [dx * f.ca - dz * f.sa, dx * f.sa + dz * f.ca]; }
    api = {
      hit(x, z, v, r) { let on = false;
        for (const f of fields) { const [lx, lz] = local(f, x, z); if (Math.abs(lx) > f.w / 2 + r || Math.abs(lz) > f.l / 2 + r) continue;
          const i0 = Math.max(0, Math.floor((lx - r + f.w / 2) / CELL)), i1 = Math.min(f.nx - 1, Math.floor((lx + r + f.w / 2) / CELL)), j0 = Math.max(0, Math.floor((lz - r + f.l / 2) / CELL)), j1 = Math.min(f.nz - 1, Math.floor((lz + r + f.l / 2) / CELL));
          const cells = Math.max(1, (i1 - i0 + 1) * (j1 - j0 + 1)), per = v / cells / NEED;
          for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const k = j * f.nx + i, o = f.wet[k]; if (o >= 1) continue; const nv = Math.min(1, o + per); f.wet[k] = nv; if (nv >= .999 && o < .999) f.wetN++; f.dirty = true; } on = true; }
        if (on) st.onTarget += v;
        for (const h of houses) if (Math.hypot(h.x - x, h.z - z) < 16 + r * .5 && st.t - h.t > 6) { h.t = st.t; st.pen += 150; st.houseHits++; say(['Panasz érkezett a polgármestertől!', 'Elázott a szomszéd ruhája a kötélen!', 'A kutya nagyon nem örült a zuhanynak!', 'Bácsi a kapuban: „Ezt nem rendeltem!”'][st.houseHits % 4], 'bad'); } },
      update() { for (const f of fields) if (f.dirty) { f.dirty = false; const id = f.x2.getImageData(0, 0, f.nx, f.nz), d = id.data;
          for (let k = 0; k < f.wet.length; k++) { const w = f.wet[k]; if (w <= 0) continue; const j = Math.floor(k / f.nx), stripe = j % 3 === 0 ? .9 : 1; d[k * 4] = (143 + (76 - 143) * w) * stripe; d[k * 4 + 1] = (106 + (158 - 106) * w) * stripe; d[k * 4 + 2] = (60 + (58 - 60) * w) * stripe; }
          f.x2.putImageData(id, 0, 0); f.tex.needsUpdate = true; }
        const wet = fields.reduce((s, f) => s + f.wetN, 0); st.frac = wet / total; if (!st.allDone && st.frac > .95) { st.allDone = true; say('Minden mező megöntözve! Szállj le egy reptéren a bónuszért.', 'ok'); } },
      target(b) { let best = null, bd = 1e18; for (const f of fields) { if (f.wetN / (f.nx * f.nz) > .95) continue; const d = Math.hypot(f.x - b.pos.x, f.z - b.pos.z); if (d < bd) { bd = d; best = f; } } return best ? [best.x, ground(best.x, best.z) + 20, best.z] : null; },
      marks: () => fields.map(f => [f.x, f.z, f.wetN / (f.nx * f.nz) > .95 ? 'ok' : 'cel']),
      progress: () => `${Math.round((st.frac || 0) * 100)}% megöntözve`, fields, houses };
  }

  /* ---------- tűzoltás ---------- */
  if (def.mod === 'tuz') { const FC = 40, R = 32, N = R * 2, grid = new Float32Array(N * N), state = new Uint8Array(N * N), water = new Float32Array(N * N); // 0 ép, 1 ég, 2 leégett, 3 eloltva
    const x0 = cx - R * FC, z0 = cz - R * FC, ok = new Uint8Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = x0 + (i + .5) * FC, z = z0 + (j + .5) * FC, c = cls(x, z); ok[j * N + i] = c === 1 || c === 0 ? 1 : 0; }
    for (let k = 0, n = 0; n < def.tuz && k < 5000; k++) { const i = R + Math.round((rnd() - .5) * 18), j = R + Math.round((rnd() - .5) * 18), id = j * N + i; if (!ok[id] || state[id]) continue; state[id] = 1; grid[id] = .5 + rnd() * .5; n++; }
    const MAXF = 1600, fp = new Float32Array(MAXF * 3), fs = new Float32Array(MAXF), fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3)); fg.setAttribute('sz', new THREE.BufferAttribute(fs, 1));
    const fu = { t: { value: 0 } };
    const flames = new THREE.Points(fg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: fu,
      vertexShader: LOGV_PARS + 'attribute float sz; uniform float t; varying float vS; void main(){ vec3 p = position; float ph = fract(sin(dot(p.xz, vec2(12.9, 78.2))) * 43758.); p.y += sz * (.3 + .3 * sin(t * 6. + ph * 30.)); vec4 mv = modelViewMatrix * vec4(p, 1.); vS = sz; gl_PointSize = clamp(sz * 900. / -mv.z, 0., 140.); gl_Position = projectionMatrix * mv; ' + LOGV + '}',
      fragmentShader: LOGF_PARS + 'varying float vS; void main(){ ' + LOGF + ' vec2 d = gl_PointCoord - .5; float r = length(d) * 2.; if (r > 1. || vS <= 0.) discard; vec3 c = mix(vec3(1., .85, .3), vec3(1., .25, .05), r) * 2.2; gl_FragColor = vec4(c, (1. - r) * .9); }' }));
    flames.frustumCulled = false; G.add(flames);
    const sp = new Float32Array(MAXF * 3), ss = new Float32Array(MAXF), sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('sz', new THREE.BufferAttribute(ss, 1));
    const smoke = new THREE.Points(sg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: fu,
      vertexShader: LOGV_PARS + 'attribute float sz; uniform float t; varying float vA; void main(){ vec3 p = position; float ph = fract(sin(dot(p.xz, vec2(4.1, 7.7))) * 9137.); float k = fract(t * .08 + ph); p.y += k * 420.; p.x += k * 140.; vec4 mv = modelViewMatrix * vec4(p, 1.); vA = (1. - k) * step(.01, sz); gl_PointSize = clamp((60. + k * 260.) * sz * 700. / -mv.z, 0., 400.); gl_Position = projectionMatrix * mv; ' + LOGV + '}',
      fragmentShader: LOGF_PARS + 'varying float vA; void main(){ ' + LOGF + ' vec2 d = gl_PointCoord - .5; float r = length(d) * 2.; if (r > 1.) discard; gl_FragColor = vec4(vec3(.32, .3, .28), (1. - r) * .35 * vA); }' }));
    smoke.frustumCulled = false; G.add(smoke);
    const burnt = new THREE.InstancedMesh(new THREE.PlaneGeometry(FC, FC).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1d1a17, transparent: true, opacity: .75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -5 }), N * N); burnt.count = 0; burnt.frustumCulled = false; G.add(burnt);
    let spreadT = 0, burntN = 0, lastBurnt = 0; const BM = new THREE.Matrix4(); const initial = def.tuz;
    const windVec = def.windDir !== undefined ? def.windDir : .8;
    api = {
      hit(x, z, v, r) { const i0 = Math.floor((x - r - x0) / FC), i1 = Math.floor((x + r - x0) / FC), j0 = Math.floor((z - r - z0) / FC), j1 = Math.floor((z + r - z0) / FC); let on = false;
        for (let j = Math.max(0, j0); j <= Math.min(N - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(N - 1, i1); i++) { const id = j * N + i; water[id] += v / ((i1 - i0 + 1) * (j1 - j0 + 1));
          if (state[id] === 1) { on = true; grid[id] -= v / ((i1 - i0 + 1) * (j1 - j0 + 1)) / 140; if (grid[id] <= 0) { state[id] = 3; st.out = (st.out || 0) + 1; } } }
        if (on) st.onTarget += v; },
      update(dt, b, wind) { spreadT += dt; fu.t.value += dt;
        if (spreadT > 1.4) { spreadT = 0; const wx = wind ? wind.x : 0, wz = wind ? wind.z : 0, ws = Math.hypot(wx, wz) + .01;
          for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) { const id = j * N + i; if (state[id] !== 1) continue; grid[id] += .02;
            if (grid[id] > 2.2) { state[id] = 2; burntN++; continue; }
            for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n2 = (j + dj) * N + i + di; if (state[n2] || !ok[n2] || water[n2] > 25) continue; const down = (di * wx + dj * wz) / ws; if (rnd() < .018 + Math.max(0, down) * .06 * Math.min(2, ws / 6)) { state[n2] = 1; grid[n2] = .35; } } }
          if (burntN !== lastBurnt) { burnt.count = 0; for (let id = 0; id < N * N; id++) if (state[id] === 2) { const i = id % N, j = (id / N) | 0, x = x0 + (i + .5) * FC, z = z0 + (j + .5) * FC; BM.makeTranslation(x, ground(x, z) + .6, z); burnt.setMatrixAt(burnt.count++, BM); } burnt.instanceMatrix.needsUpdate = true; lastBurnt = burntN; }
          let k = 0, s = 0, burning = 0; for (let id = 0; id < N * N; id++) { if (state[id] !== 1) continue; burning++; const i = id % N, j = (id / N) | 0, x = x0 + (i + .5) * FC, z = z0 + (j + .5) * FC, h = ground(x, z);
            if (k < MAXF) { fp[k * 3] = x; fp[k * 3 + 1] = h + 6; fp[k * 3 + 2] = z; fs[k] = Math.min(2.5, .6 + grid[id]) * 10; k++; } if (s < MAXF && (i + j) % 2 === 0) { sp[s * 3] = x; sp[s * 3 + 1] = h + 20; sp[s * 3 + 2] = z; ss[s] = 1; s++; } }
          fs.fill(0, k); ss.fill(0, s); fg.attributes.position.needsUpdate = fg.attributes.sz.needsUpdate = true; sg.attributes.position.needsUpdate = sg.attributes.sz.needsUpdate = true;
          st.burning = burning; st.burnt = burntN;
          if (!st.allDone && burning === 0) { st.allDone = true; say('A tűz eloltva! Szállj le egy reptéren a bónuszért.', 'ok'); }
          if (burntN > initial * 22 && !st.done) { st.lost = true; say('A tűz túl nagyra nőtt…', 'bad'); } } },
      target(b) { let best = null, bd = 1e18; for (let id = 0; id < N * N; id++) if (state[id] === 1) { const i = id % N, j = (id / N) | 0, x = x0 + (i + .5) * FC, z = z0 + (j + .5) * FC, d = Math.hypot(x - b.pos.x, z - b.pos.z); if (d < bd) { bd = d; best = [x, ground(x, z) + 30, z]; } } return best; },
      smokeAt(p) { let near = 0; for (let id = 0; id < N * N; id += 3) if (state[id] === 1) { const i = id % N, j = (id / N) | 0, x = x0 + (i + .5) * FC, z = z0 + (j + .5) * FC; const d = Math.hypot(x - p.x, z - p.z); if (d < 500) near += (500 - d) / 500; } return Math.min(1, near / 10); },
      marks: () => [[cx, cz, st.allDone ? 'ok' : 'tuz']], progress: () => `${st.burning || 0} égő folt · ${st.out || 0} eloltva` };
  }

  /* ---------- precíziós kihívás ---------- */
  if (def.mod === 'precizio') { const targets = def.celok.map(([lon, lat, r]) => { const [x, z] = P(lon, lat), need = r * r * 3.14 * .03;
      const g = new THREE.Group(); g.position.set(x, ground(x, z) + .6, z); g.userData.gy = [x, z, .6]; G.add(g);
      const bed = new THREE.Mesh(new THREE.CircleGeometry(r, 24).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x8f6a3c, polygonOffset: true, polygonOffsetFactor: -3 })); g.add(bed);
      const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 1.2, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: SZIN.sarga })); ring.position.y = .1; g.add(ring);
      for (let k = 0; k < 14; k++) { const a = k / 14 * 6.28, f = new THREE.Mesh(new THREE.SphereGeometry(.9, 6, 4), new THREE.MeshLambertMaterial({ color: [0xe84a5f, 0xf2c230, 0xc79bff, 0xffffff][k % 4] })); f.position.set(Math.cos(a) * r * .55, .6, Math.sin(a) * r * .55); g.add(f); }
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, 40, 6), new THREE.MeshBasicMaterial({ color: SZIN.sarga, transparent: true, opacity: .6 })); pole.position.y = 20; g.add(pole);
      return { x, z, r, need, got: 0, out: 0, bed, done: false }; });
    api = {
      hit(x, z, v, rr) { let on = false; for (const t of targets) { const d = Math.hypot(x - t.x, z - t.z); if (d < t.r) { t.got += v; on = true; if (!t.done && t.got >= t.need) { t.done = true; say('Célpont megöntözve!', 'ok'); } const k = Math.min(1, t.got / t.need); t.bed.material.color.setRGB((143 + (76 - 143) * k) / 255, (106 + (158 - 106) * k) / 255, (60 + (58 - 60) * k) / 255); }
          else if (d < t.r + 70) { t.out += v; if (t.out > t.need * .5 && !t.warned) { t.warned = 1; st.pen += 200; say('A szomszéd kertje is ázik!', 'bad'); } } }
        if (on) st.onTarget += v; },
      update() { st.frac = targets.filter(t => t.done).length / targets.length; if (!st.allDone && st.frac >= 1) { st.allDone = true; say('Minden célpont kész! Szállj le a bónuszért.', 'ok'); } },
      target(b) { const t = targets.filter(t => !t.done).sort((a, c) => Math.hypot(a.x - b.pos.x, a.z - b.pos.z) - Math.hypot(c.x - b.pos.x, c.z - b.pos.z))[0]; return t ? [t.x, ground(t.x, t.z) + 10, t.z] : null; },
      marks: () => targets.map(t => [t.x, t.z, t.done ? 'ok' : 'cel']), progress: () => `${targets.filter(t => t.done).length} / ${targets.length} célpont`, targets };
  }

  /* ---------- gyorsasági verseny ---------- */
  if (def.mod === 'verseny') { const span = Math.max(26, (gep.kind === 'plane' && gep.tomeg > 30000) ? 70 : 30);
    const rings = def.pontok.map(([lon, lat, h], i, a) => { const [x, z] = P(lon, lat), y = ground(x, z) + h; let nx = 0, nz = -1;
      const nb = a[Math.min(a.length - 1, i + 1)], pb = a[Math.max(0, i - 1)], [ax, az] = P(pb[0], pb[1]), [bx, bz] = P(nb[0], nb[1]); nx = bx - ax; nz = bz - az; const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
      const m = new THREE.Mesh(new THREE.TorusGeometry(span, span * .09, 8, 28), new THREE.MeshLambertMaterial({ color: i === 0 ? SZIN.zold : SZIN.kek, emissive: 0x0a3a50 })); m.position.set(x, y, z); m.lookAt(x + nx, y, z + nz); G.add(m);
      return { x, y, z, nx, nz, m, passed: false }; });
    let next = 0, prevSide = null; st.limit = 0;
    api = {
      hit(x, z, v) { void x; void z; void v; },
      update(dt, b) { if (next >= rings.length) return; const r = rings[next], side = (b.pos.x - r.x) * r.nx + (b.pos.z - r.z) * r.nz;
        if (prevSide !== null && prevSide < 0 && side >= 0) { const d = Math.hypot(b.pos.x - r.x - side * r.nx, b.pos.z - r.z - side * r.nz, b.pos.y - r.y); if (d < span * 1.05) { r.passed = true; r.m.material.color.setHex(SZIN.sarga); r.m.material.emissive.setHex(0x403000); next++; st.ring = next; say(next >= rings.length ? 'Cél! Szállj le a bónuszért.' : `${next}. karika`, 'ok'); if (next >= rings.length) st.allDone = true; else rings[next].m.material.color.setHex(SZIN.zold); }
          else if (d < span * 3) say('Mellé! Fordulj vissza a karikához.', 'bad'); }
        prevSide = next < rings.length ? (b.pos.x - rings[next].x) * rings[next].nx + (b.pos.z - rings[next].z) * rings[next].nz : null; if (r.passed) prevSide = null; st.frac = next / rings.length; },
      target() { const r = rings[next]; return r ? [r.x, r.y, r.z] : null; }, marks: () => rings.map(r => [r.x, r.z, r.passed ? 'ok' : 'cel']), progress: () => `${next} / ${rings.length} karika`, rings };
  }

  // pontszámítás (géptípus szerint kiegyensúlyozva: k)
  function finish(land) { const acc = st.used > 0 ? Math.min(1, st.onTarget / st.used) : 0; let base = 0, tb = 0;
    if (def.mod === 'ontozes') { base = (st.frac || 0) * 6000 * (.55 + .45 * acc); if (st.allDone) tb = Math.max(0, st.limit - st.t) * 6; }
    if (def.mod === 'tuz') { const tot = (st.out || 0) + (st.burnt || 0) + (st.burning || 0); base = tot ? (st.out || 0) / tot * 6000 * (.6 + .4 * acc) : 0; if (st.allDone) tb = Math.max(0, st.limit - st.t) * 6; else base *= .6; }
    if (def.mod === 'precizio') { base = (st.frac || 0) * 5000 * (.4 + .6 * acc); if (st.allDone) tb = Math.max(0, st.limit - st.t) * 5; }
    if (def.mod === 'verseny') { base = st.allDone ? Math.round(1.2e6 / Math.max(20, st.t)) : (st.frac || 0) * 1500; }
    const lb = land === 'sima' ? 600 : land === 'ok' ? 300 : 0, k = gep.k || 1;
    const total = Math.max(0, Math.round((base + tb + lb - st.pen) * k));
    return { base: Math.round(base), time: Math.round(tb), land: lb, pen: st.pen, acc, k, total }; }

  // ha közben betöltődik egy részletesebb domborzati csempe, a talajra fektetett tárgyak igazodnak hozzá
  function redrape(bd) { for (const o of G.children) { const u = o.userData;
      if (u.gy && u.gy[0] > bd[0] - 50 && u.gy[0] < bd[2] + 50 && u.gy[1] > bd[1] - 50 && u.gy[1] < bd[3] + 50) o.position.y = ground(u.gy[0], u.gy[1]) + u.gy[2];
      if (u.dr && u.dr[0] > bd[0] - 500 && u.dr[0] < bd[2] + 500 && u.dr[1] > bd[1] - 500 && u.dr[1] < bd[3] + 500) { const [x, z, w, l, a, sw, sl] = u.dr; o.geometry.dispose(); o.geometry = drape(x, z, w, l, a, sw, sl); } } }
  return Object.assign(st, api, { G, finish, redrape, dispose() { scene.remove(G); G.traverse(o => { if (o.geometry) o.geometry.dispose(); }); } });
}
