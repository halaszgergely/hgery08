/* Közös shader-egyenruhák (égbolt, nap, köd, idő) – a terep, a víz, a felhők és az épületek ugyanezeket látják. */
import * as THREE from 'three';
export const SU = {
  uTime: { value: 0 }, uSunDir: { value: new THREE.Vector3(.3, .8, .2).normalize() }, uSunCol: { value: new THREE.Color(1, .95, .85) }, uSunFog: { value: new THREE.Color(1, .8, .6) },
  uSkyTop: { value: new THREE.Color(.25, .5, .85) }, uSkyHor: { value: new THREE.Color(.75, .85, .93) }, uNight: { value: 0 }, uDay: { value: 1 },
  uFogC: { value: new THREE.Color(.75, .85, .93) }, uFogN: { value: 2000 }, uFogF: { value: 40000 },
};
// logaritmikus mélységpuffer a saját ShaderMaterialokhoz
export const LOGV_PARS = '#include <common>\n#include <logdepthbuf_pars_vertex>\n', LOGV = '\n#include <logdepthbuf_vertex>\n', LOGF_PARS = '#include <logdepthbuf_pars_fragment>\n', LOGF = '\n#include <logdepthbuf_fragment>\n';
// köd a nap felőli oldalon melegebb színnel (a beépített fog_fragment helyett)
export const FOG_PARS = 'uniform vec3 uSunDir; uniform vec3 uSunFog;\n';
export const FOG_FRAG = `#ifdef USE_FOG
  float fogF = smoothstep(fogNear, fogFar, vFogDepth);
  vec3 fvd = normalize(vWPos - cameraPosition); float fsd = pow(max(dot(fvd, uSunDir), 0.), 6.);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(fogColor, uSunFog, fsd * .65), fogF);
#endif`;
export const HASH = `float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ return vn(p) * .5 + vn(p * 2.03 + 7.1) * .25 + vn(p * 4.07 + 3.3) * .125 + vn(p * 8.1 + 1.7) * .0625; }
`;
// egy beépített anyagba (Lambert/Standard) világkoordinátás varying + meleg köd
export function withWorld(shader, extraU = {}) {
  Object.assign(shader.uniforms, { uSunDir: SU.uSunDir, uSunFog: SU.uSunFog, uTime: SU.uTime, uNight: SU.uNight }, extraU);
  shader.vertexShader = 'varying vec3 vWPos;\n' + shader.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  { vec4 wq = vec4(transformed, 1.);\n  #ifdef USE_INSTANCING\n  wq = instanceMatrix * wq;\n  #endif\n  vWPos = (modelMatrix * wq).xyz; }');
  shader.fragmentShader = 'varying vec3 vWPos;\n' + FOG_PARS + 'uniform float uTime; uniform float uNight;\n' + HASH + shader.fragmentShader.replace('#include <fog_fragment>', FOG_FRAG);
  return shader;
}
