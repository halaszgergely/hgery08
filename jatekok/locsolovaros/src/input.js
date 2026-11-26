// Billentyűzet, egér (pointer lock), gamepad – egységes akció-állapot. Konami-kód figyelése.
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
export function createInput(canvas) {
  const keys = new Set(), pressed = new Set(), I = { mx: 0, my: 0, wheel: 0, lmb: false, rmb: false, lmbP: false, rmbP: false, pad: null, locked: false, onKonami: null, block: false, sens: 1, invert: false, lastDevice: 'kb' };
  let kseq = [];
  addEventListener('keydown', e => {
    if (e.code === 'F11') return;   // böngésző-teljesképernyő
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) || (e.code === 'KeyF' && !e.ctrlKey)) e.preventDefault();
    if (!e.repeat) { pressed.add(e.code); kseq.push(e.code); kseq = kseq.slice(-10); if (kseq.join() === KONAMI.join()) { kseq = []; I.onKonami?.(); } }
    keys.add(e.code); I.lastDevice = 'kb';
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => { keys.clear(); I.lmb = I.rmb = false; });
  canvas.addEventListener('mousedown', e => { if (e.button === 0) { I.lmb = true; I.lmbP = true; } if (e.button === 2) { I.rmb = true; I.rmbP = true; } if (!I.locked && !I.block) canvas.requestPointerLock?.(); });
  addEventListener('mouseup', e => { if (e.button === 0) I.lmb = false; if (e.button === 2) I.rmb = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('mousemove', e => { if (I.locked) { I.mx += e.movementX; I.my += e.movementY; } I.lastDevice = 'kb'; });
  canvas.addEventListener('wheel', e => { I.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  document.addEventListener('pointerlockchange', () => { I.locked = document.pointerLockElement === canvas; });
  const dz = v => Math.abs(v) < .16 ? 0 : (v - Math.sign(v) * .16) / .84;
  let padPrev = [];
  I.poll = () => {
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [], p = pads[0];
    I.pad = null; if (p) { const b = i => p.buttons[i] ? p.buttons[i].value : 0, bp = i => b(i) > .5 && !(padPrev[i] > .5);
      I.pad = { lx: dz(p.axes[0] || 0), ly: dz(p.axes[1] || 0), rx: dz(p.axes[2] || 0), ry: dz(p.axes[3] || 0), lt: b(6), rt: b(7), a: b(0), bb: b(1), x: b(2), y: b(3), lb: b(4), rb: b(5),
        pa: bp(0), pb: bp(1), px: bp(2), py: bp(3), plb: bp(4), prb: bp(5), pback: bp(8), pstart: bp(9), pup: bp(12), pdown: bp(13), pleft: bp(14), pright: bp(15), pr3: bp(11) };
      if (Object.values(I.pad).some(v => v && v !== 0)) I.lastDevice = 'pad'; padPrev = p.buttons.map(x => x.value); }
  };
  I.down = c => !I.block && keys.has(c);
  I.hit = c => !I.block && pressed.has(c);
  I.hitAny = (...c) => c.some(I.hit);
  I.consume = c => { pressed.delete(c); };
  I.endFrame = () => { pressed.clear(); I.mx = I.my = 0; I.wheel = 0; I.lmbP = I.rmbP = false; };
  /* összesített tengelyek */
  I.axes = () => { const P = I.pad || {}, k = c => I.down(c) ? 1 : 0;
    return { fwd: clamp1(k('KeyW') - k('KeyS') - (P.ly || 0)), side: clamp1(k('KeyD') - k('KeyA') + (P.lx || 0)), thr: Math.max(k('KeyW'), P.rt || 0), brk: Math.max(k('KeyS'), P.lt || 0), steer: clamp1(k('KeyA') - k('KeyD') - (P.lx || 0)),
      sprint: I.down('ShiftLeft') || (P.a > .5 && !(P.lt > .3)) || false, jump: I.hit('Space') || P.px || false, hand: I.down('Space') || (P.a > .5) || false,
      up: Math.max(k('Space'), P.rb || 0), down: Math.max(k('ShiftLeft') || k('ControlLeft') ? 1 : 0, P.lb || 0), fire: I.lmb || (P.rt > .5), aim: I.rmb || (P.lt > .5) }; };
  return I;
}
const clamp1 = v => v < -1 ? -1 : v > 1 ? 1 : v;
