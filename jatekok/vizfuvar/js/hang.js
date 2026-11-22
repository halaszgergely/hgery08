/* Hangok Web Audióval, előre felvett minták nélkül: kétütemű motor (pöfögés, berregés), duda, index, gumicsikorgás, szél, csattanás, víz, pénz.
   A rádió külön buszon szól (radio.js), ezt a motor nem nyomja el. */
export function createAudio() {
  let ctx = null, master, sfx, eng = null, vol = .7, muted = false;
  const NB = () => { const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; };
  function init() { if (ctx) return ctx; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); master = ctx.createGain(); master.gain.value = vol; master.connect(ctx.destination); sfx = ctx.createGain(); sfx.connect(master); return ctx; }
  function noiseSrc(loop = true) { const s = ctx.createBufferSource(); s.buffer = NB(); s.loop = loop; return s; }
  /* motor: két oszcillátor (alaphang + felhang) + zajos „pöfögés”, a gáz nyitja a szűrőt */
  function engine(type) { if (eng) { eng.stop(); eng = null; } if (!init()) return;
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), n = noiseSrc(), f = ctx.createBiquadFilter(), nf = ctx.createBiquadFilter(), g = ctx.createGain(), ng = ctx.createGain(), am = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o1.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.Q.value = 3; nf.type = 'bandpass'; nf.Q.value = 1.2; g.gain.value = 0; ng.gain.value = 0;
    lfo.type = 'square'; lg.gain.value = .55; am.gain.value = .55; lfo.connect(lg); lg.connect(am.gain);   // a kétütemű egyenetlen járása
    o1.connect(f); o2.connect(f); f.connect(am); am.connect(g); n.connect(nf); nf.connect(ng); ng.connect(am); g.connect(sfx);
    // szél és gumi
    const w = noiseSrc(), wf = ctx.createBiquadFilter(), wg = ctx.createGain(); wf.type = 'lowpass'; wf.frequency.value = 500; wg.gain.value = 0; w.connect(wf); wf.connect(wg); wg.connect(sfx);
    const s = noiseSrc(), sf = ctx.createBiquadFilter(), sg = ctx.createGain(); sf.type = 'bandpass'; sf.frequency.value = 1100; sf.Q.value = 4; sg.gain.value = 0; s.connect(sf); sf.connect(sg); sg.connect(sfx);
    [o1, o2, n, lfo, w, s].forEach(x => x.start());
    const cyl = type === 'moped' ? 1 : 2;
    eng = { update(rpm, thr, spd, skid, inside) { const t = ctx.currentTime, fr = Math.max(8, rpm / 60 * cyl);
        o1.frequency.setTargetAtTime(fr, t, .03); o2.frequency.setTargetAtTime(fr * 2.01, t, .03); lfo.frequency.setTargetAtTime(fr / (type === 'moped' ? 3 : 2), t, .05);
        f.frequency.setTargetAtTime(300 + thr * 1800 + rpm * .25, t, .05); nf.frequency.setTargetAtTime(fr * 4, t, .05);
        const on = rpm > 50 ? 1 : 0, k = inside ? .65 : 1; g.gain.setTargetAtTime(on * (.05 + thr * .1) * k * (type === 'moped' ? .8 : 1), t, .05); ng.gain.setTargetAtTime(on * (.02 + thr * .05) * k, t, .05);
        wg.gain.setTargetAtTime(Math.min(.25, spd * spd * .00012) * (inside ? .5 : 1), t, .1); sg.gain.setTargetAtTime(Math.min(.25, skid * .25), t, .05); },
      stop() { const t = ctx.currentTime; [g, ng, wg, sg].forEach(x => x.gain.setTargetAtTime(0, t, .05)); setTimeout(() => [o1, o2, n, lfo, w, s].forEach(x => { try { x.stop(); } catch (_) {} }), 300); } }; }
  function tone(f, d, type = 'sine', gv = .2, slide = 0, at = 0) { if (!init()) return; const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gv, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(sfx); o.start(t); o.stop(t + d + .02); }
  function burst(f, d, gv = .3, type = 'lowpass') { if (!init()) return; const t = ctx.currentTime, s = noiseSrc(false), fl = ctx.createBiquadFilter(), g = ctx.createGain(); fl.type = type; fl.frequency.value = f;
    g.gain.setValueAtTime(gv, t); g.gain.exponentialRampToValueAtTime(.001, t + d); s.connect(fl); fl.connect(g); g.connect(sfx); s.start(t); s.stop(t + d); }
  let horn = null;
  const fx = {
    horn(on, mop) { if (!init()) return; if (on && !horn) { const g = ctx.createGain(), a = ctx.createOscillator(), b = ctx.createOscillator(), f = ctx.createBiquadFilter(); a.type = b.type = 'square'; a.frequency.value = mop ? 520 : 390; b.frequency.value = mop ? 620 : 470; f.type = 'lowpass'; f.frequency.value = 2200;
        g.gain.value = .0; g.gain.setTargetAtTime(.09, ctx.currentTime, .01); a.connect(f); b.connect(f); f.connect(g); g.connect(sfx); a.start(); b.start(); horn = { g, a, b }; }
      else if (!on && horn) { const h = horn; horn = null; h.g.gain.setTargetAtTime(0, ctx.currentTime, .02); setTimeout(() => { h.a.stop(); h.b.stop(); }, 150); } },
    tick(hi) { tone(hi ? 1900 : 1500, .03, 'square', .05); },
    crash(k = 1) { burst(400, .5 * k + .2, .5 * Math.min(1, k)); tone(70, .3, 'sine', .4 * Math.min(1, k), -30); },
    thud() { burst(180, .25, .35); },
    water(d = 1.2) { burst(700, d, .12, 'bandpass'); for (let i = 0; i < 6; i++) tone(300 + Math.random() * 500, .12, 'sine', .05, 200, i * d / 6); },
    coin() { tone(1320, .09, 'square', .07); tone(1760, .16, 'square', .07, 0, .08); },
    click() { tone(900, .04, 'square', .04); },
    bad() { tone(220, .3, 'sawtooth', .08, -80); },
    ok() { tone(660, .1, 'sine', .12); tone(990, .18, 'sine', .12, 0, .09); },
    whistle() { if (!init()) return; const notes = [0, 2, 4, 7, 4, 2, 0, -3, 0, 4, 7, 9, 7], base = 880 + Math.random() * 200; notes.forEach((n, i) => tone(base * 2 ** (n / 12), .2, 'sine', .035, 0, i * .22)); },
    pump(on) { if (!init()) return; },
  };
  return { init, get ctx() { return ctx; }, get master() { return master; }, engine, fx,
    update: (...a) => eng?.update(...a), stopEngine() { eng?.stop(); eng = null; },
    setVol(v) { vol = v; if (master) master.gain.value = muted ? 0 : v; },
    suspend() { muted = true; if (master) master.gain.setTargetAtTime(0, ctx.currentTime, .05); }, resume() { muted = false; if (master) master.gain.setTargetAtTime(vol, ctx.currentTime, .05); } };
}
