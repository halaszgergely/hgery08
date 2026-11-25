/* HGWS Arcade – Anyahajtó (klasszikus szkript, az arcade.html tölti be; a közös keret a jatekok/arcade/mag.js) */
'use strict';
const Anya = (() => {
  const cm = v => ((+v || 0) / 10).toLocaleString('hu-HU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const T = 60, MINGAP = 45;
  return {
    id: 'anya', name: 'ANYAHAJTÓ', anykey: 1, lives: 0, unit: ' cm', lb: 'cm', norep: 1, overTitle: 'LEJÁRT AZ IDŐ', sfmt: cm, fmt: cm,
    desc: 'Végtelen menetes szár, egy anya és egy csillagkulcs. Minden húzás negyed fordulat, vagyis egy milliméter. Hány centit hajtasz rajta egy perc alatt?',
    how: 'BÁRMELY BILLENTYŰ / KOPPINTÁS – PÜFÖLD! · 60 MP',
    ranks: [[0, 'Betanított szerelő'], [200, 'Csavarozó'], [330, 'Kulcsmester'], [430, 'Racsnikirály'], [530, 'Élő légkulcs']],
    init(G) { this.mm = 0; this.ang = 0; this.s = 0; this.left = T; this.go = 0; this.lt = 0; this.beep = 5; },
    /* újrakezdés gomb a bal alsó sarokban (a koppintás ott nem számít húzásnak) */
    rb(G) { const d = G.d; return [14 * d, G.H - 60 * d, 168 * d, 44 * d]; },
    down(G, x, y, e) { const b = this.rb(G); if (e !== true && x >= b[0] && x <= b[0] + b[2] && y >= b[1] && y <= b[1] + b[3]) { if (G.restart) G.restart(); return; }
      const now = performance.now(); if (now - this.lt < MINGAP || this.left <= 0) return; this.lt = now; this.go = 1;
      this.mm++; this.s = 1; G.score = this.mm; hud(); Sfx.blip(600 + Math.random() * 180, .03, 'square', .035);
      if (this.mm % 10 === 0) { G.float(G.W / 2, G.H * .13, this.mm / 10 + ' cm'); Sfx.blip(1320, .06, 'triangle', .05); }
    },
    update(G, dt) {
      this.s = Math.max(0, this.s - dt * 13); this.ang += (this.mm - this.ang) * Math.min(1, dt * 24);
      if (!this.go) return; this.left -= dt;
      if (this.beep > 0 && this.left <= this.beep) { this.beep--; Sfx.blip(880, .09, 'sine', .06); }
      if (this.left <= 0) { this.left = 0; G.end(); }
    },
    draw(g, G, t) {
      bg('#121820', '#07090d'); const d = G.d, W = G.W, H = G.H, pos = this.ang, th = pos * Math.PI / 2, sw = this.s * this.s, phi = .52 - sw * Math.PI / 2;
      /* oldalnézet: a szár áll, a kamera az anyát követi */
      const y0 = H * .2, rh = 22 * d, pm = 7 * d, nx = W / 2, X = m => nx + (m - pos) * pm, m0 = Math.floor(pos - nx / pm) - 2, m1 = Math.ceil(pos + nx / pm) + 2;
      let gr = g.createLinearGradient(0, y0 - rh / 2, 0, y0 + rh / 2); gr.addColorStop(0, '#59626e'); gr.addColorStop(.35, '#c3ccd6'); gr.addColorStop(1, '#3a424c'); g.fillStyle = gr; g.fillRect(0, y0 - rh / 2, W, rh);
      g.strokeStyle = 'rgba(20,26,34,.55)'; g.lineWidth = 1.6 * d; g.beginPath(); for (let m = m0 - m0 % 2; m <= m1; m += 2) { const x = X(m); g.moveTo(x, y0 - rh / 2); g.lineTo(x + pm * .9, y0 + rh / 2); } g.stroke();
      if (X(-4) > -40 * d) { const px = X(-4); g.fillStyle = '#2b333d'; g.fillRect(px - 14 * d, y0 - 60 * d, 14 * d, 120 * d); g.fillStyle = '#8b96a3'; g.fillRect(px, y0 - 30 * d, 4 * pm - 15 * d, 60 * d); }
      const y1 = y0 + rh / 2 + 22 * d; g.strokeStyle = '#6f7f93'; g.fillStyle = '#9fb0c4'; g.lineWidth = 1.2 * d; g.textAlign = 'center'; g.textBaseline = 'top'; g.font = `600 ${11 * d}px Inter, sans-serif`; g.beginPath();
      for (let m = Math.max(0, m0); m <= m1; m++) { const x = X(m), h = m % 10 === 0 ? 12 : m % 5 === 0 ? 8 : 5; g.moveTo(x, y1); g.lineTo(x, y1 + h * d); if (m % 10 === 0) g.fillText(m / 10, x, y1 + 15 * d); } g.stroke();
      /* a kulcs oldalról: a nyél vetülete */
      const hs = Math.sin(phi) * 78 * d; g.fillStyle = '#aab4c0'; g.fillRect(nx - 4 * d, Math.min(y0, y0 + hs), 8 * d, Math.abs(hs)); g.fillStyle = '#7d8793'; g.fillRect(nx - 7 * d, y0 - 31 * d, 14 * d, 62 * d);
      /* az anya oldalról: a hatszög élei a forgással vándorolnak */
      const nw = 30 * d, nh = 52 * d; gr = g.createLinearGradient(0, y0 - nh / 2, 0, y0 + nh / 2); gr.addColorStop(0, '#8a6a2a'); gr.addColorStop(.4, '#f0cf7a'); gr.addColorStop(1, '#6e5220'); g.fillStyle = gr; rr(nx - nw / 2, y0 - nh / 2, nw, nh, 4 * d); g.fill();
      g.strokeStyle = 'rgba(60,40,10,.7)'; g.lineWidth = 1.5 * d; g.beginPath(); for (let k = 0; k < 6; k++) { const a = th + k * Math.PI / 3; if (Math.cos(a) <= 0) continue; const y = y0 + Math.sin(a) * nh / 2; g.moveTo(nx - nw / 2, y); g.lineTo(nx + nw / 2, y); } g.stroke();
      /* idő */
      const ty = H * .345, bw = Math.min(W - 40 * d, 420 * d), k = this.left / T, low = this.left <= 10; g.fillStyle = 'rgba(255,255,255,.08)'; rr(W / 2 - bw / 2, ty, bw, 8 * d, 4 * d); g.fill();
      if (k > 0) { g.fillStyle = low ? '#ff5a4d' : '#e8b656'; rr(W / 2 - bw / 2, ty, Math.max(8 * d, bw * k), 8 * d, 4 * d); g.fill(); }
      g.textBaseline = 'middle'; g.font = `800 ${26 * d}px Inter, sans-serif`; g.fillStyle = low ? '#ff8a7d' : '#e9eef5'; g.fillText(this.left.toLocaleString('hu-HU', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' mp', W / 2, ty + 30 * d);
      /* szemből: szár, anya, csillagkulcs */
      const cx = W / 2, cy = H * .64, R = Math.min(W * .11, H * .085);
      g.save(); g.translate(cx, cy);
      g.save(); g.rotate(th); gr = g.createLinearGradient(-R, -R, R, R); gr.addColorStop(0, '#f6dc92'); gr.addColorStop(1, '#8a6a2a'); g.fillStyle = gr; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.lineTo(Math.cos(a) * R, Math.sin(a) * R); } g.closePath(); g.fill(); g.strokeStyle = 'rgba(60,40,10,.8)'; g.lineWidth = 2 * d; g.stroke();
      g.fillStyle = 'rgba(60,40,10,.55)'; g.beginPath(); g.arc(R * .7, 0, R * .07, 0, 6.283); g.fill(); g.restore();
      gr = g.createRadialGradient(-R * .2, -R * .2, R * .05, 0, 0, R * .6); gr.addColorStop(0, '#dfe5ec'); gr.addColorStop(1, '#5d6672'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R * .58, 0, 6.283); g.fill();
      g.strokeStyle = 'rgba(20,26,34,.5)'; g.lineWidth = 1.5 * d; g.beginPath(); for (let a = 0; a < 15; a += .15) { const r = R * .58 * (a / 15); a ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(0, 0); } g.stroke();
      g.rotate(phi); gr = g.createLinearGradient(0, -R * .3, 0, R * .3); gr.addColorStop(0, '#eef2f6'); gr.addColorStop(.5, '#aab4c0'); gr.addColorStop(1, '#69737f'); g.fillStyle = gr;
      g.beginPath(); g.moveTo(R * 1.25, -R * .3); g.lineTo(R * 3.8, -R * .2); g.arc(R * 3.8, 0, R * .2, -Math.PI / 2, Math.PI / 2); g.lineTo(R * 1.25, R * .3); g.closePath(); g.fill();
      g.strokeStyle = gr; g.lineWidth = R * .4; g.beginPath(); g.arc(0, 0, R * 1.22, 0, 6.283); g.stroke(); g.strokeStyle = 'rgba(20,26,34,.6)'; g.lineWidth = 1.5 * d; g.beginPath(); g.arc(0, 0, R * 1.42, 0, 6.283); g.stroke(); g.beginPath(); g.arc(0, 0, R * 1.02, 0, 6.283); g.stroke();
      g.restore();
      const b = this.rb(G); g.fillStyle = 'rgba(232,182,86,.14)'; g.strokeStyle = 'rgba(232,182,86,.75)'; g.lineWidth = 1.5 * d; rr(b[0], b[1], b[2], b[3], 10 * d); g.fill(); g.stroke(); g.fillStyle = '#f0d9a6'; g.font = `800 ${15 * d}px Inter, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('↺  ÚJRAKEZDÉS', b[0] + b[2] / 2, b[1] + b[3] / 2);
    }
  };
})();
