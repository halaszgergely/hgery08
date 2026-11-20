/* HGWS Arcade – Nyomás (klasszikus szkript, az arcade.html tölti be; a közös keret a jatekok/arcade/mag.js) */
'use strict';
const Nyomas = {
  id: 'nyomas', name: 'NYOMÁSMESTER', lives: 3, overTitle: 'CSŐTÖRÉS!',
  desc: 'A PLC rád bízta a szivattyút. Állítsd meg a mutatót a zöld zónában! Minden sikeres beállítás után gyorsabb és szűkebb lesz. Középre lőve PERFEKT bónusz.',
  how: 'KOPPINTÁS / SZÓKÖZ · 3 ÉLET',
  ranks: [[0, 'Gyakornok'], [300, 'Szivattyúkezelő'], [900, 'Nyomásfelelős'], [2000, 'PLC-programozó'], [4000, 'Főgépész-legenda']],
  init(G) { this.a = 0; this.dir = 1; this.sp = .9; this.lvl = 1; this.newZone(); this.flash = 0; this.lock = 0; this.burst = 0; },
  newZone() { this.zw = Math.max(.045, .2 - this.lvl * .012); this.zc = .15 + Math.random() * .7; },
  update(G, dt) {
    if (this.lock > 0) { this.lock -= dt; return; }
    this.a += this.dir * this.sp * dt; if (this.a > 1) { this.a = 1; this.dir = -1; } if (this.a < 0) { this.a = 0; this.dir = 1; }
    this.flash = Math.max(0, this.flash - dt * 2); this.burst = Math.max(0, this.burst - dt * 1.5);
  },
  down(G) {
    if (this.lock > 0) return;
    const d = Math.abs(this.a - this.zc), cx = G.W / 2, cy = G.H * .58;
    if (d <= this.zw / 2) {
      const perfect = d < this.zw * .12, pts = Math.round((perfect ? 50 : 20) * (1 + this.lvl * .25));
      G.add(pts, cx, cy - G.H * .2, perfect ? 'PERFEKT! +' + pts : '+' + pts); perfect ? Sfx.perfect() : Sfx.coin();
      G.splash(cx, cy - G.H * .1, perfect ? '255,215,120' : '150,215,255', perfect ? 40 : 22, 7);
      this.lvl++; this.sp = Math.min(3.4, .9 + this.lvl * .14); this.flash = 1; this.lock = .25; this.newZone();
    } else { this.burst = 1; this.lock = .5; G.float(cx, cy - G.H * .2, d < this.zw ? 'MAJDNEM!' : 'CSŐTÖRÉS!', true); G.lose(); }
  },
  draw(g, G, t) {
    bg('#0b1424', '#050a12');
    const cx = G.W / 2, cy = G.H * .58, R = Math.min(G.W * .42, G.H * .4), d = G.d;
    // pipes
    g.fillStyle = '#2a3646'; g.fillRect(0, cy + R * .25, G.W, R * .18);
    g.fillStyle = '#3b4a5e'; for (let x = (t * 60 * d) % (90 * d) - 90 * d; x < G.W; x += 90 * d) g.fillRect(x, cy + R * .22, 14 * d, R * .24);
    // panel
    g.fillStyle = '#121c2c'; rr(cx - R * 1.12, cy - R * 1.12, R * 2.24, R * 1.5, 22 * d); g.fill();
    g.strokeStyle = 'rgba(120,190,255,.25)'; g.lineWidth = 2 * d; g.stroke();
    // dial
    const A0 = Math.PI * 1.1, A1 = Math.PI * 1.9, ang = v => A0 + (A1 - A0) * v;
    g.lineCap = 'butt'; g.lineWidth = R * .14; g.strokeStyle = '#1e2b40'; g.beginPath(); g.arc(cx, cy, R * .8, A0, A1); g.stroke();
    g.strokeStyle = '#ff5a4d'; g.beginPath(); g.arc(cx, cy, R * .8, ang(.88), A1); g.stroke();
    const z0 = Math.max(0, this.zc - this.zw / 2), z1 = Math.min(1, this.zc + this.zw / 2);
    g.strokeStyle = `rgba(94,224,138,${.8 + .2 * Math.sin(t * 8)})`; g.beginPath(); g.arc(cx, cy, R * .8, ang(z0), ang(z1)); g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = 2 * d; g.beginPath(); g.arc(cx, cy, R * .8, ang(this.zc) - .004, ang(this.zc) + .004); g.lineWidth = R * .14; g.strokeStyle = 'rgba(255,255,255,.7)'; g.stroke();
    g.fillStyle = '#8fa6bf'; g.font = `500 ${12 * d}px Inter, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i <= 10; i++) { const a = ang(i / 10); g.fillText(i, cx + Math.cos(a) * R * .58, cy + Math.sin(a) * R * .58);
      g.strokeStyle = '#4a5d76'; g.lineWidth = 2 * d; g.beginPath(); g.moveTo(cx + Math.cos(a) * R * .66, cy + Math.sin(a) * R * .66); g.lineTo(cx + Math.cos(a) * R * .71, cy + Math.sin(a) * R * .71); g.stroke(); }
    // needle
    const na = ang(this.a); g.strokeStyle = this.burst > 0 ? '#ff5a4d' : '#ffd77a'; g.lineWidth = 5 * d; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(na) * R * .86, cy + Math.sin(na) * R * .86); g.stroke();
    g.fillStyle = '#e8b656'; g.beginPath(); g.arc(cx, cy, 12 * d, 0, 6.283); g.fill();
    // readout
    g.fillStyle = this.flash > 0 ? `rgba(94,224,138,${.5 + this.flash * .5})` : '#7fd8ff';
    g.font = `400 ${30 * d}px Inter, sans-serif`; g.fillText((this.a * 10).toFixed(1) + ' BAR', cx, cy + R * .02 - R * .25);
    g.font = `600 ${14 * d}px Inter, sans-serif`; g.fillStyle = '#8fa6bf'; g.fillText('SZINT ' + this.lvl, cx, cy - R * .92);
    if (this.burst > 0) { G.splash(cx + (Math.random() - .5) * G.W * .6, cy + R * .3, '150,215,255', 2, 8); }
  }
};

/* =================== GAME 3: Vízágyú =================== */
