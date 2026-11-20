/* HGWS Arcade – Csepp (klasszikus szkript, az arcade.html tölti be; a közös keret a jatekok/arcade/mag.js) */
'use strict';
const Csepp = {
  id: 'csepp', name: 'CSEPP FUTAM', lives: 0, overTitle: 'A CSEPP ELPÁROLGOTT',
  desc: 'Egy bátor vízcsepp úton a kiszáradt kert felé. Repülj át a csövek között – egyetlen ütközés és vége!',
  how: 'KOPPINTÁS / SZÓKÖZ = FEL',
  ranks: [[0, 'Pocsolya'], [5, 'Esőcsepp'], [15, 'Patak'], [30, 'Folyó'], [60, 'ÓCEÁN']],
  init(G) { const d = G.d; this.y = G.H * .45; this.vy = 0; this.p = []; this.sp = 190 * d; this.next = 0; this.alive = 1; this.rot = 0; this.started = 0; },
  down(G) { const d = G.d; this.vy = -430 * d; this.started = 1; Sfx.flap(); G.splash(G.W * .28, this.y + 14 * d, '150,215,255', 5, 2); },
  update(G, dt) {
    const d = G.d, X = G.W * .28, r = 12 * d;
    if (!this.started) { this.y = G.H * .45 + Math.sin(G.t * 4) * 8 * d; return; }
    this.vy += 1150 * d * dt; this.y += this.vy * dt; this.rot = Math.max(-.5, Math.min(1.2, this.vy / (700 * d)));
    this.sp = (190 + G.score * 3) * d; this.next -= dt;
    const gap = Math.max(160 * d, 235 * d - G.score * 2 * d), pw = 64 * d;
    if (this.next <= 0) { this.next = 1.55 * (190 * d / this.sp) + .25; const top = G.rnd(90 * d, G.H - 120 * d - gap); this.p.push({ x: G.W + pw, top, gap, w: pw, passed: 0 }); }
    for (const p of this.p) { p.x -= this.sp * dt;
      if (!p.passed && p.x + p.w < X) { p.passed = 1; G.add(1, X, this.y - 30 * d, '+1'); Sfx.coin(); }
      if (X + r > p.x && X - r < p.x + p.w && (this.y - r < p.top || this.y + r > p.top + p.gap)) { return this.die(G); } }
    this.p = this.p.filter(p => p.x > -p.w - 10);
    if (this.y < r) { this.y = r; this.vy = Math.max(0, this.vy); }
    if (this.y > G.H - 40 * d - r * .6) return this.die(G);
  },
  die(G) { G.splash(G.W * .28, this.y, '150,215,255', 40, 7); G.shake = 16 * G.d; Sfx.hit(); G.end(); },
  draw(g, G, t) {
    const d = G.d; bg('#0c2238', '#071423');
    // parallax hills
    for (const [k, col, h] of [[.2, '#0f2e47', .7], [.5, '#123a2a', .8]]) { g.fillStyle = col; g.beginPath(); g.moveTo(0, G.H);
      for (let x = 0; x <= G.W + 30 * d; x += 30 * d) g.lineTo(x, G.H * h + Math.sin((x + t * 60 * d * k) / (90 * d)) * 26 * d); g.lineTo(G.W, G.H); g.fill(); }
    // pipes
    for (const p of this.p) {
      for (const [y0, y1, cap] of [[0, p.top, p.top], [p.top + p.gap, G.H, p.top + p.gap]]) {
        const gr = g.createLinearGradient(p.x, 0, p.x + p.w, 0); gr.addColorStop(0, '#5d6b7d'); gr.addColorStop(.35, '#c3ced9'); gr.addColorStop(1, '#46525f');
        g.fillStyle = gr; g.fillRect(p.x, y0, p.w, y1 - y0);
        g.fillStyle = '#b5873a'; const cy = cap === p.top ? cap - 22 * d : cap; g.fillRect(p.x - 8 * d, cy, p.w + 16 * d, 22 * d);
        g.fillStyle = '#e8b656'; for (const bx of [p.x - 2 * d, p.x + p.w - 6 * d]) { g.beginPath(); g.arc(bx + 4 * d, cy + 11 * d, 3 * d, 0, 6.283); g.fill(); }
        // little valve wheel
        g.strokeStyle = '#ff5a4d'; g.lineWidth = 3 * d; const vy = cap === p.top ? cap - 60 * d : cap + 60 * d; g.beginPath(); g.arc(p.x + p.w / 2, vy, 10 * d, 0, 6.283); g.stroke();
      }
    }
    // ground
    g.fillStyle = '#2a1d10'; g.fillRect(0, G.H - 40 * d, G.W, 40 * d); g.fillStyle = '#3a7a3a'; g.fillRect(0, G.H - 40 * d, G.W, 6 * d);
    // drop
    const X = G.W * .28, r = 15 * d; g.save(); g.translate(X, this.y); g.rotate(this.rot * .6);
    const gr = g.createRadialGradient(-r * .3, -r * .2, 1, 0, 0, r * 1.6); gr.addColorStop(0, '#e6f7ff'); gr.addColorStop(.4, '#6cc6ff'); gr.addColorStop(1, '#1a6fb8');
    g.fillStyle = gr; g.beginPath(); g.moveTo(r * 1.9, 0); g.quadraticCurveTo(r * .6, -r * 1.05, -r * .2, -r); g.arc(0, 0, r, -Math.PI / 2 - .2, Math.PI / 2 + .2, true); g.quadraticCurveTo(r * .6, r * 1.05, r * 1.9, 0); g.fill();
    g.fillStyle = '#04121f'; g.beginPath(); g.arc(r * .1, -r * .25, 2.8 * d, 0, 6.283); g.arc(r * .55, -r * .25, 2.8 * d, 0, 6.283); g.fill();
    g.restore();
    if (!this.started && G.running) { g.font = `600 ${18 * d}px Inter, sans-serif`; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText('KOPPINTS A REPÜLÉSHEZ', G.W / 2, G.H * .32); }
    g.font = `700 ${56 * d}px Inter, sans-serif`; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.12)'; g.fillText(G.score, G.W / 2, G.H * .2);
  }
};

/* =================== GAME 5: Víztorony – A Zerosites támogatásával =================== */
