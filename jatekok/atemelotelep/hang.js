// Az Átemelőtelep – hang (WebAudio, minden szintetizált, nincs letöltendő hangfájl).
// Csatornák: fő → zene / effektek. A gépek (szivattyú, aggregát, fénycső, sziréna) és a fontos egyszeri hangok térben szólnak (PannerNode).
export function createAudio(SET, caption) {
  let ac = null, mst, mus, fx, nz = null, lis = null; const loops = {}, P = {}, VAL = {};
  const ctx = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); mst = ac.createGain(); mst.connect(ac.destination); mus = ac.createGain(); mus.connect(mst); fx = ac.createGain(); fx.connect(mst); lis = ac.listener;
      const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0); let br = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; br = (br + .02 * w) / 1.02; d[i] = i % 2 ? w : w * .6 + br * 3; } nz = b; vol(); } catch (_) { ac = null; } }
    if (ac && ac.state === 'suspended') ac.resume(); return ac; };
  const vol = () => { if (!ac) return; mst.gain.value = SET.vol; mus.gain.value = SET.mus; fx.gain.value = SET.sfx; };
  // térhatás: egy forrás kimenete egy pannerre, a panner az effekt-buszra
  const panner = (x, y, z, ref = 2, roll = 1.2) => { const p = ac.createPanner(); p.panningModel = 'equalpower'; p.distanceModel = 'inverse'; p.refDistance = ref; p.rolloffFactor = roll; p.maxDistance = 80;
    if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z); p.connect(fx); return p; };
  const dest = pos => pos ? panner(pos[0], pos[1], pos[2], pos[3] || 2) : fx;
  const noise = (f, q, type, dur, v, dly = 0, pos) => { if (!ctx()) return; const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime + dly; s.buffer = nz; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .008); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(fl); fl.connect(g); g.connect(dest(pos)); s.start(t, Math.random()); s.stop(t + dur + .05); };
  const tone = (f0, f1, dur, v, type = 'sine', dly = 0, pos) => { if (!ctx()) return; const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + dly; o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(dest(pos)); o.start(t); o.stop(t + dur + .05); };
  // folyamatos hangok; a pos-os hurkok térben szólnak
  const loop = (k, mk, pos, bus) => { if (loops[k] || !ctx()) return loops[k]; const g = ac.createGain(); g.gain.value = 0; g.connect(pos ? panner(...pos) : bus || fx); mk(g); return loops[k] = g; };
  const nLoop = (k, f, q, type, pos, lfo) => loop(k, g => { const s = ac.createBufferSource(), fl = ac.createBiquadFilter(); s.buffer = nz; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; s.connect(fl); fl.connect(g); s.start();
    if (lfo) { const o = ac.createOscillator(), og = ac.createGain(); o.frequency.value = lfo[0]; og.gain.value = lfo[1]; o.connect(og); og.connect(fl.frequency); o.start(); } }, pos);
  const oLoop = (k, fs, lp, pos, bus, am) => loop(k, g => { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; fl.connect(g);
    for (const [f, t, v] of fs) { const o = ac.createOscillator(), og = ac.createGain(); o.type = t; o.frequency.value = f; og.gain.value = v; o.connect(og); og.connect(fl); o.start(); }
    if (am) { const o = ac.createOscillator(), og = ac.createGain(); o.frequency.value = am[0]; og.gain.value = am[1]; o.connect(og); og.connect(g.gain); o.start(); } }, pos, bus);
  const MAKE = {
    rain: () => { nLoop('rain', 2400, .3, 'highpass', null, [.13, 500]); },
    rainLow: () => nLoop('rainLow', 500, .5, 'lowpass', null, [.07, 120]),
    wind: () => nLoop('wind', 420, 1.1, 'bandpass', null, [.09, 260]),
    pump: () => oLoop('pump', [[49.5, 'sawtooth', .5], [99, 'sine', .35], [148, 'square', .04], [297, 'triangle', .03]], 520, [8, -2.5, -8, 2.5], null, [12.4, .08]),
    pump2: () => nLoop('pump2', 900, 3, 'bandpass', [8, -2.5, -8, 2.5], [6, 200]),
    hum: () => oLoop('hum', [[100, 'sine', .6], [200, 'sine', .2], [300, 'square', .01]], 700, [-12, 2.4, -1, 1.2]),
    gen: () => oLoop('gen', [[24.5, 'sawtooth', .8], [49, 'square', .15], [73.5, 'sawtooth', .12]], 340, [-23, 1.2, -19.5, 3], null, [8.2, .15]),
    genN: () => nLoop('genN', 260, 1.4, 'bandpass', [-21, 3, -18, 3], [3, 60]),
    siren: () => oLoop('siren', [[700, 'triangle', .5], [1400, 'sine', .08]], 2400, [-12, 2.9, -1, 6], null, [2.2, .4]),
    fan: () => nLoop('fan', 700, .8, 'bandpass', [10.8, .7, -5.2, 1.5], [17, 80]),
    music: () => loop('music', g => { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 420; fl.Q.value = 4; fl.connect(g); const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = .045; lg.gain.value = 260; lfo.connect(lg); lg.connect(fl.frequency); lfo.start();
      for (const [f, d] of [[55, 0], [55.4, 0], [82.4, .3], [110.6, 0], [65.4, -.2]]) { const o = ac.createOscillator(), og = ac.createGain(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = d * 20; og.gain.value = .07; o.connect(og); og.connect(fl); o.start(); } P.musF = fl; }, null, mus)
  };
  const CAP = { slam: 'ajtócsapódás', hatch: 'fémfedél csattan', far: 'lépések a távolban', thunder: 'mennydörgés', zap: 'elektromos kisülés', engine: 'a dízelmotor beindul', gas2: 'gázriasztás (A2)', relay: null, door: 'ajtónyikorgás', splash: 'csobbanás' };
  return { ctx, vol,
    // hallgató a kamera helyén, a nézési irányban
    listen(x, y, z, yaw) { if (!ac || !lis) return; if (Math.abs(x - (P.lx ?? 1e9)) + Math.abs(y - P.ly) + Math.abs(z - P.lz) + Math.abs(yaw - P.lyaw) < .01) return; P.lx = x; P.ly = y; P.lz = z; P.lyaw = yaw; const fx_ = -Math.sin(yaw), fz = -Math.cos(yaw), t = ac.currentTime;
      if (lis.positionX) { lis.positionX.setTargetAtTime(x, t, .05); lis.positionY.setTargetAtTime(y, t, .05); lis.positionZ.setTargetAtTime(z, t, .05); lis.forwardX.value = fx_; lis.forwardY.value = 0; lis.forwardZ.value = fz; lis.upX.value = 0; lis.upY.value = 1; lis.upZ.value = 0; }
      else { lis.setPosition(x, y, z); lis.setOrientation(fx_, 0, fz, 0, 1, 0); } },
    // csak akkor ütemezünk új hangerő-változást, ha az érték tényleg változott (különben minden képkocka új automatizálási eseményt tenne a sorba)
    set(k, v, tc = .3) { if (!ac || (VAL[k] !== undefined && Math.abs(VAL[k] - v) < .002)) return; if (!v && !loops[k]) return; const g = loops[k] || (MAKE[k] && (MAKE[k](), loops[k])); if (g) { g.gain.setTargetAtTime(v, ac.currentTime, tc); VAL[k] = v; } },
    music(tension) { if (!ac) return; this.set('music', .55); if (P.musF) P.musF.Q.value = 3 + tension * 8; },
    sfx(n, pos) { if (!ctx()) return; if (CAP[n] && caption) caption(CAP[n]);
      ({ click: () => noise(3200, 2, 'bandpass', .045, .25, 0, pos), relay: () => { noise(2600, 3, 'bandpass', .035, .3, 0, pos); noise(1200, 3, 'bandpass', .04, .22, .028, pos); },
        clunk: () => { noise(420, 1, 'lowpass', .16, .5, 0, pos); tone(120, 58, .13, .3, 'sine', 0, pos); },
        zap: () => { noise(4200, .5, 'highpass', .28, .6, 0, pos); tone(900, 60, .22, .2, 'sawtooth', 0, pos); noise(160, 1, 'lowpass', .5, .4, .05, pos); },
        pick: () => { tone(660, 990, .12, .16); tone(990, 1320, .14, .13, 'sine', .08); }, beep: () => tone(2800, 2800, .09, .15, 'square'),
        tick: () => noise(5200, 4, 'bandpass', .02, .1), crank: () => { noise(160, 2, 'bandpass', .14, .35, 0, pos); tone(70, 60, .12, .2, 'sawtooth', 0, pos); },
        engine: () => { tone(40, 26, 1.3, .5, 'sawtooth', 0, pos); noise(200, 1, 'lowpass', 1.1, .45, 0, pos); },
        door: () => { tone(230, 150, .55, .1, 'sawtooth', 0, pos); tone(310, 240, .4, .05, 'triangle', .1, pos); noise(300, 2, 'bandpass', .5, .15, 0, pos); },
        slam: () => { noise(250, 1, 'lowpass', .55, .9, 0, pos); tone(70, 38, .45, .5, 'sine', 0, pos); noise(2000, 2, 'bandpass', .08, .2, 0, pos); },
        hatch: () => { noise(180, 1, 'lowpass', .7, 1, 0, pos); tone(55, 34, .6, .6, 'square', 0, pos); tone(420, 380, .9, .05, 'triangle', .02, pos); },
        thunder: () => { noise(140, .7, 'lowpass', 3.8, .9, .3); noise(60, .7, 'lowpass', 4.2, .7, .8); noise(900, .5, 'lowpass', .25, .3, .25); },
        step: () => noise(240 + Math.random() * 60, 1.2, 'lowpass', .08, .09), stepG: () => { noise(1900 + Math.random() * 600, 2, 'bandpass', .07, .05); noise(260, 1.2, 'lowpass', .08, .07); },
        stepM: () => { noise(1800, 6, 'bandpass', .06, .08); noise(300, 2, 'lowpass', .06, .06); }, ladder: () => { noise(1500, 8, 'bandpass', .12, .12); tone(520, 500, .15, .04, 'triangle'); },
        far: () => { for (let i = 0; i < 4; i++) noise(200, 1, 'lowpass', .12, .25, i * .55, pos); }, drip: () => tone(1800 + Math.random() * 1500, 600, .08, .06, 'sine', 0, pos),
        splash: () => { noise(700, .8, 'lowpass', .55, .32, 0, pos); noise(2500, 1, 'bandpass', .3, .1, .05, pos); }, valve: () => noise(900, 6, 'bandpass', .3, .12, 0, pos),
        gas1: () => tone(2900, 2900, .12, .12, 'square'), gas2: () => { tone(3200, 3200, .08, .16, 'square'); tone(3200, 3200, .08, .16, 'square', .14); } }[n] || (() => {}))(); } };
}
