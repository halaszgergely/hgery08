/* Titkos jelenet: a győri Széchenyi István Egyetem udvarán egy HGWS hordozórakéta áll az indítóállványon.
   Ha a játékos elég közel ér, 10 másodperces visszaszámlálás indul, majd kilövés: láng, füst, dübörgés, rázkódó kamera,
   a rakéta függőlegesen emelkedik, aztán lassan megdől és eltűnik az égen. Távolodás után újra élesedik. Pontot nem ad. */
import * as THREE from 'three';
import { P, NEVEZETES, SZIN } from './config.js?v=202611221527';
import { ground } from './geo.js?v=202611221527';

export function createRocket(scene, { hud, audio }) {
  const [PX, PZ] = P(NEVEZETES.raketa[0], NEVEZETES.raketa[1]), root = new THREE.Group(); root.position.set(PX, 0, PZ); scene.add(root);
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .45, metalness: .15, ...o });
  const add = (par, geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; par.add(o); return o; };
  // indítóállás: betonplató, lángterelő árok, rácsos szerelőtorony
  add(root, new THREE.CylinderGeometry(26, 28, 1.2, 32), M(0x9a9893), 0, .6, 0); add(root, new THREE.BoxGeometry(8, 1.4, 22), M(0x2a2a2a), 0, .75, 9);
  const tw = new THREE.Group(); tw.position.set(-9, 1.2, 0); root.add(tw); const red = M(0xb3362a, { metalness: .5 }), steel = M(0x8c9196, { metalness: .7, roughness: .35 });
  for (const [x, z] of [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]]) add(tw, new THREE.BoxGeometry(.6, 64, .6), red, x, 32, z);
  for (let y = 4; y < 64; y += 4) { add(tw, new THREE.BoxGeometry(4.8, .35, .35), red, 0, y, -2.2); add(tw, new THREE.BoxGeometry(4.8, .35, .35), red, 0, y, 2.2); add(tw, new THREE.BoxGeometry(.35, .35, 4.8), red, -2.2, y, 0); }
  const arms = [18, 34, 48].map(y => add(tw, new THREE.BoxGeometry(6.5, .8, 1.4), steel, 5.2, y, 0));
  add(tw, new THREE.CylinderGeometry(.25, .25, 8, 6), steel, 0, 68, 0); const beacon = add(tw, new THREE.SphereGeometry(.6, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, .3, .2) }), 0, 72.2, 0);
  // a rakéta (két fokozat, orrkúp, vezérsíkok, HGWS felirat)
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 512; const cx = cv.getContext('2d'); cx.fillStyle = '#f2f2ee'; cx.fillRect(0, 0, 128, 512);
  for (let i = 0; i < 4; i++) { cx.fillStyle = i % 2 ? '#1a1a1a' : '#f2f2ee'; cx.fillRect(i * 32, 380, 32, 132); } cx.fillStyle = '#1f7a3a'; cx.fillRect(0, 0, 128, 26);
  cx.save(); cx.translate(78, 60); cx.rotate(Math.PI / 2); cx.fillStyle = '#1f7a3a'; cx.font = '900 46px Inter, Arial'; cx.fillText('HGWS', 0, 0); cx.restore();
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const rk = new THREE.Group(); rk.position.y = 1.2; root.add(rk);
  add(rk, new THREE.CylinderGeometry(2.3, 2.3, 30, 28), M(0xffffff, { map: tex }), 0, 15, 0);
  add(rk, new THREE.CylinderGeometry(2.3, 2.3, 2, 28), M(0x1a1a1a), 0, 31, 0); add(rk, new THREE.CylinderGeometry(2.0, 2.3, 1.5, 28), M(0xd8d8d2), 0, 32.7, 0);
  add(rk, new THREE.CylinderGeometry(2.0, 2.0, 13, 28), M(0xf0f0ea), 0, 40, 0); add(rk, new THREE.CylinderGeometry(2.0, 2.0, 1.2, 28), M(SZIN.sarga), 0, 45, 0);
  // hasznos teher: műhold az orrkúp (két félből álló burkolat) alatt
  const sat = new THREE.Group(); sat.position.y = 47.5; rk.add(sat); add(sat, new THREE.BoxGeometry(1.3, 1.6, 1.3), M(0xc9a443, { metalness: .8, roughness: .3 }));
  for (const s of [-1, 1]) { const pnl = add(sat, new THREE.BoxGeometry(.05, 1.4, 1.2), M(0x1c2f6b, { metalness: .4, roughness: .25 }), s * .7, 0, 0); pnl.userData.s = s; sat.userData[s] = pnl; }
  add(sat, new THREE.CylinderGeometry(.06, .06, 1.2, 6), steel, 0, 1.3, 0);
  const halves = [0, Math.PI].map(a0 => { const h = new THREE.Group(); h.position.y = 45.6; rk.add(h);
    add(h, new THREE.LatheGeometry(Array.from({ length: 14 }, (_, i) => i < 4 ? new THREE.Vector2(2.0, i / 3 * 3) : new THREE.Vector2(2.0 * Math.cos((i - 3) / 10 * Math.PI / 2) ** .8, 3 + (i - 3) / 10 * 8)), 28, a0, Math.PI), M(0xf0f0ea, { side: THREE.DoubleSide }));
    return h; });
  // a műhold-logó a burkolaton: img/szesat.png, ha a repóba kerül (különben a burkolat üres)
  new THREE.TextureLoader().load('img/szesat.png', t => { t.colorSpace = THREE.SRGBColorSpace; const ar = t.image.width / t.image.height, w = 2.6, m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
    for (const [h, a] of [[halves[0], Math.PI / 2], [halves[1], -Math.PI / 2]]) { const d = new THREE.Mesh(new THREE.PlaneGeometry(w, w / ar), m); d.position.set(Math.sin(a) * 2.02, 1.6, Math.cos(a) * 2.02); d.rotation.y = a; h.add(d); } }, undefined, () => {});
  for (let a = 0; a < 4; a++) { const f = add(rk, new THREE.BoxGeometry(.3, 6, 3.6), M(SZIN.zold), 0, 3, 0); f.geometry = f.geometry.clone().translate(0, 0, 3.6); f.rotation.y = a * Math.PI / 2 + Math.PI / 4; }
  for (let i = 0; i < 5; i++) add(rk, new THREE.CylinderGeometry(.55, .8, 1.4, 12), steel, i ? Math.cos(i * 1.57) * 1.3 : 0, -.4, i ? Math.sin(i * 1.57) * 1.3 : 0);
  // láng és füst
  const flameM = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 2.4, .7), transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending }), flame = add(rk, new THREE.ConeGeometry(2.6, 26, 18, 1, true).translate(0, -13, 0).rotateX(Math.PI), flameM, 0, -1, 0);
  const core = add(rk, new THREE.ConeGeometry(1.4, 12, 14, 1, true).translate(0, -6, 0).rotateX(Math.PI), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 7, 5), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), 0, -1, 0);
  flame.castShadow = core.castShadow = false; flame.visible = core.visible = false;
  const light = new THREE.PointLight(0xffa040, 0, 900, 1.6); rk.add(light);
  const SN = 1200, smoke = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: 0xdedbd5, transparent: true, opacity: .62, depthWrite: false }), SN); smoke.frustumCulled = false; smoke.count = SN; scene.add(smoke);
  const sp = Array.from({ length: SN }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 0 })), MX = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(); let sk = 0;
  for (let i = 0; i < SN; i++) smoke.setMatrixAt(i, MX.makeScale(0, 0, 0));
  const puff = (pos, vel, s) => { const q = sp[sk = (sk + 1) % SN]; q.life = 1; q.p.copy(pos); q.v.copy(vel); q.s = s; };
  // állapot
  let lastW = null, st = 'idle', t = 0, last = -1, y = 0, vy = 0, tilt = 0, base = 0, gT = 0;
  const cd = document.querySelector('#cd'), W = new THREE.Vector3(), V = new THREE.Vector3();
  const show = txt => { if (!cd) return; cd.textContent = txt; cd.hidden = !txt; cd.classList.remove('pop'); void cd.offsetWidth; cd.classList.add('pop'); };
  function reset() { lastW = null; halves.forEach((h, i) => { h.position.set(0, 45.6, 0); h.rotation.set(0, 0, 0); h.visible = true; }); sat.position.set(0, 47.5, 0); sat.rotation.set(0, 0, 0); for (const s of [-1, 1]) { sat.userData[s].scale.z = 1; sat.userData[s].position.x = s * .7; } st = 'idle'; t = 0; last = -1; y = 0; vy = 0; tilt = 0; rk.position.set(0, 1.2, 0); rk.rotation.set(0, 0, 0); rk.visible = true; flame.visible = core.visible = false; light.intensity = 0; arms.forEach(a => a.rotation.y = 0); show(''); }
  function update(dt, b) { if (!b) return 0; gT -= dt; if (gT <= 0 && st === 'idle') { gT = 1; base = ground(PX, PZ) - .3; root.position.y = base; }
    const dh = Math.hypot(b.pos.x - PX, b.pos.z - PZ), agl = b.pos.y - base; beacon.visible = (performance.now() % 1200) < 600; let shake = 0;
    if (st === 'idle') { if (dh < 650 && agl < 900) { st = 'count'; t = 10.999; hud.say('Széchenyi István Egyetem – indítóállás élesítve', 'big', 3200); } }
    else if (st === 'count') { t -= dt; const n = Math.floor(t); if (n !== last) { last = n; if (n > 0) { show(String(n)); audio.fx.tick?.(false); } if (n === 3) arms.forEach(a => a.rotation.y = -.9); }
      if (t < 3) for (let i = 0; i < 2; i++) puff(W.set(PX + (Math.random() - .5) * 6, base + 1, PZ + 9 + Math.random() * 8), V.set((Math.random() - .5) * 6, 2 + Math.random() * 3, 12 + Math.random() * 10), 3);
      if (t <= 0) { st = 'fire'; t = 0; show('KILÖVÉS!'); audio.fx.tick?.(true); audio.fx.launch?.(Math.max(.25, 1 - dh / 4000)); flame.visible = core.visible = true; } }
    else if (st === 'fire') { t += dt; if (t > 1.6 && cd && !cd.hidden) show('');
      const thrust = t < 1.5 ? 0 : Math.min(26, 6 + (t - 1.5) * 1.4); vy += (thrust - 0) * dt * (t < 1.5 ? 0 : 1); y += vy * dt; if (y > 600) tilt = Math.min(1.1, tilt + dt * .025);
      rk.position.set(Math.sin(tilt) * y * .35, 1.2 + y, 0); rk.rotation.z = -tilt;
      const f = .85 + Math.random() * .3; flame.scale.set(f, f * (1 + Math.min(2.5, y / 400)), f); core.scale.set(f, f, f); light.intensity = 4000 * f;
      rk.getWorldPosition(W); if (!lastW) lastW = W.clone(); const low = y < 30, n = low ? Math.min(5, Math.round(dt * 120)) : Math.min(10, Math.ceil(W.distanceTo(lastW) / 7)); for (let i = 0; i < n; i++) { const k = (i + Math.random()) / n;
        puff(V.lerpVectors(lastW, W, k).add(new THREE.Vector3((Math.random() - .5) * 3, -2, (Math.random() - .5) * 3)), new THREE.Vector3((Math.random() - .5) * (low ? 30 : 4), low ? 2 : -vy * .25 - 4, (Math.random() - .5) * (low ? 30 : 4) + (low ? 18 : 0)), low ? 4 : 3); }
      // burkolatledobás 6 km felett: a két fél szétnyílik, a műhold kiválik és kinyitja a napelemeit
      if (y > 6000) { const k = Math.min(1, (y - 6000) / 1500); halves.forEach((h, i) => { const s = i ? -1 : 1; h.position.set(0, 45.6 - k * 25, s * k * 40); h.rotation.x = s * k * 1.6; h.visible = k < 1; });
        sat.position.y = 47.5 + k * 30; for (const s of [-1, 1]) { const pn = sat.userData[s]; pn.scale.z = 1; pn.position.x = s * (.7 + k * 1.6); pn.scale.set(1, 1, 1 + k * 2.5); } sat.rotation.y += dt * .3; }
      lastW.copy(W); shake = Math.max(0, 1 - dh / 2500) * (t < 1.5 ? t : 1.5) * Math.max(0, 1 - y / 4000);
      if (y > 30000 || t > 120) { rk.visible = false; light.intensity = 0; st = 'gone'; hud.say('A SZESAT műhold pályára állt. Öntözés: már az űrből is.', 'ok', 4000); } }
    else if (st === 'gone') { if (dh > 6000) reset(); }
    // füst
    for (let i = 0; i < SN; i++) { const q = sp[i]; if (q.life <= 0) continue; q.life -= dt / 9; q.v.multiplyScalar(Math.max(0, 1 - dt * .6)); q.v.y += dt * .6; q.p.addScaledVector(q.v, dt);
      const s = q.life > 0 ? q.s * (1 + (1 - q.life) * 7) : 0; smoke.setMatrixAt(i, MX.compose(q.p, Q, S.set(s, s * .85, s))); }
    smoke.instanceMatrix.needsUpdate = true; return shake; }
  return { update, reset, get state() { return st; } };
}
