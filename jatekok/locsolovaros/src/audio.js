// Hang: Web Audio szintézis – motor, víz, sziréna, ütközés, felület-hangok, és három procedurális rádióadó szöveges reklámokkal.
const ADS = [
  'HGWS – Halász Gergely Watering Solutions: ha szárad a kert, mi már úton vagyunk!',
  'Locsolófej Szerviz: új fényezés, új élet. Még a vízügyesek sem ismernek meg.',
  'Szilárd Vízművek: drágábban, lassabban, de legalább drágábban.',
  'Sajó-parti Lángos: most vízálló papírtányérral!',
  'Ikarus Utazás: aki egyszer felszállt, sosem felejti el a rugózást.',
  'Avasi Kilátó: a város legszebb panorámája. Lift nincs, lépcső van.',
  'Trabant Alkatrész Bolt: ha füstöl, az nem hiba, az karakter.',
  'HGWS Banki App: a pénzed is folyékony, de nálunk nem folyik el.',
  'Panel-Klíma: nyáron hideg, télen... szintén hideg.',
  'Belvárosi Szódabár: szénsav kétszer, mert egyszer kevés.',
  'Vízügyi Ellenőrzés: figyelünk. Főleg rád.',
  'Kertvárosi Fűnyíró Kölcsönző: a szomszéd úgyis kölcsönkéri.'
];
const STATIONS = [
  { n: 'Retró Rádió 87.6', bpm: 112, root: 45, scale: [0, 2, 3, 5, 7, 8, 10], prog: [[0, 3], [5, 8], [3, 7], [4, 7]], style: 'synth', dj: ['Retró Rádió – a nyolcvanas évek, ahogy a szomszéd emlékszik rá.'] },
  { n: 'Sajó FM 94.2', bpm: 100, root: 43, scale: [0, 2, 4, 5, 7, 9, 11], prog: [[0, 4], [5, 9], [3, 7], [4, 7]], style: 'funk', dj: ['Sajó FM – a folyó, ami sosem szárad ki. Bezzeg a kertetek!'] },
  { n: 'Ipari Hullám 101.5', bpm: 128, root: 38, scale: [0, 1, 3, 5, 7, 8, 10], prog: [[0, 3], [0, 3], [6, 10], [5, 8]], style: 'techno', dj: ['Ipari Hullám – a szennyvízátemelők hivatalos rádiója.'] }
];
const SONGW = ['Locsoló', 'Panel', 'Éjszakai', 'Sajó', 'Avasi', 'Neon', 'Ikarus', 'Trabant', 'Esős', 'Arany', 'Betonszív', 'Szódavíz', 'Villamos'], SONGN = ['szerelem', 'blues', 'tánc', 'álom', 'part', 'ritmus', 'hajnal', 'csillag', 'ballada', 'expressz', 'vágy', 'zápor'];
const SINGERS = ['Kovács Kati Jr.', 'Neon Ferenc', 'A Panelok', 'Sajó Fiúk', 'DJ Ikarus', 'Locsolófej Projekt', 'Vízválasztó', 'Betonvirág'];
export function createAudio() {
  let ac = null, master, sfx, music, eng, engG, engF, sprayG, sirenO, sirenG, heliG, noiseBuf, lis = { x: 0, y: 0, z: 0 }, radioOn = -1, radioT = 0, songEnd = 0, nextBeat = 0, beat = 0, seedS = 1, onRadio = null, adNext = 0;
  const vol = { master: .8, sfx: .9, music: .55 };
  function init() { if (ac) return; ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = vol.master; master.connect(ac.destination);
    sfx = ac.createGain(); sfx.gain.value = vol.sfx; sfx.connect(master); music = ac.createGain(); music.gain.value = vol.music; music.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    eng = ac.createOscillator(); eng.type = 'sawtooth'; engF = ac.createBiquadFilter(); engF.type = 'lowpass'; engF.frequency.value = 600; engG = ac.createGain(); engG.gain.value = 0; eng.connect(engF); engF.connect(engG); engG.connect(sfx); eng.start();
    const sub = ac.createOscillator(); sub.type = 'square'; sub.frequency.value = 30; const sg = ac.createGain(); sg.gain.value = .3; sub.connect(sg); sg.connect(engF); sub.start(); eng.sub = sub;
    const sn = noise(true); const sf = ac.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 1800; sf.Q.value = .6; sprayG = ac.createGain(); sprayG.gain.value = 0; sn.connect(sf); sf.connect(sprayG); sprayG.connect(sfx);
    sirenO = ac.createOscillator(); sirenO.type = 'triangle'; sirenG = ac.createGain(); sirenG.gain.value = 0; sirenO.connect(sirenG); sirenG.connect(sfx); sirenO.start();
    const hn = noise(true), hf = ac.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 300; heliG = ac.createGain(); heliG.gain.value = 0; const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 9; lg.gain.value = .5; lfo.connect(lg); const hg2 = ac.createGain(); hg2.gain.value = .5; lg.connect(hg2.gain); hn.connect(hf); hf.connect(hg2); hg2.connect(heliG); heliG.connect(sfx); lfo.start(); }
  function noise(loop) { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = loop; s.start(); return s; }
  const att = p => p ? Math.max(0, 1 - Math.hypot(p.x - lis.x, (p.y || 0) - lis.y, p.z - lis.z) / 120) : 1;
  function env(node, t, a, d, peak, out = sfx) { const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0005, t + a + d); node.connect(g); g.connect(out); return g; }
  function tone(type, f, t, a, d, peak, out, f2) { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d); env(o, t, a, d, peak, out); o.start(t); o.stop(t + a + d + .05); return o; }
  function nburst(t, dur, peak, ft, fq, out = sfx, q = 1) { const s = ac.createBufferSource(); s.buffer = noiseBuf; const f = ac.createBiquadFilter(); f.type = ft; f.frequency.value = fq; f.Q.value = q; s.connect(f); env(f, t, .002, dur, peak, out); s.start(t, Math.random()); s.stop(t + dur + .05); }
  /* ---------- rádió ---------- */
  let rnd = Math.random; const srand = s => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  let song = null;
  function newSong(st) { seedS++; rnd = srand(seedS * 7919 + radioOn * 13 + 5); const S = STATIONS[st]; song = { st: S, title: SONGW[Math.floor(rnd() * SONGW.length)] + ' ' + SONGN[Math.floor(rnd() * SONGN.length)], artist: SINGERS[Math.floor(rnd() * SINGERS.length)],
      mel: Array.from({ length: 16 }, () => rnd() < .7 ? Math.floor(rnd() * 7) : -1), bassPat: Array.from({ length: 8 }, () => rnd() < .6), arp: rnd() < .6, transpose: Math.floor(rnd() * 5) - 2, len: 48 + Math.floor(rnd() * 32) };
    songEnd = beat + song.len * 4; onRadio?.({ type: 'song', station: S.n, title: song.title, artist: song.artist }); }
  function schedule() {
    if (radioOn < 0 || !ac) return; const S = STATIONS[radioOn], spb = 60 / S.bpm / 4; // 16-od hang
    while (nextBeat < ac.currentTime + .25) { const t = nextBeat, b = beat, bar = Math.floor(b / 16) % 4, step = b % 16, ch = S.prog[bar], r = S.root + (song?.transpose || 0), sc = S.scale, note = (deg, oct = 0) => r + sc[((deg % 7) + 7) % 7] + 12 * (Math.floor(deg / 7) + oct), hz = m => 440 * 2 ** ((m - 69) / 12);
      if (beat >= songEnd) { if (rnd() < .55 || adNext <= 0) { adNext = 2; onRadio?.({ type: 'ad', station: S.n, text: ADS[Math.floor(Math.random() * ADS.length)] }); tone('sine', 880, t, .01, .25, .2, music); tone('sine', 1320, t + .15, .01, .3, .2, music); nextBeat = t + 7; } else { adNext--; } newSong(radioOn); beat++; continue; }
      const sty = S.style;
      // dob
      if (sty === 'techno' ? step % 4 === 0 : step === 0 || step === 8 || (sty === 'funk' && step === 10)) { tone('sine', 150, t, .001, .28, .9, music, 40); }
      if (step === 4 || step === 12) nburst(t, .16, .45, 'highpass', 1200, music);
      if (sty === 'techno' ? step % 4 === 2 : step % 2 === 0) nburst(t, .04, .18, 'highpass', 7000, music);
      // basszus
      if (song.bassPat[step % 8] || step === 0) { const m = note(ch[0], -2) + (sty === 'funk' && step % 4 === 3 ? 12 : 0); tone(sty === 'techno' ? 'sawtooth' : 'square', hz(m), t, .005, spb * (sty === 'funk' ? 1.2 : 1.8), .22, music); }
      // akkord-pad ütemenként
      if (step === 0) for (const d of [0, 2, 4]) tone(sty === 'synth' ? 'sawtooth' : 'triangle', hz(note(ch[0] + d, 0)), t, .08, spb * 15, .045, music);
      // arpeggio / dallam
      if (song.arp && sty !== 'funk' && step % 2 === 0) tone('square', hz(note(ch[0] + [0, 2, 4, 7][(step / 2) % 4], 1)), t, .003, spb * 1.4, .04, music);
      const md = song.mel[step]; if (md >= 0 && (b >> 6) % 2 === 1) tone(sty === 'techno' ? 'sawtooth' : 'triangle', hz(note(ch[0] + md, 1)), t, .01, spb * 2.6, .08, music);
      nextBeat = t + spb; beat++; }
  }
  setInterval(schedule, 60);
  const A = {
    init, STATIONS, vol,
    setVol(k, v) { vol[k] = v; if (!ac) return; ({ master, sfx, music })[k].gain.value = v; },
    listener(p) { lis = p; },
    set onRadio(f) { onRadio = f; },
    radio(i) { init(); radioOn = i; if (i >= 0) { nextBeat = ac.currentTime + .1; beat = 0; newSong(i); } else onRadio?.({ type: 'off' }); },
    get station() { return radioOn; },
    engine(on, rpm, kind) { if (!ac) return; const t = ac.currentTime; engG.gain.setTargetAtTime(on && kind !== 'heli' ? .11 : 0, t, .08); const f = kind === 'bike' ? 70 + rpm * 160 : kind === 'tank' ? 30 + rpm * 40 : 38 + rpm * 90; eng.frequency.setTargetAtTime(f, t, .05); eng.sub.frequency.setTargetAtTime(f / 2, t, .05); engF.frequency.setTargetAtTime(300 + rpm * 1400, t, .05);
      heliG.gain.setTargetAtTime(on && kind === 'heli' ? .5 * rpm : 0, t, .2); },
    heliNear(k) { if (!ac) return; heliG.gain.setTargetAtTime(Math.max(heliG.gain.value * 0, k * .35), ac.currentTime, .3); },
    spray(on) { if (!ac) return; sprayG.gain.setTargetAtTime(on ? .14 : 0, ac.currentTime, on ? .02 : .15); clearTimeout(A._sp); if (on) A._sp = setTimeout(() => A.spray(false), 120); },
    siren(k) { if (!ac) return; const t = ac.currentTime; sirenG.gain.setTargetAtTime(k * .07, t, .2); sirenO.frequency.setTargetAtTime(700 + Math.sin(t * 5) * 250, t, .03); },
    shot(kind, p) { if (!ac) return; const k = att(p), t = ac.currentTime; if (k <= 0) return; if (kind === 'tomlo' || kind === 'agyu') { A.spray(true); return; }
      nburst(t, kind === 'puska' ? .22 : .1, .35 * k, 'bandpass', kind === 'puska' ? 900 : 1500, sfx, 1.2); tone('sine', 500, t, .001, .06, .15 * k, sfx, 200); },
    splashBig(x, y, z) { if (!ac) return; const k = att({ x, y, z }), t = ac.currentTime; nburst(t, .7, .6 * k, 'lowpass', 1200); tone('sine', 120, t, .005, .4, .5 * k, sfx, 40); },
    crash(v, p) { if (!ac) return; const k = att(p) * Math.min(1, v / 14), t = ac.currentTime; nburst(t, .25 + v * .01, .8 * k, 'lowpass', 900); nburst(t, .5, .25 * k, 'bandpass', 3200, sfx, 3); tone('square', 80, t, .002, .15, .3 * k, sfx, 40); },
    explosion(p) { if (!ac) return; const k = att(p), t = ac.currentTime; nburst(t, 1.6, k, 'lowpass', 500); tone('sine', 70, t, .005, 1.1, .9 * k, sfx, 25); },
    horn(p) { if (!ac) return; const k = att(p), t = ac.currentTime; tone('square', 392, t, .01, .35, .08 * k); tone('square', 494, t, .01, .35, .07 * k); },
    bell(p) { if (!ac) return; const k = att(p), t = ac.currentTime; for (const d of [0, .22]) tone('sine', 1250, t + d, .002, .5, .18 * k); },
    click() { if (!ac) return; tone('square', 1800, ac.currentTime, .001, .03, .06); },
    reload() { if (!ac) return; const t = ac.currentTime; tone('square', 300, t, .001, .05, .08); tone('square', 600, t + .4, .001, .05, .08); },
    alert() { if (!ac) return; const t = ac.currentTime; tone('square', 660, t, .005, .12, .1); tone('square', 880, t + .14, .005, .15, .1); },
    blip() { if (!ac) return; tone('sine', 1100, ac.currentTime, .002, .08, .12); },
    money() { if (!ac) return; const t = ac.currentTime; for (const [i, f] of [1320, 1760, 2640].entries()) tone('triangle', f, t + i * .07, .002, .18, .12); },
    pass() { if (!ac) return; const t = ac.currentTime; for (const [i, f] of [523, 659, 784, 1046, 784, 1046].entries()) tone('triangle', f, t + i * .12, .005, .35, .16); },
    fail() { if (!ac) return; const t = ac.currentTime; for (const [i, f] of [392, 330, 262].entries()) tone('sawtooth', f, t + i * .22, .005, .4, .08); },
    land(v) { if (!ac) return; nburst(ac.currentTime, .2, Math.min(.6, v * .05), 'lowpass', 400); },
    step() { if (!ac) return; nburst(ac.currentTime, .04, .05, 'lowpass', 600); },
    skid(k) { if (!ac) return; if (k > .2 && Math.random() < k * .5) nburst(ac.currentTime, .12, .05 * k, 'bandpass', 900, sfx, 6); }
  };
  return A;
}
