// HGWS saját videólejátszó – YouTube-forrásnál a YouTube IFrame API-t vezérli saját gombokkal
// (a YouTube felülete nem kattintható, így a videó linkje sem érhető el egy kattintással), MP4-nél sima <video>.
import { esc } from './core.js?v=202611281444';

let ytLoad = null;
function loadYT() {
  if (window.YT?.Player) return Promise.resolve();
  return ytLoad ||= new Promise((res, rej) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { try { prev && prev(); } catch (_) {} res(); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => { ytLoad = null; rej(new Error('A lejátszó nem töltődött be.')); };
    document.head.appendChild(s);
  });
}
const fmt = s => {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
};
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} } };
const RATES = [1, 1.25, 1.5, 2, 0.5, 0.75];
const ICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6 4h4.5v16H6zM13.5 4H18v16h-4.5z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"/><text x="12" y="16.2" font-size="6.5" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700">10</text></svg>',
  fwd: '<svg viewBox="0 0 24 24"><path d="M12 5V1l5 5-5 5V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z"/><text x="12" y="16.2" font-size="6.5" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700">10</text></svg>',
  vol: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9zm18.7 0-1.4-1.4L17.6 10.3 14.9 7.6l-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4-2.7-2.7z"/></svg>',
  fs: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5v2H6v3zm11-5h5v5h-2V6h-3zM6 15v3h3v2H4v-5zm12 3v-3h2v5h-5v-2z"/></svg>',
  cc: '<svg viewBox="0 0 24 24"><path d="M19 4H5a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm1 13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1zM10.6 10.2a1.8 1.8 0 0 0-1.3-.5 2 2 0 0 0-2 2.3 2 2 0 0 0 2 2.3 1.8 1.8 0 0 0 1.3-.5l1 1.2a3.5 3.5 0 0 1-2.4.9A3.6 3.6 0 0 1 5.5 12a3.6 3.6 0 0 1 3.7-3.9 3.5 3.5 0 0 1 2.4.9zm6.5 0a1.8 1.8 0 0 0-1.3-.5 2 2 0 0 0-2 2.3 2 2 0 0 0 2 2.3 1.8 1.8 0 0 0 1.3-.5l1 1.2a3.5 3.5 0 0 1-2.4.9A3.6 3.6 0 0 1 12 12a3.6 3.6 0 0 1 3.7-3.9 3.5 3.5 0 0 1 2.4.9z"/></svg>',
  fsx: '<svg viewBox="0 0 24 24"><path d="M9 4v5H4V7h3V4zm6 0h2v3h3v2h-5zM4 15h5v5H7v-3H4zm11 0h5v2h-3v3h-2z"/></svg>'
};

/**
 * Lejátszó beillesztése egy dobozba.
 * o: { youtube, mp4, vtt (felirat .vtt/.srt az MP4-hez), poster, title, start, onTime(t, d), onPause(), onEnd(), next: { title, href, poster },
 *      locked (közös nézés vendégként: csak a házigazda irányít), onLocked(), onAction(kind, t) – a néző saját mozdulatai,
 *      maxT() – ennél előrébb nem lehet tekerni (élő premier: a vezérlő pozíciója) }
 * Visszaad: { destroy() }
 */
export function mount(box, o) {
  box.classList.add('vp'); if (o.locked) box.classList.add('locked');
  box.tabIndex = 0;
  box.innerHTML = `
    <div class="vp-media"></div>
    <div class="vp-shield"></div>
    <div class="vp-dim"></div>
    <div class="vp-cover" style="${o.poster ? `background-image:url('${esc(o.poster)}')` : ''}"></div>
    <div class="vp-spin" hidden><div class="spin"></div></div>
    <button class="vp-big" aria-label="Lejátszás">${ICON.play}</button>
    <div class="vp-end" hidden><div><button class="vp-again"><i class="ic ic-refresh-cw"></i> Újra</button>${o.next ? `<a class="vp-next" href="${esc(o.next.href)}"><span class="ph" style="${o.next.poster ? `background-image:url('${esc(o.next.poster)}')` : ''}"></span><span><small>KÖVETKEZŐ</small><b>${esc(o.next.title)}</b></span></a>` : ''}</div></div>
    <div class="vp-err" hidden></div>
    <div class="vp-sub" hidden aria-live="polite"></div>
    <div class="vp-top"><img src="img/logo.webp" alt=""><span>${esc(o.title || '')}</span></div>
    <div class="vp-ctl">
      <div class="vp-bar" role="slider" aria-label="Idősáv"><div class="vp-track"><i class="vp-buf"></i><i class="vp-fill"></i></div><i class="vp-knob"></i><span class="vp-tip" hidden></span></div>
      <div class="vp-row">
        <button data-k="play" title="Lejátszás (szóköz)">${ICON.play}</button>
        <button data-k="back" title="Vissza 10 mp (←)">${ICON.back}</button>
        <button data-k="fwd" title="Előre 10 mp (→)">${ICON.fwd}</button>
        <div class="vp-vol"><button data-k="mute" title="Némítás (M)">${ICON.vol}</button><input type="range" min="0" max="100" step="1" aria-label="Hangerő"></div>
        <span class="vp-time">0:00 / 0:00</span>
        <span class="vp-name">${esc(o.title || '')}</span>
        <button data-k="cc" class="vp-cc" title="Felirat (C)" aria-pressed="false" hidden>${ICON.cc}</button>
        <button data-k="speed" class="vp-txt" title="Sebesség">1×</button>
        <button data-k="fs" title="Teljes képernyő (F)">${ICON.fs}</button>
      </div>
    </div>`;
  const q = s => box.querySelector(s);
  const media = q('.vp-media'), bar = q('.vp-bar'), tip = q('.vp-tip'), volR = q('.vp-vol input');
  let subOn = false;
  const subEl = q('.vp-sub');
  function drawSub() {
    const t = A?.el?.textTracks?.[0];
    const txt = subOn && t?.activeCues ? [...t.activeCues].map(c => c.text.replace(/<[^>]+>/g, '')).join('\n').trim() : '';
    subEl.hidden = !txt;
    subEl.innerHTML = txt ? txt.split('\n').map(l => `<span>${esc(l)}</span>`).join('<br>') : '';
  }
  let A = null, started = false, playing = false, ended = false, dead = false, poll = null, idleT = null, clickT = null, rateI = 0, seeking = false;
  let vol = store.get('hgws_vol', 80), muted = store.get('hgws_muted', false);

  /* ---------- források ---------- */
  function err(msg) { const e = q('.vp-err'); e.textContent = msg; e.hidden = false; q('.vp-spin').hidden = true; q('.vp-big').hidden = true; }
  if (o.mp4) {
    const v = document.createElement('video');
    const auto = o.autoplay !== false;
    Object.assign(v, { src: o.mp4, playsInline: true, preload: 'auto', autoplay: auto, poster: o.poster || '' });
    v.setAttribute('playsinline', ''); v.setAttribute('controlsList', 'nodownload noplaybackrate'); v.disablePictureInPicture = true;
    media.appendChild(v);
    if (o.vtt) { addTrack(v, o.vtt); v.textTracks[0] && (v.textTracks[0].oncuechange = drawSub); }
    A = {
      play: () => v.play().catch(() => state('paused')), pause: () => v.pause(), seek: t => { v.currentTime = t; },
      time: () => v.currentTime || 0, dur: () => isFinite(v.duration) ? v.duration : 0,
      buf: () => { const b = v.buffered, d = v.duration; return b.length && d ? b.end(b.length - 1) / d : 0; },
      vol: x => { v.volume = x / 100; }, mute: m => { v.muted = m; }, rate: r => { v.playbackRate = r; }, el: v,
      // a sáv mindig „hidden” (a böngésző nem rajzolja), a szöveget a saját rétegünk mutatja a vezérlők fölött
      cc: on => { const t = v.textTracks[0]; if (!t) return Promise.resolve(false); t.mode = 'hidden'; subOn = on; drawSub(); return Promise.resolve(true); }, destroy: () => { v.pause(); v.removeAttribute('src'); v.load(); }
    };
    if (o.start) v.addEventListener('loadedmetadata', () => { v.currentTime = o.start; }, { once: true });
    v.addEventListener('playing', () => state('playing'));
    v.addEventListener('pause', () => !v.ended && state('paused'));
    v.addEventListener('waiting', () => state('buffering'));
    v.addEventListener('ended', () => state('ended'));
    v.addEventListener('error', () => err('A videót nem sikerült betölteni.'));
    if (auto) v.play().catch(() => state('paused'));
    ready();
  } else if (o.youtube) {
    q('.vp-spin').hidden = false; box.classList.add('yt');
    const el = document.createElement('div'); media.appendChild(el);
    loadYT().then(() => {
      if (dead) return;
      const p = new YT.Player(el, {
        host: 'https://www.youtube-nocookie.com', videoId: o.youtube, width: '100%', height: '100%',
        playerVars: { autoplay: o.autoplay === false ? 0 : 1, controls: 0, disablekb: 1, fs: 0, rel: 0, modestbranding: 1, playsinline: 1, iv_load_policy: 3, cc_load_policy: 0, cc_lang_pref: 'hu', hl: 'hu', start: Math.floor(o.start || 0), origin: location.origin },
        events: {
          onReady: () => {
            if (dead) return;
            const f = p.getIframe(); f.tabIndex = -1; f.setAttribute('aria-hidden', 'true'); f.title = '';
            A = {
              play: () => p.playVideo(), pause: () => p.pauseVideo(), seek: t => p.seekTo(t, true),
              time: () => p.getCurrentTime?.() || 0, dur: () => p.getDuration?.() || 0, buf: () => p.getVideoLoadedFraction?.() || 0,
              vol: x => p.setVolume(x), mute: m => m ? p.mute() : p.unMute(), rate: r => p.setPlaybackRate(r), destroy: () => { try { p.destroy(); } catch (_) {} },
              cc: on => ytCc(p, on)
            };
            ytCc(p, false);
            q('.vp-spin').hidden = true;
            ready(); if (o.autoplay !== false) A.play();
          },
          onStateChange: e => { if (e.data === 1 && !ccOn) ytCc(p, false); state({ '-1': 'unstarted', 0: 'ended', 1: 'playing', 2: 'paused', 3: 'buffering', 5: 'cued' }[e.data]); },
          onApiChange: () => { if (!ccOn) ytCc(p, false); },
          onError: () => err('Ez a videó most nem játszható le.')
        }
      });
    }).catch(e => err(e.message));
  } else err('A videó még nem érhető el.');

  function ready() {
    A.vol(vol); A.mute(muted); volUi();
    q('[data-k=cc]').hidden = !A.cc || (!!o.mp4 && !o.vtt);
    if (o.maxT) q('[data-k=speed]').hidden = true;   // MP4-nél csak akkor van gomb, ha van feliratfájl
    poll = setInterval(tick, 250);
  }

  /* ---------- állapot ---------- */
  function state(s) {
    if (!s || dead) return;
    playing = s === 'playing';
    if (playing) { started = true; ended = false; }
    box.classList.toggle('playing', playing);
    box.classList.toggle('paused', started && !playing && s !== 'buffering');
    box.classList.toggle('started', started);
    q('.vp-spin').hidden = s !== 'buffering';
    q('.vp-big').hidden = playing || s === 'buffering' || s === 'ended';
    q('[data-k=play]').innerHTML = playing ? ICON.pause : ICON.play;
    q('.vp-end').hidden = s !== 'ended';
    if (s === 'ended') { ended = true; box.classList.remove('paused'); box.classList.add('ended'); o.onTime?.(A.dur(), A.dur()); o.onEnd?.(); }
    else box.classList.remove('ended');
    if (s === 'paused') o.onPause?.();
    wake();
  }
  function tick() {
    if (!A) return;
    const t = A.time(), d = A.dur();
    if (!seeking) setBar(d ? t / d : 0);
    q('.vp-buf').style.width = Math.min(100, A.buf() * 100) + '%';
    q('.vp-time').textContent = fmt(t) + ' / ' + fmt(d);
    if (playing && d) o.onTime?.(t, d);
  }
  const setBar = f => { f = Math.max(0, Math.min(1, f)); q('.vp-fill').style.width = f * 100 + '%'; q('.vp-knob').style.left = f * 100 + '%'; };

  /* ---------- vezérlők ---------- */
  const toggle = () => { if (!A) return; if (o.locked) { o.onLocked?.(); return; } if (ended) { A.seek(0); A.play(); o.onAction?.('play', 0); } else if (playing) { A.pause(); o.onAction?.('pause', A.time()); } else { A.play(); o.onAction?.('play', A.time()); } };
  const cap = t => o.maxT ? Math.min(t, Math.max(0, o.maxT())) : t;
  const skip = s => { if (!A) return; if (o.locked) { flash('🍿 A házigazda irányít'); return; } const t = cap(Math.max(0, Math.min(A.dur() - .5, A.time() + s))); A.seek(t); tick(); flash(s > 0 ? '+' + s + ' mp' : s + ' mp'); o.onAction?.('seek', t); };
  function volUi() {
    volR.value = muted ? 0 : vol;
    volR.style.setProperty('--v', (muted ? 0 : vol) + '%');
    q('[data-k=mute]').innerHTML = muted || vol === 0 ? ICON.mute : ICON.vol;
  }
  function setVol(v) { vol = Math.max(0, Math.min(100, Math.round(v))); muted = vol === 0; A?.vol(vol); A?.mute(muted); store.set('hgws_vol', vol); store.set('hgws_muted', muted); volUi(); }
  function toggleMute() { muted = !muted; if (!muted && vol === 0) vol = 50; A?.vol(vol); A?.mute(muted); store.set('hgws_muted', muted); store.set('hgws_vol', vol); volUi(); flash(muted ? 'Némítva' : 'Hang: ' + vol + '%'); }
  const isFs = () => (document.fullscreenElement || document.webkitFullscreenElement) === box || box.classList.contains('vp-pseudo');
  function fs() {
    if (isFs()) {
      if (box.classList.contains('vp-pseudo')) { box.classList.remove('vp-pseudo'); document.body.classList.remove('vp-lock'); }
      else (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    } else if (box.requestFullscreen || box.webkitRequestFullscreen) {
      Promise.resolve((box.requestFullscreen || box.webkitRequestFullscreen).call(box)).then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => pseudo());
    } else if (A?.el?.webkitEnterFullscreen) A.el.webkitEnterFullscreen();
    else pseudo();
    setTimeout(fsUi, 50);
  }
  function pseudo() { box.classList.add('vp-pseudo'); document.body.classList.add('vp-lock'); fsUi(); }
  const fsUi = () => { q('[data-k=fs]').innerHTML = isFs() ? ICON.fsx : ICON.fs; box.classList.toggle('isfs', isFs()); };
  const onFs = () => fsUi();
  document.addEventListener('fullscreenchange', onFs); document.addEventListener('webkitfullscreenchange', onFs);

  /* ---------- felirat: alapból mindig KI, gombbal / C billentyűvel kapcsolható ---------- */
  let ccOn = false;
  async function toggleCc() {
    if (!A?.cc || q('[data-k=cc]').hidden) return;
    const want = !ccOn, b = q('[data-k=cc]');
    ccOn = want; b.classList.toggle('on', want); b.setAttribute('aria-pressed', want);
    const ok = await A.cc(want);
    if (want && !ok) { ccOn = false; b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); flash('Ehhez a videóhoz nincs felirat'); return; }
    flash(want ? 'Felirat: be' : 'Felirat: ki');
  }

  let flashT;
  function flash(t) {
    let f = q('.vp-flash'); if (!f) { f = document.createElement('div'); f.className = 'vp-flash'; box.appendChild(f); }
    f.textContent = t; f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
    clearTimeout(flashT); flashT = setTimeout(() => f.classList.remove('on'), 700);
  }

  box.querySelector('.vp-row').addEventListener('click', e => {
    const k = e.target.closest('[data-k]')?.dataset.k; if (!k) return;
    e.stopPropagation();
    if (k === 'play') toggle();
    else if (k === 'back') skip(-10);
    else if (k === 'fwd') skip(10);
    else if (k === 'mute') toggleMute();
    else if (k === 'fs') fs();
    else if (k === 'cc') toggleCc();
    else if (k === 'speed') { rateI = (rateI + 1) % RATES.length; A?.rate(RATES[rateI]); e.target.closest('button').textContent = String(RATES[rateI]).replace('.', ',') + '×'; flash('Sebesség: ' + String(RATES[rateI]).replace('.', ',') + '×'); }
    box.focus({ preventScroll: true });
  });
  volR.addEventListener('input', () => setVol(+volR.value));
  q('.vp-big').onclick = e => { e.stopPropagation(); toggle(); };
  q('.vp-again').onclick = e => { e.stopPropagation(); if (o.locked) return o.onLocked?.(); A?.seek(0); A?.play(); o.onAction?.('play', 0); };

  // kattintás a képre: egy = lejátszás/szünet, dupla = teljes képernyő; érintésnél az első koppintás csak a vezérlőket hozza elő
  const shield = q('.vp-shield');
  let lastTouch = 0;
  shield.addEventListener('pointerup', e => {
    if (e.pointerType === 'touch') {
      const now = Date.now();
      if (now - lastTouch < 300) { clearTimeout(clickT); lastTouch = 0; fs(); return; }
      lastTouch = now;
      if (box.classList.contains('idle') || !started) { wake(); if (started) return; }
      clickT = setTimeout(toggle, 260); return;
    }
    clearTimeout(clickT); clickT = setTimeout(toggle, 220);
  });
  shield.addEventListener('dblclick', () => { clearTimeout(clickT); fs(); });
  q('.vp-cover').addEventListener('click', () => toggle());
  box.addEventListener('contextmenu', e => e.preventDefault());

  // idősáv: húzás, előnézeti idő
  const frac = e => { const r = bar.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); };
  bar.addEventListener('pointermove', e => {
    const d = A?.dur(); if (!d) return; const f = frac(e);
    tip.hidden = false; tip.textContent = fmt(f * d); tip.style.left = f * 100 + '%';
    if (seeking) setBar(f);
  });
  bar.addEventListener('pointerleave', () => { if (!seeking) tip.hidden = true; });
  bar.addEventListener('pointerdown', e => { if (!A?.dur() || o.locked) return; seeking = true; bar.setPointerCapture(e.pointerId); box.classList.add('seeking'); setBar(frac(e)); });
  const endSeek = e => { if (!seeking) return; seeking = false; box.classList.remove('seeking'); tip.hidden = true; const d = A.dur(), t = cap(frac(e) * d); A.seek(t); if (ended) A.play(); tick(); o.onAction?.('seek', t); };
  bar.addEventListener('pointerup', endSeek); bar.addEventListener('pointercancel', () => { seeking = false; box.classList.remove('seeking'); });

  // vezérlők elrejtése, ha nem mozog az egér
  function wake() {
    box.classList.remove('idle'); clearTimeout(idleT);
    if (playing) idleT = setTimeout(() => { if (!seeking && !box.querySelector('.vp-ctl:hover')) box.classList.add('idle'); }, 2600);
  }
  box.addEventListener('pointermove', wake);

  // billentyűk
  const onKey = e => {
    if (dead || e.target.closest?.('input:not([type=range]),textarea,[contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.querySelector('.modal, #dmodal, .pop')) return;
    const k = e.key.toLowerCase();
    const map = { ' ': toggle, k: toggle, arrowleft: () => skip(-5), arrowright: () => skip(5), j: () => skip(-10), l: () => skip(10),
      arrowup: () => { setVol(vol + 5); flash('Hang: ' + vol + '%'); }, arrowdown: () => { setVol(vol - 5); flash('Hang: ' + vol + '%'); }, m: toggleMute, f: fs, c: toggleCc };
    if (k === 'escape' && box.classList.contains('vp-pseudo')) { fs(); return; }
    if (!map[k]) return;
    if (k.startsWith('arrow') && e.target.type === 'range') return;
    e.preventDefault(); map[k](); wake();
  };
  document.addEventListener('keydown', onKey);
  wake();

  return {
    destroy() {
      dead = true; clearInterval(poll); clearTimeout(idleT); clearTimeout(clickT);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFs); document.removeEventListener('webkitfullscreenchange', onFs);
      document.body.classList.remove('vp-lock');
      A?.destroy?.(); box.innerHTML = '';
    },
    pause() { A?.pause(); },
    play() { A?.play(); },
    seek(t) { A?.seek(t); tick(); },
    time: () => A?.time() || 0,
    dur: () => A?.dur() || 0,
    playing: () => playing,
    ready: () => !!A,
    lock(v) { o.locked = v; box.classList.toggle('locked', !!v); }
  };
}

/* ---------- felirat segédek ---------- */
// MP4: <track> – .vtt közvetlenül, .srt-t VTT-vé alakítjuk; a sáv „hidden”, tehát alapból nem látszik
function addTrack(v, url) {
  const t = document.createElement('track');
  Object.assign(t, { kind: 'subtitles', srclang: 'hu', label: 'Magyar' });
  v.appendChild(t);
  const set = src => { t.src = src; t.track.mode = 'hidden'; };
  if (/\.srt(\?|$)/i.test(url)) {
    fetch(url).then(r => r.ok ? r.text() : Promise.reject()).then(txt => {
      const vtt = 'WEBVTT\n\n' + txt.replace(/\r/g, '').replace(/^\uFEFF/, '').replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, '$1.$2');
      set(URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })));
    }).catch(() => {});
  } else set(url);
}
// YouTube: a feliratmodul be-/kitöltése; ha be: a magyar sáv, ha nincs, az első elérhető
function ytCc(p, on) {
  try {
    if (!on) { p.unloadModule('captions'); p.unloadModule('cc'); return Promise.resolve(true); }
    p.loadModule('captions');
    return new Promise(res => {
      let n = 0;
      const look = () => {
        let l = []; try { l = p.getOption('captions', 'tracklist') || []; } catch (_) {}
        if (l.length) { const t = l.find(x => /^hu/i.test(x.languageCode)) || l[0]; try { p.setOption('captions', 'track', t); } catch (_) {} return res(true); }
        if (++n > 8) { try { p.unloadModule('captions'); } catch (_) {} return res(false); }
        setTimeout(look, 250);
      };
      setTimeout(look, 300);
    });
  } catch (_) { return Promise.resolve(false); }
}
