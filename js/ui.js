// HGWS – felugró ablakok, emoji-választó, képtömörítés
import { $, esc } from './core.js?v=202611221651';

export const EMOJIS = ['👍', '❤️', '😂', '🔥', '💧', '😮', '😢', '😡', '🎉', '👏', '🙏', '💯', '😎', '🤔', '👀', '🤣',
  '😍', '🥲', '😅', '🙃', '🤝', '💪', '🚿', '🌱', '🌊', '🏆', '⭐', '✅', '❌', '🍿', '🎬', '🎮'];
export const QUICK = ['👍', '❤️', '😂', '🔥', '💧', '😮'];

/* modális ablak */
export function modal({ title, body = '', foot = '', cls = '', onClose } = {}) {
  const el = document.createElement('div');
  el.className = 'modal';
  el.innerHTML = `<div class="mdl ${cls}" role="dialog" aria-modal="true">
    <header><h3>${esc(title || '')}</h3><button class="ibtn" data-x aria-label="Bezárás">✕</button></header>
    <div class="bd">${body}</div>${foot ? `<footer>${foot}</footer>` : ''}</div>`;
  document.body.appendChild(el);
  const close = () => { el.remove(); removeEventListener('keydown', key); onClose && onClose(); };
  const key = e => { if (e.key === 'Escape' && document.body.lastElementChild === el) close(); };
  addEventListener('keydown', key);
  el.addEventListener('pointerdown', e => { if (e.target === el) el._down = true; });
  el.addEventListener('click', e => { if ((e.target === el && el._down) || e.target.closest('[data-x]')) close(); el._down = false; });
  el.close = close;
  setTimeout(() => { const f = el.querySelector('[autofocus],input:not([type=checkbox]):not([type=file]),textarea'); f && f.focus(); }, 30);
  return el;
}

export function confirmBox(text, okLabel = 'Igen', danger = true) {
  return new Promise(res => {
    const m = modal({ title: 'Biztos?', body: `<p style="color:var(--ink2);line-height:1.55">${esc(text)}</p>`,
      foot: `<button class="btn plain" data-x>Mégse</button><button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(okLabel)}</button>`,
      onClose: () => res(false) });
    m.querySelector('[data-ok]').onclick = () => { res(true); m.remove(); };
  });
}

/* lebegő menü egy elem mellé */
let curPop = null;
export function popover(anchor, html, cls = '') {
  closePop();
  const el = document.createElement('div');
  el.className = 'pop ' + cls; el.innerHTML = html;
  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
  let x = r.right + 8, y = r.top;
  if (x + w > innerWidth - 8) x = r.left - w - 8;
  if (x < 8) x = Math.max(8, Math.min(innerWidth - w - 8, r.left));
  if (x < 8 || (r.left - w - 8 < 8 && r.right + 8 + w > innerWidth)) { x = Math.max(8, (innerWidth - w) / 2); y = r.bottom + 8; }
  if (y + h > innerHeight - 8) y = Math.max(8, innerHeight - h - 8);
  el.style.left = x + 'px'; el.style.top = y + 'px';
  curPop = el;
  setTimeout(() => addEventListener('pointerdown', outside, true));
  return el;
}
function outside(e) { if (curPop && !curPop.contains(e.target)) closePop(); }
export function closePop() { if (curPop) { curPop.remove(); curPop = null; } removeEventListener('pointerdown', outside, true); }
addEventListener('keydown', e => { if (e.key === 'Escape') closePop(); });

export function emojiPicker(anchor, onPick) {
  const p = popover(anchor, `<div class="emo">${EMOJIS.map(e => `<button data-e="${e}">${e}</button>`).join('')}</div>`);
  p.addEventListener('click', e => { const b = e.target.closest('[data-e]'); if (b) { onPick(b.dataset.e); closePop(); } });
}

/* kép átméretezése, tömörítése (Firestore dokumentum max ~1 MB) */
export async function compress(file, maxW) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const w = img.naturalWidth, h = img.naturalHeight;
    for (let target = maxW, q = .82; ; target = Math.round(target * .8), q = Math.max(.6, q - .06)) {
      const k = Math.min(1, target / w), cw = Math.round(w * k), ch = Math.round(h * k);
      const c = document.createElement('canvas'); c.width = cw; c.height = ch;
      c.getContext('2d').drawImage(img, 0, 0, cw, ch);
      let out = c.toDataURL('image/webp', q);
      if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/jpeg', q);
      if (out.length < 600 * 1024 || target < 500) return out;
    }
  } finally { URL.revokeObjectURL(url); }
}

export const STAGES = ['Forgatókönyv', 'Látványterv', 'Forgatás', 'Utómunka', 'Premier'];
export function stageHtml(stage) {
  return `<div class="stage">${STAGES.map((x, i) => `<em class="${i < stage ? 'done' : i === stage ? 'now' : ''}">${i < stage ? '✓ ' : i === stage ? '● ' : ''}${x.toUpperCase()}</em>`).join('')}</div>`;
}
