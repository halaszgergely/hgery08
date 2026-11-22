/* Utófeldolgozás és dinamikus felbontás.
   A jelenet egy belső HalfFloat render targetbe rajzolódik (MSAA-val), a vászon mérete repülés közben soha nem változik –
   a dinamikus felbontás csak a belső target méretét állítja, hiszterézissel és ritkán. A végső menet: bloom, ACES tónusleképezés,
   színkorrekció, vignetta, sRGB. „Alacsony” grafikán nincs bloom és MSAA, de a felbontás-skálázás ugyanígy működik. */
import * as THREE from 'three';

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false;
const qScene = new THREE.Scene(); qScene.add(quad); const qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const mat = (fs, u) => new THREE.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: fs, depthTest: false, depthWrite: false });

export function createPost(renderer) {
  let bloomOn = true, samples = 4, scale = 1, W = 1, H = 1, pr = 1;
  const rtOpt = { type: THREE.HalfFloatType, depthBuffer: true, samples };
  let main = new THREE.WebGLRenderTarget(1, 1, rtOpt);
  const half = () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  const bA = half(), bB = half(), cA = half(), cB = half();
  const bright = mat(`uniform sampler2D t; uniform float th; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv).rgb; c = any(isnan(c)) || any(isinf(c)) ? vec3(0.) : clamp(c, 0., 64.); float l = dot(c, vec3(.2126,.7152,.0722)); gl_FragColor = vec4(c * smoothstep(th, th * 2.2, l), 1.); }`, { t: { value: null }, th: { value: 1.1 } });
  const blur = mat(`uniform sampler2D t; uniform vec2 d; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv).rgb * .227;
      c += (texture2D(t, vUv + d * 1.384).rgb + texture2D(t, vUv - d * 1.384).rgb) * .316; c += (texture2D(t, vUv + d * 3.23).rgb + texture2D(t, vUv - d * 3.23).rgb) * .07; gl_FragColor = vec4(c, 1.); }`, { t: { value: null }, d: { value: new THREE.Vector2() } });
  const fin = mat(`uniform sampler2D t, b1, b2; uniform float bloom, vig, exposure, sat, warm; uniform vec2 res; varying vec2 vUv;
      vec3 aces(vec3 c){ const mat3 I = mat3(vec3(.59719, .07600, .02840), vec3(.35458, .90834, .13383), vec3(.04823, .01566, .83777)); const mat3 O = mat3(vec3(1.60475, -.10208, -.00327), vec3(-.53108, 1.10813, -.07276), vec3(-.07367, -.00605, 1.07602));
        c *= exposure / .6; c = I * c; vec3 a = c * (c + .0245786) - .000090537, b = c * (.983729 * c + .4329510) + .238081; return clamp(O * (a / b), 0., 1.); }
      vec3 srgb(vec3 c){ return mix(c * 12.92, pow(c, vec3(.41666)) * 1.055 - .055, step(.0031308, c)); }
      void main(){ vec3 c = texture2D(t, vUv).rgb; c = any(isnan(c)) || any(isinf(c)) ? texture2D(t, vUv + vec2(.003, 0.)).rgb : c; c = any(isnan(c)) ? vec3(0.) : clamp(c, 0., 64.);   // NaN-képpontok (fekete villogó kockák a bloom után) kiszűrése
      c += (texture2D(b1, vUv).rgb * .6 + texture2D(b2, vUv).rgb * .8) * bloom;
        c = aces(c); float l = dot(c, vec3(.2126,.7152,.0722)); c = mix(vec3(l), c, sat); c *= vec3(1. + warm * .04, 1., 1. - warm * .05);
        vec2 q = vUv - .5; c *= 1. - vig * dot(q, q) * 1.3; c = srgb(clamp(c, 0., 1.));
        float n = fract(sin(dot(vUv * res, vec2(12.9898, 78.233))) * 43758.5453); c += (n - .5) / 255.; gl_FragColor = vec4(c, 1.); }`,
    { t: { value: null }, b1: { value: null }, b2: { value: null }, bloom: { value: .55 }, vig: { value: .55 }, exposure: { value: 1.05 }, sat: { value: 1.08 }, warm: { value: .4 }, res: { value: new THREE.Vector2() } });

  function sizeTargets() { const w = Math.max(2, Math.round(W * pr * scale)), h = Math.max(2, Math.round(H * pr * scale));
    main.setSize(w, h); for (const [t, k] of [[bA, 4], [bB, 4], [cA, 8], [cB, 8]]) t.setSize(Math.max(2, w / k | 0), Math.max(2, h / k | 0)); fin.uniforms.res.value.set(w, h); }
  function setSize(w, h, p) { W = w; H = h; pr = p; sizeTargets(); }
  function setQuality(q) { bloomOn = q !== 'alacsony'; const s = q === 'alacsony' ? 0 : 4; if (s !== samples) { samples = s; main.dispose(); main = new THREE.WebGLRenderTarget(1, 1, { ...rtOpt, samples }); sizeTargets(); } }
  function pass(m, out) { quad.material = m; renderer.setRenderTarget(out); renderer.render(qScene, qCam); }
  function render(scene, cam) {
    renderer.setRenderTarget(main); renderer.render(scene, cam);
    if (bloomOn) { bright.uniforms.t.value = main.texture; pass(bright, bA);
      blur.uniforms.t.value = bA.texture; blur.uniforms.d.value.set(1 / bA.width, 0); pass(blur, bB); blur.uniforms.t.value = bB.texture; blur.uniforms.d.value.set(0, 1 / bA.height); pass(blur, bA);
      blur.uniforms.t.value = bA.texture; blur.uniforms.d.value.set(1 / cA.width, 0); pass(blur, cA); blur.uniforms.t.value = cA.texture; blur.uniforms.d.value.set(0, 1 / cA.height); pass(blur, cB); }
    fin.uniforms.t.value = main.texture; fin.uniforms.b1.value = bA.texture; fin.uniforms.b2.value = cB.texture; fin.uniforms.bloom.value = bloomOn ? .55 : 0; fin.uniforms.vig.value = bloomOn ? .55 : .3;
    pass(fin, null); }
  // dinamikus felbontás: 2,5 s-os átlag, hiszterézis (lassú: 26 ms fölött le, 13 ms alatt fel), legfeljebb 5 s-onként
  let acc = 0, n = 0, wait = 3; const dyn = { min: .55, on: true };
  function frameTime(dt) { if (!dyn.on) return; acc += dt; n++; wait -= dt; if (acc < 2.5) return; const ms = acc / n * 1000; acc = n = 0; if (wait > 0) return;
    let s = scale; if (ms > 26 && scale > dyn.min) s = Math.max(dyn.min, scale - .1); else if (ms < 13 && scale < 1) s = Math.min(1, scale + .05);
    if (s !== scale) { scale = s; sizeTargets(); wait = 5; } }
  return { render, setSize, setQuality, frameTime, get scale() { return scale; }, setScale(s) { scale = s; sizeTargets(); }, dyn, fin };
}
