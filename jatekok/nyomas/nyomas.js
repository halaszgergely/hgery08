/* HGWS Arcade – Nyomás (klasszikus szkript, az arcade.html tölti be; a közös keret a jatekok/arcade/mag.js) */
'use strict';
const Nyomas = {
  id: 'nyomas', name: 'NYOMÁSMESTER', lives: 3, overTitle: 'CSŐTÖRÉS!',
  desc: 'A PLC rád bízta a szivattyút. Állítsd meg a mutatót a zöld zónában! Minden sikeres beállítás után gyorsabb és szűkebb lesz. Középre lőve PERFEKT bónusz.',
  how: 'KOPPINTÁS / SZÓKÖZ · 3 ÉLET',
  ranks: [[0, 'Gyakornok'], [300, 'Szivattyúkezelő'], [900, 'Nyomásfelelős'], [2000, 'PLC-programozó'], [4000, 'Főgépész-legenda']],
  /* választható műszer-külsők – valódi nyomásmérő-típusok alapján */
  designs: ['HGWS vezérlőpult', 'Bourdon-csöves ipari', 'Glicerines rozsdamentes', 'Sárgaréz gőzmanométer', 'Digitális manométer'],
  init(G) { this.ds = Math.min(this.designs.length - 1, store.get('nyomas_design') | 0); this.a = 0; this.dir = 1; this.sp = .65; this.lvl = 1; this.newZone(); this.flash = 0; this.lock = 0; this.burst = 0; this.combo = 0; this.cpop = 0; this.n = 0; this.drops = []; this.puddle = 0;
    // a háttér üzemrésze: két alapcső, minden sikeres beállítás után egy újabb elem épül
    let h = (Date.now() & 0xffff) + 7; this.rnd = () => { h = (h * 16807) % 2147483647; return h / 2147483647; }; this.els = []; this.addPipe('h', .16); this.addPipe('v', .07); },
  mult() { return 1 + Math.min(20, this.combo) * .1; },
  addPipe(k, at) { const R = this.rnd, a = at != null ? at : k === 'h' ? .06 + R() * .9 : .03 + R() * .94, s0 = R() * .45, s1 = s0 + .35 + R() * .55;
    this.els.push({ k, a, s0, s1: Math.min(1.05, s1), w: .012 + R() * .014, col: R() < .3 ? '#5a4632' : R() < .5 ? '#3c5a46' : '#3b4a5e', ph: R() * 10, cr: [s0 + (s1 - s0) * (.2 + R() * .25), s0 + (s1 - s0) * (.55 + R() * .3)], b: 0 }); },
  addEl() { const R = this.rnd, n = this.n, pipes = this.els.filter(e => e.k === 'h' || e.k === 'v');
    if (n % 9 === 8) return this.els.push({ k: 'fuse', x: .05 + R() * .9, y: .12 + R() * .7, b: 0, ph: R() * 10 });
    if (n % 7 === 6) return this.els.push({ k: 'pist', x: .05 + R() * .9, y: .1 + R() * .75, b: 0, ph: R() * 10 });
    if (n % 3 === 0 || !pipes.length) return this.addPipe(R() < .6 ? 'h' : 'v');
    const p = pipes[Math.floor(R() * pipes.length)], t = p.s0 + (p.s1 - p.s0) * (.1 + R() * .8);
    this.els.push({ k: n % 3 === 1 ? 'gauge' : 'valve', p, t, b: 0, ph: R() * 10, sp: (R() < .5 ? -1 : 1) * (.6 + R() * 1.6) }); },
  pos(G, p, t) { return p.k === 'h' ? [t * G.W, p.a * G.H] : [p.a * G.W, t * G.H]; },
  newZone() { this.zw = Math.max(.045, .25 - this.lvl * .013); this.zc = .15 + Math.random() * .7; },
  update(G, dt) {
    this.cpop = Math.max(0, this.cpop - dt * 2.5); for (const e of this.els) e.b = Math.min(1, e.b + dt * 2.2);
    const lost = (this.lives || 3) - G.lives; if (lost > 0 && this.els.length) for (const p of this.els) { if (p.k !== 'h' && p.k !== 'v') continue; for (const c of p.cr) if (Math.random() < dt * (lost === 1 ? .9 : 5)) { const [x, y] = this.pos(G, p, c); this.drops.push({ x: x + (Math.random() - .5) * 4 * G.d, y, vx: lost > 1 ? (Math.random() - .5) * 60 * G.d : 0, vy: 0, big: lost > 1 }); } }
    for (const q of this.drops) { q.vy += 900 * G.d * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.y > G.H * .985) { q.dead = 1; this.puddle = Math.min(1, this.puddle + (q.big ? .0025 : .001)); } } this.drops = this.drops.filter(q => !q.dead).slice(-400);
    if (this.lock > 0) { this.lock -= dt; return; }
    this.a += this.dir * this.sp * dt; if (this.a > 1) { this.a = 1; this.dir = -1; } if (this.a < 0) { this.a = 0; this.dir = 1; }
    this.flash = Math.max(0, this.flash - dt * 2); this.burst = Math.max(0, this.burst - dt * 1.5);
  },
  down(G, x, y, e) {
    const b = this.sel; if (b && e !== true && x != null && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { const n = this.designs.length; this.ds = (this.ds + (x < b.x + b.w / 2 ? n - 1 : 1)) % n; store.set('nyomas_design', this.ds); Sfx.blip(660, .05, 'triangle', .05); return; }
    if (this.lock > 0) return;
    const d = Math.abs(this.a - this.zc), cx = G.W / 2, cy = G.H * .58;
    if (d <= this.zw / 2) {
      this.combo++; this.cpop = 1; const perfect = d < this.zw * .12, m = this.mult(), pts = Math.round((perfect ? 50 : 20) * (1 + this.lvl * .25) * m);
      G.add(pts, cx, cy - G.H * .2, (perfect ? 'PERFEKT! +' : '+') + pts + (m > 1 ? '  ×' + m.toFixed(1) : '')); this.n++; this.addEl(); perfect ? Sfx.perfect() : Sfx.coin();
      G.splash(cx, cy - G.H * .1, perfect ? '255,215,120' : '150,215,255', perfect ? 40 : 22, 7);
      this.lvl++; this.sp = Math.min(3.4, .55 + this.lvl * .14); this.flash = 1; this.lock = .25; this.newZone();
    } else { this.combo = 0; this.burst = 1; this.lock = .5; G.float(cx, cy - G.H * .2, d < this.zw ? 'MAJDNEM!' : 'CSŐTÖRÉS!', true); G.lose(); }
  },
  drawBack(g, G, t) { const d = G.d, S = Math.min(G.W, G.H), lost = (this.lives || 3) - G.lives; g.save(); g.globalAlpha = .62;
    for (const e of this.els) { if (e.k !== 'h' && e.k !== 'v') continue; const w = e.w * S, sh = (lost > 1 ? Math.sin(t * 30 + e.ph) * 1.2 * d : 0), [x0, y0] = this.pos(G, e, e.s0), [x1, y1] = this.pos(G, e, e.s0 + (e.s1 - e.s0) * e.b), hz = e.k === 'h';
      g.fillStyle = e.col; hz ? g.fillRect(x0, y0 - w / 2 + sh, x1 - x0, w) : g.fillRect(x0 - w / 2 + sh, y0, w, y1 - y0); g.fillStyle = 'rgba(255,255,255,.12)'; hz ? g.fillRect(x0, y0 - w / 2 + sh, x1 - x0, w * .25) : g.fillRect(x0 - w / 2 + sh, y0, w * .25, y1 - y0);
      g.fillStyle = 'rgba(160,190,220,.35)'; const L = hz ? x1 - x0 : y1 - y0, st = 70 * d, off = (t * 70 * d + e.ph * 30) % st; for (let u = off; u < L; u += st) { if (hz) { g.beginPath(); g.moveTo(x0 + u, y0 - w * .25 + sh); g.lineTo(x0 + u + w * .35, y0 + sh); g.lineTo(x0 + u, y0 + w * .25 + sh); g.fill(); } else { g.beginPath(); g.moveTo(x0 - w * .25 + sh, y0 + u); g.lineTo(x0 + sh, y0 + u + w * .35); g.lineTo(x0 + w * .25 + sh, y0 + u); g.fill(); } }
      g.fillStyle = '#596a80'; for (const f of [e.s0, e.s0 + (e.s1 - e.s0) * .5 * e.b, e.s0 + (e.s1 - e.s0) * e.b]) { const [fx, fy] = this.pos(G, e, f); hz ? g.fillRect(fx - 3 * d, fy - w * .7 + sh, 6 * d, w * 1.4) : g.fillRect(fx - w * .7 + sh, fy - 3 * d, w * 1.4, 6 * d); }
      if (lost > 0 && e.b >= 1) for (const c of e.cr) { const [cx, cy] = this.pos(G, e, c); g.strokeStyle = '#0b0f16'; g.lineWidth = 1.6 * d; g.beginPath(); g.moveTo(cx - 5 * d, cy - 3 * d); g.lineTo(cx - 1 * d, cy + 1 * d); g.lineTo(cx + 2 * d, cy - 2 * d); g.lineTo(cx + 6 * d, cy + 3 * d); g.stroke();
        if (lost > 1) { g.globalAlpha = .75; g.strokeStyle = 'rgba(150,215,255,.8)'; g.lineWidth = 2 * d; g.beginPath(); g.moveTo(cx, cy); const a = Math.sin(t * 9 + c * 20) * .5, L2 = (22 + 10 * Math.sin(t * 13 + c * 7)) * d; g.quadraticCurveTo(cx + Math.cos(a - 1.2) * L2, cy - L2 * .5, cx + Math.cos(a - .6) * L2 * 1.5, cy + L2 * .4); g.stroke();
          g.strokeStyle = 'rgba(120,195,255,.55)'; g.lineWidth = 3.5 * d; g.beginPath(); g.moveTo(cx, cy); for (let k = 1; k <= 8; k++) { const yy = cy + (G.H * .985 - cy) * k / 8; g.lineTo(cx + Math.sin(t * 6 + k + c * 9) * 2 * d, yy); } g.stroke(); g.globalAlpha = .62; } } }
    for (const e of this.els) { const sc = e.b;
      if (e.k === 'gauge') { const [x, y] = this.pos(G, e.p, e.t), r = S * .032 * sc; if (r < 1) continue; g.fillStyle = '#c9d2dc'; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.fillStyle = '#f4f6f8'; g.beginPath(); g.arc(x, y, r * .8, 0, 6.283); g.fill(); g.strokeStyle = '#d63028'; g.lineWidth = r * .14; g.beginPath(); g.arc(x, y, r * .62, Math.PI * .1, Math.PI * .35); g.stroke();
        const a = Math.PI * .75 + Math.PI * 1.5 * (.5 + .45 * Math.sin(t * e.sp + e.ph) * (lost > 1 ? 1.2 : 1)); g.strokeStyle = '#16181c'; g.lineWidth = Math.max(1, r * .1); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r * .7, y + Math.sin(a) * r * .7); g.stroke(); }
      else if (e.k === 'valve') { const [x, y] = this.pos(G, e.p, e.t), r = S * .04 * sc; if (r < 1) continue; g.save(); g.translate(x, y); g.rotate(t * e.sp + e.ph); g.strokeStyle = '#c0392b'; g.lineWidth = r * .22; g.beginPath(); g.arc(0, 0, r * .85, 0, 6.283); g.stroke(); g.lineWidth = r * .14; for (let k = 0; k < 5; k++) { const q = k / 5 * 6.283; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(q) * r * .85, Math.sin(q) * r * .85); g.stroke(); } g.fillStyle = '#8e2a20'; g.beginPath(); g.arc(0, 0, r * .2, 0, 6.283); g.fill(); g.restore(); }
      else if (e.k === 'fuse') { const x = e.x * G.W, y = e.y * G.H, w = S * .12 * sc, h = S * .16 * sc; if (w < 2) continue; g.fillStyle = '#2b3442'; g.fillRect(x - w / 2, y - h / 2, w, h); g.strokeStyle = '#6b7a8e'; g.lineWidth = 1.5 * d; g.strokeRect(x - w / 2, y - h / 2, w, h);
        for (let i = 0; i < 6; i++) { const fx = x - w / 2 + w * (.12 + (i % 3) * .3), fy = y - h / 2 + h * (.15 + Math.floor(i / 3) * .42); g.fillStyle = '#d9dde2'; g.fillRect(fx, fy, w * .16, h * .3); g.fillStyle = i === (Math.floor(t * 1.3 + e.ph) % 6) ? '#ff5a4d' : '#5ee08a'; g.fillRect(fx + w * .04, fy + h * .03, w * .08, h * .06); }
        const sp = (Math.sin(t * 17 + e.ph) > .55 ? 1 : 0) + (lost > 0 ? 1 : 0); if (sp && Math.random() < .5 + lost * .2) { g.strokeStyle = '#ffe27a'; g.lineWidth = 1.5 * d; const sx = x + (Math.random() - .5) * w * .8, sy = y + (Math.random() - .5) * h * .8; for (let k = 0; k < 5; k++) { const q = Math.random() * 6.283, l = (4 + Math.random() * 10) * d; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(q) * l, sy + Math.sin(q) * l); g.stroke(); } g.fillStyle = 'rgba(255,240,170,.5)'; g.beginPath(); g.arc(sx, sy, 5 * d, 0, 6.283); g.fill(); } }
      else if (e.k === 'pist') { const x = e.x * G.W, y = e.y * G.H, w = S * .05 * sc, h = S * .13 * sc; if (w < 2) continue; const k = (Math.sin(t * 3 + e.ph) + 1) / 2; g.fillStyle = '#3b4a5e'; g.fillRect(x - w / 2, y - h / 2, w, h * .55); g.fillStyle = '#aab6c4'; g.fillRect(x - w * .12, y - h / 2 + h * .55 - h * .1, w * .24, h * .45 * k + h * .1); g.fillStyle = '#e8b656'; g.fillRect(x - w * .4, y - h / 2 + h * .55 + h * .45 * k, w * .8, h * .08); } }
    for (const q of this.drops) { g.fillStyle = 'rgba(150,215,255,.9)'; g.beginPath(); g.ellipse(q.x, q.y, (q.big ? 2.6 : 1.8) * d, (q.big ? 4.5 : 3.2) * d, 0, 0, 6.283); g.fill(); }
    if (this.puddle > 0) { g.fillStyle = 'rgba(80,160,230,.45)'; const ph = this.puddle * G.H * .05; g.fillRect(0, G.H - ph, G.W, ph); g.fillStyle = 'rgba(200,235,255,.35)'; for (let x = (t * 40 * d) % (60 * d); x < G.W; x += 60 * d) g.fillRect(x, G.H - ph, 24 * d, 1.5 * d); }
    g.restore(); },
  comboText(g, G) { const d = G.d; if (this.combo > 1) { const m = this.mult(), k = 1 + this.cpop * .35; g.save(); g.translate(G.W / 2, this.sel.y - 22 * d); g.scale(k, k); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${18 * d}px Inter, sans-serif`; g.fillStyle = m >= 2.5 ? '#ff9a4d' : m >= 1.8 ? '#ffd77a' : '#7fd8ff'; g.fillText('KOMBÓ ' + this.combo + '  ×' + m.toFixed(1), 0, 0); g.restore(); } },
  draw(g, G, t) {
    bg('#0b1424', '#050a12'); this.drawBack(g, G, t);
    if (this.ds) { this.drawReal(g, G, t); return this.selector(g, G); }
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
    this.selector(g, G);
  },
  selector(g, G) { const d = G.d, w = Math.min(G.W - 24 * d, 330 * d), h = 38 * d, x = G.W / 2 - w / 2, y = G.H - h - 14 * d; this.sel = { x, y, w, h };
    g.fillStyle = 'rgba(10,16,28,.85)'; rr(x, y, w, h, h / 2); g.fill(); g.strokeStyle = 'rgba(232,182,86,.45)'; g.lineWidth = 1.5 * d; g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffe29a'; g.font = `700 ${13 * d}px Inter, sans-serif`; g.fillText(this.designs[this.ds], G.W / 2, y + h / 2 + d); g.font = `700 ${15 * d}px Inter, sans-serif`; g.fillStyle = '#e8b656'; g.fillText('◀', x + 20 * d, y + h / 2); g.fillText('▶', x + w - 20 * d, y + h / 2); this.comboText(g, G); },
  drawReal(g, G, t) { const D = this.ds, d = G.d, cx = G.W / 2, cy = G.H * .47, R = Math.min(G.W * .4, G.H * .33), A0 = Math.PI * .75, A1 = Math.PI * 2.25, ang = v => A0 + (A1 - A0) * v, P = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    const z0 = Math.max(0, this.zc - this.zw / 2), z1 = Math.min(1, this.zc + this.zw / 2), pulse = .75 + .25 * Math.sin(t * 8), brass = D === 3, dig = D === 4;
    /* csővezeték és csatlakozó csonk */
    g.fillStyle = '#2a3646'; g.fillRect(0, cy + R * 1.42, G.W, R * .2); g.fillStyle = '#3b4a5e'; for (let x = (t * 60 * d) % (90 * d) - 90 * d; x < G.W; x += 90 * d) g.fillRect(x, cy + R * 1.39, 14 * d, R * .26);
    const sg = g.createLinearGradient(cx - R * .16, 0, cx + R * .16, 0); sg.addColorStop(0, brass ? '#7a5a1e' : '#6d7682'); sg.addColorStop(.45, brass ? '#e8c46a' : '#dfe5ec'); sg.addColorStop(1, brass ? '#6a4c16' : '#59616c'); g.fillStyle = sg; g.fillRect(cx - R * .1, cy + R * .9, R * .2, R * .52); g.fillRect(cx - R * .17, cy + R * 1.08, R * .34, R * .16); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5 * d; for (const k of [-.06, .06]) { g.beginPath(); g.moveTo(cx + R * k, cy + R * 1.08); g.lineTo(cx + R * k, cy + R * 1.24); g.stroke(); }
    /* ház és perem */
    g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.arc(cx + 5 * d, cy + 8 * d, R * 1.04, 0, 6.283); g.fill();
    const cg = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R); if (D === 1) { cg.addColorStop(0, '#3a3d42'); cg.addColorStop(.5, '#15171a'); cg.addColorStop(1, '#2a2c30'); } else if (D === 2) { cg.addColorStop(0, '#f2f5f8'); cg.addColorStop(.3, '#9aa4ae'); cg.addColorStop(.55, '#e6ebf0'); cg.addColorStop(1, '#727c87'); } else if (brass) { cg.addColorStop(0, '#f6dc8c'); cg.addColorStop(.35, '#b98a2c'); cg.addColorStop(.6, '#edca6e'); cg.addColorStop(1, '#7a5a1e'); } else { cg.addColorStop(0, '#2f3d52'); cg.addColorStop(1, '#141c28'); }
    g.fillStyle = cg; g.beginPath(); if (dig) rr(cx - R * 1.02, cy - R * 1.02, R * 2.04, R * 2.04, R * .34); else g.arc(cx, cy, R * 1.02, 0, 6.283); g.fill(); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 2 * d; g.stroke();
    if (brass) for (let k = 0; k < 8; k++) { const [x, y] = P(k / 8 * 6.283 + .39, R * .955); g.fillStyle = '#6a4c16'; g.beginPath(); g.arc(x, y, R * .028, 0, 6.283); g.fill(); g.fillStyle = '#f6dc8c'; g.beginPath(); g.arc(x - d, y - d, R * .014, 0, 6.283); g.fill(); }
    if (dig) return this.drawDigital(g, G, t, cx, cy, R, z0, z1, pulse);
    /* számlap */
    const ink = brass ? '#2b2118' : '#16181c', face = g.createRadialGradient(cx - R * .3, cy - R * .35, R * .1, cx, cy, R * .9); face.addColorStop(0, brass ? '#fbf3dc' : '#ffffff'); face.addColorStop(1, brass ? '#e6d6ac' : '#e4e7ea'); g.fillStyle = face; g.beginPath(); g.arc(cx, cy, R * .88, 0, 6.283); g.fill(); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.5 * d; g.stroke();
    g.lineCap = 'butt'; g.lineWidth = R * .11; g.strokeStyle = 'rgba(214,48,40,.8)'; g.beginPath(); g.arc(cx, cy, R * .735, ang(.88), A1); g.stroke();
    g.strokeStyle = `rgba(40,170,84,${pulse})`; g.beginPath(); g.arc(cx, cy, R * .735, ang(z0), ang(z1)); g.stroke(); g.strokeStyle = '#0d5a2a'; g.beginPath(); g.arc(cx, cy, R * .735, ang(this.zc) - .006, ang(this.zc) + .006); g.stroke();
    g.strokeStyle = ink; g.lineWidth = 1.6 * d; g.beginPath(); g.arc(cx, cy, R * .8, A0, A1); g.stroke();
    for (let i = 0; i <= 50; i++) { const a = ang(i / 50), maj = i % 5 === 0, [x0, y0] = P(a, R * .8), [x1, y1] = P(a, R * (maj ? .69 : .75)); g.lineWidth = (maj ? 2.6 : 1.3) * d; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
    g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${brass ? '700' : '600'} ${R * .1}px ${brass ? 'Georgia, serif' : 'Inter, sans-serif'}`; for (let i = 0; i <= 10; i++) { const [x, y] = P(ang(i / 10), R * .59); g.fillText(i, x, y); }
    if (D === 2) { g.strokeStyle = '#c0392b'; g.fillStyle = '#c0392b'; g.lineWidth = 1.2 * d; g.beginPath(); g.arc(cx, cy, R * .46, A0, A1); g.stroke(); g.font = `600 ${R * .058}px Inter, sans-serif`; for (let p = 0; p <= 140; p += 10) { const a = ang(p / 145), [x0, y0] = P(a, R * .46), [x1, y1] = P(a, R * (p % 20 ? .435 : .41)); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); if (p % 20 === 0) { const [x, y] = P(a, R * .345); g.fillText(p, x, y); } } g.fillText('psi', cx, cy + R * .3); }
    g.fillStyle = ink; g.font = `700 ${R * .085}px ${brass ? 'Georgia, serif' : 'Inter, sans-serif'}`; g.fillText('bar', cx, cy + R * (D === 2 ? .44 : .36)); g.font = `500 ${R * .05}px ${brass ? 'Georgia, serif' : 'Inter, sans-serif'}`;
    g.fillText(D === 1 ? 'EN 837-1  ·  Kl. 1,6' : D === 2 ? 'Kl. 1,0  ·  316L  ·  glicerin' : 'GŐZNYOMÁS', cx, cy + R * .58); if (brass) { g.font = `italic 600 ${R * .06}px Georgia, serif`; g.fillText('HGWS Gépgyár · 1898', cx, cy - R * .3); }
    /* mutató */
    const na = ang(this.a) + (D === 2 ? 0 : Math.sin(t * 40) * .004); g.save(); g.translate(cx, cy); g.rotate(na); g.fillStyle = this.burst > 0 ? '#d63028' : brass ? '#1d2f52' : ink; g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 6 * d; g.shadowOffsetY = 3 * d;
    g.beginPath(); g.moveTo(-R * .2, -R * .028); g.lineTo(R * .1, -R * .022); g.lineTo(R * .77, 0); g.lineTo(R * .1, R * .022); g.lineTo(-R * .2, R * .028); g.closePath(); g.fill(); if (brass) { g.beginPath(); g.arc(-R * .2, 0, R * .06, 0, 6.283); g.arc(-R * .2, 0, R * .034, 0, 6.283, true); g.fill('evenodd'); g.beginPath(); g.arc(R * .5, 0, R * .03, 0, 6.283); g.fill(); } g.restore();
    g.fillStyle = brass ? '#b98a2c' : D === 2 ? '#aab2ba' : '#2a2c30'; g.beginPath(); g.arc(cx, cy, R * .07, 0, 6.283); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(cx - R * .02, cy - R * .02, R * .025, 0, 6.283); g.fill();
    /* glicerintöltet légbuborékkal, üvegcsillogás */
    if (D === 2) { g.save(); g.beginPath(); g.arc(cx, cy, R * .88, 0, 6.283); g.clip(); const lv = cy - R * .66 + Math.sin(t * 1.7) * R * .008; g.fillStyle = 'rgba(190,215,235,.16)'; g.fillRect(cx - R, lv, R * 2, R * 2); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5 * d; g.beginPath(); for (let x = -R; x <= R; x += R / 12) { const y = lv + Math.sin(x / R * 9 + t * 2.4) * R * .008; x === -R ? g.moveTo(cx + x, y) : g.lineTo(cx + x, y); } g.stroke(); g.restore(); }
    const gl = g.createLinearGradient(cx - R, cy - R, cx + R * .4, cy + R * .4); gl.addColorStop(0, 'rgba(255,255,255,.32)'); gl.addColorStop(.4, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.beginPath(); g.arc(cx, cy, R * .88, 0, 6.283); g.fill();
    this.readout(g, G, cx, cy - R * 1.14, R); if (this.burst > 0) G.splash(cx + (Math.random() - .5) * G.W * .6, cy + R * 1.4, '150,215,255', 2, 8); },
  readout(g, G, cx, y, R) { const d = G.d; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = this.flash > 0 ? `rgba(94,224,138,${.5 + this.flash * .5})` : '#7fd8ff'; g.font = `600 ${14 * d}px Inter, sans-serif`; g.fillText('SZINT ' + this.lvl, cx, y); },
  drawDigital(g, G, t, cx, cy, R, z0, z1, pulse) { const d = G.d, A0 = Math.PI * .75, A1 = Math.PI * 2.25, N = 60;
    g.fillStyle = '#0c1118'; g.beginPath(); g.arc(cx, cy, R * .9, 0, 6.283); g.fill(); g.strokeStyle = '#3d4d63'; g.lineWidth = 2 * d; g.stroke();
    for (let i = 0; i < N; i++) { const v = (i + .5) / N, a0 = A0 + (A1 - A0) * (i / N) + .008, a1 = A0 + (A1 - A0) * ((i + 1) / N) - .008, inZ = v >= z0 && v <= z1, on = v <= this.a; g.lineWidth = R * .1; g.lineCap = 'butt';
      g.strokeStyle = inZ ? (on ? '#5ee08a' : `rgba(94,224,138,${.3 + .25 * pulse})`) : v > .88 ? (on ? '#ff5a4d' : 'rgba(255,90,77,.22)') : on ? '#7fd8ff' : 'rgba(127,216,255,.13)'; g.beginPath(); g.arc(cx, cy, R * .76, a0, a1); g.stroke(); }
    g.fillStyle = '#8fa6bf'; g.font = `600 ${R * .07}px Inter, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; for (let i = 2; i <= 8; i += 2) { const a = A0 + (A1 - A0) * i / 10; g.fillText(i, cx + Math.cos(a) * R * .6, cy + Math.sin(a) * R * .6); }
    /* LCD */
    const w = R * .98, h = R * .44, x = cx - w / 2, y = cy - h * .62; g.fillStyle = '#1a222c'; rr(x - 5 * d, y - 5 * d, w + 10 * d, h + 10 * d, 8 * d); g.fill(); const lg = g.createLinearGradient(0, y, 0, y + h); lg.addColorStop(0, '#c3d0b0'); lg.addColorStop(1, '#a9b896'); g.fillStyle = lg; rr(x, y, w, h, 5 * d); g.fill();
    g.fillStyle = 'rgba(20,28,18,.12)'; g.font = `700 ${h * .72}px ui-monospace, Menlo, Consolas, monospace`; g.textAlign = 'right'; g.fillText('88.8', x + w * .74, y + h * .54); g.fillStyle = this.burst > 0 ? '#7a1410' : '#141c12'; g.fillText((this.a * 10).toFixed(1), x + w * .74, y + h * .54);
    g.font = `700 ${h * .24}px Inter, sans-serif`; g.textAlign = 'left'; g.fillText('bar', x + w * .78, y + h * .7); g.font = `600 ${h * .16}px Inter, sans-serif`; g.fillText(this.a >= z0 && this.a <= z1 ? '● OK' : this.a > .88 ? '▲ MAX' : '', x + w * .78, y + h * .3);
    g.textAlign = 'center'; for (const [k, lab] of [[-1, 'ZERO'], [0, 'UNIT'], [1, 'ON']]) { const bx = cx + k * R * .3, by = cy + R * .4; g.fillStyle = '#243247'; rr(bx - R * .12, by - R * .055, R * .24, R * .11, R * .05); g.fill(); g.fillStyle = '#8fa6bf'; g.font = `700 ${R * .055}px Inter, sans-serif`; g.fillText(lab, bx, by + d); }
    g.fillStyle = '#5c6f88'; g.font = `600 ${R * .05}px Inter, sans-serif`; g.fillText('0…10 bar  ·  ±0,5% FS  ·  IP65', cx, cy - R * .47);
    this.readout(g, G, cx, cy - R * 1.14, R); if (this.burst > 0) G.splash(cx + (Math.random() - .5) * G.W * .6, cy + R * 1.4, '150,215,255', 2, 8); }
};

/* =================== GAME 3: Vízágyú =================== */
