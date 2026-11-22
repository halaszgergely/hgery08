/* Autórádió: állomások a radio/allomasok.json listából.
   - Ha az állomásnak van élő stream-címe, <audio> elemmel szól (CORS esetén Web Audio effektekkel: csöves recsegés, tompább hang kívülről).
   - Ha nincs (vagy nem érhető el), az állomás stílusában saját, generált zene szól (rock, mulatós, retró, chill) – jogvédett felvétel nélkül.
   - Locsoló Info: saját beszélgetős műsor (hírek a játék állapotából, időjárás, reklámok, Csöpi bácsi), Web Speech felolvasással, felirattal.
   Retró járműben csak a retró állomások foghatók, recsegve; a mopedeken nincs rádió. */
const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(Date.now() % 2147483647 || 7);
const pick = a => a[Math.floor(rnd() * a.length)];

export function createRadio(audio, base = 'radio/') {
  let list = [], idx = 0, on = false, kind = 'retro', inside = true, duckK = 1, subCb = null, el = null, bus = null, crackle = null, gen = null, talk = null, newsFn = () => [], vol = .55, lastSay = 0;
  const ready = fetch(base + 'allomasok.json').then(r => r.json()).then(d => { list = d.allomasok; }).catch(() => { list = [{ id: 'retro', nev: 'Retró FM 88,0', mufaj: 'retro', retro: true }]; });
  const avail = () => list.filter(s => kind === 'modern' || (kind === 'retro' && s.retro));
  const cur = () => avail()[idx % Math.max(1, avail().length)];
  function ensureBus() { const ctx = audio.init(); if (!ctx || bus) return ctx; bus = ctx.createGain(); bus.gain.value = 0; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 12000; bus.connect(lp); lp.connect(audio.master); bus.lp = lp;
    const n = ctx.createBufferSource(), b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < .002 ? 1 : .25);
    n.buffer = b; n.loop = true; const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 2400; crackle = ctx.createGain(); crackle.gain.value = 0; n.connect(nf); nf.connect(crackle); crackle.connect(audio.master); n.start(); return ctx; }
  function stopAll() { if (el) { el.pause(); el.src = ''; el = null; } gen?.stop(); gen = null; talk?.stop(); talk = null; }
  function tune() { stopAll(); if (!on || kind === 'none') { sub(''); return; } const s = cur(); if (!s) return; const ctx = ensureBus(); if (!ctx) return;
    sub(s.nev + (s.frek ? ' · ' + s.frek + ' MHz' : '') + (s.szlogen ? ' – „' + s.szlogen + '”' : ''), 3500);
    if (s.mufaj === 'beszelgetos') { talk = startTalk(ctx); return; }
    if (s.stream) { el = new Audio(); el.crossOrigin = 'anonymous'; el.src = s.stream; el.volume = vol * duckK; let wired = false;
      el.addEventListener('playing', () => { if (wired) return; wired = true; try { const src = ctx.createMediaElementSource(el); src.connect(bus); el.volume = 1; } catch (_) {} });
      el.addEventListener('error', () => { if (el?.crossOrigin) { el.removeAttribute('crossorigin'); el.src = s.stream; el.play().catch(() => {}); return; } stopAll(); gen = startGen(ctx, s.mufaj); });
      el.play().catch(() => { stopAll(); gen = startGen(ctx, s.mufaj); }); }
    else gen = startGen(ctx, s.mufaj); }
  function sub(t, ms = 5000) { subCb?.(t, ms); }

  /* ---------- generált zene: stílusonként dob, basszus, akkordok, dallam ---------- */
  function startGen(ctx, style, gv = .5) { const out = ctx.createGain(); out.gain.value = gv; out.connect(bus); let alive = true, next = ctx.currentTime + .1, step = 0, song = 0;
    const ST = { rock: { bpm: 126, scale: [0, 3, 5, 7, 10], prog: [[0, 7], [5, 7], [3, 7], [7, 7]], key: 40 }, mulatos: { bpm: 150, scale: [0, 2, 4, 5, 7, 9, 11], prog: [[0, 4, 7], [7, 11, 14], [0, 4, 7], [5, 9, 12]], key: 50 },
      retro: { bpm: 116, scale: [0, 2, 3, 5, 7, 8, 10], prog: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]], key: 45 }, chill: { bpm: 80, scale: [0, 2, 4, 7, 9], prog: [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]], key: 48 } }[style] || ST_DEF;
    const hz = n => 440 * 2 ** ((n - 69) / 12); let mel = [];
    const newSong = () => { song++; ST.key += pick([-2, 0, 2, 3, -3, 5]); ST.key = 40 + ((ST.key - 40) % 12 + 12) % 12; mel = Array.from({ length: 16 }, () => rnd() < .62 ? pick(ST.scale) + 12 * (rnd() < .3 ? 1 : 0) : null);
      if (ST.prog.length) ST.prog.push(ST.prog.shift()); };
    newSong();
    const env = (g, t, a, d, v) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(.0008, t + a + d); };
    const osc = (type, f, t, d, v, dest = out, det = 0) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; o.detune.value = det; env(g, t, .005, d, v); o.connect(g); g.connect(dest); o.start(t); o.stop(t + d + .05); return o; };
    const nz = (t, d, v, f, type = 'highpass') => { const s = ctx.createBufferSource(), b = ctx.createBuffer(1, ctx.sampleRate * d, ctx.sampleRate), dd = b.getChannelData(0); for (let i = 0; i < dd.length; i++) dd[i] = Math.random() * 2 - 1;
      s.buffer = b; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; const g = ctx.createGain(); env(g, t, .002, d, v); s.connect(fl); fl.connect(g); g.connect(out); s.start(t); };
    const kick = t => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + .12); env(g, t, .002, .22, .9); o.connect(g); g.connect(out); o.start(t); o.stop(t + .3); };
    const dist = ctx.createWaveShaper(), cv = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; cv[i] = Math.tanh(x * 6); } dist.curve = cv; const dg = ctx.createGain(); dg.gain.value = .16; const dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2600; dist.connect(dl); dl.connect(dg); dg.connect(out);
    const pad = ctx.createBiquadFilter(); pad.type = 'lowpass'; pad.frequency.value = 900; pad.connect(out);
    function sched() { if (!alive) return; const spb = 60 / ST.bpm / 4;
      while (next < ctx.currentTime + .25) { const t = next, s16 = step % 16, bar = Math.floor(step / 16) % 4, ch = ST.prog[bar], root = ST.key;
        if (style === 'rock') { if (s16 % 8 === 0) kick(t); if (s16 % 8 === 4) { nz(t, .18, .5, 1500, 'bandpass'); osc('triangle', 190, t, .08, .2); } if (s16 % 2 === 0) nz(t, .04, .12, 7000);
          if (s16 % 2 === 0) for (const n of [0, 7, 12]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = hz(root + ch[0] + n); env(g, t, .005, spb * 1.8, .25); o.connect(g); g.connect(dist); o.start(t); o.stop(t + spb * 2); }
          osc('sawtooth', hz(root - 12 + ch[0]), t, spb * .9, .18); if (mel[s16] !== null && song % 2 && s16 % 2 === 0) osc('square', hz(root + 24 + mel[s16]), t, spb * 1.8, .05); }
        else if (style === 'mulatos') { if (s16 % 4 === 0) { kick(t); osc('triangle', hz(root - 12 + (s16 % 8 === 0 ? ch[0] : ch[0] + 7)), t, spb * 1.6, .35); }
          if (s16 % 4 === 2) { nz(t, .06, .25, 3000); for (const n of ch) { osc('square', hz(root + n), t, spb * 1.2, .045, out, -8); osc('square', hz(root + n), t, spb * 1.2, .045, out, 8); } }
          if (mel[s16] !== null) { const o = osc('sawtooth', hz(root + 12 + mel[s16]), t, spb * 1.6, .06); const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 6; lg.gain.value = 12; l.connect(lg); lg.connect(o.detune); l.start(t); l.stop(t + spb * 1.7); } }
        else if (style === 'retro') { if (s16 % 4 === 0) kick(t); if (s16 % 8 === 4) nz(t, .16, .45, 1800, 'bandpass'); if (s16 % 2 === 1) nz(t, .03, .1, 8000);
          osc('square', hz(root - 12 + ch[0] + (s16 % 2 ? 12 : 0)), t, spb * .8, .1); osc('sawtooth', hz(root + 12 + ch[s16 % ch.length]), t, spb * .7, .05);
          if (s16 === 0) for (const n of ch) osc('sawtooth', hz(root + n), t, spb * 15, .03, pad, rnd() * 14 - 7); if (mel[s16] !== null && song % 2 === 0) osc('triangle', hz(root + 24 + mel[s16]), t, spb * 2, .08); }
        else { if (s16 === 0 || s16 === 10) kick(t); if (s16 % 8 === 4) nz(t, .1, .15, 2500, 'bandpass'); if (s16 % 4 === 2) nz(t, .03, .05, 9000);
          if (s16 === 0) for (const n of ch) osc('sine', hz(root + n), t, spb * 15, .06, pad); if (s16 % 8 === 0) osc('triangle', hz(root - 12 + ch[0]), t, spb * 7, .2); if (mel[s16] !== null && s16 % 2 === 0) osc('sine', hz(root + 12 + mel[s16]), t, spb * 3, .06); }
        next += spb; step++; if (step % 256 === 0) newSong(); }
      setTimeout(sched, 80); }
    sched(); return { stop() { alive = false; out.gain.setTargetAtTime(0, ctx.currentTime, .05); setTimeout(() => out.disconnect(), 400); } }; }
  const ST_DEF = { bpm: 110, scale: [0, 2, 4, 7, 9], prog: [[0, 4, 7]], key: 48 };

  /* ---------- Locsoló Info: beszélgetős műsor ---------- */
  const HOST = ['Rocker Laci', 'Csobogó Csabi', 'Csöpi bácsi'];
  const ADS = ['Szárazság ellen HGWS! Mert a kert nem iszik magától.', 'Kis Lajt Söröző: hideg sör, hideg víz, meleg pörkölt. A vizet nem mi szállítjuk, de a HGWS igen!',
    'Új a HGWS ballonos szolgáltatása: húsz liter friss víz az irodába, akár Babettóval is!', 'Csőtörés Csárda – nálunk mindig folyik valami.', 'Fáradt a kerted? Locsold meg! Fáradt a sofőröd? Hívj taxit!',
    'A HGWS ásványvíz: ugyanaz, mint a csapvíz, csak sokkal messzebbről hozzuk.'];
  const STORY = ['Csöpi bácsi mesél: Amikor én kezdtem, Trabóval hordtuk a vizet. Tizenkét ballon a hátsó ülésen, és a Trabó úgy rugózott, mint a lekvár! De megérkeztünk, mindig megérkeztünk.',
    'Csöpi bácsi mesél: A régi szép időkben a Babettón még pedálozni kellett a Tetemvárra. A ballon meg kétszer legurult. A harmadikra már rá is kötöttem.',
    'Csöpi bácsi mesél: Egyszer a Bükkben elfogyott a keverék. Gondoltam, majd a víz hajtja. Hát nem hajtotta. Azóta mindig van nálam egy liter olaj.',
    'Csöpi bácsi mesél: Régen a GPS az volt, hogy megkérdeztük a kocsmárost. Ő mindig tudta, merre van a Népkert. Csak azt nem, hogy merre van a kijárat.'];
  const WEATHER = ['Időjárás: napos, száraz idő, a kertek szomjasak. Ez jó hír a HGWS-nek, rossz hír a petúniáknak.', 'Időjárás: kellemes, enyhe szél. A ballonok nem fújnak el, ha jól rögzítik őket.',
    'Időjárás: este lehűlés várható. Aki moppeddel jár, vegyen sálat. Ja, már van? Akkor lobogtassa!'];
  function startTalk(ctx) { let alive = true, timer = 0, utter = null;
    const bed = startGen(ctx, 'chill', .1);
    const say = (txt, host) => { if (!alive) return; const t = (host ? host + ': ' : '') + txt; sub(t, Math.max(4000, t.length * 70)); lastSay = performance.now();
      try { if ('speechSynthesis' in window) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(txt); const v = speechSynthesis.getVoices().find(v => /^hu/i.test(v.lang)); if (v) { u.voice = v; u.lang = v.lang; u.volume = Math.min(1, vol * 1.3); u.rate = 1.03; speechSynthesis.speak(u); utter = u; } } } catch (_) {} };
    const segs = () => { const news = newsFn() || [], h = pick(HOST), out = [];
      out.push(['Itt a Locsoló Info, a száz egész nulla megahertzen. A mikrofonnál ' + h + '.', h]); for (const n of news.slice(0, 2)) out.push([n, pick(HOST)]);
      out.push([pick(WEATHER), 'Csobogó Csabi']); out.push(['Reklám. ' + pick(ADS), null]); if (rnd() < .6) out.push([pick(STORY), null]); return out; };
    let queue = segs();
    const loop = () => { if (!alive) return; if (!queue.length) queue = segs(); const [txt, h] = queue.shift(); say(txt, h); timer = setTimeout(loop, Math.max(6000, txt.length * 75) + 1500); };
    timer = setTimeout(loop, 1200);
    return { stop() { alive = false; clearTimeout(timer); bed?.stop(); try { speechSynthesis.cancel(); } catch (_) {} } }; }

  function applyGain() { if (!bus) return; const ctx = audio.ctx, t = ctx.currentTime, retro = kind === 'retro', g = on ? vol * duckK * (inside ? 1 : .45) : 0;
    bus.gain.setTargetAtTime(g, t, .1); bus.lp.frequency.setTargetAtTime(inside ? (retro ? 4200 : 14000) : 1300, t, .1); crackle.gain.setTargetAtTime(on && retro ? .012 * duckK * (inside ? 1 : .4) : 0, t, .1); if (el) el.volume = Math.min(1, g); }
  return {
    ready, onSub(cb) { subCb = cb; }, setNews(fn) { newsFn = fn; },
    setVehicle(k) { if (k === kind) return; kind = k; idx = 0; if (k === 'none') { stopAll(); sub(''); } else if (on) tune(); applyGain(); },
    toggle() { if (kind === 'none') return false; on = !on; if (on) tune(); else { stopAll(); sub(''); } applyGain(); return on; },
    next() { if (kind === 'none') return; if (!on) { on = true; } idx = (idx + 1) % Math.max(1, avail().length); tune(); applyGain(); },
    setInside(v) { if (inside !== v) { inside = v; applyGain(); } }, duck(v) { const k = v ? .25 : 1; if (k !== duckK) { duckK = k; applyGain(); } }, setVol(v) { vol = v; applyGain(); },
    stop() { on = false; stopAll(); applyGain(); },
    get state() { const s = cur(); return { on, kind, nev: s?.nev || '', frek: s?.frek || '', forras: s?.stream ? s.forras : '', honlap: s?.stream ? s.honlap : '', gen: !s?.stream && s?.mufaj !== 'beszelgetos' }; },
    list: () => list,
  };
}
