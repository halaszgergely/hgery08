// HGWS – animált hirdetések az aktuálisan reklámozott címhez (alapból a legújabb anime)
// Minden canvasra rajzolt: naplementés sivatag, várdomb, forgó vízrúna-kör, villám, kertész slaggal és a vízcsepp-kabala.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let G = null;               // { videos: () => [], open: id => void }
const LIVE = new Set();     // élő canvasok: { cv, mode, vis }
let raf = 0;
const RM = matchMedia('(prefers-reduced-motion: reduce)');

export function setup(o) { G = o; }
export function target() {
  if (!G) return null; const l = G.videos().filter(v => v.visible !== false && !v.series);
  return (G.premier && G.premier(l)) || l.find(v => v.promo) || l.filter(v => (v.kind || '') === 'Anime').sort((a, b) => (b.order || 0) - (a.order || 0))[0] || null;
}

/* ---------- determinisztikus véletlen ---------- */
function rng(seed) { let s = seed | 0; return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- jelenet ---------- */
function scene(W, H, compact) {
  const r = rng(20261125 + W * 7 + H), stars = [], clouds = [], spires = [], wins = [];
  for (let i = 0; i < (compact ? 70 : 170); i++) stars.push([r() * W, r() * H * .55, r() * 1.4 + .3, r() * 6.28, r() * 2 + .6]);
  for (let i = 0; i < (compact ? 5 : 9); i++) clouds.push([r() * W * 1.3, H * (.12 + r() * .35), W * (.12 + r() * .2), H * (.025 + r() * .04), r() * .4 + .2]);
  const cx = W * (compact ? .5 : .52), base = H * .74;
  for (const [k, hh, ww] of [[-.085, .06, .012], [-.06, .095, .014], [-.034, .12, .013], [-.012, .15, .016], [.008, .22, .02], [.03, .14, .014], [.055, .105, .015], [.08, .07, .012], [-.1, .04, .01], [.1, .045, .01]]) spires.push([cx + k * W, W * ww, H * hh, true]);
  for (let i = 0; i < 30; i++) wins.push([cx + (r() - .5) * W * .17, base - r() * H * .12, r() * 6.28]);
  return { stars, clouds, spires, wins, cx, base, bolt: null, boltT: 2 + r() * 3, r };
}
const lerp = (a, b, k) => a + (b - a) * k;

function draw(x, W, H, t, sc, compact) {
  // ég
  const sky = x.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#070b2a'); sky.addColorStop(.35, '#251c5c'); sky.addColorStop(.58, '#7a3a7a'); sky.addColorStop(.7, '#ff7a3d'); sky.addColorStop(.78, '#ffb347'); sky.addColorStop(1, '#3a1d2a');
  x.fillStyle = sky; x.fillRect(0, 0, W, H);
  for (const [sx, sy, sr, ph, sp] of sc.stars) { x.globalAlpha = .35 + .65 * Math.abs(Math.sin(t * sp + ph)); x.fillStyle = '#e9f0ff'; x.fillRect(sx, sy, sr, sr); }
  x.globalAlpha = 1;
  // nap
  const sunX = W * (compact ? .2 : .36), sunY = H * .72, sg = x.createRadialGradient(sunX, sunY, 0, sunX, sunY, H * .5);
  sg.addColorStop(0, 'rgba(255,240,200,.95)'); sg.addColorStop(.06, 'rgba(255,210,120,.9)'); sg.addColorStop(.25, 'rgba(255,120,60,.35)'); sg.addColorStop(1, 'rgba(255,90,60,0)');
  x.fillStyle = sg; x.fillRect(0, 0, W, H);
  // felhőfoszlányok
  for (const c of sc.clouds) { const cxp = ((c[0] + t * W * .006 * c[4]) % (W * 1.3)) - W * .15; x.fillStyle = `rgba(120,70,150,${c[4] * .55})`; x.beginPath(); x.ellipse(cxp, c[1], c[2], c[3], 0, 0, 6.283); x.fill(); x.fillStyle = `rgba(255,150,110,${c[4] * .25})`; x.beginPath(); x.ellipse(cxp + c[2] * .2, c[1] + c[3] * .6, c[2] * .7, c[3] * .4, 0, 0, 6.283); x.fill(); }
  // villám
  sc.boltT -= 1 / 60; if (sc.boltT <= 0) { sc.boltT = 2.5 + sc.r() * 4; const bx = W * (compact ? .88 : .86) + (sc.r() - .5) * W * .08, pts = [[bx, 0]]; let px = bx, py = 0; while (py < H * .5) { px += (sc.r() - .5) * W * .05; py += H * (.04 + sc.r() * .05); pts.push([px, py]); } sc.bolt = { pts, l: .35 }; }
  if (sc.bolt && sc.bolt.l > 0) { const a = sc.bolt.l / .35; x.fillStyle = `rgba(170,120,255,${.18 * a})`; x.fillRect(0, 0, W, H); x.strokeStyle = `rgba(215,180,255,${a})`; x.lineWidth = Math.max(1.5, W * .002); x.shadowColor = '#b08cff'; x.shadowBlur = 18;
    x.beginPath(); sc.bolt.pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.stroke(); x.shadowBlur = 0; sc.bolt.l -= 1 / 60; }
  // dűnék
  const dune = (y0, amp, f, ph, c1, c2, sp) => { const g = x.createLinearGradient(0, y0 - amp, 0, H); g.addColorStop(0, c1); g.addColorStop(1, c2); x.fillStyle = g; x.beginPath(); x.moveTo(0, H);
    for (let i = 0; i <= 60; i++) { const px = i / 60 * W; x.lineTo(px, y0 + Math.sin(px / W * f + ph + t * sp) * amp + Math.sin(px / W * f * 2.3 + ph * 2) * amp * .35); } x.lineTo(W, H); x.fill(); };
  dune(H * .73, H * .02, 9, 1, '#7a3f52', '#4b2238', .03);
  // várdomb
  x.fillStyle = '#3a1f3a'; x.beginPath(); x.ellipse(sc.cx, sc.base + H * .03, W * .15, H * .05, 0, Math.PI, 0); x.fill();
  { const ww = W * .1, wh = H * .045, mw = Math.max(2, W * .005); x.fillStyle = '#2c1830'; x.fillRect(sc.cx - ww, sc.base - wh, ww * 2, wh + 2); for (let px = sc.cx - ww; px < sc.cx + ww; px += mw * 2) x.fillRect(px, sc.base - wh - mw, mw, mw); }
  for (const [sx, w, h] of sc.spires) { x.fillStyle = '#2c1830'; x.fillRect(sx - w / 2, sc.base - h, w, h + 2); const mw = Math.max(1.5, w / 5); for (let i = 0; i < 3; i++) x.fillRect(sx - w / 2 - mw * .3 + i * (w + mw * .6 - mw) / 2, sc.base - h - mw, mw, mw);
    x.fillStyle = '#3b1f3c'; x.beginPath(); x.moveTo(sx - w * .62, sc.base - h - mw * .2); x.lineTo(sx, sc.base - h - w * 2.4); x.lineTo(sx + w * .62, sc.base - h - mw * .2); x.fill(); x.fillStyle = '#ffcf7a'; x.globalAlpha = .7; x.fillRect(sx - 1, sc.base - h * .6, 2, Math.max(2, h * .06)); x.globalAlpha = 1; }
  for (const [wx, wy, ph] of sc.wins) { x.globalAlpha = .4 + .6 * Math.abs(Math.sin(t * .8 + ph)); x.fillStyle = '#ffcf7a'; x.fillRect(wx, wy, 2, 2.5); } x.globalAlpha = 1;
  dune(H * .8, H * .03, 6, 2.2, '#c2643a', '#6a2f2a', .05);
  dune(H * .9, H * .035, 4, 4, '#a24a30', '#3d1a1f', .08);
  // vízrúna-kör
  const rx = W * (compact ? .76 : .6), ry = H * (compact ? .45 : .3), R = Math.min(W * (compact ? .09 : .17), H * (compact ? .42 : .26));
  x.save(); x.translate(rx, ry); x.shadowColor = '#4fb8ff'; x.shadowBlur = 14; x.lineCap = 'round';
  for (let i = 0; i < 3; i++) { const rr = R * (1 + i * .13), sp = (i % 2 ? -1 : 1) * (.25 + i * .12); x.strokeStyle = `rgba(110,200,255,${.75 - i * .18})`; x.lineWidth = Math.max(1, R * (.025 - i * .005)); x.setLineDash([R * (.3 + i * .1), R * (.08 + i * .05)]); x.lineDashOffset = -t * R * sp; x.beginPath(); x.ellipse(0, 0, rr, rr * .92, t * sp * .2, 0, 6.283); x.stroke(); }
  x.setLineDash([]);
  // „kapcsolási rajz”: vízszintes sínek, érintkezők, körök
  x.strokeStyle = 'rgba(150,220,255,.8)'; x.lineWidth = Math.max(1, R * .018);
  for (let i = 0; i < 5; i++) { const yy = -R * .55 + i * R * .27, hw = Math.sqrt(Math.max(0, 1 - (yy / R) ** 2)) * R * .78, on = .5 + .5 * Math.sin(t * 2 - i); x.globalAlpha = .45 + .55 * on;
    x.beginPath(); x.moveTo(-hw, yy); x.lineTo(hw, yy); x.stroke(); for (const k of [-.55, -.2, .3]) { const cx2 = hw * k; x.beginPath(); x.moveTo(cx2 - R * .03, yy - R * .05); x.lineTo(cx2 - R * .03, yy + R * .05); x.moveTo(cx2 + R * .03, yy - R * .05); x.lineTo(cx2 + R * .03, yy + R * .05); x.stroke(); }
    x.beginPath(); x.arc(hw * .72, yy, R * .045, 0, 6.283); x.stroke(); }
  x.globalAlpha = 1; x.beginPath(); x.moveTo(-R * .68, -R * .55); x.lineTo(-R * .68, R * .55); x.moveTo(R * .68, -R * .55); x.lineTo(R * .68, R * .55); x.stroke();
  // csepp a közepén
  const pu = 1 + Math.sin(t * 2.4) * .06, dr = R * .2 * pu; const dg = x.createRadialGradient(0, dr * .2, 0, 0, 0, dr * 2.2); dg.addColorStop(0, 'rgba(160,230,255,.9)'); dg.addColorStop(1, 'rgba(60,150,255,0)'); x.fillStyle = dg; x.beginPath(); x.arc(0, 0, dr * 2.2, 0, 6.283); x.fill();
  x.fillStyle = '#7fd2ff'; x.beginPath(); x.moveTo(0, -dr * 1.3); x.bezierCurveTo(dr * 1.1, -dr * .1, dr * .95, dr, 0, dr); x.bezierCurveTo(-dr * .95, dr, -dr * 1.1, -dr * .1, 0, -dr * 1.3); x.fill();
  x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.ellipse(-dr * .3, -dr * .1, dr * .14, dr * .3, -.3, 0, 6.283); x.fill();
  // keringő szikrák
  for (let i = 0; i < 26; i++) { const a = t * (.4 + (i % 5) * .08) + i * 2.4, rr = R * (1.02 + (i % 7) * .05); x.fillStyle = `rgba(170,230,255,${.4 + .6 * Math.abs(Math.sin(t * 3 + i))})`; x.beginPath(); x.arc(Math.cos(a) * rr, Math.sin(a) * rr * .92, Math.max(.8, R * .012), 0, 6.283); x.fill(); }
  x.restore();
  if (compact) { drawSlime(x, W * .9, H * .62, H * .32, t); return; }
  // szivattyútelep a jobb szélen
  const fx = W * .9, fy = H * .62; x.fillStyle = '#26243a'; x.fillRect(fx, fy, W * .1, H * .38); x.fillRect(fx + W * .03, fy - H * .16, W * .012, H * .16); x.fillRect(fx + W * .055, fy - H * .1, W * .03, H * .1);
  x.fillStyle = `rgba(255,60,60,${.4 + .6 * (Math.sin(t * 3) > 0)})`; x.beginPath(); x.arc(fx + W * .036, fy - H * .17, Math.max(2, H * .008), 0, 6.283); x.fill();
  x.fillStyle = '#ffc861'; x.fillRect(fx + W * .015, fy + H * .06, W * .02, H * .05); x.strokeStyle = '#3a3852'; x.lineWidth = H * .012; x.beginPath(); x.moveTo(fx - W * .02, fy + H * .3); x.lineTo(fx + W * .02, fy + H * .3); x.stroke();
  // szikla és kertész
  x.fillStyle = '#2a1a22'; x.beginPath(); x.moveTo(W * .66, H); x.lineTo(W * .7, H * .88); x.lineTo(W * .8, H * .85); x.lineTo(W * .9, H * .9); x.lineTo(W, H * .88); x.lineTo(W, H); x.fill();
  drawHero(x, W * .82, H * .86, H * .34, t);
}
function drawHero(x, px, py, h, t) {
  const u = h / 100; x.save(); x.translate(px, py);
  // köpeny
  const fl = Math.sin(t * 2.2) * 6 * u, fl2 = Math.sin(t * 2.2 + 1) * 5 * u;
  x.fillStyle = '#2b3f9e'; x.beginPath(); x.moveTo(-6 * u, -78 * u); x.bezierCurveTo(14 * u, -70 * u, 26 * u + fl, -35 * u, 30 * u + fl2, -12 * u); x.lineTo(16 * u + fl, -8 * u); x.bezierCurveTo(10 * u, -30 * u, 4 * u, -50 * u, -8 * u, -60 * u); x.fill();
  x.strokeStyle = '#d4a64a'; x.lineWidth = 1.6 * u; x.beginPath(); x.moveTo(30 * u + fl2, -12 * u); x.lineTo(16 * u + fl, -8 * u); x.stroke();
  // lábak, csizma
  x.fillStyle = '#2a2a34'; x.fillRect(-9 * u, -40 * u, 7 * u, 34 * u); x.fillRect(1 * u, -40 * u, 7 * u, 34 * u);
  x.fillStyle = '#6a3d22'; x.fillRect(-10 * u, -10 * u, 9 * u, 10 * u); x.fillRect(0, -10 * u, 9 * u, 10 * u);
  // test, öv
  x.fillStyle = '#2f3a62'; x.fillRect(-11 * u, -72 * u, 22 * u, 34 * u); x.fillStyle = '#6a3d22'; x.fillRect(-11 * u, -44 * u, 22 * u, 4 * u); x.fillStyle = '#8a5a2e'; x.fillRect(4 * u, -44 * u, 6 * u, 8 * u);
  // fej
  x.fillStyle = '#e2b48a'; x.beginPath(); x.arc(-1 * u, -82 * u, 8 * u, 0, 6.283); x.fill(); x.fillStyle = '#3a2416'; x.beginPath(); x.arc(-1 * u, -85 * u, 8.5 * u, Math.PI * .95, Math.PI * 2.05); x.fill(); x.fillRect(-9 * u, -86 * u, 4 * u, 7 * u);
  // kar a slaggal
  x.strokeStyle = '#2f3a62'; x.lineWidth = 6 * u; x.lineCap = 'round'; x.beginPath(); x.moveTo(-9 * u, -66 * u); x.lineTo(-22 * u, -46 * u); x.stroke(); x.fillStyle = '#6a3d22'; x.beginPath(); x.arc(-23 * u, -45 * u, 3.6 * u, 0, 6.283); x.fill();
  // slag
  x.strokeStyle = '#1f8f7a'; x.lineWidth = 3.2 * u; x.beginPath(); x.moveTo(-25 * u, -44 * u); x.bezierCurveTo(-40 * u, -20 * u, -10 * u, 0, 40 * u, 2 * u); x.stroke(); x.fillStyle = '#c8ccd2'; x.fillRect(-31 * u, -50 * u, 8 * u, 4 * u);
  // vízörvény a slag körül
  x.shadowColor = '#5fc8ff'; x.shadowBlur = 10;
  for (let i = 0; i < 36; i++) { const k = ((t * .35 + i / 36) % 1), a = k * 14 + t, rr = (8 + k * 26) * u, sx = -32 * u + Math.cos(a) * rr * .6 - k * 10 * u, sy = -48 * u + Math.sin(a) * rr + k * 40 * u;
    x.fillStyle = `rgba(140,220,255,${(1 - k) * .9})`; x.beginPath(); x.arc(sx, sy, (1.6 - k) * u * 1.4, 0, 6.283); x.fill(); }
  x.shadowBlur = 0; x.restore();
  drawSlime(x, px + 5 * u, py - 98 * u, 14 * u, t);
}
function drawSlime(x, px, py, s, t) {
  const b = Math.sin(t * 3) * s * .08, sq = 1 + Math.sin(t * 3) * .05, blink = (t % 3.4) < .12;
  x.save(); x.translate(px, py + b); x.scale(1 / sq, sq); x.shadowColor = '#6cc6ff'; x.shadowBlur = s * .6;
  const g = x.createRadialGradient(-s * .3, -s * .4, s * .1, 0, 0, s * 1.2); g.addColorStop(0, '#bfeaff'); g.addColorStop(.5, '#4fb0f5'); g.addColorStop(1, '#2a6fd1'); x.fillStyle = g;
  x.beginPath(); x.moveTo(0, -s * 1.1); x.bezierCurveTo(s * .3, -s * .7, s * 1.1, -s * .2, s * 1, s * .35); x.bezierCurveTo(s * .9, s * .85, -s * .9, s * .85, -s, s * .35); x.bezierCurveTo(-s * 1.1, -s * .2, -s * .3, -s * .7, 0, -s * 1.1); x.fill(); x.shadowBlur = 0;
  x.fillStyle = 'rgba(255,255,255,.8)'; x.beginPath(); x.ellipse(-s * .45, -s * .25, s * .12, s * .2, -.4, 0, 6.283); x.fill();
  x.fillStyle = '#10204a'; if (blink) { x.fillRect(-s * .4, s * .05, s * .22, s * .05); x.fillRect(s * .18, s * .05, s * .22, s * .05); } else { x.beginPath(); x.ellipse(-s * .29, s * .07, s * .1, s * .14, 0, 0, 6.283); x.ellipse(s * .29, s * .07, s * .1, s * .14, 0, 0, 6.283); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(-s * .26, s * .02, s * .035, 0, 6.283); x.arc(s * .32, s * .02, s * .035, 0, 6.283); x.fill(); }
  x.fillStyle = '#ff8fb5'; x.globalAlpha = .7; x.beginPath(); x.ellipse(-s * .55, s * .28, s * .12, s * .06, 0, 0, 6.283); x.ellipse(s * .55, s * .28, s * .12, s * .06, 0, 0, 6.283); x.fill(); x.globalAlpha = 1;
  x.strokeStyle = '#10204a'; x.lineWidth = s * .05; x.lineCap = 'round'; x.beginPath(); x.arc(0, s * .22, s * .13, .3, Math.PI - .3); x.stroke();
  x.restore();
}

/* ---------- közös animációs hurok (csak a látható canvasok) ---------- */
function loop(now) {
  raf = 0; const t = now / 1000; let any = false;
  for (const o of LIVE) { if (!o.cv.isConnected) { o.io?.disconnect(); LIVE.delete(o); continue; } if (!o.vis || document.hidden) continue; any = true; render(o, t); }
  if (any && !RM.matches) raf = requestAnimationFrame(loop);
}
function kick() { if (!raf && !RM.matches) raf = requestAnimationFrame(loop); }
function render(o, t) {
  const cv = o.cv, dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
  if (!o.sc || cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); o.sc = scene(w, h, o.compact); }
  const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); draw(x, w, h, t, o.sc, o.compact);
}
function live(cv, compact) {
  const o = { cv, compact, vis: true, sc: null };
  if ('IntersectionObserver' in window) { o.io = new IntersectionObserver(es => { o.vis = es[0].isIntersecting; if (o.vis) kick(); }); o.io.observe(cv); }
  LIVE.add(o); requestAnimationFrame(() => render(o, 12)); kick();
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });

/* ---------- beilleszthető elemek ---------- */
const clip = (s, n) => s && s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s || '';
export function bannerHtml() {
  const v = target(); if (!v) return '';
  return `<section class="promo pbig"><canvas class="pcv"></canvas><div class="pfade"></div><div class="pmin">
    <span class="ptag"><i class="ic ic-${v.liveAt ? 'radio' : 'sparkles'}"></i>${v.liveAt && v.soon ? esc(v.live?.phase === 'upcoming' ? 'PREMIER · ' + G.when(v.liveAt).toUpperCase() : G.label(v)) : (v.soon ? 'HAMAROSAN' : 'ÚJ') + ' ' + esc((v.kind || 'Anime').toUpperCase())}</span>
    <h2>${esc(v.en || v.title)}</h2>${v.en ? `<div class="pen">${esc(v.title)}</div>` : ''}
    ${v.desc ? `<p>${esc(clip(v.desc, 180))}</p>` : ''}
    <div class="hbtns">${v.liveAt && v.soon ? `<a class="pbtn play" href="#/premier/${esc(v.id)}"><i class="ic ic-radio"></i>${v.live?.open ? 'Belépés a premierre' : 'Premier oldala'}</a>` : `<button class="pbtn play" data-play="${esc(v.id)}"><i class="ic ic-${v.soon ? 'bell' : 'play'}"></i>${v.soon ? 'Részletek' : 'Megnézem'}</button>`}<button class="pbtn info" data-info="${esc(v.id)}"><i class="ic ic-info"></i>További infók</button></div></div></section>`;
}
export function stripHtml() {
  const v = target(); if (!v) return '';
  const go = v.liveAt && v.soon && v.live?.open;
  return `${go ? `<a class="promo pstrip" href="#/premier/${esc(v.id)}">` : `<button class="promo pstrip" data-info="${esc(v.id)}">`}<canvas class="pcv"></canvas><span class="pmin"><span class="ptag"><i class="ic ic-${v.liveAt && v.soon ? 'radio' : 'sparkles'}"></i>${v.liveAt && v.soon ? esc(v.live?.phase === 'upcoming' ? 'PREMIER · ' + G.when(v.liveAt).toUpperCase() : G.label(v)) : 'ÚJ ' + esc((v.kind || 'Anime').toUpperCase())}</span><b>${esc(v.en || v.title)}</b><span class="pgo">${v.liveAt && v.soon && v.live?.open ? 'Belépés' : 'Megnézem'} <i class="ic ic-chevron-right"></i></span></span>${go ? '</a>' : '</button>'}`;
}
/* a frissen beillesztett hirdetések élesítése */
export function wire(root = document) { root.querySelectorAll('.promo .pcv:not([data-on])').forEach(cv => { cv.dataset.on = '1'; live(cv, cv.closest('.pstrip') !== null); }); }
