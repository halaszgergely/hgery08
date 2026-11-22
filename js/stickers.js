// HGWS matricák és saját emojik – a leíró: img/stickers/hgws/stickers.json
// Egy matrica képe később cserélhető (PNG/WebP): ugyanaz az id marad, csak a JSON „file” mezője változik.
import { esc } from './core.js?v=202611222117';
import { popover, closePop, EMOJIS } from './ui.js?v=202611222117';

const JSON_URL = new URL('../img/stickers/hgws/stickers.json', import.meta.url).href + new URL(import.meta.url).search;
let DATA = { base: 'img/stickers/hgws/', stickers: [], emojis: [], categories: {} };
try { DATA = await (await fetch(JSON_URL)).json(); } catch (e) { console.warn('stickers.json', e); }

const BASE = new URL('../' + DATA.base, import.meta.url).href;
const STK = new Map(DATA.stickers.map(s => [s.id, s]));
const EMO = new Map(DATA.emojis.map(e => [e.code, e]));
const src = f => BASE + f;

export const stickers = () => DATA.stickers;
export const customEmojis = () => DATA.emojis;
export const sticker = id => STK.get(id);
export const stickerSrc = id => STK.has(id) ? src(STK.get(id).file) : '';
export const isCode = k => /^:[a-z0-9_]+:$/.test(k) && EMO.has(k.slice(1, -1));

/* :kód: → beágyazott kép (a már HTML-escape-elt szövegen fut) */
const CODE_RE = /:([a-z0-9_]{2,32}):/g;
export const emojiImg = (code, cls = 'cemo') => {
  const e = EMO.get(code); if (!e) return `:${code}:`;
  return `<img class="${cls}" src="${src(e.file)}" alt="${esc(e.alt)}" title=":${code}:" draggable="false">`;
};
export const emojify = html => html.replace(CODE_RE, (m, c) => EMO.has(c) ? emojiImg(c) : m);
/* csak saját emojikból (és sima emojikból) áll-e az üzenet → nagy megjelenítés */
export function onlyCustom(t) {
  const n = (t.match(CODE_RE) || []).filter(m => EMO.has(m.slice(1, -1))).length;
  if (!n || n > 12) return false;
  const rest = t.replace(CODE_RE, (m, c) => EMO.has(c) ? '' : m);
  return /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\s|‍|️)*$/u.test(rest) && !/[\d#*]/.test(rest);
}
/* reakció gombjának tartalma */
export const reactLabel = k => isCode(k) ? emojiImg(k.slice(1, -1), 'cemo rx') : esc(k);

/* matricaüzenet */
export function stickerHtml(id) {
  const s = STK.get(id);
  if (!s) return `<div class="stk missing"><i class="ic ic-image-off"></i> Ez a matrica már nem elérhető.</div>`;
  return `<div class="stk" data-stk="${esc(id)}"><img src="${src(s.file)}" alt="${esc(s.alt)}" title="${esc(s.name)}" draggable="false" loading="lazy" width="150" height="150"></div>`;
}

/* gépelés közbeni javaslatok a „:” után */
export function suggest(q) {
  q = q.toLowerCase();
  const score = e => e.code.startsWith(q) ? 0 : e.code.includes(q) ? 1 : e.keywords.some(k => k.startsWith(q)) ? 2 : e.name.toLowerCase().includes(q) ? 3 : 9;
  return DATA.emojis.map(e => [score(e), e]).filter(([s]) => s < 9).sort((a, b) => a[0] - b[0]).map(([, e]) => e).slice(0, 8);
}

/* legutóbb használt matricák (csak ezen a gépen) */
const RKEY = 'hgws_stk_recent';
const recent = () => { try { return (JSON.parse(localStorage.getItem(RKEY)) || []).filter(id => STK.has(id)); } catch (_) { return []; } };
export function useSticker(id) { try { localStorage.setItem(RKEY, JSON.stringify([id, ...recent().filter(x => x !== id)].slice(0, 8))); } catch (_) {} }

const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const match = (q, ...xs) => !q || xs.flat().some(x => norm(x).includes(q));
const sheet = () => matchMedia('(max-width:700px), (hover:none) and (pointer:coarse)').matches;

/* választó: Emoji | HGWS emojik | Matricák
   o.onEmoji(str) – unicode emoji vagy ':kód:';  o.onSticker(id) – ha megadva, megjelenik a Matricák fül */
export function picker(anchor, o) {
  const tabs = [['emoji', 'Emoji'], ['hgws', 'HGWS emojik'], ...(o.onSticker ? [['stk', 'Matricák']] : [])];
  let tab = o.tab && tabs.some(t => t[0] === o.tab) ? o.tab : (o.onSticker ? 'stk' : 'emoji');
  try { const last = sessionStorage.getItem('hgws_pick_tab'); if (!o.tab && last && tabs.some(t => t[0] === last)) tab = last; } catch (_) {}
  const p = popover(anchor, `<div class="hpick" role="dialog" aria-label="Emoji és matrica választó">
    <div class="hpt" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-tab="${k}">${l}</button>`).join('')}</div>
    <label class="hps"><i class="ic ic-search"></i><input type="search" placeholder="Keresés…" aria-label="Keresés a matricák és emojik között" autocomplete="off"></label>
    <div class="hpb"></div><div class="stkprev" hidden></div></div>`, 'hpop' + (sheet() ? ' sheet' : ''));
  const body = p.querySelector('.hpb'), inp = p.querySelector('input'), prev = p.querySelector('.stkprev');
  const draw = () => {
    p.querySelectorAll('[data-tab]').forEach(b => { b.classList.toggle('on', b.dataset.tab === tab); b.setAttribute('aria-selected', b.dataset.tab === tab); });
    p.querySelector('.hps').hidden = tab === 'emoji';
    const q = norm(inp.value.trim());
    if (tab === 'emoji') body.innerHTML = `<div class="emo">${EMOJIS.map(e => `<button data-e="${e}" aria-label="${e}">${e}</button>`).join('')}</div>`;
    else if (tab === 'hgws') {
      const l = DATA.emojis.filter(e => match(q, e.code, e.name, e.keywords));
      body.innerHTML = l.length ? `<div class="cemos">${l.map(e => `<button data-e=":${e.code}:" title=":${e.code}:" aria-label="${esc(e.name)}">${emojiImg(e.code, 'cemo')}</button>`).join('')}</div>` : '<p class="hpn">Nincs találat.</p>';
    } else {
      const btn = s => `<button data-s="${esc(s.id)}" title="${esc(s.name)}" aria-label="${esc(s.alt)}"><img src="${src(s.file)}" alt="" loading="lazy" draggable="false"></button>`;
      const r = recent(), l = DATA.stickers.filter(s => match(q, s.id, s.name, s.keywords, DATA.categories[s.category] || ''));
      const groups = Object.entries(DATA.categories).map(([k, n]) => [n, l.filter(s => s.category === k)]).filter(([, x]) => x.length);
      body.innerHTML = (r.length && !q ? `<h6>Legutóbb használt</h6><div class="stks">${r.map(id => btn(STK.get(id))).join('')}</div>` : '')
        + (groups.length ? groups.map(([n, x]) => `<h6>${esc(n)}</h6><div class="stks">${x.map(btn).join('')}</div>`).join('') : '<p class="hpn">Nincs találat.</p>');
    }
  };
  draw();
  // a tartalommal együtt mért magasság alapján: ne lógjon le a képernyőről
  if (!p.classList.contains('sheet')) { const r = p.getBoundingClientRect(); if (r.bottom > innerHeight - 8) p.style.top = Math.max(8, innerHeight - r.height - 8) + 'px'; }
  p.querySelector('.hpt').onclick = e => { const b = e.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; try { sessionStorage.setItem('hgws_pick_tab', tab); } catch (_) {} draw(); if (tab !== 'emoji' && !sheet()) inp.focus(); };
  inp.oninput = draw;
  inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); body.querySelector('button')?.click(); } };
  // hosszú nyomás: a matrica nevének előnézete (és ilyenkor nem küldjük el)
  let lp = 0, held = false;
  body.addEventListener('pointerdown', e => {
    const b = e.target.closest('[data-s]'); if (!b) return; held = false;
    clearTimeout(lp); lp = setTimeout(() => { held = true; const s = STK.get(b.dataset.s);
      prev.innerHTML = `<img src="${src(s.file)}" alt="${esc(s.alt)}"><b>${esc(s.name)}</b><small>${esc(s.alt)}</small>`; prev.hidden = false; }, 420);
  });
  const up = () => { clearTimeout(lp); prev.hidden = true; };
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => body.addEventListener(ev, up));
  body.addEventListener('contextmenu', e => { if (e.target.closest('[data-s]')) e.preventDefault(); });
  body.addEventListener('click', e => {
    const s = e.target.closest('[data-s]'); if (s) { if (held) { held = false; return; } useSticker(s.dataset.s); closePop(); o.onSticker(s.dataset.s); return; }
    const b = e.target.closest('[data-e]'); if (b) { closePop(); o.onEmoji(b.dataset.e); }
  });
  if (tab !== 'emoji' && !sheet()) setTimeout(() => inp.focus(), 30);
  return p;
}
