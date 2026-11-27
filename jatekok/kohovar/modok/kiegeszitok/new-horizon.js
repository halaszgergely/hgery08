// A New Horizon kiegészítője a Kohóvár modkeretéhez: a Java-kódban megírt egyedi blokkok működése.
// (A tartalmat az eszkoz/nhconv.py alakítja át; ez a fájl csak a viselkedést adja.)
import { TS, ITEMS, LIQUIDS } from '../../adat.js?v=202611271009';

const GF = [];        // gravitációs csapdák mezői: { b, r } – az ellenség ide nem ugorhat
const inHostileField = (team, x, y) => GF.some(f => !f.b.dead && f.b.team !== team && Math.abs(x - f.cx) <= f.r && Math.abs(y - f.cy) <= f.r);

export function types(FW) {
  // fúrómodulok: a szomszédos fúrót gyorsítják (folyadékkal hűtve / árammal)
  FW.reg('nh-radiator', {
    mindustry: /^NhRadiator$/,
    convert: (j, h) => ({ liq: !!j.liquidUse || j._class === 'LiquidRadiator', use: +(j.liquidUse || .05), lcap: 20, boostP: j._class === 'DrillModule' ? .5 : 0 }),
    lqAccept: (W, b, liq) => b.B.liq && LIQUIDS[liq].hc > 0 && !LIQUIDS[liq].gas,
    update(W, b) {
      const B = b.B; let boost = 0;
      if (B.liq) { if (b.lq >= B.use) { b.lq -= B.use; boost = Math.min(2, (LIQUIDS[b.lt].hc || 0) / .4 * .6); } }
      else { b.pneed = B.power || 0; boost = B.boostP * (b.ps || 0); }
      b.work = boost > 0 ? 1 : 0; if (boost <= 0) return;
      for (const t of FW.adj(W, b)) if (t.B.type === 'drill') { t.odT = W.tick + 2; t.odM = Math.max(t.odM > 1 && t.odT > W.tick ? t.odM : 1, 1 + boost); }
    },
    info: B => [B.liq ? 'Folyadékkal hűtve gyorsítja a szomszédos fúrót (a hőkapacitással arányosan, legfeljebb 3×)' : 'Árammal gyorsítja a szomszédos fúrót (+50%)'],
  });

  // tűzoltó: a hatótávon belül eloltja a saját egységeket (égés, olvadás)
  FW.reg('nh-extinguisher', {
    mindustry: /^NhExtinguisher$/,
    convert: (j, h) => ({ range: +(j.range || 280), reload: +(j.reloadTime || 120), fuel: h.inp ? Object.keys(h.inp)[0] : null, fuelN: h.inp ? Object.values(h.inp)[0] : 0, icap: 10 }),
    accept: (W, b, it) => it === b.B.fuel && (b.items[it] || 0) < 10 && ((b.items[it] = (b.items[it] || 0) + 1), true),
    update(W, b) {
      const B = b.B, c = FW.center(b); b.rl = (b.rl || 0) + 1; if (b.rl < B.reload) return;
      const burning = W.units.filter(u => !u.dead && u.team === b.team && u.st && (u.st.burn || u.st.melt) && Math.hypot(u.x - c.x, u.y - c.y) <= B.range);
      if (!burning.length) { b.work = 0; return; }
      b.pneed = B.power || 0; if (B.power && (b.ps || 0) < .5) return;
      if (B.fuel && (b.items[B.fuel] || 0) < B.fuelN) return; if (B.fuel) b.items[B.fuel] -= B.fuelN;
      for (const u of burning) { delete u.st.burn; delete u.st.melt; }
      b.rl = 0; b.work = 1; W.fx.push({ k: 'ring', x: c.x, y: c.y, r: B.range, life: 40, max: 40, c: '#8ad4ff' });
    },
    overlay(g, W, b) { const c = FW.center(b); g.strokeStyle = 'rgba(138,212,255,.6)'; g.beginPath(); g.arc(c.x, c.y, b.B.range, 0, 7); g.stroke(); },
    info: B => [`Hatótáv: <b>${(B.range / TS).toFixed(1)} mező</b>`, 'Eloltja a saját égő egységeket'],
  });

  // gravitációs csapda: az ellenséges hipertér-ugrás nem érkezhet a négyzetes mezőjébe
  FW.reg('nh-gravity', {
    mindustry: /^NhGravityWell$/,
    convert: j => ({ range: +(j.gravityRange || 80) }),
    init(W, b) { const c = FW.center(b); for (let i = GF.length - 1; i >= 0; i--) if (GF[i].b.dead || GF[i].W !== W) GF.splice(i, 1); GF.push({ b, W, cx: c.x, cy: c.y, r: b.B.range }); },
    update() {},
    overlay(g, W, b) { const c = FW.center(b), r = b.B.range; g.strokeStyle = 'rgba(160,140,255,.8)'; g.lineWidth = 1; g.strokeRect(c.x - r, c.y - r, r * 2, r * 2); },
    info: B => [`Mező: <b>${(B.range * 2 / TS).toFixed(0)}×${(B.range * 2 / TS).toFixed(0)} mező</b>`, 'Az ellenséges hipertér-ugrás nem érkezhet ide'],
  });

  // hipertér-ugró: a közelében álló saját egységeket a kijelölt pontra ugratja (1 perc töltés)
  FW.reg('nh-warper', {
    mindustry: /^NhWarper$/,
    convert: (j, h) => ({ reload: 3600, pick: 12 * TS, fuel: h.inp ? Object.keys(h.inp)[0] : null, fuelN: h.inp ? Object.values(h.inp)[0] : 0, inL: h.inL, lcap: +(j.liquidCapacity || 120), icap: +(j.itemCapacity || 20) }),
    accept: (W, b, it) => it === b.B.fuel && (b.items[it] || 0) < b.B.icap && ((b.items[it] = (b.items[it] || 0) + 1), true),
    lqAccept: (W, b, liq) => !!b.B.inL && liq === b.B.inL[0],
    update(W, b) {
      const B = b.B; b.pneed = B.power || 0;
      const ok = (!B.power || (b.ps || 0) > .5) && (!B.inL || (b.lq >= B.inL[1] && b.lt === B.inL[0]));
      if (ok && (b.prog || 0) < 1) { b.prog = Math.min(1, (b.prog || 0) + 1 / B.reload); if (B.inL) b.lq -= B.inL[1]; }
      b.work = b.prog;
    },
    pointTap(W, b, tx, ty) { b.cfg = [tx, ty]; return true; },
    sel(W, b) { return `<div style="font-size:14px">Célpont: ${b.cfg ? `${b.cfg[0]}, ${b.cfg[1]}` : '—'}</div><div class="mbar"><i style="width:${(b.prog || 0) * 100}%;background:#a08cff"></i><span>Töltés ${Math.round((b.prog || 0) * 100)}%</span></div>${b.jam ? '<div class="bad">Ellenséges gravitációs mező zavarja</div>' : ''}<button class="np-button" data-fw="warp" style="width:100%;margin-top:4px">Ugrás</button>`; },
    selClick(W, b, el) {
      if (el.dataset.fw !== 'warp' || !b.cfg || (b.prog || 0) < 1) return;
      const B = b.B; if (B.fuel && (b.items[B.fuel] || 0) < B.fuelN) return;
      const c = FW.center(b), tx = (b.cfg[0] + .5) * TS, ty = (b.cfg[1] + .5) * TS;
      if (inHostileField(b.team, tx, ty)) { b.jam = 1; return; } b.jam = 0;
      const us = W.units.filter(u => !u.dead && u.team === b.team && u !== W.player && Math.hypot(u.x - c.x, u.y - c.y) <= B.pick);
      if (!us.length) return;
      if (B.fuel) b.items[B.fuel] -= B.fuelN; b.prog = 0;
      us.forEach((u, i) => { const a = i * 2.4, r = 6 + Math.sqrt(i) * 10; let x = tx + Math.cos(a) * r, y = ty + Math.sin(a) * r; const k = Math.floor(y / TS) * W.w + Math.floor(x / TS); if (!u.U.air && (!W.inb(Math.floor(x / TS), Math.floor(y / TS)) || W.sol[k])) { x = tx; y = ty; } W.fx.push({ k: 'ring', x: u.x, y: u.y, r: 10, life: 30, max: 30, c: '#a08cff' }); u.x = x; u.y = y; W.fx.push({ k: 'ring', x, y, r: 14, life: 40, max: 40, c: '#a08cff' }); });
    },
    overlay(g, W, b) { const c = FW.center(b); g.strokeStyle = 'rgba(160,140,255,.5)'; g.beginPath(); g.arc(c.x, c.y, b.B.pick, 0, 7); g.stroke(); if (b.cfg) { const x = (b.cfg[0] + .5) * TS, y = (b.cfg[1] + .5) * TS; g.strokeStyle = '#a08cff'; g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(x, y); g.stroke(); g.strokeRect(x - 6, y - 6, 12, 12); } },
    info: B => ['A 12 mezőn belüli saját egységeket a kijelölt pontra ugratja', `Töltés: <b>${B.reload / 60} mp</b>`],
  });
  // kijelzők: a beállított anyag ikonja / egy karakter
  FW.reg('nh-icondisp', {
    mindustry: /^NhIconDisplay$/, convert: () => ({ cfg: 'item' }),
    draw(g, b, d) { d.spr(g, d.n, d.cx, d.cy); if (b.cfg && ITEMS[b.cfg]) FW.sprItem(g, b.cfg, d.cx, d.cy, d.s * .7); },
  });
  FW.reg('nh-chardisp', {
    mindustry: /^NhCharDisplay$/,
    init(W, b) { if (typeof b.cfg !== 'string') b.cfg = ''; },
    draw(g, b, d) { d.spr(g, d.n, d.cx, d.cy); if (b.cfg) { g.fillStyle = '#fff'; g.font = `bold ${Math.round(d.s * .75)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(b.cfg, d.cx, d.cy + 1); } },
    sel: (W, b) => `<button class="np-button" data-fw="ch" style="width:100%">Karakter: ${b.cfg ? b.cfg.replace(/[<&]/g, '') : '—'}</button>`,
    selClick(W, b, el, api) { if (el.dataset.fw === 'ch') api.editText('Karakter', b.cfg || '', v => { b.cfg = [...v.trim()][0] || ''; }); },
  });
  FW.parts.push('New Horizon: fúrómodulok, tűzoltó, gravitációs csapda, hipertér-ugró, kijelzők');
}
