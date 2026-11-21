/* HGWS Arcade – Cseppugró (klasszikus szkript, az arcade.html tölti be; a közös keret a jatekok/arcade/mag.js) */
'use strict';
const Ugro = (() => {
  const K = { L: 0, R: 0 }, KEYS = { ArrowLeft: 'L', a: 'L', A: 'L', ArrowRight: 'R', d: 'R', D: 'R' };
  let tx = null;
  const active = () => typeof G !== 'undefined' && G.running && G.game && G.game.id === 'ugro';
  if (typeof addEventListener === 'function') {
    addEventListener('keydown', e => { const k = KEYS[e.key]; if (!k || !active()) return; K[k] = 1; tx = null; e.preventDefault(); });
    addEventListener('keyup', e => { const k = KEYS[e.key]; if (k) K[k] = 0; });
    addEventListener('blur', () => { K.L = K.R = 0; });
  }
  const GR = 1500, JV = 720, SPRING = 1250, JET = 1150, M = 12; // M: ennyi képpont egy méter
  return {
    id: 'ugro', name: 'CSEPPUGRÓ', lives: 0, unit: ' m', overTitle: 'A CSEPP LEZUHANT',
    desc: 'Pattogj levélről levélre egyre magasabbra! A száraz levél letörik, a locsolófej fellő, a kaktuszt csak felülről érintsd.',
    how: 'EGÉR / UJJ / ← → = IRÁNYÍTÁS',
    ranks: [[0, 'Harmatcsepp'], [150, 'Esőcsepp'], [400, 'Szökőkút'], [800, 'Gejzír'], [1500, 'FELHŐKARCOLÓ']],
    init(G) { const d = G.d; this.fw = Math.min(G.W, 460 * d); this.ox = (G.W - this.fw) / 2; this.p = { x: this.fw / 2, y: 0, vx: 0, vy: -JV * d, face: 1 }; this.cam = -G.H * .7; this.pl = []; this.en = []; this.it = []; this.top = 40 * d; this.best = 0; this.jet = 0; this.dead = 0; tx = null; K.L = K.R = 0;
      this.pl.push({ x: this.fw / 2, y: 40 * d, w: 90 * d, k: 0 }); this.gen(G); },
    resize(G) { const d = G.d, f = Math.min(G.W, 460 * d); if (this.p && f !== this.fw) { const k = f / this.fw; for (const l of [this.pl, this.en, this.it, [this.p]]) for (const o of l) o.x *= k; this.fw = f; } this.ox = (G.W - (this.fw || f)) / 2; },
    gen(G) { const d = G.d, R = G.rnd;
      while (this.top > this.cam - G.H * .6) { const h = -this.top / (M * d), hard = Math.min(1, h / 1800), gap = R(55, 95 + 60 * hard) * d; this.top -= gap;
        const w = (78 - 22 * hard) * d, x = R(w / 2 + 6 * d, this.fw - w / 2 - 6 * d), r = Math.random();
        const p = { x, y: this.top, w, k: r < .1 + .22 * hard ? 1 : r < .14 + .4 * hard ? 2 : 0 }; if (p.k === 1) { p.vx = R(50, 120) * d * (Math.random() < .5 ? -1 : 1); } this.pl.push(p);
        if (p.k === 0 && Math.random() < .09) p.spring = R(-.3, .3) * w;
        else if (p.k === 0 && h > 60 && Math.random() < .025) this.it.push({ x, y: this.top - 20 * d });
        if (Math.random() < .12 + .1 * hard) { const fx = R(40 * d, this.fw - 40 * d); if (Math.abs(fx - x) > w * 1.2) this.pl.push({ x: fx, y: this.top + R(-18, 18) * d, w: 70 * d, k: 3 }); }
        if (h > 250 && Math.random() < .04 + .07 * hard) { const ex = R(30 * d, this.fw - 30 * d); if (Math.abs(ex - x) > 70 * d) this.en.push({ x: ex, y: this.top - gap * .5, x0: ex, ph: R(0, 6) }); } } },
    aim(G, x) { tx = x - this.ox; },
    down(G, x, y, e) { if (e === true) return; this.aim(G, x); },
    move(G, x) { this.aim(G, x); },
    up(G, x, y, e) { if (e && e.pointerType === 'touch') tx = null; },
    update(G, dt) { const d = G.d, p = this.p, r = 14 * d; if (this.dead) return;
      const dir = K.R - K.L, mx = 520 * d; if (dir) { if (p.vx * dir < 0) p.vx = 0; p.vx += dir * 3400 * d * dt; p.vx = Math.max(-mx, Math.min(mx, p.vx)); } else if (tx != null) { const t = Math.max(-mx, Math.min(mx, (tx - p.x) * 9)); p.vx += (t - p.vx) * Math.min(1, dt * 14); } else p.vx *= Math.pow(1e-9, dt);   // elengedés után szinte azonnal megáll
      if (Math.abs(p.vx) > 20 * d) p.face = p.vx > 0 ? 1 : -1;
      const y0 = p.y; if (this.jet > 0) { this.jet -= dt; p.vy = -JET * d; if (Math.random() < .6) G.splash(this.ox + p.x, p.y - this.cam + r, '150,215,255', 2, 3); } else p.vy += GR * d * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; if (p.x < -r) { p.x += this.fw + 2 * r; if (tx != null) tx = Math.max(tx, this.fw * .5); } if (p.x > this.fw + r) { p.x -= this.fw + 2 * r; if (tx != null) tx = Math.min(tx, this.fw * .5); }
      for (const q of this.pl) { if (q.k === 1) { q.x += q.vx * dt; if (q.x < q.w / 2 || q.x > this.fw - q.w / 2) q.vx *= -1; } if (q.gone) { q.fy = (q.fy || 0) + 500 * d * dt; q.y += q.fy * dt; } }
      if (p.vy > 0) for (const q of this.pl) { if (q.gone || y0 + r > q.y + 2 * d || p.y + r < q.y || Math.abs(p.x - q.x) > q.w / 2 + r * .55) continue;
        if (q.k === 3) { q.gone = 1; Sfx.hit(); G.splash(this.ox + q.x, q.y - this.cam, '150,110,70', 10, 3); continue; }
        p.y = q.y - r; const sp = q.spring != null && Math.abs(p.x - (q.x + q.spring)) < 16 * d; p.vy = -(sp ? SPRING : JV) * d; q.sq = 1; if (sp) { q.pop = 1; Sfx.boom(); } else Sfx.flap(); G.splash(this.ox + p.x, q.y - this.cam, '150,215,255', sp ? 14 : 5, sp ? 5 : 2); if (q.k === 2) { q.gone = 1; q.fade = 1; } break; }
      for (const q of this.pl) { if (q.sq) q.sq = Math.max(0, q.sq - dt * 5); if (q.pop) q.pop = Math.max(0, q.pop - dt * 3); }
      for (const it of this.it) if (!it.got && Math.hypot(it.x - p.x, it.y - p.y) < r + 16 * d) { it.got = 1; this.jet = 1.7; Sfx.shoot(); G.float(this.ox + p.x, p.y - this.cam - 30 * d, 'VÍZSUGÁR!'); }
      for (const e of this.en) { if (e.dead) continue; e.x = e.x0 + Math.sin(G.t * 1.6 + e.ph) * 34 * d; if (Math.abs(e.x - p.x) < r + 15 * d && Math.abs(e.y - p.y) < r + 15 * d) {
        if (this.jet > 0 || (p.vy > 0 && y0 + r * .2 < e.y - 8 * d)) { e.dead = 1; if (this.jet <= 0) p.vy = -JV * d; Sfx.coin(); G.splash(this.ox + e.x, e.y - this.cam, '120,200,90', 22, 5); G.float(this.ox + e.x, e.y - this.cam, '💥'); }
        else return this.die(G); } }
      const want = p.y - G.H * .42; if (want < this.cam) this.cam += (want - this.cam) * Math.min(1, dt * 12);
      const h = Math.floor(-p.y / (M * d)); if (h > this.best) { G.add(h - this.best); this.best = h; }
      this.gen(G); const low = this.cam + G.H + 80 * d; this.pl = this.pl.filter(q => q.y < low); this.en = this.en.filter(e => e.y < low && !e.dead); this.it = this.it.filter(i => i.y < low && !i.got);
      if (p.y - r > this.cam + G.H) this.die(G); },
    die(G) { if (this.dead) return; this.dead = 1; G.shake = 14 * G.d; Sfx.hit(); G.splash(this.ox + this.p.x, Math.min(G.H - 10, this.p.y - this.cam), '150,215,255', 36, 7); G.end(); },
    draw(g, G, t) { const d = G.d, p = this.p, k = Math.min(1, this.best / 2000), mix = (a, b) => Math.round(a + (b - a) * k);
      bg(`rgb(${mix(18, 6)},${mix(52, 10)},${mix(74, 34)})`, `rgb(${mix(10, 14)},${mix(40, 8)},${mix(28, 30)})`);
      g.save(); g.beginPath(); g.rect(this.ox, 0, this.fw, G.H); g.clip(); g.translate(this.ox, -this.cam);
      // háttér: lassan úszó buborékok / csillagok
      g.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 26; i++) { const bx = ((i * 7919) % 1000) / 1000 * this.fw, span = G.H * 1.6, by = this.cam + ((((i * 3301) % 1000) / 1000 * span - this.cam * .35) % span + span) % span - G.H * .3; g.beginPath(); g.arc(bx, by, (2 + i % 4) * d, 0, 6.283); g.fill(); }
      const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
      for (const q of this.pl) { const h = 13 * d, sy = q.y + (q.sq || 0) * 4 * d; g.globalAlpha = q.fade ? Math.max(0, 1 - (q.fy || 0) / (300 * d)) : 1;
        if (q.k === 0) { g.fillStyle = '#2f8f3f'; rr(q.x - q.w / 2, sy, q.w, h, h / 2); g.fill(); g.fillStyle = '#5ee08a'; rr(q.x - q.w / 2 + 3 * d, sy + 2 * d, q.w - 6 * d, 4 * d, 2 * d); g.fill(); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.5 * d; g.beginPath(); g.moveTo(q.x - q.w / 2 + 8 * d, sy + h * .62); g.lineTo(q.x + q.w / 2 - 8 * d, sy + h * .62); g.stroke(); }
        else if (q.k === 1) { const gr = g.createLinearGradient(0, sy, 0, sy + h); gr.addColorStop(0, '#c3ced9'); gr.addColorStop(1, '#46525f'); g.fillStyle = gr; rr(q.x - q.w / 2, sy, q.w, h, 4 * d); g.fill(); g.fillStyle = '#e8b656'; g.fillRect(q.x - q.w / 2 - 2 * d, sy - 2 * d, 8 * d, h + 4 * d); g.fillRect(q.x + q.w / 2 - 6 * d, sy - 2 * d, 8 * d, h + 4 * d); }
        else if (q.k === 2) { g.fillStyle = 'rgba(235,245,255,.92)'; for (const [ox, rr2] of [[-.3, .62], [0, .8], [.3, .62]]) { g.beginPath(); g.arc(q.x + ox * q.w, sy + h * .5, h * rr2, 0, 6.283); g.fill(); } }
        else { g.fillStyle = '#7a5230'; rr(q.x - q.w / 2, sy, q.w, h, h / 2); g.fill(); g.strokeStyle = '#3a2410'; g.lineWidth = 2 * d; g.beginPath(); g.moveTo(q.x - 4 * d, sy); g.lineTo(q.x + 3 * d, sy + h * .5); g.lineTo(q.x - 3 * d, sy + h); g.stroke(); }
        if (q.spring != null) { const sx = q.x + q.spring, up = (q.pop || 0) * 10 * d; g.fillStyle = '#8a6a2a'; g.fillRect(sx - 3 * d, sy - 8 * d - up, 6 * d, 8 * d + up); g.fillStyle = '#e8b656'; rr(sx - 11 * d, sy - 15 * d - up, 22 * d, 8 * d, 3 * d); g.fill(); g.fillStyle = '#fff3c4'; g.fillRect(sx - 7 * d, sy - 13 * d - up, 14 * d, 2 * d); }
        g.globalAlpha = 1; }
      for (const it of this.it) { if (it.got) continue; const by = it.y + Math.sin(t * 4 + it.x) * 3 * d; g.fillStyle = '#6cc6ff'; rr(it.x - 7 * d, by - 12 * d, 14 * d, 22 * d, 5 * d); g.fill(); g.fillStyle = '#e8b656'; g.fillRect(it.x - 4 * d, by - 17 * d, 8 * d, 6 * d); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(it.x - 4 * d, by - 8 * d, 3 * d, 12 * d); }
      for (const e of this.en) { if (e.dead) continue; const s = 15 * d; g.fillStyle = '#3f9a4a'; rr(e.x - s * .7, e.y - s, s * 1.4, s * 2, s * .7); g.fill(); rr(e.x - s * 1.35, e.y - s * .3, s * .6, s * .9, s * .3); g.fill(); rr(e.x + s * .75, e.y - s * .6, s * .6, s * .9, s * .3); g.fill();
        g.strokeStyle = '#d8f0c0'; g.lineWidth = 1.5 * d; for (let i = 0; i < 6; i++) { const a = i * 1.047 + .3; g.beginPath(); g.moveTo(e.x + Math.cos(a) * s * .7, e.y + Math.sin(a) * s); g.lineTo(e.x + Math.cos(a) * s * 1.05, e.y + Math.sin(a) * s * 1.35); g.stroke(); }
        g.fillStyle = '#10200f'; g.beginPath(); g.arc(e.x - 4 * d, e.y - 3 * d, 2.2 * d, 0, 6.283); g.arc(e.x + 4 * d, e.y - 3 * d, 2.2 * d, 0, 6.283); g.fill(); g.strokeStyle = '#10200f'; g.beginPath(); g.moveTo(e.x - 7 * d, e.y - 8 * d); g.lineTo(e.x - 1 * d, e.y - 6 * d); g.moveTo(e.x + 7 * d, e.y - 8 * d); g.lineTo(e.x + 1 * d, e.y - 6 * d); g.stroke(); }
      // a csepp (a pálya szélén átfordulva mindkét oldalon látszik)
      if (!this.dead) for (const wx of [0, -this.fw - 28 * d, this.fw + 28 * d]) { const r = 15 * d, st = Math.max(-.22, Math.min(.3, -p.vy / (2600 * d))); g.save(); g.translate(p.x + wx, p.y); g.scale(1 - st * .6, 1 + st);
        if (this.jet > 0) { g.fillStyle = 'rgba(150,215,255,.55)'; g.beginPath(); g.moveTo(-7 * d, r * .6); g.lineTo(0, r * (2.2 + Math.random())); g.lineTo(7 * d, r * .6); g.fill(); }
        const gr = g.createRadialGradient(-r * .3, -r * .2, 1, 0, 0, r * 1.5); gr.addColorStop(0, '#e6f7ff'); gr.addColorStop(.4, '#6cc6ff'); gr.addColorStop(1, '#1a6fb8'); g.fillStyle = gr;
        g.beginPath(); g.moveTo(0, -r * 1.75); g.quadraticCurveTo(r * 1.05, -r * .5, r, .1 * r); g.arc(0, .1 * r, r, 0, Math.PI); g.quadraticCurveTo(-r * 1.05, -r * .5, 0, -r * 1.75); g.fill();
        g.fillStyle = '#04121f'; g.beginPath(); g.arc(p.face * r * .15 - r * .28, -r * .05, 2.6 * d, 0, 6.283); g.arc(p.face * r * .15 + r * .28, -r * .05, 2.6 * d, 0, 6.283); g.fill(); g.restore(); }
      g.restore();
      if (this.ox > 0) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 0, this.ox, G.H); g.fillRect(this.ox + this.fw, 0, this.ox + 1, G.H); }
    }
  };
})();
