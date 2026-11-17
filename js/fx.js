// HGWS – apró effektek: vízfodrozódás kattintásra, felpörgő számok, grafikon-buborék, indítókép,
// filmenkénti színárnyalat (domináns szín), generált háttér kép nélküli filmekhez, oldalváltás.

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const I = n => `<i class="ic ic-${n}"></i>`;

/* ---------- generált háttér (kép nélküli filmekhez): a címből számolt színátmenet ---------- */
const hash = s => [...String(s || '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 2166136261);
export function art(seed) {
  const h = hash(seed), a = h % 360, b = (a + 40 + (h >> 8) % 80) % 360;
  return `radial-gradient(120% 90% at ${20 + (h >> 4) % 50}% ${(h >> 12) % 40}%,hsla(${a},70%,45%,.55),transparent 60%),` +
    `radial-gradient(90% 80% at ${60 + (h >> 6) % 40}% 100%,hsla(${b},75%,40%,.5),transparent 65%),` +
    `repeating-linear-gradient(${(h >> 3) % 180}deg,rgba(255,255,255,.025) 0 2px,transparent 2px 14px),linear-gradient(160deg,#0d1730,#05070c)`;
}
/* háttér stílus: ha van kép, az; ha nincs, generált minta (class: art) */
export const bgOf = (url, seed) => url ? { cls: '', style: `background-image:url('${String(url).replace(/'/g, '%27')}')` } : { cls: ' art', style: `--art:${art(seed)}` };

/* ---------- domináns szín egy képből (gyorsítótárral) ---------- */
const TINT = new Map();
export function tintOf(url) {
  if (!url) return Promise.resolve(null);
  if (TINT.has(url)) return TINT.get(url);
  const p = new Promise(res => {
    const img = new Image();
    if (!url.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas'), w = c.width = 32, h = c.height = 18, x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(img, 0, 0, w, h);
        const d = x.getImageData(0, 0, w, h).data; let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) {
          const R = d[i], G = d[i + 1], B = d[i + 2], mx = Math.max(R, G, B), mn = Math.min(R, G, B), s = mx ? (mx - mn) / mx : 0;
          const wgt = s * s * (mx > 40 && mx < 245 ? 1 : .1) + .02;   // a telített, közepesen világos képpontok számítanak
          r += R * wgt; g += G * wgt; b += B * wgt; n += wgt;
        }
        let rgb = [r / n, g / n, b / n];
        const mx = Math.max(...rgb) || 1, k = Math.min(2.2, 215 / mx);   // világosítás, hogy sötét háttéren is látszódjon
        rgb = rgb.map(v => Math.round(Math.min(255, v * k)));
        res(rgb);
      } catch (_) { res(null); }
    };
    img.onerror = () => res(null);
    img.src = url;
  });
  TINT.set(url, p); return p;
}
export async function applyTint(el, url) {
  if (!el) return;
  const c = await tintOf(url);
  if (c && el.isConnected) el.style.setProperty('--tint', c.join(','));
}

/* ---------- kattintás: vízfodrozódás ---------- */
const RIP = '.btn,.pbtn,.rnd,.chipsrow button,.pills a,.atabs a,.acard,.ccard,.ifilt button,.cmdk .it';
document.addEventListener('pointerdown', e => {
  if (reduce() || e.button) return;
  const el = e.target.closest(RIP); if (!el || el.disabled) return;
  const r = el.getBoundingClientRect(), s = document.createElement('span');
  s.className = 'rip'; s.style.left = (e.clientX - r.left) + 'px'; s.style.top = (e.clientY - r.top) + 'px';
  s.style.setProperty('--k', Math.ceil(Math.hypot(r.width, r.height) / 6));
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
  el.style.overflow = 'hidden';
  el.appendChild(s); setTimeout(() => s.remove(), 700);
}, { passive: true });

/* ---------- felpörgő számok (statisztika, profil, ranglista) ---------- */
const CNT = '.stile b,.pst b,.lbv,[data-count]';
const NUM = /^\s*(\d{1,3}(?:[\s ]\d{3})*|\d+)\s*$/;
function countUp(el) {
  if (el._cu || reduce()) return;
  const t = el.firstChild; if (!t || t.nodeType !== 3) return;
  const m = t.nodeValue.match(NUM); if (!m) return;
  const end = +m[1].replace(/\D/g, ''); if (end < 2 || el.dataset.cu === String(end)) return;
  el.dataset.cu = end; el._cu = true;
  const t0 = performance.now(), dur = Math.min(1400, 500 + end * 6);
  const step = now => {
    const p = Math.min(1, (now - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
    t.nodeValue = v.toLocaleString('hu-HU');
    if (p < 1) requestAnimationFrame(step); else { el._cu = false; }
  };
  requestAnimationFrame(step);
}
const scan = root => { if (root.matches?.(CNT)) countUp(root); root.querySelectorAll?.(CNT).forEach(countUp); };
new MutationObserver(ms => ms.forEach(m => {
  if (m.target.matches?.(CNT)) countUp(m.target);
  m.addedNodes.forEach(n => n.nodeType === 1 && scan(n));
})).observe(document.documentElement, { childList: true, subtree: true });

/* ---------- grafikon-buborék: a .col és .hbr elemek title-jéből ---------- */
let tip = null;
document.addEventListener('pointerover', e => {
  const el = e.target.closest('.col,.hbr,[data-tip]'); if (!el) return;
  if (el.title) { el.dataset.tip = el.title; el.removeAttribute('title'); }
  if (!el.dataset.tip) return;
  tip ||= Object.assign(document.createElement('div'), { className: 'ctip' });
  if (!tip.isConnected) document.body.appendChild(tip);
  tip.textContent = el.dataset.tip;
  const r = el.getBoundingClientRect();
  tip.style.left = Math.min(innerWidth - 90, Math.max(90, r.left + r.width / 2)) + 'px';
  tip.style.top = (el.classList.contains('col') ? r.top + r.height - (el.firstElementChild?.offsetHeight || 0) : r.top) + 'px';
  tip.classList.add('on');
});
document.addEventListener('pointerout', e => { if (tip && e.target.closest('.col,.hbr,[data-tip]') && !e.relatedTarget?.closest?.('.col,.hbr,[data-tip]')) tip.classList.remove('on'); });
addEventListener('scroll', () => tip?.classList.remove('on'), { passive: true });

/* ---------- indítókép eltüntetése (legalább a csepp-animáció végéig látszik) ---------- */
export function bootOut() {
  const b = document.getElementById('boot'); if (!b) return;
  setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 600); }, Math.max(0, (reduce() ? 0 : 1300) - performance.now()));
}

/* ---------- oldalváltás: csak valódi nézetváltáskor animál ---------- */
export function pageIn(on) {
  const p = document.getElementById('page'); if (!p) return;
  p.classList.remove('pgin');
  if (on) { void p.offsetWidth; p.classList.add('pgin'); }
}

/* ---------- ambilight: a film színei „kifolynak” a lejátszó mögé ----------
   MP4-nél a képkockákból (ha a forrás engedi), egyébként a borítókép elmosva, lassan „lélegezve”. */
export function ambilight(box, { img } = {}) {
  if (!box) return () => {};
  box.querySelector(':scope > .amb')?.remove();
  const a = document.createElement('div'); a.className = 'amb'; a.setAttribute('aria-hidden', 'true');
  box.prepend(a);
  let timer = null, dead = false;
  const still = () => { a.className = 'amb img'; a.innerHTML = img ? `<div style="background-image:url('${String(img).replace(/'/g, '%27')}')"></div>` : `<div style="background:radial-gradient(60% 60% at 50% 50%,rgba(var(--tint),.7),transparent)"></div>`; };
  still();
  const tryVideo = () => {
    const v = box.querySelector('video'); if (!v || dead) return;
    const c = document.createElement('canvas'); c.width = 48; c.height = 27;
    const x = c.getContext('2d', { willReadFrequently: true });
    const draw = () => {
      if (dead || !v.isConnected) return stop();
      if (v.readyState >= 2 && !v.paused) {
        try { x.drawImage(v, 0, 0, c.width, c.height); x.getImageData(0, 0, 1, 1); if (!c.isConnected) { a.className = 'amb'; a.innerHTML = ''; a.appendChild(c); } }
        catch (_) { clearInterval(timer); timer = null; still(); }   // más domainről jövő videó: marad a kép
      }
    };
    timer = setInterval(draw, 180);
  };
  setTimeout(tryVideo, 600);
  const stop = () => { dead = true; clearInterval(timer); a.remove(); };
  return stop;
}
