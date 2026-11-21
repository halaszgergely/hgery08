/* Hangok Web Audio API-val, mintafájl nélkül. Géptípusonként más motorhang:
   prop (légcsavar), radial (csillagmotor), turboprop, jet / jet4 (sugárhajtómű + utánégető), rotor (rotorcsapkodás), coax (Ka-26 dübörgés),
   tandem, drone (zümmögés), airship, rocket, glider (csak szél). Ezen felül szél, permet, vízfelszedés, hangrobbanás, figyelmeztetések. */
export function createAudio() {
  let ctx = null, master = null, voice = null, wind = null, spray = null, vol = .7, muted = false, type = '';
  const noiseBuf = () => { const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; l = (l + .02 * w) / 1.02; d[i] = w * .5 + l * 3; } return b; };
  let NB = null;
  function noise(f, q = 1, t = 'lowpass') { const s = ctx.createBufferSource(); s.buffer = NB; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = t; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); s.start(); return { s, f: fl, g }; }
  function osc(t, f) { const o = ctx.createOscillator(); o.type = t; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = 0; o.connect(g); o.start(); return { o, g }; }
  function init() { if (ctx) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; ctx = new AC(); NB = noiseBuf();
    master = ctx.createGain(); master.gain.value = muted ? 0 : vol; const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
    wind = noise(600, .6, 'bandpass'); wind.g.connect(master); spray = noise(2600, .5, 'highpass'); spray.g.connect(master); }
  function setType(t) { if (!ctx || t === type) return; type = t; if (voice) { voice.stop(); voice = null; } voice = buildVoice(t); }
  function buildVoice(t) { const out = ctx.createGain(); out.gain.value = 0; out.connect(master); const parts = [];
    const lfoAmp = (src, rate, depth) => { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = rate; lg.gain.value = depth; l.connect(lg); lg.connect(src.g.gain); l.start(); parts.push(l); return l; };
    let set = () => {};
    if (t === 'prop' || t === 'turboprop' || t === 'airship' || t === 'zero') { const a = osc('sawtooth', 80), b = noise(500, 1.2); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; a.g.connect(f); f.connect(out); b.g.connect(out); parts.push(a.o, b.s);
      const tp = t === 'turboprop', l = lfoAmp(b, 30, .2);
      set = (rpm, x) => { const r = .3 + rpm * .7; a.o.frequency.setTargetAtTime((tp ? 95 : t === 'airship' ? 45 : 70) * r * (t === 'zero' ? 1.4 : 1), ctx.currentTime, .1); a.g.gain.setTargetAtTime(.18 * r, ctx.currentTime, .1); b.g.gain.setTargetAtTime(.25 * r, ctx.currentTime, .1); l.frequency.setTargetAtTime((tp ? 90 : 38) * r, ctx.currentTime, .1);
        if (tp) b.f.frequency.setTargetAtTime(1400 + rpm * 1600, ctx.currentTime, .2); void x; }; }
    else if (t === 'radial') { const a = osc('square', 42), b = noise(260, 1.5); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320; a.g.connect(f); f.connect(out); b.g.connect(out); parts.push(a.o, b.s); const l = lfoAmp(b, 18, .45);
      set = (rpm) => { const r = .35 + rpm * .65; a.o.frequency.setTargetAtTime(32 * r, ctx.currentTime, .15); a.g.gain.setTargetAtTime(.22 * r, ctx.currentTime, .1); b.g.gain.setTargetAtTime(.4 * r, ctx.currentTime, .1); l.frequency.setTargetAtTime(14 * r, ctx.currentTime, .1); }; }
    else if (t === 'jet' || t === 'jet4' || t === 'rocket') { const a = noise(900, .8), w = osc('sine', 1200), ab = noise(180, .7); a.g.connect(out); w.g.connect(out); ab.g.connect(out); parts.push(a.s, w.o, ab.s);
      set = (rpm, x) => { const r = .2 + rpm * .8; a.f.frequency.setTargetAtTime((t === 'rocket' ? 1800 : 600) + r * 2400, ctx.currentTime, .2); a.g.gain.setTargetAtTime((t === 'rocket' ? .6 : .35) * r, ctx.currentTime, .2); w.o.frequency.setTargetAtTime((t === 'jet4' ? 900 : 2200) + r * 1600, ctx.currentTime, .3); w.g.gain.setTargetAtTime(.025 * r, ctx.currentTime, .2);
        ab.g.gain.setTargetAtTime(x.burner || t === 'rocket' ? .9 : 0, ctx.currentTime, .15); }; }
    else if (t === 'rotor' || t === 'coax' || t === 'tandem') { const a = noise(t === 'coax' ? 180 : 240, 1.2), e = noise(1600, .7, 'bandpass'); a.g.connect(out); e.g.connect(out); parts.push(a.s, e.s);
      const l = lfoAmp(a, t === 'coax' ? 9 : t === 'tandem' ? 7 : 11, .6), l2 = t === 'coax' ? lfoAmp(a, 9.6, .4) : t === 'tandem' ? lfoAmp(a, 7.7, .45) : null;
      set = (rpm, x) => { a.g.gain.setTargetAtTime(.45 * rpm * (.6 + (x.col || 0) * .6), ctx.currentTime, .1); e.g.gain.setTargetAtTime(.06 * rpm, ctx.currentTime, .1); l.frequency.setTargetAtTime((t === 'coax' ? 9 : t === 'tandem' ? 7 : 11) * Math.max(.2, rpm), ctx.currentTime, .1); if (l2) l2.frequency.setTargetAtTime((t === 'coax' ? 9.6 : 7.7) * Math.max(.2, rpm), ctx.currentTime, .1); }; }
    else if (t === 'drone') { const os = [osc('sawtooth', 180), osc('sawtooth', 186), osc('sawtooth', 192)], f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = .7; os.forEach(o => { o.g.connect(f); parts.push(o.o); }); f.connect(out);
      set = (rpm, x) => { os.forEach((o, i) => { o.o.frequency.setTargetAtTime((150 + (x.col || .5) * 140) * (1 + i * .03), ctx.currentTime, .08); o.g.gain.setTargetAtTime(.06 * rpm, ctx.currentTime, .1); }); }; }
    return { out, set: (rpm, x) => { set(rpm, x); out.gain.setTargetAtTime(1, ctx.currentTime, .2); }, stop() { out.gain.setTargetAtTime(0, ctx.currentTime, .05); setTimeout(() => { parts.forEach(p => { try { p.stop(); } catch (_) {} }); out.disconnect(); }, 300); } }; }
  function update(st) { if (!ctx) return; const t = ctx.currentTime;
    if (voice) voice.set(st.rpm || 0, st);
    wind.g.gain.setTargetAtTime(Math.min(.5, (st.spd || 0) / 160) * (st.cockpit ? .5 : 1), t, .2); wind.f.frequency.setTargetAtTime(300 + (st.spd || 0) * 8, t, .2);
    spray.g.gain.setTargetAtTime(st.spray ? .18 : 0, t, .08); }
  function blip(f, d = .12, type = 'sine', g = .2, slide = 0) { if (!ctx) return; const o = ctx.createOscillator(), gg = ctx.createGain(); o.type = type; o.frequency.value = f; if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), ctx.currentTime + d);
    gg.gain.setValueAtTime(g, ctx.currentTime); gg.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + d); o.connect(gg); gg.connect(master); o.start(); o.stop(ctx.currentTime + d + .05); }
  function burst(f, d, g, t = 'lowpass') { if (!ctx) return; const s = ctx.createBufferSource(); s.buffer = NB; const fl = ctx.createBiquadFilter(); fl.type = t; fl.frequency.value = f; const gg = ctx.createGain(); gg.gain.setValueAtTime(g, ctx.currentTime); gg.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + d); s.connect(fl); fl.connect(gg); gg.connect(master); s.start(); s.stop(ctx.currentTime + d); }
  const fx = {
    boom() { burst(120, 1.6, 1.4); blip(55, .9, 'sine', .9, -30); },
    crash() { burst(400, 2.2, 1.2); blip(70, 1.2, 'sawtooth', .4, -50); },
    stall() { blip(880, .18, 'square', .08); }, scoop() { burst(900, .5, .35, 'bandpass'); }, ring() { blip(880, .1, 'sine', .25); setTimeout(() => blip(1320, .16, 'sine', .25), 90); },
    ok() { blip(660, .12, 'triangle', .2); setTimeout(() => blip(990, .18, 'triangle', .2), 110); }, bad() { blip(220, .25, 'square', .12, -60); }, click() { blip(1200, .04, 'square', .05); },
    touch() { burst(300, .25, .4); }, refill() { burst(700, .8, .2, 'bandpass'); },
  };
  return { init, setType, update, fx, get ctx() { return ctx; },
    setVol(v) { vol = v; if (master) master.gain.setTargetAtTime(muted ? 0 : vol, ctx.currentTime, .05); },
    setMute(m) { muted = m; if (master) master.gain.setTargetAtTime(muted ? 0 : vol, ctx.currentTime, .05); }, get muted() { return muted; },
    suspend() { ctx?.suspend(); }, resume() { ctx?.resume(); } };
}
