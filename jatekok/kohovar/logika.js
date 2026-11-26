// Kohóvár – a Mindustry-pályák története: célkitűzések (game/MapObjectives) és világprocesszorok (logic/LExecutor, mlog).
// A koordináták a pályafájlban a Mindustry rendszerében vannak (csempe, y felfelé); itt fordítjuk át.
import { TS, ITEMS, BLOCKS, UNITS, STATUS } from './adat.js?v=202611262220';
import { PLAYER, ENEMY, DERELICT } from './vilag.js?v=202611262220';
import { blockOf, itemOf } from './msav.js?v=202611262220';

const TEAM = { derelict: DERELICT, sharded: PLAYER, crux: ENEMY, malis: ENEMY };
const ST = { burning: 'burn', freezing: 'freeze', wet: 'wet', tarred: 'tar', melting: 'melt', sapped: 'sap', overdrive: 'od', fast: 'od', overclock: 'od' };

/* ---------- célkitűzések ---------- */
export class Story {
  constructor(W, m, txt, hooks = {}) {
    this.W = W; this.h = W.h; this.txt = txt || {}; this.hk = hooks; this.msgs = []; this.print = '';
    this.obj = (m.rules.objectives || []).map((o, i) => ({ ...o, i, done: false, t: 0 }));
    this.procs = (W.scripts || []).map(s => new Proc(this, s));
    const st = W.scState; if (st) { for (const i of st.od || []) if (this.obj[i]) this.obj[i].done = true; (st.ot || []).forEach((t, i) => { if (this.obj[i]) this.obj[i].t = t; }); (st.pr || []).forEach((p, i) => this.procs[i] && this.procs[i].restore(p)); }
    W.onSave = () => ({ od: this.obj.filter(o => o.done).map(o => o.i), ot: this.obj.map(o => Math.round(o.t)), pr: this.procs.map(p => p.snap()) });
    W.onTick = () => this.tick();
  }
  L(k) { return k && k[0] === '@' ? (this.txt[k.slice(1)] ?? k.slice(1)) : k || ''; }
  fmt(k, ...a) { return (this.txt[k] || k).replace(/\{(\d)\}/g, (_, n) => a[n] ?? ''); }
  ready(o) { return !o.done && (o.parents || []).every(p => this.obj[p] && this.obj[p].done); }
  check(o) {
    const W = this.W, S = W.stats, it = itemOf(o.item || 'copper') || 'copper';
    switch (o.class) {
      case 'Item': return (W.core.items[it] || 0) >= (o.amount ?? 1);
      case 'CoreItem': return (S.coreIn[it] || 0) >= (o.amount ?? 2);
      case 'BuildCount': return (S.placed[blockOf(o.block || 'conveyor')] || 0) >= (o.count ?? 1);
      case 'UnitCount': return W.countU(o.unit || 'dagger') >= (o.count ?? 1);
      case 'DestroyUnits': return S.kills >= (o.count ?? 1);
      case 'Timer': return (o.t += 1) >= (o.duration ?? 1800);
      case 'DestroyBlock': { const b = this.bAt(o.pos); return !b || b.team !== (TEAM[o.team] ?? ENEMY) || b.t !== blockOf(o.block || 'router'); }
      case 'DestroyBlocks': return this.dbProg(o) >= (o.positions || []).length;
      case 'DestroyCore': return !W.ecores;
      case 'Research': case 'Produce': return this.hk.unlocked ? this.hk.unlocked(o.content || 'copper') : true;
      case 'CommandMode': return !!W.rallied;
      case 'Flag': return W.flags.has(o.flag || 'flag');
    }
    return true;
  }
  bAt(p) { if (!p) return null; const x = p.x | 0, y = this.h - 1 - (p.y | 0); return this.W.tb(x, y); }
  dbProg(o) { const t = TEAM[o.team] ?? ENEMY, bt = blockOf(o.block || 'router'); let n = 0; for (const p of o.positions || []) { const b = this.bAt(p); if (!b || b.team !== t || b.t !== bt) n++; } return n; }
  // a HUD szövege (MapObjective.text)
  text(o) {
    const W = this.W, S = W.stats, ic = this.hk.icon || (() => ''), nm = this.hk.name || (k => k);
    const it = itemOf(o.item || 'copper') || 'copper';
    switch (o.class) {
      case 'Item': return this.fmt('objective.item', W.core.items[it] || 0, o.amount ?? 1, ic('i', it), nm('i', it));
      case 'CoreItem': return this.fmt('objective.coreitem', S.coreIn[it] || 0, o.amount ?? 2, ic('i', it), nm('i', it));
      case 'BuildCount': { const b = blockOf(o.block || 'conveyor'); return this.fmt('objective.build', (o.count ?? 1) - (S.placed[b] || 0), ic('b', b), nm('b', b)); }
      case 'UnitCount': { const u = o.unit || 'dagger'; return this.fmt('objective.buildunit', (o.count ?? 1) - W.countU(u), ic('u', u), nm('u', u)); }
      case 'DestroyUnits': return this.fmt('objective.destroyunits', (o.count ?? 1) - S.kills);
      case 'Timer': { if (!o.text) return null; const s = Math.max(0, ((o.duration ?? 1800) - o.t) / 60 | 0), ts = `${s / 60 | 0}:${String(s % 60).padStart(2, '0')}`; return this.L(o.text).replace('{0}', ts); }
      case 'DestroyBlock': { const b = blockOf(o.block || 'router'); return this.fmt('objective.destroyblock', ic('b', b), nm('b', b)); }
      case 'DestroyBlocks': { const b = blockOf(o.block || 'router'); return this.fmt('objective.destroyblocks', this.dbProg(o), (o.positions || []).length, ic('b', b), nm('b', b)); }
      case 'DestroyCore': return this.fmt('objective.destroycore');
      case 'Research': case 'Produce': { const [k, key] = this.hk.content ? this.hk.content(o.content || 'copper') : ['i', 'copper']; return this.fmt(o.class === 'Research' ? 'objective.research' : 'objective.produce', ic(k, key), nm(k, key)); }
      case 'CommandMode': return this.fmt('objective.command');
      case 'Flag': return o.text ? this.L(o.text) : null;
    }
    return null;
  }
  // a most aktív célok szövegei és a pályán megjelenő jelölők (világ-koordinátában)
  active() { return this.obj.filter(o => this.ready(o) && !o.hidden); }
  markers() {
    const out = [], H = this.h * TS;
    for (const o of this.active()) for (const mk of o.markers || []) { if (!mk.pos) continue; out.push({ k: mk.class, x: mk.pos.x + TS / 2, y: H - mk.pos.y - TS / 2, text: mk.text ? this.L(mk.text) : '', r: mk.radius, rot: mk.rotation || 0, fs: mk.fontSize ?? 1 }); }
    return out;
  }
  tick() {
    for (const o of this.obj) if (this.ready(o) && this.check(o)) { o.done = true; for (const f of o.flagsRemoved || []) this.W.flags.delete(f); for (const f of o.flagsAdded || []) this.W.flags.add(f); }
    for (const p of this.procs) p.run();
    for (const m of this.msgs) m.life--; this.msgs = this.msgs.filter(m => m.life > 0);
    const W = this.W; if (W.cut) { const c = W.cut; if (c.tx != null) { c.x += (c.tx - c.x) * Math.min(1, c.sp); c.y += (c.ty - c.y) * Math.min(1, c.sp); } if (c.tz != null) c.z = c.z == null ? c.tz : c.z + (c.tz - c.z) * Math.min(1, c.zs || .05); }
  }
}

/* ---------- világprocesszor: mlog-értelmező ---------- */
const tok = l => { const o = []; let i = 0; while (i < l.length) { if (l[i] === ' ') { i++; continue; } if (l[i] === '"') { const j = l.indexOf('"', i + 1); o.push(l.slice(i, j < 0 ? l.length : j + 1)); i = j < 0 ? l.length : j + 1; } else { let j = i; while (j < l.length && l[j] !== ' ') j++; o.push(l.slice(i, j)); i = j; } } return o; };
class Proc {
  constructor(S, s) {
    this.S = S; this.W = S.W; this.code = s.code.split('\n').map(l => l.trim()).filter(l => l).map(tok); this.labels = {};
    this.pc = 0; this.v = {}; this.wt = 0; this.halt = false; this.unit = null; this.ipt = 8;
    for (const [n, x, y] of s.links || []) this.v[n] = { lnk: [x, y] };
  }
  snap() { const v = {}; for (const k in this.v) { const x = this.v[k]; if (typeof x === 'number' || typeof x === 'string' || typeof x === 'boolean') v[k] = x; } return { pc: this.pc, v, wt: Math.round(this.wt), h: this.halt ? 1 : 0 }; }
  restore(p) { this.pc = p.pc || 0; Object.assign(this.v, p.v || {}); this.wt = p.wt || 0; this.halt = !!p.h; }
  val(a) {
    if (a === undefined) return null;
    if (a[0] === '"') return a.slice(1, -1);
    if (a === 'true') return 1; if (a === 'false') return 0; if (a === 'null') return null;
    if (/^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/.test(a)) return +a;
    if (a.startsWith('0x')) return parseInt(a, 16);
    if (a[0] === '@') { const n = a.slice(1); if (n in TEAM) return { team: TEAM[n] }; if (n === 'tick') return this.W.tick; if (n === 'time') return this.W.tick * 1000 / 60; if (n === 'unit') return this.unit; if (n === 'air') return { air: 1 }; return { c: n }; }
    let x = this.v[a]; if (x && x.lnk) { const b = this.W.tb(x.lnk[0], x.lnk[1]); x = b; }
    return x === undefined ? null : x;
  }
  num(a) { const v = this.val(a); return typeof v === 'number' ? v : v == null ? 0 : typeof v === 'object' ? (v.dead ? 0 : 1) : 1; }
  set(a, v) { if (a && a[0] !== '@' && a[0] !== '"') this.v[a] = v; }
  tile(x, y) { return [Math.floor(this.num(x)), this.W.h - 1 - Math.floor(this.num(y))]; }
  wpos(x, y) { return [(this.num(x) + .5) * TS, (this.W.h - this.num(y) - .5) * TS]; }
  run() {
    if (this.halt || !this.code.length) return;
    if (this.wt > 0) { this.wt--; return; }
    for (let n = 0; n < this.ipt && !this.halt && this.wt <= 0; n++) { if (this.pc >= this.code.length) this.pc = 0; const l = this.code[this.pc++]; try { this.exec(l); } catch (e) { } }
  }
  cmp(op, a, b) {
    const x = this.val(a), y = this.val(b), nx = this.num(a), ny = this.num(b);
    switch (op) { case 'equal': return typeof x === 'object' && typeof y === 'object' ? x === y : Math.abs(nx - ny) < 1e-6; case 'notEqual': return !this.cmp('equal', a, b); case 'lessThan': return nx < ny; case 'lessThanEq': return nx <= ny; case 'greaterThan': return nx > ny; case 'greaterThanEq': return nx >= ny; case 'strictEqual': return x === y; case 'always': return true; }
    return false;
  }
  exec(l) {
    const W = this.W, S = this.S, [op, a, b, c, d, e, f, g] = l;
    switch (op) {
      case 'set': this.set(a, this.val(b)); break;
      case 'op': { const x = this.num(c), y = this.num(d); const r = { add: x + y, sub: x - y, mul: x * y, div: x / y, idiv: Math.floor(x / y), mod: x % y, pow: x ** y, equal: +(x === y), notEqual: +(x !== y), land: +(x && y), lessThan: +(x < y), lessThanEq: +(x <= y), greaterThan: +(x > y), greaterThanEq: +(x >= y), or: x | y, and: x & y, xor: x ^ y, not: ~x, max: Math.max(x, y), min: Math.min(x, y), abs: Math.abs(x), floor: Math.floor(x), ceil: Math.ceil(x), sqrt: Math.sqrt(x), rand: Math.random() * x, len: Math.hypot(x, y), angle: (Math.atan2(y, x) * 180 / Math.PI + 360) % 360, sin: Math.sin(x * Math.PI / 180), cos: Math.cos(x * Math.PI / 180), log: Math.log(x), shl: x << y, shr: x >> y }[b]; this.set(a, Number.isFinite(r) ? r : 0); break; }
      case 'jump': if (this.cmp(b, c, d)) this.pc = +a; break;
      case 'wait': this.wt = Math.max(0, this.num(a) * 60); break;
      case 'stop': this.halt = true; break;
      case 'end': this.pc = 0; break;
      case 'getflag': this.set(a, W.flags.has(this.val(b)) ? 1 : 0); break;
      case 'setflag': { const k = this.val(a); if (this.num(b)) W.flags.add(k); else W.flags.delete(k); break; }
      case 'setrate': this.ipt = Math.max(1, Math.min(1000, this.num(a) | 0)); break;
      case 'setrule': {
        const v = this.num(b);
        if (a === 'mapArea') { const x = this.num(c) | 0, y = this.num(d) | 0, w = this.num(e) | 0, h = this.num(f) | 0; W.area = x <= 0 && y <= 0 && x + w >= W.w && y + h >= W.h ? null : { x, y: W.h - y - h, w, h }; W.fdirty = 1; W.areaV = (W.areaV || 0) + 1; }
        else if (a === 'waves' || a === 'waveTimer' || a === 'waveSending' || a === 'attackMode') W.rules[a] = !!v;
        else if (a === 'unitCap' || a === 'waveSpacing') W.rules[a] = v * (a === 'waveSpacing' ? 60 : 1);
        else if (a === 'wave') W.wave = v | 0; else if (a === 'wavetimer' || a === 'currentWaveTime') W.wtimer = v * 60;
        break;
      }
      case 'spawnwave': if (this.val(c)) W.nextWave(); break;
      case 'localeprint': this.print += S.L('@' + this.val(a)); break;
      case 'print': { const v = this.val(a); this.print += v == null ? 'null' : typeof v === 'object' ? '[obj]' : String(v); break; }
      case 'message': { const t = this.print; this.print = ''; if (!t) break; const dur = this.num(b) * 60 || 180; S.msgs.push({ k: a, t, life: dur, max: dur }); if (c === '@wait') this.wt = a === 'announce' || a === 'toast' ? 0 : 0; break; }
      case 'cutscene': {
        const cu = W.cut || (W.cut = { x: W.player ? W.player.x : W.center(W.core).x, y: W.player ? W.player.y : W.center(W.core).y, z: null });
        if (a === 'pan') { const [x, y] = this.wpos(b, c); cu.tx = x; cu.ty = y; cu.sp = this.num(d) || .05; }
        else if (a === 'zoom') { cu.tz = this.num(b); cu.zs = .05; }
        else if (a === 'stop') W.cut = null;
        break;
      }
      case 'fetch': {
        const t = (this.val(c) || {}).team, ty = this.val(f || e), tid = ty && ty.c ? blockOf(ty.c) : null;
        if (b === 'build') { const i = this.num(d) | 0; let k = 0, r = null; for (const o of W.blds) if (o.team === t && (!tid || o.t === tid)) { if (k++ === i) { r = o; break; } } this.set(a, r); }
        else if (b === 'buildCount') { const ty2 = this.val(e); const id = ty2 && ty2.c ? blockOf(ty2.c) : null; let k = 0; for (const o of W.blds) if (o.team === t && (!id || o.t === id)) k++; this.set(a, k); }
        else if (b === 'coreCount') { let k = 0; for (const o of W.blds) if (o.team === t && o.B.type === 'core') k++; this.set(a, k); }
        else if (b === 'core') { const i = this.num(d) | 0; this.set(a, W.blds.filter(o => o.team === t && o.B.type === 'core')[i] || null); }
        else if (b === 'unit' || b === 'unitCount') { const L = W.units.filter(u => !u.dead && u.team === t); this.set(a, b === 'unitCount' ? L.length : L[this.num(d) | 0] || null); }
        break;
      }
      case 'sensor': {
        const o = this.val(b), p = (this.val(c) || {}).c; let r = null;
        if (p === 'dead') r = !o || o.dead ? 1 : 0;
        else if (o && !o.dead) {
          const isU = !!o.U && !o.bl && !o.B;
          if (p === 'ammo') r = o.ammo ? o.ammo.reduce((s, x) => s + Math.min(x.n, 1e6), 0) : 0;
          else if (p === 'team') r = o.team; else if (p === 'health') r = o.hp; else if (p === 'maxHealth') r = isU ? o.U.hp : o.B.hp;
          else if (p === 'efficiency') r = o.B ? (o.B.power ? o.ps || 0 : 1) : 0; else if (p === 'payloadCount') r = isU ? (o.carry ? 1 : 0) : 0;
          else if (p === 'x') r = isU ? o.x / TS - .5 : o.x + o.B.s / 2 - .5; else if (p === 'y') r = W.h - (isU ? o.y / TS + .5 : o.y + o.B.s / 2 + .5);
          else if (p === 'shield') r = o.sh || 0; else if (p === 'enabled') r = o.off ? 0 : 1;
          else if (p && ITEMS[itemOf(p) || p]) { const it = itemOf(p) || p; r = (o.items && o.items[it]) || 0; }
          else if (p === 'totalItems') r = o.items ? Object.values(o.items).reduce((s, x) => s + x, 0) : 0;
        }
        this.set(a, r); break;
      }
      case 'control': { const o = this.val(b); if (o && o.B && a === 'enabled') o.off = !this.num(c); break; }
      case 'setprop': {
        const p = (this.val(a) || {}).c, o = this.val(b), v = this.num(c); if (!o || o.dead) break;
        if (p === 'health') { if (o.U && !o.B) { if (v <= 0) W.dmgU(o, 1e9, 1); else o.hp = v; } else if (o.B) { if (v <= 0) W.remB(o, 1); else o.hp = Math.min(o.B.hp, v); } }
        else if (p === 'shield') o.sh = v; else if (p === 'team') o.team = v;
        else if (p && (ITEMS[itemOf(p)] || ITEMS[p]) && o.items) { const it = itemOf(p) || p; o.items[it] = v; }
        break;
      }
      case 'status': { const o = this.val(c), k = ST[b]; if (!o || !o.st || !k || !STATUS[k]) break; if (this.num(a)) delete o.st[k]; else o.st[k] = this.num(d) * 60 || 600; break; }
      case 'spawn': {
        const t = (this.val(a) || {}).c, tm = (this.val(e) || {}).team ?? ENEMY; if (!UNITS[t]) { this.set(f, null); break; }
        const [x, y] = this.wpos(b, c), u = W.spawnU(t, tm, x, y); u.rot = -this.num(d) * Math.PI / 180; this.set(f, u); break;
      }
      case 'setblock': {
        const [x, y] = this.tile(c, d), bt = (this.val(b) || {}).c, tm = (this.val(e) || {}).team ?? DERELICT; if (!W.inb(x, y)) break;
        if (a === 'block') { const o = W.tb(x, y); if (o && o !== W.core) W.remB(o); const i = y * W.w + x; if (bt === 'air') { if (W.wall[i]) { W.wall[i] = 0; W.sol[i] = W.fl(i).deep ? 1 : 0; W.terV = (W.terV || 0) + 1; } } else { const id = blockOf(bt); if (id && W.fits(BLOCKS[id], x, y)) W.addB(id, x, y, 0, null, tm); } W.fdirty = 1; }
        break;
      }
      case 'ubind': { const v = this.val(a); this.unit = v && v.U && !v.B ? v : null; break; }
      case 'ucontrol': {
        const u = this.unit; if (!u || u.dead) { if (a === 'within') this.set(f, 0); break; }
        u.lc = W.tick;
        if (a === 'move' || a === 'approach' || a === 'pathfind' || a === 'boost') { const [x, y] = this.wpos(b, c); u.lmove = { x, y, r: a === 'approach' ? this.num(d) * TS : 0 }; }
        else if (a === 'stop') u.lmove = { x: u.x, y: u.y, r: 0 };
        else if (a === 'idle' || a === 'unbind') { u.lc = null; u.lmove = null; }
        else if (a === 'within') { const [x, y] = this.wpos(b, c); this.set(f, Math.hypot(u.x - x, u.y - y) <= this.num(d) * TS ? 1 : 0); }
        else if (a === 'payTake') { if (!u.carry) { let best = null, bd = 30; for (const o of W.units) if (o !== u && !o.dead && !o.U.air && o.team === u.team && !o.carrier) { const dd = Math.hypot(o.x - u.x, o.y - u.y); if (dd < bd) { bd = dd; best = o; } } if (best) { u.carry = best; best.carrier = u; } } }
        else if (a === 'payDrop') { if (u.carry) { u.carry.carrier = null; u.carry = null; } }
        break;
      }
      case 'ulocate': { const u = this.unit; if (!u) break; let best = null, bd = 1e9; for (const o of W.blds) if ((b === 'core' ? o.B.type === 'core' : b === 'turret' ? o.B.type === 'turret' : true) && (this.num(c) ? o.team !== u.team : o.team === u.team)) { const cc = W.center(o), dd = Math.hypot(cc.x - u.x, cc.y - u.y); if (dd < bd) { bd = dd; best = o; } } this.set(l[7], best ? 1 : 0); this.set(l[l.length - 1], best); if (best) { this.set(l[5], best.x + best.B.s / 2 - .5); this.set(l[6], W.h - best.y - best.B.s / 2 - .5); } break; }
      case 'getlink': { const i = this.num(b) | 0, ks = Object.keys(this.v).filter(k => this.v[k] && this.v[k].lnk); this.set(a, ks[i] ? this.val(ks[i]) : null); break; }
      case 'explosion': { const [x, y] = this.wpos(c, d); W.splashAll(x, y, this.num(e) * TS, this.num(f)); break; }
      case 'noop': default: break;
    }
  }
}
