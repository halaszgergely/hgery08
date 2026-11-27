// Kohóvár böngészős modkeret: bővítési pontok a motorhoz (új blokkfajták), a Mindustry-modok által
// elvárt, de a Kohóvárból hiányzó rendszerek (logikai processzorok, memória, kijelző, kapcsoló, üzenet),
// és a beépített modok saját kiegészítőinek betöltése. Mindig aktív.
import { TS, ITEMS, LIQUIDS, BLOCKS, UNITS, BUILD_ORDER, TECH, CATS, rcost } from './adat.js?v=202611271349';
import { SN, ISN } from './kepadat.js?v=202611271349';
import { addSprite, drawUnit, spr } from './rajz.js?v=202611271349';
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
  // nem négyzetes blokkok (Mindustry-modok MultiBlock-ja): a fő négyzet + B.xlinks mezők (Mindustry-eltolások, y felfelé, forgatással)
  extra(B, x, y, rot = 0) {
    if (!B.xlinks) return []; const s = B.s, off = (s - 1) >> 1, sh = (s + 1) % 2, cx = x + off, cy = y + (s - 1 - off), out = [];
    for (const [px, py] of B.xlinks) { const [rx, ry] = [[px, py], [-py + sh, px], [-px + sh, -py + sh], [py, -px + sh]][rot & 3]; out.push([cx + rx, cy - ry]); }
    return out;
  },
  rect(B, x, y, rot) { let x0 = x, y0 = y, x1 = x + B.s, y1 = y + B.s; for (const [tx, ty] of this.extra(B, x, y, rot)) { x0 = Math.min(x0, tx); y0 = Math.min(y0, ty); x1 = Math.max(x1, tx + 1); y1 = Math.max(y1, ty + 1); } return { x0, y0, x1, y1 }; },
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
      case 'ucontrol': {
        const u = this.unit; if (!u || u.dead || !(u.U.payS > 0) || (a !== 'payTake' && a !== 'payDrop')) break;
        const tx = Math.floor(u.x / TS), ty = Math.floor(u.y / TS), o = W.inb(tx, ty) ? W.tb(tx, ty) : null;
        if (a === 'payTake' && !u.carryB && !u.carry) { u.lc = W.tick;
          if (o && o.pl && o.pl.b && o.team === u.team) { u.carryB = o.pl; o.pl = null; return; }
          if (o && o.team === u.team && o !== W.core && o.B.type !== 'core' && o.B.s <= u.U.payS && this.num(b)) { u.carryB = { b: o.t, rot: o.rot }; W.remB(o); W.ver++; return; }
        }
        if (a === 'payDrop' && u.carryB) { u.lc = W.tick; const FT = o && FW.types[o.B.type]; if (FT && FT.payAccept && FT.payAccept(W, o, u.carryB, null)) { u.carryB = null; return; }
          const s = BLOCKS[u.carryB.b].s, of = (s - 1) >> 1; if (W.canPlace(u.carryB.b, tx - of, ty - of, u.carryB.rot || 0)) { W.addB(u.carryB.b, tx - of, ty - of, u.carryB.rot || 0, null, u.team); W.ver++; u.carryB = null; } return; }
        break;
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
    const R = b.B.res; if (!Array.isArray(b.cfg)) { if (d.has(d.n)) d.spr(g, d.n, d.cx, d.cy); else { g.fillStyle = CPAL[0]; g.fillRect(d.x, d.y, d.s, d.s); } return; }
    if (!b.cv || b.cvV !== b.cfg) { const c = document.createElement('canvas'); c.width = c.height = R; const x = c.getContext('2d'); for (let i = 0; i < R * R; i++) { x.fillStyle = CPAL[b.cfg[i]] || CPAL[0]; x.fillRect(i % R, i / R | 0, 1, 1); } b.cv = c; b.cvV = b.cfg; }
    g.imageSmoothingEnabled = false; g.drawImage(b.cv, d.x, d.y, d.s, d.s);
  },
  sel: () => `<button class="np-button" data-fw="paint" style="width:100%">Festés</button>`,
  selClick(W, b, el, api) { if (el.dataset.fw === 'paint') api.editPixels('Vászon', b.B.res, b.B.res, b.cfg, CPAL, d => { b.cfg = d; }); },
});
FW.parts.push('Logikai processzorok (mlog)', 'Memória', 'Kijelzők', 'Kapcsoló', 'Üzenetblokk', 'Vászon');


/* ================= rakomány (payload): egységek és blokkok szállítása ================= */
// rakomány: { u: egységtípus } vagy { b: blokkazonosító }
const payCost = p => p.u ? (UNITS[p.u] && (UNITS[p.u].cost || {})) || {} : (BLOCKS[p.b] && BLOCKS[p.b].cost) || {};
const payFits = (B, p) => p.u ? (UNITS[p.u] ? UNITS[p.u].r * 2 / TS : 1) <= (B.maxPay || 99) : (BLOCKS[p.b] ? BLOCKS[p.b].s : 1) <= (B.maxPay || 99);
// rakomány továbbadása a blokk elé: rakománytovábbító / átépítő / (egységnél) kiengedés a szabadba
FW.pushPay = (W, b, p, dir = b.rot) => {
  const fb = W.front(b, dir);
  if (fb && !fb.dead) {
    const FT = FW.types[fb.B.type]; if (FT && FT.payAccept) return !!FT.payAccept(W, fb, p, b);
    if (p.u && fb.B.type === 'recon' && fb.B.up[p.u] && W.canUnit(fb.B.up[p.u]) && !fb.pay) { fb.pay = p.u; fb.prog = 0; return true; }
    return false;
  }
  if (p.u) { const r0 = b.rot; b.rot = dir; W.outUnit(b, p.u); b.rot = r0; return true; }
  return false;
};
const drawPay = (g, p, x, y, a, team) => { if (!p) return; if (p.u) drawUnit(g, p.u, team, x, y, a, 0); else if (p.b) { g.fillStyle = 'rgba(0,0,0,.35)'; const s = BLOCKS[p.b].s * TS; g.fillRect(x - s / 2, y - s / 2, s, s); FW.sprBlock && FW.sprBlock(g, p.b, x, y); } };
FW.sprBlock = (g, id, x, y) => spr(g, SN[id] || id, x, y);
FW.sprItem = (g, it, x, y, s) => spr(g, 'item-' + (ISN[it] || it), x, y, 0, null, null, s, s);
const payTxt = p => !p ? '<span class="lg">Üres</span>' : esc(p.u ? UNITS[p.u].n : BLOCKS[p.b].n);

// rakomány-szállítószalag / -elosztó
const pconv = router => ({
  mindustry: router ? /^(PayloadRouter)$/ : /^(PayloadConveyor)$/,
  convert: j => ({ s: +(j.size || 3), rot: 1, mt: +(j.moveTime || 45), maxPay: +(j.size || 3) }),
  init(W, b) { b.pl = null; b.pp = 0; b.od = b.rot; },
  payAccept(W, b, p, src) { if (b.pl || !payFits(b.B, p)) return false; if (src && W.front(b) === src && !router) return false; b.pl = p; b.pp = 0; b.from = src ? src.i : -1; return true; },
  update(W, b, ts) {
    if (!b.pl) { b.work = 0; return; }
    b.pp = Math.min(1, b.pp + ts / b.B.mt); b.work = 1;
    if (b.pp < 1) return;
    if (router) { for (let k = 0; k < 4; k++) { const d = (b.od + k) & 3, f = W.front(b, d); if (f && f.i === b.from) continue; if (FW.pushPay(W, b, b.pl, d)) { b.pl = null; b.od = (d + 1) & 3; return; } } }
    else if (FW.pushPay(W, b, b.pl)) b.pl = null;
  },
  draw(g, b, d) { d.spr(g, d.n, d.cx, d.cy, router ? 0 : b.rot * Math.PI / 2); if (d.has(d.n + '-top')) d.spr(g, d.n + '-top', d.cx, d.cy, router ? 0 : b.rot * Math.PI / 2); if (b.pl) { const k = (b.pp - .5) * d.s; drawPay(g, b.pl, d.cx + DX[b.rot] * (router ? 0 : k), d.cy + DY[b.rot] * (router ? 0 : k), b.rot * Math.PI / 2 + Math.PI / 2, b.team); } },
  sel: (W, b) => `<div style="font-size:14px">Rakomány: ${payTxt(b.pl)}</div>`,
  info: B => [`Szállítási idő: <b>${(B.mt / 60).toFixed(2)} mp</b>`, `Legnagyobb rakomány: <b>${B.maxPay}×${B.maxPay}</b>`],
});
FW.reg('pconv', pconv(false));
FW.reg('prouter', pconv(true));

// rakomány-tömegszállító: a linkelt párjának küldi a rakományt
FW.reg('pdriver', {
  mindustry: /^(PayloadMassDriver)$/,
  convert: (j, h) => ({ s: +(j.size || 3), range: +(j.range || 440), reload: +(j.reload || 130), maxPay: +(j.maxPayloadSize || 3), power: h.power || 1 }),
  init(W, b) { b.pl = null; b.rl = 0; if (!Array.isArray(b.cfg)) b.cfg = null; },
  payAccept(W, b, p) { if (b.pl || !payFits(b.B, p)) return false; b.pl = p; return true; },
  update(W, b, ts) {
    b.pneed = b.B.power; b.rl = Math.min(b.B.reload, b.rl + ts * (b.ps || 0)); b.work = b.pl ? 1 : 0; if (!b.pl) return;
    const t = b.cfg ? W.tb(b.cfg[0], b.cfg[1]) : null;
    if (t && !t.dead && t.B.type === 'pdriver' && t !== b) { if (b.rl >= b.B.reload && !t.pl) { t.pl = b.pl; b.pl = null; b.rl = 0; const a = FW.center(b), c = FW.center(t); W.fx.push({ k: 'laser', x: a.x, y: a.y, x2: c.x, y2: c.y, c: '#ffd37f', life: 12, max: 12, w: 2 }); } }
    else for (let d = 0; d < 4; d++) if (FW.pushPay(W, b, b.pl, d)) { b.pl = null; break; }
  },
  linkTap(W, b, t) { if (t.B.type !== 'pdriver' || t === b) return false; const a = FW.center(b), c = FW.center(t); if (Math.hypot(a.x - c.x, a.y - c.y) > b.B.range) return false; b.cfg = b.cfg && b.cfg[0] === t.x && b.cfg[1] === t.y ? null : [t.x, t.y]; return true; },
  overlay(g, W, b) { const a = FW.center(b); g.strokeStyle = 'rgba(255,211,127,.5)'; g.beginPath(); g.arc(a.x, a.y, b.B.range, 0, 7); g.stroke(); const t = b.cfg && W.tb(b.cfg[0], b.cfg[1]); if (t) { const c = FW.center(t); g.strokeStyle = '#ffd37f'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(c.x, c.y); g.stroke(); } },
  draw(g, b, d) { d.spr(g, d.has(d.n + '-base') ? d.n + '-base' : d.n, d.cx, d.cy); if (d.has(d.n + '-top')) d.spr(g, d.n + '-top', d.cx, d.cy); if (b.pl) drawPay(g, b.pl, d.cx, d.cy, -Math.PI / 2, b.team); },
  sel: (W, b) => `<div style="font-size:14px">Rakomány: ${payTxt(b.pl)}</div>`,
  info: B => [`Hatótáv: <b>${(B.range / TS).toFixed(1)} mező</b>`],
});

// rakománybontó: a rakományt (egység/blokk) visszabontja anyagra, és kiadja
FW.reg('pdecon', {
  mindustry: /^(PayloadDeconstructor)$/,
  convert: (j, h) => ({ s: +(j.size || 3), sp: +(j.deconstructSpeed || 1), maxPay: +(j.maxPayloadSize || 4), power: h.power || 0, icap: 1e9 }),
  init(W, b) { b.pl = null; b.prog = 0; },
  payAccept(W, b, p) { if (b.pl || !payFits(b.B, p)) return false; b.pl = p; b.prog = 0; return true; },
  update(W, b, ts) {
    if (b.pl) { b.pneed = b.B.power; const cost = payCost(b.pl), tot = Math.max(1, Object.values(cost).reduce((s, x) => s + x, 0)); b.prog += ts * (b.B.power ? b.ps || 0 : 1) * b.B.sp * 2 / tot; b.work = 1;
      if (b.prog >= 1) { for (const k in cost) b.items[k] = (b.items[k] || 0) + cost[k]; b.pl = null; b.prog = 0; } }
    else b.work = 0;
    if (Object.keys(b.items).some(k => b.items[k] > 0)) W.dump(b);
  },
  draw(g, b, d) { d.spr(g, d.n, d.cx, d.cy); if (b.pl) { g.globalAlpha = 1 - b.prog * .8; drawPay(g, b.pl, d.cx, d.cy, -Math.PI / 2, b.team); g.globalAlpha = 1; } if (d.has(d.n + '-top')) d.spr(g, d.n + '-top', d.cx, d.cy); },
  sel: (W, b) => `<div style="font-size:14px">Bontás: ${payTxt(b.pl)} ${b.pl ? Math.round(b.prog * 100) + '%' : ''}</div>`,
  info: () => ['A beérkező rakományt anyagra bontja'],
});

// blokkgyártó: a kiválasztott blokkot rakományként legyártja (a kész blokk továbbítható, bontható)
FW.reg('pcons', {
  mindustry: /^(Constructor)$/, partial: 'a kész blokk csak szállítható és bontható, lerakni nem lehet',
  convert: (j, h) => ({ s: +(j.size || 3), rot: 1, sp: +(j.buildSpeed || .4), minS: +(j.minBlockSize || 1), maxS: +(j.maxBlockSize || 2), power: h.power || 0, icap: 400 }),
  init(W, b) { b.pl = null; b.prog = 0; },
  accept(W, b, it) { const c = b.cfg && BLOCKS[b.cfg] ? BLOCKS[b.cfg].cost : null; if (!c || !c[it] || (b.items[it] || 0) >= c[it] * 2) return false; b.items[it] = (b.items[it] || 0) + 1; return true; },
  update(W, b, ts) {
    if (b.pl) { b.work = 0; if (FW.pushPay(W, b, b.pl)) b.pl = null; return; }
    const B = BLOCKS[b.cfg]; if (!B) { b.work = 0; return; }
    for (const k in B.cost) if ((b.items[k] || 0) < B.cost[k]) { b.work = 0; return; }
    b.pneed = b.B.power; const tot = Math.max(1, Object.values(B.cost).reduce((s, x) => s + x, 0));
    b.prog += ts * (b.B.power ? b.ps || 0 : 1) * b.B.sp * 3 / tot; b.work = 1;
    if (b.prog >= 1) { for (const k in B.cost) b.items[k] -= B.cost[k]; b.pl = { b: b.cfg }; b.prog = 0; }
  },
  draw(g, b, d) { d.spr(g, d.n, d.cx, d.cy); if (b.pl) drawPay(g, b.pl, d.cx, d.cy, 0, b.team); else if (b.cfg && b.prog > 0) { g.globalAlpha = b.prog * .7; drawPay(g, { b: b.cfg }, d.cx, d.cy, 0, b.team); g.globalAlpha = 1; } if (d.has(d.n + '-top')) d.spr(g, d.n + '-top', d.cx, d.cy, b.rot * Math.PI / 2); },
  sel(W, b) { const L = Object.keys(BLOCKS).filter(k => { const B = BLOCKS[k]; return B.s >= b.B.minS && B.s <= b.B.maxS && B.type !== 'core' && Object.keys(B.cost).length && W.canBuild?.(k) !== false && FW.done?.(k) !== false; }).slice(0, 60);
    return `<div style="font-size:14px">Gyárt: ${b.cfg && BLOCKS[b.cfg] ? esc(BLOCKS[b.cfg].n) + ' ' + Math.round(b.prog * 100) + '%' : '<span class="lg">válassz</span>'}</div><div class="ipick">${L.map(k => `<button class="${b.cfg === k ? 'on' : ''}" data-fw="b:${k}" title="${esc(BLOCKS[k].n)}"><img src="${FW.blockIcon ? FW.blockIcon(k) : ''}" style="width:24px;height:24px;image-rendering:pixelated"></button>`).join('')}</div>`; },
  selClick(W, b, el) { const v = el.dataset.fw; if (v && v.startsWith('b:')) { b.cfg = v.slice(2) === b.cfg ? null : v.slice(2); b.prog = 0; } },
  info: B => [`Blokkméret: <b>${B.minS}–${B.maxS}</b>`],
});

// teherdrónok: a rakodóállomás a kirakodópontokra viszi az anyagot (a kirakodópont anyaga beállítható)
FW.reg('cargoload', {
  mindustry: /^(UnitCargoLoader)$/,
  convert: (j, h) => ({ icap: +(j.itemCapacity || 200), trip: 20, power: h.power || 0 }),
  init(W, b) { b.cd = 0; },
  accept(W, b, it) { const n = Object.values(b.items).reduce((s, x) => s + x, 0); if (n >= b.B.icap) return false; b.items[it] = (b.items[it] || 0) + 1; return true; },
  update(W, b, ts) {
    b.pneed = b.B.power; if (b.B.power && (b.ps || 0) < .3) { b.work = 0; return; }
    if ((b.cd -= ts) > 0) return; b.cd = 30;
    const pts = W.blds.filter(o => !o.dead && o.team === b.team && o.B.type === 'cargoun'), a = FW.center(b); b.work = 0;
    for (const it of Object.keys(b.items)) { if (b.items[it] <= 0) continue;
      const t = pts.filter(o => (o.cfg === it || o.cfg == null) && Object.values(o.items).reduce((s, x) => s + x, 0) < o.B.icap).sort((p, q) => Math.hypot(FW.center(p).x - a.x, FW.center(p).y - a.y) - Math.hypot(FW.center(q).x - a.x, FW.center(q).y - a.y))[0];
      if (!t) continue; const n = Math.min(b.items[it], b.B.trip, t.B.icap - Object.values(t.items).reduce((s, x) => s + x, 0)); if (n <= 0) continue;
      b.items[it] -= n; t.items[it] = (t.items[it] || 0) + n; b.work = 1; const c = FW.center(t); W.fx.push({ k: 'xfer', x: a.x, y: a.y, x2: c.x, y2: c.y, c: ITEMS[it].c, life: 30, max: 30 }); break; }
  },
  info: () => ['Teherdrónokkal a kirakodópontokra szállítja az anyagot'],
});
FW.reg('cargoun', {
  mindustry: /^(UnitCargoUnloadPoint)$/,
  convert: j => ({ icap: +(j.itemCapacity || 100), cfg: 'item' }),
  update(W, b) { if (Object.values(b.items).some(x => x > 0)) W.dump(b); },
  info: () => ['A teherdrónok ide hozzák a beállított anyagot'],
});
FW.parts.push('Rakomány (szállítószalag, elosztó, tömegszállító, bontó, blokkgyártó)', 'Teherdrónok');

// mechváltó pad (régi Mindustry MechPad): a közelben álló játékos a pad mechjére vált
FW.reg('mechpad', {
  mindustry: /^(MechPad)$/,
  convert: (j, h) => ({ mech: j.mech || null, power: h.power || 0 }),
  update(W, b) { b.pneed = b.B.power; b.work = b.ps || (b.B.power ? 0 : 1); },
  tap(W, b) {
    const p = W.player, mk = b.B.mech && (UNITS[b.B.mod + '-' + b.B.mech] ? b.B.mod + '-' + b.B.mech : UNITS[b.B.mech] ? b.B.mech : null), c = FW.center(b);
    if (!p || p.dead || !mk || b.team !== p.team || Math.hypot(p.x - c.x, p.y - c.y) > b.B.s * TS * 1.5 || (b.B.power && (b.ps || 0) < .5)) return false;
    if (p.t === mk) mk && (p.t = W.core.B.unit); else p.t = mk;
    p.U = UNITS[p.t]; p.hp = p.U.hp; p.wc = p.U.w.map(() => 0); W.fx.push({ k: 'ring', x: p.x, y: p.y, r: 16, life: 30, max: 30, c: '#ffd37f' }); return true;
  },
  info: B => [B.mech ? 'A játékos a pad mechjére válthat (újra koppintva vissza)' : ''],
});
FW.parts.push('Mechváltó pad');

// összeszerelő-modul: a szomszédos egységösszeszerelőt (a Kohóvárban gyárként működik) gyorsítja
FW.reg('asmmod', {
  mindustry: /^(UnitAssemblerModule)$/, partial: 'egyszerűsítve: a szomszédos összeszerelőt gyorsítja (+50%), szintet nem emel',
  convert: (j, h) => ({ power: h.power || 0, rot: 1 }),
  update(W, b) { b.pneed = b.B.power; const on = !b.B.power || (b.ps || 0) > .5; b.work = on ? 1 : 0; if (!on) return; for (const t of FW.adj(W, b)) if (t.B.type === 'factory') { t.odT = W.tick + 2; t.odM = Math.max(t.odT > W.tick && t.odM > 1 ? t.odM : 1, 1.5); } },
});

// leszállóállás (Erekir LandingPad): a raktárból (más szektorokból kilőtt anyag) fogadja a beállított anyagot
FW.reg('landpad', {
  mindustry: /^(LandingPad)$/,
  convert: (j, h) => ({ cfg: 'item', icap: +(j.itemCapacity || 100), time: +(j.arrivalDuration || 150) + 120, power: h.power || 0 }),
  init(W, b) { b.prog = 0; },
  update(W, b, ts) {
    b.pneed = b.B.power; const it = b.cfg, n = Object.values(b.items).reduce((s, x) => s + x, 0);
    if (it && n === 0 && W.onLand) { b.prog += ts * (b.B.power ? b.ps || 0 : 1); b.work = 1; if (b.prog >= b.B.time) { b.prog = 0; const got = W.onLand(it, b.B.icap); if (got > 0) { b.items[it] = got; const c = FW.center(b); W.fx.push({ k: 'launch', x: c.x, y: c.y, life: 60, max: 60, c: ITEMS[it].c }); } } }
    else b.work = 0;
    if (n > 0) W.dump(b);
  },
  sel: (W, b) => `<div class="mbar"><i style="width:${Math.min(1, (b.prog || 0) / b.B.time) * 100}%;background:#ffd37f"></i><span>Érkezés ${Math.round(Math.min(1, (b.prog || 0) / b.B.time) * 100)}%</span></div>`,
  info: B => ['A raktárból (a más szektorokból kilőtt anyagból) fogadja a beállított anyagot', `Szállítmány: <b>${B.icap}</b> db`],
});
FW.parts.push('Leszállóállás');

/* ----- blokkrakomány lerakása szállítóegységgel (mega, quad, oct, modok payloadCapacity-vel) ----- */
const carriers = (W, team, s) => W.units.filter(u => !u.dead && u.team === team && u !== W.player && (u.U.payS || 0) >= s && !u.carryB && !u.fwJob);
FW.dropFrom = null;
FW.tick = W => {
  const J = W.fwJobs || (W.fwJobs = []);
  for (let i = J.length - 1; i >= 0; i--) {
    const j = J[i], u = j.u; if (u.dead) { J.splice(i, 1); continue; }
    u.lc = W.tick; u.fwJob = j;
    if (j.st === 'go') { const c = FW.center(j.src); u.lmove = { x: c.x, y: c.y, r: 4 }; if (Math.hypot(u.x - c.x, u.y - c.y) < 10) { if (j.src.dead || !j.src.pl || !j.src.pl.b) { J.splice(i, 1); u.fwJob = null; u.lc = null; continue; } u.carryB = j.src.pl; j.src.pl = null; j.st = 'carry'; } }
    else { const s = BLOCKS[u.carryB.b].s, o = (s - 1) >> 1, x = (j.tx - o + s / 2) * TS, y = (j.ty - o + s / 2) * TS; u.lmove = { x, y, r: 3 };
      if (Math.hypot(u.x - x, u.y - y) < 8) { if (W.canPlace(u.carryB.b, j.tx - o, j.ty - o, u.carryB.rot || 0)) { W.addB(u.carryB.b, j.tx - o, j.ty - o, u.carryB.rot || 0, null, u.team); W.ver++; u.carryB = null; } else W.msg('A célhely foglalt'); J.splice(i, 1); u.fwJob = null; u.lc = null; } }
  }
};
FW.drawCarry = (g, u) => { if (u.carryB) drawPay(g, u.carryB, u.x, u.y + 2, 0, u.team); };
const dropSel = (W, b) => b.pl && b.pl.b ? `<button class="np-button" data-fw="drop" style="width:100%;margin-top:4px">${FW.dropFrom === b ? 'Célpont kijelölése…' : 'Lerakás'}</button>` : '';
const dropClick = (W, b, el) => { if (el.dataset.fw !== 'drop' || !b.pl || !b.pl.b) return false; if (!carriers(W, b.team, BLOCKS[b.pl.b].s).length) { W.msg('Nincs szabad szállítóegység'); return true; } FW.dropFrom = FW.dropFrom === b ? null : b; return true; };
const dropTap = (W, b, tx, ty) => { if (FW.dropFrom !== b || !b.pl || !b.pl.b) return false; const L = carriers(W, b.team, BLOCKS[b.pl.b].s), c = FW.center(b); if (!L.length) { W.msg('Nincs szabad szállítóegység'); return true; } L.sort((p, q) => Math.hypot(p.x - c.x, p.y - c.y) - Math.hypot(q.x - c.x, q.y - c.y)); (W.fwJobs || (W.fwJobs = [])).push({ u: L[0], src: b, tx, ty, st: 'go' }); FW.dropFrom = null; return true; };
for (const n of ['pconv', 'prouter', 'pdriver', 'pcons']) { const T = FW.types[n], s0 = T.sel, c0 = T.selClick; T.sel = (W, b) => (s0 ? s0(W, b) : '') + dropSel(W, b); T.selClick = (W, b, el, api) => { if (!dropClick(W, b, el) && c0) c0(W, b, el, api); }; T.pointTap = dropTap; }

// bolygóközi gyorsító (Accelerator): feltöltve és árammal a magot egy másik bolygóra lövi
FW.reg('accel', {
  mindustry: /^(Accelerator)$/,
  convert: (j, h) => ({ launch: j.launchBlock || null, power: h.power || 10, icap: 1e9 }),
  init(W, b) { b.prog = 0; },
  need(b) { const lb = b.B.launch && (BLOCKS[b.B.mod + '-' + b.B.launch] || BLOCKS[b.B.launch]); const c = lb ? lb.cost : b.B.cost; const o = {}; for (const k in c) o[k] = Math.ceil(c[k] * (lb ? 1 : .5)); return o; },
  accept(W, b, it) { const n = FW.types.accel.need(b); if (!n[it] || (b.items[it] || 0) >= n[it]) return false; b.items[it] = (b.items[it] || 0) + 1; return true; },
  update(W, b, ts) { const n = FW.types.accel.need(b); let have = 0, tot = 0; for (const k in n) { have += Math.min(n[k], b.items[k] || 0); tot += n[k]; } b.fill = tot ? have / tot : 1; b.pneed = b.B.power; b.prog = b.fill >= 1 ? Math.min(1, b.prog + ts * (b.B.power ? b.ps || 0 : 1) / 600) : 0; b.work = b.prog; },
  sel: (W, b) => `<div class="mbar"><i style="width:${(b.fill || 0) * 100}%;background:#ffd37f"></i><span>Anyag ${Math.round((b.fill || 0) * 100)}%</span></div><div class="mbar"><i style="width:${(b.prog || 0) * 100}%;background:#a08cff"></i><span>Töltés ${Math.round((b.prog || 0) * 100)}%</span></div>${b.prog >= 1 ? '<button class="np-button" data-fw="launch" style="width:100%;margin-top:4px">Kilövés</button>' : ''}`,
  selClick(W, b, el) { if (el.dataset.fw !== 'launch' || b.prog < 1 || !W.onAccel) return; b.items = {}; b.prog = 0; W.onAccel(b); },
  info: () => ['A magot egy másik bolygóra lövi; ott új szektor választható'],
});
FW.parts.push('Bolygóközi gyorsító');

/* ================= alapjáték-tartalom: a Serpulo logikai blokkjai ================= */
const LOGIC = [
  ['micro-processor', 'Micro Processor', 1, { copper: 90, lead: 50, silicon: 50 }, 'lproc', { ipt: 2, range: 8 * 10 }, 'gpress'],
  ['logic-processor', 'Logic Processor', 2, { lead: 320, silicon: 80, graphite: 60, thorium: 50 }, 'lproc', { ipt: 8, range: 8 * 22 }, 'micro-processor'],
  ['hyper-processor', 'Hyper Processor', 3, { lead: 450, silicon: 150, thorium: 75, surge: 50 }, 'lproc', { ipt: 25, range: 8 * 42, inL: ['cryo', .08], lcap: 10 }, 'logic-processor'],
  ['switch', 'Switch', 1, { graphite: 5, copper: 5 }, 'lswitch', {}, 'micro-processor'],
  ['message', 'Message', 1, { graphite: 5, copper: 5 }, 'lmsg', {}, 'switch'],
  ['logic-display', 'Logic Display', 3, { lead: 100, silicon: 50, metaglass: 50 }, 'ldisp', { res: 80 }, 'message'],
  ['large-logic-display', 'Large Logic Display', 6, { lead: 200, silicon: 150, metaglass: 100, phase: 75 }, 'ldisp', { res: 176 }, 'logic-display'],
  ['memory-cell', 'Memory Cell', 1, { graphite: 30, silicon: 30, copper: 30 }, 'lmem', { cap: 64 }, 'message'],
  ['memory-bank', 'Memory Bank', 2, { graphite: 80, silicon: 80, phase: 30, copper: 30 }, 'lmem', { cap: 512 }, 'memory-cell'],
];
let installed = false;
export async function installFramework() {
  if (installed) return; installed = true;
  for (const [u, s] of [['mega', 2], ['quad', 3], ['oct', 5]]) if (UNITS[u]) UNITS[u].payS = s;   // rakományképesség (blokkméret)
  ({ Proc } = await import('./logika.js?v=202611271349'));
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
