/* Irányítás: billentyűzet (átállítható kiosztás), gamepad / kormány (Gamepad API), érintés (kormánygombok vagy döntés, gáz- és fékpedál). */
export const ALAP_KIOSZTAS = { gaz: ['KeyW', 'ArrowUp'], fek: ['KeyS', 'ArrowDown'], bal: ['KeyA', 'ArrowLeft'], jobb: ['KeyD', 'ArrowRight'], kezifek: ['Space'], fel: ['ShiftLeft'], le: ['ControlLeft'],
  akcio: ['KeyF', 'Enter'], duda: ['KeyH'], lampa: ['KeyL'], indexB: ['KeyQ'], indexJ: ['KeyE'], veszv: ['KeyX'], radio: ['KeyR'], radioKi: ['KeyT'], kamera: ['KeyC'], terkep: ['KeyM'], szunet: ['Escape', 'KeyP'], pedal: ['KeyV'], nezHatra: ['KeyB'] };
export const KIOSZTAS_NEV = { gaz: 'Gáz', fek: 'Fék / hátramenet', bal: 'Balra', jobb: 'Jobbra', kezifek: 'Kézifék', fel: 'Váltás fel (kézi)', le: 'Váltás le (kézi)', akcio: 'Művelet (töltés, lerakás, felállítás)', duda: 'Duda', lampa: 'Fényszóró', indexB: 'Index balra', indexJ: 'Index jobbra', veszv: 'Vészvillogó', radio: 'Rádió: következő állomás', radioKi: 'Rádió be/ki', kamera: 'Kamera', terkep: 'Térkép', szunet: 'Szünet', pedal: 'Pedálozás (moped)', nezHatra: 'Hátranézés' };
const EVT = ['akcio', 'duda', 'lampa', 'indexB', 'indexJ', 'veszv', 'radio', 'radioKi', 'kamera', 'terkep', 'szunet', 'fel', 'le'];
export function createControls(map) { const down = new Set(), events = []; let steer = 0, tilt = null, touch = { gaz: 0, fek: 0, bal: 0, jobb: 0, pedal: 0 }, gpPrev = {}, kbd = map;
  const is = a => kbd[a]?.some(c => down.has(c));
  addEventListener('keydown', e => { if (/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName || '')) return; if (!down.has(e.code)) for (const a of EVT) if (kbd[a]?.includes(e.code) && !e.repeat) events.push(a);
    down.add(e.code); if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); if (kbd.duda.includes(e.code)) events.push('dudaLe'); });
  addEventListener('keyup', e => { down.delete(e.code); if (kbd.duda.includes(e.code)) events.push('dudaFel'); });
  addEventListener('blur', () => { down.clear(); events.push('dudaFel'); });
  addEventListener('deviceorientation', e => { if (tilt === null) return; const g = (screen.orientation?.angle || 0) === 90 ? e.beta : (screen.orientation?.angle || 0) === 270 || (screen.orientation?.angle || 0) === -90 ? -e.beta : e.gamma; tilt = Math.max(-1, Math.min(1, (g || 0) / 28)); });
  function read(dt) { const I = { thr: 0, brake: 0, steer: 0, hand: 0, pedal: 0, shiftUp: 0, shiftDown: 0, horn: 0, look: 0 };
    let analog = false, st = (is('jobb') ? 1 : 0) - (is('bal') ? 1 : 0) + touch.jobb - touch.bal;
    I.thr = is('gaz') || touch.gaz ? 1 : 0; I.brake = is('fek') || touch.fek ? 1 : 0; I.hand = is('kezifek') ? 1 : 0; I.pedal = is('pedal') || touch.pedal ? 1 : 0; I.look = is('nezHatra') ? 1 : 0;
    // gamepad / kormány: bal kar vagy kormánykerék, jobb ravasz gáz, bal ravasz fék
    const gps = navigator.getGamepads?.() || []; for (const gp of gps) { if (!gp) continue; const ax = gp.axes[0] || 0; if (Math.abs(ax) > .08) { st = ax; analog = true; }
      const rt = gp.buttons[7]?.value || 0, lt = gp.buttons[6]?.value || 0; if (rt > .05) I.thr = rt; if (lt > .05) I.brake = lt; if (gp.buttons[1]?.pressed) I.hand = 1;
      const map2 = { 0: 'akcio', 2: 'kamera', 3: 'radio', 4: 'le', 5: 'fel', 9: 'szunet', 8: 'terkep', 10: 'duda', 12: 'lampa', 14: 'indexB', 15: 'indexJ' };
      for (const i in map2) { const p = !!gp.buttons[i]?.pressed, k = gp.index + ':' + i; if (p && !gpPrev[k]) { events.push(map2[i]); if (map2[i] === 'duda') events.push('dudaLe'); } if (!p && gpPrev[k] && map2[i] === 'duda') events.push('dudaFel'); gpPrev[k] = p; } }
    if (tilt !== null && !touch.bal && !touch.jobb) { st = tilt; analog = true; }
    // a billentyűzetes kormány fokozatosan tér ki és áll vissza; az analóg bemenet közvetlenül
    const tgt = Math.max(-1, Math.min(1, st)); if (analog) steer = tgt; else steer += Math.max(-dt * (tgt ? 2.6 : 4), Math.min(dt * (tgt ? 2.6 : 4), tgt - steer)); I.steer = steer;
    return I; }
  function bindTouch(root) { root.querySelectorAll('[data-t]').forEach(b => { const k = b.dataset.t, on = e => { e.preventDefault(); touch[k] = 1; b.classList.add('on'); }, off = e => { e.preventDefault(); touch[k] = 0; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off); });
    root.querySelectorAll('[data-ev]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); events.push(b.dataset.ev); if (b.dataset.ev === 'duda') { const up = () => { events.push('dudaFel'); b.removeEventListener('pointerup', up); }; b.addEventListener('pointerup', up); events.push('dudaLe'); } })); }
  return { read, events: () => events.splice(0), bindTouch, setTilt(v) { tilt = v ? 0 : null; if (v && typeof DeviceOrientationEvent?.requestPermission === 'function') DeviceOrientationEvent.requestPermission().catch(() => {}); }, setMap(m) { kbd = m; }, get map() { return kbd; } };
}
