// Részecskék (víz, permet, füst, tűz, szikra, eső-csobbanás) egyetlen pontfelhőben pool-lal; lövedékek (vízcseppek) találatvizsgálattal.
import * as THREE from 'three';
import * as W from './world.js?v=202611270936';

const VS = `attribute float size; attribute vec4 rgba; varying vec4 vC; uniform float uScale;
void main(){ vC = rgba; vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = size * uScale / max(.1,-mv.z); gl_Position = projectionMatrix * mv; }`;
const FS = `varying vec4 vC; uniform float uSoft; void main(){ vec2 d = gl_PointCoord - .5; float r = length(d); if (r > .5) discard; float a = vC.a * smoothstep(.5, .5 - uSoft, r); gl_FragColor = vec4(vC.rgb, a); }`;
function pool(scene, N, additive) {
  const g = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), size = new Float32Array(N), rgba = new Float32Array(N * 4);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('size', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('rgba', new THREE.BufferAttribute(rgba, 4).setUsage(THREE.DynamicDrawUsage));
  const m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: { uScale: { value: 600 }, uSoft: { value: additive ? .5 : .3 } }, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 5; scene.add(pts);
  const P = []; for (let i = 0; i < N; i++) P.push({ on: false });
  let next = 0; return { pts, g, P, N, m, alloc() { for (let k = 0; k < N; k++) { const i = (next + k) % N; if (!P[i].on) { next = i + 1; return P[i]; } } const p = P[next % N]; next++; return p; } };
}
export function createFX(scene) {
  const A = pool(scene, 5000, false), B = pool(scene, 2000, true), projs = [];
  const fx = {
    // vízcsepp (lövedék is lehet: dmg > 0)
    emit(o) { const pl = o.add ? B : A, p = pl.alloc(); Object.assign(p, { on: true, x: o.x, y: o.y, z: o.z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, life: 0, max: o.life || 1, s0: o.size || .3, s1: o.grow ?? o.size ?? .3,
      r: o.r ?? .7, g: o.g ?? .85, b: o.b ?? 1, a: o.a ?? .8, a1: o.a1 ?? 0, grav: o.grav ?? 9.81, drag: o.drag ?? 0, dmg: o.dmg || 0, owner: o.owner, kind: o.kind || '', hit: o.hit, floor: o.floor ?? true, splash: o.splash ?? false });
      if (p.dmg) projs.push(p); return p; },
    water(x, y, z, vx, vy, vz, n = 1, spread = .1, size = .25, dmg = 0, owner = null, kind = 'drop') { for (let i = 0; i < n; i++) { const s = Math.hypot(vx, vy, vz) * spread; fx.emit({ x, y, z, vx: vx + (Math.random() - .5) * s, vy: vy + (Math.random() - .5) * s, vz: vz + (Math.random() - .5) * s, life: 2.2, size, grow: size * 1.6, r: .72, g: .88, b: 1, a: .85, a1: .4, dmg, owner, kind, splash: true }); } },
    splash(x, y, z, n = 10, k = 1) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = (1 + Math.random() * 3) * k; fx.emit({ x, y: y + .05, z, vx: Math.cos(a) * s, vy: 2 + Math.random() * 3 * k, vz: Math.sin(a) * s, life: .5 + Math.random() * .3, size: .12 + Math.random() * .1, grow: .02, a: .8, a1: 0 }); }
      fx.emit({ x, y: y + .1, z, life: .5, size: .4 * k, grow: 1.6 * k, grav: 0, a: .45, a1: 0, r: .85, g: .93, b: 1 }); },
    smoke(x, y, z, dark = .4, k = 1) { fx.emit({ x: x + (Math.random() - .5) * .4, y, z: z + (Math.random() - .5) * .4, vx: (Math.random() - .5) * .6, vy: 1.2 + Math.random(), vz: (Math.random() - .5) * .6, life: 2.5, size: .5 * k, grow: 2.6 * k, grav: -.15, drag: .4, r: dark, g: dark, b: dark, a: .5, a1: 0, floor: false }); },
    fire(x, y, z, k = 1) { fx.emit({ add: 1, x: x + (Math.random() - .5) * .6 * k, y, z: z + (Math.random() - .5) * .6 * k, vx: 0, vy: 1.6 + Math.random() * 1.4, vz: 0, life: .55, size: .7 * k, grow: .15, grav: -1, r: 1, g: .45 + Math.random() * .3, b: .1, a: .9, a1: 0, floor: false }); },
    sparks(x, y, z, n = 12) { for (let i = 0; i < n; i++) fx.emit({ add: 1, x, y, z, vx: (Math.random() - .5) * 8, vy: Math.random() * 5, vz: (Math.random() - .5) * 8, life: .4 + Math.random() * .3, size: .08, grow: .02, r: 1, g: .8, b: .4, a: 1, a1: 0 }); },
    explosion(x, y, z) { for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, e = Math.random() * 1.4, s = 3 + Math.random() * 7; fx.emit({ add: 1, x, y: y + 1, z, vx: Math.cos(a) * Math.cos(e) * s, vy: Math.sin(e) * s + 2, vz: Math.sin(a) * Math.cos(e) * s, life: .7 + Math.random() * .5, size: 1.2, grow: 2.5, grav: 2, drag: 1.5, r: 1, g: .55 + Math.random() * .3, b: .15, a: 1, a1: 0, floor: false }); }
      for (let i = 0; i < 25; i++) fx.smoke(x + (Math.random() - .5) * 3, y + 1 + Math.random() * 2, z + (Math.random() - .5) * 3, .18, 2.2); fx.sparks(x, y + 1, z, 40); },
    steam(x, y, z) { fx.emit({ x, y, z, vx: (Math.random() - .5), vy: 1.5, vz: (Math.random() - .5), life: 1.4, size: .4, grow: 2.2, grav: -.3, drag: .5, r: .95, g: .97, b: 1, a: .35, a1: 0, floor: false }); },
    projs, onHit: null,
    update(dt, cam) {
      A.m.uniforms.uScale.value = B.m.uniforms.uScale.value = innerHeight * .9 / Math.tan(cam.fov * Math.PI / 360);
      for (const pl of [A, B]) { const pos = pl.g.attributes.position.array, sz = pl.g.attributes.size.array, c = pl.g.attributes.rgba.array; let maxI = 0;
        for (let i = 0; i < pl.N; i++) { const p = pl.P[i]; if (!p.on) { sz[i] = 0; continue; } p.life += dt; if (p.life >= p.max) { p.on = false; sz[i] = 0; continue; }
          p.vy -= p.grav * dt; if (p.drag) { const k = 1 - p.drag * dt; p.vx *= k; p.vy *= k; p.vz *= k; } p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          if (p.floor && p.vy < 0) { const gy = W.surfaceY(p.x, p.z, p.y + .3, .4); if (p.y < gy) { p.on = false; sz[i] = 0; if (p.splash && Math.random() < .35) fx.splash(p.x, gy, p.z, 3, .4); if (p.dmg && fx.onHit) fx.onHit(p, null, gy); continue; } }
          const k = p.life / p.max; pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; sz[i] = p.s0 + (p.s1 - p.s0) * k; c[i * 4] = p.r; c[i * 4 + 1] = p.g; c[i * 4 + 2] = p.b; c[i * 4 + 3] = p.a + (p.a1 - p.a) * k; maxI = i; }
        pl.g.attributes.position.needsUpdate = pl.g.attributes.size.needsUpdate = pl.g.attributes.rgba.needsUpdate = true; pl.g.setDrawRange(0, maxI + 1); }
      // lövedékek találatai (épület: elnyeli)
      for (let i = projs.length - 1; i >= 0; i--) { const p = projs[i]; if (!p.on) { projs.splice(i, 1); continue; }
        let wall = false; W.collNear(p.x, p.z, 0, c => { if (!wall && !c.rail && p.x > c.x0 && p.x < c.x1 && p.z > c.z0 && p.z < c.z1 && p.y < c.y1 && p.y > (c.y0 ?? -99)) wall = true; });
        if (wall) { p.on = false; fx.splash(p.x - p.vx * .02, p.y, p.z - p.vz * .02, 2, .3); projs.splice(i, 1); continue; }
        if (fx.onHit && fx.onHit(p)) { p.on = false; projs.splice(i, 1); } }
    }
  };
  return fx;
}
