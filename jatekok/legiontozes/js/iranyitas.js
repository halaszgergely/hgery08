/* Irányítás: billentyűzet, gamepad (Gamepad API), érintőképernyő (bal joystick, jobb gázkar + gombok), opcionálisan döntés (giroszkóp).
   Kimenet: I = { pitch, roll, yaw, thr (−1…1 változtatás), thrAbs (abszolút, mobil kar), burner, spray, brake } és egyszeri események. */
export function createControls(SET) {
  const K = new Set(), ev = [], I = { pitch: 0, roll: 0, yaw: 0, thr: 0, thrAbs: undefined, colAbs: undefined, thrDrone: 0, burner: false, spray: false, brake: false, sens: 1 };
  const T = { jx: 0, jy: 0, jOn: false, thr: null, spray: false, yawL: false, yawR: false, up: false, down: false };
  let gyro = { on: false, b0: null, g0: null, b: 0, g: 0 }, padIdx = -1, padPrev = {};
  const DISCRETE = { KeyC: 'cam', KeyM: 'map', KeyP: 'pause', Escape: 'pause', KeyG: 'gear', KeyF: 'flaps', KeyT: 'time', KeyV: 'winch', KeyH: 'help', KeyR: 'ramp', KeyN: 'mute' };
  addEventListener('keydown', e => { if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) || (e.ctrlKey && ['KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyP', 'KeyR'].includes(e.code))) e.preventDefault();
    if (!e.repeat && DISCRETE[e.code]) ev.push(DISCRETE[e.code]); K.add(e.code); });
  addEventListener('keyup', e => K.delete(e.code)); addEventListener('blur', () => K.clear());
  const k = c => K.has(c) ? 1 : 0;
  // giroszkóp (döntéses irányítás)
  addEventListener('deviceorientation', e => { if (!gyro.on || e.beta === null) return; const land = Math.abs(window.orientation || 0) === 90 || innerWidth > innerHeight;
    const b = land ? e.gamma * (window.orientation === -90 ? -1 : 1) : e.beta, g = land ? e.beta * (window.orientation === -90 ? -1 : 1) : e.gamma; if (gyro.b0 === null) { gyro.b0 = b; gyro.g0 = g; } gyro.b = b - gyro.b0; gyro.g = g - gyro.g0; });
  addEventListener('gamepadconnected', e => { padIdx = e.gamepad.index; }); addEventListener('gamepaddisconnected', () => { padIdx = -1; });
  const dz = (v, d = .12) => Math.abs(v) < d ? 0 : (v - Math.sign(v) * d) / (1 - d);
  function poll(kind) {
    const inv = SET.inv ? -1 : 1, s = SET.sens || 1;
    let pitch = (k('KeyS') - k('KeyW') + k('ArrowDown') - k('ArrowUp')) * inv, roll = k('KeyD') - k('KeyA') + k('ArrowRight') - k('ArrowLeft'), yaw = k('KeyE') - k('KeyQ');
    let thr = k('ShiftLeft') + k('ShiftRight') - k('ControlLeft') - k('ControlRight') - k('KeyZ');
    let spray = !!k('Space'), burner = !!k('Tab'), brake = !!k('KeyB') || (!!(k('ControlLeft') || k('ControlRight') || k('KeyZ'))); I.thrAbs = undefined; I.colAbs = undefined;
    // gamepad
    const pads = navigator.getGamepads ? navigator.getGamepads() : []; const p = padIdx >= 0 ? pads[padIdx] : [...pads].find(Boolean);
    if (p) { const a = p.axes, bt = i => p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > .5);
      pitch += dz(a[1] || 0) * inv; roll += dz(a[0] || 0); yaw += dz(a[2] || 0); thr += -dz(a[3] || 0) + ((p.buttons[7]?.value || 0) - (p.buttons[6]?.value || 0));
      spray = spray || bt(0); burner = burner || bt(5); brake = brake || bt(4) && false;
      const edge = (i, n) => { const v = bt(i); if (v && !padPrev[i]) ev.push(n); padPrev[i] = v; }; edge(3, 'cam'); edge(1, 'gear'); edge(2, 'flaps'); edge(9, 'pause'); edge(8, 'map'); edge(12, 'time'); }
    // érintés
    if (T.jOn) { pitch += T.jy * inv; roll += T.jx; }
    if (gyro.on) { pitch += Math.max(-1, Math.min(1, gyro.b / 25)) * inv; roll += Math.max(-1, Math.min(1, gyro.g / 30)); }
    if (T.yawL) yaw -= 1; if (T.yawR) yaw += 1; if (T.spray) spray = true;
    if (T.thr !== null) { I.thrAbs = T.thr; I.colAbs = T.thr; }
    const clamp = v => Math.max(-1, Math.min(1, v));
    I.pitch = clamp(pitch) * (kind === 'plane' || kind === 'glider' || kind === 'gyro' || kind === 'rocket' ? s : 1); I.roll = clamp(roll) * s; I.yaw = clamp(yaw); I.thr = clamp(thr); I.spray = spray; I.burner = burner; I.brake = brake;
    // drón: függőleges sebesség közvetlenül a gázkarból / Shift–Ctrl
    I.thrDrone = T.thr !== null ? (T.thr - .5) * 2 : clamp(thr); if (kind === 'drone') { I.thrAbs = undefined; I.colAbs = undefined; }
    return I; }
  function events() { return ev.splice(0); }
  // érintős vezérlők bekötése
  function bindTouch(root) { const joy = root.querySelector('#joy'), knob = root.querySelector('#knob'), thr = root.querySelector('#thr'), thrK = root.querySelector('#thrK');
    let jid = null, jc = [0, 0];
    joy.addEventListener('pointerdown', e => { jid = e.pointerId; joy.setPointerCapture(jid); const r = joy.getBoundingClientRect(); jc = [r.left + r.width / 2, r.top + r.height / 2]; T.jOn = true; move(e); });
    const move = e => { if (e.pointerId !== jid) return; const r = joy.getBoundingClientRect().width / 2, dx = (e.clientX - jc[0]) / r, dy = (e.clientY - jc[1]) / r, l = Math.hypot(dx, dy), s = l > 1 ? 1 / l : 1; T.jx = dx * s; T.jy = dy * s; knob.style.transform = `translate(${T.jx * r * .6}px,${T.jy * r * .6}px)`; };
    joy.addEventListener('pointermove', move); const up = e => { if (e.pointerId !== jid) return; jid = null; T.jOn = false; T.jx = T.jy = 0; knob.style.transform = ''; }; joy.addEventListener('pointerup', up); joy.addEventListener('pointercancel', up);
    let tid = null; const tset = e => { const r = thr.getBoundingClientRect(), v = 1 - Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)); T.thr = v; thrK.style.bottom = (v * 100) + '%'; };
    thr.addEventListener('pointerdown', e => { tid = e.pointerId; thr.setPointerCapture(tid); tset(e); }); thr.addEventListener('pointermove', e => { if (e.pointerId === tid) tset(e); }); thr.addEventListener('pointerup', () => { tid = null; });
    const hold = (sel, key) => { const el = root.querySelector(sel); if (!el) return; el.addEventListener('pointerdown', e => { e.preventDefault(); T[key] = true; el.classList.add('on'); }); for (const n of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(n, () => { T[key] = false; el.classList.remove('on'); }); };
    hold('#tSpray', 'spray'); hold('#tYawL', 'yawL'); hold('#tYawR', 'yawR');
    root.querySelectorAll('[data-ev]').forEach(b => b.addEventListener('click', () => ev.push(b.dataset.ev)));
    return { setThr(v) { T.thr = v; thrK.style.bottom = (v * 100) + '%'; } }; }
  return { poll, events, bindTouch, setGyro(on) { gyro.on = on; gyro.b0 = null; if (on && typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().catch(() => {}); },
    get touchThr() { return T.thr; }, resetTouchThr() { T.thr = null; }, push(e) { ev.push(e); } };
}
