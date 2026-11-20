/* HGWS Arcade – Locsoló (klasszikus szkript, az arcade.html tölti be; a közös keret a jatekok/arcade/mag.js) */
'use strict';
const Locsolo = {
  id: 'locsolo', name: 'LOCSOLÓ MESTER', lives: 3, overTitle: 'KISZÁRADT A KERT',
  desc: 'Szikkadt Szilárd kiszárítja a kertet! Bökj a hervadó virágokra, mielőtt elszáradnak. Gyors egymásutáni locsolás = kombó.',
  how: 'KOPPINTÁS / KATTINTÁS · 3 ÉLET',
  ranks: [[0, 'Kezdő kertész'], [400, 'Slagforgató'], [1200, 'Szórófej-mester'], [2500, 'PLC-öntöző'], [5000, 'Az Arany Locsolófej ura']],
  init(G) { this.pl = []; this.combo = 0; this.ct = 0; this.layout(G); this.pl.forEach(p => { p.w = .6 + Math.random() * .4; p.dead = 0; p.rate = .6 + Math.random() * .8; }); },
  resize(G) { this.layout(G); },
  layout(G) {
    const cols = G.W / G.d < 600 ? 3 : 5, rows = G.W / G.d < 600 ? 4 : 3, top = 80 * G.d, px = 16 * G.d, pb = 24 * G.d;
    const cw = (G.W - px * 2) / cols, ch = (G.H - top - pb) / rows, old = this.pl || [];
    this.pl = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const p = old[r * cols + c] || { w: 1, dead: 0, rate: 1, wob: Math.random() * 6 };
      p.x = px + cw * (c + .5); p.y = top + ch * (r + .55); p.s = Math.min(cw, ch) * .4; p.wob = p.wob || Math.random() * 6; this.pl.push(p); }
  },
  update(G, dt) {
    this.ct -= dt; if (this.ct <= 0) this.combo = 0;
    const diff = 1 + G.t / 22;
    for (const p of this.pl) { if (p.dead > 0) { p.dead -= dt; if (p.dead <= 0) { p.dead = 0; p.w = .9; p.rate = .6 + Math.random() * .8; } continue; }
      p.w -= dt * .075 * p.rate * diff;
      if (p.w <= 0) { p.w = 0; p.dead = 2.5; G.float(p.x, p.y - p.s, 'ELSZÁRADT!', true); G.lose(); if (!G.running) return; } }
  },
  down(G, x, y) {
    let hit = null, bd = 1e9; for (const p of this.pl) { const dd = Math.hypot(p.x - x, p.y - p.s * .3 - y); if (dd < p.s * 1.15 && dd < bd) { bd = dd; hit = p; } }
    if (!hit || hit.dead) { G.splash(x, y, '150,215,255', 6, 3); return; }
    const gain = 1 - hit.w; hit.w = 1; this.combo = this.ct > 0 ? this.combo + 1 : 1; this.ct = 1.1;
    const m = Math.min(this.combo, 5), pts = Math.round(10 + gain * 25) * m;
    G.add(pts, hit.x, hit.y - hit.s * 1.2, '+' + pts + (m > 1 ? ' x' + m : '')); G.splash(hit.x, hit.y - hit.s * .4, '150,215,255', 24, 5); Sfx.splash();
  },
  draw(g, G, t) {
    bg('#2a1a0c', '#0f0904');
    const sg = g.createRadialGradient(G.W * .85, G.H * .05, 0, G.W * .85, G.H * .05, G.W * .6); sg.addColorStop(0, 'rgba(255,170,60,.35)'); sg.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = sg; g.fillRect(0, 0, G.W, G.H);
    for (const p of this.pl) {
      const s = p.s, x = p.x, y = p.y, w = Math.max(0, p.w), dead = p.dead > 0;
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x, y + s * .78, s * .45, s * .1, 0, 0, 6.283); g.fill();
      g.fillStyle = '#7a4325'; g.beginPath(); g.moveTo(x - s * .45, y + s * .15); g.lineTo(x + s * .45, y + s * .15); g.lineTo(x + s * .33, y + s * .75); g.lineTo(x - s * .33, y + s * .75); g.closePath(); g.fill();
      g.fillStyle = '#9a5a33'; g.fillRect(x - s * .5, y + s * .06, s, s * .14);
      const hue = dead ? 28 : 28 + 92 * Math.min(1, w * 1.25), sat = dead ? 25 : 55 + 20 * w, lig = dead ? 26 : 32 + 10 * w;
      const droop = dead ? 1 : Math.max(0, .6 - w) / .6, sway = Math.sin(t * 2 + p.wob) * .06 * (1 - droop);
      g.strokeStyle = `hsl(${hue},${sat}%,${lig - 6}%)`; g.lineWidth = s * .07; g.lineCap = 'round';
      const tx = x + Math.sin(sway + droop * .9) * s * .55, ty = y + s * .1 - Math.cos(droop * 1.1) * s * .75;
      g.beginPath(); g.moveTo(x, y + s * .1); g.quadraticCurveTo(x + sway * s, y - s * .35, tx, ty); g.stroke();
      g.fillStyle = `hsl(${hue},${sat}%,${lig}%)`;
      for (const sd of [-1, 1]) { g.save(); g.translate(x + sway * s * .5, y - s * .2); g.rotate(sd * (.9 + droop * .9)); g.beginPath(); g.ellipse(sd * s * .2, 0, s * .22, s * .09, 0, 0, 6.283); g.fill(); g.restore(); }
      if (!dead) { const fr = s * (.12 + .1 * w); g.fillStyle = w > .45 ? '#ffd23f' : `hsl(40,${40 + 40 * w}%,${40 + 15 * w}%)`;
        for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283 + t * .3; g.beginPath(); g.arc(tx + Math.cos(a) * fr, ty + Math.sin(a) * fr, fr * .55, 0, 6.283); g.fill(); }
        g.fillStyle = '#7a4a1a'; g.beginPath(); g.arc(tx, ty, fr * .6, 0, 6.283); g.fill(); }
      const bw = s * .9, bx = x - bw / 2, by = y + s * .9; g.fillStyle = 'rgba(255,255,255,.08)'; rr(bx, by, bw, s * .08, s * .04); g.fill();
      g.fillStyle = w > .5 ? '#5cc8ff' : w > .25 ? '#ffc34d' : '#ff5a4d'; rr(bx, by, Math.max(s * .08, bw * w), s * .08, s * .04); g.fill();
      if (!dead && w < .25 && Math.sin(t * 12) > 0) { g.strokeStyle = 'rgba(255,90,77,.8)'; g.lineWidth = 2 * G.d; g.beginPath(); g.arc(x, y + s * .1, s * .95, 0, 6.283); g.stroke(); }
    }
    if (this.combo > 1) { g.font = `700 ${18 * G.d}px Inter, sans-serif`; g.textAlign = 'center'; g.fillStyle = '#ffd77a'; g.fillText('KOMBÓ x' + Math.min(this.combo, 5), G.W / 2, 64 * G.d); }
  }
};

/* =================== GAME 2: Nyomásmester =================== */
