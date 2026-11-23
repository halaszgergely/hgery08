// Az Átemelőtelep – kezelőfelületek (DOM-panelek): kapcsolószekrény, multiméter, sorkapocs, terminál, aggregát, átkapcsoló, modem, dokumentumok, leltár.
import { X1, LOOSE, CODE, ITEMN, OVER, LSL_H, LSH_H, cabPow, v24, plcRun, lightPow, supply, ltOK, lshOK, lslOK, fbOK, progTest } from './jatek.js?v=202611231332';
const $ = s => document.querySelector(s), esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let api = null, cur = null, sub = {}, timer = 0, lastH = '', pdown = false;
export function initUI(a) { api = a; $('#pn').addEventListener('click', click); $('#pn').addEventListener('change', change); $('#pn').addEventListener('pointerdown', e => { pdown = true; hold(e); }); addEventListener('pointerup', () => { setTimeout(() => pdown = false, 0); release(); }); }
export const isOpen = () => !!cur, openId = () => cur;
export function open(id, arg) { cur = id; sub = { arg, mm: sub.mm || { mode: 'V=', probe: '24' } }; $('#pn').hidden = false; render(); clearInterval(timer); timer = setInterval(() => { if (cur && !pdown && !['doc', 'inv', 'busz', 'fiok'].includes(cur) && !(cur === 'terminal' && sub.tab === 'prog')) render(); }, 300); }
export function close() { cur = null; lastH = ''; $('#pn').innerHTML = ''; clearInterval(timer); $('#pn').hidden = true; $('#pn').innerHTML = ''; api.closed(); }
export const refresh = () => cur && render();
const S = () => api.S;
const btn = (a, t, cls = '', dis = false, extra = '') => `<button class="b ${cls}" data-a="${a}" ${dis ? 'disabled' : ''} ${extra}>${t}</button>`;
const led = (on, c = '#5ee08a') => `<i class="led" style="background:${on ? c : '#2a2f38'};box-shadow:${on ? '0 0 8px ' + c : 'none'}"></i>`;
const lv = h => h.toFixed(2).replace('.', ',') + ' m';

/* ---------- dokumentumok ---------- */
export const DOCS = {
  lanc: { t: 'Elvágott lánc', b: '<p>A kapu lakatja érintetlen – a láncot csípték el, közvetlenül mellette. A vágási felület fényes, még nem rozsdásodott: <b>órákkal ezelőtt</b> történt.</p><p>A sárban egy személyautó keréknyoma. Nem a mienk.</p>' },
  naplo: { t: 'Műszaknapló – Átemelő 3.', b: `<table class="tb"><tr><td>11.17. 08:20</td><td>Heti szemle. P1 rezgés enyhén magas, megfigyelés.</td></tr><tr><td>11.18. 10:05</td><td>P1 kiemelve, járókerék tisztítva (törlőkendők, rongy). Ismét ügyfél-tájékoztatót kérünk a faluban.</td></tr><tr><td>11.19. 13:40</td><td>LT1 hidrosztatikus szinttávadó kalibrálva: 0–4 m ↔ 4–20 mA. Riasztási szintek ellenőrizve: magas 3,0 m (LSH1), túlfolyás 3,6 m.</td></tr><tr><td>11.20. 21:15</td><td><i>„Karbantartás – külső vállalkozó, Sz. Sz.”</i> <span class="mut">(Ezt a bejegyzést nem mi írtuk. Nincs ilyen megrendelés.)</span></td></tr><tr><td>11.20. 22:47</td><td>SCADA: kommunikációs hiba, a telep nem válaszol. Ügyeletes kiriasztva.</td></tr></table>` },
  rajz: { t: 'Kapcsolási rajz – =A3+S1 / 7. lap: PLC jelbemenetek, X1 sorkapocs', b: () => `<div class="eplan"><div class="eh"><span>=A3 Átemelő 3.</span><span>+S1 Vezérlőszekrény</span><span>7 / 12</span></div><table class="tb"><tr><th>X1</th><th>Funkció</th><th>Érszám</th><th>Terepi eszköz / cél</th></tr>${X1.map(r => `<tr><td><b>${r.n}</b></td><td>${r.f}</td><td><b>${r.w}</b></td><td>${r.to}</td></tr>`).join('')}</table>
    <p class="mut" style="margin-top:8px">LT1: kétvezetékes 4–20 mA-es távadó (hurok: +24 V → LT1+ … LT1− → AI0+). LSH1 / LSL1: nyitott/zárt úszók, közös +24 V-ról (W106). A kontaktorok segédérintkezői (13–14) adják a futásvisszajelzést.</p></div>` },
  akna: { t: 'Belépési utasítás – zárt tér (szivattyúakna)', b: '<ol><li>Belépés előtt <b>kapcsold be a szellőztetést</b>, és kapcsold be a hordozható gázérzékelőt.</li><li>A javítandó szivattyút a szekrényben állítsd <b>0</b> állásba, és tedd rá a <b>személyes lakatodat</b> (kizárás – LOTO).</li><li>H₂S riasztási szintek: <b>A1 5 ppm</b>, <b>A2 10 ppm</b> (azonnal hagyd el az aknát), rövid idejű határérték 15 ppm.</li><li>Egyedül csak ügyeleti kivétellel – és mindig szólj valakinek. (Most nincs kinek.)</li></ol>' },
  gen: { t: 'Aggregát indítása – kézi (a panel ajtaján)', b: '<ol><li>Ellenőrizd az üzemanyagszintet (min. ¼).</li><li>Akkumulátor-főkapcsoló: <b>BE</b>.</li><li>A VÉSZ-STOP gomb legyen kioldva (elfordítva kihúzva).</li><li><b>Izzítás</b>: tartsd nyomva, amíg az izzítás-jelző kialszik (~6 s).</li><li><b>Indítás</b>: tartsd nyomva, amíg a motor beindul (max. 10 s).</li><li>Várd meg a melegedést: <b>400 V / 50 Hz</b> stabil.</li><li>Az átkapcsolón: HÁLÓZAT → <b>0</b> → GENERÁTOR. (Soha ne kapcsolj közvetlenül!)</li></ol>' },
  lyuk: { t: 'Átvágott kerítés', b: '<p>Egy emberméretű nyílás a dróthálóban, a szélei kifelé hajlítva. A fűben két sorban letaposott nyom vezet a vezérlőkonténer felé – és vissza.</p>' },
  cetli1: { t: 'Cetli a szekrény ajtaján', b: '<p class="hand">Szorgalmas vagy, mérnök úr.<br>De amíg a program az enyém, a víz is az enyém.<br>Nézd csak meg a paramétereket.<br><br>– Sz. Sz.</p>' },
  sms: { t: 'SMS – Diszpécserközpont', b: '<p><b>03:58</b> – Látjuk a telepet! Köszi!<br>Viszont: a nyomóvezeték nyomása <b>6,2 bar és nő</b>, a szivattyúk zárt szakaszra dolgoznak. A gazdasági ág tolózára (keleti kapu mögött, a sárga jelzőoszlopok mentén) <b>zárva van</b> – nem mi zártuk. Ha a szivattyúk nyomásvédelemmel leállnak, a medence megtelik. Siess!</p>' },
  kartya: { t: 'Névjegy a tolózáron', b: '<p class="hand">Ez csak egy telep volt.<br>Egyszer minden csap elzárul – és az <b>Arany Locsolófej</b> is az enyém lesz.<br>Szép hajnalt!<br><br>– Szikkadt Szilárd</p>' }
};

/* ---------- megjelenítés ---------- */
function render() { const s = S(), el = $('#pn'); let h = '';
  if (cur === 'doc') { const d = DOCS[sub.arg]; h = `<div class="card doc"><div class="row"><h1 class="grow">${esc(d.t)}</h1>${btn('close', 'Bezárás', 'go')}</div><div class="dbody">${typeof d.b === 'function' ? d.b() : d.b}</div></div>`; }
  else if (cur === 'inv') h = `<div class="card"><div class="row"><h1 class="grow">LELTÁR</h1>${btn('close', 'Bezárás', 'go')}</div><div class="grid2">${Object.keys(ITEMN).filter(k => s.inv[k]).map(k => `<div class="itm"><b>${ITEMN[k]}</b>${s.inv[k] > 1 ? ' ×' + s.inv[k] : ''}</div>`).join('')}</div>
    <h2>Zseblámpa</h2><div class="bar"><i style="width:${Math.round(s.bat * 100)}%;background:${s.bat < .2 ? '#ff5a4d' : '#e8b656'}"></i></div><div class="row" style="margin-top:8px">${btn('elem', 'Elemcsere', '', !s.inv.elem || s.bat > .9)}</div>
    <h2>Dokumentumok</h2><div class="row">${Object.keys(s.docs).map(k => btn('doc:' + k, esc(DOCS[k].t), 'sm')).join('') || '<span class="mut">Még nincs.</span>'}</div></div>`;
  else if (cur === 'busz') h = pickList('SZOLGÁLATI KISBUSZ', 'A raktérben a szerszámtáska és a tartalékok.', [['multi', 'Multiméter'], ['csavar', 'Csavarhúzó-készlet'], ['fogo', 'Oldalcsípő fogó'], ['lakat', 'Személyes lakat (LOTO)'], ['laptop', 'Szervizlaptop (PLC-kábellel)'], ['tkulcs', 'Tolózárkulcs (T-kulcs)'], ['elem', 'Tartalék elem ×2', 2]]);
  else if (cur === 'fiok') h = pickList('ÍRÓASZTAL FIÓKJA', 'Tartalék alkatrészek, gondosan felcímkézve.', [['biztositek', 'Biztosítóbetét 6 A gG ×2', 2], ['ncsatl', 'N-csatlakozó (antennakábel)'], ['elem', 'Tartalék elem', 1]]);
  else if (cur === 'szekreny') h = cabinet(s);
  else if (cur === 'terminal') h = terminal(s);
  else if (cur === 'modem') { const M = s.modem, p = M.pwr && cabPow(s) && s.cab.q[4]; h = `<div class="card"><div class="row"><h1 class="grow">VPN-MODEM (4G)</h1>${btn('close', 'Bezárás', 'go')}</div><div class="leds">${led(p)} PWR ${led(p && M.ant, M.online ? '#5ee08a' : '#ffd84a')} NET ${led(M.online, '#6cc6ff')} VPN</div>
    <p>${!M.pwr ? 'A tápcsatlakozó ki van húzva – valaki kirántotta a sorkapocsból.' : !cabPow(s) || !s.cab.q[4] ? 'A modemnek nincs tápja (Q5).' : !M.ant ? 'Nincs mobilhálózat: az antenna jele nem érkezik meg.' : M.online ? 'Kapcsolat felépült, VPN-alagút aktív – a telep újra látszik a SCADA-n.' : 'Kapcsolódás a VPN-hez… (' + Math.round(M.boot) + ' s)'}</p>
    <div class="row">${btn('modem_pwr', 'Tápcsatlakozó visszadugása', 'go', M.pwr)}</div></div>`; }
  else if (cur === 'antenna') h = `<div class="card"><div class="row"><h1 class="grow">ANTENNA-CSATLAKOZÓDOBOZ</h1>${btn('close', 'Bezárás', 'go')}</div><p>${s.modem.ant ? 'Az antennakábel csatlakozója a helyén, a dobozt lezártad.' : 'A koax kábelt közvetlenül a csatlakozó mögött elvágták. A régi N-csatlakozó használhatatlan.'}</p><div class="row">${btn('ant_fix', 'Új N-csatlakozó szerelése', 'go', s.modem.ant || !s.inv.ncsatl || !s.inv.csavar)}</div>${!s.modem.ant && !s.inv.ncsatl ? '<p class="mut">Kell egy tartalék N-csatlakozó.</p>' : ''}</div>`;
  else if (cur === 'generator') h = genPanel(s);
  else if (cur === 'ats') { const p = ['net', '0', 'gen'], i = p.indexOf(s.ats); h = `<div class="card" style="width:min(520px,100%)"><div class="row"><h1 class="grow">ÁTKAPCSOLÓ</h1>${btn('close', 'Bezárás', 'go')}</div><div class="rot"><div class="dial" style="transform:rotate(${(i - 1) * 60}deg)"></div><span style="left:6%">HÁLÓZAT</span><span style="left:46%">0</span><span style="right:2%">GENERÁTOR</span></div>
    <div class="row" style="justify-content:center">${btn('ats:-1', '◀ Balra', '', i === 0)}${btn('ats:1', 'Jobbra ▶', '', i === 2)}</div><p class="mut">Hálózat: ${s.mains ? '400 V' : '<b style="color:#ff5a4d">nincs</b>'} · Generátor: ${s.gen.run ? Math.round(380 + 20 * s.gen.warm) + ' V · ' + (48 + 2 * s.gen.warm).toFixed(1) + ' Hz' : 'áll'}</p></div>`; }
  if (h === lastH) return; lastH = h; const tmp = document.createElement('div'); tmp.innerHTML = h; kids(el, tmp); }
// kis „morph”: csak a ténylegesen megváltozott csomópontokat írjuk át, így a gombok nem cserélődnek kattintás közben
function morph(a, b) { if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) { a.replaceWith(b.cloneNode(true)); return; }
  if (a.nodeType === 3) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; } if (a.nodeType !== 1) return;
  for (const at of [...a.attributes]) if (!b.hasAttribute(at.name)) a.removeAttribute(at.name); for (const at of [...b.attributes]) if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
  if (a.nodeName === 'CANVAS') return; kids(a, b); }
function kids(a, b) { const ac = [...a.childNodes], bc = [...b.childNodes]; for (let i = 0; i < bc.length; i++) { if (i < ac.length) morph(ac[i], bc[i]); else a.appendChild(bc[i].cloneNode(true)); } for (let i = bc.length; i < ac.length; i++) ac[i].remove(); }
function pickList(t, d, l) { const s = S(), taken = s.f['took_' + cur] || {}; return `<div class="card"><div class="row"><h1 class="grow">${t}</h1>${btn('close', 'Bezárás', 'go')}</div><p class="mut">${d}</p><div class="grid2">${l.map(([k, n, c]) => `<div class="itm"><b>${n}</b>${taken[k] ? '<span class="mut"> – elvéve</span>' : btn('take:' + k + ':' + (c || 1), 'Elviszem', 'sm go')}</div>`).join('')}</div>${btn('takeall', 'Mindet viszem', '', l.every(([k]) => taken[k]))}</div>`; }

function cabinet(s) { const c = s.cab, cp = cabPow(s), plc = plcRun(s), Q = [['Q1', 'C16', 'Világítás, dugalj, szellőztető'], ['Q2', 'C6', '24 V DC tápegység (PLC, jelek)'], ['Q3', 'C10', 'P1 szivattyú'], ['Q4', 'C10', 'P2 szivattyú'], ['Q5', 'C2', 'VPN-modem']], tab = sub.tab || 'tap';
  const tabs = [['tap', 'Betáp és védelmek'], ['mot', 'Szivattyúk'], ['x1', 'X1 jelsorkapocs'], ['mm', 'Multiméter']].map(([k, n]) => `<button class="tab${tab === k ? ' on' : ''}" data-tab="${k}">${n}</button>`).join('');
  let b = '';
  if (tab === 'tap') b = `<div class="row" style="gap:18px;align-items:flex-start"><div class="blk"><h2>Q0 főkapcsoló</h2><div class="rot sm"><div class="dial" style="transform:rotate(${c.q0 ? 90 : 0}deg)"></div></div>${btn('q0', c.q0 ? 'KI (0)' : 'BE (I)', c.q0 ? '' : 'go')}<p class="mut">Betáp: ${supply(s) ? '400 V' : '<b style="color:#ff5a4d">nincs</b>'}</p></div>
    <div class="blk"><h2>Olvadóbiztosítók</h2>${['F1 10 A gG – világítás', 'F2 6 A gG – 24 V tápegység', 'F3 2 A gG – PLC kimenetek'].map((n, i) => `<div class="fz"><span class="fuse"></span><b>${n}</b>${btn('fuse:' + i, 'Csere', 'sm', !s.inv.biztositek)}</div>`).join('')}</div>
    <div class="blk"><h2>Kismegszakítók</h2>${Q.map(([n, k, d], i) => `<div class="fz"><span class="mcb${c.q[i] ? ' on' : ''}" data-a="q:${i}"><i></i></span><b>${n}</b> <small>${k}</small><br><small class="mut">${d}</small></div>`).join('')}</div>
    <div class="blk"><h2>PLC</h2><div class="leds">${led(v24(s))} PWR ${led(plc, '#5ee08a')} RUN ${led(plc && (!s.wiredOK || !s.progOK || s.alarm), '#ff5a4d')} ERR</div>
    <h2>X2 – 24 V elosztó</h2>${c.seenShort && c.jumper ? '<p><b style="color:#ff7a6e">Idegen drótdarab köti össze az X2:1 (+24 V) és X2:2 (0 V) kapcsot!</b></p>' + btn('jumper', 'Drótdarab eltávolítása', 'go') : c.jumper ? '<p class="mut">Sűrűn bekötött sorkapocs, első ránézésre rendben.</p>' : '<p class="mut">Rendben.</p>'}
    ${s.f.note1 ? '<p style="margin-top:10px">' + btn('doc:cetli1', 'Cetli az ajtón', 'sm') + '</p>' : ''}</div></div>`;
  else if (tab === 'mot') b = `<div class="row" style="gap:18px">${[0, 1].map(i => `<div class="blk"><h2>P${i + 1} szivattyú</h2><div class="row">${['K', '0', 'A'].map(m => `<button class="b sm${s.mode[i] === m ? ' on' : ''}" data-a="mode:${i}:${m}" ${s.lock[i] ? 'disabled' : ''}>${m === 'K' ? 'KÉZI' : m === '0' ? '0' : 'AUTO'}</button>`).join('')}</div>
    <div class="leds" style="margin-top:8px">${led(s.run[i])} Üzemel ${led(s.trip[i], '#ff5a4d')} Motorvédő leoldott</div><div class="row" style="margin-top:8px">${btn('reset:' + i, 'Motorvédő visszaállítása', '', !s.trip[i])}${s.lock[i] ? btn('unlock:' + i, 'Lakat levétele', 'go') : btn('lock:' + i, 'Személyes lakat rá (LOTO)', '', !s.inv.lakat || s.mode[i] !== '0' || s.lock[1 - i])}</div>
    ${s.lock[i] ? '<p class="mut">Kizárva: a szivattyú semmilyen módon nem indulhat.</p>' : ''}</div>`).join('')}</div><p class="mut">KÉZI: a szivattyú a PLC-től függetlenül megy, a szárazfutást neked kell figyelned. AUTO: a PLC szintszabályozása dönt.</p>`;
  else if (tab === 'x1') b = wiring(s);
  else b = multimeter(s);
  return `<div class="card wide"><div class="row"><h1 class="grow">+S1 VEZÉRLŐSZEKRÉNY</h1>${btn('close', 'Bezárás', 'go')}</div><div class="tabs">${tabs}</div>${b}</div>`; }
function wiring(s) { const sel = sub.wsel; return `<p class="mut">Az elvágott erek végére valaki új érvéghüvelyt préselt, de a sorkapocsból kihúzta őket. A jelölőgyűrűk egy része megmaradt. Válassz egy eret, majd a kapcsot.</p>
  <div class="row" style="gap:6px;margin:8px 0">${LOOSE.map(w => `<button class="wire${sel === w.id ? ' on' : ''}" data-a="wsel:${w.id}" style="--wc:${w.c}"><i></i>${w.lab}${s.wires[w.id] ? ' → X1:' + s.wires[w.id] : ''}</button>`).join('')}</div>
  <div class="strip">${X1.map(r => { const w = Object.keys(s.wires).find(k => s.wires[k] === r.n), fixed = ![2, 4, 5, 6, 7].includes(r.n); return `<div class="term${fixed || w ? ' full' : ''}" data-a="term:${r.n}"><b>${r.n}</b><small>${fixed ? r.w : w ? LOOSE.find(x => x.id === w).lab : '—'}</small></div>`; }).join('')}</div>
  <div class="row" style="margin-top:8px">${btn('wclear', 'Kiválasztott ér kihúzása', '', !sel || !s.wires[sel])}</div>
  ${s.inv.multi ? `<h2>Folytonosságmérés a terepi eszközig</h2><div class="row">${['LT1 −', 'LSH1', 'LSL1', 'Úszók közös', 'KM1 13'].map(d => btn('cont:' + d, d, 'sm', !sel)).join('')}</div><div class="mm sm">${sub.cmsg || '—'}</div>` : ''}`; }
function multimeter(s) { if (!s.inv.multi) return '<p>Nincs nálad multiméter – a kisbuszban van a szerszámtáskában.</p>'; const m = sub.mm, pr = [['L', 'L1 – N (betáp)'], ['24', 'X2:1 – X2:2 (+24 V / 0 V)'], ['F0', 'F1 két vége'], ['F1', 'F2 két vége'], ['F2', 'F3 két vége']];
  return `<div class="row" style="gap:18px;align-items:flex-start"><div class="blk"><h2>Mérési mód</h2><div class="row">${['V~', 'V=', 'Ω'].map(k => `<button class="b sm${m.mode === k ? ' on' : ''}" data-a="mm:${k}">${k === 'Ω' ? 'Ω / folytonosság' : k}</button>`).join('')}</div>
    <h2>Mérőzsinórok</h2>${pr.map(([k, n]) => `<button class="b sm${m.probe === k ? ' on' : ''}" data-a="mp:${k}" style="display:block;margin:4px 0">${n}</button>`).join('')}</div><div class="blk"><h2>Kijelző</h2><div class="mm">${reading(s)}</div></div></div>`; }
function reading(s) { const m = sub.mm, c = s.cab, sup = supply(s), live = sup && c.q0, P = m.probe;
  if (m.mode === 'Ω') { if (live) return '<span class="warn">Feszültség alatt nem mérünk ellenállást!<br><small>Kapcsold le a Q0-t.</small></span>';
    if (P[0] === 'F') { const ok = c.fuse[+P[1]]; return ok ? '0,1 Ω <small>♪ sípol</small>' : 'OL <small>(szakadt)</small>'; }
    if (P === '24') { if (c.jumper) { c.seenShort = 1; return '0,2 Ω <small>♪ sípol – ZÁRLAT</small>'; } return '1,4 kΩ <small>(a tápegység terhelése)</small>'; } return 'OL'; }
  if (m.mode === 'V~') return P === 'L' ? (sup ? '231,4 V~' : '0,0 V~') : P[0] === 'F' ? (live && c.fuse[+P[1]] ? '0,0 V~' : live ? '231,0 V~ <small>(a betét szakadt!)</small>' : '0,0 V~') : '0,0 V~';
  if (P === '24') return v24(s) ? '24,1 V=' : '0,00 V='; if (P === 'L') return '0,0 V= <small>(váltakozó feszültséghez a V~ mód kell)</small>'; return '0,00 V='; }
function terminal(s) { const plc = plcRun(s), tab = sub.tab || 'ov'; if (!cabPow(s)) return `<div class="card"><div class="row"><h1 class="grow">SCADA-TERMINÁL</h1>${btn('close', 'Bezárás', 'go')}</div><div class="crt off">A képernyő sötét. Nincs táp.</div></div>`;
  const tabs = [['ov', 'Áttekintés'], ['al', 'Hibalista'], ['prog', 'Program (laptop)'], ['com', 'Kommunikáció']].map(([k, n]) => `<button class="tab${tab === k ? ' on' : ''}" data-tab="${k}">${n}</button>`).join(''); let b = '';
  if (!plc) b = '<div class="crt">PLC: NINCS KAPCSOLAT<br><small>A 24 V-os tápegység vagy a PLC nem üzemel.</small></div>';
  else if (tab === 'ov') { const lt = ltOK(s) ? s.lvl : null; b = `<div class="crt syn"><div class="tank"><i class="water" style="height:${Math.min(100, (lt ?? 0) / 4 * 100)}%"></i>${[[OVER, 'túlfolyás'], [LSH_H, 'LSH1'], [s.prog.start1, 'P indul'], [s.prog.stop, 'P áll'], [LSL_H, 'LSL1']].map(([y, n]) => `<span class="mk" style="bottom:${y / 4 * 100}%">${n} ${y.toFixed(1)}</span>`).join('')}</div>
    <div><p>LT1 szint: <b>${lt == null ? '<span class="warn">HIBÁS JEL</span>' : lv(lt)}</b></p><p>Hozzáfolyás: ~${Math.round(s.qin * 4 * 3600)} m³/h</p>${[0, 1].map(i => `<p>P${i + 1}: ${s.run[i] ? '<b style="color:#5ee08a">ÜZEMEL</b>' : s.trip[i] ? '<b class="warn">HIBA</b>' : 'áll'} (${s.mode[i] === 'K' ? 'KÉZI' : s.mode[i] === 'A' ? 'AUTO' : '0'})</p>`).join('')}<p>Nyomóvezeték: ${s.press.toFixed(1).replace('.', ',')} bar</p><p>Magas szint riasztás: ${s.alarm ? '<b class="warn">AKTÍV</b>' : 'nincs'}</p></div></div>`; }
  else if (tab === 'al') b = `<div class="crt"><table class="al">${alarms(s).map(a => `<tr><td>${a[0]}</td><td>${a[1]}</td></tr>`).join('') || '<tr><td>—</td><td>Nincs aktív hiba.</td></tr>'}</table></div>`;
  else if (tab === 'com') b = `<div class="crt">VPN-modem: ${s.modem.online ? '<b style="color:#5ee08a">ONLINE</b> – a diszpécserközpont látja a telepet.' : '<span class="warn">NEM VÁLASZOL</span>'}<br><small>Utolsó kapcsolat: 11.20. 22:47</small></div>`;
  else b = s.inv.laptop ? prog(s) : '<div class="crt">A program módosításához csatlakoztasd a szervizlaptopot (a kisbuszban van).</div>';
  return `<div class="card wide"><div class="row"><h1 class="grow">SCADA-TERMINÁL · ÁTEMELŐ 3.</h1>${btn('close', 'Bezárás', 'go')}</div><div class="tabs">${tabs}</div>${b}</div>`; }
export function alarms(s) { const l = [], t = '03:1' + (Math.floor(s.t / 60) % 10);
  if (!ltOK(s)) l.push([t, 'AI0 LT1 szinttávadó: 0,0 mA – vezetékszakadás (< 3,6 mA). Az automatika tiltva.']);
  if (!lshOK(s)) l.push([t, 'DI0 LSH1 magas szint úszó: nincs jel (szakadás vagy a közös +24 V hiányzik).']);
  if (!lslOK(s)) l.push([t, 'DI1 LSL1 szárazfutás úszó: nincs jel – szárazfutás-védelem aktív.']);
  if (!fbOK(s)) l.push([t, 'DI2 P1 futásvisszajelzés (KM1 13–14) hiányzik.']);
  if (s.wiredOK && !s.well.float) l.push([t, 'LSH1 magas szintet jelez, de LT1 csak ' + lv(s.lvl) + ' – az úszó valószínűleg beragadt.']);
  if (s.clog[0]) l.push([t, 'P1: ' + (s.trip[0] ? 'motorvédő leoldott – túláram (eltömődött járókerék?)' : 'üzem közben túláram várható – a múlt heti tisztítás óta rezgés.')]);
  if (!s.progOK) l.push([t, 'Program: a paraméterek eltérnek a jóváhagyott értékektől. Utolsó módosítás: 11.20. 21:32, felhasználó: SZSZ.']);
  for (let i = 0; i < 2; i++) if (s.trip[i] && !(i === 0 && s.clog[0])) l.push([t, `P${i + 1}: motorvédő / nyomásvédelem leoldott.`]);
  if (!s.modem.online) l.push([t, 'Kommunikáció: a VPN-modem nem válaszol.']);
  if (s.alarm) l.push([t, 'MAGAS SZINT RIASZTÁS']); return l; }
function prog(s) { const p = s.prog, r = sub.test, num = (k, n, u = 'm') => `<label>${n}<input type="number" step="0.1" min="0" max="4" data-p="${k}" value="${p[k]}"> ${u}</label>`;
  return `<div class="prog"><div><h2>Paraméterek (PUMP_CTRL)</h2><div class="pg">${num('start1', 'P_START_1 – vezető szivattyú indul')}${num('start2', 'P_START_2 – második szivattyú is indul')}${num('stop', 'P_STOP – leállás')}${num('dry', 'P_DRY – szárazfutás-védelem')}${num('alarm', 'P_ALARM – magas szint riasztás')}</div>
    <h2>Programsorok (ST)</h2><pre class="st">(* LT1: szint [m], LSL1/LSH1: úszók, TRUE = vízben *)
IF LT1 >= P_START_1 THEN REQ1 := TRUE; END_IF;
IF LT1 >= P_START_2 THEN REQ2 := TRUE; END_IF;</pre>${CODE.map((c, i) => `<select data-c="${i}" class="st">${c.o.map((o, j) => `<option value="${j}" ${p.code[i] === j ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`).join('')}<pre class="st">P1 := (REQ1 AND NOT LEAD) OR (REQ2 AND LEAD);
P2 := (REQ1 AND LEAD) OR (REQ2 AND NOT LEAD);</pre></div>
    <div><h2>Próbafuttatás (40 perc szimulált idő, zivatar-hullámmal)</h2><canvas id="pgc" width="460" height="200"></canvas>${r ? `<ul class="chk">${[['over', 'Nincs túlfolyás'], ['dry', 'Nincs szárazfutás (P_DRY ≥ az LSL1 szintje)'], ['hyst', 'Hiszterézis: indulás ≥ 0,5 m-rel a leállás fölött, nem kapcsolgat'], ['alt', 'Váltakozás: mindkét szivattyú vezet'], ['alarm', 'Riasztás időben (P_ALARM a második indulás fölött, a túlfolyás alatt ≥ 0,3 m-rel)']].map(([k, n]) => `<li class="${r.ok[k] ? 'ok' : 'bad'}">${r.ok[k] ? '✓' : '✗'} ${n}</li>`).join('')}</ul>` : ''}
    <div class="row">${btn('ptest', 'Próbafuttatás', 'go')}${btn('pload', 'Letöltés a PLC-be', '', !(r && r.all))}</div>${s.progOK ? '<p style="color:#5ee08a;font-weight:700">A javított program fut a PLC-n.</p>' : ''}</div></div>`; }
function drawTest() { const cv = document.getElementById('pgc'); if (!cv || !sub.test) return; const g = cv.getContext('2d'), W = cv.width, H = cv.height, tr = sub.test.tr; g.fillStyle = '#04110a'; g.fillRect(0, 0, W, H); const Y = h => H - 10 - h / 4 * (H - 20);
  g.strokeStyle = 'rgba(255,90,77,.6)'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(0, Y(OVER)); g.lineTo(W, Y(OVER)); g.stroke(); g.setLineDash([]);
  tr.forEach((q, i) => { const x = i / tr.length * W; if (q[1]) { g.fillStyle = 'rgba(94,224,138,.35)'; g.fillRect(x, H - 8, W / tr.length + 1, 4); } if (q[2]) { g.fillStyle = 'rgba(108,198,255,.45)'; g.fillRect(x, H - 4, W / tr.length + 1, 4); } if (q[3]) { g.fillStyle = 'rgba(255,90,77,.4)'; g.fillRect(x, 0, W / tr.length + 1, 4); } });
  g.strokeStyle = '#7fff9a'; g.lineWidth = 2; g.beginPath(); tr.forEach((q, i) => { const x = i / tr.length * W; i ? g.lineTo(x, Y(q[0])) : g.moveTo(x, Y(q[0])); }); g.stroke(); g.fillStyle = '#7fff9a'; g.font = '11px monospace'; g.fillText('LT1 [m]   zöld: P1  kék: P2  piros: riasztás', 8, 16); }
function genPanel(s) { const G = s.gen, v = G.run ? Math.round(380 + 20 * G.warm) : 0, hz = G.run ? (48 + 2 * G.warm).toFixed(1) : '0.0';
  return `<div class="card wide"><div class="row"><h1 class="grow">AGGREGÁT – 60 kVA</h1>${btn('doc:gen', 'Indítási utasítás', 'sm')}${btn('close', 'Bezárás', 'go')}</div><div class="row" style="gap:18px;align-items:flex-start">
    <div class="blk"><h2>Üzemanyag</h2><div class="bar"><i style="width:${Math.round(G.fuel * 100)}%;background:${G.fuel < .25 ? '#ff5a4d' : '#e8b656'}"></i></div><p class="mut">${G.fuel < .1 ? 'A tartály szinte üres – valaki leengedte.' : Math.round(G.fuel * 100) + '%'}</p>
    <h2>Akkumulátor-főkapcsoló</h2>${btn('gbat', G.bat ? 'BE – kikapcsolás' : 'KI – bekapcsolás', G.bat ? 'on' : '')}<h2>VÉSZ-STOP</h2>${btn('gestop', G.estop ? 'Benyomva – kioldás' : 'Kioldva', G.estop ? 'red' : '')}</div>
    <div class="blk"><h2>Indítás</h2><div class="leds">${led(G.bat)} Táp ${led(G.pre >= 1, '#ffd84a')} Izzítás kész ${led(G.run)} Üzemel</div>
    <div class="row" style="margin-top:10px"><button class="b hold" data-hold="pre" ${!G.bat || G.run ? 'disabled' : ''}>IZZÍTÁS (tartsd)</button><button class="b hold" data-hold="crank" ${!G.bat || G.run ? 'disabled' : ''}>INDÍTÁS (tartsd)</button>${btn('gstop', 'Leállítás', '', !G.run)}</div>
    <div class="bar" style="margin-top:8px"><i style="width:${Math.round(G.pre * 100)}%;background:#ffd84a"></i></div><p class="mut" id="gmsg">${esc(sub.gmsg || '')}</p></div>
    <div class="blk"><h2>Kimenet</h2><div class="mm">${v} V · ${hz} Hz</div><p class="mut">${G.run ? (G.warm < 1 ? 'Melegedés…' : 'Stabil – átkapcsolható.') : 'Áll.'}</p></div></div></div>`; }

/* ---------- események ---------- */
function click(e) { const t = e.target.closest('[data-a],[data-tab]'); if (!t) return; const s = S();
  if (t.dataset.tab) { sub.tab = t.dataset.tab; sub.test = sub.tab === 'prog' ? sub.test : null; render(); if (sub.tab === 'prog') setTimeout(drawTest); return; }
  const [a, x, y] = t.dataset.a.split(':'); const c = s.cab;
  if (a === 'close') return close();
  if (a === 'doc') return api.read(x);
  if (a === 'take') { const tk = s.f['took_' + cur] = s.f['took_' + cur] || {}; if (!tk[x]) { tk[x] = 1; s.inv[x] = (s.inv[x] || 0) + (+y || 1); api.sfx('pick'); } }
  else if (a === 'takeall') { const tk = s.f['took_' + cur] = s.f['took_' + cur] || {}; [...t.closest('.card').querySelectorAll('[data-a^="take:"]')].map(b => b.dataset.a.split(':')).forEach(([, k, n]) => { if (!tk[k]) { tk[k] = 1; s.inv[k] = (s.inv[k] || 0) + (+n || 1); } }); api.sfx('pick'); }
  else if (a === 'elem') { if (s.inv.elem) { s.inv.elem--; s.bat = 1; s.flash = 1; api.sfx('click'); } }
  else if (a === 'q0') { c.q0 = c.q0 ? 0 : 1; api.sfx('clunk'); }
  else if (a === 'fuse') { if (c.q0 && supply(s)) { api.msg('Feszültség alatt nem cserélünk biztosítóbetétet – előbb Q0 ki!'); api.sfx('zap'); } else if (s.inv.biztositek) { s.inv.biztositek--; c.fuse[+x] = 1; api.sfx('click'); api.msg(`F${+x + 1}: új betét a helyén.`); } }
  else if (a === 'q') { const i = +x; if (c.q[i]) c.q[i] = 0; else { c.q[i] = 1; if (i === 1 && c.jumper && cabPow(s) && c.fuse[1]) { setTimeout(() => { c.q[1] = 0; api.sfx('zap'); api.msg('Q2 azonnal leoldott – zárlat van a 24 V-os körben!'); refresh(); }, 180); } } api.sfx('relay'); }
  else if (a === 'jumper') { c.jumper = 0; s.inv.drot = 1; api.sfx('click'); api.msg('A drótdarabot eltetted bizonyítéknak.'); }
  else if (a === 'mode') { const i = +x; if (!s.lock[i]) { s.mode[i] = y; api.sfx('clunk'); } }
  else if (a === 'reset') { const i = +x; if (s.trip[i]) { s.trip[i] = 0; s.dryT[i] = s.clogT[i] = 0; api.sfx('relay'); } }
  else if (a === 'lock') { const i = +x; if (s.mode[i] === '0' && s.inv.lakat) { s.lock[i] = 1; api.sfx('click'); api.msg(`P${i + 1} kizárva – a lakat kulcsa nálad van.`); } }
  else if (a === 'unlock') { s.lock[+x] = 0; api.sfx('click'); }
  else if (a === 'wsel') { sub.wsel = x; sub.cmsg = ''; }
  else if (a === 'term') { const n = +x; if (![2, 4, 5, 6, 7].includes(n)) return api.msg('Ez a kapocs foglalt – az eredeti ér a helyén van.'); if (!sub.wsel) return api.msg('Előbb válassz egy eret.'); if (cabPow(s) && c.q[1] && v24(s)) api.msg('Feszültség alatt kötsz be – profi, de nem szabályos. (Q2 lekapcsolása ajánlott.)');
    if (!s.inv.csavar) return api.msg('Csavarhúzó nélkül nem tudod meghúzni a sorkapcsot.'); const o = wireAtTerm(s, n); if (o) delete s.wires[o]; s.wires[sub.wsel] = n; api.sfx('click'); sub.wsel = null; api.check(); }
  else if (a === 'wclear') { delete s.wires[sub.wsel]; api.sfx('click'); }
  else if (a === 'cont') { const w = LOOSE.find(q => q.id === sub.wsel); if (cabPow(s) && c.q[1]) sub.cmsg = '<span class="warn">Feszültség alatt nem mérünk folytonosságot (Q2 ki).</span>'; else { sub.cmsg = w.dev === x ? `${w.lab} ↔ ${x}: <b>0,8 Ω ♪ sípol</b> – ez az!` : `${w.lab} ↔ ${x}: OL`; api.sfx(w.dev === x ? 'beep' : 'click'); } }
  else if (a === 'mm') sub.mm.mode = x; else if (a === 'mp') sub.mm.probe = x;
  else if (a === 'ptest') { sub.test = progTest(s.prog); s.progTested = 1; render(); setTimeout(drawTest); api.sfx('beep'); return; }
  else if (a === 'pload') { if (sub.test && sub.test.all) { s.progOK = 1; api.sfx('relay'); api.msg('Program letöltve. PLC: RUN. Állítsd a szivattyúkat AUTO-ba.'); api.check(); } }
  else if (a === 'modem_pwr') { s.modem.pwr = 1; api.sfx('click'); }
  else if (a === 'ant_fix') { if (s.inv.ncsatl && s.inv.csavar) { s.inv.ncsatl--; s.modem.ant = 1; api.sfx('click'); api.msg('Az új csatlakozó a helyén. Az antenna jele megérkezik a modemhez.'); } }
  else if (a === 'gbat') { s.gen.bat = s.gen.bat ? 0 : 1; if (!s.gen.bat) { s.gen.pre = 0; } api.sfx('clunk'); }
  else if (a === 'gestop') { s.gen.estop = s.gen.estop ? 0 : 1; api.sfx('clunk'); }
  else if (a === 'gstop') { s.gen.run = 0; api.sfx('clunk'); }
  else if (a === 'ats') { const p = ['net', '0', 'gen'], i = p.indexOf(s.ats) + +x; if (i >= 0 && i <= 2) { s.ats = p[i]; api.sfx('clunk'); if (s.ats === 'gen' && !(s.gen.run && s.gen.warm >= 1)) api.msg(s.gen.run ? 'A generátor még nem stabil – a terhelést nem bírja el.' : 'A generátor nem jár.'); } }
  render(); api.check(); }
function change(e) { const s = S(); const p = e.target.dataset.p, c = e.target.dataset.c; if (p) { const v = Math.max(0, Math.min(4, +e.target.value || 0)); s.prog[p] = Math.round(v * 10) / 10; sub.test = null; } if (c != null) { s.prog.code[+c] = +e.target.value; sub.test = null; } }
const wireAtTerm = (s, n) => Object.keys(s.wires).find(k => s.wires[k] === n);
// tartós gombok (izzítás, indítás)
let held = null, holdT = 0;
function hold(e) { const b = e.target.closest('[data-hold]'); if (!b || b.disabled) return; held = b.dataset.hold; b.classList.add('on'); clearInterval(holdT); const s = S(), G = s.gen; let t = 0, lastT = performance.now();
  // a ténylegesen eltelt időt mérjük (lassú gépen az időzítő ritkábban fut, de az izzítás így is ~6 s marad)
  holdT = setInterval(() => { const now = performance.now(), d = Math.min(.5, (now - lastT) / 1000) * (window.__ts || 1); lastT = now; t += d; if (!held) return;
    if (held === 'pre') { G.pre = Math.min(1, G.pre + d / 6); api.sfx('tick'); }
    if (held === 'crank') { api.sfx('crank'); if (G.estop) { sub.gmsg = 'Az önindító megforgatja a motort, de a VÉSZ-STOP benyomva – nincs üzemanyag-adagolás.'; } else if (G.fuel < .2) { sub.gmsg = 'A motor köhög, de nem indul – nincs elég üzemanyag.'; } else if (G.pre < 1) { sub.gmsg = 'Hideg dízel: a motor nem akar beindulni. Izzíts előbb!'; } else if (t > 2.2) { G.run = 1; G.pre = 0; held = null; sub.gmsg = 'Beindult! Várd meg, amíg stabil lesz.'; api.sfx('engine'); api.check(); } }
    const m = document.getElementById('gmsg'); if (m) m.textContent = sub.gmsg || ''; }, 100); }
function release() { if (!held) return; held = null; clearInterval(holdT); render(); }
