/* HGWS Arcade – Vízágyú (klasszikus szkript, az arcade.html tölti be; a közös keret a jatekok/arcade/mag.js) */
'use strict';
const Vizagyu = {
  id: 'vizagyu', name: 'VÍZÁGYÚ', lives: 3, overTitle: 'A SIVATAG GYŐZÖTT',
  desc: 'Szikkadt Szilárd kaktuszokat és tűzgolyókat zúdít a kertre. A vízágyú magától lő – te csak célozz! 30 másodpercenként maga Szilárd is megjelenik.',
  how: 'HÚZD AZ UJJAD / EGÉR MOZGATÁSA · 3 ÉLET',
  ranks: [[0, 'Újonc'], [500, 'Tömlőtüzér'], [1500, 'Vízágyú-kezelő'], [3500, 'Szárazságirtó'], [7000, 'Szilárd réme']],
  init(G) { this.x = G.W / 2; this.tx = G.W / 2; this.b = []; this.e = []; this.fire = 0; this.spawn = 0; this.boss = null; this.nextBoss = 25; },
  move(G, x) { this.tx = x; }, down(G, x) { this.tx = x; },
  update(G, dt) {
    const d = G.d; this.x += (this.tx - this.x) * Math.min(1, dt * 14);
    this.fire -= dt; if (this.fire <= 0) { this.fire = .11; this.b.push({ x: this.x, y: G.H - 92 * d, vy: -900 * d }); Sfx.shoot(); }
    for (const b of this.b) b.y += b.vy * dt; this.b = this.b.filter(b => b.y > -20);
    const diff = 1 + G.t / 30; this.spawn -= dt;
    if (this.spawn <= 0 && !this.boss) { this.spawn = Math.max(.28, 1.1 / diff);
      const fire = Math.random() < .35; const r = (fire ? 16 : 22) * d;
      this.e.push({ x: G.rnd(r + 10 * d, G.W - r - 10 * d), y: -r, r, vy: (fire ? 170 : 90) * d * G.rnd(.8, 1.2) * Math.min(2.2, diff), hp: fire ? 1 : 3, fire, wob: Math.random() * 6 }); }
    if (G.t > this.nextBoss && !this.boss) { this.boss = { x: G.W / 2, y: -80 * d, hp: 40 + Math.floor(G.t), max: 40 + Math.floor(G.t), t: 0 }; this.nextBoss = G.t + 35; G.float(G.W / 2, G.H * .3, 'SZILÁRD ÉRKEZIK!', true); Sfx.boom(); }
    const ground = G.H - 70 * d;
    for (const e of this.e) { e.y += e.vy * dt; e.x += Math.sin(G.t * 2 + e.wob) * 30 * d * dt;
      if (e.y > ground) { e.dead = 1; G.splash(e.x, ground, '255,170,80', 18, 5); G.lose(); if (!G.running) return; } }
    if (this.boss) { const B = this.boss; B.t += dt; B.y += (G.H * .2 - B.y) * dt * 1.5; B.x = G.W / 2 + Math.sin(B.t * .9) * G.W * .3;
      if (Math.random() < dt * 1.6) this.e.push({ x: B.x, y: B.y + 40 * d, r: 14 * d, vy: 220 * d, hp: 1, fire: true, wob: 0 }); }
    for (const b of this.b) {
      for (const e of this.e) { if (!e.dead && Math.hypot(b.x - e.x, b.y - e.y) < e.r + 6 * d) { b.y = -99; e.hp--; G.splash(b.x, b.y + 4, '150,215,255', 3, 2);
        if (e.hp <= 0) { e.dead = 1; const p = e.fire ? 15 : 25; G.add(p, e.x, e.y); G.splash(e.x, e.y, e.fire ? '255,150,60' : '120,200,90', 22, 6); Sfx.splash(); } break; } }
      const B = this.boss; if (B && b.y > 0 && Math.abs(b.x - B.x) < 60 * d && Math.abs(b.y - B.y) < 60 * d) { b.y = -99; B.hp--; G.splash(b.x, B.y + 40 * d, '150,215,255', 3, 3);
        if (B.hp <= 0) { G.add(500, B.x, B.y, 'SZILÁRD LEMOSVA! +500'); G.splash(B.x, B.y, '255,215,120', 80, 10); Sfx.perfect(); Sfx.boom(); G.shake = 20 * d; this.boss = null; } }
    }
    this.e = this.e.filter(e => !e.dead);
  },
  draw(g, G, t) {
    const d = G.d; bg('#3b1f0c', '#1a0d05');
    const sun = g.createRadialGradient(G.W * .5, -G.H * .1, 0, G.W * .5, -G.H * .1, G.H * .9); sun.addColorStop(0, 'rgba(255,190,90,.35)'); sun.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = sun; g.fillRect(0, 0, G.W, G.H);
    // dunes
    g.fillStyle = '#4a2a12'; g.beginPath(); g.moveTo(0, G.H * .7); for (let x = 0; x <= G.W; x += 20 * d) g.lineTo(x, G.H * .7 + Math.sin(x / (140 * d) + 1) * 20 * d); g.lineTo(G.W, G.H); g.lineTo(0, G.H); g.fill();
    // garden strip
    const ground = G.H - 70 * d; g.fillStyle = '#1f5a2a'; g.fillRect(0, ground, G.W, 70 * d); g.fillStyle = '#2f7a3a';
    for (let x = 0; x < G.W; x += 14 * d) { g.beginPath(); g.moveTo(x, ground); g.lineTo(x + 5 * d, ground - 9 * d - Math.sin(t * 3 + x) * 2 * d); g.lineTo(x + 10 * d, ground); g.fill(); }
    // enemies
    for (const e of this.e) {
      if (e.fire) { const gr = g.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 1.8); gr.addColorStop(0, '#fff1a8'); gr.addColorStop(.4, '#ff9a2e'); gr.addColorStop(1, 'rgba(255,60,20,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(e.x, e.y, e.r * 1.8, 0, 6.283); g.fill(); }
      else { g.fillStyle = '#3f8a3a'; rr(e.x - e.r * .5, e.y - e.r, e.r, e.r * 2, e.r * .5); g.fill(); rr(e.x - e.r * 1.1, e.y - e.r * .3, e.r * .45, e.r * .9, e.r * .22); g.fill(); rr(e.x + e.r * .65, e.y - e.r * .6, e.r * .45, e.r * .9, e.r * .22); g.fill();
        g.fillStyle = '#d9f2a6'; for (let k = 0; k < 5; k++) g.fillRect(e.x - e.r * .55 + k * e.r * .26, e.y - e.r * .6 + (k % 2) * e.r * .5, 2 * d, 4 * d);
        g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(e.x - e.r * .18, e.y - e.r * .35, 2.2 * d, 0, 6.283); g.arc(e.x + e.r * .18, e.y - e.r * .35, 2.2 * d, 0, 6.283); g.fill();
        if (e.hp < 3) { g.fillStyle = 'rgba(150,215,255,.5)'; g.fillRect(e.x - e.r * .5, e.y + e.r * 1.1, e.r * (e.hp / 3), 3 * d); } }
    }
    // boss
    const B = this.boss;
    if (B) { g.save(); g.translate(B.x, B.y);
      g.fillStyle = '#c9a676'; rr(-38 * d, -10 * d, 76 * d, 70 * d, 14 * d); g.fill();
      g.fillStyle = '#e8c79a'; g.beginPath(); g.arc(0, -28 * d, 26 * d, 0, 6.283); g.fill();
      g.fillStyle = '#2b1a0e'; g.beginPath(); g.arc(-9 * d, -32 * d, 3.5 * d, 0, 6.283); g.arc(9 * d, -32 * d, 3.5 * d, 0, 6.283); g.fill();
      g.strokeStyle = '#2b1a0e'; g.lineWidth = 3 * d; g.beginPath(); g.arc(0, -18 * d, 10 * d, .2, Math.PI - .2); g.stroke();
      g.fillStyle = '#3a2412'; g.beginPath(); g.ellipse(0, -50 * d, 30 * d, 10 * d, 0, Math.PI, 0); g.fill();
      g.restore();
      g.fillStyle = 'rgba(0,0,0,.5)'; rr(G.W * .2, 58 * d, G.W * .6, 10 * d, 5 * d); g.fill();
      g.fillStyle = '#ff5a4d'; rr(G.W * .2, 58 * d, G.W * .6 * (B.hp / B.max), 10 * d, 5 * d); g.fill();
      g.font = `600 ${13 * d}px Inter, sans-serif`; g.textAlign = 'center'; g.fillStyle = '#ffd7a0'; g.fillText('SZIKKADT SZILÁRD', G.W / 2, 80 * d); }
    // bullets
    g.fillStyle = '#9fdcff'; for (const b of this.b) { g.beginPath(); g.ellipse(b.x, b.y, 4 * d, 9 * d, 0, 0, 6.283); g.fill(); }
    // cannon
    const cx = this.x, cy = G.H - 60 * d;
    g.fillStyle = '#2d3b52'; rr(cx - 34 * d, cy, 68 * d, 34 * d, 10 * d); g.fill();
    g.fillStyle = '#e8b656'; rr(cx - 9 * d, cy - 34 * d, 18 * d, 40 * d, 6 * d); g.fill();
    g.fillStyle = '#6cc6ff'; g.beginPath(); g.arc(cx, cy + 16 * d, 9 * d, 0, 6.283); g.fill();
  }
};

/* =================== GAME 4: Csepp Futam =================== */
