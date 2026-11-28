/* ÓLOMTÉL – megjelenítés: izometrikus kamera, alacsony felbontású kép körvonallal és szűkített palettával (pixelszűrő),
   hó, füst, lángok, vezetékek, hőtérkép. */
import * as THREE from 'three';
import { W, H } from './sim.js?v=202611282048';
import { U, M, REAKTOR } from './adat.js?v=202611282048';
import { Epito, epuletGeo, allvanyGeo, SZIN } from './epulet.js?v=202611282048';

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const FS = `
precision highp float; varying vec2 vUv; uniform sampler2D tC, tD; uniform vec2 px; uniform float szintek, hideg, vill;
float bayer(vec2 p){ int x = int(mod(p.x, 4.)), y = int(mod(p.y, 4.)); int i = x + y * 4;
  float m = 0.; if(i==0)m=0.;else if(i==1)m=8.;else if(i==2)m=2.;else if(i==3)m=10.;else if(i==4)m=12.;else if(i==5)m=4.;else if(i==6)m=14.;else if(i==7)m=6.;else if(i==8)m=3.;else if(i==9)m=11.;else if(i==10)m=1.;else if(i==11)m=9.;else if(i==12)m=15.;else if(i==13)m=7.;else if(i==14)m=13.;else m=5.;
  return m / 16. - .5; }
void main(){
  vec3 c = pow(max(texture2D(tC, vUv).rgb, 0.), vec3(1. / 2.2)); float d = texture2D(tD, vUv).r;   // a célkép lineáris: itt lesz belőle sRGB
  // körvonal: ahol a szomszéd képpont közelebb van a kamerához
  float e = 0.; e = max(e, d - texture2D(tD, vUv + vec2(px.x, 0.)).r); e = max(e, d - texture2D(tD, vUv - vec2(px.x, 0.)).r); e = max(e, d - texture2D(tD, vUv + vec2(0., px.y)).r); e = max(e, d - texture2D(tD, vUv - vec2(0., px.y)).r);
  c *= 1. - .62 * smoothstep(.0012, .003, e);
  c = mix(c, vec3(dot(c, vec3(.3, .6, .1))) * vec3(.82, .93, 1.12), .18 + .25 * hideg);      // hideg, fakó színvilág
  c += vill * vec3(.5, .6, .7);
  vec2 q = vUv - .5; c *= 1. - .55 * dot(q, q);
  c = floor(c * szintek + .5 + bayer(gl_FragCoord.xy) * .9) / szintek;
  gl_FragColor = vec4(c, 1.);
}`;

export class Rajz {
  constructor(canvas, sim) {
    this.cv = canvas; this.sim = sim; const R = this.r = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.BasicShadowMap; R.setPixelRatio(1);
    this.sc = new THREE.Scene(); this.sc.background = new THREE.Color(0x1a2028); this.sc.fog = new THREE.Fog(0x9fb0c0, 120, 330);
    this.cam = new THREE.OrthographicCamera(-10, 10, 10, -10, 1, 400);
    this.cel = new THREE.Vector3(W / 2, 0, H / 2 + 2); this.zoom = 26; this.irany = 0; this.iranyC = 0; this.PX = 3;
    this.matS = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }); this.matL = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.matG = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: .6 });
    this.nap = new THREE.DirectionalLight(0xffffff, 2); this.nap.castShadow = true; this.nap.shadow.mapSize.set(2048, 2048); const sc = this.nap.shadow.camera; sc.left = sc.bottom = -45; sc.right = sc.top = 45; sc.near = 1; sc.far = 220; this.nap.shadow.bias = -.002; this.nap.shadow.normalBias = .04;
    this.sc.add(this.nap, this.nap.target); this.eg = new THREE.HemisphereLight(0xbcd0e6, 0x3a3f48, 1.2); this.sc.add(this.eg);
    // utómunka: alacsony felbontású célkép mélységgel
    this.rt = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true }); this.rt.depthTexture = new THREE.DepthTexture(4, 4);
    this.psc = new THREE.Scene(); this.pcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.pm = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: { tC: { value: this.rt.texture }, tD: { value: this.rt.depthTexture }, px: { value: new THREE.Vector2() }, szintek: { value: 14 }, hideg: { value: 0 }, vill: { value: 0 } }, depthTest: false, depthWrite: false });
    this.psc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.pm));
    this.egys = new Map(); this.csoG = null; this.csoKulcs = '';
    this.talaj(); this.erdo(); this.reszecskek(); this.segedek(); this.vonat();
    this.ray = new THREE.Raycaster(); this.meret();
  }

  meret() { const w = this.cv.clientWidth || innerWidth, h = this.cv.clientHeight || innerHeight; this.PX = Math.min(w, h) < 520 ? 2 : Math.max(2, Math.round(Math.min(w, h) / 300)); const lw = Math.max(2, Math.floor(w / this.PX)), lh = Math.max(2, Math.floor(h / this.PX));
    this.lw = lw; this.lh = lh; this.r.setSize(lw, lh, false); this.rt.setSize(lw, lh); this.pm.uniforms.px.value.set(1 / lw, 1 / lh); }

  /* ----- talaj: hó, folyó, lelőhelyek, sín, romok ----- */
  talaj() {
    const s = this.sim, g = new Epito(3), rnd = (x, y) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };
    const DEP = [0, 0x2a2622, 0x34343a, 0x8a5038, 0xcfc9b4];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W + x, t = s.terr[k], d = s.dep[k], j = rnd(x, y);
      if (t === 1) { g.box(x + .5, -.35, y + .5, 1, .2, 1, j > .7 ? 0x26323e : 0x1c2731, { j: .04 }); continue; }
      const c = new THREE.Color(0xd2dae2).lerp(new THREE.Color(0xc2ccd6), j * j); if (d) c.lerp(new THREE.Color(DEP[d]), .45 + j * .3);
      g.box(x + .5, -.3, y + .5, 1, .3, 1, c.getHex(), { j: .03 });
      if (d && j > .55) g.box(x + .3 + j * .3, 0, y + .4, .3, .08 + j * .1, .3, DEP[d], { ry: j * 3 });
      if (t === 2) { g.box(x + .5, 0, y + .5, 1, .05, .7, 0x55524c); g.box(x + .5, .05, y + .32, 1, .05, .05, 0x2c2e32); g.box(x + .5, .05, y + .68, 1, .05, .05, 0x2c2e32); for (let i = 0; i < 3; i++) g.box(x + .17 + i * .33, .02, y + .5, .1, .05, .9, 0x3a2f28); }
    }
    this.talajM = g.kesz(this.matS, this.matL); this.talajM.userData.szilard.castShadow = false; this.sc.add(this.talajM);
    // a térképen túli táj
    const sik = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ color: 0xc6cfd8 })); sik.rotation.x = -Math.PI / 2; sik.position.set(W / 2, -.31, H / 2); sik.receiveShadow = true; this.sc.add(sik);
    this.romok();
  }
  romok() {
    if (this.romM) { this.sc.remove(this.romM); this.romM.traverse(o => o.geometry && o.geometry.dispose()); }
    const s = this.sim, g = new Epito(11); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (s.terr[y * W + x] === 3) { const a = g.r(), b = g.r();
      g.box(x + .5, 0, y + .5, .9, .12, .9, SZIN.BETON3); g.box(x + .2, .12, y + .5, .14, .5 + a * 1.4, .9, SZIN.BETON2, { j: .12 }); if (b > .3) g.box(x + .5, .12, y + .15, .9, .3 + b * .9, .14, SZIN.BETON, { j: .12 }); if (a > .5) g.box(x + .6, .12, y + .6, .5, .15, .4, SZIN.BETON3, { ry: a * 3, rz: .3 }); if (b > .7) g.box(x + .75, .12, y + .7, .05, 1.2 + a, .05, 0x4a3a30, { rz: .15 }); }
    this.romM = g.kesz(this.matS, this.matL); this.sc.add(this.romM);
  }
  erdo() { // kopár tajga a körzet körül – eltakarja a térkép szélét
    const s = mkR(77), torzs = new THREE.CylinderGeometry(.06, .09, 1, 5), lomb = new THREE.ConeGeometry(.45, 1.6, 6), n = 900;
    const mt = new THREE.InstancedMesh(torzs, new THREE.MeshLambertMaterial({ color: 0x3a2e28 }), n), ml = new THREE.InstancedMesh(lomb, new THREE.MeshLambertMaterial({ color: 0x2f4238, flatShading: true }), n), d = new THREE.Object3D(); let i = 0;
    while (i < n) { const x = -40 + s() * (W + 80), z = -40 + s() * (H + 80); if (x > -1.5 && z > -1.5 && x < W + 1.5 && z < H + 1.5) continue; const k = .7 + s() * .9; d.position.set(x, .5 * k - .3, z); d.scale.set(k, k, k); d.rotation.y = s() * 6; d.updateMatrix(); mt.setMatrixAt(i, d.matrix); d.position.y = 1.5 * k - .3; d.updateMatrix(); ml.setMatrixAt(i, d.matrix); i++; }
    ml.castShadow = true; this.sc.add(mt, ml);
  }
  reszecskek() {
    // hóesés: képpontnyi pelyhek a kamera körül
    const n = 1400, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p[i * 3] = Math.random() * 60 - 30; p[i * 3 + 1] = Math.random() * 22; p[i * 3 + 2] = Math.random() * 60 - 30; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); this.ho = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1, sizeAttenuation: false, transparent: true, opacity: .85, depthWrite: false })); this.ho.frustumCulled = false; this.sc.add(this.ho);
    // füst: kis kockák
    this.FN = 500; this.fustM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xd8dde2, transparent: true, opacity: .8, depthWrite: false }), this.FN); this.fustM.frustumCulled = false; this.fustM.count = 0; this.sc.add(this.fustM); this.fustok = [];
    this.LN = 60; this.langM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), this.LN); this.langM.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.LN * 3), 3); this.langM.frustumCulled = false; this.langM.count = 0; this.sc.add(this.langM);
    this.fenyek = []; for (let i = 0; i < 6; i++) { const l = new THREE.PointLight(0xff8a3a, 0, 9, 1.6); this.sc.add(l); this.fenyek.push(l); }
  }
  segedek() {
    const kor = c => { const l = new THREE.Mesh(new THREE.BoxGeometry(1, .06, 1), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .4, depthWrite: false })); l.visible = false; l.renderOrder = 5; this.sc.add(l); return l; };
    this.kij = kor(0xffd27a); this.szell = kor(0x66ff88); this.celok = [];
    this.hoTex = new THREE.DataTexture(new Uint8Array(W * H * 4), W, H); this.hoTex.magFilter = THREE.NearestFilter; this.hoTex.flipY = false;
    this.hoM = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: this.hoTex, transparent: true, depthWrite: false })); this.hoM.rotation.x = -Math.PI / 2; this.hoM.position.set(W / 2, .04, H / 2); this.hoM.visible = false; this.hoM.renderOrder = 4; this.sc.add(this.hoM);
  }
  vonat() { const g = new Epito(5); g.box(0, .1, 0, 1.6, .7, .6, 0x3a4a3e); g.box(.5, .8, 0, .5, .35, .56, 0x3a4a3e); g.cyl(-.3, .8, 0, .12, .4, 0x222, { seg: 6 }); g.box(.86, .45, 0, .08, .1, .3, 0xffd27a, { lit: 1 });
    for (let i = 1; i <= 7; i++) { const x = -i * 1.75; if (i % 3) { g.box(x, .1, 0, 1.5, .15, .55, 0x2c2e32); g.cso(x - .7, .55, 0, x + .7, .55, 0, .28, i % 2 ? 0x5a5650 : 0x6a4a38); } else g.box(x, .1, 0, 1.5, .6, .55, 0x5a4034); }
    this.vonatM = g.kesz(this.matS, this.matL); this.vonatM.position.set(-30, 0, 55.5); this.sc.add(this.vonatM); }

  /* ----- egységek és vezetékek szinkronja a szimulációval ----- */
  egysegKulcs(u) { return u.t + '|' + u.rot + '|' + (u.ep >= 1 ? 'k' : Math.floor(u.ep * 5)) + (u.t === 'reaktor' ? '|' + this.sim.r.lvl + (this.sim.r.jav ? 'j' : '') : '') + (u.t === 'szallo' && this.sim.tech.panel ? 'p' : ''); }
  epit(u, mat) { const d = U[u.t], st = { lvl: this.sim.r.lvl, jav: !!this.sim.r.jav, panel: this.sim.tech.panel }; const G = u.ep >= 1 || mat ? epuletGeo(u.t, d.w, d.h, st, mat || this.matS, this.matL, u.id || 1) : allvanyGeo(d.w, d.h, u.ep, this.matS, this.matL);
    const [w, h] = this.sim.meret(u.t, u.rot), K = new THREE.Group(); G.position.set(-d.w / 2, 0, -d.h / 2); K.add(G); K.rotation.y = -u.rot * Math.PI / 2; K.position.set(u.x + w / 2, 0, u.y + h / 2); K.userData = { g: G, id: u.id }; return K; }
  szinkron() {
    const s = this.sim, el = new Set();
    for (const u of s.units) { el.add(u.id); const k = this.egysegKulcs(u), e = this.egys.get(u.id); if (e && e.k === k) continue; if (e) this.torol(e.o); const o = this.epit(u); this.sc.add(o); this.egys.set(u.id, { o, k }); }
    for (const [id, e] of this.egys) if (!el.has(id)) { this.torol(e.o); this.egys.delete(id); }
    // vezetékek: csak változáskor épülnek újra
    let kulcs = ''; for (const L of s.links) kulcs += L.id + (L.trace ? 't' : '') + (L.dug ? 'd' : '') + (L.m || '') + (this.kivL === L.id ? '*' : '') + ';';
    if (kulcs !== this.csoKulcs) { this.csoKulcs = kulcs; if (this.csoG) this.torol(this.csoG); this.csoG = this.vezetekek(); this.sc.add(this.csoG); }
  }
  torol(o) { this.sc.remove(o); o.traverse(c => c.geometry && c.geometry.dispose()); }
  utvonal(L) { const s = this.sim, a = s.get(L.a), b = s.get(L.b), [ax, az] = s.kozep(a), [bx, bz] = s.kozep(b), o = ((L.id * 7) % 5 - 2) * .13; return [[ax + o, az + o], [bx + o, az + o], [bx + o, bz + o]]; }
  vezetekek() {
    const g = new Epito(9), s = this.sim;
    for (const L of s.links) { const a = s.get(L.a), b = s.get(L.b); if (!a || !b) continue; const m = L.m || s.kiAnyag(a, L.ap)[0], d = M[m], sz = d.k === 's', P = this.utvonal(L), y = sz ? .42 : d.k === 'g' ? .95 : .7;
      const col = L.dug ? 0xbfe6ff : this.kivL === L.id ? 0xffd27a : d.c, r = sz ? .0 : m === 'goz' ? .1 : .075;
      for (let i = 0; i < 2; i++) { const [x1, z1] = P[i], [x2, z2] = P[i + 1], l = Math.hypot(x2 - x1, z2 - z1); if (l < .05) continue;
        if (sz) { g.box((x1 + x2) / 2, y, (z1 + z2) / 2, Math.abs(x2 - x1) + .22, .07, Math.abs(z2 - z1) + .22, 0x2c2e32); g.box((x1 + x2) / 2, y + .07, (z1 + z2) / 2, Math.abs(x2 - x1) + .12, .05, Math.abs(z2 - z1) + .12, col, { j: .15 }); }
        else g.cso(x1, y, z1, x2, y, z2, r, col);
        const n = Math.floor(l / 2.2); for (let k = 0; k <= n; k++) { const t = n ? k / n : .5, px = x1 + (x2 - x1) * t, pz = z1 + (z2 - z1) * t; g.box(px, 0, pz, .07, y, .07, SZIN.ACEL2); if (L.trace) g.box(px, y + r + .02, pz, .07, .05, .07, 0xff8a2a, { lit: 1 }); }
      }
      if (!sz) g.box(P[1][0], y - .09, P[1][1], .2, .18, .2, col);
    }
    return g.kesz(this.matS, this.matL);
  }

  /* ----- kijelölés, szellemkép, hőtérkép ----- */
  keret(o, x, y, w, h, m = .1) { o.visible = true; o.scale.set(w + m, 1, h + m); o.position.set(x + w / 2, .05, y + h / 2); }
  kijelol(u) { if (!u) { this.kij.visible = false; return; } const [w, h] = this.sim.meret(u.t, u.rot); this.keret(this.kij, u.x, u.y, w, h, .3); }
  szellem(t, x, y, rot, jo) {
    if (!t) { this.szell.visible = false; if (this.szG) { this.torol(this.szG); this.szG = null; this.szK = ''; } return; }
    const [w, h] = this.sim.meret(t, rot); this.keret(this.szell, x, y, w, h, 0); this.szell.material.color.set(jo ? 0x66ff88 : 0xff5544);
    const k = t + rot; if (this.szK !== k) { if (this.szG) this.torol(this.szG); this.szG = this.epit({ t, x: 0, y: 0, rot, ep: 1, id: 1 }, this.matG); this.szG.traverse(o => { o.castShadow = false; }); this.sc.add(this.szG); this.szK = k; }
    this.szG.position.set(x + w / 2, 0, y + h / 2);
  }
  celpontok(lista) { for (const c of this.celok) this.sc.remove(c); this.celok = []; for (const u of lista) { const [w, h] = this.sim.meret(u.t, u.rot), l = new THREE.Mesh(this.kij.geometry, new THREE.MeshBasicMaterial({ color: 0x7ad6ff, transparent: true, opacity: .45, depthWrite: false })); this.keret(l, u.x, u.y, w, h, .3); this.sc.add(l); this.celok.push(l); } }
  hoterkep(be) { this.hoM.visible = be; if (!be) return; const d = this.hoTex.image.data, ho = this.sim.ho, C = [[60, 110, 220, 45], [80, 200, 220, 95], [240, 210, 80, 115], [255, 140, 40, 135], [255, 70, 30, 150]]; for (let i = 0; i < W * H; i++) { const c = C[ho[i]]; d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = c[3]; } this.hoTex.needsUpdate = true; }

  /* ----- kamera ----- */
  kamera() {
    this.iranyC += (this.irany - this.iranyC) * .2; if (Math.abs(this.irany - this.iranyC) < .002) this.iranyC = this.irany;
    const a = Math.PI / 4 + this.iranyC * Math.PI / 2, el = Math.PI / 6, D = 150, c = this.cam, asp = this.lw / this.lh, z = this.zoom;
    c.left = -z * asp / 2; c.right = z * asp / 2; c.top = z / 2; c.bottom = -z / 2; c.updateProjectionMatrix();
    const dir = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
    c.position.copy(this.cel).addScaledVector(dir, D); c.lookAt(this.cel); c.updateMatrixWorld();
    // képpontra igazítás: mozgás közben nem vibrál a kép
    if (this.iranyC === this.irany) { const wpp = z / this.lh, jobb = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 0), fel = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 1), rj = c.position.dot(jobb), rf = c.position.dot(fel);
      c.position.addScaledVector(jobb, Math.round(rj / wpp) * wpp - rj).addScaledVector(fel, Math.round(rf / wpp) * wpp - rf); c.updateMatrixWorld(); }
    this.dir = dir;
  }
  // képernyő → talajpont
  talajPont(cx, cy) { const r = this.cv.getBoundingClientRect(), v = new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); this.ray.setFromCamera(v, this.cam); const o = this.ray.ray.origin, d = this.ray.ray.direction, t = -o.y / d.y; return new THREE.Vector3(o.x + d.x * t, 0, o.z + d.z * t); }
  // képernyő → egység (az épület teste is kattintható, nem csak az alapja)
  egysegAlatt(cx, cy) { const r = this.cv.getBoundingClientRect(), v = new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); this.ray.setFromCamera(v, this.cam);
    const l = []; for (const e of this.egys.values()) l.push(e.o); const h = this.ray.intersectObjects(l, true)[0]; if (h) { let o = h.object; while (o && o.userData.id == null) o = o.parent; if (o) return this.sim.get(o.userData.id); }
    const p = this.talajPont(cx, cy), x = Math.floor(p.x), y = Math.floor(p.z); if (x < 0 || y < 0 || x >= W || y >= H) return null; const id = this.sim.occ[y * W + x]; return id ? this.sim.get(id) : null; }
  huz(dx, dy) { const wpp = this.zoom / this.cv.clientHeight, c = this.cam, jobb = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 0), fel = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 1); jobb.y = 0; jobb.normalize(); fel.y = 0; fel.normalize();
    this.cel.addScaledVector(jobb, -dx * wpp).addScaledVector(fel, dy * wpp / Math.sin(Math.PI / 6)); this.cel.x = Math.max(-4, Math.min(W + 4, this.cel.x)); this.cel.z = Math.max(-4, Math.min(H + 4, this.cel.z)); }
  nagyit(k) { this.zoom = Math.max(9, Math.min(70, this.zoom * k)); }

  /* ----- képkocka ----- */
  rajzol(ido, dt) {
    const s = this.sim, T = s.T, ora = s.ora; this.szinkron(); this.kamera();
    // napszak: rövid, szürke nappal, hosszú kékes éjszaka
    const nappal = Math.max(0, Math.min(1, (Math.sin((ora - 8.5) / 24 * Math.PI * 2) + .35) * 1.6)), vihar = Math.max(0, Math.min(1, (-30 - T) / 35));
    const eg = new THREE.Color(0x222c3c).lerp(new THREE.Color(0x9fb0c0), nappal * (1 - vihar * .5));
    this.sc.background.copy(eg); this.sc.fog.color.copy(eg).lerp(new THREE.Color(0xdfe8f0), .25 + vihar * .3); this.sc.fog.near = 150 - vihar * 60; this.sc.fog.far = 330 - vihar * 150;
    this.nap.intensity = .9 + nappal * 1.5 * (1 - vihar * .6); this.nap.color.set(nappal > .3 ? 0xfff0dc : 0x8fb0f0); this.eg.intensity = 1.25 + nappal * .5; this.eg.color.set(nappal > .3 ? 0xc8d8e8 : 0x7f9ad0);
    const na = (ora / 24) * Math.PI * 2 + 1; this.nap.position.set(this.cel.x + Math.cos(na) * 60, 50 + nappal * 30, this.cel.z + Math.sin(na) * 60 + 20); this.nap.target.position.copy(this.cel);
    this.matL.color.setScalar(1.25 - nappal * .45); this.pm.uniforms.hideg.value = vihar; this.pm.uniforms.vill.value = 0;
    // hó
    const hp = this.ho.geometry.attributes.position, szel = 2 + vihar * 14, es = 2.5 + vihar * 3; for (let i = 0; i < hp.count; i++) { let x = hp.getX(i) + szel * dt, y = hp.getY(i) - es * dt, z = hp.getZ(i) + szel * .4 * dt; if (y < 0) y += 22; if (x > 30) x -= 60; if (z > 30) z -= 60; hp.setXYZ(i, x, y, z); }
    hp.needsUpdate = true; this.ho.position.set(this.cel.x, 0, this.cel.z); this.ho.material.opacity = .5 + vihar * .5;
    // füst és láng az üzemelő egységekből
    const d = new THREE.Object3D(); let li = 0; const lf = [];
    for (const u of s.units) { const e = this.egys.get(u.id); if (!e || u.ep < 1) continue; const G = e.o.userData.g, akt = u.t === 'reaktor' ? 1 : U[u.t].mel ? u.mel : u.fut;
      for (const f of G.userData.fust) if (akt > .05 && Math.random() < dt * 9 * f[3] * (.3 + akt) && this.fustok.length < this.FN) { const p = new THREE.Vector3(f[0], f[1], f[2]); G.localToWorld(p); this.fustok.push({ p, e: 0, m: 3 + Math.random() * 3, s: .18 + Math.random() * .2 * f[3], h: u.t === 'kokszolo' || u.t === 'hokozp' || u.t === 'turbina' ? 1 : .55 + Math.random() * .2 }); }
      for (const f of G.userData.lang) { const ak = f[3] === 'kek' ? 1 : f[3] === 'faklya' ? (u.fut > .02 ? .5 + u.fut : 0) : u.mel; if (ak <= .02 || li >= this.LN - 3) continue; const p = new THREE.Vector3(f[0], f[1], f[2]); G.localToWorld(p);
        const n = f[3] === 'faklya' ? 3 : 1; for (let k = 0; k < n; k++) { const fl = .7 + .3 * Math.sin(ido * 13 + k * 2 + u.id); d.position.set(p.x + (k ? Math.sin(ido * 9 + k) * .06 : 0), p.y + k * .22 * ak, p.z); const sz = f[3] === 'faklya' ? (.34 - k * .09) * ak * fl : .12; d.scale.set(sz, f[3] === 'faklya' ? sz * 1.5 : sz, sz); d.rotation.set(0, ido * 2 + k, 0); d.updateMatrix(); this.langM.setMatrixAt(li, d.matrix); this.langM.setColorAt(li, new THREE.Color(f[3] === 'kek' ? 0x59e6ff : k ? 0xffe27a : 0xff6a1e)); li++; }
        lf.push([p, f[3] === 'kek' ? 0x40d0ff : 0xff7a2a, (f[3] === 'faklya' ? 26 : 14) * ak]); }
    }
    this.langM.count = li; this.langM.instanceMatrix.needsUpdate = true; if (this.langM.instanceColor) this.langM.instanceColor.needsUpdate = true;
    lf.sort((a, b) => a[0].distanceToSquared(this.cel) - b[0].distanceToSquared(this.cel)); this.fenyek.forEach((l, i) => { const f = lf[i]; if (f) { l.position.copy(f[0]); l.position.y += .5; l.color.set(f[1]); l.intensity = f[2] * (1.2 - nappal * .7) * (.85 + .15 * Math.sin(ido * 11 + i)); } else l.intensity = 0; });
    let fi = 0; for (let i = this.fustok.length - 1; i >= 0; i--) { const f = this.fustok[i]; f.e += dt; if (f.e > f.m) { this.fustok.splice(i, 1); continue; } f.p.y += dt * (1.1 - f.e / f.m * .6); f.p.x += dt * szel * .12 * (.4 + f.e); f.p.z += dt * szel * .05 * (.4 + f.e); }
    for (const f of this.fustok) { const k = f.e / f.m, sz = f.s * (1 + k * 2.6) * (1 - k * k * .6); d.position.copy(f.p); d.scale.set(sz, sz, sz); d.rotation.set(0, 0, 0); d.updateMatrix(); this.fustM.setMatrixAt(fi++, d.matrix); }
    this.fustM.count = fi; this.fustM.instanceMatrix.needsUpdate = true;
    // vonat: 05:00-kor érkezik, 06:00 után indul
    const vo = ora >= 4.5 && ora < 6.2 ? Math.min(1, (ora - 4.5) / .9) : ora >= 6.2 && ora < 7.4 ? 1 + (ora - 6.2) / 1.2 : -1; this.vonatM.visible = vo >= 0; if (vo >= 0) this.vonatM.position.x = vo <= 1 ? -22 + (1 - Math.pow(1 - vo, 2)) * 52 : 30 + Math.pow(vo - 1, 2) * 60;
    for (const c of this.celok) c.material.opacity = .3 + .25 * Math.sin(ido * 6);
    const R = this.r; R.setRenderTarget(this.rt); R.render(this.sc, this.cam); R.setRenderTarget(null); R.render(this.psc, this.pcam);
  }
}
function mkR(s) { return () => (s = (s * 16807) % 2147483647) / 2147483647; }
