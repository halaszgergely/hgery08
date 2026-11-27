// Kohóvár böngészős modkeret: bővítési pontok a motorhoz (új blokkfajták), a Mindustry-modok által
// elvárt, de a Kohóvárból hiányzó rendszerek (logikai processzorok, memória, kijelző, kapcsoló, üzenet),
// és a beépített modok saját kiegészítőinek betöltése. Mindig aktív.
import { TS, ITEMS, LIQUIDS, BLOCKS, UNITS, BUILD_ORDER, TECH, CATS, rcost } from './adat.js?v=202611270939';
import { SN } from './kepadat.js?v=202611270939';
import { addSprite } from './rajz.js?v=202611270939';
let Proc = null;   // a logika.js-ből, betöltéskor (körkörös importálás elkerülése)

export const FW = {
  name: 'Kohóvár böngészős modkeret', version: '1.0',
  types: {},          // fajtanév → leírás (lásd reg)
  parts: [],          // a modlistában megjelenő képességek
  addons: [],         // betöltött kiegészítők (modazonosító)
  /* Új blokkfajta. def:
       mindustry: RegExp – mely Mindustry-osztályokat valósítja meg (a modbetöltő ehhez rendeli)
       convert(j, h)      – a mod JSON-jából a blokk saját mezői (h: a betöltő segédfüggvényei)
       init(W, b)         – épüléskor
       update(W, b, ts)   – körönként
       accept(W, b, it, src) – tárgyat fogad-e (és el is teszi)
       lqAccept(W, b, liq, src)
       draw(g, b, d)      – rajzolás (d: { spr, cx, cy, x, y, s, n, W })
       overlay(g, W, b)   – rajz a kijelölt épület fölé (pl. linkek)
       sel(W, b)          – HTML a kijelölési panelbe; selClick(W, b, el) – gombok
       tap(W, b)          – koppintás az épületre; true: kezelve (nem jelöli ki)
       linkTap(W, b, t)   – kijelölt épület mellett egy másikra koppintás; true: kezelve
       info(B)            – sorok az adatlapra */
  reg(name, def) { this.types[name] = { name, ...def }; return this.types[name]; },
  // segédek a kiegészítőknek
  adj(W, b) { const out = new Set(), s = b.B.s; for (let i = -1; i <= s; i++) for (const [x, y] of [[b.x + i, b.y - 1], [b.x + i, b.y + s], [b.x - 1, b.y + i], [b.x + s, b.y + i]]) { const t = W.inb(x, y) ? W.tb(x, y) : null; if (t && t !== b) out.add(t); } return [...out]; },
  center: b => ({ x: (b.x + b.B.s / 2) * TS, y: (b.y + b.B.s / 2) * TS }),
  match(T) { for (const t of Object.values(this.types)) if (t.mindustry && t.mindustry.test(T)) return t; return null; },
  T(b) { return b && this.types[b.B.type]; },
};

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/* ================= logika ================= */
// a linkek neve a Mindustry szerint: a blokknév utolsó tagja + sorszám (cell1, display1, switch1…)
const linkBase = t => { const n = SN[t] || t; return n.replace(/\d+$/, '').split('-').pop().replace(/^processor$/, 'processor') || 'block'; };
const PRIV = new Set(['setblock', 'spawn', 'setrule', 'spawnwave', 'explosion', 'setprop', 'status', 'fetch', 'getflag', 'setflag', 'cutscene', 'message', 'localeprint', 'setrate', 'effect', 'sync', 'clientdata', 'weathersense', 'weatherset', 'playsound', 'setmarker', 'makemarker']);
const packCol = (r, g, b, a) => ((Math.max(0, Math.min(255, r * 255 | 0)) << 24) >>> 0) + (Math.max(0, Math.min(255, g * 255 | 0)) << 16) + (Math.max(0, Math.min(255, b * 255 | 0)) << 8) + Math.max(0, Math.min(255, a * 255 | 0));

let LProcC = null;
const makeLProc = () => class LProc extends Proc {
  constructor(W, b) {
    const c = b.cfg || {};
    super({ W, L: k => k, msgs: [] }, { code: c.code || '', links: (c.links || []).map(([n, x, y]) => [n, x, y]) });
    this.b = b; this.print = ''; this.ipt = b.B.ipt || 2; this.dq = []; this.ui = 0;
    this.labels = {}; this.code = this.code.filter(l => { if (l.length === 1 && /:$/.test(l[0])) { this.labels[l[0].slice(0, -1)] = -1; return true; } return true; });
    // ugrócímkék (label:) feloldása
    const L = {}; let out = []; for (const l of this.code) { if (l.length === 1 && /:$/.test(l[0])) L[l[0].slice(0, -1)] = out.length; else out.push(l); }
    this.code = out.map(l => l[0] === 'jump' && L[l[1]] !== undefined ? ['jump', String(L[l[1]]), ...l.slice(2)] : l);
    this.v['@this'] = b; this.v['@thisx'] = b.x; this.v['@thisy'] = W.h - 1 - b.y;
  }
  val(a) {
    if (a === '@this') return this.b; if (a === '@thisx') return this.b.x + (this.b.B.s - 1) / 2; if (a === '@thisy') return this.W.h - 1 - this.b.y - (this.b.B.s - 1) / 2;
    if (a === '@ipt') return this.ipt; if (a === '@links') return (this.b.cfg && this.b.cfg.links || []).length; if (a === '@counter') return this.pc;
    if (a === '@pi' || a === 'π') return Math.PI; if (a === '@e') return Math.E;
    return super.val(a);
  }
  cell(a) { const o = this.val(a); return o && o.B && o.B.type === 'lmem' && !o.dead ? o : null; }
  exec(l) {
    const [op, a, b, c, d, e, f, g] = l, W = this.W;
    if (PRIV.has(op)) return;     // csak világprocesszoron
    switch (op) {
      case 'read': { const m = this.cell(b), i = this.num(c) | 0; this.set(a, m && i >= 0 && i < m.cfg.length ? m.cfg[i] : null); return; }
      case 'write': { const m = this.cell(b), i = this.num(c) | 0; if (m && i >= 0 && i < m.cfg.length) m.cfg[i] = this.num(a); return; }
      case 'draw': if (this.dq.length < 256) this.dq.push([a, this.num(b), this.num(c), this.num(d), this.num(e), this.num(f), this.num(g)]); return;
      case 'drawflush': { const o = this.val(a); if (o && o.B && o.B.type === 'ldisp' && !o.dead) dispRun(o, this.dq); this.dq = []; return; }
      case 'printflush': { const o = this.val(a); if (o && o.B && o.B.type === 'lmsg' && !o.dead) o.cfg = { text: this.print.slice(0, 400) }; this.print = ''; return; }
      case 'packcolor': this.set(a, packCol(this.num(b), this.num(c), this.num(d), this.num(e))); return;
      case 'lookup': { const L = { block: Object.keys(BLOCKS), unit: Object.keys(UNITS), item: Object.keys(ITEMS), liquid: Object.keys(LIQUIDS) }[a] || []; const k = L[this.num(c) | 0]; this.set(b, k ? { c: SN[k] || k } : null); return; }
      case 'control': {
        const o = this.val(b); if (!o || !o.B || o.team !== this.b.team) return;
        if (a === 'enabled') { if (o.B.type === 'lswitch') o.cfg = this.num(c) ? 1 : 0; else o.off = !this.num(c); }
        else if (a === 'shoot' || a === 'shootp') { if (o.B.type === 'turret') { const t = a === 'shootp' ? this.val(c) : null; o.lctl = { tick: W.tick, x: t && t.x != null && !t.B ? t.x : (this.num(c) + .5) * TS, y: t && t.y != null && !t.B ? t.y : (W.h - this.num(d) - .5) * TS, on: this.num(a === 'shootp' ? d : e) }; } }
        return;
      }
      case 'sensor': {
        const o = this.val(b), p = (this.val(c) || {}).c;
        if (o && o.B && p === 'enabled' && o.B.type === 'lswitch') { this.set(a, o.cfg ? 1 : 0); return; }
        if (o && o.B && p === 'memoryCapacity' && o.B.type === 'lmem') { this.set(a, o.cfg.length); return; }
        if (o && o.B && p === 'displayWidth' && o.B.type === 'ldisp') { this.set(a, o.B.res); return; }
        if (o && o.B && p === 'size') { this.set(a, o.B.s); return; }
        if (o && o.B && (p === 'type' || p === 'name')) { this.set(a, { c: SN[o.t] || o.t }); return; }
        break;
      }
      case 'radar': {   // radar cél1 cél2 cél3 rendezés forrás sorrend eredmény
        const src = this.val(e), out = g; if (!src || src.dead) { this.set(out, null); return; }
        const sx = src.B ? (src.x + src.B.s / 2) * TS : src.x, sy = src.B ? (src.y + src.B.s / 2) * TS : src.y, rng = src.B ? (src.B.range || 0) : (src.U && src.U.rng) || 80;
        const ok = (u, k) => !k || k === 'any' || (k === 'enemy' ? u.team !== this.b.team : k === 'ally' ? u.team === this.b.team : k === 'ground' ? !u.U.air : k === 'flying' ? !!u.U.air : k === 'player' ? u === W.player : k === 'boss' ? !!u.boss : true);
        let best = null, bv = Infinity; const ord = this.num(f) ? 1 : -1;
        for (const u of W.units) { if (u.dead || Math.hypot(u.x - sx, u.y - sy) > rng || !ok(u, a) || !ok(u, b) || !ok(u, c)) continue; const v = d === 'health' ? u.hp : d === 'maxHealth' ? u.U.hp : d === 'armor' ? u.U.armor : Math.hypot(u.x - sx, u.y - sy); const s2 = d === 'distance' ? v * ord : -v * ord; if (s2 < bv) { bv = s2; best = u; } }
        this.set(out, best); return;
      }
      case 'ubind': {
        const v = this.val(a);
        if (v && v.c && UNITS[unitKey(v.c)]) { const k = unitKey(v.c), L = W.units.filter(u => !u.dead && u.t === k && u.team === this.b.team && u !== W.player); this.ui = L.length ? (this.ui + 1) % L.length : 0; this.unit = L[this.ui] || null; return; }
        if (v && v.U && !v.B && v.team !== this.b.team) { this.unit = null; return; }
        break;
      }
    }
    super.exec(l);
  }
};
const unitKey = c => UNITS[c] ? c : Object.keys(UNITS).find(k => SN[k] === c || k.endsWith('-' + c)) || c;

// kijelző: saját vászon, a rajzparancsok azonnal végrehajtva (a Mindustryban y felfelé nő)
function dispCtx(b) {
  if (!b.dc) { const cv = document.createElement('canvas'); cv.width = cv.height = b.B.res; b.dc = cv.getContext('2d'); b.dc.fillStyle = '#000'; b.dc.fillRect(0, 0, b.B.res, b.B.res); b.dcol = '#fff'; b.dsw = 1; }
  return b.dc;
}
function dispRun(b, q) {
  const g = dispCtx(b), R = b.B.res, Y = y => R - y;
  for (const [k, a, c, d, e, f, h] of q) {
    switch (k) {
      case 'clear': g.fillStyle = `rgb(${a},${c},${d})`; g.fillRect(0, 0, R, R); break;
      case 'color': b.dcol = `rgba(${a},${c},${d},${(e ?? 255) / 255})`; break;
      case 'col': { const v = a >>> 0; b.dcol = `rgba(${v >>> 24 & 255},${v >>> 16 & 255},${v >>> 8 & 255},${(v & 255) / 255})`; break; }
      case 'stroke': b.dsw = a; break;
      case 'line': g.strokeStyle = b.dcol; g.lineWidth = b.dsw; g.beginPath(); g.moveTo(a, Y(c)); g.lineTo(d, Y(e)); g.stroke(); break;
      case 'rect': g.fillStyle = b.dcol; g.fillRect(a, Y(c) - e, d, e); break;
      case 'lineRect': g.strokeStyle = b.dcol; g.lineWidth = b.dsw; g.strokeRect(a, Y(c) - e, d, e); break;
      case 'poly': case 'linePoly': { const n = Math.max(3, Math.min(64, d | 0)); g.beginPath(); for (let i = 0; i <= n; i++) { const t = (f + i * 360 / n) * Math.PI / 180; const px = a + Math.cos(t) * e, py = Y(c + Math.sin(t) * e); i ? g.lineTo(px, py) : g.moveTo(px, py); } if (k === 'poly') { g.fillStyle = b.dcol; g.fill(); } else { g.strokeStyle = b.dcol; g.lineWidth = b.dsw; g.stroke(); } break; }
      case 'triangle': g.fillStyle = b.dcol; g.beginPath(); g.moveTo(a, Y(c)); g.lineTo(d, Y(e)); g.lineTo(f, Y(h)); g.fill(); break;
    }
  }
}

const procOf = (W, b) => { if (!b.proc || b.procV !== b.cfgV) { b.proc = new (LProcC || (LProcC = makeLProc()))(W, b); b.procV = b.cfgV; } return b.proc; };
const inRange = (b, t) => { const B = b.B, cx = b.x + B.s / 2, cy = b.y + B.s / 2, tx = t.x + t.B.s / 2, ty = t.y + t.B.s / 2; return Math.hypot(cx - tx, cy - ty) * TS <= B.range + t.B.s * TS / 2; };

FW.reg('lproc', {
  mindustry: /^(LogicBlock)$/,
  convert: (j, h) => ({ ipt: +(j.instructionsPerTick || 2), range: +(j.range || 8 * 10), ...(h && h.inL ? { inL: h.inL, lcap: 10 } : {}) }),
  init(W, b) { if (!b.cfg || typeof b.cfg !== 'object') b.cfg = { code: '', links: [] }; b.cfgV = 1; },
  update(W, b) {
    if (b.off) return;
    if (b.B.inL) { if (b.lq < b.B.inL[1] || b.lt !== b.B.inL[0]) return; b.lq -= b.B.inL[1]; }
    const p = procOf(W, b); p.run(); b.work = p.code.length ? 1 : 0;
  },
  lqAccept: (W, b, liq) => !!b.B.inL && liq === b.B.inL[0],
  linkTap(W, b, t) {
    if (t === b || t.team !== b.team || !inRange(b, t)) return false;
    const L = b.cfg.links, i = L.findIndex(([, x, y]) => x === t.x && y === t.y);
    if (i >= 0) L.splice(i, 1); else { const base = linkBase(t.t); let k = 1; while (L.some(l => l[0] === base + k)) k++; L.push([base + k, t.x, t.y]); }
    b.cfgV = (b.cfgV || 0) + 1; return true;
  },
  overlay(g, W, b) {
    const B = b.B, cx = (b.x + B.s / 2) * TS, cy = (b.y + B.s / 2) * TS;
    g.strokeStyle = 'rgba(255,211,127,.5)'; g.lineWidth = 1; g.setLineDash([3, 3]); g.beginPath(); g.arc(cx, cy, B.range, 0, 7); g.stroke(); g.setLineDash([]);
    g.font = '5px sans-serif'; g.textAlign = 'center';
    for (const [n, x, y] of b.cfg.links || []) { const t = W.tb(x, y); if (!t) continue; const tx = (t.x + t.B.s / 2) * TS, ty = (t.y + t.B.s / 2) * TS; g.strokeStyle = '#ffd37f'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(tx, ty); g.stroke(); g.strokeRect(t.x * TS, t.y * TS, t.B.s * TS, t.B.s * TS); g.fillStyle = '#ffd37f'; g.fillText(n, tx, ty - t.B.s * TS / 2 - 1); }
  },
  sel(W, b) { const L = b.cfg.links || []; return `<div class="lg" style="font-size:14px">${L.length ? L.map(l => esc(l[0])).join(' · ') : 'Nincs link'}</div><button class="np-button" data-fw="code" style="width:100%;margin-top:4px">Kód szerkesztése</button>`; },
  selClick(W, b, el, api) {
    if (el.dataset.fw !== 'code') return;
    api.editText('Processzor kódja', b.cfg.code || '', v => { b.cfg.code = v.slice(0, 20000); b.cfgV = (b.cfgV || 0) + 1; }, true);
  },
  info: B => [`Utasítás körönként: <b>${B.ipt}</b>`, `Hatótáv: <b>${(B.range / TS).toFixed(1)} mező</b>`],
});
FW.reg('lmem', {
  mindustry: /^(MemoryBlock)$/,
  convert: j => ({ cap: +(j.memoryCapacity || 32) }),
  init(W, b) { if (!Array.isArray(b.cfg) || b.cfg.length !== b.B.cap) b.cfg = new Array(b.B.cap).fill(0); },
  info: B => [`Kapacitás: <b>${B.cap}</b> szám`],
});
FW.reg('ldisp', {
  mindustry: /^(LogicDisplay|TileableLogicDisplay)$/,
  convert: j => ({ res: +(j.displaySize || 80) }),
  draw(g, b, d) {
    d.spr(g, d.n, d.cx, d.cy);
    if (b.dc) { const ins = d.s * (1 - b.B.res / (b.B.s * 32)) / 2; g.imageSmoothingEnabled = false; g.drawImage(b.dc.canvas, d.x + ins, d.y + ins, d.s - ins * 2, d.s - ins * 2); }
  },
  info: B => [`Felbontás: <b>${B.res}×${B.res}</b>`],
});
FW.reg('lswitch', {
  mindustry: /^(SwitchBlock)$/,
  init(W, b) { b.cfg = b.cfg ? 1 : 0; },
  tap(W, b) { if (b.team !== W.player?.team && b.team !== 1) return false; b.cfg = b.cfg ? 0 : 1; return true; },
  draw(g, b, d) { d.spr(g, b.cfg && d.has(d.n + '-on') ? d.n + '-on' : d.n, d.cx, d.cy); },
  sel: (W, b) => `<button class="np-button" data-fw="sw" style="width:100%">${b.cfg ? 'Bekapcsolva' : 'Kikapcsolva'}</button>`,
  selClick(W, b, el) { if (el.dataset.fw === 'sw') b.cfg = b.cfg ? 0 : 1; },
});
FW.reg('lmsg', {
  mindustry: /^(MessageBlock)$/,
  init(W, b) { if (!b.cfg || typeof b.cfg !== 'object') b.cfg = { text: '' }; },
  sel: (W, b) => `<div style="white-space:pre-wrap;font-size:14px;max-height:120px;overflow:auto">${esc(b.cfg.text || '') || '<span class="lg">Üres</span>'}</div><button class="np-button" data-fw="msg" style="width:100%;margin-top:4px">Szöveg szerkesztése</button>`,
  selClick(W, b, el, api) { if (el.dataset.fw === 'msg') api.editText('Üzenet', b.cfg.text || '', v => { b.cfg = { text: v.slice(0, 400) }; }); },
});
// vászon: festhető kép (a Mindustry CanvasBlock-ja: blokkonként 12×12 képpont, 8 szín)
const CPAL = ['#362944', '#c45d9f', '#e39aac', '#f0dab1', '#6461c2', '#2ba9b4', '#93d4b5', '#f0f6e8'];
FW.reg('lcanvas', {
  mindustry: /^(CanvasBlock)$/,
  convert: j => ({ res: +(j.canvasSize || 12) * (+(j.size || 1)) }),
  init(W, b) { const n = b.B.res * b.B.res; if (!Array.isArray(b.cfg) || b.cfg.length !== n) b.cfg = new Array(n).fill(0); b.cv = null; },
  draw(g, b, d) {
    const R = b.B.res; if (!b.cv || b.cvV !== b.cfg) { const c = document.createElement('canvas'); c.width = c.height = R; const x = c.getContext('2d'); for (let i = 0; i < R * R; i++) { x.fillStyle = CPAL[b.cfg[i]] || CPAL[0]; x.fillRect(i % R, i / R | 0, 1, 1); } b.cv = c; b.cvV = b.cfg; }
    g.imageSmoothingEnabled = false; g.drawImage(b.cv, d.x, d.y, d.s, d.s);
  },
  sel: () => `<button class="np-button" data-fw="paint" style="width:100%">Festés</button>`,
  selClick(W, b, el, api) { if (el.dataset.fw === 'paint') api.editPixels('Vászon', b.B.res, b.B.res, b.cfg, CPAL, d => { b.cfg = d; }); },
});
FW.parts.push('Logikai processzorok (mlog)', 'Memória', 'Kijelzők', 'Kapcsoló', 'Üzenetblokk', 'Vászon');

/* ================= alapjáték-tartalom: a Serpulo logikai blokkjai ================= */
const LOGIC = [
  ['micro-processor', 'Mikroprocesszor', 1, { copper: 90, lead: 50, silicon: 50 }, 'lproc', { ipt: 2, range: 8 * 10 }, 'gpress'],
  ['logic-processor', 'Logikai processzor', 2, { lead: 320, silicon: 80, graphite: 60, thorium: 50 }, 'lproc', { ipt: 8, range: 8 * 22 }, 'micro-processor'],
  ['hyper-processor', 'Hiperprocesszor', 3, { lead: 450, silicon: 150, thorium: 75, surge: 50 }, 'lproc', { ipt: 25, range: 8 * 42, inL: ['cryo', .08], lcap: 10 }, 'logic-processor'],
  ['switch', 'Kapcsoló', 1, { graphite: 5, copper: 5 }, 'lswitch', {}, 'micro-processor'],
  ['message', 'Üzenet', 1, { graphite: 5, copper: 5 }, 'lmsg', {}, 'switch'],
  ['logic-display', 'Logikai kijelző', 3, { lead: 100, silicon: 50, metaglass: 50 }, 'ldisp', { res: 80 }, 'message'],
  ['large-logic-display', 'Nagy logikai kijelző', 6, { lead: 200, silicon: 150, metaglass: 100, phase: 75 }, 'ldisp', { res: 176 }, 'logic-display'],
  ['memory-cell', 'Memóriacella', 1, { graphite: 30, silicon: 30, copper: 30 }, 'lmem', { cap: 64 }, 'message'],
  ['memory-bank', 'Memóriabank', 2, { graphite: 80, silicon: 80, phase: 30, copper: 30 }, 'lmem', { cap: 512 }, 'memory-cell'],
];
let installed = false;
export async function installFramework() {
  if (installed) return; installed = true;
  ({ Proc } = await import('./logika.js?v=202611270939'));
  if (!CATS.some(c => c[0] === 'logic')) CATS.push(['logic', 'Logika', '▤']);
  BUILD_ORDER.logic = BUILD_ORDER.logic || [];
  const fix = c => Object.fromEntries(Object.entries(c).filter(([k]) => ITEMS[k]));
  for (const [id, n, s, cost, type, o, req] of LOGIC) {
    BLOCKS[id] = { n, kat: 'logic', s, hp: 40 * s * s, cost: fix(cost), type, fw: 1, ...o }; SN[id] = id; BUILD_ORDER.logic.push(id);
    if (!TECH.some(t => t.id === id)) TECH.push({ id, k: 'b', key: id, req: BLOCKS[req] ? req : 'core', cost: rcost(fix(cost)) });
  }
  await Promise.all([...LOGIC.map(l => l[0]), 'switch-on'].map(nm => fetch('kepek/keret/' + nm + '.png').then(r => r.ok ? r.arrayBuffer() : null).then(buf => buf && addSprite(nm, new Uint8Array(buf))).catch(() => {})));
}

// a beépített modok saját kiegészítői (modok/kiegeszitok/<fájl>.js): FW.reg-gel új fajtákat adnak,
// patch(mod, h) a mod betöltése után fut
export async function loadAddon(file, v) {
  try { const A = await import('./modok/kiegeszitok/' + file + (v ? '?v=' + v : '')); if (A.types) A.types(FW); FW.addons.push(file); return A; }
  catch (e) { console.warn('kiegészítő', file, e); return null; }
}
