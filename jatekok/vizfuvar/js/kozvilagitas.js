/* Közvilágítás: lámpaoszlopok a belterületi utak mentén a jármű körül (instanced), éjjel világító lámpafejek,
   fényfoltok az úton, és a legközelebbi néhány lámpa valódi pontfénnyel. */
import * as THREE from 'three';

const MAX = 1400, NL = 4;
export function createStreetLights(scene, osm, ground, SU) {
  const root = new THREE.Group(); scene.add(root);
  const steel = new THREE.MeshStandardMaterial({ color: 0x5d646b, metalness: .5, roughness: .55 });
  const headM = new THREE.MeshStandardMaterial({ color: 0x30343a, emissive: new THREE.Color(1, .72, .38), emissiveIntensity: 0, roughness: .4 });
  // helyi keret: talpponttól +X az út felé
  const pole = new THREE.CylinderGeometry(.07, .11, 8, 8).translate(0, 4, 0);
  const arm = new THREE.CylinderGeometry(.045, .045, 1.9, 6).rotateZ(Math.PI / 2 - .12).translate(.92, 8.05, 0);
  const head = new THREE.BoxGeometry(.7, .14, .3).translate(1.85, 8.1, 0);
  const tex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.45, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const poolM = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1, .7, .38), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: true });
  const pool = new THREE.PlaneGeometry(18, 18).rotateX(-Math.PI / 2).translate(1.85, 0, 0);
  const mk = (g, m, sh) => { const o = new THREE.InstancedMesh(g, m, MAX); o.count = 0; o.castShadow = sh; o.frustumCulled = false; root.add(o); return o; };
  const iPole = mk(pole, steel, true), iArm = mk(arm, steel, false), iHead = mk(head, headM, false), iPool = mk(pool, poolM, false);
  iPool.renderOrder = 2;
  const lights = []; for (let i = 0; i < NL; i++) { const l = new THREE.PointLight(0xffb565, 0, 28, 1.6); scene.add(l); lights.push(l); }
  let pts = [], last = null, t = 0;
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), S1 = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
  const hash = (x, z) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };
  function rebuild(p) { const segs = osm.segsNear(p.x, p.z, 520), seen = new Set(); pts = [];
    for (let i = 0; i < segs.length && pts.length < MAX; i += 8) { const f = segs[i + 6]; if (!(f & 32) || (f & 8) || segs[i + 5] >= 5) continue;
      const ax = segs[i], az = segs[i + 1], bx = segs[i + 2], bz = segs[i + 3], L = Math.hypot(bx - ax, bz - az); if (L < 6) continue; const ux = (bx - ax) / L, uz = (bz - az) / L, w = segs[i + 4];
      const side = hash(Math.round(ax), Math.round(az)) < .5 ? 1 : -1, off = w / 2 + 1.1;
      for (let s = Math.min(L / 2, 12); s < L; s += 34) { const cx = ax + ux * s, cz = az + uz * s, x = cx - uz * off * side, z = cz + ux * off * side, k = Math.round(x / 22) + ':' + Math.round(z / 22);
        if (seen.has(k)) continue; seen.add(k); pts.push([x, z, 0, cx, cz]); } }
    let n = 0; for (const [x, z, , cx, cz] of pts) { const yaw = Math.atan2(-(cz - z), cx - x); Q.setFromAxisAngle(Y, yaw); P.set(x, ground(x, z) - .05, z); M4.compose(P, Q, S1);
      iPole.setMatrixAt(n, M4); iArm.setMatrixAt(n, M4); iHead.setMatrixAt(n, M4); P.y = ground(cx, cz) + .32; M4.compose(P, Q, S1); iPool.setMatrixAt(n, M4); n++; }
    for (const o of [iPole, iArm, iHead, iPool]) { o.count = n; o.instanceMatrix.needsUpdate = true; } last = { x: p.x, z: p.z }; }
  return {
    update(p, dt) { t -= dt; if (t <= 0 && (!last || Math.hypot(p.x - last.x, p.z - last.z) > 60 || pts.length === 0)) { t = 1.2; rebuild(p); }
      const nt = SU.uNight.value; headM.emissiveIntensity = nt * 3.2; poolM.opacity = nt * .34; iPool.visible = nt > .03;
      // a legközelebbi lámpák pontfénnyel (a lámpafej alatt)
      const near = nt > .03 ? pts.map(q => [Math.hypot(q[0] - p.x, q[1] - p.z), q]).sort((a, b) => a[0] - b[0]).slice(0, NL) : [];
      for (let i = 0; i < NL; i++) { const l = lights[i], q = near[i]?.[1]; if (!q || near[i][0] > 90) { l.intensity = 0; continue; } const yaw = Math.atan2(-(q[4] - q[1]), q[3] - q[0]), hx = q[0] + Math.cos(yaw) * 1.85, hz = q[1] - Math.sin(yaw) * 1.85;
        l.position.set(hx, ground(hx, hz) + 7.6, hz); l.intensity = nt * 45; } },
    clear() { pts = []; last = null; for (const o of [iPole, iArm, iHead, iPool]) o.count = 0; for (const l of lights) l.intensity = 0; } };
}
