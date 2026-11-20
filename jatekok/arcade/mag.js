/* HGWS Arcade – közös keret: hangok, főoldali hős-animáció, játékmotor (G), HUD, rajzsegédek (klasszikus szkript, az arcade.html tölti be; a közös keret a jatekok/arcade/mag.js) */
'use strict';
const $ = s => document.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k, d = 0) { try { return +localStorage.getItem('hgws_' + k) || d; } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem('hgws_' + k, v); } catch (_) {} }
};

/* =================== AUDIO =================== */
const Sfx = (() => {
  let ac = null, on = store.get('mute', 0) ? false : true;
  const btn = $('#snd');
  const paint = () => btn.textContent = on ? '🔊' : '🔇';
  paint();
  btn.addEventListener('click', () => { on = !on; store.set('mute', on ? 0 : 1); paint(); if (on) blip(660, .08); });
  function ctx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {} } if (ac && ac.state === 'suspended') ac.resume(); return ac; }
  function blip(f = 440, d = .1, type = 'sine', vol = .15, slide = 0) {
    if (!on) return; const a = ctx(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .02);
  }
  function noise(d = .25, vol = .2, freq = 1200) {
    if (!on) return; const a = ctx(); if (!a) return;
    const n = Math.floor(a.sampleRate * d), b = a.createBuffer(1, n, a.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = .8; g.gain.value = vol;
    s.buffer = b; s.connect(f).connect(g).connect(a.destination); s.start();
  }
  return {
    blip, noise,
    splash: () => { noise(.22, .25, 1800); blip(900, .08, 'sine', .05, .5); },
    coin: () => { blip(880, .07, 'square', .06); setTimeout(() => blip(1320, .12, 'square', .06), 60); },
    hit: () => { blip(160, .25, 'sawtooth', .12, .4); noise(.2, .15, 400); },
    flap: () => blip(520, .09, 'triangle', .1, 1.6),
    shoot: () => noise(.06, .08, 2600),
    boom: () => { noise(.5, .35, 300); blip(90, .5, 'sine', .25, .3); },
    perfect: () => { [784, 988, 1175, 1568].forEach((f, i) => setTimeout(() => blip(f, .12, 'square', .05), i * 55)); }
  };
})();

/* =================== HERO: WebGL water caustics =================== */
let mouse = { x: .5, y: .5, tx: .5, ty: .5, down: 0 };
const ripples = [];
function startHero() {
  // letters
  const t = $('#title'); const txt = t.textContent; t.textContent = '';
  [...txt].forEach((ch, i) => { const s = document.createElement('span'); s.textContent = ch === ' ' ? ' ' : ch; s.style.animationDelay = (0.5 + i * 0.045) + 's'; t.appendChild(s); });
}

(function water() {
  const cv = $('#water');
  const gl = cv.getContext('webgl', { antialias: false, premultipliedAlpha: false });
  if (!gl) { cv.style.background = 'radial-gradient(ellipse at 50% 40%,#123052,#04070e 70%)'; return; }
  const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fs = `precision mediump float;
  uniform vec2 R;uniform float T;uniform vec2 M;uniform vec4 RP[6];
  #define TAU 6.28318530718
  float caustic(vec2 uv,float t){
    vec2 p=mod(uv*TAU,TAU)-250.;vec2 i=p;float c=1.;float inten=.005;
    for(int n=0;n<5;n++){float tt=t*(1.-(3.5/float(n+1)));
      i=p+vec2(cos(tt-i.x)+sin(tt+i.y),sin(tt-i.y)+cos(tt+i.x));
      c+=1./length(vec2(p.x/(sin(i.x+tt)/inten),p.y/(cos(i.y+tt)/inten)));}
    c/=5.;c=1.17-pow(c,1.4);return pow(abs(c),8.);}
  void main(){
    vec2 uv=gl_FragCoord.xy/R;vec2 a=vec2(R.x/R.y,1.);
    vec2 q=uv*a;
    // pointer ripples
    vec2 off=vec2(0.);
    for(int k=0;k<6;k++){vec4 r=RP[k];if(r.w>0.){vec2 d=q-r.xy*a;float dist=length(d);
      float w=sin(dist*38.-r.z*9.)*exp(-dist*5.)*r.w;off+=normalize(d+1e-4)*w*.03;}}
    vec2 m=(M*a);float md=length(q-m);off+=(q-m)*.02*exp(-md*4.);
    float c=caustic(q*1.15+off+vec2(0.,T*.01),T*.35);
    float c2=caustic(q*.6+off*.5+vec2(T*.005,0.),T*.22+3.);
    vec3 deep=mix(vec3(.01,.025,.06),vec3(.02,.07,.14),uv.y);
    vec3 col=deep+vec3(.15,.45,.75)*c*.55+vec3(.1,.3,.55)*c2*.35;
    float g=exp(-length(q-vec2(.5*a.x,.56))*2.3);
    col+=vec3(1.,.66,.25)*g*.22*(.8+.2*sin(T*.7));
    col+=vec3(.2,.55,1.)*exp(-md*6.)*.12;
    gl_FragColor=vec4(col,1.);}`;
  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { cv.style.background = 'radial-gradient(ellipse at 50% 40%,#123052,#04070e 70%)'; return; }
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(pr, 'R'), uT = gl.getUniformLocation(pr, 'T'), uM = gl.getUniformLocation(pr, 'M'), uRP = gl.getUniformLocation(pr, 'RP');
  const scale = Math.min(devicePixelRatio || 1, 1.5) * (innerWidth < 700 ? .6 : .8);
  function size() { cv.width = Math.round(cv.clientWidth * scale); cv.height = Math.round(cv.clientHeight * scale); gl.viewport(0, 0, cv.width, cv.height); }
  size(); addEventListener('resize', size);
  let visible = true;
  new IntersectionObserver(e => visible = e[0].isIntersecting).observe(cv);
  const t0 = performance.now(); const arr = new Float32Array(24);
  (function loop(now) {
    requestAnimationFrame(loop);
    if (!visible || document.hidden || document.body.classList.contains('locked')) return;
    mouse.x += (mouse.tx - mouse.x) * .06; mouse.y += (mouse.ty - mouse.y) * .06;
    for (let k = 0; k < 6; k++) {
      const r = ripples[k];
      if (r) { r.age += .016; r.amp *= .975; arr.set([r.x, r.y, r.age, r.amp > .02 ? r.amp : 0], k * 4); }
      else arr.set([0, 0, 0, 0], k * 4);
    }
    gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, reduce ? 10 : (now - t0) / 1000);
    gl.uniform2f(uM, mouse.x, 1 - mouse.y); gl.uniform4fv(uRP, arr);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  })(t0);
})();

/* =================== HERO: particles + click splashes =================== */
const Hero = (() => {
  const c = $('#fx'), x = c.getContext('2d'); let W, H, d, drops = [], bursts = [], glow = [];
  // pre-rendered droplet sprite: dark refracted top, bright focused bottom, rim light, specular
  const S = 96, R = S * .42, C = S / 2;
  const spr = document.createElement('canvas'); spr.width = spr.height = S; const s = spr.getContext('2d');
  let gr = s.createLinearGradient(0, C - R, 0, C + R);
  gr.addColorStop(0, 'rgba(4,12,30,.55)'); gr.addColorStop(.5, 'rgba(30,80,140,.22)'); gr.addColorStop(1, 'rgba(160,215,255,.5)');
  s.fillStyle = gr; s.beginPath(); s.arc(C, C, R, 0, 6.283); s.fill();
  gr = s.createRadialGradient(C, C, R * .72, C, C, R); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.85, 'rgba(190,230,255,.12)'); gr.addColorStop(1, 'rgba(235,248,255,.45)');
  s.fillStyle = gr; s.beginPath(); s.arc(C, C, R, 0, 6.283); s.fill();
  gr = s.createRadialGradient(C, C + R * .5, 0, C, C + R * .5, R * .62); gr.addColorStop(0, 'rgba(225,246,255,.6)'); gr.addColorStop(1, 'rgba(225,246,255,0)');
  s.fillStyle = gr; s.beginPath(); s.arc(C, C, R * .97, 0, 6.283); s.fill();
  s.fillStyle = 'rgba(255,255,255,.95)'; s.beginPath(); s.ellipse(C - R * .36, C - R * .42, R * .2, R * .11, -.6, 0, 6.283); s.fill();
  s.fillStyle = 'rgba(255,255,255,.55)'; s.beginPath(); s.arc(C + R * .4, C + R * .28, R * .06, 0, 6.283); s.fill();
  const shd = document.createElement('canvas'); shd.width = shd.height = S; const t = shd.getContext('2d');
  gr = t.createRadialGradient(C, C, R * .55, C, C, R * 1.08); gr.addColorStop(0, 'rgba(0,0,0,.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); t.fillStyle = gr; t.beginPath(); t.arc(C, C, R * 1.08, 0, 6.283); t.fill();

  function newDrop(y) {
    const big = Math.random() < .14;
    return { x: Math.random() * W, y: y == null ? Math.random() * H : y, r: (big ? 5 + Math.random() * 6 : .9 + Math.random() * 3.2) * d,
      vy: 0, slide: false, wob: Math.random() * 6, born: performance.now() };
  }
  function size() {
    d = Math.min(devicePixelRatio || 1, 2); W = c.width = c.clientWidth * d; H = c.height = c.clientHeight * d;
    const n = Math.round(c.clientWidth * c.clientHeight / 7000) + 40;
    drops = Array.from({ length: n }, () => newDrop());
    glow = Array.from({ length: 10 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: (30 + Math.random() * 70) * d, v: (.05 + Math.random() * .12) * d, t: Math.random() * 6 }));
  }
  size(); addEventListener('resize', size);
  function sprite(px, py, r, stretch = 1, alpha = 1) {
    const w = r * 2 / .84, h = w * stretch;
    x.globalAlpha = alpha * .9; x.drawImage(shd, px - w / 2, py - h / 2 + r * .25, w, h);
    x.globalAlpha = alpha; x.drawImage(spr, px - w / 2, py - h / 2, w, h); x.globalAlpha = 1;
  }
  function burst(px, py, gold, n = 26) {
    const r = c.getBoundingClientRect(); px = (px - r.left) * d; py = (py - r.top) * d;
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, sp = (2 + Math.random() * 7) * d;
      bursts.push({ x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3 * d, l: 1, r: (1.5 + Math.random() * 3.5) * d, gold }); }
    if (!gold) for (let i = 0; i < 6; i++) { const dd = newDrop(); dd.x = px + (Math.random() - .5) * 120 * d; dd.y = py + (Math.random() - .5) * 120 * d; drops.push(dd); }
  }
  let last = performance.now(), spawnT = 0;
  (function loop(now) {
    requestAnimationFrame(loop); if (document.hidden || document.body.classList.contains('locked')) { last = now; return; }
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    x.clearRect(0, 0, W, H);
    // warm soft light orbs (out-of-focus)
    for (const g of glow) { g.y -= g.v; g.t += .01; if (g.y < -g.r) { g.y = H + g.r; g.x = Math.random() * W; }
      const a = .045 * (.7 + .3 * Math.sin(g.t)), gg = x.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
      gg.addColorStop(0, `rgba(255,196,110,${a})`); gg.addColorStop(1, 'rgba(255,190,90,0)'); x.fillStyle = gg; x.beginPath(); x.arc(g.x, g.y, g.r, 0, 6.283); x.fill(); }
    if (!reduce) {
      // new drops land on the glass
      spawnT -= dt; if (spawnT <= 0 && drops.length < 260) { spawnT = .08 + Math.random() * .2; drops.push(newDrop()); }
      for (const p of drops) {
        if (!p.slide && p.r > 4.5 * d && Math.random() < dt * .08) p.slide = true;
        if (p.slide) {
          p.vy = Math.min(p.vy + 120 * d * dt, (40 + p.r / d * 14) * d); p.y += p.vy * dt; p.x += Math.sin(p.y / (30 * d) + p.wob) * .25 * d;
          if (Math.random() < dt * 9) { drops.push({ x: p.x + (Math.random() - .5) * p.r * .6, y: p.y - p.r * 1.3, r: Math.max(.7 * d, p.r * (.12 + Math.random() * .18)), vy: 0, slide: false, wob: 0, trail: 1 }); p.r *= .985; }
          if (p.r < 3 * d) { p.slide = false; p.vy = 0; }
        }
      }
      // merge: sliding drops swallow what they touch
      for (const p of drops) if (p.slide && !p.dead) for (const q of drops) {
        if (q === p || q.dead || q.slide) continue;
        const dx = q.x - p.x, dy = q.y - p.y; if (Math.abs(dx) > p.r * 1.4 || Math.abs(dy) > p.r * 1.4) continue;
        if (dx * dx + dy * dy < (p.r + q.r) * (p.r + q.r) * .8 && !q.trail) { q.dead = true; p.r = Math.min(13 * d, Math.sqrt(p.r * p.r + q.r * q.r)); }
      }
      drops = drops.filter(p => !p.dead && p.y < H + 30 * d);
      if (drops.length > 340) drops.splice(0, drops.length - 340);
    }
    for (const p of drops) sprite(p.x, p.y, p.r, p.slide ? 1 + Math.min(.45, p.vy / (300 * d)) : 1);
    for (const b of bursts) { b.x += b.vx; b.y += b.vy; b.vy += .28 * d; b.vx *= .985; b.l -= .02;
      if (b.gold) { const gg = x.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 2.2); gg.addColorStop(0, `rgba(255,235,170,${Math.max(0, b.l)})`); gg.addColorStop(.4, `rgba(255,190,90,${Math.max(0, b.l) * .8})`); gg.addColorStop(1, 'rgba(255,170,60,0)');
        x.fillStyle = gg; x.beginPath(); x.arc(b.x, b.y, b.r * 2.2, 0, 6.283); x.fill(); }
      else sprite(b.x, b.y, b.r, 1, Math.max(0, b.l)); }
    bursts = bursts.filter(b => b.l > 0);
  })(last);
  return { burst };
})();

const hero = $('#top');
hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); mouse.tx = (e.clientX - r.left) / r.width; mouse.ty = (e.clientY - r.top) / r.height; tilt(e); });
hero.addEventListener('pointerdown', e => {
  if (e.target.closest('a,button,#logo')) return;
  const r = hero.getBoundingClientRect();
  ripples.unshift({ x: (e.clientX - r.left) / r.width, y: 1 - (e.clientY - r.top) / r.height, age: 0, amp: 1 }); ripples.length = Math.min(ripples.length, 6);
  Hero.burst(e.clientX, e.clientY, false, 18); Sfx.splash();
});

const logo = $('#logo');
function tilt(e) {
  if (reduce || innerWidth < 700) return;
  const r = logo.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const dx = (e.clientX - cx) / innerWidth, dy = (e.clientY - cy) / innerHeight;
  logo.style.transform = `rotateY(${dx * 28}deg) rotateX(${-dy * 28}deg)`;
}
hero.addEventListener('pointerleave', () => logo.style.transform = '');
const toast = $('#toast'); function say(t) { toast.textContent = t; toast.classList.remove('go'); void toast.offsetWidth; toast.classList.add('go'); }
const words = ['VÍZ!', 'ERŐ!', 'TECHNIKA!', 'ÉLETFORMA!', 'HGWS!', '6.0 BAR!', 'LOCSOLÁS!'];
let lt = 0, combo = 0;
function hitLogo() {
  logo.classList.remove('boom'); void logo.offsetWidth; logo.classList.add('boom');
  const r = logo.getBoundingClientRect(); Hero.burst(r.left + r.width / 2, r.top + r.height / 2, true, 40);
  const now = performance.now(); combo = now - lt < 600 ? combo + 1 : 1; lt = now;
  if (combo >= 7) { say('🏆 LOCSOLÓ ISTEN MÓD!'); Sfx.perfect(); for (let i = 0; i < 6; i++) setTimeout(() => Hero.burst(Math.random() * innerWidth, Math.random() * innerHeight * .7, i % 2 === 0, 30), i * 90); combo = 0; }
  else { say(words[(combo - 1) % words.length]); Sfx.coin(); }
}
logo.addEventListener('click', hitLogo);
logo.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hitLogo(); } });

const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target);
  e.target.querySelectorAll && e.target.querySelectorAll('[data-count]').forEach(count); } }), { threshold: .15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));
function count(el) {
  const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), t0 = performance.now(), dur = 1600;
  (function f(now) { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    el.textContent = (to * e).toLocaleString('hu-HU', { minimumFractionDigits: dec, maximumFractionDigits: dec }); if (k < 1) requestAnimationFrame(f); })(t0);
}

/* =================== GAME FRAMEWORK =================== */
const gEl = $('#game'), gc = $('#gc'), g = gc.getContext('2d');
const UI = { score: $('#gScore'), best: $('#gBest'), lives: $('#gLives'), pStart: $('#pStart'), pOver: $('#pOver') };
const G = { W: 0, H: 0, d: 1, t: 0, score: 0, lives: 3, running: false, shake: 0, fx: [], fl: [], game: null, raf: 0, last: 0,
  rnd: (a, b) => a + Math.random() * (b - a),
  add(n, x, y, label) { this.score += n; if (x != null) this.float(x, y, label || '+' + n); hud(); },
  float(x, y, text, bad) { this.fl.push({ x, y, text, l: 1, bad }); },
  splash(x, y, col = '150,215,255', n = 20, sp = 6) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = (1 + Math.random() * sp) * this.d;
    this.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2 * this.d, l: 1, r: (1.5 + Math.random() * 3) * this.d, col }); } },
  lose() { this.lives--; this.shake = 14 * this.d; Sfx.hit(); hud(); if (navigator.vibrate) navigator.vibrate(60); if (this.lives <= 0) over(); },
  end() { over(); }
};
/* nagy számok rövidítve (idle-játékos jelölés): 1,5 M · 12,3 B (milliárd) · 4 T · 2 Qa … */
const bigNum = n => { n = Math.floor(n || 0); if (!isFinite(n)) return '∞'; if (n < 1e6) return n.toLocaleString('hu-HU');
  const k = Math.floor(Math.log10(n) / 3) - 1, m = n / 10 ** (3 * (k + 1)), num = m.toLocaleString('hu-HU', { maximumFractionDigits: m < 10 ? 2 : m < 100 ? 1 : 0 });
  const U = ['', 'U', 'D', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No'], T = ['', 'Dc', 'Vg', 'Tg', 'Qag', 'Qig', 'Sxg', 'Spg', 'Ocg', 'Nog'], F = ['', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No'];
  return k >= 100 ? num + ' × 10^' + 3 * (k + 1) : num + ' ' + (k < 10 ? F[k] : U[k % 10] + T[Math.floor(k / 10)]); };
function hud() {
  UI.score.textContent = bigNum(G.score) + (G.game.unit || ' PONT');
  UI.best.textContent = 'REKORD ' + bigNum(store.get('best_' + G.game.id)) + (G.game.unit || '');
  UI.lives.textContent = G.game.lives ? '💧'.repeat(Math.max(0, G.lives)) + '🥀'.repeat(Math.max(0, G.game.lives - G.lives)) : '';
  UI.lives.style.display = G.game.lives ? '' : 'none';
}
function gsize() { G.d = Math.min(devicePixelRatio || 1, 2); G.W = gc.width = innerWidth * G.d; G.H = gc.height = innerHeight * G.d; G.game && G.game.resize && G.game.resize(G); }
addEventListener('resize', () => { if (gEl.classList.contains('open')) gsize(); });

function openGame(game) {
  if (game.ext) return openExt(game);
  G.game = game; gEl.classList.add('open'); document.body.classList.add('locked'); gsize();
  $('#pTitle').textContent = game.name; $('#pDesc').textContent = game.desc; $('#pHow').textContent = game.how;
  $('#pCredit').hidden = !game.credit; $('#pCredit').textContent = game.credit || ''; $('#pLink').hidden = !game.link; if (game.link) { $('#pLink').href = game.link.url; $('#pLink').textContent = game.link.label; }
  $('#pSpon').hidden = !game.sponsor; $('#pSpon').textContent = game.sponsor || ''; $('#gQuit').hidden = !game.quit;
  UI.pStart.hidden = false; UI.pOver.hidden = true; G.running = false; G.score = 0; G.lives = game.lives || 0; G.fx = []; G.fl = [];
  game.init(G); hud();
  cancelAnimationFrame(G.raf); G.last = performance.now(); G.raf = requestAnimationFrame(loop);
}
function start() { UI.pStart.hidden = true; UI.pOver.hidden = true; G.score = 0; G.win = 0; G.lives = G.game.lives || 0; G.fx = []; G.fl = []; G.t = 0; G.game.init(G); G.running = true; hud(); Sfx.blip(660, .1, 'square', .06); }
function over() {
  if (!G.running) return; G.running = false; Sfx.boom();
  const id = 'best_' + G.game.id, prev = store.get(id), nb = G.score > prev; if (nb) store.set(id, G.score);
  if (G.win) store.set('wins_' + G.game.id, store.get('wins_' + G.game.id) + 1);
  $('#oTitle').textContent = G.game.overTitle || 'VÉGE';
  $('#oScore').textContent = bigNum(G.score) + (G.game.unit || '');
  $('#oRank').textContent = (G.game.ranks.filter(r => G.score >= r[0]).pop() || [0, ''])[1].toUpperCase();
  $('#oBest').textContent = (nb ? '🏆 ÚJ REKORD!' : 'Rekord: ' + bigNum(prev) + (G.game.unit || '')) + (G.win || store.get('wins_' + G.game.id) ? ' · 🏆 ×' + store.get('wins_' + G.game.id) : '');
  setTimeout(() => { UI.pOver.hidden = false; }, 450); hud(); renderCards();
  if (window.top !== window && G.score > 0) parent.postMessage({ hgws: 'score', game: G.game.id, score: G.score, win: !!G.win }, location.origin);
}
function close() { if (G.game && G.game.leave) G.game.leave(G); if (G.running && G.game.quit && G.score > 0) over(); G.running = false; cancelAnimationFrame(G.raf); gEl.classList.remove('open'); document.body.classList.remove('locked'); renderCards(); }
$('#gQuit').onclick = () => { if (G.running) over(); };
$('#pGo').onclick = start; $('#oAgain').onclick = start; $('#oExit').onclick = close; $('#gClose').onclick = close;
addEventListener('keydown', e => { if (!gEl.classList.contains('open')) return; if (e.key === 'Escape') close();
  if ((e.key === ' ' || e.key === 'ArrowUp') && G.running && G.game.down) { e.preventDefault(); G.game.down(G, G.W / 2, G.H / 2, true); } });
const P = e => [e.clientX * G.d, e.clientY * G.d];
gc.addEventListener('pointerdown', e => { if (G.running && G.game.down) G.game.down(G, ...P(e), e); });
gc.addEventListener('pointermove', e => { if (G.running && G.game.move) G.game.move(G, ...P(e), e.buttons || e.pointerType === 'touch', e); });
gc.addEventListener('pointerup', e => { if (G.running && G.game.up) G.game.up(G, ...P(e), e); });
gc.addEventListener('pointercancel', e => { if (G.running && G.game.up) G.game.up(G, ...P(e), e); });

function loop(now) {
  G.raf = requestAnimationFrame(loop);
  const dt = Math.min(.04, (now - G.last) / 1000); G.last = now;
  if (G.running) { G.t += dt; G.game.update(G, dt); }
  g.save();
  if (G.shake > .3) { g.translate((Math.random() - .5) * G.shake, (Math.random() - .5) * G.shake); G.shake *= .86; }
  G.game.draw(g, G, now / 1000);
  for (const p of G.fx) { p.x += p.vx; p.y += p.vy; p.vy += .3 * G.d; p.vx *= .98; p.l -= .025;
    g.fillStyle = `rgba(${p.col},${Math.max(0, p.l)})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill(); }
  G.fx = G.fx.filter(p => p.l > 0);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const f of G.fl) { f.y -= .9 * G.d; f.l -= .02; g.font = `700 ${22 * G.d}px Inter, sans-serif`;
    g.lineWidth = 4 * G.d; g.strokeStyle = `rgba(0,0,0,${Math.max(0, f.l) * .6})`; g.strokeText(f.text, f.x, f.y);
    g.fillStyle = f.bad ? `rgba(255,100,90,${Math.max(0, f.l)})` : `rgba(255,225,140,${Math.max(0, f.l)})`; g.fillText(f.text, f.x, f.y); }
  G.fl = G.fl.filter(f => f.l > 0);
  g.restore();
}

/* helpers for drawing */
function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function bg(top, bot) { const gr = g.createLinearGradient(0, 0, 0, G.H); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(-20, -20, G.W + 40, G.H + 40); }

/* =================== GAME 1: Locsoló Mester =================== */
