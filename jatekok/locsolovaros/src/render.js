// Megjelenítés: renderer, ég (napszakciklus), nap + árnyék (a kamerát követő kaszkád), köd, eső, utófeldolgozás (bloom, GTAO), minőségi szintek
import * as THREE from 'three';
import { EffectComposer } from '../lib/addons/postprocessing/EffectComposer.js?v=202611271857';
import { RenderPass } from '../lib/addons/postprocessing/RenderPass.js?v=202611271857';
import { UnrealBloomPass } from '../lib/addons/postprocessing/UnrealBloomPass.js?v=202611271857';
import { OutputPass } from '../lib/addons/postprocessing/OutputPass.js?v=202611271857';
import { GTAOPass } from '../lib/addons/postprocessing/GTAOPass.js?v=202611271857';

export const QUALITY = {
  alacsony: { px: .75, shadow: 0, bloom: 0, ao: 0, far: 900, detail: 170, props: 150, peds: 18, cars: 12 },
  kozepes: { px: 1, shadow: 1024, bloom: 1, ao: 0, far: 1400, detail: 240, props: 230, peds: 30, cars: 18 },
  magas: { px: 1.25, shadow: 2048, bloom: 1, ao: 1, far: 2200, detail: 340, props: 320, peds: 42, cars: 26 }
};

export function createRender(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x8fb6d8);
  const camera = new THREE.PerspectiveCamera(65, 1, .3, 1400);
  scene.fog = new THREE.Fog(0x9fbcd6, 200, 1300);
  // ég
  const skyU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() }, night: { value: 0 }, t: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = vec4(p.xy, p.w * .99995, p.w); }',
    fragmentShader: `uniform vec3 top, hor, sunDir, sunCol; uniform float night, t; varying vec3 vD;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
      void main(){ vec3 d = normalize(vD); float y = max(d.y, 0.); vec3 c = mix(hor, top, pow(y, .55));
        if (d.y < 0.) c = mix(hor, hor * .55, min(1., -d.y * 6.));
        float s = max(dot(d, normalize(sunDir)), 0.); c += sunCol * (pow(s, 900.) * 6. + pow(s, 12.) * .35);
        vec3 q = floor(d * 380.); float st = step(.9965, h(q)) * night * smoothstep(0., .25, d.y); c += vec3(st) * (.6 + .4 * sin(t * 2. + h(q) * 40.));
        float m = max(dot(d, normalize(-sunDir + vec3(.2, .3, 0.))), 0.); c += vec3(.9, .9, .8) * pow(m, 1800.) * 3. * night;
        gl_FragColor = vec4(c, 1.); }` }));
  sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);
  const hemi = new THREE.HemisphereLight(0xcfe2ff, 0x4a4436, .9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.castShadow = false; scene.add(sun, sun.target);
  // eső: a kamera körül körbeforgó vonalak
  const RN = 2600, rg = new THREE.BufferGeometry(), rp = new Float32Array(RN * 6); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  const rainSeed = Float32Array.from({ length: RN * 3 }, () => Math.random());
  const rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xaac4dd, transparent: true, opacity: .45, fog: true })); rain.frustumCulled = false; rain.visible = false; scene.add(rain);
  // környezeti térkép (PBR-tükröződés): egyszerű ég-gradiens jelenetből PMREM, napszakonként frissítve
  const pmrem = new THREE.PMREMGenerator(renderer), envScene = new THREE.Scene(), envU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, gnd: { value: new THREE.Color(0x3a3632) } };
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({ uniforms: envU, side: THREE.BackSide, vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform vec3 top, hor, gnd; varying vec3 vD; void main(){ vec3 d = normalize(vD); vec3 c = d.y > 0. ? mix(hor, top, pow(d.y, .6)) : mix(hor * .8, gnd, min(1., -d.y * 4.)); gl_FragColor = vec4(c, 1.); }' })));
  for (const [x, z] of [[6, 2], [-5, 4], [2, -6]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(3, .4, 3), new THREE.MeshBasicMaterial({ color: 0xffffff })); m.position.set(x, 7, z); envScene.add(m); }
  let envRT = null, envT = -99;
  let composer = null, bloom = null, gtao = null, Q = QUALITY.kozepes, W = 1, H = 1;
  function setQuality(name, ssao) {
    Q = { ...(QUALITY[name] || QUALITY.kozepes) }; if (ssao !== undefined) Q.ao = ssao && name !== 'alacsony' ? 1 : 0;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2) * Q.px);
    renderer.shadowMap.enabled = !!Q.shadow; sun.castShadow = !!Q.shadow;
    if (Q.shadow) { sun.shadow.mapSize.set(Q.shadow, Q.shadow); sun.shadow.map?.dispose(); sun.shadow.map = null; const c = sun.shadow.camera; c.left = -90; c.right = 90; c.top = 90; c.bottom = -90; c.near = 1; c.far = 600; sun.shadow.bias = -.0004; sun.shadow.normalBias = .04; c.updateProjectionMatrix(); }
    camera.far = Q.far; camera.updateProjectionMatrix(); scene.fog.far = Q.far * .92;
    composer?.dispose?.(); composer = null; bloom = null; gtao = null;
    if (Q.bloom || Q.ao) { composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
      if (Q.ao) { gtao = new GTAOPass(scene, camera, W, H); gtao.output = GTAOPass.OUTPUT.Default; gtao.blendIntensity = .8; gtao.updateGtaoMaterial({ radius: .6, distanceExponent: 1, thickness: 1, scale: 1 }); composer.addPass(gtao); }
      if (Q.bloom) { bloom = new UnrealBloomPass(new THREE.Vector2(W, H), .35, .5, .88); composer.addPass(bloom); }
      composer.addPass(new OutputPass()); }
    resize(W, H, true);
    renderer.shadowMap.needsUpdate = true; scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); });
  }
  function resize(w, h, force) { if (!force && w === W && h === H) return; W = w; H = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); composer?.setSize(w, h); }
  // napszak: tod 0..24
  const C = (h) => new THREE.Color(h), tmp = new THREE.Color();
  const KEYS = [[0, C(0x050a1c), C(0x11182e), C(0x10142a), .05], [5, C(0x0c1430), C(0x3a3550), C(0x2a2a3a), .1], [6.5, C(0x3f6fb5), C(0xffa070), C(0xffb070), .7], [9, C(0x3f86d6), C(0xb8d4ec), C(0xfff3e0), 1],
    [15, C(0x3a82d4), C(0xc4dcef), C(0xfff6e8), 1], [18.5, C(0x35589c), C(0xff9a5a), C(0xffa060), .65], [20, C(0x141c40), C(0x5a3a5a), C(0x40304a), .15], [24, C(0x050a1c), C(0x11182e), C(0x10142a), .05]];
  const env = { night: 0, day: 1, sunDir: new THREE.Vector3(), lampsOn: false };
  function setTime(tod, rainK, focus) {
    let i = 0; while (i < KEYS.length - 2 && tod > KEYS[i + 1][0]) i++;
    const a = KEYS[i], b = KEYS[i + 1], k = (tod - a[0]) / (b[0] - a[0]);
    const top = a[1].clone().lerp(b[1], k), hor = a[2].clone().lerp(b[2], k), sc = a[3].clone().lerp(b[3], k), day = a[4] + (b[4] - a[4]) * k;
    const grey = new THREE.Color(0x6a7480); top.lerp(grey, rainK * .6); hor.lerp(grey.clone().multiplyScalar(1.2), rainK * .7);
    skyU.top.value.copy(top); skyU.hor.value.copy(hor); skyU.sunCol.value.copy(sc).multiplyScalar(1 - rainK * .8);
    const ang = (tod - 6) / 12 * Math.PI; env.sunDir.set(Math.cos(ang) * .8, Math.sin(ang), .45).normalize();
    const moon = env.sunDir.y < 0; skyU.sunDir.value.copy(env.sunDir); skyU.night.value = Math.max(0, 1 - day * 1.8) * (1 - rainK);
    env.day = day; env.night = 1 - Math.min(1, day * 1.4); env.lampsOn = tod < 7 || tod > 18.6 || rainK > .6;
    const ld = moon ? env.sunDir.clone().negate() : env.sunDir, fx = Math.round(focus.x / 4) * 4, fz = Math.round(focus.z / 4) * 4; sun.target.position.set(fx, focus.y, fz); sun.position.set(fx, focus.y, fz).addScaledVector(ld, 300);
    sun.color.copy(moon ? tmp.set(0x8fa6d8) : sc); sun.intensity = moon ? .35 : 2.6 * Math.max(.15, day) * (1 - rainK * .6);
    hemi.intensity = .35 + day * .75; hemi.color.copy(top).lerp(tmp.set(0xffffff), .5); hemi.groundColor.set(0x3a352c).multiplyScalar(.4 + day * .6);
    scene.background.copy(hor); scene.fog.color.copy(hor); scene.fog.near = 120 - rainK * 80; scene.fog.far = Math.max(260, Q.far * .92 * (1 - rainK * .55));
    if (Math.abs(tod - envT) > .25 || envT < 0) { envT = tod; envU.top.value.copy(top); envU.hor.value.copy(hor).lerp(tmp.set(0xffffff), .25); envU.gnd.value.set(0x3a3632).multiplyScalar(.3 + day * .7); envRT?.dispose(); envRT = pmrem.fromScene(envScene, .02); scene.environment = envRT.texture; }
    scene.environmentIntensity = .25 + day * .75;
    renderer.toneMappingExposure = .95 + env.night * .25;
    if (bloom) bloom.strength = .25 + env.night * .55;
    return env;
  }
  function updateRain(k, cam, dt, t) {
    rain.visible = k > .02; if (!rain.visible) return; rain.material.opacity = .25 + k * .35;
    const n = Math.floor(RN * Math.min(1, k * 1.2)); rg.setDrawRange(0, n * 2);
    for (let i = 0; i < n; i++) { const sx = rainSeed[i * 3], sy = rainSeed[i * 3 + 1], sz = rainSeed[i * 3 + 2];
      const x = cam.position.x + (sx - .5) * 80, z = cam.position.z + (sz - .5) * 80, y = cam.position.y + 30 - ((t * 22 + sy * 60) % 60);
      rp[i * 6] = x; rp[i * 6 + 1] = y; rp[i * 6 + 2] = z; rp[i * 6 + 3] = x + .08; rp[i * 6 + 4] = y - .9; rp[i * 6 + 5] = z + .05; }
    rg.attributes.position.needsUpdate = true;
  }
  function render(t) { skyU.t.value = t; sky.position.copy(camera.position); sky.scale.setScalar(camera.far * .9); if (composer) composer.render(); else renderer.render(scene, camera); }
  return { renderer, scene, camera, sun, hemi, setQuality, resize, setTime, updateRain, render, env, get Q() { return Q; } };
}
