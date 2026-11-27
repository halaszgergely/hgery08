// Fejlesztői menü (Konami-kód: ↑↑↓↓←→←→BA): repülés, isten mód, jármű-spawn, időjárás, napszak. Aktiválás után a mentés kikapcsol.
import { VEH } from './vehicles.js?v=202611271514';

export function createDev(ctx) {
  const D = { on: false, open: false, god: false, noWanted: false };
  const el = document.createElement('div'); el.className = 'hide pe';
  el.style.cssText = 'position:absolute;left:20px;top:80px;width:300px;max-height:80vh;overflow:auto;background:rgba(20,6,6,.92);border:1px solid #b0201a;border-radius:10px;padding:14px;font:600 13px Arial;z-index:3';
  document.getElementById('ui').appendChild(el);
  const btn = (t, f, on) => { const b = document.createElement('div'); b.textContent = t; b.style.cssText = `padding:7px 10px;margin:4px 0;border-radius:6px;cursor:pointer;background:${on ? '#b0201a' : 'rgba(255,255,255,.08)'}`; b.onclick = () => { f(); render(); }; return b; };
  function render() {
    el.innerHTML = '<div style="font:900 15px Arial;color:#ff6b5a;margin-bottom:8px">FEJLESZTŐI MENÜ</div>'; const pl = ctx.player;
    el.append(btn(`Repülés: ${pl.fly ? 'BE' : 'KI'}`, () => { if (pl.veh) ctx.exitVehicle(true); pl.fly = !pl.fly; }, pl.fly), btn(`Isten mód: ${D.god ? 'BE' : 'KI'}`, () => { D.god = !D.god; ctx.env.god = D.god; }, D.god),
      btn(`Körözés tiltva: ${D.noWanted ? 'BE' : 'KI'}`, () => { D.noWanted = !D.noWanted; if (D.noWanted) ctx.wanted.clear(); }, D.noWanted),
      btn('Körözés +1 csillag', () => ctx.wanted.set(Math.min(5, ctx.wanted.level + 1))), btn('+10 000 Ft', () => ctx.money(10000, 'Fejlesztői pénz')), btn('Minden fegyver + lőszer', () => { for (let i = 1; i < 6; i++) ctx.weapons.give(i, 999); }),
      btn('Teleport az útponthoz', () => { const w = ctx.ui.waypoint; if (w) ctx.teleport(w.x, w.z); }));
    const t = document.createElement('div'); t.innerHTML = `<div style="margin:10px 0 4px">Napszak: <b>${ctx.tod.toFixed(1)}</b> ó</div><input type="range" min="0" max="23.9" step=".1" value="${ctx.tod}" style="width:100%">`; t.querySelector('input').oninput = e => { ctx.tod = +e.target.value; t.querySelector('b').textContent = ctx.tod.toFixed(1); }; el.append(t);
    el.append(btn(`Időjárás: ${ctx.weather.target > .5 ? 'eső' : 'napos'}`, () => { ctx.weather.target = ctx.weather.target > .5 ? 0 : 1; ctx.weather.lock = 60; }));
    const s = document.createElement('div'); s.innerHTML = '<div style="margin:10px 0 4px">Jármű lehívása</div>'; el.append(s);
    for (const id in VEH) if (!VEH[id].cop || id === 'vizugy') el.append(btn(VEH[id].n, () => ctx.spawnNear(id)));
    el.append(btn('Bezárás', () => D.toggle(false)));
  }
  D.toggle = o => { D.open = o ?? !D.open; el.classList.toggle('hide', !D.open); ctx.input.block = false; if (D.open) { document.exitPointerLock?.(); render(); } };
  D.activate = () => { ctx.ui.togglePhone(false); if (!D.on) { D.on = true; ctx.ui.dev(true); ctx.ui.toast('Fejlesztői mód aktív – a mentés kikapcsolva'); } D.toggle(); };
  return D;
}
